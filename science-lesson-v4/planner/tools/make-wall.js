// Builds planner/game-wall.js, the wall (Breakwater) at the top of the Teaching area: Patryk's final pick WD-1b-ii with his
// fixes of 30 Oct (replica/design/mockups/wall8/index.html). The geometry, the moon, the slices, the numerals and the SVG
// drawing are copied as they are; only the mock-up's made-up fortnight is swapped for his real one.
// Run: node planner/tools/make-wall.js  (then the game checks)
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../replica/design/mockups/wall8/index.html'), 'utf8');
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('wall8 changed, look for: ' + a); return src.slice(i, j); };
const geo = cut('/* ---------- geometry helpers ---------- */', '/* ---------- the four cards ---------- */');
const base = cut('const SLICES=', 'const VARS=[');
const draw = cut('/* ---------- drawing: every shard is its own leaded piece ---------- */', 'function swatch(');
const dayDone = cut('function dayDone(', '\n');
const fixed = cut("Object.assign({id:'WD-1b-ii-fixed'", 'MOONBASE)') + 'MOONBASE)';
const out = `/* The wall (Breakwater), at the top of the Teaching area (Patryk's final pick WD-1b-ii with his fixes of 30 Oct).
   MADE BY planner/tools/make-wall.js from replica/design/mockups/wall8/index.html; change those, not this file.
   One square stained-glass block per school day, this week on top and next week below. In each block a moon of five
   wedges, one per period (I gold at the top, round to V ruby): the inner piece is the lesson (lit in the class colour
   once built), the outer ring its homework (white once set, lilac when none is needed); a free period has its own calm
   colour. Every piece is real leaded glass.
   WALL.html(w) -> the SVG. w = { days: ['Mon 2 Nov', ... 10], lessons: [{ day 0-9, per 1-5, cls, col, built, hw:
     'set'|'needed'|'none' }] }. Each piece carries data-d, data-p and data-part, so a tap can say what it is:
   WALL.describe(w, d, p, part) -> one line of HTML. WALL.count(w) -> { built, lessons, hwSet, hwNeed }. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.WALL) return;
let LESSONS = [], CLASSCOL = {};
const DL = ['M', 'T', 'W', 'T', 'F'];
${dayDone}
${geo}
${base}
const V = ${fixed};
${draw}
function load(w) { LESSONS = (w && w.lessons || []).map((l, i) => Object.assign({}, l, { i })); CLASSCOL = {}; LESSONS.forEach((l) => { CLASSCOL[l.cls] = l.col || '#3fb4e8'; }); return LESSONS.map((l) => ({ built: !!l.built, hw: l.hw || 'none' })); }
function html(w) { const st = load(w); return wallSVG(V, st, 'wl'); }
function describe(w, d, p, part) {
  const l = (w.lessons || []).find((x) => x.day === d && x.per === p), day = (w.days || [])[d] || '', base = '<b>' + day + ', P' + p;
  if (!l) return base + '</b>: free period.';
  if (part === 'lesson') return base + ', ' + l.cls + '</b>: lesson ' + (l.built ? 'built.' : 'not built yet.');
  return base + ', ' + l.cls + '</b>: ' + (l.hw === 'set' ? 'homework set.' : l.hw === 'none' ? 'no homework needed.' : 'homework needed, not set yet.');
}
function count(w) { const L = (w && w.lessons) || []; return { lessons: L.length, built: L.filter((l) => l.built).length, hwNeed: L.filter((l) => l.hw !== 'none').length, hwSet: L.filter((l) => l.hw === 'set').length }; }
window.WALL = { html, describe, count };
})();
`;
fs.writeFileSync(path.join(__dirname, '../game-wall.js'), out);
console.log('wrote game-wall.js', out.length, 'bytes; em dashes:', (out.match(/—/g) || []).length);
