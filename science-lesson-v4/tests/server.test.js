// Server tests: runs Code.gs against a small in-memory mock of Apps Script and Sheets.
// Run: node tests/server.test.js
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path');
// the mock Students tab needs the Support column
m.sheets.Students._data[0].push('Support');
m.sheets.Students._data.forEach((r, i) => { if (i) r.push(i === 1 ? 'prompt' : ''); });
eval(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8') +
  '\nglobal.api={init,openClass,logEvent,logMany,removeMany,getBoard,setMode,endMode,getMode,setTimer,adjustTimer,stopTimer,submitResult,getSilence,getFriday,positivesOver,setSupport,setPause};');
const k = 'k', out = []; let failed = 0;
const ok = (n, c) => { out.push((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };

let oc = api.openClass(k, '7BYA');
ok('Support column is read', oc.students[0].support === 'prompt');
ok('no silence data yet', oc.silence === null);
ok('init has a numeric server version', typeof api.init(k).version === 'number');

let ev = api.logEvent(k, '7BYA', 'Thomas Boxall', '+', 0);
ok('positive saved', ev.some(e => e.type === '+'));
ok('Log stores the word, not a symbol (Sheets turns +/- into #ERROR!)', m.sheets.Log._data[1][3] === 'Positive');
ev = api.logEvent(k, '7BYA', 'Tom Browning', 'R', 4); ok('report to me keeps its rule', ev.some(e => e.type === 'R' && e.rule === 4));
ev = api.logMany(k, '7BYA', ['Thomas Boxall', 'Tom Browning'], '-', 0); ok('logMany saves a group', ev.filter(e => e.type === '-').length === 2);
const ids = ev.filter(e => e.type === '-').map(e => e.id);
ev = api.removeMany(k, '7BYA', ids); ok('undo removes them', ev.filter(e => e.type === '-').length === 0);
api.logEvent(k, '7BYA', 'Thomas Boxall', '-', 0); ev = api.logEvent(k, '7BYA', 'Thomas Boxall', '-', 4);
ok('detention reason saved on a negative', ev[ev.length - 1].rule === 4);
const past = Date.now() - 3600000; ev = api.logEvent(k, '7BYA', 'Tom Browning', '+', 0, past);
ok('offline tap keeps the time it was tapped', ev.some(e => e.name === 'Tom Browning' && e.type === '+' && Math.abs(e.id - past) < 5));
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
ok('positivesOver counts', api.positivesOver(k, '7BYA', 5).length >= 1);
ok('setSupport writes the Support column', api.setSupport(k, '7BYA', 'Tom Browning', 'extend') === 'extend' && m.sheets.Students._data[2][6] === 'extend');
console.log(out.join('\n')); console.log(failed ? `\n${failed} FAILED` : '\nAll passed'); process.exit(failed ? 1 : 0);
