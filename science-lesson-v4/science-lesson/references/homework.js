#!/usr/bin/env node
// homework.js — printed exam-question homework for a class (Patryk 2026-10-03: Years 10/11 now,
// Years 12/13 once OCR exam data exists; print only).
//
//   node science-lesson/references/homework.js 11S2 [--marks 35] [--date 2026-10-05] [--dry-run]
//
// What it picks:
//   - only topics the class has been TAUGHT: earlier years' topics on its route, plus this year's
//     topics whose start date (scheme-of-learning.json) has passed, in Patryk's subjects only;
//   - about 60% of the marks from the CURRENT topic, 40% from earlier topics (spaced retrieval);
//   - whole real questions, verbatim, with their real figures; a separate mark-scheme sheet with the
//     examiner's pass rates and common errors (homework-booklet.js does the printing);
//   - never a question that class has already had for homework (exam-usage.json).
// Output: homework-out/<class> <date>/ (local; Patryk prints or copies it himself).
'use strict';

const fs = require('fs');
const path = require('path');
const hb = require('./homework-booklet.js');
const ep = require('./exam-pick.js');

const ROOT = path.join(__dirname, '..', '..');
const SOL = path.join(ROOT, 'scheme-of-learning.json');
const FIGS = path.join(ROOT, 'exam-library', 'figures');

// class -> its route through the scheme of learning, oldest year first
const ROUTE = {
  '9AS': ['year9'], '9XS': ['year9'],
  '10C2': ['year9', 'year10combined'], '10S2': ['year9', 'year10separate'],
  '11S2': ['year9', 'year10separate', 'year11separate'],
};
const OCR = /^(12|13)/;

function taughtTopics(cls, today) {
  const sol = JSON.parse(fs.readFileSync(SOL, 'utf8')).keyStage3and4;
  const route = ROUTE[cls];
  const thisYear = sol[route[route.length - 1]];
  const subjects = new Set(thisYear.ownership.patrykSubjects || []);
  const iso = today.toISOString().slice(0, 10);
  const earlier = [], current = [];
  route.forEach((key, i) => {
    const last = i === route.length - 1;
    for (const t of sol[key].teachingSequence) {
      if (!subjects.has(t.subject)) continue;
      if (last && !(t.patrykTeaches && t.firstTaught && t.firstTaught <= iso)) continue;
      const code = (String(t.driveTopicFolder).match(/^([BCP]\d+)\b/) || [])[1];
      if (!code || !ep.AQA_TOPIC[code]) continue;
      const item = { code, subject: t.subject, topic: ep.AQA_TOPIC[code], folder: t.driveTopicFolder, since: t.firstTaught };
      (last ? current : earlier).push(item);
    }
  });
  const now = current.length ? current[current.length - 1] : null;
  const before = [...earlier, ...current.slice(0, -1)];
  const uniq = (xs) => xs.filter((x, i) => xs.findIndex((y) => y.topic === x.topic) === i);
  return { now, before: uniq(before).filter((x) => !now || x.topic !== now.topic) };
}

function pool(item, used) {
  return ep.candidates(item.subject, item.topic)
    .filter((q) => !used.has(q.id) && !ep.damaged(q) && !ep.noData(q) && q.marks <= 8);
}

// Fill a mark budget from one pool, easiest real-difficulty first, never overshooting by > 3.
function take(qs, budget, chosen) {
  let got = 0;
  const sorted = [...qs].sort((a, b) => (b.realDifficulty - a.realDifficulty) || (a.difficulty - b.difficulty) || a.id.localeCompare(b.id));
  // spread across the difficulty range rather than only the easiest: walk with a stride
  const stride = Math.max(1, Math.floor(sorted.length / Math.max(1, Math.round(budget / 4))));
  for (let i = 0; i < sorted.length && got < budget; i += stride) {
    const q = sorted[i];
    if (chosen.some((c) => c.id === q.id)) continue;
    if (got + q.marks > budget + 3) continue;
    chosen.push(q); got += q.marks;
  }
  return got;
}

async function main() {
  const args = process.argv.slice(2);
  const cls = (args.find((a) => !a.startsWith('--')) || '').toUpperCase();
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
  const marks = parseInt(opt('marks', '35'), 10);
  const today = new Date(opt('date', new Date().toISOString().slice(0, 10)));
  const dry = args.includes('--dry-run');

  if (!cls) { console.error('usage: node homework.js <class> [--marks 35] [--date YYYY-MM-DD] [--dry-run]'); process.exit(1); }
  if (OCR.test(cls)) { console.error(`${cls} is OCR A-level: exam homework waits until OCR questions are exported (never AQA).`); process.exit(1); }
  if (!ROUTE[cls]) { console.error(`${cls}: no exam-homework route (Years 9-11 only: ${Object.keys(ROUTE).join(', ')}).`); process.exit(1); }

  const { now, before } = taughtTopics(cls, today);
  if (!now && !before.length) { console.error(`${cls}: nothing taught yet by ${today.toISOString().slice(0, 10)}.`); process.exit(1); }
  const usage = ep.loadUsage();
  const used = new Set(usage[cls + ':homework'] || []);

  const chosen = [];
  const nowBudget = now ? Math.round(marks * (before.length ? 0.6 : 1)) : 0;
  if (now) take(pool(now, used), nowBudget, chosen);
  const rest = marks - chosen.reduce((a, q) => a + q.marks, 0);
  if (rest > 0 && before.length) {
    const per = Math.max(3, Math.ceil(rest / before.length));
    for (const t of before) {
      const left = marks - chosen.reduce((a, q) => a + q.marks, 0);
      if (left <= 0) break;
      take(pool(t, used), Math.min(per, left), chosen);
    }
  }
  // Earlier topics may have no questions yet (e.g. Chemistry before Patryk exports it): top up
  // from the current topic so the homework still reaches its mark budget.
  const short = marks - chosen.reduce((a, q) => a + q.marks, 0);
  if (short > 3 && now) take(pool(now, used), short, chosen);
  if (!chosen.length) { console.error('No unused questions left for those topics.'); process.exit(1); }
  chosen.sort((a, b) => a.difficulty - b.difficulty);                // a real paper ramps easy -> hard

  const total = chosen.reduce((a, q) => a + q.marks, 0);
  const title = now ? `${now.folder} + review` : 'Review';
  console.log(`\n${cls} exam homework: ${chosen.length} questions, ${total} marks`);
  console.log(`  current topic: ${now ? now.folder : '(none yet)'}; earlier topics: ${before.map((b) => b.folder).join(', ') || '(none)'}`);
  chosen.forEach((q, i) => console.log(`  ${i + 1}. ${q.topic} / ${q.subtopic} Q${q.q} [${q.marks}]${q.passRate != null ? ` pass ${q.passRate}%` : ''}`));
  if (dry) { console.log('\n--dry-run: nothing written.'); return; }

  const outDir = path.join(ROOT, 'homework-out', `${cls} ${today.toISOString().slice(0, 10)}`);
  fs.mkdirSync(outDir, { recursive: true });
  const meta = { subject: `${cls} ${chosen[0].subject}`, topic: title };
  const booklet = path.join(outDir, `${cls} Homework.docx`);
  const answers = path.join(outDir, `${cls} Homework Mark Scheme.docx`);
  await hb.writeDocx(hb.bookletChildren(chosen, meta, FIGS, false), booklet);
  await hb.writeDocx(hb.answerChildren(chosen, meta), answers);
  usage[cls + ':homework'] = [...used, ...chosen.map((q) => q.id)];
  fs.writeFileSync(ep.USAGE, JSON.stringify(usage, null, 1), 'utf8');
  console.log(`\n  booklet     -> ${booklet}\n  mark scheme -> ${answers}\n`);
}

module.exports = { taughtTopics };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
