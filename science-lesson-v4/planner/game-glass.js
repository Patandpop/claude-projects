/* Stained glass (Patryk's final picks, 2026-10-28, from the "Absolution Glass" mock-up, round eight):
   G1 blessing glass with his tweaks (G1r): SC2 medium stars, each a five-point star of five honey diamond pieces, the glass
   round every star cut to fit it (two rings of pieces whose joins radiate from its points and notches), a gently curving
   path of shaped pieces from star to star, the BRIGHTER pale-blue path and the brighter ring of pieces round each star,
   a honey border band, hairline lead, and light that moves left to right (background a little, path more, stars most).
   X2 Absolution card: the curse wrapped in a dark red shell; Absolution I lights the half of the glass nearest the curse
   (calm small steps from the bottom corner) while faint hairlines creep over the shell; Absolution II lights only from where
   I stopped (the middle) to the far end, the hairlines split into bright cracks, then A1b "Absolved" (the light dims behind
   the word) and the shell falls away. A honey line of light runs along the lead where lit glass meets dark glass, so you can
   see how far the light has reached. Stars ignite with a small four-point spark and thin rays, then twinkle. H3: sparks
   rise from the glass and land on the health bar, one sliver of health each.
   D1 day in glass (the Vespers night line, NG1): one tall window, morning at the top, evening at the bottom; blessings are
   honey stars right of a fixed middle line, curses are blood moons left of it, and the path weaves between them in time
   order (right for a blessing, left for a curse); the light fills down the glass with a bright front and the same honey edge.

   API (one global, window.GLASS):
   GLASS.tile(opts) -> HTML for a blessing tile's glass background (position:absolute, inset 0, z-index 1: put it first inside
     the tile button, which needs position:relative and overflow:hidden; class gl-tilebox on the button adds the G1 tile edge).
     opts { key (seed and handle), w, h (optional glass size in px; measured from the tile when left out), lit 0-1,
            anim (true: sweep the light in the first time this key is painted) }
   GLASS.absolution(opts) -> HTML for the whole Absolution card (curse half + glass antidote half).
     opts { key (handle; default from the two names), curse { name, key (omen picture), img (URL override), hp, attrs },
            blessing { name, key, img, pay (runes), attrs }, stage 0|1|2 (steps done), hpBack (total health lost: shown as
            two halves like game-ui, floor half first; or [first, second]) }
     attrs are raw attribute strings for the two <button>s (data-a etc.), like STONE's tickAttrs.
   GLASS.light(key, stage, o) animates whatever holds that key:
     card: to stage 1 or 2 (0 -> 2 plays both). o { to (element or selector: H3 sparks fly to it), from, upto (0-1 along it,
       where the bar is now and where it ends), onSpark(k, n), onDone(el) }. After stage 2 the card plays Absolved and then
       fires a bubbling 'gl-absolved' event (detail.key); the caller then re-renders the two normal tiles.
     tile: to lit level `stage` (0-1, default 1), sweeping left to right; the same level again replays the sweep.
     day: replays the day filling down the glass (stage ignored).
   GLASS.day(events, opts) -> HTML for one day window (aspect 200:320, width 100%, max 340px).
     events [{ t:'HH:MM', side:'c'|'b', name }]; opts { key, play (default true: fill once, the first time the key is shown),
     hours (default true: 08:00 to 20:00 marks), cracked (default true: the pieces where the path crosses the middle line
     are cracked; false = whole pieces, the NG1 test) }.
   GLASS.paint(root) paints every holder inside root (call after inserting the HTML; cheap to repeat).
   GLASS.sparks(fromEl, toEl, o) the H3 sparks on their own: o { n, from, upto, onSpark }.

   Each window is cut once per key and size (seeded by the key), drawn into cached canvases (colour, shade and lead
   layers), and only the light animates; when nothing moves nothing repaints. prefers-reduced-motion: final states at once.
   All CSS classes start with gl-. No em dashes in any visible text. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.GLASS) return;

const RM = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const DPRf = () => Math.min(2, window.devicePixelRatio || 1);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const PI = Math.PI, hyp = Math.hypot;
const sstep = (t) => t * t * (3 - 2 * t);
const eOut = (t) => 1 - Math.pow(1 - t, 3);
// keyframes [[offset, value], ...] at t 0-1, smooth inside each step (close to the mock-up's CSS keyframes)
const kf = (t, f) => { if (t <= f[0][0]) return f[0][1]; for (let i = 1; i < f.length; i++) if (t <= f[i][0]) return lerp(f[i - 1][1], f[i][1], sstep((t - f[i - 1][0]) / (f[i][0] - f[i - 1][0]))); return f[f.length - 1][1]; };
function hashStr(s) { s = String(s); let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 100000 + 1; }
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 12345; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/* ---------- geometry (the mock-up's leaded glass engine, cut down to the picked designs) ---------- */
function clip(poly, f) { const out = []; for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length], fa = f(a[0], a[1]), fb = f(b[0], b[1]);
  if (fa <= 0) out.push(a); if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out; }
function inside(poly, x, y) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
  if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
const cen = (p) => [p.reduce((a, q) => a + q[0], 0) / p.length, p.reduce((a, q) => a + q[1], 0) / p.length];
const area = (p) => Math.abs(p.reduce((a, q, k) => { const n = p[(k + 1) % p.length]; return a + q[0] * n[1] - n[0] * q[1]; }, 0)) / 2;
const rectPoly = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function vorSites(sites, r, lim) { return sites.map((p, i) => { let poly = rectPoly(r[0], r[1], r[2], r[3]); sites.forEach((q, j) => { if (i === j || Math.abs(q[0] - p[0]) > lim || Math.abs(q[1] - p[1]) > lim) return;
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, nx = q[0] - p[0], ny = q[1] - p[1]; poly = clip(poly, (x, y) => (x - mx) * nx + (y - my) * ny); }); return poly; }); }
function border(R, W, H, b, seg) { const out = [], run = (x0, y0, x1, y1, horiz) => { const L = horiz ? x1 - x0 : y1 - y0; let t = 0;
  while (t < L - .5) { let e = Math.min(L, t + seg * (.75 + R() * .5)); if (L - e < seg * .4) e = L; out.push(horiz ? rectPoly(x0 + t, y0, x0 + e, y1) : rectPoly(x0, y0 + t, x1, y0 + e)); t = e; } };
  run(0, 0, W, b, true); run(0, H - b, W, H, true); run(0, b, b, H - b, false); run(W - b, b, W, H - b, false); return out; }
function pickStars(R, zones, gap) { const pts = [];
  zones.forEach(([x0, y0, x1, y1, n]) => { for (let t = 0, got = 0; t < 80 && got < n; t++) { const p = [x0 + R() * (x1 - x0), y0 + R() * (y1 - y0)]; if (pts.every((q) => hyp(q[0] - p[0], q[1] - p[1]) > gap)) { pts.push(p); got++; } } });
  if (!pts.length) return pts; const ch = [pts.shift()];
  while (pts.length) { const l = ch[ch.length - 1]; let bi = 0, bd = 1e9; pts.forEach((s, k) => { const d = hyp(s[0] - l[0], s[1] - l[1]); if (d < bd) { bd = d; bi = k; } }); ch.push(pts.splice(bi, 1)[0]); }
  return ch; }
const sN = (x, y, ro, n, k, rot) => Array.from({ length: n * 2 }, (_, i) => { const a = rot + i * PI / n - PI / 2, rr = i % 2 ? ro * k : ro; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; });
// a five-point star of 5 rhombus pieces meeting at the centre
const rhombi = (x, y, R0, rot) => { const d = R0 / 1.618; return [0, 1, 2, 3, 4].map((k) => { const a = rot - PI / 2 + k * 2 * PI / 5, h = PI / 5;
  return [[x, y], [x + Math.cos(a - h) * d, y + Math.sin(a - h) * d], [x + Math.cos(a) * R0, y + Math.sin(a) * R0], [x + Math.cos(a + h) * d, y + Math.sin(a + h) * d]]; }); };
// a crescent moon: four crescent pieces and one dark piece for the shadowed part
function moonPieces(x, y, r, phi) { const d = .5 * r, ri = .7 * r, rho = (t) => { const a = t - phi; return d * Math.cos(a) + Math.sqrt(ri * ri - d * d * Math.sin(a) * Math.sin(a)); };
  let al = 0; for (let k = 0; k <= 200; k++) { const a = k / 200 * PI; if (rho(phi + PI + a) < r - .01) al = a; }
  const out = [], N = 4; for (let i = 0; i < N; i++) { const ta = phi + PI - al + 2 * al * i / N, tb = phi + PI - al + 2 * al * (i + 1) / N, q = [];
    for (let k = 0; k <= 5; k++) { const t = ta + (tb - ta) * k / 5; q.push([x + Math.cos(t) * r, y + Math.sin(t) * r]); }
    for (let k = 5; k >= 0; k--) { const t = ta + (tb - ta) * k / 5, rr = Math.min(r, rho(t)); q.push([x + Math.cos(t) * rr, y + Math.sin(t) * rr]); } out.push(q); }
  out.push(Array.from({ length: 36 }, (_, k) => { const t = k / 36 * 2 * PI, rr = Math.min(r, rho(t)); return [x + Math.cos(t) * rr, y + Math.sin(t) * rr]; }));
  return out; }

// the antique palette (hue, saturation, lightness): only the families the picked designs use
const PAL = {
  bg: [[220, 60, 30], [228, 52, 26], [214, 64, 33], [242, 42, 28], [205, 55, 30], [256, 38, 30]],
  border: [[36, 48, 46], [32, 44, 40], [40, 50, 52], [28, 42, 44]],
  paleB: [[214, 54, 58], [220, 50, 62], [208, 56, 56], [224, 46, 60]], midB: [[216, 50, 50], [222, 46, 52], [210, 52, 48]],
  haloB: [[218, 52, 37], [210, 56, 39], [226, 46, 37]], halo: [[222, 50, 35], [214, 54, 36], [230, 44, 35]],
  star: [[42, 60, 72], [38, 56, 66], [46, 58, 76], [40, 52, 70], [36, 58, 68]],
  cbg: [[345, 45, 20], [330, 36, 22], [352, 50, 18], [318, 30, 20]], redp: [[352, 62, 44], [2, 58, 42], [346, 56, 46]],
  blood: [[356, 82, 56], [350, 76, 52], [4, 80, 55], [348, 72, 49]], chaloD: [[340, 40, 12], [350, 44, 14], [332, 36, 13]], shadow: [[232, 40, 11], [242, 30, 9]] };
const hsl = (h, s, l) => 'hsl(' + h.toFixed(0) + ',' + clamp(s, 10, 95).toFixed(0) + '%,' + clamp(l, 4, 90).toFixed(0) + '%)';
// one sheet of streaky glass: a linear gradient across the piece's box, six stops
function gradSpec(R, c) { const a = R() * PI, x = Math.cos(a) * .5, y = Math.sin(a) * .5, h = c[0] + (R() - .5) * 10, s = c[1] + (R() - .5) * 12, l = c[2] + (R() - .5) * 6;
  const st = [[0, 6], [.16 + R() * .1, -5], [.36 + R() * .1, 9], [.55 + R() * .08, -6], [.74 + R() * .1, 5], [1, -3]];
  return { x1: .5 - x, y1: .5 - y, x2: .5 + x, y2: .5 + y, st: st.map(([o, d]) => [o, hsl(h + (R() - .5) * 8, s + (R() - .5) * 8, l + d)]) }; }

function cut(o) {
  const W = o.w, H = o.h, R = rng(o.seed || 1), b = o.border || 0, inner = [b, b, W - b, H - b], pcs = [], F = o.fit;
  if (b) border(R, W, H, b, o.bseg || 12).forEach((p) => pcs.push({ p, fam: 'border' }));
  let stars = o.events ? o.events.map((e) => [e.x, e.y]) : pickStars(R, o.zones || [], o.starGap || 24);
  const sizes = o.sizes(stars.length, R);
  stars = stars.map((s, k) => { const m = b + sizes[k] + 1.5; return [clamp(s[0], m, W - m), clamp(s[1], m, H - m)]; });
  const s0 = o.s || 10, cols = Math.max(1, Math.round((inner[2] - inner[0]) / s0)), rows = Math.max(1, Math.round((inner[3] - inner[1]) / s0)), sx = (inner[2] - inner[0]) / cols, sy = (inner[3] - inner[1]) / rows;
  const srot = stars.map(() => (R() - .5) * .3), motif = (k) => (o.motif ? o.motif(k) : 'star');
  // G1: rings of pieces round every star, so their joins radiate from its points and notches; each touching piece is trimmed
  // along the star's edge; the path is a curved run of fuller shaped pieces flowing into the ring pieces facing the next star
  const outR = (k) => F.rings[F.rings.length - 1].r * sizes[k], sites = [], nC = o.nChain || stars.length;
  const nb = stars.map((s, k) => (k >= nC ? [] : [stars[k - 1], k + 1 < nC ? stars[k + 1] : null]).filter(Boolean).map((q) => Math.atan2(q[1] - s[1], q[0] - s[0])));
  stars.forEach((s, k) => { const R0 = sizes[k], a0 = srot[k] - PI / 2;
    F.rings.forEach((rg, ri) => { const n = rg.n, off = rg.off != null ? rg.off : PI / n, ring = [];
      for (let i = 0; i < n; i++) { const a = a0 + off + (rg.tw || 0) + i * 2 * PI / n, rr = rg.r * R0 * (1 + (ri ? (R() - .5) * (rg.jr || 0) : 0));
        ring.push({ x: s[0] + Math.cos(a) * rr, y: s[1] + Math.sin(a) * rr, a, star: k, ri }); }
      nb[k].forEach((na) => { let bi = 0, bd = 9; ring.forEach((p, i) => { const d = Math.abs(Math.atan2(Math.sin(p.a - na), Math.cos(p.a - na))); if (d < bd) { bd = d; bi = i; } }); ring[bi].pale = true; });
      ring.forEach((p) => { if (stars.every((q, j) => j === k || hyp(q[0] - p.x, q[1] - p.y) > outR(j) * .92)) sites.push(p); }); }); });
  const st = F.step, ps = [];
  for (let k = 1; k < nC; k++) { const A = stars[k - 1], B = stars[k], L = hyp(B[0] - A[0], B[1] - A[1]) || 1, nx = -(B[1] - A[1]) / L, ny = (B[0] - A[0]) / L, bow = (F.bow || 0) * L * (k % 2 ? 1 : -1);
    const C = [(A[0] + B[0]) / 2 + nx * bow, (A[1] + B[1]) / 2 + ny * bow], pts = [], len = [0];
    for (let i = 0; i <= 60; i++) { const t = i / 60, u = 1 - t; pts.push([u * u * A[0] + 2 * u * t * C[0] + t * t * B[0], u * u * A[1] + 2 * u * t * C[1] + t * t * B[1]]); if (i) len.push(len[i - 1] + hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
    const T = len[60], at = (d) => { let i = 1; while (i < 60 && len[i] < d) i++; const f = (d - len[i - 1]) / ((len[i] - len[i - 1]) || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f, pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]; };
    const d0 = outR(k - 1) + st * .55, d1 = T - outR(k) - st * .55, n = Math.max(0, Math.round((d1 - d0) / st));
    for (let i = 0; i <= n; i++) { if (d1 < d0 - st * .3) break; const d = n ? d0 + (d1 - d0) * i / n : (d0 + d1) / 2, q = at(d + (i && i < n ? (R() - .5) * st * .3 : 0)), tl = hyp(q[2], q[3]) || 1, j = (R() - .5) * (F.jag || 1.6);
      ps.push({ x: q[0] - q[3] / tl * j, y: q[1] + q[2] / tl * j, path: true }); } }
  const grid = []; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) grid.push({ x: inner[0] + (i + .5 + (R() - .5) * .8) * sx, y: inner[1] + (j + .5 + (R() - .5) * .8) * sy });
  const keep = grid.filter((g) => ps.every((q) => hyp(q.x - g.x, q.y - g.y) > (F.clr || st)) && sites.every((q) => hyp(q.x - g.x, q.y - g.y) > s0 * .62) && stars.every((s, k) => hyp(s[0] - g.x, s[1] - g.y) > outR(k) + s0 * .45));
  const all = keep.concat(sites, ps), polys = vorSites(all.map((q) => [q.x, q.y]), inner, 3.2 * Math.max(sx, sy));
  const edges = []; stars.forEach((s, k) => { if (motif(k) !== 'star') return; const R0 = sizes[k], d = R0 / 1.618, a0 = srot[k] - PI / 2;
    for (let i = 0; i < 5; i++) { const a = a0 + i * 2 * PI / 5, tip = [s[0] + Math.cos(a) * R0, s[1] + Math.sin(a) * R0];
      [-1, 1].forEach((sg) => edges.push({ a: tip, b: [s[0] + Math.cos(a + sg * PI / 5) * d, s[1] + Math.sin(a + sg * PI / 5) * d], c: s })); } });
  polys.forEach((p, i) => { if (p.length < 3) return; let q = p;
    edges.forEach((e) => { const m = [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2]; if (q.length < 3 || !inside(q, m[0], m[1])) return;
      const nx = e.b[1] - e.a[1], ny = e.a[0] - e.b[0], sc = Math.sign((e.c[0] - e.a[0]) * nx + (e.c[1] - e.a[1]) * ny);
      q = clip(q, (x, y) => sc * ((x - e.a[0]) * nx + (y - e.a[1]) * ny)); });
    if (q.length < 3 || area(q) < 1.2) return; const src = all[i], pale = src.path || src.pale, c = cen(q), kind = pale ? 'path' : src.ri != null ? 'ring' : 'bg';
    if (o.famFx) { const r = o.famFx(kind, src, c); pcs.push({ p: q, fam: r.fam, path: kind === 'path' || !!r.lit, crack: !!r.crack }); return; }
    pcs.push({ p: q, fam: pale ? (R() < (F.mix || 0) ? F.mfam : F.pfam) : (F.halo && src.ri === 0) ? F.hfam : (F.halo2 && src.ri === 1) ? 'halo' : 'bg', path: !!pale || (!!F.haloLit && src.ri === 0) }); });
  const noWob = stars.map((s, k) => [s[0], s[1], sizes[k] * 1.12]);
  pcs.forEach((pc) => { pc.c = cen(pc.p); });
  const dz = o.dark; pcs.forEach((pc) => { pc.dark = !!dz && pc.c[0] > dz[0] && pc.c[0] < dz[2] && pc.c[1] > dz[1] && pc.c[1] < dz[3]; });
  const sheets = {}, fill = (fam, dark) => { const key = fam + (dark ? 'D' : ''); if (!sheets[key]) sheets[key] = (PAL[fam] || PAL.bg).map((c) => gradSpec(R, [c[0], c[1], c[2] - (dark ? 10 : 0)])); const l = sheets[key]; return l[Math.floor(R() * l.length)]; };
  const amp = .5, ph = (o.seed || 1) * 1.3, fld = (x, y) => [Math.sin(x * .37 + y * .11 + ph) * amp + Math.sin(y * .53 - x * .07 + ph * 2) * amp * .5, Math.cos(y * .33 + x * .13 + ph) * amp + Math.sin(x * .47 + ph * 3) * amp * .5];
  const edgeOf = (x, y) => x < .01 || y < .01 || x > W - .01 || y > H - .01;
  const wob = (poly) => { const out = []; poly.forEach((a, k) => { const c = poly[(k + 1) % poly.length], n = Math.max(1, Math.round(hyp(c[0] - a[0], c[1] - a[1]) / 5));
    for (let t = 0; t < n; t++) { const x = a[0] + (c[0] - a[0]) * t / n, y = a[1] + (c[1] - a[1]) * t / n; if (edgeOf(x, y) || noWob.some((z) => hyp(x - z[0], y - z[1]) < z[2])) { out.push([x, y]); continue; } const d = fld(x, y); out.push([x + d[0], y + d[1]]); } }); return out; };
  const pieces = pcs.map((pc) => { const pts = wob(pc.p), out = { pts, g: fill(pc.fam, pc.dark && !pc.path), role: pc.fam === 'border' || !pc.path ? 0 : 1, x: pc.c[0], y: pc.c[1] };
    if (pc.crack) { const v = pc.p, cx = pc.c[0], cy = pc.c[1]; out.crack = []; for (let m = 0; m < 3; m++) { const q = v[Math.floor(R() * v.length)];
      out.crack.push([[cx, cy], [cx + (q[0] - cx) * .45 + (R() - .5) * 1.6, cy + (q[1] - cy) * .45 + (R() - .5) * 1.6], [cx + (q[0] - cx) * .85, cy + (q[1] - cy) * .85]]); } }
    return out; });
  const starsOut = stars.map((s, k) => { const R0 = sizes[k], sf = o.motifFam ? o.motifFam(k) : 'star';
    if (motif(k) === 'moon') { const mp = moonPieces(s[0], s[1], R0 * .92, srot[k] - 2.3);
      return { x: s[0], y: s[1], R0, moon: true, parts: mp.map((q, i) => ({ pts: q, g: fill(i === mp.length - 1 ? 'shadow' : sf, false) })), outline: Array.from({ length: 28 }, (_, i) => [s[0] + Math.cos(i / 28 * 2 * PI) * R0 * .92, s[1] + Math.sin(i / 28 * 2 * PI) * R0 * .92]) }; }
    const rh = rhombi(s[0], s[1], R0, srot[k]);
    return { x: s[0], y: s[1], R0, parts: rh.map((q) => ({ pts: q, g: fill(sf, false) })), outline: [].concat.apply([], rh.map((q) => [q[1], q[2]])) }; });
  const bubbles = []; for (let k = 0; k < 10; k++) bubbles.push([R() * W, R() * H, .3 + R() * .5]);
  return { W, H, pieces, stars: starsOut, bubbles, lw: o.lw || .85, lightAt: o.lightAt || [.5, 0] };
}

/* ---------- the picked designs ---------- */
const FIT_G1R = { rings: [{ n: 10, r: 1.5 }, { n: 10, r: 2.7, jr: .06 }], step: 7.6, clr: 7.4, bow: .12, jag: 1.6, halo: true, mix: .3, pfam: 'paleB', mfam: 'midB', hfam: 'haloB', haloLit: true, halo2: true };
const sc = (z, W, H, w0, h0) => z.map((r) => [r[0] * W / w0, r[1] * H / h0, r[2] * W / w0, r[3] * H / h0, r[4]]);
function cutTile(seed, W, H) { // SC2 medium stars in G1r glass, on the 170x100 tile the mock-up used, scaled to the tile
  return cut({ w: W, h: H, seed, s: 10, border: 5.5, bseg: 12, starGap: 32, sizes: (n) => Array(n).fill(6.6), fit: FIT_G1R,
    zones: sc([[118, 4, 166, 17, 1], [62, 60, 166, 80, 3]], W, H, 170, 100), dark: sc([[58, 18, 168, 58]], W, H, 170, 100)[0], lightAt: [.55, 0] }); }
function cutPanel(seed, W, H) { // the Absolution glass: the same G1r cut, a little coarser, honey border band
  return cut({ w: W, h: H, seed, s: 13, border: 5, bseg: 13, lw: .95, starGap: 38, sizes: (n) => Array(n).fill(7.5),
    fit: { rings: FIT_G1R.rings, step: 9.6, clr: 9.4, bow: .12, jag: 2, halo: true, mix: .3, pfam: 'paleB', mfam: 'midB', hfam: 'haloB', halo2: true },
    zones: sc([[115, 8, 185, 34, 2], [70, 90, 215, 116, 2], [60, 120, 150, 146, 1]], W, H, 224, 152), lightAt: [.3, 0] }); }
const DW = 200, DH = 320, DB = 5;
const hrOf = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? +m[1] + +m[2] / 60 : null; };
const yOf = (h) => DB + 16 + (clamp(h, 6.5, 22.5) - 6.5) / 16 * (DH - 2 * DB - 32);
function dayEvents(events) {
  const ev = (events || []).map((e) => ({ h: hrOf(e.t), kind: e.side === 'c' ? 'c' : 'b', name: e.name || '' })).filter((e) => e.h != null).sort((a, b) => a.h - b.h);
  const out = ev.map((e, i) => ({ x: e.kind === 'b' ? DW * (.7 + ((i * 37) % 11) / 100) : DW * (.21 + ((i * 53) % 13) / 100), y: yOf(e.h), kind: e.kind, name: e.name }));
  // two marks on the same side too close in time are nudged apart, then squeezed back into the window if they ran off the end
  const last = { b: -99, c: -99 }; out.forEach((e) => { e.y = Math.max(e.y, last[e.kind] + 17); last[e.kind] = e.y; });
  const top = DB + 12, bot = DH - DB - 12, mx = out.length ? out[out.length - 1].y : 0; if (mx > bot) out.forEach((e) => { e.y = top + (e.y - top) * (bot - top) / (mx - top); });
  return out;
}
function cutDay(seed, ev, cracked) { // D1: a fixed middle line, blood moons left, honey stars right
  const sz = ev.map((e) => (e.kind === 'c' ? 8.6 : 7));
  return cut({ w: DW, h: DH, seed, s: 12, border: 5, bseg: 13, lw: .9, events: ev, nChain: ev.length, sizes: () => sz,
    fit: { rings: [{ n: 10, r: 1.5 }, { n: 10, r: 2.6, jr: .06 }], step: 9, clr: 8.8, bow: .1, jag: 1.6 },
    motif: (k) => (ev[k].kind === 'c' ? 'moon' : 'star'), motifFam: (k) => (ev[k].kind === 'c' ? 'blood' : 'star'),
    famFx: (kind, src, c) => { const left = c[0] < DW / 2;
      if (kind === 'path') return { fam: left ? 'redp' : 'paleB', crack: cracked && Math.abs(c[0] - DW / 2) < 7 && !!src.path };
      if (kind === 'ring') return { fam: src.ri === 0 ? (left ? 'chaloD' : 'haloB') : (left ? 'cbg' : 'bg'), lit: src.ri === 0 };
      return { fam: left ? 'cbg' : 'bg' }; }, lightAt: [.5, 0] }); }

/* ---------- canvas layers ---------- */
const LC = '#0a0b10';
function path2(pts) { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; }
function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach((q) => { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }); return [x0, y0, x1 - x0, y1 - y0]; }
function fillGlass(ctx, P2, pts, g) { const b = bbox(pts), gr = ctx.createLinearGradient(b[0] + g.x1 * b[2], b[1] + g.y1 * b[3], b[0] + g.x2 * b[2], b[1] + g.y2 * b[3]); g.st.forEach((s) => gr.addColorStop(s[0], s[1])); ctx.fillStyle = gr; ctx.fill(P2); }
function layer(S) { const c = document.createElement('canvas'); c.width = S.cw; c.height = S.ch; const x = c.getContext('2d'); x.setTransform(S.k, 0, 0, S.k, S.ox, S.oy); return c; }
// the units-to-pixels fit: the glass covers its holder (like SVG "slice"), centred
function fitTo(S, cssW, cssH, dpr) { S.cw = Math.max(1, Math.round(cssW * dpr)); S.ch = Math.max(1, Math.round(cssH * dpr)); S.k = Math.max(S.cw / S.geo.W, S.ch / S.geo.H); S.ox = (S.cw - S.geo.W * S.k) / 2; S.oy = (S.ch - S.geo.H * S.k) / 2; S.dpr = dpr; }
function drawTop(S) { // lead, bubbles, the soft overhead light and the frame
  const G = S.geo, c = layer(S), x = c.getContext('2d'), lead = new Path2D(), sl = new Path2D();
  G.pieces.forEach((p) => lead.addPath(p.P)); G.stars.forEach((s) => s.parts.forEach((q) => sl.addPath(q.P)));
  x.lineJoin = 'round'; x.strokeStyle = LC; x.lineWidth = G.lw; x.stroke(lead); x.lineWidth = G.lw * .9; x.stroke(sl);
  x.fillStyle = 'rgba(255,255,255,.14)'; G.bubbles.forEach((b) => { x.beginPath(); x.arc(b[0], b[1], b[2], 0, 2 * PI); x.fill(); });
  x.save(); x.scale(G.W, G.H); const rg = x.createRadialGradient(G.lightAt[0], G.lightAt[1], 0, G.lightAt[0], G.lightAt[1], .9); rg.addColorStop(0, 'rgba(255,248,230,.2)'); rg.addColorStop(1, 'rgba(255,248,230,0)'); x.fillStyle = rg; x.fillRect(0, 0, 1, 1); x.restore();
  x.strokeStyle = LC; x.lineWidth = 1.6; x.strokeRect(.8, .8, G.W - 1.6, G.H - 1.6);
  return c; }
function prep(G) { if (G.ready) return; G.pieces.forEach((p) => { p.P = path2(p.pts); }); G.stars.forEach((s) => { s.parts.forEach((q) => { q.P = path2(q.pts); }); s.O = path2(s.outline); }); G.ready = true; }
function drawCol(S, roles) { // the glass itself, at full colour: tiles keep background, path and stars apart so each can light on its own
  const G = S.geo, out = roles ? [layer(S), layer(S), layer(S)] : [layer(S)], ctx = out.map((c) => c.getContext('2d'));
  G.pieces.forEach((p) => fillGlass(ctx[roles ? p.role : 0], p.P, p.pts, p.g)); G.stars.forEach((s) => s.parts.forEach((q) => fillGlass(ctx[roles ? 2 : 0], q.P, q.pts, q.g)));
  return out; }

/* ---------- cache ---------- */
const CACHE = new Map(), CACHE_MAX = 16, GEO = new Map(), GEO_MAX = 40;
const geoOf = (id, make) => { let g = GEO.get(id); if (!g) { g = make(); prep(g); GEO.set(id, g); while (GEO.size > GEO_MAX) GEO.delete(GEO.keys().next().value); } return g; };
function entry(id, geo, cssW, cssH, kind) {
  const dpr = DPRf(), key = id + '@' + cssW + 'x' + cssH + '@' + dpr; let S = CACHE.get(key);
  if (S) { CACHE.delete(key); CACHE.set(key, S); return S; }
  S = { key, geo, kind }; fitTo(S, cssW, cssH, dpr);
  if (kind === 'tile') { S.L = drawCol(S, true); S.cols = tileCols(geo); } else { S.L = drawCol(S, false); S.items = itemsOf(geo); S.edges = edgesOf(geo); }
  S.top = drawTop(S);
  CACHE.set(key, S); while (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
  return S; }

/* ---------- blessing tile: light by role, left to right ---------- */
const UNLIT = .32, LITA = [.5, .8, 1]; // background, path, stars (the mock-up's st5 levels)
const roleA = (r, v) => UNLIT + (LITA[r] - UNLIT) * v;
function tileCols(G) { const n = 16, cols = Array.from({ length: n }, (_, i) => ({ P: new Path2D(), x: (i + .5) / n * G.W }));
  G.pieces.forEach((p) => cols[clamp(Math.floor(p.x / G.W * n), 0, n - 1)].P.addPath(p.P)); G.stars.forEach((s) => cols[clamp(Math.floor(s.x / G.W * n), 0, n - 1)].P.addPath(s.O)); return cols; }
function drawTile(S, cv, from, to, e) {
  const x = cv.getContext('2d'), G = S.geo; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.fillStyle = '#04060c'; x.fillRect(0, 0, S.cw, S.ch);
  if (e === Infinity || from === to) { [0, 1, 2].forEach((r) => { x.globalAlpha = roleA(r, to); x.drawImage(S.L[r], 0, 0); }); }
  else S.cols.forEach((c) => { const d0 = c.x / G.W * 900; x.save(); x.setTransform(S.k, 0, 0, S.k, S.ox, S.oy); x.clip(c.P); x.setTransform(1, 0, 0, 1, 0, 0);
    [0, 1, 2].forEach((r) => { const p = sstep(clamp((e - d0 - (r ? 120 : 0)) / 800, 0, 1)); x.globalAlpha = lerp(roleA(r, from), roleA(r, to), p); x.drawImage(S.L[r], 0, 0); }); x.restore(); });
  x.globalAlpha = 1; x.drawImage(S.top, 0, 0); }

/* ---------- lightable glass (the Absolution card and the day): a dark shade on every piece lifts as the light arrives ---------- */
function itemsOf(G) { const it = G.pieces.map((p) => ({ P: p.P, x: p.x, y: p.y, crack: p.crack }));
  G.stars.forEach((s) => it.push({ P: s.O, x: s.x, y: s.y, star: s })); return it; }
function edgesOf(G) { // every lead join between two field pieces, for the honey seam where lit meets dark
  const E = new Map(); G.pieces.forEach((p, i) => { const v = p.pts; for (let k = 0; k < v.length; k++) { const a = v[k], b = v[(k + 1) % v.length], key = Math.round(a[0] + b[0]) + ':' + Math.round(a[1] + b[1]);
    const e = E.get(key); if (e) { if (e.o[0] !== i && e.o.length < 2) e.o.push(i); } else E.set(key, { a, b, o: [i] }); } });
  return [...E.values()].filter((e) => e.o.length === 2); }
const CATCH = [[0, .55], [.35, .3], [.55, .34], [1, 0]];
const IGN = [[0, .6], [.35, 1.8], [1, 1]], IGR = [[0, 0], [.35, 20], [1, 45]], RAYO = [[0, 0], [.25, 1], [1, .3]], RAYS = [[0, .2], [.25, 1.2], [1, .45]];
// st: { on (Uint8Array: lit in the end), pre (lit before this run), d (delays ms), base (unlit shade), front (ms or 0) }
function drawLit(S, cv, st, e) {
  const x = cv.getContext('2d'), G = S.geo, I = S.items, n = I.length, fin = e === Infinity;
  const prog = (i) => (st.pre[i] ? 1 : !st.on[i] ? 0 : fin ? 1 : clamp((e - st.d[i]) / 1500, 0, 1));
  const shade = (i) => (st.pre[i] ? 0 : !st.on[i] || (!fin && e < st.d[i]) ? st.base : fin ? 0 : kf((e - st.d[i]) / 1500, CATCH));
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.clearRect(0, 0, S.cw, S.ch); x.drawImage(S.L[0], 0, 0);
  x.setTransform(S.k, 0, 0, S.k, S.ox, S.oy);
  x.lineCap = 'round'; x.strokeStyle = '#fff1d0'; x.lineWidth = .45;
  I.forEach((it, i) => { if (!it.crack) return; x.globalAlpha = lerp(.2, .95, prog(i)); x.beginPath(); it.crack.forEach((c) => { x.moveTo(c[0][0], c[0][1]); x.lineTo(c[1][0], c[1][1]); x.lineTo(c[2][0], c[2][1]); }); x.stroke(); });
  const groups = new Map(); for (let i = 0; i < n; i++) { const a = Math.round(shade(i) * 50); if (!a) continue; let g = groups.get(a); if (!g) groups.set(a, (g = new Path2D())); g.addPath(I[i].P); }
  x.fillStyle = '#03050b'; groups.forEach((g, a) => { x.globalAlpha = a / 50; x.fill(g); });
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.drawImage(S.top, 0, 0); x.setTransform(S.k, 0, 0, S.k, S.ox, S.oy);
  // star sparks: a small four-point spark and a thin cross of rays, igniting 350 ms after the light reaches the star
  I.forEach((it, i) => { if (!it.star || it.star.moon || !st.on[i]) return; const t = st.pre[i] || fin ? 1 : (e - st.d[i] - 350) / 1300; if (t < 0) return;
    const s = it.star, k = kf(t, IGN), r = kf(t, IGR) * PI / 180, tr = st.pre[i] || fin ? 1 : clamp((e - st.d[i] - 350) / 1400, 0, 1);
    x.save(); x.translate(s.x, s.y); x.rotate(r); x.scale(k, k);
    x.globalAlpha = kf(tr, RAYO); const rs = kf(tr, RAYS), L = s.R0 * 1.8 * rs; x.strokeStyle = '#fff6dc'; x.lineWidth = .45; x.beginPath(); x.moveTo(-L, 0); x.lineTo(L, 0); x.moveTo(0, -L); x.lineTo(0, L); x.stroke();
    x.globalAlpha = .95; x.fillStyle = '#fffdf2'; x.fill(path2(sN(0, 0, s.R0 * .3, 4, .3, 0))); x.restore(); });
  // the honey seam along the lead where lit glass meets dark glass
  const lit = (i) => !!(st.pre[i] || (st.on[i] && (fin || st.d[i] + 350 <= e))); let sm = null;
  S.edges.forEach((ed) => { if (lit(ed.o[0]) !== lit(ed.o[1])) { if (!sm) sm = new Path2D(); sm.moveTo(ed.a[0], ed.a[1]); sm.lineTo(ed.b[0], ed.b[1]); } });
  if (sm) { x.globalAlpha = 1; x.strokeStyle = '#ffe7aa'; x.lineWidth = 1.5; x.shadowColor = '#ffcf6a'; x.shadowBlur = 2 * S.dpr; x.stroke(sm); x.shadowBlur = 0; }
  // the day's bright front, running down the glass
  if (st.front && !fin) { const T = st.front + 500, p = e / T; if (p < 1) { const y = p < .96 ? -14 + p / .96 * (G.H * .97) : -14 + G.H * .97 + (p - .96) / .04 * (G.H * .03 + 14);
    const gr = x.createLinearGradient(0, y, 0, y + 14); gr.addColorStop(0, 'rgba(255,233,176,0)'); gr.addColorStop(.7, 'rgba(255,233,176,.55)'); gr.addColorStop(.85, 'rgba(255,246,220,.9)'); gr.addColorStop(1, 'rgba(255,233,176,0)');
    x.globalAlpha = p < .96 ? 1 : 1 - (p - .96) / .04; x.fillStyle = gr; x.fillRect(0, y, G.W, 14); } }
  x.globalAlpha = 1; x.setTransform(1, 0, 0, 1, 0, 0); }

function run(el, ms, frame) { // one rAF loop per holder; the last frame is the static final state
  if (el._glRaf) cancelAnimationFrame(el._glRaf); const t0 = performance.now(), my = (el._glRun = (el._glRun || 0) + 1);
  const tick = (t) => { if (el._glRun !== my) return; const e = t - t0; if (e >= ms || !el.isConnected) { el._glRaf = 0; frame(Infinity); return; } frame(e); el._glRaf = requestAnimationFrame(tick); };
  if (RM()) { el._glRaf = 0; frame(Infinity); return; } el._glRaf = requestAnimationFrame(tick); }

/* ---------- twinkles over lit stars (HTML, so the glass never repaints while idle) ---------- */
function twinkle(host, S, idx, n, seed) {
  Array.prototype.slice.call(host.querySelectorAll(':scope > .gl-glint')).forEach((g) => g.remove()); if (!n || !idx.length) return;
  const R = rng(seed), pick = idx.slice().sort(() => R() - .5).slice(0, n), cssW = S.cw / S.dpr, cssH = S.ch / S.dpr;
  pick.forEach((s) => { const g = document.createElement('i'); g.className = 'gl-glint';
    g.style.left = ((s.x * S.k + S.ox) / S.dpr / cssW * 100).toFixed(2) + '%'; g.style.top = ((s.y * S.k + S.oy) / S.dpr / cssH * 100).toFixed(2) + '%';
    g.style.animationDelay = (-R() * 2.4).toFixed(2) + 's'; g.style.animationDuration = (1.8 + R() * 1.4).toFixed(2) + 's'; host.appendChild(g); }); }

/* ---------- the X2 shell round the curse card: hairlines (I), then the break (II) ---------- */
function cellsOf(W, H, cols, rows, R) {
  const sites = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) sites.push([(c + .5 + (r % 2 ? .22 : -.12) + (R() - .5) * .7) * W / cols, (r + .5 + (R() - .5) * .8) * H / rows]);
  return sites.map((p, i) => { let poly = rectPoly(0, 0, W, H); sites.forEach((q, j) => { if (i === j) return; const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, nx = q[0] - p[0], ny = q[1] - p[1]; poly = clip(poly, (x, y) => (x - mx) * nx + (y - my) * ny); }); return poly; }); }
const PS = (pts) => pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
function shell(seed, stage) {
  const R = rng(seed), cs = cellsOf(32, 44, 3, 5, R).filter((p) => p.length >= 3), O = [32, 30], frac = .72, T1 = 1700, T2 = 700, edges = new Map();
  const onB = (p) => p[0] < .05 || p[0] > 31.95 || p[1] < .05 || p[1] > 43.95;
  const same = (a, b) => (Math.abs(a[0]) < .05 && Math.abs(b[0]) < .05) || (Math.abs(a[0] - 32) < .05 && Math.abs(b[0] - 32) < .05) || (Math.abs(a[1]) < .05 && Math.abs(b[1]) < .05) || (Math.abs(a[1] - 44) < .05 && Math.abs(b[1] - 44) < .05);
  cs.forEach((p) => p.forEach((a, k) => { const b = p[(k + 1) % p.length]; if ((onB(a) && onB(b) && same(a, b)) || hyp(b[0] - a[0], b[1] - a[1]) < .3) return;
    const ka = a[0].toFixed(1) + ',' + a[1].toFixed(1), kb = b[0].toFixed(1) + ',' + b[1].toFixed(1), key = ka < kb ? ka + '|' + kb : kb + '|' + ka; if (!edges.has(key)) edges.set(key, [a, b]); }));
  const dist = (p) => hyp(p[0] - O[0], p[1] - O[1]);
  const list = [...edges.values()].map(([a, b]) => (dist(a) <= dist(b) ? { a, b, d: dist(a) } : { a: b, b: a, d: dist(b) }));
  const maxD = Math.max.apply(null, list.map((l) => dist(l.b))), th = frac * maxD;
  const ln = (l, cls, s, dl) => '<line class="gl-ck' + cls + (stage >= s ? ' gl-on' : '') + '" data-s="' + s + '" pathLength="1" x1="' + l.a[0].toFixed(2) + '" y1="' + l.a[1].toFixed(2) + '" x2="' + l.b[0].toFixed(2) + '" y2="' + l.b[1].toFixed(2) + '" style="--d:' + Math.round(dl) + 'ms"/>';
  let cr = ''; list.forEach((l) => { if (l.d < th) cr += ln(l, ' gl-hl', 1, l.d / th * T1); }); list.forEach((l) => { cr += ln(l, '', 2, l.d / maxD * T2); });
  let sh = ''; cs.forEach((p) => { const c = cen(p), dx = c[0] - 16;
    sh += '<polygon class="gl-shd" points="' + PS(p) + '" style="--tx:' + (dx * 1.6 + (R() - .5) * 6).toFixed(1) + 'px;--ty:' + (30 + R() * 25).toFixed(1) + 'px;--rot:' + ((R() - .5) * 160).toFixed(0) + 'deg;--fd:' + Math.round(R() * 250) + 'ms"/>'; });
  return '<svg class="gl-shards" viewBox="0 0 32 44" preserveAspectRatio="none" aria-hidden="true">' + sh + '</svg><svg class="gl-cracks" viewBox="0 0 32 44" preserveAspectRatio="none" aria-hidden="true">' + cr + '</svg>';
}

/* ---------- CSS ---------- */
const CSS = [
'.gl-tile{position:absolute;inset:0;z-index:1;display:block;overflow:hidden;pointer-events:none;background:#04060c}',
'.gl-cv{position:absolute;inset:0;width:100%;height:100%;display:block}',
'.gl-sweep{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;background:linear-gradient(100deg,rgba(255,244,214,0) 40%,rgba(255,244,214,.3) 50%,rgba(255,244,214,0) 60%);background-size:300% 100%;background-position:100% 0}',
'.gl-sweep.gl-go{animation:gl-sweepx 1.1s ease-out}',
'@keyframes gl-sweepx{0%{opacity:1;background-position:100% 0}100%{opacity:0;background-position:0% 0}}',
'.gl-tilebox{border:1.5px solid #07090e!important;box-shadow:0 2px 0 #030806,0 0 10px rgba(110,160,240,.15);background:#0b1626}',
'.gl-glint{position:absolute;z-index:3;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;pointer-events:none;background:radial-gradient(circle,#fff 0 1.2px,rgba(255,240,200,0) 2.5px),linear-gradient(90deg,rgba(255,250,230,0),#fffbe8 50%,rgba(255,250,230,0)) center/100% 1.4px no-repeat,linear-gradient(0deg,rgba(255,250,230,0),#fffbe8 50%,rgba(255,250,230,0)) center/1.4px 100% no-repeat;filter:drop-shadow(0 0 2px #ecd08e);animation:gl-glint 2.4s ease-in-out infinite alternate;will-change:transform,opacity}',
'@keyframes gl-glint{0%{opacity:.15;transform:scale(.5) rotate(0)}100%{opacity:1;transform:scale(1.25) rotate(45deg)}}',
/* the Absolution card */
'.gl-ab{position:relative;display:grid;grid-template-columns:38% minmax(0,1fr);min-height:152px;border-radius:7px;overflow:hidden;box-shadow:0 2px 0 #030806,0 0 0 1.5px #07090e;transition:box-shadow 1s;font-family:var(--a,system-ui,sans-serif)}',
'.gl-ab.gl-s1{box-shadow:0 2px 0 #030806,0 0 0 1.5px #3a3018,0 0 16px rgba(240,215,160,.3)}',
'.gl-ab.gl-s2{animation:gl-abglow 2.2s ease-in-out infinite alternate}',
'@keyframes gl-abglow{from{box-shadow:0 2px 0 #030806,0 0 0 1.5px #806432,0 0 18px rgba(240,215,160,.4)}to{box-shadow:0 2px 0 #030806,0 0 0 1.5px #c49a4e,0 0 34px rgba(245,222,170,.65)}}',
'.gl-ab button{font:inherit;cursor:pointer;margin:0;min-width:0}',
'.gl-abC{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 6px;border:none;border-right:3px solid #07090e;color:#f3e2dc;background:radial-gradient(130% 50% at 50% 112%,#6e0c18,rgba(58,10,16,0) 72%),linear-gradient(180deg,#2a0f13,#140608);transition:filter 1s}',
'.gl-abC>*{position:relative;z-index:2}',
'.gl-cCard{position:relative;width:64px;height:88px;display:block}',
'.gl-cCard>img{display:block;width:100%;height:100%;image-rendering:pixelated;filter:drop-shadow(0 2px 0 rgba(0,0,0,.6));transition:filter 1.2s}',
'.gl-cCard::after{content:"";position:absolute;inset:-14px;z-index:1;background:radial-gradient(circle,rgba(250,236,190,.75),rgba(235,205,140,0) 65%);opacity:0;transition:opacity 1s;pointer-events:none}',
'.gl-s1 .gl-cCard::after{opacity:.35}.gl-s2 .gl-cCard::after{opacity:.7}',
'.gl-cNm{font:700 13px/1.1 var(--a,system-ui,sans-serif);text-shadow:0 1px 2px #000;text-align:center;overflow-wrap:anywhere}',
'.gl-cHp{font:700 12px var(--a,system-ui,sans-serif);color:#ff7a66}',
'.gl-abC.gl-hit{animation:gl-chit .5s}',
'@keyframes gl-chit{30%{filter:brightness(1.6) saturate(1.4);transform:scale(.97)}}',
'.gl-abB{position:relative;overflow:hidden;border:none;padding:8px 9px;display:flex;flex-direction:column;justify-content:space-between;gap:4px;background:#0b1626;text-align:left;color:#eef5ff}',
'.gl-gx{position:absolute;inset:0;z-index:0;transition:filter 1s}',
'.gl-abB>:not(.gl-gx){position:relative;z-index:2}',
'.gl-bTop{display:flex;justify-content:space-between;align-items:center;gap:6px}',
'.gl-lbl{font:700 17px/1.2 var(--g,Georgia,serif);letter-spacing:.04em;color:#f6e2b0;text-shadow:0 0 8px rgba(240,210,150,.7),0 1px 2px #000;background:rgba(4,8,18,.62);padding:0 6px;border-radius:3px;transition:text-shadow .6s;white-space:nowrap}',
'.gl-s2 .gl-lbl{text-shadow:0 0 12px rgba(245,225,175,1),0 0 22px rgba(235,200,130,.7),0 1px 2px #000}',
'.gl-pips{display:flex;gap:6px;padding:3px 5px;background:rgba(4,8,18,.62);border-radius:3px}',
'.gl-pips i{display:block;width:8px;height:8px;transform:rotate(45deg);border:1.5px solid #f6e2b0;transition:background .5s,box-shadow .5s}',
'.gl-pips i.gl-on{background:#fbf0d2;box-shadow:0 0 8px 2px #e8cc8e}',
'.gl-bMid{display:flex;align-items:center;gap:7px}',
'.gl-bcard{flex:none;width:48px;height:66px;image-rendering:pixelated;filter:drop-shadow(0 1px 3px rgba(0,0,0,.9));transition:filter .8s}',
'.gl-s1 .gl-bcard{filter:drop-shadow(0 0 5px rgba(245,225,170,.7))}.gl-s2 .gl-bcard{animation:gl-cardglow 1.6s ease-in-out infinite alternate}',
'@keyframes gl-cardglow{from{filter:drop-shadow(0 0 5px rgba(245,225,170,.7))}to{filter:drop-shadow(0 0 12px rgba(255,240,200,1))}}',
'.gl-bNm{font:700 14px/1.15 var(--a,system-ui,sans-serif);background:rgba(4,8,18,.66);padding:3px 6px;border-radius:3px;text-shadow:0 1px 2px #000;min-width:0;overflow-wrap:anywhere}',
'.gl-bFt{display:flex;justify-content:space-between;align-items:center;gap:6px;font:700 12.5px var(--a,system-ui,sans-serif)}',
'.gl-bFt>span{background:rgba(4,8,18,.66);padding:1px 6px;border-radius:3px}',
'.gl-pay{display:inline-flex;align-items:center;gap:3px;color:#e6c26a}.gl-pay img{width:15px;height:15px;image-rendering:pixelated}',
'.gl-each{color:#f6e2b0;white-space:nowrap}',
'.gl-breath{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:0;background:radial-gradient(80% 90% at 40% 45%,rgba(255,240,205,.3),rgba(240,215,160,0) 70%);transition:opacity 1s;will-change:opacity}',
'.gl-s1 .gl-breath{opacity:.5}.gl-s2 .gl-breath{animation:gl-breath 3.2s ease-in-out infinite alternate}',
'@keyframes gl-breath{from{opacity:.45}to{opacity:1}}',
'.gl-shards,.gl-cracks{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}',
'.gl-shards{z-index:2}.gl-cracks{z-index:3;filter:drop-shadow(0 0 1.5px #ecd08e) drop-shadow(0 0 3px rgba(235,200,130,.8))}',
'.gl-shd{fill:rgba(112,0,22,.52);transform-box:fill-box;transform-origin:center}',
'.gl-ck{fill:none;stroke:#fffbe0;stroke-width:.75;stroke-linecap:round;stroke-dasharray:1 1;stroke-dashoffset:1;transition:stroke-dashoffset .55s ease-out var(--d,0ms)}',
'.gl-ck.gl-hl{stroke-width:.32;opacity:.75;transition-duration:.9s}',
'.gl-ck.gl-on{stroke-dashoffset:0}',
'.gl-absolving .gl-gx{filter:brightness(.5)}.gl-absolving .gl-abC{filter:brightness(.7)}',
'.gl-absolving .gl-cracks{opacity:0;transition:opacity .6s .5s}.gl-absolving .gl-cCard>img{filter:brightness(2.2)}',
'.gl-absolving .gl-shd{animation:gl-shfall 1.2s cubic-bezier(.5,0,.9,.6) var(--fd,0ms) forwards}',
'@keyframes gl-shfall{to{transform:translate(var(--tx),var(--ty)) rotate(var(--rot));opacity:0}}',
'.gl-absd{position:absolute;inset:0;z-index:20;display:grid;place-items:center;font:700 38px var(--g,Georgia,serif);letter-spacing:.08em;color:#f2d48e;background:radial-gradient(ellipse 66% 60% at 50% 50%,rgba(3,4,8,.9),rgba(3,4,8,.62) 55%,rgba(3,4,8,0) 88%);animation:gl-absd 2.4s ease-out forwards;pointer-events:none}',
'.gl-absd span{text-shadow:0 2px 0 #000,0 0 14px rgba(230,180,90,.85),0 0 30px rgba(230,180,90,.4)}',
'@keyframes gl-absd{0%{opacity:0;transform:scale(.85)}18%{opacity:1;transform:scale(1.06)}70%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.02)}}',
/* H3 sparks */
'.gl-fx{position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden}',
'.gl-hspk{position:absolute;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;border-radius:50%;background:#fff;box-shadow:0 0 6px 2px #f3dca6,0 0 2px #fff;transition:transform .65s cubic-bezier(.55,0,.85,.55)}',
/* the day window */
'.gl-day{position:relative;border-radius:8px;overflow:hidden;box-shadow:0 0 0 1px #2a2416,0 6px 18px rgba(0,0,0,.5);background:#04060c;aspect-ratio:200/320;width:100%;max-width:340px;margin-inline:auto}',
'.gl-hrs{position:absolute;inset:0;pointer-events:none;font:700 10px var(--a,system-ui,sans-serif);color:rgba(255,240,210,.7);text-shadow:0 1px 2px #000}',
'.gl-hrs span{position:absolute;left:4%;transform:translateY(-50%);background:rgba(4,6,12,.55);padding:0 4px;border-radius:3px}',
'@media (prefers-reduced-motion:reduce){.gl-ab,.gl-ab *,.gl-tile *,.gl-glint{animation:none!important;transition:none!important}.gl-absolving .gl-shards{opacity:0}}'
].join('\n');
function css() { if (document.getElementById('glass-css')) return; const s = document.createElement('style'); s.id = 'glass-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }

/* ---------- the API ---------- */
const DAYS = new Map(), PLAYED = new Set(), ANIMD = new Set();
function tile(o) {
  css(); o = o || {}; const lit = clamp(o.lit == null ? 1 : +o.lit || 0, 0, 1);
  return '<span class="gl-tile" aria-hidden="true" data-gl-key="' + esc(o.key == null ? 'tile' : o.key) + '" data-gl-lit="' + lit + '"' + (o.w ? ' data-gl-w="' + Math.round(+o.w) + '"' : '') + (o.h ? ' data-gl-h="' + Math.round(+o.h) + '"' : '') + (o.anim ? ' data-gl-anim="1"' : '') + '>' +
    '<canvas class="gl-cv"></canvas><i class="gl-sweep"></i></span>';
}
const card = (kind, c) => { if (c.img) return c.img; try { return window.OMENS ? window.OMENS.card(kind, c.key) : ''; } catch (e) { return ''; } };
const runeSrc = (n, k) => { try { return window.RUNES ? window.RUNES.pick(n, k).src : ''; } catch (e) { return ''; } };
const halves = (hp) => (Array.isArray(hp) ? [+hp[0] || 0, +hp[1] || 0] : [Math.floor((+hp || 0) / 2), (+hp || 0) - Math.floor((+hp || 0) / 2)]);
const LBL = ['Absolution', 'Absolution I', 'Absolution II'];
function absolution(o) {
  css(); o = o || {}; const c = o.curse || {}, b = o.blessing || {}, s = clamp(+o.stage || 0, 0, 2), hb = halves(o.hpBack), key = o.key == null ? 'ab:' + (c.name || '') + '|' + (b.name || '') : String(o.key);
  const hpC = c.hp == null ? hb[0] + hb[1] : c.hp, ci = card('c', c), bi = card('b', b), rs = b.pay ? runeSrc(b.pay, b.name) : '';
  const each = hb[0] === hb[1] ? '+' + hb[0] + ' HP each' : '+' + hb[0] + ', then +' + hb[1] + ' HP';
  return '<div class="gl-ab gl-s' + s + '" data-gl-key="' + esc(key) + '" data-gl-stage="' + s + '">' +
    '<button type="button" class="gl-abC" ' + (c.attrs || '') + ' aria-label="' + esc((c.name || 'Curse') + ' curse, ' + LBL[s]) + '"><span class="gl-cCard">' + (ci ? '<img src="' + esc(ci) + '" alt="">' : '') + shell(hashStr(key) + 7, s) + '</span>' +
    '<span class="gl-cNm">' + esc(c.name || '') + '</span><span class="gl-cHp">&minus;' + esc(hpC) + ' HP</span></button>' +
    '<button type="button" class="gl-abB" ' + (b.attrs || '') + ' aria-label="' + esc((b.name || 'Blessing') + ', the antidote') + '"><span class="gl-gx"><canvas class="gl-cv"></canvas><i class="gl-breath"></i></span>' +
    '<span class="gl-bTop"><span class="gl-lbl">' + LBL[s] + '</span><span class="gl-pips"><i' + (s > 0 ? ' class="gl-on"' : '') + '></i><i' + (s > 1 ? ' class="gl-on"' : '') + '></i></span></span>' +
    '<span class="gl-bMid">' + (bi ? '<img class="gl-bcard" src="' + esc(bi) + '" alt="">' : '') + '<span class="gl-bNm">' + esc(b.name || '') + '</span></span>' +
    '<span class="gl-bFt">' + (b.pay ? '<span class="gl-pay">+' + esc(b.pay) + (rs ? '<img src="' + esc(rs) + '" alt="">' : '') + '</span>' : '<span></span>') + '<span class="gl-each">' + esc(each) + '</span></span></button></div>';
}
function day(events, o) {
  css(); o = o || {}; const ev = dayEvents(events), key = o.key == null ? 'day:' + hashStr(JSON.stringify(ev.map((e) => [e.kind, Math.round(e.y)]))) : String(o.key);
  DAYS.set(key, { ev, cracked: o.cracked !== false }); while (DAYS.size > 60) DAYS.delete(DAYS.keys().next().value);
  const nb = ev.filter((e) => e.kind === 'b').length, nc = ev.length - nb;
  const label = 'Your day in glass: ' + nb + ' blessing' + (nb === 1 ? '' : 's') + ' and ' + nc + ' curse' + (nc === 1 ? '' : 's') + (ev.length ? '. ' + ev.map((e) => e.name).filter(Boolean).join(', ') : '');
  const hrs = o.hours === false ? '' : '<div class="gl-hrs">' + [8, 12, 16, 20].map((h) => '<span style="top:' + (yOf(h) / DH * 100).toFixed(1) + '%">' + (h < 10 ? '0' : '') + h + ':00</span>').join('') + '</div>';
  return '<div class="gl-day" role="img" aria-label="' + esc(label) + '" data-gl-key="' + esc(key) + '"' + (o.play === false ? '' : ' data-gl-play="1"') + '><canvas class="gl-cv"></canvas>' + hrs + '</div>';
}

/* ---------- painting ---------- */
const QUEUE = []; let busy = false;
function pump() { if (busy) return; busy = true;
  setTimeout(function next() { const job = QUEUE.shift(); if (!job) { busy = false; return; } try { if (job.el.isConnected) job.fn(); } catch (e) { console.error(e); } setTimeout(next, 0); }, 30); }
function sizeOf(el) { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }
function canvasFor(el, S) { const cv = el.querySelector('canvas.gl-cv'); if (cv.width !== S.cw || cv.height !== S.ch) { cv.width = S.cw; cv.height = S.ch; } return cv; }
function geoFor(el) {
  const key = el.getAttribute('data-gl-key') || '', seed = hashStr(key);
  if (el.classList.contains('gl-tile')) { const sz = sizeOf(el), W = +el.getAttribute('data-gl-w') || sz[0], H = +el.getAttribute('data-gl-h') || sz[1]; return { id: 't|' + key + '|' + W + 'x' + H, kind: 'tile', host: el, sz, make: () => cutTile(seed, W, H) }; }
  if (el.classList.contains('gl-ab')) { const gx = el.querySelector('.gl-gx'), sz = sizeOf(gx); return { id: 'a|' + key + '|' + sz[0] + 'x' + sz[1], kind: 'card', host: gx, sz, make: () => cutPanel(seed, sz[0], sz[1]) }; }
  const D = DAYS.get(key) || { ev: [], cracked: true }; return { id: 'd|' + key + '|' + (D.cracked ? 1 : 0) + '|' + D.ev.map((e) => e.kind + Math.round(e.y)).join(','), kind: 'day', host: el, sz: sizeOf(el), make: () => cutDay(seed, D.ev, D.cracked) };
}
function stateFor(el, S, stage) { // which pieces are lit at a card stage: Absolution I = the half nearest the curse, II = all
  const I = S.items, n = I.length, G = S.geo, on = new Uint8Array(n), key = (it) => hyp(it.x, it.y - G.H);
  if (stage > 0) { const ks = I.map(key).sort((a, b) => a - b), kh = ks[Math.floor(n / 2)]; I.forEach((it, i) => { on[i] = stage >= 2 || key(it) <= kh ? 1 : 0; }); }
  return { on, pre: on, d: new Float32Array(n), base: .74, front: 0 }; }
function paintOne(el, g) {
  const S = entry(g.id, geoOf(g.id, g.make), g.sz[0], g.sz[1], g.kind === 'tile' ? 'tile' : 'lit'), key = el.getAttribute('data-gl-key'), cv = canvasFor(g.host, S);
  if (g.kind === 'tile') {
    const lit = +el.getAttribute('data-gl-lit') || 0; el._glS = S;
    if (el.getAttribute('data-gl-anim') === '1' && !ANIMD.has(key) && !RM()) { ANIMD.add(key); tileTo(el, 0, lit); return; }
    if (!el._glRaf) { drawTile(S, cv, lit, lit, Infinity); el._glLit = lit; tileGlints(el, S, lit); }
    return; }
  if (g.kind === 'card') {
    if (el._glRaf && el._glS === S) return; el._glS = S;
    const s = +el.getAttribute('data-gl-stage') || 0; drawLit(S, cv, stateFor(el, S, s), Infinity); cardGlints(el, S, s); return; }
  el._glS = S;
  if (el.getAttribute('data-gl-play') === '1' && !PLAYED.has(key)) { PLAYED.add(key); playDay(el); return; }
  if (!el._glRaf) { const n = S.items.length, on = new Uint8Array(n).fill(1); drawLit(S, cv, { on, pre: on, d: new Float32Array(n), base: .55, front: 0 }, Infinity); }
}
function paint(root) {
  css(); root = root || document;
  const els = Array.prototype.slice.call(root.querySelectorAll('.gl-tile,.gl-ab,.gl-day')); if (root.matches && root.matches('.gl-tile,.gl-ab,.gl-day')) els.unshift(root);
  let queued = false;
  els.forEach((el) => { const g = geoFor(el); if (g.sz[0] < 20 || g.sz[1] < 20) return; // hidden: try again on the next paint
    const dpr = DPRf(), ck = g.id + '@' + g.sz[0] + 'x' + g.sz[1] + '@' + dpr;
    if (CACHE.has(ck)) { paintOne(el, g); return; }
    if (QUEUE.some((j) => j.el === el)) return; QUEUE.push({ el, fn: () => paintOne(el, geoFor(el)) }); queued = true; });
  if (queued) pump();
}
function tileGlints(el, S, lit) { twinkle(el, S, lit >= .5 ? S.geo.stars : [], 2, hashStr(el.getAttribute('data-gl-key')) + 3); }
function cardGlints(el, S, s) { const st = stateFor(el, S, s), list = []; S.items.forEach((it, i) => { if (it.star && st.on[i]) list.push(it.star); }); twinkle(el.querySelector('.gl-gx'), S, list, s === 1 ? 3 : s === 2 ? 6 : 0, hashStr(el.getAttribute('data-gl-key')) + s); }
function tileTo(el, from, to) {
  const S = el._glS; if (!S) return; const cv = el.querySelector('canvas.gl-cv'), sw = el.querySelector('.gl-sweep');
  el._glLit = to; twinkle(el, S, [], 0, 1);
  if (sw && !RM()) { sw.classList.remove('gl-go'); void sw.offsetWidth; sw.classList.add('gl-go'); }
  run(el, 1900, (e) => { drawTile(S, cv, from, to, e); if (e === Infinity) tileGlints(el, S, to); });
}
function playDay(el) {
  const S = el._glS; if (!S) { paint(el); return; } const n = S.items.length, on = new Uint8Array(n).fill(1), d = new Float32Array(n), T = 5200;
  S.items.forEach((it, i) => { d[i] = it.y / S.geo.H * T; });
  const cv = el.querySelector('canvas.gl-cv'), st = { on, pre: new Uint8Array(n), d, base: .55, front: T };
  run(el, T + 1500, (e) => drawLit(S, cv, st, e));
}
const wait = (el, gen, ms) => new Promise((r) => setTimeout(() => r(el._glGen === gen && el.isConnected), RM() ? Math.min(ms, 60) : ms));
async function cardTo(el, s, o) {
  const S = el._glS, prev = +el.getAttribute('data-gl-stage') || 0; if (s <= prev) return;
  if (s - prev > 1) { await cardTo(el, prev + 1, Object.assign({}, o, { onDone: null })); if (!el.isConnected) return; await new Promise((r) => setTimeout(r, RM() ? 0 : 1900)); }
  const gen = (el._glGen = (el._glGen || 0) + 1), T = 1700;
  el.setAttribute('data-gl-stage', s); el.classList.remove('gl-s0', 'gl-s1', 'gl-s2'); el.classList.add('gl-s' + s);
  el.querySelector('.gl-lbl').textContent = LBL[s]; Array.prototype.forEach.call(el.querySelectorAll('.gl-pips i'), (p, k) => p.classList.toggle('gl-on', k < s));
  Array.prototype.forEach.call(el.querySelectorAll('.gl-ck[data-s="' + s + '"]'), (c) => c.classList.add('gl-on'));
  const gx = el.querySelector('.gl-gx');
  if (S) { // the light: I from the bottom corner by the curse to the middle, II from the middle on to the far end
    const I = S.items, n = I.length, key = (it) => hyp(it.x, it.y - S.geo.H), ks = I.map(key).sort((a, b) => a - b), kh = ks[Math.floor(n / 2)], km = ks[n - 1] || 1;
    const pre = stateFor(el, S, s - 1).on, on = stateFor(el, S, s).on, d = new Float32Array(n);
    I.forEach((it, i) => { if (on[i] && !pre[i]) { const k = key(it); d[i] = s === 1 ? k / (kh || 1) * T : (k - kh) / ((km - kh) || 1) * T; } });
    twinkle(gx, S, [], 0, 1); const cv = gx.querySelector('canvas.gl-cv');
    run(el, T + 1900, (e) => { drawLit(S, cv, { on, pre, d, base: .74, front: 0 }, e); if (e === Infinity && el._glGen === gen) cardGlints(el, S, s); });
  }
  if (o.to) sparks(gx, o.to, { n: 10, from: o.from, upto: o.upto, onSpark: o.onSpark });
  if (s < 2) return;
  if (!(await wait(el, gen, 2550))) return;
  el.classList.add('gl-absolving'); const a = document.createElement('div'); a.className = 'gl-absd'; a.innerHTML = '<span>Absolved</span>'; el.appendChild(a);
  if (!(await wait(el, gen, RM() ? 1200 : 2400))) return;
  el.dispatchEvent(new CustomEvent('gl-absolved', { bubbles: true, detail: { key: el.getAttribute('data-gl-key') } })); if (o.onDone) o.onDone(el);
}
function light(key, stage, o) {
  css(); o = o || {}; key = String(key);
  Array.prototype.slice.call(document.querySelectorAll('[data-gl-key]')).filter((el) => el.getAttribute('data-gl-key') === key).forEach((el) => {
    if (el.classList.contains('gl-tile')) { const to = clamp(stage == null ? 1 : +stage || 0, 0, 1), cur = el._glLit == null ? +el.getAttribute('data-gl-lit') || 0 : el._glLit; el.setAttribute('data-gl-lit', to); if (!el._glS) { paint(el); return; } tileTo(el, cur === to ? 0 : cur, to); }
    else if (el.classList.contains('gl-ab')) { if (!el._glS) paint(el); cardTo(el, clamp(+stage || 0, 0, 2), o); }
    else if (el.classList.contains('gl-day')) { if (!el._glS) { PLAYED.delete(key); paint(el); } else playDay(el); }
  });
}
let FX = null;
function sparks(fromEl, to, o) { // H3: sparks rise from the glass and land on the health bar, one sliver each
  o = o || {}; const tEl = typeof to === 'string' ? document.querySelector(to) : to, n = o.n || 10; if (!fromEl || !tEl) return;
  if (RM()) { if (o.onSpark) o.onSpark(n - 1, n); return; }
  css(); if (!FX || !FX.isConnected) { FX = document.createElement('div'); FX.className = 'gl-fx'; document.body.appendChild(FX); }
  const fr = fromEl.getBoundingClientRect(), tr = tEl.getBoundingClientRect(), f0 = o.from == null ? .8 : +o.from, f1 = o.upto == null ? 1 : +o.upto;
  for (let k = 0; k < n; k++) { const s = document.createElement('span'); s.className = 'gl-hspk'; const sx = fr.left + Math.random() * fr.width, sy = fr.top + fr.height * (.3 + Math.random() * .6);
    s.style.left = sx + 'px'; s.style.top = sy + 'px'; FX.appendChild(s); const tx = tr.left + tr.width * (f0 + (f1 - f0) * (k + 1) / n), ty = tr.top + tr.height / 2;
    setTimeout(() => { s.style.transform = 'translate(' + (tx - sx).toFixed(1) + 'px,' + (ty - sy).toFixed(1) + 'px)'; }, k * 95 + 30);
    setTimeout(() => { s.remove(); if (o.onSpark) o.onSpark(k, n); }, k * 95 + 690); }
}

window.GLASS = { tile, absolution, light, day, paint, sparks };
})();
