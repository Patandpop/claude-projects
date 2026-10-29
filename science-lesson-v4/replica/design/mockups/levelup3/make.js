// Builds index.html from index.src.html, inlining Ulhu's sprites (read-only from planner/game-ulhu.js).
const fs = require('fs'), path = require('path');
global.window = {}; require('C:/Users/magda/claude-projects/science-lesson-v4/planner/game-ulhu.js');
const ulhu = JSON.stringify(window.ULHU_ART.b16);
const src = fs.readFileSync(path.join(__dirname, 'index.src.html'), 'utf8').replace('/*__ULHU__*/', () => ulhu);
fs.writeFileSync(path.join(__dirname, 'index.html'), src);
console.log('wrote', src.length);
