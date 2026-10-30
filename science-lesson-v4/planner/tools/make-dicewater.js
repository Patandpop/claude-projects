// Builds planner/game-dicewater.js, the end of the dice game (1U.6, round three, test default D3 "Low and close" with the
// losing word UNDONE, replica/design/mockups/dicewater2/): seen through Ulhu's own eyes, low at the table, Squall (or
// whichever keeper you play) across it and Ulhu's tentacles on the near edge. On the last reveal every die is on the
// table; the wave towers over the keeper's side, crashes down over the WHOLE table, and when it slides back the loser's
// dice are gone and the winner's stand there wet. Then one olden word: VANQUISHT for a win, UNDONE for a loss.
// The drawing is cut from the mock-up as it is; only its fixed sample hands are swapped for the real dice.
// Run: node planner/tools/make-dicewater.js  (then the game checks)
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../replica/design/mockups/dicewater2/index.src.html'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('the dice mock-up changed, look for: ' + a); return src.slice(i, j); };
const one = (s, a, b) => { if (s.split(a).length !== 2) throw new Error('the dice mock-up changed, look for: ' + a); return s.split(a).join(b); };
const pix = cut('// ---------- pixel helpers ----------', '// ---------- the top strip');
let room = cut('// ---------- the grotto wall behind the table', '// ---------- the three ways ----------');
room = one(room, "UZDEN.portrait('curio', frame)", 'window.UZDEN.portrait(KEEP, frame)');
const scn = cut('const SCN = {', '// both hands on the final reveal');
let render = cut('function render(g, id, t, lose) {', '// ---------- cards ----------');
render = one(render, 'if (S.pov) across(g, C, frame); else strip(g, frame);', 'across(g, C, frame);');
const out = `/* The end of the dice game (1U.6, round three; test default D3 "Low and close", losing word UNDONE, 30 Oct).
   MADE BY planner/tools/make-dicewater.js from replica/design/mockups/dicewater2/index.src.html; change those, not this file.
   Through Ulhu's own eyes, low at the table: the keeper sits across it, Ulhu's tentacles rest on the near edge. On the
   last reveal every die is on the table; the wave towers over the keeper's side and crashes down over the whole table,
   and when it slides back the loser's dice are gone and the winner's stand there wet. Then one word: VANQUISHT or UNDONE.
   DWATER.play(over, { keeper, lose, yours: [faces], theirs: [faces] }) -> Promise (resolved after the word has shown).
   over = the element to cover (the dice table); keeper = the keeper's key (for UZDEN.portrait); faces 0-3 as in the
   game (drawn as pips 1-4). A tap ends it. Reduced motion: no water, the word shows for a moment.
   DWATER.WORDS = { win, lose }. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.DWATER) return;
const W = 160, H = 210;
const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const WORDS = { win: 'VANQUISHT', lose: 'UNDONE' };
let KEEP = 'curio', THEIRS = [], YOURS = [];
const IMG = {}; function img(src) { if (!IMG[src]) { IMG[src] = new Image(); IMG[src].src = src; } return IMG[src]; }
${pix}
${room}
${scn}
${render}
// the real hands, laid out across the table: the keeper's far, Ulhu's near (u across, v depth, pips)
function lay(faces, v) { const n = faces.length; return faces.map((f, i) => [n === 1 ? 0 : -.55 + 1.1 * i / (n - 1), v + (i % 2 ? .04 : -.02), Math.max(1, Math.min(6, (Number(f) || 0) + 1))]); }
const CSS = '.dw-wrap{position:fixed;z-index:80;overflow:hidden;border-radius:8px;background:#050c0a;cursor:pointer;touch-action:manipulation;display:flex;align-items:center;justify-content:center}' +
  '.dw-wrap canvas{display:block;height:100%;max-width:100%;aspect-ratio:160/210;image-rendering:pixelated;image-rendering:crisp-edges}' +
  '.dw-word{position:absolute;left:0;right:0;top:46%;text-align:center;font:700 44px/1 var(--g,Georgia,serif);letter-spacing:.06em;opacity:0;text-shadow:0 3px 0 #000,0 0 18px rgba(0,0,0,.9);pointer-events:none}' +
  '.dw-word.win{color:#ffd56a}.dw-word.lose{color:#c4c8d0}';
function css() { if (document.getElementById('dw-css')) return; const s = document.createElement('style'); s.id = 'dw-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
function play(over, o) {
  o = o || {}; css(); KEEP = o.keeper || 'curio'; THEIRS = lay(o.theirs || [1, 2, 3], .8); YOURS = lay(o.yours || [1, 2], .2);
  const r = over && over.getBoundingClientRect ? over.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
  const wrap = document.createElement('div'); wrap.className = 'dw-wrap'; wrap.setAttribute('aria-label', o.lose ? 'The sea takes your dice' : 'The sea takes the keeper\\'s dice');
  wrap.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + Math.max(r.height, Math.min(innerHeight - r.top, r.width * 210 / 160)) + 'px';
  wrap.innerHTML = '<canvas width="' + W + '" height="' + H + '"></canvas><div class="dw-word ' + (o.lose ? 'lose' : 'win') + '">' + WORDS[o.lose ? 'lose' : 'win'] + '</div>';
  document.body.appendChild(wrap);
  const g = wrap.querySelector('canvas').getContext('2d'), wd = wrap.querySelector('.dw-word'), END = RM() ? 1.2 : 6.2, T0 = RM() ? 7 : 0, t0 = performance.now();
  return new Promise((res) => {
    let over_ = false, raf = 0;
    const end = () => { if (over_) return; over_ = true; cancelAnimationFrame(raf); clearTimeout(tm); wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).finished.then(() => wrap.remove(), () => wrap.remove()); res(); };
    const loop = () => { raf = requestAnimationFrame(loop); const s = (performance.now() - t0) / 1000, t = T0 || s, f = render(g, 'D3', t, !!o.lose);
      wd.style.opacity = RM() ? 1 : f.word ? Math.min(1, (t - 4.6) * 3) : 0; };
    loop();
    const tm = setTimeout(end, END * 1000);
    wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); end(); });
    wrap.addEventListener('click', (e) => e.stopPropagation());
  });
}
window.DWATER = { play, WORDS };
})();
`;
fs.writeFileSync(path.join(__dirname, '../game-dicewater.js'), out);
console.log('wrote game-dicewater.js', out.length, 'bytes; em dashes:', (out.match(/—/g) || []).length);
