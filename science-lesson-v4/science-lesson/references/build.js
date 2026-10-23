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
  LineRuleType, HeightRule, ImageRun, TabStopType,
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
const CAVEAT_CPI = 100; // approx Caveat BOLD chars-per-inch at 1pt (bold runs slightly wider than regular)
// 2026-07-12 (Patryk): amplitudes cut ~40% across all presets — the up/down
// bounce and slant made words hard to read from the back; keeps the neat→messy
// spread but every preset is calmer. Handwriting is also bold + 2pt bigger now.
const JITTER_PROFILES = [
  { rot: [-0.6, 0.3, -0.3, 0.6, 0], base: [0, 0.006, -0.006, 0.003, -0.003] },                                    // 1 neat
  { rot: [-1.2, 0.9, -0.6, 1.2, -0.3, 0.6], base: [0.006, -0.009, 0.012, -0.006, 0.009, -0.012] },                 // 2
  { rot: [-1.8, 1.2, -1.5, 1.8, -0.9, 1.5, -0.6], base: [0.012, -0.015, 0.009, -0.012, 0.018, -0.009, 0.012] },    // 3 mid
  { rot: [-2.7, 1.8, -2.1, 2.4, -1.5, 2.1, -2.4, 1.2], base: [0.018, -0.021, 0.015, -0.018, 0.024, -0.012, 0.021, -0.015] }, // 4
  { rot: [-3.6, 2.7, -3, 3.3, -2.4, 3, -3.9, 2.1, -2.7], base: [0.024, -0.03, 0.021, -0.027, 0.03, -0.018, 0.027, -0.024] }, // 5 messy
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
      // Strip an authored "A." / "B)" label — but not an abbreviation: "A.C. current", "d.c. supply"
      out[L] = String(o[i] == null ? '' : o[i]).replace(/^[A-D][.):]\s*(?![A-Za-z]\.)/i, '');
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

/* symCmds(str) — \cmd tokens → symbols (\times → ×, \rho → ρ), plus the Bug 61
   repair. Safe on ANY text: only backslash commands are touched. */
function symCmds(str) {
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
  return s.replace(/\\([A-Za-z]+)/g, (_, g) => _SYM[g] || `\\${g}`);
}

/* wordSwaps(str) — unit/operator WORDS → symbols, but ONLY in a maths context
   (2026-10-03, Patryk): units directly after a number ("100 metres" → "100 m"),
   "times" / "divided by" only between operands ("V = I times R", "12 divided by 3").
   Before this, every "times"/"seconds"/"metre" was swapped, so prose broke:
   "repeat three times" → "three ×", "a few seconds later" → "a few s later". */
const _OP_L = String.raw`(?<=(?:\d|\)|(?<![A-Za-z])[A-Za-z])\s*)`;   // left operand: digit, ")" or a lone letter
const _OP_R = String.raw`(?=\s*(?:\d|\(|[A-Za-z](?![A-Za-z])))`;     // right operand: digit, "(" or a lone letter
const _RE_TIMES   = new RegExp(_OP_L + String.raw`\btimes\b` + _OP_R, 'gi');
const _RE_DIVBY   = new RegExp(_OP_L + String.raw`\bdivided by\b` + _OP_R, 'gi');
function wordSwaps(str) {
  return String(str == null ? '' : str)
    .replace(/(\d)(\s*)met(?:er|re)s?\s*(?:\/|per)\s*second\b/gi, '$1$2m/s')   // compound unit first
    .replace(/(\d)(\s*)met(?:er|re)s?\b/gi, '$1$2m')
    .replace(/(\d)(\s*)seconds?\b/gi, '$1$2s')
    .replace(_RE_DIVBY, '÷')
    .replace(_RE_TIMES, '×');
}

/* normSym(str) — plain-text symbol normaliser for PROSE sinks (reviewRow,
   indicative content, handwriting model answers) and equation fields (parseEq).
   Structure (^ _ {}/ sqrt) is NOT touched here — that is parseEq's job. */
function normSym(str) { return wordSwaps(symCmds(str)); }

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
  // the bare form takes letters/digits, or ONE bracketed group "^(n+1)"; never a closing bracket
  // that belongs to the sentence: "(cm^3)" raises the 3 only (2026-10-10)
  return String(str == null ? '' : str).replace(/([\^_])(?:\{([^}]*)\}|(-?[A-Za-z0-9+=]+|\([A-Za-z0-9+\-=]+\)))/g,
    (m, mark, braced, bare) => {
      const arg = braced != null ? braced : bare;
      const mapped = conv(arg, mark === '^' ? _SUP : _SUB);
      return mapped != null ? mapped : m;
    });
}

/* prettyText(str) — combined plain-text normaliser for PROSE sinks: symbols +
   Unicode super/subscript, body font preserved. Not for equation FIELDS (those
   use parseEq → toPptxRuns/toDocxRuns). */
function prettyText(str) { return unicodeScript(normSym(stripMarkTags(str))); }

/* Mark tags (Patryk 2026-10-12): "{1}E = 0.250 × 334 000{/1}" marks the words that earned
   mark point 1, "{x}…{/x}" the words that lost a mark. Only the handwriting slides draw them
   (highlighter + numbered circle); every other sink strips them here. "^{2}" / "_{1}" are
   powers, not tags, so a ^ or _ just before the brace leaves it alone. */
const MARK_TAG_RE = /(?<![\^_])\{\/?(\d|x)\}/g;
function stripMarkTags(str) { return String(str == null ? '' : str).replace(MARK_TAG_RE, ''); }

// Powers/subscripts are drawn at 120% of the line's size. PowerPoint and Word both shrink
// raised/lowered text by about a third on their own, so they land at about 80% (Patryk
// 2026-10-03: they used to be 65% AND shrunk again, which made them tiny).
const SCRIPT_SCALE = 1.2;
const _SUP_REV = Object.fromEntries(Object.entries(_SUP).map(([k, v]) => [v, k]));
const _SUB_REV = Object.fromEntries(Object.entries(_SUB).map(([k, v]) => [v, k]));
const _RE_SCRIPT_GLYPH = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]/;

/* proseMathSegs(str) — maths shorthand in ORDINARY text (2026-10-03). Before this,
   only equation fields and a few prose sinks converted it, so ~100 slide fields
   (Learn boxes, comparison rows, MCQ options, Engage hook...) showed raw "v^2",
   "H_2O", "{1/2}". Returns [{t:'text'|'sup'|'sub', v}] or null when nothing to do.
   - \cmd → symbol (symCmds); {a/b} → diagonal a⁄b (same glyph as toPptxRuns)
   - ^x / _x: x is a number ("v^2", "10^-3"), one letter ("x^n"), "+"/"-" after ^
     ("Na^+"), or braced ("SO_{4}", "x^{2n}")
   - a bare "/" is left alone ("and/or", "m/s"); no word swaps here
   - links and file names are never touched */
/* docxMathRuns(text, opts) — Word twin of proseMathRuns: one TextRun per piece, raised/
   lowered pieces at SCRIPT_SCALE of the run size (Word's default body size is 11pt = 22). */
function docxMathRuns(text, opts) {
  const o = opts || {};
  const ks = keySplit(text);                                     // {k}word{/k}: plain bold on worksheets
  if (ks) return ks.flatMap((k) => docxMathRuns(k.v, k.key ? Object.assign({}, o, { bold: true }) : o));
  const segs = proseMathSegs(text);
  if (!segs) return [new TextRun(Object.assign({}, o, { text: String(text == null ? '' : text) }))];
  const scriptSize = Math.round((o.size || 22) * SCRIPT_SCALE);
  return segs.map(sg => new TextRun(Object.assign({}, o, { text: sg.v },
    sg.t !== 'text' && { size: scriptSize },
    sg.t === 'sup' && { superScript: true }, sg.t === 'sub' && { subScript: true })));
}

/* splitScriptGlyphs(segs) — text segments holding ² ³ ⁻ ₂... are split so those
   characters become real sup/sub segments (drawn at SCRIPT_SCALE, not glyph size). */
function splitScriptGlyphs(segs) {
  return segs.flatMap(sg => sg.t !== 'text' || !_RE_SCRIPT_GLYPH.test(sg.v || '') ? [sg]
    : sg.v.split(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ]+|[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+)/).filter(Boolean)
      .map(v => _SUP_REV[v[0]] ? { t: 'sup', v: [...v].map(c => _SUP_REV[c]).join('') }
        : _SUB_REV[v[0]] ? { t: 'sub', v: [...v].map(c => _SUB_REV[c]).join('') } : { t: 'text', v }));
}

function proseMathSegs(str) {
  const s0 = String(str == null ? '' : str);
  if (!/[\^_{}\\\r\n\t\b\f]/.test(s0) && !_RE_SCRIPT_GLYPH.test(s0)) return null;
  if (/:\/\/|www\.|\.(?:png|jpe?g|gif|pdf|pptx|docx)\b/i.test(s0)) return null;
  const s = symCmds(s0);
  const segs = [];
  let buf = '', i = 0;
  const push = (t, v) => { if (t === 'text') { buf += v; return; } if (buf) { segs.push({ t: 'text', v: buf }); buf = ''; } segs.push({ t, v }); };
  const braced = (at) => {                     // s[at] === '{' → [inner, indexAfter] or null
    let d = 1, j = at + 1;
    while (j < s.length && d > 0) { if (s[j] === '{') d++; else if (s[j] === '}') d--; j++; }
    return d === 0 ? [s.slice(at + 1, j - 1), j] : null;
  };
  while (i < s.length) {
    const ch = s[i];
    if (ch === '{') {
      const b = braced(i), m = b && /^([^{}/]+)\/([^{}/]+)$/.exec(b[0]);
      if (m) { push('text', unicodeScript(m[1]) + '⁄' + unicodeScript(m[2])); i = b[1]; continue; }
    }
    if ((ch === '^' || ch === '_') && /[A-Za-z0-9)\]]$/.test(buf || (segs.length ? 'x' : ''))) {
      let arg = null, next = i + 1;
      if (s[next] === '{') { const b = braced(next); if (b && b[0]) { arg = b[0]; next = b[1]; } }
      else {
        const m = /^-?\d+(?:\.\d+)?/.exec(s.slice(next))
          || (/^[A-Za-z](?![A-Za-z])/.exec(s.slice(next)))
          || (ch === '^' && /^[+-](?![\dA-Za-z])/.exec(s.slice(next)));
        if (m) { arg = m[0]; next += m[0].length; }
      }
      if (arg != null) { push(ch === '^' ? 'sup' : 'sub', arg); i = next; continue; }
    }
    push('text', ch); i++;
  }
  if (buf) segs.push({ t: 'text', v: buf });
  // Unicode ² ³ ⁻ ₂ (from prettyText, {a/b} parts, or typed by hand) become real raised/
  // lowered pieces too, so every power is drawn at the same SCRIPT_SCALE size.
  const out = splitScriptGlyphs(segs);
  const changed = out.length !== 1 || out[0].t !== 'text' || out[0].v !== s0;
  return changed ? out : null;
}

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
        segs.push(den && num ? {t:'frac',num:unicodeScript(num),den:unicodeScript(den)} : {t:'text',v:num+'/'+den}); // kg/m^3 → kg⁄m³ (2026-10-03)
      } else { segs.push({t:'text',v:'/'}); i++; }
      continue;
    }
    if (ch === '{') { // M1: {num/den} explicit fraction syntax
      let d=1, j=i+1;
      while (j < s.length && d>0) { if(s[j]==='{') d++; else if(s[j]==='}') d--; j++; }
      const inner = s.slice(i+1, j-1); i=j;
      const si = inner.indexOf('/');
      if (si > 0 && si < inner.length-1) { flush(); segs.push({t:'frac',num:unicodeScript(inner.slice(0,si).trim()),den:unicodeScript(inner.slice(si+1).trim())}); }
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
  const subFs = Math.round(fs * SCRIPT_SCALE);
  const base = (x) => Object.assign({fontSize:fs, fontFace:FONT_MATH}, o.bold && {bold:true}, o.color && {color:o.color}, x);
  const small = (x) => Object.assign({fontSize:subFs, fontFace:FONT_MATH}, o.color && {color:o.color}, x);
  const part = (v) => splitScriptGlyphs([{ t: 'text', v }]).flatMap(sg => toPptxRuns([sg], o));   // kg/m³ → real raised 3
  return splitScriptGlyphs(arr(segs)).flatMap(seg => {
    // Bug 53: diagonal fraction at FULL size (num/den no longer shrunk sub+sup on
    // top of the 0.65 scale — that compounding made {d/t} render tiny). pptxgenjs
    // has no Office Math, so this stays a legible diagonal a⁄b.
    if (seg.t === 'frac') return [...part(seg.num), {text:'⁄',options:base()}, ...part(seg.den)];
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
      const scale = (sg.t === 'sub' || sg.t === 'sup') ? 0.8 : 1;   // rendered size of a raised piece
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
  const subSz = Math.round(sz * SCRIPT_SCALE);
  const base = (x) => Object.assign({size:sz}, o.bold && {bold:true}, o.color && {color:o.color}, o.italic && {italics:true}, x);
  const small = (x) => Object.assign({size:subSz}, o.color && {color:o.color}, x);
  return splitScriptGlyphs(arr(segs)).flatMap(seg => {   // typed ² → real raised run
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
  return parseMarkup(raw).flatMap((seg) => docxMathRuns(seg.text, Object.assign({}, baseOpts,   // maths, same as R()
    seg.underline ? { underline: {} } : {},
    seg.bold ? { bold: true } : {})));
}

/* =========================================================================
   PPTX RENDERER FUNCTIONS — defined once, called by name everywhere
   ========================================================================= */

function txt(slide, content, o) {
  slide.addText(proseMathRuns(content, o && o.fontSize, o && o.color), Object.assign({ fontFace: FONT }, o));
}

/* proseMathRuns(content) — every slide text box passes through here (via txt), so
   maths shorthand typesets in ANY field: real super/subscript runs in the box's own
   font (Patryk 2026-10-03). Runs that are already equations (Cambria Math from
   toPptxRuns) or already raised/lowered are left exactly as they are. */
/* Key words (Lesson quality A, Patryk 2026-10-19, style 2): {k}word{/k} = bold, gold underline.
   On a light box the word is navy; on a dark box it keeps the box's light colour. pptxgenjs can't
   colour an underline, so the run is tagged lang="en-001" and finishText() adds the gold
   underline to the saved file (then puts the language back to en-GB). */
const KEY_RE = /\{k\}([\s\S]*?)\{\/k\}/g;
const KEY_LANG = 'en-001';
const stripKeys = (s) => String(s == null ? '' : s).replace(KEY_RE, '$1');
const isLight = (c) => /^(FFFFFF|FFF|FFD60A|FABB2E|F9A825|C9D3F2)$/i.test(String(c || ''));
function keySplit(text) {
  if (typeof text !== 'string' || !text.includes('{k}')) return null;
  const out = []; let last = 0, m;
  KEY_RE.lastIndex = 0;
  while ((m = KEY_RE.exec(text))) {
    if (m.index > last) out.push({ v: text.slice(last, m.index), key: false });
    out.push({ v: m[1], key: true });
    last = KEY_RE.lastIndex;
  }
  if (last < text.length) out.push({ v: text.slice(last), key: false });
  return out;
}
function keyOpts(base) {
  return { bold: true, underline: { style: 'sng' }, lang: KEY_LANG, color: isLight(base && base.color) ? base.color : NAVY };
}

function proseMathRuns(content, boxSize, boxColor) {
  const toRuns = (text, opts) => {
    const ks = keySplit(text);
    if (ks) {                                                    // key words: split, then maths per piece
      const base = Object.assign(boxColor ? { color: boxColor } : {}, opts || {});
      const runs = ks.flatMap((k) => {
        const o = Object.assign({}, base, { breakLine: false }, k.key ? keyOpts(base) : {});
        return toRuns(k.v, o) || [{ text: k.v, options: o }];
      });
      runs[runs.length - 1].options.breakLine = !!base.breakLine;
      runs.forEach(r => { if (!r.options.breakLine) delete r.options.breakLine; });
      return runs;
    }
    const segs = proseMathSegs(text);
    if (!segs) return null;
    const base = opts || {};
    const runs = segs.map(sg => ({
      text: sg.v,
      options: Object.assign({}, base, { breakLine: false },
        sg.t !== 'text' && { fontSize: Math.round((base.fontSize || boxSize || 18) * SCRIPT_SCALE) },
        sg.t === 'sup' && { superscript: true }, sg.t === 'sub' && { subscript: true }),
    }));
    // A line break belongs after the LAST piece only, never mid-equation.
    runs[runs.length - 1].options.breakLine = !!base.breakLine;
    runs.forEach(r => { if (!r.options.breakLine) delete r.options.breakLine; });
    return runs;
  };
  if (typeof content === 'string') return toRuns(content) || content;
  if (!Array.isArray(content)) return content;
  return content.flatMap(run => {
    if (!run || typeof run.text !== 'string') return [run];
    const op = run.options || {};
    if (op.fontFace === FONT_MATH || op.superscript || op.subscript) return [run];
    return toRuns(run.text, op) || [run];
  });
}

/* table(slide, rows, opts) — addTable with the same maths pass on every cell
   (Learn A boxes, Learn C revision tables, reference data are tables, not txt()). */
function table(slide, rows, opts) {
  const cellMath = (cell) => {
    const size = (cell && cell.options && cell.options.fontSize) || (opts && opts.fontSize);
    const col = (cell && cell.options && cell.options.color) || (opts && opts.color);
    if (typeof cell === 'string') return (proseMathSegs(cell) || keySplit(cell)) ? { text: proseMathRuns(cell, size, col) } : cell;
    if (cell && cell.text != null) return Object.assign({}, cell, { text: proseMathRuns(cell.text, size, col) });
    return cell;
  };
  slide.addTable(rows.map(r => r.map(cellMath)), opts);
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
function sectionHeader(slide, text, colour, y, runs, big) {
  // big: the test-review question bars (Patryk 2026-10-15: clearer and slightly bigger)
  const h = big ? 0.5 : 0.38;
  txt(slide, runs || text, {
    x: 0, y, w: SW, h, fill: { color: colour },
    color: 'FFFFFF', bold: true, fontSize: big ? 17 : 13, align: runs ? 'left' : 'center',
    valign: 'middle', margin: 8,
  });
  return y + h + GAP;
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
    return m ? 'Read more: ' + TBIDX.formatRef(m) : '';
  } catch (e) {
    buildWarn(`textbook reference lookup failed (${e.message || e}) — Apply slide/worksheet ships without a page ref`);
    return '';
  }
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
  if (typeof t === 'string') return stripKeys(t);
  if (Array.isArray(t)) return stripKeys(t.map((r) => (typeof r === 'string' ? r : r.text || '')).join(''));
  return stripKeys(String(t || ''));
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

/* fitListFont(lines, w, h, min, max) — biggest size at which a bulleted list (one item per
   paragraph, 6pt after each) fits the box. Same width model as autoFontSize. */
function fitListFont(lines, w, h, min, max) {
  for (let fs = max; fs >= min; fs--) {
    const cpl = Math.max(1, Math.floor((w * 120) / fs));
    const n = lines.reduce((t, l) => t + Math.max(1, Math.ceil(flattenText(l).length / cpl)), 0);
    if ((n * fs * 1.4 + lines.length * 6) / 72 <= h * 0.85) return fs;
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
  table(slide, [
    [{ text: headerText, options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 22, border, valign: 'middle' } }],
    [{ text: bodyText, options: { fill: { color: 'FFFFFF' }, color: '1A1A2E', fontSize: autoFontSize(arr(bodyLines).join(' '), w, Math.max(0.4, (bodyH || 1.2) - 0.65), { min: 11, max: 20 }), border, valign: 'top' } }],
  ], { x, y, w, colW: [w], rowH: [0.65, Math.max(0.4, (bodyH || 1.2) - 0.65)], fontFace: FONT, margin: 0.06, autoPage: false });
}

/* imagePlaceholder(x, y, w, h, description?) */
function imagePlaceholder(slide, x, y, w, h, description) {
  // Always prefer a concrete suggestion of WHAT to insert. The generic fallback
  // still asks for a specific thing rather than the bare "teacher inserts".
  const label = description
    ? `[Paste image. Suggested search: ${description}]`
    : '[Image: add imageDescription to JSON]';
  txt(slide, label, {
    x, y, w, h, fill: { color: 'D0D0D0' },
    line: { color: '999999', width: 1, dashType: 'dash' },
    color: '666666', italic: true, fontSize: 11, align: 'center', valign: 'middle',
  });
}

/* BUILD WARNINGS (2026-07-12) — degraded-output collector. Any failure that
   used to be swallowed (image embed, handwriting font, textbook lookup) now
   logs "⚠ BUILD WARNING" immediately and is counted per lesson so a build that
   "succeeded" but shipped a worse file says so out loud. Never blocks. */
const BUILD_WARNS = [];
function buildWarn(msg) {
  BUILD_WARNS.push(msg);
  console.error(`  ⚠ BUILD WARNING: ${msg}`);
}
function flushBuildWarns(name) {
  const n = BUILD_WARNS.length;
  if (n) console.error(`  ⚠ ${n} build warning(s) on "${name}" — output is degraded, see lines above`);
  BUILD_WARNS.length = 0;
  return n;
}

/* imageOrPlaceholder(item, x, y, w, h) — embed the lesson's real image when one
   was matched (imageConfidence 'search' + embeddedImagePath), else a
   description-aware grey placeholder. Single source of truth so a slide type can
   never again forget to pass item.imageDescription (Bug 58 regression — variants
   H and J were calling imagePlaceholder without it). A promised image that is
   missing or unreadable now warns loudly instead of degrading silently. */
/* imagePixelSize(file) — width/height in pixels read from the file header (PNG, JPEG, GIF,
   BMP), or null. 2026-10-12: pictures were being stretched to the shape of their box. */
function imagePixelSize(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b.length > 10 && b.toString('ascii', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
    if (b.length > 26 && b.toString('ascii', 0, 2) === 'BM') return { w: b.readInt32LE(18), h: Math.abs(b.readInt32LE(22)) };
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch (_) { /* unreadable: caller falls back to the box */ }
  return null;
}
/* addImageFit — the picture as large as the box allows, its own shape kept, centred in the box. */
function addImageFit(slide, file, x, y, w, h) {
  const px = imagePixelSize(file);
  if (!px || !px.w || !px.h) { slide.addImage({ path: file, x, y, w, h }); return { x, y, w, h }; }
  const s = Math.min(w / px.w, h / px.h);
  const iw = px.w * s, ih = px.h * s;
  const box = { x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih };
  slide.addImage({ path: file, ...box });
  return box;
}

function imageOrPlaceholder(slide, item, x, y, w, h) {
  if (item && item.imageConfidence === 'search' && item.embeddedImagePath) {
    if (fs.existsSync(item.embeddedImagePath)) {
      try {
        addImageFit(slide, item.embeddedImagePath, x, y, w, h);
        return;
      } catch (e) {
        buildWarn(`image embed failed, grey placeholder shipped instead (${item.embeddedImagePath}): ${e.message || e}`);
      }
    } else {
      buildWarn(`image file NOT FOUND, grey placeholder shipped instead: ${item.embeddedImagePath}`);
    }
  } else if (item && item.embeddedImagePath) {
    // 2026-10-23: a picture given with another imageConfidence ("school") was silently left out
    buildWarn(`picture NOT embedded (imageConfidence is "${item.imageConfidence || ''}", must be "search"): ${item.embeddedImagePath}`);
  }
  imagePlaceholder(slide, x, y, w, h, (item && item.imageDescription) || null);
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
/* ---- CAVEAT FONT FILE HELPERS (2026-10-02) --------------------------------
   Read the bundled Caveat TTF directly, so (1) it can be wrapped in the format
   PowerPoint actually loads from inside a .pptx, and (2) word spacing uses the
   font's real letter widths instead of a guess. */
function ttfTables(buf) {
  const tables = {};
  const n = buf.readUInt16BE(4);
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    tables[buf.toString('latin1', o, o + 4)] = { off: buf.readUInt32BE(o + 8), len: buf.readUInt32BE(o + 12) };
  }
  return tables;
}

/* ttfToEot(buf) — wrap a TrueType font in an uncompressed Embedded OpenType
   header (EOT v0x00020001). PowerPoint IGNORES a raw .ttf placed in
   ppt/fonts/*.fntdata and silently substitutes another font; wrapped like
   this it loads it (verified by PowerPoint export, golden render C-09,
   2026-10-02). Every header field is copied from the font's own OS/2, head
   and name tables. */
function ttfToEot(ttf) {
  const t = ttfTables(ttf);
  const os2 = t['OS/2'], head = t.head, name = t.name;
  if (!os2 || !head || !name) throw new Error('font is missing its OS/2, head or name table');
  const nameStr = (id) => {                      // Windows Unicode string, UTF-16BE → LE
    const count = ttf.readUInt16BE(name.off + 2), strOff = name.off + ttf.readUInt16BE(name.off + 4);
    let best = null;
    for (let i = 0; i < count; i++) {
      const r = name.off + 6 + i * 12;
      if (ttf.readUInt16BE(r) !== 3 || ttf.readUInt16BE(r + 2) !== 1 || ttf.readUInt16BE(r + 6) !== id) continue;
      const s = strOff + ttf.readUInt16BE(r + 10);
      if (!best || ttf.readUInt16BE(r + 4) === 0x409) best = ttf.subarray(s, s + ttf.readUInt16BE(r + 8));
    }
    const le = Buffer.from(best || Buffer.alloc(0));
    le.swap16();
    return le;
  };
  const fixed = Buffer.alloc(82);
  fixed.writeUInt32LE(0x00020001, 8);                                   // Version
  ttf.copy(fixed, 16, os2.off + 32, os2.off + 42);                      // PANOSE
  fixed.writeUInt8(1, 26);                                              // Charset: default
  fixed.writeUInt8(ttf.readUInt16BE(os2.off + 62) & 1, 27);             // Italic
  fixed.writeUInt32LE(ttf.readUInt16BE(os2.off + 4), 28);               // Weight
  fixed.writeUInt16LE(ttf.readUInt16BE(os2.off + 8), 32);               // fsType
  fixed.writeUInt16LE(0x504C, 34);                                      // Magic number
  for (let i = 0; i < 4; i++) fixed.writeUInt32LE(ttf.readUInt32BE(os2.off + 42 + i * 4), 36 + i * 4);
  if (ttf.readUInt16BE(os2.off) >= 1) {                                 // code page ranges (OS/2 v1+)
    fixed.writeUInt32LE(ttf.readUInt32BE(os2.off + 78), 52);
    fixed.writeUInt32LE(ttf.readUInt32BE(os2.off + 82), 56);
  }
  fixed.writeUInt32LE(ttf.readUInt32BE(head.off + 8), 60);              // checkSumAdjustment
  const parts = [fixed];
  [1, 2, 5, 4].forEach((id, i) => {             // family, style, version, full name
    const s = nameStr(id);
    const sz = Buffer.alloc(i === 0 ? 2 : 4);   // a 2-byte padding precedes every name after the first
    sz.writeUInt16LE(s.length, i === 0 ? 0 : 2);
    parts.push(sz, s);
  });
  parts.push(Buffer.alloc(4));                  // padding + empty root string
  const header = Buffer.concat(parts);
  header.writeUInt32LE(header.length + ttf.length, 0);                  // EOTSize
  header.writeUInt32LE(ttf.length, 4);                                  // FontDataSize
  return Buffer.concat([header, ttf]);
}

/* caveatMetrics() — advance width (in em) for any character, from the bold
   Caveat file's cmap (format 4) + hmtx tables. null when the font can't be
   read, in which case wordWidthIn falls back to the old flat estimate. */
let _caveatMetrics;
function caveatMetrics() {
  if (_caveatMetrics !== undefined) return _caveatMetrics;
  _caveatMetrics = null;
  try {
    const buf = fs.readFileSync(fs.existsSync(CAVEAT_BOLD_PATH) ? CAVEAT_BOLD_PATH : CAVEAT_REGULAR_PATH);
    const t = ttfTables(buf);
    const upm = buf.readUInt16BE(t.head.off + 18);
    const nHM = buf.readUInt16BE(t.hhea.off + 34);
    const adv = (g) => buf.readUInt16BE(t.hmtx.off + Math.min(g, nHM - 1) * 4);
    let sub = null;                              // first Unicode format-4 cmap subtable
    for (let i = 0; i < buf.readUInt16BE(t.cmap.off + 2); i++) {
      const r = t.cmap.off + 4 + i * 8;
      const plat = buf.readUInt16BE(r), enc = buf.readUInt16BE(r + 2);
      const so = t.cmap.off + buf.readUInt32BE(r + 4);
      if (((plat === 3 && enc === 1) || plat === 0) && buf.readUInt16BE(so) === 4) { sub = so; break; }
    }
    if (!sub) return _caveatMetrics;
    const seg = buf.readUInt16BE(sub + 6) / 2;
    const endA = sub + 14, startA = endA + seg * 2 + 2, deltaA = startA + seg * 2, rangeA = deltaA + seg * 2;
    const glyph = (c) => {
      for (let i = 0; i < seg; i++) {
        if (buf.readUInt16BE(endA + i * 2) < c) continue;
        const start = buf.readUInt16BE(startA + i * 2);
        if (start > c) return 0;
        const delta = buf.readUInt16BE(deltaA + i * 2), ro = buf.readUInt16BE(rangeA + i * 2);
        if (!ro) return (c + delta) & 0xFFFF;
        const g = buf.readUInt16BE(rangeA + i * 2 + ro + (c - start) * 2);
        return g ? (g + delta) & 0xFFFF : 0;
      }
      return 0;
    };
    const cache = new Map();
    _caveatMetrics = (ch) => {
      if (!cache.has(ch)) cache.set(ch, adv(glyph(ch.codePointAt(0))) / upm);
      return cache.get(ch);
    };
  } catch (e) {
    buildWarn(`could not read Caveat letter widths (${e.message || e}) — handwriting spacing uses a rough estimate`);
  }
  return _caveatMetrics;
}

/* wordWidthIn — width of one handwritten word INCLUDING the gap after it.
   2026-10-02: measured from the real Caveat glyph widths. The old flat
   estimate (CAVEAT_CPI) was roughly twice too wide for Caveat, which only
   became visible once PowerPoint finally displayed the real font: huge,
   uneven gaps between words. The gap is 1.4 spaces, a touch looser than
   typeset text, as handwriting is. */
function wordWidthIn(word, fontSize) {
  const m = caveatMetrics();
  if (!m) return (String(word).length * fontSize) / CAVEAT_CPI + 0.05;
  const em = [...String(word)].reduce((sum, ch) => sum + m(ch), 0) + 1.4 * m(' ');
  return (em * fontSize) / 72;
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
  const fontSize = o.fontSize || 22;
  const profile = o.profile != null ? o.profile : 2;
  const baseLineH = (fontSize * 1.55) / 72;
  const paras = Array.isArray(text) ? text.map(String) : [String(text || '')];
  // mark circles (o.marks): the last word of each tagged span gets room for its circle
  const gap = markCircleD(fontSize) + 0.06;
  const gapAfter = (i) => (o.marks && o.marks[i] != null && o.marks[i + 1] !== o.marks[i] ? gap : 0);
  let gi = 0;
  const padX = 0.14, padTop = 0.12;
  const maxLineW = w - padX * 2;
  const lines = [];
  paras.forEach((para) => {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = [], curW = 0;
    words.forEach((word) => {
      const ww = wordWidthIn(word, fontSize) + gapAfter(gi++);
      if (curW + ww > maxLineW && cur.length) { lines.push(cur); cur = []; curW = 0; }
      cur.push(word); curW += ww;
    });
    lines.push(cur);
  });
  // Spread mode (RULED boxes only): when a box height is supplied, stretch the
  // line spacing so the working fills the whole box (no dead space / trailing
  // blank rules) and the baseline rules come out evenly parallel. Capped so
  // short answers don't sprawl.
  // Unruled boxes (correctTheStatement) keep natural spacing and are centred
  // vertically instead (2026-10-02): once the real, narrower Caveat was in use
  // most statements fit on one line, and spreading one line over the whole box
  // sank the words to the bottom edge with empty space above.
  let lineH = baseLineH;
  let top = padTop;
  if (o.boxH && lines.length) {
    if (o.ruled) {
      const avail = o.boxH - padTop * 2;
      lineH = Math.min(Math.max(baseLineH, avail / lines.length), baseLineH * 2.4);
    } else {
      top = Math.max(padTop, (o.boxH - lines.length * lineH) / 2);
    }
  }
  const placed = [];
  let wordIdx = 0;
  lines.forEach((line, li) => {
    let cx = padX;
    const cy = top + li * lineH;
    line.forEach((word) => {
      const ww = wordWidthIn(word, fontSize);
      const g = gapAfter(wordIdx);
      const { rot, base } = jitterFor(profile, wordIdx++);
      placed.push({ word, x: cx, y: cy + base, w: ww, rot });
      cx += ww + g;
    });
  });
  return { placed, lineH, padTop: top, lineCount: lines.length, usedH: top + lines.length * lineH };
}

/* handwritingBlockEditable — primary render path (M1/M2): each word is its
   own tiny editable PPTX text box in Caveat, rotated/baseline-shifted per
   JITTER_PROFILES. Real, editable text — not an image. */
function handwritingBlockEditable(slide, x, y, w, h, text, opts) {
  const o = opts || {};
  const fontSize = o.fontSize || 22;
  const color = o.color || '1A1A2E';
  if (o.fill !== false) {
    slide.addShape('rect', { x, y, w, h, fill: { color: o.bg || 'FFFFFF' }, line: o.line || GOLD2 });
  }
  const { placed, lineH, padTop, lineCount, usedH } = layoutHandwriting(text, w, Object.assign({ boxH: h }, o));
  drawMarkHighlights(slide, x, y, w, placed, lineH, o.marks, fontSize, 'bands');
  placed.forEach(({ word, x: wx, y: wy, w: ww, rot }) => {
    slide.addText(word, {
      x: x + wx, y: y + wy, w: ww + 0.14, h: lineH,
      fontFace: CAVEAT, fontSize, bold: true, color, rotate: rot,   // bold 2026-07-12: heavier stroke reads better from the back
      align: 'left', valign: 'bottom', margin: 0,
    });
  });
  if (o.ruled) {
    handwritingRuleYs(padTop, lineH, h).forEach((ry) => {
      slide.addShape('line', { x: x + 0.14, y: y + ry, w: w - 0.14 * 2 - 0.05, h: 0, line: { color: 'C9C9DC', width: 0.75 } });
    });
  }
  drawMarkHighlights(slide, x, y, w, placed, lineH, o.marks, fontSize, 'circles');
  return { usedH, lineCount };
}

/* handwritingRuleYs — box-relative y of each ruled line. Even baseline rules
   under every line, stepped by the (spread) line height, so the working sits
   on evenly parallel rules and fills the box (no trailing blanks). Shared by
   both render paths. */
function handwritingRuleYs(padTop, lineH, h) {
  const ys = [];
  for (let ly = padTop + lineH; ly < h - 0.04; ly += lineH) ys.push(ly);
  return ys;
}

/* callHandwritingPng(spec) — spawns handwriting_png.py (Pillow + the bundled
   Caveat TTF), returns a temp PNG path or null. Mirrors callGraphGen: same
   python command, temp files cleaned up after writeFile. */
function callHandwritingPng(spec) {
  try {
    const t = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const inP = path.join(os.tmpdir(), `hw_in_${t}.json`);
    const outP = path.join(os.tmpdir(), `hw_out_${t}.png`);
    const py = process.platform === 'win32' ? 'python' : 'python3';
    const fontPath = fs.existsSync(CAVEAT_BOLD_PATH) ? CAVEAT_BOLD_PATH : CAVEAT_REGULAR_PATH;
    fs.writeFileSync(inP, JSON.stringify(Object.assign({}, spec, { fontPath, dpi: 200, outPath: outP })));
    _tmpFiles.push(inP, outP);
    cp.execSync(`${py} "${path.join(__dirname, 'handwriting_png.py')}" "${inP}"`, { stdio: 'pipe' });
    return fs.existsSync(outP) ? outP : null;
  } catch (e) {
    console.error('[handwriting_png]', String((e.stderr && e.stderr.toString()) || e.message || e).trim());
    return null;
  }
}

/* handwritingBlockRaster — the picture route: the SAME word layout as the
   editable route, drawn into a real PNG by handwriting_png.py so it looks
   identical on any machine, any app, with no font install. Not editable on
   the slide (edit the lesson JSON and rebuild). Opt in per item with
   renderMode:'raster', or for a whole lesson with meta.handwritingMode.
   2026-10-02: replaces the old SVG version, which never worked in PowerPoint
   (its SVG renderer ignores @font-face, and pptxgenjs's companion ".png" was
   SVG text with the wrong extension, so there was no real fallback image).
   The gold box itself stays a native shape so its border matches the deck.
   If Python is unavailable, warns loudly and falls back to editable text. */
function handwritingBlockRaster(slide, x, y, w, h, text, opts) {
  const o = opts || {};
  const lay = layoutHandwriting(text, w, Object.assign({ boxH: h }, o));
  const png = callHandwritingPng({
    w, h, fontSize: o.fontSize || 22, color: o.color || '1A1A2E',
    lineH: lay.lineH, words: lay.placed,
    rules: o.ruled ? handwritingRuleYs(lay.padTop, lay.lineH, h) : [],
    ruleX0: 0.14, ruleX1: w - 0.19, ruleColor: 'C9C9DC',
  });
  if (!png) {
    buildWarn('picture handwriting could not be drawn (Python/Pillow) — editable handwriting shipped instead');
    return handwritingBlockEditable(slide, x, y, w, h, text, o);
  }
  if (o.fill !== false) {
    slide.addShape('rect', { x, y, w, h, fill: { color: o.bg || 'FFFFFF' }, line: o.line || GOLD2 });
  }
  slide.addImage({ path: png, x, y, w, h });
  drawMarkHighlights(slide, x, y, w, lay.placed, lay.lineH, o.marks, o.fontSize || 22, 'over');
  return { usedH: lay.usedH, lineCount: lay.lineCount };
}

/* Mark highlighting (Patryk 2026-10-12): show WHERE each mark came from. A tagged span of
   handwriting gets a see-through highlighter band in that mark's colour and a numbered circle
   after it; the mark-scheme point with the same number carries the same colour. "x" = a mark
   lost (red band, red cross). Six colours (2026-10-15: a 6-marker shows 6), ordered so each mark
   looks unlike the one before it: yellow, blue, pink, green, orange, purple. Cycle after 6.
   Circles and bands were made a little bigger and stronger the same day, to read from the back. */
const MARK_HI = ['FFF176', '90CAF9', 'F8BBD0', 'A5D6A7', 'FFCC80', 'CE93D8'];   // highlighter (light)
const MARK_INK = ['F9A825', '1565C0', 'AD1457', '2E7D32', 'EF6C00', '6A1B9A'];  // circle (dark)
const markCircleD = (fontSize) => Math.max(0.28, Math.min(0.40, (fontSize * 1.1) / 72));
const markSlot = (m, n) => (((Number(m) - 1) % n) + n) % n;   // mark 1 = first colour, whatever the list length
const markHi = (m) => (m === 'x' ? 'FFCDD2' : MARK_HI[markSlot(m, MARK_HI.length)]);
const markInk = (m) => (m === 'x' ? 'C62828' : MARK_INK[markSlot(m, MARK_INK.length)]);

/* parseMarkWords(text) — text (string, or array of lines) with {n}…{/n} tags →
   { text: same shape, tags removed and prettyText'd, marks: one entry per word in layout
   order (null = untagged) }. If prettyText changes the word count the marks can't be lined
   up, so they are dropped with a warning (the answer still renders). */
function parseMarkWords(text) {
  const lines = Array.isArray(text) ? text.map(String) : [String(text == null ? '' : text)];
  const marks = [];
  let open = null;
  const out = lines.map((raw) => {
    const words = [];
    raw.trim().split(/\s+/).filter(Boolean).forEach((tok) => {
      let mark = open, rest = '', last = 0, m;
      const re = new RegExp(MARK_TAG_RE.source, 'g');
      while ((m = re.exec(tok))) {
        rest += tok.slice(last, m.index); last = re.lastIndex;
        if (m[0][1] === '/') { if (rest.trim()) mark = open; open = null; }
        else { open = m[1]; mark = open; }
      }
      rest += tok.slice(last);
      if (rest.trim()) { words.push(rest); marks.push(mark); }
    });
    return words;
  });
  const pretty = out.map((ws) => prettyText(ws.join(' ')));
  const count = pretty.reduce((t, l) => t + l.trim().split(/\s+/).filter(Boolean).length, 0);
  const tagged = marks.some((m) => m != null);
  if (tagged && count !== marks.length) {
    buildWarn('mark highlights dropped on one answer (symbol tidy-up changed the word count)');
    return { text: Array.isArray(text) ? pretty : pretty[0], marks: null };
  }
  return { text: Array.isArray(text) ? pretty : pretty[0], marks: tagged ? marks : null };
}
const hasMarkTags = (t) => new RegExp(MARK_TAG_RE.source).test(Array.isArray(t) ? t.join(' ') : String(t || ''));

/* fitHandwritingFs — biggest handwriting size (max..min) whose words fit a w×h box, mark
   circles included. Used where the box size is decided by the layout, not the content. */
function fitHandwritingFs(text, w, h, max, min) {
  const pm = hasMarkTags(text) ? parseMarkWords(text) : { text, marks: null };
  for (let fs = max; fs > min; fs--) {
    if (layoutHandwriting(pm.text, w, { fontSize: fs, marks: pm.marks }).usedH + 0.1 <= h) return fs;
  }
  return min;
}
/* handwritingLines — how many lines the words wrap onto. */
function handwritingLines(text, w, fs) {
  const pm = hasMarkTags(text) ? parseMarkWords(text) : { text, marks: null };
  return layoutHandwriting(pm.text, w, { fontSize: fs, marks: pm.marks }).lineCount;
}
/* handwritingNeedH — height a handwriting block needs at a given size. */
function handwritingNeedH(text, w, fs) {
  const pm = hasMarkTags(text) ? parseMarkWords(text) : { text, marks: null };
  return layoutHandwriting(pm.text, w, { fontSize: fs, marks: pm.marks }).usedH + 0.16;
}

/* drawMarkHighlights — bands + circles for the placed words (layoutHandwriting order).
   behind=true draws only the bands (before the words); behind=false only the circles. */
function drawMarkHighlights(slide, x, y, w, placed, lineH, marks, fontSize, part) {
  if (!marks) return;
  const runs = [];                       // consecutive same-mark words on the same line
  placed.forEach((p, i) => {
    const m = marks[i];
    if (m == null) return;
    const prev = runs[runs.length - 1];
    if (prev && prev.m === m && prev.last === i - 1 && Math.abs(prev.y - p.y) < lineH * 0.5) {
      prev.x1 = p.x + p.w; prev.last = i;
    } else runs.push({ m, x0: p.x, x1: p.x + p.w, y: p.y, first: i, last: i });
  });
  const bandH = Math.min(lineH * 0.62, (fontSize * 1.05) / 72);
  runs.forEach((r, k) => {
    const next = runs[k + 1];
    const endOfSpan = !(next && next.m === r.m && next.first === r.last + 1);   // span wraps onto the next line
    if (part === 'bands' || part === 'over') {
      slide.addShape('rect', {
        x: x + r.x0 - 0.04, y: y + r.y + lineH - bandH - 0.02, w: r.x1 - r.x0 + 0.08, h: bandH,
        fill: { color: markHi(r.m), transparency: part === 'over' ? 35 : 0 }, line: { type: 'none' },
      });
    }
    if (part !== 'bands' && endOfSpan) {
      const d = markCircleD(fontSize);
      const cx = Math.min(x + r.x1 + 0.03, x + w - d - 0.02);
      slide.addText(r.m === 'x' ? '✗' : String(r.m), {
        shape: 'ellipse', x: cx, y: y + r.y + lineH - d - 0.02, w: d, h: d,
        fill: { color: markInk(r.m) }, line: { color: 'FFFFFF', width: 1 },
        color: 'FFFFFF', bold: true, fontFace: FONT, fontSize: Math.round(d * 72 * 0.55),
        align: 'center', valign: 'middle', margin: 0,
      });
    }
  });
}

/* handwritingBlock(x, y, w, h, text, opts) — public entry, dispatches on
   opts.mode ('editable' default, or 'raster' for the M3 fallback). Same
   signature/behaviour either way from the caller's point of view. */
function handwritingBlock(slide, x, y, w, h, text, opts) {
  let o = opts || {};
  if (hasMarkTags(text)) {                 // {1}…{/1} tags → highlighter bands + numbered circles
    const pm = parseMarkWords(text);
    text = pm.text; o = Object.assign({}, o, { marks: pm.marks });
  }
  return o.mode === 'raster'
    ? handwritingBlockRaster(slide, x, y, w, h, text, o)
    : handwritingBlockEditable(slide, x, y, w, h, text, o);
}

/* embedCaveatFont(pptxPath) (M2) — post-processes the written .pptx to embed
   Caveat so it displays correctly in PowerPoint without a local font install.
   Google Slides needs none of this (native Google Font there). Best-effort:
   on any failure, leaves the file untouched — text still carries
   fontFace:'Caveat' so an unpatched file just substitutes a fallback font.
   The fonts go in EOT-wrapped (ttfToEot): until 2026-10-02 they went in as
   raw .ttf, which PowerPoint ignored, so handwriting showed as plain sans. */
/* addRevealAnimations(pptxPath) — Patryk 2026-10-03: every navy/gold answer box appears as a
   WHOLE box on click, so he no longer adds the entrance animations by hand each morning.
   A reveal box = a shape filled house navy (0D1B5E) whose text includes gold (FABB2E) runs. That
   excludes the nav and bottom bars (white text) and the empty navy decoration (formula-triangle
   bars). Effect: "Appear", one click per box, in reading order (top to bottom, then left to right).
   animBg="1" makes the box and its text appear together. Appear is the simplest entrance effect
   and the one most likely to survive Google Slides' import. A slide that already has its own
   timing is left alone. Returns the number of boxes animated. */
/* Lesson quality A (2026-10-19): two finishing passes on the saved file, before the animations.
   goldUnderlines — key words ({k}) get a GOLD underline: pptxgenjs can only underline in the text
     colour, so the runs were tagged lang="en-001"; here the tag becomes en-GB plus <a:uFill>.
   answerYellow — Patryk's projector: answer text on navy is Y5 yellow (FFD60A), not gold, which
     washes out with the lights on. An answer box = navy fill whose text is mostly gold (the same
     test the reveal animations use); headers, titles and Learn slides keep gold. */
const ANSWER = 'FFD60A';
function isAnswerBox(sp) {
  const spPr = (sp.match(/<p:spPr>[\s\S]*?<\/p:spPr>/) || [''])[0];
  if (!/^<p:spPr>[\s\S]*?<a:solidFill><a:srgbClr val="0D1B5E"/.test(spPr.replace(/<a:ln[\s\S]*?<\/a:ln>/g, ''))) return false;
  if (!/<a:rPr[^>]*>[\s\S]*?<a:srgbClr val="(FABB2E|FFD60A)"/.test(sp)) return false;
  let gold = 0, all = 0;
  for (const r of sp.match(/<a:r>[\s\S]*?<\/a:r>/g) || []) {
    const raw = ((r.match(/<a:t>([^<]*)<\/a:t>/) || [])[1] || '').trim();
    if (/^(ANSWER|Answer:?)$/.test(raw)) continue;
    all += raw.length;
    if (/<a:srgbClr val="(FABB2E|FFD60A)"/.test(r)) gold += raw.length;
  }
  if (!all || gold / all < 0.5) return false;
  return !/IMAGE BANK|Read more/i.test((sp.match(/<a:t>([^<]*)<\/a:t>/g) || []).join(' '));
}
function finishText(pptxPath) {
  const zip = new AdmZip(pptxPath);
  let keys = 0, answers = 0;
  for (const e of zip.getEntries()) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(e.entryName)) continue;
    let xml = e.getData().toString('utf8');
    const before = xml;
    xml = xml.replace(/<a:rPr lang="en-001" altLang="en-US"/g, () => { keys++; return '<a:rPr lang="en-GB"'; });
    // put the uFill in schema order: after fill/highlight, before latin/ea/cs/sym/hlinkClick
    xml = xml.replace(/<a:rPr lang="en-GB"([^>]*)>([\s\S]*?)<\/a:rPr>/g, (m0, attrs, inner) => {
      if (inner.includes('<a:uFill>') || !/ u="sng"/.test(attrs)) return m0;
      const uf = '<a:uFill><a:solidFill><a:srgbClr val="F9A825"/></a:solidFill></a:uFill>';
      const at = inner.search(/<a:(latin|ea|cs|sym|hlinkClick|hlinkMouseOver|rtl|extLst)\b/);
      return `<a:rPr lang="en-GB"${attrs}>` + (at < 0 ? inner + uf : inner.slice(0, at) + uf + inner.slice(at)) + '</a:rPr>';
    });
    if (!/<a:t>LEARN [·\-:]/.test(xml)) {
      xml = xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, (sp) => {
        if (!isAnswerBox(sp)) return sp;
        answers++;
        return sp.replace(/(<a:rPr[^>]*>(?:(?!<\/a:rPr>)[\s\S])*?<a:srgbClr val=")FABB2E/g, '$1' + ANSWER);
      });
    }
    if (xml !== before) zip.updateFile(e.entryName, Buffer.from(xml, 'utf8'));
  }
  if (keys || answers) zip.writeZip(pptxPath);
  return { keys, answers };
}

function addRevealAnimations(pptxPath) {
  const zip = new AdmZip(pptxPath);
  let total = 0;
  for (const e of zip.getEntries()) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(e.entryName)) continue;
    let xml = e.getData().toString('utf8');
    if (xml.includes('<p:timing')) continue;
    if (/<a:t>LEARN [·\-:]/.test(xml)) continue;   // Learn content is taught, not revealed
    const boxes = [];
    for (const sp of xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || []) {
      const spPr = (sp.match(/<p:spPr>[\s\S]*?<\/p:spPr>/) || [''])[0];
      if (!/^<p:spPr>[\s\S]*?<a:solidFill><a:srgbClr val="0D1B5E"/.test(spPr.replace(/<a:ln[\s\S]*?<\/a:ln>/g, ''))) continue;
      if (!/<a:rPr[^>]*>[\s\S]*?<a:srgbClr val="(FABB2E|FFD60A)"/.test(sp)) continue;
      if (!/<a:t>[^<]*\S/.test(sp)) continue;
      // most of the box's text must be gold (an answer), not a gold label on a white question
      let gold = 0, all = 0;
      for (const r of sp.match(/<a:r>[\s\S]*?<\/a:r>/g) || []) {
        const raw = ((r.match(/<a:t>([^<]*)<\/a:t>/) || [])[1] || '').trim();
        if (/^(ANSWER|Answer:?)$/.test(raw)) continue;                  // the label on an answer box
        const t = raw.length;
        all += t;
        if (/<a:srgbClr val="(FABB2E|FFD60A)"/.test(r)) gold += t;
      }
      if (!all || gold / all < 0.5) continue;
      const text = (sp.match(/<a:t>([^<]*)<\/a:t>/g) || []).join(' ');
      if (/IMAGE BANK|Read more/i.test(text)) continue;                 // banners, not answers
      const id = (sp.match(/<p:cNvPr id="(\d+)"/) || [])[1];
      const off = sp.match(/<a:off x="(\d+)" y="(\d+)"/);
      if (id && off) boxes.push({ id, x: +off[1], y: +off[2] });
    }
    if (!boxes.length) continue;
    // reading order; boxes within ~0.1" of the same top count as one row
    boxes.sort((a, b) => (Math.abs(a.y - b.y) < 91440 ? a.x - b.x : a.y - b.y));
    let n = 3;
    const clicks = boxes.map((b) => {
      const [c1, c2, c3, c4] = [n++, n++, n++, n++];
      return `<p:par><p:cTn id="${c1}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>` +
        `<p:par><p:cTn id="${c2}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
        `<p:par><p:cTn id="${c3}" presetID="1" presetClass="entr" presetSubtype="0" fill="hold" grpId="0" nodeType="clickEffect">` +
        `<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:set><p:cBhvr>` +
        `<p:cTn id="${c4}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>` +
        `<p:tgtEl><p:spTgt spid="${b.id}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>` +
        `</p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set></p:childTnLst></p:cTn></p:par>` +
        `</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
    }).join('');
    const timing = '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>' +
      '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>' + clicks +
      '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>' +
      '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>' +
      '</p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst>' +
      boxes.map((b) => `<p:bldP spid="${b.id}" grpId="0" animBg="1"/>`).join('') + '</p:bldLst></p:timing>';
    // <p:timing> sits after <p:clrMapOvr> and before any <p:extLst> at the end of <p:sld>
    const tail = xml.lastIndexOf('<p:extLst>') > xml.lastIndexOf('</p:cSld>') ? xml.lastIndexOf('<p:extLst>') : xml.lastIndexOf('</p:sld>');
    xml = xml.slice(0, tail) + timing + xml.slice(tail);
    zip.updateFile(e.entryName, Buffer.from(xml, 'utf8'));
    total += boxes.length;
  }
  if (total) zip.writeZip(pptxPath);
  return total;
}

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
    // EOT-wrapped, not raw TTF: PowerPoint silently ignores a raw .ttf here (see ttfToEot).
    zip.addFile('ppt/fonts/font1.fntdata', ttfToEot(fs.readFileSync(CAVEAT_REGULAR_PATH)));
    zip.addFile('ppt/fonts/font2.fntdata', ttfToEot(fs.readFileSync(CAVEAT_BOLD_PATH)));
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
  return stripKeys(obj[0] || L.meta.title || L.meta.topic || '');
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
  // Instruction Do Now (Patryk 2026-10-14): test lessons ("look over your notes") and review lessons
  // ("tick WWWs and EBIs, pick 3 areas of focus") have steps, not questions. doNow.task = the steps.
  const task = !qs.length && L.doNow ? arr(L.doNow.task) : [];
  if (task.length) {
    const rowH = Math.min(1.5, (bottom - top - (task.length - 1) * 0.12) / task.length);
    task.forEach((line, i) => {
      const ry = top + i * (rowH + 0.12);
      s.addShape('roundRect', { x: rx, y: ry + (rowH - 0.5) / 2, w: 0.5, h: 0.5, rectRadius: 0.05, fill: { color: GOLD }, line: { type: 'none' } });
      txt(s, String(i + 1), { x: rx, y: ry + (rowH - 0.5) / 2, w: 0.5, h: 0.5, color: NAVY, bold: true, fontSize: 20, align: 'center', valign: 'middle' });
      goldBox(s, rx + 0.65, ry, rw - 0.65, rowH, prettyText(line), { fill: 'F8F7F0', fontSize: autoFontSize(line, rw - 0.65, rowH, { min: 18, max: 26 }), valign: 'middle' });
    });
    silentEntryFooter(s);
    bottomBar(s, objectiveText(L));
    return;
  }
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

/* ---- OBJECTIVES (Lesson quality A, Patryk's O7, 2026-10-19) -------------
   Straight after the Do Now answers, before Engage. The Do Now slide keeps its own objectives.
   Dark band "WORDS YOU KNOW" (title.knownWords: [{term, definition}] — only words an earlier lesson
   taught; left out when empty), "WORDS FOR THIS LESSON" as navy tags (title.keywords minus known
   ones, no definitions), then the numbered objectives with {k} key words highlighted. */
/* lessonSequence(L) — the "This lesson" lines (Patryk 2026-10-23): what pupils do in Learn, Build and
   Apply. Claude writes title.sequence { learn, build, apply } (plain instructions, his voice); any line
   left out is filled from the lesson itself. */
function lessonSequence(L) {
  const seq = (L.title && L.title.sequence) || {};
  const learn = arr(L.learn), build = arr(L.build);
  const cmp = learn.find((x) => String(x.variant || '').toUpperCase() === 'E' && x.comparison && x.comparison.aTitle);
  const heads = learn.map((x) => stripStage(stripKeys(x.heading || x.title || ''), 'LEARN')).filter(Boolean);
  const pr = build.find((b) => (b.type || b.variant) === 'practical');
  const lower = (s) => String(s).charAt(0).toLowerCase() + String(s).slice(1);
  return {
    learn: seq.learn || (cmp ? `Note down the key terms, then compare ${lower(cmp.comparison.aTitle)} and ${lower(cmp.comparison.bTitle)}.`
      : 'Note down the key terms' + (heads.length ? ': ' + heads.slice(0, 3).map(lower).join(', ') : '') + '.'),
    build: seq.build || (pr ? 'Do the experiment' + (pr.heading ? ': ' + lower(stripKeys(pr.heading)) : '') + '.'
      : build.some((b) => (b.type || b.variant) === 'workedExample') ? 'Follow the worked example, then try one yourself.' : 'Quick questions to check you\'ve got it.'),
    apply: seq.apply || 'Use what you\'ve learnt on the worksheet questions.',
  };
}
function slideObjectives(pptx, L) {
  const t = L.title || {};
  const objectives = arr(t.objectives).slice(0, 3);
  const known = arr(t.knownWords).filter((k) => k && k.term).slice(0, 4);
  const knownSet = new Set(known.map((k) => String(k.term).toLowerCase()));
  const lesson = arr(t.keywords).filter((w) => !knownSet.has(String(w).toLowerCase())).slice(0, 8);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'engage');
  let y = sectionHeader(s, 'LEARNING OBJECTIVES', STAGE.engage, TOP);
  if (known.length) {
    const rowH = 0.42, h = 0.38 + known.length * rowH + 0.08;
    s.addShape('rect', { x: MX, y, w: CW, h, fill: { color: NAVY }, line: { type: 'none' } });
    txt(s, 'WORDS YOU KNOW', { x: MX + 0.15, y: y + 0.06, w: CW - 0.3, h: 0.3, color: 'C9D3F2', fontSize: 11, charSpacing: 1, valign: 'middle' });
    known.forEach((k, i) => {
      const line = [{ text: String(k.term), options: { bold: true, color: ANSWER } }, { text: ':  ' + prettyText(k.definition || ''), options: { color: 'FFFFFF' } }];
      txt(s, line, { x: MX + 0.15, y: y + 0.38 + i * rowH, w: CW - 0.3, h: rowH, fontSize: autoFontSize(k.term + ': ' + (k.definition || ''), CW - 0.3, rowH, { min: 12, max: 17 }), valign: 'middle', fit: 'shrink' });
    });
    y += h + 0.14;
  }
  if (lesson.length) {
    txt(s, 'WORDS FOR THIS LESSON', { x: MX, y, w: 2.6, h: 0.42, color: '555555', fontSize: 11, charSpacing: 1, valign: 'middle' });
    let tx = MX + 2.65;
    lesson.forEach((w) => {
      const tw = Math.min(3.2, 0.35 + String(w).length * 0.13);
      if (tx + tw > MX + CW) return;
      txt(s, String(w), { x: tx, y: y + 0.03, w: tw, h: 0.36, fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 14, align: 'center', valign: 'middle', rectRadius: 0.06, shape: pptx.ShapeType.roundRect });
      tx += tw + 0.12;
    });
    y += 0.42 + 0.2;
  }
  // "This lesson": Learn, Build, Apply in their stage colours, across the bottom (always shown)
  const sq = lessonSequence(L), stripH = 1.05, sy = BOT_Y - 0.12 - stripH, bw = (CW - 2 * GAP) / 3;
  [['learn', 'LEARN'], ['build', 'BUILD'], ['apply', 'APPLY']].forEach(([k, head], i) => {
    const bx = MX + i * (bw + GAP);
    txt(s, head, { x: bx, y: sy, w: bw, h: 0.32, fill: { color: STAGE[k] }, color: 'FFFFFF', bold: true, fontSize: 12, charSpacing: 1, valign: 'middle', margin: 6 });
    txt(s, prettyText(sq[k]), { x: bx, y: sy + 0.32, w: bw, h: stripH - 0.32, fill: { color: 'FFFFFF' }, line: { color: STAGE[k], width: 1.5 }, color: '1A1A2E',
      fontSize: autoFontSize(sq[k], bw - 0.2, stripH - 0.32, { min: 13, max: 17 }), valign: 'middle', fit: 'shrink', margin: 6 });
  });
  txt(s, 'THIS LESSON', { x: MX, y: sy - 0.32, w: 3, h: 0.3, color: '555555', fontSize: 11, charSpacing: 1, valign: 'middle' });
  const bottom = sy - 0.4;
  const rowH = objectives.length ? Math.min(1.1, (bottom - y) / objectives.length) : 0;
  objectives.forEach((o, i) => {
    const ry = y + i * rowH;
    s.addShape('ellipse', { x: MX, y: ry + (rowH - 0.5) / 2, w: 0.5, h: 0.5, fill: { color: GOLD }, line: { color: NAVY, width: 1.5 } });
    txt(s, String(i + 1), { x: MX, y: ry + (rowH - 0.5) / 2, w: 0.5, h: 0.5, color: NAVY, bold: true, fontSize: 18, align: 'center', valign: 'middle' });
    txt(s, prettyText(o), { x: MX + 0.7, y: ry, w: CW - 0.7, h: rowH, color: '1A1A2E', fontSize: autoFontSize(o, CW - 0.7, rowH, { min: 16, max: 24 }), valign: 'middle', fit: 'shrink' });
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
  if (e.notes) s.addNotes(stripKeys(e.notes));                   // Lesson quality A
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
      imageOrPlaceholder(s, e, MX + leftW + 0.15, midY, CW * 0.45 - 0.15, midH);
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
      imageOrPlaceholder(s, e, MX + leftW + 0.15, y, CW * 0.45 - 0.15, ctxH + videoH + (videoH ? GAP : 0));
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
/* numberBadge — the gold numbered circle used on flow steps and, since
   2026-07-12, on annotatedDiagram labels. (cx, cy) is the circle's centre. */
function numberBadge(slide, cx, cy, d, idx) {
  const BX = cx - d / 2, BY = cy - d / 2;
  slide.addShape('ellipse', { x: BX, y: BY, w: d, h: d, fill: { color: GOLD }, line: { type: 'none' } });
  txt(slide, String(idx + 1), { x: BX, y: BY, w: d, h: d, bold: true, color: NAVY2, fontSize: 15, align: 'center', valign: 'middle' });
}

function flowStepBox(slide, X, Y, W, H, bcx, bcy, idx, step) {
  slide.addShape('roundRect', { x: X, y: Y, w: W, h: H, rectRadius: 0.06, fill: { color: NAVY2 }, line: GOLD2 });
  const bd = 0.34, BX = bcx - bd / 2;
  const padL = Math.max(0.1, (BX + bd) - X + 0.06);
  const tX = X + padL, tW = Math.max(0.4, W - padL - 0.08);
  const label = String(step.label || ('Step ' + (idx + 1))), note = String(step.note || '');
  const runs = [{ text: label, options: { bold: true, color: 'FFFFFF', fontSize: autoFontSize(label, tW, H * 0.45, { min: 13, max: 19 }), breakLine: true, paraSpaceAfter: 4 } }];
  if (note) runs.push({ text: note, options: { italic: true, color: GOLD, fontSize: autoFontSize(note, tW, H * 0.55, { min: 10, max: 13 }) } });
  txt(slide, runs, { x: tX, y: Y + 0.04, w: tW, h: H - 0.08, align: 'left', valign: 'middle', margin: 3, fit: 'shrink' });
  numberBadge(slide, bcx, bcy, bd, idx);
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
/* ---- LEARN EXTRAS (Lesson quality A, Patryk's picks 2026-10-19) ---------------------------
   examDefinition {term, wording, board, asked}: "LEARN THIS WORDING" box; wording carries {1}…{/1}
     around each mark-earning part, drawn in the review mark colours (one per mark); the term is
     printed bold before it. The plain explanation goes in item.notes.
   definition {term, text, origin, examples[], notExamples[]}: white card with a gold edge (F4),
     plus green "Examples" / red "Not examples" boxes when given (F2).
   misconception {wrong, right}: "✗ Not quite" (crossed out) → "✓ Actually" (M7). */
function markedRuns(text, base) {
  const out = []; const re = /\{(\d)\}([\s\S]*?)\{\/\1\}/g; let last = 0, m;
  const s = String(text || '');
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: prettyText(s.slice(last, m.index)), options: Object.assign({}, base) });
    out.push({ text: prettyText(m[2]), options: Object.assign({}, base, { highlight: MARK_HI[(+m[1] - 1) % MARK_HI.length] }) });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ text: prettyText(s.slice(last)), options: Object.assign({}, base) });
  return out;
}
function learnTopExtras(s, item, y) {
  const ed = item.examDefinition, df = item.definition;
  if (ed && ed.wording) {
    const head = 0.34, words = stripMarkTags(ed.term + ' ' + ed.wording);
    const bodyH = Math.max(0.7, Math.min(1.3, 0.35 + Math.ceil(words.length / 70) * 0.36));
    s.addShape('rect', { x: MX, y, w: CW, h: head + bodyH, fill: { color: 'FFFFFF' }, line: { color: NAVY, width: 2 } });
    txt(s, 'LEARN THIS WORDING', { x: MX, y, w: CW, h: head, fill: { color: NAVY }, color: ANSWER, bold: true, fontSize: 12, charSpacing: 1, valign: 'middle', margin: 8 });
    if (ed.asked) txt(s, `${ed.board || 'AQA'}: asked ${ed.asked} time${ed.asked === 1 ? '' : 's'}`, { x: MX + CW - 3.2, y, w: 3.1, h: head, color: 'C9D3F2', fontSize: 11, align: 'right', valign: 'middle' });
    const fs = autoFontSize(words, CW - 0.2, bodyH, { min: 14, max: 22 });
    txt(s, [{ text: String(ed.term) + ' ', options: { bold: true, color: NAVY } }].concat(markedRuns(ed.wording, { color: '1A1A2E' })),
      { x: MX + 0.1, y: y + head, w: CW - 0.2, h: bodyH, fontSize: fs, valign: 'middle', fit: 'shrink' });
    return y + head + bodyH + GAP;
  }
  if (df && df.text) {
    // word parts (Patryk 2026-10-23): poly "many" + mer "part" → a chain of many parts; they replace the origin line
    const parts = arr(df.parts).filter((p) => p && p.part);
    const line = [{ text: String(df.term || '') + '  ', options: { bold: true, color: NAVY } }, { text: prettyText(df.text), options: { color: '1A1A2E' } }]
      .concat(df.origin && !parts.length ? [{ text: '   ' + prettyText(df.origin), options: { color: '666666', fontSize: 12, italic: true } }] : []);
    const ph = parts.length ? 0.44 : 0, h = 0.62 + ph;
    s.addShape('rect', { x: MX, y, w: CW, h, fill: { color: 'FFFFFF' }, line: { type: 'none' } });
    s.addShape('rect', { x: MX, y, w: 0.09, h, fill: { color: GOLD }, line: { type: 'none' } });
    txt(s, line, { x: MX + 0.18, y, w: CW - 0.25, h: 0.62, fontSize: autoFontSize(stripKeys(df.term + ' ' + df.text), CW - 0.25, 0.62, { min: 13, max: 19 }), valign: 'middle', fit: 'shrink' });
    if (parts.length) {
      let px = MX + 0.18;
      const py = y + 0.62, maxX = MX + CW - 0.1;
      parts.forEach((p, k) => {
        if (k) { txt(s, '+', { x: px, y: py, w: 0.3, h: 0.36, color: NAVY, bold: true, fontSize: 16, align: 'center', valign: 'middle' }); px += 0.3; }
        const cw = 0.3 + String(p.part).length * 0.14, mw = 0.25 + String(p.means || '').length * 0.11;
        if (px + cw + mw > maxX) return;
        txt(s, String(p.part), { x: px, y: py + 0.02, w: cw, h: 0.34, fill: { color: NAVY }, color: ANSWER, bold: true, fontSize: 15, align: 'center', valign: 'middle', rectRadius: 0.06, shape: 'roundRect' });
        txt(s, String(p.means || ''), { x: px + cw + 0.05, y: py, w: mw, h: 0.38, color: '1A1A2E', italic: true, fontSize: 14, valign: 'middle' });
        px += cw + 0.05 + mw;
      });
      if (df.sum && px + 1 < maxX) txt(s, '→  ' + prettyText(df.sum), { x: px + 0.1, y: py, w: maxX - px - 0.1, h: 0.38, color: NAVY, bold: true, fontSize: 14, valign: 'middle', fit: 'shrink' });
    }
    y += h + GAP;
    const ex = arr(df.examples), no = arr(df.notExamples);
    if (ex.length || no.length) {
      const bw = (CW - GAP) / 2, bh = 0.95;
      [[ex, 'Examples', '2E7D32'], [no, 'Not examples', 'C62828']].forEach(([list, head, col], i) => {
        if (!list.length) return;
        const bx = MX + i * (bw + GAP);
        txt(s, head, { x: bx, y, w: bw, h: 0.3, fill: { color: col }, color: 'FFFFFF', bold: true, fontSize: 12, valign: 'middle', margin: 6 });
        txt(s, prettyText(list.join('  \u00B7  ')), { x: bx, y: y + 0.3, w: bw, h: bh - 0.3, fill: { color: 'FFFFFF' }, line: { color: col, width: 1.5 }, color: '1A1A2E', fontSize: 14, valign: 'middle', fit: 'shrink', margin: 6 });
      });
      y += bh + GAP;
    }
  }
  return y;
}
function learnMisconception(s, mc, bottom) {
  const h = 1.0, aw = 0.5, bw = (CW - aw - 2 * GAP) / 2, y = bottom - h;
  txt(s, [{ text: '\u2717 Not quite', options: { bold: true, color: 'C62828', breakLine: true } },
          { text: prettyText(mc.wrong || ''), options: { color: '1A1A2E', strike: 'sngStrike' } }],
    { x: MX, y, w: bw, h, fill: { color: 'FFFFFF' }, line: { color: 'C62828', width: 1.5 }, fontSize: 18, valign: 'middle', margin: 8, fit: 'shrink' });
  txt(s, '\u2192', { x: MX + bw + GAP, y, w: aw, h, color: NAVY, bold: true, fontSize: 28, align: 'center', valign: 'middle' });
  txt(s, [{ text: '\u2713 Actually', options: { bold: true, color: '2E7D32', breakLine: true } },
          { text: prettyText(mc.right || ''), options: { color: '1A1A2E' } }],
    { x: MX + bw + aw + 2 * GAP, y, w: bw, h, fill: { color: 'FFFFFF' }, line: { color: '2E7D32', width: 1.5 }, fontSize: 18, valign: 'middle', margin: 8, fit: 'shrink' });
  return h;
}

function slideLearn(pptx, L, item) {
  const v = String(item.variant || 'A').toUpperCase();
  // Learn L, labelled picture (Part B 2026-10-23): drawn by learn-pictures.js, one item however many slides
  if (v === 'L' || v === 'LABELLED_PICTURE') return require('./learn-pictures.js').labelledPicture(pptx, L, item, {
    C: { BG, NAVY, STAGE, TOP, MX, CW, BOT_Y }, navBar, sectionHeader, bottomBar, objectiveText, stripStage, stripKeys, txt, addImageFit, imageOrPlaceholder, buildWarn });
  const map = { KEY_INFO: 'A', KEYWORDS: 'B', WRITE_IN_BOOK: 'B', REVISION_TABLE: 'C', IMAGE_COPY: 'D', COMPARISON_TABLE: 'E', EQUATION_CALLOUT: 'F', FLOW: 'G', SEQUENCE: 'G', VIDEO: 'H', FLOWCHART: 'I', GRAPH_SKETCH: 'J', TIMELINE: 'K' };
  const variant = map[v] || (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(v) ? v : 'A');
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'learn');
  const obj = objectiveText(L);

  if (variant === 'A') {
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const bodyBottom = BOT_Y - 0.08;
    // 2026-10-14: no picture and no annotation zone → the boxes use the full width (was: an empty
    // right half), and up to 3 boxes fit. Box height is shared by the boxes actually drawn (was: a
    // 3rd box was dropped but still took its share, squashing the others).
    const noRight = item.imagePlaceholder === false && !item.annotationZone;
    const leftW = noRight ? CW : CW * 0.55, rightX = MX + leftW + 0.15, rightW = CW * 0.45 - 0.15;
    const boxes = (item.boxes || [{ header: item.heading || 'Key information', items: arr(item.body ? String(item.body).split('\n') : []) }]).slice(0, noRight ? 3 : 2);
    const kw = arr(item.keywords);
    const kwH = kw.length ? 1.0 : 0;
    // Lesson quality A: exam wording / definition card on top, misconception box at the bottom
    y = learnTopExtras(s, item, y);
    const misH = item.misconception ? learnMisconception(s, item.misconception, bodyBottom) + GAP : 0;
    const stackBottom = bodyBottom - misH;
    const stackH = stackBottom - y - (kwH ? kwH + GAP : 0);
    const each = (stackH - (boxes.length - 1) * GAP) / boxes.length;
    let by = y;
    boxes.forEach((b) => {
      navyHeaderBox(s, MX, by, leftW, b.header || 'Key information', arr(b.items), each);
      by += each + GAP;
    });
    if (kw.length) {
      navyHeaderBox(s, MX, stackBottom - kwH, leftW, 'Key terms:', [kw.join('  \u00B7  ')], kwH);
    }
    if (item.annotationZone) {
      annotationZone(s, rightX, y, rightW, Math.min(4.0, stackBottom - y));
    } else if (item.imagePlaceholder !== false) {
      imageOrPlaceholder(s, item, rightX, y, rightW, stackBottom - y);
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
    // few rows: bigger text so the table reads from the back (it used to sit in 10pt at the top)
    const fsFor = (n) => (n <= 5 ? 18 : n <= 8 ? 14 : 10);
    const mk = (rows, x, w, title) => {
      const fs = fsFor(Math.max(arr(item.corePaper).length, arr(item.extendPaper).length) * (hasCore && hasExt ? 1.5 : 1));
      const trows = [[{ text: title, options: { fill: { color: NAVY }, color: GOLD, bold: true, fontSize: fs + 2, align: 'center', colspan: 2 } }],
        [{ text: 'Question', options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: fs } },
         { text: 'Support pages', options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: fs } }]]
        .concat(arr(rows).map((r, i) => {
          const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
          return [{ text: r.q || '', options: { fill: { color: fill }, fontSize: fs } },
                  { text: pagesOnly(r.pages), options: { fill: { color: fill }, fontSize: fs, align: 'center' } }];
        }));
      table(s, trows, { x, y, w, colW: [w * 0.72, w * 0.28], fontFace: FONT, border: { type: 'solid', pt: 0.5, color: 'BBBBBB' }, margin: 0.04, autoPage: false });
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
    txt(s, aTitle, { x: MX, y, w: colW, h: headerH, fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 16, align: 'center', valign: 'middle' });
    txt(s, bTitle, { x: MX + colW + 0.15, y, w: colW, h: headerH, fill: { color: STAGE.build }, color: 'FFFFFF', bold: true, fontSize: 16, align: 'center', valign: 'middle' });
    y += headerH + 0.06;
    const cmpAvail = BOT_Y - 0.08 - y - (cmpRows.length - 1) * 0.06;
    // Fill the slide like Do Now: floor keeps many-row tables legible, generous
    // ceiling lets a 2-3 row comparison expand instead of leaving the bottom empty.
    const rowH = Math.max(0.7, Math.min(1.8, cmpAvail / Math.max(1, cmpRows.length)));
    const cmpBlockH = cmpRows.length * rowH + (cmpRows.length - 1) * 0.06;
    let cy = y + Math.max(0, (cmpAvail - cmpBlockH) / 2);
    cmpRows.forEach((r, i) => {
      const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
      // 2026-10-22: rows grow into their space (was a fixed 14pt: 7MLA animal cells table read small)
      const fs = Math.min(...[r.a, r.b].map((t) => autoFontSize(String(t || ''), colW - 0.15, rowH, { min: 14, max: 22 })));
      goldBox(s, MX, cy, colW, rowH, String(r.a || ''), { fill, fontSize: fs, valign: 'middle' });
      goldBox(s, MX + colW + 0.15, cy, colW, rowH, String(r.b || ''), { fill, fontSize: fs, valign: 'middle' });
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
        // 2026-07-08 request: each event can carry its own image — it renders on the
        // OPPOSITE side of the timeline from the event box (that space was empty),
        // with the usual suggested-search placeholder when only a description exists.
        if (ev.embeddedImagePath || ev.imageDescription) {
          const imgH2 = Math.min(boxH, availH * 0.32);
          const iy = above ? lineY + 0.06 + tickH : lineY - tickH - imgH2;
          imageOrPlaceholder(s, ev, bx, iy, boxW, imgH2);
        }
      });
    }
  }

  if (item.notes) s.addNotes(stripKeys(item.notes));               // Lesson quality A: what Patryk says
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
  txt(s, 'Decide T or F for each. Be ready to justify on 3-2-1', {
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
      runs.push({ text: ':  ' + st.correction, options: { fontSize: 13, italic: true, color: '333333', breakLine: false } });
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
      fontSize: 22, profile, ruled: false, mode: handwritingMode(L, item),   // 2026-07-12: +2pt again per Patryk — pupils still found it small
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
  // 2026-10-03 (Patryk, 10C2 L11): short items ("wind", "coal") sat tiny in big boxes under the old
  // 16pt cap. Size every box from the LONGEST item (one size for all, so the grid stays even),
  // fitted to the box's real width and height: short words fill it, long ones still fit.
  const longest = items.reduce((a, it) => (String(it).length > a.length ? String(it) : a), '');
  const sortFs = autoFontSize('00   ' + longest, colW - 0.3, cellH, { min: 16, max: 32 });
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
    const ansFs = fitListFont(list.map((it) => '·  ' + it), cw2 - 0.3, boxH, 16, 40); // M7, sized to fill (2026-10-03)
    // spread a short list down the box instead of bunching it at the top (2026-10-03)
    const spare = boxH * 72 * 0.8 - list.length * ansFs * 1.4;
    const gapPt = Math.max(6, Math.min(30, spare / Math.max(1, list.length)));
    const runs = list.map((it) => ({ text: '\u00B7  ' + it, options: { fontSize: ansFs, breakLine: true, paraSpaceAfter: gapPt } }));
    goldBox(s, cx, y + 0.42, cw2, boxH, runs, { valign: 'top', fill: NAVY, color: GOLD });
  });
  bottomBar(s, obj);
}

/* ---- BUILD — practical (+ optional Q&A answers slide) -------------------- */
function slidePractical(pptx, L, item, beforeData) {
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

  // Experiment MCQs (about:"practical") go here: after the method (and its answers), BEFORE the data.
  if (typeof beforeData === 'function') beforeData();

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
    table(s3, tRows, { x: MX, y: y3, w: CW, colW, rowH: Array(tRows.length).fill(rowH3), fontFace: FONT, margin: 0.06, autoPage: false });
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

/* ---- BUILD — bigFact (2026-07-11) ------------------------------------------
   One huge number/fact filling a navy slide, display-only (no worksheet
   output — unmatched Build types already produce nothing there). Schema:
   { type: "bigFact", fact, unit?, context? }. navBar/bottomBar kept for deck
   navigation consistency even though the body is a full navy background. */
function slideBigFact(pptx, L, item) {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  navBar(s, 'build');
  const x = MX, w = SW - 2 * MX;
  const bodyTop = TOP, bodyBot = BOT_Y - GAP;
  const contextH = item.context ? 0.6 : 0;
  const factH = bodyBot - bodyTop - contextH;

  const fact = String(item.fact != null ? item.fact : '');
  const factSize = autoFontSize(fact, w, factH, { min: 32, max: 96 });
  const runs = [{ text: fact, options: { fontSize: factSize, bold: true, color: GOLD } }];
  if (item.unit) {
    runs.push({ text: ' ' + item.unit, options: { fontSize: Math.round(factSize * 0.5), bold: true, color: GOLD } });
  }
  txt(s, runs, {
    x, y: bodyTop, w, h: factH,
    align: 'center', valign: 'middle', fit: 'shrink',
  });
  if (item.context) {
    txt(s, item.context, {
      x, y: bodyTop + factH, w, h: contextH,
      fontSize: 18, color: 'FFFFFF', align: 'center', valign: 'top', fit: 'shrink',
    });
  }
  bottomBar(s, objectiveText(L));
}

/* ---- BUILD — reformatFlowchart (2026-07-12) --------------------------------
   Students reorder scrambled process steps. Schema: { type:"reformatFlowchart",
   heading?, instruction?, steps:[{label, note?}] } — steps are authored in the
   CORRECT order; the question slide displays them shuffled (deterministic, not
   random, so slide/worksheet/tests always agree) and lettered A/B/C… instead of
   numbered, so the letter order itself doesn't leak the answer. The answer
   slide shows the same boxes back in the correct order, connected with the
   same native gold arrows used on Learn-I flowcharts, each labelled with its
   step number and a reminder of which letter it was shown as. */
function shuffleOrder(n) {
  const order = [];
  let lo = 0, hi = n - 1, takeHigh = true;
  while (lo <= hi) {
    if (takeHigh) { order.push(hi--); } else { order.push(lo++); }
    takeHigh = !takeHigh;
  }
  return order;
}

function slideReformatFlowchart(pptx, L, item) {
  const obj = objectiveText(L);
  const steps = arr(item.steps).slice(0, 6);
  const n = steps.length;
  const order = shuffleOrder(n);                 // shuffled[k] = steps[order[k]]
  const letters = 'ABCDEF';

  // ---- question slide: shuffled, lettered, no arrows (order is undetermined) ----
  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD · ' + (item.heading || 'REORDER THE STEPS'), STAGE.build, TOP);
  const cols = n > 3 ? 3 : n;
  const rows = Math.ceil(n / cols) || 1;
  const cellW = (CW - (cols - 1) * GAP) / cols, cellH = Math.min(1.8, (BOT_Y - 0.08 - y - 0.4 - GAP - (rows - 1) * GAP) / rows);
  order.forEach((origIdx, k) => {
    const col = k % cols, row = Math.floor(k / cols);
    const bx = MX + col * (cellW + GAP), by = y + row * (cellH + GAP);
    goldBox(s, bx, by, cellW, cellH, [
      { text: letters[k] + '   ', options: { bold: true, fontSize: 16, color: AMBER } },
      { text: String(steps[origIdx].label || ''), options: { fontSize: 14 } },
    ], { valign: 'middle' });
  });
  const footY = y + rows * cellH + (rows - 1) * GAP + GAP;
  txt(s, item.instruction || 'Work out the correct order. Write the letters in sequence.', {
    x: MX, y: footY, w: CW, h: 0.4, fill: { color: NAVY },
    color: 'FFFFFF', bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  bottomBar(s, obj);

  // ---- answer slide: correct order, native arrows, letter cross-reference ----
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, 'BUILD · ' + (item.heading || 'REORDER THE STEPS') + ': ANSWERS', STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);
  const arrowSz = 0.3;
  const nodeW = (CW - (n - 1) * arrowSz) / n;
  const nodeH = Math.min(2.2, BOT_Y - 0.08 - y);
  steps.forEach((st, i) => {
    const nx = MX + i * (nodeW + arrowSz);
    const shownAs = letters[order.indexOf(i)];
    goldBox(s, nx, y, nodeW, nodeH, [
      { text: (i + 1) + '  (shown as ' + shownAs + ')', options: { bold: true, fontSize: 11, color: GOLD, breakLine: true, paraSpaceAfter: 4 } },
      { text: String(st.label || ''), options: { fontSize: 13 } },
    ], { fill: NAVY, valign: 'middle', align: 'center' });
    if (i < n - 1) {
      const acy = y + nodeH / 2;
      flowArrow(s, nx + nodeW + 0.04, acy, nx + nodeW + arrowSz - 0.04, acy);
    }
  });
  bottomBar(s, obj);
}

/* ---- BUILD — annotatedDiagram (Bug 34, 2026-07-12) -------------------------
   Base image + numbered gold badges at labelled points, with a key box
   listing what each number means. Schema: { type:"annotatedDiagram", heading?,
   imageDescription?, embeddedImagePath?, labels:[{x, y, text}] } — x/y are
   fractions (0–1) of the image's own width/height, so badge placement survives
   the image being scaled to fit the slide. Reuses numberBadge() (the same gold
   circle already used on flow steps) and imageOrPlaceholder() for the base
   image, same as every other image slot in the deck. */
function slideAnnotatedDiagram(pptx, L, item) {
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  const y = sectionHeader(s, 'BUILD · ' + (item.heading || 'LABEL THE DIAGRAM'), STAGE.build, TOP);
  const labels = arr(item.labels);
  const bottomY = BOT_Y - 0.08;
  const imgW = CW * 0.6, imgX = MX, imgY = y;
  const imgH = bottomY - imgY;
  imageOrPlaceholder(s, item, imgX, imgY, imgW, imgH);
  const d = 0.32;
  labels.forEach((lb, i) => {
    const cx = imgX + Math.max(0, Math.min(1, lb.x || 0)) * imgW;
    const cy = imgY + Math.max(0, Math.min(1, lb.y || 0)) * imgH;
    numberBadge(s, cx, cy, d, i);
  });
  const keyX = imgX + imgW + 0.2, keyW = CW - imgW - 0.2;
  const keyLines = labels.map((lb, i) => (i + 1) + '.  ' + String(lb.text || ''));
  goldBox(s, keyX, imgY, keyW, imgH, [
    { text: 'KEY', options: { bold: true, fontSize: 13, color: NAVY, breakLine: true, paraSpaceAfter: 8 } },
    ...keyLines.flatMap((line, i) => [{ text: line, options: { fontSize: 13, breakLine: i < keyLines.length - 1, paraSpaceAfter: 6 } }]),
  ], { valign: 'top' });
  bottomBar(s, objectiveText(L));
}

/* ---- BUILD — modelAnswerReview (M4-M11) -----------------------------------
   One slide per test question. Left: handwritten model answer (or, for
   qType:'graph', a standard graph_gen.py plot). Right: navy/gold marking
   panel built from indicative content already extracted (by Claude, at
   authoring time, from the real source mark scheme PDF — this renderer never
   invents marking content). See slide-options-v4.md for the full JSON shape. */
function buildMarkingPanelRuns(item, opts) {
  // opts.fs = base size (default 14, the original look); opts.only = 'points' | 'bands' to
  // draw half of the panel (Mark the Answers splits a long scheme over two columns).
  const o = opts || {};
  const F = o.fs || 14, d = (n) => Math.max(9, F - n);
  const show = (part) => !o.only || o.only === part;
  const runs = [];
  const push = (text, opts) => runs.push({ text, options: opts });

  // M7: navy background, gold text — gold is the base colour throughout the
  // panel (exclusions use a deliberate red accent to flag "wrong" at a glance).
  // Section order (Patryk 2026-07-05): INDICATIVE CONTENT → BANDS → EXCLUSIONARY
  // CLAIMS — three clearly-split blocks. Underline (<u>) renders ONLY on words
  // that MUST be used; nothing else is underlined.
  if (show('points')) {
  push(o.pointsTitle || 'INDICATIVE CONTENT', { bold: true, fontSize: F, color: GOLD, breakLine: true, paraSpaceAfter: 2 });
  let curGroup = null;
  arr(item.indicativeContent).forEach((ic) => {
    const isObj = ic && typeof ic === 'object';
    const text = isObj ? ic.text : ic;
    const dep = isObj && ic.dependentOn ? `  (dependent on ${ic.dependentOn})` : '';
    // Structural chunking: a sub-heading whenever ic.group changes (Substitution /
    // Answer / Conversion) — visual blocks, not more text.
    const grp = isObj && ic.group ? String(ic.group) : null;
    if (grp && grp !== curGroup) {
      push(grp.toUpperCase(), { bold: true, fontSize: d(2), color: 'FFE082', breakLine: true, paraSpaceBefore: 3, paraSpaceAfter: 2 });
      curGroup = grp;
    }
    // numbered point (mark: n) → a chip in the same colour as its highlight on the answer
    if (isObj && ic.mark != null) push(` ${ic.mark} `, { fontSize: F, bold: true, color: NAVY, highlight: markHi(String(ic.mark)) }), push('  ', { fontSize: F });
    else push('•  ', { fontSize: F, color: GOLD, bold: true });
    const markupRuns = markupToPptxRuns(prettyText(text), { fontSize: F, color: GOLD });
    markupRuns.forEach((r) => runs.push(r));
    if (dep) push(dep, { fontSize: d(2), italic: true, color: 'FFE082' });
    runs[runs.length - 1] = Object.assign({}, runs[runs.length - 1], {
      options: Object.assign({}, runs[runs.length - 1].options, { breakLine: true, paraSpaceAfter: 4 }),
    });
  });
  }

  if (show('bands') && arr(item.levelDescriptors).length) {
    if (runs.length) push(' ', { fontSize: 6, breakLine: true });
    push('BANDS', { bold: true, fontSize: F, color: GOLD, breakLine: true, paraSpaceAfter: 2 });
    arr(item.levelDescriptors).forEach((ld) => {
      push(`${ld.level || ''} (${ld.range || ''}):  `, { bold: true, fontSize: d(1), color: GOLD });
      push(prettyText(o.shortBands ? firstSentence(ld.desc || '') : (ld.desc || '')), { fontSize: d(1), color: GOLD, breakLine: true, paraSpaceAfter: 3 });
    });
  }

  if (show('bands') && arr(item.doesNotAward).length) {
    if (runs.length) push(' ', { fontSize: 6, breakLine: true });
    push(o.exclTitle || 'EXCLUSIONARY CLAIMS', { bold: true, fontSize: F, color: 'FF8A80', breakLine: true, paraSpaceAfter: 2 });
    arr(item.doesNotAward).forEach((dna) => {
      push(`✗  ${prettyText(dna)}`, { fontSize: d(1), color: 'FFCDD2', breakLine: true, paraSpaceAfter: 3 });
    });
  }

  if (show('points') && item.ecfNote) {
    push(' ', { fontSize: 4, breakLine: true });
    push('ECF:  ', { bold: true, fontSize: d(3), color: GOLD });
    push(item.ecfNote, { fontSize: d(3), italic: true, color: GOLD, breakLine: true });
  }
  return runs;
}
/* markingPanelFs — largest base size (10–16pt) at which the whole panel fits its box, so a long
   scheme shrinks instead of running off the slide. Same width model as autoFontSize. */
function markingPanelFs(item, w, h, opts) {
  const o = opts || {};
  const items = [], heads = new Set();
  arr(item.indicativeContent).forEach((ic) => {
    items.push(String((ic && ic.text) || ic) + '    ');
    if (ic && ic.group) heads.add(ic.group);
  });
  arr(item.levelDescriptors).forEach((ld) => items.push(`${ld.level} (${ld.range}): ` + (o.shortBands ? firstSentence(ld.desc || '') : (ld.desc || ''))));
  arr(item.doesNotAward).forEach((d) => items.push('✗  ' + d));
  const headCount = 1 + heads.size + (arr(item.levelDescriptors).length ? 1 : 0) + (arr(item.doesNotAward).length ? 1 : 0);
  for (let fs = o.max || 22; fs > 10; fs--) {   // 2026-10-12: up to 22pt, a short scheme fills its box
    const cpl = Math.max(1, Math.floor(((w - 0.25) * 120) / fs));
    const lines = items.reduce((t, l) => t + Math.max(1, Math.ceil(l.length / cpl)), 0) + headCount;
    if ((lines * fs * 1.3) / 72 + (items.length + headCount) * 0.065 <= (h - 0.25) * 0.92) return fs;   // + paragraph spacing
  }
  return 10;
}
/* firstSentence — a band descriptor cut to its first sentence (board version; the full
   wording stays on the worksheet / answer sheet). */
function firstSentence(t) {
  const m = String(t).match(/^(.+?[.;])(\s|$)/);
  return m ? m[1] : String(t);
}

/* Question pictures from the real test paper (Patryk 2026-10-12). item.snippet = a png path, or
   meta.snippetDir = the folder paper-snippets.py wrote, looked up by question number ("3(a)(iii)").
   Relative paths resolve from the lesson JSON's folder, then the working folder. */
const _snipIdx = {};
function resolveLocal(p) {
  if (!p) return null;
  const cands = path.isAbsolute(p) ? [p] : [path.resolve(path.dirname(process.argv[2] || '.'), p), path.resolve(p)];
  return cands.find((c) => fs.existsSync(c)) || null;
}
function snippetFor(L, item, qn, opts) {
  if (item && item.snippet === false) return null;
  if (item && item.snippet) {
    const f = resolveLocal(item.snippet);
    if (!f) buildWarn(`question picture not found: ${item.snippet} (typed question used instead)`);
    return f;
  }
  // meta.snippetDir: one folder, or { core: folder, extend: folder } for a two-paper test
  // (a shared question shows the Extend picture; the content is the same)
  const sd = L.meta && L.meta.snippetDir;
  if (sd && typeof sd === 'object') {
    for (const pp of ['extend', 'core']) {
      if (item && item[pp] && sd[pp]) {
        const f = snippetFor({ meta: { snippetDir: sd[pp] } }, Object.assign({}, item, { snippet: undefined }), item[pp], opts);
        if (f) return f;
      }
    }
    return null;
  }
  const dir = resolveLocal(sd);
  const key = String(qn || (item && item.questionNumber) || '').replace(/\s+/g, '');
  if (!dir || !key) return null;
  if (!_snipIdx[dir]) {
    try { _snipIdx[dir] = JSON.parse(fs.readFileSync(path.join(dir, 'snippets.json'), 'utf8')); } catch (_) { _snipIdx[dir] = {}; }
  }
  const hit = (opts && opts.full && _snipIdx[dir][key + '*']) || _snipIdx[dir][key];   // "*" = with its figure lead-in
  const f = hit && (fs.existsSync(hit) ? hit : resolveLocal(path.join(dir, path.basename(hit))));
  if (!f) buildWarn(`no question picture for Q${key} in ${dir}`);
  return f || null;
}

/* qLabel — how a test question is named on a slide. KS3/KS4 tests come as a Core and an
   Extend paper that share most questions under different numbers (2026-10-12): items carry
   "core": "4(e)" and/or "extend": "1(e)", and the label says which paper(s) it is on. */
function qLabel(item) {
  const c = item.core, e = item.extend;
  // the school calls it the Extend paper; on slides it is the CHALLENGE paper (terminology rule).
  // Plain words (Patryk 2026-10-15: "more explicit"), not CORE Q4(e) = CHALLENGE Q1(e).
  if (c && e) return `Core paper Question ${c}  ·  Challenge paper Question ${e}`;
  if (c) return `Core paper Question ${c} (not on the Challenge paper)`;
  if (e) return `Challenge paper Question ${e} (not on the Core paper)`;
  return 'Question ' + (item.questionNumber || '');
}

/* pagesOnly — review support pages show page numbers only (Patryk 2026-10-15: "P6.2 p.78" read as
   a code, not a page). "P6.2 p.78, P6.3 p.80" -> "p. 78, p. 80"; "pp.78-80" -> "pp. 78–80";
   repeats dropped. Text with no page number is left alone. */
function pagesOnly(v) {
  const t = String(v == null ? '' : v);
  if (!/\bpp?\.\s*\d/i.test(t)) return t;
  const seen = new Set();
  return t.split(/\s*[,;]\s*/).map((bit) => {
    const m = bit.match(/\b(pp?)\.\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
    if (!m) return bit.replace(/\b[BCP]\d+(\.\d+)+\b\s*/g, '').trim();
    return m[3] ? `pp. ${m[2]}–${m[3]}` : `p. ${m[2]}`;
  }).filter((x) => x && !seen.has(x) && seen.add(x)).join(', ');
}

function slideModelAnswerReview(pptx, L, item) {
  const obj = objectiveText(L);
  const qType = item.qType || 'short';
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  const header = 'MODEL ANSWER   ' + qLabel(item) + (item.marks ? `  ·  ${item.marks} mark${item.marks === 1 ? '' : 's'}` : '');
  let y = sectionHeader(s, header, STAGE.build, TOP, null, true);
  const profile = item.jitterProfile != null ? item.jitterProfile : 2;
  const bottom = BOT_Y - 0.08;

  // the model answer itself, in whatever box the layout gives it
  const drawAnswer = (x, ay, w, h) => {
    if (qType === 'graph') {
      const rd = item.graphData;
      const pngPath = rd && rd.rows ? callGraphGen(rd, true) : null;
      if (pngPath) addImageFit(s, pngPath, x, ay, w, h);
      else imagePlaceholder(s, x, ay, w, h, 'Model graph: add graphData to JSON');
      return;
    }
    // raw text in: handwritingBlock reads the {n} mark tags, then tidies symbols itself
    const raw = qType === 'calculation' ? arr(item.modelAnswer).map(String) : String(item.modelAnswer || '');
    const text = hasMarkTags(raw) ? raw : (Array.isArray(raw) ? raw.map(prettyText) : prettyText(raw));
    // as big as the box allows (24/26pt as before), shrinking only for a long answer (never below 16pt)
    let fit = fitHandwritingFs(raw, w, h, qType === 'calculation' ? 24 : 26, 16);
    // working steps: one line each, so shrink (to 16pt) before a step wraps
    if (Array.isArray(raw)) while (fit > 16 && handwritingLines(raw, w, fit) > raw.length) fit--;
    handwritingBlock(s, x, ay, w, h, text, { fontSize: fit, profile, ruled: true, mode: handwritingMode(L, item) });
  };
  // long schemes (6-markers): bands cut to their first sentence on the board so it still fits
  const panelOpts = (w, h) => {
    const full = markingPanelFs(item, w, h);
    return full >= 12 ? { fs: full } : { fs: markingPanelFs(item, w, h, { shortBands: true }), shortBands: true };
  };
  const pStyle = { fill: NAVY, color: 'FFFFFF', valign: 'top', fontSize: 12, line: { color: GOLD, width: 2 } };
  const panel = (x, py, w, h) => {
    const po = panelOpts(w, h);
    const hasBands = arr(item.levelDescriptors).length || arr(item.doesNotAward).length;
    if (po.fs >= 12 || !hasBands) { goldBox(s, x, py, w, h, buildMarkingPanelRuns(item, po), pStyle); return; }
    // still too long: mark points | bands + "no marks for", side by side, each sized to fit
    const ptsOnly = Object.assign({}, item, { levelDescriptors: [], doesNotAward: [] });
    const bandsOnly = Object.assign({}, item, { indicativeContent: [], ecfNote: '' });
    const len = (o) => JSON.stringify([o.indicativeContent, arr(o.levelDescriptors).map((l) => firstSentence(l.desc || '')), o.doesNotAward]).length;
    const share = Math.min(0.66, Math.max(0.5, len(ptsOnly) / (len(ptsOnly) + len(bandsOnly))));   // the longer half gets more width
    const cw = (w - GAP) * share, cw2 = w - GAP - cw;
    goldBox(s, x, py, cw, h, buildMarkingPanelRuns(item, { fs: markingPanelFs(ptsOnly, cw, h), only: 'points' }), pStyle);
    goldBox(s, x + cw + GAP, py, cw2, h, buildMarkingPanelRuns(item, { fs: markingPanelFs(bandsOnly, cw2, h, { shortBands: true }), only: 'bands', shortBands: true }), pStyle);
  };

  const snip = snippetFor(L, item, null, { full: true });
  const px = snip && imagePixelSize(snip);
  if (snip && px && px.w && px.h) {
    // Pick the layout that shows the paper's question BIGGER (never stretched):
    //   tall question → picture fills the left half, answer + mark scheme stacked on the right;
    //   short/wide question → picture across the top, answer left + mark scheme right below.
    const H = bottom - y;
    const topH = Math.min(H * 0.5, (CW * px.h) / px.w);
    const raw = qType === 'calculation' ? arr(item.modelAnswer).map(String) : String(item.modelAnswer || '');
    // picture on the left: as wide as possible (half the slide) while the answer (at 20pt)
    // and the mark scheme (at 12pt+) still fit the column beside it; long schemes narrow it
    const plan = [0.5, 0.44, 0.38].map((f) => {
      const rw = CW * (1 - f) - GAP;
      const need = qType === 'graph' ? (H - GAP) * 0.5 : Math.max((H - GAP) * 0.3, handwritingNeedH(raw, rw, 20));
      return { f, rw, ansH: Math.min(need, (H - GAP) * 0.6), ok: markingPanelFs(item, rw, H - GAP - need) >= 12 };
    });
    const pick = plan.find((p) => p.ok) || plan[plan.length - 1];
    const leftW = CW * pick.f;
    const sLeft = Math.min(leftW / px.w, H / px.h), sTop = Math.min(CW / px.w, topH / px.h);
    // across-the-top plan: picture height as drawn, then the answer gets only the width it
    // needs at 22pt (40–56%), the mark scheme the rest
    const picH = Math.min(topH, (CW * px.h) / px.w);
    const h2top = bottom - (y + picH + GAP);
    // calculation lines must not wrap (each working step stays on one line)
    const fitsAt = (f) => handwritingNeedH(raw, CW * f, 22) <= h2top &&
      (!Array.isArray(raw) || handwritingLines(raw, CW * f, 22) <= raw.length);
    const awFrac = qType === 'graph' ? 0.52 : ([0.4, 0.46, 0.52].find(fitsAt) || 0.56);
    const topFs = markingPanelFs(item, CW * (1 - awFrac) - GAP, h2top);
    const leftFs = markingPanelFs(item, pick.rw, H - GAP - pick.ansH);
    // a long scheme that would be squeezed under the picture goes beside it instead
    const useLeft = sLeft > sTop * 1.15 || (topFs < 14 && leftFs >= topFs);
    if (useLeft) {
      const b = addImageFit(s, snip, MX, y, leftW, H);
      s.addShape('rect', { x: b.x, y: b.y, w: b.w, h: b.h, fill: { color: 'FFFFFF', transparency: 100 }, line: GOLD2 });
      const rx = MX + leftW + GAP, rw = pick.rw;
      const ansH = pick.ansH;
      drawAnswer(rx, y, rw, ansH);
      panel(rx, y + ansH + GAP, rw, H - ansH - GAP);
    } else {
      const b = addImageFit(s, snip, MX, y, CW, topH);
      s.addShape('rect', { x: b.x, y: b.y, w: b.w, h: b.h, fill: { color: 'FFFFFF', transparency: 100 }, line: GOLD2 });
      const ty = y + b.h + GAP, h2 = bottom - ty;
      const aw = CW * awFrac;
      drawAnswer(MX, ty, aw, h2);
      panel(MX + aw + GAP, ty, CW - aw - GAP, h2);
    }
    bottomBar(s, obj);
    return;
  }

  // no picture: typed question across the top when given, then the original two-column layout
  if (item.question) {
    const qH = 0.75;
    const qFs = autoFontSize(prettyText(item.question), CW, qH, { min: 14, max: 20 });
    goldBox(s, MX, y, CW, qH, [
      { text: 'Q' + (item.questionNumber || '') + '  ', options: { bold: true, fontSize: qFs, color: NAVY } },
      { text: prettyText(item.question), options: { fontSize: qFs } },
    ], { valign: 'middle' });
    y += qH + GAP;
  }
  const leftW = CW * 0.48, rightX = MX + leftW + GAP, rightW = CW - leftW - GAP;
  const panelH = bottom - y;
  drawAnswer(MX, y, leftW, panelH);
  panel(rightX, y, rightW, panelH);
  bottomBar(s, obj);
}

/* ---- BUILD — markTheAnswers (peer-assessment) ----------------------------
   Redesigned 2026-10-12 (Patryk: the board scheme was bloated, the 6-marker ran off the slide,
   and the samples are already on the worksheet).
   TASK slide: the question across the top, the mark scheme filling the rest in big type
   (two columns: numbered points | bands + "no marks for"), no samples repeated.
   MARKS slide(s): one row per student, their handwritten answer on the left with the earned
   marks highlighted + numbered (tags {1}…{/1}, {x}…{/x} for a lost mark), and on the right
   only what they scored: big mark/level, the point numbers earned, what was missed.
   Up to 3 students a slide (4 → 2 + 2) so the handwriting stays readable. Samples without
   tags still work: the right box lists their ✓ hits / ✗ misses as before.
   Same mark-scheme fields as modelAnswerReview (indicativeContent / levelDescriptors / doesNotAward). */
const MTA_JITTER = [1, 3, 2, 4];                 // distinct handwriting per sample slot
const mtaLabel = (sm, i) => sm.label || ('Student ' + String.fromCharCode(65 + i));
function mtaQuestionBox(s, item, y) {
  const q = prettyText(item.question || '');
  const qH = Math.min(1.1, Math.max(0.6, Math.ceil(q.length / 110) * 0.36 + 0.2));
  const qFs = autoFontSize(q, CW, qH, { min: 14, max: 20 });
  goldBox(s, MX, y, CW, qH, [
    { text: 'Q  ', options: { bold: true, fontSize: qFs, color: NAVY } },
    { text: q, options: { fontSize: qFs } },
  ], { valign: 'middle' });
  return y + qH + GAP;
}
function slideMarkTheAnswers(pptx, L, item) {
  const obj = objectiveText(L);
  const samples = arr(item.samples).slice(0, 4);
  const header = 'BUILD · MARK THE ANSWERS · Q' + (item.questionNumber || '') + marksTag(item.marks);

  // --- task slide: question + mark scheme, full width -------------------------
  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, header, STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);
  y = mtaQuestionBox(s, item, y);
  txt(s, item.instruction || 'Mark each answer on your worksheet. Give it a level and a mark.', {
    x: MX, y, w: CW, h: 0.3, italic: true, fontSize: 14, color: '333333', valign: 'middle',
  });
  y += 0.36;
  const H = BOT_Y - 0.08 - y;
  const hasBands = arr(item.levelDescriptors).length || arr(item.doesNotAward).length;
  const panelOpts = { fill: NAVY, color: 'FFFFFF', valign: 'top', line: { color: GOLD, width: 2 }, margin: 10 };
  const pointsText = arr(item.indicativeContent).map((ic) => (ic && ic.text) || ic).join(' ');
  if (hasBands) {
    const colW = (CW - GAP) / 2;
    const bandsText = arr(item.levelDescriptors).map((l) => firstSentence(l.desc || '')).join(' ') + ' ' + arr(item.doesNotAward).join(' ');
    const n1 = arr(item.indicativeContent).length + 1, n2 = arr(item.levelDescriptors).length + arr(item.doesNotAward).length + 2;
    const fs = Math.min(autoFontSize(pointsText, colW - 0.2, H, { min: 12, max: 22, linesHint: undefined }),
      autoFontSize(bandsText, colW - 0.2, H, { min: 12, max: 22 }));
    const fsL = Math.min(fs, Math.floor((H * 72) / (n1 * 1.6)));
    const fsR = Math.min(fs, Math.floor((H * 72) / (n2 * 1.8)));
    const F = Math.max(12, Math.min(fsL, fsR));
    if (F < 14) buildWarn(`Mark the Answers Q${item.questionNumber || ''}: mark scheme is long, board text is ${F}pt`);
    goldBox(s, MX, y, colW, H, buildMarkingPanelRuns(item, { fs: F, only: 'points', pointsTitle: 'MARK POINTS' }), panelOpts);
    goldBox(s, MX + colW + GAP, y, colW, H, buildMarkingPanelRuns(item, { fs: F, only: 'bands', shortBands: true, exclTitle: 'NO MARKS FOR' }), panelOpts);
  } else {
    const n = arr(item.indicativeContent).length + 1;
    const F = Math.max(14, Math.min(26, autoFontSize(pointsText, CW - 0.2, H, { min: 14, max: 26 }), Math.floor((H * 72) / (n * 1.7))));
    goldBox(s, MX, y, CW, H, buildMarkingPanelRuns(item, { fs: F, pointsTitle: 'MARK POINTS' }), panelOpts);
  }
  bottomBar(s, obj);
  if (!samples.length) return;

  // --- marks slide(s): each student's answer, highlighted, + what they scored ---
  const groups = samples.length === 4 ? [samples.slice(0, 2), samples.slice(2)] : [samples];
  groups.forEach((grp, gi) => {
    s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'build');
    y = sectionHeader(s, 'BUILD · MARK THE ANSWERS: MARKS AWARDED' + (groups.length > 1 ? ` (${gi + 1} of ${groups.length})` : ''), STAGE.build, TOP);
    const vGap = GAP * 1.2, labelH = 0.3;
    const rowH = (BOT_Y - 0.08 - y - vGap * (grp.length - 1)) / grp.length;
    const lw = CW * 0.66, rx = MX + lw + GAP, rw = CW - lw - GAP;
    grp.forEach((sm, k) => {
      const i = gi * 2 + k;
      const ry = y + k * (rowH + vGap);
      txt(s, mtaLabel(sm, i), {
        x: MX, y: ry, w: lw, h: labelH, fill: { color: NAVY }, color: GOLD,
        bold: true, fontSize: 14, align: 'left', valign: 'middle', margin: 6,
      });
      const raw = String(sm.text || '');
      const tagged = hasMarkTags(raw);
      const hwFs = fitHandwritingFs(raw, lw, rowH - labelH, 24, 16);
      handwritingBlock(s, MX, ry + labelH, lw, rowH - labelH, tagged ? raw : prettyText(raw), {
        fontSize: hwFs, ruled: true, mode: handwritingMode(L, item),
        profile: sm.jitterProfile != null ? sm.jitterProfile : (MTA_JITTER[i] != null ? MTA_JITTER[i] : 2),
      });

      // right: only what this student scored
      const mk = sm.awardedMarks != null ? sm.awardedMarks + (item.marks ? '/' + item.marks : '') : '';
      const runs = [];
      const big = rowH > 2.2 ? 36 : 28;
      if (mk) runs.push({ text: mk + (sm.awardedLevel ? '  ' : ''), options: { bold: true, fontSize: big, color: NAVY, breakLine: !sm.awardedLevel } });
      if (sm.awardedLevel) runs.push({ text: sm.awardedLevel, options: { bold: true, fontSize: Math.round(big * 0.6), color: AMBER, breakLine: true, paraSpaceAfter: 4 } });
      const earned = tagged ? [...new Set((parseMarkWords(raw).marks || []).filter((m) => m != null && m !== 'x'))] : [];
      if (earned.length) {
        runs.push({ text: 'Marks for:  ', options: { fontSize: 15, color: '333333' } });
        earned.forEach((m) => runs.push({ text: ` ${m} `, options: { bold: true, fontSize: 18, color: NAVY, highlight: markHi(m) } }, { text: ' ', options: { fontSize: 15 } }));
        runs[runs.length - 1].options = Object.assign({}, runs[runs.length - 1].options, { breakLine: true, paraSpaceAfter: 6 });
      } else {
        arr(sm.hits).forEach((h) => runs.push({ text: '✓ ' + prettyText(h), options: { fontSize: 14, color: GREEN_OK, breakLine: true } }));
      }
      arr(sm.misses).forEach((m) => runs.push({ text: '✗ ' + prettyText(m), options: { fontSize: 13, color: 'B71C1C', breakLine: true } }));
      if (sm.comment) runs.push({ text: prettyText(sm.comment), options: { italic: true, fontSize: 12, color: '333333' } });
      goldBox(s, rx, ry, rw, rowH, runs, { valign: 'middle', align: 'center', fontSize: 14 });
    });
    bottomBar(s, obj);
  });
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
  goldBox(s, x1, y, colW, promptH, prettyText(worked.prompt || ''), { fontSize: wpFs, valign: 'middle' }); // prose: x^2 / H_2SO_4 typeset by txt (2026-10-22: parseEq lowered '2SO4' as one subscript)
  const ypFs = autoFontSize(yourTurn.prompt, colW, promptH, { min: 16, max: 24 });
  goldBox(s, x2, y, colW, promptH, prettyText(yourTurn.prompt || ''), { fontSize: ypFs, valign: 'middle' });
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

/* Formula triangle model. One quantity on top, 2 to 4 MULTIPLIED quantities
   along the bottom: { top:"E", bottom:["m","c","Δθ"] } for E = mcΔθ. Covering
   any one still gives the rearrangement. (2026-10-02, Bug 59 point 4: until
   then anything beyond 3 symbols simply lost its triangle.) The original
   { top, bottomLeft, bottomRight } shape still works, read as a 2-item bottom;
   bottomMiddle extends it by hand. Bug 59 rule kept: anything that is not a
   clean "one quantity = product of the others" (missing top, unknown keys,
   5+ on the bottom, blanks) → null → no triangle, and the equation gets the
   full row instead. Never draw A/B/C defaults. */
const TRI_LEGACY = ['bottomLeft', 'bottomMiddle', 'bottomRight'];
function triangleSymbols(symbols) {
  if (!symbols || typeof symbols !== 'object') return null;
  if (Object.keys(symbols).some((k) => k !== 'top' && k !== 'bottom' && !TRI_LEGACY.includes(k))) return null;
  const hasLegacy = TRI_LEGACY.some((k) => k in symbols);
  let bottom;
  if (Array.isArray(symbols.bottom) && !hasLegacy) bottom = symbols.bottom;
  else if (!('bottom' in symbols) && hasLegacy) bottom = TRI_LEGACY.filter((k) => k in symbols).map((k) => symbols[k]);
  else return null;                              // neither form, or an ambiguous mix of both
  const clean = (v) => (v == null ? '' : prettyText(String(v)).trim());
  const top = clean(symbols.top);
  bottom = bottom.map(clean);
  if (!top || bottom.length < 2 || bottom.length > 4 || bottom.some((b) => !b)) return null;
  return { top, bottom };
}
function triangleUsable(symbols) { return !!triangleSymbols(symbols); }
/* width ÷ height. Wider for more bottom cells so each label keeps room:
   1.15 (two, the approved mock), 1.45 (three), 1.75 (four). */
function triangleAspect(symbols) {
  const t = triangleSymbols(symbols);
  return 1.15 + 0.3 * ((t ? t.bottom.length : 2) - 2);
}

/* drawFormulaTriangle(x, y, w, h, symbols) — white vector triangle with a
   horizontal divider and n−1 vertical dividers along the bottom. Never a
   raster image.
   2026-10-02: every label box is sized to the triangle's real INTERIOR at the
   label's height. Before, the boxes spanned the bounding box, so the slanted
   sides clipped anything wider than one letter ("rate" showed as "ate").
   Font size steps down to fit the room (floor 9pt), fit:'shrink' as backstop. */
function drawFormulaTriangle(slide, x, y, w, h, symbols) {
  const t = triangleSymbols(symbols);
  if (!t) return;
  const n = t.bottom.length;
  const apexX = x + w / 2;
  const f = 0.42;                                // fraction down the slanted side where the divider sits
  const Ly = y + f * h;
  const widthAt = (yy) => w * Math.max(0, Math.min(1, (yy - y) / h));   // interior width at height yy
  const fitFs = (label, room, max) => Math.max(9, Math.min(max, Math.floor((room * 105) / Math.max(1, label.length))));
  const label = (text, bx, by, bw, bh, fs) => txt(slide, text, {
    x: bx, y: by, w: Math.max(0.1, bw), h: bh, color: NAVY, bold: true, fontSize: fs,
    align: 'center', valign: 'middle', margin: 0, fit: 'shrink',
  });

  slide.addShape('triangle', { x, y, w, h, fill: { color: 'FFFFFF' }, line: { color: NAVY, width: 2 } });
  slide.addShape('line', { x: x + w * (1 - f) / 2, y: Ly, w: w * f, h: 0, line: { color: NAVY, width: 1.5 } });

  // Top: sat low in the top section, just above the divider, where it is widest.
  const topH = Math.min((Ly - y) * 0.7, 16 * 1.3 / 72);
  const topY = Ly - 0.03 - topH;
  const topRoom = widthAt(topY + topH / 2) - 0.08;
  label(t.top, apexX - topRoom / 2, topY, topRoom, topH, fitFs(t.top, topRoom, 16));

  // Bottom: dividers give every cell equal usable width at the row's midpoint
  // (equal spacing along the base would starve the outer cells, which lose
  // area to the slanted sides). Each outer label is also kept clear of the
  // slant at the TOP of its text, where the interior is narrowest.
  const midY = (Ly + y + h) / 2;
  const innerW = widthAt(midY), innerX = apexX - innerW / 2, cellW = innerW / n;
  for (let i = 1; i < n; i++) {
    slide.addShape('line', { x: innerX + i * cellW, y: Ly, w: 0, h: (y + h) - Ly, line: { color: NAVY, width: 1.5 } });
  }
  const rowH = (y + h) - Ly - 0.04;
  const textH = Math.min(rowH, 14 * 1.3 / 72);
  const slantRoom = widthAt(midY - textH / 2);   // interior width at the top of the text line
  t.bottom.forEach((sym, i) => {
    const left = Math.max(innerX + i * cellW, apexX - slantRoom / 2) + 0.04;
    const right = Math.min(innerX + (i + 1) * cellW, apexX + slantRoom / 2) - 0.04;
    label(sym, left, Ly + 0.02, right - left, rowH, fitFs(sym, right - left, 14));
  });
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
  // Weighted row heights — approved mock 2026-07-10: gentler weighting than the old
  // [0.85,0.85,1.6,0.85,0.85], which starved the G/U rows; Solve gets a little extra.
  const ROW_WEIGHTS = [1, 1, 1.35, 1, 1.15];
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
    // left label column — badge scales with the row (approved mock: 55% capped 0.62")
    const badge = Math.min(0.62, rowH * 0.55);
    s.addShape('roundRect', { x: MX, y: ry + (rowH - badge) / 2, w: badge, h: badge, rectRadius: 0.07, fill: { color: GOLD }, line: { type: 'none' } });
    txt(s, r.letter, { x: MX, y: ry + (rowH - badge) / 2, w: badge, h: badge, color: NAVY, bold: true, fontSize: Math.round(badge * 42), align: 'center', valign: 'middle' });
    txt(s, r.prompt, { x: MX + badge + 0.15, y: ry, w: leftW - badge - 0.15, h: rowH, color: NAVY, bold: isLast, fontSize: 15, valign: 'middle' });
    // divider between rows (skip before first row)
    if (i > 0) s.addShape('line', { x: rightX, y: ry, w: rightW, h: 0, line: { color: GOLD, width: 1 } });
    if (i === 2) {
      // equation row. Triangle only for a genuine 3-symbol relationship (Bug 59);
      // otherwise the equation takes the full row at a larger size.
      const eqSegs = parseEq(item.equation || '');
      const hasTri = triangleUsable(item.equationSymbols);
      const triH = Math.min(1.25, rowH - 0.24);
      const triW = triH * triangleAspect(item.equationSymbols); // aspect-locked; wider for 3-4 bottom cells
      const triPad = 0.3;
      const eqW = hasTri ? rightW - triW - triPad - 0.45 : rightW - 0.5;
      const eqFs = hasTri ? 20 : 26;
      // Bug 33/53 phase 3: stacked fraction in the E row when it fits; diagonal fallback
      if (!renderEqShapes(s, eqSegs, { x: rightX + 0.25, y: ry + 0.06, w: eqW, h: rowH - 0.12 }, { fontSize: eqFs, color: GOLD, bold: true, align: 'left' })) {
        txt(s, toPptxRuns(eqSegs, { fontSize: eqFs, color: GOLD, bold: true }), { x: rightX + 0.25, y: ry, w: eqW, h: rowH, color: GOLD, valign: 'middle', margin: 0 });
      }
      if (hasTri) drawFormulaTriangle(s, rightX + rightW - triW - triPad, ry + (rowH - triH) / 2, triW, triH, item.equationSymbols);
    } else if (isLast) {
      // Solve row — gold banner echoing the reviewRow answer style, bold + larger.
      // Bug 59(5): rows run through parseEq so "\div"/"times"/"^2" typeset as ÷ × ².
      const fs = autoFontSize(r.content, rightW, rowH, { min: 16, max: 24 });
      txt(s, toPptxRuns(parseEq(r.content), { fontSize: Math.max(fs, 17), color: GOLD, bold: true }), { x: rightX + 0.15, y: ry, w: rightW - 0.3, h: rowH, valign: 'middle' });
    } else {
      const fs = autoFontSize(r.content, rightW, rowH, { min: 15, max: 22 });
      txt(s, toPptxRuns(parseEq(r.content), { fontSize: fs, color: GOLD }), { x: rightX + 0.15, y: ry, w: rightW - 0.3, h: rowH, valign: 'middle' });
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
    const cy = y + qi * (cardH + 0.08);
    const qText = prettyText(q.q || '') + marksTag(q.marks); // 2026-07-05: superscripts/symbols
    // Bug 60 (approved mock 2026-07-10): the answer lives ON the slide, in its own
    // navy/gold box under each question — Patryk adds the reveal animation himself
    // in PowerPoint (same convention as the MCQ answer box). No answer authored →
    // the question keeps the full card.
    const hasA = !!q.a;
    const qH = hasA ? cardH * 0.58 : cardH;
    const qFs = autoFontSize(qText, leftW, qH, { min: 12, max: 22 });
    goldBox(s, MX, cy, leftW, qH, [
      { text: `Q${qi + 1}  `, options: { bold: true, fontSize: qFs } },
      { text: qText, options: { fontSize: qFs } },
    ], { valign: 'middle' });
    if (hasA) {
      const aH = cardH * 0.38;
      txt(s, [
        { text: 'ANSWER   ', options: { bold: true, fontSize: 12, color: 'FFFFFF' } },
        ...toPptxRuns(parseEq(String(q.a)), { fontSize: 16, color: GOLD, bold: true }),
      ], {
        x: MX + 0.35, y: cy + qH + cardH * 0.04, w: leftW - 0.35, h: aH,
        fill: { color: NAVY }, line: GOLD2, valign: 'middle', margin: 8,
      });
    }
  });
  // Speaker notes keep a plain-text copy of the answers (harmless, sometimes handy).
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
  // Triangle only for a genuine 3-symbol relationship (Bug 59) — aspect-locked, never squashed.
  if (triangleUsable(item.equationSymbols)) {
    const triAvailH = availH - 0.35 - GAP - eqH - GAP;
    const triAspect = triangleAspect(item.equationSymbols);   // wider for 3-4 bottom cells
    const triH = Math.min(triAvailH, (rightW - 0.3) / triAspect);
    const triW = triH * triAspect;
    if (triH > 0.7) {
      const triY = eqY + eqH + GAP;
      drawFormulaTriangle(s, rightX + (rightW - triW) / 2, triY + (triAvailH - triH) / 2, triW, triH, item.equationSymbols);
    }
  }
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
    // 2026-10-12 (Patryk): no drawn axes. They had no labels and shrank the graph into a smaller
    // box; the graph image carries its own axes and labels, so it gets the whole frame.
    const ax = MX + 0.1, ay = y + 0.4, aw = fw - 0.2, ah = h - 0.5;
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
    const qFs = autoFontSize(`Q${i + 1}  ` + qBody, rw, qH, { min: 12, max: 20 });
    goldBox(s, rx, sy, rw, qH, [
      { text: `Q${i + 1}  `, options: { bold: true, fontSize: qFs, color: GOLD } },
      { text: qBody, options: { fontSize: qFs, color: 'FFFFFF' } },
    ], { fill: NAVY, line: { color: GOLD, width: 2 }, valign: 'middle' });
    goldBox(s, rx, sy + qH + innerGap, rw, aH, prettyText(q.a || ''), {
      fill: NAVY, color: GOLD, line: { color: GOLD, width: 2 },
      fontSize: autoFontSize(q.a || '', rw, aH, { min: 12, max: 20 }), valign: 'middle',
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
    addImageFit(s, pngPath, MX, y, gW, availH); // 70% left: graph, shape kept
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
  table(s, tRows, { x: MX, y, w: halfW, colW, rowH: Array(tRows.length).fill(rowH), fontFace: FONT, margin: 0.06, autoPage: false });
  if (pngPath) {
    addImageFit(s, pngPath, gX, y, halfW, availH); // right: compact graph, shape kept
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
/* ---- EXAM QUESTION + MARK SCHEME (Patryk 2026-10-03) ------------------------------
   After Apply, every Year 9-11 lesson shows ONE real exam question on the board (chosen by
   exam-pick.js at home), answered in books, then its real mark scheme. Text is VERBATIM.
   L.examQuestion = { examRef, board, marks, passRate, figure:{path,w,h}|null,
                      groups:[{ stem, parts:[{label,text,marks,ms,commonError,passRate}] }] } */
function examQuestionRuns(eq, fs) {
  const runs = [];
  eq.groups.forEach((g) => {
    if (g.stem) runs.push({ text: g.stem, options: { fontSize: fs, breakLine: true, paraSpaceAfter: 6 } });
    g.parts.forEach((p) => {
      if (p.label) runs.push({ text: `(${p.label})  `, options: { fontSize: fs, bold: true, color: NAVY } });
      runs.push({ text: p.text, options: { fontSize: fs } });
      runs.push({ text: `   [${p.marks} mark${p.marks === 1 ? '' : 's'}]`, options: { fontSize: Math.max(14, fs - 4), color: '777777', breakLine: true, paraSpaceAfter: 8 } });
    });
  });
  return runs;
}

function slideExamQuestion(pptx, L) {
  const eq = L.examQuestion;
  if (!eq || !arr(eq.groups).length) return;
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'apply');
  let y = sectionHeader(s, `EXAM QUESTION \u00B7 ${eq.board || 'AQA'} \u00B7 ${eq.marks} MARKS`, STAGE.apply, TOP);
  txt(s, 'Real exam question. Answer it in your book.', { x: MX, y, w: CW, h: 0.35, italic: true, fontSize: 14, color: '333333', valign: 'middle' });
  y += 0.42;
  const h = BOT_Y - 0.1 - y;
  const plain = eq.groups.map((g) => [g.stem, ...g.parts.map((p) => `(${p.label}) ${p.text} [${p.marks} marks]`)].filter(Boolean).join(' ')).join(' ');
  let tx = MX, tw = CW;
  if (eq.figure && eq.figure.path && fs.existsSync(eq.figure.path)) {
    // figure on the left, at most half the width, never stretched
    const maxW = CW * 0.48, maxH = h;
    const r = (eq.figure.w && eq.figure.h) ? eq.figure.w / eq.figure.h : 4 / 3;
    let iw = maxW, ih = iw / r;
    if (ih > maxH) { ih = maxH; iw = ih * r; }
    s.addImage({ path: eq.figure.path, x: MX, y: y + (maxH - ih) / 2, w: iw, h: ih });
    tx = MX + iw + 0.25; tw = CW - iw - 0.25;
  }
  const fsz = autoFontSize(plain, tw - 0.2, h, { min: 16, max: 26 });
  goldBox(s, tx, y, tw, h, examQuestionRuns(eq, fsz), { valign: 'top', margin: 10 });
  bottomBar(s, obj);
}

function slideExamMarkScheme(pptx, L) {
  const eq = L.examQuestion;
  if (!eq || !arr(eq.groups).length) return;
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'apply');
  let y = sectionHeader(s, 'EXAM QUESTION \u00B7 MARK SCHEME', STAGE.apply, TOP);
  txt(s, 'Mark your answer in purple pen. This is the real examiner mark scheme.', { x: MX, y, w: CW, h: 0.35, italic: true, fontSize: 14, color: '333333', valign: 'middle' });
  y += 0.42;
  const parts = eq.groups.flatMap((g) => g.parts);
  const insight = parts.map((p) => {
    const bits = [];
    if (p.passRate != null) bits.push(`${p.passRate}% of students got (${p.label || 'this'}) right.`);
    if (p.commonError) bits.push(p.commonError);
    return bits.join(' ');
  }).filter(Boolean).join('  ');
  const insH = insight ? 1.1 : 0;
  const h = BOT_Y - 0.1 - y - (insH ? insH + 0.12 : 0);
  // AQA writes marking points as one run-on line with a bare "1" after each point. Put each point on
  // its own line and show its mark as "(1)". The words themselves are untouched (verbatim rule).
  const UNIT = /^(kg|g|mg|m|cm|mm|km|s|ms|h|min|j|kj|mj|w|kw|mw|n|v|a|ma|hz|khz|k|pa|kpa|mol|dm|l|ml|%)\b/i;
  const points = (ms) => {
    const out = []; let cur = '';
    const toks = String(ms || '').split(/\s+/);
    toks.forEach((t, k) => {
      const next = toks[k + 1] || '';
      if (/^[1-3]$/.test(t) && cur && !UNIT.test(next)) { out.push(`${cur.trim()}  (${t})`); cur = ''; }
      else cur += ' ' + t;
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  };
  // one navy/gold box per part (each answer appears on its own click), height shared by text length
  const texts = parts.map((p) => points(p.ms));
  const weight = texts.map((t) => Math.max(60, t.join(' ').length + 40 * t.length));
  const avail = h - 0.1 * (parts.length - 1);
  const tot = weight.reduce((a, b) => a + b, 0);
  let yy = y;
  parts.forEach((p, i) => {
    const bh = avail * weight[i] / tot;
    const lines = texts[i];
    const plain = `(${p.label || i + 1})  ` + lines.join(' ');
    const fsz = autoFontSize(plain, CW - 0.25, bh, { min: 16, max: 24, linesHint: undefined });
    const runs = [{ text: `(${p.label || i + 1})  `, options: { fontSize: fsz, bold: true } }];
    lines.forEach((ln, k) => runs.push({ text: ln, options: { fontSize: fsz, breakLine: k < lines.length - 1 } }));
    goldBox(s, MX, yy, CW, bh, runs, { fill: NAVY, color: GOLD, valign: 'middle', margin: 10 });
    yy += bh + 0.1;
  });
  if (insight) {
    const iy = BOT_Y - 0.1 - insH;
    txt(s, [{ text: 'What the examiner saw:  ', options: { bold: true, color: NAVY } }, { text: insight }], {
      x: MX, y: iy, w: CW, h: insH, fontSize: autoFontSize(insight, CW - 0.3, insH, { min: 12, max: 16 }),
      color: '333333', fill: { color: 'FFF8E1' }, line: GOLD2, valign: 'middle', margin: 8, fit: 'shrink',
    });
  }
  bottomBar(s, obj);
}

// Patryk 2026-10-07: the exam question and its mark scheme come after the Apply answers (Review slides).
function slideExam(pptx, L) {
  slideExamQuestion(pptx, L);
  slideExamMarkScheme(pptx, L);
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

/* ---- REVIEW lessons: EBI corrections + Extension (Patryk 2026-10-10) ----------------------------
   After the test review answers, pupils correct 3 EBIs in purple pen using the follow-up tasks on
   the front of the school's test and the support pages, then pupils who have finished go to the
   Extension: harder real exam questions per subtopic with the support page.
     ebiTask:   { rows: [{ q: "Q1", task: "<front-of-test follow-up task, verbatim>", pages: "P6.3 p.80" }] }
     extension: [{ subtopic: "Specific latent heat", pages: "P6.5 p.84", questions: [{ q, a, marks, ref }] }]
   Both optional; nothing is drawn when absent. Answers reveal on click (navy/gold boxes). */
function slideEbiTask(pptx, L) {
  const t = L.ebiTask;
  const rows = arr(t && t.rows);
  if (!rows.length) return;
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'review');
  let y = sectionHeader(s, 'PURPLE PEN · CORRECT 3 EBIs', PURPLE_PEN, TOP);
  const steps = arr(t.steps).length ? arr(t.steps) : ['Pick 3 EBIs from the front of your test', 'Do that question’s follow-up task in purple pen',
    'Use the support page in the textbook', 'Finished all 3? Go to the Extension'];
  const sw = (CW - (steps.length - 1) * 0.1) / steps.length;
  steps.forEach((st, i) => {
    txt(s, [{ text: `${i + 1}  `, options: { bold: true, color: GOLD, fontSize: 16 } }, { text: st, options: { color: 'FFFFFF', fontSize: 12 } }],
      { x: MX + i * (sw + 0.1), y, w: sw, h: 0.62, fill: { color: PURPLE_PEN }, align: 'left', valign: 'middle', margin: 6, fit: 'shrink' });
  });
  y += 0.62 + GAP;
  // KS3/KS4 tests come as Core + Extend papers with different front-cover tasks: rows with
  // "paper" get one table per paper, side by side, sized to fill the slide (2026-10-12)
  const papers = [...new Set(rows.map((r) => r.paper).filter(Boolean))];
  if (papers.length > 1) {
    const colGap = 0.2, tw = (CW - colGap * (papers.length - 1)) / papers.length;
    const avail = BOT_Y - 0.08 - y - 0.42;
    papers.forEach((pp, pi) => {
      const pr = rows.filter((r) => r.paper === pp);
      const tx = MX + pi * (tw + colGap);
      txt(s, String(pp).toUpperCase().replace(/^EXTEND$/, 'CHALLENGE') + ' PAPER', { x: tx, y, w: tw, h: 0.38, fill: { color: NAVY }, color: GOLD, bold: true, fontSize: 15, align: 'center', valign: 'middle' });
      const cw = [tw * 0.13, tw * 0.64, tw * 0.23];
      let fs = 20;
      for (; fs > 10; fs--) {
        const lines = pr.reduce((n, r) => n + Math.max(Math.ceil(prettyText(r.task || '').length / Math.floor((cw[1] - 0.1) * 120 / fs)),
          Math.ceil(pagesOnly(r.pages).length / Math.floor((cw[2] - 0.1) * 120 / fs))), 0);
        if ((lines * fs * 1.3) / 72 + pr.length * 0.12 <= avail * 0.92) break;
      }
      const trows = pr.map((r, i) => {
        const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
        return [{ text: String(r.q || ''), options: { fill: { color: fill }, bold: true, fontSize: fs, align: 'center', valign: 'middle' } },
          { text: prettyText(r.task || ''), options: { fill: { color: fill }, fontSize: fs, valign: 'middle' } },
          { text: pagesOnly(r.pages), options: { fill: { color: fill }, fontSize: fs, align: 'center', valign: 'middle' } }];
      });
      table(s, trows, { x: tx, y: y + 0.42, w: tw, colW: cw, rowH: avail / pr.length, fontFace: FONT, border: { type: 'solid', pt: 0.5, color: 'BBBBBB' }, margin: 0.06, autoPage: false });
    });
    bottomBar(s, objectiveText(L));
    return;
  }
  const total = rows.reduce((n, r) => n + String(r.task || '').length, 0);
  const fs = total > 1400 ? 11 : total > 1000 ? 13 : total > 600 ? 15 : 17;
  const head = (h) => ({ text: h, options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: fs } });
  const trows = [[head('Question'), head('Follow-up task (front of your test)'), head('Support pages')]].concat(rows.map((r, i) => {
    const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
    return [{ text: String(r.q || ''), options: { fill: { color: fill }, bold: true, fontSize: fs, align: 'center' } },
      { text: prettyText(r.task || ''), options: { fill: { color: fill }, fontSize: fs } },
      { text: pagesOnly(r.pages), options: { fill: { color: fill }, fontSize: fs, align: 'center' } }];
  }));
  table(s, trows, { x: MX, y, w: CW, colW: [CW * 0.12, CW * 0.68, CW * 0.2], fontFace: FONT, border: { type: 'solid', pt: 0.5, color: 'BBBBBB' }, margin: 0.05, autoPage: false });
  bottomBar(s, objectiveText(L));
}
// extension questions numbered E1, E2 ... across the columns (the answers slide and sheets use the same numbers)
function extensionCols(L) {
  let n = 0;
  return arr(L.extension).slice(0, 4).map((c) => ({ subtopic: c.subtopic || '', pages: pagesOnly(c.pages), qs: arr(c.questions).map(normQ).map((q) => Object.assign({ label: 'E' + (++n), sub: c.subtopic || '' }, q)) }))
    .filter((c) => c.qs.length);
}
// The text size the cards of these columns would get on one slide.
function extensionFontFor(cols) {
  const colW = (CW - (cols.length - 1) * 0.15) / cols.length;
  const avail = BOT_Y - 0.08 - (TOP + 0.38 + GAP) - 0.62 - 0.06;
  const bodyOf = (q) => `${q.label}  ` + prettyText(q.q) + marksTag(q.marks);
  return Math.min(...cols.flatMap((c) => {
    const lens = c.qs.map((q) => Math.max(170, bodyOf(q).length));
    const sum = lens.reduce((a, b) => a + b, 0), gaps = (c.qs.length - 1) * 0.08;
    return c.qs.map((q, qi) => autoFontSize(bodyOf(q), colW, (avail - gaps) * lens[qi] / sum, { min: 9, max: 18 }));
  }));
}
// One slide, a column per subtopic (Patryk 2026-10-10). Long real exam questions would come out
// too small to read from the back on one slide, so then the columns go two to a slide.
function slideExtension(pptx, L) {
  const all = extensionCols(L);
  if (!all.length) return;
  const groups = all.length > 2 && extensionFontFor(all) < 12 ? [all.slice(0, 2), all.slice(2, 4)] : [all];
  groups.forEach((g, gi) => slideExtensionPart(pptx, L, g, groups.length > 1 ? ` (${gi + 1} of ${groups.length})` : ''));
}
function slideExtensionPart(pptx, L, cols, partLabel) {
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'review');
  let y = sectionHeader(s, 'EXTENSION · FINISHED YOUR 3 EBIs? PICK YOUR SUBTOPIC' + partLabel + ' (also in your booklet)', STAGE.review, TOP);
  const bottom = BOT_Y - 0.08;
  const colW = (CW - (cols.length - 1) * 0.15) / cols.length;
  const headH = 0.62;
  // each card is as tall as its question needs (a long calculation gets more room than "What is
  // meant by ...?"), and every card uses the same text size, the largest that fits them all
  const avail = bottom - y - headH - 0.06;
  const bodyOf = (q) => `${q.label}  ` + prettyText(q.q) + marksTag(q.marks);
  const layout = cols.map((c) => {
    const lens = c.qs.map((q) => Math.max(170, bodyOf(q).length));
    const sum = lens.reduce((a, b) => a + b, 0), gaps = (c.qs.length - 1) * 0.08;
    return lens.map((l) => (avail - gaps) * l / sum);
  });
  const qFs = Math.min(...cols.flatMap((c, ci) => c.qs.map((q, qi) => autoFontSize(bodyOf(q), colW, layout[ci][qi], { min: 9, max: 18 }))));
  cols.forEach((c, ci) => {
    const cx = MX + ci * (colW + 0.15);
    txt(s, [{ text: c.subtopic, options: { bold: true, color: GOLD, fontSize: 13, breakLine: true } },
      { text: c.pages ? 'Support: ' + c.pages : '', options: { color: 'FFFFFF', fontSize: 10.5 } }],
      { x: cx, y, w: colW, h: headH, fill: { color: NAVY }, align: 'center', valign: 'middle', margin: 4, fit: 'shrink' });
    let cy = y + headH + 0.06;
    c.qs.forEach((q, qi) => {
      goldBox(s, cx, cy, colW, layout[ci][qi], [
        { text: `${q.label}  `, options: { bold: true, fontSize: qFs, color: AMBER } },
        { text: prettyText(q.q) + marksTag(q.marks), options: { fontSize: qFs } },
      ], { valign: 'top' });
      cy += layout[ci][qi] + 0.08;
    });
  });
  bottomBar(s, objectiveText(L));
}
function slideExtensionAnswers(pptx, L) {
  const qs = extensionCols(L).flatMap((c) => c.qs);
  for (let i = 0; i < qs.length; i += 5) {
    const part = qs.slice(i, i + 5);
    const s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'review');
    let y = sectionHeader(s, 'EXTENSION · ANSWERS' + (qs.length > 5 ? ` (${i / 5 + 1} of ${Math.ceil(qs.length / 5)})` : ''), STAGE.review, TOP);
    if (!isReviewLesson(L)) y = purplePenBar(s, y);   // whole-paper review: no purple-pen bar (Patryk 2026-10-12)
    const bottom = BOT_Y - 0.08;
    const rowH = (bottom - y - (part.length - 1) * 0.06) / part.length;
    // the question itself is on the Extension slide and in the booklet: here just its number + subtopic
    part.forEach((q) => { reviewRow(s, y, rowH, null, `${q.label}  ${q.sub}`, q.a || ''); y += rowH + 0.06; });
    bottomBar(s, objectiveText(L));
  }
}
function buildReviewExtras(pptx, L) {
  slideEbiTask(pptx, L);
  slideExtension(pptx, L);
  slideExtensionAnswers(pptx, L);
}
/* answerList build item (review lessons): short test parts answered together, Q | answer rows with the
   answer revealed on click; up to 6 rows a slide.  { type: "answerList", heading, rows: [{ q, a }] } */
const isReviewLesson = (L) => ((L.meta && L.meta.lessonType) || L.lessonType) === 'review';
function slideAnswerList(pptx, L, item) {
  const rows = arr(item.rows).map(normQ);
  // MCQ rows state the letter: { q, correct: "B", a: "the option text" } → "B   the option text"
  const answerOf = (q) => (q.correct ? `${q.correct}${q.a ? '   ' + q.a : ''}` : (q.a || ''));
  // rows with a picture of the paper's question: 3 a slide, picture left, answer right
  const snips = rows.map((q) => (q.qn || q.snippet || q.core || q.extend ? snippetFor(L, q, q.qn) : null));
  const cap = snips.some(Boolean) ? 3 : 6;
  const per = Math.ceil(rows.length / Math.ceil(rows.length / cap));   // balanced: 4 rows → 2 + 2, not 3 + 1
  for (let i = 0; i < rows.length; i += per) {
    const part = rows.slice(i, i + per);
    const s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'build');
    let y = sectionHeader(s, item.heading || 'QUICK ANSWERS', STAGE.build, TOP, null, isReviewLesson(L));
    if (!isReviewLesson(L)) y = purplePenBar(s, y);   // whole-paper review: no purple-pen bar (Patryk 2026-10-12)
    const bottom = BOT_Y - 0.08;
    const rowH = (bottom - y - (part.length - 1) * 0.06) / part.length;
    part.forEach((q, k) => {
      const snip = snips[i + k];
      if (snip) {
        const lw = CW * 0.62;
        s.addShape('rect', { x: MX, y, w: lw, h: rowH, fill: { color: 'FFFFFF' }, line: GOLD2 });
        const tagH = (q.core || q.extend) ? 0.3 : 0;
        if (tagH) txt(s, qLabel(q), { x: MX, y, w: lw, h: tagH, fill: { color: NAVY }, color: GOLD, bold: true, fontSize: 12, align: 'left', valign: 'middle', margin: 6 });
        addImageFit(s, snip, MX + 0.04, y + tagH + 0.04, lw - 0.08, rowH - tagH - 0.08);
        const a = prettyText(answerOf(q));
        const big = !!q.correct;
        txt(s, a, {
          x: MX + lw + 0.08, y, w: CW - lw - 0.08, h: rowH, fill: { color: NAVY }, line: GOLD2, color: GOLD,
          bold: big, fontSize: autoFontSize(a, CW - lw - 0.08, rowH, { min: 14, max: big ? 40 : 26 }),
          align: big ? 'center' : 'left', valign: 'middle', margin: 8, fit: 'shrink',
        });
      } else reviewRow(s, y, rowH, null, (q.core || q.extend ? qLabel(q) + ' · ' : '') + (q.q || ''), answerOf(q));
      y += rowH + 0.06;
    });
    bottomBar(s, objectiveText(L));
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

/* image_dump — image-bank grid appended last. Patryk ruling 2026-07-09: he ALWAYS
   wants this slide when the lesson has any images (it was missing from lessons
   whose JSON had no explicit image_dump field). So the slide now self-assembles:
   generated graphs + every embedded image used on slides + the authored dump list,
   deduplicated by path. Generated assets (graphs) also stay on disk in the output
   folder. */
function slideImageDump(pptx, L) {
  const rd = (L.worksheetExtras || {}).referenceData;
  const autoImages = [];
  if (rd && rd.rows) {
    const pngPath = callGraphGen(rd, false);
    if (pngPath) autoImages.push({ path: pngPath, label: 'Results graph' });
  }
  // Every image actually embedded on a slide, labelled by where it was used.
  const embedded = [];
  const grab = (it, label) => {
    if (it && it.embeddedImagePath) embedded.push({ path: it.embeddedImagePath, label });
  };
  grab(L.engage, 'Engage');
  arr(L.learn).forEach((it, i) => {
    grab(it, `Learn ${String(it.variant || '').toUpperCase() || i + 1}`);
    arr(it.events).forEach((ev, j) => grab(ev, `Timeline event ${j + 1}`));
  });
  arr(L.build).forEach((b) => grab(b, (b.type || b.variant || 'Build') + ''));
  const userImages = Array.isArray((L.image_dump || {}).images) ? L.image_dump.images : [];
  const seen = new Set();
  const images = [...autoImages, ...embedded, ...userImages].filter((img) => {
    const key = img.path || img.label || '';
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!images.length) return;

  const s = pptx.addSlide();
  s.background = { color: BG };

  // Navy header bar with gold title — house style. Patryk KEEPS this slide (2026-07-09
  // ruling) — it is the lesson's image bank, not a delete-me artifact.
  const headerH = 0.5;
  txt(s, 'IMAGE BANK · sources and assets used in this lesson', {
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
        addImageFit(s, img.path, x, y, iw, imgH);
      } else {
        imagePlaceholder(s, x, y, iw, imgH, img.label || 'no path');
      }
    } catch (e) {
      buildWarn(`image bank: "${img.label || img.path}" failed to load (${e.message || e}) — grey placeholder shipped`);
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

/* CONTENT CHECK (2026-07-09, Patryk ruling; merged 2026-07-11 — see backlog.md):
   loud per-lesson validation of the authoring rules that keep slipping on the
   claude.ai side (audit found: 0-1 MCQs, Apply 2/1/1, no review sections, Do Now
   5, missing Drive meta). Prints ✓/✗ lines. NEVER blocks the build — warn loudly,
   never block. Mirrored in SKILL.md so the authoring side self-checks before
   handing a JSON over. Note (2026-07-11): this file briefly had two shadowed
   declarations of this function — a dead one that listed slide names for the
   missing-image-description warning, and this surviving one, which had the
   broader/more-correct image scan but only reported a count. Merged: keeps the
   broader scan, restores the slide-name listing. */
/* ---- Lesson quality A checks (2026-10-19) — warnings only, never block -------------------
   mcqCheck: each wrong option must name the mistake it catches (item.why / item.wrong {B: ...}),
     and the usual give-aways are flagged. Rules copied from mcq-written.js check(), which is not
     packed for claude.ai. Claude rewrites weak options while writing; this reports what's left.
   learnChecks: Learn slides over 45 words (research: about 40), two Learn slides that split one
     idea, more than 3 key words ({k}) on a slide or the same key word twice. */
function mcqCheck(item) {
  const bad = [];
  const o = mcqOptions(item.options), ans = String(item.answer || '').trim().toUpperCase().slice(0, 1);
  const opts = ['A', 'B', 'C', 'D'].map((k) => stripKeys(String(o[k] || '')).trim());
  if (opts.some((x) => !x)) bad.push('an option is missing');
  if (new Set(opts.map((x) => x.toLowerCase())).size !== opts.length) bad.push('two options are the same');
  if (opts.some((x) => /\b(all|none|both|neither) of (the|these) (above|answers|options)\b/i.test(x))) bad.push('"all/none of the above"');
  if (!/^[A-D]$/.test(ans)) bad.push('answer is not one letter A-D');
  const num = (x) => { const m = /^[−-]?\d[\d,]*(\.\d+)?/.exec(x.replace(/\s/g, '')); return m ? parseFloat(m[0].replace(/[,−]/g, (c) => (c === '−' ? '-' : ''))) : null; };
  const nums = opts.map(num);
  if (nums.every((n) => n != null)) {
    if (!nums.every((n, i) => !i || n >= nums[i - 1])) bad.push('number options not smallest to largest');
  } else if (/^[A-D]$/.test(ans)) {
    const len = opts.map((x) => x.length), r = len['ABCD'.indexOf(ans)];
    const others = len.filter((l, i) => i !== 'ABCD'.indexOf(ans));
    if (r > 1.3 * Math.max(...others) && r - Math.max(...others) > 6) bad.push('the right answer is clearly the longest');
  }
  const why = item.why || item.wrong || {};
  const missing = ['A', 'B', 'C', 'D'].filter((k) => k !== ans && !String(why[k] || '').trim());
  if (missing.length) bad.push(`no "why" for wrong option${missing.length > 1 ? 's' : ''} ${missing.join(', ')} (name the mistake it catches)`);
  return bad;
}
function learnWords(it) {
  const parts = [];
  arr(it.boxes).forEach((b) => parts.push(b.header || '', ...arr(b.items)));
  ['body', 'content'].forEach((k) => it[k] && parts.push(String(it[k])));
  return stripMarkTags(stripKeys(parts.join(' '))).split(/\s+/).filter(Boolean).length;
}
function learnChecks(L, lines) {
  const learn = arr(L.learn);
  learn.forEach((it, i) => {
    const n = learnWords(it);
    if (n > 45) lines.push(`  ✗ Learn ${i + 1} "${it.heading || ''}" has ${n} words of text (aim for about 40: the slide shows, you explain)`);
    const keys = (JSON.stringify(it).match(/\{k\}([\s\S]*?)\{\/k\}/g) || []).map((k) => k.replace(/\{\/?k\}/g, '').toLowerCase());
    if (keys.length > 3) lines.push(`  ✗ Learn ${i + 1} highlights ${keys.length} key words (soft cap 3)`);
    if (new Set(keys).size < keys.length) lines.push(`  ✗ Learn ${i + 1} highlights the same key word twice (first appearance only)`);
    const prev = learn[i - 1];
    if (prev) {
      const h0 = String(prev.heading || '').toLowerCase().split(/\s+/).slice(0, 2).join(' ');
      const h1 = String(it.heading || '').toLowerCase();
      if ((h0 && h0.split(' ').length === 2 && h1.startsWith(h0)) || /\((2|ii)\)|continued|part 2|2\/2/.test(h1))
        lines.push(`  ✗ Learn ${i} and ${i + 1} look like one idea split over two slides ("${prev.heading}" / "${it.heading}")`);
    }
  });
}

function contentCheck(L) {
  const meta = L.meta || {};
  const type = (meta.lessonType || meta.type || 'standard').toLowerCase();
  const name = meta.topic || meta.title || 'unknown';
  const isTeaching = type === 'standard' || type === 'practical' || type === 'annotation';
  const lines = [];
  const blockers = [];   // 2026-07-12: BROKEN output — refuse to build (overridable)
  const check = (ok, good, bad) => lines.push(ok ? `  ✓ ${good}` : `  ✗ ${bad}`);
  // A blocking check: the lesson would be unusable or unfindable, not merely thin.
  const must = (ok, good, bad) => { check(ok, good, bad); if (!ok) blockers.push(bad); };

  const dn = arr((L.doNow || {}).questions).length;
  // test and test-review lessons use doNow.task steps by design (2026-10-20: false warning on 12C Waves 1 review)
  if (!dn && arr((L.doNow || {}).task).length) lines.push(`  ✓ Do Now is ${arr(L.doNow.task).length} steps (doNow.task)`);
  else check(dn === 6, `Do Now ${dn}/6`, `Do Now has ${dn} question(s) — rule is exactly 6`);

  // review Extension (2026-10-10): every column names its support page, every question has its answer
  arr(L.extension).forEach((c, i) => {
    const qs = arr(c && c.questions).map(normQ);
    check(!!(c && c.pages), `Extension "${(c && c.subtopic) || i + 1}" support page`, `Extension column "${(c && c.subtopic) || i + 1}" has no support page (pages)`);
    check(qs.length && qs.every((q) => String(q.a || '').trim()), `Extension "${(c && c.subtopic) || i + 1}" answers`, `Extension column "${(c && c.subtopic) || i + 1}" has a question with no answer (it drops off the answers slide)`);
  });
  const nPrac = arr(L.build).filter((b) => (b.type || b.variant) === 'practical').length;
  if (nPrac > 2) lines.push(`  ✗ ${nPrac} practicals — a lesson has at most 2; only the first 2 are drawn on the worksheet`);
  if (arr(L.extension).length > 4) lines.push('  ✗ Extension has more than 4 subtopic columns — only the first 4 are drawn');

  if (isTeaching) {
    const mcq = arr(L.build).filter((b) => ['mcq', 'mcq_image'].includes(b.type || b.variant)).length;
    check(mcq === 6, 'MCQ count 6/6', `MCQ count ${mcq} — rule is exactly 6 (one block after Learn; experiment MCQs tagged about:"practical" go after the method slide)`);
    // MCQ CHECK (Lesson quality A): every wrong option names its mistake; no give-aways
    const mcqBad = [];
    arr(L.build).filter((b) => ['mcq', 'mcq_image'].includes(b.type || b.variant)).forEach((b, i) => {
      const bad = mcqCheck(b);
      if (bad.length) mcqBad.push(`  ✗ MCQ CHECK · question ${i + 1}: ${bad.join('; ')}`);
    });
    if (mcq) { if (mcqBad.length) lines.push(...mcqBad); else lines.push('  ✓ MCQ CHECK · every wrong option names its mistake'); }
    learnChecks(L, lines);
    TIERS.forEach((t) => {
      const a = arr((L.apply || {})[t]).length;
      check(a >= 3, `Apply ${t} ${a}/3+`, `Apply ${t} has ${a} question(s) — minimum 3 per tier`);
    });
    // Review policy (2026-07-12): review is a verbatim copy of Apply, and the
    // builder does the copying itself (buildReviewSlides falls back to Apply Q&A).
    // The authoring side should OMIT review entirely; an explicit review is still
    // honoured (must mirror every Apply question), but it is wasted authoring.
    const reviewAuthored = TIERS.some((t) => arr((L.review || {})[t]).length);
    if (reviewAuthored) {
      TIERS.forEach((t) => {
        const a = arr((L.apply || {})[t]).length;
        const r = arr((L.review || {})[t]).length;
        check(r === a && a > 0, `Review ${t} mirrors Apply (${r}/${a})`,
          `Review ${t} has ${r} answer(s) for ${a} Apply question(s) — review must mirror EVERY Apply question (or omit review and let the builder copy)`);
      });
    } else {
      TIERS.forEach((t) => {
        const missingA = arr((L.apply || {})[t]).map(normQ).filter((q) => !q.a).length;
        check(missingA === 0, `Review ${t} auto-copied from Apply`,
          `Apply ${t} has ${missingA} question(s) with NO answer — those drop off the auto-copied review slides`);
      });
    }
  }

  // Image discipline: every placeholder slot needs a Google-searchable description,
  // and a lesson with no images at all usually means source extraction was skipped.
  const imgItems = [
    L.engage && { it: L.engage, label: 'Engage' },
    ...arr(L.learn).map((it, i) => ({ it, label: `Learn ${i + 1} (${it.variant})` })),
  ].filter(Boolean).filter((x) => x.it.imagePlaceholder !== false);
  const noDesc = imgItems.filter((x) => !x.it.embeddedImagePath && !x.it.imageDescription).map((x) => x.label);
  check(noDesc.length === 0, 'image slots all described/embedded',
    `image slots with NO imageDescription (generic placeholder ships): ${noDesc.join(', ')}`);
  const anyImg = [L.engage, ...arr(L.learn), ...arr(L.build)].some((i) => i && i.embeddedImagePath)
    || arr((L.image_dump || {}).images).length > 0;
  check(anyImg, 'images embedded / image bank present',
    'NO images anywhere (no embeddedImagePath, empty image_dump) — if a source deck exists, extraction was skipped');

  // NOT blocking: missing Drive meta only stops the HOME auto-upload. The lesson
  // still builds and is fully teachable, and at school (claude.ai) there is no
  // uploader at all — so refusing to build here would deny a usable lesson over a
  // field that does not matter in the room. The uploader errors loudly by itself.
  const missMeta = ['year', 'subject', 'macrotopic', 'lessonNumber', 'title'].filter((k) => !meta[k]);
  check(missMeta.length === 0, 'Drive meta complete',
    `Drive meta missing: ${missMeta.join(', ')} — builds fine, but will NOT auto-upload or reach the lesson log`);

  // BLOCKING: a teaching lesson with no Apply questions has nothing for pupils to
  // do — the worksheet prints empty tier headings. That is a broken deliverable
  // rather than a thin one, and it cannot happen in a real lesson, so refusing is
  // safe. Everything else stays a warning: a thin lesson at 08:55 still beats no
  // lesson. --force overrides even this, in case the checker itself is wrong.
  if (isTeaching) {
    const applyTotal = TIERS.reduce((n, t) => n + arr((L.apply || {})[t]).length, 0);
    must(applyTotal > 0, 'Apply section present',
      'Apply has NO questions in any tier — the worksheet would print empty tier headings');
  }

  const wx = L.worksheetExtras || {};
  if (wx.cloze && !isTeaching)
    lines.push('  ✗ cloze only renders on standard/practical worksheets — it will be dropped on this lesson type');

  console.log(`── CONTENT CHECK · ${name}`);
  lines.forEach((l) => console.log(l));

  // Plain-English one-liner so a thin lesson is visible without reading the list.
  const thin = lines.filter((l) => l.startsWith('  ✗')).length - blockers.length;
  if (thin > 0) console.log(`  ⚠ Built, but ${thin} authoring rule(s) fell short — see the ✗ lines above.`);

  return blockers;
}

/* Blocking policy (2026-07-12, after a second-opinion consult):
     - HARD FAIL on faults that make the output broken or unfindable (no Drive
       meta, no Apply questions). Refusing is right: the lesson would be lost.
     - WARN on thin pedagogy (5 Do Nows, 2 MCQs, a light tier). A thin lesson at
       08:55 still beats no lesson, so these never block.
     - ALWAYS overridable with --force (or FORCE_BUILD=1) for the case that
       matters most: a false positive in a checker, minutes before a lesson.
       Every override is announced loudly so it can never become the silent norm. */
const FORCE_BUILD = process.argv.includes('--force') || process.env.FORCE_BUILD === '1';
function enforceBlockers(blockers, label) {
  if (!blockers.length) return;
  if (FORCE_BUILD) {
    console.error(`  ⚠ FORCED BUILD — ${blockers.length} blocking fault(s) ignored on "${label}":`);
    blockers.forEach((b) => console.error(`      • ${b}`));
    return;
  }
  const msg = [
    `${blockers.length} blocking fault(s) — refusing to build "${label}":`,
    ...blockers.map((b) => '      • ' + b),
    '    Fix the lesson JSON, or re-run with --force to build it anyway.',
  ].join('\n    ');
  throw new Error(msg);
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
/* orderBuildItems — MCQ block placement (Patryk 2026-10-03: "having it scattered across the
   lesson makes it disjointed"). Whatever order the JSON lists them in:
   - learning MCQs form ONE block straight after Learn, before the rest of Build;
   - MCQs tagged about:"practical" sit straight after the practical METHOD slide, before the
     data/results slides (or join the learning block when the lesson has no practical slide).
   Every other Build item keeps its authored order. */
function orderBuildItems(items) {
  const kind = (b) => b.type || b.variant || 'mcq';
  const isMcq = (b) => kind(b) === 'mcq' || kind(b) === 'mcq_image';
  const isPrac = (b) => isMcq(b) && /practical|experiment/i.test(String(b.about || ''));
  const list = arr(items);
  const learnMcqs = list.filter((b) => isMcq(b) && !isPrac(b));
  const pracMcqs = list.filter(isPrac);
  const rest = list.filter((b) => !isMcq(b));
  const p = rest.findIndex((b) => kind(b) === 'practical');
  if (p < 0) return [...learnMcqs, ...pracMcqs, ...rest];
  // The practical renders its own method -> answers -> model-data slides; its experiment MCQs ride
  // along on the practical item and are drawn inside that group, between the answers and the data.
  const prac = Object.assign({}, rest[p], { _mcqs: pracMcqs });
  return [...learnMcqs, ...rest.slice(0, p), prac, ...rest.slice(p + 1)];
}

function renderBuildSlides(pptx, L, buildItems) {
  orderBuildItems(buildItems).forEach((b) => {
    const bt = (b.type || b.variant || 'mcq');
    if (bt === 'mcq') slideMcq(pptx, L, b);
    else if (bt === 'mcq_image') slideMcqImage(pptx, L, b);
    else if (bt === 'sort') slideSort(pptx, L, b);
    else if (bt === 'trueFalse') slideTrueFalse(pptx, L, b);
    else if (bt === 'practical') slidePractical(pptx, L, b, () => arr(b._mcqs).forEach((m) => {
      if ((m.type || m.variant) === 'mcq_image') slideMcqImage(pptx, L, m); else slideMcq(pptx, L, m);
    }));
    else if (bt === 'misconception') slideMisconception(pptx, L, b);
    else if (bt === 'bigFact') slideBigFact(pptx, L, b);
    else if (bt === 'reformatFlowchart') slideReformatFlowchart(pptx, L, b);
    else if (bt === 'annotatedDiagram') slideAnnotatedDiagram(pptx, L, b);
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
    else if (bt === 'answerList') slideAnswerList(pptx, L, b);                 // review: short parts, Q | answer
    // 'visualiser' handled by the caller
  });
}

/* ---- PPTX assembly ------------------------------------------------------------ */
async function buildPptx(L, outPath) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';                                  // 13.33 × 7.5
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };

  const type = (L.meta.lessonType || L.meta.type || 'standard').toLowerCase();
  // 2026-07-09: loud authoring-rule report (replaces the lone MCQ warn).
  // 2026-07-12: it now also returns the BLOCKING faults — a lesson that would be
  // lost (no Drive meta) or empty (no Apply questions) refuses to build unless
  // --force is passed. Thin-but-usable lessons still build with a warning.
  enforceBlockers(contentCheck(L), L.meta.topic || L.meta.title || 'lesson');
  checkSixMarkRule(L);
  // Bug 57: the renderer reads flat apply.developing/reaching/mastering and
  // review.questions — a nested `.tiers.X.qs` shape is silently dropped. Warn
  // loudly rather than coerce, so the authoring gets fixed (no real lesson uses it).
  ['apply', 'review'].forEach((k) => {
    if (L[k] && L[k].tiers) console.error(`[build] "${k}.tiers" is not read — use flat ${k}.developing/reaching/mastering (this content is being dropped)`);
  });
  const buildItems = arr(L.build);
  const visItem = buildItems.find((b) => (b.type || b.variant) === 'visualiser');

  slideTitleDoNow(pptx, L);                                     // questions embedded — always
  slideDoNowAnswers(pptx, L);
  // Lesson quality A: O7 objectives + key words. Review/revision/test lessons used an authored
  // "Engage = objectives" slide before this existed: keep that one and don't add a second.
  if (['standard', 'practical', 'annotation'].includes(type) || !L.engage) slideObjectives(pptx, L);

  if (type === 'standard' || type === 'practical' || type === 'annotation') {
    slideEngage(pptx, L);
    (L.meta && L.meta.uncapLearn ? arr(L.learn) : arr(L.learn).slice(0, 4)).forEach((it) => slideLearn(pptx, L, it));
    renderBuildSlides(pptx, L, buildItems);
    slideVisualiser(pptx, L, visItem);                          // MANDATORY — never omit
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
    slideExam(pptx, L);                                         // real exam question AFTER the Apply answers (Y9-11, home)
  } else if (type === 'revision') {
    // Patryk 2026-10-14: Engage = the learning objectives; then Learn → 3-question check, per concept
    slideEngage(pptx, L);
    arr(L.learn).forEach((it, n) => {
      slideLearn(pptx, L, it);                                  // typically Learn-C (or one concept a slide)
      if (arr(it.check).length) slideAnswerList(pptx, L, { heading: `CHECK ${n + 1}` + ((it.heading || it.title) ? ' · ' + stripStage(it.heading || it.title, 'LEARN').toUpperCase() : ''), rows: it.check });
    });
    slideWhiteboardRounds(pptx, L);
    if (visItem) slideVisualiser(pptx, L, visItem);
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
    slideExam(pptx, L);                                         // real exam question AFTER the Apply answers (Y9-11, home)
  } else if (type === 'whiteboard') {
    slideWhiteboardRounds(pptx, L);
    if (visItem) slideVisualiser(pptx, L, visItem);
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
    slideExam(pptx, L);                                         // real exam question AFTER the Apply answers (Y9-11, home)
  } else if (type === 'review') {
    // Bug 55: review lessons are content-heavy — render ALL Learn slides (no
    // slice(0,4) cap), matching the revision branch. No Engage (matches the
    // review 8-slide order in SKILL.md). Build items DO render here so
    // markTheAnswers / modelAnswerReview reach the review slides.
    // 2026-10-14: Engage = the learning objectives (Patryk's standard opening); only when authored.
    slideEngage(pptx, L);
    arr(L.learn).forEach((it) => slideLearn(pptx, L, it));
    renderBuildSlides(pptx, L, buildItems);
    slideVisualiser(pptx, L, visItem);                          // mandatory (auto-generated) — matches the documented review sequence
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
    buildReviewExtras(pptx, L);                                 // EBI corrections + Extension (2026-10-10)
    slideExam(pptx, L);                                         // real exam question AFTER the Apply answers (Y9-11, home)
  } else if (type === 'test') {
    // Test lesson (Patryk 2026-10-14): pupils sit the school's paper. Title/Do Now ("look over your
    // notes", doNow.task) and Engage (the learning objectives). Nothing else; no worksheets.
    slideEngage(pptx, L);
  } else {
    // unknown type — treat as standard (keep the 4-Learn cap)
    slideEngage(pptx, L);
    (L.meta && L.meta.uncapLearn ? arr(L.learn) : arr(L.learn).slice(0, 4)).forEach((it) => slideLearn(pptx, L, it));
    renderBuildSlides(pptx, L, buildItems);
    slideVisualiser(pptx, L, visItem);
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
    slideExam(pptx, L);                                         // real exam question AFTER the Apply answers (Y9-11, home)
  }

  slideImageDump(pptx, L);                                       // M7: always last
  await pptx.writeFile({ fileName: outPath });
  const usesHandwriting = buildItems.some((b) => ['modelAnswerReview', 'correctTheStatement', 'markTheAnswers'].includes(b.type || b.variant));
  if (usesHandwriting) embedCaveatFont(outPath);                  // M2: embed Caveat so it survives on any machine
  try { finishText(outPath); }                                  // key-word gold underline + answer yellow
  catch (e) { buildWarn('key-word underline / answer yellow not applied: ' + e.message); }
  try { addRevealAnimations(outPath); }                           // 2026-10-03: answer boxes appear on click
  catch (e) { buildWarn('click animations not added: ' + e.message); }
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

const P = (children, opts) => new Paragraph(Object.assign({ children: arr(children).flat(Infinity) }, opts || {}));
// Every worksheet run: maths shorthand → real raised/lowered runs at SCRIPT_SCALE. Returns an
// array when the text holds maths; P() flattens it, and every R() goes through P().
const R = (text, opts) => { const r = docxMathRuns(text, opts); return r.length === 1 ? r[0] : r; };
// M6: standardised paragraph-spacing scale (twips) — replaces the previous scattered
// 0/10/20/30/40/60/80/120/160 mix. Line spacing (1.5x, BDA rule) is untouched — see ~L2745.
const GAP_NONE = 0;   // tightly-grouped lines within one scaffold block
const GAP_XS = 10;    // hint/annotation lines directly under a question
const GAP_SM = 20;    // list items, sub-parts, between question blocks, before/after tables
const GAP_MD = 40;    // after section titles/headers, around embedded images
const blanks = (n) => Array.from({ length: n }, () => new Paragraph({ spacing: { before: GAP_NONE, after: GAP_NONE } }));
// M1: a gap before/after tables. 2026-10-03 (Patryk deletes these by hand): a THIN 6pt line, not a
// full blank line, and tidyGaps() merges runs of them into one. Word still needs SOME paragraph
// between two tables (or it fuses them into one), so it is never removed entirely.
const spacer = () => {
  const p = new Paragraph({ keepNext: true, spacing: { before: 0, after: 0, line: 120, lineRule: LineRuleType.EXACT }, children: [new TextRun({ text: '', size: 4 })] });
  p._gap = true;
  return p;
};
// Drop a gap paragraph that directly follows another gap (or opens the sheet).
function tidyGaps(children) {
  const out = [];
  for (const c of children) {
    if (c && c._gap && (!out.length || out[out.length - 1]._gap)) continue;
    out.push(c);
  }
  return out;
}

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
  const titleCellArgs = { fill: theme.fill, borders: { ...NO_B, left: leftB }, margins: { top: 60, bottom: 60, left: 180, right: 80 }, children: [P(R(String(text).toUpperCase(), { bold: true, size: 28, color: theme.border }), { keepNext: true, keepLines: true })] }; // never stranded at a page foot
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
        children: [P(R(cap(tier), { bold: true, size: 18, color: TIER_DOCX[tier] || '333333' }), { alignment: AlignmentType.CENTER, keepNext: true, border: { left: { style: BorderStyle.SINGLE, size: 24, color: 'FFD700' } } })], // stays with its first question
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
  // C4 (revised 2026-10-03): the marks sit at the right-hand end of the question's LAST line,
  // exam-paper style, instead of taking a whole line of their own. Colour-muted annotation.
  const runs = [
    R(`Q${num}  `, { bold: true, size: 24 }),
    R(prettyText(text), { size: 24 }),   // 2026-07-05: superscripts/symbols typeset in every worksheet question
  ];
  if (marks) runs.push(R('	', { size: 24 }), R(`[${marks} ${marks > 1 ? 'marks' : 'mark'}]`, { size: 20, color: '888888' }));
  const out = [P(runs, { spacing: { before: GAP_SM, after: GAP_SM }, tabStops: [{ type: TabStopType.RIGHT, position: PAGE_W }] })]; // M3
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
  const kids = [P(R(label || '[Diagram: teacher inserts]', { italic: true, size: 18, color: '777777' }), { alignment: AlignmentType.CENTER })]
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
    } catch (e) {
      buildWarn(`worksheet diagram image failed to embed (${prac.embeddedImagePath}): ${e.message || e} — description box shipped instead`);
    }
  }
  return diagramBox(prac.imageDescription || '[Equipment / apparatus diagram: teacher inserts]', 8); // M6: use imageDescription in fallback
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
        children: r ? (r[i] == null || r[i] === '' ? blanks(2) : [P(R(r[i], { size: 20 }))]) : blanks(3),
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

let _guessUsedOnSheet = false;   // set by applyTierSection, reset per buildDocx

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
  // 2026-10-03 (Patryk chose "Option A", design-audit/guess-options-2026-10-03.png): ONE row of
  // five boxes with the letter inside each — no navy header row, no spacer paragraphs — about a
  // third of the old table's height. Pre-filled values follow the letter.
  const colW = [2021, 2021, 2021, 2021, 2022];
  const heads = ['G', 'U', 'E', 'S', 'S'];
  return [fullTable([
    new TableRow({
      children: colW.map((w, i) => {
        const emph = isAns && i === 4;                                  // Solve cell — the final answer
        const has = pre[i] != null && pre[i] !== '';
        const letter = R(heads[i] + '  ', { bold: true, size: 20, color: NAVY });
        const first = has
          ? P([letter, ...toDocxRuns(parseEq(String(pre[i])), { size: isAns ? 20 : 18, bold: emph, color: emph ? NAVY : undefined })])
          : P(letter);
        return cell({
          w, fill: emph ? 'FFF8E1' : undefined,
          borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: isAns ? [first] : [first, ...blanks(1)],
        });
      }),
    }),
  ], colW, GREY_TBL)];
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
    } else if (bt === 'reformatFlowchart') {
      const steps = arr(b.steps).slice(0, 6);
      const n = steps.length;
      const order = shuffleOrder(n);
      const letters = 'ABCDEF';
      out.push(...question(++state.n, b.instruction || 'These steps are in the wrong order. Write the letters in the correct order below.'));
      order.forEach((origIdx, k) => {
        out.push(P([R(letters[k] + '   ', { bold: true, size: 22 }), R(steps[origIdx].label || '', { size: 22 })], { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } })); // M3
      });
      out.push(P(R('Correct order:   ' + '_____   '.repeat(n), { size: 22 }), { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } })); // M3
      if (mode === 'answers') {
        const correctLetters = steps.map((_, i) => letters[order.indexOf(i)]).join(', ');
        out.push(...plainAnswerCallout(correctLetters));
      }
    } else if (bt === 'annotatedDiagram') {
      // Worksheet side stays minimal on purpose — the numbered key belongs on
      // the slide; confirm with Patryk once he's seen the slide whether he
      // also wants the key reproduced here.
      out.push(...question(++state.n, 'Label the diagram from the board, then describe what each labelled part does.'));
      if (mode === 'answers') {
        const keyText = arr(b.labels).map((lb, i) => (i + 1) + ' ' + String(lb.text || '')).join(', ');
        out.push(...plainAnswerCallout(keyText));
      }
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
/* examWorksheetBlock(eq) — the worksheet's real exam question (verbatim, no answer lines). */
function examWorksheetBlock(eq) {
  const out = [spacer(), new Table({
    width: { size: 3600, type: WidthType.DXA }, columnWidths: [3600], borders: NO_TBL_B,
    rows: [new TableRow({ children: [cell({
      w: 3600, fill: 'E8EAF6', margins: { top: 40, bottom: 40, left: 140, right: 140 },
      children: [P(R(`Exam question (${eq.board || 'AQA'}) · answer in your book`, { bold: true, size: 18, color: NAVY }),
        { alignment: AlignmentType.CENTER, keepNext: true, border: { left: { style: BorderStyle.SINGLE, size: 24, color: 'FFD700' } } })],
    })] })],
  })];
  arr(eq.groups).forEach((g) => {
    if (g.stem) out.push(P(R(prettyText(g.stem), { size: 24 }), { spacing: { before: GAP_SM, after: GAP_XS } }));
    g.parts.forEach((pt) => {
      const label = pt.label ? `(${pt.label})  ` : '';
      out.push(P([R(label, { bold: true, size: 24 }), R(prettyText(pt.text), { size: 24 }),
        R('\t', { size: 24 }), R(`[${pt.marks} ${pt.marks === 1 ? 'mark' : 'marks'}]`, { size: 20, color: '888888' })],
        { spacing: { before: GAP_SM, after: GAP_SM }, tabStops: [{ type: TabStopType.RIGHT, position: PAGE_W }] }));
    });
  });
  return out;
}

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
    // 2026-10-03 (Patryk): GUESS is never auto-added for calculations, never on Year 7/8
    // (they don't know the structure), and at most ONE per worksheet — only where the
    // question asks for it (q.guess). Calculations without it get a normal answer box.
    const yearNum = parseInt((L.meta || {}).year || (String((L.meta || {}).class || '').match(/^\d+/) || [])[0], 10);
    if (q.guess && !(yearNum <= 8) && !_guessUsedOnSheet) {
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
      if (scaffoldMode) { out.push(...guessScaffold(scaffoldMode, { given: q.given, unknown: q.unknown, equation: q.equation, substitute: q.substitute })); guessAdded = true; _guessUsedOnSheet = true; }
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
        children: [P([R('MODEL ANSWERS', { bold: true, size: 26, color: GOLD }), R('  ·  marking copy', { size: 22, color: 'FFFFFF' })])],
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
    // 2026-10-03: a second, different real exam question, only when it still fits 4 pages
    // (build.js decides with page-count.js). Answered in books: no answer lines.
    if (L.examWorksheet && L._examOnSheet && mode !== 'answers') ch.push(...examWorksheetBlock(L.examWorksheet));
  };


  // REVIEW lessons (2026-10-10): the EBI follow-up tasks + Extension questions for pupils (answered
  // in books, no boxes); on the answer sheet the model answers for the test (modelAnswerReview,
  // answerList) and the Extension answers. Only drawn when the lesson has them.
  const reviewExtrasSection = () => {
    const isReview = /^(review|revision)$/i.test(String(L.meta.lessonType || ''));
    if (!isReview) return;
    const ebi = arr(L.ebiTask && L.ebiTask.rows);
    if (ebi.length && mode !== 'answers') {
      ch.push(...divider('PURPLE PEN · 3 EBIs'));
      ch.push(P(R('Pick 3 EBIs from the front of your test. Do each one’s follow-up task in purple pen, using the support page.', { size: 20, italics: true }), { spacing: { after: GAP_SM } }));
      const colW = [1300, 6806, 2000];
      const rowsE = [new TableRow({ children: ['Question', 'Follow-up task', 'Support pages'].map((h, i) => cell({ w: colW[i], fill: NAVY, borders: GREY_TBL, margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [P(R(h, { bold: true, size: 20, color: 'FFFFFF' }))] })) })];
      ebi.forEach((r, i) => rowsE.push(new TableRow({ children: [r.q || '', r.task || '', pagesOnly(r.pages)].map((v, ci) => cell({ w: colW[ci], fill: i % 2 ? 'F5F5F5' : 'FFFFFF', borders: GREY_TBL,
        margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: [P(R(prettyText(String(v)), { size: 19, bold: ci === 0 }))] })) })));
      ch.push(fullTable(rowsE, colW, GREY_TBL), spacer());
    }
    if (mode === 'answers') {
      const items = arr(L.build).filter((b) => ['modelAnswerReview', 'answerList'].includes(b.type || b.variant));
      if (items.length) ch.push(...divider('TEST · MODEL ANSWERS'));
      items.forEach((b) => {
        if ((b.type || b.variant) === 'answerList') {
          arr(b.rows).map(normQ).forEach((r) => { ch.push(P(R(prettyText(r.q), { bold: true, size: 22 }), { spacing: { before: GAP_SM } })); ch.push(...plainAnswerCallout(r.a)); });
          return;
        }
        const head = `Q${b.questionNumber || ''}` + (b.marks ? `  [${b.marks} ${b.marks > 1 ? 'marks' : 'mark'}]` : '');
        ch.push(P(R(head, { bold: true, size: 24 }), { spacing: { before: GAP_SM }, keepNext: true }));
        const ma = Array.isArray(b.modelAnswer) ? b.modelAnswer.join(';   ') : (b.modelAnswer || '');   // working steps, one after another
        ch.push(...plainAnswerCallout(ma));
        if (arr(b.indicativeContent).length || arr(b.levelDescriptors).length || arr(b.doesNotAward).length) ch.push(...markingPanelDocx(b));
      });
    }
    const cols = extensionCols(L);
    if (cols.length) {
      ch.push(...divider(mode === 'answers' ? 'EXTENSION · ANSWERS' : 'EXTENSION'));
      if (mode !== 'answers') ch.push(P(R('Finished your 3 EBIs? Pick the subtopic you got wrong and answer in your book.', { size: 20, italics: true }), { spacing: { after: GAP_SM } }));
      cols.forEach((c) => {
        ch.push(P([R(c.subtopic, { bold: true, size: 24, color: NAVY }), ...(c.pages ? [R('    Support: ' + pagesOnly(c.pages), { size: 20, color: '555555' })] : [])], { spacing: { before: GAP_SM, after: GAP_XS }, keepNext: true }));
        c.qs.forEach((q) => {
          ch.push(P([R(q.label + '  ', { bold: true, size: 24 }), R(prettyText(q.q), { size: 24 }), ...(q.marks ? [R(`  [${q.marks} ${q.marks > 1 ? 'marks' : 'mark'}]`, { size: 20, color: '888888' })] : [])], { spacing: { before: GAP_SM, after: GAP_SM } }));
          if (mode === 'answers') ch.push(...plainAnswerCallout(q.a));
        });
      });
    }
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
    // up to TWO experiments (Patryk 2026-10-12); the second uses its own `results` on the practical item
    const pracsE = arr(L.build).filter((b) => (b.type || b.variant) === 'practical').slice(0, 2);
    (pracsE.length ? pracsE : [{}]).forEach((prac, k) => {
    if (pracsE.length > 1) ch.push(...divider(prac.heading || prac.title || 'EXPERIMENT ' + (k + 1)));
    const intro = k === 0 ? (wx.intro || prac.intro) : prac.intro;
    if (intro) ch.push(...contextBox(intro));
    if (prac.embeddedImagePath || prac.imagePlaceholder !== false) ch.push(...diagramOrImage(prac));
    if (arr(prac.steps).length) {
      ch.push(...sectionLabel('Method'));
      arr(prac.steps).forEach((st, i) => ch.push(P([R(`${i + 1}.  `, { bold: true, size: 20 }), R(st, { size: 20 })], { spacing: { before: GAP_SM, after: GAP_SM } }))); // M3
    }
    ch.push(...sectionLabel('Variables'));
    ch.push(...variablesTable());
    ch.push(...divider('RESULTS'));
    const res = (k === 0 ? wx.results : prac.results) || {};
    ch.push(...resultsTable(res.headers || ['', '', ''], res.rows == null ? 5 : res.rows));
    });
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
    // up to TWO experiments (Patryk 2026-10-12: reflection then refraction); the first uses
    // worksheetExtras.results / referenceData, the second its own `results` on the practical item
    const pracs = arr(L.build).filter((b) => (b.type || b.variant) === 'practical').slice(0, 2);
    pracs.forEach((pracA, k) => {
      ch.push(...divider(pracA.heading || pracA.title || (pracs.length > 1 ? 'EXPERIMENT ' + (k + 1) : 'EXPERIMENT'))); // M2: B6 derive heading from item
      if (pracA.intro && pracA.worksheetIntro !== false) ch.push(...contextBox(pracA.intro)); // M7: E11
      if (pracA.embeddedImagePath || pracA.imagePlaceholder !== false) ch.push(...diagramOrImage(pracA));
      const resA = (k === 0 ? wx.results : pracA.results) || {};
      const rd = k === 0 ? wx.referenceData : null;
      if (resA.headers) {
        ch.push(...resultsTable(resA.headers, resA.rows == null ? 5 : resA.rows));
      } else if (rd && arr(rd.headers).length) {
        // no explicit results table — derive blank recording table from referenceData headers
        ch.push(...resultsTable(rd.headers, 5));
      }
      arr(pracA.questions).forEach((q, i) => ch.push(...question(i + 1, q.q || '')));
    });
    buildSection();
    if (wx.collectionTable && arr(wx.collectionTable.headers).length) {
      const ct = wx.collectionTable;
      ch.push(...divider(ct.title || 'DATA COLLECTION'));
      if (ct.instruction) ch.push(...contextBox(ct.instruction));
      ch.push(...resultsTable(ct.headers, ct.rows == null ? 6 : ct.rows));
    }
    applySection({});
  }
  reviewExtrasSection();
  return ch;
}
async function buildDocx(L, outPath, mode) {
  _guessUsedOnSheet = false;                                     // one GUESS row per worksheet
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
      children: tidyGaps(buildWorksheetChildren(L, mode)),
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
      // 0 — Real exam questions (Patryk 2026-10-03), home only: exam-pick.js and the exam
      //     library are not packaged for claude.ai, so school builds skip this quietly. A lesson
      //     can opt out with meta.examQuestion:false or bring its own L.examQuestion.
      // Automatic Do Now (Patryk 2026-10-08), home only: `"doNow": {"auto": true}` fills the six
      // questions from what the class has covered (do-now-pick.js: spaced retrieval + one question from
      // last year's content). A Do Now written into the lesson is always used as written.
      const dnPickPath = path.join(__dirname, 'do-now-pick.js');
      if (L.doNow && L.doNow.auto && !arr(L.doNow.questions).length && fs.existsSync(dnPickPath)) {
        try {
          const cls = String((L.meta || {}).class || '').split(/[\/,]/)[0].trim();
          const r = require(dnPickPath).pick(cls, { date: (L.meta || {}).date, varyNumbers: L.doNow.varyNumbers !== false });
          L.doNow.questions = r.picked.map((p) => ({ q: p.q, a: p.a, marks: p.marks || 1 }));
          // new numbers on a calculation (2026-10-15): say so in the presenter notes, never on the slide
          const varied = r.picked.map((p, i) => (p.varied ? `Q${i + 1}: numbers changed from ${p.varied} (same wording, answer worked out again)` : null)).filter(Boolean);
          if (varied.length) { L.doNow.specPoints = arr(L.doNow.specPoints).concat(varied); console.log('  [do now] ' + varied.join('; ')); }
          console.log(`  [do now] ${r.picked.length} picked for ${cls} (${r.picked.map((p) => p.why).join(', ')})`);
        } catch (e) { buildWarn('automatic Do Now not picked: ' + e.message); }
      }
      const examPickPath = path.join(__dirname, 'exam-pick.js');
      let examPicked = null;
      if (L.examQuestion === undefined && (L.meta || {}).examQuestion !== false && fs.existsSync(examPickPath) && !process.env.NO_EXAM_PICK) {
        try {
          examPicked = require(examPickPath).pickForLesson(L);
          L.examQuestion = examPicked.board || null;
          if (L.examWorksheet === undefined) L.examWorksheet = examPicked.worksheet || null;
          if (examPicked.board) console.log(`  [exam] board: ${examPicked.board.examRef} (${examPicked.board.marks} marks)` +
            (examPicked.worksheet ? `; worksheet candidate: ${examPicked.worksheet.examRef}` : ''));
          else if (examPicked.why) console.log(`  [exam] none: ${examPicked.why}`);
        } catch (e) { buildWarn('exam question not picked: ' + e.message); }
      }
      // Never lose the exam question silently (Patryk 2026-10-12: Reflection and Refraction had none).
      // meta.examQuestion:false is a deliberate opt-out and stays quiet.
      const examYear = parseInt((L.meta || {}).year || (String((L.meta || {}).class || '').match(/^\d+/) || [])[0], 10);
      if (examYear >= 9 && examYear <= 11 && /^[BCP]\d+\b/.test(String((L.meta || {}).macrotopic || '')) &&
          fs.existsSync(examPickPath) && (L.meta || {}).examQuestion !== false &&
          !(L.examQuestion && arr(L.examQuestion.groups).length)) {
        buildWarn('NO EXAM QUESTION on this deck: ' + (process.env.NO_EXAM_PICK ? 'NO_EXAM_PICK is set'
          : !examPicked ? 'the lesson JSON already had an examQuestion key (delete it to auto-pick)'
          : (examPicked.why || 'none picked')));
      }

      const pptxPath = path.join(outDir, base + '.pptx');
      await buildPptx(L, pptxPath);
      console.log('  \u2713 ' + path.basename(pptxPath));

      // 2 \u2014 Worksheet (review/revision lessons: booklet only; standard lessons: companion worksheet)
      // 2026-07-11: revision lessons get the same answer-sheet treatment as review
      // lessons (Patryk's call \u2014 see backlog.md "Revision lesson output set change").
      const lessonTypeLower = String((L.meta || {}).lessonType || '').toLowerCase();
      const isReview = lessonTypeLower === 'review' || lessonTypeLower === 'revision';
      const deckOnly = lessonTypeLower === 'test';     // test lessons: the opening slides only (2026-10-14)
      if (!deckOnly) {
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

      // 3a \u2014 worksheet exam question (Patryk 2026-10-03): rebuild both sheets WITH it, keep it only
      //     if Word says both still fit 4 pages; otherwise rebuild without. Needs the page counter,
      //     so it only ever happens at home.
      const pcPath = path.join(__dirname, 'page-count.js');
      if (L.examWorksheet && !isReview && fs.existsSync(pcPath) && !process.env.NO_PAGECOUNT) {
        const supportP = path.join(outDir, base + '_support_worksheet.docx');
        L._examOnSheet = true;
        await buildDocx(L, wsPath, 'standard');
        await buildDocx(L, supportP, 'developing');
        const pcx = require(pcPath);
        const res = pcx.countPages([wsPath, supportP]);
        if (res.every((r) => r.pages != null && r.pages <= pcx.PAGE_LIMIT)) {
          L._examWorksheetUsed = true;
          console.log(`  [exam] worksheet question added (${L.examWorksheet.examRef}): ${res.map((r) => r.pages).join('/')} pages`);
        } else {
          L._examOnSheet = false;
          await buildDocx(L, wsPath, 'standard');
          await buildDocx(L, supportP, 'developing');
          console.log('  [exam] worksheet question left off: it would push the sheet past 4 pages');
        }
      }

      // 3b \u2014 4-page rule (Patryk 2026-10-03): ask Word for the real page count. Home only
      //     (page-count.js is not packaged); NO_PAGECOUNT=1 skips it (the test harness sets it).
      const pageCountPath = path.join(__dirname, 'page-count.js');
      if (fs.existsSync(pageCountPath) && !process.env.NO_PAGECOUNT && !isReview) {
        try {
          const pc = require(pageCountPath);
          const sheets = [wsPath, path.join(outDir, base + '_support_worksheet.docx')];
          for (const res of pc.countPages(sheets)) {
            const v = pc.verdict(res);
            if (!v) continue;
            if (res.pages > pc.PAGE_LIMIT) buildWarn(v); else console.log('  ' + v);
          }
        } catch (e) { console.log('  [pages] page count skipped: ' + e.message); }
      }
      }   // end !deckOnly

      // 4 \u2014 Drive sidecar: one-line text file with the destination folder path.
      //     Only written when all Drive meta fields are present. Used by drive-upload.ps1.
      const { year, subject, macrotopic, lessonNumber } = L.meta;
      const lessonTitle = L.meta.title || L.meta.topic;
      if (year && subject && macrotopic && lessonNumber && lessonTitle) {
        const drivePath = `G:\\My Drive\\Beechen Cliff Science\\Lessons\\Year ${year}\\${subject}\\${macrotopic}\\Lesson ${lessonNumber} - ${lessonTitle}`;
        fs.writeFileSync(path.join(outDir, base + '.path.txt'), drivePath, 'utf8');
        console.log('  \u2713 ' + base + '.path.txt');
        // 4b \u2014 Manifest sidecar (2026/27 school-Drive uploader): which files belong in
        // which folder, consumed by references/push-to-school.js \u2192 Apps Script web app.
        // Same trigger as the sidecar; relative folder path (no G:\ \u2014 the school root differs).
        const revLower = String((L.meta || {}).lessonType || '').toLowerCase();
        const isRev = revLower === 'review' || revLower === 'revision';
        const manifest = {
          builtOn: new Date().toISOString().slice(0, 10),
          class: L.meta.class || null, year, subject, macrotopic, lessonNumber, title: lessonTitle,
          folder: `Year ${year}/${subject}/${macrotopic}/Lesson ${lessonNumber} - ${lessonTitle}`,
          files: deckOnly ? [base + '.pptx'] : [base + '.pptx', base + '_worksheet.docx',
                  base + (isRev ? '_answers.docx' : '_support_worksheet.docx')],
        };
        fs.writeFileSync(path.join(outDir, base + '.manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
      }

      // remember which exam questions this class has now seen (never repeated)
      if (examPicked && !process.env.NO_EXAM_LOG) {
        const used = [L.examQuestion && L.examQuestion.examRef, L._examWorksheetUsed && L.examWorksheet && L.examWorksheet.examRef].filter(Boolean);
        try { require(examPickPath).recordUse((L.meta || {}).class, used); } catch (e) { buildWarn('exam usage not saved: ' + e.message); }
      }
      ok++;
      flushBuildWarns(label);       // 2026-07-12: degraded-but-successful builds now say so out loud
    } catch (e) {
      fail++;
      console.error('  \u2717 FAILED: ' + label + ' \u00B7 ' + e.message);
      if (process.env.BUILD_DEBUG) console.error(e.stack);
      flushBuildWarns(label);
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
