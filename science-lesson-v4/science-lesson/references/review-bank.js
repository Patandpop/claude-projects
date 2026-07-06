#!/usr/bin/env node
// Review all Do Now question bank files and report issues.
// Usage: node science-lesson/references/review-bank.js

const fs = require('fs');
const path = require('path');

const BANK_DIR = path.join(__dirname, 'question-bank');
const REQUIRED_FIELDS = ['id', 'text', 'answer', 'type', 'subject', 'topic', 'KS', 'AO', 'dateAdded', 'lessonRef'];
const RECENT_DAYS = 30;
const SIMILARITY_THRESHOLD = 0.85;

// Jaccard similarity on word sets — no deps needed
function jaccard(a, b) {
  const setA = new Set(a.toLowerCase().match(/\w+/g) || []);
  const setB = new Set(b.toLowerCase().match(/\w+/g) || []);
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 1 : intersection / union;
}

let errors = 0;
let warnings = 0;

function err(msg)  { console.log(`  ERROR   ${msg}`); errors++; }
function warn(msg) { console.log(`  WARN    ${msg}`); warnings++; }
function info(msg) { console.log(`  info    ${msg}`); }

const files = fs.readdirSync(BANK_DIR)
  .filter(f => f.endsWith('.json') && f !== 'schema.json');

if (files.length === 0) {
  console.log('No bank files found in', BANK_DIR);
  process.exit(0);
}

const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - RECENT_DAYS);

const allQuestions = [];
const summary = [];

for (const file of files) {
  const filepath = path.join(BANK_DIR, file);
  let bank;
  try {
    bank = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    err(`${file}: invalid JSON — ${e.message}`);
    continue;
  }

  const questions = bank.questions || [];
  summary.push({ class: bank.class || file, count: questions.length });

  console.log(`\n── ${file} (${bank.class || '?'}, ${questions.length} questions) ──`);

  // Missing required fields
  for (const q of questions) {
    const missing = REQUIRED_FIELDS.filter(f => !q[f]);
    if (missing.length) err(`${q.id || '(no id)'}: missing fields — ${missing.join(', ')}`);
  }

  // Recent additions
  for (const q of questions) {
    if (!q.dateAdded) continue;
    if (new Date(q.dateAdded) > cutoff) info(`${q.id}: added ${q.dateAdded} — new, check answer`);
  }

  // Duplicate IDs within file
  const ids = questions.map(q => q.id);
  const dupeIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const id of new Set(dupeIds)) err(`duplicate id: ${id}`);

  allQuestions.push(...questions.map(q => ({ ...q, _file: file })));
}

// Cross-file duplicate/near-duplicate check
// ponytail: O(n²) — fine under ~200 questions; switch to Map+hash if bank grows
console.log('\n── Cross-bank duplicate check ──');
let foundDupes = false;
for (let i = 0; i < allQuestions.length; i++) {
  for (let j = i + 1; j < allQuestions.length; j++) {
    const a = allQuestions[i];
    const b = allQuestions[j];
    const sim = jaccard(a.text, b.text);
    if (sim === 1) {
      err(`EXACT DUPLICATE: "${a.id}" (${a._file}) == "${b.id}" (${b._file})`);
      foundDupes = true;
    } else if (sim >= SIMILARITY_THRESHOLD) {
      warn(`near-duplicate (${(sim * 100).toFixed(0)}%): "${a.id}" vs "${b.id}"`);
      warn(`  "${a.text}"`);
      warn(`  "${b.text}"`);
      foundDupes = true;
    }
  }
}
if (!foundDupes) info('no duplicates found');

// Summary table
console.log('\n── Summary ──');
const total = summary.reduce((n, s) => n + s.count, 0);
for (const s of summary) console.log(`  ${s.class.padEnd(8)} ${s.count} questions`);
console.log(`  ${'TOTAL'.padEnd(8)} ${total} questions`);

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors > 0 ? 1 : 0);
