/* planner/logic.js — the planner app's brain (Patryk 2026-10-03). Plain JS, no dependencies:
   runs in the browser (pasted into the Apps Script project as the Logic file) AND in Node for
   tests (`node planner/test-logic.js`). Same rules as science-lesson/references/planner-catalogue.js:
   - each class moves FORWARD through its own lesson list (his topics only), skipping lessons
     already taught out of order; a topic ends with an end-of-topic test unless it resumes later;
   - INSET days and holidays get no lesson; Week A/B carries on across holidays.
   Data: planner-data.json from `node science-lesson/references/planner-catalogue.js --export`.
   A saved week = { monday:'YYYY-MM-DD', letter, slots:[slot] }, slot =
     { day, period, col, cls, kind:'lesson'|'test'|'cover'|'na'|'inset'|'free'|'custom',
       i (index in the class's lesson list, for 'lesson'), unit (for 'test'), text, eq, sets, print,
       book, notes:[], carry:[] } */
(function (root) {
  'use strict';
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  // always midnight: a time of day would make week counting run one week too far
  const mondayOf = (d) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -((d.getDay() + 6) % 7));

  function isTeachingDay(data, d) {
    const s = iso(d);
    if ((data.inset || []).includes(s)) return false;
    return (data.terms || []).some(([a, b]) => s >= a && s <= b);
  }
  // Week letter: parity of TEACHING weeks since the first Week A (holiday weeks don't count).
  function weekLetter(data, monday) {
    monday = mondayOf(monday);
    const start = parse(data.weekAStart);
    const isTW = (m) => [0, 1, 2, 3, 4].some((k) => { const s = iso(addDays(m, k)); return (data.terms || []).some(([a, b]) => s >= a && s <= b); });
    let n = 0;
    if (monday >= start) { for (let w = new Date(start); w < monday; w = addDays(w, 7)) if (isTW(w)) n++; }
    else { for (let w = new Date(monday); w < start; w = addDays(w, 7)) if (isTW(w)) n--; }
    return ((n % 2) + 2) % 2 === 0 ? 'A' : 'B';
  }

  /* ---------------------------------------------------------------- progress */
  function cloneState(p) {
    return { taught: new Set(p.taught || []), closed: new Set(p.closed || []), tested: new Set(p.tested || []), last: p.last == null ? -1 : p.last, unit: p.unit || null };
  }
  // Progress for every class as it stands before `monday`: the export's progress (from his
  // Planner.xlsx sheets) plus every saved week in the app that comes after those sheets.
  function progressBefore(data, savedWeeks, monday) {
    const lastFilled = (data.filledWeeks || []).slice(-1)[0] || '0000';
    const st = {};
    for (const cls of Object.keys(data.classes)) st[cls] = cloneState((data.progress || {})[cls] || {});
    const weeks = Object.values(savedWeeks || {}).filter((w) => w.monday > lastFilled && w.monday < iso(monday))
      .sort((a, b) => (a.monday < b.monday ? -1 : 1));
    for (const w of weeks) for (const s of w.slots) applySlot(data, st[s.cls], s);
    return st;
  }
  function applySlot(data, s, slot) {
    if (!s || !slot) return;
    if (slot.kind === 'lesson' && slot.i != null) {
      const seq = data.classes[slot.cls].seq;
      s.taught.add(slot.i); s.last = slot.i; s.unit = seq[slot.i] ? seq[slot.i].unit : s.unit;
    } else if (slot.kind === 'test' && slot.unit) { s.closed.add(slot.unit); s.tested.add(slot.unit); }
  }
  // Next thing for a class: { i } a lesson, { test: unit } an end-of-topic test, or null.
  function next(seq, st) {
    const order = [...new Set(seq.map((x) => x.unit))];
    if (st.unit && !st.closed.has(st.unit)) {
      for (let k = Math.max(0, st.last + 1); k < seq.length && seq[k].unit === st.unit; k++) if (!st.taught.has(k)) return { i: k };
      st.closed.add(st.unit);
      const cur = seq.find((x) => x.unit === st.unit);
      const resumes = cur && seq.some((x) => x.topic === cur.topic && x.unit !== st.unit && order.indexOf(x.unit) > order.indexOf(st.unit));
      if (!resumes && !st.tested.has(st.unit)) return { test: st.unit };
    }
    for (let ui = Math.max(0, order.indexOf(st.unit)); ui < order.length; ui++) {
      const u = order[ui];
      if (st.closed.has(u)) continue;
      const j = seq.findIndex((x, k) => x.unit === u && !st.taught.has(k));
      if (j >= 0) return { i: j };
    }
    return null;
  }

  /* ----------------------------------------------------------------- filling */
  function lessonSlot(data, cls, i, learned) {
    const L = data.classes[cls].seq[i];
    const mem = (learned || {})[L.rel || `${cls}|${L.topic}|${L.title}`];
    return {
      kind: 'lesson', i, text: `${L.topic} — L${L.num} ${L.title}`, eq: mem ? mem.eq : L.eq, sets: mem ? mem.sets : L.sets,
      print: L.print || '', book: '', eqSrc: mem ? 'remembered' : L.eqSrc, built: L.built, planned: L.planned,
    };
  }
  function testSlot(data, cls, unit) {
    const L = data.classes[cls].seq.find((x) => x.unit === unit) || {};
    return { kind: 'test', unit, text: `${L.topic || unit} — end-of-topic test or revision`, eq: 'Test papers (core / challenge): see Admin/Assessment', sets: null, print: '' };
  }
  // A fresh week from the timetable, every slot filled in turn.
  function autofill(data, savedWeeks, monday, learned) {
    const letter = weekLetter(data, monday);
    const st = progressBefore(data, savedWeeks, monday);
    const slots = [];
    for (const t of (data.timetable[letter] || []).slice().sort((a, b) => a.day - b.day || a.period - b.period)) {
      const base = { day: t.day, period: t.period, col: t.col, cls: t.cls, notes: [], carry: [] };
      const date = addDays(monday, t.day);
      if (!isTeachingDay(data, date)) { slots.push({ ...base, kind: 'inset', text: (data.inset || []).includes(iso(date)) ? 'INSET day' : 'Holiday', eq: 'N/A' }); continue; }
      const cdata = data.classes[t.cls];
      if (!cdata) { slots.push({ ...base, kind: 'na', text: 'N/A', eq: 'N/A' }); continue; }
      const nx = next(cdata.seq, st[t.cls]);
      if (!nx) { slots.push({ ...base, kind: 'free', text: 'End of planned lessons', eq: '' }); continue; }
      const s = nx.test != null ? { ...base, ...testSlot(data, t.cls, nx.test) } : { ...base, ...lessonSlot(data, t.cls, nx.i, learned) };
      applySlot(data, st[t.cls], s);
      slots.push(s);
    }
    return { monday: iso(monday), letter, slots };
  }

  /* ------------------------------------------------------------------- moves */
  // Drag a slot onto another. mode: 'shift' | 'swap' | 'move'.
  //  shift: the dragged lesson goes to the target; that class's later slots this week re-fill in turn.
  //  swap : the two slots trade contents.
  //  move : the target gets the dragged content; the source becomes free.
  const CONTENT = ['kind', 'i', 'unit', 'text', 'eq', 'sets', 'print', 'book', 'eqSrc', 'built', 'planned', 'notes', 'carry'];
  const take = (s) => Object.fromEntries(CONTENT.map((k) => [k, s[k]]));
  function moveSlot(data, savedWeeks, week, fromIdx, toIdx, mode, learned) {
    const w = JSON.parse(JSON.stringify(week));
    const a = w.slots[fromIdx], b = w.slots[toIdx];
    if (!a || !b || fromIdx === toIdx) return w;
    if (mode === 'swap') { const ca = take(a), cb = take(b); Object.assign(a, cb); Object.assign(b, ca); return w; }
    if (mode === 'move') { Object.assign(b, take(a)); Object.assign(a, { kind: 'free', i: null, unit: null, text: 'Free', eq: '', sets: null, print: '', notes: [], carry: [] }); return w; }
    // shift: only meaningful within one class
    const cls = b.cls;
    Object.assign(b, take(a));
    if (a.cls === cls) Object.assign(a, { kind: 'free', i: null, unit: null, text: 'Free', eq: '', sets: null, print: '', notes: [], carry: [] });
    refillAfter(data, savedWeeks, w, toIdx, learned);
    return w;
  }
  // Re-fill this class's slots after `idx` in turn, keeping everything up to idx as it is.
  function refillAfter(data, savedWeeks, w, idx, learned) {
    const cls = w.slots[idx].cls;
    const cdata = data.classes[cls];
    if (!cdata) return;
    const st = progressBefore(data, savedWeeks, parse(w.monday))[cls];
    w.slots.forEach((s, k) => { if (s.cls === cls && k <= idx) applySlot(data, st, s); });
    w.slots.forEach((s, k) => {
      if (s.cls !== cls || k <= idx || ['inset', 'na', 'cover', 'custom'].includes(s.kind)) return;
      const nx = next(cdata.seq, st);
      const keep = { notes: s.notes || [], carry: s.carry || [] };
      Object.assign(s, nx ? (nx.test != null ? testSlot(data, cls, nx.test) : lessonSlot(data, cls, nx.i, learned)) : { kind: 'free', text: 'End of planned lessons', eq: '' }, keep);
      applySlot(data, st, s);
    });
  }

  /* ------------------------------------------------------------------ outputs */
  function setsLabel(s) { return s === 'pairs' ? 'pairs' : s === 'demo' ? 'demo (1 set)' : s === 'threes' ? 'sets of 3' : ''; }
  function equipCell(s) {
    if (!s.eq || /^n\/?a$/i.test(s.eq)) return 'N/A';
    const sets = s.sets ? ` — ${setsLabel(s.sets)}` : '';
    const print = s.print && !/^n\/?a$/i.test(s.print) ? `  ·  Print: ${s.print}` : '';
    const book = s.book ? `  ·  Books: ${s.book}` : '';
    return s.eq + sets + print + book;
  }
  function lessonCell(data, s) {
    if (s.kind === 'lesson') { const L = data.classes[s.cls].seq[s.i]; return L ? L.title : s.text; }
    if (s.kind === 'cover') return `Cover: ${s.text.replace(/^cover:\s*/i, '')}`;
    return s.text;
  }
  // Cells for his technicians' sheet (new layout): lesson row and equipment row per day block.
  const ROWS = { 0: [6, 7, 8], 1: [11, 12, 13], 2: [16, 17, 18], 3: [21, 22, 23], 4: [26, 27, 28] };
  // Every one of the 25 slot positions is written (blank when empty) because the template copy
  // still holds an old week. Per slot: room (C/G/K/O/S, class row), class (E/I/M/Q/U, class row),
  // lesson row, equipment row, class size (C/G/K/O/S, size row).
  const ROOM_COL = { B: 'C', F: 'G', J: 'K', N: 'O', R: 'S' }, CLASS_COL = { B: 'E', F: 'I', J: 'M', N: 'Q', R: 'U' };
  function sheetCells(data, week) {
    const cells = [{ addr: 'R1', value: `Week ${week.letter}` }, { addr: 'S1', value: week.monday.split('-').reverse().join('/') }];
    for (let day = 0; day < 5; day++) {
      const [lr, er, sr] = ROWS[day];
      for (const col of ['B', 'F', 'J', 'N', 'R']) {
        const s = week.slots.find((x) => x.day === day && x.col === col);
        const size = s ? (data.classes[s.cls] || {}).size : '';
        cells.push(
          { addr: `${ROOM_COL[col]}${lr - 1}`, value: s ? 'S8' : '' },
          { addr: `${CLASS_COL[col]}${lr - 1}`, value: s ? s.cls : '' },
          { addr: `${col}${lr}`, value: s ? lessonCell(data, s) : '' },
          { addr: `${col}${er}`, value: s ? equipCell(s) : '' },
          { addr: `${ROOM_COL[col]}${sr}`, value: size || '' });
      }
    }
    return cells;
  }
  function printList(data, week) {
    const out = [];
    for (const s of week.slots) {
      const size = (data.classes[s.cls] || {}).size || '';
      if (s.print && !/^n\/?a$/i.test(s.print)) out.push(`${DAYS[s.day]} P${s.period} ${s.cls}: ${s.print} × ${size}`);
      if (s.kind === 'test') out.push(`${DAYS[s.day]} P${s.period} ${s.cls}: test papers × ${size} (count core / challenge)`);
    }
    return out;
  }
  function buildPrompt(data, s) {
    const c = data.classes[s.cls] || {};
    const L = s.kind === 'lesson' ? c.seq[s.i] : null;
    const lines = [`Make a lesson for ${s.cls} (Year ${c.year}).`];
    if (L) lines.push(`Topic: ${L.topic}. Lesson ${L.num}: ${L.title}.`, L.rel ? `Drive folder: Lessons/${L.rel}` : '');
    else lines.push(s.text);
    (s.carry || []).forEach((x) => lines.push(`Carry over from last lesson, put straight after the Do Now: ${x}`));
    (s.notes || []).forEach((x) => lines.push(`Note: ${x}`));
    return lines.filter(Boolean).join('\n');
  }
  // When a slot gets "Review not finished" (etc.), the class's NEXT lesson carries it.
  function carryForward(week, idx, item) {
    const w = JSON.parse(JSON.stringify(week));
    const cls = w.slots[idx].cls;
    const nxt = w.slots.findIndex((s, k) => k > idx && s.cls === cls && s.kind === 'lesson');
    if (nxt >= 0) w.slots[nxt].carry = [...(w.slots[nxt].carry || []), item];
    return { week: w, carriedTo: nxt };
  }

  const api = { DAYS, iso, parse, addDays, mondayOf, isTeachingDay, weekLetter, progressBefore, next, autofill, moveSlot, refillAfter,
    lessonSlot, testSlot, sheetCells, printList, buildPrompt, carryForward, equipCell, lessonCell, setsLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PlannerLogic = api;
})(typeof window !== 'undefined' ? window : this);
