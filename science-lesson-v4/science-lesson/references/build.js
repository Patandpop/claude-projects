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

   INPUT  - lesson-content.json = JSON ARRAY of 1-N lesson objects. The schema lives
   ONLY in SKILL.md "Content object schema" (one source of truth).

   OUTPUT — per lesson (always 3 files):
            [base].pptx · [base]_worksheet.docx · [base]_support_worksheet.docx

   DEPENDENCIES   npm install pptxgenjs docx adm-zip
   (Starfield header: uses references/starfield_header_FINAL.png next to this
    script; regenerates via python3+PIL if missing.)

   This file is FROZEN. Per-build, Claude writes only lesson-content.json.
   ============================================================================ */

'use strict';

/* MAP: the builder's code lives in builder/, one part per job (split 2026-10-23 to cut
   tokens: read only the part you need, never the whole builder). The parts run in this
   order in ONE shared scope, so a name defined in an earlier part is usable in a later
   one exactly as when this was a single 6,000-line file. Add new code to the part that
   fits; a new part must be added to PARTS below AND to skill-manifest.json.

     01-core.js              requires, constants (colours, sizes, stages, tiers), small helpers (cap, slug, arr, normQ, mcqOptions)
     02-equations.js         equations and markup: normSym, prettyText, parseEq, proseMathSegs, toPptxRuns/toDocxRuns, renderEqShapes, parseMarkup
     03-slide-helpers.js     slide drawing helpers: txt, keySplit, table, navBar, bottomBar, sectionHeader, goldBox, autoFontSize, navyHeaderBox, images, buildWarn
     04-handwriting.js       handwriting (Caveat font, editable and picture versions), mark-tag highlights, font metrics, EOT conversion
     05-pptx-finish.js       after-save passes on the .pptx (finishText, click animations, font embedding) + tierColumn, reviewRow, protocol strip, silent footer
     06-slides-opening.js    title + Do Now, Do Now answers, lessonSequence, objectives slide ("This lesson" strip)
     07-slides-engage.js     Engage slide (all variants)
     08-slides-learn.js      Learn slides: all variants, flow diagrams (G/I), learnTopExtras (definitions, word parts), misconception box
     09-slides-build.js      Build activities: MCQ, MCQ image, true/false, correct statement, sort, practical, misconception, big fact, reformat flowchart, annotated diagram
     10-slides-answers.js    marking panels, exam snippets, model answer review, mark the answers
     11-slides-maths.js      worked example, formula triangles, GUESS, practice triangle, error analysis, graphs (graph_gen.py), visualiser
     12-slides-apply.js      Apply, exam question + mark scheme, review tiers, EBI task, extension, answer list, whiteboard rounds, predict then check, image bank
     13-checks.js            content checks run before building (contentCheck, MCQ check, six-mark rule, blockers)
     14-assemble.js          slide order for each lesson type, buildPptx
     15-worksheet-parts.js   worksheet (.docx) pieces: tables, dividers, tier badges, word bank, answer boxes, GUESS scaffold, marking panel, cloze, header
     16-worksheet.js         worksheet assembly (standard and support), apply tier sections, exam block, buildDocx
     17-main.js              output folder, main() (reads the JSON, builds each lesson, runs the uploader)
*/
const PARTS = [
  '01-core',
  '02-equations',
  '03-slide-helpers',
  '04-handwriting',
  '05-pptx-finish',
  '06-slides-opening',
  '07-slides-engage',
  '08-slides-learn',
  '09-slides-build',
  '10-slides-answers',
  '11-slides-maths',
  '12-slides-apply',
  '13-checks',
  '14-assemble',
  '15-worksheet-parts',
  '16-worksheet',
  '17-main',
];
// Parts are plain scripts, not modules: give them this file's require (paths resolve from
// references/, as before) and __dirname (references/, where the fonts and .py helpers live).
Object.assign(globalThis, { require, __dirname });
const vm = require('vm');
for (const p of PARTS) {
  const file = require('path').join(__dirname, 'builder', p + '.js');
  vm.runInThisContext(require('fs').readFileSync(file, 'utf8'), { filename: file });
}
