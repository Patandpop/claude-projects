/* The level-up moment (1U.11, Patryk's pick 30 Oct: LU-X2 "The Sky Answers"): up from the deep, stars rush in from
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
/* helpers */
const cl = (x) => x < 0 ? 0 : x > 1 ? 1 : x, seg = (t, a, b) => cl((t - a) / (b - a)), lerp = (a, b, p) => a + (b - a) * p;
const eo = (x) => 1 - (1 - x) ** 3, ei = (x) => x ** 3, eio = (x) => x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
function R(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }
function pline(c, x0, y0, x1, y1, col, frac = 1) {
  const n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0, m = Math.floor(n * frac); c.fillStyle = col;
  for (let i = 0; i <= m; i++) c.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
}
const F3 = { L: ['100','100','100','100','111'], E: ['111','100','110','100','111'], V: ['101','101','101','101','010'], ' ': ['000','000','000','000','000'],
  0: ['111','101','101','101','111'], 1: ['010','110','010','010','111'], 2: ['111','001','111','100','111'], 3: ['111','001','111','001','111'], 4: ['101','101','111','001','001'],
  5: ['111','100','111','001','111'], 6: ['111','100','111','101','111'], 7: ['111','001','001','001','001'], 8: ['111','101','111','101','111'], 9: ['111','101','111','001','111'] };
const F5 = { 0: ['01110','10001','10011','10101','11001','10001','01110'], 1: ['00100','01100','00100','00100','00100','00100','01110'], 2: ['01110','10001','00001','00010','00100','01000','11111'],
  3: ['11110','00001','00001','01110','00001','00001','11110'], 4: ['00010','00110','01010','10010','11111','00010','00010'], 5: ['11111','10000','11110','00001','00001','10001','01110'],
  6: ['00110','01000','10000','11110','10001','10001','01110'], 7: ['11111','00001','00010','00100','01000','01000','01000'], 8: ['01110','10001','10001','01110','10001','10001','01110'], 9: ['01110','10001','10001','01111','00001','00010','01100'] };
function ptext(c, str, cx, y, s, col, shadow) {
  const w = str.length * 4 * s - s; let x = Math.round(cx - w / 2);
  for (const ch of str) { const g = F3[ch]; for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) if (g[r][k] === '1') {
    if (shadow) px(c, x + k * s, y + r * s + s, s, s, shadow); px(c, x + k * s, y + r * s, s, s, col); } x += 4 * s; }
}
function tinted(im, col, a) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, 64, 64); return cv; }
/* the quiet heal beat: a small flask and bar ticking to full, top-left */
function heal(c, t, start) {
  if (t < start) return; c.save(); c.globalAlpha = seg(t, start, start + 300);
  const f = lerp(.3, 1, eio(seg(t, start + 300, start + 1000)));
  const fl = ['0110','0110','1111','1111','1111','0110'];
  px(c, 5, 5, 46, 10, 'rgba(2,8,6,.65)');
  for (let r = 0; r < 6; r++) for (let k = 0; k < 4; k++) if (fl[r][k] === '1') px(c, 7 + k, 7 + r, 1, 1, r < 2 ? '#cfe9df' : '#5ef2a0');
  px(c, 13, 8, 35, 5, '#2f4a40'); px(c, 14, 9, 33, 3, '#0a1a14'); px(c, 14, 9, Math.round(33 * f), 3, '#5ef2a0'); px(c, 14, 9, Math.round(33 * f), 1, '#bff7e6');
  const g = seg(t, start + 1000, start + 1400); if (g > 0 && g < 1) px(c, 14 + Math.round(32 * g), 8, 1, 5, '#ffffff');
  c.restore();
}


/* sprite bounds (found once the sprite loads) so crowns and tentacles sit on the real body */
const BB = {};
function bbox(k) {
  if (BB[k]) return BB[k]; const im = IMG[k]; if (!ok(im)) return { x0: 18, x1: 46, y0: 14, y1: 60 };
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, 64, 64).data; let x0 = 64, x1 = 0, y0 = 64, y1 = 0;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (d[(y * 64 + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return (BB[k] = { x0, x1, y0, y1 });
}
const bump = (t, T, up, down) => seg(t, T, T + up) * (1 - seg(t, T + up, T + up + down));

/* ============ the shared Breach, with hooks for each variation ============ */
function makeBreach(o) {
  const r = R(o.seed || 7);
  const stars = [...Array(95)].map(() => ({ x: r() * W | 0, y: r() * 124 | 0, p: r() * 6.28, b: r() }));
  const bub = [...Array(30)].map(() => ({ x: r() * W | 0, s: .04 + r() * .05, p: r() * 400, z: r() < .3 ? 2 : 1 }));
  const mk = (n, vmin, vmax, spread) => [...Array(n)].map(() => { const a = -Math.PI / 2 + (r() - .5) * spread, v = vmin + r() * (vmax - vmin); return { vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: r() < .3 ? 2 : 1, w: r() < .5 }; });
  const drops = mk(o.drops || 56, 50, o.dropV || 150, 1.9), drops2 = mk(24, 30, 80, 2.2);
  const DW = o.DW || 22, DH = o.DH || 38, GAP = o.GAP || 16, top = o.top || 10, digs = String(LEVEL).split('');
  const tot = digs.length * DW + (digs.length - 1) * GAP, sx = (W - tot) / 2;
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  const ENDS = { a: ['TL','TR'], b: ['TR','MR'], c: ['MR','BR'], d: ['BL','BR'], e: ['ML','BL'], f: ['TL','ML'], g: ['ML','MR'] };
  const nodes = [], segs = [];
  digs.forEach((d, i) => {
    let ox = sx + i * (DW + GAP); if (d === '1') ox -= DW / 2 - 2;
    const P = {}; const at = (k, x, y) => { if (!P[k]) { P[k] = { x: Math.round(x + (r() - .5) * 4), y: Math.round(y + (r() - .5) * 4) }; nodes.push(P[k]); } return P[k]; };
    const pos = { TL: [0, 0], TR: [DW, 0], ML: [0, DH / 2], MR: [DW, DH / 2], BL: [0, DH], BR: [DW, DH] };
    if (d === '1') { const a = at('F', ox + DW - 9, top + 8), b = at('TR', ox + DW, top); segs.push([a, b]); }
    for (const s of SEG[d]) { const [u, v] = ENDS[s]; segs.push([at(u, ox + pos[u][0], top + pos[u][1]), at(v, ox + pos[v][0], top + pos[v][1])]); }
  });
  const S = { nodes, segs, top, DH, DW, r };
  const T = Object.assign({ nodes: 2100, lines: 2450, linesDur: 1100, climax: 3500, star: 3520, level: 3600, heal: 4100 }, o.T || {});
  const uyDefault = (t, a) => t < 1400 ? lerp(160, 134, eo(seg(t, 0, 1400))) : t < 1750 ? lerp(134, 28, eo(seg(t, 1400, 1750)))
    : t < 1920 ? 28 - 3 * Math.sin(Math.PI * seg(t, 1750, 1920)) : t < 2250 ? lerp(28, 104, ei(seg(t, 1920, 2250)))
    : t < 2700 ? lerp(104, 92, eo(seg(t, 2250, 2700))) : 92 + Math.round(Math.sin(a / 520) * 1.5);
  const uyf = o.uy || uyDefault;
  if (o.init) o.init(S);

  return (c, t, a) => {
    c.save();
    if (o.shake) { const k = o.shake(t); if (k > 0) c.translate(Math.round((Math.random() - .5) * 2 * k), Math.round((Math.random() - .5) * 2 * k)); }
    const surf = Math.round(lerp(-30, 128, eio(seg(t, 150, 1550)))), off = surf - 128;
    const climax = o.climax ? o.climax(t) : seg(t, T.climax, T.climax + 150) * (1 - seg(t, T.climax + 150, T.climax + 600));
    const E = { surf, off, climax, uy: uyf(t, a) };
    // sky
    const SKY = ['#03050f', '#050a1a', '#081028', '#0b1733', '#0f1f3d', '#13284a'];
    for (let i = 0; i < 6; i++) { const y0 = off + i * 22, y1 = i === 5 ? surf : off + i * 22 + 22; if (y1 > 0) px(c, 0, Math.max(0, y0), W, Math.min(y1, surf) - Math.max(0, y0), SKY[i]); }
    if (climax > 0) { c.fillStyle = 'rgba(120,170,255,' + .12 * climax + ')'; c.fillRect(0, 0, W, Math.max(0, surf)); }
    if (o.sky) o.sky(c, t, a, E, S);
    for (const s of stars) { const y = s.y + off; if (y >= surf - 1 || y < 0) continue; const tw = .45 + .55 * Math.sin(a / 380 + s.p);
      c.globalAlpha = cl(tw * (.4 + s.b * .6) + climax * .4); px(c, s.x, y, 1, 1, s.b > .8 ? '#ffffff' : '#9fb4d8');
      if (s.b > .93) { px(c, s.x - 1, y, 1, 1, '#6c7fb0'); px(c, s.x + 1, y, 1, 1, '#6c7fb0'); } }
    c.globalAlpha = 1;
    // constellation lines
    const n = segs.length, dt = T.linesDur / n, snap = o.snap ? o.snap(t) : 0;
    segs.forEach(([p, q], k) => { const f = seg(t, T.lines + k * dt, T.lines + (k + 1) * dt); if (f <= 0) return;
      c.globalAlpha = .85; const col = snap > .05 ? '#fff1c2' : climax > .05 ? '#ffffff' : '#8fc4ff';
      pline(c, p.x, p.y + off, q.x, q.y + off, col, f);
      const g = Math.max(climax, snap); if (g > 0) { c.globalAlpha = (snap ? .8 : .35) * g; const gc = snap ? '#ffd56a' : '#bfe0ff';
        pline(c, p.x + 1, p.y + off, q.x + 1, q.y + off, gc, f); pline(c, p.x, p.y + off + 1, q.x, q.y + off + 1, gc, f);
        if (snap) { c.globalAlpha = .35 * g; pline(c, p.x - 1, p.y + off, q.x - 1, q.y + off, gc, f); pline(c, p.x, p.y + off - 1, q.x, q.y + off - 1, gc, f); } } });
    c.globalAlpha = 1;
    nodes.forEach((p, i) => { const y = p.y + off; if (y >= surf) return; const b = seg(t, T.nodes + i * 35, T.nodes + 250 + i * 35);
      const tw = .7 + .3 * Math.sin(a / 300 + i);
      if (b <= 0) { if (!o.hideIdleNodes) { c.globalAlpha = .55; px(c, p.x, y, 1, 1, '#c9d6f0'); c.globalAlpha = 1; } return; }
      c.globalAlpha = .25 * b * tw + .3 * climax; px(c, p.x - 2, y - 2, 5, 5, snap > .05 ? '#ffd56a' : '#8fc4ff');
      c.globalAlpha = b; px(c, p.x - 1, y, 3, 1, '#ffffff'); px(c, p.x, y - 1, 1, 3, '#ffffff');
      const big = Math.max(climax, snap); if (big > .2) { const L = 3 + Math.round(2 * big); px(c, p.x - L, y, 2 * L + 1, 1, '#dff0ff'); px(c, p.x, y - L, 1, 2 * L + 1, '#dff0ff'); }
      c.globalAlpha = 1; });
    if (o.mid) o.mid(c, t, a, E, S);
    // shooting star
    const ss = seg(t, T.star, T.star + 430); if (ss > 0 && ss < 1) { const x = lerp(250, -30, ss), y = lerp(4, 70, ss) + off;
      for (let i = 0; i < 16; i++) { c.globalAlpha = 1 - i / 16; px(c, x + i * 2, y - i * .45, i < 2 ? 2 : 1, 1, '#ffffff'); } c.globalAlpha = 1; }
    // LEVEL text
    const tl = seg(t, T.level, T.level + 350); if (tl > 0) { c.globalAlpha = tl; const ly = top + DH + (o.levelGap || 12) + off;
      if (o.levelPop) { const s = 1 + .5 * (1 - eo(seg(t, T.level, T.level + 300))); c.save(); c.translate(W / 2, ly + 5); c.scale(s, s); ptext(c, 'LEVEL ' + LEVEL, 0, -5, 2, '#ffd56a', '#3a2a08'); c.restore(); }
      else ptext(c, 'LEVEL ' + LEVEL, W / 2, ly, 2, '#ffd56a', '#3a2a08'); c.globalAlpha = 1; }
    // water body
    const WAT = ['#0a3d3a', '#08332f', '#062824', '#041e1b', '#031512', '#020d0b'];
    for (let i = 0; i < 6; i++) { const y0 = surf + i * 34; if (y0 < H) px(c, 0, Math.max(0, y0), W, 34, WAT[i]); }
    for (let k = 0; k < 3; k++) { const x = ((a / 40 + k * 90) % 300) - 40; c.fillStyle = 'rgba(120,240,200,.05)'; c.beginPath(); c.moveTo(x, surf); c.lineTo(x + 18, surf); c.lineTo(x - 40, H); c.lineTo(x - 70, H); c.fill(); }
    if (o.sea) o.sea(c, t, a, E, S);
    // Ulhu
    const uy = E.uy, mood = o.mood ? o.mood(t) : t < 1400 ? 'idle' : t < 2600 ? 'happy' : 'proud';
    if (o.behind) o.behind(c, t, a, E, S, mood);
    if (ok(IMG[mood])) c.drawImage(IMG[mood], 88, Math.round(uy), 64, 64);
    if (o.front) o.front(c, t, a, E, S, mood);
    // water veil over submerged part
    c.fillStyle = 'rgba(6,70,64,.62)'; c.fillRect(0, Math.max(0, surf + 1), W, H);
    if (o.seaOver) o.seaOver(c, t, a, E, S);
    if (surf < H) for (const b of bub) { const y = H + 10 - ((a * b.s + b.p + t * .08) % (H + 20)); if (y > surf + 2) { c.globalAlpha = .55; px(c, b.x + Math.round(Math.sin(a / 300 + b.p) * 2), y, b.z, b.z, '#9ff5d8'); } }
    c.globalAlpha = 1;
    const sl = o.surfCol || ['#bff7e6', '#4fbfa0'];
    if (surf > 0 && surf < H) for (let x = 0; x < W; x += 2) { const w = Math.sin(x / 9 + a / 260) > .2; px(c, x, surf + (w ? 0 : 1), 2, 1, w ? sl[0] : sl[1]); }
    if (t > T.lines + 50) { c.globalAlpha = .3 + .3 * climax; nodes.forEach((p, i) => { const y = surf + 4 + (p.y - top) * .5; if (y < H) px(c, p.x + Math.round(Math.sin(a / 200 + i) * 1.5), y, 2, 1, snap > .05 ? '#ffe7a0' : '#bfe0ff'); }); c.globalAlpha = 1; }
    for (const R0 of (o.ripples || [1420, 2250, 2700, 3600, 4500])) { const p = seg(t, R0, R0 + 1300); if (p <= 0 || p >= 1) continue;
      c.strokeStyle = 'rgba(191,247,230,' + (1 - p) * .7 + ')'; c.lineWidth = 1; c.beginPath(); c.ellipse(120, surf + 2, 10 + 120 * p, 2 + 6 * p, 0, 0, 7); c.stroke(); }
    if (o.spray) o.spray(c, t, a, E, S);
    else { const sp = seg(t, 1400, 1800); if (sp > 0 && sp < 1) { const h = 70 * Math.sin(Math.PI * sp);
      for (let y = 0; y < h; y += 2) { const w = Math.round((26 - y * .25) * (1 - sp * .5) + Math.sin(y + a / 40) * 3); c.globalAlpha = .75 * (1 - y / h); px(c, 120 - w / 2, surf - y - 2, w, 2, y % 4 ? '#d8fff2' : '#7ff0c8'); } c.globalAlpha = 1; } }
    const dc = o.dropCol || ['#e8fff8', '#7ff0c8'];
    const spl = (list, T0, k) => { const d = (t - T0) / 1000; if (d <= 0 || d > 1.6) return;
      for (const p of list) { const x = 120 + p.vx * d * k, y = surf + p.vy * d * k + 160 * d * d; if (y > surf + 1) continue; px(c, x, y, p.s, p.s, p.w ? dc[0] : dc[1]); } };
    spl(drops, 1420, o.dropK || 1); spl(drops2, o.splash2 || 2240, .8);
    if (o.over) o.over(c, t, a, E, S);
    c.restore();
    heal(c, t, T.heal);
  };
}


/* ============ LU-X2  The Sky Answers ============ */
const drawX2 = (() => {
  let rush = [];
  // three beats: da, da, DAAA
  const P = [3400, 3650, 3900];
  const pulses = (t) => Math.max(.7 * bump(t, P[0], 60, 200), .7 * bump(t, P[1], 60, 200), bump(t, P[2], 80, 700));
  return makeBreach({
    seed: 11, DW: 30, DH: 50, GAP: 20, top: 7, levelGap: 9,
    hideIdleNodes: true,
    T: { nodes: 2650, lines: 2850, linesDur: 500, climax: 3900, star: 3950, level: 3950, heal: 4350 },
    climax: pulses,
    init: (S) => { // a streaking star for every node, flying in from the edges
      rush = S.nodes.map((p, i) => { const side = i % 4, r = S.r;
        const from = side === 0 ? { x: -10, y: r() * 120 } : side === 1 ? { x: W + 10, y: r() * 120 } : side === 2 ? { x: r() * W, y: -10 } : { x: r() < .5 ? -10 : W + 10, y: 10 + r() * 40 };
        return { p, from, t0: 1900 + i * 30 + S.r() * 200 }; });
      // plus a crowd of extra stars that just join the sky
      for (let i = 0; i < 40; i++) { const r = S.r; rush.push({ p: { x: r() * W | 0, y: r() * 120 | 0 }, from: { x: r() < .5 ? -10 : W + 10, y: r() * 130 }, t0: 1900 + r() * 900, extra: true }); }
    },
    sky: (c, t, a, E) => { // aurora curtains dropping in
      const au = seg(t, 2100, 3000); if (au <= 0) return; const boost = 1 + 1.4 * pulses(t);
      const C = [['#5ef2a0', 12, 0], ['#8a6cff', 26, 2.1], ['#6fd8ff', 4, 4.2]];
      for (const [col, base, ph] of C) for (let x = 0; x < W; x += 2) {
        const y0 = base + Math.sin(x / 26 + a / 1100 + ph) * 9 + Math.sin(x / 9 + a / 500) * 2 + E.off;
        const len = (30 + 26 * Math.sin(x / 15 + a / 700 + ph)) * eo(au);
        for (let k = 0; k < len; k += 3) { c.globalAlpha = cl(.13 * boost * (1 - k / len) * au); px(c, x, y0 + k, 2, 3, col); }
      }
      c.globalAlpha = 1;
    },
    mid: (c, t, a, E) => {
      for (const s of rush) { const f = seg(t, s.t0, s.t0 + 600); if (f <= 0) continue;
        const e = eo(f), x = lerp(s.from.x, s.p.x, e), y = lerp(s.from.y, s.p.y, e) + E.off; if (y >= E.surf) continue;
        if (f < 1) { const x2 = lerp(s.from.x, s.p.x, eo(Math.max(0, f - .12))), y2 = lerp(s.from.y, s.p.y, eo(Math.max(0, f - .12))) + E.off;
          c.globalAlpha = .55; pline(c, x2, y2, x, y, s.extra ? '#9fb4d8' : '#bfe0ff'); }
        c.globalAlpha = s.extra ? .6 + .4 * Math.sin(a / 350 + s.p.x) : 1; px(c, x, y, 1, 1, '#ffffff'); }
      c.globalAlpha = 1;
      // a ring of light leaves the number on each beat
      P.forEach((T0, i) => { const p = seg(t, T0, T0 + 700); if (p <= 0 || p >= 1) return;
        c.strokeStyle = (i === 2 ? 'rgba(255,213,106,' : 'rgba(191,224,255,') + (1 - p) * .85 + ')'; c.lineWidth = i === 2 ? 2 : 1;
        c.beginPath(); c.ellipse(120, 32 + E.off, 20 + (i === 2 ? 150 : 90) * eo(p), 14 + (i === 2 ? 110 : 60) * eo(p), 0, 0, 7); c.stroke(); });
    },
    over: (c, t) => { const f = .15 * bump(t, P[0], 40, 160) + .15 * bump(t, P[1], 40, 160) + .32 * bump(t, P[2], 50, 500);
      if (f > 0) { c.fillStyle = 'rgba(210,230,255,' + f + ')'; c.fillRect(0, 0, W, H); } },
    shake: (t) => bump(t, 3900, 30, 260) * 2,
    levelPop: true
  });
})();


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
