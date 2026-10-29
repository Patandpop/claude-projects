'use strict';
// review-check.test.js — test-review lessons keep paper order and show one highlight per mark (2026-10-15).
const rc = require('../science-lesson/references/review-check.js');
const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── test-review lessons: paper order, one highlight per mark');
  const k = rc.partKey;
  check(JSON.stringify(k('4(c)(ii)')) === '[4,3,2]' && JSON.stringify(k('Q3(a)(iv)')) === '[3,1,4]', 'question numbers read as question, letter, roman part');
  const ma = (core, marks, tags) => ({ type: 'modelAnswerReview', core, marks,
    modelAnswer: tags.map((n) => `{${n}}point ${n}{/${n}}`).join(' '),
    indicativeContent: tags.map((n) => ({ text: 'p' + n, mark: n })) });
  const quick = (...refs) => ({ type: 'answerList', heading: 'x', rows: refs.map((r) => ({ q: r, core: r })) });
  const lesson = (build) => ({ meta: { lessonType: 'review' }, build });
  // 9XS P3 review as first built: quick answers held 4(g) ahead of the 4(e) model answer; 6-marker had 4 highlights
  const bad = rc.check(lesson([quick('4(a)', '4(g)'), ma('4(e)', 2, [1, 2]), ma('5(a)', 6, [1, 2, 3, 4])]));
  check(bad.some((p) => /order: Core Q4\(e\)/.test(p)), 'a later part in a quick-answer table before an earlier model answer is caught');
  check(bad.some((p) => /Q5\(a\).*shows 4 highlight\(s\); it needs 6/.test(p)), 'a 6-marker with 4 highlights is caught');
  const good = rc.check(lesson([quick('4(a)'), ma('4(e)', 2, [1, 2]), quick('4(g)'), ma('5(a)', 6, [1, 2, 3, 4, 5, 6])]));
  check(good.length === 0, 'the same lesson split in paper order with 6 highlights is clean');
  const lonely = rc.check(lesson([{ type: 'modelAnswerReview', core: '1(a)', marks: 2, modelAnswer: '{1}a{/1} {2}b{/2}', indicativeContent: [{ text: 'a', mark: 1 }] }]));
  check(lonely.some((p) => /highlight 2 with no mark-scheme point/.test(p)), 'a highlight with no numbered mark-scheme point is caught');
  return { fails, warns: 0 };
}
module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
