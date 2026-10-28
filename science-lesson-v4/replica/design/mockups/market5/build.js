const fs = require('fs'), path = require('path');
const P = 'C:/Users/magda/claude-projects/science-lesson-v4/planner/';
let src = fs.readFileSync(path.join(__dirname, 'src.html'), 'utf8');
const rd = (f) => fs.readFileSync(P + f, 'utf8').trim().replace(/[\u2014\u2013]/g, '-');
const gullet = fs.readFileSync(path.join(__dirname, 'gullet.part.js'), 'utf8');
src = src.replace('/*@SHOP*/', () => 'window.SHOP=' + rd('game-shop.json') + ';').replace('/*@ULHU*/', () => rd('game-ulhu.js'))
  .replace('/*@PIXEL*/', () => rd('game-pixel.js')).replace('/*@RUNES*/', () => rd('game-runes.js')).replace('/*@EN*/', () => fs.readFileSync(path.join(__dirname, 'en.part.js'), 'utf8')).replace('/*@GULLET*/', () => gullet + '\n}');
fs.writeFileSync(path.join(__dirname, 'market-five.html'), src);
const vis = src.replace(/<script[\s\S]*?<\/script>/g, '');
console.log('bytes', src.length, 'emdash', (src.match(/\u2014/g) || []).length, 'done-word', (vis.match(/\bdone\b/gi) || []).length);
