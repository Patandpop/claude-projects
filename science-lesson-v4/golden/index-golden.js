#!/usr/bin/env node
/* Flattens golden/raw/<Deck>/SlideN.PNG into golden/<Letter>-<NN>.png and writes
   golden/INDEX.md, labelling each slide from the text actually inside its slide XML
   (the section header band, or the first substantial run when there is no header).
   Read-only with respect to the decks: it only reads the .pptx zip. */
'use strict';
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const ROOT = __dirname;
const RAW = path.join(ROOT, 'raw');
const DECKS = path.join(ROOT, 'build');

// deck base name -> single-letter prefix used in the flat filenames
const LETTER = {
  'Reference-A-Learn-Variants': 'A',
  'Reference-B-Build-Types': 'B',
  'Reference-C-Marking-Slides': 'C',
  'Reference-D-Annotation-Mode': 'D',
  'Reference-E-Whiteboard-Rounds': 'E',
};

const NAV = new Set(['DO NOW', 'ENGAGE', 'LEARN', 'BUILD', 'APPLY', 'REVIEW']);

/* Every <a:t> in document order, minus the six nav-bar tabs (which are always first). */
function slideTexts(xml) {
  return [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
    .map((m) => m[1]
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .trim())
    .filter(Boolean);
}

function label(texts) {
  const body = texts.filter((t) => !NAV.has(t));
  // A section header is the first run that is an all-caps banner.
  const header = body.find((t) => t.length > 3 && t === t.toUpperCase() && /[A-Z]/.test(t));
  const first = body.find((t) => t.length > 3);
  const raw = header || first || '(no text)';
  return raw.length > 78 ? raw.slice(0, 75) + '...' : raw;
}

const rows = [];
let moved = 0;

for (const deckFile of fs.readdirSync(DECKS).filter((f) => f.endsWith('.pptx')).sort()) {
  const base = path.basename(deckFile, '.pptx');
  const letter = LETTER[base];
  if (!letter) { console.error('no letter mapping for ' + base); continue; }

  const zip = new AdmZip(path.join(DECKS, deckFile));
  const slideXml = {};
  zip.getEntries().forEach((e) => {
    const m = /^ppt\/slides\/slide(\d+)\.xml$/.exec(e.entryName);
    if (m) slideXml[Number(m[1])] = e.getData().toString('utf8');
  });

  const src = path.join(RAW, base);
  const pngs = fs.readdirSync(src)
    .filter((f) => /^Slide\d+\.PNG$/i.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  rows.push({ deck: base, letter, count: pngs.length });

  pngs.forEach((f) => {
    const n = Number(f.match(/\d+/)[0]);
    const out = `${letter}-${String(n).padStart(2, '0')}.png`;
    fs.copyFileSync(path.join(src, f), path.join(ROOT, out));
    moved++;
    rows.push({ file: out, n, text: label(slideTexts(slideXml[n] || '')) });
  });
}

const lines = [
  '# Golden renders',
  '',
  'One PNG per slide, 1920x1080, exported from the reference decks in `build/` with',
  "PowerPoint's own Export API (see `export-golden.ps1` for why, and `render-constraints.md`",
  'section 12). Labels below are pulled from the text inside each slide, not hand-written.',
  '',
  'Rebuild with:',
  '',
  '```',
  'NO_UPLOAD=1 node science-lesson/references/build.js reference-lesson.json',
  'powershell -File golden/export-golden.ps1',
  'node golden/index-golden.js',
  '```',
  '',
];

for (const r of rows) {
  if (r.deck) {
    lines.push('', `## ${r.letter} — ${r.deck} (${r.count} slides)`, '', '| PNG | Slide | Label from the slide itself |', '|---|---|---|');
  } else {
    lines.push(`| \`${r.file}\` | ${r.n} | ${r.text.replace(/\|/g, '\\|')} |`);
  }
}
lines.push('', `**Total: ${moved} slides.**`, '');

fs.writeFileSync(path.join(ROOT, 'INDEX.md'), lines.join('\n'), 'utf8');
console.log(`flattened ${moved} PNGs into golden/ and wrote INDEX.md`);
