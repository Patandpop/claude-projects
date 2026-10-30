// The home PC timer pop-up in Ulhu's style (Lane C; lanes/mockups/day-screen-b2.html, picked 30 Oct 2026).
// Little Ulhu, bottom right, says what the timer is counting in his voice, with one "Not that" button; silence means yes.
// From 19:00 he never asks: the night pop-up just says he is counting quietly, and you fix anything in the report.
// The night look is N3 "One eye open" (Patryk's pick, 30 Oct): he dozes and bobs with Zs rising, says his line, and under
// it sits the small tally of tonight's time per job. His words live in DAY and NIGHT below, so changing them is editing a line.
// DayPopup.show(host, { job, cls, since: ms, now: () => ms, sprites: window.ULHU_ART, ledger: [{ job, cls, minutes }],
//   onNotThat: fn }) -> { el, close }. Only the planner on the home PC uses it.
(function (root) {
  'use strict';
  var LATEST = 19 * 60;
  // {what} = the job (and class), {time} = now, {since} = when it started. <b> is the only markup allowed in the lines.
  var DAY = { tag: 'Counting since {since}', text: 'I see <b>{what}</b>. I shall count it, as the deep counts the drowned.', mood: 'happy' };
  var NIGHT = { tag: 'Dozing · still counting', text: 'Mmm... one eye open. <b>{what}</b>, still. The deep never truly sleeps.',
    quiet: 'Fix my dreams in the report.', mood: 'sleepy', look: 'sleep', zz: true, ledger: true };
  var CSS = '.dp{position:fixed;right:16px;bottom:16px;z-index:40;display:flex;align-items:flex-end;gap:6px;pointer-events:none}' +
    '.dp>*{pointer-events:auto}.dp img{width:72px;height:72px;image-rendering:pixelated}' +
    '.dp .bubble{position:relative;width:240px;background:#0b1a2e;color:#d8f3ec;padding:10px 12px;font:12px/1.4 "Courier New",monospace;margin-bottom:24px;' +
    'box-shadow:0 -3px 0 #2f8f84,0 3px 0 #2f8f84,-3px 0 0 #2f8f84,3px 0 0 #2f8f84,0 0 0 3px #071019,6px 6px 0 rgba(0,0,0,.35)}' +
    '.dp .bubble::after{content:"";position:absolute;right:-12px;bottom:10px;width:9px;height:9px;background:#0b1a2e;box-shadow:3px 0 0 #2f8f84,0 3px 0 #2f8f84,3px 3px 0 #2f8f84}' +
    '.dp .bubble b{color:#FABB2E}' +
    '.dp .tag2{display:block;color:#6fd1c3;font-size:10px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}' +
    '.dp .bubble button{margin-top:7px;font:700 11px "Courier New",monospace;background:#2f8f84;color:#071019;border:0;padding:4px 10px;box-shadow:0 2px 0 #145049;cursor:pointer}' +
    '.dp .bubble button.x{position:absolute;top:2px;right:4px;margin:0;background:none;color:#6fd1c3;box-shadow:none;padding:2px 4px}' +
    '.dp .quiet{display:block;color:#7f9db0;font-size:10px;margin-top:5px}' +
    '.dp.night .bubble{background:#08121f;color:#a9c9c2;box-shadow:0 -3px 0 #1d5c56,0 3px 0 #1d5c56,-3px 0 0 #1d5c56,3px 0 0 #1d5c56,0 0 0 3px #040910,6px 6px 0 rgba(0,0,0,.4)}' +
    '.dp.night .bubble::after{background:#08121f;box-shadow:3px 0 0 #1d5c56,0 3px 0 #1d5c56,3px 3px 0 #1d5c56}' +
    '.dp .ledger{margin:6px 0 2px;border-top:2px dashed #1d5c56;padding-top:5px}' +
    '.dp .ledger div{display:flex;justify-content:space-between;font-size:11px}.dp .ledger div span:last-child{color:#FABB2E}' +
    '.dp.sleep img{filter:brightness(.6) saturate(.8);animation:dp-bob 3.2s ease-in-out infinite}' +
    '.dp .zz{position:absolute;right:24px;bottom:76px;font:700 13px "Courier New",monospace;color:#6fd1c3;animation:dp-zz 2.6s ease-in-out infinite}' +
    '@keyframes dp-bob{50%{transform:translateY(3px)}}' +
    '@keyframes dp-zz{0%{transform:translate(0,4px);opacity:0}40%{opacity:.9}100%{transform:translate(6px,-12px);opacity:0}}' +
    '@media (prefers-reduced-motion: reduce){.dp img,.dp .zz{animation:none}}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var hm = function (ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  // fills a line: the values are escaped, and only the line's own <b> tags stay as markup
  function fill(line, vals) {
    return esc(line).replace(/&lt;(\/?)b&gt;/g, '<$1b>').replace(/\{(\w+)\}/g, function (m, k) { return vals[k] != null ? esc(vals[k]) : m; });
  }
  function isNight(ms) { var d = new Date(ms); return d.getHours() * 60 + d.getMinutes() >= LATEST; }

  function show(host, opts) {
    var o = opts || {}, now = (o.now || Date.now)(), night = isNight(now);
    if (!document.getElementById('dp-css')) { var st = document.createElement('style'); st.id = 'dp-css'; st.textContent = CSS; document.head.appendChild(st); }
    var v = night ? NIGHT : DAY;
    var vals = { what: o.job + (o.cls ? ' ' + o.cls : ''), time: hm(now), since: hm(o.since || now) };
    var art = o.sprites || root.ULHU_ART, img = art && art.b16 ? art.b16[v.mood] || art.b16.idle : '';
    var h = (v.zz ? '<div class="zz">z</div>' : '') +
      '<div class="bubble" role="status"><button class="x" data-dp="close" aria-label="Close">✕</button><span class="tag2">' + fill(v.tag, vals) + '</span>' + fill(v.text, vals);
    if (v.ledger) h += '<div class="ledger">' + (o.ledger || []).map(function (r) {
      return '<div><span>' + esc(r.job + (r.cls ? ' ' + r.cls : '')) + '</span><span>' + esc(r.minutes) + ' min</span></div>'; }).join('') + '</div>';
    h += night ? '<span class="quiet">' + fill(v.quiet, vals) + '</span>' : '<br><button data-dp="not">Not that</button>';
    h += '</div>' + (img ? '<img src="' + img + '" alt="Ulhu">' : '');
    var el = document.createElement('div');
    el.className = 'dp' + (night ? ' night' : '') + (v.look ? ' ' + v.look : '');
    el.setAttribute('data-variant', night ? 'night' : 'day');
    el.innerHTML = h;
    (host || document.body).appendChild(el);
    function close() { if (el.parentNode) el.parentNode.removeChild(el); }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dp]'); if (!b) return;
      if (b.getAttribute('data-dp') === 'not' && o.onNotThat) o.onNotThat();
      close();
    });
    return { el: el, close: close };
  }

  var api = { show: show, NIGHT: NIGHT, DAY: DAY, isNight: isNight };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DayPopup = api;
})(typeof window !== 'undefined' ? window : this);
