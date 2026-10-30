// Builds planner/game-faint.js, the faint and Rise again (1U.11, Patryk's pick 30 Oct: FA-R3 "Rain", no ticks under the
// stars), from replica/design/mockups/faint5/index.src.html: the styles, the stage, the faint, the bubbles, the
// stained-glass stars and the rain are copied as they are; only the mock-up's fixed numbers (60 health, 310 runes,
// level VII) are swapped for his real ones.
// Run: node planner/tools/make-faint.js  (then the game checks)
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../replica/design/mockups/faint5/index.src.html'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('the mock-up changed, look for: ' + a); return src.slice(i, j); };
let css = cut('/* stage */', '.states{');
css = css.replace(/\.rits\{[^\n]*\n/, '').replace(/\.rit\{[^\n]*\n/, '').replace(/\.rit \.sk\{[^\n]*\n/, '').replace(/\.rit\.on\{[^\n]*\n/, '');
// every rule is kept inside the faint (.fz); the card's own rules (.call, .stars, .back) also work inside the card
// (.fz-call), which sits at the top of The Call between faints
const rules = css.replace(/\r/g, '').replace(/\/\*[^]*?\*\//g, '').split('}').map((r) => r.trim()).filter((r) => r.indexOf('{') > 0);
const scope = (sel, pre) => sel.split(',').map((x) => pre + x.trim()).join(',');
const scoped = rules.map((r) => { const i = r.indexOf('{'), sel = r.slice(0, i).trim(), body = r.slice(i);
  const card = /^\.(call|stars|back)\b/.test(sel) ? ',' + sel.split(',').map((x) => x.trim().replace(/^\.call\b/, '.fz-call').replace(/^(?!\.fz-call)/, '.fz-call ')).join(',') : '';
  return scope(sel, '.fz ') + card + body + '}'; }).join('');
let code = cut('const STOP = ', '/* ---------- the recovery') + cut('async function lightStar', 'async function recover');
const swap = (a, b) => { if (code.indexOf(a) < 0) throw new Error('the mock-up changed, look for: ' + a); code = code.split(a).join(b); };
swap("const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;", '');
swap('/ 60 * 100', '/ NUM.max * 100');
swap("hp + '/60'", "hp + '/' + NUM.max");
swap("'0/60'", "'0/' + NUM.max");
swap('st.setHp(60);', 'st.setHp(NUM.hp);');
swap('st.setRunes(310);', 'st.setRunes(NUM.runes);');
swap(`'<span class="num">VII</span><div class="ttl">Tide Caller</div>'`, `'<span class="num">' + NUM.lv + '</span><div class="ttl">' + NUM.title + '</div>'`);
swap('Math.round(310 * (1 - n / 10))', 'Math.round(NUM.runes + NUM.lost * (1 - n / 10))');
swap("'310 runes drift out of reach'", "NUM.lost + ' runes drift out of reach'");
swap('st.setHp(0); st.setRunes(0);', 'st.setHp(NUM.hp); st.setRunes(NUM.runes);');
swap("const TABS = window.RUNES.ones.map(", "const TABS = ((window.RUNES || {}).ones || []).map(");
// one star at a time with his real numbers: S.pose(n) is how far he has risen after n bubbles, S.per[n] the runes in
// bubble n, S.hpAt(n) his health after n bubbles
swap('const r0 = S.n / N_BUB, amt = PER[S.n]; S.n++; const r = S.n / N_BUB;', 'const r0 = S.pose(S.n), amt = S.per[S.n] || 0; S.n++; const r = S.pose(S.n);');
swap('const hp0 = Math.round(60 * r0), hp = Math.round(60 * r);', 'const hp0 = S.hpAt(S.n - 1), hp = S.hpAt(S.n);');
swap("const pl = spawn(st.fx, 'plus', '', '+' + amt);", "const pl = spawn(st.fx, 'plus', '', amt ? '+' + amt : '');");
const out = `/* The faint and Rise again (1U.11, Patryk's pick 30 Oct: FA-R3 "Rain"; no ticks under the stars, the stars are the marks).
   MADE BY planner/tools/make-faint.js from replica/design/mockups/faint5/index.src.html; change those, not this file.
   FAINT.faint(host, n) -> Promise: the health vial shatters, ink fills the water, Ulhu lies down (still breathing) and
     n.lost runes float away in bubbles; he wakes on n.wake health. n = { max, hp, runes, lost, wake, lv, title }.
   FAINT.panel(rise) -> the RISE AGAIN card for the top of The Call: three many-coloured stained-glass stars, rise.lit lit.
   FAINT.paint(root) draws every card's stars inside root.
   FAINT.star(host, n) -> Promise: the card and the stage together; star n.k lights piece by piece and rains six bubbles
     carrying rune tablets down into Ulhu, his health and runes climbing by the real amounts. n = { k, stage, coins, hp,
     max, hp0, runes, lv, title, line }. A tap ends either one early. Reduced motion: every step is instant. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.FAINT) return;
const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const NUM = { max: 60, hp: 60, runes: 0, lost: 0, lv: '', title: '' };
let K = null;
function kit() {
  if (K) return K;
  const ULHU = (window.ULHU_ART || {}).b16 || {};   // read on first use, so the load order of the paste files never matters
${code}
  return (K = { STOP, el, spawn, rel, TL, makeStage, faint, lyingState, revive, flowRain, makeGlass, paintGlass, lightStar, pose, fil, LIE });
}
const CSS = ${JSON.stringify(scoped)} +
  '.fz{position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;justify-content:center;gap:8px;padding:10px;background:#02070a;cursor:pointer}.fz .stage{margin-top:0}.fz>.over{position:absolute;inset:0;pointer-events:none;z-index:6}' +
  '.fz-call{position:relative}.uz-pane .fz-call{margin:0 0 10px}.fz,.fz-call{--gx:var(--g,Georgia,serif);--ax:var(--a,system-ui,sans-serif);--fx:var(--f,Georgia,serif)}.fz .px,.fz-call .px{image-rendering:pixelated;image-rendering:crisp-edges}';
function css() { if (document.getElementById('fz-css')) return; const s = document.createElement('style'); s.id = 'fz-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
const GLASS = [];   // the three stars keep one cut each (the mock-up's FA-R3 seeds 303, 320, 337)
const glass = (i) => GLASS[i] || (GLASS[i] = kit().makeGlass(303 + i * 17));
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function line(rise) {
  if (!rise) return '';
  const left = 3 - rise.lit;
  return rise.stage === 1 ? (left === 3 ? 'Three rituals light the three stars. Each one brings back health and runes.' : left + ' more ritual' + (left === 1 ? '' : 's') + ' to light the stars.')
    : (left === 3 ? 'Three rituals today bring the next quarter of the runes home.' : left + ' more ritual' + (left === 1 ? '' : 's') + ' for the second quarter.');
}
function panel(rise) {
  css(); if (!rise) return '';
  let h = '<div class="fz-call call" data-fz="' + rise.lit + '"><div class="hd">RISE AGAIN' + (rise.stage === 2 ? ' · II' : '') + '</div><div class="stars">';
  for (let i = 0; i < 3; i++) h += '<canvas class="px' + (i < rise.lit ? ' on' : '') + '" data-fs="' + i + '" data-lit="' + (i < rise.lit ? 1 : 0) + '" aria-label="star ' + (i + 1) + (i < rise.lit ? ', lit' : '') + '"></canvas>';
  return h + '</div><div class="back">' + esc(line(rise)) + '</div></div>';
}
function paint(root) { (root || document).querySelectorAll('canvas[data-fs]:not([data-on])').forEach((c) => { const i = +c.dataset.fs, G = glass(i); kit().paintGlass(c, G, c.dataset.lit === '1' ? G.n : 0, -1); c.setAttribute('data-on', '1'); }); }
let busy = null;
function overlay(host, withCall, rise) {
  css(); const k = kit(), g = document.createElement('div'); g.className = 'fz'; g.setAttribute('role', 'status');
  if (withCall) g.innerHTML = panel(rise);
  const stage = k.spawn(g, 'stage'), over = k.spawn(g, 'over'); host.appendChild(g); paint(g);
  return { g, stage, over, call: g.querySelector('.fz-call') };
}
function run(host, withCall, rise, play) {
  if (!host || busy) return busy || Promise.resolve();
  const O = overlay(host, withCall, rise), k = kit(), t = new k.TL(); let st = null;
  return (busy = new Promise((res) => {
    let done = false; const end = () => { if (done) return; done = true; t.kill(); O.g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' }).onfinish = () => { O.g.remove(); busy = null; res(); }; };
    O.g.addEventListener('click', end);
    st = k.makeStage(O.stage);
    play(st, t, O).then(() => t.wait(RM ? 1400 : 2600)).then(end, (e) => { if (e !== k.STOP) { try { console.error(e); } catch (x) { /* no console */ } } end(); });
  }));
}
function setNum(n) { NUM.max = n.max || 60; NUM.hp = n.hp != null ? n.hp : NUM.max; NUM.runes = n.runes || 0; NUM.lost = n.lost || 0; NUM.lv = n.lv || ''; NUM.title = esc(n.title || ''); }
function faint(host, n) {
  n = n || {}; setNum({ max: n.max, hp: n.hp, runes: n.runes, lost: n.lost, lv: n.lv, title: n.title });
  return run(host, false, null, async (st, t, O) => {
    const k = kit(); await k.faint(st, t, { call: { reset() {} }, over: O.over });
    const w = Math.max(0, Math.min(NUM.max, n.wake || 0)); t.a(st.fill, [{ height: '0%' }, { height: (w / NUM.max * 100) + '%' }], 800); st.hpl.textContent = w + '/' + NUM.max; if (w > 0) st.vial.classList.remove('cr');
  });
}
function star(host, n) {
  n = n || {}; const k0 = Math.max(0, Math.min(2, n.k | 0)), first = n.stage !== 2;
  setNum({ max: n.max, hp: n.hp0, runes: n.runes, lv: n.lv, title: n.title });
  const per = [], hpAt = [], coins = n.coins || 0, dh = n.hp || 0;
  for (let i = 0; i < 6; i++) per[k0 * 6 + i] = Math.floor(coins / 6) + (i < coins % 6 ? 1 : 0);
  for (let i = 0; i <= 6; i++) hpAt[k0 * 6 + i] = Math.min(NUM.max, NUM.hp + Math.round(dh * i / 6));
  const S = { n: k0 * 6, runes: NUM.runes, per, hpAt: (i) => hpAt[i] != null ? hpAt[i] : NUM.hp, pose: (i) => first ? Math.min(1, i / 18) : 1 };
  const rise = { stage: first ? 1 : 2, lit: k0 };
  return run(host, true, rise, async (st, t, O) => {
    const k = kit(); st.mood(first ? 'sleepy' : 'idle');
    if (first) { const r = S.pose(S.n); st.ulhu.style.transform = k.pose(r); st.ulhu.style.filter = k.fil(r, 7 * r); st.cam.style.filter = 'brightness(' + (.8 + .2 * r).toFixed(2) + ') saturate(' + (.6 + .4 * r).toFixed(2) + ')'; }
    await t.wait(500);
    const cv = O.call.querySelectorAll('canvas[data-fs]')[k0], G = glass(k0), back = O.call.querySelector('.back');
    await k.lightStar(cv, G, t);
    back.textContent = 'Star ' + (k0 + 1) + ' of 3 lit: six rune bubbles are on their way.';
    await k.flowRain(st, t, { call: { cvs: O.call.querySelectorAll('canvas[data-fs]') }, over: O.over }, k0, S);
    back.textContent = n.line || '';
    if (k0 === 2) { st.mood('happy'); t.a(st.ulhu, [{ transform: 'none', filter: k.fil(1, 7) }, { transform: 'translateY(-16px)', filter: k.fil(1, 18), offset: .4 }, { transform: 'none', filter: k.fil(1, 6) }], 900, { ease: 'ease-out' }); }
  });
}
window.FAINT = { faint, star, panel, paint };
})();
`;
fs.writeFileSync(path.join(__dirname, '../game-faint.js'), out);
console.log('wrote game-faint.js', out.length, 'bytes; em dashes:', (out.match(/—/g) || []).length);
