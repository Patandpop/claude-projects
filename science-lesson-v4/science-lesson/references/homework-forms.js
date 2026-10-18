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
          node references/homework-forms.js 13D --topics "Stars,Cosmology" --marks 25
     --topics  only these exam topics (comma list, matched as words in the topic name), whatever
               the planner says was taught (Patryk 2026-10-09: a 25-mark Stars + Cosmology quiz)
     --require only questions using one of these words (comma list; the OCR exports file some
               questions under the wrong topic, e.g. satellite orbits under "Stars")
     --marks   aim for this many marks: about 60% self-marking multiple choice, the rest short
               written questions (up to 3 marks each) marked by pupils against the real scheme
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const { categorise } = require('./exam-categorise.js');
const dn = require('./do-now-pick.js');
const mw = require('./mcq-written.js');
const { msPlain, markPoints, numberAnswer } = require('./ms-friendly.js');

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
  const used = new Set([...(usage[cls + ':homework'] || []), ...(usage[cls + ':test'] || [])]);   // never a question on their test
  const pool = poolFor(cls, year).filter((x) => !used.has(x.id));

  // what has been taught, newest last (the same record the Do Nows use); match each question to it
  const topicRes = (o.topics || []).map((t) => new RegExp('\\b' + String(t).trim().replace(/[^\w ]/g, '') + '\\b', 'i'));
  const taught = topicRes.length ? [] : dn.taughtFor(cls, today);
  if (!topicRes.length && !taught.length) throw new Error(`${cls}: nothing taught yet`);
  const recentK = new Set(taught.slice(-8).map((L) => L.k));
  const fit = topicRes.length
    ? pool.filter((x) => topicRes.some((re) => re.test(x.topic)) &&
        (!o.require || o.require.some((w) => new RegExp('\\b' + String(w).trim().replace(/[^\w ]/g, ''), 'i').test(x.p.text)))).map((x) => ({ ...x, L: { k: x.topic, title: x.topic }, recent: true }))
    : pool.map((x) => {
    const q = { text: x.p.text, topic: x.topic, subject: x.subject, unit: x.unit, board: x.board };
    const L = dn.bestLesson(q, taught);
    return L ? { ...x, L, recent: recentK.has(L.k) } : null;
  }).filter(Boolean);

  const easyOk = (x) => year > 8 || x.p.passRate == null || x.p.passRate >= 60;
  const noPic = (s) => !/\[FIG:\d+\]|\[FIGURE\]|\b(figure|fig\.|table|graph|diagram)\b/i.test(s);
  // a Form cannot show a picture option (A-level equations and graphs kept since 2026-10-10) or a bare letter
  const cleanOpts = (opts) => opts.every((s) => s.length <= 150 && !/\bfigure\b|\btable\b|\[FIG|\[TABLE/i.test(s) && !/^[A-D]$/.test(s.trim()));
  const mcqs = fit.filter((x) => x.c.auto && noPic(x.c.mcq.stem) && cleanOpts(x.c.mcq.options) && easyOk(x));
  // AQA mark schemes are per part; OCR ones are per question, so OCR written questions must be single-part
  const kinds = o.marks ? ['recall', 'define', 'calculation', 'explain'] : ['recall', 'define', 'calculation'];
  const written = fit.filter((x) => !x.c.auto && kinds.includes(x.c.cat) && x.p.marks <= 3 &&
    noPic(x.p.text) && x.p.ms && x.p.ms.text && !/\[FIG|\[FIGURE\]/.test(x.p.ms.text) && easyOk(x) &&
    !/^\s*[A-D]\s*\d?\s*$/.test(x.p.ms.text) &&
    (x.board !== 'OCR A' || x.p.questionTotalMarks === x.p.marks) && !/^which of the following/i.test(x.p.text));

  // --marks with OCR: most short written questions are parts of longer questions that share ONE mark
  // scheme, so offer the WHOLE question (every part, in order, with its full scheme) when it has no
  // pictures and is worth 6 marks or less. Questions stay verbatim.
  if (o.marks && year >= 12) {
    const byQ = new Map();
    fit.forEach((x) => { const k = x.id.replace(/#Q(\d+).*$/, '#Q$1'); if (!byQ.has(k)) byQ.set(k, []); byQ.get(k).push(x); });
    for (const [k, xs] of byQ) {
      const total = xs[0].p.questionTotalMarks, sum = xs.reduce((n, x) => n + (x.p.marks || 0), 0);
      if (xs.length < 2 || !total || sum !== total || total > 6 || xs.some((x) => x.c.auto || !noPic(x.p.text))) continue;
      const ms = String((xs[0].p.ms || {}).text || '');
      if (!ms || /\[FIG|\[FIGURE\]/.test(ms)) continue;
      // the A-level text carries the paper's own labels, (a) (i) ..., since 2026-10-10
      const text = xs.map((x) => (x.p.part && !/^\(([a-z]|[ivx]+)\)/.test(x.p.text) ? '(' + x.p.part + ') ' : '') + x.p.text).join('\n');
      written.push({ ...xs[0], id: k, c: { cat: 'explain', auto: false }, p: { ...xs[0].p, text, marks: total, part: '', ms: { text: ms }, passRate: null } });
    }
  }

  const count = o.count || 8;
  const pickSpread = (list, n, preferRecent) => {
    const seen = new Set(), out = [], stems = new Set();
    const st = (x) => String(x.c.mcq ? x.c.mcq.stem : x.p.text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
    list = list.filter((x) => { const k = st(x); if (stems.has(k)) return false; stems.add(k); return true; });   // the same question twice: once
    let order = list.slice().sort((a, b) => (preferRecent ? (b.recent - a.recent) : 0) || ((a.p.passRate == null) - (b.p.passRate == null)) || (Math.abs((a.p.passRate || 60) - 65) - Math.abs((b.p.passRate || 60) - 65)));
    if (topicRes.length) {   // round robin across the chosen topics
      const by = new Map(); order.forEach((x) => { if (!by.has(x.L.k)) by.set(x.L.k, []); by.get(x.L.k).push(x); });
      order = []; for (let i = 0; order.length < list.length; i++) for (const g of by.values()) if (g[i]) order.push(g[i]);
    }
    for (const x of order) { if (out.length >= n) break; if (seen.has(x.L.k)) continue; seen.add(x.L.k); out.push(x); }
    for (const x of order) { if (out.length >= n) break; if (!out.includes(x)) out.push(x); }   // thin topic: allow a second per lesson
    return out;
  };
  let m, w;
  if (o.marks) {
    // a mark total: ~60% self-marking, then written questions until the total is reached exactly
    m = pickSpread(mcqs, Math.min(mcqs.length, Math.round(o.marks * 0.6)), true);
    const need = o.marks - m.length;
    const ordered = pickSpread(written, written.length, true);
    w = []; let got = 0;
    for (const x of ordered) { if (got + x.p.marks <= need) { w.push(x); got += x.p.marks; } if (got === need) break; }
    if (got < need) {   // still short: more multiple choice, never the same question twice
      const key = (x) => String(x.c.mcq.stem).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
      const have = new Set(m.map(key));
      for (const x of mcqs) { if (got >= need) break; if (have.has(key(x))) continue; have.add(key(x)); m.push(x); got++; }
    }
  } else { m = pickSpread(mcqs, count, true); w = pickSpread(written, 2, true); }
  // too few REAL multiple-choice questions: top up with practice questions Claude wrote (mcq-written.js,
  // built to mcq-rules.md), always labelled as not from a real exam. Off with { written: false }.
  let practice = [];
  if (!o.marks && o.written !== false && m.length < count) {
    const used0 = new Set([...(usage[cls + ':homework'] || [])]);
    const words = topicRes.length ? o.topics : taught.slice(-6).map((L) => L.title);
    practice = mw.forTopics(year >= 12 ? 'OCR A' : 'AQA', words, { subjects: year >= 12 ? null : (classInfo(cls).patrykTeaches || null) })
      .filter((q) => !used0.has(q.id)).slice(0, count - m.length);
  }
  // quiz file schema 2 (2026-10-18): labels, mark points for the written answers, no due date in the title
  const board = year >= 12 ? 'OCR A' : 'AQA';
  const left = [];
  const wq = w.map((x) => {
    const mp = markPoints(x.p.ms, { board, marks: x.p.marks, calc: x.c.cat === 'calculation' || /(calculate|work out|determine)/i.test(x.p.text) });
    if (mp.picture) { left.push({ ref: x.id, why: 'the answer is a drawing or graph' }); return null; }
    const num = board === 'AQA' ? numberAnswer(mp, x.p.text) : null;
    return { type: num ? 'number' : 'written', text: x.p.text, marks: x.p.marks, ...(num ? { unit: num.unit } : {}),
      scheme: msPlain(x.p.ms, { board, marks: x.p.marks }),   // one line per mark (2026-10-12)
      markPoints: mp.points, ...(mp.levels ? { levels: mp.levels } : {}), ref: x.id, lesson: x.L.title };
  }).filter(Boolean);
  const questions = [
    ...m.map((x) => ({ type: 'mcq', text: x.c.mcq.stem, options: x.c.mcq.options, answer: x.c.mcq.answer, points: 1,
      feedback: (x.p.ms && x.p.ms.examinerCommentary) ? String(x.p.ms.examinerCommentary).slice(0, 400) : '', ref: x.id, lesson: x.L.title })),
    ...practice.map((q) => ({ type: 'mcq', text: '(Practice question, not from a real exam) ' + q.stem, options: q.options, answer: 'ABCD'.indexOf(q.answer), points: 1,
      feedback: q.wrong ? Object.entries(q.wrong).map(([k, v]) => `${k}: ${v}`).join(' ').slice(0, 400) : '', ref: q.id, lesson: q.topic, written: true })),
    ...wq,
  ];
  questions.forEach((q, i) => { q.label = 'Question ' + (i + 1); (q.markPoints || []).forEach((p, k) => { p.id = 'q' + (i + 1) + '-' + (k + 1); }); });
  const what = topicRes.length ? o.topics.join(' and ') : c.seq[taught[taught.length - 1].k].topic;
  const title = `${cls} ${what} homework quiz`;
  return finishV2({ schema: 2, cls, due, kind: 'weekly', tier: null, board, topic: what, title, questions, left });
}

/* Quiz file schema 2 (2026-10-18, design-audit/homework-replica 04 section 3 and 05 section 1.1).
   The Form's total: multiple choice points plus every mark point's marks (the planner's totalPoints_
   adds up the same way, so the Form and the Classroom points always agree). */
function totalPoints(hw) {
  return (hw.questions || []).reduce((n, q) => n + (q.type === 'mcq' ? (q.points || 1)
    : (q.markPoints && q.markPoints.length ? q.markPoints.reduce((a, p) => a + (p.marks || 0), 0) : (q.marks || 1))), 0);
}
// Page 1's description, in plain words (05-design.md 1.1). No em dashes.
function quizIntro(hw) {
  const n = (hw.questions || []).length, m = hw.minutes;
  const head = hw.kind === 'exam-practice' ? `Exam practice on ${hw.topic}.` : `Homework quiz on ${hw.topic}.`;
  const out = [`${head} ${n} question${n === 1 ? '' : 's'}, about ${m} minute${m === 1 ? '' : 's'}. Do it in one go.`];
  const lines = ['If a question has a picture, it is just above the question.'];
  if (hw.questions.some((q) => q.type === 'number')) lines.push('For a calculation, type only the number in the answer box. Put your working in the box under it if you want.');
  out.push(lines.join('\n'));
  out.push(hw.questions.some((q) => q.type !== 'mcq')
    ? 'Multiple-choice questions mark themselves. On the last page you mark your written answers yourself, using the real mark scheme.'
    : 'The questions mark themselves.');
  out.push('Stuck? Message me on Google Classroom.');
  return out.join('\n\n');
}
// Fills in what depends on the final question list: minutes (about 1 a mark, 1.2 at A level) and the intro.
function finishV2(hw) {
  const total = totalPoints(hw);
  hw.minutes = Math.max(5, Math.round(total * (hw.board === 'OCR A' ? 1.2 : 1)));
  hw.intro = quizIntro(hw);
  if (!hw.left) hw.left = [];
  return hw;
}

// Google Forms shows plain text only, so "10^−4" and "x^2" become real raised characters (10⁻⁴, x²).
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '−': '⁻', '–': '⁻', '+': '⁺', '.': '·' };
const supText = (t) => String(t == null ? '' : t).replace(/\^\{?([−–\-+]?[0-9.]+)\}?/g, (m, x) => [...x].map((c) => SUP[c] || c).join(''));
function formsText(hw) {
  hw.questions.forEach((q) => { q.text = supText(q.text); if (q.options) q.options = q.options.map(supText); if (q.scheme) q.scheme = supText(q.scheme); if (q.feedback) q.feedback = supText(q.feedback);
    (q.markPoints || []).forEach((p) => { p.says = supText(p.says); if (p.also) p.also = p.also.map(supText); if (p.no) p.no = p.no.map(supText); });
    (q.levels || []).forEach((lv) => { lv.need = supText(lv.need); }); });
  return hw;
}
function write(hw, dryRun) {
  formsText(hw);
  if (dryRun) return null;
  // Google Drive not connected (2026-10-15): keep it in homework-out/planner-sync-waiting on this PC,
  // to copy into Admin/Planner Sync once Drive is back (the planner only sees files there)
  const dir = fs.existsSync(SYNC) ? SYNC : path.join(ROOT, 'homework-out', 'planner-sync-waiting');
  if (dir !== SYNC) { fs.mkdirSync(dir, { recursive: true }); console.log(`  (Google Drive not connected: Forms file kept in ${dir}; copy it into Admin/Planner Sync)`); }
  const file = path.join(dir, hw.file || `homework-${hw.cls}-${hw.due}.json`);   // exam practice adds -core / -challenge
  delete hw.file;
  fs.writeFileSync(file, JSON.stringify(hw, null, 1));
  fs.appendFileSync(path.join(dir, 'sync-log.txt'), new Date().toISOString().slice(0, 16).replace('T', ' ') + `  wrote ${path.basename(file)}\n`);
  const usage = readJson(USAGE, {});
  usage[hw.cls + ':homework'] = [...new Set([...(usage[hw.cls + ':homework'] || []), ...hw.questions.map((q) => q.ref)])];
  fs.writeFileSync(USAGE, JSON.stringify(usage, null, 1));
  return file;
}

if (require.main === module) {
  const a = process.argv.slice(2), v = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  const hw = choose(a[0], { due: v('--due') || undefined, count: v('--count') ? +v('--count') : undefined,
    topics: v('--topics') ? v('--topics').split(',') : undefined, require: v('--require') ? v('--require').split(',') : undefined, marks: v('--marks') ? +v('--marks') : undefined });
  console.log(hw.title + `  [${hw.board}]`);
  hw.questions.forEach((q, i) => console.log(`${i + 1}. (${q.type}${q.type === 'written' ? ', ' + q.marks + ' marks' : ''} · ${q.lesson}) ${q.text.slice(0, 160)}` +
    (q.type === 'mcq' ? '\n   ' + q.options.map((x, k) => (k === q.answer ? '[✓] ' : '[ ] ') + x).join('  ') : '\n   scheme: ' + q.scheme.slice(0, 160))));
  const f = write(hw, a.includes('--dry-run'));
  console.log(f ? '\nwritten: ' + f + '\nThe school planner makes the Google Form and a Classroom draft (⋯ More → Homework quizzes).' : '\n(dry run: nothing written)');
} else module.exports = { choose, write, poolFor, formsText, supText, totalPoints, quizIntro, finishV2 };
