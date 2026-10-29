/**
 * Behaviour logger, noise meter control and Friday review.
 * PART OF THE PLANNER since 2026-10-12 (one Apps Script project, one spreadsheet): this file sits
 * beside the planner's Code.gs and uses its key (PLANNER_KEY), its check_() and its spreadsheet.
 * Phone page = planner link + &view=phone, board = planner link + &view=board.
 * Sheet tabs: Students, Log, Sessions, Emails, Settings (copied from the old behaviour sheet once by
 * mergeBehaviourData() in Code.gs).
 * Students: Short is the name students see on the board. X and Y are seat positions (% of the plan), Ratio is the plan's width/height.
 */

const B_VERSION = 23;   // shown on the phone and board so you can check the new code is live
// TZ ('Europe/London') comes from the planner's Code.gs (one project since 2026-10-12)
const RULES = { 2: 'Work ethic', 3: 'Quality', 4: 'Attention', 5: 'Voice', 6: 'Lab safety', 7: 'Fixed stations', 8: 'Silent entry' };
// Term dates, the first Week A and the timetable all come from the planner's data (plannerCal_ in Code.gs),
// so the two apps can never disagree about the week letter (work plan 1.6, 2026-10-29). The old table of
// last year's classes and the second copy of the term dates are gone.
const FORTNIGHTLY = ['8AG'];                  // reviewed per fortnight, not per week
// Meter modes. max = seconds before the mode switches itself back to Teaching.
const MODES = {
  countdown: { label: 'Countdown',    max: 900 },   // ends itself after 2.8 s of quiet (board ACCEPT), or when you end it
  work:      { label: 'Silent work',  max: 1200 },
  entry:     { label: 'Silent entry', max: 900 }   // ends itself once the class is silent, like the countdown
};
const DEFAULTS = { STANDARD: 90, STEP: 3, SENSITIVITY: 'Medium', COUNTDOWN_SECS: 3, EMAIL_GAP_DAYS: 21, LOST_GOAL_SECS: 180, SIGN_OFF: '' };   // SIGN_OFF: the name under Friday messages home (2.8)
const LOG_TAIL = 8000;
// Sheets reads a cell that starts with + or - as a formula, which turned every saved positive into #ERROR!.
// So the Log stores words, and the app turns them back into symbols when it reads.
const TYPE_WORD = { '+': 'Positive', '-': 'Negative', 'R': 'Report to me' };
const WORD_TYPE = { 'Positive': '+', 'Negative': '-', 'Report to me': 'R', '+': '+', '-': '-', 'R': 'R' };

/* ================= setup ================= */

// Makes any behaviour tab that is missing (mergeBehaviourData normally copies them over instead).
function setupBehaviour() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabs = {
    Students: ['Class', 'Name', 'Short', 'X', 'Y', 'Ratio'],
    Log: ['Timestamp', 'Class', 'Name', 'Type', 'Rule', 'Rule name'],
    Sessions: ['Start', 'Class', 'Mode', 'Monitored (s)', 'Red (s)', 'Settle (s)'],
    Emails: ['Date', 'Class', 'Name'],
    Settings: ['Setting', 'Value']
  };
  Object.keys(tabs).forEach(name => {
    const tab = B_TAB[name] || name;
    let sh = ss.getSheetByName(tab);
    if (!sh) {
      sh = ss.insertSheet(tab);
      sh.getRange(1, 1, 1, tabs[name].length).setValues([tabs[name]]).setFontWeight('bold');
      sh.setFrozenRows(1);
      if (name === 'Settings') {
        const rows = Object.keys(DEFAULTS).map(k => [k, DEFAULTS[k]]);
        sh.getRange(2, 1, rows.length, 2).setValues(rows);
      }
    }
  });
  Logger.log('Behaviour tabs ready.');
}

/* ================= web entry ================= */

// Called by the planner's doGet (which has already checked the key) for view=phone|board and api=...
function behaviourGet_(e) {
  const p = (e && e.parameter) || {};
  if (p.api === 'board') return respond_(boardData_(Number(p.n) || 5), p.callback);
  if (p.api === 'live') {
    if (p.sid) CacheService.getScriptCache().put('live_' + p.sid, String(p.s || 'quiet'), 3600);
    return respond_({ ok: true }, p.callback);
  }
  if (p.api === 'result') return respond_(recordResult_(p), p.callback);
  if (p.api === 'manifest') return manifest_(p.key, p.view);
  if (p.view === 'board') {
    const tb = HtmlService.createTemplateFromFile('BoardPage');
    tb.key = p.key;
    tb.manifestUrl = ScriptApp.getService().getUrl() + '?api=manifest&view=board&key=' + encodeURIComponent(p.key);
    return tb.evaluate().setTitle('Positives board')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);   // 2026-10-09: the planner's Behaviour tab
  }
  const t = HtmlService.createTemplateFromFile('Phone');
  t.key = p.key;
  t.manifestUrl = ScriptApp.getService().getUrl() + '?api=manifest&view=phone&key=' + encodeURIComponent(p.key);   // home-screen app opens the phone page, not the planner
  return withIcon_(t.evaluate().setTitle('Behaviour')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL));     // 2026-10-09: shown inside the planner's Behaviour tab
}

/** A gold-star icon on a navy square, as an inline SVG data URI (no image files needed). */
function starIcon_() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<rect width="100" height="100" rx="18" fill="%230D2442"/>' +
    '<path fill="%23FFC53D" d="M50 14l12.5 25.5L91 43.5 70.5 63l5 28.5L50 78 24.5 91.5l5-28.5L9 43.5l28.5-4z"/></svg>';
  return 'data:image/svg+xml,' + svg;
}

/** Web app manifest so Chrome opens this as a standalone app (no address bar) once added to the home screen. */
function manifest_(key, view) {
  const startUrl = ScriptApp.getService().getUrl() + '?key=' + encodeURIComponent(key) + (view ? '&view=' + encodeURIComponent(view) : '');
  const isBoard = view === 'board', ulhu = isBoard ? '' : iconUrl_();   // the phone app shows painted Ulhu (2026-10-27), the board keeps its star
  const icon = ulhu || starIcon_(), itype = ulhu ? 'image/png' : 'image/svg+xml';
  const manifest = {
    name: isBoard ? 'Positives Board' : 'Behaviour', short_name: isBoard ? 'Board' : 'Behaviour', start_url: startUrl, scope: startUrl,
    display: 'standalone', background_color: '#EDF2F8', theme_color: '#0D2442',
    icons: [
      { src: icon, sizes: ulhu ? '384x384' : '192x192', type: itype, purpose: 'any' },
      { src: icon, sizes: ulhu ? '384x384' : '512x512', type: itype, purpose: 'any' }
    ]
  };
  return ContentService.createTextOutput(JSON.stringify(manifest)).setMimeType(ContentService.MimeType.JSON);
}

/* ================= phone: classes and logging ================= */

function init(k) {
  check_(k);
  const now = new Date();
  const wl = weekLetter_(now), wd = weekday_(now);
  const classes = classOrder_();
  // today's classes from the planner's real timetable, in period order (2026-10-12); none until the planner has data
  const tt = plannerTimetable_();
  const slots = ((tt && tt[wl]) || []).filter(s => s.day === wd - 1).sort((a, b) => a.period - b.period);
  const today = slots.map(s => classes.find(c => sameClass_(c, s.cls))).filter((c, i, a) => c && a.indexOf(c) === i);
  return {
    classes: classes, today: today, week: wl,
    active: PropertiesService.getScriptProperties().getProperty('BOARD_CLASS') || '',
    rules: RULES, mode: modeState_(), version: B_VERSION, limit: limit_()
  };
}

function openClass(k, cls) {
  check_(k);
  PropertiesService.getScriptProperties().setProperty('BOARD_CLASS', cls);
  const events = today_(cls);
  refreshBoard_(cls, events);
  const list = students_().filter(s => s.cls === cls);
  return {
    students: list.map(s => ({ name: s.name, short: s.short, x: s.x, y: s.y, support: s.support })),
    silence: silenceToday_(cls),
    ratio: (list.find(s => s.ratio) || {}).ratio || 2.6,
    events: events
  };
}

/** type: '+' positive, '-' negative, 'R' report to me (needs rule 2-8) */
// tapTime: when the tap happened on the phone (taps saved offline arrive later); ignored if implausible
function when_(tapTime) {
  const t = Number(tapTime), now = Date.now();
  return t && t <= now + 60000 && now - t < 36 * 3600000 ? new Date(t) : new Date();
}
function rule_(type, rule) {
  // report to me needs a rule; a negative may carry one (the reason for a detention)
  const r = Number(rule) || 0;
  if (type === 'R' && !RULES[r]) throw new Error('Pick a rule');
  return (type === 'R' || type === '-') && RULES[r] ? r : '';
}
function logEvent(k, cls, name, type, rule, tapTime, tapId) {
  check_(k);
  if (['+', '-', 'R'].indexOf(type) === -1) throw new Error('Unknown type');
  rule = rule_(type, rule);
  const now = when_(tapTime);
  withLock_(() => {
    if (seenTap_(tapId, now, cls, [name], type)) return;   // the same tap again: already written
    bSheet_('Log').appendRow([now, cls, name, TYPE_WORD[type], rule, rule ? RULES[rule] : '']);
    SpreadsheetApp.flush();
    rememberTap_(tapId);
  });
  const events = today_(cls);
  refreshBoard_(cls, events);
  return events;
}

/** Same as logEvent for several students at once (multi-select). */
function logMany(k, cls, names, type, rule, tapTime, tapId) {
  check_(k);
  if (['+', '-', 'R'].indexOf(type) === -1) throw new Error('Unknown type');
  rule = rule_(type, rule);
  const now = when_(tapTime);
  withLock_(() => {
    if (seenTap_(tapId, now, cls, names, type)) return;   // the same tap again: already written
    const sh = bSheet_('Log');
    const rows = names.map((n, i) => [new Date(now.getTime() + i), cls, n, TYPE_WORD[type], rule, rule ? RULES[rule] : '']);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
    SpreadsheetApp.flush();
    rememberTap_(tapId);
  });
  const events = today_(cls);
  refreshBoard_(cls, events);
  return events;
}

function removeEvent(k, cls, id) {
  check_(k);
  withLock_(() => {
    const sh = bSheet_('Log');
    const last = sh.getLastRow();
    if (last < 2) return;
    const n = Math.min(last - 1, 600);
    const vals = sh.getRange(last - n + 1, 1, n, 2).getValues();
    for (let i = vals.length - 1; i >= 0; i--) {
      if (vals[i][0] instanceof Date && vals[i][0].getTime() === Number(id) && vals[i][1] === cls) {
        sh.deleteRow(last - n + 1 + i);
        break;
      }
    }
  });
  const events = today_(cls);
  refreshBoard_(cls, events);
  return events;
}

function removeMany(k, cls, ids) {
  check_(k);
  const want = {};
  (ids || []).forEach(id => want[Number(id)] = true);
  withLock_(() => {
    const sh = bSheet_('Log');
    const last = sh.getLastRow();
    if (last < 2) return;
    const n = Math.min(last - 1, 600);
    const vals = sh.getRange(last - n + 1, 1, n, 2).getValues();
    for (let i = vals.length - 1; i >= 0; i--) {
      if (vals[i][0] instanceof Date && want[vals[i][0].getTime()] && vals[i][1] === cls) sh.deleteRow(last - n + 1 + i);
    }
  });
  const events = today_(cls);
  refreshBoard_(cls, events);
  return events;
}

function positivesOver(k, cls, days) {
  check_(k);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (Number(days) - 1));
  const counts = {};
  readLog_().forEach(r => {
    if (r.cls === cls && r.type === '+' && r.ts >= since) counts[r.name] = (counts[r.name] || 0) + 1;
  });
  return Object.keys(counts).map(n => ({ name: n, count: counts[n] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/* ================= phone: meter modes ================= */

function getMode(k) { check_(k); return modeState_(); }

/* callable from the board page via google.script.run, no HTTP request involved */
function getBoard(k, n) {
  check_(k);
  CacheService.getScriptCache().put('boardSeen', String(Date.now()), 21600);   // the phone's dot shows whether the board is open
  return boardData_(Number(n) || 6);
}
function setLive(k, sid, state) { check_(k); if (sid) CacheService.getScriptCache().put('live_' + sid, String(state || 'quiet'), 3600); return { ok: true }; }
function submitResult(k, sid, mon, red, settle, end) {
  check_(k);
  return recordResult_({ sid: sid, mon: String(mon), red: String(red),
    settle: (settle === '' || settle === null || settle === undefined) ? '' : String(settle), end: end ? '1' : '' });
}

// secs: for silent work, the timer length from the phone. Silent work always runs with a timer.
function setMode(k, mode, cls, secs) {
  check_(k);
  if (!MODES[mode]) throw new Error('Unknown mode');
  unpause_();
  if (mode === 'work') {
    const props = PropertiesService.getScriptProperties();
    const t = JSON.parse(props.getProperty('TIMER') || 'null');
    if (!t || Date.now() >= t.end) {
      const s = Math.max(30, Math.min(3600, Number(secs) || 180));
      // work: this timer belongs to the silent work, so Cancel stops it too (a Timer-only timer keeps going)
      props.setProperty('TIMER', JSON.stringify({ kind: 'timer', cls: cls, end: Date.now() + s * 1000, total: s * 1000, work: true }));
    }
  }
  startSilence_(mode, cls, null);
  return modeState_();
}

/* ---------- time lost (Patryk 2026-10-24) ----------
   One tap on the phone when someone talks: the board turns red and counts up the seconds lost, in silent
   work or in ordinary teaching. A second tap stops it and saves the seconds to the "Time Lost" tab.
   A count left running more than 30 minutes is dropped (forgotten, not real). */
const LOST_MAX = 1800;
function setLost(k, cls, on) {
  check_(k);
  const props = PropertiesService.getScriptProperties(), now = Date.now();
  const L = JSON.parse(props.getProperty('LOST') || 'null');
  if (on && !L) props.setProperty('LOST', JSON.stringify({ cls: cls, start: now }));
  if (!on && L) {
    props.deleteProperty('LOST');
    const secs = Math.round((now - L.start) / 1000);
    if (secs >= 1 && secs <= LOST_MAX) tab_('Time Lost', ['when', 'class', 'seconds']).appendRow([new Date(L.start), L.cls, secs]);
  }
  return modeState_();
}
function readLost_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Time Lost');
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues().filter(r => r[0] instanceof Date)
    .map(r => ({ at: r[0], cls: String(r[1]), secs: Number(r[2]) || 0 }));
}

/** Blue border (prompt), purple border (extend) or none, saved in the Support column of the Students tab. */
function setSupport(k, cls, name, val) {
  check_(k);
  val = val === 'prompt' || val === 'extend' ? val : '';
  const sh = bSheet_('Students'), last = sh.getLastRow();
  if (sh.getMaxColumns() < 7) sh.insertColumnsAfter(sh.getMaxColumns(), 7 - sh.getMaxColumns());
  if (sh.getRange(1, 7).getValue() === '') sh.getRange(1, 7).setValue('Support');
  const vals = sh.getRange(2, 1, last - 1, 2).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === cls && String(vals[i][1]).trim() === name) { sh.getRange(i + 2, 7).setValue(val); return val; }
  }
  throw new Error('Student not found');
}

/** Starts a silence. countdownOverride = 0 skips the on-board count (used when a Seated-by timer runs out). */
function startSilence_(mode, cls, countdownOverride) {
  const s = settings_();
  const sid = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
  const m = {
    mode: mode, sid: sid, cls: cls, start: Date.now(),
    countdown: countdownOverride !== null ? countdownOverride : (mode === 'countdown' ? Number(s.COUNTDOWN_SECS) || 0 : 0),
    // countdown: your count is the settling time, so they get 1.5 s after it. Silent work: 3 s to settle.
    grace: mode === 'countdown' ? 0 : mode === 'entry' ? 2 : 3, margin: limit_(),
    title: countdownOverride === 0 ? 'Seated and silent' : ''
  };
  PropertiesService.getScriptProperties().setProperty('MODE', JSON.stringify(m));
  CacheService.getScriptCache().put('sess_' + sid, JSON.stringify({ cls: cls, mode: mode, start: m.start }), 21600);
}

/* ---------- silent time: share of listening time after the countdown that stayed quiet ---------- */
// Cancelled silences are never recorded, so they don't count. Weighted by time across every silence.
function silenceToday_(cls) {
  const t = dayStr_(new Date());
  let mon = 0, red = 0;
  readSessions_().forEach(x => { if (x.cls === cls && dayStr_(x.start) === t) { mon += x.mon; red += x.red; } });
  return mon > 0 ? { pct: Math.round(100 * (1 - red / mon)), mon: Math.round(mon) } : null;
}
function getSilence(k, cls) { check_(k); return silenceToday_(cls); }

/* ---------- noise limit you set on the phone (dB above the quiet-room level) ---------- */
function limit_() { return Number(PropertiesService.getScriptProperties().getProperty('LIMIT_DB')) || 13; }
function setLimit(k, db) {
  check_(k);
  const v = Math.max(2, Math.min(30, Math.round(Number(db) || 13)));
  PropertiesService.getScriptProperties().setProperty('LIMIT_DB', String(v));
  return v;
}

/* ---------- end-of-lesson recap on the board ---------- */
// Everyone with a positive today in this class, most positives first. The board scrolls through it.
function showRecap(k, cls) {
  check_(k);
  const shorts = {};
  students_().forEach(s => { if (s.cls === cls) shorts[s.name] = s.short; });
  const counts = {};
  today_(cls).forEach(e => { if (e.type === '+') counts[e.name] = (counts[e.name] || 0) + 1; });
  const list = Object.keys(counts).map(n => ({ name: shorts[n] || shortName_(n), count: counts[n] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const secs = Math.min(90, 6 + list.length * 1.6);
  const r = { cls: cls, list: list, start: Date.now(), end: Date.now() + secs * 1000, id: Utilities.getUuid().slice(0, 8) };
  CacheService.getScriptCache().put('recap', JSON.stringify(r), 600);
  return { count: list.length, secs: Math.round(secs) };
}
function stopRecap(k) { check_(k); CacheService.getScriptCache().remove('recap'); return true; }

/* ---------- timers ---------- */
// timer: plain activity timer (starts at 5:00). seated: "Seated and silent by" (starts at 2:00);
// when it runs out the board starts listening straight away, like a countdown with no count.
const TIMERS = { timer: { label: 'Timer', start: 180 }, seated: { label: 'Seated and silent by', start: 120 } };

function setTimer(k, kind, cls, seconds) {
  check_(k);
  if (!TIMERS[kind]) throw new Error('Unknown timer');
  const secs = Math.max(30, Math.min(3600, Number(seconds) || TIMERS[kind].start));
  unpause_();
  PropertiesService.getScriptProperties().setProperty('TIMER',
    JSON.stringify({ kind: kind, cls: cls, end: Date.now() + secs * 1000, total: secs * 1000 }));
  return modeState_();
}
/** delta in seconds, e.g. 30 or -30. Never goes below zero. */
function adjustTimer(k, delta) {
  check_(k);
  const props = PropertiesService.getScriptProperties();
  const t = JSON.parse(props.getProperty('TIMER') || 'null');
  if (t && t.paused) {               // paused: change the frozen time left
    t.left = Math.max(0, (t.left || 0) + Number(delta) * 1000); t.total = Math.max(t.left, 1000); t.fired = false;
    props.setProperty('TIMER', JSON.stringify(t));
  } else if (t) {
    const now = Date.now();
    const left = Math.max(0, Math.max(0, t.end - now) + Number(delta) * 1000);
    t.end = now + left; t.total = Math.max(left, 1000); t.fired = false;
    props.setProperty('TIMER', JSON.stringify(t));
  }
  return modeState_();
}
function stopTimer(k) {
  check_(k);
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('TIMER');
  // a paused timer stopped with X: no silence left to pause, so the board must not stay on "Paused"
  if (JSON.parse(props.getProperty('MODE') || '{"mode":"teaching"}').mode === 'teaching') props.deleteProperty('PAUSE');
  return modeState_();
}
function timerState_() {
  const props = PropertiesService.getScriptProperties();
  const t = JSON.parse(props.getProperty('TIMER') || 'null');
  if (!t) return null;
  const now = Date.now();
  if (t.paused) return { kind: t.kind, label: TIMERS[t.kind].label, end: now + (t.left || 0), total: t.total, paused: true, left: t.left || 0, work: !!t.work };
  if (now >= t.end) {
    if (t.kind === 'seated' && !t.fired) {
      t.fired = true;
      props.setProperty('TIMER', JSON.stringify(t));
      startSilence_('countdown', t.cls, 0);
    }
    if (now - t.end > 6000) { props.deleteProperty('TIMER'); return null; }
  }
  return { kind: t.kind, label: TIMERS[t.kind].label, end: t.end, total: t.total, work: !!t.work };
}

/* ---------- pause (Patryk 2026-10-08) ----------
   Pause from the phone (or P on the board): the board stops listening and scoring at once, and the
   timer freezes. Resume carries on exactly where it stopped: the silence's clock and the timer move
   on by the paused time, so the pause neither counts as noise nor eats the timer. */
function setPause(k, on) {
  check_(k);
  const props = PropertiesService.getScriptProperties(), now = Date.now();
  const p = JSON.parse(props.getProperty('PAUSE') || 'null');
  const t = JSON.parse(props.getProperty('TIMER') || 'null');
  if (on && !p) {
    props.setProperty('PAUSE', JSON.stringify({ at: now }));
    if (t && !t.paused) { t.left = Math.max(0, t.end - now); t.paused = true; props.setProperty('TIMER', JSON.stringify(t)); }
  } else if (!on && p) resume_(props, now - p.at);
  return modeState_();
}
function resume_(props, gap) {
  const now = Date.now();
  props.deleteProperty('PAUSE');
  const t = JSON.parse(props.getProperty('TIMER') || 'null');
  if (t && t.paused) { t.end = now + (t.left || 0); delete t.paused; delete t.left; props.setProperty('TIMER', JSON.stringify(t)); }
  const m = JSON.parse(props.getProperty('MODE') || '{"mode":"teaching"}');
  if (m.mode !== 'teaching' && gap > 0) { m.start += gap; props.setProperty('MODE', JSON.stringify(m)); }
}
function unpause_() {
  const props = PropertiesService.getScriptProperties();
  const p = JSON.parse(props.getProperty('PAUSE') || 'null');
  if (p) resume_(props, Date.now() - p.at);
}

/** End the current silence. cancel = true throws the timing away. */
function endMode(k, cancel) {
  check_(k);
  unpause_();   // ending (or starting) a silence always clears a pause
  const props = PropertiesService.getScriptProperties();
  const m = JSON.parse(props.getProperty('MODE') || '{"mode":"teaching"}');
  if (m.mode !== 'teaching') {
    if (cancel) CacheService.getScriptCache().put('cancel_' + m.sid, '1', 21600);
    // Cancel on silent work also stops the timer it started (Patryk 2026-10-12: "the X does nothing",
    // the timer carried on after Cancel)
    const t = JSON.parse(props.getProperty('TIMER') || 'null');
    if (cancel && m.mode === 'work' && t && t.work) props.deleteProperty('TIMER');
    props.setProperty('MODE', JSON.stringify({ mode: 'teaching', lastSid: m.sid, cancelled: !!cancel }));
  }
  return modeState_();
}

function modeState_() {
  const timer = timerState_();   // first: a finished Seated-by timer starts a silence
  const props = PropertiesService.getScriptProperties();
  let m = JSON.parse(props.getProperty('MODE') || '{"mode":"teaching"}');
  const pause = JSON.parse(props.getProperty('PAUSE') || 'null');
  if (m.mode !== 'teaching' && !pause) {   // a paused silence never runs out
    const max = (MODES[m.mode] ? MODES[m.mode].max : 1200) + (m.countdown || 0) + (m.grace || 0);
    if (Date.now() - m.start > max * 1000) {
      m = { mode: 'teaching', lastSid: m.sid };
      props.setProperty('MODE', JSON.stringify(m));
    }
  }
  const cache = CacheService.getScriptCache();
  m.live = m.sid ? (cache.get('live_' + m.sid) || 'quiet') : 'quiet';
  if (m.lastSid) {
    const r = cache.get('res_' + m.lastSid);
    if (r) m.lastResult = JSON.parse(r);
  }
  if (m.mode !== 'teaching') m.label = m.title || MODES[m.mode].label;
  m.timer = timer;
  const lost = JSON.parse(props.getProperty('LOST') || 'null');
  m.lost = lost && Date.now() - lost.start < LOST_MAX * 1000 ? lost : null;
  m.paused = !!pause; m.pausedAt = pause ? pause.at : null;
  m.board = Number(CacheService.getScriptCache().get('boardSeen')) || 0;   // when the board page last checked in (for the phone's dot)
  m.now = Date.now();
  return m;
}

function recordResult_(p) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get('sess_' + p.sid);
  if (!raw) return { ok: false, reason: 'unknown' };
  cache.remove('sess_' + p.sid);
  if (cache.get('cancel_' + p.sid)) return { ok: true, cancelled: true };
  const sess = JSON.parse(raw);
  const mon = Math.round(Number(p.mon) || 0), red = Math.round(Number(p.red) || 0);
  const settle = p.settle !== undefined && p.settle !== '' ? Math.round(Number(p.settle)) : '';
  withLock_(() => {
    if (mon > 0) bSheet_('Sessions').appendRow([new Date(sess.start), sess.cls, MODES[sess.mode].label, mon, red, settle]);
    if (p.end === '1') {
      const props = PropertiesService.getScriptProperties();
      const m = JSON.parse(props.getProperty('MODE') || '{}');
      if (m.sid === p.sid) props.setProperty('MODE', JSON.stringify({ mode: 'teaching', lastSid: p.sid }));
    }
  });
  cache.put('res_' + p.sid, JSON.stringify({ mode: sess.mode, mon: mon, red: red, settle: settle }), 3600);
  return { ok: true };
}

/* ================= phone: Friday review ================= */

function getFriday(k) {
  check_(k);
  const s = settings_();
  const std = Number(s.STANDARD) || 90, step = Number(s.STEP) || 3, gap = Number(s.EMAIL_GAP_DAYS) || 21;
  const now = new Date();
  const studs = students_(), log = readLog_(), sessions = readSessions_(), emails = readEmails_(), lostRows = readLost_();
  return classOrder_().map(cls => {
    const cur = periodKey_(cls, now);
    const per = {};
    sessions.forEach(x => {
      if (x.cls !== cls) return;
      const pk = periodKey_(cls, x.start);
      per[pk] = per[pk] || { mon: 0, red: 0 };
      per[pk].mon += x.mon; per[pk].red += x.red;
    });
    const pct = pk => 100 * (1 - per[pk].red / per[pk].mon);
    const earlier = Object.keys(per).map(Number).filter(pk => pk < cur && per[pk].mon > 0).sort((a, b) => a - b);
    // goal (2026-10-24): 80% of silent time quiet AND no more than LOST_GOAL_SECS lost to talking this
    // week (twice that for a fortnightly class). No silences recorded counts as meeting the silent part.
    const fort = FORTNIGHTLY.indexOf(cls) !== -1, lostMax = (Number(s.LOST_GOAL_SECS) || 180) * (fort ? 2 : 1);
    const lostNow = lostRows.filter(x => sameClass_(x.cls, cls) && periodKey_(cls, x.at) === cur).reduce((n, x) => n + x.secs, 0);
    let goal = { status: 'nodata', target: 80 };
    if (per[cur] && per[cur].mon > 0) {
      const now_ = Math.round(pct(cur));
      goal = { status: now_ >= 80 ? 'hit' : 'missed', pct: now_, target: 80 };
    }
    goal.lost = lostNow; goal.lostMax = lostMax;
    if (lostNow > lostMax) goal.status = 'missed';
    const last = {};
    emails.forEach(e => { if (e.cls === cls && (!last[e.name] || e.date > last[e.name])) last[e.name] = e.date; });
    const pos = {};
    log.forEach(r => { if (r.cls === cls && r.type === '+' && periodKey_(cls, r.ts) === cur) pos[r.name] = (pos[r.name] || 0) + 1; });
    const students = studs.filter(x => x.cls === cls).map(x => {
      const le = last[x.name];
      const days = le ? Math.floor((now - le) / 86400000) : null;
      return { name: x.name, pos: pos[x.name] || 0, emailed: le ? Utilities.formatDate(le, TZ, 'd MMM') : '', recent: days !== null && days < gap };
    });
    return { cls: cls, fortnight: FORTNIGHTLY.indexOf(cls) !== -1, goal: goal, students: students, signOff: String(s.SIGN_OFF || '') };
  });
}

function markEmailed(k, picks) {
  check_(k);
  if (!picks || !picks.length) return 0;
  const now = new Date();
  withLock_(() => {
    const sh = bSheet_('Emails');
    sh.getRange(sh.getLastRow() + 1, 1, picks.length, 3).setValues(picks.map(p => [now, p.cls, p.name]));
  });
  return picks.length;
}

/* ================= board ================= */

function boardData_(n) {
  n = 6;
  const cached = CacheService.getScriptCache().get('board');
  let data;
  if (cached) data = JSON.parse(cached);
  else {
    const cls = PropertiesService.getScriptProperties().getProperty('BOARD_CLASS') || '';
    data = refreshBoard_(cls, cls ? today_(cls) : []);
  }
  const m = modeState_();
  delete m.lastResult;
  const rc = CacheService.getScriptCache().get('recap');
  let recap = rc ? JSON.parse(rc) : null;
  if (recap && Date.now() > recap.end) recap = null;
  return { cls: data.cls, names: data.names.slice(0, n), mode: m, now: Date.now(), version: B_VERSION, recap: recap };
}

function refreshBoard_(cls, events) {
  const shorts = {};
  students_().forEach(s => { if (s.cls === cls) shorts[s.name] = s.short; });
  const names = [];
  for (let i = events.length - 1; i >= 0 && names.length < 6; i--) {
    const d = shorts[events[i].name] || shortName_(events[i].name);
    if (events[i].type === '+' && names.indexOf(d) === -1) names.push(d);
  }
  const data = { cls: cls, names: names };
  CacheService.getScriptCache().put('board', JSON.stringify(data), 21600);
  return data;
}

/* ================= helpers ================= */

function today_(cls) {
  const t = dayStr_(new Date());
  return readLog_().filter(r => r.cls === cls && dayStr_(r.ts) === t).map(r => ({
    id: r.ts.getTime(), t: Utilities.formatDate(r.ts, TZ, 'HH:mm'), name: r.name, type: r.type, rule: r.rule
  }));
}

function readLog_() {
  const sh = bSheet_('Log'), last = sh.getLastRow();
  if (last < 2) return [];
  const n = Math.min(last - 1, LOG_TAIL);
  return sh.getRange(last - n + 1, 1, n, 5).getValues().filter(r => r[0] instanceof Date)
    .map(r => ({ ts: r[0], cls: String(r[1]), name: String(r[2]), type: WORD_TYPE[String(r[3]).trim()] || '?', rule: Number(r[4]) || 0 }));
}

function readSessions_() {
  const sh = bSheet_('Sessions'), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 5).getValues().filter(r => r[0] instanceof Date)
    .map(r => ({ start: r[0], cls: String(r[1]), mon: Number(r[3]) || 0, red: Number(r[4]) || 0 }));
}

function readEmails_() {
  const sh = bSheet_('Emails'), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 3).getValues().filter(r => r[0] instanceof Date)
    .map(r => ({ date: r[0], cls: String(r[1]), name: String(r[2]) }));
}

function students_() {
  const sh = bSheet_('Students'), last = sh.getLastRow();
  if (last < 2) return [];
  const nc = Math.min(7, sh.getLastColumn());
  const pos = v => (v === '' || v === null || !(Number(v) > 0.5)) ? null : Number(v);
  return sh.getRange(2, 1, last - 1, nc).getValues().filter(r => r[0] !== '' && r[1] !== '')
    .map(r => ({
      cls: String(r[0]).trim(), name: String(r[1]).trim(),
      short: String(r[2] || '').trim() || shortName_(r[1]),
      x: pos(r[3]), y: pos(r[4]),
      ratio: Number(r[5]) || 0,
      support: String(r[6] || '').trim().toLowerCase()   // 'prompt' (blue border) or 'extend' (purple border)
    }));
}

function classOrder_() {
  const seen = [];
  students_().forEach(s => { if (seen.indexOf(s.cls) === -1) seen.push(s.cls); });
  const year = c => { const m = c.match(/\d+/); return m ? Number(m[0]) : 99; };
  return seen.sort((a, b) => year(a) - year(b) || a.localeCompare(b));
}

function settings_() {
  const out = Object.assign({}, DEFAULTS);
  const sh = bSheet_('Settings');
  if (sh && sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues()
    .forEach(r => { if (r[0] !== '') out[String(r[0]).trim()] = r[1]; });
  return out;
}

function shortName_(n) {
  const p = String(n).trim().split(/\s+/);
  return p.length > 1 ? p[0] + ' ' + p[p.length - 1][0] + '.' : p[0];
}

function periodKey_(cls, d) {
  const w = weekIndex_(d);
  return FORTNIGHTLY.indexOf(cls) !== -1 ? Math.floor(w / 2) : w;
}
function dayStr_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function dayNum_(s) { const p = s.split('-').map(Number); return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000); }
// Teaching weeks since the first Week A. Holiday weeks don't count, so the A/B sequence
// carries on after a break (w/c 19 Oct = A, w/c 2 Nov = B). Same rule as the planner's logic.js weekLetter,
// and the same dates: both read terms and weekAStart from planner-data.json (1.6). When the data file for the
// next school year is imported (new weekAStart, new terms), both apps roll over together.
function cal_() {
  const cal = plannerCal_();
  if (!cal || !cal.weekAStart || !cal.terms.length) throw new Error('The planner has no term dates yet: open the planner and import planner-data.json, then try again.');
  return cal;
}
function teachingWeek_(mon) { return cal_().terms.some(t => mon + 4 >= dayNum_(t[0]) && mon <= dayNum_(t[1])); }
function weekIndex_(d) {
  const start = dayNum_(cal_().weekAStart), day = dayNum_(dayStr_(d));
  const mon = day - (weekday_(d) - 1);
  let n = 0;
  if (mon >= start) { for (let w = start; w < mon; w += 7) if (teachingWeek_(w)) n++; }
  else { for (let w = mon; w < start; w += 7) if (teachingWeek_(w)) n--; }
  return n;
}
function weekLetter_(d) { return (((weekIndex_(d) % 2) + 2) % 2) === 0 ? 'A' : 'B'; }
function weekday_(d) { return Number(Utilities.formatDate(d, TZ, 'u')); }

// The planner's spreadsheet. The planner already has a "Log" tab (folders it made), so behaviour's
// Log and Settings tabs are called "Behaviour Log" and "Behaviour Settings" there.
const B_TAB = { Log: 'Behaviour Log', Settings: 'Behaviour Settings' };
function bSheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(B_TAB[name] || name); }
// The behaviour app's own lock (1.3, 2026-10-29): the homework Form build in Code.gs holds the SCRIPT lock for up to a
// minute, so taps take the DOCUMENT lock (this spreadsheet) instead and never queue behind a Form build.
function withLock_(fn) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}
// A tap sent twice (the phone retries when a reply is lost) is written once (1.3, 2026-10-29): the tap's id is
// remembered for six hours, and the latest rows are checked for the same moment, class, pupil and type.
function seenTap_(tapId, when, cls, names, type) {
  if (tapId && CacheService.getScriptCache().get('tap:' + tapId)) return true;
  const sh = bSheet_('Log'), last = sh.getLastRow();
  if (last < 2) return false;
  const n = Math.min(last - 1, 300), t = when.getTime(), word = TYPE_WORD[type];
  return sh.getRange(last - n + 1, 1, n, 4).getValues().some(r => r[0] instanceof Date && r[0].getTime() >= t && r[0].getTime() < t + names.length && r[1] === cls && names.indexOf(r[2]) !== -1 && r[3] === word);
}
function rememberTap_(tapId) { if (tapId) CacheService.getScriptCache().put('tap:' + tapId, '1', 21600); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
/** Board.html loads these endpoints via a <script> tag (JSONP), not fetch, so a browser's cross-origin
 * rules never come into it. callback must be a plain identifier; anything else falls back to plain JSON. */
function respond_(obj, callback) {
  if (callback && /^[A-Za-z0-9_]+$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(obj) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(obj);
}
// check_(): the planner's, in Code.gs (one key, PLANNER_KEY)
// Class names differ a little between the planner and the Students tab ("7MLA" / "7ML").
function sameClass_(a, b) {
  const A = String(a).toUpperCase().replace(/[^A-Z0-9]/g, ''), B = String(b).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!A || !B) return false;
  if (A === B) return true;
  const short = A.length < B.length ? A : B, long = A.length < B.length ? B : A;
  return short.length >= 3 && long.indexOf(short) === 0;
}

/* ---------------------------------------------------------------- ABCD card votes
   specs/learning-loop.md M3/M4 and Patryk's feedback (2026-10-22): during a lesson's multiple choice
   questions the phone shows A/B/C/D in the room's corners in place of the seating plan. One vote per
   question = the rough split of the cards he sees ({ A: 70, C: 30 }). Saved to the "MCQ Votes" tab with
   % right and the main wrong answer (and the misconception that wrong option catches). Class level only:
   no pupil names. */
const VOTE_HEAD = ['id', 'when', 'class', 'lesson', 'title', 'q', 'question', 'right', 'split', 'pctRight', 'mainWrong', 'misconception'];
// Today's lesson for a class (the saved planner week), with its questions in lesson order.
// { key, title, mcq: [{ q, o, a, why }] } or { none: why }
function lessonMcqs(k, cls) {
  check_(k);
  const today = new Date(), day = (Number(Utilities.formatDate(today, TZ, 'u')) + 6) % 7;
  const mon = Utilities.formatDate(new Date(today.getTime() - day * 864e5), TZ, 'yyyy-MM-dd');
  const w = sheet_('Weeks');
  let week = null;
  if (w && w.getLastRow() > 1) w.getRange(2, 1, w.getLastRow() - 1, 2).getValues().forEach(([m, json]) => {
    const key = m instanceof Date ? Utilities.formatDate(m, TZ, 'yyyy-MM-dd') : String(m);
    if (key === mon) { try { week = JSON.parse(json); } catch (e) { /* damaged row */ } }
  });
  if (!week) return { none: 'This week is not saved in the planner yet: open the planner once, then refresh.' };
  const mine = (week.slots || []).filter((s) => sameClass_(s.cls, cls) && s.kind === 'lesson' && !s.double && s.key);
  // today's lesson, else the most recent one this week
  const slot = mine.filter((s) => s.day === day)[0] || mine.filter((s) => s.day < day).sort((a, b) => b.day - a.day)[0];
  if (!slot) return { none: 'No ' + cls + ' lesson in the planner today.' };
  const d = sheet_('Data');
  const data = JSON.parse(d.getRange(2, 1, d.getLastRow() - 1, 1).getValues().map((r) => r[0]).join(''));
  const seq = ((data.classes || {})[slot.cls] || {}).seq || [];
  const L = seq.find((x) => (x.rel || x.unit + '|' + x.title) === slot.key) || {};
  return { key: slot.key, title: L.title || slot.text || 'Lesson', today: slot.day === day, mcq: L.mcq || [] };
}
// v = { id?, cls, key, title, q (0-based), question, right ('A'..'D' or ''), split: { A: 70, C: 30 }, why: {B: '...'} }
// Same id again = his adjustment of that vote (the row is updated, not added).
function saveVote(k, v) {
  check_(k);
  const split = {};
  ['A', 'B', 'C', 'D'].forEach((L) => { const n = Number((v.split || {})[L]) || 0; if (n > 0) split[L] = Math.min(100, Math.round(n)); });
  if (!Object.keys(split).length) throw new Error('No letters in that vote.');
  const right = /^[A-D]$/.test(String(v.right)) ? String(v.right) : '';
  const wrong = Object.keys(split).filter((L) => L !== right).sort((a, b) => split[b] - split[a])[0] || '';
  const row = [v.id || String(Date.now()), new Date(), String(v.cls), String(v.key || ''), String(v.title || ''), (Number(v.q) || 0) + 1, String(v.question || '').slice(0, 300),
    right, JSON.stringify(split), right ? (split[right] || 0) : '', wrong, wrong && v.why ? String(v.why[wrong] || '') : ''];
  const sh = tab_('MCQ Votes', VOTE_HEAD);
  const n = sh.getLastRow() - 1;
  if (v.id && n > 0) {
    const ids = sh.getRange(2, 1, n, 1).getValues().map((r) => String(r[0]));
    const at = ids.lastIndexOf(String(v.id));
    if (at >= 0) { sh.getRange(at + 2, 1, 1, VOTE_HEAD.length).setValues([row]); return { id: row[0], pctRight: row[9], mainWrong: wrong }; }
  }
  sh.appendRow(row);
  return { id: row[0], pctRight: row[9], mainWrong: wrong };
}
function removeVote(k, id) {
  check_(k);
  const sh = tab_('MCQ Votes', VOTE_HEAD), n = sh.getLastRow() - 1;
  if (n < 1) return false;
  const ids = sh.getRange(2, 1, n, 1).getValues().map((r) => String(r[0]));
  const at = ids.lastIndexOf(String(id));
  if (at < 0) return false;
  sh.deleteRow(at + 2);
  return true;
}
