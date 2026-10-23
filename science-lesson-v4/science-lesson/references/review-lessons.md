# Revision, test, test review and review lessons

> Part of the science-lesson skill, moved out of SKILL.md (2026-10-23) so it is read only when needed. Read it before building any revision, test, test review or review lesson. Everything in SKILL.md still applies unless this file says otherwise.

## Test-cycle lessons: standard opening (Patryk 2026-10-14)

Every lesson in the test cycle opens with a Do Now, then an **Engage slide that is the learning objectives** (`engage: { "title": "LEARNING OBJECTIVES", "hook": "<one line>", "content": "1. ...
2. ...", "imagePlaceholder": false }`).

| Lesson | Do Now |
|---|---|
| **Revision** (before the test) | 6 general questions on the topic that are NOT on the school's test (read the test in Admin/Assessment first). |
| **Test** (`lessonType: "test"`) | `doNow.task: ["Look over your notes in your book."]`, no questions. |
| **Test review** (marked tests back) | `doNow.task: ["Look over your test.", "Tick your WWWs and your EBIs on the front.", "Write your 3 areas of focus for today."]`, no questions. |

**Revision lesson shape:** it covers the topic, leaning towards what the test examines (especially Year 10 and below). Four rounds of ONE Learn slide on one concept, each with `check: [{q, a}] ×3` (quick reminder questions; the CHECK slide follows that Learn slide, answers revealed on click). Then an extended Apply done on their own across all four concepts; Reaching and Mastering stretch into the topic's other areas (e.g. energy resources, required practicals). Set `meta.examQuestion: false` when the only exam questions available are on the class's test. A Learn-A slide with `imagePlaceholder: false` uses the full width and shows up to 3 boxes.

## Review lesson specification

### Slide sequence
1. **Title / Do Now** (combined). Test-review lessons: the Do Now is the `doNow.task` steps below, then Engage = learning objectives (2026-10-14)
2. **Do Now Answers** (purple pen bar)
3. **Learn** (all Learn slides — typically one Learn-C 3-column revision table; **no 4-slide cap**, Bug 55)
4. **Build items** — only if authored; review-appropriate ones (`markTheAnswers`, `modelAnswerReview`)
5. **Visualiser**
6. **Apply** (booklet instructions by tier — not tiered Q&A)
7. **Review — Developing / Reaching / Mastering**

Engage on review lessons = the learning objectives only (2026-10-14; it was cut before). Kept: DoNow Answers and Visualiser (mandatory).
**Build items now render in review lessons** (the review dispatcher runs them) — the earlier "no Build
slides" only held because none were authored. Add a `markTheAnswers` Build item to run a mark-the-answers
peer-assessment inside a review lesson; it also prints on the booklet + answer sheet. Do not add MCQ/sort
"quiz" Build slides to a review lesson — they don't suit the booklet format.

`lessonType: "review"` in `meta`. Build the PPTX with the above sequence. Review lessons render **all**
Learn slides (no cap — Bug 55). The review lesson is NOT a standard lesson — never use `lessonType: "standard"` for a review lesson.

### Learn-C table — always 3 columns
- Column 1: topic description (the question area being tested)
- Column 2: booklet section reference (e.g. "Section 3")
- Column 3: heading is exactly **"Support pages"**: page numbers only (e.g. "p. 14, p. 16"), never spread codes like "C1.6" (Patryk 2026-10-15; build.js also strips them). Never "Textbook", never "Pages".

Single-test classes (one paper only): one question column ("Extend PAPER") + "Support pages". Multi-paper classes: ask Patryk which papers the class sat (Core / Extend / Challenge) before building — one column per paper.

**What the renderer draws (2026-10-10):** `learn[{variant:"C", corePaper:[{q, pages}], extendPaper:[{q, pages}]}]`. Each paper is one table headed CORE PAPER / CHALLENGE PAPER, with columns Question | **Support pages**. Put the topic in `q` ("Q2 Density of an irregular object"). The text is large when there are few rows.

### Test review lessons: model answers, EBI corrections, Extension (Patryk 2026-10-10)
Patryk's review lesson runs in this order:
1. Model answer for every test question, with the mark scheme beside it.
2. Support pages table.
3. Pupils correct 3 EBIs in purple pen, using the follow-up tasks on the front of the school's test.
4. Pupils who have finished do the Extension.
5. He helps pupils around the room.

- **KS3/KS4 tests come as a Core and an Extend paper (KS5 is one paper). Cover BOTH (Patryk 2026-10-12):** match the questions by content. Usually Core opens with 2 easy questions Extend does not have, and Extend ends with 2 hard ones Core does not have; the middle is shared under different numbers (P3 Particles: Core Q4 = Extend Q1, Core Q5 = Extend Q2), and a shared question can still have a part on one paper only (Core Q4(f), Extend Q2(c)). Order: Core-only first, then shared, then Extend-only. Give every item `"core": "4(e)"` and/or `"extend": "1(e)"`; the slide says, in a bigger bar, "Core paper Question 4(e) · Challenge paper Question 1(e)" or "Core paper Question 4(f) (not on the Challenge paper)" (slides say Challenge, never Extend, per the terminology rule). Model answers for Core-only parts come from the Core mark scheme. `ebiTask.rows` get `"paper": "Core"|"Extend"` (each paper's front cover has its own tasks; the slide shows one table per paper), and the Learn-C support-pages slide gets both `corePaper` and `extendPaper`. `meta.snippetDir` = `{ "core": folder, "extend": folder }`.
- **Model answers:** one `modelAnswerReview` per test part worth 2+ marks. Show the real question: set `meta.snippetDir` to the folder made by `paper-snippets.py` (home PC; claude.ai: skip, typed `question` instead), and tag where each mark came from with `{1}…{/1}` + `"mark": 1` on the scheme point (slide-options-v4.md, modelAnswerReview).
- **One highlight per mark (Patryk 2026-10-15):** a model answer worth N marks shows N highlights, `{1}` to `{N}`, each matched to a scheme point with `"mark": n`. A 6-marker shows 6, levelled or not (base them on the scheme's points in order). Never fewer.
- **Page numbers only (2026-10-15):** every `pages` field in a review lesson (support table, `ebiTask`, `extension`) is page numbers only: `"p. 78, p. 84"`, never `"P6.2 p.78"`.
- **Quick-answer headings** in the same plain words as the slides: `"Core paper Question 4 = Challenge paper Question 1 · quick answers"`, `"Challenge paper Question 3(b) (not on the Core paper) · quick answers"`.
- **Paper order (2026-10-15):** slides go through each paper part by part. A quick-answer table never holds a later part ahead of a model answer for an earlier one: split it (Q4(a)-(d) quick answers, Q4(e) and Q4(f) model answers, then Q4(g) quick answer). Home PC: run `node references/review-check.js lessons.json` before building; it must say clean.
  - **Model answers here are full, well-written sentences, not terse.** Patryk's rule; it overrides the short-answer rule below for review lessons.
  - The mark-scheme panel is verbatim from the school's mark scheme.
- **1-mark parts (MCQ: add `"correct": "B"`, and `"qn": "1(b)"` for the paper's picture):** one `answerList` Build item per question: `{ "type": "answerList", "heading": "Q1 · QUICK ANSWERS", "rows": [{ "q": "Q1(b) When was the ice melting?", "a": "B ..." }] }`. Q | answer rows, up to 6 a slide, answers revealed on click.
- **`ebiTask`:** `{ "rows": [{ "q": "Q1", "task": "<the test's front-grid follow-up task, VERBATIM>", "pages": "p. 80" }] }`. This gives the PURPLE PEN · CORRECT 3 EBIs slide plus the same table on the booklet.
- **`extension`:** `[{ "subtopic", "pages", "questions": [{ "q", "a", "marks", "ref" }] }]`, up to 4 subtopic columns, numbered E1, E2, ...
  - Use REAL exam questions: at home, run `node references/extension-pick.js <spec.json> --classes 9XS,9AS`. Never invent them.
  - Slides: Extension (one column per subtopic; split over two slides when the text would be too small) → Extension answers.
  - Booklet: the questions. Answer sheet: the answers.
- **Lesson shape:** a review lesson built this way needs no `apply` or `review`. Use `meta.worksheet: "C"` and `meta.examQuestion: false`.
- **Answer sheet:** prints every model answer plus its mark-scheme panel, the answer lists and the Extension answers.

### Review booklet (the `_worksheet.docx` output)
Set `worksheetExtras.worksheetType: "C"`. Do NOT set `navRows` — the nav/RAG table is suppressed entirely.

- **Title:** `[Year group] [Subject] — EOY Test Review Questions` — never include the word "Booklet"
- **No NAV/RAG table.** No intro paragraph above it. Students track progress on their own test paper. Never generate `navRows`.
- **Section heading format (always two lines):**
  ```
  Section N — Topic name
  Kerboodle: C1.6 p.14, C1.7 p.16
  ```
  Never add `(links to Q1 in your test)` or any cross-reference suffix after the topic name.
- **No phantom figure references.** Never write "Figure 1 shows..." or "The diagram below shows..." unless a diagram is actually embedded. Rephrase as a plain statement ("An atom of nitrogen has 7 protons...").
- **No answer space.** Students answer in exercise books. No answer boxes. No blank lines between questions. `[N marks]` sits immediately beneath the question text with no gap before the next question. Section heading → first question: one line gap maximum. Tier pill boxes: minimal padding.

### Output for review lessons
- PPTX + `[base]_worksheet.docx` (the booklet) + `[base]_answers.docx` (the model-answer sheet)
- No `_support_worksheet.docx` — the answer sheet takes the support slot (the booklet has no answer space, so the answer sheet is the mark scheme)
- No `_PTO` suffix anywhere in any filename — ever

---

## Answer sheet (review lessons only)

Review lessons (`lessonType: "review"`) build `[base]_answers.docx` — a model-answer / marking copy
that mirrors the worksheet's question order for the **Apply tiers and Build questions only** (each
question printed then its model answer directly below). **No Do Now section** (2026-07-05) — Do Now
answers live on the DoNow Answers slide, not the marking copy. It is generated automatically from the
same content object — no separate authoring. Built by `buildWorksheetChildren(L, 'answers')`.

**Framework is chosen automatically per question** (override with `q.answerStyle`: `"guess"` |
`"indicative"` | `"plain"` | `"graph"`):
- **Filled GUESS table** — `qType: "calculation"` (or any GUESS field present). Fills all five cells
  from `q.given` / `q.unknown` / `q.equation` / `q.substitute` / `q.solve` (falls back to `q.a` for
  Solve); the Solve cell is emphasised. Author equations with the math mini-syntax (× ÷ fractions
  typeset via Cambria Math).
- **Indicative-content panel** — `marks ≥ 6`, or `contentType: "extended_writing"`, or any
  `q.indicativeContent`. Navy/gold panel in three split sections (2026-07-05): **INDICATIVE CONTENT**
  (`q.indicativeContent[]` bullets; `<u>word</u>` renders underlined ONLY when the word HAS to be
  used) → **BANDS** (`q.levelDescriptors[]`) → **EXCLUSIONARY CLAIMS** (`q.doesNotAward[]`). Reuses
  the same fields as the on-screen `modelAnswerReview` / `markTheAnswers` slides.
- **Plain callout** — everything else: `q.a` (or `q.modelAnswer`) as a short navy-border answer.

**Model-answer authoring rules:** short and terse (EXCEPT test review lessons: full sentences, see above), operators as symbols (× not "times", ÷ not
"divide"), grounded in the real mark scheme — never invent marking content.

**6-mark rule:** an extended (non-calculation) question worth ≥6 marks must carry ≥6
`indicativeContent` points — match points to marks. Shortfalls are logged at build time (non-fatal).
**Exception (2026-07-05): band-marked questions** — if `levelDescriptors` (BANDS) are present the
rule is NOT enforced, because marks are lost via the bands, not the indicative-point count.

**Indicative-content chunking (`ic.group`):** give each `indicativeContent` item an optional
`group` (e.g. `"substitution"`, `"answer"`, `"conversion"`, or `"collision theory"`) to break the
panel into labelled visual blocks — both on the answer sheet and the `modelAnswerReview` slide.
`indicativeContent` items are either plain strings or `{ text, group?, dependentOn? }`.

**Mark-the-answers on the sheet:** a `markTheAnswers` Build item (slide-options-v4.md) also prints in
the BUILD section — the question, each sample answer boxed with a `Level: __  Mark: __ / N` line to
annotate; on the answer sheet each sample gains its `Awarded:` verdict, MPs hit/missed, teacher note,
then the full marking panel. This is the "mark the answers" peer-assessment activity.

---

### Answer sheet detail (moved word for word from worksheet-spec.md, 2026-10-23)

Review lessons (`lessonType: "review"`) build `_answers.docx` instead of a support worksheet. Built
by `buildWorksheetChildren(L, 'answers')` — it walks the SAME section/tier sequence as the worksheet
(single source of truth), printing each question then its model answer directly below. Top banner:
"MODEL ANSWERS — marking copy". **The Do Now section is skipped entirely in answers mode
(2026-07-05)** — the sheet is the mark scheme for the Apply/Build sections only; Do Now answers
already live on the DoNow Answers slide.

Framework per question is picked by `answerFramework(q)` (override with `q.answerStyle`):

| Framework | Trigger | Render |
|---|---|---|
| Filled GUESS table | `qType: "calculation"` or any GUESS field present | `guessScaffold('answer', …)` — all five cells filled from `q.given/unknown/equation/substitute/solve` (Solve falls back to `q.a`), Solve cell emphasised |
| Indicative-content panel | `marks ≥ 6`, `contentType: "extended_writing"`, or any `q.indicativeContent` | `markingPanelDocx(q)` — navy/gold, three split sections: INDICATIVE CONTENT (bullets chunked by `ic.group`; `<u>` = must-use word only) → BANDS (`levelDescriptors`) → EXCLUSIONARY CLAIMS (`doesNotAward`) |
| Plain callout | anything else | `q.a` / `q.modelAnswer` in a navy-border callout |
| Graph note | `qType: "graph"` | `q.a` + "see model graph on the slide" |

- Symbols/equations reuse `parseEq`/`toDocxRuns` (GUESS) and `prettyText` (prose) — × ÷ fractions and
  super/subscripts typeset exactly as on the slides.
- **6-mark rule:** an extended (non-calc) ≥6-mark question must carry ≥6 `indicativeContent` points;
  shortfalls are logged non-fatally at build time.
- The answer sheet carries no blank answer boxes, word banks, or support scaffolds — it is the mark
  scheme, not a pupil sheet.
