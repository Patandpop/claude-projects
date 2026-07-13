#!/usr/bin/env node
'use strict';
/* ============================================================================
   last-lesson.js — condense lesson-log.json into a compact "what we did last
   time, per class" file, so the school session can answer "what was the last
   lesson / which Do Now did they get" WITHOUT Patryk typing it each lesson.

   Writing side only. It reads the lesson log (already written by the uploader
   after every build) and writes last-lesson.json next to the other brief data,
   where the school session can read it via the Drive MCP. The reading side (the
   session actually consulting it) is a later SKILL.md step.

   Pure helpers are exported and unit-tested; the CLI just wires paths.
   No paid calls. Only writes its one summary file in the Brief Data folder.
   ============================================================================ */

const fs   = require('fs');
const path = require('path');

const DEFAULT_LOG = 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Brief Data\\lesson-log.json';
const DEFAULT_OUT = 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Brief Data\\last-lesson.json';

// summariseLatest(records) → { updated, classes: { <CLASS>: {...latest lesson...} } }
// "Latest" per class = highest lessonNumber, tie-broken by builtOn date. Pure.
function summariseLatest(records) {
  const byClass = new Map();
  for (const r of (records || [])) {
    if (!r || !r.class) continue;
    const cur = byClass.get(r.class);
    if (!cur || isLater(r, cur)) byClass.set(r.class, r);
  }
  const classes = {};
  for (const [cls, r] of byClass) {
    classes[cls] = {
      topic: r.topic || r.title || null,
      lessonNumber: r.lessonNumber != null ? r.lessonNumber : null,
      macrotopic: r.macrotopic || null,
      builtOn: r.builtOn || null,
      subtopics: Array.isArray(r.subtopics) ? r.subtopics.slice(0, 8) : [],
      // just the question stems used, so the session can avoid repeating them
      doNowUsed: Array.isArray(r.doNow) ? r.doNow.map(q => q && q.q).filter(Boolean) : [],
      doNowIds: Array.isArray(r.doNow) ? r.doNow.map(q => q && (q.bankId || q.examRef || q.id)).filter(Boolean) : [],
    };
  }
  return { updated: new Date().toISOString().slice(0, 10), classes };
}

// isLater(a, b): true if lesson a is more recent than b (lessonNumber first, then date).
function isLater(a, b) {
  const an = num(a.lessonNumber), bn = num(b.lessonNumber);
  if (an != null && bn != null && an !== bn) return an > bn;
  const ad = a.builtOn || '', bd = b.builtOn || '';
  if (ad !== bd) return ad > bd;
  return an != null && bn == null;   // a has a number, b doesn't → prefer a
}
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

function generate(logPath, outPath, opts) {
  const o = opts || {};
  if (!fs.existsSync(logPath)) {
    if (!o.quiet) console.error('last-lesson: no lesson log at ' + logPath + ' — nothing to summarise');
    return null;
  }
  let records;
  try { records = JSON.parse(fs.readFileSync(logPath, 'utf8')); }
  catch (e) { console.error('last-lesson: lesson log unreadable — ' + e.message); return null; }
  if (!Array.isArray(records)) { console.error('last-lesson: lesson log is not an array'); return null; }

  const summary = summariseLatest(records);
  const n = Object.keys(summary.classes).length;
  if (o.dryRun) {
    console.log('last-lesson (--dry-run) — would write ' + n + ' class(es) to ' + outPath);
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  if (!o.quiet) console.log(`last-lesson: wrote ${n} class(es) → ${outPath}`);
  return summary;
}

module.exports = { summariseLatest, isLater, generate };

if (require.main === module) {
  const args = process.argv.slice(2);
  const logPath = process.env.LESSON_LOG || DEFAULT_LOG;
  const outPath = process.env.LAST_LESSON_OUT || DEFAULT_OUT;
  generate(logPath, outPath, { dryRun: args.includes('--dry-run') });
}
