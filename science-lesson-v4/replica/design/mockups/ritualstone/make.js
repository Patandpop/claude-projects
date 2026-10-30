// Builds index.html: the real ritual tablets (planner/game-stone.js, read only) drawn in other stones, beside the real
// rune tablets (planner/game-runes.js, read only), for 1U.7 "the ritual colour should match the stone rune tablets".
// Each stone is a copy of game-stone.js with only its colours swapped (and its names, so the copies don't clash).
// Run: node replica/design/mockups/ritualstone/make.js
const fs = require('fs'), path = require('path');
const P = path.join(__dirname, '../../../../planner/');
const stone = fs.readFileSync(P + 'game-stone.js', 'utf8'), runes = fs.readFileSync(P + 'game-runes.js', 'utf8');
const STONES = {
  now: { base: [22, 18, 30], sheen: [16, 14, 26], grad: '#2a2630,#18161c', nm: '#efeaf4', sub: '#aaa3b8' },
  sage: { base: [44, 58, 50], sheen: [14, 22, 16], grad: '#3a4a42,#1e2822', nm: '#eef4ee', sub: '#a9bcb0' },
  slate: { base: [38, 46, 60], sheen: [14, 18, 28], grad: '#34404e,#1a2028', nm: '#eef2f8', sub: '#a6b2c4' },
  obsid: { base: [30, 28, 38], sheen: [14, 14, 22], grad: '#2c2a36,#141218', nm: '#efeef4', sub: '#a8a6b8' },
  sand: { base: [86, 70, 46], sheen: [22, 18, 10], grad: '#6e5c40,#3a3020', nm: '#fff6e6', sub: '#e6d6b6' },
  coral: { base: [82, 36, 46], sheen: [24, 12, 14], grad: '#6a3440,#3a1820', nm: '#fff0f2', sub: '#ecc0c8' }
};
const must = (s, a) => { if (s.indexOf(a) < 0) throw new Error('game-stone.js changed, look for: ' + a); };
function copy(key) {
  const c = STONES[key]; let s = stone;
  ['base: [22, 18, 30]', 'fR += bd * 16 * v.sheen; fG += bd * 14 * v.sheen; fB += bd * 26 * v.sheen;', '#2a2630,#18161c', 'color:#efeaf4', 'color:#aaa3b8'].forEach((a) => must(s, a));
  s = s.replace('base: [22, 18, 30]', 'base: [' + c.base.join(', ') + ']')
    .replace('fR += bd * 16 * v.sheen; fG += bd * 14 * v.sheen; fB += bd * 26 * v.sheen;', 'fR += bd * ' + c.sheen[0] + ' * v.sheen; fG += bd * ' + c.sheen[1] + ' * v.sheen; fB += bd * ' + c.sheen[2] + ' * v.sheen;')
    .split('#2a2630,#18161c').join(c.grad).split('color:#efeaf4').join('color:' + c.nm).split('color:#aaa3b8').join('color:' + c.sub)
    .split('window.STONE').join('window.STONE_' + key).split("'stone-css'").join("'stone-css-" + key + "'").replace(/\bst-/g, key + '-');
  return s;
}
const src = fs.readFileSync(path.join(__dirname, 'index.src.html'), 'utf8')
  .replace('/*__RUNES__*/', () => runes)
  .replace('/*__STONES__*/', () => Object.keys(STONES).map(copy).join('\n'));
fs.writeFileSync(path.join(__dirname, 'index.html'), src);
console.log('wrote', src.length, 'bytes; em dashes:', (src.match(/—/g) || []).length);
