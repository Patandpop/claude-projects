// Open lesson and print the week (planner/tools/open-lesson.js). Run: node planner/tests/open-lesson.test.js
'use strict';
const O = require('../tools/open-lesson.js');
let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };
const DATA = { classes: {
  '9AS': { size: 30, seq: [{}, {}, {}, { title: 'Changing States', rel: 'Year 9/Physics/P3 Particles/Lesson 4 - Changing States', built: true }] },
  '7MLA': { size: 34, seq: [{ title: 'Introduction and Safety', rel: 'Year 7/Science Skills/Introduction to Science/Lesson 1 - Introduction and Safety', built: true }] },
  '12C': { size: 12, seq: [{}, { title: 'Superposition', rel: 'Year 12/Module 4 - Electrons, Waves and Photons/Chapter 12 - Waves 2/Lesson 2 - Superposition', built: false }] } } };
const STATE = { weeks: { '2026-11-02': { monday: '2026-11-02', slots: [
  { day: 0, period: 3, cls: '9AS', kind: 'lesson', i: 3, text: 'P3 Particles — Changing States', built: true },
  { day: 0, period: 1, cls: '7MLA', kind: 'lesson', i: 0, text: 'Intro — Introduction and Safety', built: true },
  { day: 0, period: 5, cls: '10C2', kind: 'test', unit: 'P1' },
  { day: 2, period: 2, cls: '12C', kind: 'lesson', i: 1, text: 'Waves 2 — Superposition' },
  { day: 4, period: 4, cls: '9AS', kind: 'free' } ] } } };

ok('"today" is today, "tomorrow" the next day', O.resolveDay('today', new Date(2026, 10, 3)) === '2026-11-03' && O.resolveDay('tomorrow', new Date(2026, 10, 3)) === '2026-11-04');
ok('"next" from a Friday is the Monday', O.resolveDay('next', new Date(2026, 10, 6)) === '2026-11-09' && O.resolveDay('next', new Date(2026, 10, 7)) === '2026-11-09');
ok('a date is taken as it is; nonsense is refused', O.resolveDay('2026-11-04', new Date()) === '2026-11-04' && O.resolveDay('monday', new Date()) === null);
const mon = O.lessonsOn(STATE, DATA, '2026-11-02');
ok('a day lists its lessons in period order, tests and frees left out', mon.map((l) => l.cls).join(',') === '7MLA,9AS');
ok('each lesson carries its title, Drive folder, size and built flag', mon[1].title === 'Changing States' && /Lesson 4 - Changing States$/.test(mon[1].rel) && mon[1].size === 30 && mon[1].built === true && mon[1].dayName === 'Mon');
ok('a lesson not built says so', O.lessonsOn(STATE, DATA, '2026-11-04')[0].built === false);
ok('a day with no saved week is empty, not an error', O.lessonsOn(STATE, DATA, '2026-11-10').length === 0 && O.lessonsOn({}, DATA, '2026-11-02').length === 0);
ok('the week is Monday to Friday in order', O.weekLessons(STATE, DATA, '2026-11-05').map((l) => l.dayName + l.cls).join(' ') === 'Mon7MLA Mon9AS Wed12C');

const f = O.lessonFiles(['Changing-states.pptx', 'Changing-states_worksheet.docx', 'Changing-states_support_worksheet.docx', 'heating-curve.png', 'src', 'Changing-states.manifest.json', '~$Changing-states_worksheet.docx', 'Beechen Cliff Original Lesson']);
ok('our three files are found by the build\'s naming; pictures, notes and Word lock files are not', f.deck === 'Changing-states.pptx' && f.worksheet === 'Changing-states_worksheet.docx' && f.support === 'Changing-states_support_worksheet.docx' && !f.answers);
ok('they open in his order: slides, worksheet, support', O.openOrder(f).join('|') === 'Changing-states.pptx|Changing-states_worksheet.docx|Changing-states_support_worksheet.docx');
ok('printing takes the two worksheets only', O.printList(f).join('|') === 'Changing-states_worksheet.docx|Changing-states_support_worksheet.docx');
const old = O.lessonFiles(['Pressure_PTO.pptx', 'Pressure_worksheet_PTO.docx', 'Pressure_support_worksheet_PTO.docx']);
ok('the old _PTO names still count', old.deck === 'Pressure_PTO.pptx' && old.support === 'Pressure_support_worksheet_PTO.docx');
const rev = O.lessonFiles(['Particles-review.pptx', 'Particles-review_worksheet.docx', 'Particles-review_answers.docx']);
ok('a review lesson opens its answers sheet in the third slot', O.openOrder(rev)[2] === 'Particles-review_answers.docx' && O.printList(rev).length === 1);
ok('a deck-only lesson opens its deck', O.openOrder(O.lessonFiles(['Walkthrough.pptx', 'notes.txt'])).join('|') === 'Walkthrough.pptx');
ok('an empty folder opens nothing', O.openOrder(O.lessonFiles([])).length === 0);
ok('the school\'s own deck is never picked when ours is there', O.lessonFiles(['WS Chromatography.pptx', 'Chromatography.pptx', 'Chromatography_worksheet.docx']).deck === 'Chromatography.pptx');

const items = O.weekLessons(STATE, DATA, '2026-11-02').map((l) => Object.assign({}, l, { files: l.cls === '12C' ? O.lessonFiles([]) : f }));
const cover = O.coverLines('2026-11-02', items, null);
ok('the cover names the week and one line per lesson with copies from the class size', cover[0] === 'Worksheets for the week beginning Mon 2026-11-02' && /Mon P1  7MLA  Introduction and Safety:  worksheet x 34, support x as needed/.test(cover[2]) && /Mon P3  9AS  Changing States:  worksheet x 30/.test(cover[3]));
ok('a lesson with nothing built is listed as such', /Wed P2  12C  Superposition:  no worksheet  \(not built yet\)/.test(cover[4]));
ok('a support copy count can be given', /support x 6/.test(O.coverLines('2026-11-02', items, 6)[2]));
ok('nothing on the cover names a pupil (classes and titles only)', cover.every((l) => !/[A-Z][a-z]+ [A-Z]\./.test(l)));

console.log(failed ? `\n${failed} FAILED` : '\nAll open-lesson checks passed');
process.exit(failed ? 1 : 0);
