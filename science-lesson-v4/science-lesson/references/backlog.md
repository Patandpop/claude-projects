# science-lesson backlog

Improvement notes logged from claude.ai. Ship to Claude Code to implement.
Completed entries are archived in `_archive/backlog-completed-2026-07-02.md` (project root, home PC).
Cleaned 2026-07-02: only outstanding items below.

---

<!-- entries appended below -->

## Session log — 2026-07-06 (morning eyeball of Fraction-Demo — Patryk)

**Bug 59 — guessExample slide visual quality cluster** 🆕 NEEDS DESIGN PASS (logged from Patryk's visual inspection of `Fraction-Demo.pptx`; do NOT build blind — mock and get sign-off first, per the visual workflow)
Observed on the BUILD · WORKED EXAMPLE (GUESS) slide and the standalone formula triangle:
1. **Row proportions off** — the weighted G/U/E/S/S rows leave the slide unbalanced ("the slide just doesn't look that good"); revisit ROW_WEIGHTS and padding.
2. **Letter/label sizes** — the G/U/E/S/S badge and prompt text sizes don't sit well against the row heights; needs a consistent scale.
3. **Formula triangle renders weird** — distorted/tall at some sizes; `drawFormulaTriangle` in the E row uses a fixed `triW` with height capped by the row, so aspect ratio drifts; the standalone (practiceTriangle) subdivision lines also look wrong.
4. **Triangle doesn't subdivide beyond 3 symbols** — only top / bottomLeft / bottomRight are supported; equations with more components need either a proper n-way layout or the triangle suppressed entirely (>3 symbols → no triangle).
5. **Substitute/Solve rows print raw text** — "div" appeared instead of ÷: the G/U/S/S content rows render `r.content` raw with no `parseEq`/`normSym` pass, so `\div`/word operators never convert. These are equation fields and must typeset like the E row does. (This part is a plain logic fix, separable from the design pass.)
NOTE: the phase-3 stacked fraction itself (v = d over t) renders correctly on this slide — the issues are the surrounding layout, not the new fraction stack.

**Bug 60 — practiceTriangle: answers must be ON the slide, in navy/gold boxes under each question** 🆕 (logged from Patryk's Fraction-Demo eyeball 2026-07-06; noted only, not built)
Currently the BUILD · YOUR TURN (practiceTriangle) answers go to speaker notes only — there is no answer slide, so realistically the answers belong on the SAME slide. Wanted: a separate answer box under each question card — dark blue (navy) fill with gold styling, matching the house answer-reveal look (same pattern as the MCQ answer box: present in the deck at build time, Patryk adds the entrance animation himself in PowerPoint for the reveal). One answer box per question, not one combined box.

## Session log — 2026-07-05 (Bug 54 native flow shapes + Bug 58 image placeholder — Claude Code)

**Bug 54 — native flowchart/cycle shapes** ✅ BUILT 2026-07-05 (plan-mode; mock signed off before touching build.js)
- Learn-G flow/sequence slides no longer render as a flattened SVG image (`buildLearnGSvg` **deleted**). The ≥3-step branch now calls `renderLearnGFlow`, drawing the **same approved zigzag geometry** (`LEARN_G_LAYOUTS`, unchanged) as **native PPTX shapes**: `flowStepBox` (navy roundRect + gold ellipse number badge + editable label/note via `autoFontSize`, **full note text — no more 2×26 truncation, no badge overlap**) and `flowArrow` (curved custom-geometry freeform arrows that arch with the flow, gold, triangle arrowhead). Fixes the clipping/overlap class for good.
- **Sign-offs (locked):** (1) keep approved zigzag geometry 1:1; (2) Learn-G and Learn-I stay **separate** but share `flowStepBox`/`flowArrow`; (3) same JSON schema — existing lessons rebuild natively, no migration, SVG path removed outright (no fallback flag). Mock deck (3/4/5/6 steps) built to scratchpad and visually approved by Patryk first.
- **Learn-I** (linear flowchart) upgraded for free: inter-node `→`/`↓` glyphs → native straight `flowArrow` line arrows; `cycle: true` → a curved native return arrow (last node → first). Schema unchanged.
- **Bug 58 — image-description placeholder regression** ✅ FIXED: Learn-H (video) and Learn-J (graph sketch) passed no description to `imagePlaceholder`, so the generic `[Image — add imageDescription to JSON]` showed even when authored. Extracted `imageOrPlaceholder(s, item, x, y, w, h)` (embeds real image when `imageConfidence:'search'`+`embeddedImagePath`, else placeholder with `item.imageDescription`); routed A/B/D/H/J + Build `mcq_image` through it (mcq_image also never checked for an embedded image before). Re-opens an archived image-placeholder bug whose number predates the current list.
- **Latent bug surfaced + fixed:** Learn-H "While watching" used the banned `✎` pencil glyph → swapped to `☞` (house marker). No existing fixture had an H slide, so the harness never caught it.
- Regression: new fixture `flow-native-test.json` (revision lesson: G at 3 + 6 steps, I vertical+cycle, H+J with descriptions) + `test/run.js` assertions (roundRect + custGeom present, no SVG media embedded, full long-note text survives, generic placeholder absent). `npm test` green.
- Docs: `slide-options-v4.md` (Learn-G native/max-6/aliases, new Learn-I entry), `SKILL.md` (Bug 20 superseded, Bug 54 + Bug 58 entries). Skill repackaged → **upload `science-lesson.skill` to claude.ai**.
- RESOLVED from the open backlog below: "Bug 54 — flattened image" and "Regression — image-description placeholder recurring".

---

## Session log — 2026-07-05 (Mark-the-answers corrections — Claude Code)

**markTheAnswers layout v2** ✅ (Patryk feedback: scheme and answers were on different slides — unusable without a worksheet)
- Both slides now share ONE frame: **question full-width on top, mark-scheme panel LEFT, 3 samples RIGHT**. Slide 1 = handwritten samples; slide 2 (**MARKS AWARDED**) = same frame, right column becomes per-sample verdicts (level·mark, ✓ hits / ✗ misses, comment). No worksheet dependency.
- **Marking panel split into 3 sections** (PPTX `buildMarkingPanelRuns` + DOCX `markingPanelDocx`): **INDICATIVE CONTENT → BANDS → EXCLUSIONARY CLAIMS** (renamed from LEVEL DESCRIPTORS / DOES NOT AWARD). Fonts up (13/12→14/13), spacing tightened.
- **Underline = must-use only**: `<u>word</u>` renders underlined ONLY when the word HAS to be used; new `markupToDocxRuns` gives the DOCX panel the same `<u>`/`**bold**` support the PPTX panel had.
- **6-mark rule relaxed for band-marked questions**: `checkSixMarkRule` skips any question carrying `levelDescriptors` — marks are lost via BANDS, not the indicative-point count.
- **Bigger text**: correctTheStatement handwriting 16→20pt, corrections 13→15pt; modelAnswerReview handwriting 20/22→22/24pt.
- **Equations/superscripts pass 2**: `parseEq` now runs `normSym` first (word operators + unit whitelist convert in equation FIELDS: GUESS cells, equation hints, worked steps — PPTX and Word). `prettyText` added to remaining raw sinks: worksheet `question()`, Apply tier columns/cards, Do Now slide, whiteboard rounds, practical Q&A answers.
- **Answer sheet = Apply/Build only**: Do Now section skipped entirely in `'answers'` mode (Do Now answers live on the DoNow Answers slide).
- Harness updated (EXCLUSIONARY CLAIMS / BANDS assertions, superscript-aware ³ check, fails if DO NOW appears on an answer sheet). `npm test` green. Cap-test fixtures rebuilt + verified.
- STILL OPEN: Bug 54 (native flowchart shapes), image-description placeholder regression, subject-specific top bars, Bug 33/53 phase 3 (true stacked fractions in PPTX — diagonal ⁄ still the fallback).

---

## Session log — 2026-07-04 (Mark-the-answers + Bug 55/57 — Claude Code)

**"Mark the answers" activity type** ✅ BUILT 2026-07-04 (plan-mode, all sign-offs to recommended)
- New `markTheAnswers` Build item — one exam question + 3–4 **realistically-flawed** sample answers,
  marked against the reused mark scheme (`indicativeContent`/`levelDescriptors`/`doesNotAward`; same
  fields as `modelAnswerReview`). Authoring: **standalone Build item** (not a field on a question).
- **Slide** (`slideMarkTheAnswers`, two slides): TASK = question + samples as handwriting in a 2×2 grid
  (`handwritingBlock`, `jitterProfile` varied per sample); MARK SCHEME = `buildMarkingPanelRuns(item)`
  left + per-sample verdicts (awarded level/mark, ✓ hits / ✗ misses, teacher note) right. Extracted the
  build-item dispatch into `renderBuildSlides(pptx,L,buildItems)` (shared by standard + review paths);
  added `markTheAnswers` to it + the Caveat font-embed gate.
- **Worksheet** (`buildQuestionBlocks`): each sample boxed + `Level: __ Mark: __ / N` to annotate; in
  `answers` mode → `Awarded:` verdict + hits (green •) / missed (red •) + comment + full
  `markingPanelDocx(item)`. No ✓/✗ dingbats in DOCX (Century Gothic substitution) — colour + • bullets.
- **Bug 55** ✅ dedicated `review` dispatcher branch: renders **all** Learn slides (no `slice(0,4)` cap),
  no Engage, runs Build items (so markTheAnswers/modelAnswerReview reach review slides), Visualiser
  mandatory. Standard/practical/annotation/unknown keep the 4-Learn cap. (Review used to fall to the
  `else` "unknown" path — capped + Engage; now correct.)
- **Bug 57** ✅ build-time warn when `apply.tiers` / `review.tiers` is seen (loud, no coercion — flat
  shape is the only supported one; grep confirmed no real lesson uses `.tiers`). Cleaned `bug-test.json`
  apply to the flat shape → its apply content now actually renders (was silently dropped).
- Regression: added a `markTheAnswers` item to `review-answers-test.json` + `test/run.js` assertions
  (slide task header + sample label; answer sheet verdict + MP-hit + panel). `npm test` green.
- Docs updated: SKILL.md (review sequence + Build-in-review + Bug 55/56/57 + answer-sheet note),
  slide-options-v4.md (`markTheAnswers` spec + review row), worksheet-spec.md (markTheAnswers rows).
  Skill repackaged → upload `science-lesson.skill` to claude.ai.

---

## Session log — 2026-07-04 (Revision-lesson overhaul — Claude Code)

**Revision-lesson cluster** ✅ BUILT 2026-07-04 (plan-mode, all sign-offs to recommended)
- **Answer sheet** — review lessons (`lessonType:"review"`) now output PPTX + worksheet + `_answers.docx` (model-answer sheet takes the freed support slot). Built by extending `buildWorksheetChildren(L,'answers')` — same section/tier walk as the worksheet, interleaved Q→answer, "MODEL ANSWERS — marking copy" banner. Output loop switched to build the answers doc in the `isReview` branch.
- **Model-answer frameworks** — new `answerReveal(q,tier)` dispatcher + `answerFramework(q)` (auto by qType/fields, `q.answerStyle` override): filled GUESS table (new `guessScaffold('answer',…)` mode, all 5 cells, Solve emphasised) for calcs; `markingPanelDocx(q)` (level descriptors → indicative bullets → does-not-award, navy/gold) for 6-markers; `plainAnswerCallout` otherwise.
- **6-mark rule** — `checkSixMarkRule(L)` logs (non-fatal, B9 pattern) any extended ≥6-mark Q with <6 indicative points; scans Apply/Review tiers + modelAnswerReview build items.
- **Review-slide polish** — handwriting working now spreads to fill the box with evenly parallel ruled lines, no trailing blanks (`layoutHandwriting` boxH spread + rule-under-every-line); indicative panel chunks by new `ic.group` field (PPTX `buildMarkingPanelRuns` + `markingPanelDocx`); Learn-C purple-pen header green→navy/gold.
- **Bug 56** ✅ Learn-C single tier (only corePaper OR extendPaper) → one full-width table instead of two half-width columns.
- Regression: new fixture `review-answers-test.json` (also exercises Bug 56) + `test/run.js` review-lesson assertions (expects `_answers.docx`, banner + filled GUESS + indicative + does-not-award, support sheet absent). `npm test` green.
- Docs updated: SKILL.md (three-file rule + new **Answer sheet** section), worksheet-spec.md (answer-sheet frameworks table), slide-options-v4.md (`ic.group`, 6-mark rule, Learn-C). Skill repackaged (404 KB) → upload to claude.ai.
- STILL OPEN from 07-03 (secondary, below): Bug 54 (native flowchart shapes), Bug 55 (Learn-slide cap for review — verify current value first), Bug 57 (dead `.tiers.X.qs` shape — grep real lessons), image-description placeholder regression, subject-specific top bars, "mark the answers" activity type.

**New lesson pattern — practical + theory-review two-part sequence, ending in a 6-marker with sentence starters** ✅ DECIDED 2026-07-06 — documented as a planning workflow in SKILL.md ("Planning practical sequences"), no new lessonType. Patryk's splitting rule (2026-07-05): KS3 build-up lesson before multi-step practicals; Y12/13 demo lesson before, CPAC criteria on the method sheet; capstone 6-marker in the follow-up lesson using real class results.
Observed: the amylase pH practical revision lesson (9AB) rightly spends its full length on the practical itself, so the Mastering tier tops out at a 5-mark explain question and the B4 sentence-starter machinery never gets exercised on a real 6-marker.

Proposal: for practical lessons where the practical fills the lesson, pair it with a follow-up **theory-review lesson** (existing `lessonType: "revision"` or a new dedicated type) that:
- Recaps the practical's results/method briefly (whiteboard rounds or a short Do Now)
- Builds to a genuine 6-mark extended-writing question as the capstone, with sentence starters on the support sheet
- Uses the class's real practical results as the data for that question, not generic textbook numbers

Status: not implemented — needs a decision on whether this becomes a documented two-lesson workflow in SKILL.md (naming/sequencing convention, e.g. "Lesson N — practical" + "Lesson N+1 — review") or a new `lessonType`. Discuss before building.

---

**Equation rendering — diagonal-fraction hack renders too small next to other equation text** ✅ RESOLVED 2026-07-06 (Bug 33/53 phase 3 shipped: native stacked shape-pair fractions via `renderEqShapes` on Learn-F / guessExample / practiceTriangle; diagonal stays only as the automatic small-box/inline fallback. Demo deck `Fraction-Demo.pptx` in project root for the morning eyeball.)
Found: eclipse lesson Learn-F equation slide. The `{d/t}` visual-fraction hack compounds PowerPoint's own super/subscript shrink with the renderer's `subFs = fontSize * 0.65`, so the fraction reads tiny next to full-size text.

Interim workaround (adopted): write equations needing a fraction as `d ÷ t` (division symbol, plain text) wherever the containing box isn't large enough — used in `guessExample` and Learn-F this session, now also noted in the guessExample docs.
Status: workaround only. The real fix is Bug 33/53 in SKILL.md — true stacked fractions (OMML in DOCX, native shapes/math in PPTX), designed together with the run-level sub/superscript work and the Cambria Math font decision. Note (2026-07-02 audit): `fmt-equations.js` does not exist — equation parsing currently lives in build.js `parseEq()`; a standalone pre-processor would need to be built as part of this overhaul.

---

**Bug 34 — annotated diagram breakdown slide type** BLOCKED → UNBLOCKED (reference available)
The chromatography source deck (`Lesson_4_-_EPIBA_Chromatography_EPA.pptx`) is a usable reference: one base diagram plus positioned text-label callouts (Solvent Front, Separated Dyes, Filter Paper, etc.). Prototype a slide type that takes a base image + labelled callout positions. Renderer change — needs Patryk sign-off on the design before building.

---

## Session log — 2026-07-03 (Patryk observations; prev update did NOT clear backlog)

**Feature — Textbook references + book ordering** ✅ BUILT 2026-07-03 (spec: `specs/textbook-references.md`)
New shared matcher `references/textbook-index.js` (parses `textbook-index.md`, auto-matches lesson→book+pages via page-adjacency clustering, `meta.textbookRef` override, `primaryBook` for reviews). Consumers: build.js shows `Read more — [book] pp. X–Y` (dark blue + gold) top-right of the Apply title on the **slide + worksheet**; test-review-lesson.js auto-fills each subtopic `bookRef` (feeds subheadings + intro-slide chips); order-sheet.js orders **1 set** normal-matched / **2 sets** test-review / **none** for practical/test/unmatched/Y12. Unit test `test/textbook-index.test.js` wired into `npm test`; amylase fixture guards the Apply ref. CGP excluded (KS4 Kerboodle stands in). Both `textbook-index.js` + `textbook-index.md` added to the skill package.


**Bug 53 — equation rendering** ✅ FIXED 2026-07-03 (the equation overhaul)
Was: raw notation rendered literally on Review-lesson worked examples — `\times`→literal, `\div`→literal, `I^2`→literal; PPTX fraction tiny. Fix (all in build.js — no `fmt-equations.js`, that phantom stays dead): (1) `parseEq` `_SYM` map extended with operators `\times \div \pm \cdot \to \rightarrow \leq \geq \approx \neq \degree \deg \propto`; (2) equation runs render in **Cambria Math** (`FONT_MATH`) in PPTX, OOXML `m:f`/`m:rad` in Word; (3) PPTX diagonal fraction now full-size (was sub+sup on a 0.65 shrink); (4) `sqrt()`→radical seg → `√` glyph in PPTX / true vinculum in Word; (5) prose sinks that bypassed parseEq (`reviewRow`, indicative content, handwritten model answers, `workedExample` prompts/answer) now run `prettyText` = `normSym` (symbols + safe unit whitelist meters/second→m/s etc.) + `unicodeScript` (`^2`→²). Regression guard added to `test/run.js`: fails on raw `\times`/`\div` in output XML, asserts × ÷ ² √ typeset in bug-test deck. Decisions signed off: fixed diagonal (no true stacked bar in PPTX), OMML radical in Word / √-glyph in PPTX, extend-in-build.js (no separate module), small safe unit whitelist.

**Bug/Rule (folds into Bug 53) — operators in model answers must be symbols** ✅ addressed by the `normSym`/`prettyText` pass + SKILL.md authoring rule ("×" not "times", "÷" not "divide").

**Bug/Rule (folds into Bug 53) — units render as symbols, not words** ✅ small safe whitelist in `normSym` (meters/second→m/s, seconds→s) + SKILL.md rule to author symbols. Anything outside the whitelist must be authored as a symbol.

**Bug 57 — fixture/lesson tier shape mismatch: `.tiers.X.qs` silently not rendered** 🆕 (found during Bug 53 work) build.js reads `apply.developing` / `review.developing` (flat arrays) or `review.questions`, NOT `apply.tiers.developing.qs` / `review.tiers.developing.qs`. bug-test.json used the nested `.tiers` shape → its apply + review tier content rendered EMPTY (silently). During Bug 53 I gave bug-test's `review` a working `review.questions` array so the regression guard exercises reviewRow; bug-test's `apply.tiers` nesting is STILL dead (out of scope, harmless for the harness). TODO next session: (1) grep real lesson JSONs in the project + Drive for `"tiers"` under apply/review — any real lesson using it is silently dropping tier content; (2) decide whether build.js should also accept the `.tiers.X.qs` shape (defensive normaliser) or whether authoring must always use the flat shape (add a build-time warn when `.tiers` is seen). No renderer change made yet.

---

**Bug 54 — Flowchart/cycle diagrams render as flattened image, not native PPTX shapes** ✅ FIXED 2026-07-05 (see session log above) — RENDERER
Six-step Learn flowcharts (e.g. "How Coronary Heart Disease Develops") render as a single embedded image instead of editable PPTX boxes/shapes. Causes text clipping/overlap (step 1 text overlapping its numbered badge). Fix: generate as actual PPTX shapes/text boxes, not a rendered image embed.

---

**Regression — image-description placeholder recurring** ✅ FIXED 2026-07-05 as Bug 58 (root cause: Learn-H/J dropped the description; see session log above) — was 🔁 RE-OPEN (bug # TBC, was in 28–52 range)
"[Image — add imageDescription to JSON]" still appearing on a Learn slide after the update. Needs re-investigation; confirm exact original bug number.

---

**Bug 55 — Learn-slide cap wrong for Review/revision lessons** 🆕
Hard cap of 2 Learn slides/lesson doesn't fit Review/revision lessons, which carry more content. Revision lesson type should apply a different (higher/none) cap than standard new-content lessons. (Note: memory says cap was raised 2→4 on 2026-06-25 — verify current cap value in build.js before changing.)

---

**Bug 56 — "Purple pen time" Core/Challenge table forces two columns when only one tier exists** 🆕
When a lesson has a single question type/tier (no real Core/Challenge split), the slide still forces the two-table layout → large blank space. Needs conditional layout: single full-width table when there's only one tier.

---

**Feature/Rule — Revision lesson output set change** 🆕 CHANGES THE THREE-FILE RULE for revision
Revision/Review lessons should output: PPTX + standard worksheet + **ANSWER SHEET** (well-formatted) — the answer sheet replaces the support-worksheet slot (revision already suppresses support per Bug 51). Needs SKILL.md three-file-rule update for the revision exception.

---

**Feature/Rule — Model answer frameworks** 🆕
Model answers (incl. the new answer sheet) should integrate: GUESS scaffold for calculation questions (extend the existing GUESS machinery to model answers); bullet-pointed structure for 6-mark extended answers. Answer-sheet formatting needs a general review pass (specifics TBD).

---

**Rule — 6-mark indicative content minimum** 🆕
6-mark extended questions must list ≥6 indicative content marking points (match points to mark allocation).

---

**Feedback — Review lesson worked example / indicative content layout** (overall praised as excellent)
1. Equation notation not typeset → Bug 53 above.
2. Left worked-example box generates unnecessary blank ruled lines below the working — content should spread across the full box.
3. Right "Indicative content" box needs more visual/box structure (separate chunks for substitution / answer / conversion) — NOT more text, just better structural presentation.

---

**Feedback — Purple pen time table styling + handwriting lines** 🆕
- Green table header colour looks off — revisit.
- Handwriting-style ruled lines in worked-example/maths areas need to be more parallel and better structured for laying out working neatly.

---

**Feature ideas — Worksheet worked-example area** 🆕
1. Show the actual question text at the top of the worked-example/answer box so it's clear what's being answered.
2. New activity type "mark the answers": present 3–4 sample student answers to a question (e.g. a 6-marker), students mark them against a mark scheme. Good as a Build task; also add as a worksheet option.

---

**Feature — bigFact slide type (U6)** 🆕 (rescued 2026-07-06 from an old memory file before archiving it — never built)
High-impact single-concept Build slide: one huge number/fact (e.g. "37 °C") filling a navy slide, gold ~72pt Trebuchet, optional unit + one context line, before a practical or at a key teaching moment (Duarte sparkline engagement peak). Schema idea: `{ "type": "bigFact", "fact": "37", "unit": "°C", "context": "The optimum temperature for amylase" }`. Display-only, no worksheet output. Small renderer job when wanted.

---

**Feature — Subject-specific top bar images** 🆕 NEEDS SCOPE DECISION
Currently one fixed Physics top bar reused for every lesson. Want: Chemistry top bar (idea: graphene / fullerene structure) and Biology top bar (idea: serotonin molecule or similar — not decided). Scope TBD: subject detection/specification per lesson + image storage location.
