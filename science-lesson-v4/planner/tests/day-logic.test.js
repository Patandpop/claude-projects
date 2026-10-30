// The day screen's and evening timer's rules (planner/day-logic.js). Run: node planner/tests/day-logic.test.js
// Made-up names only.
'use strict';
const L = require('../day-logic.js');
let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- capture sorting: every route
ok('order words go to the order sheet', L.sortCapture('order 30 beakers for tues').home === 'orderSheet');
const ob = L.sortCapture('9AS need bunsens P3');
ok('order words with a class keep the class', ob.home === 'orderSheet' && ob.cls === '9AS');
let r = L.sortCapture('10s2 L4 add the ripple tank video');
ok('"L4" with a class goes to that lesson (class code in any case)', r.home === 'lesson' && r.cls === '10S2' && r.lesson === 4);
r = L.sortCapture('lesson 12 for 12C needs the CPAC sheet');
ok('"lesson 12" with a class goes to that lesson (12C, not "12")', r.home === 'lesson' && r.cls === '12C' && r.lesson === 12);
ok('a class code alone goes to that class', L.sortCapture('8AG ran out of time, finish graph').home === 'class');
ok('a lesson number with no class is not a lesson (goes to Obsidian)', L.sortCapture('L4 of the book club').home === 'obsidian');
ok('everything else goes to Obsidian', L.sortCapture('book idea: Dune reread').home === 'obsidian');
ok('pupil words stay in the planner as a to-do', L.sortCapture('chase homework 9XS').home === 'todo' && L.sortCapture('email home re trip').home === 'todo' && L.sortCapture('parents evening slots').home === 'todo');
ok('a known pupil name stays in the planner, never Obsidian', L.sortCapture('Zorbo was brilliant today', ['Zorbo Testperson']).home === 'todo');
ok('a pupil name beats order words', L.sortCapture('Zorbo broke the kit', ['Zorbo Testperson']).home === 'todo');
ok('a name inside another word does not count', L.sortCapture('annotations reminder', ['Ann Example']).home === 'obsidian');
ok('the reason never repeats a name', !JSON.stringify(L.sortCapture('Zorbo was great', ['Zorbo Testperson'])).includes('Zorbo'));
ok('no class or pupil capture ever goes to Obsidian', ['9AS book idea', '13D notes', 'student voice'].every((t) => L.sortCapture(t).home !== 'obsidian'));

// ---- calendar
const CAL = { terms: [['2026-09-07', '2026-10-21'], ['2026-11-02', '2026-12-18']], inset: ['2026-11-25'] };
const D = (s) => new Date(s);
ok('a term weekday is a school day', L.isSchoolDay(D('2026-11-03T08:00:00'), CAL));
ok('weekend, INSET and half term are not', !L.isSchoolDay(D('2026-11-07T08:00:00'), CAL) && !L.isSchoolDay(D('2026-11-25T08:00:00'), CAL) && !L.isSchoolDay(D('2026-10-27T08:00:00'), CAL));
ok('the morning message is due 07:00 on a school day only', L.morningMessageDue(D('2026-11-03T07:05:00'), CAL) && !L.morningMessageDue(D('2026-11-03T06:59:00'), CAL) && !L.morningMessageDue(D('2026-11-07T07:05:00'), CAL));
ok('19:01 is after seven, 18:59 is not', L.afterSeven(D('2026-11-03T19:01:00')) && !L.afterSeven(D('2026-11-03T18:59:00')));

// ---- periods and time available
const PT = { ks3: { P1: '09:00-10:00', break: '10:00-10:25', P2: '10:25-11:30', P3: '11:30-12:30', lunch: '12:30-13:15', P4: '13:15-14:15', P5: '14:15-15:15' },
             ks4: { P1: '09:00-10:00', P2: '10:00-11:05', break: '11:05-11:30', P3: '11:30-12:30', P4: '12:30-13:30', lunch: '13:30-14:15', P5: '14:15-15:15' } };
const per = L.periodsToday([{ period: 1, cls: '9AS' }, { period: 3, cls: '10C2' }, { period: 4, cls: '10S2' }, { period: 5, cls: '12C' }], PT);
ok('periods: five, P2 free, Year 10 uses KS4 times', per.length === 5 && per[1].cls === '' && per[3].start === L.mins('12:30'));
let av = L.timeAvailable(per, L.mins('08:00'), '17:00');
ok('time available: P2 free (65 min) + 15:15 to 17:00 (105 min)', av.freeMin === 65 && av.afterMin === 105 && av.total === 170);
av = L.timeAvailable(per, L.mins('10:45'), '17:00');
ok('a free already under way counts only what is left', av.freeMin === 45);
ok('after-school end past 19:00 is cut at 19:00', L.timeAvailable(per, L.mins('08:00'), '21:30').afterMin === L.mins('19:00') - L.mins('15:15'));
ok('after 19:00 nothing is available', L.timeAvailable(per, L.mins('19:30'), '21:30').total === 0);

// ---- to-dos
const T = '2026-11-03';
const items = [
  { id: 'a', kind: 'own', text: 'Ring the garage', since: T },
  { id: 'b', kind: 'build', text: 'Build 10S2 P4', cls: '10S2', due: T, since: T },
  { id: 'c', kind: 'mark', text: 'Mark 9AS key homework', cls: '9AS', due: '2026-11-02', since: '2026-11-02' },
  { id: 'd', kind: 'chase', text: 'Chase 4 pupils 10C2', cls: '10C2', count: 4, since: T },
  { id: 'e', kind: 'review', text: '8XP test review', due: '2026-11-05', since: T },
  { id: 'f', kind: 'build', text: 'Build 12C L9', due: '2026-11-09', since: T },
  { id: 'g', kind: 'ritual', text: 'Book marking', since: T },
  { id: 'h', kind: 'own', text: 'x1', since: T }, { id: 'i', kind: 'own', text: 'x2', since: T }, { id: 'j', kind: 'own', text: 'x3', since: T }
];
const td = L.buildTodos(items, T, ['a']);
const get = (id) => td.all.find((x) => x.id === id);
ok('at most 7 shown, the rest under "more"', td.shown.length === 7 && td.more.length === 1);
ok('dropped items are hidden today', !get('a'));
ok('a lesson more than 2 days ahead is not on the list yet', !get('f'));
ok('overdue first, then due today by kind (build before chase)', td.all[0].id === 'c' && td.all[1].id === 'b');
ok('a leftover from an earlier day gets the "yesterday" tag', get('c').yesterday && !get('b').yesterday);
ok('default minutes: mark 60, build 40, chase 5 each, book-marking ritual 120', get('c').minutes === 60 && get('b').minutes === 40 && get('d').minutes === 20 && get('g').minutes === 120);
ok('minutes can be changed in settings', L.buildTodos(items, T, [], { mark: 45 }).all.find((x) => x.id === 'c').minutes === 45);

// ---- workload and ghosts
av = L.timeAvailable(per, L.mins('08:00'), '17:00');
const load = L.workload(td.all, av.total);
const need = td.all.filter((x) => x.kind !== 'ritual').reduce((s, x) => s + x.minutes, 0);
ok('workload adds work (not rituals) and says "Over by N min"', !load.fits && load.need === need && load.text === 'Over by ' + (need - 170) + ' min');
ok('fits when there is time', L.workload([{ kind: 'mark', minutes: 60 }], 170).text === 'Fits');
ok('Ulhu stirs when over, calm when it fits', L.ulhuMood(load) === 'stir' && L.ulhuMood({ fits: true }) === 'calm');
const gh = L.ghostBlocks(td.all, av);
const at = (id) => gh.find((g) => g.todoId === id);
ok('marking goes into the free period', at('c') && at('c').where === 'P2' && at('c').start === '10:25');
ok('lesson builds are only suggested after school', at('b') && at('b').where === 'after');
ok('chasing goes after school once the free is full (60 of 65 min used)', at('d') && at('d').where === 'after');
ok('rituals never become blocks', !at('g'));
ok('blocks only go where they fit whole', gh.filter((g) => g.where === 'after').reduce((s, g) => s + g.minutes, 0) <= 105);

// ---- timer
ok('Gmail is Emails; PowerPoint with a class in the title is Building lessons for that class',
  eq(L.mapWindow('chrome.exe', 'Inbox (3) - Gmail'), { job: 'Emails', cls: '' }) && eq(L.mapWindow('POWERPNT.EXE', 'Latent Heat 9AS.pptx'), { job: 'Building lessons', cls: '9AS' }));
ok('anything unmatched is Personal, with no class', eq(L.mapWindow('chrome.exe', 'YouTube'), { job: 'Personal', cls: '' }));
ok('"password" is not mistaken for Word', L.mapWindow('chrome.exe', 'Reset password').job === 'Personal');
ok('his own rules win and can be switched off', L.mapWindow('x', 'Seneca', [{ pattern: 'seneca', job: 'Setting homework' }]).job === 'Setting homework' && L.mapWindow('x', 'Seneca', [{ pattern: 'seneca', job: 'Admin', enabled: false }]).job === 'Personal');
const tot = L.totals([{ duration: 600, app: 'chrome.exe', title: 'Gmail' }, { duration: 300, app: 'chrome.exe', title: 'Gmail' }, { duration: 900, app: 'x', title: 'Gmail', afk: true }, { duration: 1200, app: 'POWERPNT.EXE', title: 'Waves 10S2.pptx' }]);
ok('totals add up per job and class; idle time does not count', eq(tot, [{ job: 'Emails', cls: '', minutes: 15 }, { job: 'Building lessons', cls: '10S2', minutes: 20 }]));
ok('totals never carry a window title', !JSON.stringify(tot).includes('pptx') && !JSON.stringify(tot).includes('Gmail'));
const t0 = Date.parse('2026-11-03T19:00:00');
ok('a forgotten timer stops after 2 hours, flagged "maybe"', eq(L.capRunning({ startedAt: t0 }, t0 + 3 * 3600e3), { startedAt: t0, endedAt: t0 + 7200e3, minutes: 120, maybe: true }));
ok('a timer under 2 hours keeps running', !L.capRunning({ startedAt: t0 }, t0 + 3600e3).endedAt);
const lj = L.likelyJobs(['9AS', '10S2'], [{ job: 'Setting homework', cls: '10S2', startedAt: 5 }, { job: 'Marking', cls: '13D', startedAt: 9 }, { job: 'Emails', cls: '', startedAt: 3 }]);
ok('likeliest jobs: recent ones for today\'s classes first, then marking today\'s classes; three at most',
  lj.length === 3 && eq(lj[0], { job: 'Setting homework', cls: '10S2' }) && eq(lj[1], { job: 'Emails', cls: '' }) && eq(lj[2], { job: 'Marking', cls: '9AS' }));
const rows = [{ job: 'Marking', cls: '9AS', minutes: 90, taskRef: 't1' }, { job: 'Marking', cls: '9AS', minutes: 30, taskRef: 't1' }, { job: 'Personal', minutes: 400 }, { job: 'Emails', minutes: 50, maybe: true }];
const rep = L.report(rows);
ok('report: biggest drain first, Personal never the suggestion, maybe rows listed', rep.jobs[0].name === 'Personal' && /Marking/.test(rep.suggestion) && rep.maybe.length === 1 && rep.classes[0].name === '9AS' && rep.classes[0].hours === 2);
ok('one task over several sittings adds up (last time it took 120 min)', L.lastTimeTook(rows, 'Marking', '9AS') === 120 && L.lastTimeTook(rows, 'Marking', '8XP') === null);

// ---- the day screen's model (layout B, the timeline)
const LOAD = { day: T, periodTimes: PT, settings: { shutdownTime: '17:00', afterSchoolEnd: '17:00' }, doneForToday: false,
  lessons: [{ period: 1, cls: '9AS', title: 'L3 Latent heat', kind: 'lesson', built: true, planned: true }, { period: 3, cls: '10C2', title: 'L2 Efficiency', kind: 'lesson', built: true, planned: true },
    { period: 4, cls: '10S2', title: '', kind: 'lesson', built: null, planned: false }, { period: 5, cls: '12C', title: 'L7 Superposition', kind: 'lesson', built: true, planned: true }],
  items: items.filter((x) => x.id !== 'a'), recent: [], inbox: [], timer: null };
const dm = L.dayModel(LOAD, L.mins('08:00'));
ok('model: rows in time order: four lessons, the free P2, after school, shutdown', dm.rows.map((r) => r.type).join() === 'lesson,free,lesson,lesson,lesson,after,shutdown');
ok('model: the free holds the marking block, after school the build', dm.rows[1].ghosts.some((g) => g.todoId === 'c') && dm.rows[5].ghosts.some((g) => g.todoId === 'b') && dm.rows[5].at === '15:15');
ok('model: lessons carry class, title and built flag; an unplanned one shows as not planned', dm.rows[0].cls === '9AS' && dm.rows[0].built === true && dm.rows[3].planned === false);
ok('model: workload, Ulhu\'s mood and the likeliest timer jobs come with it', dm.workload.fits === false && dm.mood === 'stir' && dm.likely[0].job === 'Marking' && dm.likely[0].cls === '9AS');
ok('model: a dismissed suggestion does not come back today', !L.dayModel(LOAD, L.mins('08:00'), ['c']).rows[1].ghosts.length);
ok('model: the shutdown card shows from his set time, not after 19:00, not once done',
  !L.dayModel(LOAD, L.mins('16:59')).shutdownDue && L.dayModel(LOAD, L.mins('17:01')).shutdownDue && !L.dayModel(LOAD, L.mins('19:05')).shutdownDue && !L.dayModel(Object.assign({}, LOAD, { doneForToday: true }), L.mins('17:30')).shutdownDue);
ok('model: a shutdown time set after 19:00 is held at 19:00', L.dayModel(Object.assign({}, LOAD, { settings: { shutdownTime: '21:00' } }), L.mins('08:00')).rows.pop().at === '19:00');
ok('model: no data yet gives an empty day, not an error', L.dayModel({ day: T }, 600).rows.map((r) => r.type).join() === 'shutdown');

console.log(failed ? `\n${failed} FAILED` : '\nAll day-logic checks passed');
process.exit(failed ? 1 : 0);
