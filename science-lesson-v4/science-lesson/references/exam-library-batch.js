#!/usr/bin/env node
'use strict';
/* ============================================================================
   exam-library-batch.js — read EVERY exam document and build the library.

   Patryk's exam papers live on Drive under Admin/Exam Questions/<Subject>/.
   This walks that folder, parses each document, pulls its figures out, and
   writes a local library. It is subject-agnostic: a new Chemistry folder is
   picked up with no code change.

   IT NEVER TOUCHES HIS DRIVE FILES. They are the source of truth; everything
   written goes to a local folder. Nothing is renamed, moved or deleted.

   OUTPUT (default ./exam-library/)
     docs/<doc>.json    one file per exam document — full question text, the real
                        mark scheme, the examiner's words. Loaded only when needed.
     figures/<sha>.png  every figure, de-duplicated across the whole library.
     catalogue.json     the SLIM index: no question text, just what you need to
                        FIND a question (topic, marks, difficulty, command word).
                        Sorted subject > topic > subtopic > marks > difficulty.
                        This is the file to search; it is small and cheap to read.
     report.md          plain-English summary of what parsed and what failed.

   Usage
     node references/exam-library-batch.js                  (whole library)
     node references/exam-library-batch.js --limit 5        (first 5 docs — a taster)
     node references/exam-library-batch.js --subject Physics
     node references/exam-library-batch.js --root "<folder>" --out "<folder>"
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const { parseDoc } = require('./exam-library.js');
const { extractFigures } = require('./exam-figures.js');

const DEFAULT_ROOT = 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Exam Questions';
const DEFAULT_OUT = path.join(__dirname, '..', '..', 'exam-library');

const slug = (s) => String(s || '').trim().replace(/[^A-Za-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');

// Every .doc under root, grouped by the subject folder it sits in.
function findDocs(root, only) {
  const out = [];
  let subjects;
  try {
    subjects = fs.readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name);
  } catch (e) {
    throw new Error(`cannot read the exam folder: ${root}\n  ${e.message}`);
  }
  for (const subject of subjects) {
    if (only && subject.toLowerCase() !== only.toLowerCase()) continue;
    const dir = path.join(root, subject);
    for (const f of fs.readdirSync(dir)) {
      if (/\.docx?$/i.test(f) && !f.startsWith('~$')) out.push({ subject, file: path.join(dir, f), name: f });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function run(opts) {
  const o = opts || {};
  const root = o.root || DEFAULT_ROOT;
  const outDir = o.out || DEFAULT_OUT;
  const docsDir = path.join(outDir, 'docs');
  const figsDir = path.join(outDir, 'figures');

  const docs = findDocs(root, o.subject);
  const list = o.limit ? docs.slice(0, o.limit) : docs;
  if (!list.length) throw new Error(`no exam documents found under ${root}`);

  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(figsDir, { recursive: true });

  console.log(`\nReading ${list.length} exam document(s) from ${root}\n`);

  const catalogue = [];
  const ok = [];
  const failed = [];
  let totalFigs = 0, totalParts = 0, totalQs = 0;

  list.forEach((d, i) => {
    const tag = `[${String(i + 1).padStart(3)}/${list.length}]`;
    try {
      const index = parseDoc(d.file);

      // Figures come out in document order, which is the order the [FIG:n] markers
      // were numbered — so part.figures (indices) map straight onto this array.
      const fig = extractFigures(d.file, figsDir, {});
      const figFiles = fig.figures.map((f) => f.file);
      totalFigs += fig.figures.length;

      // Replace each part's figure INDICES with the real filenames.
      for (const p of index.parts) {
        p.figureFiles = (p.figures || []).map((n) => figFiles[n]).filter(Boolean);
      }
      index.figureCount = fig.figures.length;
      index.figureUnsupported = fig.unsupported;

      const docSlug = slug(d.name.replace(/\.docx?$/i, ''));
      fs.writeFileSync(path.join(docsDir, docSlug + '.json'), JSON.stringify(index, null, 2), 'utf8');

      // Slim catalogue rows — no question text, no mark scheme. Just enough to FIND it.
      for (const p of index.parts) {
        catalogue.push({
          id: `${docSlug}#Q${p.question}${p.part ? '-' + p.part : ''}`,
          doc: docSlug,
          subject: p.subject, topic: p.topic, subtopic: p.subtopic, instance: p.instance,
          q: p.question, part: p.part,
          marks: p.marks,
          cmd: p.commandWord,
          difficulty: p.difficulty,
          basis: p.difficultyBasis === 'examiner pass rate' ? 'real' : 'est',
          passRate: p.passRate,
          figures: (p.figureFiles || []).length,
          hasScheme: !!p.ms,
        });
      }

      totalParts += index.counts.parts;
      totalQs += index.counts.questions;
      ok.push({ name: d.name, index });
      console.log(`${tag} ok   ${d.name}`);
      console.log(`            ${index.counts.questions} questions, ${index.counts.parts} parts, ` +
        `${index.counts.joinCoveragePct}% mark schemes, ${fig.figures.length} figures, ` +
        `${index.counts.withPassRate} real pass rates`);
    } catch (e) {
      failed.push({ name: d.name, subject: d.subject, error: e.message });
      console.log(`${tag} FAIL ${d.name}\n            ${e.message}`);
    }
  });

  // Sort for CHEAP RETRIEVAL (Patryk's rule): subject > topic > subtopic, then
  // marks ascending, then difficulty ascending. This ordering is for FINDING
  // questions, NOT the order pupils see them — a booklet reads like a test paper.
  catalogue.sort((a, b) =>
    (a.subject || '').localeCompare(b.subject || '') ||
    (a.topic || '').localeCompare(b.topic || '') ||
    (a.subtopic || '').localeCompare(b.subtopic || '') ||
    (a.marks || 0) - (b.marks || 0) ||
    (a.difficulty || 0) - (b.difficulty || 0));

  const withReal = catalogue.filter((c) => c.basis === 'real').length;
  const withFigs = catalogue.filter((c) => c.figures > 0).length;

  fs.writeFileSync(path.join(outDir, 'catalogue.json'), JSON.stringify({
    builtOn: new Date().toISOString().slice(0, 10),
    sortedBy: 'subject > topic > subtopic > marks ascending > difficulty ascending',
    note: 'Slim index for FINDING questions cheaply. Full text + mark scheme live in docs/<doc>.json.',
    counts: {
      documents: ok.length, failed: failed.length,
      questions: totalQs, parts: catalogue.length,
      partsWithRealDifficulty: withReal,
      partsWithFigures: withFigs,
      figuresExtracted: totalFigs,
    },
    parts: catalogue,
  }, null, 2), 'utf8');

  writeReport(outDir, { root, ok, failed, catalogue, totalQs, totalFigs, withReal, withFigs, figsDir });

  console.log(`\n${'-'.repeat(64)}`);
  console.log(`Parsed OK : ${ok.length}/${list.length} documents`);
  if (failed.length) console.log(`FAILED    : ${failed.length}  (named in report.md — nothing was skipped quietly)`);
  console.log(`Questions : ${totalQs}   Parts: ${catalogue.length}`);
  console.log(`Figures   : ${totalFigs} extracted (de-duplicated in ${figsDir})`);
  console.log(`Difficulty: ${withReal}/${catalogue.length} parts from a REAL examiner pass rate`);
  console.log(`\nLibrary  -> ${outDir}`);
  console.log(`Report   -> ${path.join(outDir, 'report.md')}`);
  return { ok, failed, catalogue };
}

// Plain English, because Patryk reads this — not the JSON.
function writeReport(outDir, d) {
  const L = [];
  const pct = (n, t) => (t ? Math.round((n / t) * 100) : 0);
  L.push('# Exam library — what was read', '');
  L.push(`Built ${new Date().toISOString().slice(0, 10)} from \`${d.root}\`.`, '');
  L.push('Your Word documents on Drive were **only read**. Nothing was renamed, moved or changed.', '');

  L.push('## The short version', '');
  L.push(`- **${d.ok.length} documents** read successfully${d.failed.length ? `, **${d.failed.length} failed**` : ', none failed'}.`);
  L.push(`- **${d.totalQs} exam questions**, broken into **${d.catalogue.length} separately usable question parts**.`);
  L.push(`- **${d.totalFigs} figures** pulled out of the documents as real images (${pct(d.withFigs, d.catalogue.length)}% of parts have one). These used to be thrown away.`);
  L.push(`- **${d.withReal} parts (${pct(d.withReal, d.catalogue.length)}%) have a real difficulty**, taken from the examiner's own "X% of students scored…" figure. The rest fall back to an estimate from the marks and command word, and are labelled as such.`);
  L.push('');

  const noScheme = d.catalogue.filter((c) => !c.hasScheme).length;
  L.push('## Mark schemes', '');
  if (noScheme === 0) {
    L.push('Every single question part was matched to its real mark scheme. Nothing was invented.');
  } else {
    L.push(`${d.catalogue.length - noScheme} of ${d.catalogue.length} parts matched their real mark scheme. **${noScheme} could not be matched** and are stored with no scheme at all rather than a made-up one.`);
  }
  L.push('');

  // Per subject/topic
  L.push('## What is in the library', '');
  const bySub = new Map();
  for (const c of d.catalogue) {
    const k = c.subject || '?';
    if (!bySub.has(k)) bySub.set(k, new Map());
    const t = bySub.get(k);
    t.set(c.topic, (t.get(c.topic) || 0) + 1);
  }
  for (const [sub, topics] of [...bySub].sort()) {
    const total = [...topics.values()].reduce((a, b) => a + b, 0);
    L.push(`### ${sub} — ${total} question parts`, '');
    for (const [t, n] of [...topics].sort((a, b) => b[1] - a[1])) L.push(`- ${t}: ${n}`);
    L.push('');
  }

  if (d.failed.length) {
    L.push('## Documents that FAILED to read', '');
    L.push('These are named so nothing is lost quietly. Each one needs a look:', '');
    for (const f of d.failed) L.push(`- **${f.name}** — ${f.error}`);
    L.push('');
  }

  L.push('## Where things are', '');
  L.push('- `catalogue.json` — the slim list used to *find* a question. Sorted by subject, then topic, then marks (fewest first), then difficulty (easiest first).');
  L.push('- `docs/` — one file per exam document, holding the full question text, the real mark scheme, and the examiner\'s comments.');
  L.push('- `figures/` — every diagram and graph, saved as a real image and shared between questions that use the same one.');
  fs.writeFileSync(path.join(outDir, 'report.md'), L.join('\n') + '\n', 'utf8');
}

module.exports = { run, findDocs };

if (require.main === module) {
  const a = process.argv.slice(2);
  const val = (flag) => { const i = a.indexOf(flag); return i !== -1 ? a[i + 1] : null; };
  try {
    run({
      root: val('--root'),
      out: val('--out'),
      subject: val('--subject'),
      limit: val('--limit') ? parseInt(val('--limit'), 10) : null,
    });
  } catch (e) {
    console.error('\nexam-library-batch: ' + e.message);
    process.exit(1);
  }
}
