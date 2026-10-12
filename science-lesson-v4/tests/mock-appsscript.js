// Minimal Apps Script mock: sheets turn strings starting with + - = into #ERROR! like real Sheets.
const sheets = {};
function makeSheet(name, rows) {
  const data = rows;
  const cell = v => (typeof v === 'string' && /^[+\-=]/.test(v)) ? '#ERROR!' : v;
  return {
    getName: () => name,
    getLastRow: () => data.length,
    appendRow: r => data.push(r.map(cell)),
    deleteRow: i => data.splice(i - 1, 1),
    getRange: (r, c, nr, nc) => ({
      getValues: () => data.slice(r - 1, r - 1 + nr).map(row => { const o = []; for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); return o; }),
      setValues: vals => vals.forEach((v, i) => { data[r - 1 + i] = v.map(cell); }),
      setFontWeight: () => ({}),
      getValue: () => { const row = data[r - 1] || []; return row[c - 1] === undefined ? '' : row[c - 1]; },
      setValue: v => { while (data.length < r) data.push([]); data[r - 1][c - 1] = cell(v); },
    }),
    setFrozenRows: () => {},
    getLastColumn: () => Math.max(...data.map(r => r.length)),
    getMaxColumns: () => Math.max(7, ...data.map(r => r.length)),
    insertColumnsAfter: () => {},
    _data: data,
  };
}
sheets.Students = makeSheet('Students', [['Class','Name','Short','X','Y','Ratio'],
  ['7BYA','Thomas Boxall','Thomas B.',4,68,2.7],['7BYA','Tom Browning','Tom B.',26,68,2.7]]);
sheets.Log = makeSheet('Log', [['Timestamp','Class','Name','Type','Rule','Rule name']]);
sheets.Sessions = makeSheet('Sessions', [['Start','Class','Mode','Monitored (s)','Red (s)','Settle (s)']]);
sheets.Emails = makeSheet('Emails', [['Date','Class','Name']]);
sheets.Settings = makeSheet('Settings', [['Setting','Value']]);
const props = { SHEET_ID: 'x', KEY: 'k' };
const cache = {};
global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) };
global.CacheService = { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) };
global.SpreadsheetApp = { openById: () => ({ getSheetByName: n => sheets[n] }), flush: () => {} };
global.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
global.Utilities = { formatDate: (d, tz, f) => {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(d);
  const g = t => p.find(x => x.type === t).value;
  if (f === 'yyyy-MM-dd') return `${g('year')}-${g('month')}-${g('day')}`;
  if (f === 'HH:mm') return `${g('hour')}:${g('minute')}`;
  if (f === 'u') return String(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(g('weekday')) + 1);
  if (f === 'd MMM') return `${+g('day')} ${d.toLocaleString('en-GB',{month:'short'})}`;
  return d.toISOString(); }, getUuid: () => Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2) };
global.ContentService = { createTextOutput: t => ({ setMimeType: () => t }), MimeType: {} };
global.HtmlService = {}; global.ScriptApp = { getService: () => ({ getUrl: () => 'u' }) };
global.Logger = { log: console.log };
module.exports = { sheets, props, cache };
