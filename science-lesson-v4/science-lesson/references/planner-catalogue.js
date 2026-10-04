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
const YEAR_OF = { year7: 7, year8: 8, year9: 9, year10combined: 10, year10separate: 10, year11separate: 11, year12: 12, year13: 13 };

/* ------------------------------------------------------------- fuzzy matching */
const STOP = new Set('lesson the a an and of in to for on with by part pt required practical rp theory'.split(' '));
const toks = (s) => String(s || '').toLowerCase().replace(/^\s*cover\s*:\s*/, '').replace(/[^a-z0-9 ]+/g, ' ')
  .split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w));
function lev(a, b) {
  const m = a.length, n = b.length; if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const same = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) ||
  (a.length >= 5 && b.length >= 5 && lev(a, b) <= (Math.min(a.length, b.length) >= 8 ? 2 : 1));
// Dice similarity over fuzzy-equal tokens, 0..1
function sim(x, y) {
  const A = toks(x), B = toks(y);
  if (!A.length || !B.length) return 0;
  const used = new Set(); let hit = 0;
  for (const a of A) { const j = B.findIndex((b, k) => !used.has(k) && same(a, b)); if (j >= 0) { used.add(j); hit++; } }
  return (2 * hit) / (A.length + B.length);
}

/* ---------------------------------------------------------- lesson catalogue */
function listLessons(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((f) => f.match(/^Lesson (\d+)\s*-\s*(.+)$/)).filter(Boolean)
    .map((m) => ({ num: +m[1], title: m[2].trim(), folder: path.join(dir, m[0]) }))
    .sort((a, b) => a.num - b.num);
}

function classSequence(cls, sol) {
  const r = ROUTES[cls];
  if (!r) return [];
  const out = [];
  if (r.ks5) {
    const year = YEAR_OF[r.ks5];
    const chDirs = fs.existsSync(`${DRIVE}/Year ${year}`) ? fs.readdirSync(`${DRIVE}/Year ${year}`) : [];
    for (const ch of sol.keyStage5[r.ks5].teachingSequence) {
      const n = (ch.chapter.match(/Chapter (\d+)/) || [])[1];
      const dirName = chDirs.find((d) => new RegExp(`^Chapter ${n}\\b`).test(d));
      const dir = dirName ? `${DRIVE}/Year ${year}/${dirName}` : null;
      const ls = dir ? listLessons(dir) : [];
      const topic = dirName || ch.chapter;
      if (ls.length) ls.forEach((l) => out.push({ year, subject: 'Physics', topic, unit: topic, ...l, source: 'drive' }));
      else (ch.sections || []).forEach((s, i) => out.push({ year, subject: 'Physics', topic, unit: topic, num: i + 1, title: s.replace(/^\d+\.\d+\s*/, ''), folder: null, source: 'plan' }));
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
    let ls = listLessons(dir);
    const range = String(t.pacingLabel || '').match(/L(\d+)\s*-\s*(\d+)/);       // "B1 Cells L1-7"
    if (range && ls.length) ls = ls.filter((l) => l.num >= +range[1] && l.num <= +range[2]);
    for (const l of ls) {
      const key = l.folder;
      if (seen.has(key)) continue;
      // Back-test 2026-10-03: Patryk never teaches these as lessons of their own.
      if (/\(optional\)/i.test(l.title) || /^(formative assessment|dirt\b|assessment point)/i.test(l.title)) continue;
      if (/\(separate\)/i.test(l.title) && /combined/.test(r.seq)) continue;   // separate-only content, Combined class
      seen.add(key);
      out.push({ year, subject: t.subject, topic: t.driveTopicFolder, unit: `${t.driveTopicFolder}#${block}`, ...l, source: 'drive' });
    }
  });
  return out;
}

/* ------------------------------------------------------------------ equipment */
const guideCache = new Map();
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
      const head = keys.map((k) => raw[k]).find((r) => Object.values(r).some((v) => /^title$/i.test(String(v).trim())));
      if (head) {
        const col = (re) => Object.keys(head).find((c) => re.test(String(head[c])));
        const cT = col(/^title/i), cR = col(/resources|tech/i), cW = col(/worksheet/i), cN = col(/lesson/i);
        rows = keys.map((k) => raw[k]).filter((r) => r !== head && r[cT]).map((r) => ({
          num: parseFloat(r[cN]) || null, title: String(r[cT]).trim(),
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

function setsFor(text) {
  if (/bunsen|flame|heat|acid|boiling|melting|exothermic|hazard/i.test(text)) return 'pairs';
  if (/\bdemo/i.test(text)) return 'demo';
  return 'threes';
}

function equipmentFor(lesson) {
  const key = lesson.folder || `${lesson.topic}/${lesson.title}`;
  const mem = learned()[key];
  if (mem) return { ...mem, source: 'remembered' };
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
  return { equipment: 'see teacher', sets: null, source: 'guess' };
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

// Progress model (back-test 2026-10-03): Patryk teaches a topic's lessons in his OWN order, skips
// some and comes back to others, so a single pointer drifts. Instead track WHICH lessons have been
// taught and which unit (topic block) he is in. A test or revision lesson closes the unit.
function progress(seq, history) {
  const taught = new Set(), closed = new Set(), tested = new Set();
  let unit = seq.length ? seq[0].unit : null, uncertain = false, last = -1;
  const log = [];
  const unitIdx = (u) => seq.findIndex((x) => x.unit === u);
  for (const h of history) {
    const t = h.lesson.replace(/^s*covers*:s*/i, '');
    if (skip(t)) continue;
    if (isTest(t) || isRevision(t)) {
      // "Particles Test" closes P3 Particles even if the class has already started the next topic;
      // a test that names no topic closes the current one.
      const named = t.replace(/\b(test|assessment|revision|review|end of topic|cover)\b/ig, ' ');
      let target = unit, ts = 0;
      for (const u of new Set(seq.map((x) => x.unit))) {
        const topicName = String(u).replace(/#\d+$/, '').replace(/^[BCP]\d+\s+/, '');
        const sc = sim(named, topicName);
        if (sc > ts && sc >= 0.4) { ts = sc; target = u; }
      }
      if (target) { closed.add(target); tested.add(target); log.push(`${t} -> ${target} finished`); }
      continue;
    }
    let best = -1, bs = 0;
    const curStart = unit ? unitIdx(unit) : 0;
    for (let j = 0; j < seq.length; j++) {
      if (taught.has(j)) continue;
      let sc = sim(t, seq[j].title);
      if (seq[j].unit === unit) sc += 0.1;                            // same topic: most likely
      else if (j > curStart && !closed.has(seq[j].unit) && seq.findIndex((x) => x.unit !== unit && x.unit === seq[j].unit) >= curStart) sc += 0.03;
      if (sc > bs) { bs = sc; best = j; }
    }
    if (best >= 0 && bs >= 0.55) { taught.add(best); unit = seq[best].unit; last = best; uncertain = false; log.push(`${t} -> ${seq[best].topic} L${seq[best].num} ${seq[best].title}`); }
    else { uncertain = true; log.push(`${t} -> ? (no match)`); }
  }
  return { taught, closed, tested, unit, last, uncertain, log };
}

// The next lesson: move FORWARD from the last lesson taught, skipping any already covered out of
// order; lessons he passed over stay passed over (back-test: he rarely goes back). When the unit
// runs out or was finished by a test/revision, the first untaught lesson of the next unit.
function nextLesson(seq, st) {
  const order = [...new Set(seq.map((x) => x.unit))];
  if (st.unit && !st.closed.has(st.unit)) {
    for (let k = Math.max(0, st.last + 1); k < seq.length && seq[k].unit === st.unit; k++) if (!st.taught.has(k)) return k;
    st.closed.add(st.unit);
    // Back-test 2026-10-03: a topic always ends with a test or revision lesson before the next one.
    // ...unless the topic carries on in a later block (9's B1 Cells L1-7, then C1, then B1 L8-16)
    const cur = seq.find((x) => x.unit === st.unit);
    const resumes = cur && seq.some((x) => x.topic === cur.topic && x.unit !== st.unit && order.indexOf(x.unit) > order.indexOf(st.unit));
    if (!resumes && (!st.tested || !st.tested.has(st.unit))) return { test: st.unit };
  }
  for (let ui = Math.max(0, order.indexOf(st.unit)); ui < order.length; ui++) {
    const u = order[ui];
    if (st.closed.has(u)) continue;
    const j = seq.findIndex((x, k) => x.unit === u && !st.taught.has(k));
    if (j >= 0) return j;
  }
  return -1;
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
      out.plan = { text: `${topic} — end-of-topic test or revision`, equipment: `Test papers: Admin/Assessment (${topic}) — count core/challenge`, check: true, test: true };
      slots.push(out);
      continue;
    }
    const L = j >= 0 ? seq[j] : null;
    if (!L) out.plan = { text: 'End of planned lessons [CHECK]', equipment: 'see teacher', check: true };
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

module.exports = { planWeek, loadAll, classSequence, progress, nextLesson, sim, sheetSlots, plannerSheets, equipmentFor, isTeachingDay, ROUTES };

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
        year: seq[0] ? seq[0].year : null, size: SIZES[cls] || null,
        seq: seq.map((L) => {
          const e = equipmentFor(L);
          let book = '';
          try { book = tb.formatRef(tb.matchLesson({ year: L.year, subject: L.subject, topic: L.title })) || ''; } catch { book = ''; }
          let built = null;
          if (L.folder) { try { built = fs.readdirSync(L.folder).some((f) => /\.pptx$/i.test(f)); } catch { built = false; } }
          return { topic: L.topic, unit: L.unit, num: L.num, title: L.title, eq: e.equipment, sets: e.sets || null,
            print: e.printing || '', eqSrc: e.source, book, built, planned: L.source === 'plan',
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
      progressOut[cls] = { taught: [...p.taught], last: p.last, unit: p.unit, closed: [...p.closed], tested: [...p.tested] };
    }
    // Real clock times: Years 7-9 use the KS3 bells, Years 10-13 the KS4/5 bells (P2/P4 differ).
    let periods = {};
    try { periods = JSON.parse(fs.readFileSync(path.join(ROOT, 'classes-2026-27.json'), 'utf8')).periodStructure || {}; } catch { periods = {}; }
    const COLOURS = ['#1565C0', '#2E7D32', '#6A1B9A', '#C62828', '#EF6C00', '#00838F', '#AD1457', '#4E342E', '#283593', '#558B2F', '#5D4037'];
    Object.keys(classes).forEach((c, k) => { classes[c].colour = COLOURS[k % COLOURS.length]; });
    const out = {
      periodTimes: { ks3: periods.KS3_and_Y9 || {}, ks4: periods.KS4_and_KS5 || {} },
      generated: new Date().toISOString(), weekAStart: school.WEEK_A_START, terms: TERMS, inset: [...INSET],
      filledWeeks: ctx.sheets.map((s) => iso(s.monday)), classes, timetable, progress: progressOut,
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
