// Builds planner/game-lair.js from the Lair round-four mock-up (replica/design/mockups/lair: lair3.html + new.js), keeping
// only Patryk's picks (1U.5, 2026-10-29): B2 Band, moon in the middle, P2 morning / P3 day / P3 evening / P2 night,
// M2 Crescent half moon, V1 round flask, H4 Pile. Run: node planner/tools/make-lair.js  (then the game checks)
const fs = require('fs'), path = require('path'), M = path.join(__dirname, '../../replica/design/mockups/lair/');
const L = fs.readFileSync(M + 'lair3.html', 'utf8'), LL = L.split('\n'), N = fs.readFileSync(M + 'new.js', 'utf8').split('\n');
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error('not found: ' + a); return s.slice(i, j); };
const nl = (a, b) => N.slice(a - 1, b).join('\n');
const need = (s, re) => { if (!re.test(s)) throw new Error('mock-up changed, check the line numbers: ' + re); return s; };
const pix = between(L, 'function rng(seed)', '\nfunction drawVial(');
const helpers = need(nl(2, 11), /^function el\(/), moon = need(nl(25, 50), /^const CRATERS/), vial = need(nl(51, 95), /the vials/), heap = need(nl(96, 179), /the heaps[\s\S]*function heapBox/);
const RENAME = ['shaft', 'wave', 'rise', 'flash', 'bob', 'hop', 'flinch', 'zz', 'vshake', 'drop', 'flick', 'numup'];
const scope = (line) => {
  let s = line;
  RENAME.forEach((k) => { s = s.replace(new RegExp('@keyframes ' + k + '\\{'), '@keyframes lz-' + k + '{').replace(new RegExp('animation:' + k + '\\b', 'g'), 'animation:lz-' + k); });
  if (/^\s*@|^\s*\/\*|^\s*$/.test(s) || s.indexOf('{') < 0) return s;
  const i = s.indexOf('{'), sel = s.slice(0, i), rest = s.slice(i);
  return sel.split(',').map((x) => { x = x.trim(); if (/^\.ban\b/.test(x)) return x.replace(/^\.ban/, '.lzb'); if (/^\.v2 /.test(x)) return '.lzb ' + x.slice(4); return '.lzb ' + x; }).join(',') + rest;
};
const cssLines = LL.slice(27, 99).concat(LL.slice(145, 158)).filter((l) => !/^\.(scrap|paper|s-)/.test(l.trim()));
const css = cssLines.map(scope).join('\n').replace(/var\(--honey\)/g, '#ffd56a').replace(/var\(--ax\)/g, 'var(--a)').replace(/var\(--gx\)/g, 'var(--g)').replace(/var\(--fx\)/g, 'var(--f)');
const GLUE = fs.readFileSync(path.join(__dirname, 'lair-glue.js'), 'utf8');
const out = `/* The Lair banner (1U.5, Patryk's picks 2026-10-28/29, from replica/design/mockups/lair round four):
   B2 The Band (only the middle band of a huge moon shows behind Ulhu), colours P2 morning, P3 day, P3 evening, P2 night,
   M2 Crescent half moon, V1 round flask for health, H4 Pile of runes (30px runes in a pyramid up to 21: 6-5-4-3-2-1).
   MADE BY planner/tools/make-lair.js from the mock-up plus planner/tools/lair-glue.js; change those, not this file.
   LAIR.mount(ban) builds the layers inside the banner element; LAIR.paint(ban, s) redraws them, where
   s = { time: 'morning'|'day'|'evening'|'night', phase: 'full'|'half'|'dark', hp, maxHp, runes, tide (0..1), drop };
   LAIR.level(ban) plays the tide flood; LAIR.slip(ban) shakes the flask. */
(function () {
'use strict';
const CSS = ${JSON.stringify(css)};
const TIMES = [['morning', 'Morning'], ['day', 'Day'], ['evening', 'Evening'], ['night', 'Night']];
const GLASS = { h: '#f0b445', hd: '#b0701e', b: '#4a72d8', bd: '#22408a' };
${pix}
${helpers}
// his picks only (the mock-up's P2 morning, P3 day, P3 evening, P2 night)
const PALS = { morning: mkPal('Rose dawn', '#f2c0ac', '#2c4658', '#5a5462', '#ffe2d0', '#8cb890', '#ecd2c0'), day: mkPal('Jade deep', '#17684c', '#020e0a', '#173229', '#c8f060', '#5aa040', '#cfc48e'),
  evening: mkPal('Violet dusk', '#9a5c9c', '#1a0c26', '#3a2848', '#ffb0e0', '#6a7a7a', '#e0c8e4'), night: mkPal('Ink black', '#141c2c', '#020306', '#101622', '#5ad0c0', '#1e4a48', '#a8b0bc') };
${moon}
${vial}
${heap}
${GLUE}
})();
`;
fs.writeFileSync(path.join(__dirname, '../game-lair.js'), out);
console.log('wrote game-lair.js', out.length, 'bytes; em dashes:', (out.match(/—/g) || []).length);
