// node planner/tests/bundle.test.js: the paste-file guard (planner/bundle.js and strip-comments.js, 29 Oct 2026).
// Checks that stripping comments never changes what the code does, and that the bundle's size alarm,
// "changed since last paste" record and build stamp behave.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const S = require('../strip-comments.js');
let failed = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) failed++; };

console.log('── comment stripper keeps the code the same');
// [source, words that must be gone afterwards]
const cases = [
  ['const u = "https://x.y/z"; // trailing\nconst v = u.split("//")[1]; out = [u, v];', ['trailing']],
  ['const r = /https?:\\/\\/[^\\/]+/g; /* block */ const q = "a//b".replace(/\\/\\*/g, ""); out = ["x https://a.b/c".match(r), q];', ['block']],
  ['const t = `// not a comment ${1 + /* yes */ 2} <!-- keep -->`; out = t;', ['yes']],
  ['function f(a){ return a / 2 / 3; } // half\nconst g = x => x\n/* multi\nline */\n+ 1; out = [f(12), g(1)];', ['half', 'multi']],
  ['const k = `${ {a:1}.a }` + `${ `nested ${2}` }`; out = k;', []],
  ['const o = {a: 8}; // c\n  // alone\n\n  /* alone too */\nconst p = o.a /2; // end\nout = p;', ['alone', 'end']],
  ['const re = /[/]+/.test("a/b") ? 1 : 0; const re2 = "x]".match(/[^\\]]/)[0]; out = [re, re2]; // tail', ['tail']],
  ["const s = \"it\\\\'s\"; // q\nconst t2 = 'say \"hi\" // ok'; out = s + t2;", ['// q']],
  ['const n = 10; const m = n /2/ 5; out = m; // div', ['div']],
  ['const w = typeof /x/; const y = (1) / 2; out = [w, y]; /* z */', ['z */']],
  ['const KEY = <?!= JSON.stringify(key) ?>;   // scriptlet line\nout = KEY;', ['scriptlet']],
];
for (const [src, gone] of cases) {
  const out = S.stripJs(src);
  const run = (c) => { try { const ctx = { out: null, key: 'k' }; vm.runInNewContext(c.replace(/<\?!?=?[\s\S]*?\?>/g, '"k"'), ctx); return JSON.stringify(ctx.out); } catch (e) { return 'ERR ' + e.message; } };
  const a = run(src), b = run(out);
  const left = gone.filter((g) => out.includes(g));
  ok(a === b && !left.length && !/ERR/.test(a), `${src.split('\n')[0].slice(0, 50)}  ->  ${a === b ? 'same result' : a + ' vs ' + b}${left.length ? ', still has ' + left.join(',') : ''}`);
}
const html = '<!-- top -->\n<style>/* css stays */ a{}</style>\n<script>\nconst a = 1; // gone\n</script>\n<script type="application/json">{"//": "kept"}</script>\n<body data-key="<?= key ?>"><?!= include(\'Logic\') ?></body>';
const h = S.stripHtml(html, 't', []);
ok(!h.includes('top') && !h.includes('gone') && h.includes('css stays') && h.includes('"//": "kept"') && h.includes("<?!= include('Logic') ?>") && h.includes('<?= key ?>'),
  'HTML: comments and script comments go, CSS, JSON blocks and Apps Script scriptlets stay');
const broken = 'const a = "unterminated; // x\nconst b = 2;';
const w = [];
const kept = S.stripFile('x.gs', broken);
ok(kept.text === broken || !kept.warnings.length, 'code that does not parse is left as it was');
// the real sources: every .gs and every script block must still parse after stripping
for (const f of ['Code.gs', 'Behaviour.gs', 'Game.gs', 'Companion.gs', 'Mailbox.gs', 'logic.js', 'game-ui.js', 'game-den.js', 'game-oracle.js', 'game-companion.js', 'companion-term.js', 'companion-focus.js', 'Planner.html', 'Phone.html', 'BoardPage.html', 'Day.gs', 'day-logic.js', 'day-screen.js', 'day-report.js']) {
  const p = path.join(__dirname, '..', f);
  if (!fs.existsSync(p)) continue;
  const r = S.stripFile(f, fs.readFileSync(p, 'utf8'));
  ok(!r.warnings.length && r.saved > 0, `${f}: strips cleanly (${(r.saved / 1024).toFixed(1)} KB smaller)`);
}

// the strongest check: the whole server test suite run against the comment-stripped copies must pass exactly as it does on the sources
console.log('── the server tests pass on the stripped copies');
const tmpSrc = fs.mkdtempSync(path.join(require('os').tmpdir(), 'stripped-'));
try {
  for (const f of ['Code.gs', 'Behaviour.gs', 'Game.gs', 'Companion.gs', 'game-companion.js', 'companion-term.js', 'companion-focus.js', 'game-art.js']) fs.writeFileSync(path.join(tmpSrc, f), S.stripFile(f, fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).text);
  for (const t of ['server.test.js', 'game.test.js', 'companion.test.js']) {
    const r = cp.spawnSync(process.execPath, [path.join(__dirname, t)], { encoding: 'utf8', env: Object.assign({}, process.env, { PLANNER_SRC: tmpSrc }) });
    ok(r.status === 0, `${t} on the stripped Code.gs, Behaviour.gs and Game.gs` + (r.status ? '\n' + (r.stdout + r.stderr).split('\n').filter((l) => /FAIL|Error/.test(l)).slice(0, 5).join('\n') : ''));
  }
} finally { fs.rmSync(tmpSrc, { recursive: true, force: true }); }

console.log('── bundle: size alarm, change record, build stamp');
const dist = path.join(__dirname, '..', 'dist');
const rec = path.join(dist, '.last-paste.json');
const had = fs.existsSync(rec) ? fs.readFileSync(rec, 'utf8') : null;
try {
  if (had !== null) fs.unlinkSync(rec);
  const run = (args) => cp.spawnSync(process.execPath, [path.join(__dirname, '..', 'bundle.js'), ...args], { encoding: 'utf8', env: Object.assign({}, process.env, { PASTE_DIR: path.join(require('os').tmpdir(), 'paste-test-' + process.pid) }) });
  const r1 = run([]);
  ok(r1.status === 0 && /ready/.test(r1.stdout), 'bundle runs');
  ok(/never pasted|changed since last paste/.test(r1.stdout), 'with no record yet, every file counts as changed since last paste');
  const planner = fs.readFileSync(path.join(dist, 'Planner.html'), 'utf8'), phone = fs.readFileSync(path.join(dist, 'Phone.html'), 'utf8');
  ok(!/\{\{BUILD_STAMP\}\}/.test(planner + phone) && /class="build-stamp"[^>]*>\d{1,2} \w{3} \d{2}:\d{2}</.test(planner) && /class="build-stamp"[^>]*>\d{1,2} \w{3} \d{2}:\d{2}</.test(phone),
    'Planner and Phone carry the build date and time in a corner');
  ok(/<\?!= include\('DayUI'\) \?>/.test(phone) && !/DAY_UI/.test(phone) && /DayScreen/.test(fs.readFileSync(path.join(dist, 'DayUI.html'), 'utf8')) && fs.existsSync(path.join(dist, 'Day.gs')),
    'the phone pulls in the day screen (DayUI.html), and Day.gs is in the set');
  const sizes = fs.readdirSync(dist).filter((f) => /\.(gs|html)$/.test(f)).map((f) => [f, fs.statSync(path.join(dist, f)).size]);
  ok(sizes.every(([, n]) => n < 340 * 1024), 'every paste file is under 340 KB: ' + sizes.map(([f, n]) => `${f} ${(n / 1024).toFixed(0)}`).join(', '));
  ok(!/\/\/ the behaviour app is part of the planner/.test(fs.readFileSync(path.join(dist, 'Code.gs'), 'utf8')) && !/<!--/.test(planner.replace(/<script[\s\S]*?<\/script>/g, '')), 'pasted copies have no comments');
  const r2 = run(['--pasted', '--label', 'test']);
  ok(r2.status === 0 && fs.existsSync(rec) && Object.keys(JSON.parse(fs.readFileSync(rec, 'utf8')).files).length >= 10, '--pasted records the hashes of what was handed over');
  const r3 = run([]);
  ok(r3.status === 0 && /nothing changed since the last paste/.test(r3.stdout) && !/changed since last paste:/.test(r3.stdout), 'a rebuild with nothing new says nothing changed since the last paste');
  const pasteDir = path.join(require('os').tmpdir(), 'paste-test-' + process.pid);
  const handed = fs.existsSync(pasteDir) ? fs.readdirSync(pasteDir).filter((f) => f !== 'sync-log.txt') : [];
  const nFiles = fs.readdirSync(dist).filter((f) => /\.(gs|html)$/.test(f) && f !== 'Mailbox.gs').length;
  ok(handed.length === nFiles && handed.every((f) => /^PASTE INTO APPS SCRIPT - .+ \(\d{4}-\d{2}-\d{2}, complete set, test\)\.txt$/.test(f)), `--pasted hands over one COMPLETE set with the agreed names (${handed.length} files)`);
  const slog = fs.existsSync(path.join(pasteDir, 'sync-log.txt')) ? fs.readFileSync(path.join(pasteDir, 'sync-log.txt'), 'utf8') : '';
  ok(/COPY planner\/dist .*complete set, test/.test(slog), 'the folder\'s sync-log.txt records the copy');
  const r4 = run(['--pasted', '--label', 'test2']);
  const slog2 = fs.readFileSync(path.join(pasteDir, 'sync-log.txt'), 'utf8');
  ok(r4.status === 0 && fs.readdirSync(pasteDir).filter((f) => /complete set, test2\)/.test(f)).length === nFiles && /replaces the set ".*complete set, test"/.test(slog2), 'the next set is complete again and says which set it replaces');
  fs.rmSync(pasteDir, { recursive: true, force: true });
} finally {
  if (had !== null) fs.writeFileSync(rec, had); else if (fs.existsSync(rec)) fs.unlinkSync(rec);
}

console.log(failed ? `\n${failed} FAILED` : '\nbundle guard: all checks pass');
process.exit(failed ? 1 : 0);
