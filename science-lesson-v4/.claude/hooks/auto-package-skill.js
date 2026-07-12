#!/usr/bin/env node
// Runs at session Stop. Re-packages science-lesson.skill if any source file is
// newer than the current .skill bundle, then prints a reminder to upload.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SKILL_FILE = path.join(ROOT, 'science-lesson.skill');
const SCRIPT = path.join(ROOT, 'package-skill.ps1');

// Watch exactly the files the packer bundles. The list lives in skill-manifest.json
// (the ONE place it is written) — package-skill.ps1 and package-skill.js read the
// same file, so the three can no longer drift apart.
const WATCHED = require(path.join(ROOT, 'skill-manifest.json')).entries
  .map(f => path.join(ROOT, 'science-lesson', f));

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
