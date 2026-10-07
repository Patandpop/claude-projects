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
const tl = P.topicList(data, {}, w, '7MLA', data.classes['7MLA'].seq[firstI].unit, { day: w.slots[m7[0].k].day, period: w.slots[m7[0].k].period });
ok(tl.find((x) => x.k === firstI).next && tl.some((x) => x.state === 'taught' && x.when && x.when.wrote), 'lesson list: ★ on the right lesson, taught ones show what he wrote');
// 14. Equipment: no filler, concise, sets only for real kit (Patryk 2026-10-07)
const allL = Object.values(data.classes).flatMap((c) => c.seq);
ok(!allL.some((L) => /see teacher/i.test(L.eq || '')), 'no "see teacher" filler: unknown equipment is left empty');
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
      if (/\(separate\)/i.test(f) && cls === '10C2') continue;
      if (!c.seq.some((L) => L.rel === `${d}/${f}`)) lost.push(`${cls} ${d}/${f}`);
    }
  }
  // split topics (9XS B1 / B2 blocks) list each folder in one block only, which is fine
  ok(!lost.length, `every Drive lesson folder is in its class's list (${lost.length} missing${lost.length ? ': ' + lost.slice(0, 3).join('; ') : ''})`);
}

console.log(fails ?`\n${fails} FAILED` : '\nall planner logic checks passed');
process.exit(fails ? 1 : 0);
