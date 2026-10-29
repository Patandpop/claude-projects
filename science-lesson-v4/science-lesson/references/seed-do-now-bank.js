#!/usr/bin/env node
'use strict';
/* ============================================================================
   seed-do-now-bank.js — fill the Do Now question banks from the real exam library.

   Takes the 108 parsed exam documents and pulls out the questions that make a good
   Do Now: short, low-demand recall (1-2 marks, "state / name / give / what is"),
   with a real mark scheme as the answer and no figure to print. Nothing is written
   by us — every question and every answer is the examiner's own words.

   WHO GETS WHAT
     Year 9 and up (Patryk raised this from Year 10): AQA questions, but ONLY on
       topics the class has actually been taught. Content is the gate, not language —
       he teaches proper terminology early and wants pupils meeting it.
     12C and 13D: NOTHING from this library. They sit OCR A, not AQA. A question
       from the wrong board is wrong grounding, not merely thin.
     Years 7-8: no bank from here yet. The topic map to Activate has to come first,
       and Seneca is the weekly KS3 tool anyway.

   Usage
     node references/seed-do-now-bank.js                 (write the banks)
     node references/seed-do-now-bank.js --dry-run       (report only, write nothing)
     node references/seed-do-now-bank.js --sample 30     (print 30 for Patryk to veto)
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const { examPartsToBank } = require('./do-now-bank.js');
const { correctDoc } = require('./exam-categories-apply.js');

const ROOT = path.join(__dirname, '..', '..');
const LIB = path.join(ROOT, 'exam-library');
const BANK_DIR = path.join(__dirname, 'question-bank');
const DEFAULTS = path.join(ROOT, 'class-defaults.json');

function loadClasses() {
  const j = JSON.parse(fs.readFileSync(DEFAULTS, 'utf8'));
  return Object.entries(j.classes).map(([code, c]) => ({ code, ...c }));
}

function run(opts) {
  const o = opts || {};
  const catPath = path.join(LIB, 'catalogue.json');
  if (!fs.existsSync(catPath)) {
    throw new Error(`no exam library at ${LIB}\n  Build it first: node references/exam-library-batch.js`);
  }
  const docsDir = path.join(LIB, 'docs');

  // Turn every document into Do Now candidates.
  const bySubject = new Map();
  let scanned = 0;
  for (const f of fs.readdirSync(docsDir)) {
    if (!f.endsWith('.json')) continue;
    const index = JSON.parse(fs.readFileSync(path.join(docsDir, f), 'utf8'));
    // exam-categories.json: questions the exam tool filed under the wrong topic move to the right one
    const picks = correctDoc(f.replace(/\.json$/, ''), index).flatMap((ix) => examPartsToBank(ix, { KS: 'KS4' }));
    scanned += index.parts.length;
    if (!picks.length) continue;
    const key = index.subject || '?';
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key).push(...picks);
  }

  const all = [...bySubject.values()].flat();
  console.log(`\nScanned ${scanned} question parts across the library.`);
  console.log(`Found ${all.length} that work as a Do Now (short recall, real mark scheme, no figure).\n`);
  for (const [sub, list] of [...bySubject].sort()) {
    const topics = new Set(list.map((q) => q.topic));
    console.log(`  ${sub.padEnd(10)} ${String(list.length).padStart(5)} questions across ${topics.size} topics`);
  }

  if (o.sample) {
    console.log(`\n--- ${o.sample} for you to veto ---\n`);
    const step = Math.max(1, Math.floor(all.length / o.sample));
    all.filter((_, i) => i % step === 0).slice(0, o.sample).forEach((q, i) => {
      console.log(`${String(i + 1).padStart(3)}. [${q.subject}/${q.topic}] ${q.text}`);
      console.log(`     answer: ${q.answer}`);
      console.log(`     ${q.marks} mark(s) · ${q.examRef}\n`);
    });
  }

  // OCR A-level Physics (12C, 13D): short single-part questions and multiple choice with a clear
  // answer, from exam-library/docs-ocr (exam-library-ocr.js). Never given to an AQA class.
  const ocr = [];
  const ocrDir = path.join(LIB, 'docs-ocr');
  if (fs.existsSync(ocrDir)) for (const f of fs.readdirSync(ocrDir)) {
    const d = JSON.parse(fs.readFileSync(path.join(ocrDir, f), 'utf8'));
    for (const p of d.parts) {
      const single = p.questionTotalMarks === p.marks;
      if (p.marks > 2 || p.hasFigure || !single || /\[FIG/.test(p.ms.text) || /\[TABLE/.test(p.text)) continue;
      const answer = p.mcqAnswer || p.ms.text.replace(/\s*\b[BCAM]\d\b.*$/s, '').trim();
      if (!answer || answer.length > 160) continue;
      ocr.push({ id: 'ocr-' + p.id.toLowerCase().replace(/[^a-z0-9]+/g, '-'), text: p.text, answer, type: p.mcqAnswer ? 'mcq' : 'recall',
        subject: 'Physics', topic: p.subsubtopic || p.subtopic, unit: p.topic, KS: 'KS5', AO: 'AO1', marks: p.marks, source: 'exam', board: 'OCR A', examRef: p.id });
    }
  }
  console.log(`  OCR A-level ${String(ocr.length).padStart(5)} short questions`);

  // Per class (Patryk 2026-10-08: every class gets a bank):
  //   Years 7-8   the EASIEST AQA recall (real pass rate 65%+, 1-2 marks), for the subjects he teaches them
  //   Years 9-11  AQA, the subjects he teaches them
  //   Years 12-13 OCR A only (never AQA)
  const classes = loadClasses();
  const written = [];
  const skipped = [];

  for (const c of classes) {
    const subjects = c.patrykTeaches || [];
    let pool;
    if (c.year >= 12) pool = ocr;
    else {
      pool = subjects.flatMap((s) => bySubject.get(s) || []);
      if (c.year <= 8) pool = pool.filter((q) => q.passRate != null && q.passRate >= 65 && q.marks <= 2);
    }
    if (!pool.length) {
      skipped.push(`${c.code} — no questions for the subject(s) Patryk teaches them (${subjects.join(', ') || 'none listed'})`);
      continue;
    }
    const bank = {
      _comment: `Do Now question bank for ${c.code}. Every question and answer is taken verbatim from a real exam paper and its mark scheme (AQA GCSE, or OCR A for A-level classes). Seeded from the exam library; do not hand-edit — re-run seed-do-now-bank.js instead.`,
      class: c.code, year: c.year, examBoard: c.examBoard,
      subjects,
      seededOn: new Date().toISOString().slice(0, 10),
      count: pool.length,
      questions: pool,
    };
    const dest = path.join(BANK_DIR, `${c.code}.json`);
    if (!o.dryRun) {
      fs.mkdirSync(BANK_DIR, { recursive: true });
      fs.writeFileSync(dest, JSON.stringify(bank, null, 2), 'utf8');
    }
    written.push(`${c.code} — ${pool.length} questions (${subjects.join(' + ')})`);
  }

  console.log('\nBanks ' + (o.dryRun ? 'that WOULD be written' : 'written') + ':');
  written.forEach((w) => console.log(`  + ${w}`));
  console.log('\nDeliberately NOT given a bank:');
  skipped.forEach((s) => console.log(`  - ${s}`));
  console.log('');
  if (o.dryRun) console.log('(dry run — nothing was written)\n');

  return { all, bySubject, written, skipped };
}

module.exports = { run };

if (require.main === module) {
  const a = process.argv.slice(2);
  const si = a.indexOf('--sample');
  try {
    run({ dryRun: a.includes('--dry-run'), sample: si !== -1 ? parseInt(a[si + 1], 10) : 0 });
  } catch (e) {
    console.error('\nseed-do-now-bank: ' + e.message + '\n');
    process.exit(1);
  }
}
