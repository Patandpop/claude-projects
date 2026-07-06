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

  // uploader — review lessons swap support for answers in the copy list
  const upSrc = fs.readFileSync(path.join(__dirname, '../science-lesson/references/upload-to-drive.js'), 'utf8');
  if (upSrc.includes("_answers.docx") && upSrc.includes("lessonType || '').toLowerCase() === 'review'"))
    pass('uploader is review-aware (_answers.docx in the copy list)');
  else fail('uploader missing review answer-sheet handling');
  if (upSrc.includes('for (const lesson of lessons)'))
    pass('uploader loops over every lesson in a multi-lesson JSON');
  else fail('uploader still only uploads the first lesson of an array');

  console.log(`  ${fails ? RED : GRN}${fails} failure(s)${RST}`);
  return { fails, warns };
}

if (require.main === module) {
  const r = run();
  process.exit(r.fails ? 1 : 0);
}
module.exports = { run };
