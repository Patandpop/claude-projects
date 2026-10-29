/* The Lair banner (1U.5, Patryk's picks 2026-10-28/29, from replica/design/mockups/lair round four):
   B2 The Band (only the middle band of a huge moon shows behind Ulhu), colours P2 morning, P3 day, P3 evening, P2 night,
   M2 Crescent half moon, V1 round flask for health, H4 Pile of runes (30px runes in a pyramid up to 21: 6-5-4-3-2-1).
   MADE BY planner/tools/make-lair.js from the mock-up plus planner/tools/lair-glue.js; change those, not this file.
   LAIR.mount(ban) builds the layers inside the banner element; LAIR.paint(ban, s) redraws them, where
   s = { time: 'morning'|'day'|'evening'|'night', phase: 'full'|'half'|'dark', hp, maxHp, runes, tide (0..1), drop };
   LAIR.level(ban) plays the tide flood; LAIR.slip(ban) shakes the flask. */
(function () {
'use strict';
const CSS = ".lzb{position:relative;height:171px;overflow:hidden;background:linear-gradient(180deg,var(--top),var(--bot));user-select:none;-webkit-user-select:none;isolation:isolate}\r\n.lzb img,.lzb canvas{image-rendering:pixelated}\r\n.lzb .lay{position:absolute;pointer-events:none}\r\n.lzb .shafts{inset:0;background:repeating-linear-gradient(104deg,var(--shaft) 0 15px,transparent 15px 50px);-webkit-mask-image:linear-gradient(180deg,#000,transparent 88%);mask-image:linear-gradient(180deg,#000,transparent 88%);opacity:var(--lit);animation:lz-shaft 14s ease-in-out infinite alternate}\r\n@keyframes lz-shaft{to{transform:translateX(-26px)}}\r\n.lzb .moon{position:absolute;padding:0;border:none;background:none;border-radius:50%;cursor:pointer;z-index:1}\r\n.lzb .moon canvas{display:block;width:100%;height:100%;border-radius:50%}\r\n.lzb .moon:focus-visible{outline:3px solid #ffd56a;outline-offset:-6px}\r\n.lzb .moon.ph-full{box-shadow:0 0 60px 14px rgba(var(--mg),.5),0 0 14px 2px rgba(255,255,240,.5)}\r\n.lzb .moon.ph-half{box-shadow:0 0 40px 8px rgba(var(--mg),.28)}\r\n.lzb .moon.ph-dark{box-shadow:0 0 18px 0 rgba(120,140,170,.15)}\r\n.lzb .ruins{left:0;top:0;height:171px;z-index:2}\r\n.lzb .tint{inset:0;z-index:3;mix-blend-mode:screen;transition:opacity .6s}\r\n.lzb .tide{left:0;right:0;bottom:21px;z-index:3;height:0;background:linear-gradient(0deg,rgba(var(--g),.26),rgba(var(--g),.1));transition:height .9s cubic-bezier(.3,.7,.3,1);mix-blend-mode:screen}\r\n.lzb .tide:before{content:\"\";position:absolute;left:0;right:0;top:-3px;height:3px;background:repeating-linear-gradient(90deg,rgba(var(--g),.95) 0 6px,transparent 6px 12px);animation:lz-wave 2.4s linear infinite}\r\n.lzb .tide:after{content:\"\";position:absolute;left:0;right:0;top:0;height:2px;background:rgba(var(--g),.8);box-shadow:0 0 8px rgba(var(--g),.9)}\r\n@keyframes lz-wave{to{background-position:12px 0}}\r\n.lzb .bubs{inset:0;z-index:4;overflow:hidden}\r\n.lzb .bubs i{position:absolute;bottom:-10px;border-radius:50%;border:1px solid rgba(220,255,240,.55);background:rgba(220,255,240,.12);animation:lz-rise linear infinite}\r\n@keyframes lz-rise{to{transform:translate(8px,-200px)}}\r\n.lzb .shade{left:0;top:0;z-index:5}\r\n.lzb .flash{inset:0;z-index:12;opacity:0;background:radial-gradient(ellipse at 50% 60%,rgba(var(--g),.85),rgba(var(--g),0) 75%)}\r\n.lzb .flash.go{animation:lz-flash 1.3s ease-out}\r\n@keyframes lz-flash{0%{opacity:0}20%{opacity:1}100%{opacity:0}}\r\n.lzb .obj{position:absolute;z-index:6}\r\n.lzb.unlit .obj:not(.cand){filter:brightness(.82)}\r\n\r\n/* Ulhu */\r\n.lzb .ulhu{width:96px;height:96px;transform-origin:50% 100%}\r\n.lzb .ulhu .in{position:absolute;inset:0;animation:lz-bob 3.2s ease-in-out infinite}\r\n.lzb .ulhu img{position:absolute;inset:0;width:100%;height:100%}\r\n.lzb .ulhu.flip img{transform:scaleX(-1)}\r\n@keyframes lz-bob{50%{transform:translateY(-3px)}}\r\n.lzb .ulhu.hop .in{animation:lz-hop .6s ease-out 2}\r\n@keyframes lz-hop{30%{transform:translateY(-12px)}60%{transform:translateY(0)}}\r\n.lzb .ulhu.flinch .in{animation:lz-flinch .5s ease-in-out}\r\n@keyframes lz-flinch{0%,100%{transform:none}20%{transform:translate(-5px,2px) rotate(-4deg)}45%{transform:translate(4px,0) rotate(3deg)}70%{transform:translate(-2px,1px)}}\r\n.lzb .ulhu .zz{position:absolute;right:4px;top:6px;font:700 14px var(--a);color:#cfe0ff;text-shadow:0 1px 0 #000;animation:lz-zz 2.6s ease-in-out infinite}\r\n@keyframes lz-zz{0%{opacity:0;transform:translate(0,6px)}40%{opacity:1}100%{opacity:0;transform:translate(8px,-10px)}}\r\n\r\n/* the vial */\r\n.lzb .vial{width:42px;display:flex;flex-direction:column;align-items:center;gap:2px}\r\n.lzb .vial canvas{width:42px;height:66px;display:block}\r\n.lzb .vial b{font:700 12px/1 var(--a);font-variant-numeric:tabular-nums;color:#dcffec;background:rgba(4,10,8,.78);padding:3px 6px 3px;border-radius:7px;white-space:nowrap;border:1px solid rgba(var(--vg),.5)}\r\n.lzb .vial b small{font-size:10px;color:#9fc4b2;font-weight:400}\r\n.lzb .vial.low b{color:#ffd0c4;border-color:#a3202a}\r\n.lzb .vial.shake canvas{animation:lz-vshake .45s ease-in-out}\r\n@keyframes lz-vshake{20%{transform:translateX(-4px) rotate(-6deg)}50%{transform:translateX(3px) rotate(4deg)}80%{transform:translateX(-1px)}}\r\n\r\n/* the heap */\r\n.lzb .heap{width:120px;height:84px}\r\n.lzb .heap img{position:absolute;width:48px;height:48px}\r\n.lzb .heap .glowb{position:absolute;left:10px;right:10px;bottom:6px;height:40px;border-radius:50%;background:radial-gradient(ellipse,rgba(255,213,106,.32),rgba(255,213,106,0) 70%)}\r\n.lzb .heap .hn{position:absolute;left:50%;bottom:0;transform:translateX(-50%) rotate(-2deg);z-index:3;font:700 13px/1 var(--a);font-variant-numeric:tabular-nums;color:#ffd56a;background:linear-gradient(180deg,#3d4743,#222a27);padding:4px 8px 4px;border-radius:3px 6px 3px 5px;box-shadow:inset 0 1px 0 #5f6c66,inset 0 -1px 0 #131816,0 2px 0 rgba(0,0,0,.55);text-shadow:0 -1px 0 #000,0 0 6px rgba(255,213,106,.4);white-space:nowrap}\r\n.lzb .heap .drop{animation:lz-drop .7s cubic-bezier(.5,0,.8,.6)}\r\n@keyframes lz-drop{0%{transform:translateY(-110px);opacity:0}20%{opacity:1}85%{transform:translateY(3px)}100%{transform:none}}\r\n\r\n/* candles (dark moon only) */\r\n.lzb .cand{width:12px;height:24px;display:none}\r\n.lzb.mdark .cand{display:block}\r\n.lzb .cand i{position:absolute;left:3px;bottom:0;width:6px;height:13px;background:linear-gradient(90deg,#e8dcc0,#b8a888);box-shadow:inset 0 2px 0 #fff4dc}\r\n.lzb .cand b{position:absolute;left:3px;bottom:13px;width:6px;height:9px;border-radius:50% 50% 40% 40%;background:radial-gradient(circle at 50% 70%,#fff6c0,#ffb030 60%,#e8601a);box-shadow:0 0 12px 4px rgba(255,170,60,.55);animation:lz-flick 1.1s ease-in-out infinite alternate;transform-origin:50% 100%}\r\n@keyframes lz-flick{0%{transform:scale(1,1)}50%{transform:scale(.85,1.12) translateX(.5px)}100%{transform:scale(1.05,.92)}}\r\n\r\n/* the plaque */\r\n.lzb .plq{display:flex;align-items:center;gap:9px;padding:5px 11px 6px 9px;background:linear-gradient(180deg,#56645e,#2e3a35);border:1px solid #151d1a;box-shadow:inset 0 1px 0 #7a8c84,inset 0 -2px 0 #1a2420,0 3px 0 rgba(0,0,0,.45);max-width:150px;transition:box-shadow .4s;z-index:7}\r\n.lzb .plq .num{font:700 27px/1 var(--g);color:#ffd56a;text-shadow:0 1px 0 #2a1e08,0 0 8px rgba(255,213,106,.35);min-width:22px;text-align:center}\r\n.lzb .plq .t{display:flex;flex-direction:column;min-width:0}\r\n.lzb .plq .ttl{font:500 16px/1.05 var(--g);color:#f1ead6;text-shadow:0 1px 0 #10160f}\r\n.lzb .plq .tn{font:700 11px/1.2 var(--a);letter-spacing:.06em;color:#c9f5dd;margin-top:2px;font-variant-numeric:tabular-nums}\r\n.lzb .plq.glow{box-shadow:inset 0 1px 0 #7a8c84,0 0 0 2px rgba(var(--g),.8),0 0 22px 6px rgba(var(--g),.6)}\r\n.lzb .plq.glow .num{animation:lz-numup .9s ease-out}\r\n.lzb .moon{width:336px;height:336px;left:calc(50% - 168px);top:-83px}\n.lzb .plq{left:10px;top:10px;flex-direction:column;gap:1px;padding:6px 14px 7px;border-radius:40px 40px 4px 4px / 18px 18px 4px 4px;text-align:center;align-items:center}\n.lzb .plq .t{align-items:center}\n.lzb .scrap{left:calc(50% + 34px);right:10px;top:10px}\n.lzb .ulhu{left:calc(50% - 60px);bottom:15px}\n.lzb .vial{right:12px;bottom:3px}\n.lzb .heap{left:4px;bottom:4px}\n.lzb .heap{width:132px;height:108px}\n.lzb .heap canvas.hb{position:absolute;left:0;bottom:12px;width:132px;height:96px;image-rendering:pixelated}\n.lzb .heap img{position:absolute;image-rendering:pixelated}\n.lzb .heap .hn{z-index:12}\n.lzb .vial{width:auto}\n.lzb .vial canvas{height:66px;width:auto}";
const TIMES = [['morning', 'Morning'], ['day', 'Day'], ['evening', 'Evening'], ['night', 'Night']];
const GLASS = { h: '#f0b445', hd: '#b0701e', b: '#4a72d8', bd: '#22408a' };
function rng(seed) { return function () { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pen(ctx) { return (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }; }

function ledge(R, r, p, W, top, from, to) {
  R(from, top, to - from, 57 - top, p.ledge); R(from, top, to - from, 1, p.ledgeHi);
  let x = from + Math.floor(r() * 6); while (x < to) { R(x, top + 1, 1, 57 - top - 2, p.ledgeLo); x += 8 + Math.floor(r() * 11); }
  R(from, 56, to - from, 1, p.ledgeLo);
  for (let i = 0; i < (to - from) / 7; i++) R(from + r() * (to - from), top + 2 + r() * 4, 1, 1, p.ledgeHi);
  for (let i = 0; i < (to - from) / 11; i++) { const mx = from + r() * (to - from); R(mx, top - 1, 2 + Math.floor(r() * 3), 1, p.moss); }
}
function kelp(R, x, base, h, p, ph) { for (let j = 0; j < h; j++) { const xx = x + Math.round(Math.sin(j / 3.2 + ph) * 1.4); R(xx, base - j, 1, 1, p.moss); if (j % 4 === 2) R(xx + (j % 8 === 2 ? 1 : -1), base - j, 1, 1, p.moss); } }
function towers(R, r, p, W, n, base) {
  for (let i = 0; i < n; i++) { const x = r() * W, w = 5 + Math.floor(r() * 8), h = 16 + Math.floor(r() * 26), s = (r() - .5) * .5;
    for (let j = 0; j < h; j++) { R(x + s * j, base - j, w, 1, p.far); R(x + s * j, base - j, 1, 1, p.farHi); }
    for (let k = 0; k < 3; k++) if (r() < .5) R(x + s * (h * .6) + 2 + k * 2, base - h * .6 - k * 3, 1, 1, p.glow); }
}
function column(R, r, p, x, base, h) {
  const w = 7, top = base - h;
  R(x, top + 3, w, h - 3, p.mid); R(x, top + 3, 1, h - 3, p.midHi);
  R(x + 2, top + 4, 1, h - 6, p.midLo); R(x + 4, top + 4, 1, h - 6, p.midLo); R(x + w - 1, top + 3, 1, h - 3, p.midLo);
  R(x - 1, base - 2, w + 2, 2, p.midHi); R(x - 1, top + 1, w + 2, 2, p.midHi);
  for (let i = 0; i < w + 2; i++) R(x - 1 + i, top - Math.floor(r() * 3), 1, 2, p.mid);
  for (let k = 0; k < 3; k++) R(x + 3, top + 8 + k * 6, 1, 2, p.glow);
}
function blocksWall(R, r, p, x0, x1, top, base) {
  R(x0, top, x1 - x0, base - top, p.mid);
  let y = top; while (y < base) { const bh = 4 + Math.floor(r() * 3); let x = x0 - Math.floor(r() * 6);
    while (x < x1) { const bw = 6 + Math.floor(r() * 9); R(Math.max(x0, x), y, Math.min(bw, x1 - Math.max(x0, x)), 1, p.midHi); R(x + bw - 1, y, 1, bh, p.midLo); if (r() < .12) R(x + 2 + r() * (bw - 4), y + 2, 1, 1, p.glow); x += bw; }
    R(x0, y + bh - 1, x1 - x0, 1, p.midLo); y += bh; }
  for (let i = x0; i < x1; i++) if (r() < .5) R(i, top - 1, 1, 1, p.mid);
}
const RUINS = {
  1(ctx, W, p) { const R = pen(ctx), r = rng(11);
    towers(R, r, p, W, 7, 46);
    blocksWall(R, r, p, 0, Math.round(W * .62), 30, 50);
    const xs = [.03, .28, .5, .73].map((f) => Math.round(f * W)), hs = [44, 38, 46, 30];
    xs.forEach((x, i) => column(R, r, p, x, 50, hs[i]));
    const a = xs[1] + 3, b = xs[2] + 3, cx = (a + b) / 2, rr = (b - a) / 2, t = 50 - 38;
    for (let k = 0; k < 3; k++) for (let ang = 0; ang <= Math.PI; ang += .02) { if (ang > 1.95 && ang < 2.45) continue; R(cx + Math.cos(ang) * (rr - k), t - Math.sin(ang) * (rr - k) * .7, 1, 1, k === 0 ? p.midHi : p.mid); }
    kelp(R, Math.round(W * .2), 49, 16, p, 1); kelp(R, Math.round(W * .66), 49, 22, p, 2); kelp(R, Math.round(W * .92), 49, 12, p, 3);
    ledge(R, r, p, W, 50, 0, W); },
  2(ctx, W, p) { const R = pen(ctx), r = rng(23);
    const zig = (cx, base, n, w0) => { for (let s = 0; s < n; s++) { const w = w0 - s * 7; R(cx - w / 2, base - (s + 1) * 5, w, 5, p.far); R(cx - w / 2, base - (s + 1) * 5, w, 1, p.farHi); } R(cx - 1, base - n * 5 - 3, 3, 3, p.far); R(cx, base - n * 5 - 2, 1, 1, p.glow); };
    zig(Math.round(W * .14), 50, 5, 40); zig(Math.round(W * .86), 50, 4, 34); towers(R, r, p, W, 3, 48);
    const mono = (x, h, w, lean) => { for (let j = 0; j < h; j++) { const xx = x + lean * j; R(xx, 50 - j, w, 1, p.mid); R(xx, 50 - j, 1, 1, p.midHi); R(xx + w - 1, 50 - j, 1, 1, p.midLo); if (j % 6 === 3 && j > 4 && j < h - 3) { R(xx + w / 2 - 1, 50 - j, 3, 1, p.glow); R(xx + w / 2, 50 - j - 1, 1, 3, p.glow); } } for (let i = 0; i < w; i++) R(x + lean * h + i, 50 - h - Math.floor(r() * 2), 1, 1, p.mid); };
    mono(Math.round(W * .02), 44, 9, .22); mono(Math.round(W * .2), 30, 7, -.1); mono(Math.round(W * .74), 34, 7, .12); mono(Math.round(W * .9), 46, 9, -.2);
    blocksWall(R, r, p, Math.round(W * .3), Math.round(W * .7), 40, 50);
    kelp(R, Math.round(W * .33), 49, 14, p, 0); kelp(R, Math.round(W * .7), 49, 18, p, 2);
    ledge(R, r, p, W, 50, 0, W);
    for (let i = 0; i < 3; i++) { const x = W * (.2 + i * .3); for (let k = 0; k < 4; k++) R(x + k, 51 + k, 1, 1, p.ledgeLo); } },
  3(ctx, W, p) { const R = pen(ctx), r = rng(37);
    for (let i = 0; i < 3; i++) { const cx = W * (.25 + i * .3), rad = 10 + i * 3; for (let y = 0; y < rad; y++) { const hw = Math.sqrt(rad * rad - y * y) * 1.4; R(cx - hw, 46 - y, hw * 2, 1, p.far); } R(cx - 1, 46 - rad - 4, 2, 4, p.farHi); }
    const xa = Math.round(W * .5), xb = Math.round(W * .93), spring = 26, inner0 = xa + 6, inner1 = xb, span = inner1 - inner0;
    const archY = (x) => { const u = (x - inner0) / span; return spring - 22 * (1 - Math.pow(Math.abs(2 * u - 1), 1.5)); };
    for (let x = inner0; x < inner1; x++) { const y0 = archY(x); for (let y = Math.ceil(y0 + 3); y < 50; y++) { const px = Math.floor((x - inner0) / 4), py = Math.floor((y - 6) / 5); const k = (px * 7 + py * 13) % 11;
      if ((x - inner0) % 4 === 0 || (y - 6) % 5 === 0 || Math.abs(x - (inner0 + span / 2)) < 1) { R(x, y, 1, 1, p.midLo); continue; }
      if (y < 30 && (px * 3 + py * 5) % 7 < 3) continue; if ((px + py * 3) % 5 === 4 && y < 40) continue;
      const blue = k < 5; const edge = (x - inner0) % 4 === 1 || (y - 6) % 5 === 1; R(x, y, 1, 1, blue ? (edge ? GLASS.b : GLASS.bd) : (edge ? GLASS.h : GLASS.hd)); } }
    for (let x = xa; x < xb + 6; x++) { const xx = Math.min(Math.max(x, inner0), inner1 - 1); const y0 = archY(xx); if (x > inner0 + span * .14 && x < inner0 + span * .28) continue; for (let k = 0; k < 4; k++) R(x, y0 - 1 + k, 1, 1, k === 0 ? p.midHi : p.mid); }
    [xa, xb].forEach((x) => { R(x, spring, 6, 24, p.mid); R(x, spring, 1, 24, p.midHi); R(x + 5, spring, 1, 24, p.midLo); for (let k = 0; k < 3; k++) R(x + 2, spring + 4 + k * 6, 2, 1, p.glow); });
    for (let i = 0; i < 6; i++) { const x = W * .3 + r() * W * .15, w = 3 + Math.floor(r() * 5), h = 2 + Math.floor(r() * 3); R(x, 50 - h, w, h, p.mid); R(x, 50 - h, w, 1, p.midHi); }
    kelp(R, Math.round(W * .44), 49, 20, p, 1); kelp(R, Math.round(W * .97), 49, 14, p, 3);
    ledge(R, r, p, W, 50, 0, W); },
  4(ctx, W, p) { const R = pen(ctx), r = rng(51);
    towers(R, r, p, W, 5, 46);
    const d0 = Math.round(W * .6);
    for (let k = 0; k < 5; k++) { const x = d0 + 10 + k * 9; R(x, 44 - (k + 1) * 5, W - x, 5, p.mid); R(x, 44 - (k + 1) * 5, W - x, 1, p.midHi); R(x, 44 - k * 5 - 1, W - x, 1, p.midLo); }
    const pillar = (x, w) => { R(x, 0, w, 50, p.mid); R(x, 0, 1, 50, p.midHi); R(x + w - 1, 0, 1, 50, p.midLo); for (let j = 2; j < 48; j++) { const xx = x + w / 2 + Math.round(Math.sin(j / 2.6) * (w / 2 - 2)); R(xx, j, 1, 1, j % 9 < 5 ? p.glow : p.midLo); } R(x - 1, 46, w + 2, 4, p.midHi); };
    pillar(Math.round(W * .02), 8); pillar(Math.round(W * .46), 7); pillar(Math.round(W * .955), 8);
    kelp(R, Math.round(W * .38), 49, 18, p, 0); kelp(R, Math.round(W * .57), 49, 12, p, 2);
    ledge(R, r, p, W, 50, 0, W);
    ledge(R, r, p, W, 44, d0, W); R(d0, 44, 1, 6, p.ledgeLo); }
};

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mixC = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lift = (a, t) => mixC(a, '#ffffff', t), sink = (a, t) => mixC(a, '#000000', t);
function mkPal(name, top, bot, stone, glow, moss, moon) {
  const far = sink(mixC(top, bot, .5), .15), ledge = mixC(stone, bot, .15);
  return { name, top, bot, far, farHi: lift(far, .15), mid: stone, midHi: lift(stone, .22), midLo: sink(stone, .45), ledge, ledgeHi: lift(ledge, .25), ledgeLo: sink(ledge, .5), moss, glow,
    g: hx(glow).join(','), shaft: 'rgba(' + hx(lift(top, .5)).join(',') + ',.12)', moonLit: [lift(moon, .8), moon, sink(moon, .18)], mg: hx(lift(moon, .4)).join(',') };
}
// his picks only (the mock-up's P2 morning, P3 day, P3 evening, P2 night)
const PALS = { morning: mkPal('Rose dawn', '#f2c0ac', '#2c4658', '#5a5462', '#ffe2d0', '#8cb890', '#ecd2c0'), day: mkPal('Jade deep', '#17684c', '#020e0a', '#173229', '#c8f060', '#5aa040', '#cfc48e'),
  evening: mkPal('Violet dusk', '#9a5c9c', '#1a0c26', '#3a2848', '#ffb0e0', '#6a7a7a', '#e0c8e4'), night: mkPal('Ink black', '#141c2c', '#020306', '#101622', '#5ad0c0', '#1e4a48', '#a8b0bc') };
const CRATERS = [[.36, .38, .22, 1], [.64, .62, .17, 1], [.56, .24, .07, 0], [.26, .7, .09, 0], [.78, .38, .06, 0], [.47, .52, .05, 0], [.7, .82, .05, 0], [.18, .45, .05, 0]];
function drawMoon(cv, d, phase, p, ms) {
  const n = Math.round(d / 3); cv.width = n; cv.height = n; const ctx = cv.getContext('2d'), R = pen(ctx), c = n / 2;
  const [L, M, S] = p.moonLit, half = phase === 'half';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = (x + .5 - c) / c, v = (y + .5 - c) / c, dd = Math.hypot(u, v); if (dd > 1) continue;
    let mare = 0, crat = 0; CRATERS.forEach(([cx, cy, cr, big]) => { const q = Math.hypot(x / n - cx, y / n - cy) / cr; if (q < 1) { if (big) mare = 1; else crat = q > .7 ? 2 : 1; } });
    let lit;
    if (phase === 'full' || (half && ms === 'M3')) lit = true;
    else if (phase === 'dark') lit = false;
    else { const ca = .77, sa = -.64, uu = u * ca + v * sa, vv = -u * sa + v * ca, k = ms === 'M1' ? -.5 : .4, e = uu - k * Math.sqrt(Math.max(0, 1 - vv * vv)), w = 2.4 / c; lit = e > w ? true : e < -w ? false : (x + y) % 2 === 0; }
    let col;
    if (lit) { const shade = dd > .9 ? 2 : dd > .75 && (x + y) % 2 ? 1 : 0; col = crat === 2 ? L : crat === 1 ? S : mare ? (shade ? S : M) : [L, M, S][shade]; }
    else if (half && ms === 'M2') col = dd > .94 ? '#46566a' : crat || mare ? '#26303d' : '#1f2833';
    else col = dd > .94 ? '#33404f' : crat || mare ? '#1d2530' : '#161d26';
    R(x, y, 1, 1, col);
  }
  if (half && ms === 'M3') {
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(6,10,18,.5)'; ctx.fillRect(0, 0, n, n);
    const mc = hx(lift(p.top, .35)).join(',');
    for (let i = 0; i < 8; i++) { const y0 = Math.round(n * (.06 + i * .12 + (i % 2) * .03)), hh = 2 + (i % 3);
      for (let x = 0; x < n; x += 6) { ctx.fillStyle = 'rgba(' + mc + ',' + (.14 + ((x / 6 + i) % 3) * .07).toFixed(2) + ')'; ctx.fillRect(x, y0 + ((x / 6 + i) % 2), 6, hh); } }
    ctx.globalCompositeOperation = 'source-over';
  }
}

/* the vials: V0 is the old one (drawVial), V1 to V4 are new shapes drawn from a row-width table */
const VIALS = {
  V0: ['Before', 'The vial from round two, for comparison.'],
  V1: ['Round flask', 'A round-bottomed flask on a thin neck, corked, with a drip of red wax.'],
  V2: ['Caged phial', 'A tall glass phial held in a brass cage, with a brass cap and ring.'],
  V3: ['Tentacle jar', 'A squat jar with one of Ulhu’s purple tentacles curled round it.'],
  V4: ['Coffin bottle', 'A coffin-shaped bottle with a silver stopper and a glowing elder sign.']
};
const CORK = '#7a5434', CORKHI = '#b08250';
const VSPEC = {
  V1: { hw: [0, 0, 0, 3, 2, 2, 2, 2, 2, 3, 4, 5, 6, 6, 7, 7, 7, 6, 6, 5, 4, 3], l0: 10, l1: 20, g: [12, 17],
    top(R) { R(6, 0, 4, 3, CORK); R(6, 0, 4, 1, CORKHI); }, deco(R) { R(6, 3, 1, 3, '#b8322a'); R(9, 3, 1, 2, '#b8322a'); R(6, 3, 1, 1, '#e0584a'); } },
  V2: { hw: [0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2], l0: 4, l1: 20, g: [5, 18],
    top(R) { R(7, 0, 2, 1, '#c89a40'); R(5, 1, 6, 2, '#a07828'); R(5, 1, 6, 1, '#f0c870'); },
    deco(R) { const b = '#c89a40', bd = '#7a5a20'; for (let y = 3; y < 22; y++) { R(4, y, 1, 1, bd); R(11, y, 1, 1, bd); } [8, 15].forEach((y) => { R(4, y, 8, 1, b); R(4, y + 1, 8, 1, bd); }); R(4, 3, 1, 1, b); R(11, 3, 1, 1, b); R(3, 21, 10, 1, bd); R(3, 21, 10, 1, b); } },
  V3: { hw: [0, 0, 0, 3, 3, 3, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5], l0: 7, l1: 20, g: [8, 16],
    top(R) { R(5, 0, 6, 3, CORK); R(5, 0, 6, 1, CORKHI); },
    deco(R) { for (let y = 21; y >= 5; y--) { const s = (21 - y) / 16, x = Math.round(8 + Math.sin(s * Math.PI * 2.1 + .5) * 6.6) - 1, th = y > 12 ? 3 : 2;
      R(x - 1, y, th + 2, 1, '#2a0e3a'); R(x, y, th, 1, '#8a46b0'); R(x, y, 1, 1, '#c890ec'); if (y % 3 === 0) R(x + th - 1, y, 1, 1, '#ffd0ff'); } R(13, 4, 1, 1, '#7a3e98'); R(12, 3, 1, 1, '#b27ad6'); } },
  V4: { hw: [0, 0, 0, 2, 2, 2, 4, 5, 6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 3], l0: 7, l1: 20, g: [8, 15],
    top(R) { R(6, 0, 4, 3, '#6a7482'); R(7, 0, 2, 1, '#d0d8e0'); R(6, 1, 1, 1, '#9aa4b2'); R(6, 2, 4, 1, '#3a4250'); },
    deco(R) { const s = 'rgba(255,242,176,.95)'; [[7, 11], [8, 11], [7, 12], [8, 12], [6, 13], [9, 13], [7, 14], [8, 14], [5, 12], [10, 12]].forEach(([x, y]) => R(x, y, 1, 1, s)); R(4, 9, 8, 1, 'rgba(200,210,224,.7)'); } }
};
function drawVialV(cv, hp, p, vs) {
  if (vs === 'V0') { drawVial(cv, hp, p); return; }
  const sp = VSPEC[vs]; cv.width = 16; cv.height = 22; const ctx = cv.getContext('2d'), R = pen(ctx);
  const t = Math.max(0, Math.min(1, hp / 60)), lo = [44, 104, 70], hi = [94, 242, 160], c = lo.map((v, i) => Math.round(v + (hi[i] - v) * t));
  const col = 'rgb(' + c + ')', colHi = 'rgb(' + c.map((v) => Math.min(255, v + 50)) + ')', colLo = 'rgb(' + c.map((v) => Math.round(v * .78)) + ')';
  const glass = 'rgba(220,245,235,.85)', glassD = 'rgba(160,200,190,.55)', empty = 'rgba(10,24,20,.72)';
  const HW = sp.hw, Lr = sp.l1 - sp.l0 + 1, filled = Math.round(t * Lr), base = HW.length - 1;
  for (let y = 0; y < HW.length; y++) { const hw = HW[y]; if (!hw) continue; const x0 = 8 - hw, x1 = 7 + hw, prev = y ? HW[y - 1] : 0;
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === base || prev < hw && (x < 8 - prev || x > 7 + prev) && y >= sp.l0 - 1 || !prev;
      if (edge) { R(x, y, 1, 1, x === x1 ? glassD : glass); continue; }
      let f = empty; if (y >= sp.l0 && y <= sp.l1) { const k = sp.l1 - y; if (k < filled) f = k === filled - 1 ? colHi : Math.floor(k / (Lr / 6)) % 2 ? col : colLo; }
      R(x, y, 1, 1, f); } }
  for (let y = sp.g[0]; y <= sp.g[1]; y++) if (HW[y] >= 3) R(9 - HW[y], y, 1, 1, 'rgba(255,255,255,.32)');
  if (filled > 3) { R(8, sp.l1 - 1, 1, 1, colHi); R(7, sp.l1 - 3, 1, 1, colHi); }
  for (let b = 1; b < 6; b++) { const y = sp.l1 - Math.round(b * Lr / 6) + 1; R(7 + HW[y], y, 1, 1, 'rgba(240,255,250,.95)'); }
  sp.deco(R); sp.top(R);
  if (hp < 15) { const k = '#f4fff9', kd = '#06100c', y0 = sp.l0 + 1; let x = 9 - HW[y0];
    for (let i = 0; i < 8; i++) { const y = y0 + i; R(x, y, 1, 1, k); if (i % 3 === 2) { R(x + 1, y, 1, 1, kd); x++; } if (i % 2) x++; }
    R(7 + HW[y0 + 2] - 2, y0 + 2, 1, 1, k); R(7 + HW[y0 + 3] - 2, y0 + 3, 1, 1, k); R(7 + HW[y0 + 4] - 1, y0 + 4, 1, 1, k); }
}

/* the heaps */
const HEAPS = {
  H4: ['Pile', 'The rune pile from round two, with smaller runes stacked as a proper pyramid that grows a stone at a time: six on the bottom row up to one on top, 21 runes at its fullest. Each new rune drops onto the pile.'],
  H5: ['Pile and stacks', 'The same pile in front. Behind it, a tall tower of rune stones rises for every 500 runes, so a big hoard still shows at a glance.'],
  H2: ['Stacks (round three)', 'Round three’s towers, kept here to compare.']
};
const RCOL = [['#7a8a98', '#aebccc'], ['#4a5460', '#76828f'], ['#2a2632', '#5a5470'], ['#c8a46a', '#ecd09a'], ['#c8705e', '#f0a492']];
const SPOTS = [[0, 0], [1, 0], [.5, 1], [2, 0], [1.5, 1], [1, 2], [3, 0], [2.5, 1], [-1, 0]];
function sprite(box, src, x, b, s, z, cls) { const i = el('img', cls || ''); i.src = src; i.alt = ''; i.style.cssText = 'left:' + Math.round(x) + 'px;bottom:' + Math.round(b) + 'px;width:' + s + 'px;height:' + s + 'px;z-index:' + z; box.insertBefore(i, box.querySelector('.hn')); return i; }
function chest(R, x, y, open, r) {
  const wd = '#6e4020', hi = '#a0642e', lo = '#3a1e0c', ir = '#2e3238', irH = '#8a949c', gd = '#ffd56a';
  if (open) { R(x + 1, y - 3, 10, 3, lo); R(x + 1, y - 3, 10, 1, wd); R(x + 2, y - 3, 1, 3, ir); R(x + 9, y - 3, 1, 3, ir);
    for (let i = 0; i < 12; i++) { const h = Math.max(1, Math.round(3 - Math.abs(i - 5.5) / 2.2)); for (let k = 0; k < h; k++) { const rc = RCOL[Math.floor(r() * 5)]; R(x + i, y + 2 - k, 1, 1, r() < .2 ? gd : rc[k === h - 1 ? 1 : 0]); } }
    R(x, y + 3, 12, 7, wd); R(x, y + 3, 12, 1, hi); R(x + 3, y + 4, 1, 2, RCOL[3][1]); R(x + 8, y + 4, 1, 3, RCOL[4][0]); }
  else { R(x + 1, y, 10, 1, hi); R(x, y + 1, 12, 3, wd); R(x, y + 1, 12, 1, hi); R(x, y + 4, 12, 6, wd); R(x, y + 4, 12, 1, lo); }
  R(x, y + 9, 12, 1, lo); R(x + 2, y + (open ? 3 : 0), 1, open ? 7 : 10, ir); R(x + 9, y + (open ? 3 : 0), 1, open ? 7 : 10, ir); R(x + 2, y + (open ? 3 : 1), 1, 1, irH); R(x + 9, y + (open ? 3 : 1), 1, 1, irH);
  R(x + 5, y + 4, 2, 2, gd); R(x + 5, y + 5, 2, 1, '#b08a2a');
}
function urn(R, x, y, r, p) {
  const W = [7, 5, 5, 7, 9, 9, 9, 9, 9, 7, 7, 5, 3, 5], t = '#a0562e', th = '#d0804a', tl = '#5a2a14';
  W.forEach((w, k) => { const xs = x + (9 - w) / 2; R(xs, y + k, w, 1, k === 0 ? th : t); R(xs, y + k, 1, 1, th); R(xs + w - 1, y + k, 1, 1, tl); });
  for (let i = 1; i < 8; i += 2) R(x + i, y + 5, 1, 1, p.glow);
  R(x, y + 6, 9, 1, tl);
  for (let i = 0; i < 5; i++) R(x + 2 + i, y - 1 - (i % 2), 1, 1 + (i % 2), r() < .3 ? '#ffd56a' : RCOL[Math.floor(r() * 5)][1]);
}
const PILE_AT = [1, 20, 50, 90, 140, 200, 280, 380, 500, 650, 850, 1100, 1400, 1750, 2150, 2600, 3100, 3600, 4100, 4600, 5000];
const PILE_ROWS = [[], [1], [2], [2, 1], [3, 1], [3, 2], [3, 2, 1], [4, 2, 1], [4, 3, 1], [4, 3, 2], [4, 3, 2, 1], [5, 3, 2, 1], [5, 4, 2, 1], [5, 4, 3, 1], [5, 4, 3, 2], [5, 4, 3, 2, 1], [6, 4, 3, 2, 1], [6, 5, 3, 2, 1], [6, 5, 4, 2, 1], [6, 5, 4, 3, 1], [6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 1]];
function pileHeap(box, hs, a, p, drop) {
  box.querySelectorAll('canvas.hb,img').forEach((e) => e.remove());
  const ones = window.RUNES.ones, n = PILE_AT.filter((t) => a >= t).length, rows = PILE_ROWS[n], SZ = 30, DX = 19, DY = 11;
  box.querySelector('.glowb').style.opacity = Math.min(1, .2 + n / 18).toFixed(2);
  box.querySelector('.hn').textContent = a.toLocaleString('en-GB');
  let towers = 0;
  if (hs === 'H5') { towers = Math.min(6, Math.floor(a / 500));
    if (towers) { const cv = el('canvas', 'hb'); cv.width = 44; cv.height = 32; box.insertBefore(cv, box.firstChild);
      const R = pen(cv.getContext('2d')), xs = [16, 24, 8, 32, 2, 38];
      for (let i = 0; i < towers; i++) { const x = xs[i], tall = 11 + ((i * 5) % 4);
        for (let k = 0; k < tall; k++) { const rc = RCOL[(i + k) % 5], y = 24 - 2 * k; R(x, y, 5, 2, sink(rc[0], .25)); R(x, y, 5, 1, sink(rc[1], .2)); if (k % 3 === 1) R(x + 2, y + 1, 1, 1, '#c8a040'); }
        R(x + 1, 24 - 2 * tall, 3, 1, p.glow); } } }
  let i = 0, last = null;
  rows.forEach((cnt, row) => { for (let c = 0; c < cnt; c++, i++) {
    const x = 66 - SZ / 2 + (c - (cnt - 1) / 2) * DX + ((i * 7) % 3 - 1) * 2, b = 12 + row * DY + ((i * 5) % 2);
    last = sprite(box, ones[(i * 3 + row) % 5].src, x, b, SZ, 4 + row, ''); last.style.transform = 'rotate(' + (((i * 37) % 13) - 6) + 'deg)'; } });
  if (drop && last) last.classList.add('drop');
  return n + ' rune' + (n === 1 ? '' : 's') + ' in the pile' + (towers ? ', ' + towers + ' tower' + (towers > 1 ? 's' : '') + ' behind' : '');
}
function buildHeap(box, hs, a, p, drop) {
  if (hs === 'H4' || hs === 'H5') return pileHeap(box, hs, a, p, drop);
  box.querySelectorAll('canvas.hb,img').forEach((e) => e.remove());
  const cv = el('canvas', 'hb'); cv.width = 44; cv.height = 32; box.insertBefore(cv, box.querySelector('.hn'));
  const R = pen(cv.getContext('2d')), r = rng(7), ones = window.RUNES.ones;
  box.querySelector('.glowb').style.opacity = Math.min(1, .15 + a / 2500).toFixed(2);
  box.querySelector('.hn').textContent = a.toLocaleString('en-GB');
  let said = '';
  if (hs === 'H1') {
    const c = a < 250 ? 0 : a < 750 ? 1 : a < 1500 ? 2 : a < 3000 ? 3 : 4, CH = [[0, 19], [32, 19], [0, 8], [32, 8]];
    for (let i = 0; i < c; i++) chest(R, CH[i][0], CH[i][1] + (i === c - 1 ? 0 : 0), i === c - 1, r);
    const f = a <= 0 ? 0 : a < 30 ? 1 : a < 80 ? 2 : a < 200 ? 3 : a < 400 ? 4 : a < 900 ? 5 : a < 1800 ? 6 : 7;
    const sp = SPOTS.slice(0, f), xs = sp.map((s) => s[0]), mid = f ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
    sp.forEach(([cx, cy], i) => sprite(box, ones[(i * 3 + Math.floor(cx * 2)) % 5].src, 66 - 18 + (cx - mid) * 14, 12 + cy * 9, 36, 5 - Math.floor(cy), drop && i === f - 1 ? 'drop' : ''));
    said = c ? c + ' chest' + (c > 1 ? 's' : '') + ' behind ' + f + ' runes' : f + ' rune' + (f === 1 ? '' : 's') + ', no chest yet';
  } else if (hs === 'H2') {
    const big = Math.min(6, Math.floor(a / 500)), slabs = big >= 6 ? 0 : Math.min(20, Math.ceil((a % 500) / 25));
    const bs = Math.round(22 - (big * 7 - 2) / 2);
    for (let i = 0; i < big; i++) { const x = bs + i * 7, n = 10 + ((i * 3) % 3);
      for (let j = 0; j < n; j++) { const rc = RCOL[(i + j) % 5], y = 26 - 2 * j - 2; R(x, y, 5, 2, sink(rc[0], .3)); R(x, y, 5, 1, sink(rc[1], .3)); if (j % 2) R(x + 2, y + 1, 1, 1, '#c8a040'); } }
    const sn = Math.ceil(slabs / 5), ss = Math.round(22 - (sn * 10 - 2) / 2);
    for (let j = 0; j < slabs; j++) { const s = Math.floor(j / 5), k = j % 5, x = ss + s * 10 + (k % 2), y = 26 - 2 * k, rc = RCOL[(j * 2) % 5];
      R(x, y, 8, 2, rc[0]); R(x, y, 8, 1, rc[1]); R(x + 3 + (k % 2), y + 1, 1, 1, '#ffd56a'); }
    if (drop && slabs) cv.classList.add('drop');
    said = big + ' tall stack' + (big === 1 ? '' : 's') + ' and ' + slabs + ' loose stone' + (slabs === 1 ? '' : 's');
  } else {
    const fr = a <= 0 ? 0 : Math.min(1, Math.log10(a + 1) / Math.log10(5001)), w = Math.round(8 + 34 * fr), h = Math.round(w * .36), u = a < 800 ? 0 : a < 1800 ? 1 : a < 3500 ? 2 : 3;
    const UR = [[1, 13], [34, 13], [17, 4]]; for (let i = 0; i < u; i++) urn(R, UR[i][0], UR[i][1], r, p);
    if (a > 0) { const cx = 22; for (let x = Math.round(cx - w / 2); x < cx + w / 2; x++) { const q = (x + .5 - cx) / (w / 2), hh = Math.max(1, Math.round(h * Math.sqrt(Math.max(0, 1 - q * q))));
      for (let k = 0; k < hh; k++) { const rc = RCOL[Math.floor(r() * 5)]; R(x, 31 - k, 1, 1, k === hh - 1 ? rc[1] : k < 2 ? sink(rc[0], .35) : rc[0]); } }
      const gl = Math.min(30, 2 + Math.round(fr * 24)); for (let i = 0; i < gl; i++) { const x = cx - w / 2 + r() * w, q = (x - cx) / (w / 2), top = h * Math.sqrt(Math.max(0, 1 - q * q)); R(x, 31 - r() * Math.max(1, top - 1), 1, 1, i % 3 ? '#ffd56a' : p.glow); } }
    const s = a <= 0 ? 0 : a < 300 ? 1 : a < 1500 ? 2 : 3, off = [0, -22, 22];
    for (let i = 0; i < s; i++) sprite(box, ones[(i * 2 + 1) % 5].src, 66 - 18 + off[i] * Math.max(.5, fr), 12 + h * 3 - 14 - (i ? 6 : 0), 36, 5 - (i ? 1 : 0), drop && i === s - 1 ? 'drop' : '');
    said = 'a mound ' + w + ' stones wide' + (u ? ', ' + u + ' urn' + (u > 1 ? 's' : '') : '');
  }
  return said;
}
function heapBox() { const b = el('div', 'heap', '<div class="glowb"></div><span class="hn"></span>'); return b; }
/* ---------- glue for the game (not in the mock-up) ---------- */
const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const CAND = [['left', '138px', 'bottom', '22px'], ['right', '30%', 'bottom', '22px'], ['right', '62px', 'bottom', '22px']];
function css() { if (document.getElementById('lair-css')) return; const s = document.createElement('style'); s.id = 'lair-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
function mount(ban) {
  css(); if (ban.querySelector('.lz-wrap')) return;
  const w = el('div', 'lz-wrap lzb'); w.setAttribute('aria-hidden', 'true');
  w.innerHTML = '<div class="lay shafts"></div><div class="moon"><canvas></canvas></div><canvas class="lay ruins"></canvas><div class="lay tint"></div><div class="lay tide"></div><div class="lay bubs"></div><canvas class="lay shade"></canvas>' +
    '<div class="obj vial"><canvas></canvas><b></b></div>' + CAND.map((c) => '<div class="obj cand" style="' + c[0] + ':' + c[1] + ';' + c[2] + ':' + c[3] + '"><i></i><b></b></div>').join('') + '<div class="lay flash"></div>';
  const hp = heapBox(); hp.classList.add('obj'); w.insertBefore(hp, w.querySelector('.vial'));
  const bubs = w.querySelector('.bubs'); for (let i = 0; i < 9; i++) { const b = el('i'); const z = 3 + (i * 7) % 6; b.style.cssText = 'left:' + ((i * 37 + 26) % 97) + '%;width:' + z + 'px;height:' + z + 'px;animation-duration:' + (6 + (i * 5) % 7) + 's;animation-delay:-' + (i * 1.3) + 's'; bubs.appendChild(b); }
  ban.insertBefore(w, ban.firstChild); ban.classList.add('lz');
}
const KEY = new WeakMap();
function paint(ban, s) {
  const w = ban.querySelector('.lz-wrap'); if (!w) return; s = s || {};
  const time = PALS[s.time] ? s.time : 'day', p = PALS[time], phase = s.phase === 'half' || s.phase === 'dark' ? s.phase : 'full';
  const mx = Math.max(1, +s.maxHp || 60), hp60 = Math.max(0, Math.min(60, Math.round(60 * (+s.hp || 0) / mx))), runes = Math.max(0, Math.round(+s.runes || 0));
  ['top', 'bot', 'shaft', 'g', 'mg'].forEach((k) => w.style.setProperty('--' + k, p[k]));
  w.style.setProperty('--lit', phase === 'full' ? 1 : phase === 'half' ? .55 : .2);
  const tint = w.querySelector('.tint'); tint.style.background = 'radial-gradient(ellipse at 50% 30%, rgba(' + p.g + ',.2), rgba(' + p.g + ',0) 75%)'; tint.style.opacity = phase === 'full' ? 1 : phase === 'half' ? .3 : 0;
  w.classList.toggle('mdark', phase === 'dark'); w.classList.toggle('unlit', phase === 'dark');
  const bw = ban.clientWidth || 390, scene = [time, phase, bw].join('|'), k = scene + '|' + hp60 + '|' + (+s.hp || 0) + '|' + mx + '|' + runes, old = KEY.get(ban) || '';
  if (old.split('|').slice(0, 3).join('|') !== scene) {   // the scenery is drawn again only when the time, the moon or the width changes
    const ru = w.querySelector('.ruins'), W = Math.ceil(bw / 3); ru.width = W; ru.height = 57; ru.style.width = W * 3 + 'px'; const ctx = ru.getContext('2d'); ctx.clearRect(0, 0, W, 57); RUINS[2](ctx, W, p);
    const mb = w.querySelector('.moon'); drawMoon(mb.querySelector('canvas'), mb.offsetWidth || 336, phase, p, 'M2'); mb.className = 'moon ph-' + phase;
  }
  if (old !== k || s.drop) { buildHeap(w.querySelector('.heap'), 'H4', runes, p, !!s.drop && !RM());
    const v = w.querySelector('.vial'), vc = v.querySelector('canvas'); drawVialV(vc, hp60, p, 'V1'); v.querySelector('b').innerHTML = (+s.hp || 0) + '<small>/' + mx + '</small>'; v.classList.toggle('low', hp60 < 15);
    vc.style.filter = 'drop-shadow(0 0 ' + Math.round(3 + 7 * hp60 / 60) + 'px rgba(94,242,160,' + ((hp60 / 60) * .9).toFixed(2) + '))'; v.style.setProperty('--vg', hp60 < 15 ? '163,32,42' : '94,242,160'); }
  if (!w.classList.contains('flood')) w.querySelector('.tide').style.height = Math.round(150 * Math.max(0, Math.min(1, +s.tide || 0))) + 'px';
  KEY.set(ban, k); shade(w, phase, bw);
}
function shade(w, phase, bw) {
  const sh = w.querySelector('.shade'), h = 171; sh.width = bw; sh.height = h; sh.style.width = bw + 'px'; sh.style.height = h + 'px';
  const ctx = sh.getContext('2d'); ctx.clearRect(0, 0, bw, h); const a = phase === 'full' ? 0 : phase === 'half' ? .34 : .62; if (!a) return;
  ctx.fillStyle = 'rgba(4,4,10,' + a + ')'; ctx.fillRect(0, 0, bw, h); if (phase !== 'dark') return; const br = w.getBoundingClientRect();
  w.querySelectorAll('.cand').forEach((c) => { const r = c.getBoundingClientRect(), x = r.left - br.left + 6, y = r.top - br.top + 6;
    ctx.globalCompositeOperation = 'destination-out'; let g = ctx.createRadialGradient(x, y, 4, x, y, 62); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, bw, h);
    ctx.globalCompositeOperation = 'source-over'; g = ctx.createRadialGradient(x, y, 2, x, y, 58); g.addColorStop(0, 'rgba(255,170,70,.32)'); g.addColorStop(1, 'rgba(255,170,70,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, bw, h); }); }
// a level up floods the band with the tide and a flash; a slip shakes the flask
function level(ban) { const w = ban.querySelector('.lz-wrap'); if (!w || RM()) return; const t = w.querySelector('.tide'), f = w.querySelector('.flash'), was = t.style.height;
  w.classList.add('flood'); t.style.height = '190px'; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); setTimeout(() => { w.classList.remove('flood'); t.style.height = was; }, 1500); }
function slip(ban) { const v = ban.querySelector('.lz-wrap .vial'); if (!v || RM()) return; v.classList.remove('shake'); void v.offsetWidth; v.classList.add('shake'); }
// the time of day for an hour: morning before 10, day until 5 pm, evening until 9 pm, then night
const timeOf = (h) => (h >= 21 || h < 5 ? 'night' : h < 10 ? 'morning' : h < 17 ? 'day' : 'evening');
window.LAIR = { mount, paint, level, slip, timeOf, PALS };

})();
