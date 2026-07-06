'use strict';
/* ============================================================================
   test/lesson-log.test.js — unit coverage for the lesson-log writer.

   The main harness (run.js) builds fixtures with NO_UPLOAD=1, which skips the
   uploader entirely — so the log-append path is never exercised there. This
   test drives upload-to-drive.js's exported pure functions directly against a
   fixture, writing to a tmp LESSON_LOG so no real Drive is touched.

   Covers: record shape, compound-class split (Decision A), doNow/subtopics
   sourcing, and upsert-not-duplicate on rebuild (Decision B).

   Exported run() returns { fails, warns }; invoked from run.js.
   ============================================================================ */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const ROOT     = path.resolve(__dirname, '..');
const UPLOADER = path.join(ROOT, 'science-lesson', 'references', 'upload-to-drive.js');
const { buildLogRecords, appendLog, splitClasses } = require(UPLOADER);

const RED = '\x1b[31m', GRN = '\x1b[32m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const ok  = (m) => console.log(`  ${GRN}✓${RST} ${m}`);
  const bad = (m) => { console.log(`  ${RED}✗ FAIL${RST} ${m}`); fails++; };
  const eq  = (a, b, m) => (a === b ? ok(m) : bad(`${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`));

  console.log('── lesson-log writer');

  // Fixture with a compound class field ("7BYA / 7MLA") and a keyword list.
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'y7-b1-l1-mrs-gren.json'), 'utf8'));

  // splitClasses ---------------------------------------------------------------
  eq(JSON.stringify(splitClasses('7BYA / 7MLA')), JSON.stringify(['7BYA', '7MLA']), 'splitClasses splits on "/"');
  eq(splitClasses('').length, 0, 'splitClasses("") is empty');

  // buildLogRecords ------------------------------------------------------------
  const recs = buildLogRecords(fixture, { builtOn: '2026-07-03', driveFolder: 'X', uploaded: true });
  eq(recs.length, 2, 'Decision A: one record per class (2 for "7BYA / 7MLA")');

  const r = recs[0];
  eq(r.class, '7BYA', 'first record class = 7BYA');
  eq(recs[1].class, '7MLA', 'second record class = 7MLA');
  eq(r.year, 7, 'year carried from meta');
  eq(r.subject, 'Biology', 'subject carried from meta');
  eq(r.macrotopic, 'B1 Cells', 'macrotopic carried from meta');
  eq(r.lessonNumber, 1, 'lessonNumber carried from meta');
  eq(r.topic, 'MRS GREN', 'topic from meta.topic');
  eq(r.builtOn, '2026-07-03', 'builtOn taken from extra (Decision C)');
  eq(r.uploaded, true, 'uploaded flag recorded');

  // subtopics = title.keywords
  eq(JSON.stringify(r.subtopics), JSON.stringify(fixture.title.keywords), 'subtopics mirror title.keywords');

  // doNow mirrors the fixture's questions (q + marks, no answer/hint leaked)
  eq(r.doNow.length, fixture.doNow.questions.length, 'doNow length matches fixture');
  eq(r.doNow[0].q, fixture.doNow.questions[0].q, 'doNow[0].q mirrors fixture');
  eq(r.doNow[0].marks, fixture.doNow.questions[0].marks, 'doNow[0].marks mirrors fixture');
  eq('a' in r.doNow[0], false, 'doNow record does not leak answers');
  // both classes get the same Do Now record (same lesson)
  eq(JSON.stringify(recs[0].doNow), JSON.stringify(recs[1].doNow), 'both classes share the lesson Do Now');

  // missing meta must not throw (M7)
  try { eq(buildLogRecords({}, {}).length, 1, 'empty content yields 1 placeholder record, no throw'); }
  catch (e) { bad('buildLogRecords threw on empty content: ' + e.message); }

  // appendLog upsert -----------------------------------------------------------
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-log-'));
  const logFile = path.join(tmp, 'nested', 'lesson-log.json'); // nested → tests folder auto-create
  try {
    const n1 = appendLog(logFile, recs);
    eq(n1, 2, 'first append writes 2 records');
    eq(fs.existsSync(logFile), true, 'appendLog creates missing parent folder');

    // Rebuild: same class+lessonNumber+topic, changed field → upsert, not duplicate.
    const rebuilt = buildLogRecords(fixture, { builtOn: '2026-07-04', driveFolder: 'X', uploaded: false });
    const n2 = appendLog(logFile, rebuilt);
    eq(n2, 2, 'Decision B: rebuild upserts — still 2 records, no duplicates');

    const onDisk = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    eq(Array.isArray(onDisk), true, 'log round-trips as a JSON array');
    eq(onDisk.length, 2, 'log has 2 records after rebuild');
    eq(onDisk[0].builtOn, '2026-07-04', 'upsert refreshed the record (builtOn updated)');
    eq(onDisk[0].uploaded, false, 'upsert refreshed the record (uploaded updated)');

    // A genuinely different lesson appends rather than replacing.
    const other = buildLogRecords(
      { meta: { class: '7BYA', year: 7, subject: 'Biology', macrotopic: 'B1 Cells', lessonNumber: 2, title: 'Cells' } },
      { builtOn: '2026-07-05' });
    eq(appendLog(logFile, other), 3, 'different lessonNumber appends (3 total)');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  return { fails, warns: 0 };
}

module.exports = { run };

// Allow standalone execution: `node test/lesson-log.test.js`
if (require.main === module) {
  const { fails } = run();
  console.log('');
  process.exit(fails ? 1 : 0);
}
