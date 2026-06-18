#!/usr/bin/env node
// Packages science-lesson.skill from source files in science-lesson/
// Run: node package-skill.js
// Output: science-lesson.skill in this directory

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const SKILL_DIR = path.join(ROOT, 'science-lesson');
const OUT = path.join(ROOT, 'science-lesson.skill');

const ENTRIES = [
  'SKILL.md',
  'references/build.js',
  'references/slide-options-v4.md',
  'references/worksheet-spec.md',
  'references/engage-library.md',
  'references/starfield_header_FINAL.png',
];

// Verify all source files exist before touching the output
const missing = ENTRIES.filter(e => !fs.existsSync(path.join(SKILL_DIR, e)));
if (missing.length) {
  console.error('Missing source files:');
  missing.forEach(f => console.error('  ' + f));
  process.exit(1);
}

// Delete old .skill file so ZipFile::Open('Create') starts fresh
if (fs.existsSync(OUT)) fs.unlinkSync(OUT);

// Build a PowerShell one-liner that creates the ZIP with correct entry names
const outEsc = OUT.replace(/\\/g, '\\\\');
const skillDirEsc = SKILL_DIR.replace(/\\/g, '\\\\');

const entryLines = ENTRIES.map(e => {
  const src = path.join(SKILL_DIR, e).replace(/\\/g, '\\\\');
  const dest = e.replace(/\\/g, '/');
  return `[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, '${src}', '${dest}', [System.IO.Compression.CompressionLevel]::Optimal)`;
}).join('; ');

const ps = [
  `Add-Type -AssemblyName System.IO.Compression.FileSystem`,
  `$zip = [System.IO.Compression.ZipFile]::Open('${outEsc}', 'Create')`,
  entryLines,
  `$zip.Dispose()`,
].join('; ');

try {
  execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('Failed to create skill file:', err.message);
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const stat = fs.statSync(OUT);
console.log(`\nPacked science-lesson.skill — ${date}`);
ENTRIES.forEach(e => console.log('  ' + e));
console.log(`\nOutput: ${OUT} (${(stat.size / 1024).toFixed(1)} KB)`);
console.log('\nNext: upload science-lesson.skill to claude.ai → Projects → Science Lesson');
