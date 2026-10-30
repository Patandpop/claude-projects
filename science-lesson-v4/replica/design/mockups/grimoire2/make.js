// Builds index.html: the Grimoire (BG1 desk, T1 tome, T4 chains, from ../grimoire/index.html) now opening first onto
// the day in glass (Patryk 30 Oct, 1U.10): the real D1 window from planner/game-glass.js, curses left in red, blessings
// right, the path weaving down the day; the night line follows under it. The game files are read only, pasted in as
// they are (game-glass.js, game-blood.js for the sigils, and Ulhu's sprites from game-ulhu.js).
// Run: node replica/design/mockups/grimoire2/make.js
const fs = require('fs'), path = require('path');
const P = path.join(__dirname, '../../../../planner/');
global.window = {}; require(P + 'game-ulhu.js');
const ulhu = 'window.ULHU_SPR = ' + JSON.stringify(window.ULHU_ART.b16) + ';';
let s = fs.readFileSync(path.join(__dirname, '../grimoire/index.html'), 'utf8');
const swap = (a, b) => { if (s.indexOf(a) < 0) throw new Error('the Grimoire mock-up changed, look for: ' + a); s = s.split(a).join(b); };
swap('<title>Grimoire Round Five</title>', '<title>Grimoire: opens on the day in glass (1U.10)</title>');
swap('<h1>Grimoire Round Five</h1>', '<h1>The Grimoire opens on your day</h1>');
swap(s.slice(s.indexOf('<p class="lede">'), s.indexOf('</p>', s.indexOf('<p class="lede">')) + 4),
  '<p class="lede">Your picks BG1 desk, T1 tome and T4 chains, unchanged. Tap the book: when the tentacles drag you in, the first page is your day in glass, the same window as the night line (curses on the left in red, blessings on the right, the path weaving down from morning to evening, the light filling down it). Ulhu\'s line and the night line, where you tell him more about each curse, follow underneath.</p>');
swap('<script src="ulhu-art.js"></script>', '<script>' + ulhu + '</script>');
swap('<script src="game-blood.js"></script>', '<script>' + fs.readFileSync(P + 'game-blood.js', 'utf8') + '</script><script>' + fs.readFileSync(P + 'game-glass.js', 'utf8') + '</script>');
// the sheet: the day window first, then Ulhu's line and the night line
swap(`  let h = '<div class="say">`, `  let h = '<div class="sec">Today in glass</div><div class="dayg">' + (window.GLASS ? GLASS.day(EV.map((e) => ({ t: e.t, side: e.c ? 'c' : 'b', name: e.n })), { key: 'grim-today' }) : '') + '</div><div class="say">`);
swap(`  $('#sb').innerHTML = h + '</div>';`, `  $('#sb').innerHTML = h + '</div>'; if (window.GLASS) GLASS.paint($('#sb'));`);
swap('.sec{', '.dayg{max-width:300px;margin:0 auto 8px}.sec{');
fs.writeFileSync(path.join(__dirname, 'index.html'), s);
console.log('wrote', s.length, 'bytes; em dashes:', (s.match(/—/g) || []).length);
