'use strict';
// school-classes.js — ONE home for "which classes are Patryk's" and "is this Week A or B".
// Used by: order-sheet.js, daily-brief.js, context.js (home-only scripts).
//
// Classes come from classes-2026-27.json (project root). Before 2026-10-02 each script
// carried its own hard-coded 2025/26 list (7BYA, 8AB, 9AB, 12D...), so every 2026/27 class
// was silently treated as "not Patryk's". Next September: update the JSON, not the scripts.

const fs   = require('fs');
const path = require('path');

const CLASSES_JSON = path.join(__dirname, '../../classes-2026-27.json');

// Week letter: same rule as the behaviour app (Code.gs WEEK_A_START) — fortnights counted
// from the first Week A Monday, holidays not skipped. Change both together if that is wrong.
const WEEK_A_START = '2026-09-07';

function loadClasses() {
  try {
    const j = JSON.parse(fs.readFileSync(CLASSES_JSON, 'utf8'));
    return j.classes || {};
  } catch (e) {
    console.warn(`WARNING: could not read ${CLASSES_JSON} (${e.message}) — no class list available.`);
    return {};
  }
}

const CLASS_INFO = loadClasses();
const CLASSES    = Object.keys(CLASS_INFO);                       // e.g. 7MLA, 8XP ... PSHE-9AB
const SCIENCE_CLASSES = CLASSES.filter(c => !/^PSHE/i.test(c));    // classes that ever need an equipment order

// Every spelling seen in Planner.xlsx / Arbor maps to the canonical key:
// "7Ml", "7ML", "Sc-7ML" → 7MLA;  "PSHE - 9AB" → PSHE-9AB;  "Ph-12C" → 12C.
const ALIASES = new Map();
for (const key of CLASSES) {
  const add = (s) => { if (s) ALIASES.set(squash(s), key); };
  add(key);
  add(CLASS_INFO[key].code);
  add(String(CLASS_INFO[key].code || '').replace(/^(Sc|Ph|Ch|Bi)-/i, ''));
  if (/^\d+[A-Z]+A$/i.test(key)) add(key.slice(0, -1));           // 7MLA ← 7ML
}
function squash(s) { return String(s || '').toUpperCase().replace(/\s+/g, '').replace(/[–—]/g, '-'); }

function normClass(raw) { return ALIASES.get(squash(raw)) || null; }
function isPatrykClass(raw) { return normClass(raw) !== null; }
function yearOf(raw) {
  const k = normClass(raw);
  if (k && CLASS_INFO[k].year) return CLASS_INFO[k].year;
  const m = String(raw || '').match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function dayNum(d) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }
function weekLetter(date) {
  const [y, m, d] = WEEK_A_START.split('-').map(Number);
  const idx = Math.floor((dayNum(date) - dayNum(new Date(y, m - 1, d))) / 7);
  return ((idx % 2) + 2) % 2 === 0 ? 'A' : 'B';
}

module.exports = { CLASSES, SCIENCE_CLASSES, CLASS_INFO, normClass, isPatrykClass, yearOf, weekLetter, WEEK_A_START };
