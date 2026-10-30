// The day screen, layout B3 (Lane C; picked 30 Oct 2026, lanes/mockups/day-screen-b2.html, replica/design/grills/day-screen.md).
// B1's navy and gold timeline (lessons as solid blocks in their planner class colour, coloured buttons, the running timer
// as a bar fixed at the top while its Start buttons stay in the page) plus B3's small Ulhu touch on the to-dos: a line in
// his voice above the list, and a gold rune on a ticked to-do.
// DayScreen.mount(element, call, opts). Needs day-logic.js, day-timer.js and day-capture.js loaded first.
//   call(fn, ...args) -> Promise: google.script.run on the planner pages (the page adds the key), API.call in the installed app.
//   opts: { now: () => ms, storage, names: () => [pupil names, only compared], sprites: window.ULHU_ART,
//           source: 'phone'|'pc', bar: element for the running timer (made and fixed to the top of the page if not given),
//           onDone: fn(result) after "Done for today" (the page ticks Ulhu's ritual) }
// Opens at once from the copy kept on this device, then fetches the latest (dayLoad). Every tap shows straight away and
// is put back with a message if the server says no. Nothing here runs by itself after 19:00.
(function (root) {
  'use strict';
  var COPY = 'dayCopy', TICKS = 'dayTicks', GONE = 'dayDismissed', SEEN = 'dayReportSeen';
  var CLASS_COLOURS = { '7MLA': '#1565C0', '8XP': '#2E7D32', '8AG': '#6A1B9A', '9AS': '#C62828', '9XS': '#EF6C00', '10C2': '#00838F',
    '10S2': '#AD1457', '11S2': '#4E342E', '12C': '#283593', '13D': '#558B2F' };
  var RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  // Ulhu's line above the to-dos (B3). Fixed lines, picked by how the day is going; no AI.
  var SAY = {
    over: ['The tide is rising. So is your to-do list.', 'Too much for one tide. Move something to tomorrow.', 'Even the deep cannot hold all of this today.'],
    fits: ['The water is calm. Your list fits the day.', 'A quiet current. You will reach the shore in time.', 'All of it fits. The abyss nods.'],
    clear: ['The deep is quiet. Nothing left to drown.', 'Every task sunk. I am almost proud.'],
    empty: ['Nothing on the list. The abyss approves.'],
    shut: ['The sun sinks. Shut the day, master.'],
    late: ['Past seven. The list can wait for the tide.']
  };

  var VARS_LIGHT = '--navy:#0D1B5E;--gold:#FABB2E;--red:#B71C1C;--green:#1B5E20;--orange:#E65100;--bg:#EDF2FA;--panel:#FFFFFF;--panel2:#F7F9FD;' +
    '--ink:#1A1A2E;--muted:#6B6B7B;--line:#D5DDEC;--chip:#E8EAF6;--head:#0D1B5E;--ghost:rgba(250,187,46,.10);--amber-wash:#FFF0DC;--amber-text:#8A3F00;' +
    '--green-wash:#E3F3E4;--green-text:#1B5E20;';
  var VARS_DARK = '--navy:#0D1B5E;--gold:#FABB2E;--red:#EF5350;--green:#66BB6A;--orange:#FFA726;--bg:#0E1424;--panel:#161E33;--panel2:#1C2540;' +
    '--ink:#E6EAF5;--muted:#98A2BC;--line:#2A3555;--chip:#24305A;--head:#FABB2E;--ghost:rgba(250,187,46,.06);--amber-wash:rgba(255,167,38,.14);' +
    '--amber-text:#FFB95C;--green-wash:rgba(102,187,106,.16);--green-text:#8BD68E;';
  // the timer picker and capture box read the page's own names for colours; inside the day screen they get these
  var ALIASES = '--plate:var(--panel);--deep:var(--navy);--soft:var(--muted);--warn-text:var(--amber-text);--sodium-wash:var(--amber-wash);--sodium-text:var(--amber-text);';
  var CSS = '.ds{' + VARS_LIGHT + ALIASES + Object.keys(CLASS_COLOURS).map(function (c) { return '--c' + c + ':' + CLASS_COLOURS[c] + ';'; }).join('') + '}' +
    'html[data-theme="dark"] .ds{' + VARS_DARK + '}' +
    '@media (prefers-color-scheme: dark){html[data-theme="auto"] .ds,html:not([data-theme]) .ds{' + VARS_DARK + '}}' +
    '.ds{color:var(--ink);font-family:"Century Gothic","Segoe UI",sans-serif;font-size:14px;line-height:1.35}' +
    '.ds-main{background:var(--bg);border-radius:14px;padding:10px 12px 14px}' +
    '.ds .dc .save{background:var(--gold);color:var(--navy);font-weight:800}' +
    '.ds .work{border-radius:8px;padding:6px 6px 6px 10px;min-height:36px;font-weight:700;font-size:13px;margin:8px 0 10px;display:flex;align-items:center;gap:6px}' +
    '.ds .work.over{background:var(--amber-wash);color:var(--amber-text);border:1px solid var(--orange)}' +
    '.ds .work.fits{background:var(--green-wash);color:var(--green-text);border:1px solid var(--green)}' +
    '.ds .ulhu{margin-left:auto;width:44px;height:44px;margin-top:-12px;margin-bottom:-10px;image-rendering:pixelated;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}' +
    '.ds .ulhu.stir{animation:ds-stir 1.4s ease-in-out infinite}' +
    '@keyframes ds-stir{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg) translateY(-3px)}}' +
    '.ds h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--head);margin:14px 0 6px}' +
    '.ds .tl{position:relative;padding-left:48px}' +
    '.ds .tl::before{content:"";position:absolute;left:40px;top:4px;bottom:4px;width:2px;background:var(--line)}' +
    '.ds .slot{position:relative;margin-bottom:6px}' +
    '.ds .when{position:absolute;left:-48px;top:7px;width:34px;font-size:11px;color:var(--muted);text-align:right}' +
    '.ds .pin{position:absolute;left:-12px;top:10px;width:10px;height:10px;border-radius:50%;background:var(--bg);border:2px solid var(--line)}' +
    '.ds .les{border-radius:8px;padding:7px 10px;font-size:13px;display:flex;align-items:center;gap:6px;color:#fff;background:var(--navy)}' +
    '.ds .les b{font-size:14px}.ds .s{flex:1;min-width:0}' +
    '.ds .les .mark{font-weight:800;font-size:13px;border-radius:5px;padding:0 6px;background:rgba(255,255,255,.22);color:#fff}' +
    '.ds .free{border:1px dashed var(--line);border-radius:8px;padding:6px 10px;font-size:13px;color:var(--muted)}' +
    '.ds .ghost{border:2px dashed var(--gold);background:var(--ghost);border-radius:8px;padding:6px 8px 6px 10px;display:flex;align-items:center;gap:6px;font-size:13px}' +
    '.ds .ghost .s{opacity:.9}' +
    '.ds .btn{border:0;border-radius:6px;font:inherit;font-size:12px;font-weight:800;padding:4px 9px;cursor:pointer}' +
    '.ds .btn:disabled{opacity:.5;cursor:default}' +
    '.ds .btn.yes{background:var(--green);color:#fff}' +
    '.ds .btn.no{background:transparent;color:var(--muted);border:1px solid var(--line)}' +
    '.ds .btn.move{background:var(--chip);color:var(--ink);border:1px solid var(--line);font-weight:700}' +
    '.ds .btn.start{background:var(--gold);color:var(--navy)}' +
    '.ds .shut{border-radius:8px;padding:7px 10px;font-size:13px;background:var(--panel2);border:1px solid var(--gold);display:flex;align-items:center;gap:6px}' +
    '.ds .shut.due{box-shadow:0 0 0 3px var(--ghost);border-width:2px}' +
    '.ds .shut.done{border-color:var(--line);color:var(--muted)}' +
    '.ds .startrow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0 4px}' +
    '.ds .startrow .lab{font-size:12px;color:var(--muted);width:100%}' +
    '.ds .startrow .btn{font-size:13px;padding:7px 11px}' +
    '.ds .picker{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:2px 10px 10px;margin:6px 0}' +
    '.ds .say{display:flex;gap:8px;align-items:center;background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:6px 8px;margin-bottom:6px;font-size:12.5px;font-style:italic;color:var(--muted)}' +
    '.ds .say img{width:28px;height:28px;image-rendering:pixelated;flex:none}' +
    '.ds .todo{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:7px 8px;display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13.5px}' +
    '.ds .tick{width:22px;height:22px;border-radius:5px;border:2px solid var(--muted);flex:none;background:transparent;padding:0;cursor:pointer}' +
    '.ds .todo.done{opacity:.6}.ds .todo.done .s{text-decoration:line-through}' +
    '.ds .rune{width:22px;height:22px;border-radius:5px;flex:none;background:var(--gold);color:var(--navy);font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center}' +
    '.ds .tag{font-size:10px;font-weight:700;background:var(--gold);color:var(--navy);border-radius:9px;padding:0 6px;margin-left:4px}' +
    '.ds .cc{font-size:11px;font-weight:800;color:#fff;border-radius:5px;padding:1px 6px;margin-right:4px}' +
    '.ds .more{font:inherit;font-size:12px;color:var(--muted);padding:2px;background:none;border:0;cursor:pointer}' +
    '.ds .rit{display:flex;gap:6px;flex-wrap:wrap}' +
    '.ds .rit button{font:inherit;background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:5px 9px;font-size:12.5px;cursor:pointer}' +
    '.ds .msg{font-size:12.5px;color:var(--amber-text);min-height:1em;margin:4px 0}' +
    '.ds .empty{color:var(--muted);font-size:13px}' +
    '.ds-bar{position:fixed;top:0;left:0;right:0;z-index:30}' +
    '.ds-bar .dt .run{margin:0;border-radius:0;background:linear-gradient(90deg,var(--navy),#1a2d7a);border-bottom:3px solid var(--gold);padding:8px 12px;font-family:"Century Gothic","Segoe UI",sans-serif}' +
    '.ds-bar .dt .run i{background:#7CFFA0;box-shadow:0 0 0 3px rgba(124,255,160,.25);animation:ds-pulse 1.6s ease-in-out infinite}' +
    '.ds-bar .dt .run button{color:var(--navy)}' +
    '@keyframes ds-pulse{50%{box-shadow:0 0 0 6px rgba(124,255,160,0)}}' +
    'body.ds-running{padding-top:46px}' +
    '@media (prefers-reduced-motion: reduce){.ds .ulhu.stir,.ds-bar .dt .run i{animation:none}}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function colour(cls) { return CLASS_COLOURS[cls] ? 'var(--c' + cls + ')' : 'var(--navy)'; }
  function chip(cls) { return cls ? '<span class="cc" style="background:' + colour(cls) + '">' + esc(cls) + '</span>' : ''; }
  function hash(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function rune(id) { var r = Array.from(RUNES); return r[hash(id) % r.length]; }
  function sayLine(kind, day) { var l = SAY[kind] || SAY.fits; return l[hash(day + kind) % l.length]; }
  function iso(d) { var p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function nextSchoolDay(day) { var d = new Date(day + 'T12:00:00'); do d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6); return iso(d); }
  function dayName(day) { return new Date(day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' }); }

  function mount(el, call, opts) {
    var L = root.DayLogic, o = opts || {}, now = o.now || Date.now, store = o.storage || root.localStorage;
    if (!L || !root.DayTimer || !root.DayCapture) throw new Error('day-logic.js, day-timer.js and day-capture.js must load before day-screen.js');
    if (!document.getElementById('ds-css')) { var st = document.createElement('style'); st.id = 'ds-css'; st.textContent = CSS; document.head.appendChild(st); }
    var get = function (k, d) { try { var v = JSON.parse(store.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
    var put = function (k, v) { try { store.setItem(k, JSON.stringify(v)); } catch (e) { /* full or private: the screen still works */ } };
    var today = function () { return iso(new Date(now())); };
    var nowMin = function () { var d = new Date(now()); return d.getHours() * 60 + d.getMinutes(); };
    var daily = function (k) { var v = get(k, null); return v && v.day === today() ? v.list : []; };
    var setDaily = function (k, list) { put(k, { day: today(), list: list }); };

    var S = { load: null, saved: false, failed: false, msg: '', showAll: false, picker: false, busy: {} };
    var copy = get(COPY, null);
    if (copy && copy.day === today() && copy.d) { S.load = copy.d; S.saved = true; }

    el.innerHTML = '<div class="ds ds-main"><div data-ds="cap"></div><div data-ds="top"></div>' +
      '<div class="picker" data-ds="picker" hidden></div><div data-ds="list"></div><div data-ds="rpt" hidden></div></div>';
    var bar = o.bar;
    if (!bar) { bar = document.createElement('div'); document.body.appendChild(bar); }
    bar.classList.add('ds', 'ds-bar'); bar.hidden = true;
    // the page makes room for the bar whenever it shows, whoever showed it (a start, a stop, a failed start put back)
    if (root.MutationObserver) new root.MutationObserver(function () { document.body.classList.toggle('ds-running', !bar.hidden); }).observe(bar, { attributes: true, attributeFilter: ['hidden'] });
    var q = function (k) { return el.querySelector('[data-ds="' + k + '"]'); };
    var sprite = function (size, mood) { var a = o.sprites || root.ULHU_ART; return a && a[size] && a[size][mood] ? a[size][mood] : ''; };

    var dc = root.DayCapture.mount(q('cap'), call, { names: o.names, inbox: (S.load && S.load.inbox) || [], storage: store });
    var dt = root.DayTimer.mount(q('picker'), call, { bar: bar, noLikely: true, source: o.source || 'phone', now: now, timer: S.load && S.load.timer,
      todayClasses: classesToday(), recent: (S.load && S.load.recent) || [], onChange: function () { S.picker = false; draw(); } });

    function classesToday() { return ((S.load && S.load.lessons) || []).map(function (l) { return l.cls; }).filter(function (c, i, a) { return c && a.indexOf(c) === i; }); }
    function model() { return L.dayModel(S.load || { day: today() }, nowMin(), daily(GONE)); }

    function lessonRow(r) {
      var mark = r.built ? '✓ built' : r.planned === false ? '?' : r.built === false ? 'to build' : '';
      var title = r.title || (r.planned === false ? 'not planned' : '');
      return '<div class="les" style="background:' + colour(r.cls) + '"><b>' + esc(r.cls) + '</b><span class="s">' + esc(title) + '</span>' +
        (r.kind && r.kind !== 'lesson' ? '<span class="mark">' + esc(r.kind) + '</span>' : '') + (mark ? '<span class="mark">' + esc(mark) + '</span>' : '') + '</div>';
    }
    function ghostRow(g) {
      return '<div class="ghost" data-todo="' + esc(g.todoId) + '"><span class="s">' + esc(g.text) + ' · ' + esc(g.minutes) + ' min</span>' +
        '<button class="btn yes" data-ds="yes"' + (S.busy[g.todoId] ? ' disabled' : '') + '>Yes</button><button class="btn no" data-ds="no" aria-label="Not today">✕</button></div>';
    }
    function slot(at, inner, cls) { return '<div class="slot"><span class="when">' + esc(at) + '</span><span class="pin"' + (cls ? ' style="border-color:' + colour(cls) + ';background:' + colour(cls) + '"' : '') + '></span>' + inner + '</div>'; }

    function drawTop(m) {
      var h = '';
      if (S.saved) h += '<p class="msg" data-ds="saved">Saved copy: getting the latest...</p>';
      if (S.failed && !S.load) return q('top').innerHTML = '<p class="msg">Could not load the day. <button class="btn move" data-ds="retry">Try again</button></p>';
      var w = m.workload, stir = m.mood === 'stir', img = sprite('b16', stir ? 'idle' : 'happy');
      h += '<div class="work ' + (w.fits ? 'fits' : 'over') + '" data-ds="work">' + (w.fits ? '✓ ' : '⚠ ') + esc(w.text) +
        (img ? '<img class="ulhu' + (stir ? ' stir' : '') + '" src="' + img + '" alt="Ulhu, ' + (stir ? 'stirring because the day is over' : 'calm because the day fits') + '">' : '') + '</div>';
      h += '<div class="tl">' + m.rows.map(function (r) {
        if (r.type === 'lesson') return slot(r.at, lessonRow(r), r.cls);
        if (r.type === 'free') return r.ghosts.length ? r.ghosts.map(function (g) { return slot(g.start, ghostRow(g)); }).join('') : slot(r.at, '<div class="free">P' + esc(r.period) + ' free</div>');
        if (r.type === 'after') return r.ghosts.length ? r.ghosts.map(function (g) { return slot(g.start, ghostRow(g)); }).join('') : slot(r.at, '<div class="free">After school</div>');
        if (r.done) return slot(r.at, '<div class="shut done" data-ds="shut"><span class="s">Shut down ✓ Done for today</span></div>');
        return slot(r.at, '<div class="shut' + (m.shutdownDue ? ' due' : '') + '" data-ds="shut"><span class="s">Shut down</span><button class="btn start" data-ds="done"' + (S.busy.done ? ' disabled' : '') + '>Done for today</button></div>');
      }).join('') + '</div>';
      h += '<div class="startrow"><span class="lab">Start the timer</span>' + m.likely.map(function (x, i) {
        var style = L.CLASS_JOBS[x.job] && CLASS_COLOURS[x.cls] ? ' style="background:' + colour(x.cls) + ';color:#fff"' : '';
        return '<button class="btn start" data-ds="go" data-i="' + i + '"' + style + '>▶ ' + esc(x.job + (x.cls ? ' ' + x.cls : '')) + '</button>';
      }).join('') + '<button class="btn move" data-ds="pick" aria-expanded="' + S.picker + '">More...</button></div>';
      h += '<p class="msg" data-ds="msg">' + esc(S.msg) + '</p>';
      q('top').innerHTML = h;
      q('top')._likely = m.likely;
    }
    function drawList(m) {
      var ticks = daily(TICKS), ticked = {}, rituals = m.todos.all.filter(function (t) { return t.kind === 'ritual'; });
      ticks.forEach(function (t) { ticked[t.id] = 1; });   // a tick shows once, even if a copy is behind
      var open = m.todos.all.filter(function (t) { return t.kind !== 'ritual' && !ticked[t.id]; }), shown = S.showAll ? open : open.slice(0, 7);
      var kind = nowMin() >= 19 * 60 ? 'late' : m.shutdownDue ? 'shut' : !open.length ? (ticks.length ? 'clear' : 'empty') : m.workload.fits ? 'fits' : 'over';
      var b8 = sprite('b8', kind === 'over' ? 'sad' : kind === 'late' ? 'sleepy' : kind === 'clear' ? 'proud' : 'idle') || sprite('b8', 'idle');
      var h = '<h3>To do</h3><div class="say" data-ds="say">' + (b8 ? '<img src="' + b8 + '" alt="">' : '') + '<span>' + esc(sayLine(kind, today())) + '</span></div>';
      h += ticks.map(function (t) {
        return '<div class="todo done" data-todo="' + esc(t.id) + '"><span class="rune" title="Ticked">' + rune(t.id) + '</span><span class="s">' + chip(t.cls) + esc(t.text) + '</span></div>';
      }).join('');
      h += shown.map(function (t) {
        return '<div class="todo" data-todo="' + esc(t.id) + '"><button class="tick" data-ds="tick" aria-label="Tick: ' + esc(t.text) + '"></button><span class="s">' + chip(t.cls) + esc(t.text) +
          (t.yesterday ? '<span class="tag">yesterday</span>' : '') + (t.at ? '<span class="tag">' + esc(t.at) + '</span>' : '') + '</span><button class="btn move" data-ds="move">Move</button></div>';
      }).join('');
      if (!open.length && !ticks.length) h += '<p class="empty">Nothing to do yet.</p>';
      if (open.length > shown.length) h += '<button class="more" data-ds="all">+ ' + (open.length - shown.length) + ' more</button>';
      // the fortnightly timer report (3.10): a card on a Friday when it has not been opened for 13 days, a quiet link otherwise
      var seen = get(SEEN, ''), friday = new Date(now()).getDay() === 5;
      var due = friday && (!seen || (new Date(today() + 'T12:00:00') - new Date(seen + 'T12:00:00')) / 864e5 >= 13);
      var rep = due ? '<div class="shut due" data-ds="repcard"><span class="s">Your fortnight: where the hours went</span><button class="btn start" data-ds="report">Open</button></div>'
        : '<button class="more" data-ds="report">Timer report</button>';
      if (rituals.length) h += '<h3>Rituals</h3><div class="rit">' + rituals.map(function (t) { return '<button data-ds="tick" data-todo="' + esc(t.id) + '">' + esc(t.text) + '</button>'; }).join('') + '</div>';
      q('list').innerHTML = h + '<div style="margin-top:12px">' + rep + '</div>';
    }
    // the report replaces the day's parts until "← Day"
    var rpt = null;
    function showReport(on) {
      ['cap', 'top', 'list'].forEach(function (k) { q(k).hidden = on; });
      if (on) { S.picker = false; q('picker').hidden = true; }
      q('rpt').hidden = !on;
      if (!on) return draw();
      put(SEEN, today());
      if (!root.DayReport) { q('rpt').innerHTML = '<p class="msg">The timer report is not in this copy yet. <button class="btn move" data-ds="unreport">← Day</button></p>'; return; }
      if (!rpt) rpt = root.DayReport.mount(q('rpt'), call, { now: now, storage: store, sprites: o.sprites, onBack: function () { showReport(false); } });
      else rpt.reload();
    }
    function draw() {
      var m = model();
      q('picker').hidden = !S.picker;
      drawTop(m); drawList(m);
      document.body.classList.toggle('ds-running', !bar.hidden);
      return m;
    }

    function took(load) {
      S.load = load; S.saved = false; S.failed = false;
      put(COPY, { day: today(), d: load });
      dc.setInbox(load.inbox || []);
      dt.set(load.timer || null);
      draw();
    }
    function reload() {
      return call('dayLoad', today()).then(took, function (e) {
        S.failed = true; S.msg = S.load ? 'No connection: showing the saved copy.' : ''; draw();
      });
    }
    function itemOf(id) { return ((S.load && S.load.items) || []).find(function (x) { return x.id === id; }); }
    function takeOut(id) { if (S.load) S.load.items = (S.load.items || []).filter(function (x) { return x.id !== id; }); }
    function putBack(item) { if (S.load && item) S.load.items = (S.load.items || []).concat([item]); }
    function fail(what) { return function (e) { S.msg = what + ': ' + ((e && e.message) || 'no signal') + '. Try again.'; draw(); }; }

    function tick(id) {
      var it = itemOf(id); if (!it) return Promise.resolve();
      takeOut(id); setDaily(TICKS, daily(TICKS).concat([{ id: id, text: it.text, cls: it.cls || '' }])); S.msg = ''; draw();
      return call('todoSet', id, 'done').then(function () { put(COPY, { day: today(), d: S.load }); }, function (e) {
        setDaily(TICKS, daily(TICKS).filter(function (t) { return t.id !== id; })); putBack(it); fail('Not ticked')(e);
      });
    }
    function move(id) {
      var it = itemOf(id); if (!it) return Promise.resolve();
      var to = nextSchoolDay(today());
      takeOut(id); S.msg = 'Moved to ' + dayName(to) + '.'; draw();
      return call('todoSet', id, 'moved', to).then(function () { put(COPY, { day: today(), d: S.load }); }, function (e) { putBack(it); fail('Not moved')(e); });
    }
    function accept(todoId) {
      var m = model(), g = null;
      m.rows.forEach(function (r) { (r.ghosts || []).forEach(function (x) { if (x.todoId === todoId) g = x; }); });
      if (!g) return Promise.resolve();
      var it = itemOf(todoId) || {};
      S.busy[todoId] = true; draw();
      return call('blockAccept', { todoId: todoId, text: g.text, cls: it.cls || '', minutes: g.minutes, start: g.start }).then(function () {
        delete S.busy[todoId]; S.msg = 'Booked for ' + g.start + '.'; return reload();
      }, function (e) { delete S.busy[todoId]; fail('Not booked')(e); });
    }
    function dismiss(todoId) { setDaily(GONE, daily(GONE).concat([todoId])); draw(); }
    function doneForToday() {
      S.busy.done = true; draw();
      return call('doneForToday', now()).then(function (r) {
        delete S.busy.done; if (S.load) S.load.doneForToday = true; S.load && (S.load.timer = null); dt.set(null);
        put(COPY, { day: today(), d: S.load }); draw();
        if (o.onDone) o.onDone(r);
      }, function (e) { delete S.busy.done; fail('Not shut down')(e); });
    }

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ds]'); if (!b || !el.contains(b)) return;
      var k = b.getAttribute('data-ds'), row = b.closest('[data-todo]'), id = row && row.getAttribute('data-todo');
      if (k === 'tick') tick(id);
      else if (k === 'move') move(id);
      else if (k === 'yes') accept(id);
      else if (k === 'no') dismiss(id);
      else if (k === 'done') doneForToday();
      else if (k === 'all') { S.showAll = true; draw(); }
      else if (k === 'pick') { S.picker = !S.picker; draw(); }
      else if (k === 'retry') reload();
      else if (k === 'report') showReport(true);
      else if (k === 'unreport') showReport(false);
      else if (k === 'go') { var x = (q('top')._likely || [])[+b.getAttribute('data-i')]; if (x) dt.start(x.job, x.cls); }
    });
    var every = setInterval(function () { if (!el.isConnected) return clearInterval(every); draw(); }, 60000);   // the timeline and Ulhu follow the clock

    draw();
    reload();
    return { reload: reload, draw: draw, state: function () { return S; }, model: model, timer: dt, capture: dc, bar: bar,
      tick: tick, move: move, accept: accept, dismiss: dismiss, doneForToday: doneForToday, report: showReport };
  }

  var api = { mount: mount, CLASS_COLOURS: CLASS_COLOURS, SAY: SAY };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DayScreen = api;
})(typeof window !== 'undefined' ? window : this);
