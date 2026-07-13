'use strict';
// suite-scripts.test.js — unit coverage for the supporting-script fixes (2026-07-06
// overnight session): daily-brief homework/day logic + upload-entry recency,
// order-sheet brief-log integration + sets labelling, uploader review file list.
// Same run()-returning shape as lesson-log.test.js; wired into test/run.js.

const fs   = require('fs');
const os   = require('os');
const path = require('path');

const brief = require('../science-lesson/references/daily-brief.js');
const order = require('../science-lesson/references/order-sheet.js');

const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';

function run() {
  let fails = 0, warns = 0;
  const pass = m => console.log(`  ${GRN}✓${RST} ${m}`);
  const fail = m => { console.log(`  ${RED}✗${RST} ${m}`); fails++; };

  console.log('── suite scripts (daily-brief / order-sheet)');

  // computeSetHomework — fixed day per year group
  const mon = new Date('2026-07-06T08:00:00'); // a Monday
  const thu = new Date('2026-07-09T08:00:00'); // a Thursday
  if (brief.computeSetHomework('7BYA', mon, null)) pass('Y7 homework day = Monday');
  else fail('Y7 should set homework on Monday');
  if (!brief.computeSetHomework('7BYA', thu, null)) pass('Y7 no homework on Thursday');
  else fail('Y7 should NOT set homework on Thursday');
  if (brief.computeSetHomework('10S2', thu, null)) pass('Y10 homework day = Thursday');
  else fail('Y10 should set homework on Thursday');
  if (brief.computeSetHomework('12D', mon, null) && brief.computeSetHomework('12D', thu, null))
    pass('Y12 homework every lesson day');
  else fail('Y12 should set homework on every lesson day');
  if (brief.computeSetHomework('8XP', mon, { homeworkDays: { 8: 'Mon' } }))
    pass('standing homeworkDays override respected');
  else fail('standing homeworkDays override ignored');

  // findUploadEntry — most recent entry wins
  const log = [
    { ts: '2026-06-01', name: 'Lesson 3 - Enzymes', drivePath: 'G:/old' },
    { ts: '2026-07-01', name: 'Lesson 3 - Enzymes', drivePath: 'G:/new' },
  ];
  const hit = brief.findUploadEntry('Enzymes', 3, log);
  if (hit && hit.drivePath === 'G:/new') pass('findUploadEntry prefers most recent upload');
  else fail('findUploadEntry returned the oldest entry (should walk backwards)');

  // order-sheet sets labelling + non-order detection
  if (order.setsLabel('threes') === 'sets of 3' && order.setsLabel('demo') === 'demo (1 set)')
    pass('setsLabel maps set codes to technician wording');
  else fail('setsLabel mapping wrong');
  if (order.isNonOrder('N/A — cover') && order.isNonOrder('already printed — test') && !order.isNonOrder('10x beakers'))
    pass('isNonOrder classifies non-order cells');
  else fail('isNonOrder misclassifies');

  // order-sheet brief-log append — daily-brief must recognise the entry
  const tmp = path.join(os.tmpdir(), 'brieflog-test-' + Date.now() + '.json');
  try {
    order.appendBriefLog(tmp, 'order sheet submitted — Week B w/c 13/07/2026');
    const written = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    const en = written.entries && written.entries[0];
    if (en && /order\s*sheet/i.test(en.message) && /submit/i.test(en.message) && !isNaN(new Date(en.timestamp)))
      pass('appendBriefLog writes an entry daily-brief will match');
    else fail('appendBriefLog entry shape wrong (daily-brief would not clear the warning)');
    order.appendBriefLog(tmp, 'second entry');
    const twice = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    if (twice.entries.length === 2) pass('appendBriefLog appends without clobbering');
    else fail('appendBriefLog clobbered existing entries');
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }

  // uploader — review lessons swap support for answers in the copy list.
  // Behavioural, not a source grep: the old grep-based version passed while the
  // code read content.lessonType instead of content.meta.lessonType, so every
  // real review lesson silently uploaded without its answer sheet (fixed 2026-07-12).
  const up = require('../science-lesson/references/upload-to-drive.js');

  const revFiles = up.outputFilesFor({ topic: 'Rates of Reaction Review', lessonType: 'review' });
  if (revFiles[2] === 'Rates-of-Reaction-Review_answers.docx')
    pass('uploader review lesson ships the answer sheet (meta.lessonType read correctly)');
  else fail(`uploader review file list wrong — third file is "${revFiles[2]}", expected the _answers.docx sheet`);

  const revisionFiles = up.outputFilesFor({ topic: 'Paper 1 Revision', lessonType: 'revision' });
  if (revisionFiles[2].endsWith('_answers.docx'))
    pass('uploader treats revision like review (answer sheet, matching build.js)');
  else fail('uploader does not treat revision lessons like review — answer sheet would not upload');

  const stdFiles = up.outputFilesFor({ topic: 'Ideal Gas Law', lessonType: 'standard' });
  if (stdFiles[2] === 'Ideal-Gas-Law_support_worksheet.docx')
    pass('uploader standard lesson still ships the support worksheet');
  else fail(`uploader standard file list wrong — third file is "${stdFiles[2]}"`);

  // macrotopic fuzzy matcher (2026-07-12) — maps what Patryk typed onto a real folder.
  const FOLDERS = ['P4 Earth in Space', 'P1 Energy Transfers', 'B3 Organisation', 'C5 Energy Changes', 'Photosynthesis'];
  const cases = [
    ['P4 Earth in Space', 'P4 Earth in Space', 'exact'],
    ['p4 earth in space', 'P4 Earth in Space', 'exact'],          // case-insensitive
    ['Earth in Space',    'P4 Earth in Space', 'normal'],         // unit code omitted
    ['Space',             'P4 Earth in Space', 'contains'],       // the real 2026-07-09 miss
    ['Photosythesis',     'Photosynthesis',    'fuzzy'],          // typo
    ['Organisation',      'B3 Organisation',   'contains'],
  ];
  for (const [typed, want, how] of cases) {
    const r = up.resolveMacrotopic(FOLDERS, typed);
    if (r.name === want) pass(`macrotopic "${typed}" → "${want}" (${r.how})`);
    else fail(`macrotopic "${typed}" → ${r.name === null ? 'NO MATCH' : '"' + r.name + '"'}, expected "${want}" by ${how}`);
  }
  // Ambiguity must NOT be guessed — "Energy" fits both "P1 Energy Transfers" and
  // "C5 Energy Changes" equally, and a confident wrong guess misfiles the lesson.
  const amb = up.resolveMacrotopic(FOLDERS, 'Energy');
  if (amb.name === null && amb.candidates && amb.candidates.length >= 2)
    pass('ambiguous macrotopic refuses to guess and lists the candidates');
  else fail(`ambiguous macrotopic "Energy" was resolved to "${amb.name}" — it must refuse rather than misfile a lesson`);
  // But a full normalised match still wins outright even when another folder shares
  // the word — "Energy Changes" is C5, not an ambiguity with "P1 Energy Transfers".
  const exactish = up.resolveMacrotopic(FOLDERS, 'Energy Changes');
  if (exactish.name === 'C5 Energy Changes')
    pass('a complete topic name still resolves outright despite a shared word');
  else fail(`"Energy Changes" resolved to ${exactish.name === null ? 'NO MATCH' : '"' + exactish.name + '"'} — expected C5 Energy Changes`);
  // Nonsense must not match anything.
  const none = up.resolveMacrotopic(FOLDERS, 'Quantum Basket Weaving');
  if (none.name === null) pass('unrelated macrotopic does not fuzzy-match onto a real folder');
  else fail(`unrelated macrotopic matched "${none.name}" — the fuzzy floor is too low`);

  const upSrc = fs.readFileSync(path.join(__dirname, '../science-lesson/references/upload-to-drive.js'), 'utf8');
  if (upSrc.includes('for (const lesson of lessons)'))
    pass('uploader loops over every lesson in a multi-lesson JSON');
  else fail('uploader still only uploads the first lesson of an array');

  // last-lesson summariser (2026-07-12) — condenses the lesson log to "what we did
  // last time" per class, so the school session need not be told each lesson.
  const ll = require('../science-lesson/references/last-lesson.js');
  const logRecs = [
    { class: '9AB', topic: 'Cells', lessonNumber: 3, builtOn: '2026-05-01', subtopics: ['x'], doNow: [{ q: 'Q1', id: 'a' }] },
    { class: '9AB', topic: 'Diffusion', lessonNumber: 5, builtOn: '2026-05-08', subtopics: ['y'], doNow: [{ q: 'Q2', examRef: 'Phys-Q1a' }] },
    { class: '8XP', topic: 'Forces', lessonNumber: 2, builtOn: '2026-05-06', subtopics: [], doNow: [] },
  ];
  const sum = ll.summariseLatest(logRecs);
  if (sum.classes['9AB'] && sum.classes['9AB'].topic === 'Diffusion')
    pass('last-lesson picks the most recent lesson per class (by lessonNumber)');
  else fail(`last-lesson picked the wrong 9AB lesson: ${sum.classes['9AB'] && sum.classes['9AB'].topic}`);
  if (sum.classes['9AB'].doNowIds && sum.classes['9AB'].doNowIds[0] === 'Phys-Q1a')
    pass('last-lesson carries the Do Now ids used (for the future no-repeat rule)');
  else fail('last-lesson dropped the Do Now ids');
  if (Object.keys(sum.classes).length === 2)
    pass('last-lesson summarises one entry per class');
  else fail(`last-lesson produced ${Object.keys(sum.classes).length} classes, expected 2`);
  // date tie-break when lessonNumber is equal/absent
  if (ll.isLater({ lessonNumber: null, builtOn: '2026-05-08' }, { lessonNumber: null, builtOn: '2026-05-01' }))
    pass('last-lesson falls back to build date when lessonNumber is absent');
  else fail('last-lesson date tie-break is wrong');

  console.log(`  ${fails ? RED : GRN}${fails} failure(s)${RST}`);
  return { fails, warns };
}

if (require.main === module) {
  const r = run();
  process.exit(r.fails ? 1 : 0);
}
module.exports = { run };
