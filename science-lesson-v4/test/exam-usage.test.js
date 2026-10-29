'use strict';
/* exam-usage.test.js — the "never repeat a question" record is read and written safely (exam-usage.js, 2026-10-29).
   A damaged file must stop the pick with a plain message, never look like an empty record; a write must never
   leave a half file; the first write of a day keeps a dated backup. All on a temp copy, never the real file. */
const fs = require('fs');
const os = require('os');
const path = require('path');

function run() {
  const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';
  let fails = 0;
  const check = (c, m) => { console.log(c ? `  ${GRN}✓${RST} ${m}` : `  ${RED}✗ FAIL${RST} ${m}`); if (!c) fails++; };
  console.log('Exam usage record (exam-usage.js)');
  const X = require('../science-lesson/references/exam-usage.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-usage-'));
  const f = path.join(dir, 'exam-usage.json');
  const noBackup = process.env.EXAM_USAGE_NO_BACKUP;
  delete process.env.EXAM_USAGE_NO_BACKUP;   // this test wants to see the backup happen
  try {
    check(JSON.stringify(X.loadUsage(f)) === '{}', 'a missing file is a brand-new, empty record');
    fs.writeFileSync(f, '{"10C2": ["A#1", "A#2"], "10C2:homework": ["B#1"]');   // cut short
    let err = ''; try { X.loadUsage(f); } catch (e) { err = e.message; }
    check(/not valid JSON/.test(err) && /exam-usage-backups/.test(err), 'a half-written file stops the pick with a plain message (never an empty record)');
    fs.writeFileSync(f, '');
    err = ''; try { X.loadUsage(f); } catch (e) { err = e.message; }
    check(/is empty/.test(err), 'an empty file stops the pick too');
    fs.writeFileSync(f, '[1,2]');
    err = ''; try { X.loadUsage(f); } catch (e) { err = e.message; }
    check(/should hold an object/.test(err), 'a file holding the wrong shape stops the pick');

    fs.writeFileSync(f, JSON.stringify({ '10C2': ['A#1'] }));
    X.addUse('10C2', ['A#2', 'A#1', 'A#3'], f);
    const u = X.loadUsage(f);
    check(u['10C2'].join() === 'A#1,A#2,A#3', 'addUse keeps the order and drops repeats');
    check(!fs.readdirSync(dir).some((x) => /\.tmp-/.test(x)), 'no temp file is left behind after a save');
    const bdir = path.join(dir, 'exam-usage-backups');
    const day = new Date().toISOString().slice(0, 10);
    check(fs.existsSync(path.join(bdir, `exam-usage-${day}.json`)) && JSON.parse(fs.readFileSync(path.join(bdir, `exam-usage-${day}.json`), 'utf8'))['10C2'].join() === 'A#1',
      'the first save of the day keeps a dated backup of the record as it was');
    X.addUse('10C2', ['A#4'], f);
    check(JSON.parse(fs.readFileSync(path.join(bdir, `exam-usage-${day}.json`), 'utf8'))['10C2'].join() === 'A#1', 'a second save the same day leaves that backup alone');
    for (let i = 0; i < 35; i++) fs.writeFileSync(path.join(bdir, `exam-usage-2020-01-${String(i + 1).padStart(2, '0')}.json`), '{}');
    fs.unlinkSync(path.join(bdir, `exam-usage-${day}.json`));
    X.saveUsage(u, f);
    const kept = fs.readdirSync(bdir).filter((x) => /^exam-usage-\d{4}-\d{2}-\d{2}\.json$/.test(x));
    check(kept.length === X.KEEP && kept.includes(`exam-usage-${day}.json`), `only the last ${X.KEEP} dated backups are kept`);
    err = ''; try { X.saveUsage(['no'], f); } catch (e) { err = e.message; }
    check(/must be an object/.test(err) && JSON.parse(fs.readFileSync(f, 'utf8'))['10C2'].join() === u['10C2'].join(), 'saving the wrong shape is refused and the file is untouched');
    process.env.EXAM_USAGE_NO_BACKUP = '1';
    const f2 = path.join(dir, 'other.json');
    fs.writeFileSync(f2, '{}'); X.addUse('x', ['Q'], f2);
    check(!fs.existsSync(path.join(dir, 'exam-usage-backups', `other-${day}.json`)), 'EXAM_USAGE_NO_BACKUP (set by the test harness) skips the backup');
    // the real scripts all go through this module
    const refs = path.join(__dirname, '..', 'science-lesson', 'references');
    const raw = ['exam-pick.js', 'homework-forms.js', 'extension-pick.js', 'test-paper.js', 'do-now-pick.js', 'homework.js', 'test-homework.js']
      .filter((n) => /readJson\(USAGE|writeFileSync\((ep\.)?USAGE|JSON\.parse\(fs\.readFileSync\(USAGE/.test(fs.readFileSync(path.join(refs, n), 'utf8')));
    check(!raw.length, 'no script reads or writes exam-usage.json on its own any more' + (raw.length ? ' (still raw: ' + raw.join(', ') + ')' : ''));
  } finally {
    if (noBackup === undefined) delete process.env.EXAM_USAGE_NO_BACKUP; else process.env.EXAM_USAGE_NO_BACKUP = noBackup;
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
