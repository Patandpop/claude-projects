#!/usr/bin/env node
'use strict';

// Usage: node references/test-review-lesson.js \
//   --content <json> --year N --class X --topic T --lesson N \
//   [--subject S] [--macrotopic M] [--output dir] [--dry-run] [--classsize N] [--mixed] [--yes]
//
// --content  : required — path to generated content JSON (subtopics, doNow, coreQuestions, extendQuestions)
//              each subtopic: { questionNumber, name, bookRef?, marks? }  marks = the marks that section of the
//              test is worth (read from the paper; 2026-10-29): shown in the review table, the headings and slide 4
// --yes      : skip confirmation prompt (N1)
// --dry-run  : print plan without writing files (N2)
// --mixed    : slide 4 shows two columns (CORE | EXTEND) for mixed-ability classes

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const tb       = require('./textbook-index.js');

const PptxGenJS = require('pptxgenjs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign,
} = require('docx');

// ── CLI ───────────────────────────────────────────────────────────────────────
function parseArgs() {
  const a = process.argv.slice(2);
  const get = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : null; };
  return {
    contentFile: get('--content'),
    year:        parseInt(get('--year')      || '9',  10),
    cls:         get('--class')              || '9AB',
    topic:       get('--topic')              || 'Organisation',
    lesson:      parseInt(get('--lesson')    || '1',  10),
    subject:     get('--subject')            || 'Biology',
    macrotopic:  get('--macrotopic')         || null,
    dryRun:      a.includes('--dry-run'),
    mixed:       a.includes('--mixed'),
    yes:         a.includes('--yes'),
    classSize:   parseInt(get('--classsize') || '0',  10) || null,
    outputDir:   get('--output')             || process.cwd(),
  };
}

// ── PPTX constants (match build.js exactly) ───────────────────────────────────
const SW = 13.33, SH = 7.5;
const NAV_H = 0.55, ACC_H = 0.04;
const BOT_H = 0.35, BOT_Y = SH - BOT_H;
const TOP = NAV_H + ACC_H + 0.12;
const GAP = 0.10, MX = 0.45;
const CW = SW - 2 * MX;
const FONT = 'Trebuchet MS';
const NAVY  = '0D1B5E', NAVY2 = '152347', DONOW_BAR = '25408D';
const GOLD  = 'FABB2E', BG = 'EDF2FA', PURPLE_BG = '4A148C', PURPLE_PEN = '6A0DAD';
const TEAL  = '00838F', AMBER = 'E65100';
const TIER_PPTX = { developing: '2E7D32', reaching: 'E65100', mastering: 'B71C1C' };
const TIER_DOCX = { developing: '1E5C2D', reaching: 'C05A00', mastering: '9B1B1B' };
const TIER_PASTEL = { developing: 'E8F5E9', reaching: 'FFF3E0', mastering: 'FFEBEE' };
const GOLD2 = { color: GOLD, width: 2 };
const STAGE = {
  donow: NAVY, engage: '1B5E20', learn: 'F9A825',
  build: 'E65100', apply: 'B71C1C', review: '1B5E20',
};
const STAGE_LABEL = {
  donow: 'DO NOW', engage: 'ENGAGE', learn: 'LEARN',
  build: 'BUILD', apply: 'APPLY', review: 'REVIEW',
};

// ── PPTX helpers (minimal subset — from build.js) ─────────────────────────────
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

function silentEntryFooter(slide) {
  txt(slide, 'Silent start · pen out · attempt all questions', {
    x: 0, y: BOT_Y - 0.32, w: SW, h: 0.30,
    color: '616161', fontSize: 12, align: 'center', valign: 'middle',
  });
}

// ── Slide builders ────────────────────────────────────────────────────────────
const REVIEW_OBJ = 'Review test performance and address EBI subtopics';

// Slide 1 — Do Now (matches build.js slideTitleDoNow layout exactly; M7)
function slideDoNow(pptx, doNow, meta) {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  navBar(s, 'donow');

  const leftW = SW * 0.36 - MX;
  let y = 0.78;

  txt(s, meta.topic + ' Test Review', {
    x: MX, y, w: leftW, h: 1.45,
    color: GOLD, bold: true, fontSize: 28, align: 'left', valign: 'top', fit: 'shrink', wrap: true,
  });
  y += 1.5;
  txt(s, `${meta.cls}  ·  Year ${meta.year}  ·  ${meta.subject}`, {
    x: MX, y, w: leftW, h: 0.3,
    color: 'AABBD0', fontSize: 12, align: 'left', valign: 'middle',
  });
  y += 0.42;
  const loH = BOT_Y - 0.45 - y;
  goldBox(s, MX, y, leftW, loH, [
    { text: 'Learning Objective:', options: { bold: true, color: GOLD, fontSize: 15, breakLine: true, paraSpaceAfter: 8 } },
    { text: REVIEW_OBJ,           options: { color: 'FFFFFF', fontSize: 14 } },
  ], { fill: NAVY2, valign: 'top' });

  const divX = SW * 0.36 + 0.08;
  s.addShape('rect', { x: divX, y: 0.78, w: 0.013, h: BOT_Y - 0.45 - 0.78, fill: { color: GOLD }, line: { type: 'none' } });

  const rx = divX + 0.18, rw = SW - rx - MX;
  txt(s, 'DO NOW', {
    x: rx, y: 0.78, w: rw, h: 0.4,
    fill: { color: DONOW_BAR }, color: GOLD, bold: true, fontSize: 15,
    align: 'center', valign: 'middle',
  });

  const qtop = 0.78 + 0.4 + 0.1, bottom = BOT_Y - 0.40;
  const n    = Math.max((doNow || []).length, 4);
  const rowH = (bottom - qtop - (n - 1) * 0.08) / n;
  (doNow || []).forEach((q, i) => {
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
      fill: 'F8F7F0', fontSize: 19, valign: 'middle',
    });
  });
  silentEntryFooter(s);
  bottomBar(s, REVIEW_OBJ);
}

// Slide 2 — Do Now answers
function slideDoNowReview(pptx, doNow) {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  navBar(s, 'donow');
  let y = purplePenBar(s, TOP);
  const n = (doNow || []).length;
  const rowH = (BOT_Y - 0.08 - y - (n - 1) * 0.08) / Math.max(n, 1);
  (doNow || []).forEach((q) => {
    reviewRow(s, y, rowH, q.q || '', q.a || '');
    y += rowH + 0.08;
  });
  bottomBar(s, REVIEW_OBJ);
}

// Slide 3 — Visualiser (M10: clean, no auto-generated Q&A)
function slideVisualiser(pptx) {
  const s = pptx.addSlide();
  s.background = { color: PURPLE_BG };
  navBar(s, 'build');
  const mid = NAV_H + ACC_H + (SH - NAV_H - ACC_H - BOT_H) / 2;
  txt(s, 'Get out your marked test', {
    x: 0, y: mid - 1.05, w: SW, h: 1.0,
    color: GOLD, bold: true, fontSize: 36, align: 'center', valign: 'middle',
  });
  txt(s, "We're going through it now", {
    x: 0, y: mid + 0.05, w: SW, h: 0.38,
    color: 'FFFFFF', fontSize: 16, align: 'center', valign: 'middle',
  });
  goldBox(s, (SW - 7) / 2, mid + 0.55, 7, 0.65,
    'Look  ·  Listen  ·  Correct in purple pen  ·  Ask if unsure',
    { fill: NAVY2, color: 'FFFFFF', bold: true, fontSize: 15, align: 'center', valign: 'middle' });
  bottomBar(s, REVIEW_OBJ);
}

// Slide 4 — timer + task structure (M12 timer, M13 "put your hand up")
// mixed=true: two-column CORE | EXTEND layout for mixed-ability classes
function slideReviewTaskIntro(pptx, subtopics, mixed) {
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'review');
  let y = sectionHeader(s, 'REVIEW TASK · EBI QUESTION SETS', STAGE.review, TOP);

  const iw = CW * 0.58, tw = CW - iw - 0.15, tx = MX + iw + 0.15;

  // M12: 10 minutes silence timer
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

  const tierH = 0.52, TGAP = 0.08;
  const tierRows = [
    { key: 'developing', desc: 'Work through Set 1, 2, 3 for your EBI topics (left column)' },
    { key: 'reaching',   desc: 'Try the extend questions for your EBI topics (right column)' },
    // M13: exact wording from spec
    { key: 'mastering',  desc: 'If you\'ve finished, put your hand up to help others' },
  ];

  if (mixed) {
    const halfW = (iw - 0.15) / 2;
    ['CORE', 'EXTEND'].forEach((h, hi) => {
      txt(s, h, {
        x: MX + hi * (halfW + 0.15), y, w: halfW, h: 0.36,
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

  // M5: subtopic chips with book refs
  const chipY = (!mixed ? y : y + tierRows.length * (tierH + TGAP) + 0.36) + GAP;
  if (subtopics.length && chipY < BOT_Y - 0.5) {
    const cols = subtopics.length;
    const colW = (CW - (cols - 1) * 0.1) / cols;
    subtopics.forEach((st, i) => {
      goldBox(s, MX + i * (colW + 0.1), chipY, colW, BOT_Y - 0.08 - chipY, [
        { text: `Q${st.questionNumber}  ` + (st.marks ? `${st.marks} mark${st.marks == 1 ? '' : 's'}  ` : ''), options: { bold: true, fontSize: 10, color: AMBER } },
        { text: st.name, options: { bold: true, fontSize: 10, breakLine: true } },
        { text: st.bookRef || '', options: { italic: true, fontSize: 8, color: '666666' } },
      ], { fill: 'FFFFFF', valign: 'top', margin: 5 });
    });
  }
  bottomBar(s, REVIEW_OBJ);
}

// ── DOCX constants (match build.js patterns) ──────────────────────────────────
const PAGE_W = 10106;
const B_NONE = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const NO_B   = { top: B_NONE, bottom: B_NONE, left: B_NONE, right: B_NONE };
const NO_TBL_B = Object.assign({}, NO_B, { insideHorizontal: B_NONE, insideVertical: B_NONE });
const bGrey = (sz) => ({ style: BorderStyle.SINGLE, size: sz, color: 'CCCCCC' });
const GREY_TBL = {
  top: bGrey(4), bottom: bGrey(4), left: bGrey(4), right: bGrey(4),
  insideHorizontal: bGrey(4), insideVertical: bGrey(4),
};
const shade = (fill) => ({ type: ShadingType.CLEAR, color: 'auto', fill });

// ── DOCX helpers ──────────────────────────────────────────────────────────────
const P = (children, opts) => new Paragraph(Object.assign(
  { children: Array.isArray(children) ? children : [children] },
  opts || {}
));
const R = (text, opts) => new TextRun(Object.assign({ text: String(text) }, opts || {}));
const spacer = () => new Paragraph({ spacing: { before: 40, after: 40 } });

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

// Navy bar divider (used for topic/side headers)
function divider(text) {
  return [spacer(), fullTable([new TableRow({
    children: [docxCell({
      w: PAGE_W, fill: NAVY, margins: { top: 80, bottom: 80, left: 180, right: 180 },
      children: [P(R(text, { bold: true, size: 22, color: GOLD }))],
    })],
  })], [PAGE_W]), spacer()];
}

// Q number + text — students write in books, no write lines on the worksheet
function docxQuestion(num, text) {
  return P([
    R(`Q${num}  `, { bold: true, size: 20 }),
    R(text || '', { size: 20 }),
  ], { spacing: { before: 60, after: 60 } });
}

// Subtopic header — navy bar, gold heading, italic book ref below (M5)
function subtopicHeader(st) {
  return [spacer(), fullTable([new TableRow({ children: [docxCell({
    w: PAGE_W, fill: NAVY,
    margins: { top: 80, bottom: 80, left: 180, right: 180 },
    children: [
      P(R(`Q${st.questionNumber}: ${st.name}` + (st.marks ? `  (${st.marks} mark${st.marks == 1 ? '' : 's'})` : ''), { bold: true, size: 22, color: GOLD })),
      ...(st.bookRef ? [P(R(st.bookRef, { italic: true, size: 18, color: 'CCCCCC' }))] : []),
    ],
  })]})], [PAGE_W]), spacer()];
}

// Set label — teal inline heading for Set 1/2/3
function setLabel(n) {
  return new Paragraph({
    children: [new TextRun({ text: `Set ${n}`, bold: true, size: 18, color: TEAL })],
    spacing: { before: 80, after: 20 },
  });
}

// ── Worksheet builder ─────────────────────────────────────────────────────────
// Single worksheet: per subtopic, two columns — core (Set 1/2/3) left | extend right
// Workplan 2.11 (2026-10-29): the review table at the front. Each section of the test with its marks
// available (subtopic.marks, read from the paper), a box for the pupil's own mark and an EBI tick, so they
// see where their marks went. Without any marks in the content the column is left out.
function marksTable(subtopics) {
  if (!subtopics.length) return [];
  const withMarks = subtopics.some((st) => st.marks);
  const total = subtopics.reduce((n, st) => n + (Number(st.marks) || 0), 0);
  const cols = withMarks ? [1100, PAGE_W - 1100 - 1500 - 1500 - 1100, 1500, 1500, 1100] : [1100, PAGE_W - 1100 - 1500 - 1100, 1500, 1100];
  const head = withMarks ? ['Question', 'Section', 'Marks available', 'Your marks', 'EBI'] : ['Question', 'Section', 'Your marks', 'EBI'];
  const cell = (t, w, o) => docxCell(Object.assign({ w, borders: { top: bGrey(4), bottom: bGrey(4), left: bGrey(4), right: bGrey(4) }, margins: { top: 50, bottom: 50, left: 90, right: 90 }, children: [P(R(t, Object.assign({ size: 18 }, (o || {}).run)), { alignment: (o || {}).centre ? AlignmentType.CENTER : AlignmentType.LEFT })] }, (o || {}).cell));
  const rows = [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, cols[i], { run: { bold: true, color: GOLD }, cell: { fill: NAVY }, centre: i !== 1 })) })];
  subtopics.forEach((st) => rows.push(new TableRow({ cantSplit: true, children: (withMarks
    ? [String(st.questionNumber || ''), st.name, st.marks ? String(st.marks) : '', '', '']
    : [String(st.questionNumber || ''), st.name, '', '']).map((t, i) => cell(t, cols[i], { centre: i !== 1 })) })));
  if (withMarks && total) rows.push(new TableRow({ cantSplit: true, children: ['', 'Total', String(total), '', ''].map((t, i) => cell(t, cols[i], { run: { bold: true }, centre: i !== 1, cell: { fill: 'F2F2F2' } })) }));
  return [fullTable(rows, cols, GREY_TBL), spacer()];
}

function buildWorksheet(topic, subtopics, coreQuestions, extendQuestions) {
  const VERT_DIV = { style: BorderStyle.SINGLE, size: 3, color: 'DDDDDD' };
  const coreW = Math.floor(PAGE_W * 0.62);
  const extW  = PAGE_W - coreW;

  const children = [
    ...divider(`${topic} TEST REVIEW`),
    P(R('Work through the question sets for your EBI topics. Try the extend questions (right) when done.',
      { italic: true, size: 18, color: '555555' }), { spacing: { after: 60 } }),
    ...marksTable(subtopics),
  ];

  for (const st of subtopics) {
    const qs  = coreQuestions[st.name]   || {};
    const ext = (extendQuestions[st.name] || {}).extend || [];

    children.push(...subtopicHeader(st));

    const coreChildren = [];
    for (let s = 1; s <= 3; s++) {
      const setQs = qs[`set${s}`] || [];
      if (setQs.length) {
        coreChildren.push(setLabel(s));
        setQs.forEach((q, i) => coreChildren.push(docxQuestion(i + 1, q.q)));
      }
    }
    if (!coreChildren.length) coreChildren.push(P(R('None', { size: 18, color: '888888' })));

    const extChildren = [
      new Paragraph({ children: [new TextRun({ text: 'Extend', bold: true, size: 18, color: TEAL })], spacing: { before: 0, after: 20 } }),
    ];
    if (ext.length) {
      ext.forEach((q, i) => extChildren.push(docxQuestion(i + 1, q.q)));
    } else {
      extChildren.push(P(R('None', { size: 18, color: '888888' })));
    }

    children.push(new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      columnWidths: [coreW, extW],
      borders: { ...NO_TBL_B },
      rows: [new TableRow({ children: [
        docxCell({ w: coreW, borders: { ...NO_B, right: VERT_DIV }, margins: { top: 60, bottom: 60, left: 100, right: 120 }, children: coreChildren }),
        docxCell({ w: extW,  borders: { ...NO_B, left: VERT_DIV },  fill: 'F0F7FF', margins: { top: 60, bottom: 60, left: 120, right: 100 }, children: extChildren }),
      ]})],
    }), spacer());
  }

  // M13
  children.push(P(R('If you\'ve finished, put your hand up to help others.',
    { bold: true, italic: true, size: 20, color: TIER_DOCX.mastering }),
    { spacing: { before: 80, after: 60 } }));

  return new Document({ sections: [{ children }] });
}

// ── Drive helpers ─────────────────────────────────────────────────────────────
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

// Duplicate-folder guard: when the macrotopic was inferred (and the inference is a
// guess), a wrong guess used to mkdir a brand-new macrotopic chain next to the real
// one. Prefer, in order: (1) the exact review folder if it already exists anywhere
// under Year/subject, (2) the macrotopic that already holds the preceding lesson,
// (3) the computed path — with a loud note when it would create a new macrotopic.
function resolveDestDir(year, subject, macrotopic, reviewLesson, topic) {
  const primary = driveDestDir(year, subject, macrotopic, reviewLesson, topic);
  if (fs.existsSync(primary)) return { destDir: primary, note: 'already exists — will reuse' };

  const subjDir = path.join(DRIVE_ROOT, `Year ${year}`, subject);
  const normName = s => s.toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const target = normName(`Lesson ${reviewLesson} - ${topic} Review`);
  let macros = [];
  try {
    macros = fs.readdirSync(subjDir, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name);
  } catch (_) { /* Year/subject folder missing — fall through to primary */ }

  const lessonsIn = mac => {
    try {
      return fs.readdirSync(path.join(subjDir, mac), { withFileTypes: true })
        .filter(d => d.isDirectory()).map(d => d.name);
    } catch (_) { return []; }
  };

  // (1) the review folder already exists in another macrotopic — reuse it
  for (const mac of macros) {
    const hit = lessonsIn(mac).find(l => normName(l) === target);
    if (hit) return { destDir: path.join(subjDir, mac, hit), note: `reusing existing folder in "${mac}"` };
  }
  // (2) the preceding lesson lives somewhere — the review belongs beside it
  const prevRe = new RegExp(`^lesson\\s+${reviewLesson - 1}\\b`, 'i');
  for (const mac of macros) {
    if (lessonsIn(mac).some(l => prevRe.test(l))) {
      return {
        destDir: path.join(subjDir, mac, `Lesson ${reviewLesson} - ${topic} Review`),
        note: `placed beside Lesson ${reviewLesson - 1} in "${mac}"`,
      };
    }
  }
  // (3) fall back to the computed path — warn if it means a brand-new macrotopic
  const macExists = fs.existsSync(path.join(subjDir, macrotopic));
  return {
    destDir: primary,
    note: macExists
      ? 'new lesson folder in existing macrotopic'
      : `WARNING: would CREATE a brand-new macrotopic folder "${macrotopic}" — check this is right before confirming`,
  };
}

// ── N1: confirm prompt ────────────────────────────────────────────────────────
function askConfirm(msg) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(msg, (ans) => { rl.close(); resolve(ans.trim().toLowerCase()); });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();

  if (!args.contentFile) {
    console.error([
      'Usage: node references/test-review-lesson.js',
      '  --content <json> --year N --class X --topic T --lesson N',
      '  [--subject Biology] [--macrotopic M] [--output dir]',
      '  [--dry-run] [--classsize N] [--mixed] [--yes]',
      '',
      'Generate content JSON in a Claude Code session, then pass it here.',
    ].join('\n'));
    process.exit(1);
  }

  // Load content JSON
  let content;
  try {
    content = JSON.parse(fs.readFileSync(path.resolve(args.contentFile), 'utf8'));
  } catch (e) {
    console.error('Could not read content JSON: ' + e.message);
    process.exit(1);
  }

  const {
    subtopics       = [],
    doNow           = [],
    coreQuestions   = {},
    extendQuestions = {},
  } = content;

  // Auto-fill textbook page reference on every subtopic that didn't ship one.
  // Feeds subtopicHeader() (worksheet subheadings) + the intro-slide chips.
  // No confident match → left blank (flagged in the preview below).
  for (const st of subtopics) {
    if (!st.bookRef) {
      const m = tb.matchLesson({ year: args.year, subject: args.subject, topic: st.name });
      if (m) st.bookRef = tb.formatRef(m);
    }
  }

  const macrotopic   = args.macrotopic || inferMacrotopic(args.year, args.subject, args.topic);
  const reviewLesson = args.lesson + 1;
  const topicSlug    = args.topic.replace(/\s+/g, '_');
  const { destDir, note: destNote } = resolveDestDir(args.year, args.subject, macrotopic, reviewLesson, args.topic);

  // Class size: context-standing.json → --classsize → default 30 (M11)
  let classSize = args.classSize;
  if (!classSize) {
    try {
      const cs = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'context-standing.json'), 'utf8'));
      classSize = (cs[args.cls] && cs[args.cls].size) || 30;
    } catch (_) {
      classSize = 30;
    }
  }

  // N1: summary — always printed before building
  const missingRefs = subtopics.filter(s => !s.bookRef).map(s => s.name);
  console.log('\n=== BUILD PREVIEW ===');
  console.log(`Topic: ${args.topic}  |  Year ${args.year}  |  Class ${args.cls}  |  Subject: ${args.subject}`);
  console.log(`Review lesson: Lesson ${reviewLesson} - ${args.topic} Review`);
  console.log('\nSubtopics:');
  if (!subtopics.length) {
    console.log('  (none found — check content JSON)');
  } else {
    subtopics.forEach(s => {
      const sets = [1,2,3].map(n => {
        const c = (coreQuestions[s.name] || {})[`set${n}`];
        return c ? c.length : 0;
      });
      const ext = (coreQuestions[s.name] || {}).extend;
      console.log(`  Q${s.questionNumber}: ${s.name}${s.marks ? ' (' + s.marks + ' marks)' : ''}  |  Sets: ${sets.join('/')}  |  Extend: ${ext ? ext.length : 0}  |  ${s.bookRef || '(no book ref)'}`);
    });
  }
  console.log('\nDo Now questions:', doNow.length);
  console.log('Book refs missing:', missingRefs.length ? missingRefs.join(', ') : 'none');
  console.log('\nOutputs:');
  console.log(`  ${topicSlug}_test_review_PTO.pptx`);
  console.log(`  ${topicSlug}_test_review_worksheet.docx`);
  console.log('\nDrive folder (M8):');
  console.log('  ' + destDir);
  console.log('  (' + destNote + ')');

  if (args.dryRun) {
    // N2: dry-run — print only, touch nothing
    console.log('\n[dry-run] No files written.');
    return;
  }

  if (!args.yes) {
    const ans = await askConfirm('\nProceed? (y/n) ');
    if (ans !== 'y') { console.log('Aborted.'); process.exit(0); }
  }

  const outBase = path.join(args.outputDir, topicSlug);

  // PPTX — exactly 4 slides
  console.log('\nBuilding PPTX (4 slides)...');
  const meta  = { topic: args.topic, year: args.year, cls: args.cls, subject: args.subject };
  const pptx  = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.theme  = { headFontFace: FONT, bodyFontFace: FONT };
  slideDoNow(pptx, doNow, meta);                       // slide 1 — Do Now (M7)
  slideDoNowReview(pptx, doNow);                       // slide 2 — answers
  slideVisualiser(pptx);                               // slide 3 — clean (M10)
  slideReviewTaskIntro(pptx, subtopics, args.mixed);   // slide 4 — timer + tiers (M12, M13)
  const pptxPath = outBase + '_test_review_PTO.pptx';
  await pptx.writeFile({ fileName: pptxPath });
  console.log('  ' + path.basename(pptxPath));

  // Worksheet — single doc, two-column layout (core left | extend right)
  console.log('Building worksheet...');
  const wsDocPath = outBase + '_test_review_worksheet.docx';
  fs.writeFileSync(wsDocPath, await Packer.toBuffer(
    buildWorksheet(args.topic, subtopics, coreQuestions, extendQuestions)
  ));
  console.log('  ' + path.basename(wsDocPath));

  // M8: create Drive folder (the only script that creates folders)
  console.log('\nCreating Drive folder...');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log('  Created: ' + destDir);
  } else {
    console.log('  Exists: ' + destDir);
  }

  // M9: copy files into Drive folder
  const copies = [
    { src: pptxPath,  name: path.basename(pptxPath) },
    { src: wsDocPath, name: path.basename(wsDocPath) },
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

// Run as a script; required by the tests, only the builders are used (nothing is written, no Drive folder).
if (require.main === module) main().catch(err => { console.error(err.message || err); process.exit(1); });
else module.exports = { buildWorksheet, marksTable, slideReviewTaskIntro };
