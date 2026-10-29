'use strict';
/* ============================================================================
   exam-categorise.js — what KIND of question each exam part is (Patryk 2026-10-08).

   Used by Do Nows and the self-marking homework, so each picks the right kind:
     mcq          tick one box / A-D choice, with the right option known  -> marks itself
     recall       name / state / give / what / which, 1-2 marks
     define       define / what is meant by
     calculation  calculate / determine / show that
     explain      explain / describe / suggest / compare, 2-4 marks
     extended     6-mark levelled answers
     practical    method, variables, apparatus, required practical
     data         reads a graph / table / figure
   `auto` = the computer can mark it (a multiple choice whose answer we are sure of).
   Nothing is rewritten: options and answers are the exam's own words.
   ============================================================================ */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// AQA "Tick (✓) one box." parts: options are the sentences between the tick-box images [FIG:n].
// The mark scheme names the right one in words; we accept it only when exactly one option matches.
function aqaTick(p) {
  const t = String(p.text || '');
  const at = t.search(/Tick\s*\(?✓?\)?\s*one\s*box\.?/i);
  if (at < 0) return null;
  const tail = t.slice(at).replace(/^Tick\s*\(?✓?\)?\s*one\s*box\.?\s*/i, '');
  const options = tail.split(/\s*\[FIG:\d+\]\s*/).map((x) => x.trim()).filter(Boolean);
  if (options.length < 2 || options.length > 6 || !/\[FIG:\d+\]\s*$/.test(t.trim())) return null;
  const ms = norm(((p.ms || {}).text || '').replace(/\s\d\s*$/, ''));
  if (!ms) return null;
  const hits = options.map((o, i) => [i, norm(o)]).filter(([, o]) => o && (ms.includes(o) || o.includes(ms)));
  if (hits.length !== 1) return null;
  return { stem: t.slice(0, at).trim(), options, answer: hits[0][0] };
}
// OCR A-D questions (exam-library-ocr.js already found the letter)
function ocrMcq(p) {
  if (!p.mcqAnswer || !p.mcqOptions) return null;
  const lines = String(p.text).split('\n');
  // only the option lines themselves leave the stem ("A satellite of mass ..." is part of the question)
  const opt = new Set(p.optionsInFigure ? [] : p.mcqOptions);
  const stem = lines.filter((l) => !opt.has(l)).join('\n').trim();
  const options = p.mcqOptions.map((o) => o.replace(/^[A-D]\s+/, ''));
  return { stem, options, answer: 'ABCD'.indexOf(p.mcqAnswer) };
}

function categorise(p) {
  const mcq = aqaTick(p) || ocrMcq(p);
  const cw = String(p.commandWord || '').toLowerCase();
  const t = String(p.text || '');
  let cat;
  if (mcq) cat = 'mcq';
  else if ((p.ms && p.ms.levels && p.ms.levels.length) || p.marks >= 6) cat = 'extended';
  else if (/\b(variable|apparatus|method|independent|dependent|control|required practical|risk|repeat)\b/i.test(t) && p.marks >= 2) cat = 'practical';
  else if (/^(calculate|determine|show that|estimate)/.test(cw) || /\bcalculate\b/i.test(t.slice(-200))) cat = 'calculation';
  else if (/^(define)|what is meant by/i.test(cw + ' ' + t.slice(-120))) cat = 'define';
  else if (/\b(graph|table|figure|fig\.)\b/i.test(t) && /\b(use|using|read|from)\b/i.test(t)) cat = 'data';
  else if (/^(explain|describe|suggest|compare|evaluate|discuss|justify)/.test(cw) || p.marks >= 3) cat = 'explain';
  else cat = 'recall';
  return { cat, mcq, auto: !!mcq };
}

module.exports = { categorise, aqaTick, ocrMcq };
