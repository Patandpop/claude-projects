#!/usr/bin/env node
'use strict';
// upload-to-drive.js — copies lesson output files to Google Drive for Desktop
// Usage: node upload-to-drive.js <content.json> [--dry-run]
// Reads meta fields from content JSON to construct the Drive destination path.
// Spec: specs/drive-uploader.md

const fs   = require('fs');
const path = require('path');

const DRIVE_ROOT = 'G:\\My Drive\\Beechen Cliff Science\\Lessons';
// lesson-log.json lives with the other morning-brief data files (context.json etc.) so the
// cloud brief agent reads it via the Drive MCP with no extra plumbing. Overridable for tests.
const DEFAULT_LOG = 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Brief Data\\lesson-log.json';
const logPath = () => process.env.LESSON_LOG || DEFAULT_LOG;

// ── Lesson-log helpers (exported, pure — see specs/lesson-log.md) ──────────────

// Split a possibly-compound class field ("7BYA / 7MLA") into individual class codes.
function splitClasses(classField) {
  return String(classField || '')
    .split(/[\/,]/).map(s => s.trim()).filter(Boolean);
}

// Build one lesson-log record per class from a lesson content object. Decision A: one record
// per class. Returns [] if meta is missing (M7 — never crash the build over a log).
function buildLogRecords(content, extra) {
  const meta = (content && content.meta) || {};
  const e = extra || {};
  const classes = splitClasses(meta.class);
  if (!classes.length) classes.push(''); // still log the lesson even with no class field
  const subtopics = (content && content.title && Array.isArray(content.title.keywords))
    ? content.title.keywords.slice() : [];
  const doNow = (content && content.doNow && Array.isArray(content.doNow.questions))
    ? content.doNow.questions.map(q => {
        const rec = { q: q.q };
        if (q.id != null) rec.id = q.id;
        if (q.marks != null) rec.marks = q.marks;
        // 2026-07-12: capture the bank/exam id NOW, before the Do Now bank exists,
        // so the spaced-retrieval selector can later say "don't repeat this
        // question for N lessons". bankId = a bank question; examRef = the AQA
        // exam part it came from (real-exam provenance for KS4).
        if (q.bankId != null) rec.bankId = q.bankId;
        if (q.examRef != null) rec.examRef = q.examRef;
        return rec;
      })
    : [];
  return classes.map(cls => ({
    class: cls,
    year: meta.year,
    subject: meta.subject,
    macrotopic: meta.macrotopic,
    lessonNumber: meta.lessonNumber,
    topic: meta.topic || meta.title,
    title: meta.title,
    subtopics,
    doNow,
    builtOn: e.builtOn || new Date().toISOString().slice(0, 10),
    driveFolder: e.driveFolder || null,
    uploaded: !!e.uploaded,
  }));
}

// Append records to the JSON log, upserting on (class, lessonNumber, topic) — Decision B.
// Creates the parent folder if missing (a single known-safe location, unlike lesson folders).
function appendLog(file, records) {
  let log = [];
  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(parsed)) log = parsed;
    } catch (err) {
      console.warn('lesson-log: existing log unreadable, starting fresh — ' + err.message);
    }
  }
  const key = r => [String(r.class).toLowerCase(), r.lessonNumber, String(r.topic).toLowerCase()].join('|');
  const index = new Map(log.map((r, i) => [key(r), i]));
  for (const rec of records) {
    const k = key(rec);
    if (index.has(k)) log[index.get(k)] = rec;       // upsert in place
    else { index.set(k, log.length); log.push(rec); } // new
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(log, null, 2) + '\n', 'utf8');
  return log.length;
}

// ── Macrotopic fuzzy matcher (2026-07-12) ─────────────────────────────────────
// Patryk had to type meta.macrotopic as the EXACT Drive folder name ("P4 Earth
// in Space", not "Space") or the upload failed with only a "did you mean" hint.
// resolveMacrotopic maps what he typed onto a real folder that already exists.
// It NEVER creates a folder, and it refuses to guess when the answer is
// ambiguous — a wrong confident guess would file a lesson in the wrong topic.

// "P4 Earth in Space" → "earth in space"; drops a leading unit code (P4, B3.4, C12)
// and all punctuation, so the comparison is on the human words only.
function normTopic(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/^\s*[a-z]{1,2}\s*\d+(\.\d+)?\s*[-–—:.]?\s*/i, '')  // leading unit code
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
const topicTokens = (s) => normTopic(s).split(' ').filter(Boolean);

// Dice coefficient on character bigrams — 1.0 identical, 0.0 nothing in common.
// Used only as the last resort, to catch typos ("Photosythesis").
function dice(a, b) {
  const bigrams = (s) => {
    const out = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) || 0) + 1);
    }
    return out;
  };
  const A = bigrams(a), B = bigrams(b);
  if (!A.size || !B.size) return a === b ? 1 : 0;
  let hits = 0;
  for (const [g, n] of A) hits += Math.min(n, B.get(g) || 0);
  return (2 * hits) / ([...A.values()].reduce((x, y) => x + y, 0) + [...B.values()].reduce((x, y) => x + y, 0));
}

const FUZZY_FLOOR = 0.62;   // below this, a typo-match is not trustworthy
const FUZZY_LEAD  = 0.08;   // best must beat runner-up by this much, or it's ambiguous

/* resolveMacrotopic(folders, wanted) → { name, how, candidates? }
     how: 'exact'    — folder name matched (case-insensitive)
          'normal'   — matched once the unit code / punctuation was ignored
          'contains' — every word typed appears in exactly one folder ("Space")
          'fuzzy'    — closest by spelling, clearly ahead of the runner-up
          null       — no match, or ambiguous (candidates lists the near-misses) */
function resolveMacrotopic(folders, wanted) {
  const list = (folders || []).filter(Boolean);
  const w = String(wanted || '');
  if (!list.length || !w) return { name: null, how: null, candidates: list };

  const pick = (hits, how) => (hits.length === 1
    ? { name: hits[0], how }
    : (hits.length > 1 ? { name: null, how: null, candidates: hits } : null));

  // 1 — exact (case-insensitive)
  let r = pick(list.filter((f) => f.toLowerCase() === w.toLowerCase()), 'exact');
  if (r) return r;

  // 2 — equal once unit code + punctuation are ignored
  r = pick(list.filter((f) => normTopic(f) === normTopic(w)), 'normal');
  if (r) return r;

  // 3 — every word typed appears in the folder ("Space" → "P4 Earth in Space")
  const wt = topicTokens(w);
  if (wt.length) {
    r = pick(list.filter((f) => {
      const ft = topicTokens(f);
      return wt.every((t) => ft.includes(t));
    }), 'contains');
    if (r) return r;
  }

  // 4 — closest by spelling, but only when it clearly wins (typo safety net)
  const scored = list
    .map((f) => ({ f, s: dice(normTopic(f), normTopic(w)) }))
    .sort((a, b) => b.s - a.s);
  const best = scored[0], next = scored[1];
  if (best && best.s >= FUZZY_FLOOR && (!next || best.s - next.s >= FUZZY_LEAD)) {
    return { name: best.f, how: 'fuzzy' };
  }
  return { name: null, how: null, candidates: scored.filter((x) => x.s > 0.3).map((x) => x.f) };
}

// ── Which three files a lesson ships ──────────────────────────────────────────
// Pure + exported so the harness can assert the ACTUAL behaviour. (The old test
// only grepped this file's source text, which is why the meta.lessonType bug
// below survived: the source string matched while the runtime value was
// undefined for every real review lesson.)
const slugName = (s) => String(s || 'lesson').trim().replace(/[^A-Za-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-') || 'lesson';

function baseNameFor(meta) {
  const m = meta || {};
  const split = String(m.differentiation || 'none').toLowerCase() === 'split';
  const ability = m.abilityLabel ? slugName(m.abilityLabel) : (split ? 'mixed_ability' : '');
  return slugName(m.topic || m.title) + (ability ? '_' + ability : '');
}

// Review AND revision lessons ship a model-answer sheet in the support slot —
// exactly the rule build.js applies when writing the files.
function isReviewType(meta) {
  const t = String((meta || {}).lessonType || '').toLowerCase();
  return t === 'review' || t === 'revision';
}

function outputFilesFor(meta) {
  const base = baseNameFor(meta);
  return [
    base + '.pptx',
    base + '_worksheet.docx',
    base + (isReviewType(meta) ? '_answers.docx' : '_support_worksheet.docx'),
  ];
}

// When required as a module (tests), export the helpers and run nothing else.
if (require.main !== module) {
  module.exports = {
    splitClasses, buildLogRecords, appendLog,
    resolveMacrotopic, normTopic, outputFilesFor, baseNameFor, isReviewType,
  };
  return;
}

// ── CLI args ──────────────────────────────────────────────────────────────────
const dryRun = process.argv.includes('--dry-run');
const jsonArg = process.argv.slice(2).find(a => !a.startsWith('--'));

if (!jsonArg) {
  console.error('Usage: node upload-to-drive.js <content.json> [--dry-run]');
  process.exit(1);
}

// ── Load content JSON (M1) ────────────────────────────────────────────────────
// A content JSON is an array of 1–N lessons — every lesson uploads, not just the first.
let lessons;
try {
  const raw = fs.readFileSync(jsonArg, 'utf8').trim();
  const parsed = JSON.parse(raw);
  lessons = Array.isArray(parsed) ? parsed : [parsed];
} catch (err) {
  console.error('upload-to-drive: could not read content JSON: ' + err.message);
  process.exit(1);
}

// M5: Drive must be mounted — checked once for the whole run
const driveLetter = DRIVE_ROOT.slice(0, 3);
if (!fs.existsSync(driveLetter)) {
  console.error('upload-to-drive: Google Drive not mounted at ' + driveLetter);
  process.exit(1);
}

// Returns true if this lesson uploaded at least one file (or would, in dry-run).
function processLesson(content) {
  const meta = content.meta || {};
  const { year, subject, macrotopic, lessonNumber, title } = meta;
  const missing = ['year','subject','macrotopic','lessonNumber','title'].filter(k => !meta[k]);
  if (missing.length) {
    console.error('upload-to-drive: missing meta fields: ' + missing.join(', ') + (title ? ` (lesson "${title}")` : ''));
    return false;
  }

  // ── Construct destination path (M2) ──
  // 2026-07-12: the macrotopic no longer has to be typed as the exact Drive
  // folder name. Read the real folders and map onto one of them; only fall back
  // to the literal text when the subject folder can't be listed. Never creates.
  const subjDir = path.join(DRIVE_ROOT, `Year ${year}`, subject);
  let macroFolder = macrotopic;
  let macroFolders = [];
  try {
    macroFolders = fs.readdirSync(subjDir, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name);
  } catch (_) { /* Year/subject level missing — the destDir check below reports it */ }

  if (macroFolders.length) {
    const m = resolveMacrotopic(macroFolders, macrotopic);
    if (m.name && m.how !== 'exact') {
      console.log(`upload-to-drive: macrotopic "${macrotopic}" → "${m.name}" (matched by ${m.how})`);
      macroFolder = m.name;
    } else if (m.name) {
      macroFolder = m.name;                        // exact, incl. case correction
    } else {
      console.error(`upload-to-drive: macrotopic "${macrotopic}" does not match any folder in ${subjDir}`);
      if (m.candidates && m.candidates.length) {
        console.error('  closest folders: ' + m.candidates.join(' | ')
          + '\n  too close to call — set meta.macrotopic to the one you mean.');
      } else {
        console.error('  folders here: ' + macroFolders.join(' | '));
      }
    }
  }

  const destDir = path.join(
    DRIVE_ROOT,
    `Year ${year}`,
    subject,
    macroFolder,
    `Lesson ${lessonNumber} - ${title}`
  );

  // Bug fix: meta.outputDir takes priority over the JSON's own directory (mirrors build.js priority 1)
  const srcDir = meta.outputDir ? path.resolve(meta.outputDir) : path.dirname(path.resolve(jsonArg));

  // Base name + file list come from the shared pure helpers above, so what the
  // harness asserts and what actually uploads can never drift apart.
  // 2026-07-09 (Patryk): no more _PTO suffix — Drive copies keep the clean local names.
  const base = baseNameFor(meta);
  const sourceFiles = outputFilesFor(meta).map((n) => ({ src: n, destName: n }));

  // M8: dry-run — print only, touch nothing (no log written)
  if (dryRun) {
    const folder = fs.existsSync(destDir) ? '' : ' (folder missing — copy would fail)';
    console.log('[dry-run] Would copy to: ' + destDir + folder);
    for (const f of sourceFiles) {
      const srcPath = path.join(srcDir, f.src);
      const exists = fs.existsSync(srcPath) ? '' : ' (source missing — would skip)';
      console.log('  ' + f.src + ' → ' + f.destName + exists);
    }
    return true;
  }

  // lesson-log write — always attempted (M1), never fatal (M7).
  function writeLessonLog(uploaded) {
    try {
      const records = buildLogRecords(content, { driveFolder: destDir, uploaded });
      const total = appendLog(logPath(), records);
      console.log(`lesson-log: ${records.length} record(s) written (${total} total) → ${logPath()}`);
    } catch (err) {
      console.warn('lesson-log: could not update log (build unaffected) — ' + err.message);
    }
  }

  // M1: log the lesson even if its Drive folder doesn't exist yet — it was still built.
  if (!fs.existsSync(destDir)) {
    console.error('upload-to-drive: Drive folder not found (Drive is mounted but path missing):\n  ' + destDir);
    // 2026-07-09 (the Space → "P4 Earth in Space" miss): show what macrotopic folders
    // actually exist at that level so the authoring fix is obvious. Still NEVER creates.
    try {
      const subjDir = path.join(DRIVE_ROOT, `Year ${year}`, subject);
      const sibs = fs.readdirSync(subjDir, { withFileTypes: true })
        .filter((d) => d.isDirectory()).map((d) => d.name);
      if (sibs.length) console.error('  did you mean one of these macrotopic folders? ' + sibs.join(' | ')
        + '\n  (set meta.macrotopic to the EXACT Drive folder name)');
    } catch (_) { /* Year/subject level missing too — nothing to suggest */ }
    writeLessonLog(false);
    return false;
  }

  // M3 + M4: copy files, renaming each with _PTO before the extension
  const logFile = path.join(__dirname, '../../upload-log.txt');
  const copied = [];

  for (const f of sourceFiles) {
    const srcPath  = path.join(srcDir, f.src);
    const destPath = path.join(destDir, f.destName);

    if (!fs.existsSync(srcPath)) {
      console.warn('  ! source missing, skipped: ' + f.src);
      continue;
    }
    try {
      fs.copyFileSync(srcPath, destPath);
      copied.push(f.destName);
    } catch (err) {
      console.error('  ! copy failed: ' + f.src + ' — ' + err.message);
    }
  }

  // M6: confirm on success; N2: log entry
  if (copied.length) {
    console.log('Uploaded to: ' + destDir);
    copied.forEach(n => console.log('  ' + n));

    const logLine = [
      new Date().toISOString().slice(0, 19).replace('T', ' '),
      `Lesson ${lessonNumber} - ${title}`,
      destDir,
    ].join('\t') + '\n';
    fs.appendFileSync(logFile, logLine, 'utf8');
  }

  // M1: record the lesson in lesson-log.json regardless of copy success.
  writeLessonLog(copied.length > 0);
  return copied.length > 0;
}

let okCount = 0;
for (const lesson of lessons) {
  if (processLesson(lesson)) okCount++;
}

// 2026-07-12: refresh the compact per-class "last lesson" summary the school
// session reads (so Patryk stops recapping the previous lesson by hand). Best
// effort — a summary failure must never fail the upload run.
if (!dryRun) {
  try {
    const { generate } = require('./last-lesson.js');
    const out = process.env.LAST_LESSON_OUT
      || path.join(path.dirname(logPath()), 'last-lesson.json');
    generate(logPath(), out, { quiet: false });
  } catch (err) {
    console.warn('last-lesson: summary not refreshed (upload unaffected) — ' + err.message);
  }
}

process.exit(okCount === lessons.length ? 0 : 1);
