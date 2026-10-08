/* Planner mailbox — runs on Patryk's PERSONAL Google account (tomczynskipatrick@gmail.com). 2026-10-07.

   Why: the school blocks sharing his personal Drive with his school account, and blocks public school
   web apps. But the school planner CAN call out to a web address (the Excel button already does). So
   this small script, on the personal account, is a mailbox between home and school:

     home (Claude Code) writes   Admin/Planner Sync/planner-data.json   (Drive for Desktop syncs it)
     school planner READS it from here, so "Import data" is never needed again
     school planner WRITES  planner-state.json (saved weeks, his equipment edits, added lessons)
                            requests.json      (things he asks Claude to do: "build these lessons")
     home READS those two from the same folder.
     school planner can also ask for an EMPTY lesson folder (the "New lesson" button), made here
     because only this account can see the Lessons folders.

   Safety: it only reads/writes the named files in "Beechen Cliff Science/Admin/Planner Sync", and only
   CREATES lesson folders inside "Beechen Cliff Science/Lessons" (never renames, moves or deletes).
   Every write is logged in Planner Sync/mailbox-log.txt. No student names pass through it.

   Set up (once, about 5 minutes, signed in as the PERSONAL account):
     1. script.google.com > New project. Name it "Planner mailbox". Paste this whole file.
     2. Run setup() once (Run button), allow access. View > Logs (or Execution log) shows the KEY.
     3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Deploy. Copy the URL.
     4. In the SCHOOL planner script: Project Settings > Script properties > add
          MAILBOX_URL = the URL from step 3
          MAILBOX_KEY = the key from step 2
*/

const SYNC = ['Beechen Cliff Science', 'Admin', 'Planner Sync'];
const WRITABLE = { 'planner-state.json': true, 'homework-made.json': true };   // whole-file writes from school
const READABLE = { 'planner-data.json': true, 'planner-state.json': true, 'requests.json': true, 'requests-done.json': true, 'homework-made.json': true };
// homework quizzes chosen at home (homework-forms.js): "homework-10C2-2026-10-16.json"
const HOMEWORK = /^homework-[A-Za-z0-9]+-\d{4}-\d{2}-\d{2}\.json$/;

function setup() {
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('MAILBOX_KEY')) p.setProperty('MAILBOX_KEY', Utilities.getUuid().replace(/-/g, '').slice(0, 20));
  syncFolder_();
  Logger.log('MAILBOX_KEY = ' + p.getProperty('MAILBOX_KEY'));
}

function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function keyOk_(k) { return k && k === PropertiesService.getScriptProperties().getProperty('MAILBOX_KEY'); }

// Folder names are matched ignoring case and spaces at either end: his real folder is called
// "Beechen Cliff Science " (a trailing space), and an exact-name lookup missed it and made a second
// folder (2026-10-08). If several match, the one already holding the next part of the path wins.
function child_(dir, name, nextName) {
  const want = String(name).trim().toLowerCase();
  const found = [];
  const it = dir.getFolders();
  while (it.hasNext()) { const f = it.next(); if (f.getName().trim().toLowerCase() === want) found.push(f); }
  if (found.length > 1 && nextName) {
    const nx = String(nextName).trim().toLowerCase();
    const better = found.find((f) => { const k = f.getFolders(); while (k.hasNext()) if (k.next().getName().trim().toLowerCase() === nx) return true; return false; });
    if (better) return better;
  }
  // oldest first, so a later accidental copy never wins
  found.sort((a, b) => a.getDateCreated() - b.getDateCreated());
  return found[0] || null;
}
function path_(names, create) {
  let dir = DriveApp.getRootFolder();
  for (let i = 0; i < names.length; i++) {
    const f = child_(dir, names[i], names[i + 1]);
    if (f) dir = f;
    else if (create) { dir = dir.createFolder(names[i]); log_('created folder ' + names.slice(0, i + 1).join('/')); }
    else return null;
  }
  return dir;
}
function syncFolder_() { return path_(SYNC, true); }

function log_(what) {
  try {
    const dir = path_(SYNC, false); if (!dir) return;
    const it = dir.getFilesByName('mailbox-log.txt');
    const line = Utilities.formatDate(new Date(), 'Europe/London', 'yyyy-MM-dd HH:mm') + '  ' + what + '\n';
    if (it.hasNext()) { const f = it.next(); f.setContent((f.getBlob().getDataAsString() + line).slice(-200000)); }
    else dir.createFile('mailbox-log.txt', line, MimeType.PLAIN_TEXT);
  } catch (e) { /* the log never blocks the work */ }
}

function readFile_(name) {
  const it = syncFolder_().getFilesByName(name);
  if (!it.hasNext()) return null;
  const f = it.next();
  return { text: f.getBlob().getDataAsString(), modified: f.getLastUpdated().toISOString() };
}
function writeFile_(name, text) {
  const dir = syncFolder_(), it = dir.getFilesByName(name);
  if (it.hasNext()) it.next().setContent(text); else dir.createFile(name, text, 'application/json');
  log_('wrote ' + name + ' (' + text.length + ' characters)');
}

// GET ?key=...&op=read&name=planner-data.json   (op=ping just checks the key)
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!keyOk_(p.key)) return out_({ ok: false, error: 'Locked' });
  if (p.op === 'ping') return out_({ ok: true });
  if (p.op === 'list') {
    const names = [], it = syncFolder_().getFiles();
    while (it.hasNext()) { const n = it.next().getName(); if (HOMEWORK.test(n)) names.push(n); }
    return out_({ ok: true, names: names.sort() });
  }
  if (p.op === 'read' && (READABLE[p.name] || HOMEWORK.test(p.name || ''))) {
    const f = readFile_(p.name);
    return out_({ ok: true, name: p.name, found: !!f, modified: f ? f.modified : null, text: f ? f.text : null });
  }
  return out_({ ok: false, error: 'Unknown request' });
}

// POST JSON { key, op: 'write' | 'request' | 'mkdir', ... }
function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Bad request' }); }
  if (!keyOk_(b.key)) return out_({ ok: false, error: 'Locked' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (b.op === 'write' && WRITABLE[b.name]) { writeFile_(b.name, String(b.text || '')); return out_({ ok: true }); }
    if (b.op === 'request') {
      const cur = readFile_('requests.json');
      const list = cur ? JSON.parse(cur.text || '[]') : [];
      const req = { id: Utilities.getUuid().slice(0, 8), at: new Date().toISOString(), kind: String(b.kind || 'message'), text: String(b.text || '').slice(0, 20000), lessons: b.lessons || [] };
      list.push(req);
      writeFile_('requests.json', JSON.stringify(list, null, 1));
      return out_({ ok: true, id: req.id });
    }
    if (b.op === 'mkdir') return out_(mkLesson_(String(b.topicRel || ''), String(b.folderName || '')));
    return out_({ ok: false, error: 'Unknown request' });
  } finally { lock.releaseLock(); }
}

// An EMPTY lesson folder inside an existing topic folder. Reuses one with the same name. Never anything else.
function mkLesson_(topicRel, folderName) {
  const name = folderName.replace(/[\\/:*?"<>|]+/g, ' ').trim();
  if (!topicRel || !name) return { ok: false, error: 'Missing topic or name' };
  const dir = path_(['Beechen Cliff Science', 'Lessons'].concat(topicRel.split('/')), false);
  if (!dir) return { ok: false, error: 'Topic folder not found: ' + topicRel };
  const ex = dir.getFoldersByName(name);
  if (ex.hasNext()) return { ok: true, existed: true, url: ex.next().getUrl() };
  const f = dir.createFolder(name);
  log_('created lesson folder ' + topicRel + '/' + name);
  return { ok: true, existed: false, url: f.getUrl() };
}
