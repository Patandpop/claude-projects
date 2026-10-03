#!/usr/bin/env node
'use strict';
/* ============================================================================
   homework-booklet.js — make a per-topic homework booklet from REAL exam questions.

   This is a TOOL, not a pile of booklets. Run it whenever you want a booklet for
   a topic; it takes seconds. Nothing is pre-generated.

   It produces TWO files:
     1. <Topic> Homework.docx        — reads like a test paper. Real AQA questions,
                                       their real figures, answer lines sized by the
                                       marks. Ramped gently from easier to harder,
                                       the way a real paper is built.
     2. <Topic> Homework Answers.docx — the self-assessment sheet. The real mark
                                       scheme, word for word, plus what the examiner
                                       said students usually get wrong, plus how many
                                       students actually got it right. Students mark
                                       their own work with this.

   Nothing is invented. Every question, every mark scheme and every figure comes
   straight out of Patryk's own exam documents. If a mark scheme is missing, the
   question is left out rather than guessed at.

   Usage
     node references/homework-booklet.js --subject Physics --topic "Atomic Structure"
     node references/homework-booklet.js --subject Biology --topic Ecology --marks 40
     ... --subtopic "Nuclear Fission and Fusion"   restrict to one subtopic
     ... --marks 50                                 aim for ~50 marks (default 40)
     ... --in-books                                 no answer lines (answer in books)
     ... --out <folder>                             where to write (default: cwd)
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ImageRun, HeadingLevel,
} = require('docx');
const AdmZip = require('adm-zip');

const LIB = path.join(__dirname, '..', '..', 'exam-library');
const NAVY = '0D1B5E', GOLD = 'FABB2E', INK = '1A1A2E', GREY = '6B6B7B';

/* ---------------------------------------------------------------- image size

   We must know how big a figure is to place it without distortion. Rather than
   pull in an image library, read the dimensions straight out of the file header:
   PNG keeps them in the IHDR chunk, JPEG in the SOF marker. */
function imageSize(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {          // PNG
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {           // JPEG
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      // SOF0..SOF15, skipping the non-frame markers in that range
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

/* ------------------------------------------------------------------ selection

   Group the catalogue's PARTS back into whole QUESTIONS — a pupil must meet a
   question intact, with its stem and all its parts, exactly as it was sat.

   Order: gently ascending difficulty, like a real paper (recall first, extended
   response last). Difficulty is the examiner's own pass rate wherever it exists.
   NOTE: this ordering is for the PUPIL. The catalogue's marks-ascending order is
   a different thing — that one exists so questions are cheap to find. */
function selectQuestions(catalogue, docsDir, filter) {
  const f = filter || {};
  const want = (c) =>
    (!f.subject  || String(c.subject  || '').toLowerCase() === f.subject.toLowerCase()) &&
    (!f.topic    || String(c.topic    || '').toLowerCase() === f.topic.toLowerCase()) &&
    (!f.subtopic || String(c.subtopic || '').toLowerCase() === f.subtopic.toLowerCase());

  // Group parts by their source document + question number.
  const groups = new Map();
  for (const c of catalogue.parts) {
    if (!want(c)) continue;
    if (!c.hasScheme) continue;                       // no real mark scheme -> never used
    const key = `${c.doc}#${c.q}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  if (!groups.size) return [];

  // Load only the documents we actually need.
  const docCache = new Map();
  const loadDoc = (d) => {
    if (!docCache.has(d)) {
      docCache.set(d, JSON.parse(fs.readFileSync(path.join(docsDir, d + '.json'), 'utf8')));
    }
    return docCache.get(d);
  };

  const questions = [];
  for (const [key, rows] of groups) {
    const [docSlug, qs] = key.split('#');
    const qNum = parseInt(qs, 10);
    const doc = loadDoc(docSlug);
    const parts = doc.parts.filter((p) => p.question === qNum);
    if (!parts.length) continue;
    // Every part must carry a real scheme, or we do not use the question at all.
    if (parts.some((p) => !p.ms)) continue;

    const marks = parts.reduce((a, p) => a + (p.marks || 0), 0);
    if (!marks) continue;
    const withRate = parts.filter((p) => p.passRate != null);
    const diff = parts.reduce((a, p) => a + (p.difficulty || 0), 0) / parts.length;

    questions.push({
      doc: docSlug, q: qNum, parts, marks, difficulty: diff,
      realDifficulty: withRate.length > 0,
      subject: parts[0].subject, topic: parts[0].topic, subtopic: parts[0].subtopic,
    });
  }

  // Prefer questions whose difficulty we actually KNOW, then ramp easy -> hard.
  questions.sort((a, b) =>
    (b.realDifficulty - a.realDifficulty) || (a.difficulty - b.difficulty));

  // Take up to the mark budget, keeping the easy->hard ramp.
  const budget = f.marks || 40;
  const chosen = [];
  let total = 0;
  for (const q of questions) {
    if (total >= budget) break;
    if (total + q.marks > budget + 6) continue;       // do not overshoot badly
    chosen.push(q);
    total += q.marks;
  }
  chosen.sort((a, b) => a.difficulty - b.difficulty);
  return chosen;
}

/* ----------------------------------------------------------------- rendering */

const p = (text, o) => new Paragraph(Object.assign({
  children: [new TextRun(Object.assign({ text: String(text == null ? '' : text), font: 'Century Gothic', size: 22, color: INK }, (o && o.run) || {}))],
}, (o && o.para) || {}));

function heading(text, colour) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, font: 'Century Gothic', size: 26, color: colour || NAVY })],
  });
}

// The question number and its mark tariff, as an exam paper prints them.
function questionHeader(n, marks) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 85, type: WidthType.PERCENTAGE }, borders: noBorders(),
          children: [new Paragraph({ children: [new TextRun({ text: `${n}`, bold: true, font: 'Century Gothic', size: 28, color: NAVY })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE }, borders: noBorders(),
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `[${marks} ${marks === 1 ? 'mark' : 'marks'}]`, bold: true, font: 'Century Gothic', size: 20, color: GREY })],
          })],
        }),
      ],
    })],
  });
}

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
}

// Ruled answer lines, sized by the tariff — the way an exam paper gives you room.
// Roughly two lines per mark, which is what AQA allows; capped so a 6-marker does
// not run onto a page of its own.
function answerLines(marks, inBooks) {
  if (inBooks) return [];
  const n = Math.max(2, Math.min(10, Math.round((marks || 1) * 2)));
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(new Paragraph({
      spacing: { before: 0, after: 300 },          // room to actually write
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'B9B9CC' } },
      children: [new TextRun({ text: '', font: 'Century Gothic', size: 22 })],
    }));
  }
  return out;
}

// Place a figure, scaled to fit the page width without distortion.
function figureParagraphs(files, figsDir) {
  const out = [];
  const MAX_W = 560;                                    // points across an A4 text column
  for (const file of files || []) {
    const fp = path.join(figsDir, file);
    if (!fs.existsSync(fp)) continue;
    const buf = fs.readFileSync(fp);
    const dim = imageSize(buf);
    if (!dim || !dim.w) continue;
    const scale = Math.min(1, MAX_W / dim.w);
    out.push(new Paragraph({
      spacing: { before: 120, after: 120 },
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        data: buf,
        transformation: { width: Math.round(dim.w * scale), height: Math.round(dim.h * scale) },
        type: file.endsWith('.jpg') ? 'jpg' : 'png',
      })],
    }));
  }
  return out;
}

// Strip the [FIG:n] markers — the picture itself is placed separately.
const clean = (s) => String(s || '').replace(/\[FIG:\d+\]/g, ' ').replace(/\s{2,}/g, ' ').trim();

/* sharedStem(parts) -> the lead sentence(s) common to every part, or ''.

   The parser attaches a question's lead text to each of its (i)/(ii)/(iii) parts,
   which is right for a question BANK (each part must stand alone) but wrong for a
   printed paper: the pupil would read "Nuclear power stations use the energy
   released by nuclear fission..." at the top of every single sub-part. A real exam
   paper prints the stem once. So we find the common opening and hoist it out. */
function sharedStem(parts) {
  if (parts.length < 2) return '';
  const texts = parts.map((p) => clean(p.text));
  const first = texts[0].split(/(?<=[.?!])\s+/);
  let stem = '';
  for (let n = 1; n <= first.length; n++) {
    const candidate = first.slice(0, n).join(' ');
    if (candidate.length > 400) break;
    if (texts.every((t) => t.startsWith(candidate))) stem = candidate;
    else break;
  }
  // Only worth hoisting if it is a real sentence, not a stray word or two.
  return stem.length >= 40 ? stem : '';
}

const stripStem = (text, stem) =>
  (stem && clean(text).startsWith(stem) ? clean(text).slice(stem.length).trim() : clean(text));

/* Group a question's parts the way the paper laid them out: by their letter.
   "a.i" and "a.ii" belong to part (a) and share ITS lead sentence; (b) and (c)
   have their own. Hoisting a stem across the whole question therefore finds
   nothing — the shared text lives inside each letter group. */
function letterGroups(parts) {
  const groups = [];
  for (const p of parts) {
    const letter = String(p.part || '').split('.')[0];
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.parts.push(p);
    else groups.push({ letter, parts: [p] });
  }
  return groups.map((g) => ({ ...g, stem: sharedStem(g.parts) }));
}

function bookletChildren(qs, meta, figsDir, inBooks) {
  const ch = [];
  const totalMarks = qs.reduce((a, q) => a + q.marks, 0);

  ch.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: `${meta.subject} — ${meta.topic}`, bold: true, font: 'Century Gothic', size: 36, color: NAVY })],
  }));
  ch.push(new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: 'Exam question homework', font: 'Century Gothic', size: 24, color: GREY })],
  }));
  ch.push(new Paragraph({
    spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
    children: [new TextRun({ text: `${qs.length} questions · ${totalMarks} marks · answer in full sentences where asked`, font: 'Century Gothic', size: 20, color: GREY })],
  }));

  qs.forEach((q, i) => {
    ch.push(questionHeader(i + 1, q.marks));

    // The figure belongs to the whole question, so it goes above the stem.
    const stemFigs = q.parts[0] && q.parts[0].figureFiles;
    ch.push(...figureParagraphs(stemFigs, figsDir));

    // Print each letter group's shared lead ONCE, as a real paper does.
    letterGroups(q.parts).forEach((g) => {
      if (g.stem) {
        ch.push(new Paragraph({
          spacing: { before: 140, after: 60 },
          children: [new TextRun({ text: g.stem, font: 'Century Gothic', size: 22, color: INK })],
        }));
      }
      g.parts.forEach((part) => {
        const label = part.part ? `(${part.part}) ` : '';
        const body = stripStem(part.text, g.stem) || clean(part.text);
        ch.push(new Paragraph({
          spacing: { before: g.stem ? 60 : 140, after: 80 },
          children: [
            new TextRun({ text: label, bold: true, font: 'Century Gothic', size: 22, color: NAVY }),
            new TextRun({ text: body, font: 'Century Gothic', size: 22, color: INK }),
            new TextRun({ text: `   [${part.marks || 0}]`, bold: true, font: 'Century Gothic', size: 20, color: GREY }),
          ],
        }));
        ch.push(...answerLines(part.marks, inBooks));
      });
    });

    ch.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: '' })] }));
  });

  return ch;
}

/* The self-assessment sheet. This is the half that makes the homework worth
   setting: the real mark scheme, what the examiner says people get wrong, and
   how many actually got it — so a pupil marking their own work knows whether
   they are doing badly or attempting something genuinely hard. */
function answerChildren(qs, meta) {
  const ch = [];
  ch.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: `${meta.subject} — ${meta.topic}`, bold: true, font: 'Century Gothic', size: 36, color: NAVY })],
  }));
  ch.push(new Paragraph({
    spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
    children: [new TextRun({ text: 'MARK YOUR OWN WORK — real examiner mark scheme', bold: true, font: 'Century Gothic', size: 24, color: GOLD })],
  }));
  ch.push(p('Tick each point you made. Be honest: a mark you did not earn is a mark you will lose in the real exam.',
    { run: { italics: true, color: GREY, size: 20 } }));

  qs.forEach((q, i) => {
    ch.push(heading(`Question ${i + 1}  (${q.marks} marks)`));
    const stemOf = new Map();
    letterGroups(q.parts).forEach((g) => g.parts.forEach((p) => stemOf.set(p, g.stem)));
    q.parts.forEach((part) => {
      const ms = part.ms || {};
      const ex = ms.examiner || {};
      const label = part.part ? `(${part.part})` : '';
      // Show just enough of the question to find your place — the pupil has the paper.
      const recap = (stripStem(part.text, stemOf.get(part)) || clean(part.text)).slice(0, 130);
      ch.push(new Paragraph({
        spacing: { before: 140, after: 40 },
        children: [
          new TextRun({ text: `${label} `, bold: true, font: 'Century Gothic', size: 22, color: NAVY }),
          new TextRun({ text: recap, font: 'Century Gothic', size: 20, color: GREY }),
        ],
      }));

      if (ms.text) ch.push(p(clean(ms.text), { para: { spacing: { after: 40 } } }));
      for (const note of (ms.notes || []).slice(0, 6)) {
        ch.push(p('• ' + clean(note), { run: { size: 20, color: GREY }, para: { spacing: { after: 20 } } }));
      }
      for (const lv of (ms.levels || [])) {
        ch.push(p(`Level ${lv.level} (${lv.marks}): ${clean(lv.descriptor)}`,
          { run: { size: 20, color: NAVY }, para: { spacing: { after: 20 } } }));
      }
      if (ex.commonError) {
        ch.push(new Paragraph({
          spacing: { before: 60, after: 40 },
          children: [
            new TextRun({ text: 'Watch out: ', bold: true, font: 'Century Gothic', size: 20, color: 'E65100' }),
            new TextRun({ text: clean(ex.commonError), font: 'Century Gothic', size: 20, color: INK }),
          ],
        }));
      }
      if (part.passRate != null) {
        ch.push(p(`${part.passRate}% of students scored on this in the real exam.`,
          { run: { size: 18, italics: true, color: GREY }, para: { spacing: { after: 60 } } }));
      }
    });
  });
  return ch;
}

async function writeDocx(children, outPath) {
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Century Gothic', size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      children,
    }],
  });
  fs.writeFileSync(outPath, await Packer.toBuffer(doc));
  // Same Google Docs shading fix the lesson renderer applies.
  const zip = new AdmZip(outPath);
  const e = zip.getEntry('word/document.xml');
  if (e) {
    zip.updateFile(e, Buffer.from(zip.readAsText(e).replace(/(<w:shd\b[^>]*w:val=")solid(")/g, '$1clear$2'), 'utf8'));
    zip.writeZip(outPath);
  }
}

async function build(opts) {
  const o = opts || {};
  const libDir = o.lib || LIB;
  const catPath = path.join(libDir, 'catalogue.json');
  if (!fs.existsSync(catPath)) {
    throw new Error(`no exam library found at ${libDir}\n  Build it first: node references/exam-library-batch.js`);
  }
  const catalogue = JSON.parse(fs.readFileSync(catPath, 'utf8'));
  const docsDir = path.join(libDir, 'docs');
  const figsDir = path.join(libDir, 'figures');

  const qs = selectQuestions(catalogue, docsDir, o);
  if (!qs.length) {
    throw new Error(`no questions matched subject="${o.subject || '*'}" topic="${o.topic || '*'}"` +
      (o.subtopic ? ` subtopic="${o.subtopic}"` : '') +
      '\n  Check the spelling against exam-library/report.md.');
  }

  const meta = { subject: qs[0].subject, topic: qs[0].topic };
  const outDir = o.out || process.cwd();
  fs.mkdirSync(outDir, { recursive: true });
  const base = `${meta.topic}`.replace(/[^A-Za-z0-9 ]+/g, '').trim();

  const bookletPath = path.join(outDir, `${base} Homework.docx`);
  const answersPath = path.join(outDir, `${base} Homework Answers.docx`);

  await writeDocx(bookletChildren(qs, meta, figsDir, o.inBooks), bookletPath);
  await writeDocx(answerChildren(qs, meta), answersPath);

  const totalMarks = qs.reduce((a, q) => a + q.marks, 0);
  const withFigs = qs.filter((q) => q.parts.some((p) => (p.figureFiles || []).length)).length;
  const withRate = qs.filter((q) => q.realDifficulty).length;

  console.log(`\n${meta.subject} — ${meta.topic}`);
  console.log(`  ${qs.length} questions, ${totalMarks} marks`);
  console.log(`  ${withFigs} questions carry their real exam figure(s)`);
  console.log(`  ${withRate} questions have a real examiner pass rate (the rest are estimated)`);
  console.log(`  ramped easiest -> hardest, like a test paper`);
  console.log(`\n  booklet -> ${bookletPath}`);
  console.log(`  answers -> ${answersPath}\n`);
  return { qs, bookletPath, answersPath };
}

module.exports = { build, selectQuestions, imageSize, clean, letterGroups, stripStem };

if (require.main === module) {
  const a = process.argv.slice(2);
  const val = (f) => { const i = a.indexOf(f); return i !== -1 ? a[i + 1] : null; };
  build({
    subject: val('--subject'),
    topic: val('--topic'),
    subtopic: val('--subtopic'),
    marks: val('--marks') ? parseInt(val('--marks'), 10) : null,
    out: val('--out'),
    lib: val('--lib'),
    inBooks: a.includes('--in-books'),
  }).catch((e) => { console.error('\nhomework-booklet: ' + e.message + '\n'); process.exit(1); });
}
