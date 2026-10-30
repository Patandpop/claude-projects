# science-lesson backlog

Improvement notes logged from claude.ai. Ship to Claude Code to implement.
Completed entries are archived in `_archive/backlog-completed-2026-07-02.md` (project root, home PC).
Cleaned 2026-07-02: only outstanding items below.

---

<!-- entries appended below -->

## Future goals — 2026-10-14 (Patryk; NOT started, wait for him to pick one)

1. **Exam questions on worksheets:** always include them, even with an image or diagram (too many are being left out). Can be laid out two-up (question one side, image the other) to save space.
2. **Worksheet page layout:** a table must sit on one page, never split; sub-sections must not straddle pages 2 and 3 (sub-sub-sections such as Reaching on page 2 and Master on page 3 are fine); scale sizes sensibly to fit; headings must not leave an ugly half-page gap when moved to another page.
3. **Worksheet style (later project):** explore Canva or other tools for nicer, editable worksheets. Note only.
4. **GUESS structure slide:** add an example question at the top and animate the steps.
5. **Language and tone rules:** speaking tone for instructions; base the rules on concise natural voice (not restrictive controlled English like ASD-STE100), visuals over text; do deep web research on the best teaching language first. No paid API without flagging.
6. **Gold answer boxes on slides:** hard to read on the classroom board; change for better contrast while keeping a similar look (mock colours first, check amber rules).
7. **Equation slide:** the example at the bottom is often slightly misaligned or missized.

Memory copy: `project_future_worksheet_slides_polish_2026_10_14.md`.

## Session log — 2026-10-03 (10C2 L11 Non Renewable Resources trial build — Claude Code)

Found while building and rendering the trial lesson (new Apply structure). Not fixed: build.js changes need Plan Mode.
- 🆕 **Sentence starters on an extended-writing question land on the wrong sheet.** `starters` on a Mastering `extended_writing` question printed on the STANDARD worksheet, while the SUPPORT worksheet showed only the generic "What changes? / Why? / What does this mean?" prompts. Starters should go on the support sheet (with or instead of the generic prompts, and the generic prompts don't fit "evaluate" questions anyway).
- 🆕 **GUESS fields pre-fill the standard worksheet.** Giving an Apply calculation `given`/`unknown`/`equation` fills those cells on BOTH worksheets, which gives the working away on Mastering questions. Workaround used: `equationHint` only (support-sheet hint, blank GUESS cells). Consider pre-filling only on the support sheet.
- 🆕 **CONTENT CHECK false positive on Learn E:** it demands an `imageDescription` for comparison slides, which have no image area, so the image only reaches the image bank.
- ✅ FIXED 2026-10-30 (item 2.5, now "READ THE GRAPH"): **graphInterpret slide is titled "READ THE GRAPH: ANSWERS"** and carries the purple-pen bar, but it is the only graph slide (questions + answers to animate). Title reads oddly when students first see it.

## Session log — 2026-10-02 (three render bugs from the golden renders — Claude Code)

Found by rendering every slide type to PNG (`golden/`, baseline commit `e0d5210a`). All fixed, `npm test` green with a new fixture (`triangle-handwriting-test.json`).

- ✅ **Handwriting showed as plain bold text in PowerPoint**, in both modes. The bundled Caveat font went into the .pptx as a raw `.ttf`, which PowerPoint ignores; it now goes in wrapped as EOT (`ttfToEot`), and PowerPoint uses it. Editable text stays the default (Patryk's call: picture only if editable could not be fixed). The picture mode (`renderMode:"raster"`) was an SVG PowerPoint also could not draw; it is now a real PNG drawn by `handwriting_png.py` (Pillow, packaged). Word spacing now uses Caveat's real letter widths (the old guess was about twice too wide once the real font appeared), and unruled one-line statements are centred instead of sinking to the bottom of their box.
- ✅ **Formula triangle clipped its labels** ("rate" showed as "ate"). Labels now fit the triangle's real interior. Also closes **Bug 59 point 4**: triangles now take 2 to 4 multiplied quantities along the bottom, `equationSymbols: { top, bottom: [...] }`; the old three-key form still works; non-product equations still get no triangle.
- ✅ **graph_gen straight line through curved data** (entry below). New `referenceData.fit`: auto (default), linear, curve. Curves are a smooth best fit with no intercept or straight-line numbers.
- 🆕 **Mark-scheme panel overflows its box** on long schemes (`golden/C-07.png`, also in the baseline): the last exclusionary claim runs off the bottom.
- ✅ **`kg/m^3` prints raw in GUESS rows**: fixed 2026-10-03 (`ea9680d`): fraction parts now get their powers typeset, so it renders kg⁄m³.
- ✅ **Maths shorthand raw in ~100 slide fields, prose word swaps ("three ×"), MCQ "A.C." stripped**: fixed 2026-10-03 (`fb4f10e`, `ea9680d`); regression fixture `maths-prose-test.json`.

## Session log — 2026-07-13/14 (exam library at scale, homework booklets, class defaults, Feynman plates — Claude Code)

**Exam library — BUILT ✅.** All 108 of Patryk's AQA exam documents (Biology 50, Physics 58) now parse: **108/108, zero failures.** 4,450 questions, 19,424 question parts, ~99% joined to their real mark schemes. Chemistry was being exported by Patryk on 2026-07-14 and drops in with no code change (the batch runner is subject-agnostic).
- **Figures recovered (the load-bearing fix).** The parser was replacing every picture with the text `[FIG]` and discarding the image — and 39% of parts have one. The `{\pict}` blobs are plain PNG/JPEG hex (checked: zero metafiles), so `exam-figures.js` decodes them losslessly. **17,787 figures** out, de-duplicated by hash, each linked to its question part by index. Without this, printed booklets were impossible for a third of the library.
- **Two scale blockers fixed:** every doc used to write to the SAME index filename (they would have overwritten each other); and the trailing instance number on a filename ("Photosynthesis 1"/"2" — his 60-question export cap) was being swallowed into the subtopic, splitting one topic into several. Filename typos are corrected on read via `exam-name-fixes.json`. **Drive files are never renamed, moved or touched.**
- **Difficulty is real, not guessed:** the examiner's own stated pass rate ("80% of students scored…") is used where present — **11,729 of 19,424 parts (60%)**. Where absent we estimate and LABEL it as an estimate; the two are never blurred. Local regex, **no paid API** (advisor agreed: the commentary is already an examiner-written summary).
- **Two outputs, two jobs:** `docs/<doc>.json` (full text + scheme + examiner, loaded on demand) and `catalogue.json` (slim, no question text — sorted subject > topic > subtopic > marks > difficulty, so finding a question is token-cheap).

**Homework booklet BUILDER — BUILT ✅** (`homework-booklet.js`). A tool, not a pile of booklets: run per topic on demand. Produces an exam-style paper (real questions, real figures, answer lines by tariff, ramped easy→hard **like a test paper** — NOT sorted by marks; that ordering is for the index, not the pupil) plus a separate self-assessment mark scheme carrying the real scheme, the examiner's common errors, and "70% of students scored on this in the real exam".

**Do Now bank SEEDED ✅** (`seed-do-now-bank.js`) — 1,295 real exam questions, Year 9+, gated on content taught. **12C and 13D get nothing from it: they sit OCR A, and a question from the wrong board is wrong grounding, not merely thin.** School-session wiring still pending (September).

**Class defaults — BUILT ✅** (`class-defaults.json`). The word-bank/homework rules existed nowhere for the 2026/27 classes. Records what Patryk stated; classes he has not ruled on are marked null and listed, never guessed.

**Feynman wall plates — BUILT ✅** (`chalkify.py --plates`, `feynman-plates.json`). 19 landscape A4 pages + PDF, importance-tiered into even thirds across the three palettes.

### Still open from this session
- **Whole-class feedback sheet builder** 🆕 — the marking-workload tool from the setup review (#15). Not started; the only remaining item that saves Patryk evenings.
- **Smoke tests for the September scripts** 🆕 — daily-brief / order-sheet / context run unattended from September with only light coverage (#18).
- **September wiring** 🔧 — school session PICKING Do Now questions from the bank, and reading the last-lesson summary. Both need SKILL.md changes and the new class lists.
- **Word-bank rulings needed from Patryk** 🔧 — 8AG, 9AS, 9XS unknown; confirm 8XP, 10S2, 11S2. Listed in `class-defaults.json` `_openQuestions`.
- **Kerboodle / OCR A textbook database** 🆕 — 12C and 13D need weekly homework from the OCR A end-of-subsection questions. Not started.
- **One Feynman caption still unverified** 🔧 — the companion figure to the Cornu spiral (`Proability Amplitudes.webp`), flagged rather than invented.

---

## Session log — 2026-07-13 (full slide-design sample pack, home only — Claude Code)

**Doc gap 🆕** — `slide-options-v4.md` documents 9 Learn layouts (A–I) and 19 Build activity types. The renderer actually supports **11 Learn layouts and 21 Build types**. Never documented anywhere, and no sample file ever exercised them until this session's `design-audit/all-slides.json`:
- Learn **J** — graph sketch (`build.js:1638`): `{ variant:"J", heading, axes:{x,y}, features:[{label,description}], instruction }`.
- Learn **K** — timeline (`build.js:1673`): `{ variant:"K", heading, events:[{year,label,detail}] }`, max 8 events.
- `mcq_image` (`build.js:1766`) — same fields as `mcq` plus `imageDescription`.
- `graphResults` (`build.js:2733`) and `graphWithData` (`build.js:2777`) — both need `worksheetExtras.referenceData.rows` or they silently render nothing, no warning.
Fix: update `slide-options-v4.md` with these five entries next time it's touched.

**Bug ✅ FIXED 2026-10-02 (see session log at top) — `graph_gen.py` fits a straight line to curved data.** Confirmed visually in the sample pack (`design-audit/slides/45_build_graph-results_UNDOCUMENTED.png`): fed a realistic rate-of-reaction volume/time curve, it draws a straight best-fit line through it, reports R²≈0.82 as if that were acceptable, and prints an extrapolated "x-intercept = −18.81 s" that is meaningless for this kind of data. The linear-fit + x-intercept logic in `graph_gen.py` looks like it was built for straight-line practicals (e.g. distance/time at constant speed) and is being applied unconditionally to curved ones too. Needs either a curve-fit option or a flag to suppress the linear-fit annotations when the data isn't linear.

**Reference — full sample deck exists:** `design-audit/ALL-SLIDES.pdf` (70 unique slide designs, one page each, curated from 127 rendered slides across 8 sample lessons) + `design-audit/decks/*.pptx` (the 8 source decks) + `design-audit/INDEX.txt` (what each page is). Local only, not committed, not on Drive. Useful next time any slide-visual work is proposed — check it before assuming a layout has never been seen rendered.

---

## Session log — 2026-07-11 (Fable advisor tool, backlog cleanup, bigFact, revision-lesson fix, timer tool — Claude Code)

**Fable advisor tool** ✅ BUILT — `consult_advisor` MCP tool + manual `/advisor` command, for a second opinion from a different AI model at genuine decision points. Manual/on-demand only, real small paid cost per use. See `[[project-science-lesson]]` memory for full detail.

**Revision-lesson output set** ✅ FIXED — revision lessons now get the same three-file treatment as review lessons (model-answer sheet instead of the support worksheet), matching what Patryk confirmed he wanted. Caught and fixed a second, older bug in the same area: the Drive-upload helper file was checking the wrong piece of data and so had been putting the wrong third filename in every review lesson's upload record.

**Duplicate image-description check** ✅ FIXED — closes the "known follow-up" noted in the 2026-07-08 entry below. There were two copies of the same check; the working one only reported a count of slides missing a description, the other (better) one that named the actual slides was silently never running. Merged into one, so the warning now names slides again, not just a count.

**bigFact slide type** ✅ BUILT — see 2026-07-08 entry below for the original request. New slide style: one huge number/fact filling the screen (e.g. "37°C — the optimum temperature for amylase"), gold text on navy. Sample deck built to check it looks right.

**Design-pending options document** ✅ WRITTEN 2026-07-11, all 3 resolved 2026-07-12 — `specs/design-pending-options.md`. "Reformat the information" and Bug 34 (annotated diagram) both picked and built same session — see their own entries below. Subject-specific top-bar images: Physics/Chemistry stay as-is; Biology needs new artwork that Patryk is making himself (see `[[project-science-lesson]]` memory for the standing reminder to check back on it).

Full backlog re-check done same session as the 2026-07-09 hygiene pass below — all entries below double-checked against the actual code, not just against old backlog text.

---

## Session log — 2026-07-10 (Bug 59 + Bug 60, per approved mocks — Claude Code)

**Bug 59 — guessExample slide visual quality cluster** ✅ BUILT 2026-07-10 (commit `b6f006a2`, per Patryk's approved mocks from the 07-06 eyeball — see that session's entry below for the original findings)
Row proportions rebalanced (weighted `ROW_WEIGHTS`, `build.js:2300-2302`), letter/badge sizing now scales with row height (`build.js:2321-2324`), formula triangle aspect-locked (`triW = triH * 1.15`, `build.js:2333`) and suppressed entirely above 3 symbols (`triangleUsable()`, `build.js:2328-2331`), Substitute/Solve rows now run through `parseEq` so raw operator words typeset as ÷ × ² (`build.js:2344-2349`). Fixture + harness coverage added; demo deck rebuilt.

**Bug 60 — practiceTriangle answer boxes** ✅ BUILT 2026-07-10 (commit `b6f006a2`, same session)
Answers now live ON the slide in navy/gold boxes under each question (`build.js:2376-2396`), one box per question, matching the spec from the 07-06 eyeball below. Patryk animates the reveal himself in PowerPoint.

---

## Session log — 2026-07-09 (backlog hygiene pass — Claude Code)

Several 🆕 items below turned out to already be built in the 2026-07-09 CONTENT CHECK / image-bank session (commit `a9a7d9c2`, "P3") and the 07-04/07-05 sessions, but were never marked done — correcting the record here rather than re-implementing. Verified against `build.js` directly, not against the backlog text (see CLAUDE.md: "backlog statuses lie"). See each corrected entry below for evidence.

## Session log — 2026-07-08 (Patryk lesson batch: irradiation, latent heat, eclipses — Claude Code)

**Feature — timeline slide (Learn variant K) needs a per-event image slot** ✅ BUILT same session (2026-07-08)
Each timeline event can now carry its own `image`/`imageDescription`/`embeddedImagePath` (`build.js:1671-1678`, comment dated 2026-07-08), reusing `imageOrPlaceholder`. The 8XP eclipse-history workaround (separate Learn-A slides per era) is no longer needed for future lessons of this kind.

**Feature — "reformat the information" build activity type** ✅ BUILT 2026-07-12 as `reformatFlowchart` (Patryk picked Option C from the 07-11 options doc)
Students reorder scrambled process steps. `slideReformatFlowchart()` in build.js — question slide shows steps shuffled (deterministic `shuffleOrder()`, lettered A–F not numbered so the letters don't leak the answer), answer slide shows them back in the correct order with native gold arrows (reused `flowArrow`, and the same numbered gold-circle badge now factored out as `numberBadge()`). Worksheet side prints the same shuffled list with blank ordering boxes, filled in on the answers sheet. Fixture + `npm test` coverage added. Docs in `slide-options-v4.md`.

**Feature — build-time warning when any image slot has no description** ✅ BUILT 2026-07-09 (CONTENT CHECK block, commit `a9a7d9c2`), duplicate-check bug fixed 2026-07-11
`contentCheck` now warns on every image slot with no `imageDescription`, naming each slide by name (not just a count). Fixed 2026-07-11: `build.js` had two shadowed `contentCheck` declarations — a dead one that properly listed slide names, and the surviving one that only reported a count. Merged into one working version. `npm test` green.

**Feature — extraction never silently skipped (source-image guard)** ✅ BUILT 2026-07-09 (CONTENT CHECK block, commit `a9a7d9c2`)
`contentCheck` warns when a lesson has no `embeddedImagePath` anywhere and an empty `image_dump` (`build.js:3038-3041`). Caveat: this is a coarser "any image present" signal, not a literal "source deck was referenced but not extracted from" check — revisit if it proves noisy or misses a real case.

**Note — cloze/gap-fill renders on Type-A worksheets only + question-set variety review** 🆕
`worksheetExtras.cloze` only renders on the default (Type A) worksheet, not on review/exam sheets (build.js ~3862 dispatch) — this is why gap-fills "stopped executing" for Patryk on some sheets. Decide: allow cloze on more worksheet types, or document the limit. Patryk also wants a broader review of question-set VARIETY (what activity/question types exist, where each renders, and adding more) — treat as its own review.

**Bug — Drive upload macrotopic mapping (`Space` vs `P4 Earth in Space`)** 🔧 PARTIALLY ADDRESSED 2026-07-09
`upload-to-drive.js:180-194` now prints a "did you mean one of these macrotopic folders?" suggestion (listing sibling folders) when the destination Drive folder is missing, dated to this exact "Space → P4 Earth in Space" miss. This is a loud diagnostic, not an automatic fix — `meta.macrotopic` still has to be set to the exact Drive folder name by hand. Leave open unless Patryk wants an automatic mapping table instead of the prompt.

## Session log — 2026-07-06 (morning eyeball of Fraction-Demo — Patryk)

**Bug 59 — guessExample slide visual quality cluster** ✅ BUILT 2026-07-10 — see the session log at the top of this file for what shipped (logged from Patryk's visual inspection of `Fraction-Demo.pptx`; original findings below, kept for reference)
Observed on the BUILD · WORKED EXAMPLE (GUESS) slide and the standalone formula triangle:
1. **Row proportions off** — the weighted G/U/E/S/S rows leave the slide unbalanced ("the slide just doesn't look that good"); revisit ROW_WEIGHTS and padding.
2. **Letter/label sizes** — the G/U/E/S/S badge and prompt text sizes don't sit well against the row heights; needs a consistent scale.
3. **Formula triangle renders weird** — distorted/tall at some sizes; `drawFormulaTriangle` in the E row uses a fixed `triW` with height capped by the row, so aspect ratio drifts; the standalone (practiceTriangle) subdivision lines also look wrong.
4. **Triangle doesn't subdivide beyond 3 symbols** — only top / bottomLeft / bottomRight are supported; equations with more components need either a proper n-way layout or the triangle suppressed entirely (>3 symbols → no triangle).
5. **Substitute/Solve rows print raw text** — "div" appeared instead of ÷: the G/U/S/S content rows render `r.content` raw with no `parseEq`/`normSym` pass, so `\div`/word operators never convert. These are equation fields and must typeset like the E row does. (This part is a plain logic fix, separable from the design pass.)
NOTE: the phase-3 stacked fraction itself (v = d over t) renders correctly on this slide — the issues are the surrounding layout, not the new fraction stack.

**Bug 61 — Greek symbol lost on Learn-F twin slide ("ho =" instead of "ρ =")** ✅ FIXED 2026-07-06 (renderer hardening, same morning)
Root cause: JSON authored `"\rho"` with a SINGLE backslash — JSON parsing turns `\r` into an invisible carriage return, so the renderer received CR+"ho" and the ρ never existed by the time normSym ran. Fix in build.js: `normSym` now repairs a control char whose escape letter + following letters spell EXACTLY a known symbol name (CR+"ho" → ρ, tab+"imes" → ×, etc.), with a loud console warning telling the author to use a double backslash. Exact-match only, so real newlines/tabs in prose are never touched. Also fixed in passing: Learn-F component unit line now typesets (`m/s^2` → `m/s²` via prettyText). AUTHORING RULE: backslash commands in lesson JSON must be double-escaped — `"\\rho"`, `"\\times"`, `"\\div"`. Demo deck rebuilt; ρ renders in both the equation and component boxes.

**Bug 60 — practiceTriangle: answers must be ON the slide, in navy/gold boxes under each question** ✅ BUILT 2026-07-10 — see the session log at the top of this file (logged from Patryk's Fraction-Demo eyeball 2026-07-06; original spec below, kept for reference)
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

**Bug 34 — annotated diagram breakdown slide type** ✅ BUILT 2026-07-12 as `annotatedDiagram` (Patryk picked Option B — numbered badges + key box)
`slideAnnotatedDiagram()` in build.js — base image (same `imageOrPlaceholder` convention as every other image slot) with numbered gold badges (`numberBadge()`) at fractional x/y positions on the image, plus a key box listing what each number means. Checked `DELBAR Chromatography.pptx` (the teaching deck, on Drive alongside `WS Chromatography.pptx`) for real content — its actual equipment diagram (slides 5–6) is drawn with edge labels + leader lines, not a base image, so it couldn't be reused directly as a base picture; used its 7 real equipment labels (water/solvent, glass beaker, splint, chromatography paper, coloured pigment/solute, coloured ink, pencil line) as realistic fixture content instead. Fixture + `npm test` coverage added. Worksheet side is a plain "label the diagram from the board" prompt for now — Patryk to confirm whether the numbered key should also print there. Docs in `slide-options-v4.md`.

---

## Session log — 2026-07-03 (Patryk observations; prev update did NOT clear backlog)

**Feature — Textbook references + book ordering** ✅ BUILT 2026-07-03 (spec: `specs/textbook-references.md`)
New shared matcher `references/textbook-index.js` (parses `textbook-index.md`, auto-matches lesson→book+pages via page-adjacency clustering, `meta.textbookRef` override, `primaryBook` for reviews). Consumers: build.js shows `Read more — [book] pp. X–Y` (dark blue + gold) top-right of the Apply title on the **slide + worksheet**; test-review-lesson.js auto-fills each subtopic `bookRef` (feeds subheadings + intro-slide chips); order-sheet.js orders **1 set** normal-matched / **2 sets** test-review / **none** for practical/test/unmatched/Y12. Unit test `test/textbook-index.test.js` wired into `npm test`; amylase fixture guards the Apply ref. CGP excluded (KS4 Kerboodle stands in). Both `textbook-index.js` + `textbook-index.md` added to the skill package.


**Bug 53 — equation rendering** ✅ FIXED 2026-07-03 (the equation overhaul)
Was: raw notation rendered literally on Review-lesson worked examples — `\times`→literal, `\div`→literal, `I^2`→literal; PPTX fraction tiny. Fix (all in build.js — no `fmt-equations.js`, that phantom stays dead): (1) `parseEq` `_SYM` map extended with operators `\times \div \pm \cdot \to \rightarrow \leq \geq \approx \neq \degree \deg \propto`; (2) equation runs render in **Cambria Math** (`FONT_MATH`) in PPTX, OOXML `m:f`/`m:rad` in Word; (3) PPTX diagonal fraction now full-size (was sub+sup on a 0.65 shrink); (4) `sqrt()`→radical seg → `√` glyph in PPTX / true vinculum in Word; (5) prose sinks that bypassed parseEq (`reviewRow`, indicative content, handwritten model answers, `workedExample` prompts/answer) now run `prettyText` = `normSym` (symbols + safe unit whitelist meters/second→m/s etc.) + `unicodeScript` (`^2`→²). Regression guard added to `test/run.js`: fails on raw `\times`/`\div` in output XML, asserts × ÷ ² √ typeset in bug-test deck. Decisions signed off: fixed diagonal (no true stacked bar in PPTX), OMML radical in Word / √-glyph in PPTX, extend-in-build.js (no separate module), small safe unit whitelist.

**Bug/Rule (folds into Bug 53) — operators in model answers must be symbols** ✅ addressed by the `normSym`/`prettyText` pass + SKILL.md authoring rule ("×" not "times", "÷" not "divide").

**Bug/Rule (folds into Bug 53) — units render as symbols, not words** ✅ small safe whitelist in `normSym` (meters/second→m/s, seconds→s) + SKILL.md rule to author symbols. Anything outside the whitelist must be authored as a symbol.

**Bug 57 — fixture/lesson tier shape mismatch: `.tiers.X.qs` silently not rendered** ✅ CLOSED — stale duplicate of the entry already ✅ above (2026-07-04 session, "Bug 57 ✅ build-time warn..."). `build.js:3113-3119` warns loudly whenever `.tiers` is seen under apply/review — the "warn, don't silently coerce" choice was already made. The TODO's grep-real-lessons task is done: searched every `*.json` in the repo for the literal string `"tiers"` — zero matches, no real lesson content is silently losing content this way.

---

**Bug 54 — Flowchart/cycle diagrams render as flattened image, not native PPTX shapes** ✅ FIXED 2026-07-05 (see session log above) — RENDERER
Six-step Learn flowcharts (e.g. "How Coronary Heart Disease Develops") render as a single embedded image instead of editable PPTX boxes/shapes. Causes text clipping/overlap (step 1 text overlapping its numbered badge). Fix: generate as actual PPTX shapes/text boxes, not a rendered image embed.

---

**Regression — image-description placeholder recurring** ✅ FIXED 2026-07-05 as Bug 58 (root cause: Learn-H/J dropped the description; see session log above) — was 🔁 RE-OPEN (bug # TBC, was in 28–52 range)
"[Image — add imageDescription to JSON]" still appearing on a Learn slide after the update. Needs re-investigation; confirm exact original bug number.

---

**Bug 55 — Learn-slide cap wrong for Review/revision lessons** ✅ CLOSED — stale duplicate of the entry already ✅ above (2026-07-04 session). `build.js:3133-3153` gives review/revision lessons a dedicated dispatch path that renders all Learn slides uncapped, confirmed by an explicit "Bug 55" comment in the code.

---

**Bug 56 — "Purple pen time" Core/Challenge table forces two columns when only one tier exists** ✅ CLOSED — stale duplicate of the entry already ✅ above (2026-07-04 session). `build.js:1301-1324` already has the conditional: single tier → one full-width table, both tiers → the two half-width columns.

---

**Feature/Rule — Revision lesson output set change** ✅ FIXED 2026-07-11 CHANGES THE THREE-FILE RULE for revision
The 2026-07-04 "Revision-lesson cluster" (session log above) had built the answer-sheet output only for `lessonType === "review"` — `lessonType: "revision"` lessons were still getting the standard `_support_worksheet.docx`. The backlog's earlier claim that "revision already suppresses support per Bug 51" could not be verified anywhere in the repo (no Bug 51 found) and was incorrect. Patryk confirmed 2026-07-11: revision lessons should get the same answer-sheet treatment as review lessons. Fixed: the `isReview` check in the output-file dispatch and the manifest-sidecar `isRev` check (both in `build.js`, near the end of the per-lesson build loop) now match `=== 'review' || === 'revision'`. Same fix also caught and corrected a pre-existing manifest bug: the sidecar's `isRev` check had been reading `L.lessonType` instead of `L.meta.lessonType` (always false, so every shipped review lesson's manifest had the wrong third filename listed) — now reads the correct field. `test/run.js`'s own expected-file assertion (which was still `review`-only) updated to match. `npm test` green.

---

**Feature/Rule — Model answer frameworks** ✅ BUILT 2026-07-04 (session log above), reach extended 2026-07-11
`answerReveal`/`answerFramework` (GUESS scaffold for calc answers, `markingPanelDocx` for 6-markers) already existed and worked, but were only reachable via the same `isReview` gate as the output-set change above — so they only fired for `lessonType: "review"`. The fix above extends their reach to `lessonType: "revision"` too; no new framework code was needed.

---

**Rule — 6-mark indicative content minimum** ✅ BUILT 2026-07-04 (session log above) — verified 2026-07-11, no gap
`checkSixMarkRule(L)` (`build.js:3058-3076`) runs unconditionally at `build.js:3113`, before the lesson-type dispatch — it already checks every lesson type, not just review/revision. Nothing further needed here.

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

**Feature ideas — Worksheet worked-example area** ✅ BOTH ALREADY BUILT — corrected 2026-07-11 (another stale entry caught by checking the code directly)
1. Question text at the top of the worked-example/your-turn box: already there — `slideWorkedExample` (`build.js:2251-2258`) prints a `WORKED EXAMPLE` / `YOUR TURN` header with each prompt shown in a box above the steps.
2. "Mark the answers" activity type: already built as `markTheAnswers` — slide (`build.js:2164` on, dispatched at `:3079`) AND worksheet version (`build.js:3728`). Covered by the `review-answers-test.json` fixture.

---

**Feature — bigFact slide type (U6)** ✅ BUILT 2026-07-11
High-impact single-concept Build slide: one huge number/fact (e.g. "37 °C") filling a navy slide, gold text, optional unit + one context line. `slideBigFact()` in `build.js`, dispatched from `renderBuildSlides` on `type: "bigFact"`. Schema: `{ "type": "bigFact", "fact": "37", "unit": "°C", "context": "The optimum temperature for amylase" }` — `unit`/`context` optional, guarded so an absent field never renders literal "undefined". Fact text auto-sizes (32-96pt) so a long fact string never disappears to an unreadably small size. Display-only, no worksheet output (confirmed: unmatched Build types already produce nothing on the worksheet side). Documented in `slide-options-v4.md`. Fixture coverage added to `bug-test.json` + `test/run.js` (fact/unit/context render, no literal "undefined", no worksheet leak). `npm test` green.

---

**Feature — Subject-specific top bar images** 🔧 AWAITING PATRYK'S SIGN-OFF — options + open questions drafted 2026-07-11 in `specs/design-pending-options.md` (aspect-ratio risk checked and cleared: the 5 candidate PNGs are 1500×120, matches the current 674×54 placement's ratio)
Currently one fixed Physics top bar reused for every lesson. Want: Chemistry top bar (idea: graphene / fullerene structure) and Biology top bar (idea: serotonin molecule or similar — not decided). Scope TBD: subject detection/specification per lesson + image storage location.

---

**~~Idea — Student first names + interests in the APPLY section (2026-09)~~ DROPPED 2026-10-03** (Patryk: no longer wanted; Mastering gets unfamiliar-context SCENARIO questions instead, and real exam questions go on the board after Apply). Original note kept for history: REFINES the existing "personalise questions" goal (see [[project-science-lesson]] line ~40, raised 2026-07-11)
Patryk's refinement: put student FIRST NAMES into the APPLY-tier questions specifically — as the people in the scenario/word-problem, optionally tied to that student's interest — to lift engagement. Does NOT need full personalisation, just first names dropped into scenarios. Privacy: first names only (Patryk flagged this himself). Source of names + interests: TBD (class lists still being finalised for 2026-27). Needs its own design pass; not scoped for immediate build.

---

**New project idea — Photograph-and-mark test papers (2026-09)** 💡 NEXT PROJECT (Patryk's own idea, needs its own project chat)
Workflow Patryk wants: (1) hold up a physical test paper and take a VIDEO flicking through it, papers stacked in ALPHABETICAL order (by student); (2) system splits the video into per-page photos, grouped back into each student's paper; (3) mark each paper automatically against an UPLOADED mark scheme; (4) output per-student marks/feedback. Open questions for the project chat: OCR/handwriting reading of pupil answers, page-to-student segmentation from one continuous video, mark-scheme matching (partial credit, method marks), and where results land (lesson-log? a markbook?). Relates to the exam-doc library work and the deferred markbook/seating-plan goal. Capture only — not started.

- **DONE 2026-10-22 (resource words added + test). Uploader moves school resources (2026-10-20):** building 7MLA Specialised Cells moved "Specialised cells table.pptx" and "Cell Vacancies apply task.pptx" into "Beechen Cliff Original Lesson" along with the DELBAR deck. Rule: only the school's lesson deck moves; resources never move. Fix the matcher in upload-to-drive.js; ask Patryk whether to move the two files back.
- **DONE 2026-10-22. Test-review Do Now false warning (2026-10-20):** CONTENT CHECK says "Do Now has 0 questions" on test reviews, which use doNow.task steps by design. Skip that check when doNow.task is set.
