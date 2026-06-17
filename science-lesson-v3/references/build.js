#!/usr/bin/env node
/* ============================================================================
   build.js — FROZEN RENDERER — Science Lesson Skill (Beechen Cliff)
   ============================================================================

   USAGE
     node build.js lesson-content.json [outputDir]

     outputDir defaults to /mnt/user-data/outputs if it exists, else cwd.

   INPUT  — lesson-content.json = JSON ARRAY of 1–N lesson objects (schema per
   SKILL.md). Brief shape:

     [{
       "meta":  { "class","topic","title","lessonType","theme","worksheet",
                  "differentiation":"none|split","annotation":false,
                  "date"?, "visualiserUrl"?, "yearLine"? },
       "title": { "objectives":[".."], "keywords":[".."] },     // optional wrapper
       "doNow": { "variant":"A|B", "questions":[{"q","a","marks"?}] },
       "engage":{ "variant","title"?,"content","prompt"?,"videoLink"?{text,url},
                  "imagePlaceholder":true },
       "learn": [{ "variant":"A|B|C|D", "heading","body","keywords":[],
                   "imagePlaceholder":true,"annotationZone":false,
                   "toWrite":[]?, "corePaper":[{q,pages}]?, "extendPaper":[]?,
                   "instruction"? }],
       "build": [ {"type":"mcq","q","options":[4]|{A..D},"answer":"B",
                   "explanation"?,"commonError"?},
                  {"type":"workedExample","worked":{prompt,steps[]},
                   "yourTurn":{prompt,answer}},
                  {"type":"errorAnalysis","wrongWorking":[],"errorLine":3,
                   "fix","errorType"?},
                  {"type":"graphInterpret","graphLabel","axes":{x,y},
                   "annotationZone"?,"questions":[{q,a,marks}]},
                  {"type":"misconception","claim","whyWrong","truth"},
                  {"type":"practical","intro","steps":[],"warning"?,
                   "questions":[{q,a}]?},
                  {"type":"sort","instruction","items":[],
                   "categories":{A,B},"sorted":{A:[],B:[]}} ],
       "apply": { "variant":"A|B|C"?, "developing":[{q,a,marks,qType,
                  "commonError"?,"starters":[]?,"structure":[]?,"given"?,
                  "unknown"?}], "reaching":[..], "mastering":[..] },
       "review":{ "developing":[{q,a}],"reaching":[..],"mastering":[..] }
                  // OR { "questions":[{q,a}] } — falls back to apply q/a
       "whiteboard": { "rounds":[{ "q","a","subject"? }] },     // whiteboard/revision
       "worksheetExtras": { "wordBank":[]?,"videoQuestions":[]?,
                  "navRows":[{q,topic,section}]?,"links":{developing:"..",..}?,
                  "results":{headers:[],rows:n}?,"intro"? }     // optional
     }]

   OUTPUT — per lesson: [class]_[topic]_[date].pptx and .docx
            (differentiation "split" → ..._developing.docx + ..._reaching-mastering.docx)

   DEPENDENCIES   npm install pptxgenjs docx adm-zip
   (Starfield header: uses references/starfield_header_FINAL.png next to this
    script; regenerates via python3+PIL if missing.)

   This file is FROZEN. Per-build, Claude writes only lesson-content.json.
   ============================================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const PptxGenJS = require('pptxgenjs');
const AdmZip = require('adm-zip');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign,
  LineRuleType, HeightRule, ImageRun,
} = require('docx');

/* ============================== CONSTANTS ================================ */

const SW = 13.33, SH = 7.5;                 // NEVER hardcode other values
const NAV_H = 0.55, ACC_H = 0.04;
const BOT_H = 0.35, BOT_Y = SH - BOT_H;     // 7.15
const TOP = NAV_H + ACC_H + 0.12;           // 0.71 — first element y
const GAP = 0.10, MX = 0.45;
const CW = SW - 2 * MX;                     // content width

const FONT = 'Trebuchet MS';
const NAVY = '0D1B5E', NAVY2 = '152347', DONOW_BAR = '25408D';
const GOLD = 'FABB2E', BG = 'EDF2FA', PURPLE_BG = '4A148C', PURPLE_PEN = '6A0DAD';
const TEAL = '00838F', AMBER = 'E65100', GREEN_OK = '1B5E20';

const STAGE = {
  donow: NAVY, engage: '1B5E20', learn: 'F9A825',
  build: 'E65100', apply: 'B71C1C', review: '1B5E20',
};
const STAGE_LABEL = {
  donow: 'DO NOW', engage: 'ENGAGE', learn: 'LEARN',
  build: 'BUILD', apply: 'APPLY', review: 'REVIEW',
};
const TIER_PPTX = { developing: '2E7D32', reaching: 'E65100', mastering: 'B71C1C' };
const TIER_DOCX = { developing: '1E5C2D', reaching: 'C05A00', mastering: '9B1B1B' };
const TIERS = ['developing', 'reaching', 'mastering'];
const MCQ = {
  A: { badge: 'C2185B', bg: 'FCE4EC' },
  B: { badge: '1565C0', bg: 'E3F2FD' },
  C: { badge: '2E7D32', bg: 'E8F5E9' },
  D: { badge: 'F57F17', bg: 'FFFDE7' },
};

const GOLD2 = { color: GOLD, width: 2 };          // the ONLY content border
const GOLD_DASH = { color: GOLD, width: 1, dashType: 'dash' };

/* ============================== UTILITIES ================================ */

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (s) => String(s || 'lesson').trim().replace(/[^A-Za-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-') || 'lesson';
const today = () => new Date().toISOString().slice(0, 10);
const arr = (x) => (Array.isArray(x) ? x : (x == null ? [] : [x]));
const marksTag = (m) => (m ? `  [${m} ${m > 1 ? 'marks' : 'mark'}]` : '');

function normQ(item, i) {                        // apply/review question → object
  if (typeof item === 'string') {
    return { q: item.replace(/^Q?\d+[.)]?\s+/, ''), a: '', marks: null };
  }
  return Object.assign({ q: '', a: '', marks: null }, item);
}
function mcqOptions(o) {                         // array or {A..D} → {A..D}
  if (Array.isArray(o)) {
    const out = {};
    ['A', 'B', 'C', 'D'].forEach((L, i) => {
      out[L] = String(o[i] == null ? '' : o[i]).replace(/^[A-D][.):]?\s*/i, '');
    });
    return out;
  }
  return o || {};
}

/* =========================================================================
   PPTX RENDERER FUNCTIONS — defined once, called by name everywhere
   ========================================================================= */

function txt(slide, content, o) {
  slide.addText(content, Object.assign({ fontFace: FONT }, o));
}

/* navBar(stage) — 6 equal tabs, TOP strip. Active = stage fill + WHITE text. */
function navBar(slide, stage) {
  const tabs = ['donow', 'engage', 'learn', 'build', 'apply', 'review'];
  const tw = SW / 6;
  tabs.forEach((t, i) => {
    const active = t === stage;
    txt(slide, STAGE_LABEL[t], {
      x: i * tw, y: 0, w: tw, h: NAV_H,
      fill: { color: active ? STAGE[t] : NAVY2 },
      color: 'FFFFFF',                                  // never gold
      bold: active, fontSize: active ? 11 : 10,
      align: 'center', valign: 'middle',
    });
  });
  slide.addShape('rect', { x: 0, y: NAV_H, w: SW, h: ACC_H, fill: { color: GOLD }, line: { type: 'none' } });
}

/* bottomBar(objectiveText) */
function bottomBar(slide, objective) {
  txt(slide, [
    { text: 'Learning objective:  ', options: { bold: true } },
    { text: objective || '', options: { italic: true } },
  ], {
    x: 0, y: BOT_Y, w: SW, h: BOT_H, fill: { color: NAVY },
    color: 'FFFFFF', fontSize: 11, align: 'left', valign: 'middle', margin: 8,
  });
}

/* purplePenBar() */
function purplePenBar(slide, y) {
  txt(slide, '\u261E  Purple pen time \u00B7 mark and correct your answers', {
    x: 0, y, w: SW, h: 0.38, fill: { color: PURPLE_PEN },
    color: 'FFFFFF', bold: true, fontSize: 13, align: 'left', valign: 'middle', margin: 8,
  });
  return y + 0.38 + GAP;
}

/* sectionHeader(text, colour) — returns next y */
function sectionHeader(slide, text, colour, y, runs) {
  txt(slide, runs || text, {
    x: 0, y, w: SW, h: 0.38, fill: { color: colour },
    color: 'FFFFFF', bold: true, fontSize: 13, align: runs ? 'left' : 'center',
    valign: 'middle', margin: 8,
  });
  return y + 0.38 + GAP;
}

/* goldBox(x, y, w, h, content, opts?) — white fill, gold 2pt border */
function goldBox(slide, x, y, w, h, content, opts) {
  const o = opts || {};
  txt(slide, content, {
    x, y, w, h,
    fill: { color: o.fill || 'FFFFFF' },
    line: o.line || GOLD2,
    color: o.color || '1A1A2E',
    fontSize: o.fontSize || 13,
    bold: !!o.bold, italic: !!o.italic,
    align: o.align || 'left', valign: o.valign || 'top',
    margin: o.margin != null ? o.margin : 6,
    fit: o.fit || 'shrink',
    hyperlink: o.hyperlink,
    underline: o.underline,
  });
}

/* navyHeaderBox(x, y, w, headerText, bodyLines[]) — one table shape */
function navyHeaderBox(slide, x, y, w, headerText, bodyLines, bodyH) {
  const border = [{ type: 'solid', pt: 2, color: GOLD }, { type: 'solid', pt: 2, color: GOLD },
                  { type: 'solid', pt: 2, color: GOLD }, { type: 'solid', pt: 2, color: GOLD }];
  const bodyText = arr(bodyLines).map((l, i) => ({
    text: String(l), options: { breakLine: true, paraSpaceAfter: 4 },
  }));
  slide.addTable([
    [{ text: headerText, options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 11, border, valign: 'middle' } }],
    [{ text: bodyText, options: { fill: { color: 'FFFFFF' }, color: '1A1A2E', fontSize: 12, border, valign: 'top' } }],
  ], { x, y, w, colW: [w], rowH: [0.35, Math.max(0.4, (bodyH || 1.2) - 0.35)], fontFace: FONT, margin: 0.06, autoPage: false });
}

/* imagePlaceholder(x, y, w, h) */
function imagePlaceholder(slide, x, y, w, h) {
  txt(slide, '[IMAGE \u00B7 teacher inserts]', {
    x, y, w, h, fill: { color: 'D0D0D0' },
    line: { color: '999999', width: 1, dashType: 'dash' },
    color: '666666', italic: true, fontSize: 11, align: 'center', valign: 'middle',
  });
}

/* annotationZone — dashed gold, "worked live" label. Immovable. */
function annotationZone(slide, x, y, w, h) {
  slide.addShape('rect', { x, y, w: w || 5.5, h: h || 4.0, fill: { color: 'FFFFFF' }, line: GOLD_DASH });
  txt(slide, 'worked live', {
    x: x + 0.05, y: y + 0.03, w: 1.2, h: 0.25,
    color: '9E9E9E', fontSize: 9, align: 'left', valign: 'top',
  });
}

/* tierColumn(x, y, w, h, tier, questions[]) — ONE unified box, text reflows */
function tierColumn(slide, x, y, w, h, tier, questions) {
  txt(slide, tier.toUpperCase(), {
    x, y, w, h: 0.42, fill: { color: TIER_PPTX[tier] },
    color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle',
  });
  const runs = [];
  questions.forEach((q, i) => {
    runs.push({ text: `Q${i + 1}  `, options: { bold: true, fontSize: 12 } });
    runs.push({ text: q.q + marksTag(q.marks), options: { fontSize: 12, breakLine: true, paraSpaceAfter: 8 } });
  });
  txt(slide, runs, {
    x, y: y + 0.42, w, h: h - 0.42, fill: { color: 'FFFFFF' }, line: GOLD2,
    color: '1A1A2E', align: 'left', valign: 'top', margin: 6, fit: 'shrink',
  });
}

/* reviewRow(y, h, tier, questionText, answerText) — tier=null → navy left cell */
function reviewRow(slide, y, h, tier, questionText, answerText, commonError) {
  const leftFill = tier ? TIER_PPTX[tier] : DONOW_BAR;
  const lw = CW * 0.35, rw = CW * 0.65 - 0.08;
  txt(slide, questionText, {
    x: MX, y, w: lw, h, fill: { color: leftFill },
    color: 'FFFFFF', bold: true, fontSize: 12, align: 'left', valign: 'middle',
    margin: 6, fit: 'shrink',
  });
  const runs = [{ text: answerText || '', options: { fontSize: 12, color: NAVY } }];
  if (commonError) {
    runs[0].options.breakLine = true;
    runs.push({ text: 'Common error: ' + commonError, options: { fontSize: 10, italic: true, color: '8A4A00' } });
  }
  txt(slide, runs, {
    x: MX + lw + 0.08, y, w: rw, h, fill: { color: BG }, line: GOLD2,
    align: 'left', valign: 'middle', margin: 6, fit: 'shrink',
  });
}

/* MCQ protocol strip + Do Now silent-entry footer — mandatory routines */
function mcqProtocolStrip(slide, text) {
  txt(slide, text || 'THINK (silent)   \u2192   DECIDE   \u2192   SHOW on 3 \u2013 2 \u2013 1', {
    x: 0, y: BOT_Y - 0.45, w: SW, h: 0.45, fill: { color: NAVY },
    color: 'FFFFFF', fontSize: 14, align: 'center', valign: 'middle',
  });
}
function silentEntryFooter(slide) {
  txt(slide, 'Silent start \u00B7 pen out \u00B7 attempt all questions', {
    x: 0, y: BOT_Y - 0.32, w: SW, h: 0.30,
    color: '616161', fontSize: 12, align: 'center', valign: 'middle',
  });
}

/* =========================================================================
   SLIDE BUILDERS
   ========================================================================= */

function objectiveText(L) {
  const obj = (L.title && L.title.objectives) || L.meta.objectives || [];
  return obj[0] || L.meta.title || L.meta.topic || '';
}

/* ---- TITLE + DO NOW (combined slide — questions always embedded) -------- */
function slideTitleDoNow(pptx, L) {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  navBar(s, 'donow');

  const meta = L.meta, t = L.title || {};
  const objectives = arr(t.objectives).slice(0, 3);
  const keywords = arr(t.keywords);
  const leftW = SW * 0.36 - MX;
  let y = 0.78;

  const title = meta.title || meta.topic || '';
  txt(s, title, {
    x: MX, y, w: leftW, h: 1.15, color: GOLD, bold: true,
    fontSize: title.length > 55 ? 20 : 24, align: 'left', valign: 'top',
    fit: 'shrink', wrap: true,
  });
  y += 1.18;
  txt(s, meta.yearLine || `${meta.class || ''}  \u00B7  ${cap(meta.theme || 'Science')}`, {
    x: MX, y, w: leftW, h: 0.3, color: 'AABBD0', fontSize: 11, align: 'left', valign: 'middle',
  });
  y += 0.38;
  s.addShape('rect', { x: MX, y, w: leftW, h: 0.015, fill: { color: GOLD }, line: { type: 'none' } });
  y += 0.12;
  txt(s, 'Learning Objectives:', { x: MX, y, w: leftW, h: 0.32, color: GOLD, bold: true, fontSize: 15 });
  y += 0.36;
  const loRuns = objectives.map((o, i) => ({
    text: `${i + 1}.  ${o}`, options: { breakLine: true, paraSpaceAfter: 8 },
  }));
  const loH = Math.min(2.2, 0.45 * Math.max(1, objectives.length) + 0.2);
  txt(s, loRuns, { x: MX, y, w: leftW, h: loH, color: 'FFFFFF', fontSize: 14, valign: 'top', fit: 'shrink' });
  y += loH + 0.08;
  s.addShape('rect', { x: MX, y, w: leftW, h: 0.015, fill: { color: GOLD }, line: { type: 'none' } });
  y += 0.12;
  if (keywords.length) {
    txt(s, 'Key Words:', { x: MX, y, w: leftW, h: 0.26, color: 'FFFFFF', bold: true, fontSize: 9 });
    y += 0.27;
    txt(s, keywords.join('  \u00B7  '), {
      x: MX, y, w: leftW, h: Math.max(0.3, BOT_Y - 0.45 - y), color: 'AABBD0', fontSize: 13, valign: 'top', fit: 'shrink',
    });
  }

  // divider
  const divX = SW * 0.36 + 0.08;
  s.addShape('rect', { x: divX, y: 0.78, w: 0.013, h: BOT_Y - 0.45 - 0.78, fill: { color: GOLD }, line: { type: 'none' } });

  // right column — DO NOW
  const rx = divX + 0.18, rw = SW - rx - MX;
  const headerText = (L.doNow && L.doNow.variant === 'B') ? 'DO NOW \u00B7 5 minutes' : 'DO NOW';
  txt(s, headerText, {
    x: rx, y: 0.78, w: rw, h: 0.4, fill: { color: DONOW_BAR },
    color: GOLD, bold: true, fontSize: 15, align: 'center', valign: 'middle',
  });
  const qs = (L.doNow && arr(L.doNow.questions)) || [];
  const top = 0.78 + 0.4 + 0.1, bottom = BOT_Y - 0.40;
  const n = Math.max(qs.length, 4);
  const rowH = (bottom - top - (n - 1) * 0.08) / n;
  qs.concat(Array(Math.max(0, n - qs.length)).fill({ q: '' })).forEach((q, i) => {
    const ry = top + i * (rowH + 0.08);
    s.addShape('ellipse', { x: rx, y: ry + (rowH - 0.38) / 2, w: 0.38, h: 0.38, fill: { color: NAVY }, line: { color: GOLD, width: 1 } });
    txt(s, String(i + 1), {
      x: rx, y: ry + (rowH - 0.38) / 2, w: 0.38, h: 0.38,
      color: GOLD, bold: true, fontSize: 16, align: 'center', valign: 'middle',
    });
    goldBox(s, rx + 0.5, ry, rw - 0.5, rowH, q.q || '', { fill: 'F8F7F0', fontSize: 16, valign: 'middle' });
  });

  silentEntryFooter(s);
  bottomBar(s, objectiveText(L));
}

/* ---- DO NOW ANSWERS ----------------------------------------------------- */
function slideDoNowAnswers(pptx, L) {
  const qs = (L.doNow && arr(L.doNow.questions)) || [];
  if (!qs.length) return;
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  navBar(s, 'donow');
  let y = purplePenBar(s, TOP);
  const bottom = BOT_Y - 0.08;
  const n = qs.length;
  const rowH = (bottom - y - (n - 1) * 0.08) / n;
  qs.forEach((q) => {
    reviewRow(s, y, rowH, null, q.q || '', q.a || '');   // verbatim question, navy left
    y += rowH + 0.08;
  });
  bottomBar(s, objectiveText(L));
}

/* ---- ENGAGE ------------------------------------------------------------- */
const ENGAGE_LABEL = {
  news: 'IN THE NEWS', news_hook: 'IN THE NEWS', prediction: 'MAKE A PREDICTION',
  video: 'WATCH', video_hook: 'WATCH', demo: 'DEMONSTRATION',
  mysteryImage: 'MYSTERY IMAGE', oddOneOut: 'ODD ONE OUT',
};
function slideEngage(pptx, L) {
  const e = L.engage; if (!e) return;
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'engage');
  const heading = e.title || ('ENGAGE \u00B7 ' + (ENGAGE_LABEL[e.variant] || 'HOOK'));
  let y = sectionHeader(s, heading.toUpperCase(), STAGE.engage, TOP);

  const hasImg = e.imagePlaceholder !== false && e.hasImage !== false;
  const body = e.content || e.body || '';
  const promptH = e.prompt ? 0.75 : 0;
  const videoH = e.videoLink ? 0.55 : 0;
  const blockBottom = BOT_Y - 0.08 - (promptH ? promptH + GAP : 0);
  const ctxH = blockBottom - y - (videoH ? videoH + GAP : 0);

  if (hasImg) {
    goldBox(s, MX, y, CW * 0.55, ctxH, body, { italic: true, fontSize: 13, valign: 'top' });
    imagePlaceholder(s, MX + CW * 0.55 + 0.15, y, CW * 0.45 - 0.15, ctxH + videoH + (videoH ? GAP : 0));
  } else {
    goldBox(s, MX, y, CW, ctxH, body, { italic: true, fontSize: 13, valign: 'top' });
  }
  y += ctxH + GAP;
  if (e.videoLink) {
    goldBox(s, MX, y, hasImg ? CW * 0.55 : CW, videoH, [
      { text: '\u25BA  ', options: { color: TEAL, bold: true } },
      { text: e.videoLink.text || 'Watch the video', options: { color: TEAL, underline: true, hyperlink: e.videoLink.url ? { url: e.videoLink.url } : undefined } },
    ], { fontSize: 13, valign: 'middle' });
    y += videoH + GAP;
  }
  if (e.prompt) {
    goldBox(s, MX, BOT_Y - 0.08 - promptH, CW, promptH, e.prompt, { fill: 'FFF8E1', bold: true, fontSize: 14, valign: 'middle' });
  }
  bottomBar(s, objectiveText(L));
}

/* ---- LEARN A–D ----------------------------------------------------------- */
function slideLearn(pptx, L, item) {
  const v = String(item.variant || 'A').toUpperCase();
  const map = { KEY_INFO: 'A', WRITE_IN_BOOK: 'B', REVISION_TABLE: 'C', IMAGE_COPY: 'D' };
  const variant = map[v] || (['A', 'B', 'C', 'D'].includes(v) ? v : 'A');
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'learn');
  const obj = objectiveText(L);

  if (variant === 'A') {
    let y = sectionHeader(s, ('LEARN \u00B7 ' + (item.heading || item.title || L.meta.topic)).toUpperCase(), STAGE.learn, TOP);
    const bodyBottom = BOT_Y - 0.08;
    const leftW = CW * 0.55, rightX = MX + leftW + 0.15, rightW = CW * 0.45 - 0.15;
    const boxes = item.boxes || [{ header: item.heading || 'Key information', items: arr(item.body ? String(item.body).split('\n') : []) }];
    const kw = arr(item.keywords);
    const kwH = kw.length ? 1.0 : 0;
    const stackH = bodyBottom - y - (kwH ? kwH + GAP : 0);
    const each = (stackH - (boxes.length - 1) * GAP) / boxes.length;
    let by = y;
    boxes.slice(0, 2).forEach((b) => {
      navyHeaderBox(s, MX, by, leftW, b.header || 'Key information', arr(b.items), each);
      by += each + GAP;
    });
    if (kw.length) {
      navyHeaderBox(s, MX, bodyBottom - kwH, leftW, 'Key terms:', [kw.join('  \u00B7  ')], kwH);
    }
    if (item.annotationZone) {
      annotationZone(s, rightX, y, rightW, Math.min(4.0, bodyBottom - y));
    } else if (item.imagePlaceholder !== false) {
      imagePlaceholder(s, rightX, y, rightW, bodyBottom - y);
    }
  }

  if (variant === 'B') {
    let y = sectionHeader(s, 'LEARN \u00B7 WRITE IN YOUR BOOK', STAGE.learn, TOP);
    const lines = arr(item.toWrite || (item.body ? String(item.body).split('\n') : []));
    const runs = [{ text: '\u270D  Write in your book:', options: { bold: true, color: AMBER, fontSize: 12, breakLine: true, paraSpaceAfter: 10 } }]
      .concat(lines.map((l) => ({ text: String(l), options: { fontSize: 13, breakLine: true, paraSpaceAfter: 8 } })));
    goldBox(s, MX, y, CW, BOT_Y - 0.08 - y, runs, { fill: 'FFFDE7', valign: 'top' });
  }

  if (variant === 'C') {
    let y = purplePenBar(s, TOP);
    const colW = (CW - 0.2) / 2;
    const mk = (rows, x, title) => {
      const trows = [[{ text: title, options: { fill: { color: GREEN_OK }, color: 'FFFFFF', bold: true, fontSize: 11, align: 'center', colspan: 2 } }],
        [{ text: 'Question', options: { fill: { color: GREEN_OK }, color: 'FFFFFF', bold: true, fontSize: 10 } },
         { text: 'Pages', options: { fill: { color: GREEN_OK }, color: 'FFFFFF', bold: true, fontSize: 10 } }]]
        .concat(arr(rows).map((r, i) => {
          const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
          return [{ text: r.q || '', options: { fill: { color: fill }, fontSize: 10 } },
                  { text: String(r.pages || ''), options: { fill: { color: fill }, fontSize: 10, align: 'center' } }];
        }));
      s.addTable(trows, { x, y, w: colW, colW: [colW * 0.72, colW * 0.28], fontFace: FONT, border: { type: 'solid', pt: 0.5, color: 'BBBBBB' }, margin: 0.04, autoPage: false });
    };
    mk(item.corePaper, MX, 'CORE PAPER');
    mk(item.extendPaper, MX + colW + 0.2, 'EXTEND PAPER');
  }

  if (variant === 'D') {
    let y = sectionHeader(s, ('LEARN \u00B7 ' + (item.heading || item.title || L.meta.topic) + ' (Copy into your book)').toUpperCase(), STAGE.learn, TOP);
    goldBox(s, MX, y, CW, 0.55, '\u261E  ' + (item.instruction || 'Copy this diagram into your book.'), { bold: true, fontSize: 13, valign: 'middle' });
    y += 0.55 + GAP;
    const ih = BOT_Y - 0.08 - y - (item.tip ? 0.35 : 0);
    imagePlaceholder(s, MX + (CW - 5.4) / 2, y, 5.4, ih);
    if (item.tip) {
      txt(s, item.tip, { x: MX, y: BOT_Y - 0.43, w: CW, h: 0.3, fontSize: 10, color: '555555', align: 'center' });
    }
  }
  bottomBar(s, obj);
}

/* ---- BUILD — MCQ (question slide + answer slide) ------------------------- */
function slideMcq(pptx, L, item) {
  const opts = mcqOptions(item.options);
  const obj = objectiveText(L);
  const question = item.q || item.question || '';

  const drawOptions = (s, y, h) => {
    const colW = (CW - 0.15) / 2, rowH = (h - 0.12) / 2;
    ['A', 'B', 'C', 'D'].forEach((Lt, i) => {
      const cx = MX + (i % 2) * (colW + 0.15);
      const cy = y + Math.floor(i / 2) * (rowH + 0.12);
      goldBox(s, cx, cy, colW, rowH, [
        { text: Lt + '   ', options: { bold: true, fontSize: 16, color: MCQ[Lt].badge } },
        { text: opts[Lt] || '', options: { fontSize: 12, color: '24323F' } },
      ], { fill: MCQ[Lt].bg, valign: 'middle' });
    });
  };

  // Question slide
  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 CHECK YOUR UNDERSTANDING', STAGE.build, TOP);
  goldBox(s, MX, y, CW, 1.0, question, { fill: BG, bold: true, fontSize: 14, valign: 'middle' });
  y += 1.0 + 0.08;
  drawOptions(s, y, BOT_Y - 0.45 - 0.1 - y);
  mcqProtocolStrip(s);
  bottomBar(s, obj);

  // Answer slide — CARDS DOWN at left of header bar
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, null, STAGE.build, TOP, [
    { text: 'CARDS DOWN', options: { bold: true, color: GOLD } },
    { text: '   \u00B7   BUILD \u00B7 CHECK YOUR UNDERSTANDING', options: { bold: true, color: 'FFFFFF' } },
  ]);
  goldBox(s, MX, y, CW, 1.0, question, { fill: BG, bold: true, fontSize: 14, valign: 'middle' });
  y += 1.0 + 0.08;
  drawOptions(s, y, 2.6);
  y += 2.6 + 0.08;
  const ansRuns = [
    { text: '\u2713  Answer: ' + (item.answer || '') + '  \u00B7  ', options: { bold: true, fontSize: 12 } },
    { text: item.explanation || '', options: { fontSize: 12 } },
  ];
  if (item.commonError) {
    ansRuns[1].options.breakLine = true;
    ansRuns.push({ text: 'Common error: ' + item.commonError, options: { fontSize: 10, italic: true, color: '8A4A00' } });
  }
  goldBox(s, MX, y, CW, Math.min(1.1, BOT_Y - 0.08 - y), ansRuns, { valign: 'middle' });
  bottomBar(s, obj);
}

/* ---- BUILD — mcq_image --------------------------------------------------- */
function slideMcqImage(pptx, L, item) {
  const opts = mcqOptions(item.options);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 CHECK YOUR UNDERSTANDING', STAGE.build, TOP);
  const leftW = CW * 0.72, rx = MX + leftW + 0.15, rw = CW * 0.28 - 0.15;
  goldBox(s, MX, y, leftW, 0.8, item.q || item.question || '', { fill: BG, bold: true, fontSize: 14, valign: 'middle' });
  imagePlaceholder(s, MX, y + 0.9, leftW, 2.4);
  const optRuns = [];
  ['A', 'B', 'C', 'D'].forEach((Lt) => {
    optRuns.push({ text: Lt + '  ', options: { bold: true, color: MCQ[Lt].badge, fontSize: 13 } });
    optRuns.push({ text: opts[Lt] || '', options: { fontSize: 12, breakLine: true, paraSpaceAfter: 4 } });
  });
  goldBox(s, MX, y + 3.4, leftW, BOT_Y - 0.53 - (y + 3.4), optRuns, { valign: 'top' });
  txt(s, [
    { text: (item.answer || '') + '\n', options: { bold: true, fontSize: 20, color: GOLD, align: 'center', breakLine: true } },
    { text: item.explanation || '', options: { fontSize: 11, color: 'FFFFFF' } },
  ], { x: rx, y, w: rw, h: BOT_Y - 0.53 - y, fill: { color: NAVY }, line: GOLD2, valign: 'middle', align: 'center', margin: 8, fit: 'shrink', fontFace: FONT });
  mcqProtocolStrip(s);
  bottomBar(s, objectiveText(L));
}

/* ---- BUILD — sort (task + answers) --------------------------------------- */
function slideSort(pptx, L, item) {
  const obj = objectiveText(L);
  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 SORT', STAGE.build, TOP);
  txt(s, item.instruction || 'Sort each item into the correct category.', {
    x: MX, y, w: CW, h: 0.35, italic: true, fontSize: 12, color: '333333', valign: 'middle',
  });
  y += 0.4;
  const items = arr(item.items);
  const colW = (CW - 0.15) / 2;
  const rows = Math.ceil(items.length / 2);
  const cellH = Math.min(0.7, (BOT_Y - 0.08 - y - (rows - 1) * 0.1) / rows);
  items.forEach((it, i) => {
    const cx = MX + (i % 2) * (colW + 0.15);
    const cy = y + Math.floor(i / 2) * (cellH + 0.1);
    goldBox(s, cx, cy, colW, cellH, [
      { text: (i + 1) + '   ', options: { bold: true, fontSize: 12, color: AMBER } },
      { text: String(it), options: { fontSize: 12 } },
    ], { valign: 'middle' });
  });
  bottomBar(s, obj);

  // answers
  const cats = item.categories || { A: 'Group A', B: 'Group B' };
  const sorted = item.sorted || {};
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, 'BUILD \u00B7 SORT: ANSWERS', STAGE.build, TOP);
  const keys = Object.keys(cats);
  const cw2 = (CW - 0.15 * (keys.length - 1)) / keys.length;
  keys.forEach((k, ki) => {
    const cx = MX + ki * (cw2 + 0.15);
    txt(s, String(cats[k]).toUpperCase(), {
      x: cx, y, w: cw2, h: 0.42, fill: { color: ki ? AMBER : GREEN_OK },
      color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle',
    });
    const list = arr(sorted[k]);
    const runs = list.map((it) => ({ text: '\u00B7  ' + it, options: { fontSize: 12, breakLine: true, paraSpaceAfter: 6 } }));
    goldBox(s, cx, y + 0.42, cw2, BOT_Y - 0.08 - y - 0.42, runs, { valign: 'top' });
  });
  bottomBar(s, obj);
}

/* ---- BUILD — practical (+ optional Q&A answers slide) -------------------- */
function slidePractical(pptx, L, item) {
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, ('BUILD \u00B7 ' + (item.title || L.meta.topic)).toUpperCase(), STAGE.build, TOP);
  if (item.intro) {
    txt(s, item.intro, { x: MX, y, w: CW, h: 0.4, italic: true, fontSize: 12, color: '333333', valign: 'middle' });
    y += 0.45;
  }
  const steps = arr(item.steps).slice(0, 4);
  const warnH = item.warning ? 0.6 : 0;
  const stepH = (BOT_Y - 0.08 - y - (warnH ? warnH + GAP : 0) - (steps.length - 1) * GAP) / Math.max(1, steps.length);
  steps.forEach((st, i) => {
    txt(s, String(i + 1), {
      x: MX, y: y + (stepH - 0.42) / 2, w: 0.42, h: 0.42,
      fill: { color: AMBER }, color: 'FFFFFF', bold: true, fontSize: 16, align: 'center', valign: 'middle',
    });
    goldBox(s, MX + 0.55, y, CW - 0.55, stepH, String(st), { fontSize: 12, valign: 'middle' });
    y += stepH + GAP;
  });
  if (item.warning) {
    goldBox(s, MX, y, CW, warnH, [
      { text: 'Warning:  ', options: { bold: true, color: 'CC0000', fontSize: 12 } },
      { text: item.warning, options: { fontSize: 12 } },
    ], { fill: 'FFF3F3', line: { color: 'CC0000', width: 3 }, valign: 'middle' });
  }
  bottomBar(s, obj);

  // Build Q&A answers slide (before Visualiser) — only if questions supplied
  const qa = arr(item.questions);
  if (qa.length) {
    const s2 = pptx.addSlide();
    s2.background = { color: BG };
    navBar(s2, 'build');
    let y2 = sectionHeader(s2, 'BUILD \u00B7 PRACTICAL QUESTIONS: ANSWERS', STAGE.build, TOP);
    y2 = purplePenBar(s2, y2 - GAP + 0.02);
    const rowH = (BOT_Y - 0.08 - y2 - (qa.length - 1) * 0.08) / qa.length;
    qa.forEach((q) => {
      reviewRow(s2, y2, rowH, null, q.q || '', q.a || '');
      y2 += rowH + 0.08;
    });
    bottomBar(s2, obj);
  }
}

/* ---- BUILD — misconception ----------------------------------------------- */
function slideMisconception(pptx, L, item) {
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 WHAT PEOPLE GET WRONG', STAGE.build, TOP);
  const x = 0.6, w = SW - 1.2;
  const stripH = 0.45;
  const panelH = (BOT_Y - 0.08 - y - stripH - GAP - 2 * GAP) / 3;

  goldBox(s, x, y, w, panelH, [
    { text: 'THE CLAIM   ', options: { bold: true, fontSize: 12, color: AMBER } },
    { text: '\u201C' + (item.claim || '') + '\u201D', options: { italic: true, fontSize: 20 } },
  ], { line: { color: AMBER, width: 2 }, valign: 'middle' });        // amber border — deliberate
  y += panelH + GAP;
  goldBox(s, x, y, w, panelH, [
    { text: 'WHY IT FEELS TRUE   ', options: { bold: true, fontSize: 12, color: NAVY } },
    { text: item.whyWrong || '', options: { fontSize: 16 } },
  ], { valign: 'middle' });
  y += panelH + GAP;
  goldBox(s, x, y, w, panelH, [
    { text: 'WHAT\u2019S ACTUALLY TRUE   ', options: { bold: true, fontSize: 13, color: GREEN_OK } },
    { text: item.truth || '', options: { fontSize: 17 } },
  ], { valign: 'middle' });
  mcqProtocolStrip(s, 'Hold up A if you believed the claim before today');
  bottomBar(s, objectiveText(L));
}

/* ---- BUILD — workedExample → yourTurn (+ answer slide) -------------------- */
function slideWorkedExample(pptx, L, item) {
  const obj = objectiveText(L);
  const annotate = !!(L.meta && L.meta.annotation);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 WORKED EXAMPLE \u2192 YOUR TURN', STAGE.build, TOP);
  const colW = (SW - 1.8) / 2, x1 = 0.6, x2 = 0.6 + colW + 0.6;
  const worked = item.worked || {}, yourTurn = item.yourTurn || {};

  txt(s, 'WORKED EXAMPLE', { x: x1, y, w: colW, h: 0.38, fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle' });
  txt(s, 'YOUR TURN', { x: x2, y, w: colW, h: 0.38, fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle' });
  y += 0.38 + GAP;
  const promptH = 0.85;
  goldBox(s, x1, y, colW, promptH, worked.prompt || '', { fontSize: 16, valign: 'middle' });
  goldBox(s, x2, y, colW, promptH, yourTurn.prompt || '', { fontSize: 16, valign: 'middle' });
  y += promptH + GAP;
  const panelH = BOT_Y - 0.08 - y;
  if (annotate) {
    annotationZone(s, x1, y, Math.min(5.5, colW), Math.min(4.0, panelH));
    s.addNotes('Worked example steps (work live):\n' + arr(worked.steps).map((st, i) => `${i + 1}. ${st}`).join('\n'));
  } else {
    const runs = arr(worked.steps).map((st, i) => ({
      text: `${i + 1}.  ${st}`, options: { fontSize: 15, breakLine: true, paraSpaceAfter: 8 },
    }));
    goldBox(s, x1, y, colW, panelH, runs, { valign: 'top' });
  }
  slideRect(s, x2, y, colW, panelH);                     // blank matching panel
  bottomBar(s, obj);

  // Dedicated Your Turn answer slide — purple pen
  if (yourTurn.answer) {
    const s2 = pptx.addSlide();
    s2.background = { color: BG };
    navBar(s2, 'build');
    let y2 = sectionHeader(s2, 'BUILD \u00B7 YOUR TURN: ANSWER', STAGE.build, TOP);
    y2 = purplePenBar(s2, y2 - GAP + 0.02);
    const h = BOT_Y - 0.08 - y2;
    reviewRow(s2, y2, h, null, yourTurn.prompt || '', yourTurn.answer || '');
    bottomBar(s2, obj);
  }
}
function slideRect(slide, x, y, w, h) {
  slide.addShape('rect', { x, y, w, h, fill: { color: 'FFFFFF' }, line: GOLD2 });
}

/* ---- BUILD — errorAnalysis (task + answer) -------------------------------- */
function slideErrorAnalysis(pptx, L, item) {
  const obj = objectiveText(L);
  const lines = arr(item.wrongWorking);
  const drawWorking = (s, y, h, highlight) => {
    const runs = lines.map((ln, i) => {
      const isErr = highlight && (i + 1) === item.errorLine;
      return {
        text: `${i + 1}   ${ln}`,
        options: {
          fontSize: 16, breakLine: true, paraSpaceAfter: 10,
          color: isErr ? AMBER : '1A1A2E', underline: !!isErr, bold: !!isErr,
        },
      };
    });
    if (highlight && item.fix) {
      runs.push({ text: '\u2713  ' + item.fix, options: { fontSize: 16, bold: true, color: GREEN_OK, breakLine: true } });
    }
    goldBox(s, MX, y, CW * 0.6, h, runs, { valign: 'top' });
  };

  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 SPOT THE MISTAKE', STAGE.build, TOP);
  const h = BOT_Y - 0.08 - y;
  drawWorking(s, y, h, false);
  const rx = MX + CW * 0.6 + 0.15, rw = CW * 0.4 - 0.15;
  const ph = (h - 2 * GAP) / 3;
  ['Which line?', 'What\u2019s wrong?', 'Write the corrected line.'].forEach((p, i) => {
    goldBox(s, rx, y + i * (ph + GAP), rw, ph, [{ text: p, options: { bold: true, fontSize: 13, breakLine: true } }], { valign: 'top' });
  });
  bottomBar(s, obj);

  // answer slide
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, 'BUILD \u00B7 SPOT THE MISTAKE: ANSWER', STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);
  const h2 = BOT_Y - 0.08 - y;
  drawWorking(s, y, h2, true);
  const ansRuns = [
    { text: 'Error on line ' + (item.errorLine || '?'), options: { bold: true, fontSize: 14, breakLine: true, paraSpaceAfter: 8 } },
  ];
  if (item.errorType) ansRuns.push({ text: 'Error type: ' + item.errorType, options: { fontSize: 13, italic: true, breakLine: true, paraSpaceAfter: 8 } });
  if (item.fix) ansRuns.push({ text: 'Corrected: ' + item.fix, options: { fontSize: 13, color: GREEN_OK, bold: true } });
  goldBox(s, MX + CW * 0.6 + 0.15, y, CW * 0.4 - 0.15, h2, ansRuns, { valign: 'top' });
  bottomBar(s, obj);
}

/* ---- BUILD/APPLY — graphInterpret (question + answer) ---------------------- */
function slideGraphInterpret(pptx, L, item) {
  const obj = objectiveText(L);
  const qs = arr(item.questions).slice(0, 3);

  const drawFrame = (s, y, h) => {
    const fw = CW * 0.55;
    slideRect(s, MX, y, fw, h);
    txt(s, item.graphLabel || 'Graph', { x: MX + 0.1, y: y + 0.05, w: fw - 0.2, h: 0.3, bold: true, fontSize: 12, color: NAVY });
    const ax = MX + 0.65, ay = y + 0.5, aw = fw - 1.0, ah = h - 1.05;
    // axes
    s.addShape('line', { x: ax, y: ay, w: 0, h: ah, line: { color: NAVY, width: 1.5 } });
    s.addShape('line', { x: ax, y: ay + ah, w: aw, h: 0, line: { color: NAVY, width: 1.5 } });
    const axes = item.axes || {};
    txt(s, axes.y || '', { x: MX + 0.06, y: ay, w: 0.55, h: ah, fontSize: 11, color: NAVY, align: 'center', valign: 'middle', fit: 'shrink' });
    txt(s, axes.x || '', { x: ax, y: ay + ah + 0.05, w: aw, h: 0.3, fontSize: 11, color: NAVY, align: 'center' });
    if (item.annotationZone) {
      annotationZone(s, ax + 0.05, ay + 0.05, aw - 0.1, ah - 0.1);
    } else if (item.imagePlaceholder !== false) {
      imagePlaceholder(s, ax + 0.05, ay + 0.05, aw - 0.1, ah - 0.1);
    }
    return MX + fw + 0.15;
  };

  // question slide
  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 READ THE GRAPH', STAGE.build, TOP);
  let h = BOT_Y - 0.08 - y;
  let rx = drawFrame(s, y, h);
  let rw = SW - rx - MX;
  let ph = (h - (qs.length - 1) * GAP) / Math.max(1, qs.length);
  qs.forEach((q, i) => {
    goldBox(s, rx, y + i * (ph + GAP), rw, ph, [
      { text: `Q${i + 1}  `, options: { bold: true, fontSize: 13 } },
      { text: (q.q || '') + marksTag(q.marks), options: { fontSize: 13 } },
    ], { valign: 'top' });
  });
  bottomBar(s, obj);

  // answer slide
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, 'BUILD \u00B7 READ THE GRAPH: ANSWERS', STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);
  h = BOT_Y - 0.08 - y;
  rx = drawFrame(s, y, h);
  rw = SW - rx - MX;
  ph = (h - (qs.length - 1) * GAP) / Math.max(1, qs.length);
  qs.forEach((q, i) => {
    goldBox(s, rx, y + i * (ph + GAP), rw, ph, [
      { text: `Q${i + 1}  `, options: { bold: true, fontSize: 12 } },
      { text: q.q || '', options: { fontSize: 12, breakLine: true, paraSpaceAfter: 4 } },
      { text: q.a || '', options: { fontSize: 12, bold: true, color: GREEN_OK } },
    ], { fill: BG, valign: 'top' });
  });
  bottomBar(s, obj);
}

/* ---- VISUALISER — mandatory in standard + practical ------------------------ */
function slideVisualiser(pptx, L, item) {
  const s = pptx.addSlide();
  s.background = { color: PURPLE_BG };
  navBar(s, 'build');
  const url = (item && item.url) || (L.meta && L.meta.visualiserUrl) || null;
  const subtitle = (item && (item.context || item.subtitle)) || `Model answers under the visualiser \u00B7 ${L.meta.topic || ''}`;
  const heights = [0.9, 0.2, 0.35, 0.25, 0.7, 0.15, 0.3];
  const total = heights.reduce((a, b) => a + b, 0);
  let y = NAV_H + ACC_H + (5.6 - total) / 2;
  txt(s, 'IPEVO Visualiser', { x: 0, y, w: SW, h: 0.9, color: GOLD, bold: true, fontSize: 40, align: 'center', valign: 'middle' });
  y += 0.9 + 0.2;
  txt(s, subtitle, { x: 0, y, w: SW, h: 0.35, color: 'FFFFFF', fontSize: 14, align: 'center', valign: 'middle' });
  y += 0.35 + 0.25;
  const lw = SW * 0.55, lx = (SW - lw) / 2;
  if (url) {
    goldBox(s, lx, y, lw, 0.7, [{ text: url, options: { color: TEAL, fontSize: 16, underline: true, hyperlink: { url } } }],
      { align: 'center', valign: 'middle' });
  } else {
    goldBox(s, lx, y, lw, 0.7, '[Visualiser link \u00B7 teacher inserts]', { color: '666666', italic: true, fontSize: 14, align: 'center', valign: 'middle' });
  }
  y += 0.7 + 0.15;
  txt(s, '\u2191  Click to open', { x: 0, y, w: SW, h: 0.3, color: 'FFFFFF', italic: true, fontSize: 11, align: 'center' });
  bottomBar(s, objectiveText(L));
}

/* ---- APPLY — variants A / B / C -------------------------------------------- */
function pickApplyVariant(apply) {
  if (apply.variant) return String(apply.variant).toUpperCase();
  const all = TIERS.flatMap((t) => arr(apply[t]).map(normQ));
  const mast = arr(apply.mastering).map(normQ);
  if (mast.length === 1 && (mast[0].q || '').length > 160) return 'B';
  if (all.length && all.every((q) => (q.q || '').length <= 90)) return 'C';
  return 'A';
}
function slideApply(pptx, L) {
  const apply = L.apply; if (!apply) return;
  const obj = objectiveText(L);
  const variant = pickApplyVariant(apply);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'apply');
  let y = sectionHeader(s, 'APPLY \u00B7 CHOOSE YOUR LEVEL', STAGE.apply, TOP);
  const bottom = BOT_Y - 0.08;
  const tiers = TIERS.map((t) => ({ t, qs: arr(apply[t]).map(normQ) })).filter((x) => x.qs.length);

  if (variant === 'B') {
    const dev = arr(apply.developing).map(normQ), rea = arr(apply.reaching).map(normQ), mas = arr(apply.mastering).map(normQ);
    const halfH = (bottom - y - GAP) / 2;
    const colW = (CW - 0.15) / 2;
    tierColumn(s, MX, y, colW, halfH, 'developing', dev);
    tierColumn(s, MX + colW + 0.15, y, colW, halfH, 'reaching', rea);
    tierColumn(s, MX, y + halfH + GAP, CW, halfH, 'mastering', mas);
  } else if (variant === 'C') {
    const colW = (CW - 2 * 0.15) / 3;
    const maxRows = Math.max(1, ...tiers.map((x) => x.qs.length));
    const bodyH = bottom - y - 0.42 - 0.06;
    const cardH = (bodyH - (maxRows - 1) * 0.08) / maxRows;
    tiers.forEach((x, ci) => {
      const cx = MX + ci * (colW + 0.15);
      txt(s, x.t.toUpperCase(), { x: cx, y, w: colW, h: 0.42, fill: { color: TIER_PPTX[x.t] }, color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle' });
      x.qs.forEach((q, qi) => {
        goldBox(s, cx, y + 0.42 + 0.06 + qi * (cardH + 0.08), colW, cardH, [
          { text: `Q${qi + 1}  `, options: { bold: true, fontSize: 11 } },
          { text: q.q + marksTag(q.marks), options: { fontSize: 11 } },
        ], { valign: 'middle' });
      });
    });
  } else { // A — unified tier columns
    const colW = (CW - 2 * 0.15) / 3;
    tiers.forEach((x, ci) => {
      tierColumn(s, MX + ci * (colW + 0.15), y, colW, bottom - y, x.t, x.qs);
    });
  }
  bottomBar(s, obj);
}

/* ---- REVIEW — tiered slides, arithmetic height, no dead space --------------- */
function slideReviewTier(pptx, L, tier, questions) {
  if (!questions.length) return;
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'review');
  txt(s, 'Review \u00B7 ' + (tier ? tier.toUpperCase() : 'TODAY\u2019S LEARNING'), {
    x: MX, y: 0.66, w: CW * 0.7, h: 0.35, color: tier ? TIER_PPTX[tier] : NAVY, bold: true, fontSize: 18, valign: 'middle',
  });
  txt(s, `${L.meta.class || ''}  \u00B7  ${cap(L.meta.theme || 'Science')}`, {
    x: MX + CW * 0.7, y: 0.66, w: CW * 0.3, h: 0.35, color: '777777', fontSize: 10, align: 'right', valign: 'middle',
  });
  let y = purplePenBar(s, 1.04);
  const bottom = BOT_Y - 0.08;
  const n = questions.length;
  const rowH = (bottom - y - (n - 1) * 0.06) / n;       // fill the slide — no dead space
  questions.forEach((q) => {
    reviewRow(s, y, rowH, tier, q.q || '', q.a || '', q.commonError);   // verbatim question
    y += rowH + 0.06;
  });
  bottomBar(s, objectiveText(L));
}
function buildReviewSlides(pptx, L) {
  const r = L.review || {};
  const tiered = TIERS.some((t) => arr(r[t]).length);
  if (tiered) {
    TIERS.forEach((t) => slideReviewTier(pptx, L, t, arr(r[t]).map(normQ)));
    return;
  }
  if (arr(r.questions).length) {
    slideReviewTier(pptx, L, null, arr(r.questions).map(normQ));
    return;
  }
  // fall back to apply q/a verbatim
  if (L.apply) {
    TIERS.forEach((t) => {
      const qs = arr(L.apply[t]).map(normQ).filter((q) => q.a);
      slideReviewTier(pptx, L, t, qs);
    });
  }
}

/* ---- WHITEBOARD Q&A rounds --------------------------------------------------- */
function slideWhiteboardRounds(pptx, L) {
  const rounds = arr(L.whiteboard && L.whiteboard.rounds ? L.whiteboard.rounds : L.whiteboard);
  if (!rounds.length) return;
  const obj = objectiveText(L);
  rounds.forEach((r, i) => {
    const head = `${r.subject ? r.subject + ' ' : ''}Round \u00B7 Q${i + 1} of ${rounds.length}`;
    // question slide
    let s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'build');
    let y = sectionHeader(s, head, STAGE.build, TOP);
    goldBox(s, MX, y + 0.4, CW, 2.5, r.q || '', { fill: BG, bold: true, fontSize: 24, align: 'center', valign: 'middle' });
    bottomBar(s, obj);
    // answer slide
    s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'build');
    y = sectionHeader(s, head + ' \u00B7 ANSWER', STAGE.build, TOP);
    goldBox(s, MX, y, CW, 2.0, r.q || '', { fill: BG, bold: true, fontSize: 20, align: 'center', valign: 'middle' });
    goldBox(s, MX, y + 2.0 + GAP, CW, 1.8, r.a || '', { bold: true, fontSize: 15, color: NAVY, align: 'center', valign: 'middle' });
    bottomBar(s, obj);
  });
}

/* ---- PPTX assembly ------------------------------------------------------------ */
async function buildPptx(L, outPath) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';                                  // 13.33 × 7.5
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };

  const type = (L.meta.lessonType || L.meta.type || 'standard').toLowerCase();
  const buildItems = arr(L.build);
  const visItem = buildItems.find((b) => (b.type || b.variant) === 'visualiser');

  slideTitleDoNow(pptx, L);                                     // questions embedded — always
  slideDoNowAnswers(pptx, L);

  if (type === 'standard' || type === 'practical' || type === 'annotation') {
    slideEngage(pptx, L);
    arr(L.learn).slice(0, 2).forEach((it) => slideLearn(pptx, L, it));
    buildItems.forEach((b) => {
      const bt = (b.type || b.variant || 'mcq');
      if (bt === 'mcq') slideMcq(pptx, L, b);
      else if (bt === 'mcq_image') slideMcqImage(pptx, L, b);
      else if (bt === 'sort') slideSort(pptx, L, b);
      else if (bt === 'practical') slidePractical(pptx, L, b);
      else if (bt === 'misconception') slideMisconception(pptx, L, b);
      else if (bt === 'workedExample') slideWorkedExample(pptx, L, b);
      else if (bt === 'errorAnalysis') slideErrorAnalysis(pptx, L, b);
      else if (bt === 'graphInterpret') slideGraphInterpret(pptx, L, b);
      // 'visualiser' handled below
    });
    slideVisualiser(pptx, L, visItem);                          // MANDATORY — never omit
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
  } else if (type === 'revision') {
    arr(L.learn).forEach((it) => slideLearn(pptx, L, it));      // typically Learn-C
    slideWhiteboardRounds(pptx, L);
    if (visItem) slideVisualiser(pptx, L, visItem);
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
  } else if (type === 'whiteboard') {
    slideWhiteboardRounds(pptx, L);
    if (visItem) slideVisualiser(pptx, L, visItem);
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
  } else {
    // unknown type — treat as standard
    slideEngage(pptx, L);
    arr(L.learn).slice(0, 2).forEach((it) => slideLearn(pptx, L, it));
    slideVisualiser(pptx, L, visItem);
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
  }

  await pptx.writeFile({ fileName: outPath });
}

/* =========================================================================
   DOCX COMPONENTS — worksheet-spec.md v2.1
   ========================================================================= */

const PAGE_W = 10106;                                  // content width DXA
const B_NONE = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const NO_B = { top: B_NONE, bottom: B_NONE, left: B_NONE, right: B_NONE };
const NO_TBL_B = Object.assign({}, NO_B, { insideHorizontal: B_NONE, insideVertical: B_NONE });
const bGrey = (sz) => ({ style: BorderStyle.SINGLE, size: sz, color: 'CCCCCC' });
const GREY_TBL = { top: bGrey(4), bottom: bGrey(4), left: bGrey(4), right: bGrey(4), insideHorizontal: bGrey(4), insideVertical: bGrey(4) };
const shade = (fill) => ({ type: ShadingType.CLEAR, color: 'auto', fill });   // only form both renderers respect

const P = (children, opts) => new Paragraph(Object.assign({ children: arr(children) }, opts || {}));
const R = (text, opts) => new TextRun(Object.assign({ text: String(text) }, opts || {}));
const blanks = (n) => Array.from({ length: n }, () => new Paragraph({}));
const spacer = () => new Paragraph({ spacing: { before: 40, after: 40 } });

function fullTable(rows, columnWidths, borders) {
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths, borders: borders || NO_TBL_B, rows,
  });
}
function cell(o) {
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.fill ? shade(o.fill) : undefined,
    borders: o.borders || NO_B,
    margins: o.margins,
    verticalAlign: o.valign || VerticalAlign.CENTER,
    children: o.children,
  });
}

/* divider(text) — full-width navy bar, gold bold */
function divider(text) {
  return [spacer(), fullTable([new TableRow({
    children: [cell({
      w: PAGE_W, fill: NAVY, margins: { top: 80, bottom: 80, left: 180, right: 180 },
      children: [P(R(text, { bold: true, size: 22, color: GOLD }))],
    })],
  })], [PAGE_W]), spacer()];
}

/* tierBadge(tier) — narrow pill, 1800 DXA */
function tierBadge(tier) {
  return [spacer(), new Table({
    width: { size: 1800, type: WidthType.DXA }, columnWidths: [1800], borders: NO_TBL_B,
    rows: [new TableRow({
      children: [cell({
        w: 1800, fill: TIER_DOCX[tier], margins: { top: 40, bottom: 40, left: 140, right: 140 },
        children: [P(R(cap(tier), { bold: true, size: 18, color: 'FFFFFF' }), { alignment: AlignmentType.CENTER })],
      })],
    })],
  }), spacer()];
}

/* wordBank(terms[]) — Developing only; caller enforces */
function wordBank(terms) {
  const runs = [R('Word bank: ', { bold: true, size: 18, color: '1E5C2D' })];
  arr(terms).forEach((t, i) => {
    if (i) runs.push(R(' \u00B7 ', { italic: true, size: 18, color: '1E5C2D' }));
    runs.push(R(t, { italic: true, size: 18, color: '1E5C2D' }));
  });
  return P(runs, { spacing: { before: 60, after: 60 } });
}

/* question(num, text, marks?) (+ optional subParts[]) */
function question(num, text, marks, subParts) {
  const out = [P([
    R(`Q${num}  `, { bold: true, size: 20 }),
    R(text, { size: 20 }),
    ...(marks ? [R(`  [${marks} ${marks > 1 ? 'marks' : 'mark'}]`, { size: 20 })] : []),
  ], { spacing: { before: 60, after: 60 } })];
  arr(subParts).forEach((sp) => {
    out.push(P(R(sp, { size: 20 }), { indent: { left: 360 }, spacing: { before: 40, after: 40 } }));
  });
  return out;
}

/* answerBox(marks) — lines by marks; scale for split-developing (+30%) */
function answerBox(marks, scale) {
  const base = (marks == null || marks <= 1) ? 2 : marks <= 3 ? 5 : 10;
  const n = Math.ceil(base * (scale || 1));
  return [fullTable([new TableRow({
    children: [cell({
      w: PAGE_W, margins: { top: 60, bottom: 60, left: 120, right: 120 },
      borders: { top: bGrey(1), bottom: bGrey(1), left: bGrey(1), right: bGrey(1) },
      valign: VerticalAlign.TOP, children: blanks(n),
    })],
  })], [PAGE_W]), spacer()];
}

/* contextBox(text) */
function contextBox(text) {
  return [spacer(), fullTable([new TableRow({
    children: [
      cell({ w: 120, fill: NAVY, children: [new Paragraph({})] }),
      cell({
        w: 9986, fill: BG, margins: { top: 80, bottom: 80, left: 160, right: 160 },
        children: [P(R(text, { italic: true, size: 20 }))],
      }),
    ],
  })], [120, 9986]), spacer()];
}

/* resultsTable(headers[], rows) — rows: number of blank rows OR array of arrays */
function resultsTable(headers, rows) {
  const n = Math.max(1, headers.length);
  const colW = Array.from({ length: n }, (_, i) => (i === n - 1 ? PAGE_W - Math.floor(PAGE_W / n) * (n - 1) : Math.floor(PAGE_W / n)));
  const head = new TableRow({
    children: headers.map((h, i) => cell({
      w: colW[i], fill: NAVY, borders: GREY_TBL, margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [P(R(h, { bold: true, size: 20, color: 'FFFFFF' }), { alignment: AlignmentType.CENTER })],
    })),
  });
  const bodyRows = [];
  const data = typeof rows === 'number' ? Array.from({ length: rows }, () => null) : arr(rows);
  data.forEach((r) => {
    bodyRows.push(new TableRow({
      children: colW.map((w, i) => cell({
        w, borders: GREY_TBL, margins: { top: 40, bottom: 40, left: 80, right: 80 }, valign: VerticalAlign.TOP,
        children: r ? [P(R(r[i] == null ? '' : r[i], { size: 20 }))] : blanks(3),
      })),
    }));
  });
  return [spacer(), fullTable([head, ...bodyRows], colW, GREY_TBL), spacer()];
}

/* variablesTable() */
function variablesTable() {
  const colW = [3368, 3368, 3370];
  const heads = ['Independent variable', 'Dependent variable', 'Control variables'];
  return [spacer(), fullTable([
    new TableRow({
      children: heads.map((h, i) => cell({
        w: colW[i], fill: NAVY, borders: GREY_TBL, margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [P(R(h, { bold: true, size: 20, color: 'FFFFFF' }), { alignment: AlignmentType.CENTER })],
      })),
    }),
    new TableRow({
      children: colW.map((w) => cell({ w, borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: blanks(3) })),
    }),
  ], colW, GREY_TBL), spacer()];
}

/* guessScaffold(given?, unknown?) — pre-filled G+U for Developing */
function guessScaffold(given, unknown) {
  const colW = [2021, 2021, 2021, 2021, 2022];
  const heads = ['Given', 'Unknown', 'Equation', 'Substitute', 'Solve'];
  const pre = [given, unknown, null, null, null];
  return [spacer(), fullTable([
    new TableRow({
      children: heads.map((h, i) => cell({
        w: colW[i], fill: NAVY, borders: GREY_TBL, margins: { top: 50, bottom: 50, left: 60, right: 60 },
        children: [P(R(h, { bold: true, size: 20, color: GOLD }), { alignment: AlignmentType.CENTER })],
      })),
    }),
    new TableRow({
      children: colW.map((w, i) => cell({
        w, borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: pre[i] ? [P(R(pre[i], { size: 18 })), ...blanks(2)] : blanks(3),
      })),
    }),
  ], colW, GREY_TBL), spacer()];
}

/* structureGuide(lines[]) — italic frames; "(a / b)" options grey */
function structureGuide(lines) {
  return arr(lines).map((l) => {
    const m = String(l).match(/^(.*?)(\([^()]*\/[^()]*\))\s*$/);
    const runs = m
      ? [R(m[1], { italic: true, size: 20 }), R(' ' + m[2], { size: 18, color: '555555' })]
      : [R(l, { italic: true, size: 20 })];
    return P(runs, { indent: { left: 360 }, spacing: { before: 40, after: 40 } });
  });
}

/* sentenceStarters(starters[]) — gold left-border boxes */
function sentenceStarters(starters) {
  const rows = arr(starters).map((st) => new TableRow({
    children: [cell({
      w: PAGE_W, fill: 'FFFDE7',
      borders: { top: B_NONE, bottom: B_NONE, right: B_NONE, left: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
      margins: { top: 40, bottom: 40, left: 200, right: 120 },
      children: [P(R(st, { italic: true, size: 20, color: '555500' }))],
    })],
  }));
  return [spacer(), fullTable(rows, [PAGE_W]), spacer()];
}

/* bookletNavTable(rows[]) — Type C only */
function bookletNavTable(rows) {
  const colW = [1500, 5606, 3000];
  const heads = ['Test Question', 'Topic', 'Booklet Section'];
  const out = [new TableRow({
    children: heads.map((h, i) => cell({
      w: colW[i], fill: NAVY, borders: GREY_TBL, margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [P(R(h, { bold: true, size: 20, color: 'FFFFFF' }), { alignment: AlignmentType.CENTER })],
    })),
  })];
  arr(rows).forEach((r, i) => {
    const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
    const vals = [r.q || r.question || '', r.topic || '', r.section || ''];
    out.push(new TableRow({
      children: vals.map((v, ci) => cell({
        w: colW[ci], fill, borders: GREY_TBL, margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [P(R(v, { size: 18 }))],
      })),
    }));
  });
  return [spacer(), fullTable(out, colW, GREY_TBL), spacer()];
}

/* linksBar(text) — Type C only */
function linksBar(text) {
  return [fullTable([new TableRow({
    children: [cell({
      w: PAGE_W, fill: BG, margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [P(R(text, { italic: true, size: 18, color: NAVY }))],
    })],
  })], [PAGE_W]), spacer()];
}

/* sortTableDocx — grey borders, NOT gold */
function sortTableDocx(categories) {
  const keys = Object.keys(categories || { A: 'Group A', B: 'Group B' });
  const cats = categories || { A: 'Group A', B: 'Group B' };
  const colW = keys.map((_, i) => (i === keys.length - 1 ? PAGE_W - Math.floor(PAGE_W / keys.length) * (keys.length - 1) : Math.floor(PAGE_W / keys.length)));
  return [spacer(), fullTable([
    new TableRow({
      children: keys.map((k, i) => cell({
        w: colW[i], borders: GREY_TBL, margins: { top: 50, bottom: 50, left: 80, right: 80 },
        children: [P(R(cats[k], { bold: true, size: 20 }), { alignment: AlignmentType.CENTER })],
      })),
    }),
    new TableRow({
      children: colW.map((w) => cell({ w, borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: blanks(7) })),
    }),
  ], colW, GREY_TBL), spacer()];
}

/* plain bold section label — for headings outside DO NOW/BUILD/APPLY/RESULTS */
function sectionLabel(text) {
  return P(R(text, { bold: true, size: 22, color: NAVY }), { spacing: { before: 200, after: 80 } });
}

/* ---- Starfield header ------------------------------------------------------- */
const STARFIELD_PY = [
  'import sys, math, random',
  'from PIL import Image, ImageDraw',
  'W,H=1500,120; cx,cy=750,60; scale=330; tilt=0.22; arms=3',
  'wipe_rx,wipe_ry=349,76',
  'img=Image.new("RGB",(W,H),(13,27,94))',
  'd=ImageDraw.Draw(img)',
  'rng=random.Random(92)',
  'for a in range(arms):',
  '    base=a*2*math.pi/arms',
  '    for i in range(260):',
  '        t=rng.uniform(0.05,1.0); ang=base+t*4.2+rng.gauss(0,0.12)',
  '        r=scale*t**0.8',
  '        x=cx+r*math.cos(ang); y=cy+r*math.sin(ang)*tilt',
  '        if ((x-cx)/wipe_rx)**2+((y-cy)/wipe_ry)**2 < 0.06: continue',
  '        if 0<=x<W and 0<=y<H:',
  '            b=rng.randint(120,255); s=rng.choice([1,1,1,2])',
  '            d.ellipse([x,y,x+s,y+s],fill=(b,b,min(255,b+20)))',
  'rng2=random.Random(3)',
  'for i in range(220):',
  '    x=rng2.uniform(0,W); y=rng2.uniform(0,H)',
  '    b=rng2.randint(90,255); s=rng2.choice([1,1,2])',
  '    d.ellipse([x,y,x+s,y+s],fill=(b,b,min(255,b+25)))',
  'img.save(sys.argv[1])',
].join('\n');

function getStarfield() {
  const candidates = [
    path.join(__dirname, 'starfield_header_FINAL.png'),
    path.join(__dirname, 'references', 'starfield_header_FINAL.png'),
    path.join(os.tmpdir(), 'starfield_header_FINAL.png'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  // regenerate — files do not persist between sessions
  const out = candidates[2];
  const py = path.join(os.tmpdir(), 'gen_starfield_tmp.py');
  try {
    fs.writeFileSync(py, STARFIELD_PY);
    cp.execSync(`python3 ${JSON.stringify(py)} ${JSON.stringify(out)}`, { stdio: 'pipe' });
    if (fs.existsSync(out)) return out;
  } catch (e) {
    console.warn('  ! starfield generation failed (' + e.message.split('\n')[0] + ') — header image omitted');
  }
  return null;
}

function worksheetHeader(L) {
  const out = [];
  const sf = getStarfield();
  if (sf) {
    out.push(new Paragraph({
      children: [new ImageRun({ data: fs.readFileSync(sf), transformation: { width: 674, height: 54 }, type: 'png' })],
      spacing: { after: 120 },
    }));
  }
  // topic only — never class name, never Name/Class/Date
  out.push(P(R(L.meta.title || L.meta.topic || '', { bold: true, size: 36, color: NAVY }), { spacing: { after: 160 } }));
  return out;
}

/* =========================================================================
   WORKSHEET ASSEMBLY — types A–H, split differentiation
   ========================================================================= */

function mcqInline(opts) {
  const o = mcqOptions(opts);
  return '  (A ' + o.A + '  /  B ' + o.B + '  /  C ' + o.C + '  /  D ' + o.D + ')';
}

/* derive printable Build questions from build items */
function buildQuestionBlocks(L, state) {
  const out = [];
  arr(L.build).forEach((b) => {
    const bt = b.type || b.variant;
    if (bt === 'mcq' || bt === 'mcq_image') {
      out.push(...question(++state.n, (b.q || b.question || '') + mcqInline(b.options)));
    } else if (bt === 'sort') {
      out.push(...question(++state.n, (b.instruction || 'Sort each item into the correct category.') +
        '  Items: ' + arr(b.items).join(', ') + '.'));
      out.push(...sortTableDocx(b.categories));
    } else if (bt === 'workedExample' && b.yourTurn && b.yourTurn.prompt) {
      out.push(...question(++state.n, b.yourTurn.prompt));
    } else if (bt === 'errorAnalysis') {
      out.push(...question(++state.n, 'Spot the mistake in this working, then write the corrected line:'));
      arr(b.wrongWorking).forEach((ln, i) => {
        out.push(P([R(`${i + 1}   `, { bold: true, size: 20 }), R(ln, { size: 20 })], { indent: { left: 360 }, spacing: { before: 30, after: 30 } }));
      });
    } else if (bt === 'graphInterpret') {
      arr(b.questions).forEach((q) => out.push(...question(++state.n, q.q, q.marks)));
    } else if (bt === 'misconception') {
      out.push(...question(++state.n, 'A student says: \u201C' + (b.claim || '') + '\u201D  Explain why this is wrong.'));
    }
    // practical handled by Type E; visualiser has no worksheet output
  });
  return out;
}

/* one Apply tier section */
function applyTierSection(L, tier, mode, opts) {
  const o = opts || {};
  const qs = arr(L.apply && L.apply[tier]).map(normQ);
  if (!qs.length) return [];
  const out = [...tierBadge(tier)];
  const wx = L.worksheetExtras || {};
  const isDev = tier === 'developing' || mode === 'developing';
  const bank = wx.wordBank || arr((L.title || {}).keywords);

  // word bank: Developing tier only; split-developing forces it on every tier
  if (((tier === 'developing' && wx.wordBank) || (mode === 'developing' && bank.length)) && bank.length > 2) {
    out.push(wordBank(bank));
  }
  if (o.links && o.links[tier]) out.push(...linksBar(o.links[tier]));

  qs.forEach((q, i) => {
    out.push(...question(i + 1, q.q, o.marks ? q.marks : null, q.subParts));
    const calc = (q.qType || '').toLowerCase() === 'calculation';
    if ((mode === 'developing' && calc) || q.guess) {
      out.push(...guessScaffold(mode === 'developing' ? q.given : null, mode === 'developing' ? q.unknown : null));
    }
    if (q.structure) out.push(...structureGuide(q.structure));
    // sentence starters: explicit per-question, Mastering 6-marker exception, or forced in split-developing
    const starterOk = q.starters && (mode === 'developing' || (tier === 'mastering' && (q.marks || 0) >= 6) || q.forceStarters);
    if (starterOk) out.push(...sentenceStarters(q.starters));
    if (o.boxes && q.marks) out.push(...answerBox(q.marks, mode === 'developing' ? 1.3 : 1));
  });
  return out;
}

function buildWorksheetChildren(L, mode) {
  const type = String(L.meta.worksheet || 'A').toUpperCase();
  const wx = L.worksheetExtras || {};
  const ch = [...worksheetHeader(L)];
  const bstate = { n: 0 };
  const doNowQs = arr(L.doNow && L.doNow.questions);

  const doNowSection = () => {
    if (!doNowQs.length) return;
    ch.push(...divider('DO NOW'));
    doNowQs.forEach((q, i) => ch.push(...question(i + 1, q.q || '')));
  };
  const buildSection = () => {
    const blocks = buildQuestionBlocks(L, bstate);
    if (!blocks.length) return;
    ch.push(...divider('BUILD'));
    ch.push(...blocks);
  };
  const applySection = (o) => {
    if (!L.apply) return;
    ch.push(...divider('APPLY'));
    TIERS.forEach((t) => ch.push(...applyTierSection(L, t, mode, o || {})));
  };

  if (type === 'B') {                                    // exam practice
    if (wx.intro) ch.push(...contextBox(wx.intro));
    applySection({ marks: true, boxes: true });
  } else if (type === 'C') {                             // post-test review booklet
    if (arr(wx.navRows).length) ch.push(...bookletNavTable(wx.navRows));
    applySection({ marks: true, boxes: true, links: wx.links || {} });
  } else if (type === 'D') {                             // multi-topic revision grid
    const all = TIERS.flatMap((t) => arr(L.apply && L.apply[t]).map(normQ));
    const colW = [5053, 5053];
    const rows = [];
    for (let i = 0; i < all.length; i += 2) {
      rows.push(new TableRow({
        children: [0, 1].map((j) => {
          const q = all[i + j];
          return cell({
            w: colW[j], borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: q ? [
              P(R(`Q${i + j + 1}`, { bold: true, size: 20, color: GOLD }), { shading: shade(NAVY), spacing: { after: 60 } }),
              P(R(q.q, { size: 20 })),
              ...blanks(4),
            ] : [new Paragraph({})],
          });
        }),
      }));
    }
    if (rows.length) { ch.push(...spacerWrap(fullTable(rows, colW, GREY_TBL))); }
  } else if (type === 'E') {                             // practical
    const prac = arr(L.build).find((b) => (b.type || b.variant) === 'practical') || {};
    if (wx.intro || prac.intro) ch.push(...contextBox(wx.intro || prac.intro));
    if (arr(prac.steps).length) {
      ch.push(sectionLabel('Method'));
      arr(prac.steps).forEach((st, i) => ch.push(P([R(`${i + 1}.  `, { bold: true, size: 20 }), R(st, { size: 20 })], { spacing: { before: 40, after: 40 } })));
    }
    ch.push(sectionLabel('Variables'));
    ch.push(...variablesTable());
    ch.push(...divider('RESULTS'));
    const res = wx.results || {};
    ch.push(...resultsTable(res.headers || ['', '', ''], res.rows == null ? 5 : res.rows));
    applySection({});                                    // conclusion questions — write in books
  } else if (type === 'G') {                             // video companion
    if (arr(wx.videoQuestions).length) {
      ch.push(sectionLabel('Video questions'));
      arr(wx.videoQuestions).forEach((q, i) => ch.push(...question(i + 1, q)));
    }
    applySection({});
  } else if (type === 'H') {                             // cover / independent
    doNowSection();
    buildSection();
    applySection({ marks: true, boxes: true });
  } else if (type === 'F') {                             // general revision — question bank
    applySection({ marks: true });
  } else {                                               // A — lesson companion (default)
    doNowSection();
    buildSection();
    applySection({});
  }
  return ch;
}
function spacerWrap(tbl) { return [spacer(), tbl, spacer()]; }

async function buildDocx(L, outPath, mode) {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Libre Baskerville', size: 20 },
          paragraph: { spacing: { line: 240, lineRule: LineRuleType.AUTO } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 720, bottom: 720, left: 900, right: 900 },
        },
      },
      children: buildWorksheetChildren(L, mode),
    }],
  });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buf);

  // MANDATORY post-process — Google Docs / LibreOffice shading compatibility
  const zip = new AdmZip(outPath);
  const entry = zip.getEntry('word/document.xml');
  if (entry) {
    let xml = zip.readAsText(entry);
    xml = xml.replace(/(<w:shd\b[^>]*w:val=")solid(")/g, '$1clear$2');
    zip.updateFile(entry, Buffer.from(xml, 'utf8'));
    zip.writeZip(outPath);
  }
}

/* =========================================================================
   MAIN
   ========================================================================= */

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node build.js lesson-content.json [outputDir]');
    process.exit(1);
  }
  let lessons;
  try {
    lessons = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    console.error('Cannot read/parse ' + jsonPath + ': ' + e.message);
    process.exit(1);
  }
  if (!Array.isArray(lessons)) lessons = [lessons];

  const outDir = process.argv[3] ||
    (fs.existsSync('/mnt/user-data/outputs') ? '/mnt/user-data/outputs' : process.cwd());
  fs.mkdirSync(outDir, { recursive: true });

  let ok = 0, fail = 0;
  for (let i = 0; i < lessons.length; i++) {
    const L = lessons[i];
    const label = (L && L.meta && (L.meta.class + ' / ' + L.meta.topic)) || ('lesson #' + (i + 1));
    try {
      if (!L || !L.meta) throw new Error('lesson is missing "meta"');
      const base = `${L.meta.class || 'class'}_${slug(L.meta.topic || L.meta.title)}_${L.meta.date || today()}`;
      const pptxPath = path.join(outDir, base + '.pptx');
      await buildPptx(L, pptxPath);
      console.log('  \u2713 ' + path.basename(pptxPath));

      const split = String(L.meta.differentiation || 'none').toLowerCase() === 'split';
      if (split) {
        // two worksheets, same content, same titles, same layout family
        const p1 = path.join(outDir, base + '_developing.docx');
        const p2 = path.join(outDir, base + '_reaching-mastering.docx');
        await buildDocx(L, p1, 'developing');
        await buildDocx(L, p2, 'standard');
        console.log('  \u2713 ' + path.basename(p1));
        console.log('  \u2713 ' + path.basename(p2));
      } else {
        const p = path.join(outDir, base + '.docx');
        await buildDocx(L, p, 'standard');
        console.log('  \u2713 ' + path.basename(p));
      }
      ok++;
    } catch (e) {
      fail++;
      console.error('  \u2717 FAILED: ' + label + ' \u00B7 ' + e.message);
      if (process.env.BUILD_DEBUG) console.error(e.stack);
    }
  }
  console.log(`\nDone. ${ok} lesson(s) built, ${fail} failed. Output: ${outDir}`);
  if (fail && !ok) process.exit(2);
}

main().catch((e) => { console.error(e); process.exit(2); });
