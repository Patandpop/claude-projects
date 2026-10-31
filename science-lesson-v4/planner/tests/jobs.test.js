// node planner/tests/jobs.test.js : long jobs on the planner's side (Day.gs, lanes/design-installed-app.md 6.1).
// Start (once per tap), the background run (oldest first, one trigger, a stuck job marked failed), the order sheet's
// file handed back once, a failure in plain words, and the "job finished" notification only when the app was not
// watching and only in the day. Fake Worker and fake order sheet; made-up data.
'use strict';
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path'), vm = require('vm');
let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + 'jobs: ' + n); if (!c) failed++; };

let triggers = [], made = [];
global.ScriptApp = Object.assign(global.ScriptApp, { getProjectTriggers: () => triggers, deleteTrigger: (t) => { triggers = triggers.filter((x) => x !== t); },
  newTrigger: (fn) => ({ timeBased: () => ({ after: (ms) => ({ create: () => { made.push({ fn, ms }); triggers.push({ getHandlerFunction: () => fn }); } }),
    everyMinutes: () => ({ create: () => { triggers.push({ getHandlerFunction: () => fn }); } }) }) }) });
global.Utilities.base64Encode = global.Utilities.base64Encode || ((bytes) => Buffer.from(bytes).toString('base64'));
const posts = [];
global.UrlFetchApp = { fetch: (url, opt) => { const b = JSON.parse(opt.payload); posts.push(b); return { getContentText: () => JSON.stringify({ ok: true, results: b.subs.map((s, i) => ({ i, status: 201 })) }) }; } };

const SRC = path.join(__dirname, '..');
for (const f of ['Code.gs', 'Behaviour.gs', 'Day.gs']) vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
// the slow parts, faked (Code.gs's own are checked by Lane B's tests)
let xlsxCalls = 0, resultsFail = false, refreshed = 0, pushed = 0;
global.orderXlsx_ = (model, title) => { xlsxCalls++; return { getBytes: () => [80, 75, 3, 4, model.rows.length] }; };
global.refreshResults_ = () => { if (resultsFail) throw new Error('Forms is not answering'); refreshed++; return [1, 2, 3]; };
global.pushState_ = () => { pushed++; };
global.memoryUpdate_ = () => {};
const k = 'k';
global.DAY_NOW = new Date('2026-11-03T16:00:00').getTime();

// ---- starting
let j = jobStart(k, 'orderSheet', { model: { rows: [1, 2] }, title: 'Week 10 order' }, 'tapJob001');
ok('a job starts queued, with a plain label, and one background run is set a few seconds later', j.status === 'queued' && j.label === 'order sheet' && made.length === 1 && made[0].fn === 'jobRun' && made[0].ms === 5000);
ok('the same tap sent twice starts one job', jobStart(k, 'orderSheet', { model: { rows: [1] } }, 'tapJob001').id === 'tapJob001' && m.sheets.Jobs._data.filter((r) => r[0] === 'tapJob001').length === 1);
jobStart(k, 'results', null, 'tapJob002');
ok('a second job waits for the same run (no second trigger)', made.length === 1);
let threw = ''; try { jobStart(k, 'deleteEverything'); } catch (e) { threw = e.message; }
ok('an unknown job is refused', /Unknown job/.test(threw));
threw = ''; try { jobStart('wrong', 'results'); } catch (e) { threw = e.message; }
ok('the wrong key is locked out', threw === 'Locked');
ok('nothing runs until the trigger fires', jobStatus(k, 'tapJob001').status === 'queued' && xlsxCalls === 0);

// ---- running: the app is watching (it asked just now), so no notification
jobRun();
let a = jobStatus(k, 'tapJob001'), b = jobStatus(k, 'tapJob002')
ok('the run does both, oldest first, and clears its trigger', a.status === 'done' && b.status === 'done' && xlsxCalls === 1 && refreshed === 1 && !triggers.some((t) => t.getHandlerFunction() === 'jobRun'));
ok('plain notes: the file name, how many homeworks were read', a.note === 'Week 10 order.xlsx is ready' && b.note === '3 homeworks read');
ok('the order sheet file is there to download, only when asked', a.hasFile === true && !a.file && jobStatus(k, 'tapJob001', true).file.name === 'Week 10 order.xlsx' && typeof jobStatus(k, 'tapJob001', true).file.b64 === 'string');
ok('no notification while the app was watching', posts.length === 0);
ok('jobList: the latest first', jobList(k)[0].id === 'tapJob002' && jobList(k)[1].id === 'tapJob001');

// ---- nobody watching: a notification, to "job" devices only, in the day only
pushSave(k, { deviceId: 'phone-1', endpoint: 'https://fcm.googleapis.com/fcm/send/p1', keys: { p256dh: 'B' + 'x'.repeat(86), auth: 'a'.repeat(22) } }, ['job']);
m.props.PUSH_WORKER_URL = 'https://planner-push.example.workers.dev'; m.props.PUSH_SECRET = 's';
jobStart(k, 'memory', null, 'tapJob003'); m.cache['jobseen:tapJob003'] = String(Date.now() - 120000);
jobRun();
ok('the app closed: "Memory map ready." goes to the phone', posts.length === 1 && posts[0].msg.body === 'Memory map ready.' && posts[0].msg.tag === 'job-tapJob003');
resultsFail = true; global.DAY_NOW = new Date('2026-11-03T20:30:00').getTime();
jobStart(k, 'results', null, 'tapJob004'); m.cache['jobseen:tapJob004'] = String(Date.now() - 120000);
jobRun();
const f = jobStatus(k, 'tapJob004');
ok('a job that fails says why in plain words', f.status === 'failed' && f.note === 'It did not work: Forms is not answering');
ok('after 7pm: no notification, even with the app closed', posts.length === 1);

// ---- a job left running (the server stopped) is marked failed at the next run
jobStart(k, 'memory', null, 'tapJob005');
const row = m.sheets.Jobs._data.findIndex((r) => r[0] === 'tapJob005');
m.sheets.Jobs._data[row][3] = 'running'; m.sheets.Jobs._data[row][5] = Date.now() - 11 * 60000;
jobRun();
ok('a job stuck for over 10 minutes is marked failed, with a plain note', jobStatus(k, 'tapJob005').status === 'failed' && /stopped part way/.test(jobStatus(k, 'tapJob005').note));
// an order sheet too big for the cache
global.orderXlsx_ = () => ({ getBytes: () => new Array(80000).fill(65) });
jobStart(k, 'orderSheet', { model: { rows: [] }, title: 'Huge' }, 'tapJob006'); jobRun();
ok('a file too big to hand back fails plainly instead of breaking', jobStatus(k, 'tapJob006').status === 'failed' && /too big/.test(jobStatus(k, 'tapJob006').note));
ok('rows are never deleted', m.sheets.Jobs._data.length === 7);
ok('the app can reach jobStart, jobStatus and jobList; not jobRun', ['jobStart', 'jobStatus', 'jobList'].every(bridgeAllowed_) && !bridgeAllowed_('jobRun'));

console.log(failed ? `jobs: ${failed} FAILED` : 'jobs: all passed');
process.exit(failed ? 1 : 0);
