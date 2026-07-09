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

// When required as a module (tests), export the helpers and run nothing else.
if (require.main !== module) {
  module.exports = { splitClasses, buildLogRecords, appendLog };
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

const slug = s => String(s || 'lesson').trim().replace(/[^A-Za-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-') || 'lesson';

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
  const destDir = path.join(
    DRIVE_ROOT,
    `Year ${year}`,
    subject,
    macrotopic,
    `Lesson ${lessonNumber} - ${title}`
  );

  // Bug fix: meta.outputDir takes priority over the JSON's own directory (mirrors build.js priority 1)
  const srcDir = meta.outputDir ? path.resolve(meta.outputDir) : path.dirname(path.resolve(jsonArg));

  // Bug fix: derive base name the same way build.js does, not from the JSON filename.
  const split = String(meta.differentiation || 'none').toLowerCase() === 'split';
  const ability = meta.abilityLabel ? slug(meta.abilityLabel) : (split ? 'mixed_ability' : '');
  const base = slug(meta.topic || meta.title) + (ability ? '_' + ability : '');

  // Review lessons ship an answer sheet in the support-worksheet slot.
  // 2026-07-09 (Patryk): no more _PTO suffix — Drive copies keep the clean local names.
  const isReview = String(content.lessonType || '').toLowerCase() === 'review';
  const sourceFiles = [
    { src: base + '.pptx',           destName: base + '.pptx' },
    { src: base + '_worksheet.docx', destName: base + '_worksheet.docx' },
    isReview
      ? { src: base + '_answers.docx',           destName: base + '_answers.docx' }
      : { src: base + '_support_worksheet.docx', destName: base + '_support_worksheet.docx' },
  ];

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
process.exit(okCount === lessons.length ? 0 : 1);
