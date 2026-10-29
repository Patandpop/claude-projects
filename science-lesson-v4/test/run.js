#!/usr/bin/env node
'use strict';
/* ============================================================================
   test/run.js — regression harness for the science-lesson renderer.

   Builds every fixture lesson to a throwaway temp dir with NO_UPLOAD set, then
   asserts the output is structurally sound. Catches the class of failure that
   the "frozen" renderer keeps producing in practice: a change lands, a build
   still "succeeds", but something silently broke (missing graph, dropped file,
   a banned term or glyph creeping back into the XML).

   Run:  npm test           (or: node test/run.js)
   Exit: 0 = all green, 1 = at least one hard assertion failed.

   Add a fixture: drop a lesson-content JSON in this project and list its path
   in FIXTURES below. No other wiring needed.
   ============================================================================ */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const cp   = require('child_process');
const AdmZip = require(path.join(__dirname, '..', 'node_modules', 'adm-zip'));

const ROOT     = path.resolve(__dirname, '..');
const BUILD_JS = path.join(ROOT, 'science-lesson', 'references', 'build.js');

// Fixtures: real lesson JSONs kept as regression inputs. Relative to project root.
const FIXTURES = [
  'bug-test.json',            // standard lesson; exercises the graph pipeline (embeds graph PNGs)
  'amylase-test-9ab.json',    // practical lesson; images, equipment, practical worksheet path
  'y7-b1-l1-mrs-gren.json',   // KS3 standard lesson; no-word-bank / basic flow
  'review-answers-test.json', // review lesson; answer sheet (GUESS + indicative frameworks), Bug 56 single-tier
  'flow-native-test.json',    // Bug 54: native flow/cycle shapes (Learn-G/I) + Bug 58 image-description placeholder
  'maths-prose-test.json',    // 2026-10-03: maths shorthand in ordinary text, prose word swaps, MCQ abbreviations
  'triangle-handwriting-test.json', // 2026-10-02: 3- and 4-cell formula triangles, picture handwriting, EOT font embed, curved graph
  'lesson-quality-test.json',  // 2026-10-19 Lesson quality A: {k} gold underline, answer yellow, objectives slide, exam wording, misconception, notes, MCQ CHECK
  'dual-coding-test.json',     // 2026-10-23 Part B: Learn L labelled picture (build one part at a time + all-labels slide)
];

// Strings the RENDERER must never emit (terminology + font-glyph regressions).
// NB: em dash is deliberately NOT here — fixture *titles* legitimately contain
// one, and an author em dash is a content-lint concern, not a renderer bug.
const BANNED_XML = [
  { needle: 'scaffolded',   why: 'old term — must be "support"' },
  { needle: 'EXTEND PAPER', why: 'old term — must be "CHALLENGE PAPER"' },
  { needle: '✎',       why: 'pencil glyph ✎ — forces docx font substitution (Bug: Century Gothic)' },
  { needle: '\\times',  why: 'raw \\times survived — equation operator map broke (Bug 53)' },
  { needle: '\\div',    why: 'raw \\div survived — equation operator map broke (Bug 53)' },
];
// Substrings a worksheet FILENAME must never contain (students see filenames).
const BANNED_FILENAME = ['scaffolded', 'developing', 'reaching', 'mastering'];

/* ------------------------------------------------------------------ helpers */

let hardFails = 0;
let warnings  = 0;
const RED = '\x1b[31m', GRN = '\x1b[32m', YEL = '\x1b[33m', DIM = '\x1b[2m', RST = '\x1b[0m';

function pass(msg) { console.log(`  ${GRN}✓${RST} ${msg}`); }
function fail(msg) { console.log(`  ${RED}✗ FAIL${RST} ${msg}`); hardFails++; }
function warn(msg) { console.log(`  ${YEL}!${RST} ${msg}`); warnings++; }

const slug = (s) => String(s || 'lesson').trim().replace(/[^A-Za-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-') || 'lesson';

// Mirror build.js base-name derivation so we can predict output filenames.
function baseName(meta) {
  const split   = String(meta.differentiation || 'none').toLowerCase() === 'split';
  const ability = meta.abilityLabel ? slug(meta.abilityLabel) : (split ? 'mixed_ability' : '');
  return slug(meta.topic || meta.title) + (ability ? '_' + ability : '');
}

// Read every XML part inside a pptx/docx (they are zip archives) as one string.
function readArchiveXml(file) {
  const zip = new AdmZip(file);
  return zip.getEntries()
    .filter(e => !e.isDirectory && /\.(xml|rels)$/.test(e.entryName))
    .map(e => e.getData().toString('utf8'))
    .join('\n');
}
function mediaCount(file) {
  return new AdmZip(file).getEntries()
    .filter(e => !e.isDirectory && /\/media\/[^/]+$/.test(e.entryName)).length;
}

/* --------------------------------------------------------------------- main */

async function main() {
  if (!fs.existsSync(BUILD_JS)) { console.error('build.js not found at ' + BUILD_JS); process.exit(1); }
  process.env.EXAM_USAGE_NO_BACKUP = '1';   // test writes to exam-usage.json must never become "today's backup" (exam-usage.js)

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-regression-'));
  console.log(`\nRegression harness — output → ${DIM}${tmp}${RST}\n`);

  let totalMedia = 0;

  for (const fixture of FIXTURES) {
    const jsonPath = path.join(ROOT, fixture);
    console.log(`── ${fixture}`);
    if (!fs.existsSync(jsonPath)) { fail(`fixture missing: ${fixture}`); continue; }

    const outDir = path.join(tmp, slug(fixture));
    fs.mkdirSync(outDir, { recursive: true });

    // Sanitise: a fixture's own meta.outputDir takes priority over the CLI arg in
    // build.js and would redirect test output into the project root or the real
    // Drive folder. Strip it so the harness stays hermetic (writes only to tmp).
    let parsed;
    try { parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); }
    catch (e) { fail(`fixture is not valid JSON: ${e.message}`); continue; }
    const lessons = Array.isArray(parsed) ? parsed : [parsed];
    lessons.forEach(L => { if (L && L.meta) delete L.meta.outputDir; });
    // 2026-07-12 review policy: authoring side omits `review`; the builder copies
    // Apply Q&A onto the review slides itself. Strip review from the y7 fixture
    // (every Apply tier question carries an answer) so the auto-copy path is
    // exercised on every run (assertion further down). bug-test keeps its review
    // prose — the ² glyph coverage depends on that prose superscript path.
    if (fixture === 'y7-b1-l1-mrs-gren.json') lessons.forEach(L => { delete L.review; });
    const sanitisedPath = path.join(outDir, '_input.json');
    fs.writeFileSync(sanitisedPath, JSON.stringify(lessons), 'utf8');

    // Build — NO_UPLOAD keeps the Drive uploader out of the test.
    const r = cp.spawnSync(process.execPath, [BUILD_JS, sanitisedPath, outDir], {
      cwd: ROOT, encoding: 'utf8',
      env: Object.assign({}, process.env, { NO_UPLOAD: '1', NO_PAGECOUNT: '1', NO_EXAM_LOG: '1' }),
    });
    const output = (r.stdout || '') + (r.stderr || '');

    if (r.status !== 0) { fail(`build exited ${r.status}`); console.log(DIM + output.trim() + RST); continue; }
    pass('build exited 0');

    // GUESS rules (Patryk 2026-10-03): never on a Year 7/8 worksheet, never more than one
    // per worksheet. The Option-A row writes each letter as "<L>  " inside its own cell, so
    // the "U  " run (U appears once per row) counts the rows.
    for (const f of fs.readdirSync(outDir).filter(n => /_(support_)?worksheet\.docx$/.test(n))) {
      const rows = (readArchiveXml(path.join(outDir, f)).match(/>U  <\/w:t>/g) || []).length;
      const yr = parseInt(((lessons[0] || {}).meta || {}).year, 10);
      if (yr <= 8 && rows) fail(`${f}: GUESS row on a Year ${yr} worksheet (KS3 never gets GUESS)`);
      else if (rows > 1) fail(`${f}: ${rows} GUESS rows — the limit is one per worksheet`);
      else if (fixture === 'bug-test.json' && rows !== 1) fail(`${f}: expected the one requested GUESS row (guess:true, Year 9), found ${rows}`);
      else pass(`${f}: GUESS rule ok (${rows} row${rows === 1 ? '' : 's'})`);
    }

    // Graph pipeline guard — the exact failure class fixed 2026-07-02.
    if (/\[graph_gen\]/.test(output)) fail('graph_gen reported an error (graphs will be missing)');
    else pass('no graph_gen errors');

    // Degraded-output guard (2026-07-12): a build that "succeeded" but shipped a
    // grey placeholder / lost font / dropped textbook ref now says so via
    // "⚠ BUILD WARNING". Fixtures must build with zero of them.
    const bw = output.match(/⚠ BUILD WARNING[^\n]*/g);
    if (bw) { bw.forEach(m => fail(`degraded output: ${m.trim()}`)); }
    else pass('no build warnings (nothing silently degraded)');

    // CONTENT CHECK must print for every lesson (2026-07-09 authoring-rule report).
    if (output.includes('── CONTENT CHECK ·')) pass('CONTENT CHECK report printed');
    else fail('CONTENT CHECK report missing from build output');
    // MCQ-count shortfall is a soft signal (some fixtures deliberately trip it).
    const mcqWarn = output.match(/✗ MCQ count [^\n]*/g);
    if (mcqWarn) mcqWarn.forEach(m => warn(m.trim()));

    // Per-lesson file + content assertions.
    for (const L of lessons) {
      if (!L.meta) { fail('lesson missing meta'); continue; }
      const base     = baseName(L.meta);
      const lessonTypeLower = String(L.meta.lessonType || '').toLowerCase();
      const isReview = lessonTypeLower === 'review' || lessonTypeLower === 'revision';
      const before   = hardFails;

      // Review/revision lessons: PPTX + worksheet + model-answer sheet (no support worksheet).
      // Standard lessons: PPTX + worksheet + support worksheet.
      const expected = [base + '.pptx', base + '_worksheet.docx'];
      expected.push(base + (isReview ? '_answers.docx' : '_support_worksheet.docx'));

      // The dropped file must genuinely be absent (no stray support sheet on a review).
      if (isReview) {
        const stray = path.join(outDir, base + '_support_worksheet.docx');
        if (fs.existsSync(stray)) fail(`review lesson emitted a support worksheet — should be answer sheet only: ${base}`);
      }

      for (const name of expected) {
        const fp = path.join(outDir, name);
        if (!fs.existsSync(fp)) { fail(`missing output: ${name}`); continue; }
        if (fs.statSync(fp).size < 4096) { fail(`suspiciously small (<4KB): ${name}`); continue; }

        // Valid archive + banned-XML scan.
        let xml;
        try { xml = readArchiveXml(fp); }
        catch (e) { fail(`${name} is not a readable pptx/docx: ${e.message}`); continue; }
        const hit = BANNED_XML.find(b => xml.includes(b.needle));
        if (hit) fail(`${name} contains banned "${hit.needle}" — ${hit.why}`);

        // Filename hygiene — students see these names.
        const bad = BANNED_FILENAME.find(w => name.toLowerCase().includes(w));
        if (bad) fail(`output filename leaks tier/scaffold word "${bad}": ${name}`);

        if (name.endsWith('.pptx')) totalMedia += mediaCount(fp);
      }

      if (hardFails === before) pass(`files present & clean: ${base} (${isReview ? 'review: pptx+worksheet+answers' : 'standard: 3'} files)`);
    }

    // Equation overhaul (Bug 53) positive guard: bug-test carries \times \div
    // I^2 {d/t} sqrt() across an equation field and a review prose answer. The
    // typeset symbols must actually appear in the deck (raw-command guard above
    // catches the inverse). × ÷ come from parseEq operator map; the raised 2 from the
    // prose maths pass (a real superscript run); √ from the radical seg.
    if (fixture === 'bug-test.json') {
      const pptx = path.join(outDir, baseName(lessons[0].meta) + '.pptx');
      if (fs.existsSync(pptx)) {
        const xml = readArchiveXml(pptx);
        // Since 2026-10-03 prose powers are real raised runs (baseline="30000"), not the ² glyph.
        const missing = ['×', '÷', '√'].filter(c => !xml.includes(c));
        if (!xml.includes('²') && !/baseline="30000"[^>]*>(?:<[^>]+>)*<a:t>2</.test(xml)) missing.push('² (raised 2)');
        if (missing.length) fail(`bug-test pptx missing typeset symbol(s): ${missing.join(' ')} — equation overhaul (Bug 53) regressed`);
        else pass('equation overhaul: × ÷ ² √ all typeset in bug-test pptx');
        // 2026-07-09: the image bank slide is ALWAYS wanted when the lesson has any
        // images (this deck generates graphs). The old delete-me banner must be gone.
        if (xml.includes('IMAGE BANK')) pass('image bank slide present (always-on)');
        else fail('IMAGE BANK slide missing — image-dump always-on regressed');
        if (xml.includes('DELETE BEFORE SHARING')) fail('old "DELETE BEFORE SHARING" banner still present');
        else pass('delete-me banner gone (bank is kept, not deleted)');
        // Bug 60 (2026-07-10): practiceTriangle answers live ON the slide in navy/gold boxes.
        if (xml.includes('ANSWER') && xml.includes('YOUR TURN')) pass('practiceTriangle on-slide ANSWER boxes present (Bug 60)');
        else fail('practiceTriangle on-slide answers missing — Bug 60 regressed');
        // bigFact (2026-07-11): fact + unit + context all render; no literal
        // "undefined" from an unguarded optional field.
        if (xml.includes('37') && xml.includes('°C') && xml.includes('optimum temperature'))
          pass('bigFact slide: fact + unit + context all present');
        else fail('bigFact slide missing fact/unit/context text');
        if (!xml.includes('undefined')) pass('bigFact slide: no literal "undefined" leaking from optional fields');
        else fail('bigFact slide leaks literal "undefined" — optional unit/context not guarded');
        // reformatFlowchart (2026-07-12): question slide (shuffled, lettered) +
        // answer slide (correct order, native arrows) both present.
        const reformatSteps = ['Blood enters the right atrium', 'Blood passes into the right ventricle', 'Blood is pumped to the lungs', 'Oxygenated blood returns to the left atrium'];
        if (reformatSteps.every((t) => xml.includes(t)))
          pass('reformatFlowchart: all 4 step labels present');
        else fail('reformatFlowchart: one or more step labels missing');
        if (xml.includes('How the heart pumps blood') && xml.includes('How the heart pumps blood: ANSWERS'))
          pass('reformatFlowchart: both question and answer slide headers present');
        else fail('reformatFlowchart: question/answer slide header missing');
        if (xml.includes('shown as'))
          pass('reformatFlowchart: answer slide cross-references the shuffled letters');
        else fail('reformatFlowchart: answer slide missing letter cross-reference');
        // annotatedDiagram (Bug 34, 2026-07-12): key box lists every label,
        // numbered badges render (roundRect/ellipse already asserted elsewhere
        // for native shapes — here just confirm the key text and heading).
        const diagLabels = ['Pencil line', 'Chromatography paper', 'Small glass beaker', 'Splint'];
        if (xml.includes('Chromatography equipment') && diagLabels.every((t) => xml.includes(t)))
          pass('annotatedDiagram: heading + all 4 key-box labels present');
        else fail('annotatedDiagram: heading or key-box labels missing');
        if (xml.includes('KEY')) pass('annotatedDiagram: key box header present');
        else fail('annotatedDiagram: key box header missing');
      }
      // Display-only checks aside, reformatFlowchart's worksheet-side ordering
      // line must appear (blank order for students to fill in).
      const doc = path.join(outDir, baseName(lessons[0].meta) + '_worksheet.docx');
      if (fs.existsSync(doc)) {
        const dxml = readArchiveXml(doc);
        if (dxml.includes('Correct order:')) pass('reformatFlowchart: worksheet ordering line present');
        else fail('reformatFlowchart: worksheet ordering line missing');
      }
    }

    // 2026-10-02 fixes: formula triangles beyond three quantities, picture
    // handwriting, a Caveat embed PowerPoint actually loads, curved graph data.
    if (fixture === 'triangle-handwriting-test.json') {
      const pptx = path.join(outDir, baseName(lessons[0].meta) + '.pptx');
      if (fs.existsSync(pptx)) {
        const zip = new AdmZip(pptx);
        const xml = readArchiveXml(pptx);
        // Two product equations get triangles (3-cell Ep = mgh, 4-cell m = ρlwh);
        // the non-product a = (v - u)/t must NOT, despite carrying symbols.
        const tris = (xml.match(/prstGeom prst="triangle"/g) || []).length;
        if (tris === 2) pass('formula triangles: 3- and 4-cell drawn, non-product equation suppressed');
        else fail(`formula triangles: expected 2 triangle shapes, found ${tris}`);
        if (xml.includes('<a:t>ρ</a:t>')) pass('formula triangle: \\rho label typeset as ρ in its own cell');
        else fail('formula triangle: 4-cell label ρ missing');
        // Picture handwriting: every embedded .png must be a real PNG (the old route
        // shipped SVG text under a .png name) and no SVG may remain.
        const media = zip.getEntries().filter((e) => /^ppt\/media\//.test(e.entryName));
        const fakePng = media.filter((e) => /\.png$/i.test(e.entryName)
          && !e.getData().subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47])));
        if (media.some((e) => /\.svg$/i.test(e.entryName))) fail('handwriting: SVG media still embedded (old raster route)');
        else if (fakePng.length) fail(`handwriting: ${fakePng.length} ".png" media file(s) are not real PNGs`);
        else pass('picture handwriting: real PNG media, no SVG');
        // Caveat embed must be EOT-wrapped: PowerPoint ignores a raw .ttf part.
        const fnt = zip.getEntry('ppt/fonts/font2.fntdata');
        if (fnt && fnt.getData().readUInt16LE(34) === 0x504C) pass('Caveat embedded in EOT form (PowerPoint loads it)');
        else fail('Caveat embed is not EOT-wrapped: PowerPoint will substitute a plain font');
      }
      // graph_gen fit choice on real lesson data: rate curve, latent heat line, P against V curve.
      const py = process.platform === 'win32' ? 'python' : 'python3';
      const probe = [
        'import numpy as np, graph_gen as g',
        'a = lambda r: (np.array([x for x, _ in r], float), np.array([y for _, y in r], float))',
        'print(g.choose_fit(*a([[0,0],[30,22],[60,38],[90,48],[120,54],[150,57],[180,58],[210,58]])),',
        '      g.choose_fit(*a([[0.027,60000],[0.051,120000],[0.079,180000],[0.106,240000],[0.128,300000],[0.157,360000]])),',
        '      g.choose_fit(*a([[0.01,99500],[0.02,49800],[0.03,33200],[0.04,24900],[0.05,19900]])))',
      ].join('\n');
      const gr = cp.spawnSync(py, ['-c', probe], {
        cwd: path.join(ROOT, 'science-lesson', 'references'), encoding: 'utf8',
        env: Object.assign({}, process.env, { PYTHONDONTWRITEBYTECODE: '1' }),   // no __pycache__ in the skill folder
      });
      const got = String(gr.stdout || '').trim();
      if (got === 'curve linear curve') pass('graph_gen: curved data gets a curve, straight-line practical keeps its line');
      else fail(`graph_gen fit choice wrong: expected "curve linear curve", got "${got || (gr.stderr || '').trim()}"`);
    }

    // No worksheet-side output for a bigFact Build item (display-only, per spec).
    if (fixture === 'bug-test.json') {
      const doc = path.join(outDir, baseName(lessons[0].meta) + '_worksheet.docx');
      if (fs.existsSync(doc) && readArchiveXml(doc).includes('37°C'))
        fail('bigFact leaked onto the worksheet — should be display-only');
      else pass('bigFact: no worksheet-side output (display-only, as specced)');
    }

    // Review auto-copy (2026-07-12): this fixture's `review` section was stripped
    // at sanitise time, so tier review slides can only exist if buildReviewSlides
    // copied the Apply Q&A itself. This is what lets the authoring side stop
    // writing the review section out by hand (token saving).
    if (fixture === 'y7-b1-l1-mrs-gren.json') {
      const pptx = path.join(outDir, baseName(lessons[0].meta) + '.pptx');
      if (!fs.existsSync(pptx)) fail('y7 pptx missing');
      else {
        const xml = readArchiveXml(pptx);
        const tiersOnSlides = ['DEVELOPING', 'REACHING', 'MASTERING'].filter(t => xml.includes('Review · ' + t));
        if (tiersOnSlides.length === 3) pass('review slides auto-copied from Apply (authored review omitted)');
        else fail(`review auto-copy regressed — only ${tiersOnSlides.length}/3 tier review slides built from Apply`);
        // The copy must be verbatim: an Apply answer must appear on the review slide.
        if (xml.includes('Sensitivity')) pass('auto-copied review carries the Apply answer text verbatim');
        else fail('auto-copied review slides are missing the Apply answer text');
      }
    }

    // Click animations (Patryk 2026-10-03): navy/gold answer boxes appear on click. Every
    // animation must point at a shape that exists on its slide, never on a Learn slide or a
    // banner (IMAGE BANK / Read more).
    {
      const deck = fs.readdirSync(outDir).find(n => n.endsWith('.pptx'));
      if (deck) {
        const zip = new AdmZip(path.join(outDir, deck));
        let clicks = 0, bad = [];
        for (const e of zip.getEntries().filter(x => /^ppt\/slides\/slide\d+\.xml$/.test(x.entryName))) {
          const x = e.getData().toString('utf8');
          const ids = [...x.matchAll(/<p:spTgt spid="(\d+)"/g)].map(m => m[1]);
          if (!ids.length) continue;
          clicks += (x.match(/nodeType="clickEffect"/g) || []).length;
          if (/<a:t>LEARN [·\-:]/.test(x)) bad.push(`${e.entryName} is a Learn slide`);
          for (const id of ids) {
            const sp = (x.match(new RegExp(`<p:sp><p:nvSpPr><p:cNvPr id="${id}"[\\s\\S]*?</p:sp>`)) || [])[0];
            if (!sp) bad.push(`${e.entryName}: animation targets missing shape ${id}`);
            else if (/IMAGE BANK|Read more/.test(sp)) bad.push(`${e.entryName}: banner animated`);
          }
        }
        if (bad.length) fail('click animations: ' + bad.slice(0, 3).join('; '));
        else if (fixture === 'bug-test.json' && clicks < 5) fail(`click animations: only ${clicks} on the bug-test deck (expected the answer boxes)`);
        else pass(`click animations: ${clicks} answer box${clicks === 1 ? '' : 'es'} appear on click`);
      }
    }

    // Exam question slides (Patryk 2026-10-03): bug-test carries a hand-made L.examQuestion so this
    // runs without the (gitignored) exam library. Two slides after Apply; mark scheme verbatim, one
    // navy/gold box per part with each marking point on its own line.
    if (fixture === 'bug-test.json') {
      const xml = readArchiveXml(path.join(outDir, baseName(lessons[0].meta) + '.pptx'));
      const ok = xml.includes('EXAM QUESTION · AQA · 3 MARKS') && xml.includes('EXAM QUESTION · MARK SCHEME') &&
        xml.includes('collide with the walls more often') && xml.includes('Many said the pressure stays the same.');
      if (ok) pass('exam question + mark scheme slides present, mark scheme verbatim');
      else fail('exam question slides missing or mark scheme text altered');
      // Patryk 2026-10-07: the exam question comes AFTER the Apply answers (the Review slides).
      const zipE = new AdmZip(path.join(outDir, baseName(lessons[0].meta) + '.pptx'));
      const sl = zipE.getEntries().filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
        .sort((a, b) => parseInt(a.entryName.match(/\d+/)[0], 10) - parseInt(b.entryName.match(/\d+/)[0], 10))
        .map(e => e.getData().toString('utf8'));
      const examAt = sl.findIndex(x => x.includes('EXAM QUESTION · AQA'));
      const lastReview = sl.map((x, i) => (/>Review · /.test(x) ? i : -1)).filter(i => i >= 0).pop();
      if (lastReview != null && examAt > lastReview) pass(`exam question (slide ${examAt + 1}) comes after the Apply answers (last Review slide ${lastReview + 1})`);
      else fail(`exam question order wrong: exam=${examAt + 1} lastReview=${lastReview == null ? 'none' : lastReview + 1}`);
    }

    // MCQ block placement (Patryk 2026-10-03): the fixture lists its two experiment MCQs FIRST;
    // the renderer must move them to straight after the practical method slide, and put the
    // four learning MCQs together before every other Build slide.
    if (fixture === 'amylase-test-9ab.json') {
      const pptx = path.join(outDir, baseName(lessons[0].meta) + '.pptx');
      const zip = new AdmZip(pptx);
      const slides = zip.getEntries().filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
        .sort((a, b) => parseInt(a.entryName.match(/\d+/)[0], 10) - parseInt(b.entryName.match(/\d+/)[0], 10))
        .map(e => e.getData().toString('utf8'));
      const at = (needle) => slides.findIndex(x => x.includes(needle));
      const learn = at('correctly describes enzyme denaturation');
      const predict = slides.findIndex(x => /PREDICT/i.test(x));
      const method = at('drops of iodine solution to each well');   // the method slide's first step
      const water = at('kept in a water bath');
      const iodine = at('starch has all been broken down');
      const graph = at('Rate of amylase activity vs Temperature');
      // the practical may have its own Q&A answer slide, so allow up to 2 slides between
      // the method and the first experiment MCQ.
      if (learn >= 0 && predict > learn && water > method && water - method <= 2 &&
          iodine === water + 1 && (graph < 0 || graph > iodine))
        pass(`MCQ block: learning MCQs first (slide ${learn + 1}), experiment MCQs right after the method (slides ${water + 1}-${iodine + 1})`);
      else fail(`MCQ placement wrong: learn=${learn + 1} predict=${predict + 1} method=${method + 1} waterMCQ=${water + 1} iodineMCQ=${iodine + 1} graph=${graph + 1}`);
    }

    // Two experiments (Patryk 2026-10-12): a second practical gets its own section and results
    // table on the worksheet, not just slides.
    if (fixture === 'amylase-test-9ab.json') {
      const two = JSON.parse(JSON.stringify(lessons));
      const p1 = two[0].build.find((b) => (b.type || b.variant) === 'practical');
      p1.heading = 'EXPERIMENT 1: AMYLASE AND TEMPERATURE';
      two[0].build.push(Object.assign({}, p1, { heading: 'EXPERIMENT 2: BOILED AMYLASE', results: { headers: ['Tube', 'Colour after 5 min', 'Starch left?'], rows: 3 } }));
      const dir2 = path.join(tmp, 'two-practicals');
      fs.mkdirSync(dir2, { recursive: true });
      fs.writeFileSync(path.join(dir2, '_input.json'), JSON.stringify(two), 'utf8');
      const r2 = cp.spawnSync(process.execPath, [BUILD_JS, path.join(dir2, '_input.json'), dir2], {
        cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { NO_UPLOAD: '1', NO_PAGECOUNT: '1', NO_EXAM_LOG: '1' }),
      });
      const ws = path.join(dir2, baseName(two[0].meta) + '_worksheet.docx');
      const xml = r2.status === 0 && fs.existsSync(ws) ? readArchiveXml(ws) : '';
      if (xml.includes('EXPERIMENT 1: AMYLASE AND TEMPERATURE') && xml.includes('EXPERIMENT 2: BOILED AMYLASE') && xml.includes('Colour after 5 min'))
        pass('two practicals: both experiments and both results tables on the worksheet');
      else fail('two practicals: second experiment missing from the worksheet (build exit ' + r2.status + ')');
    }

    // Standard opening for the test cycle (Patryk 2026-10-14): a revision lesson runs Do Now →
    // Engage (objectives) → Learn → 3-question check, per concept; a test lesson is just the
    // Title/Do Now ("look over your notes") and Engage, and builds the slides only.
    if (fixture === 'y7-b1-l1-mrs-gren.json') {
      const slidesOf = (pptx) => new AdmZip(pptx).getEntries().filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
        .sort((a, b) => parseInt(a.entryName.match(/\d+/)[0], 10) - parseInt(b.entryName.match(/\d+/)[0], 10))
        .map(e => e.getData().toString('utf8'));
      const env = Object.assign({}, process.env, { NO_UPLOAD: '1', NO_PAGECOUNT: '1', NO_EXAM_LOG: '1', NO_EXAM_PICK: '1' });
      const rev = JSON.parse(JSON.stringify(lessons));
      const L0 = rev[0];
      L0.meta.lessonType = 'revision'; L0.meta.title = 'Cells revision opening';
      L0.engage = { title: 'LEARNING OBJECTIVES', content: 'Recall MRS GREN. Describe a cell. Use a microscope.', imagePlaceholder: false };
      const base = (L0.learn || [])[0] || { variant: 'A', content: 'Life processes' };
      L0.learn = [1, 2, 3, 4].map((n) => Object.assign({}, base, { heading: 'CONCEPTZ' + n, title: 'CONCEPTZ' + n, check: [1, 2, 3].map((k) => ({ q: `Check ${n}.${k} question`, a: `Answer ${n}.${k}` })) }));
      const dir3 = path.join(tmp, 'revision-opening');
      fs.mkdirSync(dir3, { recursive: true });
      fs.writeFileSync(path.join(dir3, '_input.json'), JSON.stringify(rev));
      const r3 = cp.spawnSync(process.execPath, [BUILD_JS, path.join(dir3, '_input.json'), dir3], { cwd: ROOT, encoding: 'utf8', env });
      const p3 = path.join(dir3, baseName(L0.meta) + '.pptx');
      const s3 = r3.status === 0 && fs.existsSync(p3) ? slidesOf(p3) : [];
      const at3 = (needle) => s3.findIndex(x => x.includes(needle));
      const order = [at3('LEARNING OBJECTIVES')].concat([1, 2, 3, 4].flatMap((n) => [at3('CONCEPTZ' + n), at3(`Check ${n}.1 question`)]));
      if (order.every((v, i) => v > 1 && (i === 0 || v > order[i - 1])) && s3.slice(order[order.length - 1]).some((x) => /APPLY/.test(x)))
        pass('revision lesson: Engage (objectives), then Learn → 3-question check ×4, then Apply');
      else fail(`revision lesson order wrong (build exit ${r3.status}): ${order.map((v) => v + 1).join(',')}`);

      const test = JSON.parse(JSON.stringify(lessons));
      const T0 = test[0];
      T0.meta.lessonType = 'test'; T0.meta.title = 'Cells test';
      T0.doNow = { task: ['Look over your notes in your book.'] };
      T0.engage = { title: 'LEARNING OBJECTIVES', content: 'Show what you know about cells.', imagePlaceholder: false };
      const dir4 = path.join(tmp, 'test-deck');
      fs.mkdirSync(dir4, { recursive: true });
      fs.writeFileSync(path.join(dir4, '_input.json'), JSON.stringify(test));
      const r4 = cp.spawnSync(process.execPath, [BUILD_JS, path.join(dir4, '_input.json'), dir4], { cwd: ROOT, encoding: 'utf8', env });
      const b4 = baseName(T0.meta);
      const s4 = r4.status === 0 && fs.existsSync(path.join(dir4, b4 + '.pptx')) ? slidesOf(path.join(dir4, b4 + '.pptx')) : [];
      const docs = fs.readdirSync(dir4).filter((f) => f.endsWith('.docx'));
      if (s4.length === 2 && s4[0].includes('Look over your notes') && s4[1].includes('LEARNING OBJECTIVES') && !docs.length)
        pass('test lesson: 2 slides (Do Now task + objectives), no worksheets');
      else fail(`test lesson deck wrong (build exit ${r4.status}): ${s4.length} slides, ${docs.length} docx`);
    }

    // Textbook reference guard: amylase (Y9 enzymes) must auto-match the index
    // and render "Read more — [book] pp. …" on the Apply slide AND worksheet.
    if (fixture === 'amylase-test-9ab.json') {
      const base = baseName(lessons[0].meta);
      const pptx = path.join(outDir, base + '.pptx'), doc = path.join(outDir, base + '_worksheet.docx');
      const inSlide = fs.existsSync(pptx) && readArchiveXml(pptx).includes('Read more');
      const inSheet = fs.existsSync(doc) && readArchiveXml(doc).includes('Read more');
      if (inSlide && inSheet) pass('textbook reference: Apply slide + worksheet both carry a page ref');
      else fail(`textbook reference missing (slide:${inSlide} worksheet:${inSheet}) — matcher/Apply wiring regressed`);
    }

    // Answer-sheet guard: the review lesson's _answers.docx must be a real model-answer
    // sheet — marking banner, a filled GUESS Solve value, and indicative-content bullets.
    if (fixture === 'review-answers-test.json') {
      const base = baseName(lessons[0].meta);
      const ans = path.join(outDir, base + '_answers.docx');
      if (!fs.existsSync(ans)) { fail('answer sheet missing (_answers.docx not built for review lesson)'); }
      else {
        const xml = readArchiveXml(ans);
        const checks = [
          ['MODEL ANSWERS', 'marking-copy banner'],
          ['0.8', 'filled GUESS solve value'],
          ['INDICATIVE CONTENT', 'indicative-content panel'],
          ['Therefore the rate of reaction increases', 'indicative bullet text'],
          ['EXCLUSIONARY CLAIMS', 'exclusionary-claims block'],
          ['BANDS', 'bands block'],
          // markTheAnswers on the answer sheet: sample label, awarded verdict, an MP hit.
          ['Student A', 'mark-the-answers sample label'],
          ['Awarded', 'mark-the-answers awarded verdict'],
          ['more successful collisions per second', 'mark-the-answers MP-hit text'],
        ];
        const miss = checks.filter(([needle]) => !xml.includes(needle));
        if (miss.length) fail(`answer sheet missing: ${miss.map(m => m[1]).join(', ')}`);
        else pass('answer sheet: banner + filled GUESS + indicative + bands + exclusionary + mark-the-answers all present');
        // cm^3 must typeset: either the ³ glyph (prose path) or a run-level superscript (parseEq path).
        if (!xml.includes('³') && !xml.includes('superscript')) warn('answer sheet: no superscript found (cm^3 may not have typeset)');
        // Answer sheet is Apply/Build answers only — Do Now answers must NOT print (2026-07-05).
        if (xml.includes('DO NOW')) fail('answer sheet still carries a DO NOW section — should be Apply/Build only');
      }
      // review extras (2026-10-10): EBI follow-up tasks + Extension on the booklet; the Extension
      // answers on the answer sheet; the slides after the review answers.
      const wsx = path.join(outDir, base + '_worksheet.docx');
      if (fs.existsSync(wsx) && fs.existsSync(ans)) {
        const w = readArchiveXml(wsx), a2 = readArchiveXml(ans);
        const need = [[w.includes('3 EBIs') && w.includes('Redo the rate calculation'), 'booklet EBI follow-up table'],
          [w.includes('EXTENSION') && w.includes('powdered marble') && !w.includes('larger surface area so there are more frequent'), 'booklet extension questions without answers'],
          [a2.includes('larger surface area so there are more frequent'), 'answer sheet extension answers'],
          [a2.includes('cm³/s (or g/s)') || a2.includes('(or g/s)'), 'answer sheet answer-list answers']];
        const bad = need.filter((n) => !n[0]);
        if (bad.length) fail('review extras missing: ' + bad.map((n) => n[1]).join(', ')); else pass('review extras: EBI table + extension on the booklet, answers on the answer sheet');
      }

      // markTheAnswers slide: the review PPTX must carry the task header + a sample label.
      const pptx = path.join(outDir, base + '.pptx');
      if (fs.existsSync(pptx)) {
        const pxml = readArchiveXml(pptx);
        const slideMiss = ['MARK THE ANSWERS', 'Student A'].filter(t => !pxml.includes(t));
        if (slideMiss.length) fail(`mark-the-answers slide missing: ${slideMiss.join(', ')}`);
        else pass('mark-the-answers slide: task header + sample label present in review pptx');
        const extMiss = ['Support pages', 'CORRECT 3 EBIs', 'EXTENSION', 'E1', 'QUICK ANSWERS'].filter((t) => !pxml.includes(t));
        // "(cm^3)" raises the 3 only, never the closing bracket (2026-10-10)
        if (/<a:t>3\)<\/a:t>/.test(pxml) || /³⁾/.test(pxml)) fail('"(cm^3)": the closing bracket was raised with the power');
        else pass('"(cm^3)": only the 3 is raised');
        if (extMiss.length) fail(`review pptx missing: ${extMiss.join(', ')}`);
        else pass('review pptx: Support pages heading, EBI corrections, Extension + answers, quick answers');

        // 2026-10-12 redesign: question picture from the paper, mark highlights, MCQ letter,
        // no purple-pen bar on whole-paper review slides, mark tags never leak as text.
        const slides = new AdmZip(pptx).getEntries().filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName)).map((e) => e.getData().toString('utf8'));
        const maSlide = slides.find((x) => x.includes('3(a)(iii)') && x.includes('MODEL ANSWER'));
        if (maSlide && maSlide.includes('<p:pic>')) pass('model answer slide: question picture from the paper embedded');
        else fail('model answer slide: question picture (snippet) not embedded');
        if (maSlide && maSlide.includes('FFF176') && />1<\/a:t>/.test(maSlide)) pass('model answer slide: mark 1 highlighted + numbered');
        else fail('model answer slide: mark highlight / numbered circle missing');
        if (maSlide && maSlide.includes('Challenge paper Question') && maSlide.includes('not on the Core paper')) pass('two-paper test: slide says in plain words which paper the question is on');
        else fail('two-paper test: "Challenge paper Question ... (not on the Core paper)" label missing on the model answer slide');
        // 2026-10-15: support pages say "p. 142", never a spread code like "C6.2 p.142"
        if (!slides.some((x) => /[BCP]\d+\.\d+ p\./.test(x)) && slides.some((x) => x.includes('p. 142')) && slides.some((x) => x.includes('pp. 142–143'))) pass('support pages show page numbers only (no C6.2-style codes)');
        else fail('support pages still show spread codes like "C6.2 p.142" (or the page numbers went missing)');
        // 2026-10-15: six highlight colours, neighbours never alike; bigger plain-words question bar
        const hiSrc = fs.readFileSync(path.join(ROOT, 'science-lesson', 'references', 'builder', '04-handwriting.js'), 'utf8').match(/const MARK_HI = \[([^\]]+)\]/);
        const hi = hiSrc ? hiSrc[1].match(/[0-9A-F]{6}/g) : [];
        if (hi.length === 6 && new Set(hi).size === 6) pass('six different mark highlight colours');
        else fail(`mark highlight colours: expected 6 different, found ${hi.length}`);
        if (maSlide && /MODEL ANSWER/.test(maSlide) && /sz="1700"/.test(maSlide)) pass('model answer question bar is the bigger 17pt one');
        else fail('model answer question bar is not 17pt');
        if (slides.some((x) => x.includes('CORE PAPER') && x.includes('CHALLENGE PAPER') && x.includes('CORRECT 3 EBIs'))) pass('EBI slide: one table per paper');
        else fail('EBI slide: Core / Extend tables missing');
        if (slides.some((x) => x.includes('QUICK ANSWERS') && x.includes('Purple pen time'))) fail('review quick answers still carry the purple-pen bar');
        else pass('review quick answers: no purple-pen bar');
        if (slides.some((x) => x.includes('<a:t>C   the steepest line</a:t>'))) pass('MCQ quick answer states the letter');
        else fail('MCQ quick answer: letter + option text not found');
        const marksSlide = slides.find((x) => x.includes('MARKS AWARDED'));
        if (marksSlide && marksSlide.includes('3/6') && marksSlide.includes('Marks for')) pass('mark-the-answers marks slide: score + earned points');
        else fail('mark-the-answers marks slide: score / "Marks for" missing');
      }
      const leak = [pptx, path.join(outDir, base + '_worksheet.docx'), ans].filter((f) => fs.existsSync(f) && /(?<![\^_])\{\/?(\d|x)\}/.test(readArchiveXml(f)));
      if (leak.length) fail('mark tags {1}…{/1} leaked into ' + leak.map((f) => path.basename(f)).join(', '));
      else pass('mark tags stripped from every file');
    }

    // Bug 54 guard: flow/cycle Learn slides must be NATIVE PPTX shapes, not a
    // flattened SVG image. Bug 58 guard: image slides must carry the authored
    // imageDescription (never the generic "add imageDescription" placeholder).
    // Scoped to this fixture because it authors a description on every image
    // slot; legacy fixtures still carry description-less placeholders by design.
    // 2026-10-03: maths shorthand (^ _ {a/b} \cmd) typesets in EVERY text field, word
    // swaps only happen next to numbers, and MCQ abbreviations survive. Text is read per
    // paragraph with runs joined, so a raised "2" reads as "v2" and a raw one as "v^2".
    if (fixture === 'maths-prose-test.json') {
      const base = baseName(lessons[0].meta);
      const paras = (file) => {
        const z = new AdmZip(file);
        return z.getEntries().filter(e => /(slides\/slide\d+|word\/document)\.xml$/.test(e.entryName))
          .flatMap(e => e.getData().toString('utf8').split(/<\/a:p>|<\/w:p>/)
            .map(p => (p.match(/<(?:a|w):t[^>]*>[^<]*</g) || []).map(t => t.replace(/^<[^>]+>/, '').slice(0, -1)).join('')))
          .join('\n');
      };
      const pptx = path.join(outDir, base + '.pptx'), wsx = path.join(outDir, base + '_worksheet.docx');
      if (!fs.existsSync(pptx) || !fs.existsSync(wsx)) { fail('maths-prose outputs missing'); }
      else {
        const slides = paras(pptx), sheet = paras(wsx), xml = readArchiveXml(pptx);
        const raw = ['^2', '_2O', 'CO_2', '{1/2}', '10^3', '\rho', 'kg/m^3', 'kg⁄m^3'].filter(n => slides.includes(n) || sheet.includes(n));
        if (!raw.length) pass('no raw maths shorthand left on slides or worksheet');
        else fail('raw maths shorthand survived: ' + raw.join(' '));
        if (/baseline="30000"/.test(xml) && /baseline="-\d+"/.test(xml)) pass('slide text uses real raised and lowered runs (v², H₂O)');
        else fail('no superscript/subscript runs on the slides — prose maths not typeset');
        if (slides.includes('1⁄2 of the mass')) pass('{1/2} in prose becomes a diagonal 1⁄2');
        else fail('{1/2} in a Learn box did not become 1⁄2');
        if (slides.includes('kg⁄m³') || slides.includes('kg⁄m3')) pass('GUESS row units: kg/m^3 → kg⁄m³ (3 raised)');
        else fail('GUESS row kg/m^3 not typeset (power inside the fraction)');
        const keep = ['three times', 'A few seconds later the metre stick fell', 'Divide the class', 'A.C. current', 'd.c. supply', 'clip_2'];
        const lost = keep.filter(k => !slides.includes(k));
        if (!lost.length) pass('ordinary words, MCQ abbreviations and links are left alone');
        else fail('text was wrongly changed: ' + lost.join(' | '));
        // Word swaps belong to question/answer text (prettyText), not to every text box.
        if (sheet.includes('100 m in 12 s') && sheet.includes('V = I × R')) pass('word swaps still apply next to numbers/operands (Apply question)');
        else fail('"100 metres in 12 seconds" / "I times R" no longer converted in the Apply question');
      }
    }
    if (fixture === 'lesson-quality-test.json') {
      const pptx = fs.readdirSync(outDir).find(n => n.endsWith('.pptx'));
      const z = new AdmZip(path.join(outDir, pptx));
      const slides = z.getEntries().filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
        .map(e => ({ n: +e.entryName.match(/(\d+)\.xml$/)[1], x: e.getData().toString('utf8') })).sort((a, b) => a.n - b.n);
      const all = slides.map(s => s.x).join('');
      const s3 = (slides.find(s => s.n === 3) || {}).x || '';
      if (/LEARNING OBJECTIVES/.test(s3) && /WORDS YOU KNOW/.test(s3) && /WORDS FOR THIS LESSON/.test(s3)) pass('objectives slide straight after the Do Now answers (known words + lesson words)');
      else fail('slide 3 is not the new objectives slide with WORDS YOU KNOW / WORDS FOR THIS LESSON');
      // "This lesson" (2026-10-23): Learn, Build, Apply; written lines used, a missing one filled in
      if (/THIS LESSON/.test(s3) && />LEARN</.test(s3) && />BUILD</.test(s3) && />APPLY</.test(s3) && /compare elements and compounds/.test(s3) && /Carousel: collect information/.test(s3) && /on the worksheet questions/.test(s3))
        pass('objectives slide: "This lesson" Learn / Build / Apply, written lines kept, Apply filled in');
      else fail('objectives slide: "This lesson" strip missing or wrong');
      if (/>poly</.test(all) && />mer</.test(all) && /a chain of many parts/.test(all)) pass('word parts on the Learn slide: poly + mer → a chain of many parts');
      else fail('word parts (definition.parts) not shown on the Learn slide');
      if (/<a:uFill><a:solidFill><a:srgbClr val="F9A825"\/><\/a:solidFill><\/a:uFill><a:latin/.test(all)) pass('key words have a gold underline (uFill before latin)');
      else fail('no gold underline on {k} key words');
      if (/\{k\}|\{\/k\}|en-001/.test(all)) fail('raw {k} tag or en-001 marker left in the slides'); else pass('no raw {k} tags in the slides');
      for (const f of fs.readdirSync(outDir).filter(n => n.endsWith('.docx'))) {
        if (/\{k\}|\{\/k\}/.test(readArchiveXml(path.join(outDir, f)))) fail(`${f}: raw {k} tag on the worksheet`); else pass(`${f}: no raw {k} tags`);
      }
      const ans = slides.filter(s => /<a:srgbClr val="FFD60A"/.test(s.x));
      if (ans.length && ans.every(s => !/<p:sp>(?:(?!<\/p:sp>)[\s\S])*<a:solidFill><a:srgbClr val="0D1B5E"\/>(?:(?!<\/p:sp>)[\s\S])*<a:srgbClr val="FABB2E"\/>(?:(?!<\/p:sp>)[\s\S])*<\/p:sp>/.test('') )) pass(`answer boxes use the new yellow (${ans.length} slides)`);
      else fail('no answer box uses the new yellow FFD60A');
      if (ans.some(s => /<p:timing/.test(s.x))) pass('yellow answer boxes still appear on click'); else fail('yellow answer boxes lost their click animation');
      if (/LEARN THIS WORDING/.test(all) && /AQA: asked 7 times/.test(all)) pass('exam definition box with "asked 7 times"'); else fail('exam definition box missing');
      if (/Not quite/.test(all) && /Actually/.test(all) && /strike="sngStrike"/.test(all)) pass('misconception box (Not quite, crossed out → Actually)'); else fail('misconception box missing');
      const notes = z.getEntries().filter(e => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(e.entryName)).map(e => e.getData().toString('utf8')).join('');
      if (/atomos/.test(notes) && /plain version here/.test(notes)) pass('Learn notes reach the speaker notes'); else fail('Learn notes missing from the speaker notes');
      if (/MCQ CHECK · question 6: [^\n]*no "why" for wrong option D/.test(output) && !/MCQ CHECK · question [1-5]:/.test(output)) pass('MCQ CHECK flags only the weak question (no "why" for D)');
      else fail('MCQ CHECK did not flag exactly the weak question 6');
      // Support sheet v2 (2026-10-23): one checked help per Apply question, support sheet only
      const sup = readArchiveXml(path.join(outDir, fs.readdirSync(outDir).find(n => /_support_worksheet\.docx$/.test(n))));
      const std = readArchiveXml(path.join(outDir, fs.readdirSync(outDir).find(n => /_worksheet\.docx$/.test(n) && !/_support_/.test(n))));
      const both = (re, what) => { if (re.test(sup) && !re.test(std)) pass(`support sheet only: ${what}`); else fail(`${what}: ${re.test(sup) ? 'also on the standard sheet' : 'missing from the support sheet'}`); };
      both(/why it cannot separate iron from iron sulfide/, 'plain rewrite printed');
      if (/<w:b\/>[\s\S]{0,200}?>explain<\/w:t>/.test(sup)) pass('rewrite: the second command word is bold'); else fail('rewrite: command word not bold');
      if (!/Write the symbols\./.test(sup) && /Give the symbols for iron, sodium and lead/.test(sup)) pass('a failing rewrite falls back to the original question');
      else fail('a failing rewrite was printed (or the original went missing)');
      if (/Apply developing Q2: support supportQ not printed/.test(output)) pass('CONTENT CHECK names the failing rewrite'); else fail('failing rewrite not reported in the CONTENT CHECK');
      both(/Step 1[\s\S]*First, hold a magnet over[\s\S]*Step 3[\s\S]*Finally, heat it and/, 'chunked Step 1-3 on the 4-mark question');
      both(/Compounds have[\s\S]*FeS has[\s\S]*A different ratio is/, 'linked starters on the 3-mark question');
      both(/What is each particle in Co made of/, 'guiding question');
      both(/>Advantage<[\s\S]*>Disadvantage<[\s\S]*Using a magnet/, 'weigh-up table');
      both(/>Element<\/w:t>[\s\S]{0,3000}?>Compound<\/w:t>[\s\S]*Types of atom/, 'compare table');
      both(/KEYS/, 'KEYS box');
      if (/Element: <\/w:t>[\s\S]{0,300}one type of atom/.test(sup) && !/polymer: /.test(sup)) pass('KEYS holds only words the Apply questions use');
      else fail('KEYS words wrong (missing Element, or holds a word no Apply question uses)');
      if (/\[support\] developing Q4: compare · reaching Q2: prompt · reaching Q4: weighUp · mastering Q1: supportQ · mastering Q2: steps · mastering Q4: steps/.test(output)) pass('build prints which help each question got');
      else fail('build did not print the support help list');
      const rev = slides.map(s => s.x).find(x => /First, hold a magnet over the mixture/.test(x)) || '';
      if (/the iron is pulled out\.<\/a:t>[\s\S]{0,400}?(<a:br\/>|<\/a:p>)[\s\S]{0,400}?Next, add water/.test(rev)) pass('review slide: stepped answer one sentence per line');
      else fail('review slide: stepped answer not split one sentence per line');
      const wb = (sup.match(/Word bank: [\s\S]*?<\/w:p>/) || [''])[0].match(/<w:t[^>]*>([^<·]+)<\/w:t>/g) || [];
      const words = wb.map(t => t.replace(/<[^>]+>/g, '').trim()).filter(t => t && t !== 'Word bank:');
      if (words.length > 2 && words.join('|') === [...words].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).join('|')) pass(`word bank printed in alphabetical order, not answer order (${words.length} words)`);
      else fail(`word bank not alphabetical: ${words.join(', ')}`);
    }

    if (fixture === 'amylase-test-9ab.json') {
      for (const f of fs.readdirSync(outDir).filter(n => /_worksheet\.docx$/.test(n))) {
        if (/Investigate the effect of temperature on the rate/.test(readArchiveXml(path.join(outDir, f)))) fail(`${f}: practical intro still repeats the title`);
        else pass(`${f}: practical intro that only repeats the title is left off`);
      }
    }

    if (fixture === 'dual-coding-test.json') {
      const pptx = fs.readdirSync(outDir).find(n => n.endsWith('.pptx'));
      const z = new AdmZip(path.join(outDir, pptx));
      const slides = z.getEntries().filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
        .map(e => ({ n: +e.entryName.match(/(\d+)\.xml$/)[1], x: e.getData().toString('utf8') })).sort((a, b) => a.n - b.n);
      const obj = slides.find(s => /LEARNING OBJECTIVES/.test(s.x)) || { x: '' };
      if (/THIS LESSON/.test(obj.x) && /Note down the key terms: the animal cell/.test(obj.x) && /Quick questions to check you(&apos;|')ve got it/.test(obj.x)) pass('"This lesson" with nothing written: filled in from the Learn headings and the quiz questions');
      else fail('"This lesson" fallback lines missing');
      const cell = slides.filter(s => /LEARN · THE ANIMAL CELL/.test(s.x)), copy = slides.filter(s => /LEARN · COPY THE CELL/.test(s.x));
      if (cell.length === 4 && copy.length === 1) pass('Learn L: 3 labels built one at a time + the all-labels slide; build:false = one slide');
      else fail(`Learn L slide count: ${cell.length} build + ${copy.length} plain (want 4 + 1)`);
      if (cell[0] && /FFD60A/.test(cell[0].x) && /9E9E9E/.test(cell[0].x) && !/FFD60A/.test(cell[3].x)) pass('Learn L: current part ringed in yellow, others grey; last slide plain');
      else fail('Learn L: yellow ring / grey labels not as designed');
      // every line ends exactly on its point: the point = picture box + label fraction (EMU, 914400 a inch)
      const lessonJson = JSON.parse(fs.readFileSync(path.join(ROOT, fixture), 'utf8'));
      const labels = (Array.isArray(lessonJson) ? lessonJson[0] : lessonJson).learn[0].labels;
      const ends = (x) => [...x.matchAll(/<p:sp>((?:(?!<\/p:sp>)[\s\S])*?prst="line"(?:(?!<\/p:sp>)[\s\S])*?)<\/p:sp>/g)].map(m => {
        const t = m[1], fx = /flipH="1"/.test(t), fy = /flipV="1"/.test(t);
        const [, ox, oy] = t.match(/<a:off x="(-?\d+)" y="(-?\d+)"/), [, cx, cy] = t.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
        const a = { x: +ox + (fx ? +cx : 0), y: +oy + (fy ? +cy : 0) }, b = { x: +ox + (fx ? 0 : +cx), y: +oy + (fy ? 0 : +cy) };
        return [a, b];
      }).flat();
      let worst = 0;
      for (const s of cell) {
        const p = s.x.match(/<p:pic>(?:(?!<\/p:pic>)[\s\S])*?<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"/);
        if (!p) { worst = Infinity; break; }
        const e = ends(s.x);
        for (const l of labels) {
          const pt = { x: +p[1] + l.x * +p[3], y: +p[2] + l.y * +p[4] };
          worst = Math.max(worst, Math.min(...e.map(q => Math.hypot(q.x - pt.x, q.y - pt.y))));
        }
      }
      if (worst < 9144) pass(`Learn L: every line ends on its point (worst ${(worst / 914400).toFixed(3)} in)`);
      else fail(`Learn L: a line misses its point by ${(worst / 914400).toFixed(3)} in`);
      if (z.getEntries().some(e => /^ppt\/media\/.+\.png$/.test(e.entryName))) pass('Learn L: the picture is embedded'); else fail('Learn L: picture not embedded');
      // labels never overlap: 7 labels crowded on one side, every one open in turn
      const lp = require(path.join(ROOT, 'science-lesson', 'references', 'learn-pictures.js'));
      const many = Array.from({ length: 7 }, (_, i) => ({ x: 0.2, y: 0.4 + i * 0.02 }));
      const area = { x: 0.45, y: 1.2, w: 12.43, h: 5.8 }, box = { x: 3.5, y: 1.3, w: 6, h: 5.5 };
      let clash = '';
      for (let open = -1; open < many.length; open++) {
        const r = lp.layout(many, box, area, open).map(o => o.rect).sort((a, b) => a.y - b.y);
        r.forEach((q, i) => { if (i && q.y < r[i - 1].y + r[i - 1].h - 1e-6) clash = 'overlap with label ' + open + ' open'; if (q.y < area.y - 1e-6 || q.y + q.h > area.y + area.h + 1e-6) clash = 'outside the slide'; });
      }
      if (!clash) pass('Learn L: 7 crowded labels never overlap and stay on the slide'); else fail('Learn L labels: ' + clash);
      // photo + model (D8): shared labels in the middle, a line to the part in EACH picture
      const pairSl = slides.filter(s => /LEARN · PHOTO AND MODEL/.test(s.x));
      const pairItem = (Array.isArray(lessonJson) ? lessonJson[0] : lessonJson).learn.find(x => x.pair);
      if (pairSl.length === pairItem.labels.length + 1) pass(`Learn L pair: ${pairItem.labels.length} parts built one at a time + the all-labels slide`);
      else fail(`Learn L pair: ${pairSl.length} slides (want ${pairItem.labels.length + 1})`);
      let pw = 0, nLines = 0;
      for (const s of pairSl) {
        const pics = [...s.x.matchAll(/<p:pic>(?:(?!<\/p:pic>)[\s\S])*?<a:off x="(\d+)" y="(\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"/g)].map(m => m.slice(1).map(Number)).sort((a, b) => a[0] - b[0]);
        if (pics.length !== 2) { pw = Infinity; break; }
        const e = ends(s.x); nLines = Math.max(nLines, e.length / 2);
        for (const l of pairItem.labels) for (const [k, side] of [[0, 'left'], [1, 'right']]) {
          if (!l[side]) continue;
          const [px, py, cx, cy] = pics[k], pt = { x: px + l[side].x * cx, y: py + l[side].y * cy };
          pw = Math.max(pw, Math.min(...e.map(q => Math.hypot(q.x - pt.x, q.y - pt.y))));
        }
      }
      if (pw < 9144 && nLines === 5) pass(`Learn L pair: every line ends on its part in both pictures, one line for a photo-only label (worst ${(pw / 914400).toFixed(3)} in)`);
      else fail(`Learn L pair: lines miss by ${(pw / 914400).toFixed(3)} in, or ${nLines} lines (want 5)`);
      if (/Microscope photo x400/.test(pairSl[0] ? pairSl[0].x : '') && /Model diagram/.test(pairSl[0] ? pairSl[0].x : '')) pass('Learn L pair: captions under both pictures'); else fail('Learn L pair: captions missing');
      // drawn diagrams (diagram_gen.py): every template draws and reports its parts inside the picture
      const dg = path.join(ROOT, 'science-lesson', 'references', 'diagram_gen.py'), tmpD = fs.mkdtempSync(path.join(require('os').tmpdir(), 'dg-'));
      const runs = [['particles', '--kind', 'element'], ['particles', '--kind', 'molecules'], ['particles', '--kind', 'compound'], ['particles', '--kind', 'mixture'],
        ['atom', '--model', 'dalton'], ['atom', '--model', 'thomson'], ['atom', '--model', 'rutherford'], ['atom', '--model', 'bohr'], ['atom', '--model', 'chadwick']];
      const bad = [];
      for (const r of runs) {
        try {
          const o = JSON.parse(require('child_process').execFileSync('python', [dg, ...r, '--out', path.join(tmpD, r[2] + '.png')], { encoding: 'utf8' }));
          if (!fs.existsSync(o.file) || !o.points.length || o.points.some(([, x, y]) => !(x > 0 && x < 1 && y > 0 && y < 1))) bad.push(r[2]);
        } catch (e) { bad.push(r[2] + ' (' + String(e.message).split('\n')[0] + ')'); }
      }
      fs.rmSync(tmpD, { recursive: true, force: true });
      if (!bad.length) pass('diagram_gen.py: all 9 templates draw, each with its labelled parts'); else fail('diagram_gen.py: ' + bad.join(', '));
    }

    if (fixture === 'flow-native-test.json') {
      const pptx = path.join(outDir, baseName(lessons[0].meta) + '.pptx');
      if (!fs.existsSync(pptx)) { fail('flow-native pptx missing'); }
      else {
        const xml = readArchiveXml(pptx);
        // Native evidence: roundRect step boxes + custom-geometry arrow freeforms.
        if (xml.includes('roundRect')) pass('flow slides use native roundRect step boxes');
        else fail('flow slides missing native roundRect — Learn-G/I did not render as shapes');
        if (xml.includes('custGeom')) pass('flow arrows are native custom-geometry freeforms');
        else fail('flow arrows missing custGeom — curved arrows did not render natively');
        // The flattening is gone: no SVG media part embedded by the flow path.
        if (mediaCount(pptx) === 0 && !xml.includes('.svg')) pass('no flattened SVG image embedded (Bug 54 fixed)');
        else fail('flow deck still embeds an image/SVG — the flatten path is not fully removed');
        // Truncation is gone: a full long step-note (>52 chars, old cap was 2×26) survives verbatim.
        const longNote = 'Cholesterol and other fatty substances build up slowly';
        if (xml.includes(longNote)) pass('full step-note text present (note truncation removed)');
        else fail('long step-note was clipped — flowStepBox is truncating notes');
        // Bug 58: the generic placeholder must NOT appear (H + J author descriptions).
        if (xml.includes('add imageDescription to JSON')) fail('generic image placeholder present — Bug 58 regressed (H/J dropped imageDescription)');
        else pass('image slides carry authored descriptions (no generic placeholder)');
        // Bug 33/53 phase 3: the Learn-F {d/t} renders as a NATIVE stacked fraction
        // (named num/bar/den shapes), and therefore no diagonal ⁄ fallback in this deck.
        if (xml.includes('eqFracNum') && xml.includes('eqFracBar') && xml.includes('eqFracDen'))
          pass('stacked fraction shapes present (eqFracNum/Bar/Den)');
        else fail('Learn-F fraction did not render as native stacked shapes — phase 3 regressed');
        if (!xml.includes('⁄')) pass('no diagonal ⁄ fallback in the fraction deck');
        else fail('diagonal ⁄ present — the stacked path fell back unexpectedly');
      }
    }
  }

  // Global graph-fix guard: across all fixtures at least one image must embed.
  // If this drops to zero, the graph/image pipeline has silently broken again.
  console.log('── pipeline');
  if (totalMedia > 0) pass(`${totalMedia} image(s) embedded across all decks`);
  else fail('zero images embedded anywhere — graph/image pipeline is broken');

  // Blocking CONTENT CHECK (2026-07-12): a teaching lesson with no Apply questions
  // is a broken deliverable and must refuse to build — but --force must override
  // it (the checker could be wrong, minutes before a lesson). Thin lessons (a light
  // tier, 5 Do Nows) must still build. Build a tiny synthetic lesson to prove all three.
  console.log('\n── content-check blocking policy');
  {
    const emptyApply = {
      meta: { class: '9AB', topic: 'Blocker Probe', title: 'Blocker Probe', lessonType: 'standard' },
      title: { objectives: ['x'], keywords: ['x'] },
      doNow: { questions: Array.from({ length: 6 }, (_, i) => ({ q: 'Q' + i, a: 'A' })) },
      learn: [{ variant: 'A', imagePlaceholder: false }],
      build: [], apply: { developing: [], reaching: [], mastering: [] },
    };
    const probeDir = path.join(tmp, 'blocker-probe');
    fs.mkdirSync(probeDir, { recursive: true });
    const probePath = path.join(probeDir, '_input.json');
    fs.writeFileSync(probePath, JSON.stringify([emptyApply]), 'utf8');
    const env = Object.assign({}, process.env, { NO_UPLOAD: '1' });

    const blocked = cp.spawnSync(process.execPath, [BUILD_JS, probePath, probeDir], { cwd: ROOT, encoding: 'utf8', env });
    const blockedOut = (blocked.stdout || '') + (blocked.stderr || '');
    if (/refusing to build/i.test(blockedOut) && !fs.existsSync(path.join(probeDir, 'Blocker-Probe.pptx')))
      pass('no-Apply lesson refuses to build (blocking check fires, no files written)');
    else fail('no-Apply lesson built anyway — the blocking Apply check did not fire');

    const forced = cp.spawnSync(process.execPath, [BUILD_JS, probePath, probeDir, '--force'], { cwd: ROOT, encoding: 'utf8', env });
    const forcedOut = (forced.stdout || '') + (forced.stderr || '');
    if (/FORCED BUILD/i.test(forcedOut) && fs.existsSync(path.join(probeDir, 'Blocker-Probe.pptx')))
      pass('--force overrides the blocking check and builds anyway (loudly)');
    else fail('--force did not override the blocking check — the escape hatch is broken');
  }

  // Unit coverage the NO_UPLOAD build path can't reach (lesson-log writer).
  console.log('');
  const logTest = require(path.join(__dirname, 'lesson-log.test.js')).run();
  hardFails += logTest.fails;
  warnings  += logTest.warns;

  // Textbook matcher (pure lib — book/page references + ordering).
  console.log('');
  const tbTest = require(path.join(__dirname, 'textbook-index.test.js')).run();
  hardFails += tbTest.fails;
  warnings  += tbTest.warns;

  // Supporting scripts (daily-brief / order-sheet / uploader integration).
  console.log('');
  const ssTest = require(path.join(__dirname, 'suite-scripts.test.js')).run();
  hardFails += ssTest.fails;
  warnings  += ssTest.warns;

  // Exam-doc library parser (pure lib — question/part index + mark-scheme join).
  console.log('');
  const elTest = require(path.join(__dirname, 'exam-library.test.js')).run();
  hardFails += elTest.fails;
  warnings  += elTest.warns;

  // Do Now bank (spaced-retrieval selector + exam sourcing) — simulated, since
  // the bank can't run on real classes until September.
  console.log('');
  const dnTest = require(path.join(__dirname, 'do-now-bank.test.js')).run();
  hardFails += dnTest.fails;
  warnings  += dnTest.warns;

  // Test-ready homework (PLC + test aware selection, tick boxes, readable mark schemes).
  console.log('');
  const thTest = require(path.join(__dirname, 'test-homework.test.js')).run();
  hardFails += thTest.fails;
  warnings  += thTest.warns;

  // Patryk's own Do Now questions (kept per class after every upload, or harvested from old decks).
  console.log('');
  const ownTest = require(path.join(__dirname, 'do-now-own.test.js')).run();
  hardFails += ownTest.fails;
  warnings  += ownTest.warns;

  // Mark schemes pupils can read: one line per mark, notes sorted, OCR codes in words.
  console.log('');
  const msTest = require(path.join(__dirname, 'ms-friendly.test.js')).run();
  hardFails += msTest.fails;

  // Exam question kinds (self-marking multiple choice for the Forms homework).
  console.log('');
  const catTest = require(path.join(__dirname, 'exam-categorise.test.js')).run();
  hardFails += catTest.fails;
  warnings  += catTest.warns;

  // Exam questions the exam tool filed under the wrong topic (exam-categories.json), picker guards.
  console.log('');
  const topicTest = require(path.join(__dirname, 'exam-topic-check.test.js')).run();
  hardFails += topicTest.fails;
  warnings  += topicTest.warns;

  // Test-review lessons: paper order and one highlight per mark (review-check.js, 2026-10-15).
  console.log('');
  const rcTest = require(path.join(__dirname, 'review-check.test.js')).run();
  hardFails += rcTest.fails;

  // Do Now calculations: new numbers, same words, answer worked out again (do-now-vary.js, 2026-10-15).
  console.log('');
  const dvTest = require(path.join(__dirname, 'do-now-vary.test.js')).run();
  hardFails += dvTest.fails;

  // A rebuilt lesson keeps the exam question it got first (exam-pick.js, 2026-10-15).
  console.log('');
  const keepTest = require(path.join(__dirname, 'exam-pick-keep.test.js')).run();
  hardFails += keepTest.fails;
  warnings  += keepTest.warns;

  // The A-level exam reader keeps pictures, tables and multiple-choice letters (exam-library-ocr.js).
  console.log('');
  const ocrTest = require(path.join(__dirname, 'exam-library-ocr.test.js')).run();
  hardFails += ocrTest.fails;

  // Do Nows never repeat a homework / exam practice question (do-now-pick.js).
  console.log('');
  const dnhTest = require(path.join(__dirname, 'do-now-homework.test.js')).run();
  hardFails += dnhTest.fails;
  warnings  += dnhTest.warns;

  // The Do Now picker: lesson-match.js matching, the wide pool, the 4/1/1 mix (2026-10-29).
  console.log('');
  const dnpTest = require(path.join(__dirname, 'do-now-pick.test.js')).run();
  hardFails += dnpTest.fails;
  warnings  += dnpTest.warns;

  // Practice questions Claude writes, checked against mcq-rules.md (mcq-written.js).
  console.log('');
  const mwTest = require(path.join(__dirname, 'mcq-written.test.js')).run();
  hardFails += mwTest.fails;

  // Spaced homework from class results (learning loop M6, 2026-10-22).
  hardFails += require(path.join(__dirname, 'spaced-homework.test.js')).run().fails;

  // The "never repeat a question" record: a damaged file stops the pick, writes are safe, dated backups (exam-usage.js, 2026-10-29).
  console.log('');
  hardFails += require(path.join(__dirname, 'exam-usage.test.js')).run().fails;

  // Exam practice homework papers (test-paper.js).
  console.log('');
  const paperMod = require(path.join(__dirname, 'test-paper.test.js'));
  const paperTest = paperMod.run();
  hardFails += paperTest.fails;
  warnings  += paperTest.warns;
  const paperDocx = await paperMod.runDocx();
  hardFails += paperDocx.fails;

  // The test review lesson generator: marks per section, no em dashes (2026-10-29, built in memory, never Drive).
  console.log('');
  hardFails += (await require(path.join(__dirname, 'test-review-lesson.test.js')).run()).fails;

  // Smoke tests for extension-pick, homework-booklet, paper-snippets and lessonMcqs (2.13, 2026-10-29; temp folder only).
  console.log('');
  { const st = await require(path.join(__dirname, 'smoke-tools.test.js')).run(); hardFails += st.fails; warnings += st.warns; }

  // The planner, the behaviour app and Ulhu's server: Apps Script code run against fakes (work plan 0.2, 2026-10-29).
  // Each is its own script that exits 1 on a failed check; its failing lines are shown here.
  console.log('');
  console.log('Planner, behaviour app and Ulhu checks');
  const plannerData = fs.existsSync(path.join(ROOT, 'planner', 'planner-data.json'));
  const PLANNER_CHECKS = [
    ['planner/test-logic.js',          'planner logic against the exported lesson data', true],
    ['planner/test-homework-quiz.js',  'homework quizzes (Forms, Classroom, the Homework tab)', false],
    ['planner/test-mailbox.js',        'the home link (mailbox)', false],
    ['planner/test-ordersheet.js',     'the order sheet drawing', true],
    ['planner/tests/server.test.js',   'the planner server and behaviour app', false],
    ['planner/tests/game.test.js',     "Ulhu's Rituals server", false],
    ['planner/tests/bundle.test.js',   'the paste files (comments out, size alarm, change record, build stamp)', false],
  ];
  for (const [rel, what, needsData] of PLANNER_CHECKS) {
    if (!fs.existsSync(path.join(ROOT, rel))) { warn(`${rel}: not found, skipped`); continue; }
    if (needsData && !plannerData) { warn(`${rel}: skipped, planner/planner-data.json not exported on this PC`); continue; }
    const r = cp.spawnSync(process.execPath, [path.join(ROOT, rel)], { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { NO_UPLOAD: '1' }) });
    if (r.status === 0) { pass(`${rel}: ${what}`); continue; }
    const lines = ((r.stdout || '') + '\n' + (r.stderr || '')).split('\n').filter((l) => /FAIL|✗|Error|error/.test(l)).slice(0, 8);
    fail(`${rel}: ${what} (exit ${r.status})` + lines.map((l) => '\n      ' + l.trim()).join(''));
  }

  console.log('');
  if (hardFails) {
    console.log(`${RED}FAILED${RST} — ${hardFails} hard assertion(s), ${warnings} warning(s).`);
    console.log(`${DIM}Output kept for inspection: ${tmp}${RST}`);
    process.exit(1);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${GRN}PASS${RST} — all fixtures built clean${warnings ? `, ${warnings} warning(s)` : ''}.`);
}

main();
