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

// Keep in sync with package-skill.ps1 (the canonical packer) — same ENTRIES list.
const ENTRIES = [
  'SKILL.md',
  'references/build.js',
  'references/graph_gen.py',
  'references/textbook-index.js',
  'references/textbook-index.md',
  'references/slide-options-v4.md',
  'references/worksheet-spec.md',
  'references/engage-library.md',
  'references/starfield_header_FINAL.png',
  'references/backlog.md',
  'references/lesson-backlog-SKILL.md',
  'references/Caveat-Regular.ttf',
  'references/Caveat-Bold.ttf',
];

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
