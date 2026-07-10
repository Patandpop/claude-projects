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

function main() {
  if (!fs.existsSync(BUILD_JS)) { console.error('build.js not found at ' + BUILD_JS); process.exit(1); }

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
    const sanitisedPath = path.join(outDir, '_input.json');
    fs.writeFileSync(sanitisedPath, JSON.stringify(lessons), 'utf8');

    // Build — NO_UPLOAD keeps the Drive uploader out of the test.
    const r = cp.spawnSync(process.execPath, [BUILD_JS, sanitisedPath, outDir], {
      cwd: ROOT, encoding: 'utf8',
      env: Object.assign({}, process.env, { NO_UPLOAD: '1' }),
    });
    const output = (r.stdout || '') + (r.stderr || '');

    if (r.status !== 0) { fail(`build exited ${r.status}`); console.log(DIM + output.trim() + RST); continue; }
    pass('build exited 0');

    // Graph pipeline guard — the exact failure class fixed 2026-07-02.
    if (/\[graph_gen\]/.test(output)) fail('graph_gen reported an error (graphs will be missing)');
    else pass('no graph_gen errors');

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
      const isReview = String(L.meta.lessonType || '').toLowerCase() === 'review';
      const before   = hardFails;

      // Review lessons: PPTX + worksheet + model-answer sheet (no support worksheet).
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
    // catches the inverse). × ÷ come from parseEq operator map; ² from the prose
    // unicode-script path; √ from the radical seg.
    if (fixture === 'bug-test.json') {
      const pptx = path.join(outDir, baseName(lessons[0].meta) + '.pptx');
      if (fs.existsSync(pptx)) {
        const xml = readArchiveXml(pptx);
        const missing = ['×', '÷', '²', '√'].filter(c => !xml.includes(c));
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
      }
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

      // markTheAnswers slide: the review PPTX must carry the task header + a sample label.
      const pptx = path.join(outDir, base + '.pptx');
      if (fs.existsSync(pptx)) {
        const pxml = readArchiveXml(pptx);
        const slideMiss = ['MARK THE ANSWERS', 'Student A'].filter(t => !pxml.includes(t));
        if (slideMiss.length) fail(`mark-the-answers slide missing: ${slideMiss.join(', ')}`);
        else pass('mark-the-answers slide: task header + sample label present in review pptx');
      }
    }

    // Bug 54 guard: flow/cycle Learn slides must be NATIVE PPTX shapes, not a
    // flattened SVG image. Bug 58 guard: image slides must carry the authored
    // imageDescription (never the generic "add imageDescription" placeholder).
    // Scoped to this fixture because it authors a description on every image
    // slot; legacy fixtures still carry description-less placeholders by design.
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
