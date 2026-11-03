// printer-models.js: zero-dependency 3D printer renderer (orthographic projection, SVG output).
// API: renderSVG(id, state) -> string | mountPrinter(el, id) | mountAll(root)
import { PRINTERS, FEATURES, DEFAULT_ON } from './printer-specs.js';
export { PRINTERS, FEATURES, DEFAULT_ON };

const RAD = Math.PI / 180;
const NS = 'http://www.w3.org/2000/svg';
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const r1 = (n) => Math.round(n * 10) / 10;
const LIGHT = (() => { const v = [-0.5, -0.6, 0.8], l = Math.hypot(...v); return v.map((a) => a / l); })();
const FIL = ['#e5484d', '#f4f4f0', '#3b82f6', '#f5c542'];

// ---------- scene: list of primitives in mm (x right, y back, z up) ----------
export function buildScene(s, on) {
  const { W, D, H } = s.dims, bh = s.base, p = s.post, A = s.accent, P = [];
  const [bw, bd, bz] = s.build, gx = (W - bw) / 2, gy = (D - bd) / 2, zb = bh + 24;
  const box = (b, c, o = {}) => P.push({ k: 'box', b, c, bucket: 'auto', layer: 'frame', ...o });
  const I = { bucket: 'int' }, X = { bucket: 'ext' };

  box([0, 0, 0, W, D, bh], '#2c323d', I);
  box([W * 0.06, -2, bh * 0.07, W * 0.94, 0, bh * 0.17], A, { ...X, flat: 1 });
  box([W / 2 - 30, D / 2 - 30, bh, W / 2 + 30, D / 2 + 30, bh + 12], '#6b7482', I);
  box([gx - 10, gy - 10, bh + 12, gx + bw + 10, gy + bd + 10, zb], '#aab2be', I);
  [[0, 0], [W - p, 0], [0, D - p], [W - p, D - p]].forEach(([x, y]) => box([x, y, bh, x + p, y + p, H], '#586377'));
  box([0, 0, H - 10, W, p, H], '#586377'); box([0, D - p, H - 10, W, D, H], '#586377');
  box([0, p, H - 10, p, D - p, H], '#586377'); box([W - p, p, H - 10, W, D - p, H], '#586377');

  const g = s.glass || {};
  const Q = (pts, n, k) => P.push({ k: 'quad', pts, n, glass: !!g[k], layer: 'panels' });
  Q([[0, 0, bh], [W, 0, bh], [W, 0, H], [0, 0, H]], [0, -1, 0], 'front');
  Q([[0, D, bh], [W, D, bh], [W, D, H], [0, D, H]], [0, 1, 0], 'back');
  Q([[0, 0, bh], [0, D, bh], [0, D, H], [0, 0, H]], [-1, 0, 0], 'left');
  Q([[W, 0, bh], [W, D, bh], [W, D, H], [W, 0, H]], [1, 0, 0], 'right');
  Q([[0, 0, H], [W, 0, H], [W, D, H], [0, D, H]], [0, 0, 1], 'top');

  if (on.toolhead) {
    const n = s.heads, hw = n > 1 ? 40 : 58, gap = 6, tw = n * hw + (n - 1) * gap, x0 = W / 2 - tw / 2;
    const hy = D / 2, hh = hw * 0.9, zt = zb + bz * 0.72, rz = zt + hh + 6, o = { layer: 'toolhead', ...I };
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (hw + gap);
      box([x, hy - 26, zt, x + hw, hy + 26, zt + hh], '#d7dbe1', o);
      box([x, hy - 26, zt + hh - 9, x + hw, hy + 26, zt + hh], A, o);
      box([x + hw / 2 - 4, hy - 4, zt - 14, x + hw / 2 + 4, hy + 4, zt], '#b9c1cd', o);
    }
    box([14, 14, rz - 14, 26, D - 14, rz - 2], '#8a93a3', o); box([W - 26, 14, rz - 14, W - 14, D - 14, rz - 2], '#8a93a3', o);
    box([18, hy - 6, rz - 2, W - 18, hy + 6, rz + 12], '#97a0af', o);
  }
  const cu = s.colour;
  if (cu && on.colour) {
    const o = { layer: 'colour', ghost: !!cu.ghost, ...X };
    const x0 = cu.pos === 'left' ? -cu.w - 14 : (W - cu.w) / 2, y0 = (D - cu.d) / 2, z0 = cu.pos === 'left' ? 0 : H;
    box([x0, y0, z0, x0 + cu.w, y0 + cu.d, z0 + cu.h], '#38404e', o);
    box([x0, y0, z0 + cu.h - 10, x0 + cu.w, y0 + cu.d, z0 + cu.h], A, o);
    const step = cu.w / cu.slots, sw = step * 0.58;
    for (let i = 0; i < cu.slots; i++)
      box([x0 + step * i + (step - sw) / 2, y0 - 2.5, z0 + cu.h * 0.2, x0 + step * i + (step + sw) / 2, y0, z0 + cu.h * 0.72], FIL[i % 4], { ...o, flat: 1 });
  }
  if (on.camera && s.camera) {
    box([W / 2 - 15, 34, H - 48, W / 2 + 15, 52, H - 28], '#161a21', { layer: 'camera', ...I });
    box([W / 2 - 5, 32, H - 42, W / 2 + 5, 34, H - 34], A, { layer: 'camera', flat: 1, ...I });
  }
  if (on.filter && s.filter) {
    const fw = s.filter.w, z1 = bh + 14, z2 = Math.min(H - 30, bh + 14 + s.filter.h), o = { layer: 'filter' };
    box([W, D * 0.2, z1, W + fw, D * 0.8, z2], '#38404e', o);
    for (let i = 0; i < 7; i++) { const z = z1 + 20 + i * ((z2 - z1 - 40) / 6); box([W + fw, D * 0.26, z - 3, W + fw + 2, D * 0.74, z + 3], '#12151b', o); }
  }
  if (on.screen && s.screenIn) {
    const d = s.screenIn * 25.4, w = d * 0.87, h = d * 0.49, cx = W * 0.78, cz = bh * 0.52, o = { layer: 'screen', ...X };
    box([cx - w / 2 - 4, -5, cz - h / 2 - 4, cx + w / 2 + 4, 0, cz + h / 2 + 4], '#0c0f15', o);
    box([cx - w / 2, -6, cz - h / 2, cx + w / 2, -5, cz + h / 2], '#4aa3ff', { ...o, flat: 1 });
  }
  if (on.spool && s.spools) {
    const n = s.spools, len = n > 1 ? 42 : 60, gap = 6, tw = n * len + (n - 1) * gap, x0 = W / 2 - tw / 2, cy = D * 0.78, r = 100, cz = H + 14 + r;
    const o = { layer: 'spool', ...X };
    box([x0 - 8, cy - 8, H, x0 + tw + 8, cy + 8, H + 14], '#586377', o);
    for (let i = 0; i < n; i++) {
      const xc = x0 + i * (len + gap) + len / 2;
      P.push({ k: 'cyl', ax: 'x', ce: [xc, cy, cz], r: r - 8, len, col: FIL[i % 4], ...o });
      [-1, 1].forEach((t) => P.push({ k: 'cyl', ax: 'x', ce: [xc + t * (len / 2 + 1.5), cy, cz], r, len: 3, col: '#cfd5de', ...o }));
    }
  }
  if (on.chute && s.chute) box([-34, D * 0.28, bh * 0.2, 0, D * 0.5, bh * 0.2 + 46], '#1c2028', { layer: 'chute', ...X });
  if (on.sensors && s.sensors) {
    const o = { layer: 'sensors', flat: 1, ...X };
    box([W / 2 - 9, -3, H - 24, W / 2 + 9, 0, H - 12], A, o); box([W / 2 - 9, D - 12, H, W / 2 + 9, D - 2, H + 5], A, o);
  }
  return P;
}

// ---------- geometry helpers ----------
const BF = [
  [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]], [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]]],
  [[0, 1, 0], [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]]], [[-1, 0, 0], [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]]],
  [[1, 0, 0], [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]]],
];
const cor = (b, [i, j, k]) => [b[i ? 3 : 0], b[j ? 4 : 1], b[k ? 5 : 2]];
function cylFaces(p) {
  const ai = { x: 0, y: 1, z: 2 }[p.ax], a1 = (ai + 1) % 3, a2 = (ai + 2) % 3, N = 16, out = [];
  const at = (t, a) => { const q = [0, 0, 0]; q[ai] = p.ce[ai] + (t * p.len) / 2; q[a1] = p.ce[a1] + Math.cos(a) * p.r; q[a2] = p.ce[a2] + Math.sin(a) * p.r; return q; };
  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * 2 * Math.PI, t1 = ((i + 1) / N) * 2 * Math.PI, n = [0, 0, 0];
    n[a1] = Math.cos((t0 + t1) / 2); n[a2] = Math.sin((t0 + t1) / 2);
    out.push({ n, v: [at(-1, t0), at(-1, t1), at(1, t1), at(1, t0)] });
  }
  [-1, 1].forEach((t) => { const n = [0, 0, 0]; n[ai] = t; out.push({ n, v: Array.from({ length: N }, (_, i) => at(t, (i / N) * 2 * Math.PI)) }); });
  return out;
}
const facesOf = (p) => (p.k === 'cyl' ? cylFaces(p) : BF.map(([n, idx]) => ({ n, v: idx.map((c) => cor(p.b, c)) })));
function bbox(p) {
  if (p.k === 'box') return p.b;
  if (p.k === 'quad') { const t = [0, 1, 2].map((i) => p.pts.map((q) => q[i])); return [Math.min(...t[0]), Math.min(...t[1]), Math.min(...t[2]), Math.max(...t[0]), Math.max(...t[1]), Math.max(...t[2])]; }
  const ai = { x: 0, y: 1, z: 2 }[p.ax], lo = [], hi = [];
  for (let i = 0; i < 3; i++) { const e = i === ai ? p.len / 2 : p.r; lo[i] = p.ce[i] - e; hi[i] = p.ce[i] + e; }
  return [...lo, ...hi];
}

// ---------- camera ----------
function makeCam(yaw, pitch, ctr, fit) {
  const t = yaw * RAD, q = pitch * RAD, ct = Math.cos(t), st = Math.sin(t), cp = Math.cos(q), sp = Math.sin(q);
  const raw = (x, y, z) => { const dx = x - ctr[0], dy = y - ctr[1], dz = z - ctr[2], a = dx * ct - dy * st, b = dx * st + dy * ct; return { a, sy: -(dz * cp + b * sp), d: b * cp - dz * sp }; };
  return {
    raw,
    p(x, y, z) { const r = raw(x, y, z); return { x: (r.a - fit.cx) * fit.k, y: (r.sy - fit.cy) * fit.k, d: r.d }; },
    vis(n) { const a = n[0] * ct - n[1] * st, b = n[0] * st + n[1] * ct; return { v: -b * cp + n[2] * sp > 0.001, dot: Math.max(0, a * LIGHT[0] + b * LIGHT[1] + n[2] * LIGHT[2]) }; },
  };
}
const fitCache = {};
function getFit(id, s) {
  if (fitCache[id]) return fitCache[id];
  const ctr = [s.dims.W / 2, s.dims.D / 2, s.dims.H / 2], all = buildScene(s, { ...DEFAULT_ON, spool: 1, colour: 1 });
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let yaw = 0; yaw < 360; yaw += 15) {
    const c = makeCam(yaw, 30, ctr, { cx: 0, cy: 0, k: 1 });
    all.forEach((p) => { const b = bbox(p); for (let m = 0; m < 8; m++) { const r = c.raw(b[m & 1 ? 3 : 0], b[m & 2 ? 4 : 1], b[m & 4 ? 5 : 2]); x0 = Math.min(x0, r.a); x1 = Math.max(x1, r.a); y0 = Math.min(y0, r.sy); y1 = Math.max(y1, r.sy); } });
  }
  const k = Math.min(350 / (x1 - x0), 290 / (y1 - y0));
  return (fitCache[id] = { ctr, k, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, h: (y1 - y0) * k });
}

// ---------- render ----------
const THEME = {
  dark: { gl: 'rgba(150,196,238,.11)', ge: 'rgba(190,216,242,.55)', fr: 'rgba(52,59,74,.62)', fe: 'rgba(190,200,215,.38)', tx: '#9aa4b5', ed: 'rgba(8,10,15,.55)', sh: 'rgba(0,0,0,.30)' },
  light: { gl: 'rgba(60,110,170,.12)', ge: 'rgba(40,70,110,.5)', fr: 'rgba(70,78,94,.5)', fe: 'rgba(40,50,70,.45)', tx: '#4a5568', ed: 'rgba(8,10,15,.55)', sh: 'rgba(0,0,0,.14)' },
};

export function renderSVG(id, o = {}) {
  const s = PRINTERS[id];
  const st = { yaw: -32, pitch: 30, on: DEFAULT_ON, xray: false, focus: null, theme: 'dark', ...o };
  const T = THEME[st.theme] || THEME.dark, fit = getFit(id, s), cam = makeCam(st.yaw, st.pitch, fit.ctr, fit);
  const { W, D, H } = s.dims, A = s.accent, on = st.on, [bw, bd, bz] = s.build;
  const gx = (W - bw) / 2, gy = (D - bd) / 2, zb = s.base + 24;
  const B = [[], [], [], [], [], []]; // 0 ground, 1 back panels, 2 interior, 3 front panels, 4 exterior, 5 overlay
  const dm = cam.p(W / 2, D / 2, H / 2).d;
  const poly = (pts, fill, stroke, w = 0.5, extra = '') => `<polygon points="${pts.map((q) => r1(q.x) + ',' + r1(q.y)).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"${extra}/>`;
  const warm = on.chamber, glassFill = st.xray ? 'rgba(150,196,238,.05)' : warm ? 'rgba(255,150,70,.20)' : T.gl;
  const glassEdge = warm ? 'rgba(255,196,130,.65)' : T.ge, frostFill = st.xray ? 'rgba(52,59,74,.16)' : T.fr;

  // ground shadow and footprint
  const gp = (a, b) => cam.p(a, b, 0);
  B[0].push({ d: 0, s: poly([gp(-18, -18), gp(W + 18, -18), gp(W + 18, D + 18), gp(-18, D + 18)], T.sh, 'none') });
  if (on.footprint) B[0].push({ d: 1, s: poly([gp(0, 0), gp(W, 0), gp(W, D), gp(0, D)], A + '22', A, 1, ' stroke-dasharray="4 3"') });

  buildScene(s, on).forEach((p) => {
    const dim = st.focus && p.layer !== st.focus, foc = st.focus && p.layer === st.focus, op = dim ? ' opacity=".28"' : '';
    const wrap = (inner) => `<g data-l="${p.layer}"${op}>${inner}</g>`;
    const bb = bbox(p), mid = cam.p((bb[0] + bb[3]) / 2, (bb[1] + bb[4]) / 2, (bb[2] + bb[5]) / 2);
    if (p.k === 'quad') {
      const vis = cam.vis(p.n).v, edge = p.glass ? glassEdge : T.fe, fill = p.glass ? glassFill : warm && !st.xray ? 'rgba(90,64,56,.62)' : frostFill;
      (vis ? B[3] : B[1]).push({ d: mid.d, s: wrap(poly(p.pts.map((q) => cam.p(...q)), fill, edge, vis ? 0.9 : 0.5)) });
      return;
    }
    const base = hex(p.k === 'cyl' ? p.col : p.c);
    const out = facesOf(p).map((f) => {
      const { v, dot } = cam.vis(f.n); if (!v) return '';
      const m = p.flat ? 1 : 0.42 + 0.72 * dot, fill = `rgb(${base.map((x) => Math.min(255, Math.round(x * m))).join(',')})`;
      const pts = f.v.map((q) => cam.p(...q));
      return p.ghost ? poly(pts, fill, A, 0.9, ' fill-opacity=".22" stroke-dasharray="3 2"') : poly(pts, fill, foc ? A : T.ed, foc ? 1.3 : 0.5);
    }).join('');
    const b = p.bucket === 'int' ? 2 : p.bucket === 'ext' ? 4 : mid.d < dm ? 4 : 2;
    B[b].push({ d: mid.d, s: wrap(out) });
  });

  if (on.volume) { // dashed build-volume cube
    const x1 = gx + bw, y1 = gy + bd, z1 = zb + bz, c = (x, y, z) => cam.p(x, y, z);
    const L = (a, b) => `<line x1="${r1(a.x)}" y1="${r1(a.y)}" x2="${r1(b.x)}" y2="${r1(b.y)}"/>`;
    const q = [c(gx, gy, zb), c(x1, gy, zb), c(x1, y1, zb), c(gx, y1, zb)], u = [c(gx, gy, z1), c(x1, gy, z1), c(x1, y1, z1), c(gx, y1, z1)];
    B[5].push({ d: 0, s: `<g stroke="${A}" stroke-width="1.1" stroke-dasharray="4 3" fill="none">${[0, 1, 2, 3].map((i) => L(q[i], q[(i + 1) % 4]) + L(u[i], u[(i + 1) % 4]) + L(q[i], u[i])).join('')}</g>` + poly(q, A + '1f', 'none') });
  }
  if (on.chamber) { // rising heat lines above the bed
    const sq = (x) => { const a = cam.p(x, D / 2, zb + 30), n = 3; let d = `M${r1(a.x)} ${r1(a.y)}`; for (let i = 0; i < n; i++) d += ` q${i % 2 ? -7 : 7} -11 0 -22`; return `<path class="pm-heat" d="${d}" style="animation-delay:${r1(x % 7 / 10)}s"/>`; };
    B[5].push({ d: 0, s: `<g fill="none" stroke="#ffb070" stroke-width="1.6" stroke-linecap="round" opacity=".85">${[0.25, 0.5, 0.75].map((f) => sq(gx + bw * f)).join('')}</g>` });
  }

  const body = B.map((arr, i) => (i === 0 || i === 5 ? arr : arr.sort((a, b) => b.d - a.d)).map((e) => e.s).join('')).join('');
  const vh = Math.round(fit.h + 28 + 46), top = -Math.round(fit.h / 2) - 14;
  const lab = (y, t) => `<text x="-192" y="${y}" font-family="system-ui,sans-serif" font-size="11" fill="${T.tx}">${t}</text>`;
  const ly = Math.round(fit.h / 2) + 28;
  const labels = (on.volume ? lab(ly, `Build volume ${bw} × ${bd} × ${bz} mm`) : '') + (on.footprint ? lab(ly + 15, `Footprint ${W} × ${D} mm${s.dimsNote.startsWith('est') ? ' (estimated)' : ''}`) : '');
  return `<svg xmlns="${NS}" viewBox="-200 ${top} 400 ${vh}" width="100%" role="img" aria-label="${s.name}, schematic 3D model"><title>${s.name}</title>${body}${labels}</svg>`;
}

// ---------- interactive mount ----------
export function mountPrinter(root, id, opt = {}) {
  const s = PRINTERS[id]; if (!s) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const st = { yaw: -32, pitch: 30, on: { ...DEFAULT_ON }, xray: false, focus: null, turn: false, theme: opt.theme || 'dark' };
  const feats = Object.keys(FEATURES).filter((k) => s.info[k]);
  const hint = 'Drag the model to rotate. Tap a feature to highlight it. Schematic model, not a likeness.';
  root.classList.add('pm'); root.style.setProperty('--pm-accent', s.accent);
  root.innerHTML = `<div class="pm-stage" tabindex="0" aria-label="${s.name} model. Drag or use the arrow keys to rotate."></div>
<div class="pm-chips" role="group" aria-label="Features">${feats.map((k) => `<button type="button" class="pm-chip" data-f="${k}" aria-pressed="false">${(s.labels && s.labels[k]) || FEATURES[k]}</button>`).join('')}</div>
<div class="pm-chips" role="group" aria-label="View"><button type="button" class="pm-chip pm-alt" data-v="xray" aria-pressed="false">X-ray</button><button type="button" class="pm-chip pm-alt" data-v="turn" aria-pressed="false"${reduce ? ' disabled' : ''}>Turntable</button><button type="button" class="pm-chip pm-alt" data-v="l" aria-label="Rotate left">‹ Rotate</button><button type="button" class="pm-chip pm-alt" data-v="r" aria-label="Rotate right">Rotate ›</button><button type="button" class="pm-chip pm-alt" data-v="reset">Reset</button></div>
<p class="pm-note" aria-live="polite"></p>`;
  const stage = root.querySelector('.pm-stage'), note = root.querySelector('.pm-note');
  let queued = 0;
  const draw = () => { queued = 0; stage.innerHTML = renderSVG(id, st); };
  const frame = () => { if (!queued) queued = requestAnimationFrame(draw); };
  const sync = () => {
    feats.forEach((k) => root.querySelector(`[data-f="${k}"]`).setAttribute('aria-pressed', String(!!st.on[k])));
    root.querySelector('[data-v="xray"]').setAttribute('aria-pressed', String(st.xray));
    root.querySelector('[data-v="turn"]').setAttribute('aria-pressed', String(st.turn));
    const lbl = st.focus && ((s.labels && s.labels[st.focus]) || FEATURES[st.focus]);
    note.innerHTML = st.focus ? `<strong>${lbl}.</strong> ${s.info[st.focus]}` : hint;
    draw();
  };
  const toggle = (k) => { st.on[k] = st.on[k] ? 0 : 1; st.focus = st.on[k] ? k : st.focus === k ? null : st.focus; sync(); };
  root.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]'), v = e.target.closest('[data-v]');
    if (f) return toggle(f.dataset.f);
    if (v) {
      const a = v.dataset.v;
      if (a === 'xray') st.xray = !st.xray; else if (a === 'turn') { st.turn = !st.turn; if (st.turn) spin(); }
      else if (a === 'l') st.yaw -= 30; else if (a === 'r') st.yaw += 30; else { st.yaw = -32; st.xray = false; st.turn = false; st.focus = null; st.on = { ...DEFAULT_ON }; }
      return sync();
    }
  });
  let down = null, moved = 0;
  stage.addEventListener('pointerdown', (e) => { down = e.clientX; moved = 0; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', (e) => { if (down === null) return; const dx = e.clientX - down; if (Math.abs(dx) > 3) moved = 1; st.yaw += dx * 0.6; down = e.clientX; frame(); });
  stage.addEventListener('pointerup', (e) => { // a tap (no drag) on a part focuses its feature
    const was = moved; down = null; moved = 0; if (was) return;
    const part = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-l]'), k = part && part.dataset.l;
    if (k && s.info[k]) { st.on[k] = 1; st.focus = st.focus === k ? null : k; sync(); }
  });
  stage.addEventListener('pointercancel', () => { down = null; moved = 0; });
  stage.addEventListener('keydown', (e) => { const d = { ArrowLeft: -10, ArrowRight: 10 }[e.key]; if (d) { e.preventDefault(); st.yaw += d; frame(); } });
  function spin() { const t = () => { if (!st.turn || !root.isConnected) return; st.yaw += 0.25; frame(); requestAnimationFrame(t); }; requestAnimationFrame(t); }
  sync();
}
export const mountAll = (scope = document) => scope.querySelectorAll('[data-printer]').forEach((el) => mountPrinter(el, el.dataset.printer));
