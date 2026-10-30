// The mock-up pages on the app site (app/src/mockups): copies of the lane mock-ups so Patryk can pick on his phone.
// Run: node app/tests/mockups.test.js. Checks each copy still matches its source, and the index links to every page.
'use strict';
const fs = require('fs');
const path = require('path');
let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };
const ROOT = path.join(__dirname, '..', '..');
const M = path.join(ROOT, 'app', 'src', 'mockups');
const same = (a, b) => fs.readFileSync(a, 'utf8').replace(/\r\n/g, '\n') === fs.readFileSync(b, 'utf8').replace(/\r\n/g, '\n');

['homework-feedback.html', 'slides-polish.html', 'learn-dual-coding.html', 'memory-tab.html'].forEach((f) => {
  ok(`${f} on the site is the same as lanes/mockups/${f}`, fs.existsSync(path.join(M, f)) && same(path.join(M, f), path.join(ROOT, 'lanes', 'mockups', f)));
});
ok('eyes-free.js on the site is the same as planner/eyes-free.js', same(path.join(M, 'eyes-free.js'), path.join(ROOT, 'planner', 'eyes-free.js')));
const ef = fs.readFileSync(path.join(M, 'eyes-free.html'), 'utf8'), src = fs.readFileSync(path.join(ROOT, 'lanes', 'mockups', 'eyes-free.html'), 'utf8');
ok('eyes-free.html on the site loads the code from beside it, and is otherwise the lane mock-up', /<script src="eyes-free\.js"><\/script>/.test(ef) && ef.replace('<script src="eyes-free.js"></script>', '<script src="../../planner/eyes-free.js"></script>').replace(/\r\n/g, '\n') === src.replace(/\r\n/g, '\n'));
const idx = fs.readFileSync(path.join(M, 'index.html'), 'utf8');
fs.readdirSync(M).filter((f) => /\.html$/.test(f) && f !== 'index.html').forEach((f) => ok(`the index links to ${f}`, idx.includes(`href="${f}"`)));
ok('no real class list or pupil name is bundled (the pages hold made-up rosters only)', !/Testperson|tomczynski/i.test(idx + ef));

console.log(failed ? `\n${failed} FAILED` : '\nAll mock-up site checks passed');
process.exit(failed ? 1 : 0);
