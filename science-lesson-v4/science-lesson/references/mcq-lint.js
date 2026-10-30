#!/usr/bin/env node
'use strict';
/* ============================================================================
   mcq-lint.js — flags weak multiple-choice questions in built lessons (workplan 4.11, 2026-10-29).
   FLAG ONLY: it reads, prints and never changes a lesson.

   For every lesson-content.json in the project's lesson folders (or the files named), each MCQ in
   the Build section is checked against the machine-checkable rules in mcq-rules.md (the same checks
   mcq-written.js uses for written practice questions, minus the ones that only apply to stored
   practice questions), and each lesson's set of MCQs against the spread rule (every letter used,
   none more than twice in a lesson's 6).
     - answer is the longest option by a clear margin (a give-away)
     - option lengths very uneven; two options the same; "all/none of the above"
     - number options not smallest to largest
     - a wrong option with no "why" (the mistake it catches)
     - negative stem not in capitals
   Usage: node references/mcq-lint.js [lesson-content.json ...] [--json]
   ============================================================================ */
const fs = require('fs');
const path = require('path');
const mw = require('./mcq-written.js');
const ROOT = path.join(__dirname, '..', '..');

// checks that do not apply to a lesson MCQ (they are about the stored practice questions)
const STORE_ONLY = /^(say which rule|board must be|topic missing|give the reason a pupil)/;
const strip = (s) => String(s == null ? '' : s).replace(/\{\/?k\}/g, '').replace(/^[A-D][.):]\s*/, '').trim();

function lintItem(b) {
  const options = Array.isArray(b.options) ? b.options.map(strip) : ['A', 'B', 'C', 'D'].map((k) => strip((b.options || {})[k]));
  const answer = String(b.answer || '').trim().toUpperCase().slice(0, 1);
  const q = { stem: strip(b.q || b.question), options, answer };
  // the give-away rule only when the answer is clearly longer in letters too (Chloroplast against Ribosome is fine)
  const L = options.map((x) => x.length), ai = 'ABCD'.indexOf(answer), next = Math.max(...L.filter((l, i) => i !== ai));
  const out = mw.check(q).filter((x) => !STORE_ONLY.test(x) && !(/give-away/.test(x) && L[ai] - next <= 8));
  const why = b.why || b.wrong || {};
  const missing = 'ABCD'.split('').filter((L) => L !== answer && !String(why[L] || '').trim());
  if (missing.length) out.push('no "why" for wrong option' + (missing.length > 1 ? 's ' : ' ') + missing.join(', '));
  return out;
}
function lintLesson(L) {
  const items = (Array.isArray(L.build) ? L.build : []).filter((b) => ['mcq', 'mcq_image'].includes(b.type || b.variant));
  const flags = items.map((b, i) => ({ n: i + 1, q: strip(b.q || b.question).slice(0, 70), problems: lintItem(b) })).filter((x) => x.problems.length);
  const letters = items.map((b) => String(b.answer || '').trim().toUpperCase().slice(0, 1));
  const set = [];
  if (items.length >= 4) {
    const unused = 'ABCD'.split('').filter((L) => !letters.includes(L));
    const over = 'ABCD'.split('').filter((L) => letters.filter((x) => x === L).length > 2);
    if (unused.length) set.push('letter' + (unused.length > 1 ? 's ' : ' ') + unused.join(', ') + ' never the answer');
    if (over.length) set.push(over.join(', ') + ' is the answer more than twice');
  }
  return { mcqs: items.length, flags, set };
}
function lessonFiles() {
  const out = [];
  for (const d of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const f = path.join(ROOT, d.name, 'lesson-content.json');
    if (fs.existsSync(f)) out.push(f);
  }
  return out;
}

module.exports = { lintItem, lintLesson, lessonFiles };

if (require.main === module) {
  const args = process.argv.slice(2), files = args.filter((a) => !a.startsWith('--'));
  const report = [];
  for (const f of files.length ? files : lessonFiles()) {
    let L; try { L = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { continue; }
    (Array.isArray(L) ? L : [L]).forEach((x) => { const r = lintLesson(x); if (r.flags.length || r.set.length) report.push(Object.assign({ file: path.relative(ROOT, f), title: (x.meta || {}).title || '' }, r)); });
  }
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 1));
  else {
    report.forEach((r) => {
      console.log(`\n${r.file}${r.title ? ' (' + r.title + ')' : ''}: ${r.mcqs} MCQs`);
      r.set.forEach((x) => console.log('  set: ' + x));
      r.flags.forEach((x) => console.log(`  Q${x.n} "${x.q}": ${x.problems.join('; ')}`));
    });
    console.log(`\n${report.length} lesson(s) with something to look at. Flags only: nothing was changed.`);
  }
}
