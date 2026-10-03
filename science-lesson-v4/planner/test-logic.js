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

console.log(fails ? `\n${fails} FAILED` : '\nall planner logic checks passed');
process.exit(fails ? 1 : 0);
