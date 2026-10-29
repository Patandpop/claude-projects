#!/usr/bin/env node
// planner-catalogue.js — the lesson sequence + progress engine behind the weekly order sheet
// (Patryk 2026-10-03) and, later, the planner web app.
//
//   node planner-catalogue.js --week 2026-10-12            print next week's plan (writes nothing)
//   node planner-catalogue.js --backtest 2026-09-28        re-plan a week he already filled, compare
//   node planner-catalogue.js --catalogue out.json         dump every class's lesson list
//
// What it knows:
//   - each class's lessons in order: HIS topics only (co-teachers' topics are skipped), in
//     scheme-of-learning order, with the confirmed 2026-27 class orders (8XP/8AG Biology first);
//     lesson folders come from the Drive Lessons tree; an A-level chapter with no folders yet
//     falls back to the scheme's planned sections so the sequence never stops dead;
//   - where each class is up to, read from his own filled order sheets in Planner.xlsx (every
//     slot, typo-tolerant: "Lifecylce", "Superpostion", "Cover: X" all match);
//   - the week ahead: each slot gets the NEXT lesson in turn (no repeats), a same-day double
//     counts once, holidays and INSET days get no lesson, a finished topic rolls on to the next;
//   - equipment: technician guide row first, then equipment-key.md past orders, else a marked guess.
// Anything it is unsure of is flagged [CHECK] rather than guessed silently.
'use strict';

const fs = require('fs');
const path = require('path');
const xu = require('./xlsx-utils.js');
const school = require('./school-classes.js');

const ROOT = path.join(__dirname, '..', '..');
const DRIVE = 'G:/My Drive/Beechen Cliff Science/Lessons';
const SOL = path.join(ROOT, 'scheme-of-learning.json');
const PLANNER = path.join(ROOT, 'Planner.xlsx');
const EQUIP_KEY = path.join(__dirname, 'equipment-key.md');
const LEARNED = path.join(ROOT, 'equipment-learned.json');       // the app's remembered edits

// Term dates 2026-27 as Patryk gave them (2026-10-03). INSET days inside terms get no lessons.
const TERMS = [['2026-09-07', '2026-10-21'], ['2026-11-02', '2026-12-18'], ['2027-01-05', '2027-02-12'],
  ['2027-02-22', '2027-03-25'], ['2027-04-12', '2027-05-28'], ['2027-06-07', '2027-07-28']];
const INSET = new Set(['2026-10-22', '2026-10-23', '2026-11-25', '2027-01-04']);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isTeachingDay = (d) => !INSET.has(iso(d)) && TERMS.some(([a, b]) => iso(d) >= a && iso(d) <= b);

// Which topics are HIS, per class (memory: project_class_sharing_2026_27).
const ROUTES = {
  '7MLA': { seq: 'year7' },
  '8XP': { seq: 'year8', subjects: ['Biology', 'Physics'], first: ['B1 Respiration and Photosythesis', 'P1 Motion and Pressure', 'P3 Light', 'B2 Health and Digestion'] },
  '8AG': { seq: 'year8', subjects: ['Biology', 'Physics'], first: ['B1 Respiration and Photosythesis', 'P1 Motion and Pressure', 'P3 Light', 'B2 Health and Digestion'] },
  '9AS': { seq: 'year9', subjects: ['Physics', 'Chemistry'] },
  '9XS': { seq: 'year9' },
  '10C2': { seq: 'year10combined' }, '10S2': { seq: 'year10separate' }, '11S2': { seq: 'year11separate' },
  '12C': { ks5: 'year12' }, '13D': { ks5: 'year13' },
};
// Separate-science-only lessons, never planned for a Combined class (Patryk 2026-10-08, 10C2):
// "(Separate)", "Triple", "Chem / Phys / Bio Only", "+ CHEM Only If Short on Time". Higher-tier lessons stay.
const SEPARATE_ONLY = /\(separate\)|\btriple\b|\b(chem|phys|bio)(istry|ics|logy)?\s*only\b|\bseparate\s+only\b/i;
const YEAR_OF = { year7: 7, year8: 8, year9: 9, year10combined: 10, year10separate: 10, year11separate: 11, year12: 12, year13: 13 };

/* ------------------------------------------------------------- fuzzy matching */
const STOP = new Set('lesson the a an and of in to for on with by part pt required practical rp theory pag use using other lab'.split(' '));
// plurals -> singular: oscilloscopes -> oscilloscope, batteries -> battery, boxes -> box, cells -> cell
const singular = (w) => (w.length <= 4 ? w : /ies$/.test(w) ? w.slice(0, -3) + 'y' : /(s|x|ch|sh)es$/.test(w) ? w.slice(0, -2) : /[^s]s$/.test(w) ? w.slice(0, -1) : w);
// Abbreviations and his usual spellings in Planner.xlsx -> the words in the lesson folder names.
const SYN = {
  tir: 'total internal reflection', snell: 'refractive index', snells: 'refractive index', em: 'electromagnetic',
  shc: 'specific heat capacity', gpe: 'gravitational potential energy', ke: 'kinetic energy',
  ohms: 'ohm', live: 'life', anerobic: 'anaerobic', gases: 'gas air', gas: 'gas air', microwaves: 'microwave electromagnetic', microwave: 'microwave electromagnetic',
};
const toks = (s) => String(s || '').toLowerCase().replace(/^\s*cover\s*:\s*/, '').replace(/[^a-z0-9 ]+/g, ' ')
  .split(/\s+/).flatMap((w) => (SYN[w] ? SYN[w].split(' ') : [w]))
  .filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w))
  .map(singular)
  .map((w) => (w.length > 5 ? w.replace(/(ing|ed|e)$/, '') : w));      // change = changing = changed
// Edit distance that counts a swapped pair of letters as one slip ("saftey" = "safety").
function lev(a, b) {
  const m = a.length, n = b.length; if (!m || !n) return m || n;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}
// How well two words match: 1 exact, .95 one is the start of the other, .85 a typo, 0 no.
// Never a typo-match across "an-" (aerobic vs anaerobic are opposites).
function same(a, b) {
  if (a === b) return 1;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return 0.95;
  if (a.startsWith('an') !== b.startsWith('an')) return 0;
  if (a.length >= 5 && b.length >= 5 && lev(a, b) <= (Math.min(a.length, b.length) >= 8 ? 2 : 1)) return 0.85;
  return 0;
}
// 0..1: mostly "how much of what he wrote is in this title" (his entries are short), partly
// how much of the title it covers, so a short exact title beats a long one that merely contains it.
function sim(x, y) {
  const A = toks(x), B = toks(y);
  if (!A.length || !B.length) return 0;
  // Long, specific words count more than short common ones: "superpostion" decides a match, "wave"
  // or "cells" alone does not.
  const wt = (w) => Math.min(12, w.length);
  const wA = A.reduce((s, a) => s + wt(a), 0), wB = B.reduce((s, b) => s + wt(b), 0);
  const used = new Set(); let hit = 0;
  for (const a of A) {
    let best = -1, bs = 0;
    B.forEach((b, k) => { if (used.has(k)) return; const s = same(a, b); if (s > bs) { bs = s; best = k; } });
    if (best >= 0) { used.add(best); hit += bs * Math.max(wt(a), wt(B[best])) / 2 + bs * Math.min(wt(a), wt(B[best])) / 2; }
  }
  return 0.6 * Math.min(1, hit / wA) + 0.4 * Math.min(1, (2 * hit) / (wA + wB));
}

/* ---------------------------------------------------------- lesson catalogue */
// Every lesson folder, however it is spelled: "Lesson 1 MRS GREN" (no dash), "lesson 7 - History of
// the Atom" (small l), "Lesson 2 - 3 - Exothermic..." (a two-lesson folder). Patryk 2026-10-04: a
// lesson missing from the list is a lesson he never gets offered, so none may be dropped.
const OPTIONAL = /\(\s*op\w*nal\s*\)|^(formative assessment|formative review|dirt\b|assessment point)|only if short on time|self study/i;
function listLessons(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => { try { return fs.statSync(path.join(dir, f)).isDirectory(); } catch { return false; } })
    // "Lesson 3a - Cell Models": a lesson he added in the planner after lesson 3
    .map((f) => [f, f.match(/^lesson\s*(\d+)([a-z](?=[\s-]))?\s*(?:-\s*)?(.*)$/i)]).filter(([, m]) => m && m[3].trim())
    .map(([f, m]) => {
      const raw = m[3].replace(/^\d+\s*-\s*/, '').trim();
      return { num: m[2] ? m[1] + m[2].toLowerCase() : +m[1], ord: +m[1] + (m[2] ? (m[2].toLowerCase().charCodeAt(0) - 96) / 100 : 0),
        title: raw.replace(/\s*\(\s*op\w*nal\s*\)\s*/i, ' ').trim(), folder: path.join(dir, f), optional: OPTIONAL.test(raw) || (+m[1] === 0 && !m[2]) };
    })
    .sort((a, b) => a.ord - b.ord);
}
// Lessons the topic's technician guide lists but that have no folder yet (9XS B1 "Eukaryotic cells",
// 10 P2 "Circuit symbols"). They go in the list where the guide puts them, marked "no folder".
// DIRT / assessment rows come in as optional; test and revision rows are left to the test logic.
function guideOnly(dir, folderLessons, range) {
  const clean = (t) => t.replace(/\((physics|chemistry|biology) only\)|\b(epa|homework (set|setting|reminder|check|checking))\b|\bP\d+ L\d+\b/ig, ' ');
  const rows = techGuide(dir).filter((r) => r.title && !/^(test|revision)\b|^test lesson/i.test(r.title.trim()));
  // pass 1: best folder for each guide row by title
  const hit = rows.map((r) => {
    let best = null, bs = 0;
    // both ways round, averaged: one shared word ("Circuit symbols" vs "...Parallel Circuits") is not a match
    for (const L of folderLessons) { const s = (sim(clean(r.title), L.title) + sim(L.title, clean(r.title))) / 2; if (s > bs) { bs = s; best = L; } }
    return bs >= 0.45 ? best : null;
  });
  // pass 2: a row no title matched is the folder with ITS number, if no other row claimed that
  // folder ("Lungs and gills" = folder L14 "Exchange Surfaces", "Half live dice" = L8 "Half Life")
  rows.forEach((r, k) => {
    if (hit[k] || r.num == null) return;
    const L = folderLessons.find((x) => x.num === Math.floor(r.num) && !hit.includes(x));
    if (L && !/dirt|assessment|marking point|formative/i.test(r.title)) hit[k] = L;
  });
  const out = [];
  let after = null;                                   // the folder lesson the previous guide row matched
  for (const [k, r] of rows.entries()) {
    if (hit[k]) { after = hit[k]; continue; }
    // KS3 guides list DIRT lessons the folders already have ("Formative review" vs folder "Formative Assessment")
    if (/dirt|assessment|marking point|formative/i.test(r.title) && folderLessons.some((L) => L.optional && /dirt|assessment|formative/i.test(L.title))) continue;
    if (range && r.num != null && (r.num < range[0] || r.num > range[1])) continue;
    const optional = /dirt|assessment|marking point|formative/i.test(r.title);
    out.push({ after, lesson: { num: r.num || 0, title: clean(r.title).replace(/\s+and\s*$/i, '').replace(/\s{2,}/g, ' ').trim(), folder: null, optional, guideRow: r, nofolder: true } });
  }
  return out;
}

function classSequence(cls, sol) {
  const r = ROUTES[cls];
  if (!r) return [];
  const out = [];
  if (r.ks5) {
    const year = YEAR_OF[r.ks5];
    // chapters sit in Module folders (Year 13/Module 5 - .../Chapter 19 - Stars, Patryk 2026-10-10)
    // or, before that move, straight under the year: both are found
    const yDir = `${DRIVE}/Year ${year}`;
    const chDirs = [];
    for (const d of (fs.existsSync(yDir) ? fs.readdirSync(yDir) : [])) {
      if (/^Chapter \d+/.test(d)) chDirs.push({ name: d, dir: `${yDir}/${d}` });
      else if (/^Module \d+/.test(d)) { try { fs.readdirSync(`${yDir}/${d}`).filter((c) => /^Chapter \d+/.test(c)).forEach((c) => chDirs.push({ name: c, dir: `${yDir}/${d}/${c}` })); } catch { /* unreadable */ } }
    }
    for (const ch of sol.keyStage5[r.ks5].teachingSequence) {
      const n = (ch.chapter.match(/Chapter (\d+)/) || [])[1];
      const hit = chDirs.find((d) => new RegExp(`^Chapter ${n}\\b`).test(d.name));
      const ls = hit ? listLessons(hit.dir) : [];
      const topic = hit ? hit.name : ch.chapter;
      const plan = (ch.sections || []).map((s, i) => ({ year, subject: 'Physics', topic, unit: topic, num: i + 1, ord: i + 1, title: s.replace(/^\d+\.\d+\s*/, ''), folder: null, source: 'plan' }));
      // a chapter only partly made on Drive (Chapter 20 with just Lesson 3 - Hubble's Law) keeps the
      // scheme's other sections in their places, so the planned lessons around it are not lost
      const drive = ls.map((l) => ({ year, subject: 'Physics', topic, unit: topic, ...l, source: 'drive' }));
      // (only a mostly-unmade chapter: Waves 1 has 8 Drive lessons for 9 sections because one covers two)
      const fill = ls.length && ls.length * 2 <= plan.length ?plan.filter((p) => !ls.some((l) => Math.floor(l.ord) === p.num)) : [];
      const noOrd = (l) => { if (l.source === 'plan') delete l.ord; return l; };
      if (ls.length) [...drive, ...fill].sort((a, b) => a.ord - b.ord).forEach((l) => out.push(noOrd(l)));
      else plan.forEach((l) => out.push(noOrd(l)));
    }
    return out;
  }
  const year = YEAR_OF[r.seq];
  let seq = sol.keyStage3and4[r.seq].teachingSequence.filter((t) => !r.subjects || r.subjects.includes(t.subject))
    .filter((t) => t.patrykTeaches !== false);
  if (r.first) {   // confirmed class order goes first, the rest keep scheme order
    const head = r.first.map((f) => seq.find((t) => t.driveTopicFolder === f)).filter(Boolean);
    seq = [...head, ...seq.filter((t) => !head.includes(t))];
  }
  const seen = new Set();
  seq.forEach((t, block) => {
    const dir = `${DRIVE}/Year ${year}/${t.subject === 'Science Skills' ? 'Science Skills' : t.subject}/${t.driveTopicFolder}`;
    const all = listLessons(dir);
    let ls = all;
    // "B1 Cells L1-7" then later "B1 Cells L8-16": only a topic taught in BLOCKS is cut by its range.
    // (A single block's range is just the pacing count and must not drop lessons: 10C2 lost
    // P1 L12 Renewables because the pacing sheet says "L1-11".)
    const range = String(t.pacingLabel || '').match(/L(\d+)\s*-\s*(\d+)/);
    const split = seq.filter((x) => x.driveTopicFolder === t.driveTopicFolder).length > 1;
    // A lesson outside EVERY block's range goes to the nearest block, never nowhere (9XS lost
    // B1 L17 Active Transport because the second block says "L8-16").
    if (range && split && ls.length) {
      const ranges = seq.filter((x) => x.driveTopicFolder === t.driveTopicFolder)
        .map((x) => (String(x.pacingLabel || '').match(/L(\d+)\s*-\s*(\d+)/) || []).slice(1).map(Number)).filter((x) => x.length === 2);
      const gap = (n, [a, b]) => (n < a ? a - n : n > b ? n - b : 0);
      const mine = [+range[1], +range[2]];
      ls = ls.filter((l) => gap(parseInt(l.num, 10), mine) === 0 || (!ranges.some((rg) => gap(parseInt(l.num, 10), rg) === 0) && ranges.every((rg) => gap(parseInt(l.num, 10), mine) <= gap(parseInt(l.num, 10), rg))));
    }
    // guide-only lessons slot in after the folder lesson they follow in the guide
    const extra = all.length ? guideOnly(dir, all, range && split ? [+range[1], +range[2]] : null) : [];
    const merged = [...extra.filter((e) => !e.after).map((e) => e.lesson)];
    for (const l of ls) { merged.push(l); extra.filter((e) => e.after === l).forEach((e) => merged.push(e.lesson)); }
    // a guide row that follows a lesson in the OTHER block of a split topic belongs to this block only by number
    for (const e of extra) if (e.after && !ls.includes(e.after) && !merged.includes(e.lesson)) {
      const k = merged.findIndex((x) => x.num > e.lesson.num);
      if (range && split) merged.splice(k < 0 ? merged.length : k, 0, e.lesson);
    }
    for (const l of merged) {
      const key = l.folder || `${dir}|${l.title}`;
      if (seen.has(key)) continue;
      if (SEPARATE_ONLY.test(l.title) && /combined/.test(r.seq)) continue;   // separate-only content, Combined class
      seen.add(key);
      out.push({ year, subject: t.subject, topic: t.driveTopicFolder, unit: `${t.driveTopicFolder}#${block}`, ...l, source: l.folder ? 'drive' : 'guide' });
    }
  });
  return out;
}

/* ------------------------------------------------------------------ equipment */
const guideCache = new Map();
// What always applies to a class, from class-defaults.json, so it goes with every request to Claude
// without Patryk typing it (2026-10-08). He can replace it in the planner's Classes view.
let CLASS_DEFAULTS = null;
function classProfile(cls) {
  if (CLASS_DEFAULTS === null) { try { CLASS_DEFAULTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'class-defaults.json'), 'utf8')); } catch { CLASS_DEFAULTS = {}; } }
  const c = (CLASS_DEFAULTS.classes || CLASS_DEFAULTS)[cls];
  if (!c) return '';
  const bits = [];
  if (c.course) bits.push(c.course);
  if (c.examBoard) bits.push(c.examBoard + (/OCR/.test(c.examBoard) ? ' only, never AQA questions' : ''));
  if (c.patrykTeaches) bits.push('I teach ' + c.patrykTeaches.join(', '));
  if (c.wordBank === true) bits.push('word bank on cloze tasks');
  else if (c.wordBank === false) bits.push('no word bank');
  return bits.join('; ');
}
// Does this topic have an end-of-topic test? (Patryk 2026-10-08: tests follow the scheme of learning.)
// Years 7-11 keep one folder per topic in Admin/Assessment/Year N/<Subject>/, named by topic code
// ("B1 Cells", "P4 Atomic Strucutre"), so the code decides. true = test folder found, false = none
// (revision only, and it goes on the "missing tests" list), null = can't tell (Year 12-13 tests
// span several chapters), so the planner keeps its usual revision + test.
const ASSESS = 'G:/My Drive/Beechen Cliff Science/Admin/Assessment';
const testDirs = {};
function testFolder(year, topic) {
  if (!year || year >= 12) return null;
  const code = (String(topic).match(/^([BCP]\d+)\b/i) || [])[1];
  if (!code) return false;
  const subj = { B: 'Biology', C: 'Chemistry', P: 'Physics' }[code[0].toUpperCase()];
  const dir = `${ASSESS}/Year ${year}/${subj}`;
  if (!(dir in testDirs)) { try { testDirs[dir] = fs.readdirSync(dir); } catch { testDirs[dir] = null; } }
  if (!testDirs[dir]) return null;                       // Drive not mounted: don't guess
  return testDirs[dir].some((f) => new RegExp('^' + code + '\\b', 'i').test(f.trim()));
}
// What is in a topic's Admin/Assessment folder (planner Assessment tab, 2026-10-19): the test, its mark
// scheme (missing = inside the test, which is normal) and the PLC. Read only. null = no folder found.
function assessFiles(year, topic) {
  if (!year || year >= 12) return null;
  const code = (String(topic).match(/^([BCP]\d+)\b/i) || [])[1];
  if (!code) return null;
  const subj = { B: 'Biology', C: 'Chemistry', P: 'Physics' }[code[0].toUpperCase()];
  const dir = `${ASSESS}/Year ${year}/${subj}`;
  if (!(dir in testDirs)) { try { testDirs[dir] = fs.readdirSync(dir); } catch { testDirs[dir] = null; } }
  const sub = (testDirs[dir] || []).find((f) => new RegExp('^' + code + '\\b', 'i').test(f.trim()));
  if (!sub) return null;
  let files = [];
  try { files = fs.readdirSync(`${dir}/${sub}`).filter((f) => /\.(pdf|docx?)$/i.test(f)); } catch { return null; }
  const ms = files.filter((f) => /\bMS\b|mark ?scheme/i.test(f)), plc = files.filter((f) => /\bPLC\b/i.test(f));
  const test = files.filter((f) => !ms.includes(f) && !plc.includes(f) && !/feedback|lesson/i.test(f));
  return { rel: `Admin/Assessment/Year ${year}/${subj}/${sub}`, test: test.length, ms: ms.length, plc: plc.length,
    higher: test.some((f) => /higher/i.test(f)), foundation: test.some((f) => /foundation/i.test(f)) };
}
function techGuide(topicDir) {
  if (guideCache.has(topicDir)) return guideCache.get(topicDir);
  let rows = [];
  try {
    const f = fs.readdirSync(topicDir).find((n) => /\.xlsx$/i.test(n) && /tech\w*\s*guide/i.test(n));
    if (f) {
      const x = xu.loadXlsx(path.join(topicDir, f));
      const sheet = x.sheets[0];
      const raw = xu.parseRows(x.zip.readAsText(sheet.file), x.ss);
      const keys = Object.keys(raw).map(Number).sort((a, b) => a - b);
      // KS4 guides have a Title column; KS3 guides put number and title in one "Lesson" cell
      // ("Lesson 7 meteors and meteorites", "1 Saftey in the lab", "L5 Formative review").
      const head = keys.map((k) => raw[k]).find((r) => Object.values(r).some((v) => /^title$/i.test(String(v).trim())))
        || keys.map((k) => raw[k]).find((r) => /^(lesson|number|lesson number)$/i.test(String(r.A || '').trim()) && Object.values(r).some((v) => /^LO$/i.test(String(v).trim())));
      if (head) {
        const col = (re) => Object.keys(head).find((c) => re.test(String(head[c])));
        const cN = col(/lesson|number/i), cT = col(/^title/i) || cN, cR = col(/resources|tech/i), cW = col(/worksheet/i), cO = col(/overview|^\s*LO\s*$/i);
        const titleOf = (r) => String(r[cT]).replace(cT === cN ? /^\s*(lesson\s*|l)?\d+(\.\d+)?\s*/i : /^$/, '').trim();
        rows = keys.map((k) => raw[k]).filter((r) => r !== head && r[cT] && titleOf(r)).map((r) => ({
          // "1.0", "Lesson 4 ", "L05" all give the number
          num: parseFloat((String(r[cN] || '').match(/\d+(\.\d+)?/) || [])[0]) || null, title: titleOf(r),
          lo: String(r[cO] || '').replace(/\s+/g, ' ').trim().slice(0, 300),
          equipment: String(r[cR] || '').replace(/\s*\r?\n\s*/g, ', ').replace(/\s{2,}/g, ' ').trim(),
          printing: String(r[cW] || '').replace(/\s*\r?\n\s*/g, ', ').replace(/\s{2,}/g, ' ').trim(),
        }));
      }
    }
  } catch { rows = []; }
  guideCache.set(topicDir, rows);
  return rows;
}

let _key = null;
function equipmentKey() {
  if (_key) return _key;
  _key = [];
  const md = fs.existsSync(EQUIP_KEY) ? fs.readFileSync(EQUIP_KEY, 'utf8') : '';
  for (const block of md.split(/\n## /).slice(1)) {
    const name = block.split('\n')[0].trim();
    const eq = (block.match(/- Equipment: (.*)/) || [])[1];
    const sets = (block.match(/- Sets: (\w+)/) || [])[1];
    // past orders that were not equipment (cover lessons, tests already printed) teach nothing
    if (eq && !/cover|already printed|^n\/?a\b|^see teacher/i.test(eq)) _key.push({ name, equipment: eq.trim(), sets });
  }
  return _key;
}
const learned = () => { try { return JSON.parse(fs.readFileSync(LEARNED, 'utf8')); } catch { return {}; } };

// Sets (Patryk 2026-10-07: "I most often make student work in threes, then pairs, then demos"):
// only for real practical kit; a demo on its own is a demo; heating or acid work in pairs; else threes.
const KIT = /\b(beakers?|test ?tubes?|boiling tubes?|flasks?|bunsen|thermometers?|balances?|scales|power (supply|pack)s?|ammeters?|voltmeters?|wires?|magnets?|microscopes?|slides?|springs?|masses|rulers?|stop ?watch(es)?|timers?|light gates?|trolle(y|ys)|ramps?|cylinders?|pipettes?|solutions?|stands?|clamps?|lamps?|lens(es)?|prisms?|ray box(es)?|tiles?|forceps|scalpels?|dissect\w*|filter|funnels?|kettles?|water ?bath|crucibles?|tongs|spatulas?|petri|agar|onion|iodine|benedict\w*|biuret|tripods?|gauzes?|circuits?|bulbs?|resistors?|batter(y|ies)|kits?|samples?|joulemeter|heater|compass(es)?|newton ?meters?|weights?|bungs?|clamp stands?|eggs?)\b/i;
function setsFor(text) {
  if (!text || /^n\/?a$/i.test(text)) return null;
  const demoOnly = /\bdemo/i.test(text) && !/\b(prac|practical|class|circus|students?)\b/i.test(text);
  if (demoOnly) return 'demo';
  if (!KIT.test(text)) return null;                       // worksheets, laminates, videos: no sets
  if (/\b(bunsen|tripod|gauze|acid|alkali|corrosive|boiling|flame)\b/i.test(text)) return 'pairs';
  return 'threes';
}
// The technicians' guide text, cut down to the kit: items only, no risk notes, CLEAPSS references or
// instructions to the technician, at most 8 items (Patryk 2026-10-07: "the suggestions are long winded").
const NOT_KIT = /\b(cleapss|can also be|template in (the )?folder|this lesson|risk assessment|hazcard|read and practi[cs]e|please|this might|as per|in the event|to be given|full risk|sra\d+|pp\d+|eye protection|goggles|lab coats?)\b/i;
// Headings, counts and paperwork that are not kit ("Per pair or group of students:", "Topic Overview").
const NOT_KIT_ITEM = /^(none|n\/?a|per (pair|group|student)|additionally|x\s*\d+ sets|class set of\s*$)|topic overview|\btest for\b|third edition|textbooks?\b|\bbooks?\b.*\bset\b|worksheets?\b|^(teacher demo|do by|wear\b|see folder|prac\s*\d*$|\[)|tech requests|each group will need|\bbooks$/i;
// Patryk 2026-10-07: every bench already has these, so they are never ordered or listed.
const STANDARD_KIT = /^(and\s+)?((retort |clamp )?stands?|clamps?( (and|&) stands?)?|clamp stands?|stand and boss|boss(es)?( and clamps?)?|tripods?|heat(proof|[- ]resistant)? ?ma(t|ts)?|bunsen( burners?)?|test ?tube racks?|tripod(,| and) gauze( and bunsen)?|tripod and gauze and bunsen)$/i;
// Say it the way a person would: "conical flask", not "Flat bottom conical flasks (250 ml)".
const TYPO = { thermomter: 'thermometer', termometer: 'thermometer', conducitivity: 'conductivity', seperate: 'separate', perplex: 'Perspex', babs: 'babies', meter: 'metre' };
function tidyItem(x) {
  const raw = String(x);
  let s = raw
    .replace(/\s*additionally to this list you will need\s*/i, ' ')
    .replace(/^(prac(tical)?|demo(nstration)?s?)\s*\d*\s*[:–-]\s*/i, '')
    .replace(/^[A-Z]\)\s*/, '')
    .replace(/\b(round|flat)[- ]bottom(ed)?\s+/gi, '')
    .replace(/\s*\(([^)]*)\)/g, (m, inner) => (/\d\s*(cm3|cm³|ml|dm3|g|kg|mm|cm)\b/i.test(inner) && !/-|–/.test(inner) ? ` (${inner})` : ''))
    .replace(/\b(\w+)\b/g, (w) => {
      const t = TYPO[w.toLowerCase()];
      if (!t) return w;
      if (w.toLowerCase() === 'meter' && /newton|multi|volt|amm|lux|joule|energy|0-|n meter/i.test(raw)) return w;   // newton meter stays
      return t;
    })
    .replace(/\bcm3\b/g, 'cm³').replace(/\s*-\s*$/, '').replace(/\s+/g, ' ').trim();
  // a short heading before a colon is not kit ("Stretching springs prac: masses" -> "masses")
  s = s.replace(/^[^:]{0,32}:\s*/, '').replace(/^(prac(tical)?|demo(nstration)?)\s*[–-]\s*/i, '');
  // lower case, except names and acronyms (OHP, RGB, A4, HCl, Virkon, Perspex)
  s = s.replace(/\b([A-Z])([a-z]+)\b/g, (w, a, b) => (/^(Perspex|Benedict|Bunsen|Virkon|Vaseline|Newton|Sharp|Activate|Kerboodle|Weetabix)/.test(w) ? w : a.toLowerCase() + b));
  return s;
}
function conciseEquipment(text, opts) {
  if (!text || /^n\/?a$/i.test(text)) return text;
  const keepStandard = opts && opts.keepStandard;
  const items = String(text).split(/\s*(?:[,;•\n]|\.\s+(?=[A-Z])|\s\/\s)\s*/)
    .map((x) => tidyItem(x.replace(/^(demo(nstration)?\s*\d*\s*[:–-]|prac(tical)?\s*[:–-]|pink gcse physics required practical)\s*/i, '').replace(/[.:\s]+$/, '').trim()))
    .filter((x) => x && x.length > 1 && !NOT_KIT.test(x) && !NOT_KIT_ITEM.test(x) && x.split(/\s+/).length <= 9)
    .filter((x) => keepStandard || !STANDARD_KIT.test(x));
  const seen = new Set();
  const uniq = items.filter((x) => { const k = x.toLowerCase().replace(/(es|s)$/, ''); if (seen.has(k)) return false; seen.add(k); return true; });
  const out = uniq.slice(0, 8).join(', ') + (uniq.length > 8 ? ' …' : '');
  return out ? out[0].toUpperCase() + out.slice(1) : '';
}

// Patryk 2026-10-04: never recommend ICT. Technician guides say things like "Chrome or ICT
// reccommended" or "Chromebooks or IT room"; those items are dropped from the equipment text.
const NO_ICT = /\b(ict|chrome ?books?|chrome|it room|computer room|laptops?|ipads?|tablets?)\b/i;
function stripICT(text) {
  if (!text) return text;
  const kept = String(text).split(/\s*,\s*/).filter((part) => !NO_ICT.test(part));
  return kept.join(', ').trim() || 'N/A';
}
// What the lesson is about, from its technician-guide row ("Labelling plant and animal cells..."):
// lets the homework match test checklist statements to lessons by content, not just title.
function loFor(L) {
  if (L.guideRow) return L.guideRow.lo || '';
  if (!L.folder) return '';
  let best = null, bs = 0;
  for (const r of techGuide(path.dirname(L.folder))) { const sc = sim(r.title, L.title); if (sc > bs) { bs = sc; best = r; } }
  return best && bs >= 0.5 ? best.lo || '' : '';
}
// The guide's Worksheet column, tidied for the order sheet (Patryk 2026-10-08: "pink gcse physics"
// kept appearing). Drops the pink-booklet prefix, splits run-on lists ("P6 L8 WS … P6 L8 WS2 …"),
// and removes empty and repeated items. The words of each item are kept as the guide wrote them.
function tidyPrint(text) {
  if (!text || /^n\/?a$/i.test(text)) return text;
  const s = String(text)
    .replace(/\bpink\s+gcse\s+(physics\s+)?(req(uired)?\.?\s*prac(tical)?)\s*[-:–]?\s*/gi, '')
    .replace(/\s+(?=[BCP]\d+\s+L\d+\s)/g, ', ')                    // "… P6 L8 WS2" -> ", P6 L8 WS2"
    .replace(/\)(?=[BCP]\d+\s+L\d)/g, '), ')                          // "(F)P6 L3" -> "(F), P6 L3"
    .replace(/(?<![BCP]\d{1,2})\s+(?=L\d+\s+(WS|Exam)\b)/g, ', ');
  const seen = new Set();
  return s.split(/\s*[,;]\s*/).map((x) => x.replace(/[.\s]+$/, '').trim())
    .filter((x) => x && !/^n\/?a$/i.test(x) && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())).join(', ');
}
function equipmentFor(lesson) {
  const e = equipmentFor0(lesson);
  const printing = e.printing ? tidyPrint(stripICT(e.printing)) : e.printing;
  const full = stripICT(e.equipment);
  const eq = e.source === 'remembered' ? full : conciseEquipment(full);
  // sets are judged on the kit INCLUDING bench kit (a Bunsen practical is still a pairs practical)
  return { ...e, equipment: eq, full: eq !== full ? full : '', sets: e.source === 'remembered' ? e.sets : setsFor(conciseEquipment(full, { keepStandard: true })),
    printing: printing === 'N/A' || /^n\/?a$/i.test(printing || '') ? '' : printing };
}
function equipmentFor0(lesson) {
  const key = lesson.folder || `${lesson.topic}/${lesson.title}`;
  const mem = learned()[key];
  if (mem) return { ...mem, source: 'remembered' };
  if (lesson.guideRow) {                       // no folder: the guide row it came from
    const g = lesson.guideRow;
    return g.equipment && !/^n\/?a$/i.test(g.equipment) ? { equipment: g.equipment, sets: setsFor(g.equipment), printing: g.printing, source: 'technician guide' } : { equipment: 'N/A', sets: null, printing: g.printing, source: 'technician guide' };
  }
  if (lesson.folder) {
    const rows = techGuide(path.dirname(lesson.folder));
    let best = null, bs = 0;
    for (const r of rows) { const s = sim(r.title, lesson.title); if (s > bs) { bs = s; best = r; } }
    if (!best || bs < 0.5) best = rows.find((r) => r.num === lesson.num) || (bs >= 0.34 ? best : null);
    if (best && best.equipment && !/^n\/?a$/i.test(best.equipment)) {
      return { equipment: best.equipment, sets: setsFor(best.equipment), printing: best.printing, source: 'technician guide' };
    }
    if (best) return { equipment: 'N/A', sets: null, printing: best.printing, source: 'technician guide' };
  }
  let kb = null, ks = 0;
  for (const k of equipmentKey()) { const s = sim(k.name, lesson.title); if (s > ks) { ks = s; kb = k; } }
  if (kb && ks >= 0.6) return { equipment: kb.equipment, sets: kb.sets || setsFor(kb.equipment), source: 'past order' };
  return { equipment: '', sets: null, source: 'none' };              // nothing known: leave it empty, never filler
}

/* ---------------------------------------------------------- Planner history */
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11, january: 0, february: 1, march: 2, april: 3, august: 7, september: 8, october: 9, november: 10, december: 11 };
// Every filled 2026-27 sheet, oldest first: [{monday, week, rows}]
function plannerSheets() {
  const x = xu.loadXlsx(PLANNER);
  const out = [];
  let started = false;
  for (const s of x.sheets) {
    const m = s.name.match(/Week\s*([AB])?\s*-\s*([A-Za-z]+)\s+(\d+)/);
    if (!m || MONTHS[m[2].toLowerCase()] == null) continue;
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon === 8 && !started && +m[3] <= 14) started = true;       // first sheet of September = new year
    if (!started) continue;
    const year = mon >= 8 ? 2026 : 2027;
    out.push({ name: s.name, monday: new Date(year, mon, +m[3]), week: m[1] || null, rows: xu.parseRows(x.zip.readAsText(s.file), x.ss) });
  }
  // keep only the run of 2026-27 sheets (they come after the July 2026 ones in tab order)
  return out.filter((s) => s.monday >= new Date(2026, 8, 1));
}

// Every slot of a sheet: [{day, period, col, cls, lesson, date}]
function sheetSlots(sheet) {
  const nf = xu.isNewFormat(sheet.rows);
  const starts = nf ? [4, 9, 14, 19, 24] : [4, 8, 12, 16, 20];
  const out = [];
  starts.forEach((r0, di) => {
    const cr = sheet.rows[r0 + (nf ? 1 : 0)] || {}, lr = sheet.rows[r0 + (nf ? 2 : 1)] || {};
    xu.LESSON_COLS.forEach((lc, pi) => {
      const raw = String(cr[xu.CLASS_COLS[lc]] || '').trim();
      const cls = school.normClass(raw);
      const date = new Date(sheet.monday); date.setDate(date.getDate() + di);
      out.push({ day: di, period: pi + 1, col: lc, rawClass: raw, cls, lesson: String(lr[lc] || '').trim(), date });
    });
  });
  return out;
}

/* ------------------------------------------------------------- progress + plan */
const isTest = (t) => /\b(assessment|test)\b/i.test(t) && !/\breview\b/i.test(t);
const isRevision = (t) => /\brevision\b/i.test(t);
const skip = (t) => !t || /^n\/?a$/i.test(t) || /ignite|inset|trip|pshe|baseline/i.test(t);

/* Progress model (Patryk 2026-10-04):
   - NEVER go back a topic. Once a class has a lesson in a later topic, every earlier topic is
     finished (its missed lessons are reported, never planned).
   - Within the CURRENT topic, every lesson gets taught: missed ones are planned first, in order,
     before moving on.
   - A revision lesson ends the topic's teaching; the end-of-topic test is still to come. A test
     ends the topic completely.
   - Matching his Planner.xlsx entries: the current topic is preferred; jumping to a later topic
     needs a clearly better match; an entry can tick off two lessons when it covers both
     ("Frequency, Time Period and the Wave Equation" = L2 + L3); a repeat of a taught lesson is
     just a repeat. */
const MATCH = 0.45;           // enough to accept a lesson in the topic he is on
const JUMP = 0.6;             // needed to move into a later topic
function progress(seq, history) {
  const taught = new Set(), closed = new Set(), tested = new Set(), revised = new Set();
  const order = [...new Set(seq.map((x) => x.unit))];
  let unit = seq.length ? seq[0].unit : null, uncertain = false, last = -1;
  const log = [];
  const when = {};                                  // lesson -> { date, wrote } (first time taught)
  const stamp = (j, h, t) => { if (!when[j]) when[j] = { date: iso(h.date), wrote: t }; };
  const moveTo = (u) => {                          // entering a later topic closes all earlier ones
    const ui = order.indexOf(u);
    order.slice(0, ui).forEach((x) => closed.add(x));
    unit = u;
  };
  for (const h of history) {
    const t = h.lesson.replace(/^\s*cover\s*:\s*/i, '');
    if (skip(t)) continue;
    if (isTest(t) || isRevision(t)) {
      // "Particles Test" ends P3 Particles even if the class has already started the next topic;
      // a test or revision that names no topic ends the current one.
      const named = t.replace(/\b(test|assessment|revision|review|end of topic|cover)\b/ig, ' ');
      let target = unit, ts = 0;
      for (const u of order) {
        const sc = sim(named, String(u).replace(/#\d+$/, '').replace(/^[BCP]\d+\s+/, ''));
        if (sc > ts && sc >= 0.4) { ts = sc; target = u; }
      }
      if (!target) continue;
      if (isTest(t) && !isRevision(t)) { closed.add(target); tested.add(target); log.push(`${t} -> ${target} tested`); }
      else { closed.add(target); revised.add(target); log.push(`${t} -> ${target} revised (test still to come)`); }
      continue;
    }
    const ui = order.indexOf(unit);
    const nextUnit = order.slice(ui + 1).find((u) => !closed.has(u));
    // "Photosythesis + Video Demo": score each joined part on its own and keep the best.
    const parts = [t, ...t.split(/\s*\+\s*/).filter((x) => x && x !== t)];
    const scored = seq.map((L, j) => ({ j, sc: Math.max(...parts.map((x) => sim(x, L.title))), unit: L.unit }));
    const unitDone = closed.has(unit);              // revised/tested: he has moved on, expect the next topic
    // Best in a set of candidates: an UNTAUGHT lesson wins over a near-equal taught one
    // ("Anerobic" next to an already-taught "Aerobic"), otherwise it's a repeat.
    const bestOf = (cands, min) => {
      const ok = cands.filter((o) => o.sc >= min).sort((a, b) => b.sc - a.sc);
      if (!ok.length) return null;
      const fresh = ok.find((o) => !taught.has(o.j) && o.sc >= ok[0].sc - 0.12);
      return fresh || ok[0];
    };
    const bi = bestOf(scored.filter((o) => o.unit === unit), unitDone ? 0.85 : MATCH);
    const bn = nextUnit ? bestOf(scored.filter((o) => o.unit === nextUnit), unitDone ? MATCH : JUMP) : null;
    const farC = scored.filter((o) => order.indexOf(o.unit) > ui + 1 && !closed.has(o.unit));
    const far = bestOf(farC, 0.85);
    let pick = null;
    if (bi && (!bn || bn.sc < bi.sc + 0.2)) pick = bi;
    else if (bn) pick = bn;
    // a near-exact match far ahead beats a weak one here ("Periodic Table" is not "Results Tables")
    // ...but only when what's here is a weak match (9AS "Changes of State Practical" is P3's
    // "Changing States", not Chemistry's "Changes of State").
    if (far && !taught.has(far.j) && (!pick || (pick.sc < 0.6 && far.sc >= pick.sc + 0.3))) pick = null;
    if (!pick) {
      // Far ahead in the scheme (7MLA did "Elements" and "Periodic Table" in week 2): ticked off so it
      // is never repeated later, but the class is NOT moved there and nothing before it is closed.
      if (far && !taught.has(far.j)) { taught.add(far.j); stamp(far.j, h, t); log.push(`${t} -> taught early: ${seq[far.j].topic} L${seq[far.j].num} ${seq[far.j].title}`); continue; }
      uncertain = true; log.push(`${t} -> ? (no match)`); continue;
    }
    const L = seq[pick.j];
    if (L.unit !== unit) moveTo(L.unit);
    if (taught.has(pick.j)) { log.push(`${t} -> repeat of L${L.num} ${L.title}`); continue; }
    // One entry can cover TWO lessons only when he joined them ("A + B", "A and B", "A, B") and
    // every word of the second lesson's title is in what he wrote (practical vs theory must agree).
    const covered = [pick];
    if (/\+|,|\band\b/i.test(t)) {
      const kind = (s) => (/theory/i.test(s) ? 'theory' : /practical|\brp\b/i.test(s) ? 'practical' : '');
      const second = scored.filter((o) => o.unit === L.unit && o.j !== pick.j && !taught.has(o.j))
        .filter((o) => { const B = toks(seq[o.j].title); const A = toks(t); return B.length && B.every((b) => A.some((a) => same(a, b) >= 0.85)); })
        .filter((o) => !kind(seq[o.j].title) || !kind(t) || kind(seq[o.j].title) === kind(t))
        .sort((a, b) => b.sc - a.sc)[0];
      if (second) covered.push(second);
    }
    covered.forEach((o) => { taught.add(o.j); stamp(o.j, h, t); });
    last = Math.max(...covered.map((o) => o.j));
    uncertain = false;
    log.push(`${t} -> ${L.topic} ` + covered.map((o) => `L${seq[o.j].num} ${seq[o.j].title}`).join(' + '));
  }
  return { taught, closed, tested, revised, unit, last, uncertain, log, when };
}

// The next lesson: the FIRST untaught lesson of the current topic (so missed lessons are filled in);
// when the topic is all taught, its end-of-topic test (unless already tested, or the topic carries
// on in a later block); then the first untaught lesson of the next topic. Never an earlier topic.
function nextLesson(seq, st) {
  const order = [...new Set(seq.map((x) => x.unit))];
  const ui = Math.max(0, order.indexOf(st.unit));
  if (st.unit && !st.closed.has(st.unit)) {
    const j = seq.findIndex((x, k) => x.unit === st.unit && !x.optional && !st.taught.has(k));
    if (j >= 0) return j;
    st.closed.add(st.unit);
  }
  if (st.unit && !st.tested.has(st.unit)) {
    const cur = seq.find((x) => x.unit === st.unit);
    const resumes = cur && seq.some((x) => x.topic === cur.topic && order.indexOf(x.unit) > ui);
    if (!resumes) return { test: st.unit, revised: st.revised && st.revised.has(st.unit) };
  }
  for (let k = ui + 1; k < order.length; k++) {
    const u = order[k];
    if (st.closed.has(u)) continue;
    const j = seq.findIndex((x, m) => x.unit === u && !x.optional && !st.taught.has(m));
    if (j >= 0) return j;
  }
  return -1;
}

// What each class has done and not done (for the planner's Classes view and the weekly report).
function report(seq, st) {
  const out = [];
  for (const u of [...new Set(seq.map((x) => x.unit))]) {
    const ls = seq.map((x, j) => ({ ...x, j })).filter((x) => x.unit === u);
    const done = ls.filter((x) => st.taught.has(x.j)), missed = ls.filter((x) => !st.taught.has(x.j) && !x.optional);
    const state = u === st.unit ? 'current' : st.closed.has(u) || st.tested.has(u) ? 'finished' : done.length ? 'started' : 'to come';
    out.push({ unit: u, topic: ls[0].topic, state, tested: st.tested.has(u), revised: !!(st.revised && st.revised.has(u)),
      done: done.map((x) => `L${x.num} ${x.title}`), missed: missed.map((x) => `L${x.num} ${x.title}`) });
  }
  return out;
}

function loadAll() {
  const sol = JSON.parse(fs.readFileSync(SOL, 'utf8'));
  const seqs = {};
  for (const cls of Object.keys(ROUTES)) seqs[cls] = classSequence(cls, sol);
  return { sol, seqs, sheets: plannerSheets() };
}

// Plan the week starting `monday`, using only sheets before it.
function planWeek(monday, ctx) {
  const { seqs, sheets } = ctx || loadAll();
  const before = sheets.filter((s) => s.monday < monday);
  const history = {};
  for (const s of before) for (const sl of sheetSlots(s)) if (sl.cls) (history[sl.cls] = history[sl.cls] || []).push(sl);
  const letter = school.weekLetter(monday);
  const tt = [...before].reverse().find((s) => s.week === letter) || before[before.length - 1];
  if (!tt) throw new Error('no filled 2026-27 sheet before that week to copy the timetable from');
  const state = {};
  for (const cls of Object.keys(ROUTES)) {
    const p = progress(seqs[cls], history[cls] || []);
    state[cls] = p;
  }
  const slots = [];
  for (const sl of sheetSlots({ ...tt, monday })) {
    const out = { ...sl, plan: null };
    if (!sl.rawClass) continue;
    if (!isTeachingDay(sl.date)) { out.plan = { text: INSET.has(iso(sl.date)) ? 'INSET day' : 'Holiday', equipment: 'N/A' }; slots.push(out); continue; }
    if (!sl.cls || !ROUTES[sl.cls]) { out.plan = { text: 'N/A', equipment: 'N/A' }; slots.push(out); continue; }
    const st = state[sl.cls], seq = seqs[sl.cls];
    const prevUnit = st.unit;
    const j = nextLesson(seq, st);
    if (j && j.test) {
      st.tested.add(j.test);
      const topic = (seq.find((x) => x.unit === j.test) || {}).topic || j.test;
      out.plan = { text: `${topic} — ${j.revised ? 'end-of-topic TEST (revision done)' : 'revision or end-of-topic test'}`, equipment: `Test papers: Admin/Assessment (${topic}) — count core/challenge`, check: true, test: true };
      slots.push(out);
      continue;
    }
    const L = j >= 0 ? seq[j] : null;
    if (!L) out.plan = { text: 'End of planned lessons', equipment: '', check: true };
    else {
      st.taught.add(j); st.last = j;
      const newTopic = prevUnit && L.unit !== prevUnit;
      st.unit = L.unit;
      const e = equipmentFor(L);
      out.plan = {
        text: `${L.topic} — Lesson ${L.num} - ${L.title}`, lesson: L, equipment: e.equipment, sets: e.sets,
        printing: e.printing, equipSource: e.source,
        check: st.uncertain || e.source === 'guess' || L.source === 'plan',
        note: newTopic ? `new topic: ${L.topic} (end-of-topic test for the previous topic first?)` : '',
      };
    }
    slots.push(out);
  }
  return { monday, letter, timetableFrom: tt.name, slots, state };
}

module.exports = { planWeek, loadAll, classSequence, progress, nextLesson, report, stripICT, sim, toks, same, sheetSlots, plannerSheets, equipmentFor, isTeachingDay, ROUTES };

/* ------------------------------------------------------------------------ CLI */
if (require.main === module) {
  const a = process.argv.slice(2);
  const val = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : null; };
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const ctx = loadAll();
  if (val('export')) {
    // Data file for the planner web app (planner/): everything it needs, nothing it must fetch.
    const tb = require('./textbook-index.js');
    const SIZES = { '7MLA': 34, '8XP': 33, '8AG': 29, '9AS': 32, '9XS': 32, '10C2': 28, '10S2': 30, '11S2': 29, '12C': 28, '13D': 18, 'PSHE-9AB': 27 };
    const classes = {};
    for (const [cls, seq] of Object.entries(ctx.seqs)) {
      classes[cls] = {
        year: seq[0] ? seq[0].year : null, size: SIZES[cls] || null, profile: classProfile(cls),
        seq: seq.map((L) => {
          const e = equipmentFor(L);
          let book = '';
          try { book = tb.formatRef(tb.matchLesson({ year: L.year, subject: L.subject, topic: L.title })) || ''; } catch { book = ''; }
          let built = null;
          if (L.folder) { try { built = fs.readdirSync(L.folder).some((f) => /\.pptx$/i.test(f)); } catch { built = false; } }
          return { topic: L.topic, unit: L.unit, num: L.num, title: L.title, hasTest: testFolder(L.year, L.topic, L.folder), eq: e.equipment, sets: e.sets || null,
            print: e.printing || '', eqFull: e.full || '', eqSrc: e.source, book, built, planned: L.source === 'plan', lo: loFor(L),
            optional: !!L.optional, nofolder: L.source === 'guide',
            rel: L.folder ? path.relative(DRIVE, L.folder).split(path.sep).join('/') : null };
        }),
      };
    }
    // Week A and Week B timetables from his most recent filled sheet of each letter
    const timetable = {};
    for (const letter of ['A', 'B']) {
      const sh = [...ctx.sheets].reverse().find((s) => school.weekLetter(s.monday) === letter);
      timetable[letter] = sh ? sheetSlots(sh).filter((s) => s.rawClass).map((s) => ({ day: s.day, period: s.period, col: s.col, cls: s.cls || s.rawClass })) : [];
    }
    // progress up to the newest filled sheet
    const history = {};
    for (const s of ctx.sheets) for (const sl of sheetSlots(s)) if (sl.cls) (history[sl.cls] = history[sl.cls] || []).push(sl);
    const progressOut = {};
    for (const cls of Object.keys(ROUTES)) {
      const p = progress(ctx.seqs[cls], history[cls] || []);
      progressOut[cls] = { taught: [...p.taught], last: p.last, unit: p.unit, closed: [...p.closed], tested: [...p.tested], revised: [...p.revised], when: p.when };
    }
    // Real clock times: Years 7-9 use the KS3 bells, Years 10-13 the KS4/5 bells (P2/P4 differ).
    let periods = {};
    try { periods = JSON.parse(fs.readFileSync(path.join(ROOT, 'classes-2026-27.json'), 'utf8')).periodStructure || {}; } catch { periods = {}; }
    const COLOURS = ['#1565C0', '#2E7D32', '#6A1B9A', '#C62828', '#EF6C00', '#00838F', '#AD1457', '#4E342E', '#283593', '#558B2F', '#5D4037'];
    Object.keys(classes).forEach((c, k) => { classes[c].colour = COLOURS[k % COLOURS.length]; });
    // Learning loop M2 (2026-10-22): each lesson built at home carries its MCQs (question, options,
    // right letter, the mistake each wrong option catches), so the phone voter knows them. Matched by
    // the Drive folder the lesson was uploaded to (<name>.path.txt beside its lesson-content.json).
    const mcqsByRel = lessonMcqs();
    Object.values(classes).forEach((c) => (c.seq || []).forEach((L) => { if (L.rel && mcqsByRel[L.rel]) L.mcq = mcqsByRel[L.rel]; }));
    // the school's test papers per topic (Assessment tab: paper / mark scheme / PLC found)
    for (const [cls, c] of Object.entries(classes)) {
      const a = {};
      for (const L of c.seq) if (!(L.topic in a)) a[L.topic] = assessFiles(c.year, L.topic);
      c.assess = Object.fromEntries(Object.entries(a).filter(([, v]) => v));
    }
    // the exam library's 6-mark questions (Assessment tab test builder: see and choose the 6-markers)
    let long6 = [];
    try { long6 = require('./test-paper.js').longList(); } catch (e) { console.log('  (6-mark list not made: ' + e.message + ')'); }
    const out = {
      periodTimes: { ks3: periods.KS3_and_Y9 || {}, ks4: periods.KS4_and_KS5 || {} },
      generated: new Date().toISOString(), weekAStart: school.WEEK_A_START, terms: TERMS, inset: [...INSET],
      filledWeeks: ctx.sheets.map((s) => iso(s.monday)), classes, timetable, progress: progressOut, long6,
      // What he actually wrote in each filled Planner.xlsx week, so the app SHOWS those weeks as
      // taught instead of re-planning them.
      filled: Object.fromEntries(ctx.sheets.map((s) => [iso(s.monday), sheetSlots(s).filter((x) => x.rawClass)
        .map((x) => ({ day: x.day, period: x.period, col: x.col, cls: x.cls || x.rawClass, text: x.lesson }))])),
    };
    fs.writeFileSync(val('export'), JSON.stringify(out));
    console.log(`planner data written: ${val('export')} (${Math.round(fs.statSync(val('export')).size / 1024)} KB, ${Object.keys(classes).length} classes, filled weeks to ${out.filledWeeks.slice(-1)[0]})`);
  } else if (val('catalogue')) {
    fs.writeFileSync(val('catalogue'), JSON.stringify(ctx.seqs, null, 1));
    console.log('catalogue written:', Object.entries(ctx.seqs).map(([c, s]) => `${c} ${s.length}`).join(', '));
  } else if (val('backtest')) {
    const mon = parse(val('backtest'));
    const plan = planWeek(mon, ctx);
    const real = ctx.sheets.find((s) => +s.monday === +mon);
    if (!real) { console.error('no filled sheet for that week'); process.exit(1); }
    const actual = sheetSlots(real);
    let right = 0, n = 0;
    for (const p of plan.slots) {
      if (!p.cls || !p.plan || (!p.plan.lesson && !p.plan.test)) continue;
      const act = actual.find((x) => x.day === p.day && x.col === p.col);
      if (!act || skip(act.lesson.replace(/^\s*cover\s*:\s*/i, ''))) continue;
      n++;
      const ok = p.plan.test ? (isTest(act.lesson) || isRevision(act.lesson)) : sim(act.lesson, p.plan.lesson.title) >= 0.5;
      if (ok) right++;
      console.log(`${ok ? 'OK  ' : 'MISS'} ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][p.day]} P${p.period} ${p.cls.padEnd(5)} planned: ${(p.plan.test ? 'END-OF-TOPIC TEST/REVISION' : p.plan.lesson.title).slice(0, 40).padEnd(40)} taught: ${act.lesson.slice(0, 40)}`);
    }
    console.log(`\n${right}/${n} slots matched what was actually taught.`);
  } else {
    const mon = parse(val('week') || iso(new Date()));
    const plan = planWeek(mon, ctx);
    console.log(`Week ${plan.letter} from ${iso(mon)} (timetable copied from "${plan.timetableFrom}")\n`);
    for (const p of plan.slots) {
      const pl = p.plan;
      console.log(`${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][p.day]} P${p.period} ${String(p.cls || p.rawClass).padEnd(9)} ${pl.text}${pl.check ? '  [CHECK]' : ''}${pl.double ? '  (double)' : ''}`);
      if (pl.lesson) console.log(`            equipment (${pl.equipSource}): ${String(pl.equipment).slice(0, 110)}${pl.sets ? ' [' + pl.sets + ']' : ''}`);
      if (pl.note) console.log(`            ${pl.note}`);
    }
  }
}

// Learning loop M2: { "Year 9/Chemistry/C1 Atomic Structure/Lesson 1 - ...": [{ q, o: [A..D], a, why }] }
function lessonMcqs() {
  const out = {};
  const strip = (s) => String(s == null ? '' : s).replace(/\{\/?k\}/g, '').replace(/^[A-D][.):]\s*/, '').trim();
  for (const d of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const dir = path.join(ROOT, d.name);
    let files; try { files = fs.readdirSync(dir); } catch (_) { continue; }
    const pathTxt = files.find((f) => f.endsWith('.path.txt'));
    if (!pathTxt || !files.includes('lesson-content.json')) continue;
    const drive = fs.readFileSync(path.join(dir, pathTxt), 'utf8').trim();
    const m = /[\\/]Lessons[\\/](.+)$/.exec(drive);
    if (!m) continue;
    let L; try { L = JSON.parse(fs.readFileSync(path.join(dir, 'lesson-content.json'), 'utf8')); } catch (_) { continue; }
    L = Array.isArray(L) ? L[0] : L;
    const items = (L && Array.isArray(L.build) ? L.build : []).filter((b) => ['mcq', 'mcq_image'].includes(b.type || b.variant));
    if (!items.length) continue;
    out[m[1].split(path.sep).join('/').split('\\').join('/')] = items.map((b) => {
      const o = Array.isArray(b.options) ? b.options.map(strip) : ['A', 'B', 'C', 'D'].map((k) => strip((b.options || {})[k]));
      return { q: strip(b.q || b.question), o, a: String(b.answer || '').trim().toUpperCase().slice(0, 1), why: b.why || b.wrong || {} };
    });
  }
  return out;
}
