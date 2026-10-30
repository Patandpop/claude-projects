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

['homework-feedback.html', 'slides-polish.html', 'learn-dual-coding.html', 'memory-tab.html', 'exam-practice-cover.html', 'decisions.html', 'homework-ahead.html'].forEach((f) => {
  ok(`${f} on the site is the same as lanes/mockups/${f}`, fs.existsSync(path.join(M, f)) && same(path.join(M, f), path.join(ROOT, 'lanes', 'mockups', f)));
});
ok('eyes-free.js on the site is the same as planner/eyes-free.js', same(path.join(M, 'eyes-free.js'), path.join(ROOT, 'planner', 'eyes-free.js')));
const ef = fs.readFileSync(path.join(M, 'eyes-free.html'), 'utf8'), src = fs.readFileSync(path.join(ROOT, 'lanes', 'mockups', 'eyes-free.html'), 'utf8');
ok('eyes-free.html on the site loads the code from beside it, and is otherwise the lane mock-up', /<script src="eyes-free\.js"><\/script>/.test(ef) && ef.replace('<script src="eyes-free.js"></script>', '<script src="../../planner/eyes-free.js"></script>').replace(/\r\n/g, '\n') === src.replace(/\r\n/g, '\n'));
ok('the diagram-style page and its pictures are on the site, same as the lane copy', same(path.join(M, 'diagram-style', 'index.html'), path.join(ROOT, 'lanes', 'mockups', 'diagram-style', 'index.html')) && fs.readdirSync(path.join(M, 'diagram-style')).filter((f) => /\.png$/.test(f)).length === 9);
['ritualbar', 'dicewater', 'grimoire', 'companion'].forEach((d) => {
  const srcDir = path.join(ROOT, 'replica', 'design', 'mockups', d), dst = path.join(M, 'ulhu', d);
  ok(`the Ulhu mock-up folder ${d} on the site matches replica/design/mockups/${d}`, fs.existsSync(dst) && fs.readdirSync(srcDir).every((f) => fs.existsSync(path.join(dst, f)) && same(path.join(srcDir, f), path.join(dst, f))));
});
const idx = fs.readFileSync(path.join(M, 'index.html'), 'utf8');
fs.readdirSync(M).filter((f) => /\.html$/.test(f) && f !== 'index.html').forEach((f) => ok(`the index links to ${f}`, idx.includes(`href="${f}"`)));
ok('the index links to the diagram-style page', idx.includes('href="diagram-style/index.html"'));
['ulhu/ritualbar/index.html', 'ulhu/dicewater/index.html', 'ulhu/grimoire/opened.html', 'ulhu/companion/day-tags.html', 'ulhu/companion/adventure.html', 'ulhu/companion/term-page.html', 'ulhu/companion/focus-crafts.html', 'ulhu/companion/sounds.html'].forEach((f) => ok(`the index links to ${f}`, idx.includes(`href="${f}"`)));
ok('no real class list or pupil name is bundled (the pages hold made-up rosters only)', !/Testperson|tomczynski/i.test(idx + ef));

console.log(failed ? `\n${failed} FAILED` : '\nAll mock-up site checks passed');
process.exit(failed ? 1 : 0);
