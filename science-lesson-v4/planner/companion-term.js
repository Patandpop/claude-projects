/* Ulhu, the "Who I'm becoming" term page (Lane D, life companion). First look: the approved mock-up
   replica/design/mockups/companion/term-page-a2.html. Round two (Patryk, 30 Oct 2026): "consistency is key", so every piece
   of glass here is made the same way as the game's own glass (game-highvespers.js and game-glass.js): streaky antique sheets
   (a six-stop linear gradient per piece, hue and lightness drifting), hairline dark lead (#06070c), a heavier outline, a
   segmented honey border band, a few bubbles and a soft overhead light. Lit glass glows; unlit glass is deep night glass.
   The identity colours are IDC from game-highvespers.js. The chapter windows are the High Vespers "Week in Glass" lancets
   (blue blessings, red curses, the honey border band for rituals) with a red seal set into the head when the week is closed.
   The data is cTerm_ in Companion.gs, asked for with X.call('gameCompanionTerm') when the page opens.
   HIS RULE (word for word): "Every stained-glass design must be real stained glass: each shape is its own glass piece
   with dark lead lines between all pieces, and lit pieces glow like light through glass. Never draw ordinary shapes or
   icons and lay them on top of a glass background. Only 1 or 2 lead breaks per section (more looks bad), and the design
   must be obvious at a glance."
   So every emblem below is cut out of the window itself: the background glass only exists where the emblem is not.
   Plain browser script, no modules. Loads harmlessly in node (nothing touches the page until render is called).
   window.UZCOMP_TERM = { render(el, X), windowSVG(name, votes, panes), chapterWindow(chapter, maxRituals, to) } (the last two are for the gallery mock-up). */
(function (root) {
  'use strict';

  /* ---------- small helpers ---------- */
  const LEAD = '#06070c';
  const f = (n) => (+n).toFixed(2);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function centroid(p) { let x = 0, y = 0; p.forEach((q) => { x += q[0]; y += q[1]; }); return [x / p.length, y / p.length]; }
  function inPoly(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  function clipHalf(poly, o, n) {
    const out = [], d = (q) => (q[0] - o[0]) * n[0] + (q[1] - o[1]) * n[1];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], da = d(a), db = d(b);
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  const normal = (deg) => { const a = deg * Math.PI / 180; return [-Math.sin(a), Math.cos(a)]; };
  // one straight glass cut: through point (x,y) at angle deg, splitting only the piece that holds the point
  function cut(pieces, c) {
    const x = c[0], y = c[1], i = pieces.findIndex((p) => inPoly(x, y, p)); if (i < 0) return pieces;
    const n = normal(c[2]), A = clipHalf(pieces[i], [x, y], n), B = clipHalf(pieces[i], [x, y], [-n[0], -n[1]]);
    if (A.length < 3 || B.length < 3) return pieces; pieces.splice(i, 1, A, B); return pieces;
  }
  const pathD = (p) => 'M' + p.map((q) => f(q[0]) + ' ' + f(q[1])).join('L') + 'Z';
  // a pointed lancet arch as a polygon
  function arch(x0, x1, spring, apex, bottom) {
    const half = (x1 - x0) / 2, rise = spring - apex, R = (half * half + rise * rise) / (2 * half), N = 12;
    const aA = Math.atan2(-rise, half - R), L = [], Rt = [];
    for (let i = 0; i <= N; i++) { const a = -Math.PI + (aA + Math.PI) * i / N; L.push([x0 + R + R * Math.cos(a), spring + R * Math.sin(a)]); }
    for (let i = N; i >= 0; i--) { const p = L[i]; Rt.push([x0 + x1 - p[0], p[1]]); }
    return [[x0, bottom]].concat(L, Rt.slice(1), [[x1, bottom]]);
  }
  // a slice of a ring (r = 0 makes a pie slice), angles in degrees, 0 = right, 90 = down
  function ringSector(cx, cy, R, r, a1, a2, n) {
    n = n || 6; const out = [];
    for (let i = 0; i <= n; i++) { const a = (a1 + (a2 - a1) * i / n) * Math.PI / 180; out.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
    if (r <= 0) out.push([cx, cy]);
    else for (let i = n; i >= 0; i--) { const a = (a1 + (a2 - a1) * i / n) * Math.PI / 180; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return out;
  }
  const polar = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const roman = (n) => ROMAN[n] || String(n || '');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function nice(day) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(day || '')); return m ? Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] : String(day || ''); }
  function dayNo(day) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(day || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : NaN; }
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  function hexHsl(hex) {
    const v = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255), mx = Math.max.apply(null, v), mn = Math.min.apply(null, v), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === v[0] ? (v[1] - v[2]) / d + (v[1] < v[2] ? 6 : 0) : mx === v[1] ? (v[2] - v[0]) / d + 2 : (v[0] - v[1]) / d + 4; h *= 60; }
    return [h, s * 100, l * 100];
  }

  /* ---------- the game's glass: the same sheets, lead and light as High Vespers ---------- */
  // the antique palette (hue, saturation, lightness), the families game-highvespers.js and game-glass.js use
  const GPAL = { blue: [[220, 62, 44], [228, 56, 40], [212, 66, 46], [236, 48, 42]], red: [[352, 66, 36], [345, 60, 32], [0, 66, 38], [338, 52, 30]],
    honey: [[38, 58, 54], [34, 54, 50], [42, 60, 58]], honeyD: [[32, 34, 17], [28, 30, 15], [36, 32, 19]], night: [[228, 30, 11], [236, 26, 13], [220, 28, 10], [250, 22, 12]],
    pale: [[204, 52, 70], [212, 46, 66], [198, 56, 74], [218, 40, 68]], gold: [[42, 70, 56], [38, 66, 50], [46, 74, 60], [34, 62, 46]],
    star: [[42, 60, 72], [38, 56, 66], [46, 58, 76], [40, 52, 70]], blood: [[356, 82, 56], [350, 76, 52], [4, 80, 55]], chaloD: [[340, 40, 12], [350, 44, 14], [332, 36, 13]],
    parch: [[42, 46, 82], [38, 40, 78], [46, 44, 84]],
    field: [[220, 60, 30], [228, 52, 26], [214, 64, 33], [242, 42, 28], [205, 55, 30], [256, 38, 30]] };
  // each identity's own colour (IDC in game-highvespers.js)
  const IDC = { Scholar: '#e8b84a', Sanctified: '#8fd0ff', Wordsmith: '#b48cff', Diligent: '#ff9a4a', Wanderer: '#5ef2a0', Leviathan: '#3ab8c0', Nourished: '#ff6a7a', Devoted: '#f080c8',
    Steadfast: '#c8c0a0', Trusted: '#6a9aff', Mentor: '#e0d060', Dreamer: '#9a7aff', Serene: '#7adcd8', Homeflame: '#ff7a3a', Frugal: '#9ad06a', Valiant: '#ff4a5a' };
  const hsl = (h, s, l) => 'hsl(' + (((h % 360) + 360) % 360).toFixed(0) + ',' + clamp(s, 10, 95).toFixed(0) + '%,' + clamp(l, 4, 90).toFixed(0) + '%)';
  // one sheet of streaky glass: a linear gradient across the piece's box, six stops (gGrad in game-highvespers.js)
  function sheet(id, R, c, amp) {
    amp = amp || 1;
    const a = R() * Math.PI, x = Math.cos(a) * 0.5, y = Math.sin(a) * 0.5, h = c[0] + (R() - 0.5) * 10, s = c[1] + (R() - 0.5) * 12, l = c[2] + (R() - 0.5) * 6;
    const st = [[0, 6], [0.16 + R() * 0.1, -5], [0.36 + R() * 0.1, 9], [0.55 + R() * 0.08, -6], [0.74 + R() * 0.1, 5], [1, -3]];
    return '<linearGradient id="' + id + '" x1="' + f(0.5 - x) + '" y1="' + f(0.5 - y) + '" x2="' + f(0.5 + x) + '" y2="' + f(0.5 + y) + '">' +
      st.map((q) => '<stop offset="' + q[0].toFixed(2) + '" stop-color="' + hsl(h + (R() - 0.5) * 8, s + (R() - 0.5) * 8, l + q[1] * amp) + '"/>').join('') + '</linearGradient>';
  }
  let RID = 0;
  // a glazier for one svg: hands out sheet gradients (ids unique to this svg) and collects pieces, lead and glow
  let SUB = 0;
  function glazier(uid, seed, R) {
    R = R || rng(seed);
    const sheets = {}, g = { R, defs: '', glass: '', lead: '', bloom: '' };
    // pieces of the same colour share a few sheets (as High Vespers does), so a big window stays light to draw
    const sheetFor = (c, amp) => { const k = c.map((v) => Math.round(v)).join(',') + '/' + (amp || 1), l = sheets[k] || (sheets[k] = []);
      if (l.length < 3) { const id = uid + 's' + Object.keys(sheets).length + '-' + l.length; g.defs += sheet(id, R, c, amp); l.push(id); return id; }
      return l[Math.floor(R() * l.length)]; };
    g.piece = (pts, hslC, glow, amp) => { const d = typeof pts === 'string' ? pts : pathD(pts); g.glass += '<path d="' + d + '" fill="url(#' + sheetFor(hslC, amp) + ')"/>'; g.lead += d;
      if (glow) g.bloom += '<path d="' + d + '" fill="' + glow + '"/>'; return d; };
    g.fam = (name) => { const l = GPAL[name] || GPAL.night; return l[Math.floor(R() * l.length)]; };
    g.sub = () => glazier(uid + 'z' + (++SUB) + '-', 0, R);
    g.bubbles = (x0, y0, w, h, k) => { let s = ''; for (let i = 0; i < k; i++) s += '<circle cx="' + f(x0 + R() * w) + '" cy="' + f(y0 + R() * h) + '" r="' + f(0.3 + R() * 0.45) + '" fill="#fff" opacity=".32"/>'; return s; };
    return g;
  }
  const glowDefs = (uid, blur) => '<filter id="' + uid + 'bloom" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="' + (blur || 2.4) + '"/></filter>' +
    '<filter id="' + uid + 'halo" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>' +
    '<radialGradient id="' + uid + 'lg" cx=".4" cy="0" r="1"><stop offset="0" stop-color="#fff8e6" stop-opacity=".22"/><stop offset="1" stop-color="#fff8e6" stop-opacity="0"/></radialGradient>';
  // the honey border band: the strip between two outlines with matching corners, cut into short pieces like game-glass's border
  function bandPieces(outer, inner, seg) {
    const out = [];
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length, a = outer[i], b = outer[j], c = inner[j], d = inner[i];
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / seg));
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n, L = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        out.push([L(a, b, t0), L(a, b, t1), L(d, c, t1), L(d, c, t0)]);
      }
    }
    // join short neighbours round the curve so no piece is a sliver
    const merged = []; let acc = null;
    out.forEach((q) => { const len = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
      if (!acc) acc = { pts: q.slice(), len }; else if (acc.len + len < seg * 0.95) { acc.pts = [acc.pts[0], q[1], q[2], acc.pts[3]].concat([]); acc.mid = (acc.mid || []).concat([q[0]]); acc.midIn = (acc.midIn || []).concat([q[3]]); acc.len += len; }
      else { merged.push(acc); acc = { pts: q.slice(), len }; } });
    if (acc) merged.push(acc);
    return merged.map((m) => { const o = [m.pts[0]].concat(m.mid || [], [m.pts[1]]), inn = [m.pts[3]].concat(m.midIn || [], [m.pts[2]]); return o.concat(inn.reverse()); });
  }

  /* ---------- the identity windows: the emblem IS the glass ---------- */
  // window: x 4..96, spring 58, apex 6, bottom 154; a honey band 5 wide inside it; the emblem sits in the inner arch
  const WIN = arch(4, 96, 58, 6, 154), INNER = arch(7.6, 92.4, 58.5, 9.8, 150.4);
  const BAND = bandPieces(WIN, INNER, 11);
  const mirror = (pts) => pts.map((q) => [100 - q[0], q[1]]);
  function crescentPiece(a1, a2, f0, f1) {
    const cx = 46, cy = 94, R = 36, T = (a) => 22 * Math.pow(Math.max(0, Math.sin(Math.PI * (a - 60) / 240)), 0.8) + 0.6, out = [], n = 5;
    for (let i = 0; i <= n; i++) { const a = a1 + (a2 - a1) * i / n, r = R - T(a) * f0, ar = a * Math.PI / 180; out.push([cx + r * Math.cos(ar), cy + r * Math.sin(ar)]); }
    for (let i = n; i >= 0; i--) { const a = a1 + (a2 - a1) * i / n, r = R - T(a) * f1, ar = a * Math.PI / 180; out.push([cx + r * Math.cos(ar), cy + r * Math.sin(ar)]); }
    return out;
  }
  function pagePoly() { const out = [[14, 118], [50, 128]]; for (let i = 0; i <= 10; i++) { const t = 1 - i / 10; out.push([14 + 36 * t, 72 + 10 * t - 9 * Math.sin(Math.PI * t)]); } return out; }
  function flamePoly() {
    const L = [], R = [], N = 24;
    for (let i = 0; i <= N; i++) {
      const u = i / N, y = 20 + 86 * u, c = 50 + 9 * (1 - u) * (1 - u);
      const w = u < 0.68 ? 22 * Math.pow(u / 0.68, 1.7) : 22 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.68) / 0.32, 2)));
      L.push([c - w, y]); R.push([c + w, y]);
    }
    return L.concat(R.reverse());
  }
  function bowlPoly() { const out = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; out.push([50 + 34 * Math.cos(a), 62 + 40 * Math.sin(a)]); } return out; }
  function heartPoly() {
    const out = [], N = 40;
    for (let i = 0; i < N; i++) {
      const t = 2 * Math.PI * i / N, x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      out.push([50 + x * 2.25, 84 - y * 2.6]);
    }
    return out;
  }
  // a quill: a long feather leaning right, the spine is the lead down its middle
  const QA = [74, 22], QB = [38, 112], QL = Math.hypot(QB[0] - QA[0], QB[1] - QA[1]);
  const QU = [(QB[0] - QA[0]) / QL, (QB[1] - QA[1]) / QL], QP = [-QU[1], QU[0]], QANG = Math.atan2(QU[1], QU[0]) * 180 / Math.PI;
  const qAt = (s, w) => [QA[0] + QU[0] * s * QL + QP[0] * w, QA[1] + QU[1] * s * QL + QP[1] * w];
  function quillPoly() {
    const L = [], R = [], N = 16;
    for (let i = 0; i <= N; i++) { const s = i / N, w = 17 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.05)), 0.75) * (1 - 0.35 * s); L.push(qAt(s, w)); R.push(qAt(s, -w * 0.8)); }
    return L.concat(R.reverse());
  }
  // the sea for the Leviathan: a gentle swell, the serpent's coils dip into it
  const SEA = 126, seaY = (x) => SEA + 1.6 * (1 - Math.cos(2 * Math.PI * (x - 50) / 22));
  function seaPoly(y1) { const out = []; for (let i = 0; i <= 22; i++) { const x = 2 + 96 * i / 22; out.push([x, seaY(x)]); } return out.concat([[98, y1], [2, y1]]); }
  // the serpent's neck: a curving column rising out of the sea, thinner at the top
  function neckPoly() {
    const L = [], R = [], N = 14;
    for (let i = 0; i <= N; i++) { const t = i / N, x = 63 - 9 * Math.sin(Math.PI * t * 0.9) + 6 * t, y = SEA + 2 - 72 * t, w = 7.5 - 3 * t; L.push([x - w, y]); R.push([x + w, y]); }
    return L.concat(R.reverse());
  }
  // a four-point star of four kite pieces
  function star4(cx, cy, R0, rot, col) { const ri = R0 * 0.34, out = [];
    for (let k = 0; k < 4; k++) { const th = rot - 90 + 90 * k; out.push({ poly: [[cx, cy], polar(cx, cy, ri, th - 45), polar(cx, cy, R0, th), polar(cx, cy, ri, th + 45)], cuts: [], cols: [col] }); }
    return out; }
  // a compass rose: the four long points split light and shade, the four short points one piece each
  function compassParts() {
    const cx = 50, cy = 86, ri = 9, parts = [];
    for (let k = 0; k < 8; k++) {
      const th = -90 + 45 * k, long = k % 2 === 0, T = polar(cx, cy, long ? 41 : 24, th), Vm = polar(cx, cy, ri, th - 22.5), Vp = polar(cx, cy, ri, th + 22.5);
      if (long) { parts.push({ poly: [[cx, cy], Vm, T], cuts: [], cols: [k === 0 ? 'blood' : 14] }); parts.push({ poly: [[cx, cy], T, Vp], cuts: [], cols: [k === 0 ? 'red' : -14] }); }
      else parts.push({ poly: [[cx, cy], Vm, T, Vp], cuts: [], cols: ['honey'] });
    }
    return parts;
  }
  /* each emblem: parts {poly, cuts, cols}; the cuts split a part into its glass pieces. A colour is either a number
     (the identity's own colour, that much lighter or darker) or the name of one of the game's glass families (GPAL). */
  const EMB = {
    // Scholar: an open book, the lead between the pages is the spine
    book: [
      { poly: pagePoly(), cuts: [[32, 96, 15.5], [32, 110, 15.5]], cols: ['pale', 'parch'] },
      { poly: mirror(pagePoly()).reverse(), cuts: [[68, 96, -15.5], [68, 110, -15.5]], cols: ['parch', 'pale'] },
      { poly: [[6, 68], [14, 72], [14, 118], [6, 122]], cuts: [], cols: [-8] },
      { poly: [[6, 122], [14, 118], [50, 128], [50, 138]], cuts: [], cols: [0] },
      { poly: mirror([[6, 68], [14, 72], [14, 118], [6, 122]]).reverse(), cuts: [], cols: [-8] },
      { poly: mirror([[6, 122], [14, 118], [50, 128], [50, 138]]).reverse(), cuts: [], cols: [0] }],
    // Nourished: a goblet
    cup: [
      { poly: bowlPoly(), cuts: [[50, 72, 0], [38, 67, 96], [62, 67, 84], [50, 92, 90], [40.8, 87, 125], [59.2, 87, 55]], cols: [6, -8, 12] },
      { poly: [[44, 101], [56, 101], [55, 126], [45, 126]], cuts: [[50, 114, 4]], cols: ['honey'] },
      { poly: [[45, 126], [55, 126], [74, 141], [26, 141]], cuts: [[50, 134, 90]], cols: ['honey', 'gold'] }],
    // Steadfast: a shield
    shield: [
      { poly: [[18, 40], [50, 34], [82, 40], [82, 88], [74, 112], [50, 136], [26, 112], [18, 88]],
        cuts: [[50, 80, 90], [34, 76, 0], [66, 76, 0], [34, 58, 40], [66, 58, 140], [36, 100, 140], [64, 100, 40]], cols: [10, -10] }],
    // Serene: a crescent moon and a star
    moon: [].concat([[60, 100, 0, 1], [100, 140, 0, 0.5], [100, 140, 0.5, 1], [140, 180, 0, 0.5], [140, 180, 0.5, 1], [180, 220, 0, 0.5], [180, 220, 0.5, 1], [220, 260, 0, 0.5], [220, 260, 0.5, 1], [260, 300, 0, 1]]
      .map((q) => ({ poly: crescentPiece(q[0], q[1], q[2], q[3]), cuts: [], cols: [q[2] ? 10 : -6] })),
      [{ poly: [[73, 76], [80, 92], [73, 108], [66, 92]], cuts: [[73, 92, 90]], cols: ['star', 'star'] }]),
    // Homeflame: a candle flame
    flame: [
      { poly: flamePoly(), cuts: [[50, 93, -8], [51, 75, 9], [54, 55, -12], [50, 100, 90], [51, 84, 90]], cols: ['star', 'gold', 14, 6, 0, -6], byY: 1 },
      { poly: [[41, 106], [59, 106], [59, 136], [41, 136]], cuts: [[50, 120, 80]], cols: ['parch', 'pale'] },
      { poly: [[28, 136], [72, 136], [67, 145], [33, 145]], cuts: [], cols: ['honey'] }],
    // Valiant: a sword
    sword: [
      { poly: [[41, 30], [50, 12], [59, 30], [59, 96], [41, 96]], cuts: [[50, 60, 90], [45, 44, -28], [55, 56, 28], [45, 76, -28], [55, 84, 28]], cols: ['pale', 'parch'] },
      { poly: [[20, 96], [80, 96], [80, 107], [20, 107]], cuts: [[35, 101, 90], [65, 101, 90]], cols: [4, 'honey'] },
      { poly: [[44, 107], [56, 107], [56, 128], [44, 128]], cuts: [[50, 117, 12]], cols: [-16, -8] },
      { poly: [[50, 128], [59, 137], [50, 146], [41, 137]], cuts: [], cols: [6] }],
    // Devoted: a heart, split down the middle and across each half
    heart: [
      { poly: heartPoly(), cuts: [[50, 90, 90], [34, 70, 38], [66, 70, 142], [42, 108, -40], [58, 108, 40]], cols: [6, -6, 12] }],
    // Wordsmith: a quill, the spine is a lead line, with the nib below
    quill: [
      { poly: quillPoly(), cuts: [qAt(0.5, 0).concat([QANG]), qAt(0.3, 6).concat([QANG - 55]), qAt(0.62, 6).concat([QANG - 55]), qAt(0.36, -5).concat([QANG + 55]), qAt(0.68, -5).concat([QANG + 55])], cols: [14, 2, 8] },
      { poly: [qAt(1, 5), [29, 142], qAt(1, -5)], cuts: [], cols: ['night'] }],
    // Leviathan: a sea serpent, one coil out of the sea, the long neck and head rising beside it
    serpent: [
      { poly: ringSector(29, SEA + 3, 17, 8, 180, 270, 6), cuts: [], cols: [-6] },
      { poly: ringSector(29, SEA + 3, 17, 8, 270, 360, 6), cuts: [], cols: [8] },
      { poly: [[6, SEA + 3], [10, SEA - 13], [14, SEA + 3]], cuts: [], cols: [-12] },
      { poly: neckPoly(), cuts: [[57, 108, 8], [57, 84, -8]], cols: [8, -4, 4], byY: 1 },
      { poly: [[60.5, 58], [58, 49], [63, 40], [75, 38], [90, 45], [89, 50], [77, 51], [70, 56], [69.5, 58]], cuts: [[80, 47, 6]], cols: [14, -2] },
      { poly: [[58, 49], [52, 41], [63, 40]], cuts: [], cols: [-14] },
      { poly: seaPoly(146), cuts: [[50, 137, -4]], cols: ['blue', 'blue'] }],
    // Diligent: an hourglass, sand still running
    hourglass: [
      { poly: [[20, 28], [80, 28], [80, 38], [20, 38]], cuts: [], cols: ['honey'] },
      { poly: [[20, 132], [80, 132], [80, 142], [20, 142]], cuts: [], cols: ['honey'] },
      { poly: [[21, 38], [27, 38], [27, 132], [21, 132]], cuts: [], cols: ['honeyD'] },
      { poly: [[73, 38], [79, 38], [79, 132], [73, 132]], cuts: [], cols: ['honeyD'] },
      { poly: [[30, 38], [70, 38], [53, 85], [47, 85]], cuts: [[50, 62, 0]], cols: [4, 'pale'], byY: 1 },
      { poly: [[47, 85], [53, 85], [70, 132], [30, 132]], cuts: [[50, 113, 0]], cols: [4, 'pale'], byY: 1 }],
    // Trusted: a key, its bow a ring of four pieces
    key: [0, 1, 2, 3].map((k) => ({ poly: ringSector(50, 46, 22, 12, -135 + 90 * k, -45 + 90 * k, 5), cuts: [], cols: [k % 2 ? 10 : -4] })).concat([
      { poly: [[45, 68], [55, 68], [55, 142], [45, 142]], cuts: [[50, 104, 8]], cols: [14, 2] },
      { poly: [[55, 116], [70, 116], [70, 126], [55, 126]], cuts: [], cols: [-6] },
      { poly: [[55, 131], [65, 131], [65, 140], [55, 140]], cuts: [], cols: [8] }]),
    // Mentor: a lantern, lit for someone else to see by
    lantern: [
      { poly: ringSector(50, 36, 12, 6, 180, 270, 4), cuts: [], cols: ['honeyD'] },
      { poly: ringSector(50, 36, 12, 6, 270, 360, 4), cuts: [], cols: ['honeyD'] },
      { poly: [[34, 36], [66, 36], [74, 50], [26, 50]], cuts: [], cols: ['honey'] },
      { poly: [[30, 50], [70, 50], [70, 114], [30, 114]], cuts: [[43.3, 82, 90], [56.7, 82, 90]], cols: [0, 16, 0], byX: 1 },
      { poly: [[26, 114], [74, 114], [66, 128], [34, 128]], cuts: [], cols: ['honey'] }],
    // Sanctified: a chalice with a halo above it
    chalice: [0, 1, 2, 3].map((k) => ({ poly: ringSector(50, 35, 18, 11.5, -135 + 90 * k, -45 + 90 * k, 5), cuts: [], cols: [k % 2 ? 'star' : 'gold'] })).concat([
      { poly: [[28, 58], [72, 58], [68, 72], [58, 84], [42, 84], [32, 72]], cuts: [[50, 70, 90]], cols: [10, -4] },
      { poly: [[46, 84], [54, 84], [53, 120], [47, 120]], cuts: [[50, 101, 0]], cols: ['honey', 'gold'] },
      { poly: [[47, 120], [53, 120], [71, 135], [29, 135]], cuts: [[50, 127, 90]], cols: ['honey', 'gold'] }]),
    // Dreamer: a closed eye (a lid curving down, five lashes) under two stars
    eye: [0, 1, 2].map((k) => ({ poly: ringSector(50, 60, 34, 25, 25 + 130 * k / 3, 25 + 130 * (k + 1) / 3, 5), cuts: [], cols: [k === 1 ? 10 : 0] }))
      .concat([45, 67.5, 90, 112.5, 135].map((th, k) => ({ poly: [polar(50, 60, 34, th - 6), polar(50, 60, 47, th), polar(50, 60, 34, th + 6)], cuts: [], cols: [k % 2 ? -10 : -2] })),
        star4(31, 36, 12, 0, 'star'), star4(69, 30, 8.5, 10, 'gold')),
    // Frugal: a purse tied at the neck
    purse: [
      { poly: [[37, 64], [31, 49], [42, 56], [50, 45], [58, 56], [69, 49], [63, 64]], cuts: [[50, 58, 90]], cols: [12, 4] },
      { poly: [[36, 64], [64, 64], [61, 72], [39, 72]], cuts: [], cols: ['honey'] },
      { poly: [[39, 72], [29, 82], [21, 98], [21, 114], [29, 128], [50, 135], [71, 128], [79, 114], [79, 98], [71, 82], [61, 72]], cuts: [[37, 104, 98], [63, 104, 82]], cols: [0, 10, -8], byX: 1 }],
    // Wanderer: a compass rose, north in red
    compass: compassParts(),
    // anything new: a simple leaded diamond
    diamond: [
      { poly: [[50, 38], [80, 86], [50, 134], [20, 86]], cuts: [[50, 86, 90], [40, 86, 0], [60, 86, 0]], cols: [8, -6] }]
  };
  // every identity in G_WHO (Game.gs) has its own window
  const KIND = { Scholar: 'book', Homeflame: 'flame', Steadfast: 'shield', Nourished: 'cup', Serene: 'moon', Valiant: 'sword', Devoted: 'heart', Wordsmith: 'quill',
    Leviathan: 'serpent', Diligent: 'hourglass', Trusted: 'key', Mentor: 'lantern', Sanctified: 'chalice', Dreamer: 'eye', Frugal: 'purse', Wanderer: 'compass' };
  // the emblems were drawn on the full window; they now sit inside the honey band, a little smaller
  const SK = 0.86, sk = (q) => [50 + (q[0] - 50) * SK, 90 + (q[1] - 90) * SK];
  Object.keys(EMB).forEach((k) => EMB[k].forEach((part) => { part.poly = part.poly.map(sk); part.cuts = part.cuts.map((c) => sk(c).concat([c[2]])); }));
  // the window behind the emblem: a mosaic of small pieces like the game's day glass and Oracle, with only two heavier
  // lead breaks (saddle bars) across it; the cells are cut along the bars so every bar is a real join
  const BARS = [[50, 34, 8], [50, 143, -7]];
  function clipConvex(poly, conv) { // keep the part of poly inside a convex outline (clockwise on screen)
    let out = poly; for (let i = 0; i < conv.length && out.length >= 3; i++) { const a = conv[i], b = conv[(i + 1) % conv.length]; out = clipHalf(out, a, [-(b[1] - a[1]), b[0] - a[0]]); } return out; }
  const MOSAIC = (() => {
    const cells = vor(rng(77), [6, 8, 94, 152], 8.4).map((x) => clipConvex(x.p, INNER)).filter((p) => p.length >= 3), out = [];
    cells.forEach((p) => { let parts = [p];
      BARS.forEach((L) => { const n = normal(L[2]); parts = [].concat.apply([], parts.map((q) => [clipHalf(q, [L[0], L[1]], n), clipHalf(q, [L[0], L[1]], [-n[0], -n[1]])].filter((z) => z.length >= 3))); });
      parts.forEach((q) => { const c = centroid(q), side = (L) => { const n = normal(L[2]); return (c[0] - L[0]) * n[0] + (c[1] - L[1]) * n[1] >= 0; };
        out.push({ pts: q, zone: !side(BARS[0]) ? 0 : side(BARS[1]) ? 2 : 1 }); }); });
    return out;
  })();
  const barD = BARS.map((L) => { const a = L[2] * Math.PI / 180, dx = Math.cos(a) * 80, dy = Math.sin(a) * 80; return 'M' + f(L[0] - dx) + ' ' + f(L[1] - dy) + 'L' + f(L[0] + dx) + ' ' + f(L[1] + dy); }).join('');
  const EMBCACHE = {};
  function embPieces(kind) {
    if (EMBCACHE[kind]) return EMBCACHE[kind];
    const pieces = [];
    EMB[kind].forEach((part) => {
      const p = [part.poly.map((q) => q.slice())]; part.cuts.forEach((c) => cut(p, c));
      if (part.byY) p.sort((a, b) => centroid(b)[1] - centroid(a)[1]);
      if (part.byX) p.sort((a, b) => centroid(a)[0] - centroid(b)[0]);
      p.forEach((q, i) => pieces.push({ pts: q, col: part.cols[i % part.cols.length], c: centroid(q) }));
    });
    // fixed lighting order: bottom piece first, climbing to the top
    pieces.order = pieces.slice().sort((a, b) => (b.c[1] - a.c[1]) || (a.c[0] - b.c[0]));
    return (EMBCACHE[kind] = pieces);
  }

  function windowSVG(name, votes, panes, rid) {
    rid = rid || ('uzctg' + (++RID) + '-');
    panes = Number(panes) || 30; votes = Math.max(0, Number(votes) || 0);
    const kind = KIND[name] || 'diamond', uid = rid + 'w-', base = IDC[name] || '#c8b89a', B = hexHsl(base);
    const G = glazier(uid, 41 + String(name).length * 17 + kind.length * 5), pieces = embPieces(kind);
    const lit = clamp(Math.round(votes * pieces.length / panes), 0, pieces.length), on = new Set(pieces.order.slice(0, lit)), frac = pieces.length ? lit / pieces.length : 0;
    // lit glass in the identity's colour; unlit glass is night glass with a breath of that colour (the faint stars' unlit look)
    const litC = (col) => (typeof col === 'number' ? [B[0], Math.min(B[1], 88), clamp(B[2] + col, 22, 82)] : G.fam(col));
    const darkC = (col) => (typeof col === 'number' ? [B[0], Math.min(B[1] * 0.45, 36), 19] : (() => { const c = G.fam(col); return [c[0], Math.min(c[1] * 0.45, 34), 18]; })());
    // the background: the game's own deep blue field glass (day glass, Oracle), a touch darker so the emblem reads
    const bgC = (zone) => { const c = GPAL.field[Math.floor(G.R() * GPAL.field.length)]; return [c[0] + (zone - 1) * 5, c[1], c[2] - 5 + (zone === 1 ? 2 : 0)]; };
    let defs = glowDefs(uid, 2);
    defs += '<mask id="' + uid + 'hole" maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="200"><rect x="-20" y="-20" width="140" height="200" fill="#fff"/>' + EMB[kind].map((pt) => '<path d="' + pathD(pt.poly) + '" fill="#000"/>').join('') + '</mask>';
    defs += '<clipPath id="' + uid + 'clip"><path d="' + pathD(WIN) + '"/></clipPath>';
    const BGZ = G.sub();
    MOSAIC.forEach((q) => { BGZ.piece(q.pts, bgC(q.zone), null); });
    // the honey band, lit from the bottom up as the votes come in
    const bandOrder = BAND.map((q) => ({ q, y: centroid(q)[1] })).sort((a, b) => b.y - a.y), bandOn = Math.round(BAND.length * (votes ? 0.3 + 0.7 * frac : 0));
    const BD = G.sub(); bandOrder.forEach((b, k) => { BD.piece(b.q, BD.fam(k < bandOn ? 'honey' : 'honeyD'), null); });
    pieces.forEach((p) => { const c = on.has(p) ? litC(p.col) : darkC(p.col); G.piece(p.pts, c, on.has(p) ? hsl(c[0], c[1], c[2] + 6) : null, 0.6); });
    return '<svg viewBox="-10 -10 120 176" role="img" aria-label="' + esc(name) + ', ' + votes + ' of ' + panes + ' votes"><defs>' + defs + BGZ.defs + BD.defs + G.defs + '</defs>' +
      (frac ? '<path d="' + pathD(WIN) + '" fill="' + base + '" opacity="' + f(0.1 + 0.35 * frac) + '" filter="url(#' + uid + 'halo)"/>' : '') +
      '<g clip-path="url(#' + uid + 'clip)"><g mask="url(#' + uid + 'hole)">' + BGZ.glass + '</g>' + BD.glass + G.glass +
      '<g filter="url(#' + uid + 'bloom)" opacity=".5" style="mix-blend-mode:screen">' + G.bloom + '</g>' + G.bubbles(10, 14, 80, 130, 9) +
      '<g fill="none" stroke="' + LEAD + '" stroke-linejoin="round" stroke-linecap="round">' +
      '<g mask="url(#' + uid + 'hole)"><path d="' + BGZ.lead + '" stroke-width=".7"/><path d="' + barD + '" stroke-width="2.3"/></g>' +
      '<path d="' + BD.lead + '" stroke-width=".9"/><path d="' + G.lead + '" stroke-width="1.35"/></g>' +
      '<path d="' + pathD(WIN) + '" fill="url(#' + uid + 'lg)"/></g>' +
      '<path d="' + pathD(WIN) + '" fill="none" stroke="' + LEAD + '" stroke-width="2.8" stroke-linejoin="round"/></svg>';
  }

  /* ---------- leaded panels: a honey border band and pale glass for the words ---------- */
  // inside: pale glass, split only between rows (1 or 2 breaks)
  function panelSVG(uid, W, H, cuts) {
    const B = 7, G = glazier(uid, uid.length * 97 + W);
    const outer = [[0, 0], [W, 0], [W, H], [0, H]], inner = [[B, B], [W - B, B], [W - B, H - B], [B, H - B]];
    bandPieces(outer, inner, 26).forEach((q) => G.piece(q, G.fam('honey'), null));
    const p = [inner.map((q) => q.slice())];
    cuts.slice(0, 2).forEach((c) => cut(p, c));
    p.forEach((q, i) => G.piece(q, i % 2 ? [42, 34, 84] : [204, 40, 84], null));
    return '<svg class="uzct-glass" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><defs>' + glowDefs(uid) + G.defs + '</defs>' + G.glass + G.bubbles(B, B, W - 2 * B, H - 2 * B, 10) +
      '<path d="' + G.lead + '" fill="none" stroke="' + LEAD + '" stroke-width="1.1" stroke-linejoin="round"/><rect width="' + W + '" height="' + H + '" fill="url(#' + uid + 'lg)"/>' +
      '<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" fill="none" stroke="' + LEAD + '" stroke-width="2.2"/></svg>';
  }
  function drawPanel(panel, uid, cutsFor) {
    const old = panel.querySelector('svg.uzct-glass'); if (old) old.remove();
    const W = panel.offsetWidth, H = panel.offsetHeight; if (!W || !H) return;
    panel.insertAdjacentHTML('afterbegin', panelSVG(uid, W, H, cutsFor(panel, W, H)));
  }

  /* ---------- chapter windows: the High Vespers lancet, one per school week ---------- */
  function vor(R, r, s, extra, keepOut) {
    const cols = Math.max(1, Math.round((r[2] - r[0]) / s)), rows = Math.max(1, Math.round((r[3] - r[1]) / s)), sx = (r[2] - r[0]) / cols, sy = (r[3] - r[1]) / rows, sites = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const p = [r[0] + (i + 0.5 + (R() - 0.5) * 0.8) * sx, r[1] + (j + 0.5 + (R() - 0.5) * 0.8) * sy]; if (!keepOut || !keepOut(p)) sites.push(p); }
    (extra || []).forEach((p) => sites.push(p));
    const lim = 3.2 * Math.max(sx, sy, 8);
    return sites.map((p, i) => { let poly = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
      sites.forEach((q, j) => { if (i === j || Math.abs(q[0] - p[0]) > lim || Math.abs(q[1] - p[1]) > lim) return;
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; poly = clipHalf(poly, [mx, my], [-(q[0] - p[0]), -(q[1] - p[1])]); });
      return { p: poly, site: p, k: i }; }).filter((x) => x.p.length >= 3);
  }
  function chapterSVG(rid, c, n, maxRit, toN) {
    const W = 44, H = 118, y0 = W * 0.866, b = 4.2, uid = rid + 'c' + n + '-', G = glazier(uid, 100 + n * 7);
    const bl = Number(c.blessings) || 0, cu = Number(c.curses) || 0, ri = Number(c.rituals) || 0, tot = bl + cu;
    const fromN = dayNo(c.from), future = !c.now && fromN > toN;
    const lived = future ? 0 : c.now ? clamp(isNaN(toN - fromN) ? 0.5 : (toN - fromN + 1) / 7, 1 / 7, 1) : 1;
    const depth = (x, y) => { let d = Math.min(x, W - x, H - y); if (y < y0) d = Math.min(d, W - Math.hypot(x, y - y0), W - Math.hypot(x - W, y - y0)); return d; };
    // the seal: one round piece set into the head, with a ring of pieces cut round it
    const SC = [W / 2, 25], SR = 10;
    const ring = Array.from({ length: 7 }, (_, k) => polar(SC[0], SC[1], SR * 1.25, -90 + k * 360 / 7 + 10));
    const cells = vor(G.R, [0, 0, W, H], 6.4, [SC].concat(ring), (p) => Math.hypot(p[0] - SC[0], p[1] - SC[1]) < SR * 1.9);
    const pcs = [];
    cells.forEach((x) => { const cc = centroid(x.p), d = depth(cc[0], cc[1]); if (d < -1.5) return; pcs.push({ p: x.p, c: cc, d, seal: x.site === SC }); });
    const field = pcs.filter((q) => !q.seal && q.d >= b), band = pcs.filter((q) => !q.seal && q.d < b), seal = pcs.find((q) => q.seal);
    // lit glass: blotchy, like High Vespers; the days of this week not lived yet stay night glass
    const lit = tot ? Math.min(0.92, 0.14 + tot / 40) : 0, ph = (100 + n * 7) * 1.7;
    const nz = (q) => Math.sin(q.c[0] * 0.1 + ph) * 0.8 + Math.sin(q.c[1] * 0.055 - ph * 2) * 1.4 + Math.sin((q.c[0] - q.c[1]) * 0.07 + ph * 3) * 0.5 + G.R() * 0.12;
    const liveTop = H - (H - 4) * lived, alive = field.filter((q) => q.c[1] >= liveTop);
    alive.forEach((q) => { q.v = nz(q); }); alive.sort((a, z) => a.v - z.v);
    const nLit = Math.round(alive.length * lit), nBlue = tot ? Math.round(nLit * bl / tot) : 0;
    field.forEach((q) => { q.fam = 'night'; });
    alive.forEach((q, k) => { q.fam = k >= nLit ? 'night' : k < nBlue ? 'blue' : 'red'; });
    // the honey band: rituals, rising from the bottom
    band.sort((a, z) => z.c[1] - a.c[1]); const nGold = Math.round(band.length * (maxRit ? clamp(ri / maxRit, 0, 1) : 0) * lived);
    band.forEach((q, k) => { q.fam = k < nGold ? 'honey' : 'honeyD'; });
    if (seal) seal.fam = c.closed ? 'blood' : 'chaloD';
    const glowOf = (fam) => (fam === 'blue' ? '#4a7aff' : fam === 'red' ? '#c02a30' : fam === 'blood' ? '#ff4a3a' : null);
    pcs.forEach((q) => { G.piece(q.p, G.fam(q.fam), glowOf(q.fam)); });
    const outline = 'M0 ' + H + 'L0 ' + y0.toFixed(1) + 'A' + W + ' ' + W + ' 0 0 1 ' + (W / 2) + ' 0A' + W + ' ' + W + ' 0 0 1 ' + W + ' ' + y0.toFixed(1) + 'L' + W + ' ' + H + 'Z';
    return '<svg class="uzct-lancet" viewBox="-1.5 -1.5 ' + (W + 3) + ' ' + (H + 3) + '" aria-hidden="true"><defs>' + glowDefs(uid, 1.6) + G.defs + '<clipPath id="' + uid + 'c"><path d="' + outline + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + uid + 'c)">' + G.glass + '<g filter="url(#' + uid + 'bloom)" opacity=".3" style="mix-blend-mode:screen">' + G.bloom + '</g>' + G.bubbles(0, 0, W, H, 5) +
      '<path d="' + G.lead + '" fill="none" stroke="' + LEAD + '" stroke-width=".8" stroke-linejoin="round"/>' +
      (seal ? '<path d="' + pathD(seal.p) + '" fill="none" stroke="' + LEAD + '" stroke-width="1.4" stroke-linejoin="round"/>' : '') +
      '<rect width="' + W + '" height="' + H + '" fill="url(#' + uid + 'lg)"/></g>' +
      '<path d="' + outline + '" fill="none" stroke="' + LEAD + '" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  }
  // a key swatch: a tiny window of two pieces of the same glass, leaded like the rest
  function swatch(rid, k, fam, round) {
    const uid = rid + 'k' + k + '-', G = glazier(uid, 300 + k * 13);
    if (round) G.piece(ringSector(8, 8, 6, 0, 0, 360, 10).slice(0, 11), G.fam(fam), null);
    else { G.piece([[1, 1], [10, 1], [7, 15], [1, 15]], G.fam(fam), null); G.piece([[10, 1], [15, 1], [15, 15], [7, 15]], G.fam(fam), null); }
    return '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><defs>' + G.defs + '</defs>' + G.glass + '<path d="' + G.lead + '" fill="none" stroke="' + LEAD + '" stroke-width=".9" stroke-linejoin="round"/>' +
      (round ? '' : '<rect x=".9" y=".9" width="14.2" height="14.2" fill="none" stroke="' + LEAD + '" stroke-width="1.6"/>') + '</svg>';
  }

  /* ---------- the page ---------- */
  const CSS = `
.uzct{max-width:380px;margin:0 auto;padding:16px 12px 30px;box-sizing:border-box;color:#e8e1cf;font:14px/1.45 'Atkinson Hyperlegible',system-ui,sans-serif;background:radial-gradient(ellipse at 50% -5%,#0e1d18,rgba(2,5,4,0) 55%)}
.uzct-h1{font:700 27px/1.1 'Grenze Gotisch',serif;color:#ffd56a;margin:0;text-shadow:0 0 16px rgba(255,213,106,.25)}
.uzct-sub{font-size:12px;color:#7f9389;margin:2px 0 4px;letter-spacing:.08em;text-transform:uppercase}
.uzct-lbl{font:700 11px 'Atkinson Hyperlegible',sans-serif;letter-spacing:.14em;color:#c9a560;margin:22px 0 8px;text-transform:uppercase}
.uzct-figs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 6px}
.uzct-fig{text-align:center}
.uzct-fig svg{display:block;width:100%;height:auto;overflow:visible}
.uzct-fig b{display:block;font:500 17px/1.1 'Grenze Gotisch',serif;color:#e8e1cf;margin-top:2px}
.uzct-fig span{font-size:12px;color:#9fb1a8}
.uzct-panel{position:relative}
.uzct-panel svg.uzct-glass{position:absolute;left:0;top:0;overflow:visible;z-index:0;filter:drop-shadow(0 0 6px rgba(232,180,80,.22))}
.uzct-in{position:relative;z-index:1;padding:12px 15px}
.uzct-row{height:44px;display:flex;align-items:center;gap:10px;color:#1b1a22}
.uzct-row .uzct-n{font:700 22px/1 'Grenze Gotisch',serif;color:#6b4a12;width:14px;text-align:center}
.uzct-row b{flex:1;font:700 15px 'Atkinson Hyperlegible',sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uzct-row i{font-style:normal;font-size:12.5px;color:#3a3442;white-space:nowrap}
.uzct-heavy{display:grid;grid-template-columns:1fr 1fr;row-gap:2px;column-gap:24px;color:#1b1a22}
.uzct-heavy div{height:26px;display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:13.5px}
.uzct-heavy div b{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uzct-heavy div i{font-style:normal;color:#5a4214;font-weight:700;white-space:nowrap}
.uzct-quote{font:italic 15px/1.35 'IM Fell English',serif;color:#cfd8d3;margin:9px 2px 0}
.uzct-small{font-size:12px;color:#9fb1a8;margin:7px 2px 0}
.uzct-empty{font:italic 15px/1.4 'IM Fell English',serif;color:#9fb1a8;margin:2px 2px 0}
.uzct-wait{font:italic 16px 'IM Fell English',serif;color:#9fb1a8;text-align:center;padding:40px 16px}
.uzct-tracery{padding:10px 8px 8px;border-radius:4px;background:linear-gradient(180deg,#1b1824,#100e15);border:1px solid #33293f;box-shadow:inset 0 2px 10px #000}
.uzct-panes{display:grid;gap:5px;align-items:end}
.uzct-pane{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;color:#a39cb2;font:700 11.5px 'Atkinson Hyperlegible',sans-serif}
.uzct-pane svg.uzct-lancet{display:block;width:100%;height:auto;filter:drop-shadow(0 0 5px rgba(150,170,240,.22))}
.uzct-pane.uzct-now{color:#fff}
.uzct-pane.uzct-now svg.uzct-lancet{transform:translateY(-3px);filter:drop-shadow(0 0 8px rgba(232,196,110,.55))}
.uzct-pane em{font:700 10.5px 'Atkinson Hyperlegible',sans-serif;font-style:normal;color:#8a8298;font-variant-numeric:tabular-nums}
.uzct-key{display:flex;flex-wrap:wrap;gap:5px 14px;font-size:12px;color:#a39cb2;margin-top:9px;padding-top:8px;border-top:1px solid #2a2338}
.uzct-key span{display:inline-flex;align-items:center;gap:6px}
.uzct-key svg{flex:none}
`;
  const FONTS = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Grenze+Gotisch:wght@500;700&family=IM+Fell+English:ital@0;1&display=swap';
  function injectCss(doc) {
    if (doc.getElementById('uzct-css')) return;
    const st = doc.createElement('style'); st.id = 'uzct-css'; st.textContent = CSS; doc.head.appendChild(st);
    // the game already loads these fonts; this only fills in if the page is opened on its own
    if (!doc.querySelector('link[href*="Grenze+Gotisch"]')) { const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = FONTS; doc.head.appendChild(l); }
  }

  function pageHTML(rid, T) {
    const panes = Number(T.panes) || 30, chapters = T.chapters || [], now = chapters.findIndex((c) => c.now);
    let h = '<h1 class="uzct-h1">Act ' + roman(Number(T.actNo)) + (T.act ? ': ' + esc(T.act) : '') + '</h1>';
    h += '<p class="uzct-sub">' + esc(nice(T.from)) + ' to ' + (now >= 0 ? 'today' : esc(nice(T.to))) + (now >= 0 ? ' · week ' + (now + 1) : '') + '</p>';

    h += '<div class="uzct-lbl">Who you are becoming</div>';
    const who = T.who || [];
    if (who.length) h += '<div class="uzct-figs">' + who.map((w, i) => { const v = Number(w.votes) || 0; return '<div class="uzct-fig">' + windowSVG(String(w.who), v, panes, rid + 'f' + i + '-') + '<b>' + esc(w.who) + '</b><span>' + v + ' of ' + panes + '</span></div>'; }).join('') + '</div>';
    else h += '<p class="uzct-empty">No windows yet. When a habit says who it helps you become, its window appears here and lights up a piece at a time as you tick it.</p>';

    h += '<div class="uzct-lbl">On your better days, these came first</div>';
    const first = (T.cameFirst || []).slice(0, 3);
    if (Number(T.betterDays) > 0 && first.length) {
      h += '<div class="uzct-panel" data-uzct="first"><div class="uzct-in">' + first.map((x, i) => '<div class="uzct-row"><span class="uzct-n">' + (i + 1) + '</span><b>' + esc(x.name) + '</b><i>first on ' + plural(Number(x.days) || 0, 'day', 'days') + '</i></div>').join('') + '</div></div>';
      h += '<p class="uzct-small">' + plural(Number(T.betterDays), 'better day', 'better days') + ' out of ' + plural(Number(T.activeDays) || 0, 'day', 'days') + ' with something ticked.</p>';
    } else h += '<p class="uzct-empty">No better days to look back on yet. Give it a few days of ticking and the things you reach for first will show up here.</p>';

    h += '<div class="uzct-lbl">Your heavy days</div>';
    const tags = T.tagCount || [], heavy = T.heavy || [];
    if (tags.length) {
      h += '<div class="uzct-panel" data-uzct="heavy"><div class="uzct-in"><div class="uzct-heavy">' + tags.map((t) => '<div><b>' + esc(t.tag) + '</b><i>' + plural(Number(t.days) || 0, 'day', 'days') + '</i></div>').join('') + '</div></div></div>';
      const kept = heavy.filter((x) => Number(x.good) > 0).length;
      h += '<p class="uzct-quote">' + (heavy.length && kept * 2 >= heavy.length ? 'Heavy days change nothing. The glass kept filling.' : 'Heavy days are allowed to be heavy. Rest is part of it too.') + '</p>';
    } else h += '<p class="uzct-empty">No heavy days marked this term. Long may it last.</p>';

    h += '<div class="uzct-lbl">The chapters</div>';
    if (chapters.length) {
      const toN = dayNo(T.to), maxRit = Math.max(1, ...chapters.map((c) => Number(c.rituals) || 0)), per = Math.min(8, Math.max(7, chapters.length));
      h += '<div class="uzct-tracery"><div class="uzct-panes" style="grid-template-columns:repeat(' + per + ',1fr)">' + chapters.map((c, i) => {
        const bl = Number(c.blessings) || 0, cu = Number(c.curses) || 0;
        return '<div class="uzct-pane' + (c.now ? ' uzct-now' : '') + '" role="img" aria-label="Week ' + esc(c.chapter) + ': ' + plural(bl, 'blessing', 'blessings') + ', ' + plural(cu, 'curse', 'curses') + ', ' + plural(Number(c.rituals) || 0, 'ritual', 'rituals') + (c.closed ? ', sealed' : '') + '">' +
          chapterSVG(rid, c, i, maxRit, toN) + '<span>' + (c.now ? 'now' : 'W' + esc(c.chapter)) + '</span><em>' + bl + '·' + cu + '</em></div>'; }).join('') + '</div>' +
        '<div class="uzct-key"><span>' + swatch(rid, 0, 'blue') + 'blessings</span><span>' + swatch(rid, 1, 'red') + 'curses</span><span>' + swatch(rid, 2, 'honey') + 'rituals</span>' +
        '<span>' + swatch(rid, 3, 'blood', 1) + 'sealed by High Vespers</span><span>' + swatch(rid, 4, 'night') + 'not lived yet</span></div></div>';
    } else h += '<p class="uzct-empty">The first chapter starts on Monday.</p>';
    return h;
  }

  function render(el, X) {
    if (!el || typeof document === 'undefined') return Promise.resolve();
    const doc = el.ownerDocument || document;
    injectCss(doc);
    const rid = 'uzct' + (++RID) + '-';
    el.innerHTML = '<div class="uzct"><p class="uzct-wait">Lighting the windows...</p></div>';
    const box = el.firstChild;
    let p;
    try { p = Promise.resolve(X.call('gameCompanionTerm')); } catch (e) { p = Promise.reject(e); }
    return p.then((T) => {
      if (!T || typeof T !== 'object') throw new Error('no term');
      if (T.error) throw new Error(String(T.error));
      box.innerHTML = pageHTML(rid, T);
      // the word panels are measured once laid out, then leaded to fit; redrawn if their size changes
      const draw = () => {
        const fp = box.querySelector('[data-uzct="first"]');
        if (fp) drawPanel(fp, rid + 'pf-', (panel, W) => { const rows = panel.querySelectorAll('.uzct-row'), top = panel.querySelector('.uzct-in').offsetTop, out = [];
          for (let i = 1; i < rows.length && i < 3; i++) out.push([W / 2, rows[i].offsetTop + top, i === 1 ? 1.2 : -1.2]); return out; });
        const hp = box.querySelector('[data-uzct="heavy"]');
        if (hp) drawPanel(hp, rid + 'ph-', (panel, W, H) => (panel.querySelectorAll('.uzct-heavy div').length > 1 ? [[W / 2, H / 2, 90]] : []));
      };
      draw();
      if (root.requestAnimationFrame) root.requestAnimationFrame(draw);
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(draw, () => {});
      if (root.ResizeObserver) {
        let last = '';
        const ro = new root.ResizeObserver(() => { if (!box.isConnected) { ro.disconnect(); return; } const k = box.offsetWidth + 'x' + box.offsetHeight; if (k !== last) { last = k; draw(); } });
        ro.observe(box);
      }
    }).catch(() => {
      box.innerHTML = '<p class="uzct-wait">The windows could not be lit just now. Close this page and try again in a moment.</p>';
    });
  }

  // one chapter window on its own (the gallery mock-up shows it beside the game's glass)
  const chapterWindow = (c, maxRit, to) => chapterSVG('uzctc' + (++RID) + '-', c || {}, 0, Math.max(1, Number(maxRit) || 1), dayNo(to));
  const api = { render, windowSVG, chapterWindow, KIND, IDC };
  if (root) root.UZCOMP_TERM = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
