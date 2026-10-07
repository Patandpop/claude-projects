'use strict';
/* drive-links.js — turn a G:\My Drive\... path into a real Google Drive link (2026-10-07).

   Patryk prints at school from his personal Google Drive, so the brief needs https://drive.google.com
   links, not file:/// paths that only work on the home PC. Drive for Desktop already keeps every file's
   Drive id in its local database. This reads a COPY of that database (the live one is never opened, so
   Drive is never disturbed), walks folder names from "My Drive" down, and returns the link.
   No network, no paid API, nothing written except the temporary copy. Works for any file Drive for
   Desktop has synced; returns null for anything it can't find (the brief then falls back). */

const fs = require('fs');
const os = require('os');
const path = require('path');

const MY_DRIVE = 'G:\\My Drive';
let cache = null;

function dbDir() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'Google', 'DriveFS');
  if (!fs.existsSync(base)) return null;
  const acct = fs.readdirSync(base).find((d) => /^\d+$/.test(d) && fs.existsSync(path.join(base, d, 'metadata_sqlite_db')));
  return acct ? path.join(base, acct) : null;
}

// Opens a temporary COPY of Drive's database once per run.
function load() {
  if (cache) return cache;
  cache = { ok: false };
  const dir = dbDir();
  if (!dir) return cache;
  let DatabaseSync;
  try { ({ DatabaseSync } = require('node:sqlite')); } catch (_) { return cache; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'drive-links-'));
  try {
    for (const suf of ['', '-wal']) {
      const src = path.join(dir, 'metadata_sqlite_db' + suf);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(tmp, 'm.db' + suf));
    }
    const db = new DatabaseSync(path.join(tmp, 'm.db'));
    const root = db.prepare("SELECT stable_id FROM items WHERE local_title = 'My Drive' AND is_folder = 1 AND trashed = 0 AND id LIKE '0A%'").get();
    const child = db.prepare('SELECT i.stable_id AS sid, i.id, i.is_folder, i.mime_type, i.local_title FROM stable_parents p JOIN items i ON i.stable_id = p.item_stable_id ' +
      'WHERE p.parent_stable_id = ? AND i.trashed = 0 AND i.is_tombstone = 0 AND lower(trim(i.local_title)) = ? ORDER BY i.modified_date DESC');
    cache = { ok: !!root, db, tmp, root: root && root.stable_id, child };
    process.on('exit', () => { try { db.close(); fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* temp copy only */ } });
  } catch (_) { cache = { ok: false }; }
  return cache;
}

// Drive item for an absolute G:\My Drive\... path, or null.
function itemFor(absPath) {
  const c = load(); if (!c.ok) return null;
  const rel = path.relative(MY_DRIVE, absPath);
  if (!rel || rel.startsWith('..')) return null;
  let sid = c.root, row = null;
  for (const part of rel.split(/[\\/]+/).filter(Boolean)) {
    row = c.child.get(sid, part.trim().toLowerCase());
    if (!row) return null;
    sid = row.sid;
  }
  return row && { id: row.id, title: row.local_title, folder: !!row.is_folder, mime: row.mime_type };
}

// https link for a file or folder (opens in Drive, where Print is one click), or null.
function urlFor(absPath) {
  const it = itemFor(absPath);
  if (!it) return null;
  if (it.folder) return 'https://drive.google.com/drive/folders/' + it.id;
  if (/^application\/vnd\.google-apps\.document/.test(it.mime)) return 'https://docs.google.com/document/d/' + it.id + '/edit';
  if (/^application\/vnd\.google-apps\.presentation/.test(it.mime)) return 'https://docs.google.com/presentation/d/' + it.id + '/edit';
  return 'https://drive.google.com/file/d/' + it.id + '/view';
}

module.exports = { urlFor, itemFor, _reset: () => { cache = null; } };
