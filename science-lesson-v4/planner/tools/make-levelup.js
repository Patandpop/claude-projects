// Builds planner/game-levelup.js, the level-up moment (1U.11, Patryk's pick 30 Oct: LU-X2 "The Sky Answers"), from
// replica/design/mockups/levelup4/index.src.html (the helpers, the shared Breach and drawX2, copied as they are).
// Run: node planner/tools/make-levelup.js  (then the game checks)
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../replica/design/mockups/levelup4/index.src.html'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('the mock-up changed, look for: ' + a); return src.slice(i, j); };
const shared = cut('/* helpers */', '/* ============ LU-X1');
const x2 = cut('/* ============ LU-X2', '/* ============ LU-X3');
const out = `/* The level-up moment (1U.11, Patryk's pick 30 Oct: LU-X2 "The Sky Answers"): up from the deep, stars rush in from
   every edge, aurora curtains fall, the new number pulses three times, and the heal comes last as a small corner bar.
   MADE BY planner/tools/make-levelup.js from replica/design/mockups/levelup4/index.src.html; change those, not this file.
   LEVELUP.play(host, level) -> Promise (resolves when it is over). host = the Ulhu box (position relative). A tap ends it
   early. Reduced motion: the last frame shows for a moment. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.LEVELUP) return;
const W = 240, H = 176, END = 5700;
let IMG = null;
const ok = (im) => im && im.complete && im.naturalWidth > 0;
const imgs = () => IMG || (IMG = (() => { const A = (window.ULHU_ART || {}).b16 || {}, o = {}; for (const k in A) { o[k] = new Image(); o[k].src = A[k]; } return o; })());
// the scene is made for one level number (the mock-up's LEVEL)
function scene(LEVEL) {
  const IMG = imgs();
${shared}
${x2}
  return drawX2;
}
const CSS = '.lu-wrap{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:#02070a;cursor:pointer}' +
  '.lu-wrap canvas{display:block;width:100%;max-height:100%;aspect-ratio:240/176;object-fit:contain;image-rendering:pixelated;image-rendering:crisp-edges}';
function css() { if (document.getElementById('lu-css')) return; const s = document.createElement('style'); s.id = 'lu-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let busy = null;
function play(host, level) {
  if (!host || busy) return busy || Promise.resolve(); css();
  const draw = scene(Math.max(1, level | 0)), g = document.createElement('div'); g.className = 'lu-wrap'; g.setAttribute('role', 'status'); g.setAttribute('aria-label', 'Level ' + level);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; g.appendChild(cv); host.appendChild(g);
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const paint = (t, a) => { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.clearRect(0, 0, W, H); draw(c, t, a); };
  return (busy = new Promise((res) => {
    let stop = false; const end = () => { if (stop) return; stop = true;
      g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).onfinish = () => { g.remove(); busy = null; res(); }; };
    g.addEventListener('click', end);
    if (RM()) { paint(END, END); return setTimeout(end, 1800); }
    const t0 = performance.now();
    (function frame(now) { if (stop || !g.isConnected) return; const t = now - t0; paint(Math.min(t, END), now); if (t >= END + 500) return end(); requestAnimationFrame(frame); })(t0);
  }));
}
window.LEVELUP = { play };
})();
`;
fs.writeFileSync(path.join(__dirname, '../game-levelup.js'), out);
console.log('wrote game-levelup.js', out.length, 'bytes; em dashes:', (out.match(/—/g) || []).length);
