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
