// Minimal Apps Script mock: sheets turn strings starting with + - = into #ERROR! like real Sheets,
// and a typed 'YYYY-MM-DD' becomes a Date at midnight, as real Sheets does (work plan 0.2, 2026-10-29).
const sheets = {};
const asSheets = v => {
  if (typeof v !== 'string') return v;
  if (/^[+\-=]/.test(v)) return '#ERROR!';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10));
  return v;
};
function makeSheet(name, rows) {
  const data = rows;
  const cell = asSheets;
  return {
    getName: () => name,
    getLastRow: () => { let n = data.length; while (n > 0 && !(data[n - 1] || []).some(v => v !== '' && v !== undefined && v !== null)) n--; return n; },   // like Sheets: the last row with anything in it
    appendRow: r => data.push(r.map(cell)),
    deleteRow: i => data.splice(i - 1, 1),
    getRange: (r, c, nr, nc) => ({
      getValues: () => data.slice(r - 1, r - 1 + nr).map(row => { const o = []; for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); return o; }),
      setValues: vals => vals.forEach((v, i) => { data[r - 1 + i] = v.map(cell); }),
      getDisplayValues: () => data.slice(r - 1, r - 1 + nr).map(row => { const o = []; for (let j = 0; j < nc; j++) { const v = row[c - 1 + j]; o.push(v === undefined ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v)); } return o; }),
      setNumberFormat: () => ({ setValue: v => { while (data.length < r) data.push([]); data[r - 1][c - 1] = v; }, setValues: vals => vals.forEach((v, i) => { data[r - 1 + i] = v.slice(); }) }),
      clearContent: () => { for (let i = 0; i < nr; i++) if (data[r - 1 + i]) for (let j = 0; j < nc; j++) data[r - 1 + i][c - 1 + j] = ''; },
      setFontWeight: () => ({}),
      getValue: () => { const row = data[r - 1] || []; return row[c - 1] === undefined ? '' : row[c - 1]; },
      setValue: v => { while (data.length < r) data.push([]); data[r - 1][c - 1] = cell(v); },
    }),
    setFrozenRows: () => {},
    clearContents: () => { data.length = 0; },
    getLastColumn: () => Math.max(...data.map(r => r.length)),
    getMaxColumns: () => Math.max(7, ...data.map(r => r.length)),
    insertColumnsAfter: () => {},
    _data: data,
  };
}
sheets.Students = makeSheet('Students', [['Class','Name','Short','X','Y','Ratio'],
  ['7BYA','Test Pupil One','Test P.',4,68,2.7],['7BYA','Test Pupil Two','Test P2.',26,68,2.7]]);
sheets['Behaviour Log'] = makeSheet('Behaviour Log', [['Timestamp','Class','Name','Type','Rule','Rule name']]);
sheets.Sessions = makeSheet('Sessions', [['Start','Class','Mode','Monitored (s)','Red (s)','Settle (s)']]);
sheets.Emails = makeSheet('Emails', [['Date','Class','Name']]);
sheets['Behaviour Settings'] = makeSheet('Behaviour Settings', [['Setting','Value']]);
const props = { PLANNER_KEY: 'k' };   // one app since 2026-10-12: the planner's key
const old = {};   // the old behaviour spreadsheet, for mergeBehaviourData
const book = (tabs) => ({ getSheetByName: (n) => tabs[n] || null, insertSheet: (n) => (tabs[n] = makeSheet(n, [])) });
const cache = {};
global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) };
global.CacheService = { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) };
global.SpreadsheetApp = { getActiveSpreadsheet: () => book(sheets), openById: () => book(old), flush: () => {} };
const lockLog = [];   // which lock each caller took (the behaviour app must use the document lock, 1.3)
const mkLock = (kind) => ({ waitLock: () => { lockLog.push(kind); }, tryLock: () => { lockLog.push(kind); return true; }, releaseLock: () => {} });
global.LockService = { getScriptLock: () => mkLock('script'), getDocumentLock: () => mkLock('document'), getUserLock: () => mkLock('user') };
global.Utilities = { formatDate: (d, tz, f) => {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(d);
  const g = t => p.find(x => x.type === t).value;
  if (f === 'yyyy-MM-dd') return `${g('year')}-${g('month')}-${g('day')}`;
  if (f === "yyyy-MM-dd'T'HH:mm") return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`;
  if (f === 'H') return String(Number(g('hour')));
  if (f === 'HH:mm') return `${g('hour')}:${g('minute')}`;
  if (f === 'u') return String(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(g('weekday')) + 1);
  if (f === 'd MMM') return `${+g('day')} ${d.toLocaleString('en-GB',{month:'short'})}`;
  return d.toISOString(); }, parseDate: (str) => new Date(str + 'T00:00:00'), getUuid: () => Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2) };
global.ContentService = { createTextOutput: t => ({ setMimeType: () => t }), MimeType: {} };
global.HtmlService = {}; global.ScriptApp = { getService: () => ({ getUrl: () => 'u' }) }; global.Session = { getScriptTimeZone: () => 'Europe/London' };
global.Logger = { log: console.log };
module.exports = { sheets, props, cache, old, makeSheet, asSheets, lockLog };
