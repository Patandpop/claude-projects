/* ============================================================================
   companion-focus.js: focus crafts (Lane D, 30 Oct 2026). While Patryk focuses on a task, Ulhu makes something.
   Patryk 30 Oct: KNITTING ONLY for now. The scene is K1, the firelit cottage nook he picked from
   replica/design/mockups/companion/focus-crafts-4.html, with Ulhu as his real pixel sprite and the knitted-strip bar.
   The craft is still stored with each piece so more crafts can come later.
   Law: leaving the app PAUSES the piece (it never crumbles and is never lost) and coming back resumes it. A bigger task
   makes a bigger piece. The tool suggests, never decides: Patryk picks the size and presses Start. He can
   stop early: the piece waits on the bench, half made, and can be picked up again later.
   The running piece lives in localStorage "ulhuFocus"; only a finished piece goes to the server (gameFocusDone).
   Opened by game-companion.js as the "Focus" tab: window.UZCOMP_FOCUS.render(el, X). Loads harmlessly in node.
   ============================================================================ */
(function (root) {
  'use strict';
  const KEY = 'ulhuFocus';
  const MIN = { small: 15, medium: 30, large: 60 };
  const SIZES = ['small', 'medium', 'large'];
  const CRAFT = { knit: 'Knitting' };
  const PIECE = { knit: { small: 'sock', medium: 'kelp scarf', large: 'jumper' } };
  const api = { MIN, PIECE, render: function () {} };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root || !root.document) return;
  const doc = root.document;

  /* ---------------- the stored focus ---------------- */
  // { pick:{craft,size}, cur:{craft,size,el,run,done,day}|null, bench:[{craft,size,el,day}], owed:[{id,craft,size}] }
  function load() {
    let s = null;
    try { s = JSON.parse(root.localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    s = (s && typeof s === 'object') ? s : {};
    if (!s.pick || !CRAFT[s.pick.craft] || !MIN[s.pick.size]) s.pick = { craft: 'knit', size: 'medium' };
    if (s.cur && (!CRAFT[s.cur.craft] || !MIN[s.cur.size])) s.cur = null;
    s.bench = (Array.isArray(s.bench) ? s.bench : []).filter((b) => b && CRAFT[b.craft] && MIN[b.size]);
    s.owed = (Array.isArray(s.owed) ? s.owed : []).filter((o) => o && CRAFT[o.craft] && MIN[o.size]);
    return s;
  }
  function store() { try { root.localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) { /* private mode: it still runs this visit */ } }
  const ST = load();
  const total = (c) => MIN[c.size] * 60;
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const an = (w) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- the clock: counts only while the page is visible and the piece is running ---------------- */
  let LAST = 0;
  function count(evenHidden) {
    const c = ST.cur, now = Date.now();
    if (!c || !c.run || c.done || (doc.hidden && !evenHidden)) { LAST = 0; return; }
    if (LAST && now > LAST && now - LAST < 5000) c.el = Math.min(total(c), (Number(c.el) || 0) + (now - LAST) / 1000);
    LAST = now;
    if (c.el >= total(c)) {   // finished: it goes on the shelf
      c.el = total(c); c.done = true; c.run = false; LAST = 0;
      ST.owed.push({ id: now, craft: c.craft, size: c.size }); NEWEST = true;
    }
    store();
  }
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) { count(true); LAST = 0; store(); } else LAST = 0;   // away: paused; back: carries on from here
    paint();
  });
  root.addEventListener('pagehide', function () { count(true); LAST = 0; store(); });
  root.setInterval(function () { count(false); saveOwed(); paint(); }, 1000);

  /* ---------------- the shelf on the server ---------------- */
  let XX = null, SHELF = null, SHELF_ERR = '', NOTE = '', SAVING = false, RETRY = 0, NEWEST = false;
  function saveOwed() {
    const o = ST.owed[0];
    if (!o || SAVING || !XX || Date.now() < RETRY) return;
    SAVING = true;
    XX.call('gameFocusDone', o.craft, o.size, MIN[o.size]).then(function (shelf) {
      SAVING = false; ST.owed = ST.owed.filter((x) => x.id !== o.id); store();
      if (Array.isArray(shelf)) SHELF = shelf; NOTE = ''; SHELF_ERR = ''; paint(true);
      if (ST.owed.length) saveOwed();
    }).catch(function () {
      SAVING = false; RETRY = Date.now() + 30000;
      NOTE = 'The shelf could not be reached just now. The piece is safe and will go up by itself.'; paint(true);
    });
  }
  function loadShelf() {
    if (!XX) return;
    XX.call('gameFocusShelf').then(function (s) { SHELF = Array.isArray(s) ? s : []; SHELF_ERR = ''; paint(true); })
      .catch(function () { SHELF_ERR = 'The shelf would not open just now.'; paint(true); });
  }

  /* ---------------- the scene: K1, the firelit cottage nook ----------------
     Patryk picked K1 on 30 Oct from replica/design/mockups/companion/focus-crafts-4.html; the drawing below is the mock-up's.
     Everything is drawn on a grid of "art pixels", each 2 by 2 canvas pixels, the pixel size of his game sprite.
     The room is drawn once onto the back canvas; only the moving parts (fire, fish, Ulhu, yarn, the bar) are redrawn. */
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let uid = 0;
  const AW = 96, AH = 92, U = 2;
  function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function mix(a, b, t) { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => clamp(Math.round(v + (B[i] - v) * t), 0, 255).toString(16).padStart(2, '0')).join(''); }
  const sh = (h, t) => (t >= 0 ? mix(h, '#ffffff', t) : mix(h, '#000000', -t));
  const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)] / 16;
  
  /* ---------- art-pixel buffer for the static backgrounds ---------- */
  class Buf {
    constructor(w = AW, h = AH) { this.w = w; this.h = h; this.c = new Array(w * h).fill(null); }
    p(x, y, col) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h && col) this.c[y * this.w + x] = col; }
    g(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.c[y * this.w + x]; }
    r(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, typeof col === 'function' ? col(x + i, y + j, i, j) : col); }
    circ(cx, cy, r, col) { for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r) this.p(x, y, typeof col === 'function' ? col(x, y, dx, dy) : col); } }
    outline(col) { const o = this.c.slice(); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { if (this.c[y * this.w + x]) continue; if (this.g(x - 1, y) || this.g(x + 1, y) || this.g(x, y - 1) || this.g(x, y + 1)) o[y * this.w + x] = col; } this.c = o; }
    draw(ctx, ox = 0, oy = 0) { for (let y = 0; y < this.h; y++) { let x = 0; while (x < this.w) { const k = this.c[y * this.w + x]; if (!k) { x++; continue; } let x2 = x; while (x2 < this.w && this.c[y * this.w + x2] === k) x2++; ctx.fillStyle = k; ctx.fillRect((ox + x) * U, (oy + y) * U, (x2 - x) * U, U); x = x2; } } }
    // dithered light: each source brightens towards its colour in 3 steps, plus a dithered darkness away from all lights
    light(srcs, dark, skip) {
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x; let col = this.c[i]; if (!col || (skip && skip(x, y))) continue;
        let tot = 0;
        for (const s of srcs) { const d = Math.hypot(x - s.x, y - s.y) / s.r, L = Math.max(0, 1 - d); tot += L * (s.dk == null ? 1 : s.dk); const lv = Math.floor(clamp(L * 3 + bay(x, y) - 0.3, 0, 3)) / 3; if (lv > 0) col = mix(col, s.col, lv * s.k); }
        const dv = Math.floor(clamp((1 - Math.min(1, tot)) * dark * 3 + bay(x + 1, y + 2) - 0.5, 0, 3)) / 3;
        if (dv > 0) col = mix(col, '#04050a', dv * 0.42);
        this.c[i] = col;
      }
    }
  }
  const F = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x) * U, Math.round(y) * U, w * U, h * U); };
  // a curved strand of yarn as a pixel line (quadratic curve), with a darker pixel under it so it reads as a strand
  function strand(c, x0, y0, qx, qy, x1, y1, col, lo) {
    const seen = new Set(), pts = [];
    const n = Math.ceil((Math.abs(x1 - x0) + Math.abs(y1 - y0) + Math.abs(qy - y0)) * 3) + 4;
    for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t; const x = Math.round(a * x0 + b * qx + d * x1), y = Math.round(a * y0 + b * qy + d * y1); const k = x + ',' + y; if (!seen.has(k)) { seen.add(k); pts.push([x, y]); } }
    pts.forEach(([x, y]) => { if (!seen.has(x + ',' + (y + 1))) F(c, x, y + 1, 1, 1, lo); });
    pts.forEach(([x, y], i) => F(c, x, y, 1, 1, i % 4 === 1 ? sh(col, 0.3) : col));
  }
  
  /* ---------- the knitted pieces (row 0 = top of the finished piece, knitting starts at the bottom row) ---------- */
  const SOCK = ['aaaaaaa......', 'bbbbbbb......', 'aaaaaaa......', 'ccccccc......', 'ccccccc......', 'ddddddd......', 'ccccccc......', 'ccccccc......',
    'ddddddd......', 'ccccccc......', 'cccccccc.....', 'ccccccccccc..', 'eccccccccccee', 'eeccccccccdee', '.eeccccccceee', '..eeeeeeeee..'];
  function scarf() { const R = 22, W = 8, g = []; for (let r = 0; r < R; r++) { let row = ''; const sx = Math.round(3.5 + 1.7 * Math.sin(r * 0.62)); for (let c = 0; c < W; c++) { let k = 'a'; if (r < 2 || r >= R - 2) k = r % 2 ? 'd' : 'b'; else if (c === sx) k = 'c'; else if (r % 3 === 0 && ((r / 3) % 2 ? c === sx - 1 || c === sx - 2 : c === sx + 1 || c === sx + 2)) k = 'e'; row += k; } g.push(row); } return g; }
  function jumper() {
    const R = 18, W = 19, g = [];
    for (let r = 0; r < R; r++) { let row = ''; for (let c = 0; c < W; c++) { const body = c >= 4 && c <= 14, sleeve = c <= 3 || c >= 15; let k = '.';
      if (r === 0) { if ((c >= 3 && c <= 6) || (c >= 12 && c <= 15)) k = c === 6 || c === 12 ? 'b' : 'a'; } else if (r === 1) { if (c >= 1 && c <= 17) k = c >= 7 && c <= 11 ? 'b' : 'a'; }
      else if (r <= 10) { if (body || sleeve) k = 'a'; if (sleeve && r === 5) k = 'c'; if (sleeve && r >= 9) k = 'b'; } else if (body) k = r >= 16 ? 'b' : 'a';
      if (body && r >= 2 && r <= 14) { const dx = (c - 9) * 6, dy = (r - 8) * 4.4; if (dx * dx + dy * dy <= 22 * 22) k = 'f'; }
      if ((c === 7 || c === 11) && (r === 7 || r === 8)) k = 'e'; if ((c === 6 || c === 12) && r === 10) k = 'p'; if ((c === 8 || c === 10) && r >= 11 && r <= 13) k = 'g'; if (c === 9 && r === 12) k = 'g'; if (c === 9 && r === 2) k = 'k';
      row += k; } g.push(row); }
    return g;
  }
  const GRIDS = { small: SOCK, medium: scarf(), large: jumper() };
  const PAL = {
    small: { a: '#faf5d7', b: '#f28ca0', c: '#78be96', d: '#3c643c', e: '#e0b860' },
    medium: { a: '#3c643c', b: '#e0b860', c: '#8fd06a', d: '#c98a2a', e: '#aae2be' },
    large: { a: '#9a3048', b: '#6e1f34', c: '#e0b860', f: '#aae2be', e: '#1b1b2f', p: '#f28ca0', g: '#5a9c78', k: '#8fd06a' },
  };
  const OUTL = '#141c18';
  // knit texture at one art pixel per stitch: alternate columns lighter and darker so it reads as ribs of V stitches
  const knitCol = (col, c, r) => sh(col, c % 2 ? -0.16 : (r % 2 ? 0.04 : 0.12));
  // small version for the shelf: every other stitch
  function miniBuf(sz) {
    const g = GRIDS[sz], R = g.length, W = g[0].length, mw = Math.ceil(W / 2), mh = Math.ceil(R / 2);
    const b = new Buf(mw + 2, mh + 2);
    for (let r = 0; r < mh; r++) for (let c = 0; c < mw; c++) { const k = g[Math.min(R - 1, r * 2)][Math.min(W - 1, c * 2)]; if (k !== '.') b.p(c + 1, r + 1, knitCol(PAL[sz][k], c, r)); }
    b.outline(OUTL); return b;
  }
  const MINI = { small: miniBuf('small'), medium: miniBuf('medium'), large: miniBuf('large') };
  // the part already knitted, hanging from the needles: newest row at the top
  function lapPiece(c, sz, f, cx, top, maxRows) {
    const g = GRIDS[sz], R = g.length, W = g[0].length;
    const done = clamp(f, 0, 1) * R, full = Math.floor(done), part = done - full;
    const b = new Buf(W + 2, maxRows + 3);
    const curRow = R - full - 1; let rows = [];
    if (curRow >= 0) rows.push(curRow);
    for (let r = R - full; r < R; r++) rows.push(r);
    rows = rows.slice(0, maxRows);
    rows.forEach((gr, i) => {
      const row = g[gr]; const c0 = row.search(/[^.]/); let c1 = row.length - 1; while (row[c1] === '.') c1--;
      let from = c0, to = c1;
      if (gr === curRow) { const n = c1 - c0 + 1, s = Math.floor(part * n), ltr = full % 2 === 0; if (s === 0) return; if (ltr) to = c0 + s - 1; else from = c1 - s + 1; }
      for (let col = from; col <= to; col++) if (row[col] !== '.') b.p(col + 1, i + 1, knitCol(PAL[sz][row[col]], col, gr));
    });
    b.outline(OUTL);
    b.draw(c, Math.round(cx - (W + 2) / 2), top - 1);
  }
  
  /* ---------- Ulhu: his real 64 by 64 game sprite (ULHU_ART.b16 from game-ulhu.js: idle, sleepy and happy) ---------- */
  const IMG = {};
  let IMG_P = null;
  function loadImgs() {
    if (IMG_P) return IMG_P;
    const src = root.ULHU_ART && root.ULHU_ART.b16;
    IMG_P = Promise.all(['idle', 'sleepy', 'happy'].map((k) => new Promise((res) => {
      if (!src || !src[k]) { res(); return; }
      const i = new root.Image(); i.onload = () => { IMG[k] = i; res(); }; i.onerror = () => res(); i.src = src[k];
    })));
    return IMG_P;
  }
  function tinted(img, col, a) { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); if (a > 0) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.globalAlpha = a; x.fillRect(0, 0, 64, 64); } return cv; }
  const UX = 37, UY = 26; // his top-left, in art pixels (same place in both scenes)
  const SKIN = '#aae2be', SKIN2 = '#78be96', SKOUT = '#284632';
  function drawUlhu(c, S, st, t) {
    const mood = st === 'paused' ? 'sleepy' : st === 'fin' ? 'happy' : 'idle', im = S.tint[mood];
    const step = Math.floor(t / 140);
    const hop = st === 'fin' ? [0, -1, -3, -4, -3, -1, 0, 0][step % 8] : 0;
    const X = UX * U, Y = (UY + hop) * U;
    const wdy = st === 'paused' ? 0 : st === 'fin' ? (step % 2 ? -2 : 0) : (Math.floor(t / 520) % 2 ? -2 : 0);
    const hdy = st === 'paused' ? (Math.floor(t / 1700) % 2 ? 2 : 0) : 0;
    c.drawImage(im, 0, 0, 12, 64, X, Y + wdy, 12, 64);
    if (mood === 'sleepy') c.drawImage(im, 52, 14, 12, 50, X + 52, Y + 14 + wdy, 12, 50); else c.drawImage(im, 52, 0, 12, 64, X + 52, Y + wdy, 12, 64);
    c.drawImage(im, 12, 30, 40, 34, X + 12, Y + 30, 40, 34);
    if (mood === 'sleepy') c.drawImage(im, 12, 0, 36, 30, X + 12, Y + hdy, 36, 30), c.drawImage(im, 48, 14, 4, 16, X + 48, Y + 14 + hdy, 4, 16);
    else c.drawImage(im, 12, 0, 40, 30, X + 12, Y + hdy, 40, 30);
    if (mood === 'idle' && t % 4300 < 150) c.drawImage(S.tint.sleepy, 14, 13, 36, 15, X + 14, Y + 13, 36, 15);
    return { hop };
  }
  // glasses on the same 2-pixel grid, sitting over his eyes; when he dozes they slide down his nose
  function glasses(c, st, hop) {
    const ox = UX, oy = UY + hop + (st === 'paused' ? 3 : 0), G = '#e0b860', g2 = '#8a6a2a', gl = '#fff6d0';
    const rim = (x0, y0) => { F(c, ox + x0 + 1, oy + y0, 5, 1, G); F(c, ox + x0, oy + y0 + 1, 1, 6, G); F(c, ox + x0 + 6, oy + y0 + 1, 1, 6, g2); F(c, ox + x0 + 1, oy + y0 + 7, 5, 1, g2); F(c, ox + x0 + 4, oy + y0 + 1, 1, 1, gl); };
    if (st === 'paused') { rim(8, 6); rim(17, 7); F(c, ox + 15, oy + 9, 2, 1, G); }
    else { rim(8, 6); rim(17, 6); F(c, ox + 15, oy + 8, 2, 1, G); F(c, ox + 6, oy + 8, 2, 1, g2); F(c, ox + 24, oy + 8, 2, 1, g2); }
  }
  // two of his face tentacles become arms; needles in his "hands"
  function armsAndNeedles(c, st, t, hop) {
    const ox = UX, oy = UY + hop, k = st === 'work' ? Math.floor(t / 180) % 4 : 0, drop = st === 'paused' ? 2 : 0;
    const rh = [[0, 0], [-1, 0], [-1, -1], [0, 0]][k], lh = [[0, 0], [0, 0], [0, 1], [0, 0]][k];
    const arm = (pts) => { // 2-pixel-thick tentacle with outline and an underside shade
      const cells = new Map();
      for (let i = 0; i < pts.length - 1; i++) { const [a, b] = pts[i], [c2, d] = pts[i + 1], n = Math.max(Math.abs(c2 - a), Math.abs(d - b)) * 2 + 1; for (let s = 0; s <= n; s++) { const x = Math.round(a + (c2 - a) * s / n), y = Math.round(b + (d - b) * s / n); if (cells.get(x + ',' + y) !== 1) cells.set(x + ',' + y, 1); cells.set(x + 1 + ',' + y, 1); if (!cells.has(x + ',' + (y + 1))) cells.set(x + ',' + (y + 1), 2); } }
      const out = new Set();
      cells.forEach((v, key) => { const [x, y] = key.split(',').map(Number); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const q = x + dx + ',' + (y + dy); if (!cells.has(q)) out.add(q); }); });
      out.forEach((key) => { const [x, y] = key.split(',').map(Number); F(c, ox + x, oy + y, 1, 1, SKOUT); });
      cells.forEach((v, key) => { const [x, y] = key.split(',').map(Number); F(c, ox + x, oy + y, 1, 1, v === 2 ? SKIN2 : SKIN); });
    };
    const L = [12 + lh[0], 27 + lh[1] + drop], R = [20 + rh[0], 27 + rh[1] + drop];
    const needle = (x0, y0, x1, y1, knob) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let s = 0; s <= n; s++) { const x = Math.round(x0 + (x1 - x0) * s / n), y = Math.round(y0 + (y1 - y0) * s / n); F(c, ox + x, oy + y + 1, 1, 1, '#3a1e0a'); F(c, ox + x, oy + y, 1, 1, s % 3 ? '#c9853a' : '#f0b060'); } F(c, ox + x0, oy + y0, 1, 1, knob); F(c, ox + x0 + (x1 > x0 ? -1 : 1), oy + y0, 1, 1, knob); F(c, ox + x0, oy + y0 + 1, 1, 1, '#a04a5a'); };
    if (st === 'paused') { needle(L[0] - 3, L[1] + 1, L[0] + 9, L[1] + 3, '#f28ca0'); needle(R[0] + 3, R[1] + 1, R[0] - 9, R[1] + 3, '#f28ca0'); }
    else { needle(L[0] - 4, L[1] + 2, L[0] + 9, L[1] - 6, '#f28ca0'); needle(R[0] + 4, R[1] + 2, R[0] - 9, R[1] - 6, '#f28ca0'); }
    arm([[10, 21], [8, 24], [L[0] - 2, L[1]], L]);
    arm([[21, 21], [23, 24], [R[0] + 1, R[1]], [R[0] - 1, R[1]]]);
    if (k === 2) { const x = ox + 16, y = oy + 21; F(c, x, y - 1, 1, 1, '#fff6c8'); F(c, x - 1, y, 3, 1, '#fff6c8'); F(c, x, y + 1, 1, 1, '#fff6c8'); }
    return [ox + R[0], oy + R[1], ox + L[0], oy + L[1]];
  }
  function zzz(c, t) {
    const Z = [[0, 0], [1, 0], [2, 0], [2, 1], [1, 2], [0, 3], [0, 4], [1, 4], [2, 4]];
    for (let i = 0; i < 3; i++) { const ph = ((t / 900 + i) % 3) / 3, s = Math.floor(ph * 8); if (ph > 0.92) continue; const x = UX + 26 + s, y = UY + 1 - s * 2; Z.forEach(([dx, dy]) => F(c, x + dx, y + dy, 1, 1, ph > 0.7 ? '#9fb8cc' : '#e9f4ff')); }
  }
  function sparkle(c, x, y, ph) { const a = ph > 0.5 ? '#fff6c8' : '#ffd56a'; F(c, x, y, 1, 1, '#ffffff'); if (ph > 0.25) { F(c, x - 1, y, 1, 1, a); F(c, x + 1, y, 1, 1, a); F(c, x, y - 1, 1, 1, a); F(c, x, y + 1, 1, 1, a); } if (ph > 0.6) { F(c, x - 2, y, 1, 1, '#c98a2a'); F(c, x + 2, y, 1, 1, '#c98a2a'); F(c, x, y - 2, 1, 1, '#c98a2a'); F(c, x, y + 2, 1, 1, '#c98a2a'); } }
  
  /* ---------- yarn ball: a pixel circle with wrapped strands that spin and shrink ---------- */
  const YARN = '#8fd0a8';
  function ball(c, cx, floorY, r, spin, jig) {
    const cy = floorY - r, b = new Buf(20, 20), o = 10;
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      const dx = x + 0.5 - o, dy = y + 0.5 - o, d = Math.hypot(dx, dy); if (d > r) continue;
      let col = YARN;
      const u = dx * 0.8 + dy * 0.6 + spin, v = dx * -0.55 + dy * 0.85 - spin * 0.6;
      if (((Math.floor(u * 0.9) % 3) + 3) % 3 === 0 && dy < r * 0.3) col = '#5a9c78';
      else if (((Math.floor(v) % 3) + 3) % 3 === 0 && dy >= -r * 0.2) col = '#3c7a5a';
      const lit = -(dx + dy) / r;
      if (lit > 0.75) col = sh(col, 0.35); else if (lit > 0.3) col = sh(col, 0.12); else if (lit < -0.75) col = sh(col, -0.35); else if (lit < -0.3) col = sh(col, -0.15);
      b.p(x, y, col);
    }
    b.outline('#16301f');
    b.draw(c, Math.round(cx - o + jig), Math.round(cy - o));
    return [Math.round(cx + jig), Math.round(cy - r)];
  }
  
  /* ---------- the bar: a knitted strip that grows stitch by stitch ---------- */
  const BAR = { x: 4, y: 74, cols: 17, rows: 2, sw: 5, sh: 4 };
  const NST = BAR.cols * BAR.rows;
  const STRIPE = ['#aae2be', '#aae2be', '#aae2be', '#faf5d7', '#5a8c5a', '#faf5d7', '#aae2be', '#aae2be', '#78be96', '#3c643c'];
  function stitchCol(cI, r) { const k = cI % 10; if (k === 4 && r === 0) return '#f28ca0'; return STRIPE[k]; }
  function stitch(c, x, y, col) { // a V: two arms meeting at the bottom middle
    const D = sh(col, -0.5), A = sh(col, 0.25), B = sh(col, -0.06), M = sh(col, -0.2);
    const g = ['ADDDB', 'AADBB', 'DAMBD', 'DDMDD'], m = { A, B, D, M };
    for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) F(c, x + i, y + j, 1, 1, m[g[j][i]]);
  }
  function drawBar(c, S, f, st, t) {
    const n = Math.floor(clamp(f, 0, 1) * NST + 1e-6), { x: X, y: Y, sw, sh: H } = BAR;
    const wcols = Math.ceil(n / BAR.rows);
    if (wcols) { c.globalAlpha = 0.35; F(c, X + 1, Y + BAR.rows * H, wcols * sw, 1, '#000000'); c.globalAlpha = 1; }
    for (let i = 0; i < n; i++) { const ci = Math.floor(i / BAR.rows), r = i % BAR.rows; stitch(c, X + ci * sw, Y + r * H, stitchCol(ci, r)); }
    // cast-on knot on the left
    F(c, X - 1, Y + 2, 1, 5, '#3c643c'); F(c, X - 2, Y + 3, 1, 3, '#5a8c5a');
    S.pins(c, wcols);
    if (st === 'fin') return;
    // loose yarn ahead: lies in a soft wave along the board, shorter as the strip grows
    const ex = X + wcols * sw, endX = X + BAR.cols * sw + 2;
    for (let x = ex + 1; x < endX; x++) { const y = Y + 3 + [0, 0, 1, 1, 1, 0, 0, -1, -1, -1][(x + 3) % 10]; c.globalAlpha = 0.4; F(c, x, y + 1, 1, 1, '#000000'); c.globalAlpha = 1; F(c, x, y, 1, 1, x % 5 === 0 ? '#c4ecd2' : YARN); }
    F(c, endX, Y + 2, 2, 3, '#5a9c78'); F(c, endX + 1, Y + 1, 1, 1, '#3c643c');
    // two little needles at the growing edge, and the stitch being made blinks
    const cx = X + Math.floor(n / BAR.rows) * sw, cy = Y + (n % BAR.rows) * H;
    const k = st === 'work' ? Math.floor(t / 180) % 4 : 0, dip = k === 1 || k === 2 ? 1 : 0;
    const nd = (x0, y0, dx) => { for (let s = 0; s < 8; s++) { F(c, x0 + Math.round(s * dx), y0 - s + 1, 1, 1, '#5a3a1c'); F(c, x0 + Math.round(s * dx), y0 - s, 1, 1, s % 3 ? '#c9853a' : '#f0b060'); } F(c, x0 + Math.round(7 * dx), y0 - 7, 1, 1, '#f28ca0'); };
    if (n < NST) {
      if (st === 'work' && Math.floor(t / 330) % 2) { F(c, cx, cy - 1, 5, 1, '#fff6c8'); F(c, cx, cy + 4, 5, 1, '#fff6c8'); F(c, cx - 1, cy, 1, 4, '#fff6c8'); F(c, cx + 5, cy, 1, 4, '#fff6c8'); }
      else if (st === 'paused') { F(c, cx, cy - 1, 5, 1, '#9fb8cc'); F(c, cx, cy + 4, 5, 1, '#9fb8cc'); }
      nd(cx + 1, cy + 4 + dip, -0.45); nd(cx + 3, cy + 4, 0.5);
    }
  }
  
  /* ---------- chair (shared shape, own colours) ---------- */
  function chairBack(B, P, wings, rad) {
    const x0 = 38, x1 = 68, y0 = 16, y1 = 56;
    const inside = (x, y) => { if (x < x0 || x > x1 || y < y0 || y > y1) return false; const cx = x < x0 + rad ? x0 + rad : x > x1 - rad ? x1 - rad : x, cy = y < y0 + rad ? y0 + rad : y; return Math.hypot(x - cx, y - cy) <= rad; };
    const T = new Buf();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y)) { const u = (x - x0) / (x1 - x0); let col = u < 0.18 ? P.hi : u > 0.82 ? P.lo : P.mid; if (y < y0 + 3) col = sh(col, 0.1); T.p(x, y, col); }
    if (wings) for (const s of [-1, 1]) for (let y = 22; y <= 48; y++) for (let x = 0; x < 6; x++) { const xx = s < 0 ? 33 + x : 68 + x; const top = y < 27 ? (s < 0 ? x >= 27 - y : x <= 5 - (27 - y)) : true; if (top) T.p(xx, y, s < 0 ? (x < 2 ? P.hi : P.mid) : (x > 3 ? P.lo : P.mid)); }
    for (const by of [24, 33, 42]) for (const bx of [45, 53, 61]) { const X = bx + (by === 33 ? -4 : 0); if (X < x0 + 2) continue; T.p(X, by, P.btn); T.p(X - 1, by - 1, P.hi); T.p(X + 1, by + 1, sh(P.mid, -0.18)); T.p(X + 2, by + 2, sh(P.mid, -0.1)); T.p(X - 2, by + 2, sh(P.mid, -0.1)); }
    T.outline(P.out);
    T.c.forEach((v, i) => { if (v) B.c[i] = v; });
  }
  function chairFront(P, rad) {
    const T = new Buf();
    for (const ax of [33, 67]) for (let y = 50; y <= 59; y++) for (let x = ax; x < ax + 7; x++) { if (y === 50 && (x === ax || x === ax + 6)) continue; if (rad > 4 && y === 51 && (x === ax || x === ax + 6)) continue; const top = y < 53; const col = top ? (y === 50 || (rad > 4 && y === 51) ? sh(P.hi, 0.12) : P.hi) : (x === ax ? P.hi : x === ax + 6 ? P.lo : P.mid); T.p(x, y, col); }
    T.r(40, 55, 27, 1, sh(P.hi, 0.05)); T.r(40, 56, 27, 3, P.mid); T.r(40, 59, 27, 1, P.lo);
    for (const lx of [35, 70]) T.r(lx, 60, 2, 3, P.leg);
    T.outline(P.out);
    return T;
  }
  
  /* ---------- K1: firelit cottage nook ---------- */
  function buildK1() {
    const B = new Buf(), R = rng(11);
    // stone wall
    for (let row = 0; row * 5 + 4 < 62; row++) { const y0 = 4 + row * 5; let x = -(row % 2) * 5; while (x < AW) { const w = 7 + Math.floor(R() * 6), base = ['#4e3f38', '#55443b', '#4a3b35', '#5a4840', '#463832'][Math.floor(R() * 5)]; for (let j = 0; j < 5; j++) for (let i = 0; i < w; i++) { let col = base; if (i === w - 1 || j === 4) col = '#2b211d'; else if (j === 0) col = sh(base, 0.12); else if (j === 3) col = sh(base, -0.14); else if (hash(x + i, y0 + j) > 0.9) col = sh(base, -0.1); B.p(x + i, y0 + j, col); } x += w; } }
    // beam and hanging herbs
    B.r(0, 0, AW, 4, (x, y) => (y === 0 ? '#2a180c' : y === 3 ? '#1e1008' : hash(x, 3) > 0.8 ? '#2e1c0e' : y === 1 ? '#4e3220' : '#3a2414'));
    for (const hx0 of [30, 54]) { B.r(hx0, 4, 1, 3, '#c9a050'); for (let j = 0; j < 5; j++) for (let i = -2; i <= 2; i++) if (Math.abs(i) <= 2 - (j > 2 ? 1 : 0)) B.p(hx0 + i, 7 + j, (i + j) % 2 ? '#3e6a2a' : '#5a8a3a'); B.p(hx0, 6, '#e0b860'); }
    // fireplace
    for (let y = 27; y < 60; y++) for (let x = 2; x < 35; x++) { const sx = x + (Math.floor((y - 27) / 4) % 2) * 3, bx = Math.floor(sx / 6), by = Math.floor((y - 27) / 4); const base = ['#7a6a5e', '#857466', '#6e5f54'][(bx + by * 2) % 3]; let col = base; if (sx % 6 === 5 || (y - 27) % 4 === 3) col = '#3e332c'; else if ((y - 27) % 4 === 0) col = sh(base, 0.12); B.p(x, y, col); }
    const opening = (x, y) => { if (y < 34 || y > 58) return false; const hw = y === 34 ? 7 : y === 35 ? 9 : y === 36 ? 10 : 11; return x >= 18 - hw && x <= 18 + hw; };
    for (let y = 34; y <= 58; y++) for (let x = 6; x <= 30; x++) if (opening(x, y)) { let col = '#140a07'; if (y < 50 && (x + Math.floor(y / 3)) % 5 !== 0 && y % 3 !== 0) col = y < 42 ? '#2a120c' : '#3a1a10'; B.p(x, y, col); }
    B.r(0, 24, 37, 1, '#b07a42'); B.r(0, 25, 37, 2, (x) => (hash(x, 25) > 0.75 ? '#6a3e1e' : '#7a4a24')); B.r(0, 27, 37, 1, '#3e2410');
    B.r(2, 28, 3, 2, '#5a3418'); B.r(32, 28, 3, 2, '#5a3418');
    B.r(0, 58, 37, 4, (x, y) => (y === 58 ? '#8a7a6a' : y === 61 ? '#3e332c' : '#6a5a50'));
    // logs and the ember bed
    B.r(9, 53, 19, 3, (x, y) => (y === 53 ? '#7a4a24' : '#5a3418')); B.r(11, 50, 15, 3, (x, y) => (y === 50 ? '#8a5a2e' : '#62391a'));
    for (const [ex, ey] of [[9, 54], [27, 54], [11, 51], [25, 51]]) B.p(ex, ey, '#c9925a');
    B.r(10, 56, 18, 2, (x) => (x % 3 ? '#ff6a2a' : '#ffb43a'));
    // window onto the sea
    const glass = (x, y) => { if (y < 12 || y > 38) return false; const hw = y === 12 ? 2 : y === 13 ? 4 : y === 14 ? 5 : y === 15 ? 6 : 7; return x >= 83 - hw && x <= 82 + hw; };
    for (let y = 9; y <= 40; y++) for (let x = 73; x <= 92; x++) { let near = false; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (glass(x + dx, y + dy)) near = true; if (near && !glass(x, y)) B.p(x, y, (x + y) % 7 === 0 ? '#6e6052' : y < 13 || x < 76 ? '#a09080' : '#8a7a6a'); }
    const win = new Set();
    for (let y = 12; y <= 38; y++) for (let x = 76; x <= 89; x++) if (glass(x, y)) {
      const v = (y - 12) / 26 + (bay(x, y) - 0.5) * 0.18, cols = ['#14365a', '#0e2c4c', '#0a2238', '#071a2c', '#05121f'];
      let col = cols[clamp(Math.floor(v * 5), 0, 4)];
      const dm = Math.hypot(x + 0.5 - 86, y + 0.5 - 17);
      if (dm < 2.7) col = dm < 1.6 ? '#f2f6e0' : '#d0d8b8'; else if (Math.abs(x - 85.5) < 1.5 + (y - 19) * 0.12 && y > 20 && bay(x, y) > 0.55) col = '#2a5a80';
      if (y > 34 && y > 38 - hash(x, 5) * 6) col = '#0c2a1c';
      if (x === 83 || y === 25) col = '#1a1410'; else win.add(x + ',' + y);
      B.p(x, y, col);
    }
    B.r(72, 40, 22, 1, '#a8743e'); B.r(72, 41, 22, 2, '#6a3e1e');
    // floor planks and the rug
    for (let y = 60; y < 70; y++) { const row = Math.floor((y - 60) / 3); for (let x = 0; x < AW; x++) { const seam = (x + row * 13) % 21 === 0, base = ['#5a3820', '#62402a', '#4e301c', '#583822'][row % 4]; let col = (y - 60) % 3 === 2 || seam ? '#2a1a0e' : (y - 60) % 3 === 0 ? sh(base, 0.12) : base; if (!seam && hash(x, y) > 0.92) col = sh(base, -0.12); B.p(x, y, col); } }
    for (let y = 60; y < 70; y++) for (let x = 26; x < 82; x++) { const dx = (x + 0.5 - 54) / 27, dy = (y + 0.5 - 65) / 4.6, d = dx * dx + dy * dy; if (d > 1) continue; let col = '#8a2a2a'; if (d > 0.72) col = '#c9a050'; else if (d > 0.6) col = '#5a1a1a'; else if ((Math.abs(x - 54) + Math.abs(y - 65) * 3) % 6 === 0) col = '#e6c88a'; else if ((x + y) % 2 && d < 0.2) col = '#9a3a32'; B.p(x, y, col); }
    // basket of spare yarn by the window
    B.circ(88, 55.5, 2.6, (x, y, dx, dy) => (dx + dy < -1.5 ? '#ffb8c6' : dx + dy > 1.6 ? '#c06a7e' : (x + y) % 3 === 0 ? '#d8788c' : '#f28ca0'));
    B.circ(92, 56, 2.3, (x, y, dx, dy) => (dx + dy < -1.2 ? '#ffffff' : dx + dy > 1.4 ? '#c8c0a0' : (x - y) % 3 === 0 ? '#e0d8b4' : '#faf5d7'));
    B.r(84, 57, 11, 6, (x, y) => (y === 57 ? '#c09a50' : (x + Math.floor(y / 2)) % 2 ? '#a07a3a' : '#7a5a28'));
    B.r(84, 63, 11, 1, '#3a2410');
    chairBack(B, K1.chair, true, 4);
    B.light([{ x: 18, y: 50, r: 62, col: '#ff9a48', k: 0.42 }, { x: 18, y: 50, r: 26, col: '#ffd08a', k: 0.25, dk: 0.5 }, { x: 84, y: 24, r: 22, col: '#7ab0d8', k: 0.18, dk: 0.6 }], 0.85, (x, y) => win.has(x + ',' + y) || (y >= 34 && y <= 58 && x >= 7 && x <= 29) || y >= 70);
    // bar area: skirting, the board the strip is pinned to, and the plaque
    B.r(0, 70, AW, 1, '#6a4224'); B.r(0, 71, AW, 2, '#3a2414');
    B.r(0, 73, AW, 11, (x, y) => (y === 83 ? '#3a2616' : hash(x >> 2, y) > 0.85 ? '#5e4228' : x % 31 === 0 ? '#4a321e' : '#6a4a2c'));
    B.r(0, 84, AW, 8, '#1e1208'); B.r(1, 84, AW - 2, 1, '#c9a050'); B.r(1, 91, AW - 2, 1, '#6a4a1a'); B.r(1, 85, 1, 6, '#c9a050'); B.r(AW - 2, 85, 1, 6, '#6a4a1a');
    K1.win = win;
    return B;
  }
  const K1 = {
    id: 'k1', chair: { hi: '#c84a44', mid: '#9a2a30', lo: '#5e161c', btn: '#4a0e14', out: '#240608', leg: '#3a2010' },
    shelfY: 23, slots: [7, 18, 29], dash: '#e6c88a', ballX: 81, floorY: 67, tintCol: '#ff9a48', tintA: 0.07,
    pins(c, w) { for (let i = 0; i < w; i += 3) { const x = BAR.x + i * BAR.sw + 2; F(c, x, BAR.y - 1, 2, 1, '#f0d080'); F(c, x + 1, BAR.y - 1, 1, 1, '#a07a2a'); } },
    mid(c, t, st) {
      // fire: columns of flame that change every frame, hot core, orange body, red tips
      const fr = Math.floor(t / 110), base = 53;
      for (let x = 10; x <= 27; x++) { const cen = 1 - Math.abs(x - 18.5) / 9.5, h = Math.round(3 + 11 * cen + hash(x, fr) * 4 - (st === 'paused' ? 2 : 0)); for (let j = 0; j < h; j++) { const y = base - j, rel = j / h; if (rel > 0.75 && hash(x * 3 + j, fr) > 0.6) continue; const col = rel < 0.35 && cen > 0.55 ? '#fff2a8' : rel < 0.55 ? '#ffc040' : rel < 0.8 ? '#f07a22' : '#c03a1a'; F(c, x, y, 1, 1, col); } }
      for (let i = 0; i < 3; i++) { const q = t / 1300 + i * 0.33, ph = q % 1, x = 13 + Math.floor(hash(i, Math.floor(q)) * 12), y = 46 - Math.floor(ph * 12); if (y > 35) F(c, x + (Math.floor(ph * 6) % 2), y, 1, 1, ph > 0.6 ? '#c03a1a' : '#ffb43a'); }
      c.drawImage(Math.floor(t / 240) % 3 === 0 ? this.glowB : this.glowA, 0, 0);
      // fish and bubbles in the window
      const W = this.win, put = (x, y, col) => { if (W.has(x + ',' + y)) F(c, x, y, 1, 1, col); };
      const fx = 70 + Math.floor((t / 260) % 34), fy = 29;
      [[1, 0], [2, 0], [3, 0], [5, 0], [0, 1], [1, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [5, 2]].forEach(([dx, dy]) => put(fx - dx, fy + dy, dy === 0 ? '#ffb070' : '#f08a3a'));
      put(fx - 1, fy + 1, '#1a0a04');
      const f2 = 96 - Math.floor((t / 420) % 30); [[0, 0], [1, 0], [2, 0], [-1, 0], [0, -1], [1, 1]].forEach(([dx, dy]) => put(f2 + dx, 20 + dy, '#8ab8d8'));
      for (let i = 0; i < 3; i++) { const ph = (t / 3400 + i * 0.37) % 1, x = 79 + i * 3 + (Math.floor(ph * 9) % 2), y = 37 - Math.floor(ph * 24); put(x, y, '#9fd0ff'); }
      if (Math.floor(t / 500) % 2) put(86, 22, '#4a7aa0');
    },
  };
  
  /* ---------- glow over the room from the fire (dithered, made once) ---------- */
  function glow(cx, cy, r, col, a, seed) { const cv = document.createElement('canvas'); cv.width = AW * U; cv.height = AH * U; const x = cv.getContext('2d'); x.fillStyle = col; for (let y = 0; y < 70; y++) for (let i = 0; i < AW; i++) { const L = 1 - Math.hypot(i - cx, y - cy) / r; if (L <= 0) continue; const lv = Math.floor(clamp(L * 3 + bay(i + seed, y) - 0.4, 0, 3)); if (lv) { x.globalAlpha = a * lv; x.fillRect(i * U, y * U, U, U); } } return cv; }
  /* ---------- the mantelpiece: the two newest real shelf pieces, plus the slot for the piece being made ---------- */
  function drawMantel(c, S, st, size, t) {
    const put = (sz, x, dy) => { const m = MINI[sz]; m.draw(c, Math.round(x - m.w / 2), S.shelfY - m.h + 1 + (dy || 0)); };
    const list = (SHELF || []).filter((x) => x && MINI[x.size]);
    const skip = st === 'fin' && !ST.owed.length && list.length ? 1 : 0;   // once saved, the finished piece is the newest in the list
    list.slice(skip, skip + 2).forEach((x, i) => put(x.size, S.slots[1 - i]));
    const x = S.slots[2], m = MINI[size];
    if (st === 'fin') {
      const e = t - (S.finT == null ? t : S.finT), dy = e < 120 ? 7 : e < 240 ? 3 : e < 360 ? -2 : e < 480 ? -1 : 0;
      put(size, x, dy);
      [[-6, -m.h - 2], [5, -m.h + 1], [-1, -m.h - 5], [6, -3]].forEach(([dx, dy2], i) => { const ph = ((t / 700 + i * 0.27) % 1); if (ph < 0.85) sparkle(c, x + dx, S.shelfY + dy2, ph); });
    } else {
      const x0 = Math.round(x - m.w / 2) + 1, y0 = S.shelfY - m.h + 2, w = m.w - 2, h = m.h - 2;
      for (let i = 0; i < w; i += 2) { F(c, x0 + i, y0, 1, 1, S.dash); F(c, x0 + i, y0 + h - 1, 1, 1, S.dash); }
      for (let j = 0; j < h; j += 2) { F(c, x0, y0 + j, 1, 1, S.dash); F(c, x0 + w - 1, y0 + j, 1, 1, S.dash); }
    }
  }
  /* ---------- putting the scene together: the static parts are made once per page ---------- */
  function scene() {
    const S = K1;
    if (!S.bg) {
      const bg = doc.createElement('canvas'); bg.width = AW * U; bg.height = AH * U;
      const g = bg.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, AW * U, AH * U); buildK1().draw(g); S.bg = bg;
      const fr = doc.createElement('canvas'); fr.width = AW * U; fr.height = AH * U; chairFront(S.chair, 4).draw(fr.getContext('2d')); S.front = fr;
      S.glowA = glow(18, 48, 40, '#ff8a30', 0.05, 0); S.glowB = glow(18, 48, 44, '#ff8a30', 0.05, 2);
    }
    if (!S.tint && IMG.idle && IMG.sleepy && IMG.happy) S.tint = { idle: tinted(IMG.idle, S.tintCol, S.tintA), sleepy: tinted(IMG.sleepy, S.tintCol, S.tintA), happy: tinted(IMG.happy, S.tintCol, S.tintA) };
    return S;
  }
  // st: idle (ready, nothing started), work, paused (away or resting on the bench: he dozes), fin (finished)
  function drawScene(c, t, st, f, size) {
    const S = scene(), fin = st === 'fin';
    if (fin && !S.wasFin) S.finT = t; S.wasFin = fin;
    c.clearRect(0, 0, AW * U, AH * U);
    S.mid(c, t, st);
    drawMantel(c, S, st, size, t);
    const u = S.tint ? drawUlhu(c, S, st, t) : { hop: 0 };
    c.drawImage(S.front, 0, 0);
    const r = fin ? 3 : 3 + 3.4 * (1 - f), live = st === 'work';
    const spin = live ? t / 260 : (S.spin || 0); if (live) S.spin = spin;
    const jig = live && Math.floor(t / 180) % 4 === 1 ? 1 : 0;
    if (!fin) lapPiece(c, size, f, UX + 16, UY + u.hop + 27 + (st === 'paused' ? 2 : 0), size === 'medium' ? 13 : 11);
    const hands = fin ? null : armsAndNeedles(c, st, t, u.hop);
    glasses(c, st, u.hop);
    if (fin) for (let s = 0; s < 9; s++) { F(c, 66 + s, 50 - Math.floor(s / 3), 1, 1, s % 3 ? '#c9853a' : '#f0b060'); F(c, 65 + s, 51 - Math.floor(s / 4), 1, 1, s % 3 ? '#c9853a' : '#f0b060'); }
    const top = ball(c, S.ballX, S.floorY, r, spin, jig);
    if (hands) { const sag = 6 + (live ? [0, 1, 1, 0][Math.floor(t / 300) % 4] : 0); strand(c, top[0], top[1], (top[0] + hands[0]) / 2, Math.max(top[1], hands[1]) + sag, hands[0], hands[1] + 1, YARN, '#2a5a3e'); }
    if (st === 'paused') zzz(c, t);
    if (fin) for (let i = 0; i < 3; i++) { const ph = (t / 900 + i / 3) % 1; if (ph < 0.8) { const x = UX + 6 + i * 10, y = UY - 2 - Math.floor(ph * 8); F(c, x, y, 1, 1, '#f28ca0'); F(c, x + 2, y, 1, 1, '#f28ca0'); F(c, x - 1, y + 1, 5, 1, '#f28ca0'); F(c, x, y + 2, 3, 1, '#d86a84'); F(c, x + 1, y + 3, 1, 1, '#d86a84'); } }
    drawBar(c, S, f, st, t);
  }

  /* ---------------- the vector piece, kept for the shelf list and the bench icons ---------------- */
  const KNITS = { small: { H: 60 }, medium: { H: 92 }, large: { H: 76 } };
  function knitPiece(key, f, id) { // f = 0..1; the piece hanging from the needles (top centre = 0,0)
    const K = KNITS[key], rowH = 4, vp = 'url(#uzcf-v)';
    if (key === 'medium') {
      const d = 'M0,0 V58 Q0,80 22,80 H112', L = 58 + 34.6 + 90;
      let s = `<mask id="${id}m" maskUnits="userSpaceOnUse" x="-40" y="-20" width="200" height="140"><path d="${d}" stroke="#fff" stroke-width="30" fill="none" stroke-dasharray="${(L * f).toFixed(1)} 400"/></mask>`;
      s += `<g mask="url(#${id}m)"><path d="${d}" stroke="#2c1a10" stroke-width="25" fill="none"/><path d="${d}" stroke="#2e8a64" stroke-width="22" fill="none"/><path d="${d}" stroke="#5ef2a0" stroke-width="22" fill="none" stroke-dasharray="8 8"/><path d="${d}" stroke="#ffd56a" stroke-width="22" fill="none" stroke-dasharray="3 29" stroke-dashoffset="-10"/><path d="${d}" stroke="${vp}" stroke-width="22" fill="none"/></g>`;
      if (f >= 0.999) s += '<g stroke="#ffd56a" stroke-width="1.6" stroke-linecap="round">' + [-8, -4, 0, 4, 8].map((y) => `<path d="M112,${80 + y} h7"/>`).join('') + '</g>';
      return s;
    }
    let shape, fills;
    if (key === 'small') {
      shape = 'M-14,0 H14 V36 Q14,42 20,42 H32 Q42,42 42,51 Q42,60 32,60 H-4 Q-14,60 -14,50 Z';
      fills = '<rect x="-20" y="-2" width="70" height="70" fill="#4fd394"/><rect x="-20" y="-2" width="70" height="10" fill="#2e8a64"/><rect x="-20" y="16" width="70" height="4" fill="#f3ecd2"/><rect x="-20" y="26" width="70" height="4" fill="#f3ecd2"/><path d="M-14,40 Q-14,58 -2,60 H6 V44 Q-2,44 -14,40 Z" fill="#ffd56a"/><path d="M30,42 Q44,42 42,52 Q42,60 32,60 H28 Z" fill="#ffd56a"/>';
    } else {
      shape = 'M-11,0 H11 Q12,5 18,5 L32,8 L58,40 L47,50 L33,34 V76 H-33 V34 L-47,50 L-58,40 L-32,8 L-18,5 Q-12,5 -11,0 Z';
      fills = '<rect x="-60" y="-2" width="120" height="80" fill="#8a3f72"/><rect x="-60" y="-2" width="120" height="8" fill="#5c2a4c"/><rect x="-60" y="12" width="120" height="4" fill="#f3ecd2"/><rect x="-60" y="20" width="120" height="4" fill="#5ef2a0"/><rect x="-60" y="28" width="120" height="4" fill="#f3ecd2"/><rect x="-60" y="70" width="120" height="8" fill="#5c2a4c"/><path d="M58,40 L47,50 L43,46 L54,36 Z M-58,40 L-47,50 L-43,46 L-54,36 Z" fill="#5c2a4c"/><circle cx="0" cy="51" r="10" fill="#8fdcb9"/><circle cx="-3.6" cy="50" r="2" fill="#16203a"/><circle cx="3.6" cy="50" r="2" fill="#16203a"/><path d="M-4,56 v4 M0,56 v5 M4,56 v4" stroke="#2f6b55" stroke-width="1.6" stroke-linecap="round"/><path d="M0,41 q-1,-3 1,-5" stroke="#3f8a57" stroke-width="1.4" fill="none"/>';
    }
    const tot = Math.ceil(K.H / rowH), done = f * tot, rows = Math.floor(done), frac = done - rows;
    let rev = `<rect x="-80" y="-4" width="160" height="${rows * rowH + 4}" fill="#fff"/>`;
    if (frac > 0 && rows < tot) rev += `<rect x="-80" y="${rows * rowH}" width="${(160 * frac).toFixed(1)}" height="${rowH + 0.3}" fill="#fff"/>`;
    return `<clipPath id="${id}c"><path d="${shape}"/></clipPath><mask id="${id}m" maskUnits="userSpaceOnUse" x="-80" y="-10" width="160" height="100">${rev}</mask>
     <g mask="url(#${id}m)"><g clip-path="url(#${id}c)">${fills}<rect x="-60" y="0" width="120" height="80" fill="${vp}"/></g><path d="${shape}" fill="none" stroke="#2c1a10" stroke-width="1.4"/></g>`;
  }

  /* ---------------- small pictures of a finished piece (shelf and picker) ---------------- */
  const KBOX = { small: [-16, -2, 60, 64], medium: [-13, -2, 138, 96], large: [-60, -2, 120, 80] };
  function pieceIcon(craft, size, cls) {
    return `<svg class="${cls}" viewBox="${KBOX[size].join(' ')}" aria-hidden="true">${knitPiece(size, 1, 'uzcf-i' + (uid++))}</svg>`;
  }
  // one plank holds four pieces; each sits on the plank, its name cut into the front edge
  function shelfSvg(list, popFirst) {
    if (!list.length) return '<svg class="uzcf-plank" viewBox="0 0 380 104"><rect x="6" y="4" width="368" height="76" rx="10" fill="#0b1a17" stroke="#26362f"/><rect x="0" y="78" width="380" height="18" fill="#5d6a64"/><rect x="0" y="78" width="380" height="2" fill="#8a9993"/><rect x="152" y="14" width="76" height="60" rx="8" fill="none" stroke="#5ef2a066" stroke-dasharray="4 4"/><text x="190" y="48" text-anchor="middle" font-size="11" fill="#9fb1a8">first piece</text></svg>';
    let out = '';
    for (let i = 0; i < list.length; i += 4) {
      let s = '<rect x="6" y="4" width="368" height="76" rx="10" fill="#0b1a17" stroke="#26362f"/><rect x="0" y="78" width="380" height="18" fill="#5d6a64"/><rect x="0" y="78" width="380" height="2" fill="#8a9993"/>';
      list.slice(i, i + 4).forEach((x, j) => {
        const cx = 50 + j * 93, craft = 'knit', size = MIN[x.size] ? x.size : 'small', first = popFirst && i + j === 0;
        let art;
        { const fit = { small: [0.82, -52, -10], medium: [0.5, -48, -30], large: [0.62, -50, 0] }[size]; art = `<g transform="translate(${cx + fit[2]},${78 + fit[1]}) scale(${fit[0]})">${knitPiece(size, 1, 'uzcf-sh' + (uid++))}</g>`; }
        s += `<g${first ? ' class="uzcf-pop"' : ''}><title>${esc(an(x.piece || PIECE[craft][size]))}, ${Number(x.minutes) || MIN[size]} min, ${esc(x.day || '')}</title>${art}</g>`;
        s += `<text x="${cx}" y="91" text-anchor="middle" font-size="10" fill="#d6ddd9" font-weight="700">${esc(x.piece || PIECE[craft][size])}</text>`;
        if (first) s += `<path class="uzcf-glint" d="M${cx + 26},22 l1.5,-4 l1.5,4 l4,1.5 l-4,1.5 l-1.5,4 l-1.5,-4 l-4,-1.5 Z" fill="#ffd56a"/>`;
      });
      out += `<svg class="uzcf-plank" viewBox="0 0 380 100">${s}</svg>`;
    }
    return out;
  }

  /* ---------------- the screen ---------------- */
  const CSS = `
.uzcf{color:#e8e1cf;font:14px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',system-ui,sans-serif;padding:0 0 18px;max-width:420px;margin:0 auto}
.uzcf-defs{position:absolute;width:0;height:0;overflow:hidden}
.uzcf-sw{position:relative;border:1px solid #1b2823;border-radius:12px;overflow:hidden;margin:4px 10px 0;background:#000;aspect-ratio:192/184}
.uzcf-sw canvas{position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
.uzcf-plq{position:absolute;left:5%;right:5%;top:91.6%;height:7.6%;display:flex;align-items:center;justify-content:space-between;gap:8px;font:500 12.5px 'Pixelify Sans',monospace;white-space:nowrap;pointer-events:none;color:#ffe2a0}
.uzcf-plq span{overflow:hidden;text-overflow:ellipsis}
.uzcf-plq .uzcf-tl{font-weight:700;flex:none;color:#fff3c8}
.uzcf-pz{display:none;position:absolute;right:8px;top:8px;font:700 11px 'Pixelify Sans',monospace;letter-spacing:.05em;color:#bfe0ff;background:#0f1a24e8;border:2px solid #5aa7ff;padding:4px 8px;text-align:center;line-height:1.3}
.uzcf-paused .uzcf-pz{display:block}
.uzcf-panel{margin:10px 10px 0}
.uzcf-lab{font:700 12px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#c9a560;margin:12px 2px 6px}
.uzcf-row{display:flex;gap:8px}
.uzcf-row button{flex:1;min-width:0}
.uzcf button{font:700 14px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}
.uzcf-ico{width:38px;height:38px;flex:none}
.uzcf-size{padding:8px 4px 7px;border-radius:14px;border:1px solid #6b5630;background:#1a140a;color:#ffe2a0;text-align:center;line-height:1.15}
.uzcf-size.on{background:#c9a560;color:#1a140a;border-color:#c9a560}
.uzcf-size b{display:block;font-size:15px}.uzcf-size span{display:block;font-size:12px;font-weight:700;opacity:.85}.uzcf-size i{display:block;font-style:normal;font-size:11.5px;font-weight:400;margin-top:2px}
.uzcf-go{display:block;width:100%;margin:14px 0 0;padding:13px 14px;border-radius:999px;border:0;background:#5ef2a0;color:#04120b;font-size:16px!important}
.uzcf-go:active{transform:translateY(1px)}
.uzcf-soft{display:block;width:100%;margin:10px 0 0;padding:11px 14px;border-radius:999px;border:1px solid #5aa7ff;background:#0f1a24;color:#bfe0ff}
.uzcf-hint{color:#9fb1a8;font-size:13px;line-height:1.4;margin:10px 2px 0}
.uzcf-note{color:#ffe2a0;font-size:13px;line-height:1.4;margin:10px 2px 0;padding:8px 10px;border:1px solid #6b5630;border-radius:10px;background:#1a140a}
.uzcf-bench{display:flex;align-items:center;gap:8px;padding:7px 8px;margin:6px 0 0;border:1px dashed #2f443b;border-radius:12px;background:#08110e}
.uzcf-bench .uzcf-ico{width:30px;height:30px;opacity:.75}
.uzcf-bench span{flex:1;color:#cfd8d3;font-size:13px;line-height:1.25}
.uzcf-bench button{padding:7px 11px;border-radius:999px;border:1px solid #5ef2a0;background:#0f2a1f;color:#bff7e4;font-size:12.5px}
.uzcf-shh{display:flex;align-items:baseline;gap:8px;font:500 22px 'Grenze Gotisch',serif;color:#c9a560;margin:18px 12px 4px}
.uzcf-shh small{font:400 12.5px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',sans-serif;color:#9fb1a8}
.uzcf-shelf{margin:0 10px}
.uzcf-plank{display:block;width:100%;height:auto;margin:0 0 6px}
@keyframes uzcf-sp{0%,100%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1)}}
.uzcf-pop{animation:uzcf-pop .9s cubic-bezier(.3,1.6,.5,1) both;transform-box:fill-box;transform-origin:50% 100%}
@keyframes uzcf-pop{from{transform:translateY(-40px) scale(.2);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
.uzcf-glint{animation:uzcf-sp 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
`;
  const PIXFONT = 'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&display=swap';
  function css() {
    if (doc.getElementById('uzcf-css')) return;
    const st = doc.createElement('style'); st.id = 'uzcf-css'; st.textContent = CSS; doc.head.appendChild(st);
    // the pixel font for the plaque (free Google font); monospace stands in if it cannot load
    if (!doc.querySelector('link[href*="Pixelify+Sans"]')) { const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = PIXFONT; doc.head.appendChild(l); }
  }
  const DEFS = '<svg class="uzcf-defs" aria-hidden="true" focusable="false"><defs>' +
    '<pattern id="uzcf-v" width="6" height="4" patternUnits="userSpaceOnUse"><path d="M.6,.3 L3,3.6 L5.4,.3" fill="none" stroke="#00000055" stroke-width="1"/><path d="M1.1,.4 L3,2.7" stroke="#ffffff38" stroke-width=".8"/></pattern>' +
    '</defs></svg>';

  let V = null;   // the open screen: { el, state, p, size, panelHtml, shelfKey, raf, lastF, fg, ... }
  function state() {
    const c = ST.cur;
    if (!c) return 'idle';
    if (c.done) return 'fin';
    return (!c.run || doc.hidden) ? 'paused' : 'work';
  }
  function minsLeft(c) { return Math.max(1, Math.ceil((total(c) - (Number(c.el) || 0)) / 60)); }
  function panelHtml(st) {
    const c = ST.cur, pk = ST.pick;
    const benchList = (st === 'idle' || st === 'paused') && ST.bench.length ? '<div class="uzcf-lab">Waiting on the bench</div>' + ST.bench.map((b, i) =>
      `<div class="uzcf-bench">${pieceIcon(b.craft, b.size, 'uzcf-ico')}<span>${esc(PIECE[b.craft][b.size])}, ${Math.floor((Number(b.el) || 0) / 60)} of ${MIN[b.size]} min done</span><button data-f="pick" data-v="${i}">Pick it up</button></div>`).join('') : '';
    const note = NOTE ? `<p class="uzcf-note">${esc(NOTE)}</p>` : '';
    if (st === 'idle') {
      return '<div class="uzcf-lab">How big is your task?</div><div class="uzcf-row">' +
        SIZES.map((s) => `<button class="uzcf-size${pk.size === s ? ' on' : ''}" data-f="size" data-v="${s}" aria-pressed="${pk.size === s}"><b>${s[0].toUpperCase() + s.slice(1)}</b><span>${MIN[s]} min</span><i>${PIECE[pk.craft][s]}</i></button>`).join('') + '</div>' +
        `<button class="uzcf-go" data-f="start">Start: ${MIN[pk.size]} min, ${esc(an(PIECE[pk.craft][pk.size]))}</button>` +
        '<p class="uzcf-hint">Ulhu works while you work. If you leave the app he waits for you, and nothing is lost.</p>' + benchList + note;
    }
    if (st === 'work') return '<button class="uzcf-soft" data-f="stop">Stop for now</button><p class="uzcf-hint">Stopping keeps the piece on his bench, half made. You can carry on later. Leaving the app pauses it too.</p>' + note;
    if (st === 'paused') {
      if (c.run) return '<p class="uzcf-hint">Paused while you were away. It carries on now you are back.</p>' + note;
      return '<button class="uzcf-go" data-f="resume">Carry on</button><button class="uzcf-soft" data-f="aside">Leave it on the bench, start something else</button>' +
        `<p class="uzcf-hint">${esc(an(PIECE[c.craft][c.size]))[0].toUpperCase() + esc(an(PIECE[c.craft][c.size])).slice(1)}, ${Math.floor((Number(c.el) || 0) / 60)} of ${MIN[c.size]} min done. It stays exactly as it is until you come back to it.</p>` + benchList + note;
    }
    return `<button class="uzcf-go" data-f="again">Make another</button><p class="uzcf-hint">${ST.owed.length ? 'Putting it on the shelf...' : 'It is on the shelf below.'}</p>` + note;
  }
  // the little wooden plaque on the skirting board: the piece on the left, the time on the right
  function plaqueText(st, c, craft, size) {
    const name = an(PIECE[craft][size]);
    if (st === 'fin') return [MIN[size] + ' min of focus. On the shelf.', 'Done!'];
    if (st === 'idle') return ['Ready to knit ' + name, MIN[size] + ' min'];
    const left = minsLeft(c) + ' min left';
    if (st === 'paused') return [c.run ? 'Paused while you are away. Nothing lost.' : 'Resting on the bench. Nothing lost.', left];
    return ['Knitting ' + name, left];
  }
  function paint(full) {
    if (!V || !V.el.isConnected) return;
    const st = state(), c = ST.cur, craft = c ? c.craft : ST.pick.craft, size = c ? c.size : ST.pick.size;
    V.p = c ? clamp((Number(c.el) || 0) / total(c) * 100, 0, 100) : 0;
    if (st !== V.state || size !== V.size) { V.wrap.className = 'uzcf-sw uzcf-' + st; V.state = st; V.size = size; V.lastF = -1e9; }
    const pq = plaqueText(st, c, craft, size);
    if (V.tx.textContent !== pq[0]) V.tx.textContent = pq[0];
    if (V.tl.textContent !== pq[1]) V.tl.textContent = pq[1];
    V.pz.innerHTML = c && c.run ? 'PAUSED<br>nothing lost' : 'RESTING<br>nothing lost';
    const ph = panelHtml(st);
    if (ph !== V.panelHtml) { V.panel.innerHTML = ph; V.panelHtml = ph; }
    const sk = JSON.stringify([SHELF, SHELF_ERR, ST.owed.length]);
    if (full || sk !== V.shelfKey) {
      V.shelfKey = sk; V.lastF = -1e9;
      const n = SHELF ? SHELF.length : 0;
      V.shh.innerHTML = 'The shelf' + (SHELF ? `<small>${n ? n + (n === 1 ? ' piece' : ' pieces') + (n >= 40 ? ', the newest 40' : '') : 'empty so far'}</small>` : '');
      V.shelf.innerHTML = SHELF_ERR ? `<p class="uzcf-hint">${esc(SHELF_ERR)}</p>` : SHELF ? shelfSvg(SHELF, NEWEST) : '<p class="uzcf-hint">Opening the shelf...</p>';
    }
    wake();
  }
  // the moving parts are redrawn about 14 times a second, only while the Focus tab is on screen
  function shown() { return !!(V && V.el.isConnected && !doc.hidden && V.el.getClientRects().length); }
  function frame(t) {
    if (!V) return;
    V.raf = 0;
    if (!shown()) return;   // the tab is shut or hidden: stop; paint() starts it again when it is back
    if (t - V.lastF > 70) { V.lastF = t; drawScene(V.fg, t, V.state, V.p / 100, V.size); }
    V.raf = root.requestAnimationFrame(frame);
  }
  function wake() { if (V && !V.raf && shown()) V.raf = root.requestAnimationFrame(frame); }
  function act(f, v) {
    const c = ST.cur;
    if (f === 'size' && MIN[v]) ST.pick.size = v;
    else if (f === 'start') { ST.cur = { craft: ST.pick.craft, size: ST.pick.size, el: 0, run: true, done: false, day: today() }; LAST = 0; NEWEST = false; }
    else if (f === 'stop' && c) { count(true); c.run = false; LAST = 0; }
    else if (f === 'resume' && c) { c.run = true; LAST = 0; }
    else if (f === 'aside' && c && !c.done) { ST.bench.unshift({ craft: c.craft, size: c.size, el: c.el, day: c.day }); ST.pick = { craft: c.craft, size: c.size }; ST.cur = null; }
    else if (f === 'pick') {
      const b = ST.bench.splice(Number(v), 1)[0]; if (!b) return;
      if (c && !c.done) ST.bench.unshift({ craft: c.craft, size: c.size, el: c.el, day: c.day });
      ST.cur = { craft: b.craft, size: b.size, el: Number(b.el) || 0, run: true, done: false, day: b.day || today() }; LAST = 0; NEWEST = false;
    } else if (f === 'again') { if (c) ST.pick = { craft: c.craft, size: c.size }; ST.cur = null; NEWEST = false; }
    else return;
    store(); paint();
  }
  function render(el, X) {
    XX = X || XX; css();
    el.innerHTML = '<div class="uzcf">' + DEFS +
      '<div class="uzcf-sw" role="img" aria-label="Ulhu knitting by the fire"><canvas class="uzcf-bg" width="' + AW * U + '" height="' + AH * U + '"></canvas><canvas class="uzcf-fg" width="' + AW * U + '" height="' + AH * U + '"></canvas>' +
      '<div class="uzcf-plq"><span class="uzcf-tx"></span><span class="uzcf-tl"></span></div><div class="uzcf-pz"></div></div>' +
      '<div class="uzcf-panel"></div><div class="uzcf-shh">The shelf</div><div class="uzcf-shelf"></div></div>';
    if (V && V.raf) root.cancelAnimationFrame(V.raf);
    const fg = el.querySelector('.uzcf-fg').getContext('2d'); fg.imageSmoothingEnabled = false;
    V = { el, state: '', size: '', p: 0, panelHtml: '', shelfKey: '', raf: 0, lastF: -1e9, fg,
      wrap: el.querySelector('.uzcf-sw'), tx: el.querySelector('.uzcf-tx'), tl: el.querySelector('.uzcf-tl'), pz: el.querySelector('.uzcf-pz'),
      panel: el.querySelector('.uzcf-panel'), shh: el.querySelector('.uzcf-shh'), shelf: el.querySelector('.uzcf-shelf') };
    el.querySelector('.uzcf-bg').getContext('2d').drawImage(scene().bg, 0, 0);   // the room, drawn once
    el.querySelector('.uzcf').addEventListener('click', function (e) {
      const b = e.target.closest && e.target.closest('button[data-f]'); if (!b) return;
      act(b.getAttribute('data-f'), b.getAttribute('data-v'));
    });
    paint(true); loadShelf(); saveOwed();
    loadImgs().then(function () { if (V) V.lastF = -1e9; });   // Ulhu appears as soon as his sprite has loaded
  }
  api.render = render;
  root.UZCOMP_FOCUS = api;
})(typeof window !== 'undefined' ? window : null);