// node app/tests/run.js : the installed app's checks (lanes/design-installed-app.md section 10).
// Builds the app into a temporary folder and checks it. Then runs the browser checks (python, playwright).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const APP = path.join(__dirname, '..');
let failed = 0;
const check = (ok, name) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) failed++; };

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'appbuild-'));
const dist = path.join(out, 'dist');
execFileSync(process.execPath, [path.join(APP, 'build.js'), dist], { stdio: 'pipe' });
const walk = (d) => fs.readdirSync(d).flatMap((f) => fs.statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]);
const files = walk(dist), rel = files.map((f) => path.relative(dist, f).split(path.sep).join('/'));

check(rel.includes('index.html') && rel.includes('test/index.html'), 'the build has the home page and the school test page');
check(files.every((f) => !fs.readFileSync(f, 'utf8').includes('{{BUILD_STAMP}}')), 'every build stamp is filled in');
const t = fs.readFileSync(path.join(dist, 'test/index.html'), 'utf8');
check(/personal Google sign-in/.test(t) && /talk to your personal Apps Script/.test(t) && /Direct updates to the school script/.test(t), 'the test page has its three checks');
check(!/localStorage\.setItem\('testMailboxKey'|LS\.set\('testMailboxKey'/.test(t), 'the test page never remembers the key');

// the build folder guard: it will not empty a folder it did not make
const other = fs.mkdtempSync(path.join(os.tmpdir(), 'notapp-')); fs.writeFileSync(path.join(other, 'keep.txt'), 'x');
let refused = false; try { execFileSync(process.execPath, [path.join(APP, 'build.js'), other], { stdio: 'pipe' }); } catch (e) { refused = true; }
check(refused && fs.existsSync(path.join(other, 'keep.txt')), 'the build refuses to empty a folder it did not make');

// no pupil data in the app: only page and code files, and no name from a local list (if one is on this PC)
const SRC = walk(path.join(APP, 'src'));
const OK_TYPE = /\.(html|js|css|svg|png|webmanifest|txt|ico|mp3|ogg|wav)$|[\\/]_headers$|[\\/]\.app-build$/;
check(SRC.concat(files).every((f) => OK_TYPE.test(f)), 'the app holds only page, code, image and sound files (no data files)');
const namesFile = path.join(__dirname, '.names.txt');   // optional, gitignored: one name per line, never committed
if (fs.existsSync(namesFile)) {
  const names = fs.readFileSync(namesFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s.length > 3);
  const hits = SRC.concat(files).filter((f) => !/\.(png|ico|mp3|ogg|wav)$/.test(f)).filter((f) => { const s = fs.readFileSync(f, 'utf8'); return names.some((n) => s.includes(n)); });
  check(!hits.length, 'no name from the local list appears in the app' + (hits.length ? ': ' + hits.join(', ') : ''));
} else console.log('SKIP the names list (app/tests/.names.txt) is not on this PC');
fs.rmSync(out, { recursive: true, force: true }); fs.rmSync(other, { recursive: true, force: true });

// browser checks
const py = process.platform === 'win32' ? 'python' : 'python3';
for (const sim of ['test_page_sim.py']) {
  try { console.log(execFileSync(py, [path.join(__dirname, sim)], { encoding: 'utf8' }).trim()); }
  catch (e) { console.log(String(e.stdout || '') + String(e.stderr || '')); check(false, sim); }
}
console.log(failed ? `\n${failed} FAILED` : '\nAll app checks passed');
process.exit(failed ? 1 : 0);
