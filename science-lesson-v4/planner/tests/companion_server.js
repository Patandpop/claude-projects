// Lane D test harness: Game.gs + Companion.gs on the in-memory Apps Script mock behind a tiny local web server.
// node companion_server.js <port> <page.html> <night|morning|home>   (synthetic data only)
const P = require('path').join(__dirname, '..') + '/';
const m = require(P + 'tests/mock-appsscript.js'), fs = require('fs'), http = require('http');
m.props.PLANNER_KEY = 'k';
global.SHOP = require(P + 'game-shop.json');
const src = ['Code.gs', 'Behaviour.gs', 'Game.gs', 'Companion.gs'].map((f) => fs.readFileSync(P + f, 'utf8')).join('\n');
const names = Array.from(new Set((src.match(/^function (game[A-Z]\w*)/gm) || []).map((s) => s.slice(9))));
eval(src + '\nglobal.G={' + names.join(',') + '};');
global.GAME_WORLD = { data: { terms: [['2026-09-01', '2026-10-16'], ['2026-10-19', '2026-12-18']], inset: ['2026-11-09'], classes: {} }, weeks: {} };
const mode = process.argv[4] || 'home', k = 'k';
const at = (s) => { global.GAME_NOW = new Date(s).getTime(); };
at('2026-10-27T16:00:00Z');
G.gameLoad(k);
['Drank water|5', 'Went for a walk|15', 'Read|20'].forEach((x) => { const [n, mm] = x.split('|'); G.gameSaveGoal(k, { name: n, kind: 'habit', polarity: 'plus', minutes: Number(mm) }); });
const goals = G.gameLoad(k).goals;
// a few nights of Vespers so the cabinet has finds
['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'].forEach((d, i) => {
  at(d + 'T17:00:00Z'); goals.slice(0, 2).forEach((g) => G.gameTick(k, g.id, 1)); at(d + 'T20:00:00Z'); G.gameVespers(k, {});
  if (i < 3) { at(new Date(new Date(d + 'T08:00:00Z').getTime() + 86400000).toISOString()); G.gameFindTake(k); }
});
if (mode === 'night') { at('2026-10-30T17:00:00Z'); G.gameVespers(k, {}); at('2026-10-30T21:00:00Z'); }
else if (mode === 'morning') at('2026-10-30T07:30:00Z');
else { at('2026-10-30T07:30:00Z'); G.gameFindTake(k); at('2026-10-30T12:00:00Z'); }
const page = fs.readFileSync(process.argv[3], 'utf8');
http.createServer((req, res) => {
  if (req.method === 'GET') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page); }
  let body = ''; req.on('data', (c) => { body += c; }); req.on('end', () => {
    const q = JSON.parse(body); let out;
    try { out = { ok: G[q.fn](k, ...(q.args || [])) }; } catch (e) { out = { err: e.message }; }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out));
  });
}).listen(Number(process.argv[2]), () => console.log('ready'));
