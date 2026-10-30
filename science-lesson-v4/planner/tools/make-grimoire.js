// Builds planner/game-grimoire.js, the way into Vespers (1U.10, Patryk's picks BG1 candlelit desk, T1 iron-bound tome,
// T4 chains, replica/design/mockups/grimoire/index.html): the book strains at its chains, they snap, it flies open, the
// circle on its pages lights ring by ring, a portal opens and two tentacles reach up and drag you in. The drawing code is
// cut from the mock-up as it is; only the page around it (the five rooms switch, the sample sheet) is left behind.
// Run: node planner/tools/make-grimoire.js  (then the game checks)
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../replica/design/mockups/grimoire/index.html'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('the Grimoire mock-up changed, look for: ' + a); return src.slice(i, j); };
const one = (s, a, b) => { if (s.split(a).length !== 2) throw new Error('the Grimoire mock-up changed, look for: ' + a); return s.replace(a, b); };
let pix = cut('/* ================= pixel drawing ================= */', '/* ================= five rooms ================= */');
pix = one(pix, "const cv = $('#pix'), g = cv.getContext('2d'); let W = 130, H = 240;", 'let g = null, W = 130, H = 240;');
const bg1 = cut('BG.BG1 = {', 'const RUNES');
const seq = cut('/* ================= the T4 sequence on the T1 tome ================= */', '/* ================= loop ================= */');
const out = `/* The Grimoire: the way into Vespers (1U.10, Patryk's picks BG1 candlelit desk, T1 iron-bound tome, T4 chains).
   MADE BY planner/tools/make-grimoire.js from replica/design/mockups/grimoire/index.html; change those, not this file.
   The book lies chained on the desk between two candles; the chains strain and snap, the cover flies open, the circle on
   its pages lights ring by ring, a portal opens in the middle and two Ulhu-green tentacles reach up and drag you in, then
   a green flash. All in chunky pixels, one small canvas.
   GRIM.play(host) -> Promise, resolved as the flash peaks (open the Vespers sheet then). host = the Ulhu box (position
   relative). A tap skips to the end. Reduced motion: no animation, it resolves at once. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.GRIM) return;
const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let phase = 'play';
const cur = 'BG1';
${pix}
const BG = {};
${bg1}
${seq}
const CSS = '.gr-wrap{position:absolute;inset:0;z-index:60;overflow:hidden;background:#030404;cursor:pointer;touch-action:manipulation}' +
  '.gr-scene{position:absolute;inset:0;transform-origin:50% 50%}.gr-scene canvas{position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges}' +
  '.gr-flash{position:absolute;inset:0;background:#5ef2a0;opacity:0;pointer-events:none}';
function css() { if (document.getElementById('grim-css')) return; const s = document.createElement('style'); s.id = 'grim-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
let busy = null;
function play(host) {
  if (busy) return busy;
  if (RM() || !host) return Promise.resolve();
  css();
  const wrap = document.createElement('div'); wrap.className = 'gr-wrap'; wrap.setAttribute('aria-label', 'The Grimoire opens');
  wrap.innerHTML = '<div class="gr-scene"><canvas aria-hidden="true"></canvas></div><div class="gr-flash"></div>';
  host.appendChild(wrap);
  const cv = wrap.querySelector('canvas'), scene = wrap.querySelector('.gr-scene'), flash = wrap.querySelector('.gr-flash'), r = wrap.getBoundingClientRect();
  W = Math.max(60, R(r.width / 3)); H = Math.max(100, R(r.height / 3)); cv.width = W; cv.height = H; g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  phase = 'play';
  const bw = Math.min(54, R(W * .42)), bh = R(bw * 1.32); snapBits(R(W / 2), R(H * .5), bw, bh);
  const D = DUR * 1000, t0 = performance.now() / 1000, anims = [];
  anims.push(scene.animate([{ transform: 'none', offset: 0 }, { transform: 'none', offset: 2.45 / DUR }, { transform: 'scale(.8) translateY(-4%)', offset: 2.8 / DUR, easing: 'cubic-bezier(.6,0,.9,.4)' }, { transform: 'scale(6) translateY(0)' }], { duration: D, fill: 'forwards' }));
  anims.push(flash.animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: 2.85 / DUR }, { opacity: 1 }], { duration: D, fill: 'forwards' }));
  let raf = 0, last = '';
  const loop = (now) => { raf = requestAnimationFrame(loop); const ts = now / 1000, pt = Math.floor((ts - t0) * 24) / 24; if ('p' + pt === last) return; last = 'p' + pt; draw(ts, Math.min(pt, DUR)); };
  raf = requestAnimationFrame(loop);
  busy = new Promise((res) => {
    let over = false;
    const end = () => { if (over) return; over = true; clearTimeout(tm); cancelAnimationFrame(raf); res();
      // the flash fades off the sheet that has just opened under it
      wrap.style.pointerEvents = 'none'; scene.style.visibility = 'hidden'; anims.forEach((a) => a.cancel()); flash.style.opacity = 1;
      flash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' }).finished.then(() => wrap.remove(), () => wrap.remove()); busy = null; };
    const tm = setTimeout(end, D - 60);
    wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); end(); });
    wrap.addEventListener('click', (e) => { e.stopPropagation(); });
  });
  return busy;
}
window.GRIM = { play };
})();
`;
fs.writeFileSync(path.join(__dirname, '../game-grimoire.js'), out);
console.log('wrote game-grimoire.js', out.length, 'bytes; em dashes:', (out.match(/—/g) || []).length);
