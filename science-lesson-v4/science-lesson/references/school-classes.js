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

// Week letter: the A/B sequence CONTINUES across holidays (Patryk 2026-10-03: w/c 19 Oct is A,
// so the first week back, w/c 2 Nov, is B). Only weeks with at least one term day count.
// Same rule and dates as the behaviour app (Code.gs) — change both together.
const WEEK_A_START = '2026-09-07';
const TERMS_2026_27 = [                              // first and last day of each term
  ['2026-09-07', '2026-10-21'], ['2026-11-02', '2026-12-18'], ['2027-01-05', '2027-02-12'],
  ['2027-02-22', '2027-03-25'], ['2027-04-12', '2027-05-28'], ['2027-06-07', '2027-07-23'],
];

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
const isoNum = (s) => { const [y, m, d] = s.split('-').map(Number); return dayNum(new Date(y, m - 1, d)); };
const TERM_NUMS = TERMS_2026_27.map(([a, b]) => [isoNum(a), isoNum(b)]);
// A week (Monday dayNum) counts if any of its Mon–Fri falls inside a term.
const isTeachingWeek = (mon) => TERM_NUMS.some(([a, b]) => mon + 4 >= a && mon <= b);
// Letter = parity of teaching weeks since the first Week A. A holiday week gets the letter
// of the next teaching week (useful when planning ahead during a holiday).
function weekLetter(date) {
  const start = isoNum(WEEK_A_START);
  const mon = dayNum(date) - ((date.getDay() + 6) % 7);
  let n = 0;
  if (mon >= start) { for (let w = start; w < mon; w += 7) if (isTeachingWeek(w)) n++; }
  else { for (let w = mon; w < start; w += 7) if (isTeachingWeek(w)) n--; }
  return ((n % 2) + 2) % 2 === 0 ? 'A' : 'B';
}

module.exports = { CLASSES, SCIENCE_CLASSES, CLASS_INFO, normClass, isPatrykClass, yearOf, weekLetter, WEEK_A_START };
