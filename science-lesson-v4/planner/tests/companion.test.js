// Ulhu as a life companion (Lane D): Companion.gs on the in-memory Apps Script mock, loaded with Code.gs, Behaviour.gs
// and Game.gs the way Apps Script loads one project. Synthetic data only.
// Run: node planner/tests/companion.test.js
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path');
const dir = process.env.PLANNER_SRC || path.join(__dirname, '..');
m.props.PLANNER_KEY = 'k';
const src = ['Code.gs', 'Behaviour.gs', 'game-art.js', 'Game.gs', 'Companion.gs'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
global.SHOP = require('../game-shop.json');
eval(src + '\nglobal.G={gameLoad,gameTick,gameUntick,gameSaveGoal,gameMoon,gameFreeze,gameVespers,gameVespersUndo,gameDayTag,gameDayTagList,gameFindTake,cIllDay_,cStory_,cFindFor_,C_FINDS};');

const k = 'k'; let failed = 0;
const ok = (n, c) => { console.log((c ? '  PASS ' : '  FAIL ') + n); if (!c) failed++; };
const at = (iso) => { global.GAME_NOW = new Date(iso).getTime(); };
const throws = (f) => { try { f(); return false; } catch (e) { return true; } };
global.GAME_WORLD = { data: { terms: [['2026-09-07', '2026-10-21'], ['2026-11-02', '2026-12-18'], ['2027-01-05', '2027-02-12'], ['2027-02-22', '2027-03-25'], ['2027-04-12', '2027-05-28'], ['2027-06-07', '2027-07-28']], inset: ['2026-11-25'], classes: {} }, weeks: {} };

console.log('\n-- day tags and the Ill rule');
at('2026-11-03T09:00:00Z');   // a Tuesday in term
let s = G.gameLoad(k);
ok('the snapshot carries the companion: the starting tags, nothing tagged, not ill', s.comp && s.comp.tags.length === 7 && s.comp.tags.indexOf("Parents' evening") >= 0 && !Object.keys(s.comp.days).length && s.comp.ill === false);
s = G.gameDayTag(k, '2026-11-05', "Parents' evening", true);
ok('a heavy-day tag is saved for that day and changes no rule (the moon stays full)', s.comp.days['2026-11-05'][0] === "Parents' evening" && s.moon === 'full');
s = G.gameDayTag(k, '2026-11-05', "Parents' evening", true);
ok('tagging the same day twice keeps one tag', s.comp.days['2026-11-05'].length === 1);
s = G.gameDayTag(k, '2026-11-05', 'Marking', true);
ok('a day can carry two tags', s.comp.days['2026-11-05'].length === 2);
s = G.gameDayTag(k, '2026-11-05', "Parents' evening", false);
ok('untagging removes only that tag', s.comp.days['2026-11-05'].join() === 'Marking');
ok('a tag not in the list is refused', throws(() => G.gameDayTag(k, '2026-11-05', 'Party', true)));
ok('a day more than 7 days back is refused', throws(() => G.gameDayTag(k, '2026-10-20', 'Marking', true)));
ok('a day more than 60 days ahead is refused', throws(() => G.gameDayTag(k, '2027-02-01', 'Marking', true)));

const curse = s.goals.find((g) => g.kind === 'habit' && g.polarity === 'minus');
const hp0 = s.player.hp;
s = G.gameTick(k, curse.id, -1);
ok('on a normal day a curse costs health', s.player.hp === hp0 - curse.hpLoss && curse.hpLoss > 0);
const hp1 = s.player.hp;
s = G.gameDayTag(k, '2026-11-03', 'Ill', true);
ok('tagging today Ill turns the moon dark and marks the day ill', s.moon === 'dark' && s.comp.ill === true && s.frozen === true);
ok('on an Ill day the curse shows no health cost', s.goals.find((g) => g.id === curse.id).hpLoss === 0);
s = G.gameTick(k, curse.id, -1); s = G.gameTick(k, curse.id, -1); s = G.gameTick(k, curse.id, -1); s = G.gameTick(k, curse.id, -1);
ok('on an Ill day curses are still logged but cost no health', s.player.hp === hp1 && s.goals.find((g) => g.id === curse.id).count >= 5);
// push health to the edge: even then an Ill day can never cause a faint
m.sheets['Game Player']._data.find((r) => r[0] === 'hp')[1] = 1;
s = G.gameTick(k, curse.id, -1);
ok('being ill can never cause a faint', s.player.hp === 1 && s.player.deaths === 0);
s = G.gameUntick(k, curse.id);
ok('undoing an Ill-day curse gives back no health it never took', s.player.hp === 1);
s = G.gameDayTag(k, '2026-11-03', 'Ill', false);
ok('untagging Ill gives the moon back (a term day is full again)', s.moon === 'full' && s.comp.ill === false && s.goals.find((g) => g.id === curse.id).hpLoss > 0);
s = G.gameFreeze(k, '2026-11-03', 'sick', true);
ok('a day already marked sick the old way counts as Ill too', s.comp.ill === true && s.goals.find((g) => g.id === curse.id).hpLoss === 0);
s = G.gameFreeze(k, '2026-11-03', 'sick', false);
s = G.gameDayTag(k, '2026-11-04', 'Ill', true);
ok('a day tagged Ill ahead of time is dark that day and not today', G.cIllDay_('2026-11-04') === true && s.moon === 'full');

console.log('\n-- his own tag list');
s = G.gameDayTagList(k, ['Marking', 'Gym night', 'Gym night', '  ', 'Mock invigilation']);
ok('his own list is saved without blanks or repeats, and Ill always stays', s.comp.tags.join('|') === 'Marking|Gym night|Mock invigilation|Ill');
s = G.gameDayTag(k, '2026-11-06', 'Gym night', true);
ok('a tag from his own list can be used', s.comp.days['2026-11-06'][0] === 'Gym night');

console.log('\n-- the year\'s story (acts, chapters, interludes)');
const W = global.GAME_WORLD;
const st = (d) => G.cStory_(d, W);
ok('the first half term is act 1, its first week chapter 1', st('2026-09-07').act === 1 && st('2026-09-07').chapter === 1 && !st('2026-09-07').interlude);
ok('a day in week 3 of the second half term is act 2, chapter 3', st('2026-11-18').act === 2 && st('2026-11-18').chapter === 3);
ok('October half term is an interlude after act 1 (The Ember Tide)', st('2026-10-27').interlude === 'The Ember Tide' && st('2026-10-27').act === 1);
ok('Christmas is an interlude (The Midwinter Hush)', st('2026-12-25').interlude === 'The Midwinter Hush');
ok('Easter is an interlude', st('2027-04-01').interlude === 'The Egg of the Deep');
ok('the summer holiday is act 7, The Long Drift', st('2027-08-10').act === 7 && st('2027-08-10').name === 'The Long Drift' && !st('2027-08-10').interlude);
ok('early September before term counts as the summer too', st('2026-09-01').act === 7);
ok('every act and break has finds to bring back, each one an object or a lore line', [1, 2, 3, 4, 5, 6, 7, 'interlude', 'small'].every((a) => G.C_FINDS[a].length >= 10 && G.C_FINDS[a].every((x) => /^(o\|[^|]+\|[^|]+|l\|[^|]+)$/.test(x))));
ok('no em dashes anywhere in the finds', !JSON.stringify(G.C_FINDS).includes('—'));

console.log('\n-- the overnight adventure and the find');
at('2026-11-10T09:00:00Z');   // a Tuesday morning, a week on
s = G.gameLoad(k);
ok('before Vespers he is at home', s.comp.adventure.state === 'home' && !s.comp.adventure.find);
at('2026-11-10T20:30:00Z');
s = G.gameVespers(k, { clean: true, tags: [] });
ok('after Vespers he has dived: away, and the app still works', s.comp.adventure.state === 'away');
const read = s.goals.find((g) => g.name === 'Read');
s = G.gameTick(k, read.id, 1);
ok('ticking while he is away works as normal', s.goals.find((g) => g.id === read.id).doneToday === true && s.comp.adventure.state === 'away');
at('2026-11-11T05:30:00Z');
s = G.gameLoad(k);
ok('before 6 am the next day he is still away', s.comp.adventure.state === 'away');
at('2026-11-11T07:10:00Z');
s = G.gameLoad(k);
const f1 = s.comp.adventure.find;
ok('next morning he is back with a find from act 2', s.comp.adventure.state === 'back' && f1 && f1.night === '2026-11-10' && f1.act === 'The Lantern Below' && !!f1.text);
s = G.gameLoad(k);
ok('the same night always brings the same find', s.comp.adventure.find.fid === f1.fid);
const c0 = s.player.coins;
s = G.gameFindTake(k);
ok('taking it puts it on the shelf and he is home', s.comp.adventure.state === 'home' && s.comp.adventure.shelf.length === 1 && s.comp.adventure.shelf[0].text === f1.text && s.found.length === 1);
ok('any runes in it land on the heap, and only those', s.player.coins === c0 + f1.runes);
s = G.gameFindTake(k);
ok('taking twice takes nothing more', s.comp.adventure.shelf.length === 1 && s.player.coins === c0 + f1.runes);
// a bad day: three curses, nothing good, then Vespers
at('2026-11-11T19:00:00Z');
s = G.gameTick(k, curse.id, -1); s = G.gameTick(k, curse.id, -1); s = G.gameTick(k, curse.id, -1);
s = G.gameVespers(k, { clean: false, tags: [] });
const afterV = s.player.coins;
at('2026-11-12T07:00:00Z');
s = G.gameLoad(k);
ok('after a bad day he still went and brought back something small or strange', s.comp.adventure.state === 'back' && /^small:/.test(s.comp.adventure.find.fid) && s.comp.adventure.find.runes === 0);
s = G.gameFindTake(k);
ok('a bad day\'s find costs nothing', s.player.coins === afterV && s.comp.adventure.shelf.length === 2);
// several nights of Vespers with no morning visit: all of them reach the shelf
['2026-11-12', '2026-11-13', '2026-11-14'].forEach((d) => { at(d + 'T20:30:00Z'); G.gameVespers(k, { clean: true, tags: [] }); });
at('2026-11-15T10:00:00Z');
s = G.gameLoad(k);
ok('three nights waiting: the newest is shown and the count is 3', s.comp.adventure.state === 'back' && s.comp.adventure.find.night === '2026-11-14' && s.comp.adventure.waiting === 3);
s = G.gameFindTake(k);
ok('taking them puts all three on the shelf, none repeated', s.comp.adventure.shelf.length === 5 && new Set(s.comp.adventure.shelf.map((x) => x.text)).size === 5 && s.found.length === 3);
at('2026-11-15T20:30:00Z'); G.gameVespers(k, { clean: true, tags: [] });
s = G.gameVespersUndo(k);
ok('Vespers undone means he never dived', s.comp.adventure.state === 'home');

console.log(failed ? `\n${failed} FAILED` : '\nAll companion checks passed');
process.exit(failed ? 1 : 0);
