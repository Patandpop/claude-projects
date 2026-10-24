(function () {
  const PX = {};
  function render(g, w, h, pal, ol) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
      const v = g[y][i]; if (!v) continue;
      x.fillStyle = v === '__ol' ? ol : v; x.fillRect(i, y, 1, 1);
    }
    return { src: c.toDataURL(), w, h };
  }
  function make(w, h, pal, draw, o) {
    o = o || {};
    const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill(null));
    const set = (x, y, c) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; };
    const A = {
      set, get: (x, y) => (x >= 0 && y >= 0 && x < w && y < h) ? g[y][x] : null,
      ell(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) set(x, y, c); } },
      rect(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) set(x + i, y + j, c); },
      line(x0, y0, x1, y1, c) { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) * 2 || 1; for (let i = 0; i <= n; i++) set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); },
      tri(ax, ay, bx, by, cx, cy, c) { const s = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry); for (let y = Math.floor(Math.min(ay, by, cy)); y <= Math.max(ay, by, cy); y++) for (let x = Math.floor(Math.min(ax, bx, cx)); x <= Math.max(ax, bx, cx); x++) { const X = x + .5, Y = y + .5, d1 = s(X, Y, ax, ay, bx, by), d2 = s(X, Y, bx, by, cx, cy), d3 = s(X, Y, cx, cy, ax, ay); if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) set(x, y, c); } },
      tent(x, y, len, a, curl, t0, c) { for (let i = 0; i < len; i++) { const t = Math.max(.55, t0 * (1 - i / len)); A.ell(x, y, t, t, c); x += Math.cos(a) * .8; y += Math.sin(a) * .8; a += curl; } },
      ring(cx, cy, r, c) { for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; set(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c); } }
    };
    draw(A);
    const empty = (x, y) => A.get(x, y) === null;
    const out = g.map(r => r.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = g[y][x]; if (!k) continue; const p = pal[k];
      if (Array.isArray(p) && o.shade !== false) {
        if (empty(x, y - 1) || empty(x - 1, y)) out[y][x] = p[1];
        else if (empty(x, y + 1) || empty(x + 1, y)) out[y][x] = p[2];
        else if ((empty(x, y + 2) || empty(x + 2, y)) && (x + y) % 2 === 0) out[y][x] = p[2];
        else out[y][x] = p[0];
      } else out[y][x] = Array.isArray(p) ? p[0] : (p || k);
    }
    if (o.ol !== false) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !empty(x + dx, y + dy))) out[y][x] = '__ol';
    }
    return render(out, w, h, pal, o.ol || '#120b14');
  }
  function grid(rows, map) {
    const h = rows.length, w = rows[0].length;
    const g = rows.map(r => r.split('').map(ch => ch === '.' ? null : map[ch]));
    return render(g, w, h, {}, '#000');
  }
  PX.make = make; PX.grid = grid;

  // ——— Doubloon (tentacle face) ———
  const coinMap = { o: '#4a2c0c', d: '#a8681c', g: '#e3a93a', l: '#ffd56a', w: '#fff3c4', k: '#2a160a', t: '#8a4e14', e: '#5ef2a0' };
  PX.coin = grid([
    '.....oooooo.....',
    '...oolllllgdoo..',
    '..olllggggggddo.',
    '.olwlggggggggddo',
    '.olggggggggggddo',
    'olggkkggggkkgddo',
    'olggkeggggkegddo',
    'olggggggggggggdo',
    'olgggttttttgggdo',
    'olggtgtggtgtggdo',
    'olggtgtggtgtggdo',
    '.oggtggtgtggtddo',
    '.odgggtggggtgddo',
    '..oddggggggdddo.',
    '...ooddddddoo...',
    '.....oooooo.....'
  ], coinMap);
  PX.coinEdge = grid([
    '..oooo..', '.oddddo.', 'odlgggdo', 'odlgggdo', 'odlgggdo', 'odlgggdo', 'odlgggdo', 'odlgggdo',
    'odlgggdo', 'odlgggdo', 'odlgggdo', 'odlgggdo', 'odlgggdo', 'odlgggdo', '.oddddo.', '..oooo..'
  ], coinMap);

  // ——— Icons ———
  PX.flame = grid(['...g...', '..ggg..', '..gGg..', '.gGGGg.', '.gGwGg.', 'gGGwGGg', 'gGwwwGg', '.gGwGg.', '..ggg..'], { g: '#1d8a52', G: '#5ef2a0', w: '#d8ffe8' });
  PX.heart = grid(['.oo.oo.', 'orrorro', 'orwrrro', 'orrrrro', '.orrro.', '..oro..', '...o...'], { o: '#3a0a10', r: '#e8414a', w: '#ffb3a8' });
  PX.xp = grid(['...o...', '..olo..', 'oolglo.', 'olgggoo', '.ogggo.', '.olgo..', '.o.o...'].map(r => r.padEnd(7, '.')), { o: '#0d3a24', l: '#c8ffe0', g: '#5ef2a0' });
  PX.skull = grid(['..oooo..', '.owwwwo.', 'owwwwwwo', 'owkwwkwo', 'owkwwkwo', '.owwwwo.', '..okko..', '..owwo..'], { o: '#3a0a10', w: '#f0e2d0', k: '#a3202a' });
  PX.seal = grid(['...oooo...', '..orrrro..', '.orRRRRro.', 'orRwRRwRro', 'orRRwwRRro', 'orRRwwRRro', 'orRwRRwRro', '.orRRRRro.', '..orrrro..', '...oooo...'], { o: '#2a0a2a', r: '#7a3ab0', R: '#a46ae0', w: '#e8d4ff' });
  PX.waxRed = grid(['...oooo...', '..orrrro..', '.orRRRRro.', 'orRRwRRRro', 'orRwwwRRro', 'orRRwRRRro', 'orRRRRRRro', '.orRRRRro.', '..orrrro..', '...oooo...'], { o: '#3a0a10', r: '#8a1a22', R: '#c4323a', w: '#ff9a8a' });
  PX.moon = grid(['..ooo..', '.oyyo..', 'oyyo...', 'oyyo...', 'oyyo...', '.oyyo..', '..ooo..'].map(r => r.padEnd(7, '.')), { o: '#1a2a4a', y: '#cfe0ff' });
  PX.spark = grid(['...w...', '...g...', '.w.g.w.', 'wggGggw', '.w.g.w.', '...g...', '...w...'], { w: '#fff6c4', g: '#ffd56a', G: '#ffffff' });
  PX.trophy = grid(['oooooooooo', 'ogllggggdo', 'ogllggggdo', '.ogggggdo.', '..ogggdo..', '...oggo...', '....oo....', '...oggo...', '..oddddo..', '..oooooo..'], { o: '#4a2c0c', g: '#e3a93a', l: '#ffd56a', d: '#a8681c' });
  PX.rune = grid(['..o..', '.ogo.', 'ogggo', '.ogo.', 'o.g.o', '..g..'], { o: '#0d3a24', g: '#5ef2a0' });
  PX.tick = grid(['.......gg', '......ggg', '.....ggg.', 'gg..ggg..', 'ggggg g..'.replace(' ', 'g'), '.ggg.....', '..g......'].map(r => r.padEnd(9, '.')), { g: '#d8ffe8' });

  // ——— Bosses ———
  const PI = Math.PI;
  PX.bosses = {
    spawn: make(24, 22, { b: ['#e8645a', '#ff9a85', '#a8323a'], w: '#ffe9c9', y: '#ffd03a', k: '#1a0a0c' }, A => {
      A.ell(12, 9.5, 7.2, 6.6, 'b');
      A.set(7, 3, 'b'); A.set(6, 2, 'b'); A.set(17, 3, 'b'); A.set(18, 2, 'b');
      A.tent(7, 14, 7, PI / 2 + .4, -.14, 2.2, 'b'); A.tent(12, 15, 7, PI / 2, .1, 2.2, 'b'); A.tent(17, 14, 7, PI / 2 - .4, .14, 2.2, 'b');
      A.ell(12, 8.5, 3.6, 3.4, 'w'); A.ell(12, 9, 2.4, 2.6, 'y'); A.rect(12, 7, 1, 4, 'k'); A.set(10, 7, 'w');
    }),
    shog: make(34, 28, { p: ['#5a3484', '#8a5ec0', '#2a1640'], e: '#b6ff8a', k: '#0a0410', w: '#f4ead8' }, A => {
      A.ell(17, 15, 12, 8.5, 'p'); A.ell(9, 11, 6, 6, 'p'); A.ell(23, 10, 7, 6.5, 'p'); A.ell(16, 7, 6, 5, 'p'); A.ell(28, 17, 5, 6, 'p'); A.ell(6, 18, 5, 5, 'p');
      A.tent(8, 22, 5, PI / 2, .2, 1.6, 'p'); A.tent(26, 22, 5, PI / 2, -.2, 1.6, 'p'); A.tent(17, 23, 4, PI / 2, 0, 1.4, 'p');
      [[10, 10, 2.4], [22, 8, 3], [16, 14, 1.6], [27, 15, 1.9], [6, 17, 1.5], [19, 4.5, 1.3]].forEach(([x, y, r]) => { A.ell(x, y, r, r, 'e'); A.set(x, y, 'k'); A.set(x - .9, y, 'k'); });
      A.rect(11, 19, 11, 3, 'k'); for (let i = 11; i < 22; i += 2) { A.set(i, 19, 'w'); A.set(i + 1, 21, 'w'); }
    }),
    levi: make(42, 34, { s: ['#2f8a72', '#6fd0b0', '#15463c'], f: ['#e8645a', '#ff9a85', '#a8323a'], y: '#ffd03a', k: '#0a1010', w: '#f4ead8', a: '#123844', A: '#2a6a7a' }, A => {
      for (let i = 0; i <= 20; i++) { const t = i / 20 * PI; A.ell(10 - Math.cos(t) * 7, 26 - Math.sin(t) * 8, 2.8, 2.8, 's'); }
      for (let i = 0; i <= 16; i++) { const t = i / 16 * PI; A.ell(24 - Math.cos(t) * 5, 26 - Math.sin(t) * 6, 2.6, 2.6, 's'); }
      for (let i = 0; i <= 16; i++) A.ell(31 + Math.sin(i / 16 * 1.4) * 2, 26 - i, 3 - i * .04, 3, 's');
      A.ell(32, 9, 6, 4.2, 's'); A.tri(34, 10, 41, 7, 40, 12, 's');
      A.tri(35, 10, 41, 10, 38, 12.5, 'k'); A.set(37, 10, 'w'); A.set(39, 10, 'w'); A.set(38, 12, 'w');
      for (let i = 0; i < 8; i++) A.tri(28 - i * 2.2 + 2, 6 + i * 2.6, 28 - i * 2.2 - .6, 4 + i * 2.6, 28 - i * 2.2 - 1, 7.5 + i * 2.6, 'f');
      [[4, 18], [9, 16], [14, 18]].forEach(([x, y]) => A.tri(x, y, x + 2, y - 4, x + 3, y, 'f'));
      A.ell(33, 8, 1.4, 1.4, 'y'); A.set(33, 8, 'k');
      A.rect(0, 27, 42, 7, 'a'); for (let x = 0; x < 42; x++) { if (x % 6 < 3) A.set(x, 27, 'A'); if ((x + 3) % 8 < 2) A.set(x, 30, 'A'); }
    }, {}),
    old: make(48, 44, { g: ['#3f8f6a', '#72d4a4', '#1d4a38'], v: ['#284f38', '#3f7a52', '#132a1e'], r: '#ff3b3b', R: '#ffc0a0', y: ['#e3a93a', '#ffd56a', '#8a5a14'] }, A => {
      A.tri(16, 16, 2, 4, 1, 26, 'v'); A.tri(16, 16, 1, 26, 12, 30, 'v'); A.tri(32, 16, 46, 4, 47, 26, 'v'); A.tri(32, 16, 47, 26, 36, 30, 'v');
      A.ell(24, 30, 10, 11, 'g');
      A.tent(15, 30, 10, PI * .75, .12, 2.4, 'g'); A.tent(33, 30, 10, PI * .25, -.12, 2.4, 'g');
      A.ell(24, 14, 10, 9, 'g');
      for (let i = 0; i < 5; i++) A.tent(18 + i * 3, 19, 13, PI / 2 + (i - 2) * .12, (i % 2 ? .14 : -.14), 1.8, 'g');
      A.ell(19.5, 12, 2, 1.3, 'r'); A.ell(28.5, 12, 2, 1.3, 'r'); A.set(19, 11, 'R'); A.set(28, 11, 'R');
      A.tri(16, 7, 18, 0, 20, 6, 'y'); A.tri(21, 5, 24, -1, 27, 5, 'y'); A.tri(28, 6, 30, 0, 32, 7, 'y'); A.rect(16, 5, 16, 2, 'y');
    })
  };
  PX.bossMeta = {
    spawn: { name: 'Spawnling', size: '2h', hours: 2, gold: 60 },
    shog: { name: 'Shoggoth', size: '5h', hours: 5, gold: 150 },
    levi: { name: 'Drowned Leviathan', size: '10h', hours: 10, gold: 300 },
    old: { name: 'The Great Old One', size: '20h+', hours: 20, gold: 600 }
  };

  // ——— Wardrobe overlays (32×32, aligned to Ulhu) ———
  const W = (pal, f) => make(32, 32, pal, f);
  PX.wear = {
    tricorn: W({ b: ['#5a3a24', '#8a5a34', '#3a2414'], y: '#e3a93a' }, A => { A.ell(16, 4.5, 10, 2, 'b'); A.ell(16, 3, 5.5, 2.8, 'b'); A.rect(8, 5, 16, 1, 'y'); A.set(16, 1, 'y'); }),
    wizard: W({ p: ['#5a3a9a', '#8a6ad0', '#2e1a5a'], y: '#ffd56a' }, A => { A.tri(16, -1, 10.5, 5.5, 21.5, 5.5, 'p'); A.ell(16, 5.5, 8.5, 1.3, 'p'); A.set(15, 2, 'y'); A.set(17, 4, 'y'); A.set(13, 4, 'y'); }),
    crown: W({ y: ['#e3a93a', '#ffd56a', '#a8681c'], r: '#e8414a', b: '#5aa7ff' }, A => { A.rect(11, 3, 10, 3, 'y'); A.rect(11, 1, 1, 2, 'y'); A.rect(14, 0, 1, 3, 'y'); A.rect(17, 0, 1, 3, 'y'); A.rect(20, 1, 1, 2, 'y'); A.set(13, 4, 'r'); A.set(16, 4, 'b'); A.set(19, 4, 'r'); }),
    fez: W({ r: ['#b8303a', '#e8645a', '#7a1a22'], y: '#e3a93a' }, A => { A.rect(12, 1, 8, 5, 'r'); A.rect(15, 0, 2, 1, 'r'); A.rect(19, 1, 1, 5, 'y'); }),
    captain: W({ w: ['#e8e1cf', '#ffffff', '#a8a090'], n: '#1d2a4a', y: '#e3a93a' }, A => { A.ell(16, 3, 7, 2.6, 'w'); A.rect(9, 5, 14, 1, 'n'); A.rect(15, 3, 2, 1, 'y'); }),
    monocle: W({ y: '#e3a93a' }, A => { A.ring(20, 12.5, 3, 'y'); A.line(23, 14, 24, 20, 'y'); }, ),
    glasses: W({ k: '#2a1a12' }, A => { A.ring(12.5, 12.5, 2.8, 'k'); A.ring(19.5, 12.5, 2.8, 'k'); A.line(15, 12, 17, 12, 'k'); }),
    patch: W({ k: ['#1a1014', '#3a2a30', '#0a0408'], s: '#2a1a12' }, A => { A.line(8, 9, 24, 8, 's'); A.ell(12.5, 12.5, 2.6, 2.4, 'k'); }),
    lantern: W({ y: ['#e3a93a', '#ffd56a', '#a8681c'], l: '#fff3a0' }, A => { A.rect(24, 19, 5, 7, 'y'); A.rect(25, 20, 3, 5, 'l'); A.ring(26.5, 17.5, 1.5, 'y'); }),
    trident: W({ y: ['#e3a93a', '#ffd56a', '#a8681c'] }, A => { A.rect(26, 11, 1, 18, 'y'); A.rect(24, 11, 5, 1, 'y'); A.rect(24, 8, 1, 3, 'y'); A.rect(28, 8, 1, 3, 'y'); A.rect(26, 7, 1, 4, 'y'); }),
    quill: W({ w: ['#e8e1cf', '#ffffff', '#a8a090'], k: '#2a1a12' }, A => { A.tri(29, 12, 25, 22, 27, 23, 'w'); A.line(25, 22, 24, 26, 'k'); }),
    scarf: W({ r: ['#b8303a', '#e8645a', '#7a1a22'] }, A => { A.rect(10, 17, 12, 2, 'r'); A.rect(18, 19, 2, 4, 'r'); }),
    collar: W({ b: ['#2a5aa0', '#5a8ad0', '#1a3a70'], w: '#f4ead8' }, A => { A.tri(9, 17, 23, 17, 16, 22, 'b'); A.line(11, 18, 16, 21, 'w'); A.line(21, 18, 16, 21, 'w'); })
  };

  // ——— Shop sprites (procedural ones) ———
  PX.porthole = make(22, 22, { b: ['#c48a3a', '#ffd56a', '#7a4e1c'], g: ['#3a8ac0', '#8ad0ff', '#1d4a7a'], r: '#4a2c0c' }, A => { A.ell(11, 11, 10, 10, 'b'); A.ell(11, 11, 6.6, 6.6, 'g'); [[11, 2], [11, 20], [2, 11], [20, 11]].forEach(([x, y]) => A.set(x, y, 'r')); A.set(8, 7, 'b'); A.set(9, 7, 'b'); });
  PX.chair = make(20, 22, { r: ['#8a3a4a', '#c45a6a', '#5a1a2a'], w: ['#6a4024', '#9a6a3a', '#3a2010'] }, A => { A.rect(3, 2, 14, 11, 'r'); A.rect(1, 9, 4, 9, 'r'); A.rect(15, 9, 4, 9, 'r'); A.rect(4, 12, 12, 5, 'r'); A.rect(2, 18, 2, 3, 'w'); A.rect(16, 18, 2, 3, 'w'); });
  PX.painting = make(20, 16, { f: ['#c48a3a', '#ffd56a', '#7a4e1c'], s: '#2a6a8a', S: '#5aa0c0', k: '#5ef2a0', d: '#173a50' }, A => { A.rect(0, 0, 20, 16, 'f'); A.rect(2, 2, 16, 12, 's'); A.rect(2, 2, 16, 5, 'S'); A.rect(2, 10, 16, 4, 'd'); A.ell(10, 10, 3, 2, 'k'); A.set(8, 7, 'k'); A.set(12, 7, 'k'); });
  PX.floorTile = make(24, 14, { a: '#8a5a34', b: '#a8703f', l: '#5a3a20' }, A => { for (let y = 0; y < 14; y++) for (let x = 0; x < 24; x++) { if (Math.abs(x - 11.5) / 12 + Math.abs(y - 6.5) / 7 <= 1) A.set(x, y, ((Math.floor((x / 2 + y) / 3)) % 2) ? 'a' : 'b'); } }, { shade: false });
  PX.wallTile = make(20, 20, { a: '#2f6a66', b: '#3f807a', l: '#1d4a46' }, A => { for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) A.set(x, y, (y % 5 === 4 || (x + (Math.floor(y / 5) % 2) * 5) % 10 === 0) ? 'l' : ((x + y) % 7 ? 'a' : 'b')); }, { shade: false });

  // ——— Isometric den renderer ———
  const imgCache = {};
  function img(src, cb) { if (imgCache[src] && imgCache[src].complete) return imgCache[src]; if (!imgCache[src]) { const i = new Image(); i.onload = cb; i.src = src; imgCache[src] = i; } else imgCache[src].addEventListener('load', cb); return null; }
  PX.drawRoom = function (canvas, cfg, redraw) {
    const W = 160, H = 112; canvas.width = W; canvas.height = H;
    const x = canvas.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, W, H);
    const layer = (fn, hue) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const l = c.getContext('2d'); fn(l); x.filter = hue ? `hue-rotate(${hue}deg)` : 'none'; x.drawImage(c, 0, 0); x.filter = 'none'; };
    const p = (l, px, py, col) => { l.fillStyle = col; l.fillRect(px, py, 1, 1); };
    // walls
    layer(l => {
      for (let px = 16; px < 144; px++) {
        const left = px < 80; const base = left ? 78 - (px - 16) / 2 : 46 + (px - 80) / 2; const top = base - 44;
        for (let py = Math.ceil(top); py < base; py++) {
          const v = py - top; const row = Math.floor(v / 6); const brick = (Math.floor((left ? px : px + 3) / 10) + row) % 2;
          let col = left ? (brick ? '#2f6a66' : '#2a625e') : (brick ? '#25504c' : '#214a46');
          if (v % 6 === 5 || (Math.floor(px) % 10 === (row % 2 ? 5 : 0))) col = left ? '#1d4a46' : '#163a37';
          if (base - py < 4) col = left ? '#6a4628' : '#55381f';
          if (base - py === 4) col = '#b8843a';
          p(l, px, py, col);
        }
      }
      for (let py = 2; py < 46; py++) p(l, 80, py, '#12302d');
    }, cfg.wallHue);
    // floor
    layer(l => {
      for (let py = 46; py <= 110; py++) for (let px = 16; px < 144; px++) {
        if (Math.abs(px - 80) / 64 + Math.abs(py - 78) / 32 > 1) continue;
        const u = Math.floor((px / 2 + py) / 4); const plank = u % 2;
        let col = plank ? '#8a5a34' : '#9a6a3c';
        if (Math.floor((px / 2 + py)) % 4 === 0) col = '#5a3a20';
        if ((px * 7 + u * 13) % 41 === 0) col = '#6a4426';
        p(l, px, py, col);
      }
    }, cfg.floorHue);
    const draw = (src, dx, dy, dw, dh, hue, skew) => {
      if (!src) return; const im = img(src, redraw); if (!im) return;
      x.save(); x.filter = hue ? `hue-rotate(${hue}deg)` : 'none';
      if (skew) { x.translate(dx, dy); x.transform(1, skew, 0, 1, 0, 0); x.drawImage(im, 0, 0, dw, dh); } else x.drawImage(im, dx, dy, dw, dh);
      x.restore();
    };
    const it = cfg.items || {};
    if (it.win) draw(it.win.src, 108, 26, 18, 18, it.win.hue, .5);
    if (it.hang) draw(it.hang.src, 36, 34, 18, 14, it.hang.hue, -.5);
    // warm light pool
    if (it.light) { const g = x.createRadialGradient(114, 80, 2, 114, 80, 40); g.addColorStop(0, 'rgba(255,214,120,.28)'); g.addColorStop(1, 'rgba(255,214,120,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    const floorItems = [
      ['rug', 56, 80, 48, 21], ['table', 52, 46, 30, 24], ['props', 92, 38, 22, 30], ['corner', 116, 52, 22, 28],
      ['aux', 20, 58, 30, 24], ['seat', 48, 74, 18, 20], ['light', 106, 62, 19, 28]
    ].filter(f => it[f[0]]).sort((a, b) => (a[0] === 'rug' ? -1 : b[0] === 'rug' ? 1 : (a[2] + a[4]) - (b[2] + b[4])));
    floorItems.forEach(([k, dx, dy, dw, dh]) => draw(it[k].src, dx, dy, dw, dh, it[k].hue));
    if (cfg.night) { x.fillStyle = 'rgba(8,14,40,.45)'; x.fillRect(0, 0, W, H); if (it.light) { const g = x.createRadialGradient(114, 70, 1, 114, 70, 30); g.addColorStop(0, 'rgba(255,220,140,.35)'); g.addColorStop(1, 'rgba(255,220,140,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); } }
  };

  // ===== v2 art: better doubloon, more bosses, more clothes, blessing icons =====
  const TAU=Math.PI*2;
  PX.coin = make(22, 22, { r: ['#c27c22', '#ffd970', '#7a4410'], D: '#8a5216', g: '#eaae3e', l: '#ffe48c', d: '#b8741e', k: '#2a1406', e: '#5ef2a0', E: '#eafff4', t: '#9a5a14', w: '#fffbe0' }, A => {
    A.ell(11, 11, 10.6, 10.6, 'r'); A.ell(11, 11, 8.1, 8.1, 'g');
    for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; A.set(11 + Math.cos(a) * 9.4, 11 + Math.sin(a) * 9.4, 'D'); }
    for (let a = 3.3; a < 4.9; a += .08) { A.set(11 + Math.cos(a) * 7.2, 11 + Math.sin(a) * 7.2, 'l'); A.set(11 + Math.cos(a) * 6.4, 11 + Math.sin(a) * 6.4, 'l'); }
    for (let a = .2; a < 1.7; a += .08) A.set(11 + Math.cos(a) * 7.3, 11 + Math.sin(a) * 7.3, 'd');
    A.rect(6, 7, 4, 3, 'k'); A.rect(12, 7, 4, 3, 'k'); A.rect(7, 8, 2, 1, 'e'); A.rect(13, 8, 2, 1, 'e'); A.set(7, 8, 'E'); A.set(13, 8, 'E');
    A.line(6, 6, 9, 6, 't'); A.line(12, 6, 15, 6, 't');
    [6, 8.5, 11, 13.5, 16].forEach((x, i) => { A.line(x, 12, x, 15, 't'); A.set(x + (i % 2 ? 1 : -1), 16, 't'); });
    A.rect(4, 5, 2, 1, 'w'); A.set(4, 6, 'w'); A.set(17, 3, 'w');
  }, { shade: false });

  PX.bosses.mite = make(26, 22, { p: ['#e889b8', '#ffc0dc', '#a84a7a'], v: ['#9a8ae0', '#cfc4ff', '#5a4aa0'], y: '#ffe36a', k: '#1a0a14' }, A => {
    A.tri(9, 9, 1, 2, 3, 13, 'v'); A.tri(17, 9, 25, 2, 23, 13, 'v');
    A.ell(13, 12, 7, 5.5, 'p'); A.ell(13, 7, 4, 3.4, 'p');
    for (let i = 0; i < 3; i++) { A.line(8 + i * 2, 16, 6 + i * 2, 20, 'p'); A.line(18 - i * 2, 16, 20 - i * 2, 20, 'p'); }
    A.line(11, 4, 9, 0, 'p'); A.line(15, 4, 17, 0, 'p'); A.set(9, 0, 'y'); A.set(17, 0, 'y');
    A.ell(11.5, 7, 1.2, 1.2, 'y'); A.ell(14.5, 7, 1.2, 1.2, 'y'); A.set(11, 7, 'k'); A.set(14, 7, 'k');
  });
  PX.bosses.deep = make(30, 30, { s: ['#3f8aa0', '#7ad0e0', '#1d4a5a'], b: ['#d8e8c0', '#f4ffe0', '#a0b088'], f: ['#e8645a', '#ff9a85', '#a8323a'], y: '#ffd03a', k: '#0a1010', w: '#f4ead8' }, A => {
    A.ell(15, 19, 8, 9, 's'); A.ell(15, 21, 4.5, 6, 'b');
    A.ell(15, 9, 8, 7, 's');
    A.tri(8, 6, 4, 1, 9, 10, 'f'); A.tri(22, 6, 26, 1, 21, 10, 'f'); A.tri(13, 3, 15, -1, 17, 3, 'f');
    A.ell(11, 8, 2.6, 2.6, 'y'); A.ell(19, 8, 2.6, 2.6, 'y'); A.rect(11, 7, 1, 3, 'k'); A.rect(19, 7, 1, 3, 'k');
    A.rect(10, 12, 10, 2, 'k'); for (let x = 10; x < 20; x += 2) A.set(x, 12, 'w');
    A.tent(7, 18, 8, Math.PI * .7, .05, 1.6, 's'); A.tent(23, 18, 8, Math.PI * .3, -.05, 1.6, 's');
    A.rect(10, 27, 4, 2, 's'); A.rect(16, 27, 4, 2, 's');
  });
  PX.bosses.gaunt = make(40, 34, { n: ['#2a2040', '#4a3a6a', '#140e22'], h: ['#5a4a7a', '#8a7aaa', '#2a2040'], r: '#ff3b6a' }, A => {
    A.tri(16, 12, 0, 2, 4, 22, 'n'); A.tri(16, 12, 4, 22, 12, 20, 'n'); A.tri(24, 12, 40, 2, 36, 22, 'n'); A.tri(24, 12, 36, 22, 28, 20, 'n');
    A.ell(20, 17, 6, 9, 'n'); A.ell(20, 7, 4.5, 5, 'n');
    A.tent(17, 3, 6, -2.3, .2, 1.3, 'h'); A.tent(23, 3, 6, -.8, -.2, 1.3, 'h');
    A.tent(20, 25, 14, Math.PI * .35, -.12, 1.4, 'n'); A.tri(33, 30, 37, 28, 35, 33, 'h');
    A.line(15, 24, 13, 32, 'n'); A.line(25, 24, 27, 32, 'n');
    A.set(18, 7, 'r'); A.set(22, 7, 'r');
  });
  PX.bosses.yog = make(46, 42, { a: ['#7a5ae0', '#c0aaff', '#3a2a8a'], b: ['#3ab0c0', '#9af0ff', '#1a5a6a'], c: ['#e0b040', '#fff0a0', '#8a6014'], d: ['#d05a9a', '#ffaad8', '#7a2a5a'], k: '#0a0614', w: '#ffffff' }, A => {
    const orbs = [[23, 21, 9, 'a'], [12, 14, 6, 'b'], [34, 13, 6.5, 'c'], [11, 29, 6, 'd'], [35, 30, 6.5, 'b'], [23, 7, 5, 'd'], [23, 35, 5.5, 'c'], [5, 21, 4, 'c'], [41, 21, 4, 'a']];
    orbs.forEach(([x, y, r, c]) => A.ell(x, y, r, r, c));
    orbs.forEach(([x, y, r]) => { A.ell(x, y, r * .38, r * .38, 'k'); A.set(x - r * .5, y - r * .5, 'w'); A.set(x - r * .5 + 1, y - r * .5, 'w'); });
  });
  Object.assign(PX.bossMeta, {
    mite: { name: 'Mi-Go Mite', size: '2h', hours: 2, gold: 60 },
    deep: { name: 'Deep One', size: '5h', hours: 5, gold: 150 },
    gaunt: { name: 'Nightgaunt', size: '10h', hours: 10, gold: 300 },
    yog: { name: 'The Gate of Orbs', size: '20h+', hours: 20, gold: 600 }
  });
  PX.bossBySize = { 2: ['spawn', 'mite'], 5: ['shog', 'deep'], 10: ['levi', 'gaunt'], 20: ['old', 'yog'] };

  // wardrobe v2 (32×32 layers aligned to Ulhu: head top y≈3, eyes y10–14, body y16–28)
  const Y = ['#e3a93a', '#ffd970', '#9a6414'];
  const ring = (A, cx, cy, rx, ry, c, t) => { for (let i = 0; i < 90; i++) { const a = i / 90 * TAU; for (let j = 0; j < (t || 1); j++) A.set(cx + Math.cos(a) * (rx - j), cy + Math.sin(a) * (ry - j * .5), c); } };
  PX.wear = {
    // hats
    tricorn: W({ b: ['#4a2e1c', '#7a5034', '#2a180c'], y: Y, w: '#f4ead8', k: '#1a0a04', f: ['#c4323a', '#ff7a66', '#7a1a22'] }, A => { A.ell(16, 3.2, 6.5, 3.4, 'b'); A.ell(16, 5.4, 11, 1.8, 'b'); A.tri(4, 6, 8, -.5, 11, 5, 'b'); A.tri(28, 6, 24, -.5, 21, 5, 'b'); A.line(5, 5, 27, 5, 'y'); A.rect(15, 1, 3, 2, 'w'); A.set(15, 2, 'k'); A.set(17, 2, 'k'); A.tent(21, 2, 9, -1.2, .16, 1.3, 'f'); }),
    wizard: W({ p: ['#4a2e9a', '#8a6ad0', '#24145a'], y: Y, w: '#fffbe0' }, A => { A.tri(15, 0, 9.5, 6.5, 22.5, 6.5, 'p'); A.rect(15, 0, 4, 1, 'p'); A.set(19, 1, 'p'); A.set(20, 2, 'p'); A.ell(16, 6.6, 10, 1.4, 'p'); A.rect(10, 5, 13, 1, 'y'); A.set(13, 3, 'y'); A.set(17, 2, 'w'); A.set(18, 4, 'y'); A.set(20, 3, 'w'); }),
    crown: W({ y: Y, r: '#e8414a', b: '#5aa7ff', w: '#fffbe0' }, A => { A.rect(10, 3, 12, 3, 'y'); A.tri(9.5, 3.5, 10.5, -.5, 13, 3.5, 'y'); A.tri(13.5, 3.5, 16, -1, 18.5, 3.5, 'y'); A.tri(19, 3.5, 21.5, -.5, 22.5, 3.5, 'y'); A.set(12, 4, 'r'); A.set(16, 4, 'b'); A.set(20, 4, 'r'); A.set(10, 0, 'w'); A.set(16, 0, 'w'); A.set(22, 0, 'w'); }),
    tophat: W({ k: ['#1a1622', '#3a3448', '#0a0810'], r: '#a3202a', y: Y }, A => { A.rect(11, 0, 10, 5, 'k'); A.ell(16, 5.6, 9, 1.4, 'k'); A.rect(11, 3, 10, 1, 'r'); A.set(19, 3, 'y'); }),
    mortar: W({ k: ['#1a1a2a', '#3a3a5a', '#0a0a14'], y: Y }, A => { A.tri(5, 3, 16, .2, 27, 3, 'k'); A.tri(5, 3, 16, 5.8, 27, 3, 'k'); A.rect(11, 4, 10, 2.5, 'k'); A.line(16, 3, 24, 4, 'y'); A.rect(24, 4, 1, 4, 'y'); A.rect(23, 8, 3, 1, 'y'); A.set(16, 3, 'y'); }),
    captain: W({ w: ['#e8e1cf', '#ffffff', '#a8a090'], n: ['#1d2a4a', '#3a4a7a', '#0d1428'], y: Y }, A => { A.ell(16, 3, 7.5, 3, 'w'); A.rect(9, 4, 14, 1.5, 'n'); A.ell(16, 6.2, 6.5, 1.1, 'n'); A.set(16, 2, 'y'); A.set(15, 3, 'y'); A.set(17, 3, 'y'); A.set(16, 3, 'y'); }),
    fez: W({ r: ['#b8303a', '#e8645a', '#7a1a22'], y: Y }, A => { A.rect(12, 1, 8, 5, 'r'); A.tri(11, 6, 12, 1, 12, 6, 'r'); A.tri(21, 6, 20, 1, 20, 6, 'r'); A.line(16, 1, 21, 2, 'y'); A.rect(21, 2, 1, 4, 'y'); A.set(20, 6, 'y'); A.set(22, 6, 'y'); }),
    witch: W({ g: ['#1d4a32', '#3a7a52', '#0d2418'], p: '#9b7bff', y: Y }, A => { A.tri(21, -1, 10, 6, 22, 6, 'g'); A.ell(16, 6.6, 11.5, 1.5, 'g'); A.rect(11, 5, 11, 1, 'p'); A.rect(15, 5, 2, 1, 'y'); }),
    beanie: W({ c: ['#c4502a', '#f08a5a', '#7a2a14'], C: '#f4ead8' }, A => { A.ell(16, 5, 8, 4, 'c'); A.rect(8, 6, 16, 2, 'C'); for (let x = 9; x < 24; x += 2) A.set(x, 7, 'c'); A.ell(16, 1, 2, 1.6, 'C'); A.line(9, 3, 23, 3, 'C'); }),
    flowers: W({ v: '#2f8a4a', p: '#ff9ac8', y: '#ffe36a', b: '#8ac8ff', w: '#fffbe0' }, A => { A.line(8, 5, 24, 5, 'v'); A.set(9, 4, 'v'); A.set(23, 4, 'v'); [[10, 'p'], [14, 'y'], [18, 'b'], [22, 'p']].forEach(([x, c]) => { A.set(x, 3, c); A.set(x - 1, 4, c); A.set(x + 1, 4, c); A.set(x, 5, c); A.set(x, 4, 'w'); }); }),
    horned: W({ s: ['#8a96a0', '#d0dae0', '#4a5660'], y: Y, h: ['#e8dcc0', '#fffbe8', '#a89a7a'] }, A => { A.ell(16, 5.5, 8, 4, 's'); A.rect(8, 6, 16, 1.5, 'y'); A.rect(15, 2, 2, 5, 'y'); A.tent(9, 5, 7, -2.5, .28, 1.6, 'h'); A.tent(23, 5, 7, -.64, -.28, 1.6, 'h'); }),
    party: W({ a: ['#5aa7ff', '#a8d8ff', '#2a5a9a'], b: '#ffe36a', w: '#fffbe0' }, A => { A.tri(16, -1, 11.5, 6, 20.5, 6, 'a'); A.line(13, 4, 18, 1, 'b'); A.line(12, 6, 20, 2, 'b'); A.ell(16, 0, 1.6, 1.4, 'w'); }),
    sailor: W({ w: ['#e8e1cf', '#ffffff', '#a8a090'], n: '#2a5aa0' }, A => { A.ell(16, 4.2, 6.5, 2.4, 'w'); A.rect(9.5, 5, 13, 1.6, 'n'); A.line(22, 6, 25, 9, 'n'); A.line(22, 7, 24, 10, 'n'); }),
    halo: W({ y: ['#ffe36a', '#fffbe0', '#e3a93a'] }, A => { ring(A, 16, 1.4, 6.5, 1.6, 'y', 1); }, ),
    propeller: W({ r: ['#e8414a', '#ff8a8a', '#8a1a22'], b: ['#5aa7ff', '#a8d8ff', '#2a5a9a'], y: Y, g: '#5ee08a' }, A => { A.ell(16, 5, 7.5, 3.4, 'r'); A.tri(16, 1.6, 8.5, 6, 16, 6, 'b'); A.rect(8, 6, 16, 1, 'y'); A.rect(15, 0, 2, 2, 'g'); A.line(10, 0, 22, 0, 'y'); }),
    kelpcrown: W({ v: ['#2f8a4a', '#6fd08a', '#14402a'], e: '#5ef2a0' }, A => { A.rect(9, 4, 14, 2, 'v'); [10, 13, 16, 19, 22].forEach((x, i) => A.tent(x, 4, 4 + i % 2 * 2, -Math.PI / 2, (i % 2 ? .3 : -.3), 1, 'v')); A.set(16, 5, 'e'); }),
    // tops
    scarf: W({ r: ['#b8303a', '#e8645a', '#7a1a22'], w: '#f4ead8' }, A => { A.rect(9, 16, 14, 3, 'r'); for (let x = 10; x < 23; x += 3) A.rect(x, 16, 1, 3, 'w'); A.rect(18, 18, 3, 7, 'r'); A.rect(18, 21, 3, 1, 'w'); A.set(18, 25, 'r'); A.set(20, 25, 'r'); }),
    collar: W({ b: ['#2a5aa0', '#5a8ad0', '#1a3a70'], w: '#f4ead8', r: '#e8414a' }, A => { A.tri(8, 16, 24, 16, 16, 22, 'b'); A.line(10, 17, 16, 21, 'w'); A.line(22, 17, 16, 21, 'w'); A.tri(15, 20, 17, 20, 16, 24, 'r'); }),
    cape: W({ c: ['#5a1a4a', '#9a3a7a', '#2a0a22'], y: Y }, A => { A.tri(9, 16, 4, 29, 11, 28, 'c'); A.tri(23, 16, 28, 29, 21, 28, 'c'); A.rect(9, 15.5, 14, 2, 'c'); A.ell(16, 17, 1.6, 1.4, 'y'); }),
    labcoat: W({ w: ['#eef2f0', '#ffffff', '#a8b2ae'], b: '#2a5aa0', r: '#e8414a' }, A => { A.rect(8, 18, 6, 10, 'w'); A.rect(18, 18, 6, 10, 'w'); A.tri(12, 16, 15, 16, 14, 22, 'w'); A.tri(20, 16, 17, 16, 18, 22, 'w'); A.rect(20, 21, 3, 1, 'b'); A.rect(21, 19, 1, 2, 'r'); }),
    bowtie: W({ r: ['#c4323a', '#ff7a66', '#7a1a22'] }, A => { A.tri(11, 16, 16, 18, 11, 20, 'r'); A.tri(21, 16, 16, 18, 21, 20, 'r'); A.rect(15, 17, 2, 2, 'r'); }),
    necktie: W({ b: ['#2a5aa0', '#5a8ad0', '#1a3a70'], y: '#ffe36a' }, A => { A.rect(15, 16, 3, 2, 'b'); A.tri(14, 18, 19, 18, 16.5, 26, 'b'); A.line(15, 20, 18, 21, 'y'); A.line(15, 23, 17, 24, 'y'); }),
    jumper: W({ j: ['#8a2a3a', '#c44a5a', '#4a1420'], w: '#f4ead8', g: '#5ee08a' }, A => { A.rect(9, 17, 14, 10, 'j'); A.rect(8, 18, 2, 7, 'j'); A.rect(22, 18, 2, 7, 'j'); for (let x = 10; x < 22; x += 3) { A.set(x, 20, 'w'); A.set(x + 1, 21, 'g'); A.set(x, 22, 'w'); } A.rect(9, 26, 14, 1, 'w'); }),
    lifering: W({ w: '#f4ead8', r: '#e8414a' }, A => { for (let i = 0; i < 120; i++) { const a = i / 120 * TAU; const c = Math.floor(i / 15) % 2 ? 'r' : 'w'; A.set(16 + Math.cos(a) * 10, 23 + Math.sin(a) * 3, c); A.set(16 + Math.cos(a) * 9, 23 + Math.sin(a) * 2.4, c); } }),
    medal: W({ b: ['#2a5aa0', '#5a8ad0', '#1a3a70'], r: '#e8414a', y: Y }, A => { A.tri(13, 16, 16, 16, 15, 21, 'b'); A.tri(19, 16, 16, 16, 17, 21, 'r'); A.ell(16, 22.5, 2.2, 2.2, 'y'); }),
    sash: W({ v: ['#2f8a4a', '#6fd08a', '#14402a'], e: '#5ef2a0' }, A => { for (let i = 0; i < 12; i++) A.ell(9 + i * 1.2, 17 + i * .9, 1.4, 1.4, 'v'); A.set(15, 21, 'e'); }),
    // face
    monocle: W({ y: Y, g: 'rgba(200,240,255,.35)' }, A => { ring(A, 19.5, 12.5, 3, 3, 'y', 1); A.line(22, 15, 24, 21, 'y'); }),
    glasses: W({ k: '#2a1a12' }, A => { ring(A, 12, 12.5, 2.8, 2.8, 'k'); ring(A, 20, 12.5, 2.8, 2.8, 'k'); A.line(15, 12, 17, 12, 'k'); A.line(8, 12, 9, 12, 'k'); A.line(23, 12, 24, 12, 'k'); }),
    patch: W({ k: ['#1a1014', '#3a2a30', '#0a0408'], s: '#2a1a12', w: '#f4ead8' }, A => { A.line(8, 9, 24, 8, 's'); A.ell(12, 12.5, 2.8, 2.6, 'k'); A.set(11, 12, 'w'); A.set(13, 12, 'w'); A.set(12, 13, 'w'); }),
    goggles: W({ k: '#2a1a12', b: ['#5ac8e0', '#c8f4ff', '#2a7a9a'], y: Y }, A => { A.line(7, 11, 25, 11, 'k'); A.ell(12, 12, 3, 2.6, 'y'); A.ell(20, 12, 3, 2.6, 'y'); A.ell(12, 12, 2, 1.7, 'b'); A.ell(20, 12, 2, 1.7, 'b'); }),
    mustache: W({ m: ['#4a2a14', '#7a4a24', '#2a1408'] }, A => { A.ell(13.5, 15.5, 2.6, 1.2, 'm'); A.ell(18.5, 15.5, 2.6, 1.2, 'm'); A.set(10, 14, 'm'); A.set(22, 14, 'm'); A.set(11, 15, 'm'); A.set(21, 15, 'm'); }),
    shades: W({ k: ['#141018', '#3a3448', '#000'], w: '#ffffff' }, A => { A.rect(9, 10, 6, 4, 'k'); A.rect(17, 10, 6, 4, 'k'); A.line(15, 11, 17, 11, 'k'); A.set(10, 11, 'w'); A.set(18, 11, 'w'); }),
    star: W({ p: ['#ff6ab8', '#ffb0dc', '#a82a6a'], w: '#ffffff' }, A => { [12, 20].forEach(x => { A.tri(x, 9, x - 2.6, 14.5, x + 2.6, 14.5, 'p'); A.tri(x - 3, 11, x + 3, 11, x, 15, 'p'); }); A.line(15, 12, 17, 12, 'p'); }),
    threed: W({ w: '#f4ead8', r: '#e8414a', b: '#5aa7ff' }, A => { A.rect(8, 10, 7, 5, 'w'); A.rect(17, 10, 7, 5, 'w'); A.rect(9, 11, 5, 3, 'r'); A.rect(18, 11, 5, 3, 'b'); A.line(15, 11, 17, 11, 'w'); }),
    halfmoon: W({ y: Y, g: '#cfe8ff' }, A => { A.rect(10, 13, 5, 2, 'g'); A.rect(17, 13, 5, 2, 'g'); A.line(10, 15, 14, 15, 'y'); A.line(17, 15, 21, 15, 'y'); A.line(15, 14, 17, 14, 'y'); }),
    // held
    lantern: W({ y: Y, l: '#fff3a0', k: '#3a2a10', o: '#ffb040' }, A => { A.rect(24, 19, 6, 8, 'y'); A.rect(25, 20, 4, 6, 'l'); A.set(26, 22, 'o'); A.set(27, 23, 'o'); A.line(25, 20, 25, 25, 'k'); A.rect(25, 27, 4, 1, 'y'); ring(A, 27, 17.5, 1.6, 1.4, 'y'); }),
    trident: W({ y: Y }, A => { A.rect(26, 10, 1, 19, 'y'); A.rect(23, 11, 7, 1, 'y'); A.rect(23, 7, 1, 4, 'y'); A.rect(29, 7, 1, 4, 'y'); A.rect(26, 6, 1, 4, 'y'); A.set(23, 6, 'y'); A.set(29, 6, 'y'); A.set(26, 5, 'y'); }),
    quill: W({ w: ['#e8e1cf', '#ffffff', '#a8a090'], k: '#2a1a12', b: ['#2a2a4a', '#4a4a7a', '#14142a'] }, A => { A.tri(30, 10, 25, 21, 27.5, 22, 'w'); A.line(25, 22, 24, 25, 'k'); A.rect(22, 25, 5, 4, 'b'); }),
    tome: W({ r: ['#7a1a22', '#c4323a', '#4a0a10'], y: Y, p: '#f4ead8' }, A => { A.rect(22, 17, 8, 10, 'r'); A.rect(29, 18, 1, 8, 'p'); A.rect(24, 20, 4, 4, 'y'); A.set(25, 21, 'r'); A.set(26, 22, 'r'); }),
    mug: W({ w: ['#e8e1cf', '#ffffff', '#a8a090'], t: '#8a5a2a', s: 'rgba(255,255,255,.6)' }, A => { A.rect(23, 21, 6, 6, 'w'); ring(A, 29.5, 23.5, 1.5, 1.6, 'w'); A.rect(24, 21, 4, 1, 't'); A.set(25, 19, 's'); A.set(26, 18, 's'); A.set(27, 19, 's'); }),
    redpen: W({ r: ['#c4323a', '#ff7a66', '#7a1a22'], w: '#f4ead8', k: '#1a0a04' }, A => { for (let i = 0; i < 9; i++) A.ell(24 + i * .55, 26 - i * 1.15, .9, .9, 'r'); A.set(23, 27, 'k'); A.set(28, 16, 'w'); A.line(27, 17, 27, 19, 'w'); }),
    staff: W({ b: ['#6a4024', '#9a6a3a', '#3a2010'], e: ['#5ef2a0', '#d8ffe8', '#1d8a52'] }, A => { A.rect(26, 11, 2, 18, 'b'); A.ell(27, 9, 2.6, 2.6, 'e'); A.set(24, 10, 'b'); A.set(30, 10, 'b'); }),
    rod: W({ b: ['#6a4024', '#9a6a3a', '#3a2010'], l: '#cfe8ff', f: '#ff9a3a' }, A => { A.line(24, 28, 30, 6, 'b'); A.line(30, 6, 31, 18, 'l'); A.rect(30, 18, 2, 2, 'f'); })
  };
  PX.wearSets = {
    hat: ['tricorn', 'wizard', 'crown', 'tophat', 'mortar', 'captain', 'fez', 'witch', 'beanie', 'flowers', 'horned', 'party', 'sailor', 'halo', 'propeller', 'kelpcrown'],
    top: ['scarf', 'collar', 'cape', 'labcoat', 'bowtie', 'necktie', 'jumper', 'lifering', 'medal', 'sash'],
    face: ['monocle', 'glasses', 'patch', 'goggles', 'mustache', 'shades', 'star', 'threed', 'halfmoon'],
    held: ['lantern', 'trident', 'quill', 'tome', 'mug', 'redpen', 'staff', 'rod']
  };

  // blessing icons (12×12)
  const B12 = (pal, f) => make(12, 12, pal, f);
  PX.bless = {
    water: B12({ b: ['#3a9ae0', '#a8e0ff', '#1a5a9a'], w: '#ffffff' }, A => { A.tri(6, 0, 2, 7, 10, 7, 'b'); A.ell(6, 7.5, 4, 3.5, 'b'); A.set(4, 6, 'w'); A.set(4, 7, 'w'); }),
    walk: B12({ b: ['#8a5a2a', '#c48a4a', '#4a2a10'], w: '#f4ead8' }, A => { A.rect(3, 1, 4, 7, 'b'); A.rect(3, 7, 8, 3, 'b'); A.rect(3, 10, 8, 1, 'w'); }),
    stretch: B12({ g: ['#5ee08a', '#c8ffd8', '#1d8a52'] }, A => { A.ell(6, 2, 1.6, 1.6, 'g'); A.line(6, 4, 6, 7, 'g'); A.line(6, 4, 1, 1, 'g'); A.line(6, 4, 11, 1, 'g'); A.line(6, 7, 3, 11, 'g'); A.line(6, 7, 9, 11, 'g'); }),
    tidy: B12({ y: ['#e3a93a', '#ffd970', '#9a6414'], b: ['#8a5a2a', '#c48a4a', '#4a2a10'], s: '#fffbe0' }, A => { A.line(9, 0, 5, 6, 'b'); A.tri(2, 6, 8, 6, 4, 11, 'y'); A.set(10, 8, 's'); A.set(11, 9, 's'); A.set(10, 10, 's'); }),
    door: B12({ d: ['#5a3a8a', '#8a6ac0', '#2a1a4a'], y: '#ffe36a', s: '#ffb040' }, A => { A.rect(2, 1, 7, 10, 'd'); A.set(7, 6, 'y'); A.ell(9.5, 3, 2, 2, 's'); }),
    apple: B12({ r: ['#d0303a', '#ff7a7a', '#7a1018'], g: '#5ee08a', b: '#6a4024' }, A => { A.ell(6, 7, 4.5, 4, 'r'); A.rect(6, 1, 1, 3, 'b'); A.ell(8.5, 2, 1.6, 1, 'g'); }),
    tea: B12({ w: ['#e8e1cf', '#ffffff', '#a8a090'], t: '#8a5a2a', s: '#cfe8ff' }, A => { A.rect(2, 5, 7, 5, 'w'); A.rect(9, 6, 2, 2, 'w'); A.rect(3, 5, 5, 1, 't'); A.set(4, 2, 's'); A.set(5, 1, 's'); A.set(6, 2, 's'); }),
    sun: B12({ y: ['#ffd03a', '#fff3a0', '#c48a14'] }, A => { A.ell(6, 6, 3, 3, 'y'); [[6, 0], [6, 11], [0, 6], [11, 6], [1, 1], [10, 1], [1, 10], [10, 10]].forEach(([x, y]) => A.set(x, y, 'y')); }),
    moon: B12({ b: ['#a8c8ff', '#eaf2ff', '#5a7ab0'] }, A => { A.ell(6, 6, 5, 5, 'b'); }),
    heart: B12({ p: ['#ff6a9a', '#ffc0d4', '#a82a5a'] }, A => { A.ell(4, 4, 2.8, 2.8, 'p'); A.ell(8, 4, 2.8, 2.8, 'p'); A.tri(1.2, 5, 10.8, 5, 6, 11, 'p'); })
  };
  PX.bless.moon = make(12, 12, { b: ['#a8c8ff', '#eaf2ff', '#5a7ab0'] }, A => { A.ell(6, 6, 5, 5, 'b'); for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const dx = x + .5 - 8.5, dy = y + .5 - 4.5; if (dx * dx + dy * dy < 16) A.set(x, y, null); } });

  window.PX = PX;
})();
