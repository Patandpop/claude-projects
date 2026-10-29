'use strict';
// Learning loop M6 (2026-10-22): spaced homework reads the class's results (class counts only, from the
// school planner) and maps each weak question back to the lesson it tests, through the quiz file.
const hf = require('../science-lesson/references/homework-forms.js');

function run() {
  let fails = 0;
  const check = (c, m) => { console.log((c ? '  \x1b[32m✓\x1b[0m ' : '  \x1b[31m✗ FAIL\x1b[0m ') + m); if (!c) fails++; };
  console.log('\n── spaced homework (learning loop M6)');
  const results = [
    { cls: '9XS', file: 'hw-a.json', done: 20, questions: [{ key: '1', pct: 35 }, { key: '2', pct: 90 }, { key: '3', pct: 55 }] },
    { cls: '9XS', file: 'hw-b.json', done: 18, questions: [{ key: '1', pct: 45 }] },
    { cls: '9XS', file: 'hw-c.json', done: 0, questions: [{ key: '1', pct: 0 }] },          // nobody did it: ignored
    { cls: '9AS', file: 'hw-a.json', done: 20, questions: [{ key: '2', pct: 10 }] },         // another class: ignored
  ];
  const quizFiles = {
    'hw-a.json': { questions: [{ lesson: 'Specialised Cells' }, { lesson: 'Prokaryotic Cells' }, { lesson: 'Changing States' }] },
    'hw-b.json': { questions: [{ lesson: 'Specialised Cells' }] },
    'hw-c.json': { questions: [{ lesson: 'Latent Heat' }] },
  };
  const w = hf.weakLessons('9XS', { results, quizFiles });
  check(w['Specialised Cells'] === 35 && w['Changing States'] === 55, 'weak lessons: under 60%, worst score kept per lesson');
  check(!('Prokaryotic Cells' in w) && !('Latent Heat' in w), 'weak lessons: 90% is not weak; a homework nobody did and other classes are ignored');
  return { fails, warns: 0 };
}
module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
