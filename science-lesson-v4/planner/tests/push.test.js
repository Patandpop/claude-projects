// node planner/tests/push.test.js : notifications on the planner's side (Day.gs, lanes/design-installed-app.md 6.2).
// Devices saved and switched off; the half-hourly check: the morning message on school days only, once, never names;
// quiet before 07:00 and from 19:00; Lane D's nudges; a phone the push service says has gone. A fake Worker, made-up data.
'use strict';
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path'), vm = require('vm');
let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + 'push: ' + n); if (!c) failed++; };

// Tuesday 3 Nov 2026 (term), with Wednesday 4 Nov an INSET day and Saturday 7 Nov a weekend
const PT = { ks3: { P1: '09:00-10:00', P2: '10:25-11:30', P3: '11:30-12:30', P4: '13:15-14:15', P5: '14:15-15:15' }, ks4: { P1: '09:00-10:00', P2: '10:00-11:05', P3: '11:30-12:30', P4: '12:30-13:30', P5: '14:15-15:15' } };
m.sheets.Data = m.makeSheet('Data', [['chunk'], [JSON.stringify({ classes: {}, periodTimes: PT, timetable: { A: [{ day: 3, period: 2, cls: '8XP' }], B: [{ day: 3, period: 2, cls: '8XP' }] }, weekAStart: '2026-09-07', terms: [['2026-09-07', '2026-12-18']], inset: ['2026-11-04'] })]]);
m.sheets.Weeks = m.makeSheet('Weeks', [['monday', 'json', 'at'], ['2026-11-02', JSON.stringify({ monday: '2026-11-02', slots: [
  { day: 1, period: 1, cls: '9AS', kind: 'lesson', text: 'Particles — L3 Latent heat', built: true },
  { day: 1, period: 3, cls: '10S2', kind: 'lesson', text: 'Waves — L4 Ripple tanks', built: false },
  { day: 1, period: 4, cls: '12C', kind: 'test', text: 'Waves — end-of-topic TEST' },
  { day: 2, period: 1, cls: '9AS', kind: 'lesson', text: 'Particles — L4', built: false }] }), Date.now()]]);

let triggers = [], made = 0;
global.ScriptApp = Object.assign(global.ScriptApp, { getProjectTriggers: () => triggers,
  newTrigger: (fn) => ({ timeBased: () => ({ everyMinutes: (n) => ({ create: () => { made++; triggers.push({ getHandlerFunction: () => fn, every: n }); } }) }) }) });
const posts = []; let workerUp = true, goneEndpoint = '';
global.UrlFetchApp = { fetch: (url, opt) => {
  if (!workerUp) throw new Error('Address unavailable');
  const b = JSON.parse(opt.payload); posts.push({ url, headers: opt.headers, body: b });
  return { getContentText: () => JSON.stringify({ ok: true, results: b.subs.map((s, i) => ({ i, status: s.endpoint === goneEndpoint ? 410 : 201 })) }) };
} };
let nudge = null, nudgeCalls = 0;
global.gameNudge = (k, send) => { nudgeCalls++; if (k !== 'k' || send !== true) return null; const n = nudge; nudge = null; return n; };

const SRC = path.join(__dirname, '..');
for (const f of ['Code.gs', 'Behaviour.gs', 'Day.gs']) vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
const dayOf = (v) => (v instanceof Date ? Utilities.formatDate(v, 'Europe/London', 'yyyy-MM-dd') : String(v));   // the Sheet turns a day into a date
const at = (s) => { global.DAY_NOW = new Date(s).getTime(); };   // London time; November is GMT
const k = 'k';
const P256 = 'B' + 'x'.repeat(86), AUTH = 'a'.repeat(22);
const dev = (id, ep) => ({ deviceId: id, label: 'Phone', endpoint: ep || 'https://fcm.googleapis.com/fcm/send/' + id, keys: { p256dh: P256, auth: AUTH } });

// ---- before the planner is set up
let s = pushStatus(k, 'phone-1');
ok('before set-up: not ready, no device, the two kinds offered', s.ready === false && s.device === null && s.kinds.join() === 'morning,nudge');
let threw = ''; try { pushStatus('wrong'); } catch (e) { threw = e.message; }
ok('the wrong key is locked out', threw === 'Locked');
for (const [bad, why] of [[{ deviceId: 'x' }, 'Bad device id'], [Object.assign(dev('phone-1'), { endpoint: 'http://plain.example/x' }), 'Bad device address'], [Object.assign(dev('phone-1'), { keys: { p256dh: 'short', auth: AUTH } }), 'Bad device keys']]) {
  threw = ''; try { pushSave(k, bad, ['morning']); } catch (e) { threw = e.message; }
  ok('a bad device is refused: ' + why, threw === why);
}
m.props.PUSH_WORKER_URL = 'https://planner-push.example.workers.dev/'; m.props.PUSH_SECRET = 'made-up-secret'; m.props.PUSH_PUBLIC_KEY = 'BPUBLIC';

// ---- saving devices
s = pushSave(k, dev('phone-1'), ['morning', 'nudge', 'spam']);
ok('a device is saved with its kinds (unknown kinds dropped) and the planner is ready', s.ready && s.publicKey === 'BPUBLIC' && s.device.status === 'on' && s.device.kinds.join() === 'morning,nudge');
ok('...and the half-hourly check is made, once', made === 1 && triggers[0].every === 30);
pushSave(k, dev('phone-1'), ['morning']); pushSave(k, dev('homepc-1'), ['nudge']);
ok('saving the same device again updates its row (no second row, no second check)', m.sheets.Push._data.filter((r) => r[0] === 'phone-1').length === 1 && pushStatus(k, 'phone-1').device.kinds.join() === 'morning' && made === 1);

// ---- the morning message
at('2026-11-03T06:40:00'); posts.length = 0;
ok('06:40: quiet, nothing is sent', pushTick().quiet === true && posts.length === 0);
at('2026-11-03T07:05:00');
let r = pushTick();
const mp = posts.find((p) => p.body.msg.tag === 'morning-2026-11-03');
ok('07:05 on a school day: one message, to the morning device only, with the secret, to /send', r.morning && r.morning.sent === 1 && mp && mp.url === 'https://planner-push.example.workers.dev/send' && mp.headers['X-Push-Secret'] === 'made-up-secret' && mp.body.subs.length === 1 && /phone-1$/.test(mp.body.subs[0].endpoint));
ok('it names the lesson not built, never the built one or the test', mp && mp.body.msg.body === 'Today: 10S2 P3 L4 Ripple tanks not built');
at('2026-11-03T07:35:00'); posts.length = 0; pushTick();
ok('07:35: not sent twice the same morning', !posts.some((p) => /^morning/.test(p.body.msg.tag)));
at('2026-11-04T07:05:00'); posts.length = 0; pushTick();
ok('an INSET day: no morning message', !posts.length);
at('2026-11-07T07:05:00'); pushTick();
ok('a Saturday: no morning message', !posts.length);
at('2026-12-21T07:05:00'); pushTick();
ok('the holidays: no morning message', !posts.length);
at('2026-11-12T07:05:00'); pushTick();
ok('a week not saved yet: the timetable lesson is "not planned"', posts.length === 1 && posts[0].body.msg.body === 'Today: 8XP P2 not planned');
// everything built: nothing to say
const wk = JSON.parse(m.sheets.Weeks._data[1][1]); wk.slots[1].built = true; m.sheets.Weeks._data[1][1] = JSON.stringify(wk); delete m.cache.ptt;
{ const L = m.sheets['Day Log']._data; for (let i = L.length - 1; i > 0; i--) if (dayOf(L[i][0]) === '2026-11-03') L.splice(i, 1); }   // forget this morning (in place: the sheet keeps its own list)
at('2026-11-03T07:10:00'); posts.length = 0; pushTick();
ok('everything built: no message, and it does not ask again that morning', !posts.length && m.sheets['Day Log']._data.some((x) => dayOf(x[0]) === '2026-11-03' && /nothing to say/.test(x[1])));
const all = JSON.stringify(m.sheets['Day Log']._data) + JSON.stringify(posts);
ok('no pupil name could be sent: messages carry class codes and lesson titles only', !/Students|surname|forename/i.test(all));

// ---- nudges (Lane D's rules decide; this only sends what comes back)
at('2026-11-03T16:00:00'); posts.length = 0; nudge = { kind: 'streak', text: 'Read: 24 days' };
r = pushTick();
ok('a nudge goes to the nudge device only', r.nudge && r.nudge.sent === 1 && posts.length === 1 && posts[0].body.msg.body === 'Read: 24 days' && /homepc-1$/.test(posts[0].body.subs[0].endpoint));
posts.length = 0; r = pushTick();
ok('no nudge to say: nothing sent', !r.nudge && !posts.length);
at('2026-11-03T19:00:00'); nudgeCalls = 0; nudge = { kind: 'find', text: 'x' };
ok('19:00: quiet, Ulhu is not even asked', pushTick().quiet === true && nudgeCalls === 0 && !posts.length);
nudge = null;

// ---- the test button, a phone that has gone, a sender that is down, switching off
posts.length = 0; at('2026-11-03T21:30:00');
r = pushTest(k, 'phone-1');
ok('Send a test: to this device only, even late (his own tap)', r.sent === 1 && posts.length === 1 && posts[0].body.subs.length === 1 && /phone-1$/.test(posts[0].body.subs[0].endpoint));
goneEndpoint = 'https://fcm.googleapis.com/fcm/send/phone-1';
r = pushTest(k, 'phone-1');
ok('the push service says the phone has gone: marked gone, kept as a row', r.gone === 1 && pushStatus(k, 'phone-1').device.status === 'gone' && m.sheets.Push._data.some((x) => x[0] === 'phone-1'));
goneEndpoint = ''; pushSave(k, dev('phone-1'), ['morning']);
workerUp = false; r = pushTest(k, 'phone-1'); workerUp = true;
ok('the sender down: nothing breaks, it says so', r.sent === 0 && r.failed === 1 && /did not answer/.test(r.why));
s = pushRemove(k, 'phone-1');
ok('switching off keeps the row, marked off, and nothing more is sent to it', s.device.status === 'off' && pushTest(k, 'phone-1').sent === 0);
ok('every send is logged in Day Log', m.sheets['Day Log']._data.filter((x) => /^push /.test(x[1])).length >= 4);

// ---- the bridge: the app can reach these, never the trigger itself
ok('the app can call pushStatus, pushSave, pushRemove and pushTest; pushTick and pushSend_ are not reachable', ['pushStatus', 'pushSave', 'pushRemove', 'pushTest'].every(bridgeAllowed_) && !bridgeAllowed_('pushTick') && !bridgeAllowed_('pushSend_'));

console.log(failed ? `push: ${failed} FAILED` : 'push: all passed');
process.exit(failed ? 1 : 0);
