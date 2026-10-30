'use strict';
// mcq-lint.test.js — flag-only checks on lesson MCQs (workplan 4.11, 2026-10-29). Made-up questions only.
const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';
function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── MCQ checks on built lessons (flag only)');
  const ml = require('../science-lesson/references/mcq-lint.js');
  const good = { type: 'mcq', q: 'Which organelle is the site of photosynthesis?', options: ['Nucleus', 'Chloroplast', 'Ribosome', 'Vacuole'], answer: 'B',
    why: { A: 'thinks the nucleus does every job', C: 'confuses making protein with making glucose', D: 'thinks storing sap makes food' } };
  check(ml.lintItem(good).length === 0, 'a well-built question has no flags');
  const long = Object.assign({}, good, { options: ['Nucleus', 'The chloroplast, where light energy is absorbed by chlorophyll', 'Ribosome', 'Vacuole'] });
  check(ml.lintItem(long).some((x) => /give-away/.test(x)), 'the right answer being clearly the longest is flagged');
  const nowhy = Object.assign({}, good, { why: { A: 'x' } });
  check(ml.lintItem(nowhy).some((x) => /no "why" for wrong options C, D/.test(x)), 'wrong options without their mistake are named');
  const nums = { type: 'mcq', q: 'What is the power of the heater in watts?', options: ['2000', '20', '200', '20 000'], answer: 'A', why: { B: 'a', C: 'b', D: 'c' } };
  check(ml.lintItem(nums).some((x) => /smallest to largest/.test(x)), 'number options out of order are flagged');
  const six = ['A', 'B', 'B', 'B', 'C', 'C'].map((a) => Object.assign({}, good, { answer: a }));
  const r = ml.lintLesson({ build: six });
  check(r.set.some((x) => /D never the answer/.test(x)) && r.set.some((x) => /B is the answer more than twice/.test(x)), 'a lesson\'s answer letters: an unused letter and one used more than twice are flagged');
  const before = JSON.stringify(six); ml.lintLesson({ build: six });
  check(JSON.stringify(six) === before, 'flag only: the lesson is never changed');
  return { fails, warns: 0 };
}
module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
