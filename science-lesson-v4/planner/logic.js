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
  // "Make next day" (Patryk 2026-10-12): the next school day, not tomorrow's date. Before 6am counts as
  // the night before (00:30 Tuesday still means Tuesday); weekends, holidays and INSET days are skipped.
  function nextSchoolDay(data, now) {
    let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (now.getHours() >= 6) d = addDays(d, 1);
    for (let n = 0; n < 120; n++, d = addDays(d, 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6 && (!(data.terms || []).length || isTeachingDay(data, d))) return d;
    }
    return d;
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
      last: p.last == null ? -1 : p.last, unit: p.unit || null, when: Object.assign({}, p.when || {}),
      revisedOn: Object.assign({}, p.revisedOn || {}), pending: (p.pending || []).slice(), now: p.now || null };
  }
  // His ticks in the lesson list: { cls, i, done:true } = taught already / won't teach;
  // done:false = NOT taught (undoes a wrong match from Planner.xlsx). They count from the week they
  // were made in, before that week's lessons.
  function applyMarks(st, marks, cls) {
    for (const m of marks || []) {
      if (m.cls !== cls || m.i == null || (m.done !== true && m.done !== false)) continue;   // a record with only a note changes nothing
      // skip (2026-10-08): never planned, but shown as skipped rather than taught
      if (m.done) { st.taught.add(m.i); st.when[m.i] = m.skip ? { date: '', wrote: 'skipped' } : (st.when[m.i] || { date: '', wrote: 'ticked off' }); }
      else { st.taught.delete(m.i); delete st.when[m.i]; }
    }
  }
  // Shared lesson state (Patryk 2026-10-12): ONE record per class + lesson, kept in data.records
  // (the Lessons tab), not inside a week. { cls, key, i, done, skip, stoppedAt, date }. A tick counts
  // in every week, earlier and later. Old weeks may still carry marks of their own: both count.
  const recs = (data, w) => (data.records || []).concat((w && w.marks) || []);
  function findRecord(data, cls, i) { return (data.records || []).find((r) => r.cls === cls && r.i === i) || null; }
  // Merge fields into a lesson's record (null removes a field); an empty record is dropped.
  function setRecord(data, cls, i, fields) {
    data.records = data.records || [];
    let r = findRecord(data, cls, i);
    if (!r) { r = { cls, i, key: lessonId(data.classes[cls].seq[i]) }; data.records.push(r); }
    for (const [f, v] of Object.entries(fields)) { if (v == null) delete r[f]; else r[f] = v; }
    if (!Object.keys(r).some((f) => !['cls', 'i', 'key'].includes(f))) data.records = data.records.filter((x) => x !== r);
    return r;
  }
  // What changed between two record lists (stale-tab guard, 1.5): every record that differs or is new, and
  // { cls, key, removed: true } for one that is gone (its last tick taken off). Matched by class + lasting name.
  function recordChanges(before, after) {
    const id = (r) => r.cls + '|' + r.key;
    const was = {}; (before || []).forEach((r) => { was[id(r)] = JSON.stringify(r); });
    const out = [], seen = new Set();
    (after || []).forEach((r) => { seen.add(id(r)); if (was[id(r)] !== JSON.stringify(r)) out.push(r); });
    (before || []).forEach((r) => { if (!seen.has(id(r))) out.push({ cls: r.cls, key: r.key, removed: true }); });
    return out;
  }
  // After a data refresh: point every record back at the same lesson (by its lasting name).
  function remapRecords(data) {
    for (const r of data.records || []) { const seq = (data.classes[r.cls] || {}).seq || []; const k = r.key ? seq.findIndex((L) => lessonId(L) === r.key) : -1; r.i = k >= 0 ? k : null; }
    return data;
  }
  // Ticks saved inside weeks (before 2026-10-12) move into the records. Returns the weeks changed.
  function migrateMarks(data, weeks) {
    const changed = [];
    for (const w of Object.values(weeks || {}).sort((a, b) => a.monday.localeCompare(b.monday))) {
      if (!(w.marks || []).length) continue;
      for (const m of w.marks) if (data.classes[m.cls] && m.i != null && data.classes[m.cls].seq[m.i]) setRecord(data, m.cls, m.i, { done: m.done, skip: m.skip || null });
      w.marks = []; changed.push(w);
    }
    return changed;
  }
  function applyWeek(data, st, w) {
    for (const cls of Object.keys(st)) applyMarks(st[cls], w.marks, cls);
    for (const s of w.slots) applySlot(data, st[s.cls], s, w.monday);
  }
  // Progress for every class as it stands before `monday`: his Planner.xlsx sheets, then every week
  // after them, saved here or not. An unsaved week in between counts as planned, so no lesson is
  // planned twice and none is lost.
  // Patryk 2026-10-08: every week is editable, past ones too, and the planner is the record. So:
  //  - looking at a week inside the Planner.xlsx period, lessons Planner.xlsx says were taught on or
  //    after that week have not happened yet;
  //  - a Planner.xlsx week he has edited here counts as he edited it, not as Planner.xlsx says.
  function progressBefore(data, savedWeeks, monday, learned) {
    const lastFilled = (data.filledWeeks || []).slice(-1)[0];
    const st = {};
    for (const cls of Object.keys(data.classes)) { st[cls] = cloneState((data.progress || {})[cls] || {}); applyMarks(st[cls], data.records, cls); }
    if (!lastFilled) return st;
    const stop = iso(mondayOf(monday));
    const filledSet = new Set(data.filledWeeks || []);
    const edited = Object.keys(savedWeeks || {}).filter((m) => filledSet.has(m) && m < stop).sort();
    const touched = new Set();
    const forget = (from, to) => {
      for (const cls of Object.keys(st)) for (const k of [...st[cls].taught]) {
        const d = (st[cls].when[k] || {}).date;
        if (d && d >= from && (!to || d < to)) { st[cls].taught.delete(k); delete st[cls].when[k]; touched.add(cls); }
      }
    };
    if (stop <= lastFilled) forget(stop, null);
    edited.forEach((m) => forget(m, iso(addDays(parse(m), 7))));
    touched.forEach((cls) => { rewind(data, st[cls], cls); applyMarks(st[cls], data.records, cls); });
    edited.forEach((m) => applyWeek(data, st, savedWeeks[m]));
    for (let m = addDays(parse(lastFilled), 7); iso(m) < stop; m = addDays(m, 7)) {
      const saved = (savedWeeks || {})[iso(m)];
      if (saved) applyWeek(data, st, saved); else planFrom(data, st, m, learned);
    }
    return st;
  }
  // After forgetting lessons, where a class is up to again: the latest lesson still taught sets the
  // current topic; topics before it count as finished (entering a later topic closes earlier ones).
  function rewind(data, s, cls) {
    const seq = data.classes[cls].seq;
    const order = [...new Set(seq.map((x) => x.unit))];
    const ks = [...s.taught].filter((k) => seq[k] && (s.when[k] || {}).date)
      .sort((a, b) => s.when[a].date.localeCompare(s.when[b].date) || a - b);
    const last = ks.length ? ks[ks.length - 1] : -1;
    s.last = last; s.unit = last >= 0 ? seq[last].unit : null;
    const upto = s.unit ? order.indexOf(s.unit) : -1;
    const before = new Set(order.slice(0, Math.max(0, upto)));
    s.closed = new Set([...s.closed].filter((u) => before.has(u)));
    before.forEach((u) => s.closed.add(u));
    s.tested = new Set([...s.tested].filter((u) => before.has(u)));
    s.revised = new Set([...s.revised].filter((u) => before.has(u) || u === s.unit));
  }
  // A Planner.xlsx week as an ordinary editable week: each period gets the lesson Planner.xlsx says was
  // taught that day (pinned, so it stays put), or what he wrote if it was not a lesson in the list.
  function fromFilled(data, monday) {
    const mon = iso(mondayOf(monday));
    const rows = (data.filled || {})[mon];
    if (!rows) return null;
    const slots = rows.map((r) => {
      const base = { day: r.day, period: r.period, col: r.col, cls: r.cls, notes: [], carry: [] };
      const c = data.classes[r.cls];
      const date = iso(addDays(parse(mon), r.day));
      const when = ((data.progress || {})[r.cls] || {}).when || {};
      const k = c ? Object.keys(when).map(Number).find((x) => when[x] && when[x].date === date && c.seq[x]) : undefined;
      if (k != null) return { ...base, ...lessonSlot(data, r.cls, k), pinned: true };
      return { ...base, kind: 'custom', i: null, text: r.text || '(blank)', eq: '', pinned: true };
    }).sort((a, b) => a.day - b.day || a.period - b.period);
    return { monday: mon, letter: weekLetter(data, parse(mon)), slots, extras: [], marks: [], fromXlsx: true };
  }
  // Future weeks follow any change: every period he did not place by hand is planned again from where
  // the class is now up to. `fromDay`: in the current week only today and later move.
  function reflowWeek(data, savedWeeks, week, learned, fromDay) {
    const w = JSON.parse(JSON.stringify(week));
    const from = w.slots.findIndex((s) => s.day >= (fromDay || 0));
    if (from < 0) return w;
    [...new Set(w.slots.map((s) => s.cls))].forEach((cls) => refillClass(data, savedWeeks, w, cls, learned, from));
    return w;
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
      if (seq[slot.i] && /^revision\b/i.test(seq[slot.i].title)) revised(s, u, monday);
    } else if (slot.kind === 'test' && slot.unit) { s.closed.add(slot.unit); s.tested.add(slot.unit); s.pending = s.pending.filter((x) => x !== slot.unit); }
    else if (slot.kind === 'revision' && slot.unit) revised(s, slot.unit, monday);
  }
  // A revision lesson closes its topic and remembers the week, so the test can come the week after.
  function revised(s, u, monday) {
    s.closed.add(u); s.revised.add(u);
    if (monday) s.revisedOn[u] = iso(mondayOf(parse(monday)));
  }
  // Next thing for a class (Patryk 2026-10-04): the FIRST untaught lesson of the current topic, so
  // missed lessons are filled in; then the topic's end-of-topic test (unless tested, or the topic
  // carries on in a later block); then the next topic. NEVER an earlier topic. Optional lessons are
  // only ever taught when he picks them. `reserved`: lessons he has put in a later slot himself.
  function next(seq, st, reserved) {
    const free = (x, k) => !x.optional && !st.taught.has(k) && !(reserved && reserved.has(k));
    const order = [...new Set(seq.map((x) => x.unit))];
    const ui = Math.max(0, order.indexOf(st.unit));
    // Patryk 2026-10-08: the test comes the WEEK AFTER the revision lesson. A test held back in
    // revision week comes first in any later week.
    const due = st.pending.find((u) => !st.tested.has(u) && !(st.now && st.revisedOn[u] && st.revisedOn[u] >= st.now));
    if (due) return { test: due };
    if (st.unit && !st.closed.has(st.unit)) {
      const j = seq.findIndex((x, k) => x.unit === st.unit && free(x, k));
      if (j >= 0) return { i: j };
      if (seq.some((x, k) => x.unit === st.unit && !x.optional && !st.taught.has(k))) return { wait: true };   // the rest is already placed later this week
      st.closed.add(st.unit);
    }
    if (st.unit && !st.tested.has(st.unit)) {
      const cur = seq.find((x) => x.unit === st.unit);
      const resumes = cur && seq.some((x) => x.topic === cur.topic && order.indexOf(x.unit) > ui);
      if (!resumes) {
        if (!st.revised.has(st.unit)) return { revision: st.unit };
        if (cur.hasTest === false) st.tested.add(st.unit);                    // no test for this topic: revision only
        else if (st.now && st.revisedOn[st.unit] && st.revisedOn[st.unit] >= st.now) {
          if (!st.pending.includes(st.unit)) st.pending.push(st.unit);       // test next week; carry on meanwhile
        } else return { test: st.unit };
      }
    }
    for (let k = ui + 1; k < order.length; k++) {
      const u = order[k];
      if (st.closed.has(u) || st.pending.includes(u)) continue;
      const j = seq.findIndex((x, m) => x.unit === u && free(x, m));
      if (j >= 0) return { i: j };
    }
    return null;
  }
  // Done / missed per topic for one class (the Classes view). `week`: his ticks this week count too.
  function classReport(data, savedWeeks, monday, cls, week) {
    const c = data.classes[cls]; if (!c) return [];
    const st = progressBefore(data, savedWeeks, monday)[cls];
    applyMarks(st, recs(data, week), cls);
    return [...new Set(c.seq.map((x) => x.unit))].map((u) => {
      const ls = c.seq.map((x, j) => ({ ...x, j })).filter((x) => x.unit === u);
      const state = u === st.unit ? 'current' : st.closed.has(u) || st.tested.has(u) ? 'finished' : ls.some((x) => st.taught.has(x.j)) ? 'started' : 'to come';
      return { unit: u, topic: ls[0].topic, state, tested: st.tested.has(u), revised: st.revised.has(u),
        lessons: ls.map((x) => ({ num: x.num, title: x.title, done: st.taught.has(x.j), skipped: (st.when[x.j] || {}).wrote === 'skipped', optional: !!x.optional, nofolder: !!x.nofolder, when: st.when[x.j] || null })) };
    });
  }

  /* ----------------------------------------------------------------- filling */
  // A lesson's lasting name (its Drive folder, else topic + title). Saved weeks keep it beside the
  // list position, because the position shifts when lessons are added to the list.
  // A renamed added lesson keeps its first name as its id (origKey), so its ticks and saved weeks still find it.
  const lessonId = (L) => (L ? L.rel || L.origKey || `${L.unit}|${L.title}` : '');
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
      if (k >= 0) {
        s.i = k; const L = data.classes[s.cls].seq[k]; s.key = lessonId(L);
        // technician text he never touched follows the newest data (2026-10-08: old "pink" print text)
        if (!s.edited && s.eqSrc !== 'remembered') { s.eq = L.eq; s.sets = L.sets; s.print = L.print || ''; s.eqSrc = L.eqSrc; if (!s.bookOn) s.book = L.book || ''; }
      }
    }
    w.marks = (w.marks || []).map((m) => { const k = find(m.cls, m.key); return k >= 0 ? { ...m, i: k } : m; });
    return w;
  }
  function lessonSlot(data, cls, i, learned) {
    const L = data.classes[cls].seq[i];
    const mem = (learned || {})[L.rel || `${cls}|${L.topic}|${L.title}`];
    return {
      kind: 'lesson', i, key: lessonId(L), text: `${L.topic} — L${L.num} ${L.title}`, eq: mem ? mem.eq : L.eq, sets: mem ? mem.sets : L.sets,
      print: L.print || '', book: L.book || '', bookOn: false, eqSrc: mem ? 'remembered' : L.eqSrc, built: L.built, planned: L.planned, nofolder: !!L.nofolder,
    };
  }
  function testSlot(data, cls, unit) {
    const L = data.classes[cls].seq.find((x) => x.unit === unit) || {};
    return { kind: 'test', unit, text: `${L.topic || unit} — end-of-topic TEST`, eq: 'Test papers (core / challenge): see Admin/Assessment', sets: null, print: '' };
  }
  function revisionSlot(data, cls, unit) {
    const L = data.classes[cls].seq.find((x) => x.unit === unit) || {};
    // revision / review lessons need the textbooks: ticked by default (Patryk 2026-10-08)
    const bk = (data.classes[cls].seq.find((x) => x.unit === unit && x.book) || {}).book || '';
    return { kind: 'revision', unit, text: `${L.topic || unit} — Revision lesson`, eq: 'N/A', sets: null, print: '', book: bk ? bk.split(',')[0] + ', whole topic' : '', bookOn: !!bk };
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
    for (const c of Object.keys(st)) st[c].now = iso(monday);
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
  const CONTENT = ['kind', 'i', 'key', 'unit', 'text', 'eq', 'sets', 'print', 'book', 'bookOn', 'checks', 'edited', 'eqSrc', 'built', 'planned', 'nofolder', 'notes', 'carry', 'pinned', 'cover', 'own', 'sameAs'];
  const take = (s) => Object.fromEntries(CONTENT.map((k) => [k, s[k]]));
  const FREE = { kind: 'free', i: null, unit: null, text: 'Free', eq: '', sets: null, print: '', notes: [], carry: [], double: false };
  // Re-plan one class's unpinned slots this week, in order, from where the class stands.
  // `from`: only slots from this index on re-flow; earlier ones stay as they are (a change on Wed never
  // rewrites Mon).
  function refillClass(data, savedWeeks, w, cls, learned, from) {
    const cdata = data.classes[cls];
    if (!cdata) return w;
    const st = progressBefore(data, savedWeeks, parse(w.monday), learned)[cls];
    st.now = w.monday;
    applyMarks(st, recs(data, w), cls);
    const reserved = new Set(w.slots.filter((s) => s.cls === cls && s.pinned && s.kind === 'lesson').map((s) => s.i));
    let prev = null;
    w.slots.forEach((s, n) => {
      if (s.cls !== cls) return;
      const fixed = s.pinned || n < (from || 0) || ['inset', 'na', 'cover', 'custom', 'taught', 'away'].includes(s.kind);
      if (!fixed) {
        const keep = { notes: s.notes || [], carry: s.carry || [] };
        if (isDoubleOf(prev, s)) Object.assign(s, take(prev), keep, { pinned: false, double: true });   // second half of a double: same lesson
        else {
          const nx = next(cdata.seq, st, reserved);
          const fresh = nx && nx.wait ? { kind: 'free', i: null, unit: null, text: 'Free: the rest of this topic is placed later this week', eq: '', sets: null, print: '' }
            : nx ? slotFor(data, cls, nx, learned) : { kind: 'free', text: 'End of planned lessons', eq: '' };
          // the same lesson stays in this period: keep what he typed for it (kit, printing, books, checklist)
          const mine = fresh.kind === 'lesson' && s.kind === 'lesson' && fresh.i === s.i
            ? Object.fromEntries(['eq', 'sets', 'print', 'book', 'bookOn', 'checks', 'edited', 'eqSrc'].filter((f) => s[f] !== undefined && (s.edited || f === 'checks' || f === 'bookOn')).map((f) => [f, s[f]])) : {};
          Object.assign(s, fresh, mine, keep, { double: false, gap: false });
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
  function markLesson(data, savedWeeks, week, cls, i, done, learned, skip) {
    const w = JSON.parse(JSON.stringify(week));
    w.marks = (w.marks || []).filter((m) => !(m.cls === cls && m.i === i));
    setRecord(data, cls, i, { done: done == null ? null : done, skip: done && skip ? true : null });
    return refillClass(data, savedWeeks, w, cls, learned);
  }

  // Untick a lesson that was planned on a day that has passed: that period becomes "did not happen"
  // (pinned), and the lesson re-flows into the class's next period, so it is never lost.
  function notHappened(data, savedWeeks, week, idxs, learned) {
    let w = week;
    for (const idx of idxs) w = setSlot(data, savedWeeks, w, idx, { kind: 'custom', i: null, unit: null, key: '', text: 'Lesson did not happen', eq: '', sets: null, print: '', book: '' }, learned);
    return w;
  }
  // Slide-over (Patryk 2026-10-12): after a change, every LATER saved week from this week on is
  // re-planned at once (periods he did not place by hand move along), so later weeks, the Tests list
  // and Make next day all agree. Weeks before `thisMonday` are the record and never move.
  // Returns the weeks that changed; savedWeeks is updated as it goes.
  function cascade(data, savedWeeks, fromMonday, thisMonday, learned) {
    const out = [];
    const floor = iso(mondayOf(thisMonday));
    for (const m of Object.keys(savedWeeks || {}).filter((x) => x > fromMonday && x >= floor).sort()) {
      const old = savedWeeks[m];
      if (old.fromXlsx || old.taught) continue;
      const nw = reflowWeek(data, savedWeeks, old, learned, 0);
      if (JSON.stringify(nw.slots) !== JSON.stringify(old.slots)) { savedWeeks[m] = nw; out.push(nw); }
    }
    return out;
  }
  // Re-tick one that was marked not happened earlier is just Undo; ticking ahead of time stays markLesson.

  /* ----------------------------------------------------------- lesson lists */
  const before = (s, pos) => s.day < pos.day || (s.day === pos.day && s.period < pos.period);
  // Every lesson of one topic, in order, with where each stands for this class (the side panel's
  // list): 'taught' (before this week; with the date and what he wrote), 'planned' (in a slot this
  // week), or 'todo'. `next` marks the lesson that belongs in the slot at `pos` ({day, period}).
  // Patryk 2026-10-08: a lesson planned this week on a day that has come (today or earlier) counts as
  // TAUGHT in the list, ticked, unless he unticks it ("it didn't happen"). `today`: 'YYYY-MM-DD'.
  const slotDay = (week, s) => iso(addDays(parse(week.monday), s.day));
  const slotDone = (week, s, today) => !s.notDone && (s.done || (!!today && slotDay(week, s) <= today));
  function topicList(data, savedWeeks, week, cls, unit, pos, learned, today) {
    const c = data.classes[cls]; if (!c) return [];
    const st = progressBefore(data, savedWeeks, parse(week.monday), learned)[cls];
    applyMarks(st, recs(data, week), cls);
    const here = {};
    week.slots.forEach((s, k) => { if (s.cls === cls && s.kind === 'lesson' && !s.double && !st.taught.has(s.i)) (here[s.i] = here[s.i] || []).push(k); });
    const st2 = cloneState(st); st2.now = week.monday;
    week.slots.forEach((s) => { if (s.cls === cls && pos && before(s, pos)) applySlot(data, st2, s, week.monday); });
    const reserved = new Set(week.slots.filter((s) => s.cls === cls && s.pinned && s.kind === 'lesson' && pos && before(pos, s)).map((s) => s.i));
    const nx = next(c.seq, st2, reserved);
    const mark = (k) => recs(data, week).find((m) => m.cls === cls && m.i === k && (m.done === true || m.done === false));
    return c.seq.map((L, k) => ({ L, k })).filter((o) => o.L.unit === unit).map(({ L, k }) => ({
      k, num: L.num, title: L.title, optional: !!L.optional, nofolder: !!L.nofolder, built: L.built,
      state: st.taught.has(k) ? ((st.when[k] || {}).wrote === 'skipped' ? 'skipped' : 'taught') : here[k] ? (here[k].every((n) => slotDone(week, week.slots[n], today)) ? 'done' : 'planned') : 'todo',
      when: st.when[k] || (here[k] && here[k].every((n) => slotDone(week, week.slots[n], today)) ? { date: slotDay(week, week.slots[here[k][0]]), wrote: 'this week' } : null), slots: here[k] || [], mark: mark(k) || null, stoppedAt: (findRecord(data, cls, k) || {}).stoppedAt || '', next: !!(nx && nx.i === k),
    }));
  }
  function unitBefore(data, savedWeeks, week, cls, pos, learned) {
    const st = progressBefore(data, savedWeeks, parse(week.monday), learned)[cls];
    if (!st) return null;
    applyMarks(st, recs(data, week), cls);
    week.slots.forEach((s) => { if (s.cls === cls && before(s, pos)) applySlot(data, st, s, week.monday); });
    return st.unit;
  }
  // Lessons he adds in the planner (Patryk 2026-10-05), stored apart from the data file:
  // { cls, unit, afterKey, num, title, rel }. Each goes into the class's list after afterKey (or at
  // the end of its topic). Skipped once the data file already has it (its Drive folder was found).
  function applyAdded(data, added) {
    for (const a of added || []) {
      const seq = (data.classes[a.cls] || {}).seq;
      // a.name: his new name for it (Patryk 2026-10-19: rename lessons he added; the Drive folder keeps its old name)
      if (!seq) continue;
      const had = seq.find((L) => (a.rel && L.rel === a.rel) || (L.unit === a.unit && (L.origKey === `${a.unit}|${a.title}` || L.title === a.title)));
      if (had) { if (had.added && a.name) { had.origKey = had.origKey || `${a.unit}|${a.title}`; had.title = a.name; } continue; }
      const proto = seq.find((L) => L.unit === a.unit);
      if (!proto) continue;
      let at = seq.findIndex((L) => lessonId(L) === a.afterKey);
      if (a.afterKey === '^start') at = seq.findIndex((L) => L.unit === a.unit) - 1;   // start of the topic
      else if (at < 0) { at = -1; seq.forEach((L, k) => { if (L.unit === a.unit) at = k; }); }
      seq.splice(at + 1, 0, { topic: proto.topic, unit: a.unit, num: a.num, title: a.title, eq: '', sets: null, print: '', eqSrc: 'none',
        book: '', built: a.rel ? false : null, planned: false, optional: false, nofolder: !a.rel, rel: a.rel || null, added: true });
      if (a.name) { seq[at + 1].title = a.name; seq[at + 1].origKey = `${a.unit}|${a.title}`; }
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
    applyMarks(st, recs(data, week), s.cls);
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
  function setsLabel(s) { return s === 'pairs' ? 'pairs' : s === 'demo' ? 'demo (1 set)' : s === 'threes' ? 'sets of 3' : s === 'each' ? 'one each' : ''; }
  function equipCell(s) {
    if (!s.eq || /^n\/?a$/i.test(s.eq)) return 'N/A';
    const sets = s.sets ? ` — ${setsLabel(s.sets)}` : '';
    const print = s.print && !/^n\/?a$/i.test(s.print) ? `  ·  Print: ${s.print}` : '';
    const book = s.book && s.bookOn ? `  ·  Books: ${s.book}` : '';
    return s.eq + sets + print + book;
  }
  function lessonCell(data, s) {
    if (s.kind === 'lesson') { const L = data.classes[s.cls].seq[s.i]; return (s.cover ? 'Cover: ' : '') + (L ? L.title : s.text); }
    if (s.kind === 'cover') return `Cover: ${s.text.replace(/^cover:\s*/i, '')}`;
    if (s.kind === 'away') return 'Class away' + (s.text && !/^class away$/i.test(s.text) ? ': ' + s.text : '');
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
  // The technicians' order sheet as plain data (Patryk 2026-10-08: no template needed; Code.gs draws it).
  // days[0..4].slots[0..4] = one box per period: room, class, lesson, kit, class size, number of sets.
  function setsCount(s, size) {
    if (!s || !s.sets || !size) return '';
    if (s.sets === 'demo') return 1;
    if (s.sets === 'each') return size;
    return Math.ceil(size / (s.sets === 'pairs' ? 2 : 3));
  }
  function sheetModel(data, week, settings) {
    const mon = parse(week.monday);
    const days = [];
    for (let day = 0; day < 5; day++) {
      const date = addDays(mon, day);
      const slots = [];
      for (let period = 1; period <= 5; period++) {
        const s = week.slots.find((x) => x.day === day && x.period === period && x.cls);
        if (!s) { slots.push(null); continue; }
        const size = (data.classes[s.cls] || {}).size || '';
        // test lessons: the papers the technicians print (Patryk 2026-10-08), split as set in Classes
        const ts = (settings || {})[s.cls] || {};
        const kit = s.kind === 'test'
          ? (ts.core != null || ts.challenge != null ? `Test papers: Core × ${ts.core || 0}, Challenge × ${ts.challenge || 0}${ts.paper ? ' (' + ts.paper + ')' : ''}` : `Test papers × ${size}: core / challenge split not set (Classes view)`)
          : !s.eq || /^n\/?a$/i.test(s.eq) ? '' : s.eq;
        const extra = [s.print && !/^n\/?a$/i.test(s.print) ? 'Print: ' + s.print : '', s.book && s.bookOn ? 'Books: ' + s.book : ''].filter(Boolean);
        slots.push({
          room: 'S8', cls: s.cls, lesson: lessonCell(data, s),
          kit: kit || (extra.length ? '' : 'Nothing needed'), extra: extra.join('\n'),
          size, sets: setsCount(s, size), setsLabel: setsLabel(s.sets),
        });
      }
      days.push({ name: DAYS[day], date: date.getDate() + ' ' + date.toLocaleDateString('en-GB', { month: 'short' }), slots });
    }
    return { letter: week.letter, monday: mon.getDate() + ' ' + mon.toLocaleDateString('en-GB', { month: 'short' }), days };
  }
  function printList(data, week, settings) {
    const out = [];
    for (const s of week.slots) {
      const size = (data.classes[s.cls] || {}).size || '';
      // laminates, card sorts and anything already counted in sets are printed once per set, not per pupil
      const perSet = /laminat|card ?sort|\bsets?\b|\bx\s?\d+\b|class set/i.test(s.print || '');
      if (s.print && !/^n\/?a$/i.test(s.print)) out.push(`${DAYS[s.day]} P${s.period} ${s.cls}: ${s.print}${perSet ? '' : ` × ${size}`}`);
      const ts = (settings || {})[s.cls] || {};
      if (s.kind === 'test') out.push(`${DAYS[s.day]} P${s.period} ${s.cls}: test papers ` + (ts.core != null || ts.challenge != null
        ? `Core × ${ts.core || 0}, Challenge × ${ts.challenge || 0}${ts.paper ? ' (' + ts.paper + ')' : ''}` : `× ${size} (set the core / challenge split in Classes)`));
      if (s.book && s.bookOn) out.push(`${DAYS[s.day]} P${s.period} ${s.cls}: textbooks out: ${s.book}`);
    }
    return out;
  }
  // Lesson checklist (Patryk 2026-10-08): what he would otherwise type to Claude every time.
  const CHECKS = [
    ['review', 'Start with a short review of last lesson (it was not finished)'],
    ['collectHw', 'Collect homework at the start'],
    ['setHw', 'Set homework at the end'],
    ['plc', 'Test next week: hand out / remind them of the PLC'],
    ['kit', 'Practical: check the kit before the lesson'],
  ];
  // Lesson extras (Patryk 2026-10-15, approved 2026-10-19): the parts that fall by the wayside. Ticks go
  // to Claude with the build request. A few are suggested (not ticked) from what the lesson already has.
  const EXTRAS = [
    ['video', 'Video clip', 'Add a short video clip (2 to 4 minutes) that shows the idea'],
    ['sim', 'Simulation', 'Add a simulation (PhET or similar) to explore the idea'],
    ['demo', 'Demo', 'Add a teacher demo, with what to watch for'],
    ['practical', 'Practical', 'Include a practical'],
    ['memory', 'Memory phrase', 'Add a memory phrase for the key idea'],
    ['realData', 'Real data', 'Use real data (a real table or graph) in the Apply task'],
  ];
  // what to suggest: practical when the lesson has kit, memory phrase on the first lesson of a topic
  function extrasSuggested(data, s) {
    const c = data.classes[s.cls] || {}, L = s.kind === 'lesson' ? (c.seq || [])[s.i] : null;
    const first = L && (c.seq || []).findIndex((x) => x.unit === L.unit) === s.i;
    return { practical: !!s.sets && s.sets !== 'demo', demo: s.sets === 'demo', memory: !!first };
  }
  // Grades from a percentage (Patryk 2026-10-19: grades for each homework and test). bands = his own
  // boundaries, highest first: [{ g: '9', min: 80 }, ...]. No bands, no grade (never made up).
  function gradeFor(pct, bands) {
    if (pct == null || !bands || !bands.length) return '';
    const b = bands.slice().sort((x, y) => y.min - x.min).find((x) => pct >= x.min);
    return b ? String(b.g) : 'U';
  }
  // What a quiz file covers: marks per sub-topic, the long (6-mark) questions, multiple choice count.
  function hwCoverage(hw) {
    const by = new Map(), long = [];
    let mcq = 0, total = 0;
    for (const q of (hw && hw.questions) || []) {
      const m = q.type === 'mcq' ? (q.points || 1) : (q.markPoints && q.markPoints.length ? q.markPoints.reduce((a, p) => a + (p.marks || 0), 0) : (q.marks || 0));
      const k = q.lesson || 'Other';
      by.set(k, (by.get(k) || 0) + m); total += m;
      if (q.type === 'mcq') mcq++;
      if (q.type !== 'mcq' && (m >= 6 || (q.levels && q.levels.length))) long.push({ label: q.label || '', marks: m, text: String(q.text || '').replace(/\s+/g, ' ').slice(0, 140), lesson: q.lesson || '' });
    }
    return { total, mcq, long, parts: [...by.entries()].map(([lesson, marks]) => ({ lesson, marks })).sort((a, b) => b.marks - a.marks) };
  }
  // A homework's status (spec 1.3): drafted / scheduled / live / due / marked. row = the Homework tab
  // row; live = what Classroom says now ({ state: 'DRAFT'|'PUBLISHED', scheduled }); today = 'YYYY-MM-DD'.
  // A Form quiz counts as marked once it is due and has responses (it marks itself; spec question 6).
  /* Learning loop M8 (2026-10-22): the class's latest homework results to show on a lesson card:
     the newest homework due before this lesson (up to 14 days before) that pupils have done.
     results = Results tab rows from the planner (class counts only). Returns the row plus its three
     weakest questions, or null. */
  function lastResults(results, cls, dateIso) {
    const from = iso(addDays(parse(dateIso), -14));
    const rows = (results || []).filter((r) => r && !r.error && r.cls === cls && r.done > 0 && r.dueOn && r.dueOn <= dateIso && r.dueOn >= from)
      .sort((a, b) => (a.dueOn < b.dueOn ? 1 : -1));
    if (!rows.length) return null;
    const r = rows[0];
    const weak = (r.questions || []).filter((q) => q.pct != null).slice().sort((a, b) => a.pct - b.pct).slice(0, 3);
    return Object.assign({}, r, { weak });
  }
  /* Workplan 2.3 (2026-10-29): the most-missed homework questions across classes, for the Assessment
     tab, from the Results tab rows (class counts only). o = { cls (optional), since 'YYYY-MM-DD', n }.
     [{ cls, id, title, dueOn, done, key, text, pct, wrong, missed }] lowest % first. */
  function mostMissed(results, o) {
    const opt = o || {}, out = [];
    (results || []).filter((r) => r && !r.error && r.done > 0 && (!opt.cls || r.cls === opt.cls) && (!opt.since || (r.dueOn || '') >= opt.since))
      .forEach((r) => (r.questions || []).filter((q) => q.pct != null && q.pct < 100).forEach((q) => out.push({ cls: r.cls, id: r.id, title: r.title, dueOn: r.dueOn, done: r.done,
        key: q.key, text: q.text || '', pct: q.pct, wrong: q.wrong || [], missed: q.missed || [] })));
    return out.sort((a, b) => a.pct - b.pct || (a.dueOn < b.dueOn ? 1 : -1)).slice(0, opt.n || 12);
  }
  /* Workplan 2.2 (2026-10-29): the class's ABCD card votes from its most recent voted lesson before
     this one (up to 14 days before), for the lesson card. votes = readVotes_ rows (class level only).
     Returns { key, title, when, n, avg, weak: up to 3 lowest % right } or null. */
  function lastVotes(votes, cls, dateIso) {
    const from = iso(addDays(parse(dateIso), -14));
    const rows = (votes || []).filter((v) => v && v.cls === cls && v.when < dateIso && v.when >= from && v.pct != null);
    if (!rows.length) return null;
    const last = rows.reduce((a, v) => (v.when > a.when ? v : a));
    const mine = rows.filter((v) => v.key === last.key && v.when === last.when);
    const byQ = new Map();
    mine.forEach((v) => byQ.set(v.q, v));   // the newest vote for each question
    const qs = [...byQ.values()];
    const avg = Math.round(qs.reduce((t, v) => t + v.pct, 0) / qs.length);
    const weak = qs.filter((v) => v.pct < 100).sort((a, b) => a.pct - b.pct || a.q - b.q).slice(0, 3);
    return { key: last.key, title: last.title, when: last.when, n: qs.length, avg, weak };
  }
  // A missed vote question put on a lesson's Do Now: what the build request says (with the lesson's
  // own options and answer when the planner has them). v = a lastVotes weak row; mcq = that lesson's mcq list.
  function doNowFromVote(v, mcq) {
    const m = (mcq || [])[v.q - 1];
    const opts = m && m.o ? m.o.map((o, i) => 'ABCD'[i] + ' ' + o).join(' / ') : '';
    const right = m && m.a ? m.a : v.right;
    return { q: (m && m.q) || v.question, opts, right, pct: v.pct, wrong: v.wrong, why: v.why, from: v.title, n: v.q };
  }
  function hwStatus(row, live, today, responses) {
    if (row.status === 'marked') return 'marked';
    const state = live && live.state;
    if (state === 'PUBLISHED' || (!state && row.status === 'live')) {
      if (row.dueOn && today >= row.dueOn) return row.formId && responses > 0 ? 'marked' : 'due';
      return 'live';
    }
    if ((live && live.scheduled) || row.status === 'scheduled') return 'scheduled';
    return row.status === 'form only' ? 'form only' : 'drafted';
  }
  // week (optional): the rest of the week, so a lesson already made for another class is reused
  function buildPrompt(data, s, profile, week) {
    const c = data.classes[s.cls] || {};
    const L = s.kind === 'lesson' ? c.seq[s.i] : null;
    const lines = [];
    if (s.kind === 'revision') {
      // Patryk 2026-10-09: the end-of-topic lesson before the test is a REVISION lesson
      const ls = (c.seq || []).filter((x) => x.unit === s.unit);
      const t = (ls[0] || {}).topic || s.text;
      const rel = (ls.find((x) => x.rel) || {}).rel;
      lines.push(`Make a REVISION lesson (lessonType "revision") for ${s.cls} (Year ${c.year}) on ${t}: the end of the topic, before the test.`,
        'Build it from this topic\'s own lessons: their Apply questions, Do Nows and real exam questions, with model answers.',
        ls.length ? 'Lessons in the topic: ' + ls.map((x) => 'L' + x.num + ' ' + x.title).join('; ') + '.' : '',
        rel ? 'Drive topic folder: Lessons/' + rel.split('/').slice(0, -1).join('/') : '');
    } else {
      lines.push(`Make a lesson for ${s.cls} (Year ${c.year}).`);
      if (L) lines.push(`Topic: ${L.topic}. Lesson ${L.num}: ${L.title}.`, L.rel ? `Drive folder: Lessons/${L.rel}` : '');
      else lines.push(s.text);
    }
    // the same (or a similar) lesson made for another class: copy and adapt it, never start again
    if (s.sameAs) lines.push(`Reuse the lesson made for ${s.sameAs.cls} (${s.sameAs.title}${s.sameAs.rel ? ', Drive folder Lessons/' + s.sameAs.rel : ''}): copy it and adapt it for ${s.cls} (see the notes about ${s.cls} below). Do not build it from scratch.`);
    else if (week) {
      const twin = week.slots.find((x) => x !== s && x.cls !== s.cls && !x.double && x.kind === s.kind &&
        ((s.kind === 'lesson' && x.key && x.key === s.key) || (s.kind === 'revision' && x.unit && x.unit === s.unit)));
      if (twin) lines.push(`${twin.cls} has the same lesson this week (${DAYS[twin.day]} P${twin.period}${twin.own ? ', made by Patryk himself' : ''}): if it is already made, reuse it and adapt it for ${s.cls} instead of building a new one.`);
    }
    (s.carry || []).forEach((x) => lines.push(`Carry over from last lesson, put straight after the Do Now: ${x}`));
    (s.notes || []).forEach((x) => lines.push(`Note: ${x}`));
    // Workplan 2.2: a question the class missed in last lesson's ABCD cards goes back on the Do Now
    (s.dnVotes || []).forEach((x) => lines.push(`Put on the Do Now (missed in the ABCD cards in ${x.from}, ${x.pct}% right${x.wrong ? ', most picked ' + x.wrong : ''}): ${x.q}` +
      (x.opts ? ` Options: ${x.opts}.` : '') + (x.right ? ` Answer: ${x.right}.` : '') + (x.why ? ` Misconception: ${x.why}` : '')));
    CHECKS.forEach(([k, t]) => { if ((s.checks || {})[k]) lines.push(t + '.'); });
    EXTRAS.forEach(([k, , t]) => { if ((s.adds || {})[k]) lines.push(t + '.'); });
    if (s.book && s.bookOn) lines.push(`Textbooks out: ${s.book}.`);
    const about = (profile && profile.notes) || c.profile;
    if (about) lines.push(`About ${s.cls}: ${about}`);
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
  /* ------------------------------------------------------------- homework dates
     Patryk's rule (design-audit/planner-tabs/spec.md 1.2, 2026-10-18): homework set on a lesson day is
     due at that class's lesson closest to 7 days later, as long as it is 4 to 9 days later; due 8:00.
     No lesson in 4 to 9 days (half term, INSET): the first lesson after, and the page says why. */
  // That class's lessons on one day (periods, in order), from the A/B timetable; none on a non-teaching day.
  function lessonsOn(data, cls, d) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6 || ((data.terms || []).length && !isTeachingDay(data, d))) return [];
    const L = weekLetter(data, d);
    return ((data.timetable || {})[L] || []).filter((s) => s.cls === cls && s.day === dow - 1).map((s) => s.period).sort((a, b) => a - b);
  }
  // The class's next lesson day from a date (that day too when `inclusive`): { date, period }.
  function nextLessonDay(data, cls, from, inclusive) {
    let d = typeof from === 'string' ? parse(from) : new Date(from.getFullYear(), from.getMonth(), from.getDate());
    if (!inclusive) d = addDays(d, 1);
    for (let n = 0; n < 120; n++, d = addDays(d, 1)) { const p = lessonsOn(data, cls, d); if (p.length) return { date: iso(d), period: p[0] }; }
    return null;
  }
  function dueFor(data, cls, setOn) {
    const s = parse(setOn);
    const days = [];
    for (let k = 1; k <= 70; k++) if (lessonsOn(data, cls, addDays(s, k)).length) days.push(k);
    if (!days.length) return null;
    const near = days.filter((k) => k >= 4 && k <= 9).sort((a, b) => Math.abs(a - 7) - Math.abs(b - 7) || a - b);
    if (near.length) return { due: iso(addDays(s, near[0])), days: near[0], why: '' };
    const k = days.find((x) => x > 9) || days[days.length - 1];
    // why it moved: a holiday (half term) or an INSET day in the way
    let hol = 0, inset = false;
    for (let j = 1; j < k; j++) {
      const d = addDays(s, j), str = iso(d);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      if ((data.inset || []).includes(str)) inset = true;
      else if ((data.terms || []).length && !(data.terms || []).some(([a, b]) => str >= a && str <= b)) hol++;
    }
    const why = hol ? (hol <= 10 ? 'half term' : 'holiday') : inset ? 'INSET day' : 'no lesson 4 to 9 days later';
    return { due: iso(addDays(s, k)), days: k, why };
  }
  // When that class's lessons end on a day ("15:10"), for "Schedule it" (a double lesson: its last period).
  function lessonEnd(data, cls, date) {
    const ps = lessonsOn(data, cls, parse(date));
    if (!ps.length) return '';
    const t = periodTime(data, cls, ps[ps.length - 1]);
    return t ? t.split('-')[1] : '';
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

  const api = { dueFor, nextLessonDay, lessonsOn, lessonEnd, recs, findRecord, setRecord, recordChanges, remapRecords, migrateMarks, cascade, revisionSlot, unitBefore, applyAdded, addedNum, remapWeek, lessonId, applyMarks, classReport, topicList, wouldSkip, setSlot, markLesson, refillClass, planFrom, periodTime, calendarEvents, DAYS, iso, parse, addDays, mondayOf, isTeachingDay, nextSchoolDay, weekLetter, progressBefore, next, autofill, moveSlot, refillAfter,
    EXTRAS, extrasSuggested, gradeFor, hwCoverage, hwStatus, lastResults, lastVotes, doNowFromVote, mostMissed, lessonSlot, testSlot, notHappened, slotDone, slotDay, fromFilled, reflowWeek, CHECKS, sheetCells, sheetModel, setsCount, printList, buildPrompt, carryForward, equipCell, lessonCell, setsLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PlannerLogic = api;
})(typeof window !== 'undefined' ? window : this);
