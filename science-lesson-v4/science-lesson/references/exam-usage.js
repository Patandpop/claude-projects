'use strict';
/* ============================================================================
   exam-usage.js — the one reader and writer of exam-usage.json, the
   "never repeat a question" record (which exam questions each class has had,
   in lessons, as homework and as extension work).

   Why this file exists (Fable work plan 0.3, 29 Oct 2026): six scripts used to
   read the record with "try { parse } catch { return {} }". A damaged or
   half-written file then looked like an EMPTY record, every class's history
   vanished silently, and the next write saved that empty record over the top.

   Rules here:
     - loadUsage(): a MISSING file is a brand-new record ({}); any other trouble
       (unreadable, empty, not JSON, not an object) throws with a plain message.
     - saveUsage(): writes a temp file then renames it over the real one, so a
       crash mid-write never leaves a half file. Before the first write of each
       day it copies the current record into exam-usage-backups/ (dated, the
       last 30 kept) so a bad day can be undone.
     - EXAM_USAGE_NO_BACKUP=1 skips the backup (the test harness sets it so test
       writes never become "today's backup").
   ============================================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const USAGE = path.join(ROOT, 'exam-usage.json');
const KEEP = 30;

function describe(file) { return path.basename(file); }

function loadUsage(file) {
  const f = file || USAGE;
  let text;
  try { text = fs.readFileSync(f, 'utf8'); }
  catch (e) {
    if (e && e.code === 'ENOENT') return {};
    throw new Error(`${describe(f)} could not be read (${e.message}). Nothing was changed. Fix or restore it (exam-usage-backups/) before picking exam questions.`);
  }
  if (!text.trim()) throw new Error(`${describe(f)} is empty: a write was cut short. Restore the latest copy from exam-usage-backups/ before picking exam questions.`);
  let u;
  try { u = JSON.parse(text); }
  catch (e) { throw new Error(`${describe(f)} is not valid JSON (${e.message}). Restore the latest copy from exam-usage-backups/ before picking exam questions.`); }
  if (!u || typeof u !== 'object' || Array.isArray(u)) throw new Error(`${describe(f)} should hold an object of class -> question ids. Restore it from exam-usage-backups/.`);
  return u;
}

function backup(file) {
  if (process.env.EXAM_USAGE_NO_BACKUP) return null;
  if (!fs.existsSync(file)) return null;
  const dir = path.join(path.dirname(file), 'exam-usage-backups');
  const day = new Date().toISOString().slice(0, 10);
  const dest = path.join(dir, `${path.basename(file, '.json')}-${day}.json`);
  if (fs.existsSync(dest)) return null;   // the first write of the day keeps the start-of-day record
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(file, dest);
  const stem = path.basename(file, '.json') + '-';
  const old = fs.readdirSync(dir).filter((x) => x.startsWith(stem) && /\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort();
  old.slice(0, Math.max(0, old.length - KEEP)).forEach((x) => fs.unlinkSync(path.join(dir, x)));
  return dest;
}

function saveUsage(u, file) {
  const f = file || USAGE;
  if (!u || typeof u !== 'object' || Array.isArray(u)) throw new Error('saveUsage: the record must be an object of class -> question ids.');
  const text = JSON.stringify(u, null, 1);
  JSON.parse(text);   // never write something loadUsage would refuse
  backup(f);
  const tmp = `${f}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, f);
  return f;
}

// Add question ids under one key (a class, or "<class>:homework"), keeping the order and dropping repeats.
function addUse(key, ids, file) {
  const u = loadUsage(file);
  u[key] = [...new Set([...(u[key] || []), ...ids])];
  saveUsage(u, file);
  return u;
}

module.exports = { USAGE, loadUsage, saveUsage, addUse, backup, KEEP };
