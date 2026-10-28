/* High Vespers (Patryk 2026-10-28, "High Vespers FINAL" in replica/design/habits-v2-decisions.md, mock-up in
   replica/design/mockups/highvespers/): Ulhu's weekly review, Sunday to Tuesday night. Replaces the old Sunday review card.
   Sections in his order: Last Week's Vow (LC2d: brown R2 rings, red W9 wax with the F9 face for every answer, the
   answer word pressed into the rim, the brass stamp presses it), The Week in Glass (WG1 glass with WG1d's totals and
   dot list, plus the new aims panes from "Visual grill, 28 Oct" part 5), Who You Are Becoming (WB1 one glass piece per
   vote), Rituals That Grew (RG13 pillars), Rituals That Slipped (RS13), Where the Curses Came From (CC1a + CC1a3, no key
   above the grid), Absolutions Won (AW4c, "Absolved"), Your Three Lines (TL1).

   API
   HIGHV.html(high, review, opts) -> the whole screen's HTML. high = D.high (gHighVespers_), review = D.review (gReviewCard_).
     opts.attrs = { answer, seal, pane, field }: the app's data-a hooks.
       answer: data-a on the three seals, data-v = 'Yes' | 'Partly' | 'No' (what gameReview stores as kept);
       seal:   data-a on the "Seal the week" button;
       pane:   data-a on every pane that opens (days, curse cells, aim panes), data-v = the pane id;
       field:  name of the data- attribute on the three text boxes (default 'hv': data-hv="wentWell|slipped|change").
     opts.values = { wentWell, slipped, change, kept } to show (else what was typed here, else what was saved).
     opts.ulhu = image src (or mood -> src); default window.ULHU_ART.b8. opts.line = Ulhu's line in Who You Are Becoming.
     opts.reward = runes shown on the seal button (default 20; 0 hides it).
   HIGHV.answer(key, value) animates the seal for an answer (key 'kept', value 'Yes' | 'Partly' | 'No') and remembers it.
   HIGHV.paint(root) draws the wax, stamp and rings (cached after the first time) and wires the local taps
     (panes show their numbers, typing is remembered). Cheap to call after every repaint.
   HIGHV.open(id, root) opens a pane by id (the module does this itself on a tap; the app may call it too).
   HIGHV.values(root) -> { week, wentWell, slipped, change, kept, p1, p2, p3 }: ready for gameReview
     (p1-p3 are passed through from review.saved so sealing High Vespers keeps the old priorities).
   No server calls in here: the app calls gameReview.

   Data read from D.high: week, saved{wentWell,slipped,change}, lastChange{change,kept}, days[{day,bless,curse,rituals,frozen}],
   who[{who,votes}], grew[{name,kept,due,streak}], slipped[{name,kept,due}], grid[7][5], slots, sigs[{name,n}],
   details[{name,n}], absolutions{n,hp}. Optional, used when present: ritual entries (grew, slipped, high.rituals) with
   aim{type:'avg'|'count',target,floor}, minutes (average a day), count (full sessions), nights[7] (Mon..Sun: streak
   number, 'miss', 'rest' or null); curse entries (high.curses) with {name,count,ceiling}; days[i].due, .blessings[],
   .curses[{name,at}]; high.gridSig[7][5] (sigil per cell); absolutions.list[{curse,day,by,full,hp}].
   All CSS classes start with hv-. */
(function () {
'use strict';
if (window.HIGHV) return;

const RM = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f1 = (v) => (+v).toFixed(1);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const num = (v) => (Number(v) || 0);
let UID = 0; const uid = () => 'hv' + (++UID);
const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mixc = (a, b, t) => { const x = hx(a), y = hx(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const STOPS = [[1, '#ff6a2a'], [7, '#ffc040'], [21, '#6ab8ff'], [45, '#5adcd0'], [66, '#5ef2a0']];
const sCol = (n) => { n = Math.max(1, n || 1); if (n >= 66) return '#5ef2a0'; for (let i = 1; i < STOPS.length; i++) if (n <= STOPS[i][0]) return mixc(STOPS[i - 1][1], STOPS[i][1], (n - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0])); return '#5ef2a0'; };
const LV = ['x1', 'x1.1', 'x1.25', 'x1.5'], STEPN = [7, 30, 66];
const lvlOf = (n) => (n >= 66 ? 3 : n >= 30 ? 2 : n >= 7 ? 1 : 0);
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const icon = (s) => (window.BLOOD && BLOOD.icons && BLOOD.icons[s]) || '';

/* ---------- module state: kept across the app's repaints, reset when the week changes ---------- */
const ST = { week: null, vals: {}, open: { d: null, c: null, a: null }, high: null, review: null, attrs: {}, root: null };

/* ================= seeded randomness, noise, blur (as game-stone.js) ================= */
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function xrng(seed) { let s = (seed * 2654435761) >>> 0 || 12345; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function noiseTile(size, cells, oct, seed) {
  const out = new Float32Array(size * size), r = mulberry(seed); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const c = cells << o, g = new Float32Array(c * c); for (let i = 0; i < g.length; i++) g[i] = r();
    const step = size / c;
    for (let y = 0; y < size; y++) { const fy = y / step, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty), y0 = (iy % c) * c, y1 = ((iy + 1) % c) * c;
      for (let x = 0; x < size; x++) { const fx = x / step, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx), x0 = ix % c, x1 = (ix + 1) % c;
        const a = g[y0 + x0], b = g[y0 + x1], cc = g[y1 + x0], d = g[y1 + x1], top = a + (b - a) * sx, bot = cc + (d - cc) * sx;
        out[y * size + x] += amp * (top + (bot - top) * sy); } }
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
let N1 = null, N2 = null; const noise = () => { if (!N1) { N1 = noiseTile(256, 4, 5, 11); N2 = noiseTile(256, 8, 4, 23); } };
const s1 = (x, y) => N1[((y | 0) & 255) * 256 + ((x | 0) & 255)];
const s2 = (x, y) => N2[((y | 0) & 255) * 256 + ((x | 0) & 255)];
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), d = 2 * r + 1;
  for (let y = 0; y < h; y++) { const o = y * w; let acc = 0; for (let x = -r; x <= r; x++) acc += src[o + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { tmp[o + x] = acc / d; acc += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { out[y * w + x] = acc / d; acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
  return out;
}
const blur2 = (a, w, h, r) => boxBlur(boxBlur(a, w, h, r), w, h, r);
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };

/* ================= the quest wax seal (from the mock-up's seal.js: W9 gold-flecked wax, F9 Ulhu in the pentagram,
   the original wooden-knob brass stamp, the inked R2 ring), trimmed to what High Vespers uses ================= */
const HEAD = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAEw0lEQVR4nMVYvW8cRRR/s7IEuWBFB+fElvfcEIt0GDc0FIn/hti4SUjrS5MCKUIgh1BAilSRcm5c8CEkFCV9oEj4KAJFFlCKODlbAmfBZ2x0CsaxU8CgNzNv983szt7exSG/aDK3Ox/vN7/3Zt6sAZ4CzjbPyI/vX5J7MVcAe4yzC2cSYntBUvQzqPHBnASP6cGh51S9tfEYmucW+pr/iRRU5EqgeW5BNN4v17cIpVZ4+vyclKbr7OmTeqDEZwn0Hn+3dx7B8L6KqferGt8nliTAzNiU2FMFG4ocwOX5D50WLo6E9s4OI1eBdUUu2/3K6o2eVBVFxLC+PP+Rem7/+7cxoudvdX5L+lrkKvu0colwRmllSQCo5erfM2PHuqopypD7bnMJxquhabUJthO3GpK727xbGgDckqNhkdsDHzlN7B60/9mC8epo0t7q/K4KWm7v8phD5ba1cUYgeeSkHDpFbg/yyOH42cYpKIK9ISpmQ3RBHyRzN8mbjbdAqP2Zjml1YlX0htiG4ecr0H7UnRzGoI5DRhL9zUJAFJAc4MrNKmKZEOlDOaFmyQ+s4n3x7cb38ouFT6E531QdB3jM0QIRb9Ret94M10KrA4pw9cFNjxmZ/D9dP5rTYtPFeTjto6eO426XeNgHNALVK0ZW1+P1Y9Ar8vTj85BnKE0GfIRwt54ECMPXWKuEsD6hSj3UJQMeVAxhOKEKdaHxYfiqKnzz87AJaCNYczoGNMknS6vSeY7jn/KNORigUM6YN+PofTg6od7F8c+JEhzpTk3jz27XwLFEDutRNZeAaPmeNZ4Q9KSMdFefjySbeZC3QDMyo2qADxSQ5HusKSaSkDI/UEmlZiZjSP3PIud3H8VkGrL25SMhqO5t5+eke755fS6cBuGj4DR4VS2WW2USJInTre+igkIl/jSk6ODjtmU2xwqhS/IoVSm7EF9z0H0x5orE/VwCso8OeTMP+EaKQncJLpaG63nnmeI57eC0JxNmdrGLEgqVvLTLLs8uNuOO39RfFz+xpLs+U/fMSpuFrMpMK1fLPTik0/Dj8pKqN+IODIVVeCfaby2p+Jskd8m+I7hYJetUcjoROaztEWz2Xj9mMhL1AZziy69vQS2sKvdiTbgw1TCXhWeIX1fWLHIUgzwWM+F+5cGN3L8aRCZWJg8fyb3URqxdT0z5QfekXDt5+BVVr66swZ/wULm1NpqSQyyefFd4j5mZ+pTwkYTSXhWFrYqcNOTqKTlOjJDrYiTZlQM7tkWmhTIz56u3CZIbe3lEkwur0IpWveS8BMuS6w7j3pZ2b00cUOSQJJGrHnwBFk/kkysk6H5MT44fUQXPrWhlCabdj22RP07HprTIbcqHity1ty+IxRPvFa61UMG8L37+F4Jp3i794zDGOLn7hlyR7VIEyRg3iDmW51lpvqAzMMFJRwjFHir34sHBMtzKESyDaPlubkxSrJGCP3xzB6qHBqHzx1bpuXNuMz7Y917KPNHy3eQ9nv4Xb34ukcxXJkNQRjjw2SU5Eg7BL7fbUP2/FUQQEYo1zK388B0Ja7AWb6pd24uCPRB0PkI8d9dVds5xrMcbMBK+pMg9NQWjlk5nLrhSpCCCK3UorMGt23cUuV4U/A++dmVyHC+HHAAAAABJRU5ErkJggg==';
const S_SIZE = 220, SB = 176, RS = SB * .285;
const WAX = [92, 6, 14];   // the dark red of LC2d's "Broken" seal, now the wax for every answer
const W9 = { code: 'W9', depth: 1.1, lob: 1, drips: 1, dripL: .8, gloss: 30, spec: 1, R0: .43, lip: .2 };
const MAT = { wood: { c: [150, 92, 46], sp: .3, ex: 14 }, brass: { c: [196, 148, 62], sp: 1.3, ex: 36, metal: 1 } };
let HEADIMG = null, FM = null;
const ART = { seal: '', pool: '', stamp: '', ring: '', busy: null };
function faceMaps() {
  if (FM) return FM; const S = S_SIZE, u = RS * .9;
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.translate(S / 2, S / 2); g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round'; return [c, g]; };
  const [ca, A] = mk(), [cc, C] = mk();
  A.lineWidth = .07 * u; A.beginPath(); A.arc(0, 0, .88 * u, 0, 7); A.stroke();
  A.lineWidth = .05 * u; A.beginPath(); [0, 2, 4, 1, 3, 0].forEach((k, i) => { const a = -Math.PI / 2 + k * 1.2566, x = Math.cos(a) * .84 * u, y = Math.sin(a) * .84 * u; if (i) A.lineTo(x, y); else A.moveTo(x, y); }); A.stroke();
  const sprite = (g, cutOnly) => { const c2 = document.createElement('canvas'); c2.width = c2.height = S; const g2 = c2.getContext('2d'); g2.imageSmoothingEnabled = false;
    const bh = RS * 1.7 * .62, bw = bh * HEADIMG.width / HEADIMG.height; g2.drawImage(HEADIMG, S / 2 - bw / 2, S / 2 - bh / 2 + .04 * u, bw, bh);
    if (cutOnly) { const im = g2.getImageData(0, 0, S, S), d = im.data; for (let i = 0; i < d.length; i += 4) { const l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255; d[i + 3] = d[i + 3] && l < .25 ? 255 : 0; } g2.putImageData(im, 0, 0); }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c2, 0, 0); g.restore(); };
  sprite(A, false); sprite(C, true);
  const ad = ca.getContext('2d').getImageData(0, 0, S, S).data, cd = cc.getContext('2d').getImageData(0, 0, S, S).data, rel = new Float32Array(S * S), cut = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) { rel[i] = ad[i * 4 + 3] / 255; cut[i] = cd[i * 4 + 3] / 255; }
  FM = { relB: blur2(rel, S, S, 1), relD: blur2(rel, S, S, 3), eyeB: blur2(cut, S, S, 1) };
  return FM;
}
const faceH = (i, depth) => (FM.relB[i] * .24 + FM.relD[i] * .4 - FM.eyeB[i] * .36) * depth;
function makeSeal(col) {
  noise(); faceMaps(); const w = W9, S = S_SIZE, Rs = RS;
  const rng = mulberry(hashStr(w.code)), lob = []; for (let k = 0; k < 6; k++) lob.push([rng() * 6.28, 2 + Math.floor(rng() * 6), (.015 + rng() * .035) * w.lob]);
  const drips = []; for (let k = 0; k < w.drips; k++) drips.push([Math.PI / 2 + (rng() - .5) * 2.2, (.04 + rng() * .05) * w.dripL]);
  const R0 = SB * w.R0, Hm = new Float32Array(S * S), Hp = new Float32Array(S * S), Am = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, dx = x + .5 - S / 2, dy = y + .5 - S / 2, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    let rb = 1; lob.forEach(([p, f, a]) => { rb += a * Math.sin(f * th + p); });
    drips.forEach(([p, a]) => { let dd = Math.abs(th - p); if (dd > Math.PI) dd = 6.283 - dd; rb += a * Math.exp(-dd * dd / .012); });
    rb *= R0; const a = clamp(rb - d + .5, 0, 1); if (a <= 0) continue;
    const pool = Math.sqrt(clamp((rb - d) / (SB * .085), 0, 1)) * .82; let h = pool;
    if (d < Rs) h = .3 + faceH(i, w.depth) - (1 - d / Rs) * .03;
    const lp = (d - Rs - SB * .022) / (SB * .02); h += w.lip * Math.exp(-lp * lp);
    const nz = (s2(x * 1.6 + 30, y * 1.6) - .5) * .05;
    Hm[i] = h + nz; Hp[i] = pool * .95 + .1 * Math.max(0, 1 - d / R0) + nz; Am[i] = a;
  }
  const L = norm3([-.5, -.66, .56]), Hv = norm3([L[0], L[1], L[2] + 1]);
  const light = (Hsrc) => { const Hs = blur2(Hsrc, S, S, 1), Hbig = blur2(Hsrc, S, S, 5), c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S), D = img.data;
    for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) { const i = y * S + x; if (Am[i] <= 0) continue;
      const gx = (Hs[i + 1] - Hs[i - 1]) * S * .1, gy = (Hs[i + S] - Hs[i - S]) * S * .1, n = norm3([-gx, -gy, 1]);
      const dif = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]), sp = Math.pow(Math.max(0, n[0] * Hv[0] + n[1] * Hv[1] + n[2] * Hv[2]), w.gloss) * w.spec;
      const ao = clamp((Hbig[i] - Hs[i]) * 3.2, 0, 1), d = Math.hypot(x - S / 2, y - S / 2), thin = d > Rs * 1.15 ? clamp(1 - Hs[i] / .32, 0, 1) : 0;
      const mot = 1 + (s1(x * 1.3, y * 1.3) - .5) * .25, k = mot * (.3 + .95 * dif) * (1 - ao * .6);
      let R = col[0] * k + thin * 80 + sp * 250, G = col[1] * k + thin * 14 + sp * 215, B = col[2] * k + thin * 4 + sp * 205;
      B -= sp * 120; G -= sp * 25; const hh = ((x * 73856093 ^ y * 19349663) >>> 0) % 1000; if (hh < 14) { R += 130 * (.4 + dif); G += 95 * (.4 + dif); B += 25; }   // gold flecks
      const j = i * 4; D[j] = R; D[j + 1] = G; D[j + 2] = B; D[j + 3] = Am[i] * 255; }
    g.putImageData(img, 0, 0); return c.toDataURL(); };
  return { seal: light(Hm), pool: light(Hp) };
}
function stampTop() {
  noise(); const KR = 17, S = 88, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S), D = img.data, cx = S / 2;
  const L = norm3([-.5, -.55, .67]), Hv = norm3([L[0], L[1], L[2] + 1]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + .5 - cx, dy = y + .5 - cx, d = Math.hypot(dx, dy) || .01, a = clamp(41.5 - d + .5, 0, 1); if (a <= 0) continue;
    let n, M, col;
    if (d < KR) { const t = d / KR, nz = Math.sqrt(1 - t * t); n = [dx / KR, dy / KR, nz]; M = MAT.wood; col = M.c.slice(); const ang = Math.atan2(dy, dx);
      const ring = Math.sin(d * 1.3 + s2(ang * 8 + 20, d * 2) * 5); col = col.map((v) => v * (.85 + .15 * ring));
      if (Math.abs((((ang - .7) % 6.283) + 6.283) % 6.283 - 3.1416) > 3.07 && d > 5) col = col.map((v) => v * .4); }
    else if (d < KR + 8.5) { const t = clamp((d - KR - 4.2) / 4.3, -1, 1), nz = Math.sqrt(Math.max(0, 1 - t * t)); n = [dx / d * t, dy / d * t, nz + .05]; M = MAT.brass; col = M.c.slice(); }
    else { const t = clamp((d - 34) / 7.5, 0, 1); n = [dx / d * t * .9, dy / d * t * .9, 1]; M = MAT.brass; col = M.c.slice(); if (Math.abs(d - 29) < .7) col = col.map((v) => v * .55); }
    n = norm3(n); const dif = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]); let sp = Math.pow(Math.max(0, n[0] * Hv[0] + n[1] * Hv[1] + n[2] * Hv[2]), M.ex) * M.sp, k = .25 + .9 * dif;
    if (M.metal) { k = .25 + .7 * dif; sp *= 1.2; }
    const j = (y * S + x) * 4; D[j] = col[0] * k + sp * 255; D[j + 1] = col[1] * k + sp * 236; D[j + 2] = col[2] * k + sp * 200; D[j + 3] = a * 255;
  }
  g.putImageData(img, 0, 0); return c.toDataURL();
}
// the R2 ring: two hand-inked brown rings with sixteen dots between them, where the seal will go
function ringR2() { const S = 165, U = S * SB / S_SIZE, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), cx = S / 2, cy = S / 2;
  const wob = (r, rng, w, amp) => { g.strokeStyle = 'rgba(43,26,14,.66)'; g.lineWidth = w; g.beginPath(); const ph = rng() * 6;
    for (let a = 0; a <= 6.4; a += .08) { const rr = r + Math.sin(a * 3 + ph) * amp + (rng() - .5) * .5 * amp; if (a) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.stroke(); };
  const rng = mulberry(161); wob(U * .37, rng, 1.4, .3); wob(U * .32, rng, .85, .3);
  for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; g.fillStyle = 'rgba(43,26,14,.6)'; g.beginPath(); g.arc(cx + Math.cos(a) * U * .345, cy + Math.sin(a) * U * .345, .85, 0, 7); g.fill(); }
  return c.toDataURL(); }
// made once, a piece at a time so the page never freezes; resolves true when everything is drawn
function art() {
  if (ART.busy) return ART.busy;
  ART.busy = new Promise((res) => { const im = new Image(); im.onload = () => { HEADIMG = im;
      setTimeout(() => { try { ART.ring = ringR2(); ART.stamp = stampTop(); } catch (e) { /* no canvas */ }
        setTimeout(() => { try { const s = makeSeal(WAX); ART.seal = s.seal; ART.pool = s.pool; } catch (e) { /* no canvas */ } res(!!ART.seal); }, 0); }, 0); };
    im.onerror = () => res(false); im.src = HEAD; });
  return ART.busy;
}
function fillArt(root) {
  root.querySelectorAll('img[data-hv-art]').forEach((i) => { const k = i.getAttribute('data-hv-art'); if (ART[k] && i.getAttribute('src') !== ART[k]) i.src = ART[k]; });
}

/* ================= the pixel pentagram tick (as game-stone.js drawTick), as an image for the pillars ================= */
const TICKS = {};
function tickURL(col, lit) {
  const key = col + (lit ? '1' : '0'); if (TICKS[key] !== undefined) return TICKS[key];
  try {
    const TG = 22, cv = document.createElement('canvas'); cv.width = TG; cv.height = TG; const g = cv.getContext('2d'), cx = TG / 2, cy = TG / 2, R = 8.6;
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.floor(x), Math.floor(y), 1, 1); };
    const dim = mixc('#2a2038', col, .5), white = '#fffbea';
    for (let y = 0; y < TG; y++) for (let x = 0; x < TG; x++) { const dx = x + .5 - cx, dy = y + .5 - cy, d = Math.hypot(dx, dy);
      if (d < R + .5) { if (!lit) px(x, y, (x + y) % 3 ? '#0b0910' : '#120f18'); else { const q = d / R; px(x, y, q < .22 ? white : q < .5 ? mixc(white, col, (q - .22) / .28) : q < .82 ? col : ((x + y) % 2 ? col : mixc(col, '#000000', .35))); } }
      else if (d < R + 1.6) px(x, y, dx + dy > 1 ? 'rgba(210,200,230,.28)' : 'rgba(0,0,0,.7)'); }
    for (let a = 0; a < 6.283; a += .02) { const idx = Math.floor(a / 6.283 * 44); if (!lit && idx % 4 === 3) continue; px(cx + Math.cos(a) * R - .5, cy + Math.sin(a) * R - .5, lit ? mixc(col, '#ffffff', .3) : dim); }
    const P = []; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; P.push([cx + Math.cos(a) * (R - 1.8), cy + Math.sin(a) * (R - 1.8)]); }
    const sc = lit ? mixc(col, '#000000', .72) : dim;
    [0, 2, 4, 1, 3, 0].forEach((k, i, arr) => { if (!i) return; const a = P[arr[i - 1]], b = P[k]; for (let t = 0; t <= 1; t += .04) px(a[0] + (b[0] - a[0]) * t - .5, a[1] + (b[1] - a[1]) * t - .5, sc); });
    TICKS[key] = cv.toDataURL();
  } catch (e) { TICKS[key] = ''; }
  return TICKS[key];
}

/* ================= stained glass panes (the mock-up's glass.js, BG1 style) =================
   build({ w, h, seed, shape: 'lancet' | 'square', blue, red, kept, due, s, fam, band, crack }) -> SVG string.
   fam/band/crack are for the aims panes: fam fills the whole field with one glass, band 'honey' | 'dark', crack adds the break. */
const GPAL = { blue: [[220, 62, 44], [228, 56, 40], [212, 66, 46], [236, 48, 42]], red: [[352, 66, 36], [345, 60, 32], [0, 66, 38], [338, 52, 30]],
  honey: [[38, 58, 54], [34, 54, 50], [42, 60, 58]], honeyD: [[32, 34, 17], [28, 30, 15], [36, 32, 19]], night: [[228, 30, 11], [236, 26, 13], [220, 28, 10], [250, 22, 12]],
  pale: [[204, 52, 70], [212, 46, 66], [198, 56, 74], [218, 40, 68]], gold: [[42, 70, 56], [38, 66, 50], [46, 74, 60], [34, 62, 46]] };
const gP = (pts) => pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
function gClip(poly, f) { const out = []; for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length], fa = f(a[0], a[1]), fb = f(b[0], b[1]);
  if (fa <= 0) out.push(a); if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out; }
const hsl = (h, s, l) => 'hsl(' + h.toFixed(0) + ',' + Math.max(10, Math.min(95, s)).toFixed(0) + '%,' + Math.max(4, Math.min(90, l)).toFixed(0) + '%)';
function gGrad(id, R, c) { const a = R() * Math.PI, x = Math.cos(a) * .5, y = Math.sin(a) * .5, h = c[0] + (R() - .5) * 10, s = c[1] + (R() - .5) * 12, l = c[2] + (R() - .5) * 6;
  const st = [[0, 6], [.16 + R() * .1, -5], [.36 + R() * .1, 9], [.55 + R() * .08, -6], [.74 + R() * .1, 5], [1, -3]];
  return '<linearGradient id="' + id + '" x1="' + (.5 - x).toFixed(2) + '" y1="' + (.5 - y).toFixed(2) + '" x2="' + (.5 + x).toFixed(2) + '" y2="' + (.5 + y).toFixed(2) + '">' +
    st.map(([o, d]) => '<stop offset="' + o.toFixed(2) + '" stop-color="' + hsl(h + (R() - .5) * 8, s + (R() - .5) * 8, l + d) + '"/>').join('') + '</linearGradient>'; }
function gVor(R, r, s) {
  const cols = Math.max(1, Math.round((r[2] - r[0]) / s)), rows = Math.max(1, Math.round((r[3] - r[1]) / s)), sx = (r[2] - r[0]) / cols, sy = (r[3] - r[1]) / rows, sites = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) sites.push([r[0] + (i + .5 + (R() - .5) * .8) * sx, r[1] + (j + .5 + (R() - .5) * .8) * sy]);
  const lim = 3.2 * Math.max(sx, sy);
  return sites.map((p, i) => { let poly = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]]; sites.forEach((q, j) => { if (i === j || Math.abs(q[0] - p[0]) > lim || Math.abs(q[1] - p[1]) > lim) return;
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, nx = q[0] - p[0], ny = q[1] - p[1]; poly = gClip(poly, (x, y) => (x - mx) * nx + (y - my) * ny); }); return poly; }).filter((p) => p.length >= 3);
}
const gCen = (p) => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
function glass(o) {
  const W = o.w, H = o.h, R = xrng(o.seed || 1), id = uid(), lancet = o.shape === 'lancet', y0 = lancet ? W * .866 : 0, b = o.border || 4.2;
  const depth = (x, y) => { let d = Math.min(x, W - x, H - y, lancet ? Infinity : y);
    if (lancet && y < y0) d = Math.min(d, W - Math.hypot(x, y - y0), W - Math.hypot(x - W, y - y0)); return d; };
  const pcs = []; gVor(R, [0, 0, W, H], o.s || 6.4).forEach((p) => { const c = gCen(p), d = depth(c[0], c[1]); if (d < -1.5) return; pcs.push({ p, c, d }); });
  const ph = (o.seed || 1) * 1.7, field = pcs.filter((q) => q.d >= b), band = pcs.filter((q) => q.d < b);
  if (o.fam) { field.forEach((q) => { q.fam = o.fam; }); band.forEach((q) => { q.fam = o.band === 'honey' ? 'honey' : 'honeyD'; }); }
  else {
    const tot = (o.blue || 0) + (o.red || 0), lit = Math.min(.92, .12 + tot / 9), nLit = Math.round(field.length * lit), nBlue = tot ? Math.round(nLit * o.blue / tot) : 0;
    const nz = (q) => Math.sin(q.c[0] * .1 + ph) * .8 + Math.sin(q.c[1] * .055 - ph * 2) * 1.4 + Math.sin((q.c[0] - q.c[1]) * .07 + ph * 3) * .5 + R() * .12;
    field.forEach((q) => { q.v = nz(q); }); field.sort((a, c) => a.v - c.v);
    field.forEach((q, k) => { q.fam = !tot || k >= nLit ? 'night' : k < nBlue ? 'blue' : 'red'; });
    band.sort((a, c) => c.c[1] - a.c[1]); const nGold = Math.round(band.length * (o.due ? clamp(o.kept / o.due, 0, 1) : 0));
    band.forEach((q, k) => { q.fam = k < nGold ? 'honey' : 'honeyD'; });
  }
  let defs = ''; const sheets = {}, used = {}; pcs.forEach((q) => { used[q.fam] = 1; });
  Object.keys(used).forEach((f) => { sheets[f] = GPAL[f].map((c, i) => { const gid = id + f + i; defs += gGrad(gid, R, c); return gid; }); });
  const outline = lancet ? 'M0 ' + H + 'L0 ' + y0.toFixed(1) + 'A' + W + ' ' + W + ' 0 0 1 ' + (W / 2) + ' 0A' + W + ' ' + W + ' 0 0 1 ' + W + ' ' + y0.toFixed(1) + 'L' + W + ' ' + H + 'Z' : 'M0 0H' + W + 'V' + H + 'H0Z';
  defs += '<clipPath id="' + id + 'c"><path d="' + outline + '"/></clipPath><radialGradient id="' + id + 'lg" cx=".4" cy="0" r="1"><stop offset="0" stop-color="#fff8e6" stop-opacity=".22"/><stop offset="1" stop-color="#fff8e6" stop-opacity="0"/></radialGradient>';
  let body = '', lead = '';
  pcs.forEach((q) => { const list = sheets[q.fam], pts = gP(q.p); lead += 'M' + pts.replace(/ /g, 'L') + 'Z'; body += '<polygon points="' + pts + '" fill="url(#' + list[Math.floor(R() * list.length)] + ')"/>'; });
  let bb = ''; for (let k = 0; k < 5; k++) bb += '<circle cx="' + (R() * W).toFixed(1) + '" cy="' + (R() * H).toFixed(1) + '" r="' + (.3 + R() * .4).toFixed(2) + '" fill="#fff" opacity=".35"/>';
  const crack = o.crack ? '<path d="M' + f1(W * .62) + ' 0l' + f1(-W * .1) + ' ' + f1(H * .22) + 'l' + f1(W * .14) + ' ' + f1(H * .1) + 'l' + f1(-W * .18) + ' ' + f1(H * .2) + 'l' + f1(W * .08) + ' ' + f1(H * .16) + 'l' + f1(-W * .14) + ' ' + f1(H * .32) +
    'M' + f1(W * .66) + ' ' + f1(H * .32) + 'l' + f1(W * .3) + ' ' + f1(H * .06) + 'M' + f1(W * .52) + ' ' + f1(H * .52) + 'l' + f1(-W * .4) + ' ' + f1(H * .1) + '" fill="none" stroke="#000" stroke-width="2"/>' +
    '<path d="M' + f1(W * .62 + .8) + ' 0l' + f1(-W * .1) + ' ' + f1(H * .22) + 'l' + f1(W * .14) + ' ' + f1(H * .1) + 'l' + f1(-W * .18) + ' ' + f1(H * .2) + 'l' + f1(W * .08) + ' ' + f1(H * .16) + 'l' + f1(-W * .14) + ' ' + f1(H * .32) + '" fill="none" stroke="#ff5a46" stroke-width=".7" opacity=".7"/>' : '';
  return '<svg class="hv-glass" viewBox="-1.5 -1.5 ' + (W + 3) + ' ' + (H + 3) + '" aria-hidden="true"><defs>' + defs + '</defs><g clip-path="url(#' + id + 'c)">' + body + bb +
    '<path d="' + lead + '" fill="none" stroke="#06070c" stroke-width=".8" stroke-linejoin="round"/><rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'lg)"/>' + crack + '</g>' +
    '<path d="' + outline + '" fill="none" stroke="#06070c" stroke-width="2.2" stroke-linejoin="round"/></svg>';
}

/* ================= reading the server's data ================= */
const isoDate = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
function model(high, review) {
  const H = high || {}, mon = isoDate(H.week) || new Date();
  const days = Array.from({ length: 7 }, (_, i) => { const x = (H.days || [])[i] || {}, dt = isoDate(x.day) || addDays(mon, i);
    return { i, short: DAYS[i].slice(0, 3), name: DAYS[i] + ' ' + dt.getDate(), bless: num(x.bless), curse: num(x.curse), rit: num(x.rituals), due: x.due == null ? null : num(x.due), frozen: !!x.frozen,
      blessings: Array.isArray(x.blessings) ? x.blessings : null, curses: Array.isArray(x.curses) ? x.curses : null }; });
  const maxRit = Math.max(0, ...days.map((d) => d.rit));
  days.forEach((d) => { d.band = d.due != null ? d.due : maxRit; });
  const grid = Array.from({ length: 7 }, (_, i) => Array.from({ length: 5 }, (__, s) => num(((H.grid || [])[i] || [])[s])));
  // every ritual once (grew, slipped and any full list the server adds), and every curse with a ceiling
  const rit = [], seen = {}, curses = [];
  [].concat(H.rituals || [], H.grew || [], H.slipped || [], H.aims || []).forEach((r) => { if (!r || !r.name) return;
    if (r.ceiling != null && r.ceiling !== '') { if (!curses.some((c) => c.name === r.name)) curses.push(r); return; }
    if (seen[r.name]) { Object.keys(r).forEach((k) => { if (seen[r.name][k] == null) seen[r.name][k] = r[k]; }); return; }
    seen[r.name] = Object.assign({}, r); rit.push(seen[r.name]); });
  (H.curses || []).forEach((c) => { if (c && c.name && c.ceiling != null && !curses.some((x) => x.name === c.name)) curses.push(c); });
  const sun = addDays(mon, 6);
  return { H, rv: review || {}, mon, sun, days, grid, slots: H.slots || ['Morning', 'School', 'After school', 'Evening', 'Late'], rit, curses,
    title: 'Sunday ' + sun.getDate() + ' ' + MONTHS[sun.getMonth()] };
}

/* ================= small pieces of markup ================= */
const ill = (t) => '<h3 class="hv-ill"><span class="hv-cap">' + esc(t.charAt(0)) + '</span><span>' + esc(t.slice(1)) + '</span></h3>';
const ORN = '<svg class="hv-orn" viewBox="0 0 360 22" preserveAspectRatio="none" aria-hidden="true"><path d="M10 11H160M200 11H350" stroke="#8a6a2a" stroke-width="1"/><path d="M10 13H160M200 13H350" stroke="#3a2a10" stroke-width="1"/><path d="M180 1L184 9 193 9 186 14 189 21 180 17 171 21 174 14 167 9 176 9Z" fill="none" stroke="#e8c46e" stroke-width="1.2"/><circle cx="180" cy="12" r="2" fill="#e8c46e"/></svg>';
const ARCH = '<svg viewBox="0 0 360 170" preserveAspectRatio="none" aria-hidden="true"><path d="M8 168V80A172 172 0 0 1 180 4A172 172 0 0 1 352 80V168" fill="rgba(30,20,50,.35)" stroke="#8a6a2a" stroke-width="2"/><path d="M18 168V84A162 162 0 0 1 180 14A162 162 0 0 1 342 84V168" fill="none" stroke="#3a2a10" stroke-width="1.5"/></svg>';
const ulhuSrc = (o, mood) => { const u = o.ulhu; if (typeof u === 'function') return u(mood); if (u) return u; const A = window.ULHU_ART; return (A && A.b8 && (A.b8[mood] || A.b8.idle)) || ''; };
const ulImg = (o, mood, cls) => { const s = ulhuSrc(o, mood); return s ? '<img class="' + cls + '" src="' + s + '" alt="Ulhu">' : ''; };
// an openable pane: the app's hook (data-a) plus the module's own (data-hvp)
const hook = (id) => { const a = ST.attrs.pane; return (a ? ' data-a="' + esc(a) + '" data-v="' + esc(id) + '"' : '') + ' data-hvp="' + esc(id) + '"'; };

/* ---------- 1. Last week's vow: the seals ---------- */
const KEPT = [['Yes', 'Kept'], ['Partly', 'Partly'], ['No', 'Broken']];
const VERD = { Yes: 'Kept. The change held all week. Ulhu sulks.', Partly: 'Partly kept. Some days it crept back.', No: 'Broken this week. You can carry it into next week.' };
const keptKey = (v) => { v = String(v || ''); if (/^(yes|kept)$/i.test(v)) return 'Yes'; if (/^partly$/i.test(v)) return 'Partly'; if (/^(no|broken)$/i.test(v)) return 'No'; return ''; };
// the answer pressed into the lower rim of the wax, letters upright, reading left to right
function rimWord(word) { const id = uid();
  return '<svg class="hv-sw" viewBox="0 0 102.4 102.4" aria-hidden="true"><defs><path id="' + id + '" d="M19.7 51.2A31.5 31.5 0 0 0 82.7 51.2"/></defs>' +
    '<text font-size="8.6" letter-spacing="1" fill="rgba(255,170,160,.45)" transform="translate(0 .8)"><textPath href="#' + id + '" startOffset="50%" text-anchor="middle">' + esc(word.toUpperCase()) + '</textPath></text>' +
    '<text font-size="8.6" letter-spacing="1" fill="#1e0204"><textPath href="#' + id + '" startOffset="50%" text-anchor="middle">' + esc(word.toUpperCase()) + '</textPath></text></svg>'; }
function secVow(M) {
  const lc = M.H.lastChange; if (!lc || !lc.change) return '';
  const kept = keptKey(ST.vals.kept != null ? ST.vals.kept : lc.kept), a = ST.attrs.answer;
  const seal = ([v, lab]) => '<button type="button" class="hv-wsl' + (kept === v ? ' hv-on' : '') + '"' + (a ? ' data-a="' + esc(a) + '"' : '') + ' data-v="' + v + '" data-hvk="' + v + '" aria-pressed="' + (kept === v) + '">' +
    '<span class="hv-spot"><img class="hv-ring" data-hv-art="ring" alt=""><img class="hv-pool" data-hv-art="pool" alt=""><img class="hv-seal" data-hv-art="seal" alt="">' + rimWord(lab) +
    '<span class="hv-stp"><i class="hv-shd"></i><img class="hv-top" data-hv-art="stamp" alt=""></span></span><span class="hv-wl">' + lab + '</span></button>';
  return '<div class="hv-sec">' + ill("Last Week's Vow") + '<div class="hv-parch hv-vow"><div class="hv-vq">Last Sunday you vowed</div><q class="hv-vtext">' + esc(lc.change) + '</q>' +
    '<div class="hv-vq2">Did you keep it?</div><div class="hv-wseals' + (kept ? ' hv-picked' : '') + '" role="group" aria-label="Did you keep it">' + KEPT.map(seal).join('') + '</div>' +
    '<p class="hv-verdict" aria-live="polite">' + (kept ? VERD[kept] : 'Press a seal to judge the week.') + '</p></div></div>';
}

/* ---------- 2. The Week in Glass, and the aims ---------- */
const pips = (k, n) => '<span class="hv-rp">' + Array.from({ length: n }, (_, j) => '<i class="' + (j < k ? 'hv-on' : '') + '"></i>').join('') + '</span>';
function dayDetail(M, i) {
  const d = M.days[i]; let li = '';
  if (d.blessings && d.blessings.length) li += d.blessings.map((b) => '<li><i class="hv-dot hv-b"></i>' + esc(b) + '</li>').join('');
  else if (d.bless) li += '<li><i class="hv-dot hv-b"></i>' + pl(d.bless, 'blessing') + '</li>';
  if (d.curses && d.curses.length) li += d.curses.map((c) => '<li><i class="hv-dot hv-c"></i>' + esc(c.name || c) + (c.at ? '<span>' + esc(c.at) + '</span>' : '') + '</li>').join('');
  else if (d.curse) li += '<li><i class="hv-dot hv-c"></i>' + pl(d.curse, 'curse') + '</li>';
  const rt = d.due != null ? (d.due && d.rit >= d.due ? 'Every ritual kept' : d.rit + ' of ' + d.due + ' rituals kept') : pl(d.rit, 'ritual') + ' kept';
  li += '<li><i class="hv-dot hv-g"></i>' + rt + (d.due ? pips(d.rit, d.due) : '') + '</li>';
  if (d.frozen) li += '<li><i class="hv-dot hv-r"></i>A rest day</li>';
  return '<b class="hv-dh2">' + esc(d.name) + '</b><ul class="hv-dD">' + li + '</ul>';
}
// aims: honey (aim reached), pale blue (bottom line held), dark and cracked (missed); no aim = done or missed
function aimOf(r) {
  const kept = num(r.kept), due = num(r.due), A = r.aim || null;
  if (!A || !A.type) { const done = due ? kept >= due : kept > 0; return { tier: done ? 'done' : 'miss', word: done ? 'done' : 'missed', text: esc(r.name) + ': kept ' + kept + ' of ' + due + ' nights. ' + (done ? 'Done.' : 'Missed.') }; }
  const tg = num(A.target), fl = A.floor == null ? null : num(A.floor);
  const val = A.type === 'avg' ? num(r.minutes) : num(r.count);
  const reached = r.reached != null ? !!r.reached : tg > 0 && val >= tg;
  const held = r.held != null ? !!r.held : A.type === 'count' && fl != null ? kept >= fl : due ? kept >= due : kept > 0;
  const aimT = A.type === 'avg' ? (Math.round(val * 10) / 10) + ' min a day of ' + tg : val + ' full of ' + tg + ' this week';
  const botT = A.type === 'count' && fl != null ? 'bottom line ' + kept + ' of ' + fl : 'bottom line ' + kept + ' of ' + due + ' days';
  const tier = reached ? 'aim' : held ? 'floor' : 'miss';
  return { tier, word: tier === 'aim' ? 'aim' : tier === 'floor' ? 'held' : 'missed', text: '<b>' + esc(r.name) + '</b>: ' + aimT + '. ' + botT + '. ' + (tier === 'aim' ? '<span class="hv-h">Aim reached.</span>' : tier === 'floor' ? '<span class="hv-bl">Bottom line held.</span>' : '<span class="hv-r">Missed.</span>') };
}
function ceilOf(c) { const n = num(c.count != null ? c.count : c.kept), cap = num(c.ceiling), over = n > cap;
  return { tier: over ? 'over' : 'under', word: over ? 'over' : 'under', text: '<b>' + esc(c.name) + '</b>: ' + n + ' this week, ceiling ' + cap + '. ' + (over ? '<span class="hv-r">Over. It costs nothing extra.</span>' : '<span class="hv-h">Under.</span>') }; }
const AIMG = { aim: { fam: 'gold', band: 'honey' }, done: { fam: 'gold', band: 'honey' }, floor: { fam: 'pale', band: 'honey' }, miss: { fam: 'night', band: 'dark', crack: 1 }, under: { fam: 'gold', band: 'honey' }, over: { fam: 'red', band: 'dark' } };
function aimsHTML(M) {
  const list = M.rit.map((r) => Object.assign({ r }, aimOf(r))).concat(M.curses.map((c) => Object.assign({ r: c, curse: 1 }, ceilOf(c))));
  if (!list.length) return '';
  M.aims = list; let open = ST.open.a; if (open == null || !list[+open]) open = null;
  const panes = list.map((x, k) => '<button type="button" class="hv-apane hv-t-' + x.tier + '"' + hook('a' + k) + ' aria-pressed="' + (String(open) === String(k)) + '" aria-label="' + esc(x.r.name) + ': ' + x.word + '">' +
    glass(Object.assign({ w: 44, h: 44, seed: 900 + hashStr(String(x.r.name)) % 500, shape: 'square', s: 6 }, AIMG[x.tier])) + '<span class="hv-an">' + esc(x.r.name) + '</span><em class="hv-aw">' + x.word + '</em></button>').join('');
  return '<h4 class="hv-sub">Aims and bottom lines</h4><div class="hv-aims">' + panes + '</div>' +
    '<div class="hv-key"><span><i style="background:#e0b050"></i>aim reached</span><span><i style="background:#9cc4e8"></i>bottom line held</span><span><i style="background:#1a1626;border-color:#ff5a46"></i>missed</span></div>' +
    '<div class="hv-pdet hv-adet" aria-live="polite" style="min-height:2.6em">' + (open != null ? list[+open].text : 'Tap a pane for the numbers.') + '</div>';
}
function secGlass(M) {
  const tb = M.days.reduce((a, d) => a + d.bless, 0), tc = M.days.reduce((a, d) => a + d.curse, 0), tk = M.days.reduce((a, d) => a + d.rit, 0), hasDue = M.days.some((d) => d.due != null), td = M.days.reduce((a, d) => a + (d.due || 0), 0);
  let open = ST.open.d; if (open == null) { open = 6; for (let i = 6; i >= 0; i--) if (M.days[i].bless + M.days[i].curse + M.days[i].rit) { open = i; break; } }
  const panes = M.days.map((d) => '<button type="button" class="hv-pane"' + hook('d' + d.i) + ' aria-pressed="' + (open === d.i) + '" aria-label="' + esc(d.name) + ': ' + pl(d.bless, 'blessing') + ', ' + pl(d.curse, 'curse') + ', ' + pl(d.rit, 'ritual') + '">' +
    glass({ w: 44, h: 118, seed: 100 + d.i * 7, shape: 'lancet', blue: d.bless, red: d.curse, kept: d.rit, due: d.band, s: 6.4 }) + '<span>' + d.short + '</span><em class="hv-mini">' + d.bless + '·' + d.curse + '</em></button>').join('');
  return '<div class="hv-sec">' + ill('The Week in Glass') +
    '<div class="hv-wsum"><span class="hv-bl"><b>' + tb + '</b>blessings</span><span class="hv-r"><b>' + tc + '</b>curses</span><span class="hv-h"><b>' + tk + (hasDue ? '/' + td : '') + '</b>rituals</span></div>' +
    '<div class="hv-tracery"><div class="hv-panes">' + panes + '</div><div class="hv-key"><span><i style="background:#3a6ad8"></i>blessings</span><span><i style="background:#a8202c"></i>curses</span><span><i style="background:#d9a948"></i>rituals kept</span></div></div>' +
    '<div class="hv-pdet hv-ddet" aria-live="polite">' + dayDetail(M, open) + '</div>' + aimsHTML(M) + '</div>';
}

/* ---------- 3. Who you are becoming ---------- */
const IDC = { Scholar: '#e8b84a', Sanctified: '#8fd0ff', Wordsmith: '#b48cff', Diligent: '#ff9a4a', Wanderer: '#5ef2a0', Leviathan: '#3ab8c0', Nourished: '#ff6a7a', Devoted: '#f080c8',
  Steadfast: '#c8c0a0', Trusted: '#6a9aff', Mentor: '#e0d060', Dreamer: '#9a7aff', Serene: '#7adcd8', Homeflame: '#ff7a3a', Frugal: '#9ad06a', Valiant: '#ff4a5a' };
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
const EVIL = ['A {w}, then. Disgusting.', 'A {w}. How very wholesome. I feel ill.', 'Becoming a {w}. The deep is not impressed. Much.', 'A {w}? Keep that up and I will have to respect you.'];
function secWho(M, o) {
  const who = (M.H.who || []).filter((x) => x && num(x.votes) > 0); if (!who.length) return '';
  const mx = Math.max(8, ...who.map((x) => num(x.votes))), top = who[0];
  const line = o.line || (WORDS[num(top.votes)] || String(top.votes)) + ' votes. ' + EVIL[hashStr(String(M.H.week || '')) % EVIL.length].replace('{w}', top.who);
  const piece = (c, k) => '<i style="flex-basis:calc(100% / ' + mx + ');background:linear-gradient(' + (k % 2 ? 160 : 20) + 'deg,' + mixc(c, '#ffffff', .25) + ',' + c + ' 50%,' + mixc(c, '#000000', .45) + ')"></i>';
  return '<div class="hv-sec">' + ill('Who You Are Becoming') + '<div class="hv-gb">' + who.map((x, i) => { const c = IDC[x.who] || '#c8b89a', v = num(x.votes);
    return '<div class="hv-gbr"><span class="hv-n" style="color:' + (i ? '#e8dcc0' : '#ffe2a0') + '">' + esc(x.who) + '</span><span class="hv-bar">' + Array.from({ length: v }, (_, k) => piece(c, k)).join('') + '</span><span class="hv-v">' + v + '</span></div>'; }).join('') + '</div>' +
    '<div class="hv-ulsay">' + ulImg(o, 'happy', '') + '<p>' + esc(line) + '</p></div></div>';
}

/* ---------- 4/5. rituals that grew and slipped: RG13 / RS13 pillars ---------- */
function stoneDefs(g) { return '<linearGradient id="' + g + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3e3848"/><stop offset=".06" stop-color="#26232e"/><stop offset="1" stop-color="#121016"/></linearGradient>' +
  '<linearGradient id="' + g + 'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e3a34" stop-opacity=".82"/><stop offset="1" stop-color="#020a08" stop-opacity=".96"/></linearGradient>'; }
const waves = (y, W) => 'M0 ' + y + Array.from({ length: Math.ceil(W / 26) }, () => 'q6.5 -4 13 0t13 0').join('');
const waterAt = (g, y, W, H) => '<path d="' + waves(y, W) + 'V' + H + 'H0z" fill="url(#' + g + 'w)"/><path d="' + waves(y, W) + '" fill="none" stroke="#5adcd0" stroke-opacity=".4"/>';
const dayL = (d) => (d === 7 ? 'Mon' : d >= 0 ? DAYS[d].charAt(0) : '');
function tk(it, x, y, s, prev) {
  const col = it.st === 'kept' ? (it.n ? sCol(it.n) : '#e8c46e') : it.st === 'miss' ? sCol(it.c) : it.st === 'next' ? '#e8c46e' : '#5a5266', h = s / 2, src = tickURL(col, it.st === 'kept');
  let g = src ? '<image href="' + src + '" x="' + f1(x - h) + '" y="' + f1(y - h) + '" width="' + s + '" height="' + s + '" style="image-rendering:pixelated' + (it.st === 'kept' ? ';filter:drop-shadow(0 0 3px ' + col + ')' : it.st === 'rest' ? ';opacity:.4' : '') + '"/>' : '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(h - 1) + '" fill="' + (it.st === 'kept' ? col : '#0b0910') + '" stroke="' + col + '"/>';
  if (it.st === 'miss') g += '<path d="M' + f1(x - h * .75) + ' ' + f1(y + h * .55) + 'L' + f1(x + h * .75) + ' ' + f1(y - h * .55) + '" stroke="#ff5a46" stroke-width="3" stroke-linecap="round" style="filter:drop-shadow(0 0 4px #ff3a2a)"/>';
  if (it.st === 'next') g += '<circle class="hv-pulse" cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(h + 3) + '" fill="none" stroke="#e8c46e" stroke-width="1.6" stroke-dasharray="3 2"/>';
  if (prev && it.lvl > prev.lvl) g += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(h + 3) + '" fill="none" stroke="#ffe2a0" stroke-width="2"/>';
  return g;
}
const tkLabel = (it) => it.st === 'kept' ? [it.n ? String(it.n) : 'kept', it.n ? sCol(it.n) : '#e8c46e'] : it.st === 'miss' ? ['miss', '#ff9a88'] : it.st === 'next' ? ['next', '#ffe2a0'] : ['rest', '#6f667e'];
// seven stone pillars, one per night, each as tall as the step it stood on (RG13 / RS13)
function blockWeek(items, ghostLvl) {
  const g = uid(), W = 312, H = 228, X = (k) => 18 + k * 35, T = (l) => 172 - l * 38, mL = Math.max(0, ...items.map((i) => i.lvl), ghostLvl == null ? 0 : ghostLvl), y0 = T(mL) - 50;
  let s = '<svg viewBox="0 ' + y0 + ' ' + W + ' ' + (H - y0) + '" class="hv-pil" aria-hidden="true"><defs>' + stoneDefs(g) + '</defs>';
  [0, 1, 2, 3].forEach((l) => { s += '<path d="M0 ' + T(l) + 'H' + W + '" stroke="#2a2338" stroke-dasharray="2 4"/><text x="' + (W - 2) + '" y="' + (T(l) - 4) + '" text-anchor="end" font-size="12.5" font-weight="700" fill="' + (ghostLvl === l ? '#ffe2a0' : '#6f667e') + '" class="hv-gt">' + LV[l] + '</text>'; });
  const draw = (filter) => items.forEach((it, k) => { if (!filter(it)) return; const x = X(k), y = T(it.lvl), prev = items[k - 1], [lab, lc] = tkLabel(it), ghost = it.st === 'next' || it.st === 'rest';
    s += '<rect x="' + f1(x - 15.5) + '" y="' + y + '" width="31" height="' + (H - y) + '" fill="' + (ghost ? '#14121a' : 'url(#' + g + 's)') + '" stroke="' + (it.st === 'next' ? '#e8c46e' : '#06070c') + '"' + (ghost ? ' stroke-dasharray="3 3"' : '') + '/>' +
      '<path d="M' + f1(x - 15.5) + ' ' + y + 'h31" stroke="' + (prev && it.lvl > prev.lvl ? '#ffe2a0' : prev && it.lvl < prev.lvl ? '#ff7a66' : '#6a6276') + '" stroke-width="' + (prev && it.lvl !== prev.lvl ? 2.5 : 1.4) + '"/>' +
      tk(it, x, y - 16, 26, prev) + '<text x="' + x + '" y="' + (y + 16) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="' + lc + '">' + lab + '</text><text x="' + x + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="#a39cb2">' + dayL(it.d) + '</text>' +
      (prev && it.lvl > prev.lvl ? '<text x="' + x + '" y="' + (y - 33) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffe2a0">' + LV[it.lvl] + '</text>' : ''); });
  draw((it) => it.sunk); s += waterAt(g, T(0) + 10, W, H); draw((it) => !it.sunk);
  return s + '</svg>';
}
// the nights of one ritual: from r.nights (Mon..Sun) when the server sends it, else an honest summary (kept nights, then misses)
function nightsOf(r, slipped) {
  const out = [];
  if (Array.isArray(r.nights) && r.nights.length) {
    let lvl = null, miss = 0;
    r.nights.slice(0, 7).forEach((v, d) => { const prev = out[out.length - 1];
      if (typeof v === 'number' && v > 0) { lvl = lvlOf(v); miss = 0; out.push({ d, n: v, lvl, st: 'kept' }); }
      else if (v === 'miss' || v === 'm') { miss++; const base = prev ? prev.lvl : lvlOf(num(r.streak)); lvl = miss >= 2 ? 0 : Math.max(0, base - 1); out.push({ d, lvl, st: 'miss', c: prev && prev.n ? prev.n : prev ? prev.c : num(r.streak), sunk: miss >= 2 ? 1 : 0 }); }
      else if (v === 'rest' || v === 'r') out.push({ d, lvl: prev ? prev.lvl : 0, st: 'rest', sunk: prev && prev.sunk ? 1 : 0, c: prev ? prev.n || prev.c : 0 }); });
    if (slipped) out.push({ d: 7, lvl: out.length ? out[out.length - 1].lvl : 0, st: 'next' });
    return { items: out, days: true };
  }
  const kept = num(r.kept), due = Math.max(kept, num(r.due)), st = num(r.streak);
  for (let k = 0; k < kept; k++) { const n = st ? Math.max(1, st - (kept - 1 - k)) : 0; out.push({ d: -1, n, lvl: n ? lvlOf(n) : 1, st: 'kept' }); }
  for (let k = 0; k < due - kept; k++) { const prev = out[out.length - 1]; out.push({ d: -1, lvl: Math.max(0, (prev ? prev.lvl : 1) - 1 - (slipped && k ? 1 : 0)), st: 'miss', c: prev ? prev.n || prev.c : 1, sunk: slipped && k ? 1 : 0 }); }
  if (slipped) out.push({ d: 7, lvl: out.length ? out[out.length - 1].lvl : 0, st: 'next' });
  return { items: out.slice(-8), days: false };
}
const head3 = (name, a, b, col) => '<div class="hv-r3h"><b>' + esc(name) + '</b><span style="color:' + col + '">' + a + '</span>' + (b ? '<small>' + b + '</small>' : '') + '</div>';
function secGrew(M) {
  const list = M.H.grew || []; if (!list.length) return '';
  return '<div class="hv-sec">' + ill('Rituals That Grew') + list.map((r) => { const N = nightsOf(r, false), it = N.items, st = num(r.streak), last = it.filter((x) => x.st === 'kept').pop();
    const cur = last && last.n ? last.lvl : lvlOf(st), nx = STEPN.find((n) => (last && last.n ? last.n : st) < n), crossed = it.find((x, k) => k && x.st === 'kept' && it[k - 1].st === 'kept' && x.lvl > it[k - 1].lvl);
    let line = crossed && N.days ? 'Crossed ' + STEPN[crossed.lvl - 1] + ' nights on ' + DAYS[crossed.d] + ': up to ' + LV[crossed.lvl] + '.' : 'Holds ' + LV[cur] + '.';
    if (!crossed || !N.days) line += nx ? ' ' + (nx - (last && last.n ? last.n : st)) + ' more nights to ' + LV[lvlOf(nx)] + '.' : ' The top step.';
    if (it.some((x) => x.st === 'rest')) line += ' Rest days do not count against it.';
    if (!N.days) line = 'Kept ' + num(r.kept) + ' of ' + num(r.due) + ' nights. ' + line;
    return '<div class="hv-r3">' + head3(r.name, LV[cur], '+' + num(r.kept) + ' night' + (num(r.kept) === 1 ? '' : 's'), sCol(st || (last && last.n) || 1)) + blockWeek(it, nx ? lvlOf(nx) : null) + '<p class="hv-small">' + line + '</p></div>'; }).join('') + '</div>';
}
function secSlip(M) {
  const list = M.H.slipped || [];
  if (!list.length) return '<div class="hv-sec">' + ill('Rituals That Slipped') + '<p class="hv-small">Nothing missed twice this week.</p></div>';
  return '<div class="hv-sec">' + ill('Rituals That Slipped') + list.map((r) => { const N = nightsOf(r, true), it = N.items, kept = it.filter((x) => x.st === 'kept'), misses = it.filter((x) => x.st === 'miss');
    const from = kept.length && kept[kept.length - 1].n ? LV[kept[kept.length - 1].lvl] : (r.streak ? LV[lvlOf(num(r.streak))] : ''), to = LV[it.length ? it[it.length - 1].lvl : 0];
    let line;
    if (N.days && misses.length) { const md = misses.map((x) => DAYS[x.d]); line = misses.length >= 2 ? 'Missed ' + md[0] + ', then ' + md[1] + ': sunk to ' + to + '. Begin again on Monday.' : 'Missed ' + md[0] + ': down one step to ' + to + '. Keep Monday\'s and it holds.'; }
    else line = 'Kept ' + num(r.kept) + ' of ' + num(r.due) + ' nights, with two missed in a row. Begin again on Monday.';
    return '<div class="hv-r3">' + head3(r.name, from ? from + ' to ' + to : 'kept ' + num(r.kept) + ' of ' + num(r.due), '', '#ff9a88') + blockWeek(it) + '<p class="hv-small">' + line + '</p></div>'; }).join('') + '<p class="hv-nmt">Never miss twice.</p></div>';
}

/* ---------- 6. where the curses came from (CC1a + CC1a3, no key above the grid) ---------- */
const lg = (id, c1, c2, c3) => '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset=".55" stop-color="' + c2 + '"/><stop offset="1" stop-color="' + c3 + '"/></linearGradient>';
const icoAt = (s, x, y, w) => icon(s).replace('<svg ', '<svg x="' + f1(x) + '" y="' + f1(y) + '" width="' + w + '" height="' + w + '" ');
function heat(M) {
  const g = uid(), lx = 84, cw = 28, ch = 30, y0 = 20, right = lx + 7 * cw, rowT = M.slots.map((_, si) => M.grid.reduce((a, d) => a + d[si], 0)), mx = Math.max(...rowT), weak = mx > 0 ? rowT.indexOf(mx) : -1, sig = M.H.gridSig || [];
  let s = '<svg viewBox="0 0 312 ' + (y0 + 5 * ch + 22) + '" class="hv-heat" role="group" aria-label="Curses by day and time"><defs>' + lg(g + 'r0', '#ff6a5a', '#b0141e', '#4a060c') + lg(g + 'r1', '#ff4a4a', '#900e18', '#3a0408') + lg(g + 'o', '#ffe9a8', '#d9a948', '#7a4e14') +
    lg(g + 'd0', '#16142a', '#0c0b18', '#06060c') + lg(g + 'd1', '#121024', '#0a0914', '#050509') + '<filter id="' + g + 'gl"><feGaussianBlur stdDeviation="2.4"/></filter></defs>';
  M.days.forEach((d, i) => { s += '<text x="' + (lx + i * cw + cw / 2) + '" y="' + (y0 - 7) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#d9c79a">' + d.short.charAt(0) + '</text>'; });
  M.slots.forEach((sl, si) => { const y = y0 + si * ch;
    s += '<text x="' + (lx - 6) + '" y="' + (y + ch / 2 + 4) + '" text-anchor="end" font-size="11.5" font-weight="700" fill="' + (si === weak ? '#ffb3a8' : '#a39cb2') + '">' + esc(sl) + '</text>';
    M.days.forEach((d, di) => { const n = M.grid[di][si], x = lx + di * cw, sg = (sig[di] || [])[si], on = ST.open.c === di + ',' + si;
      s += '<g class="hv-tap" tabindex="0" role="button"' + hook('c' + di + ',' + si) + ' aria-label="' + esc(d.name + ' ' + sl) + ': ' + pl(n, 'curse') + '">' +
        (n ? '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + (cw - 4) + '" height="' + (ch - 4) + '" fill="#ff3a2a" opacity=".55" filter="url(#' + g + 'gl)"/>' : '') +
        '<rect class="hv-cl" x="' + x + '" y="' + y + '" width="' + cw + '" height="' + ch + '" fill="url(#' + g + (n ? 'r' : 'd') + ((di + si) % 2) + ')" stroke="' + (on ? '#ffe2a0' : '#06070c') + '" stroke-width="2.4"/>' +
        (n ? (sg && icon(sg) ? icoAt(sg, x + (cw - 21) / 2, y + (ch - 21) / 2, 21) : '<text x="' + (x + cw / 2) + '" y="' + (y + ch / 2 + 5) + '" text-anchor="middle" font-size="14" font-weight="700" fill="#ffe6e0" class="hv-gt">' + n + '</text>') : '') + '</g>'; });
    s += '<text x="' + (right + 10) + '" y="' + (y + ch / 2 + 4) + '" font-size="12.5" font-weight="700" fill="' + (rowT[si] >= 3 ? '#ff9a88' : '#7d7690') + '">' + rowT[si] + '</text>'; });
  if (weak >= 0) s += '<rect x="' + (lx - 2) + '" y="' + (y0 + weak * ch - 2) + '" width="' + (cw * 7 + 4) + '" height="' + (ch + 4) + '" fill="none" stroke="url(#' + g + 'o)" stroke-width="2.5" rx="2" pointer-events="none"/>';
  M.days.forEach((d, di) => { s += '<text x="' + (lx + di * cw + cw / 2) + '" y="' + (y0 + 5 * ch + 16) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="#7d7690">' + M.grid[di].reduce((a, v) => a + v, 0) + '</text>'; });
  s += '<rect x="' + lx + '" y="' + y0 + '" width="' + (cw * 7) + '" height="' + (ch * 5) + '" fill="none" stroke="#8a6a2a" stroke-width="2" pointer-events="none"/>';
  return { svg: s + '</svg>', weak, mx, tot: rowT.reduce((a, v) => a + v, 0) };
}
function cellText(M, id) { const [di, si] = String(id).split(',').map(Number), d = M.days[di]; if (!d) return ''; const n = M.grid[di][si], sg = ((M.H.gridSig || [])[di] || [])[si];
  return '<b>' + esc(d.name) + ', ' + esc(String(M.slots[si] || '').toLowerCase()) + '</b><br>' + (n ? '<span class="hv-r">' + pl(n, 'curse') + '</span>' + (sg ? ' · sigil: ' + esc(sg) : '') : 'Clean.'); }
function secCurses(M) {
  const h = heat(M);
  if (!h.tot) return '<div class="hv-sec">' + ill('Where the Curses Came From') + '<p class="hv-small">Not one curse this week. Ulhu is suspicious.</p></div>';
  const dets = M.H.details || [], tops = (M.H.sigs || []).map((s) => { const best = dets.find((d) => String(d.name).indexOf(s.name + ': ') === 0);
    return '<div><span class="hv-sd">' + icon(s.name) + '</span><span><b>' + esc(s.name) + ':</b> ' + (best ? esc(String(best.name).slice(s.name.length + 2)) + ' x' + num(best.n) + ' ' : '') + '<span class="hv-dim">(' + num(s.n) + ' tagged)</span></span></div>'; }).join('');
  const oc = ST.open.c;
  return '<div class="hv-sec">' + ill('Where the Curses Came From') + h.svg + '<div class="hv-pdet hv-cdet" aria-live="polite" style="min-height:3em">' + (oc ? cellText(M, oc) : 'Tap a pane to see the curse.') + '</div>' +
    (h.weak >= 0 ? '<p class="hv-weak">' + esc(M.slots[h.weak]) + ' is the weak spot: ' + h.mx + ' of ' + h.tot + ' curses.</p>' : '') + (tops ? '<div class="hv-tops">' + tops + '</div>' : '') + '</div>';
}

/* ---------- 7. Absolutions won (AW4c) ---------- */
const before = (i) => glass({ w: 44, h: 44, seed: 700 + i * 3, shape: 'square', blue: 0, red: 6, kept: 0, due: 1, s: 6 });
const after = (full, i) => glass({ w: 44, h: 44, seed: 710 + i * 3, shape: 'square', blue: full ? 7 : 3, red: full ? 0 : 3, kept: 1, due: 1, s: 6 });
function secAbs(M) {
  const A = M.H.absolutions || {}, n = num(A.n), hp = num(A.hp), list = Array.isArray(A.list) ? A.list : null; if (!n && !(list && list.length)) return '';
  const tot = '<div class="hv-abtot"><span>Health won back this week</span><b>+' + hp + '</b></div>';
  if (!list) return '<div class="hv-sec">' + ill('Absolutions Won') + '<div class="hv-mend3"><div class="hv-pp">' + before(0) + '<span class="hv-arr">&rarr;</span>' + after(true, 0) + '</div><p>' + (n === 1 ? 'One curse' : (WORDS[n] || n) + ' curses') + ' washed clean by blessings this week.</p></div>' + tot + '</div>';
  return '<div class="hv-sec">' + ill('Absolutions Won') + list.map((a, i) => { const full = a.full !== false, c = String(a.curse || 'a curse').toLowerCase(), by = a.by ? String(a.by).toLowerCase() : 'its antidote';
    return '<div class="hv-mend3"><div class="hv-pp">' + before(i) + '<span class="hv-arr">&rarr;</span>' + after(full, i) + '</div><p>' + esc((a.day ? a.day + '\'s ' : '') + c + ', ' + (full ? 'washed clean by ' : 'half washed by ') + by + '.' + (full ? '' : ' One more and it is clean.')) + '</p><span class="hv-ft">' + (full ? 'Absolved' : 'Absolution I') + ' · <b>+' + num(a.hp) + ' health</b></span></div>'; }).join('') + tot + '</div>';
}

/* ---------- 8. your three lines (TL1) and the seal ---------- */
const EX = { wentWell: 'Read every night, even Thursday.', slipped: 'Doom-scrolling on the sofa after school.', change: 'Walk home the long way before opening my phone.' };
function secLines(M, o) {
  const sv = M.H.saved || {}, rs = (M.rv && M.rv.week === M.H.week && M.rv.saved) || {}, fa = o.attrs.field || 'hv', sa = o.attrs.seal;
  const val = (k) => (ST.vals[k] != null ? ST.vals[k] : sv[k] != null ? sv[k] : rs[k] != null ? rs[k] : '');
  const fld = (k, lab, chg) => { const id = uid(); return '<div class="hv-fld' + (chg ? ' hv-chg' : '') + '"><label for="' + id + '">' + lab + '</label><span class="hv-ex">e.g. ' + esc(EX[k]) + '</span><textarea id="' + id + '" rows="2" data-' + esc(fa) + '="' + k + '" data-hvf="' + k + '" placeholder="' + esc(EX[k]) + '">' + esc(val(k)) + '</textarea></div>'; };
  const rw = o.reward == null ? 20 : num(o.reward), done = !!M.H.saved;
  return '<div class="hv-sec">' + ill('Your Three Lines') + fld('wentWell', 'What went well this week?') + fld('slipped', 'What slipped?') + fld('change', 'What one thing will you change next week?', true) +
    '<p class="hv-small" style="margin:0 0 10px">Next Sunday asks if you did it.</p>' +
    '<button type="button" class="hv-big' + (done ? ' hv-done' : '') + '"' + (sa ? ' data-a="' + esc(sa) + '"' : '') + ' data-hvseal="1">' + (done ? 'Week sealed <small>tap to update</small>' : 'Seal the week' + (rw ? ' <small>+' + rw + ' runes</small>' : '')) + '</button></div>';
}

/* ================= CSS, injected once ================= */
const CSS = '' +
'.hv{--hg:var(--g,"Grenze Gotisch",Georgia,serif);--hf:var(--f,"IM Fell English",Georgia,serif);--ha:var(--a,"Atkinson Hyperlegible",system-ui,sans-serif);--hv-ink:#ece4cf;--hv-muted:#a39cb2;--hv-dim:#7d7690;--hv-gold:#e8c46e;--hv-quill:#2b1a0e;' +
  'position:relative;box-sizing:border-box;color:var(--hv-ink);font:15px/1.5 var(--ha);padding:0 14px 24px;background:radial-gradient(ellipse 120% 400px at 50% 0,#1c1430,transparent 70%),#08070c;text-align:left}' +
'.hv *,.hv *::before,.hv *::after{box-sizing:border-box}' +
'.hv button{font-family:inherit;-webkit-tap-highlight-color:transparent}' +
'.hv button:focus-visible,.hv textarea:focus-visible,.hv g[tabindex]:focus-visible{outline:2px solid var(--hv-gold);outline-offset:2px}' +
'.hv-arch{position:relative;text-align:center;padding:30px 18px 16px;margin:6px 0 8px}.hv-arch svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}' +
'.hv-arch b{position:relative;display:block;font:700 40px/1 var(--hg);color:#f6e7bd;text-shadow:0 2px 0 #000,0 0 22px rgba(232,196,110,.4)}' +
'.hv-arch small{position:relative;display:block;font:italic 15px var(--hf);color:#c9b9e0;margin-top:6px}.hv-arch img{position:relative;width:48px;height:48px;image-rendering:pixelated;margin-top:6px}' +
'.hv-orn{display:block;width:100%;height:22px;margin:16px 0}' +
'.hv-ill{display:flex;align-items:flex-end;gap:2px;font:500 25px/1 var(--hg);color:#efe3c4;margin:2px 0 12px}' +
'.hv-cap{display:inline-flex;align-items:center;justify-content:center;width:38px;height:40px;margin-right:4px;font:700 32px/1 var(--hg);color:#2a1606;background:radial-gradient(circle at 35% 30%,#ffe9a8,#c8902e 70%,#7a4e14);border:1.5px solid #3a240a;box-shadow:0 0 0 2px #120c06,0 0 14px rgba(232,196,110,.35);border-radius:3px}' +
'.hv-sub{font:500 20px/1.1 var(--hg);color:#efe3c4;margin:16px 0 8px}' +
'.hv-small{font-size:13px;color:var(--hv-muted);margin:8px 0 0}.hv-dim{color:var(--hv-dim)}' +
'.hv-r{color:#ffb3a8}.hv-bl{color:#bfe0ff}.hv-h{color:#f1cf86}' +
'.hv-pdet{margin-top:10px;font-size:13.5px;line-height:1.45;min-height:5.8em}.hv-pdet b{font-weight:700}' +
'.hv-parch{color:var(--hv-quill);background:radial-gradient(ellipse at 30% 20%,#f3e7c8,#d8c18c 85%);border-radius:3px;box-shadow:0 3px 0 #4a3418,inset 0 0 18px rgba(120,70,20,.35)}' +
'.hv-vow{padding:14px 16px 12px}.hv-vq{font:500 21px/1 var(--hg);color:#5a2a10}.hv-vtext{display:block;font:italic 20px/1.28 var(--hf);color:#2b1a0e;margin:6px 0 10px}' +
'.hv-vq2{font:500 18px/1 var(--hg);color:#5a2a10;margin-top:4px}' +
'.hv-wseals{display:flex;justify-content:space-around;gap:4px;margin-top:10px}' +
'.hv-wsl{display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:0;padding:2px;cursor:pointer;color:#3a1e08;font:500 19px/1 var(--hg);min-width:72px;transition:opacity .25s}' +
'.hv-wseals.hv-picked .hv-wsl{opacity:.45}.hv-wseals.hv-picked .hv-wsl[aria-pressed="true"]{opacity:1}' +
'.hv-spot{position:relative;display:block;width:72px;height:72px;border-radius:50%;background:radial-gradient(circle,rgba(90,58,24,.16),transparent 70%)}' +
'.hv-spot img,.hv-spot .hv-sw{position:absolute;left:-15.2px;top:-15.2px;width:102.4px;height:102.4px;max-width:none;pointer-events:none;opacity:0}' +
'.hv-spot img.hv-ring{opacity:1}.hv-wsl.hv-on .hv-spot img.hv-ring{opacity:0}.hv-wsl.hv-on .hv-seal,.hv-wsl.hv-on .hv-sw{opacity:1}' +
'.hv-spot .hv-pool{filter:blur(1.5px)}.hv-sw{z-index:3;overflow:visible}.hv-sw text{font-family:var(--ha);font-weight:700}' +
'.hv-stp{position:absolute;left:36px;top:36px;width:0;height:0;z-index:4;pointer-events:none}' +
'.hv-stp .hv-shd{position:absolute;left:-31px;top:-26px;width:62px;height:62px;border-radius:50%;background:radial-gradient(circle,rgba(30,12,4,.45),rgba(30,12,4,0) 78%);filter:blur(3px);opacity:0}' +
'.hv-stp img.hv-top{position:absolute;left:-27px;top:-27px;width:54px;height:54px;opacity:0}' +
'.hv-wl{font:500 19px/1 var(--hg);letter-spacing:.02em}' +
'.hv-verdict{min-height:2.6em;margin:8px 0 0;font:italic 16px/1.3 var(--hf);color:#4a2c12;text-align:center}' +
'.hv-wsum{display:flex;justify-content:space-between;gap:6px;margin:0 0 10px}' +
'.hv-wsum span{flex:1;text-align:center;padding:6px 4px;border-radius:6px;background:#120f18;border:1px solid #2a2338;font-size:12px}.hv-wsum b{display:block;font:700 22px/1.1 var(--hg)}' +
'.hv-tracery{padding:10px 8px 6px;border-radius:4px;background:linear-gradient(180deg,#1b1824,#100e15);border:1px solid #33293f;box-shadow:inset 0 2px 10px #000}' +
'.hv-panes{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;align-items:end}' +
'.hv-pane,.hv-apane{display:flex;flex-direction:column;align-items:center;gap:4px;padding:0;background:none;border:0;cursor:pointer;color:var(--hv-muted);font:700 11.5px var(--ha);min-width:0}' +
'.hv-pane .hv-glass,.hv-apane .hv-glass{display:block;width:100%;height:auto;transition:filter .3s,transform .3s}' +
'.hv-pane[aria-pressed="true"],.hv-apane[aria-pressed="true"]{color:#fff}' +
'.hv-pane[aria-pressed="true"] .hv-glass,.hv-apane[aria-pressed="true"] .hv-glass{transform:translateY(-3px);filter:drop-shadow(0 0 8px rgba(232,196,110,.55))}' +
'.hv-mini{font:700 10.5px var(--ha);font-style:normal;color:#8a8298;font-variant-numeric:tabular-nums}' +
'.hv-key{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--hv-muted);margin-top:8px}' +
'.hv-key i{display:inline-block;width:10px;height:10px;margin-right:5px;vertical-align:-1px;border:1px solid #000}' +
'.hv-dh2{display:block;font:500 20px/1 var(--hg);color:#efe3c4;margin-bottom:4px}' +
'.hv-dD{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;font-size:14px}.hv-dD li{display:flex;align-items:center;gap:8px}' +
'.hv-dD li span{margin-left:auto;color:var(--hv-muted);font-variant-numeric:tabular-nums}' +
'.hv-dot{width:9px;height:9px;border-radius:50%;flex:none}.hv-dot.hv-b{background:#5a8cff}.hv-dot.hv-c{background:#e83a4a}.hv-dot.hv-g{background:#e8c46e}.hv-dot.hv-r{background:#5a5266}' +
'.hv-rp{display:inline-flex;gap:3px;vertical-align:middle;margin-left:auto}.hv-rp i{width:9px;height:9px;transform:rotate(45deg);background:#3a2a10;border:1px solid #8a6a2a}.hv-rp i.hv-on{background:#e8c46e;border-color:#ffe2a0}' +
'.hv-aims{display:grid;grid-template-columns:repeat(auto-fill,minmax(62px,1fr));gap:10px 6px}' +
'.hv-apane .hv-glass{width:48px}.hv-an{font:700 11.5px/1.2 var(--ha);text-align:center;color:#d9d2e6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;max-width:100%}' +
'.hv-aw{font:700 10.5px var(--ha);font-style:normal;letter-spacing:.06em;text-transform:uppercase}' +
'.hv-t-aim .hv-aw,.hv-t-done .hv-aw,.hv-t-under .hv-aw{color:#f1cf86}.hv-t-floor .hv-aw{color:#bfe0ff}.hv-t-miss .hv-aw{color:#8a8298}.hv-t-over .hv-aw{color:#ff9a88}' +
'.hv-t-aim .hv-glass,.hv-t-done .hv-glass,.hv-t-under .hv-glass{filter:drop-shadow(0 0 6px rgba(232,180,80,.45))}.hv-t-floor .hv-glass{filter:drop-shadow(0 0 5px rgba(150,200,240,.35))}' +
'.hv-gb{display:flex;flex-direction:column;gap:6px}' +
'.hv-gbr{display:grid;grid-template-columns:6.4em 1fr 1.6em;gap:8px;align-items:center}' +
'.hv-gbr .hv-n{font:700 13.5px var(--ha);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
'.hv-gbr .hv-bar{display:flex;height:16px;background:#0a0910;border:1px solid #3a2f18;padding:1px;gap:0}' +
'.hv-gbr .hv-bar i{flex-grow:0;flex-shrink:0;border:1px solid #05050a;border-radius:1px}' +
'.hv-gbr .hv-v{font:700 13px var(--ha);text-align:right;color:var(--hv-muted);font-variant-numeric:tabular-nums}' +
'.hv-ulsay{display:flex;align-items:flex-start;gap:9px;margin-top:12px}.hv-ulsay img{width:40px;height:40px;image-rendering:pixelated;flex:none}' +
'.hv-ulsay p{margin:0;padding:7px 11px 8px;background:radial-gradient(ellipse at 30% 20%,#f3e7c8,#dcc797 80%);color:#2a1a12;border-radius:3px 10px 10px 10px;font:italic 15px/1.25 var(--hf);box-shadow:0 2px 0 #5a4428}' +
'.hv-r3{margin-bottom:12px}.hv-r3h{display:flex;align-items:baseline;gap:8px;margin:0 0 4px}.hv-r3h b{font:500 21px/1.05 var(--hg);color:#efe3c4}.hv-r3h span{font:700 14px var(--ha)}' +
'.hv-r3h small{margin-left:auto;font:700 12.5px var(--ha);color:#5ef2a0}' +
'.hv-pil,.hv-heat{display:block;width:100%;height:auto}.hv-pil text,.hv-heat text{font-family:var(--ha)}.hv-gt{font-family:var(--hg)!important}' +
'.hv-pulse{animation:hv-pulse 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes hv-pulse{0%,100%{opacity:1}50%{opacity:.35}}' +
'.hv-nmt{margin:2px 0 0;text-align:center;font:700 22px var(--hg);color:#ffb3a8;text-shadow:0 0 10px rgba(255,90,70,.35)}' +
'.hv-tap{cursor:pointer}' +
'.hv-weak{margin:10px 0 0;font-size:13.5px;color:#f1cf86}' +
'.hv-tops{display:flex;flex-direction:column;gap:6px;margin-top:12px}.hv-tops>div{display:flex;align-items:center;gap:9px;font-size:14px}' +
'.hv-sd{display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#2a2015,#0c0a08);box-shadow:inset 0 0 0 1.5px #8a6a2a,0 2px 4px rgba(0,0,0,.6)}.hv-sd svg{width:72%;height:72%}' +
'.hv-mend3{padding:10px 0;border-bottom:1px solid #2a2338}.hv-pp{display:flex;align-items:center;gap:6px}.hv-mend3 .hv-glass{width:56px;height:56px}.hv-arr{color:var(--hv-muted)}' +
'.hv-mend3 p{margin:8px 0 2px;font:italic 17px/1.3 var(--hf);color:#efe3c4}.hv-ft{font:12.5px var(--ha);color:var(--hv-muted)}.hv-ft b{color:#f6dc9c}' +
'.hv-abtot{display:flex;justify-content:space-between;align-items:baseline;margin-top:10px;padding-top:8px;border-top:1px solid #3a2f18}.hv-abtot span{font:500 19px var(--hg);color:#efe3c4}.hv-abtot b{font:700 30px var(--hg);color:#f6dc9c}' +
'.hv-fld{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}.hv-fld label{font:500 19px var(--hg);color:#efe3c4}.hv-ex{font:12.5px var(--ha);color:var(--hv-muted)}' +
'.hv-fld textarea{font:17px/1.3 var(--hf);color:var(--hv-quill);background:radial-gradient(ellipse at 30% 20%,#f3e7c8,#dcc797 85%);border:1px solid #6a4a20;resize:vertical;min-height:58px;padding:9px 11px;border-radius:6px;width:100%;user-select:text;-webkit-user-select:text}' +
'.hv-fld textarea::placeholder{color:#8a6a46}.hv-fld.hv-chg textarea{box-shadow:0 0 0 2px #e8c46e,0 0 16px rgba(232,196,110,.35)}' +
'.hv-big{display:block;width:100%;min-height:52px;font:700 24px/1 var(--hg);letter-spacing:.03em;color:#08100d;background:linear-gradient(180deg,#7af7b6,#3fcf86);border:1px solid #8affc4;border-radius:8px;cursor:pointer;box-shadow:0 3px 0 #1a5a3a,0 0 18px rgba(94,242,160,.25)}' +
'.hv-big small{display:inline-block;margin-left:8px;font:700 14px var(--ha);opacity:.8}.hv-big.hv-done{background:#13201b;color:#8fa298;border-color:#2f443b;box-shadow:none}' +
'@media (max-width:370px){.hv{padding:0 10px 20px}.hv-wsl{min-width:64px}.hv-panes{gap:3px}.hv-gbr{grid-template-columns:5.6em 1fr 1.4em}}' +
'@media (prefers-reduced-motion: reduce){.hv *,.hv *::before,.hv *::after{animation:none!important;transition:none!important}}';
function css() { if (document.getElementById('hv-css')) return; const s = document.createElement('style'); s.id = 'hv-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }

/* ================= the API ================= */
function html(high, review, opts) {
  const o = Object.assign({}, opts || {}); o.attrs = Object.assign({}, o.attrs || {});
  const wk = high && high.week; if (ST.week !== wk) { ST.week = wk; ST.vals = {}; ST.open = { d: null, c: null, a: null }; }
  if (o.values) Object.keys(o.values).forEach((k) => { if (o.values[k] != null) ST.vals[k] = o.values[k]; });
  ST.high = high || {}; ST.review = review || {}; ST.attrs = o.attrs; ST.opts = o;
  if (typeof document !== 'undefined') css();
  const M = model(high, review); ST.M = M;
  const secs = [secVow(M), secGlass(M), secWho(M, o), secGrew(M), secSlip(M), secCurses(M), secAbs(M), secLines(M, o)].filter(Boolean);
  return '<div class="hv hv-root"><div class="hv-arch">' + ARCH + '<b>High Vespers</b><small>' + esc(M.title) + ' · open until Tuesday night</small>' + ulImg(o, 'happy', '') + '</div>' + secs.join(ORN) + '</div>';
}
function findRoot(root) { return root && root.querySelector ? (root.classList && root.classList.contains('hv-root') ? root : root.querySelector('.hv-root') || root) : (ST.root && ST.root.isConnected ? ST.root : document.querySelector('.hv-root')); }
function open(id, root) {
  const R = findRoot(root), M = ST.M; if (!R || !M || !id) return; id = String(id); const kind = id.charAt(0), v = id.slice(1);
  if (kind === 'd') { ST.open.d = +v; R.querySelectorAll('.hv-pane').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-hvp') === id))); const p = R.querySelector('.hv-ddet'); if (p) p.innerHTML = dayDetail(M, +v); }
  if (kind === 'c') { ST.open.c = v; R.querySelectorAll('.hv-heat g[data-hvp]').forEach((g) => { const c = g.querySelector('.hv-cl'); if (c) c.setAttribute('stroke', g.getAttribute('data-hvp') === id ? '#ffe2a0' : '#06070c'); }); const p = R.querySelector('.hv-cdet'); if (p) p.innerHTML = cellText(M, v); }
  if (kind === 'a' && M.aims && M.aims[+v]) { ST.open.a = +v; R.querySelectorAll('.hv-apane').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-hvp') === id))); const p = R.querySelector('.hv-adet'); if (p) p.innerHTML = M.aims[+v].text; }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const anim = (el, kf, o) => (el && el.animate ? el.animate(kf, o).finished.catch(() => {}) : Promise.resolve());
const stopA = (el) => { if (el && el.getAnimations) el.getAnimations().forEach((a) => a.cancel()); };
// the LC2d press: the wax drop pools, the brass stamp comes down and presses it, the wax spreads, the stamp lifts
async function pressWax(btn) {
  const P = 1050, q = (s) => btn.querySelector(s), top = q('.hv-top'), shd = q('.hv-shd'), pool = q('.hv-pool'), seal = q('.hv-seal'), sw = q('.hv-sw'), ring = q('.hv-ring'), my = (btn._hvRun = (btn._hvRun || 0) + 1);
  const alive = () => btn._hvRun === my;
  [top, shd, pool, seal, sw, ring].forEach(stopA);
  const fin = () => { [top, shd, pool, seal, sw, ring].forEach((e) => { if (e) { stopA(e); e.style.opacity = ''; } }); };
  if (RM()) { fin(); return; }
  seal.style.opacity = 0; sw.style.opacity = 0; pool.style.opacity = 0; ring.style.opacity = 1;
  anim(pool, [{ opacity: 0, transform: 'translateY(-14px) scale(.18)' }, { opacity: 1, transform: 'translateY(0) scale(.3)', offset: .4 }, { opacity: 1, transform: 'scale(.64)', offset: .8 }, { opacity: 1, transform: 'scale(.7)' }], { duration: P * .3, fill: 'forwards', easing: 'ease-out' });
  await wait(P * .36); if (!alive()) return;
  anim(top, [{ opacity: 0, transform: 'scale(1.9)' }, { opacity: 1, offset: .3 }, { opacity: 1, transform: 'none' }], { duration: P * .24, fill: 'forwards', easing: 'cubic-bezier(.45,0,.85,.6)' });
  anim(shd, [{ opacity: .1, transform: 'scale(1.8)' }, { opacity: .85, transform: 'scale(1)' }], { duration: P * .24, fill: 'forwards', easing: 'ease-in' });
  await wait(P * .24); if (!alive()) return;
  stopA(top); top.style.opacity = 1;
  anim(top, [{ transform: 'none' }, { transform: 'scale(.955)', offset: .3 }, { transform: 'scale(1.01)', offset: .65 }, { transform: 'none' }], { duration: P * .22, fill: 'forwards' });
  stopA(pool); pool.style.opacity = 1;
  anim(pool, [{ transform: 'scale(.7)' }, { transform: 'scale(1.03)', offset: .75 }, { transform: 'scale(1)' }], { duration: P * .2, fill: 'forwards', easing: 'cubic-bezier(.2,.7,.3,1)' });
  anim(ring, [{ opacity: 1 }, { opacity: 0 }], { duration: P * .1, fill: 'forwards' });
  await wait(P * .22); if (!alive()) return;
  seal.style.opacity = 1; sw.style.opacity = 1; stopA(pool); pool.style.opacity = 0;
  await wait(P * .06); if (!alive()) return;
  stopA(top); anim(top, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.6)' }], { duration: P * .12, fill: 'forwards', easing: 'ease-in' });
  stopA(shd); anim(shd, [{ opacity: .85, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.7)' }], { duration: P * .14, fill: 'forwards' });
  await wait(P * .14); if (!alive()) return;
  fin();
}
function answer(key, value, root) {
  if (key && key !== 'kept') return; const v = keptKey(value); if (!v) return; ST.vals.kept = v;
  const R = findRoot(root); if (!R) return; const wrap = R.querySelector('.hv-wseals'); if (!wrap) return;
  let btn = null; wrap.classList.add('hv-picked');
  wrap.querySelectorAll('.hv-wsl').forEach((b) => { const on = b.getAttribute('data-hvk') === v; b.setAttribute('aria-pressed', String(on)); if (on) btn = b; else { b._hvRun = (b._hvRun || 0) + 1; b.classList.remove('hv-on'); b.querySelectorAll('img,svg').forEach((e) => { stopA(e); e.style.opacity = ''; }); } });
  const vd = R.querySelector('.hv-verdict'); if (vd) vd.textContent = VERD[v];
  if (!btn) return; btn.classList.add('hv-on');
  return art().then(() => { fillArt(R); return pressWax(btn); });
}
function paint(root) {
  const R = findRoot(root); if (!R) return; css(); ST.root = R;
  fillArt(R); art().then(() => fillArt(R));
  if (R._hvWired) return; R._hvWired = true;
  R.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-hvp]'); if (t && R.contains(t)) open(t.getAttribute('data-hvp'), R); });
  R.addEventListener('keydown', (e) => { const t = e.target.closest && e.target.closest('g[data-hvp]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  R.addEventListener('input', (e) => { const k = e.target.getAttribute && e.target.getAttribute('data-hvf'); if (k) ST.vals[k] = e.target.value; });
}
function values(root) {
  const R = findRoot(root), H = ST.high || {}, sv = H.saved || {}, rs = (ST.review && ST.review.saved) || {}, out = {};
  ['wentWell', 'slipped', 'change'].forEach((k) => { const t = R && R.querySelector('[data-hvf="' + k + '"]'); out[k] = t ? t.value : ST.vals[k] != null ? ST.vals[k] : sv[k] || ''; });
  out.kept = keptKey(ST.vals.kept != null ? ST.vals.kept : H.lastChange && H.lastChange.kept);
  out.week = H.week; const same = ST.review && ST.review.week === H.week; ['p1', 'p2', 'p3'].forEach((k) => { out[k] = same ? rs[k] || '' : ''; });
  return out;
}

window.HIGHV = { html, answer, paint, open, values };
})();
