#!/usr/bin/env node
'use strict';
/* image-library.js — "school slides first" for pictures (Lesson quality Part B, 2026-10-23). HOME ONLY.

   node science-lesson/references/image-library.js "Year 7/Biology/B1 Cells/Lesson 3 - Animal Cells and Plant Cells"

   Reads (never writes) the school's decks in that Drive lesson folder, including the "Beechen Cliff
   Original Lesson" subfolder, and copies every real picture (not icons, not repeats) into
   image-library/<same path>/ in this project, with:
     index.json   one entry per picture: file, pixel size, bytes, deck, slide numbers
     sheet.png    a numbered contact sheet, so Claude picks pictures with ONE look
   image-library/ is gitignored: it holds school files. Nothing is written to Drive. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const AdmZip = require('adm-zip');

const DRIVE = 'G:/My Drive/Beechen Cliff Science/Lessons';
const ROOT = path.join(__dirname, '..', '..');
const MIN_BYTES = 4000;                       // smaller = icons, bullets, logos

function pixelSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) return null;
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

// every picture in one deck, with the slides it is on
function deckPictures(file) {
  const zip = new AdmZip(file);
  const onSlides = {};
  for (const e of zip.getEntries()) {
    const m = /^ppt\/slides\/_rels\/slide(\d+)\.xml\.rels$/.exec(e.entryName);
    if (!m) continue;
    for (const t of e.getData().toString('utf8').matchAll(/Target="\.\.\/media\/([^"]+)"/g)) (onSlides[t[1]] = onSlides[t[1]] || []).push(+m[1]);
  }
  return zip.getEntries().filter((e) => /^ppt\/media\/.+\.(png|jpe?g)$/i.test(e.entryName))
    .map((e) => ({ name: path.basename(e.entryName), data: e.getData(), slides: (onSlides[path.basename(e.entryName)] || []).sort((a, b) => a - b) }))
    .filter((p) => p.slides.length && p.data.length >= MIN_BYTES);
}

function build(rel) {
  const src = path.join(DRIVE, rel);
  if (!fs.existsSync(src)) throw new Error('no such lesson folder on Drive: ' + rel);
  const decks = [];
  for (const dir of [src, path.join(src, 'Beechen Cliff Original Lesson')]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (/\.pptx$/i.test(f) && !/^~\$/.test(f)) decks.push(path.join(dir, f));
  }
  const out = path.join(ROOT, 'image-library', rel);
  fs.mkdirSync(out, { recursive: true });
  const seen = new Set(), index = [];
  for (const d of decks) {
    let pics; try { pics = deckPictures(d); } catch (e) { console.log(`  (skipped ${path.basename(d)}: ${e.message})`); continue; }
    for (const p of pics) {
      const h = crypto.createHash('sha1').update(p.data).digest('hex');
      if (seen.has(h)) continue;
      seen.add(h);
      const n = index.length + 1, file = `${String(n).padStart(2, '0')}${path.extname(p.name).toLowerCase()}`;
      fs.writeFileSync(path.join(out, file), p.data);
      index.push({ n, file, path: path.join(out, file).split(path.sep).join('/'), ...(pixelSize(p.data) || {}), bytes: p.data.length, deck: path.basename(d), slides: p.slides });
    }
  }
  fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index, null, 1));
  if (index.length) contactSheet(out, index);
  console.log(`${index.length} pictures from ${decks.length} deck(s) -> ${out}${index.length ? '\n  look at sheet.png, then use the "path" from index.json' : ''}`);
  return { out, index };
}

// numbered thumbnails in a grid (Python + Pillow, as label_points.py)
function contactSheet(out, index) {
  const py = `
import json, sys
from PIL import Image, ImageDraw
out = sys.argv[1]; idx = json.load(open(out + '/index.json'))
T = 200; cols = 6; rows = (len(idx) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (T + 10) + 10, rows * (T + 34) + 10), 'white'); d = ImageDraw.Draw(sheet)
for k, p in enumerate(idx):
    try:
        im = Image.open(out + '/' + p['file']).convert('RGB'); im.thumbnail((T, T))
    except Exception:
        continue
    x = 10 + (k % cols) * (T + 10); y = 10 + (k // cols) * (T + 34)
    sheet.paste(im, (x + (T - im.width) // 2, y + (T - im.height) // 2))
    d.text((x, y + T + 4), str(p['n']) + '  ' + str(p.get('w', '?')) + 'x' + str(p.get('h', '?')) + '  slide ' + ','.join(map(str, p['slides'][:3])), fill=(13, 27, 94))
sheet.save(out + '/sheet.png')
`;
  try { execFileSync('python', ['-c', py, out], { stdio: 'pipe' }); }
  catch (e) { console.log('  (no contact sheet: ' + String(e.message).split('\n')[0] + ')'); }
}

module.exports = { build, deckPictures, pixelSize };
if (require.main === module) {
  const rel = process.argv[2];
  if (!rel) { console.error('usage: node image-library.js "Year 7/Biology/B1 Cells/Lesson 3 - Animal Cells and Plant Cells"'); process.exit(1); }
  try { build(rel.replace(/\\/g, '/').replace(/^.*?Lessons\//, '')); } catch (e) { console.error(e.message); process.exit(1); }
}
