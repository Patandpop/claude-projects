#!/usr/bin/env node
// Build ahead: the rules for the scheduled afternoon run that builds the lessons Patryk asked for in the planner
// (lanes/design-build-ahead.md). Pure rules, no server calls. The runner (build-ahead.ps1) calls:
//   node planner/tools/build-ahead.js check     prints a JSON decision: run or not, why, which requests, the stop time
//   node planner/tools/build-ahead.js prompt    prints the plain-English instructions handed to the unattended session
// Nothing here writes to Drive. The lessons themselves are built by the normal lesson build, which uploads as usual.
(function (root) {
  'use strict';
  var WINDOW_START = 15 * 60 + 30;   // a run may start from 15:30 (he is out of lessons)
  var WINDOW_LAST = 17 * 60 + 45;    // and not after 17:45 (a lesson takes up to 40 minutes, plus margin)
  var NO_NEW_AFTER = 18 * 60 + 30;   // the session starts no new lesson after 18:30
  var HARD_STOP = 18 * 60 + 50;      // the runner ends the session at 18:50, so nothing runs past 19:00
  var MAX_LESSONS = 3;               // per run; the rest wait for tomorrow's run (or his own "do my planner requests")
  var MINUTES_PER_LESSON = 40;

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var hhmm = function (m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  var mins = function (d) { return d.getHours() * 60 + d.getMinutes(); };

  function isSchoolDay(d, cal) {
    var wd = d.getDay(); if (wd === 0 || wd === 6) return false;
    var day = iso(d);
    if (((cal && cal.inset) || []).indexOf(day) >= 0) return false;
    return ((cal && cal.terms) || []).some(function (t) { return day >= t[0] && day <= t[1]; });
  }

  // The requests worth building unattended: lesson builds and exam practice, soonest first. Messages need a person.
  function pickRequests(open, today) {
    var list = (open || []).filter(function (r) { return r && (r.kind === 'build' && (r.lessons || []).length || r.kind === 'practice'); });
    var soonest = function (r) { return r.kind === 'practice' ? '9999' : (r.lessons || []).map(function (l) { return String(l.when || '9999'); }).sort()[0]; };
    list.sort(function (a, b) { return soonest(a) < soonest(b) ? -1 : soonest(a) > soonest(b) ? 1 : String(a.at).localeCompare(String(b.at)); });
    var out = [], lessons = 0;
    list.forEach(function (r) {
      var n = r.kind === 'practice' ? 1 : r.lessons.length;
      if (lessons + n > MAX_LESSONS) return;
      lessons += n; out.push(r);
    });
    return { picked: out, lessons: lessons, left: list.length - out.length };
  }

  // The decision. s: { now (Date), cal ({terms, inset}), drive (bool), busy (bool: another Claude session is running),
  //                     open (requests not yet done), ranToday (bool), holiday (bool, his switch) }
  function decide(s) {
    var now = s.now, m = mins(now);
    var no = function (why) { return { run: false, why: why, day: iso(now), at: hhmm(m) }; };
    if (s.holiday) return no('switched off (holiday)');
    if (!isSchoolDay(now, s.cal)) return no('not a school day');
    if (m < WINDOW_START) return no('before ' + hhmm(WINDOW_START));
    if (m > WINDOW_LAST) return no('after ' + hhmm(WINDOW_LAST) + ': too late to finish before 19:00');
    if (!s.drive) return no('Google Drive (G:) is not mounted');
    if (s.busy) return no('another Claude session is running on this PC');
    if (s.ranToday) return no('already ran today');
    var p = pickRequests(s.open, iso(now));
    if (!p.picked.length) return no('no lesson or exam practice requests waiting');
    return { run: true, why: p.lessons + ' lesson' + (p.lessons === 1 ? '' : 's') + ' to build' + (p.left ? ', ' + p.left + ' more waiting for tomorrow' : ''),
      day: iso(now), at: hhmm(m), requests: p.picked.map(function (r) { return r.id; }), lessons: p.lessons, left: p.left,
      noNewAfter: hhmm(NO_NEW_AFTER), hardStop: hhmm(HARD_STOP), minutes: Math.min(HARD_STOP - m, p.lessons * MINUTES_PER_LESSON + 15) };
  }

  // What the unattended session is told. Plain English, no questions back (nobody is there to answer).
  function promptFor(requests, d) {
    var lines = ['You are building my planner requests unattended, on my home PC. Read CLAUDE.md first. Nobody is watching: never ask a question; if something blocks a lesson, skip that lesson, leave its request open and write one plain line saying why in build-ahead-notes.txt in the project root.',
      'Do only these requests (ids): ' + requests.map(function (r) { return r.id; }).join(', ') + '. List them with "node planner/planner-sync.js requests".',
      'For each lesson build request: write the lesson content with the science-lesson skill exactly as for any lesson, then build it with "node science-lesson/references/build.js <content json>" in the lesson\'s own folder under the project root (the build uploads to the Drive lesson folder itself; never create, move or rename anything on Drive by hand). Then "node planner/planner-sync.js done <id> \"built: <class> <title>\"".',
      'For an exam practice request: run the test-paper.js command written in the request, check the papers, then mark it done the same way.',
      'Build the soonest lesson first. Start no new lesson after ' + d.noNewAfter + '; the run is ended at ' + d.hardStop + ' whatever happens, so a lesson you cannot finish by then is left for tomorrow with its request open.',
      'No paid services. No pupil names anywhere. Do not touch git. When the requests are done, print one line per lesson: class, title, built or skipped and why, then stop.'];
    return lines.join('\n');
  }

  var api = { decide: decide, pickRequests: pickRequests, promptFor: promptFor, isSchoolDay: isSchoolDay,
    WINDOW_START: WINDOW_START, WINDOW_LAST: WINDOW_LAST, NO_NEW_AFTER: NO_NEW_AFTER, HARD_STOP: HARD_STOP, MAX_LESSONS: MAX_LESSONS };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BuildAhead = api;

  // ---- command line (the runner)
  if (typeof require !== 'undefined' && require.main === module) {
    var fs = require('fs'), path = require('path');
    var ROOT = path.join(__dirname, '..', '..');
    var SYNC = process.env.PLANNER_SYNC || 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Planner Sync';
    var readJson = function (f, dflt) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return dflt; } };
    var cal = readJson(path.join(ROOT, 'planner', 'planner-data.json'), {});
    var done = {}; readJson(path.join(SYNC, 'requests-done.json'), []).forEach(function (x) { done[x.id] = 1; });
    var open = readJson(path.join(SYNC, 'requests.json'), []).filter(function (r) { return !done[r.id]; });
    var stamp = path.join(ROOT, 'planner', 'tools', '.build-ahead-last');
    var today = iso(new Date());
    var state = { now: new Date(), cal: { terms: cal.terms, inset: cal.inset }, drive: fs.existsSync('G:\\'),
      busy: process.env.BUILD_AHEAD_BUSY === '1', open: open, ranToday: fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8').trim() === today,
      holiday: fs.existsSync(path.join(ROOT, 'planner', 'tools', '.build-ahead-off')) };
    var cmd = process.argv[2];
    if (cmd === 'check') { var d = decide(state); if (d.run) fs.writeFileSync(stamp, today); console.log(JSON.stringify(d)); }
    else if (cmd === 'prompt') { var d2 = decide(Object.assign({}, state, { ranToday: false })); if (!d2.run) { console.error(d2.why); process.exit(1); } console.log(promptFor(open.filter(function (r) { return d2.requests.indexOf(r.id) >= 0; }), d2)); }
    else { console.log('node planner/tools/build-ahead.js check | prompt'); }
  }
})(typeof window !== 'undefined' ? window : this);
