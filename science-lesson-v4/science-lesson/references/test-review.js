#!/usr/bin/env node
'use strict';

// Usage: node references/test-review.js \
//   --core <pdf> --extend <pdf> --year N --class X --topic T --lesson N \
//   [--content <json>] [--dry-run] [--subject S] [--macrotopic M] [--output dir]
// --content skips the Claude API call and uses pre-generated content JSON instead

const fs   = require('fs');
const path = require('path');

const Anthropic  = require('@anthropic-ai/sdk');
const pdfParse   = require('pdf-parse');
const PptxGenJS  = require('pptxgenjs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign, HeightRule,
} = require('docx');

// ── CLI ──────────────────────────────────────────────────────────────────────
function parseArgs() {
  const a = process.argv.slice(2);
  const get = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : null; };
  return {
    corePdf:     get('--core'),
    extendPdf:   get('--extend'),
    year:        parseInt(get('--year')   || '9',  10),
    cls:         get('--class')           || '9AB',
    topic:       get('--topic')           || 'Organisation',
    lesson:      parseInt(get('--lesson') || '1',  10),
    subject:     get('--subject')         || 'Biology',
    macrotopic:  get('--macrotopic')      || null,
    contentFile: get('--content')         || null,
    dryRun:      a.includes('--dry-run'),
    mixed:       a.includes('--mixed'),
    outputDir:   get('--output')          || process.cwd(),
  };
}

// ── PPTX constants ────────────────────────────────────────────────────────────
const { SW, SH, NAV_H, ACC_H, BOT_H, BOT_Y, TOP, GAP, MX, CW, FONT, NAVY, NAVY2, DONOW_BAR, GOLD, BG, PURPLE_BG, PURPLE_PEN, TEAL, AMBER, TIER_PPTX, TIER_DOCX, GOLD2, STAGE, STAGE_LABEL } = require('./pptx-constants');
const TIER_PASTEL = { developing: 'E8F5E9', reaching: 'FFF3E0', mastering: 'FFEBEE' };

// ── PPTX helpers (minimal subset of build.js patterns) ───────────────────────
function txt(slide, content, o) {
  slide.addText(content, Object.assign({ fontFace: FONT }, o));
}

function navBar(slide, stage) {
  const tw = SW / 6;
  ['donow','engage','learn','build','apply','review'].forEach((t, i) => {
    const active = t === stage;
    txt(slide, STAGE_LABEL[t], {
      x: i * tw, y: 0, w: tw, h: NAV_H,
      fill: { color: active ? STAGE[t] : NAVY2 },
      color: 'FFFFFF', bold: active, fontSize: active ? 11 : 10,
      align: 'center', valign: 'middle',
    });
  });
  slide.addShape('rect', { x: 0, y: NAV_H, w: SW, h: ACC_H, fill: { color: GOLD }, line: { type: 'none' } });
}

function bottomBar(slide, obj) {
  txt(slide, [
    { text: 'Learning objective:  ', options: { bold: true } },
    { text: obj || '', options: { italic: true } },
  ], {
    x: 0, y: BOT_Y, w: SW, h: BOT_H, fill: { color: NAVY },
    color: 'FFFFFF', fontSize: 11, align: 'left', valign: 'middle', margin: 8,
  });
}

function purplePenBar(slide, y, msg) {
  txt(slide, msg || '☞  Purple pen time · mark and correct your own answers', {
    x: 0, y, w: SW, h: 0.38, fill: { color: PURPLE_PEN },
    color: 'FFFFFF', bold: true, fontSize: 13, align: 'left', valign: 'middle', margin: 8,
  });
  return y + 0.38 + GAP;
}

function sectionHeader(slide, text, colour, y) {
  txt(slide, text, {
    x: 0, y, w: SW, h: 0.38, fill: { color: colour },
    color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle', margin: 8,
  });
  return y + 0.38 + GAP;
}

function goldBox(slide, x, y, w, h, content, opts) {
  const o = opts || {};
  txt(slide, content, {
    x, y, w, h,
    fill: { color: o.fill || 'FFFFFF' }, line: o.line || GOLD2,
    color: o.color || '1A1A2E', fontSize: o.fontSize || 13,
    bold: !!o.bold, italic: !!o.italic,
    align: o.align || 'left', valign: o.valign || 'top',
    margin: o.margin != null ? o.margin : 6, fit: 'shrink',
  });
}

function reviewRow(slide, y, h, q, a) {
  const lw = CW * 0.35, rw = CW * 0.65 - 0.08;
  txt(slide, q, {
    x: MX, y, w: lw, h, fill: { color: DONOW_BAR },
    color: 'FFFFFF', bold: true, fontSize: 13,
    align: 'left', valign: 'middle', margin: 6, fit: 'shrink',
  });
  txt(slide, a || '', {
    x: MX + lw + 0.08, y, w: rw, h,
    fill: { color: NAVY }, line: GOLD2, color: 'FFFFFF',
    align: 'left', valign: 'middle', margin: 6, fit: 'shrink', fontSize: 13,
  });
}

// ── Slide builders ────────────────────────────────────────────────────────────
const REVIEW_OBJ = 'Review test performance and address EBI subtopics';

function slideDoNow(pptx, doNow, meta) {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  navBar(s, 'donow');

  // Purple pen from the very start — use purple pen ALL lesson
  let y = purplePenBar(s, TOP, '☞  Use purple pen throughout this lesson — complete all questions in purple pen');

  // Left panel: title, class info, objective — matching build.js layout
  const leftW = SW * 0.36 - MX;
  const divX  = SW * 0.36 + 0.08;

  txt(s, meta.topic + ' Test Review', {
    x: MX, y, w: leftW, h: 1.2,
    color: GOLD, bold: true, fontSize: 26, align: 'left', valign: 'top', fit: 'shrink', wrap: true,
  });
  txt(s, `${meta.cls}  ·  Year ${meta.year}  ·  ${meta.subject}`, {
    x: MX, y: y + 1.22, w: leftW, h: 0.28,
    color: 'AABBD0', fontSize: 11, align: 'left', valign: 'middle',
  });
  const loH = BOT_Y - 0.16 - (y + 1.55);
  goldBox(s, MX, y + 1.55, leftW, loH, [
    { text: 'Learning Objective:', options: { bold: true, color: GOLD, fontSize: 13, breakLine: true, paraSpaceAfter: 6 } },
    { text: REVIEW_OBJ,           options: { color: 'FFFFFF', fontSize: 12 } },
  ], { fill: NAVY2, valign: 'top' });

  // Gold vertical divider
  s.addShape('rect', { x: divX, y, w: 0.013, h: BOT_Y - 0.16 - y, fill: { color: GOLD }, line: { type: 'none' } });

  // Right panel: DO NOW header + numbered questions
  const rx = divX + 0.18, rw = SW - rx - MX;
  txt(s, 'DO NOW', {
    x: rx, y, w: rw, h: 0.38,
    fill: { color: DONOW_BAR }, color: GOLD, bold: true, fontSize: 15,
    align: 'center', valign: 'middle',
  });

  const qtop = y + 0.38 + 0.08, bottom = BOT_Y - 0.16;
  const n    = Math.max(doNow.length, 5);
  const rowH = (bottom - qtop - (n - 1) * 0.08) / n;
  doNow.slice(0, 5).forEach((q, i) => {
    const ry = qtop + i * (rowH + 0.08);
    s.addShape('roundRect', {
      x: rx, y: ry + (rowH - 0.42) / 2, w: 0.42, h: 0.42,
      rectRadius: 0.05, fill: { color: GOLD }, line: { type: 'none' },
    });
    txt(s, String(i + 1), {
      x: rx, y: ry + (rowH - 0.42) / 2, w: 0.42, h: 0.42,
      color: NAVY, bold: true, fontSize: 18, align: 'center', valign: 'middle',
    });
    goldBox(s, rx + 0.55, ry, rw - 0.55, rowH, q.q || '', {
      fill: 'F8F7F0', fontSize: 17, valign: 'middle',
    });
  });
  bottomBar(s, REVIEW_OBJ);
}

function slideDoNowReview(pptx, doNow) {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  navBar(s, 'donow');
  let y = purplePenBar(s, TOP);
  const n = doNow.length;
  const rowH = (BOT_Y - 0.08 - y - (n - 1) * 0.08) / Math.max(n, 1);
  doNow.forEach((q) => {
    reviewRow(s, y, rowH, q.q || '', q.a || '');
    y += rowH + 0.08;
  });
  bottomBar(s, REVIEW_OBJ);
}

// M10: clean visualiser slide — brief instruction only, no auto-generated Q&A
function slideVisualiser(pptx) {
  const s = pptx.addSlide();
  s.background = { color: PURPLE_BG };
  navBar(s, 'build');
  const mid = NAV_H + ACC_H + (SH - NAV_H - ACC_H - BOT_H) / 2;
  txt(s, 'Get out your marked test', {
    x: 0, y: mid - 1.05, w: SW, h: 1.0,
    color: GOLD, bold: true, fontSize: 36, align: 'center', valign: 'middle',
  });
  txt(s, 'We’re going through it now', {
    x: 0, y: mid + 0.05, w: SW, h: 0.38,
    color: 'FFFFFF', fontSize: 16, align: 'center', valign: 'middle',
  });
  goldBox(s, (SW - 7) / 2, mid + 0.55, 7, 0.65,
    'Look · Listen · Correct in purple pen · Ask if unsure',
    { fill: NAVY2, color: 'FFFFFF', bold: true, fontSize: 15, align: 'center', valign: 'middle' });
  bottomBar(s, REVIEW_OBJ);
}

// Slide 4 — silence timer + three-tier task structure (M12, M13)
// mixed=true: shows two parallel tracks (CORE | EXTEND) for mixed-ability classes
function slideReviewTaskIntro(pptx, subtopics, mixed) {
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'review');
  let y = sectionHeader(s, 'REVIEW TASK · EBI QUESTION SETS', STAGE.review, TOP);

  const iw = CW * 0.58, tw = CW - iw - 0.15, tx = MX + iw + 0.15;

  // Timer — 10 minutes (M12)
  txt(s, '10', {
    x: tx, y, w: tw, h: 1.1,
    fill: { color: NAVY }, line: GOLD2, color: GOLD, bold: true, fontSize: 52,
    align: 'center', valign: 'middle',
  });
  txt(s, 'minutes silence', {
    x: tx, y: y + 1.1, w: tw, h: 0.40,
    fill: { color: NAVY2 }, color: 'FFFFFF', fontSize: 14, align: 'center', valign: 'middle',
  });
  txt(s, 'then quiet work', {
    x: tx, y: y + 1.5, w: tw, h: 0.30,
    color: '777777', italic: true, fontSize: 11, align: 'center', valign: 'middle',
  });

  // Three tier rows using TIER_PPTX colours from build.js
  const tierH = 0.52, TGAP = 0.08;
  const tierRows = [
    { key: 'developing', desc: 'Question sets on your worksheet — your EBI topics' },
    { key: 'reaching',   desc: 'Harder questions on the back of your worksheet' },
    { key: 'mastering',  desc: 'Tell me when done — you can help others' },  // M13
  ];

  if (mixed) {
    // Two-column layout: CORE | EXTEND for mixed-ability class
    const halfW = (iw - 0.15) / 2;
    const headers = ['CORE', 'EXTEND'];
    headers.forEach((h, hi) => {
      const hx = MX + hi * (halfW + 0.15);
      txt(s, h, {
        x: hx, y, w: halfW, h: 0.36,
        fill: { color: NAVY }, color: GOLD, bold: true, fontSize: 13, align: 'center', valign: 'middle',
      });
    });
    y += 0.36 + TGAP;
    tierRows.forEach((t, i) => {
      const ty = y + i * (tierH + TGAP);
      [0, 1].forEach((hi) => {
        const hx = MX + hi * (halfW + 0.15);
        txt(s, t.key.toUpperCase(), {
          x: hx, y: ty, w: 1.3, h: tierH,
          fill: { color: TIER_PPTX[t.key] }, color: 'FFFFFF', bold: true, fontSize: 11,
          align: 'center', valign: 'middle',
        });
        txt(s, t.desc, {
          x: hx + 1.3 + 0.05, y: ty, w: halfW - 1.35, h: tierH,
          fill: { color: 'FFFFFF' }, line: { color: TIER_PPTX[t.key], width: 1.5 },
          color: '1A1A2E', fontSize: 11, align: 'left', valign: 'middle', margin: 6,
        });
      });
    });
  } else {
    // Single-column layout
    tierRows.forEach((t, i) => {
      const ty = y + i * (tierH + TGAP);
      txt(s, t.key.toUpperCase(), {
        x: MX, y: ty, w: 1.55, h: tierH,
        fill: { color: TIER_PPTX[t.key] }, color: 'FFFFFF', bold: true, fontSize: 13,
        align: 'center', valign: 'middle',
      });
      txt(s, t.desc, {
        x: MX + 1.55 + 0.06, y: ty, w: iw - 1.55 - 0.06, h: tierH,
        fill: { color: 'FFFFFF' }, line: { color: TIER_PPTX[t.key], width: 1.5 },
        color: '1A1A2E', fontSize: 13, align: 'left', valign: 'middle', margin: 8,
      });
    });
    y += tierRows.length * (tierH + TGAP);
  }

  // Subtopic reference chips (M5 — book refs)
  const chipY = (!mixed ? y : y + tierRows.length * (tierH + TGAP) + 0.36) + GAP;
  if (subtopics.length && chipY < BOT_Y - 0.5) {
    const cols = subtopics.length;
    const colW = (CW - (cols - 1) * 0.1) / cols;
    subtopics.forEach((st, i) => {
      goldBox(s, MX + i * (colW + 0.1), chipY, colW, BOT_Y - 0.08 - chipY, [
        { text: `Q${st.questionNumber}  `, options: { bold: true, fontSize: 10, color: AMBER } },
        { text: st.name, options: { bold: true, fontSize: 10, breakLine: true } },
        { text: st.bookRef || '', options: { italic: true, fontSize: 8, color: '666666' } },
      ], { fill: 'FFFFFF', valign: 'top', margin: 5 });
    });
  }
  bottomBar(s, REVIEW_OBJ);
}

// ── DOCX constants (match build.js patterns exactly) ─────────────────────────
const PAGE_W = 10106;
const B_NONE = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const NO_B   = { top: B_NONE, bottom: B_NONE, left: B_NONE, right: B_NONE };
const NO_TBL_B = Object.assign({}, NO_B, { insideHorizontal: B_NONE, insideVertical: B_NONE });
const bGrey = (sz) => ({ style: BorderStyle.SINGLE, size: sz, color: 'CCCCCC' });
const GREY_TBL = { top: bGrey(4), bottom: bGrey(4), left: bGrey(4), right: bGrey(4), insideHorizontal: bGrey(4), insideVertical: bGrey(4) };
const shade = (fill) => ({ type: ShadingType.CLEAR, color: 'auto', fill });

// ── DOCX helpers (same conventions as build.js) ──────────────────────────────
const P = (children, opts) => new Paragraph(Object.assign(
  { children: Array.isArray(children) ? children : [children] },
  opts || {}
));
const R = (text, opts) => new TextRun(Object.assign({ text: String(text) }, opts || {}));
const spacer  = () => new Paragraph({ spacing: { before: 40, after: 40 } });
const blanks  = (n) => Array.from({ length: n }, () => new Paragraph({ spacing: { before: 0, after: 0 } }));

function fullTable(rows, columnWidths, borders) {
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths,
    borders: borders || NO_TBL_B,
    rows,
  });
}

function docxCell(o) {
  return new TableCell({
    width:         { size: o.w, type: WidthType.DXA },
    shading:       o.fill ? shade(o.fill) : undefined,
    borders:       o.borders || NO_B,
    margins:       o.margins,
    verticalAlign: o.valign || VerticalAlign.CENTER,
    children:      o.children,
  });
}

function divider(text) {
  return [spacer(), fullTable([new TableRow({
    children: [docxCell({
      w: PAGE_W, fill: NAVY, margins: { top: 80, bottom: 80, left: 180, right: 180 },
      children: [P(R(text, { bold: true, size: 22, color: GOLD }))],
    })],
  })], [PAGE_W]), spacer()];
}

function writeLines(n) {
  const rows = Array.from({ length: n || 3 }, () => new TableRow({
    height: { value: 340, rule: HeightRule.EXACT },
    children: [docxCell({
      w: PAGE_W,
      borders: { top: B_NONE, left: B_NONE, right: B_NONE, bottom: bGrey(4) },
      margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: [P(R('', { size: 20 }))],
    })],
  }));
  return [fullTable(rows, [PAGE_W]), spacer()];
}

// ── EBI tick grid (M11: Student 1 → Student N) ───────────────────────────────
function ebiGrid(subtopics, classSize) {
  const studentW = 1400;
  const topicW   = Math.floor((PAGE_W - studentW) / subtopics.length);
  const colW     = [studentW, ...subtopics.map(() => topicW)];

  const headerRow = new TableRow({
    children: [
      docxCell({
        w: studentW, fill: NAVY, borders: GREY_TBL,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [P(R('Student', { bold: true, size: 18, color: 'FFFFFF' }))],
      }),
      ...subtopics.map(st => docxCell({
        w: topicW, fill: NAVY2, borders: GREY_TBL,
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        children: [
          P(R(`Q${st.questionNumber}: ${st.name}`, { bold: true, size: 16, color: GOLD }), { spacing: { after: 40 } }),
          P(R(st.bookRef || '', { italic: true, size: 14, color: 'AAAAAA' })),
        ],
      })),
    ],
  });

  const dataRows = Array.from({ length: classSize }, (_, i) => new TableRow({
    height: { value: 300, rule: HeightRule.EXACT },
    children: [
      docxCell({
        w: studentW, borders: GREY_TBL,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [P(R(`Student ${i + 1}`, { size: 18 }))],
      }),
      ...subtopics.map(() => docxCell({ w: topicW, borders: GREY_TBL, children: [P(R(''))] })),
    ],
  }));

  return fullTable([headerRow, ...dataRows], colW, GREY_TBL);
}

// ── Worksheet helpers — matching build.js tierBadge + question style ──────────

// tierBadge: narrow pill matching build.js exactly
function tierBadge(tier) {
  return [spacer(), new Table({
    width: { size: 1800, type: WidthType.DXA }, columnWidths: [1800], borders: NO_TBL_B,
    rows: [new TableRow({ children: [docxCell({
      w: 1800, fill: TIER_PASTEL[tier] || 'F5F5F5',
      margins: { top: 40, bottom: 40, left: 140, right: 140 },
      children: [P(R(tier.charAt(0).toUpperCase() + tier.slice(1),
        { bold: true, size: 18, color: TIER_DOCX[tier] || '333333' }),
        { alignment: AlignmentType.CENTER })],
    })]})],
  }), spacer()];
}

// docxQuestion: Q-number + text, no write lines (students write in books)
function docxQuestion(num, text) {
  return P([
    R(`Q${num}  `, { bold: true, size: 20 }),
    R(text || '', { size: 20 }),
  ], { spacing: { before: 60, after: 60 } });
}

// Subtopic header — navy bar, gold text, book ref below
function subtopicHeader(st) {
  return [spacer(), fullTable([new TableRow({ children: [docxCell({
    w: PAGE_W, fill: NAVY,
    margins: { top: 80, bottom: 80, left: 180, right: 180 },
    children: [
      P(R(`Q${st.questionNumber}: ${st.name}`, { bold: true, size: 22, color: GOLD })),
      ...(st.bookRef ? [P(R(st.bookRef, { italic: true, size: 18, color: 'CCCCCC' }))] : []),
    ],
  })]})], [PAGE_W]), spacer()];
}

// M14: always builds both worksheets — no write lines, no EBI grid, students write in books
function buildWorksheet(topic, subtopics, questions, isExtend) {
  const label = isExtend ? 'Extend' : 'Core';
  const children = [
    ...divider(`${topic} TEST REVIEW — ${label.toUpperCase()}`),
    P(R('Write answers in your book on the page you were working on.',
      { italic: true, size: 18, color: '555555' }), { spacing: { after: 80 } }),
  ];

  for (const st of subtopics) {
    const qs = questions[st.name] || {};
    children.push(...subtopicHeader(st));

    // DEVELOPING tier — Set 1 (recall), Set 2 (application), Set 3 (extended)
    children.push(...tierBadge('developing'));
    const devQs = [...(qs.set1 || []), ...(qs.set2 || []), ...(qs.set3 || [])];
    devQs.forEach((q, i) => children.push(docxQuestion(i + 1, q.q)));

    // REACHING tier — extend/harder questions
    children.push(...tierBadge('reaching'));
    (qs.extend || []).forEach((q, i) => children.push(docxQuestion(i + 1, q.q)));
  }

  // MASTERING — just the badge and instruction (M13)
  children.push(...tierBadge('mastering'));
  children.push(P(R('If you are done — tell me. You can help others with their questions.',
    { italic: true, size: 20, color: TIER_DOCX.mastering }), { spacing: { before: 40, after: 40 } }));

  return new Document({ sections: [{ children }] });
}

// ── Drive helpers (M8, M9) ────────────────────────────────────────────────────
const DRIVE_ROOT = 'G:\\My Drive\\Beechen Cliff Science\\Lessons';

function inferMacrotopic(year, subject, topic) {
  const yearDir = path.join(DRIVE_ROOT, `Year ${year}`, subject);
  if (!fs.existsSync(yearDir)) return topic;
  try {
    const macros = fs.readdirSync(yearDir, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name);
    for (const mac of macros) {
      const lessons = fs.readdirSync(path.join(yearDir, mac), { withFileTypes: true })
        .filter(d => d.isDirectory()).map(d => d.name);
      if (lessons.some(l => l.toLowerCase().includes(topic.toLowerCase()))) return mac;
    }
  } catch (_) {}
  return topic;
}

function driveDestDir(year, subject, macrotopic, lessonNum, topic) {
  return path.join(DRIVE_ROOT, `Year ${year}`, subject, macrotopic, `Lesson ${lessonNum} - ${topic} Review`);
}

// ── PDF text extraction ───────────────────────────────────────────────────────
async function pdfText(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    const data = await pdfParse(buf);
    return data.text || '';
  } catch (e) {
    console.warn(`  ! PDF parse warning (${path.basename(filePath)}): ${e.message}`);
    return '';
  }
}

// ── Claude API ────────────────────────────────────────────────────────────────
// ponytail: mock subtopics used in dry-run when no API key is available
const MOCK_SUBTOPICS = [
  { name: 'Digestion & enzymes',    questionNumber: 1, bookRef: '' },
  { name: 'Circulatory system',     questionNumber: 2, bookRef: '' },
  { name: 'Gas exchange',           questionNumber: 3, bookRef: '' },
  { name: 'Cells & organisation',   questionNumber: 4, bookRef: '' },
  { name: 'Tumours',                questionNumber: 5, bookRef: '' },
];

function parseJson(text) {
  const cleaned = text.replace(/^```json\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {
    const m = cleaned.match(/\{[\s\S]+\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Could not parse JSON from Claude response');
  }
}

async function callClaude({ extendText, coreText, topic, year, cls, textbookIndex, dryRun }) {
  const anthropic = new Anthropic();

  const userContent = dryRun
    ? `Extract Q1–Q5 subtopic names from the EBI tick table on the extend test front cover.
Find the textbook reference for each from the index below.
Return ONLY JSON (no prose, no fences):
{"subtopics":[{"name":"...","questionNumber":1,"bookRef":"AQA GCSE Biology pp52–56 The blood and heart"}]}

EXTEND TEST FRONT COVER TEXT:
${extendText.slice(0, 3000)}

TEXTBOOK INDEX (Year ${year}):
${textbookIndex}`
    : `Generate test review materials for Year ${year} ${cls} on topic: ${topic}

EXTEND TEST (front cover EBI table + questions — extract Q1–Q5 subtopic names from front cover):
${extendText.slice(0, 6000)}

CORE TEST (all questions — for non-duplication check):
${coreText.slice(0, 8000)}

TEXTBOOK INDEX:
${textbookIndex}

Return ONLY valid JSON (no prose, no markdown fences):
{
  "subtopics": [{"name":"...","questionNumber":1,"bookRef":"AQA GCSE Biology pp52–56 The blood and heart"}],
  "doNow": [{"q":"...","a":"..."}],
  "coreQuestions": {
    "<subtopic name>": {
      "set1": [{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}],
      "set2": [{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}],
      "set3": [{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}],
      "extend": [{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]
    }
  },
  "extendQuestions": {
    "<same subtopic names — all questions harder than coreQuestions>": {
      "set1": [...], "set2": [...], "set3": [...], "extend": [...]
    }
  }
}

Rules:
- subtopics: extract EXACT names from EBI tick table Q1–Q5 on the extend PDF front cover
- bookRef: "[Book] pp.[X]–[Y] [Section title]" from textbook index; "" if not found
- doNow: EXACTLY 5 questions from a COMPLETELY DIFFERENT Biology/Chemistry/Physics topic (not ${topic})
- NEVER reproduce any question from either PDF verbatim or trivially reworded
- coreQuestions.set1=recall(1-2 marks); set2=application(2-3 marks); set3=explain/evaluate(3-4 marks); extend=higher-order
- extendQuestions: all harder than coreQuestions throughout — no simple recall, no 1-mark naming
- ${cls} = ${year >= 10 ? 'GCSE' : year === 9 ? 'Year 9 GCSE-start'  : 'KS3'} higher ability`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: dryRun ? 1500 : 8192,
    messages: [{ role: 'user', content: userContent }],
  });

  return parseJson(response.content[0].text);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();

  if (!args.corePdf || !args.extendPdf) {
    console.error([
      'Usage: node references/test-review.js',
      '  --core <pdf> --extend <pdf> --year N --class X --topic T --lesson N',
      '  [--dry-run] [--subject Biology] [--macrotopic M] [--output dir]',
    ].join('\n'));
    process.exit(1);
  }

  const macrotopic   = args.macrotopic || inferMacrotopic(args.year, args.subject, args.topic);
  const reviewLesson = args.lesson + 1;
  const topicSlug    = args.topic.replace(/\s+/g, '_');
  const destDir      = driveDestDir(args.year, args.subject, macrotopic, reviewLesson, args.topic);

  console.log('Reading PDFs...');
  const [extendText, coreText, textbookIndex] = await Promise.all([
    pdfText(path.resolve(args.extendPdf)),
    pdfText(path.resolve(args.corePdf)),
    Promise.resolve(fs.readFileSync(path.join(__dirname, 'textbook-index.md'), 'utf8')),
  ]);

  if (!extendText && !coreText) {
    console.warn('  ! No text extracted from PDFs — Claude will infer from topic name only');
  }

  let content;
  if (args.contentFile) {
    console.log('Loading pre-generated content from', args.contentFile);
    content = JSON.parse(fs.readFileSync(path.resolve(args.contentFile), 'utf8'));
  } else if (!process.env.ANTHROPIC_API_KEY) {
    if (args.dryRun) {
      console.log('  ! ANTHROPIC_API_KEY not set — dry-run uses mock subtopics');
      content = { subtopics: MOCK_SUBTOPICS };
    } else {
      console.error('Error: ANTHROPIC_API_KEY not set. Use --content <json> or set ANTHROPIC_API_KEY.');
      process.exit(1);
    }
  } else {
    console.log('Calling Claude API...');
    content = await callClaude({
      extendText, coreText, topic: args.topic,
      year: args.year, cls: args.cls, textbookIndex,
      dryRun: args.dryRun,
    });
  }

  const {
    subtopics      = [],
    doNow          = [],
    coreQuestions  = {},
    extendQuestions = {},
  } = content;

  // ── Dry run (N2) ──────────────────────────────────────────────────────────
  if (args.dryRun) {
    console.log('\n=== DRY RUN PLAN ===');
    console.log(`Topic: ${args.topic}  |  Year ${args.year}  |  Class ${args.cls}`);
    console.log(`Review lesson: Lesson ${reviewLesson} - ${args.topic} Review`);
    console.log('\nSubtopics found from extend PDF:');
    if (!subtopics.length) {
      console.log('  (none found — check extend PDF has a text layer)');
    } else {
      subtopics.forEach(s =>
        console.log(`  Q${s.questionNumber}: ${s.name}${s.bookRef ? '  |  ' + s.bookRef : '  |  (no ref found)'}`)
      );
    }
    console.log('\nPlanned question sets per subtopic:');
    subtopics.forEach(s =>
      console.log(`  ${s.name}: Set1(3) + Set2(3) + Set3(3) + Extend(3) = 12 questions`)
    );
    console.log(`\nDo Now: 5 questions from a different topic`);
    console.log('\nOutputs (→ ' + args.outputDir + '):');
    console.log(`  ${topicSlug}_test_review_PTO.pptx`);
    console.log(`  ${topicSlug}_test_review_core_worksheet.docx`);
    console.log(`  ${topicSlug}_test_review_extend_worksheet.docx`);
    console.log('\nDrive folder (will be created):');
    console.log('  ' + destDir);
    const missingRefs = subtopics.filter(s => !s.bookRef).map(s => s.name);
    console.log('Book refs missing:', missingRefs.length ? missingRefs.join(', ') : 'none');
    return;
  }

  const outBase = path.join(args.outputDir, topicSlug);
  const meta    = { topic: args.topic, year: args.year, cls: args.cls, subject: args.subject };

  // PPTX — 4 slides exactly
  console.log('Building PPTX (4 slides)...');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.theme  = { headFontFace: FONT, bodyFontFace: FONT };
  slideDoNow(pptx, doNow, meta);              // slide 1 — left panel + purple pen from start
  slideDoNowReview(pptx, doNow);              // slide 2
  slideVisualiser(pptx);                      // slide 3 — clean, no Q&A
  slideReviewTaskIntro(pptx, subtopics, args.mixed); // slide 4 — timer + tiers (mixed=two columns)
  const pptxPath = outBase + '_test_review_PTO.pptx';
  await pptx.writeFile({ fileName: pptxPath });
  console.log('  ' + path.basename(pptxPath));

  // Core worksheet — M14: always built; no write lines, students write in books
  console.log('Building core worksheet...');
  const coreDocPath = outBase + '_test_review_core_worksheet.docx';
  fs.writeFileSync(coreDocPath, await Packer.toBuffer(
    buildWorksheet(args.topic, subtopics, coreQuestions, false)
  ));
  console.log('  ' + path.basename(coreDocPath));

  // Extend worksheet — M14: always built
  console.log('Building extend worksheet...');
  const extDocPath = outBase + '_test_review_extend_worksheet.docx';
  fs.writeFileSync(extDocPath, await Packer.toBuffer(
    buildWorksheet(args.topic, subtopics, extendQuestions, true)
  ));
  console.log('  ' + path.basename(extDocPath));

  // Drive folder + copy (M8, M9)
  console.log('\nCreating Drive folder...');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log('  Created: ' + destDir);
  } else {
    console.log('  Exists: ' + destDir);
  }

  const copies = [
    { src: pptxPath,    name: topicSlug + '_test_review_PTO.pptx' },
    { src: coreDocPath, name: topicSlug + '_test_review_core_worksheet.docx' },
    { src: extDocPath,  name: topicSlug + '_test_review_extend_worksheet.docx' },
  ];
  for (const f of copies) {
    fs.copyFileSync(f.src, path.join(destDir, f.name));
    console.log('  Copied: ' + f.name);
  }

  // Append to upload-log.txt
  const logLine = [
    new Date().toISOString().slice(0, 19).replace('T', ' '),
    `Lesson ${reviewLesson} - ${args.topic} Review`,
    destDir,
  ].join('\t') + '\n';
  fs.appendFileSync(path.join(process.cwd(), 'upload-log.txt'), logLine, 'utf8');
  console.log('\nDone. Logged to upload-log.txt');
}

main().catch(err => { console.error(err.message || err); process.exit(1); });
