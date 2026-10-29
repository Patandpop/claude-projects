// node planner/test-logic.js — checks the planner app's logic against the real exported data.
'use strict';
const path = require('path');
const fs = require('fs');
const P = require('./logic.js');
const dataPath = path.join(__dirname, 'planner-data.json');
if (!fs.existsSync(dataPath)) { console.error('run: node science-lesson/references/planner-catalogue.js --export planner/planner-data.json'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let fails = 0;
const ok = (c, m) => { console.log(`${c ? '  ok  ' : '  FAIL'} ${m}`); if (!c) fails++; };

// 1. Week letters match his sheets: 7 Sep A, 14 Sep B, 19 Oct A, 2 Nov B (holiday week skipped)
ok(P.weekLetter(data, P.parse('2026-09-07')) === 'A', 'w/c 7 Sep is Week A');
ok(P.weekLetter(data, P.parse('2026-09-14')) === 'B', 'w/c 14 Sep is Week B');
// stale-tab guard (1.5): only the records that changed travel, and a record that emptied is sent as removed
{
  const before = [{ cls: '7MLA', i: 1, key: 'a', done: true }, { cls: '7MLA', i: 2, key: 'b', done: true }, { cls: '8XP', i: 0, key: 'c', skip: true }];
  const after = [{ cls: '7MLA', i: 1, key: 'a', done: true }, { cls: '7MLA', i: 2, key: 'b', done: false }, { cls: '9AS', i: 3, key: 'd', done: true }];
  const ch = P.recordChanges(before, after);
  ok(ch.length === 3 && ch.some((r) => r.key === 'b' && r.done === false) && ch.some((r) => r.key === 'd') && ch.some((r) => r.key === 'c' && r.cls === '8XP' && r.removed) && !ch.some((r) => r.key === 'a'), 'recordChanges: changed, new and removed records only');
  ok(P.recordChanges(after, after).length === 0 && P.recordChanges(null, []).length === 0, 'recordChanges: nothing to send when nothing changed');
}
ok(P.weekLetter(data, P.parse('2026-10-19')) === 'A', 'w/c 19 Oct is Week A');
ok(P.weekLetter(data, P.parse('2026-11-02')) === 'B', 'w/c 2 Nov is Week B (half term not counted)');

// 2. Autofill 12 Oct: every class slot filled, no class gets the same lesson twice
const w = P.autofill(data, {}, P.parse('2026-10-12'));
ok(w.letter === 'B', 'w/c 12 Oct is Week B');
const lessons = w.slots.filter((s) => s.kind === 'lesson');
const dup = lessons.filter((s, k) => lessons.findIndex((t) => t.cls === s.cls && t.i === s.i) !== k);
ok(lessons.length >= 15 && !dup.length, `12 Oct: ${lessons.length} lessons, no repeats within a class`);

// 3. INSET: Thu 22 + Fri 23 Oct have no lessons
const w19 = P.autofill(data, {}, P.parse('2026-10-19'));
ok(w19.slots.filter((s) => s.day >= 3).every((s) => s.kind === 'inset'), '22-23 Oct INSET: no lessons');

// 4. Saved weeks carry progress: saving 12 Oct means 19 Oct continues after it
const saved = { '2026-10-12': w };
const w19b = P.autofill(data, saved, P.parse('2026-10-19'));
const firstC = (wk, cls) => wk.slots.find((s) => s.cls === cls && s.kind === 'lesson');
const a12 = w.slots.filter((s) => s.cls === '11S2' && s.kind === 'lesson').map((s) => s.i);
const b19 = firstC(w19b, '11S2');
ok(b19 && b19.i > Math.max(...a12), '19 Oct carries on from the saved 12 Oct week (11S2)');

// 5. Shift: dragging a class's first lesson of the week onto its second slot re-fills the rest
const idx = w.slots.findIndex((s) => s.cls === '9XS' && s.kind === 'lesson');
const idx2 = w.slots.findIndex((s, k) => k > idx && s.cls === '9XS');
const moved = P.moveSlot(data, {}, w, idx, idx2, 'shift');
ok(moved.slots[idx].kind === 'free' && moved.slots[idx2].i === w.slots[idx].i, 'shift: lesson moves to the later slot, earlier slot freed');
const swapped = P.moveSlot(data, {}, w, idx, idx2, 'swap');
ok(swapped.slots[idx].i === w.slots[idx2].i && swapped.slots[idx2].i === w.slots[idx].i, 'swap: two slots trade lessons');

// 6. Carry-over lands on that class's next lesson
const cf = P.carryForward(w, idx, 'Review section (Apply Q4-6)');
ok(cf.carriedTo > idx && cf.week.slots[cf.carriedTo].carry.length === 1, 'carry-over attaches to the class\'s next lesson');
ok(/straight after the Do Now/.test(P.buildPrompt(data, cf.week.slots[cf.carriedTo])), 'build prompt includes the carry-over');

// 7. Technician cells: lesson + equipment rows, class sizes
const cells = P.sheetCells(data, w);
ok(cells.some((c) => c.addr === 'R1' && c.value === 'Week B') && cells.length > 40, `sheet cells: ${cells.length} written incl. Week label`);

// 8. Double lessons: 12C Tue P1+P2 in Week A (w/c 19 Oct) is ONE lesson
const wa = P.autofill(data, {}, P.parse('2026-10-19'));
const d12 = wa.slots.filter((s) => s.cls === '12C' && s.day === 1);
ok(d12.length === 2 && d12[0].i === d12[1].i && d12[1].double, '12C Tue P1+P2 double = one lesson');

// 9. Calendar events: real times per key stage, double merged into one event
const ev = P.calendarEvents(data, wa);
const e12 = ev.filter((e) => e.cls === '12C' && e.date === '2026-10-20');
ok(e12.length === 1 && e12[0].start.endsWith('09:00') && e12[0].end.endsWith('11:05'), '12C double = one calendar event 09:00-11:05');
const e9 = P.calendarEvents(data, w).find((e) => e.cls === '9XS' && e.start.endsWith('10:25'));
ok(!!e9, '9XS P2 uses KS3 time 10:25');
ok(!ev.some((e) => e.date === '2026-10-22'), 'no calendar events on INSET day');

// 10. Patryk's rules (2026-10-04)
const lessonsOf = (wk, cls) => wk.slots.filter((s) => s.cls === cls && s.kind === 'lesson').map((s) => data.classes[cls].seq[s.i]);
const y7 = lessonsOf(w, '7MLA');
ok(y7.length && y7.every((L) => L.topic === 'B1 Cells'), `7MLA never goes back a topic (12 Oct: ${y7.map((L) => 'L' + L.num).join(', ')} of B1 Cells)`);
const c10 = lessonsOf(w, '10C2').map((L) => L.num);
ok(c10[0] === 9 && c10[1] === 11, `10C2 fills the missed P1 lessons first (L9, L11), got ${c10.join(', ')}`);
ok(w.slots.some((s) => s.cls === '9AS' && s.kind === 'test' && /P3 Particles — end-of-topic TEST/.test(s.text)), '9AS gets its P3 test after the revision');
// 12. Revision and test are separate (2026-10-05): a finished topic gets a revision lesson, then the test
const seqOf = (cls) => data.classes[cls].seq;
const st13 = P.progressBefore(data, {}, P.parse('2026-10-12'))['13D'];
const u13 = st13.unit;
seqOf('13D').forEach((L, k) => { if (L.unit === u13) st13.taught.add(k); });
const r1 = P.next(seqOf('13D'), st13);
ok(r1 && r1.revision === u13, `a topic with every lesson taught gets a REVISION lesson first (13D ${u13})`);
P.next(seqOf('13D'), st13); st13.revised.add(u13);
const r2 = P.next(seqOf('13D'), st13);
ok(r2 && r2.test === u13, 'after the revision lesson comes the TEST');
const m9 = w.slots.findIndex((s) => s.cls === '9AS' && s.kind === 'lesson' && /C1/.test(seqOf('9AS')[s.i].unit));
ok(m9 >= 0 && /^P3/.test(P.unitBefore(data, {}, w, '9AS', w.slots[m9])), 'Test / Revision on the 9AS slot that starts C1 is for P3 (the topic they were in), not C1');
// 13. Lessons he adds in the planner go into the list after the lesson he chose
const d2 = JSON.parse(JSON.stringify(data));
const L3 = d2.classes['7MLA'].seq.find((L) => /animal cells/i.test(L.title));
const num = P.addedNum(d2, '7MLA', L3.unit, L3.num);
P.applyAdded(d2, [{ cls: '7MLA', unit: L3.unit, afterKey: P.lessonId(L3), num, title: 'Cell Models', rel: null }]);
const k3 = d2.classes['7MLA'].seq.indexOf(L3);
ok(d2.classes['7MLA'].seq[k3 + 1].title === 'Cell Models' && num === L3.num + 'a', `added lesson sits after L${L3.num} as L${num}`);
const ict = Object.values(data.classes).flatMap((c) => c.seq).filter((L) => /\b(ict|chromebooks?|it room)\b/i.test((L.eq || '') + ' ' + (L.print || '')));
ok(!ict.length, `no ICT / Chromebook suggestions anywhere (${ict.length} found)`);
ok(Array.isArray((data.filled || {})['2026-10-05']) && data.filled['2026-10-05'].some((s) => /^Cover:/.test(s.text)), 'filled weeks exported as taught (w/c 5 Oct covers kept)');

// 11. Never skip a lesson (Patryk 2026-10-04)
const slotsOf = (wk, cls) => wk.slots.map((s, k) => ({ s, k })).filter((o) => o.s.cls === cls && o.s.kind === 'lesson' && !o.s.double);
const m7 = slotsOf(w, '7MLA');
const firstI = m7[0].s.i, laterI = data.classes['7MLA'].seq.findIndex((L, k) => k > m7[m7.length - 1].s.i && L.unit === data.classes['7MLA'].seq[firstI].unit && !L.optional);
const changed = P.setSlot(data, {}, w, m7[0].k, P.lessonSlot(data, '7MLA', laterI), {});
const after = slotsOf(changed, '7MLA').map((o) => o.s.i);
ok(after[0] === laterI && after.includes(firstI) && new Set(after).size === after.length, `changing 7MLA's first lesson keeps the replaced one later in the week (${after.join(',')})`);
const lastK = m7[m7.length - 1].k;
const late = P.setSlot(data, {}, w, lastK, P.lessonSlot(data, '7MLA', firstI), {});
ok(slotsOf(late, '7MLA').slice(0, -1).every((o, n) => o.s.i === m7[n].s.i), 'changing a later slot never rewrites the earlier ones');
const covered = P.setSlot(data, {}, w, m7[0].k, Object.assign(P.lessonSlot(data, '7MLA', firstI), { cover: true }), {});
ok(!slotsOf(covered, '7MLA').slice(1).some((o) => o.s.i === firstI) && /^Cover: /.test(P.lessonCell(data, covered.slots[m7[0].k])), 'cover work for a lesson counts as taught (not planned again)');
// Class away (Patryk 2026-10-09): nothing is lost, the lesson moves to the class's next period
const away = P.setSlot(data, {}, w, m7[0].k, { kind: 'away', i: null, key: null, unit: null, text: 'trip', eq: 'N/A', sets: null, print: '' }, {});
const awayI = slotsOf(away, '7MLA').map((o) => o.s.i);
ok(away.slots[m7[0].k].kind === 'away' && awayI[0] === firstI && P.lessonCell(data, away.slots[m7[0].k]) === 'Class away: trip',
  `class away: 7MLA's lesson moves on to their next period (${awayI.join(',')})`);
const reflowed = P.refillClass(data, {}, JSON.parse(JSON.stringify(away)), '7MLA', {}, 0);
ok(reflowed.slots[m7[0].k].kind === 'away', 'class away stays put when the week is re-planned');
// one each: a set per pupil
ok(P.setsCount({ sets: 'each' }, 28) === 28 && P.setsLabel('each') === 'one each' && P.setsCount({ sets: 'threes' }, 28) === 10, 'sets: "one each" = class size');
// revision lesson prompt, and reuse of a lesson made for another class this week
{
  const u = data.classes['8XP'].seq[0].unit;
  const rv = Object.assign(P.revisionSlot(data, '8XP', u), { cls: '8XP', day: 0, period: 1 });
  const pr = P.buildPrompt(data, rv, null);
  ok(/REVISION lesson \(lessonType "revision"\)/.test(pr) && /Lessons in the topic: L\d/.test(pr) && !/review/i.test(pr.split('\n')[0]), 'revision lesson prompt asks for a revision lesson built from the topic');
  const k = data.classes['8XP'].seq.findIndex((L) => L.rel);
  const L = data.classes['8XP'].seq[k];
  const k2 = data.classes['8AG'].seq.findIndex((x) => x.rel === L.rel);
  if (k2 >= 0) {
    const a = Object.assign(P.lessonSlot(data, '8XP', k, {}), { cls: '8XP', day: 1, period: 3, own: true });
    const b = Object.assign(P.lessonSlot(data, '8AG', k2, {}), { cls: '8AG', day: 4, period: 1 });
    const wk = { slots: [a, b] };
    ok(/8XP has the same lesson this week \(Tue P3, made by Patryk himself\): if it is already made, reuse it/.test(P.buildPrompt(data, b, null, wk)), 'same lesson for another class this week: the prompt says reuse and adapt');
    const c = Object.assign({}, b, { sameAs: { cls: '9XS', title: 'Microscopes', rel: 'Year 9/Biology/B1 Cells/Lesson 3' } });
    ok(/Reuse the lesson made for 9XS \(Microscopes, Drive folder Lessons\/Year 9/.test(P.buildPrompt(data, c, null, wk)), 'a lesson he points at ("same as") is copied and adapted, not built from scratch');
  } else ok(false, 'no lesson shared by 8XP and 8AG to test reuse with');
}
const w19u = P.autofill(data, {}, P.parse('2026-10-19'));
const f19 = firstC(w19u, '11S2');
ok(f19 && !a12.includes(f19.i), '19 Oct with 12 Oct NOT saved still carries on after it (no lesson planned twice)');
const autoOpt = Object.entries(data.classes).flatMap(([cls]) => slotsOf(w, cls).filter((o) => data.classes[cls].seq[o.s.i].optional));
ok(!autoOpt.length, 'optional lessons are never planned automatically');
ok(data.classes['10C2'].seq.some((L) => L.nofolder && /circuit symbols/i.test(L.title)), '10C2 P2 "Circuit symbols" (technician guide, no folder) is in the list');
ok(data.classes['7MLA'].seq.some((L) => /mrs gren/i.test(L.title)) && data.classes['9AS'].seq.some((L) => /history of the atom/i.test(L.title)), 'oddly named folders ("Lesson 1 MRS GREN", "lesson 7 - ...") are in the list');
const warn = P.wouldSkip(data, {}, w, m7[0].k, P.testSlot(data, '7MLA', data.classes['7MLA'].seq[firstI].unit));
ok(warn.length >= 3, `a test now would skip ${warn.length} untaught 7MLA lessons, and says so`);
const ticked = P.markLesson(data, {}, w, '7MLA', firstI, true, {});
ok(!slotsOf(ticked, '7MLA').some((o) => o.s.i === firstI), 'ticking a lesson off removes it from the week and the rest re-flows');
// shared lesson state (2026-10-12): the tick is one record per lesson, so it counts in EVERY week
ok(data.records.length === 1 && data.records[0].key && data.records[0].done === true, 'a tick is saved once, as a lesson record (not inside the week)');
const w26 = P.autofill(data, { '2026-10-12': ticked }, P.parse('2026-10-26'));
const tlEarlier = P.topicList(data, {}, w, '7MLA', data.classes['7MLA'].seq[firstI].unit, null);
ok(tlEarlier.find((x) => x.k === firstI).state === 'taught', 'the tick shows in the week view too, not only where it was made');
ok(!w26.slots.some((x) => x.cls === '7MLA' && x.i === firstI), 'and later weeks never plan it');
P.markLesson(data, {}, w, '7MLA', firstI, null, {});
ok(!(data.records || []).length, 'unticking back to "as the records say" removes the record');
data.records = [];
const tl = P.topicList(data, {}, w, '7MLA', data.classes['7MLA'].seq[firstI].unit, { day: w.slots[m7[0].k].day, period: w.slots[m7[0].k].period });
ok(tl.find((x) => x.k === firstI).next && tl.some((x) => x.state === 'taught' && x.when && x.when.wrote), 'lesson list: ★ on the right lesson, taught ones show what he wrote');
// 14. Equipment: no filler, concise, sets only for real kit (Patryk 2026-10-07)
const allL = Object.values(data.classes).flatMap((c) => c.seq);
ok(!allL.some((L) => /see teacher/i.test(L.eq || '')), 'no "see teacher" filler: unknown equipment is left empty');
// Patryk 2026-10-07: plain names, and bench kit (clamps, stands, tripods, heat mats, Bunsens, racks) never listed
const items = allL.flatMap((L) => String(L.eq || '').replace(/ …$/, '').split(/,\s*/));
ok(!items.some((x) => /^(clamps?|(clamp |retort )?stands?|tripods?|heat ?(proof )?mats?|bunsen( burners?)?|test ?tube racks?)$/i.test(x.trim())), 'bench kit is never listed');
ok(!items.some((x) => /(round|flat)[- ]bottom/i.test(x)), 'plain names: "conical flask", not "flat bottom conical flasks"');
ok(allL.every((L) => !L.eq || L.eq.split(', ').length <= 9), 'equipment is a short item list (at most 8 items)');
ok(!allL.some((L) => L.sets && !/beaker|microscope|slide|tube|magnet|meter|power|lamp|scale|balance|spring|mass|tile|ruler|kit|sample|trolley|onion|iodine|solution|stand|clamp|heater|thermometer|kettle|wire|circuit|bulb|resistor|batter|funnel|filter|crucible|tong|spatula|petri|agar|pipette|cylinder|gate|ramp|forceps|scalpel|dissect|bunsen|tripod|gauze|flask|compass|weight|bung|egg|timer|watch|joulemeter|lens|prism|ray box|demo/i.test(L.eq)),
  'sets are only suggested for real practical kit or demos');
// every lesson folder on Drive is in the class's list (home only: needs G:)
const DRIVE = 'G:/My Drive/Beechen Cliff Science/Lessons';
if (fs.existsSync(DRIVE)) {
  const lost = [];
  for (const [cls, c] of Object.entries(data.classes)) {
    const dirs = [...new Set(c.seq.filter((L) => L.rel).map((L) => L.rel.split('/').slice(0, -1).join('/')))];
    for (const d of dirs) for (const f of fs.readdirSync(path.join(DRIVE, d))) {
      if (!/^lesson\s*\d/i.test(f) || !fs.statSync(path.join(DRIVE, d, f)).isDirectory()) continue;
      if (/\(separate\)|\btriple\b|\b(chem|phys|bio)(istry|ics|logy)?\s*only\b/i.test(f) && cls === '10C2') continue;
      if (!c.seq.some((L) => L.rel === `${d}/${f}`)) lost.push(`${cls} ${d}/${f}`);
    }
  }
  // split topics (9XS B1 / B2 blocks) list each folder in one block only, which is fine
  ok(!lost.length, `every Drive lesson folder is in its class's list (${lost.length} missing${lost.length ? ': ' + lost.slice(0, 3).join('; ') : ''})`);
}

// 20. Patryk 2026-10-08: lessons already taught this week can be ticked; a lesson that didn't happen moves on
{
  const wk = P.autofill(data, {}, P.parse('2026-10-12'));
  const idx = wk.slots.findIndex((s) => s.kind === 'lesson' && s.day === 0);
  const s0 = wk.slots[idx], unit = data.classes[s0.cls].seq[s0.i].unit;
  const row = (week, today) => P.topicList(data, {}, week, s0.cls, unit, { day: 4, period: 5 }, {}, today).find((o) => o.k === s0.i);
  ok(row(wk, '2026-10-12').state === 'done', 'a lesson planned on a day that has come shows as taught (ticked)');
  ok(row(wk, '2026-10-11').state === 'planned', 'before that day it is still just planned');
  const later = wk.slots.filter((s, k) => k > idx && s.cls === s0.cls).map((s) => s.i);
  const nw = P.notHappened(data, {}, wk, [idx], {});
  const moved = nw.slots.find((s, k) => k > idx && s.cls === s0.cls && s.kind === 'lesson');
  ok(nw.slots[idx].kind === 'custom' && (!moved || moved.i === s0.i || later.length === 0), 'unticked ("did not happen"): the lesson moves into the class\'s next period, nothing is lost');
}

// 23. Patryk 2026-10-08: past weeks are editable and the planner is the record
{
  const lastF = data.filledWeeks.slice(-1)[0];
  const fw = P.fromFilled(data, P.parse(lastF));
  const lessonSlots = fw.slots.filter((s) => s.kind === 'lesson');
  ok(fw && lessonSlots.length > 0 && fw.slots.every((s) => s.pinned), `a Planner.xlsx week (${lastF}) opens as a normal week: ${lessonSlots.length} lessons recognised, all pinned`);
  // seen from the start of that week, its own lessons are not yet taught
  const s0 = lessonSlots[0];
  const before = P.progressBefore(data, {}, P.parse(lastF))[s0.cls];
  ok(!before.taught.has(s0.i), 'looking at a past week: lessons taught that week or later do not count as taught yet');
  // edit it: that lesson did not happen -> next week plans it again
  const edited = P.notHappened(data, {}, fw, [fw.slots.indexOf(s0)], {});
  const saved = { [lastF]: edited };
  const nextMon = P.addDays(P.parse(lastF), 7);
  const after = P.progressBefore(data, saved, nextMon)[s0.cls];
  const nxt = P.autofill(data, saved, nextMon);
  ok(!after.taught.has(s0.i) && nxt.slots.some((s) => s.cls === s0.cls && s.i === s0.i), 'changing a past week re-plans the next week (the lesson that did not happen comes back)');
  // skip: never planned, shown as skipped
  const wk = P.autofill(data, {}, nextMon);
  const t = wk.slots.find((s) => s.kind === 'lesson');
  const sk = P.markLesson(data, {}, wk, t.cls, t.i, true, {}, true);
  const row = P.topicList(data, {}, sk, t.cls, data.classes[t.cls].seq[t.i].unit, { day: 0, period: 1 }, {}).find((o) => o.k === t.i);
  ok(row.state === 'skipped' && !sk.slots.some((s) => s.cls === t.cls && s.i === t.i), 'skip: the lesson leaves the plan and shows as skipped');
}

// 22. 10C2 is Combined: no separate-only lessons (Patryk 2026-10-08)
{
  const bad = data.classes['10C2'].seq.filter((L) => /\(separate\)|\btriple\b|\b(chem|phys|bio)(istry|ics|logy)?\s*only\b/i.test(L.title));
  ok(!bad.length, '10C2 (Combined) has no separate-only lessons' + (bad.length ? ': ' + bad.map((L) => L.title).join('; ') : ''));
  const items = Object.values(data.classes).flatMap((c) => c.seq).map((L) => L.print || '');
  ok(!items.some((p) => /pink\s+gcse/i.test(p)), 'no "Pink GCSE" prefixes in the printing text');
}

// 21. Tests: the week AFTER the revision lesson; topics with no test folder get revision only
{
  const saved = {}; const revWeek = {}; const testWeek = {}; const sameWeek = [];
  let m = P.parse('2026-10-12');
  for (let n = 0; n < 14; n++, m = P.addDays(m, 7)) {
    const wk = P.autofill(data, saved, m); saved[P.iso(m)] = wk;
    for (const s of wk.slots) {
      const k = s.cls + '|' + s.unit;
      if (s.kind === 'revision') revWeek[k] = wk.monday;
      if (s.kind === 'test') { testWeek[k] = wk.monday; if (revWeek[k] === wk.monday) sameWeek.push(k); }
    }
  }
  ok(Object.keys(testWeek).length > 0 && !sameWeek.length, `${Object.keys(testWeek).length} tests planned over 14 weeks, none in the same week as its revision lesson${sameWeek.length ? ': ' + sameWeek.join(', ') : ''}`);
  const noTest = Object.keys(testWeek).filter((k) => { const [cls, unit] = k.split('|'); const L = data.classes[cls].seq.find((x) => x.unit === unit); return L && L.hasTest === false; });
  ok(!noTest.length, 'no test is planned for a topic without a test folder' + (noTest.length ? ': ' + noTest.join(', ') : ''));
}

// Make next day: the next school day, not tomorrow's date (Patryk 2026-10-12)
{
  const nsd = (s) => P.iso(P.nextSchoolDay(data, new Date(s)));
  ok(nsd('2026-10-12T21:00') === '2026-10-13', 'Monday evening: next day is Tuesday');
  ok(nsd('2026-10-13T00:30') === '2026-10-13', 'after midnight Monday night: still Tuesday, not Wednesday');
  ok(nsd('2026-10-16T19:00') === '2026-10-19', 'Friday evening: Monday');
  ok(nsd('2026-10-21T20:00') === '2026-11-02', 'day before INSET and half term: first day back');
}

// slide-over (2026-10-12): a lesson lost this week pushes the class's later SAVED weeks along
{
  data.records = [];
  const wA = P.autofill(data, {}, P.parse('2026-11-02')), wB = P.autofill(data, { '2026-11-02': wA }, P.parse('2026-11-09'));
  const sv = { '2026-11-02': wA, '2026-11-09': wB };
  const idx = wA.slots.findIndex((x) => x.cls === '7MLA' && x.kind === 'lesson' && !x.double);
  const lost = wA.slots[idx].i;
  const away = P.setSlot(data, sv, wA, idx, { kind: 'away', i: null, key: null, unit: null, text: 'Trip' }, {});
  sv['2026-11-02'] = away;
  const moved = P.cascade(data, sv, '2026-11-02', P.parse('2026-11-02'), {});
  const firstB = sv['2026-11-09'].slots.find((x) => x.cls === '7MLA' && x.kind === 'lesson');
  const lastA = wA.slots.filter((x) => x.cls === '7MLA' && x.kind === 'lesson').slice(-1)[0];
  ok(moved.length === 1 && firstB.i !== wB.slots.find((x) => x.cls === '7MLA' && x.kind === 'lesson').i, 'class away: next week is re-planned straight away (slide-over)');
  ok(away.slots.some((x) => x.cls === '7MLA' && x.i === lost) || firstB.i === lastA.i, 'and the lost lesson is not dropped');
  const old = P.autofill(data, {}, P.parse('2026-11-02')); old.marks = [{ cls: '7MLA', i: lost, done: true }];
  const mg = P.migrateMarks(data, { '2026-11-02': old });
  ok(mg.length === 1 && !old.marks.length && P.findRecord(data, '7MLA', lost).done === true, 'ticks saved inside old weeks move into the lesson records');
  data.records = [];
}

// Homework due dates (2026-10-18, spec 1.2): the lesson closest to 7 days later, within 4 to 9 days;
// none in range (half term, INSET): the first lesson after, with the reason. Made-up timetable so the
// checks do not move when his real timetable changes.
{
  const T = (cls, days, period) => days.map((day) => ({ day, period, cls }));
  const tt = [...T('XN', [0, 2, 4], 1), ...T('X2', [0, 3], 3), ...T('XF', [0, 4], 2), ...T('XI', [4], 5), { day: 4, period: 6, cls: 'XI' }];
  const hd = { terms: [['2026-09-07', '2026-10-21'], ['2026-11-02', '2026-12-18']], inset: ['2026-10-22', '2026-10-23', '2026-11-20'], weekAStart: '2026-09-07',
    timetable: { A: tt, B: tt }, classes: { XI: { year: 10 } }, periodTimes: { ks4: { P5: '13:40-14:40', P6: '14:40-15:40' } } };
  const d1 = P.dueFor(hd, 'XN', '2026-10-05');
  ok(d1.due === '2026-10-12' && d1.days === 7 && !d1.why, 'homework due: a normal week, Monday to next Monday (7 days)');
  const d2 = P.dueFor(hd, 'X2', '2026-10-08');
  ok(d2.due === '2026-10-15' && !d2.why, 'homework due: a 2-lessons-a-week class (Mon, Thu): Thursday to next Thursday, not Monday (4 days)');
  const d2b = P.dueFor(hd, 'X2', '2026-10-05');
  ok(d2b.due === '2026-10-12', 'homework due: Mon, Thu class set on Monday: next Monday (7), not Thursday (3 days, too soon)');
  const d3 = P.dueFor(hd, 'XF', '2026-10-16');
  ok(d3.due === '2026-11-02' && d3.why === 'half term', 'homework due: the Friday before half term is due the first lesson back, "half term"');
  const d4 = P.dueFor(hd, 'XI', '2026-11-13');
  ok(d4.due === '2026-11-27' && d4.why === 'INSET day', 'homework due: an INSET day on the due day moves it to the next lesson, "INSET day"');
  ok(P.nextLessonDay(hd, 'XF', '2026-10-17', true).date === '2026-10-19' && P.nextLessonDay(hd, 'XF', '2026-10-19', false).date === '2026-11-02', 'next lesson day skips weekends, INSET (23 Oct) and half term');
  ok(P.lessonEnd(hd, 'XI', '2026-11-06') === '15:40', 'a double lesson ends at its last period (for "Schedule it")');
  // the real data: every class has a due date within 9 days in a normal week
  const real = Object.keys(data.classes).map((c) => [c, P.dueFor(data, c, P.nextLessonDay(data, c, '2026-11-09', true).date)]);
  ok(real.every(([, r]) => r && r.days >= 4 && r.days <= 9 && !r.why), 'real timetable, w/c 9 Nov: every class gets a due date 4 to 9 days on (' + real.map(([c, r]) => c + ' ' + (r && r.days)).join(', ') + ')');
}

// Homework and Assessment tabs (approved 2026-10-19)
{
  const bands = [{ g: '7', min: 70 }, { g: '9', min: 85 }, { g: '4', min: 40 }];
  ok(P.gradeFor(86, bands) === '9' && P.gradeFor(70, bands) === '7' && P.gradeFor(39, bands) === 'U' && P.gradeFor(50, []) === '', 'grades: from his boundaries (any order); none set = no grade, never made up');
  const row = { status: 'drafted', dueOn: '2026-10-27', formId: 'F' };
  // learning loop M8 (2026-10-22): the lesson card shows the newest homework due in the 14 days before it
  const resRows = [{ cls: '9XS', dueOn: '2026-10-06', done: 20, avg: 50, questions: [] },
    { cls: '9XS', dueOn: '2026-10-19', done: 22, avg: 64, questions: [{ key: '1', pct: 80 }, { key: '2', pct: 30 }, { key: '3', pct: 55 }, { key: '4', pct: 90 }] },
    { cls: '9XS', dueOn: '2026-10-27', done: 0, avg: null, questions: [] }, { cls: '9AS', dueOn: '2026-10-19', done: 9, avg: 70, questions: [] }];
  const lr = P.lastResults(resRows, '9XS', '2026-10-21');
  ok(lr && lr.dueOn === '2026-10-19' && lr.weak.map((q) => q.key).join(',') === '2,3,1', 'lesson card: newest homework due before the lesson, its 3 weakest questions first');
  ok(P.lastResults(resRows, '9XS', '2026-11-20') === null && P.lastResults(resRows, '10C2', '2026-10-21') === null, 'lesson card: nothing older than 14 days, nothing for another class');
  // workplan 2.3 (2026-10-29): most-missed questions across classes, lowest first, nothing nobody did
  const mm = P.mostMissed(resRows.concat([{ cls: '9AS', id: 'h9', title: 'Waves', dueOn: '2026-10-20', done: 9, questions: [{ key: '1', pct: 10 }, { key: '2', pct: 100 }] }]), { since: '2026-10-10' });
  ok(mm.map((q) => q.cls + q.key).join(',') === '9AS1,9XS2,9XS3,9XS1,9XS4', 'most missed: every class, lowest % first, full marks and old or undone homework left out');
  ok(P.mostMissed(resRows, { cls: '9AS' }).length === 0 && P.mostMissed(resRows, { cls: '9XS', n: 2 }).length === 2, 'most missed: one class, and a limit');
  // workplan 2.2 (2026-10-29): ABCD card votes from the class's last voted lesson on the next lesson card
  const vt = [{ cls: '9XS', key: 'K1', title: 'Osmosis', when: '2026-10-13', q: 1, pct: 20, right: 'B', wrong: 'A' },
    { cls: '9XS', key: 'K2', title: 'Diffusion', when: '2026-10-19', q: 1, pct: 90, right: 'A', wrong: 'C' },
    { cls: '9XS', key: 'K2', title: 'Diffusion', when: '2026-10-19', q: 2, pct: 40, right: 'C', wrong: 'D', why: 'thinks particles stop' },
    { cls: '9XS', key: 'K2', title: 'Diffusion', when: '2026-10-19', q: 2, pct: 55, right: 'C', wrong: 'D', why: 'thinks particles stop' },
    { cls: '9XS', key: 'K2', title: 'Diffusion', when: '2026-10-19', q: 3, pct: 100, right: 'D', wrong: '' },
    { cls: '9XS', key: 'K3', title: 'Today', when: '2026-10-21', q: 1, pct: 10, right: 'A', wrong: 'B' }, { cls: '9AS', key: 'K2', title: 'Diffusion', when: '2026-10-20', q: 1, pct: 5, right: 'A', wrong: 'B' }];
  const lv = P.lastVotes(vt, '9XS', '2026-10-21');
  ok(lv && lv.key === 'K2' && lv.n === 3 && lv.avg === 82 && lv.weak.map((v) => v.q).join(',') === '2,1', 'lesson card: votes from the last voted lesson before it (not that day), newest vote per question, weakest first, full marks left out');
  ok(P.lastVotes(vt, '9XS', '2026-11-20') === null && P.lastVotes(vt, '10C2', '2026-10-21') === null, 'lesson card votes: nothing older than 14 days, nothing for another class');
  const dv = P.doNowFromVote(lv.weak[0], [{ q: 'Q one' }, { q: 'Why does diffusion stop?', o: ['never', 'heat', 'equal concentration', 'cold'], a: 'C' }]);
  const dslot = { kind: 'lesson', cls: '9XS', i: 0, dnVotes: [dv] };
  ok(/Put on the Do Now \(missed in the ABCD cards in Diffusion, 55% right, most picked D\): Why does diffusion stop\? Options: A never \/ B heat \/ C equal concentration \/ D cold\. Answer: C\. Misconception: thinks particles stop/.test(P.buildPrompt(data, dslot)), 'a missed vote question put on the Do Now is in the build request, with its options, answer and misconception');
  ok(P.hwStatus(row, { state: 'DRAFT' }, '2026-10-20', 0) === 'drafted' && P.hwStatus(row, { state: 'DRAFT', scheduled: true }, '2026-10-20', 0) === 'scheduled', 'status: drafted, scheduled');
  ok(P.hwStatus(row, { state: 'PUBLISHED' }, '2026-10-20', 3) === 'live' && P.hwStatus(row, { state: 'PUBLISHED' }, '2026-10-27', 0) === 'due', 'status: posted = live; due day with no responses = due');
  ok(P.hwStatus(row, { state: 'PUBLISHED' }, '2026-10-27', 5) === 'marked' && P.hwStatus({ status: 'drafted', dueOn: '2026-10-27' }, { state: 'PUBLISHED' }, '2026-10-28', 0) === 'due', 'status: a due Form quiz with responses marks itself; link homework waits for his tick');
  ok(P.hwStatus({ status: 'marked' }, { state: 'PUBLISHED' }, '2026-10-20', 0) === 'marked', 'status: his "marked" tick wins');
  const cov = P.hwCoverage({ questions: [
    { type: 'mcq', points: 1, lesson: 'Energy stores' }, { type: 'mcq', points: 1, lesson: 'Energy stores' },
    { type: 'written', label: 'Question 3', marks: 6, levels: [{}], lesson: 'Specific heat capacity', text: 'Describe a method to find the specific heat capacity of a metal block.' },
    { type: 'number', markPoints: [{ marks: 2 }, { marks: 1 }], lesson: 'Specific heat capacity' }] });
  ok(cov.total === 11 && cov.mcq === 2 && cov.long.length === 1 && cov.long[0].label === 'Question 3' && cov.parts[0].lesson === 'Specific heat capacity' && cov.parts[0].marks === 9, 'paper coverage: marks per sub-topic, the 6-mark questions, multiple choice count');
  // rename an added lesson: shown with the new name, still the same lesson (ticks and saved weeks keep finding it)
  const d2 = JSON.parse(JSON.stringify(data));
  const cls = Object.keys(d2.classes).find((c) => d2.classes[c].seq.length > 3), L0 = d2.classes[cls].seq[1];
  const rec = { cls, unit: L0.unit, afterKey: P.lessonId(L0), num: '9z', title: 'Practice lesson', rel: null };
  P.applyAdded(d2, [rec]);
  const at = d2.classes[cls].seq.findIndex((L) => L.title === 'Practice lesson'), id0 = P.lessonId(d2.classes[cls].seq[at]);
  P.applyAdded(d2, [Object.assign({}, rec, { name: 'Energy practice' })]);
  ok(d2.classes[cls].seq[at].title === 'Energy practice' && P.lessonId(d2.classes[cls].seq[at]) === id0 && d2.classes[cls].seq.filter((L) => L.added).length === 1, 'rename an added lesson: new name, same id, not added twice');
  const d3 = JSON.parse(JSON.stringify(data));
  P.applyAdded(d3, [Object.assign({}, rec, { name: 'Energy practice' })]);
  ok(P.lessonId(d3.classes[cls].seq.find((L) => L.added)) === id0, 'after a reload the renamed lesson has the same id as before');
  // lesson extras go to Claude with the build request
  const wk = P.autofill(data, {}, P.parse('2026-11-09'));
  const s = wk.slots.find((x) => x.kind === 'lesson');
  s.adds = { video: true, realData: true };
  const pr = P.buildPrompt(data, s, null, wk);
  ok(/short video clip/.test(pr) && /real data/.test(pr) && !/simulation/i.test(pr), 'lesson extras: ticked ones are in the build request, unticked ones are not');
  const first = wk.slots.find((x) => x.kind === 'lesson' && data.classes[x.cls].seq.findIndex((L) => L.unit === data.classes[x.cls].seq[x.i].unit) === x.i);
  if (first) ok(P.extrasSuggested(data, first).memory === true, 'lesson extras: memory phrase suggested on the first lesson of a topic');
}

console.log(fails ?`\n${fails} FAILED` : '\nall planner logic checks passed');
process.exit(fails ? 1 : 0);
