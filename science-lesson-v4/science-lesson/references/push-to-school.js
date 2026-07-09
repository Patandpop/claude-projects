#!/usr/bin/env node
'use strict';
// push-to-school.js — send built lesson files to the school-Drive Apps Script uploader.
// Usage: node references/push-to-school.js <lesson.manifest.json> [--dry-run]
// Config: school-uploader.json in the project root: { "url": "https://script.google.com/...", "secret": "..." }
// Spec + deployment walkthrough: specs/next-year-system.md §3.
// Failure-tolerant: files are independent; one failure never blocks the rest.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../school-uploader.json');
const MIME = {
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg',
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const manifestArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!manifestArg) {
    console.error('Usage: node references/push-to-school.js <lesson.manifest.json> [--dry-run]');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestArg, 'utf8'));
  const srcDir = path.dirname(path.resolve(manifestArg));

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('school-uploader.json not found — deploy the Apps Script first (specs/next-year-system.md §3),');
    console.error('then create ' + CONFIG_PATH + ' with { "url": "...", "secret": "..." }');
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!cfg.url || !cfg.secret) { console.error('school-uploader.json needs both "url" and "secret"'); process.exit(1); }

  console.log('Target folder: ' + manifest.folder);
  let ok = 0, failed = 0;
  for (const name of manifest.files) {
    const fp = path.join(srcDir, name);
    if (!fs.existsSync(fp)) { console.warn('  ! missing locally, skipped: ' + name); failed++; continue; }
    if (dryRun) { console.log('  [dry-run] would upload ' + name + ' (' + fs.statSync(fp).size + ' bytes)'); ok++; continue; }
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: cfg.secret,
          folder: manifest.folder,
          filename: name,
          mimeType: MIME[path.extname(name).toLowerCase()] || 'application/octet-stream',
          contentBase64: fs.readFileSync(fp).toString('base64'),
        }),
      });
      const j = await res.json();
      if (j.ok) { console.log('  ✓ ' + name + (j.replaced ? ' (replaced existing)' : '')); ok++; }
      else { console.error('  ✗ ' + name + ' — ' + (j.error || 'unknown error')); failed++; }
    } catch (err) {
      console.error('  ✗ ' + name + ' — ' + err.message);
      failed++;
    }
  }
  console.log(`Done: ${ok} uploaded, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
}

main();
