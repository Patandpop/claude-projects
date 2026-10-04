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
    return { taught: new Set(p.taught || []), closed: new Set(p.closed || []), tested: new Set(p.tested || []), revised: new Set(p.revised || []),
      last: p.last == null ? -1 : p.last, unit: p.unit || null, when: Object.assign({}, p.when || {}) };
  }
  // His ticks in the lesson list: { cls, i, done:true } = taught already / won't teach;
  // done:false = NOT taught (undoes a wrong match from Planner.xlsx). They count from the week they
  // were made in, before that week's lessons.
  function applyMarks(st, marks, cls) {
    for (const m of marks || []) {
      if (m.cls !== cls) continue;
      if (m.done) { st.taught.add(m.i); st.when[m.i] = st.when[m.i] || { date: '', wrote: 'ticked off' }; }
      else { st.taught.delete(m.i); delete st.when[m.i]; }
    }
  }
  function applyWeek(data, st, w) {
    for (const cls of Object.keys(st)) applyMarks(st[cls], w.marks, cls);
    for (const s of w.slots) applySlot(data, st[s.cls], s, w.monday);
  }
  // Progress for every class as it stands before `monday`: his Planner.xlsx sheets, then every week
  // after them, saved here or not. An unsaved week in between counts as planned, so no lesson is
  // planned twice and none is lost.
  function progressBefore(data, savedWeeks, monday, learned) {
    const lastFilled = (data.filledWeeks || []).slice(-1)[0];
    const st = {};
    for (const cls of Object.keys(data.classes)) st[cls] = cloneState((data.progress || {})[cls] || {});
    if (!lastFilled) return st;
    const stop = iso(mondayOf(monday));
    for (let m = addDays(parse(lastFilled), 7); iso(m) < stop; m = addDays(m, 7)) {
      const saved = (savedWeeks || {})[iso(m)];
      if (saved) applyWeek(data, st, saved); else planFrom(data, st, m, learned);
    }
    return st;
  }
  function applySlot(data, s, slot, monday) {
    if (!s || !slot) return;
    if (slot.kind === 'lesson' && slot.i != null) {
      const seq = data.classes[slot.cls].seq;
      const u = seq[slot.i] ? seq[slot.i].unit : s.unit;
      // entering a later topic closes every earlier one (never go back a topic)
      if (u !== s.unit) { const order = [...new Set(seq.map((x) => x.unit))]; order.slice(0, order.indexOf(u)).forEach((x) => s.closed.add(x)); }
      if (!s.taught.has(slot.i) && monday) s.when[slot.i] = { date: iso(addDays(parse(monday), slot.day)), wrote: 'planner' };
      s.taught.add(slot.i); s.last = slot.i; s.unit = u;
      if (seq[slot.i] && /^revision\b/i.test(seq[slot.i].title)) { s.closed.add(u); s.revised.add(u); }
    } else if (slot.kind === 'test' && slot.unit) { s.closed.add(slot.unit); s.tested.add(slot.unit); }
    else if (slot.kind === 'revision' && slot.unit) { s.closed.add(slot.unit); s.revised.add(slot.unit); }
  }
  // Next thing for a class (Patryk 2026-10-04): the FIRST untaught lesson of the current topic, so
  // missed lessons are filled in; then the topic's end-of-topic test (unless tested, or the topic
  // carries on in a later block); then the next topic. NEVER an earlier topic. Optional lessons are
  // only ever taught when he picks them. `reserved`: lessons he has put in a later slot himself.
  function next(seq, st, reserved) {
    const free = (x, k) => !x.optional && !st.taught.has(k) && !(reserved && reserved.has(k));
    const order = [...new Set(seq.map((x) => x.unit))];
    const ui = Math.max(0, order.indexOf(st.unit));
    if (st.unit && !st.closed.has(st.unit)) {
      const j = seq.findIndex((x, k) => x.unit === st.unit && free(x, k));
      if (j >= 0) return { i: j };
      if (seq.some((x, k) => x.unit === st.unit && !x.optional && !st.taught.has(k))) return { wait: true };   // the rest is already placed later this week
      st.closed.add(st.unit);
    }
    if (st.unit && !st.tested.has(st.unit)) {
      const cur = seq.find((x) => x.unit === st.unit);
      const resumes = cur && seq.some((x) => x.topic === cur.topic && order.indexOf(x.unit) > ui);
      if (!resumes) return st.revised && st.revised.has(st.unit) ? { test: st.unit } : { revision: st.unit };
    }
    for (let k = ui + 1; k < order.length; k++) {
      const u = order[k];
      if (st.closed.has(u)) continue;
      const j = seq.findIndex((x, m) => x.unit === u && free(x, m));
      if (j >= 0) return { i: j };
    }
    return null;
  }
  // Done / missed per topic for one class (the Classes view). `week`: his ticks this week count too.
  function classReport(data, savedWeeks, monday, cls, week) {
    const c = data.classes[cls]; if (!c) return [];
    const st = progressBefore(data, savedWeeks, monday)[cls];
    if (week) applyMarks(st, week.marks, cls);
    return [...new Set(c.seq.map((x) => x.unit))].map((u) => {
      const ls = c.seq.map((x, j) => ({ ...x, j })).filter((x) => x.unit === u);
      const state = u === st.unit ? 'current' : st.closed.has(u) || st.tested.has(u) ? 'finished' : ls.some((x) => st.taught.has(x.j)) ? 'started' : 'to come';
      return { unit: u, topic: ls[0].topic, state, tested: st.tested.has(u), revised: st.revised.has(u),
        lessons: ls.map((x) => ({ num: x.num, title: x.title, done: st.taught.has(x.j), optional: !!x.optional, nofolder: !!x.nofolder, when: st.when[x.j] || null })) };
    });
  }

  /* ----------------------------------------------------------------- filling */
  // A lesson's lasting name (its Drive folder, else topic + title). Saved weeks keep it beside the
  // list position, because the position shifts when lessons are added to the list.
  const lessonId = (L) => (L ? L.rel || `${L.unit}|${L.title}` : '');
  // After a data refresh: point every saved slot and tick back at the same lesson.
  function remapWeek(data, w) {
    const find = (cls, key, text) => {
      const seq = (data.classes[cls] || {}).seq || [];
      let k = key ? seq.findIndex((L) => lessonId(L) === key) : -1;
      if (k < 0 && text) k = seq.findIndex((L) => text === `${L.topic} — L${L.num} ${L.title}`);   // weeks saved before keys existed
      return k;
    };
    for (const s of w.slots || []) {
      if (s.kind !== 'lesson') continue;
      const k = find(s.cls, s.key, s.text);
      if (k >= 0) { s.i = k; s.key = lessonId(data.classes[s.cls].seq[k]); }
    }
    w.marks = (w.marks || []).map((m) => { const k = find(m.cls, m.key); return k >= 0 ? { ...m, i: k } : m; });
    return w;
  }
  function lessonSlot(data, cls, i, learned) {
    const L = data.classes[cls].seq[i];
    const mem = (learned || {})[L.rel || `${cls}|${L.topic}|${L.title}`];
    return {
      kind: 'lesson', i, key: lessonId(L), text: `${L.topic} — L${L.num} ${L.title}`, eq: mem ? mem.eq : L.eq, sets: mem ? mem.sets : L.sets,
      print: L.print || '', book: '', eqSrc: mem ? 'remembered' : L.eqSrc, built: L.built, planned: L.planned, nofolder: !!L.nofolder,
    };
  }
  function testSlot(data, cls, unit) {
    const L = data.classes[cls].seq.find((x) => x.unit === unit) || {};
    return { kind: 'test', unit, text: `${L.topic || unit} — end-of-topic TEST`, eq: 'Test papers (core / challenge): see Admin/Assessment', sets: null, print: '' };
  }
  function revisionSlot(data, cls, unit) {
    const L = data.classes[cls].seq.find((x) => x.unit === unit) || {};
    return { kind: 'revision', unit, text: `${L.topic || unit} — Revision lesson`, eq: 'N/A', sets: null, print: '' };
  }
  // the slot for whatever next() returned
  function slotFor(data, cls, nx, learned) {
    if (nx.test != null) return testSlot(data, cls, nx.test);
    if (nx.revision != null) return revisionSlot(data, cls, nx.revision);
    return lessonSlot(data, cls, nx.i, learned);
  }
  const isDoubleOf = (prev, s) => prev && prev.cls === s.cls && prev.day === s.day && prev.period === s.period - 1 && prev.kind === 'lesson';
  // Plan one week from state `st` (changed as it goes): every timetable slot gets the next lesson.
  function planFrom(data, st, monday, learned) {
    monday = mondayOf(monday);
    const letter = weekLetter(data, monday);
    const slots = [];
    for (const t of (data.timetable[letter] || []).slice().sort((a, b) => a.day - b.day || a.period - b.period)) {
      const base = { day: t.day, period: t.period, col: t.col, cls: t.cls, notes: [], carry: [] };
      const date = addDays(monday, t.day);
      if (!isTeachingDay(data, date)) { slots.push({ ...base, kind: 'inset', text: (data.inset || []).includes(iso(date)) ? 'INSET day' : 'Holiday', eq: 'N/A' }); continue; }
      const cdata = data.classes[t.cls];
      if (!cdata) { slots.push({ ...base, kind: 'na', text: 'N/A', eq: 'N/A' }); continue; }
      // Double lesson (same class, same day, the period straight after): ONE lesson across both slots.
      const prev = slots[slots.length - 1];
      if (isDoubleOf(prev, base)) { slots.push({ ...base, ...take(prev), double: true }); continue; }
      const nx = next(cdata.seq, st[t.cls]);
      if (!nx) { slots.push({ ...base, kind: 'free', text: 'End of planned lessons', eq: '' }); continue; }
      const s = { ...base, ...slotFor(data, t.cls, nx, learned) };
      applySlot(data, st[t.cls], s, iso(monday));
      slots.push(s);
    }
    return { monday: iso(monday), letter, slots, extras: [], marks: [] };
  }
  // A fresh week from the timetable, every slot filled in turn.
  function autofill(data, savedWeeks, monday, learned) {
    return planFrom(data, progressBefore(data, savedWeeks, monday, learned), monday, learned);
  }

  /* ------------------------------------------------------------------- moves */
  // Anything he sets by hand (a lesson he picked, a test, cover, a cleared or moved slot) is PINNED:
  // it stays put, and the class's other slots this week re-flow around it. So a lesson he replaces
  // moves to the next free slot instead of disappearing (Patryk 2026-10-04: a skipped lesson is the
  // big danger).
  const CONTENT = ['kind', 'i', 'key', 'unit', 'text', 'eq', 'sets', 'print', 'book', 'eqSrc', 'built', 'planned', 'nofolder', 'notes', 'carry', 'pinned', 'cover'];
  const take = (s) => Object.fromEntries(CONTENT.map((k) => [k, s[k]]));
  const FREE = { kind: 'free', i: null, unit: null, text: 'Free', eq: '', sets: null, print: '', notes: [], carry: [], double: false };
  // Re-plan one class's unpinned slots this week, in order, from where the class stands.
  // `from`: only slots from this index on re-flow; earlier ones stay as they are (a change on Wed never
  // rewrites Mon).
  function refillClass(data, savedWeeks, w, cls, learned, from) {
    const cdata = data.classes[cls];
    if (!cdata) return w;
    const st = progressBefore(data, savedWeeks, parse(w.monday), learned)[cls];
    applyMarks(st, w.marks, cls);
    const reserved = new Set(w.slots.filter((s) => s.cls === cls && s.pinned && s.kind === 'lesson').map((s) => s.i));
    let prev = null;
    w.slots.forEach((s, n) => {
      if (s.cls !== cls) return;
      const fixed = s.pinned || n < (from || 0) || ['inset', 'na', 'cover', 'custom', 'taught'].includes(s.kind);
      if (!fixed) {
        const keep = { notes: s.notes || [], carry: s.carry || [] };
        if (isDoubleOf(prev, s)) Object.assign(s, take(prev), keep, { pinned: false, double: true });   // second half of a double: same lesson
        else {
          const nx = next(cdata.seq, st, reserved);
          Object.assign(s, nx && nx.wait ? { kind: 'free', i: null, unit: null, text: 'Free: the rest of this topic is placed later this week', eq: '', sets: null, print: '' }
            : nx ? slotFor(data, cls, nx, learned) : { kind: 'free', text: 'End of planned lessons', eq: '' }, keep, { double: false, gap: false });
        }
      }
      if (s.kind === 'lesson') reserved.delete(s.i);
      applySlot(data, st, s, w.monday);
      prev = s;
    });
    return w;
  }
  // Drag a slot onto another. mode: 'shift' | 'swap' | 'move'.
  //  shift: the dragged lesson goes to the target; that class's other slots this week re-flow.
  //  swap : the two slots trade contents.
  //  move : the target gets the dragged content; the source becomes free.
  // Between two DIFFERENT classes the class goes with its lesson, and both classes re-flow, so the
  // lesson that was in the target slot is not lost either.
  function moveSlot(data, savedWeeks, week, fromIdx, toIdx, mode, learned) {
    const w = JSON.parse(JSON.stringify(week));
    const a = w.slots[fromIdx], b = w.slots[toIdx];
    if (!a || !b || fromIdx === toIdx) return w;
    const cross = a.cls !== b.cls;
    const ca = { ...take(a), pinned: true, double: false, ...(cross ? { cls: a.cls } : {}) };
    const cb = { ...take(b), pinned: true, double: false, ...(cross ? { cls: b.cls } : {}) };
    const touched = [...new Set([a.cls, b.cls])];
    if (mode === 'swap') { Object.assign(a, cb); Object.assign(b, ca); }
    else if (mode === 'move' || cross) { Object.assign(b, ca); Object.assign(a, FREE, { pinned: true }); }
    else { Object.assign(b, ca); Object.assign(a, FREE, { pinned: true }); }   // shift (same class)
    touched.forEach((cls) => refillClass(data, savedWeeks, w, cls, learned, Math.min(fromIdx, toIdx)));
    return w;
  }
  // "Re-plan this class's later lessons": un-pin its slots after idx, then re-flow.
  function refillAfter(data, savedWeeks, w, idx, learned) {
    const cls = w.slots[idx].cls;
    w.slots.forEach((s, k) => { if (s.cls === cls && k > idx && !['cover', 'custom'].includes(s.kind)) s.pinned = false; });
    return refillClass(data, savedWeeks, w, cls, learned, idx + 1);
  }
  // Put something in one slot by hand (pinned) and re-flow the class's other slots.
  function setSlot(data, savedWeeks, week, idx, fields, learned) {
    const w = JSON.parse(JSON.stringify(week));
    const t = w.slots[idx];
    Object.assign(t, { cover: false }, fields, { pinned: true, double: false, gap: false, notes: t.notes || [], carry: t.carry || [] });
    return refillClass(data, savedWeeks, w, t.cls, learned, idx);
  }
  // Tick / un-tick a lesson for a class (done:true taught or won't teach, false not taught, null
  // back to what the records say), then re-flow that class's week.
  function markLesson(data, savedWeeks, week, cls, i, done, learned) {
    const w = JSON.parse(JSON.stringify(week));
    w.marks = (w.marks || []).filter((m) => !(m.cls === cls && m.i === i));
    if (done != null) w.marks.push({ cls, i, done, key: lessonId(data.classes[cls].seq[i]) });
    return refillClass(data, savedWeeks, w, cls, learned);
  }

  /* ----------------------------------------------------------- lesson lists */
  const before = (s, pos) => s.day < pos.day || (s.day === pos.day && s.period < pos.period);
  // Every lesson of one topic, in order, with where each stands for this class (the side panel's
  // list): 'taught' (before this week; with the date and what he wrote), 'planned' (in a slot this
  // week), or 'todo'. `next` marks the lesson that belongs in the slot at `pos` ({day, period}).
  function topicList(data, savedWeeks, week, cls, unit, pos, learned) {
    const c = data.classes[cls]; if (!c) return [];
    const st = progressBefore(data, savedWeeks, parse(week.monday), learned)[cls];
    applyMarks(st, week.marks, cls);
    const here = {};
    week.slots.forEach((s, k) => { if (s.cls === cls && s.kind === 'lesson' && !s.double && !st.taught.has(s.i)) (here[s.i] = here[s.i] || []).push(k); });
    const st2 = cloneState(st);
    week.slots.forEach((s) => { if (s.cls === cls && pos && before(s, pos)) applySlot(data, st2, s); });
    const reserved = new Set(week.slots.filter((s) => s.cls === cls && s.pinned && s.kind === 'lesson' && pos && before(pos, s)).map((s) => s.i));
    const nx = next(c.seq, st2, reserved);
    const mark = (k) => (week.marks || []).find((m) => m.cls === cls && m.i === k);
    return c.seq.map((L, k) => ({ L, k })).filter((o) => o.L.unit === unit).map(({ L, k }) => ({
      k, num: L.num, title: L.title, optional: !!L.optional, nofolder: !!L.nofolder, built: L.built,
      state: st.taught.has(k) ? 'taught' : here[k] ? 'planned' : 'todo',
      when: st.when[k] || null, slots: here[k] || [], mark: mark(k) || null, next: !!(nx && nx.i === k),
    }));
  }
  function unitBefore(data, savedWeeks, week, cls, pos, learned) {
    const st = progressBefore(data, savedWeeks, parse(week.monday), learned)[cls];
    if (!st) return null;
    applyMarks(st, week.marks, cls);
    week.slots.forEach((s) => { if (s.cls === cls && before(s, pos)) applySlot(data, st, s); });
    return st.unit;
  }
  // Lessons he adds in the planner (Patryk 2026-10-05), stored apart from the data file:
  // { cls, unit, afterKey, num, title, rel }. Each goes into the class's list after afterKey (or at
  // the end of its topic). Skipped once the data file already has it (its Drive folder was found).
  function applyAdded(data, added) {
    for (const a of added || []) {
      const seq = (data.classes[a.cls] || {}).seq;
      if (!seq || seq.some((L) => (a.rel && L.rel === a.rel) || (L.unit === a.unit && L.title === a.title))) continue;
      const proto = seq.find((L) => L.unit === a.unit);
      if (!proto) continue;
      let at = seq.findIndex((L) => lessonId(L) === a.afterKey);
      if (a.afterKey === '^start') at = seq.findIndex((L) => L.unit === a.unit) - 1;   // start of the topic
      else if (at < 0) { at = -1; seq.forEach((L, k) => { if (L.unit === a.unit) at = k; }); }
      seq.splice(at + 1, 0, { topic: proto.topic, unit: a.unit, num: a.num, title: a.title, eq: 'see teacher', sets: null, print: '', eqSrc: 'guess',
        book: '', built: a.rel ? false : null, planned: false, optional: false, nofolder: !a.rel, rel: a.rel || null, added: true });
    }
    return data;
  }
  // The folder number for a lesson added after lesson "4": "4a", then "4b"...
  function addedNum(data, cls, unit, afterNum) {
    const base = String(afterNum).replace(/[a-z]+$/i, '');
    const used = new Set(data.classes[cls].seq.filter((L) => L.unit === unit).map((L) => String(L.num)));
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') if (!used.has(base + ch)) return base + ch;
    return base + 'z';
  }
  // What a change would make him skip: the untaught (and not planned) lessons of a topic that a
  // test, or a jump to a later topic, would close. [] = nothing lost.
  function wouldSkip(data, savedWeeks, week, idx, fields, learned) {
    const s = week.slots[idx]; const c = data.classes[s.cls]; if (!c) return [];
    const st = progressBefore(data, savedWeeks, parse(week.monday), learned)[s.cls];
    applyMarks(st, week.marks, s.cls);
    week.slots.forEach((x, k) => { if (x.cls === s.cls && k !== idx && x.kind === 'lesson') st.taught.add(x.i); });
    const order = [...new Set(c.seq.map((x) => x.unit))];
    let closing = [];
    if (fields.kind === 'test' || fields.kind === 'revision') closing = [fields.unit];
    else if (fields.kind === 'lesson') {
      const u = c.seq[fields.i].unit;
      const cur = order.indexOf(st.unit);
      if (st.unit && order.indexOf(u) > cur) closing = order.slice(cur, order.indexOf(u)).filter((x) => !st.closed.has(x));
    }
    return c.seq.map((L, k) => ({ L, k })).filter(({ L, k }) => closing.includes(L.unit) && !L.optional && !st.taught.has(k) && k !== fields.i)
      .map(({ L }) => `${L.topic} L${L.num} ${L.title}`);
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
    if (s.kind === 'lesson') { const L = data.classes[s.cls].seq[s.i]; return (s.cover ? 'Cover: ' : '') + (L ? L.title : s.text); }
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

  /* --------------------------------------------------------- times + calendar */
  // "09:00-10:00" for a class's period: Years 7-9 use KS3 bells, Years 10-13 KS4/5 bells.
  function periodTime(data, cls, period) {
    const year = (data.classes[cls] || {}).year || parseInt(cls, 10) || 9;
    const pt = (data.periodTimes || {})[year <= 9 ? 'ks3' : 'ks4'] || {};
    return pt['P' + period] || '';
  }
  // The saved week as calendar events. A double lesson becomes ONE event over both periods.
  // Times are local strings ("2026-10-12T09:00"); the server reads them as UK time.
  function calendarEvents(data, week) {
    const mon = parse(week.monday);
    const out = [];
    for (const s of week.slots.slice().sort((a, b) => a.day - b.day || a.period - b.period)) {
      if (['inset', 'na', 'free'].includes(s.kind)) continue;
      const t = periodTime(data, s.cls, s.period);
      if (!t) continue;
      const date = iso(addDays(mon, s.day));
      const [a, b] = t.split('-');
      const last = out[out.length - 1];
      if (s.double && last && last.cls === s.cls && last.date === date) { last.end = `${date}T${b}`; continue; }
      const L = s.kind === 'lesson' ? (data.classes[s.cls].seq[s.i] || {}) : {};
      const desc = [
        s.kind === 'lesson' ? `${L.topic} - Lesson ${L.num}` : '',
        s.eq && !/^n\/?a$/i.test(s.eq) ? `Equipment: ${s.eq}${s.sets ? ' (' + setsLabel(s.sets) + ')' : ''}` : '',
        s.print ? `Print: ${s.print}` : '', s.book ? `Books: ${s.book}` : '',
        ...(s.carry || []).map((x) => `Carry over: ${x}`), ...(s.notes || []).map((x) => `Note: ${x}`),
        L.rel ? `Drive: Lessons/${L.rel}` : '',
      ].filter(Boolean).join('\n');
      out.push({ cls: s.cls, date, title: `${s.cls}: ${lessonCell(data, s)}`, start: `${date}T${a}`, end: `${date}T${b}`, description: desc, colour: (data.classes[s.cls] || {}).colour || '' });
    }
    for (const x of week.extras || []) {
      out.push({ cls: '', date: iso(addDays(mon, x.day)), title: x.text, allDay: true, description: x.kind || '', colour: '' });
    }
    return out;
  }

  const api = { revisionSlot, unitBefore, applyAdded, addedNum, remapWeek, lessonId, applyMarks, classReport, topicList, wouldSkip, setSlot, markLesson, refillClass, planFrom, periodTime, calendarEvents, DAYS, iso, parse, addDays, mondayOf, isTeachingDay, weekLetter, progressBefore, next, autofill, moveSlot, refillAfter,
    lessonSlot, testSlot, sheetCells, printList, buildPrompt, carryForward, equipCell, lessonCell, setsLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PlannerLogic = api;
})(typeof window !== 'undefined' ? window : this);
