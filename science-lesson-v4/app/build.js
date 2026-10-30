// node app/build.js [outDir]
//   Builds the installed app (lanes/design-installed-app.md) from app/src into app/dist (or outDir).
//   Cloudflare Pages runs this on every push: build command "node app/build.js", output folder "app/dist".
//   Plain copy, no framework: every file in app/src is copied as it is, and {{BUILD_STAMP}} becomes the build
//   date and time (shown in Settings and on the test page, so Patryk can tell which copy he has).
//   Nothing here holds data: the app's data stays in his Google account; the key is typed once per device.
'use strict';
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src');
const out = path.resolve(process.argv[2] || path.join(__dirname, 'dist'));
const TEXT = /\.(html|js|css|json|webmanifest|svg|txt)$|^_headers$/;

const now = new Date();
const stamp = `${now.getUTCDate()} ${now.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`;

// the build folder is made fresh each time, but only ever a folder this script made (it leaves a marker file)
const MARK = '.app-build';
if (fs.existsSync(out) && fs.readdirSync(out).length && !fs.existsSync(path.join(out, MARK))) {
  console.error(`Refusing to empty ${out}: it was not made by app/build.js`); process.exit(1);
}
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, MARK), stamp + '\n');
let n = 0;
(function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const a = path.join(from, f), b = path.join(to, f);
    if (fs.statSync(a).isDirectory()) { copy(a, b); continue; }
    if (TEXT.test(f)) fs.writeFileSync(b, fs.readFileSync(a, 'utf8').split('{{BUILD_STAMP}}').join(stamp));
    else fs.copyFileSync(a, b);
    n++;
  }
})(src, out);
// files shared with the planner pages, copied as they are into dist/shared/ so both use one copy of the rules:
// the day and timer rules, Ulhu's pop-up and his sprites
const SHARED = ['day-logic.js', 'day-popup.js', 'game-ulhu.js'];
fs.mkdirSync(path.join(out, 'shared'), { recursive: true });
SHARED.forEach((f) => { fs.copyFileSync(path.join(__dirname, '..', 'planner', f), path.join(out, 'shared', f)); n++; });
// the mock-ups Patryk picks from (design chat, 30 Oct): copied from their source folders at build time, never kept as
// copies in app/src, so a lane editing its mock-up can never leave the site stale. Pages, code and pictures only.
const ROOT = path.join(__dirname, '..');
const MOCK_OK = /\.(html|js|css|png|jpg|svg|txt)$/;
const MOCKUPS = [['lanes/mockups', ''], ['replica/design/mockups/ritualbar', 'ulhu/ritualbar'], ['replica/design/mockups/dicewater', 'ulhu/dicewater'],
  ['replica/design/mockups/grimoire', 'ulhu/grimoire'], ['replica/design/mockups/companion', 'ulhu/companion']];
(function copyMock(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const a = path.join(from, f), b = path.join(to, f);
    if (fs.statSync(a).isDirectory()) { copyMock(a, b); continue; }
    if (!MOCK_OK.test(f)) continue;
    if (TEXT.test(f)) fs.writeFileSync(b, fs.readFileSync(a, 'utf8').split('{{BUILD_STAMP}}').join(stamp).split('src="../../planner/eyes-free.js"').join('src="eyes-free.js"'));
    else fs.copyFileSync(a, b);
    n++;
  }
})(path.join(ROOT, 'lanes', 'mockups'), path.join(out, 'mockups'));
MOCKUPS.slice(1).forEach(([from, to]) => { const copyMock2 = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) { const x = path.join(a, f), y = path.join(b, f); if (fs.statSync(x).isDirectory()) copyMock2(x, y); else if (MOCK_OK.test(f)) { fs.copyFileSync(x, y); n++; } } }; if (fs.existsSync(path.join(ROOT, from))) copyMock2(path.join(ROOT, from), path.join(out, 'mockups', to)); });
fs.copyFileSync(path.join(ROOT, 'planner', 'eyes-free.js'), path.join(out, 'mockups', 'eyes-free.js')); n++;
console.log(`app built: ${n} files in ${path.relative(process.cwd(), out) || '.'} (build ${stamp})`);
