/* Round 3 of the Oracle (28 Oct): B2 and B3 cut with the blessing tiles' own glass engine (ORX, from game-glass.js).
   Every day's mark is a glass motif: a star of five honey diamonds, a middle mark, or a pale crescent moon, with two rings
   of pieces cut round it so the joins radiate from its points, and a pale-blue path of pieces joining kept days in a row.
   Carved stone tracery sits over the glass to frame each day. Needs the page's helpers. */
const ROSE = (() => {
  const kind = (d) => d.level === 'all' || d.level === 'most' ? 'star' : d.level === 'some' ? 'mid' : d.level === 'none' ? 'moon' : d.level;
  const MARKED = { star: 1, mid: 1, moon: 1, off: 1 };
  const f = (v) => (+v).toFixed(1);
  const FIT = { 1: { s: 10, lw: .9, rings: [{ n: 10, r: 1.5 }, { n: 10, r: 2.6, jr: .06 }], step: 7.6 },
    2: { s: 7, lw: .75, rings: [{ n: 12, r: 1.45 }, { n: 12, r: 2.15, jr: .08 }, { n: 14, r: 2.9, jr: .1 }], step: 6 },
    3: { s: 10, lw: .9, rings: [{ n: 10, r: 1.5 }, { n: 10, r: 2.6, jr: .06 }], step: 7.6, dim: .5, blur: 5 } };
  const motifOf = (kd, m) => kd === 'star' ? 'star' : kd === 'moon' ? 'moon' : kd === 'off' ? 'half' : m === 'ember' ? 'gem' : m === 'half' ? 'star' : 'spark';
  const famOf = (kd, m) => kd === 'star' ? 'star' : kd === 'moon' ? 'moonp' : kd === 'off' ? 'evil' : m === 'ember' ? 'ember' : m === 'half' ? 'aqua' : 'silver';
  /* two layers of glass round every mark, then the day's background: inner ring, outer ring, ground */
  const PANEL = { star: 'bgD', mid: 'aquaD', moon: 'mdark', off: 'restD', today: 'today', future: 'fut' };
  const HALO = { star: 'haloB', mid: 'aquaL', moon: 'mviolet', off: 'curseP' };
  const RING2 = { star: 'ring2', mid: 'aquaM', moon: 'mshade', off: 'restp' };
  /* cut one window: marks = [{x, y, R0, d}], panelOf(x, y) -> day or null */
  function cutWin(W, H, seed, v, m, marks, panelOf, link, rings) {
    const F = Object.assign({}, FIT[v], rings ? { rings } : {});
    const G = ORX.cut({ w: W, h: H, seed, s: F.s, lw: F.lw, events: marks.map((q) => ({ x: q.x, y: q.y })), nChain: marks.length, sizes: () => marks.map((q) => q.R0),
      fit: { rings: F.rings, step: F.step, clr: F.step * .97, bow: .12, jag: 1.6 }, link, moonRot: Math.PI / 2, moonShadow: 'mdark', halfShadow: 'evilD',
      motif: (k) => motifOf(kind(marks[k].d), m), motifFam: (k) => famOf(kind(marks[k].d), m),
      famFx: (kd, src, c) => { const d = panelOf(c[0], c[1]), pk = d ? kind(d) : 'star';
        if (kd === 'path') return { fam: 'paleB' };
        if (kd === 'ring' && src.ri === 0 && HALO[pk]) return { fam: HALO[pk], lit: pk !== 'moon' };
        if (kd === 'ring' && src.ri >= 1 && RING2[pk]) return { fam: RING2[pk] };
        return { fam: d ? PANEL[pk] || 'bg' : 'bg' }; }, lightAt: [.5, .12] });
    G.stars.forEach((s, k) => { const kd = kind(marks[k].d); s.lit = kd === 'star' ? .78 : kd === 'mid' ? .55 : kd === 'off' ? .48 : .22; });
    return G;
  }
  const linkOf = (marks) => (k) => { return false; const a = marks[k - 1], b = marks[k]; return kind(a.d) === 'star' && kind(b.d) === 'star' && a.d.w === b.d.w && b.d.i === a.d.i + 1; };
  const hit = (d, path, x, y, R0) => { const fut = d.level === 'future';
    return '<g class="' + (fut ? 'rs-fut' : 'jw') + '"' + (fut ? '' : ' role="button" tabindex="0" data-day="' + d.i + '"') + ' aria-label="' + esc(aria(d)) + '"><path class="ring" d="' + path + '" fill="transparent"/>' +
      (d.level === 'today' ? '<path class="rs-now" d="' + path + '" fill="none" stroke="#e8b84e" stroke-width="2"/>' : '') +
      (d.high && !fut && x != null ? '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(R0 * 1.55 + 3) + '" fill="none" stroke="#d9b45c" stroke-width="1.2" stroke-dasharray="1.6 2.4" pointer-events="none"/>' : '') + '</g>'; };
  const STONE = '<linearGradient id="RS-st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3842"/><stop offset="1" stop-color="#1f1e25"/></linearGradient>' +
    '<radialGradient id="RS-eye" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff4c8"/><stop offset=".6" stop-color="#f0bf52" stop-opacity=".2"/><stop offset="1" stop-color="#7a4c10" stop-opacity=".8"/></radialGradient>';
  const bar = (dPath, w) => '<path d="' + dPath + '" fill="none" stroke="#0a0b10" stroke-width="' + (w + 2) + '" stroke-linecap="round"/><path d="' + dPath + '" fill="none" stroke="url(#RS-st)" stroke-width="' + w + '" stroke-linecap="round"/><path d="' + dPath + '" fill="none" stroke="#5a5764" stroke-width=".7" stroke-opacity=".7"/>';
  const circ = (cx, cy, r) => 'M' + (cx - r) + ' ' + cy + 'A' + r + ' ' + r + ' 0 1 0 ' + (cx + r) + ' ' + cy + 'A' + r + ' ' + r + ' 0 1 0 ' + (cx - r) + ' ' + cy + 'Z';

  /* B2: the rose window. Each ring is a week (oldest in the middle), each spoke a day, Monday at the top. */
  const C = 200, RI = (w) => 48 + 27 * w, ang = (k) => (-90 + k * 360 / 7) * Math.PI / 180, P = (r, a) => [C + Math.cos(a) * r, C + Math.sin(a) * r];
  const sector = (r0, r1, a0, a1) => { const A = P(r1, a0), B = P(r1, a1), Cc = P(r0, a1), Dd = P(r0, a0);
    return 'M' + f(A[0]) + ' ' + f(A[1]) + 'A' + r1 + ' ' + r1 + ' 0 0 1 ' + f(B[0]) + ' ' + f(B[1]) + 'L' + f(Cc[0]) + ' ' + f(Cc[1]) + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + f(Dd[0]) + ' ' + f(Dd[1]) + 'Z'; };
  function roseGeo(v, m) {
    const marks = [];
    WEEKS.forEach((wk, w) => wk.forEach((d, k) => { const kd = kind(d); if (MARKED[kd]) { const p = P(RI(w) + 13.5, ang(k)), R0 = Math.min(7, 5.8 + w * .35); marks.push({ x: p[0], y: p[1], R0: kd === 'moon' || kd === 'off' ? R0 * 1.08 : R0, d }); } }));
    const panelOf = (x, y) => { const r = Math.hypot(x - C, y - C), w = Math.floor((r - 48) / 27); if (w < 0 || w > 4) return null;
      let a = Math.atan2(y - C, x - C) * 180 / Math.PI + 90; a = (a + 360) % 360; const k = Math.round(a / (360 / 7)) % 7; return WEEKS[w][k]; };
    return { G: cutWin(400, 400, 191 + v, v, m, marks, panelOf, linkOf(marks), [{ n: 10, r: 1.45 }, { n: 12, r: 1.95, jr: .05 }]), marks };
  }
  const EYES = { gold: [['#f4cc62', '#d9a23a', '#b8822a'], ['#8a5a14', '#b07a22'], '#0a0604'], yellow: [['#fbe878', '#e8cf48', '#cdb232'], ['#9a7a12', '#c49e20'], '#0a0604'],
    aqua: [['#8fe9db', '#5ccbbc', '#3aa597'], ['#0f5c5c', '#1f8a86'], '#03100f'], cursed: [['#d6404a', '#a82630', '#7e1820'], ['#4fe39a', '#2ba66a'], '#050203'] };
  const IRIS = {
    gold: [['#c8a85c', '#b89a5e', '#d6b25a'], ['#e0a632', '#c98a1c', '#e8b83c', '#b8761a'], ['#ff9a0a', '#ff7a00', '#ffb000'], '#5a1e00'],
    yellow: [['#d8cc78', '#c6bc6e', '#e0d07c'], ['#f0d23a', '#d8bc1a', '#c8d040', '#e8c020'], ['#ffe000', '#ffc800', '#f0ff20'], '#4a3a00'],
    aqua: [['#6fa8b4', '#7cb4a2', '#5e98b0', '#88b8b0'], ['#3fc8b4', '#2aa6c4', '#52d6a0', '#2c9cb0'], ['#00e5c8', '#00b8e0', '#00f0a0'], '#003c46'],
    cursed: [['#8e6a74', '#6e8a76', '#946068'], ['#50c88a', '#c83a48', '#3eb070', '#a82a50'], ['#00ff7a', '#ff1a3a', '#20ff60'], '#2a0010'] };
  const hsl = (h, s, l) => 'hsl(' + Math.round(((h % 360) + 360) % 360) + ',' + s + '%,' + l + '%)';
  const bow = (n, h0, span, s, l) => Array.from({ length: n }, (_, i) => hsl(h0 + span * i / n, s, l + (i % 2) * 4));
  const RAIN = { /* [start hue, hue span, sclera sat/light, ring sats, ring lights, pupil glow] */
    rainbow: [0, 360, [58, 74], [45, 75, 100], [74, 62, 54], '#1a0636'],
    aquabow: [150, 120, [62, 70], [40, 70, 100], [76, 62, 52], '#00303c'],
    opal: [180, 360, [42, 80], [28, 50, 95], [84, 74, 60], '#2a1450'],
    ember: [-20, 90, [68, 68], [45, 80, 100], [72, 60, 52], '#3a0800'] };
  Object.keys(RAIN).forEach((k) => { const [h0, sp, sc, S, L, pu] = RAIN[k];
    EYES[k] = [bow(12, h0 + 30, sp, sc[0], sc[1]), [], '#05040a'];
    IRIS[k] = [bow(12, h0, sp, S[0], L[0]), bow(10, h0 + sp / 6, sp, S[1], L[1]), bow(8, h0 + sp / 3, sp, S[2], L[2]), pu]; });
  let EYE = 'gold';
  function eye(cx, cy) { /* an almond of cut crystal: twelve facets round the iris, ten in the iris, a slit pupil */
    const [sc, ir, pu] = EYES[EYE], W = 39, H = 22, RIr = 18.5, RP = 5.5, N = 12;
    const al = (t) => { const sn = Math.sin(t); return [cx + Math.cos(t) * W, cy + Math.sign(sn) * H * Math.pow(Math.abs(sn), 1.35)]; };
    let h = '<g class="rs-eye">';
    for (let i = 0; i < N; i++) { const t0 = i * 2 * Math.PI / N, t1 = (i + 1) * 2 * Math.PI / N, a = al(t0), b = al(t1), c = [cx + Math.cos(t1) * RIr, cy + Math.sin(t1) * RIr], d = [cx + Math.cos(t0) * RIr, cy + Math.sin(t0) * RIr];
      h += '<path d="M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]) + 'L' + f(c[0]) + ' ' + f(c[1]) + 'L' + f(d[0]) + ' ' + f(d[1]) + 'Z" fill="' + sc[i % sc.length] + '" stroke="#0a0b10" stroke-width="1.3" stroke-linejoin="round"/>'; }
    const IR = IRIS[EYE], RR = [RIr, 14, 9.8, RP], NN = [12, 10, 8];
    for (let ring = 0; ring < 3; ring++) { const n = NN[ring], ro = RR[ring], ri = RR[ring + 1], sp = ring * .31, cols = IR[ring];
      for (let i = 0; i < n; i++) { const t0 = sp + i * 2 * Math.PI / n, t1 = sp + (i + 1) * 2 * Math.PI / n;
        h += '<path d="M' + f(cx + Math.cos(t0) * ro) + ' ' + f(cy + Math.sin(t0) * ro) + 'L' + f(cx + Math.cos(t1) * ro) + ' ' + f(cy + Math.sin(t1) * ro) + 'L' + f(cx + Math.cos(t1) * ri) + ' ' + f(cy + Math.sin(t1) * ri) + 'L' + f(cx + Math.cos(t0) * ri) + ' ' + f(cy + Math.sin(t0) * ri) + 'Z" fill="' + cols[i % cols.length] + '" stroke="#0a0b10" stroke-width="' + (ring ? .8 : 1) + '" stroke-linejoin="round"/>'; } }
    h += '<circle cx="' + cx + '" cy="' + cy + '" r="' + RP + '" fill="' + IR[3] + '" stroke="#0a0b10" stroke-width=".8"/>';
    h += '<path d="M' + cx + ' ' + (cy - 13) + 'Q' + (cx + 3.6) + ' ' + cy + ' ' + cx + ' ' + (cy + 13) + 'Q' + (cx - 3.6) + ' ' + cy + ' ' + cx + ' ' + (cy - 14) + 'Z" fill="' + pu + '" stroke="#0a0b10" stroke-width="1.2"/>';
    h += '<path d="M' + (cx - 20) + ' ' + (cy - 9) + 'L' + (cx - 11) + ' ' + (cy - 12) + 'L' + (cx - 13) + ' ' + (cy - 7) + 'Z" fill="#fff" opacity=".55"/>';
    return h + '</g>'; }
  function roseSvg(marks) {
    let h = '<svg class="rs-over" viewBox="0 0 400 400" role="group" aria-label="' + esc(NAME) + ', rose window"><defs>' + STONE + '</defs>';
    h += '<path d="M0 0H400V400H0Z' + circ(200, 200, 190) + '" fill="#000" fill-rule="evenodd"/>';
    h += '<circle cx="200" cy="200" r="191" fill="none" stroke="#0a0b10" stroke-width="10"/><circle cx="200" cy="200" r="191" fill="none" stroke="url(#RS-st)" stroke-width="8"/><circle cx="200" cy="200" r="195" fill="none" stroke="#5a5764" stroke-width=".8"/>';
    for (let k = 0; k < 7; k++) { const a = P(48, ang(k + .5)), b = P(184, ang(k + .5)); h += bar('M' + f(a[0]) + ' ' + f(a[1]) + 'L' + f(b[0]) + ' ' + f(b[1]), 3.6); }
    [75, 102, 129, 156].forEach((r) => { h += bar(circ(200, 200, r), 2.8); });
    h += bar(circ(200, 200, 184), 4.5);
    h += '<circle cx="200" cy="200" r="48" fill="url(#RS-st)" stroke="#0a0b10" stroke-width="3"/>' + eye(200, 200);
    const mk = {}; marks.forEach((q) => { mk[q.d.i] = q; });
    WEEKS.forEach((wk, w) => wk.forEach((d, k) => { const q = mk[d.i]; h += hit(d, sector(RI(w) + 1.5, RI(w) + 25.5, ang(k - .5), ang(k + .5)), q ? q.x : null, q ? q.y : null, q ? q.R0 : 0); }));
    DL.forEach((l, k) => { const p = P(206, ang(k)); h += '<text x="' + f(p[0]) + '" y="' + f(p[1] + 4) + '" text-anchor="middle" class="lab" style="fill:' + (k === 0 ? '#e8c46e' : '#c9bf9f') + '">' + l + '</text>'; });
    return h + '</svg>';
  }
  /* B3: five lancets, one per week, Monday at the top, Sunday's High Vespers in the round pane at the foot */
  const lx = (w) => 30 + w * 70, LW = 60, TOP = 190, BOT = 618, BIG = 'M14 660V170A190 190 0 0 1 200 14A190 190 0 0 1 386 170V660Z';
  const lan = (w) => { const x0 = lx(w), x1 = x0 + LW, mm = x0 + LW / 2; return 'M' + x0 + ' ' + BOT + 'V' + (TOP + 18) + 'A46 46 0 0 1 ' + mm + ' ' + (TOP - 24) + 'A46 46 0 0 1 ' + x1 + ' ' + (TOP + 18) + 'V' + BOT + 'Z'; };
  const PH = 380 / 6, yB = (k) => 168 + PH * k, cyOf = (k) => k === 6 ? 581 : k === 0 ? 199 : yB(k) + PH / 2;
  function lanGeo(v, m) {
    const marks = [];
    WEEKS.forEach((wk, w) => wk.forEach((d, k) => { const kd = kind(d); if (MARKED[kd]) marks.push({ x: lx(w) + LW / 2, y: cyOf(k), R0: kd === 'off' ? 13 : kd === 'moon' ? 12 : 10.5, d }); }));
    const panelOf = (x, y) => { const w = Math.floor((x - 30) / 70); if (w < 0 || w > 4 || x - lx(w) > LW) return null; const k = y < 548 ? Math.floor((y - 168) / PH) : 6; return WEEKS[w][Math.max(0, Math.min(6, k))]; };
    return { G: cutWin(400, 680, 333 + v, v, m, marks, panelOf, linkOf(marks), [{ n: 10, r: 1.5 }, { n: 12, r: 2.45, jr: .05 }]), marks };
  }
  function lanSvg(marks) {
    let open = ''; for (let w = 0; w < 5; w++) open += lan(w); open += circ(200, 96, 58);
    let h = '<svg class="rs-over" viewBox="0 0 400 680" role="group" aria-label="' + esc(NAME) + ', five lancets"><defs>' + STONE + '</defs>';
    h += '<path d="M0 0H400V680H0Z' + BIG + '" fill="#000" fill-rule="evenodd"/>';
    h += '<path d="' + BIG + open + '" fill="url(#RS-st)" fill-rule="evenodd" stroke="#0a0b10" stroke-width="2"/>';
    h += '<path d="' + BIG + '" fill="none" stroke="#5a5764" stroke-width="1"/>';
    for (let w = 0; w < 5; w++) { h += '<path d="' + lan(w) + '" fill="none" stroke="#0a0b10" stroke-width="3"/>';
      for (let k = 1; k <= 6; k++) h += bar('M' + lx(w) + ' ' + f(k === 6 ? 548 : yB(k)) + 'H' + (lx(w) + LW), 3);
      h += '<circle cx="' + (lx(w) + LW / 2) + '" cy="581" r="26" fill="none" stroke="#0a0b10" stroke-width="5"/><circle cx="' + (lx(w) + LW / 2) + '" cy="581" r="26" fill="none" stroke="url(#RS-st)" stroke-width="3"/>'; }
    for (let k = 0; k < 6; k++) { const t = -Math.PI / 2 + k * Math.PI / 3; h += bar('M' + f(200 + Math.cos(t) * 26) + ' ' + f(96 + Math.sin(t) * 26) + 'L' + f(200 + Math.cos(t) * 57) + ' ' + f(96 + Math.sin(t) * 57), 2.6); }
    h += '<circle cx="200" cy="96" r="24" fill="#e8b84e" stroke="#0a0b10" stroke-width="3"/><circle cx="200" cy="96" r="24" fill="url(#RS-eye)"/><text x="200" y="105" text-anchor="middle" class="tlab" style="fill:#2a1a06;font-size:26px">' + KEPT + '</text>';
    const mk = {}; marks.forEach((q) => { mk[q.d.i] = q; });
    WEEKS.forEach((wk, w) => { const x0 = lx(w);
      wk.forEach((d, k) => { const q = mk[d.i], cx = x0 + LW / 2, p = k === 6 ? circ(cx, 581, 25) : 'M' + x0 + ' ' + f(k ? yB(k) + 2 : 150) + 'H' + (x0 + LW) + 'V' + f(k === 5 ? 546 : yB(k + 1) - 2) + 'H' + x0 + 'Z';
        h += hit(d, p, q ? q.x : null, q ? q.y : null, q ? q.R0 : 0); });
      h += '<text x="' + (x0 + LW / 2) + '" y="676" text-anchor="middle" class="lab">' + wkLabel(w) + '</text>'; });
    return h + '</svg>';
  }
  const legend = (m) => '<div class="leg rleg"><span><i style="background:#f0c860"></i>star: all or most kept</span><span><i style="background:' + (m === 'ember' ? '#d98a3a' : m === 'half' ? '#8fe9db' : '#cfe0f0') + '"></i>' + (m === 'ember' ? 'ember' : m === 'half' ? 'aquamarine star' : 'spark') + ': some kept</span><span><i style="background:#a6a4c4"></i>moon: none kept</span><span><i style="background:#4fe39a"></i>half moon: rest night</span></div>';
  /* holder HTML, then paint() cuts and draws each window (one per frame, so the page stays responsive) */
  const hold = (kindW, v) => '<div class="rs-win" data-w="' + kindW + '" data-v="' + v + '" style="aspect-ratio:' + (kindW === 'rose' ? '1/1' : '400/680') + '"></div>';
  function paint(root, m) {
    const list = [...root.querySelectorAll('.rs-win')];
    const one = () => { const el = list.shift(); if (!el) return; const v = +el.dataset.v, rose = el.dataset.w === 'rose', g = rose ? roseGeo(v, m) : lanGeo(v, m);
      const w = el.clientWidth, cv = document.createElement('canvas'); cv.className = 'rs-cv';
      ORX.render(cv, g.G, w, w * (rose ? 1 : 1.7), { shape: rose ? circ(200, 200, 190) : BIG, dim: FIT[v].dim, blur: FIT[v].blur });
      el.innerHTML = ''; el.appendChild(cv); el.insertAdjacentHTML('beforeend', (rose ? roseSvg : lanSvg)(g.marks) + (v === 2 ? '<i class="rs-bw" style="clip-path:' + (rose ? 'circle(47.5% at 50% 50%)' : 'inset(3% 4% 3% 4% round 46% 46% 0 0)') + '"><i class="rs-beam"></i></i>' : ''));
      requestAnimationFrame(one); };
    requestAnimationFrame(one);
  }
  return { hold, paint, legend, setEye: (e) => { EYE = e; } };
})();
