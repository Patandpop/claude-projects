/* Going deeper (1U.11, Patryk's pick 29 Oct: DP3-b2 "Kraken doors, gold blade", replica/design/mockups/moments3/).
   When Ulhu passes into a new depth (every 10 levels) two carved brown stone doors slide in from the sides and meet as one
   gold kraken eye with tentacles; the depth name glows over them; a gold blade of light cuts down the pupil; the doors part
   on a warm gold flood with bubbles, and the level plaque is struck three times. The plaque's crack (his note 30 Oct) sits
   in the corner away from the number, never across it.
   GATE.play(host, { depth, name, note, plaque }) -> Promise (resolves when it is over). host = the Ulhu box (position
   relative); plaque = the level plaque element to strike, if any. Reduced motion: no doors, the name shows for a moment. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.GATE) return;
const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function spawn(p, cls, css, html) { const e = el('div', cls, html); if (css) e.style.cssText = css; p.appendChild(e); return e; }
function rng(seed) { return function () { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pen(ctx) { return (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }; }
// the b2 look, as picked
const V = { stone: ['#30291f', '#3e3527', '#15110b', '#221c13'], carveCol: '#d9a83a', glow: 'rgba(255,200,90,.85)', text: '#ffd56a', blade: '#fff3c0',
  flood: 'radial-gradient(ellipse at 50% 55%,rgba(255,236,170,.85),rgba(150,190,170,.35) 55%,transparent)' };
const CSS = '.gt-wrap{position:absolute;inset:0;z-index:60;pointer-events:none;overflow:hidden}' +
  '.gt-wrap .door{position:absolute;top:0;bottom:0;width:50%}.gt-wrap .door.l{left:0;border-right:2px solid #000}.gt-wrap .door.r{right:0;border-left:2px solid #000}' +
  '.gt-wrap .door canvas{width:100%;height:100%;display:block;image-rendering:pixelated}' +
  '.gt-wrap .arch{position:absolute;left:14px;right:14px;top:30%;text-align:center;padding:12px 8px;background:rgba(0,0,0,.62);border:1px solid ' + V.glow + ';box-shadow:0 0 24px ' + V.glow + ';opacity:0;z-index:2}' +
  '.gt-wrap .dn{font:700 13px var(--a,sans-serif);letter-spacing:.3em;color:' + V.text + '}.gt-wrap .dt{font:700 34px/1 var(--g,Georgia,serif);color:#fff;text-shadow:0 0 14px ' + V.glow + ',0 2px 0 #000;margin-top:4px}' +
  '.gt-wrap .dm{font:italic 14px var(--f,Georgia,serif);color:rgba(255,255,255,.88);margin-top:5px}' +
  '.gt-wrap .seam{position:absolute;top:0;bottom:0;left:calc(50% - 2px);width:4px;transform-origin:50% 0;opacity:0;z-index:1;background:' + V.blade + ';box-shadow:0 0 12px 6px ' + V.glow + '}' +
  '.gt-wrap .flood{position:absolute;inset:0;opacity:0;background:' + V.flood + '}' +
  '.gt-wrap .bub{position:absolute;width:6px;height:6px;border-radius:50%;border:1px solid rgba(255,240,200,.8);background:rgba(255,230,160,.25)}' +
  '.gt-wrap .spark{position:absolute;width:3px;height:3px;background:#fff3c0;box-shadow:0 0 4px #ffcf5a}' +
  '.gt-crk{position:absolute;right:3px;top:2px;width:16px;height:18px;pointer-events:none;background:linear-gradient(120deg,transparent 44%,#050a08 45% 52%,transparent 53%),linear-gradient(40deg,transparent 58%,#050a08 59% 64%,transparent 65%)}';
function css() { if (document.getElementById('gate-css')) return; const s = document.createElement('style'); s.id = 'gate-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
// one door, carved with half the kraken eye at its meeting edge and tentacles curling out to the hinge (the mock-up's own drawing)
function stoneCanvas(side, seed) { const c = document.createElement('canvas'); c.width = 64; c.height = 97; const R = pen(c.getContext('2d')), r = rng(seed), gc = V.carveCol;
  R(0, 0, 64, 97, V.stone[0]); for (let y = 0; y < 97; y += 12) { R(0, y, 64, 1, V.stone[2]); const off = (y / 12) % 2 ? 0 : 10; for (let x = off; x < 64; x += 20) R(x, y, 1, 12, V.stone[2]); }
  for (let i = 0; i < 160; i++) R(r() * 64, r() * 97, 1, 1, r() < .5 ? V.stone[1] : V.stone[2]);
  R(side === 'l' ? 60 : 0, 0, 4, 97, V.stone[2]);
  const ex = side === 'l' ? 63 : 0;
  for (let dy = -9; dy <= 9; dy++) { const w = Math.round(14 * Math.sqrt(1 - (dy / 9.5) ** 2)); for (let k = 0; k < w; k++) { const xx = side === 'l' ? ex - k : ex + k, d = Math.hypot(k, dy); R(xx, 34 + dy, 1, 1, d < 4 ? '#0a0806' : d < 7 ? gc : (k === w - 1 ? '#6b5420' : V.stone[3])); } }
  for (let n = 0; n < 3; n++) for (let j = 0; j < 40; j++) { const t2 = j / 40, x0 = side === 'l' ? 50 - j : 14 + j; R(x0, 56 + n * 12 + Math.sin(t2 * 9 + n) * 4, 2 - (j > 30 ? 1 : 0), 2 - (j > 30 ? 1 : 0), j % 5 === 0 ? '#ffe9a0' : gc); }
  R(side === 'l' ? 52 : 8, 44, 4, 12, '#c7a54a'); R(side === 'l' ? 52 : 8, 54, 4, 2, '#6b5420'); return c; }
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
let busy = null;
function play(host, o) {
  if (!host || busy) return busy || Promise.resolve(); css(); o = o || {};
  const anims = [], timers = [], a = (e, kf, d, x) => { x = x || {}; const an = e.animate(kf, { duration: d, delay: x.delay || 0, easing: x.ease || 'ease', fill: 'forwards' }); anims.push(an); return an; };
  const wait = (ms) => new Promise((res) => timers.push(setTimeout(res, ms)));
  const g = spawn(host, 'gt-wrap'); g.setAttribute('role', 'status');
  const arch = spawn(g, 'arch', '', '<div class="dn">DEPTH ' + (ROMAN[(o.depth || 1) + 1] || '') + '</div><div class="dt">' + String(o.name || '').replace(/</g, '&lt;') + '</div>' + (o.note ? '<div class="dm">' + String(o.note).replace(/</g, '&lt;') + '</div>' : ''));
  const W = () => g.clientWidth, H = () => g.clientHeight;
  const shake = (amp) => a(host, [{ transform: 'none' }, { transform: 'translate(' + (-amp) + 'px,' + amp / 2 + 'px)' }, { transform: 'translate(' + amp + 'px,' + (-amp / 2) + 'px)' }, { transform: 'translate(' + (-amp / 2) + 'px,0)' }, { transform: 'none' }], 240, { ease: 'linear' });
  const sparks = (x, y, n) => { for (let i = 0; i < n; i++) { const s = spawn(g, 'spark', 'left:' + x + 'px;top:' + y + 'px'), ang = i / n * 6.283 + .3, d = 14 + (i * 7) % 18; a(s, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + Math.cos(ang) * d + 'px,' + Math.sin(ang) * d + 'px)', opacity: 0 }], 500); } };
  const plq = o.plaque, strike = async () => { if (!plq) return; const hr = host.getBoundingClientRect();
    for (let i = 0; i < 3; i++) { a(plq, [{ transform: 'scale(1)' }, { transform: 'scale(1.12) rotate(' + (i % 2 ? 2 : -2) + 'deg)' }, { transform: 'scale(1)' }], 220); const r = plq.getBoundingClientRect(); sparks(r.left - hr.left + r.width / 2, r.top - hr.top + r.height / 2 + 10, 8); shake(3); await wait(380); }
    // the crack from the strike sits in the plaque's far corner, clear of the number (Patryk 30 Oct); it fades after a while
    const ck = el('i', 'gt-crk'); if (getComputedStyle(plq).position === 'static') plq.style.position = 'relative'; plq.appendChild(ck); setTimeout(() => ck.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1200, fill: 'forwards' }).onfinish = () => ck.remove(), 6000); };
  busy = (async () => {
    if (RM()) { arch.style.opacity = 1; await wait(2600); g.remove(); return; }
    const l = spawn(g, 'door l'), r = spawn(g, 'door r'); l.appendChild(stoneCanvas('l', 3)); r.appendChild(stoneCanvas('r', 9));
    l.style.transform = 'translateX(-102%)'; r.style.transform = 'translateX(102%)';
    const seam = spawn(g, 'seam');
    // 1. the doors slide in from left and right and meet as one gold eye
    const ease = 'cubic-bezier(.55,0,.85,.55)';
    a(l, [{ transform: 'translateX(-102%)' }, { transform: 'none' }], 1300, { ease }); a(r, [{ transform: 'translateX(102%)' }, { transform: 'none' }], 1300, { ease });
    await wait(1300); shake(6); sparks(W() / 2, H() * .2, 6); sparks(W() / 2, H() * .8, 6); await wait(350);
    // 2. the depth name glows over the closed doors
    a(arch, [{ opacity: 0, filter: 'brightness(.3)' }, { opacity: 1, filter: 'brightness(1.5)', offset: .5 }, { opacity: 1, filter: 'none' }], 900); await wait(1900);
    a(arch, [{ opacity: 1 }, { opacity: 0 }], 400); await wait(300);
    // 3. the gold blade cuts down the seam, through the pupil
    a(seam, [{ opacity: 1, transform: 'scaleY(0)' }, { opacity: 1, transform: 'scaleY(1)' }], 700, { ease: 'ease-in' }); await wait(700);
    a(seam, [{ opacity: 1, transform: 'scaleX(1)' }, { opacity: 1, transform: 'scaleX(2.6)' }, { opacity: 1, transform: 'scaleX(1.6)' }], 600); shake(2); await wait(600);
    // 4. they part on the warm gold flood, bubbles rising
    const fl = spawn(g, 'flood'); fl.style.zIndex = 0;
    a(l, [{ transform: 'none' }, { transform: 'translateX(-102%)' }], 1500, { ease: 'cubic-bezier(.5,0,.3,1)' }); a(r, [{ transform: 'none' }, { transform: 'translateX(102%)' }], 1500, { ease: 'cubic-bezier(.5,0,.3,1)' });
    a(fl, [{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 0 }], 2200); a(seam, [{ opacity: 1, transform: 'scaleX(1.6)' }, { opacity: 0, transform: 'scaleX(20)' }], 700);
    for (let i = 0; i < 18; i++) { const b = spawn(g, 'bub', 'left:' + (W() * .3 + (i * 37) % (W() * .4)) + 'px;top:' + (H() * .7 - (i * 13) % 40) + 'px');
      a(b, [{ transform: 'translate(0,0) scale(.5)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: 'translate(' + ((i % 3) - 1) * 10 + 'px,-' + (120 + (i * 17) % 80) + 'px) scale(1)', opacity: 0 }], 1600 + (i % 4) * 200, { delay: (i % 6) * 90 }); }
    await wait(1900);
    // 5. the plaque is struck in
    await strike(); await wait(300);
    anims.forEach((x) => { try { x.cancel(); } catch (e) { /* gone */ } }); g.remove();
  })().finally(() => { timers.forEach(clearTimeout); busy = null; });
  return busy;
}
window.GATE = { play };
})();
