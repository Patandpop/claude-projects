// Builds moments.html from moments.src.html, inlining runes, omen cards, Ulhu's sprites and shop item art (read-only from the repo).
const fs = require('fs'), path = require('path');
const repo = 'C:/Users/magda/claude-projects/science-lesson-v4/planner/';
const runes = fs.readFileSync(repo + 'game-runes.js', 'utf8');
const omens = fs.readFileSync(repo + 'game-omens.js', 'utf8');
global.window = {}; require(repo + 'game-ulhu.js');
const ulhu = JSON.stringify(window.ULHU_ART.b16), items = JSON.stringify(window.ULHU_ART.items);
let src = fs.readFileSync(path.join(__dirname, 'moments.src.html'), 'utf8');
src = src.replace('/*__RUNES__*/', () => runes).replace('/*__OMENS__*/', () => omens).replace('/*__ULHU__*/', () => ulhu).replace('/*__ITEMS__*/', () => items);
fs.writeFileSync(path.join(__dirname, 'moments.html'), src);
console.log('wrote', src.length);
