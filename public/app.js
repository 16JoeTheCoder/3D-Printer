(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const raf = requestAnimationFrame;

// Reel fallback: no scroll-driven animations -> IntersectionObserver
if (!RM && !CSS.supports('animation-timeline', 'view()')) {
  document.documentElement.classList.add('io');
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('in', e.isIntersecting)), { threshold: 0.35 });
  $$('.slide').forEach((s) => io.observe(s));
}

// Counters
const tween = (el, from, to, dec, ms = 900) => {
  if (RM) { el.textContent = to.toFixed(dec); return; }
  const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / ms), v = from + (to - from) * (1 - Math.pow(1 - k, 3)); el.textContent = v.toFixed(dec); if (k < 1) raf(step); };
  raf(step);
};
if (!RM) {
  const cio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { cio.unobserve(e.target); tween(e.target, 0, +e.target.dataset.count, +(e.target.dataset.dec || 0)); } }), { threshold: 0.6 });
  $$('.count').forEach((c) => cio.observe(c));
}

// Tilt (pointer/touch + device orientation)
const photos = $$('.photo'), vis = new Set();
const setTilt = (ph, x, y) => { ph._r && cancelAnimationFrame(ph._r); ph._r = raf(() => { ph.style.setProperty('--tx', x.toFixed(3)); ph.style.setProperty('--ty', y.toFixed(3)); }); };
if (!RM) {
  const vio = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target))));
  photos.forEach((ph) => {
    vio.observe(ph);
    ph.addEventListener('pointermove', (e) => { const r = ph.getBoundingClientRect(); setTilt(ph, ((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2); });
    ['pointerleave', 'pointercancel', 'pointerup'].forEach((t) => ph.addEventListener(t, () => setTilt(ph, 0, 0)));
  });
  if (matchMedia('(hover: none)').matches && 'DeviceOrientationEvent' in window) {
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    const on = () => addEventListener('deviceorientation', (e) => { if (e.gamma == null) return; vis.forEach((ph) => setTilt(ph, clamp(e.gamma / 30), clamp((e.beta - 45) / 30))); }, { passive: true });
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const b = $('#tiltbtn'); b.hidden = false;
      b.addEventListener('click', () => DeviceOrientationEvent.requestPermission().then((r) => { if (r === 'granted') { on(); b.hidden = true; } }).catch(() => {}));
    } else on();
  }
}

// Pins
$$('.card').forEach((card) => {
  const tips = $$('.tip', card), hint = $('.hint', card), pins = $$('.pin', card);
  const close = () => { tips.forEach((t) => t.classList.remove('on')); pins.forEach((p) => p.setAttribute('aria-expanded', 'false')); hint.classList.add('on'); };
  pins.forEach((p) => {
    p.setAttribute('role', 'button'); p.setAttribute('aria-expanded', 'false');
    const go = (ev) => { ev.preventDefault(); const t = document.getElementById(p.getAttribute('href').slice(1)), open = !t.classList.contains('on'); history.replaceState(null, '', location.pathname); close(); if (open) { hint.classList.remove('on'); t.classList.add('on'); p.setAttribute('aria-expanded', 'true'); } };
    p.addEventListener('click', go);
    p.addEventListener('keydown', (e) => { if (e.key === ' ') go(e); });
  });
  card.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
});

// Metric race
const rows = $$('.race li'), note = $('#race-note');
const NOTES = { b: 'Build volume = X × Y × Z in litres.', c: 'Chamber temperature as stated by the manufacturer. Ties keep list order.', s: 'Print speed. Creator 5 Pro: 300 mm/s print (600 mm/s travel).', a: 'Filter tier by rule: HEPA13 + carbon > HEPA H12 + carbon > carbon > air purifier (type not stated).' };
const UNIT = { b: ' L', c: ' °C', s: ' mm/s' };
const race = (m) => {
  const max = m === 'a' ? 4 : Math.max(...rows.map((r) => +r.dataset[m]));
  const order = [...rows].sort((a, b) => b.dataset[m] - a.dataset[m] || a.dataset.i - b.dataset.i);
  order.forEach((li, r) => {
    li.classList.toggle('lead', r === 0); li.style.setProperty('--r', r); li.style.setProperty('--v', +li.dataset[m] / max);
    const val = $('.val', li);
    if (m === 'a') val.textContent = li.dataset.at;
    else { const to = +li.dataset[m], from = parseFloat(val.textContent) || 0, dec = m === 'b' ? 1 : 0, u = UNIT[m]; if (RM || !/^[\d.]+/.test(val.textContent)) val.textContent = to.toFixed(dec) + u; else tween({ set textContent(v) { val.textContent = v + u; } }, from, to, dec, 700); }
  });
  note.textContent = `${NOTES[m]} Prices are never ranked. Top: ${order[0].querySelector('.rn').textContent}.`;
};
$$('[data-m]').forEach((b) => b.addEventListener('click', () => { $$('[data-m]').forEach((x) => x.setAttribute('aria-pressed', x === b)); race(b.dataset.m); }));

// Filters + picker
const cards = $$('.card'), fout = $('#f-out');
const RULE = { big: 'build volume of 30 L or more', safe: 'HEPA filter fitted', colour: 'multi-colour system stated (16 colours or 4 toolheads)' };
let pick = '';
const update = () => {
  const fs = $$('[data-f][aria-pressed=true]').map((b) => b.dataset.f);
  let n = 0;
  cards.forEach((c) => {
    const ok = fs.every((f) => c.dataset[f] === '1'), pk = !pick || c.dataset[pick] === '1';
    c.classList.toggle('dim', !(ok && pk)); c.classList.toggle('match', !!pick && pk && ok); if (ok) n++;
  });
  fout.textContent = `${n} of ${cards.length} shown`;
  const out = $('#pick-out');
  if (!pick) out.textContent = 'Pick one. Matching is by spec rules only.';
  else { const hits = cards.filter((c) => c.dataset[pick] === '1'); out.innerHTML = `Rule: ${RULE[pick]}. Matches: ` + (hits.length ? hits.map((c) => `<a href="#${c.id}">${c.querySelector('h3').textContent.replace(' (Combo)', '')}</a>`).join(', ') : 'none') + '.'; }
};
$$('[data-f]').forEach((b) => b.addEventListener('click', () => { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); update(); }));
$$('[data-p]').forEach((b) => b.addEventListener('click', () => { pick = pick === b.dataset.p ? '' : b.dataset.p; $$('[data-p]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.p === pick)); update(); }));
update();

// View Transitions morph for details (plain <details> without support)
$$('details.spec summary').forEach((s) => s.addEventListener('click', (e) => {
  if (!document.startViewTransition || RM) return;
  e.preventDefault();
  const d = s.parentNode, c = d.closest('.card');
  c.style.viewTransitionName = 'card';
  document.startViewTransition(() => { d.open = !d.open; }).finished.finally(() => { c.style.viewTransitionName = ''; });
}));
})();
