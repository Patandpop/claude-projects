// node planner/bundle.js — writes planner/dist/ with the three files to paste into Apps Script:
//   Code.gs, Planner.html, Logic.html (logic.js wrapped in a <script> tag).
'use strict';
const fs = require('fs');
const path = require('path');
const dir = __dirname, out = path.join(dir, 'dist');
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(dir, 'Code.gs'), path.join(out, 'Code.gs'));
fs.copyFileSync(path.join(dir, 'Planner.html'), path.join(out, 'Planner.html'));
fs.writeFileSync(path.join(out, 'Logic.html'), '<script>\n' + fs.readFileSync(path.join(dir, 'logic.js'), 'utf8') + '\n</script>\n');
// the behaviour app is part of the planner since 2026-10-12
['Behaviour.gs', 'Phone.html', 'BoardPage.html'].forEach((f) => fs.copyFileSync(path.join(dir, f), path.join(out, f)));
// Ulhu's Rituals (2026-10-23): Game.gs = the sprites + the server; game-ui.js goes into Planner.html and Phone.html at <!--GAME_UI-->
fs.writeFileSync(path.join(out, 'Game.gs'), fs.readFileSync(path.join(dir, 'Game.gs'), 'utf8'));
fs.writeFileSync(path.join(out, 'GameShop.gs'), '// Ulhu shop: 120 items with their room sprites, made by replica/art/export_shop.py\nconst SHOP = ' + fs.readFileSync(path.join(dir, 'game-shop.json'), 'utf8') + ';\n');
// 2026-10-24 redesign: Ulhu's sprites (8 and 16-bit) and the pixel engine (coin, bosses, wardrobe, icons) go in first
const pack = (list) => '<script>\n' + list.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + '\n</script>';
const ui = pack(['game-ulhu.js', 'game-pixel.js', 'game-runes.js', 'game-omens.js', 'game-ui.js']);
// 2026-10-27: the looks Patryk picked (stone tablets, temple bosses, blood and sigils) are their own file, GameArt.html, so each paste stays small enough to save
const art = pack(['game-temple.js', 'game-stone.js', 'game-blood.js', 'game-scroll.js', 'game-glass.js']);
// High Vespers is its own include (Sunday to Tuesday screen), so no paste file passes about 380 KB
const hv = pack(['game-highvespers.js']);
// 2026-10-27: the game code is its own file, GameUI.html, pulled in by include() (Planner.html at 406 KB would no longer save in the editor)
fs.writeFileSync(path.join(out, 'GameUI.html'), ui);
fs.writeFileSync(path.join(out, 'GameArt.html'), art);
fs.writeFileSync(path.join(out, 'GameHV.html'), hv);
['Planner.html', 'Phone.html'].forEach((f) => { const t = fs.readFileSync(path.join(out, f), 'utf8'); if (!t.includes('<!--GAME_UI-->')) throw new Error(f + ' has no <!--GAME_UI--> marker'); fs.writeFileSync(path.join(out, f), t.replace('<!--GAME_UI-->', () => "<?!= include('GameUI') ?>\n<?!= include('GameArt') ?>\n<?!= include('GameHV') ?>")); });
console.log('planner/dist/ ready: Code.gs, Planner.html, Logic.html, Behaviour.gs, Phone.html, BoardPage.html, Game.gs, GameShop.gs, GameUI.html, GameArt.html, GameHV.html');
