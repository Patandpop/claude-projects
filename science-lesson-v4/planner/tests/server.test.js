// Server tests: runs Code.gs against a small in-memory mock of Apps Script and Sheets.
// Run: node tests/server.test.js
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path');
// the mock Students tab needs the Support column
m.sheets.Students._data[0].push('Support');
m.sheets.Students._data.forEach((r, i) => { if (i) r.push(i === 1 ? 'prompt' : ''); });
// one project since 2026-10-12: the planner's Code.gs and Behaviour.gs load together (a clash would break this)
const SRC = process.env.PLANNER_SRC || path.join(__dirname, '..');   // PLANNER_SRC: the bundle test points this at the comment-stripped copies
eval(fs.readFileSync(path.join(SRC, 'Code.gs'), 'utf8') + '\n' + fs.readFileSync(path.join(SRC, 'Behaviour.gs'), 'utf8') +
  '\nglobal.api={init,openClass,logEvent,logMany,removeMany,getBoard,setMode,endMode,getMode,setTimer,adjustTimer,stopTimer,submitResult,getSilence,getFriday,positivesOver,setSupport,setPause,mergeBehaviourData,behaviourWeek,sameClass_,lessonMcqs,saveVote,removeVote,setLost};');
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
m.sheets.Data = m.makeSheet('Data', [['chunk'], [JSON.stringify({ timetable: { A: [{ day: wdNow - 1, period: 3, cls: '7BYA' }], B: [{ day: wdNow - 1, period: 3, cls: '7BYA' }] } })]]);
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
  m.sheets.Data = m.makeSheet('Data', [['json'], [JSON.stringify({ classes: { '7MLA': { seq: [{ unit: 'B1', title: 'Cells', rel: 'Y7/B1/L3' }, { unit: 'B1', title: 'Specialised Cells', rel: 'Y7/B1/L4', mcq }] } }, timetable: {} })]]);
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

console.log(out.join('\n')); console.log(failed ? `\n${failed} FAILED` : '\nAll passed'); process.exit(failed ? 1 : 0);
