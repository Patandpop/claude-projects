'use strict';
// build.js part 01-core: requires, constants (colours, sizes, stages, tiers), small helpers (cap, slug, arr, normQ, mcqOptions, esc). Loaded by build.js in order; all parts share one scope.

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
