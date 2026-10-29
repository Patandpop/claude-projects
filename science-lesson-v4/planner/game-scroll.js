/* Quest scrolls (Patryk 2026-10-28, final picks from the "Obsidian and Parchment" mock-up, round 14, the quest scroll part):
   P2 "Touched by age" parchment wound on E1 turned wooden rods; WR1 iron-gall ink for the writing; the K-T2 quill tick
   (a small blot where the nib landed) with an inked strike-through, doubled with a fainter line, crossing every line of
   the step; quest names that wrap to two lines on a phone. The seal finish: W9 gold-flecked red wax at T2 timing, the F9
   seal (Ulhu in the pentagram), pressed with the original wood and brass stamp (K1a: soft shadow, a settle, a lift),
   on the R2 brown ink ring (two rings with dots). As the stamp hits, the pact: C1's sea-green double ring, sixteen runes
   and uneven veins, drying to C2's dark red-brown mark, kept inside the parchment (the seal sits about 10px in from the
   left). Then the B2 burn: two ember lines from both sides meet in the middle, and the ash lingers.

   SCROLL.card(q, opts) -> HTML for one quest.
     q    = { id, name, due, steps: [{ n, d }], pay, done }
            due: the text shown under the name ("Due Monday"), or empty; steps: n = the step's words, d = ticked;
            pay: the runes it pays; done: true draws it already sealed, with the dried pact mark.
     opts = { attrs(i)   -> the app's own attributes for step i's button (for example 'data-a="step" data-id="q1" data-v="0"'),
              tickAttrs  -> the attributes for the main tick (the seal spot), a string or a function(q),
              bodyAttrs  -> optional attributes for the name block (for example the edit tap),
              payHtml    -> optional: replaces the "+pay" and rune picture }
   SCROLL.paint(root) paints every scroll inside root: parchment, rods, strike lines, the waiting ring.
     Cached, cheap to repeat after every re-render; call it after the HTML is in the page.
   SCROLL.tickStep(id, i, on) animates step i's tick and strike (on = true) or clears them (false), and updates the
     "n of m steps" line. Call it before re-rendering, or re-render about 0.5 s later, so the ink can be seen landing.
   SCROLL.seal(id) -> Promise. Ticks any steps left, then plays the stamp, the pact and the burn, and resolves when the
     scroll has burned away and the card can be removed (about 3.4 s; about 1.1 s with reduced motion). The last ash
     floats on in a layer of its own above the page, so removing the card does not cut it off.
   Each parchment and its rods are drawn once into cached canvases; the seal, stamp and ring are drawn once per page.
   Reduced motion: no stamp, pact or burn animation; the seal and dried mark appear and the card fades.
   All CSS classes start with sc-. */
(function () {
'use strict';
if (window.SCROLL) return;

const RM = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const DPRf = () => Math.min(2, window.devicePixelRatio || 1);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
const rgbaA = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const anim = (el, kf, o) => (el && el.animate ? el.animate(kf, o).finished.catch(() => {}) : Promise.resolve());
const cancel = (el) => { if (el && el.getAnimations) el.getAnimations().forEach((a) => a.cancel()); };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/* ---------- seeded randomness and value noise ---------- */
function hashStr(s) { s = String(s); let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
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
let N1 = null, N2 = null, N3 = null; // made on the first scroll, not at load
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

/* ---------- P2 parchment: ragged sides, darker and singed towards the edges, rolled shade at top and bottom ---------- */
const PV = { base: [235, 211, 162], m1: .26, m2: .13, m3: .07, edge: .37, singeAt: .735, fib: 1 / 290, fox: 9, foxA: .7 };
function renderPaper(Wc, Hc, seed, DPR) {
  noise();
  const v = PV, W = Math.round(Wc * DPR), H = Math.round(Hc * DPR), cv = mk(W, H), g = cv.getContext('2d'), rng = mulberry(seed);
  const o1x = rng() * 512, o1y = rng() * 512, o2x = rng() * 256, o2y = rng() * 256, ex = rng() * 256;
  const m = mk(W, H), mx = m.getContext('2d', { willReadFrequently: true }); mx.fillStyle = '#fff'; mx.beginPath();
  const nicks = [0, 1, 2].map(() => [rng() * H, (2 + rng() * 4) * DPR, rng() < .5]);
  const dk = (y, side) => { let d = (1.5 + s2(ex + side * 97, y / DPR * .9) * 5) * DPR; nicks.forEach(([ny, r, s]) => { if (s === !!side) d += Math.max(0, r - Math.abs(y - ny) * .8); }); return d; };
  mx.moveTo(dk(0, 0), 0); for (let y = 0; y <= H; y += 2 * DPR) mx.lineTo(dk(y, 0), y); for (let y = H; y >= 0; y -= 2 * DPR) mx.lineTo(W - dk(y, 1), y);
  mx.closePath(); mx.fill();
  const md = mx.getImageData(0, 0, W, H).data, A = new Float32Array(W * H); for (let i = 0; i < A.length; i++) A[i] = md[i * 4 + 3] / 255;
  const Hb = blur2(A, W, H, Math.round(6 * DPR));
  const img = g.createImageData(W, H), D = img.data, rs = 11 * DPR;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let a = A[i]; if (a <= 0) continue;
    const X = x / DPR, Y = y / DPR, n1 = s1(X * .7 + o1x, Y * .7 + o1y), n2 = s2(X + o2x, Y + o2y), n3 = s3(X * 2 + o2y, Y * 2 + o2x);
    const e = clamp(1 - (Hb[i] - .5) / .5, 0, 1);
    const mot = 1 + (n1 - .5) * v.m1 * 2 + (n2 - .5) * v.m2 * 2 + (n3 - .5) * v.m3 * 2;
    const roll = Math.exp(-y / rs) + Math.exp(-(H - y) / rs);
    const d = mot * (1 - v.edge * Math.pow(e, 1.5) - .28 * roll);
    let R = v.base[0] * d, G = v.base[1] * d, B = v.base[2] * d;
    const sth = e + (n2 - .5) * .5 + (n1 - .5) * .35, s = clamp((sth - v.singeAt) / .22, 0, 1), c = clamp((sth - v.singeAt - .22) / .14, 0, 1);
    R += (112 - R) * s; G += (56 - G) * s; B += (18 - B) * s; R += (26 - R) * c; G += (12 - G) * c; B += (6 - B) * c;
    if (sth > v.singeAt + .42) a *= clamp(1 - (sth - v.singeAt - .42) / .06, 0, 1);
    const j = i * 4; D[j] = R; D[j + 1] = G; D[j + 2] = B; D[j + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  g.save(); g.globalCompositeOperation = 'source-atop';
  const nf = Math.round(W * H / DPR / DPR * v.fib);
  for (let k = 0; k < nf; k++) { const x = rng() * W, y = rng() * H, l = (3 + rng() * 11) * DPR, a = rng() * Math.PI, bend = (rng() - .5) * 5 * DPR;
    g.strokeStyle = rng() < .6 ? 'rgba(110,72,34,' + (.05 + rng() * .1) + ')' : 'rgba(255,248,226,' + (.12 + rng() * .14) + ')'; g.lineWidth = (.4 + rng() * .5) * DPR;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l / 2 + bend, y + Math.sin(a) * l / 2 - bend, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let k = 0; k < v.fox; k++) { // small age spots, mostly near the edges
    const side = rng(), cx = side < .35 ? rng() * W * .18 : side < .7 ? W - rng() * W * .18 : rng() * W, cy = side > .7 ? H - rng() * H * .35 : rng() * H;
    const n = 2 + Math.floor(rng() * 5);
    for (let p = 0; p < n; p++) { const x = cx + (rng() - .5) * 26 * DPR, y = cy + (rng() - .5) * 20 * DPR, r = (.8 + rng() * 3.2) * DPR;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(120,62,20,' + (.3 + rng() * .3) * v.foxA + ')'); gr.addColorStop(.55, 'rgba(150,90,40,' + .18 * v.foxA + ')'); gr.addColorStop(1, 'rgba(150,90,40,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
  g.restore();
  return cv;
}

/* ---------- E1 turned wooden rods, lit as cylinders, with the paper wound round the middle ---------- */
const MAT = {
  wood: { c: [150, 92, 46], sp: .3, ex: 14, grain: 1 },
  brass: { c: [196, 148, 62], sp: 1.3, ex: 36, metal: 1 },
  paper: { c: null, sp: .06, ex: 6, paper: 1 } };
function finial(u) { // u = 0 at the outer tip, 1 where the knob meets the rod; radius in css px
  if (u < .45) { const q = (u - .225) / .225; return 7.2 * Math.sqrt(Math.max(0, 1 - q * q)) + .3; } if (u < .58) return 2.8;
  if (u < .82) { const q = (u - .7) / .12; return 3.4 + 2.2 * Math.sqrt(Math.max(0, 1 - q * q)); } return 3.2;
}
const RODM = 20; // the paper sits this far in from each end of the rods
function renderEnds(Wc, Hc, seed, DPR) {
  noise();
  const W = Math.round(Wc * DPR), H = Math.round(Hc * DPR), cv = mk(W, H), g = cv.getContext('2d'), rng = mulberry(seed);
  const cy = H / 2, knobL = 15, rodR = 3.2, Rp = 7.6, px0 = RODM - 1, px1 = Wc - RODM + 1;
  const cols = [];
  for (let x = 0; x < W; x++) {
    const X = (x + .5) / DPR; let r, mat = 'wood';
    if (X < knobL) r = finial(X / knobL); else if (X > Wc - knobL) r = finial((Wc - X) / knobL); else r = rodR;
    if (X >= px0 && X <= px1) { const e = Math.min(X - px0, px1 - X), rp = Rp - (e < 1.2 ? (1.2 - e) * .8 : 0); if (rp > r) { r = rp; mat = 'paper'; } }
    cols.push([r * DPR, mat]);
  }
  const L = norm3([-.35, -.78, .52]), Hv = norm3([L[0], L[1], L[2] + 1]), o = rng() * 256;
  const img = g.createImageData(W, H), D = img.data;
  for (let x = 0; x < W; x++) {
    const [r, mat] = cols[x]; if (!r) continue;
    const drdx = (cols[Math.min(W - 1, x + 1)][0] - cols[Math.max(0, x - 1)][0]) / 2, M = MAT[mat], X = x / DPR;
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      if (y < 0 || y >= H) continue; const dy = y + .5 - cy, a = clamp(r - Math.abs(dy) + .5, 0, 1); if (a <= 0) continue;
      const t = clamp(dy / r, -1, 1), nz0 = Math.sqrt(1 - t * t), n = norm3([-drdx * nz0, t, nz0 + .0001]);
      let c = M.c ? M.c.slice() : PV.base.slice();
      const ang = Math.asin(t);
      if (M.grain) { const gr = s2(X * .18 + o, ang * 22 + 40); const k = .82 + .3 * Math.sin(ang * 26 + gr * 9) * .5 + (gr - .5) * .3; c = c.map((v) => v * k); }
      if (M.paper) { const nn = 1 + (s1(X * .7 + o, ang * 18 + 7) - .5) * .4 + (s3(X * 2, ang * 40) - .5) * .12; c = c.map((v) => v * nn);
        const e = Math.min(X - px0, px1 - X), sg = clamp((5 - e) / 5 + (s2(X * 2, ang * 30) - .5) * .5, 0, 1) * .75; c = [c[0] + (110 - c[0]) * sg, c[1] + (54 - c[1]) * sg, c[2] + (18 - c[2]) * sg];
        if (Math.abs(ang - .5) < .05) c = c.map((v) => v * .78); if (Math.abs(ang - .43) < .03) c = c.map((v) => Math.min(255, v * 1.12)); }
      const dif = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]), sp = Math.pow(Math.max(0, n[0] * Hv[0] + n[1] * Hv[1] + n[2] * Hv[2]), M.ex) * M.sp, k = .26 + .9 * dif;
      const j = (y * W + x) * 4; D[j] = c[0] * k + sp * 255; D[j + 1] = c[1] * k + sp * 236; D[j + 2] = c[2] * k + sp * 200; D[j + 3] = a * 255;
    }
  }
  g.putImageData(img, 0, 0);
  g.save(); g.globalCompositeOperation = 'source-atop';
  [px0, px1].forEach((p, side) => { // contact shadows where the paper roll meets the rod
    const x = p * DPR, w = 3.5 * DPR, gr = g.createLinearGradient(side ? x : x - w, 0, side ? x + w : x, 0);
    gr.addColorStop(side ? 0 : 1, 'rgba(0,0,0,.55)'); gr.addColorStop(side ? 1 : 0, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(side ? x : x - w, 0, w, H); });
  [px0, px1].forEach((p, side) => { // the paper roll's ends: a thin spiral, seen almost edge-on
    const x = p * DPR + (side ? -1 : 1) * .8 * DPR, ry = Rp * DPR - .6 * DPR, rx = 1.5 * DPR;
    g.fillStyle = 'rgba(120,70,28,.45)'; g.beginPath(); g.ellipse(x, cy, rx, ry, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(70,35,10,.55)'; g.lineWidth = .45 * DPR; g.beginPath();
    for (let th = 0; th < Math.PI * 2 * 3.2; th += .15) { const rr = ry * (1 - th / (Math.PI * 2 * 3.6)); const xx = x + Math.cos(th) * rx * rr / ry, yy = cy + Math.sin(th) * rr; if (th) g.lineTo(xx, yy); else g.moveTo(xx, yy); } g.stroke();
    g.fillStyle = 'rgba(10,6,4,.6)'; g.beginPath(); g.ellipse(x, cy, rx * .5, rodR * DPR * .95, 0, 0, 7); g.fill(); });
  g.restore();
  return cv;
}

/* ---------- the seal: W9 gold-flecked red wax with the F9 face (Ulhu in the pentagram), the stamp and the R2 ring ---------- */
const HEAD = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAEw0lEQVR4nMVYvW8cRRR/s7IEuWBFB+fElvfcEIt0GDc0FIn/hti4SUjrS5MCKUIgh1BAilSRcm5c8CEkFCV9oEj4KAJFFlCKODlbAmfBZ2x0CsaxU8CgNzNv983szt7exSG/aDK3Ox/vN7/3Zt6sAZ4CzjbPyI/vX5J7MVcAe4yzC2cSYntBUvQzqPHBnASP6cGh51S9tfEYmucW+pr/iRRU5EqgeW5BNN4v17cIpVZ4+vyclKbr7OmTeqDEZwn0Hn+3dx7B8L6KqferGt8nliTAzNiU2FMFG4ocwOX5D50WLo6E9s4OI1eBdUUu2/3K6o2eVBVFxLC+PP+Rem7/+7cxoudvdX5L+lrkKvu0colwRmllSQCo5erfM2PHuqopypD7bnMJxquhabUJthO3GpK727xbGgDckqNhkdsDHzlN7B60/9mC8epo0t7q/K4KWm7v8phD5ba1cUYgeeSkHDpFbg/yyOH42cYpKIK9ISpmQ3RBHyRzN8mbjbdAqP2Zjml1YlX0htiG4ecr0H7UnRzGoI5DRhL9zUJAFJAc4MrNKmKZEOlDOaFmyQ+s4n3x7cb38ouFT6E531QdB3jM0QIRb9Ret94M10KrA4pw9cFNjxmZ/D9dP5rTYtPFeTjto6eO426XeNgHNALVK0ZW1+P1Y9Ar8vTj85BnKE0GfIRwt54ECMPXWKuEsD6hSj3UJQMeVAxhOKEKdaHxYfiqKnzz87AJaCNYczoGNMknS6vSeY7jn/KNORigUM6YN+PofTg6od7F8c+JEhzpTk3jz27XwLFEDutRNZeAaPmeNZ4Q9KSMdFefjySbeZC3QDMyo2qADxSQ5HusKSaSkDI/UEmlZiZjSP3PIud3H8VkGrL25SMhqO5t5+eke755fS6cBuGj4DR4VS2WW2USJInTre+igkIl/jSk6ODjtmU2xwqhS/IoVSm7EF9z0H0x5orE/VwCso8OeTMP+EaKQncJLpaG63nnmeI57eC0JxNmdrGLEgqVvLTLLs8uNuOO39RfFz+xpLs+U/fMSpuFrMpMK1fLPTik0/Dj8pKqN+IODIVVeCfaby2p+Jskd8m+I7hYJetUcjoROaztEWz2Xj9mMhL1AZziy69vQS2sKvdiTbgw1TCXhWeIX1fWLHIUgzwWM+F+5cGN3L8aRCZWJg8fyb3URqxdT0z5QfekXDt5+BVVr66swZ/wULm1NpqSQyyefFd4j5mZ+pTwkYTSXhWFrYqcNOTqKTlOjJDrYiTZlQM7tkWmhTIz56u3CZIbe3lEkwur0IpWveS8BMuS6w7j3pZ2b00cUOSQJJGrHnwBFk/kkysk6H5MT44fUQXPrWhlCabdj22RP07HprTIbcqHity1ty+IxRPvFa61UMG8L37+F4Jp3i794zDGOLn7hlyR7VIEyRg3iDmW51lpvqAzMMFJRwjFHir34sHBMtzKESyDaPlubkxSrJGCP3xzB6qHBqHzx1bpuXNuMz7Y917KPNHy3eQ9nv4Xb34ukcxXJkNQRjjw2SU5Eg7BL7fbUP2/FUQQEYo1zK388B0Ja7AWb6pd24uCPRB0PkI8d9dVds5xrMcbMBK+pMg9NQWjlk5nLrhSpCCCK3UorMGt23cUuV4U/A++dmVyHC+HHAAAAABJRU5ErkJggg==';
const S_SIZE = 220, SB = 176, RS = SB * .285;
const W9 = { col: [116, 10, 20], depth: 1.1, lob: 1, drips: 1, dripL: .8, gloss: 30, spec: 1, R0: .43 };
function faceF9(head) { // the stamp's face as a raised mask and a cut-in mask: ring, pentagram and the original Ulhu head, smaller
  const S = S_SIZE, u = RS * .9;
  const two = () => { const c = mk(S, S), g = c.getContext('2d', { willReadFrequently: true }); g.translate(S / 2, S / 2); g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round'; return [c, g]; };
  const [ca, A] = two(), [cc, C] = two();
  A.lineWidth = .07 * u; A.beginPath(); A.arc(0, 0, .88 * u, 0, 7); A.stroke();
  A.lineWidth = .05 * u; A.beginPath(); [0, 2, 4, 1, 3, 0].forEach((k, i) => { const a = -Math.PI / 2 + k * 1.2566, x = Math.cos(a) * .84 * u, y = Math.sin(a) * .84 * u; if (i) A.lineTo(x, y); else A.moveTo(x, y); }); A.stroke();
  const sprite = (g, cutOnly) => { const c2 = mk(S, S), g2 = c2.getContext('2d', { willReadFrequently: true }); g2.imageSmoothingEnabled = false;
    const bh = RS * 1.7 * .62, bw = bh * head.width / head.height; g2.drawImage(head, S / 2 - bw / 2, S / 2 - bh / 2 + .04 * u, bw, bh);
    if (cutOnly) { const im = g2.getImageData(0, 0, S, S), d = im.data; for (let i = 0; i < d.length; i += 4) { const l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255; d[i + 3] = d[i + 3] && l < .25 ? 255 : 0; } g2.putImageData(im, 0, 0); }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c2, 0, 0); g.restore(); };
  sprite(A, false); sprite(C, true);
  const ad = A.getImageData(0, 0, S, S).data, cd = C.getImageData(0, 0, S, S).data, rel = new Float32Array(S * S), cut = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) { rel[i] = ad[i * 4 + 3] / 255; cut[i] = cd[i * 4 + 3] / 255; }
  return { relB: blur2(rel, S, S, 1), relD: blur2(rel, S, S, 3), eyeB: blur2(cut, S, S, 1) };
}
function makeWax(FM) { // -> { normal: the pressed seal, pool: the unpressed blob of wax }
  noise();
  const S = S_SIZE, Rs = RS, w = W9, rng = mulberry(hashStr('W9'));
  const lob = []; for (let k = 0; k < 6; k++) lob.push([rng() * 6.28, 2 + Math.floor(rng() * 6), (.015 + rng() * .035) * w.lob]);
  const drips = []; for (let k = 0; k < w.drips; k++) drips.push([Math.PI / 2 + (rng() - .5) * 2.2, (.04 + rng() * .05) * w.dripL]);
  const R0 = SB * w.R0, Hm = new Float32Array(S * S), Hp = new Float32Array(S * S), Am = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, dx = x + .5 - S / 2, dy = y + .5 - S / 2, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    let rb = 1; lob.forEach(([p, f, a]) => { rb += a * Math.sin(f * th + p); });
    drips.forEach(([p, a]) => { let dd = Math.abs(th - p); if (dd > Math.PI) dd = 6.283 - dd; rb += a * Math.exp(-dd * dd / .012); });
    rb *= R0;
    const a = clamp(rb - d + .5, 0, 1); if (a <= 0) continue;
    const pool = Math.sqrt(clamp((rb - d) / (SB * .085), 0, 1)) * .82;
    let h = pool;
    if (d < Rs) h = .3 + (FM.relB[i] * .24 + FM.relD[i] * .4 - FM.eyeB[i] * .36) * w.depth - (1 - d / Rs) * .03;
    const lp = (d - Rs - SB * .022) / (SB * .02); h += .2 * Math.exp(-lp * lp);
    const nz = (s2(x * 1.6 + 30, y * 1.6) - .5) * .05;
    Hm[i] = h + nz; Hp[i] = pool * .95 + .1 * Math.max(0, 1 - d / R0) + nz; Am[i] = a;
  }
  const L = norm3([-.5, -.66, .56]), Hv = norm3([L[0], L[1], L[2] + 1]);
  const light = (Hsrc) => { const Hs = blur2(Hsrc, S, S, 1), Hbig = blur2(Hsrc, S, S, 5), c = mk(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), D = img.data;
    for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) { const i = y * S + x; if (Am[i] <= 0) continue;
      const gx = (Hs[i + 1] - Hs[i - 1]) * S * .1, gy = (Hs[i + S] - Hs[i - S]) * S * .1, n = norm3([-gx, -gy, 1]);
      const dif = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]), sp = Math.pow(Math.max(0, n[0] * Hv[0] + n[1] * Hv[1] + n[2] * Hv[2]), w.gloss) * w.spec;
      const ao = clamp((Hbig[i] - Hs[i]) * 3.2, 0, 1), d = Math.hypot(x - S / 2, y - S / 2), thin = d > Rs * 1.15 ? clamp(1 - Hs[i] / .32, 0, 1) : 0;
      const mot = 1 + (s1(x * 1.3, y * 1.3) - .5) * .25, k = mot * (.3 + .95 * dif) * (1 - ao * .6);
      let R = w.col[0] * k + thin * 80 + sp * 250, G = w.col[1] * k + thin * 14 + sp * 215, B = w.col[2] * k + thin * 4 + sp * 205;
      B -= sp * 120; G -= sp * 25; const hh = ((x * 73856093 ^ y * 19349663) >>> 0) % 1000; if (hh < 14) { R += 130 * (.4 + dif); G += 95 * (.4 + dif); B += 25; } // the gold flecks
      const j = i * 4; D[j] = R; D[j + 1] = G; D[j + 2] = B; D[j + 3] = Am[i] * 255; }
    g.putImageData(img, 0, 0); return c.toDataURL(); };
  return { normal: light(Hm), pool: light(Hp) };
}
function stampTop() { // the original stamp seen from above: turned wooden knob, brass shoulder and rim
  const S = 88, KR = 17, c = mk(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), D = img.data, cx = S / 2;
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
function ringR2() { // two brown ink rings with a circle of dots between them, where the seal will go
  const S = 165, U = S * SB / S_SIZE, c = mk(S, S), g = c.getContext('2d'), rng = mulberry(161), cx = S / 2, cy = S / 2, ink = 'rgba(43,26,14,.66)';
  const wob = (r, w, amp) => { g.strokeStyle = ink; g.lineWidth = w; g.beginPath(); const ph = rng() * 6;
    for (let a = 0; a <= 6.4; a += .08) { const rr = r + Math.sin(a * 3 + ph) * amp + (rng() - .5) * .5 * amp; if (a) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.stroke(); };
  wob(U * .37, 1.4, .3); wob(U * .32, .85, .3);
  g.fillStyle = 'rgba(43,26,14,.6)'; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; g.beginPath(); g.arc(cx + Math.cos(a) * U * .345, cy + Math.sin(a) * U * .345, .85, 0, 7); g.fill(); }
  return c.toDataURL();
}
let ART = null, ARTP = null;
function art() { // the seal, stamp and ring, drawn once the head picture has loaded
  if (ARTP) return ARTP;
  ARTP = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = HEAD; })
    .then((im) => new Promise((res) => setTimeout(() => res(im), 0)))
    .then((im) => { try { noise(); const wax = im ? makeWax(faceF9(im)) : { normal: '', pool: '' }; ART = { sl: wax.normal, pool: wax.pool, stamp: stampTop(), ring: ringR2() }; } catch (e) { console.error(e); ART = { sl: '', pool: '', stamp: '', ring: '' }; } return ART; });
  return ARTP;
}

/* ---------- CSS and the ink-bleed filter, injected once ---------- */
const CSS = '' +
'.sc-card{position:relative;padding:4px 0 8px;color:#2b1a0e;text-align:left;-webkit-tap-highlight-color:transparent}' +
'.sc-scroll{position:relative;padding-block:11px}' +
'.sc-roll{position:absolute;left:0;width:100%;height:22px;z-index:3;pointer-events:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))}' +
'.sc-rt{top:0}.sc-rb{bottom:0}' +
'.sc-body{position:relative;margin:0 ' + RODM + 'px;min-height:0}.sc-has-steps .sc-body{min-height:120px}' +   /* 1U.2 (Patryk 29 Oct): no empty room under a quest with no steps */
'.sc-paper,.sc-pact{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}' +
'.sc-paper{background:#d9c49a}.sc-ready .sc-paper{background:none}' +
'.sc-qc{position:relative;padding:20px 16px 18px 14px}' +
'.sc-top{display:flex;align-items:flex-start;gap:30px}' +
'.sc-spot{position:relative;flex:none;width:58px;height:58px;margin:-4px 0 0 10px;border:0;background:none;padding:0;cursor:pointer;border-radius:50%;-webkit-tap-highlight-color:transparent}' +
'.sc-spot:focus-visible,.sc-step:focus-visible{outline:2px solid #e8b04a;outline-offset:3px}' +
'.sc-gh,.sc-pool,.sc-sl{position:absolute;left:-12.25px;top:-12.25px;width:82.5px;height:82.5px;opacity:0;pointer-events:none;max-width:none}' +
'.sc-gh{opacity:1}.sc-sealed .sc-gh{opacity:0}.sc-sealed .sc-sl{opacity:1}' +
'.sc-stamp{position:absolute;left:29px;top:29px;width:0;height:0;pointer-events:none;z-index:4}' +
'.sc-shd{position:absolute;left:-25px;top:-21px;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle,rgba(30,12,4,.45),rgba(30,12,4,0) 78%);filter:blur(3px);opacity:0}' +
'.sc-stp{position:absolute;left:-22px;top:-22px;width:44px;height:44px;opacity:0;max-width:none}' +
'.sc-qt{flex:1;min-width:0;padding-top:2px}' +
'.sc-qn{font:400 20px/1.12 var(--f,\'IM Fell English\',Garamond,Georgia,serif);color:#22100a;text-wrap:balance;overflow-wrap:anywhere;filter:url(#sc-ink);text-shadow:0 0 .6px rgba(34,16,10,.7)}' +
'.sc-qm{font:italic 14px/1.3 var(--f,\'IM Fell English\',Garamond,Georgia,serif);color:#6a4826;margin-top:3px}' +
'.sc-qp{flex:none;display:flex;align-items:center;gap:3px;font:700 16px var(--a,\'Atkinson Hyperlegible\',sans-serif);color:#6e4210;padding-top:3px}' +
'.sc-qp img{height:19px;image-rendering:pixelated}' +
'.sc-steps{display:flex;flex-direction:column;gap:2px;margin:10px 0 0 4px}' +
'.sc-step{display:flex;align-items:center;gap:8px;min-height:34px;width:100%;border:0;background:none;padding:0;cursor:pointer;text-align:left;font:16px/1.2 var(--f,\'IM Fell English\',Garamond,Georgia,serif);color:#2b1a0e;-webkit-tap-highlight-color:transparent}' +
'.sc-bx{flex:none;width:24px;height:24px;overflow:visible;filter:url(#sc-ink)}' +
'.sc-box{fill:none;stroke:#2b170b;stroke-width:1.35;stroke-linejoin:round;opacity:.85}' +
'.sc-tk{fill:none;stroke:#1f0f05;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1;stroke-dashoffset:1;transition:stroke-dashoffset .22s ease-in}' +
'.sc-done .sc-tk{stroke-dashoffset:0}' +
'.sc-blot{display:none;fill:#1f0f05}' +
'.sc-done .sc-blot{display:inline;opacity:.85;transform-box:fill-box;transform-origin:center;animation:sc-in .2s ease-out .05s both}' +
'.sc-st{position:relative;display:inline-block;max-width:100%;color:#26130b;text-shadow:0 0 .4px rgba(38,19,11,.6);transition:color .3s}' +
'.sc-done .sc-st{color:#6e5538;text-shadow:none}' +
'.sc-sk{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;filter:url(#sc-ink);pointer-events:none}' +
'.sc-sk path{fill:none;stroke:#2b170b;stroke-width:1.3;stroke-linecap:round;vector-effect:non-scaling-stroke;stroke-dasharray:1 1;stroke-dashoffset:1;transition:stroke-dashoffset .28s ease-out .12s}' +
'.sc-done .sc-sk path{stroke-dashoffset:0}' +
'.sc-sk .sc-s2{display:none;stroke:#1f0f05;stroke-width:1;opacity:.55}' +
'.sc-done .sc-sk .sc-s2{display:inline;animation:sc-draw .3s ease-out .2s both}' +
'.sc-step:not(.sc-done) .sc-tk,.sc-step:not(.sc-done) .sc-sk path{opacity:0;transition:opacity .15s}' +
'.sc-fire{position:fixed;pointer-events:none;z-index:9999}' +
'@keyframes sc-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}' +
'@keyframes sc-in{from{opacity:0;transform:scale(.4)}to{opacity:.85;transform:none}}' +
'@media (max-width:440px){.sc-spot{margin-left:8px}.sc-top{gap:18px}.sc-qn{font-size:18px}.sc-qc{padding-right:12px}}' +
'@media (prefers-reduced-motion: reduce){.sc-tk,.sc-sk path,.sc-st,.sc-step:not(.sc-done) .sc-tk,.sc-step:not(.sc-done) .sc-sk path{transition:none}.sc-done .sc-blot,.sc-done .sc-sk .sc-s2{animation:none}}';
function css() {
  if (document.getElementById('scroll-css')) return;
  const s = document.createElement('style'); s.id = 'scroll-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s);
  const d = document.createElement('div'); d.setAttribute('aria-hidden', 'true'); d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML = '<svg width="0" height="0"><defs><filter id="sc-ink" x="-20%" y="-40%" width="140%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="4" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="1.3" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>';
  (document.body || document.documentElement).appendChild(d);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => document.querySelectorAll('.sc-card').forEach(strikes));
}

/* ---------- the card ---------- */
const f1 = (v) => v.toFixed(1);
const boxPath = (r) => { const j = () => (r() - .5) * 1.5; return 'M' + f1(3.4 + j()) + ' ' + f1(4.6 + j()) + 'L' + f1(20 + j()) + ' ' + f1(3.8 + j()) + 'L' + f1(20.4 + j()) + ' ' + f1(19.8 + j()) + 'L' + f1(3.9 + j()) + ' ' + f1(20.5 + j()) + 'L' + f1(3.2 + j()) + ' ' + f1(3.6 + j()); };
const tickPath = (r) => { const j = () => (r() - .5) * 1.6; return 'M' + f1(5.5 + j()) + ' ' + f1(12.5 + j()) + 'Q' + f1(8.5 + j()) + ' ' + f1(14.5 + j()) + ' ' + f1(10.2 + j()) + ' 18.6Q' + f1(13 + j()) + ' ' + f1(10 + j()) + ' ' + f1(21 + j()) + ' ' + f1(2.8 + j()); };
const BLOT = '<g class="sc-blot"><circle cx="4.2" cy="13.8" r="1.5"/><circle cx="2.4" cy="12" r=".7"/><circle cx="3.6" cy="16.4" r=".55"/><circle cx="6.6" cy="15.6" r=".45"/></g>';
const metaText = (due, nd, n) => [due || '', n ? nd + ' of ' + n + ' step' + (n === 1 ? '' : 's') : ''].filter(Boolean).join(' \u00b7 ');
function card(q, o) {
  css(); art();
  q = q || {}; o = o || {};
  const steps = q.steps || [], done = !!q.done, r = mulberry(hashStr(q.id + '|' + q.name)), nd = steps.filter((s) => done || s.d).length;
  const ta = typeof o.tickAttrs === 'function' ? o.tickAttrs(q) : (o.tickAttrs || '');
  let pay = o.payHtml;
  if (pay == null) { pay = '+' + esc(q.pay == null ? '' : q.pay); try { const R = window.RUNES && window.RUNES.pick(q.pay, q.id); if (R && R.src) pay += '<img src="' + R.src + '" alt="runes">'; } catch (e) { /* no rune picture */ } }
  const A = ART || {}, src = (s) => (s ? ' src="' + s + '"' : '');
  return '<div class="sc-card' + (done ? ' sc-sealed' : '') + (steps.length ? ' sc-has-steps' : '') + '" data-sc-id="' + esc(q.id) + '" data-sc-due="' + esc(q.due || '') + '">' +
    '<div class="sc-scroll"><canvas class="sc-roll sc-rt"></canvas><div class="sc-body"><canvas class="sc-paper"></canvas><canvas class="sc-pact"></canvas><div class="sc-qc"><div class="sc-top">' +
    '<button type="button" class="sc-spot" ' + ta + ' aria-label="' + (done ? 'Sealed: ' : 'Seal and finish: ') + esc(q.name) + '">' +
    '<img class="sc-gh" alt=""' + src(A.ring) + '><img class="sc-pool" alt=""' + src(A.pool) + '><img class="sc-sl" alt=""' + src(A.sl) + '><span class="sc-stamp"><i class="sc-shd"></i><img class="sc-stp" alt=""' + src(A.stamp) + '></span></button>' +
    '<div class="sc-qt" ' + (o.bodyAttrs || '') + '><div class="sc-qn">' + esc(q.name) + '</div><div class="sc-qm">' + esc(metaText(q.due, nd, steps.length)) + '</div></div>' +
    '<div class="sc-qp">' + pay + '</div></div>' +
    (steps.length ? '<div class="sc-steps">' + steps.map((s, i) => { const on = done || !!s.d;
      return '<button type="button" class="sc-step' + (on ? ' sc-done' : '') + '" data-sc-i="' + i + '" ' + (o.attrs ? o.attrs(i) : '') + ' aria-pressed="' + on + '">' +
        '<svg class="sc-bx" viewBox="0 0 24 24" aria-hidden="true"><path class="sc-box" d="' + boxPath(r) + '"/><path class="sc-tk" pathLength="1" d="' + tickPath(r) + '"/>' + BLOT + '</svg>' +
        '<span class="sc-st">' + esc(s.n) + '<svg class="sc-sk" aria-hidden="true"></svg></span></button>'; }).join('') + '</div>' : '') +
    '</div></div><canvas class="sc-roll sc-rb"></canvas></div></div>';
}

// one ink line (and its fainter twin) per line of the step's text, from the first letter to the last
function strikes(el) {
  el.querySelectorAll('.sc-st').forEach((st) => {
    const svg = st.querySelector('.sc-sk'), tn = st.firstChild; if (!svg || !tn || tn.nodeType !== 3) return;
    const sr = st.getBoundingClientRect(); if (sr.width < 2) return;
    const rg = document.createRange(); rg.selectNodeContents(tn); const rects = Array.prototype.filter.call(rg.getClientRects(), (b) => b.width > 2);
    const key = rects.map((b) => f1(b.left - sr.left) + ',' + f1(b.top - sr.top) + ',' + f1(b.width)).join(';'); if (svg._k === key) return; svg._k = key;
    const rng = mulberry(hashStr(tn.textContent)), j = () => (rng() - .5) * 1.6;
    svg.setAttribute('viewBox', '0 0 ' + f1(sr.width) + ' ' + f1(sr.height));
    let h = '';
    rects.forEach((b) => { const x0 = b.left - sr.left - 2, x1 = b.right - sr.left + 2, y = b.top - sr.top + b.height * .56, w = x1 - x0;
      h += '<path pathLength="1" d="M' + f1(x0) + ' ' + f1(y + j()) + 'Q' + f1(x0 + w * .3) + ' ' + f1(y - 1 + j()) + ' ' + f1(x0 + w * .55) + ' ' + f1(y + j()) + 'T' + f1(x1) + ' ' + f1(y - .6 + j()) + '"/>' +
        '<path class="sc-s2" pathLength="1" d="M' + f1(x0 + 3) + ' ' + f1(y + 2.2 + j()) + 'Q' + f1(x0 + w * .35) + ' ' + f1(y + 1.2 + j()) + ' ' + f1(x0 + w * .6) + ' ' + f1(y + 2.6 + j()) + 'T' + f1(x1 - 3) + ' ' + f1(y + 1.8 + j()) + '"/>'; });
    svg.innerHTML = h;
  });
}

/* ---------- painting: parchment and rods cached by quest and size ---------- */
const CACHE = new Map(), CACHE_MAX = 12; // a parchment is about W*H*4 bytes (1.5 MB at 360 px on a 2x phone)
const QUEUE = []; let busy = false;
const put = (cv, src) => { if (cv.width !== src.width || cv.height !== src.height) { cv.width = src.width; cv.height = src.height; } const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(src, 0, 0); };
function apply(el, C) {
  put(el.querySelector('.sc-paper'), C.paper); put(el.querySelector('.sc-rt'), C.rt); put(el.querySelector('.sc-rb'), C.rb);
  el._scKey = C.key; el.querySelector('.sc-body').classList.add('sc-ready');
}
function fill(el) {
  const A = ART; if (!A) return;
  const set = (s, v) => { const n = el.querySelector(s); if (n && v && n.getAttribute('src') !== v) n.src = v; };
  set('.sc-gh', A.ring); set('.sc-pool', A.pool); set('.sc-sl', A.sl); set('.sc-stp', A.stamp);
}
function pump() {
  if (busy) return; busy = true;
  setTimeout(function next() {
    const job = QUEUE.shift(); if (!job) { busy = false; return; }
    const els = job.els.filter((el) => el.isConnected && el._scWant === job.key);
    if (els.length) try {
      let C = CACHE.get(job.key);
      if (!C) { const sd = hashStr(job.id); C = { key: job.key, paper: renderPaper(job.bw, job.bh, sd, job.DPR), rt: renderEnds(job.sw, 22, sd + 1, job.DPR), rb: renderEnds(job.sw, 22, sd + 2, job.DPR) };
        CACHE.set(job.key, C); while (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value); }
      els.forEach((el) => { apply(el, C); if (el.classList.contains('sc-sealed')) pact(el, true); });
    } catch (e) { console.error(e); }
    setTimeout(next, 0);
  }, 30);
}
function paint(root) {
  css();
  root = root || document;
  const DPR = DPRf(); let queued = false;
  if (!ART) art().then(() => { (root.isConnected === false ? document : root).querySelectorAll('.sc-card').forEach(fill); });
  Array.prototype.forEach.call(root.querySelectorAll('.sc-card'), (el) => {
    fill(el);
    const body = el.querySelector('.sc-body'), bw = body.offsetWidth, bh = body.offsetHeight, sw = el.querySelector('.sc-scroll').offsetWidth;
    if (bw < 50) return; // hidden: try again on the next paint
    strikes(el);
    const id = el.getAttribute('data-sc-id') || '', key = id + '|' + bw + 'x' + bh + '|' + sw + '@' + DPR;
    el._scWant = key;
    if (el._scKey === key) return;
    const C = CACHE.get(key); if (C) { apply(el, C); if (el.classList.contains('sc-sealed')) pact(el, true); return; }
    // not drawn yet: show the same quest's last parchment straight away (stretched a little), swap in the new one when drawn
    let old = null; CACHE.forEach((c) => { if (c.key.indexOf(id + '|') === 0) old = c; });
    if (old && !el._scKey) { apply(el, old); el._scKey = ''; }
    const job = QUEUE.find((j) => j.key === key);
    if (job) job.els.push(el); else QUEUE.push({ key, id, bw, bh, sw, DPR, els: [el] });
    queued = true;
  });
  if (queued) pump();
}
const find = (id) => { const s = String(id).replace(/["\\]/g, '\\$&'); return document.querySelector('.sc-card[data-sc-id="' + s + '"]'); };

/* ---------- ticking a step ---------- */
function setStep(el, b, on) {
  b.classList.toggle('sc-done', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
  const all = el.querySelectorAll('.sc-step'), nd = el.querySelectorAll('.sc-step.sc-done').length;
  const qm = el.querySelector('.sc-qm'); if (qm) qm.textContent = metaText(el.getAttribute('data-sc-due'), nd, all.length);
}
function tickStep(id, i, on) {
  const el = find(id); if (!el) return;
  const b = el.querySelector('.sc-step[data-sc-i="' + i + '"]'); if (!b) return;
  strikes(el); void b.getBoundingClientRect(); // fresh strike lines need a style pass before they can animate in
  setStep(el, b, on !== false);
}

/* ---------- the seal: T2 timing, wax first, then the K1a stamp onto it; the wax spreads from under the stamp ---------- */
const T2 = 1050;
async function press(spot, onHit) {
  const P = T2, q = (s) => spot.querySelector(s), img = q('.sc-stp'), shd = q('.sc-shd'), pool = q('.sc-pool'), sl = q('.sc-sl'), gh = q('.sc-gh');
  // 1. a drop of wax lands and pools, on its own
  anim(pool, [{ opacity: 0, transform: 'translateY(-14px) scale(.18)' }, { opacity: 1, transform: 'translateY(0) scale(.3)', offset: .4 }, { opacity: 1, transform: 'scale(.64)', offset: .8 }, { opacity: 1, transform: 'scale(.7)' }], { duration: P * .3, fill: 'forwards', easing: 'ease-out' });
  await wait(P * .36);
  // 2. the stamp comes down onto it, its shadow closing in
  anim(img, [{ opacity: 0, transform: 'scale(1.9)' }, { opacity: 1, offset: .3 }, { opacity: 1, transform: 'none' }], { duration: P * .24, fill: 'forwards', easing: 'cubic-bezier(.45,0,.85,.6)' });
  anim(shd, [{ opacity: .1, transform: 'scale(1.8)' }, { opacity: .85, transform: 'scale(1)' }], { duration: P * .24, fill: 'forwards', easing: 'ease-in' });
  await wait(P * .24);
  // 3. it presses and settles, and the wax spreads out from under it
  if (onHit) onHit();
  cancel(img); img.style.opacity = 1;
  anim(img, [{ transform: 'none' }, { transform: 'scale(.955)', offset: .3 }, { transform: 'scale(1.01)', offset: .65 }, { transform: 'none' }], { duration: P * .22, fill: 'forwards' });
  cancel(pool); pool.style.opacity = 1;
  anim(pool, [{ transform: 'scale(.7)' }, { transform: 'scale(1.03)', offset: .75 }, { transform: 'scale(1)' }], { duration: P * .2, fill: 'forwards', easing: 'cubic-bezier(.2,.7,.3,1)' });
  anim(gh, [{ opacity: 1 }, { opacity: 0 }], { duration: P * .1, fill: 'forwards' });
  await wait(P * .22);
  // 4. hold a moment, then lift to show the seal
  sl.style.opacity = 1; cancel(pool); pool.style.opacity = 0;
  await wait(P * .06);
  cancel(img);
  anim(img, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.6)' }], { duration: P * .12, fill: 'forwards', easing: 'ease-in' });
  cancel(shd);
  anim(shd, [{ opacity: .85, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.7)' }], { duration: P * .14, fill: 'forwards' });
  await wait(P * .12); img.style.opacity = '';
}

/* ---------- the pact: C1's sea-green double ring, runes and veins, drying to C2's dark red-brown, inside the parchment ---------- */
const PA = { dur: 1900, glow: 14, linger: .62, R: 29, dgap: 11, runeR: 35, rs: .7, nr: 16, n: 15, len: [10, 46], w: 1.7, vStart: 27,
  wet: [70, 222, 140], dried: [66, 12, 10], vlinger: .8, scorch: [64, 10, 10], vglow: 'rgba(94,242,160,.9)' };
const GREEN = [94, 242, 160];
const GLY = [[[0, -1, 0, 1], [0, -.9, .6, -.4]], [[0, -1, 0, 1], [0, -.9, .6, -.4], [0, -.3, .6, .2]], [[0, -1, 0, 1], [0, -1, -.5, -.4], [0, -1, .5, -.4]], [[-.5, -1, .5, 1], [.5, -1, -.5, 1]],
  [[0, -1, .5, 0], [.5, 0, 0, 1], [0, 1, -.5, 0], [-.5, 0, 0, -1]], [[0, -1, 0, 1], [0, -.5, .5, 0], [.5, 0, 0, .5]], [[.5, -1, -.3, 0], [-.3, 0, .5, 1]], [[0, -1, 0, 1], [0, -.2, -.5, -.9], [0, -.2, .5, -.9]]];
// still = true draws the dried mark at once (a sealed quest, or reduced motion); otherwise it animates and resolves when done
function pact(el, still) {
  const host = el.querySelector('.sc-body'), spot = el.querySelector('.sc-spot'), cv = host && host.querySelector('.sc-pact'); if (!cv) return Promise.resolve();
  const P = PA, DPR = DPRf(), W = host.offsetWidth, H = host.offsetHeight; if (W < 50) return Promise.resolve();
  const hr = host.getBoundingClientRect(), sr = spot.getBoundingClientRect(), cx = sr.left - hr.left + sr.width / 2, cy = sr.top - hr.top + sr.height / 2;
  if (still && cv._still === W + 'x' + H + '@' + DPR) return Promise.resolve();
  cv._still = still ? W + 'x' + H + '@' + DPR : '';
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); const g = cv.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0); g.lineCap = 'round'; g.lineJoin = 'round';
  if (cv._raf) cancelAnimationFrame(cv._raf); cv._raf = 0;
  const rng = mulberry(still ? hashStr(el.getAttribute('data-sc-id') + '|pact') : (Math.random() * 4294967296) >>> 0);
  // the veins keep off the writing and stay well inside the parchment
  const forb = []; host.querySelectorAll('.sc-qn, .sc-qm, .sc-qp, .sc-step').forEach((e) => { const b = e.getBoundingClientRect(); if (b.width) forb.push([b.left - hr.left - 4, b.top - hr.top - 4, b.right - hr.left + 4, b.bottom - hr.top + 4]); });
  const blocked = (x, y) => forb.some((f) => x > f[0] && x < f[2] && y > f[1] && y < f[3]);
  const veins = [];
  const grow = (x, y, a, w, len, depth) => { const pts = [[x, y, w, 0]]; let L = 0;
    while (L < len && w > .35) { a += (rng() - .5) * .7; const st = 3 + rng() * 2; x += Math.cos(a) * st; y += Math.sin(a) * st; const de = Math.min(x, y - 6, W - x, H - y - 6); if (de < 13 || blocked(x, y)) break; L += st; w *= de < 26 ? .8 : .975; pts.push([x, y, w, L]);
      if (depth < 2 && rng() < .07) grow(x, y, a + (rng() < .5 ? -1 : 1) * (.5 + rng() * .6), w * .65, (len - L) * .55, depth + 1); }
    veins.push({ pts, total: L }); };
  for (let k = 0; k < P.n; k++) { const a = k / P.n * 6.283 + (rng() - .5) * .35; grow(cx + Math.cos(a) * P.vStart, cy + Math.sin(a) * P.vStart, a, P.w, P.len[0] + Math.pow(rng(), 1.6) * (P.len[1] - P.len[0]), 0); }
  const draw = (t) => {
    g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.rect(7, 7, W - 14, H - 14); g.clip();
    // the ring and runes
    const ring = clamp(t / .3, 0, 1), sink = clamp((t - .7) / .3, 0, 1), col = mix3(GREEN, P.scorch, sink), a = lerp(.95, P.linger, sink), r = P.R * (1 - Math.pow(1 - ring, 3)) * (1 - sink * .04);
    if (sink > 0) { g.strokeStyle = 'rgba(95,40,15,' + (.16 * sink) + ')'; g.lineWidth = 9; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
      g.beginPath(); g.arc(cx, cy, P.runeR, 0, 7); g.lineWidth = 10; g.strokeStyle = 'rgba(95,40,15,' + (.07 * sink) + ')'; g.stroke(); }
    g.shadowColor = rgbaA(GREEN, .9); g.shadowBlur = (1 - sink) * P.glow; g.strokeStyle = rgbaA(col, a); g.lineWidth = lerp(2.2, 1.4, sink);
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
    g.lineWidth = lerp(1.6, 1.1, sink); g.beginPath(); g.arc(cx, cy, r + P.dgap, 0, 7); g.stroke();
    const shown = Math.floor(clamp((t - .15) / .4, 0, 1) * P.nr), rs = P.rs;
    for (let k = 0; k < shown; k++) { const ang = -Math.PI / 2 + k / P.nr * 6.283;
      g.save(); g.translate(cx + Math.cos(ang) * P.runeR, cy + Math.sin(ang) * P.runeR); g.rotate(ang + Math.PI / 2); g.lineWidth = lerp(1.6, 1.1, sink);
      GLY[k % GLY.length].forEach(([x0, y0, x1, y1]) => { g.beginPath(); g.moveTo(x0 * 3.2 * rs, y0 * 4.6 * rs); g.lineTo(x1 * 3.2 * rs, y1 * 4.6 * rs); g.stroke(); }); g.restore(); }
    g.shadowBlur = 0;
    // the veins
    const ge = .75, gw = 1 - Math.pow(1 - clamp(t / ge, 0, 1), 2), dry = clamp((t - ge) / (1 - ge), 0, 1), al = lerp(.82, P.vlinger, dry), vc = rgbaA(mix3(P.wet, P.dried, dry), al);
    veins.forEach((v) => { const lim = v.total * gw;
      for (let k = 1; k < v.pts.length; k++) { const q = v.pts[k], p0 = v.pts[k - 1];
        if (q[3] > lim) { if (dry < 1) { g.fillStyle = rgbaA(mix3(P.wet, [255, 255, 255], .3), .7 * (1 - dry)); g.shadowColor = P.vglow; g.shadowBlur = 6; g.beginPath(); g.arc(p0[0], p0[1], 1.6, 0, 7); g.fill(); g.shadowBlur = 0; } break; }
        g.strokeStyle = vc; g.lineWidth = q[2]; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(q[0], q[1]); g.stroke(); } });
    g.restore();
  };
  if (still) { draw(1); return Promise.resolve(); }
  return new Promise((done) => { const t0 = performance.now();
    (function frame(now) { const t = clamp((now - t0) / P.dur, 0, 1); draw(t); if (t < 1) cv._raf = requestAnimationFrame(frame); else { cv._raf = 0; done(); } })(t0); });
}

/* ---------- the B2 burn: two ember lines from the left and right edges meet in the middle; sparks, then lingering ash ---------- */
function burn(el, D) {
  return new Promise((done) => {
    const sc = el.querySelector('.sc-scroll'), W = Math.round(sc.offsetWidth), H = Math.round(sc.offsetHeight), DPR = DPRf(), cr = sc.getBoundingClientRect();
    // the embers and ash live in their own layer above the page, so they outlive the card
    const fire = document.createElement('canvas'); fire.className = 'sc-fire'; fire.setAttribute('aria-hidden', 'true');
    const fw = W + 40, fh = H + 60; fire.width = Math.round(fw * DPR); fire.height = Math.round(fh * DPR);
    fire.style.cssText = 'left:' + (cr.left - 20) + 'px;top:' + (cr.top - 46) + 'px;width:' + fw + 'px;height:' + fh + 'px';
    document.body.appendChild(fire); const g = fire.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const rng = mulberry(hashStr(el.getAttribute('data-sc-id') + 'both')), o = rng() * 200, amp = 8;
    const phi = new Float32Array(W * H), inside = new Uint8Array(W * H); let pmin = 1e9, pmax = -1e9;
    noise();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = (s2(x * .55 + o, y * .55) - .5) * 2.6 * amp + (s3(x * 1.3, y * 1.3 + o) - .5) * 3, p = Math.min(x, W - x) + n, i = y * W + x;
      phi[i] = p; if (p < pmin) pmin = p; if (p > pmax) pmax = p;
      inside[i] = (y < 22 || y > H - 22) || (x >= RODM && x < W - RODM) ? 1 : 0;
    }
    const mkc = mk(W, H), mx = mkc.getContext('2d'), mImg = mx.createImageData(W, H), md = mImg.data;
    const ov = mk(W, H), ox = ov.getContext('2d'), oImg = ox.createImageData(W, H), od = oImg.data;
    for (let i = 0; i < W * H; i++) { md[i * 4] = md[i * 4 + 1] = md[i * 4 + 2] = 255; }
    sc.style.maskSize = sc.style.webkitMaskSize = W + 'px ' + H + 'px'; sc.style.maskRepeat = sc.style.webkitMaskRepeat = 'no-repeat'; sc.style.maskPosition = sc.style.webkitMaskPosition = '0 0';
    const Pt = [], t0 = performance.now(), cw = 14, LIMIT = t0 + D + 4000; let last = t0, ended = false;
    (function frame(now) {
      const p = clamp((now - t0) / D, 0, 1), tau = pmin - 3 + (pmax - pmin + 6) * p, dt = Math.min(50, now - last); last = now;
      g.clearRect(0, 0, fw, fh);
      if (!ended) {
        const em = [];
        for (let i = 0; i < W * H; i++) { const d = phi[i] - tau, j = i * 4;
          md[j + 3] = d <= 0 ? 0 : d < 1.2 ? d / 1.2 * 255 : 255;
          if (!inside[i] || d < -1.6 || d > cw) { od[j + 3] = 0; continue; }
          if (d < 1.8) { const k = 1 - Math.abs(d - .1) / 1.8; od[j] = 255; od[j + 1] = 150 + 100 * k; od[j + 2] = 60 + 120 * k * k; od[j + 3] = 255 * clamp(k * 1.3, 0, 1); if (rng() < .004) em.push(i); }
          else { const q = (d - 1.8) / (cw - 1.8); od[j] = 14 + 100 * q; od[j + 1] = 6 + 50 * q; od[j + 2] = 2 + 16 * q; od[j + 3] = 250 * (1 - q) * (1 - q); } }
        mx.putImageData(mImg, 0, 0); const url = 'url(' + mkc.toDataURL() + ')'; sc.style.maskImage = sc.style.webkitMaskImage = url;
        ox.putImageData(oImg, 0, 0);
        g.save(); g.translate(20, 46); g.drawImage(ov, 0, 0); g.globalCompositeOperation = 'lighter'; g.filter = 'blur(3px)'; g.drawImage(ov, 0, 0); g.filter = 'none'; g.restore();
        for (let k = 0; k < Math.min(em.length, 3 * dt / 16); k++) { const i = em[Math.floor(rng() * em.length)]; Pt.push({ x: i % W, y: (i / W) | 0, vx: (rng() - .3) * 50, vy: -(30 + rng() * 110), life: 0, max: 500 + rng() * 800 }); }
        for (let k = 0; k < Math.min(em.length, 1.6 * dt / 16); k++) { const i = em[Math.floor(rng() * em.length)]; Pt.push({ x: i % W, y: (i / W) | 0, vx: (rng() - .5) * 22, vy: -(6 + rng() * 26), life: 0, max: 1100 + rng() * 1100, ash: 1, r: rng() * 6, z: .8 + rng() * 1.6 }); }
      }
      g.save(); g.translate(20, 46); g.globalCompositeOperation = 'lighter';
      for (let k = Pt.length - 1; k >= 0; k--) { const q = Pt[k]; q.life += dt; if (q.life > q.max) { Pt.splice(k, 1); continue; }
        const ax = q.x, ay = q.y; q.x += q.vx * dt / 1000; q.y += q.vy * dt / 1000; q.vy *= .99; const a = 1 - q.life / q.max;
        if (q.ash) { g.globalCompositeOperation = 'source-over'; q.r += dt * .004; q.x += Math.sin(q.life * .008 + q.r) * .25; g.save(); g.translate(q.x, q.y); g.rotate(q.r); g.fillStyle = 'rgba(38,32,30,' + (a * .85) + ')'; g.fillRect(-q.z, -q.z * .45, q.z * 2, q.z * .9);
          if (q.life < q.max * .3) { g.fillStyle = 'rgba(255,120,40,' + (a * .7) + ')'; g.fillRect(-q.z, -q.z * .45, .7, q.z * .9); } g.restore(); g.globalCompositeOperation = 'lighter'; continue; }
        g.strokeStyle = 'rgba(255,' + Math.round(150 + 90 * a) + ',60,' + a + ')'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(ax, ay); g.lineTo(q.x, q.y); g.stroke();
        g.fillStyle = 'rgba(255,240,190,' + a + ')'; g.fillRect(q.x - .6, q.y - .6, 1.2, 1.2); }
      g.restore();
      if (p >= 1 && !ended) { ended = true; sc.style.opacity = 0; done(); }
      if ((p < 1 || Pt.length) && now < LIMIT) requestAnimationFrame(frame); else fire.remove();
    })(t0);
  });
}

async function seal(id) {
  const el = find(id); if (!el) return;
  if (el._scSeal) return el._scSeal;
  el._scSeal = (async () => {
    css(); await art(); fill(el);
    if (!el.querySelector('.sc-body').classList.contains('sc-ready')) paint(el.parentNode || document);
    strikes(el); void el.offsetWidth;
    el.querySelectorAll('.sc-step:not(.sc-done)').forEach((b) => setStep(el, b, true));
    const spot = el.querySelector('.sc-spot'), sc = el.querySelector('.sc-scroll');
    if (RM()) { spot.querySelector('.sc-gh').style.opacity = 0; spot.querySelector('.sc-sl').style.opacity = 1; pact(el, true); await wait(900); sc.style.opacity = 0; await wait(200); return; }
    await press(spot, () => pact(el, false));
    await wait(Math.max(1000, PA.dur * .9));
    await burn(el, 350);
    await wait(600);
  })().catch((e) => { console.error(e); });
  return el._scSeal;
}

window.SCROLL = { card, paint, tickStep, seal };
})();
