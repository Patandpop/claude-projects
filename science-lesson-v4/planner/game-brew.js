/* The loading screen (1U.12, Patryk's pick 29 Oct: L3a "The stir", Ulhu stirring the cauldron, improved fire).
   MADE BY planner/tools/make-brew.js from replica/design/mockups/loading/index.src.html; change those, not this file.
   BREW.html(caption) -> the scene (a 90 x 64 pixel canvas drawn big) with its caption and three ticking dots;
   BREW.run(root) starts every scene inside root. Each stops by itself once it leaves the page. Reduced motion: one still frame. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.BREW) return;
  const TAU = Math.PI * 2, W = 90, H = 64, OL = '#120b14';
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  // five rune glyphs (5 x 5), the same family as his currency
  const RUNE = [['..#..', '.###.', '#.#.#', '..#..', '..#..'], ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
    ['#.#.#', '#.#.#', '.###.', '..#..', '.#.#.'], ['###..', '..#..', '..###', '..#..', '###..'], ['..#..', '.#.#.', '#####', '.#.#.', '..#..']];
  let c; // the context being drawn
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  const ell = (cx, cy, rx, ry, col) => { c.fillStyle = col; for (let y = Math.floor(cy - ry); y <= cy + ry; y++) { const d = 1 - ((y + .5 - cy) / ry) ** 2; if (d < 0) continue; const hw = rx * Math.sqrt(d); c.fillRect(Math.round(cx - hw), y, Math.round(hw * 2) || 1, 1); } };
  const glyph = (x, y, i, col, halo) => { const g = RUNE[i % RUNE.length]; if (halo) { c.fillStyle = halo; for (let r = 0; r < 5; r++) for (let k = 0; k < 5; k++) if (g[r][k] === '#') c.fillRect(Math.round(x) + k - 1, Math.round(y) + r - 1, 3, 3); } c.fillStyle = col; for (let r = 0; r < 5; r++) for (let k = 0; k < 5; k++) if (g[r][k] === '#') c.fillRect(Math.round(x) + k, Math.round(y) + r, 1, 1); };
  const sea = (top) => { for (let y = 0; y < H; y++) R(0, y, W, 1, y < top ? (y % 9 === 4 ? '#0c1a17' : '#08120f') : (y === top ? '#1d4a46' : '#0c1c18')); };
  const ease = (p) => p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;

  const S = {
    potA(t, A) {
      sea(60); const a = t * TAU / 2.4, fl = .5 + Math.sin(t * 9) * .3 + Math.sin(t * 23) * .2;
      ell(45, 61, 30 + fl * 3, 5, 'rgba(255,120,40,.12)'); ell(45, 61, 20 + fl * 2, 3.5, 'rgba(255,170,60,.18)'); // firelight on the floor
      c.save(); c.translate(0, -6); // pot and Ulhu sit higher so the fire shows
      for (let j = 0; j < 3; j++) { const q = (t / 3 + j / 3) % 1; c.globalAlpha = 1 - q; R(38 + j * 7 + Math.sin(q * 7 + j) * 3, 28 - q * 26, 2, 2, '#4a6a62'); c.globalAlpha = 1; }
      c.drawImage(A.H, 29 + Math.round(Math.cos(a) * 1.5), 8);
      const lx = 45 + Math.cos(a) * 9, ly = 37 + Math.sin(a) * 1.5;
      R(31, 56, 4, 6, OL); R(55, 56, 4, 6, OL);
      ell(45, 47, 21, 12, OL); ell(45, 47, 20, 11, '#2a2a34'); ell(40, 44, 10, 6, '#3a3a48');
      ell(45, 55, 17, 3.5, 'rgba(255,80,20,' + (.30 + fl * .18).toFixed(2) + ')'); ell(45, 57, 11, 1.6, 'rgba(255,170,60,' + (.35 + fl * .25).toFixed(2) + ')'); // fire lighting the belly
      ell(45, 36, 22, 4.5, OL); ell(45, 36, 21, 3.5, '#4a4a5a'); ell(45, 36.5, 18, 2.6, '#1d8a52'); ell(45, 36, 16, 1.6, '#2fbf7a');
      for (let k = 0; k < 4; k++) { const q = (t / 1.3 + k * .27) % 1, bx = 33 + ((k * 37) % 24); if (q < .6) R(bx, 36 - q * 3, 2, 2, '#a8ffd0'); else if (q < .75) { R(bx - 1, 34, 1, 1, '#d8ffe8'); R(bx + 2, 34, 1, 1, '#d8ffe8'); } }
      for (let i = 0; i < 20; i++) { const u = i / 19; R(lx + (u * (lx > 45 ? 6 : -6)), ly - u * 22, 2, 1, '#9a6a3a'); }
      const hx = lx + (lx > 45 ? 6 : -6), hy = ly - 22; R(hx - 1, hy - 1, 3, 3, '#78be96'); R(hx, hy, 2, 2, '#aae2be');
      c.restore();
      // the fire in front: crossed logs, layered flame tongues (deep red, orange, gold, white-hot core) that lick the pot, embers rising
      R(30, 60, 14, 3, OL); R(31, 61, 12, 1, '#6a4428'); R(46, 60, 14, 3, OL); R(47, 61, 12, 1, '#7a5030'); R(38, 61, 14, 2, OL); R(39, 61, 12, 1, '#5a3a20');
      const tongue = (x, h, w, col) => { for (let y = 0; y < h; y++) { const f = y / h, hw = w * (1 - f) ** .8; R(x - hw + Math.sin(t * 14 + y * .8 + x * .7) * f * 1.6, 60 - y, Math.max(1, Math.round(hw * 2)), 1, col); } };
      for (let k = 0; k < 8; k++) { const x = 32 + k * 3.7, n = Math.sin(t * 10 + k * 1.7) * .5 + Math.sin(t * 17 + k * 3.1) * .5, h = 8 + n * 3.5 + (k === 3 || k === 4 ? 4 : k === 0 || k === 7 ? -2 : 1);
        tongue(x, h, 2.6, '#a82a26'); tongue(x, h * .8, 2, '#e85a28'); tongue(x, h * .58, 1.4, '#ffb03a'); tongue(x, h * .34, .9, '#ffe27a'); tongue(x, h * .14, .5, '#fff8e0'); }
      for (let k = 0; k < 7; k++) { const q = (t / 1.6 + k / 7) % 1, ex = 30 + ((k * 41) % 30) + Math.sin(q * 8 + k) * 4, ey = 56 - q * 30; c.globalAlpha = 1 - q; R(ex, ey, 1, 1, q < .35 ? '#fff3c4' : q < .7 ? '#ffb03a' : '#e85a28'); c.globalAlpha = 1; }
    },
  };
  const CSS = '.uz-brew{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;height:100%;min-height:220px;padding:16px}' +
    '.uz-brew canvas{display:block;width:min(100%,360px);aspect-ratio:90/64;image-rendering:pixelated;image-rendering:crisp-edges;border-radius:6px;background:#050807}' +
    '.uz-brew .cap{font:500 20px/1 var(--g,Georgia,serif);color:#cfe9da;text-align:center;padding:10px 0 4px;letter-spacing:.03em}' +
    '.uz-brew .cap i{font-style:normal;display:inline-block;width:1.2em;text-align:left}.uz-brew .cap i:after{content:"";animation:brewdots 1.6s steps(4) infinite}' +
    '@keyframes brewdots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}@media (prefers-reduced-motion:reduce){.uz-brew .cap i:after{animation:none;content:"..."}}' +
    '.uz-brew.sm{min-height:0;padding:8px 0}.uz-brew.sm canvas{width:min(100%,220px)}.uz-brew.sm .cap{font-size:17px}';
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function css() { if (document.getElementById('brew-css')) return; const s = document.createElement('style'); s.id = 'brew-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
  let ART = null;
  const art = () => ART || (ART = new Promise((res) => { const A = (window.ULHU_ART || {}).b16 || {}; let n = 2; const H = {};
    [['U', A.idle], ['H', A.happy]].forEach(([k, s]) => { const i = new Image(); i.onload = i.onerror = () => { H[k] = i; if (--n === 0) res(H); }; i.src = s || ''; }); }));
  const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function html(caption, small) { css(); return '<div class="uz-brew' + (small ? ' sm' : '') + '" role="status"><canvas data-brew width="90" height="64" aria-hidden="true"></canvas><div class="cap">' + esc(caption || 'Something is brewing') + '<i></i></div></div>'; }
  function run(root) {
    const cvs = [...(root || document).querySelectorAll('canvas[data-brew]:not([data-on])')]; if (!cvs.length) return;
    cvs.forEach((cv) => cv.setAttribute('data-on', '1'));
    art().then((A) => { const list = cvs.map((cv) => { const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; return { cv, x }; }), t0 = performance.now();
      // only scenes on screen are drawn: one waiting in a pane off to the side costs nothing (30 Oct)
      const seen = (cv) => { if (!cv.offsetWidth) return false; const r = cv.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; };
      const draw = (t, all) => { for (const s of list) { if (!all && !seen(s.cv)) continue; c = s.x; c.clearRect(0, 0, W, H); S.potA(t, A); } };
      if (RM()) return draw(1.2, true);
      (function frame(now) { if (!list.some((s) => s.cv.isConnected)) return; draw((now - t0) / 1000); requestAnimationFrame(frame); })(t0); });
  }
  window.BREW = { html, run };
})();
