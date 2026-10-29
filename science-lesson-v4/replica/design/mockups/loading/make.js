// Builds index.html from index.src.html, inlining Ulhu's small (32 x 32) idle and happy sprites (read-only from the repo).
const fs = require('fs'), path = require('path');
global.window = {}; require('C:/Users/magda/claude-projects/science-lesson-v4/planner/game-ulhu.js');
const b8 = window.ULHU_ART.b8, ulhu = JSON.stringify({ idle: b8.idle, happy: b8.happy });
const src = fs.readFileSync(path.join(__dirname, 'index.src.html'), 'utf8').replace('/*__ULHU__*/', () => ulhu);
fs.writeFileSync(path.join(__dirname, 'index.html'), src);
console.log('wrote', src.length);
