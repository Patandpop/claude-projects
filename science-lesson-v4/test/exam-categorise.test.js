'use strict';
// exam-categorise.test.js — question kinds and self-marking multiple choice (exam-categorise.js). Pure.

const { categorise } = require('../science-lesson/references/exam-categorise.js');
const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── exam question kinds');

  const tick = categorise({ text: 'Why did the student insulate the beaker? Tick (✓) one box. To increase energy transfer. [FIG:1] To reduce energy transfer. [FIG:2] To stop energy transfer. [FIG:3]',
    marks: 1, commandWord: 'Tick', ms: { text: 'to reduce energy transfer 1' } });
  check(tick.cat === 'mcq' && tick.auto && tick.mcq.answer === 1 && tick.mcq.options.length === 3, 'AQA "tick one box": options read, the right one found from the mark scheme');
  const unsure = categorise({ text: 'Which? Tick (✓) one box. Energy. [FIG:1] Energy transfer. [FIG:2]', marks: 1, ms: { text: 'energy 1' } });
  check(!unsure.auto, 'when the mark scheme matches more than one option, it is NOT self-marked');
  const ocr = categorise({ text: 'Which is correct?\nA one\nB two\nC three\nD four', marks: 1, mcqAnswer: 'C', mcqOptions: ['A one', 'B two', 'C three', 'D four'] });
  check(ocr.auto && ocr.mcq.answer === 2 && ocr.mcq.options[2] === 'three', 'OCR A-D: the letter becomes the right option');
  check(categorise({ text: 'Calculate the kinetic energy of the car.', commandWord: 'Calculate', marks: 2, ms: { text: '' } }).cat === 'calculation', 'calculate -> calculation');
  check(categorise({ text: 'Explain why the rate increases.', commandWord: 'Explain', marks: 6, ms: { levels: [1] } }).cat === 'extended', 'levelled 6-marker -> extended');
  check(categorise({ text: 'Name the organ which makes urea.', commandWord: 'Name', marks: 1, ms: { text: 'liver 1' } }).cat === 'recall', 'name -> recall');
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
