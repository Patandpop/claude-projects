/* Planner web app — server (Google Apps Script). Patryk 2026-10-03.
   Same pattern as the behaviour tracker: a web app bound to a Google Sheet, opened with ?key=.
   Deploy: Execute as "Me", access "Anyone within organisation" (the school blocks public apps).

   Sheet tabs (made by setup()):
     Data       planner-data.json from home (node science-lesson/references/planner-catalogue.js --export),
                stored in 45,000-character chunks down column A
     Weeks      A: Monday (YYYY-MM-DD)  B: the saved week as JSON  C: saved at
     Equipment  A: lesson key  B: equipment  C: sets  D: saved at    (edits the planner remembers)
     Lessons    A: class|lesson key  B: the lesson's record as JSON (taught / skipped / not taught /
                where he stopped). One row per lesson, shared by every week (2026-10-12). Made when first needed.
   Script properties:
     PLANNER_KEY   the secret in the link (?key=...)
     TEMPLATE_ID   a Google Sheet holding ONE of his order-sheet tabs, used for the Excel download
     MAILBOX_URL   the "Planner mailbox" web app on his PERSONAL account (Mailbox.gs), and
     MAILBOX_KEY   its key. With these set, new data from home arrives by itself (no Import data),
                   saved weeks go home, and "Send to Claude" requests reach Claude Code at home.
     TEMPLATE_FORM_ID  (2026-10-18) the blank quiz Form "Homework template (do not delete)" every
                   homework quiz is copied from (it carries the quiz settings Apps Script cannot set)
     HW_CHECKED    (made by the planner) which homework quizzes he marked "Looks right"
   Sheet tab Homework (made when first needed): one row per class per homework set (setHomework).
   Services: Google Classroom API (Services +), for the drafts.
*/

const VERSION = 5;

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
  // the behaviour app lives in this project too (2026-10-12): phone page, board and the board's data calls
  const p = e.parameter;
  if (p.view === 'phone' || p.view === 'board' || p.api) return behaviourGet_(e);
  const t = HtmlService.createTemplateFromFile('Planner');
  t.key = key;
  t.appUrl = ScriptApp.getService().getUrl();
  return t.evaluate().setTitle('Planner').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/* ------------------------------------------------------------- behaviour
   The behaviour app (Behaviour.gs, Phone.html, BoardPage.html) is part of this project since
   2026-10-12, and its tabs live in this spreadsheet (Students, Behaviour Log, Sessions, Emails,
   Behaviour Settings). */

// The planner's timetable for the behaviour app ("today's classes"), cached for 6 hours.
function plannerTimetable_() {
  const c = CacheService.getScriptCache(), hit = c.get('ptt');
  if (hit) return JSON.parse(hit);
  const d = sheet_('Data');
  if (!d || d.getLastRow() < 2) return null;
  const data = JSON.parse(d.getRange(2, 1, d.getLastRow() - 1, 1).getValues().map((r) => r[0]).join(''));
  const tt = data.timetable || null;
  if (tt) c.put('ptt', JSON.stringify(tt), 21600);
  return tt;
}

// Run ONCE from the editor (and again just before switching phones over, to catch up): copies the
// old behaviour sheet's tabs into this spreadsheet. Script property OLD_BEHAVIOUR_SHEET_ID = the old
// sheet's ID (the long code in its address bar). The old sheet is only READ, never changed.
// Students and Settings are replaced; Log, Sessions and Emails only get rows newer than the newest here.
function mergeBehaviourData() {
  const id = PropertiesService.getScriptProperties().getProperty('OLD_BEHAVIOUR_SHEET_ID');
  if (!id) throw new Error('Set the script property OLD_BEHAVIOUR_SHEET_ID to the old behaviour sheet ID first');
  const src = SpreadsheetApp.openById(id), ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = [];
  [['Students', 'Students', 'replace'], ['Settings', 'Behaviour Settings', 'replace'],
   ['Log', 'Behaviour Log', 'add'], ['Sessions', 'Sessions', 'add'], ['Emails', 'Emails', 'add']].forEach(([from, to, how]) => {
    const a = src.getSheetByName(from);
    if (!a || a.getLastRow() < 1) { out.push(from + ': not in the old sheet'); return; }
    const rows = a.getRange(1, 1, a.getLastRow(), a.getLastColumn()).getValues();
    let b = ss.getSheetByName(to);
    if (!b) { b = ss.insertSheet(to); b.setFrozenRows(1); }
    if (how === 'replace' || b.getLastRow() < 2) {
      b.clearContents();
      b.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      out.push(to + ': ' + (rows.length - 1) + ' rows copied');
      return;
    }
    const have = b.getRange(2, 1, b.getLastRow() - 1, 1).getValues().map((r) => r[0]).filter((v) => v instanceof Date);
    const newest = have.reduce((m, v) => Math.max(m, v.getTime()), 0);
    const add = rows.slice(1).filter((r) => r[0] instanceof Date && r[0].getTime() > newest);
    if (add.length) b.getRange(b.getLastRow() + 1, 1, add.length, add[0].length).setValues(add);
    out.push(to + ': ' + add.length + ' newer rows added');
  });
  tab_('Log', ['when', 'what', 'where']).appendRow([new Date(), 'merged behaviour data', out.join('; ')]);
  CacheService.getScriptCache().remove('board');
  Logger.log(out.join('\n'));
  return out;
}

// Behaviour logged in one week (the planner matches each entry to its lesson by class and time).
function behaviourWeek(k, monday) {
  check_(k);
  if (!sheet_('Behaviour Log')) return [];
  const from = Utilities.parseDate(monday, TZ, 'yyyy-MM-dd').getTime(), to = from + 7 * 864e5;
  return readLog_().filter((r) => r.ts.getTime() >= from && r.ts.getTime() < to)
    .map((r) => ({ t: Utilities.formatDate(r.ts, TZ, "yyyy-MM-dd'T'HH:mm"), cls: r.cls, type: r.type }));
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
  return mailFetch_(params.op + (params.name ? ' ' + params.name : ''), () => UrlFetchApp.fetch(p.getProperty('MAILBOX_URL') + '?key=' + encodeURIComponent(p.getProperty('MAILBOX_KEY')) + '&' + q, { muteHttpExceptions: true }));
}
function mailPost_(body) {
  const p = PropertiesService.getScriptProperties();
  body.key = p.getProperty('MAILBOX_KEY');
  return mailFetch_(body.op + (body.name ? ' ' + body.name : ''), () => UrlFetchApp.fetch(p.getProperty('MAILBOX_URL'), { method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true }));
}
// Patryk 2026-10-16 ("Unexpected token '<'"): when Google is busy, the mailbox answers with an error
// WEB PAGE (starts with "<") instead of data. Wait and try again (3 goes); if it still fails, say so in
// plain words with the page's own message, instead of a code error about "<".
function mailFetch_(what, fetch) {
  let last = '';
  for (let k = 0; k < 3; k++) {
    if (k) Utilities.sleep(2000 * k);
    const r = fetch();
    const t = r.getContentText();
    if (/^\s*\{/.test(t)) {
      const o = JSON.parse(t);
      if (!o.ok) throw new Error(o.error || 'mailbox error');
      return o;
    }
    last = 'code ' + r.getResponseCode() + ': ' + t.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
  }
  throw new Error('the home mailbox sent back a Google error page instead of data (' + what + '), 3 tries. Try again in a minute. Google said: ' + last);
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
    mailPost_({ op: 'write', name: 'planner-state.json', text: JSON.stringify({ saved: new Date().toISOString(), weeks: a.weeks, records: a.records, learned: a.learned, added: a.added, classSettings: a.classSettings }) });
    return true;
  } catch (e) { return String(e.message || e); }
}
// "Send to Claude": a message or a list of lessons to build, for Claude Code at home.
/* ------------------------------------------------------------ homework quizzes
   Patryk 2026-10-08: homework from real exam questions that marks itself. At home Claude chooses the
   questions (test-paper.js exam practice, homework-forms.js weekly quiz) and drops
   "homework-<class>-<due>[-core|-challenge].json" in the sync folder. Here:
     - the Homework tab lists them to check (homeworkList), then "Make the drafts" calls setHomework
       once per class: the Google Forms QUIZ (folder "Planner homework quizzes"), then a Google
       Classroom DRAFT (or a scheduled post) due at the class's next-but-one lesson, 8:00 UK time,
       then a row in the Homework sheet tab;
     - ⋯ More → Homework quizzes (makeHomework) makes the Forms only, no Classroom drafts (2026-10-18:
       the drafts come from the Homework tab so the due date and message follow the rules).
   Quiz files: schema 2 (2026-10-18, design-audit/homework-replica/04-architecture.md section 3) has
   labels and mark points; older files (no "schema") still work, with "mark k of n" self-marking.
   It only CREATES: the quiz, the folder (once), the draft and the sheet row. Each quiz made is listed in
   homework-made.json (the receipt) so it is never made twice.
   Script property TEMPLATE_FORM_ID: a blank quiz Form he made once by hand with the settings Apps
   Script cannot set (release grades immediately; respondents see missed questions, correct answers and
   point values). Each new quiz is a copy of it. Without it the Form is made from scratch and the result
   says so. */
function makeHomework(k, only) {
  check_(k);
  if (!mailboxOn_()) throw new Error('Step 1 of 4 failed: this planner has no mailbox address or key saved (setup guide Part 8).');
  const step = (n, what, fn) => { try { return fn(); } catch (e) { throw new Error('Step ' + n + ' of 4 failed (' + what + '): ' + String(e.message || e)); } };
  const names = step(1, 'asking the mailbox which quizzes are waiting; "Unknown request" means the mailbox is an old version: paste Mailbox.gs again and deploy a New version', () => mailGet_({ op: 'list' }).names || []);
  const madeFile = step(2, 'reading the list of quizzes already made', () => mailGet_({ op: 'read', name: 'homework-made.json' }));
  const made = madeFile.found ? JSON.parse(madeFile.text || '{}') : {};
  const out = [];
  for (const name of names) {
    if (made[name] || !HW_FILE.test(name) || (only && name !== only)) continue;
    const hw = step(2, 'reading ' + name, () => JSON.parse(mailGet_({ op: 'read', name }).text));
    const notes = [], info = {};
    const form = step(3, 'making the Google Form', () => buildQuiz_(hw, notes, info));
    made[name] = { at: new Date().toISOString(), form: form.getEditUrl(), link: form.getPublishedUrl(), template: !!info.template, points: info.points, draft: false, note: notes.join('. ') };
    tab_('Log', ['when', 'what', 'where']).appendRow([new Date(), 'made homework quiz' + (notes.length ? ' (' + notes.join('; ') + ')' : ''), hw.title]);
    out.push({ title: hw.title, form: form.getEditUrl(), draft: false, note: notes.join('. ') });
  }
  if (out.length) step(4, 'saving the receipt', () => mailPost_({ op: 'write', name: 'homework-made.json', text: JSON.stringify(made, null, 1) }));
  // seen = how many quiz files the mailbox found; already = how many of those were made before
  return { made: out, seen: names.length, already: names.filter((n) => made[n]).length, names: names };
}
const HW_FILE = /^homework-[A-Za-z0-9]+-\d{4}-\d{2}-\d{2}(-[a-z]+)?\.json$/;
// The Homework tab (Patryk 2026-10-09: check the homework before it becomes a Form).
function homeworkList(k) {
  check_(k);
  if (!mailboxOn_()) throw new Error('The home link (mailbox) is not set up yet (setup guide Part 8).');
  let names;
  try { names = mailGet_({ op: 'list' }).names || []; }
  catch (e) { throw new Error('The mailbox could not list the homework: ' + e.message + (/Unknown request/.test(e.message) ? '. Paste Mailbox.gs again and deploy a New version.' : '')); }
  const madeFile = mailGet_({ op: 'read', name: 'homework-made.json' });
  const made = madeFile.found ? JSON.parse(madeFile.text || '{}') : {};
  const checked = checkedList_();
  return names.filter((n) => HW_FILE.test(n)).slice(-12).reverse().map((name) => {
    let hw = null;
    try { hw = JSON.parse(mailGet_({ op: 'read', name }).text); } catch (e) { /* listed but unreadable */ }
    // the tab only shows the words: leave the pictures behind (12C/13D are over 1 MB of pictures,
    // which made the tab hang, Patryk 2026-10-16). The Form still gets them.
    if (hw && hw.questions) {
      const v2 = Number(hw.schema) >= 2;
      hw.questions.forEach((q, n) => {
        q.pictures = (q.images || []).length; delete q.images;
        // page 2 exactly as the Form will word it (pointWords_), so a badly split scheme is spotted here
        if (q.type === 'mcq' || needsDrawing_(q)) return;
        const N = v2 && q.label ? String(q.label).replace(/^Question\s+/, '') : String(n + 1);
        let at = 0;
        q.marking = v2 && q.markPoints && q.markPoints.length
          ? q.markPoints.map((p) => { const w = pointWords_(N, p, at + 1); at += p.marks || 0; return { title: w.title, help: w.help, points: p.marks || 1 }; })
          : Array.from({ length: q.marks || 1 }, (x, j) => ({ title: 'Question ' + N + ', mark ' + (j + 1) + ' of ' + q.marks + ': did your answer earn this mark?', help: '', points: 1 }));
      });
      hw.points = totalPoints_(hw);
    }
    return { name, made: made[name] || null, checked: checked[name] || null, hw };
  });
}
// "Looks right" on the Homework tab: the quiz is marked as checked (kept in a script property).
function checkedList_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('HW_CHECKED') || '{}'); } catch (e) { return {}; } }
function checkHomework(k, name) {
  check_(k);
  if (!HW_FILE.test(String(name))) throw new Error('That is not a homework quiz file name.');
  const c = checkedList_();
  c[name] = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const keys = Object.keys(c);
  keys.slice(0, Math.max(0, keys.length - 200)).forEach((x) => { delete c[x]; });   // the property stays small
  PropertiesService.getScriptProperties().setProperty('HW_CHECKED', JSON.stringify(c));
  return c[name];
}

/* Set homework (Homework tab "Make the drafts", 2026-10-18): ONE class per call, so a slow Form never
   stops the others and no call gets near Apps Script's 6-minute limit (the page calls it in turn).
   item = { cls, kind, file, setOn, dueOn (YYYY-MM-DD), post: 'draft'|'schedule', postAt ('YYYY-MM-DDTHH:mm' UK),
            message, title? }
   Never twice: a lock against a double click, the homework-made.json receipt, and the Homework tab row.
   A quiz whose Form was already made from the menu gets only its Classroom draft. */
const HW_HEAD = ['id', 'cls', 'kind', 'title', 'file', 'tier', 'formId', 'formUrl', 'courseId', 'courseWorkId', 'setOn', 'postAt', 'dueOn', 'dueUtc', 'points', 'status', 'made'];
function setHomework(k, item) {
  check_(k);
  const it = item || {};
  if (!it.cls || !/^\d{4}-\d{2}-\d{2}$/.test(String(it.dueOn || ''))) throw new Error('Each homework needs a class and a due date.');
  if (!it.file || !HW_FILE.test(String(it.file))) throw new Error('Only quiz homework from home can be set here for now (pick a quiz for ' + it.cls + ').');
  const fileCls = (/^homework-([A-Za-z0-9]+)-/.exec(it.file) || [])[1];
  if (fileCls !== String(it.cls)) throw new Error(it.file + ' is for ' + fileCls + ', not ' + it.cls + '.');
  if (it.setOn && it.dueOn <= it.setOn) throw new Error(it.cls + ': the due date must be after the day it is set.');
  if (it.post === 'schedule' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(it.postAt || ''))) throw new Error(it.cls + ': "Schedule it" needs a date and time to post.');
  if (!mailboxOn_()) throw new Error('The home link (mailbox) is not set up yet (setup guide Part 8).');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('The planner is busy making another homework. Try again in a minute.');
  try {
    const madeFile = mailGet_({ op: 'read', name: 'homework-made.json' });
    const made = madeFile.found ? JSON.parse(madeFile.text || '{}') : {};
    const was = made[it.file];
    const sh = tab_('Homework', HW_HEAD);
    const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, HW_HEAD.length).getValues() : [];
    const row = rows.find((r) => r[1] === it.cls && r[4] === it.file);
    // made before (a draft from this tab, a row in the Homework tab, or a draft made by the old menu path)
    if ((was && (was.courseWorkId || was.draft === true)) || row) {
      const on = String((was && was.at) || (row && row[16]) || '').slice(0, 10);
      return { ok: true, already: true, formUrl: (was && was.link) || (row && row[7]) || '', editUrl: (was && was.form) || '', classroomUrl: (was && was.classroom) || '', draft: !!((was && was.courseWorkId) || (row && row[9])),
        why: 'Already made' + (on ? ' on ' + dayName_(on) : '') + '.' };
    }
    const hw = JSON.parse(mailGet_({ op: 'read', name: it.file }).text);
    if (String(hw.cls) !== String(it.cls)) throw new Error(it.file + ' is for ' + hw.cls + ', not ' + it.cls + '.');
    const notes = [], info = {};
    let form = null;
    if (was && was.form) { try { form = FormApp.openByUrl(was.form); info.points = was.points || totalPoints_(hw); info.template = was.template; } catch (e) { form = null; } }
    if (!form) {
      form = buildQuiz_(hw, notes, info);
      made[it.file] = { at: new Date().toISOString(), form: form.getEditUrl(), link: form.getPublishedUrl(), template: !!info.template, points: info.points, draft: false, note: notes.join('. ') };
      mailPost_({ op: 'write', name: 'homework-made.json', text: JSON.stringify(made, null, 1) });   // saved at once: a failed draft never makes a second Form
    }
    const draft = classroomDraft_(hw, form, { due: it.dueOn, message: it.message, postAt: it.post === 'schedule' ? it.postAt : null, points: info.points });
    made[it.file] = Object.assign(made[it.file] || {}, { draft: draft.ok, courseId: draft.courseId || '', courseWorkId: draft.courseWorkId || '', classroom: draft.link || '', dueOn: it.dueOn, note: [draft.ok ? '' : draft.why].concat(notes).filter(Boolean).join('. ') });
    mailPost_({ op: 'write', name: 'homework-made.json', text: JSON.stringify(made, null, 1) });
    const setOn = it.setOn || Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    const n = rows.filter((r) => r[1] === it.cls && String(r[10]) === setOn).length + 1;
    const status = draft.ok ? (draft.scheduled ? 'scheduled' : 'drafted') : 'form only';
    sh.appendRow([it.cls + '-' + setOn + '-' + n, it.cls, it.kind || hw.kind || 'quiz', hw.title, it.file, hw.tier || '', form.getId(), form.getPublishedUrl(),
      draft.courseId || '', draft.courseWorkId || '', setOn, it.post === 'schedule' ? it.postAt : '', it.dueOn, draft.dueUtc || '', info.points || totalPoints_(hw), status, new Date()]);
    tab_('Log', ['when', 'what', 'where']).appendRow([new Date(), 'set homework: ' + status + (notes.length ? ' (' + notes.join('; ') + ')' : ''), it.cls + ' ' + hw.title]);
    const why = draft.ok ? '' : (/no Classroom class/.test(draft.why) ? 'No Classroom class with ' + it.cls + ' in its name. The Form was made: link it by hand. (' + draft.why + ')' : 'The Form was made, but not the Classroom draft: ' + draft.why);
    return { ok: true, formUrl: form.getPublishedUrl(), editUrl: form.getEditUrl(), draft: draft.ok, scheduled: !!draft.scheduled, courseId: draft.courseId || '', courseWorkId: draft.courseWorkId || '', classroomUrl: draft.link || '',
      points: info.points, template: !!info.template, why, notes };
  } finally { lock.releaseLock(); }
}
function dayName_(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d).getDay()] + ' ' + d + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
}

// The Behaviour tab shows the behaviour app's phone page; its link is saved once from the tab.
function setBehaviourUrl(k, url) {
  check_(k);
  const u = String(url || '').trim();
  if (u && !/^https:\/\/script\.google\.com\/.+\/exec\?key=\S+$/.test(u)) throw new Error('That is not a behaviour app link (it should start https://script.google.com/ and end ?key=...)');
  PropertiesService.getScriptProperties().setProperty('BEHAVIOUR_URL', u);
  return u;
}
/* Patryk 2026-10-16: pupils mark their own written answers, and those marks count in the Form's score.
   Page 1: the questions (pictures just above each). Multiple choice marks itself.
   Page 2 "Mark your own answers": each written question's mark scheme, then one "Yes / No" per mark
   point (schema 2: in the scheme's own words, "Question 6, mark 1: did you say ...?"; older files:
   "Question 7, mark 1 of 2"), each Yes worth that point's marks, so the Form's total = multiple choice +
   their own marks. A No shows "You missed: ..." on the View score page. Questions that need drawing
   ("draw arrows on the diagram") are left out: a Form cannot take a drawing. */
const DRAWING = /(?<!not )\bdraw\b|\bsketch\b(?! graph)|\b(plot|shade)\b|\blabel (the|each|it|all|on|one|two|a)\b|\bput a cross\b|\bmark (on|with) an? \b|\bcomplete the (diagram|graph|chart|circuit|ray diagram|bar chart)\b/i;
// "Draw a ring around the correct answer" can be typed, so it is reworded instead of left out
const RING = /\bdraw a (ring|circle) (around|round) (each|the|your)\b/gi;
function ringToWrite_(t) { return String(t || '').replace(RING, (m, a, b, c) => 'Write down ' + c.toLowerCase()); }
function needsDrawing_(q) { return (q.type === 'written' || q.type === 'number') && DRAWING.test(ringToWrite_(q.text)); }
// Pupil wording (design-audit/homework-replica/05-design.md 1.2 and 1.3). Plain British English, no em dashes.
const SELF_MARK = 'Your answers are saved. Do not change them now.\n\n' +
  'For each written question, read the mark scheme, then choose Yes or No for every mark. Choose Yes if your answer says this, or says the same thing in other words. If you are not sure, choose No.\n\n' +
  'You can press Back to read what you wrote, but do not change it.\n\n' +
  'Each Yes adds to your score. Be honest: it shows you and me what to work on next.';
const CONFIRM = 'Done, thank you. Click View score to see your total. Under each question you got wrong, and each mark you said No to, it shows what you missed. Read those before next lesson.';
const NO_TEMPLATE = 'Made without the template, so pupils may not see their score straight away. See the setup guide: TEMPLATE_FORM_ID.';
// The Form's total: multiple choice points plus the marks pupils give themselves (drawing questions left
// out). One sum for the Form and the Classroom points, so the two never disagree.
function totalPoints_(hw) {
  return (hw.questions || []).filter((q) => !needsDrawing_(q)).reduce((n, q) => n + (q.type === 'mcq' ? (q.points || 1)
    : (q.markPoints && q.markPoints.length ? q.markPoints.reduce((a, p) => a + (p.marks || 0), 0) : (q.marks || 1))), 0);
}
// The quiz Form: a copy of the template (TEMPLATE_FORM_ID) when there is one, else a new Form (and a note).
function newQuizForm_(title, folder, notes, info) {
  const id = PropertiesService.getScriptProperties().getProperty('TEMPLATE_FORM_ID');
  if (id) {
    try {
      const copy = DriveApp.getFileById(id).makeCopy(title, folder);
      const f = FormApp.openById(copy.getId());
      f.getItems().forEach((x) => f.deleteItem(x));   // the copy only (in case the template has questions)
      f.setTitle(title);
      info.template = true;
      return f;
    } catch (e) { notes.push('The template Form could not be copied (' + String(e.message || e) + '). ' + NO_TEMPLATE); }
  } else notes.push(NO_TEMPLATE);
  info.template = false;
  const f = FormApp.create(title);
  DriveApp.getFileById(f.getId()).moveTo(folder);   // keep his Drive tidy: only this new file is moved
  return f;
}
function quizFolder_() {
  const it = DriveApp.getFoldersByName('Planner homework quizzes');
  return it.hasNext() ? it.next() : DriveApp.createFolder('Planner homework quizzes');
}
function buildQuiz_(hw, notes, info) {
  info = info || {};
  const v2 = Number(hw.schema) >= 2;
  const f = newQuizForm_(hw.title, quizFolder_(), notes, info);
  const intro = v2 ? String(hw.intro || '') : String(hw.intro || '').replace(/For the longer answers[^\n]*/, 'For the longer answers, the next page shows the mark scheme and you mark yourself, one mark at a time.');
  f.setIsQuiz(true);
  f.setDescription(intro).setProgressBar(true).setConfirmationMessage(CONFIRM);
  // settings Apps Script can set (the template sets the rest); one refused never stops the Form
  // (email collection: the template's own "Verified" setting is kept; only a Form made from scratch is told to collect emails)
  [...(info.template ? [] : [['setCollectEmail', true]]), ['setLimitOneResponsePerUser', true], ['setAllowResponseEdits', false], ['setShowLinkToRespondAgain', false], ['setPublishingSummary', false]].forEach(([m, v]) => {
    try { if (typeof f[m] === 'function') f[m](v); } catch (e) { notes.push(m + ' was refused: ' + String(e.message || e)); }
  });
  const qs = hw.questions.filter((q) => !needsDrawing_(q));
  const left = hw.questions.length - qs.length;
  if (left) notes.push(left + ' question' + (left === 1 ? '' : 's') + ' left out because they need drawing on a diagram');
  const num = (q, n) => (v2 && q.label ? String(q.label).replace(/^Question\s+/, '') : String(n + 1));
  const marksTxt = (m) => m + ' mark' + (m === 1 ? '' : 's');
  const selfMarked = [];
  qs.forEach((q, n) => {
    const N = num(q, n);
    try {
      // pictures first, just above the question (Patryk 2026-10-16: pupils have no paper copy)
      // A picture that is an answer option is titled "Option A", "Option B"... (Patryk 2026-10-16: 13D
      // question 1 had four formula pictures with no letters). Home marks them (img.label); older files:
      // answers "A".."D" with at least that many pictures means the last ones are the options, in order.
      const imgs = q.images || [];
      const letters = q.type === 'mcq' && (q.options || []).length > 1 && q.options.every((o, i) => String(o).trim() === 'ABCDEF'[i]) && imgs.length >= q.options.length;
      imgs.forEach((img, j) => {
        const it = f.addImageItem().setImage(Utilities.newBlob(Utilities.base64Decode(img.data), img.mime || 'image/png', img.name || 'picture.png'));
        const label = img.label || (letters && !imgs.some((x) => x.label) && j >= imgs.length - q.options.length ? 'ABCDEF'[j - (imgs.length - q.options.length)] : '');
        if (label) it.setTitle('Question ' + N + ', option ' + label);
        else if (j === 0) it.setTitle('Question ' + N);
      });
      if (q.type === 'mcq') addChoice_(f, N + '. ' + q.text, q.options, q.answers && q.answers.length > 1 ? q.answers : q.answer, q.points || 1, q.feedback ? 'What examiners saw: ' + q.feedback : '');
      else if (q.type === 'number') {
        // a number box (it does not score: the marks come from the marking page) and an optional working box
        const unit = q.unit && !/give your answer in/i.test(q.text) ? ' Give your answer in ' + q.unit + '.' : '';
        tryPlain_(N + '. ' + q.text + unit, (t) => {
          const box = f.addTextItem().setTitle(t).setHelpText('Numbers only, for example 2.5 or 0.04').setRequired(true);
          box.setValidation(FormApp.createTextValidation().setHelpText('Type a number only. Put the unit and working in the next box.').requireNumber().build());
          return box;
        }, f);
        tryPlain_(N + '. Your working (not required)', (t) => f.addParagraphTextItem().setTitle(t).setRequired(false), f);
        selfMarked.push({ N, q });
      } else {
        const title = N + '. ' + ringToWrite_(q.text) + '  [' + marksTxt(q.marks) + ']';
        tryPlain_(title, (t) => f.addParagraphTextItem().setTitle(t).setRequired(true), f);
        selfMarked.push({ N, q });
      }
    } catch (e) { throw new Error('question ' + N + ' (' + q.type + '): ' + String(e.message || e)); }
  });
  if (selfMarked.length) {
    f.addPageBreakItem().setTitle('Mark your own answers').setHelpText(SELF_MARK);
    selfMarked.forEach(({ N, q }) => {
      try {
        const mps = v2 && q.markPoints && q.markPoints.length ? q.markPoints : null;
        const start = String(ringToWrite_(q.text)).replace(/\s+/g, ' ').trim();
        const head = v2 ? 'Question ' + N + ' (' + marksTxt(q.marks) + '): ' + (start.length > 100 ? start.slice(0, 100).replace(/\s+\S*$/, '') + '...' : start)
          : 'Question ' + N + ': mark scheme (' + marksTxt(q.marks) + ')';
        const extra = mps && mps.some((p) => p.kind === 'answer') ? '\n\nA correct final answer gets all the marks for this question, even with no working. If you got it, choose Yes for every mark below.'
          : mps && mps.some((p) => p.kind === 'level') ? '\n\nStart at Level 1. Stop at the first No: every level after it is No too.' : '';
        tryPlain_(String(q.scheme || 'No mark scheme was found for this question: ask your teacher.') + extra, (t) => f.addSectionHeaderItem().setTitle(head).setHelpText(t), f);
        if (mps) {
          let at = 0;
          mps.forEach((p) => { const w = pointWords_(N, p, at + 1); at += p.marks || 0; addChoice_(f, w.title, ['Yes', 'No'], 0, p.marks || 1, w.missed, w.help, w.well); });
        } else for (let j = 1; j <= (q.marks || 1); j++) addChoice_(f, 'Question ' + N + ', mark ' + j + ' of ' + q.marks + ': did your answer earn this mark?', ['Yes', 'No'], 0, 1, '');
      } catch (e) { throw new Error('marking page, question ' + N + ': ' + String(e.message || e)); }
    });
  }
  info.points = totalPoints_(hw);
  return f;
}
// One mark point's Yes/No item (05-design.md 1.2): title, help text and the "You missed" feedback.
function pointWords_(N, p, markNo) {
  const Q = 'Question ' + N + (p.part ? p.part : '');
  const says = String(p.says || '').trim().replace(/[.;:,]+$/, '');
  const long = says.length > 150;
  const notes = [];
  if (p.also && p.also.length) notes.push('Also accepted: ' + p.also.join('; '));
  if (p.no && p.no.length) notes.push('No mark for: ' + p.no.join('; '));
  let title, help = [];
  if (p.kind === 'level') {
    title = Q + ', Level ' + p.level + ' (' + p.from + (p.to !== p.from ? ' to ' + p.to : '') + ' marks): does your answer match this level?';
    help = [says].concat(p.level > 1 ? ['Choose Yes only if you also said Yes to the level before.'] : []);
  } else if (p.kind === 'mark') {
    title = Q + ', mark ' + p.k + ' of ' + p.of + ': did your answer earn this mark?';
    help = [says];
  } else if (p.kind === 'method') {
    title = Q + ', working mark' + (p.of > 1 ? ' ' + p.k + ' of ' + p.of : '') + ': did your working show ' + (long || p.of > 1 ? 'this' : says) + '?';
    if (long || p.of > 1) help = [says];
  } else if (p.kind === 'answer') {
    title = Q + ', final answer: did you get ' + (long ? 'this' : says) + '?';
    if (long) help = [says];
  } else {
    title = Q + ', mark ' + markNo + ': did you say ' + (long ? 'this' : says) + '?';
    if (long) help = [says];
  }
  const missed = says ? 'You missed: ' + (p.kind === 'level' ? 'Level ' + p.level + ': ' : '') + says : '';
  return { title, help: help.concat(notes).filter(Boolean).join('\n'), missed, well: says && says.length <= 80 && p.kind !== 'level' ? 'Well done: ' + says : '' };
}
// A marked multiple-choice question. Patryk 2026-10-16 ("Invalid data updating form"): in a quiz, a
// question worth points must already have its correct answer, so the CHOICES are set BEFORE the points.
// "Tick two boxes" questions (answer is a list) become tick-boxes: Forms gives their points only when
// exactly the right boxes are ticked.
function addChoice_(f, title, options, answer, points, feedback, help, correct) {
  const many = Array.isArray(answer);
  return tryPlain_(title, (t, p) => {
    const it = (many ? f.addCheckboxItem() : f.addMultipleChoiceItem()).setTitle(t).setRequired(true);
    if (help) it.setHelpText(p ? plain_(help) : help);
    it.setChoices(options.map((o, i) => it.createChoice(p ? plain_(o) : o, many ? answer.indexOf(i) >= 0 : i === answer)));
    it.setPoints(points);
    if (feedback) it.setFeedbackForIncorrect(FormApp.createFeedback().setText(p ? plain_(feedback) : feedback).build());
    if (correct) it.setFeedbackForCorrect(FormApp.createFeedback().setText(p ? plain_(correct) : correct).build());
    return it;
  }, f);
}
// Google Forms sometimes refuses "Invalid data updating form" over odd symbols (12C/13D question 7:
// ×, 10⁸, ✓, long dashes). Try as written, then again in plain keyboard text (x, 10^8, -). A failed
// attempt's half-made item is removed.
function tryPlain_(text, make, f) {
  let n = f.getItems ? f.getItems().length : 0, first;
  try { return make(text, false); } catch (e) { first = e; }
  if (f.getItems) f.getItems().slice(n).forEach((x) => { try { f.deleteItem(x); } catch (z) { /* gone */ } });
  try { return make(plain_(text), true); }
  catch (e) { throw new Error(String(first.message || first) + ' (and again in plain text: ' + String(e.message || e) + ')'); }
}
// Plain keyboard text: what Google Forms always accepts.
function plain_(s) {
  const sup = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };
  return String(s || '')
    .replace(/[⁰¹²³⁴-⁹⁺⁻]+/g, (m) => '^' + m.split('').map((c) => sup[c]).join(''))
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/[✓✔•]/g, '-').replace(/[–—−]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/×/g, 'x').replace(/÷/g, '/').replace(/→/g, '->').replace(/°/g, ' degrees')
    .replace(/\r/g, '').replace(/[^\n\x20-\x7E]/g, ' ');
}
// 08:00 UK on a date, as the UTC time of day Classroom wants (dueTime is UTC). British Summer Time
// ends Sun 25 Oct 2026: 08:00 UK is 07:00 UTC up to then, 08:00 UTC after. The date never changes.
function ukToUtc_(date, h, m) {
  const [y, mo, d] = String(date).split('-').map(Number);
  const z = Utilities.formatDate(new Date(Date.UTC(y, mo - 1, d, 12)), TZ, 'Z');   // "+0100" or "+0000"
  const sign = z[0] === '-' ? -1 : 1, oh = Number(z.slice(1, 3)), om = Number(z.slice(3, 5));
  let mins = (h || 0) * 60 + (m || 0) - sign * (oh * 60 + om);
  mins = ((mins % 1440) + 1440) % 1440;
  return { hours: Math.floor(mins / 60), minutes: mins % 60 };
}
// The Classroom item's title: "P1 Energy exam practice" (05-design.md 1.0); older files keep their title.
function classroomTitle_(hw) {
  if (!(Number(hw.schema) >= 2) || !hw.topic) return hw.title;
  return hw.topic + (hw.kind === 'exam-practice' ? ' exam practice' : ' homework quiz');
}
// opt = { due: 'YYYY-MM-DD' (else hw.due), message (else hw.intro), postAt: 'YYYY-MM-DDTHH:mm' UK time
// to post by itself (else a draft he publishes), points }
function classroomDraft_(hw, form, opt) {
  const o = opt || {};
  if (typeof Classroom === 'undefined') return { ok: false, why: 'Classroom service not switched on (Apps Script: Services + → Google Classroom API)' };
  try {
    const want = String(hw.cls).toLowerCase().replace(/\s+/g, '');
    const courses = (Classroom.Courses.list({ teacherId: 'me', courseStates: ['ACTIVE'] }).courses || []);
    const key = (c) => (String(c.name) + ' ' + String(c.section || '')).toLowerCase().replace(/\s+/g, '');
    // Classroom spells 7MLA as "7Ml": if nothing matches the full code, try it without its last letter
    const course = courses.find((c) => key(c).includes(want)) || (want.length === 4 && /a$/.test(want) ? courses.find((c) => key(c).includes(want.slice(0, 3))) : null);
    if (!course) return { ok: false, why: 'no Classroom class with "' + hw.cls + '" in its name (found: ' + courses.map((c) => c.name).join(', ') + ')' };
    const due = o.due || hw.due;
    const [y, m, d] = due.split('-').map(Number);
    const t = ukToUtc_(due, 8, 0);
    const title = classroomTitle_(hw);
    const body = {
      title, description: o.message || hw.intro || '', workType: 'ASSIGNMENT', state: 'DRAFT', maxPoints: o.points || totalPoints_(hw),
      materials: [{ link: { url: form.getPublishedUrl(), title } }],
      dueDate: { year: y, month: m, day: d }, dueTime: t,
    };
    if (o.postAt) body.scheduledTime = at_(o.postAt).toISOString();   // posts itself at that UK time (stays a draft until then)
    const res = Classroom.Courses.CourseWork.create(body, course.id) || {};
    const pad = (x) => (x < 10 ? '0' : '') + x;
    return { ok: true, courseId: course.id, courseWorkId: res.id || '', link: res.alternateLink || '', scheduled: !!o.postAt, dueUtc: due + 'T' + pad(t.hours) + ':' + pad(t.minutes) + 'Z' };
  } catch (e) { return { ok: false, why: String(e.message || e) }; }
}

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
  const records = [];
  const ls = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Lessons');
  if (ls && ls.getLastRow() > 1) ls.getRange(2, 2, ls.getLastRow() - 1, 1).getValues().forEach(([json]) => { try { records.push(JSON.parse(json)); } catch (e) { /* skip */ } });
  return { version: VERSION, data: withData && chunks ? JSON.parse(chunks) : null, weeks, learned, added, classSettings, records,
    behaviourUrl: PropertiesService.getScriptProperties().getProperty('BEHAVIOUR_URL') || '' };
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
  CacheService.getScriptCache().remove('ptt');   // the behaviour app re-reads the timetable
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

// Several weeks at once: later weeks that slid along after a change (one push home, not one per week).
function saveWeeks(k, weeks) {
  check_(k);
  const w = sheet_('Weeks');
  (weeks || []).forEach((week) => {
    const n = w.getLastRow();
    const mons = n > 1 ? w.getRange(2, 1, n - 1, 1).getDisplayValues().map((r) => r[0]) : [];
    const at = mons.indexOf(week.monday);
    const row = [week.monday, JSON.stringify(week), new Date()];
    if (at >= 0) w.getRange(at + 2, 1, 1, 3).setValues([row]);
    else { w.appendRow(row); w.getRange(w.getLastRow(), 1).setNumberFormat('@').setValue(week.monday); }
  });
  return { saved: (weeks || []).length, home: pushState_() };
}
// Every lesson record, written whole (a few hundred short rows at most).
function saveLessons(k, records) {
  check_(k);
  const sh = tab_('Lessons', ['Lesson', 'Record']);
  const rows = (records || []).map((r) => [r.cls + '|' + r.key, JSON.stringify(r)]);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, 2).setValues(rows);
  return { saved: rows.length };
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
