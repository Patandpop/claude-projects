// The installed app's bridge (Day.gs, lanes/design-installed-app.md 5.1): a POST with { key, fn, args } calls one
// allowed server function and answers { ok, result } or { ok: false, error }. Runs Code.gs, Behaviour.gs and Day.gs
// together on the Apps Script mock, the way Apps Script loads one project (every file shares one global scope).
// Run: node planner/tests/bridge.test.js
'use strict';
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path'), vm = require('vm');
m.sheets.Students._data[0].push('Support');
m.sheets.Students._data.forEach((r, i) => { if (i) r.push(''); });
m.sheets.Data = m.makeSheet('Data', [['chunk'], [JSON.stringify({ classes: {}, timetable: { A: [], B: [] }, weekAStart: '2026-09-07', terms: [['2026-09-07', '2026-12-18']], inset: [] })]]);
const SRC = process.env.PLANNER_SRC || path.join(__dirname, '..');
for (const f of ['Code.gs', 'Behaviour.gs', 'Day.gs']) vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
// a stand-in for Game.gs: one public call and one private helper
vm.runInThisContext("function gameLoad(k, x) { check_(k); return { got: x }; } function gameSecret_(k) { return 'never'; } function gameBoom(k) { check_(k); throw new Error('boom'); }");

let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };
const post = (body) => JSON.parse(doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }));

let r = post({ key: 'k', fn: 'init', args: [] });
ok('an allowed call answers ok with its result (init)', r.ok === true && Array.isArray(r.result.classes) && typeof r.result.version === 'number');
r = post({ key: 'k', fn: 'openClass', args: ['7BYA'] });
ok('arguments are passed after the key (openClass)', r.ok === true && Array.isArray(r.result.students) && r.result.students.length > 0);
r = post({ key: 'k', fn: 'logEvent', args: ['7BYA', 'Test Pupil One', '+', 0, Date.now(), 'tap-1'] });
const n1 = m.sheets['Behaviour Log']._data.length;
r = post({ key: 'k', fn: 'logEvent', args: ['7BYA', 'Test Pupil One', '+', 0, Date.now(), 'tap-1'] });
ok('the same tap sent twice is written once (a resend never pays twice)', r.ok === true && m.sheets['Behaviour Log']._data.length === n1);
r = post({ key: 'wrong', fn: 'init', args: [] });
ok('a wrong key is refused before anything runs', r.ok === false && r.error === 'Locked');
r = post({ fn: 'init' });
ok('no key is refused', r.ok === false && r.error === 'Locked');
r = post({ key: 'k', fn: 'mergeBehaviourData', args: [] });
ok('a real server function that is not on the list is refused', r.ok === false && /^Not allowed/.test(r.error));
r = post({ key: 'k', fn: 'check_', args: [] });
ok('a private function (ending in _) is refused', r.ok === false && /^Not allowed/.test(r.error));
r = post({ key: 'k', fn: 'gameSecret_', args: [] });
ok('a private Ulhu function is refused', r.ok === false && /^Not allowed/.test(r.error));
r = post({ key: 'k', fn: 'gameLoad', args: ['x1'] });
ok('a public Ulhu call is allowed', r.ok === true && r.result.got === 'x1');
r = post({ key: 'k', fn: 'constructor', args: [] });
ok('odd names are refused', r.ok === false && /^Not allowed/.test(r.error));
r = post({ key: 'k', fn: 'doPost', args: [] });
ok('the bridge cannot call itself', r.ok === false && /^Not allowed/.test(r.error));
r = post('not json');
ok('a body that is not JSON gets "Bad request"', r.ok === false && r.error === 'Bad request');
r = JSON.parse(doPost({}));
ok('no body at all gets "Bad request"', r.ok === false && r.error === 'Bad request');
r = post({ key: 'k', fn: 'gameLoad', args: 'not a list' });
ok('args that are not a list are treated as none', r.ok === true && r.result.got === undefined);
r = post({ key: 'k', fn: 'gameBoom', args: [] });
ok('a server error comes back as { ok: false, error } with its message, never a crash', r.ok === false && r.error === 'boom');

// every name on the list is a real function somewhere in the server files, so a typo shows up here
const src = ['Code.gs', 'Behaviour.gs', 'Game.gs'].map((f) => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const missing = BRIDGE_CALLS.filter((fn) => !new RegExp('function ' + fn + '\\s*\\(').test(src));
ok('every allowed call exists in the server files' + (missing.length ? ': missing ' + missing.join(', ') : ''), !missing.length);
const wanted = ['init', 'openClass', 'logEvent', 'logMany', 'removeEvent', 'removeMany', 'loadAll', 'saveWeek', 'saveWeeks', 'saveLessons', 'saveLessonChanges', 'homeworkList', 'exportXlsx'];
ok('the design\'s carried-across calls are all on the list', wanted.every((fn) => BRIDGE_CALLS.includes(fn)));

console.log(failed ? `\n${failed} FAILED` : '\nAll bridge checks passed');
process.exit(failed ? 1 : 0);
