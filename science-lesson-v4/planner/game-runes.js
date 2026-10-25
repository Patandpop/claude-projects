/* Ulhu's currency: runes (chosen by Patryk 2026-10-25 over pearls, dream orbs and doubloons; mock-up rounds in
   https://claude.ai/artifact/GsrdW9MrKHRnP47yEwRA2V). Drawn on the page in the app's pixel style, nothing fetched.
   window.RUNES.pick(amount, key): the picture for a reward of that size. Under 30 = one of his five runes (most rewards, about 70%) (a river
   stone, a slate shard, a cracked obsidian tile, a sandstone oval, a cracked coral stone); 30+ = the tall cairn;
   boss treasure = the portal held open by the five runes (Patryk 2026-10-25). key keeps the same rune on the same row between repaints. */
(function (root) {
  if (typeof document === 'undefined') return;
  const TAU = Math.PI * 2;
  function make(w, h, pal, draw) {
    const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill(null));
    const set = (x, y, c) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; };
    const A = { set,
      ell(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) set(x, y, c); } },
      rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) set(x + i, y + j, c); },
      line(x0, y0, x1, y1, c) { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) * 2 || 1; for (let i = 0; i <= n; i++) set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
      tri(ax, ay, bx, by, cx, cy, c) { const s = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
        for (let y = Math.floor(Math.min(ay, by, cy)); y <= Math.max(ay, by, cy); y++) for (let x = Math.floor(Math.min(ax, bx, cx)); x <= Math.max(ax, bx, cx); x++) { const px = x + .5, py = y + .5, d1 = s(px, py, ax, ay, bx, by), d2 = s(px, py, bx, by, cx, cy), d3 = s(px, py, cx, cy, ax, ay); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) set(x, y, c); } } };
    draw(A);
    const empty = (x, y) => !(x >= 0 && y >= 0 && x < w && y < h) || g[y][x] === null;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x2 = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = g[y][x]; let v = null;
      if (k) { const p = pal[k]; v = Array.isArray(p) ? ((empty(x, y - 1) || empty(x - 1, y)) ? p[1] : (empty(x, y + 1) || empty(x + 1, y)) ? p[2] : ((empty(x, y + 2) || empty(x + 2, y)) && (x + y) % 2 === 0) ? p[2] : p[0]) : p; }
      else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !empty(x + dx, y + dy))) v = '#120b14';
      if (v) { x2.fillStyle = v; x2.fillRect(x, y, 1, 1); }
    }
    return { src: c.toDataURL(), w, h };
  }
  const GLOWS = { g: ['#1d8a52', '#c8ffe0'], t: ['#1a6a8a', '#bff4ff'], v: ['#5a2a9a', '#f0d0ff'], y: ['#9a6a10', '#fff0b0'], p: ['#8a2a6a', '#ffd4f4'] };
  const GLYPHS = [[[0, -1, 0, 1], [-.7, -.3, 0, -1], [.7, -.3, 0, -1], [-.7, .5, .7, .5]], [[-.7, -1, .7, 1], [.7, -1, -.7, 1], [0, -1, 0, 1]], [[0, -1, 0, 1], [0, -.2, .7, -.8], [0, .3, -.7, -.3], [0, .3, .7, .9]],
    [[-.7, -.9, .7, -.9], [0, -.9, 0, 1], [-.6, .2, .6, .2], [-.6, .2, -.2, .9]], [], [], [], [[-.6, -1, .6, -1], [.6, -1, -.6, 1], [-.6, 1, .6, 1]]];
  const glyph = (A, cx, cy, s, k, col) => { const G = GLYPHS[k];
    G.forEach(([a, b, c, d]) => [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([ox, oy]) => A.line(cx + a * s + ox, cy + b * s + oy, cx + c * s + ox, cy + d * s + oy, 'h' + col)));
    G.forEach(([a, b, c, d]) => A.line(cx + a * s, cy + b * s, cx + c * s, cy + d * s, 'r' + col)); };
  const spark = (A, x, y, c) => { A.set(x, y, 'r' + c); A.set(x - 1, y, 'h' + c); A.set(x + 1, y, 'h' + c); A.set(x, y - 1, 'h' + c); A.set(x, y + 1, 'h' + c); };
  const crack = (A, pts) => { for (let i = 1; i < pts.length; i++) A.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 'k'); };
  const PAL = { a: ['#566a60', '#8fa398', '#2e3a34'], b: ['#4a5a6e', '#8a9cb2', '#262e3c'], o: ['#2c2a36', '#5e5a72', '#141218'], d: ['#8f7a56', '#cbb68a', '#4e402a'], q: ['#a04a5a', '#e88a9a', '#5a1a2a'],
    m: ['#4a7a3a', '#7ab05a', '#2a4a1a'], c: '#1e2622', k: '#0a080e', pv: ['#2a1a5a', '#8a6ae0', '#100830'], sw: '#e8f0ff' };
  Object.keys(GLOWS).forEach((c) => { PAL['h' + c] = GLOWS[c][0]; PAL['r' + c] = GLOWS[c][1]; });
  const RS = {
    pebble: (A, x, y, s, k, c) => { A.ell(x, y, 7 * s, 6 * s, 'a'); glyph(A, x, y, 3 * s, k, c); },
    shard: (A, x, y, s, k, c) => { A.tri(x - 5 * s, y + 6 * s, x + 5 * s, y + 6 * s, x + 1 * s, y - 9 * s, 'b'); A.rect(x - 5 * s, y + 3 * s, 10 * s, 4 * s, 'b'); glyph(A, x, y + 1 * s, 2.6 * s, k, c); },
    tile: (A, x, y, s, k, c) => { A.rect(x - 6 * s, y - 6 * s, 12 * s, 12 * s, 'o'); glyph(A, x, y, 3.2 * s, k, c); },
    oval: (A, x, y, s, k, c) => { A.ell(x, y, 8 * s, 5 * s, 'd'); glyph(A, x, y, 2.6 * s, k, c); },
    coral: (A, x, y, s, k, c) => { A.ell(x, y, 7.5 * s, 6.5 * s, 'q'); [[-6, -3], [5, -5], [6, 4], [-4, 6]].forEach(([dx, dy]) => A.ell(x + dx * s, y + dy * s, 1.6 * s, 1.6 * s, 'q')); glyph(A, x, y, 2.8 * s, k, c); } };
  const MINE = [['pebble', 0, 'g'], ['shard', 2, 't'], ['tile', 1, 'v'], ['oval', 3, 'y'], ['coral', 7, 'p']];
  const R1 = (i, A, x, y, s) => { const [f, k, c] = MINE[i % 5]; RS[f](A, x, y, s, k, c); };
  const one = (i, extra, s) => make(24, 24, PAL, (A) => { R1(i, A, 12, 12.5, s); if (extra) extra(A); });
  const ONES = [
    one(0, (A) => { A.ell(6, 7, 2.6, 1.6, 'm'); A.line(17, 6, 19, 11, 'c'); }, 1.35),
    make(24, 24, PAL, (A) => { RS.shard(A, 12, 11.5, 1.32, 2, 't'); A.line(9, 7, 11, 12, 'c'); }),
    one(2, (A) => { crack(A, [[4, 6], [7, 8], [6, 11]]); crack(A, [[20, 15], [17, 17], [18, 20], [16, 21]]); crack(A, [[14, 4], [15, 6]]); }, 1.4),
    one(3, (A) => A.line(5, 13, 8, 11, 'c'), 1.3),
    one(4, (A) => { crack(A, [[6, 10], [8, 12], [7, 15]]); crack(A, [[16, 16], [18, 17], [18, 19]]); }, 1.12)];
  const HAND = make(32, 34, PAL, (A) => { R1(3, A, 16, 30, 1.25); R1(0, A, 16, 23, .9); R1(4, A, 15, 16.5, .62); R1(2, A, 16, 11, .5); R1(1, A, 16, 6, .38); spark(A, 16, 1.5, 'g'); A.set(16, 0, 'hg'); spark(A, 5, 9, 'v'); });
  const HOARD = make(40, 40, PAL, (A) => { const P = []; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; P.push([20 + Math.cos(a) * 15, 20 + Math.sin(a) * 15]); }
    A.ell(20, 20, 9, 9, 'pv'); for (let i = 0; i < 26; i++) { const a = i * .6; A.set(20 + Math.cos(a) * i * .3, 20 + Math.sin(a) * i * .3, 'sw'); }
    P.forEach(([x, y], i) => { const [x2, y2] = P[(i + 2) % 5]; A.line(x, y, x2, y2, 'r' + MINE[i][2]); }); P.forEach(([x, y], i) => R1(i, A, x, y, .55)); });
  const hash = (s) => { let h = 7; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
  root.RUNES = {
    ones: ONES, hand: HAND, hoard: HOARD,
    // the picture for a reward of n (kind 'boss' = the hoard); the same key always gets the same single rune
    pick(n, key, kind) { n = Math.abs(Number(n) || 0); if (kind === 'boss') return HOARD; if (n >= 30) return HAND; return ONES[hash(key == null ? n : key) % ONES.length]; },
    any() { return ONES[Math.floor(Math.random() * ONES.length)]; }
  };
})(typeof window !== 'undefined' ? window : this);
