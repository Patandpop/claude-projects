#!/usr/bin/env node
// review-check.js — check a test-review lesson's JSON before building (Patryk 2026-10-15).
//
//   1. Paper order: the questions go through each paper in order, part by part. A quick-answer
//      table may not hold a later part (Q4(g)) ahead of a model answer for an earlier one (Q4(e)):
//      split the table instead. Checked separately for the Core and the Challenge numbering.
//   2. Highlights = marks: a model answer worth N marks shows N numbered highlights ({1}..{N}),
//      one per mark, each matched to a mark-scheme point with "mark": n. A 6-marker shows 6,
//      levelled or not (9XS P3 review: the 6-mark eureka-can method showed only 4).
//
//   node review-check.js lessons.json      -> lists problems, exit 1 if any
// Local only. Reads the JSON, never changes it.
'use strict';

const fs = require('fs');

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
// "4(c)(ii)" -> [4, 3, 2]; "Q2" -> [2]
function partKey(ref) {
  const s = String(ref || '').replace(/^Q/i, '').trim();
  const m = s.match(/^(\d+)/);
  if (!m) return null;
  const key = [Number(m[1])];
  for (const [, p] of s.slice(m[1].length).matchAll(/\(([a-z]+)\)/gi)) {
    const low = p.toLowerCase();
    key.push(key.length === 1 ? low.charCodeAt(0) - 96 : (ROMAN[low] || low.charCodeAt(0) - 96));
  }
  return key;
}
function cmp(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] == null ? 0 : a[i], y = b[i] == null ? 0 : b[i];
    if (x !== y) return x - y;
  }
  return 0;
}

// Every question reference in build order: { paper, ref, where }
function refsInOrder(L) {
  const out = [];
  (L.build || []).forEach((b, i) => {
    const t = b.type || b.variant;
    const add = (o, where) => ['core', 'extend'].forEach((paper) => { if (o[paper]) out.push({ paper, ref: o[paper], where }); });
    if (t === 'modelAnswerReview') add(b, `model answer #${i + 1}`);
    else if (t === 'answerList') (b.rows || []).forEach((r) => add(r, `quick answers #${i + 1} ("${b.heading || ''}")`));
  });
  return out;
}

function check(L) {
  const problems = [];
  // 1. order, per paper
  for (const paper of ['core', 'extend']) {
    let last = null;
    for (const r of refsInOrder(L).filter((x) => x.paper === paper)) {
      const k = partKey(r.ref);
      if (!k) continue;
      if (last && cmp(k, last.k) < 0) problems.push(`order: ${paper === 'core' ? 'Core' : 'Challenge'} Q${r.ref} (${r.where}) comes after Q${last.ref} (${last.where}). Keep the paper's order: split the quick-answer table around the model answers.`);
      else last = { k, ref: r.ref, where: r.where };
    }
  }
  // 2. one highlight per mark
  (L.build || []).forEach((b, i) => {
    if ((b.type || b.variant) !== 'modelAnswerReview' || !(b.marks >= 2)) return;
    const name = `Q${b.core || b.extend || b.questionNumber || '?'} (model answer #${i + 1}, ${b.marks} marks)`;
    const text = JSON.stringify(b.modelAnswer || '');
    const tags = [...new Set([...text.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1])))].sort((a, c) => a - c);
    if (tags.length < b.marks) problems.push(`highlights: ${name} shows ${tags.length} highlight(s); it needs ${b.marks}, one per mark ({1}..{${b.marks}}).`);
    const numbered = new Set((b.indicativeContent || []).filter((p) => p && p.mark != null).map((p) => Number(p.mark)));
    const lonely = tags.filter((n) => !numbered.has(n));
    if (lonely.length) problems.push(`highlights: ${name} has highlight ${lonely.join(', ')} with no mark-scheme point marked "mark": ${lonely.join('/')}.`);
  });
  return problems;
}

module.exports = { check, partKey };

if (require.main === module) {
  const f = process.argv[2];
  if (!f) { console.error('usage: node review-check.js lessons.json'); process.exit(1); }
  let bad = 0;
  for (const L of [].concat(JSON.parse(fs.readFileSync(f, 'utf8')))) {
    if ((L.meta || {}).lessonType !== 'review') continue;
    const p = check(L);
    console.log(`${(L.meta || {}).class} ${(L.meta || {}).title}: ${p.length ? p.length + ' problem(s)' : 'clean'}`);
    p.forEach((x) => console.log('  - ' + x));
    bad += p.length;
  }
  process.exit(bad ? 1 : 0);
}
