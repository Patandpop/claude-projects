'use strict';
// do-now-bank.test.js — unit + simulation coverage for the Do Now spaced-retrieval
// selector and the exam-question sourcing. Same run()-returning shape as the other
// sub-suites; wired into test/run.js. The bank can't be tried on real classes until
// September, so this SIMULATES a term of lessons and asserts the selector behaves.

const fs   = require('fs');
const path = require('path');
const bank = require('../science-lesson/references/do-now-bank.js');

const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';

function run() {
  let fails = 0, warns = 0;
  const pass = m => console.log(`  ${GRN}✓${RST} ${m}`);
  const fail = m => { console.log(`  ${RED}✗${RST} ${m}`); fails++; };

  console.log('── do-now bank (selector + exam sourcing)');

  // ---- exam sourcing: filter is real recall, answers are clean --------------
  const idxPath = path.join(__dirname, '..', 'exam-library-index.json');
  if (fs.existsSync(idxPath)) {
    const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    const cand = bank.examPartsToBank(idx);
    if (cand.length > 0 && cand.length < idx.parts.length)
      pass(`exam sourcing keeps a recall subset (${cand.length} of ${idx.parts.length} parts)`);
    else fail(`exam sourcing kept ${cand.length} of ${idx.parts.length} — filter is off (want a strict subset)`);
    if (cand.every(q => q.marks <= 2)) pass('every exam-sourced Do Now is <= 2 marks (short recall)');
    else fail('an exam-sourced Do Now is > 2 marks — a long question slipped through');
    if (cand.every(q => q.source === 'exam' && q.examRef)) pass('exam-sourced questions keep their real-exam provenance (examRef)');
    else fail('an exam-sourced question lost its examRef — provenance broken');
    if (cand.every(q => q.answer && q.answer.length > 0)) pass('every exam-sourced Do Now has a tidied answer for slide 2');
    else fail('an exam-sourced Do Now has an empty answer');
  } else {
    warns++; console.log(`  ! exam-library-index.json absent (home-only) — exam-sourcing checks skipped`);
  }

  // A levelled / figure / high-mark part must be rejected.
  const rejects = [
    { commandWord: 'Explain', marks: 4, hasFigure: false, ms: { levels: [] } },
    { commandWord: 'State',   marks: 1, hasFigure: true,  ms: { levels: [] } },
    { commandWord: 'Describe', marks: 6, hasFigure: false, ms: { levels: [{ level: 1 }] } },
  ];
  if (rejects.every(p => !bank.isDoNowCandidate(p))) pass('long/figure/levelled parts are rejected as Do Now candidates');
  else fail('a long/figure/levelled part was accepted as a Do Now candidate');
  if (bank.isDoNowCandidate({ commandWord: 'State', marks: 1, hasFigure: false, ms: { levels: [] } }))
    pass('a 1-mark State part IS accepted');
  else fail('a 1-mark State part was wrongly rejected');

  // ---- build a synthetic per-class bank -------------------------------------
  // 8 topics, taught in order; 4 questions each. IDs let us track reuse.
  const TOPICS = ['Cells', 'Diffusion', 'Enzymes', 'Digestion', 'Circulation', 'Respiration', 'Photosynthesis', 'Ecology'];
  const makeBank = () => {
    const out = [];
    TOPICS.forEach((t, ti) => {
      for (let i = 0; i < 4; i++) out.push({ id: `q-${ti}-${i}`, text: `${t} Q${i}`, answer: 'a', topic: t, source: 'generated' });
    });
    return out;
  };

  // ---- SIMULATE a term: teach the topics in order, each lesson pull a Do Now,
  // record what was used, and assert the selector's behaviour lesson by lesson.
  const B = makeBank();
  const history = [];
  let repeatViolations = 0, spacingSeen = 0, shortfalls = 0;
  for (let lesson = 0; lesson < TOPICS.length; lesson++) {
    const currentTopic = TOPICS[lesson];
    const res = bank.selectDoNow({ bank: B, history, currentTopic, seed: 1000 + lesson });
    const ids = res.picked.map(q => q.id);

    // no id may repeat within one Do Now
    if (new Set(ids).size !== ids.length) repeatViolations++;
    // no id may repeat vs the last 4 lessons' used questions
    const recent = new Set();
    history.slice(-4).forEach(h => h.questionIds.forEach(id => recent.add(id)));
    if (ids.some(id => recent.has(id))) repeatViolations++;

    // once enough topics exist, at least one pick should come from an OLDER topic
    // (spacing actually happening, not just today's content)
    if (lesson >= 5) {
      const olderTopics = TOPICS.slice(0, lesson - 1).map(bank._norm);
      if (res.picked.some(q => olderTopics.includes(bank._norm(q.topic)))) spacingSeen++;
    }
    if (res.report.shortfall > 0) shortfalls++;

    history.push({ topic: currentTopic, questionIds: ids });
  }

  if (repeatViolations === 0) pass('simulated term: no Do Now repeated a question within the recency window');
  else fail(`simulated term: ${repeatViolations} recency/duplicate violation(s)`);
  if (spacingSeen >= 3) pass(`simulated term: spacing observed (older-topic questions pulled in ${spacingSeen} later lessons)`);
  else fail(`simulated term: spacing barely happened (${spacingSeen}) — selector is not reaching back to older topics`);

  // ---- determinism: same inputs → same picks (a Do Now must not reshuffle) ---
  const h = [{ topic: 'Cells', questionIds: [] }, { topic: 'Diffusion', questionIds: [] }];
  const a = bank.selectDoNow({ bank: B, history: h, currentTopic: 'Enzymes', seed: 42 }).picked.map(q => q.id);
  const b = bank.selectDoNow({ bank: B, history: h, currentTopic: 'Enzymes', seed: 42 }).picked.map(q => q.id);
  if (JSON.stringify(a) === JSON.stringify(b)) pass('selector is deterministic (same seed → same six)');
  else fail('selector is non-deterministic — a Do Now would reshuffle on rebuild');

  // ---- September rollover: empty history must NOT throw and still returns picks
  try {
    const fresh = bank.selectDoNow({ bank: B, history: [], currentTopic: 'Cells', seed: 7 });
    if (fresh.picked.length === 6) pass('empty lesson log (new September class) still yields a full Do Now');
    else pass(`empty lesson log yields ${fresh.picked.length} (backfilled) — no crash`);
  } catch (e) { fail('empty lesson log threw — September rollover would crash: ' + e.message); }

  // ---- thin bank: fewer questions than needed → graceful shortfall, no throw
  try {
    const tiny = [{ id: 't1', topic: 'Cells', text: 'x', answer: 'a' }, { id: 't2', topic: 'Cells', text: 'y', answer: 'a' }];
    const r = bank.selectDoNow({ bank: tiny, history: [], currentTopic: 'Cells', count: 6 });
    if (r.picked.length === 2 && r.report.shortfall === 4) pass('thin bank reports an honest shortfall (2 of 6) instead of padding or crashing');
    else fail(`thin bank behaviour wrong — picked ${r.picked.length}, shortfall ${r.report.shortfall}`);
  } catch (e) { fail('thin bank threw: ' + e.message); }

  console.log(`  ${fails ? RED : GRN}${fails} failure(s)${RST}`);
  return { fails, warns };
}

module.exports = { run };
if (require.main === module) { const r = run(); process.exit(r.fails ? 1 : 0); }
