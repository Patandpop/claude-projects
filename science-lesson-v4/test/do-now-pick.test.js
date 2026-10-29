'use strict';
// do-now-pick.test.js — the Do Now picker matches questions with lesson-match.js, fills lessons the
// class bank misses from the wide pool (question-pool.js), and aims for the mix: 4 short recall,
// one 2-mark explain, one calculation (2026-10-29, workplan 2.1). Needs the exam library and
// planner data on this PC.

const fs = require('fs');
const path = require('path');
const GRN = '\x1b[32m', RED = '\x1b[31m', YEL = '\x1b[33m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── Do Now picker (lesson match, wide pool, the mix)');
  const root = path.join(__dirname, '..');
  const lm = require('../science-lesson/references/lesson-match.js');

  // answering instructions are not the topic; one stem is one hit
  const micro = lm.specFor({ topic: 'B1 Cells', title: 'Microscope Types and Biological Drawings' });
  check(micro && !lm.hitsIn('Complete the sentence by drawing a ring around the correct answer in the box. Water entered by osmosis', micro.words).length,
    '"drawing a ring around" is not a Biological Drawings question');
  check(lm.distinct(lm.hitsIn("Carbon dioxide in the atmosphere", ["atmosphere", "atmospher"])) === 1, '"atmosphere" and "atmospher" count as one word hit');

  const dn = require('../science-lesson/references/do-now-pick.js');
  // a multiple choice whose question opens with "A ..." keeps its real option A
  const mc = dn.shown({ type: 'mcq', answer: 'A', text: 'A cylinder has resistance 24 Ω.\nWhat is the resistivity?\nA 0.13 Ω m\nB 0.50 Ω m\nC 7.9 Ω m\nD 25 Ω m' });
  check(mc.a === 'A: 0.13 Ω m', `a stem opening "A cylinder..." is not option A (answer shown: ${mc.a})`);

  if (!fs.existsSync(path.join(root, 'exam-library', 'docs')) || !fs.existsSync(path.join(root, 'planner', 'planner-data.json'))) {
    console.log(`  ${YEL}!${RST} exam library or planner data missing here: picks not checked`); return { fails, warns: 1 };
  }
  const none = new Set();
  for (const [cls, date] of [['10C2', '2026-10-20'], ['9AS', '2026-10-20'], ['10S2', '2026-10-20']]) {
    const r = dn.pick(cls, { date, homeworkKeys: none, written: false });
    const kinds = r.picked.map((p) => (/calculate/i.test(p.q) ? 'calc' : (p.marks >= 2 && /\b(explain|describe|suggest|why|compare|evaluate|justify)\b/i.test(p.q) ? 'explain' : 'short')));
    check(r.picked.length === 6, `${cls}: six questions`);
    check(kinds.includes('calc') && kinds.includes('explain'), `${cls}: one calculation and one 2-mark explain in the six (${kinds.join(', ')})`);
    check(r.picked.every((p) => p.source !== 'AQA exam' || !lm.standalone(p.q, false)), `${cls}: every exam question stands on its own (no "in part (a)", no lost opening)`);
  }
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
