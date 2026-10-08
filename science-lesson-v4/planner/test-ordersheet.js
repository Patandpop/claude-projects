// node planner/test-ordersheet.js — runs the order-sheet drawing in Code.gs against a fake Google Sheet
// (every call is recorded) and checks the one-page print settings, so mistakes show up before pasting.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const P = require('./logic.js');

let fails = 0;
const check = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

const values = {}, merges = [], calls = [];
const A = (c) => String.fromCharCode(64 + c);
function range(r, c, nr, nc) {
  const self = new Proxy({}, { get(_, k) {
    if (k === 'merge') return () => { merges.push(A(c) + r + ':' + A(c + (nc || 1) - 1) + (r + (nr || 1) - 1)); return self; };
    if (k === 'setValue') return (v) => { values[A(c) + r] = v; return self; };
    if (k === 'setValues') return (vv) => { vv.forEach((row, i) => row.forEach((v, j) => { values[A(c + j) + (r + i)] = v; })); return self; };
    if (k === 'setRichTextValue') return (v) => { values[A(c) + r] = v.text; return self; };
    return (...a) => { calls.push(k); return self; };
  } });
  return self;
}
const sheet = {
  getRange: (r, c, nr, nc) => range(r, c, nr, nc), getMaxRows: () => 1000, getMaxColumns: () => 26,
  deleteColumns() {}, deleteRows() {}, setHiddenGridlines() {}, setColumnWidth() {}, setRowHeight() {}, setFrozenRows() {}, setName() {},
};
const builder = () => { const b = { text: '', setText(t) { b.text = t; return b; }, setTextStyle() { return b; }, build() { return { text: b.text }; } }; return b; };
const ctx = vm.createContext({
  SpreadsheetApp: { newRichTextValue: builder, newTextStyle: () => new Proxy({}, { get: (_, k) => (k === 'build' ? () => ({}) : function () { return this; }) }), BorderStyle: {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
  JSON, Date, String, Object, Error, Math,
});
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8'), ctx);

console.log('── technicians\' order sheet');
const data = require('./planner-data.json');
const week = P.autofill(data, {}, P.parse('2026-10-12'), {});
const model = P.sheetModel(data, week);
ctx.drawOrderSheet_(sheet, model);
check(/Teacher/.test(values.A1) && /Week B/.test(values.Q1), 'title row: teacher, week letter and date (his design)');
check(values.B2 === 'Period 1' && values.V2 === 'Period 5' && values.F2 === undefined, 'period headings 1 to 5, with cutting gaps between cards');
check(values.A3 === 'Mon' && values.A27 === 'Fri' && values.B3 === 'Mon P1', 'a day label for each day and a header on each card');
const mon1 = model.days[0].slots[0];
check(values.E4 === mon1.cls && values.C4 === 'S8' && values.B5 === mon1.lesson, 'Monday P1: room, class and lesson in the right boxes');
check(String(values.B6).startsWith(mon1.kit), 'Monday P1: kit in the big box');
check(values.C7 === mon1.size && String(values.E7) === String(mon1.sets), 'Monday P1: class size and number of sets');
check(values.A34 === 'Key' && values.B34, 'colour key row at the bottom');
check(merges.includes('A3:A7') && merges.includes('B6:E6'), 'day label and kit boxes are merged');
check(model.days.every((d) => d.slots.length === 5), 'every day has 5 period boxes (blank when free)');

// one-page print settings in the downloaded file
const xml = '<?xml version="1.0"?><worksheet xmlns="x"><sheetPr><outlinePr summaryBelow="0"/></sheetPr><sheetData/><pageMargins left="1" right="1" top="1" bottom="1" header="0" footer="0"/><drawing r:id="d"/></worksheet>';
const blobOf = (name, s) => ({ getName: () => name, getDataAsString: () => s, setContentType() { return this; } });
let zipped = null;
ctx.Utilities = { unzip: () => [blobOf('xl/worksheets/sheet1.xml', xml), blobOf('xl/workbook.xml', '')], newBlob: (s, t, n) => blobOf(n, s), zip: (b) => { zipped = b; return 'zip'; } };
ctx.onePage_(blobOf('a', ''), 't');
const out = zipped && zipped[0].getDataAsString();
check(out && /<sheetPr><outlinePr[^>]*\/><pageSetUpPr fitToPage="1"\/><\/sheetPr>/.test(out), 'fit-to-page switched on');
check(out && /horizontalCentered="1"/.test(out) && out.indexOf('<printOptions') < out.indexOf('<pageMargins'), 'centred on the page, in the right place in the file');
check(out && /orientation="landscape"/.test(out) && /fitToHeight="1"/.test(out) && out.indexOf('<pageSetup') < out.indexOf('<drawing'), 'landscape A4 on one page, in the right place in the file');
check(out && (out.match(/<pageMargins/g) || []).length === 1, 'old margins replaced, not duplicated');

console.log(fails ? `FAILED ${fails}` : 'order sheet: all checks pass');
process.exit(fails ? 1 : 0);
