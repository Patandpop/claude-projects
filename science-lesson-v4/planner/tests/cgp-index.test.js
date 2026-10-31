// node planner/tests/cgp-index.test.js : the CGP book scanner's reading and indexing (planner/tools/cgp-index.js,
// lanes/design-cgp-scanner.md), run on a made-up 12-page book (planner/tests/cgp-fake-pages.ps1) whose OCR output is
// saved in planner/tests/fixtures/cgp-ocr so the checks run the same on any machine. On Windows the last check also
// draws one real page and reads it with the built-in OCR. Nothing from a real book is used.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const T = require('../tools/cgp-index.js');
const tb = require('../../science-lesson/references/textbook-index.js');
let failed = 0;
const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };

const FIX = path.join(__dirname, 'fixtures', 'cgp-ocr');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cgp-test-'));
fs.mkdirSync(path.join(tmp, 'ocr'));
for (const f of fs.readdirSync(FIX)) fs.copyFileSync(path.join(FIX, f), path.join(tmp, 'ocr', f));

// --- one page at a time
const pages = T.readOcr(tmp).map(T.analysePage);
const byFile = Object.fromEntries(pages.map((p) => [p.file, p]));
ok(pages.length === 11, '11 OCR pages read from the fixture');
ok(byFile['page-0004.png'].title === 'Energy Stores and Systems' && byFile['page-0004.png'].kind === 'topic', 'a topic page: its big title is found and it is a topic');
ok(byFile['page-0004.png'].strip === 'Topic 1: Energy', 'the small topic strip at the top edge is read as the chapter');
ok(byFile['page-0004.png'].printed === 2, 'the printed page number in the corner is read');
ok(byFile['page-0004.png'].questions.map((q) => q.n).join() === '1,2,3', 'Warm-Up questions on a topic page are numbered 1, 2, 3 even when OCR read "QI"');
ok(byFile['page-0004.png'].subheads.includes('Energy is Transferred Between Stores'), 'a smaller heading inside the page is kept as a sub-heading');
ok(byFile['page-0007.png'].kind === 'questions' && byFile['page-0007.png'].questions.some((q) => q.under === 'Exam Questions' && q.n === '1.1'), 'a questions page: exam question 1.1 sits under "Exam Questions"');
ok(byFile['page-0008.png'].kind === 'summary', 'a revision summary page is its own kind');
ok(byFile['page-0011.png'].kind === 'answers' && byFile['page-0011.png'].answersFor.some((a) => a.page === 5 && /exam/i.test(a.what)), 'the answers page says which page it answers (page 5, Exam Questions)');
ok(byFile['page-0003.png'].kind === 'contents' && byFile['page-0012.png'].kind === 'index', 'contents and index pages are not topics');
ok(byFile['page-0002.png'].kind === 'other' && byFile['page-0002.png'].printed === null, 'the cover has no title band and no page number');
ok(T.kindOf('Mixed Exam Practice') === 'questions' && T.kindOf('Physics Equations') === 'reference' && T.kindOf('Specific Heat Capacity') === 'topic', 'page kinds from the title');

// --- the whole book
const idx = T.stepIndex(tmp, { book: 'CGP AQA Combined Science: Physics', letter: 'P' });
ok(idx.sections.map((s) => s.code + ':' + s.page).join(' ') === 'P1.1:2 P1.2:3 P1.3:4 P2.1:7 P2.2:8', 'section codes count up inside each topic and carry the printed page');
ok(idx.sections[2].title === 'Specific Heat Capacity' && idx.sections[2].chapterName === 'Energy', 'a section keeps its title and its topic name');
ok(idx.questionPages.length === 2 && idx.questionPages[0].page === 5 && idx.questionPages[0].answersPage === 9, 'the question page is listed with the page its answers are on');
ok(idx.answers[5] === 9, 'answers map: page 5 is answered on page 9');
ok(idx.doubts.length === 0, 'a clean book raises no doubts');
ok(idx.spot.length === 10 && idx.spot.every((l) => /Open the book at page \d+ and confirm/.test(l)), 'the spot-check list has ten pages for him to confirm');
for (const f of ['cgp-index.md', 'cgp-index.json', 'spot-check.txt']) ok(fs.existsSync(path.join(tmp, f)), f + ' is written beside the pictures');
ok(/\*Questions:\* Warm-Up and Exam Questions, page 5 \(answers on page 9\)/.test(idx.md), 'the md names the question page and its answers page in words (no pNN token the parser could mistake)');

// the md block is in textbook-index.md's own format: the existing parser reads it once the book name is known
const mdPath = path.join(tmp, 'as-known-book.md');
fs.writeFileSync(mdPath, idx.md.replace(/^## .*$/m, '## AQA GCSE PHYSICS — test copy'));
const parsed = tb.loadIndex(mdPath);
ok(parsed.sections.length === 5, 'textbook-index.js reads exactly the 5 topic pages from the block (not the question or answer lines)');
ok(parsed.sections.map((s) => s.code + ' ' + s.title + ' p' + s.page).join(' | ') === 'P1.1 Energy Stores and Systems p2 | P1.2 Kinetic and Potential Energy Stores p3 | P1.3 Specific Heat Capacity p4 | P2.1 Current and Circuit Symbols p7 | P2.2 Resistance and V = IR p8', 'codes, titles and pages survive the existing parser unchanged');
const m = tb.matchLesson({ year: 10, subject: 'Physics', topic: 'Specific Heat Capacity', keywords: ['specific heat capacity'], mdPath });
ok(m && m.pages[0] === 4, 'the existing matcher sends a Specific Heat Capacity lesson to page 4 of the block');

// --- the contents page: entries joined back across OCR's split rows, chapters as a fallback, and a cross-check
const con = byFile['page-0003.png'].contents;
ok(con.some((e) => e.title === 'Specific Heat Capacity' && e.page === 4 && e.chapter === 1 && e.name === 'Energy'), 'a contents entry is read with its page and its topic, across the dotted leader OCR split off');
ok(con.some((e) => e.title === 'Revision Summary for Topic 1' && e.page === 6 && !e.heading), '"Revision Summary for Topic 1" is an entry, not a new topic');
ok(con.filter((e) => e.heading).map((e) => e.chapter + ':' + e.name).join(' ') === '1:Energy 2:Electricity', 'the two topic headings on the contents page');
const noStrip = T.buildIndex(pages.map((p) => Object.assign({}, p, { strip: '' })), { book: 'B', letter: 'P' });
ok(noStrip.pages.find((p) => p.page === 4).chapterName === 'Energy' && noStrip.pages.find((p) => p.page === 8).chapterName === 'Electricity', 'with no topic strip on the pages, topics come from the contents page by page range');
const altered = T.buildIndex(pages.map((p) => (p.file === 'page-0006.png' ? Object.assign({}, p, { title: 'Latent Heat' }) : p)), { book: 'B', letter: 'P' });
ok(altered.doubts.some((d) => /contents says page 4 is "Specific Heat Capacity", but page-0006.png was read as "Latent Heat"/.test(d)), 'a page whose title disagrees with the contents page is a doubt');

// --- page numbers: a misread number is doubted and replaced by counting on
const fake = (file, printed, kind) => ({ file, printed, kind: kind || 'topic', title: 't', strip: '', subheads: [], questions: [], answersFor: [], lineCount: 20 });
const seq = [fake('a', 1), fake('b', 2), fake('c', 50), fake('d', 4), fake('e', null)];
const nums = T.numberPages(seq);
ok(nums.numbers.join() === '1,2,3,4,5' && nums.doubts.length === 1 && /read as 50/.test(nums.doubts[0]), 'a page number read as 50 between 2 and 4 becomes 3 and is listed as a doubt');
const noTitle = T.buildIndex([fake('x', 1), Object.assign(fake('y', 2, 'other'), { title: '' })], { book: 'B', letter: 'Z' });
ok(noTitle.doubts.some((d) => /no title found/.test(d)), 'a page full of text with no title is reported, not silently dropped');

// --- Windows only: draw one real page and read it with the built-in OCR
if (process.platform === 'win32') {
  const draw = path.join(os.tmpdir(), 'cgp-test-draw-' + process.pid);
  const r1 = cp.spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'cgp-fake-pages.ps1'), '-Out', draw], { encoding: 'utf8' });
  for (const f of fs.readdirSync(draw)) if (f !== 'page-0006.png') fs.unlinkSync(path.join(draw, f));   // one page is enough
  const r2 = cp.spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'tools', 'cgp-ocr.ps1'), '-Folder', draw], { encoding: 'utf8' });
  const live = fs.existsSync(path.join(draw, 'ocr', 'page-0006.json')) ? T.analysePage(JSON.parse(fs.readFileSync(path.join(draw, 'ocr', 'page-0006.json'), 'utf8'))) : null;
  ok(r1.status === 0 && r2.status === 0 && live && live.title === 'Specific Heat Capacity' && live.printed === 4, 'live: the Windows OCR reads a freshly drawn page (title and page number right)' + (live ? '' : ' ' + (r2.stderr || r2.stdout || '').trim().slice(0, 200)));
  fs.rmSync(draw, { recursive: true, force: true });
} else console.log('SKIP live Windows OCR check (not Windows)');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? failed + ' FAILED' : 'all passed');
process.exit(failed ? 1 : 0);
