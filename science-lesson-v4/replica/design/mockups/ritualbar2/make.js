// Builds index.html: the 2-week bar under the rituals, round two (1U.13), in real stained glass under the REAL ritual
// tablet (planner/game-stone.js, read only, pasted in as it is).
// Run: node replica/design/mockups/ritualbar2/make.js
const fs = require('fs'), path = require('path');
const stone = fs.readFileSync(path.join(__dirname, '../../../../planner/game-stone.js'), 'utf8');
const src = fs.readFileSync(path.join(__dirname, 'index.src.html'), 'utf8').replace('/*__STONE__*/', () => stone);
fs.writeFileSync(path.join(__dirname, 'index.html'), src);
console.log('wrote', src.length, 'bytes; em dashes:', (src.match(/—/g) || []).length);
