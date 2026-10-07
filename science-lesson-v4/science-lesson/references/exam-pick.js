#!/usr/bin/env node
// exam-pick.js — choose REAL exam questions for a lesson (Patryk 2026-10-03).
//
//   board     : one whole exam question for the "Exam Question" + "Mark Scheme" slides after
//               Apply, EVERY Year 9-11 lesson. Pupils answer in their books.
//   worksheet : a DIFFERENT, short, figure-free question that build.js adds to the worksheet
//               only when the sheet still fits 4 pages (no answer lines; answered in books).
//
// Rules (do not soften):
//   - Questions, stems and mark schemes are VERBATIM. Never reworded. If the words don't fit
//     the lesson, the question is wrong: pick another.
//   - Whole questions only (all parts, in order), because a part's lead-in sentence often
//     lives on the previous part. Every part needs a real mark scheme.
//   - Board: AQA library for Year 9-11 Biology/Physics (Chemistry once exported). OCR classes
//     (12C/13D) need an OCR library and NEVER get AQA. Years 7/8 get nothing.
//   - A question already used with that class is never repeated (exam-usage.json).
// Local only, no API. Home-only: when exam-library/ is absent (claude.ai) it returns nothing.
'use strict';

const fs = require('fs');
const path = require('path');
const hb = require('./homework-booklet.js');

const ROOT = path.join(__dirname, '..', '..');
const LIB = path.join(ROOT, 'exam-library');
const USAGE = path.join(ROOT, 'exam-usage.json');

// Drive topic code (start of meta.macrotopic) -> library topic. Library = AQA GCSE spec names.
const AQA_TOPIC = {
  P1: 'Energy', P2: 'Electricity', P3: 'Particle Model of Matter', P4: 'Atomic Structure',
  P5: 'Forces', P6: 'Waves', P7: 'Magnetism', P8: 'Space Physics',
  B1: 'Cell Biology', B2: 'Organisation', B3: 'Infection and Response', B4: 'Bioenergetics',
  B5: 'Homeostasis and Response', B6: 'Inheritance Variation and Evolution', B7: 'Ecology',
  C1: 'Atomic Structure and the Periodic Table', C2: 'Bonding Structure and the Properties of Matter',
  C3: 'Quantitative Chemistry', C4: 'Chemical Changes', C5: 'Energy Changes',
  C6: 'The Rate and Extent of Chemical Change', C7: 'Organic Chemistry', C8: 'Chemical Analysis',
  C9: 'Chemistry of the Atmosphere', C10: 'Using Resources',
};
const OCR_CLASSES = /^(12|13)/;
const STOP = new Set('a an and are as at be by for from how in is it its of on or that the this to was what when which why with you your use using lesson part'.split(' '));

let _cat = null;
function catalogue() {
  if (_cat) return _cat;
  const f = path.join(LIB, 'catalogue.json');
  _cat = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
  return _cat;
}

function words(s) {
  return new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ies|es|s)$/, '')));
}

function lessonWords(L) {
  const m = L.meta || {};
  const bits = [m.title, m.topic, (L.title || {}).text, ...(((L.title || {}).keywords) || [])];
  (L.learn || []).forEach((it) => bits.push(it.title, it.heading));
  return words(bits.filter(Boolean).join(' '));
}

// A "real" figure is a diagram/graph/table, not an inline tick-box or equation snippet.
function figureInfo(file) {
  const fp = path.join(LIB, 'figures', file);
  if (!fs.existsSync(fp)) return null;
  const buf = fs.readFileSync(fp);
  const dim = hb.imageSize(buf);
  return { file, path: fp, bytes: buf.length, w: dim ? dim.w : 0, h: dim ? dim.h : 0 };
}

function questionText(q) {
  return q.parts.map((p) => hb.clean(p.text)).join(' ');
}

// All whole questions for one library topic, with figures sorted out.
function candidates(subject, topic) {
  const cat = catalogue();
  if (!cat) return [];
  const qs = hb.selectQuestions(cat, path.join(LIB, 'docs'), { subject, topic, marks: 100000 });
  return qs.map((q) => {
    const files = [...new Set(q.parts.flatMap((p) => p.figureFiles || []))];
    const figs = files.map(figureInfo).filter(Boolean);
    const tiny = figs.some((f) => f.bytes < 6000 || f.w < 120 || f.h < 60);
    const rates = q.parts.map((p) => p.passRate).filter((r) => r != null);
    const levelled = q.parts.some((p) => p.ms && (p.ms.levels || []).length);
    const msText = q.parts.map((p) => (p.ms && p.ms.text) || '').join(' ');
    return Object.assign(q, {
      id: `${q.doc}#Q${q.q}`, figs, tiny, levelled,
      passRate: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null,
      text: questionText(q), msLen: msText.length,
    });
  });
}

function score(q, lw) {
  const tw = words(q.text + ' ' + q.subtopic + ' ' + q.subtopic);
  let s = 0;
  for (const w of lw) if (tw.has(w)) s++;
  return s;
}

function loadUsage() {
  try { return JSON.parse(fs.readFileSync(USAGE, 'utf8')); } catch { return {}; }
}

// Parser damage guards: a part that starts mid-word ("nd turbines are used...") lost its
// opening; a question that talks about "the graph/figure/table" but carries no picture can't be
// answered. Both are rejected rather than shown to pupils.
function damaged(q) { return q.parts.some((p) => /^[a-z]/.test(hb.clean(p.text))) ||
  (!q.figs.length && /\b(graph|figure|diagram|table|chart|photograph|shown (below|above|in))\b/i.test(q.text)); }
// Answered in BOOKS, so nothing that needs the printed paper: drawing lines/rings, ticking
// boxes, completing a table, marking a diagram or graph.
function paperOnly(q) { return /\b(draw (a|one|two|three|straight|vertical|horizontal)?\s*(straight )?(line|ring|circle|arrow)|draw a ring|tick|complete the (table|diagram|graph|chart|sentence)|on the (diagram|graph|figure|chart) (above|below)|label|plot|shade|circle the|ring around|list a)\b/i.test(q.text); }
// A calculation must come with its numbers. If a "Calculate" part has no digit anywhere before it,
// the data lived in a lead-in the parser lost.
function noData(q) {
  let seen = '';
  for (const p of q.parts) { const t = hb.clean(p.text); seen += ' ' + t; if (/\b(calculate|how many|how much|work out|determine)\b/i.test(t) && !/\d/.test(seen)) return true; }
  return false;
}

// -> { board, worksheet } (either may be null), each a slide/worksheet-ready object.
function pickForLesson(L, opts) {
  const o = opts || {};
  const m = L.meta || {};
  const year = parseInt(m.year || (String(m.class || '').match(/^\d+/) || [])[0], 10);
  const cls = String(m.class || '');
  if (!(year >= 9)) return { board: null, worksheet: null, why: 'Years 7/8 get no exam questions' };
  if (OCR_CLASSES.test(cls) || year >= 12) return { board: null, worksheet: null, why: 'OCR class: waiting for OCR exam data (never AQA)' };
  const code = (String(m.macrotopic || '').match(/^([BCP]\d+)\b/) || [])[1];
  const subject = { B: 'Biology', C: 'Chemistry', P: 'Physics' }[code ? code[0] : ''];
  const topic = AQA_TOPIC[code];
  if (!subject || !topic) return { board: null, worksheet: null, why: `no exam topic for "${m.macrotopic}"` };

  const all = candidates(subject, topic);
  if (!all.length) return { board: null, worksheet: null, why: `no ${subject} / ${topic} questions in the library yet` };
  const used = new Set((o.usage || loadUsage())[cls] || []);
  const lw = lessonWords(L);
  const fresh = all.filter((q) => !used.has(q.id) && !q.tiny && !damaged(q) && !paperOnly(q) && !noData(q));
  const rank = (a, b) => (b.rel - a.rel) || ((a.passRate == null) - (b.passRate == null)) ||
    (Math.abs((a.passRate || 50) - 50) - Math.abs((b.passRate || 50) - 50)) || a.id.localeCompare(b.id);
  fresh.forEach((q) => { q.rel = score(q, lw); });
  // the library spells some subtopics wrongly ("Cell Strucutre"), so compare letters ignoring order slips
  const sameSub = (a, b) => { const k = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '').split('').sort().join(''); return k(a) === k(b); };
  if (m.examSubtopic) fresh.forEach((q) => { if (sameSub(q.subtopic, m.examSubtopic)) q.rel += 100; });
  // meta.examKeywords: words the question must be about (9XS microscopes: microscope, onion, iodine...)
  if (Array.isArray(m.examKeywords) && m.examKeywords.length) fresh.forEach((q) => {
    const hits = m.examKeywords.filter((w) => new RegExp(`\\b${String(w).replace(/[^\w ]/g, '')}`, 'i').test(q.text)).length;
    q.rel += hits ? 200 + 20 * hits : -200;
  });

  // Board: 3-6 marks, <= 3 parts, at most one real figure, fits a slide at >= 16pt, short enough
  // mark scheme to read off the board, not a levelled 6-marker (those belong on paper).
  const boardOk = (q) => q.marks >= 3 && q.marks <= 6 && q.parts.length <= 3 && q.figs.length <= 1 &&
    !q.levelled && q.text.length <= (q.figs.length ? 480 : 700) && q.msLen <= 650 &&
    (q.passRate == null || (q.passRate >= 25 && q.passRate <= 75));
  // meta.examRef names the board question exactly (still a real, verbatim library question)
  const named = m.examRef ? all.find((q) => q.id === m.examRef && !damaged(q)) : null;
  const board = named || fresh.filter(boardOk).sort(rank)[0] || null;

  // Worksheet: a different short figure-free question, 2-4 marks.
  const wsOk = (q) => (!board || q.id !== board.id) && q.marks >= 2 && q.marks <= 4 && !q.figs.length &&
    q.parts.length <= 2 && !q.levelled && q.text.length <= 320;
  const worksheet = fresh.filter(wsOk).sort(rank)[0] || null;

  return { board: board && shape(board), worksheet: worksheet && shape(worksheet) };
}

// The object build.js renders. Text stays verbatim (only the [FIG:n] markers are removed).
function shape(q) {
  return {
    examRef: q.id, board: 'AQA', subject: q.subject, topic: q.topic, subtopic: q.subtopic, marks: q.marks,
    passRate: q.passRate,
    figure: q.figs[0] ? { path: q.figs[0].path, w: q.figs[0].w, h: q.figs[0].h } : null,
    groups: hb.letterGroups(q.parts).map((g) => ({
      stem: g.stem,
      parts: g.parts.map((p) => ({
        label: p.part || '', text: hb.stripStem(p.text, g.stem) || hb.clean(p.text), marks: p.marks || 0,
        ms: (p.ms && p.ms.text) || '',
        commonError: (p.ms && p.ms.examiner && p.ms.examiner.commonError) || '',
        passRate: p.passRate,
      })),
    })),
  };
}

// Record what a class has now seen, so it is never repeated. Called by build.js after a home build.
function recordUse(cls, ids) {
  if (!cls || !ids.length) return;
  const u = loadUsage();
  u[cls] = [...new Set([...(u[cls] || []), ...ids])];
  fs.writeFileSync(USAGE, JSON.stringify(u, null, 1), 'utf8');
}

module.exports = { pickForLesson, recordUse, loadUsage, candidates, damaged, paperOnly, noData, AQA_TOPIC, USAGE };

if (require.main === module) {
  const f = process.argv[2];
  if (!f) { console.error('usage: node exam-pick.js lesson-content.json'); process.exit(1); }
  const ls = [].concat(JSON.parse(fs.readFileSync(f, 'utf8')));
  for (const L of ls) {
    const r = pickForLesson(L);
    console.log(`\n${(L.meta || {}).class} ${(L.meta || {}).macrotopic} — ${(L.meta || {}).title}`);
    if (r.why) console.log('  ' + r.why);
    for (const k of ['board', 'worksheet']) {
      const q = r[k];
      if (!q) { console.log(`  ${k}: none`); continue; }
      console.log(`  ${k}: ${q.examRef} [${q.marks} marks, pass ${q.passRate == null ? '?' : q.passRate + '%'}${q.figure ? ', figure' : ''}] ${q.subtopic}`);
      q.groups.forEach((g) => { if (g.stem) console.log('     ' + g.stem.slice(0, 150)); g.parts.forEach((p) => console.log(`     (${p.label}) ${p.text.slice(0, 150)} [${p.marks}]`)); });
    }
  }
}
