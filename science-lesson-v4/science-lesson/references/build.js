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
                  {"type":"guessExample","topic"?,"given","unknown","equation",
                   "equationSymbols"?:{top,bottomLeft,bottomRight},"substitute","solve"},
                  {"type":"practiceTriangle","topic"?,"questions":[{q,a,marks?}],"equation",
                   "equationSymbols"?:{top,bottomLeft,bottomRight}},
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
const TBIDX = require('./textbook-index.js');   // textbook page-reference matcher
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign,
  LineRuleType, HeightRule, ImageRun,
  Math: DocxMath, MathFraction, MathRadical, MathRun: DocxMathRun,
} = require('docx');

/* ============================== CONSTANTS ================================ */

const SW = 13.33, SH = 7.5;                 // NEVER hardcode other values
const NAV_H = 0.55, ACC_H = 0.04;
const BOT_H = 0.35, BOT_Y = SH - BOT_H;     // 7.15
const TOP = NAV_H + ACC_H + 0.12;           // 0.71 — first element y
const GAP = 0.10, MX = 0.45;
const CW = SW - 2 * MX;                     // content width

const FONT = 'Trebuchet MS';
const FONT_MATH = 'Cambria Math';          // ships with every MS Office — zero install on school PCs
const NAVY = '0D1B5E', NAVY2 = '152347', DONOW_BAR = '25408D';
const GOLD = 'FABB2E', BG = 'EDF2FA', PURPLE_BG = '4A148C', PURPLE_PEN = '6A0DAD';
const TEAL = '00838F', AMBER = 'E65100', GREEN_OK = '1B5E20';
const ab = (c) => [c, c, c, c].map((x) => ({ type: 'solid', pt: 1, color: x })); // 4-sided border shorthand

const _tmpFiles = []; // SVG temp files written during slide assembly; cleaned up after each buildPptx call

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
const NO_WORD_BANK = new Set(['8AB', '9AB']); // M5: B13 classes that suppress keyword-fallback word bank
const MCQ = {
  A: { badge: 'C2185B', bg: 'FCE4EC' },
  B: { badge: '1565C0', bg: 'E3F2FD' },
  C: { badge: '2E7D32', bg: 'E8F5E9' },
  D: { badge: 'F57F17', bg: 'FFFDE7' },
};

const GOLD2 = { color: GOLD, width: 2 };          // the ONLY content border
const GOLD_DASH = { color: GOLD, width: 1, dashType: 'dash' };

// M1: handwriting engine — Caveat only, 5 fixed jitter presets (neat → messy).
// Presets are deterministic (indexed by word position), never re-randomised
// per build, so a given script always renders identically.
const CAVEAT = 'Caveat';
const CAVEAT_REGULAR_PATH = path.join(__dirname, 'Caveat-Regular.ttf');
const CAVEAT_BOLD_PATH = path.join(__dirname, 'Caveat-Bold.ttf');
const CAVEAT_CPI = 105; // approx Caveat chars-per-inch at 1pt (script font, looser than Trebuchet)
const JITTER_PROFILES = [
  { rot: [-1, 0.5, -0.5, 1, 0], base: [0, 0.01, -0.01, 0.005, -0.005] },                                    // 1 neat
  { rot: [-2, 1.5, -1, 2, -0.5, 1], base: [0.01, -0.015, 0.02, -0.01, 0.015, -0.02] },                       // 2
  { rot: [-3, 2, -2.5, 3, -1.5, 2.5, -1], base: [0.02, -0.025, 0.015, -0.02, 0.03, -0.015, 0.02] },          // 3 mid
  { rot: [-4.5, 3, -3.5, 4, -2.5, 3.5, -4, 2], base: [0.03, -0.035, 0.025, -0.03, 0.04, -0.02, 0.035, -0.025] }, // 4
  { rot: [-6, 4.5, -5, 5.5, -4, 5, -6.5, 3.5, -4.5], base: [0.04, -0.05, 0.035, -0.045, 0.05, -0.03, 0.045, -0.04, 0.03] }, // 5 messy
];

/* ============================== UTILITIES ================================ */

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (s) => String(s || 'lesson').trim().replace(/[^A-Za-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-') || 'lesson';
const today = () => new Date().toISOString().slice(0, 10);
const arr = (x) => (Array.isArray(x) ? x : (x == null ? [] : [x]));
const marksTag = (m) => (m ? `  [${m} ${m > 1 ? 'marks' : 'mark'}]` : '');

function normQ(item) {                           // apply/review question → object
  if (typeof item === 'string') {
    return { q: item.replace(/^Q?\d+[.)]?\s+/, ''), a: '', marks: null };
  }
  return Object.assign({ q: '', a: '', marks: null }, item);
}
function mcqOptions(o) {                         // array or {A..D} → {A..D}
  if (Array.isArray(o)) {
    const out = {};
    ['A', 'B', 'C', 'D'].forEach((L, i) => {
      out[L] = String(o[i] == null ? '' : o[i]).replace(/^[A-D][.):]\s*/i, '');
    });
    return out;
  }
  return o || {};
}
const esc  = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ========================= EQUATION RENDERING ========================== */
// Source notation: {num/den} fraction  x_sub  x^sup  x^-2  ^{multi}  \greek  \op  sqrt(...)
// parseEq → [{t:'text'|'sub'|'sup'|'frac'|'radical', v?, num?, den?, children?}]
// _SYM = Greek letters + maths operators. Unknown \cmd is left literal (`\cmd`).
const _SYM = {
  // Greek
  alpha:'α', beta:'β', gamma:'γ', delta:'δ', epsilon:'ε', theta:'θ',
  lambda:'λ', mu:'μ', rho:'ρ', sigma:'σ', omega:'ω', tau:'τ', phi:'φ',
  Delta:'Δ', Sigma:'Σ', Omega:'Ω', Lambda:'Λ', Gamma:'Γ', pi:'π',
  // Operators / relations (Bug 33/53)
  times:'×', div:'÷', pm:'±', cdot:'·', to:'→', rightarrow:'→',
  leq:'≤', geq:'≥', approx:'≈', neq:'≠', degree:'°', deg:'°', propto:'∝',
};
const _GREEK = _SYM; // back-compat alias — anything that referenced _GREEK still works

/* normSym(str) — plain-text symbol normaliser for PROSE sinks (reviewRow,
   indicative content, handwriting model answers). Converts \cmd tokens and a
   SMALL, SAFE whitelist of unit/operator WORDS to symbols. Structure (^ _ {}/
   sqrt) is NOT touched here — that is parseEq's job. Unknown text passes through. */
function normSym(str) {
  let s = String(str == null ? '' : str);
  // Bug 61: JSON authored with a SINGLE backslash ("\rho") arrives mangled — JSON.parse
  // turns \r into a carriage return, so the renderer sees CR+"ho" and the symbol is lost.
  // Repair: a control char whose escape letter + the following letters spell EXACTLY a
  // known symbol name is restored (the author meant a backslash command). Exact match
  // only — legitimate newlines/tabs followed by ordinary words are never touched.
  const _CTRL = { '\r': 'r', '\n': 'n', '\t': 't', '\b': 'b', '\f': 'f' };
  s = s.replace(/[\r\n\t\b\f]([A-Za-z]+)/g, (m, rest) => {
    const name = _CTRL[m[0]] + rest;
    if (_SYM[name]) {
      console.warn(`[eq] repaired mangled \\${name} — author it as "\\\\${name}" (double backslash) in JSON`);
      return _SYM[name];
    }
    return m;
  });
  s = s.replace(/\\([A-Za-z]+)/g, (_, g) => _SYM[g] || `\\${g}`);
  // Compound units first (longest match wins), then operators, then bare units.
  s = s
    .replace(/\b(?:met(?:er|re)s?)\s*(?:\/|per)\s*second\b/gi, 'm/s')
    .replace(/\bmet(?:er|re)s?\b/gi, 'm')
    .replace(/\bseconds\b/gi, 's')
    .replace(/\bdivided by\b/gi, '÷')
    .replace(/\bdivide\b/gi, '÷')
    .replace(/\btimes\b/gi, '×');
  return s;
}

/* unicodeScript(str) — plain-text super/subscript for PROSE sinks that render
   flat strings (no run-level super/superscript). Converts x^2 / x^{2} → x²,
   x_2 → x₂, but ONLY when every char in the arg has a Unicode mapping; otherwise
   the token is left untouched (better a literal ^ than a mangled glyph). */
const _SUP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾','n':'ⁿ' };
const _SUB = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎' };
function unicodeScript(str) {
  const conv = (arg, map) => {
    const out = [...arg].map((c) => map[c]);
    return out.every(Boolean) ? out.join('') : null;
  };
  return String(str == null ? '' : str).replace(/([\^_])(?:\{([^}]*)\}|(-?[A-Za-z0-9+()=]+))/g,
    (m, mark, braced, bare) => {
      const arg = braced != null ? braced : bare;
      const mapped = conv(arg, mark === '^' ? _SUP : _SUB);
      return mapped != null ? mapped : m;
    });
}

/* prettyText(str) — combined plain-text normaliser for PROSE sinks: symbols +
   Unicode super/subscript, body font preserved. Not for equation FIELDS (those
   use parseEq → toPptxRuns/toDocxRuns). */
function prettyText(str) { return unicodeScript(normSym(str)); }

function parseEq(raw) {
  if (!raw) return [{t:'text',v:''}];
  // 2026-07-05: normSym first — equation FIELDS now also convert word operators
  // ("times"→×, "divided by"→÷) and the safe unit whitelist, so GUESS cells,
  // equation hints and worked steps typeset the same as prose sinks.
  let s = normSym(raw);
  const segs = [];
  let buf = '', i = 0;
  const flush = () => { if (buf) { segs.push({t:'text',v:buf}); buf=''; } };
  const readArg = () => {
    if (i >= s.length) return '';
    if (s[i] === '{') {
      let d=1, j=i+1;
      while (j < s.length && d > 0) { if (s[j]==='{') d++; else if (s[j]==='}') d--; j++; }
      const v = s.slice(i+1,j-1); i=j; return v;
    }
    const m = /^-?[A-Za-z0-9]+/.exec(s.slice(i)); // N2: allow leading - for ^-2 style exponents
    if (m) { i += m[0].length; return m[0]; }
    return s[i++] || '';
  };
  while (i < s.length) {
    const ch = s[i];
    if (s.startsWith('sqrt(', i)) {
      flush(); let depth=1, j=i+5;
      while (j < s.length && depth > 0) { if (s[j]==='(') depth++; else if (s[j]===')') depth--; j++; }
      segs.push({t:'radical', children: parseEq(s.slice(i+5,j-1))}); i=j; continue;
    }
    if (ch === '_' || ch === '^') { flush(); i++; segs.push({t:ch==='_'?'sub':'sup', v:readArg()}); continue; }
    if (ch === '/') {
      if (buf) {
        const sp = Math.max(buf.lastIndexOf(' '), buf.lastIndexOf('='), buf.lastIndexOf('+'), buf.lastIndexOf('('));
        const num = sp >= 0 ? buf.slice(sp+1) : buf;
        const prefix = sp >= 0 ? buf.slice(0,sp+1) : '';
        buf = '';
        if (prefix) segs.push({t:'text',v:prefix});
        i++;
        const ds=i; while (i < s.length && !/[\s=+\-()]/.test(s[i])) i++;
        const den = s.slice(ds,i);
        segs.push(den && num ? {t:'frac',num,den} : {t:'text',v:num+'/'+den});
      } else { segs.push({t:'text',v:'/'}); i++; }
      continue;
    }
    if (ch === '{') { // M1: {num/den} explicit fraction syntax
      let d=1, j=i+1;
      while (j < s.length && d>0) { if(s[j]==='{') d++; else if(s[j]==='}') d--; j++; }
      const inner = s.slice(i+1, j-1); i=j;
      const si = inner.indexOf('/');
      if (si > 0 && si < inner.length-1) { flush(); segs.push({t:'frac',num:inner.slice(0,si).trim(),den:inner.slice(si+1).trim()}); }
      else { buf += inner; }
      continue;
    }
    buf += ch; i++;
  }
  flush();
  return segs;
}
// segsToPlain(segs) — flatten a parseEq tree to a plain string (used for OOXML
// math radicands, which take simple runs). Radicands here are always simple.
function segsToPlain(segs) {
  return arr(segs).map(seg => {
    if (seg.t === 'frac')    return `${seg.num}/${seg.den}`;
    if (seg.t === 'radical') return `√${segsToPlain(seg.children)}`;
    return seg.v || '';
  }).join('');
}
// pptxgenjs runs array — subscript/superscript are native pptxgenjs run props.
// Equation runs render in Cambria Math (FONT_MATH); every toPptxRuns call site
// is a real equation field, so no prose is serif-ified.
function toPptxRuns(segs, opts) {
  const o = opts || {};
  const fs = o.fontSize || 18;
  const subFs = Math.round(fs * 0.65);
  const base = (x) => Object.assign({fontSize:fs, fontFace:FONT_MATH}, o.bold && {bold:true}, o.color && {color:o.color}, x);
  const small = (x) => Object.assign({fontSize:subFs, fontFace:FONT_MATH}, o.color && {color:o.color}, x);
  return segs.flatMap(seg => {
    // Bug 53: diagonal fraction at FULL size (num/den no longer shrunk sub+sup on
    // top of the 0.65 scale — that compounding made {d/t} render tiny). pptxgenjs
    // has no Office Math, so this stays a legible diagonal a⁄b.
    if (seg.t === 'frac') return [{text:seg.num,options:base()},{text:'⁄',options:base()},{text:seg.den,options:base()}];
    if (seg.t === 'radical') return [{text:'√', options:base()}, ...toPptxRuns(seg.children, o)]; // √-glyph, no vinculum in PPTX
    if (seg.t === 'sub')  return {text:seg.v, options:small({subscript:true})};
    if (seg.t === 'sup')  return {text:seg.v, options:small({superscript:true})};
    return {text:seg.v||'', options:base()};
  });
}
/* renderEqShapes — Bug 33/53 phase 3 (Patryk sign-off 2026-07-06: native shape
   pairs, NOT rendered images). Draws an equation as positioned PowerPoint shapes
   so {a/b} fractions render as a TRUE stack: numerator over a bar over the
   denominator, all editable text in Cambria Math. Only dedicated equation
   surfaces call this (Learn-F equation box, guessExample E row, practiceTriangle
   reference box) — they own their box geometry. Inline prose and small boxes
   keep the full-size diagonal a⁄b from toPptxRuns.
   Returns false when it drew nothing (no fraction, or the stack would not fit
   legibly) — the caller then falls back to the existing toPptxRuns path.
   NOTE: a fraction stack cannot be a single shape, so this is the sanctioned
   exception to the "combine fill+text into one shape" rule. Shape names
   eqFracNum / eqFracBar / eqFracDen are asserted by the regression harness. */
function renderEqShapes(slide, segs, box, opts) {
  const o = opts || {};
  if (!arr(segs).some(sg => sg.t === 'frac')) return false;
  const fs = o.fontSize || 24;
  // Average glyph-width factor for Cambria Math bold at slide sizes (~0.60 em).
  const estW = (text, size) => String(text || '').length * size * 0.60 / 72;

  // num/den size: a step below the line size, but the 2-line stack must fit box.h.
  const fracFs = Math.max(12, Math.min(Math.round(fs * 0.82), Math.floor((box.h * 72) / 3.0)));
  const lineH = fracFs * 1.30 / 72;
  if (lineH * 2.2 > box.h) return false; // box too shallow for a legible stack

  // Walk segments into layout groups: consecutive text/sub/sup segments stay one
  // txt() run group; each fraction becomes its own num/bar/den stack.
  const groups = [];
  let run = [], runW = 0;
  const flushRun = () => { if (run.length) { groups.push({ kind: 'run', runs: run, w: runW }); run = []; runW = 0; } };
  for (const sg of segs) {
    if (sg.t === 'frac') {
      flushRun();
      const w = Math.max(estW(sg.num, fracFs), estW(sg.den, fracFs)) + 0.10;
      groups.push({ kind: 'frac', num: sg.num, den: sg.den, w });
    } else {
      run.push(...toPptxRuns([sg], o));
      const scale = (sg.t === 'sub' || sg.t === 'sup') ? 0.65 : 1;
      const rawText = sg.t === 'radical' ? '√' + segsToPlain(sg.children) : (sg.v || '');
      runW += estW(rawText, fs * scale);
    }
  }
  flushRun();

  const totalW = groups.reduce((a, g) => a + g.w, 0) + 0.04 * Math.max(0, groups.length - 1);
  if (totalW > box.w - 0.1) return false; // equation too wide — diagonal fallback

  // Container (fill/border) drawn first when the caller hands one over.
  if (box.fill || box.line) {
    slide.addShape('rect', { x: box.x, y: box.y, w: box.w, h: box.h, fill: box.fill, line: box.line || { type: 'none' } });
  }
  let cx = (o.align === 'left') ? box.x + 0.05 : box.x + (box.w - totalW) / 2;
  const midY = box.y + box.h / 2;
  for (const g of groups) {
    if (g.kind === 'run') {
      txt(slide, g.runs, { x: cx, y: box.y, w: g.w + 0.30, h: box.h, valign: 'middle', align: 'left', margin: 0 });
    } else {
      const common = Object.assign(
        { fontFace: FONT_MATH, fontSize: fracFs, align: 'center', margin: 0 },
        o.color && { color: o.color }, o.bold && { bold: true });
      txt(slide, g.num, Object.assign({ objectName: 'eqFracNum', x: cx, y: midY - lineH - 0.005, w: g.w, h: lineH, valign: 'bottom' }, common));
      slide.addShape('line', {
        objectName: 'eqFracBar', x: cx + g.w * 0.08, y: midY, w: g.w * 0.84, h: 0,
        line: { color: o.color || '1A1A2E', width: Math.max(1.25, fs / 16) },
      });
      txt(slide, g.den, Object.assign({ objectName: 'eqFracDen', x: cx, y: midY + 0.005, w: g.w, h: lineH, valign: 'top' }, common));
    }
    cx += g.w + 0.04;
  }
  return true;
}

// docx TextRun array — subScript/superScript are docx TextRun constructor props.
// Fractions/radicals emit OOXML math (rendered in Cambria Math by Word default).
function toDocxRuns(segs, opts) {
  const o = opts || {};
  const sz = o.size || 22;
  const subSz = Math.round(sz * 0.65);
  const base = (x) => Object.assign({size:sz}, o.bold && {bold:true}, o.color && {color:o.color}, o.italic && {italics:true}, x);
  const small = (x) => Object.assign({size:subSz}, o.color && {color:o.color}, x);
  return segs.flatMap(seg => {
    if (seg.t === 'frac') return new DocxMath({ children: [new MathFraction({ numerator: [new DocxMathRun(seg.num)], denominator: [new DocxMathRun(seg.den)] })] }); // M2: stacked fraction via OOXML math
    if (seg.t === 'radical') return new DocxMath({ children: [new MathRadical({ children: [new DocxMathRun(segsToPlain(seg.children))] })] }); // true radical with vinculum (Cambria Math)
    if (seg.t === 'sub')  return new TextRun(small({text:seg.v, subScript:true}));
    if (seg.t === 'sup')  return new TextRun(small({text:seg.v, superScript:true}));
    return new TextRun(base({text:seg.v||''}));
  });
}

/* ---- INLINE MARKUP (real AQA mark-scheme conventions, M7) -----------------
   <u>word</u> = essential wording (must appear). **word** = bold connector —
   real mark schemes bold "and"/"or" to signal both-parts-required vs
   accepted-alternative. Literal "/" and brackets need no markup — they are
   already meaningful as plain characters in mark-scheme prose. */
function parseMarkup(raw) {
  const s = String(raw || '');
  const segs = [];
  const re = /<u>(.*?)<\/u>|\*\*(.*?)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) segs.push({ text: s.slice(last, m.index) });
    if (m[1] != null) segs.push({ text: m[1], underline: true });
    else segs.push({ text: m[2], bold: true });
    last = re.lastIndex;
  }
  if (last < s.length) segs.push({ text: s.slice(last) });
  return segs.length ? segs : [{ text: s }];
}
function markupToPptxRuns(raw, baseOpts) {
  return parseMarkup(raw).map((seg) => ({
    text: seg.text,
    options: Object.assign({}, baseOpts, seg.underline ? { underline: true } : {}, seg.bold ? { bold: true } : {}),
  }));
}
// DOCX twin — same rule: underline ONLY marks a word that MUST be used.
function markupToDocxRuns(raw, baseOpts) {
  return parseMarkup(raw).map((seg) => new TextRun(Object.assign({}, baseOpts,
    { text: seg.text },
    seg.underline ? { underline: {} } : {},
    seg.bold ? { bold: true } : {})));
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

/* lessonBookRef(L) — "Read more — [book] pp. X–Y" for a lesson's Apply section,
   or '' when nothing matches. Auto-matched from meta year/subject/topic +
   title.keywords; meta.textbookRef overrides ("B3.4" | [codes] | {book,pages} |
   "none"). Wrapped so a bad index never breaks a build. */
function lessonBookRef(L) {
  try {
    const meta = (L && L.meta) || {}, title = (L && L.title) || {};
    const m = TBIDX.resolve({
      year: meta.year, subject: meta.subject || meta.theme,
      topic: meta.topic || meta.title, keywords: title.keywords,
      override: meta.textbookRef,
    });
    return m ? 'Read more — ' + TBIDX.formatRef(m) : '';
  } catch (_) { return ''; }
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
    [{ text: headerText, options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 22, border, valign: 'middle' } }],
    [{ text: bodyText, options: { fill: { color: 'FFFFFF' }, color: '1A1A2E', fontSize: autoFontSize(arr(bodyLines).join(' '), w, Math.max(0.4, (bodyH || 1.2) - 0.65), { min: 11, max: 20 }), border, valign: 'top' } }],
  ], { x, y, w, colW: [w], rowH: [0.65, Math.max(0.4, (bodyH || 1.2) - 0.65)], fontFace: FONT, margin: 0.06, autoPage: false });
}

/* imagePlaceholder(x, y, w, h, description?) */
function imagePlaceholder(slide, x, y, w, h, description) {
  // Always prefer a concrete suggestion of WHAT to insert. The generic fallback
  // still asks for a specific thing rather than the bare "teacher inserts".
  const label = description
    ? `[Paste image \u2014 suggested search: ${description}]`
    : '[Image \u2014 add imageDescription to JSON]';
  txt(slide, label, {
    x, y, w, h, fill: { color: 'D0D0D0' },
    line: { color: '999999', width: 1, dashType: 'dash' },
    color: '666666', italic: true, fontSize: 11, align: 'center', valign: 'middle',
  });
}

/* imageOrPlaceholder(item, x, y, w, h) — embed the lesson's real image when one
   was matched (imageConfidence 'search' + embeddedImagePath), else a
   description-aware grey placeholder. Single source of truth so a slide type can
   never again forget to pass item.imageDescription (Bug 58 regression — variants
   H and J were calling imagePlaceholder without it). */
function imageOrPlaceholder(slide, item, x, y, w, h) {
  if (item && item.imageConfidence === 'search' && item.embeddedImagePath) {
    slide.addImage({ path: item.embeddedImagePath, x, y, w, h });
  } else {
    imagePlaceholder(slide, x, y, w, h, (item && item.imageDescription) || null);
  }
}

/* annotationZone — dashed gold, "worked live" label. Immovable. */
function annotationZone(slide, x, y, w, h) {
  slide.addShape('rect', { x, y, w: w || 5.5, h: h || 4.0, fill: { color: 'FFFFFF' }, line: GOLD_DASH });
  txt(slide, 'worked live', {
    x: x + 0.05, y: y + 0.03, w: 1.2, h: 0.25,
    color: '9E9E9E', fontSize: 9, align: 'left', valign: 'top',
  });
}

/* ---- HANDWRITING ENGINE (M1) — shared by model-answer-review + correct-the-
   statement slide types. Each word gets its own tiny editable text box in
   Caveat, rotated/baseline-shifted per JITTER_PROFILES — real PPTX text, not
   a rasterised image, so it stays editable (M1/M2). */
function jitterFor(profileIdx, wordIdx) {
  const p = JITTER_PROFILES[Math.max(0, Math.min(JITTER_PROFILES.length - 1, profileIdx))];
  return { rot: p.rot[wordIdx % p.rot.length], base: p.base[wordIdx % p.base.length] };
}
function wordWidthIn(word, fontSize) {
  return (String(word).length * fontSize) / CAVEAT_CPI + 0.05;
}
/* M3: per-item override, else lesson-wide L.meta.handwritingMode, else editable (default) */
function handwritingMode(L, item) {
  return (item && item.renderMode) || (L.meta && L.meta.handwritingMode) || 'editable';
}

/* layoutHandwriting(text, w, h, opts) — word-wraps text (string = one
   paragraph; array = each entry forced onto its own line, e.g. calculation
   steps) into a list of {word, x, y, rot} placements plus per-word jitter.
   Shared by both render paths below so layout logic exists exactly once. */
function layoutHandwriting(text, w, opts) {
  const o = opts || {};
  const fontSize = o.fontSize || 20;
  const profile = o.profile != null ? o.profile : 2;
  const baseLineH = (fontSize * 1.55) / 72;
  const paras = Array.isArray(text) ? text.map(String) : [String(text || '')];
  const padX = 0.14, padTop = 0.12;
  const maxLineW = w - padX * 2;
  const lines = [];
  paras.forEach((para) => {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = [], curW = 0;
    words.forEach((word) => {
      const ww = wordWidthIn(word, fontSize);
      if (curW + ww > maxLineW && cur.length) { lines.push(cur); cur = []; curW = 0; }
      cur.push(word); curW += ww;
    });
    lines.push(cur);
  });
  // Spread mode: when a box height is supplied, stretch the line spacing so the
  // working fills the whole box (no dead space / trailing blank rules) and the
  // baseline rules come out evenly parallel. Capped so short answers don't sprawl.
  let lineH = baseLineH;
  if (o.boxH && lines.length) {
    const avail = o.boxH - padTop * 2;
    lineH = Math.min(Math.max(baseLineH, avail / lines.length), baseLineH * 2.4);
  }
  const placed = [];
  let wordIdx = 0;
  lines.forEach((line, li) => {
    let cx = padX;
    const cy = padTop + li * lineH;
    line.forEach((word) => {
      const ww = wordWidthIn(word, fontSize);
      const { rot, base } = jitterFor(profile, wordIdx++);
      placed.push({ word, x: cx, y: cy + base, w: ww, rot });
      cx += ww;
    });
  });
  return { placed, lineH, padTop, lineCount: lines.length, usedH: padTop + lines.length * lineH };
}

/* handwritingBlockEditable — primary render path (M1/M2): each word is its
   own tiny editable PPTX text box in Caveat, rotated/baseline-shifted per
   JITTER_PROFILES. Real, editable text — not an image. */
function handwritingBlockEditable(slide, x, y, w, h, text, opts) {
  const o = opts || {};
  const fontSize = o.fontSize || 20;
  const color = o.color || '1A1A2E';
  if (o.fill !== false) {
    slide.addShape('rect', { x, y, w, h, fill: { color: o.bg || 'FFFFFF' }, line: o.line || GOLD2 });
  }
  const { placed, lineH, padTop, lineCount, usedH } = layoutHandwriting(text, w, Object.assign({ boxH: h }, o));
  placed.forEach(({ word, x: wx, y: wy, w: ww, rot }) => {
    slide.addText(word, {
      x: x + wx, y: y + wy, w: ww + 0.14, h: lineH,
      fontFace: CAVEAT, fontSize, color, rotate: rot,
      align: 'left', valign: 'bottom', margin: 0,
    });
  });
  if (o.ruled) {
    // Even baseline rules under every line, stepped by the (spread) line height —
    // the working sits on evenly parallel rules and fills the box (no trailing blanks).
    const ruleGap = lineH;
    for (let ly = y + padTop + lineH; ly < y + h - 0.04; ly += ruleGap) {
      slide.addShape('line', { x: x + 0.14, y: ly, w: w - 0.14 * 2 - 0.05, h: 0, line: { color: 'C9C9DC', width: 0.75 } });
    }
  }
  return { usedH, lineCount };
}

let _caveatBase64Cache = null;
function caveatBase64() {
  if (_caveatBase64Cache == null) {
    try { _caveatBase64Cache = fs.readFileSync(CAVEAT_REGULAR_PATH).toString('base64'); }
    catch (e) { _caveatBase64Cache = ''; }
  }
  return _caveatBase64Cache;
}

/* handwritingBlockRaster — M3 fallback: same word-jitter layout, rendered as
   a self-contained SVG (Caveat embedded as base64 @font-face so it displays
   correctly even without OOXML font embedding), inserted as an image. Use
   only if the M2 font-embed approach proves unreliable in real PowerPoint —
   toggle via item.renderMode:'raster' or L.meta.handwritingMode:'raster'.
   Everything else on the deck stays normal editable text. */
function handwritingBlockRaster(slide, x, y, w, h, text, opts) {
  const o = opts || {};
  const fontSize = o.fontSize || 20;
  const color = (o.color || '1A1A2E').replace(/^(?!#)/, '#');
  const { placed, lineH, padTop, usedH } = layoutHandwriting(text, w, Object.assign({ boxH: h }, o));
  const px = 96;
  const W = Math.round(w * px), H = Math.round(h * px);
  const b64 = caveatBase64();
  const parts = [`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`];
  if (b64) parts.push(`<defs><style>@font-face{font-family:'Caveat';src:url(data:font/ttf;base64,${b64}) format('truetype');}</style></defs>`);
  if (o.fill !== false) {
    parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${(o.bg || 'FFFFFF').replace(/^(?!#)/, '#')}" stroke="${(o.line && o.line.color || GOLD).replace(/^(?!#)/, '#')}" stroke-width="3"/>`);
  }
  placed.forEach(({ word, x: wx, y: wy, rot }) => {
    const px_ = wx * px, py_ = (wy + fontSize / 72 * 1.1) * px;
    parts.push(`<text x="${px_.toFixed(1)}" y="${py_.toFixed(1)}" font-family="Caveat" font-size="${(fontSize * px / 72).toFixed(1)}" fill="${color}" transform="rotate(${rot} ${px_.toFixed(1)} ${py_.toFixed(1)})">${esc(word)}</text>`);
  });
  if (o.ruled) {
    const ruleGap = lineH * px;
    for (let ly = (padTop + lineH) * px; ly < H - 4; ly += ruleGap) {
      parts.push(`<line x1="10" y1="${ly.toFixed(1)}" x2="${W - 10}" y2="${ly.toFixed(1)}" stroke="#C9C9DC" stroke-width="1"/>`);
    }
  }
  parts.push('</svg>');
  const tmpPath = path.join(os.tmpdir(), `hw_${Date.now()}_${Math.random().toString(36).slice(2)}.svg`);
  fs.writeFileSync(tmpPath, parts.join('\n'), 'utf8');
  _tmpFiles.push(tmpPath);
  slide.addImage({ path: tmpPath, x, y, w, h });
  return { usedH, lineCount: undefined };
}

/* handwritingBlock(x, y, w, h, text, opts) — public entry, dispatches on
   opts.mode ('editable' default, or 'raster' for the M3 fallback). Same
   signature/behaviour either way from the caller's point of view. */
function handwritingBlock(slide, x, y, w, h, text, opts) {
  const o = opts || {};
  return o.mode === 'raster'
    ? handwritingBlockRaster(slide, x, y, w, h, text, o)
    : handwritingBlockEditable(slide, x, y, w, h, text, o);
}

/* embedCaveatFont(pptxPath) (M2) — post-processes the written .pptx to embed
   Caveat so it displays correctly in PowerPoint without a local font install.
   Google Slides needs none of this (native Google Font there). Best-effort:
   on any failure, leaves the file untouched — text still carries
   fontFace:'Caveat' so an unpatched file just substitutes a fallback font,
   which is the M3 fallback path in practice. */
function embedCaveatFont(pptxPath) {
  try {
    if (!fs.existsSync(CAVEAT_REGULAR_PATH) || !fs.existsSync(CAVEAT_BOLD_PATH)) {
      console.error('[embedCaveatFont] Caveat TTF files missing next to build.js — skipping embed');
      return false;
    }
    const zip = new AdmZip(pptxPath);
    let pres = zip.readAsText('ppt/presentation.xml');
    let rels = zip.readAsText('ppt/_rels/presentation.xml.rels');
    let ct = zip.readAsText('[Content_Types].xml');

    const usedIds = [...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => parseInt(m[1], 10));
    const nextId = Math.max(0, ...usedIds) + 1;
    const rIdReg = `rId${nextId}`, rIdBold = `rId${nextId + 1}`;

    rels = rels.replace('</Relationships>',
      `<Relationship Id="${rIdReg}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font1.fntdata"/>` +
      `<Relationship Id="${rIdBold}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font2.fntdata"/>` +
      '</Relationships>');

    ct = ct.replace('</Types>',
      '<Override PartName="/ppt/fonts/font1.fntdata" ContentType="application/x-fontdata"/>' +
      '<Override PartName="/ppt/fonts/font2.fntdata" ContentType="application/x-fontdata"/>' +
      '</Types>');

    if (!/embedTrueTypeFonts=/.test(pres)) {
      pres = pres.replace('<p:presentation ', '<p:presentation embedTrueTypeFonts="1" ');
    }
    const fontLst =
      '<p:embeddedFontLst><p:embeddedFont><p:font typeface="Caveat"/>' +
      `<p:regular r:id="${rIdReg}"/><p:bold r:id="${rIdBold}"/>` +
      '</p:embeddedFont></p:embeddedFontLst>';
    pres = /<p:notesSz[^/]*\/>/.test(pres)
      ? pres.replace(/(<p:notesSz[^/]*\/>)/, `$1${fontLst}`)
      : pres.replace('</p:presentation>', `${fontLst}</p:presentation>`);

    zip.updateFile('ppt/presentation.xml', Buffer.from(pres, 'utf8'));
    zip.updateFile('ppt/_rels/presentation.xml.rels', Buffer.from(rels, 'utf8'));
    zip.updateFile('[Content_Types].xml', Buffer.from(ct, 'utf8'));
    zip.addFile('ppt/fonts/font1.fntdata', fs.readFileSync(CAVEAT_REGULAR_PATH));
    zip.addFile('ppt/fonts/font2.fntdata', fs.readFileSync(CAVEAT_BOLD_PATH));
    zip.writeZip(pptxPath);
    return true;
  } catch (e) {
    console.error('[embedCaveatFont] failed, leaving pptx unembedded:', e.message || e);
    return false;
  }
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
    runs.push({ text: prettyText(q.q) + marksTag(q.marks), options: { fontSize: colFs, breakLine: true, paraSpaceAfter: 8 } }); // 2026-07-05: superscripts/symbols in tier questions
  });
  txt(slide, runs, {
    x, y: y + 0.42, w, h: h - 0.42, fill: { color: 'FFFFFF' }, line: GOLD2,
    color: '1A1A2E', align: 'left', valign: 'top', margin: 6, fit: 'shrink',
  });
}

/* reviewRow(y, h, tier, questionText, answerText) — tier=null → navy left cell */
function reviewRow(slide, y, h, tier, questionText, answerText) {
  const leftFill = tier ? TIER_PPTX[tier] : DONOW_BAR;
  const lw = CW * 0.35, rw = CW * 0.65 - 0.08;
  const q = prettyText(questionText), a = prettyText(answerText); // Bug 53: symbols + super/subscript in prose
  const qFs = autoFontSize(q, lw, h, { min: 12, max: 28 });
  txt(slide, q, {
    x: MX, y, w: lw, h, fill: { color: leftFill },
    color: 'FFFFFF', bold: true, fontSize: qFs, align: 'left', valign: 'middle',
    margin: 6, fit: 'shrink',
  });
  const aFs = autoFontSize(a, rw, h, { min: 12, max: 24 });
  txt(slide, a || '', {
    x: MX + lw + 0.08, y, w: rw, h, fill: { color: NAVY }, line: GOLD2,
    color: GOLD, align: 'left', valign: 'middle', margin: 6, fit: 'shrink', fontSize: aFs, // M2: gold text on navy
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
  const titleFs = title.length > 45 ? 26 : 32; // E12: extracted for subtitle gap scaling
  txt(s, title, {
    x: MX, y, w: leftW, h: 1.45, color: GOLD, bold: true,
    fontSize: titleFs, align: 'left', valign: 'top',
    fit: 'shrink', wrap: true,
  });
  y += titleFs >= 32 ? 1.65 : 1.5; // E12: larger gap when 32pt title to prevent subtitle crowding
  // M4: B10 strip class identifier \u2014 show year group not class code
  const _yr = meta.year || (String(meta.class || '').match(/^\d+/) || [])[0];
  const _yearStr = _yr ? `Year ${_yr}` : '';
  txt(s, meta.yearLine || (_yearStr ? `${_yearStr}  \u00B7  ${cap(meta.theme || 'Science')}` : cap(meta.theme || 'Science')), {
    x: MX, y, w: leftW, h: 0.3, color: 'AABBD0', fontSize: 12, align: 'left', valign: 'middle',
  });
  y += 0.42;
  // Learning objectives — boxed, larger text
  const loRuns = [{ text: 'Learning Objectives:', options: { bold: true, color: GOLD, fontSize: 15, breakLine: true, paraSpaceAfter: 8 } }]
    .concat(objectives.map((o, i) => ({
      text: `${i + 1}.  ${o}`, options: { color: 'FFFFFF', fontSize: 14, breakLine: true, paraSpaceAfter: 8 },
    })));
  const kwH = keywords.length ? 1.2 : 0; // M1: B5 extra headroom prevents overflow on PPT resave
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
  const n = Math.max(qs.length, L.doNow?.count ?? 5); // E6: configurable slot floor
  const rowH = (bottom - top - (n - 1) * 0.08) / n;
  qs.concat(Array(Math.max(0, n - qs.length)).fill({ q: '' })).forEach((q, i) => {
    const ry = top + i * (rowH + 0.08);
    s.addShape('roundRect', { x: rx, y: ry + (rowH - 0.42) / 2, w: 0.42, h: 0.42, rectRadius: 0.05, fill: { color: GOLD }, line: { type: 'none' } });
    txt(s, String(i + 1), {
      x: rx, y: ry + (rowH - 0.42) / 2, w: 0.42, h: 0.42,
      color: NAVY, bold: true, fontSize: 18, align: 'center', valign: 'middle',
    });
    goldBox(s, rx + 0.55, ry, rw - 0.55, rowH, prettyText(q.q || ''), { fill: 'F8F7F0', fontSize: 19, valign: 'middle' }); // 2026-07-05: superscripts/symbols in Do Now
  });

  silentEntryFooter(s);
  if (L.doNow && arr(L.doNow.specPoints).length) {
    s.addNotes('Spec points:\n' + arr(L.doNow.specPoints).join('\n'));
  }
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
  // M3/M4: reveal reserves its own bottom row — sized bigger for Layout A (question + answer both prominent)
  const revealH = e.reveal ? (e.reveal.question ? 1.25 : 0.95) : 0;
  const blockBottom = BOT_Y - 0.08 - (promptH ? promptH + GAP : 0) - (revealH ? revealH + GAP : 0);
  const ctxH = blockBottom - y - (videoH ? videoH + GAP : 0);

  // e.hook: short punchy statement (stat, quote, big question) rendered large at the top.
  // Separates focal element from supporting context so the slide never looks empty.
  const hook = e.hook || null;
  const leftW = CW * 0.55;
  const hasQ = !!(e.reveal && e.reveal.question);
  // Patryk-approved fix: when reveal is used, content is usually omitted (M8) — without this,
  // the old hook-only-then-empty-box layout left a huge dead gap. No video: rare combo, skip.
  const fillGap = !!(e.reveal && !body && !e.videoLink);

  if (fillGap && hasQ) {
    // Layout A, no content: hook full-width header / question+image row / full-width answer row
    const bottom = BOT_Y - 0.08 - (promptH ? promptH + GAP : 0);
    const hookRowH = hook ? Math.min(1.0, (bottom - y) * 0.20) : 0;
    const answerRowH = Math.min(1.15, (bottom - y) * 0.26);
    const midY = y + (hookRowH ? hookRowH + GAP : 0);
    const midH = bottom - midY - GAP - answerRowH;

    if (hook) {
      goldBox(s, MX, y, CW, hookRowH, hook, { bold: true, fontSize: autoFontSize(hook, CW, hookRowH, { min: 14, max: 24 }), valign: 'middle', align: 'center', fill: 'FFFDE7' });
    }
    const qW = hasImg ? leftW : CW;
    goldBox(s, MX, midY, qW, midH, e.reveal.question, { bold: true, fontSize: autoFontSize(e.reveal.question, qW, midH, { min: 16, max: 34 }), valign: 'middle', align: 'center', fill: 'FFFDE7' });
    if (hasImg) {
      if (e.imageConfidence === 'search' && e.embeddedImagePath) {
        s.addImage({ path: e.embeddedImagePath, x: MX + leftW + 0.15, y: midY, w: CW * 0.45 - 0.15, h: midH });
      } else {
        imagePlaceholder(s, MX + leftW + 0.15, midY, CW * 0.45 - 0.15, midH, e.imageDescription);
      }
    }
    const ansY = midY + midH + GAP;
    txt(s, e.reveal.answer || '', {
      x: MX, y: ansY, w: CW, h: answerRowH, fill: { color: NAVY }, line: GOLD2,
      color: GOLD, bold: true, align: 'left', valign: 'middle', margin: 8, fit: 'shrink',
      fontSize: autoFontSize(e.reveal.answer, CW, answerRowH, { min: 12, max: 26 }),
    });
  } else {
    if (hasImg) {
      // fillGap && !hasQ (Layout B, no content): hook fills the full column, matching the image height
      const hookH = (fillGap && !hasQ) ? ctxH : Math.min(1.0, ctxH * 0.35);
      if (hook) {
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
      const hookH = (fillGap && !hasQ) ? ctxH : Math.min(1.3, ctxH * 0.32);
      if (hook) {
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
    // M1/M2/M7: reveal modifier — trigger is presence of e.reveal only, works on any variant
    if (e.reveal) {
      // stacks above e.prompt (if both present) — ctxH already reserved room for both
      const ry = BOT_Y - 0.08 - (promptH ? promptH + GAP : 0) - revealH;
      if (hasQ) {
        // M3: Layout A (content present) — large question + navy/gold reveal box side-by-side, same row
        const qW = CW * 0.55, aW = CW * 0.45 - 0.08;
        goldBox(s, MX, ry, qW, revealH, e.reveal.question, {
          bold: true, fontSize: autoFontSize(e.reveal.question, qW, revealH, { min: 16, max: 30 }),
          valign: 'middle', align: 'center', fill: 'FFFDE7',
        });
        txt(s, e.reveal.answer || '', {
          x: MX + qW + 0.08, y: ry, w: aW, h: revealH, fill: { color: NAVY }, line: GOLD2,
          color: GOLD, bold: true, align: 'left', valign: 'middle', margin: 8, fit: 'shrink',
          fontSize: autoFontSize(e.reveal.answer, aW, revealH, { min: 12, max: 22 }),
        });
      } else {
        // M4: Layout B — hook is the question; full-width reveal box, no shared row
        txt(s, e.reveal.answer || '', {
          x: MX, y: ry, w: CW, h: revealH, fill: { color: NAVY }, line: GOLD2,
          color: GOLD, bold: true, align: 'left', valign: 'middle', margin: 8, fit: 'shrink',
          fontSize: autoFontSize(e.reveal.answer, CW, revealH, { min: 12, max: 24 }),
        });
      }
    }
  }
}

/* ---- Learn G SVG builder — unified 3/4/5-step layouts ------------------- */
// All layouts approved by Patryk (2026-06-22). Coordinates final — do not adjust.
// ponytail: was 3 near-identical functions; unified into one with a layout table
const LEARN_G_LAYOUTS = {
  3: {
    viewBox: '0 0 700 440',
    B: [
      [15,  20,  210, 120, 41,  42,  143, 120, 77,  93 ],
      [245, 160, 210, 120, 271, 182, 373, 350, 217, 233],
      [475, 300, 210, 120, 501, 322, 603, 580, 357, 373],
    ],
    ARROWS: [
      'M 120,140 C 120,220 205,220 245,220',
      'M 350,280 C 350,360 435,360 475,360',
    ],
  },
  4: {
    viewBox: '0 0 680 330',
    B: [
      [10,  12,  252, 124, 36,  34,  159, 136, 69,  85 ],
      [418, 12,  252, 124, 444, 34,  567, 544, 69,  85 ],
      [10,  194, 252, 124, 36,  216, 159, 136, 251, 267],
      [418, 194, 252, 124, 444, 216, 567, 544, 251, 267],
    ],
    ARROWS: [
      'M 262,74 C 325,35 355,35 418,74',
      'M 504,129 C 460,175 220,155 174,201',
      'M 262,256 C 325,295 355,295 418,256',
    ],
  },
  5: {
    viewBox: '0 0 680 330',
    B: [
      [18,  18,  220, 110, 44,  40,  151, 128, 75,  91 ],
      [442, 18,  220, 110, 468, 40,  575, 552, 75,  91 ],
      [230, 108, 220, 114, 256, 130, 363, 340, 158, 174],
      [18,  205, 220, 110, 44,  227, 151, 128, 258, 274],
      [442, 205, 220, 110, 468, 227, 575, 552, 258, 274],
    ],
    ARROWS: [
      'M 238,73 C 280,40 390,40 440,73',
      'M 552,128 C 552,210 510,165 454,165',
      'M 230,162 C 155,108 128,170 128,203',
      'M 238,260 C 280,290 390,290 440,260',
    ],
  },
  // M1: 6-step snake — TL→TR→MR→ML→BL→BR, same bezier/gold style as 3/4/5
  6: {
    viewBox: '0 0 680 512',
    B: [
      [10,  12,  252, 124, 36,  34,  159, 136, 69,  85 ],   // TL
      [418, 12,  252, 124, 444, 34,  567, 544, 69,  85 ],   // TR
      [418, 194, 252, 124, 444, 216, 567, 544, 251, 267],   // MR
      [10,  194, 252, 124, 36,  216, 159, 136, 251, 267],   // ML
      [10,  376, 252, 124, 36,  398, 159, 136, 433, 449],   // BL
      [418, 376, 252, 124, 444, 398, 567, 544, 433, 449],   // BR
    ],
    // M3: gold bezier arrows — right / down / left / down / right
    ARROWS: [
      'M 262,74 C 325,50 355,50 418,74',        // TL→TR
      'M 544,136 C 570,155 570,173 544,194',    // TR→MR
      'M 418,256 C 355,278 325,278 262,256',    // MR→ML
      'M 136,318 C 110,337 110,357 136,376',    // ML→BL
      'M 262,438 C 325,415 355,415 418,438',    // BL→BR
    ],
  },
};

/* Bug 54 — native flow renderer. The step boxes / badges / arrows below are all
   real, editable PPTX shapes (was buildLearnGSvg, a single flattened image that
   clipped text and truncated notes). Geometry is LEARN_G_LAYOUTS above, unchanged
   — the approved zigzag. The tx/sx/sy1/sy2 columns of B and the SVG marker were
   only needed by the old rasteriser and are no longer read. */
function _flowViewBox(vb) { const n = String(vb).match(/-?\d+(?:\.\d+)?/g).map(Number); return [n[2], n[3]]; }
function _flowBezier(d) {
  const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  return { x0: n[0], y0: n[1], c1x: n[2], c1y: n[3], c2x: n[4], c2y: n[5], x1: n[6], y1: n[7] };
}

/* flowStepBox — one native step: navy roundRect + gold number badge + editable
   label/note. The badge sits over the top-left corner; the text box starts to
   the RIGHT of the badge so text can never overlap the number. Inch coords. */
function flowStepBox(slide, X, Y, W, H, bcx, bcy, idx, step) {
  slide.addShape('roundRect', { x: X, y: Y, w: W, h: H, rectRadius: 0.06, fill: { color: NAVY2 }, line: GOLD2 });
  const bd = 0.34, BX = bcx - bd / 2, BY = bcy - bd / 2;
  const padL = Math.max(0.1, (BX + bd) - X + 0.06);
  const tX = X + padL, tW = Math.max(0.4, W - padL - 0.08);
  const label = String(step.label || ('Step ' + (idx + 1))), note = String(step.note || '');
  const runs = [{ text: label, options: { bold: true, color: 'FFFFFF', fontSize: autoFontSize(label, tW, H * 0.45, { min: 13, max: 19 }), breakLine: true, paraSpaceAfter: 4 } }];
  if (note) runs.push({ text: note, options: { italic: true, color: GOLD, fontSize: autoFontSize(note, tW, H * 0.55, { min: 10, max: 13 }) } });
  txt(slide, runs, { x: tX, y: Y + 0.04, w: tW, h: H - 0.08, align: 'left', valign: 'middle', margin: 3, fit: 'shrink' });
  slide.addShape('ellipse', { x: BX, y: BY, w: bd, h: bd, fill: { color: GOLD }, line: { type: 'none' } });
  txt(slide, String(idx + 1), { x: BX, y: BY, w: bd, h: bd, bold: true, color: NAVY2, fontSize: 15, align: 'center', valign: 'middle' });
}

/* flowArrow — native gold arrow between two points (INCHES). Straight line by
   default; pass ctrl=[c1x,c1y,c2x,c2y] (inches) + area={x,y,w,h} for a bezier
   arch rendered as an editable custom-geometry freeform. Shared by Learn-G
   (curved arches, from the approved beziers) and Learn-I (straight connectors). */
function flowArrow(slide, x0, y0, x1, y1, ctrl, area) {
  if (ctrl && area) {
    slide.addShape('custGeom', {
      x: area.x, y: area.y, w: area.w, h: area.h,
      points: [
        { x: x0 - area.x, y: y0 - area.y, moveTo: true },
        { x: x1 - area.x, y: y1 - area.y, curve: { type: 'cubic',
            x1: ctrl[0] - area.x, y1: ctrl[1] - area.y, x2: ctrl[2] - area.x, y2: ctrl[3] - area.y } },
      ],
      line: { color: GOLD, width: 2.5, endArrowType: 'triangle' },
    });
  } else {
    slide.addShape('line', {
      x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0),
      flipH: x1 < x0, flipV: y1 < y0, line: { color: GOLD, width: 2.5, endArrowType: 'triangle' },
    });
  }
}

/* renderLearnGFlow — draw the whole flow diagram natively into area {x,y,w,h}. */
function renderLearnGFlow(slide, steps, n, area) {
  const layout = LEARN_G_LAYOUTS[n];
  const [vbW, vbH] = _flowViewBox(layout.viewBox);
  const fx = (v) => area.x + (v / vbW) * area.w, fy = (v) => area.y + (v / vbH) * area.h;
  const fw = (v) => (v / vbW) * area.w, fh = (v) => (v / vbH) * area.h;
  layout.ARROWS.forEach((d) => {                 // arrows first — under the boxes
    const b = _flowBezier(d);
    flowArrow(slide, fx(b.x0), fy(b.y0), fx(b.x1), fy(b.y1),
      [fx(b.c1x), fy(b.c1y), fx(b.c2x), fy(b.c2y)], area);
  });
  layout.B.forEach((box, i) => {
    const [bx, by, bw, bh, cx, cy] = box;
    flowStepBox(slide, fx(bx), fy(by), fw(bw), fh(bh), fx(cx), fy(cy), i, steps[i] || {});
  });
}

/* ---- LEARN A–D ----------------------------------------------------------- */
function slideLearn(pptx, L, item) {
  const v = String(item.variant || 'A').toUpperCase();
  const map = { KEY_INFO: 'A', KEYWORDS: 'B', WRITE_IN_BOOK: 'B', REVISION_TABLE: 'C', IMAGE_COPY: 'D', COMPARISON_TABLE: 'E', EQUATION_CALLOUT: 'F', FLOW: 'G', SEQUENCE: 'G', VIDEO: 'H', FLOWCHART: 'I', GRAPH_SKETCH: 'J', TIMELINE: 'K' };
  const variant = map[v] || (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(v) ? v : 'A');
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
      imageOrPlaceholder(s, item, rightX, y, rightW, bodyBottom - y);
    }
  }

  if (variant === 'B') {
    // Card-grid layout \u2014 each keyword in its own navy box with gold border.
    // Schema: { variant:'B', heading, definitions:[{term,definition,etymology?}], below:'content+image'|'image'|'two-column'|'none', boxes:[{header,items}] }
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN') + ' \u00B7 KEY WORDS').toUpperCase(), STAGE.learn, TOP);
    const defs = arr(item.definitions);
    const below = String(item.below || 'none');
    const boxes = arr(item.boxes);
    const hasBelow = below !== 'none' && (boxes.length || below === 'image');
    const availH = BOT_Y - 0.08 - y;
    const bandH = hasBelow ? Math.min(availH * 0.5, Math.max(1.0, defs.length * 0.42 + 0.35)) : availH;
    const belowY = y + bandH + GAP;
    const belowH = BOT_Y - 0.08 - belowY;
    const cols = defs.length <= 4 ? 2 : 3;
    const rows = Math.ceil(defs.length / cols);
    const gap = 0.1;
    const cardW = (CW - gap * (cols - 1)) / cols;
    const cardH = (bandH - gap * (rows - 1)) / rows;
    defs.forEach((d, i) => {
      const cx = MX + (i % cols) * (cardW + gap);
      const cy = y + Math.floor(i / cols) * (cardH + gap);
      const runs = [{ text: String(d.term || ''), options: { bold: true, color: GOLD, fontSize: 18, breakLine: true, paraSpaceAfter: 4 } },
                    { text: String(d.definition || ''), options: { color: 'FFFFFF', italic: true, fontSize: 13 } }];
      if (d.etymology) runs.push({ text: '\n' + String(d.etymology), options: { color: GOLD, italic: true, fontSize: 11 } });
      txt(s, runs, { x: cx, y: cy, w: cardW, h: cardH, fill: { color: NAVY }, line: GOLD2, fontSize: 13, align: 'left', valign: 'middle', margin: 10 });
    });
    if (hasBelow && belowH > 0.3) {
      if (below === 'image') {
        imageOrPlaceholder(s, item, MX, belowY, CW, belowH);
      } else if (below === 'two-column') {
        const colW = (CW - 0.15) / 2;
        boxes.slice(0, 2).forEach((b, bi) => navyHeaderBox(s, MX + bi * (colW + 0.15), belowY, colW, b.header || '', arr(b.items), belowH));
      } else {
        const leftW = CW * 0.55, rightX = MX + leftW + 0.15, rightW = CW - leftW - 0.15;
        if (boxes.length) navyHeaderBox(s, MX, belowY, leftW, boxes[0].header || '', arr(boxes[0].items), belowH);
        imageOrPlaceholder(s, item, rightX, belowY, rightW, belowH);
      }
    }
  }

  if (variant === 'C') {
    let y = purplePenBar(s, TOP);
    const hasCore = arr(item.corePaper).length, hasExt = arr(item.extendPaper).length;
    // Header: navy fill / gold title (house style — the green header read as off).
    const mk = (rows, x, w, title) => {
      const trows = [[{ text: title, options: { fill: { color: NAVY }, color: GOLD, bold: true, fontSize: 12, align: 'center', colspan: 2 } }],
        [{ text: 'Question', options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 10 } },
         { text: 'Pages', options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 10 } }]]
        .concat(arr(rows).map((r, i) => {
          const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
          return [{ text: r.q || '', options: { fill: { color: fill }, fontSize: 10 } },
                  { text: String(r.pages || ''), options: { fill: { color: fill }, fontSize: 10, align: 'center' } }];
        }));
      s.addTable(trows, { x, y, w, colW: [w * 0.72, w * 0.28], fontFace: FONT, border: { type: 'solid', pt: 0.5, color: 'BBBBBB' }, margin: 0.04, autoPage: false });
    };
    // Bug 56: two tiers → side-by-side; a single tier → one full-width table (no forced blank column).
    if (hasCore && hasExt) {
      const colW = (CW - 0.2) / 2;
      mk(item.corePaper, MX, colW, 'CORE PAPER');
      mk(item.extendPaper, MX + colW + 0.2, colW, 'CHALLENGE PAPER');
    } else if (hasCore || hasExt) {
      mk(hasCore ? item.corePaper : item.extendPaper, MX, CW, hasCore ? 'CORE PAPER' : 'CHALLENGE PAPER');
    }
  }

  if (variant === 'D') {
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN') + ' (Copy into your book)').toUpperCase(), STAGE.learn, TOP);
    goldBox(s, MX, y, CW, 0.55, '\u261E  ' + (item.instruction || 'Copy this diagram into your book.'), { bold: true, fontSize: 13, valign: 'middle' });
    y += 0.55 + GAP;
    const ih = BOT_Y - 0.08 - y - (item.tip ? 0.35 : 0);
    const imgX = MX + (CW - 5.4) / 2;
    imageOrPlaceholder(s, item, imgX, y, 5.4, ih);
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
    const twinEqs = arr(item.equations).slice(0, 2); // E7/M4: twin guard — at most two items
    if (twinEqs.length === 2) {
      // E7/M3: two side-by-side equation boxes of equal width
      const eqW = (CW - 0.12) / 2;
      twinEqs.forEach((eq, i) => {
        const eqSegs = parseEq(eq);
        const eqX = MX + i * (eqW + 0.12);
        // Bug 33/53 phase 3: true stacked fraction as native shapes; diagonal fallback
        if (!renderEqShapes(s, eqSegs, { x: eqX, y, w: eqW, h: eqH, fill: { color: '152347' }, line: GOLD2 }, { fontSize: 28, color: GOLD, bold: true })) {
          txt(s, toPptxRuns(eqSegs, { fontSize: 28, color: GOLD, bold: true }), {
            x: eqX, y, w: eqW, h: eqH, fill: { color: '152347' }, line: GOLD2,
            align: 'center', valign: 'middle',
          });
        }
      });
    } else {
      // M4: single equation — Bug 33/53 phase 3: stacked fraction, diagonal fallback
      const eqSegs = parseEq(item.equation || '');
      if (!renderEqShapes(s, eqSegs, { x: MX, y, w: CW, h: eqH, fill: { color: '152347' }, line: GOLD2 }, { fontSize: 28, color: GOLD, bold: true })) {
        txt(s, toPptxRuns(eqSegs, {fontSize:28, color:GOLD, bold:true}), {
          x: MX, y, w: CW, h: eqH, fill: { color: '152347' }, line: GOLD2,
          align: 'center', valign: 'middle',
        });
      }
    }
    y += eqH + GAP;
    const comps = arr(item.components);
    const rears = arr(item.rearrangements);
    if (comps.length) {
      const cols = comps.length <= 4 ? comps.length : Math.ceil(comps.length / 2);
      const rows = Math.ceil(comps.length / cols);
      const availForComps = BOT_Y - 0.08 - y
        - (rears.length ? 0.65 + GAP : 0)
        - (item.example ? 0.7 + GAP : 0);
      const compH = Math.max(1.05, (availForComps - (rows - 1) * 0.12) / rows);
      comps.forEach((c, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const isLastRow = row === rows - 1;
        const thisRowCount = isLastRow ? comps.length - (rows - 1) * cols : cols;
        const thisW = (CW - (thisRowCount - 1) * 0.12) / thisRowCount;
        const cx = MX + col * (thisW + 0.12);
        const cy = y + row * (compH + 0.12);
        const symRuns = toPptxRuns(parseEq(String(c.symbol||'')), {fontSize:24,color:GOLD,bold:true});
        if (symRuns.length) symRuns[symRuns.length-1].options = Object.assign({}, symRuns[symRuns.length-1].options, {breakLine:true});
        goldBox(s, cx, cy, thisW, compH, [
          ...symRuns,
          { text: String(c.name || ''), options: { fontSize: 17, color: 'FFFFFF', breakLine: true } },
          { text: prettyText(String(c.unit || '')), options: { fontSize: 15, italic: true, color: 'AABBD0' } }, // Bug 61: m/s^2 → m/s²
        ], { fill: '152347', valign: 'middle', align: 'center' });
      });
      y += rows * compH + (rows - 1) * 0.12 + GAP;
    }
    if (rears.length) {
      const rearH = 0.65;
      const rearW = (CW - (rears.length - 1) * 0.12) / rears.length;
      rears.forEach((r, i) => {
        goldBox(s, MX + i * (rearW + 0.12), y, rearW, rearH, toPptxRuns(parseEq(String(r)), {fontSize:20,bold:true}), { align: 'center', valign: 'middle', fill: BG });
      });
      y += rearH + GAP;
    }
    if (item.example) {
      const expH = BOT_Y - 0.08 - y;
      if (expH > 0.3) {
        const exFs = autoFontSize('Example:  ' + item.example, CW, expH, { min: 20, max: 32 });
        goldBox(s, MX, y, CW, expH, [
          { text: 'Example:  ', options: { bold: true, fontSize: exFs, color: NAVY } },
          { text: item.example, options: { fontSize: exFs } },
        ], { valign: 'top' });
      }
    }
  }

  if (variant === 'G') {
    // Flow / sequence — zigzag/W-pattern fills slide vertically. Max 6 steps.
    // Use for: rock cycle, digestive system, nitrogen cycle, any causal chain.
    let y = sectionHeader(s, ('LEARN · ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const steps = arr(item.steps).slice(0, 6);
    const n = steps.length;
    if (n) {
      const availH = BOT_Y - 0.08 - y;
      if (n >= 3) {
        // Bug 54: native shapes + editable text (was a flattened SVG image).
        renderLearnGFlow(s, steps, n, { x: MX, y, w: CW, h: availH });
      } else {
        // 1/2 steps: DEFS grid with text-arrow connectors
        const ARR = 0.28;
        // [rows, cols, [[row,col]...]] keyed by step count; 3+ handled by SVG branch above
        const DEFS = {
          1: [1, 1, [[0,0]]],
          2: [1, 2, [[0,0],[0,1]]],
        };
        const [nRows, nCols, pos] = DEFS[n];
        const cellW = CW / nCols, cellH = availH / nRows;
        const bw = cellW - ARR, bh = cellH - ARR;
        const bX = (c) => MX + c * cellW + ARR / 2;
        const bY = (r) => y + r * cellH + ARR / 2;
        const cX = (c) => bX(c) + bw / 2;
        const cY = (r) => bY(r) + bh / 2;
        const arrowCh = (r1, c1, r2, c2) => {
          const dr = r2 - r1, dc = c2 - c1;
          if (dr === 0) return dc > 0 ? '→' : '←';
          if (dc === 0) return dr > 0 ? '↓' : '↑';
          return dr > 0 ? (dc > 0 ? '↘' : '↙') : (dc > 0 ? '↗' : '↖');
        };
        for (let i = 0; i < n - 1; i++) {
          const [r1, c1] = pos[i], [r2, c2] = pos[i + 1];
          txt(s, arrowCh(r1, c1, r2, c2), {
            x: (cX(c1) + cX(c2)) / 2 - ARR / 2, y: (cY(r1) + cY(r2)) / 2 - ARR / 2,
            w: ARR, h: ARR, fontSize: 18, color: GOLD, align: 'center', valign: 'middle',
          });
        }
        pos.forEach(([r, c], i) => {
          const step = steps[i];
          const fs = autoFontSize(String(step.label || '') + '  ' + String(step.note || ''), bw, bh, { min: 12, max: 22 });
          goldBox(s, bX(c), bY(r), bw, bh, [
            { text: String(step.label || ''), options: { bold: true, fontSize: fs, breakLine: true, paraSpaceAfter: 8 } },
            { text: String(step.note || ''), options: { italic: true, fontSize: Math.max(10, fs - 3), color: 'AABBD0' } },
          ], { fill: '152347', valign: 'middle', align: 'center' });
        });
      }
    }
  }

  if (variant === 'H') {
    // Video — left: link + watching bullets + optional prompt; right: image placeholder.
    // Questions appear on the WORKSHEET ONLY (videoQSection in buildWorksheetChildren), never here.
    const leftW = CW * 0.56;
    const rightX = MX + leftW + 0.15;
    const rightW = CW - leftW - 0.15;
    let y = sectionHeader(s, ('LEARN · VIDEO · ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const startY = y;
    const vl = item.videoLink || {};
    const videoH = 0.55;
    goldBox(s, MX, y, leftW, videoH, [
      { text: '►  ', options: { color: TEAL, bold: true } },
      { text: vl.text || 'Watch the video', options: { color: TEAL, underline: true, hyperlink: vl.url ? { url: vl.url } : undefined } },
    ], { fontSize: 13, valign: 'middle' });
    y += videoH + GAP;
    const toWatch = arr(item.toWatch);
    const promptH = item.prompt ? 0.55 : 0;
    const watchH = BOT_Y - 0.08 - y - (promptH ? promptH + GAP : 0);
    const watchRuns = [
      { text: '☞  While watching:', options: { bold: true, color: NAVY, fontSize: 13, breakLine: true, paraSpaceAfter: 8 } },
      ...toWatch.map(w => ({ text: '•  ' + String(w), options: { fontSize: 12, breakLine: true, paraSpaceAfter: 6 } })),
    ];
    goldBox(s, MX, y, leftW, watchH, watchRuns, { valign: 'top' });
    if (item.prompt) {
      goldBox(s, MX, BOT_Y - 0.08 - promptH, leftW, promptH, '⏸  ' + item.prompt, { italic: true, fontSize: 12, valign: 'middle' });
    }
    imageOrPlaceholder(s, item, rightX, startY, rightW, BOT_Y - 0.08 - startY);
    // Answer slide — show after students complete worksheet video questions
    const hqs = arr(item.questions).filter(q => typeof q === 'object' && q.a);
    if (hqs.length) {
      const as = pptx.addSlide();
      as.background = { color: BG };
      navBar(as, 'learn');
      let ay = sectionHeader(as, 'LEARN · VIDEO QUESTIONS: ANSWERS', STAGE.learn, TOP);
      ay = purplePenBar(as, ay - GAP + 0.02);
      const rh = (BOT_Y - 0.08 - ay - (hqs.length - 1) * 0.06) / hqs.length;
      hqs.forEach(q => { reviewRow(as, ay, rh, null, q.q || '', q.a || ''); ay += rh + 0.06; });
      bottomBar(as, obj);
    }
  }

  if (variant === 'I') {
    // Flowchart — vertical (default) or horizontal step nodes with arrows.
    // Schema: { variant:'I', heading, nodes:[{label,note?}], orientation:'vertical'|'horizontal', cycle? }
    let y = sectionHeader(s, ('LEARN · ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const nodes = arr(item.nodes).slice(0, 6);
    const orient = String(item.orientation || 'vertical').toLowerCase();
    if (nodes.length) {
      const arrowSz = 0.3;
      if (orient === 'horizontal') {
        const nodeW = (CW - (nodes.length - 1) * arrowSz) / nodes.length;
        const nodeH = Math.min(2.0, (BOT_Y - 0.08 - y) * 0.75);
        const nodeY = y + (BOT_Y - 0.08 - y - nodeH) / 2;
        nodes.forEach((n, i) => {
          const nx = MX + i * (nodeW + arrowSz);
          goldBox(s, nx, nodeY, nodeW, nodeH, [
            { text: String(n.label || ''), options: { bold: true, fontSize: 13, color: GOLD, breakLine: true, paraSpaceAfter: 6 } },
            { text: String(n.note || ''), options: { italic: true, fontSize: 11, color: 'AABBD0' } },
          ], { fill: NAVY, valign: 'middle', align: 'center' });
          if (i < nodes.length - 1) {           // Bug 54: native gold arrow, not a glyph
            const acy = nodeY + nodeH / 2;
            flowArrow(s, nx + nodeW + 0.04, acy, nx + nodeW + arrowSz - 0.04, acy);
          }
        });
        if (item.cycle) {                         // native return arch over the top, last → first
          const firstCX = MX + nodeW / 2;
          const lastCX = MX + (nodes.length - 1) * (nodeW + arrowSz) + nodeW / 2;
          const archH = Math.min(0.45, Math.max(0.15, nodeY - y));
          flowArrow(s, lastCX, nodeY, firstCX, nodeY,
            [lastCX, nodeY - archH, firstCX, nodeY - archH],
            { x: firstCX, y: nodeY - archH, w: lastCX - firstCX, h: archH });
          txt(s, 'cycle', { x: MX, y: nodeY + nodeH + 0.04, w: CW, h: 0.28, fontSize: 12, color: TEAL, italic: true, align: 'center', valign: 'middle' });
        }
      } else {
        const availH = BOT_Y - 0.08 - y;
        const nodeH = Math.max(0.55, (availH - (nodes.length - 1) * arrowSz) / nodes.length);
        const totalH = nodes.length * nodeH + (nodes.length - 1) * arrowSz;
        const nodeW = CW * 0.6;
        const nodeX = MX + (CW - nodeW) / 2;
        const startNy = y + Math.max(0, (availH - totalH) / 2);
        let ny = startNy;
        nodes.forEach((n, i) => {
          goldBox(s, nodeX, ny, nodeW, nodeH, [
            { text: String(n.label || ''), options: { bold: true, fontSize: 13, color: GOLD, breakLine: true, paraSpaceAfter: 4 } },
            { text: String(n.note || ''), options: { italic: true, fontSize: 11, color: 'AABBD0' } },
          ], { fill: NAVY, valign: 'middle', align: 'center' });
          if (i < nodes.length - 1) {           // Bug 54: native gold arrow, not a glyph
            const acx = nodeX + nodeW / 2;
            flowArrow(s, acx, ny + nodeH + 0.03, acx, ny + nodeH + arrowSz - 0.03);
          }
          ny += nodeH + arrowSz;
        });
        if (item.cycle) {                         // native return arch up the left, last → first
          const firstCY = startNy + nodeH / 2;
          const lastCY = startNy + totalH - nodeH / 2;
          const bulge = Math.min(0.55, Math.max(0.2, nodeX - MX));
          flowArrow(s, nodeX, lastCY, nodeX, firstCY,
            [nodeX - bulge, lastCY, nodeX - bulge, firstCY],
            { x: nodeX - bulge, y: startNy, w: nodeW + bulge, h: totalH });
          txt(s, 'cycle continues', { x: MX, y: ny, w: CW, h: 0.28, fontSize: 12, color: TEAL, italic: true, align: 'center', valign: 'middle' });
        }
      }
    }
  }

  if (variant === 'J') {
    // Graph sketch — image/axes left, annotated feature list right.
    // Schema: { variant:'J', heading, axes:{x,y}, features:[{label,description}], instruction? }
    let y = sectionHeader(s, ('LEARN · ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const leftW = CW * 0.52, rightX = MX + leftW + 0.15, rightW = CW - leftW - 0.15;
    const availH = BOT_Y - 0.08 - y;
    const axes = item.axes || {};
    let imgY = y;
    if (axes.x || axes.y) {
      const axH = 0.32;
      goldBox(s, MX, y, leftW, axH, [
        ...(axes.y ? [{ text: String(axes.y), options: { bold: true, fontSize: 11, color: NAVY } }, { text: '  │  ', options: { fontSize: 11, color: '999999' } }] : []),
        ...(axes.x ? [{ text: String(axes.x), options: { bold: true, fontSize: 11, color: NAVY } }] : []),
      ], { fill: 'F0F4FF', valign: 'middle' });
      imgY = y + axH + 0.05;
    }
    imageOrPlaceholder(s, item, MX, imgY, leftW, BOT_Y - 0.08 - imgY);
    const features = arr(item.features);
    if (features.length) {
      const eachH = (availH - (features.length - 1) * GAP) / features.length;
      const clampH = Math.min(1.6, Math.max(0.5, eachH));
      const totalH = features.length * clampH + (features.length - 1) * GAP;
      let fy = y + Math.max(0, (availH - totalH) / 2);
      features.forEach((f) => {
        goldBox(s, rightX, fy, rightW, clampH, [
          { text: String(f.label || ''), options: { bold: true, fontSize: 12, color: NAVY, breakLine: true, paraSpaceAfter: 4 } },
          { text: String(f.description || ''), options: { fontSize: 11 } },
        ], { fill: 'F0F4FF', valign: 'top' });
        fy += clampH + GAP;
      });
    } else if (item.instruction) {
      goldBox(s, rightX, y, rightW, availH, item.instruction, { italic: true, fontSize: 12, color: NAVY, valign: 'middle' });
    }
  }

  if (variant === 'K') {
    // Timeline — horizontal chronological with alternating above/below event boxes. Max 8 events.
    // Schema: { variant:'K', heading, events:[{year,label,detail?}] }
    let y = sectionHeader(s, ('LEARN · ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const events = arr(item.events).slice(0, 8);
    if (events.length) {
      const availH = BOT_Y - 0.08 - y;
      const lineY = y + availH * 0.5 - 0.03;
      s.addShape('rect', { x: MX, y: lineY, w: CW, h: 0.06, fill: { color: NAVY }, line: { type: 'none' } });
      const stepW = CW / events.length;
      // Box width now scales with however much room a low event count actually leaves per
      // step, instead of capping at a fixed 1.55" that strands dead space either side.
      const boxW = Math.min(2.4, stepW - 0.3);
      // spare: 0 at the old 1.55" baseline, 1 at the new 2.4" cap — used to scale box height
      // and font sizes together so a roomy 2-3 event timeline doesn't look under-filled.
      const spare = Math.max(0, Math.min(1, (boxW - 1.55) / (2.4 - 1.55)));
      const boxH = availH * 0.36 * (1 + spare * 0.15);
      const fsScale = 1 + spare * 0.4;
      const tickH = availH * 0.07;
      const markerR = 0.08 + spare * 0.05;
      events.forEach((ev, i) => {
        const cx = MX + i * stepW + stepW / 2;
        const bx = cx - boxW / 2;
        const above = i % 2 === 0;
        const tickY = above ? lineY - tickH : lineY + 0.06;
        const by = above ? lineY - tickH - boxH : lineY + 0.06 + tickH;
        s.addShape('rect', { x: cx - 0.02, y: tickY, w: 0.04, h: tickH, fill: { color: GOLD }, line: { type: 'none' } });
        // Stronger visual anchor than the old thin tick — gold circle matching the Do Now
        // question-number motif used elsewhere in the deck.
        s.addShape('ellipse', { x: cx - markerR, y: lineY + 0.03 - markerR, w: markerR * 2, h: markerR * 2, fill: { color: GOLD }, line: { color: NAVY, width: 1 } });
        goldBox(s, bx, by, boxW, boxH, [
          { text: String(ev.year || ''), options: { bold: true, fontSize: Math.round(11 * fsScale), color: TEAL, breakLine: true, paraSpaceAfter: 2 } },
          { text: String(ev.label || ''), options: { bold: true, fontSize: Math.round(11 * fsScale), color: NAVY, breakLine: true, paraSpaceAfter: 2 } },
          { text: String(ev.detail || ''), options: { fontSize: Math.round(10 * fsScale), color: '555555' } },
        ], { fill: 'FFFFFF', valign: 'top' });
      });
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
  goldBox(s, MX, y, CW, 0.9, question, { fill: BG, bold: true, fontSize: autoFontSize(question, CW, 0.9, { min: 12, max: 22 }), valign: 'middle' });
  y += 0.9 + 0.08;

  // protocol strip + answer box reserve space at the bottom
  const stripH = 0.4, ansH = 0.85;
  const optH = BOT_Y - 0.08 - y - stripH - ansH - 2 * GAP;
  const colW = (CW - 0.15) / 2, rowH = (optH - 0.12) / 2;
  ['A', 'B', 'C', 'D'].forEach((Lt, i) => {
    const cx = MX + (i % 2) * (colW + 0.15);
    const cy = y + Math.floor(i / 2) * (rowH + 0.12);
    goldBox(s, cx, cy, colW, rowH, [
      { text: Lt + '   ', options: { bold: true, fontSize: 16, color: MCQ[Lt].badge } },
      { text: opts[Lt] || '', options: { fontSize: autoFontSize(opts[Lt] || '', colW, rowH, { min: 11, max: 20 }), color: '24323F' } },
    ], { fill: MCQ[Lt].bg, valign: 'middle' });
  });
  y += optH + GAP;
  txt(s, 'THINK (silent)   \u2192   DECIDE   \u2192   SHOW on 3 \u2013 2 \u2013 1', {
    x: MX, y, w: CW, h: stripH, fill: { color: NAVY },
    color: 'FFFFFF', fontSize: 13, align: 'center', valign: 'middle',
  });
  y += stripH + GAP;
  // Answer box — teacher adds entrance animation in PowerPoint to reveal after countdown
  const ansText = '\u2713  Answer: ' + (item.answer || '') + '  \u00B7  ' + (item.explanation || '');
  const ansFs = autoFontSize(ansText, CW, ansH, { min: 10, max: 18 });
  const ansRuns = [
    { text: '\u2713  Answer: ' + (item.answer || '') + '  \u00B7  ', options: { bold: true, fontSize: ansFs } },
    { text: item.explanation || '', options: { fontSize: ansFs } },
  ];
  goldBox(s, MX, y, CW, ansH, ansRuns, { fill: NAVY, color: GOLD, valign: 'middle' }); // M3
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
  imageOrPlaceholder(s, item, MX, y + 0.9, leftW, 2.4);
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
  let y = sectionHeader(s, 'BUILD \u00B7 ' + (item.heading || 'TRUE OR FALSE'), STAGE.build, TOP);
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
  y = sectionHeader(s, 'BUILD \u00B7 ' + (item.heading || 'TRUE OR FALSE') + ': ANSWERS', STAGE.build, TOP);
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

/* ---- BUILD — correctTheStatement (M12-M16) --------------------------------
   General-purpose build task (any lesson, not just test review). 4 statements
   generated the same misconception-based way as trueFalse/MCQ distractors —
   but all 4 are false. 2 columns of 2: each unit = handwritten incorrect
   statement directly above its correction, revealed on the SAME slide as a
   navy/gold box (not a separate answer slide) — 4 lines per column, 8 total. */
function slideCorrectStatement(pptx, L, item) {
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD · CORRECT THE STATEMENT', STAGE.build, TOP);
  txt(s, item.instruction || 'These statements are incorrect. Correct each one in your book.', {
    x: MX, y, w: CW, h: 0.35, italic: true, fontSize: 12, color: '333333', valign: 'middle',
  });
  y += 0.42;

  const statements = arr(item.statements).slice(0, 4);
  const colW = (CW - GAP) / 2;
  const rowH = (BOT_Y - 0.08 - y - GAP) / 2;
  const claimH = rowH * 0.52, correctH = rowH - claimH - GAP * 0.4;
  const profile = item.jitterProfile != null ? item.jitterProfile : 3;

  statements.forEach((st, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = MX + col * (colW + GAP);
    const cy = y + row * (rowH + GAP);
    handwritingBlock(s, cx, cy, colW, claimH, prettyText(st.text || st.claim || ''), {
      fontSize: 20, profile, ruled: false, mode: handwritingMode(L, item),   // 2026-07-05: bigger — 16pt read too small from the back
    });
    goldBox(s, cx, cy + claimH + GAP * 0.4, colW, correctH, [
      { text: '✓  ', options: { bold: true, fontSize: 16, color: GOLD } },
      { text: prettyText(st.correction || ''), options: { fontSize: 15, color: GOLD } },
    ], { fill: NAVY, valign: 'middle' });
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
  const cellH = (BOT_Y - 0.08 - y - (rows - 1) * 0.1) / rows; // M5: removed 0.7 cap
  const sortFs = Math.min(16, Math.max(11, cellH * 14));        // M6: scale font to box height
  items.forEach((it, i) => {
    const cx = MX + (i % 2) * (colW + 0.15);
    const cy = y + Math.floor(i / 2) * (cellH + 0.1);
    goldBox(s, cx, cy, colW, cellH, [
      { text: (i + 1) + '   ', options: { bold: true, fontSize: sortFs, color: AMBER } },
      { text: String(it), options: { fontSize: sortFs } },
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
    const boxH = BOT_Y - 0.08 - y - 0.42;
    const ansFs = Math.min(16, Math.max(11, (boxH / Math.max(1, list.length)) * 14)); // M7
    const runs = list.map((it) => ({ text: '\u00B7  ' + it, options: { fontSize: ansFs, breakLine: true, paraSpaceAfter: 6 } }));
    goldBox(s, cx, y + 0.42, cw2, boxH, runs, { valign: 'top', fill: NAVY, color: GOLD });
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
  const steps = arr(item.steps);
  const warnH = item.warning ? 0.6 : 0;
  const equipment = arr(item.equipment);
  // steps in left ~52%; right = image placeholder + equipment list (image first)
  const hasRight = item.imagePlaceholder !== false || equipment.length;
  const stepsW = hasRight ? CW * 0.52 : CW;
  const rightX = MX + stepsW + 0.15;
  const rightW = CW - stepsW - 0.15;
  const rightH = BOT_Y - 0.08 - y;
  if (equipment.length) {
    const eqH = Math.min(rightH * 0.5, Math.max(0.8, equipment.length * 0.36 + 0.45));
    const eqRuns = [
      { text: 'EQUIPMENT PER GROUP', options: { bold: true, fontSize: 14, color: AMBER, breakLine: true } },
      ...equipment.map((e, i) => ({ text: `• ${e}`, options: { fontSize: 13, color: 'FFFFFF', breakLine: i < equipment.length - 1 } })),
    ];
    if (item.imagePlaceholder !== false) {
      const imgH = rightH - eqH - GAP;
      imageOrPlaceholder(s, item, rightX, y, rightW, imgH);
      goldBox(s, rightX, y + imgH + GAP, rightW, eqH, eqRuns, { fill: NAVY, line: { color: AMBER, width: 2 }, valign: 'top' });
    } else {
      goldBox(s, rightX, y, rightW, eqH, eqRuns, { fill: NAVY, line: { color: AMBER, width: 2 }, valign: 'top' });
    }
  } else if (item.imagePlaceholder !== false) {
    imageOrPlaceholder(s, item, rightX, y, rightW, rightH);
  }
  const stepH = (BOT_Y - 0.08 - y - (warnH ? warnH + GAP : 0) - (steps.length - 1) * GAP) / Math.max(1, steps.length);
  steps.forEach((st, i) => {
    txt(s, String(i + 1), {
      x: MX, y: y + (stepH - 0.42) / 2, w: 0.42, h: 0.42,
      fill: { color: AMBER }, color: 'FFFFFF', bold: true, fontSize: 16, align: 'center', valign: 'middle',
    });
    goldBox(s, MX + 0.55, y, stepsW - 0.55, stepH, String(st), { fontSize: autoFontSize(String(st), stepsW - 0.55, stepH, { min: 12, max: 22 }), valign: 'middle' });
    y += stepH + GAP;
  });
  if (item.warning) {
    goldBox(s, MX, y, stepsW, warnH, [
      { text: 'Warning:  ', options: { bold: true, color: 'CC0000', fontSize: 14 } },
      { text: item.warning, options: { fontSize: 14 } },
    ], { fill: 'FFF3F3', line: { color: 'CC0000', width: 2 }, valign: 'middle' });
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
    const rowH2 = (BOT_Y - 0.08 - y2 - (qa.length - 1) * 0.08) / qa.length;
    qa.forEach((q) => {
      reviewRow(s2, y2, rowH2, null, q.q || '', q.a || '');
      y2 += rowH2 + 0.08;
    });
    bottomBar(s2, obj);
  }

  // Model data slide \u2014 skipped when graphWithData build item present (M5: graphWithData replaces it)
  const rd = (L.worksheetExtras || {}).referenceData;
  const hasGWD = arr(L.build).some((b) => (b.type || b.variant) === 'graphWithData');
  if (rd && Array.isArray(rd.rows) && rd.rows.length && !hasGWD) {
    const s3 = pptx.addSlide();
    s3.background = { color: BG };
    navBar(s3, 'build');
    let y3 = sectionHeader(s3, 'BUILD \u00B7 MODEL DATA', STAGE.build, TOP);
    if (rd.note) {
      txt(s3, rd.note, { x: MX, y: y3, w: CW, h: 0.35, italic: true, fontSize: 12, color: '555555', valign: 'middle' });
      y3 += 0.4;
    }
    const headers = rd.headers || [];
    const colCount = Math.max(headers.length, rd.rows[0] ? arr(rd.rows[0]).length : 1, 1);
    const colW = Array(colCount).fill(CW / colCount);
    const tRows = [];
    if (headers.length) tRows.push(headers.map((h) => ({ text: String(h), options: { fill: { color: NAVY }, color: AMBER, bold: true, fontSize: 18, border: ab(AMBER), valign: 'middle', align: 'center' } })));
    rd.rows.forEach((row) => tRows.push(arr(row).map((cell) => ({ text: String(cell == null ? '' : cell), options: { fill: { color: 'FFFFFF' }, color: NAVY, fontSize: 18, border: ab(NAVY), valign: 'middle', align: 'center' } }))));
    const rowH3 = Math.max(0.55, (BOT_Y - 0.08 - y3) / Math.max(1, tRows.length));
    s3.addTable(tRows, { x: MX, y: y3, w: CW, colW, rowH: Array(tRows.length).fill(rowH3), fontFace: FONT, margin: 0.06, autoPage: false });
    bottomBar(s3, obj);
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

/* ---- BUILD — modelAnswerReview (M4-M11) -----------------------------------
   One slide per test question. Left: handwritten model answer (or, for
   qType:'graph', a standard graph_gen.py plot). Right: navy/gold marking
   panel built from indicative content already extracted (by Claude, at
   authoring time, from the real source mark scheme PDF — this renderer never
   invents marking content). See slide-options-v4.md for the full JSON shape. */
function buildMarkingPanelRuns(item) {
  const runs = [];
  const push = (text, opts) => runs.push({ text, options: opts });

  // M7: navy background, gold text — gold is the base colour throughout the
  // panel (exclusions use a deliberate red accent to flag "wrong" at a glance).
  // Section order (Patryk 2026-07-05): INDICATIVE CONTENT → BANDS → EXCLUSIONARY
  // CLAIMS — three clearly-split blocks. Underline (<u>) renders ONLY on words
  // that MUST be used; nothing else is underlined.
  push('INDICATIVE CONTENT', { bold: true, fontSize: 14, color: GOLD, breakLine: true, paraSpaceAfter: 2 });
  let curGroup = null;
  arr(item.indicativeContent).forEach((ic) => {
    const isObj = ic && typeof ic === 'object';
    const text = isObj ? ic.text : ic;
    const dep = isObj && ic.dependentOn ? `  (dependent on ${ic.dependentOn})` : '';
    // Structural chunking: a sub-heading whenever ic.group changes (Substitution /
    // Answer / Conversion) — visual blocks, not more text.
    const grp = isObj && ic.group ? String(ic.group) : null;
    if (grp && grp !== curGroup) {
      push(grp.toUpperCase(), { bold: true, fontSize: 12, color: 'FFE082', breakLine: true, paraSpaceBefore: 3, paraSpaceAfter: 2 });
      curGroup = grp;
    }
    push('•  ', { fontSize: 14, color: GOLD, bold: true });
    const markupRuns = markupToPptxRuns(prettyText(text), { fontSize: 14, color: GOLD });
    markupRuns.forEach((r) => runs.push(r));
    if (dep) push(dep, { fontSize: 12, italic: true, color: 'FFE082' });
    runs[runs.length - 1] = Object.assign({}, runs[runs.length - 1], {
      options: Object.assign({}, runs[runs.length - 1].options, { breakLine: true, paraSpaceAfter: 4 }),
    });
  });

  if (arr(item.levelDescriptors).length) {
    push(' ', { fontSize: 6, breakLine: true });
    push('BANDS', { bold: true, fontSize: 14, color: GOLD, breakLine: true, paraSpaceAfter: 2 });
    arr(item.levelDescriptors).forEach((ld) => {
      push(`${ld.level || ''} (${ld.range || ''}):  `, { bold: true, fontSize: 13, color: GOLD });
      push(prettyText(ld.desc || ''), { fontSize: 13, color: GOLD, breakLine: true, paraSpaceAfter: 3 });
    });
  }

  if (arr(item.doesNotAward).length) {
    push(' ', { fontSize: 6, breakLine: true });
    push('EXCLUSIONARY CLAIMS', { bold: true, fontSize: 14, color: 'FF8A80', breakLine: true, paraSpaceAfter: 2 });
    arr(item.doesNotAward).forEach((dna) => {
      push(`✗  ${prettyText(dna)}`, { fontSize: 13, color: 'FFCDD2', breakLine: true, paraSpaceAfter: 3 });
    });
  }

  if (item.ecfNote) {
    push(' ', { fontSize: 4, breakLine: true });
    push('ECF:  ', { bold: true, fontSize: 11, color: GOLD });
    push(item.ecfNote, { fontSize: 11, italic: true, color: GOLD, breakLine: true });
  }
  return runs;
}

function slideModelAnswerReview(pptx, L, item) {
  const obj = objectiveText(L);
  const qType = item.qType || 'short';
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  const header = 'BUILD · MODEL ANSWER — Q' + (item.questionNumber || '') + marksTag(item.marks);
  const y = sectionHeader(s, header, STAGE.build, TOP);

  const leftW = CW * 0.48, rightX = MX + leftW + GAP, rightW = CW - leftW - GAP;
  const panelH = BOT_Y - 0.08 - y;
  const profile = item.jitterProfile != null ? item.jitterProfile : 2;

  if (qType === 'graph') {
    const rd = item.graphData;
    const pngPath = rd && rd.rows ? callGraphGen(rd, true) : null;
    if (pngPath) {
      s.addImage({ path: pngPath, x: MX, y, w: leftW, h: panelH });
    } else {
      imagePlaceholder(s, MX, y, leftW, panelH, 'Model graph — add graphData to JSON');
    }
  } else if (qType === 'calculation') {
    handwritingBlock(s, MX, y, leftW, panelH, arr(item.modelAnswer).map(prettyText), { fontSize: 22, profile, ruled: true, mode: handwritingMode(L, item) }); // Bug 53 symbols; 2026-07-05 bigger
  } else {
    handwritingBlock(s, MX, y, leftW, panelH, prettyText(item.modelAnswer || ''), { fontSize: 24, profile, ruled: true, mode: handwritingMode(L, item) });
  }

  goldBox(s, rightX, y, rightW, panelH, buildMarkingPanelRuns(item), {
    fill: NAVY, color: 'FFFFFF', valign: 'top', fontSize: 12, line: { color: GOLD, width: 2 },
  });

  bottomBar(s, obj);
}

/* ---- BUILD — markTheAnswers (peer-assessment) ----------------------------
   Two slides. TASK: the question + 3–4 realistically-flawed sample answers in
   handwriting (jitterProfile varied per sample so they read as different pupils),
   for students to mark. MARK SCHEME: the reused marking panel (buildMarkingPanelRuns)
   on the left + a per-sample verdict column (awarded level/mark, ✓ hits / ✗ misses,
   teacher note) on the right. Reuses the same mark-scheme fields as modelAnswerReview
   (indicativeContent / levelDescriptors / doesNotAward). */
const MTA_JITTER = [1, 3, 2, 4];                 // distinct handwriting per sample slot
const mtaLabel = (sm, i) => sm.label || ('Student ' + String.fromCharCode(65 + i));
function slideMarkTheAnswers(pptx, L, item) {
  const obj = objectiveText(L);
  const samples = arr(item.samples).slice(0, 4);
  const n = Math.max(1, samples.length);
  const leftW = CW * 0.42, rightX = MX + leftW + GAP, rightW = CW - leftW - GAP;
  const vGap = GAP * 0.8, labelH = 0.26;

  // Shared frame — question full-width on TOP, mark scheme panel LEFT, samples
  // RIGHT. Scheme and answers live on the SAME slide so the class can mark from
  // the board alone (no worksheet dependency — Patryk 2026-07-05).
  const frame = (title, instruction) => {
    const s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'build');
    let y = sectionHeader(s, title, STAGE.build, TOP);
    const qH = 0.6;
    const qFs = autoFontSize(item.question, CW, qH, { min: 13, max: 18 });
    goldBox(s, MX, y, CW, qH, [
      { text: 'Q  ', options: { bold: true, fontSize: qFs, color: NAVY } },
      { text: prettyText(item.question || ''), options: { fontSize: qFs } },
    ], { valign: 'middle' });
    y += qH + GAP;
    txt(s, instruction, { x: MX, y, w: CW, h: 0.28, italic: true, fontSize: 12, color: '333333', valign: 'middle' });
    y += 0.34;
    const panelH = BOT_Y - 0.08 - y;
    goldBox(s, MX, y, leftW, panelH, buildMarkingPanelRuns(item), {
      fill: NAVY, color: 'FFFFFF', valign: 'top', fontSize: 13, line: { color: GOLD, width: 2 },
    });
    return { s, y, panelH };
  };

  // --- slide 1: mark the answers (handwritten samples, scheme alongside) ------
  const header = 'BUILD · MARK THE ANSWERS — Q' + (item.questionNumber || '') + marksTag(item.marks);
  const f1 = frame(header, item.instruction || 'Mark each answer against the mark scheme. Give it a level and a mark.');
  const boxH = (f1.panelH - vGap * (n - 1)) / n;
  samples.forEach((sm, i) => {
    const cy = f1.y + i * (boxH + vGap);
    txt(f1.s, mtaLabel(sm, i), {
      x: rightX, y: cy, w: rightW, h: labelH, fill: { color: NAVY }, color: GOLD,
      bold: true, fontSize: 12, align: 'left', valign: 'middle', margin: 6,
    });
    handwritingBlock(f1.s, rightX, cy + labelH, rightW, boxH - labelH, prettyText(sm.text || ''), {
      fontSize: 17, ruled: true, mode: handwritingMode(L, item),
      profile: sm.jitterProfile != null ? sm.jitterProfile : (MTA_JITTER[i] != null ? MTA_JITTER[i] : 2),
    });
  });
  bottomBar(f1.s, obj);

  // --- slide 2: SAME frame, right column = marks awarded + what they were for -
  const f2 = frame('BUILD · MARK THE ANSWERS: MARKS AWARDED', 'How many marks did each answer earn — and what were they for?');
  const vH = (f2.panelH - vGap * (n - 1)) / n;
  samples.forEach((sm, i) => {
    const vy = f2.y + i * (vH + vGap);
    const mk = sm.awardedMarks != null ? sm.awardedMarks + (item.marks ? '/' + item.marks : '') : '';
    const runs = [
      { text: mtaLabel(sm, i) + '   ', options: { bold: true, fontSize: 14, color: NAVY } },
      { text: [sm.awardedLevel || '', mk].filter(Boolean).join(' · '), options: { bold: true, fontSize: 14, color: AMBER, breakLine: true, paraSpaceAfter: 3 } },
    ];
    const hits = arr(sm.hits), misses = arr(sm.misses);
    hits.forEach((h, k) => runs.push({ text: '✓ ' + prettyText(h) + '   ', options: { fontSize: 12, color: GREEN_OK, breakLine: k === hits.length - 1 } }));
    misses.forEach((m, k) => runs.push({ text: '✗ ' + prettyText(m) + '   ', options: { fontSize: 12, color: 'B71C1C', breakLine: k === misses.length - 1 } }));
    if (sm.comment) runs.push({ text: prettyText(sm.comment), options: { italic: true, fontSize: 12, color: '333333' } });
    goldBox(f2.s, rightX, vy, rightW, vH, runs, { valign: 'top', fontSize: 13 });
  });
  bottomBar(f2.s, obj);
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

  txt(s, 'WORKED EXAMPLE', { x: x1, y, w: colW, h: 0.38, fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 14, align: 'center', valign: 'middle' });
  txt(s, 'YOUR TURN', { x: x2, y, w: colW, h: 0.38, fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 14, align: 'center', valign: 'middle' });
  y += 0.38 + GAP;
  const promptH = 0.85;
  const wpFs = autoFontSize(worked.prompt, colW, promptH, { min: 16, max: 24 });
  goldBox(s, x1, y, colW, promptH, toPptxRuns(parseEq(worked.prompt || ''), { fontSize: wpFs }), { valign: 'middle' }); // Bug 53: typeset equation notation in the prompt
  const ypFs = autoFontSize(yourTurn.prompt, colW, promptH, { min: 16, max: 24 });
  goldBox(s, x2, y, colW, promptH, toPptxRuns(parseEq(yourTurn.prompt || ''), { fontSize: ypFs }), { valign: 'middle' });
  y += promptH + GAP;
  const panelH = BOT_Y - 0.08 - y;
  if (annotate) {
    annotationZone(s, x1, y, Math.min(5.5, colW), Math.min(4.0, panelH));
    s.addNotes('Worked example steps (work live):\n' + arr(worked.steps).map((st, i) => `${i + 1}. ${st}`).join('\n'));
  } else {
    const allSteps = arr(worked.steps).join(' ');
    const stepFs = autoFontSize(allSteps, colW, panelH, { min: 16, max: 20, linesHint: arr(worked.steps).length });
    const runs = arr(worked.steps).flatMap((st, idx) => {
      const eqRuns = toPptxRuns(parseEq(st), {fontSize:stepFs});
      if (!eqRuns.length) eqRuns.push({text:'', options:{fontSize:stepFs}});
      eqRuns[0] = Object.assign({}, eqRuns[0], {text:`${idx+1}.  `+eqRuns[0].text});
      eqRuns[eqRuns.length-1] = Object.assign({}, eqRuns[eqRuns.length-1], {options:Object.assign({},eqRuns[eqRuns.length-1].options,{breakLine:true,paraSpaceAfter:8})});
      return eqRuns;
    });
    goldBox(s, x1, y, colW, panelH, runs, { valign: 'top' });
  }
  // Answer panel — dark NAVY; teacher adds entrance animation in PowerPoint to reveal
  if (yourTurn.answer) {
    const aFs = autoFontSize(yourTurn.answer, colW, panelH, { min: 16, max: 20 });
    goldBox(s, x2, y, colW, panelH, toPptxRuns(parseEq(yourTurn.answer), { fontSize: aFs, color: 'FFFFFF' }), { fill: NAVY, valign: 'top' }); // Bug 53: typeset working (× ÷ fractions)
  } else {
    slideRect(s, x2, y, colW, panelH);
  }
  bottomBar(s, obj);
}
function slideRect(slide, x, y, w, h) {
  slide.addShape('rect', { x, y, w, h, fill: { color: 'FFFFFF' }, line: GOLD2 });
}

/* drawFormulaTriangle(x, y, w, h, {top, bottomLeft, bottomRight})
   White vector triangle with a horizontal + vertical divider — the classic
   physics "formula triangle". Never a raster image. */
function drawFormulaTriangle(slide, x, y, w, h, symbols) {
  const top = String((symbols && symbols.top) || 'A');
  const bl = String((symbols && symbols.bottomLeft) || 'B');
  const br = String((symbols && symbols.bottomRight) || 'C');
  const apexX = x + w / 2;
  const f = 0.42; // fraction down the slanted side where the divider sits
  const Ly = y + f * h;
  slide.addShape('triangle', { x, y, w, h, fill: { color: 'FFFFFF' }, line: { color: NAVY, width: 2 } });
  slide.addShape('line', { x: x + w * (1 - f) / 2, y: Ly, w: w * f, h: 0, line: { color: NAVY, width: 1.5 } });
  slide.addShape('line', { x: apexX, y: Ly, w: 0, h: (y + h) - Ly, line: { color: NAVY, width: 1.5 } });
  txt(slide, top, { x: x + w * 0.25, y: y + (Ly - y) * 0.1, w: w * 0.5, h: (Ly - y) * 0.75, color: NAVY, bold: true, fontSize: 16, align: 'center', valign: 'middle' });
  txt(slide, bl, { x, y: Ly + 0.02, w: w * 0.5, h: (y + h) - Ly - 0.04, color: NAVY, bold: true, fontSize: 14, align: 'center', valign: 'middle' });
  txt(slide, br, { x: apexX, y: Ly + 0.02, w: w * 0.5, h: (y + h) - Ly - 0.04, color: NAVY, bold: true, fontSize: 14, align: 'center', valign: 'middle' });
}

/* ---- BUILD — guessExample (GUESS-scaffolded worked example, ONE slide) ----
   Distinct from `workedExample` (which is the two-column Worked/Your-Turn
   type). This is the Given–Unknown–Equation–Substitute–Solve walkthrough,
   approved 2026-07-02: navy/gold throughout, vector formula triangle, gold
   Solve banner.
   Schema: { type:'guessExample', topic?, given, unknown, equation,
             equationSymbols?:{top,bottomLeft,bottomRight}, substitute, solve } */
function slideGuessExample(pptx, L, item) {
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD · WORKED EXAMPLE' + (item.topic ? ' · ' + String(item.topic).toUpperCase() : ''), STAGE.build, TOP);
  // Narrower right panel than the first cut (was 0.34/0.66) — the text inside
  // didn't need the full 66% width, so the left label column gets more breathing room.
  const leftW = CW * 0.38, rightX = MX + leftW + GAP, rightW = CW - leftW - GAP;
  const availH = BOT_Y - 0.08 - y;
  // Weighted row heights — Equation row gets noticeably more height than the other four so
  // the formula triangle has room to breathe instead of fighting for space in an equal-fifth row.
  const ROW_WEIGHTS = [0.85, 0.85, 1.6, 0.85, 0.85];
  const weightUnit = availH / ROW_WEIGHTS.reduce((a, b) => a + b, 0);
  const rowHeights = ROW_WEIGHTS.map((w) => w * weightUnit);
  const rowY = [];
  rowHeights.forEach((h, i) => { rowY.push(i === 0 ? y : rowY[i - 1] + rowHeights[i - 1]); });
  const rows = [
    { letter: 'G', prompt: 'What are you given?', content: item.given || '' },
    { letter: 'U', prompt: 'What is unknown?', content: item.unknown || '' },
    { letter: 'E', prompt: 'What is the equation?', content: null },
    { letter: 'S', prompt: 'Substitute the numbers', content: item.substitute || '' },
    { letter: 'S', prompt: 'Solve (add units)', content: item.solve || '' },
  ];
  // one navy panel spans the full right column height — rows drawn on top of it
  s.addShape('rect', { x: rightX, y, w: rightW, h: availH, fill: { color: NAVY }, line: GOLD2 });
  rows.forEach((r, i) => {
    const ry = rowY[i];
    const rowH = rowHeights[i];
    const isLast = i === rows.length - 1;
    // left label column
    s.addShape('roundRect', { x: MX, y: ry + (rowH - 0.42) / 2, w: 0.42, h: 0.42, rectRadius: 0.06, fill: { color: GOLD }, line: { type: 'none' } });
    txt(s, r.letter, { x: MX, y: ry + (rowH - 0.42) / 2, w: 0.42, h: 0.42, color: NAVY, bold: true, fontSize: 18, align: 'center', valign: 'middle' });
    txt(s, r.prompt, { x: MX + 0.55, y: ry, w: leftW - 0.55, h: rowH, color: NAVY, bold: isLast, fontSize: 13, valign: 'middle' });
    // divider between rows (skip before first row)
    if (i > 0) s.addShape('line', { x: rightX, y: ry, w: rightW, h: 0, line: { color: GOLD, width: 1 } });
    if (i === 2) {
      // equation row: text + vector formula triangle — bigger triangle, more padding around it
      const eqSegs = parseEq(item.equation || '');
      const triW = 1.4, triPad = 0.2;
      // Bug 33/53 phase 3: stacked fraction in the E row when it fits; diagonal fallback
      if (!renderEqShapes(s, eqSegs, { x: rightX + 0.2, y: ry + 0.06, w: rightW - triW - triPad - 0.2, h: rowH - 0.12 }, { fontSize: 20, color: GOLD, bold: true, align: 'left' })) {
        txt(s, toPptxRuns(eqSegs, { fontSize: 20, color: GOLD, bold: true }), { x: rightX + 0.2, y: ry, w: rightW - triW - triPad - 0.2, h: rowH, color: GOLD, valign: 'middle', margin: 0 });
      }
      const triH = Math.min(1.35, rowH - 0.2);
      drawFormulaTriangle(s, rightX + rightW - triW - triPad, ry + (rowH - triH) / 2, triW, triH, item.equationSymbols || {});
    } else if (isLast) {
      // Solve row — gold banner echoing the reviewRow answer style, bold + larger
      const fs = autoFontSize(r.content, rightW, rowH, { min: 16, max: 24 });
      txt(s, r.content, { x: rightX + 0.15, y: ry, w: rightW - 0.3, h: rowH, color: GOLD, bold: true, fontSize: Math.max(fs, 17), valign: 'middle' });
    } else {
      const fs = autoFontSize(r.content, rightW, rowH, { min: 15, max: 22 });
      txt(s, r.content, { x: rightX + 0.15, y: ry, w: rightW - 0.3, h: rowH, color: GOLD, fontSize: fs, valign: 'middle' });
    }
  });
  bottomBar(s, obj);
}

/* ---- BUILD — practiceTriangle ("I do → we do → you do" independent practice) ----
   Follows a Learn-F equation intro and a guessExample worked example: 3 short
   calculation questions on the left, the same equation + formula triangle
   pinned on the right as a live reference. Scaffolded by the reference, not by
   a GUESS table — this is the independent-practice step.
   Schema: { type:"practiceTriangle", topic?, questions:[{q,a,marks?}], equation,
             equationSymbols?:{top,bottomLeft,bottomRight} } */
function slidePracticeTriangle(pptx, L, item) {
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD · YOUR TURN' + (item.topic ? ' · ' + String(item.topic).toUpperCase() : ''), STAGE.build, TOP);
  const leftW = CW * 0.65, rightX = MX + leftW + GAP, rightW = CW - leftW - GAP;
  const bottom = BOT_Y - 0.08;
  const qs = arr(item.questions).slice(0, 3);
  const n = Math.max(1, qs.length);
  const cardH = (bottom - y - (n - 1) * 0.08) / n;
  qs.forEach((q, qi) => {
    const qText = prettyText(q.q || '') + marksTag(q.marks); // 2026-07-05: superscripts/symbols
    const qFs = autoFontSize(qText, leftW, cardH, { min: 12, max: 22 });
    goldBox(s, MX, y + qi * (cardH + 0.08), leftW, cardH, [
      { text: `Q${qi + 1}  `, options: { bold: true, fontSize: qFs } },
      { text: qText, options: { fontSize: qFs } },
    ], { valign: 'middle' });
  });
  // Answers go to speaker notes, not the slide — this is independent practice, checked live.
  if (qs.some((q) => q.a)) {
    s.addNotes('Answers:\n' + qs.map((q, i) => `${i + 1}. ${q.a || ''}`).join('\n'));
  }
  // right column: equation reference, standalone and larger since it's alone in the column
  const availH = bottom - y;
  txt(s, 'EQUATION', { x: rightX, y, w: rightW, h: 0.35, color: NAVY, bold: true, fontSize: 13, align: 'center' });
  const eqY = y + 0.35 + GAP;
  const eqH = Math.min(1.1, availH * 0.22);
  s.addShape('rect', { x: rightX, y: eqY, w: rightW, h: eqH, fill: { color: 'FFFFFF' }, line: GOLD2 });
  // Bug 33/53 phase 3: stacked fraction in the reference box when it fits; diagonal fallback
  const ptEqSegs = parseEq(item.equation || '');
  if (!renderEqShapes(s, ptEqSegs, { x: rightX + 0.1, y: eqY, w: rightW - 0.2, h: eqH }, { fontSize: 22, color: NAVY, bold: true })) {
    txt(s, toPptxRuns(ptEqSegs, { fontSize: 22, color: NAVY, bold: true }), { x: rightX + 0.1, y: eqY, w: rightW - 0.2, h: eqH, valign: 'middle', align: 'center', margin: 0 });
  }
  const triAvailH = availH - 0.35 - GAP - eqH - GAP;
  const triY = eqY + eqH + GAP;
  const triSize = Math.min(rightW - 0.3, triAvailH);
  drawFormulaTriangle(s, rightX + (rightW - triSize) / 2, triY + (triAvailH - triSize) / 2, triSize, triSize, item.equationSymbols || {});
  bottomBar(s, obj);
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
    // axes — labels omitted; graph image carries its own axis labels
    s.addShape('line', { x: ax, y: ay, w: 0, h: ah, line: { color: NAVY, width: 1.5 } });
    s.addShape('line', { x: ax, y: ay + ah, w: aw, h: 0, line: { color: NAVY, width: 1.5 } });
    if (item.annotationZone) {
      annotationZone(s, ax + 0.05, ay + 0.05, aw - 0.1, ah - 0.1);
    } else if (item.imagePlaceholder !== false) {
      imageOrPlaceholder(s, item, ax + 0.05, ay + 0.05, aw - 0.1, ah - 0.1);
    }
    return MX + fw + 0.15;
  };

  // M4: single slide \u2014 Q in navy/white box, A in navy/gold box below; teacher animates A boxes to reveal
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 READ THE GRAPH: ANSWERS', STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);
  const h = BOT_Y - 0.08 - y;
  const rx = drawFrame(s, y, h);
  const rw = SW - rx - MX;
  const ph = (h - (qs.length - 1) * GAP) / Math.max(1, qs.length);
  const innerGap = 0.04;
  const qH = (ph - innerGap) * 0.4;
  const aH = (ph - innerGap) * 0.6;
  qs.forEach((q, i) => {
    const sy = y + i * (ph + GAP);
    const qBody = prettyText(q.q || '') + marksTag(q.marks); // 2026-07-05: superscripts/symbols
    const qFs = autoFontSize(`Q${i + 1}  ` + qBody, rw, qH, { min: 11, max: 15 });
    goldBox(s, rx, sy, rw, qH, [
      { text: `Q${i + 1}  `, options: { bold: true, fontSize: qFs, color: GOLD } },
      { text: qBody, options: { fontSize: qFs, color: 'FFFFFF' } },
    ], { fill: NAVY, line: { color: GOLD, width: 2 }, valign: 'middle' });
    goldBox(s, rx, sy + qH + innerGap, rw, aH, prettyText(q.a || ''), {
      fill: NAVY, color: GOLD, line: { color: GOLD, width: 2 },
      fontSize: autoFontSize(q.a || '', rw, aH, { min: 11, max: 15 }), valign: 'middle',
    });
  });
  bottomBar(s, obj);
}

/* ---- callGraphGen — spawns graph_gen.py, returns temp PNG path ------------- */
// M1: fixed Python script called via execSync; M9: cross-platform py command
function callGraphGen(rd, compact) {
  try {
    const t      = Date.now();
    const inP    = path.join(os.tmpdir(), `gg_in_${t}.json`);
    const outP   = path.join(os.tmpdir(), `gg_out_${t}.png`);
    const py     = process.platform === 'win32' ? 'python' : 'python3';
    const script = path.join(__dirname, 'graph_gen.py');
    fs.writeFileSync(inP, JSON.stringify(Object.assign({}, rd, { compact: !!compact, outPath: outP })));
    _tmpFiles.push(inP, outP);                                  // M10: cleaned up after writeFile
    cp.execSync(`${py} "${script}" "${inP}"`, { stdio: 'pipe' });
    return outP;
  } catch (e) {
    console.error('[graph_gen]', e.message || e);
    return null;
  }
}

/* ---- BUILD — graphResults (Variant A: 70% graph + 30% analysis panel) ----- */
function slideGraphResults(pptx, L, item) {                     // M4
  const rd = (L.worksheetExtras || {}).referenceData;
  if (!rd || !rd.rows) return;
  const pngPath = callGraphGen(rd, false);
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  const y = sectionHeader(s, 'BUILD · RESULTS GRAPH', STAGE.build, TOP);
  const availH = BOT_Y - 0.08 - y;
  const gW  = CW * 0.70;
  const pW  = CW - gW - GAP;
  const pX  = MX + gW + GAP;
  if (pngPath) {
    s.addImage({ path: pngPath, x: MX, y, w: gW, h: availH }); // 70% left: graph
  } else {
    const desc = rd ? `Graph of ${arr(rd.headers)[1] || 'y'} against ${arr(rd.headers)[0] || 'x'}` : null;
    imagePlaceholder(s, MX, y, gW, availH, desc);
  }
  s.addShape('rect', { x: pX, y, w: pW, h: availH, fill: { color: NAVY2 }, line: GOLD2 });
  const notes    = arr(item.graphNotes || []);
  const remarkH  = item.closingRemark ? 0.7 : 0;
  const headH    = 0.45;
  const noteH    = notes.length ? (availH - headH - remarkH - 0.15) / notes.length : 0;
  txt(s, 'Reading the graph', {
    x: pX + 0.1, y: y + 0.05, w: pW - 0.2, h: headH,
    bold: true, fontSize: 13, color: GOLD, align: 'center', valign: 'middle',
  });
  notes.forEach((note, i) => {
    txt(s, [{ text: `${i + 1}  `, options: { bold: true, color: GOLD } }, { text: note }], {
      x: pX + 0.1, y: y + headH + 0.1 + i * (noteH + 0.05), w: pW - 0.2, h: noteH,
      fontSize: 11, color: 'FFFFFF', valign: 'top',
    });
  });
  if (item.closingRemark) {
    txt(s, item.closingRemark, {
      x: pX + 0.1, y: BOT_Y - 0.08 - remarkH, w: pW - 0.2, h: remarkH,
      italic: true, fontSize: 11, color: GOLD, align: 'center', valign: 'middle',
    });
  }
  bottomBar(s, obj);
}

/* ---- BUILD — graphWithData (Variant B: 50% data table + 50% compact graph) */
function slideGraphWithData(pptx, L, item) {                    // M5
  const rd = (L.worksheetExtras || {}).referenceData;
  if (!rd || !rd.rows) return;
  const pngPath = callGraphGen(rd, true);                       // M3: compact=true → no stats box
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  const y = sectionHeader(s, 'BUILD · DATA + GRAPH', STAGE.build, TOP);
  const availH  = BOT_Y - 0.08 - y;
  const halfW   = (CW - GAP) / 2;
  const gX      = MX + halfW + GAP;
  // left: data table — same style as model-data slide (amber header, navy/white rows)
  const headers  = rd.headers || [];
  const colCount = Math.max(headers.length, rd.rows[0] ? arr(rd.rows[0]).length : 1, 1);
  const colW     = Array(colCount).fill(halfW / colCount);
  const tRows    = [];
  if (headers.length) tRows.push(headers.map((h) => ({ text: String(h), options: { fill: { color: NAVY }, color: AMBER, bold: true, fontSize: 15, border: ab(AMBER), valign: 'middle', align: 'center' } })));
  rd.rows.forEach((row) => tRows.push(arr(row).map((cell) => ({ text: String(cell == null ? '' : cell), options: { fill: { color: 'FFFFFF' }, color: NAVY, fontSize: 15, border: ab(NAVY), valign: 'middle', align: 'center' } }))));
  const rowH = Math.max(0.45, availH / Math.max(1, tRows.length));
  s.addTable(tRows, { x: MX, y, w: halfW, colW, rowH: Array(tRows.length).fill(rowH), fontFace: FONT, margin: 0.06, autoPage: false });
  if (pngPath) {
    s.addImage({ path: pngPath, x: gX, y, w: halfW, h: availH }); // right: compact graph
  } else {
    const desc = `Graph of ${arr(rd.headers)[1] || 'y'} against ${arr(rd.headers)[0] || 'x'}`;
    imagePlaceholder(s, gX, y, halfW, availH, desc);
  }
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
  const ref = lessonBookRef(L);
  if (ref) {
    // top-right dark-blue / gold reference tag, overlaid on the header band
    txt(s, ref, { x: SW - 4.6, y: TOP, w: 4.5, h: 0.38, fill: { color: NAVY },
      color: GOLD, bold: true, fontSize: 10.5, align: 'right', valign: 'middle', margin: 6 });
  }
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
          { text: prettyText(q.q) + marksTag(q.marks), options: { fontSize: qFs } }, // 2026-07-05: superscripts/symbols
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
  let y = purplePenBar(s, 1.04);
  const bottom = BOT_Y - 0.08;
  const n = questions.length;
  const rowH = (bottom - y - (n - 1) * 0.06) / n;       // fill the slide — no dead space
  questions.forEach((q) => {
    reviewRow(s, y, rowH, tier, q.q || '', q.a || '');   // verbatim question
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
    goldBox(s, MX, y + 0.4, CW, 2.5, prettyText(r.q || ''), { fill: BG, bold: true, fontSize: 24, align: 'center', valign: 'middle' });
    bottomBar(s, obj);
    // answer slide
    s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'build');
    y = sectionHeader(s, head + ' \u00B7 ANSWER', STAGE.build, TOP);
    goldBox(s, MX, y, CW, 2.0, prettyText(r.q || ''), { fill: BG, bold: true, fontSize: 20, align: 'center', valign: 'middle' });
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
  const hdrH = 0.38;
  const availH = BOT_Y - 0.08 - y;
  const expH = item.explanation ? Math.min(availH * 0.30, 1.3) : 0;
  const resH = availH - hdrH - (expH > 0 ? expH + GAP : 0) - GAP;

  txt(s, 'YOUR PREDICTION', {
    x: MX, y, w: colW, h: hdrH,
    fill: { color: AMBER }, color: 'FFFFFF', bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  goldBox(s, MX, y + hdrH, colW, resH, item.prediction || '', { italic: true, fontSize: 16, valign: 'middle' });

  const rx = MX + colW + 0.2;
  txt(s, 'WHAT ACTUALLY HAPPENS', {
    x: rx, y, w: colW, h: hdrH,
    fill: { color: NAVY }, color: GOLD, bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  goldBox(s, rx, y + hdrH, colW, resH, item.reveal || '', { fill: NAVY, line: { color: GOLD, width: 2 }, bold: true, fontSize: 16, color: GOLD, valign: 'middle' });

  y += hdrH + resH + GAP;

  if (item.explanation && expH > 0.2) {
    goldBox(s, MX, y, CW, expH, [
      { text: 'WHY:  ', options: { bold: true, fontSize: 13, color: NAVY } },
      { text: item.explanation, options: { fontSize: 13 } },
    ], { valign: 'middle' });
  }
  bottomBar(s, obj);
}

/* M7: image_dump — verification grid appended last; Patryk deletes before sharing */
function slideImageDump(pptx, L) {
  const rd = (L.worksheetExtras || {}).referenceData;
  const autoImages = [];
  if (rd && rd.rows) {
    const pngPath = callGraphGen(rd, false);
    if (pngPath) autoImages.push({ path: pngPath, label: 'Results graph' });
  }
  const userImages = Array.isArray((L.image_dump || {}).images) ? L.image_dump.images : [];
  const images = [...autoImages, ...userImages];
  if (!images.length) return;

  const s = pptx.addSlide();
  s.background = { color: BG };

  // Navy header bar with gold title — house style, makes "delete me" obvious without amber tint
  const headerH = 0.5;
  txt(s, 'IMAGE DUMP — DELETE BEFORE SHARING', {
    x: 0, y: 0, w: SW, h: headerH,
    fill: { color: NAVY }, color: GOLD, bold: true,
    fontSize: 14, align: 'center', valign: 'middle',
  });
  // Gold accent line below header (matches navBar style)
  s.addShape('rect', { x: 0, y: headerH, w: SW, h: ACC_H, fill: { color: GOLD }, line: { type: 'none' } });

  const COLS = Math.min(3, images.length);   // max 3 per row per spec
  const rows = Math.ceil(images.length / COLS);
  const cellW = CW / COLS;
  const labelH = 0.30;
  const startY = headerH + ACC_H + GAP;
  const availH = BOT_Y - 0.08 - startY;
  const cellH = availH / rows;
  const imgH = Math.max(0.3, cellH - labelH - GAP * 0.5);

  images.forEach((img, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = MX + col * cellW;
    const y = startY + row * cellH;
    const iw = cellW - GAP;
    try {
      if (img.path && fs.existsSync(img.path)) {
        s.addImage({ path: img.path, x, y, w: iw, h: imgH });
      } else {
        imagePlaceholder(s, x, y, iw, imgH, img.label || 'no path');
      }
    } catch (_) {
      imagePlaceholder(s, x, y, iw, imgH, img.label || 'load error');
    }
    // Gold italic label below each image (always gold — unassigned shown grey-gold)
    txt(s, img.label || 'unassigned', {
      x, y: y + imgH + 0.04, w: iw, h: labelH,
      color: img.label ? GOLD : '9E8020',
      fontSize: 10, align: 'center', valign: 'top', italic: true,
    });
  });
}

/* 6-mark rule: an extended (non-calculation) question worth ≥6 marks must carry
   ≥6 indicative-content points — match points to marks. Non-fatal, logged like
   the B9 MCQ-count check so the shortfall is visible without breaking the build. */
function checkSixMarkRule(L) {
  const topic = (L.meta || {}).topic || (L.meta || {}).title || 'unknown';
  const scan = (q, where) => {
    if (!q || typeof q !== 'object') return;
    const calc = String(q.qType || '').toLowerCase() === 'calculation';
    if ((q.marks || 0) >= 6 && !calc) {
      // Band-marked questions are exempt (2026-07-05): when levelDescriptors are
      // present, marks are lost via the BANDS, not the indicative-point count —
      // ≥6 points is not a forced rule there.
      if (arr(q.levelDescriptors).length) return;
      const n = arr(q.indicativeContent).length;
      if (n < 6) console.error(`[build] 6-mark rule: ${topic} — ${where} "${String(q.q || q.questionText || '').slice(0, 40)}" has ${n} indicative point(s) for ${q.marks} marks`);
    }
  };
  TIERS.forEach((t) => arr(L.apply && L.apply[t]).map(normQ).forEach((q) => scan(q, 'Apply ' + t)));
  TIERS.forEach((t) => arr(L.review && L.review[t]).map(normQ).forEach((q) => scan(q, 'Review ' + t)));
  arr(L.review && L.review.questions).map(normQ).forEach((q) => scan(q, 'Review'));
  arr(L.build).forEach((b) => { if ((b.type || b.variant) === 'modelAnswerReview') scan(b, 'Build model answer'); });
}

/* renderBuildSlides — dispatch each Build item to its slide(s). Shared by the
   standard/practical/annotation path and the review path (so Build activities
   reach review slides too). Visualiser is handled by the caller, not here. */
function renderBuildSlides(pptx, L, buildItems) {
  arr(buildItems).forEach((b) => {
    const bt = (b.type || b.variant || 'mcq');
    if (bt === 'mcq') slideMcq(pptx, L, b);
    else if (bt === 'mcq_image') slideMcqImage(pptx, L, b);
    else if (bt === 'sort') slideSort(pptx, L, b);
    else if (bt === 'trueFalse') slideTrueFalse(pptx, L, b);
    else if (bt === 'practical') slidePractical(pptx, L, b);
    else if (bt === 'misconception') slideMisconception(pptx, L, b);
    else if (bt === 'workedExample') slideWorkedExample(pptx, L, b);
    else if (bt === 'guessExample') slideGuessExample(pptx, L, b);
    else if (bt === 'practiceTriangle') slidePracticeTriangle(pptx, L, b);
    else if (bt === 'errorAnalysis') slideErrorAnalysis(pptx, L, b);
    else if (bt === 'graphInterpret') slideGraphInterpret(pptx, L, b);
    else if (bt === 'graphResults') slideGraphResults(pptx, L, b);   // M4
    else if (bt === 'graphWithData') slideGraphWithData(pptx, L, b); // M5
    else if (bt === 'predictThenCheck' || bt === 'predict_then_check') slidePredictThenCheck(pptx, L, b);
    else if (bt === 'modelAnswerReview') slideModelAnswerReview(pptx, L, b);   // M4-M11
    else if (bt === 'correctTheStatement') slideCorrectStatement(pptx, L, b);  // M12-M16
    else if (bt === 'markTheAnswers') slideMarkTheAnswers(pptx, L, b);
    // 'visualiser' handled by the caller
  });
}

/* ---- PPTX assembly ------------------------------------------------------------ */
async function buildPptx(L, outPath) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';                                  // 13.33 × 7.5
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };

  const type = (L.meta.lessonType || L.meta.type || 'standard').toLowerCase();
  checkSixMarkRule(L);
  // Bug 57: the renderer reads flat apply.developing/reaching/mastering and
  // review.questions — a nested `.tiers.X.qs` shape is silently dropped. Warn
  // loudly rather than coerce, so the authoring gets fixed (no real lesson uses it).
  ['apply', 'review'].forEach((k) => {
    if (L[k] && L[k].tiers) console.error(`[build] "${k}.tiers" is not read — use flat ${k}.developing/reaching/mastering (this content is being dropped)`);
  });
  const buildItems = arr(L.build);
  const visItem = buildItems.find((b) => (b.type || b.variant) === 'visualiser');
  if ((type === 'standard' || type === 'practical') && buildItems.length) {
    const mcqCount = buildItems.filter((b) => ['mcq', 'mcq_image'].includes(b.type || b.variant)).length;
    if (mcqCount !== 4) console.error(`[build] MCQ count ${mcqCount} ≠ 4 in "${(L.meta || {}).topic || 'unknown'}"`); // M3: B9 error not warn
  }

  slideTitleDoNow(pptx, L);                                     // questions embedded — always
  slideDoNowAnswers(pptx, L);

  if (type === 'standard' || type === 'practical' || type === 'annotation') {
    slideEngage(pptx, L);
    arr(L.learn).slice(0, 4).forEach((it) => slideLearn(pptx, L, it));
    renderBuildSlides(pptx, L, buildItems);
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
  } else if (type === 'review') {
    // Bug 55: review lessons are content-heavy — render ALL Learn slides (no
    // slice(0,4) cap), matching the revision branch. No Engage (matches the
    // review 8-slide order in SKILL.md). Build items DO render here so
    // markTheAnswers / modelAnswerReview reach the review slides.
    arr(L.learn).forEach((it) => slideLearn(pptx, L, it));
    renderBuildSlides(pptx, L, buildItems);
    slideVisualiser(pptx, L, visItem);                          // mandatory (auto-generated) — matches the documented review sequence
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
  } else {
    // unknown type — treat as standard (keep the 4-Learn cap)
    slideEngage(pptx, L);
    arr(L.learn).slice(0, 4).forEach((it) => slideLearn(pptx, L, it));
    renderBuildSlides(pptx, L, buildItems);
    slideVisualiser(pptx, L, visItem);
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
  }

  slideImageDump(pptx, L);                                       // M7: always last
  await pptx.writeFile({ fileName: outPath });
  const usesHandwriting = buildItems.some((b) => ['modelAnswerReview', 'correctTheStatement', 'markTheAnswers'].includes(b.type || b.variant));
  if (usesHandwriting) embedCaveatFont(outPath);                  // M2: embed Caveat so it survives on any machine
  while (_tmpFiles.length) { try { fs.unlinkSync(_tmpFiles.pop()); } catch {} }
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
// Section divider colours — pastel fill + dark left border matched to PPTX STAGE colours
const DIVIDER_THEME = {
  'DO NOW':           { fill: 'E0E6F5', border: '0D1B5E' },
  'BUILD':            { fill: 'FFF3E0', border: 'E65100' },
  'APPLY':            { fill: 'FFEBEE', border: 'B71C1C' },
};

const P = (children, opts) => new Paragraph(Object.assign({ children: arr(children) }, opts || {}));
const R = (text, opts) => new TextRun(Object.assign({ text: String(text) }, opts || {}));
// M6: standardised paragraph-spacing scale (twips) — replaces the previous scattered
// 0/10/20/30/40/60/80/120/160 mix. Line spacing (1.5x, BDA rule) is untouched — see ~L2745.
const GAP_NONE = 0;   // tightly-grouped lines within one scaffold block
const GAP_XS = 10;    // hint/annotation lines directly under a question
const GAP_SM = 20;    // list items, sub-parts, between question blocks, before/after tables
const GAP_MD = 40;    // after section titles/headers, around embedded images
const blanks = (n) => Array.from({ length: n }, () => new Paragraph({ spacing: { before: GAP_NONE, after: GAP_NONE } }));
const spacer = () => new Paragraph({ spacing: { before: GAP_SM, after: GAP_SM } }); // M1: before/after tables

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

/* divider(text) — full-width pastel bar; fill + left border matched to PPTX STAGE colour for that section */
function divider(text, rightRef) {
  const theme = DIVIDER_THEME[String(text).toUpperCase()] || { fill: 'EEF1F8', border: '003366' };
  const leftB = { style: BorderStyle.SINGLE, size: 36, color: theme.border };
  const titleCellArgs = { fill: theme.fill, borders: { ...NO_B, left: leftB }, margins: { top: 60, bottom: 60, left: 180, right: 80 }, children: [P(R(String(text).toUpperCase(), { bold: true, size: 28, color: theme.border }))] };
  if (rightRef) {
    // Two-column: title left, textbook reference top-right in dark blue on gold.
    const refW = 5600, titleW = PAGE_W - refW;
    return [spacer(), new Table({
      width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: [titleW, refW], borders: NO_TBL_B,
      rows: [new TableRow({ children: [
        cell({ w: titleW, ...titleCellArgs }),
        cell({ w: refW, fill: '003366', borders: NO_B, margins: { top: 60, bottom: 60, left: 100, right: 160 },
          children: [P(R(rightRef, { bold: true, size: 18, color: 'FFD700' }), { alignment: AlignmentType.RIGHT })] }),
      ] })],
    }), spacer()];
  }
  return [spacer(), new Table({
    width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: [PAGE_W], borders: NO_TBL_B,
    rows: [new TableRow({ children: [cell({ w: PAGE_W, ...titleCellArgs })] })],
  }), spacer()];
}

/* tierBadge(tier) — narrow pill, 1800 DXA */
function tierBadge(tier) {
  const pastel = { developing: 'E8F5E9', reaching: 'FFF3E0', mastering: 'FFEBEE' };
  return [spacer(), new Table({
    width: { size: 1800, type: WidthType.DXA }, columnWidths: [1800], borders: NO_TBL_B,
    rows: [new TableRow({
      children: [cell({
        w: 1800, fill: pastel[tier] || 'F5F5F5', margins: { top: 40, bottom: 40, left: 140, right: 140 },
        children: [P(R(cap(tier), { bold: true, size: 18, color: TIER_DOCX[tier] || '333333' }), { alignment: AlignmentType.CENTER, border: { left: { style: BorderStyle.SINGLE, size: 24, color: 'FFD700' } } })],
      })],
    })],
  })];
}

/* wordBank(terms[]) — Developing only; caller enforces */
function wordBank(terms) {
  const runs = [R('Word bank: ', { bold: true, size: 22, color: '1E5C2D' })];
  arr(terms).forEach((t, i) => {
    if (i) runs.push(R(' \u00B7 ', { italic: true, size: 22, color: '1E5C2D' }));
    runs.push(R(t, { italic: true, size: 22, color: '1E5C2D' }));
  });
  return P(runs, { spacing: { before: GAP_SM, after: GAP_SM } }); // M3
}

/* question(num, text, marks?) (+ optional subParts[]) */
function question(num, text, marks, subParts) {
  const out = [P([
    R(`Q${num}  `, { bold: true, size: 24 }),
    R(prettyText(text), { size: 24 }),   // 2026-07-05: superscripts/symbols typeset in every worksheet question
  ], { spacing: { before: GAP_SM, after: marks ? GAP_NONE : GAP_SM } })]; // M3: between question blocks
  // C4: marks right-aligned on its own line, colour-muted so it reads as annotation
  if (marks) {
    out.push(P(R(`[${marks} ${marks > 1 ? 'marks' : 'mark'}]`, { size: 20, color: '888888' }),
      { alignment: AlignmentType.RIGHT, spacing: { before: GAP_NONE, after: GAP_SM } })); // M3
  }
  arr(subParts).forEach((sp) => {
    out.push(P(R(sp, { size: 24 }), { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } })); // M3
  });
  return out;
}

/* answerBox(marks) — lines by marks */
function answerBox(marks) {
  const base = (marks == null || marks <= 1) ? 1 : marks <= 3 ? 3 : 5;
  const n = base;
  const rowH = n * 360;  // AT_LEAST: 360 twips (0.25") per answer line — prevents Google Docs collapse
  return [fullTable([new TableRow({
    height: { value: rowH, rule: HeightRule.AT_LEAST },
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

/* diagramOrImage(prac) — renders embeddedImagePath if present, else diagramBox.
   Cap: full content width (674px ≈ 7"), max 288px tall (3" ≈ 8cm) per spec. */
function diagramOrImage(prac) {
  if (prac.imageConfidence === 'search' && prac.embeddedImagePath) { // M6: match PPTX condition
    try {
      const imgData = fs.readFileSync(prac.embeddedImagePath);
      const ext = (path.extname(prac.embeddedImagePath).slice(1) || 'png').toLowerCase();
      return [spacer(), new Paragraph({
        children: [new ImageRun({ data: imgData, transformation: { width: 674, height: 288 }, type: ext })],
        alignment: AlignmentType.CENTER,
        spacing: { after: GAP_MD }, // M2
      }), spacer()];
    } catch (_) {}
  }
  return diagramBox(prac.imageDescription || '[Equipment / apparatus diagram — teacher inserts]', 8); // M6: use imageDescription in fallback
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

/* guessScaffold(mode, vals?) — mode: 'full' | 'backward-fade' | 'blank' | 'answer'
   'full': Given + Unknown pre-filled (vals.given, vals.unknown), rest blank — Developing.
   'backward-fade': Given/Unknown/Equation/Substitute pre-filled (vals.given, vals.unknown,
     vals.equation, vals.substitute), only Solve blank — Reaching on new_procedure, or any
     tier's genuine first exposure to a procedure this unit.
   'blank': entire row blank — known_procedure once a tier has already seen it worked.
   'answer': all five cells filled (given, unknown, equation, substitute, solve) with NO
     write-lines — the model-answer sheet's filled GUESS framework; Solve cell emphasised.
   Back-compat: guessScaffold(given, unknown) (two string args, no mode) behaves as 'full'. */
function guessScaffold(mode, vals) {
  let pre;
  const isAns = mode === 'answer';
  if (mode === 'backward-fade') {
    vals = vals || {};
    pre = [vals.given, vals.unknown, vals.equation, vals.substitute, null];
  } else if (mode === 'blank') {
    pre = [null, null, null, null, null];
  } else if (isAns) {
    vals = vals || {};
    pre = [vals.given, vals.unknown, vals.equation, vals.substitute, vals.solve];
  } else {
    // 'full' (default)
    vals = vals || {};
    pre = [vals.given, vals.unknown, vals.equation || null, null, null];
  }
  const colW = [2021, 2021, 2021, 2021, 2022];
  const heads = ['G', 'U', 'E', 'S', 'S'];
  return [spacer(), fullTable([
    new TableRow({
      children: heads.map((h, i) => cell({
        w: colW[i], fill: NAVY, borders: GREY_TBL, margins: { top: 50, bottom: 50, left: 60, right: 60 },
        children: [P(R(h, { bold: true, size: 20, color: GOLD }), { alignment: AlignmentType.CENTER })],
      })),
    }),
    new TableRow({
      children: colW.map((w, i) => {
        const emph = isAns && i === 4;                                  // Solve cell — the final answer
        const kids = pre[i] != null && pre[i] !== ''
          ? (isAns
              ? [P(toDocxRuns(parseEq(String(pre[i])), { size: 20, bold: emph, color: emph ? NAVY : undefined }))]
              : [P(toDocxRuns(parseEq(String(pre[i])), { size: 18 })), ...blanks(2)])
          : (isAns ? [P(R('', { size: 20 }))] : blanks(3));
        return cell({
          w, fill: emph ? 'FFF8E1' : undefined,
          borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: kids,
        });
      }),
    }),
  ], colW, GREY_TBL), spacer()];
}

/* ---- ANSWER SHEET (mode 'answers') — model-answer frameworks ---------------
   answerFramework(q) picks the framework; answerReveal(q, tier) renders it
   interleaved under the question. Mirrors slideModelAnswerReview's qType logic
   so the printed answer sheet and the on-screen model-answer slide agree. */
function answerFramework(q) {
  const override = String(q.answerStyle || '').toLowerCase();
  if (['guess', 'indicative', 'graph', 'plain'].includes(override)) return override;
  const qType = String(q.qType || '').toLowerCase();
  if (qType === 'graph') return 'graph';
  const hasGuess = q.given != null || q.unknown != null || q.substitute != null || q.solve != null;
  if (qType === 'calculation' || hasGuess) return 'guess';
  if ((q.marks || 0) >= 6 || q.contentType === 'extended_writing' || arr(q.indicativeContent).length) return 'indicative';
  return 'plain';
}

/* plainAnswerCallout(text) — short model answer as a navy-left-border callout. */
function plainAnswerCallout(text) {
  const t = prettyText(text || '');
  return [fullTable([new TableRow({
    children: [
      cell({ w: 120, fill: NAVY, children: [new Paragraph({})] }),
      cell({
        w: PAGE_W - 120, fill: 'F3F6FC', margins: { top: 80, bottom: 80, left: 160, right: 160 },
        children: [P([R('Model answer:  ', { bold: true, size: 20, color: NAVY }), R(t, { size: 22 })])],
      }),
    ],
  })], [120, PAGE_W - 120]), spacer()];
}

/* markingPanelDocx(q) — DOCX analogue of buildMarkingPanelRuns: navy panel,
   gold text; level descriptors + INDICATIVE CONTENT bullets (chunked by
   ic.group when present — structural blocks, not more text) + DOES NOT AWARD.
   No dingbat glyphs (Century Gothic lacks ✗/✎ → font substitution); bullets
   use "•" (safe) and colour to distinguish awarded vs not-awarded. */
function markingPanelDocx(q) {
  const kids = [];
  const gold = (text, opts) => P(R(text, Object.assign({ color: GOLD, size: 22 }, opts || {})), { spacing: { before: GAP_XS, after: GAP_XS } });
  // Section order (Patryk 2026-07-05): INDICATIVE CONTENT → BANDS → EXCLUSIONARY CLAIMS.
  kids.push(gold('INDICATIVE CONTENT', { bold: true, size: 24 }));
  // Chunk by ic.group when authors supply it (e.g. Substitution / Answer / Conversion).
  const items = arr(q.indicativeContent);
  const groups = [], byName = new Map();
  items.forEach((ic) => {
    const g = (ic && typeof ic === 'object' && ic.group) ? String(ic.group) : '';
    if (!byName.has(g)) { byName.set(g, []); groups.push(g); }
    byName.get(g).push(ic);
  });
  groups.forEach((g) => {
    if (g) kids.push(P(R(g.toUpperCase(), { bold: true, size: 20, color: 'FFE082' }), { spacing: { before: GAP_SM, after: GAP_XS }, indent: { left: 120 } }));
    byName.get(g).forEach((ic) => {
      const isObj = ic && typeof ic === 'object';
      const text = isObj ? ic.text : ic;
      const dep = isObj && ic.dependentOn ? `  (dependent on ${ic.dependentOn})` : '';
      kids.push(P([
        R('•  ', { bold: true, size: 22, color: GOLD }),
        ...markupToDocxRuns(prettyText(text), { size: 22, color: GOLD }),   // <u> = must-use word only
        ...(dep ? [R(dep, { italics: true, size: 18, color: 'FFE082' })] : []),
      ], { spacing: { before: GAP_XS, after: GAP_XS }, indent: { left: g ? 240 : 120 } }));
    });
  });
  arr(q.levelDescriptors).forEach((ld, i) => {
    if (i === 0) kids.push(gold('BANDS', { bold: true, size: 24 }));
    kids.push(P([
      R(`${ld.level || ''} (${ld.range || ''}):  `, { bold: true, size: 22, color: GOLD }),
      R(prettyText(ld.desc || ''), { size: 22, color: GOLD }),
    ], { spacing: { before: GAP_XS, after: GAP_SM } }));
  });
  arr(q.doesNotAward).forEach((dna, i) => {
    if (i === 0) kids.push(P(R('EXCLUSIONARY CLAIMS', { bold: true, size: 22, color: 'FF8A80' }), { spacing: { before: GAP_SM, after: GAP_XS } }));
    kids.push(P([R('•  ', { bold: true, size: 20, color: 'FF8A80' }), R(prettyText(dna), { size: 20, color: 'FFCDD2' })],
      { spacing: { before: GAP_XS, after: GAP_XS }, indent: { left: 120 } }));
  });
  if (q.ecfNote) kids.push(P([R('ECF:  ', { bold: true, size: 18, color: GOLD }), R(prettyText(q.ecfNote), { italics: true, size: 18, color: GOLD })], { spacing: { before: GAP_SM, after: GAP_XS } }));
  return [fullTable([new TableRow({
    children: [cell({ w: PAGE_W, fill: NAVY, margins: { top: 120, bottom: 120, left: 200, right: 200 }, children: kids })],
  })], [PAGE_W]), spacer()];
}

/* answerReveal(q, tier) — interleaved model answer under a question on the
   answer sheet, dispatched by answerFramework(q). */
function answerReveal(q, tier) {
  const fw = answerFramework(q);
  if (fw === 'guess') {
    return guessScaffold('answer', {
      given: q.given, unknown: q.unknown, equation: q.equation || q.equationHint,
      substitute: q.substitute, solve: q.solve != null ? q.solve : q.a,
    });
  }
  if (fw === 'indicative') return markingPanelDocx(q);
  if (fw === 'graph') return plainAnswerCallout((q.a || q.modelAnswer || '') + '  (see model graph on the slide)');
  return plainAnswerCallout(q.a || q.modelAnswer || '');
}

/* structureGuide(lines[]) — italic frames; "(a / b)" options grey */
function structureGuide(lines) {
  return arr(lines).map((l) => {
    const m = String(l).match(/^(.*?)(\([^()]*\/[^()]*\))\s*$/);
    const runs = m
      ? [R(m[1], { italic: true, size: 20 }), R(' ' + m[2], { size: 18, color: '555555' })]
      : [R(l, { italic: true, size: 20 })];
    return P(runs, { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } }); // M3
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
  return [fullTable(rows, [PAGE_W])];
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
      children: [P(R(text, { italic: true, size: 22, color: NAVY }))],
    })],
  })], [PAGE_W]), spacer()];
}

/* sortTableDocx — grey borders, NOT gold */
function sortTableDocx(categories) {
  const cats = categories || { A: 'Group A', B: 'Group B' };
  const keys = Object.keys(cats);
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

/* sectionLabel(text) — sub-section bar, softer than divider() */
function sectionLabel(text) {
  const leftB = { style: BorderStyle.SINGLE, size: 24, color: 'FFD700' };
  return [spacer(), new Table({
    width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: [PAGE_W], borders: NO_TBL_B,
    rows: [new TableRow({ children: [cell({ w: PAGE_W, fill: 'EEF1F8', borders: { ...NO_B, left: leftB }, margins: { top: 40, bottom: 40, left: 160, right: 80 }, children: [P(R(text, { bold: true, size: 24, color: '003366' }))] })] })],
  })];
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
    return P(runs, { spacing: { before: GAP_SM, after: GAP_SM } }); // M3
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
    const leftKids = [P(R(term, { bold: true, size: 20 }))];
    rows.push(new TableRow({
      children: [
        cell({ w: colW[0], fill: i % 2 ? 'F5F5F5' : 'FFFFFF', borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: leftKids }),
        cell({ w: colW[1], fill: i % 2 ? 'F5F5F5' : 'FFFFFF', borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: blanks(2) }),
      ],
    }));
  });
  return [spacer(), fullTable(rows, colW, GREY_TBL), spacer()];
}

/* writeLines(n) — hairline ruled lines for working space; support worksheet only.
   Callers must be wrapped in if (scaffolded). */
function writeLines(n) {
  const count = n || 2;
  const rows = Array.from({ length: count }, () => new TableRow({
    cantSplit: true,
    height: { value: 200, rule: HeightRule.EXACT },
    children: [cell({
      w: PAGE_W,
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' }, bottom: B_NONE, left: B_NONE, right: B_NONE },
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      children: [new Paragraph({})],
    })],
  }));
  return [fullTable(rows, [PAGE_W]), spacer()];
}

/* ---- Starfield header ------------------------------------------------------- */
// ponytail: PNG is always bundled in the skill package — Python regeneration was dead code
function getStarfield() {
  const candidates = [
    path.join(__dirname, 'starfield_header_FINAL.png'),
    path.join(__dirname, 'references', 'starfield_header_FINAL.png'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  console.warn('  ! starfield_header_FINAL.png not found — worksheet header image omitted');
  return null;
}

function worksheetHeader(L) {
  const out = [];
  const sf = getStarfield();
  if (sf) {
    out.push(new Paragraph({
      children: [new ImageRun({ data: fs.readFileSync(sf), transformation: { width: 674, height: 54 }, type: 'png' })],
      spacing: { after: GAP_MD }, // M2
    }));
  }
  // topic only — never class name, never Name/Class/Date
  out.push(P(R(L.meta.title || L.meta.topic || '', { bold: true, size: 36, color: NAVY }), { spacing: { after: GAP_MD } })); // M2
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
        out.push(P([R(`${i + 1}   `, { bold: true, size: 20 }), R(st.text || '', { size: 20 }), R('   (True / False)', { size: 18, italic: true, color: '666666' })], { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } })); // M3
      });
    } else if (bt === 'workedExample' && b.yourTurn && b.yourTurn.prompt) {
      out.push(...question(++state.n, b.yourTurn.prompt));
      if (mode === 'answers' && b.yourTurn.answer) out.push(...plainAnswerCallout(b.yourTurn.answer));
    } else if (bt === 'errorAnalysis') {
      out.push(...question(++state.n, 'Spot the mistake in this working, then write the corrected line:'));
      arr(b.wrongWorking).forEach((ln, i) => {
        out.push(P([R(`${i + 1}   `, { bold: true, size: 20 }), R(ln, { size: 20 })], { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } })); // M3
      });
    } else if (bt === 'graphInterpret') {
      arr(b.questions).forEach((q) => { out.push(...question(++state.n, q.q, q.marks)); if (mode === 'answers') out.push(...answerReveal(q)); });
    } else if (bt === 'practiceTriangle') {
      if (b.equation) {
        out.push(P([
          new TextRun({ text: 'Use: ', italics: true, size: 22, color: NAVY }),
          ...toDocxRuns(parseEq(b.equation), { size: 22, color: NAVY }),
        ], { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } }));
      }
      arr(b.questions).forEach((q) => { out.push(...question(++state.n, q.q, q.marks)); if (mode === 'answers') out.push(...answerReveal(q)); });
    } else if (bt === 'misconception') {
      out.push(...question(++state.n, 'A student says: \u201C' + (b.claim || '') + '\u201D  Explain why this is wrong.'));
    } else if (bt === 'predictThenCheck' || bt === 'predict_then_check') {
      const pq = (b.setup ? b.setup + '  ' : '') + (b.prediction || 'What do you predict will happen?');
      out.push(...question(++state.n, pq));
      // M6: E9 label removed — write-line is self-explanatory
      if (b.reveal && !scaffolded) {
        out.push(P(R('What actually happens:', { bold: true, size: 22, color: '1B5E20' }), { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } })); // M3
        out.push(P(R(b.reveal, { italic: true, size: 22, color: '1B5E20' }), { indent: { left: 720 }, spacing: { before: GAP_NONE, after: GAP_SM } })); // M3
      }
    } else if (bt === 'markTheAnswers') {
      // Peer-assessment: the question + sample answers to mark. Standard/support:
      // space to annotate + a level/mark line. Answers mode: awarded level/marks,
      // MPs hit (green) / missed (red), teacher note, then the full mark scheme.
      // No ✓/✗ glyphs — Century Gothic lacks them (font substitution). Colour +
      // • bullets distinguish awarded from not-awarded, matching markingPanelDocx.
      out.push(...question(++state.n, b.question || '', b.marks));
      out.push(P(R(b.instruction || 'Mark each answer against the mark scheme. Give it a level and a mark.', { italic: true, size: 20, color: '555555' }), { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_SM } }));
      const maxMk = b.marks || '';
      arr(b.samples).forEach((sm, i) => {
        const label = sm.label || ('Student ' + String.fromCharCode(65 + i));
        out.push(fullTable([
          new TableRow({ children: [cell({ w: PAGE_W, fill: NAVY, margins: { top: 40, bottom: 40, left: 160, right: 160 }, children: [P(R(label, { bold: true, size: 20, color: GOLD }))] })] }),
          new TableRow({ children: [cell({ w: PAGE_W, borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [P(R(prettyText(sm.text || ''), { size: 22 }))] })] }),
        ], [PAGE_W], GREY_TBL));
        if (mode === 'answers') {
          const mk = sm.awardedMarks != null ? String(sm.awardedMarks) + (maxMk ? '/' + maxMk : '') : '';
          out.push(P([R('Awarded:  ', { bold: true, size: 20, color: NAVY }), R([sm.awardedLevel || '', mk].filter(Boolean).join('  ·  '), { bold: true, size: 20, color: 'C05A00' })], { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } }));
          arr(sm.hits).forEach((h) => out.push(P([R('•  ', { bold: true, size: 20, color: '1B5E20' }), R(prettyText(h), { size: 20, color: '1B5E20' })], { indent: { left: 480 }, spacing: { before: GAP_NONE, after: GAP_NONE } })));
          arr(sm.misses).forEach((m) => out.push(P([R('•  ', { bold: true, size: 20, color: '9B1B1B' }), R('missed: ' + prettyText(m), { size: 20, color: '9B1B1B' })], { indent: { left: 480 }, spacing: { before: GAP_NONE, after: GAP_NONE } })));
          if (sm.comment) out.push(P(R(prettyText(sm.comment), { italic: true, size: 18, color: '555555' }), { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_SM } }));
        } else {
          out.push(P([R('Level: ', { bold: true, size: 20 }), R('__________', { size: 20 }), R('    Mark: ', { bold: true, size: 20 }), R('____' + (maxMk ? ' / ' + maxMk : ''), { size: 20 })], { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } }));
          out.push(...blanks(1));
        }
      });
      if (mode === 'answers') out.push(...markingPanelDocx(b));
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
  const bank = wx.wordBank || (!NO_WORD_BANK.has((L.meta || {}).class) ? arr((L.title || {}).keywords) : []); // M5: B13

  // word bank: Developing tier only; split-developing forces it — but only ONCE (on the
  // first tier rendered) rather than repeating identically above every tier.
  const showBank = ((tier === 'developing' && wx.wordBank) || (mode === 'developing' && bank.length)) && bank.length > 2;
  if (showBank && tier === 'developing' && mode !== 'answers') {
    out.push(wordBank(bank));
  }
  if (o.links && o.links[tier] && mode !== 'answers') out.push(...linksBar(o.links[tier]));

  // answers mode: question + model answer only (no scaffolds / blank boxes / word bank)
  if (mode === 'answers') {
    qs.forEach((q, i) => {
      out.push(...question(i + 1, q.q, o.marks ? q.marks : null, q.subParts));
      out.push(...answerReveal(q, tier));
    });
    return out;
  }

  qs.forEach((q, i) => {
    out.push(...question(i + 1, q.q, o.marks ? q.marks : null, q.subParts));
    if (q.diagram) out.push(...diagramBox(typeof q.diagram === 'string' ? q.diagram : null, q.diagramLines || 8));
    const calc = (q.qType || '').toLowerCase() === 'calculation';
    // support mode: equation and units hint printed above the GUESS scaffold
    if (mode === 'developing' && calc && (q.equationHint || q.equation)) {
      const eqHint = q.equationHint || q.equation;
      const unitsStr = q.units ? '  Give your answer in ' + q.units + '.' : '';
      out.push(P([
        new TextRun({ text: 'Use: ', italics: true, size: 22, color: NAVY }),
        ...toDocxRuns(parseEq(eqHint), { size: 22, color: NAVY }),
        ...(unitsStr ? [new TextRun({ text: unitsStr, italics: true, size: 22, color: NAVY })] : []),
      ], { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } })); // M3
    }
    let guessAdded = false;
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
      if (scaffoldMode) { out.push(...guessScaffold(scaffoldMode, { given: q.given, unknown: q.unknown, equation: q.equation, substitute: q.substitute })); guessAdded = true; }
    }
    if (q.structure) out.push(...structureGuide(q.structure));

    // B3/B4: structured writing scaffolds on support sheet — replace starters + answer box when fired
    let scaffoldRendered = false;
    if (mode === 'developing' && (q.qType || '').toLowerCase() === 'practical_design') {
      // B3: practical design — method prompt above free lines
      // No dingbat glyphs (pencil/arrow) — Century Gothic lacks them, which forces Word to
      // silently substitute a fallback font (seen as Nova Mono / Arial Unicode MS) for that run.
      out.push(P(R('Include in your method:', { bold: true, size: 22, color: NAVY }), { indent: { left: 360 }, spacing: { before: GAP_NONE, after: GAP_NONE } })); // M6
      ['how you set up the equipment',
        'what you change and by how much',
        'what you measure and what you use to measure it',
        'what you keep the same'].forEach(line => {
        out.push(P(R('-  ' + line, { size: 22, color: '444444' }), { indent: { left: 540 }, spacing: { before: GAP_NONE, after: GAP_NONE } })); // M6
      });
      scaffoldRendered = true;
    } else if (mode === 'developing' && q.contentType === 'extended_writing' && (q.marks || 0) >= 5) {
      // B4: explanation scaffold — prompts above free lines
      out.push(P(R('To answer this question:', { bold: true, size: 22, color: NAVY }), { indent: { left: 360 }, spacing: { before: GAP_NONE, after: GAP_NONE } })); // M6
      ['What changes? (name the effect)',
        'Why does this happen? (the mechanism or reason)',
        'What does this mean? (the consequence)'].forEach(line => {
        out.push(P(R('-  ' + line, { size: 22, color: '444444' }), { indent: { left: 540 }, spacing: { before: GAP_NONE, after: GAP_NONE } })); // M6
      });
      scaffoldRendered = true;
    }

    // B5: subSteps — lettered sub-questions with a write line each (support sheet only)
    if (!scaffoldRendered && mode === 'developing' && arr(q.subSteps).length) {
      arr(q.subSteps).forEach((step, si) => {
        const letter = String.fromCharCode(97 + si);
        out.push(P(R('(' + letter + ')  ' + step, { size: 20 }), { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } })); // M3
      });
      scaffoldRendered = true;
    }

    // sentence starters: extended_writing questions get tier-appropriate density at every tier, never zero
    const isExtendedWriting = q.contentType === 'extended_writing' || (q.marks || 0) >= 4;
    const starterOk = !scaffoldRendered && q.starters && (isExtendedWriting || mode === 'developing' || q.forceStarters);
    if (starterOk) out.push(...sentenceStarters(q.starters));
    if (!scaffoldRendered && !guessAdded && o.boxes && q.marks) out.push(...answerBox(q.marks));
  });
  return out;
}

function buildWorksheetChildren(L, mode) {
  const type = String(L.meta.worksheet || 'A').toUpperCase();
  const wx = L.worksheetExtras || {};
  const ch = [...worksheetHeader(L)];
  // answers mode: a marking-copy banner so a printed answer sheet is never mistaken for a pupil sheet
  if (mode === 'answers') {
    ch.push(fullTable([new TableRow({
      children: [cell({
        w: PAGE_W, fill: NAVY, margins: { top: 80, bottom: 80, left: 160, right: 160 },
        children: [P([R('MODEL ANSWERS', { bold: true, size: 26, color: GOLD }), R('  —  marking copy', { size: 22, color: 'FFFFFF' })])],
      })],
    })], [PAGE_W]), spacer());
  }
  const bstate = { n: 0 };
  const doNowQs = arr(L.doNow && L.doNow.questions);

  const doNowSection = () => {
    if (!doNowQs.length) return;
    // Answer sheet is the mark scheme for the Apply/Build sections ONLY — Do Now
    // answers already live on the DoNow Answers slide, so they never print here
    // (Patryk 2026-07-05).
    if (mode === 'answers') return;
    ch.push(...divider('DO NOW'));
    const kwSrc = arr(L.doNow && L.doNow.keywords).length
      ? arr(L.doNow.keywords)
      : arr((L.title || {}).keywords);
    const qChildren = [];
    doNowQs.forEach((q, i) => {
      qChildren.push(...question(i + 1, q.q || ''));
      if (mode === 'answers') {
        qChildren.push(P([R('Answer:  ', { bold: true, size: 22, color: NAVY }), R(prettyText(q.a || ''), { size: 22 })],
          { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_SM } }));
      } else if (mode === 'developing' && q.hint) {
        qChildren.push(P(R(q.hint, { italic: true, size: 22, color: '555555' }), { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } })); // M3
      }
    });
    // answers mode: questions + answers only — no keyword reference box
    if (kwSrc.length && mode !== 'answers') {
      const maxKwLen = kwSrc.reduce((m, kw) => Math.max(m, (typeof kw === 'string' ? kw : kw.term || String(kw)).length), 9);
      const rightW = Math.min(Math.round(PAGE_W * 0.35), maxKwLen * 130 + 600);
      const leftW = PAGE_W - rightW;
      const bGold = { style: BorderStyle.SINGLE, size: 6, color: GOLD };
      const kwBorder = { top: bGold, bottom: bGold, left: bGold, right: bGold };
      const kwChildren = [
        P(R('Key words', { bold: true, size: 22, color: NAVY }), { spacing: { before: GAP_SM, after: GAP_SM } }), // M2
        ...kwSrc.map(kw => P(R('•  ' + (typeof kw === 'string' ? kw : kw.term || String(kw)), { size: 22 }), { spacing: { before: GAP_SM, after: GAP_SM } })), // M3
      ];
      ch.push(fullTable([new TableRow({
        ...(mode === 'developing' && { height: { value: 1440, rule: HeightRule.AT_LEAST } }),
        children: [
          cell({ w: leftW, valign: 'top', children: qChildren, margins: { top: 40, bottom: 40, left: 0, right: 180 } }),
          cell({ w: rightW, valign: 'top', borders: kwBorder, children: kwChildren, margins: { top: 80, bottom: 80, left: 140, right: 140 } }),
        ],
      })], [leftW, rightW]));
    } else {
      ch.push(...qChildren);
    }
  };
  // support sheet only: a key-term definition table with write-space on the sheet
  const definitionSection = () => {
    if (mode !== 'developing') return;
    const learnBTerms = arr(L.learn)
      .filter(i => ['B', 'KEYWORDS', 'WRITE_IN_BOOK'].includes(String(i.variant || '').toUpperCase()))
      .flatMap(i => arr(i.definitions));
    const alreadyDefined = new Set([
      ...learnBTerms.map(d => String(d.term || d).toLowerCase()),
      ...arr(L.learn).filter(i => String(i.variant || '').toUpperCase() === 'F')
        .flatMap(i => arr(i.components).map(c => String(c.name || '').toLowerCase())),
    ]);
    const terms = arr(wx.definitions).length
      ? arr(wx.definitions).filter(t => !alreadyDefined.has(String(t.term || t).toLowerCase()))
      : learnBTerms;
    if (!terms.length) return;
    ch.push(...divider('KEY WORDS'));
    ch.push(P(R('Write what each key word means. Use the word bank and your notes to help.', { italic: true, size: 18, color: '555555' }), { spacing: { before: GAP_SM, after: GAP_SM } })); // M2
    ch.push(...definitionTable(terms));
  };
  // optional cloze/gap-fill section, driven by worksheetExtras.cloze
  const clozeSection = () => {
    const sentences = arr(wx.cloze);
    if (!sentences.length) return;
    ch.push(...divider('FILL IN THE GAPS'));
    const bank = wx.clozeWordBank || wx.wordBank || (!NO_WORD_BANK.has((L.meta || {}).class) ? arr((L.title || {}).keywords) : []); // M5: B13
    if (bank.length > 2) ch.push(wordBank(bank));
    ch.push(...clozeDocx(sentences));
  };
  const buildSection = () => {
    const blocks = buildQuestionBlocks(L, bstate, mode);
    if (!blocks.length) return;
    ch.push(...divider('BUILD'));
    ch.push(...blocks);
  };
  const videoQSection = () => {
    const hItems = arr(L.learn).filter(item => String(item.variant || 'A').toUpperCase() === 'H' && arr(item.questions).length);
    if (!hItems.length) return;
    ch.push(...divider('VIDEO QUESTIONS'));
    hItems.forEach(item => {
      arr(item.questions).forEach((q, i) => ch.push(...question(i + 1, q.q || '')));
    });
  };
  const applySection = (o) => {
    if (!L.apply) return;
    ch.push(...divider('APPLY', lessonBookRef(L)));   // textbook ref top-right of the Apply title
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
              P(R(`Q${i + j + 1}`, { bold: true, size: 20, color: GOLD }), { shading: shade(NAVY), spacing: { after: GAP_SM } }), // M3
              P(R(q.q, { size: 20 })),
              ...blanks(4),
            ] : [new Paragraph({})],
          });
        }),
      }));
    }
    if (rows.length) { ch.push(spacer(), fullTable(rows, colW, GREY_TBL), spacer()); }
  } else if (type === 'E') {                             // practical
    const prac = arr(L.build).find((b) => (b.type || b.variant) === 'practical') || {};
    if (wx.intro || prac.intro) ch.push(...contextBox(wx.intro || prac.intro));
    if (prac.embeddedImagePath || prac.imagePlaceholder !== false) ch.push(...diagramOrImage(prac));
    if (arr(prac.steps).length) {
      ch.push(...sectionLabel('Method'));
      arr(prac.steps).forEach((st, i) => ch.push(P([R(`${i + 1}.  `, { bold: true, size: 20 }), R(st, { size: 20 })], { spacing: { before: GAP_SM, after: GAP_SM } }))); // M3
    }
    ch.push(...sectionLabel('Variables'));
    ch.push(...variablesTable());
    ch.push(...divider('RESULTS'));
    const res = wx.results || {};
    ch.push(...resultsTable(res.headers || ['', '', ''], res.rows == null ? 5 : res.rows));
    applySection({});                                    // conclusion questions — write in books
  } else if (type === 'G') {                             // video companion
    if (arr(wx.videoQuestions).length) {
      ch.push(...sectionLabel('Video questions'));
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
    clozeSection();
    videoQSection();
    // practical experiment section — diagram + results + conclusion questions (never strip)
    const pracA = arr(L.build).find((b) => (b.type || b.variant) === 'practical');
    if (pracA) {
      ch.push(...divider(pracA.heading || pracA.title || 'EXPERIMENT')); // M2: B6 derive heading from item
      if (pracA.intro && pracA.worksheetIntro !== false) ch.push(...contextBox(pracA.intro)); // M7: E11
      if (pracA.embeddedImagePath || pracA.imagePlaceholder !== false) ch.push(...diagramOrImage(pracA));
      const resA = wx.results || {};
      const rd = wx.referenceData;
      if (resA.headers) {
        ch.push(...resultsTable(resA.headers, resA.rows == null ? 5 : resA.rows));
      } else if (rd && arr(rd.headers).length) {
        // no explicit results table — derive blank recording table from referenceData headers
        ch.push(...resultsTable(rd.headers, 5));
      }
      arr(pracA.questions).forEach((q, i) => ch.push(...question(i + 1, q.q || '')));
    }
    buildSection();
    applySection({});
  }
  return ch;
}
async function buildDocx(L, outPath, mode) {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Century Gothic', size: 22 },
          paragraph: { spacing: { line: 360, lineRule: LineRuleType.AUTO } },
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

  const outDirsUsed = new Set(); // M7: collected for auto-upload after loop
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
      if (!fs.existsSync(outDir)) {
        // Local dirs are safe to create; Drive lesson folders are NEVER created here
        // (a wrong meta.outputDir would silently mint a duplicate folder chain on Drive).
        if (/^[Gg]:[\\\/]/.test(path.resolve(outDir))) {
          throw new Error('output dir is on Google Drive and does not exist — refusing to create it (fix meta.outputDir or create the folder yourself): ' + outDir);
        }
        fs.mkdirSync(outDir, { recursive: true });
        console.warn('[build] output dir did not exist — created: ' + outDir);
      }
      outDirsUsed.add(outDir);

      // 1 \u2014 PPTX (one version, for everyone)
      const pptxPath = path.join(outDir, base + '.pptx');
      await buildPptx(L, pptxPath);
      console.log('  \u2713 ' + path.basename(pptxPath));

      // 2 \u2014 Worksheet (review lessons: booklet only; standard lessons: companion worksheet)
      const isReview = String((L.meta || {}).lessonType || '').toLowerCase() === 'review';
      const wsPath = path.join(outDir, base + '_worksheet.docx');
      await buildDocx(L, wsPath, 'standard');
      console.log('  \u2713 ' + path.basename(wsPath));

      // 3 \u2014 Third file:
      //   standard lessons \u2192 support worksheet (same questions, scaffolding added)
      //   review lessons    \u2192 model-answer sheet (booklet replaces the support slot)
      if (isReview) {
        const answersPath = path.join(outDir, base + '_answers.docx');
        await buildDocx(L, answersPath, 'answers');
        console.log('  \u2713 ' + path.basename(answersPath));
      } else {
        const supportPath = path.join(outDir, base + '_support_worksheet.docx');
        await buildDocx(L, supportPath, 'developing');
        console.log('  \u2713 ' + path.basename(supportPath));
      }

      // 4 \u2014 Drive sidecar: one-line text file with the destination folder path.
      //     Only written when all Drive meta fields are present. Used by drive-upload.ps1.
      const { year, subject, macrotopic, lessonNumber } = L.meta;
      const lessonTitle = L.meta.title || L.meta.topic;
      if (year && subject && macrotopic && lessonNumber && lessonTitle) {
        const drivePath = `G:\\My Drive\\Beechen Cliff Science\\Lessons\\Year ${year}\\${subject}\\${macrotopic}\\Lesson ${lessonNumber} - ${lessonTitle}`;
        fs.writeFileSync(path.join(outDir, base + '.path.txt'), drivePath, 'utf8');
        console.log('  \u2713 ' + base + '.path.txt');
      }

      ok++;
    } catch (e) {
      fail++;
      console.error('  \u2717 FAILED: ' + label + ' \u00B7 ' + e.message);
      if (process.env.BUILD_DEBUG) console.error(e.stack);
    }
  }
  console.log('\nDone. ' + ok + ' lesson(s) built, ' + fail + ' failed.');

  // M7: auto-upload to Drive — skipped on claude.ai (no uploader alongside build.js there)
  const uploaderPath = path.join(__dirname, 'upload-to-drive.js');
  if (fs.existsSync(uploaderPath) && !process.env.NO_UPLOAD) {
    const r = cp.spawnSync(process.execPath, [uploaderPath, jsonPath], { stdio: 'inherit' });
    if (r.status !== 0) console.warn('upload-to-drive: check above for copy errors.');
  }

  if (fail && !ok) process.exit(2);
}

main().catch((e) => { console.error(e); process.exit(2); });
