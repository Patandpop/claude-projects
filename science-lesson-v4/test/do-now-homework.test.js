'use strict';
// do-now-homework.test.js — a Do Now never repeats a question the class has had (or has now) as
// homework or exam practice (2026-10-10). Needs the exam library and planner data on this PC.

const fs = require('fs');
const path = require('path');
const GRN = '\x1b[32m', RED = '\x1b[31m', YEL = '\x1b[33m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── Do Nows skip homework questions');
  const root = path.join(__dirname, '..');
  if (!fs.existsSync(path.join(root, 'exam-library', 'docs-ocr')) || !fs.existsSync(path.join(root, 'planner', 'planner-data.json'))) {
    console.log(`  ${YEL}!${RST} exam library or planner data missing here: not checked`); return { fails, warns: 1 };
  }
  const dn = require('../science-lesson/references/do-now-pick.js');
  // a made-up homework list: one whole A-level question, one AQA part
  const ocrDoc = fs.readdirSync(path.join(root, 'exam-library', 'docs-ocr')).find((f) => /Stars\.json$/.test(f) && !/Radiation/.test(f)).replace(/\.json$/, '');
  const ocrQ = require(path.join(root, 'exam-library', 'docs-ocr', ocrDoc + '.json')).parts[0];
  const keys = dn.homeworkKeys('13D', { '13D:homework': [`${ocrDoc}#Q${ocrQ.question}`] });
  check(keys.has(dn.HW_KEY(ocrQ.text)), 'a whole homework question is found by its wording (every part of it)');
  const legacy = dn.homeworkKeys('13D', { '13D:homework': [`${ocrDoc}.json#Q${ocrQ.question}`] });
  check(legacy.has(dn.HW_KEY(ocrQ.text)), 'an old-style reference with ".json" still matches');
  // the real lists: no Do Now picked for 13D is one of its homework questions
  const real = dn.homeworkKeys('13D');
  const r = dn.pick('13D', { date: '2026-10-12' });
  check(r.picked.every((p) => !real.has(dn.HW_KEY(p.q))), `13D Do Now (${r.picked.length} questions) repeats none of its ${real.size} homework questions`);
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
