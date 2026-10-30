// Builds index.html: 15 variations of the CURRENT ritual tablet stone (1U.7 round two, Patryk 30 Oct: "I like the current
// one most, it can be improved"). Each is a copy of planner/game-stone.js (read only) with some of its own stone settings
// changed (polish, grain, pits, slab, edge, tint); the cracks stay the same in every copy so they compare fairly.
// Run: node replica/design/mockups/ritualstone2/make.js
const fs = require('fs'), path = require('path');
const P = path.join(__dirname, '../../../../planner/');
const stone = fs.readFileSync(P + 'game-stone.js', 'utf8');
const VARS = [
  ['NOW', 'As it is now', 'Your current stone, to compare.', {}],
  ['S1', 'Deeper polish', 'Smoother grain and a tighter, brighter shine, like the slab was polished for longer.', { c1: .3, spec: 2.2, sx: 70 }],
  ['S2', 'Velvet matte', 'Almost no shine, a fine soft grain; calm and easy on the eye.', { spec: .5, sx: 20, sheen: .5, b3: .16 }],
  ['S3', 'Violet heart', 'The same black stone with a stronger violet glow deep inside it.', { base: [30, 20, 44], st: [22, 12, 40], sheen: 1.6 }],
  ['S4', 'Midnight', 'Blue-black instead of violet-black, like deep water at night.', { base: [16, 20, 34], st: [10, 16, 34] }],
  ['S5', 'Sea-washed', 'Wet-looking: a broad bright shine and a faint teal sheen, as if the tide just went out.', { base: [20, 22, 28], spec: 2.6, sx: 30, st: [8, 22, 24] }],
  ['S6', 'Pitted basalt', 'Many small pits and a coarser grain, like volcanic rock.', { pits: 14, pitR: [.6, 2.2], b2: .25, b3: .18, spec: .9 }],
  ['S7', 'Marbled', 'Strong light and dark veins running through the stone.', { c1: .9, b2: .1 }],
  ['S8', 'Thick slab', 'A deeper bevel and a thicker side, so each tablet looks heavier.', { bev: 7.5, bevR: 6, side: 10, cham: 4 }],
  ['S9', 'Thin tile', 'A slimmer tile with a shallow bevel; lighter and neater in a long list.', { bev: 3.5, bevR: 3, side: 4, cham: 2 }],
  ['S10', 'Rough-hewn', 'Chipped, uneven edges, as if cut by hand from the cliff.', { rough: 1.4, chips: .3, cham: 5 }],
  ['S11', 'Glass-smooth obsidian', 'No grain at all and a sharp mirror shine: volcanic glass.', { c1: .15, b2: .04, b3: .03, spec: 2, sx: 90 }],
  ['S12', 'Plum', 'A warmer, redder black.', { base: [38, 18, 34], st: [26, 8, 20] }],
  ['S13', 'Smoky quartz', 'A grey-brown stone with soft clouds in it and a warm shine.', { base: [34, 30, 36], c1: .6, spec: 1.8, st: [20, 16, 14] }],
  ['S14', 'Abyssal green-black', 'Black with a hint of the sea green used everywhere else in Ulhu.', { base: [14, 24, 22], st: [6, 20, 16] }],
  ['S15', 'Ember-veined', 'The violet-black stone with a faint ember glow, like it remembers fire.', { base: [26, 16, 22], st: [30, 10, 4], sheen: 1.4 }]
];
const must = (s, a) => { if (s.indexOf(a) < 0) throw new Error('game-stone.js changed, look for: ' + a); };
function copy(id, o) {
  let s = stone; const key = id.toLowerCase();
  ['const V = {', "chips: .08 };", 'fR += bd * 16 * v.sheen; fG += bd * 14 * v.sheen; fB += bd * 26 * v.sheen;'].forEach((a) => must(s, a));
  const st = o.st || [16, 14, 26]; const ovr = Object.assign({ c1: .45, spec: 1.4, sx: 44 }, o); delete ovr.st;   // the stone as it was before S1 went into the game (30 Oct), so every row still starts from it
  s = s.replace('const V = {', 'const V = Object.assign({').replace('chips: .08 };', 'chips: .08 }, ' + JSON.stringify(ovr) + ');')
    .replace('fR += bd * 16 * v.sheen; fG += bd * 14 * v.sheen; fB += bd * 26 * v.sheen;', 'fR += bd * ' + st[0] + ' * v.sheen; fG += bd * ' + st[1] + ' * v.sheen; fB += bd * ' + st[2] + ' * v.sheen;')
    .split('window.STONE').join('window.STONE_' + key).split("'stone-css'").join("'stone-css-" + key + "'").replace(/\bst-/g, key + '-');
  return s;
}
const src = fs.readFileSync(path.join(__dirname, 'index.src.html'), 'utf8')
  .replace('/*__VARS__*/', () => JSON.stringify(VARS.map(([id, n, c]) => [id, n, c])))
  .replace('/*__STONES__*/', () => VARS.map(([id, , , o]) => copy(id, o)).join('\n'));
fs.writeFileSync(path.join(__dirname, 'index.html'), src);
console.log('wrote', src.length, 'bytes; em dashes:', (src.match(/—/g) || []).length);
