// The fortnightly timer report (installed-app design 3.10), layout A "the ledger" (lanes/mockups/timer-report.html;
// the test default until Patryk picks). Opened from the Day screen. The last 14 days of the Timer tab:
//   - Ulhu's one line: the biggest drain that is not Personal, the one to automate next (DayLogic.report, a fixed rule);
//   - hours per job and per class, biggest first;
//   - the "maybe" rows to check (the PC timer's "Not that", a phone timer stopped after 2 hours), one line per day, job,
//     class and source, so a day of PC syncs is one line: Right keeps them, Change gives another job (and class).
// It draws the copy saved last time at once, then the fresh one. A tap shows at once and is put back if it fails.
// DayReport.mount(el, call, { now, storage, sprites, classes, onBack }) -> { reload, state }
(function (root) {
  'use strict';
  var KEEP = 'dayReport';
  var JOB_COLOURS = { 'Marking': '#C62828', 'Building lessons': '#1565C0', 'Emails': '#EF6C00', 'Admin': '#6A1B9A', 'Setting homework': '#00838F', 'Personal': '#90A4AE' };
  var CSS = '.ds .dr-top{display:flex;align-items:center;gap:8px;margin-bottom:8px}' +
    '.ds .dr-top b{flex:1;font-size:16px;color:var(--head)}.ds .dr-top span{font-size:12px;color:var(--muted)}' +
    '.ds .dr-say{display:flex;gap:10px;align-items:center;background:var(--amber-wash);color:var(--amber-text);border-radius:10px;padding:8px 10px;font-weight:700;font-size:13.5px}' +
    '.ds .dr-say img{width:32px;height:32px;image-rendering:pixelated;flex:none}' +
    '.ds .dr-card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 10px}' +
    '.ds .hb{display:grid;grid-template-columns:118px 1fr 46px;gap:8px;align-items:center;font-size:13px;margin:5px 0}' +
    '.ds .hb .t{height:13px;border-radius:7px;background:var(--line);overflow:hidden}.ds .hb .t i{display:block;height:100%;border-radius:7px}' +
    '.ds .hb b{text-align:right}' +
    '.ds .mb{display:flex;align-items:center;gap:6px;font-size:13px;padding:7px 0;border-top:1px solid var(--line);flex-wrap:wrap}' +
    '.ds .mb:first-child{border-top:0}.ds .mb .s small{display:block;color:var(--muted);font-size:11.5px}' +
    '.ds .mb .alt{width:100%;display:flex;flex-wrap:wrap;gap:5px;padding-top:4px}' +
    '.ds .mb .alt button{font:inherit;font-size:12px;border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:7px;padding:4px 8px;cursor:pointer}' +
    '.ds .mb .alt button[aria-pressed="true"]{background:var(--gold);color:var(--navy);border-color:var(--gold);font-weight:800}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function iso(d) { var p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function back(day, n) { var d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() - n); return iso(d); }
  function short(day) { return new Date(day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function hours(min) { return (Math.round(min / 6) / 10) + ' h'; }

  // the maybe rows grouped: one line per day, job, class and source (a day of PC syncs is many small rows)
  function maybeGroups(rows) {
    var by = {}, out = [];
    rows.forEach(function (r) {
      if (!r.maybe) return;
      var key = r.day + '|' + r.job + '|' + (r.cls || '') + '|' + (r.source || '');
      if (!by[key]) { by[key] = { key: key, day: r.day, job: r.job, cls: r.cls || '', source: r.source || '', minutes: 0, ids: [] }; out.push(by[key]); }
      by[key].minutes += r.minutes || 0; by[key].ids.push(r.id);
    });
    return out.sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : b.minutes - a.minutes; });
  }
  function why(g) { return g.source === 'pc' ? 'PC: you said "Not that"' : g.source === 'phone' ? 'the phone timer stopped itself after 2 hours' : 'marked maybe'; }

  function mount(el, call, opts) {
    var L = root.DayLogic, o = opts || {}, now = o.now || Date.now, store = o.storage || root.localStorage;
    if (!L) throw new Error('day-logic.js must load before day-report.js');
    if (!document.getElementById('dr-css')) { var st = document.createElement('style'); st.id = 'dr-css'; st.textContent = CSS; document.head.appendChild(st); }
    var get = function () { try { return JSON.parse(store.getItem(KEEP) || 'null'); } catch (e) { return null; } };
    var put = function (v) { try { store.setItem(KEEP, JSON.stringify(v)); } catch (e) { /* the screen still works */ } };
    var to = iso(new Date(now())), from = back(to, 13);
    var S = { rows: null, saved: false, failed: false, msg: '', open: null, pick: {}, busy: {} };
    var kept = get();
    if (kept && kept.to === to && kept.rows) { S.rows = kept.rows; S.saved = true; }
    var classes = (o.classes || Object.keys((root.DayScreen && root.DayScreen.CLASS_COLOURS) || {}));
    var cc = function (cls) { var c = root.DayScreen && root.DayScreen.CLASS_COLOURS[cls]; return c || 'var(--navy)'; };
    var sprite = function () { var a = o.sprites || root.ULHU_ART; return a && a.b8 && (a.b8.proud || a.b8.idle) || ''; };

    function bars(list, colour) {
      if (!list.length) return '<p class="empty">Nothing yet.</p>';
      var max = list[0].minutes || 1;
      return list.map(function (x) {
        return '<div class="hb"><span>' + esc(x.name) + '</span><span class="t"><i style="width:' + Math.max(2, Math.round(x.minutes / max * 100)) + '%;background:' + colour(x.name) + '"></i></span><b>' + esc(hours(x.minutes)) + '</b></div>';
      }).join('');
    }
    function maybeLine(g) {
      var p = S.pick[g.key] || { job: g.job, cls: g.cls }, open = S.open === g.key, busy = S.busy[g.key] ? ' disabled' : '';
      var h = '<div class="mb" data-g="' + esc(g.key) + '"><span class="s" style="flex:1"><b>' + esc(short(g.day)) + '</b> ' + esc(g.job) + (g.cls ? ' ' + esc(g.cls) : '') + ', ' + esc(g.minutes) + ' min' +
        '<small>' + esc(why(g)) + '</small></span><button class="btn yes" data-dr="right"' + busy + '>Right</button><button class="btn move" data-dr="change" aria-expanded="' + open + '">Change</button>';
      if (open) {
        h += '<div class="alt">' + Object.keys(JOB_COLOURS).map(function (j) { return '<button data-dr="job" data-v="' + esc(j) + '" aria-pressed="' + (p.job === j) + '">' + esc(j) + '</button>'; }).join('') + '</div>';
        if (L.CLASS_JOBS[p.job]) h += '<div class="alt">' + classes.map(function (c) { return '<button data-dr="cls" data-v="' + esc(c) + '" aria-pressed="' + (p.cls === c) + '">' + esc(c) + '</button>'; }).join('') + '</div>';
        h += '<div class="alt"><button class="btn start" data-dr="save"' + busy + (L.CLASS_JOBS[p.job] && !p.cls ? ' disabled' : '') + '>Save</button></div>';
      }
      return h + '</div>';
    }
    function draw() {
      var h = '<div class="dr-top"><button class="btn move" data-dr="back">← Day</button><b>Timer report</b><span>' + esc(short(from)) + ' to ' + esc(short(to)) + '</span></div>';
      if (S.saved) h += '<p class="msg">Saved copy: getting the latest...</p>';
      if (!S.rows) { el.innerHTML = h + (S.failed ? '<p class="msg">Could not load the report. <button class="btn move" data-dr="retry">Try again</button></p>' : '<p class="empty">Getting the last two weeks...</p>'); return; }
      var r = L.report(S.rows), groups = maybeGroups(S.rows), img = sprite();
      h += '<div class="dr-say" data-dr-say>' + (img ? '<img src="' + img + '" alt="">' : '') + '<span>' + esc(S.rows.length ? r.suggestion : 'Nothing logged in the last two weeks yet. The timer fills this in.') + '</span></div>';
      h += '<h3>Hours per job</h3><div class="dr-card" data-dr-jobs>' + bars(r.jobs, function (n) { return JOB_COLOURS[n] || 'var(--navy)'; }) + '</div>';
      h += '<h3>Hours per class</h3><div class="dr-card" data-dr-cls>' + bars(r.classes, cc) + '</div>';
      if (groups.length) h += '<h3>' + groups.length + ' to check (marked "maybe")</h3><div class="dr-card" data-dr-maybe>' + groups.map(maybeLine).join('') + '</div>';
      h += '<p class="msg" data-dr-msg>' + esc(S.msg) + '</p>';
      el.innerHTML = h;
    }
    function reload() {
      return call('timerReport', from, to).then(function (rows) {
        S.rows = rows || []; S.saved = false; S.failed = false; put({ to: to, rows: S.rows }); draw();
      }, function () { S.failed = true; S.msg = S.rows ? 'No connection: showing the saved copy.' : ''; S.saved = false; draw(); });
    }
    function groupOf(key) { return maybeGroups(S.rows || []).find(function (g) { return g.key === key; }); }
    function fix(key, fields) {
      var g = groupOf(key); if (!g) return Promise.resolve();
      var before = S.rows.map(function (x) { return Object.assign({}, x); });
      S.rows.forEach(function (x) { if (g.ids.indexOf(x.id) >= 0) { x.maybe = false; if (fields.job) { x.job = fields.job; x.cls = fields.cls || ''; } } });
      S.busy[key] = true; S.open = null; S.msg = ''; draw();
      return call('timerEdit', g.ids, fields).then(function () { delete S.busy[key]; put({ to: to, rows: S.rows }); draw(); }, function (e) {
        delete S.busy[key]; S.rows = before; S.msg = 'Not saved: ' + ((e && e.message) || 'no signal') + '. Try again.'; draw();
      });
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dr]'); if (!b || !el.contains(b) || b.disabled) return;
      var k = b.getAttribute('data-dr'), line = b.closest('[data-g]'), key = line && line.getAttribute('data-g'), g = key && groupOf(key);
      if (k === 'back') { if (o.onBack) o.onBack(); }
      else if (k === 'retry') reload();
      else if (k === 'right') fix(key, { maybe: false });
      else if (k === 'change') { S.open = S.open === key ? null : key; if (g && !S.pick[key]) S.pick[key] = { job: g.job, cls: g.cls }; draw(); }
      else if (k === 'job') { S.pick[key].job = b.getAttribute('data-v'); if (!L.CLASS_JOBS[S.pick[key].job]) S.pick[key].cls = ''; draw(); }
      else if (k === 'cls') { S.pick[key].cls = b.getAttribute('data-v'); draw(); }
      else if (k === 'save') { var p = S.pick[key]; fix(key, { job: p.job, cls: L.CLASS_JOBS[p.job] ? p.cls : '' }); }
    });
    draw();
    reload();
    return { reload: reload, draw: draw, state: function () { return S; } };
  }

  var api = { mount: mount, maybeGroups: maybeGroups, JOB_COLOURS: JOB_COLOURS };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DayReport = api;
})(typeof window !== 'undefined' ? window : this);
