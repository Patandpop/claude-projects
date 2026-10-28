// Builds lair3.html: reuses the B2 banner styles and pixel helpers from ../lair/lair.src.html (lines by number), adds round three.
const fs = require('fs'), path = require('path'), D = __dirname;
const repo = 'C:/Users/magda/claude-projects/science-lesson-v4/planner/';
const old = fs.readFileSync(path.join(D, '../lair/lair.src.html'), 'utf8').split('\n');
const L = (a, b) => old.slice(a - 1, b).join('\n');
global.window = {}; require(repo + 'game-ulhu.js');
let css = L(6, 123) + '\n' + L(164, 184);
css = css.replace('.moon.full{', '.moon.ph-full{').replace('.moon.half{', '.moon.ph-half{').replace('.moon.dark{', '.moon.ph-dark{').replace('.dark{left:0;top:0;z-index:5}', '.shade{left:0;top:0;z-index:5}');
if (/\.dark\{/.test(css)) throw new Error('dark class still clashes');
let js = L(241, 341) + '\n' + L(357, 375) + '\n' + fs.readFileSync(path.join(D, 'new.js'), 'utf8');
js = js.replace('/*__ULHU__*/', () => JSON.stringify(window.ULHU_ART.b16));
const out = '<title>Lair Round Four</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Grenze+Gotisch:wght@500;700&family=IM+Fell+English:ital@0;1&display=swap">\n<style>\n/* Layout: one B2 "Band" banner at phone width, its control tray, then four galleries (heaps, half moons, vials, colours). Single dark look by choice. */\n'
  + css + '\n' + fs.readFileSync(path.join(D, 'new.css'), 'utf8') + '\n</style>\n' + fs.readFileSync(path.join(D, 'body.html'), 'utf8')
  + '\n<script>\n' + fs.readFileSync(repo + 'game-runes.js', 'utf8') + '\n</script>\n<script>\n(function () {\n\'use strict\';\n' + js + '\n})();\n</script>\n';
fs.writeFileSync(path.join(D, 'lair3.html'), out);
console.log('wrote', out.length, 'em dashes:', (out.match(/\u2014/g) || []).length);
