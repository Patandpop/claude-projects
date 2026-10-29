#!/usr/bin/env node
'use strict';
/* ============================================================================
   spec-index.js — the memory map's spec index and lesson tags (big goal 1, step 1;
   lanes/design-memory-map.md section 2; 29 Oct 2026). Home only, reads the exam library.

   The squares of the memory map are the exam library's own sections, which ARE the
   specification's sections: AQA GCSE subtopics ("Physics: Internal Energy", inside the unit
   "Particle Model of Matter") and OCR A sub-subtopics ("OCR A: Stars", inside "Astrophysics").
   Chosen here instead of typing spec numbers from memory: the names come straight from the
   papers' own labels, so nothing is invented. Official numbers (4.3.1.1) can be added later in
   `ref` from the published specifications without changing any code.

   Lesson tags: for each lesson of each class, the lesson matcher (lesson-match.js) already says
   which library sections a lesson draws on. The tag is the one or two of those its matching exam
   questions actually come from most. When no question matches, a single listed section is used
   (exact), else the section whose name shares the most words with the lesson title (guess: true).
   KS3 lessons are tagged with the GCSE sections they lead into, so Year 9 carries into Year 10.

   node references/spec-index.js            write spec-points/index.json and spec-points/lesson-tags.json
   node references/spec-index.js --report   print every lesson's codes (writes nothing)
   ============================================================================ */
const fs = require('fs');
const path = require('path');
const lm = require('./lesson-match.js');

const ROOT = path.join(__dirname, '..', '..');
const LIB = path.join(ROOT, 'exam-library');
const OUT = path.join(__dirname, 'spec-points');
const key = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((w) => w.length > 3);

function loadParts() {
  const aqa = [], ocr = [];
  let correctDoc = null;
  try { correctDoc = require('./exam-categories-apply.js').correctDoc; } catch (e) { /* labels as exported */ }
  const ad = path.join(LIB, 'docs');
  if (fs.existsSync(ad)) for (const f of fs.readdirSync(ad).filter((x) => x.endsWith('.json'))) {
    const doc = JSON.parse(fs.readFileSync(path.join(ad, f), 'utf8'));
    for (const ix of correctDoc ? correctDoc(f.replace(/\.json$/, ''), doc) : [doc])
      for (const p of ix.parts || []) aqa.push({ board: 'AQA', subject: ix.subject, unit: ix.topic, sub: p.subtopic || ix.subtopic, text: String(p.text || ''), ms: String((p.ms && p.ms.text) || '') });
  }
  const od = path.join(LIB, 'docs-ocr');
  if (fs.existsSync(od)) for (const f of fs.readdirSync(od).filter((x) => x.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(path.join(od, f), 'utf8'));
    for (const p of d.parts || []) ocr.push({ board: 'OCR A', subject: 'Physics', unit: p.subtopic, sub: p.subsubtopic || p.subtopic, text: String(p.text || ''), ms: String((p.ms && p.ms.text) || '') });
  }
  return { aqa, ocr };
}
const codeOf = (p) => (p.board === 'OCR A' ? 'OCR A: ' + p.sub : p.subject + ': ' + p.sub);

function buildIndex(parts) {
  const seen = new Map();
  for (const p of [...parts.aqa, ...parts.ocr]) {
    if (!p.sub) continue;
    const code = codeOf(p);
    if (!seen.has(code)) seen.set(code, { code, title: p.sub, unit: p.unit, subject: p.subject, board: p.board, ref: '' });
  }
  return [...seen.values()].sort((a, b) => (a.board + a.subject + a.unit + a.title).localeCompare(b.board + b.subject + b.unit + b.title));
}

// the codes for one lesson: { codes: [...], guess: bool } or { codes: [], none: why }
function tagLesson(L, year, parts, index) {
  const spec = lm.specFor({ topic: L.topic, title: L.title });
  if (!spec) return { codes: [], none: 'lesson not in the lesson map' };
  if (spec.none) return { codes: [], none: spec.why || 'no exam content' };
  const pool = year >= 12 ? parts.ocr : parts.aqa;
  const subj = { B: 'Biology', C: 'Chemistry', P: 'Physics' }[(String(L.topic).match(/^([BCP])\d/) || [])[1]];
  const inSubs = (sub) => spec.subs === '*' || spec.subs.has(key(sub)) || (spec.any || []).some((e) => e.subs === '*' || e.subs.has(key(sub)));
  const count = new Map();
  for (const p of pool) {
    if (subj && p.subject !== subj) continue;
    if (!inSubs(p.sub)) continue;
    const r = lm.match({ text: p.text, ms: p.ms, subtopic: p.sub, subject: p.subject }, spec);
    if (r.ok && r.tier <= 2) count.set(codeOf(p), (count.get(codeOf(p)) || 0) + 1);
  }
  const ranked = [...count.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  if (ranked.length) {
    const top = ranked[0][1];
    return { codes: ranked.filter(([, n], i) => i < 2 && n >= Math.max(2, top * 0.34) || i === 0).map(([c]) => c), guess: false, evidence: ranked.slice(0, 2).map(([, n]) => n) };
  }
  // no question matched: a single listed section is exact; otherwise the best title match, marked as a guess
  const listed = index.filter((e) => (year >= 12 ? e.board === 'OCR A' : e.board === 'AQA') && (!subj || e.subject === subj) && spec.subs !== '*' && spec.subs.has(key(e.title)));
  if (listed.length === 1) return { codes: [listed[0].code], guess: false };
  const tw = new Set(words(L.title));
  const cands = (listed.length ? listed : index.filter((e) => (year >= 12 ? e.board === 'OCR A' : e.board === 'AQA') && (!subj || e.subject === subj)))
    .map((e) => ({ e, s: words(e.title + ' ' + e.unit).filter((w) => [...tw].some((t) => t.slice(0, 5) === w.slice(0, 5))).length }))
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  if (cands.length) return { codes: [cands[0].e.code], guess: true };
  // KS3 content GCSE does not cover (seasons, eclipses, history of the atom): a KS3 section named after its own topic
  if (year <= 9) return { codes: ['KS3: ' + String(L.topic).replace(/^[BCP]\d+\s*/, '')], guess: false, ks3: true };
  return { codes: [], none: 'no section found' };
}

// every lesson of every class in planner-data.json: { lessonId: { codes, guess } }, plus the misses
function tagAll(data, parts, index) {
  const tags = {}, misses = [];
  const lessonId = (L) => L.rel || L.origKey || `${L.unit}|${L.title}`;
  for (const [cls, c] of Object.entries(data.classes || {})) for (const L of c.seq || []) {
    const id = lessonId(L);
    if (tags[id]) continue;
    const t = tagLesson(L, c.year, parts, index);
    tags[id] = t.none ? { codes: [], none: t.none } : Object.assign({ codes: t.codes, guess: !!t.guess }, t.ks3 ? { ks3: true } : {});
    if (!t.codes.length && !t.none) misses.push(`${cls} ${L.topic} / ${L.title}`);
    if (t.none === 'no section found') misses.push(`${cls} ${L.topic} / ${L.title}`);
  }
  return { tags, misses };
}

// Homework Forms -> codes (design 2.2): every quiz file made at home (homework-out/**/homework-*.json) lists
// each question's library reference; the planner's results key a question by its label number (or its
// place, for old files), the same rule as Code.gs. Returns { 'homework-10C2-2026-10-22-core.json': { '1': [code] } }.
function hwSpec() {
  const out = {}, base = path.join(ROOT, 'homework-out'), docCache = new Map();
  let correctDoc = null;
  try { correctDoc = require('./exam-categories-apply.js').correctDoc; } catch (e) { /* labels as exported */ }
  const codeFor = (ref) => {
    const m = /^(.*)#Q(\d+)/.exec(String(ref || ''));
    if (!m) return null;
    if (!docCache.has(m[1])) {
      let docs = null;
      const a = path.join(LIB, 'docs', m[1] + '.json'), o = path.join(LIB, 'docs-ocr', m[1] + '.json');
      if (fs.existsSync(a)) { const d = JSON.parse(fs.readFileSync(a, 'utf8')); docs = (correctDoc ? correctDoc(m[1], d) : [d]).map((ix) => ({ board: 'AQA', ix })); }
      else if (fs.existsSync(o)) docs = [{ board: 'OCR A', ix: JSON.parse(fs.readFileSync(o, 'utf8')) }];
      docCache.set(m[1], docs);
    }
    const docs = docCache.get(m[1]);
    if (!docs) return null;
    for (const { board, ix } of docs) {
      const p = (ix.parts || []).find((x) => x.question === +m[2]);
      if (p) return board === 'OCR A' ? 'OCR A: ' + (p.subsubtopic || p.subtopic) : ix.subject + ': ' + (p.subtopic || ix.subtopic);
    }
    return null;
  };
  const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (/^homework-.*\.json$/.test(e.name)) {
      let q = null; try { q = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (err) { continue; }
      const v2 = Number(q.schema) >= 2, map = {};
      (q.questions || []).forEach((x, n) => { const k = v2 && x.label ? String(x.label).replace(/^Question\s+/, '') : String(n + 1); const c = codeFor(x.ref); if (c) map[k] = [c]; });
      if (Object.keys(map).length) out[e.name] = map;
    } } };
  walk(base);
  return out;
}

// Put the codes on each lesson of a planner-data object (L.spec, L.specGuess) and the index on the data
// (data.specIndex), from the spec-points files. Used by planner-catalogue.js --export, and by
// `node spec-index.js --apply planner/planner-data.json` to update a data file in place (Drive not needed).
function applyTo(data) {
  const idx = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8')).points;
  const tags = JSON.parse(fs.readFileSync(path.join(OUT, 'lesson-tags.json'), 'utf8')).tags;
  const lessonId = (L) => L.rel || L.origKey || `${L.unit}|${L.title}`;
  let n = 0;
  for (const c of Object.values(data.classes || {})) for (const L of c.seq || []) {
    const t = tags[lessonId(L)];
    delete L.spec; delete L.specGuess;
    if (t && (t.codes || []).length) { L.spec = t.codes; if (t.guess) L.specGuess = true; n++; }
  }
  data.hwSpec = hwSpec();
  data.specIndex = idx.map((e) => ({ code: e.code, title: e.title, unit: e.unit, board: e.board, subject: e.subject }));
  return n;
}

module.exports = { loadParts, buildIndex, tagLesson, tagAll, codeOf, applyTo, hwSpec };

if (require.main === module && process.argv.includes('--apply')) {
  const f = process.argv[process.argv.indexOf('--apply') + 1];
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  const n = applyTo(data);
  fs.writeFileSync(f, JSON.stringify(data));
  console.log(`spec codes put on ${n} lessons in ${f} (${data.specIndex.length} sections, ${Object.keys(data.hwSpec).length} homework quiz files)`);
} else if (require.main === module) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'planner', 'planner-data.json'), 'utf8'));
  const parts = loadParts();
  const index = buildIndex(parts);
  const { tags, misses } = tagAll(data, parts, index);
  // KS3-only sections join the index (design 2.1: KS3 has no exam spec)
  for (const t of Object.values(tags)) for (const c of t.codes || []) if (/^KS3: /.test(c) && !index.some((e) => e.code === c)) index.push({ code: c, title: c.slice(5), unit: c.slice(5), subject: 'KS3', board: 'KS3', ref: '' });
  const n = Object.keys(tags).length, guessed = Object.values(tags).filter((t) => t.guess).length, none = Object.values(tags).filter((t) => t.none).length;
  if (process.argv.includes('--report')) {
    for (const [id, t] of Object.entries(tags)) console.log(`${id}\n    ${t.none ? '(none: ' + t.none + ')' : t.codes.join(' | ') + (t.guess ? '  [guessed]' : '')}`);
  } else {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ built: new Date().toISOString().slice(0, 10), note: 'Squares of the memory map: the exam library sections (spec-index.js). ref = official spec number, to fill in.', points: index }, null, 1) + '\n');
    fs.writeFileSync(path.join(OUT, 'lesson-tags.json'), JSON.stringify({ built: new Date().toISOString().slice(0, 10), note: 'Spec codes per lesson (spec-index.js). guess = matched by title, not by its exam questions.', tags }, null, 1) + '\n');
  }
  console.log(`${index.length} spec sections; ${n} lessons: ${n - none - guessed} tagged from their questions, ${guessed} guessed, ${none} with no exam content (assessments, safety)` + (misses.length ? `\nNo code (${misses.length}):\n  ` + misses.join('\n  ') : ''));
}
