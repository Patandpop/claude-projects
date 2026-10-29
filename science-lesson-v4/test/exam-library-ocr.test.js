'use strict';
// exam-library-ocr.test.js — the A-level (OCR ExamBuilder) reader keeps pictures, tables and the
// multiple-choice letters (2026-10-10). Synthetic html only: needs no Drive and no library.

const ocr = require('../science-lesson/references/exam-library-ocr.js');
const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';

const IMG = (name) => `<img width="100" height="50" src=https://exambuilder.ocr.org.uk/core/files/questions_migrate/123/H556-01%20Jun24/img/${name}" data-fallback="/x">`;
const BOX = '<img width="31" height="31" src=https://exambuilder.ocr.org.uk/core/files/questions_migrate/123/H556/img/square_150.png">';
const html = [
  '<div><span>1.</span><span>A satellite of mass 320 kg is lifted to an orbit.<br>What is the change in energy?',
  '<ol type="A"><li>9.1 &times; 10<sup>2</sup> J</li><li>9.9 &times; 10<sup>6</sup> J</li><li>3.2 J</li><li>3.8 J</li></ol>',
  `Your answer ${BOX} <b>[1]</b></span></div>`,
  `<div><span>2.</span><span>What is the escape velocity?<table><tr><td><b>A</b></td><td>${IMG('pg10_QP_01_150.png')}</td></tr>`,
  `<tr><td><b>B</b></td><td>${IMG('pg10_QP_02_150.png')}</td></tr><tr><td><b>C</b></td><td>2<i>rg</i></td></tr><tr><td><b>D</b></td><td>rg</td></tr></table>`,
  `Your answer ${BOX} <b>[1]</b></span></div>`,
  '<div><span>3.</span><span>The table shows data.<table class="table_hasborders"><tr><td>Star</td><td>T / K</td></tr><tr><td>Vega</td><td>9.3 &times; 10<sup>3</sup></td></tr></table>',
  '<ol class="oltype_i" type="i"><li>Calculate the speed. <div align="right"><strong>[2]</strong></div></li></ol><ol class="oltype_i" start="2" type="i"><li>Explain why. <strong>[3]</strong></li></ol></span></div>',
  '<p>END OF QUESTION PAPER</p><p>Mark scheme</p><p>Question Answer Marks Guidance</p>',
  '<table><tr><td>1</td><td>C</td><td>1</td></tr><tr><td>Total 1</td></tr><tr><td>2</td></tr><tr><td>A</td><td>1</td></tr><tr><td>Total 1</td></tr>',
  '<tr><td>3 i</td><td>v = 3 m s<sup>&minus;</sup><sup>1</sup></td></tr><tr><td>Total 5</td></tr></table>',
].join('\n');

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── A-level exam reader (pictures, tables, multiple choice)');
  const { questions, figs } = ocr.parseExport('', html);
  const [q1, q2, q3] = questions;
  check(questions.length === 3, `three questions read (${questions.length})`);
  const p1 = q1 && q1.parts[0];
  check(p1 && p1.mcqAnswer === 'C' && p1.mcqOptions && p1.mcqOptions.length === 4 && p1.mcqOptions[0] === 'A 9.1 × 10^2 J',
    'lettered list options get their letters back; a stem line "A satellite ..." is not taken for option A');
  const p2 = q2 && q2.parts[0];
  check(p2 && p2.mcqAnswer === 'A' && /^A \[FIG:\d+\]$/.test(p2.mcqOptions[0]) && p2.figureKeys.length === 2,
    'picture options are kept as pictures, and the answer letter on its own line is found');
  check(figs.length === 2 && figs.every((k) => /^questions_migrate\/123\/h556-01 jun24\/img\/pg10_qp_0\d_150\.png$/.test(k)), 'answer boxes are not pictures; picture addresses are decoded (%20)');
  const parts3 = (q3 && q3.parts) || [];
  check(parts3.length === 2 && /\[TABLE:0\]/.test(parts3[0].text) && parts3[0].tables[0].rows[1][1] === '9.3 × 10^3', 'a real table is kept as rows and cells');
  check(/\(i\) Calculate/.test(parts3[0].text) && /^\(ii\) Explain/.test(parts3[1].text), 'numbered parts keep their own labels, (i) then (ii) (lists that restart at 2)');
  check(/m s\^−1/.test(parts3[0].ms.text), 'a power written in two raised pieces is joined (s^−1)');
  const lt = ocr.pageText('', '<p>Q?</p><table><tr><td>A</td><td>0 &lt; <em>F</em><sub>2</sub> &lt; 0.25<em>F</em><sub>1</sub></td></tr><tr><td>B</td><td>b</td></tr><tr><td>C</td><td>c</td></tr><tr><td>D</td><td>d</td></tr></table><p>A.&#65279; main</p><p>END OF QUESTION PAPER</p>');
  check(lt[1] === 'A 0 < F_2 < 0.25F_1' && lt[5] === 'A main', 'options with < and > survive, italics leave no gap (F_2), "A." reads as option A');
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
