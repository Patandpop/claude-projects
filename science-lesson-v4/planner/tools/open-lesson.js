#!/usr/bin/env node
// Open lesson and print the week (lanes/design-lesson-launcher.md). One press opens everything for a lesson in the
// order he uses it (slides, then the worksheet, then the support sheet), or makes one PDF "print pack" of a whole
// week's worksheets with a cover page saying how many copies of each. Reads the planner's saved weeks and the lesson
// folders on Drive; never writes to Drive (the pack lands in a local folder until he says where on Drive it may go).
//
//   node planner/tools/open-lesson.js today | tomorrow | next | YYYY-MM-DD [--cls 9AS] [--dry-run]
//   node planner/tools/open-lesson.js list  today | ...                         (just the list, opens nothing)
//   node planner/tools/open-lesson.js print today | ...  [--cls 9AS] [--dry-run] (prints the worksheets, Word does the printing)
//   node planner/tools/open-lesson.js pack  [YYYY-MM-DD of any day in the week] [--out folder] [--dry-run]
(function (root) {
  'use strict';
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var addDays = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
  var mondayOf = function (d) { return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -((d.getDay() + 6) % 7)); };
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // "today", "tomorrow", "next" (the next school day: tomorrow, or Monday from a Friday or weekend) or a date
  function resolveDay(word, now) {
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!word || word === 'today') return iso(d);
    if (word === 'tomorrow') return iso(addDays(d, 1));
    if (word === 'next') { d = addDays(d, 1); while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1); return iso(d); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(word)) return word;
    return null;
  }

  // the lessons planned for a day, from the saved week (state.weeks[monday].slots) and the class lesson lists (data)
  function lessonsOn(state, data, day) {
    var d = parse(day), mon = iso(mondayOf(d)), idx = (d.getDay() + 6) % 7;
    var w = ((state || {}).weeks || {})[mon];
    if (!w || !w.slots || idx > 4) return [];
    return w.slots.filter(function (s) { return s.day === idx && s.cls && s.kind === 'lesson'; }).map(function (s) {
      var c = ((data || {}).classes || {})[s.cls] || {}, L = (c.seq || [])[s.i] || {};
      return { day: day, dayName: DAYS[idx], period: s.period, cls: s.cls, title: L.title || String(s.text || '').replace(/^.*? \u2014 /, ''), rel: L.rel || '', built: s.built === true || L.built === true, size: c.size || null };
    }).sort(function (a, b) { return a.period - b.period; });
  }
  function weekLessons(state, data, anyDay) {
    var mon = mondayOf(parse(anyDay)), out = [];
    for (var i = 0; i < 5; i++) out = out.concat(lessonsOn(state, data, iso(addDays(mon, i))));
    return out;
  }

  // our files in a lesson folder, by the build's naming (base.pptx, base_worksheet.docx, base_support_worksheet.docx or
  // base_answers.docx; the old _PTO names still count). The school's own deck in "Beechen Cliff Original Lesson" is never opened.
  function lessonFiles(names) {
    var list = (names || []).filter(function (n) { return !/^~\$/.test(n); });
    var ws = list.filter(function (n) { return /_worksheet(_PTO)?\.docx$/i.test(n) && !/_support_worksheet/i.test(n); });
    var base = ws.length ? ws[0].replace(/_worksheet(_PTO)?\.docx$/i, '') : null;
    var find = function (re) { var m = list.filter(function (n) { return re.test(n); }); return m.length ? m[0] : null; };
    var deck = base ? find(new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(_PTO)?\\.pptx$', 'i')) : null;
    if (!deck) deck = find(/\.pptx$/i);   // a deck with no worksheet (deck-only lesson)
    return { deck: deck, worksheet: ws[0] || null, support: find(/_support_worksheet(_PTO)?\.docx$/i), answers: find(/_answers\.docx$/i) };
  }
  // the order he uses them: slides, worksheet, support sheet (or the answers for a review lesson)
  function openOrder(f) { return [f.deck, f.worksheet, f.support || f.answers].filter(Boolean); }
  function printList(f) { return [f.worksheet, f.support].filter(Boolean); }

  // the cover page of a print pack: one line per worksheet, standard copies = class size, support copies as asked
  function coverLines(monday, items, supportCopies) {
    var lines = ['Worksheets for the week beginning ' + DAYS[0] + ' ' + monday, ''];
    items.forEach(function (it) {
      var parts = [];
      if (it.files.worksheet) parts.push('worksheet x ' + (it.size || '?'));
      if (it.files.support) parts.push('support x ' + (supportCopies == null ? 'as needed' : supportCopies));
      lines.push(it.dayName + ' P' + it.period + '  ' + it.cls + '  ' + it.title + ':  ' + (parts.length ? parts.join(', ') : 'no worksheet') + (it.built ? '' : '  (not built yet)'));
    });
    lines.push('', 'Pages follow in this order. Double-sided. Nothing in this pack names a pupil.');
    return lines;
  }

  var api = { resolveDay: resolveDay, lessonsOn: lessonsOn, weekLessons: weekLessons, lessonFiles: lessonFiles, openOrder: openOrder, printList: printList, coverLines: coverLines, mondayOf: function (s) { return iso(mondayOf(parse(s))); } };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.OpenLesson = api;

  // ---------------------------------------------------------------- command line
  if (typeof require !== 'undefined' && require.main === module) {
    var fs = require('fs'), path = require('path'), cp = require('child_process');
    var ROOT = path.join(__dirname, '..', '..');
    var SYNC = process.env.PLANNER_SYNC || 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Planner Sync';
    var LESSONS = process.env.LESSONS_ROOT || 'G:\\My Drive\\Beechen Cliff Science\\Lessons';
    var args = process.argv.slice(2), opt = {};
    for (var i = args.length - 1; i >= 0; i--) {
      if (args[i] === '--dry-run') { opt.dry = true; args.splice(i, 1); }
      else if (args[i] === '--cls') { opt.cls = String(args[i + 1] || '').toUpperCase(); args.splice(i, 2); }
      else if (args[i] === '--out') { opt.out = args[i + 1]; args.splice(i, 2); }
      else if (args[i] === '--support') { opt.support = Number(args[i + 1]); args.splice(i, 2); }
    }
    var cmd = ['list', 'print', 'pack'].indexOf(args[0]) >= 0 ? args.shift() : 'open';
    var readJson = function (f, dflt) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return dflt; } };
    var data = readJson(path.join(ROOT, 'planner', 'planner-data.json'), null);
    var state = readJson(path.join(SYNC, 'planner-state.json'), null);
    if (!data) { console.error('planner/planner-data.json is missing: run planner-catalogue.js --export first.'); process.exit(1); }
    if (!state) { console.error('The planner has not saved any weeks here yet (' + SYNC + '\\planner-state.json). Is Drive (G:) mounted?'); process.exit(1); }
    var day = resolveDay(args[0], new Date());
    if (!day) { console.error('Say today, tomorrow, next, or a date like 2026-11-03.'); process.exit(1); }
    var items = (cmd === 'pack' ? weekLessons(state, data, day) : lessonsOn(state, data, day)).filter(function (L) { return !opt.cls || L.cls === opt.cls; });
    items.forEach(function (L) {
      L.folder = L.rel ? path.join(LESSONS, L.rel) : '';
      L.files = L.folder && fs.existsSync(L.folder) ? lessonFiles(fs.readdirSync(L.folder)) : lessonFiles([]);
    });
    if (!items.length) { console.log('Nothing planned for ' + day + (opt.cls ? ' for ' + opt.cls : '') + '.'); process.exit(0); }
    var run = function (what, exe, a) { if (opt.dry) console.log('  would ' + what + ': ' + a.join(' ')); else cp.spawn(exe, a, { detached: true, stdio: 'ignore', windowsHide: true }).unref(); };
    if (cmd === 'list' || cmd === 'open' || cmd === 'print') {
      items.forEach(function (L) {
        var list = cmd === 'print' ? printList(L.files) : openOrder(L.files);
        console.log(L.dayName + ' P' + L.period + '  ' + L.cls + '  ' + L.title + (L.folder ? '' : '  (no Drive folder known)') + (list.length ? '' : '  (nothing built here yet)'));
        if (cmd === 'list') { list.forEach(function (f) { console.log('    ' + f); }); return; }
        list.forEach(function (f) {
          var full = path.join(L.folder, f);
          if (cmd === 'open') run('open', 'cmd', ['/c', 'start', '""', full]);
          else run('print', 'powershell', ['-NoProfile', '-Command', 'Start-Process -FilePath \'' + full.replace(/'/g, "''") + '\' -Verb Print']);
        });
      });
      process.exit(0);
    }
    // pack: Word turns each worksheet into a PDF (a temporary copy), then week-pack.py joins them behind a cover page
    var mon = api.mondayOf(day), outDir = opt.out || path.join(process.env.USERPROFILE || '', 'Desktop', 'Print packs');
    var cover = coverLines(mon, items, isNaN(opt.support) ? null : opt.support);
    console.log(cover.join('\n'));
    var docs = []; items.forEach(function (L) { printList(L.files).forEach(function (f) { docs.push(path.join(L.folder, f)); }); });
    if (!docs.length) { console.log('\nNo worksheets to pack.'); process.exit(0); }
    var out = path.join(outDir, 'Worksheets week of ' + mon + '.pdf');
    if (opt.dry) { console.log('\nwould make ' + out + ' from:'); docs.forEach(function (d) { console.log('  ' + d); }); process.exit(0); }
    fs.mkdirSync(outDir, { recursive: true });
    var tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'weekpack-'));
    var pdfs = docs.map(function (d, k) { return path.join(tmp, pad(k) + '.pdf'); });
    // Word can hang on a damaged file or a hidden dialog, so this step has a time limit. If it runs out, only the Word
    // this tool started is closed (never one he has open), and the failure is said plainly. The checks stand in for
    // Word with OPEN_LESSON_FAKE_WORD (a PowerShell line) and a short OPEN_LESSON_WORD_TIMEOUT_MS.
    var q = function (s) { return "'" + String(s).replace(/'/g, "''") + "'"; };
    var ps = '$ErrorActionPreference = "Stop"; $w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0; try { ' +
      docs.map(function (d, k) { return '$doc = $w.Documents.Open(' + q(d) + ', $false, $true, $false); $doc.ExportAsFixedFormat(' + q(pdfs[k]) + ', 17); $doc.Close(0);'; }).join(' ') + ' } finally { $w.Quit() }';
    var limitMs = Number(process.env.OPEN_LESSON_WORD_TIMEOUT_MS) || (30000 + docs.length * 45000);
    var wordPids = function () { try { return cp.execFileSync('tasklist', ['/FI', 'IMAGENAME eq WINWORD.EXE', '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').map(function (l) { var m = /^"WINWORD\.EXE","(\d+)"/.exec(l.trim()); return m ? Number(m[1]) : null; }).filter(Boolean); } catch (e) { return []; } };
    var before = wordPids();
    // an empty input closes stdin at once: PowerShell can otherwise wait on an open pipe and never end
    var res = cp.spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', process.env.OPEN_LESSON_FAKE_WORD || ps], { encoding: 'utf8', timeout: limitMs, windowsHide: true, input: '' });
    var timedOut = !!(res.error && res.error.code === 'ETIMEDOUT');
    if (timedOut || res.status !== 0) {
      var mine = wordPids().filter(function (p) { return before.indexOf(p) === -1; });
      mine.forEach(function (pid) { try { cp.execFileSync('taskkill', ['/PID', String(pid), '/F'], { stdio: 'ignore', windowsHide: true }); } catch (e) { /* already gone */ } });
      console.error(timedOut
        ? '\nWord did not finish turning the worksheets into PDFs within ' + Math.round(limitMs / 1000) + ' seconds, so the pack was not made.' + (mine.length ? ' The Word this tool started has been closed.' : '') + ' Open the worksheets in Word yourself to see whether one of them asks a question, then try again.'
        : '\nWord could not turn the worksheets into PDFs, so the pack was not made.' + (res.stderr && String(res.stderr).trim() ? ' Word said: ' + String(res.stderr).trim().split('\n')[0] : ''));
      fs.rmSync(tmp, { recursive: true, force: true });
      process.exit(1);
    }
    var missing = docs.filter(function (d, k) { return !fs.existsSync(pdfs[k]); });
    if (missing.length) { console.error('\nWord finished but made no PDF for: ' + missing.join(', ') + '. The pack was not made.'); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(1); }
    fs.writeFileSync(path.join(tmp, 'cover.txt'), cover.join('\n'));
    cp.execFileSync('python', ['-I', path.join(__dirname, 'week-pack.py'), path.join(tmp, 'cover.txt'), out].concat(pdfs), { stdio: 'inherit' });
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('\nMade ' + out);
  }
})(typeof window !== 'undefined' ? window : this);
