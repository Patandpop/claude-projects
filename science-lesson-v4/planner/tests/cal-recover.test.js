// node planner/tests/cal-recover.test.js : a planner whose Data tab has no term dates (imported before they joined
// planner-data.json) fetches the file from home by itself instead of stopping the behaviour app with "no term dates
// yet" (Code.gs plannerCal_, Lane C 30 Oct). Fake home mailbox, made-up data.
'use strict';
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path'), vm = require('vm');
let failed = 0;
const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };

const OLD = { classes: {}, timetable: { A: [], B: [] } };   // an old import: no terms, no first Week A
const HOME = Object.assign({}, OLD, { weekAStart: '2026-09-07', terms: [['2026-09-07', '2026-10-21'], ['2026-11-02', '2026-12-18']], inset: [] });
const setData = (obj) => { m.sheets.Data = m.makeSheet('Data', [['chunk'], [JSON.stringify(obj)]]); delete m.cache.ptt; delete m.cache.calRetry; };
let fetches = 0, homeUp = true, homeFile = HOME;
global.UrlFetchApp = { fetch: (url) => {
  fetches++;
  if (!homeUp) throw new Error('Address unavailable');
  const body = /name=planner-data\.json/.test(url) ? { ok: true, found: true, modified: 'm1', text: JSON.stringify(homeFile) } : { ok: false, error: 'Unknown request' };
  return { getContentText: () => JSON.stringify(body), getResponseCode: () => 200 };
} };
global.Utilities.sleep = () => {};

const SRC = path.join(__dirname, '..');
for (const f of ['Code.gs', 'Behaviour.gs']) vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
const why = () => { try { weekLetter_(new Date(2026, 10, 2, 10)); return ''; } catch (e) { return e.message; } };

setData(OLD);
ok(/no term dates yet/.test(why()) && fetches === 0, 'with no home link set up: the plain message, and nothing is fetched');

m.props.MAILBOX_URL = 'https://script.google.com/macros/s/FAKE/exec'; m.props.MAILBOX_KEY = 'mk';
setData(OLD);
ok(why() === '' && weekLetter_(new Date(2026, 10, 2, 10)) === 'B', 'an old Data tab with no term dates: it fetches planner-data.json from home and carries on (w/c 2 Nov is B)');
ok((JSON.parse(m.sheets.Data._data.slice(1).map((r) => r[0]).join('')).terms || []).length === 2 && m.props.DATA_MODIFIED === 'm1', 'the fetched file is stored in the Data tab, as Import data does, and marked as pulled');
const n = fetches; weekLetter_(new Date()); plannerCal_();
ok(fetches === n, 'with the dates in place it never asks home again');

setData(OLD); homeUp = false;
ok(/no term dates yet/.test(why()), 'home not answering: the plain message still shows');
const n2 = fetches; homeUp = true; delete m.cache.ptt; why();
ok(fetches === n2 && /no term dates yet/.test(why()), 'and it waits 10 minutes before asking home again (no slow page on every tap)');

setData(OLD); homeFile = OLD;
ok(/no term dates yet/.test(why()), 'a home file that also lacks the dates: the plain message');

console.log(failed ? `\n${failed} FAILED` : '\nAll term-date recovery checks passed');
process.exit(failed ? 1 : 0);
