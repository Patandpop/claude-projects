// Builds index.html: the dice game's ending, round three (1U.6, Patryk 30 Oct): the real Ulhu and the real Squall
// (planner/game-ulhu.js and planner/game-den.js, read only, pasted in as they are), a pixel-3D table, and the sea
// sweeping over the WHOLE table and taking the loser's dice. Three ways (D1 to D3) and ten losing words.
// Run: node replica/design/mockups/dicewater2/make.js
const fs = require('fs'), path = require('path');
const P = path.join(__dirname, '../../../../planner/');
const game = ['game-ulhu.js', 'game-pixel.js', 'game-runes.js', 'game-den.js'].map((f) => fs.readFileSync(P + f, 'utf8')).join('\n').replace(/—/g, '-');   // no em dashes on his pages
const src = fs.readFileSync(path.join(__dirname, 'index.src.html'), 'utf8').replace('/*__GAME__*/', () => game);
fs.writeFileSync(path.join(__dirname, 'index.html'), src);
console.log('wrote', src.length, 'bytes; em dashes:', (src.match(/—/g) || []).length);
