#!/usr/bin/env node
'use strict';
/* ============================================================================
   exam-definition.js — the exam board's own wording for a definition, and how often it was asked
   (home only; the exam library is not on claude.ai).

   Lesson quality Part A (2026-10-19): Learn slides can carry an `examDefinition` box ("LEARN THIS
   WORDING", one highlight colour per mark, "AQA: asked 7 times"). This finds the real mark scheme
   wording and the count, so the box quotes the board, never an invented definition.

   Usage
     node science-lesson/references/exam-definition.js "specific heat capacity"
     node science-lesson/references/exam-definition.js "diffusion" --board OCR      (OCR A library)
   Prints: how many questions asked for the definition, then each distinct mark scheme wording
   (most common first) with where it came from and its marks split one per line. Copy the best
   one into the lesson as examDefinition.wording with {1}…{/1} around each mark-earning part.
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const { markPoints } = require('./ms-friendly.js');

const LIB = path.join(__dirname, '..', '..', 'exam-library');

function find(term, board) {
  const dir = path.join(LIB, board === 'OCR' ? 'docs-ocr' : 'docs');
  const t = term.toLowerCase().trim();
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // a definition question: asks for the meaning of the term, or gives "<term> is the ..." with a gap to fill
  const fill = new RegExp(esc + '(?: of [a-z ]{1,20})? is (?:the|a|an)\\b[^.]*_{2,}|' + esc + '(?: of [a-z ]{1,20})? is (?:the|a|an)\\b[^.]*\\.{3,}', 'i');
  const ask = new RegExp('(define|definition of|meant by|meaning of)(?: the (?:term|word))?\\s*[\'‘"“]?(?:an? |the )?' + esc + '\\b', 'i');
  const hits = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    let d;
    try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (_) { continue; }
    for (const p of d.parts || []) {
      const q = String(p.text || '');
      if (!q.toLowerCase().includes(t)) continue;
      if (!(ask.test(q) || fill.test(q))) continue;                 // the TERM itself is what is defined
      if (!p.ms || !p.ms.text) continue;
      hits.push({ doc: f.replace(/\.json$/, ''), q: p.question, part: p.part || '', marks: p.marks || 1, text: q, ms: p.ms });
    }
  }
  return hits;
}

function main() {
  const a = process.argv.slice(2);
  const term = a.find((x) => !x.startsWith('--') && a[a.indexOf(x) - 1] !== '--board');
  const board = (a.includes('--board') ? a[a.indexOf('--board') + 1] : 'AQA').toUpperCase();
  if (!term) { console.error('usage: node exam-definition.js "term" [--board AQA|OCR]'); process.exit(1); }
  if (!fs.existsSync(LIB)) { console.error('exam library not found (home PC only): ' + LIB); process.exit(1); }
  const hits = find(term, board);
  console.log(`${board}: "${term}" asked as a definition ${hits.length} time${hits.length === 1 ? '' : 's'} in the library.`);
  if (!hits.length) return;
  const groups = new Map();
  for (const h of hits) {
    const k = h.ms.text.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(h);
  }
  [...groups.values()].sort((x, y) => y.length - x.length).slice(0, 5).forEach((g, i) => {
    const h = g[0];
    console.log(`\n${i + 1}. ${g.length}x  (${h.marks} mark${h.marks === 1 ? '' : 's'})  e.g. ${h.doc} Q${h.q}${h.part}`);
    console.log('   question: ' + h.text.replace(/\s+/g, ' ').slice(0, 160));
    const mp = markPoints(h.ms, { marks: h.marks });
    (mp.points || []).forEach((pt, n) => console.log(`   mark ${n + 1}: ${pt.says}`));
  });
  console.log('\nPut it in the lesson as examDefinition: { term, wording: "…{1}…{/1}…", board: "' + board + '", asked: ' + hits.length + ' }');
}

if (require.main === module) main();
module.exports = { find };
