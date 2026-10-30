/* Ritual tablets (Patryk 2026-10-27, final picks from the "Obsidian and Parchment" mock-up):
   stone ST-final "Polished deep slab" (ST3c fine grain and satin shine on ST3e's thick slab with a deep rounded bevel),
   the plain pixel pentagram tick (no studs, no multiplier marks) waiting in a carved well and lighting from the middle
   in chunky pixel steps, and real-looking cracks round the border (dark fissure, lit lip, chip at the rim), seeded by
   the ritual's name, more of them the longer the streak (2 at the start, 11 by 70 nights), glowing faintly in the
   streak colour with a slight shimmer and flaring when ticked.
   STONE.row(opts) -> HTML for one tablet; STONE.paint(root) paints every tablet inside root (cached, cheap to repeat);
   STONE.flare(key) plays the tick flare on the tablet whose tick has data-fx=key.
   Each tablet face is drawn once into a cached canvas; only the flare and a stepped shimmer animate.
   All CSS classes start with st-. */
(function () {
'use strict';
if (window.STONE) return;

const RM = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const DPRf = () => Math.min(2, window.devicePixelRatio || 1);

/* ---------- the app's streak colour (copied from game-ui.js sCol): ember orange at night 1, eldritch green at 66 ---------- */
const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mixc = (a, b, t) => { const x = hx(a), y = hx(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const STOPS = [[1, '#ff6a2a'], [7, '#ffc040'], [21, '#6ab8ff'], [45, '#5adcd0'], [66, '#5ef2a0']];
const sCol = (n) => { n = Math.max(1, n || 1); if (n >= 66) return '#5ef2a0'; for (let i = 1; i < STOPS.length; i++) if (n <= STOPS[i][0]) return mixc(STOPS[i - 1][1], STOPS[i][1], (n - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0])); return '#5ef2a0'; };
const rgba = (c, a) => { const v = hx(c); return 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + a + ')'; };
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };

/* ---------- seeded randomness and value noise ---------- */
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
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
let N1 = null, N2 = null, N3 = null; // made on the first tablet, not at load
const noise = () => { if (!N1) { N1 = noiseTile(512, 4, 5, 11); N2 = noiseTile(256, 8, 4, 23); N3 = noiseTile(256, 32, 3, 37); } };
const s1 = (x, y) => N1[((y | 0) & 511) * 512 + ((x | 0) & 511)];
const s2 = (x, y) => N2[((y | 0) & 255) * 256 + ((x | 0) & 255)];
const s3 = (x, y) => N3[((y | 0) & 255) * 256 + ((x | 0) & 255)];
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), d = 2 * r + 1;
  for (let y = 0; y < h; y++) { const o = y * w; let acc = 0; for (let x = -r; x <= r; x++) acc += src[o + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { tmp[o + x] = acc / d; acc += src[o + Math.min(w - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { out[y * w + x] = acc / d; acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
  return out;
}
const blur2 = (a, w, h, r) => boxBlur(boxBlur(a, w, h, r), w, h, r);

/* ---------- ST-final: the stone recipe ---------- */
const V = { code: 'ST-S1', base: [22, 18, 30], c1: .3, b2: .15, b3: .1, pits: 3, pitR: [.6, 1.6], spec: 2.2, sx: 70, sheen: 1,   // S1 deeper polish (test default, 30 Oct; was c1 .45, spec 1.4, sx 44)
  bev: 5.2, bevR: 4, side: 7, cham: 3, rough: .6, chips: .08 };
const ROW_H = 64; // css px, including the slab's thickness and its shadow
// where the face sits inside the row (css px): the thickness and the drop shadow take the bottom
const M = { l: 3, t: 2, r: 3, b: V.side + 5 };

function slabPath(W, H, m, rng, v, DPR) {
  const pts = [], x0 = m.l, y0 = m.t, x1 = W - m.r, y1 = H - m.b;
  const cs = [0, 1, 2, 3].map(() => (1.5 + rng() * v.cham) * DPR), C = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  for (let i = 0; i < 4; i++) {
    const a = C[i], b = C[(i + 1) % 4], dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]), nx = -dy, ny = dx;
    const len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]), sA = cs[i], sB = cs[(i + 1) % 4];
    const P = (t, o) => [a[0] + dx * t + nx * o, a[1] + dy * t + ny * o, nx, ny];
    let t = sA; pts.push(P(t, rng() * v.rough * DPR));
    while (t < len - sB) {
      t = Math.min(len - sB, t + (3 + rng() * 5) * DPR);
      if (rng() < v.chips && t > sA + 6 * DPR && t < len - sB - 12 * DPR) {
        const cw = (3 + rng() * 7) * DPR, dep = (0.8 + rng() * 2.4) * DPR;
        pts.push(P(t, .3 * DPR), P(t + cw * .25, dep * .8), P(t + cw * .55, dep), P(t + cw * .8, dep * .5), P(t + cw, .2 * DPR)); t += cw;
      } else pts.push(P(t, rng() * v.rough * DPR));
    }
  }
  return pts;
}

// renders one tablet face; forb = rectangles (device px) the cracks keep out of (tick, words, pay)
function renderStone(name, streak, Wc, Hc, forb, DPR) {
  noise();
  const v = V, W = Math.round(Wc * DPR), H = Math.round(Hc * DPR);
  const rng = mulberry(hashStr(name + '|' + v.code)), side = v.side * DPR;
  const m = { l: M.l * DPR, t: M.t * DPR, r: M.r * DPR, b: M.b * DPR };
  const pts = slabPath(W, H, m, rng, v, DPR);
  const oc = document.createElement('canvas'); oc.width = W; oc.height = H; const ox = oc.getContext('2d', { willReadFrequently: true });
  const poly = (dy) => { ox.beginPath(); pts.forEach((p, i) => (i ? ox.lineTo(p[0], p[1] + dy) : ox.moveTo(p[0], p[1] + dy))); ox.closePath(); ox.fill(); };
  ox.fillStyle = '#fff'; poly(0); const fd = ox.getImageData(0, 0, W, H).data; ox.clearRect(0, 0, W, H);
  for (let k = 1; k <= side; k++) poly(k); const sd = ox.getImageData(0, 0, W, H).data; ox.clearRect(0, 0, W, H);
  const A = new Float32Array(W * H), AS = new Float32Array(W * H);
  for (let i = 0; i < A.length; i++) { A[i] = fd[i * 4 + 3] / 255; AS[i] = sd[i * 4 + 3] / 255; }
  const Hh = blur2(A, W, H, Math.max(1, Math.round(v.bevR * DPR)));
  // cracks stay within this many px of the face's edge (the slab is near enough a rectangle to measure it straight)
  const band = 12 * DPR, fx0 = m.l, fy0 = m.t, fx1 = W - m.r, fy1 = H - m.b;
  // surface height: bevel plus two scales of fine grain
  const o1x = rng() * 512, o1y = rng() * 512, o2x = rng() * 256, o2y = rng() * 256, o3x = rng() * 256, o3y = rng() * 256;
  const Hn = new Float32Array(W * H), C1 = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (A[i] <= 0 && AS[i] <= 0) continue;
    const X = x / DPR, Y = y / DPR, n1 = s1(X * .6 + o1x, Y * .6 + o1y), n2 = s2(X * 1.2 + o2x, Y * 1.2 + o2y), n3 = s3(X * 2.4 + o3x, Y * 2.4 + o3y);
    Hn[i] = Hh[i] * v.bev + (n2 - .5) * v.b2 + (n3 - .5) * v.b3; C1[i] = n1;
  }
  // a few tiny pits
  const dig = (cx, cy, r, depth) => { const R = r * DPR; for (let y = Math.max(0, cy - R | 0); y <= Math.min(H - 1, cy + R + 1 | 0); y++) for (let x = Math.max(0, cx - R | 0); x <= Math.min(W - 1, cx + R + 1 | 0); x++) {
    const d = Math.hypot(x - cx, y - cy) / R; if (d < 1) Hn[y * W + x] -= depth * (1 - d * d); } };
  for (let k = 0; k < v.pits; k++) { const x = rng() * W, y = rng() * H; if (A[(y | 0) * W + (x | 0)] > .9) dig(x, y, v.pitR[0] + rng() * (v.pitR[1] - v.pitR[0]), .9 + rng() * .8); }
  const Hb = blur2(Hn, W, H, Math.max(1, Math.round(2 * DPR)));
  // light it from the top left, satin highlight and a soft violet sheen
  const L = norm3([-.45, -.68, .58]), Hv = norm3([L[0], L[1], L[2] + 1]);
  const img = ox.createImageData(W, H), D = img.data;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, a = A[i], as = AS[i]; if (a <= .004 && as <= .004) continue;
    const j = i * 4, n1 = C1[i], tone = 1 + (n1 - .5) * v.c1 * 2;
    const R = v.base[0] * tone, G = v.base[1] * tone, B = v.base[2] * tone;
    let fR = 0, fG = 0, fB = 0;
    if (a > .004) {
      const gx = (Hn[i + 1] - Hn[i - 1]) * DPR / 2, gy = (Hn[i + W] - Hn[i - W]) * DPR / 2, nl = Math.hypot(gx, gy, 1), nx = -gx / nl, ny = -gy / nl, nz = 1 / nl;
      const dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), sp = Math.pow(Math.max(0, nx * Hv[0] + ny * Hv[1] + nz * Hv[2]), v.sx) * v.spec;
      const ao = clamp((Hb[i] - Hn[i]) * 1.1, 0, .75), lit = (.3 + .95 * dif) * (1 - ao);
      fR = R * lit + sp * 150; fG = G * lit + sp * 146; fB = B * lit + sp * 165;
      const bd = Math.exp(-Math.pow((x / W + y / H * .5 - .42 + (n1 - .5) * .2) / .16, 2)) * (.6 + dif * .6); fR += bd * 16 * v.sheen; fG += bd * 14 * v.sheen; fB += bd * 26 * v.sheen;
    }
    const k = .5 + (n1 - .5) * .3, sR = R * .42 * k, sG = G * .42 * k, sB = B * .42 * k; // the thickness below the face
    D[j] = sR + (fR - sR) * a; D[j + 1] = sG + (fG - sG) * a; D[j + 2] = sB + (fB - sB) * a; D[j + 3] = Math.max(a, as) * 255;
  }
  ox.putImageData(img, 0, 0);
  // the dark seam where face meets thickness
  ox.save(); ox.globalCompositeOperation = 'source-atop'; ox.strokeStyle = 'rgba(0,0,0,.55)'; ox.lineWidth = DPR;
  ox.beginPath(); pts.forEach((p, i) => (i ? ox.lineTo(p[0], p[1] + DPR * .6) : ox.moveTo(p[0], p[1] + DPR * .6))); ox.closePath(); ox.stroke(); ox.restore();

  /* ---- cracks: only near the border, spread round it, more with a longer streak ---- */
  const valid = (x, y, loose) => { if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false; const i = (y | 0) * W + (x | 0);
    if (A[i] < (loose ? .5 : .97) || Math.min(x - fx0, fx1 - x, y - fy0, fy1 - y) > band) return false;
    for (let k = 0; k < forb.length; k++) { const f = forb[k]; if (x > f[0] && x < f[2] && y > f[1] && y < f[3]) return false; } return true; };
  const cracks = [], count = clamp(2 + Math.floor(streak / 7), 2, 11);
  function grow(x, y, a, w, len, depth, list) {
    const P = [[x, y, w]]; let L2 = 0; const drift = (rng() - .5) * .12;
    while (L2 < len && w > .22 * DPR) {
      a += drift + (rng() - .5) * .95; const st = (2.4 + rng() * 3.6) * DPR; let ok = false, nx = 0, ny = 0;
      for (let k = 0; k < 5; k++) { const aa = a + (k === 0 ? 0 : (k % 2 ? 1 : -1) * .45 * Math.ceil(k / 2)); nx = x + Math.cos(aa) * st; ny = y + Math.sin(aa) * st; if (valid(nx, ny, L2 < 3 * DPR)) { a = aa; ok = true; break; } }
      if (!ok) break; x = nx; y = ny; L2 += st; w *= .9; P.push([x, y, w]);
      if (depth < 2 && rng() < .16 && L2 > 4 * DPR) grow(x, y, a + (rng() < .5 ? -1 : 1) * (.6 + rng() * .7), w * .6, (len - L2) * (.35 + rng() * .4), depth + 1, list);
      if (rng() < .12) list.push([[x, y, w * .45], [x + Math.cos(a + 1.6) * 2.2 * DPR, y + Math.sin(a + 1.6) * 2.2 * DPR, w * .2]]); // splinter
    }
    if (P.length > 2) list.push(P);
    return P.length > 2;
  }
  const off = rng(), n = pts.length;
  for (let k = 0; k < count; k++) {
    let made = false;
    for (let t = 0; t < 14 && !made; t++) {
      const idx = Math.floor((((k + off + (rng() - .5) * .6) / count) % 1 + 1) % 1 * n), p = pts[idx];
      const sx = p[0] + p[2] * 1.2 * DPR, sy = p[1] + p[3] * 1.2 * DPR; if (!valid(sx, sy, true)) continue;
      const inA = Math.atan2(p[3], p[2]), a = inA + (rng() < .5 ? -1 : 1) * (.55 + rng() * .5);
      const list = [], w0 = (1.5 + rng() * 1.1) * DPR;
      if (grow(sx, sy, a, w0, (14 + rng() * 22 + Math.min(streak, 70) * .22) * DPR, 0, list)) { cracks.push({ list, mouth: [sx, sy, p[2], p[3], w0] }); made = true; }
    }
  }
  ox.save(); ox.globalCompositeOperation = 'source-atop'; ox.lineCap = 'round'; ox.lineJoin = 'round';
  cracks.forEach((c) => {
    // a chip knocked out where the crack meets the edge
    const [mx, my, nx, ny, w0] = c.mouth, tx = -ny, ty = nx, cw = w0 * (1.8 + rng()), dp = w0 * (2 + rng() * 1.5);
    ox.fillStyle = 'rgba(8,6,10,.85)'; ox.beginPath(); ox.moveTo(mx - nx * 1.5 * DPR + tx * cw, my - ny * 1.5 * DPR + ty * cw); ox.lineTo(mx + nx * dp, my + ny * dp); ox.lineTo(mx - nx * 1.5 * DPR - tx * cw * .8, my - ny * 1.5 * DPR - ty * cw * .8); ox.fill();
    ox.strokeStyle = 'rgba(205,195,220,.4)'; ox.lineWidth = .7 * DPR; ox.beginPath(); ox.moveTo(mx - nx * DPR + tx * cw, my - ny * DPR + ty * cw); ox.lineTo(mx + nx * dp, my + ny * dp); ox.stroke();
    c.list.forEach((P) => {
      const Lp = [], Rp = []; let lx = 0, ly = 0;
      for (let k = 0; k < P.length; k++) { const a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        const w = (k === P.length - 1 ? 0 : P[k][2]) / 2 * (k % 2 ? .8 : 1.1); Lp.push([P[k][0] + nx * w, P[k][1] + ny * w]); Rp.push([P[k][0] - nx * w, P[k][1] - ny * w]); lx += nx; ly += ny; }
      const lightL = (lx * -.45 + ly * -.68) > 0, path = (arr, dx, dy) => { ox.beginPath(); arr.forEach((p, k) => (k ? ox.lineTo(p[0] + dx, p[1] + dy) : ox.moveTo(p[0] + dx, p[1] + dy))); };
      // a soft shadow beside the gap, the black gap itself, a thin lit lip on the side facing the light
      ox.fillStyle = 'rgba(0,0,0,.35)'; path(Lp.concat(Rp.slice().reverse()), .5 * DPR, .7 * DPR); ox.closePath(); ox.fill();
      ox.fillStyle = 'rgba(2,1,4,.97)'; path(Lp.concat(Rp.slice().reverse()), 0, 0); ox.closePath(); ox.fill();
      ox.lineWidth = .55 * DPR; ox.strokeStyle = 'rgba(215,205,232,.42)'; path(lightL ? Lp : Rp, 0, -.45 * DPR); ox.stroke();
      ox.strokeStyle = 'rgba(0,0,0,.5)'; ox.lineWidth = .8 * DPR; path(lightL ? Rp : Lp, .3 * DPR, .5 * DPR); ox.stroke();
    });
  });
  ox.restore();
  // final face with its drop shadow
  const fc = document.createElement('canvas'); fc.width = W; fc.height = H; const fx = fc.getContext('2d');
  fx.shadowColor = 'rgba(0,0,0,.85)'; fx.shadowBlur = 5 * DPR; fx.shadowOffsetY = 2.5 * DPR; fx.drawImage(oc, 0, 0);
  return { face: fc, cracks, W, H, DPR, glows: {} };
}

// embers deep inside the cracks, in the streak colour
function renderGlow(S, col) {
  if (S.glows[col]) return S.glows[col];
  const DPR = S.DPR, gc = document.createElement('canvas'); gc.width = S.W; gc.height = S.H; const g = gc.getContext('2d');
  g.globalCompositeOperation = 'lighter';
  // each pass strokes every crack onto a scratch layer with no shadow, then lays that layer down with one blurred shadow
  // (a shadow on every little stroke cost 0.3-0.9 s per tablet)
  const tc = document.createElement('canvas'); tc.width = S.W; tc.height = S.H; const t = tc.getContext('2d'); t.lineCap = 'round'; t.lineJoin = 'round';
  const pass = (mul, blur, style, min) => { t.clearRect(0, 0, S.W, S.H); t.strokeStyle = style;
    S.cracks.forEach((c) => c.list.forEach((P) => { for (let k = 1; k < P.length; k++) { t.lineWidth = Math.max(min, P[k][2] * mul); t.beginPath(); t.moveTo(P[k - 1][0], P[k - 1][1]); t.lineTo(P[k][0], P[k][1]); t.stroke(); } }));
    g.shadowBlur = blur; g.shadowColor = col; g.drawImage(tc, 0, 0); g.shadowBlur = 0; };
  pass(1.4, 6 * DPR, rgba(col, .22), .5);
  pass(.42, 2 * DPR, col, .35);
  pass(.16, 0, mixc(col, '#fff6e0', .5), .25);
  S.cracks.forEach((c) => { const [mx, my, nx, ny, w0] = c.mouth, cx = mx + nx * w0, cy = my + ny * w0, gr = g.createRadialGradient(cx, cy, 0, cx, cy, w0 * 3);
    gr.addColorStop(0, rgba(col, .35)); gr.addColorStop(1, rgba(col, 0)); g.shadowBlur = 0; g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, w0 * 3, 0, 7); g.fill(); });
  const keys = Object.keys(S.glows); if (keys.length > 3) delete S.glows[keys[0]];
  S.glows[col] = gc;
  return gc;
}

/* ---------- the pixel pentagram tick: carved well and dashed ring when waiting, a disc of light with a dark star when lit ---------- */
const TG = 22; // pixel grid; shown at 2x (44 css px)
const TICKS = {};
function drawTick(col, lit) {
  const key = col + (lit ? '1' : '0'); if (TICKS[key]) return TICKS[key];
  const cv = document.createElement('canvas'); cv.width = TG; cv.height = TG; const g = cv.getContext('2d');
  const cx = TG / 2, cy = TG / 2, R = 8.6;
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.floor(x), Math.floor(y), 1, 1); };
  const dim = mixc('#2a2038', col, .5), white = '#fffbea';
  for (let y = 0; y < TG; y++) for (let x = 0; x < TG; x++) {
    const dx = x + .5 - cx, dy = y + .5 - cy, d = Math.hypot(dx, dy);
    if (d < R + .5) {
      if (!lit) px(x, y, (x + y) % 3 ? '#0b0910' : '#120f18');
      else { const q = d / R; px(x, y, q < .22 ? white : q < .5 ? mixc(white, col, (q - .22) / .28) : q < .82 ? col : ((x + y) % 2 ? col : mixc(col, '#000000', .35))); }
    } else if (d < R + 1.6) px(x, y, dx + dy > 1 ? 'rgba(210,200,230,.28)' : 'rgba(0,0,0,.7)'); // the well's carved rim
  }
  for (let a = 0; a < 6.283; a += .02) { const idx = Math.floor(a / 6.283 * 44); if (!lit && idx % 4 === 3) continue; px(cx + Math.cos(a) * R - .5, cy + Math.sin(a) * R - .5, lit ? mixc(col, '#ffffff', .3) : dim); }
  const P = []; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; P.push([cx + Math.cos(a) * (R - 1.8), cy + Math.sin(a) * (R - 1.8)]); }
  const sc = lit ? mixc(col, '#000000', .72) : dim;
  [0, 2, 4, 1, 3, 0].forEach((k, i, arr) => { if (!i) return; const a = P[arr[i - 1]], b = P[k]; for (let t = 0; t <= 1; t += .04) px(a[0] + (b[0] - a[0]) * t - .5, a[1] + (b[1] - a[1]) * t - .5, sc); });
  TICKS[key] = cv;
  return cv;
}

/* ---------- CSS, injected once ---------- */
const CSS = '' +
'.st-tab{position:relative;box-sizing:border-box;width:100%;height:' + ROW_H + 'px;display:flex;align-items:center;gap:8px;padding:' + M.t + 'px ' + (M.r + 10) + 'px ' + M.b + 'px ' + (M.l + 3) + 'px;isolation:isolate;color:#efeaf4;text-align:left;-webkit-tap-highlight-color:transparent}' +
'.st-tab::before{content:"";position:absolute;left:' + M.l + 'px;right:' + M.r + 'px;top:' + M.t + 'px;bottom:' + (M.b - V.side) + 'px;border-radius:3px;background:linear-gradient(170deg,#2a2630,#18161c);box-shadow:0 ' + V.side + 'px 0 #0f0e12;z-index:-3}' +
'.st-tab.st-ready::before{display:none}' +
'.st-tab>canvas{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}' +
'.st-stone{z-index:-2}' +
'.st-glow{z-index:-1;mix-blend-mode:screen;opacity:.55;animation:st-shim 2.6s steps(1,end) infinite}' +
'.st-tab.st-on .st-glow{opacity:1;animation:st-shimon 3.1s ease-in-out infinite}' +
'.st-lum{position:absolute;left:' + M.l + 'px;right:' + M.r + 'px;top:' + M.t + 'px;bottom:' + M.b + 'px;pointer-events:none;opacity:0;transition:opacity .6s;mix-blend-mode:screen;z-index:-1}' +
'.st-tab.st-on .st-lum{opacity:1}' +
'@keyframes st-shim{0%{opacity:.5}13%{opacity:.62}21%{opacity:.52}37%{opacity:.7}44%{opacity:.54}63%{opacity:.64}71%{opacity:.48}86%{opacity:.6}}' +
'@keyframes st-shimon{0%,100%{opacity:1}30%{opacity:.86}55%{opacity:.97}80%{opacity:.9}}' +
'.st-tick{position:relative;flex:none;width:44px;height:44px;margin:0;padding:0;border:0;background:none;cursor:pointer;transition:filter .4s;-webkit-tap-highlight-color:transparent}' +
'.st-tick canvas{position:absolute;left:0;top:0;width:44px;height:44px;image-rendering:pixelated;pointer-events:none}' +
'.st-tick .st-t1{clip-path:circle(0% at 50% 50%);transition:clip-path .4s steps(6,end)}' +
'.st-tab.st-on .st-tick .st-t1{clip-path:circle(75% at 50% 50%)}' +
'.st-tick:focus-visible{outline:2px solid #e8c46a;outline-offset:2px;border-radius:50%}' +
'.st-body{position:relative;flex:1;min-width:0;cursor:pointer}' +
'.st-nm{font:700 15px/1.2 var(--a,\'Atkinson Hyperlegible\',sans-serif);color:#efeaf4;text-shadow:0 -1px 0 rgba(0,0,0,.95),0 1px 0 rgba(200,190,220,.16);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
'.st-sub{font:12.5px/1.3 var(--a,\'Atkinson Hyperlegible\',sans-serif);color:#aaa3b8;margin-top:2px;text-shadow:0 1px 1px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
'.st-pay{position:relative;flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:2px;font:700 15px/1 var(--a,\'Atkinson Hyperlegible\',sans-serif);color:#f4dd9a;text-shadow:0 1px 1px #000;font-variant-numeric:tabular-nums}' +
'@media (prefers-reduced-motion: reduce){.st-glow,.st-tab.st-on .st-glow{animation:none}.st-tick,.st-tick .st-t1,.st-lum{transition:none}}';
function css() { if (document.getElementById('stone-css')) return; const s = document.createElement('style'); s.id = 'stone-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }

/* ---------- the API ---------- */
function row(o) {
  css();
  o = o || {};
  const s = Math.max(0, +o.streak || 0), on = !!o.done;
  return '<div class="st-tab' + (on ? ' st-on' : '') + '" data-st-id="' + esc(o.id) + '" data-st-name="' + esc(o.name) + '" data-st-s="' + s + '" data-st-d="' + (on ? 1 : 0) + '">' +
    '<canvas class="st-stone"></canvas><canvas class="st-glow"></canvas><div class="st-lum"></div>' +
    '<button type="button" class="st-tick" ' + (o.tickAttrs || '') + ' aria-pressed="' + on + '" aria-label="' + esc(o.name) + (on ? ', done today' : ', not done yet') + ', ' + s + ' night' + (s === 1 ? '' : 's') + '">' +
    '<canvas class="st-t0" width="' + TG + '" height="' + TG + '"></canvas><canvas class="st-t1" width="' + TG + '" height="' + TG + '"></canvas></button>' +
    '<div class="st-body" ' + (o.bodyAttrs || '') + '><div class="st-nm">' + esc(o.name) + '</div><div class="st-sub">' + (o.subHtml || '') + '</div></div>' +
    '<div class="st-pay">' + (o.payHtml || '') + '</div></div>';
}

const CACHE = new Map(), CACHE_MAX = 24; // a stone is about W*H*4 bytes (400 KB at 390 px on a 2x phone)
const QUEUE = []; let busy = false;
const textRect = (node) => { const rg = document.createRange(); rg.selectNodeContents(node); return rg.getBoundingClientRect(); };
// what the cracks must avoid, in device px relative to the tablet; rounded so the cache key stays steady
function measure(el, br, DPR) {
  const f = [], pad = 4, R = (b) => { if (!b || !b.width) return; f.push([Math.round((b.left - br.left - pad) * DPR), Math.round((b.top - br.top - pad) * DPR), Math.round((b.right - br.left + pad) * DPR), Math.round((b.bottom - br.top + pad) * DPR)]); };
  R(el.querySelector('.st-tick').getBoundingClientRect());
  const nm = el.querySelector('.st-nm'), sub = el.querySelector('.st-sub'), pay = el.querySelector('.st-pay');
  if (nm && nm.firstChild) R(textRect(nm)); if (sub && sub.firstChild) R(textRect(sub)); if (pay && pay.firstChild) R(pay.getBoundingClientRect());
  return f;
}
function apply(el, S) {
  const col = el._stCol, on = el._stOn;
  const sc = el.querySelector('.st-stone'), gc = el.querySelector('.st-glow');
  if (sc.width !== S.W || sc.height !== S.H) { sc.width = S.W; sc.height = S.H; } else sc.getContext('2d').clearRect(0, 0, S.W, S.H);
  sc.getContext('2d').drawImage(S.face, 0, 0);
  if (gc.width !== S.W || gc.height !== S.H) { gc.width = S.W; gc.height = S.H; } else gc.getContext('2d').clearRect(0, 0, S.W, S.H);
  gc.getContext('2d').drawImage(renderGlow(S, col), 0, 0);
  el._stKey = S.key; el.classList.add('st-ready');
  if (el._stFlare) { el._stFlare = false; play(el, on); }
}
function paintTick(el) {
  const col = el._stCol;
  const t0 = el.querySelector('.st-t0'), t1 = el.querySelector('.st-t1');
  t0.getContext('2d').clearRect(0, 0, TG, TG); t0.getContext('2d').drawImage(drawTick(col, false), 0, 0);
  t1.getContext('2d').clearRect(0, 0, TG, TG); t1.getContext('2d').drawImage(drawTick(col, true), 0, 0);
  el.querySelector('.st-tick').style.filter = el._stOn ? 'drop-shadow(0 0 5px ' + rgba(col, .75) + ')' : 'none';
  el.querySelector('.st-lum').style.background = 'radial-gradient(ellipse 110px 46px at 28px 50%,' + rgba(col, .2) + ',transparent 75%)';
}
function build(job) {
  const S = renderStone(job.name, job.s, job.Wc, job.Hc, job.forb, job.DPR); S.key = job.key; S.near = job.near;
  CACHE.set(job.key, S); while (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
  return S;
}
function pump() {
  if (busy) return; busy = true;
  // the first stone waits a moment so a tick's flare gets its opening frames before the main thread is busy
  setTimeout(function next() {
    const job = QUEUE.shift(); if (!job) { busy = false; return; }
    const els = job.els.filter((el) => el.isConnected && el._stWant === job.key);
    if (els.length) try { const S = CACHE.get(job.key) || build(job); els.forEach((el) => apply(el, S)); } catch (e) { console.error(e); }
    setTimeout(next, 0);
  }, 90);
}
function paint(root) {
  css();
  root = root || document;
  const els = Array.prototype.slice.call(root.querySelectorAll('.st-tab')), DPR = DPRf(); let queued = false;
  els.forEach((el) => {
    const name = el.getAttribute('data-st-name') || '', s = +el.getAttribute('data-st-s') || 0, on = el.getAttribute('data-st-d') === '1';
    el._stOn = on; el._stCol = sCol(Math.max(1, on ? s : s + 1));
    paintTick(el);
    const br = el.getBoundingClientRect(); if (br.width < 40) return; // hidden: try again on the next paint
    const Wc = Math.round(br.width), Hc = Math.round(br.height), forb = measure(el, br, DPR);
    const near = name + '|' + Wc + 'x' + Hc + '@' + DPR, key = near + '|' + s + '|' + forb.map((f) => f.join(',')).join(';');
    el._stWant = key;
    if (el._stKey === key && el.classList.contains('st-ready')) { const gc = el.querySelector('.st-glow'), S = CACHE.get(key); if (S) { gc.getContext('2d').clearRect(0, 0, S.W, S.H); gc.getContext('2d').drawImage(renderGlow(S, el._stCol), 0, 0); } return; }
    const S = CACHE.get(key); if (S) { apply(el, S); return; }
    // not drawn yet (a tick moved the streak, the words changed): show the same ritual's last stone at this size straight
    // away, so the tick and its flare are instant, and swap in the new cracks when they are drawn a moment later
    let old = null; CACHE.forEach((c) => { if (c.near === near) old = c; });
    if (old) apply(el, old);
    const job = QUEUE.find((j) => j.key === key);
    if (job) job.els.push(el); else QUEUE.push({ key, near, name, s, Wc, Hc, forb, DPR, els: [el] });
    queued = true;
  });
  if (queued) pump();
}
function play(el, on) {
  if (RM()) return;
  const an = (n, kf, o) => { if (n && n.animate) n.animate(kf, o); };
  an(el.querySelector('.st-glow'), [{ opacity: .4, filter: 'brightness(1)' }, { opacity: 1, filter: 'brightness(3) saturate(1.4)', offset: .15 }, { opacity: 1, filter: 'brightness(1.7)', offset: .4 }, { opacity: .95, filter: 'brightness(1)' }], { duration: 1200, easing: 'ease-out' });
  an(el.querySelector('.st-tick'), [{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.12)', filter: 'brightness(1.8)', offset: .3 }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 450, easing: 'steps(5,end)' });
  if (on) {
    an(el.querySelector('.st-t1'), [{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }], { duration: 420, easing: 'steps(6,end)' });
    an(el.querySelector('.st-lum'), [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: .8 }, { opacity: 1 }], { duration: 1200 });
  }
}
function flare(key) {
  const sel = '[data-fx="' + String(key).replace(/["\\]/g, '\\$&') + '"]', btn = document.querySelector('.st-tab ' + sel) || document.querySelector(sel);
  const el = btn && btn.closest('.st-tab'); if (!el) return;
  const on = el.getAttribute('data-st-d') === '1';
  if (el.classList.contains('st-ready')) play(el, on); else el._stFlare = true; // the stone is still being drawn: flare when it lands
}

window.STONE = { row, paint, flare, sCol };
})();
