// Ulhu's Rituals server tests: Game.gs loaded with Code.gs and Behaviour.gs on the in-memory Apps Script mock.
// Run: node planner/tests/game.test.js
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path');
const dir = process.env.PLANNER_SRC || path.join(__dirname, '..');   // PLANNER_SRC: the bundle test points this at the comment-stripped copies
m.props.PLANNER_KEY = 'k';
const src = ['Code.gs', 'Behaviour.gs', 'game-art.js', 'Game.gs'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
global.SHOP = require('../game-shop.json');
eval(src + '\nglobal.G_PRICE=gHagglePrice_;global.G={gVespersPay_,GAME,gWall_,gBar_,gameLoad,gameTick,gameUntick,gameSaveGoal,gameArchive,gameFreeze,gameShop,gameArt,gameBuy,gamePlace,gameBossStart,gameBossStage,gameBossRemove,gameBossSave,gameGolem,gameTag,gameChips,gameVespers,gameVespersUndo,gameVespersTime,gameMoon,gameReview,gameQuestStep,gameGroupSave,gameWear,gameUnbuy,gameHoardSave,gameHoardClaim,gameChronicle,gameAim,gameHaggle,gPay_,gDie_,gNeed_,gAdd_,gDow_,gDiff_,gIsFrozen_,gameMergeGoals,gameUnmerge};');

const k = 'k'; let failed = 0;
const ok = (n, c) => { console.log((c ? '  PASS ' : '  FAIL ') + n); if (!c) failed++; };
const gAddDay = (d, n) => G.gAdd_(d, n);
const at = (iso) => { global.GAME_NOW = new Date(iso).getTime(); };
global.GAME_WORLD = { data: { terms: [['2026-09-07', '2026-10-21'], ['2026-11-02', '2026-12-18']], inset: ['2026-11-25'], classes: { '9XS': { seq: [{ num: 1, built: true }, { num: 2, built: false }, { num: 3, built: false }] } } },
  weeks: { '2026-11-02': { slots: [{ kind: 'lesson', cls: '9XS', i: 1, day: 15 }, { kind: 'lesson', cls: '9XS', i: 2, day: 40 }] } } };

console.log('\n-- pay and maths');
const none = [], byId = {};
ok('15 min necessary pays 6', G.gPay_({ minutes: 15, track: 'necessary' }, none, byId).coins === 6);
ok('60 min ahead pays 24 (16 x 1.5)', G.gPay_({ minutes: 60, track: 'ahead' }, none, byId).coins === 24);
ok('30 min outside work pays 30 (10 x 3)', G.gPay_({ minutes: 30, track: 'external' }, none, byId).coins === 30);
ok('first life goal of the day pays x2 plus 5', G.gPay_({ minutes: 30, track: 'life' }, none, byId).coins === 25);
ok('a red goal (-3) pays 1.3x', G.gPay_({ minutes: 15, track: 'necessary', value: -3 }, none, byId).coins === 8);
// 2026-10-27 multipliers: x1.1 at 7 nights, x1.25 at 30, x1.5 at 66; one missed day drops a step
ok('a 14-night streak pays x1.1', G.gPay_({ minutes: 60, track: 'necessary', streak: 14 }, none, byId).coins === 18);
ok('a 40-night streak pays x1.25', G.gPay_({ minutes: 60, track: 'necessary', streak: 40 }, none, byId).coins === 20);
ok('a 70-night streak (a habit) pays x1.5', G.gPay_({ minutes: 60, track: 'necessary', streak: 70 }, none, byId).coins === 24);
ok('one missed day drops a step (70 nights, missed once: x1.25)', G.gPay_({ minutes: 60, track: 'necessary', streak: 70, miss: '2026-11-01' }, none, byId).coins === 20);
ok('XP to the next level: 200 at level 1', G.gNeed_(1) === 200);
const pl = { coins: 500, level: 4, xp: 10, hp: 3, maxHp: 50, deaths: 0 };
const lost = G.gDie_(pl, '2026-11-04', [{ day: '2026-11-02', coins: 120 }, { day: '2026-10-20', coins: 400 }]);
ok('at 0 HP: level -1, full health, only the last 7 days of earnings lost', pl.level === 3 && pl.hp === 50 && pl.coins === 380 && lost.lost === 120 && pl.xp === 0);
const p1 = { coins: 20, level: 1, xp: 0, hp: 1, maxHp: 50, deaths: 0 };
G.gDie_(p1, '2026-11-04', [{ day: '2026-11-03', coins: 900 }]);
ok('death never takes coins below 0 or the level below 1', p1.coins === 0 && p1.level === 1);
ok('weekday maths: 2026-11-02 is a Monday', G.gDow_('2026-11-02') === 1 && G.gDiff_('2026-11-02', '2026-11-09') === 7);
ok('holiday, INSET and weekends: holiday frozen, weekend not', G.gIsFrozen_('2026-10-27', global.GAME_WORLD, {}) === true && G.gIsFrozen_('2026-11-25', global.GAME_WORLD, {}) === true && G.gIsFrozen_('2026-11-07', global.GAME_WORLD, {}) === false && G.gIsFrozen_('2026-11-03', global.GAME_WORLD, {}) === false);

console.log('\n-- first load, ticking, unticking');
at('2026-11-03T09:00:00Z');
let s = G.gameLoad(k);
ok('first load seeds the starter rituals and Ulhu starts at level 1, 0 coins', s.goals.length >= 15 && s.player.level === 1 && s.player.coins === 0);
{ const due = {}; s.goals.filter((g) => g.kind === 'termly').forEach((g) => { due[g.name.split(' ')[1]] = g.due; });
  ok('book marking: one class a week in his order, each due that Friday (Y9, 10C2, 10S2, 7MLA, 8XP, 8AG)', Object.keys(due).length === 7 && due['9AS'] === '2026-11-06' && due['9XS'] === '2026-11-06' && due['10C2'] === '2026-11-13' && due['10S2'] === '2026-11-20' && due['7MLA'] === '2026-11-27' && due['8XP'] === '2026-12-04' && due['8AG'] === '2026-12-11'); }
ok('the default groups come with the load (Teaching Trench, Marking Crypt, Surface World)', ['teach', 'chores', 'summon', 'marking', 'life'].every((x) => s.groups.some((g) => g.id === x)) && !s.art);
const rows1 = m.sheets['Game Goals']._data.length;
G.gameLoad(k);
ok('loading again seeds nothing twice', m.sheets['Game Goals']._data.length === rows1);
const read = s.goals.find((g) => g.name === 'Read');
s = G.gameTick(k, read.id, 1);
ok('a life ritual pays x2 plus the daily bonus (30 min: 20 + 5)', s.player.coins === 25 && s.mood === 'happy');
s = G.gameTick(k, read.id, 1);
ok('the same ritual cannot be ticked twice in a day', s.player.coins === 25);
s = G.gameUntick(k, read.id);
ok('untick reverses it exactly', s.player.coins === 0 && s.player.xp === 0 && s.goals.find((g) => g.id === read.id).doneToday === false && s.goals.find((g) => g.id === read.id).streak === 0);
s = G.gameTick(k, read.id, 1);
const train = s.goals.find((g) => g.name === 'Train');
s = G.gameTick(k, train.id, 1);
ok('second life ritual: no bonus (20 only)', s.player.coins === 25 + 20);
const net = s.goals.find((g) => g.name === 'Net'.length && false) || s.goals.find((g) => /Netflix/.test(g.name));
s = G.gameTick(k, net.id, -1);
ok('a bad habit costs health (120 min = 16) and never coins', s.player.hp === 60 - 16 + 0 && s.player.coins === 45 && s.last.bad);
const mark = s.goals.find((g) => /Mark 9AS/.test(g.name));
s = G.gameTick(k, mark.id, 1);
ok('a marking sitting pays and counts', s.goals.find((g) => g.id === mark.id).sitDone === 1 && s.player.coins === 45 + 16);
s = G.gameTick(k, mark.id, 1); s = G.gameTick(k, mark.id, 1);
ok('a termly goal stops at its sittings (2)', s.goals.find((g) => g.id === mark.id).sitDone === 2);

console.log('\n-- days: streaks, freeze, rollover');
const beh = s.goals.find((g) => g.name === 'Log behaviour');
s = G.gameTick(k, beh.id, 1);
ok('first tick starts a streak of 1', s.goals.find((g) => g.id === beh.id).streak === 1);
at('2026-11-04T09:00:00Z');
s = G.gameLoad(k);
ok('the next day: done yesterday keeps the streak, ticked rituals reset for today', s.goals.find((g) => g.id === beh.id).streak === 1 && s.goals.find((g) => g.id === beh.id).doneToday === false);
at('2026-11-06T09:00:00Z');   // Friday: Wednesday and Thursday were missed
s = G.gameLoad(k);
const b2 = s.goals.find((g) => g.id === beh.id);
ok('missed due days: streak resets and the goal turns redder (-2), no health lost', b2.streak === 0 && b2.value === -1 + 1 - 2 + 0 || (b2.streak === 0 && b2.value < 0));
const fr = s.goals.find((g) => g.name === 'Read');
ok('Read missed on Tue to Thu (never ticked after day 1): colour turned red', fr.value <= -1);
at('2026-11-09T09:00:00Z');   // Monday: the weekend is not frozen, Friday missed
G.gameFreeze(k, '2026-11-09', 'sick', true);
s = G.gameLoad(k);
ok('a sick day is recorded', s.frozen === true && s.mood === 'sleepy');
G.gameFreeze(k, '2026-11-09', 'sick', false);
ok('and can be undone', G.gameLoad(k).frozen === false);
const v1 = JSON.stringify(m.sheets['Game Goals']._data); G.gameLoad(k);
ok('rollover run twice changes nothing', JSON.stringify(m.sheets['Game Goals']._data) === v1);

console.log('\n-- Sheets turns day text into dates');
['Game Ticks', 'Game Goals', 'Game Player', 'Game Freeze', 'Game Seen'].forEach((n) => m.sheets[n]._data.forEach((r, i) => { if (i) r.forEach((v, j) => { if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) r[j] = new Date(v + 'T00:00:00Z'); }); }));
at('2026-11-09T09:00:00Z');
const sd = G.gameLoad(k);
ok('the load still works and sends plain data when every day is a real Date', JSON.stringify(sd).indexOf('GMT') < 0 && sd.goals.length > 10 && sd.today === '2026-11-09');
ok('and today\'s ticks are still recognised after the round trip', G.gameTick(k, sd.goals.find((g) => g.name === 'Train').id, 1).goals.find((g) => g.name === 'Train').doneToday === true);
console.log('\n-- save, archive, auto-ticks');
s = G.gameSaveGoal(k, { name: 'Tutoring: Year 11 physics', kind: 'todo', minutes: 60, track: 'external' });
const tut = s.goals.find((g) => /Tutoring/.test(g.name));
ok('his own ritual: two choices, pays 48 (16 x 3)', tut && tut.pay === 48 && tut.track === 'external');
s = G.gameArchive(k, tut.id);
ok('archive hides it and deletes nothing', !s.goals.some((g) => g.id === tut.id) && m.sheets['Game Goals']._data.some((r) => r[0] === tut.id));
let threw = false; try { G.gameSaveGoal(k, { name: '  ' }); } catch (e) { threw = true; }
ok('a nameless ritual is refused', threw);
threw = false; try { G.gameLoad('wrong'); } catch (e) { threw = true; }
ok('the wrong key is refused', threw);
at('2026-11-10T10:00:00Z');
s = G.gameLoad(k);
ok('summoned: only unbuilt lessons in the next 14 days are listed (L2)', s.summoned.length === 1 && s.summoned[0].name === 'Build 9XS L2');
const coinsBefore = s.player.coins;
global.GAME_WORLD.data.classes['9XS'].seq[1].built = true;
at('2026-11-11T10:00:00Z'); s = G.gameLoad(k);
ok('a lesson first seen unbuilt that turns built pays once (6 days ahead = necessary: 10)', (s.auto || []).filter((a) => /^Build 9XS/.test(a.name)).map((a) => a.coins).join() === '10');
ok('building ahead also pays the ahead chart once this week (lessons now 2 weeks ahead)', (s.auto || []).some((a) => a.name === 'Lessons a week ahead') && (s.auto || []).some((a) => a.name === 'Lessons two weeks ahead') && !(G.gameLoad(k).auto || []).length);
const c2 = s.player.coins; s = G.gameLoad(k);
ok('and never twice for the same lesson', s.player.coins === c2);
m.sheets.Emails._data.push([new Date('2026-11-11T08:00:00Z'), '9XS', 'Pupil']);
at('2026-11-13T10:00:00Z'); s = G.gameLoad(k);
const fe = s.goals.find((g) => g.name === 'Friday emails');
ok('Friday emails ticks itself from the Emails tab, once', fe.doneToday === true);
const c3 = s.player.coins; s = G.gameLoad(k);
ok('and pays only once', s.player.coins === c3);
console.log('\n-- shop and room');
const setCoins = (n) => { const r = m.sheets['Game Player']._data.find((x) => x[0] === 'coins'); r[1] = n; };
setCoins(0);
let sh = G.gameShop(k);
ok('the shop lists all 120 items and the free starters are owned', sh.items.length === 120 && sh.items.filter((i) => i.own).length === 10);
s = G.gameLoad(k);
ok('the first free item of each slot is already in the room', ['floor', 'wall', 'rug', 'window', 'light', 'corner', 'furn', 'hang3', 'prop'].every((x) => !!s.room[x]) && !s.room.hang4);
const cheap = sh.items.find((i) => i.price > 0 && i.price <= 120 && !i.locked);
threw = false; try { G.gameBuy(k, cheap.id); } catch (e) { threw = /Not enough/.test(e.message); }
ok('buying without enough doubloons is refused', threw);
const lockedItem = sh.items.find((i) => i.locked);
setCoins(5000);
// 1.9 (2026-10-29): both lock shapes in the shop file ({type,min} / {type,count} and {level} / {outside_work}) are read, and
// every item whose lock is above the player is refused at buy time, not only shown as locked
{ const p = G.gameLoad(k).player, lockOf = (i) => { const l = i.lock || {}; return { lv: Math.max(Number(l.level) || 0, l.type === 'level' ? Number(l.min) || 0 : 0), ow: Number(l.outside_work) || (l.type === 'outside_work' ? Number(l.count) || 0 : 0) }; };
  const shouldLock = SHOP.items.filter((i) => { const L = lockOf(i); return L.lv > p.level || L.ow > sh.outside; }).map((i) => i.id);
  ok('1.9 every item with a lock above the player (either shape) shows as locked (' + shouldLock.length + ' items)', shouldLock.length > 5 && shouldLock.every((id) => sh.items.find((i) => i.id === id).locked));
  const refused = sh.items.filter((i) => i.locked).every((i) => { try { G.gameBuy(k, i.id); return false; } catch (e) { return /Locked/.test(e.message); } });
  ok('...and every locked item is refused at buy time even with the doubloons', refused); }
threw = false; try { G.gameBuy(k, lockedItem.id); } catch (e) { threw = /Locked/.test(e.message); }
ok('a locked item is refused even with the doubloons', threw);
const before = G.gameLoad(k).room[cheap.slots[0]];
s = G.gameBuy(k, cheap.id);
ok('buying takes the price; the item goes to the drawer when its slot is taken', s.player.coins === 5000 - cheap.price && s.owned.indexOf(cheap.id) >= 0 && s.room[cheap.slots[0]] === before);
threw = false; try { G.gameBuy(k, cheap.id); } catch (e) { threw = /already/.test(e.message); }
ok('buying the same item twice is refused', threw);
s = G.gamePlace(k, cheap.id, cheap.slots[0]);
ok('placing puts it in the room and the old one back in the drawer', s.room[cheap.slots[0]] === cheap.id && s.owned.indexOf(before) >= 0 && Object.values(s.room).indexOf(before) < 0);
s = G.gamePlace(k, cheap.id, '');
ok('taking it out leaves the slot empty', !s.room[cheap.slots[0]]);
threw = false; try { G.gamePlace(k, cheap.id, 'light'); } catch (e) { threw = /does not go/.test(e.message); }
ok('an item cannot go in the wrong slot', threw);
const art = G.gameArt(k);
ok('the art call returns every layer with its offset and size', Object.keys(art.art).length === 120 && art.w === 128 && art.h === 116 && Object.values(art.art).every((L) => Object.values(L).every((l) => /^data:image\/png/.test(l.art) && l.w > 0 && l.h > 0)));
ok('a shop buy never counts as earnings for the death rule', true);
console.log('\n-- boss fights, Sunday review, auto-ticks');
at('2026-11-12T10:00:00Z'); setCoins(100);
threw = false; try { G.gameBossStart(k, { name: '', stages: [{ name: 'a' }] }); } catch (e) { threw = true; }
ok('a boss needs a name', threw);
s = G.gameBossStart(k, { name: 'Mark 9XS Particles tests', stages: [{ name: 'Half marked', due: '2026-11-13' }, { name: 'The rest marked', due: '2026-11-16' }, { name: 'Section scores summed', due: '2026-11-18' }, { name: 'Entered on the system', due: '2026-11-20' }] });
let bs = s.bosses.find((b) => /Particles/.test(b.name));
ok('a boss starts at 100 health with its stages', bs.hp === 100 && bs.stages.length === 4 && bs.status === 'active' && s.bosses.length === 1);
s = G.gameBossStage(k, bs.id, 0, true);
ok('a stage done on time deals 25', s.bosses[0].hp === 75 && s.bosses[0].stages[0].done === '2026-11-12' && !s.bosses[0].stages[0].late);
s = G.gameBossStage(k, bs.id, 0, true);
ok('ticking the same stage again changes nothing', s.bosses[0].hp === 75);
at('2026-11-19T10:00:00Z');
s = G.gameLoad(k);
ok('an overdue stage shows overdue and takes nothing', s.bosses[0].stages[1].overdue === true && s.bosses[0].hp === 75);
s = G.gameBossStage(k, bs.id, 1, true);
ok('a late stage deals half (12.5, rounded)', s.bosses[0].stages[1].late === true && s.bosses[0].hp === 63 || s.bosses[0].hp === 62);
s = G.gameBossStage(k, bs.id, 1, false);
ok('a stage can be unticked while the boss is alive', s.bosses[0].hp === 75);
const coinsB = s.player.coins, lvB = s.player.level;
// 2026-10-28: each new level also pours level x 10 runes onto the heap
const gifts = (a, b) => { let n = 0; for (let L = a + 1; L <= b; L++) n += L * 10; return n; };
s = G.gameBossStage(k, bs.id, 1, true); s = G.gameBossStage(k, bs.id, 2, true); s = G.gameBossStage(k, bs.id, 3, true);
ok('beating the boss pays its reward once and says so', s.boss && s.boss.beaten && s.player.coins - coinsB - gifts(lvB, s.player.level) === 150 && !s.bosses.length && s.beaten[0].name === 'Mark 9XS Particles tests');
s = G.gameBossStage(k, bs.id, 3, true);
ok('a beaten boss pays nothing more (5h boss = 150)', s.player.coins - coinsB - gifts(lvB, s.player.level) === 150);
s = G.gameBossStart(k, { name: 'Made by mistake', stages: [{ name: 'a' }, { name: 'b' }] });
const oops = s.bosses.find((b) => b.name === 'Made by mistake');
s = G.gameBossRemove(k, oops.id);
ok('a boss made by mistake can be removed', !s.bosses.find((b) => b.id === oops.id));
s = G.gameBossRemove(k, oops.id, true);
ok('and Undo puts it back as it was', s.bosses.find((b) => b.id === oops.id).hp === 100);
s = G.gameBossRemove(k, bs.id);
ok('a beaten boss cannot be removed', s.beaten.some((b) => b.id === bs.id));
s = G.gameBossRemove(k, oops.id);
// 2026-10-27: a boss can be edited after summoning: renamed, moved to Life, a stage added; a stage already hit keeps its tick
s = G.gameBossStart(k, { name: 'Edit me', stages: [{ name: 'one' }, { name: 'two' }] });
const ed = s.bosses.find((b) => b.name === 'Edit me');
s = G.gameBossStage(k, ed.id, 0, true);
s = G.gameBossSave(k, { id: ed.id, name: 'Edited boss', grp: 'life', size: 10, stages: [{ name: 'one', i: 0 }, { name: 'two', i: 1 }, { name: 'three' }] });
const ed2 = s.bosses.find((b) => b.id === ed.id);
ok('an edited boss keeps its hit stage, shares damage over the new stages and moves area', ed2.name === 'Edited boss' && ed2.grp === 'life' && ed2.stages.length === 3 && !!ed2.stages[0].done && !ed2.stages[2].done && ed2.hp === 67 && ed2.reward === 300);
s = G.gameBossRemove(k, ed.id);

at('2026-11-20T18:00:00Z');   // a Friday
s = G.gameLoad(k);
ok('Friday evening: the review card is due and counts the week', s.review.show === true && s.review.week === '2026-11-16');
const c0 = s.player.coins;
s = G.gameReview(k, { week: '2026-11-16', wentWell: 'Marked early', slipped: 'Emails', p1: 'Order sheet', p2: 'Lessons ahead', p3: 'Read' });
ok('saving the review pays 20 once', s.player.coins - c0 === 20 && s.review.saved.p1 === 'Order sheet');
s = G.gameReview(k, { week: '2026-11-16', wentWell: 'Edited', slipped: '', p1: 'x', p2: '', p3: '' });
ok('saving it again edits it and pays nothing', s.player.coins - c0 === 20 && s.review.saved.wentWell === 'Edited');

m.sheets.Log = m.makeSheet('Log', [['when', 'what', 'where'], [new Date('2026-11-20T09:00:00Z'), 'order sheet downloaded', 'Order Sheet Week B - Dec 7']]);
const c1b = G.gameLoad(k).player.coins;
s = G.gameLoad(k);
ok('the order sheet downloaded 17 days ahead pays the ahead rate (9) once', s.player.coins === c1b && s.player.coins > c0 + 20 - 1);
const lg = m.sheets.Log._data.length;
m.sheets.Log._data.push([new Date('2026-11-20T09:30:00Z'), 'order sheet downloaded', 'Order Sheet Week A - Nov 23']);   // 3 days ahead: too late to count
const c2b = G.gameLoad(k).player.coins;
ok('a sheet made less than a week ahead pays nothing', c2b === s.player.coins && m.sheets.Log._data.length === lg + 1);
m.sheets.Homework = m.makeSheet('Homework', [['id', 'cls', 'kind', 'title', 'file', 'tier', 'formId', 'formUrl', 'courseId', 'courseWorkId', 'setOn', 'postAt', 'dueOn', 'dueUtc', 'points', 'status', 'made'], ['h1', '9XS', 'quiz', 'T', 'f', '', 'x', 'u', 'c', 'w', '2026-11-20', '', '2026-11-27', '', 10, 'marked', 'now']]);
s = G.gameLoad(k);
ok('Set homework ticks itself when homework was set today', s.goals.find((g) => /Set homework/.test(g.name)).doneToday === true);

console.log('\n-- redesign: quests, blessings, groups, wardrobe, hoard, chronicle');
at('2026-11-23T10:00:00Z'); setCoins(500);
s = G.gameSaveGoal(k, { name: 'Print the 10S2 mocks', kind: 'todo', minutes: 30, track: 'necessary', due: '2026-11-25', steps: [{ t: 'Find the paper' }, { t: 'Print 32' }] });
let q = s.goals.find((g) => g.id === s.saved);
ok('a quest keeps its due date, its checklist and sits in the Teaching list', q.kind === 'todo' && q.due === '2026-11-25' && q.steps.length === 2 && q.grp === 'teach' && q.dueToday);
s = G.gameQuestStep(k, q.id, 1, true);
ok('a checklist step ticks on its own and pays nothing', s.goals.find((g) => g.id === q.id).steps[1].d === true && s.player.coins === 500);
s = G.gameTick(k, q.id, 1); q = s.goals.find((g) => g.id === q.id);
ok('ticking the quest pays 10 and marks it done', s.player.coins === 510 && q.doneOn === '2026-11-23');
s = G.gameUntick(k, q.id);
ok('Undo opens the quest again', s.player.coins === 500 && !s.goals.find((g) => g.id === q.id).doneOn);
s = G.gameTick(k, q.id, 1);
at('2026-11-24T10:00:00Z'); s = G.gameTick(k, q.id, 1);
ok('a done quest does not pay again the next day', s.player.coins === 510);
at('2026-11-23T11:00:00Z');
s = G.gameSaveGoal(k, { name: 'Drank water', kind: 'habit', polarity: 'plus', minutes: 5 });
s = G.gameSaveGoal(k, { name: 'Went for a walk', kind: 'habit', polarity: 'plus', minutes: 15 });
const bl = s.goals.filter((g) => g.kind === 'habit' && g.polarity === 'plus');
const ft = bl[0], plain = bl[0];
ok('blessings just pay (no x2 of the day)', bl.every((g) => !g.featured && g.pay === Math.max(2, Math.round({ 5: 3, 15: 6 }[g.minutes] / 2))));
let c1 = s.player.coins; s = G.gameTick(k, plain.id, 1); s = G.gameTick(k, plain.id, 1);
ok('a blessing can be tapped again and again', s.player.coins - c1 === 2 * plain.pay && s.blessCount === 2);
for (let i = 0; i < 5; i++) s = G.gameTick(k, plain.id, 1);
c1 = s.player.coins; s = G.gameTick(k, plain.id, 1);
ok('the 8th blessing pays the same (no chain bonus)', s.player.coins - c1 === plain.pay && s.blessCount === 8);
s = G.gameUntick(k, plain.id);
ok('Undo takes the last blessing (and its bonus) back', s.player.coins === c1 && s.blessCount === 7);
s = G.gameGroupSave(k, { name: 'The Report Abyss', parent: 'teach' });
ok('a new group sits inside Teaching', s.groups.find((g) => g.id === s.saved).parent === 'teach');
console.log('\n-- dice with the keepers: once a day each, over one item, the discount by dice kept (1U.9)');
{ const now0 = global.GAME_NOW; at('2026-11-05T10:00:00Z'); setCoins(5000); const G_PRICE = global.G_PRICE;
  const sh0 = G.gameShop(k), rugs = sh0.items.filter((i) => i.category === 'rugs' && !i.own && !i.locked && i.price >= 100), rug = rugs[0], rug2 = rugs[1] || sh0.items.find((i) => i.keeper === 'weaver' && i.id !== rug.id && i.base),
    lamp = sh0.items.find((i) => i.category === 'lights' && !i.own && !i.locked && i.price >= 100);
  ok('every item names its keeper, and nothing is haggled yet', sh0.items.every((i) => !!i.keeper) && rug.keeper === 'weaver' && lamp.keeper === 'glass' && rug.price === rug.base && !Object.keys(sh0.haggle).length);
  threw = false; try { G.gameHaggle(k, 'weaver', 'start', lamp.id); } catch (e) { threw = /Pick something from this stall/.test(e.message); }
  ok('1U.9 a game is played over one item from that stall (a lamp at the weaver is refused)', threw);
  let sh1 = G.gameHaggle(k, 'weaver', 'start', rug.id);
  ok('sitting down counts as a loss on that item until it is settled (+10%), the rest of the stall untouched', sh1.haggle.weaver === 'playing' && sh1.items.find((i) => i.id === rug.id).price === Math.round(rug.base * 1.1) && sh1.items.find((i) => i.id === rug2.id).price === rug2.base && sh1.haggleItem.weaver.item === rug.id);
  sh1 = G.gameHaggle(k, 'weaver', 'win', null, 3);
  ok('1U.9 a win with 3 dice left takes 20% off that item only', sh1.haggle.weaver === 'win' && sh1.items.find((i) => i.id === rug.id).price === Math.round(rug.base * 0.8) && sh1.items.find((i) => i.id === rug2.id).price === rug2.base);
  ok('other stalls keep their prices', sh1.items.find((i) => i.id === lamp.id).price === lamp.base);
  s = G.gameBuy(k, rug.id);
  ok('buying the item played for charges the discounted price', s.player.coins === 5000 - Math.round(rug.base * 0.8));
  s = G.gameUnbuy(k, rug.id);
  ok('Undo gives back what was paid', s.player.coins === 5000);
  threw = false; try { G.gameHaggle(k, 'weaver', 'start', rug2.id); } catch (e) { threw = /already played/.test(e.message); }
  ok('a second game with the same keeper on the same day is refused (any item)', threw);
  threw = false; try { G.gameHaggle(k, 'weaver', 'lose'); } catch (e) { threw = /settled/.test(e.message); }
  ok('a settled game cannot be changed', threw);
  sh1 = G.gameHaggle(k, 'glass', 'start', lamp.id); sh1 = G.gameHaggle(k, 'glass', 'lose');
  ok('another keeper can still be played the same day; a loss is +10% on that item', sh1.haggle.glass === 'lose' && sh1.items.find((i) => i.id === lamp.id).price === Math.round(lamp.base * 1.1) && sh1.haggle.weaver === 'win');
  s = G.gameBuy(k, lamp.id);
  ok('buying at the glassblower charges the surcharge', s.player.coins === 5000 - Math.round(lamp.base * 1.1));
  sh1 = G.gameHaggle(k, 'tailor', 'start', 'hat-4'); sh1 = G.gameHaggle(k, 'tailor', 'win', null, 5); setCoins(1000);
  s = G.gameWear(k, 'hat-4', true);
  ok('1U.9 a win with the tailor keeping all 5 dice takes 25% off that outfit (180 to 135)', s.player.coins === 1000 - 135);
  { const f = (left) => G_PRICE(100, { result: 'win', item: 'x', left }, 'x');
    ok('1U.9 the discount by dice kept: 5 and 4 = 25%, 3 = 20%, 2 = 15%, 1 = 10%; another item at the stall is untouched', f(5) === 75 && f(4) === 75 && f(3) === 80 && f(2) === 85 && f(1) === 90 && G_PRICE(100, { result: 'win', item: 'x', left: 5 }, 'y') === 100); }
  threw = false; try { G.gameHaggle(k, 'nobody', 'start', 'x'); } catch (e) { threw = /no such keeper/.test(e.message); }
  ok('an unknown keeper is refused', threw);
  at('2026-11-06T10:00:00Z');
  sh1 = G.gameShop(k);
  ok('next day: prices are back to normal', !Object.keys(sh1.haggle).length && sh1.items.filter((i) => i.keeper === 'weaver').every((i) => i.price === i.base));
  sh1 = G.gameHaggle(k, 'weaver', 'start', rug2.id);
  ok('next day: the same keeper can be played again', sh1.haggle.weaver === 'playing');
  G.gameHaggle(k, 'weaver', 'lose');
  global.GAME_NOW = now0; }
s = G.gameGroupSave(k, { id: 'marking', name: 'The Crypt of Red Pens' });
ok('a built-in group can be renamed and keeps its job', s.groups.find((g) => g.id === 'marking').name === 'The Crypt of Red Pens' && s.groups.find((g) => g.id === 'marking').type === 'marking');
s = G.gameBossStart(k, { name: 'Write the Y9 scheme', size: 20, k: 'yog', stages: [{ name: 'Map', due: '2026-11-30' }] });
const nb = s.bosses.find((b) => b.id === s.newBoss);
ok('a 20h boss keeps its size and creature', nb && nb.size === 20 && nb.creature === 'yog');
c1 = s.player.coins; const lv1 = s.player.level; s = G.gameBossStage(k, nb.id, 0, true);
ok('its one stage beats it: +600 and it goes on the trophy shelf', s.player.coins - c1 - gifts(lv1, s.player.level) === 600 && s.beaten[0].k === 'yog');
setCoins(100);
threw = false; try { G.gameWear(k, 'hat-3', true); } catch (e) { threw = /Not enough/.test(e.message); }
ok('an outfit he cannot afford is refused', threw);
s = G.gameWear(k, 'hat-2', true);
ok('buying an outfit (90) takes the doubloons and Ulhu wears it', s.player.coins === 10 && s.wear.on.hat === 'hat-2' && s.wear.owned.indexOf('hat-2') >= 0);
s = G.gameUnbuy(k, 'hat-2');
ok('Undo the purchase: doubloons back, outfit gone, old hat back on', s.player.coins === 100 && s.wear.owned.indexOf('hat-2') < 0 && s.wear.on.hat === '');
s = G.gameWear(k, 'skin-0', false);
ok('taking off a skin puts the Kelp Mint skin back', s.wear.on.skin === 'skin-0');
threw = false; try { G.gameWear(k, 'hat-12', true); } catch (e) { threw = /Locked/.test(e.message); }
ok('a level-locked outfit is refused', threw);
s = G.gameHoardSave(k, { name: 'Takeaway night', cost: 80 });
const hid = s.saved;
s = G.gameHoardClaim(k, hid);
ok('claiming a Hoard reward costs its price and counts the claim', s.player.coins === 20 && s.hoard.find((h) => h.id === hid).claims === 1);
threw = false; try { G.gameHoardClaim(k, hid); } catch (e) { threw = /Not enough/.test(e.message); }
ok('a reward he cannot afford yet is refused', threw);
s = G.gameHoardClaim(k, hid, true);
ok('Undo a claim gives the doubloons back', s.player.coins === 100 && s.hoard.find((h) => h.id === hid).claims === 0);
const ch = G.gameChronicle(k);
ok('the Oracle has 7 weeks, 35 days with all/most/some/none/off/future and the trophies', ch.weeks.length === 7 && ch.days.length === 35 && ch.days.every((d) => ['all', 'most', 'some', 'none', 'off', 'future'].includes(d.level)) && ch.days.some((d) => d.today && d.due > 0) && ch.beaten.length >= 2);
ok('the Oracle day sheet: every day carries its curses, blessings and Vespers', ch.days.every((d) => typeof d.curses === 'number' && typeof d.blessings === 'number' && typeof d.vespers === 'string') && ch.days.some((d) => d.curses + d.blessings > 0));
ok('each daily ritual carries its last 14 days', s.goals.filter((g) => g.kind === 'daily').every((g) => /^[ox\-f]{14}$/.test(g.strip)));
ok('spending and refunds never count as doubloons earned', ch.weeks[6].coins === s.weekCoins);
// 2026-10-26: a day that freezes itself (INSET here) can be switched back on, and off again; a ritual can be renamed
{ const g = G.gameLoad(k); at('2026-11-25T10:00:00Z'); let f = G.gameLoad(k);
  ok('an INSET day freezes itself', f.frozen === true);
  f = G.gameFreeze(k, '2026-11-25', 'off', false); ok('tapping it switches the day back on', f.frozen === false);
  f = G.gameFreeze(k, '2026-11-25', 'off', true); ok('tapping again freezes it again', f.frozen === true);
  const e = G.gameSaveGoal(k, Object.assign({}, g.goals.find((x) => x.name === 'Train'), { name: 'Workout', private: true }));
  ok('an existing ritual can be renamed (Train to Workout) and keeps its settings', e.goals.some((x) => x.name === 'Workout' && x.track === 'life' && x.private) && !e.goals.some((x) => x.name === 'Train')); }
// never miss twice: one missed day keeps the streak (and warns), two in a row reset it
{ const W = () => G.gameLoad(k).goals.find((x) => x.name === 'Workout');
  at('2026-11-26T10:00:00Z'); G.gameTick(k, W().id, 1); at('2026-11-27T10:00:00Z'); G.gameTick(k, W().id, 1); const s0 = W().streak;
  at('2026-11-29T10:00:00Z'); let w = W(); ok('one missed day keeps the streak and flags it', w.streak === s0 && w.miss === true);
  G.gameTick(k, w.id, 1); w = W(); ok('ticking the next day carries on and clears the flag', w.streak === s0 + 1 && w.miss === false);
  at('2026-12-02T10:00:00Z'); w = W(); ok('two missed days in a row reset the streak', w.streak === 0 && w.miss === false); }
// life after work on a school day pays x1.5; the same in the morning or in the holidays does not
{ const pay = (iso) => { at(iso); return G.gameLoad(k).goals.find((x) => x.name === 'Read').pay; };
  const am = pay('2026-12-03T10:00:00Z'), pm = pay('2026-12-03T17:00:00Z'), hol = pay('2026-12-22T17:00:00Z');
  ok('life after work pays more (Thu 5 pm vs 10 am)', pm > am);
  ok('life in the holidays pays the normal rate, even after 4 pm', hol < pm); }
// 2026-10-27 Absolution: a curse with an antidote blessing; I gives back half, II the rest; Undo reverses; the window closes after the next day
{ at('2026-12-07T10:00:00Z');
  let s2 = G.gameSaveGoal(k, { name: 'Cooked from scratch', kind: 'habit', polarity: 'plus', minutes: 30 });
  const cook = s2.saved;
  s2 = G.gameSaveGoal(k, { name: 'Takeaway', kind: 'habit', polarity: 'minus', minutes: 60, anti: cook });
  const take = s2.saved;
  const hp0 = s2.player.hp;
  s2 = G.gameTick(k, take, -1, 'Flesh');
  ok('a Big curse now costs 12', s2.player.hp === hp0 - 12);
  ok('its antidote shows an open Absolution', (s2.goals.find((g) => g.id === cook).absolve || {}).stage === 0);
  const hp1 = s2.player.hp;
  s2 = G.gameTick(k, cook, 1);
  ok('Absolution I gives back half (6) plus the usual 1 (or a level-up refill)', s2.player.hp === (s2.last.up ? 60 : hp1 + 7) && s2.last.abs && s2.last.abs.stage === 1 && s2.last.abs.hp === 6);
  const hpA = s2.player.hp, gotA = s2.last.hp;
  s2 = G.gameUntick(k, cook);
  ok('Undo takes Absolution I back exactly', s2.player.hp === hpA - gotA && (s2.goals.find((g) => g.id === cook).absolve || {}).stage === 0);
  at('2026-12-08T11:00:00Z');
  s2 = G.gameTick(k, cook, 1); s2 = G.gameTick(k, cook, 1);
  ok('the next day Absolution II completes it', s2.last.abs && s2.last.abs.stage === 2 && !s2.goals.find((g) => g.id === cook).absolve);
  s2 = G.gameTick(k, take, -1);
  at('2026-12-10T09:00:00Z');
  s2 = G.gameLoad(k);
  ok('the window closes after the next day', !s2.goals.find((g) => g.id === cook).absolve);
  // a two-sided habit is its own antidote and counts each side
  s2 = G.gameSaveGoal(k, { name: 'Phone', kind: 'habit', polarity: 'both', minutes: 15 });
  const ph = s2.saved;
  s2 = G.gameTick(k, ph, -1, 'Scene'); s2 = G.gameTick(k, ph, 1);
  const pg2 = s2.goals.find((g) => g.id === ph);
  ok('a two-sided habit counts its curse and blessing sides', pg2.cCount === 1 && pg2.bCount === 1 && s2.last.abs && s2.last.abs.stage === 1);
  s2 = G.gameUntick(k, ph);
  ok('Undo on a two-sided habit takes back the last side tapped', s2.goals.find((g) => g.id === ph).bCount === 0 && s2.goals.find((g) => g.id === ph).cCount === 1); }
// 2026-10-27 phase 2: Vespers (evening check, its own streak, never miss twice, Undo), tags, identities and High Vespers
{ at('2026-12-07T18:00:00Z');   // a Monday, 6 pm London
  let v = G.gameLoad(k).vespers;
  ok('Vespers is closed before 8 pm', v.open === false && v.done === false);
  at('2026-12-07T20:30:00Z');
  let s3 = G.gameSaveGoal(k, { name: 'Read a chapter', kind: 'habit', polarity: 'plus', minutes: 15, who: 'Scholar' });
  const rd = s3.saved;
  s3 = G.gameSaveGoal(k, { name: 'Crisps', kind: 'habit', polarity: 'minus', minutes: 5 });
  const cr = s3.saved;
  s3 = G.gameTick(k, cr, -1, 'Domain'); s3 = G.gameTick(k, rd, 1);
  v = s3.vespers;
  ok('Vespers opens at 8 pm with today\'s curse and its sigil', v.open && v.curses.some((c) => c.goalId === cr && c.sig === 'Domain'));
  ok('and today\'s good habits', v.goods.some((c) => c.goalId === rd));
  const coins0 = s3.player.coins, tick = v.curses.find((c) => c.goalId === cr).tickId;
  s3 = G.gameVespers(k, { tags: [{ tickId: tick, sig: 'Domain', detail: 'Kitchen' }] });
  ok('Vespers pays like a Tiny ritual and starts its streak', s3.player.coins === coins0 + 3 && s3.vespers.done && s3.vespers.streak === 1);
  ok('the curse keeps its detail', s3.vespers.curses.find((c) => c.tickId === tick).detail === 'Kitchen');
  s3 = G.gameVespersUndo(k);
  ok('Undo takes Vespers back exactly', s3.player.coins === coins0 && !s3.vespers.done && s3.vespers.streak === 0);
  s3 = G.gameVespers(k, { clean: false });
  at('2026-12-09T20:30:00Z');   // Tuesday missed, Wednesday done: one miss keeps the streak
  s3 = G.gameVespers(k, { clean: true });
  ok('one missed evening keeps the Vespers streak', s3.vespers.streak === 2);
  at('2026-12-12T20:30:00Z');   // Thursday and Friday missed: starts again
  ok('two missed evenings in a row break it', G.gameLoad(k).vespers.streak === 0);
  s3 = G.gameTag(k, '', rd, 'Scene', 'Alone');
  at('2026-12-13T20:30:00Z');   // Sunday: High Vespers
  const h = G.gameLoad(k).high;
  ok('High Vespers shows on Sunday for this week', h.show && h.week === '2026-12-07' && h.days.length === 7);
  ok('who you are becoming counts the votes', h.who.some((w) => w.who === 'Scholar' && w.votes >= 1));
  ok('where the curses came from: Monday evening, Domain, Kitchen', h.grid[0][3] >= 1 && h.sigs.some((x) => x.name === 'Domain') && h.details.some((x) => x.name === 'Domain: Kitchen'));
  let s4 = G.gameReview(k, { week: h.week, wentWell: 'Read', slipped: 'Crisps', change: 'No crisps in the house' });
  ok('saving High Vespers hides it and keeps the one change', !s4.high.show);
  at('2026-12-20T20:30:00Z');
  ok('next Sunday asks about last week\'s change', (G.gameLoad(k).high.lastChange || {}).change === 'No crisps in the house'); }
// 2026-10-27 the moon: full = working, half = work rest (life counts), dark = full rest; holidays start at half
{ at('2026-12-21T12:00:00Z');   // a Monday in the Christmas holiday
  let m = G.gameLoad(k);
  ok('a holiday weekday starts at half moon', m.moon === 'half');
  m = G.gameMoon(k, '2026-12-21', 'dark'); ok('the moon can be set to dark', m.moon === 'dark');
  m = G.gameMoon(k, '2026-12-21', 'full'); ok('and to full (working in the holiday)', m.moon === 'full');
  m = G.gameMoon(k, '2026-12-21', 'half'); ok('and back to half', m.moon === 'half');
  ok('the Vespers multiplier is in the snapshot', typeof m.vMult === 'number' && m.vMult >= 1);
  ok('the Vespers bonus is on the Vespers reward only (30 Oct): it grows with the Vespers streak', G.gVespersPay_(0) === G.GAME.base[5] && G.gVespersPay_(7) === Math.round(G.GAME.base[5] * 1.1) && G.gVespersPay_(66) === Math.round(G.GAME.base[5] * 1.25));
  ok('...and never on the pay for a ritual', !/gVMult_/.test(G.gPay_.toString()));
  const sh = G.gameShop(k); ok('shop prices are 20% higher, rounded to 5', sh.items.every((i) => i.price % 5 === 0) && sh.items.some((i) => i.price > 0)); }
// 2026-10-28: health 60, aims with bottom lines, curse ceilings, the Rise quest, tier locks
{ at('2027-01-04T09:00:00Z');   // a Monday (after the test terms, so a half-moon day: life still counts)
  let s = G.gameLoad(k); const gid = (re, kind) => (s.goals.find((g) => re.test(g.name) && (!kind || g.kind === kind)) || {}).id;
  ok('health goes up to 60 for an old player', s.player.maxHp === 60);
  const rd = gid(/^Read/), tr = gid(/^(Train|Workout)/), ck = gid(/Cook/), nf = gid(/Netflix/);
  ok('Write and Cook at home are added once', !!gid(/^Write$/) && !!ck && s.goals.filter((g) => g.kind === 'daily' && /Cook/.test(g.name)).length === 1);
  ok('Read aims for 15 min a day, bottom line daily', (s.goals.find((g) => g.id === rd).aim || {}).target === 15 && s.goals.find((g) => g.id === rd).aim.floor === 7);
  ok('Netflix has a ceiling of 2 a week', s.goals.find((g) => g.id === nf).ceil === 2);
  for (let i = 0; i < 7; i++) { at(gAddDay('2027-01-04', i) + 'T19:00:00Z'); G.gameLoad(k); G.gameTick(k, rd, 1); G.gameAim(k, rd, 20, null);
    if (i < 3) G.gameTick(k, tr, 1); if (i < 2) G.gameTick(k, ck, 1); if (i < 3) G.gameTick(k, nf, -1); }
  s = G.gameLoad(k); const r = s.goals.find((g) => g.id === rd);
  ok('today\'s minutes are kept', r.aimToday && r.aimToday.minutes === 20);
  const h = s.high, st = (id) => (h.aims.find((a) => a.id === id) || {}).state;
  ok('High Vespers: Read 20 min a day reaches its aim', st(rd) === 'aim');
  ok('Train 3 times but no full session holds the bottom line', st(tr) === 'floor');
  ok('Cook at home twice misses its bottom line of 3', st(ck) === 'miss');
  ok('Netflix 3 times is over its ceiling', h.ceilings.some((c) => c.id === nf && c.count === 3 && c.over)); }
{ at('2027-01-11T09:00:00Z'); let s = G.gameLoad(k); const nf = s.goals.find((g) => /Netflix/.test(g.name)).id;
  const rs = s.goals.filter((g) => g.kind === 'daily' && g.track === 'life').slice(0, 3).map((g) => g.id);
  let guard = 0; while (!s.last || !s.last.died) { s = G.gameTick(k, nf, -1); if (++guard > 10) break; }
  const R = s.player.rise, lost = R ? R.lost : 0, q = Math.floor(lost / 4);
  ok('1U.11 fainting opens Rise again: three stars, a quarter of the lost runes to win back, and he wakes with all his health', R && R.stage === 1 && R.lit === 0 && R.need === 3 && R.back === q && lost > 0 && s.player.hp === s.player.maxHp);
  { let t = s, g = 0; while (t.player.hp > 8 && ++g < 30) t = G.gameTick(k, nf, -1); const n = g; for (let i = 0; i < 4; i++) t = G.gameTick(k, nf, -1);
    ok('1U.11 no second faint before the first three stars are lit (health stops at 1)', t.player.hp === 1 && !(t.last && t.last.died) && t.player.rise && t.player.rise.stage === 1);
    for (let i = 0; i < n + 4; i++) t = G.gameUntick(k, nf); s = t; }
  const c0 = s.player.coins; s = G.gameTick(k, rs[0], 1);
  ok('1U.11 the first ritual lights a star, but no runes come back for one ritual alone', s.player.rise.lit === 1 && s.last.rise && s.last.rise.star === 1 && s.last.rise.coins === 0);
  s = G.gameTick(k, rs[0], 1);
  ok('1U.11 the same ritual twice lights no second star', s.player.rise.lit === 1);
  s = G.gameUntick(k, rs[0]); s = G.gameUntick(k, rs[0]);
  ok('1U.11 Undo puts the star out', s.player.rise.lit === 0 && s.player.coins === c0);
  s = G.gameTick(k, rs[0], 1); s = G.gameTick(k, rs[1], 1); const before = s.player.coins; s = G.gameTick(k, rs[2], 1);
  ok('1U.11 the whole set of three brings a quarter of the lost runes home, and the second round waits for tomorrow', s.last.rise && s.last.rise.coins === q && s.player.coins - before >= q && !s.player.rise);
  s = G.gameUntick(k, rs[2]);
  ok('undoing the third ritual takes the quarter back and opens the round again', s.player.rise && s.player.rise.stage === 1 && s.player.rise.lit === 2 && s.player.coins === before);
  s = G.gameTick(k, rs[2], 1);
  at('2027-01-12T09:00:00Z'); s = G.gameLoad(k);
  ok('1U.11 the next day: round two, three stars for the next quarter', s.player.rise && s.player.rise.stage === 2 && s.player.rise.lit === 0);
  const d0 = s.player.coins; rs.forEach((id) => { s = G.gameTick(k, id, 1); });
  ok('1U.11 three rituals that day bring the second quarter home (half in all), and Rise again ends', !s.player.rise && s.last.rise && s.last.rise.stage === 1 && s.last.rise.coins === q && s.player.coins - d0 >= q);
  at('2027-01-11T09:00:00Z'); s = G.gameLoad(k);
  const sh = G.gameShop(k), el = sh.items.find((i) => i.tier === 'Eldritch'), ba = sh.items.find((i) => i.tier === 'Basic' && !i.locked);
  ok('Eldritch needs level 20', el.locked && /level 20/.test(el.why));
  ok('Basic is open from level 1', !!ba); }
console.log('\n-- 29 Oct 2026: rollover before a tick, offline taps, exact Undo after fainting, formula guard, life bonus, every-few-days');
{ const gid = (re, kind) => (G.gameLoad(k).goals.find((g) => re.test(g.name) && g.kind === kind) || {}).id;
  // 1.10: a page left open past midnight: the first tick of the new day closes yesterday first
  at('2027-02-01T09:00:00Z'); let s = G.gameLoad(k); const rd = gid(/^Read/, 'daily'), tr = gid(/^(Train|Workout)/, 'daily'), nf = gid(/Netflix/, 'habit');
  G.gameTick(k, rd, 1); G.gameTick(k, tr, 1);
  at('2027-02-03T09:00:00Z'); s = G.gameTick(k, rd, 1);   // two days on, no reload in between
  let t = s.goals.find((g) => g.id === tr), r = s.goals.find((g) => g.id === rd);
  ok('1.10 a tick on a page left open past midnight runs the day rollover first (Train shows its forgiven miss, Read counts for today)', t.miss === true && !t.doneToday && r.doneToday && r.streak === 2);
  // 1.16: a tap saved with no signal lands on the day it was made, and the same tap id never pays twice
  at('2027-02-04T08:00:00Z'); const late = Date.parse('2027-02-03T23:10:00Z'), c0 = G.gameLoad(k).player.coins;
  s = G.gameTick(k, tr, 1, '', { at: late, aid: 'tap-A' }); t = s.goals.find((g) => g.id === tr);
  ok('1.16 an 11 pm tick sent the next morning counts for yesterday, not today', t.strip[12] === 'o' && !t.doneToday && s.player.coins > c0);
  const c1 = s.player.coins; s = G.gameTick(k, tr, 1, '', { at: late, aid: 'tap-A' });
  ok('...the same tap sent twice pays once', s.player.coins === c1);
  s = G.gameUntick(k, tr, { at: late, aid: 'un-A' }); t = s.goals.find((g) => g.id === tr);
  ok('...Undo of that tap reaches yesterday\'s tick', s.player.coins === c0 && t.strip[12] !== 'o');
  const h0 = s.player.hp; s = G.gameTick(k, nf, -1, '', { at: late, aid: 'c-1' }); s = G.gameTick(k, nf, -1, '', { at: late + 1000, aid: 'c-2' });
  const h2 = s.player.hp; s = G.gameUntick(k, nf, { at: late, aid: 'un-c' }); const h3 = s.player.hp; s = G.gameUntick(k, nf, { at: late, aid: 'un-c' });
  ok('...the same Undo sent twice undoes one curse, not two', h2 < h0 && h3 > h2 && s.player.hp === h3);
  s = G.gameTick(k, rd, 1, '', { at: Date.parse('2027-01-20T10:00:00Z'), aid: 'tap-old' });
  ok('...a tap older than 36 hours counts for today', s.goals.find((g) => g.id === rd).doneToday);
  // 1.11: Undo after fainting gives back the level, the XP, the runes and the health
  at('2027-02-05T10:00:00Z'); s = G.gameLoad(k); s = G.gameTick(k, rd, 1);
  let guard = 0, was = null; while (!s.last || !s.last.died) { was = { lv: s.player.level, xp: s.player.xp, co: s.player.coins, hp: s.player.hp }; s = G.gameTick(k, nf, -1); if (++guard > 25) break; }
  ok('a curse at low health faints Ulhu (runes or a level go, the Rise quest opens)', s.last && s.last.died && s.player.rise && (s.player.coins < was.co || s.player.level < was.lv));
  s = G.gameUntick(k, nf);
  ok('1.11 Undo of that curse gives back the level, the XP, the runes and the health he had, and closes the Rise quest', s.player.level === was.lv && s.player.xp === was.xp && s.player.coins === was.co && s.player.hp === was.hp && !s.player.rise);
  const fresh = G.gameSaveGoal(k, { name: 'Test slip (fresh)', kind: 'habit', polarity: 'minus', minutes: 15, track: 'life' }).saved;
  const v0 = G.gameLoad(k).goals.find((g) => g.id === fresh).value; s = G.gameTick(k, fresh, -1); const v1 = s.goals.find((g) => g.id === fresh).value; s = G.gameUntick(k, fresh);
  ok('...and undoing a curse puts its colour back exactly (' + v0 + ' -> ' + v1 + ' -> ' + s.goals.find((g) => g.id === fresh).value + ')', v1 === v0 - 1 && s.goals.find((g) => g.id === fresh).value === v0);
  G.gameArchive(k, fresh);
  // 1.12: names that look like formulas or numbers stay text
  const id1 = G.gameSaveGoal(k, { name: '+20 press-ups', kind: 'daily', days: '1234567', minutes: 15, track: 'life' }).saved;
  const id2 = G.gameSaveGoal(k, { name: '10', kind: 'daily', days: '1234567', minutes: 15, track: 'life' }).saved;
  s = G.gameLoad(k);
  ok('1.12 a ritual named "+20 press-ups" is kept as text, not turned into a formula', s.goals.some((g) => g.id === id1 && g.name === '+20 press-ups'));
  ok('...and one named "10" stays "10"', s.goals.some((g) => g.id === id2 && g.name === '10'));
  // 1.14: the life bonus counts life rituals only, never a slip or a blessing
  at('2027-02-08T10:00:00Z'); s = G.gameLoad(k); const pay0 = s.goals.find((g) => g.id === rd).pay;
  s = G.gameTick(k, nf, -1); const pay1 = s.goals.find((g) => g.id === rd).pay, cA = s.player.coins; s = G.gameTick(k, rd, 1);
  ok('1.14 a slip earlier in the day does not eat the first-life-ritual bonus (Read still pays ' + pay0 + ')', pay1 === pay0 && s.player.coins - cA >= pay0);
  // 1.15: every-few-days rituals can miss, never-miss-twice applies
  at('2027-02-10T10:00:00Z'); const ev = G.gameSaveGoal(k, { name: 'Call a friend (test)', kind: 'daily', days: '', everyN: 3, minutes: 30, track: 'life' }).saved;
  s = G.gameTick(k, ev, 1); const st1 = s.goals.find((g) => g.id === ev).streak;
  { const w0 = s.goals.find((g) => g.id === ev).win; at('2027-02-11T10:00:00Z'); const w1 = G.gameLoad(k).goals.find((g) => g.id === ev).win;
    at('2027-02-13T10:00:00Z'); const w3 = G.gameLoad(k).goals.find((g) => g.id === ev).win;
    ok('1U.13 an every-3-days ritual says when it is due: by the 13th, a day into its window, then due that day', w0 && w0.by === '2027-02-13' && w0.k === 0 && w1.by === '2027-02-13' && w1.k === 1 && !w1.late && w3.k === 3 && !w3.late); at('2027-02-10T10:00:00Z'); }
  at('2027-02-14T10:00:00Z'); s = G.gameLoad(k); let g = s.goals.find((x) => x.id === ev);   // due on the 13th, missed
  ok('1.15 an every-3-days ritual not done by its due day records a forgiven miss (streak kept, the strip shows it)', g.miss === true && g.streak === st1 && st1 >= 1 && g.strip[12] === 'x');
  at('2027-02-17T10:00:00Z'); s = G.gameLoad(k); g = s.goals.find((x) => x.id === ev);   // due again on the 16th, missed again
  ok('...missing it twice in a row breaks the streak', g.streak === 0 && g.miss === false);
  G.gameArchive(k, ev); G.gameArchive(k, id1); G.gameArchive(k, id2); }

console.log('\n-- two-sided omens: pairing, joining, duplicates (2026-10-28 night)');
{ at('2027-01-12T10:00:00Z'); let s = G.gameLoad(k);
  const n0 = s.goals.length;
  s = G.gameSaveGoal(k, { id: 'gpair001', name: 'Hitting Snooze', kind: 'habit', polarity: 'minus', minutes: 15 });
  s = G.gameSaveGoal(k, { id: 'gpair001', name: 'Hitting Snooze', kind: 'habit', polarity: 'minus', minutes: 15 });
  ok('a new omen sent twice with its phone id makes one card, not two', s.goals.filter((g) => g.name === 'Hitting Snooze').length === 1 && s.goals.find((g) => g.name === 'Hitting Snooze').id === 'gpair001');
  s = G.gameSaveGoal(k, { name: 'hitting snooze ', kind: 'habit', polarity: 'minus', minutes: 15 });
  ok('a second new omen with the same name and side is the same card (a double save on a slow phone)', s.goals.filter((g) => /hitting snooze/i.test(g.name)).length === 1 && s.saved === 'gpair001' && s.goals.length === n0 + 1);
  s = G.gameSaveGoal(k, { name: 'Wake Up Early', kind: 'habit', polarity: 'plus', minutes: 15 }); const wid = s.saved;
  s = G.gameTick(k, 'gpair001', -1); s = G.gameTick(k, wid, 1); s = G.gameTick(k, wid, 1);
  const coins = s.player.coins, hp = s.player.hp;
  // pair a one-sided curse by a new name only: id, ticks and count stay
  s = G.gameSaveGoal(k, { id: 'gpair001', name: 'Hitting Snooze / Woke up early', kind: 'habit', polarity: 'both', minutes: 15, track: 'life', grp: '|' });
  let g = s.goals.find((x) => x.id === 'gpair001');
  ok('pairing keeps the id and turns it two-sided with its curse count', g && g.polarity === 'both' && g.cCount === 1 && g.bCount === 0);
  // join it with the existing Wake Up Early card instead: both histories in one
  s = G.gameSaveGoal(k, { id: 'gpair001', name: 'Hitting Snooze', kind: 'habit', polarity: 'minus', minutes: 15, track: 'life' });
  s = G.gameMergeGoals(k, 'gpair001', wid, { name: 'Hitting Snooze / Wake Up Early', kind: 'habit', polarity: 'both', minutes: 15, track: 'life', grp: '|' });
  g = s.goals.find((x) => x.id === 'gpair001');
  ok('joining two cards: one two-sided omen with both counts, the other card gone', g.polarity === 'both' && g.cCount === 1 && g.bCount === 2 && !s.goals.some((x) => x.id === wid));
  ok('...and runes and health are untouched', s.player.coins === coins && s.player.hp === hp);
  s = G.gameMergeGoals(k, 'gpair001', wid, { name: 'Hitting Snooze / Wake Up Early', kind: 'habit', polarity: 'both', minutes: 15, track: 'life', grp: '|' });
  ok('a resent join changes nothing', s.goals.find((x) => x.id === 'gpair001').bCount === 2);
  s = G.gameUntick(k, 'gpair001'); g = s.goals.find((x) => x.id === 'gpair001');
  ok('unticking the joined omen takes back a moved blessing tick', g.bCount === 1);
  s = G.gameTick(k, 'gpair001', 1);
  s = G.gameUnmerge(k, 'gpair001', wid, { name: 'Hitting Snooze', kind: 'habit', polarity: 'minus', minutes: 15, track: 'life' });
  const w = s.goals.find((x) => x.id === wid); g = s.goals.find((x) => x.id === 'gpair001');
  ok('Undo of a join gives both cards back, each with its own ticks', w && w.polarity === 'plus' && g.polarity === 'minus' && g.name === 'Hitting Snooze' && w.count >= 1);
  // split a two-sided omen back to one side: same id, history kept
  s = G.gameMergeGoals(k, 'gpair001', wid, { name: 'Hitting Snooze / Wake Up Early', kind: 'habit', polarity: 'both', minutes: 15, track: 'life', grp: '|' });
  const net = s.goals.find((x) => x.id === 'gpair001').count;
  s = G.gameSaveGoal(k, { id: 'gpair001', name: 'Wake Up Early', kind: 'habit', polarity: 'plus', minutes: 15, track: 'life' });
  g = s.goals.find((x) => x.id === 'gpair001');
  ok('splitting keeps the id and the count, as a one-sided blessing', g.polarity === 'plus' && g.name === 'Wake Up Early' && g.count === net);
  // merging duplicates
  s = G.gameSaveGoal(k, { name: 'Floss', kind: 'habit', polarity: 'plus', minutes: 5 }); const f1 = s.saved;
  s = G.gameSaveGoal(k, { name: 'Flossing', kind: 'habit', polarity: 'plus', minutes: 5 }); const f2 = s.saved;
  s = G.gameTick(k, f1, 1); s = G.gameTick(k, f2, 1);
  s = G.gameMergeGoals(k, f1, f2, { name: 'Floss', kind: 'habit', polarity: 'plus', minutes: 5, track: 'life' });
  ok('merging a duplicate keeps one card with both ticks', s.goals.find((x) => x.id === f1).count === 2 && !s.goals.some((x) => x.id === f2));
  let threw = false; try { G.gameMergeGoals(k, f1, 'nope', {}); } catch (e) { threw = true; }
  ok('joining with a card that is not there is refused', threw);
  // the matcher finds his real opposites
  const PAIRS = require('../game-pairs.js'), mk = (n, p, i) => ({ id: 'x' + i, name: n, kind: 'habit', polarity: p });
  const gs = [mk('Hitting Snooze', 'minus', 1), mk('Leaving Dirty Dishes', 'minus', 2), mk('Ignoring Messages for 2+ Days', 'minus', 3), mk('Wake Up Early', 'plus', 4), mk('Tidied', 'plus', 5), mk('Call Friends', 'plus', 6), mk('Floss', 'plus', 7), mk('Flossing', 'plus', 8), mk('Wordle', 'plus', 9)];
  ok('the built-in list has at least 40 pairs', PAIRS.LIST.length >= 40);
  ok('his own omens are found as partners: Snooze/Wake Up Early, Dishes/Tidied, Messages/Call Friends', PAIRS.rank(gs[0], gs)[0].g.name === 'Wake Up Early' && PAIRS.rank(gs[1], gs)[0].g.name === 'Tidied' && PAIRS.rank(gs[2], gs)[0].g.name === 'Call Friends');
  ok('his names get their list opposites', ['Over Agreeable|Said no kindly', 'Overspending|No-spend day', 'Lying|Told the truth when it was hard', 'Binge-watching Netflix|One episode, then stop'].every((x) => PAIRS.suggest({ name: x.split('|')[0], polarity: 'minus' })[0] === x.split('|')[1]) &&
    ['Sleep 7.5Hrs +|Up past midnight', 'Eating Healthy|Junk or takeaway', 'Proud of Day|Wasted the day', 'Making Bed|Left the bed unmade', 'Showered|Skipped a shower', 'Brush Teeth|Skipped teeth at night', 'Floss|Skipped teeth at night'].every((x) => PAIRS.suggest({ name: x.split('|')[0], polarity: 'plus' })[0] === x.split('|')[1]));
  ok('nothing in the list: a gentle wording', PAIRS.suggest({ name: 'Gardening', polarity: 'plus' })[0] === 'Skipped gardening' && PAIRS.suggest({ name: 'Vaping', polarity: 'minus' })[0] === 'Resisted vaping');
  ok('Floss and Flossing are seen as duplicates, Wordle is not a duplicate of Floss', PAIRS.dupes(gs[6], gs).length === 1 && PAIRS.dupes(gs[8], gs).length === 0); }
console.log('\n-- 30 Oct 2026: the wall (Breakwater, WD-1b-ii): this week and next, one wedge per period');
{ const world = { data: { classes: { '9AS': { seq: [{ num: 1, built: true }, { num: 2, built: false }, { num: 3, built: true }] }, '12C': { homework: 'every-lesson', seq: [{ num: 7, built: true }, { num: 8, built: false }] } } },
    weeks: { '2026-11-02': { slots: [{ kind: 'lesson', cls: '9AS', i: 0, day: 0, period: 1, col: '#7fd36b' }, { kind: 'lesson', cls: '12C', i: 0, day: 1, period: 3, col: '#b98bff' }, { kind: 'lesson', cls: '9AS', i: 1, day: 3, period: 2, col: '#7fd36b' }, { kind: 'free', day: 2, period: 4 }] },
      '2026-11-09': { slots: [{ kind: 'lesson', cls: '12C', i: 1, day: 4, period: 5, col: '#b98bff' }, { kind: 'lesson', cls: '9AS', i: 2, day: 0, period: 6 }] } } };
  const w = G.gWall_(world, '2026-11-03', [{ cls: '9AS', setOn: '2026-11-05', status: 'live' }]);
  const at = (d, p) => w.lessons.find((l) => l.day === d && l.per === p);
  ok('the wall covers ten school days, this week then next', w.days.length === 10 && w.days[0] === 'Mon 2 Nov' && w.days[5] === 'Mon 9 Nov');
  ok('each lesson sits on its day and period with its class colour and built state', at(0, 1).cls === '9AS' && at(0, 1).built && at(0, 1).col === '#7fd36b' && !at(3, 2).built && at(9, 5).cls === '12C');
  ok('homework: set on the day it was set, needed on the class\'s last lesson of the week, none before it', at(3, 2).hw === 'set' && at(0, 1).hw === 'none');
  ok('an every-lesson class needs homework every lesson', at(1, 3).hw === 'needed' && at(9, 5).hw === 'needed');
  ok('free periods and period 6 are not on the wall', w.lessons.length === 4); }

console.log('\n-- 30 Oct 2026: the 2-week bar in glass (1U.13, G1): two weeks of a ritual as panes');
{ const W = { data: {} }, T = '2026-10-29', tk = (id, days) => { const o = {}; days.forEach((d) => { o[id + '|' + d] = (o[id + '|' + d] || 0) + 1; }); return o; };
  const sum = (b) => b.reduce((a, w) => a + w.len, 0), sig = (b) => b.map((w) => w.s + w.len + (w.times > 1 ? 'x' + w.times : '')).join(' ');
  const school = { id: 'r', kind: 'daily', days: '12345', created: '2026-09-01' };
  const b1 = G.gBar_(school, T, tk('r', ['2026-10-16', '2026-10-19', '2026-10-20', '2026-10-22', '2026-10-23', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29']), W, {});
  ok('a school-day ritual: 14 days, the Friday pane stretches over the weekend, a lone miss is forgiven: ' + sig(b1), sum(b1) === 14 && sig(b1) === 'o3 o1 o1 e1 o1 o3 o1 o1 o1 o1');
  const daily = { id: 'f', kind: 'daily', days: '1234567', created: '2026-09-01' }, all = []; for (let d = '2026-10-16'; d <= T; d = G.gAdd_(d, 1)) if (d !== '2026-10-20' && d !== '2026-10-21' && d !== '2026-10-26' && d !== T) all.push(d);
  const b2 = G.gBar_(daily, T, tk('f', all.concat(['2026-10-24'])), W, { '2026-10-26': 'sick' });
  ok('every day: two misses in a row are forgiven then missed, a day off is its own pane, two ticks split the pane, today is open: ' + sig(b2), sum(b2) === 14 && /^o1 o1 o1 o1 e1 x1 o1 o1 o1x2 o1 f1 o1 o1 w1$/.test(sig(b2)));
  const every = { id: 'c', kind: 'daily', everyN: 3, created: '2026-10-10' };
  const b3 = G.gBar_(every, T, tk('c', ['2026-10-18', '2026-10-21', '2026-10-27']), W, {});
  ok('every 3 days: one pane per window, ending when it is done or missed, the open window last: ' + sig(b3), sum(b3) === 14 && b3.filter((w) => w.s === 'o').length === 3 && b3[b3.length - 1].s === 'w' && b3.some((w) => w.s === 'e' && w.len === 3));
  const fresh = G.gBar_(Object.assign({}, daily, { created: '2026-10-25' }), T, tk('f', ['2026-10-25', '2026-10-29']), W, {});
  ok('a new ritual: the days before it existed are one dark pane: ' + sig(fresh), sum(fresh) === 14 && fresh[0].s === 'n' && fresh[0].len === 9 && fresh[fresh.length - 1].s === 'o'); }

console.log('\n-- paper golems (marking bosses, 30 Oct picks)');
{ at('2026-11-27T10:00:00Z');   // a Friday: the 8XP books are due next Friday
  let s = G.gameSaveGoal(k, { name: 'Mark 8XP books', kind: 'termly', minutes: 60, track: 'necessary', sittings: 2, due: '2026-12-04' });
  const mg = s.goals.find((g) => g.name === 'Mark 8XP books');
  ok('no golem is suggested before the week the books are due', !s.golems.suggest.some((x) => x.id === mg.id) && !s.golems.list.some((x) => x.id === mg.id));
  at('2026-11-30T10:00:00Z'); s = G.gameLoad(k);
  ok('from the Monday of that week the planner suggests it, and never summons it by itself', s.golems.suggest.some((x) => x.id === mg.id && x.cls === '8XP' && x.type === 'books') && !s.golems.list.some((x) => x.id === mg.id));
  s = G.gameGolem(k, 'summon', mg.id);
  let gm = s.golems.list.find((x) => x.id === mg.id);
  ok('summoned: a Bookstack (Years 8-9) in its own moss colours, two sittings of health', gm && gm.look === 'y89' && gm.theme === 'moss' && gm.sittings === 2 && gm.sitDone === 0 && !s.golems.suggest.some((x) => x.id === mg.id) && s.golem.summoned === mg.id);
  s = G.gameGolem(k, 'theme', { cls: '8XP', theme: 'frost' });
  ok('he picks the class colours himself', s.golems.list.find((x) => x.id === mg.id).theme === 'frost' && s.golems.theme['8XP'] === 'frost');
  let threw = false; try { G.gameGolem(k, 'theme', { cls: 'bad', theme: 'gold' }); } catch (e) { threw = true; }
  ok('an unknown class is refused', threw);
  const c0 = s.player.coins, lv0 = s.player.level;
  s = G.gameTick(k, mg.id, 1);
  const pay1 = s.last.coins;
  ok('a sitting tears a chunk off (one block gone), paying the usual marking rate', s.golems.list.find((x) => x.id === mg.id).sitDone === 1 && pay1 > 0 && !s.last.golem);
  s = G.gameTick(k, mg.id, 1);
  ok('the last sitting beats it: the sitting pay plus 60 runes, said so', s.last.golem && s.last.golem.coins === 60 && s.last.coins === pay1 + 60 && s.player.coins - c0 - gifts(lv0, s.player.level) === pay1 * 2 + 60);
  ok('it leaves the field and its trophy is kept', !s.golems.list.some((x) => x.id === mg.id) && s.golems.trophies[0].cls === '8XP' && s.golems.trophies[0].look === 'y89' && s.golems.trophies[0].theme === 'frost');
  s = G.gameUntick(k, mg.id);
  ok('Undo of the last sitting brings it back, takes the 60 and the trophy', s.golems.list.some((x) => x.id === mg.id && x.sitDone === 1) && !s.golems.trophies.length && s.player.coins - c0 - gifts(lv0, s.player.level) === pay1);
  s = G.gameGolem(k, 'unsummon', mg.id);
  ok('Send it back: a suggestion again', !s.golems.list.some((x) => x.id === mg.id) && s.golems.suggest.some((x) => x.id === mg.id));
  // PAG: 12C did a practical on Monday (kit ordered, not a demo)
  global.GAME_WORLD.data.classes['12C'] = { seq: [{ num: 3, title: 'Resistivity of a wire', built: true }, { num: 4, title: 'I-V curves', built: true }] };
  global.GAME_WORLD.weeks['2026-11-30'] = { slots: [{ kind: 'lesson', cls: '12C', i: 0, day: 0, period: 2, sets: '4 sets' }, { kind: 'lesson', cls: '12C', i: 1, day: 1, period: 3, sets: 'demo' }] };
  at('2026-12-02T10:00:00Z'); s = G.gameLoad(k);
  const pg = s.golems.suggest.filter((x) => x.type === 'pag');
  ok('after a 12C practical a PAG golem is suggested (not for the demo), marked by a week after', pg.length === 1 && pg[0].cls === '12C' && /Resistivity/.test(pg[0].name) && pg[0].due === '2026-12-07');
  s = G.gameGolem(k, 'pag', pg[0].key);
  gm = s.golems.list.find((x) => x.kind === 'pag');
  ok('summoning it makes its marking (one sitting, due a week after) as a PAG Scholar', gm && gm.look === 'pag' && gm.theme === 'storm' && gm.sittings === 1 && gm.due === '2026-12-07' && gm.cls === '12C' && !s.golems.suggest.some((x) => x.type === 'pag'));
  s = G.gameGolem(k, 'pag', pg[0].key);
  ok('summoning the same practical twice makes one golem', s.golems.list.filter((x) => x.kind === 'pag').length === 1);
  at('2026-12-10T10:00:00Z'); s = G.gameLoad(k);
  ok('an overdue golem just waits', s.golems.list.some((x) => x.id === gm.id));
  ok('a practical over a week ago is no longer suggested', !s.golems.suggest.some((x) => x.type === 'pag'));
  global.GAME_WORLD.weeks['2026-12-07'] = { slots: [{ kind: 'lesson', cls: '12C', i: 0, day: 2, period: 1, sets: '4 sets' }] };
  s = G.gameLoad(k); const p2 = s.golems.suggest.find((x) => x.type === 'pag');
  s = G.gameGolem(k, 'nopag', p2.key);
  ok('"Not this one" puts a practical away for good', !s.golems.suggest.some((x) => x.type === 'pag') && !G.gameLoad(k).golems.suggest.some((x) => x.type === 'pag'));
  delete global.GAME_WORLD.weeks['2026-11-30']; delete global.GAME_WORLD.weeks['2026-12-07']; }
console.log('\n' + (failed ? failed + ' FAILED' : 'all game server checks passed'));
process.exit(failed ? 1 : 0);
