#!/usr/bin/env node
'use strict';
/* ============================================================================
   exam-figures.js — pull the real images out of an Exampro .doc.

   WHY THIS EXISTS
   The exam papers are RTF-in-.doc. Every figure is stored inside the file as a
   {\pict ...} blob: a header saying what kind of image it is, then the image
   itself written out in hexadecimal. The library parser was throwing all of that
   away and leaving the text "[FIG]" behind — and 39% of question parts have a
   figure. For a printed homework booklet that is fatal: a third of the questions
   would be unusable.

   Checked on the sample paper: 122 image blobs, of which 77 are PNG and 45 are
   JPEG. Not a single Windows metafile. So every image can be recovered exactly as
   it is, byte for byte, with no conversion tools and no quality loss.

   WHAT IT DOES
   Finds each {\pict} blob, reads its type, decodes the hex back into the original
   bytes, and writes a real .png/.jpg file. Identical images (exam papers repeat
   the same logos and diagrams) are written once and shared, keyed by a hash of
   their contents.

   Pure + exported so the harness can test it. No network, no paid calls.
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// The RTF picture types we can decode directly. pngblip/jpegblip carry the
// original file bytes; everything else (Windows metafiles) would need converting,
// so we record it as unsupported rather than write a corrupt file.
const BLIP_TYPES = [
  { tag: '\\pngblip',  ext: 'png' },
  { tag: '\\jpegblip', ext: 'jpg' },
];

/* findPictBlobs(raw) -> [{ start, end, body }]
   Scans for balanced {\pict ...} regions. Braces inside a pict are balanced, and
   a backslash escapes the next character, so a stray brace inside the hex data
   cannot throw the scan off. Mirrors stripPictBlobs in exam-library.js. */
function findPictBlobs(raw) {
  const out = [];
  const marker = '{\\pict';
  let i = 0;
  while (true) {
    const idx = raw.indexOf(marker, i);
    if (idx === -1) break;
    let depth = 0, j = idx;
    for (; j < raw.length; j++) {
      const c = raw[j];
      if (c === '\\') { j++; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    if (depth !== 0) throw new Error('exam-figures: unbalanced {\\pict} blob at offset ' + idx);
    out.push({ start: idx, end: j, body: raw.slice(idx, j) });
    i = j;
  }
  return out;
}

/* decodeBlob(body) -> { ext, buf } | null
   The hex payload is everything after the last control word, up to the closing
   brace. Anything that is not a hex digit (newlines, spaces) is ignored. */
function decodeBlob(body) {
  const type = BLIP_TYPES.find((t) => body.includes(t.tag));
  if (!type) return null;                       // metafile or unknown — caller records it

  // Strip every RTF control word/symbol, leaving the hex data.
  const afterHeader = body.slice(body.indexOf(type.tag) + type.tag.length);
  const hex = afterHeader.replace(/\\[a-zA-Z]+-?\d*\s?/g, '')  // control words
    .replace(/[^0-9a-fA-F]/g, '');                             // braces, spaces, newlines
  if (hex.length < 32 || hex.length % 2 !== 0) return null;    // too short / truncated
  return { ext: type.ext, buf: Buffer.from(hex, 'hex') };
}

// Cheap sanity check: does this actually look like the image it claims to be?
// A corrupt figure that silently ships into a booklet is worse than a loud skip.
function looksValid(ext, buf) {
  if (ext === 'png') {
    return buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (ext === 'jpg') {
    return buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length - 2] === 0xff;
  }
  return false;
}

/* extractFigures(docPath, outDir, opts)
     -> { figures:[{ index, file, sha, ext, bytes }], unsupported, invalid, reused }

   Figures come out in document order. `index` is the Nth figure in the file, which
   is exactly the order the [FIG] markers appear in the parsed text — that is how a
   question part gets matched to its picture. */
function extractFigures(docPath, outDir, opts) {
  const o = opts || {};
  const raw = fs.readFileSync(docPath, 'latin1');
  const blobs = findPictBlobs(raw);

  if (outDir && !o.dryRun) fs.mkdirSync(outDir, { recursive: true });

  const figures = [];
  let unsupported = 0, invalid = 0, reused = 0;

  blobs.forEach((b, i) => {
    const dec = decodeBlob(b.body);
    if (!dec) { unsupported++; return; }
    if (!looksValid(dec.ext, dec.buf)) { invalid++; return; }

    const sha = crypto.createHash('sha1').update(dec.buf).digest('hex').slice(0, 16);
    const file = `${sha}.${dec.ext}`;
    const dest = outDir ? path.join(outDir, file) : null;

    if (dest && !o.dryRun) {
      if (fs.existsSync(dest)) reused++;                 // same image already written
      else fs.writeFileSync(dest, dec.buf);
    }
    figures.push({ index: i, file, sha, ext: dec.ext, bytes: dec.buf.length });
  });

  return { figures, unsupported, invalid, reused, total: blobs.length };
}

module.exports = { findPictBlobs, decodeBlob, looksValid, extractFigures, BLIP_TYPES };

if (require.main === module) {
  const [docPath, outDir] = process.argv.slice(2);
  if (!docPath) {
    console.error('usage: node references/exam-figures.js "<doc>" [outDir]');
    process.exit(1);
  }
  const r = extractFigures(docPath, outDir || null, { dryRun: !outDir });
  console.log(`\n${path.basename(docPath)}`);
  console.log(`  picture blobs : ${r.total}`);
  console.log(`  extracted     : ${r.figures.length}  (${r.reused} were duplicates of one already written)`);
  console.log(`  unsupported   : ${r.unsupported}  (metafile/unknown type)`);
  console.log(`  invalid       : ${r.invalid}  (decoded but not a real image — skipped, never shipped)`);
  if (outDir) console.log(`  written to    : ${outDir}`);
  else console.log('  (dry run — give an output folder to actually write the images)');
}
