#!/usr/bin/env node
'use strict';
/* ============================================================================
   extension-pick.js — real exam questions for a review lesson's EXTENSION slide (2026-10-10).

   For each subtopic column: 2-3 short real AQA question parts that are a step up from the test
   (lower pass rate), read straight off a slide (words only: no figure, table or "the graph
   above"), never used before with any of the classes (exam-usage.json), verbatim with their real
   mark scheme as the answer. Prints the `extension` JSON for the lesson (build.js draws it).

   Spec file: [{ "subtopic": "Density", "pages": "P6.1 p.76",
                 "from": ["Changes of State and the Particle Model"],   (library subtopic names)
                 "match": "densit",                                       (optional: words the question must use)
                 "avoid": "334 000" }]                                     (optional: words that rule a question out)

   Usage: node references/extension-pick.js <spec.json> --classes 9XS,9AS [--per 3] [--out file] [--record]
     --record   marks the questions as used (board key "<cls>") for every class, so Do Nows,
                board questions and homework do not repeat them
   ============================================================================ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DOCS = path.join(ROOT, 'exam-library', 'docs');
const USAGE = path.join(ROOT, 'exam-usage.json');
const { loadUsage, saveUsage } = require('./exam-usage.js');   // 2026-10-29: safe read and write of the record
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return d; } };
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// the real mark scheme as an answer: one point per mark, marking notes (allow / ignore ...) left off
function answerOf(ms) {
  // AQA schemes end each point with its mark "1"; a final "2" closes an "any two from" list
  return String(ms || '').replace(/\s+[2-6]\s*$/, '').split(/\s+1(?=\s|$)/).map((x) => x.replace(/\b(allow|accept|ignore|do not accept|this mark may score|max\.? \d)\b[\s\S]*$/i, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean).join('; ');
}

// a part a pupil can answer from the slide alone
function standsAlone(p) {
  const t = String(p.text || '');
  // a picture linked to the whole question is fine when this part's words never point at it
  if (/\[FIG|\[TABLE/.test(t)) return false;
  if (/\b(figure|fig\.|table|graph|diagram|shown|above|below|this experiment|these results|the student'?s? (results|data)|part \(|question \d)/i.test(t)) return false;
  if (/^[a-z(]/.test(t.trim()) || t.length < 40 || t.length > 300) return false;
  if (/\btick\b|draw a ring|complete the sentence|choose (the )?answers? from the box/i.test(t)) return false;   // needs the printed boxes
  const ms = String((p.ms && p.ms.text) || '');
  return ms.length > 3 && !/\[FIG/.test(ms);
}

function pick(spec, classes, opts) {
  const o = opts || {};
  const per = o.per || 3;
  const usage = loadUsage();
  const used = new Set(classes.flatMap((c) => [...(usage[c] || []), ...(usage[c + ':homework'] || []), ...(usage[c + ':test'] || [])]));
  const docs = fs.readdirSync(DOCS).map((f) => ({ f, d: readJson(path.join(DOCS, f), null) })).filter((x) => x.d && x.d.subject === 'Physics');
  const taken = new Set(), stems = new Set();
  return spec.map((col) => {
    const from = (col.from || []).map(norm);
    const re = col.match ? new RegExp(col.match, 'i') : null;
    const avoid = col.avoid ? new RegExp(col.avoid, 'i') : null;     // e.g. the test's own question
    const pool = [];
    for (const { f, d } of docs) {
      if (!from.includes(norm(d.subtopic))) continue;
      for (const p of d.parts) {
        const doc = f.replace(/\.json$/, '');
        const ref = `${doc}#Q${p.question}${p.part || ''}`;   // same form as the other tools: doc#Q5b
        if (used.has(ref) || used.has(`${doc}#Q${p.question}`) || taken.has(ref)) continue;   // the part, or its whole question
        if (!(p.marks >= 2 && p.marks <= 4) || !standsAlone(p) || (re && !re.test(p.text)) || (avoid && avoid.test(p.text))) continue;
        pool.push({ ref, p });
      }
    }
    // a step up from the test: the harder ones first (lower pass rate), but nothing almost nobody got
    const rate = (x) => (x.p.passRate != null ? x.p.passRate : 100 - (x.p.difficulty || 50));
    pool.sort((a, b) => Math.abs(rate(a) - 40) - Math.abs(rate(b) - 40));
    const qs = [];
    for (const x of pool) {
      if (qs.length >= per) break;
      const k = norm(x.p.text).slice(0, 60);
      if (stems.has(k) || rate(x) < 15) continue;
      stems.add(k); taken.add(x.ref);
      qs.push({ q: String(x.p.text).replace(/\s+/g, ' ').trim(), a: answerOf(x.p.ms.text), marks: x.p.marks, ref: x.ref, passRate: x.p.passRate != null ? x.p.passRate : null });
    }
    return { subtopic: col.subtopic, pages: col.pages, questions: qs };
  });
}

function record(ext, classes) {
  const u = loadUsage();
  const refs = ext.flatMap((c) => c.questions.map((q) => q.ref));
  classes.forEach((c) => { u[c] = [...new Set([...(u[c] || []), ...refs])]; });
  saveUsage(u);
}

module.exports = { pick, record, standsAlone, answerOf };

if (require.main === module) {
  const a = process.argv.slice(2), v = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  const spec = readJson(a[0], null);
  if (!spec || !v('--classes')) { console.error('usage: node extension-pick.js <spec.json> --classes 9XS,9AS [--per 3] [--out file] [--record]'); process.exit(1); }
  const classes = v('--classes').split(',').map((s) => s.trim()).filter(Boolean);
  const ext = pick(spec, classes, { per: v('--per') ? +v('--per') : 3 });
  ext.forEach((c) => {
    console.log(`\n${c.subtopic}  (${c.pages}) — ${c.questions.length} question(s)`);
    c.questions.forEach((q) => console.log(`  [${q.marks}${q.passRate != null ? ', pass ' + q.passRate + '%' : ''}] ${q.q}\n     → ${q.a}`));
  });
  if (v('--out')) fs.writeFileSync(v('--out'), JSON.stringify(ext, null, 1));
  if (a.includes('--record')) { record(ext, classes); console.log(`\nrecorded as used for ${classes.join(', ')}`); }
}
