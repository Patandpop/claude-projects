/* ---------------- Round five: three new entrances (EN1 tide, EN2 ferry, EN3 lure) ---------------- */
function fxPix() { // a low-res pixel canvas over the whole frame, drawn at half size and scaled up crisp
  const f = fxL(), W = app().clientWidth, H = 700, w = Math.ceil(W / S), h = H / S;
  f.innerHTML = `<canvas class="px" style="position:absolute;left:0;top:0;width:${w * S}px;height:${H}px"></canvas>`;
  f.style.position = 'absolute'; // lift the effect layer above the stall's own layers (the older TR3c keeps its original stacking)
  const cv = f.firstChild; cv.width = w; cv.height = h; const g = cv.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false;
  return { f, cv, g, w, h, W, H, img: g.createImageData(w, h) };
}
const RGB = (h) => hexRgb(h);
function putPx(d, w, x, y, c, a) { const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; }
const ease = (p) => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, eIn = (p) => p * p * p, eOut = (p) => 1 - Math.pow(1 - p, 3);

/* EN1 the tide: sea water floods up over the plaza, then drains down off the stall */
const WATER = ['#d8fff0', '#8ff0cc', '#3fae92', '#22796a', '#145548', '#0b3a33', '#06231f'].map(RGB);
function tideFrame(c, level, t, bodyA, bubbles, drips) {
  const { w, h, img, g } = c, d = img.data; d.fill(0);
  for (let x = 0; x < w; x++) {
    const s = Math.round(level + Math.sin(x * .19 + t * .007) * 2.2 + Math.sin(x * .061 - t * .004) * 1.6);
    for (let y = Math.max(0, s); y < h; y++) {
      const dd = y - s; let ci, a = bodyA;
      if (dd === 0) { ci = 0; a = 255; } else if (dd < 3) { ci = dith(x, y, .5) ? 1 : 2; a = Math.max(a, 230); }
      else { const f = Math.min(5.99, 2 + dd / 14), b = Math.floor(f); ci = dith(x, y, f - b) ? Math.min(6, b + 1) : b; }
      let col = WATER[ci];
      if (dd > 3 && ((x * 3 + y * 5 + (t >> 5)) % 41 === 0 || (x + Math.round(Math.sin(y * .2 + t * .003) * 3)) % 29 === 0 && (y + (t >> 6)) % 7 === 0)) col = WATER[2];
      putPx(d, w, x, y, col, a);
    }
  }
  bubbles.forEach((b) => { const x = Math.round(b.x), y = Math.round(b.y); if (x >= 0 && x < w && y > 0 && y < h - 1) { putPx(d, w, x, y, WATER[0], 220); if (b.s) { putPx(d, w, x + 1, y, WATER[1], 200); putPx(d, w, x, y - 1, WATER[1], 200); } } });
  drips.forEach((b) => { const x = Math.round(b.x); for (let k = 0; k < b.l; k++) { const y = Math.round(b.y) - k; if (x >= 0 && x < w && y >= 0 && y < h) putPx(d, w, x, y, k ? WATER[2] : WATER[0], k ? 150 : 230); } });
  g.putImageData(img, 0, 0);
}
async function tide(swap) {
  const c = fxPix(), bubbles = [], drips = [];
  for (let i = 0; i < 46; i++) bubbles.push({ x: Math.random() * c.w, y: c.h + Math.random() * 120, v: .4 + Math.random() * .9, s: Math.random() < .3 });
  await animate(D(1300), (p) => { const lv = c.h * (1 - ease(p)) - 6, t = performance.now();
    bubbles.forEach((b) => { b.y -= b.v; b.x += Math.sin(b.y * .15) * .3; if (b.y < lv + 3) { b.y = c.h + Math.random() * 30; b.x = Math.random() * c.w; } });
    tideFrame(c, lv, t, Math.round(185 + 70 * p), bubbles, drips); });
  swap();
  for (let i = 0; i < 30; i++) drips.push({ x: Math.random() * c.w, y: -Math.random() * 200, v: 1.4 + Math.random() * 2, l: 2 + (Math.random() * 3 | 0) });
  await animate(D(1500), (p) => { const lv = -8 + (c.h + 20) * eIn(p) * 1.02, t = performance.now();
    bubbles.forEach((b) => { b.y -= b.v; if (b.y < lv + 3) { b.y = c.h + 40; } });
    drips.forEach((b) => { b.y += b.v; if (b.y > lv) { b.y = -Math.random() * 40; b.x = Math.random() * c.w; } });
    tideFrame(c, lv, t, 255, bubbles, p > .1 ? drips : []); });
  c.f.innerHTML = '';
}

/* EN2 the ferry: a hooded ferryman rises from the well, Ulhu steps aboard, fog closes, the fog parts on the counter */
function fogFrame(c, dens, t, hole) {
  const { w, h, img } = c, d = img.data, A = [0, 90, 150, 205, 250], C = [RGB('#93b3a8'), RGB('#a7c6bb'), RGB('#bcd8cc'), RGB('#cfe6dc')];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = (Math.sin(x * .09 + t * .0012 + Math.sin(y * .05) * 2) + Math.sin(y * .17 - t * .0008 + x * .025) + Math.sin((x + y) * .043 + t * .0005)) / 3;
    let a = dens * 1.7 - .35 + n * .55;
    if (hole) { const dx = x - hole[0], dy = (y - hole[1]) * 1.3, r = Math.hypot(dx, dy); a -= Math.max(0, 1 - r / hole[2]) * 1.2; }
    a = Math.max(0, Math.min(1, a)) * 4; const b = Math.floor(a), lv = dith(x, y, a - b) ? Math.min(4, b + 1) : b;
    const i = (y * w + x) * 4; if (!lv) { d[i + 3] = 0; continue; } const col = C[Math.min(3, lv - 1 + (n > .3 ? 1 : 0) - (lv === 4 ? 1 : 0))];
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = A[lv];
  }
  c.g.putImageData(img, 0, 0);
}
function drawBoat(g, bx, by, t, withUlhu, ulImg, glow) { // bx,by = hull centre on the low-res canvas
  bx = Math.round(bx); by = Math.round(by + Math.sin(t * .005) * 1.2);
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(bx + x, by + y, w, h); };
  // lantern glow
  const lg = g.createRadialGradient(bx + 17, by - 19, 0, bx + 17, by - 19, 34 * glow + 6); lg.addColorStop(0, 'rgba(255,214,106,.55)'); lg.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = lg; g.fillRect(bx - 40, by - 60, 100, 90);
  // ripples
  for (let i = 0; i < 3; i++) { const rw = 26 + i * 8 + ((t * .02 + i * 6) % 8); g.fillStyle = `rgba(170,240,215,${.35 - i * .1})`; g.fillRect(bx - rw, by + 6 + i, 3, 1); g.fillRect(bx + rw - 3, by + 6 + i, 3, 1); }
  // ferryman at the stern: hooded robe with two green eyes, holding the pole
  r(-18, -16, 7, 14, '#1a1620'); r(-17, -19, 5, 4, '#1a1620'); r(-16, -17, 1, 1, '#5ef2a0'); r(-14, -17, 1, 1, '#5ef2a0'); r(-19, -10, 1, 8, '#120f16');
  r(-12, -26, 1, 30, '#5a4028'); // pole into the water
  // lantern on a hook post at the bow
  r(17, -22, 1, 18, '#4a3420'); r(14, -22, 4, 1, '#4a3420'); r(13, -21, 3, 1, '#2a1a10'); r(13, -20, 3, 3, '#ffd56a'); r(14, -19, 1, 1, '#fff3c4'); r(13, -17, 3, 1, '#2a1a10');
  // Ulhu sits midships
  if (withUlhu && ulImg && ulImg.complete) g.drawImage(ulImg, bx - 9, by - 22, 20, 20);
  // hull: dark planks, pale top rail, curled prow
  r(-22, -2, 44, 2, '#b08a5a'); r(-22, 0, 44, 3, '#6a4a2c'); r(-20, 3, 40, 2, '#4e3620'); r(-17, 5, 34, 2, '#2e2014'); r(-13, 7, 26, 1, '#1c140c');
  r(22, -5, 2, 5, '#6a4a2c'); r(23, -7, 2, 2, '#b08a5a'); r(-24, -4, 2, 5, '#6a4a2c');
  for (let i = -18; i < 20; i += 7) r(i, 1, 1, 1, '#3a2614');
}
async function ferry(k) {
  const c = fxPix(), ul = new Image(); ul.src = UL.b16.happy;
  const wx = PG.cx, wy = PG.cy, [fx0, fy0] = [WK.x / S, WK.y / S], [sx, sy] = stallFront(k).map((v) => v / S), wk = $('#walker');
  // 1. the boat rises out of the well and glides to Ulhu at the rim
  await animate(D(1100), (p) => { const t = performance.now(), e = eOut(p); c.g.clearRect(0, 0, c.w, c.h); fogFrame(c, .18 * p, t);
    const bx = wx + (fx0 - wx) * ease(Math.max(0, (p - .35) / .65)), by = wy - 6 + (fy0 + 4 - wy + 6) * ease(Math.max(0, (p - .35) / .65));
    c.g.save(); c.g.globalAlpha = Math.min(1, p * 2.4); c.g.translate(bx, by); const sc = .4 + .6 * e; c.g.scale(sc, sc); c.g.translate(-bx, -by); drawBoat(c.g, bx, by, t, false, ul, p); c.g.restore(); });
  // 2. Ulhu hops aboard
  const hx = wk.offsetLeft, hy = wk.offsetTop;
  await wk.animate([{ transform: 'none' }, { transform: 'translate(0,-26px)', offset: .5 }, { transform: 'translate(0,-8px) scale(.85)', opacity: 1 }], { duration: D(420), easing: 'ease-in-out', fill: 'forwards' }).finished;
  wk.hidden = true; wk.getAnimations().forEach((a) => a.cancel());
  // 3. it sails round to the stall as the fog thickens
  const mx = (fx0 + sx) / 2 + (sx > wx ? 40 : -40), my = Math.min(fy0, sy) + 10;
  await animate(D(2100), (p) => { const t = performance.now(), e = ease(p), b = 1 - e;
    const bx = b * b * fx0 + 2 * b * e * mx + e * e * sx, by = b * b * (fy0 + 4) + 2 * b * e * my + e * e * (sy + 4);
    c.g.clearRect(0, 0, c.w, c.h); c.g.globalAlpha = 1 - Math.max(0, (p - .8) / .2) * .7; drawBoat(c.g, bx, by, t, true, ul, 1 + p * 1.6); c.g.globalAlpha = 1;
    const tmp = c.g.getImageData(0, 0, c.w, c.h); fogFrame(c, .18 + .82 * eIn(p) * 1.05, t);
    // fog sits over the boat but the lantern still burns through it
    const fogImg = c.g.getImageData(0, 0, c.w, c.h); c.g.putImageData(tmp, 0, 0); const fc = document.createElement('canvas'); fc.width = c.w; fc.height = c.h; fc.getContext('2d').putImageData(fogImg, 0, 0); c.g.drawImage(fc, 0, 0);
    const lg = c.g.createRadialGradient(bx + 15, by - 15, 0, bx + 15, by - 15, 10 + 14 * p); lg.addColorStop(0, 'rgba(255,224,140,.95)'); lg.addColorStop(1, 'rgba(255,190,90,0)'); c.g.fillStyle = lg; c.g.fillRect(0, 0, c.w, c.h); });
  // 4. inside: the fog parts from the lantern outward onto the counter
  $('#plaza').style.visibility = 'hidden'; showStall();
  const cx = c.w / 2, cy = 70;
  await animate(D(1300), (p) => { const t = performance.now(); fogFrame(c, 1.05 - .2 * p, t, [cx, cy, eOut(p) * 230]);
    const lg = c.g.createRadialGradient(cx, cy, 0, cx, cy, 16 + 40 * p); lg.addColorStop(0, `rgba(255,224,140,${.8 * (1 - p)})`); lg.addColorStop(1, 'rgba(255,190,90,0)'); c.g.fillStyle = lg; c.g.fillRect(0, 0, c.w, c.h); });
  c.f.innerHTML = ''; wk.hidden = false;
}

/* EN3 the lure: the plaza goes dark, a glowing lure drops before the stall, a vast eye opens, jaws snap shut, they open inside */
function drawJaw(g, w, h, gap, top, t) { // gap 0 = shut at the middle line, 1 = fully open off-screen
  const mid = Math.round(h * .46), off = Math.round(gap * (top ? mid + 30 : h - mid + 30));
  const edge = top ? mid - off : mid + off, dark = '#060d0c', lip = '#14231f', gum = '#3a1418';
  g.fillStyle = dark; if (top) g.fillRect(0, 0, w, Math.max(0, edge - 10)); else g.fillRect(0, edge + 10, w, h);
  g.fillStyle = lip; if (top) g.fillRect(0, edge - 12, w, 2); else g.fillRect(0, edge + 10, w, 2);
  g.fillStyle = gum; if (top) g.fillRect(0, edge - 10, w, 3); else g.fillRect(0, edge + 7, w, 3);
  for (let x = top ? 0 : 7, i = 0; x < w + 14; x += 14, i++) { // teeth: needle fangs of differing length
    const len = 10 + (hsh(i, top ? 1 : 2) % 9), wd = 4 + (hsh(i, 5) % 3);
    for (let j = 0; j < len; j++) { const ww = Math.max(1, Math.round(wd * (1 - j / len))), xx = x + Math.round((wd - ww) / 2), yy = top ? edge - 8 + j : edge + 8 - j;
      g.fillStyle = '#e8e0c6'; g.fillRect(xx, yy, ww, 1); if (ww > 1) { g.fillStyle = '#9a9278'; g.fillRect(xx + ww - 1, yy, 1, 1); } }
  }
}
function drawLure(g, x, y, top, glow, t) {
  const sway = Math.sin(t * .004) * 3; g.fillStyle = '#2a3a34';
  for (let s = 0; s <= 1; s += .02) { const xx = x + sway * s + Math.sin(s * 3) * 6 * (1 - s), yy = top + (y - top) * s; g.fillRect(Math.round(xx), Math.round(yy), 1, 1); }
  const lx = Math.round(x + sway), ly = Math.round(y), gr = g.createRadialGradient(lx, ly + 3, 0, lx, ly + 3, 10 + 26 * glow); gr.addColorStop(0, 'rgba(200,255,225,.75)'); gr.addColorStop(.4, 'rgba(94,242,160,.28)'); gr.addColorStop(1, 'rgba(94,242,160,0)');
  g.fillStyle = gr; g.fillRect(lx - 50, ly - 50, 100, 100);
  g.fillStyle = '#1e4a3a'; g.fillRect(lx - 2, ly, 5, 1); g.fillStyle = '#5ef2a0'; g.fillRect(lx - 2, ly + 1, 5, 4); g.fillRect(lx - 1, ly + 5, 3, 1); g.fillStyle = '#eafff4'; g.fillRect(lx - 1, ly + 2, 2, 2);
}
function drawEye(g, cx, cy, open, t) {
  if (open <= 0.02) return; const rx = 46, ry = Math.max(1, Math.round(17 * open)), look = Math.round(Math.sin(t * .0021) * 6), IR = ['#fff0a0', '#e8cf52', '#b89a2c', '#7a6418', '#3e3210'];
  for (let y = -ry; y <= ry; y++) { const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    for (let x = -half; x < half; x++) { const ex = (x - look) / 22, ey = y / 17, dd = Math.hypot(ex, ey) * 4.2, edge = half - Math.abs(x) < 3 || Math.abs(y) >= ry - 1;
      let col; if (edge) col = '#262208'; else { const f = Math.min(4.99, dd), bb = Math.floor(f); col = IR[dith(x + 64, y + 64, f - bb) ? Math.min(4, bb + 1) : bb]; if (dd > 3.6 && hsh(x, y) % 23 === 0) col = '#7a2a20'; }
      g.fillStyle = col; g.fillRect(cx + x, cy + y, 1, 1); } }
  const pw = (y) => Math.max(1, Math.round(3 * (1 - Math.abs(y) / 17)));
  for (let y = -ry + 1; y < ry; y++) { g.fillStyle = '#050403'; const w = pw(y); g.fillRect(cx + look - (w >> 1), cy + y, w, 1); }
  if (ry > 4) { g.fillStyle = '#fffbe0'; g.fillRect(cx + look - 8, cy - Math.min(ry - 2, 7), 3, 2); }
}
async function lure(k, swap) {
  const c = fxPix(), g = c.g, [sx, sy] = stallFront(k).map((v) => v / S), lx = sx, ly = sy - 46, top = -4;
  const dark = (a, hole) => { const gr = g.createRadialGradient(lx, ly + 3, 0, lx, ly + 3, hole); gr.addColorStop(0, `rgba(1,6,6,${a * .15})`); gr.addColorStop(1, `rgba(1,6,6,${a})`); g.fillStyle = gr; g.fillRect(0, 0, c.w, c.h); };
  // 1. the lights die and the lure drops in front of the stall
  await animate(D(1100), (p) => { const t = performance.now(); g.clearRect(0, 0, c.w, c.h); dark(.9 * ease(p), 30 + 20 * p); drawLure(g, lx, top + (ly - top) * eOut(Math.min(1, p * 1.3)), top, p, t); });
  // 2. it bobs; above it a huge eye opens in the dark
  await animate(D(1200), (p) => { const t = performance.now(); g.clearRect(0, 0, c.w, c.h); dark(.9, 50); drawEye(g, Math.round(c.w / 2), 58, Math.sin(Math.min(1, p * 1.4) * Math.PI / 2) * (p > .85 ? 1 - (p - .85) / .15 * .7 : 1), t); drawLure(g, lx, ly + Math.sin(p * Math.PI * 4) * 3, top, 1, t); });
  // 3. the jaws snap shut
    await animate(D(380), (p) => { const t = performance.now(), e = eIn(p); g.clearRect(0, 0, c.w, c.h); dark(.9, 50); drawLure(g, lx, ly, top, 1, t); drawJaw(g, c.w, c.h, 1 - e, true, t); drawJaw(g, c.w, c.h, 1 - e, false, t); });
  swap(); // shut: the jaws grind and shake for a beat while the stall loads behind them
  await animate(D(480), (p) => { const t = performance.now(), j = RM ? 0 : Math.round(Math.sin(p * 46) * 3 * (1 - p)); g.clearRect(0, 0, c.w, c.h); g.save(); g.translate(j, -Math.abs(j)); drawJaw(g, c.w, c.h, 0, true, t); g.restore(); g.save(); g.translate(-j, Math.abs(j)); drawJaw(g, c.w, c.h, 0, false, t); g.restore(); });
  // 4. they open, and you are inside the stall
  await animate(D(900), (p) => { const t = performance.now(), e = eOut(p); g.clearRect(0, 0, c.w, c.h); g.fillStyle = `rgba(200,255,225,${.35 * (1 - p)})`; g.fillRect(0, 0, c.w, c.h); drawJaw(g, c.w, c.h, e, true, t); drawJaw(g, c.w, c.h, e, false, t); });
  c.f.innerHTML = '';
}
const swapIn = () => { $('#plaza').style.visibility = 'hidden'; showStall(); };
const swapOut = () => { hideStall(); $('#plaza').style.visibility = 'visible'; };
TR.e1 = { async in() { await tide(swapIn); }, async out() { await tide(swapOut); } };
TR.e2 = { async in(k) { await ferry(k); }, async out() { const c = fxPix(); await animate(D(600), (p) => fogFrame(c, p * 1.1, performance.now())); swapOut(); await animate(D(800), (p) => fogFrame(c, 1.1 * (1 - p), performance.now())); c.f.innerHTML = ''; } };
TR.e3 = { async in(k) { await lure(k, swapIn); }, async out() { const c = fxPix(); await animate(D(360), (p) => { c.g.clearRect(0, 0, c.w, c.h); drawJaw(c.g, c.w, c.h, 1 - eIn(p), true, 0); drawJaw(c.g, c.w, c.h, 1 - eIn(p), false, 0); }); swapOut(); await wait(D(200)); await animate(D(700), (p) => { c.g.clearRect(0, 0, c.w, c.h); drawJaw(c.g, c.w, c.h, eOut(p), true, 0); drawJaw(c.g, c.w, c.h, eOut(p), false, 0); }); c.f.innerHTML = ''; } };

/* the round-five player: reset, put Ulhu by the bottom of the well, walk, then the entrance */
const TARGET = 'weaver';
async function playEntrance(key) {
  if (st.busy) return; cancelAnimationFrame(WK.raf); WK.path = []; WK.cb = null;
  st.tr = key; $$('.en').forEach((x) => x.classList.toggle('on', x.dataset.e === key));
  fxL().innerHTML = ''; fxL().style.position = ''; if (st.k) { hideStall(); st.k = null; } $('#plaza').style.visibility = 'visible'; $('#stall').getAnimations().forEach((a) => a.cancel()); $('#stall').style.clipPath = '';
  const w = $('#walker'); w.hidden = false; w.getAnimations().forEach((a) => a.cancel()); w.classList.remove('walking'); $('#walker img').src = UL.b16.idle;
  [WK.x, WK.y] = clampGround(PG.cx * S - 40, (PG.cy + 62) * S); placeWalker();
  const a = app().getBoundingClientRect(); if (a.top < 0 || a.bottom > innerHeight + 200) app().scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
  await wait(RM ? 0 : 500);
  const k = KB[TARGET];
  if (RM) { walkerAt(k); await enter(TARGET); return; }
  if (key === 'e2') { walkTo(PG.cx * S + 6, (PG.cy + 50) * S, async () => { $('#walker img').src = UL.b16.happy; await wait(D(250)); enter(TARGET); }); }
  else walkToStall(TARGET);
}
$$('.en .rp').forEach((b) => b.addEventListener('click', () => playEntrance(b.closest('.en').dataset.e)));
