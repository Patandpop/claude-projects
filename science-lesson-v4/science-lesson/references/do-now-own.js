#!/usr/bin/env node
'use strict';
/* ============================================================================
   do-now-own.js — Patryk's OWN Do Now questions, kept per class (2026-10-07).

   The exam-seeded banks in question-bank/ hold real AQA questions. This file keeps
   the questions Patryk actually used as Do Nows, with their answers, so later lessons
   can bring old ones back (spaced retrieval) and he never retypes them.

   Two ways in:
     1. Every home build that uploads adds its Do Now here automatically (upload-to-drive.js).
     2. Old lessons: drop the built .pptx files in a folder and harvest them:
          node do-now-own.js harvest "<folder or .pptx>" --class 9XS [--dry-run]
        It reads slide 2 (the purple-pen answers slide) for question + answer pairs.
   Look at what is stored:
          node do-now-own.js list [--class 9XS]

   Storage: one JSON file next to lesson-log.json (Brief Data). No student names, no paid
   calls. Only ever writes that one file. Duplicates (same class, same question) are skipped.
   ============================================================================ */

const fs = require('fs');
const path = require('path');

const DEFAULT_FILE = 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Brief Data\\do-now-own.json';
const ownPath = () => process.env.DO_NOW_OWN || DEFAULT_FILE;

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function load(file) {
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (d && d.classes) return d;
  } catch (_) { /* missing or unreadable: start fresh */ }
  return { _comment: 'Do Now questions Patryk has used, per class. Written by do-now-own.js. No student names.', updated: null, classes: {} };
}

// Records from a lesson content object (one set per class in "7BYA / 7MLA").
function fromContent(content, date) {
  const meta = (content && content.meta) || {};
  const qs = (content && content.doNow && Array.isArray(content.doNow.questions)) ? content.doNow.questions : [];
  const classes = String(meta.class || '').split(/[\/,]/).map((s) => s.trim()).filter(Boolean);
  const recs = qs.filter((q) => q && q.q).map((q) => ({
    q: q.q, a: q.a || '', marks: q.marks || 1,
    subject: meta.subject || '', macrotopic: meta.macrotopic || '',
    lesson: meta.title || '', lessonNumber: meta.lessonNumber || null,
    date: date || new Date().toISOString().slice(0, 10), source: 'built',
  }));
  return classes.map((cls) => ({ cls, recs }));
}

// Add records for one class; returns how many were new.
function add(data, cls, recs) {
  const key = String(cls).toUpperCase();
  const list = data.classes[key] || (data.classes[key] = []);
  const seen = new Set(list.map((r) => norm(r.q)));
  let added = 0;
  for (const r of recs) {
    const k = norm(r.q);
    if (!k || seen.has(k)) continue;
    seen.add(k); list.push(r); added++;
  }
  return added;
}

function save(file, data) {
  data.updated = new Date().toISOString().slice(0, 10);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// Called by the uploader after a successful upload. Never throws.
function recordLesson(content, date) {
  try {
    const file = ownPath(), data = load(file);
    let n = 0;
    for (const { cls, recs } of fromContent(content, date)) n += add(data, cls, recs);
    if (n) save(file, data);
    return n;
  } catch (err) {
    console.warn('do-now-own: not updated (upload unaffected) — ' + err.message);
    return 0;
  }
}

/* ---- harvesting built decks ------------------------------------------------
   Our decks: slide 1 = title + Do Now questions, slide 2 = purple-pen answers, where each
   row is a question shape followed by its answer shape. Pure text parse, no rendering. */
const NAV = new Set(['DO NOW', 'ENGAGE', 'LEARN', 'BUILD', 'APPLY', 'REVIEW']);
function shapeTexts(xml) {
  return xml.split(/<p:sp>/).slice(1)
    .map((sp) => [...sp.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(''))
    .map((t) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim())
    .filter(Boolean);
}
function parseDeck(slide1, slide2) {
  const s1 = shapeTexts(slide1), s2 = shapeTexts(slide2 || '');
  const body1 = s1.slice(s1.length >= 6 && s1.slice(0, 6).every((t) => NAV.has(t)) ? 6 : 0);  // drop the nav strip only
  const title = body1[0] || '';
  const ys = (body1.find((t) => /^Year\s+\d+/.test(t)) || '').match(/^Year\s+(\d+)\s*\S*\s*(.*)$/) || [];
  const out = { title, year: ys[1] ? +ys[1] : null, subject: (ys[2] || '').trim(), questions: [] };
  const start = s2.findIndex((t) => /Purple pen time/i.test(t));
  if (start >= 0) {
    const rows = s2.slice(start + 1).filter((t) => !/^Learning objective:/i.test(t));
    for (let i = 0; i + 1 < rows.length; i += 2) out.questions.push({ q: rows[i], a: rows[i + 1] });
  } else {
    // no answers slide: take the numbered questions from slide 1
    const k = body1.indexOf('DO NOW');
    const after = k >= 0 ? body1.slice(k + 1) : [];
    for (let i = 0; i + 1 < after.length; i += 2) {
      if (!/^\d+$/.test(after[i])) break;
      out.questions.push({ q: after[i + 1], a: '' });
    }
  }
  return out;
}

async function readDeck(file) {
  const JSZip = require('jszip');
  const z = await JSZip.loadAsync(fs.readFileSync(file));
  const s1 = z.file('ppt/slides/slide1.xml'), s2 = z.file('ppt/slides/slide2.xml');
  if (!s1) return null;
  return parseDeck(await s1.async('string'), s2 ? await s2.async('string') : '');
}

function decksIn(p) {
  const st = fs.statSync(p);
  if (st.isFile()) return /\.pptx$/i.test(p) ? [p] : [];
  return fs.readdirSync(p, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? decksIn(path.join(p, d.name)) : (/\.pptx$/i.test(d.name) && !d.name.startsWith('~$') ? [path.join(p, d.name)] : []));
}

async function harvest(target, cls, dryRun) {
  const file = ownPath(), data = load(file);
  let total = 0;
  for (const deck of decksIn(target)) {
    let d;
    try { d = await readDeck(deck); } catch (err) { console.log(`  skip ${path.basename(deck)} (unreadable: ${err.message})`); continue; }
    if (!d || !d.questions.length) { console.log(`  skip ${path.basename(deck)} (no Do Now found; not one of our built decks?)`); continue; }
    const date = fs.statSync(deck).mtime.toISOString().slice(0, 10);
    const recs = d.questions.map((q) => ({ q: q.q, a: q.a, marks: 1, subject: d.subject, macrotopic: '', lesson: d.title, lessonNumber: null, date, source: 'harvested' }));
    const n = add(data, cls, recs);
    total += n;
    console.log(`  ${path.basename(deck)}: "${d.title}" ${d.questions.length} questions, ${n} new`);
  }
  if (!dryRun && total) save(file, data);
  console.log(`${dryRun ? '[dry-run] would add' : 'added'} ${total} question(s) for ${cls}${dryRun ? '' : ' → ' + file}`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const cmd = args[0];
  if (cmd === 'harvest') {
    const target = args[1], cls = flag('--class');
    if (!target || !cls) { console.error('Usage: node do-now-own.js harvest "<folder or .pptx>" --class 9XS [--dry-run]'); process.exit(1); }
    harvest(target, cls, args.includes('--dry-run')).catch((e) => { console.error(e.message); process.exit(1); });
  } else if (cmd === 'list') {
    const data = load(ownPath()), only = flag('--class');
    for (const [cls, list] of Object.entries(data.classes)) {
      if (only && cls !== only.toUpperCase()) continue;
      console.log(`${cls}: ${list.length} question(s)`);
      for (const r of list) console.log(`  [${r.date}] ${r.q}  →  ${r.a || '(no answer)'}`);
    }
  } else {
    console.error('Usage: node do-now-own.js harvest "<folder or .pptx>" --class 9XS [--dry-run] | list [--class 9XS]');
    process.exit(1);
  }
} else {
  module.exports = { fromContent, add, load, save, recordLesson, parseDeck, shapeTexts, norm };
}
