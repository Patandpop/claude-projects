#!/usr/bin/env node
// image-extract.js — extract images from PPTX/DOCX; optionally patch content JSON
// Usage: node references/image-extract.js source.pptx [content.json] [--out assets/lesson-name]
'use strict';

const fs     = require('fs');
const path   = require('path');
const AdmZip = require('adm-zip');

const args       = process.argv.slice(2);
const outIdx     = args.indexOf('--out');
const outArg     = outIdx >= 0 ? args[outIdx + 1] : null;
const positional = args.filter((a, i) => !a.startsWith('--') && i !== outIdx + 1);
const srcPath    = positional[0];
const jsonPath   = positional[1] || null;

if (!srcPath) {
  console.error('Usage: node references/image-extract.js source.pptx [content.json] [--out assets/lesson-name]');
  process.exit(1);
}
if (!fs.existsSync(srcPath)) { console.error(`ERROR: file not found: ${srcPath}`); process.exit(1); }
if (jsonPath && !fs.existsSync(jsonPath)) { console.error(`ERROR: file not found: ${jsonPath}`); process.exit(1); }

const ext      = path.extname(srcPath).toLowerCase();
const base     = path.basename(srcPath, ext);
const mediaDir = ext === '.docx' ? 'word/media/' : 'ppt/media/';
const outDir   = outArg || path.join('assets', base);

fs.mkdirSync(outDir, { recursive: true });

let zip;
try { zip = new AdmZip(srcPath); }
catch (e) { console.error(`ERROR: cannot open archive: ${e.message}`); process.exit(1); }

const mediaEntries = zip.getEntries()
  .filter(e => e.entryName.startsWith(mediaDir) && !e.isDirectory);

if (mediaEntries.length === 0) {
  console.log(`No images found in ${mediaDir} — nothing written.`);
  process.exit(0);
}

// ── Extract ──────────────────────────────────────────────────────────────────

console.log(`Source : ${srcPath}`);
console.log(`Media  : ${mediaDir} (${mediaEntries.length} files)`);
console.log(`Output : ${outDir}`);
console.log('');
console.log('idx  original                       output                         size');
console.log('───  ─────────────────────────────  ─────────────────────────────  ──────');

const extracted = [];
mediaEntries.forEach((entry, i) => {
  const n       = String(i + 1).padStart(2, '0');
  const origExt = path.extname(entry.name).toLowerCase() || '.bin';
  const outName = `img-${n}${origExt}`;
  const outPath = path.join(outDir, outName);
  const data    = entry.getData();
  fs.writeFileSync(outPath, data);
  extracted.push({ outPath, origName: entry.name, size: data.length });
  console.log(`${n.padEnd(4)} ${entry.name.padEnd(30)} ${outPath.padEnd(30)}  ${fmtSize(data.length)}`);
});

console.log('');

// ── Patch content JSON if provided ───────────────────────────────────────────

if (jsonPath) {
  const L     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const slots = findSlots(L);

  console.log(`JSON   : ${jsonPath}`);
  console.log(`Slots  : ${slots.length} image slot(s) found`);
  console.log('');
  console.log('assignment:');

  const dumpImages = [];

  extracted.forEach((img, i) => {
    const slot  = slots[i];
    const label = slot ? slot.label : 'unassigned';
    dumpImages.push({ path: img.outPath, label });
    if (slot) {
      slot.obj.embeddedImagePath = img.outPath;
      slot.obj.imageConfidence   = 'search';
      console.log(`  img-${String(i + 1).padStart(2, '0')} → ${label}`);
    } else {
      console.log(`  img-${String(i + 1).padStart(2, '0')} → unassigned (no slot)`);
    }
  });

  // slots with no image — leave as placeholder, note it
  slots.slice(extracted.length).forEach(slot => {
    console.log(`  [no image] → ${slot.label} left as placeholder`);
  });

  L.image_dump = { images: dumpImages };
  fs.writeFileSync(jsonPath, JSON.stringify(L, null, 2), 'utf8');
  console.log('');
  console.log(`Written: ${jsonPath} (embeddedImagePath patched, image_dump appended)`);
} else {
  console.log('Tip: pass a content JSON as second arg to auto-patch embeddedImagePath fields.');
}

console.log('');
console.log(`Done. ${extracted.length} image(s) extracted.`);

// ── Slot finder ───────────────────────────────────────────────────────────────
// Walks known image-bearing sections; checks imagePlaceholder === true explicitly
// so mcq/sort/etc build items (no imagePlaceholder key) are skipped.

function findSlots(L) {
  const slots = [];
  const wants = obj => obj && typeof obj === 'object' && obj.imagePlaceholder === true;

  if (wants(L.engage)) slots.push({ obj: L.engage, label: 'Engage' });

  const learns = Array.isArray(L.learn) ? L.learn : (L.learn ? [L.learn] : []);
  ['Learn A', 'Learn B', 'Learn C'].forEach((label, i) => {
    if (wants(learns[i])) slots.push({ obj: learns[i], label });
  });

  const buildItems = Array.isArray(L.build) ? L.build : [];
  buildItems.forEach(b => {
    if (wants(b)) slots.push({ obj: b, label: `Build: ${b.type || b.variant || 'item'}` });
  });

  return slots;
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
