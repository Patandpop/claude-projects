// Ulhu as a life companion (Lane D): Companion.gs on the in-memory Apps Script mock, loaded with Code.gs, Behaviour.gs
// and Game.gs the way Apps Script loads one project. Synthetic data only.
// Run: node planner/tests/companion.test.js
const m = require('./mock-appsscript.js');
const fs = require('fs'), path = require('path');
const dir = process.env.PLANNER_SRC || path.join(__dirname, '..');
m.props.PLANNER_KEY = 'k';
const src = ['Code.gs', 'Behaviour.gs', 'game-art.js', 'Game.gs', 'Companion.gs'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
global.SHOP = require('../game-shop.json');
eval(src + '\nglobal.G={gameLoad,gameTick,gameUntick,gameSaveGoal,gameMoon,gameFreeze,gameVespers,gameVespersUndo,gameDayTag,gameDayTagList,gameFindTake,gameCompanionTerm,gameNudge,gameNudgeOff,gameCabinets,cIllDay_,cStory_,cFindFor_,C_FINDS,C_PIECES};');

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
// the cabinets (3B): one per act, each object gives a torn piece of the act's page; lore is scratched inside
{
  const cb = G.gameCabinets(k), a2 = cb.acts[1];
  ok('seven cabinets, act 2 is now, act 1 past, act 3 later', cb.acts.length === 7 && cb.now === 2 && a2.state === 'now' && cb.acts[0].state === 'past' && cb.acts[2].state === 'later');
  ok('every act has eight objects, each with its own page piece', cb.acts.every((a, i) => a.objects.length === 8 && a.objects.every((o) => o.piece) && G.C_PIECES[i + 1].length === 8));
  const shelf = s.comp.adventure.shelf, objs = shelf.filter((x) => x.kind === 'object' && x.act === 'The Lantern Below').length, lore = shelf.filter((x) => x.kind === 'lore' && x.act === 'The Lantern Below').length;
  ok('the act 2 cabinet holds exactly the act 2 objects found, and its pieces count them', a2.pieces === objs && a2.objects.filter((o) => o.found).length === objs);
  ok('act 2 lore lines found are scratched inside (not the grey night note)', a2.lore.length === lore - shelf.filter((x) => x.kind === 'lore' && !G.C_FINDS[2].some((y) => y.endsWith('|' + x.text))).length && a2.lore.length === 3);
  ok('the grey night find sits on the odd-things shelf', cb.odd.some((x) => x.grey));
}
at('2026-11-15T20:30:00Z'); G.gameVespers(k, { clean: true, tags: [] });
s = G.gameVespersUndo(k);
ok('Vespers undone means he never dived', s.comp.adventure.state === 'home');

console.log('\n-- "who I\'m becoming": the term page');
at('2027-01-05T06:30:00Z');   // the first day of the third half term
s = G.gameLoad(k);
let tp = G.gameCompanionTerm(k);
ok('a new half term starts empty: act 3, The Frozen Choir, no votes, no better days', tp.from === '2027-01-05' && tp.act === 'The Frozen Choir' && tp.who.every((w) => w.votes === 0) && tp.betterDays === 0 && !tp.cameFirst.length);
const water = G.gameSaveGoal(k, { name: 'Drink water', kind: 'habit', polarity: 'plus', minutes: 5, who: 'Nourished' }).saved;
const study = G.gameSaveGoal(k, { name: 'Study physics', kind: 'daily', days: '1234567', minutes: 30, track: 'life', who: 'Scholar' }).saved;
at('2027-01-05T07:00:00Z'); G.gameTick(k, water, 1);
at('2027-01-05T18:00:00Z'); G.gameTick(k, study, 1);
at('2027-01-06T08:00:00Z'); G.gameTick(k, curse.id, -1); G.gameTick(k, curse.id, -1); G.gameTick(k, curse.id, -1); G.gameTick(k, water, 1);
G.gameDayTag(k, '2027-01-06', 'Marking', true);
at('2027-01-07T08:00:00Z'); G.gameTick(k, study, 1);
G.gameDayTag(k, '2027-01-07', 'Ill', true);
tp = G.gameCompanionTerm(k);
const v = (w) => (tp.who.find((x) => x.who === w) || {}).votes;
ok('each tick of a habit or ritual with an identity is one vote (Nourished 2, Scholar 2)', v('Nourished') === 2 && v('Scholar') === 2);
ok('a figure lights up a little with each vote (2 of 30)', Math.abs(tp.who.find((x) => x.who === 'Scholar').lit - 2 / 30) < 1e-9 && tp.panes === 30);
ok('curses never vote', tp.who.every((w) => w.votes <= 2));
ok('better days: the two good days, not the cursed one', tp.betterDays === 2 && tp.activeDays === 3);
ok('"these came first" counts the first good ticks of better days (Study physics on 2, Drink water on 1)', tp.cameFirst[0].name === 'Study physics' && tp.cameFirst[0].days === 2 && tp.cameFirst[1].name === 'Drink water' && tp.cameFirst[1].days === 1);
ok('heavy days show with their tags and how the day went, and Ill days too', tp.heavy.length === 2 && tp.heavy[0].tags[0] === 'Marking' && tp.heavy[0].curse === 3 && tp.heavy[1].tags[0] === 'Ill');
ok('chapters: one per school week of the act, this week the open one, with its colours counted', tp.chapters.length === 1 && tp.chapters[0].now && tp.chapters[0].blessings === 2 && tp.chapters[0].curses === 3 && tp.chapters[0].rituals === 2 && !tp.chapters[0].closed);
ok('the tag count says how many days each tag had', tp.tagCount.some((x) => x.tag === 'Marking' && x.days === 1));
at('2027-08-12T10:00:00Z');
tp = G.gameCompanionTerm(k);
ok('in the summer the term page covers the summer so far', tp.from === '2027-07-29' && tp.actNo === 7);

console.log('\n-- nudges: one a day at most, a real fact, never after 7 pm, each switchable off');
// Study physics ticked at about 08:00 on three mornings: its usual time is 08:00, and it has a streak
['2027-01-11', '2027-01-12', '2027-01-13'].forEach((d) => { at(d + 'T08:00:00Z'); G.gameTick(k, study, 1); });
at('2027-01-14T07:30:00Z'); G.gameLoad(k);
ok('before the usual time there is nothing to say', G.gameNudge(k) === null);
at('2027-01-14T08:30:00Z');
let nu = G.gameNudge(k);
ok('after the usual time, a ritual not yet done is named with its streak ("Study physics: 3 days")', nu && nu.kind === 'streak' && nu.text === 'Study physics: 3 days');
ok('the words are never sad and never pressure', !/(miss|lose|lost|fail|hurry|must|don't|sad|break)/i.test(nu.text));
ok('asking does not use up the day; only sending does', G.gameNudge(k) !== null);
G.gameNudge(k, true);
ok('once one is sent, nothing more that day', G.gameNudge(k) === null);
at('2027-01-15T08:30:00Z');
ok('the next day it can come again', G.gameNudge(k) !== null);
G.gameTick(k, study, 1);
ok('a ritual already done today is never nudged', G.gameNudge(k) === null);
at('2027-01-16T19:05:00Z');
ok('after 7 pm nothing reaches out', G.gameNudge(k) === null);
at('2027-01-16T08:30:00Z');
s = G.gameNudgeOff(k, ['streak']);
ok('a kind switched off stays quiet, and the screen knows', G.gameNudge(k) === null && s.comp.nudgeOff.join() === 'streak');
at('2027-01-16T20:30:00Z'); G.gameVespers(k, { clean: true, tags: [] });
at('2027-01-17T07:15:00Z');
nu = G.gameNudge(k);
ok('in the morning, Ulhu back with a find is a nudge of its own', nu && nu.kind === 'find');
G.gameNudgeOff(k, ['all']);
ok('"all" switches every nudge off', G.gameNudge(k) === null);
G.gameNudgeOff(k, []);

console.log('\n-- sound: big moments only (game-companion.js)');
const C = require(path.join(dir, 'game-companion.js'));
const scr = (o) => Object.assign({ today: '2027-01-08', player: { level: 3, deaths: 0 }, goals: [{ kind: 'daily', doneToday: false }, { kind: 'habit', polarity: 'plus', count: 0 }, { kind: 'habit', polarity: 'minus', count: 0 }], vespers: { done: false }, comp: { adventure: { state: 'home' } } }, o);
const base = scr({});
ok('a ritual ticked makes the tick sound', C.moment(base, scr({ goals: [{ kind: 'daily', doneToday: true }, base.goals[1], base.goals[2]] })) === 'tick');
ok('a blessing makes the tick sound', C.moment(base, scr({ goals: [base.goals[0], { kind: 'habit', polarity: 'plus', count: 1 }, base.goals[2]] })) === 'tick');
ok('a curse makes no sound', C.moment(base, scr({ goals: [base.goals[0], base.goals[1], { kind: 'habit', polarity: 'minus', count: 1 }] })) === '');
ok('an undo makes no sound', C.moment(scr({ goals: [{ kind: 'daily', doneToday: true }, base.goals[1], base.goals[2]] }), base) === '');
ok('the same screen again (the server catching up) makes no sound', C.moment(base, scr({})) === '');
ok('a level-up wins over the tick that caused it', C.moment(base, scr({ player: { level: 4, deaths: 0 }, goals: [{ kind: 'daily', doneToday: true }, base.goals[1], base.goals[2]] })) === 'level');
ok('fainting has its own sound', C.moment(base, scr({ player: { level: 2, deaths: 1 } })) === 'faint');
ok('Vespers done has its own sound', C.moment(base, scr({ vespers: { done: true } })) === 'vespers');
ok('Ulhu back from the deep (his find taken) has its own sound', C.moment(scr({ comp: { adventure: { state: 'back' } } }), base) === 'return');
ok('a new day loading is not a moment', C.moment(base, scr({ today: '2027-01-09', goals: [{ kind: 'daily', doneToday: true }, base.goals[1], base.goals[2]] })) === '');
ok('only the big-moment sounds exist (no music): the five, plus the level-up chorus', C.SOUNDS.join() === 'tick,vespers,level,faint,return,chorus');
ok('every 5th level plays the ocarina chorus', C.soundFor('level', { player: { level: 10 } }) === 'chorus' && C.soundFor('level', { player: { level: 5 } }) === 'chorus');
ok('other levels play the plain level-up', C.soundFor('level', { player: { level: 7 } }) === 'level' && C.soundFor('tick', { player: { level: 10 } }) === 'tick');
ok('with no speaker (node) playing does nothing', C.play('tick') === false);

/* ==== FOCUS CRAFTS tests (companion-focus.js / gameFocusDone, gameFocusShelf) ==== */
console.log('\n-- focus crafts: a finished piece goes on the shelf');
at('2027-01-20T10:00:00Z');
ok('the shelf starts empty', gameFocusShelf(k).length === 0);
let fsh = gameFocusDone(k, 'knit', 'medium', 30);
ok('a finished piece saves one row with its name (a kelp scarf)', fsh.length === 1 && fsh[0].piece === 'kelp scarf' && fsh[0].craft === 'knit' && fsh[0].size === 'medium' && fsh[0].minutes === 30 && fsh[0].day === '2027-01-20');
ok('the row is in the Game Focus tab', m.sheets['Game Focus'] && m.sheets['Game Focus']._data.length === 2);
at('2027-01-21T10:00:00Z');
gameFocusDone(k, 'knit', 'small', 15);
fsh = gameFocusDone(k, 'knit', 'large', 60);
ok('each size makes its own piece (sock, jumper)', fsh.some((x) => x.piece === 'sock') && fsh[0].piece === 'jumper');
ok('the shelf is newest first', gameFocusShelf(k).map((x) => x.piece).join('|') === 'jumper|sock|kelp scarf');
ok('knitting only: stone carving and unknown crafts are refused', throws(() => gameFocusDone(k, 'stone', 'small', 15)) && throws(() => gameFocusDone(k, 'pottery', 'small', 15)));
ok('a size that does not exist is refused', throws(() => gameFocusDone(k, 'knit', 'huge', 15)));
ok('a silly focus time is refused', throws(() => gameFocusDone(k, 'knit', 'small', 0)) && throws(() => gameFocusDone(k, 'knit', 'small', 'lots')));
ok('the wrong key is refused', throws(() => gameFocusShelf('nope')));
for (let i = 0; i < 45; i++) gameFocusDone(k, 'knit', 'small', 15);
ok('the shelf shows at most 40 pieces', gameFocusShelf(k).length === 40);
const FC = require(path.join(dir, 'companion-focus.js'));
ok('companion-focus.js loads harmlessly in node (no window)', FC !== undefined);
/* ==== end FOCUS CRAFTS tests ==== */

console.log(failed ? `\n${failed} FAILED` : '\nAll companion checks passed');
process.exit(failed ? 1 : 0);
