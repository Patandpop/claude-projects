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
    mailPost_({ op: 'write', name: 'planner-state.json', text: JSON.stringify({ saved: new Date().toISOString(), weeks: a.weeks, learned: a.learned, added: a.added }) });
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
  return { version: VERSION, data: withData && chunks ? JSON.parse(chunks) : null, weeks, learned, added, hasTemplate: !!PropertiesService.getScriptProperties().getProperty('TEMPLATE_ID') };
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

// Fill a copy of his real order-sheet tab and hand back an .xlsx (same layout the technicians know).
function exportXlsx(k, cells, title) {
  check_(k);
  const id = PropertiesService.getScriptProperties().getProperty('TEMPLATE_ID');
  if (!id) throw new Error('No order-sheet template set yet (see README: TEMPLATE_ID).');
  const copy = DriveApp.getFileById(id).makeCopy(title);
  try {
    const ss = SpreadsheetApp.openById(copy.getId());
    const sh = ss.getSheets()[0];
    sh.setName(title.slice(0, 99));
    cells.forEach((c) => sh.getRange(c.addr).setValue(c.value));
    SpreadsheetApp.flush();
    const url = 'https://docs.google.com/spreadsheets/d/' + copy.getId() + '/export?format=xlsx';
    const blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob();
    return { name: title + '.xlsx', b64: Utilities.base64Encode(blob.getBytes()) };
  } finally {
    copy.setTrashed(true);
  }
}
