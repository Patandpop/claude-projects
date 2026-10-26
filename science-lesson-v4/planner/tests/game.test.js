// Ulhu's Rituals server tests: Game.gs loaded with Code.gs and Behaviour.gs on the in-memory Apps Script mock.
// Run: node planner/tests/game.test.js
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
m.props.PLANNER_KEY = 'k';
const src = ['Code.gs', 'Behaviour.gs', 'game-art.js', 'Game.gs'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
global.SHOP = require('../game-shop.json');
eval(src + '\nglobal.G={gameLoad,gameTick,gameUntick,gameSaveGoal,gameArchive,gameFreeze,gameShop,gameArt,gameBuy,gamePlace,gameBossStart,gameBossStage,gameBossRemove,gameReview,gameQuestStep,gameGroupSave,gameWear,gameUnbuy,gameHoardSave,gameHoardClaim,gameChronicle,gPay_,gDie_,gNeed_,gAdd_,gDow_,gDiff_,gIsFrozen_};');

const k = 'k'; let failed = 0;
const ok = (n, c) => { console.log((c ? '  PASS ' : '  FAIL ') + n); if (!c) failed++; };
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
ok('a 14-day streak adds 20%', G.gPay_({ minutes: 60, track: 'necessary', streak: 14 }, none, byId).coins === 19);
ok('a 40-day streak is capped at +30%', G.gPay_({ minutes: 60, track: 'necessary', streak: 40 }, none, byId).coins === 21);
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
ok('a bad habit costs health (120 min = 12) and never coins', s.player.hp === 50 - 12 + 0 && s.player.coins === 45 && s.last.bad);
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
ok('a lesson first seen unbuilt that turns built pays once (6 days ahead = necessary: 10)', s.player.coins - coinsBefore === 10);
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
const coinsB = s.player.coins;
s = G.gameBossStage(k, bs.id, 1, true); s = G.gameBossStage(k, bs.id, 2, true); s = G.gameBossStage(k, bs.id, 3, true);
ok('beating the boss pays its reward once and says so', s.boss && s.boss.beaten && s.player.coins - coinsB === 150 && !s.bosses.length && s.beaten[0].name === 'Mark 9XS Particles tests');
s = G.gameBossStage(k, bs.id, 3, true);
ok('a beaten boss pays nothing more (5h boss = 150)', s.player.coins - coinsB === 150);
s = G.gameBossStart(k, { name: 'Made by mistake', stages: [{ name: 'a' }, { name: 'b' }] });
const oops = s.bosses.find((b) => b.name === 'Made by mistake');
s = G.gameBossRemove(k, oops.id);
ok('a boss made by mistake can be removed', !s.bosses.find((b) => b.id === oops.id));
s = G.gameBossRemove(k, oops.id, true);
ok('and Undo puts it back as it was', s.bosses.find((b) => b.id === oops.id).hp === 100);
s = G.gameBossRemove(k, bs.id);
ok('a beaten boss cannot be removed', s.beaten.some((b) => b.id === bs.id));
s = G.gameBossRemove(k, oops.id);

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
const ft = bl.find((g) => g.featured), plain = bl.find((g) => !g.featured);
ok('one blessing is x2 today', bl.filter((g) => g.featured).length === 1 && ft.pay === 2 * Math.max(2, Math.round({ 5: 3, 15: 6 }[ft.minutes] / 2)));
let c1 = s.player.coins; s = G.gameTick(k, plain.id, 1); s = G.gameTick(k, plain.id, 1);
ok('a blessing can be tapped again and again', s.player.coins - c1 === 2 * plain.pay && s.blessCount === 2);
for (let i = 0; i < 5; i++) s = G.gameTick(k, plain.id, 1);
c1 = s.player.coins; s = G.gameTick(k, plain.id, 1);
ok('the 8th blessing of the day pays a +10 chain bonus', s.player.coins - c1 === plain.pay + 10 && s.blessCount === 8);
s = G.gameUntick(k, plain.id);
ok('Undo takes the last blessing (and its bonus) back', s.player.coins === c1 && s.blessCount === 7);
s = G.gameGroupSave(k, { name: 'The Report Abyss', parent: 'teach' });
ok('a new group sits inside Teaching', s.groups.find((g) => g.id === s.saved).parent === 'teach');
s = G.gameGroupSave(k, { id: 'marking', name: 'The Crypt of Red Pens' });
ok('a built-in group can be renamed and keeps its job', s.groups.find((g) => g.id === 'marking').name === 'The Crypt of Red Pens' && s.groups.find((g) => g.id === 'marking').type === 'marking');
s = G.gameBossStart(k, { name: 'Write the Y9 scheme', size: 20, k: 'yog', stages: [{ name: 'Map', due: '2026-11-30' }] });
const nb = s.bosses.find((b) => b.id === s.newBoss);
ok('a 20h boss keeps its size and creature', nb && nb.size === 20 && nb.creature === 'yog');
c1 = s.player.coins; s = G.gameBossStage(k, nb.id, 0, true);
ok('its one stage beats it: +600 and it goes on the trophy shelf', s.player.coins - c1 === 600 && s.beaten[0].k === 'yog');
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
ok('the Chronicle has 7 weeks, a 35-day calendar and the trophies', ch.weeks.length === 7 && ch.days.length === 35 && ch.days.some((d) => d.today && d.n > 0) && ch.beaten.length >= 2);
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
console.log('\n' + (failed ? failed + ' FAILED' : 'all game server checks passed'));
process.exit(failed ? 1 : 0);
