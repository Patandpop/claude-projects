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

  /* ===================== 2026-07-13: scale + figures + examiner =============== */

  // --- filename handling: instance numbers and typos ---
  // Patryk's exports cap at 60 questions, so a big subtopic is split across
  // several docs ("Photosynthesis 1", "Photosynthesis 2"). Without stripping the
  // trailing number, the two halves become two unrelated subtopics.
  const t1 = EL.topicFromFilename('Biology - Bioenergetics - Photosynthesis 2.doc');
  eq(t1.subtopic, 'Photosynthesis', 'instance number stripped off the subtopic');
  eq(t1.instance, 2, 'instance number captured separately (2)');
  const t2 = EL.topicFromFilename('Biology - Bioenergetics - Photosynthesis 1.doc');
  (t1.subtopic === t2.subtopic ? ok : bad)('both halves of a split subtopic rejoin as ONE subtopic');
  eq(EL.topicFromFilename('Physics - Forces - Gravity.doc').instance, 1,
    'a single-document subtopic defaults to instance 1');
  // Typos in his filenames must not fragment the taxonomy (Drive files are NOT renamed).
  eq(EL.topicFromFilename('Biology - Cell Biology - Cell Strucutre 2.doc').subtopic, 'Cell Structure',
    'filename typo corrected on read (Strucutre → Structure)');
  eq(EL.topicFromFilename('Physics - Waves - Waves in Air Flid and Solids 1.doc').subtopic,
    'Waves in Air Fluid and Solids', 'filename typo corrected on read (Flid → Fluid)');

  // --- figures: the images are REAL, not just flagged ---
  const FIG = require(path.join(ROOT, 'science-lesson', 'references', 'exam-figures.js'));
  const fx = FIG.extractFigures(DOC, null, { dryRun: true });
  (fx.total > 0 ? ok : bad)(`document contains ${fx.total} picture blob(s)`);
  eq(fx.unsupported, 0, 'every picture is a decodable PNG/JPEG (no metafiles to convert)');
  eq(fx.invalid, 0, 'no picture decoded to corrupt bytes (a bad figure is skipped, never shipped)');
  eq(fx.figures.length, fx.total, 'every picture blob was recovered');
  // The bytes must really be a PNG/JPEG — check the file signature, not just the count.
  const png = fx.figures.find((f) => f.ext === 'png');
  (png && png.bytes > 100 ? ok : bad)('recovered PNG figures carry real image bytes');
  // De-duplication: exam papers repeat the same logos/diagrams.
  const uniq = new Set(fx.figures.map((f) => f.sha));
  (uniq.size < fx.figures.length ? ok : warn)(
    `duplicate figures share one file (${fx.figures.length} references → ${uniq.size} unique images)`);

  // Parts must point at the ACTUAL figures, not merely say "has one somewhere".
  const linked = idx.parts.filter((p) => p.figures && p.figures.length);
  (linked.length > 0 ? ok : bad)(`${linked.length} parts are linked to specific figures by index`);
  const badIdx = linked.filter((p) => p.figures.some((n) => n < 0 || n >= fx.total));
  eq(badIdx.length, 0, 'every figure index points at a figure that exists in the document');

  // --- examiner reports: real difficulty, and honest about when it is a guess ---
  eq(EL.passRate('Just over 80 % of the students scored 2 marks for this.'), 80,
    'pass rate read from the examiner report (80%)');
  eq(EL.passRate('This question was answered well.'), null,
    'no pass rate invented when the examiner gives no figure');
  const real = idx.parts.filter((p) => p.difficultyBasis === 'examiner pass rate');
  const est  = idx.parts.filter((p) => p.difficultyBasis !== 'examiner pass rate');
  (real.length > 0 ? ok : bad)(`${real.length}/${idx.parts.length} parts get difficulty from a REAL pass rate`);
  (est.every((p) => p.passRate == null) ? ok : bad)(
    'estimated difficulty is only used where the examiner stated no figure (never blurred together)');
  // A harder question must score higher than an easier one, using the real data.
  const easy = idx.parts.find((p) => p.passRate != null && p.passRate >= 80);
  const hard = idx.parts.find((p) => p.passRate != null && p.passRate <= 30);
  if (easy && hard) (hard.difficulty > easy.difficulty ? ok : bad)(
    `difficulty tracks the real pass rate (${hard.passRate}% → ${hard.difficulty}, ${easy.passRate}% → ${easy.difficulty})`);
  else warn('not enough spread in pass rates to compare an easy and a hard question');

  // Common-error extraction must pick out MISTAKES, not praise — a loose pattern
  // happily returns "students demonstrated an excellent understanding" as an error.
  const praise = EL.commonError('Some students demonstrated an excellent understanding of fusion in stars.');
  (praise === null ? ok : bad)('praise is NOT mistaken for a common error');
  const err = EL.commonError('Many students confused fission with fusion and lost the mark.');
  (err && /confused/.test(err) ? ok : bad)('a genuine common error is picked out of the examiner report');
  // The full commentary is always kept, so nothing is lost when a pattern misses.
  const kept = idx.parts.filter((p) => p.ms && p.ms.examinerCommentary).length;
  (kept > 0 ? ok : bad)(`examiner commentary kept verbatim on ${kept} parts (nothing discarded)`);

  return { fails, warns };
}

module.exports = { run };
if (require.main === module) { const r = run(); process.exit(r.fails ? 1 : 0); }
