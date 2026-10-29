// The installed app's server file (app/src/api.js) and outbox (app/src/outbox.js) against a fake server.
// Run: node app/tests/api.test.js  (also run by node app/tests/run.js)
'use strict';
const path = require('path');
const { makeApi, NAMES } = require(path.join(__dirname, '..', 'src', 'api.js'));
const { makeOutbox } = require(path.join(__dirname, '..', 'src', 'outbox.js'));

let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };
const memStore = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, raw: m }; };
const URL = 'https://script.google.com/macros/s/AKfy-cbx_123/exec';

// a fake planner server: mode 'ok' answers, 'down' throws like a dropped connection, 'refuse' answers ok:false
function fakeServer() {
  const s = { mode: 'ok', calls: [], downTimes: 0, seen: new Set(), written: [] };
  s.fetch = async (url, init) => {
    const b = JSON.parse(init.body); s.calls.push({ url, init, b });
    if (s.downTimes > 0) { s.downTimes--; throw new TypeError('Failed to fetch'); }
    if (s.mode === 'down') throw new TypeError('Failed to fetch');
    const reply = (j) => ({ ok: true, status: 200, json: async () => j });
    if (s.mode === 'html') return { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } };
    if (b.key !== 'abc123-k9') return reply({ ok: false, error: 'Locked' });
    if (s.mode === 'refuse' || b.fn === 'bad') return reply({ ok: false, error: 'Nope' });
    if (b.fn === 'logEvent') { const id = b.args[4]; if (!s.seen.has(id)) { s.seen.add(id); s.written.push(b.args); } return reply({ ok: true, result: s.written.length }); }
    return reply({ ok: true, result: { fn: b.fn, args: b.args } });
  };
  return s;
}

(async () => {
  const srv = fakeServer(), store = memStore();
  const api = makeApi({ fetch: srv.fetch, storage: store, wait: async () => {} });
  let locked = 0; api.onLocked = () => { locked++; };

  ok('not ready until the address and key are saved', !api.ready());
  let threw = ''; try { api.save('https://evil.example.com/exec', 'abc123-k9'); } catch (e) { threw = e.message; }
  ok('an address that is not a Google Apps Script web app is refused', /should look like/.test(threw) && !api.ready());
  threw = ''; try { api.save(URL, 'abc 123<'); } catch (e) { threw = e.message; }
  ok('a key with odd characters is refused', /letters, numbers/.test(threw));
  api.save(URL, 'abc123-k9');
  ok('ready once saved (a key with a dash, like the real ones)', api.ready() && api.settings().url === URL);

  let r = await api.init();
  const c = srv.calls[srv.calls.length - 1];
  ok('a named call POSTs { key, fn, args } as plain text and follows the redirect', r.fn === 'init' && c.init.method === 'POST' && c.init.headers['Content-Type'].startsWith('text/plain') && c.init.redirect === 'follow' && c.b.key === 'abc123-k9');
  r = await api.openClass('9AS');
  ok('arguments travel in order', JSON.stringify(r.args) === '["9AS"]');
  r = await api.call('gameTick', 'g1', { at: 5 });
  ok('api.call works for any name', r.fn === 'gameTick' && r.args[1].at === 5);
  ok('every carried-across call has a shortcut', NAMES.every((n) => typeof api[n] === 'function'));

  srv.downTimes = 1; const before = srv.calls.length;
  r = await api.init();
  ok('a network blip is retried once and then works', r.fn === 'init' && srv.calls.length - before === 2);
  srv.mode = 'refuse'; const b2 = srv.calls.length; let err = null;
  try { await api.init(); } catch (e) { err = e; }
  ok('a refusal from the server is not retried and comes back as an error', err && err.server && err.message === 'Nope' && srv.calls.length - b2 === 1);
  srv.mode = 'html'; err = null;
  try { await api.init(); } catch (e) { err = e; }
  ok('a page that is not an answer (wrong address) gives a plain message', err && /not an answer/.test(err.message));
  srv.mode = 'ok';
  store.setItem('app.key', 'wrongkey'); err = null;
  try { await api.init(); } catch (e) { err = e; }
  ok('a wrong key calls onLocked so the app can ask again', err && err.message === 'Locked' && locked === 1);
  store.setItem('app.key', 'abc123-k9');

  // ---- outbox
  let up = true;
  const box = makeOutbox({ storage: store, api, online: () => up, now: (() => { let t = 1000; return () => t++; })() });
  const changes = []; box.onChange = (w, s) => changes.push([w, s]);
  up = false; srv.mode = 'down';
  const id1 = box.add('logEvent', ['9AS', 'P1', '+', 0, '$id'], 'positive');
  const id2 = box.add('logEvent', ['9AS', 'P2', '+', 0, '$id'], 'positive');
  box.add('gameTick', ['g1', { at: '$at' }]);
  ok('items wait in the order they were made, each with its own id', box.waiting().map((x) => x.id).join() === [id1, id2, box.waiting()[2].id].join() && id1 !== id2);
  ok('$id is filled with the item\'s own id', box.waiting()[0].args[4] === id1);
  let n = await box.flush();
  ok('no signal: nothing is sent and nothing counts against an item', n === 0 && box.waiting().length === 3 && box.waiting().every((x) => x.tries === 0));
  // reload: a new outbox over the same storage still has them
  const box2 = makeOutbox({ storage: store, api, online: () => up });
  ok('the outbox survives closing the app', box2.waiting().length === 3);
  up = true; srv.mode = 'ok'; const firstSend = srv.calls.length;
  n = await box2.flush();
  const sentFns = srv.calls.slice(firstSend).map((x) => x.b.fn + ':' + (typeof x.b.args[1] === 'string' ? x.b.args[1] : ''));
  ok('signal back: all sent, in order', n === 3 && box2.waiting().length === 0 && sentFns.join() === 'logEvent:P1,logEvent:P2,gameTick:');
  // the same item sent twice (a reply lost after the server wrote it) is written once
  srv.seen.clear(); srv.written = [];
  box2.add('logEvent', ['9AS', 'P3', '+', 0, '$id']);
  const dup = box2.waiting()[0];
  await api.call.apply(null, [dup.fn].concat(dup.args));   // the first send landed but the phone never heard back
  await box2.flush();
  ok('a resend of the same item is written once on the server', srv.written.length === 1 && box2.waiting().length === 0);
  // a bad item is set aside after three refusals and never blocks the ones behind it
  box2.add('bad', []); box2.add('logEvent', ['9AS', 'P4', '+', 0, '$id']);
  await box2.flush(); await box2.flush(); await box2.flush();
  ok('three refusals set the item aside as stuck; the next one is sent', box2.stuck().length === 1 && box2.stuck()[0].why === 'Nope' && box2.waiting().length === 0 && srv.written.some((a) => a[1] === 'P4'));
  box2.forgetStuck();
  ok('Forget clears the stuck list', box2.stuck().length === 0);
  // two flushes at once never send an item twice
  srv.seen.clear(); srv.written = []; const cBefore = srv.calls.length;
  box2.add('logEvent', ['9AS', 'P5', '+', 0, '$id']);
  await Promise.all([box2.flush(), box2.flush()]);
  ok('two flushes at once send each item once', srv.calls.length - cBefore === 1);
  ok('the app hears about changes (for the waiting count)', changes.length > 0);

  console.log(failed ? `\n${failed} FAILED` : '\nAll api and outbox checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
