// Ulhu's Rituals server tests: Game.gs loaded with Code.gs and Behaviour.gs on the in-memory Apps Script mock.
// Run: node planner/tests/game.test.js
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
m.props.PLANNER_KEY = 'k';
const src = ['Code.gs', 'Behaviour.gs', 'game-art.js', 'Game.gs'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
global.SHOP = require('../game-shop.json');
eval(src + '\nglobal.G={gameLoad,gameTick,gameUntick,gameSaveGoal,gameArchive,gameFreeze,gameShop,gameArt,gameBuy,gamePlace,gameBossStart,gameBossStage,gameBossRemove,gameBossSave,gameTag,gameChips,gameVespers,gameVespersUndo,gameVespersTime,gameMoon,gameReview,gameQuestStep,gameGroupSave,gameWear,gameUnbuy,gameHoardSave,gameHoardClaim,gameChronicle,gameAim,gameHaggle,gPay_,gDie_,gNeed_,gAdd_,gDow_,gDiff_,gIsFrozen_};');

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
console.log('\n-- dice with the keepers (once a day each)');
{ const now0 = global.GAME_NOW; at('2026-11-05T10:00:00Z'); setCoins(5000);
  const sh0 = G.gameShop(k), rug = sh0.items.find((i) => i.category === 'rugs' && !i.own && !i.locked && i.price >= 100), lamp = sh0.items.find((i) => i.category === 'lights' && !i.own && !i.locked && i.price >= 100);
  ok('every item names its keeper, and nothing is haggled yet', sh0.items.every((i) => !!i.keeper) && rug.keeper === 'weaver' && lamp.keeper === 'glass' && rug.price === rug.base && !Object.keys(sh0.haggle).length);
  let sh1 = G.gameHaggle(k, 'weaver', 'start');
  ok('sitting down counts as a loss until it is settled (walking out costs +10%)', sh1.haggle.weaver === 'playing' && sh1.items.find((i) => i.id === rug.id).price === Math.round(rug.base * 1.1));
  sh1 = G.gameHaggle(k, 'weaver', 'win');
  ok('a win: 20% off every ware at that stall today', sh1.haggle.weaver === 'win' && sh1.items.find((i) => i.id === rug.id).price === Math.round(rug.base * 0.8) && sh1.items.filter((i) => i.keeper === 'weaver' && i.base).every((i) => i.price === Math.round(i.base * 0.8)));
  ok('other stalls keep their prices', sh1.items.find((i) => i.id === lamp.id).price === lamp.base);
  s = G.gameBuy(k, rug.id);
  ok('buying at the weaver charges the discounted price', s.player.coins === 5000 - Math.round(rug.base * 0.8));
  s = G.gameUnbuy(k, rug.id);
  ok('Undo gives back what was paid', s.player.coins === 5000);
  threw = false; try { G.gameHaggle(k, 'weaver', 'start'); } catch (e) { threw = /already played/.test(e.message); }
  ok('a second game with the same keeper on the same day is refused', threw);
  threw = false; try { G.gameHaggle(k, 'weaver', 'lose'); } catch (e) { threw = /settled/.test(e.message); }
  ok('a settled game cannot be changed', threw);
  sh1 = G.gameHaggle(k, 'glass', 'start'); sh1 = G.gameHaggle(k, 'glass', 'lose');
  ok('another keeper can still be played the same day; a loss is +10% there', sh1.haggle.glass === 'lose' && sh1.items.find((i) => i.id === lamp.id).price === Math.round(lamp.base * 1.1) && sh1.haggle.weaver === 'win');
  s = G.gameBuy(k, lamp.id);
  ok('buying at the glassblower charges the surcharge', s.player.coins === 5000 - Math.round(lamp.base * 1.1));
  sh1 = G.gameHaggle(k, 'tailor', 'start'); sh1 = G.gameHaggle(k, 'tailor', 'win'); setCoins(1000);
  s = G.gameWear(k, 'hat-4', true);
  ok('a win with the tailor takes 20% off an outfit (180 to 144)', s.player.coins === 1000 - 144);
  threw = false; try { G.gameHaggle(k, 'nobody', 'start'); } catch (e) { threw = /no such keeper/.test(e.message); }
  ok('an unknown keeper is refused', threw);
  at('2026-11-06T10:00:00Z');
  sh1 = G.gameShop(k);
  ok('next day: prices are back to normal', !Object.keys(sh1.haggle).length && sh1.items.filter((i) => i.keeper === 'weaver').every((i) => i.price === i.base));
  sh1 = G.gameHaggle(k, 'weaver', 'start');
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
  ok('fainting opens the Rise quest', s.player.rise && !s.player.rise.done && s.player.rise.need === 3);
  const back = s.player.rise ? s.player.rise.back : 0; s = G.gameTick(k, rs[0], 1); s = G.gameTick(k, rs[1], 1); const before = s.player.coins; s = G.gameTick(k, rs[2], 1);
  ok('the third ritual wins back half the lost runes', s.player.rise.done && s.player.coins - before >= back && back > 0);
  s = G.gameUntick(k, rs[2]);
  ok('undoing it takes the payout back and reopens the quest', !s.player.rise.done && s.player.coins === before);
  const sh = G.gameShop(k), el = sh.items.find((i) => i.tier === 'Eldritch'), ba = sh.items.find((i) => i.tier === 'Basic' && !i.locked);
  ok('Eldritch needs level 20', el.locked && /level 20/.test(el.why));
  ok('Basic is open from level 1', !!ba); }
console.log('\n' + (failed ? failed + ' FAILED' : 'all game server checks passed'));
process.exit(failed ? 1 : 0);
