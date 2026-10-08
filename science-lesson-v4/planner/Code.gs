/* Planner web app — server (Google Apps Script). Patryk 2026-10-03.
   Same pattern as the behaviour tracker: a web app bound to a Google Sheet, opened with ?key=.
   Deploy: Execute as "Me", access "Anyone within organisation" (the school blocks public apps).

   Sheet tabs (made by setup()):
     Data       planner-data.json from home (node science-lesson/references/planner-catalogue.js --export),
                stored in 45,000-character chunks down column A
     Weeks      A: Monday (YYYY-MM-DD)  B: the saved week as JSON  C: saved at
     Equipment  A: lesson key  B: equipment  C: sets  D: saved at    (edits the planner remembers)
   Script properties:
     PLANNER_KEY   the secret in the link (?key=...)
     TEMPLATE_ID   a Google Sheet holding ONE of his order-sheet tabs, used for the Excel download
     MAILBOX_URL   the "Planner mailbox" web app on his PERSONAL account (Mailbox.gs), and
     MAILBOX_KEY   its key. With these set, new data from home arrives by itself (no Import data),
                   saved weeks go home, and "Send to Claude" requests reach Claude Code at home.
*/

const VERSION = 4;

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  [['Data', ['chunk']], ['Weeks', ['monday', 'week', 'saved']], ['Equipment', ['lesson', 'equipment', 'sets', 'saved']]].forEach(([name, head]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(head);
  });
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PLANNER_KEY')) props.setProperty('PLANNER_KEY', Utilities.getUuid().slice(0, 12));
  Logger.log('Planner key: ' + props.getProperty('PLANNER_KEY') + '  (open the web app URL with ?key=THIS)');
}

function check_(k) {
  if (!k || k !== PropertiesService.getScriptProperties().getProperty('PLANNER_KEY')) throw new Error('Locked');
}

function doGet(e) {
  const key = (e && e.parameter && e.parameter.key) || '';
  if (key !== PropertiesService.getScriptProperties().getProperty('PLANNER_KEY')) {
    return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:24px">Locked. Open the link that ends in ?key=</p>');
  }
  const t = HtmlService.createTemplateFromFile('Planner');
  t.key = key;
  return t.evaluate().setTitle('Planner').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

/* ------------------------------------------------------------------ mailbox
   The school blocks sharing his personal Drive and blocks public school web apps, so the planner
   talks to a small web app on his personal account instead (see Mailbox.gs). Every call is best
   effort: if the mailbox is not set up or not reachable, the planner works exactly as before. */
function mailboxOn_() { const p = PropertiesService.getScriptProperties(); return !!(p.getProperty('MAILBOX_URL') && p.getProperty('MAILBOX_KEY')); }
function mailGet_(params) {
  const p = PropertiesService.getScriptProperties();
  const q = Object.keys(params).map((x) => x + '=' + encodeURIComponent(params[x])).join('&');
  const r = UrlFetchApp.fetch(p.getProperty('MAILBOX_URL') + '?key=' + encodeURIComponent(p.getProperty('MAILBOX_KEY')) + '&' + q, { muteHttpExceptions: true });
  const o = JSON.parse(r.getContentText());
  if (!o.ok) throw new Error(o.error || 'mailbox error');
  return o;
}
function mailPost_(body) {
  const p = PropertiesService.getScriptProperties();
  body.key = p.getProperty('MAILBOX_KEY');
  const r = UrlFetchApp.fetch(p.getProperty('MAILBOX_URL'), { method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
  const o = JSON.parse(r.getContentText());
  if (!o.ok) throw new Error(o.error || 'mailbox error');
  return o;
}
// New planner-data.json from home? Store it (same as Import data) and say so.
function pullData_() {
  if (!mailboxOn_()) return { on: false };
  try {
    const o = mailGet_({ op: 'read', name: 'planner-data.json' });
    if (!o.found) return { on: true, note: 'no data file at home yet' };
    const props = PropertiesService.getScriptProperties();
    if (o.modified === props.getProperty('DATA_MODIFIED')) return { on: true };
    importData_(o.text);
    props.setProperty('DATA_MODIFIED', o.modified);
    return { on: true, pulled: o.modified };
  } catch (e) { return { on: true, error: String(e.message || e) }; }
}
// Saved weeks, his equipment edits and added lessons, as one file for home to read.
function pushState_() {
  if (!mailboxOn_()) return null;
  try {
    const a = loadAll_(false);
    mailPost_({ op: 'write', name: 'planner-state.json', text: JSON.stringify({ saved: new Date().toISOString(), weeks: a.weeks, learned: a.learned, added: a.added, classSettings: a.classSettings }) });
    return true;
  } catch (e) { return String(e.message || e); }
}
// "Send to Claude": a message or a list of lessons to build, for Claude Code at home.
function sendRequest(k, req) {
  check_(k);
  if (!mailboxOn_()) throw new Error('The mailbox is not set up yet (see the setup guide: MAILBOX_URL and MAILBOX_KEY).');
  const o = mailPost_({ op: 'request', kind: req.kind, text: req.text, lessons: req.lessons || [] });
  return { id: o.id };
}

// Everything the page needs in one call.
function loadAll(k) {
  check_(k);
  const sync = pullData_();
  const a = loadAll_(true);
  a.sync = sync;
  return a;
}
function loadAll_(withData) {
  const d = sheet_('Data');
  const chunks = d.getLastRow() > 1 ? d.getRange(2, 1, d.getLastRow() - 1, 1).getValues().map((r) => r[0]).join('') : '';
  const weeks = {};
  const w = sheet_('Weeks');
  if (w.getLastRow() > 1) w.getRange(2, 1, w.getLastRow() - 1, 2).getValues().forEach(([m, json]) => {
    const mon = m instanceof Date ? Utilities.formatDate(m, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(m);
    try { weeks[mon] = JSON.parse(json); } catch (e) { /* skip a damaged row */ }
  });
  const learned = {};
  const q = sheet_('Equipment');
  if (q.getLastRow() > 1) q.getRange(2, 1, q.getLastRow() - 1, 3).getValues().forEach(([key, eq, sets]) => { learned[key] = { eq, sets: sets || null }; });
  const added = [];
  const ad = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Added');
  if (ad && ad.getLastRow() > 1) ad.getRange(2, 1, ad.getLastRow() - 1, 1).getValues().forEach(([json]) => { try { added.push(JSON.parse(json)); } catch (e) { /* skip */ } });
  const classSettings = {};
  const cs = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ClassSettings');
  if (cs && cs.getLastRow() > 1) cs.getRange(2, 1, cs.getLastRow() - 1, 2).getValues().forEach(([cls, json]) => { try { classSettings[cls] = JSON.parse(json); } catch (e) { /* skip */ } });
  return { version: VERSION, data: withData && chunks ? JSON.parse(chunks) : null, weeks, learned, added, classSettings };
}

// A tab, made the first time it is needed (so an existing planner needs no setup re-run).
function tab_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); }
  return sh;
}

/* ------------------------------------------------------------- new lessons
   A lesson he adds in the planner (Patryk 2026-10-05). Optionally makes an EMPTY lesson folder on
   Drive, "Lesson 4a - Title", inside the topic folder, so he can build into it. It only ever CREATES
   a folder (never renames, moves or deletes), reuses one that already has that name, and logs every
   folder it makes in the Log tab. The Lessons folder is found by the LESSONS_FOLDER_ID script
   property, or else by looking for "Beechen Cliff Science" > "Lessons" in the Drive this script can see. */
function lessonsRoot_() {
  const id = PropertiesService.getScriptProperties().getProperty('LESSONS_FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  const tops = DriveApp.searchFolders("title = 'Beechen Cliff Science' and trashed = false");
  while (tops.hasNext()) {
    const kids = tops.next().getFoldersByName('Lessons');
    if (kids.hasNext()) return kids.next();
  }
  return null;
}
function createLesson(k, info) {
  check_(k);
  const rec = { cls: info.cls, unit: info.unit, afterKey: info.afterKey || '', num: info.num, title: info.title, rel: null };
  let message = 'Added to the planner.', url = '';
  if (info.makeFolder && info.topicRel) {
    const root = lessonsRoot_();
    if (!root && mailboxOn_()) {
      // his Lessons folders live on the personal account: the mailbox makes the folder there
      try {
        const o = mailPost_({ op: 'mkdir', topicRel: info.topicRel, folderName: info.folderName });
        rec.rel = info.topicRel + '/' + String(info.folderName).replace(/[\\/:*?"<>|]+/g, ' ').trim(); url = o.url || '';
        message = o.existed ? 'Added. That folder was already on your Drive.' : 'Added, with an empty folder on your Drive: ' + info.folderName;
        tab_('Log', ['when', 'what', 'where']).appendRow([new Date(), 'asked mailbox for lesson folder', rec.rel]);
      } catch (e) { message = 'Added, but the folder was not made: ' + e.message; }
    } else if (!root) message = 'Added, but this Google account cannot see your "Beechen Cliff Science / Lessons" folder, so no folder was made (see Part 8 of the setup guide).';
    else {
      let dir = root;
      for (const part of info.topicRel.split('/')) {
        const it = dir.getFoldersByName(part);
        if (!it.hasNext()) { dir = null; break; }
        dir = it.next();
      }
      if (!dir) message = 'Added, but the topic folder "' + info.topicRel + '" was not found on Drive, so no folder was made.';
      else {
        const name = String(info.folderName).replace(/[\\/:*?"<>|]+/g, ' ').trim();
        const ex = dir.getFoldersByName(name);
        const f = ex.hasNext() ? ex.next() : dir.createFolder(name);
        if (!ex.hasNext()) tab_('Log', ['when', 'what', 'where']).appendRow([new Date(), 'created lesson folder', info.topicRel + '/' + name]);
        rec.rel = info.topicRel + '/' + name; url = f.getUrl();
        message = 'Added, with an empty folder on Drive: ' + name;
      }
    }
  }
  tab_('Added', ['lesson', 'saved']).appendRow([JSON.stringify(rec), new Date()]);
  pushState_();
  return { rec, message, url };
}

function importData(k, text) {
  check_(k);
  return importData_(text);
}
function importData_(text) {
  const obj = JSON.parse(text);
  if (!obj || !obj.classes || !obj.timetable) throw new Error('That is not a planner-data.json file.');
  const d = sheet_('Data');
  if (d.getLastRow() > 1) d.getRange(2, 1, d.getLastRow() - 1, 1).clearContent();
  const parts = [];
  for (let i = 0; i < text.length; i += 45000) parts.push([text.slice(i, i + 45000)]);
  d.getRange(2, 1, parts.length, 1).setNumberFormat('@').setValues(parts);
  return { classes: Object.keys(obj.classes).length, generated: obj.generated };
}

function saveWeek(k, week) {
  check_(k);
  const w = sheet_('Weeks');
  const json = JSON.stringify(week);
  const n = w.getLastRow();
  const mons = n > 1 ? w.getRange(2, 1, n - 1, 1).getDisplayValues().map((r) => r[0]) : [];
  const at = mons.indexOf(week.monday);
  const row = [week.monday, json, new Date()];
  if (at >= 0) w.getRange(at + 2, 1, 1, 3).setValues([row]);
  else { w.appendRow(row); w.getRange(w.getLastRow(), 1).setNumberFormat('@').setValue(week.monday); }
  const sent = pushState_();
  return { saved: week.monday, home: sent };
}

// Per-class settings he types once (Patryk 2026-10-08): test papers core / challenge / paper size,
// and notes about the class that go with every request to Claude ("8XP: word bank on cloze").
function saveClassSetting(k, cls, obj) {
  check_(k);
  const sh = tab_('ClassSettings', ['class', 'settings', 'saved']);
  const n = sh.getLastRow();
  const keys = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map((r) => r[0]) : [];
  const at = keys.indexOf(cls), row = [cls, JSON.stringify(obj || {}), new Date()];
  if (at >= 0) sh.getRange(at + 2, 1, 1, 3).setValues([row]); else sh.appendRow(row);
  pushState_();
  return true;
}

function learnEquipment(k, key, eq, sets) {
  check_(k);
  const q = sheet_('Equipment');
  const n = q.getLastRow();
  const keys = n > 1 ? q.getRange(2, 1, n - 1, 1).getValues().map((r) => r[0]) : [];
  const at = keys.indexOf(key);
  const row = [key, eq, sets || '', new Date()];
  if (at >= 0) q.getRange(at + 2, 1, 1, 4).setValues([row]); else q.appendRow(row);
  pushState_();
  return true;
}

/* ---------------------------------------------------------- Google Calendar
   The planner writes ONLY into its own calendar, "Lessons (Planner)", which it creates the first
   time. Syncing a week first clears that calendar's events for Mon-Sun of that week, then writes
   the saved week again, so re-syncing never makes duplicates. It never edits or deletes anything
   in his main calendar; that one is only READ, to show meetings next to the lessons. */
const CAL_NAME = 'Lessons (Planner)';
const TZ = 'Europe/London';

function lessonsCalendar_() {
  const found = CalendarApp.getOwnedCalendarsByName(CAL_NAME);
  if (found.length) return found[0];
  return CalendarApp.createCalendar(CAL_NAME, { timeZone: TZ, color: CalendarApp.Color.BLUE });
}
const at_ = (s) => Utilities.parseDate(s, TZ, s.length > 10 ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');

function syncWeek(k, monday, events) {
  check_(k);
  const cal = lessonsCalendar_();
  const start = at_(monday), end = new Date(start.getTime() + 7 * 864e5);
  cal.getEvents(start, end).forEach((e) => e.deleteEvent());
  const classes = [...new Set(events.map((e) => e.cls).filter(Boolean))].sort();
  let n = 0;
  events.forEach((e) => {
    const ev = e.allDay
      ? cal.createAllDayEvent(e.title, at_(e.date), { description: e.description || '' })
      : cal.createEvent(e.title, at_(e.start), at_(e.end), { description: e.description || '', location: 'S8' });
    if (e.cls) ev.setColor(String((classes.indexOf(e.cls) % 11) + 1));
    n++;
  });
  return { written: n, calendar: CAL_NAME };
}

// His own calendar's events for Mon-Fri of that week, read only.
function myEvents(k, monday) {
  check_(k);
  const start = at_(monday), end = new Date(start.getTime() + 5 * 864e5);
  return CalendarApp.getDefaultCalendar().getEvents(start, end).map((e) => {
    const s = e.getStartTime();
    return {
      title: e.getTitle(), allDay: e.isAllDayEvent(),
      day: Math.floor((s.getTime() - start.getTime()) / 864e5),
      time: e.isAllDayEvent() ? '' : Utilities.formatDate(s, TZ, 'HH:mm') + '-' + Utilities.formatDate(e.getEndTime(), TZ, 'HH:mm'),
    };
  }).filter((e) => e.day >= 0 && e.day < 5);
}

/* ---------------------------------------------------------- technicians' order sheet
   Patryk 2026-10-08: no template to set up any more. The planner draws the sheet itself in a
   temporary Google Sheet, downloads it as .xlsx, then bins the temporary copy (its own file only).
   Same boxes the technicians know (per day and period: room, class, lesson, kit, class size,
   number of sets), with more room for the kit and set to print on ONE landscape A4 page. */
// Patryk's own design (order_sheet.py, style 5, 2026-10-08): Georgia; a card per period with cutting
// gaps between them; each class has a light tint (class box + kit box) and a key at the bottom.
const OS = { font: 'Georgia', grey: '#808080' };
const CLASS_COL = {
  '7MLA': ['#FCE4D6', '#F4B183'], '8XP': ['#E2EFDA', '#A9D18E'], '8AG': ['#DDEBF7', '#9DC3E6'],
  '9AS': ['#FFF2CC', '#FFD966'], '9XS': ['#EDE1F5', '#C9A8E0'], '10S2': ['#D5F0EC', '#8FD3CB'],
  '10C2': ['#FBE0EC', '#F09CC0'], '11S2': ['#F6E6D2', '#DDB27C'], '12C': ['#DCE6F0', '#8EA9C9'], '13D': ['#E6F2D2', '#B5D98A'],
};
const tint_ = (cls) => (CLASS_COL[cls] || ['#F2F2F2', '#BFBFBF'])[0];

function exportXlsx(k, model, title) {
  check_(k);
  const ss = SpreadsheetApp.create(title);
  const file = DriveApp.getFileById(ss.getId());
  try {
    const sh = ss.getSheets()[0];
    sh.setName('Order sheet');
    drawOrderSheet_(sh, model);
    SpreadsheetApp.flush();
    const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
    const blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
    return { name: title + '.xlsx', b64: Utilities.base64Encode(onePage_(blob, title).getBytes()) };
  } finally {
    file.setTrashed(true);   // the temporary sheet this function just made, nothing else
  }
}

// Excel widths (characters) and heights (points) from his file, converted to pixels for Sheets.
const xw_ = (chars) => Math.round(chars * 7 + 5), pt_ = (p) => Math.round(p * 4 / 3);
function lines_(text, chars) {
  if (!text) return 1;
  return String(text).split('\n').reduce((n, t) => n + Math.max(1, Math.ceil(t.length / chars)), 0);
}
function drawOrderSheet_(sh, m) {
  const CARD = [10.5, 5, 11.5, 8], starts = [];
  let col = 2;
  for (let p = 0; p < 5; p++) { starts.push(col); col += 4 + (p < 4 ? 1 : 0); }
  const lastCol = col - 1, nRows = 2 + 5 * 6 + 2;
  if (sh.getMaxColumns() > lastCol) sh.deleteColumns(lastCol + 1, sh.getMaxColumns() - lastCol);
  if (sh.getMaxRows() > nRows) sh.deleteRows(nRows + 1, sh.getMaxRows() - nRows);
  sh.getRange(1, 1, nRows, lastCol).setFontFamily(OS.font).setFontSize(9.5).setVerticalAlignment('middle')
    .setHorizontalAlignment('center').setWrap(true);
  sh.setHiddenGridlines(true);
  sh.setColumnWidth(1, xw_(5));
  starts.forEach((s, p) => { CARD.forEach((w, k) => sh.setColumnWidth(s + k, xw_(w))); if (p < 4) sh.setColumnWidth(s + 4, xw_(1.2)); });

  // title + period row
  sh.setRowHeight(1, pt_(24));
  sh.getRange(1, 1, 1, starts[2] - 1).merge().setValue('Teacher:  Patryk Tomczynski').setFontSize(13).setFontWeight('bold').setHorizontalAlignment('left');
  sh.getRange(1, starts[3], 1, lastCol - starts[3] + 1).merge().setValue('Week ' + m.letter + '   w/c ' + m.monday).setFontSize(13).setFontWeight('bold').setHorizontalAlignment('right');
  sh.setRowHeight(2, pt_(20));
  sh.getRange(2, 1).setValue('Day').setFontSize(10).setFontWeight('bold');
  starts.forEach((s, p) => sh.getRange(2, s, 1, 4).merge().setValue('Period ' + (p + 1)).setFontSize(12).setFontWeight('bold')
    .setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM));

  const MED = SpreadsheetApp.BorderStyle.SOLID_MEDIUM;
  let row = 3;
  m.days.forEach((d) => {
    const rh = row, rrc = row + 1, rt = row + 2, re = row + 3, rs = row + 4;
    let tl = 1, el = 1;
    d.slots.forEach((L) => { if (L) { tl = Math.max(tl, lines_(L.lesson, 30)); el = Math.max(el, lines_(equipText_(L), 26)); } });
    sh.setRowHeight(rh, pt_(18)); sh.setRowHeight(rrc, pt_(19));
    sh.setRowHeight(rt, pt_(Math.max(20, tl * 15 + 6))); sh.setRowHeight(re, pt_(Math.max(62, el * 15 + 24)));
    sh.setRowHeight(rs, pt_(19)); sh.setRowHeight(row + 5, pt_(7));
    sh.getRange(rh, 1, 5, 1).merge().setValue(d.name).setFontSize(12).setFontWeight('bold').setTextRotation(90)
      .setBorder(true, true, true, true, null, null, '#000000', MED);
    d.slots.forEach((L, p) => {
      const s = starts[p], free = !L, x = L || {};
      const tint = free ? null : tint_(x.cls);
      const lab = (r, c, v) => sh.getRange(r, c).setValue(v).setFontColor(free ? OS.grey : '#000000');
      const val = (r, c, v) => sh.getRange(r, c).setValue(v === '' || v == null ? '' : v).setFontSize(11).setFontWeight('bold');
      sh.getRange(rh, s, 1, 4).merge().setValue(d.name + ' P' + (p + 1)).setFontSize(11).setFontWeight('bold').setFontColor(free ? OS.grey : '#000000');
      lab(rrc, s, 'Room:'); val(rrc, s + 1, x.room || ''); lab(rrc, s + 2, 'Class:'); val(rrc, s + 3, x.cls || '');
      if (tint) sh.getRange(rrc, s + 3).setBackground(tint);
      sh.getRange(rt, s, 1, 4).merge().setValue(x.lesson || '').setFontSize(11);
      const eqText = free ? '' : equipText_(x);
      const eq = sh.getRange(re, s, 1, 4).merge().setValue(eqText).setFontSize(11).setFontWeight('bold')
        .setFontStyle(eqText === 'Nothing needed' ? 'italic' : 'normal');
      if (tint) eq.setBackground(tint);
      lab(rs, s, 'Class size:'); val(rs, s + 1, x.size || ''); lab(rs, s + 2, 'No. of sets:'); val(rs, s + 3, x.sets === '' ? '' : (x.sets || ''));
      sh.getRange(rh, s, 5, 4).setBorder(true, true, true, true, false, false, '#000000', MED);   // outline only
    });
    row += 6;
  });
  // colour key
  sh.setRowHeight(row, pt_(6)); row++;
  sh.setRowHeight(row, pt_(16));
  sh.getRange(row, 1).setValue('Key').setFontSize(9).setFontWeight('bold');
  const used = [...new Set(m.days.flatMap((d) => d.slots.filter(Boolean).map((L) => L.cls)))].sort((a, b) => a.length - b.length || a.localeCompare(b));
  const keyCols = starts.flatMap((s) => [s, s + 2]);
  used.slice(0, keyCols.length).forEach((cls, k) => sh.getRange(row, keyCols[k]).setValue(cls).setFontSize(9).setFontWeight('bold').setBackground(tint_(cls)));
}
// What goes in the big box: the kit, then what to print and the books (one line each).
function equipText_(L) {
  return [L.kit, L.extra].filter(Boolean).join('\n') || 'Nothing needed';
}

// Sheets can't set print options, so set them in the .xlsx itself: landscape A4, fitted to one page,
// narrow margins. If anything about the file is unexpected it is returned unchanged.
function onePage_(blob, title) {
  try {
    const parts = Utilities.unzip(blob.setContentType('application/zip'));
    const ws = parts.find((b) => /^xl\/worksheets\/sheet1\.xml$/.test(b.getName()));
    if (!ws) return blob;
    let x = ws.getDataAsString();
    const fit = '<pageSetUpPr fitToPage="1"/>';
    if (/<sheetPr\b[^>]*\/>/.test(x)) x = x.replace(/<sheetPr\b([^>]*)\/>/, '<sheetPr$1>' + fit + '</sheetPr>');
    else if (/<sheetPr\b/.test(x)) x = x.replace('</sheetPr>', fit + '</sheetPr>');
    else x = x.replace(/(<worksheet\b[^>]*>)/, '$1<sheetPr>' + fit + '</sheetPr>');
    x = x.replace(/<printOptions\b[^>]*\/>/, '').replace(/<pageMargins\b[^>]*\/>/, '').replace(/<pageSetup\b[^>]*\/>/, '');
    const page = '<printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.3" bottom="0.3" header="0.1" footer="0.1"/>' +
      '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/>';
    const after = x.search(/<(headerFooter|rowBreaks|colBreaks|drawing|legacyDrawing|tableParts|extLst)\b|<\/worksheet>/);
    x = x.slice(0, after) + page + x.slice(after);
    const out = parts.map((b) => (b === ws ? Utilities.newBlob(x, 'application/xml', b.getName()) : b));
    return Utilities.zip(out, title + '.xlsx');
  } catch (e) { return blob; }
}
