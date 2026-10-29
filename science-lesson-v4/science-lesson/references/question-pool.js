'use strict';
/* ============================================================================
   question-pool.js — the WIDE pool of single exam parts a Do Now can use (2026-10-15).

   The class banks (question-bank/<class>.json) hold only short recall questions (and, for
   A-level, only one-part questions), so many lessons had nothing to match (13D Binding Energy,
   12C Diode, 10C2 series and parallel). When a taught lesson has no bank question, the Do Now
   looks here: every part in the exam library that works on its own, still verbatim with its
   real mark scheme.

   A part is used only if it stands on its own (lesson-match.standalone): no reference to
   another part, no picture or table it lacks, not cut off at the start, a calculation that
   carries its numbers. OCR exports split a question's data across parts, so an OCR part must
   also not lean on "this/these ..." from a lead-in it does not include.

   widePool({ year, board, subjects }) -> [{ id, text, answer, topic, subject, marks, passRate,
                                            type, board, examRef, wide: true }]
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const lm = require('./lesson-match.js');

const ROOT = path.join(__dirname, '..', '..');
const LIB = path.join(ROOT, 'exam-library');

// "Name this process." with the process described in a lead-in the part does not carry
const LEANS_ON_LEAD_IN = /\b(this|these|that|those) (process|reaction|substance|method|change|organ|cell|structure|type|gas|liquid|solid|element|compound|metal|wave|radiation|isotope|device|component|circuit|experiment|investigation|result|value|sample|material|object|ball|car|student|particle|star|galaxy|nucleus|wire|lamp|resistor|graph|equation|disease|plant|animal|organism)s?\b/i;
const tidy = (t) => {
  let s = String(t || '');
  const cut = s.search(/\b(allow|accept|ignore|do not accept)\b/i);
  if (cut > 0) s = s.slice(0, cut);
  return s.replace(/\s*\b[BCAM]\d\b[\s\S]*$/, '').replace(/\s*\b\d\b\s*$/, '').replace(/\s+/g, ' ').trim();
};

function usable(p, text, answer) {
  if (!answer || answer.length > 200 || /\[FIG|\[TABLE/.test(answer)) return false;
  if (text.length > 380 || /\[FIG|\[TABLE/.test(text)) return false;
  if (lm.standalone(text, false)) return false;
  if (LEANS_ON_LEAD_IN.test(text)) return false;
  return true;
}

let _aqa = null, _ocr = null;
function aqaParts() {
  if (_aqa) return _aqa;
  _aqa = [];
  const dir = path.join(LIB, 'docs');
  if (!fs.existsSync(dir)) return _aqa;
  let correctDoc = null;
  try { correctDoc = require('./exam-categories-apply.js').correctDoc; } catch (e) { /* labels as exported */ }
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const docs = correctDoc ? correctDoc(f.replace(/\.json$/, ''), doc) : [doc];
    for (const ix of docs) for (const p of ix.parts || []) {
      if ((p.marks || 0) < 1 || p.marks > 3 || p.hasFigure || (p.figureFiles || []).length) continue;
      if (p.ms && (p.ms.levels || []).length) continue;
      const text = String(p.text || '').trim(), answer = tidy(p.ms && p.ms.text);
      if (!usable(p, text, answer)) continue;
      _aqa.push({ id: 'wide-' + (ix.doc || f.replace(/\.json$/, '')) + '#Q' + p.question + (p.part || ''), text, answer,
        topic: p.subtopic || ix.subtopic, subject: ix.subject, marks: p.marks, passRate: p.passRate == null ? null : p.passRate,
        type: String(p.commandWord || '').toLowerCase() === 'calculate' ? 'calculate' : 'recall', board: 'AQA',
        examRef: (ix.doc || f.replace(/\.json$/, '')) + '#Q' + p.question + (p.part || ''), source: 'exam', wide: true });
    }
  }
  return _aqa;
}
function ocrParts() {
  if (_ocr) return _ocr;
  _ocr = [];
  const dir = path.join(LIB, 'docs-ocr');
  if (!fs.existsSync(dir)) return _ocr;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const p of d.parts || []) {
      if ((p.marks || 0) < 1 || p.marks > 3 || p.hasFigure || p.figuresMissing || (p.tables || []).length || p.optionsInFigure || p.optionsMissing) continue;
      const text = String(p.text || '').trim();
      const ms = (p.ms && p.ms.text) || '';
      // the OCR scheme covers the whole question: only a single-part question's scheme is safely its own
      const own = p.questionTotalMarks === p.marks || p.mcqAnswer;
      if (!own) continue;
      const answer = p.mcqAnswer ? p.mcqAnswer : tidy(ms);
      if (!usable(p, text, answer)) continue;
      _ocr.push({ id: 'wide-' + p.id, text, answer, topic: p.subsubtopic || p.subtopic, subject: 'Physics', marks: p.marks, passRate: null,
        type: p.mcqAnswer ? 'mcq' : (String(p.commandWord || '').toLowerCase() === 'calculate' ? 'calculate' : 'recall'), board: 'OCR A',
        examRef: p.id, source: 'exam', wide: true });
    }
  }
  return _ocr;
}

function widePool(o) {
  const year = Number(o.year) || 10;
  if (year >= 12) return ocrParts();
  const subjects = o.subjects && o.subjects.length ? o.subjects : ['Biology', 'Chemistry', 'Physics'];
  let pool = aqaParts().filter((q) => subjects.includes(q.subject));
  // Years 7-8: only what most GCSE candidates got right (the banks use 65%+; the wide pool 55%+)
  if (year <= 8) pool = pool.filter((q) => q.passRate != null && q.passRate >= 55 && q.marks <= 2);
  return pool;
}

module.exports = { widePool, LEANS_ON_LEAD_IN };
