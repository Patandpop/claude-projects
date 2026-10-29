#!/usr/bin/env node
'use strict';
/* ============================================================================
   mcq-written.js — multiple-choice questions WRITTEN by Claude (not real exam questions),
   kept apart from the real ones and used only as OPTIONAL extras (Patryk 2026-10-10).

   Where they are used (only when real questions run out, and always labelled):
     - homework-forms.js tops up a quiz that is short of real multiple choice;
     - do-now-pick.js tops up a Do Now that is short of real questions.
   Never on an exam practice paper (test-paper.js reads only the real library), never shown
   as a real exam question.

   Store: references/mcq-written.json (in git)  { questions: [ ... ] }, each one:
     { id, written: true, board: "AQA"|"OCR A", level: "KS3"|"GCSE"|"A", subject, topic,
       stem, options: [4 strings], answer: "A".."D", rule: "which mcq-rules.md rule built the
       wrong answers", wrong: { B: "why a pupil picks it", ... }, made: "YYYY-MM-DD",
       fills?: "<real question id>" }        <- options written in for a real A-level question
                                                whose own options were lost (optionsMissing)
   Every question is checked against references/mcq-rules.md before it is saved (check()).

   Usage
     node references/mcq-written.js add <file.json>     add questions (a list), checked first
     node references/mcq-written.js list [topic words]
     node references/mcq-written.js check <file.json>   check only, save nothing
   ============================================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const STORE = path.join(__dirname, 'mcq-written.json');   // kept in git (exam-library/ is rebuilt and ignored)
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return d; } };
const load = () => readJson(STORE, { questions: [] }).questions || [];

const num = (s) => {
  const t = String(s).replace(/[−–]/g, '-').trim().replace(/(\d)[ \u2009\u00a0](?=\d{3}\b)/g, '$1');   // "60 000 J" is 60000, not 60
  const m = /^(-?\d+(?:\.\d+)?)(?:\s*[×x]\s*10\^?\{?(-?\d+)\}?)?/.exec(t);
  return m ? parseFloat(m[1]) * Math.pow(10, m[2] ? +m[2] : 0) : null;
};

// The rules in mcq-rules.md that a machine can check. Returns a list of problems (empty = fine).
function check(q) {
  const bad = [];
  if (!q || typeof q !== 'object') return ['not a question'];
  if (!q.stem || String(q.stem).length < 10) bad.push('stem missing or too short');
  if (String(q.stem || '').length > 300) bad.push('stem over 300 characters (slides: 140)');
  if (!Array.isArray(q.options) || q.options.length !== 4) bad.push('needs exactly 4 options');
  else {
    const o = q.options.map((x) => String(x).trim());
    if (o.some((x) => !x)) bad.push('an option is empty');
    if (new Set(o.map((x) => x.toLowerCase())).size !== 4) bad.push('two options are the same');
    if (o.some((x) => /\b(all|none|both|neither) of (the|these) (above|answers|options)\b/i.test(x))) bad.push('no "all/none of the above" (real papers: 0.3%)');
    if (o.some((x) => /^[A-D][.):]\s/.test(x))) bad.push('options carry their own letter: leave the letter off');
    const nums = o.map(num);
    if (nums.every((n) => n != null)) {
      if (!nums.every((n, i) => !i || n >= nums[i - 1])) bad.push('number options go smallest to largest (real papers: 9 in 10)');
    } else {
      const L = o.map((x) => x.length), right = L['ABCD'.indexOf(q.answer)];
      if (Math.max(...L) > 2 * Math.min(...L) && Math.max(...L) - Math.min(...L) > 12) bad.push('option lengths too uneven (keep the longest under twice the shortest)');
      if (right === Math.max(...L) && L.filter((l) => l === right).length === 1 && right > 1.3 * L.filter((l, i) => i !== 'ABCD'.indexOf(q.answer)).reduce((a, b) => Math.max(a, b), 0)) bad.push('the right answer is clearly the longest: a give-away');
    }
  }
  if (!/^[A-D]$/.test(String(q.answer || ''))) bad.push('answer must be one letter A-D');
  if (/\b(not|never|except|least)\b/i.test(q.stem || '') && !/\b(NOT|NEVER|EXCEPT|LEAST)\b/.test(q.stem || '')) bad.push('a negative stem writes NOT / NEVER / LEAST in capitals');
  if (!q.rule) bad.push('say which rule built the wrong answers (rule)');
  if (!q.wrong || Object.keys(q.wrong).length < 3) bad.push('give the reason a pupil would pick each wrong answer (wrong: {B: ..., C: ..., D: ...})');
  if (!['AQA', 'OCR A'].includes(q.board)) bad.push('board must be AQA or OCR A (OCR A only for 12C / 13D)');
  if (!q.topic) bad.push('topic missing');
  return bad;
}

function add(list) {
  const have = load();
  const today = new Date().toISOString().slice(0, 10);
  const report = [];
  for (const q0 of list) {
    const q = Object.assign({ written: true, made: today }, q0, { written: true });
    const bad = check(q);
    if (bad.length) { report.push(`REJECTED ${String(q.stem || '').slice(0, 60)}: ${bad.join('; ')}`); continue; }
    if (have.some((h) => String(h.stem).toLowerCase() === String(q.stem).toLowerCase())) { report.push(`already there: ${q.stem.slice(0, 60)}`); continue; }
    q.id = q.id || `written-${today}-${have.length + 1}`;
    have.push(q);
    report.push(`added ${q.id}: ${q.stem.slice(0, 60)}`);
  }
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify({ note: 'Written by Claude, NOT real exam questions. Optional extras only (mcq-written.js).', questions: have }, null, 1));
  return report;
}

// written questions on these topics (words matched in topic or stem), for this board
function forTopics(board, words, opts) {
  const o = opts || {};
  const ws = (words || []).map((w) => String(w).toLowerCase()).filter((w) => w.length > 3);
  return load().filter((q) => q.board === board && !q.fills && (!o.subjects || !q.subject || o.subjects.includes(q.subject)) &&
    (!ws.length || ws.some((w) => (q.topic + ' ' + q.stem).toLowerCase().includes(w.slice(0, 6)))));
}

module.exports = { load, check, add, forTopics, STORE };

if (require.main === module) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'add' || cmd === 'check') {
    const list = [].concat(readJson(arg, null) || []);
    if (!list.length) { console.error('no questions in ' + arg); process.exit(1); }
    if (cmd === 'check') list.forEach((q) => { const b = check(q); console.log(`${b.length ? 'PROBLEM' : 'ok     '} ${String(q.stem).slice(0, 70)}${b.length ? '\n   ' + b.join('\n   ') : ''}`); });
    else add(list).forEach((l) => console.log(l));
  } else if (cmd === 'list') {
    const qs = arg ? load().filter((q) => (q.topic + ' ' + q.stem).toLowerCase().includes(arg.toLowerCase())) : load();
    qs.forEach((q) => console.log(`${q.id} [${q.board} · ${q.topic}] ${q.stem}\n   ${q.options.map((x, i) => ('ABCD'[i] === q.answer ? '[✓] ' : '[ ] ') + x).join('  ')}`));
    console.log(`${qs.length} written question(s)`);
  } else console.log('usage: node mcq-written.js add|check <file.json> | list [topic]');
}
