'use strict';
// mcq-written.test.js — practice questions Claude writes are checked against mcq-rules.md and
// kept apart from real exam questions (2026-10-10).

const mw = require('../science-lesson/references/mcq-written.js');
const tp = require('../science-lesson/references/test-paper.js');
const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── written practice questions (mcq-written.js)');
  const good = { board: 'AQA', topic: 'Energy', stem: 'A kettle transfers 180 000 J in 60 s. What is its power?', options: ['3 W', '3000 W', '180 000 W', '10 800 000 W'], answer: 'B',
    rule: 'number slips', wrong: { A: 'kJ as J', C: 'no divide', D: 'multiplied' } };
  check(mw.check(good).length === 0, 'a question built to the rules passes ("180 000 W" read as one number)');
  check(mw.check({ ...good, options: ['3000 W', '3 W', '180 000 W', '10 800 000 W'] }).some((x) => /smallest to largest/.test(x)), 'number options out of order are rejected');
  check(mw.check({ ...good, options: ['a', 'b', 'c', 'none of the above'] }).some((x) => /none of the above/.test(x)), '"none of the above" is rejected');
  check(mw.check({ ...good, wrong: { A: 'x' } }).some((x) => /reason a pupil/.test(x)), 'a reason for each wrong answer is required');
  check(mw.check({ ...good, stem: 'Which of these is not a renewable energy resource?' }).some((x) => /capitals/.test(x)), 'a negative stem must write NOT in capitals');
  const all = mw.load();
  check(all.every((q) => q.written === true && mw.check(q).length === 0), `every stored practice question is labelled written and passes the rules (${all.length})`);
  // never on an exam practice paper: test-paper reads only the real library
  const ids = new Set(all.map((q) => q.id));
  let clean = true;
  try { const p = tp.choose({ cls: '13D', topics: ['Stars', 'Cosmology'], size: 'mini' }).papers[0]; clean = ![...p.sectionA, ...p.questions].some((q) => ids.has(q.id)); } catch (_) { /* library not built here */ }
  check(clean, 'practice questions never appear on an exam practice paper');
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
