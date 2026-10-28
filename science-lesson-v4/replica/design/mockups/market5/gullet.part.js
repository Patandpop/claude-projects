const MP = { s: ['#5f8270', '#8db298', '#3a5646'], b: ['#cbc796', '#ece8bc', '#96925f'], f: ['#3e7a80', '#7ab8b6', '#1f474e'], F: '#163238', j: ['#a8862a', '#d8b444', '#5e4612'], J: '#6e5414', H: ['#c49e34', '#ecca5a', '#6a4e12'],
  a: ['#d4caac', '#f1e9ce', '#9c9276'], t: '#7a5232', q: '#5e2424', u: '#4a2e16', e: ['#e6cf4e', '#fff3a0', '#a88a20'], k: '#0b0a0e', w: '#ffffff', L: '#46684f', K: '#1e3226', m: '#2a0c12',
  T: '#ece6d2', y: '#ffd56a', B: '#24321f', g: '#b04450', G: '#4a1418', h: '#d0d4dc', r: ['#b0aa92', '#d6d0b8', '#7a7462'], S: '#a6c8a8', P: '#8a8068', n: '#3a5646' };
const MCACHE = {};
function monger(pose, gill, blink, talk) {
  const key = pose + gill + blink + talk; if (MCACHE[key]) return MCACHE[key];
  const lean = pose === 'lean', sulk = pose === 'sulk', rub = pose === 'rub0' || pose === 'rub1', wipe = pose.startsWith('wipe');
  const dy = lean ? 2 : sulk ? 1 : 0, hy = 16 + dy + (lean ? 1 : 0);
  let lid = lean ? .08 : sulk ? .62 : rub ? .5 : .42; if (blink) lid = 1;
  const ppx = sulk ? 2 : 0, ppy = sulk ? 1 : rub ? -1 : 0;
  const mouth = talk ? 'open' : (lean || rub) ? 'grin' : sulk ? 'frown' : 'smirk';
  const r = MCACHE[key] = mk(52, 46, MP, (A) => {
    const thick = (x0, y0, x1, y1, rr, c) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2 + 1; for (let i = 0; i <= n; i++) A.ell(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, rr, rr, c); };
    const arm = (x0, y0, x1, y1) => { thick(x0, y0, x1, y1, 3.3, 'K'); thick(x0, y0, x1, y1, 2.5, 's'); };
    const sleeve = (x, y) => { A.ell(x, y, 4.4, 4, 'K'); A.ell(x, y, 3.6, 3.2, 'j'); A.set(x + 1, y + 1, 'J'); };
    const hand = (x, y) => { A.ell(x, y, 4.3, 3.2, 'K'); A.ell(x, y, 3.5, 2.4, 's'); A.line(x - 3, y + 2, x + 3, y + 2, 'f'); A.set(x - 2, y + 1, 'f'); A.set(x + 2, y + 1, 'f'); A.set(x - 1, y - 1, 'S'); };
    // hunched shoulders and striped jersey
    A.ell(26, 38 + dy - (gill ? .5 : 0), 18.5, 10.5, 'j');
    for (let y = 0; y < 46; y++) for (let x = 0; x < 52; x++) if (A.get(x, y) === 'j' && (x * 2 + Math.floor(y / 2)) % 11 === 0 && y > 30) A.set(x, y, 'J');
    // stained apron, straps, pocket with a fish tail poking out
    A.rect(16, 31 + dy, 20, 15, 'a'); A.rect(19, 28 + dy, 14, 4, 'a');
    A.line(19, 28 + dy, 15, 23 + dy, 'u'); A.line(32, 28 + dy, 37, 23 + dy, 'u');
    A.line(16, 32 + dy, 16, 45, 'P'); A.line(35, 32 + dy, 35, 45, 'P');
    [[20, 35, 1.6, 't'], [30, 42, 1.8, 'q'], [32, 33, 1.1, 't'], [18, 42, 1.2, 't'], [25, 30, 1, 'q'], [23, 44, 1, 't']].forEach(([x, y, rr, c]) => A.ell(x, y + dy, rr, rr * .8, c));
    A.rect(22, 37 + dy, 8, 5, 'a'); A.line(22, 37 + dy, 29, 37 + dy, 'P'); A.line(22, 37 + dy, 22, 41 + dy, 'P'); A.line(29, 37 + dy, 29, 41 + dy, 'P');
    A.tri(23, 33 + dy, 26.5, 36.5 + dy, 24.5, 36.5 + dy, 'f'); A.tri(29, 33 + dy, 25.5, 36.5 + dy, 27.5, 36.5 + dy, 'f');
    // arms: forearms resting on the counter, outlined so they read against the body
    if (pose === 'rest' || lean || wipe) { arm(9, 31 + dy, 15, 39); sleeve(9, 31 + dy); hand(16, 40); }
    if (pose === 'rest') { arm(43, 31 + dy, 37, 39); sleeve(43, 31 + dy); hand(36, 40); }
    if (wipe) { const xr = 35 + [-5, 0, 5][+pose[4]]; arm(43, 31, xr + 2, 38); sleeve(43, 31); A.ell(xr, 41, 5.5, 1.8, 'K'); A.ell(xr, 41, 4.8, 1.2, 'r'); A.set(xr - 2, 41, 't'); hand(xr + 2, 39); }
    if (rub) { const k = pose === 'rub1' ? 1 : -1; arm(9, 31, 21, 36); arm(43, 31, 31, 36); sleeve(9, 31); sleeve(43, 31); hand(23, 36 + k); hand(29, 36 - k); }
    if (sulk) { sleeve(9, 32); sleeve(43, 32); arm(10, 34, 36, 37); arm(42, 34, 16, 38); A.ell(36, 37, 3, 2.2, 's'); A.ell(16, 38, 3, 2.2, 's'); }
    // head: bulging brow, heavy jaw with a shadow under it
    A.ell(26, hy, 14, 10, 's'); A.ell(26, hy - 5, 9.5, 5.5, 's');
    A.ell(26, hy + 8.5, 12, 4.4, 'K'); A.ell(26, hy + 6.5, 11.8, 4.4, 'b');
    [[21, hy - 4], [24, hy - 5], [31, hy - 4], [34, hy - 3], [18, hy - 3], [36, hy - 1], [16, hy + 2]].forEach(([x, y]) => A.set(x, y, 'S'));
    // big side eyes with smug, heavy lids
    [14.5, 37.5].forEach((cx, side) => {
      const er = side ? 3.5 : 4.8, ey = hy - 1 + (side ? 1 : 0);
      A.ell(cx, ey, er + .9, er + .9, 'K'); A.ell(cx, ey, er, er, 'e');
      const px = Math.round(cx - 1.5 + (side ? -1 : 1) * (lean ? 0 : .6) + ppx), py = Math.round(ey) - 1 + ppy;
      if (side) { A.rect(px + 1, py + 1, 2, 2, 'k'); A.set(px + 1, py + 1, 'w'); } else { A.rect(px, py, 3, 3, 'k'); A.set(px, py, 'w'); }
      const top = Math.floor(ey - er - 1), rows = Math.round(lid * (er * 2 + 2));
      for (let y = top; y < top + rows; y++) for (let x = Math.floor(cx - 6); x <= Math.ceil(cx + 6); x++) { const v = A.get(x, y); if (v === 'e' || v === 'k' || v === 'w') A.set(x, y, 'L'); }
      if (rows > 0 && rows < er * 2 + 2) for (let x = Math.floor(cx - 6); x <= Math.ceil(cx + 6); x++) { const v = A.get(x, top + rows); if (v === 'e' || v === 'k' || v === 'w') A.set(x, top + rows, 'K'); }
    });
    // brows: sly, eager or sulky
    const bl = sulk ? [[9, hy - 5], [19, hy - 7]] : lean ? [[9, hy - 7], [19, hy - 7]] : [[9, hy - 7], [19, hy - 5]];
    A.line(bl[0][0], bl[0][1], bl[1][0], bl[1][1], 'K'); A.line(52 - bl[0][0] - 1, bl[0][1], 52 - bl[1][0] - 1, bl[1][1], 'K');
    A.set(24, hy + 1, 'k'); A.set(28, hy + 1, 'k');
    // mouth: wide, lipped, snaggle teeth, one gold tooth
    for (let x = 15; x <= 37; x++) {
      const u = (x - 26) / 11; let y;
      if (mouth === 'smirk') y = hy + 5 + (x < 19 ? Math.round((19 - x) * .5) : 0) - (x > 31 ? Math.round((x - 31) * .5) : 0);
      else if (mouth === 'grin') y = hy + 6 - Math.round(u * u * 3.6);
      else if (mouth === 'frown') y = hy + 4 + Math.round(u * u * 3);
      else y = hy + 5;
      A.set(x, y, 'm');
      if (mouth === 'grin' && Math.abs(u) < .8) { A.set(x, y + 1, 'm'); if (x % 2) A.set(x, y, 'T'); if (x === 30) A.set(x, y, 'y'); }
      if (mouth === 'open' && x > 18 && x < 34) { A.set(x, y + 1, 'm'); A.set(x, y + 2, x > 22 && x < 30 ? 'q' : 'm'); if (x % 3 === 0) A.set(x, y, 'T'); }
    }
    if (mouth !== 'grin') { const my = hy + (mouth === 'frown' ? 5 : 5); A.set(20, my - 1, 'T'); A.set(20, my - 2, 'T'); A.set(33, my - 1, 'T'); A.set(29, my - 1, 'y'); A.set(29, my, 'y'); }
    // barbels like a greasy moustache
    if (sulk) { A.line(15, hy + 6, 13, hy + 16, 'B'); A.line(37, hy + 6, 39, hy + 16, 'B'); }
    else { A.line(15, hy + 6, 9, hy + 9, 'B'); A.line(9, hy + 9, 7, hy + 15, 'B'); A.set(8, hy + 16, 'B'); A.line(37, hy + 6, 43, hy + 9, 'B'); A.line(43, hy + 9, 45, hy + 15, 'B'); A.set(44, hy + 16, 'B'); }
    // gill slits at the jaw hinge
    for (let i = 0; i < 3; i++) { A.line(12 + i, hy + 3 + i * .5, 12 + i, hy + 6 + i * .5, gill ? 'G' : 'K'); A.line(40 - i, hy + 3 + i * .5, 40 - i, hy + 6 + i * .5, gill ? 'G' : 'K'); }
    if (gill) { A.set(13, hy + 4, 'g'); A.set(39, hy + 4, 'g'); }
    // oily shine
    [[22, hy - 4], [23, hy - 4], [30, hy - 3], [19, hy - 2]].forEach(([x, y]) => A.set(x, y, 'w'));
    // a gold hoop through one gill
    A.ring(10.5, hy + 7, 2.4, 'y'); A.set(12, hy + 5, 'G');
    // the yellow oilskin sou'wester, a dorsal fin poking through
    A.ell(26, hy - 7.5, 18, 2.8, 'H'); A.ell(26, hy - 11, 10.5, 4.6, 'H'); for (let x = 10; x <= 42; x += 3) A.set(x, hy - 6, 'J'); A.line(16, hy - 9, 36, hy - 9, 'J');
    A.tri(31, hy - 13, 34, hy - 17, 37, hy - 13, 'f'); A.line(34, hy - 16, 34, hy - 13, 'F');
    A.set(21, hy - 13, 'w'); A.set(22, hy - 14, 'w');
    if (lean) { arm(44, 33, 42, hy + 9); sleeve(44, 33); hand(41, hy + 7); A.line(39, hy + 5, 39, hy + 9, 'f'); }
  });
  return r;
