/* Paper golems, the marking bosses (Patryk's final picks, 30 Oct): Crumple for Year 7 (round three, aged parchment),
   the round-two looks for every other year: Bookstack (Years 8-9), Red-pen Brute (10-11), Elder Scholar (12-13 books)
   and the PAG Scholar (12C and 13D practicals). The drawing is copied from replica/design/mockups/golems3/index.html.
   Each golem stands on the Elder Sign, the summoning circle the bosses use (copied from game-temple.js), and rises out
   of it when summoned. A sitting tears a chunk off with red ticks; beaten, it fades and the runes rise over a trophy.
   GOLEM.html(g, opts) -> a canvas tag. g = { id, look, theme, sittings, sitDone }. opts.rise: play the summoning;
   opts.beaten: the beaten look (trophies); opts.size: CSS px wide (default 128). GOLEM.paint(root) starts the canvases
   inside root; each stops by itself once it leaves the page. Reduced motion: one still frame. One global: window.GOLEM. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.GOLEM) return;
const RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const TAU = Math.PI * 2, W = 64, H = 58, OX = 8, OY = 2;   // the scene; the 48x48 golem sits at OX, OY
let T = 0;

/* ---------- from the mock-up ---------- */
function mk(cv, w, h, s) { cv.width = w * s; cv.height = h * s; const c = cv.getContext('2d', cv.dataset && cv.dataset.read ? { willReadFrequently: true } : undefined); c.imageSmoothingEnabled = false;
  const g = { c, s, w, h,
    r(x, y, ww, hh, col) { c.fillStyle = col; c.fillRect(Math.round(x) * s, Math.round(y) * s, Math.round(ww) * s, Math.round(hh) * s); },
    p(x, y, col) { this.r(x, y, 1, 1, col); },
    disc(cx, cy, rad, col, half) { for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) { if (x * x + y * y > rad * rad + rad * 0.6) continue; if (half === 'L' && x >= 0) continue; if (half === 'R' && x < 0) continue; this.p(cx + x, cy + y, col); } },
    txt(t, x, y, col, size, align) { c.fillStyle = col; c.font = '700 ' + (size * 1.2) + 'px system-ui,Segoe UI,sans-serif'; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillText(t, x * s, y * s); } };
  return g; }
function rnd(seed) { let x = seed * 9301 + 49297; return () => { x = (x * 9301 + 49297) % 233280; return x / 233280; }; }
function hash(x, y, k) { let h = (x * 374761393 + y * 668265263 + (k || 0) * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const THEMES = { coral: ['#ff7a6b', '#b8443c', '#ffc2b0'], ember: ['#ff9a3c', '#a8481a', '#ffd28a'], frost: ['#8fd8ff', '#3a7aa8', '#e0f6ff'], moss: ['#7fc85a', '#3e7a2a', '#cdf0a8'],
  ink: ['#5a6ad8', '#2a2f78', '#b8c0ff'], storm: ['#8a96a8', '#4a5262', '#d4dce8'], ash: ['#b0a89c', '#5e5850', '#e8e2d8'], gold: ['#e6c26a', '#9a7424', '#fff0b8'] };
const PAPER = '#efe6cf', PSH = '#cbbf9f', PLN = '#b4c4dc', INK = '#1b1410', RED = '#d8323a', BG = '#0c1513';
function eye(g, x, y, w, h) { g.r(x, y, w, h, '#1a1622'); g.r(x + 1, y - 1, w - 2, 1, '#1a1622'); g.r(x + 1, y + h, w - 2, 1, '#1a1622'); g.r(x + 1, y + 1, 2, 2, '#ffffff'); g.p(x + w - 2, y + h - 2, '#ffffff'); g.p(x + w - 2, y + h - 1, '#6a6a9a'); }
function ruled(g, x, y, w, h, test) { for (let yy = y + 2; yy < y + h; yy += 3) for (let xx = x; xx < x + w; xx++) if (!test || test(xx, yy)) g.p(xx, yy, PLN); }
const OUT = '#140c0a', TEN = '#2f5a52', TENL = '#4f8a78', SUCK = '#9ad8b8', MINT = '#5ef2a0', BLOT = '#1b1410';
function blot(g, x, y, big) { g.r(x, y, 2, 2, BLOT); g.p(x + 2, y + 1, BLOT); g.p(x - 1, y, BLOT); if (big) { g.r(x, y + 2, 1, 2, BLOT); g.p(x + 3, y - 1, BLOT); g.p(x - 2, y + 2, BLOT); } }
function tent(g, pts) { const n = pts.length; pts.forEach(([x, y], i) => { if (i < n * 0.55) { g.r(x, y, 2, 2, TEN); g.p(x, y, TENL); } else g.p(x, y, i % 2 ? TENL : TEN); if (i % 3 === 2) g.p(x + (i < n * 0.55 ? 1 : 0), y + (i < n * 0.55 ? 1 : 0), SUCK); }); }
function glowPx(g, x, y, a) { g.c.fillStyle = 'rgba(94,242,160,' + a + ')'; g.c.fillRect((x - 1) * g.s, (y - 1) * g.s, 3 * g.s, 3 * g.s); g.p(x, y, MINT); }
// g.tiny: in the boss arena the label is too small to read, so three ink lines stand for the writing
function pagCard(g, aged) { g.r(18, 26, 12, 9, aged ? '#efdcae' : '#fff8e6'); if (g.tiny) { g.r(20, 28, 8, 1, INK); g.r(20, 30, 6, 1, INK); g.r(20, 32, 7, 1, INK); } else g.txt('PAG', 24, 30.5, INK, 9, 'center'); if (aged) { g.p(29, 26, OUT); g.p(28, 26, '#6a4a2a'); g.p(29, 27, '#6a4a2a'); g.r(18, 33, 2, 2, BLOT); g.p(20, 34, BLOT); } }
const pulse = (k) => 0.55 + 0.45 * Math.sin(T * 2.2 + k);

const scholar = (g, th, b) => { for (let y = 0; y < 26; y++) { const w = 14 + Math.floor(y / 2.2); g.r(24 - w / 2, 20 + y, w, 1, y % 3 === 2 ? PLN : PAPER); }
  g.r(14, 20, 2, 26, PSH); g.r(22, 20, 4, 26, th[0]); g.r(23, 20, 2, 26, th[1]);
  g.r(18, 9 + b, 12, 11, PAPER); g.r(15, 6 + b, 18, 2, '#1a1a22'); g.r(18, 8 + b, 12, 2, '#2a2a36'); g.r(31, 7 + b, 1, 5, th[0]); g.r(30, 12 + b, 3, 2, th[2]);
  g.r(20, 12 + b, 3, 2, th[2]); g.r(25, 12 + b, 3, 2, th[2]);
  for (let k = 0; k < 5; k++) g.r(19 + k * 2, 16 + b, 1, 6 + (k % 2) * 3, PSH);
  g.r(39, 10, 2, 36, '#6a4a2a'); g.r(37, 6, 5, 5, PAPER); g.p(41, 5, PAPER); g.p(36, 7, PSH); g.r(34, 24, 6, 3, PAPER); };
const GOLEMS = {
  // Year 7: Crumple, the round-three look (aged parchment, outline, a faint sea-green glow)
  y7c: { name: 'Crumple', aged: true, bbox: [11, 14, 26, 24], glow: 0.07,
    draw(g, th, b) { const R = rnd(7), cx = 24, cy = 27 + b;
      for (let y = -13; y <= 13; y++) for (let x = -13; x <= 13; x++) { const d = Math.sqrt(x * x + y * y); if (d < 11.5 + R() * 1.8) g.p(cx + x, cy + y, (x + y) % 5 === 0 || (x - y) % 7 === 0 ? PSH : PAPER); }
      g.r(16, 38 + b, 3, 3, th[1]); g.r(29, 38 + b, 3, 3, th[1]);
      eye(g, 16, 21 + b, 7, 8); eye(g, 25, 21 + b, 7, 8); g.r(15, 31 + b, 3, 1, '#f2a0a0'); g.r(31, 31 + b, 3, 1, '#f2a0a0');
      g.r(22, 32 + b, 4, 2, '#7a2a2a'); g.r(23, 33 + b, 2, 1, '#ff9a9a');
      for (let k = 0; k < 12; k++) { g.p(8 + k, 40 + b - Math.floor(k / 1.4), th[0]); } g.p(19, 32 + b, '#ffd0a0'); g.p(7, 41 + b, INK);
      g.r(23, 12 + b, 2, 3, th[0]); g.r(25, 11 + b, 1, 2, th[2]); },
    under(g, th, b) { tent(g, [[35, 27 + b], [36, 26 + b], [37, 25 + b], [38, 23 + b], [39, 22 + b], [40, 21 + b], [40, 19 + b], [39, 18 + b], [38, 18 + b]]); },
    over(g, th, b) { blot(g, 31, 34 + b, false); g.p(33, 36 + b, BLOT); },
    post(g, th, b) { glowPx(g, 7, 41 + b, 0.25 * pulse(1)); },
    stains: [[17, 19, 2]] },
  // the round-two looks
  y89: { name: 'Bookstack', bbox: [13, 8, 22, 34],
    draw(g, th, b) { g.r(16, 40, 5, 6, th[1]); g.r(27, 40, 5, 6, th[1]);
      [[14, 30, 20, th[0]], [13, 24, 22, th[1]], [15, 18, 18, th[0]]].forEach(([x, y, w, c]) => { g.r(x, y + b, w, 6, c); g.r(x + w - 3, y + 1 + b, 3, 4, PAPER); g.r(x, y + 5 + b, w, 1, '#00000055'); });
      g.r(16, 7 + b, 16, 11, PAPER); g.r(16, 7 + b, 16, 1, PSH); g.p(16, 7 + b, BG); g.p(31, 7 + b, BG); g.r(23, 7 + b, 1, 11, PSH);
      g.r(18, 11 + b, 4, 3, '#1a1622'); g.r(26, 11 + b, 4, 3, '#1a1622'); g.p(18, 11 + b, '#fff'); g.p(26, 11 + b, '#fff'); g.r(21, 15 + b, 6, 1, INK);
      g.r(9, 20 + b, 4, 12, PAPER); g.r(9, 20 + b, 1, 12, PSH); g.r(35, 20 + b, 4, 12, PAPER); g.r(38, 20 + b, 1, 12, PSH); g.r(9, 31 + b, 4, 3, th[2]); g.r(35, 31 + b, 4, 3, th[2]); } },
  y1011: { name: 'Red-pen Brute', bbox: [10, 8, 28, 32],
    draw(g, th, b) { g.r(14, 40, 7, 6, PSH); g.r(27, 40, 7, 6, PSH);
      g.r(12, 14 + b, 24, 27, PSH); g.r(13, 13 + b, 22, 27, PAPER); ruled(g, 13, 15 + b, 22, 24);
      g.r(4, 12 + b, 11, 8, th[1]); g.r(5, 13 + b, 9, 6, th[0]); g.r(33, 12 + b, 11, 8, th[1]); g.r(34, 13 + b, 9, 6, th[0]);
      g.r(3, 20 + b, 7, 14, PAPER); g.r(3, 33 + b, 7, 5, PSH); g.r(38, 20 + b, 7, 14, PAPER); g.r(38, 33 + b, 7, 5, PSH);
      g.r(17, 6 + b, 14, 9, PSH); g.r(18, 7 + b, 12, 7, PAPER); g.r(19, 10 + b, 4, 1, th[2]); g.r(25, 10 + b, 4, 1, th[2]); g.r(19, 9 + b, 4, 1, th[0]); g.r(25, 9 + b, 4, 1, th[0]);
      for (let k = 0; k < 6; k++) { g.p(15 + k, 18 + k + b, '#a82a2a'); g.p(29 - k, 28 + k + b, '#a82a2a'); } for (let k = 0; k < 4; k++) g.p(38 + k, 24 + k + b, '#a82a2a'); } },
  y1213: { name: 'Elder Scholar', bbox: [12, 10, 24, 34], draw: scholar },
  pag: { name: 'PAG Scholar', pag: true, bbox: [12, 10, 24, 34],
    draw(g, th, b) { scholar(g, th, b);
      g.r(18, 10 + b, 12, 2, '#3a3a44'); g.r(19, 10 + b, 3, 2, '#8fd8ff'); g.r(26, 10 + b, 3, 2, '#8fd8ff');
      g.r(37, 4, 6, 8, '#2a2a2a'); g.r(38, 5, 4, 6, BG);
      g.r(4, 30, 2, 4, '#c8e8f0'); g.r(2, 34, 6, 2, '#c8e8f0'); g.r(1, 36, 8, 6, '#c8e8f0'); g.r(2, 37, 6, 4, th[0]); g.p(3 + Math.floor(T * 3) % 4, 36 - (Math.floor(T * 4) % 3), '#ffffff'); g.r(8, 32, 6, 2, PAPER);
      if (!g.noCard) pagCard(g); } } };   // the card and its label go on at 4x (frame)
const TEARS = [{ corner: 'tr', ticks: [[.2, .72], [.72, .66], [.45, .9]] }, { corner: 'bl', ticks: [[.62, .8], [.18, .62], [.85, .86]] }];
function tear(g, bb, corner, seed, b) { const [x, y, w, h] = bb; const R = rnd(seed), sz = Math.round(Math.min(w, h) * 0.38);
  for (let i = 0; i < sz; i++) { const len = sz - i + Math.floor(R() * 3) - 1; for (let j = 0; j < len; j++) {
    let px, py; if (corner === 'tr') { px = x + w - 1 - j; py = y + b + i; } else { px = x + j; py = y + h - 1 - i + b; } g.p(px, py, BG); }
    let ex, ey; if (corner === 'tr') { ex = x + w - 1 - len; ey = y + b + i; } else { ex = x + len; ey = y + h - 1 - i + b; } g.p(ex, ey, '#fff8e6'); } }
function tick(g, x, y) { [[0, 1], [1, 2], [2, 1], [3, 0], [4, -1], [5, -2]].forEach(([dx, dy]) => { g.p(x + dx, y + dy, RED); }); }
function scrap(g, corner) { const x = corner === 'tr' ? 40 : 3, y = corner === 'tr' ? 40 : 4; g.r(x, y, 5, 3, PAPER); g.r(x + 1, y + 3, 3, 1, PAPER); g.p(x + 4, y, BG); tick(g, x, y + 1); }
function damage(g, G, dmg, b) { for (let k = 0; k < Math.min(dmg, 2); k++) tear(g, G.bbox, TEARS[k].corner, k + 3, b);
  for (let k = 0; k < Math.min(dmg, 2); k++) { const [x, y, w, h] = G.bbox; TEARS[k].ticks.forEach(([fx, fy]) => tick(g, Math.round(x + fx * w) - 2, Math.round(y + fy * h) + b)); } }
function beatenOverlay(g) { const runes = 'ᚱᚢᚾᛖᛋ'; for (let i = 0; i < 5; i++) { const yy = (40 - ((T * 10 + i * 9) % 36)); g.txt(runes[i], 8 + i * 8, yy, '#e6c26a', 11, 'center'); }
  g.r(19, 38, 10, 7, '#2a2410'); g.r(20, 39, 8, 5, '#e6c26a'); g.r(23, 44, 2, 2, '#9a7424'); }
function bobFor(id, beaten) { return beaten ? 0 : Math.round(Math.sin(T * (id === 'y7c' ? 5 : 2.5)) * (id === 'y7c' ? 1 : 0.6)); }

/* the golem drawn on its own 48x48 layer (the mock-up's background colour made see-through, so the circle shows) */
const AGE = { [PAPER]: '#e6d4a8', [PSH]: '#b9a27a', [PLN]: '#9fa9b0', '#fff8e6': '#efdcae' };
const hex = (c) => c.toString(16).padStart(2, '0');
function layer(id, th, dmg, beaten, tiny) {
  const G = GOLEMS[id], b = bobFor(id, beaten), off = document.createElement('canvas'); off.dataset.read = '1';
  const o = mk(off, 48, 48, 1); o.noCard = !tiny; o.tiny = !!tiny;
  if (G.under && G.aged) G.under(o, th, b); G.draw(o, th, b); if (G.over && G.aged) G.over(o, th, b); damage(o, G, dmg, b);
  if (!G.aged) {   // round two: as drawn, with the paper scraps in the corners
    if (!beaten) for (let k = 0; k < Math.min(dmg, 2); k++) scrap(o, TEARS[k].corner);
    const im = o.c.getImageData(0, 0, 48, 48), d = im.data;
    for (let i = 0; i < d.length; i += 4) if ('#' + hex(d[i]) + hex(d[i + 1]) + hex(d[i + 2]) === BG) d[i + 3] = 0;
    o.c.putImageData(im, 0, 0); return off;
  }
  // round three (Crumple): age the paper, fray the edges, a dark outline and a faint green glow
  const d = o.c.getImageData(0, 0, 48, 48).data, col = new Array(48 * 48).fill(null);
  for (let i = 0; i < 48 * 48; i++) { if (d[i * 4 + 3] < 60) continue; const h = '#' + hex(d[i * 4]) + hex(d[i * 4 + 1]) + hex(d[i * 4 + 2]); if (h === BG) continue; col[i] = h; }
  const filled = (x, y) => x >= 0 && y >= 0 && x < 48 && y < 48 && col[y * 48 + x] !== null, isPaper = (c) => c === PAPER || c === PSH || c === PLN, kill = [];
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const c = col[y * 48 + x]; if (!c || !isPaper(c)) continue;
    const edge = !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1); if (edge && hash(x, y - b, id.length) < 0.14) kill.push(y * 48 + x); }
  kill.forEach((i) => { col[i] = null; });
  const out = document.createElement('canvas'), g = mk(out, 48, 48, 1), ga = G.glow * (0.7 + 0.3 * Math.sin(T * 1.6));
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { if (filled(x, y)) continue; let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { if (Math.abs(dx) + Math.abs(dy) > 3) continue; if (filled(x + dx, y + dy)) { near = true; break; } }
    if (near) { g.c.fillStyle = 'rgba(94,242,160,' + ga.toFixed(3) + ')'; g.c.fillRect(x, y, 1, 1); } }
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { if (filled(x, y)) continue; if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) g.p(x, y, OUT); }
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const c = col[y * 48 + x]; if (!c) continue; let o2 = AGE[c] || c;
    if (AGE[c]) { const n = hash(x, y - b, 7); if (c === PAPER && n < 0.18) o2 = '#dcc79a';
      (G.stains || []).forEach(([sx, sy, r]) => { const dd = Math.hypot(x - sx, y - b - sy); if (dd < r) o2 = c === PLN ? '#a89c80' : '#d6bd8a'; else if (dd < r + 1 && c !== PLN) o2 = '#c4a46c'; }); }
    g.p(x, y, o2);
    if (!AGE[c] && hash(x, y - b, 11) < 0.035) { g.c.fillStyle = 'rgba(20,12,10,.2)'; g.c.fillRect(x, y, 1, 1); } }
  if (G.post) G.post(g, th, b);
  if (!beaten) for (let k = 0; k < Math.min(dmg, 2); k++) { const x = TEARS[k].corner === 'tr' ? 40 : 3, y = TEARS[k].corner === 'tr' ? 40 : 4;
    g.r(x - 1, y - 1, 7, 6, OUT); g.r(x, y, 5, 3, '#e6d4a8'); g.r(x + 1, y + 3, 3, 1, '#e6d4a8'); g.p(x + 4, y, OUT); tick(g, x, y + 1); }
  return out;
}

/* ---------- the summoning circle: circle B Elder Sign, copied from game-temple.js ---------- */
const C = { hi: '#e0fff0', mid: '#5ef2a0', lo: '#1d6a48' };
const GS = [
  ['.xx..', 'x..x.', 'x.x..', '.x...', '..x..', '.x.x.', 'x...x'], ['x...x', '.x.x.', '..x..', '.xxx.', 'x.x.x', '..x..', '.x...'],
  ['..x..', '.x.x.', '.x...', '..xx.', '....x', '.x..x', '..xx.'], ['xx.xx', '..x..', '.x.x.', 'x...x', '.x.x.', '..x..', '..x..'],
  ['.xxx.', 'x...x', 'x.x.x', 'x..x.', '.x...', '..x..', '...x.'], ['x.x.x', '.xxx.', '..x..', '..x..', '.x.x.', 'x...x', '.x.x.']];
const lerp = (a, b, t) => a + (b - a) * t;
function glyph(x, Gl, cx, cy, a) { const h = Gl.length, w = Gl[0].length, ox = Math.round(cx - w / 2), oy = Math.round(cy - h / 2);
  x.globalAlpha = 1; x.fillStyle = '#0a0d0e'; x.fillRect(ox - 1, oy, w + 2, h); x.fillRect(ox, oy - 1, w, h + 2);
  x.globalAlpha = a; x.fillStyle = '#080406';
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (Gl[j][i] === 'x') { x.fillRect(ox + i - 1, oy + j, 1, 1); x.fillRect(ox + i + 1, oy + j, 1, 1); x.fillRect(ox + i, oy + j + 1, 1, 1); }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (Gl[j][i] === 'x') { x.fillStyle = j < h * .55 ? C.hi : C.mid; x.fillRect(ox + i, oy + j, 1, 1); }
  x.globalAlpha = 1; }
function ringPx(x, g, r, col) { const n = Math.ceil(TAU * r * g.R * 1.15); x.fillStyle = col;
  for (let i = 0; i < n; i++) { const a = i / n * TAU; x.fillRect(Math.round(g.cx + Math.cos(a) * r * g.R), Math.round(g.cy + Math.sin(a) * r * g.R * g.sq), 1, 1); } }
function groove(x, g, r, col) { ringPx(x, { cx: g.cx, cy: g.cy + 1, R: g.R, sq: g.sq }, r, '#06090a'); ringPx(x, g, r, col); }
function lineF(x, g, u0, v0, u1, v1, col) { const x0 = g.cx + u0 * g.R, y0 = g.cy + v0 * g.R * g.sq, x1 = g.cx + u1 * g.R, y1 = g.cy + v1 * g.R * g.sq, n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1;
  for (let i = 0; i <= n; i++) { const t = i / n, px = Math.round(lerp(x0, x1, t)), py = Math.round(lerp(y0, y1, t)); x.fillStyle = '#06090a'; x.fillRect(px, py + 1, 1, 1); x.fillStyle = col; x.fillRect(px, py, 1, 1); } }
function elderSign(fl, g, t) {
  groove(fl, g, 1, C.mid); groove(fl, g, .95, C.lo); groove(fl, g, .66, C.mid);
  const r0 = -t * .08, S = .9;
  for (let k = 0; k < 5; k++) { const a = r0 + k * TAU / 5 - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    lineF(fl, g, ca * .1, sa * .1, ca * .52 * S, sa * .52 * S, C.hi);
    [[.24, .14, .7], [.38, .1, .6]].forEach(([at, len, sp]) => { [-1, 1].forEach((sd) => { const b = a + sd * sp; lineF(fl, g, ca * at * S, sa * at * S, ca * at * S + Math.cos(b) * len * S, sa * at * S + Math.sin(b) * len * S, C.mid); }); });
    [-1, 1].forEach((sd) => { const b = a + sd * .5; lineF(fl, g, ca * .52 * S, sa * .52 * S, ca * .52 * S + Math.cos(b) * .06, sa * .52 * S + Math.sin(b) * .06, C.hi); }); }
  groove(fl, g, .1, C.hi); fl.fillStyle = C.hi; fl.fillRect(g.cx, g.cy, 1, 1);
  const list = []; for (let k = 0; k < 9; k++) list.push({ G: GS[k % GS.length], r: .82, a: k * TAU / 9 + t * .2 });
  list.sort((p, q) => Math.sin(p.a) - Math.sin(q.a)).forEach((p) => { const sn = Math.sin(p.a); glyph(fl, p.G, g.cx + Math.cos(p.a) * p.r * g.R, g.cy + sn * p.r * g.R * g.sq, .62 + .38 * (sn + 1) / 2); });
}

/* ---------- one scene: the floor, the circle, the golem (rising out of it when summoned) ---------- */
const RISE = 1600;
// the scene is drawn at 1 pixel per art pixel, then shown 4x on the card (the mock-up's scale), where the lettering goes:
// the PAG label and the runes over a beaten golem are written at that 4x size, as in the mock-up
const SC = 4;
function at4(x, ox, oy) { return { c: x, s: SC, r(a, b, w, h, col) { x.fillStyle = col; x.fillRect((Math.round(a) + ox) * SC, (Math.round(b) + oy) * SC, Math.round(w) * SC, Math.round(h) * SC); }, p(a, b, col) { this.r(a, b, 1, 1, col); },
  txt(t, a, b, col, size, align) { x.fillStyle = col; x.font = '700 ' + (size * 1.2) + 'px system-ui,Segoe UI,sans-serif'; x.textAlign = align || 'left'; x.textBaseline = 'middle'; x.fillText(t, (a + ox) * SC, (b + oy) * SC); } }; }
function frame(el, now) {
  const st = el._gm; T = RM ? 0 : now / 1000;
  const th = THEMES[st.theme] || THEMES[{ y7c: 'gold', y89: 'moss', y1011: 'ember', y1213: 'ink', pag: 'storm' }[st.look]] || THEMES.gold;
  const sc = st.sc || (st.sc = document.createElement('canvas')); sc.width = W; sc.height = H;
  const x = sc.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = BG; x.fillRect(0, 0, W, H);
  for (let i = 0; i < W; i += 2) { x.fillStyle = '#1a2a26'; x.fillRect(i, 48, 1, 1); }
  const cg = { cx: 32, cy: 51, R: 27, sq: .22 }, p = st.rise === -1 ? 0 : st.rise ? Math.min(1, (now - st.rise) / RISE) : 1;   // -1: summoned, waiting to be seen
  if (!st.beaten) { x.globalAlpha = st.rise && p < 1 ? 1 : .55 + .2 * Math.sin(T * 1.4); elderSign(x, cg, T); x.globalAlpha = 1; }
  const rising = st.rise && p < 1, up = rising ? Math.round(Math.pow(1 - p, 3) * 46) : 0;
  if (rising) { x.save(); x.beginPath(); x.rect(0, 0, W, 49); x.clip(); }   // the golem climbs out of the circle, from the floor line up
  if (st.beaten) x.globalAlpha = .35;
  x.drawImage(layer(st.look, th, st.dmg, st.beaten), OX, OY + up); x.globalAlpha = 1;
  if (rising) { x.restore(); x.globalAlpha = (1 - p) * .55; x.fillStyle = '#5ef2a0'; x.fillRect(4, 44, W - 8, 10); x.globalAlpha = 1; }
  const m = st.ctx; m.imageSmoothingEnabled = false; m.clearRect(0, 0, W * SC, H * SC); m.drawImage(sc, 0, 0, W * SC, H * SC);
  if (st.look === 'pag' && !rising) { if (st.beaten) m.globalAlpha = .35; pagCard(at4(m, OX, OY)); m.globalAlpha = 1; }
  if (st.beaten) beatenOverlay(at4(m, OX, OY));
  return rising;
}
const LIVE = new Set(); let running = false, last = 0;
function loop(now) {
  LIVE.forEach((el) => { if (!el.isConnected) LIVE.delete(el); });
  if (!LIVE.size || document.hidden) { running = false; return; }
  const busy = [...LIVE].some((el) => el._gm.vis !== false && el._gm.rise > 0 && now - el._gm.rise < RISE);
  if (busy || now - last > 90) { last = now; LIVE.forEach((el) => { if (el._gm.vis !== false) frame(el, now); }); }   // the mock-up's pace: about 11 frames a second
  requestAnimationFrame(loop);
}
function kick() { if (!running && !RM) { running = true; requestAnimationFrame(loop); } }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', kick);
// a golem summoned out of sight rises from its circle the first time it comes into view
const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => es.forEach((e) => { const st = e.target._gm; if (!st) return; st.vis = e.isIntersecting; if (st.vis && st.rise === -1) st.rise = performance.now(); if (st.vis) kick(); }), { rootMargin: '0px' }) : null;

function html(g, opts) {
  opts = opts || {}; const n = Math.max(1, Number(g.sittings) || 1), done = Number(g.sitDone) || 0, beaten = !!opts.beaten || done >= n;
  const dmg = beaten ? 2 : done > 0 ? (n === 2 ? done : 1) : 0, w = opts.size || 128;
  return '<canvas class="gm-cv" width="' + W * SC + '" height="' + H * SC + '" style="width:' + w + 'px;height:' + Math.round(w * H / W) + 'px;image-rendering:pixelated" data-gm-look="' + (GOLEMS[g.look] ? g.look : 'y89') + '" data-gm-theme="' + (THEMES[g.theme] ? g.theme : '') + '" data-gm-dmg="' + dmg + '"' +
    (beaten ? ' data-gm-beaten="1"' : '') + (opts.rise ? ' data-gm-rise="1"' : '') + ' role="img" aria-label="' + (GOLEMS[g.look] || GOLEMS.y89).name + (beaten ? ', beaten' : dmg ? ', torn' : '') + '"></canvas>';
}
function paint(root) {
  if (typeof document === 'undefined') return;
  (root || document).querySelectorAll('canvas.gm-cv').forEach((el) => {
    const want = [el.dataset.gmLook, el.dataset.gmTheme, el.dataset.gmDmg, el.dataset.gmBeaten].join('|');
    if (el._gm && el._gm.key === want) return;
    const rise = el.dataset.gmRise && !RM && io ? -1 : 0; el.removeAttribute('data-gm-rise');
    el._gm = { key: want, ctx: el.getContext('2d'), look: el.dataset.gmLook, theme: el.dataset.gmTheme, dmg: Number(el.dataset.gmDmg) || 0, beaten: !!el.dataset.gmBeaten, rise, vis: true };
    el._gm.ctx.imageSmoothingEnabled = false;
    frame(el, performance.now()); LIVE.add(el); if (io) io.observe(el);
  });
  kick();
}
// a sitting just done: the golem shudders and a red flash crosses it (the new tear is drawn by the next paint)
function hit(el) { if (!el || RM || !el.animate) return; el.animate([{ transform: 'translate(0,0)', filter: 'none' }, { transform: 'translate(-4px,1px)', filter: 'drop-shadow(0 0 6px #d8323a)' }, { transform: 'translate(4px,-1px)' }, { transform: 'translate(-2px,0)' }, { transform: 'translate(0,0)', filter: 'none' }], { duration: 360 }); }
// the golem as the creature in the bosses' temple arena (game-temple.js): k = 'gm:look:theme:tears'. Its own bob and
// glow keep moving (redrawn about 11 times a second); the box is cropped to the golem so it stands on the arena floor.
function sprite(k) {
  const m = /^gm:(\w+):(\w*):(\d)$/.exec(k) || [], look = GOLEMS[m[1]] ? m[1] : 'y89', th = THEMES[m[2]] || THEMES[{ y7c: 'gold', y89: 'moss', y1011: 'ember', y1213: 'ink', pag: 'storm' }[look]], dmg = Number(m[3]) || 0;
  T = 0; const first = layer(look, th, dmg, false, true), d = first.getContext('2d').getImageData(0, 0, 48, 48).data;
  let x0 = 48, y0 = 48, x1 = 0, y1 = 0;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (d[(y * 48 + x) * 4 + 3] > 10) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < x0) { x0 = 0; y0 = 0; x1 = 47; y1 = 47; }
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 2); x1 = Math.min(47, x1 + 1); y1 = Math.min(47, y1 + 1);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, img = document.createElement('canvas'); img.width = w; img.height = h;
  const ix = img.getContext('2d'); ix.drawImage(first, x0, y0, w, h, 0, 0, w, h);
  const px = [], q = ix.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (q[i + 3] > 10) px.push({ x, y, c: [q[i], q[i + 1], q[i + 2]] }); }
  let last = 0;
  const o = { k, img, w, h, px, ready: null, update(now) { if (RM || now - last < 90) return; last = now; T = now / 1000;
    const L = layer(look, th, dmg, false, true); ix.clearRect(0, 0, w, h); ix.drawImage(L, x0, y0, w, h, 0, 0, w, h); } };
  o.ready = Promise.resolve(o);
  return o;
}
window.GOLEM = { html, sprite, paint, hit, themes: THEMES, names: Object.fromEntries(Object.keys(GOLEMS).map((k) => [k, GOLEMS[k].name])) };
})();
