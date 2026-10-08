#!/usr/bin/env node
'use strict';
/* ============================================================================
   do-now-pick.js — choose a lesson's six Do Now questions from what the class has COVERED
   (Patryk 2026-10-08). Home only; nothing is written.

   Where the questions come from (all with real answers):
     - the class's bank (question-bank/<class>.json: real exam questions, AQA for Years 7-11 with
       only the easiest for Years 7-8, OCR A for Years 12-13), and
     - Patryk's own earlier Do Nows for that class (Admin/Brief Data/do-now-own.json).
   What counts as covered: the planner's record of what the class has been taught (Planner.xlsx
   weeks plus the weeks saved in the planner), up to the lesson's date. Each question is matched to
   the taught lesson it is about by shared words; a question that matches nothing taught is never
   used.
   The six (spaced retrieval):
     1 from last lesson, 2 from 2-4 lessons ago, 2 from 5+ lessons ago, and
     1 from LAST YEAR's content (Year 8 for Year 9 and so on; never Year 11 for Year 12; Year 7
     and Year 12 get a sixth older question instead).
   Questions used as a Do Now for that class in its last 8 lessons (lesson-log.json) are skipped.

   Usage: node references/do-now-pick.js 9XS [--date 2026-10-12] [--json]
   ============================================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const P = require(path.join(ROOT, 'planner', 'logic.js'));
const BRIEF = 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Brief Data';
const SYNC = 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Planner Sync';

const STOP = new Set('a an and are as at be by for from how in is it its of on or that the this to was what when which why with you your use used using lesson part practical required theory introduction more than one two three give state name explain describe write figure table shows show calculate complete some most each other core safety skills assessment dirt revision experiment investigating investigation'.split(' '));
const words = (s) => [...new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ')
  .filter((w) => w.length > 3 && !STOP.has(w)).map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w)))];
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return d; } };
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function savedWeeks() {
  for (const dir of [SYNC, SYNC.replace('Beechen Cliff Science\\', 'Beechen Cliff Science (1)\\')]) {
    const st = readJson(path.join(dir, 'planner-state.json'), null);
    if (st && st.weeks) return st.weeks;
  }
  return {};
}

// The class's taught lessons in order, oldest first: [{ k, title, words, date }]
function taughtLessons(data, cls, date, weeks) {
  const c = data.classes[cls];
  const mon = P.mondayOf(P.parse(date));
  Object.values(weeks).forEach((w) => P.remapWeek(data, w));
  const st = P.progressBefore(data, weeks, mon)[cls];
  // this week's lessons before the day
  const w = weeks[P.iso(mon)];
  if (w) w.slots.filter((s) => s.cls === cls && s.kind === 'lesson' && P.slotDay(w, s) < date).forEach((s) => { st.taught.add(s.i); st.when[s.i] = st.when[s.i] || { date: P.slotDay(w, s) }; });
  return [...st.taught].filter((k) => c.seq[k]).map((k) => ({ k, ...lessonInfo(c.seq[k], c.year), date: (st.when[k] || {}).date || '' }))
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.k - b.k);
}

// A lesson's subject (from its Drive folder or topic code) and, for Years 9-11, its AQA exam topic.
const { AQA_TOPIC } = require('./exam-pick.js');
function lessonInfo(L, year) {
  const code = (String(L.topic).match(/^([BCP])(\d+)\b/) || []);
  const subject = (L.rel || '').split('/')[1] || { B: 'Biology', C: 'Chemistry', P: 'Physics' }[code[1]] || (year >= 12 ? 'Physics' : null);
  const aqa = year >= 9 && year <= 11 && code[0] ? AQA_TOPIC[code[0]] : null;
  return { title: L.title, topic: L.topic, subject: /^(Biology|Chemistry|Physics)$/.test(subject) ? subject : null, aqa, words: words(L.title + ' ' + (L.lo || '')) };
}
// Best matching lesson for a question (2026-10-08, tightened after "ethanol" matched Latent Heat):
// same subject; for an AQA question and a Year 9-11 lesson, the same exam topic; then shared words,
// with the question's own topic name counting double. Needs a real match, or the question is unused.
function bestLesson(q, lessons) {
  const tw = new Set(words((q.topic || '') + ' ' + (q.lesson || '')));
  const xw = new Set(words(q.text || ''));
  let best = null, bs = 0;
  for (const L of lessons) {
    if (q.subject && L.subject && q.subject !== L.subject) continue;
    if (q.unit && L.aqa && q.board !== 'OCR A' && q.unit !== L.aqa) continue;
    const th = L.words.filter((w) => tw.has(w)).length, xh = L.words.filter((w) => xw.has(w)).length;
    const sc = 2 * th + xh;
    // Years 7-8 lessons (no exam-topic check) need the question's topic name to match too
    // the question's own words must touch the lesson too (a topic name like "Cell Structure" alone is too broad)
    const ok = xh >= 1 && (L.aqa || q.board === 'OCR A' ? (th >= 1 ? sc >= 3 : xh >= 3) : th >= 1 && sc >= 3);
    if (ok && sc > bs) { bs = sc; best = L; }
  }
  return best;
}

// Last year's content: every lesson of a class one year below (all of it counts as taught).
function lastYearLessons(data, year) {
  if (year <= 7 || year === 12) return [];
  return Object.values(data.classes).filter((c) => c.year === year - 1)
    .flatMap((c) => c.seq.map((L) => lessonInfo(L, c.year)));
}

function pick(cls, opts) {
  const o = opts || {};
  const date = o.date || new Date().toISOString().slice(0, 10);
  const data = o.data || readJson(path.join(ROOT, 'planner', 'planner-data.json'), null);
  if (!data || !data.classes[cls]) throw new Error(`${cls}: not in planner-data.json`);
  const c = data.classes[cls];
  const bank = (readJson(path.join(__dirname, 'question-bank', cls + '.json'), {}).questions || []);
  const own = ((readJson(path.join(BRIEF, 'do-now-own.json'), {}).classes || {})[cls] || [])
    .map((r, i) => ({ id: 'own-' + cls + '-' + i, text: r.q, answer: r.a, lesson: r.lesson, topic: r.lesson, source: 'own' }))
    .filter((q) => q.answer);
  const lessons = taughtLessons(data, cls, date, o.weeks || savedWeeks());
  if (!lessons.length) return { picked: [], why: 'nothing taught yet' };
  const ageOf = new Map(lessons.map((L, i) => [L.k, lessons.length - i]));   // 1 = last lesson

  // skip questions used in this class's recent Do Nows (by text)
  const log = readJson(path.join(BRIEF, 'lesson-log.json'), []).filter((r) => r.class === cls).slice(-8);
  const recent = new Set(log.flatMap((r) => (r.doNow || []).map((q) => norm(q.q))));

  // A Do Now is read off the board: no figures or tables pupils can't see, and a complete answer.
  const usable = (q) => q.source === 'own' || (!/\b(figure|fig\.|table|graph|diagram|shown|box below)\b/i.test(q.text) && String(q.answer || '').trim().length > 1 && !/[(\[]\s*$|^\d+\.$|\[FIG/.test(String(q.answer).trim()));
  const pool = [...own, ...bank].filter((q) => !recent.has(norm(q.text)) && String(q.text).length < 400 && usable(q))
    .map((q) => { const L = bestLesson(q, lessons); return L ? { q, L, age: ageOf.get(L.k) } : null; }).filter(Boolean);
  const seed = [...(cls + date)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  let r = seed;
  const rand = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296);
  const used = new Set(), out = [];
  const take = (list, n, why) => {
    const sorted = list.filter((x) => !used.has(x.q.id)).map((x) => [rand() + (x.q.source === 'own' ? 0.3 : 0), x]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
    const lessonsUsed = new Set(out.map((x) => x.L && x.L.k));
    for (const x of sorted) {                                   // one question per lesson where possible
      if (n <= 0) break;
      const stem = norm(x.q.text).slice(0, 60);                   // two parts of the same exam question: only one
      if (out.some((y) => norm(y.q.text).slice(0, 60) === stem)) continue;
      if (x.L && lessonsUsed.has(x.L.k) && sorted.some((y) => !used.has(y.q.id) && !lessonsUsed.has(y.L && y.L.k))) continue;
      used.add(x.q.id); lessonsUsed.add(x.L && x.L.k); out.push({ ...x, why }); n--;
    }
  };
  take(pool.filter((x) => x.age === 1), 1, 'last lesson');
  take(pool.filter((x) => x.age >= 2 && x.age <= 4), 2, '2-4 lessons ago');
  take(pool.filter((x) => x.age >= 5), 2, '5+ lessons ago');
  const prev = lastYearLessons(data, c.year);
  if (prev.length) {
    const pv = bank.filter((q) => !recent.has(norm(q.text)) && !used.has(q.id) && usable(q)).map((q) => ({ q, L: bestLesson(q, prev) })).filter((x) => x.L)
      .filter((x) => x.q.passRate == null || x.q.passRate >= 50);
    take(pv.map((x) => ({ ...x, L: { k: 'prev:' + x.L.title, title: x.L.title } })), 1, 'last year');
  }
  // top up (thin bank, or Year 7 / 12): older first
  if (out.length < 6) take(pool.filter((x) => !used.has(x.q.id)).sort((a, b) => b.age - a.age), 6 - out.length, 'top-up');
  return {
    // mark-scheme answers carry their marks ("E = 0.25 × 334 000 1 E = 83 500 (J)"): drop the bare mark numbers
    picked: out.slice(0, 6).map((x) => ({ q: x.q.text, a: String(x.q.answer || '').replace(/\s+1\s+(?=\S)/g, '; ').replace(/\s+1\s*$/, '').replace(/\s+for one mark$/i, ''), why: x.why, lesson: x.L && x.L.title, source: x.q.source === 'own' ? 'your Do Now' : (x.q.board || 'AQA') + ' exam', examRef: x.q.examRef || null, marks: x.q.marks || 1 })),
    taught: lessons.length, pool: pool.length,
  };
}

if (require.main === module) {
  const a = process.argv.slice(2), v = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  const r = pick(a[0], { date: v('--date') || undefined });
  if (a.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    console.log(`${a[0]}: ${r.taught} lessons taught, ${r.pool} questions match them`);
    r.picked.forEach((p, i) => console.log(`${i + 1}. [${p.why} · ${p.lesson} · ${p.source}] ${p.q}\n   → ${p.a}`));
  }
} else module.exports = {
  pick, bestLesson, words,
  // what a class has been taught up to a date, oldest first (shared with homework-forms.js)
  taughtFor: (cls, date) => taughtLessons(readJson(path.join(ROOT, 'planner', 'planner-data.json'), null), cls, date, savedWeeks()),
};
