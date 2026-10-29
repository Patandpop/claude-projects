'use strict';
// exam-topic-check.test.js — exam questions filed under the wrong topic are corrected before any
// picker sees them (exam-categories-apply.js), and the exam picker's 2026-10-09 guards. Pure.

const { applyToCatalogue, correctDoc } = require('../science-lesson/references/exam-categories-apply.js');
const { figureGap } = require('../science-lesson/references/exam-topic-check.js');
const ep = require('../science-lesson/references/exam-pick.js');
const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── exam topic corrections');

  const fx = {
    moves: { 'P-Energy-Res#Q1': { topic: 'Forces', subtopic: 'Acceleration' } },
    dropped: { 'P-Energy-Res#Q2': { kept: 'P-Forces-Grav#Q9' } },
    offTopic: { 'P-Energy-Res#Q3': {} },
    figureGap: { 'P-Energy-Res#Q4': 'asks about Figure 2' },
  };
  const row = (q, part) => ({ doc: 'P-Energy-Res', q, part, subject: 'Physics', topic: 'Energy', subtopic: 'National and Global Energy Resources' });
  const cat = applyToCatalogue({ parts: [row(1, 'a'), row(1, 'b'), row(2, 'a'), row(3, 'a'), row(4, 'a'), row(5, 'a')] }, fx);
  check(cat.parts.filter((r) => r.q === 1).every((r) => r.topic === 'Forces' && r.subtopic === 'Acceleration' && r.labelledTopic === 'Energy'),
    'a mislabelled question moves to its real topic (every part), keeping the old label for reference');
  check(!cat.parts.some((r) => [2, 3, 4].includes(r.q)), 'wrongly filed copies, clearly off-topic and picture-missing questions are removed');
  check(cat.parts.some((r) => r.q === 5 && r.topic === 'Energy'), 'everything else is untouched');
  const again = applyToCatalogue(cat, { moves: { 'P-Energy-Res#Q5': { topic: 'X', subtopic: 'Y' } } });
  check(again.parts.find((r) => r.q === 5).topic === 'Energy', 'corrections are applied once per catalogue, never twice');

  const groups = correctDoc('P-Energy-Res', { subject: 'Physics', topic: 'Energy', subtopic: 'Res', parts: [{ question: 1 }, { question: 2 }, { question: 5 }] }, fx);
  check(groups.length === 2 && groups.find((g) => g.topic === 'Forces').parts.length === 1 && groups.find((g) => g.topic === 'Energy').parts.length === 1,
    'Do Now seeding: a doc splits into its corrected topics, dropped copies left out');

  check(figureGap({ text: 'Use Figure 1. Figure 2 shows the demand.', figs: 1 }) && !figureGap({ text: 'Use Figure 1.', figs: 1 }),
    'a question naming Figure 2 with only one picture is caught');

  const q = (text, figs) => ({ parts: [{ text }], text, figs: Array(figs).fill({}) });
  check(ep.damaged(q('Use data from Figure 1. Figure 2 shows the demand for electricity.', 1)), 'exam picker: "Figure 2" with one picture counts as damaged');
  check(!ep.damaged(q('Use data from Figure 1 to find the power.', 1)), 'exam picker: "Figure 1" with one picture is fine');
  check(ep.paperOnly(q('Complete the boxes on the chart to show what happens to the energy.', 1)), 'exam picker: "complete the boxes" needs the printed paper, never on the board');

  const before = process.env.NO_UPLOAD;
  process.env.NO_UPLOAD = '1';
  const fs = require('fs');
  const had = fs.existsSync(ep.USAGE) ? fs.readFileSync(ep.USAGE, 'utf8') : null;
  ep.recordUse('TEST-CLASS', ['X#Q1']);
  const now = fs.existsSync(ep.USAGE) ? fs.readFileSync(ep.USAGE, 'utf8') : null;
  check(had === now, 'a check build (NO_UPLOAD) does not use up a class\'s exam questions');
  if (before === undefined) delete process.env.NO_UPLOAD; else process.env.NO_UPLOAD = before;

  console.log('── automatic Do Now (2026-10-09 fixes)');
  const dp = require('../science-lesson/references/do-now-pick.js');
  check(dp.shown({ type: 'recall', answer: 'D\n1', text: 'Which is correct?\nA one\nB two\nC three\nD four' }).a === 'D: four',
    'a multiple choice answer names its option, even with a stray mark number');
  const lum = dp.shown({ type: 'mcq', answer: 'B', text: 'What is the luminosity?\n0.48 L\n0.52 L\n0.83 L\n0.85 L' });
  check(/\nA 0\.48 L\nB 0\.52 L/.test(lum.q) && lum.a === 'B: 0.52 L', 'options that lost their A-D letters get them back');
  check(dp.shown({ answer: 'zinc for; mark', text: 'x' }).a === 'zinc' && dp.shown({ answer: '90% or 0.9(0) an answer of 0.9(0) with a unit gains; mark', text: 'x' }).a === '90% or 0.9(0)',
    'mark-scheme notes are trimmed off answers');
  const Ls = [{ k: 1, title: 'Photosythesis', subject: 'Biology', words: dp.words('Photosythesis'), date: '2026-10-02' },
    { k: 2, title: 'Starch in Leaves', subject: 'Biology', words: dp.words('Starch in Leaves'), date: '2026-10-09' }];
  check((dp.bestLesson({ source: 'own', text: 'Write the word equation for photosynthesis.', askedAt: '2026-10-08', lesson: 'Starch in Leaves' }, Ls) || {}).k === 1,
    'your own Do Now matches the lesson it is about (spelling slips forgiven), not the lesson it was asked in');
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
