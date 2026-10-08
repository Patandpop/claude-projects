#!/usr/bin/env node
'use strict';
/* planner-sync.js — the home end of the planner mailbox (2026-10-07). See planner/Mailbox.gs.

   node planner/planner-sync.js push            copy planner/planner-data.json into the sync folder,
                                                 so the school planner picks it up next time it opens
   node planner/planner-sync.js requests        list what Patryk sent with "Send to Claude" (not yet done)
   node planner/planner-sync.js done <id> [note]  mark a request done (the planner never sees it again)
   node planner/planner-sync.js state           summary of what the school planner last saved

   Only ever writes inside G:\My Drive\Beechen Cliff Science\Admin\Planner Sync (made on first push),
   and logs each write to sync-log.txt there. Never deletes anything. No student names. */

const fs = require('fs');
const path = require('path');

const SYNC = process.env.PLANNER_SYNC || 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Planner Sync';
const DATA = path.join(__dirname, 'planner-data.json');
// Until the mailbox fix (2026-10-08) the school side wrote into an accidental second folder,
// "Beechen Cliff Science (1)". Read whichever copy is newer, so nothing saved there is lost.
const STRAY = SYNC.replace('Beechen Cliff Science\\', 'Beechen Cliff Science (1)\\');
const readJson = (f, dflt) => {
  const cands = [SYNC, STRAY].map((d) => path.join(d, f)).filter((p) => fs.existsSync(p))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  try { return JSON.parse(fs.readFileSync(cands[0], 'utf8')); } catch (_) { return dflt; }
};
const log = (what) => fs.appendFileSync(path.join(SYNC, 'sync-log.txt'), new Date().toISOString().slice(0, 16).replace('T', ' ') + '  ' + what + '\n');

function open() {
  const done = new Set(readJson('requests-done.json', []).map((d) => d.id));
  return readJson('requests.json', []).filter((r) => !done.has(r.id));
}

const [cmd, a1, ...rest] = process.argv.slice(2);
if (cmd === 'push') {
  if (!fs.existsSync('G:\\')) { console.error('Google Drive is not mounted at G:'); process.exit(1); }
  if (!fs.existsSync(SYNC)) { fs.mkdirSync(SYNC, { recursive: true }); console.log('made ' + SYNC); }
  fs.copyFileSync(DATA, path.join(SYNC, 'planner-data.json'));
  log('wrote planner-data.json (' + fs.statSync(DATA).size + ' bytes)');
  console.log('planner-data.json is in the sync folder. The school planner loads it the next time it is opened.');
} else if (cmd === 'requests') {
  const list = open();
  if (!list.length) { console.log('No open planner requests.'); process.exit(0); }
  for (const r of list) {
    console.log(`\n[${r.id}] ${r.at.slice(0, 16).replace('T', ' ')}  ${r.kind}`);
    if (r.text) console.log('  Message: ' + r.text);
    for (const L of r.lessons || []) console.log(`  Build for ${L.when}:\n    ` + String(L.prompt).split('\n').join('\n    '));
  }
} else if (cmd === 'done' && a1) {
  const all = readJson('requests-done.json', []);
  all.push({ id: a1, at: new Date().toISOString(), note: rest.join(' ') });
  fs.writeFileSync(path.join(SYNC, 'requests-done.json'), JSON.stringify(all, null, 1));
  log('marked request ' + a1 + ' done');
  console.log('Marked ' + a1 + ' done.');
} else if (cmd === 'state') {
  const st = readJson('planner-state.json', null);
  if (!st) { console.log('The school planner has not saved anything here yet.'); process.exit(0); }
  console.log('Last saved at school: ' + st.saved);
  console.log('Weeks saved: ' + Object.keys(st.weeks || {}).sort().join(', '));
  console.log('Equipment edits: ' + Object.keys(st.learned || {}).length + ', lessons added: ' + (st.added || []).length);
} else {
  console.error('Usage: node planner/planner-sync.js push | requests | done <id> [note] | state');
  process.exit(1);
}
