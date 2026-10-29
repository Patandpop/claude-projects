/* The Oracle in stained glass (Patryk's pick, 28 Oct 2026; built 29 Oct). Replaces the old sigils and star chart in the Den.
   R1 blessing glass rose window: five weeks in five rings (oldest in the middle), seven spokes with Monday at the top,
   every day a pane of leaded glass with its mark cut in two rings of glass: a honey star (all or most rituals kept),
   the M3 ember (some kept), a pale moon (none kept), an evil half moon in cursed purple rings (rest night), dark unlit
   glass for days to come. E1 gold eye in the middle. Today's pane pulses. Tap a day for that night's sheet.
   The glass cutter is the Oracle copy of game-glass.js's engine (replica/design/mockups/oracle/glassx.js), which adds
   the day marks (gem, moon, half moon), a bucket-grid cutter for big windows and per-piece colour families; GLASS
   itself does not expose a general cut, so it lives here. API: window.ORACLE = { html(chron), paint(root), open(i), close() }. */
(function () {
if (typeof window === 'undefined' || window.ORACLE) return;
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
const ORX = { cut, render };

/* ---------- the rose window (B2 R1, from replica/design/mockups/oracle/rose.js) ---------- */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DNL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const f = (v) => (+v).toFixed(1);
/* the day's mark: star = all or most kept, mid (the ember) = some, moon = none, off = the evil half moon (rest day),
   today with nothing much yet = plain warm glass, future = dark unlit glass */
const kind = (d) => d.fut ? 'future' : d.lv === 'off' ? 'off' : d.lv === 'all' || d.lv === 'most' ? 'star' : d.lv === 'some' ? 'mid' : d.now ? 'today' : 'moon';
const MARKED = { star: 1, mid: 1, moon: 1, off: 1 };
const FIT = { s: 10, lw: .9, step: 7.6 };
const motifOf = (kd) => kd === 'star' ? 'star' : kd === 'moon' ? 'moon' : kd === 'off' ? 'half' : 'gem';
const famOf = (kd) => kd === 'star' ? 'star' : kd === 'moon' ? 'moonp' : kd === 'off' ? 'evil' : 'ember';
const PANEL = { star: 'bgD', mid: 'aquaD', moon: 'mdark', off: 'restD', today: 'today', future: 'fut' };
const HALO = { star: 'haloB', mid: 'aquaL', moon: 'mviolet', off: 'curseP' };
const RING2 = { star: 'ring2', mid: 'aquaM', moon: 'mshade', off: 'restp' };
const LIT = { star: .78, mid: .55, off: .48 };
const C = 200, RI = (w) => 48 + 27 * w, ang = (k) => (-90 + k * 360 / 7) * Math.PI / 180, P = (r, a) => [C + Math.cos(a) * r, C + Math.sin(a) * r];
const circ = (cx, cy, r) => 'M' + (cx - r) + ' ' + cy + 'A' + r + ' ' + r + ' 0 1 0 ' + (cx + r) + ' ' + cy + 'A' + r + ' ' + r + ' 0 1 0 ' + (cx - r) + ' ' + cy + 'Z';
const sector = (r0, r1, a0, a1) => { const A = P(r1, a0), B = P(r1, a1), Cc = P(r0, a1), Dd = P(r0, a0);
  return 'M' + f(A[0]) + ' ' + f(A[1]) + 'A' + r1 + ' ' + r1 + ' 0 0 1 ' + f(B[0]) + ' ' + f(B[1]) + 'L' + f(Cc[0]) + ' ' + f(Cc[1]) + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + f(Dd[0]) + ' ' + f(Dd[1]) + 'Z'; };

/* the five weeks from the server's chronicle (35 days from Monday four weeks ago) */
function days(chron) {
  return (chron && chron.days || []).slice(0, 35).map((x, i) => { const p = String(x.day).split('-').map(Number), dd = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return { i, w: Math.floor(i / 7), k: i % 7, day: x.day, lv: x.level, fut: !!x.future, now: !!x.today, n: x.n || 0, due: x.due || 0, curses: x.curses || 0, blessings: x.blessings || 0, vesp: x.vespers || '',
      high: i % 7 === 6, date: dd.getUTCDate() + ' ' + MON[dd.getUTCMonth()], dn: DNL[i % 7] }; });
}
const keyOf = (D) => D.map((d) => kind(d)[0] + (d.now ? '!' : '')).join('');
function geo(D) {
  const W = [0, 1, 2, 3, 4].map((w) => D.slice(w * 7, w * 7 + 7)), marks = [];
  W.forEach((wk, w) => wk.forEach((d, k) => { const kd = kind(d); if (MARKED[kd]) { const p = P(RI(w) + 13.5, ang(k)), R0 = Math.min(7, 5.8 + w * .35); marks.push({ x: p[0], y: p[1], R0: kd === 'moon' || kd === 'off' ? R0 * 1.08 : R0, d }); } }));
  const panelOf = (x, y) => { const r = Math.hypot(x - C, y - C), w = Math.floor((r - 48) / 27); if (w < 0 || w > 4) return null;
    let a = Math.atan2(y - C, x - C) * 180 / Math.PI + 90; a = (a + 360) % 360; const k = Math.round(a / (360 / 7)) % 7; return W[w][k] || null; };
  const G = ORX.cut({ w: 400, h: 400, seed: 192, s: FIT.s, lw: FIT.lw, events: marks.map((q) => ({ x: q.x, y: q.y })), nChain: marks.length, sizes: () => marks.map((q) => q.R0),
    fit: { rings: [{ n: 10, r: 1.45 }, { n: 12, r: 1.95, jr: .05 }], step: FIT.step, clr: FIT.step * .97, bow: .12, jag: 1.6 }, link: () => false, moonRot: Math.PI / 2, moonShadow: 'mdark', halfShadow: 'evilD',
    motif: (k) => motifOf(kind(marks[k].d)), motifFam: (k) => famOf(kind(marks[k].d)),
    famFx: (kd, src, c) => { const d = panelOf(c[0], c[1]), pk = d ? kind(d) : 'star';
      if (kd === 'path') return { fam: 'paleB' };
      if (kd === 'ring' && src.ri === 0 && HALO[pk]) return { fam: HALO[pk], lit: pk !== 'moon' };
      if (kd === 'ring' && src.ri >= 1 && RING2[pk]) return { fam: RING2[pk] };
      return { fam: d ? PANEL[pk] || 'bg' : 'bg' }; }, lightAt: [.5, .12] });
  G.stars.forEach((s, k) => { s.lit = LIT[kind(marks[k].d)] || .22; });
  return { G, marks, W };
}
const aria = (d) => d.dn + ' ' + d.date + (d.fut ? ', still to come' : d.lv === 'off' ? ', a rest night' : ', ' + d.n + ' of ' + d.due + ' rituals kept') + (d.now ? ', today' : '');
function hit(d, path, q) {
  const fut = d.fut;
  return '<g class="' + (fut ? 'rs-fut' : 'jw') + '"' + (fut ? '' : ' role="button" tabindex="0" data-od="' + d.i + '"') + ' aria-label="' + esc(aria(d)) + '"><path class="ring" d="' + path + '" fill="transparent"/>' +
    (d.now ? '<path class="rs-now" d="' + path + '" fill="none" stroke="#e8b84e" stroke-width="2"/>' : '') +
    (d.high && !fut && q ? '<circle cx="' + f(q.x) + '" cy="' + f(q.y) + '" r="' + f(q.R0 * 1.55 + 3) + '" fill="none" stroke="#d9b45c" stroke-width="1.2" stroke-dasharray="1.6 2.4" pointer-events="none"/>' : '') + '</g>'; }
const STONE = '<linearGradient id="RS-st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3842"/><stop offset="1" stop-color="#1f1e25"/></linearGradient>';
const bar = (dPath, w) => '<path d="' + dPath + '" fill="none" stroke="#0a0b10" stroke-width="' + (w + 2) + '" stroke-linecap="round"/><path d="' + dPath + '" fill="none" stroke="url(#RS-st)" stroke-width="' + w + '" stroke-linecap="round"/><path d="' + dPath + '" fill="none" stroke="#5a5764" stroke-width=".7" stroke-opacity=".7"/>';
/* E1 the gold eye: an almond of cut crystal, twelve facets round the iris, the iris in three facet rings (soft outside,
   vivid inside), a dark slit pupil */
const SCL = ['#f4cc62', '#d9a23a', '#b8822a'], IRIS = [['#c8a85c', '#b89a5e', '#d6b25a'], ['#e0a632', '#c98a1c', '#e8b83c', '#b8761a'], ['#ff9a0a', '#ff7a00', '#ffb000'], '#5a1e00'], PUPIL = '#0a0604';
function eye(cx, cy) {
  const W = 39, H = 22, RIr = 18.5, RP = 5.5, N = 12, al = (t) => { const sn = Math.sin(t); return [cx + Math.cos(t) * W, cy + Math.sign(sn) * H * Math.pow(Math.abs(sn), 1.35)]; };
  let h = '<g class="rs-eye">';
  for (let i = 0; i < N; i++) { const t0 = i * 2 * Math.PI / N, t1 = (i + 1) * 2 * Math.PI / N, a = al(t0), b = al(t1), c = [cx + Math.cos(t1) * RIr, cy + Math.sin(t1) * RIr], d = [cx + Math.cos(t0) * RIr, cy + Math.sin(t0) * RIr];
    h += '<path d="M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]) + 'L' + f(c[0]) + ' ' + f(c[1]) + 'L' + f(d[0]) + ' ' + f(d[1]) + 'Z" fill="' + SCL[i % 3] + '" stroke="#0a0b10" stroke-width="1.3" stroke-linejoin="round"/>'; }
  const RR = [RIr, 14, 9.8, RP], NN = [12, 10, 8];
  for (let ring = 0; ring < 3; ring++) { const n = NN[ring], ro = RR[ring], ri = RR[ring + 1], sp = ring * .31, cols = IRIS[ring];
    for (let i = 0; i < n; i++) { const t0 = sp + i * 2 * Math.PI / n, t1 = sp + (i + 1) * 2 * Math.PI / n;
      h += '<path d="M' + f(cx + Math.cos(t0) * ro) + ' ' + f(cy + Math.sin(t0) * ro) + 'L' + f(cx + Math.cos(t1) * ro) + ' ' + f(cy + Math.sin(t1) * ro) + 'L' + f(cx + Math.cos(t1) * ri) + ' ' + f(cy + Math.sin(t1) * ri) + 'L' + f(cx + Math.cos(t0) * ri) + ' ' + f(cy + Math.sin(t0) * ri) + 'Z" fill="' + cols[i % cols.length] + '" stroke="#0a0b10" stroke-width="' + (ring ? .8 : 1) + '" stroke-linejoin="round"/>'; } }
  h += '<circle cx="' + cx + '" cy="' + cy + '" r="' + RP + '" fill="' + IRIS[3] + '" stroke="#0a0b10" stroke-width=".8"/>';
  h += '<path d="M' + cx + ' ' + (cy - 13) + 'Q' + (cx + 3.6) + ' ' + cy + ' ' + cx + ' ' + (cy + 13) + 'Q' + (cx - 3.6) + ' ' + cy + ' ' + cx + ' ' + (cy - 14) + 'Z" fill="' + PUPIL + '" stroke="#0a0b10" stroke-width="1.2"/>';
  h += '<path d="M' + (cx - 20) + ' ' + (cy - 9) + 'L' + (cx - 11) + ' ' + (cy - 12) + 'L' + (cx - 13) + ' ' + (cy - 7) + 'Z" fill="#fff" opacity=".55"/>';
  return h + '</g>'; }
/* the stone over the glass: frame, seven spokes between the days, four week rings, the eye, the tap areas, the day letters */
function svg(g) {
  let h = '<svg class="rs-over" viewBox="-16 -16 432 432" role="group" aria-label="The Oracle, rose window"><defs>' + STONE + '</defs>';
  h += '<path d="M-16 -16H416V416H-16Z' + circ(200, 200, 190) + '" fill="#000" fill-rule="evenodd"/>';
  h += '<circle cx="200" cy="200" r="191" fill="none" stroke="#0a0b10" stroke-width="10"/><circle cx="200" cy="200" r="191" fill="none" stroke="url(#RS-st)" stroke-width="8"/><circle cx="200" cy="200" r="195" fill="none" stroke="#5a5764" stroke-width=".8"/>';
  for (let k = 0; k < 7; k++) { const a = P(48, ang(k + .5)), b = P(184, ang(k + .5)); h += bar('M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]), 3.6); }
  [75, 102, 129, 156].forEach((r) => { h += bar(circ(200, 200, r), 2.8); });
  h += bar(circ(200, 200, 184), 4.5);
  h += '<circle cx="200" cy="200" r="48" fill="url(#RS-st)" stroke="#0a0b10" stroke-width="3"/>' + eye(200, 200);
  const mk = {}; g.marks.forEach((q) => { mk[q.d.i] = q; });
  g.W.forEach((wk, w) => wk.forEach((d, k) => { h += hit(d, sector(RI(w) + 1.5, RI(w) + 25.5, ang(k - .5), ang(k + .5)), mk[d.i]); }));
  DL.forEach((l, k) => { const p = P(206, ang(k)); h += '<text x="' + f(p[0]) + '" y="' + f(p[1] + 4) + '" text-anchor="middle" class="lab" style="fill:' + (k === 0 ? '#e8c46e' : '#c9bf9f') + '">' + l + '</text>'; });
  return h + '</svg>';
}

/* ---------- styles (once) ---------- */
const CSS = '.orx{padding:12px 10px 14px;border-radius:12px;background:#000;border:1px solid #1c1f28;display:flex;flex-direction:column;gap:6px}' +
  '.orx h4{margin:0 2px;font:500 24px/1 var(--g,serif);color:#e9dcb8;text-shadow:0 0 14px rgba(232,196,110,.25);display:flex;justify-content:space-between;align-items:baseline;gap:8px}.orx h4 span{font:700 13px var(--a,sans-serif);color:#a7a08c;white-space:nowrap;text-shadow:none}' +
  '.orx-win{position:relative;width:100%;aspect-ratio:1/1;overflow:hidden}.orx-win canvas,.orx-win .rs-over{position:absolute;display:block}.orx-win canvas{left:3.704%;top:3.704%;width:92.593%;height:92.593%;filter:brightness(1.28) saturate(1.18)}.orx-win .rs-over{inset:0;width:100%;height:100%}' +
  '.orx-win .lab{font:700 15px var(--a,sans-serif)}.rs-over .jw{cursor:pointer;-webkit-tap-highlight-color:transparent}.rs-over .jw:focus{outline:none}.rs-over .jw:focus-visible .ring{stroke:#fff;stroke-width:2}' +
  '.rs-over .rs-now{animation:orxPulse 2.6s ease-in-out infinite}@keyframes orxPulse{50%{opacity:.3}}' +
  '.orx-leg{display:flex;flex-wrap:wrap;gap:4px 12px;font:13px var(--a,sans-serif);color:#a7a39a;margin:4px 2px 0}.orx-leg span{display:flex;align-items:center;gap:5px}.orx-leg i{width:10px;height:10px;border-radius:50%;display:inline-block;flex:none}.orx-hint{font:13px var(--a,sans-serif);color:#8b8576;margin:0 2px}' +
  '.orx-scrim{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:90}' +
  '.orx-sh{--g:"Grenze Gotisch",serif;--a:"Atkinson Hyperlegible",system-ui,sans-serif;box-sizing:border-box;position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:min(100%,430px);max-height:85vh;overflow-y:auto;z-index:91;background:linear-gradient(#10171d,#090d10 40%);border:1px solid #2c3442;border-bottom:0;border-radius:16px 16px 0 0;padding:16px 16px calc(22px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 40px #000;color:#e6e1d3;font:15px var(--a)}' +
  '.orx-sh .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.orx-sh .kind{font:700 13px var(--a);letter-spacing:.16em;text-transform:uppercase;color:#e8c46e}.orx-sh h3{margin:2px 0 0;font:500 30px/1 var(--g);color:#f1e6c8}' +
  '.orx-sh .x{flex:none;width:44px;height:44px;border-radius:50%;border:1px solid #3a4250;background:#121820;color:#d8d2c0;font:700 18px var(--a);cursor:pointer}' +
  '.orx-sh .rits{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}.orx-sh .dots{display:flex;gap:5px;flex-wrap:wrap}.orx-sh .dots i{width:13px;height:13px;border-radius:50%;background:#20232b;box-shadow:inset 0 0 0 1px #3a3e48}' +
  '.orx-sh .dots i.on{background:radial-gradient(circle at 40% 35%,#fff1c4,#e8c46e 45%,#8a6420);box-shadow:0 0 6px rgba(232,196,110,.6)}.orx-sh .rits b{font:700 15px var(--a)}.orx-sh .chip{font:700 13px var(--a);padding:3px 9px;border-radius:999px;border:1px solid}' +
  '.orx-sh .row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.orx-sh .row div{padding:10px 12px;border-radius:8px;background:#121820;border:1px solid #2a3240;font:13px var(--a);color:#a7a39a}.orx-sh .row b{display:block;font:500 26px/1.1 var(--g)}' +
  '.orx-sh .note{margin:12px 0 0;padding:10px 12px;border-radius:8px;background:#121820;border:1px solid #2a3240;color:#cfd3da;font-size:14px}' +
  '@media (prefers-reduced-motion:reduce){.rs-over .rs-now{animation:none}}';
function css() { if (document.getElementById('orx-css')) return; const s = document.createElement('style'); s.id = 'orx-css'; s.textContent = CSS; document.head.appendChild(s); }

/* ---------- the Den panel: html() then paint() ---------- */
const LEG = '<div class="orx-leg"><span><i style="background:#f0c860"></i>star: all or most kept</span><span><i style="background:#d98a3a"></i>ember: some kept</span><span><i style="background:#a6a4c4"></i>moon: none kept</span><span><i style="background:#4fe39a"></i>half moon: rest night</span></div>';
let CH = null, DAYS = [];
function html(chron) {
  css(); CH = chron; DAYS = days(chron);
  const kept = DAYS.filter((d) => !d.fut && (d.lv === 'all' || d.lv === 'most')).length;
  return '<div class="orx"><h4>Oracle<span>' + kept + ' nights kept in 5 weeks</span></h4><div class="orx-win"></div>' + LEG + '<p class="orx-hint">Tap a pane of glass to see that night.</p></div>';
}
/* the cut is cached per five weeks of marks, the drawn canvas per width too, so a repaint just moves the canvas back in */
const CACHE = { key: '', g: null, svg: '', cv: null, w: 0 };
let job = 0;
function paint(root) {
  const el = root && root.querySelector('.orx-win'); if (!el || !DAYS.length) return;
  const key = keyOf(DAYS) + '|' + (DAYS[0] && DAYS[0].day);
  const put = () => { const host = root.querySelector('.orx-win'); if (!host) return false; const w = Math.round(host.clientWidth * .92593) || 320;
    if (CACHE.cv && CACHE.key === key && CACHE.w === w) { if (CACHE.cv.parentNode !== host) { host.innerHTML = ''; host.appendChild(CACHE.cv); host.insertAdjacentHTML('beforeend', CACHE.svg); } return true; }
    if (CACHE.key !== key || !CACHE.g) return false;
    const cv = document.createElement('canvas'); ORX.render(cv, CACHE.g.G, w, w, { shape: circ(200, 200, 190) }); cv.setAttribute('aria-hidden', 'true');
    CACHE.cv = cv; CACHE.w = w; host.innerHTML = ''; host.appendChild(cv); host.insertAdjacentHTML('beforeend', CACHE.svg); return true; };
  wire(root);
  if (put()) return;
  const my = ++job; /* the cut is the slow part: let the Den show first, then cut and draw the window */
  setTimeout(() => { if (my !== job) return; if (CACHE.key !== key) { CACHE.g = geo(DAYS); CACHE.svg = svg(CACHE.g); CACHE.key = key; CACHE.cv = null; } put(); }, 30);
}

/* ---------- tap a day: that night's sheet ---------- */
let wired = null, last = null;
function wire(root) {
  if (wired === root) return; wired = root;
  root.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-od]'); if (t) { e.stopPropagation(); open(+t.getAttribute('data-od')); } });
  root.addEventListener('keydown', (e) => { const t = e.target.closest && e.target.closest('[data-od]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(+t.getAttribute('data-od')); } });
}
const LVL = { all: ['All kept', '#e8c46e'], most: ['Most kept', '#e8c46e'], some: ['Some kept', '#d98a3a'], none: ['None kept', '#a6a4c4'], off: ['Rest night', '#4fe39a'] };
function close() { const s = document.querySelector('.orx-sh'), c = document.querySelector('.orx-scrim'); if (s) s.remove(); if (c) c.remove(); document.removeEventListener('keydown', esc1); if (last && last.focus && document.contains(last)) last.focus(); }
function esc1(e) { if (e.key === 'Escape') close(); }
function open(i) {
  const d = DAYS[i]; if (!d || d.fut) return; close(); css(); last = document.activeElement;
  const lv = d.now && !(d.lv === 'all' || d.lv === 'most' || d.lv === 'off') ? ['So far', '#e8c46e'] : LVL[d.lv] || LVL.none;
  let h = '<div class="top"><div><div class="kind">' + (d.high ? 'High Vespers' : 'Vespers') + (d.now ? ', tonight' : '') + '</div><h3 id="orxT">' + d.dn + ' ' + d.date + '</h3></div><button type="button" class="x" aria-label="Close">&#x2715;</button></div>';
  if (d.lv === 'off') h += '<div class="rits"><span class="chip" style="color:' + lv[1] + ';border-color:' + lv[1] + '">' + lv[0] + '</span><b>Rituals rested</b></div><p class="note">A half-moon night: no rituals were due, so nothing was lost. The streak waited.</p>';
  else h += '<div class="rits"><span class="dots">' + Array.from({ length: Math.min(d.due, 12) }, (_, k) => '<i class="' + (k < d.n ? 'on' : '') + '"></i>').join('') + '</span><b>' + d.n + ' of ' + d.due + ' rituals kept</b><span class="chip" style="color:' + lv[1] + ';border-color:' + lv[1] + '">' + lv[0] + '</span></div>';
  h += '<div class="row"><div><b style="color:#ff8a76">' + d.curses + '</b>curse' + (d.curses === 1 ? '' : 's') + ' logged</div><div><b style="color:#9cc4ff">' + d.blessings + '</b>blessing' + (d.blessings === 1 ? '' : 's') + ' logged</div></div>';
  h += '<p class="note">' + (d.vesp === 'clean' ? 'Vespers kept: a clean night, no curses to tell.' : d.vesp ? 'Vespers kept: the night was logged.' : d.now ? 'Tonight\'s Vespers has not been kept yet.' : d.lv === 'off' ? 'No Vespers on a rest night.' : 'Vespers was not kept this night.') + '</p>';
  const sc = document.createElement('div'); sc.className = 'orx-scrim'; sc.addEventListener('click', close);
  const sh = document.createElement('div'); sh.className = 'orx-sh'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); sh.setAttribute('aria-labelledby', 'orxT'); sh.innerHTML = h;
  sh.querySelector('.x').addEventListener('click', close);
  document.body.appendChild(sc); document.body.appendChild(sh); document.addEventListener('keydown', esc1); sh.querySelector('.x').focus();
}

window.ORACLE = { html, paint, open, close };
})();
