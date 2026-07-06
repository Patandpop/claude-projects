#!/usr/bin/env node
'use strict';
// brief-log.js — append-only log for daily brief (M17)
// Usage: node references/brief-log.js "update daily brief: [note]"
//        node references/brief-log.js --list
//
// Categories inferred from message text:
//   homework, parent-call, observation, deadline, lunchtime,
//   tutor-note, seating, cover, note (fallback)

const fs   = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../../brief-log.json');

const CATEGORIES = [
  ['homework',    /homework|hw\b|seneca/i],
  ['parent-call', /parent|call home|phone home/i],
  ['observation', /observ/i],
  ['deadline',    /deadline|due\b|submit/i],
  ['lunchtime',   /lunch|intervention|catch.?up/i],
  ['tutor-note',  /tutor/i],
  ['seating',     /seat/i],
  ['cover',       /cover/i],
];

function inferCategory(msg) {
  for (const [cat, re] of CATEGORIES) {
    if (re.test(msg)) return cat;
  }
  return 'note';
}

function loadLog() {
  if (!fs.existsSync(LOG_FILE)) return { entries: [] };
  try { return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); }
  catch { return { entries: [] }; }
}

const args = process.argv.slice(2);

if (args.includes('--list')) {
  const log = loadLog();
  if (!log.entries || !log.entries.length) { console.log('(no entries)'); process.exit(0); }
  for (const en of log.entries) {
    console.log('[' + en.timestamp + '] [' + en.category + '] ' + en.message);
  }
  process.exit(0);
}

const msg = args.find(function(a) { return !a.startsWith('--'); });
if (!msg) {
  process.stderr.write('Usage: node brief-log.js "update daily brief: [note]"\n       node brief-log.js --list\n');
  process.exit(1);
}

const cleaned = msg.replace(/^update daily brief:\s*/i, '').trim();
const entry = {
  timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
  category:  inferCategory(cleaned),
  message:   cleaned,
};

const log = loadLog();
if (!log.entries) log.entries = [];
log.entries.push(entry);
fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
console.log('Logged [' + entry.category + ']: ' + entry.message);
