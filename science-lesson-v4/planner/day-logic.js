// The day screen's and the evening timer's rules (Lane C; lanes/design-installed-app.md 3.2, 3.9 to 3.11, 8;
// replica/design/grills/day-screen.md and evening-timer.md). Plain fixed rules, no AI, no server calls, no pupil data
// kept: names passed in (to keep pupil captures out of Obsidian) are only compared, never stored or returned.
// Used by the planner pages, the installed app and the tests (window.DayLogic in a page, require() in node).
(function (root) {
  'use strict';
  var CLASSES = ['7MLA', '8XP', '8AG', '9AS', '9XS', '10C2', '10S2', '11S2', '12C', '13D'];
  var JOBS = ['Marking', 'Building lessons', 'Setting homework', 'Admin', 'Emails', 'Personal'];
  var CLASS_JOBS = { 'Marking': 1, 'Building lessons': 1, 'Setting homework': 1 };   // jobs that carry a class
  var MINUTES = { mark: 60, chase: 5, build: 40, ritualBooks: 120, review: 40, own: 15, capture: 10 };   // defaults, editable
  var LATEST = 19 * 60;   // nothing after 19:00 ever counts or nudges

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var mins = function (hhmm) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim()); return m ? +m[1] * 60 + +m[2] : null; };
  var hhmm = function (m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };

  // ------------------------------------------------------------------ quick capture (3.11)
  var ORDER_WORDS = /\b(beakers?|bunsens?|order|technician|kit|prep|equipment|trolley)\b/i;
  var PUPIL_WORDS = /\b(pupils?|students?|parents?|email home|chase|detention|behaviour|report card)\b/i;
  var LESSON_REF = /\b(?:L|lesson\s*)(\d{1,2})\b/i;
  function findClass(text) {
    var t = String(text || '');
    for (var i = 0; i < CLASSES.length; i++) if (new RegExp('(^|[^A-Za-z0-9])' + CLASSES[i] + '(?![A-Za-z0-9])', 'i').test(t)) return CLASSES[i];
    return '';
  }
  // Suggests a home for a capture. names: optional list of pupil names (first names or full) known on this device.
  // Order: anything about a pupil stays in the planner as a to-do (never Obsidian); then order words; then a lesson
  // ("L4" or "lesson 4" with a class); then a class; everything else goes to Obsidian.
  function sortCapture(text, names) {
    var t = String(text || '').trim(), cls = findClass(t);
    var lower = ' ' + t.toLowerCase().replace(/[^a-z0-9' -]+/g, ' ') + ' ';
    var named = (names || []).some(function (n) {
      var parts = String(n || '').toLowerCase().split(/\s+/).filter(function (p) { return p.length > 2; });
      return parts.some(function (p) { return lower.indexOf(' ' + p + ' ') >= 0; });
    });
    if (named || PUPIL_WORDS.test(t)) return { home: 'todo', cls: cls, why: 'about a pupil: stays in the planner' };
    if (ORDER_WORDS.test(t)) return { home: 'orderSheet', cls: cls, why: 'order words' };
    var L = LESSON_REF.exec(t);
    if (cls && L) return { home: 'lesson', cls: cls, lesson: +L[1], why: cls + ' lesson ' + L[1] };
    if (cls) return { home: 'class', cls: cls, why: 'mentions ' + cls };
    return { home: 'obsidian', cls: '', why: 'everything else' };
  }

  // ------------------------------------------------------------------ the calendar
  // cal = { terms: [[start, end], ...], inset: ['yyyy-mm-dd', ...] } (planner-data.json)
  function isSchoolDay(d, cal) {
    var wd = d.getDay(); if (wd === 0 || wd === 6) return false;
    var day = iso(d);
    if ((cal.inset || []).indexOf(day) >= 0) return false;
    return (cal.terms || []).some(function (t) { return day >= t[0] && day <= t[1]; });
  }
  // the one morning message: 07:00 on school days only
  function morningMessageDue(now, cal) { return isSchoolDay(now, cal) && now.getHours() === 7; }
  function afterSeven(now) { return now.getHours() * 60 + now.getMinutes() >= LATEST; }

  // ------------------------------------------------------------------ today's periods
  // slots: today's timetable entries [{ period, cls }]; periodTimes: planner-data periodTimes { ks3: {P1: '09:00-10:00'}, ks4: {...} }.
  // A lesson uses KS4 times for Year 10 and up, KS3 times otherwise; a free period uses KS3 times (chosen here).
  function periodsToday(slots, periodTimes) {
    var out = [];
    var ksOf = function (cls) { return /^(1[0-3])/.test(cls || '') ? 'ks4' : 'ks3'; };
    var names = Object.keys(periodTimes.ks3 || {}).filter(function (k) { return /^P\d$/.test(k); });
    names.forEach(function (P) {
      var n = +P.slice(1), s = (slots || []).find(function (x) { return x.period === n; });
      var span = String((periodTimes[s ? ksOf(s.cls) : 'ks3'] || {})[P] || '').split('-');
      out.push({ period: n, cls: s ? s.cls : '', start: mins(span[0]), end: mins(span[1]) });
    });
    return out;
  }
  // free minutes left today: free periods not yet over, plus the after-school window (last lesson's end to endAt,
  // never past 19:00). now in minutes since midnight.
  function timeAvailable(periods, now, endAt) {
    var end = Math.min(mins(endAt || '17:00'), LATEST);
    var frees = periods.filter(function (p) { return !p.cls && p.end > now; }).map(function (p) { return { period: p.period, start: Math.max(p.start, now), end: p.end }; });
    var lastEnd = periods.reduce(function (m, p) { return Math.max(m, p.end || 0); }, 0);
    var after = { start: Math.max(lastEnd, now), end: end };
    var freeMin = frees.reduce(function (s, f) { return s + (f.end - f.start); }, 0);
    var afterMin = Math.max(0, after.end - after.start);
    return { frees: frees, after: after, freeMin: freeMin, afterMin: afterMin, total: freeMin + afterMin };
  }

  // ------------------------------------------------------------------ to-dos (3.2 point 4)
  // Each source item: { id, kind: build|mark|review|chase|ritual|own|capture, text, due: 'yyyy-mm-dd', cls, minutes, since }.
  // since: the day it first appeared (older than today gets the "yesterday" tag). dropped: ids hidden today.
  var URGENCY = { build: 0, mark: 1, review: 2, chase: 3, ritual: 4, capture: 5, own: 5 };
  function buildTodos(items, today, dropped, minutesFor) {
    var dset = {}; (dropped || []).forEach(function (id) { dset[id] = 1; });
    var m = Object.assign({}, MINUTES, minutesFor || {});
    var list = (items || []).filter(function (x) { return x && !dset[x.id] && (!x.due || x.due <= addDay(today, 2)); }).map(function (x) {
      var y = Object.assign({}, x);
      if (y.minutes == null) y.minutes = y.kind === 'chase' ? m.chase * (y.count || 1) : y.kind === 'ritual' && /book/i.test(y.text) ? m.ritualBooks : (m[y.kind] != null ? m[y.kind] : m.own);
      y.yesterday = !!(y.since && y.since < today);
      return y;
    });
    // most urgent first: overdue and due today before later, then by kind, then oldest
    list.sort(function (a, b) {
      var da = a.due || today, db = b.due || today;
      if (da !== db) return da < db ? -1 : 1;
      var ua = a.kind in URGENCY ? URGENCY[a.kind] : 9, ub = b.kind in URGENCY ? URGENCY[b.kind] : 9;
      if (ua !== ub) return ua - ub;
      return String(a.since || '').localeCompare(String(b.since || ''));
    });
    return { shown: list.slice(0, 7), more: list.slice(7), all: list };
  }
  function addDay(day, n) { var d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }

  // the workload line: green "Fits" or amber "Over by N min"
  function workload(todos, available) {
    var need = todos.filter(function (t) { return t.kind !== 'ritual'; }).reduce(function (s, t) { return s + (t.minutes || 0); }, 0);
    var over = need - available;
    return over > 0 ? { fits: false, over: over, need: need, text: 'Over by ' + over + ' min' } : { fits: true, over: 0, need: need, text: 'Fits' };
  }

  // ghost blocks (3.2 point 5): free periods get marking, tests and chasing; lesson builds only after school.
  // Most urgent first; a block goes where it fits whole. Nothing is saved until he accepts one.
  function ghostBlocks(todos, avail) {
    var FREE_KINDS = { mark: 1, review: 1, chase: 1 };
    var slots = avail.frees.map(function (f) { return { where: 'P' + f.period, left: f.end - f.start, start: f.start }; });
    if (avail.afterMin > 0) slots.push({ where: 'after', left: avail.afterMin, start: avail.after.start, after: true });
    var out = [];
    todos.forEach(function (t) {
      if (t.kind === 'ritual' || t.planned) return;
      var ok = FREE_KINDS[t.kind] ? slots : t.kind === 'build' ? slots.filter(function (s) { return s.after; }) : slots.filter(function (s) { return s.after; });
      var s = ok.find(function (x) { return x.left >= t.minutes; });
      if (!s) return;
      out.push({ todoId: t.id, where: s.where, start: hhmm(s.start + (s.used || 0)), minutes: t.minutes, text: t.text });
      s.left -= t.minutes; s.used = (s.used || 0) + t.minutes;
    });
    return out;
  }
  // Ulhu: calm when the list fits, stirs when over
  function ulhuMood(load) { return load.fits ? 'calm' : 'stir'; }

  // ------------------------------------------------------------------ evening timer (3.9, 8)
  // rules: [{ pattern, job, cls, enabled }] (the Timer Rules tab). Window titles are only read here, never returned.
  var DEFAULT_RULES = [
    { pattern: 'gmail', job: 'Emails' }, { pattern: 'outlook', job: 'Emails' },
    { pattern: 'powerpnt', job: 'Building lessons' }, { pattern: 'powerpoint', job: 'Building lessons' }, { pattern: '.pptx', job: 'Building lessons' },
    { pattern: 'winword', job: 'Building lessons' }, { pattern: '.docx', job: 'Building lessons' },
    { pattern: 'lessons', job: 'Building lessons' }, { pattern: 'planner', job: 'Admin' }, { pattern: 'arbor', job: 'Admin' },
    { pattern: 'order sheet', job: 'Admin' }, { pattern: 'classroom.google', job: 'Setting homework' }, { pattern: 'google classroom', job: 'Setting homework' },
    { pattern: 'forms', job: 'Setting homework' }
  ];
  function mapWindow(app, title, rules) {
    var hay = (String(app || '') + ' ' + String(title || '')).toLowerCase();
    var list = (rules && rules.length ? rules : DEFAULT_RULES).filter(function (r) { return r.enabled !== false && r.pattern; });
    var hit = list.find(function (r) { return hay.indexOf(String(r.pattern).toLowerCase()) >= 0; });
    var job = hit ? hit.job : 'Personal';
    var cls = CLASS_JOBS[job] ? (hit.cls || findClass(title)) : '';
    return { job: job, cls: cls };
  }
  // ActivityWatch-style events [{ start: ms, duration: s, app, title, afk }] -> totals per job and class (minutes).
  // Idle time (afk) does not count. Only { job, cls, minutes } leaves; titles never do.
  function totals(events, rules) {
    var acc = {};
    (events || []).forEach(function (e) {
      if (e.afk) return;
      var m = mapWindow(e.app, e.title, rules), k = m.job + '|' + m.cls;
      acc[k] = (acc[k] || 0) + (e.duration || 0);
    });
    return Object.keys(acc).map(function (k) { var p = k.split('|'); return { job: p[0], cls: p[1], minutes: Math.round(acc[k] / 60) }; })
      .filter(function (r) { return r.minutes > 0; });
  }
  // a running phone timer left on: stops after 2 hours, flagged "maybe"
  function capRunning(row, nowMs) {
    if (!row || row.endedAt) return row;
    var limit = row.startedAt + 2 * 3600 * 1000;
    if (nowMs < limit) return row;
    return Object.assign({}, row, { endedAt: limit, minutes: 120, maybe: true });
  }
  // the 3 likeliest jobs now: today's classes (marking, building, homework), most recent use first
  function likelyJobs(todayClasses, recent) {
    var seen = {}, out = [];
    var add = function (job, cls) { var k = job + '|' + (cls || ''); if (!seen[k] && out.length < 3) { seen[k] = 1; out.push({ job: job, cls: cls || '' }); } };
    (recent || []).slice().sort(function (a, b) { return (b.startedAt || 0) - (a.startedAt || 0); })
      .forEach(function (r) { if (!CLASS_JOBS[r.job] || (todayClasses || []).indexOf(r.cls) >= 0) add(r.job, r.cls); });
    (todayClasses || []).forEach(function (c) { add('Marking', c); });
    (todayClasses || []).forEach(function (c) { add('Building lessons', c); });
    return out;
  }
  // the fortnightly report (3.10): hours per job and per class, biggest drain first, one line on what to automate next
  function report(rows) {
    var byJob = {}, byClass = {}, maybe = [];
    (rows || []).forEach(function (r) {
      var m = r.minutes || 0;
      byJob[r.job] = (byJob[r.job] || 0) + m;
      if (r.cls) byClass[r.cls] = (byClass[r.cls] || 0) + m;
      if (r.maybe) maybe.push(r);
    });
    var sortObj = function (o) { return Object.keys(o).map(function (k) { return { name: k, minutes: o[k], hours: Math.round(o[k] / 6) / 10 }; }).sort(function (a, b) { return b.minutes - a.minutes; }); };
    var jobs = sortObj(byJob), work = jobs.filter(function (j) { return j.name !== 'Personal'; });
    return { jobs: jobs, classes: sortObj(byClass), maybe: maybe,
      suggestion: work.length ? 'Biggest drain: ' + work[0].name + ' (' + work[0].hours + ' h). That is the one to automate next.' : 'Nothing logged yet.' };
  }
  // one task over several sittings adds up: "last time this took about N min"
  function lastTimeTook(rows, job, cls, taskRef) {
    var hit = (rows || []).filter(function (r) { return r.job === job && (r.cls || '') === (cls || '') && (!taskRef || r.taskRef === taskRef); });
    if (!hit.length) return null;
    if (!taskRef) { var last = hit.reduce(function (a, b) { return (b.taskRef || '') > (a.taskRef || '') ? b : a; }); taskRef = last.taskRef; hit = hit.filter(function (r) { return r.taskRef === taskRef; }); }
    return hit.reduce(function (s, r) { return s + (r.minutes || 0); }, 0);
  }

  var api = { CLASSES: CLASSES, JOBS: JOBS, CLASS_JOBS: CLASS_JOBS, MINUTES: MINUTES, DEFAULT_RULES: DEFAULT_RULES,
    findClass: findClass, sortCapture: sortCapture, isSchoolDay: isSchoolDay, morningMessageDue: morningMessageDue, afterSeven: afterSeven,
    periodsToday: periodsToday, timeAvailable: timeAvailable, buildTodos: buildTodos, addDay: addDay, workload: workload,
    ghostBlocks: ghostBlocks, ulhuMood: ulhuMood, mapWindow: mapWindow, totals: totals, capRunning: capRunning,
    likelyJobs: likelyJobs, report: report, lastTimeTook: lastTimeTook, iso: iso, mins: mins, hhmm: hhmm };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.DayLogic = api;
})(typeof window !== 'undefined' ? window : this);
