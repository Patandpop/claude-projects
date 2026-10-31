#!/usr/bin/env node
// build-report.js: turns a report JSON (see references/report-schema.md) into a marked-up
// Word document: the transcript as body text with highlighted passages and margin comments,
// a table of the same notes (for phones that hide comments), side-by-side revisions, author
// lenses and a "next time, try" list. Runs on the docx library that the claude.ai sandbox and
// the home PC both have; no network, no paid API.
//
//   node build-report.js report.json [out-dir]
//
// Output lands in out-dir, else /mnt/user-data/outputs when that exists, else the current folder.

'use strict';
const fs = require('fs');
const path = require('path');
// The docx library: installed in the claude.ai sandbox and in the home project. If neither resolves,
// `npm install docx` in the working folder fixes it (free, no key).
function loadDocx() {
  try { return require('docx'); } catch (e) {
    for (const p of [path.join(process.cwd(), 'node_modules', 'docx'), path.join(__dirname, '..', '..', 'node_modules', 'docx')]) {
      try { return require(p); } catch (e2) { /* try the next */ }
    }
    console.error('The docx library was not found. Run: npm install docx   (then run this script again)');
    process.exit(1);
  }
}
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  CommentRangeStart, CommentRangeEnd, CommentReference,
} = loadDocx();

// ---------- input ----------
const inPath = process.argv[2];
if (!inPath) { console.error('Usage: node build-report.js report.json [out-dir]'); process.exit(1); }
const report = JSON.parse(fs.readFileSync(inPath, 'utf8'));

const warnings = [];
const warn = (m) => { warnings.push(m); console.error('warning: ' + m); };

// Analysis text must not carry em dashes (Patryk's rule). The transcript is his and is never touched.
function clean(s) {
  if (s == null) return '';
  s = String(s);
  if (s.includes('\u2014')) { warn('em dash replaced in: "' + s.slice(0, 40) + '..."'); s = s.replace(/\s*\u2014\s*/g, ', '); }
  return s;
}

const form = (report.form || 'poem').toLowerCase();
const transcript = String(report.transcript || '');
const title = String(report.title || firstLine(transcript) || 'Untitled piece');
const date = report.date || new Date().toISOString().slice(0, 10);
const highlights = Array.isArray(report.highlights) ? report.highlights : [];
const revisions = Array.isArray(report.revisions) ? report.revisions : [];
const lenses = Array.isArray(report.lenses) ? report.lenses : [];
const nextTime = Array.isArray(report.nextTime) ? report.nextTime : [];
const slips = Array.isArray(report.slips) ? report.slips : [];

function firstLine(t) { const l = t.split('\n').map((x) => x.trim()).find(Boolean); return l ? '"' + l + '"' : ''; }

// ---------- output path ----------
let outDir = process.argv[3];
if (!outDir) outDir = fs.existsSync('/mnt/user-data/outputs') ? '/mnt/user-data/outputs' : process.cwd();
fs.mkdirSync(outDir, { recursive: true });
const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Untitled';
const outPath = path.join(outDir, 'Writing report - ' + safeTitle + ' - ' + date + '.docx');

// ---------- text helpers ----------
const FONT = 'Georgia';
const SIZE = 22; // half-points: 11 pt
const norm = (s) => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');
// One run per line: a "\n" inside a revision or example keeps its line break instead of collapsing into a
// space. Multi-line text therefore comes back as an array of runs; para() and markedRuns() flatten it.
const run = (text, opts = {}) => {
  const parts = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
  if (parts.length === 1) return new TextRun(Object.assign({ text: parts[0], font: FONT, size: SIZE }, opts));
  return parts.map((p, i) => new TextRun(Object.assign({ text: p, font: FONT, size: SIZE, break: i === 0 ? 0 : 1 }, opts)));
};
const para = (children, opts = {}) => new Paragraph(Object.assign({ children: (Array.isArray(children) ? children : [run(children)]).flat(), spacing: { after: 120 } }, opts));
const heading = (text, level) => new Paragraph({ heading: level, children: [new TextRun({ text, font: FONT })], spacing: { before: 280, after: 120 } });
const label = (text) => run(text, { bold: true, color: '555555', size: 18 });

// Doubt marks [?word] in the transcript are drawn in red so they catch the eye.
function markedRuns(text, base) {
  const out = [];
  const re = /\[\?[^\]]*\]/g;
  let i = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > i) out.push(run(text.slice(i, m.index), base));
    out.push(run(m[0], Object.assign({}, base, { color: 'C00000', bold: true })));
    i = m.index + m[0].length;
  }
  if (i < text.length) out.push(run(text.slice(i), base));
  return out.flat();
}

// ---------- transcript blocks ----------
// Poem and mixed: every line stands alone. Essay: single breaks join into paragraphs; blank lines split.
function blocks() {
  const lines = transcript.replace(/\r\n?/g, '\n').split('\n');
  if (form === 'essay') {
    const paras = [];
    let cur = [];
    for (const l of lines) {
      if (l.trim() === '') { if (cur.length) { paras.push({ text: cur.join(' '), kind: 'para' }); cur = []; } }
      else cur.push(l.trim());
    }
    if (cur.length) paras.push({ text: cur.join(' '), kind: 'para' });
    return paras;
  }
  return lines.map((l) => (l.trim() === '' ? { text: '', kind: 'gap' } : { text: l, kind: 'line' }));
}

// ---------- highlights into the transcript ----------
const comments = [];
let commentId = 0;
const pinned = new Set();

function findIn(text, quote) {
  const t = norm(text), q = norm(quote).trim();
  if (!q) return -1;
  let i = t.indexOf(q);
  if (i < 0) i = t.toLowerCase().indexOf(q.toLowerCase());
  return i;
}

function areaLabel(h) { return (h.area ? clean(h.area) : 'note').replace(/^\w/, (c) => c.toUpperCase()); }
function kindWord(h) { return h.kind === 'works' ? 'Working' : 'Look again'; }

function blockParagraph(b) {
  const base = form === 'essay' ? {} : {};
  const opts = form === 'essay' ? { spacing: { after: 160, line: 320 } } : { spacing: { after: 0, line: 300 } };
  if (b.kind === 'gap') return new Paragraph({ children: [run('')], spacing: { after: 0 } });
  const text = norm(b.text);
  // collect matches
  const hits = [];
  highlights.forEach((h, idx) => {
    if (pinned.has(idx)) return;
    const i = findIn(text, h.quote);
    if (i >= 0) hits.push({ s: i, e: i + norm(h.quote).trim().length, h, idx });
  });
  hits.sort((a, b2) => a.s - b2.s || (b2.e - b2.s) - (a.e - a.s));
  const kept = [];
  let last = 0;
  for (const x of hits) { if (x.s >= last) { kept.push(x); last = x.e; } }
  const children = [];
  let pos = 0;
  for (const x of kept) {
    pinned.add(x.idx);
    if (x.s > pos) children.push(...markedRuns(text.slice(pos, x.s), base));
    const id = commentId++;
    const colour = x.h.kind === 'works' ? 'green' : 'yellow';
    comments.push({
      id, author: 'Writing analyser', date: new Date(),
      children: [new Paragraph({ children: [run(kindWord(x.h) + ' (' + areaLabel(x.h) + '). ' + clean(x.h.note), { size: 20 })] })],
    });
    children.push(new CommentRangeStart(id));
    children.push(...markedRuns(text.slice(x.s, x.e), Object.assign({}, base, { highlight: colour })));
    children.push(new CommentRangeEnd(id));
    children.push(new TextRun({ children: [new CommentReference(id)] }));
    pos = x.e;
  }
  if (pos < text.length) children.push(...markedRuns(text.slice(pos), base));
  if (!children.length) children.push(run(''));
  return new Paragraph(Object.assign({ children }, opts));
}

const transcriptParas = blocks().map(blockParagraph);
const unpinned = highlights.filter((h, idx) => !pinned.has(idx));
unpinned.forEach((h) => warn('quote not found in the transcript: "' + String(h.quote).slice(0, 50) + '"'));

// ---------- tables ----------
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
function cell(children, widthPct, shade) {
  return new TableCell({
    children: Array.isArray(children) ? children : [para(children, { spacing: { after: 40 } })],
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    shading: shade ? { type: ShadingType.CLEAR, fill: shade, color: 'auto' } : undefined,
  });
}
function headerRow(labels, widths) {
  return new TableRow({ tableHeader: true, children: labels.map((l, i) => cell([para([run(l, { bold: true, size: 20 })], { spacing: { after: 0 } })], widths[i], 'EEEEEE')) });
}
function table(rows) { return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }); }

function stoodOutTable() {
  const widths = [38, 16, 46];
  const rows = [headerRow(['Passage', 'Area', 'Note'], widths)];
  highlights.forEach((h) => {
    const shade = h.kind === 'works' ? 'E6F4E6' : 'FFF6D5';
    rows.push(new TableRow({ children: [
      cell([para([run('"' + String(h.quote) + '"', { italics: true, size: 20 })], { spacing: { after: 0 } })], widths[0], shade),
      cell([para([run(kindWord(h), { bold: true, size: 18 })], { spacing: { after: 20 } }), para([run(areaLabel(h), { size: 18, color: '555555' })], { spacing: { after: 0 } })], widths[1], shade),
      cell([para([run(clean(h.note), { size: 20 })], { spacing: { after: 0 } })], widths[2]),
    ] }));
  });
  return table(rows);
}

function revisionsTable() {
  const widths = [34, 34, 32];
  const rows = [headerRow(['His original', 'A revision', 'Why'], widths)];
  revisions.forEach((r) => rows.push(new TableRow({ children: [
    cell([para([run(String(r.original || ''), { italics: true, size: 20 })], { spacing: { after: 0 } })], widths[0], 'F7F7F7'),
    cell([para([run(clean(r.revised), { size: 20 })], { spacing: { after: 0 } })], widths[1]),
    cell([para([run(clean(r.why), { size: 20, color: '333333' })], { spacing: { after: 0 } })], widths[2]),
  ] })));
  return table(rows);
}

// ---------- assemble ----------
const body = [];
body.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title, font: FONT })], spacing: { after: 60 } }));
body.push(para([run((form === 'essay' ? 'Essay' : form === 'mixed' ? 'Poem or prose' : 'Poem') + '  ·  ' + date + '  ·  writing analyser report', { color: '666666', size: 18 })], { spacing: { after: 240 } }));

if (report.overview) { body.push(heading('In short', HeadingLevel.HEADING_1)); body.push(para([run(clean(report.overview))])); }

body.push(heading('Your piece, marked up', HeadingLevel.HEADING_1));
body.push(para([
  run('Green', { highlight: 'green', size: 18 }), run(' = working.   ', { size: 18 }),
  run('Yellow', { highlight: 'yellow', size: 18 }), run(' = look again.   ', { size: 18 }),
  run('[?word]', { color: 'C00000', bold: true, size: 18 }), run(' = could not read with certainty.  Tap a highlight to see its note; the same notes are in the table below.', { size: 18 }),
], { spacing: { after: 200 } }));
body.push(...transcriptParas);
body.push(para([run('')], { spacing: { after: 120 } }));

if (highlights.length) {
  body.push(heading('What stood out', HeadingLevel.HEADING_1));
  body.push(stoodOutTable());
  if (unpinned.length) {
    body.push(para([label('Not pinned to a line (quote did not match the transcript exactly):')], { spacing: { before: 160, after: 60 } }));
    unpinned.forEach((h) => body.push(para([run('"' + String(h.quote) + '": ', { italics: true }), run(clean(h.note))], { bullet: { level: 0 } })));
  }
}

if (slips.length) {
  body.push(heading('Possible slips', HeadingLevel.HEADING_2));
  body.push(para([run('Probably accidental, left as written in the transcript. Yours to decide.', { color: '555555', size: 20 })]));
  slips.forEach((s) => body.push(para([run(clean(s))], { bullet: { level: 0 } })));
}

if (revisions.length) {
  body.push(heading('Revisions, side by side', HeadingLevel.HEADING_1));
  body.push(para([run('Small changes that show a move. The meaning and the voice stay yours.', { color: '555555', size: 20 })]));
  body.push(revisionsTable());
}

if (lenses.length) {
  body.push(heading('Through other eyes', HeadingLevel.HEADING_1));
  body.push(para([run('What each author does with craft, and how this piece could lean that way in your own words. Lenses, not costumes.', { color: '555555', size: 20 })]));
  lenses.forEach((L) => {
    body.push(heading(clean(L.author || 'An author'), HeadingLevel.HEADING_2));
    if (L.craft) body.push(para([label('The craft.  '), run(clean(L.craft))]));
    if (L.cost) body.push(para([label('Where it fails.  '), run(clean(L.cost))]));
    if (L.toward) body.push(para([label('Toward it, here.  '), run(clean(L.toward))]));
    if (L.example && (L.example.original || L.example.revised)) {
      const widths = [34, 34, 32];
      body.push(table([
        headerRow(['His original', 'Leaning toward ' + clean(L.author || 'the lens'), 'What changed'], widths),
        new TableRow({ children: [
          cell([para([run(String(L.example.original || ''), { italics: true, size: 20 })], { spacing: { after: 0 } })], widths[0], 'F7F7F7'),
          cell([para([run(clean(L.example.revised), { size: 20 })], { spacing: { after: 0 } })], widths[1]),
          cell([para([run(clean(L.example.why), { size: 20, color: '333333' })], { spacing: { after: 0 } })], widths[2]),
        ] }),
      ]));
      body.push(para([run('')], { spacing: { after: 80 } }));
    }
  });
}

if (nextTime.length) {
  body.push(heading('Next time, try', HeadingLevel.HEADING_1));
  nextTime.forEach((t) => body.push(para([run(clean(t))], { numbering: { reference: 'next', level: 0 } })));
}

body.push(para([run('These are offers. Keep what sounds like you.', { italics: true, color: '555555' })], { spacing: { before: 360 }, alignment: AlignmentType.CENTER }));

const doc = new Document({
  creator: 'writing analyser',
  title: title,
  styles: {
    default: { document: { run: { font: FONT, size: SIZE } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { size: 44, bold: true, font: FONT, color: '1A1A2E' }, paragraph: { spacing: { after: 60 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, font: FONT, color: '1A1A2E' }, paragraph: { spacing: { before: 320, after: 120 } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, font: FONT, color: '2E4057' }, paragraph: { spacing: { before: 240, after: 100 } } },
    ],
  },
  numbering: { config: [{ reference: 'next', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }] },
  comments: { children: comments },
  sections: [{
    properties: { page: { margin: { top: 1134, bottom: 1134, left: 1304, right: 1304 } } },
    children: body.filter(Boolean),
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log(outPath);
  console.log(highlights.length + ' passages (' + pinned.size + ' pinned to lines, ' + unpinned.length + ' not), ' + revisions.length + ' revisions, ' + lenses.length + ' lenses, ' + warnings.length + ' warnings');
}).catch((e) => { console.error(e); process.exit(1); });
