#!/usr/bin/env node
// CGP book scanner (lanes/design-cgp-scanner.md): turns his online CGP revision guides into a topic -> page index for
// textbook-index.md, plus where the questions and the answers are (for the "book task" follow-up). Everything runs on
// the home PC: a browser window he logs into himself, page pictures kept in a local folder, the words read off them
// by the OCR built into Windows (free), and only the INDEX (titles, page numbers, question numbers) is kept in the
// repo. No page picture or page text ever goes into git, Drive or the skill.
//
//   node planner/tools/cgp-index.js capture physics|chemistry|biology [--pages 250] [--out folder] [--forget]
//        opens the book in its own browser window; he logs in and turns to the first page; the tool then takes one
//        picture per page (Right arrow) until the picture stops changing. --forget uses a throwaway browser profile.
//   node planner/tools/cgp-index.js ocr <pages folder>              reads the words off every picture (Windows OCR)
//   node planner/tools/cgp-index.js index <pages folder> --book "CGP AQA Combined Science: Physics" --letter P
//        writes <folder>/cgp-index.md (the block for textbook-index.md), cgp-index.json (every page: kind, title,
//        chapter, questions, answers) and spot-check.txt (ten pages for him to confirm against the real book)
//   node planner/tools/cgp-index.js check <pages folder>            prints the spot-check list and the doubts
//
// The index step is pure (exported below) so planner/tests/cgp-index.test.js can run it on a made-up book.
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const BOOKS = {   // his three CGP online books (Combined Science, AQA), 2026-10-15
  physics:   { url: 'https://library.cgpbooks.co.uk/digitalaccess/SCPAT42DF/Online/', book: 'CGP AQA Combined Science: Physics',   letter: 'P' },
  chemistry: { url: 'https://library.cgpbooks.co.uk/digitalaccess/SCCAT42DF/Online/', book: 'CGP AQA Combined Science: Chemistry', letter: 'C' },
  biology:   { url: 'https://library.cgpbooks.co.uk/digitalaccess/SCBAT42DF/Online/', book: 'CGP AQA Combined Science: Biology',   letter: 'B' },
};
const PROFILE = path.join(__dirname, '.cgp-browser-profile');   // his login, on this PC only (gitignored)

/* ------------------------------------------------------------------ reading one page */

const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
// OCR reads "Q1" as "QI" or "Ql" and "10" as "lO" now and then; question labels are fixed before use
const fixDigits = (s) => s.replace(/[IlO]/g, (c) => ({ I: '1', l: '1', O: '0' }[c]));
const QUESTION_RE = /^(?:Q\s?)?([IlO0-9]{1,2}(?:\.[0-9])?)\s*[).:]?\s+(.{3,})$/;
const PAGE_NUM_RE = /^(\d{1,3})$/;

function kindOf(title) {
  const t = (title || '').toLowerCase();
  if (!t) return 'other';
  if (/^contents\b/.test(t)) return 'contents';
  if (/^index\b/.test(t)) return 'index';
  if (/^answers\b/.test(t)) return 'answers';
  if (/revision summary|revision questions/.test(t)) return 'summary';
  if (/\bquestions?\b|exam practice|practice paper|mixed questions/.test(t)) return 'questions';
  if (/^(glossary|equations?|formula|physics equations|periodic table|the periodic table|data sheet)\b/.test(t)) return 'reference';
  return 'topic';
}

// What one page says, from the OCR lines and where they sit. Returns a plain object the index step can use.
function analysePage(page) {
  const H = page.height || 1, W = page.width || 1;
  const lines = (page.lines || []).map((l) => Object.assign({}, l, { text: clean(l.text) })).filter((l) => l.text);
  const body = median(lines.filter((l) => l.text.length > 20).map((l) => l.h)) || median(lines.map((l) => l.h)) || 1;
  // the small strip at the very top edge: the guides print the topic name over every page of a topic
  const strip = lines.find((l) => l.y < H * 0.045 && l.h < body * 1.3 && /topic|section|unit|chapter|^[A-Z][a-z]+(\s[A-Za-z]+){0,4}$/i.test(l.text));
  // the title: the tallest line in the top fifth that is clearly bigger than the body text
  const topZone = lines.filter((l) => l.y < H * 0.2 && l !== strip && l.h >= body * 1.4 && !PAGE_NUM_RE.test(l.text));
  const title = topZone.slice().sort((a, b) => (b.h - a.h) || (a.y - b.y))[0] || null;
  // the printed page number: a short number alone near the bottom (or top) edge
  const num = lines.find((l) => PAGE_NUM_RE.test(l.text) && (l.y > H * 0.9 || l.y < H * 0.06) && (l.x < W * 0.15 || l.x + l.w > W * 0.85));
  // smaller headings inside the page
  const subheads = lines.filter((l) => l !== title && l !== strip && l.h >= body * 1.2 && (!title || l.h < title.h) && l.text.length >= 4 && !PAGE_NUM_RE.test(l.text)).map((l) => l.text);
  const kind = kindOf(title && title.text);
  // the questions: numbered lines under a "... Questions" heading (or anywhere on a questions page)
  const questions = [];
  let inQ = kind === 'questions', heading = kind === 'questions' ? (title ? title.text : 'Questions') : '';
  for (const l of lines) {
    if (l === title || l === strip) continue;
    if (subheads.includes(l.text)) { inQ = /questions?/i.test(l.text); heading = l.text; continue; }
    const m = inQ && QUESTION_RE.exec(l.text);
    if (m) questions.push({ n: fixDigits(m[1]), under: heading, text: m[2].slice(0, 80) });
  }
  // an answers page says which page each block answers: "Page 5: Warm-Up Questions"
  const answersFor = [];
  if (kind === 'answers' || /^answers\b/i.test(strip ? strip.text : '')) {
    for (const l of lines) { const m = /^(?:Page|p\.?)\s*(\d{1,3})\s*[:.]?\s*(.*)$/i.exec(l.text); if (m) answersFor.push({ page: parseInt(m[1], 10), what: m[2] }); }
  }
  return {
    file: page.file, title: title ? title.text : '', strip: strip ? strip.text : '', printed: num ? parseInt(num.text, 10) : null,
    kind, subheads, questions, answersFor, lineCount: lines.length,
    contents: kind === 'contents' ? readContents(lines, title) : [],
  };
}

// The contents page: "Topic 1: Energy" headings and "Specific Heat Capacity ....... 4" entries. OCR often splits the
// dotted leader and the number off as a line of their own at the same height, so lines are joined by row first.
function readContents(lines, title) {
  const rows = [];
  for (const l of lines.filter((x) => x !== title).sort((a, b) => a.y - b.y || a.x - b.x)) {
    const r = rows.find((row) => Math.abs(row.y - l.y) <= Math.max(6, l.h * 0.6));
    if (r) { r.parts.push(l); r.y = Math.min(r.y, l.y); } else rows.push({ y: l.y, parts: [l] });
  }
  const out = []; let chapter = null;
  for (const r of rows) {
    // dotted leaders become one space: "Specific Heat Capacity . .4" -> "Specific Heat Capacity 4"
    const text = clean(r.parts.sort((a, b) => a.x - b.x).map((p) => p.text).join(' ').replace(/(\s*\.)+\s*/g, ' '));
    const m = /^(.{3,}?)\s+(\d{1,3})$/.exec(text);
    const ch = chapterOf(m ? m[1] : text);
    if (ch) { chapter = ch; out.push({ chapter: ch.n, name: ch.name, heading: true, page: m ? parseInt(m[2], 10) : null }); continue; }
    if (m) out.push({ title: m[1], page: parseInt(m[2], 10), chapter: chapter ? chapter.n : null, name: chapter ? chapter.name : '' });
  }
  return out;
}
const loose = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* ------------------------------------------------------------------ the whole book */

// "Topic 1: Energy" at the START of a strip or contents row (not "Revision Summary for Topic 1")
const chapterOf = (strip) => { const m = /^(?:topic|section|unit|chapter)\s*(\d{1,2})\s*[:.-]?\s*(.*)$/i.exec(clean(strip)); return m ? { n: parseInt(m[1], 10), name: clean(m[2]) } : null; };

// Printed page numbers: the OCR'd ones where they agree with their neighbours, the gaps filled by counting on.
function numberPages(pages) {
  const n = pages.length, out = new Array(n).fill(null), doubts = [];
  // trust an OCR'd number when the page before or after also has one and it is one apart
  for (let i = 0; i < n; i++) {
    const p = pages[i].printed; if (p == null) continue;
    const at = (k) => (k >= 0 && k < n ? pages[k].printed : null);
    // trusted when a page one or two away was read as a number one or two away in the same direction
    const agrees = [-2, -1, 1, 2].some((d) => at(i + d) != null && at(i + d) - p === d);
    if (agrees || n < 3) out[i] = p;
    else doubts.push(pages[i].file + ': the page number read as ' + p + ' does not follow its neighbours');
  }
  // fill forwards, then backwards, from any trusted number
  for (let i = 1; i < n; i++) if (out[i] == null && out[i - 1] != null && pages[i].kind !== 'other') out[i] = out[i - 1] + 1;
  for (let i = n - 2; i >= 0; i--) if (out[i] == null && out[i + 1] != null && pages[i].kind !== 'other') out[i] = out[i + 1] - 1;
  for (let i = 0; i < n; i++) if (out[i] != null && out[i] < 1) out[i] = null;   // the cover and inside cover have no number
  return { numbers: out, doubts };
}

// The index: sections (topic pages) per chapter in textbook-index.md's own format, plus question, summary and answer pages.
function buildIndex(analysed, opts) {
  const o = opts || {}, book = o.book || 'CGP book', letter = (o.letter || '').toUpperCase();
  const { numbers, doubts } = numberPages(analysed);
  // the contents page(s): chapter page ranges (a fallback when a book prints no topic strip) and a cross-check
  const contents = [].concat(...analysed.map((p) => p.contents || []));
  const chapterStarts = [];
  for (const e of contents) {
    if (e.chapter == null) continue;
    const start = e.heading ? e.page : e.page, have = chapterStarts.find((c) => c.n === e.chapter);
    if (start == null) { if (!have) chapterStarts.push({ n: e.chapter, name: e.name, page: null }); continue; }
    if (!have) chapterStarts.push({ n: e.chapter, name: e.name, page: start }); else if (have.page == null || start < have.page) have.page = start;
  }
  chapterStarts.sort((a, b) => (a.page == null) - (b.page == null) || a.page - b.page);
  const chapterByPage = (pg) => { let hit = null; for (const c of chapterStarts) if (c.page != null && c.page <= pg) hit = c; return hit; };
  let chapter = null, inAnswers = false;
  const pages = analysed.map((p, i) => {
    const ch = chapterOf(p.strip); if (ch) chapter = ch;
    if (p.kind === 'answers') inAnswers = true;
    else if (['index', 'reference', 'contents'].includes(p.kind) && p.title) inAnswers = false;
    const kind = inAnswers && p.kind !== 'answers' && p.answersFor.length ? 'answers' : p.kind;
    const fromContents = !ch && numbers[i] != null && !p.strip ? chapterByPage(numbers[i]) : null;
    const c = ch || (p.strip ? chapter : (fromContents || chapter));
    return Object.assign({}, p, { page: numbers[i], chapter: c ? c.n : null, chapterName: c ? c.name : '', kind });
  });
  // cross-check: every contents entry should be found, with that title, on that printed page
  for (const e of contents) {
    if (e.heading || e.page == null) continue;
    const at = pages.find((p) => p.page === e.page);
    if (!at) { doubts.push('contents says "' + e.title + '" is on page ' + e.page + ', but no picture was read as page ' + e.page); continue; }
    const a = loose(at.title), b = loose(e.title);
    if (a && b && a !== b && !a.includes(b) && !b.includes(a)) doubts.push('contents says page ' + e.page + ' is "' + e.title + '", but ' + at.file + ' was read as "' + at.title + '"');
  }
  // section codes: P1.1, P1.2 ... per chapter, topic pages only
  const count = {}, sections = [];
  for (const p of pages) {
    if (p.kind !== 'topic' || !p.title || p.page == null) continue;
    const c = p.chapter == null ? 0 : p.chapter; count[c] = (count[c] || 0) + 1;
    sections.push({ code: letter + c + '.' + count[c], title: p.title, page: p.page, chapter: c, chapterName: p.chapterName, questions: p.questions.map((q) => q.n) });
  }
  const questionPages = pages.filter((p) => (p.kind === 'questions' || p.kind === 'summary') && p.page != null)
    .map((p) => ({ page: p.page, title: p.title, kind: p.kind, chapter: p.chapter, questions: p.questions.map((q) => q.n) }));
  const answers = {};   // printed page -> the answers page that covers it
  for (const p of pages) if (p.kind === 'answers' && p.page != null) for (const a of p.answersFor) if (!answers[a.page]) answers[a.page] = p.page;
  for (const q of questionPages) q.answersPage = answers[q.page] || null;
  for (const s of sections) s.answersPage = answers[s.page] || null;
  // pages the tool is unsure about
  for (const p of pages) {
    if (p.kind === 'other' && p.lineCount > 8) doubts.push(p.file + ': no title found, so this page is left out (' + p.lineCount + ' lines of text)');
    if (p.kind === 'topic' && p.page == null) doubts.push(p.file + ': "' + p.title + '" has no page number, so it is left out');
  }
  const md = renderMd(book, sections, questionPages, answers, pages);
  const spot = spotCheck(pages);
  return { book, letter, pages, sections, questionPages, answers, doubts, md, spot };
}

function renderMd(book, sections, questionPages, answers, pages) {
  const out = ['## ' + book.toUpperCase() + ' (' + new Date().toISOString().slice(0, 10) + ', read by planner/tools/cgp-index.js: spot-check before trusting)', ''];
  const chapters = [...new Set(sections.map((s) => s.chapter))].sort((a, b) => a - b);
  for (const c of chapters) {
    const secs = sections.filter((s) => s.chapter === c), name = secs[0].chapterName;
    out.push('**' + (c ? 'Topic ' + c + (name ? ': ' + name : '') : 'Other pages') + '** — ' + secs.map((s) => s.code + ' ' + s.title + ' p' + s.page).join(' · '));
    const qs = questionPages.filter((q) => q.chapter === c);
    if (qs.length) out.push('*Questions:* ' + qs.map((q) => q.title + ', page ' + q.page + (q.answersPage ? ' (answers on page ' + q.answersPage + ')' : '')).join('; '));
    out.push('');
  }
  const ans = pages.filter((p) => p.kind === 'answers' && p.page != null).map((p) => p.page);
  if (ans.length) out.push('*Answers:* pages ' + Math.min(...ans) + ' to ' + Math.max(...ans) + ' (' + Object.keys(answers).length + ' question pages matched to their answers)', '');
  return out.join('\n');
}

function spotCheck(pages) {
  const known = pages.filter((p) => p.page != null && p.title);
  if (!known.length) return [];
  const step = Math.max(1, Math.floor(known.length / 10)), picks = [];
  for (let i = 0; i < known.length && picks.length < 10; i += step) picks.push(known[i]);
  return picks.map((p) => p.file + ': printed page ' + p.page + ', "' + p.title + '" (' + p.kind + (p.questions.length ? ', questions ' + p.questions.map((q) => q.n).join(', ') : '') + '). Open the book at page ' + p.page + ' and confirm.');
}

/* ------------------------------------------------------------------ steps */

function readOcr(folder) {
  const dir = fs.existsSync(path.join(folder, 'ocr')) ? path.join(folder, 'ocr') : folder;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !/^cgp-index/.test(f)).sort();
  if (!files.length) throw new Error('No OCR files in ' + dir + ' (run "ocr <pages folder>" first)');
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

function stepOcr(folder) {
  if (process.platform !== 'win32') throw new Error('The free OCR is the one built into Windows; run this step on the home PC.');
  const r = cp.spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'cgp-ocr.ps1'), '-Folder', folder], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('OCR failed (exit ' + r.status + ')');
}

function stepIndex(folder, opts) {
  const analysed = readOcr(folder).map(analysePage);
  const idx = buildIndex(analysed, opts);
  fs.writeFileSync(path.join(folder, 'cgp-index.md'), idx.md);
  fs.writeFileSync(path.join(folder, 'cgp-index.json'), JSON.stringify({ book: idx.book, letter: idx.letter, made: new Date().toISOString(), sections: idx.sections, questionPages: idx.questionPages, answers: idx.answers, doubts: idx.doubts, pages: idx.pages.map((p) => ({ file: p.file, page: p.page, kind: p.kind, title: p.title, chapter: p.chapter, questions: p.questions.map((q) => q.n) })) }, null, 1));
  fs.writeFileSync(path.join(folder, 'spot-check.txt'), ['Spot check for ' + idx.book + ' (' + idx.sections.length + ' topic pages, ' + idx.questionPages.length + ' question pages, ' + idx.doubts.length + ' doubts)', ''].concat(idx.spot, [''], idx.doubts.length ? ['Doubts:'].concat(idx.doubts) : ['No doubts.']).join('\n'));
  return idx;
}

async function stepCapture(which, opts) {
  const b = BOOKS[which]; if (!b) throw new Error('Which book? physics, chemistry or biology');
  let pw; try { pw = require('playwright'); } catch (e) { throw new Error('Playwright is not installed here. Once, in the project folder: npm install --no-save playwright   (free; the browser itself is already on this PC)'); }
  const out = opts.out || path.join(process.cwd(), 'cgp-pages-' + which);
  fs.mkdirSync(out, { recursive: true });
  const profile = opts.forget ? fs.mkdtempSync(path.join(require('os').tmpdir(), 'cgp-')) : PROFILE;
  const ctx = await pw.chromium.launchPersistentContext(profile, { headless: false, viewport: { width: 1400, height: 1900 }, deviceScaleFactor: 1.5 });
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(b.url);
  console.log('A browser window is open. Log in if it asks, open the book at its FIRST page (the cover), then come back here and press Enter.');
  await new Promise((res) => process.stdin.once('data', res));
  const crypto = require('crypto');
  let last = '', same = 0, n = 0, max = opts.pages || 300;
  while (n < max) {
    const buf = await page.screenshot({ fullPage: false });
    const h = crypto.createHash('sha1').update(buf).digest('hex');
    if (h === last) { same++; if (same >= 2) break; } else { same = 0; n++; fs.writeFileSync(path.join(out, 'page-' + String(n).padStart(4, '0') + '.png'), buf); if (n % 10 === 0) console.log(n + ' pages'); }
    last = h;
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(opts.wait || 1500);
  }
  await ctx.close();
  if (opts.forget) fs.rmSync(profile, { recursive: true, force: true });
  console.log(n + ' page pictures in ' + out + '. Next: node planner/tools/cgp-index.js ocr "' + out + '"');
}

/* ------------------------------------------------------------------ command line */

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; }
    else o._.push(a);
  }
  return o;
}

async function main() {
  const o = args(process.argv.slice(2)), cmd = o._[0];
  try {
    if (cmd === 'capture') await stepCapture(o._[1], { out: o.out, pages: o.pages ? parseInt(o.pages, 10) : 0, forget: !!o.forget, wait: o.wait ? parseInt(o.wait, 10) : 0 });
    else if (cmd === 'ocr') stepOcr(o._[1]);
    else if (cmd === 'index') {
      const guess = Object.values(BOOKS).find((b) => new RegExp(b.letter === 'P' ? 'physics' : b.letter === 'C' ? 'chemistry' : 'biology', 'i').test(o._[1] || ''));
      const idx = stepIndex(o._[1], { book: o.book || (guess && guess.book), letter: o.letter || (guess && guess.letter) || 'X' });
      console.log(idx.sections.length + ' topic pages, ' + idx.questionPages.length + ' question pages, ' + Object.keys(idx.answers).length + ' matched to answers, ' + idx.doubts.length + ' doubts.');
      console.log('Written: cgp-index.md, cgp-index.json and spot-check.txt in ' + o._[1]);
    } else if (cmd === 'check') {
      const idx = buildIndex(readOcr(o._[1]).map(analysePage), {});
      console.log(idx.spot.concat([''], idx.doubts.length ? ['Doubts:'].concat(idx.doubts) : ['No doubts.']).join('\n'));
    } else { console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 18).map((l) => l.slice(3)).join('\n')); }
  } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { analysePage, buildIndex, numberPages, kindOf, readOcr, stepIndex, BOOKS };
if (require.main === module) main();
