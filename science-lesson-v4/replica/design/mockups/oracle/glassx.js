/* The Oracle window glass: game-glass.js's own leaded-glass engine (copied for the mock-up), with day marks. */
window.ORX = (function () {
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
function vorSites(sites, r, lim) { /* Oracle copy: neighbours found through a bucket grid, so big windows cut fast */
  const B = new Map(), key = (i, j) => i * 100003 + j, cs = lim;
  sites.forEach((p, i) => { const k = key(Math.floor(p[0] / cs), Math.floor(p[1] / cs)); if (!B.has(k)) B.set(k, []); B.get(k).push(i); });
  return sites.map((p, i) => { let poly = rectPoly(r[0], r[1], r[2], r[3]); const ci = Math.floor(p[0] / cs), cj = Math.floor(p[1] / cs);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const L = B.get(key(ci + di, cj + dj)); if (!L) continue;
      L.forEach((j) => { const q = sites[j]; if (i === j || Math.abs(q[0] - p[0]) > lim || Math.abs(q[1] - p[1]) > lim) return;
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, nx = q[0] - p[0], ny = q[1] - p[1]; poly = clip(poly, (x, y) => (x - mx) * nx + (y - my) * ny); }); }
    return poly; }); }
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
Object.assign(PAL, { bgD: [[226, 50, 19], [232, 44, 17], [220, 52, 21], [240, 38, 18]], ring2: [[232, 52, 31], [238, 48, 29], [226, 54, 33]],
  aqua: [[172, 62, 64], [178, 58, 60], [168, 64, 68]], aquaL: [[176, 56, 46], [182, 50, 43], [170, 58, 49]], aquaM: [[188, 52, 31], [194, 48, 29], [184, 54, 33]], aquaD: [[198, 48, 17], [204, 44, 15], [194, 50, 19]],
  mviolet: [[262, 34, 27], [254, 30, 25], [270, 32, 29]], mdark: [[258, 28, 9], [266, 24, 8]],
  evil: [[148, 82, 56], [140, 78, 50], [156, 84, 62]], evilD: [[300, 34, 9], [292, 30, 8]], curseP: [[300, 42, 23], [292, 38, 21], [308, 40, 25]], restp: [[282, 32, 15], [276, 30, 13], [288, 34, 17]], restD: [[276, 30, 8], [270, 26, 7]], rest: [[218, 14, 62], [222, 12, 57], [214, 16, 66]], mshade: [[262, 30, 15], [252, 26, 13], [270, 28, 17]], bgm: [[200, 46, 29], [194, 50, 27], [206, 42, 31]],
  today: [[36, 42, 20], [30, 38, 17]], silver: [[210, 34, 86], [204, 44, 80], [216, 28, 90]], moonp: [[240, 22, 76], [232, 26, 70], [248, 20, 80]], ember: [[30, 72, 56], [26, 68, 50], [34, 74, 60]], fut: [[228, 22, 14], [236, 18, 12]] });
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
  const LK = (k) => k > 0 && k < nC && (!o.link || o.link(k));
  const nb = stars.map((s, k) => [LK(k) ? stars[k - 1] : null, LK(k + 1) ? stars[k + 1] : null].filter(Boolean).map((q) => Math.atan2(q[1] - s[1], q[0] - s[0])));
  stars.forEach((s, k) => { const R0 = sizes[k], a0 = srot[k] - PI / 2;
    F.rings.forEach((rg, ri) => { const n = rg.n, off = rg.off != null ? rg.off : PI / n, ring = [];
      for (let i = 0; i < n; i++) { const a = a0 + off + (rg.tw || 0) + i * 2 * PI / n, rr = rg.r * R0 * (1 + (ri ? (R() - .5) * (rg.jr || 0) : 0));
        ring.push({ x: s[0] + Math.cos(a) * rr, y: s[1] + Math.sin(a) * rr, a, star: k, ri }); }
      nb[k].forEach((na) => { let bi = 0, bd = 9; ring.forEach((p, i) => { const d = Math.abs(Math.atan2(Math.sin(p.a - na), Math.cos(p.a - na))); if (d < bd) { bd = d; bi = i; } }); ring[bi].pale = true; });
      ring.forEach((p) => { if (stars.every((q, j) => j === k || hyp(q[0] - p.x, q[1] - p.y) > outR(j) * .92)) sites.push(p); }); }); });
  const st = F.step, ps = [];
  for (let k = 1; k < nC; k++) { if (!LK(k)) continue; const A = stars[k - 1], B = stars[k], L = hyp(B[0] - A[0], B[1] - A[1]) || 1, nx = -(B[1] - A[1]) / L, ny = (B[0] - A[0]) / L, bow = (F.bow || 0) * L * (k % 2 ? 1 : -1);
    const C = [(A[0] + B[0]) / 2 + nx * bow, (A[1] + B[1]) / 2 + ny * bow], pts = [], len = [0];
    for (let i = 0; i <= 60; i++) { const t = i / 60, u = 1 - t; pts.push([u * u * A[0] + 2 * u * t * C[0] + t * t * B[0], u * u * A[1] + 2 * u * t * C[1] + t * t * B[1]]); if (i) len.push(len[i - 1] + hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
    const T = len[60], at = (d) => { let i = 1; while (i < 60 && len[i] < d) i++; const f = (d - len[i - 1]) / ((len[i] - len[i - 1]) || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f, pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]; };
    const d0 = outR(k - 1) + st * .55, d1 = T - outR(k) - st * .55, n = Math.max(0, Math.round((d1 - d0) / st));
    for (let i = 0; i <= n; i++) { if (d1 < d0 - st * .3) break; const d = n ? d0 + (d1 - d0) * i / n : (d0 + d1) / 2, q = at(d + (i && i < n ? (R() - .5) * st * .3 : 0)), tl = hyp(q[2], q[3]) || 1, j = (R() - .5) * (F.jag || 1.6);
      ps.push({ x: q[0] - q[3] / tl * j, y: q[1] + q[2] / tl * j, path: true }); } }
  const grid = []; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) grid.push({ x: inner[0] + (i + .5 + (R() - .5) * .8) * sx, y: inner[1] + (j + .5 + (R() - .5) * .8) * sy });
  const keep = grid.filter((g) => ps.every((q) => hyp(q.x - g.x, q.y - g.y) > (F.clr || st)) && sites.every((q) => hyp(q.x - g.x, q.y - g.y) > s0 * .62) && stars.every((s, k) => hyp(s[0] - g.x, s[1] - g.y) > outR(k) + s0 * .45));
  const all = keep.concat(sites, ps), polys = vorSites(all.map((q) => [q.x, q.y]), inner, 3.2 * Math.max(sx, sy));
  const edges = []; stars.forEach((s, k) => { const sh = shapeOf(motif(k), s[0], s[1], sizes[k], srot[k]); if (!sh) return; const ol = sh.outline;
    for (let i = 0; i < ol.length; i++) edges.push({ a: ol[i], b: ol[(i + 1) % ol.length], c: s, k }); });
  polys.forEach((p, i) => { if (p.length < 3) return; let q = p;
    /* Oracle: marks sit close together, so a piece is trimmed only by its nearest mark */
    let nk = -1, nd = 1e9; stars.forEach((st, k) => { const dd = hyp(st[0] - all[i].x, st[1] - all[i].y); if (dd < nd) { nd = dd; nk = k; } });
    edges.forEach((e) => { if (e.k !== nk) return; const m = [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2]; if (q.length < 3 || !inside(q, m[0], m[1])) return;
      const nx = e.b[1] - e.a[1], ny = e.a[0] - e.b[0], sc = Math.sign((e.c[0] - e.a[0]) * nx + (e.c[1] - e.a[1]) * ny);
      const q2 = clip(q, (x, y) => sc * ((x - e.a[0]) * nx + (y - e.a[1]) * ny)); if (q2.length >= 3 && area(q2) > area(q) * .55) q = q2; });
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
    if (motif(k) === 'half') { /* the rest-night half moon: three lit wedges on the left, the dark half on the right */
      const r = R0 * .95, x = s[0], y = s[1], arc = (a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + (a1 - a0) * i / n; return [x + Math.cos(t) * r, y + Math.sin(t) * r]; });
      const lit = [0, 1, 2].map((i) => [[x, y]].concat(arc(PI / 2 + i * PI / 3, PI / 2 + (i + 1) * PI / 3, 5)));
      const dark = [[x, y - r]].concat(arc(-PI / 2, PI / 2, 12));
      return { x, y, R0, moon: true, parts: lit.map((q) => ({ pts: q, g: fill(sf, false) })).concat([{ pts: dark, g: fill(o.halfShadow || 'shadow', false) }]), outline: arc(0, 2 * PI, 27).slice(0, 28) }; }
    if (motif(k) === 'moon') { const mp = moonPieces(s[0], s[1], R0 * .92, o.moonRot != null ? o.moonRot : srot[k] - 2.3);
      return { x: s[0], y: s[1], R0, moon: true, parts: mp.map((q, i) => ({ pts: q, g: fill(i === mp.length - 1 ? (o.moonShadow || 'shadow') : sf, false) })), outline: Array.from({ length: 28 }, (_, i) => [s[0] + Math.cos(i / 28 * 2 * PI) * R0 * .92, s[1] + Math.sin(i / 28 * 2 * PI) * R0 * .92]) }; }
    const sh = shapeOf(motif(k), s[0], s[1], R0, srot[k]);
    return { x: s[0], y: s[1], R0, parts: sh.parts.map((q) => ({ pts: q, g: fill(sf, false) })), outline: sh.outline }; });
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
/* Oracle: the day marks, all cut from the same engine. star = five honey diamonds; spark = four diamonds; gem = one diamond. */
function shapeOf(m, x, y, R0, rot) {
  if (m === 'moon') return null;
  if (m === 'gem') { const q = [[x, y - R0 * 1.05], [x + R0 * .62, y], [x, y + R0 * 1.05], [x - R0 * .62, y]]; return { parts: [q], outline: q }; }
  if (m === 'spark') { const d = R0 * .34, h = PI / 4, parts = [0, 1, 2, 3].map((k) => { const a = rot - PI / 2 + k * PI / 2, L = R0 * (k % 2 ? .74 : 1);
      return [[x, y], [x + Math.cos(a - h) * d, y + Math.sin(a - h) * d], [x + Math.cos(a) * L, y + Math.sin(a) * L], [x + Math.cos(a + h) * d, y + Math.sin(a + h) * d]]; });
    return { parts, outline: [].concat.apply([], parts.map((q) => [q[1], q[2]])) }; }
  const rh = rhombi(x, y, R0, rot); return { parts: rh, outline: [].concat.apply([], rh.map((q) => [q[1], q[2]])) };
}

/* draw a cut window into a canvas: colour, a glow behind the lit marks, then lead, bubbles and the overhead light */
function render(cv, G, cssW, cssH, o) {
  prep(G); const S = { geo: G }; fitTo(S, cssW, cssH, DPRf()); cv.width = S.cw; cv.height = S.ch; cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
  const x = cv.getContext('2d'), col = drawCol(S, false)[0], top = drawTop(S);
  x.save(); if (o.shape) { x.setTransform(S.k, 0, 0, S.k, S.ox, S.oy); x.clip(new Path2D(o.shape)); x.setTransform(1, 0, 0, 1, 0, 0); }
  x.fillStyle = o.base || '#24356a'; x.fillRect(0, 0, S.cw, S.ch); x.drawImage(col, 0, 0);
  if (o.dim) { x.fillStyle = 'rgba(2,3,10,' + o.dim + ')'; x.fillRect(0, 0, S.cw, S.ch);
    x.setTransform(S.k, 0, 0, S.k, S.ox, S.oy); G.stars.forEach((s) => { if (!s.lit) return; x.save(); x.beginPath(); x.arc(s.x, s.y, s.R0 * 2.9, 0, 2 * PI); x.clip(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(col, 0, 0); x.restore(); }); x.setTransform(1, 0, 0, 1, 0, 0); }
  x.drawImage(top, 0, 0);
  x.globalCompositeOperation = 'lighter'; x.filter = 'blur(' + (o.blur || 3) * S.dpr + 'px)'; x.setTransform(S.k, 0, 0, S.k, S.ox, S.oy);
  G.stars.forEach((s) => { if (!s.lit) return; x.globalAlpha = s.lit; s.parts.forEach((q) => fillGlass(x, q.P, q.pts, q.g)); });
  x.restore(); return S; }
return { cut, render, RM };
})();
