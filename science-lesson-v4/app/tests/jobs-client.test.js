// node app/tests/jobs-client.test.js : background jobs in the app (app/src/jobs.js) with a fake planner and a fake
// clock. Start, ask every 10 seconds only while something is waiting, stop asking when all are finished, no signal,
// try again, dismiss, the file once done. No real data.
'use strict';
const { makeJobs } = require('../src/jobs.js');
let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + 'jobs client: ' + n); if (!c) failed++; };

const calls = [], timers = [], store = {};
let status = {}, offline = false;
const api = { call: (fn, ...args) => { calls.push({ fn, args });
  if (offline) return Promise.reject(new Error('Failed to fetch'));
  if (fn === 'jobStart') { status[args[2]] = 'queued'; return Promise.resolve({ id: args[2], label: { results: 'homework results', orderSheet: 'order sheet' }[args[0]] || args[0], status: 'queued' }); }
  if (fn === 'jobStatus') return Promise.resolve(Object.assign({ id: args[0], label: 'homework results', status: status[args[0]], note: status[args[0]] === 'done' ? '3 homeworks read' : '', hasFile: false }, args[1] ? { file: { name: 'x.xlsx', b64: 'UEs=' } } : {}));
  return Promise.resolve(null); } };
const J = makeJobs({ api, storage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } }, later: (f, ms) => { timers.push({ f, ms }); return timers.length; } });
const flush = () => new Promise((r) => setTimeout(r, 0));
const tick = async () => { const t = timers.shift(); t.f(); await flush(); await flush(); };

(async () => {
  let changes = 0; J.onChange = () => changes++;
  const r = await J.start('results', null);
  const id = r.id;
  ok('start: the planner is asked once with this job\'s own id, and a pill appears', calls[0].fn === 'jobStart' && calls[0].args[0] === 'results' && calls[0].args[2] === id && J.list()[0].status === 'queued' && J.list()[0].label === 'homework results' && changes >= 2);
  ok('it asks again in 10 seconds, once (no pile of timers)', timers.length === 1 && timers[0].ms === 10000 && (J.poll(), timers.length === 1));
  status[id] = 'running'; await tick();
  ok('still running: it keeps asking', J.list()[0].status === 'running' && timers.length === 1);
  status[id] = 'done'; await tick();
  ok('done: the pill says so with the note, and it stops asking', J.list()[0].status === 'done' && J.list()[0].note === '3 homeworks read' && timers.length === 0);
  const f = await J.file(id);
  ok('the file is asked for only on request', f.name === 'x.xlsx' && calls.filter((c) => c.fn === 'jobStatus' && c.args[1] === true).length === 1);
  J.dismiss(id);
  ok('x removes the pill', !J.list().some((x) => x.id === id));

  offline = true; let threw = false;
  try { await J.start('memory', null); } catch (e) { threw = true; }
  const un = J.list()[0];
  ok('no signal: the pill says it was not sent', threw && un.status === 'unsent' && /No signal/.test(un.note) && un.small === true);
  offline = false; await J.retry(un.id);
  ok('Try again sends it afresh and drops the old pill', J.list().length === 1 && J.list()[0].kind === 'memory' && J.list()[0].status === 'queued');
  await J.start('orderSheet', { model: { rows: [] }, title: 'T' });
  ok('a job that sends a big model is not retried from its pill (it is sent again from its screen)', J.list()[0].small === false);
  for (let i = 0; i < 8; i++) await J.start('results', null);
  ok('only the last 6 pills are kept', J.list().length === 6);

  console.log(failed ? `jobs client: ${failed} FAILED` : 'jobs client: all passed');
  process.exit(failed ? 1 : 0);
})();
