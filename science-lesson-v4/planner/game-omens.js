/* Omen cards (Patryk 2026-10-26): every curse and blessing is a little pixel tarot card.
   Curses sit on the "Bleeding frame" card, blessings on the "Constellations" card. Each habit keeps its picture
   in its grp column (e.g. 'junk'); an old habit with no picture yet gets one guessed from its name.
   OMENS.card(kind, key) gives an image URL; OMENS.of(goal) gives the picture key; OMENS.CATS lists them. */
const OMENS = (() => {
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; const x = c.getContext('2d'); const g = { c, x };
    g.p = (i, j, col) => { x.fillStyle = col; x.fillRect(Math.round(i), Math.round(j), 1, 1); };
    g.r = (i, j, w2, h2, col) => { x.fillStyle = col; x.fillRect(i, j, w2, h2); };
    g.el = (cx, cy, rx, ry, col) => { for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) if ((i * i) / (rx * rx + 0.01) + (j * j) / (ry * ry + 0.01) <= 1.08) g.p(cx + i, cy + j, col); };
    g.d = (cx, cy, r, col) => g.el(cx, cy, r, r, col);
    g.ln = (x0, y0, x1, y1, col) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let k = 0; k <= n; k++) g.p(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, col); };
    g.ring = (cx, cy, r, col) => { for (let j = -r - 1; j <= r + 1; j++) for (let i = -r - 1; i <= r + 1; i++) if (Math.abs(Math.hypot(i, j) - r) < 0.55) g.p(cx + i, cy + j, col); };
    g.cut = (cx, cy, r) => { x.globalCompositeOperation = 'destination-out'; g.d(cx, cy, r, '#000'); x.globalCompositeOperation = 'source-over'; };
    g.clip = (i, j, w2, h2, f) => { x.save(); x.beginPath(); x.rect(i, j, w2, h2); x.clip(); f(); x.restore(); };
    return g; }
  function outline(g, col) { const n = 24, d = g.x.getImageData(0, 0, n, n).data, a = (i, j) => i >= 0 && j >= 0 && i < n && j < n && d[(j * n + i) * 4 + 3] > 0, pts = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (!a(i, j) && (a(i - 1, j) || a(i + 1, j) || a(i, j - 1) || a(i, j + 1))) pts.push([i, j]); pts.forEach(([i, j]) => g.p(i, j, col)); }
  const heart = (g, cx, cy, col) => { g.d(cx - 2, cy, 2, col); g.d(cx + 2, cy, 2, col); for (let k = 0; k < 5; k++) g.r(cx - 4 + k, cy + 1 + k, 9 - 2 * k, 1, col); };
  const spark = (g, i, j) => { g.p(i, j, '#ffe066'); g.p(i - 1, j, '#fff4b0'); g.p(i + 1, j, '#fff4b0'); g.p(i, j - 1, '#fff4b0'); g.p(i, j + 1, '#fff4b0'); };
  const hourglass = (g) => { g.r(5, 2, 14, 2, '#6a4426'); g.r(5, 20, 14, 2, '#6a4426'); g.r(5, 4, 1, 16, '#4a2e1a'); g.r(18, 4, 1, 16, '#4a2e1a');
    for (let j = 0; j < 8; j++) { const h = Math.max(1, 5 - Math.floor(j * 0.65)); g.r(12 - h, 4 + j, 2 * h, 1, '#a8c0c4'); g.r(12 - h, 19 - j, 2 * h, 1, '#a8c0c4'); }
    g.r(10, 8, 4, 2, '#a02a2a'); g.r(11, 10, 2, 1, '#a02a2a'); g.p(12, 13, '#a02a2a'); g.p(12, 15, '#a02a2a'); g.r(9, 17, 6, 2, '#a02a2a'); g.r(10, 16, 4, 1, '#a02a2a');
    g.ln(9, 5, 11, 8, '#ffffff'); g.ln(11, 8, 10, 10, '#ffffff'); };

  // [key, label, name guess, drawing]
  const CURSES = [
    ['junk', 'Junk food', /takeaway|junk|crisps|sweets|chocolate|snack|fast food|pizza|sugar|biscuit/i, (g) => { for (let j = 0; j < 11; j++) { const h = 8 - Math.floor(j * 0.4); g.r(12 - h, 10 + j, 2 * h, 1, j >= 3 && j < 6 ? '#9a2a2a' : '#d8d0c0'); }
      g.ln(4, 10, 7, 7, '#c8c0b0'); g.ln(19, 10, 16, 7, '#c8c0b0'); g.r(7, 8, 10, 2, '#a8a060'); g.p(8, 7, '#a8a060'); g.p(12, 7, '#a8a060'); g.p(15, 7, '#a8a060');
      g.ln(14, 1, 16, 9, '#8a6a3a'); g.ln(17, 1, 18, 9, '#8a6a3a'); g.d(9, 18, 1, '#a0904a'); g.p(4, 4, '#111'); g.p(3, 3, '#9ab4c0'); g.p(5, 3, '#9ab4c0'); g.p(20, 5, '#111'); }],
    ['smoke', 'Smoking', /smok|cig|vape|drink|alcohol|beer|wine/i, (g) => { g.r(2, 16, 16, 3, '#e8e4dc'); g.r(2, 16, 5, 3, '#d08a40'); g.r(18, 16, 3, 3, '#6a6a6a'); g.p(20, 17, '#ff5a1a'); g.p(20, 16, '#ffb04a');
      g.d(18, 6, 4, '#8a8a96'); g.r(16, 9, 5, 2, '#8a8a96'); g.p(16, 6, '#1a1a1a'); g.p(20, 6, '#1a1a1a'); g.p(18, 8, '#1a1a1a'); g.p(17, 10, '#5a5a66'); g.p(19, 10, '#5a5a66');
      g.p(19, 13, '#8a8a96'); g.p(18, 12, '#8a8a96'); g.p(19, 14, '#8a8a96'); }],
    ['mood', 'Bad mood', /angry|anger|snap|shout|mood|stress|moan|complain|grump|rude/i, (g) => { g.el(12, 10, 9, 3, '#3a3a48'); g.d(8, 8, 4, '#5a5a6a'); g.d(15, 6, 5, '#5a5a6a'); g.d(14, 5, 2, '#6e6e7e');
      g.ln(8, 6, 10, 7, '#1a1a22'); g.ln(16, 6, 14, 7, '#1a1a22'); g.p(9, 8, '#ff4040'); g.p(15, 8, '#ff4040'); g.r(11, 10, 3, 1, '#1a1a22');
      g.ln(5, 13, 3, 17, '#ffe040'); g.ln(3, 17, 5, 17, '#ffe040'); g.ln(5, 17, 3, 21, '#ffe040'); g.ln(18, 13, 20, 17, '#ffe040'); g.ln(20, 17, 18, 17, '#ffe040'); g.ln(18, 17, 20, 21, '#ffe040'); }],
    ['time', 'Wasting time', /procrast|waste|put off|delay|late|lazy|faff/i, (g) => { hourglass(g); g.r(6, 22, 1, 2, '#6a4426'); g.r(11, 22, 2, 2, '#6a4426'); g.r(17, 22, 1, 1, '#6a4426'); g.p(12, 21, '#a02a2a'); }],
    ['screens', 'Screens', /netflix|tv|binge|phone|scroll|youtube|tiktok|gaming|screen|social media|instagram|reddit/i, (g) => { g.ln(8, 2, 11, 6, '#6a6070'); g.ln(16, 2, 13, 6, '#6a6070'); g.p(8, 2, '#ff3a3a'); g.p(16, 2, '#ff3a3a');
      g.r(3, 6, 18, 14, '#3e3644'); g.r(3, 6, 18, 1, '#5a5062'); g.r(5, 8, 11, 10, '#12221a'); [[6, 9], [14, 16], [7, 16], [13, 9], [15, 12]].forEach(([i, j]) => g.p(i, j, '#2e5a44'));
      g.el(10, 13, 4, 2, '#e8dcc8'); g.d(10, 13, 1, '#c0182a'); g.p(10, 13, '#000'); g.d(18, 10, 1, '#8a7e90'); g.d(18, 15, 1, '#8a7e90'); g.r(5, 20, 2, 2, '#2a242e'); g.r(17, 20, 2, 2, '#2a242e'); }],
    ['snooze', 'Snoozing', /snooze|sleep in|stay(ing)? up|late night|oversl/i, (g) => { g.d(6, 5, 3, '#a08850'); g.d(18, 5, 3, '#a08850'); g.p(5, 4, '#c8b070'); g.p(17, 4, '#c8b070');
      g.d(12, 13, 8, '#8a7040'); g.d(12, 13, 6, '#e6dcc0'); g.ln(12, 13, 12, 8, '#2a2020'); g.ln(12, 13, 16, 15, '#2a2020'); g.ln(7, 9, 9, 12, '#6a1a1a'); g.ln(9, 12, 8, 15, '#6a1a1a'); g.p(12, 13, '#c0182a');
      g.r(6, 20, 2, 2, '#5a4828'); g.r(16, 20, 2, 2, '#5a4828'); }],
    ['mess', 'Mess', /dish|mess|clutter|laundry|untid|floor|pile/i, (g) => { g.ln(19, 3, 16, 12, '#9a9aa6'); g.ln(18, 2, 18, 4, '#9a9aa6'); g.ln(20, 2, 20, 4, '#9a9aa6');
      g.el(12, 15, 10, 5, '#d4d0c4'); g.el(12, 14, 7, 3, '#b8b4a6'); [[9, 13], [10, 14], [14, 15], [15, 14], [7, 15]].forEach(([i, j]) => g.p(i, j, '#7a5a2a')); g.d(13, 13, 1, '#6a8a3a'); g.p(16, 16, '#6a8a3a');
      g.p(6, 7, '#111'); g.p(5, 6, '#9ab4c0'); g.p(7, 6, '#9ab4c0'); g.p(10, 4, '#111'); g.p(9, 3, '#9ab4c0'); g.p(11, 3, '#9ab4c0'); g.p(4, 10, '#7aa04a'); g.p(3, 9, '#7aa04a'); g.p(4, 8, '#7aa04a'); }],
    ['spend', 'Overspending', /spend|buy|shop|amazon|money|impulse/i, (g) => { g.el(12, 15, 8, 6, '#6a3e22'); g.el(11, 14, 5, 3, '#82502e'); g.r(9, 7, 6, 3, '#5a321a'); g.r(8, 9, 8, 1, '#c0a040');
      g.p(9, 6, '#5a321a'); g.p(12, 6, '#5a321a'); g.p(14, 6, '#5a321a'); g.d(15, 17, 1, '#1a0e08'); g.el(18, 21, 2, 1, '#c8a83a'); g.p(18, 21, '#6a5010'); g.el(9, 20, 2, 1, '#8a7030');
      g.p(4, 6, '#c8b898'); g.p(3, 5, '#a89878'); g.p(5, 5, '#a89878'); }],
    ['lie', 'Dishonesty', /lie|lying|agree|ignor|honest|pleas|excuse|fake/i, (g) => { g.el(12, 12, 8, 9, '#e8e0d0'); g.clip(12, 0, 12, 24, () => g.el(12, 12, 8, 9, '#4a3a5a'));
      g.el(8, 10, 2, 1, '#111'); g.el(16, 10, 2, 1, '#111'); g.p(16, 10, '#ff3030'); g.ln(7, 15, 9, 17, '#8a3a3a'); g.ln(9, 17, 11, 17, '#8a3a3a'); g.ln(13, 17, 15, 16, '#c09ad0'); g.ln(15, 16, 17, 17, '#c09ad0');
      g.ln(12, 3, 12, 21, '#1e141e'); g.p(3, 10, '#a08a6a'); g.p(2, 11, '#a08a6a'); g.p(21, 10, '#a08a6a'); }]];

  const BLESSINGS = [
    ['exercise', 'Exercise', /gym|exerc|run|walk|train|workout|swim|yoga|stretch|weights|cycle|bike/i, (g) => { g.r(1, 13, 22, 2, '#a8a8b4'); g.r(3, 8, 3, 12, '#e04a4a'); g.r(18, 8, 3, 12, '#e04a4a'); g.r(6, 10, 2, 8, '#3a6ac0'); g.r(16, 10, 2, 8, '#3a6ac0'); spark(g, 12, 5); spark(g, 8, 3); spark(g, 16, 3); }],
    ['teeth', 'Teeth', /teeth|tooth|floss|brush/i, (g) => { g.el(12, 9, 7, 5, '#f8f8f4'); g.r(5, 10, 5, 9, '#f8f8f4'); g.r(14, 10, 5, 9, '#f8f8f4'); g.d(7, 19, 2, '#f8f8f4'); g.d(16, 19, 2, '#f8f8f4');
      g.x.clearRect(10, 14, 4, 9); g.r(7, 6, 3, 1, '#ffffff'); g.r(14, 13, 1, 6, '#d8e4ee'); spark(g, 21, 4); spark(g, 3, 4); }],
    ['wash', 'Washing', /shower|bath|wash|skin/i, (g) => { g.r(3, 2, 11, 2, '#a8b0bc'); g.r(3, 2, 2, 5, '#a8b0bc'); g.el(15, 6, 5, 3, '#c8d0dc'); g.r(10, 6, 11, 1, '#c8d0dc');
      [11, 13, 15, 17, 19].forEach((i) => g.p(i, 8, '#5a6a7a')); for (let k = 0; k < 5; k++) for (let j = 11; j < 22; j += 3) { g.p(11 + k * 2 - (j - 11) / 6, j, '#7ac8f0'); g.p(11 + k * 2 - (j - 11) / 6, j + 1, '#7ac8f0'); } }],
    ['food', 'Eating well', /eat|healthy|veg|fruit|salad|cook|breakfast|lunch|water|meal/i, (g) => { g.el(12, 13, 7, 9, '#3a6a2a'); g.el(12, 14, 5, 7, '#c8e070'); g.d(12, 16, 3, '#8a5a2a'); g.p(11, 15, '#b07a4a'); g.p(9, 9, '#e0f090'); }],
    ['mind', 'Learning and puzzles', /wordle|puzzle|read|learn|study|book|proud|journal|idea|crossword|language/i, (g) => { g.d(12, 9, 7, '#fff0a0'); g.d(10, 7, 2, '#ffffff'); g.ln(10, 10, 12, 12, '#e0a020'); g.ln(12, 12, 14, 10, '#e0a020');
      g.r(9, 15, 6, 5, '#a8a8b4'); g.r(9, 16, 6, 1, '#7a7a86'); g.r(9, 18, 6, 1, '#7a7a86'); g.r(10, 20, 4, 1, '#5a5a66'); [[2, 9], [22, 9], [4, 2], [20, 2]].forEach(([i, j]) => g.p(i, j, '#ffe066')); }],
    ['family', 'Family calls', /family|grandma|grandad|gran|nan|mum|dad|parent|brother|sister/i, (g) => { // old telephone, outline redrawn 2026-10-26: receiver lifted clear of the body
      g.r(3, 6, 5, 5, '#c03a3a'); g.r(16, 6, 5, 5, '#c03a3a'); g.r(6, 7, 12, 3, '#b02a2a'); g.r(4, 6, 16, 1, '#e06a6a');
      g.r(7, 11, 2, 2, '#7a1a1a'); g.r(15, 11, 2, 2, '#7a1a1a');
      for (let j = 0; j < 8; j++) { const h = 6 + Math.floor(j * 0.45); g.r(12 - h, 12 + j, 2 * h, 1, j === 7 ? '#8a2020' : '#c03a3a'); }
      g.r(7, 13, 10, 1, '#d85a5a'); g.d(12, 16, 3, '#f4ecd8'); [[12, 14], [14, 16], [12, 18], [10, 16]].forEach(([i, j]) => g.p(i, j, '#8a2020')); g.p(12, 16, '#c03a3a');
      g.ln(1, 3, 2, 1, '#ffe066'); g.ln(22, 1, 23, 3, '#ffe066'); }],
    ['friends', 'Old friends', /friend|catch up|mate|pal/i, (g) => { g.el(10, 21, 5, 1, '#2a2a2a'); g.r(9, 8, 3, 13, '#2a2a2a'); g.el(10, 6, 3, 2, '#2a2a2a'); g.r(12, 10, 4, 1, '#c8a040'); g.r(16, 7, 3, 7, '#2a2a2a'); g.r(16, 7, 3, 1, '#c8a040');
      g.ln(17, 15, 13, 20, '#5a5a5a'); g.r(9, 19, 3, 1, '#c8a040'); g.ln(20, 3, 22, 1, '#ffe066'); g.ln(4, 4, 2, 2, '#ffe066'); }],
    ['love', 'Love', /love|partner|date|wife|husband|girlfriend|boyfriend|kind|thank/i, (g) => { for (let k = 0; k <= 10; k++) g.d(5 + k, 6 + k, 1, '#c03a3a'); g.d(5, 6, 3, '#c03a3a'); g.d(15, 16, 3, '#c03a3a'); g.p(4, 5, '#e06a6a');
      g.ring(19, 20, 1, '#8a2a2a'); g.ring(21, 22, 1, '#8a2a2a'); heart(g, 17, 4, '#ff7a9a'); }],
    ['touch', 'Keeping in touch', /message|text|reply|call|touch|email|whatsapp|letter/i, (g) => { g.el(8, 4, 6, 3, '#f4ecd8'); g.el(15, 11, 6, 3, '#bfe0ff'); g.el(9, 18, 6, 3, '#c8f0c8'); g.p(4, 7, '#f4ecd8'); g.p(19, 14, '#bfe0ff'); g.p(5, 21, '#c8f0c8');
      [6, 8, 10].forEach((i) => g.p(i, 4, '#e0304a')); [13, 15, 17].forEach((i) => g.p(i, 11, '#3a6ac0')); [7, 9, 11].forEach((i) => g.p(i, 18, '#3a9a3a')); }],
    ['home', 'Tidy home', /tid(y|ied|ying)|makw* (the )?bed|clean|hoover|laundry|dish|declutter|sort|desk/i, (g) => { for (let j = 0; j < 8; j++) g.r(11 - j, 3 + j, 2 * (j + 1), 1, '#c84a3a'); g.r(16, 4, 2, 4, '#8a4030');
      g.r(5, 11, 14, 10, '#f0dcb0'); g.r(10, 15, 4, 6, '#7a4a2a'); g.r(15, 13, 3, 3, '#ffd860'); g.r(6, 13, 3, 3, '#ffd860'); g.p(13, 18, '#e0b040'); }],
    ['sleep', 'Sleep', /sleep|early|wake|nap|night|bed/i, (g) => { g.d(11, 12, 8, '#f0e6a8'); g.cut(15, 9, 7); g.p(6, 10, '#fff8d0'); g.p(6, 11, '#fff8d0');
      [[18, 15], [20, 6]].forEach(([i, j]) => { g.p(i, j, '#fff'); g.p(i - 1, j, '#bfe0ff'); g.p(i + 1, j, '#bfe0ff'); g.p(i, j - 1, '#bfe0ff'); g.p(i, j + 1, '#bfe0ff'); }); }],
    ['save', 'Saving', /sav|budget|money|no spend/i, (g) => { for (let k = 0; k < 4; k++) { g.el(9, 19 - k * 3, 6, 2, '#c8962a'); g.el(9, 18 - k * 3, 5, 1, '#f4d060'); }
      g.d(18, 12, 4, '#e8b838'); g.d(18, 12, 2, '#f8d868'); g.p(18, 12, '#c8962a'); g.p(20, 4, '#fff'); g.p(19, 4, '#fff0a0'); g.p(21, 4, '#fff0a0'); }],
    ['outside', 'Outside', /outside|garden|nature|sun|fresh air|plant|park/i, (g) => { g.r(7, 15, 10, 6, '#c06a3a'); g.r(6, 14, 12, 2, '#d88050'); g.ln(12, 14, 12, 6, '#3a8a3a');
      g.el(9, 9, 3, 2, '#5ac05a'); g.el(15, 7, 3, 2, '#5ac05a'); g.el(11, 5, 2, 1, '#7ad87a'); g.p(8, 8, '#9af09a'); g.p(14, 6, '#9af09a'); }]];

  // card backs: frame, then the scene, then the name plate
  function frame(S, outer, line, panel) { S.r(0, 0, 32, 44, outer); S.r(1, 1, 30, 42, line); S.r(2, 2, 28, 40, outer); S.r(3, 3, 26, 38, panel);
    [[0, 0], [1, 0], [0, 1], [31, 0], [30, 0], [31, 1], [0, 43], [1, 43], [0, 42], [31, 43], [30, 43], [31, 42]].forEach(([i, j]) => S.x.clearRect(i, j, 1, 1)); }
  function plaque(S, bg, line, mark) { S.r(5, 35, 22, 5, bg); S.r(5, 35, 22, 1, line); [12, 14, 16, 18].forEach((i) => S.r(i, 37, 1, 2, mark)); S.r(20, 37, 2, 2, mark); }
  const BLOOD = '#9a1020', DARKB = '#6a0a16';
  function bleeding(S) { frame(S, '#a8823a', '#5a0a14', '#260a10');
    for (let j = 3; j < 41; j++) for (let i = 3; i < 29; i++) if ((i + j) % 2 === 0 && (i < 6 || i > 25)) S.p(i, j, '#30101a');
    const P = [0, 1, 2, 3, 4].map((k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; return [16 + 11 * Math.cos(a), 21 + 11 * Math.sin(a)]; });
    for (let k = 0; k < 5; k++) { const a = P[k], b = P[(k + 2) % 5]; S.ln(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#521220'); } S.ring(16, 21, 11, '#521220');
    [[0, 5, 9], [2, 12, 14], [29, 8, 12], [31, 18, 10], [0, 26, 7]].forEach(([x, y, l]) => { S.r(x, y, 1, l, BLOOD); S.p(x, y + l, DARKB); });
    [[7, 6], [13, 3], [18, 8], [24, 4]].forEach(([x, l]) => { S.r(x, 3, 1, l, BLOOD); S.p(x - 1, 3 + l, BLOOD); S.p(x + 1, 3 + l, BLOOD); S.p(x, 3 + l, BLOOD); S.p(x, 4 + l, BLOOD); });
    [[10, 30], [22, 29], [6, 20]].forEach(([x, y]) => S.p(x, y, BLOOD)); plaque(S, '#1a060a', '#a8823a', '#c84050'); }
  function constellations(S) { frame(S, '#d8aa40', '#8a6a20', '#16264a');
    [[[6, 6], [10, 4], [14, 7]], [[21, 5], [25, 8], [24, 12]], [[5, 31], [8, 27]], [[23, 31], [26, 27]]].forEach((c) => { for (let k = 1; k < c.length; k++) S.ln(c[k - 1][0], c[k - 1][1], c[k][0], c[k][1], '#25386a'); c.forEach(([i, j]) => S.p(i, j, '#a8bce8')); });
    for (let j = 8; j < 34; j++) for (let i = 3; i < 29; i++) { const d = Math.hypot(i - 16, j - 21); if (d > 9.5 && d < 12 && (i + j) % 2 === 0) S.p(i, j, '#1e3260'); } S.ring(16, 21, 12, '#34508a');
    plaque(S, '#0f1a34', '#d8aa40', '#d8aa40'); }

  const LIST = { c: CURSES, b: BLESSINGS }, cache = {};
  function card(kind, key) {
    const k = kind + key; if (cache[k]) return cache[k];
    const L = LIST[kind], it = L.find((x) => x[0] === key) || L[0];
    const S = mk(32, 44); (kind === 'c' ? bleeding : constellations)(S);
    const O = mk(24); it[3](O); outline(O, kind === 'c' ? '#0a0408' : '#14202e'); S.x.drawImage(O.c, 4, 9);
    return (cache[k] = S.c.toDataURL());
  }
  // the picture a habit shows: the one chosen in its form, else a guess from its name
  function of(g) { const kind = g.polarity === 'minus' ? 'c' : 'b', L = LIST[kind];
    if (L.some((x) => x[0] === g.grp)) return g.grp;
    const m = L.find((x) => x[2].test(g.name || '')); return m ? m[0] : kind === 'c' ? 'time' : 'mind'; }
  return { card, of, CATS: { c: CURSES.map((x) => [x[0], x[1]]), b: BLESSINGS.map((x) => [x[0], x[1]]) } };
})();
