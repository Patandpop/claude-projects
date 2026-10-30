/* The 2-week bar in glass under each ritual tablet (1U.13, test default G1 "Clear glass strip", 30 Oct; mock-up
   replica/design/mockups/ritualbar2). One slim leaded strip, one pane per window of days (Game.gs gBar_): green glass
   where the ritual was done, deep ruby where it was missed, violet for a forgiven miss, pale blue for a day off, the pane
   still open today with a dotted gold line round it, and a dark pane before the ritual existed. A day it isn't due joins
   the pane before it; done twice splits the pane in two. Real stained glass, as in game-glass.js: every piece is its own
   glass with lead round it, only one break per pane (two in a wide pane), lit pieces glow like light through glass.
   RBAR.html(bar, today, key) -> HTML (a canvas and the day letters); RBAR.paint(root) draws every bar inside root (cheap
   to repeat: a bar is drawn again only when its panes or its width change). */
(function () {
'use strict';
if (typeof window === 'undefined' || window.RBAR) return;
const GREEN = '#2fbf6a', COL = { o: GREEN, x: '#c4323a', e: '#9a5ad8', f: '#6a9ad8', w: '#3a4a46', n: '#1c1828' }, LIT = { o: 1, e: 1, f: 1 };
const LC = '#0a0b10', H = 20, DL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DATA = {};
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 12345; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function hashStr(s) { s = String(s); let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 100000 + 1; }
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const rgb = (a, k) => 'rgb(' + a.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(',') + ')';
function poly(c, p) { c.beginPath(); p.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); }
// one piece of glass: mottled bands of light like the game's glass (a slanted gradient with uneven stops), a few bubbles,
// and a streak of shine when lit; unlit glass is the same colour, dark, as if no light comes through it
function glass(c, p, col, lit, r, k) {
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  c.save(); poly(c, p); c.clip();
  const b = hex(col), a = r() * Math.PI, dx = Math.cos(a) * (x1 - x0) / 2, dy = Math.sin(a) * (y1 - y0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const g = c.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy), m = lit ? 1 : .42;
  [[0, 1.06], [.18 + r() * .1, .9], [.38 + r() * .1, 1.14], [.58 + r() * .08, .88], [.78 + r() * .1, 1.05], [1, .94]].forEach(([o, v]) => g.addColorStop(o, rgb(b, v * m)));
  c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  if (lit) { const rg = c.createRadialGradient(cx, y0, 0, cx, y0, (y1 - y0) * 1.4); rg.addColorStop(0, 'rgba(255,248,230,.22)'); rg.addColorStop(1, 'rgba(255,248,230,0)'); c.fillStyle = rg; c.fillRect(x0, y0, x1 - x0, y1 - y0); }
  c.fillStyle = 'rgba(255,255,255,' + (lit ? .14 : .05) + ')';
  for (let i = 0, n = Math.max(1, Math.round((x1 - x0) / (16 * k))); i < n; i++) { c.beginPath(); c.arc(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), (.5 + r() * .9) * k, 0, 7); c.fill(); }
  if (lit) { c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.2 * k; c.beginPath(); c.moveTo(x0 + (x1 - x0) * .2, y1); c.lineTo(x0 + (x1 - x0) * .42, y0); c.stroke(); }
  c.restore();
}
// a pane: one break (two pieces), two breaks only in a wide pane; each piece its own glass, lead round every piece
function pane(c, x, y, w, h, s, seed, k) {
  const r = rng(seed), col = COL[s] || COL.n, lit = !!LIT[s], breaks = w > h * 4 ? 2 : 1, pieces = [];
  let left = [[x, y], [x, y + h]];
  for (let j = 1; j <= breaks; j++) { const f = j / (breaks + 1), t = x + w * (f + (r() - .5) * .22), bt = x + w * (f + (r() - .5) * .3); pieces.push([left[0], [t, y], [bt, y + h], left[1]]); left = [[t, y], [bt, y + h]]; }
  pieces.push([left[0], [x + w, y], [x + w, y + h], left[1]]);
  pieces.forEach((p, i) => glass(c, p, i % 2 && lit ? mix(col, '#ffffff', .12) : col, lit, r, k));
  c.save(); c.lineJoin = 'round'; c.strokeStyle = LC; c.lineWidth = 1.1 * k; pieces.forEach((p) => { poly(c, p); c.stroke(); });
  c.lineWidth = 2 * k; c.strokeRect(x, y, w, h); c.restore();   // the pane's own frame, a little heavier than its break
  if (s === 'w') { c.save(); c.setLineDash([3 * k, 3 * k]); c.strokeStyle = '#ffd56a'; c.lineWidth = 1.3 * k; c.strokeRect(x + 2.5 * k, y + 2.5 * k, w - 5 * k, h - 5 * k); c.restore(); }
}
function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function draw(cv, bar, key) {
  const k = Math.min(3, window.devicePixelRatio || 1), W = Math.round(cv.clientWidth * k), Hh = Math.round(H * k); if (!W) return false;
  cv.width = W; cv.height = Hh; const c = cv.getContext('2d'), fr = 2 * k, day = (W - 2 * fr) / 14, seed = hashStr(key);
  c.fillStyle = LC; c.fillRect(0, 0, W, Hh);
  let d = 0;
  bar.forEach((wn, i) => {
    const x = fr + d * day, w = wn.len * day, y = fr, h = Hh - 2 * fr, n = wn.s === 'o' ? Math.max(1, wn.times || 1) : 1;
    for (let j = 0; j < n; j++) pane(c, x + w * j / n, y, w / n, h, wn.s, seed + i * 13 + j * 7, k);
    d += wn.len;
  });
  // the line between last week and this week, only where a pane really ends there
  let e = 0; if (bar.some((w) => (e += w.len) === 7)) { c.fillStyle = LC; c.fillRect(fr + 7 * day - 1.4 * k, 0, 2.8 * k, Hh); }
  return true;
}
function html(bar, today, key) {
  if (!bar || !bar.length) return '';
  DATA[key] = bar;
  const p = String(today || '').split('-').map(Number), t = p.length === 3 ? new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay() : 0;
  const lets = Array.from({ length: 14 }, (_, i) => { const l = DL[(t - 13 + i + 70) % 7]; return i === 13 ? '<b>' + l + '</b>' : '<span>' + l + '</span>'; }).join('');
  return '<div class="rb" data-rb="' + key + '"><canvas></canvas><div class="rb-l">' + lets + '</div></div>';
}
function paint(root) {
  (root || document).querySelectorAll('.rb[data-rb]').forEach((el) => {
    const key = el.dataset.rb, bar = DATA[key], cv = el.querySelector('canvas'); if (!bar || !cv) return;
    const sig = JSON.stringify(bar) + '|' + cv.clientWidth; if (cv._rb === sig) return;
    if (draw(cv, bar, key)) cv._rb = sig;
  });
}
if (!document.getElementById('rb-css')) { const st = document.createElement('style'); st.id = 'rb-css';
  st.textContent = '.rb{margin:-2px 10px 4px}.rb canvas{display:block;width:100%;height:' + H + 'px}.rb-l{display:grid;grid-template-columns:repeat(14,1fr);margin:1px 2px 0;font:700 10.5px var(--a,system-ui);color:#8a8496;text-align:center}.rb-l b{color:#efeaf4}';
  document.head.appendChild(st); }
window.RBAR = { html, paint };
})();
