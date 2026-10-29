'use strict';
// exam-pick-keep.test.js — a rebuild of the same lesson keeps its exam question (2026-10-15).
// Before: the first build recorded the question as "used", so the next build of the SAME lesson
// picked a different one. Real exam-usage.json / exam-lesson-picks.json are restored afterwards.

const fs = require('fs');
const path = require('path');
const GRN = '\x1b[32m', RED = '\x1b[31m', YEL = '\x1b[33m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── a rebuilt lesson keeps its exam question');
  if (!fs.existsSync(path.join(__dirname, '..', 'exam-library', 'catalogue.json'))) {
    console.log(`  ${YEL}!${RST} exam library not built here: not checked`); return { fails, warns: 1 };
  }
  const ep = require('../science-lesson/references/exam-pick.js');
  const keep = [ep.USAGE, ep.PICKS].map((f) => [f, fs.existsSync(f) ? fs.readFileSync(f) : null]);
  const noUp = process.env.NO_UPLOAD;
  const log = console.log; const quiet = () => { console.log = () => {}; }; const loud = () => { console.log = log; };
  try {
    delete process.env.NO_UPLOAD;   // recordUse only saves for real (uploaded) builds
    const L = { meta: { class: '10C2', year: 10, macrotopic: 'P1 Energy', lessonNumber: 99, title: 'Efficiency' } };
    quiet();
    const first = ep.pickForLesson(L).board;
    ep.recordUse('10C2', [first.examRef]);
    const again = ep.pickForLesson(L).board;
    const noMemory = ep.pickForLesson(L, { picks: {} }).board;
    const fresh = ep.pickForLesson({ meta: { ...L.meta, examFresh: true } }).board;
    const other = ep.pickForLesson({ meta: { ...L.meta, lessonNumber: 98 } }).board;
    const named = ep.pickForLesson({ meta: { ...L.meta, examRef: noMemory.examRef } }).board;
    loud();
    check(again.examRef === first.examRef, `rebuild of the same lesson shows the same question (${first.examRef})`);
    check(noMemory.examRef !== first.examRef, 'without the memory it would have changed (the old bug)');
    check(fresh.examRef !== first.examRef && other.examRef !== first.examRef, 'examFresh and a different lesson still get a new, unused question');
    check(named.examRef === noMemory.examRef, 'meta.examRef still wins over the remembered question');
    process.env.NO_UPLOAD = '1';
    ep.recordUse('10C2', [other.examRef]);
    check(!(ep.loadPicks()[ep.lessonKey({ ...L.meta, lessonNumber: 98 })]), 'a check build (NO_UPLOAD) remembers nothing');
  } catch (e) { loud(); check(false, 'crashed: ' + e.message); }
  finally {
    loud();
    if (noUp === undefined) delete process.env.NO_UPLOAD; else process.env.NO_UPLOAD = noUp;
    for (const [f, b] of keep) { if (b) fs.writeFileSync(f, b); else if (fs.existsSync(f)) fs.unlinkSync(f); }
  }
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
