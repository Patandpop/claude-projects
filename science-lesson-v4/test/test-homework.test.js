'use strict';
// test-homework.test.js — checks for the test-ready homework (science-lesson/references/test-homework.js).
// Pure parts (tick boxes, word boxes, mark-scheme points) always run; the real-class plan runs only at
// home, where the Drive Assessment folders are mounted (G:), and never writes anything.

const fs = require('fs');
const path = require('path');
const th = require('../science-lesson/references/test-homework.js');

const GRN = '\x1b[32m', RED = '\x1b[31m', DIM = '\x1b[2m', RST = '\x1b[0m';

function run() {
  let fails = 0, warns = 0;
  const pass = (m) => console.log(`  ${GRN}✓${RST} ${m}`);
  const fail = (m) => { console.log(`  ${RED}✗${RST} ${m}`); fails++; };
  const check = (c, m) => (c ? pass(m) : fail(m));
  console.log('── test-ready homework');

  // mark schemes: one line per marking point, alternatives underneath
  const pts = th.msPoints('use a tape measure allow use a metre rule allow use a laser measure 1 one person holding the top or take repeat readings and calculate a mean 1');
  check(pts.length === 2 && pts[0].text === 'use a tape measure' && pts[0].also.length === 2 && pts[0].marks === 1,
    'mark scheme splits into marking points with their "allow" alternatives');
  const calc = th.msPoints('Ep = 45 × 9.8 × 2.0 an answer of 880 (J) or 882 (J) scores 2 marks 1 Ep = 880 (J) 1');
  check(calc.length === 2 && calc[1].text === 'Ep = 880 (J)', 'numbers in a calculation ("scores 2 marks") are not mistaken for mark totals');
  const any3 = th.msPoints('any 3 from: • change in height • mass • speed 3');
  check(any3[0].heading && any3.filter((x) => x.bullet).length === 3, '"any 3 from" lists become bullet lines');
  check(!th.msPoints('no fuel is burnt do not accept wind is natural 1')[0].also.some((a) => /^do not$/.test(a)), '"do not accept" stays one alternative');

  // tick boxes rebuilt from the library's box images (needs the exam-library figures)
  const figs = path.join(__dirname, '..', 'exam-library', 'figures', 'a43b0cc864a51847.jpg');
  if (fs.existsSync(figs)) {
    const part = { text: 'What is the name of the male gamete? Tick (✓) one box. Embryo [FIG:3] Ovum [FIG:4] Pollen [FIG:5]', figures: [3, 4, 5], figureFiles: ['a43b0cc864a51847.jpg', 'a43b0cc864a51847.jpg', 'a43b0cc864a51847.jpg'] };
    const tb = th.tickBox(part);
    check(tb && tb.options.length === 3 && tb.options.map((o) => o[0].t.trim()).join(',') === 'Embryo,Ovum,Pollen', 'tick-box options are read as options, not run into the question');
  } else { console.log(`  ${DIM}- exam-library figures not here: tick-box check skipped${RST}`); }

  // the real thing, at home only
  if (fs.existsSync('G:/My Drive/Beechen Cliff Science/Admin/Assessment') && fs.existsSync(path.join(__dirname, '..', 'planner', 'planner-data.json'))) {
    const p = th.plan('10C2', { marks: 20, inBooks: true });
    check(p.chosen.length >= 3 && p.marks >= 15 && p.marks <= 26, `10C2 P1 Energy: ${p.chosen.length} questions, ${p.marks} marks`);
    check(p.why['IN THE TEST'] > 0 && p.test.files.length > 0, `questions from the real P1 test are recognised and left out (${p.why['IN THE TEST']} found)`);
    check(p.chosen.every((q) => q.plc.length > 0), 'every question is labelled with the test-checklist statements it practises');
    check(p.chosen.every((q) => q.subject === 'Physics' && q.topic === 'Energy'), 'every question is from the Energy topic');
    const x = th.plan('9XS', { marks: 20, inBooks: true });
    check(!x.plc.find((s) => /osmosis/i.test(s.text) && s.covered), '9XS: osmosis (not taught yet) is not practised');
  } else { console.log(`  ${DIM}- Drive not mounted: real-class checks skipped${RST}`); }
  return { fails, warns };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
