// Build: node scripts/render.mjs
// Reads specs.json, checks it against the vector models, writes every page in public/.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { check, PRINTERS as MODELS, FEATURES } from './check.mjs';

const root = new URL('../', import.meta.url);
const specs = JSON.parse(readFileSync(new URL('specs.json', root)));
const { meta } = specs;
const P = [...specs.printers].sort((a, b) => a.rank - b.rank);
const bySlug = Object.fromEntries(P.map((p) => [p.slug, p]));

const { errors, notes } = check(specs);
notes.forEach((n) => console.log('note:', n));
if (errors.length) { errors.forEach((e) => console.error('error:', e)); process.exit(1); }
if (!meta.siteUrl) console.log('note: meta.siteUrl is null, so canonical and sitemap URLs are root-relative');

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const num = (n) => Number(n).toLocaleString('en-US');
const litres = (b) => Number((b.x * b.y * b.z / 1e6).toFixed(1));
const href = (p) => `/printers/${p.slug}/`;
const abs = (path) => (meta.siteUrl || '') + path;
const link = (s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`;
const RECOMMENDED = 'kobra-s1-max';

const fmt = {
  build: (p) => `${litres(p.build)} L (${p.build.x} × ${p.build.y} × ${p.build.z} mm)`,
  hotend: (p) => (p.hotendC ? `${p.hotendC} °C` : p.hotendNote || null),
  chamber: (p) => (p.chamberType === 'active' ? `Active, heated to ${p.chamberC} °C` : 'No active chamber') + (p.chamberNote ? ` (${p.chamberNote})` : ''),
  speed: (p) => `${p.speedMms} mm/s` + (p.speedNote ? ` (${p.speedNote})` : ''),
  weight: (p) => (p.weightKg ? `${p.weightKg} kg` : null),
  power: (p) => (p.powerW ? `About ${num(p.powerW)} W` : null),
  price: (p) => p.price.text + (p.price.note ? ` (${p.price.note})` : ''),
};

const TAG = {
  local: ['⌂', 'Local', 'ok'], import: ['✈︎', 'Import', 'neutral'], refurbished: ['↻', 'Refurbished', 'neutral'],
  retired: ['⊘', 'Retired', 'warn'], 'out-of-stock': ['⊘', 'Out of stock', 'warn'], 'limited-stock': ['!', 'Limited stock', 'warn'],
  'limited-data': ['?', 'Limited data', 'warn'], recommended: ['★', 'Recommended', 'accent'],
};
const tag = (k) => `<span class="tag tag-${TAG[k][2]}"><span aria-hidden="true">${TAG[k][0]}</span> ${TAG[k][1]}</span>`;
const tags = (p) => [p.tier, ...(p.slug === RECOMMENDED ? ['recommended'] : []), ...p.status].map(tag).join('');

// Price block: own currency, import caveat, optional FX line (never a landed-cost estimate).
function priceBlock(p) {
  const fx = p.price.currency === 'USD' && meta.fx.usdToIdr
    ? `<span class="price-sub">About Rp ${num(Math.round(parseFloat(p.price.text.replace(/[^\d.]/g, '')) * meta.fx.usdToIdr))} at Rp ${num(meta.fx.usdToIdr)} per US$ (${esc(meta.fx.date)})</span>` : '';
  const imp = p.tier === 'import' ? `<span class="price-sub">${esc(meta.importNote)}</span>` : '';
  const note = p.price.note ? `<span class="price-sub">${esc(p.price.note)}</span>` : '';
  return `<span class="price">${esc(p.price.text)}</span>${note}${imp}${fx}`;
}

// ---------- layout ----------
const NAV = [['/#proposal', 'Proposal', 'proposal'], ['/#process', 'How I chose', 'process'], ['/#printers', 'Printers', 'printers'],
  ['/compare/', 'Compare', 'compare'], ['/#budget', 'Budget and safety', 'budget'], ['/#sources', 'Sources', 'sources']];

function page({ path, title, desc, body, current = '', extraHead = '', scripts = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${abs(path)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${abs(path)}">
<meta name="theme-color" content="#1F3A5F">
<meta name="color-scheme" content="light">
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/fraunces.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">${extraHead}
</head>
<body id="top">
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <nav class="wrap nav" aria-label="Main">
    <a class="brand" href="/">STJBS 3D printer proposal</a>
    <ul>${NAV.map(([h, l, k]) => `<li><a href="${h}" data-nav="${k}"${k === current ? ' aria-current="page"' : ''}>${l}</a></li>`).join('')}</ul>
    <a class="nav-compare" href="/compare/" target="_blank" rel="noopener" data-compare-link hidden>Compare (<span data-count>0</span>)</a>
  </nav>
</header>
<main id="main" tabindex="-1">
${body}
</main>
<footer class="site-foot">
  <div class="wrap foot">
    <p>Prepared by ${esc(meta.author)}, for STJBS · Last updated ${esc(meta.lastUpdated)}</p>
    <p>${esc(meta.priceNote)}</p>
    <p><a href="#top">Back to top ↑</a></p>
  </div>
</footer>
<script src="/app.js" defer></script>${scripts}
</body>
</html>
`;
}

// ---------- home: carousel ----------
const heroes = P.filter((p) => p.hero);
function carousel() {
  const slide = (p, i) => `<article class="slide" id="slide-${i + 1}" aria-labelledby="slide-${i + 1}-h">
  <div class="slide-text">
    <p class="slide-meta"><span>${i + 1} of ${heroes.length}</span>${tag(p.tier)}</p>
    <h2 id="slide-${i + 1}-h" class="slide-name"><span class="slide-brand">${esc(p.brand)}</span> ${esc(p.name.replace(p.brand + ' ', ''))}</h2>
    <p class="slide-reason">${esc(p.reason)}</p>
    <dl class="stats">
      <div><dt>Build volume</dt><dd>${litres(p.build)} litres</dd></div>
      <div><dt>Chamber</dt><dd>${p.chamberC} °C</dd></div>
      <div><dt>Max speed</dt><dd>${p.speedMms} mm/s${p.slug === 'creator-5-pro' ? ' printing' : ''}</dd></div>
    </dl>
    <p class="slide-price">${priceBlock(p)}</p>
    <a class="btn btn-secondary" href="${href(p)}">View more <span aria-hidden="true">→</span><span class="sr"> about the ${esc(p.name)}</span></a>
  </div>
  <img class="slide-photo" src="/${p.photo}" width="1200" height="1200" alt="${esc(p.name)} 3D printer" ${i ? 'loading="lazy" decoding="async"' : 'fetchpriority="high"'}>
</article>`;
  return `<a class="skip-inline" href="#printers">Skip to printer list</a>
<section class="car" aria-roledescription="carousel" aria-label="Featured printers">
  ${heroes.map((_, i) => `<span class="car-snap" style="--i:${i}" aria-hidden="true"></span>`).join('')}
  <div class="car-stage">
    <div class="car-track" tabindex="0" role="group" aria-label="Featured printers, use the arrow keys to move">
${heroes.map(slide).join('\n')}
    </div>
    <div class="car-controls wrap" hidden>
      <button class="btn btn-secondary" type="button" data-car="-1">← Previous</button>
      <button class="btn btn-secondary" type="button" data-car="1">Next →</button>
    </div>
  </div>
</section>`;
}

// ---------- home: proposal ----------
const proposal = `<section id="proposal" class="section">
<div class="wrap prose">
  <p class="eyebrow">The proposal</p>
  <h2>Why the school needs one</h2>
  <p class="lede">We ask for your approval to buy Saint Johannes Berchmans' first 3D printer, as one shared tool for every student and teacher.</p>
  <ol class="needs">
    <li><strong>Approval in principle</strong> so the proposal can go to the principals and the Head of Academics.</li>
    <li><strong>A budget line</strong> for the printer plus a small running budget for filament and spare parts.</li>
    <li><strong>A suitable spot:</strong> a ventilated room or corner, a sturdy table and a power socket close by (possibly the same room as computer science / coding classes).</li>
  </ol>
  <h3>What a 3D printer does</h3>
  <p>A 3D printer builds a real object from a computer design, one thin layer of plastic at a time. A student draws it on screen, presses print, and holds it in their hand a few hours later. It is a school tool, not a club's equipment: anyone with an STJBS email can book it.</p>
  <h3>Why this matters</h3>
  <ul class="groups">
    <li><strong>Students on teams.</strong> Greenmech and competition teams print, test, change and reprint within days.</li>
    <li><strong>Students in classes.</strong> STEAM, graphic design and computer science turn screen work into physical objects.</li>
    <li><strong>Students on passion projects.</strong> Build, test and photograph a finished project for a university portfolio.</li>
    <li><strong>Teachers.</strong> Printed solids, cross-sections and force models.</li>
    <li><strong>The school.</strong> More projects to show parents and applicants, more competition entries under the STJBS name.</li>
  </ul>
  <p>STJBS has no 3D printing experience yet. That is why this proposal spends as much time on how the printer is controlled as on why we want it.</p>
  <h3>How it would run</h3>
  <p>Every print is tied to a named person from day one. I will build a simple booking and logging tool, open only to people who sign in with an STJBS email. It will run without any costs and be easy to maintain by the next generation of students.</p>
  <ol class="steps">
    <li>Sign in with your STJBS email and submit a request (file, material, how long, what for).</li>
    <li>First-time users complete a short safety induction.</li>
    <li>A teacher approves any unattended or overnight run.</li>
    <li>The tool books the slot and shows when the printer is free.</li>
  </ol>
  <p>Sharing rules: competition deadlines get priority, classes get fixed slots, and passion projects fill the rest. Because every print is logged, the school gets a weekly or monthly report of who used the printer, for what, and for how long.</p>
  <h3>What STJBS gains</h3>
  <div class="gains">
    <div><h4>For students</h4><ul><li>A way to finish things</li><li>A portfolio piece</li><li>Practice in spatial thinking</li></ul></div>
    <div><h4>For teachers</h4><ul><li>Printed models instead of a drawing on the board</li><li>A working link between code, design and the physical world</li></ul></div>
    <div><h4>For the school</h4><ul><li>A stronger Greenmech program</li><li>More competition entries and results under the STJBS name</li><li>A visible culture of building, where success can be measured by more than tests and exams</li><li>A usage log that shows exactly how the investment is used</li></ul></div>
  </div>
  <h3>Next steps</h3>
  <ol class="steps">
    <li>Your feedback, sir.</li>
    <li>Teacher support in writing.</li>
    <li>Student interest survey (STJBS emails only, one response each).</li>
    <li>Principals and the Head of Academics.</li>
    <li>Before any purchase, prices, bundle and stock are reconfirmed by official invoice and the room is checked for ventilation, power and table strength.</li>
  </ol>
  <p class="contact">Contact: Josef Yang, JC2 · <a href="mailto:josef.yang@stjbs.sch.id">josef.yang@stjbs.sch.id</a></p>
</div>
</section>`;

// ---------- home: process ----------
const CRITERIA = [
  ['Filament capability', 'Competition and engineering parts need carbon-fibre and nylon blends, so a printer that cannot run them cannot do the main job.'],
  ['Durability', 'A shared school machine runs for years with many users; a fragile one costs more in repairs than it saves.'],
  ['Speed', 'Teams print, test and reprint within days, so print time decides how many iterations fit before a deadline.'],
  ['Build size', 'Bigger parts in one piece are stronger and simpler, but most school prints fit a mid-size bed.'],
  ['Price', 'Last, because a cheap printer that fails the first four costs more over its life. Prices are compared per printer, never ranked.'],
];
const EVIDENCE = [
  ['217', 'studies, one finding: spatial skills can be trained, the gains last, and they carry over to tasks students never practised.', 'Uttal et al., Psychological Bulletin, 2013', 'https://pubmed.ncbi.nlm.nih.gov/22663761/'],
  ['45%', 'of people who later earned a STEM PhD had scored in the top 4% on a spatial skills test eleven years earlier.', 'ASEE longitudinal study', 'https://peer.asee.org/18592.pdf'],
  ['9 weeks', 'of a 3D-printing project in a 9th-grade engineering course improved spatial skills for boys and girls alike, and those who got more involved earned higher course grades.', 'Purdue', 'https://docs.lib.purdue.edu/jpeer/vol8/iss1/2'],
  ['2×', 'FIRST robotics alumni were at least twice as likely to major in STEM as a comparison group. This is robotics, not 3D printing, but it is the Greenmech kind of experience.', 'Brandeis', 'https://heller.brandeis.edu/cyc/reports/the-first-longitudinal-study-final-report.pdf'],
  ['31 of 31*', 'printing and modelling lessons in an Australian study showed high engagement.', '3D Printing Industry', 'https://3dprintingindustry.com/?p=142376'],
];
const EVIDENCE_HEADS = ['217 studies, one finding', '45% of STEM PhDs', 'It works with 3D printing', 'Teams change paths', 'Students stay engaged*'];

function matrix() {
  const rows = [
    ['Big parts', 'Build volume of 30 litres or more.', (p) => litres(p.build) >= 30, (p) => `${litres(p.build)} L build volume.`],
    ['Classroom safety and air', 'A HEPA filter is fitted.', (p) => p.hepa === true, (p) => `${p.filtration}.`],
    ['Multi-colour or multi-material', 'A stated colour system (even if sold separately) or 4 toolheads.', (p) => !!p.colourSystem, (p) => `${p.colourSystem[0].toUpperCase()}${p.colourSystem.slice(1)}.`],
  ];
  return `<div class="matrix">${rows.map(([job, rule, test, why]) => `<section class="mrow">
    <h4>${job}</h4>
    <ul>${P.filter(test).map((p) => `<li><a href="${href(p)}">${esc(p.name)}</a> ${esc(why(p))}</li>`).join('')}</ul>
    <p class="rule">Rule: ${rule}</p>
  </section>`).join('')}</div>`;
}

const process = () => `<section id="process" class="section dark">
<div class="wrap">
  <p class="eyebrow">How I researched</p>
  <h2>How I chose</h2>
  <h3>The question</h3>
  <p class="lede">Which printer fits which school job, and why.</p>
  <h3>Criteria, in order</h3>
  <ol class="timeline">${CRITERIA.map(([c, why], i) => `<li><span class="tl-n" aria-hidden="true">${i + 1}</span><h4>${c}</h4><p>${why}</p></li>`).join('')}</ol>
  <p>Imports are kept in their own tier because shipping, import tax and warranty are unquoted.</p>
  <h3>The evidence</h3>
  <ul class="evidence">${EVIDENCE.map(([fig, line, src, url], i) => `<li><p class="ev-fig">${fig}</p><h4>${EVIDENCE_HEADS[i]}</h4><p>${line}</p><p class="ev-src"><a href="${url}" rel="noopener">${src}</a></p></li>`).join('')}</ul>
  <p class="foot-note">* This study was run with a 3D printing software company, so please read it with that in mind.</p>
  <h4>What the research does not show</h4>
  <p class="prose-w">Proof that spatial training raises STEM grades is still preliminary (<a href="https://groups.psych.northwestern.edu/uttal/documents/StieffUttal2015.pdf" rel="noopener">Stieff and Uttal, 2015</a>). Student interest in makerspaces can also fade over a semester when support is low (<a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6310445/" rel="noopener">Int. J. of STEM Education, 2018</a>). We are not claiming a printer raises grades. We are claiming it is a strong way to practise a skill that predicts success, and the next section is how we keep interest up.</p>
  <h3>Which printer fits which job</h3>
  ${matrix()}
  <div class="reco">
    <p class="eyebrow">The recommendation</p>
    <h3>Main target: <a href="${href(bySlug[RECOMMENDED])}">Anycubic Kobra S1 Max</a> ${tag('recommended')}</h3>
    <p>It is large, fully enclosed and heated, built for carbon-fibre materials, and sold here without a colour system, so the school pays for no extras.</p>
    <ul>
      <li>About 35 cm print space, so a whole chassis part prints in one piece.</li>
      <li>Heated, enclosed inside; nozzle built for tough materials.</li>
      <li>Security: 3D Zaiku is a well-known 3D printer distributor in Indonesia and offers a one-year warranty on spare parts for this printer; terms and conditions must be reviewed.</li>
    </ul>
    <p><strong>Trade-off:</strong> about 2,200 W draw, so the room's power circuit must be checked first; the page says limited stock.</p>
    <p><strong>Backups, in order:</strong> ${['k2-pro', 'creator-5-pro', 'bambu-p2s'].map((s, i) => `<a href="${href(bySlug[s])}">${esc(bySlug[s].name.replace(' (refurbished)', ''))}</a>${i ? '' : ' (first backup)'}`).join(', ')}. <strong>Premium backup:</strong> <a href="${href(bySlug['qidi-max4'])}">QIDI Max4</a> (direct from QIDI).</p>
  </div>
</div>
</section>`;

// ---------- home: list ----------
const listTable = () => `<section id="printers" class="section">
<div class="wrap">
  <p class="eyebrow">All ${P.length} printers</p>
  <h2>Printers</h2>
  <p>${esc(meta.priceNote)} Local printers are ranked by the criteria above; imports are ranked in their own tier.</p>
  <div class="filters" role="group" aria-label="Show printers" hidden>
    <button type="button" class="btn btn-secondary" data-filter="all" aria-pressed="true">All</button>
    <button type="button" class="btn btn-secondary" data-filter="local" aria-pressed="false">Local</button>
    <button type="button" class="btn btn-secondary" data-filter="import" aria-pressed="false">Import</button>
  </div>
  <p class="cmp-max" data-max hidden>Maximum 3 printers</p>
  <div class="table-scroll">
  <table class="list">
    <caption class="sr">Shortlisted printers. Select up to 3 to compare.</caption>
    <thead><tr><th scope="col">Printer</th><th scope="col">Best for</th><th scope="col">Build volume</th><th scope="col">Price</th><th scope="col">Origin</th></tr></thead>
    <tbody>${P.map((p) => `
      <tr data-tier="${p.tier}">
        <th scope="row"><div class="cell-name"><input type="checkbox" class="cmp" data-cmp="${p.slug}" id="cmp-${p.slug}" aria-label="Compare ${esc(p.name)}" hidden><span><a class="row-link" href="${href(p)}">${esc(p.name)}</a><span class="row-tags">${[...(p.slug === RECOMMENDED ? ['recommended'] : []), ...p.status].map(tag).join('')}</span></span></div></th>
        <td>${esc(p.bestFor)}</td>
        <td class="num">${litres(p.build)} L</td>
        <td class="num">${priceBlock(p)}</td>
        <td><span class="origin">${tag(p.tier)}</span> <span class="more" aria-hidden="true">View more →</span></td>
      </tr>`).join('')}
    </tbody>
  </table>
  </div>
  <div class="tray" data-tray hidden>
    <p><span data-count>0</span> selected</p>
    <a class="btn btn-primary" data-tray-go target="_blank" rel="noopener" aria-label="Compare printers (opens in new tab)">Compare →</a>
  </div>
</div>
</section>`;

// ---------- home: budget and sources ----------
const budget = () => `<section id="budget" class="section">
<div class="wrap prose">
  <p class="eyebrow">For the principal and parents</p>
  <h2>Budget and safety</h2>
  <p class="callout"><strong>Power first.</strong> The Anycubic Kobra S1 Max draws about 2,200 W. The room's power circuit must be checked before buying.</p>
  <h3>Running costs</h3>
  <ul>
    <li>Spare nozzles, a filament dryer and filament are the running costs.</li>
    <li>Hardened nozzles last roughly 200 to 500 hours on carbon fibre.</li>
    <li>Local seller warranties cover spare parts for one year.</li>
    <li>Total budget: to be confirmed by official invoice.</li>
  </ul>
  <h3>Ventilation and filtration</h3>
  <p>Printers with a HEPA filter fitted: ${P.filter((p) => p.hepa).map((p) => `<a href="${href(p)}">${esc(p.name)}</a> (${esc(p.filtration)})`).join(', ')}. Whichever printer is bought, it goes in a ventilated room or corner.</p>
  <h3>Supervision</h3>
  <p>A named teacher approves any unattended or overnight run. First-time users complete a short safety induction.</p>
  <h3>Access and tracking</h3>
  <p>Only people who sign in with an STJBS email can book the printer, and every print is logged to a named person.</p>
  <h3>Before buying</h3>
  <ol>
    <li>Set a filament budget and choose a vendor.</li>
    <li>Check the room's circuit (Kobra S1 Max about 2,200 W).</li>
    <li>For any QIDI import, get a delivered quote including shipping and import tax.</li>
  </ol>
  <h3>Imports</h3>
  <p>${esc(meta.importText)}</p>
  <p>Also considered as a premium backup: Prusa Core One (Rp 29,500,000 at 3D Zaiku; the listing title says "CORE ONE PLUS" while the code says "CORE ONE"; model, nozzle and reseller status unconfirmed).</p>
</div>
</section>`;

const SOURCES = [
  'Local specs and prices: 3D Zaiku (3dfilament.co.id) product pages and the Zaiku one-year parts warranty. Taken 28 October 2026, reviewed by Josef.',
  'QIDI Max4 <a href="https://qidi3d.com/products/max4" rel="noopener">qidi3d.com/products/max4</a>; QIDI Plus5 <a href="https://qidi3d.com/products/plus5" rel="noopener">qidi3d.com/products/plus5</a>, QIDI\'s international purchase site, read 28 October 2026.',
  '<a href="https://us.anycubic3d.com/products/kobra-s1-max-combo" rel="noopener">Anycubic Kobra S1 Max Combo manufacturer page</a>',
  '<a href="https://www.tomshardware.com/3d-printing/creality-k2-pro-combo-review" rel="noopener">Creality K2 Pro review, Tom\'s Hardware</a>',
  '<a href="https://www.ldlc.com/en/product/PB00721769.html" rel="noopener">Creality K2 Pro, LDLC product page</a>',
  '<a href="https://3dprinting.com/news/flashforge-creator-5-and-creator-5-pro-launch/" rel="noopener">Flashforge Creator 5 and 5 Pro launch coverage</a>',
  '<a href="https://www.3dfilament.co.id/original-prusa-core-one-full-enclosed-corexy-3d-printer-with-active-temperature-control-high-speed-precision-5302" rel="noopener">Prusa Core One listing, 3D Zaiku</a>',
];
const sources = `<section id="sources" class="section">
<div class="wrap prose">
  <p class="eyebrow">Sources and method</p>
  <h2>Sources</h2>
  <p>Prepared by Josef Yang, JC2, for STJBS. Last updated ${esc(meta.lastUpdated)}.</p>
  <h3>How prices were taken</h3>
  <p>From 3D Zaiku, Indocart, CV Wimeta via Indotrading, and QIDI's international purchase site, all on 28 October 2026. ${esc(meta.priceNote)}</p>
  <h3>Evidence quality</h3>
  <p>Vendor-linked sources are marked with an asterisk (*).</p>
  <h3>Source list</h3>
  <ul class="src-list">${SOURCES.map((s) => `<li>${s}</li>`).join('')}</ul>
  <h3>Images</h3>
  <p>Product photos are retailer or manufacturer promotional images used to illustrate a school proposal; sources are being confirmed. The 3D models are schematic, not likenesses of the real machines.</p>
</div>
</section>`;

// ---------- printer pages ----------
const SPEC_ROWS = [
  ['Build volume', fmt.build], ['Max hotend temperature', fmt.hotend], ['Chamber', fmt.chamber], ['Nozzle', (p) => p.nozzle],
  ['Toolheads', (p) => (p.toolheads > 1 ? String(p.toolheads) : null)], ['Max speed', fmt.speed], ['Filtration', (p) => p.filtration],
  ['Colour system', (p) => p.colourSystem], ['Weight', fmt.weight], ['Power draw', fmt.power],
];
const MISSING = [['Max hotend temperature', 'hotendC'], ['Filtration', 'filtration'], ['Weight', 'weightKg'], ['Power draw', 'powerW'], ['Filaments', 'filaments']];

function printerPage(p, i) {
  const prev = P[(i + P.length - 1) % P.length], next = P[(i + 1) % P.length];
  const m = p.model && MODELS[p.model];
  const rows = SPEC_ROWS.map(([l, f]) => [l, f(p)]).filter(([, v]) => v);
  const missing = MISSING.filter(([l, k]) => p[k] == null && !rows.some(([r]) => r === l)).map(([l]) => l.toLowerCase());
  const media = p.photo ? `<img class="pp-photo" src="/${p.photo}" width="1200" height="1200" alt="${esc(p.name)} 3D printer" fetchpriority="high">` : '';
  const model = m ? `<section class="pp-model" aria-labelledby="feat-h">
    <h2 id="feat-h">Features explained</h2>
    <figure class="model-panel">
      <div data-printer="${p.model}"><img src="/models/svg/${p.model}.svg" alt="${esc(p.name)} schematic model" width="600" height="600" loading="lazy"></div>
      <figcaption>Schematic model, not a likeness of the real machine. Build volume, temperatures, speeds, chamber, camera, filter, screen size, weights and power are verified from manufacturer pages; casing colours, glass panels and the positions of parts are schematic.</figcaption>
    </figure>
    <ul class="feat-list">${Object.keys(m.info).map((k) => `<li><strong>${esc((m.labels && m.labels[k]) || FEATURES[k])}.</strong> ${esc(m.info[k])}</li>`).join('')}</ul>
  </section>` : `<section class="pp-model"><h2>Features explained</h2><div class="empty-panel"><p><strong>Photo and model not added yet.</strong></p><p>The specifications below are from the shortlist.</p></div></section>`;
  const nozzle = p.nozzleNote ? `<p>${esc(p.nozzleNote)}${p.nozzleLink ? ` <a href="${esc(p.nozzleLink)}" rel="noopener">BROZZL hardened nozzle at 3DJake</a>.` : ''}</p>` : '';
  const body = `<div class="wrap pp">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/#printers">Printers</a> / <span aria-current="page">${esc(p.name)}</span></nav>
  <header class="pp-head">
    <p class="row-tags">${tags(p)}</p>
    <h1>${esc(p.name)}</h1>
    <p class="lede">${esc(p.reason || p.bestFor)}</p>
  </header>
  <div class="pp-top">
    ${media}
    <div class="pp-price"><h2 class="label">Price as listed</h2><p>${priceBlock(p)}</p><p class="note">${esc(meta.priceNote)}</p></div>
  </div>
  <div class="pp-pair">
    <section><h2>What it means for the school</h2><p>${esc(p.summary)}</p>${p.standout ? `<p>${esc(p.standout)}.</p>` : ''}</section>
    <section><h2>Trade-off</h2><p>${esc(p.tradeOff)}</p>${p.watchOut ? `<p>${esc(p.watchOut)}.</p>` : ''}</section>
  </div>
  ${model}
  <section><h2>Specifications</h2>
    <table class="spec"><tbody>${rows.map(([l, v]) => `<tr><th scope="row">${l}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
    ${missing.length ? `<p class="note">Not published by the manufacturer: ${missing.join(', ')}.</p>` : ''}
  </section>
  <section><h2>Filaments and nozzle</h2><p>${esc(p.filaments || 'Filament list not stated in the shortlist.')}</p>${nozzle}</section>
  <section><h2>Sources</h2><ul>${p.sources.map((s) => `<li>${link(s)}</li>`).join('')}</ul></section>
  <section class="pp-cmp">
    <label class="check"><input type="checkbox" data-cmp="${p.slug}"> Add to compare</label>
    <a class="btn btn-secondary" href="/compare/?p=${p.slug}" target="_blank" rel="noopener" data-tray-go aria-label="Compare printers (opens in new tab)">Compare</a>
    <p class="cmp-max" data-max hidden>Maximum 3 printers</p>
  </section>
  <nav class="pp-nav" aria-label="Other printers">
    <a href="${href(prev)}">← ${esc(prev.name)}</a>
    <a href="${href(next)}">${esc(next.name)} →</a>
  </nav>
</div>`;
  return page({
    path: href(p), current: 'printers', body,
    title: `${p.name}: STJBS 3D printer proposal`,
    desc: `${p.name} for STJBS: ${p.bestFor}. ${p.price.text}, unconfirmed until an official invoice.`,
    extraHead: m ? '\n<link rel="stylesheet" href="/models/printer-models.css">' : '',
    scripts: m ? `\n<script type="module">import { mountPrinter } from '/models/printer-models.js'; const el = document.querySelector('[data-printer]'); mountPrinter(el, el.dataset.printer);</script>` : '',
  });
}

// ---------- compare ----------
const compareBody = `<div class="wrap pp">
  <h1>Compare printers</h1>
  <p>${esc(meta.priceNote)} Rows where the printers differ are marked "Differs". No row has a winner.</p>
  <div data-compare-root><noscript><p>Compare needs JavaScript. Open the printer pages instead:</p><ul>${P.map((p) => `<li><a href="${href(p)}">${esc(p.name)}</a></li>`).join('')}</ul></noscript></div>
</div>`;

const COMPARE_ROWS = [
  ['Price as listed', fmt.price], ['Build volume', fmt.build], ['Max hotend temperature', fmt.hotend], ['Chamber', fmt.chamber],
  ['Nozzle', (p) => p.nozzle], ['Filaments', (p) => p.filaments], ['Max speed', fmt.speed], ['Weight', fmt.weight],
  ['Best for', (p) => p.bestFor], ['Standout', (p) => p.standout], ['Watch out', (p) => p.watchOut],
];

// ---------- write ----------
const out = (path, html) => { const f = new URL(`public${path}`, root); mkdirSync(new URL('./', f), { recursive: true }); writeFileSync(f, html); };
rmSync(new URL('public/printers', root), { recursive: true, force: true });

out('/index.html', page({
  path: '/', title: 'STJBS 3D printer proposal', body: carousel() + proposal + process() + listTable() + budget() + sources,
  desc: 'A student proposal for the first 3D printer at Saint Johannes Berchmans School: why, how it would run, 12 printers compared, and a recommendation.',
}));
for (const [i, p] of P.entries()) out(`${href(p)}index.html`, printerPage(p, i));
out('/compare/index.html', page({ path: '/compare/', current: 'compare', title: 'Compare printers: STJBS 3D printer proposal', desc: 'Compare two or three shortlisted 3D printers side by side.', body: compareBody }));
out('/data/specs.json', JSON.stringify({
  priceNote: meta.priceNote, importNote: meta.importNote,
  printers: P.map((p) => ({ slug: p.slug, name: p.name, tier: p.tier, photo: p.photo, rows: Object.fromEntries(COMPARE_ROWS.map(([l, f]) => [l, f(p) ?? null])) })),
}));
out('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/compare/', ...P.map(href)].map((u) => `  <url><loc>${abs(u)}</loc><lastmod>${meta.lastUpdated}</lastmod></url>`).join('\n')}\n</urlset>\n`);
console.log(`built ${P.length} printer pages, home, compare, data, sitemap`);
