// Server tests: runs Code.gs against a small in-memory mock of Apps Script and Sheets.
// Run: node tests/server.test.js
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path');
// the mock Students tab needs the Support column
m.sheets.Students._data[0].push('Support');
m.sheets.Students._data.forEach((r, i) => { if (i) r.push(i === 1 ? 'prompt' : ''); });
// the planner's calendar (1.6): the behaviour app reads term dates and the first Week A from the planner's Data tab
const CAL = { weekAStart: '2026-09-07', terms: [['2026-09-07', '2026-10-21'], ['2026-11-02', '2026-12-18'], ['2027-01-05', '2027-02-12'], ['2027-02-22', '2027-03-25'], ['2027-04-12', '2027-05-28'], ['2027-06-07', '2027-07-28']], inset: ['2026-10-22', '2026-10-23', '2026-11-25', '2027-01-04'] };
m.sheets.Data = m.makeSheet('Data', [['chunk'], [JSON.stringify(Object.assign({ classes: {}, timetable: { A: [], B: [] } }, CAL))]]);
// one project since 2026-10-12: the planner's Code.gs and Behaviour.gs load together (a clash would break this)
const SRC = process.env.PLANNER_SRC || path.join(__dirname, '..');   // PLANNER_SRC: the bundle test points this at the comment-stripped copies
eval(fs.readFileSync(path.join(SRC, 'Code.gs'), 'utf8') + '\n' + fs.readFileSync(path.join(SRC, 'Behaviour.gs'), 'utf8') +
  '\nglobal.api={init,openClass,logEvent,logMany,removeMany,getBoard,setMode,endMode,getMode,setTimer,adjustTimer,stopTimer,submitResult,getSilence,getFriday,positivesOver,setSupport,setPause,mergeBehaviourData,behaviourWeek,sameClass_,lessonMcqs,orderSheetDraft,memoryUpdate_,readMemory_,saveVote,removeVote,setLost,loadAll_,saveWeek,saveWeeks,saveLessons,saveLessonChanges,weekLetter_,plannerCal_};');
const k = 'k', out = []; let failed = 0;
const ok = (n, c) => { out.push((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };

let oc = api.openClass(k, '7BYA');
ok('Support column is read', oc.students[0].support === 'prompt');
ok('no silence data yet', oc.silence === null);
ok('init has a numeric server version', typeof api.init(k).version === 'number');

let ev = api.logEvent(k, '7BYA', 'Test Pupil One', '+', 0);
ok('positive saved', ev.some(e => e.type === '+'));
ok('Log stores the word, not a symbol (Sheets turns +/- into #ERROR!)', m.sheets['Behaviour Log']._data[1][3] === 'Positive');
ev = api.logEvent(k, '7BYA', 'Test Pupil Two', 'R', 4); ok('report to me keeps its rule', ev.some(e => e.type === 'R' && e.rule === 4));
ev = api.logMany(k, '7BYA', ['Test Pupil One', 'Test Pupil Two'], '-', 0); ok('logMany saves a group', ev.filter(e => e.type === '-').length === 2);
const ids = ev.filter(e => e.type === '-').map(e => e.id);
ev = api.removeMany(k, '7BYA', ids); ok('undo removes them', ev.filter(e => e.type === '-').length === 0);
api.logEvent(k, '7BYA', 'Test Pupil One', '-', 0); ev = api.logEvent(k, '7BYA', 'Test Pupil One', '-', 4);
ok('detention reason saved on a negative', ev[ev.length - 1].rule === 4);
const past = Date.now() - 120000;   // 2 minutes ago (an hour ago is yesterday just after midnight)
ev = api.logEvent(k, '7BYA', 'Test Pupil Two', '+', 0, past);
ok('offline tap keeps the time it was tapped', ev.some(e => e.name === 'Test Pupil Two' && e.type === '+' && Math.abs(e.id - past) < 5));
ok('board shows today\'s positives', api.getBoard(k, 6).names.length >= 1);
ok('board check-in is recorded for the phone dot', Date.now() - api.getMode(k).board < 2000);

let md = api.setMode(k, 'countdown', '7BYA');
ok('countdown: 3 s count, listens straight after', md.countdown === 3 && md.grace === 0);
ok('countdown result recorded', api.submitResult(k, md.sid, '20', '2', '4', true).ok === true);
ok('countdown ended itself', api.getMode(k).mode === 'teaching');
md = api.setMode(k, 'entry', '7BYA'); ok('entry: 2 s statement', md.grace === 2); api.endMode(k, true);
// silent time is summed over every recorded silence for a class that day (countdowns and entries too), so these checks use a fresh class
md = api.setMode(k, 'work', '7ML', 120); ok('silent work: 3 s statement, and it creates a timer', md.grace === 3 && Math.round((md.timer.end - Date.now()) / 1000) === 120);
api.submitResult(k, md.sid, '100', '14', '', false);
ok('silent time % is 86', api.getSilence(k, '7ML').pct === 86);
api.stopTimer(k);

let t = api.setTimer(k, 'timer', '7BYA', 90); ok('timer 1:30', Math.round((t.timer.end - Date.now()) / 1000) === 90);
t = api.adjustTimer(k, 30); t = api.adjustTimer(k, 30); ok('two +30 s taps', Math.round((t.timer.end - Date.now()) / 1000) === 150);
t = api.adjustTimer(k, -60); ok('-60 s', Math.round((t.timer.end - Date.now()) / 1000) === 90);
t = api.stopTimer(k); ok('stop timer', t.timer === null);
t = api.setTimer(k, 'timer', '7BYA', 60);
md = api.setMode(k, 'work', '7ML', 120); ok('silent work keeps a timer that is already running', Math.round((md.timer.end - Date.now()) / 1000) === 60);
api.endMode(k, true); ok('cancel is flagged', api.getMode(k).cancelled === true);
ok('cancel keeps a Timer-only timer running', api.getMode(k).timer !== null);
api.stopTimer(k);
md = api.setMode(k, 'work', '7ML', 120); api.endMode(k, true);
ok('cancel on silent work stops the timer it started', api.getMode(k).timer === null);
api.setTimer(k, 'timer', '7BYA', 60); api.setPause(k, true); t = api.stopTimer(k);
ok('X on a paused timer clears the pause too', t.timer === null && !t.paused);
ok('a cancelled silence is not recorded', api.submitResult(k, md.sid, '50', '50', '', false).cancelled === true && api.getSilence(k, '7ML').pct === 86);

// pause (2026-10-08): the timer freezes, the silence's clock moves on by the paused time, anything new unpauses
api.setTimer(k, 'timer', '7BYA', 120);
md = api.setMode(k, 'work', '7ML', 120);
let pz = api.setPause(k, true);
ok('pause: flagged, and the timer shows as frozen', pz.paused === true && pz.timer.paused === true && Math.round(pz.timer.left / 1000) === 120);
const startBefore = JSON.parse(m.props.MODE).start;
m.props.PAUSE = JSON.stringify({ at: Date.now() - 30000 });            // as if paused 30 s ago
pz = api.adjustTimer(k, 30); ok('+30 s while paused adds to the frozen time', Math.round(pz.timer.left / 1000) === 150);
pz = api.setPause(k, false);
ok('resume: timer carries on from where it froze', !pz.paused && Math.round((pz.timer.end - Date.now()) / 1000) === 150);
ok('resume: the silence clock moved on by the pause (30 s)', Math.round((JSON.parse(m.props.MODE).start - startBefore) / 1000) === 30);
api.setPause(k, true); md = api.endMode(k, true);
ok('ending a silence clears a pause', md.paused === false && !m.props.PAUSE);
api.stopTimer(k);

ok('Friday goal is a fixed 80% and this class hit it', api.getFriday(k).find(c => c.cls === '7BYA').goal.status === 'hit');
ok('2.8: each Friday class carries the sign-off for messages home (empty until SIGN_OFF is set)', api.getFriday(k).every(c => typeof c.signOff === 'string'));
// time lost (2026-10-24): one tap counts up, a second tap saves the seconds; the Friday goal includes it
md = api.setLost(k, '7BYA', true); ok('Talking: the count starts and the phone and board see it', md.lost && md.lost.cls === '7BYA');
md = api.setLost(k, '7BYA', true); ok('a second start does not restart the count', md.lost.start === JSON.parse(m.props.LOST).start);
m.props.LOST = JSON.stringify({ cls: '7BYA', start: Date.now() - 40000 });
md = api.setLost(k, '7BYA', false); ok('stopping saves the seconds lost', !md.lost && m.sheets['Time Lost']._data.slice(-1)[0][2] === 40);
let fg = api.getFriday(k).find(c => c.cls === '7BYA').goal;
ok('the Friday goal shows time lost against the weekly allowance (3 min)', fg.lost === 40 && fg.lostMax === 180 && fg.status === 'hit');
m.props.LOST = JSON.stringify({ cls: '7BYA', start: Date.now() - 200000 }); api.setLost(k, '7BYA', false);
ok('more than 3 minutes lost in the week misses the goal', api.getFriday(k).find(c => c.cls === '7BYA').goal.status === 'missed');
m.props.LOST = JSON.stringify({ cls: '7BYA', start: Date.now() - 2000000 });
ok('a count left running over 30 minutes is dropped', !api.getMode(k).lost);
ok('positivesOver counts', api.positivesOver(k, '7BYA', 5).length >= 1);
ok('setSupport writes the Support column', api.setSupport(k, '7BYA', 'Test Pupil Two', 'extend') === 'extend' && m.sheets.Students._data[2][6] === 'extend');
// one app (2026-10-12)
ok('class names match across the apps (7MLA = 7ML), but not 7MLA = 7XP', api.sameClass_('7MLA', '7ML') && !api.sameClass_('7MLA', '7XP') && !api.sameClass_('7', '7ML'));
const wdNow = Number(Utilities.formatDate(new Date(), 'Europe/London', 'u'));
m.sheets.Data = m.makeSheet('Data', [['chunk'], [JSON.stringify(Object.assign({ timetable: { A: [{ day: wdNow - 1, period: 3, cls: '7BYA' }], B: [{ day: wdNow - 1, period: 3, cls: '7BYA' }] } }, CAL))]]);
delete m.cache.ptt;
ok("today's classes come from the planner's timetable", wdNow > 5 || JSON.stringify(api.init(k).today) === '["7BYA"]');
const wk = api.behaviourWeek(k, Utilities.formatDate(new Date(Date.now() - (wdNow - 1) * 864e5), 'Europe/London', 'yyyy-MM-dd'));
ok('behaviourWeek gives this week\'s entries with class and time', wk.length >= 3 && wk.every((x) => /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(x.t) && x.cls && x.type));
m.props.OLD_BEHAVIOUR_SHEET_ID = 'old';
const t0 = new Date(Date.now() - 864e5);
m.old.Students = m.makeSheet('Students', [['Class', 'Name', 'Short', 'X', 'Y', 'Ratio'], ['8XP', 'Ada Lovelace', 'Ada L.', 10, 10, 2.6]]);
m.old.Log = m.makeSheet('Log', [['Timestamp', 'Class', 'Name', 'Type', 'Rule', 'Rule name'], [t0, '8XP', 'Ada Lovelace', 'Positive', '', '']]);
m.old.Sessions = m.makeSheet('Sessions', [['Start']]); m.old.Emails = m.makeSheet('Emails', [['Date']]); m.old.Settings = m.makeSheet('Settings', [['Setting', 'Value'], ['STANDARD', 80]]);
const logBefore = m.sheets['Behaviour Log']._data.length;
api.mergeBehaviourData();
ok('merge: students replaced, settings copied', m.sheets.Students._data.length === 2 && m.sheets['Behaviour Settings']._data[1][1] === 80);
ok('merge: older log rows are not added twice', m.sheets['Behaviour Log']._data.length === logBefore);
m.old.Log._data.push([new Date(Date.now() + 1000), '8XP', 'Ada Lovelace', 'Positive', '', '']);
api.mergeBehaviourData();
ok('merge again: only the newer row is added', m.sheets['Behaviour Log']._data.length === logBefore + 1);
ok('merge is noted in the planner Log tab, not the behaviour log', m.sheets.Log && /merged behaviour/.test(m.sheets.Log._data.slice(-1)[0][1]));

// ABCD card votes (2026-10-23)
{
  const day = (Number(Utilities.formatDate(new Date(), 'Europe/London', 'u')) + 6) % 7;
  const mon = Utilities.formatDate(new Date(Date.now() - day * 864e5), 'Europe/London', 'yyyy-MM-dd');
  const mcq = [{ q: 'Which cell has a tail?', o: ['Egg', 'Sperm', 'Nerve', 'Ciliated'], a: 'B', why: { A: 'thinks the egg swims' } }];
  m.sheets.Data = m.makeSheet('Data', [['json'], [JSON.stringify(Object.assign({ classes: { '7MLA': { seq: [{ unit: 'B1', title: 'Cells', rel: 'Y7/B1/L3' }, { unit: 'B1', title: 'Specialised Cells', rel: 'Y7/B1/L4', mcq }] } }, timetable: {} }, CAL))]]); delete m.cache.ptt;
  ok('ABCD: no saved week gives a plain message', /not saved/.test(api.lessonMcqs(k, '7MLA').none || ''));
  m.sheets.Weeks = m.makeSheet('Weeks', [['monday', 'json'], [mon, JSON.stringify({ monday: mon, slots: [{ cls: '7MLA', day, period: 2, kind: 'lesson', key: 'Y7/B1/L4' }] })]]);
  const lm = api.lessonMcqs(k, '7ML');
  ok('ABCD: today\'s lesson and its questions come from the saved week (7ML = 7MLA)', lm.title === 'Specialised Cells' && lm.mcq.length === 1 && lm.mcq[0].a === 'B' && lm.today);
  const v = api.saveVote(k, { cls: '7MLA', key: lm.key, title: lm.title, q: 0, question: mcq[0].q, right: 'B', split: { A: 30, B: 70 }, why: mcq[0].why });
  const row = () => m.sheets['MCQ Votes']._data.slice(-1)[0];
  ok('ABCD: a vote is saved with % right, main wrong answer and its misconception', v.pctRight === 70 && row()[9] === 70 && row()[10] === 'A' && row()[11] === 'thinks the egg swims' && row()[5] === 1);
  const n = m.sheets['MCQ Votes']._data.length;
  api.saveVote(k, { id: v.id, cls: '7MLA', q: 0, right: 'B', split: { A: 20, B: 80 } });
  ok('ABCD: adjusting the split updates the same row', m.sheets['MCQ Votes']._data.length === n && row()[9] === 80);
  ok('ABCD: undo removes the vote', api.removeVote(k, v.id) === true && m.sheets['MCQ Votes']._data.length === n - 1);
  let bad = ''; try { api.saveVote(k, { cls: '7MLA', split: {} }); } catch (e) { bad = e.message; }
  ok('ABCD: an empty vote is refused', /No letters/.test(bad));
  // workplan 2.2 (2026-10-29): the planner gets the votes (class level) for its lesson cards
  api.saveVote(k, { cls: '7MLA', key: lm.key, title: lm.title, q: 0, question: mcq[0].q, right: 'B', split: { A: 40, B: 60 }, why: mcq[0].why });
  m.sheets.Equipment = m.sheets.Equipment || m.makeSheet('Equipment', [['key', 'eq', 'sets']]);
  const pv = (api.loadAll_(true).votes || []).filter((x) => x.cls === '7MLA');
  ok('2.4: the planner gets the homework list for its lesson cards (an array, no Classroom call)', Array.isArray(api.loadAll_(true).homework));
  ok('ABCD: the planner gets each vote with its lesson, date, % right, main wrong answer and misconception (no names)', pv.length === 1 && pv[0].key === lm.key && pv[0].pct === 60 && pv[0].wrong === 'A' && pv[0].q === 1 && /^\d{4}-\d\d-\d\d$/.test(pv[0].when) && pv[0].why === 'thinks the egg swims');
}

// 1.3 (2026-10-29): a tap sent twice (the phone retries after a lost reply) is written once, and taps take the document lock
{
  const log = m.sheets['Behaviour Log']._data, n0 = log.length, t = Date.now() - 5000;
  m.lockLog.length = 0;
  api.logEvent(k, '7BYA', 'Test Pupil One', '+', 0, t, 'tap-1');
  api.logEvent(k, '7BYA', 'Test Pupil One', '+', 0, t, 'tap-1');
  ok('a tap sent twice with the same id is written once', log.length === n0 + 1);
  delete m.cache['tap:tap-1'];
  api.logEvent(k, '7BYA', 'Test Pupil One', '+', 0, t);
  ok('...and the same moment, class, pupil and type from an older phone (no id) is still written once', log.length === n0 + 1);
  api.logEvent(k, '7BYA', 'Test Pupil One', '+', 0, t + 1, 'tap-2');
  ok('a real second tap a moment later is written', log.length === n0 + 2);
  api.logMany(k, '7BYA', ['Test Pupil One', 'Test Pupil Two'], '-', 2, t + 100, 'tap-3');
  api.logMany(k, '7BYA', ['Test Pupil One', 'Test Pupil Two'], '-', 2, t + 100, 'tap-3');
  ok('a multi-select tap sent twice is written once (two rows, not four)', log.length === n0 + 4);
  ok('taps take the document lock, never the script lock the homework Form build holds', m.lockLog.length >= 5 && m.lockLog.every((x) => x === 'document'));
}

// 1.5 (2026-10-29): two planner tabs open at once. Each save carries the stamp its page loaded; a save over a row saved
// since is refused ("This page is out of date. Reload"); ticks travel as changed records and merge by lesson.
{
  m.sheets.Equipment = m.makeSheet('Equipment', [['key', 'eq', 'sets']]);
  const rec = (key, done) => ({ cls: '7MLA', i: 0, key, done });
  const stale = (fn) => { try { fn(); return ''; } catch (e) { return e.message; } };
  // tab A and tab B both load with no ticks saved yet
  const A = api.loadAll_(true), B = api.loadAll_(true);
  ok('loadAll gives the lesson-tick stamp and a stamp per saved week', A.lessonsStamp === 0 && typeof A.weekStamps === 'object' && Object.keys(A.weeks).every((mon) => mon in A.weekStamps));
  // A ticks lesson L3; B (older view) ticks L4: both land, and B gets A's tick back
  const a1 = api.saveLessonChanges(k, [rec('Y7/B1/L3', true)], A.lessonsStamp);
  const b1 = api.saveLessonChanges(k, [rec('Y7/B1/L4', true)], B.lessonsStamp);
  ok('two tabs ticking different lessons both land (merged by lesson)', a1.records.length === 1 && b1.records.length === 2 && b1.records.some((r) => r.key === 'Y7/B1/L3' && r.done) && b1.records.some((r) => r.key === 'Y7/B1/L4'));
  ok('the saved-at column is a number stamp, and each save gets a later one than the last', typeof m.sheets.Lessons._data[1][2] === 'number' && b1.stamp > a1.stamp && a1.stamp > 0);
  // B still holds its OLD stamp and now unticks L3 (which A saved after B loaded): refused
  const why = stale(() => api.saveLessonChanges(k, [{ cls: '7MLA', key: 'Y7/B1/L3', removed: true }], B.lessonsStamp));
  ok('an old tab changing a tick saved since it loaded is refused: ' + why, /This page is out of date\. Reload/.test(why));
  ok('...and nothing was written', m.sheets.Lessons._data.length === 3 && JSON.parse(m.sheets.Lessons._data[1][1]).done === true);
  // after a reload (fresh stamp) the same change goes through, and the row goes
  const B2 = api.loadAll_(true);
  const b2 = api.saveLessonChanges(k, [{ cls: '7MLA', key: 'Y7/B1/L3', removed: true }], B2.lessonsStamp);
  ok('after a reload the change lands, and an emptied record is dropped', b2.records.length === 1 && b2.records[0].key === 'Y7/B1/L4' && m.sheets.Lessons.getLastRow() === 2);
  ok('an older page that sends no stamp is not checked (works as before)', api.saveLessonChanges(k, [rec('Y7/B1/L4', false)]).records[0].done === false);
  // weeks: A saves a week; B saves the same week with its old stamp: refused; with the fresh stamp: fine
  const mon = Object.keys(A.weeks)[0];
  const wkA = Object.assign({}, A.weeks[mon], { note: 'from A' }), wkB = Object.assign({}, B.weeks[mon], { note: 'from B' });
  const sa = api.saveWeek(k, wkA, A.weekStamps[mon]);
  ok('saveWeek returns the new stamp', sa.saved === mon && sa.stamp > 0);
  const whyW = stale(() => api.saveWeek(k, wkB, B.weekStamps[mon]));
  ok('an old tab saving a week saved since it loaded is refused: ' + whyW, /This page is out of date\. Reload/.test(whyW) && JSON.parse(m.sheets.Weeks._data[1][1]).note === 'from A');
  const whyN = stale(() => api.saveWeek(k, wkB, null));
  ok('a tab that never saw a saved copy of that week is refused too', /out of date/.test(whyN));
  const sb = api.saveWeek(k, wkB, sa.stamp);
  ok('with the fresh stamp the save lands, with a later stamp', JSON.parse(m.sheets.Weeks._data[1][1]).note === 'from B' && sb.stamp > sa.stamp);
  const oldRow = m.sheets.Weeks._data[1][2] = new Date(sb.stamp);   // a row saved by the OLD planner holds a date, not a number
  ok('an old date-stamped row still reads as the same stamp', api.loadAll_(true).weekStamps[mon] === sb.stamp && oldRow instanceof Date);
  const whyM = stale(() => api.saveWeeks(k, [wkA, { monday: '2027-01-04', slots: [] }], [sa.stamp, null]));
  ok('a batch of later weeks with one stale week is refused whole, naming the week: ' + whyM, /out of date/.test(whyM) && whyM.includes(mon) && m.sheets.Weeks._data.length === 2);
  const sm = api.saveWeeks(k, [wkA, { monday: '2027-01-04', slots: [] }], [sb.stamp, null]);
  ok('a batch with fresh stamps lands and returns a stamp per week', sm.saved === 2 && sm.stamps[mon] > 0 && sm.stamps['2027-01-04'] > 0 && m.sheets.Weeks._data.length === 3);
  ok('an older page saving weeks with no stamps is not checked', api.saveWeek(k, wkA).saved === mon);
  ok('saves take the document lock (the one taps use), never the script lock', m.lockLog.slice(-12).every((x) => x === 'document'));
}

// 1.6 (2026-10-29): term dates and Week A/B live in the planner's data only; the behaviour app's answer agrees with
// the planner's for every week of 2026-27, and both roll over together when next year's data file is imported.
{
  const P = require('../logic.js');
  const cal = CAL;
  const setData = (obj) => { m.sheets.Data = m.makeSheet('Data', [['chunk'], [JSON.stringify(obj)]]); delete m.cache.ptt; };
  setData(Object.assign({ classes: {}, timetable: { A: [], B: [] } }, cal));
  const got = api.plannerCal_();
  ok('the behaviour app reads terms, first Week A and INSET days from the planner data', got.weekAStart === '2026-09-07' && got.terms.length === 6 && got.inset.length === 4);
  const mons = []; for (let d = new Date(2026, 8, 7); d < new Date(2027, 7, 1); d = P.addDays(d, 7)) mons.push(d);
  const disagree = mons.filter((d) => api.weekLetter_(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10)) !== P.weekLetter(cal, d)).map((d) => P.iso(d));
  ok('Week A/B: the behaviour app and the planner agree for every week of 2026-27 (' + mons.length + ' weeks)' + (disagree.length ? ': differ on ' + disagree.join(', ') : ''), mons.length >= 47 && disagree.length === 0);
  ok('w/c 19 Oct is A and the first week back, w/c 2 Nov, is B (holiday weeks do not count)', api.weekLetter_(new Date(2026, 9, 19, 10)) === 'A' && api.weekLetter_(new Date(2026, 10, 2, 10)) === 'B');
  ok('the old table of classes is gone: with no timetable slots today there are no classes today', JSON.stringify(api.init(k).today) === '[]');
  // September 2027: next year's data file brings a new first Week A and new terms; both apps follow it
  const next = { weekAStart: '2027-09-06', terms: [['2027-09-06', '2027-10-22'], ['2027-11-01', '2027-12-17']], inset: [] };
  setData(Object.assign({ classes: {}, timetable: { A: [], B: [] } }, next));
  const sept = []; for (let d = new Date(2027, 8, 6); d < new Date(2027, 11, 20); d = P.addDays(d, 7)) sept.push(d);
  const off = sept.filter((d) => api.weekLetter_(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10)) !== P.weekLetter(next, d)).map((d) => P.iso(d));
  ok('September 2027 rollover: w/c 6 Sep 2027 is A again and every week to December agrees' + (off.length ? ' (differ: ' + off.join(', ') + ')' : ''), api.weekLetter_(new Date(2027, 8, 6, 10)) === 'A' && off.length === 0);
  setData({ classes: {}, timetable: { A: [], B: [] } });
  let why = ''; try { api.weekLetter_(new Date()); } catch (e) { why = e.message; }
  ok('with no term dates in the planner yet, the behaviour app says so plainly instead of guessing', /no term dates yet/.test(why));
  setData(Object.assign({ classes: {}, timetable: { A: [], B: [] } }, cal));
}

// 2.7 (2026-10-29): the order sheet as a Gmail DRAFT to the technicians (never sent), the .xlsx attached, logged
{
  const drafts = [];
  global.GmailApp = { createDraft: (to, subj, body, o) => { drafts.push({ to, subj, body, o }); return { getId: () => 'd1' }; },
    sendEmail: () => { throw new Error('must never send'); } };
  orderXlsx_ = (model, title) => ({ name: title + '.xlsx' });   // the Sheets export itself is not in the mock
  delete m.props.TECH_EMAILS;
  const a = api.orderSheetDraft(k, {}, 'Order Sheet Week A - Nov 9');
  ok('order sheet draft with no addresses filled in: a draft with no "To", and the page is told', a.noAddress === true && drafts[0].to === '' && drafts[0].o.attachments[0].name === 'Order Sheet Week A - Nov 9.xlsx');
  m.props.TECH_EMAILS = 'tech.one@example.org; tech.two@example.org';
  const b = api.orderSheetDraft(k, {}, 'Order Sheet Week B - Nov 16');
  const logs = m.sheets.Log._data.filter((r) => r[1] === 'order sheet email drafted');
  ok('order sheet draft: to every address in TECH_EMAILS, subject is the sheet title, logged in the Log tab', !b.noAddress && drafts[1].to === 'tech.one@example.org,tech.two@example.org' && drafts[1].subj === 'Order Sheet Week B - Nov 16' && logs.length === 2);
  delete m.props.TECH_EMAILS;
}

// 4.7 (2026-10-29): opening a class reads today's taps from the bottom of the log only, and still finds them all
{
  const log = m.sheets['Behaviour Log']._data, keep = log.slice();
  const old = new Date(Date.now() - 3 * 864e5), now = Date.now();
  log.length = 1;
  for (let i = 0; i < 5000; i++) log.push([new Date(old.getTime() + i), '7BYA', 'Test Pupil One', 'Positive', 0, '']);
  for (let i = 0; i < 450; i++) log.push([new Date(now - 450 + i), i % 2 ? '7BYA' : '8XP', 'Test Pupil Two', 'Positive', 0, '']);   // crosses a 400-row chunk
  const got = api.openClass(k, '7BYA').events;
  ok('4.7: opening a class finds all of today\'s taps for it from the bottom of a long log (225 of 450, none from earlier days)', got.length === 225);
  log.length = 0; keep.forEach((r) => log.push(r));
}

// Memory map daily update (big goal 1, 2026-10-29): votes and homework results become evidence once, squares are
// written, the snapshot is ready for home, and no pupil name reaches any memory tab
{
  global.PlannerMemory = require('../memory.js');
  const iso = (d) => Utilities.formatDate(d, 'Europe/London', 'yyyy-MM-dd'), now0 = new Date(), today = new Date(now0.getFullYear(), now0.getMonth(), now0.getDate(), 12);   // midday: no midnight edge
  const mon = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7) - 7, 12);
  const lesson = { unit: 'P3', topic: 'P3 Particles', title: 'Internal Energy', rel: 'Year 9/Physics/P3 Particles/Lesson 6 - Internal Energy', spec: ['Physics: Internal Energy'] };
  m.sheets.Data = m.makeSheet('Data', [['chunk'], [JSON.stringify({ classes: { '9AS': { year: 9, seq: [lesson] } }, timetable: { A: [], B: [] }, specIndex: [{ code: 'Physics: Internal Energy' }],
    hwSpec: { 'homework-9AS-test.json': { '1': ['Physics: Internal Energy'] } } })]]);
  m.sheets.Weeks = m.makeSheet('Weeks', [['monday', 'json', 'at'], [iso(mon), JSON.stringify({ monday: iso(mon), slots: [{ cls: '9AS', day: 0, period: 1, kind: 'lesson', key: lesson.rel }] }), 1]]);
  m.sheets['MCQ Votes'] = m.makeSheet('MCQ Votes', [['id', 'when', 'class', 'lesson', 'title', 'q', 'question', 'right', 'split', 'pctRight', 'mainWrong', 'misconception'],
    ['v1', new Date(mon.getTime() + 864e5), '9AS', lesson.rel, 'Internal Energy', 1, 'Which?', 'B', '{"A":40,"B":60}', 60, 'A', 'thinks heat is a substance']]);
  m.sheets.Results = m.makeSheet('Results', [['id', 'cls', 'title', 'file', 'dueOn', 'updated', 'json'],
    ['h1', '9AS', 'Quiz', 'homework-9AS-test.json', iso(mon), '', JSON.stringify({ id: 'h1', cls: '9AS', title: 'Quiz', file: 'homework-9AS-test.json', dueOn: iso(new Date(mon.getTime() + 2 * 864e5)), done: 20,
      questions: [{ key: '1', pct: 85, wrong: [] }, { key: '2', pct: 10, wrong: [] }] })]]);
  const a = api.memoryUpdate_();
  const ev = m.sheets['Memory Evidence']._data, sc = m.sheets['Memory Scores']._data;
  ok('memory: a vote and a homework question become one evidence row each (a question with no code is left out)', a.evidence === 2 && ev.length === 3 && ev.slice(1).map((r) => r[5]).sort().join() === 'homework,vote');
  ok('memory: the taught lesson gets its square, worked through both results', sc.length === 2 && sc[1][0] === '9AS' && sc[1][1] === 'Physics: Internal Energy' && sc[1][6] === 2);
  const b = api.memoryUpdate_();
  ok('memory: running the update again adds no evidence and keeps one square', b.evidence === 0 && m.sheets['Memory Evidence']._data.length === 3 && m.sheets['Memory Scores']._data.length === 2);
  const snap = api.readMemory_();
  ok('memory: the snapshot for home holds the class square with its recall and state', snap['9AS'] && snap['9AS'][0].spec === 'Physics: Internal Energy' && typeof snap['9AS'][0].recall === 'number');
  const top = api.openClass(k, '9AS').memory;
  ok('memory: opening a class on the phone brings its reddest spots (title, % or ?)', Array.isArray(top) && top.length <= 3 && top.every((x) => x.title && !/:/.test(x.title)));
  const names = m.sheets.Students._data.slice(1).map((r) => String(r[1])).filter(Boolean);
  const memTabs = ['Memory Evidence', 'Memory Scores', 'Memory Settings'].map((t) => JSON.stringify((m.sheets[t] || { _data: [] })._data)).join(' ');
  ok('memory: no pupil name in any memory tab', names.every((nm) => !memTabs.includes(nm)));
  m.sheets.Data = m.makeSheet('Data', [['chunk'], [JSON.stringify({ classes: {}, timetable: { A: [], B: [] } })]]);
  ok('memory: with no spec codes imported yet it says so and writes nothing', /no spec codes/.test(api.memoryUpdate_().none || ''));
}

console.log(out.join('\n')); console.log(failed ? `\n${failed} FAILED` : '\nAll passed'); process.exit(failed ? 1 : 0);
