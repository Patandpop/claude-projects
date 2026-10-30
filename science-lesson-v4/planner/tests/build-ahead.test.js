// The build-ahead rules (planner/tools/build-ahead.js). Run: node planner/tests/build-ahead.test.js
'use strict';
const B = require('../tools/build-ahead.js');
let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };
const CAL = { terms: [['2026-11-02', '2026-12-18']], inset: ['2026-11-25'] };
const at = (day, hhmm) => new Date(day + 'T' + hhmm + ':00');
const REQ = [
  { id: 'a1', at: '2026-11-03T12:00:00Z', kind: 'build', text: '', lessons: [{ when: '2026-11-05', cls: '9AS', prompt: 'Build 9AS L4' }] },
  { id: 'b2', at: '2026-11-03T12:01:00Z', kind: 'build', text: '', lessons: [{ when: '2026-11-04', cls: '10S2', prompt: 'Build 10S2 L7' }, { when: '2026-11-06', cls: '7MLA', prompt: 'Build 7MLA L2' }] },
  { id: 'c3', at: '2026-11-03T12:02:00Z', kind: 'message', text: 'can you look at the order sheet', lessons: [] },
  { id: 'd4', at: '2026-11-03T12:03:00Z', kind: 'practice', text: 'Make exam practice ... node test-paper.js --class 11S2', lessons: [] },
  { id: 'e5', at: '2026-11-03T12:04:00Z', kind: 'build', text: '', lessons: [{ when: '2026-11-09', cls: '12C', prompt: 'Build 12C L3' }] }
];
const base = { now: at('2026-11-03', '16:00'), cal: CAL, drive: true, busy: false, open: REQ, ranToday: false, holiday: false };
const d = B.decide(base);

ok('a school afternoon with requests waiting runs', d.run === true);
ok('messages are never built unattended', d.requests.indexOf('c3') === -1);
ok('the soonest lessons go first and at most 3 lessons a run', d.requests.join(',') === 'b2,a1' && d.lessons === 3 && d.left === 2);
ok('it says what is left for tomorrow', /2 more waiting/.test(d.why));
ok('the stop times are fixed: no new lesson after 18:30, ended at 18:50', d.noNewAfter === '18:30' && d.hardStop === '18:50');
ok('the run is given at most until 18:50', d.minutes <= 170 && d.minutes >= 60);
ok('exam practice is picked when there is room', B.decide(Object.assign({}, base, { open: [REQ[3], REQ[2]] })).requests.join(',') === 'd4');
ok('a weekend never runs', B.decide(Object.assign({}, base, { now: at('2026-11-07', '16:00') })).run === false);
ok('an INSET day never runs', /not a school day/.test(B.decide(Object.assign({}, base, { now: at('2026-11-25', '16:00') })).why));
ok('a holiday never runs', /not a school day/.test(B.decide(Object.assign({}, base, { now: at('2026-10-28', '16:00') })).why));
ok('his off switch wins over everything', /holiday/.test(B.decide(Object.assign({}, base, { holiday: true })).why));
ok('before 15:30 it waits', B.decide(Object.assign({}, base, { now: at('2026-11-03', '15:10') })).run === false);
ok('after 17:45 it is too late to start (nothing runs past 19:00)', /too late/.test(B.decide(Object.assign({}, base, { now: at('2026-11-03', '17:46') })).why) && B.decide(Object.assign({}, base, { now: at('2026-11-03', '19:30') })).run === false);
ok('no Drive, no run', /Drive/.test(B.decide(Object.assign({}, base, { drive: false })).why));
ok('another Claude session on the PC, no run', /another Claude/.test(B.decide(Object.assign({}, base, { busy: true })).why));
ok('once a day only', /already ran/.test(B.decide(Object.assign({}, base, { ranToday: true })).why));
ok('nothing waiting, no run', /no lesson/.test(B.decide(Object.assign({}, base, { open: [REQ[2]] })).why));
ok('a build request with no lessons is ignored', B.pickRequests([{ id: 'x', kind: 'build', lessons: [] }]).picked.length === 0);

const p = B.promptFor([REQ[1], REQ[0]], d);
ok('the prompt names only the chosen requests', /b2, a1/.test(p) && p.indexOf('c3') === -1 && p.indexOf('e5') === -1);
ok('the prompt forbids questions, Drive changes by hand, paid services, names and git', /never ask a question/.test(p) && /never create, move or rename/.test(p) && /No paid services/.test(p) && /No pupil names/.test(p) && /Do not touch git/.test(p));
ok('the prompt carries the stop times and the "leave it for tomorrow" rule', /18:30/.test(p) && /18:50/.test(p) && /left for tomorrow/.test(p));
ok('the prompt says how to mark a request done', /planner-sync\.js done/.test(p));
ok('no em dashes anywhere in the prompt', p.indexOf('—') === -1);



// ---- the command line: a dry run (check) never marks the day; only start does
(function () {
  const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildahead-')), stamp = path.join(tmp, 'stamp');
  fs.writeFileSync(path.join(tmp, 'requests.json'), JSON.stringify([{ id: 'r1', at: '2026-11-03T12:00:00Z', kind: 'build', text: '', lessons: [{ when: '2026-11-04', cls: '9AS', prompt: 'Build 9AS L4' }] }]));
  const env = Object.assign({}, process.env, { PLANNER_SYNC: tmp, BUILD_AHEAD_STAMP: stamp, BUILD_AHEAD_NOW: '2026-11-03T16:00:00', BUILD_AHEAD_DRIVE: '1', BUILD_AHEAD_BUSY: '0' });
  const run = (c) => JSON.parse(cp.execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'build-ahead.js'), c], { env, encoding: 'utf8' }));
  const c1 = run('check');
  ok('a dry run (check) on a school afternoon says run', c1.run === true && c1.requests.join() === 'r1');
  ok('a dry run writes no stamp, so it cannot block the real run', !fs.existsSync(stamp));
  ok('a second dry run still says run', run('check').run === true);
  const s1 = run('start');
  ok('start says run and marks today', s1.run === true && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8').trim() === '2026-11-03');
  ok('after start, another start the same day is refused (once a day)', /already ran/.test(run('start').why));
  ok('a dry run after the real run reports it honestly', /already ran/.test(run('check').why));
  fs.rmSync(tmp, { recursive: true, force: true });
})();

console.log(failed ? `\n${failed} FAILED` : '\nAll build-ahead checks passed');
process.exit(failed ? 1 : 0);
