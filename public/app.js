// STJBS printer proposal: compare selection, list filters, carousel buttons, compare page.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const MAX = 3, KEY = 'stjbs-compare';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {} };
  let sel = load().slice(0, MAX);

  // ---- selection: checkboxes, tray, nav link ----
  function syncSelection() {
    const full = sel.length >= MAX, url = `/compare/?p=${sel.join(',')}`;
    $$('[data-cmp]').forEach((c) => { c.hidden = false; c.checked = sel.includes(c.dataset.cmp); c.disabled = full && !c.checked; });
    $$('[data-max]').forEach((m) => { m.hidden = !full; });
    $$('[data-count]').forEach((n) => { n.textContent = sel.length; });
    const nav = $('[data-compare-link]');
    if (nav) { nav.hidden = !sel.length; nav.href = url; }
    const tray = $('[data-tray]');
    if (tray) tray.hidden = !sel.length;
    $$('[data-tray-go]').forEach((a) => {
      const ok = sel.length >= 2;
      if (ok) { a.href = url; a.removeAttribute('aria-disabled'); a.textContent = 'Compare →'; }
      else { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); a.textContent = 'Select one more'; }
    });
  }
  document.addEventListener('change', (e) => {
    const c = e.target.closest('[data-cmp]');
    if (!c) return;
    sel = sel.filter((s) => s !== c.dataset.cmp);
    if (c.checked && sel.length < MAX) sel.push(c.dataset.cmp);
    save(sel); syncSelection();
  });
  addEventListener('storage', (e) => { if (e.key === KEY) { sel = load().slice(0, MAX); syncSelection(); } });

  // ---- list filters: All / Local / Import ----
  const filters = $('.filters');
  if (filters) {
    filters.hidden = false;
    filters.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      $$('[data-filter]', filters).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $$('.list tbody tr').forEach((tr) => { tr.hidden = b.dataset.filter !== 'all' && tr.dataset.tier !== b.dataset.filter; });
    });
  }

  // ---- carousel: Prev / Next and arrow keys (snap-strip mode only) ----
  const track = $('.car-track');
  if (track) {
    const controls = $('.car-controls');
    const pinned = () => getComputedStyle(controls).display === 'none';
    controls.hidden = false;
    const go = (d) => { if (!pinned()) track.scrollBy({ left: d * track.clientWidth }); };
    controls.addEventListener('click', (e) => { const b = e.target.closest('[data-car]'); if (b) go(+b.dataset.car); });
    track.addEventListener('keydown', (e) => { const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (d && !pinned()) { e.preventDefault(); go(d); } });
  }

  // ---- nav: underline the section in view on the home page ----
  const navLinks = $$('[data-nav]').filter((a) => a.hash && document.getElementById(a.hash.slice(1)));
  if (navLinks.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => (a.hash === `#${en.target.id}` ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
    }), { rootMargin: '-40% 0px -55% 0px' });
    navLinks.forEach((a) => io.observe(document.getElementById(a.hash.slice(1))));
  }

  // ---- compare page ----
  const root = $('[data-compare-root]');
  if (root) {
    fetch('/data/specs.json').then((r) => r.json()).then((data) => {
      const all = Object.fromEntries(data.printers.map((p) => [p.slug, p]));
      const fromUrl = () => [...new Set((new URLSearchParams(location.search).get('p') || '').split(','))].filter((s) => all[s]).slice(0, MAX);
      let cols = fromUrl();
      const render = () => {
        history.replaceState(null, '', cols.length ? `?p=${cols.join(',')}` : location.pathname);
        if (cols.length < 2) {
          const pick = cols.length ? `<p>Only one printer is selected. Add another below, or go back to the list.</p>` : '<p>No printers selected.</p>';
          root.innerHTML = `${pick}${adder()}<p><a href="/#printers">Go to the printer list</a></p>`;
          return;
        }
        const ps = cols.map((s) => all[s]);
        const rows = Object.keys(ps[0].rows).filter((l) => ps.some((p) => p.rows[l] != null));
        root.innerHTML = `<div class="cmp-wrap"><table class="cmp-table">
          <caption class="sr">Side-by-side comparison</caption>
          <thead><tr><td></td>${ps.map((p) => `<th scope="col">${p.photo ? `<img src="/${p.photo}" width="160" height="160" alt="">` : ''}<strong>${esc(p.name)}</strong>
            <span class="cmp-col-actions"><a href="/printers/${p.slug}/">View more →</a><button type="button" class="btn btn-secondary" data-remove="${p.slug}">Remove<span class="sr"> ${esc(p.name)}</span></button></span></th>`).join('')}</tr></thead>
          <tbody>${rows.map((l) => {
            const vals = ps.map((p) => p.rows[l] ?? 'Not published');
            return `<tr class="${new Set(vals).size > 1 ? 'differs' : ''}"><th scope="row">${l}</th>${vals.map((v, i) => `<td data-name="${esc(ps[i].name)}">${esc(v)}</td>`).join('')}</tr>`;
          }).join('')}</tbody></table></div>${cols.length < MAX ? adder() : ''}`;
      };
      const adder = () => `<div class="cmp-add"><label for="cmp-add">${cols.length >= 2 ? 'Add a third printer' : 'Add a printer'}</label>
        <select id="cmp-add"><option value="">Choose…</option>${data.printers.filter((p) => !cols.includes(p.slug)).map((p) => `<option value="${p.slug}">${esc(p.name)}</option>`).join('')}</select></div>`;
      root.addEventListener('change', (e) => { if (e.target.id === 'cmp-add' && e.target.value) { cols.push(e.target.value); render(); $('#cmp-add')?.focus(); } });
      root.addEventListener('click', (e) => { const b = e.target.closest('[data-remove]'); if (b) { cols = cols.filter((s) => s !== b.dataset.remove); render(); $('#cmp-add')?.focus(); } });
      render();
    }).catch(() => { root.innerHTML = '<p>The comparison data could not be loaded. <a href="/#printers">Go to the printer list</a>.</p>'; });
  }

  syncSelection();
})();
