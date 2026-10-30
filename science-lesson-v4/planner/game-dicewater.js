/* The end of the dice game (1U.6, round three; test default D3 "Low and close", losing word UNDONE, 30 Oct).
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
// ---------- pixel helpers ----------
const rc = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
function rng(s) { return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const cl = (x) => x < 0 ? 0 : x > 1 ? 1 : x, seg = (t, a, b) => cl((t - a) / (b - a)), lerp = (a, b, p) => a + (b - a) * p, eio = (x) => x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
// ---------- the camera: table point (u across -1..1, v 0 near .. 1 far) to the screen ----------
function cam(o) { return { dN: o.dN, dF: o.dF, yN: o.yN, yF: o.yF, wN: o.wN, wF: o.wF, p: (u, v) => { const f = Math.pow(v, o.k || .85); return [W / 2 + u * lerp(o.wN, o.wF, f), lerp(o.yN, o.yF, f)]; }, v: (y) => Math.pow(cl((y - o.yN) / (o.yF - o.yN)), 1 / (o.k || .85)) }; }
// ---------- the table: wood rim, sea-green felt, a thick front edge, planks running to the far side ----------
function table(g, C) {
  for (let y = Math.round(C.yF) - 3; y <= C.yN + 3; y++) { const v = C.v(y), [x0] = C.p(-1.12, v), [x1] = C.p(1.12, v); rc(g, x0, y, x1 - x0, 1, (y + Math.round(v * 9)) % 7 ? '#5a3a22' : '#4a2e1a'); }
  for (let y = Math.round(C.yF); y <= C.yN; y++) { const v = C.v(y), [x0] = C.p(-1, v), [x1] = C.p(1, v); rc(g, x0, y, x1 - x0, 1, y % 2 ? '#123a2c' : '#10342a'); }
  for (let k = -3; k <= 3; k++) { for (let y = Math.round(C.yF); y <= C.yN; y++) { const [x] = C.p(k / 3.5, C.v(y)); if (y % 3) rc(g, x, y, 1, 1, '#0c2c22'); } }
  const [a] = C.p(-1.12, 0), [b] = C.p(1.12, 0); rc(g, a, C.yN + 4, b - a, 10, '#3e2614'); rc(g, a, C.yN + 4, b - a, 1, '#7a5432'); rc(g, a, C.yN + 13, b - a, 2, '#1a0e06');
  rc(g, a + 6, C.yN + 15, 6, 40, '#2e1c0e'); rc(g, b - 12, C.yN + 15, 6, 40, '#2e1c0e');
}
// ---------- a die in pixel 3D: an ivory top with its pips, a shaded front and side ----------
const PIPS = { 1: [[.5, .5]], 2: [[.25, .25], [.75, .75]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.25, .25], [.75, .25], [.25, .75], [.75, .75]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.25, .2], [.75, .2], [.25, .5], [.75, .5], [.25, .8], [.75, .8]] };
function die(g, C, u, v, face, lift, wet, tilt) {
  const [x, y] = C.p(u, v), s = Math.round(lerp(C.dN || 18, C.dF || 11, Math.pow(v, .85))), th = Math.round(s * .5), ty = Math.round(s * .62), yy = y - th - ty - (lift || 0), xx = x - s / 2 + (tilt || 0);
  rc(g, x - s / 2 - 1, y - 1, s + 2, 2, 'rgba(0,0,0,.45)');
  rc(g, xx - 1, yy - 1, s + 2, ty + th + 2, '#120c08');
  rc(g, xx, yy, s, ty, wet ? '#f6f0dc' : '#efe4c4'); rc(g, xx, yy + ty, s, th, wet ? '#b8ae92' : '#a89a78'); rc(g, xx + s - 2, yy + ty, 2, th, '#7a6e54');
  if (wet) rc(g, xx + 1, yy + 1, Math.max(1, s * .35), 1, '#ffffff');
  (PIPS[face] || PIPS[1]).forEach(([a, b]) => rc(g, xx + a * (s - 1), yy + b * (ty - 1), s > 10 ? 2 : 1, 1, '#2a1610'));
}
// ---------- the sea over the table: rows of teal water up to the front, with a curling crest of foam ----------
function water(g, C, vFrom, vTo, t, crestH, r) {
  const y0 = C.p(0, Math.max(vFrom, vTo))[1], y1 = C.p(0, Math.min(vFrom, vTo))[1];
  for (let y = Math.round(y0); y <= Math.round(y1); y++) { const v = C.v(y), [x0] = C.p(-1.2, v), [x1] = C.p(1.2, v);
    g.globalAlpha = .82; rc(g, x0, y, x1 - x0, 1, (y + Math.floor(t * 8)) % 5 ? '#1e7a8a' : '#2a9aa8'); g.globalAlpha = 1;
    if ((y * 7 + Math.floor(t * 12)) % 11 === 0) rc(g, x0 + ((y * 37 + Math.floor(t * 30)) % Math.max(1, x1 - x0)), y, 6, 1, '#8fe0e8'); }
  // the crest at the front edge (vTo): a wall of water crestH high, foam at its lip
  if (crestH > 0) { const [xa, yf] = C.p(-1.25, vTo), [xb] = C.p(1.25, vTo);
    for (let x = Math.round(xa); x < xb; x++) { const h = crestH * (.75 + .25 * Math.sin(x / 5 + t * 6)), top = yf - h;
      rc(g, x, top, 1, h, '#2a9aa8'); rc(g, x, top, 1, 2, r() < .7 ? '#e8fbff' : '#a8e8f0'); if (r() < .25) rc(g, x, top - 1 - r() * 3, 1, 1, '#ffffff'); } }
}
// ---------- the pixel-3D tentacle (the Grimoire's look): a tapering curl of round segments, light on one side ----------
function arm(g, x, y, len, curl, t, ph, grip) {
  let a = -Math.PI / 2, px = x, py = y; const n = 22;
  for (let i = 0; i < n; i++) { const f = i / n, r = lerp(4.5, 1, f); a += (curl * f * .22) + Math.sin(t * 3 + ph + f * 5) * .05; px += Math.cos(a) * len / n; py += Math.sin(a) * len / n;
    g.fillStyle = '#0a2a1e'; g.beginPath(); g.arc(Math.round(px), Math.round(py), r + 1, 0, 7); g.fill();
    g.fillStyle = '#2f9a64'; g.beginPath(); g.arc(Math.round(px), Math.round(py), r, 0, 7); g.fill();
    rc(g, px - r * .5, py - r * .6, Math.max(1, r * .6), 1, '#7af0b0'); if (i % 3 === 1 && r > 2) rc(g, px + r * .3, py + r * .2, 1, 1, '#c8f0d8'); }
  return [px, py];
}

// ---------- the grotto wall behind the table, lit by the keeper's lamp ----------
function grotto(g, C) {
  const r = rng(11);
  for (let y = 50; y < C.yF + 4; y++) rc(g, 0, y, W, 1, y % 3 ? '#0e1a16' : '#0c1613');
  for (let i = 0; i < 40; i++) { const x = r() * W, y = 52 + r() * (C.yF - 50), w = 6 + r() * 14; rc(g, x, y, w, 1, '#1a2a24'); rc(g, x, y + 1, w, 1, '#08100d'); }
  g.globalAlpha = .06; for (let k = 0; k < 10; k++) { const rr = 50 - k * 4; g.fillStyle = '#e0f0ff'; g.beginPath(); g.ellipse(W - 34, 62, rr, rr / 2, 0, 0, 7); g.fill(); } g.globalAlpha = 1;
  rc(g, W - 36, 56, 4, 8, '#ffe8a0'); rc(g, W - 37, 55, 6, 1, '#3a2a16');
}
// ---------- D3, through Ulhu's eyes: Squall across the table, Ulhu's own tentacles resting on the near edge ----------
function across(g, C, frame) {
  const K = img(window.UZDEN.portrait(KEEP, frame).src), w = 78, h = 67; if (K.complete) g.drawImage(K, W / 2 - w / 2, C.yF - h + 6, w, h);
}
function hands(g, C, t) {
  arm(g, 18, H + 4, 46, 1.6, t, 0, 0); arm(g, W - 18, H + 4, 46, -1.6, t, 2, 0);
}

const SCN = {
  D1: { name: 'Tide sweep', cap: 'Your W1, rebuilt: the sea rolls in from the far side over the whole table toward you, then drains back, dragging the loser\'s dice off the far edge in the backwash.', cam: { yN: 168, yF: 70, wN: 74, wF: 46 }, crest: 9 },
  D2: { name: 'The deep takes them', cap: 'The same flood, but when the whole table is under, tentacles rise through the water, each wraps one of the loser\'s dice and pulls it down. Then the water drains.', cam: { yN: 168, yF: 70, wN: 74, wF: 46 }, crest: 7, arms: true },
  D3: { name: 'Low and close', cap: 'Through your own eyes, low at the table: Squall sits across from you behind the far edge, and your tentacles rest on the near edge. The wave towers over Squall\'s side and crashes down onto the table, then slides back with the loser\'s dice.', cam: { yN: 196, yF: 132, wN: 96, wF: 70, k: 1.3, dN: 24, dF: 15 }, crest: 34, pov: true }
};

function render(g, id, t, lose) {
  const S = SCN[id], C = cam(S.cam), r = rng(Math.floor(t * 20) + 7);
  // timeline (s): .8 reveal, 1.0 to 2.2 the flood comes over, 2.2 to 3.1 under (the grab), 3.1 to 4.4 it drains, then the word
  const inP = eio(seg(t, 1, 2.2)), outP = eio(seg(t, 3.1, 4.4)), under = t >= 2.2 && t < 3.1, gone = t >= 4.4;
  const frame = t < 1 ? 'talk' : t < 4.4 ? 'idle' : (lose ? 'gloat' : 'sulk');
  rc(g, 0, 0, W, H, '#050c0a'); grotto(g, C); across(g, C, frame); table(g, C);
  const loser = lose ? YOURS : THEIRS, winner = lose ? THEIRS : YOURS;
  const front = t < 3.1 ? 1 - inP : outP;   // where the water's edge is: v from far (1) to near (0) and back
  const flooded = t >= 1 && t < 4.4;
  // dice behind the water first (the far ones), the water, then dice in front of it
  const all = winner.map((d) => [d, false]).concat(loser.map((d) => [d, true])).sort((a, b) => b[0][1] - a[0][1]);
  const drawDie = ([d, isLoser]) => {
    let [u, v, f] = d, lift = 0, tilt = 0;
    if (isLoser && t >= 2.2) {
      if (S.arms) { if (t >= 2.6) return; lift = Math.sin(seg(t, 2.2, 2.6) * Math.PI) * 4; }
      else { const p = seg(t, 2.6, 4.4); if (p > 0) { v = lerp(v, 1.15, eio(p)); u = u + Math.sin(p * 9 + d[0] * 3) * .08; lift = 3 + Math.sin(p * 14) * 2; tilt = Math.round(Math.sin(p * 20) * 2); f = 1 + Math.floor(p * 18 + d[2]) % 6; } if (v > 1.05) return; }
    }
    die(g, C, u, Math.min(v, 1), f, lift, t >= 1.6 && !gone ? 1 : (t > 4.4 && t < 6.5 ? 1 : 0), tilt);
  };
  all.forEach(drawDie);
  if (flooded) {
    water(g, C, 1, Math.max(0, front), t, t < 2.2 ? S.crest * (1 - inP * .5) : t >= 3.1 ? S.crest * .4 * (1 - outP) : 0, r);
    if (S.arms && t >= 2.2 && t < 3.1) loser.forEach((d, i) => { const [x, y] = C.p(d[0], d[1]); const p = seg(t, 2.2, 2.55), q = seg(t, 2.6, 3.0); arm(g, x + 4, y + 4 + q * 20, 6 + p * 18 * (1 - q), 2.2, t, i, 1); });
  }
  if (t >= 4.4 && t < 6) { g.globalAlpha = .25 * (1 - seg(t, 4.4, 6)); for (let y = Math.round(C.yF); y <= C.yN; y += 2) { const v = C.v(y), [x0] = C.p(-1, v), [x1] = C.p(1, v); rc(g, x0, y, x1 - x0, 1, '#6ad0e0'); } g.globalAlpha = 1; }
  if (S.pov) hands(g, C, t);
  return { word: t >= 4.6, frame };
}

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
  const wrap = document.createElement('div'); wrap.className = 'dw-wrap'; wrap.setAttribute('aria-label', o.lose ? 'The sea takes your dice' : 'The sea takes the keeper\'s dice');
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
