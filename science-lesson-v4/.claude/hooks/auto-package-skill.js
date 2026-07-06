#!/usr/bin/env node
// Runs at session Stop. Re-packages science-lesson.skill if any source file is
// newer than the current .skill bundle, then prints a reminder to upload.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SKILL_FILE = path.join(ROOT, 'science-lesson.skill');
const SCRIPT = path.join(ROOT, 'package-skill.ps1');

// Watch every file that package-skill.ps1 puts in the bundle (fonts/PNG change rarely but cheaply).
const WATCHED = [
  'science-lesson/SKILL.md',
  'science-lesson/references/build.js',
  'science-lesson/references/graph_gen.py',
  'science-lesson/references/textbook-index.js',
  'science-lesson/references/textbook-index.md',
  'science-lesson/references/slide-options-v4.md',
  'science-lesson/references/worksheet-spec.md',
  'science-lesson/references/engage-library.md',
  'science-lesson/references/backlog.md',
  'science-lesson/references/lesson-backlog-SKILL.md',
  'science-lesson/references/starfield_header_FINAL.png',
  'science-lesson/references/Caveat-Regular.ttf',
  'science-lesson/references/Caveat-Bold.ttf',
].map(f => path.join(ROOT, f));

function mtime(f) {
  try { return fs.statSync(f).mtimeMs; } catch { return 0; }
}

const skillMtime = mtime(SKILL_FILE);
const changed = WATCHED.filter(f => mtime(f) > skillMtime).map(f => path.relative(ROOT, f));

if (changed.length === 0) process.exit(0);

console.log(`\n[auto-package] Skill source changed:\n  ${changed.join('\n  ')}`);
console.log('[auto-package] Running package-skill.ps1 ...');

const result = spawnSync('powershell.exe', ['-NonInteractive', '-File', SCRIPT], {
  cwd: ROOT,
  encoding: 'utf8',
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('[auto-package] packaging FAILED — upload manually');
  process.exit(1);
}

console.log('[auto-package] science-lesson.skill rebuilt.');
console.log('[auto-package] ACTION NEEDED: replace the old science-lesson.skill file in claude.ai with this one');
