// The Sunken Temple (Patryk's final picks, 2026-10-27): the live boss card and its trophy.
// Arena A1 Temple steps (light rays, specks, bubbles), circle B Elder Sign drawn BEHIND the creature,
// strike S1 Claw slash (one health block shatters), ending D2 Dragged down, trophy card K1 Silver etching.
// Needs window.PX (game-pixel.js) and window.RUNES (game-runes.js) loaded first. One global: window.TEMPLE.
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.TEMPLE) return;
  const RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const eIn = (t) => t * t * t, eOut = (t) => 1 - Math.pow(1 - t, 3);
  function h2(x, y, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 1013904223); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vn(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y, s) { return vn(x, y, s) * .5 + vn(x * 2.03, y * 2.03, s + 7) * .3 + vn(x * 4.1, y * 4.1, s + 13) * .2; }
  function rng(seed) { let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const sc = (c, k) => [c[0] * k, c[1] * k, c[2] * k], mx = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function ctx2(c) { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return x; }
  function painter(W, H) { const c = mk(W, H), x = c.getContext('2d'), d = x.createImageData(W, H), D = d.data;
    return { c, W, H,
      set(px, py, col, a) { px |= 0; py |= 0; if (px < 0 || py < 0 || px >= W || py >= H) return; const i = (py * W + px) * 4;
        if (a === undefined || a >= 1 || D[i + 3] === 0) { D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = (a === undefined || a >= 1) ? 255 : a * 255; }
        else { D[i] += (col[0] - D[i]) * a; D[i + 1] += (col[1] - D[i + 1]) * a; D[i + 2] += (col[2] - D[i + 2]) * a; } },
      get(px, py) { px |= 0; py |= 0; if (px < 0 || py < 0 || px >= W || py >= H) return null; const i = (py * W + px) * 4; return D[i + 3] ? [D[i], D[i + 1], D[i + 2]] : null; },
      clear(px, py) { const i = (py * W + px) * 4; D[i + 3] = 0; },
      done() { x.putImageData(d, 0, 0); return c; } };
  }

  // ---------- data from the app's art ----------
  const PXA = () => window.PX || { bosses: {}, bossMeta: {}, bossBySize: {} };
  const NUM = (h) => h >= 20 ? 'XX' : h >= 10 ? 'X' : h >= 5 ? 'V' : 'II';
  const hoursOf = (b, meta) => { const n = parseFloat(b && b.size); return isFinite(n) && n > 0 ? n : (meta && meta.hours) || 2; };
  function kOf(b) { const P = PXA(), k = b && (b.k || b.creature); if (k && (P.bosses[k] || /^gm:/.test(k))) return k;   // gm:... a paper golem (game-golems.js)
    const h = hoursOf(b), by = P.bossBySize || {}, sz = h >= 20 ? 20 : h >= 10 ? 10 : h >= 5 ? 5 : 2; return (by[sz] && by[sz][0]) || 'spawn'; }
  const metaOf = (k) => /^gm:/.test(k) ? { name: (window.GOLEM && GOLEM.names[k.split(':')[1]]) || 'Paper golem', size: 'paper golem', hours: 2 } : (PXA().bossMeta || {})[k] || { name: 'Spawn', size: '2h', hours: 2 };
  let HOARD = null; const hoard = () => { if (HOARD === null) { try { HOARD = window.RUNES.pick(300, 'boss', 'boss').src; } catch (e) { HOARD = ''; } } return HOARD; };
  const runeImg = (cls) => hoard() ? '<img class="' + cls + '" src="' + hoard() + '" alt="">' : '';
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function toDate(v) { if (v instanceof Date) return v; if (typeof v === 'number') return new Date(v);
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function longDate(v) { const d = toDate(v); return d && !isNaN(d) ? DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONS[d.getMonth()] : String(v || ''); }
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  // ---------- CSS (once) ----------
  function css() {
    if (document.getElementById('temple-css')) return;
    const P = painter(96, 96); for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) { let v = 70 + 120 * fbm(x / 7, y / 7, 3) + (h2(x, y, 9) - .5) * 40; if (h2(x, y, 4) < .03) v -= 60; P.set(x, y, [v, v, v]); }
    const tex = 'url(' + P.done().toDataURL() + ')';
    const s = document.createElement('style'); s.id = 'temple-css';
    s.textContent = [
      '.tp-boss,.tp-vrow{--tp-g:"Grenze Gotisch",Georgia,serif;--tp-a:"Atkinson Hyperlegible",system-ui,sans-serif;--tp-sc:"IM Fell English SC","IM Fell English",Georgia,serif;--tp-tex:' + tex + '}',
      '.tp-boss{position:relative;border-radius:6px;background-color:#1b2324;background-image:var(--tp-tex);background-blend-mode:overlay;box-shadow:inset 0 2px 0 rgba(170,190,180,.16),inset 0 -3px 0 rgba(0,0,0,.55),0 0 0 1px #0a0f10,0 6px 18px rgba(0,0,0,.55);padding:10px;color:#e6ede5;font:15px/1.5 var(--tp-a);text-align:left}',
      '.tp-arena{position:relative;width:100%;max-width:360px;margin:0 auto;aspect-ratio:120/110;border-radius:3px;overflow:hidden;background:#05090a;box-shadow:0 0 0 2px #0a0f10,0 0 0 3px #3a4a46}',
      '.tp-arena canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}',
      '.tp-arena canvas.tp-glow{filter:blur(5px) saturate(1.3);mix-blend-mode:screen;opacity:.95;pointer-events:none}',
      '.tp-bp{position:relative;display:flex;flex-direction:column;gap:7px;margin-top:10px;min-width:0}',
      '.tp-name{display:flex;align-items:flex-start;gap:8px;font:700 22px/1.1 var(--tp-g);color:#ffd8cc;text-shadow:0 0 12px rgba(255,90,74,.45),0 2px 0 #000;overflow-wrap:anywhere}',
      '.tp-name>span{flex:1;min-width:0}',
      '.tp-edit{flex:none;font:700 12px var(--tp-a);text-shadow:none;background:transparent;border:1px solid #4a2a2e;border-radius:4px;color:#ffb3a8;min-height:32px;padding:0 10px;cursor:pointer}',
      '.tp-sub{font-size:12.5px;color:#c4a49c;display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.tp-num{font:13px var(--tp-sc);font-variant:small-caps;color:#140a04;background:#e8b04a;border-radius:2px;padding:0 5px;letter-spacing:.06em;line-height:1.35}',
      '.tp-hp{display:flex;gap:4px}',
      '.tp-hpb{display:block;flex:1;height:12px;border-radius:2px;background:linear-gradient(#ff7a62,#c4202a 55%,#7a0a12);border:1px solid #2a0406;box-shadow:inset 0 1px 0 rgba(255,225,205,.55),0 0 7px rgba(255,74,58,.45)}',
      '.tp-hpb.tp-lost{background:#120809 repeating-linear-gradient(115deg,transparent 0 5px,#2a1012 5px 6px);box-shadow:inset 0 2px 3px #000;border-color:#3a1a1e}',
      '.tp-stages{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}',
      '.tp-stage{display:flex;align-items:center;gap:8px;width:100%;min-height:40px;padding:5px 8px;border-radius:3px;cursor:pointer;text-align:left;margin:0;background:#2a1a1b;background-image:var(--tp-tex);background-blend-mode:overlay;border:1.5px solid #6a2a2e;color:#ffd6ca;font:14px var(--tp-a);box-shadow:inset 0 1px 0 rgba(255,200,190,.12),0 2px 0 #0a0405;-webkit-tap-highlight-color:transparent}',
      '.tp-stage:focus-visible,.tp-edit:focus-visible{outline:2px solid #5ef2a0;outline-offset:2px}',
      '.tp-sn{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:700 11px var(--tp-a);background:#120809;border:1px solid #8a3a3e;color:#ffb3a8}',
      '.tp-nm{flex:1;min-width:0;position:relative;overflow-wrap:anywhere}',
      '.tp-dd{flex:none;font:700 11.5px var(--tp-a);padding:1px 7px;border-radius:9px;background:#e8b04a;color:#2a1606}',
      '.tp-dd.tp-soon{background:transparent;color:#d8b0a8;box-shadow:inset 0 0 0 1px #5a2a2e}',
      '.tp-dd.tp-over{background:transparent;color:#ff9a85;box-shadow:inset 0 0 0 1px #ff7a66}',
      '.tp-stage.tp-done{background-color:#3a0c10;border-color:#7a1a20;color:#c48a86}',
      '.tp-stage.tp-done .tp-nm{text-decoration:line-through;text-decoration-color:rgba(255,120,100,.6)}',
      '.tp-stage.tp-done .tp-sn{background:#a3202a;border-color:#ff7a66;color:#fff}',
      '.tp-stage.tp-done .tp-dd{background:#5a1a20;color:#ffd0c4;box-shadow:none}',
      '.tp-stage.tp-done.tp-late .tp-dd{background:#2a1012;color:#c48a86}',
      '.tp-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px}',
      '.tp-pay{display:flex;align-items:center;gap:4px;font:700 18px var(--tp-a);color:#f0c45a}',
      '.tp-pay img{width:26px;height:26px;image-rendering:pixelated}',
      '.tp-tro{font-size:12.5px;color:#c49a94;flex:1}',
      '.tp-fx{position:absolute;image-rendering:pixelated;pointer-events:none;z-index:5}',
      '.tp-shardbox{position:absolute;pointer-events:none;z-index:4}',
      '.tp-shardbox>*{position:absolute!important;left:0!important;top:0!important;margin:0!important}',
      '.tp-reveal{position:absolute;left:50%;top:calc(72.7% - var(--s) * 80px);width:calc(var(--s) * 52px);margin-left:calc(var(--s) * -26px);z-index:2;pointer-events:none}',
      '.tp-reveal[hidden]{display:none}',
      '.tp-rglow{position:absolute;left:-46px;right:-46px;top:-34px;bottom:-24px;background:radial-gradient(closest-side,rgba(255,206,120,.5),rgba(255,90,74,.18) 60%,transparent)}',
      '.tp-reveal.tp-show{animation:tp-rise .9s cubic-bezier(.2,.7,.3,1) both}',
      '@keyframes tp-rise{0%{opacity:0;transform:translateY(40px) scale(.6);filter:brightness(3) saturate(.3)}55%{opacity:1}100%{opacity:1;transform:none;filter:none}}',
      '@keyframes tp-fadein{from{opacity:0}to{opacity:1}}',
      // the K1 card: 1 unit of --s = one pixel of the 52 x 80 card
      '.tp-tcard{position:relative;flex:none;width:calc(var(--s) * 52px);height:calc(var(--s) * 80px)}',
      '.tp-tcard canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}',
      '.tp-tcard canvas.tp-tg{filter:blur(4px);mix-blend-mode:screen;pointer-events:none}',
      '.tp-tnum{position:absolute;left:0;right:0;top:calc(var(--s) * .4px);text-align:center;font:calc(var(--s) * 5.6px)/1 var(--tp-sc);letter-spacing:.1em;color:#e6eaf4;text-shadow:0 0 6px rgba(220,230,255,.55);pointer-events:none}',
      '.tp-plate{position:absolute;left:calc(var(--s) * 5.5px);right:calc(var(--s) * 5.5px);top:calc(var(--s) * 63px);height:calc(var(--s) * 14px);display:flex;flex-direction:column;justify-content:center;align-items:center;gap:calc(var(--s) * .9px);pointer-events:none;text-align:center}',
      '.tp-plate .tp-tn{font:calc(var(--s) * 3.7px)/1.08 var(--tp-sc);font-variant:small-caps;letter-spacing:.03em;color:#e6eaf4;text-shadow:0 0 5px rgba(220,230,255,.35);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.tp-plate .tp-td{display:flex;align-items:center;gap:calc(var(--s) * .8px);font:calc(var(--s) * 2.7px)/1 var(--tp-a);color:#a9aebd;white-space:nowrap}',
      '.tp-plate .tp-td img{height:calc(var(--s) * 3.6px);image-rendering:pixelated}',
      // Vanquished rows
      '.tp-vrow{display:flex;gap:12px;align-items:center;padding:6px 10px 6px 6px;border-radius:4px;background:#121616;border:1px solid #2a3432;color:#e6ede5;font:15px/1.5 var(--tp-a);list-style:none;text-align:left}',
      '.tp-vrow.tp-fresh{border-color:#c8963a;animation:tp-fresh 1.4s ease-out both}',
      '@keyframes tp-fresh{from{opacity:0;transform:translateY(-8px);background:#3a2a10}to{opacity:1;transform:none;background:#121616}}',
      '.tp-vt{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}',
      '.tp-vt b{font:700 15px/1.2 var(--tp-a);overflow-wrap:anywhere}',
      '.tp-w{font:13px var(--tp-sc);font-variant:small-caps;color:#e8b04a;letter-spacing:.06em}',
      '.tp-m{font-size:12.5px;color:#97a69f;display:flex;align-items:center;gap:5px;flex-wrap:wrap}',
      '.tp-m img{width:16px;height:16px;image-rendering:pixelated}',
      '@media (prefers-reduced-motion: reduce){.tp-reveal.tp-show,.tp-vrow.tp-fresh{animation:tp-fadein .4s both}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ---------- sprites (from PX.bosses, loaded once per creature) ----------
  const CROP = { levi: 27 }; // the Leviathan's painted water strip is cut off: the temple has its own floor
  const SPR = {};
  function sprite(k) {
    if (SPR[k]) return SPR[k];
    if (/^gm:/.test(k) && window.GOLEM) return (SPR[k] = GOLEM.sprite(k));   // a paper golem: drawn live, frame by frame
    const s = PXA().bosses[k] || PXA().bosses.spawn, o = SPR[k] = { k, img: null, w: s ? s.w : 0, h: s ? (CROP[k] || s.h) : 0, px: [], ready: null };
    o.ready = new Promise((res) => { if (!s) return res(o); const im = new Image();
      im.onload = () => { const c = mk(o.w, o.h), x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, o.w, o.h).data;
        for (let y = 0; y < o.h; y++) for (let i = 0; i < o.w; i++) { const q = (y * o.w + i) * 4; if (d[q + 3] > 10) o.px.push({ x: i, y, c: [d[q], d[q + 1], d[q + 2]] }); }
        o.img = c; res(o); };
      im.onerror = () => res(o); im.src = s.src; });
    return o;
  }

  // ---------- A1 Temple steps (painted once) ----------
  function stone(x, y, bid, seed, base) {
    const bt = h2(bid, seed, 1); let c = mx(base, bt < .34 ? [54, 84, 70] : bt < .67 ? [50, 66, 82] : [74, 74, 70], .3);
    c = sc(c, .74 + .5 * fbm(x / 4.5, y / 4.5, seed + (bid % 9)) + (bt - .5) * .2);
    const sp = h2(x, y, seed + 5); if (sp < .05) c = sc(c, .66); else if (sp > .975) c = sc(c, 1.3);
    const m = fbm(x / 9, y / 7, seed + 31); if (m > .6) c = mx(c, [44, 100, 66], Math.min(.7, (m - .6) * 4));
    return c;
  }
  function crack(P, rnd, x, y, sx, sy, n, depth) { for (let i = 0; i < n; i++) { const c = P.get(x, y); if (c) { P.set(x, y, sc(c, .35)); const b = P.get(x + 1, y + 1); if (b) P.set(x + 1, y + 1, sc(b, 1.15)); }
    const r = rnd(); if (r < .45) y += sy; else if (r < .8) x += sx; else { x += sx; y += sy; } if (!depth && rnd() < .08) crack(P, rnd, x, y, -sx, sy, Math.floor(n / 3), 1); } }
  function rubble(P, rnd, list) { list.forEach(([x, y]) => { const w = 2 + Math.floor(rnd() * 3); for (let j = 0; j < 2; j++) for (let i = 0; i < w; i++) P.set(x + i, y + j, j === 0 ? [124, 134, 124] : [60, 70, 68]); P.set(x + w, y + 1, [14, 18, 20]); P.set(x + w, y, [30, 36, 36]); }); }
  function pillar(P, x0, w, topY, baseY, seed) {
    for (let x = x0; x < x0 + w; x++) { const u = (x - x0 + .5) / w, sh = .32 + .9 * Math.pow(Math.sin(Math.PI * u), .7) * (1.15 - .55 * u);
      const tY = topY + Math.floor(h2(x, seed, 3) * 5) + Math.floor(Math.abs(u - .35) * 8);
      for (let y = tY; y <= baseY - 6; y++) { let c = stone(x, Math.floor(y / 2), seed * 10 + Math.floor((y - topY) / 9), seed, [96, 110, 104]);
        if ((x - x0) % 3 === 1 && y > tY + 2) c = sc(c, .7);
        if ((y - topY) % 9 === 0) c = sc(c, .62);
        if (y <= tY + 1) c = [150, 156, 146];
        const m = fbm(x / 4, y / 5, seed + 50); if (y > baseY - 34 && m > .52) c = mx(c, [48, 108, 64], clamp((m - .52) * 4, 0, .8));
        P.set(x, y, sc(c, sh)); } }
    for (let y = baseY - 6; y <= baseY; y++) for (let x = x0 - 2; x < x0 + w + 2; x++) { const u = (x - x0 + 2.5) / (w + 4); let c = stone(x, y, seed * 7 + 1, seed, [100, 112, 106]); c = sc(c, .45 + .75 * (1 - u * .6)); if (y === baseY - 6) c = sc(c, 1.3); if (y === baseY) c = sc(c, .5); P.set(x, y, c); }
    const rnd = rng(seed * 13);
    for (let k = 0; k < 3; k++) { const x = x0 + 2 + Math.floor(rnd() * (w - 4)), len = 8 + Math.floor(rnd() * 10); for (let j = 0; j < len; j++) { const yy = baseY - 6 - j, xx = x + Math.round(Math.sin(j * .5 + k) * 1.2); P.set(xx, yy, mx([30, 90, 52], [110, 190, 110], j / len)); } }
    for (let k = 0; k < 6; k++) { const x = x0 + 1 + Math.floor(rnd() * (w - 2)), y = baseY - 10 - Math.floor(rnd() * 30); P.set(x, y, [190, 190, 170]); P.set(x + 1, y + 1, [40, 46, 44]); }
    let cx = x0 + Math.floor(w * .6), cy = topY + 12; for (let j = 0; j < 22; j++) { const c = P.get(cx, cy); if (c) P.set(cx, cy, sc(c, .35)); cy++; if (j % 3 === 0) cx += (j % 2 ? 1 : -1); }
  }
  function water(x, y, H) { const t = y / H; let c = mx([16, 50, 60], [5, 12, 16], clamp(t * 1.7)); c = sc(c, .8 + .4 * fbm(x / 14, y / 9, 3)); return mx(c, [60, 120, 120], .35 * Math.exp(-((x - 60) ** 2) / 800) * clamp(1 - y / 50)); }
  let SCENE = null;
  function scene() {
    if (SCENE) return SCENE;
    const W = 120, H = 110, B = painter(W, H), F = painter(W, H), rnd = rng(7);
    const L = (x, y) => .42 + .78 * Math.exp(-((x - 60) ** 2) / (2 * 26 * 26)) * (.55 + .45 * clamp(y / 70));
    const wallTop = (x) => 4 + Math.floor(12 * fbm(x / 7, 1.3, 5)) + (Math.abs(x - 60) < 22 ? 0 : 4);
    const archTop = (x) => { const d = Math.abs(x - 60); return d > 10 ? 99 : 34 - Math.sqrt(Math.max(0, 100 - d * d)) * 1.05; };
    const rows = [58, 61, 65, 70, 76, 83, 90, 96], V = 16;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let c = water(x, y, H);
      if (y < 58 && x >= 11 && x <= 109 && y >= wallTop(x)) {
        const d = Math.abs(x - 60), at = archTop(x);
        if (y >= 47 && d <= 13 + Math.floor((y - 47) / 3) * 6) { const i = Math.floor((y - 47) / 3), r = (y - 47) % 3;
          c = stone(x, y, 900 + i * 20 + Math.floor(x / 9), 4, r === 0 ? [116, 132, 124] : r === 1 ? [66, 80, 78] : [50, 62, 62]); if (r === 0 && h2(x, i, 40) < .15) c = sc(c, .7); }
        else if (d <= 10 && y >= at) { c = mx([5, 4, 8], [90, 12, 16], .85 * Math.exp(-(((x - 60) ** 2) + ((y - 46) ** 2)) / 60)); c = sc(c, .8 + .4 * fbm(x / 3, y / 3, 9)); }
        else if (d <= 13 && y >= at - 3 && y < 47) { const seg = Math.floor(Math.atan2(y - 34, x - 60) * 4) + (d > 10 ? 40 : 0), segL = Math.floor(Math.atan2(y - 34, x - 61) * 4) + (Math.abs(x - 61) > 10 ? 40 : 0);
          c = segL !== seg ? [22, 28, 30] : stone(x, y, 500 + seg, 6, [104, 116, 108]); }
        else { const row = Math.floor((y - 2) / 7), off = (row % 2) * 6, bid = row * 31 + Math.floor((x + off) / 12);
          c = ((y - 2) % 7 === 0 || (x + off) % 12 === 0) ? [18, 26, 28] : stone(x, y, bid, 2, [62, 80, 80]); if (y === wallTop(x)) c = sc(c, 1.35); }
        c = sc(c, L(x, y) * .9);
      } else if (y >= 58 && y < 96) {
        let ri = 0; while (ri < rows.length - 1 && y >= rows[ri + 1]) ri++;
        const u = (x + .5 - 60) * (96 - V) / (y + .5 - V), u1 = (x - .5 - 60) * (96 - V) / (y + .5 - V), off = (ri % 2) * 7;
        const col = Math.floor((u + off) / 14), col1 = Math.floor((u1 + off) / 14);
        if (y === rows[ri] || col !== col1) c = [20, 28, 28];
        else { c = stone(Math.round(u / 2), y, ri * 50 + col, 8, [78, 92, 86]); const sd = fbm(u / 16, y / 5, 21); if (sd > .58) c = mx(c, [112, 104, 80], clamp((sd - .58) * 5, 0, .8)); }
        c = sc(c, L(x, y) * (.72 + .35 * (y - 58) / 38));
      } else if (y >= 96) {
        const s = y < 103 ? 0 : 1, r = y - (s ? 103 : 96), top = r < 2; let base = top ? [118, 132, 124] : [58, 70, 70];
        if (top && h2(Math.floor(x / 3), s, 77) < .16) base = [58, 70, 70];
        c = stone(x, y, 700 + s * 40 + Math.floor(x / 10), 9, base); if (top && r === 0) c = sc(c, 1.15); if (!top && h2(x, s, 88) < .035) c = [16, 20, 22];
        c = sc(c, L(x, y));
      }
      B.set(x, y, c);
    }
    [[30, 62, 1, 1, 14], [86, 70, -1, 1, 12], [44, 88, 1, 1, 8], [22, 30, 1, 1, 10], [96, 20, -1, 1, 12], [70, 99, 1, 1, 6], [52, 104, -1, 1, 5]].forEach(([x, y, sx, sy, n]) => crack(B, rnd, x, y, sx, sy, n));
    for (let x = 0; x < W; x++) { if (h2(x, 3, 99) < .12) B.set(x, 95, [64, 128, 78]); if (h2(x, 4, 99) < .1) B.set(x, 102, [64, 128, 78]); }
    rubble(B, rnd, [[19, 90], [24, 93], [97, 88], [93, 93], [34, 60], [83, 59]]);
    pillar(F, 2, 14, 16, 97, 3); pillar(F, 104, 14, 30, 97, 8);
    return (SCENE = { W, H, back: B.done(), front: F.done(), circle: { cx: 60, cy: 80, R: 50, sq: .32 }, creature: { x: 60, bottom: 81 }, pool: { cx: 60, cy: 80, rx: 22, ry: 7 },
      rays: [[26, 9, .28, .2], [48, 6, .22, .14], [66, 12, .16, .2], [88, 6, .1, .12]], shadow: { cx: 60, cy: 81, rx: 18, ry: 3.5 } });
  }

  // ---------- circle B: Elder Sign (on the floor layer, so it sits behind the creature) ----------
  const C = { hi: '#e0fff0', mid: '#5ef2a0', lo: '#1d6a48' };
  const GS = [
    ['.xx..', 'x..x.', 'x.x..', '.x...', '..x..', '.x.x.', 'x...x'], ['x...x', '.x.x.', '..x..', '.xxx.', 'x.x.x', '..x..', '.x...'],
    ['..x..', '.x.x.', '.x...', '..xx.', '....x', '.x..x', '..xx.'], ['xx.xx', '..x..', '.x.x.', 'x...x', '.x.x.', '..x..', '..x..'],
    ['.xxx.', 'x...x', 'x.x.x', 'x..x.', '.x...', '..x..', '...x.'], ['x.x.x', '.xxx.', '..x..', '..x..', '.x.x.', 'x...x', '.x.x.']];
  function glyph(x, G, cx, cy, a) { const h = G.length, w = G[0].length, ox = Math.round(cx - w / 2), oy = Math.round(cy - h / 2);
    x.globalAlpha = 1; x.fillStyle = '#0a0d0e'; x.fillRect(ox - 1, oy, w + 2, h); x.fillRect(ox, oy - 1, w, h + 2);
    x.globalAlpha = a; x.fillStyle = '#080406';
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (G[j][i] === 'x') { x.fillRect(ox + i - 1, oy + j, 1, 1); x.fillRect(ox + i + 1, oy + j, 1, 1); x.fillRect(ox + i, oy + j + 1, 1, 1); }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (G[j][i] === 'x') { x.fillStyle = j < h * .55 ? C.hi : C.mid; x.fillRect(ox + i, oy + j, 1, 1); }
    x.globalAlpha = 1; }
  function ringPx(x, g, r, col) { const n = Math.ceil(TAU * r * g.R * 1.15); x.fillStyle = col;
    for (let i = 0; i < n; i++) { const a = i / n * TAU; x.fillRect(Math.round(g.cx + Math.cos(a) * r * g.R), Math.round(g.cy + Math.sin(a) * r * g.R * g.sq), 1, 1); } }
  function groove(x, g, r, col) { ringPx(x, { cx: g.cx, cy: g.cy + 1, R: g.R, sq: g.sq }, r, '#06090a'); ringPx(x, g, r, col); }
  function lineF(x, g, u0, v0, u1, v1, col) { const x0 = g.cx + u0 * g.R, y0 = g.cy + v0 * g.R * g.sq, x1 = g.cx + u1 * g.R, y1 = g.cy + v1 * g.R * g.sq, n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1;
    for (let i = 0; i <= n; i++) { const t = i / n, px = Math.round(lerp(x0, x1, t)), py = Math.round(lerp(y0, y1, t)); x.fillStyle = '#06090a'; x.fillRect(px, py + 1, 1, 1); x.fillStyle = col; x.fillRect(px, py, 1, 1); } }
  function elderSign(fl, g, t) {
    groove(fl, g, 1, C.mid); groove(fl, g, .95, C.lo); groove(fl, g, .66, C.mid);
    const r0 = -t * .08, S = .9;
    for (let k = 0; k < 5; k++) { const a = r0 + k * TAU / 5 - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      lineF(fl, g, ca * .1, sa * .1, ca * .52 * S, sa * .52 * S, C.hi);
      [[.24, .14, .7], [.38, .1, .6]].forEach(([at, len, sp]) => { [-1, 1].forEach((sd) => { const b = a + sd * sp; lineF(fl, g, ca * at * S, sa * at * S, ca * at * S + Math.cos(b) * len * S, sa * at * S + Math.sin(b) * len * S, C.mid); }); });
      [-1, 1].forEach((sd) => { const b = a + sd * .5; lineF(fl, g, ca * .52 * S, sa * .52 * S, ca * .52 * S + Math.cos(b) * .06, sa * .52 * S + Math.sin(b) * .06, C.hi); }); }
    groove(fl, g, .1, C.hi); fl.fillStyle = C.hi; fl.fillRect(g.cx, g.cy, 1, 1);
    const list = []; for (let k = 0; k < 9; k++) list.push({ G: GS[k % GS.length], r: .82, a: k * TAU / 9 + t * .2 });
    list.sort((p, q) => Math.sin(p.a) - Math.sin(q.a)).forEach((p) => { const sn = Math.sin(p.a); glyph(fl, p.G, g.cx + Math.cos(p.a) * p.r * g.R, g.cy + sn * p.r * g.R * g.sq, .62 + .38 * (sn + 1) / 2); });
  }

  // ---------- the one animation loop ----------
  const LIVE = new Set(); let running = false;
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => es.forEach((e) => { const it = e.target._tp; if (!it) return; it.vis = e.isIntersecting; if (it.vis) { it.frame(performance.now()); kick(); } }), { rootMargin: '80px' }) : null;
  function track(it) { LIVE.add(it); if (io) io.observe(it.el); else it.vis = true; }
  function sweep() { LIVE.forEach((it) => { if (!it.el.isConnected) { LIVE.delete(it); if (io) io.unobserve(it.el); } }); }
  function wanted() { if (document.hidden) return false; for (const it of LIVE) if (it.vis && it.el.isConnected && (!RM || (it.busy && it.busy()))) return true; return false; }
  function kick() { if (!running && wanted()) { running = true; requestAnimationFrame(tick); } }
  function tick(now) { sweep(); for (const it of LIVE) if (it.vis) it.frame(now); if (wanted()) requestAnimationFrame(tick); else running = false; }
  document.addEventListener('visibilitychange', kick);

  // ---------- arena ----------
  const SINK = 1200, RISE = 800;
  const tint = { c: null, x: null };
  function darkSprite(sp, a) { if (!tint.c) { tint.c = mk(64, 64); tint.x = ctx2(tint.c); } const x = tint.x; x.clearRect(0, 0, 64, 64); x.globalCompositeOperation = 'source-over'; x.drawImage(sp.img, 0, 0);
    if (a > 0) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(3,6,12,' + clamp(a) + ')'; x.fillRect(0, 0, 64, 64); x.globalCompositeOperation = 'source-over'; } return tint.c; }
  function disc(x, px, py, r, col) { x.fillStyle = col; for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) { const w = Math.sqrt(Math.max(0, r * r - dy * dy)); x.fillRect(Math.round(px - w), Math.round(py + dy), Math.max(1, Math.round(2 * w)), 1); } }
  function clipPool(c, P, s) { c.beginPath(); c.rect(-10, -10, 200, P.cy + 10); c.ellipse(P.cx, P.cy, Math.max(.5, P.rx * s), Math.max(.5, P.ry * s), 0, 0, TAU); c.clip(); }
  function drawPool(c, g, P, s, t) { if (s <= .03) return; const rx = P.rx * s, ry = Math.max(1, P.ry * s);
    for (let y = Math.floor(P.cy - ry - 1); y <= Math.ceil(P.cy + ry + 1); y++) for (let x = Math.floor(P.cx - rx - 1); x <= Math.ceil(P.cx + rx + 1); x++) {
      const dx = (x + .5 - P.cx) / rx, dy = (y + .5 - P.cy) / ry, d = dx * dx + dy * dy; if (d > 1) continue;
      if (d > .72) { c.fillStyle = C.mid; c.fillRect(x, y, 1, 1); g.fillStyle = C.mid; g.fillRect(x, y, 1, 1); }
      else { const sw = Math.sin(Math.atan2(dy, dx) * 3 + d * 6 - t * 4); c.fillStyle = sw > .85 ? C.lo : '#030407'; c.fillRect(x, y, 1, 1); } } }
  function drawRays(c, rays, t, H) { c.save(); c.globalCompositeOperation = 'lighter';
    rays.forEach(([x, w, sl, a], i) => { const k = a * (.6 + .4 * Math.sin(t * .6 + i * 1.9)), gr = c.createLinearGradient(0, 0, 0, H * .95); gr.addColorStop(0, 'rgba(170,235,225,' + k + ')'); gr.addColorStop(1, 'rgba(170,235,225,0)'); c.fillStyle = gr;
      const sw = Math.sin(t * .25 + i) * 2; c.beginPath(); c.moveTo(x + sw, 0); c.lineTo(x + w + sw, 0); c.lineTo(x + w + sl * H * .95 + sw * 2, H * .95); c.lineTo(x + sl * H * .95 + sw * 2, H * .95); c.closePath(); c.fill(); });
    c.restore(); }

  class Arena {
    constructor(view, sp) {
      this.el = view; this.sp = sp; this.S = scene(); this.mode = 'idle'; this.vis = false; this.acc = 0; this.onTrophy = null; this._shown = false;
      const { W, H } = this.S; this.cv = view.querySelector('.tp-scene'); this.gv = view.querySelector('.tp-glow');
      [this.cv, this.gv].forEach((c) => { c.width = W; c.height = H; }); this.ctx = ctx2(this.cv); this.gctx = ctx2(this.gv);
      this.Lc = {}; this.L = {}; ['fl', 'go', 'cr'].forEach((n) => { this.Lc[n] = mk(W, H); this.L[n] = ctx2(this.Lc[n]); });
      const r = rng(31 + (sp.k || '').length); this.parts = []; for (let i = 0; i < 26; i++) this.parts.push({ k: 'speck', x: r() * W, y: r() * H, vx: (r() - .5) * 1.5, vy: 1 + r() * 2.5, ph: r() * 9 });
      view._tp = this; track(this); this.frame(performance.now());
    }
    busy() { return this.mode !== 'idle' && (performance.now() - this.t0) < SINK + RISE + 1500; }
    beaten() { this.mode = 'sink'; this._shown = false; this.parts = this.parts.filter((p) => p.k === 'speck'); this.t0 = performance.now(); this.vis = this.vis || !io; }
    bubble(x, y, fast) { if (this.parts.length > 160) return; this.parts.push({ k: 'bub', x, y, sp: (fast ? 14 : 6) + Math.random() * 8, ph: Math.random() * 9, big: Math.random() < .35, top: 8 + Math.random() * 40 }); }
    frame(now) {
      const S = this.S, W = S.W, H = S.H, c = this.ctx, g = this.gctx, L = this.L, Lc = this.Lc;
      const t = RM ? 0 : now / 1000, el = this.mode === 'idle' ? -1 : now - this.t0, dt = Math.min(.05, (now - (this.last || now)) / 1000); this.last = now;
      for (const n in L) L[n].clearRect(0, 0, W, H);
      if (this.sp.update) this.sp.update(now);
      const I = (el >= 0 && el < SINK) ? 1 + .8 * Math.sin(Math.PI * el / SINK) : 1;
      elderSign(L.fl, S.circle, t);
      if (!RM && this.mode === 'idle') { this.acc += dt; if (this.acc > .45) { this.acc = 0; const a = Math.random() * Math.PI; this.bubble(S.circle.cx + Math.cos(a) * S.circle.R * .9, S.circle.cy + Math.sin(a) * S.circle.R * S.circle.sq * .9); } }
      c.clearRect(0, 0, W, H);
      c.drawImage(S.back, 0, 0);
      c.globalAlpha = Math.min(1, (.84 + .16 * Math.sin(t * 1.7)) * I); c.drawImage(Lc.fl, 0, 0); c.globalAlpha = 1;
      c.drawImage(S.front, 0, 0);
      if (this.sp.img) this.boss(c, L.go, t, el);
      c.drawImage(Lc.cr, 0, 0);
      this.drawParts(c, dt, t);
      drawRays(c, S.rays, t, H);
      g.clearRect(0, 0, W, H); g.globalAlpha = Math.min(1, .75 * I); g.drawImage(Lc.fl, 0, 0); g.globalAlpha = 1; g.drawImage(Lc.go, 0, 0);
      // the circle's glow stays behind the creature and the pillars: cut their shapes (a little fattened) out of it
      g.globalCompositeOperation = 'destination-out'; [[0, 0], [-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1]].forEach(([dx, dy]) => g.drawImage(Lc.cr, dx, dy)); g.drawImage(S.front, 0, 0); g.globalCompositeOperation = 'source-over';
    }
    drawParts(c, dt, t) {
      const keep = [], W = this.S.W, H = this.S.H;
      for (const p of this.parts) {
        if (p.k === 'speck') { if (!RM) { p.x += (p.vx + Math.sin(t * .7 + p.ph) * .9) * dt; p.y += p.vy * dt; if (p.y > H) { p.y = -1; p.x = Math.random() * W; } if (p.x < 0) p.x += W; if (p.x > W) p.x -= W; }
          c.fillStyle = 'rgba(205,235,225,' + (.28 + .25 * Math.sin(p.ph + t)) + ')'; c.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); keep.push(p); continue; }
        if (p.k === 'bub') { p.y -= p.sp * dt; p.x += Math.sin(t * 4 + p.ph) * .25; if (p.y < p.top) continue; const x = Math.round(p.x), y = Math.round(p.y);
          if (p.big) { c.fillStyle = '#e8ffff'; c.fillRect(x, y, 1, 1); c.fillStyle = 'rgba(122,200,208,.85)'; c.fillRect(x + 1, y, 1, 1); c.fillRect(x, y + 1, 1, 1); c.fillStyle = 'rgba(58,122,136,.8)'; c.fillRect(x + 1, y + 1, 1, 1); }
          else { c.fillStyle = 'rgba(200,245,245,.8)'; c.fillRect(x, y, 1, 1); } keep.push(p); continue; }
        if (p.k === 'spark') { p.life -= dt; if (p.life <= 0) continue; p.y += p.vy * dt; c.fillStyle = 'rgba(255,224,140,' + clamp(p.life) + ')'; c.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); this.L.go.fillStyle = '#ffd56a'; this.L.go.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); keep.push(p); continue; }
      }
      this.parts = keep;
    }
    boss(c, go, t, el) {
      const k = this.L.cr, S = this.S, cr = S.creature, P = S.pool, sp = this.sp, sw = sp.w, sh = sp.h;
      const bob = Math.sin(t * 1.8) > .4 ? -1 : 0, X = Math.round(cr.x - sw / 2), Y = cr.bottom - sh + bob;
      if (this.mode === 'idle') { c.fillStyle = 'rgba(2,4,6,.4)'; c.beginPath(); c.ellipse(S.shadow.cx, S.shadow.cy, S.shadow.rx, S.shadow.ry, 0, 0, TAU); c.fill(); k.drawImage(sp.img, X, Y); return; }
      const p = clamp(el / SINK);
      if (RM) { const a = clamp(el / 500); if (a < 1) { k.globalAlpha = 1 - a; k.drawImage(sp.img, X, Y); k.globalAlpha = 1; } this.trophy(c, go, t, SINK + RISE, P); return; }
      // D2 Dragged down: a pool opens, five tentacles rise out of its rim, wrap round the creature and pull it under
      const closeAt = (start) => el > start ? 1 - clamp((el - start) / 500) : 1;
      const s = eOut(clamp(p / .15)) * closeAt(SINK + 500); drawPool(c, go, P, s, t);
      const gr = clamp(p / .28), pull = eIn(clamp((p - .25) / .75)), dy = pull * (sh + 10), shx = (p > .25 && p < 1) ? Math.round(Math.sin(el * .08)) : 0;
      const cx0 = X + shx, cy0 = Y + dy;
      k.save(); clipPool(k, P, Math.max(s, .3)); k.drawImage(darkSprite(sp, pull * .55), 0, 0, sw, sh, cx0, cy0, sw, sh);
      const A = [[.12, .7], [.31, .44], [.52, .81], [.74, .3], [.88, .7]].map(([u, v]) => [u * sw, v * sh]);
      if (p < 1) A.forEach(([ax, ay], i) => { const ang = Math.PI * (.95 - i * .225), rim = [P.cx + Math.cos(ang) * P.rx * s * .85, P.cy + Math.sin(ang) * P.ry * s * .85], an = [cx0 + ax, cy0 + ay], ctl = [(rim[0] + an[0]) / 2 + (i - 2) * 7, Math.min(rim[1], an[1]) - 8 - (i % 2) * 5];
        const n = 30; for (let j = 0; j <= n * gr; j++) { const u = j / n; let px = (1 - u) * (1 - u) * rim[0] + 2 * (1 - u) * u * ctl[0] + u * u * an[0]; const py = (1 - u) * (1 - u) * rim[1] + 2 * (1 - u) * u * ctl[1] + u * u * an[1];
          px += Math.sin(u * 7 + el * .02 + i) * 1.2 * (1 - u); const r = 2.3 - 1.5 * u; disc(k, px, py, r, '#1e0f2e'); k.fillStyle = '#6a3a9a'; k.fillRect(Math.round(px), Math.round(py - r), 1, 1); if (j % 4 === 0 && r > 1.2) { k.fillStyle = '#d49ae0'; k.fillRect(Math.round(px), Math.round(py + r - 1), 1, 1); } }
        if (gr >= 1) { for (let j = 0; j < 7; j++) { const a = j * .6 + i, px = an[0] + Math.cos(a) * (3 - j * .3), py = an[1] + Math.sin(a) * (2.4 - j * .25); disc(k, px, py, .9, '#2a1640'); } } });
      k.restore(); this.trophy(c, go, t, el, P);
    }
    trophy(c, go, t, el, P) {
      const q = clamp((el - SINK) / RISE); if (q <= 0) return;
      const ba = q < 1 ? .5 * Math.sin(Math.PI * Math.min(1, q * 1.2)) + .15 : .14 + .05 * Math.sin(t * 2), y = Math.round(lerp(P.cy + 2, P.cy - 30, eOut(q)));
      c.save(); c.globalCompositeOperation = 'lighter'; const gr = c.createLinearGradient(0, P.cy, 0, 0); gr.addColorStop(0, 'rgba(255,214,120,' + ba + ')'); gr.addColorStop(1, 'rgba(255,214,120,0)'); c.fillStyle = gr; c.fillRect(P.cx - 7, 0, 14, P.cy); c.restore();
      go.fillStyle = 'rgba(255,200,100,' + (ba * .9) + ')'; go.fillRect(P.cx - 5, y - 4, 10, Math.max(0, P.cy - y + 4));
      if (!this._shown) { this._shown = true; if (this.onTrophy) this.onTrophy(); }
      if (!RM && Math.random() < .3) this.parts.push({ k: 'spark', x: P.cx + (Math.random() - .5) * 18, y: y + 16 * Math.random(), vy: -6 - Math.random() * 8, life: .6 + Math.random() * .6 });
    }
  }

  // ---------- K1 Silver etching (one picture per creature, cached) ----------
  const CARDS = {};
  function k1(sp) {
    if (CARDS[sp.k]) return CARDS[sp.k];
    const W = 52, H = 80, P = painter(W, H), M = painter(W, H), r = rng('1'.charCodeAt(0) * 7 + 3), SIL = [204, 210, 226], DIM = [92, 96, 112];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let c = sc([8, 7, 11], .8 + .6 * fbm(x / 2, y / 9, 4)); if (y % 2 === 0) c = mx(c, [24, 24, 32], .5); if (h2(x, y, 6) < .015) c = [26, 24, 32]; P.set(x, y, c); }
    const ox = Math.round(26 - sp.w / 2), oy = 59 - sp.h, cm = new Map(); sp.px.forEach((p) => cm.set((p.y + oy) * W + (p.x + ox), p.c));
    const out = (x, y) => !cm.has(y * W + x), edge = (x, y) => out(x - 1, y) || out(x + 1, y) || out(x, y - 1) || out(x, y + 1);
    const contour = (x, y, col) => [[1, 0], [0, 1]].some(([dx, dy]) => { const o = cm.get((y + dy) * W + x + dx); return o && Math.abs(o[0] - col[0]) + Math.abs(o[1] - col[1]) + Math.abs(o[2] - col[2]) > 110; });
    const isEye = (col) => (col[0] > 240 && col[1] > 190 && col[2] < 90) || (col[0] > 220 && col[1] < 90 && col[2] < 120);
    // the faint red moon behind
    const mcx = 31, mcy = 25, mr = 13;
    for (let y = 0; y < 60; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x + .5 - mcx, y + .5 - mcy);
      if (d <= mr) { let c = sc([64, 10, 15], .8 + .4 * fbm(x / 4, y / 4, 2)); if (d > mr - 1) c = [120, 26, 28]; P.set(x, y, c); M.set(x, y, c); } else if (d < mr + 3 && (x + y) % 2 === 0) P.set(x, y, [30, 6, 9]); }
    const stars = []; for (let k = 0; k < 16; k++) { const x = 6 + Math.floor(r() * 40), y = 8 + Math.floor(r() * 44); if (Math.hypot(x - mcx, y - mcy) > mr + 4 && out(x, y)) stars.push([x, y]); }
    // the creature in fine silver outline with thin inner lines and a red eye
    for (const [k, col] of cm) { const x = k % W, y = (k - x) / W; if (y < 0 || y >= H) continue; let c = [6, 6, 10];
      if (edge(x, y)) c = SIL; else if (contour(x, y, col)) c = DIM; if (isEye(col)) c = [255, 59, 59]; P.set(x, y, c); }
    // frame, corner studs, numeral box, divider and plate
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) { const e = x === 0 || y === 0 || x === W - 1 || y === H - 1, i1 = (x === 2 || x === W - 3) && y >= 2 && y <= H - 3 || (y === 2 || y === H - 3) && x >= 2 && x <= W - 3, i2 = (x === 4 || x === W - 5) && y >= 4 && y <= H - 5 || (y === 4 || y === H - 5) && x >= 4 && x <= W - 5;
      if (e) P.set(x, y, [2, 2, 4]); else if (i1) P.set(x, y, SIL); else if (i2 && (x + y) % 2 === 0) P.set(x, y, DIM); }
    [[3, 3], [W - 4, 3], [3, H - 4], [W - 4, H - 4]].forEach(([x, y]) => { P.set(x, y, [255, 255, 255]); [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => P.set(x + a, y + b, SIL)); });
    stars.forEach(([x, y]) => P.set(x, y, [120, 124, 140]));
    for (let y = 1; y <= 9; y++) for (let x = 18; x <= 33; x++) P.set(x, y, (y === 1 || y === 9 || x === 18 || x === 33) ? SIL : [6, 6, 9]);
    for (let x = 6; x < 46; x++) P.set(x, 60, x % 2 ? SIL : DIM);
    for (let y = 62; y <= 77; y++) for (let x = 4; x <= 47; x++) { const ed = y === 62 || y === 77 || x === 4 || x === 47; P.set(x, y, ed ? SIL : sc([6, 6, 9], .9 + .2 * fbm(x / 3, y / 3, 5))); }
    [[0, 0], [1, 0], [0, 1], [W - 1, 0], [W - 2, 0], [W - 1, 1], [0, H - 1], [1, H - 1], [0, H - 2], [W - 1, H - 1], [W - 2, H - 1], [W - 1, H - 2]].forEach(([x, y]) => P.clear(x, y));
    const perim = []; for (let x = 2; x < W - 2; x++) perim.push([x, 2]); for (let y = 2; y < H - 2; y++) perim.push([W - 3, y]); for (let x = W - 3; x >= 2; x--) perim.push([x, H - 3]); for (let y = H - 3; y >= 2; y--) perim.push([2, y]);
    const base = P.done(), moon = M.done();
    return (CARDS[sp.k] = { base, anim(c, g, t) {
      g.globalAlpha = .3 + (RM ? 0 : .2 * Math.sin(t * 1.1)); g.drawImage(moon, 0, 0); g.globalAlpha = 1;
      stars.forEach(([x, y], i) => { c.globalAlpha = RM ? .7 : .3 + .7 * Math.max(0, Math.sin(t * 2 + i * 1.7)); c.fillStyle = '#e8ecf8'; c.fillRect(x, y, 1, 1); }); c.globalAlpha = 1;
      if (RM) return;
      const pos = (t * 45) % (perim.length + 120); for (let k = 0; k < 6; k++) { const i = Math.floor(pos) - k; if (i < 0 || i >= perim.length) continue; const [x, y] = perim[i]; c.globalAlpha = 1 - k / 6; c.fillStyle = '#ffffff'; c.fillRect(x, y, 1, 1); g.globalAlpha = 1 - k / 6; g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); }
      c.globalAlpha = 1; g.globalAlpha = 1; } });
  }
  // HTML for one K1 card; painted by paint(). s = CSS px per card pixel (null = set later by the caller through --s)
  function cardHTML(b, s, withText) {
    const k = kOf(b), meta = metaOf(k), num = NUM(hoursOf(b, meta));
    let txt = '';
    if (withText) txt = '<span class="tp-tnum">' + num + '</span><span class="tp-plate"><span class="tp-tn">' + esc(b.name) + '</span><span class="tp-td">' + esc(longDate(b.on)) + ' · ' + esc(b.reward == null ? '' : b.reward) + runeImg('') + '</span></span>';
    return '<div class="tp-tcard" data-tp-card="' + esc(k) + '"' + (s ? ' style="--s:' + s + '"' : '') + (withText ? ' role="img" aria-label="Trophy card: ' + esc(b.name) + ', Vanquished"' : ' aria-hidden="true"') + '>' +
      '<canvas class="tp-tc" width="52" height="80"></canvas><canvas class="tp-tg" width="52" height="80"></canvas>' + txt + '</div>';
  }
  function liveCard(el) {
    if (el._tp || el._tpWait) return; el._tpWait = true;
    const sp = sprite(el.getAttribute('data-tp-card'));
    sp.ready.then(() => { el._tpWait = false; if (!el.isConnected || el._tp || !sp.img) return;
      const card = k1(sp), c = ctx2(el.querySelector('.tp-tc')), g = ctx2(el.querySelector('.tp-tg'));
      const it = { el, vis: false, frame(now) { const t = RM ? 0 : now / 1000; c.clearRect(0, 0, 52, 80); g.clearRect(0, 0, 52, 80); c.drawImage(card.base, 0, 0); card.anim(c, g, t); } };
      el._tp = it; it.frame(performance.now()); track(it); });
  }
  function liveArena(view) {
    if (view._tp || view._tpWait) return; view._tpWait = true;
    const sp = sprite(view.getAttribute('data-tp-k'));
    sp.ready.then(() => { view._tpWait = false; if (!view.isConnected || view._tp) return; new Arena(view, sp); kick(); });
  }

  // ---------- S1 Claw slash ----------
  function shards(el, host, n, dur, imp) {
    const hr = host.getBoundingClientRect(), r = el.getBoundingClientRect(), w = r.width, h = r.height, px = imp[0] * w, py = imp[1] * h;
    const box = document.createElement('div'); box.className = 'tp-shardbox'; Object.assign(box.style, { left: (r.left - hr.left) + 'px', top: (r.top - hr.top) + 'px', width: w + 'px', height: h + 'px' }); host.appendChild(box);
    const ang = []; for (let i = 0; i < n; i++) ang.push((i + .2 + Math.random() * .6) / n * TAU);
    const hit = (a) => { const dx = Math.cos(a), dy = Math.sin(a); let tt = 1e9; if (dx > 1e-6) tt = Math.min(tt, (w - px) / dx); if (dx < -1e-6) tt = Math.min(tt, -px / dx); if (dy > 1e-6) tt = Math.min(tt, (h - py) / dy); if (dy < -1e-6) tt = Math.min(tt, -py / dy); return [px + dx * tt, py + dy * tt]; };
    const corners = [[0, 0], [w, 0], [w, h], [0, h]];
    for (let i = 0; i < n; i++) { const a1 = ang[i], a2 = i === n - 1 ? ang[0] + TAU : ang[i + 1];
      const pts = [[px, py], hit(a1)]; corners.map((c) => { let a = Math.atan2(c[1] - py, c[0] - px); while (a < a1) a += TAU; return [a, c]; }).filter(([a]) => a < a2).sort((u, v) => u[0] - v[0]).forEach(([, c]) => pts.push(c)); pts.push(hit(a2));
      const cl = el.cloneNode(true); cl.removeAttribute('id'); cl.classList.remove('tp-lost'); Object.assign(cl.style, { width: w + 'px', height: h + 'px', clipPath: 'polygon(' + pts.map((p) => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px').join(',') + ')' });
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length; cl.style.transformOrigin = cx + 'px ' + cy + 'px'; box.appendChild(cl);
      const am = (a1 + a2) / 2, dist = 10 + Math.random() * 16;
      if (cl.animate) cl.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + (Math.cos(am) * dist) + 'px,' + (Math.sin(am) * dist * .6 + 26 + Math.random() * 14) + 'px) rotate(' + ((Math.random() - .5) * 80) + 'deg)', opacity: 0 }], { duration: dur, easing: 'cubic-bezier(.25,.55,.5,1)', fill: 'forwards' }); }
    setTimeout(() => box.remove(), dur + 30);
  }
  function claw(x, t, B, st, rnd) { const fade = t < 260 ? 1 : clamp(1 - (t - 260) / 200);
    for (let i = 0; i < 3; i++) { const q = clamp((t - i * 30) / 110); if (q <= 0) continue; const ox = B.nx + Math.min(B.nw, 70) * .25 + i * 10, x0 = ox - 9, y0 = B.y - 9, x1 = ox + 13, y1 = B.y + B.h + 9, n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let j = 0; j <= n * q; j++) { const u = j / n, px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u, w = .5 + 2.4 * Math.sin(Math.PI * u);
        x.globalAlpha = fade * .45; x.fillStyle = '#ff2a1a'; x.fillRect(Math.round(px - w - 1), Math.round(py), Math.ceil(2 * w + 2), 1);
        x.globalAlpha = fade; x.fillStyle = '#b0101a'; x.fillRect(Math.round(px - w), Math.round(py), Math.ceil(2 * w), 1); if (w > 1.2) { x.fillStyle = '#ffd8c0'; x.fillRect(Math.round(px - w / 3), Math.round(py), Math.max(1, Math.round(w * .6)), 1); } }
      if (q < 1) { x.globalAlpha = 1; x.fillStyle = '#fff'; x.fillRect(Math.round(x0 + (x1 - x0) * q) - 1, Math.round(y0 + (y1 - y0) * q) - 1, 3, 3); } }
    if (t > 130) { if (!st.sp) { st.sp = []; for (let k = 0; k < 14; k++) st.sp.push({ x: B.nx + 14 + rnd() * 24, y: B.y + B.h * rnd(), vx: (rnd() - .3) * 90, vy: -rnd() * 70 }); }
      const a = (t - 130) / 1000; x.globalAlpha = clamp(1 - (t - 130) / 320); x.fillStyle = '#ffb070'; st.sp.forEach((s) => x.fillRect(Math.round(s.x + s.vx * a), Math.round(s.y + s.vy * a + 160 * a * a), 1, 1)); }
    x.globalAlpha = 1; }
  function markStage(b) { b.classList.add('tp-done'); b.querySelector('.tp-sn').textContent = '✓'; const dd = b.querySelector('.tp-dd'); if (dd) { dd.className = 'tp-dd'; dd.textContent = 'hit'; } b.setAttribute('aria-pressed', 'true'); }
  const hostOf = (id) => { const want = String(id); for (const el of document.querySelectorAll('.tp-boss[data-tp-boss]')) if (el.getAttribute('data-tp-boss') === want) return el; return null; };
  function recount(host) { const all = host.querySelectorAll('.tp-stage'), n = host.querySelectorAll('.tp-stage.tp-done').length, cnt = host.querySelector('.tp-cnt'); if (cnt) cnt.textContent = n + ' of ' + all.length + ' stages'; }

  // ---------- public ----------
  const BOSSES = {};
  function dueTag(s, today) {
    if (s.done) return s.late ? '<span class="tp-dd">late</span>' : '<span class="tp-dd">hit</span>';
    if (!s.due) return '';
    const d = toDate(s.due); if (!d || isNaN(d)) return '<span class="tp-dd tp-soon">' + esc(s.due) + '</span>';
    const due = iso(d); if (due < today) return '<span class="tp-dd tp-over">overdue</span>'; if (due === today) return '<span class="tp-dd">today</span>';
    const days = Math.round((d - toDate(today)) / 864e5);
    return '<span class="tp-dd' + (days > 2 ? ' tp-soon' : '') + '">' + (days < 7 ? DAYS[d.getDay()] : d.getDate() + ' ' + MONS[d.getMonth()]) + '</span>';
  }
  function card(boss, opts) {
    css(); opts = opts || {}; const b = boss || {}, stages = b.stages || [], k = kOf(b), meta = metaOf(k), n = stages.length, nd = stages.filter((s) => s.done).length;
    BOSSES[String(b.id)] = b; const today = opts.today || iso(new Date());
    const blocks = n || 1, lost = n ? nd : (b.hp != null && b.hp <= 0 ? 1 : 0);
    let h = '<div class="tp-boss" data-tp-boss="' + esc(b.id) + '">' +
      '<div class="tp-arena" data-tp-k="' + esc(k) + '"><canvas class="tp-scene" width="120" height="110"></canvas><canvas class="tp-glow" width="120" height="110"></canvas><div class="tp-reveal" hidden></div></div>' +
      '<div class="tp-bp"><div class="tp-name"><span>' + esc(b.name) + '</span>' + (opts.editAttrs ? '<button type="button" class="tp-edit" ' + opts.editAttrs + '>Edit</button>' : '') + '</div>' +
      '<div class="tp-sub"><span class="tp-num">' + NUM(hoursOf(b, meta)) + '</span><span>' + esc(meta.name) + ' · ' + esc(meta.size || (hoursOf(b, meta) + 'h')) + ' · <span class="tp-cnt">' + nd + ' of ' + n + ' stages</span></span></div>' +
      '<div class="tp-hp" aria-label="' + (blocks - lost) + ' of ' + blocks + ' health left">';
    for (let i = 0; i < blocks; i++) h += '<i class="tp-hpb' + (i >= blocks - lost ? ' tp-lost' : '') + '"></i>';
    h += '</div><ol class="tp-stages">';
    stages.forEach((s, i) => { h += '<li><button type="button" class="tp-stage' + (s.done ? ' tp-done' : '') + (s.late ? ' tp-late' : '') + '" ' + (opts.stageAttrs ? opts.stageAttrs(i) : '') + ' aria-pressed="' + !!s.done + '">' +
      '<span class="tp-sn">' + (s.done ? '✓' : i + 1) + '</span><span class="tp-nm">' + esc(s.name) + '</span>' + dueTag(s, today) + '</button></li>'; });
    h += '</ol><div class="tp-foot"><span class="tp-pay">' + esc(b.reward == null ? '' : b.reward) + runeImg('') + '</span><span class="tp-tro">+ trophy when beaten</span>' + (opts.banishHtml || '') + '</div></div></div>';
    return h;
  }
  function paint(root) {
    if (typeof document === 'undefined') return; css(); sweep();
    const r = root || document;
    r.querySelectorAll('.tp-arena[data-tp-k]').forEach(liveArena);
    r.querySelectorAll('.tp-tcard[data-tp-card]').forEach(liveCard);
    kick();
  }
  function strike(bossId, stageIndex) {
    return new Promise((res) => {
      const host = hostOf(bossId); if (!host) return res();
      const stage = host.querySelectorAll('.tp-stage')[stageIndex]; if (!stage) return res();
      const blocks = [...host.querySelectorAll('.tp-hpb')], already = stage.classList.contains('tp-done');
      // the block to break: the last one still standing, or (if the app already re-drew the card as done) the newest lost one
      let block = null; if (already) block = blocks.find((b) => b.classList.contains('tp-lost')) || null; else for (const b of blocks) if (!b.classList.contains('tp-lost')) block = b;
      const finish = () => { markStage(stage); recount(host); res(); };
      if (RM || !stage.getBoundingClientRect().width) { if (block) block.classList.add('tp-lost'); finish(); return; }
      if (already && block) block.classList.remove('tp-lost');
      const hr = host.getBoundingClientRect(), sr = stage.getBoundingClientRect(), M = 28, cw = Math.ceil((sr.width + 2 * M) / 2), ch = Math.ceil((sr.height + 2 * M) / 2);
      const cv = mk(cw, ch); cv.className = 'tp-fx'; Object.assign(cv.style, { left: (sr.left - hr.left - M) + 'px', top: (sr.top - hr.top - M) + 'px', width: cw * 2 + 'px', height: ch * 2 + 'px' }); host.appendChild(cv);
      const x = ctx2(cv), nm = stage.querySelector('.tp-nm').getBoundingClientRect(), B = { x: M / 2, y: M / 2, w: sr.width / 2, h: sr.height / 2, nx: M / 2 + (nm.left - sr.left) / 2, nw: nm.width / 2 };
      const st = {}, rnd = rng(Math.floor(performance.now())), t0 = performance.now(); let hit = false;
      const step = (now) => { const t = now - t0; x.clearRect(0, 0, cw, ch); claw(x, t, B, st, rnd);
        if (!hit && t >= 130) { hit = true; if (block) { shards(block, host, 5, 360, [.5, .5]); block.classList.add('tp-lost'); } markStage(stage); recount(host);
          if (stage.animate) stage.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-3px,1px)' }, { transform: 'translate(3px,-1px)' }, { transform: 'translate(-1px,0)' }, { transform: 'translate(0,0)' }], { duration: 170 }); }
        if (t < 480 && cv.isConnected) requestAnimationFrame(step); else { cv.remove(); finish(); } };
      requestAnimationFrame(step);
    });
  }
  function beaten(bossId, done) {
    let fin = false; const finish = () => { if (fin) return; fin = true; if (typeof done === 'function') done(); };
    const host = hostOf(bossId), view = host && host.querySelector('.tp-arena'), ar = view && view._tp;
    if (!ar) { setTimeout(finish, 0); return; }
    const b = BOSSES[String(bossId)] || {}, reveal = view.querySelector('.tp-reveal');
    ar.onTrophy = () => {
      if (reveal) { reveal.style.setProperty('--s', (Math.max(120, view.clientWidth) / 165).toFixed(3));
        reveal.innerHTML = '<div class="tp-rglow"></div>' + cardHTML({ name: b.name, k: kOf(b), size: b.size, reward: b.reward, on: new Date() }, null, true);
        reveal.hidden = false; reveal.classList.remove('tp-show'); void reveal.offsetWidth; reveal.classList.add('tp-show'); paint(reveal); }
      setTimeout(finish, RM ? 700 : 1700);
    };
    ar.beaten(); kick();
    setTimeout(finish, 6000); // never hang the app if the arena is off screen or the tab is hidden
  }
  function trophy(b, opts) {
    css(); b = b || {}; opts = opts || {}; const k = kOf(b), meta = metaOf(k), num = NUM(hoursOf(b, meta));
    return '<li class="tp-vrow' + (opts.fresh ? ' tp-fresh' : '') + '"' + (opts.attrs ? ' ' + opts.attrs : '') + '>' + cardHTML(b, 1, false) +
      '<div class="tp-vt"><span class="tp-w">Vanquished · ' + esc(longDate(b.on)) + '</span><b>' + esc(b.name) + '</b><span class="tp-m"><span class="tp-num">' + num + '</span>' + esc(meta.name) + ' · ' + esc(meta.size || (hoursOf(b, meta) + 'h')) + ' · ' + esc(b.reward == null ? '' : b.reward) + runeImg('') + '</span></div></li>';
  }
  window.TEMPLE = { card, paint, strike, beaten, trophy };
})();
