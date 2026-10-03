#!/usr/bin/env node
// order-sheet.js — weekly equipment order sheet generator
// Usage: node order-sheet.js [--week-start YYYY-MM-DD] [--dry-run]
'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const { LESSON_COLS, CLASS_COLS, parseSS, xmlAttr, parseRows, loadXlsx, isFilledSheet, sheetWeekType, isNewFormat, extractTimetable, extractLessons } = require('./xlsx-utils');
const tb = require('./textbook-index.js');

// ─── Paths ────────────────────────────────────────────────────────────────────

const PLANNER_PATH  = path.join(__dirname, '../../Planner.xlsx');
const EQUIP_KEY     = path.join(__dirname, 'equipment-key.md');
const BRIEF_LOG     = path.join(__dirname, '../../brief-log.json');
const CONTEXT_PATH  = path.join(__dirname, '../../context.json');
const DRIVE_BASE    = 'G:\\My Drive\\Beechen Cliff Science\\Lessons';

// Class list + Week A/B rule live in school-classes.js (read from classes-2026-27.json).
// PSHE is Patryk's but never needs an equipment order, so only science classes are planned.
const school = require('./school-classes.js');
const PATRYK_CLASSES_RAW = school.SCIENCE_CLASSES;
function isPatrykClass(cls)  { const k = school.normClass(cls); return !!k && PATRYK_CLASSES_RAW.includes(k); }
function normalizeClass(cls) { return school.normClass(cls) || cls; }
// "Cover: Specific Latent Heat" is still the lesson that was taught — match on the title.
function stripCover(lesson) { return String(lesson || '').replace(/^\s*cover\s*:\s*/i, ''); }

// ─── Order Sheet date helpers ─────────────────────────────────────────────────

// Month + day from a sheet name ("Order Sheet Week B - Sep 14" → {mon:8, day:14}), or null.
function sheetMonthDay(name) {
  const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
                  january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
  const dm = name.match(/([a-z]+)\s+(\d+)\s*$/i);
  if (!dm) return null;
  const mon = months[dm[1].toLowerCase()];
  const day = parseInt(dm[2]);
  return mon !== undefined && day ? { mon, day } : null;
}

// Sheet names carry no year, and Planner.xlsx holds MORE than one academic year
// (2025/26 tabs Sep 22 … Jul 6, then 2026/27 tabs from Sep 7). Assigning every tab to the
// current academic year made last July's tab look like July NEXT year — newer than this
// week — so the generator copied a 2025/26 sheet. Fix: tabs are in chronological order, so
// walk them newest-first and step back an academic year whenever the month jumps forward.
// Returns a Map(sheet name → Excel serial date). `today` is injectable for tests.
function sheetDates(names, today = new Date()) {
  const out = new Map();
  const acad = (mon) => (mon + 4) % 12;                       // Sep = 0 … Aug = 11
  const dated = names.map(n => ({ n, md: sheetMonthDay(n) })).filter(x => x.md);
  if (!dated.length) return out;
  const cal = today.getFullYear();
  let ay = today.getMonth() >= 8 ? cal : cal - 1;             // academic year containing today
  const dateIn = (ayStart, md) => new Date(md.mon >= 8 ? ayStart : ayStart + 1, md.mon, md.day);
  // The newest tab can sit at most a few weeks ahead of today; if not, it belongs to last year.
  const newest = dated[dated.length - 1].md;
  if (dateIn(ay, newest) - today > 60 * 86400000) ay -= 1;
  let prev = null;
  for (let i = dated.length - 1; i >= 0; i--) {
    const { n, md } = dated[i];
    if (prev && acad(md.mon) > acad(prev.mon)) ay -= 1;       // e.g. Jul tab before a Sep tab
    out.set(n, dateToSerial(dateIn(ay, md)));
    prev = md;
  }
  return out;
}

function dateToSerial(d) {
  // Excel serial: days since 1900-01-01 (Excel has a leap year bug: counts 1900 as leap)
  const epoch = Date.UTC(1899, 11, 30);
  return (d.getTime() - epoch) / 86400000;
}

function serialToDate(serial) {
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86400000);
}

// ─── Equipment Key ────────────────────────────────────────────────────────────

function normalizeLesson(s) {
  return s.toLowerCase()
    .replace(/\bpt\.?\s*2\b/g,'pt2').replace(/\bpart\s*2\b/g,'pt2')
    .replace(/\bpractical\b/g,'prac').replace(/\brp\b/g,'prac')
    .replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim();
}

function loadEquipmentKey(filepath) {
  if (!fs.existsSync(filepath)) return {};
  const text = fs.readFileSync(filepath, 'utf8');
  const map  = {};
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      const name = line.slice(3).trim();
      current = { name, equipment: null, sets: 'threes' };
      map[normalizeLesson(name)] = current;
    } else if (current) {
      const eq = line.match(/^- Equipment: (.+)/);
      if (eq && !current.equipment) current.equipment = eq[1].trim();
      const alt = line.match(/^- Alt: (.+)/);
      if (alt && !current.equipment) current.equipment = alt[1].trim(); // use first alt if no primary
      const sets = line.match(/^- Sets: (.+)/);
      if (sets) current.sets = sets[1].trim();
    }
  }
  return map;
}

function lookupEquipment(lessonName, key) {
  const nLesson = normalizeLesson(lessonName);
  // Exact match
  if (key[nLesson]) return key[nLesson];
  // Substring match — ponytail: skip single-word keys (e.g. "test") to avoid overbroad matches
  for (const [k, v] of Object.entries(key)) {
    if (k.split(' ').length < 2) continue;
    if (nLesson.includes(k) || k.includes(nLesson)) return v;
  }
  return null;
}

// Human label for a sets value ("threes" → "sets of 3") for the equipment cell.
function setsLabel(sets) {
  const map = { threes: 'sets of 3', pairs: 'pairs', demo: 'demo (1 set)', individual: 'individual' };
  return map[String(sets || '').toLowerCase()] || String(sets || '');
}

// Equipment cells that carry no orderable equipment — don't annotate these with sets.
function isNonOrder(equipText) {
  return /^(n\/a|already printed|see teacher)/i.test(String(equipText || ''));
}

// Append an entry to brief-log.json (same shape brief-log.js writes) so the
// daily brief can see the order sheet went in this week.
function appendBriefLog(file, message) {
  let log = { entries: [] };
  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed && Array.isArray(parsed.entries)) log = parsed;
    } catch { /* unreadable log — start fresh rather than crash the order sheet */ }
  }
  log.entries.push({
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    category:  'deadline',
    message,
  });
  fs.writeFileSync(file, JSON.stringify(log, null, 2), 'utf8');
}

// Best-guess when not in key — rules loaded from equipment-rules.json
const RULES_PATH  = path.join(__dirname, 'equipment-rules.json');
const GUESS_RULES = fs.existsSync(RULES_PATH) ? JSON.parse(fs.readFileSync(RULES_PATH, 'utf8')) : [];
function bestGuessEquipment(lesson) {
  const lo = lesson.toLowerCase();
  for (const r of GUESS_RULES) {
    if (!new RegExp(r.match).test(lo)) continue;
    if (r.exclude && new RegExp(r.exclude).test(lo)) continue;
    return { equipment: r.equipment, sets: r.sets || 'threes' };
  }
  return { equipment: 'see teacher', sets: 'threes' };
}

// ─── Drive Folder Lookup ──────────────────────────────────────────────────────


function findNextLessonDrive(cls, lastLesson) {
  const yr = school.yearOf(cls);
  if (!yr) return null;
  const yearDir = path.join(DRIVE_BASE, `Year ${yr}`);
  if (!fs.existsSync(yearDir)) return null;

  // Search recursively for a lesson folder matching lastLesson
  const normLast = lastLesson.toLowerCase().replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim();
  let found = null;
  let foundDir = null;

  function scan(dir, depth) {
    if (depth > 4 || found) return;
    let entries;
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const loEntry  = entry.toLowerCase().replace(/[^\w\s]/g,' ').replace(/\s+/g,' ').trim();
      // Look for "Lesson N - title" pattern
      const lm = entry.match(/^Lesson\s+(\d+)\s*[–\-]\s*(.+)$/i);
      if (lm && (loEntry.includes(normLast.slice(0,12)) || normLast.includes(loEntry.replace(/^lesson \d+ /,'').slice(0,12)))) {
        found = { num: parseInt(lm[1]), title: lm[2].trim() };
        foundDir = dir;
      } else if (!entry.includes('.')) {
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) scan(fullPath, depth + 1);
        } catch {}
      }
    }
  }

  scan(yearDir, 0);

  if (!found || !foundDir) return null;

  // subject = first path segment under "Year N" (…/Year 9/Biology/Macrotopic/…)
  const rel = path.relative(yearDir, foundDir).split(path.sep);
  const subject = rel[0] || null;

  // Now find lesson N+1 in the same directory
  const nextNum = found.num + 1;
  let entries;
  try { entries = fs.readdirSync(foundDir); } catch { return null; }
  for (const entry of entries) {
    const lm = entry.match(/^Lesson\s+(\d+)\s*[–\-]\s*(.+)$/i);
    if (lm && parseInt(lm[1]) === nextNum) {
      return { num: nextNum, title: lm[2].trim(), subject };
    }
  }
  return null; // found current but no next yet
}

// Which books to order for a class's next lesson (Bug: textbook ordering).
// Normal matched lesson → 1 set; test-review → 2 sets (book only); practical,
// test, unmatched, or unknown year/book → none. "set" = a class set of books.
function booksToOrder(cls, lessonName, subject) {
  const year = school.yearOf(cls);
  if (!year) return '';
  const norm = normalizeLesson(lessonName);              // 'practical'/'rp' already → 'prac'
  if (norm.includes('prac')) return '';                  // experiment/practical → no books
  const isReview = /\brevi(?:ew|sion)\b/.test(norm);
  if (norm.includes('test') && !isReview) return '';     // actual test → no books
  if (isReview) {
    const book = tb.primaryBook({ year, subject });
    return book ? `Books: 2× ${book}` : '';
  }
  const topic = lessonName.replace(/^Lesson\s+\d+\s*[–\-:]\s*/i, '').trim(); // drop "Lesson N - " prefix
  const m = tb.matchLesson({ year, subject, topic });
  return m ? `Books: 1× ${m.book}` : '';                  // no match → no books (safe default)
}

// ─── XLSX Writing ─────────────────────────────────────────────────────────────

function addString(ss, str) {
  let idx = ss.indexOf(str);
  if (idx < 0) { idx = ss.length; ss.push(str); }
  return idx;
}

function buildSsXml(ss) {
  const count = ss.length;
  const items = ss.map(s => {
    const esc = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<si><t xml:space="preserve">${esc}</t></si>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${count}" uniqueCount="${count}">${items}</sst>`;
}

// Update a cell's shared-string value in worksheet XML
function setCellSS(xml, addr, idx) {
  // Case 1: existing shared-string cell → just replace value
  const ssRe = new RegExp(`(<c r="${addr}"[^>]*t="s"[^>]*>\\s*(?:<f>[^<]*<\\/f>)?\\s*<v>)\\d+(<\\/v>)`);
  if (ssRe.test(xml)) return xml.replace(ssRe, `$1${idx}$2`);

  // Case 2: existing numeric/formula cell → add t="s" and replace value
  const numRe = new RegExp(`(<c r="${addr}")([^>]*)(>\\s*(?:<f>[^<]*<\\/f>)?\\s*<v>)\\d+(\\.\\d+)?(<\\/v>)`);
  if (numRe.test(xml)) {
    return xml.replace(numRe, (_, pre, attrs, mid, _dec, end) => {
      const cleaned = attrs.replace(/\s*t="[^"]*"/, '');
      return `${pre}${cleaned} t="s"${mid}${idx}${end}`;
    });
  }

  // Case 3: self-closing cell (empty) → expand it
  const scRe = new RegExp(`<c r="${addr}"([^>]*)\/>`);
  if (scRe.test(xml)) {
    return xml.replace(scRe, (_, attrs) => {
      const cleaned = attrs.replace(/\s*t="[^"]*"/, '');
      return `<c r="${addr}"${cleaned} t="s"><v>${idx}</v></c>`;
    });
  }

  return xml; // cell not found — leave as-is
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function nextMonday(from = new Date()) {
  const d = new Date(from);
  const day = d.getDay(); // 0=Sun,1=Mon,...
  const diff = day === 1 ? 7 : (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function fmtDate(d) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function fmtSheetName(weekType, d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `Order Sheet Week ${weekType} - ${months[d.getMonth()]} ${d.getDate()}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args   = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const wsIdx = args.indexOf('--week-start');
  const wsVal = wsIdx >= 0 ? args[wsIdx + 1]
              : (args.find(a => a.startsWith('--week-start=')) || '').slice(13);
  let mondayDate;
  if (wsVal) {
    const [y,mo,dy] = wsVal.split('-').map(Number);
    mondayDate = new Date(y, mo - 1, dy); // local midnight — avoids UTC offset shifting the date
  } else {
    mondayDate = nextMonday();
  }

  // ── Load Planner.xlsx ──
  if (!fs.existsSync(PLANNER_PATH)) {
    console.error(`ERROR: Planner.xlsx not found at ${PLANNER_PATH}`);
    console.error('Run from the science-lesson-v4 project directory.');
    process.exit(1);
  }
  console.log('Loading Planner.xlsx…');
  let { zip, ss, ssXml, wbXml, rlXml, sheets } = loadXlsx(PLANNER_PATH);

  // ── Find filled order sheets (dated by tab order — see sheetDates) ──
  const filled = sheets.filter(s => isFilledSheet(s.name));
  const dates  = sheetDates(filled.map(s => s.name));
  const targetSerial = dateToSerial(mondayDate);
  const allDated = filled
    .map(s => ({ ...s, rows: parseRows(zip.readAsText(s.file), ss), date: dates.get(s.name) || 0, weekType: sheetWeekType(s.name) }))
    .filter(s => s.date > 0)
    .sort((a,b) => a.date - b.date);

  // Never overwrite a week Patryk has already filled himself.
  const already = allDated.find(s => Math.abs(s.date - targetSerial) < 3);
  if (already) {
    console.error(`ERROR: "${already.name}" already covers the week of ${fmtDate(mondayDate)} — nothing generated.`);
    process.exit(1);
  }

  // Only this academic year's sheets, and only weeks before the one being planned:
  // a 2025/26 tab must never supply a "last lesson" for a 2026/27 class with the same code.
  const ayStart = dateToSerial(new Date(mondayDate.getMonth() >= 8 ? mondayDate.getFullYear() : mondayDate.getFullYear() - 1, 8, 1));
  const filledSheets = allDated.filter(s => s.date >= ayStart && s.date < targetSerial);

  if (filledSheets.length === 0) {
    console.error('ERROR: No filled order sheets from this school year before that week in Planner.xlsx');
    process.exit(1);
  }

  const latest = filledSheets[filledSheets.length - 1];
  console.log(`Latest sheet: ${latest.name} (date: ${fmtDate(serialToDate(latest.date))})`);

  // ── Week type: same fortnight rule as the behaviour app (school-classes.js) ──
  const nextWeekType = school.weekLetter(mondayDate);

  // ── Timetable: copy the most recent sheet of the SAME week type (A and B differ) ──
  const sameWeek = [...filledSheets].reverse().find(s => s.weekType === nextWeekType);
  const timetableSheet = sameWeek || latest;
  if (!sameWeek) console.warn(`WARNING: no Week ${nextWeekType} sheet yet this year — copying the timetable from "${latest.name}". Check every slot.`);
  console.log(`Timetable copied from: ${timetableSheet.name}`);
  const timetable = extractTimetable(timetableSheet.rows);

  // ── Extract last lesson per class (newest sheet first; class spellings normalised) ──
  const lastLessons = {};
  for (let i = filledSheets.length - 1; i >= 0; i--) {
    const lessons = extractLessons(filledSheets[i].rows);
    for (const [raw, lesson] of Object.entries(lessons)) {
      const cls = normalizeClass(raw);
      if (!lastLessons[cls]) lastLessons[cls] = { lesson: stripCover(lesson), sheet: filledSheets[i].name };
    }
    if (PATRYK_CLASSES_RAW.every(c => lastLessons[c])) break;
  }

  // ── Load equipment key ──
  const equipKey = loadEquipmentKey(EQUIP_KEY);
  console.log(`Equipment key: ${Object.keys(equipKey).length} entries`);

  // ── Build plan per class ──
  const plan = {};
  for (const cls of PATRYK_CLASSES_RAW) {
    const last  = lastLessons[cls] || {};
    const next  = findNextLessonDrive(cls, last.lesson || '');
    const nextLesson = next ? `Lesson ${next.num} - ${next.title}` : (last.lesson ? `${last.lesson} [next TBD]` : '[unknown]');
    const equip = lookupEquipment(nextLesson, equipKey) || lookupEquipment(last.lesson || '', equipKey);
    const equipText = equip ? equip.equipment : bestGuessEquipment(nextLesson).equipment;
    const sets      = equip ? equip.sets      : bestGuessEquipment(nextLesson).sets;
    const guessed   = !equip;

    const subject = next ? next.subject : null;
    plan[cls] = {
      lastLesson:  last.lesson || '(none)',
      nextLesson:  nextLesson,
      equipment:   equipText,
      sets,
      guessed,
      subject,
      books:       booksToOrder(cls, next ? `Lesson ${next.num} - ${next.title}` : '', subject),
      lastSheet:   last.sheet || '(none)'
    };
  }

  // ── Apply context.json overrides (tests, revision, pre-planned absences) ──
  const ctx = fs.existsSync(CONTEXT_PATH) ? JSON.parse(fs.readFileSync(CONTEXT_PATH, 'utf8')) : null;
  if (ctx) {
    const nextStart = localISO(mondayDate);
    const nextEnd   = localISO(new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + 4));
    for (const cls of PATRYK_CLASSES_RAW) {
      const p = plan[cls];
      const test = (ctx.tests || []).find(t => t.class === cls && t.date >= nextStart && t.date <= nextEnd);
      if (test) { p.equipment = `already printed — test${test.topic ? ': ' + test.topic : ''}`; p.guessed = false; p.books = ''; continue; } // actual test → no books
      const rev = (ctx.revisionMode || []).find(r => r.class === cls && r.active);
      if (rev) { p.equipment = 'N/A — revision'; p.guessed = false; const b = tb.primaryBook({ year: school.yearOf(cls), subject: p.subject }); p.books = b ? `Books: 2× ${b}` : ''; continue; } // revision → 2 sets
      const mp = (ctx.missingPeriods || []).find(m => m.date >= nextStart && m.date <= nextEnd && (!(m.classes || []).length || m.classes.includes(cls)));
      if (mp) { p.equipment = mp.action === 'move' ? 'N/A — lesson moved' : 'N/A — cover'; p.guessed = false; }
    }
    console.log(`Context: week ${ctx.weekOf} (${ctx.weekType})`);
  }

  // ── Print terminal summary ──
  console.log('\n' + '═'.repeat(72));
  console.log(`ORDER SHEET: Week ${nextWeekType}   Monday ${fmtDate(mondayDate)}`);
  console.log('═'.repeat(72));

  const days = ['Mon','Tue','Wed','Thu','Fri'];
  for (const day of days) {
    const slots = timetable[day] || [];
    if (slots.length === 0) continue;
    console.log(`\n${day}:`);
    for (const slot of slots) {
      const cls = slot.class;
      if (!isPatrykClass(cls)) {
        console.log(`  P${LESSON_COLS.indexOf(slot.lessonCol)+1} ${cls.padEnd(5)} → N/A (not Patryk's class)`);
        continue;
      }
      const normCls = normalizeClass(cls);
      const p = plan[normCls];
      const flag = p.guessed ? ' [GUESS]' : '';
      console.log(`  P${LESSON_COLS.indexOf(slot.lessonCol)+1} ${cls.padEnd(5)} last=${p.lastLesson}`);
      console.log(`          next=${p.nextLesson}`);
      console.log(`          equip=${p.equipment}${isNonOrder(p.equipment) ? '' : ` [${setsLabel(p.sets)}]`}${flag}`);
      if (p.books) console.log(`          ${p.books}`);
    }
  }

  // Print classes not found in timetable
  for (const cls of PATRYK_CLASSES_RAW) {
    const inTimetable = Object.values(timetable).flat().some(s => normalizeClass(s.class) === cls);
    if (!inTimetable) {
      const p = plan[cls];
      console.log(`\n[NO TIMETABLE SLOT FOUND] ${cls}: last=${p.lastLesson}`);
    }
  }

  console.log('\n' + '─'.repeat(72));

  if (dryRun) {
    console.log('--dry-run: no changes written.');
    return;
  }

  // ── Confirm ──
  await new Promise(res => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    process.once('SIGINT', () => { console.log('\nCancelled — no changes written.'); process.exit(0); });
    rl.question('Press Enter to generate the order sheet, or Ctrl+C to cancel: ', () => { rl.close(); res(); });
  });

  // ── Clone latest sheet, update cells ──
  console.log('\nGenerating order sheet…');
  let sheetXml = zip.readAsText(timetableSheet.file);
  let currentSs = [...ss];

  // Helper: ensure string in SS and update cell
  function setCell(addr, value) {
    sheetXml = setCellSS(sheetXml, addr, addString(currentSs, value));
  }

  // Update header
  setCell('R1', `Week ${nextWeekType}`);
  setCell('S1', fmtDate(mondayDate));

  // Update lesson and equipment cells for each day/period
  const dayOffsets = isNewFormat(timetableSheet.rows)
    ? { Mon:[4,6,7], Tue:[9,11,12], Wed:[14,16,17], Thu:[19,21,22], Fri:[24,26,27] }
    : { Mon:[4,5,6], Tue:[8,9,10], Wed:[12,13,14], Thu:[16,17,18], Fri:[20,21,22] };

  for (const day of days) {
    const slots   = timetable[day] || [];
    const offsets = dayOffsets[day];
    if (!offsets) continue;
    const [, lessonRow, equipRow] = offsets;

    for (const slot of slots) {
      const cls = slot.class;
      const lCol = slot.lessonCol;
      const lessonAddr = `${lCol}${lessonRow}`;
      const equipAddr  = `${lCol}${equipRow}`;

      if (!isPatrykClass(cls)) {
        setCell(lessonAddr, 'N/A');
        setCell(equipAddr,  'N/A');
        continue;
      }

      const p = plan[normalizeClass(cls)];
      // Strip "[next TBD]" suffix for the sheet
      const lessonForSheet = p.nextLesson.replace(/\s*\[next TBD\]/, '').replace(/\s*\[unknown\]/, 'TBD');
      const equipBase = p.equipment || 'see teacher';
      // Technicians need the set count on the sheet — it was computed but never written.
      const equipCell = equipBase
        + (isNonOrder(equipBase) ? '' : ` — ${setsLabel(p.sets)}`)
        + (p.books ? `  ·  ${p.books}` : '');
      setCell(lessonAddr, lessonForSheet);
      setCell(equipAddr,  equipCell);
    }
  }

  // ── Add new sheet to zip ──
  // Find next available sheet number
  const sheetNums = zip.getEntries()
    .map(e => e.entryName.match(/xl\/worksheets\/sheet(\d+)\.xml/))
    .filter(Boolean)
    .map(m => parseInt(m[1]));
  const nextSheetNum = Math.max(...sheetNums) + 1;
  const newSheetFile = `xl/worksheets/sheet${nextSheetNum}.xml`;

  // Find next sheetId
  const sheetIds = [...wbXml.matchAll(/sheetId="(\d+)"/g)].map(m => parseInt(m[1]));
  const nextSheetId = Math.max(...sheetIds) + 1;

  // Find next rId
  const rIds = [...rlXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1]));
  const nextRId = Math.max(...rIds) + 1;
  const newRId = `rId${nextRId}`;

  const newSheetName = fmtSheetName(nextWeekType, mondayDate);

  // Update workbook.xml: add new <sheet> before </sheets>
  const newSheetEntry = `<sheet state="visible" name="${newSheetName}" sheetId="${nextSheetId}" r:id="${newRId}"/>`;
  const newWbXml = wbXml.replace('</sheets>', newSheetEntry + '</sheets>');

  // Update rels: add new Relationship before </Relationships>
  const relType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet';
  const newRelEntry = `<Relationship Id="${newRId}" Type="${relType}" Target="worksheets/sheet${nextSheetNum}.xml"/>`;
  const newRlXml = rlXml.replace('</Relationships>', newRelEntry + '</Relationships>');

  // New shared strings xml
  const newSsXml = buildSsXml(currentSs);

  // Write back to zip
  zip.updateFile('xl/sharedStrings.xml', Buffer.from(newSsXml, 'utf8'));
  zip.updateFile('xl/workbook.xml',      Buffer.from(newWbXml, 'utf8'));
  zip.updateFile('xl/_rels/workbook.xml.rels', Buffer.from(newRlXml, 'utf8'));
  zip.addFile(newSheetFile, Buffer.from(sheetXml, 'utf8'));

  // Update Content_Types.xml to include new sheet
  let ctXml = zip.readAsText('[Content_Types].xml');
  const ctEntry = `<Override PartName="/xl/worksheets/sheet${nextSheetNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  if (!ctXml.includes(`sheet${nextSheetNum}.xml`)) {
    ctXml = ctXml.replace('</Types>', ctEntry + '</Types>');
    zip.updateFile('[Content_Types].xml', Buffer.from(ctXml, 'utf8'));
  }

  const backupPath = PLANNER_PATH.replace('.xlsx', `_bak_${localISO(new Date())}.xlsx`);
  fs.copyFileSync(PLANNER_PATH, backupPath);
  console.log(`Backup saved to ${path.basename(backupPath)}`);
  zip.writeZip(PLANNER_PATH);
  console.log(`Written sheet "${newSheetName}" to Planner.xlsx`);

  // ── Brief-log entry — daily-brief.js clears its Thursday order-sheet warning
  // by finding an entry matching /order sheet/ + /submit/ in brief-log.json.
  appendBriefLog(BRIEF_LOG, `order sheet submitted — Week ${nextWeekType} w/c ${fmtDate(mondayDate)}`);
  console.log('Logged submission to brief-log.json');
  console.log('\nDone. Upload Planner.xlsx to Google Drive to share with technicians.');
}

if (require.main === module) {
  main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
} else {
  module.exports = { appendBriefLog, setsLabel, isNonOrder, normalizeLesson, booksToOrder, sheetDates, dateToSerial, stripCover };
}
