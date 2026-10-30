// The mock-up pages on the app site: app/build.js copies them from their source folders at build time (lanes/mockups,
// planner/eyes-free.js and the Ulhu mock-up folders), so nothing is kept as a copy that could go stale.
// Run: node app/tests/mockups.test.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };
const ROOT = path.join(__dirname, '..', '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mockbuild-'));
execFileSync(process.execPath, [path.join(ROOT, 'app', 'build.js'), out], { stdio: 'pipe' });
const M = path.join(out, 'mockups');
const walk = (d) => fs.readdirSync(d).flatMap((f) => fs.statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]);
const rel = walk(M).map((f) => path.relative(M, f).split(path.sep).join('/'));
ok('the built site has the mock-ups index', rel.includes('index.html'));
const idx = fs.readFileSync(path.join(M, 'index.html'), 'utf8');
[...idx.matchAll(/href="([^"#]+\.html)"/g)].map((m) => m[1]).forEach((h) => ok(`the index link ${h} points at a built page`, rel.includes(h)));
const ef = fs.readFileSync(path.join(M, 'eyes-free.html'), 'utf8');
ok('eyes-free.html on the site loads the code from beside it', /<script src="eyes-free\.js"><\/script>/.test(ef) && !/src="\.\.\/\.\.\/planner/.test(ef));
ok('eyes-free.js on the site is planner/eyes-free.js', fs.readFileSync(path.join(M, 'eyes-free.js'), 'utf8') === fs.readFileSync(path.join(ROOT, 'planner', 'eyes-free.js'), 'utf8'));
ok('every lane mock-up page is on the site', fs.readdirSync(path.join(ROOT, 'lanes', 'mockups')).filter((f) => /\.html$/.test(f)).every((f) => rel.includes(f)));
ok('the Ulhu mock-up folders are on the site, with their pictures', ['ulhu/ritualbar/index.html', 'ulhu/dicewater/index.html', 'ulhu/grimoire/opened.html', 'ulhu/companion/day-tags.html'].every((f) => rel.includes(f)) && rel.some((f) => /^diagram-style\/.*\.png$/.test(f)));
ok('only pages, code, pictures and text are copied (no scripts like make.py)', rel.every((f) => /\.(html|js|css|png|jpg|svg|txt)$/.test(f)));
ok('the app source holds only the index for mock-ups (no copies to go stale)', fs.readdirSync(path.join(ROOT, 'app', 'src', 'mockups')).join() === 'index.html');
ok('no real pupil name is bundled (made-up rosters only)', !/Testperson|tomczynski/i.test(idx + ef));
fs.rmSync(out, { recursive: true, force: true });
console.log(failed ? `\n${failed} FAILED` : '\nAll mock-up site checks passed');
process.exit(failed ? 1 : 0);
