# Spec: Test Review Model Answer Slide

## Overview
A new shared handwriting-rendering component for `build.js`, plus two new slide types built on top of it. **Slide type A — Model answer review** shows a handwritten model answer next to a navy/gold marking-points panel styled on real AQA mark scheme conventions; used in the Build section of test review lessons, one slide per test question. **Slide type B — Correct the statement** shows four misconception-based incorrect statements (handwritten) with their corrections revealed directly underneath in navy/gold boxes; a general-purpose build task usable in any lesson, not just test review. Both slide types share the same handwriting-jitter engine — built once, used twice.

---

## Inputs

- **Handwriting engine**: Caveat (Google Font) + 5 preset jitter/rotation profiles, ranging from tight/neat to loose/messy. Profiles are fixed presets, not freshly randomised on every build (deterministic, reusable).
- **Slide type A**: an official mark scheme PDF (file path or attached), plus the question number(s) Patryk specifies to build. build.js extracts that question's answer/indicative content/level descriptor text from the MS.
  - Optional future input: an examiner report PDF, to refine "does not award" misconceptions and question-difficulty suggestions (nice-to-have).
- **Slide type B**: no external content input — build.js/Claude generates 4 misconception-based false statements using the same generation approach already used for `trueFalse`/MCQ distractor generation (`science-lesson/references/slide-options-v4.md`).

---

## Outputs

- New slide-type rendering in `build.js`, output as part of the normal PPTX build.
- Handwriting text stays **editable PPTX text** — Caveat font embedded directly into the `.pptx` package at build time so it renders correctly on any machine without the font pre-installed. Google Slides needs no extra handling since Caveat is a native Google Font there.
- **Slide type A**:
  - Prose/short-answer questions → handwritten model answer (black text on white, ruled lines beneath simulating exercise-book paper) + navy/gold marking panel.
  - Calculation questions → handwritten working steps (not just final answer), matching the MS's step-mark structure, with ECF respected.
  - Graph-answer questions (e.g. plot + line of best fit) → standard (non-handwritten) plotted graph via existing `graph_gen.py`, house style — marking panel still applies.
- **Slide type B**: one slide, 4 statements total, split into 2 columns of 2 (left column, right column). Each column stacks 2 incorrect-statement-plus-correction pairs — 4 lines per column, 8 lines total across the slide. Each unit = handwritten incorrect statement above, its correction directly underneath on the **same slide** as a navy/gold reveal box (not a separate reveal slide). Header instruction, e.g. "These statements are incorrect." No worksheet/writing space — students correct in exercise books.

---

## Must-haves

1. **M1** Shared handwriting-render component: Caveat font only (no font-switching), 5 preset jitter/rotation profiles varying in magnitude from neat to messy, applied per statement/answer.
2. **M2** Caveat is embedded into the `.pptx` package at build time so it displays correctly on any PowerPoint install without requiring separate font installation. Google Slides requires no extra handling (native Google Font).
3. **M3** Fallback: if font embedding proves unreliable, rasterize the handwriting text to SVG/PNG for that element only — the rest of the deck stays normal editable text.
4. **M4** Slide type A: one slide per test question.
5. **M5** Slide type A input is an official mark scheme PDF (path or attached) + specified question number(s); build.js extracts that question's content from it.
6. **M6** Slide type A prose/short-answer model answers are handwritten (Caveat, jittered), black on white, with ruled lines beneath. Text is short, terse, natural student register — no em dashes, no flowing linked "essay" prose. It hits several (not necessarily all) indicative content points concisely, the way a real student would under time pressure. "The less the better."
7. **M7** Slide type A marking panel (navy background, gold text) shows indicative content pulled near-verbatim from the source mark scheme, preserving real AQA conventions: <u>underline</u> = essential wording, **or** = accepted alternative, solidus (/) = alternative words, bold **and** = both parts required, brackets = non-essential context, "allow"/"ignore"/"do not accept" annotations, "dependent on MPn" for linked marks. No invented dependency notation, no arrows.
8. **M8** For level-of-response (extended answer) questions, the marking panel includes the level descriptors exactly as given in the source MS (e.g. Level 2 4–6 / Level 1 1–3 / 0 no relevant content).
9. **M9** Marking panel includes a "does not award" section listing common wrong answers/misconceptions that look plausible but score 0, sourced from the MS's "do not accept"/"ignore" notes where present.
10. **M10** Slide type A calculation questions show handwritten working steps matching the MS's step-mark structure. ECF (error carried forward) is respected — an early wrong step doesn't block credit for correctly-executed later steps, matching the source MS's own ECF/"allow" notes.
11. **M11** Slide type A graph-answer questions render as a standard (non-handwritten) graph via existing `graph_gen.py` in house style — no jitter engine involved. Marking panel still applies with the same navy/gold conventions.
12. **M12** Slide type B: one slide per build task, 4 statements total, split into 2 columns of 2 statements each — each column stacking 2 incorrect-statement-plus-correction pairs, i.e. 4 lines per column, 8 lines total across the slide.
13. **M13** Slide type B statement content is generated (not manually authored) using the same misconception-generation approach as `trueFalse`/MCQ distractor generation — but all 4 statements are false (not a true/false mix).
14. **M14** Slide type B layout: each unit = handwritten incorrect statement (Caveat, jittered) directly above its correction, shown on the **same slide** (not a separate reveal slide) as a navy box / gold text, matching house style.
15. **M15** Slide type B includes a header instruction (e.g. "These statements are incorrect.").
16. **M16** Slide type B has no worksheet/writing space — students correct statements in exercise books.
17. **M17** Slide types A and B both consume the same shared handwriting-render component (M1) — implemented once, not duplicated.

---

## Nice-to-haves

- **N1** Auto-suggest which questions to build slides for when Patryk doesn't specify question numbers — favouring long calculation questions, 6-mark/LoR questions, graph questions, or historically-hard questions.
- **N2** Accept an examiner report PDF as a secondary optional input to refine "does not award" misconceptions and question-difficulty suggestions.
- **N3** (Note, not build) `graph_gen.py` output can be hard to read in bright classrooms — log as a future backlog item for improving contrast/visibility. Not part of this build.

---

## Out of scope

- A new hand-drawn/jittered graph rendering engine — graph answers use the existing standard `graph_gen.py` output as-is.
- OCR or scanning of actual student scripts.
- Auto-selection of exam questions beyond the N1 heuristic — v1 requires Patryk to specify question numbers.
- Rewriting or overriding indicative content beyond what the source mark scheme provides.
- Font-blending/interpolation between multiple typefaces to fake a "range" of handwriting — rejected; range comes from jitter magnitude only, on a single font.
- Homemade Apple and Indie Flower fonts — rejected in favour of Caveat only.

---

## Integration points

- `science-lesson/references/build.js` — new slide-type handlers added alongside existing patterns (`goldBox`, `navyHeaderBox`, `reviewRow`, etc.).
- `science-lesson/references/slide-options-v4.md` — existing `trueFalse`/misconception/MCQ slide-type definitions, whose statement-generation logic Slide type B reuses.
- `science-lesson/references/graph_gen.py` — reused as-is for Slide type A graph-answer questions.
- Caveat (Google Font) — embedded into the `.pptx` package at build time.
- `specs/test-review-lesson.md` — the lesson generator that will consume Slide type A within its Build section for test review lessons (this spec does not modify that generator, but makes the slide type available to it).

---

## Success criteria

- Given a real official mark scheme PDF + a specified question number, build.js produces a Slide type A model-answer slide where: the model answer is short, natural, terse (no em dashes), and hits several indicative content points concisely; the marking panel shows indicative content pulled from the actual MS text preserving underline/or/allow/ignore/do-not-accept/dependent-on-MPn conventions; level descriptors are shown for LoR questions; a "does not award" section lists common misconceptions.
- Calculation questions show handwritten working steps with correct ECF behaviour.
- Graph questions render as a standard (non-handwritten) plot via `graph_gen.py`.
- Slide type B shows 4 misconception-generated false statements (2×2 layout), each with its correction directly underneath in navy/gold, on the same slide, with a header reading "These statements are incorrect" (or similar), and no worksheet writing space.
- Handwriting text uses Caveat only, varied via the 5 preset jitter profiles (not freshly randomised per build), and displays correctly both in PowerPoint (via embedded font) and Google Slides (native Google Font support).
- If font embedding proves unreliable in testing, the build falls back cleanly to a rasterized image for just the handwriting element, without affecting the rest of the deck.
