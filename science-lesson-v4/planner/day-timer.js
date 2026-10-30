// The evening timer's phone side (Lane C; lanes/design-installed-app.md 3.9, the picker in lanes/mockups/day-screen.html).
// A self-contained piece: DayTimer.mount(element, call, opts). Used by the day screen (planner/day-screen.js) for its
// "More..." picker and the top bar. Needs planner/day-logic.js (window.DayLogic) loaded first.
//   call(fn, ...args) -> Promise: google.script.run on the planner pages, API.call in the installed app.
//   opts: { todayClasses: ['9AS', ...], recent: [{ job, cls, startedAt }], timer: running row or null, source: 'phone'|'pc'|'free', now: () => ms,
//           bar: an element for the running timer (the day screen's fixed top bar; without it the chip sits in the picker),
//           noLikely: true to leave out the "Likeliest now" row (the day screen shows its own start buttons) }
// Shows the running chip (job, class, minutes, Stop) and the picker: the 3 likeliest jobs first, then job, then class
// when the job carries one. Starting a new job stops the old one (the server does that too). Colours come from the
// page's own theme variables, so Light, Dark and Auto follow the page.
(function (root) {
  'use strict';
  var CSS = '.dt{font:inherit;color:var(--ink,#12345C)}' +
    '.dt h4{margin:10px 0 6px;font-size:14px}' +
    '.dt .chips{display:flex;gap:6px;flex-wrap:wrap}' +
    '.dt .chips button{border:1px solid var(--line,#C9D6E5);background:var(--plate,#fff);color:var(--ink,#12345C);border-radius:999px;padding:8px 12px;font:inherit;font-size:14px;font-weight:600;cursor:pointer}' +
    '.dt .chips button.likely{background:var(--deep,#0D2442);border-color:var(--deep,#0D2442);color:#fff}' +
    '.dt .chips button[aria-pressed=true]{background:var(--deep,#0D2442);border-color:var(--deep,#0D2442);color:#fff}' +
    '.dt .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
    '.dt .grid button{border:1px solid var(--line,#C9D6E5);background:var(--plate,#fff);color:var(--ink,#12345C);border-radius:12px;padding:16px 10px;font:inherit;font-weight:700;cursor:pointer}' +
    '.dt .grid button[aria-pressed=true]{background:var(--deep,#0D2442);border-color:var(--deep,#0D2442);color:#fff}' +
    '.dt .run{display:flex;align-items:center;gap:8px;background:var(--deep,#0D2442);color:#fff;border-radius:12px;padding:10px 12px;margin:10px 0;font-weight:700}' +
    '.dt .run i{width:10px;height:10px;border-radius:50%;background:#5ED39B;flex:none}' +
    '.dt .run span{flex:1}' +
    '.dt .run button{border:0;border-radius:8px;padding:6px 12px;font:inherit;font-weight:800;background:#fff;color:#0D2442;cursor:pointer}' +
    '.dt .go{width:100%;margin-top:12px;border:0;border-radius:12px;padding:14px;font:inherit;font-weight:800;background:var(--deep,#0D2442);color:#fff;cursor:pointer}' +
    '.dt .go:disabled{opacity:.45;cursor:default}' +
    '.dt .msg{color:var(--warn-text,#8A3F00);font-size:13px;min-height:1em;margin-top:6px}';

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function mount(el, call, opts) {
    var L = root.DayLogic, o = opts || {}, now = o.now || Date.now;
    if (!L) throw new Error('day-logic.js must load before day-timer.js');
    if (!document.getElementById('dt-css')) { var st = document.createElement('style'); st.id = 'dt-css'; st.textContent = CSS; document.head.appendChild(st); }
    var S = { timer: o.timer || null, job: '', cls: '', busy: false, msg: '' };
    var classes = (o.allClasses || L.CLASSES);

    function label(job, cls) { return job + (cls ? ' ' + cls : ''); }
    function minutes() { return S.timer ? Math.max(0, Math.round((now() - S.timer.startedAt) / 60000)) : 0; }
    function draw() {
      var likely = L.likelyJobs(o.todayClasses || [], o.recent || []);
      var needsCls = !!L.CLASS_JOBS[S.job];
      var h = '<div class="dt">', run = S.timer ? '<div class="run" data-dt="running"><i></i><span>' + esc(label(S.timer.job, S.timer.cls)) + ' · ' + minutes() + ' min</span><button data-dt="stop">Stop</button></div>' : '';
      if (o.bar) { o.bar.innerHTML = run ? '<div class="dt">' + run + '</div>' : ''; o.bar.hidden = !S.timer; } else h += run;   // the day screen keeps the running timer in a bar fixed at the top
      if (!o.noLikely) h += '<h4>Likeliest now</h4><div class="chips">' + likely.map(function (x, i) { return '<button class="likely" data-dt="likely" data-i="' + i + '">' + esc(label(x.job, x.cls)) + '</button>'; }).join('') + '</div>';
      h += '<h4>' + (o.noLikely ? '' : '1. ') + 'What job?</h4><div class="grid">' + L.JOBS.map(function (j) { return '<button data-dt="job" data-v="' + esc(j) + '" aria-pressed="' + (S.job === j) + '">' + esc(j) + '</button>'; }).join('') + '</div>';
      if (needsCls) h += '<h4>' + (o.noLikely ? '' : '2. ') + 'Which class?</h4><div class="chips">' + classes.map(function (c) { return '<button data-dt="cls" data-v="' + esc(c) + '" aria-pressed="' + (S.cls === c) + '">' + esc(c) + '</button>'; }).join('') + '</div>';
      h += '<button class="go" data-dt="start"' + (!S.job || (needsCls && !S.cls) || S.busy ? ' disabled' : '') + '>Start' + (S.job ? ': ' + esc(label(S.job, needsCls ? S.cls : '')) : '') + '</button>';
      h += '<div class="msg" data-dt="msg">' + esc(S.msg) + '</div></div>';
      el.innerHTML = h;
      el._likely = likely;
    }
    function start(job, cls) {
      if (S.busy) return;
      var before = S.timer, at = now();
      S.busy = true; S.msg = '';
      S.timer = { job: job, cls: L.CLASS_JOBS[job] ? cls : '', startedAt: at, source: o.source || 'phone' };   // shown at once
      S.job = ''; S.cls = ''; draw();
      return call('timerStart', job, S.timer.cls, at, o.source || 'phone', '').then(function (r) {
        S.busy = false; if (S.timer && r && r.id) S.timer.id = r.id; draw(); if (o.onChange) o.onChange(S.timer);
      }, function (e) {
        S.busy = false; S.timer = before; S.msg = 'Not started: ' + ((e && e.message) || 'no signal') + '. Try again.'; draw();
      });
    }
    function stop() {
      if (S.busy || !S.timer) return;
      var before = S.timer; S.busy = true; S.timer = null; S.msg = ''; draw();
      return call('timerStop', now()).then(function () { S.busy = false; draw(); if (o.onChange) o.onChange(null); },
        function (e) { S.busy = false; S.timer = before; S.msg = 'Not stopped: ' + ((e && e.message) || 'no signal') + '. Try again.'; draw(); });
    }
    function onClick(e) {
      var b = e.target.closest('[data-dt]'); if (!b || !(el.contains(b) || (o.bar && o.bar.contains(b)))) return;
      var k = b.getAttribute('data-dt');
      if (k === 'likely') { var x = el._likely[+b.getAttribute('data-i')]; if (x) start(x.job, x.cls); }
      else if (k === 'job') { S.job = b.getAttribute('data-v'); if (!L.CLASS_JOBS[S.job]) S.cls = ''; draw(); }
      else if (k === 'cls') { S.cls = b.getAttribute('data-v'); draw(); }
      else if (k === 'start') start(S.job, S.cls);
      else if (k === 'stop') stop();
    }
    el.addEventListener('click', onClick);
    if (o.bar) o.bar.addEventListener('click', onClick);
    var tick = setInterval(function () { if (S.timer && el.isConnected) draw(); else if (!el.isConnected) clearInterval(tick); }, 30000);
    draw();
    return { state: function () { return S; }, set: function (timer) { S.timer = timer; draw(); }, start: start, stop: stop };
  }

  var api = { mount: mount };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DayTimer = api;
})(typeof window !== 'undefined' ? window : this);
