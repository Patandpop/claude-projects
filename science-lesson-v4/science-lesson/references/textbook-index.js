'use strict';
/* ============================================================================
   textbook-index.js — single source of truth for textbook page references.

   Parses references/textbook-index.md (AQA Kerboodle Bio/Chem/Phys + Activate
   1 & 2) into structured sections, and resolves a lesson to its book + pages.

   Consumers: build.js (Apply slide + worksheet reference), test-review-lesson.js
   (auto-fill subtopic bookRef), order-sheet.js (which book to order).

   Pure library — no side effects on require. CGP is deliberately out of scope
   for now (KS4 Kerboodle books stand in).

   Public API:
     loadIndex(mdPath?)                         -> { sections:[{book,code,title,page}], byCode }
     matchLesson({year,subject,topic,keywords}) -> {book,pages:[a,b?],sections:[code]} | null
     resolve({year,subject,topic,keywords,override}) -> same as matchLesson | null
     primaryBook({year,subject})                -> book name | null   (for review ordering)
     formatRef(match)                           -> "Activate 2, pp. 10–12" | ""
   ============================================================================ */

const fs   = require('fs');
const path = require('path');

const DEFAULT_MD = path.join(__dirname, 'textbook-index.md');

// Heading (## ...) → book display name. Anything else is ignored.
const BOOK_NAMES = [
  [/AQA GCSE BIOLOGY/i,   'AQA Biology (Kerboodle)'],
  [/AQA GCSE CHEMISTRY/i, 'AQA Chemistry (Kerboodle)'],
  [/AQA GCSE PHYSICS/i,   'AQA Physics (Kerboodle)'],
  [/ACTIVATE 1/i,         'Activate 1'],
  [/ACTIVATE 2/i,         'Activate 2'],
];
const KERBOODLE = { biology: 'AQA Biology (Kerboodle)', chemistry: 'AQA Chemistry (Kerboodle)', physics: 'AQA Physics (Kerboodle)' };

function kerboodleFor(subject) {
  const s = String(subject || '').toLowerCase();
  if (s.includes('bio')) return KERBOODLE.biology;
  if (s.includes('chem')) return KERBOODLE.chemistry;
  if (s.includes('phys')) return KERBOODLE.physics;
  return null;
}
function yearNum(year) { const m = /\d+/.exec(String(year == null ? '' : year)); return m ? parseInt(m[0], 10) : null; }

// Books searched when auto-matching a lesson, by year (+ subject for KS4).
function booksForYear(year, subject) {
  const y = yearNum(year), k = kerboodleFor(subject);
  if (y === 7 || y === 8) return ['Activate 1', 'Activate 2'];
  if (y === 9)            return ['Activate 2', k].filter(Boolean);
  if (y === 10 || y === 11) return [k].filter(Boolean);
  return []; // Y12 A-level not indexed; unknown year → no books
}
// The class's standard book for review ordering (no section match needed).
function primaryBook(opts) {
  const y = yearNum(opts && opts.year), k = kerboodleFor(opts && opts.subject);
  if (y === 7) return 'Activate 1';
  if (y === 8) return 'Activate 2';
  if (y === 9) return k || 'Activate 2';
  if (y === 10 || y === 11) return k;
  return null;
}

/* ------------------------------------------------------------------ parsing */

let _cache = new Map();
function loadIndex(mdPath) {
  const p = mdPath || DEFAULT_MD;
  if (_cache.has(p)) return _cache.get(p);
  let raw = '';
  try { raw = fs.readFileSync(p, 'utf8'); } catch (_) { raw = ''; }
  const sections = [];
  let book = null;
  // one section entry: "B3.4 Catalysts and enzymes p42" (Kerboodle) or
  // "1.1 Observing cells p14" (Activate). Codes: optional letter + digits(.digits).
  const ENTRY = /\b([A-Z]?\d+(?:\.\d+)?)\s+(.+?)\s+p(\d+)(?=\s*[·|\n]|\s*\*|\s*†|$)/g;
  for (const line of raw.split('\n')) {
    const h = /^##\s+(.*)$/.exec(line.trim());
    if (h) { const hit = BOOK_NAMES.find(([re]) => re.test(h[1])); book = hit ? hit[1] : null; continue; }
    if (!book) continue;
    let m;
    while ((m = ENTRY.exec(line))) {
      const title = m[2].replace(/\s*[–—-]\s*$/, '').trim();
      sections.push({ book, code: m[1], title, page: parseInt(m[3], 10) });
    }
  }
  const byCode = new Map();
  sections.forEach((s) => { if (!byCode.has(s.code)) byCode.set(s.code, s); });
  const idx = { sections, byCode };
  _cache.set(p, idx);
  return idx;
}

/* ------------------------------------------------------------------ matching */

const STOP = new Set(['the','and','of','in','to','for','with','its','into','at','on','or','a','an','more','about','using','use','uses']);
// light stem: drop a trailing plural 's' on longer words so enzyme≈enzymes, cell≈cells
function tokens(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => (w.length >= 4 && w.endsWith('s') ? w.slice(0, -1) : w));
}
// score a section title against the lesson's token set → {shared, strong}
function scoreTitle(titleToks, lessonSet) {
  let shared = 0, strong = false;
  for (const t of titleToks) if (lessonSet.has(t)) { shared++; if (t.length >= 5) strong = true; }
  return { shared, strong };
}

const PAGE_GAP = 8; // sections of one chapter sit ~2 pages apart; >8 = a different chapter/subject
function matchLesson(opts) {
  const o = opts || {};
  const books = booksForYear(o.year, o.subject);
  if (!books.length) return null;
  const idx = loadIndex(o.mdPath);
  const lessonSet = new Set([].concat(tokens(o.topic), ...(Array.isArray(o.keywords) ? o.keywords : [o.keywords]).map(tokens)));
  if (!lessonSet.size) return null;

  // Best cluster = run of page-adjacent qualifying sections (one chapter), scored by
  // total shared words. Page-adjacency (not code prefix) avoids merging different
  // subjects that reuse the same chapter number in the Activate books.
  let best = null; // { book, score, sections:[{code,page,shared}] }
  for (const book of books) {
    const hits = idx.sections
      .filter((sec) => sec.book === book)
      .map((sec) => ({ ...sec, ...scoreTitle(tokens(sec.title), lessonSet) }))
      .filter((h) => (h.strong && h.shared >= 1) || h.shared >= 2)
      .sort((a, b) => a.page - b.page);
    let run = [];
    const flush = () => {
      if (!run.length) return;
      const score = run.reduce((n, h) => n + h.shared, 0);
      if (!best || score > best.score) best = { book, score, sections: run.slice() };
    };
    for (const h of hits) {
      if (run.length && h.page - run[run.length - 1].page > PAGE_GAP) { flush(); run = []; }
      run.push(h);
    }
    flush();
  }
  if (!best) return null;
  const pages = best.sections.map((s) => s.page).sort((a, b) => a - b);
  const lo = pages[0], hi = pages[pages.length - 1];
  return { book: best.book, pages: lo === hi ? [lo] : [lo, hi], sections: best.sections.map((s) => s.code) };
}

// resolve override (meta.textbookRef) → else auto-match.
function resolve(opts) {
  const o = opts || {};
  const ov = o.override;
  if (ov === 'none' || ov === false) return null;
  if (ov && typeof ov === 'object' && !Array.isArray(ov)) {
    // explicit { book, pages }
    const pages = Array.isArray(ov.pages) ? ov.pages : (ov.pages != null ? [ov.pages] : []);
    return ov.book ? { book: ov.book, pages, sections: [] } : null;
  }
  if (ov) {
    // section code or list of codes
    const codes = (Array.isArray(ov) ? ov : [ov]).map(String);
    const idx = loadIndex(o.mdPath);
    const entries = codes.map((c) => idx.byCode.get(c)).filter(Boolean);
    if (!entries.length) return null;
    const pages = entries.map((e) => e.page).sort((a, b) => a - b);
    const lo = pages[0], hi = pages[pages.length - 1];
    return { book: entries[0].book, pages: lo === hi ? [lo] : [lo, hi], sections: entries.map((e) => e.code) };
  }
  return matchLesson(o);
}

function formatRef(match) {
  if (!match || !match.book) return '';
  const p = match.pages || [];
  if (!p.length) return match.book;
  const pages = p.length > 1 ? `pp. ${p[0]}–${p[1]}` : `p. ${p[0]}`;
  return `${match.book}, ${pages}`;
}

module.exports = { loadIndex, matchLesson, resolve, primaryBook, formatRef, booksForYear, kerboodleFor, _DEFAULT_MD: DEFAULT_MD };
