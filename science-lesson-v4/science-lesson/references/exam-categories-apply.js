/* exam-categories-apply.js — corrects the exam tool's topic labels whenever the AQA catalogue
   is loaded (home only). The corrections come from exam-topic-check.js + hand decisions
   (exam-categories.json at the project root). Without that file nothing changes.

   - moves:     the question's parts take their real topic / subtopic
   - dropped:   a wrongly filed copy of a question that is filed correctly elsewhere: removed
   - offTopic:  clearly in the wrong topic, right one unclear: removed
   - figureGap: asks about a picture the library does not have: removed
   Used by exam-pick.js, homework-booklet.js and seed-do-now-bank.js. */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', '..', 'exam-categories.json');
let _fixes;
function fixes() {
  if (_fixes === undefined) {
    try { _fixes = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { _fixes = null; }
  }
  return _fixes;
}

// "<doc>#Q<n>" for a catalogue part row ({ doc, q }).
const qid = (row) => `${row.doc}#Q${row.q}`;

// Corrects catalogue.parts in place (once per catalogue object) and returns the catalogue.
function applyToCatalogue(cat, fixesOverride) {
  const fx = fixesOverride || fixes();
  if (!cat || !Array.isArray(cat.parts) || !fx || cat._categoriesApplied) return cat;
  const gone = new Set([...Object.keys(fx.dropped || {}), ...Object.keys(fx.offTopic || {}), ...Object.keys(fx.figureGap || {})]);
  const moves = fx.moves || {};
  cat.parts = cat.parts.filter((row) => !gone.has(qid(row)));
  for (const row of cat.parts) {
    const m = moves[qid(row)];
    if (m) { row.labelledTopic = row.topic; row.labelledSubtopic = row.subtopic; row.topic = m.topic; row.subtopic = m.subtopic; }
  }
  cat._categoriesApplied = true;
  return cat;
}

// For code that reads a whole docs/<doc>.json (the Do Now seeder): splits the doc's parts into
// one index per corrected topic, leaving out removed questions. Returns [index, ...].
function correctDoc(docSlug, index, fixesOverride) {
  const fx = fixesOverride || fixes();
  if (!fx || !index || !Array.isArray(index.parts)) return [index];
  const gone = new Set([...Object.keys(fx.dropped || {}), ...Object.keys(fx.offTopic || {}), ...Object.keys(fx.figureGap || {})]);
  const groups = new Map();
  for (const p of index.parts) {
    const id = `${docSlug}#Q${p.question}`;
    if (gone.has(id)) continue;
    const m = (fx.moves || {})[id];
    const topic = m ? m.topic : index.topic;
    const subtopic = m ? m.subtopic : (p.subtopic || index.subtopic);
    if (!groups.has(topic)) groups.set(topic, Object.assign({}, index, { topic, parts: [] }));
    groups.get(topic).parts.push(m ? Object.assign({}, p, { topic, subtopic }) : p);
  }
  return [...groups.values()];
}

module.exports = { applyToCatalogue, correctDoc, FILE };
