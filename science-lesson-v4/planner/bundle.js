// node planner/bundle.js [--pasted] [--label "what changed"]
//   Writes planner/dist/ with the files to paste into Apps Script: Code.gs, Planner.html, Logic.html (logic.js wrapped
//   in a <script> tag), Behaviour.gs, Phone.html, BoardPage.html, Game.gs, GameShop.gs, GameUI.html, GameArt.html,
//   GameHV.html, GameDen.html, Day.gs and DayUI.html (the day screen).
//
// Paste-file guard (Fable work plan 0.4, 29 Oct 2026):
//   - comments are stripped from the pasted copies only (strip-comments.js; the sources keep every comment);
//   - a warning is printed for any paste file over 340 KB (the editor stops saving around there);
//   - each file's hash is compared with dist/.last-paste.json and the files changed since the last paste are listed;
//   - Planner and Phone show the build date and time in a corner ({{BUILD_STAMP}} in the sources);
//   - --pasted: copies the changed files for Patryk into the paste folder (PASTE_DIR, or the Desktop folder
//     "Planner paste files") named "PASTE INTO APPS SCRIPT - <file> (<date>, <label>).txt", and records the hashes.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { stripFile } = require('./strip-comments.js');

const dir = __dirname, out = path.join(dir, 'dist');
const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const LIMIT = 340 * 1024;
const SYNC_DIR = 'G:/My Drive/Beechen Cliff Science/Admin/Planner Sync';   // the planner reads its files from here
const PASTE_DIR = process.env.PASTE_DIR || (fs.existsSync(SYNC_DIR) ? SYNC_DIR : path.join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop', 'Planner paste files'));
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
fs.mkdirSync(out, { recursive: true });

const files = {};
files['Code.gs'] = read('Code.gs');
// private settings (staff email addresses) live only on the home PC, in planner/private-settings.json (git-ignored);
// they go into the pasted Code.gs, never into the project history (2026-10-30)
{
  let priv = {}; try { priv = JSON.parse(read('private-settings.json')); } catch (e) { /* none on this PC: placeholders stay */ }
  files['Code.gs'] = files['Code.gs'].replace('{{TECH_EMAILS}}', () => String(priv.TECH_EMAILS || '').replace(/'/g, ''));
}
files['Planner.html'] = read('Planner.html');
files['Logic.html'] = '<script>\n' + read('logic.js') + '\n</script>\n';
files['Memory.gs'] = read('memory.js');   // the memory map maths (big goal 1): a server file, PlannerMemory, used by Code.gs's daily update
// the behaviour app is part of the planner since 2026-10-12
['Behaviour.gs', 'Phone.html', 'BoardPage.html'].forEach((f) => { files[f] = read(f); });
// Ulhu's Rituals (2026-10-23): Game.gs = the server; game-ui.js goes into Planner.html and Phone.html at <!--GAME_UI-->
files['Game.gs'] = read('Game.gs');
// Ulhu as a life companion (Lane D, 2026-10-29): day tags, the Ill rule, his overnight adventure; its own server file
files['Companion.gs'] = read('Companion.gs');
files['GameShop.gs'] = '// Ulhu shop: 120 items with their room sprites, made by replica/art/export_shop.py\nconst SHOP = ' + read('game-shop.json') + ';\n';
// 2026-10-24 redesign: Ulhu's sprites (8 and 16-bit) and the pixel engine (coin, bosses, wardrobe, icons) go in first
const pack = (list) => '<script>\n' + list.map(read).join('\n') + '\n</script>';
files['GameUI.html'] = pack(['game-ulhu.js', 'game-pixel.js', 'game-runes.js', 'game-omens.js', 'game-tabs.js', 'game-pairs.js', 'game-ui.js']);
// 2026-10-27: the looks Patryk picked (stone tablets, temple bosses, blood and sigils) are their own file, GameArt.html, so each paste stays small enough to save
files['GameArt.html'] = pack(['game-temple.js', 'game-stone.js', 'game-blood.js', 'game-scroll.js', 'game-glass.js', 'game-oracle.js']);
// High Vespers is its own include (Sunday to Tuesday screen), so no paste file passes the limit
files['GameHV.html'] = pack(['game-highvespers.js', 'game-lair.js', 'game-brew.js']);   // the Lair banner rides here (1U.5)
// 2026-10-28: the Den (Round Grotto, Night Market, dice with every keeper) is its own include too; it loads before GameUI's code runs
files['GameDen.html'] = pack(['game-den.js']);
// 2026-10-29 Lane D: Ulhu as a life companion, the page side (sound now; day tags, his adventure and the term page next)
files['GameComp.html'] = pack(['game-companion.js']);
// 2026-10-30 Lane C: the day screen (layout B3) with its timer and quick capture, on the phone's Day tab; Day.gs is its server side
files['Day.gs'] = read('Day.gs');
files['DayUI.html'] = pack(['day-logic.js', 'day-timer.js', 'day-capture.js', 'day-screen.js']);
if (!files['Phone.html'].includes('<!--DAY_UI-->')) throw new Error('Phone.html has no <!--DAY_UI--> marker');
files['Phone.html'] = files['Phone.html'].replace('<!--DAY_UI-->', () => "<?!= include('DayUI') ?>");
// 2026-10-27: the game code is its own file, GameUI.html, pulled in by include() (Planner.html at 406 KB would no longer save in the editor)
['Planner.html', 'Phone.html'].forEach((f) => {
  if (!files[f].includes('<!--GAME_UI-->')) throw new Error(f + ' has no <!--GAME_UI--> marker');
  files[f] = files[f].replace('<!--GAME_UI-->', () => "<?!= include('GameUI') ?>\n<?!= include('GameArt') ?>\n<?!= include('GameHV') ?>\n<?!= include('GameDen') ?>\n<?!= include('GameComp') ?>");
  if (!files[f].includes('{{BUILD_STAMP}}')) throw new Error(f + ' has no {{BUILD_STAMP}} marker (the build date shown in the corner)');
});

// comments out of the pasted copies (never the sources)
const warnings = [];
let saved = 0;
for (const f of Object.keys(files)) {
  const r = stripFile(f, files[f]);
  files[f] = r.text; saved += r.saved; r.warnings.forEach((w) => warnings.push(w));
}

// hashes are taken before the build stamp goes in, so a rebuild with nothing new counts as unchanged
const now = new Date();
const stamp = `${now.getDate()} ${now.toLocaleString('en-GB', { month: 'short' })} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
const recPath = path.join(out, '.last-paste.json');
let last = null;
try { last = JSON.parse(fs.readFileSync(recPath, 'utf8')); } catch (_) { last = null; }
const hashes = {}, changed = [], big = [];
for (const f of Object.keys(files)) {
  hashes[f] = crypto.createHash('sha1').update(files[f]).digest('hex').slice(0, 12);
  files[f] = files[f].split('{{BUILD_STAMP}}').join(stamp);
  fs.writeFileSync(path.join(out, f), files[f]);
  const size = Buffer.byteLength(files[f]);
  if (size > LIMIT) big.push(`${f} (${(size / 1024).toFixed(0)} KB)`);
  if (!last || !last.files || last.files[f] !== hashes[f]) changed.push(f);
}

console.log(`planner/dist/ ready: ${Object.keys(files).join(', ')}`);
console.log(`  build stamp ${stamp}; comments stripped from the pasted copies (${(saved / 1024).toFixed(0)} KB smaller)`);
warnings.forEach((w) => console.log(`  WARNING ${w}`));
if (big.length) console.log(`  WARNING over 340 KB, the editor may refuse to save: ${big.join(', ')}. Split the file (see GameArt / GameHV / GameDen).`);
if (!last) console.log(`  never pasted yet (no dist/.last-paste.json): all ${changed.length} files count as changed since last paste`);
else if (changed.length) console.log(`  changed since last paste: ${changed.join(', ')}  (last paste ${last.at}${last.label ? ', ' + last.label : ''})`);
else console.log(`  nothing changed since the last paste (${last.at}${last.label ? ', ' + last.label : ''})`);

if (flag('--pasted')) {
  // One COMPLETE set every time (rule of 29 Oct 2026, after two partial sets on one night broke a deploy): every file
  // Patryk pastes, not only the changed ones, into Admin\Planner Sync when Drive is up (else the Desktop folder), with
  // a line in that folder's sync-log.txt saying which set it replaces. Every Drive write is logged.
  const label = opt('--label') || 'planner';
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const setName = `${day}, complete set, ${label}`;
  fs.mkdirSync(PASTE_DIR, { recursive: true });
  const copied = [];
  for (const f of Object.keys(files)) {
    const name = `PASTE INTO APPS SCRIPT - ${f} (${setName}).txt`;
    fs.copyFileSync(path.join(out, f), path.join(PASTE_DIR, name));
    copied.push(name);
  }
  const when = now.toISOString().slice(0, 19);
  const replaces = last && last.set ? `; replaces the set "${last.set}"` : '';
  fs.appendFileSync(path.join(PASTE_DIR, 'sync-log.txt'), `${when} COPY planner/dist ${Object.keys(files).join(', ')} -> ${path.basename(PASTE_DIR)} as '... (${setName}).txt' (${changed.length ? 'changed since the last set: ' + changed.join(', ') : 'nothing changed since the last set'}${replaces})\n`);
  fs.writeFileSync(recPath, JSON.stringify({ at: when.replace('T', ' '), label, set: setName, files: hashes }, null, 1));
  fs.appendFileSync(path.join(out, 'paste-log.txt'), `${when.replace('T', ' ')}  complete set "${setName}" (${copied.length} files) -> ${PASTE_DIR}${replaces}\n`);
  console.log(`  complete set "${setName}": ${copied.length} files in ${PASTE_DIR}${replaces}`);
  console.log('  recorded in dist/.last-paste.json and the folder\'s sync-log.txt');
}
