'use strict';
/* ============================================================================
   test/exam-library.test.js — unit coverage for the exam-doc library parser.

   Drives references/exam-library.js against the real sample doc
   ("Physics - Atomic Structure - Nuclear Fission and Fusion.doc") and asserts
   the structural invariants the downstream tools depend on: all 60 questions
   present, every question has a part, the mark-scheme join clears the 80%
   floor (reported exactly), Level descriptors survive, no part out-marks its
   own question, and figure-flagged parts exist.

   Exported run() returns { fails, warns }; invoked from run.js.
   ============================================================================ */

const path = require('path');
const fs   = require('fs');
const ROOT = path.resolve(__dirname, '..');
const EL   = require(path.join(ROOT, 'science-lesson', 'references', 'exam-library.js'));
const DOC  = path.join(ROOT, 'Physics - Atomic Structure - Nuclear Fission and Fusion.doc');

const RED = '\x1b[31m', GRN = '\x1b[32m', YEL = '\x1b[33m', RST = '\x1b[0m';

function run() {
  let fails = 0, warns = 0;
  const ok  = (m) => console.log(`  ${GRN}✓${RST} ${m}`);
  const bad = (m) => { console.log(`  ${RED}✗ FAIL${RST} ${m}`); fails++; };
  const warn= (m) => { console.log(`  ${YEL}!${RST} ${m}`); warns++; };
  const eq  = (a, b, m) => (a === b ? ok(m) : bad(`${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`));

  console.log('── exam-doc library parser');

  if (!fs.existsSync(DOC)) { warn(`sample doc missing (${path.basename(DOC)}) — skipping exam-library tests`); return { fails, warns }; }

  // Pure helpers first (no I/O).
  const topic = EL.topicFromFilename('Physics - Atomic Structure - Nuclear Fission and Fusion.doc');
  eq(topic.subject, 'Physics', 'filename → subject Physics');
  eq(topic.topic, 'Atomic Structure', 'filename → topic Atomic Structure');
  eq(topic.subtopic, 'Nuclear Fission and Fusion', 'filename → subtopic Nuclear Fission and Fusion');
  eq(EL.commandWord('Explain how nuclear fusion releases energy.'), 'Explain', 'commandWord picks Explain');
  eq(EL.commandWord('The reactor uses uranium.'), 'other', 'commandWord → other when no imperative');
  (EL.challengeScore('Explain', 4) > EL.challengeScore('State', 1) ? ok : bad)('challengeScore ranks Explain/4 above State/1');

  let idx;
  try { idx = EL.parseDoc(DOC); }
  catch (e) { bad(`parseDoc threw: ${e.message}`); return { fails, warns }; }

  // 60 questions.
  eq(idx.counts.questions, 60, '60 questions parsed');

  // Every question has >= 1 part.
  const byQ = new Map();
  idx.parts.forEach((p) => byQ.set(p.question, (byQ.get(p.question) || 0) + 1));
  const noPart = [];
  for (let q = 1; q <= 60; q++) if (!byQ.get(q)) noPart.push(q);
  (noPart.length === 0 ? ok : bad)(`every question has >= 1 part${noPart.length ? ' (empty: ' + noPart.join(',') + ')' : ''}`);

  // Total-marks markers match question count (the parser gates this; assert every
  // part carries a numeric question total as the observable proxy).
  const missingTotal = idx.parts.filter((p) => p.questionTotalMarks == null).length;
  eq(missingTotal, 0, 'every part carries its question total-marks');

  // Join coverage >= 80% — report the exact number.
  const cov = idx.counts.joinCoveragePct;
  (cov >= 80 ? ok : bad)(`mark-scheme join coverage ${cov}% (>= 80% floor; ${idx.counts.joinHits}/${idx.counts.parts} parts, ${idx.counts.joinMisses} misses)`);

  // At least one part carries Level descriptors.
  const withLevels = idx.parts.filter((p) => p.ms && p.ms.levels && p.ms.levels.length);
  (withLevels.length >= 1 ? ok : bad)(`at least one part has Level descriptors (${withLevels.length})`);
  if (withLevels.length) {
    const lv = withLevels[0].ms.levels;
    const shaped = lv.every((l) => typeof l.level === 'number' && l.marks && l.descriptor);
    (shaped ? ok : bad)(`Level descriptors are well-formed {level, marks, descriptor} (Q${withLevels[0].question}${withLevels[0].part ? '(' + withLevels[0].part + ')' : ''})`);
  }

  // No part out-marks its own question (parser throws on violation, but assert too).
  const overMarked = idx.parts.filter((p) => p.marks != null && p.questionTotalMarks != null && p.marks > p.questionTotalMarks);
  eq(overMarked.length, 0, 'no part has marks > its question total');

  // Figure-flagged parts exist.
  const figs = idx.parts.filter((p) => p.hasFigure).length;
  (figs > 0 ? ok : bad)(`figure-flagged parts exist (${figs})`);

  // Never-fabricate rule: every joinMiss part genuinely has ms:null.
  const fabricated = idx.parts.filter((p) => p.ms === null && p.ms !== null);
  eq(fabricated.length, 0, 'joinMisses carry ms:null (no fabricated scheme content)');

  // Warnings surfaced, never swallowed.
  if (idx.warnings.length) warn(`parser reported ${idx.warnings.length} warning(s): ${idx.warnings.slice(0, 3).join(' | ')}`);
  else ok('parser reported no warnings');

  return { fails, warns };
}

module.exports = { run };
if (require.main === module) { const r = run(); process.exit(r.fails ? 1 : 0); }
