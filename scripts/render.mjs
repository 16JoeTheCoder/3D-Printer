// Reads specs.json, writes public/index.html. Run: node scripts/render.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const { meta, printers: P } = JSON.parse(readFileSync(new URL('specs.json', root), 'utf8'));

const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => n.toLocaleString('en-US');
const litres = (p) => +((p.build.x * p.build.y * p.build.z) / 1e6).toFixed(1);
const brand = (p) => p.name.split(' ')[0];
const multi = (p) => (p.colours ?? 0) >= 4 || (p.toolheads ?? 0) >= 4;
// Filter tier by rule: HEPA13+carbon 4 > other HEPA 3 > carbon only 2 > "air purifier" (type unstated) 1.
const tier = (p) => (/HEPA13/i.test(p.filtration || '') ? 4 : p.hepa ? 3 : p.carbonFilter ? 2 : p.extras.some((x) => /purifier/i.test(x)) ? 1 : 0);
const tierTxt = (p) => p.filtration || (tier(p) === 1 ? 'air purifier (type not stated)' : 'none stated');

// Pins: [x%, y%, kind] placed on features visible in each photo AND present in the data.
const PINS = {
  kobra: [[56, 33, 'display'], [47, 17, 'ace'], [51, 43, 'head']],
  k2: [[55, 17, 'display'], [51, 31, 'head'], [44, 71, 'plate']],
  creator5: [[50, 20, 'cover'], [42, 49, 'head'], [45, 85, 'plate']],
  max4: [[20, 15, 'display'], [51, 27, 'head'], [37, 74, 'plate']],
  plus5: [[50, 34, 'head'], [39, 67, 'plate']],
};
const KIND = {
  display: ['Display', (p) => p.display],
  ace: ['Multi-colour box', (p) => `${p.colourSystem}: up to ${p.colours} colours`],
  head: ['Toolhead', (p) => `${p.toolheads === 4 ? 'Four independent toolheads (FlashSwap). ' : ''}Hotend ${p.hotendC} °C · nozzle: ${p.nozzle ?? 'not stated by manufacturer'}`],
  plate: ['Build plate', (p) => `${p.build.x}×${p.build.y}×${p.build.z} mm build volume${p.bedC ? ` · bed ${p.bedC} °C` : ''}`],
  cover: ['Top cover', () => 'Door and top-cover detection'],
};
const pinList = (p) => PINS[p.id].map(([x, y, k], i) => ({ x, y, k, id: `${p.id}-${i}`, label: KIND[k][0], text: KIND[k][1](p) }));

const noPin = (p) => [p.camera, p.filtration, `${p.chamberC} °C chamber`, `${p.speedMms} mm/s`, ...(p.id === "creator5" ? [] : p.extras)].filter(Boolean);

const NS = 'not stated';
const rows = (p) => [
  ['Build volume', `${p.build.x} × ${p.build.y} × ${p.build.z} mm`],
  ['Hotend', `${p.hotendC} °C`],
  ['Chamber', `${p.chamberC} °C${p.chamberType ? ` (${p.chamberType})` : ''}`],
  ['Bed', p.bedC && `${p.bedC} °C`],
  ['Speed', `${p.speedMms} mm/s${p.travelMms ? ` print, ${p.travelMms} mm/s travel` : ''}`],
  ['Nozzle', p.nozzle],
  ['Motion', p.kinematics],
  ...(p.toolheads > 1 ? [['Toolheads', `${p.toolheads} independent`]] : []),
  ['Colours', p.colours && `up to ${p.colours} (${p.colourSystem})`],
  ['Camera', p.camera],
  ['Filtration', p.filtration],
  ['Display', p.display],
  ['Weight', p.weightKg && `${p.weightKg} kg${p.weightComboKg ? ` (Combo ${p.weightComboKg} kg)` : ''}`],
  ['Power', p.powerW && `${fmt(p.powerW)} W${p.powerV ? ` at ${p.powerV} V` : ''}`],
  ['Carbon fibre', p.cfMaterials && `${p.cfMaterials.join(', ')}${p.cfNote ? ` — ${p.cfNote}` : ''}`],
  ['Warranty', p.warranty],
  ...(p.extras.length ? [['Also', p.extras.join(', ')]] : []),
];

const stats = (p) => `<ul class="stats">
  <li><b class="count" data-count="${litres(p)}" data-dec="1">${litres(p)}</b><span>L build</span></li>
  <li><b class="count" data-count="${p.chamberC}">${p.chamberC}</b><span>°C chamber</span></li>
  <li><b class="count" data-count="${p.speedMms}">${p.speedMms}</b><span>mm/s</span></li></ul>`;

const img = (p, lazy) => `<img src="${p.photo.file}" width="1200" height="1200" alt="${e(`${p.name} — ${p.photo.versionShown}`)}"${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'}>`;

const slide = (p, i) => `
<section class="slide" id="s-${p.id}" aria-labelledby="h-${p.id}">
  <span class="ghost" aria-hidden="true">0${i + 1}</span>
  <div class="slide-in">
    <p class="idx a-l"><b>0${i + 1}</b>/0${P.length} · ${p.origin === 'local' ? 'Local' : 'Import'}${i === 0 ? ' · <span class="cue">scroll ↓</span>' : ''}</p>
    <h2 class="name a-l" id="h-${p.id}"><small>${e(brand(p))}</small>${e(p.short)}</h2>
    <div class="stage a-r"><div class="photo"><i class="shade"></i><div class="tilt">${img(p, i > 0)}</div></div></div>
    <p class="headline a-u">${e(p.standout)}</p>
    <div class="a-u">${stats(p)}</div>
    <p class="more a-u"><a class="btn" href="#${p.id}">Specs &amp; pins <span aria-hidden="true">→</span></a>${i === 0 ? '<button class="btn line" id="tiltbtn" hidden>Tilt with your phone</button>' : ''}</p>
  </div>
</section>`;

const card = (p) => {
  const pins = pinList(p);
  const priceNote = p.price.note === 'standard' ? 'Standard-version price' : p.price.note;
  return `
<article class="card" id="${p.id}" data-active="${+(p.chamberType === 'active')}" data-cf="${+!!p.cfMaterials?.length}" data-multi="${+multi(p)}" data-four="${+(p.toolheads === 4)}" data-hepa="${+(p.hepa === true)}" data-big="${+(litres(p) >= 30)}" data-safe="${+(p.hepa === true)}" data-colour="${+multi(p)}">
  <div class="chead"><h3>${e(p.name)}</h3><span class="badge">${p.origin === 'local' ? 'Local' : 'Import'}</span></div>
  <div class="photo"><i class="shade"></i><div class="tilt">${img(p, true)}${pins
    .map((n) => `<a class="pin" href="#${n.id}" style="--x:${n.x}%;--y:${n.y}%" aria-label="${e(`${p.short}: ${n.label}`)}" aria-controls="${n.id}"></a>`)
    .join('')}</div></div>
  <div class="tips" id="${p.id}-tips"><p class="tip hint on">Tap a pin for the verified spec.</p>${pins
    .map((n) => `<p class="tip" id="${n.id}"><b>${e(n.label)}</b>${e(n.text)}</p>`)
    .join('')}</div>
  <p class="credit">Photo: ${e(p.photo.store ?? 'source store to be confirmed')} · ${e(p.photo.versionShown)}</p>
  <p class="nopin"><b>Specs, no pin</b> ${noPin(p).map(e).join(' · ')}</p>
  <p class="standout"><span class="tag">Standout</span> ${e(p.standout)}</p>
  ${stats(p)}
  <p class="price"><span>Price</span><b>${e(p.price.text)}</b>${priceNote ? `<em>${e(priceNote)}</em>` : ''}<small>${e(meta.priceLabel)}</small></p>
  <details class="spec"><summary>Full specs &amp; watch-outs</summary>
    <dl>${rows(p).map(([k, v]) => `<dt>${k}</dt><dd${v ? '' : ' class="ns"'}>${v ? e(v) : NS}</dd>`).join('')}</dl>
    <p class="watch"><span class="tag out">Watch-out</span></p><ul>${p.watchOut.map((w) => `<li>${e(w)}</li>`).join('')}</ul>
  </details>
</article>`;
};

// Race rows, pre-ranked by build volume so the page is correct without JS.
const byBuild = [...P].sort((a, b) => litres(b) - litres(a));
const maxL = litres(byBuild[0]);
const race = P.map((p, i) => {
  const r = byBuild.indexOf(p);
  return `<li data-i="${i}" data-b="${litres(p)}" data-c="${p.chamberC}" data-s="${p.speedMms}" data-a="${tier(p)}" data-at="${e(tierTxt(p))}" class="${r === 0 ? 'lead' : ''}" style="--r:${r};--v:${litres(p) / maxL}"><span class="rn">${e(p.short)}</span><span class="val">${litres(p)} L</span><span class="bar"><i></i></span></li>`;
}).join('');

const html = `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>STJBS Printer Shortlist</title>
<meta name="description" content="Five 3D printers for STJBS Jakarta's first school printer: what makes each one stand out, with specs from manufacturer pages.">
<meta name="theme-color" content="#FFFFFF">
<script>document.documentElement.className='js'</script>
<link rel="preload" href="fonts/franklin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/caladea-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="top"><a class="mark" href="#top"><i></i>STJBS<span> Printer shortlist</span></a>
<nav aria-label="Sections"><a href="#race">Race</a><a href="#pick">Pick</a><a href="#compare">Compare</a></nav></header>
<main id="top">
<div class="reel">${P.map(slide).join('')}</div>

<section class="sec" id="race"><div class="wrap">
  <p class="eyebrow">Metric race</p><h2>Who leads, on which number?</h2>
  <div class="chips needs-js" role="group" aria-label="Metric"><button class="chip" data-m="b" aria-pressed="true">Build volume</button><button class="chip" data-m="c" aria-pressed="false">Chamber temp</button><button class="chip" data-m="s" aria-pressed="false">Speed</button><button class="chip" data-m="a" aria-pressed="false">Air filtration</button></div>
  <ol class="race" aria-label="Ranking">${race}</ol>
  <p class="note" id="race-note" aria-live="polite">Build volume = X × Y × Z in litres. Prices are never ranked.</p>
</div></section>

<section class="sec needs-js" id="pick"><div class="wrap">
  <p class="eyebrow">A starting point, not a verdict</p><h2>What matters most?</h2>
  <div class="chips" role="group" aria-label="Priority"><button class="chip" data-p="big" aria-pressed="false">Big parts</button><button class="chip" data-p="safe" aria-pressed="false">Classroom safety</button><button class="chip" data-p="colour" aria-pressed="false">Many colours</button></div>
  <p class="note" id="pick-out" aria-live="polite">Pick one. Matching is by spec rules only.</p>
</div></section>

<section class="compare" id="compare"><div class="wrap">
  <p class="eyebrow">Compare</p><h2>Five printers, one page</h2>
  <div class="filters needs-js" role="group" aria-label="Filters"><button class="chip" data-f="active" aria-pressed="false">Active chamber</button><button class="chip" data-f="cf" aria-pressed="false">Carbon fibre</button><button class="chip" data-f="multi" aria-pressed="false">Multi-colour</button><button class="chip" data-f="four" aria-pressed="false">4 toolheads</button><button class="chip" data-f="hepa" aria-pressed="false">HEPA</button><span class="count-out" id="f-out" aria-live="polite"></span></div>
  <div class="grid">${P.map(card).join('')}</div>
</div></section>
</main>
<footer class="foot"><p>${e(meta.footer)}</p></footer>
<script src="app.js" defer></script>
</body>
</html>
`;
writeFileSync(new URL('public/index.html', root), html);
console.log('public/index.html', html.length, 'bytes');
