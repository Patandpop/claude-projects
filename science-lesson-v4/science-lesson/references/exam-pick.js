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
//   - A REBUILD of the same lesson keeps the question it got first (exam-lesson-picks.json,
//     2026-10-15): recording the first pick as "used" made every rebuild pick a different one.
// Local only, no API. Home-only: when exam-library/ is absent (claude.ai) it returns nothing.
'use strict';

const fs = require('fs');
const path = require('path');
const hb = require('./homework-booklet.js');
const lm = require('./lesson-match.js');
const { applyToCatalogue } = require('./exam-categories-apply.js');

const ROOT = path.join(__dirname, '..', '..');
const LIB = path.join(ROOT, 'exam-library');
const USAGE = path.join(ROOT, 'exam-usage.json');
const PICKS = path.join(ROOT, 'exam-lesson-picks.json');

// Drive topic code (start of meta.macrotopic) -> library topic. Library = AQA GCSE spec names.
const AQA_TOPIC = {
  P1: 'Energy', P2: 'Electricity', P3: 'Particle Model of Matter', P4: 'Atomic Structure',
  P5: 'Forces', P6: 'Waves', P7: 'Magnetism', P8: 'Space Physics',
  B1: 'Cell Biology', B2: 'Organisation', B3: 'Infection and Response', B4: 'Bioenergetics',
  B5: 'Homeostasis and Response', B6: 'Inheritance Variation and Evolution', B7: 'Ecology',
  // Chemistry: exactly as the library stores them (from his export file names, read 2026-10-08)
  C1: 'Atomic Structure and Periodic Table', C2: 'Bonding; Structure and Properties of Matter',
  C3: 'Quantitative Chemistry', C4: 'Chemical Changes', C5: 'Energy Changes',
  C6: 'Rate and Extent of Chemical Change', C7: 'Organic Chemistry', C8: 'Chemical Analysis',
  C9: 'Chemistry of the atmosphere', C10: 'Using Resources',
};
const OCR_CLASSES = /^(12|13)/;
const STOP = new Set('a an and are as at be by for from how in is it its of on or that the this to was what when which why with you your use using lesson part'.split(' '));

let _cat = null;
function catalogue() {
  if (_cat) return _cat;
  const f = path.join(LIB, 'catalogue.json');
  // exam-categories.json corrects the exam tool's topic labels (exam-categories-apply.js)
  _cat = fs.existsSync(f) ? applyToCatalogue(JSON.parse(fs.readFileSync(f, 'utf8'))) : null;
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
// One lesson = class + topic + lesson number (title when there is no number).
function lessonKey(m) {
  const n = m.lessonNumber != null && m.lessonNumber !== '' ? 'L' + m.lessonNumber : String(m.title || m.topic || '').trim().toLowerCase();
  return [m.class, m.macrotopic, n].map((x) => String(x || '').trim()).join('|');
}
function loadPicks() {
  try { return JSON.parse(fs.readFileSync(PICKS, 'utf8')); } catch { return {}; }
}
// question id -> the lesson that was just given it; recordUse saves only what build.js really used
const pending = new Map();

// Library subtopic -> its library topic, for one subject (a lesson can draw on another topic's questions).
let _subTopics = null;
function subtopicTopics(subject) {
  if (!_subTopics) {
    _subTopics = new Map();
    for (const r of ((catalogue() || {}).parts || [])) {
      if (!_subTopics.has(r.subject)) _subTopics.set(r.subject, new Map());
      _subTopics.get(r.subject).set(String(r.subtopic).toLowerCase().replace(/[^a-z0-9]+/g, ''), r.topic);
    }
  }
  return _subTopics.get(subject) || new Map();
}
// A whole question, plus its opening parts on their own: (a), (a)-(b), (a)-(c). Opening parts keep the
// question's lead-in, so they read exactly as on the paper; later parts are never used without them.
function variants(q) {
  const out = [q];
  for (let k = 1; k < Math.min(q.parts.length, 4); k++) {
    const parts = q.parts.slice(0, k);
    const files = new Set(parts.flatMap((p) => p.figureFiles || []));
    const figs = q.figs.filter((f) => files.has(f.file));
    const rates = parts.map((p) => p.passRate).filter((r) => r != null);
    out.push(Object.assign({}, q, {
      parts, partial: k, figs,
      marks: parts.reduce((n, p) => n + (p.marks || 0), 0),
      tiny: figs.some((f) => f.bytes < 6000 || f.w < 120 || f.h < 60),
      levelled: parts.some((p) => p.ms && (p.ms.levels || []).length),
      passRate: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null,
      text: parts.map((p) => hb.clean(p.text)).join(' '),
      msLen: parts.map((p) => (p.ms && p.ms.text) || '').join(' ').length,
    }));
  }
  return out;
}

// Parser damage guards: a part that starts mid-word ("nd turbines are used...") lost its
// opening; a question that talks about "the graph/figure/table" but carries no picture can't be
// answered. Both are rejected rather than shown to pupils.
function damaged(q) { return q.parts.some((p) => /^[a-z]/.test(hb.clean(p.text))) ||
  Math.max(0, ...[...q.text.matchAll(/\bFigure\s+(\d+)/gi)].map((x) => +x[1])) > q.figs.length ||
  (!q.figs.length && /\b(graph|figure|diagram|table|chart|photograph|shown (below|above|in))\b/i.test(q.text)); }
// Answered in BOOKS, so nothing that needs the printed paper: drawing lines/rings, ticking
// boxes, completing a table, marking a diagram or graph.
function paperOnly(q) { return /\b(draw (a|one|two|three|straight|vertical|horizontal)?\s*(straight )?(line|ring|circle|arrow)|draw a ring|tick|complete the (table|diagram|graph|chart|sentence|boxes|flow ?chart)|complete the boxes|fill in the (boxes|table)|on the (diagram|graph|figure|chart) (above|below)|label|plot|shade|circle the|ring around|list a)\b/i.test(q.text); }
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

  // What the lesson is about (lesson-match.js, 2026-10-15): its exam subtopics and the words a question
  // must be about. Questions come from every library topic those subtopics sit in (P1 Energy's
  // specific heat questions are filed under Particle Model of Matter), never on word overlap alone.
  const spec = lm.specFor({ topic: m.macrotopic, title: m.title || m.topic });
  if (spec && spec.none) return { board: null, worksheet: null, why: `no exam question for this lesson (${spec.why})` };
  const topics = new Set([topic]);
  if (spec && spec.subs !== '*') for (const [sub, t] of subtopicTopics(subject)) if (spec.subs.has(sub)) topics.add(t);
  const seenIds = new Set();
  const all = [...topics].flatMap((t) => candidates(subject, t)).filter((q) => (seenIds.has(q.id) ? false : seenIds.add(q.id)));
  if (!all.length) return { board: null, worksheet: null, why: `no ${subject} / ${topic} questions in the library yet` };
  const u0 = o.usage || loadUsage();
  const used = new Set([...(u0[cls] || []), ...(u0[cls + ':homework'] || []), ...(u0[cls + ':test'] || [])]);   // never repeat a homework (or old test) question on the board
  const lw = lessonWords(L);
  // a long question can still give its OPENING parts: (a), (a)-(b) or (a)-(c), which carry the lead-in
  // (2026-10-15: most distance-time and latent heat questions run to 7 parts and a graph to draw)
  const fresh = all.filter((q) => !used.has(q.id)).flatMap(variants).filter((q) => !q.tiny && !damaged(q) && !paperOnly(q) && !noData(q));
  const rank = (a, b) => (b.rel - a.rel) || ((a.passRate == null) - (b.passRate == null)) ||
    (Math.abs((a.passRate || 50) - 50) - Math.abs((b.passRate || 50) - 50)) || a.id.localeCompare(b.id);
  fresh.forEach((q) => {
    if (!spec) { q.rel = score(q, lw); return; }   // a lesson outside the map: the old word score
    const r = lm.match({ text: q.text, ms: q.parts.map((p) => (p.ms && p.ms.text) || '').join(' '), subtopic: q.subtopic, subject }, spec);
    q.match = r;
    q.rel = r.ok ? lm.rank(r) * 10 + (q.partial ? 0 : 5) : -1e6;
  });
  if (!spec) console.warn(`  [exam] "${m.macrotopic} / ${m.title || m.topic}" is not in lesson-match-data.js: matched on words only`);
  // the library spells some subtopics wrongly ("Cell Strucutre"), so compare letters ignoring order slips
  const sameSub = (a, b) => { const k = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '').split('').sort().join(''); return k(a) === k(b); };
  if (m.examSubtopic) fresh.forEach((q) => { if (sameSub(q.subtopic, m.examSubtopic)) q.rel += 100; });
  // meta.examKeywords: words the question must be about (9XS microscopes: microscope, onion, iodine...)
  if (Array.isArray(m.examKeywords) && m.examKeywords.length) fresh.forEach((q) => {
    const hits = m.examKeywords.filter((w) => new RegExp(`\\b${String(w).replace(/[^\w ]/g, '')}`, 'i').test(q.text)).length;
    q.rel += hits ? 200 + 20 * hits : -200;
  });
  const onTopic = fresh.filter((q) => q.rel > -1e5);

  // Board: 3-6 marks, <= 3 parts, at most one real figure, fits a slide at >= 16pt, short enough
  // mark scheme to read off the board, not a levelled 6-marker (those belong on paper).
  const boardOk = (q) => q.marks >= 3 && q.marks <= 6 && q.parts.length <= 3 && q.figs.length <= 1 &&
    !q.levelled && q.text.length <= (q.figs.length ? 480 : 700) && q.msLen <= 650 &&
    (q.passRate == null || (q.passRate >= 25 && q.passRate <= 75));
  // meta.examRef names the board question exactly (still a real, verbatim library question)
  // (the slide shows ONE picture, so a named question needing two is refused: 2026-10-09 coal question)
  // A rebuild keeps this lesson's first question (meta.examRef wins; meta.examFresh: true asks for a new one).
  const key = lessonKey(m);
  const kept = m.examFresh ? {} : ((o.picks || loadPicks())[key] || {});
  const wantId = m.examRef || kept.board;
  const whole = wantId ? all.find((q) => q.id === wantId) : null;
  const named = whole ? variants(whole).find((q) => (m.examRef ? !q.partial : (q.partial || 0) === (kept.boardParts || 0)) && !damaged(q) && q.figs.length <= 1) || null : null;
  if (m.examRef && !named) console.warn(`  [exam] examRef ${m.examRef} not used: not in this topic, damaged, or needs more than one picture`);
  else if (!m.examRef && kept.board && named) console.log(`  [exam] rebuild: keeping this lesson's question ${kept.board}`);
  // Nothing fits the strict rules (10C2 P1 Energy, 2026-10-12): rather than no exam question at all,
  // allow 2-mark questions, any pass rate and longer text. Still never a levelled 6-marker.
  const looseOk = (q) => q.marks >= 2 && q.marks <= 6 && q.parts.length <= 3 && q.figs.length <= 1 &&
    !q.levelled && q.text.length <= 900 && q.msLen <= 900;
  const board = named || onTopic.filter(boardOk).sort(rank)[0] || onTopic.filter(looseOk).sort(rank)[0] || null;

  // Worksheet: a different short figure-free question, 2-4 marks.
  const wsOk = (q) => (!board || q.id !== board.id) && q.marks >= 2 && q.marks <= 4 && !q.figs.length &&
    q.parts.length <= 2 && !q.levelled && q.text.length <= 320;
  const wsWhole = kept.worksheet && (!board || kept.worksheet !== board.id) ? all.find((q) => q.id === kept.worksheet) : null;
  const keptWs = wsWhole ? variants(wsWhole).find((q) => (q.partial || 0) === (kept.worksheetParts || 0) && !damaged(q)) || null : null;
  const worksheet = keptWs || onTopic.filter(wsOk).sort(rank)[0] || null;
  if (board) pending.set(board.id, { key, slot: 'board', parts: board.partial || 0 });
  if (worksheet) pending.set(worksheet.id, { key, slot: 'worksheet', parts: worksheet.partial || 0 });

  return { board: board && shape(board), worksheet: worksheet && shape(worksheet),
    why: board ? undefined : `no ${subject} question about this lesson fits a slide (${onTopic.length} on-topic unused, ${all.length} checked)` };
}

// The object build.js renders. Text stays verbatim (only the [FIG:n] markers are removed).
function shape(q) {
  return {
    examRef: q.id, board: 'AQA', subject: q.subject, topic: q.topic, subtopic: q.subtopic, marks: q.marks,
    partsUsed: q.partial || 0,   // 0 = the whole question; n = its first n parts (2026-10-15)
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
// A check build with NO_UPLOAD=1 is not a lesson the class will see: recording it made every
// re-check pick a different question (2026-10-09: the third check build landed on a jetpack question).
function recordUse(cls, ids) {
  if (!cls || !ids.length || process.env.NO_UPLOAD) return;
  const u = loadUsage();
  u[cls] = [...new Set([...(u[cls] || []), ...ids])];
  fs.writeFileSync(USAGE, JSON.stringify(u, null, 1), 'utf8');
  // and which lesson got them, so a rebuild of that lesson shows the same question
  const mine = ids.map((id) => [id, pending.get(id)]).filter(([, p]) => p && p.key.split('|')[0] === cls);
  if (!mine.length) return;
  const picks = loadPicks();
  for (const [id, p] of mine) { picks[p.key] = { ...(picks[p.key] || {}), [p.slot]: id, [p.slot + 'Parts']: p.parts || 0, at: new Date().toISOString().slice(0, 10) }; pending.delete(id); }
  fs.writeFileSync(PICKS, JSON.stringify(picks, null, 1), 'utf8');
}

module.exports = { pickForLesson, recordUse, loadUsage, loadPicks, lessonKey, PICKS, variants, subtopicTopics, candidates, damaged, paperOnly, noData, AQA_TOPIC, USAGE };

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
