// node app/tests/pc-timer.test.js : the home PC's evening timer (app/src/pc-timer.js) against a fake ActivityWatch and
// a fake planner. Made-up windows, no real data.
'use strict';
const path = require('path');
const { makePcTimer, activeSeconds } = require(path.join(__dirname, '..', 'src', 'pc-timer.js'));
const L = require(path.join(__dirname, '..', '..', 'planner', 'day-logic.js'));
let failed = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed++; };

const T = (hm) => new Date('2026-11-03T' + hm + ':00').getTime();
const ev = (hm, sec, app, title) => ({ timestamp: new Date(T(hm)).toISOString(), duration: sec, data: { app, title } });
const afk = (hm, sec) => ({ timestamp: new Date(T(hm)).toISOString(), duration: sec, data: { status: 'afk' } });
let WIN = [], AFK = [], AW_UP = true, SERVER_UP = true, NOW = T('18:00');
const urls = [], sent = [];
const fetchFn = (url) => {
  urls.push(url);
  if (!AW_UP) return Promise.reject(new TypeError('Failed to fetch'));
  const json = (v) => Promise.resolve({ ok: true, json: () => Promise.resolve(v) });
  if (/\/buckets\/$/.test(url)) return json({ 'aw-watcher-window_HOMEPC': {}, 'aw-watcher-afk_HOMEPC': {} });
  const q = new URL(url), s = Date.parse(q.searchParams.get('start')), e = Date.parse(q.searchParams.get('end'));
  const inWin = (x) => Date.parse(x.timestamp) < e && Date.parse(x.timestamp) + x.duration * 1000 > s;
  return json((/window/.test(url) ? WIN : AFK).filter(inWin));
};
const api = { call: (fn, rows) => { if (!SERVER_UP) return Promise.reject(new Error('no signal')); sent.push(...rows); const ids = new Set(); return Promise.resolve({ saved: rows.length }); } };
const mem = {}; const storage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
const pc = makePcTimer({ fetch: fetchFn, storage, api, logic: L, now: () => NOW });

(async () => {
  ok(Math.round(activeSeconds(0, 600000, [{ s: 120000, e: 300000 }])) === 420, 'idle time is taken away from a window\'s time');
  let r = await pc.sync();
  ok(r.off === true && !urls.length, 'switched off: ActivityWatch is not even asked');
  pc.setOn(true);

  // 17:00 to 18:00: 25 min PowerPoint on a 9AS lesson, 20 min Gmail with 5 idle, 10 min YouTube
  WIN = [ev('17:00', 1500, 'POWERPNT.EXE', 'Latent Heat 9AS.pptx - PowerPoint'), ev('17:25', 1200, 'chrome.exe', 'Inbox - Gmail'), ev('17:45', 600, 'chrome.exe', 'Cats - YouTube')];
  AFK = [afk('17:30', 300)];
  r = await pc.sync();
  const by = (j, c) => sent.filter((x) => x.job === j && (c === undefined || x.cls === c)).reduce((s, x) => s + x.minutes, 0);
  ok(by('Building lessons', '9AS') === 25 && by('Emails') === 15 && by('Personal') === 10, 'first sync: from midnight, minutes per job and class, idle taken away (25 Building 9AS, 15 Emails, 10 Personal)');
  ok(sent.every((x) => x.day === '2026-11-03' && /^pc-2026-11-03-/.test(x.id)) && new Set(sent.map((x) => x.id)).size === sent.length, 'each row has its own id and the day');
  ok(!JSON.stringify(sent).includes('Latent Heat') && !JSON.stringify(sent).includes('Gmail') && !JSON.stringify(sent).includes('YouTube'), 'no window title ever leaves the PC');
  ok(urls.some((u) => u.startsWith('http://localhost:5600/api/0/buckets/')), 'it reads ActivityWatch on this PC only');

  // part-minutes carry over: three syncs of 40 s each of Admin add up to 2 minutes in the end, not 0
  sent.length = 0;
  for (const hm of ['18:01', '18:02', '18:03']) { WIN = [ev(hm, 40, 'chrome.exe', 'Planner - Google Sheets')]; NOW = T(hm) + 50000; await pc.sync(); }
  ok(by('Admin') === 2, 'part-minutes carry over between syncs (3 x 40 s = 2 min, not 0)');

  // no signal to the planner: nothing is lost, the mark does not move, the resend is the same total
  sent.length = 0; SERVER_UP = false;
  WIN = [ev('18:10', 600, 'WINWORD.EXE', 'Waves 10S2_worksheet.docx - Word')]; NOW = T('18:20');
  let threw = false; try { await pc.sync(); } catch (e) { threw = true; }
  const upTo = pc.state().upTo;
  ok(threw && upTo < T('18:10'), 'no signal: the "counted up to" mark stays where it was');
  SERVER_UP = true; await pc.sync();
  ok(by('Building lessons', '10S2') === 10 && pc.state().upTo === T('18:20'), '...and the next sync sends the same 10 minutes, once');

  // ActivityWatch not running
  AW_UP = false; threw = '';
  try { await pc.sync(); } catch (e) { threw = e.message; }
  ok(/not answering on this PC/.test(threw) && pc.state().error, 'ActivityWatch not running: a plain message, nothing sent');
  AW_UP = true;

  // the app was closed for a while: the next open back-fills from the mark
  sent.length = 0; WIN = [ev('18:30', 900, 'chrome.exe', 'classroom.google.com - Classroom'), ev('18:49', 60, 'chrome.exe', 'Inbox - Gmail')]; NOW = T('18:50');
  await pc.sync();
  ok(by('Setting homework') === 15, 'a gap while the app was closed is back-filled from ActivityWatch');

  // Ulhu's pop-ups
  NOW = T('18:50') + 30000;
  ok(pc.popupDue() === null, 'no pop-up until the new job has been in front for 2 minutes');
  NOW = T('18:53');
  let p = pc.popupDue();
  ok(p && p.kind === 'day' && p.job === 'Emails' && p.since === T('18:49'), 'then one pop-up saying what he is counting, and since when');
  ok(pc.popupDue() === null, '...and never the same one twice');
  pc.notThat(); sent.length = 0;
  WIN = [ev('18:52', 120, 'chrome.exe', 'Inbox - Gmail')]; NOW = T('18:54'); await pc.sync();
  ok(sent.length && sent.every((x) => x.maybe === true), '"Not that": that job\'s minutes go to the report marked "maybe"');
  NOW = T('19:05'); WIN = [ev('19:00', 300, 'POWERPNT.EXE', 'Waves 10S2.pptx')]; await pc.sync();
  NOW = T('19:20'); p = pc.popupDue();
  ok(p && p.kind === 'night' && p.ledger.length >= 3 && p.ledger[0].minutes >= p.ledger[1].minutes, 'after 19:00: one night pop-up with tonight\'s tally, biggest first');
  ok(pc.popupDue() === null, 'and no more pop-ups that evening');
  pc.setOn(false);
  ok((await pc.sync()).off === true, 'switching it off stops the counting');

  console.log(failed ? `\n${failed} FAILED` : '\nAll PC timer checks passed');
  process.exit(failed ? 1 : 0);
})();
