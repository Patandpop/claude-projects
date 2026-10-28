/* ---------- round three ---------- */
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
const PALS = {};
TIMES.forEach(([k]) => { PALS[k] = [Object.assign({ name: 'Before' }, PAL[k])]; });
PALS.morning.push(mkPal('Sea glass', '#b4e6dc', '#245656', '#3c6460', '#d8fff4', '#7cd0a0', '#d8d6c0'), mkPal('Rose dawn', '#f2c0ac', '#2c4658', '#5a5462', '#ffe2d0', '#8cb890', '#ecd2c0'), mkPal('Pearl mist', '#d2dae6', '#2c3a4c', '#4c5a68', '#f0f6ff', '#88a8a0', '#dcdce4'));
PALS.day.push(mkPal('Kelp green', '#2e9068', '#06231b', '#21453a', '#6af5a8', '#46b870', '#d2cc9e'), mkPal('Turquoise', '#22a2aa', '#04262e', '#1e4a52', '#7af0ea', '#3eb8a0', '#d6e2d8'), mkPal('Jade deep', '#17684c', '#020e0a', '#173229', '#c8f060', '#5aa040', '#cfc48e'));
PALS.evening.push(mkPal('Honey amber', '#d8923e', '#2a1409', '#45301f', '#ffc060', '#9a9440', '#e6c8a0'), mkPal('Blood tide', '#c24a3c', '#1e0810', '#43222a', '#ff8a6a', '#8a6a3a', '#eab8a8'), mkPal('Violet dusk', '#9a5c9c', '#1a0c26', '#3a2848', '#ffb0e0', '#6a7a7a', '#e0c8e4'));
PALS.night.push(mkPal('Deep blue', '#22347a', '#03061a', '#141e44', '#8aa8ff', '#2c5c70', '#b8c6e2'), mkPal('Ink black', '#141c2c', '#020306', '#101622', '#5ad0c0', '#1e4a48', '#a8b0bc'), mkPal('Plankton', '#0c3040', '#01080c', '#0e2630', '#4af0e0', '#1a6a6a', '#b0dcdc'));

/* the moon; half has three new looks */
const MOONS = {
  M1: ['Gibbous', 'More than half lit, from the top right. The shadow is a soft curve sweeping across the band at a slant, so no straight line runs down behind Ulhu.'],
  M2: ['Crescent', 'A fat crescent lit from the top right, slanting across the band. The dark part still shows faintly, like moonlight on the water.'],
  M3: ['Veiled', 'The whole moon, dimmed, behind drifting bands of sea murk. No shadow line at all.']
};
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

/* ---------- the banner (B2 The Band only) ---------- */
const CAND = [['left', '138px', 'bottom', '22px'], ['right', '30%', 'bottom', '22px'], ['right', '62px', 'bottom', '22px']];
const main = document.getElementById('main');
const S = { time: 'day', phase: 'full', hp: 42, runes: 500, xp: 62, level: 7, mood: null, sayIx: 0, flooding: false, pal: { morning: 2, day: 3, evening: 3, night: 2 }, ms: 'M2', hs: 'H4', vs: 'V1' };
const P = () => PALS[S.time][S.pal[S.time]];
const sec = el('section', 'ver');
sec.innerHTML = '<h2><span class="tag">B2</span>The Band</h2><p>Only the middle band of a huge moon shows behind Ulhu. Heap on the left, vial on the right.</p>';
const phone = el('div', 'phone'), ban = el('div', 'ban v2');
ban.setAttribute('role', 'img'); ban.setAttribute('aria-label', 'The lair banner');
ban.innerHTML = '<div class="lay shafts"></div><button class="moon" type="button"><canvas></canvas></button>' +
  '<canvas class="lay ruins"></canvas><div class="lay tint"></div><div class="lay tide"></div><div class="lay bubs"></div><canvas class="lay shade"></canvas>' +
  '<div class="obj plq"><b class="num"></b><span class="t"><span class="ttl"></span><span class="tn"></span></span></div>' +
  '<div class="obj ulhu"><div class="in"></div></div><div class="obj vial"><canvas></canvas><b></b></div>' +
  CAND.map((c) => '<div class="obj cand" style="' + c[0] + ':' + c[1] + ';' + c[2] + ':' + c[3] + '"><i></i><b></b></div>').join('') +
  '<div class="obj scrap s-char"><div class="paper"><p></p></div></div><div class="lay flash"></div>';
const heap = heapBox(); heap.classList.add('obj'); ban.insertBefore(heap, ban.querySelector('.ulhu'));
phone.appendChild(ban);
const tabs = el('nav', 'tabs tb1');
['The Call', 'Grimoire', 'Omens', 'Den'].forEach((l, i) => { const b = el('button', 't' + i + (i ? '' : ' on'), l); b.type = 'button'; b.setAttribute('aria-pressed', String(!i));
  b.onclick = () => tabs.querySelectorAll('button').forEach((x, j) => { x.classList.toggle('on', j === i); x.setAttribute('aria-pressed', String(j === i)); }); tabs.appendChild(b); });
phone.appendChild(tabs); phone.appendChild(el('div', 'rows', '<div>Mark 9AS books</div><div>Plan Year 12 interference</div>'));
sec.appendChild(phone);
const q = (s) => ban.querySelector(s);
const moonB = q('.moon'), moonC = q('.moon canvas'), ruins = q('.ruins'), shade = q('.shade'), tide = q('.tide'), tint = q('.tint');
const plq = q('.plq'), ulhu = q('.ulhu'), vial = q('.vial'), scrap = q('.scrap'), ink = q('.paper p'), flash = q('.flash');
{ const bubs = q('.bubs'); for (let i = 0; i < 9; i++) { const b = el('i'); const z = 3 + (i * 7) % 6; b.style.cssText = 'left:' + ((i * 37 + 26) % 97) + '%;width:' + z + 'px;height:' + z + 'px;animation-duration:' + (6 + (i * 5) % 7) + 's;animation-delay:-' + (i * 1.3) + 's'; bubs.appendChild(b); } }

const chips = (key, list, cls, lab) => '<div class="seg ' + (cls || '') + '" data-k="' + key + '">' + (lab ? '<span class="lab">' + lab + '</span>' : '') + list.map(([v, l]) => '<button type="button" class="chip" data-' + key + '="' + v + '">' + l + '</button>').join('') + '</div>';
const ctl = el('div', 'ctl');
ctl.innerHTML =
  chips('time', TIMES, '', 'Time of day') +
  '<div id="palc"></div>' +
  chips('ph', [['full', 'Full'], ['half', 'Half'], ['dark', 'Dark']], '', 'Moon (or tap it in the banner)') +
  chips('ms', Object.keys(MOONS).map((k) => [k, k + ' ' + MOONS[k][0]]), '', 'Half moon look') +
  chips('hs', Object.keys(HEAPS).map((k) => [k, k + ' ' + HEAPS[k][0].split(' ')[0]]), '', 'Rune heap') +
  chips('ru', [[10, '10'], [100, '100'], [500, '500'], [2000, '2,000'], [5000, '5,000']], 'five') +
  '<div class="sl"><label for="r3-ru">Runes</label><input id="r3-ru" type="range" min="0" max="5000" step="10"><output></output></div>' +
  chips('vs', Object.keys(VIALS).map((k) => [k, k]), 'five', 'Vial (V0 is the old one)') +
  chips('hp', [[60, 'Full'], [30, 'Half'], [8, 'Low']]) +
  '<div class="sl"><label for="r3-hp">Health</label><input id="r3-hp" type="range" min="0" max="60" step="1"><output></output></div>' +
  '<div class="sl"><label for="r3-xp">XP tide</label><input id="r3-xp" type="range" min="0" max="100" step="1"><output></output></div>' +
  '<div class="acts"><button type="button" class="act tick">Tick</button><button type="button" class="act slip">Slip</button><button type="button" class="act lvl">Level up</button><button type="button" class="act say">New line</button></div>' +
  '<div class="readout"></div>';
sec.appendChild(ctl); main.appendChild(sec);
const ruI = ctl.querySelector('#r3-ru'), hpI = ctl.querySelector('#r3-hp'), xpI = ctl.querySelector('#r3-xp'), palc = ctl.querySelector('#palc');

function paintRuins() { const bw = ban.clientWidth || 400, W = Math.ceil(bw / 3); ruins.width = W; ruins.height = 57; ruins.style.width = W * 3 + 'px'; const ctx = ruins.getContext('2d'); ctx.clearRect(0, 0, W, 57); RUINS[2](ctx, W, P()); }
function paintShade() { const bw = ban.clientWidth || 400, h = 171; shade.width = bw; shade.height = h; shade.style.width = bw + 'px'; shade.style.height = h + 'px';
  const ctx = shade.getContext('2d'); ctx.clearRect(0, 0, bw, h); const a = S.phase === 'full' ? 0 : S.phase === 'half' ? .34 : .62; if (!a) return;
  ctx.fillStyle = 'rgba(4,4,10,' + a + ')'; ctx.fillRect(0, 0, bw, h);
  if (S.phase !== 'dark') return; const br = ban.getBoundingClientRect();
  ban.querySelectorAll('.cand').forEach((c) => { const r = c.getBoundingClientRect(), x = r.left - br.left + 6, y = r.top - br.top + 6;
    ctx.globalCompositeOperation = 'destination-out'; let g = ctx.createRadialGradient(x, y, 4, x, y, 62); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, bw, h);
    ctx.globalCompositeOperation = 'source-over'; g = ctx.createRadialGradient(x, y, 2, x, y, 58); g.addColorStop(0, 'rgba(255,170,70,.32)'); g.addColorStop(1, 'rgba(255,170,70,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, bw, h); }); }
function mood() { if (S.mood) return S.mood; if (S.time === 'night') return 'sleepy'; return S.hp < 15 ? 'sad' : 'idle'; }
function paintUlhu() { const m = mood(); ulhu.querySelector('.in').innerHTML = '<img src="' + ULHU[m] + '" alt="">' + (m === 'sleepy' ? '<span class="zz">z</span>' : ''); }
function paintPal() { const L = PALS[S.time]; palc.innerHTML = '<div class="seg two"><span class="lab">Colours for ' + S.time + '</span>' + L.map((p, i) => '<button type="button" class="chip" data-pal="' + i + '" aria-pressed="' + (S.pal[S.time] === i) + '">P' + i + ' ' + p.name + '</button>').join('') + '</div>'; }
let dropping = false;
function paintAll(drop) {
  const p = P();
  ['top', 'bot', 'shaft', 'g', 'mg'].forEach((k) => ban.style.setProperty('--' + k, p[k]));
  ban.style.setProperty('--lit', S.phase === 'full' ? 1 : S.phase === 'half' ? (S.ms === 'M3' ? .4 : .55) : .2);
  tint.style.background = 'radial-gradient(ellipse at 50% 30%, rgba(' + p.g + ',.2), rgba(' + p.g + ',0) 75%)'; tint.style.opacity = S.phase === 'full' ? 1 : S.phase === 'half' ? .3 : 0;
  ban.classList.toggle('mdark', S.phase === 'dark'); ban.classList.toggle('unlit', S.phase === 'dark');
  paintRuins();
  drawMoon(moonC, moonB.offsetWidth || 336, S.phase, p, S.ms); moonB.className = 'moon ph-' + S.phase; moonB.setAttribute('aria-label', S.phase + ' moon. Tap to change.');
  paintUlhu();
  const said = buildHeap(heap, S.hs, S.runes, p, drop);
  const vc = vial.querySelector('canvas'); drawVialV(vc, S.hp, p, S.vs); vial.querySelector('b').innerHTML = S.hp + '<small>/60</small>'; vial.classList.toggle('low', S.hp < 15);
  vc.style.filter = 'drop-shadow(0 0 ' + Math.round(3 + 7 * S.hp / 60) + 'px rgba(94,242,160,' + ((S.hp / 60) * .9).toFixed(2) + '))'; vial.style.setProperty('--vg', S.hp < 15 ? '163,32,42' : '94,242,160');
  plq.querySelector('.num').textContent = roman(S.level); plq.querySelector('.ttl').textContent = TITLES[S.level] || 'Ancient'; plq.querySelector('.tn').textContent = 'TIDE ' + S.xp + '%';
  if (!S.flooding) tide.style.height = Math.round(150 * S.xp / 100) + 'px';
  paintPal();
  [['time', S.time], ['ph', S.phase], ['ms', S.ms], ['hs', S.hs], ['vs', S.vs], ['ru', S.runes], ['hp', S.hp]].forEach(([k, v]) => ctl.querySelectorAll('[data-' + k + ']').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[k] === String(v)))));
  ruI.value = S.runes; hpI.value = S.hp; xpI.value = S.xp; ruI.nextElementSibling.textContent = S.runes.toLocaleString('en-GB'); hpI.nextElementSibling.textContent = S.hp + ' / 60'; xpI.nextElementSibling.textContent = S.xp + '%';
  ctl.querySelector('.readout').innerHTML = '<b>' + S.time[0].toUpperCase() + S.time.slice(1) + ' P' + S.pal[S.time] + '</b> ' + p.name + ', <b>' + (S.phase === 'half' ? S.ms + ' ' + MOONS[S.ms][0].toLowerCase() + ' half' : S.phase) + '</b> moon, <b>' + S.hs + '</b> ' + said + ', <b>' + S.vs + '</b> ' + VIALS[S.vs][0].toLowerCase() + (S.hp < 15 ? ', cracked' : '') + '.';
  paintShade(); syncGal();
}

let typeT = 0, holdT = 0, moodT = 0;
function write(line) { clearInterval(typeT); clearTimeout(holdT); scrap.classList.remove('gone'); ink.textContent = ''; line = line.replace('{n}', '3');
  if (RM) { ink.textContent = line; return; }
  let i = 0; typeT = setInterval(() => { const s = el('span'); s.textContent = line[i]; ink.appendChild(s); i++; if (i >= line.length) { clearInterval(typeT); holdT = setTimeout(() => scrap.classList.add('gone'), 5200); } }, 34); }
function pick(k) { const L = SAYS[k]; S.sayIx++; return L[(S.sayIx * 7 + 6) % L.length]; }
function ambient() { return S.hp < 15 ? 'lowhp' : S.phase === 'dark' ? 'off' : S.time === 'morning' ? 'morning' : S.time === 'evening' || S.time === 'night' ? 'evening' : (S.sayIx % 2 ? 'any' : 'left'); }
function setMood(m, cls) { clearTimeout(moodT); S.mood = m; paintUlhu(); ulhu.classList.remove('hop', 'flinch'); void ulhu.offsetWidth; if (cls) ulhu.classList.add(cls); moodT = setTimeout(() => { S.mood = null; ulhu.classList.remove('hop', 'flinch'); paintUlhu(); }, 2400); }
function levelUp() { if (S.flooding) return; S.flooding = true; tide.style.height = '190px'; flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
  const fin = () => { S.level++; S.xp = 0; plq.classList.add('glow'); setMood('proud', 'hop'); write(pick('level')); S.flooding = false; paintAll(); setTimeout(() => plq.classList.remove('glow'), 1600); };
  if (RM) fin(); else setTimeout(fin, 1000); }
function setOpt(k, v) { S[k] = v; paintAll(); }

ctl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.time) { S.time = d.time; paintAll(); write(pick(ambient())); }
  else if (d.pal) { S.pal[S.time] = +d.pal; paintAll(); }
  else if (d.ph) { S.phase = d.ph; paintAll(); }
  else if (d.ms) { S.ms = d.ms; S.phase = 'half'; paintAll(); }
  else if (d.hs) setOpt('hs', d.hs);
  else if (d.ru) setOpt('runes', +d.ru);
  else if (d.vs) setOpt('vs', d.vs);
  else if (d.hp) setOpt('hp', +d.hp);
  else if (b.classList.contains('tick')) { S.runes = Math.min(5000, S.runes + 20 + (S.sayIx % 3) * 10); S.xp += 9; S.hp = Math.min(60, S.hp + 1); if (S.xp >= 100) { S.xp = 100; paintAll(true); levelUp(); } else { paintAll(true); setMood('happy', 'hop'); write(pick('tick')); } }
  else if (b.classList.contains('slip')) { S.hp -= 8; let faint = false; if (S.hp <= 0) { faint = true; S.hp = 60; S.level = Math.max(1, S.level - 1); } paintAll(); vial.classList.remove('shake'); void vial.offsetWidth; vial.classList.add('shake'); setMood('sad', 'flinch'); write(pick(faint ? 'faint' : S.hp < 15 ? 'lowhp' : 'curse')); }
  else if (b.classList.contains('lvl')) { S.xp = 100; paintAll(); levelUp(); }
  else if (b.classList.contains('say')) write(pick(ambient())); });
ruI.oninput = () => setOpt('runes', +ruI.value); hpI.oninput = () => setOpt('hp', +hpI.value); xpI.oninput = () => setOpt('xp', +xpI.value);
moonB.onclick = () => { S.phase = NEXTPH[S.phase]; paintAll(); };
scrap.onclick = () => write(pick(ambient()));

/* ---------- galleries ---------- */
const DAY = PAL.day;
function gal(title, blurb) { const g = el('section', 'gal', '<h2>' + title + '</h2><p>' + blurb + '</p>'); main.appendChild(g); return g; }
function optHead(code, name, desc, key) { return '<h3><span class="code">' + code + '</span>' + name + '<button type="button" class="use" data-' + key + '="' + code + '">Use in banner</button></h3><p>' + desc + '</p>'; }
const g1 = gal('Rune heaps', 'Each heap shown at 10, 100, 500, 1,200, 2,500 and 5,000 runes. The things at the back tell you the size at a glance; the carved number gives the exact total.');
Object.keys(HEAPS).forEach((k) => { const o = el('div', 'opt', optHead(k, HEAPS[k][0], HEAPS[k][1], 'hs')); const t = el('div', 'tiles');
  [10, 100, 500, 1200, 2500, 5000].forEach((a) => { const tile = el('div', 'tile', '<span class="amt">' + a.toLocaleString('en-GB') + '</span>'); const hb = heapBox(); tile.appendChild(hb); t.appendChild(tile); buildHeap(hb, k, a, DAY, false); });
  o.appendChild(t); g1.appendChild(o); });
const g2 = gal('Half moons', 'Three new looks for the half moon, cropped the way the band shows it. Tap one to see it in the banner.');
const mts = el('div', 'mts'); g2.appendChild(mts);
Object.keys(MOONS).forEach((k) => { const o = el('div', 'opt', '<h3><span class="code">' + k + '</span>' + MOONS[k][0] + '</h3><p>' + MOONS[k][1] + '</p>'); const b = el('button', 'mt', '<canvas></canvas><b>' + k + '</b>'); b.type = 'button'; b.dataset.ms = k; b.setAttribute('aria-label', k + ' ' + MOONS[k][0] + ' half moon. Show in banner.');
  drawMoon(b.querySelector('canvas'), 240, 'half', DAY, k); o.appendChild(b); mts.appendChild(o); });
const g3 = gal('Health vials', 'Each vial full (60), half (30) and low (8). Below 15 the glass cracks and the number turns red.');
Object.keys(VIALS).forEach((k) => { const o = el('div', 'opt', optHead(k, VIALS[k][0], VIALS[k][1], 'vs')); const c = el('div', 'vcells');
  [[60, 'Full 60'], [30, 'Half 30'], [8, 'Low 8']].forEach(([hp, l]) => { const cell = el('div', 'vcell', '<canvas></canvas><span>' + l + '</span>'); drawVialV(cell.querySelector('canvas'), hp, DAY, k); c.appendChild(cell); });
  o.appendChild(c); g3.appendChild(o); });
const g4 = gal('Colours for each time of day', 'The band uses four times of day. P0 is the colouring from round two; P1 to P3 are new. Tap a swatch to see it in the banner. Each time keeps its own pick.');
TIMES.forEach(([k, l]) => { const row = el('div', 'prow', '<h3>' + l + '</h3>'); const sws = el('div', 'sws');
  PALS[k].forEach((p, i) => { const b = el('button', 'sw', '<i style="background:linear-gradient(180deg,' + p.top + ',' + p.bot + ' 78%,' + p.ledge + ' 78%);--gl:' + p.glow + '"></i><span>P' + i + '<em>' + p.name + '</em></span>'); b.type = 'button'; b.dataset.st = k; b.dataset.pi = i; b.setAttribute('aria-label', l + ' P' + i + ' ' + p.name); sws.appendChild(b); });
  row.appendChild(sws); g4.appendChild(row); });
main.addEventListener('click', (e) => { const b = e.target.closest('.use,.mt,.sw'); if (!b) return; const d = b.dataset;
  if (d.hs) S.hs = d.hs; else if (d.vs) S.vs = d.vs; else if (d.ms) { S.ms = d.ms; S.phase = 'half'; } else if (d.st) { S.time = d.st; S.pal[d.st] = +d.pi; }
  paintAll(); if (!RM) sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); else sec.scrollIntoView(); });
function syncGal() {
  main.querySelectorAll('.use[data-hs]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hs === S.hs)));
  main.querySelectorAll('.use[data-vs]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vs === S.vs)));
  main.querySelectorAll('.mt').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ms === S.ms)));
  main.querySelectorAll('.sw').forEach((b) => b.setAttribute('aria-pressed', String(S.pal[b.dataset.st] === +b.dataset.pi)));
}

paintAll(); write(pick(ambient()));
if (!RM) setInterval(() => { if (scrap.classList.contains('gone')) write(pick(ambient())); }, 9000);
if (window.ResizeObserver) new ResizeObserver(() => { paintRuins(); paintShade(); }).observe(ban);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => paintAll());
window.__lair3 = { S, setOpt, paintAll };
