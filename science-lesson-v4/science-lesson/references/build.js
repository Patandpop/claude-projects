#!/usr/bin/env node
/* ============================================================================
   build.js — FROZEN RENDERER — Science Lesson Skill (Beechen Cliff)
   ============================================================================

   USAGE
     node build.js lesson-content.json [output-dir]

     Output dir priority:
       1. meta.outputDir (explicit override in content JSON)
       2. [output-dir] CLI argument
       3. /mnt/user-data/outputs  (claude.ai sandbox — auto-detected)
       4. current working directory

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

   OUTPUT — per lesson (always 3 files):
            [base].pptx · [base]_worksheet.docx · [base]_support_worksheet.docx

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

/* flattenText — extract plain string from runs array or plain string */
function flattenText(t) {
  if (typeof t === 'string') return t;
  if (Array.isArray(t)) return t.map((r) => (typeof r === 'string' ? r : r.text || '')).join('');
  return String(t || '');
}

/* autoFontSize — largest font size that fits text in a box of w×h inches.
   Model: Trebuchet MS ~120 char·pt per inch of width; line height 1.4× font size.
   Always pair with fit:'shrink' as a fallback for estimation error. */
function autoFontSize(text, w, h, { min = 10, max = 28, linesHint } = {}) {
  const s = flattenText(text).trim();
  if (!s) return max;
  for (let fs = max; fs >= min; fs--) {
    const cpl = Math.max(1, Math.floor((w * 120) / fs));
    const n = linesHint != null ? linesHint : Math.ceil(s.length / cpl);
    if ((n * fs * 1.4) / 72 <= h * 0.85) return fs;
  }
  return min;
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

/* imagePlaceholder(x, y, w, h, description?) */
function imagePlaceholder(slide, x, y, w, h, description) {
  // Always prefer a concrete suggestion of WHAT to insert. The generic fallback
  // still asks for a specific thing rather than the bare "teacher inserts".
  const label = description
    ? `[IMAGE: ${description}]`
    : '[IMAGE \u2014 suggest: a labelled photo or diagram illustrating this concept]';
  txt(slide, label, {
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
  const allQText = questions.map((q, i) => `Q${i + 1}  ${q.q}${marksTag(q.marks)}`).join(' ');
  const colFs = autoFontSize(allQText, w, h - 0.42, { min: 10, max: 18 });
  const runs = [];
  questions.forEach((q, i) => {
    runs.push({ text: `Q${i + 1}  `, options: { bold: true, fontSize: colFs } });
    runs.push({ text: q.q + marksTag(q.marks), options: { fontSize: colFs, breakLine: true, paraSpaceAfter: 8 } });
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
  const qFs = autoFontSize(questionText, lw, h, { min: 12, max: 28 });
  txt(slide, questionText, {
    x: MX, y, w: lw, h, fill: { color: leftFill },
    color: 'FFFFFF', bold: true, fontSize: qFs, align: 'left', valign: 'middle',
    margin: 6, fit: 'shrink',
  });
  const aFs = autoFontSize(answerText, rw, h, { min: 12, max: 24 });
  const runs = [{ text: answerText || '', options: { fontSize: aFs, color: NAVY } }];
  if (commonError) {
    runs[0].options.breakLine = true;
    runs.push({ text: 'Common error: ' + commonError, options: { fontSize: Math.min(14, aFs), italic: true, color: '8A4A00' } });
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


/* strip a duplicate stage prefix from authored headings ("LEARN — X" → "X") */
function stripStage(h, stage) {
  h = String(h || '').replace(/_/g, ' ');
  return h.replace(new RegExp('^\\s*' + stage + '\\s*[\\u00B7\\u2014\\u2013:-]\\s*', 'i'), '');
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
    x: MX, y, w: leftW, h: 1.45, color: GOLD, bold: true,
    fontSize: title.length > 45 ? 26 : 32, align: 'left', valign: 'top',
    fit: 'shrink', wrap: true,
  });
  y += 1.5;
  txt(s, meta.yearLine || `${meta.class || ''}  \u00B7  ${cap(meta.theme || 'Science')}`, {
    x: MX, y, w: leftW, h: 0.3, color: 'AABBD0', fontSize: 12, align: 'left', valign: 'middle',
  });
  y += 0.42;
  // Learning objectives — boxed, larger text
  const loRuns = [{ text: 'Learning Objectives:', options: { bold: true, color: GOLD, fontSize: 15, breakLine: true, paraSpaceAfter: 8 } }]
    .concat(objectives.map((o, i) => ({
      text: `${i + 1}.  ${o}`, options: { color: 'FFFFFF', fontSize: 14, breakLine: true, paraSpaceAfter: 8 },
    })));
  const kwH = keywords.length ? 1.05 : 0;
  const loH = BOT_Y - 0.45 - y - (kwH ? kwH + 0.12 : 0);
  goldBox(s, MX, y, leftW, loH, loRuns, { fill: '152347', valign: 'top' });
  y += loH + 0.12;
  if (keywords.length) {
    goldBox(s, MX, y, leftW, kwH, [
      { text: 'Key Words:', options: { bold: true, color: GOLD, fontSize: 13, breakLine: true, paraSpaceAfter: 6 } },
      { text: keywords.join('  \u00B7  '), options: { color: 'FFFFFF', fontSize: 13 } },
    ], { fill: '152347', valign: 'top' });
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
    s.addShape('roundRect', { x: rx, y: ry + (rowH - 0.42) / 2, w: 0.42, h: 0.42, rectRadius: 0.05, fill: { color: GOLD }, line: { type: 'none' } });
    txt(s, String(i + 1), {
      x: rx, y: ry + (rowH - 0.42) / 2, w: 0.42, h: 0.42,
      color: NAVY, bold: true, fontSize: 18, align: 'center', valign: 'middle',
    });
    goldBox(s, rx + 0.55, ry, rw - 0.55, rowH, q.q || '', { fill: 'F8F7F0', fontSize: 19, valign: 'middle' });
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
  const heading = e.title ? ('ENGAGE \u00B7 ' + stripStage(e.title, 'ENGAGE')) : ('ENGAGE \u00B7 ' + (ENGAGE_LABEL[e.variant] || 'HOOK'));
  let y = sectionHeader(s, heading.toUpperCase(), STAGE.engage, TOP);

  // imagePlaceholder wins when explicitly set; falls back to hasImage when imagePlaceholder is absent
  const hasImg = e.imagePlaceholder != null ? (e.imagePlaceholder !== false) : (e.hasImage !== false);
  const body = e.content || e.body || '';
  const promptH = e.prompt ? 0.75 : 0;
  const videoH = e.videoLink ? 0.55 : 0;
  const blockBottom = BOT_Y - 0.08 - (promptH ? promptH + GAP : 0);
  const ctxH = blockBottom - y - (videoH ? videoH + GAP : 0);

  // e.hook: short punchy statement (stat, quote, big question) rendered large at the top.
  // Separates focal element from supporting context so the slide never looks empty.
  const hook = e.hook || null;
  const leftW = CW * 0.55;

  if (hasImg) {
    if (hook) {
      const hookH = Math.min(1.0, ctxH * 0.35);
      goldBox(s, MX, y, leftW, hookH, hook, { bold: true, fontSize: autoFontSize(hook, leftW, hookH, { min: 14, max: 30 }), valign: 'middle', fill: 'FFFDE7', align: 'center' });
      if (body) goldBox(s, MX, y + hookH + GAP, leftW, ctxH - hookH - GAP, body, { italic: true, fontSize: autoFontSize(body, leftW, ctxH - hookH - GAP, { min: 11, max: 20 }), valign: 'top' });
    } else {
      goldBox(s, MX, y, leftW, ctxH, body, { italic: true, fontSize: autoFontSize(body, leftW, ctxH, { min: 11, max: 20 }), valign: 'top' });
    }
    // imageConfidence: 'search' means a real image should already be embedded upstream
    // (image_search run, Wikimedia/clearly-licensed source) before this build step —
    // build.js itself does not call image_search. 'described' (or unset) renders the
    // placeholder with e.imageDescription so the description is never lost/blank.
    if (e.imageConfidence === 'search' && e.embeddedImagePath) {
      s.addImage({ path: e.embeddedImagePath, x: MX + leftW + 0.15, y, w: CW * 0.45 - 0.15, h: ctxH + videoH + (videoH ? GAP : 0) });
    } else {
      imagePlaceholder(s, MX + leftW + 0.15, y, CW * 0.45 - 0.15, ctxH + videoH + (videoH ? GAP : 0), e.imageDescription);
    }
  } else {
    // No image: hook (large, prominent) + body below — or body alone at larger/centred size.
    // Prevents the single-flat-paragraph-in-a-huge-box layout that looks visually empty.
    if (hook) {
      const hookH = Math.min(1.3, ctxH * 0.32);
      goldBox(s, MX, y, CW, hookH, hook, { bold: true, fontSize: autoFontSize(hook, CW, hookH, { min: 14, max: 32 }), valign: 'middle', fill: 'FFFDE7', align: 'center' });
      if (body) goldBox(s, MX, y + hookH + GAP, CW, ctxH - hookH - GAP, body, { italic: true, fontSize: autoFontSize(body, CW, ctxH - hookH - GAP, { min: 11, max: 22 }), valign: 'top' });
    } else {
      goldBox(s, MX, y, CW, ctxH, body, { italic: true, fontSize: autoFontSize(body, CW, ctxH, { min: 11, max: 24 }), valign: 'middle' });
    }
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
  const map = { KEY_INFO: 'A', WRITE_IN_BOOK: 'B', REVISION_TABLE: 'C', IMAGE_COPY: 'D', COMPARISON_TABLE: 'E', EQUATION_CALLOUT: 'F' };
  const variant = map[v] || (['A', 'B', 'C', 'D', 'E', 'F'].includes(v) ? v : 'A');
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'learn');
  const obj = objectiveText(L);

  if (variant === 'A') {
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
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
    const boxH = BOT_Y - 0.08 - y;
    const lineFs = autoFontSize(lines.join(' '), CW, boxH, { min: 12, max: 22, linesHint: lines.length + 1 });
    const runs = [{ text: '\u270D  Write in your book:', options: { bold: true, color: AMBER, fontSize: Math.max(12, lineFs - 2), breakLine: true, paraSpaceAfter: 10 } }]
      .concat(lines.map((l) => ({ text: String(l), options: { fontSize: lineFs, breakLine: true, paraSpaceAfter: 8 } })));
    goldBox(s, MX, y, CW, boxH, runs, { fill: 'FFFDE7', valign: 'top' });
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
    mk(item.extendPaper, MX + colW + 0.2, 'CHALLENGE PAPER');
  }

  if (variant === 'D') {
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN') + ' (Copy into your book)').toUpperCase(), STAGE.learn, TOP);
    goldBox(s, MX, y, CW, 0.55, '\u261E  ' + (item.instruction || 'Copy this diagram into your book.'), { bold: true, fontSize: 13, valign: 'middle' });
    y += 0.55 + GAP;
    const ih = BOT_Y - 0.08 - y - (item.tip ? 0.35 : 0);
    imagePlaceholder(s, MX + (CW - 5.4) / 2, y, 5.4, ih);
    if (item.tip) {
      txt(s, item.tip, { x: MX, y: BOT_Y - 0.43, w: CW, h: 0.3, fontSize: 10, color: '555555', align: 'center' });
    }
  }

  if (variant === 'E') {
    // Comparison table \u2014 two-column contrast layout.
    // Use for: series vs parallel, mitosis vs meiosis, speed vs velocity, acids vs alkalis, etc.
    // Schema: item.comparison = { aTitle, bTitle, rows: [{a, b}] }
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const cmp = item.comparison || {};
    const aTitle = String(cmp.aTitle || 'A').toUpperCase();
    const bTitle = String(cmp.bTitle || 'B').toUpperCase();
    const cmpRows = arr(cmp.rows);
    const headerH = 0.42;
    const colW = (CW - 0.15) / 2;
    txt(s, aTitle, { x: MX, y, w: colW, h: headerH, fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle' });
    txt(s, bTitle, { x: MX + colW + 0.15, y, w: colW, h: headerH, fill: { color: STAGE.build }, color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle' });
    y += headerH + 0.06;
    const cmpAvail = BOT_Y - 0.08 - y - (cmpRows.length - 1) * 0.06;
    // Fill the slide like Do Now: floor keeps many-row tables legible, generous
    // ceiling lets a 2-3 row comparison expand instead of leaving the bottom empty.
    const rowH = Math.max(0.7, Math.min(1.8, cmpAvail / Math.max(1, cmpRows.length)));
    const cmpBlockH = cmpRows.length * rowH + (cmpRows.length - 1) * 0.06;
    let cy = y + Math.max(0, (cmpAvail - cmpBlockH) / 2);
    cmpRows.forEach((r, i) => {
      const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
      goldBox(s, MX, cy, colW, rowH, String(r.a || ''), { fill, fontSize: 14, valign: 'middle' });
      goldBox(s, MX + colW + 0.15, cy, colW, rowH, String(r.b || ''), { fill, fontSize: 14, valign: 'middle' });
      cy += rowH + 0.06;
    });
  }

  if (variant === 'F') {
    // Equation callout \u2014 large equation box + per-component breakdown + optional rearrangements.
    // Use for any lesson introducing a new equation (V=IR, F=ma, E=Pt, etc.).
    // Schema: item.equation, item.components=[{symbol,name,unit}], item.rearrangements?[], item.example?
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const eqH = 1.0;
    txt(s, item.equation || '', {
      x: MX, y, w: CW, h: eqH, fill: { color: '152347' }, line: GOLD2,
      color: GOLD, bold: true, fontSize: 28, align: 'center', valign: 'middle',
    });
    y += eqH + GAP;
    const comps = arr(item.components);
    if (comps.length) {
      const compW = (CW - (comps.length - 1) * 0.12) / comps.length;
      const compH = 1.05;
      comps.forEach((c, i) => {
        const cx = MX + i * (compW + 0.12);
        goldBox(s, cx, y, compW, compH, [
          { text: String(c.symbol || ''), options: { bold: true, fontSize: 20, color: GOLD, breakLine: true } },
          { text: String(c.name || ''), options: { fontSize: 13, color: 'FFFFFF', breakLine: true } },
          { text: String(c.unit || ''), options: { fontSize: 11, italic: true, color: 'AABBD0' } },
        ], { fill: '152347', valign: 'middle', align: 'center' });
      });
      y += compH + GAP;
    }
    const rears = arr(item.rearrangements);
    if (rears.length) {
      const rearH = 0.65;
      const rearW = (CW - (rears.length - 1) * 0.12) / rears.length;
      rears.forEach((r, i) => {
        goldBox(s, MX + i * (rearW + 0.12), y, rearW, rearH, String(r), { bold: true, fontSize: 16, align: 'center', valign: 'middle', fill: BG });
      });
      y += rearH + GAP;
    }
    if (item.example) {
      const expH = BOT_Y - 0.08 - y;
      if (expH > 0.3) {
        const exFs = autoFontSize('Example:  ' + item.example, CW, expH, { min: 12, max: 22 });
        goldBox(s, MX, y, CW, expH, [
          { text: 'Example:  ', options: { bold: true, fontSize: exFs, color: NAVY } },
          { text: item.example, options: { fontSize: exFs } },
        ], { valign: 'top' });
      }
    }
  }

  bottomBar(s, obj);
}

/* ---- BUILD — MCQ (SINGLE slide — answer at bottom, teacher animates reveal) */
function slideMcq(pptx, L, item) {
  const opts = mcqOptions(item.options);
  const obj = objectiveText(L);
  const question = item.q || item.question || '';

  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 CHECK YOUR UNDERSTANDING', STAGE.build, TOP);
  goldBox(s, MX, y, CW, 0.9, question, { fill: BG, bold: true, fontSize: 14, valign: 'middle' });
  y += 0.9 + 0.08;

  // protocol strip + answer box reserve space at the bottom
  const stripH = 0.4, ansH = item.commonError ? 1.15 : 0.85;
  const optH = BOT_Y - 0.08 - y - stripH - ansH - 2 * GAP;
  const colW = (CW - 0.15) / 2, rowH = (optH - 0.12) / 2;
  ['A', 'B', 'C', 'D'].forEach((Lt, i) => {
    const cx = MX + (i % 2) * (colW + 0.15);
    const cy = y + Math.floor(i / 2) * (rowH + 0.12);
    goldBox(s, cx, cy, colW, rowH, [
      { text: Lt + '   ', options: { bold: true, fontSize: 16, color: MCQ[Lt].badge } },
      { text: opts[Lt] || '', options: { fontSize: 12, color: '24323F' } },
    ], { fill: MCQ[Lt].bg, valign: 'middle' });
  });
  y += optH + GAP;
  txt(s, 'THINK (silent)   \u2192   DECIDE   \u2192   SHOW on 3 \u2013 2 \u2013 1', {
    x: MX, y, w: CW, h: stripH, fill: { color: NAVY },
    color: 'FFFFFF', fontSize: 13, align: 'center', valign: 'middle',
  });
  y += stripH + GAP;
  // Answer box — teacher adds entrance animation in PowerPoint to reveal after countdown
  const ansRuns = [
    { text: '\u2713  Answer: ' + (item.answer || '') + '  \u00B7  ', options: { bold: true, fontSize: 12 } },
    { text: item.explanation || '', options: { fontSize: 12 } },
  ];
  if (item.commonError) {
    ansRuns[1].options.breakLine = true;
    ansRuns.push({ text: 'Common error: ' + item.commonError, options: { fontSize: 10, italic: true, color: '8A4A00' } });
  }
  goldBox(s, MX, y, CW, ansH, ansRuns, { valign: 'middle' });
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
/* ---- BUILD — trueFalse (+ answer slide) ----------------------------------- */
function slideTrueFalse(pptx, L, item) {
  const obj = objectiveText(L);
  const statements = arr(item.statements);
  const RED = 'B71C1C';
  const respW = 0.9;

  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 TRUE OR FALSE', STAGE.build, TOP);
  const footH = 0.4;
  const rows = statements.length;
  const gapTotal = (rows - 1) * GAP;
  const avail = BOT_Y - 0.08 - y - footH - GAP - gapTotal;
  // Fill available height like the Do Now slide: rows expand to use the space.
  // Floor keeps long lists legible; high ceiling lets short lists fill the slide
  // instead of leaving a dead zone underneath (the Do Now pattern, not the old 1.3 cap).
  const rowH = Math.max(0.7, Math.min(1.9, avail / rows));
  // Centre the block when it does not fill the slide so leftover space is shared.
  const blockH = rows * rowH + gapTotal;
  const ty = y + Math.max(0, (avail - blockH) / 2);
  statements.forEach((st, i) => {
    const ry = ty + i * (rowH + GAP);
    // Alternating warm tint gives rhythm instead of a stack of identical white boxes.
    const tint = i % 2 ? 'FFF8E1' : 'FFFFFF';
    goldBox(s, MX, ry, CW - respW - 0.15, rowH, [
      { text: (i + 1) + '   ', options: { bold: true, fontSize: 16, color: AMBER } },
      { text: String(st.text || ''), options: { fontSize: 15 } },
    ], { valign: 'middle', fill: tint });
    txt(s, 'T  /  F', {
      x: MX + CW - respW, y: ry, w: respW, h: rowH,
      fill: { color: NAVY }, line: GOLD2, color: 'FFFFFF',
      bold: true, fontSize: 15, align: 'center', valign: 'middle',
    });
  });
  y = ty + rows * rowH + gapTotal + GAP;
  txt(s, 'Decide T or F for each \u2014 be ready to justify on 3-2-1', {
    x: MX, y, w: CW, h: footH, fill: { color: NAVY },
    color: 'FFFFFF', bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  bottomBar(s, obj);

  // answer slide
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, 'BUILD \u00B7 TRUE OR FALSE: ANSWERS', STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);
  const ansAvail = BOT_Y - 0.08 - y - gapTotal;
  const rowH2 = Math.max(0.7, Math.min(1.8, ansAvail / rows));
  const ansBlockH = rows * rowH2 + gapTotal;
  const ay = y + Math.max(0, (ansAvail - ansBlockH) / 2);
  statements.forEach((st, i) => {
    const ry = ay + i * (rowH2 + GAP);
    const isTrue = !!st.isTrue;
    // Colour-coded verdict tint lets the teacher read true/false split at a glance
    // (hinge-question principle: the check is only useful if go/no-go is visible fast).
    const verdictTint = isTrue ? 'E8F5E9' : 'FFEBEE';
    const runs = [
      { text: (i + 1) + '   ', options: { bold: true, fontSize: 15, color: AMBER } },
      { text: String(st.text || '') + '   ', options: { fontSize: 14 } },
      { text: isTrue ? '\u2713 TRUE' : '\u2717 FALSE', options: { bold: true, fontSize: 15, color: isTrue ? GREEN_OK : RED } },
    ];
    if (!isTrue && st.correction) {
      runs.push({ text: '  \u2014  ' + st.correction, options: { fontSize: 13, italic: true, color: '333333', breakLine: false } });
    }
    goldBox(s, MX, ry, CW, rowH2, runs, { valign: 'middle', fill: verdictTint });
  });
  bottomBar(s, obj);
}

/* ---- BUILD — sort (two slides) -------------------------------------------- */
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
  let y = sectionHeader(s, ('BUILD \u00B7 ' + stripStage(item.title || L.meta.topic, 'BUILD')).toUpperCase(), STAGE.build, TOP);
  if (item.intro) {
    txt(s, item.intro, { x: MX, y, w: CW, h: 0.4, italic: true, fontSize: 12, color: '333333', valign: 'middle' });
    y += 0.45;
  }
  const steps = arr(item.steps).slice(0, 4);
  const warnH = item.warning ? 0.6 : 0;
  // steps in left ~56%, apparatus/circuit image placeholder fills the right
  const hasImg = item.imagePlaceholder !== false;
  const stepsW = hasImg ? CW * 0.56 : CW;
  const imgX = MX + stepsW + 0.15, imgW = CW - stepsW - 0.15;
  if (hasImg) imagePlaceholder(s, imgX, y, imgW, BOT_Y - 0.08 - y);
  const stepH = (BOT_Y - 0.08 - y - (warnH ? warnH + GAP : 0) - (steps.length - 1) * GAP) / Math.max(1, steps.length);
  steps.forEach((st, i) => {
    txt(s, String(i + 1), {
      x: MX, y: y + (stepH - 0.42) / 2, w: 0.42, h: 0.42,
      fill: { color: AMBER }, color: 'FFFFFF', bold: true, fontSize: 16, align: 'center', valign: 'middle',
    });
    goldBox(s, MX + 0.55, y, stepsW - 0.55, stepH, String(st), { fontSize: 12, valign: 'middle' });
    y += stepH + GAP;
  });
  if (item.warning) {
    goldBox(s, MX, y, stepsW, warnH, [
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
  goldBox(s, x1, y, colW, promptH, worked.prompt || '', { fontSize: autoFontSize(worked.prompt, colW, promptH, { min: 12, max: 24 }), valign: 'middle' });
  goldBox(s, x2, y, colW, promptH, yourTurn.prompt || '', { fontSize: autoFontSize(yourTurn.prompt, colW, promptH, { min: 12, max: 24 }), valign: 'middle' });
  y += promptH + GAP;
  const panelH = BOT_Y - 0.08 - y;
  if (annotate) {
    annotationZone(s, x1, y, Math.min(5.5, colW), Math.min(4.0, panelH));
    s.addNotes('Worked example steps (work live):\n' + arr(worked.steps).map((st, i) => `${i + 1}. ${st}`).join('\n'));
  } else {
    const allSteps = arr(worked.steps).join(' ');
    const stepFs = autoFontSize(allSteps, colW, panelH, { min: 11, max: 20, linesHint: arr(worked.steps).length });
    const runs = arr(worked.steps).map((st, i) => ({
      text: `${i + 1}.  ${st}`, options: { fontSize: stepFs, breakLine: true, paraSpaceAfter: 8 },
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
  // Working on the left, wider now that the prompts no longer hog 40% of the slide.
  drawWorking(s, y, h, false);
  const rx = MX + CW * 0.6 + 0.15, rw = CW * 0.4 - 0.15;
  // Compact instruction strip instead of three oversized empty prompt boxes.
  const stripH = 0.95;
  goldBox(s, rx, y, rw, stripH, [
    { text: 'Your task:', options: { bold: true, fontSize: 13, color: AMBER, breakLine: true, paraSpaceAfter: 4 } },
    { text: '1  Which line is wrong?', options: { fontSize: 12, breakLine: true } },
    { text: '2  Why is it wrong?', options: { fontSize: 12, breakLine: true } },
    { text: '3  Write the corrected line.', options: { fontSize: 12 } },
  ], { valign: 'top', fill: 'FFFDE7' });
  // The freed space becomes a real working zone students write into.
  const workZoneY = y + stripH + GAP;
  goldBox(s, rx, workZoneY, rw, h - stripH - GAP, [
    { text: 'Write your answer here', options: { italic: true, fontSize: 11, color: '999999' } },
  ], { valign: 'top', fill: 'FFFFFF' });
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
  const url = (item && item.url) || (L.meta && L.meta.visualiserUrl) || 'https://apps.ipevo.com/pwa/visualizer.app/';
  const subtitle = (item && (item.context || item.subtitle)) || `Model answers under the visualiser \u00B7 ${String(L.meta.topic || '').replace(/_/g, ' ')}`;
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
  const mast = arr(apply.mastering).map(normQ);
  if (mast.length === 1 && (mast[0].q || '').length > 160) return 'B';
  return 'A'; // default: individual question boxes — never silently fall to the unified-box layout (C)
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
  } else if (variant === 'A') { // A — individual question boxes, three tiers across (DEFAULT, per-question gold boxes)
    const colW = (CW - 2 * 0.15) / 3;
    const maxRows = Math.max(1, ...tiers.map((x) => x.qs.length));
    const bodyH = bottom - y - 0.42 - 0.06;
    const cardH = (bodyH - (maxRows - 1) * 0.08) / maxRows;
    tiers.forEach((x, ci) => {
      const cx = MX + ci * (colW + 0.15);
      txt(s, x.t.toUpperCase(), { x: cx, y, w: colW, h: 0.42, fill: { color: TIER_PPTX[x.t] }, color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle' });
      x.qs.forEach((q, qi) => {
        const qFs = autoFontSize(q.q, colW, cardH, { min: 10, max: 22 });
        goldBox(s, cx, y + 0.42 + 0.06 + qi * (cardH + 0.08), colW, cardH, [
          { text: `Q${qi + 1}  `, options: { bold: true, fontSize: qFs } },
          { text: q.q + marksTag(q.marks), options: { fontSize: qFs } },
        ], { valign: 'middle' });
      });
    });
  } else { // C — unified tier columns (revision/whiteboard only; NEVER the silent default)
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

/* ---- BUILD — predictThenCheck (two slides) ---------------------------------- */
// Best diagnostic value of any non-MCQ check: students commit their mental model
// BEFORE the reveal, exposing reasoning gaps rather than just recall failures.
// Use instead of MCQ when the lesson's key idea involves a mechanism students
// often mispredict (e.g. forces, energy transfer, rates of reaction).
// Schema: { type:"predictThenCheck", setup, prediction, reveal, explanation, commonError? }
function slidePredictThenCheck(pptx, L, item) {
  const obj = objectiveText(L);

  // --- Slide 1: Predict ---
  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD · MAKE A PREDICTION', STAGE.build, TOP);

  if (item.setup) {
    goldBox(s, MX, y, CW, 0.75, item.setup, { italic: true, fontSize: 13, fill: 'FFFDE7', valign: 'middle' });
    y += 0.75 + GAP;
  }

  const predH = 1.3;
  txt(s, item.prediction || 'What do you predict?', {
    x: MX, y, w: CW, h: predH,
    fill: { color: AMBER }, color: 'FFFFFF',
    bold: true, fontSize: 22, align: 'center', valign: 'middle', margin: 12,
  });
  y += predH + GAP;

  const noteH = BOT_Y - 0.08 - y - 0.45 - GAP;
  if (noteH > 0.3) {
    goldBox(s, MX, y, CW, noteH, [
      { text: '✍  ', options: { fontSize: 18, color: AMBER } },
      { text: 'Write your prediction in your book now.', options: { fontSize: 14, italic: true, color: '555555' } },
    ], { fill: 'FFFDE7', valign: 'middle', align: 'center' });
    y += noteH + GAP;
  }

  txt(s, 'Commit your prediction before seeing the answer', {
    x: MX, y, w: CW, h: 0.45,
    fill: { color: NAVY }, color: 'FFFFFF',
    bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  bottomBar(s, obj);

  // --- Slide 2: Check ---
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, 'BUILD · CHECK YOUR PREDICTION', STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);

  const colW = (CW - 0.2) / 2;
  const hdrH = 0.38, resH = 1.4;

  txt(s, 'YOUR PREDICTION', {
    x: MX, y, w: colW, h: hdrH,
    fill: { color: AMBER }, color: 'FFFFFF', bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  goldBox(s, MX, y + hdrH, colW, resH, item.prediction || '', { italic: true, fontSize: 14, valign: 'middle' });

  const rx = MX + colW + 0.2;
  txt(s, 'WHAT ACTUALLY HAPPENS', {
    x: rx, y, w: colW, h: hdrH,
    fill: { color: GREEN_OK }, color: 'FFFFFF', bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  goldBox(s, rx, y + hdrH, colW, resH, item.reveal || '', { bold: true, fontSize: 14, color: GREEN_OK, valign: 'middle' });

  y += hdrH + resH + GAP;

  if (item.explanation) {
    const expH = BOT_Y - 0.08 - y - (item.commonError ? 0.45 + GAP : 0);
    if (expH > 0.2) {
      goldBox(s, MX, y, CW, expH, [
        { text: 'WHY:  ', options: { bold: true, fontSize: 13, color: NAVY } },
        { text: item.explanation, options: { fontSize: 13 } },
      ], { valign: 'middle' });
      y += expH + GAP;
    }
  }
  if (item.commonError) {
    goldBox(s, MX, y, CW, 0.45, [
      { text: 'Common error:  ', options: { bold: true, fontSize: 11, italic: true, color: '8A4A00' } },
      { text: item.commonError, options: { fontSize: 11, italic: true, color: '8A4A00' } },
    ], { valign: 'middle' });
  }
  bottomBar(s, obj);
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
      else if (bt === 'trueFalse') slideTrueFalse(pptx, L, b);
      else if (bt === 'practical') slidePractical(pptx, L, b);
      else if (bt === 'misconception') slideMisconception(pptx, L, b);
      else if (bt === 'workedExample') slideWorkedExample(pptx, L, b);
      else if (bt === 'errorAnalysis') slideErrorAnalysis(pptx, L, b);
      else if (bt === 'graphInterpret') slideGraphInterpret(pptx, L, b);
      else if (bt === 'predictThenCheck' || bt === 'predict_then_check') slidePredictThenCheck(pptx, L, b);
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
const blanks = (n) => Array.from({ length: n }, () => new Paragraph({ spacing: { before: 0, after: 0 } }));
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

/* diagramBox(label?, lines?) — framed space for a circuit/apparatus diagram.
   Teacher pastes the image in, or students draw. Worksheets must carry the
   diagrams the questions refer to — never strip them out. */
function diagramBox(label, lines) {
  const n = lines || 8;
  const kids = [P(R(label || '[Diagram \u2014 teacher inserts]', { italic: true, size: 18, color: '777777' }), { alignment: AlignmentType.CENTER })]
    .concat(blanks(n));
  return [spacer(), fullTable([new TableRow({
    children: [cell({
      w: PAGE_W, margins: { top: 80, bottom: 80, left: 120, right: 120 },
      borders: { top: bGrey(2), bottom: bGrey(2), left: bGrey(2), right: bGrey(2) },
      valign: VerticalAlign.TOP, children: kids,
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

/* guessScaffold(mode, vals?) — mode: 'full' | 'backward-fade' | 'blank'
   'full': Given + Unknown pre-filled (vals.given, vals.unknown), rest blank — Developing.
   'backward-fade': Given/Unknown/Equation/Substitute pre-filled (vals.given, vals.unknown,
     vals.equation, vals.substitute), only Solve blank — Reaching on new_procedure, or any
     tier's genuine first exposure to a procedure this unit.
   'blank': entire row blank — known_procedure once a tier has already seen it worked.
   Back-compat: guessScaffold(given, unknown) (two string args, no mode) behaves as 'full'. */
function guessScaffold(mode, vals) {
  let pre;
  if (typeof mode !== 'string') {
    // legacy call: guessScaffold(given, unknown)
    pre = [mode, vals, null, null, null];
  } else if (mode === 'backward-fade') {
    vals = vals || {};
    pre = [vals.given, vals.unknown, vals.equation, vals.substitute, null];
  } else if (mode === 'blank') {
    pre = [null, null, null, null, null];
  } else {
    // 'full' (default)
    vals = vals || {};
    pre = [vals.given, vals.unknown, null, null, null];
  }
  const colW = [2021, 2021, 2021, 2021, 2022];
  const heads = ['Given', 'Unknown', 'Equation', 'Substitute', 'Solve'];
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

/* clozeDocx(sentences[]) — gap-fill. Each sentence is a string with one or more
   "____" markers; rendered with an underlined blank space at each gap so students
   write a single word rather than copying a whole sentence. Pairs with a wordBank.
   For students who struggle with handwriting: minimises writing load. */
function clozeDocx(sentences) {
  return arr(sentences).map((sentence, i) => {
    const parts = String(sentence).split(/_{2,}/);
    const runs = [R(`${i + 1}.  `, { bold: true, size: 20 })];
    parts.forEach((part, j) => {
      if (part) runs.push(R(part, { size: 20 }));
      if (j < parts.length - 1) runs.push(R('\u2002__________\u2002', { size: 20, underline: {} }));
    });
    return P(runs, { spacing: { before: 80, after: 80 } });
  });
}

/* definitionTable(terms[]) — two-column: term on the left, ruled write-space on the
   right for the definition. For students who struggle with handwriting, the space is
   ON the sheet so they don't copy the term into a book first. terms: [{term, hint?}] */
function definitionTable(terms) {
  const colW = [3000, PAGE_W - 3000];
  const rows = [new TableRow({
    children: [
      cell({ w: colW[0], fill: NAVY, borders: GREY_TBL, margins: { top: 50, bottom: 50, left: 100, right: 100 }, children: [P(R('Key term', { bold: true, size: 20, color: 'FFFFFF' }))] }),
      cell({ w: colW[1], fill: NAVY, borders: GREY_TBL, margins: { top: 50, bottom: 50, left: 100, right: 100 }, children: [P(R('What it means (write your definition here)', { bold: true, size: 20, color: 'FFFFFF' }))] }),
    ],
  })];
  arr(terms).forEach((t, i) => {
    const term = typeof t === 'string' ? t : (t.term || '');
    const hint = (typeof t === 'object' && t.hint) ? t.hint : null;
    const leftKids = [P(R(term, { bold: true, size: 20 }))];
    if (hint) leftKids.push(P(R(hint, { italic: true, size: 16, color: '777777' })));
    rows.push(new TableRow({
      children: [
        cell({ w: colW[0], fill: i % 2 ? 'F5F5F5' : 'FFFFFF', borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: leftKids }),
        cell({ w: colW[1], fill: i % 2 ? 'F5F5F5' : 'FFFFFF', borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: blanks(2) }),
      ],
    }));
  });
  return [spacer(), fullTable(rows, colW, GREY_TBL), spacer()];
}

/* writeLines(n) — n ruled blank lines for a short written answer directly on the
   sheet. Lighter than answerBox; used where students need to write ON the sheet
   (handwriting support). Uses a bordered table row per line for reliable rendering. */
function writeLines(n) {
  const count = n || 2;
  const rows = Array.from({ length: count }, () => new TableRow({
    height: { value: 340, rule: HeightRule.ATLEAST },
    children: [cell({
      w: PAGE_W,
      borders: { top: B_NONE, left: B_NONE, right: B_NONE, bottom: bGrey(4) },
      margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: [P(R('', { size: 20 }))],
    })],
  }));
  return [fullTable(rows, [PAGE_W]), spacer()];
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
function buildQuestionBlocks(L, state, mode) {
  const out = [];
  const scaffolded = mode === 'developing';
  arr(L.build).forEach((b) => {
    const bt = b.type || b.variant;
    if (bt === 'mcq' || bt === 'mcq_image') {
      // MCQs are run as a whole-class check (vote on 3-2-1), not written on the worksheet — skip.
      return;
    } else if (bt === 'sort') {
      out.push(...question(++state.n, (b.instruction || 'Sort each item into the correct category.') +
        '  Items: ' + arr(b.items).join(', ') + '.'));
      out.push(...sortTableDocx(b.categories));
    } else if (bt === 'trueFalse') {
      out.push(...question(++state.n, 'For each statement, write True or False. If False, correct it.'));
      arr(b.statements).forEach((st, i) => {
        out.push(P([R(`${i + 1}   `, { bold: true, size: 20 }), R(st.text || '', { size: 20 }), R('   (True / False)', { size: 18, italic: true, color: '666666' })], { indent: { left: 360 }, spacing: { before: 30, after: 30 } }));
        // scaffolded sheet: a ruled line to write the correction ON the sheet (handwriting support)
        if (scaffolded) out.push(...writeLines(1));
      });
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
    } else if (bt === 'predictThenCheck' || bt === 'predict_then_check') {
      const pq = (b.setup ? b.setup + '  ' : '') + (b.prediction || 'What do you predict will happen?');
      out.push(...question(++state.n, pq));
      out.push(P(R('Write your prediction:', { italic: true, size: 18, color: '555555' }), { indent: { left: 360 }, spacing: { before: 20, after: 10 } }));
      out.push(...writeLines(2));
      if (b.reveal) {
        out.push(P(R('What actually happens:', { bold: true, size: 18, color: '1B5E20' }), { indent: { left: 360 }, spacing: { before: 20, after: 10 } }));
        out.push(P(R(b.reveal, { italic: true, size: 18, color: '1B5E20' }), { indent: { left: 720 }, spacing: { before: 0, after: 30 } }));
      }
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

  // word bank: Developing tier only; split-developing forces it — but only ONCE (on the
  // first tier rendered) rather than repeating identically above every tier.
  const showBank = ((tier === 'developing' && wx.wordBank) || (mode === 'developing' && bank.length)) && bank.length > 2;
  if (showBank && tier === 'developing') {
    out.push(wordBank(bank));
  }
  if (o.links && o.links[tier]) out.push(...linksBar(o.links[tier]));

  qs.forEach((q, i) => {
    out.push(...question(i + 1, q.q, o.marks ? q.marks : null, q.subParts));
    if (q.diagram) out.push(...diagramBox(typeof q.diagram === 'string' ? q.diagram : null, q.diagramLines || 8));
    const calc = (q.qType || '').toLowerCase() === 'calculation';
    // support mode: equation and units hint printed above the GUESS scaffold
    if (mode === 'developing' && calc && (q.equationHint || q.equation)) {
      const eqHint = q.equationHint || q.equation;
      const unitsStr = q.units ? '  Give your answer in ' + q.units + '.' : '';
      out.push(P(R('Use: ' + eqHint + unitsStr, { italic: true, size: 18, color: NAVY }), { indent: { left: 360 }, spacing: { before: 20, after: 10 } }));
    }
    if ((calc || q.guess)) {
      // contentType: 'new_procedure' | 'known_procedure' — defaults to known_procedure if unset
      const contentType = q.contentType || 'known_procedure';
      const isReaching = tier === 'reaching';
      const isMastering = tier === 'mastering';
      let scaffoldMode;
      if (contentType === 'new_procedure') {
        // first exposure: every tier gets backward-fade, not a separate worked example
        scaffoldMode = (mode === 'developing' || tier === 'developing') ? 'full' : 'backward-fade';
      } else {
        // known_procedure
        if (mode === 'developing' || tier === 'developing') scaffoldMode = q.repetitionCount >= 3 ? 'blank' : 'full';
        else if (isReaching) scaffoldMode = 'blank';
        else scaffoldMode = null; // Mastering known_procedure: no scaffold table at all
      }
      if (scaffoldMode) out.push(...guessScaffold(scaffoldMode, { given: q.given, unknown: q.unknown, equation: q.equation, substitute: q.substitute }));
    }
    if (q.structure) out.push(...structureGuide(q.structure));
    // sentence starters: extended_writing questions get tier-appropriate density at every tier, never zero
    const isExtendedWriting = q.contentType === 'extended_writing' || (q.marks || 0) >= 4;
    const starterOk = q.starters && (isExtendedWriting || mode === 'developing' || q.forceStarters);
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
    doNowQs.forEach((q, i) => {
      ch.push(...question(i + 1, q.q || ''));
      if (mode === 'developing') {
        // optional hint line (q.hint) — a nudge toward the right thinking, never the answer
        if (q.hint) ch.push(P(R('Hint: ' + q.hint, { italic: true, size: 18, color: '555555' }), { indent: { left: 360 }, spacing: { before: 10, after: 20 } }));
        ch.push(...writeLines(1));
      }
    });
  };
  // support sheet only: a key-term definition table with write-space on the sheet
  const definitionSection = () => {
    if (mode !== 'developing') return;
    // fall back to title keywords when no explicit wx.definitions list is provided
    const terms = arr(wx.definitions).length
      ? arr(wx.definitions)
      : arr((L.title || {}).keywords).map(k => (typeof k === 'string' ? { term: k } : k));
    if (!terms.length) return;
    ch.push(...divider('KEY WORDS'));
    ch.push(P(R('Write what each key word means. Use the word bank and your notes to help.', { italic: true, size: 18, color: '555555' }), { spacing: { before: 40, after: 80 } }));
    ch.push(...definitionTable(terms));
  };
  // optional cloze/gap-fill section, driven by worksheetExtras.cloze
  const clozeSection = () => {
    const sentences = arr(wx.cloze);
    if (!sentences.length) return;
    ch.push(...divider('FILL IN THE GAPS'));
    const bank = wx.clozeWordBank || wx.wordBank || arr((L.title || {}).keywords);
    if (bank.length > 2) ch.push(wordBank(bank));
    ch.push(...clozeDocx(sentences));
  };
  const buildSection = () => {
    const blocks = buildQuestionBlocks(L, bstate, mode);
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
    if (prac.imagePlaceholder !== false) ch.push(...diagramBox('[Circuit / apparatus diagram \u2014 teacher inserts]', 8));
    if (arr(prac.steps).length) {
      ch.push(sectionLabel('Method'));
      arr(prac.steps).forEach((st, i) => ch.push(P([R(`${i + 1}.  `, { bold: true, size: 20 }), R(st, { size: 20 })], { spacing: { before: 40, after: 40 } })));
    }
    ch.push(sectionLabel('Variables'));
    ch.push(...variablesTable());
    ch.push(...divider('RESULTS'));
    const res = wx.results || {};
    ch.push(...resultsTable(res.headers || ['', '', ''], res.rows == null ? 5 : res.rows));
    // Backup / reference data (pre-collected) — see Type A practical section above
    if (wx.referenceData) {
      const rd = wx.referenceData;
      ch.push(sectionLabel('Backup data (use if your results were not valid)'));
      if (rd.note) ch.push(P(R(rd.note, { italic: true, size: 18, color: '555555' }), { spacing: { before: 20, after: 60 } }));
      ch.push(...resultsTable(rd.headers || res.headers || ['', '', ''], rd.rows || 5));
    }
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
    definitionSection();
    clozeSection();
    // practical experiment section — diagram + results + conclusion questions (never strip)
    const pracA = arr(L.build).find((b) => (b.type || b.variant) === 'practical');
    if (pracA) {
      ch.push(...divider('EXPERIMENT'));
      if (pracA.intro) ch.push(...contextBox(pracA.intro));
      if (pracA.imagePlaceholder !== false) ch.push(...diagramBox('[Circuit / apparatus diagram \u2014 teacher inserts]', 8));
      const resA = wx.results || {};
      if (resA.headers) ch.push(...resultsTable(resA.headers, resA.rows == null ? 5 : resA.rows));
      // Backup / reference data — pre-collected results students can use if their own are invalid.
      // Driven by worksheetExtras.referenceData: { headers?, rows:[[]], note? }
      if (wx.referenceData) {
        const rd = wx.referenceData;
        ch.push(sectionLabel('Backup data (use if your results were not valid)'));
        if (rd.note) ch.push(P(R(rd.note, { italic: true, size: 18, color: '555555' }), { spacing: { before: 20, after: 60 } }));
        ch.push(...resultsTable(rd.headers || resA.headers || ['', '', ''], rd.rows || 5));
      }
      arr(pracA.questions).forEach((q, i) => ch.push(...question(i + 1, q.q || '')));
    }
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
   OUTPUT PATH RESOLUTION
   ========================================================================= */

// Priority: meta.outputDir \u2192 CLI arg 2 \u2192 /mnt/user-data/outputs \u2192 cwd
function resolveOutputDir(L) {
  if (L.meta.outputDir) return L.meta.outputDir;
  if (process.argv[3]) return process.argv[3];
  if (fs.existsSync('/mnt/user-data/outputs')) return '/mnt/user-data/outputs';
  return process.cwd();
}

/* =========================================================================
   MAIN
   ========================================================================= */

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node build.js lesson-content.json [output-dir]');
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

  let ok = 0, fail = 0;
  for (let i = 0; i < lessons.length; i++) {
    const L = lessons[i];
    const label = (L && L.meta && (L.meta.class + ' / ' + (L.meta.topic || L.meta.title))) || ('lesson #' + (i + 1));
    try {
      if (!L || !L.meta) throw new Error('lesson is missing "meta"');
      // Filename = topic + ability label. NO class code, NO date.
      const split = String(L.meta.differentiation || 'none').toLowerCase() === 'split';
      const ability = L.meta.abilityLabel ? slug(L.meta.abilityLabel)
        : (split ? 'mixed_ability' : '');
      const base = slug(L.meta.topic || L.meta.title) + (ability ? '_' + ability : '');

      const outDir = resolveOutputDir(L);

      // 1 \u2014 PPTX (one version, for everyone)
      const pptxPath = path.join(outDir, base + '.pptx');
      await buildPptx(L, pptxPath);
      console.log('  \u2713 ' + path.basename(pptxPath));

      // 2 \u2014 Standard worksheet
      const wsPath = path.join(outDir, base + '_worksheet.docx');
      await buildDocx(L, wsPath, 'standard');
      console.log('  \u2713 ' + path.basename(wsPath));

      // 3 \u2014 Support worksheet (same content, scaffolding added automatically)
      const supportPath = path.join(outDir, base + '_support_worksheet.docx');
      await buildDocx(L, supportPath, 'developing');
      console.log('  \u2713 ' + path.basename(supportPath));

      ok++;
    } catch (e) {
      fail++;
      console.error('  \u2717 FAILED: ' + label + ' \u00B7 ' + e.message);
      if (process.env.BUILD_DEBUG) console.error(e.stack);
    }
  }
  console.log('\nDone. ' + ok + ' lesson(s) built, ' + fail + ' failed.');
  if (fail && !ok) process.exit(2);
}

main().catch((e) => { console.error(e); process.exit(2); });
