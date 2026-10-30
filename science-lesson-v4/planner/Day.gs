/* ------------------------------------------------------------- Day.gs (Lane C: the installed app's server side)
   lanes/design-installed-app.md section 5. This file is Lane C's, so Lane B's Code.gs edits never collide with it.

   The bridge (5.1). The planner's pages call the server through Google's in-page bridge (google.script.run), which
   only works inside an Apps Script page. The installed app lives on another site, so it sends a POST instead:
     body (sent as plain text, the shape Apps Script accepts from another site): {"key": "...", "fn": "init", "args": [...]}
     answer (JSON): {"ok": true, "result": ...}  or  {"ok": false, "error": "..."}
   Only the calls named below can be reached this way, and only with the planner key. Every call still checks the key
   itself as well, exactly as it does from the pages. GET is untouched: it still serves the pages and the board.

   The day screen, timer, capture and job calls (5.3) will live in this file too. */

const BRIDGE_CALLS = [
  // behaviour (the phone page)
  'init', 'openClass', 'logEvent', 'logMany', 'removeEvent', 'removeMany', 'positivesOver', 'getMode', 'setMode',
  'setLive', 'setLost', 'setSupport', 'getSilence', 'showRecap', 'stopRecap', 'setTimer', 'adjustTimer',
  'stopTimer', 'setPause', 'endMode', 'getFriday', 'markEmailed', 'lessonMcqs', 'saveVote', 'removeVote',
  // the planner
  'loadAll', 'saveWeek', 'saveWeeks', 'saveLessonChanges', 'saveLessons', 'saveClassSetting', 'learnEquipment',
  'createLesson', 'renameAdded', 'sendRequest', 'pushHome', 'behaviourWeek', 'syncWeek', 'myEvents', 'homeworkList',
  'checkHomework', 'setHomework', 'homeworkStatus', 'markHomework', 'homeworkResults', 'setGradeBands',
  'turnOnDailyResults', 'setBehaviourUrl', 'exportXlsx',
  // the day screen, capture box and evening timer (this file)
  'dayLoad', 'daySettings', 'daySettingsSave', 'todoSave', 'todoSet', 'blockAccept', 'doneForToday', 'captureSave', 'captureFile',
  'obsidianFlush', 'timerStart', 'timerStop', 'timerLog', 'timerEdit', 'timerReport', 'timerRules', 'timerRulesSave'
];
// Ulhu: every public game call (gameLoad, gameTick, ...). Names ending in _ are private and never reachable.
const BRIDGE_GAME = /^game[A-Z][A-Za-z0-9]*$/;

function bridgeAllowed_(fn) {
  return typeof fn === 'string' && (BRIDGE_CALLS.indexOf(fn) >= 0 || BRIDGE_GAME.test(fn)) && typeof globalThis[fn] === 'function';
}
function bridgeOut_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function doPost(e) {
  let b;
  try { b = JSON.parse((e && e.postData && e.postData.contents) || ''); } catch (err) { return bridgeOut_({ ok: false, error: 'Bad request' }); }
  if (!b || typeof b !== 'object') return bridgeOut_({ ok: false, error: 'Bad request' });
  try { check_(b.key); } catch (err) { return bridgeOut_({ ok: false, error: 'Locked' }); }
  if (!bridgeAllowed_(b.fn)) return bridgeOut_({ ok: false, error: 'Not allowed: ' + String(b.fn).slice(0, 40) });
  const args = Array.isArray(b.args) ? b.args : [];
  try {
    const result = globalThis[b.fn].apply(null, [b.key].concat(args));
    return bridgeOut_({ ok: true, result: result === undefined ? null : result });
  } catch (err) {
    return bridgeOut_({ ok: false, error: String((err && err.message) || err) });
  }
}

/* ------------------------------------------------------------- the day screen, capture box and evening timer (5.3)
   Tabs (made the first time they are needed, in whichever Sheet this project is bound to; they move with the data):
     Todos, Inbox, Timer, Timer Rules, Day Settings, Day Log. Rows are only added or updated, never deleted.
   The page applies the rules (planner/day-logic.js); the server only stores and gathers. No pupil names are stored by
   these calls: pupils to chase are class-level counts from the homework status, captures about a pupil stay in the
   planner as a to-do, and the timer stores job, class and minutes only. */

const DAY_TABS = {
  'Todos': ['id', 'text', 'kind', 'cls', 'due', 'addedOn', 'source', 'status', 'movedTo', 'minutes', 'at', 'doneOn'],
  'Inbox': ['id', 'at', 'text', 'suggestedHome', 'cls', 'lesson', 'confirmedHome', 'status', 'filedAt'],
  'Timer': ['id', 'day', 'job', 'cls', 'minutes', 'source', 'startedAt', 'endedAt', 'maybe', 'taskRef', 'note'],
  'Timer Rules': ['pattern', 'job', 'cls', 'enabled'],
  'Day Settings': ['key', 'value'],
  'Day Log': ['day', 'what', 'at']
};
const DAY_DEFAULTS = { shutdownTime: '17:00', afterSchoolEnd: '17:00', minutes: { mark: 60, chase: 5, build: 40, ritualBooks: 120 },
  soundPhone: false, soundPc: true,
  // Obsidian inbox (30 Oct 2026): option (a) is the folder; writing stays OFF until Patryk confirms it. Until then a capture
  // he sends to Obsidian is kept in the Inbox tab as "held" and written, oldest first, the moment writing is switched on.
  obsidianFolder: 'G:\\My Drive\\Obsidian', obsidianWrite: false };
const DAY_JOBS = ['Marking', 'Building lessons', 'Setting homework', 'Admin', 'Emails', 'Personal'];
const DAY_CLASS_JOBS = ['Marking', 'Building lessons', 'Setting homework'];
const DAY_TZ = 'Europe/London';
const dDay_ = (d) => Utilities.formatDate(d || new Date(), DAY_TZ, 'yyyy-MM-dd');
const dAddDay_ = (day, n) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dMonday_ = (day) => { const d = new Date(day + 'T12:00:00Z'), w = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - w); return d.toISOString().slice(0, 10); };
const dClean_ = (s, n) => String(s === undefined || s === null ? '' : s).replace(/[\r\n]+/g, ' ').trim().slice(0, n || 300);
const dPlannerId_ = (id) => /^(build|mark|chase|review):/.test(String(id || ''));

function dTab_(name) { return tab_(name, DAY_TABS[name]); }
// every row of a Day tab as an object, with its sheet row number (r). Sheets turns a typed day ("2026-11-03") or time
// ("10:25") into a date value, so those columns are read back as text; times in ms stay numbers.
const DAY_DAYCOLS = { due: 1, addedOn: 1, movedTo: 1, doneOn: 1, day: 1 };
function dRows_(name) {
  const sh = dTab_(name), n = sh.getLastRow(), head = DAY_TABS[name];
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, head.length).getValues().map((v, i) => {
    const o = { r: i + 2 };
    head.forEach((h, j) => {
      const x = v[j];
      o[h] = !(x instanceof Date) ? x : DAY_DAYCOLS[h] ? dDay_(x) : h === 'at' && name === 'Todos' ? Utilities.formatDate(x, DAY_TZ, 'HH:mm') : x.getTime();
    });
    return o;
  });
}
function dAppend_(name, obj) { dTab_(name).appendRow(DAY_TABS[name].map((h) => (obj[h] === undefined || obj[h] === null ? '' : obj[h]))); }
function dUpdate_(name, row, obj) {
  const head = DAY_TABS[name], sh = dTab_(name);
  Object.keys(obj).forEach((h) => { const c = head.indexOf(h); if (c >= 0) sh.getRange(row.r, c + 1).setValue(obj[h] === null || obj[h] === undefined ? '' : obj[h]); });
}
function dLock_(fn) { const l = LockService.getScriptLock(); l.waitLock(15000); try { return fn(); } finally { l.releaseLock(); } }
function dId_(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* ---- settings */
function daySettingsRaw_() { const o = {}; dRows_('Day Settings').forEach((r) => { try { o[r.key] = JSON.parse(r.value); } catch (e) { o[r.key] = r.value; } }); return o; }
function daySettings(k) {
  check_(k);
  const out = JSON.parse(JSON.stringify(DAY_DEFAULTS)), raw = daySettingsRaw_();
  Object.keys(out).forEach((key) => { if (key in raw) out[key] = raw[key]; });
  return out;
}
function daySettingsSave(k, obj) {
  check_(k);
  dLock_(() => {
    const rows = dRows_('Day Settings');
    Object.keys(obj || {}).filter((key) => key in DAY_DEFAULTS).forEach((key) => {
      const v = JSON.stringify(obj[key]), hit = rows.find((r) => r.key === key);
      if (hit) dUpdate_('Day Settings', hit, { value: v }); else dAppend_('Day Settings', { key: key, value: v });
    });
  });
  if (obj && obj.obsidianWrite === true) obsidianFlush(k);   // switching it on writes what was held, oldest first
  return daySettings(k);
}

/* ---- what the planner knows about a day */
function dWorld_() { try { const a = loadDataWeeks_(true); return { data: a.data || null, weeks: a.weeks || {} }; } catch (e) { return { data: null, weeks: {} }; } }
function dLessons_(world, day) {
  const w = (world.weeks || {})[dMonday_(day)], idx = (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7;
  if (w && w.slots) return w.slots.filter((s) => s.day === idx && s.cls).map((s) => ({ period: s.period, cls: s.cls, kind: s.kind || 'lesson',
    title: s.kind === 'lesson' ? String(s.text || '').replace(/^.*? — /, '') : String(s.text || s.kind || ''), built: s.kind === 'lesson' ? s.built === true : null, planned: true }))
    .sort((a, b) => a.period - b.period);
  // no saved week: the timetable only, so the strip shows "?" for each lesson
  const tt = world.data && world.data.timetable;
  if (!tt || typeof weekLetter_ !== 'function') return [];
  return (tt[weekLetter_(new Date(day + 'T12:00:00Z'))] || []).filter((s) => s.day === idx)
    .map((s) => ({ period: s.period, cls: s.cls, kind: 'lesson', title: '', built: null, planned: false })).sort((a, b) => a.period - b.period);
}
// planner-known to-dos: lessons in the next school days (today and two more) not built, key homework past its due day not
// marked, and pupils to chase (class-level counts from the cached homework status; never names)
function dPlannerItems_(world, today) {
  const items = [], days = [];
  for (let i = 0, d = today; days.length < 3 && i < 7; i++, d = dAddDay_(d, 1)) { const wd = new Date(d + 'T12:00:00Z').getUTCDay(); if (wd > 0 && wd < 6) days.push(d); }
  days.forEach((day) => dLessons_(world, day).forEach((L) => {
    if (L.kind === 'lesson' && L.planned && L.built === false) items.push({ id: 'build:' + day + ':' + L.period + ':' + L.cls, kind: 'build', text: 'Build ' + L.cls + ' P' + L.period + (L.title ? ': ' + L.title : ''), cls: L.cls, due: day, since: today });
  }));
  try {
    hwRows_().forEach((r) => {
      const due = r.dueOn instanceof Date ? dDay_(r.dueOn) : String(r.dueOn || '').slice(0, 10);
      if (r.kind === 'key' && due && due < today && r.status !== 'marked') items.push({ id: 'mark:' + r.id, kind: 'mark', text: 'Mark ' + r.cls + ' ' + r.title, cls: r.cls, due: due, since: due });
    });
  } catch (e) { /* no Homework tab yet */ }
  try {
    const hit = CacheService.getScriptCache().get('hwstat');
    (hit ? JSON.parse(hit) : []).forEach((o) => {
      const due = String(o.dueOn || '').slice(0, 10), missing = (o.size || 0) - (o.done || 0);
      if (due && due < today && due >= dAddDay_(today, -14) && o.status !== 'marked' && o.size && missing > 0)
        items.push({ id: 'chase:' + o.id, kind: 'chase', count: missing, text: 'Chase ' + missing + ' pupil' + (missing > 1 ? 's' : '') + ': ' + o.cls + ' ' + o.title, cls: o.cls, due: today, since: due });
    });
  } catch (e) { /* no status cached yet: opening the Homework tab fills it */ }
  return items;
}

/* ---- everything the Today screen needs in one trip */
function dayLoad(k, day) {
  check_(k);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) ? String(day) : dDay_();
  const world = dWorld_(), data = world.data || {};
  const marks = {}, own = [];
  dRows_('Todos').forEach((r) => {
    if (r.source === 'planner') { marks[r.id] = r; return; }
    const open = r.status === 'open' || (r.status === 'moved' && String(r.movedTo) <= today);
    // open ones always show (leftovers roll over with the "yesterday" tag); a block's time only counts on its own day
    if (open) own.push({ id: r.id, kind: r.kind || 'own', text: r.text, cls: r.cls, due: r.due || '',
      since: r.status === 'moved' ? String(r.movedTo) : r.addedOn, minutes: r.minutes === '' ? null : Number(r.minutes),
      at: r.due === today ? r.at || '' : '', planned: !!r.at && r.due === today });
  });
  const planner = dPlannerItems_(world, today).filter((x) => {
    const m = marks[x.id];
    if (!m) return true;
    if (m.status === 'moved') return String(m.movedTo) <= today;
    if (m.status === 'open') return true;
    return m.doneOn !== today;   // done or dropped: hidden today only; the planner brings it back tomorrow if still true
  });
  const timerRows = dRows_('Timer');
  const run = timerRows.filter((r) => !r.endedAt)[0];
  return {
    day: today, lessons: dLessons_(world, today), periodTimes: data.periodTimes || null, cal: { terms: data.terms || [], inset: data.inset || [] },
    items: own.concat(planner),
    timer: run ? { id: run.id, job: run.job, cls: run.cls, startedAt: run.startedAt, source: run.source, taskRef: run.taskRef } : null,
    recent: timerRows.slice(-40).map((r) => ({ job: r.job, cls: r.cls, startedAt: r.startedAt })),
    obsidianHeld: dRows_('Inbox').filter((r) => r.status === 'held').length,
    inbox: dRows_('Inbox').filter((r) => r.status === 'new').map((r) => ({ id: r.id, at: r.at, text: r.text, suggestedHome: r.suggestedHome, cls: r.cls, lesson: r.lesson })),
    settings: daySettings(k), rules: timerRules(k),
    doneForToday: dRows_('Day Log').some((r) => r.day === today && r.what === 'done for today')
  };
}

/* ---- to-dos */
function todoSave(k, todo) {
  check_(k);
  const t = todo || {}, text = dClean_(t.text, 300);
  if (!text) throw new Error('A to-do needs some words');
  return dLock_(() => {
    const id = /^[\w.-]{1,60}$/.test(String(t.id || '')) && !dPlannerId_(t.id) ? String(t.id) : dId_('t');
    if (dRows_('Todos').some((r) => r.id === id)) return { id: id, existed: true };   // the same tap sent twice is saved once
    dAppend_('Todos', { id: id, text: text, kind: 'own', cls: dClean_(t.cls, 8), due: /^\d{4}-\d{2}-\d{2}$/.test(String(t.due || '')) ? t.due : '', addedOn: dDay_(),
      source: 'own', status: 'open', minutes: t.minutes == null || t.minutes === '' ? '' : Number(t.minutes), at: /^\d{2}:\d{2}$/.test(String(t.at || '')) ? t.at : '' });
    return { id: id };
  });
}
// status: done | dropped | moved | open. A planner-known item (id build:..., mark:..., chase:...) gets a record of its own:
// done and dropped hide it today only, moved hides it until that day. His own to-dos change in place; dropped is for good.
function todoSet(k, id, status, movedTo) {
  check_(k);
  if (['done', 'dropped', 'moved', 'open'].indexOf(status) < 0) throw new Error('Unknown status');
  if (status === 'moved' && !/^\d{4}-\d{2}-\d{2}$/.test(String(movedTo || ''))) throw new Error('Pick a day to move it to');
  const today = dDay_();
  return dLock_(() => {
    const rows = dRows_('Todos');
    if (dPlannerId_(id)) {
      const hit = rows.find((r) => r.id === id && r.source === 'planner');
      const rec = { status: status, movedTo: status === 'moved' ? movedTo : '', doneOn: status === 'done' || status === 'dropped' ? today : '' };
      if (hit) dUpdate_('Todos', hit, rec); else dAppend_('Todos', Object.assign({ id: id, text: '', kind: String(id).split(':')[0], source: 'planner', addedOn: today }, rec));
      return { id: id, status: status };
    }
    const hit = rows.find((r) => r.id === id);
    if (!hit) throw new Error('That to-do is not in the Todos tab');
    dUpdate_('Todos', hit, { status: status, movedTo: status === 'moved' ? movedTo : '', doneOn: status === 'done' ? today : '' });
    return { id: id, status: status };
  });
}
// an accepted ghost block: the to-do gets a time today. A planner-known item becomes a timed to-do of its own for today
// and the planner's copy steps aside for today.
function blockAccept(k, block) {
  check_(k);
  const b = block || {}, at = dClean_(b.start, 5), today = dDay_();
  if (!/^\d{2}:\d{2}$/.test(at)) throw new Error('A block needs a start time');
  return dLock_(() => {
    const rows = dRows_('Todos');
    const hit = rows.find((r) => r.id === b.todoId && r.source !== 'planner');
    if (hit) { dUpdate_('Todos', hit, { at: at, due: today, minutes: Number(b.minutes) || hit.minutes }); return { id: hit.id, at: at }; }
    if (!dPlannerId_(b.todoId)) throw new Error('That to-do is not in the Todos tab');
    const id = 'blk-' + today + '-' + String(b.todoId).replace(/[^\w.-]/g, '_').slice(0, 50);
    if (!rows.some((r) => r.id === id)) dAppend_('Todos', { id: id, text: dClean_(b.text, 300), kind: String(b.todoId).split(':')[0], cls: dClean_(b.cls, 8), due: today, addedOn: today, source: 'block', status: 'open', minutes: Number(b.minutes) || '', at: at });
    const mine = rows.find((r) => r.id === b.todoId && r.source === 'planner'), rec = { status: 'dropped', movedTo: '', doneOn: today };
    if (mine) dUpdate_('Todos', mine, rec); else dAppend_('Todos', Object.assign({ id: b.todoId, text: '', kind: String(b.todoId).split(':')[0], source: 'planner', addedOn: today }, rec));
    return { id: id, at: at };
  });
}
// "Done for today": stops any running timer and records the day as shut down. The "Done for today" ritual is ticked by
// the page through Ulhu's own tick (gameTick), so the reward maths stay in one place (Lane A's).
function doneForToday(k, at) {
  check_(k);
  const when = Number(at) || Date.now();
  return dLock_(() => {
    const stopped = dStopRunning_(when), day = dDay_(new Date(when));
    if (!dRows_('Day Log').some((r) => r.day === day && r.what === 'done for today')) dAppend_('Day Log', { day: day, what: 'done for today', at: when });
    return { day: day, stopped: stopped, beforeSeven: Number(Utilities.formatDate(new Date(when), DAY_TZ, 'H')) < 19 };
  });
}

/* ---- quick capture */
function captureSave(k, text, at, id, suggested) {
  check_(k);
  const t = dClean_(text, 500);
  if (!t) throw new Error('Nothing to save');
  const cid = /^[\w-]{1,40}$/.test(String(id || '')) ? String(id) : dId_('c');
  return dLock_(() => {
    if (dRows_('Inbox').some((r) => r.id === cid)) return { id: cid, existed: true };   // the same capture sent twice is saved once
    const s = suggested || {}, home = ['todo', 'orderSheet', 'class', 'lesson', 'obsidian'].indexOf(s.home) >= 0 ? s.home : 'obsidian';
    dAppend_('Inbox', { id: cid, at: Number(at) || Date.now(), text: t, suggestedHome: home, cls: dClean_(s.cls, 8), lesson: Number(s.lesson) || '', status: 'new' });
    return { id: cid };
  });
}
// file a capture where he confirmed: home = { home: todo|orderSheet|class|lesson|obsidian, cls, lesson }.
// For now the order sheet, class and lesson homes become a to-do labelled with the class and the destination, so nothing
// is lost; writing straight into the planner's lesson notes waits for the planner side. Obsidian: appended as a dated
// bullet to "Inbox from planner.md" in the folder set in Settings, only once writing is switched on (until then it is
// held, see obsidianFlush); anything with a class is refused.
function captureFile(k, id, home) {
  check_(k);
  const h = home || {}, where = String(h.home || '');
  if (['todo', 'orderSheet', 'class', 'lesson', 'obsidian'].indexOf(where) < 0) throw new Error('Unknown home');
  return dLock_(() => {
    const row = dRows_('Inbox').find((r) => r.id === id);
    if (!row) throw new Error('That capture is not in the Inbox tab');
    if (row.status === 'filed') return { id: id, home: row.confirmedHome, existed: true };
    const cls = dClean_(h.cls !== undefined ? h.cls : row.cls, 8), lesson = Number(h.lesson || row.lesson) || '';
    if (where === 'obsidian') {
      if (cls) throw new Error('Anything about a class stays in the planner, not Obsidian');
      if (daySettingsRaw_().obsidianWrite !== true) {   // writing is off: kept safe here until he switches it on
        dUpdate_('Inbox', row, { confirmedHome: 'obsidian', cls: '', status: 'held' });
        return { id: id, home: 'obsidian', held: true };
      }
      dObsidianAppend_(row.text, row.at);
    } else {
      const label = where === 'orderSheet' ? 'Order' + (cls ? ' ' + cls : '') + ': ' : where === 'lesson' && cls ? cls + ' L' + lesson + ': ' : where === 'class' && cls ? cls + ': ' : '';
      dAppend_('Todos', { id: 'cap-' + id, text: dClean_(label + row.text, 300), kind: 'capture', cls: cls, addedOn: dDay_(), source: 'capture', status: 'open' });
    }
    dUpdate_('Inbox', row, { confirmedHome: where, cls: cls, status: 'filed', filedAt: Date.now() });
    return { id: id, home: where };
  });
}
// writes the captures held for Obsidian (oldest first) once writing is on; each one is marked filed as it is written
function obsidianFlush(k) {
  check_(k);
  if (daySettingsRaw_().obsidianWrite !== true) return { written: 0, off: true };
  return dLock_(() => {
    const held = dRows_('Inbox').filter((r) => r.status === 'held').sort((a, b) => Number(a.at) - Number(b.at));
    held.forEach((r) => { dObsidianAppend_(r.text, r.at); dUpdate_('Inbox', r, { status: 'filed', filedAt: Date.now() }); });
    return { written: held.length };
  });
}
function dObsidianAppend_(text, at) {
  const set = Object.assign({}, DAY_DEFAULTS, daySettingsRaw_()), folderPath = String(set.obsidianFolder || '').trim();
  if (set.obsidianWrite !== true) throw new Error('Writing to Obsidian is off until you confirm the folder in Settings');
  if (!folderPath) throw new Error('Pick the Obsidian folder in Settings first (nothing is written until you do)');
  let dir = DriveApp.getRootFolder();
  folderPath.replace(/^[A-Z]:[\\/]/i, '').replace(/^My Drive[\\/]/i, '').split(/[\\/]/).filter(Boolean).forEach((name) => {
    const it = dir.getFoldersByName(name); if (!it.hasNext()) throw new Error('Obsidian folder not found: ' + folderPath); dir = it.next();
  });
  const line = '- ' + Utilities.formatDate(new Date(Number(at) || Date.now()), DAY_TZ, 'yyyy-MM-dd HH:mm') + ' ' + dClean_(text, 500) + '\n';
  const it = dir.getFilesByName('Inbox from planner.md');
  if (it.hasNext()) { const f = it.next(); f.setContent(f.getBlob().getDataAsString() + line); }
  else dir.createFile('Inbox from planner.md', '# Inbox from planner\n\n' + line, 'text/markdown');
  tab_('Log', ['when', 'what', 'where']).appendRow([new Date(), 'capture appended to Obsidian inbox', folderPath + '/Inbox from planner.md']);
}

/* ---- evening timer: one shared timer; job, class and minutes only */
function dStopRunning_(at) {
  let stopped = null;
  dRows_('Timer').filter((r) => !r.endedAt).forEach((r) => {
    let end = Math.max(Number(at) || Date.now(), Number(r.startedAt)), maybe = false;
    if (end - r.startedAt > 2 * 3600e3) { end = Number(r.startedAt) + 2 * 3600e3; maybe = true; }   // left running: 2 hours, flagged
    const minutes = Math.round((end - r.startedAt) / 60000);
    dUpdate_('Timer', r, { endedAt: end, minutes: minutes, maybe: maybe || r.maybe === true });
    stopped = { id: r.id, job: r.job, cls: r.cls, minutes: minutes, maybe: maybe };
  });
  return stopped;
}
function timerStart(k, job, cls, at, source, taskRef) {
  check_(k);
  if (DAY_JOBS.indexOf(job) < 0) throw new Error('Unknown job');
  const when = Number(at) || Date.now();
  return dLock_(() => {
    const stopped = dStopRunning_(when);   // starting a new job stops the old one, on either device
    const id = dId_('tm');
    dAppend_('Timer', { id: id, day: dDay_(new Date(when)), job: job, cls: DAY_CLASS_JOBS.indexOf(job) >= 0 ? dClean_(cls, 8) : '',
      source: ['pc', 'phone', 'free'].indexOf(source) >= 0 ? source : 'phone', startedAt: when, taskRef: dClean_(taskRef, 60), maybe: false });
    return { id: id, stopped: stopped };
  });
}
function timerStop(k, at) { check_(k); return dLock_(() => ({ stopped: dStopRunning_(Number(at) || Date.now()) })); }
// the home PC's batch of totals: [{ id, day, job, cls, minutes }]; the same id twice is saved once; never window titles
function timerLog(k, rows) {
  check_(k);
  return dLock_(() => {
    const have = {}; dRows_('Timer').forEach((r) => { have[r.id] = 1; });
    let n = 0;
    (rows || []).slice(0, 500).forEach((x) => {
      const id = /^[\w:.-]{1,60}$/.test(String(x.id || '')) ? String(x.id) : '';
      if (!id || have[id] || DAY_JOBS.indexOf(x.job) < 0 || !(Number(x.minutes) > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.day))) return;
      dAppend_('Timer', { id: id, day: x.day, job: x.job, cls: DAY_CLASS_JOBS.indexOf(x.job) >= 0 ? dClean_(x.cls, 8) : '', minutes: Math.round(Number(x.minutes)), source: 'pc',
        startedAt: Number(x.startedAt) || '', endedAt: Number(x.endedAt) || Number(x.startedAt) || 1, maybe: false });
      have[id] = 1; n++;
    });
    return { saved: n };
  });
}
function timerEdit(k, id, fields) {
  check_(k);
  return dLock_(() => {
    const r = dRows_('Timer').find((x) => x.id === id);
    if (!r) throw new Error('That timer row is not in the Timer tab');
    const f = fields || {}, ch = {};
    if (f.job !== undefined) { if (DAY_JOBS.indexOf(f.job) < 0) throw new Error('Unknown job'); ch.job = f.job; }
    if (f.cls !== undefined) ch.cls = dClean_(f.cls, 8);
    if (f.minutes !== undefined) { if (!(Number(f.minutes) >= 0)) throw new Error('Minutes must be a number'); ch.minutes = Math.round(Number(f.minutes)); ch.maybe = false; }
    if (f.note !== undefined) ch.note = dClean_(f.note, 200);
    dUpdate_('Timer', r, ch);
    return { id: id };
  });
}
function timerReport(k, from, to) {
  check_(k);
  return dRows_('Timer').filter((r) => r.endedAt && String(r.day) >= String(from || '') && String(r.day) <= String(to || '9999'))
    .map((r) => ({ id: r.id, day: r.day, job: r.job, cls: r.cls, minutes: Number(r.minutes) || 0, maybe: r.maybe === true, taskRef: r.taskRef, source: r.source }));
}
function timerRules(k) {
  check_(k);
  return dRows_('Timer Rules').filter((r) => r.pattern).map((r) => ({ pattern: r.pattern, job: r.job, cls: r.cls, enabled: r.enabled !== false }));
}
function timerRulesSave(k, rows) {
  check_(k);
  const head = DAY_TABS['Timer Rules'];
  const clean = (rows || []).slice(0, 200).map((r) => ({ pattern: dClean_(r.pattern, 60), job: r.job, cls: dClean_(r.cls, 8), enabled: r.enabled !== false }))
    .filter((r) => r.pattern && DAY_JOBS.indexOf(r.job) >= 0);
  return dLock_(() => {
    // the list is replaced in place: rows overwritten, extra old rows blanked (the tab itself is never deleted)
    const sh = dTab_('Timer Rules'), old = Math.max(0, sh.getLastRow() - 1);
    const vals = clean.map((r) => head.map((h) => r[h]));
    while (vals.length < old) vals.push(head.map(() => ''));
    if (vals.length) sh.getRange(2, 1, vals.length, head.length).setValues(vals);
    return timerRules(k);
  });
}
