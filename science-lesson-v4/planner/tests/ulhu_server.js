// Test harness: Game.gs on the in-memory Apps Script mock behind a tiny local web server, plus the page.
// node ul_server.js <port>   (synthetic data only)
const P = require('path').join(__dirname, '..') + '/';
const m = require(P + 'tests/mock-appsscript.js'), fs = require('fs'), http = require('http');
m.props.PLANNER_KEY = 'k';
global.SHOP = require(P + 'game-shop.json');
const FN = ['gameLoad', 'gameTick', 'gameUntick', 'gameSaveGoal', 'gameArchive', 'gameFreeze', 'gameShop', 'gameArt', 'gameBuy', 'gamePlace', 'gameBossStart', 'gameBossStage', 'gameBossRemove', 'gameBossSave', 'gameTag', 'gameChips', 'gameVespers', 'gameVespersUndo', 'gameVespersTime', 'gameMoon', 'gameReview', 'gameQuestStep', 'gameGroupSave', 'gameWear', 'gameUnbuy', 'gameHoardSave', 'gameHoardClaim', 'gameChronicle', 'gameHaggle', 'gameMergeGoals', 'gameUnmerge'];
eval(['Code.gs', 'Behaviour.gs', 'Game.gs'].map((f) => fs.readFileSync(P + f, 'utf8')).join('\n') + '\nglobal.G={' + FN.join(',') + '};');
global.GAME_WORLD = { data: { terms: [['2026-09-07', '2026-12-18']], inset: ['2026-11-09'], classes: { '9XS': { seq: [{ num: 4, built: true }, { num: 5, built: false }] }, '13D': { seq: [{ num: 5, built: false }] } } },
  weeks: { '2026-10-26': { slots: [{ kind: 'lesson', cls: '9XS', i: 0, day: 0, period: 1, col: '#3fcf8a' }, { kind: 'lesson', cls: '13D', i: 0, day: 1, period: 3, col: '#e870d8' }, { kind: 'lesson', cls: '9XS', i: 1, day: 4, period: 2, col: '#3fcf8a' }] } } };
global.GAME_NOW = new Date('2026-10-23T15:40:00Z').getTime();   // a Friday afternoon: the review shows
const k = 'k';
G.gameLoad(k);
const coins = (n) => { const r = m.sheets['Game Player']._data.find((x) => x[0] === 'coins'); r[1] = n; };
coins(412);
G.gameSaveGoal(k, { name: 'Email parents about the museum trip', kind: 'todo', minutes: 15, track: 'necessary', due: '2026-10-23' });
G.gameSaveGoal(k, { name: 'Print the 10S2 mock papers', kind: 'todo', minutes: 30, track: 'necessary', due: '2026-10-26', steps: [{ t: 'Find the 2024 paper', d: true }, { t: 'Print 32 copies' }, { t: 'Sort into packs' }] });
G.gameSaveGoal(k, { name: 'Plan the Halloween party food', kind: 'todo', minutes: 30, track: 'life', grp: 'life', due: '2026-10-24' });
['Drank water|5', 'Went for a walk|15', 'Stretched|5', 'Tidied the desk|15', 'Left school by 5|30', 'In bed by 10:30|30'].forEach((x) => { const [n, mm] = x.split('|'); G.gameSaveGoal(k, { name: n, kind: 'habit', polarity: 'plus', minutes: Number(mm) }); });
G.gameSaveGoal(k, { name: 'Doomscrolling in bed', kind: 'habit', polarity: 'minus', minutes: 30 });
// 2026-10-28 night: one-sided omens to pair (his real Hitting Snooze and Wake Up Early) and a near-duplicate (Floss, Flossing)
G.gameSaveGoal(k, { name: 'Hitting Snooze', kind: 'habit', polarity: 'minus', minutes: 15 });
['Wake Up Early', 'Floss', 'Flossing'].forEach((n) => G.gameSaveGoal(k, { name: n, kind: 'habit', polarity: 'plus', minutes: 5 }));
G.gameBossStart(k, { name: 'Make Halloween costumes', size: 2, k: 'spawn', stages: [{ name: 'Discuss what it should be', due: '2026-10-20' }, { name: 'Get materials', due: '2026-10-23' }, { name: 'Paint and build', due: '2026-10-30' }] });
const b2 = G.gameBossStart(k, { name: 'Mark the 10S2 test', size: 5, k: 'deep', stages: [{ name: 'Half marked', due: '2026-10-22' }, { name: 'The rest', due: '2026-10-26' }, { name: 'Scores summed', due: '2026-10-27' }, { name: 'Entered', due: '2026-10-28' }] }).newBoss;
G.gameBossStage(k, b2, 0, true);
G.gameHoardSave(k, { name: 'Takeaway night', cost: 300 }); G.gameHoardSave(k, { name: 'One hour of gaming', cost: 80 });
const read = G.gameLoad(k).goals.find((g) => g.name === 'Read'); G.gameTick(k, read.id, 1);
G.gameVespersTime(k, '15:00');   // Vespers opens at 3 pm here, so the evening book (1U.10) can be checked on this Friday afternoon
const page = fs.readFileSync(process.argv[3], 'utf8');
http.createServer((req, res) => {
  if (req.method === 'GET') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page); }
  let body = ''; req.on('data', (c) => { body += c; }); req.on('end', () => {
    const q = JSON.parse(body); let out;
    try { out = { ok: G[q.fn](k, ...(q.args || [])) }; } catch (e) { out = { err: e.message }; }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out));
  });
}).listen(Number(process.argv[2]), () => console.log('ready'));
