#!/usr/bin/env node
// Packages science-lesson.skill from source files in science-lesson/
// Run: node package-skill.js
// Output: science-lesson.skill in this directory

const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const SKILL_DIR = path.join(ROOT, 'science-lesson');
const OUT = path.join(ROOT, 'science-lesson.skill');

// The packed-file list lives in skill-manifest.json — the ONE place it is written.
// package-skill.ps1 and .claude/hooks/auto-package-skill.js read the same file, so
// the three can no longer drift apart (they used to hold three hand-synced copies).
const ENTRIES = require(path.join(ROOT, 'skill-manifest.json')).entries;

// Verify all source files exist before touching the output
const missing = ENTRIES.filter(e => !fs.existsSync(path.join(SKILL_DIR, e)));
if (missing.length) {
  console.error('Missing source files:');
  missing.forEach(f => console.error('  ' + f));
  process.exit(1);
}

const zip = new AdmZip();
for (const e of ENTRIES) {
  zip.addLocalFile(path.join(SKILL_DIR, e), path.dirname(e) === '.' ? '' : path.dirname(e));
}
zip.writeZip(OUT);

const date = new Date().toISOString().slice(0, 10);
const stat = fs.statSync(OUT);
console.log(`\nPacked science-lesson.skill — ${date}`);
ENTRIES.forEach(e => console.log('  ' + e));
console.log(`\nOutput: ${OUT} (${(stat.size / 1024).toFixed(1)} KB)`);
console.log('\nNext: replace the old science-lesson.skill file in claude.ai with this one');
