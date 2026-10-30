// Builds planner/game-brew.js, the loading screen (1U.12, Patryk's pick 29 Oct: L3a, Ulhu stirring the cauldron with the
// improved fire), from replica/design/mockups/loading/index.src.html (function potA and its helpers, copied as they are).
// Run: node planner/tools/make-brew.js  (then the game checks)
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../replica/design/mockups/loading/index.src.html'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('the mock-up changed, look for: ' + a); return src.slice(i, j); };
const helpers = cut('  const TAU = Math.PI * 2', '\n  const S = {');
const potA = cut('    potA(t, A) {', '\n    // L3b');
const out = `/* The loading screen (1U.12, Patryk's pick 29 Oct: L3a "The stir", Ulhu stirring the cauldron, improved fire).
   MADE BY planner/tools/make-brew.js from replica/design/mockups/loading/index.src.html; change those, not this file.
   BREW.html(caption) -> the scene (a 90 x 64 pixel canvas drawn big) with its caption and three ticking dots;
   BREW.run(root) starts every scene inside root. Each stops by itself once it leaves the page. Reduced motion: one still frame. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.BREW) return;
${helpers}
  const S = {
${potA}
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
`;
fs.writeFileSync(path.join(__dirname, '../game-brew.js'), out);
console.log('wrote game-brew.js', out.length, 'bytes; em dashes:', (out.match(/—/g) || []).length);
