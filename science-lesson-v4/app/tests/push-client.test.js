// node app/tests/push-client.test.js : switching notifications on and off on a device (app/src/push.js), with a fake
// browser and a fake planner. No real data.
'use strict';
const { makePush, keyBytes } = require('../src/push.js');
let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + 'push client: ' + n); if (!c) failed++; };

function world(o) {
  o = o || {};
  const calls = [], store = {}, state = { sub: null, unsub: 0, asked: 0, subscribedWith: null };
  const api = { call: (fn, ...args) => { calls.push({ fn, args });
    if (fn === 'pushStatus') return Promise.resolve(o.status || { ready: true, publicKey: 'BPUB_lic-1', kinds: ['morning', 'nudge'], device: null });
    if (fn === 'pushSave') return Promise.resolve({ ready: true, device: { status: 'on', kinds: args[1] } });
    if (fn === 'pushRemove') return Promise.resolve({ ready: true, device: { status: 'off', kinds: [] } });
    return Promise.resolve({ sent: 1 }); } };
  const reg = { pushManager: {
    getSubscription: () => Promise.resolve(state.sub),
    subscribe: (opt) => { state.subscribedWith = opt; state.sub = { toJSON: () => ({ endpoint: 'https://push.example/abc', keys: { p256dh: 'P256', auth: 'AUTH' } }), unsubscribe: () => { state.unsub++; state.sub = null; return Promise.resolve(true); } }; return Promise.resolve(state.sub); } } };
  const N = { permission: o.permission || 'default', requestPermission: () => { state.asked++; return Promise.resolve(o.answer || 'granted'); } };
  const nav = { userAgent: o.ua || 'Mozilla/5.0 (Linux; Android 14)', serviceWorker: { ready: Promise.resolve(reg) } };
  const P = makePush({ api, storage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } }, navigator: nav, Notification: o.noNotification ? undefined : N });
  return { P, calls, store, state };
}

(async () => {
  let w = world();
  const st = await w.P.on(['morning', 'nudge']);
  const save = w.calls.find((c) => c.fn === 'pushSave');
  ok('switching on asks permission once, subscribes with the planner\'s key, and saves this device with the ticked kinds',
    w.state.asked === 1 && w.state.subscribedWith.userVisibleOnly === true && w.state.subscribedWith.applicationServerKey.length === keyBytes('BPUB_lic-1').length &&
    save && save.args[0].endpoint === 'https://push.example/abc' && save.args[0].keys.p256dh === 'P256' && save.args[0].label === 'Phone' && save.args[1].join() === 'morning,nudge' && st.device.status === 'on');
  const id = w.store['app.deviceId'];
  await w.P.on(['morning']);
  ok('the device keeps one id, and switching on again reuses the same push address', id && w.calls.filter((c) => c.fn === 'pushSave').every((c) => c.args[0].deviceId === id) && w.state.asked === 2);
  await w.P.off();
  ok('switching off drops the push address here and tells the planner', w.state.unsub === 1 && w.calls.some((c) => c.fn === 'pushRemove' && c.args[0] === id));
  await w.P.test();
  ok('Send a test asks the planner for this device only', w.calls.some((c) => c.fn === 'pushTest' && c.args[0] === id));

  w = world({ answer: 'denied' }); let why = '';
  try { await w.P.on(['morning']); } catch (e) { why = e.message; }
  ok('permission refused: a plain message, nothing saved', /blocked for this app/.test(why) && !w.calls.some((c) => c.fn === 'pushSave'));
  w = world({ status: { ready: false, kinds: ['morning', 'nudge'], device: null } }); why = '';
  try { await w.P.on(['morning']); } catch (e) { why = e.message; }
  ok('the planner not set up: says so before asking any permission', /not set up on the planner/.test(why) && w.state.asked === 0);
  w = world({ permission: 'granted', ua: 'Windows NT 10.0' });
  await w.P.on(['nudge']);
  ok('permission already given: not asked again; a PC is labelled Computer', w.state.asked === 0 && w.calls.find((c) => c.fn === 'pushSave').args[0].label === 'Computer');
  w = world({ noNotification: true }); why = '';
  try { await w.P.on(['morning']); } catch (e) { why = e.message; }
  ok('a browser with no notifications: a plain message (iPhone: add to the home screen first)', !w.P.supported() && /home screen/.test(why));

  // the service worker (sw.js) with a fake worker scope: a message shows with the planner's words; a tap brings the
  // app forward, or opens it if it is closed
  const fs = require('fs'), path = require('path'), vm = require('vm');
  const on = {}, shown = [], opened = [], focused = [];
  let wins = [];
  const self = { addEventListener: (t, f) => { on[t] = f; }, location: { origin: 'https://ulhu-planner.pages.dev' },
    registration: { scope: 'https://ulhu-planner.pages.dev/', showNotification: (t, o) => { shown.push({ t, o }); return Promise.resolve(); } },
    clients: { matchAll: () => Promise.resolve(wins), openWindow: (u) => { opened.push(u); return Promise.resolve(); }, claim: () => Promise.resolve() } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'sw.js'), 'utf8'), { self, caches: {}, URL, fetch: () => {} });
  const wait = [], ev = (extra) => Object.assign({ waitUntil: (p) => wait.push(p) }, extra);
  on.push(ev({ data: { json: () => ({ title: 'Planner', body: 'Today: 10S2 P3 L4 Ripple tanks not built', tag: 'morning-2026-11-03', url: './' }) } }));
  on.push(ev({ data: { json: () => { throw new Error('not json'); }, text: () => 'plain words' } }));
  await Promise.all(wait);
  ok('a message shows as a notification with the planner\'s words, its tag and the app icon',
    shown[0].t === 'Planner' && shown[0].o.body === 'Today: 10S2 P3 L4 Ripple tanks not built' && shown[0].o.tag === 'morning-2026-11-03' && /icon-192/.test(shown[0].o.icon));
  ok('a message that is not in the usual shape still shows (as plain words)', shown[1].t === 'Planner' && shown[1].o.body === 'plain words');
  let closed = 0; const note = { close: () => closed++, data: { url: './' } };
  on.notificationclick(ev({ notification: note })); await Promise.all(wait);
  ok('tapping it with the app closed opens the app', closed === 1 && opened[0] === 'https://ulhu-planner.pages.dev/');
  wins = [{ url: 'https://ulhu-planner.pages.dev/', focus: () => { focused.push(1); return Promise.resolve(); } }];
  on.notificationclick(ev({ notification: note })); await Promise.all(wait);
  ok('tapping it with the app open brings it forward (no second copy)', focused.length === 1 && opened.length === 1);

  console.log(failed ? `push client: ${failed} FAILED` : 'push client: all passed');
  process.exit(failed ? 1 : 0);
})();
