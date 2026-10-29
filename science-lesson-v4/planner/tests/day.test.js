// The day screen, capture box and evening timer server calls (planner/Day.gs) on the Apps Script mock, loaded with
// Code.gs and Behaviour.gs as one project. Run: node planner/tests/day.test.js. Made-up data only.
'use strict';
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path'), vm = require('vm');
m.sheets.Students._data[0].push('Support');
m.sheets.Students._data.forEach((r, i) => { if (i) r.push(''); });

const fmt = (d) => Utilities.formatDate(d, 'Europe/London', 'yyyy-MM-dd');
const TODAY = fmt(new Date());
const addDay = (day, n) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const monday = (day) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return d.toISOString().slice(0, 10); };
const IDX = (new Date(TODAY + 'T12:00:00Z').getUTCDay() + 6) % 7;
const PT = { ks3: { P1: '09:00-10:00', P2: '10:25-11:30', P3: '11:30-12:30', P4: '13:15-14:15', P5: '14:15-15:15' }, ks4: { P1: '09:00-10:00', P2: '10:00-11:05', P3: '11:30-12:30', P4: '12:30-13:30', P5: '14:15-15:15' } };
m.sheets.Data = m.makeSheet('Data', [['chunk'], [JSON.stringify({ classes: {}, periodTimes: PT, timetable: { A: [{ day: IDX, period: 1, cls: '9AS' }], B: [{ day: IDX, period: 1, cls: '9AS' }] }, weekAStart: '2026-09-07', terms: [['2026-09-07', '2027-07-28']], inset: [] })]]);
// this week saved in the planner: P1 9AS built, P3 10S2 not built (today)
m.sheets.Weeks = m.makeSheet('Weeks', [['monday', 'json', 'at'], [monday(TODAY), JSON.stringify({ monday: monday(TODAY), slots: [
  { day: IDX, period: 1, cls: '9AS', kind: 'lesson', text: 'Particles — L3 Latent heat', built: true },
  { day: IDX, period: 3, cls: '10S2', kind: 'lesson', text: 'Waves — L4 Ripple tanks', built: false },
  { day: IDX, period: 4, cls: '12C', kind: 'test', text: 'Waves — end-of-topic TEST' }] }), Date.now()]]);

const SRC = path.join(__dirname, '..');
for (const f of ['Code.gs', 'Behaviour.gs', 'Day.gs']) vm.runInThisContext(fs.readFileSync(path.join(SRC, f), 'utf8'), { filename: f });
// key homework past its due day, not marked
const hw = tab_('Homework', HW_HEAD);
hw.appendRow(HW_HEAD.map((h) => ({ id: '9AS-x-1', cls: '9AS', kind: 'key', title: 'Key homework: particles', dueOn: addDay(TODAY, -2), status: 'drafted' })[h] || ''));
// the homework status the Homework tab cached: 4 of 28 not handed in (counts only)
m.cache.hwstat = JSON.stringify([{ id: '10C2-y-1', cls: '10C2', title: 'Seneca energy', dueOn: addDay(TODAY, -1), status: 'scheduled', size: 28, done: 24 }]);

let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };
const k = 'k';

// ---- dayLoad
let d = dayLoad(k);
ok('dayLoad: today, the period times and the calendar come back', d.day === TODAY && !!d.periodTimes && d.cal.terms.length === 1);
ok('today\'s lessons from the saved week, with built flags', d.lessons.length === 3 && d.lessons[0].cls === '9AS' && d.lessons[0].built === true && d.lessons[1].built === false && d.lessons[1].title === 'L4 Ripple tanks');
const ids = d.items.map((x) => x.id);
ok('an unbuilt lesson today is a to-do', ids.includes('build:' + TODAY + ':3:10S2'));
ok('a test slot is not a build to-do', !ids.some((x) => /:4:12C/.test(x)));
ok('key homework past its due day is "mark" to-do', ids.includes('mark:9AS-x-1'));
const ch = d.items.find((x) => x.id === 'chase:10C2-y-1');
ok('pupils to chase come as a class count, no names', ch && ch.count === 4 && ch.text === 'Chase 4 pupils: 10C2 Seneca energy');
ok('nothing running, no inbox yet, default settings', d.timer === null && d.inbox.length === 0 && d.settings.shutdownTime === '17:00' && d.settings.minutes.mark === 60);
ok('a day with no saved week falls back to the timetable with "?" lessons', (() => {
  const other = addDay(TODAY, 14), wd = new Date(other + 'T12:00:00Z').getUTCDay();
  const L = dayLoad(k, other).lessons; return wd === 0 || wd === 6 ? true : L.length === 1 && L[0].built === null && L[0].planned === false;
})());

// ---- to-dos
let r = todoSave(k, { text: 'Ring the garage', id: 'tap1' });
ok('his own to-do is saved', r.id === 'tap1' && dayLoad(k).items.some((x) => x.id === 'tap1' && x.text === 'Ring the garage'));
ok('the same tap sent twice is saved once', todoSave(k, { text: 'Ring the garage', id: 'tap1' }).existed === true && m.sheets.Todos._data.filter((x) => x[0] === 'tap1').length === 1);
ok('a to-do id that looks like a planner item is not accepted as is', todoSave(k, { text: 'x', id: 'build:fake' }).id !== 'build:fake');
let threw = ''; try { todoSave(k, { text: '   ' }); } catch (e) { threw = e.message; }
ok('an empty to-do is refused', /needs some words/.test(threw));
todoSet(k, 'build:' + TODAY + ':3:10S2', 'dropped');
ok('dropping a planner item hides it today', !dayLoad(k).items.some((x) => x.id === 'build:' + TODAY + ':3:10S2'));
todoSet(k, 'mark:9AS-x-1', 'dropped');
ok('...a dropped marking job is hidden today and back tomorrow (still not marked)', !dayLoad(k).items.some((x) => x.id === 'mark:9AS-x-1') && dayLoad(k, addDay(TODAY, 1)).items.some((x) => x.id === 'mark:9AS-x-1'));
todoSet(k, 'mark:9AS-x-1', 'moved', addDay(TODAY, 2));
ok('moving a planner item hides it until that day', !dayLoad(k).items.some((x) => x.id === 'mark:9AS-x-1') && dayLoad(k, addDay(TODAY, 2)).items.some((x) => x.id === 'mark:9AS-x-1'));
todoSet(k, 'tap1', 'dropped');
ok('his own dropped to-do is gone for good', !dayLoad(k).items.some((x) => x.id === 'tap1') && !dayLoad(k, addDay(TODAY, 1)).items.some((x) => x.id === 'tap1'));
threw = ''; try { todoSet(k, 'tap1', 'moved'); } catch (e) { threw = e.message; }
ok('moving needs a day', /Pick a day/.test(threw));
todoSave(k, { text: 'Old thing', id: 'old1' });
m.sheets.Todos._data.find((x) => x[0] === 'old1')[5] = new Date(addDay(TODAY, -1) + 'T00:00:00');   // added yesterday (Sheets keeps it as a date)
const old = dayLoad(k).items.find((x) => x.id === 'old1');
ok('a leftover from yesterday still shows, with the day it was added read back as text', old && old.since === addDay(TODAY, -1));

// ---- ghost blocks
r = blockAccept(k, { todoId: 'chase:10C2-y-1', start: '10:25', minutes: 20, text: 'Chase 4 pupils: 10C2 Seneca energy', cls: '10C2' });
d = dayLoad(k);
ok('accepting a block makes a timed to-do for today and the planner copy steps aside', d.items.some((x) => x.id === r.id && x.at === '10:25' && x.planned) && !d.items.some((x) => x.id === 'chase:10C2-y-1'));
ok('accepting the same block twice makes one row', (blockAccept(k, { todoId: 'chase:10C2-y-1', start: '10:25', minutes: 20, text: 'x' }), m.sheets.Todos._data.filter((x) => x[0] === r.id).length === 1));
todoSave(k, { text: 'Sort lab books', id: 'own2' });
blockAccept(k, { todoId: 'own2', start: '15:20', minutes: 30 });
ok('accepting a block for his own to-do gives it the time', dayLoad(k).items.find((x) => x.id === 'own2').at === '15:20');

// ---- capture
r = captureSave(k, 'order 30 beakers for tues', Date.now(), 'cap1', { home: 'orderSheet' });
ok('a capture lands in the inbox with its suggested home', dayLoad(k).inbox.some((x) => x.id === 'cap1' && x.suggestedHome === 'orderSheet'));
ok('the same capture sent twice is saved once', captureSave(k, 'order 30 beakers for tues', Date.now(), 'cap1').existed === true);
captureFile(k, 'cap1', { home: 'orderSheet' });
d = dayLoad(k);
ok('filing it: off the inbox, on the list as "Order: ..."', !d.inbox.some((x) => x.id === 'cap1') && d.items.some((x) => x.text === 'Order: order 30 beakers for tues'));
captureSave(k, '9AS ran out of time', Date.now(), 'cap2', { home: 'class', cls: '9AS' });
threw = ''; try { captureFile(k, 'cap2', { home: 'obsidian' }); } catch (e) { threw = e.message; }
ok('anything with a class is refused for Obsidian', /stays in the planner/.test(threw));
captureSave(k, 'book idea', Date.now(), 'cap3', { home: 'obsidian' });
threw = ''; try { captureFile(k, 'cap3', { home: 'obsidian' }); } catch (e) { threw = e.message; }
ok('Obsidian is never written until the folder is set', /Pick the Obsidian folder/.test(threw) && dayLoad(k).inbox.some((x) => x.id === 'cap3'));
// a fake Drive: G:\My Drive\Obsidian
const files = {};
const folder = (name, kids) => ({ getFoldersByName: (n) => { const f = (kids || {})[n]; let done = !f; return { hasNext: () => !done, next: () => { done = true; return f; } }; },
  getFilesByName: (n) => { let done = !files[n]; return { hasNext: () => !done, next: () => { done = true; return { getBlob: () => ({ getDataAsString: () => files[n] }), setContent: (t) => { files[n] = t; } }; } }; },
  createFile: (n, t) => { files[n] = t; } });
global.DriveApp = { getRootFolder: () => folder('root', { Obsidian: folder('Obsidian') }) };
const realFmt = Utilities.formatDate; Utilities.formatDate = (dt, tz, f) => (f === 'yyyy-MM-dd HH:mm' ? '2026-11-03 07:10' : realFmt(dt, tz, f));
daySettingsSave(k, { obsidianFolder: 'G:\\My Drive\\Obsidian' });
captureFile(k, 'cap3', { home: 'obsidian' });
ok('with the folder set, it is appended as a dated bullet to "Inbox from planner.md"', files['Inbox from planner.md'] === '# Inbox from planner\n\n- 2026-11-03 07:10 book idea\n');
captureSave(k, 'second idea', Date.now(), 'cap4', { home: 'obsidian' }); captureFile(k, 'cap4', { home: 'obsidian' });
ok('the next one is added to the end, nothing replaced', files['Inbox from planner.md'].split('\n').filter((l) => l.startsWith('- ')).length === 2);
ok('every Obsidian write is logged', m.sheets.Log._data.filter((x) => x[1] === 'capture appended to Obsidian inbox').length === 2);
Utilities.formatDate = realFmt;

// ---- timer
const t0 = Date.now() - 50 * 60000;
r = timerStart(k, 'Marking', '9AS', t0, 'phone', 'task-books-9AS');
ok('starting the timer: one running row', dayLoad(k).timer && dayLoad(k).timer.job === 'Marking' && dayLoad(k).timer.cls === '9AS');
r = timerStart(k, 'Emails', '9AS', t0 + 30 * 60000, 'pc');
let rows = timerReport(k, '', '9999');
ok('a new job stops the old one (30 min of marking) and Emails carries no class', rows.length === 1 && rows[0].minutes === 30 && rows[0].job === 'Marking' && dayLoad(k).timer.job === 'Emails' && dayLoad(k).timer.cls === '');
r = timerStop(k, t0 + 45 * 60000);
ok('stop records the minutes', r.stopped.minutes === 15 && dayLoad(k).timer === null);
timerStart(k, 'Building lessons', '10S2', Date.now() - 3 * 3600e3);
r = timerStop(k, Date.now());
ok('a timer left running 3 hours stops at 2 hours, flagged "maybe"', r.stopped.minutes === 120 && r.stopped.maybe === true);
threw = ''; try { timerStart(k, 'Sleeping', ''); } catch (e) { threw = e.message; }
ok('an unknown job is refused', /Unknown job/.test(threw));
r = timerLog(k, [{ id: 'pc-1', day: TODAY, job: 'Admin', minutes: 12 }, { id: 'pc-1', day: TODAY, job: 'Admin', minutes: 12 }, { id: 'pc-2', day: TODAY, job: 'Personal', minutes: 30, title: 'Secret window' }, { id: 'pc-3', day: 'x', job: 'Admin', minutes: 3 }]);
ok('the PC\'s totals: the same id once, bad rows skipped', r.saved === 2);
ok('no window title is ever stored', !JSON.stringify(m.sheets.Timer._data).includes('Secret'));
const maybeRow = timerReport(k, '', '9999').find((x) => x.maybe);
timerEdit(k, maybeRow.id, { minutes: 75 });
ok('editing a "maybe" row fixes its minutes and clears the flag', timerReport(k, '', '9999').find((x) => x.id === maybeRow.id).minutes === 75 && !timerReport(k, '', '9999').find((x) => x.id === maybeRow.id).maybe);
ok('the report covers a date range', timerReport(k, addDay(TODAY, 1), '9999').length === 0 && timerReport(k, TODAY, TODAY).length === 5);

// ---- rules and settings
timerRulesSave(k, [{ pattern: 'seneca', job: 'Setting homework' }, { pattern: 'bad', job: 'Nope' }, { pattern: 'arbor', job: 'Admin' }]);
ok('timer rules: saved, bad rows dropped', timerRules(k).length === 2 && timerRules(k)[0].pattern === 'seneca');
timerRulesSave(k, [{ pattern: 'gmail', job: 'Emails' }]);
ok('saving a shorter list leaves no old rows behind', timerRules(k).length === 1 && timerRules(k)[0].pattern === 'gmail');
daySettingsSave(k, { shutdownTime: '16:45', minutes: { mark: 45, chase: 5, build: 40, ritualBooks: 120 }, notASetting: 1 });
const st = daySettings(k);
ok('settings save and come back; unknown keys ignored', st.shutdownTime === '16:45' && st.minutes.mark === 45 && !('notASetting' in st));

// ---- done for today
timerStart(k, 'Marking', '8XP', Date.now() - 10 * 60000);
r = doneForToday(k, Date.now());
ok('"Done for today" stops the timer and records the day', r.stopped && r.stopped.job === 'Marking' && dayLoad(k).doneForToday === true && dayLoad(k).timer === null);
doneForToday(k, Date.now());
ok('pressing it twice records the day once', m.sheets['Day Log']._data.filter((x) => x[1] === 'done for today').length === 1);

// ---- the bridge can reach them, and every call checks the key
ok('every day call is on the bridge list', ['dayLoad', 'todoSave', 'todoSet', 'blockAccept', 'doneForToday', 'captureSave', 'captureFile', 'timerStart', 'timerStop', 'timerLog', 'timerEdit', 'timerReport', 'timerRules', 'timerRulesSave', 'daySettings', 'daySettingsSave'].every((f) => bridgeAllowed_(f)));
ok('every day call refuses a wrong key', ['dayLoad', 'todoSave', 'todoSet', 'blockAccept', 'doneForToday', 'captureSave', 'captureFile', 'timerStart', 'timerStop', 'timerLog', 'timerEdit', 'timerReport', 'timerRules', 'timerRulesSave', 'daySettings', 'daySettingsSave'].every((f) => { try { globalThis[f]('wrong'); return false; } catch (e) { return e.message === 'Locked'; } }));
ok('nothing in the Day tabs looks like a pupil name from the Students tab', !['Todos', 'Inbox', 'Timer', 'Day Log'].some((t) => JSON.stringify(m.sheets[t]._data).includes('Test Pupil')));

console.log(failed ? `\n${failed} FAILED` : '\nAll day server checks passed');
process.exit(failed ? 1 : 0);
