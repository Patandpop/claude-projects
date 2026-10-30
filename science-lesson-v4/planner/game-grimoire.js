/* The Grimoire: the way into Vespers (1U.10, Patryk's picks BG1 candlelit desk, T1 iron-bound tome, T4 chains).
   MADE BY planner/tools/make-grimoire.js from replica/design/mockups/grimoire/index.html; change those, not this file.
   The book lies chained on the desk between two candles; the chains strain and snap, the cover flies open, the circle on
   its pages lights ring by ring, a portal opens in the middle and two Ulhu-green tentacles reach up and drag you in, then
   a green flash. All in chunky pixels, one small canvas.
   GRIM.play(host) -> Promise, resolved as the flash peaks (open the Vespers sheet then). host = the Ulhu box (position
   relative). A tap skips to the end. Reduced motion: no animation, it resolves at once. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.GRIM) return;
const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let phase = 'play';
const cur = 'BG1';
/* ================= pixel drawing ================= */
let g = null, W = 130, H = 240;
const R = Math.round, OL = '#0b0a10';
function rng(s) { return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function rc(x, y, w, h, c) { g.fillStyle = c; g.fillRect(R(x), R(y), R(w), R(h)); }
function disc(cx, cy, r, c) { g.fillStyle = c; cx = R(cx); cy = R(cy); const n = Math.ceil(r); for (let y = -n; y <= n; y++) { const q = r * r - y * y; if (q < 0) continue; const w = Math.floor(Math.sqrt(q) + .3); g.fillRect(cx - w, cy + y, 2 * w + 1, 1); } }
function ring(cx, cy, r, c) { g.fillStyle = c; const n = Math.max(12, R(r * 7)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.fillRect(R(cx + Math.cos(a) * r), R(cy + Math.sin(a) * r), 1, 1); } }
function line(x0, y0, x1, y1, c) { g.fillStyle = c; const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1; for (let i = 0; i <= n; i++) g.fillRect(R(x0 + (x1 - x0) * i / n), R(y0 + (y1 - y0) * i / n), 1, 1); }
const sm = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
// stepped vignette: three hard bands, the pixel way
function vignette() { for (let k = 1; k <= 3; k++) { const b = k * 3, c = 'rgba(0,0,0,.16)'; rc(0, 0, W, b, c); rc(0, H - b, W, b, c); rc(0, b, b, H - 2 * b, c); rc(W - b, b, b, H - 2 * b, c); } }

/* ---- a tentacle: a chain of discs, outline, dark, mid, a highlight, and suckers on one side ---- */
function armPts(o, t) {
  const n = Math.max(8, R(o.len / 1.1)), st = o.len / n, P = []; let x = o.x, y = o.y;
  for (let i = 0; i <= n; i++) { const s = i / n, aa = o.a + (o.bend || 0) * s + o.curl * s * s * s + (o.sw || 0) * Math.sin(t * (o.sp || 1.4) + (o.ph || 0) + s * 3.2) * s;
    P.push({ x: o.mir ? W - x : x, y, r: o.r0 + (o.r1 - o.r0) * s, a: o.mir ? Math.PI - aa : aa }); x += Math.cos(aa) * st; y += Math.sin(aa) * st; }
  return P;
}
function drawArm(P, p) {
  P.forEach((q) => disc(q.x, q.y, q.r + 1, p[0]));
  P.forEach((q) => disc(q.x, q.y, q.r, p[1]));
  P.forEach((q) => { if (q.r >= 1.2) disc(q.x - q.r * .22, q.y - q.r * .26, q.r * .66, p[2]); });
  P.forEach((q, i) => { if (q.r >= 2.4 && i % 2 === 0) disc(q.x - q.r * .42, q.y - q.r * .46, q.r * .2, p[3]); });
  P.forEach((q, i) => { if (i % 4 !== 1 || q.r < 1.8) return; const nx = -Math.sin(q.a), ny = Math.cos(q.a), sx = q.x + nx * q.r * .6, sy = q.y + ny * q.r * .6;
    disc(sx, sy, Math.max(.7, q.r * .32), p[4]); disc(sx - .4, sy - .4, Math.max(.3, q.r * .14), p[5]); });
}
const GREEN = ['#0c1a14', '#1f6a4a', '#3fae78', '#a6f5c8', '#e9a9bf', '#fff0f4'];
const PLUM = ['#140a1c', '#4a2a6a', '#7a4aa6', '#d4a8f2', '#f2b6d4', '#fff2f8'];
const arm = (o, t, pal) => drawArm(armPts(o, t), pal);

/* ---- the T1 tome, with T4's chains ---- */
function chain(x0, x1, y, t, strain) {
  for (let x = x0, i = 0; x < x1; x += 3, i++) { const j = strain ? R(Math.sin(t * 40 + i * 1.7) * strain) : 0;
    if (i % 2 === 0) { rc(x - 1, y - 2 + j, 5, 5, OL); rc(x, y - 1 + j, 3, 3, '#8a8f99'); rc(x + 1, y + j, 1, 1, '#1a1a20'); rc(x, y - 1 + j, 2, 1, '#c9cdd6'); }
    else { rc(x - 1, y - 1 + j, 4, 3, OL); rc(x, y + j, 2, 1, '#5c616b'); } }
}
function book(cx, cy, bw, bh, s, t) {
  // s: {open 0..1, chains bool, strain, rings 0..4, portal 0..1}
  const sp = R(cx - bw / 2 * (1 - s.open)), y = R(cy - bh / 2), shx = s.shake || 0;
  const X = sp + shx;
  // shadow
  const lw = s.open > .5 ? bw : 0;
  rc(X - lw + 3, y + 4, bw + lw, bh, 'rgba(0,0,0,.4)');
  // right page block (thickness to the right and bottom)
  rc(X - 1, y - 1, bw + 3, bh + 4, OL);
  rc(X, y + bh, bw + 1, 2, '#c9b688'); rc(X + bw, y, 1, bh + 1, '#bba776');
  if (s.open > 0) pages(X, y, bw, bh, 1, s, t);
  // the cover, swinging over the spine
  const cw = R(bw * Math.cos(Math.PI * Math.min(1, s.open)));
  if (s.open > .5) {
    rc(X + cw - 2, y - 2, -cw + 2, bh + 6, OL); rc(X + cw - 1, y - 1, -cw + 1, bh + 4, '#2a2530');
    rc(X - bw - 1, y - 1, bw + 1, bh + 4, OL); pages(X - bw, y, bw, bh, 0, s, t);
    rc(X - bw, y + bh, bw, 2, '#c9b688'); rc(X - 1, y, 2, bh + 2, '#b8a272'); rc(X, y + bh + 2, 1, 1, OL);
    circle(X, y + bh / 2, Math.min(bw * .82, bh * .46), s, t);
  } else if (cw > 0) {
    rc(X, y, cw, bh, '#25212c');
    rc(X + 1, y + 1, cw - 2, 2, '#3b3646'); rc(X + 1, y + 1, 2, bh - 2, '#332f3d'); rc(X + 1, y + bh - 2, cw - 2, 1, '#18151d');
    rc(X, y, 4, bh, '#1b1821'); rc(X + 4, y, 1, bh, '#100e15'); rc(X + 1, y + 2, 1, bh - 4, '#2c2834');
    if (cw > bw * .85) cover(X, y, bw, bh, s, t);
  }
}
function cover(X, y, bw, bh, s, t) {
  const cx = X + 2 + bw / 2, cy = y + bh / 2, r = bw * .27;
  // embossed circle: carved ring with a lit lip, a faint green core that breathes
  ring(cx, cy, r + 1, '#3d3849'); ring(cx, cy, r, '#121017'); ring(cx, cy, r * .62, '#121017'); ring(cx, cy, r * .62 + 1, '#3d3849');
  const br = RM() ? 1 : (Math.floor(t * 3) % 4 === 0 ? 2 : 1);
  disc(cx, cy, 2 + br * .6, br > 1 ? '#2f8a5e' : '#1f5a40'); rc(cx, cy, 1, 1, '#9af7c6');
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; rc(cx + Math.cos(a) * r * .8, cy + Math.sin(a) * r * .8, 1, 1, '#4a4458'); }
  // two stylised cracks
  line(X + 7, y + 6, X + 11, y + 10, '#120f17'); line(X + 11, y + 10, X + 10, y + 14, '#120f17'); rc(X + 8, y + 6, 1, 1, '#4a4458');
  line(X + bw - 9, y + bh - 7, X + bw - 13, y + bh - 12, '#120f17'); rc(X + bw - 9, y + bh - 8, 1, 1, '#4a4458');
  // iron corners
  [[X, y, 1, 1], [X + bw - 1, y, -1, 1], [X, y + bh - 1, 1, -1], [X + bw - 1, y + bh - 1, -1, -1]].forEach(([x0, y0, dx, dy]) => {
    for (let k = 0; k < 7; k++) for (let j = 0; j < 7 - k; j++) rc(x0 + dx * j, y0 + dy * k, 1, 1, (j === 6 - k) ? '#2a2c33' : (k === 0 || j === 0) ? '#b8bcc6' : '#7b808b');
    rc(x0 + dx * 2, y0 + dy * 2, 1, 1, '#2a2c33'); });
  // clasps on the fore-edge
  [.28, .72].forEach((f) => { const yy = R(y + bh * f) + (s.strain ? R(Math.sin(t * 50 + f * 9) * s.strain * .6) : 0);
    rc(X + bw - 7, yy - 3, 11, 7, OL); rc(X + bw - 6, yy - 2, 9, 5, '#6b6f78'); rc(X + bw - 6, yy - 2, 9, 1, '#b8bcc6'); rc(X + bw - 6, yy + 2, 9, 1, '#3c3f46'); rc(X + bw - 3, yy - 1, 2, 2, '#2a2c33'); });
  if (s.chains) { const L = X - 4, Rr = X + bw + 4; chain(L, Rr, R(y + bh * .4), t, s.strain); chain(L, Rr, R(y + bh * .6), t, s.strain);
    const py = R(y + bh / 2), px = X + bw - 2 + (s.strain ? R(Math.sin(t * 37) * s.strain) : 0);
    rc(px - 4, py - 4, 9, 9, OL); rc(px - 3, py - 1, 7, 5, '#c9a24a'); rc(px - 3, py - 1, 7, 1, '#f2d58a'); rc(px - 3, py + 3, 7, 1, '#8a6a2a'); rc(px, py + 1, 1, 1, OL);
    rc(px - 2, py - 3, 5, 1, '#8a8f99'); rc(px - 2, py - 3, 1, 2, '#8a8f99'); rc(px + 2, py - 3, 1, 2, '#8a8f99'); }
}
function pages(x, y, bw, bh, right, s, t) {
  rc(x, y, bw, bh, '#efe2c2');
  if (right) { rc(x, y, 3, bh, '#d6c398'); rc(x + 3, y, 1, bh, '#e2d2ab'); } else { rc(x + bw - 3, y, 3, bh, '#d6c398'); rc(x + bw - 4, y, 1, bh, '#e2d2ab'); }
  rc(x, y, bw, 1, '#fff6dc');
  const r = rng(right ? 11 : 7);
  for (let yy = y + 5; yy < y + bh - 4; yy += 3) { let xx = x + 5; while (xx < x + bw - 6) { const w = 2 + R(r() * 6); if (xx + w < x + bw - 5) rc(xx, yy, w, 1, '#cdb98f'); xx += w + 1 + R(r() * 2); } }
}
function circle(cx, cy, Rr, s, t) {
  const radii = [Rr, Rr * .82, Rr * .55, Rr * .3];
  disc(cx, cy, Rr + 2, 'rgba(239,226,194,.85)');
  radii.forEach((r, k) => { const lit = s.rings > k; if (lit) { ring(cx, cy, r + 1, 'rgba(94,242,160,.35)'); ring(cx, cy, r - 1, 'rgba(94,242,160,.25)'); } ring(cx, cy, r, lit ? '#3fd88a' : '#9a8a64'); });
  const pts = []; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; pts.push([cx + Math.cos(a) * radii[1], cy + Math.sin(a) * radii[1]]); }
  for (let k = 0; k < 5; k++) { const a = pts[k], b = pts[(k + 2) % 5]; line(a[0], a[1], b[0], b[1], s.rings > 1 ? '#2fb874' : '#a8986c'); }
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, rr = (radii[0] + radii[1]) / 2; rc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1, 1, s.rings > 0 ? '#5ef2a0' : '#8a7a5a'); }
  if (s.portal > 0) { const pr = radii[2] * s.portal; disc(cx, cy, pr + 1, '#0f3a28'); disc(cx, cy, pr, '#06140f'); if (pr > 3) { ring(cx, cy, pr * .6, '#123f2c'); rc(cx - 1, cy - 1, 2, 2, '#5ef2a0'); } }
}


const BG = {};
BG.BG1 = { back(t) { // candlelit desk
  const ph = 14; for (let y = 0, i = 0; y < H; y += ph, i++) { rc(0, y, W, ph, i % 2 ? '#4a2c1a' : '#43281a'); rc(0, y, W, 1, '#5e3a24'); rc(0, y + ph - 1, W, 1, '#22130a');
    const r = rng(i * 7 + 3); for (let k = 0; k < 6; k++) rc(r() * W, y + 3 + r() * (ph - 6), 4 + r() * 9, 1, '#38200f'); const sx = R(r() * W); rc(sx, y, 1, ph, '#22130a'); rc(sx + 3, y + 4, 1, 1, '#1a0e07'); }
  const C = [[16, 30, 18, 0], [W - 16, 36, 13, 1.7]];
  C.forEach(([x, y, h, p]) => { const f = RM() ? 0 : Math.floor(t * 7 + p * 3) % 3; for (let k = 4; k >= 1; k--) disc(x, y + 2, k * 9 + (f === 1 ? 1 : 0), 'rgba(255,184,90,.06)'); });
  C.forEach(([x, y, h, p]) => candle(x, y, h, t, p));
  // inkwell and quill
  const ix = 18, iy = H - 30; disc(ix, iy, 7, OL); disc(ix, iy, 6, '#22344a'); disc(ix - 1, iy - 1, 4, '#30486a'); disc(ix, iy, 3, OL); disc(ix, iy, 2, '#06080c'); rc(ix - 3, iy - 4, 2, 1, '#8fb0d0');
  for (let i = 0; i <= 26; i++) { const qx = ix + 2 + i * .62, qy = iy - 2 - i * 1.1; if (i < 6) rc(qx, qy, 1, 1, '#d8c79c'); else { const w = i < 22 ? 2 : 1; rc(qx - w - 1, qy, w * 2 + 3, 1, OL); rc(qx - w, qy, w * 2 + 1, 1, '#ece4d0'); rc(qx + w, qy, 1, 1, '#b9b0a0'); } }
} };
function candle(x, y, h, t, p) {
  const f = RM() ? 0 : Math.floor(t * 7 + p * 3) % 3;
  rc(x - 8, y + h, 16, 4, OL); rc(x - 7, y + h, 14, 2, '#c99a4a'); rc(x - 7, y + h, 14, 1, '#f2c66a'); rc(x - 7, y + h + 2, 14, 1, '#7a5a26');
  rc(x - 4, y - 1, 8, h + 1, OL); rc(x - 3, y, 6, h, '#eadfc2'); rc(x + 1, y, 2, h, '#c8b48c'); rc(x - 3, y, 1, h, '#fff6dc'); rc(x - 1, y, 1, 4, '#fff6dc'); rc(x - 1, y + 4, 1, 1, '#d8cba8');
  rc(x, y - 2, 1, 2, '#2a1a10');
  const hh = [5, 6, 4][f], sw = [0, 1, 0][f];
  rc(x - 2 + sw * 0, y - 2 - hh, 4, hh, OL); rc(x - 1, y - 2 - hh, 3, hh - 1, '#ffb03a'); rc(x + sw, y - 3 - hh, 1, 2, '#ffb03a'); rc(x, y - hh, 1, hh - 3, '#ffe36a'); rc(x, y - 3, 1, 1, '#e8645a');
}

/* ================= the T4 sequence on the T1 tome ================= */
const DUR = 3.2;
let bits = [];
function seq(pt) {
  return { shake: pt < .95 ? R(Math.sin(pt * 60) * sm(.1, .9, pt) * 1.6) : 0, strain: pt < .95 ? sm(.1, .9, pt) * 1.5 : 0, chains: pt < .95,
    open: sm(1.0, 1.45, pt), rings: pt < 1.35 ? 0 : 1 + Math.floor((pt - 1.35) / .12), portal: sm(1.75, 2.3, pt), armP: sm(1.55, 2.25, pt), grip: sm(2.1, 2.5, pt) };
}
function snapBits(cx, cy, bw, bh) { const r = rng(99); bits = []; for (let i = 0; i < 26; i++) { const y = cy + (i % 2 ? .1 : -.1) * bh, x = cx - bw / 2 - 4 + r() * (bw + 8), a = Math.atan2(y - cy, x - cx) + (r() - .5);
  bits.push({ x, y, vx: Math.cos(a) * (30 + r() * 40), vy: Math.sin(a) * (30 + r() * 40) - 20, c: r() < .3 ? '#c9cdd6' : '#8a8f99' }); } }

function draw(t, pt) {
  const mode = phase === 'sheet' ? 'sheet' : 'rest', bw = Math.min(54, R(W * .42)), bh = R(bw * 1.32), cx = R(W / 2), cy = R(H * .5);
  const s = pt == null ? { open: 0, chains: true, strain: 0, rings: 0, portal: 0 } : seq(pt);
  const B = BG[cur]; B.back(t, mode, mode === 'sheet' ? null : { cx, cy, bw, bh, open: s.open });
  if (mode !== 'sheet') {
    book(cx, cy, bw, bh, s, t);
    if (pt != null && pt >= .95 && pt < 1.9) { const d = pt - .95; bits.forEach((b) => { const x = b.x + b.vx * d, y = b.y + b.vy * d + 60 * d * d; rc(x - 2, y - 2, 5, 4, OL); rc(x - 1, y - 1, 3, 2, '#8a8f99'); rc(x - 1, y - 1, 2, 1, '#c9cdd6'); }); }
  }
  if (B.front) B.front(t, mode);
  if (pt != null && s.armP > 0) { const L = H * .62 * s.armP;
    arm({ x: -6, y: H + 6, a: -1.05, len: L, r0: 10, r1: 1.2, bend: .25, curl: -(2.2 + 3 * s.grip), sw: .12, sp: 3, ph: 0 }, t, GREEN);
    arm({ x: -6, y: H + 6, a: -1.05, len: L, r0: 10, r1: 1.2, bend: .25, curl: -(2.2 + 3 * s.grip), sw: .12, sp: 3, ph: 1.5, mir: 1 }, t, GREEN); }
  vignette();
}


const CSS = '.gr-wrap{position:absolute;inset:0;z-index:60;overflow:hidden;background:#030404;cursor:pointer;touch-action:manipulation}' +
  '.gr-scene{position:absolute;inset:0;transform-origin:50% 50%}.gr-scene canvas{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges}' +
  '.gr-flash{position:absolute;inset:0;background:#5ef2a0;opacity:0;pointer-events:none}';
function css() { if (document.getElementById('grim-css')) return; const s = document.createElement('style'); s.id = 'grim-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
let busy = null;
function play(host) {
  if (busy) return busy;
  if (RM() || !host) return Promise.resolve();
  css();
  const wrap = document.createElement('div'); wrap.className = 'gr-wrap'; wrap.setAttribute('aria-label', 'The Grimoire opens');
  wrap.innerHTML = '<div class="gr-scene"><canvas aria-hidden="true"></canvas></div><div class="gr-flash"></div>';
  host.appendChild(wrap);
  const cv = wrap.querySelector('canvas'), scene = wrap.querySelector('.gr-scene'), flash = wrap.querySelector('.gr-flash'), r = wrap.getBoundingClientRect();
  W = Math.max(60, R(r.width / 3)); H = Math.max(100, R(r.height / 3)); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  phase = 'play';
  const bw = Math.min(54, R(W * .42)), bh = R(bw * 1.32); snapBits(R(W / 2), R(H * .5), bw, bh);
  const D = DUR * 1000, t0 = performance.now() / 1000, anims = [];
  anims.push(scene.animate([{ transform: 'none', offset: 0 }, { transform: 'none', offset: 2.45 / DUR }, { transform: 'scale(.8) translateY(-4%)', offset: 2.8 / DUR, easing: 'cubic-bezier(.6,0,.9,.4)' }, { transform: 'scale(6) translateY(0)' }], { duration: D, fill: 'forwards' }));
  anims.push(flash.animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: 2.85 / DUR }, { opacity: 1 }], { duration: D, fill: 'forwards' }));
  let raf = 0, last = '';
  const loop = (now) => { raf = requestAnimationFrame(loop); const ts = now / 1000, pt = Math.floor((ts - t0) * 24) / 24; if ('p' + pt === last) return; last = 'p' + pt; draw(ts, Math.min(pt, DUR)); };
  raf = requestAnimationFrame(loop);
  busy = new Promise((res) => {
    let over = false;
    const end = () => { if (over) return; over = true; clearTimeout(tm); cancelAnimationFrame(raf); res();
      // the flash fades off the sheet that has just opened under it
      wrap.style.pointerEvents = 'none'; scene.style.visibility = 'hidden'; anims.forEach((a) => a.cancel()); flash.style.opacity = 1;
      flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' }).finished.then(() => wrap.remove(), () => wrap.remove()); busy = null; };
    const tm = setTimeout(end, D - 60);
    wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); end(); });
    wrap.addEventListener('click', (e) => { e.stopPropagation(); });
  });
  return busy;
}
window.GRIM = { play };
})();
