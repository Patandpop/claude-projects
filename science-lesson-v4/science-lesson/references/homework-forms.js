#!/usr/bin/env node
'use strict';
/* ============================================================================
   homework-forms.js — a self-marking homework quiz from real exam questions (Patryk 2026-10-08).

   For one class: about 8 multiple-choice questions that mark themselves, spread over what the
   class has been taught (most from the current topic), plus 2 short written questions whose real
   mark scheme pupils see after they submit, so they mark those themselves. No printing, no marking
   for Patryk: the scores land in the Form's responses.

   This file only CHOOSES the questions. It writes one file into the planner's sync folder:
     Admin/Planner Sync/homework-<class>-<due date>.json
   The school planner turns it into a Google Forms quiz and a Google Classroom DRAFT (he publishes).

   Questions: AQA GCSE for Years 9-11 (Years 7-8: the easier ones), OCR A for Years 12-13, never
   the wrong board. Never a question this class has had as homework before (exam-usage.json).
   Verbatim: the exam's own words for questions, options and mark schemes.

   Usage: node references/homework-forms.js 10C2 [--due 2026-10-16] [--count 8] [--dry-run]
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const { categorise } = require('./exam-categorise.js');
const dn = require('./do-now-pick.js');

const ROOT = path.join(__dirname, '..', '..');
const LIB = path.join(ROOT, 'exam-library');
const USAGE = path.join(ROOT, 'exam-usage.json');
const SYNC = 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Planner Sync';
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return d; } };

function classInfo(cls) {
  const d = readJson(path.join(ROOT, 'class-defaults.json'), {});
  return (d.classes || d)[cls] || {};
}

// every library part this class may get, with its kind
function poolFor(cls, year) {
  const info = classInfo(cls);
  const subjects = info.patrykTeaches || ['Biology', 'Chemistry', 'Physics'];
  const ocr = year >= 12;
  const dir = path.join(LIB, ocr ? 'docs-ocr' : 'docs');
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const d = readJson(path.join(dir, f), null);
    if (!d || (!ocr && !subjects.includes(d.subject))) continue;
    d.parts.forEach((p) => {
      const c = categorise(p);
      const id = p.id || `${f.replace(/\.json$/, '')}#Q${p.question}${p.part || ''}`;
      out.push({ id, p, c, subject: d.subject, unit: ocr ? p.topic : d.topic, topic: ocr ? (p.subsubtopic || p.subtopic) : (p.subtopic || d.subtopic), board: ocr ? 'OCR A' : 'AQA' });
    });
  }
  return out;
}

function choose(cls, opts) {
  const o = opts || {};
  const due = o.due || new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const data = readJson(path.join(ROOT, 'planner', 'planner-data.json'), null);
  const c = data && data.classes[cls];
  if (!c) throw new Error(`${cls}: not in planner-data.json`);
  const year = c.year;
  const today = o.today || new Date().toISOString().slice(0, 10);
  const usage = readJson(USAGE, {});
  const used = new Set(usage[cls + ':homework'] || []);
  const pool = poolFor(cls, year).filter((x) => !used.has(x.id));

  // what has been taught, newest last (the same record the Do Nows use); match each question to it
  const taught = dn.taughtFor(cls, today);
  if (!taught.length) throw new Error(`${cls}: nothing taught yet`);
  const recentK = new Set(taught.slice(-8).map((L) => L.k));
  const fit = pool.map((x) => {
    const q = { text: x.p.text, topic: x.topic, subject: x.subject, unit: x.unit, board: x.board };
    const L = dn.bestLesson(q, taught);
    return L ? { ...x, L, recent: recentK.has(L.k) } : null;
  }).filter(Boolean);

  const easyOk = (x) => year > 8 || x.p.passRate == null || x.p.passRate >= 60;
  const noPic = (s) => !/\[FIG:\d+\]|\[FIGURE\]|\b(figure|fig\.|table|graph|diagram)\b/i.test(s);
  const cleanOpts = (opts) => opts.every((s) => s.length <= 150 && !/\bfigure\b|\btable\b/i.test(s));
  const mcqs = fit.filter((x) => x.c.auto && noPic(x.c.mcq.stem) && cleanOpts(x.c.mcq.options) && easyOk(x));
  // AQA mark schemes are per part; OCR ones are per question, so OCR written questions must be single-part
  const written = fit.filter((x) => !x.c.auto && ['recall', 'define', 'calculation'].includes(x.c.cat) && x.p.marks <= 3 &&
    noPic(x.p.text) && x.p.ms && x.p.ms.text && !/\[FIG|\[FIGURE\]/.test(x.p.ms.text) && easyOk(x) &&
    (x.board !== 'OCR A' || x.p.questionTotalMarks === x.p.marks) && !/^which of the following/i.test(x.p.text));

  const count = o.count || 8;
  const pickSpread = (list, n, preferRecent) => {
    const seen = new Set(), out = [], stems = new Set();
    const st = (x) => String(x.c.mcq ? x.c.mcq.stem : x.p.text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
    list = list.filter((x) => { const k = st(x); if (stems.has(k)) return false; stems.add(k); return true; });   // the same question twice: once
    const order = list.slice().sort((a, b) => (preferRecent ? (b.recent - a.recent) : 0) || ((a.p.passRate == null) - (b.p.passRate == null)) || (Math.abs((a.p.passRate || 60) - 65) - Math.abs((b.p.passRate || 60) - 65)));
    for (const x of order) { if (out.length >= n) break; if (seen.has(x.L.k)) continue; seen.add(x.L.k); out.push(x); }
    for (const x of order) { if (out.length >= n) break; if (!out.includes(x)) out.push(x); }   // thin topic: allow a second per lesson
    return out;
  };
  const m = pickSpread(mcqs, count, true), w = pickSpread(written, 2, true);
  const questions = [
    ...m.map((x) => ({ type: 'mcq', text: x.c.mcq.stem, options: x.c.mcq.options, answer: x.c.mcq.answer, points: 1,
      feedback: (x.p.ms && x.p.ms.examinerCommentary) ? String(x.p.ms.examinerCommentary).slice(0, 400) : '', ref: x.id, lesson: x.L.title })),
    ...w.map((x) => ({ type: 'written', text: x.p.text, marks: x.p.marks, scheme: String(x.p.ms.text).replace(/\s+/g, ' ').trim(), ref: x.id, lesson: x.L.title })),
  ];
  const title = `${cls} homework: ${c.seq[taught[taught.length - 1].k].topic} (due ${due.split('-').reverse().slice(0, 2).join('/')})`;
  return { cls, due, title, board: year >= 12 ? 'OCR A' : 'AQA', questions,
    intro: 'Answer every question. The multiple-choice questions mark themselves. For the written questions, check your answer against the mark scheme shown after you submit and correct it in green.' };
}

function write(hw, dryRun) {
  if (dryRun) return null;
  if (!fs.existsSync(SYNC)) throw new Error('sync folder not found: ' + SYNC);
  const file = path.join(SYNC, `homework-${hw.cls}-${hw.due}.json`);
  fs.writeFileSync(file, JSON.stringify(hw, null, 1));
  fs.appendFileSync(path.join(SYNC, 'sync-log.txt'), new Date().toISOString().slice(0, 16).replace('T', ' ') + `  wrote ${path.basename(file)}\n`);
  const usage = readJson(USAGE, {});
  usage[hw.cls + ':homework'] = [...new Set([...(usage[hw.cls + ':homework'] || []), ...hw.questions.map((q) => q.ref)])];
  fs.writeFileSync(USAGE, JSON.stringify(usage, null, 1));
  return file;
}

if (require.main === module) {
  const a = process.argv.slice(2), v = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  const hw = choose(a[0], { due: v('--due') || undefined, count: v('--count') ? +v('--count') : undefined });
  console.log(hw.title + `  [${hw.board}]`);
  hw.questions.forEach((q, i) => console.log(`${i + 1}. (${q.type}${q.type === 'written' ? ', ' + q.marks + ' marks' : ''} · ${q.lesson}) ${q.text.slice(0, 160)}` +
    (q.type === 'mcq' ? '\n   ' + q.options.map((x, k) => (k === q.answer ? '[✓] ' : '[ ] ') + x).join('  ') : '\n   scheme: ' + q.scheme.slice(0, 160))));
  const f = write(hw, a.includes('--dry-run'));
  console.log(f ? '\nwritten: ' + f + '\nThe school planner makes the Google Form and a Classroom draft (⋯ More → Homework quizzes).' : '\n(dry run: nothing written)');
} else module.exports = { choose, write, poolFor };
