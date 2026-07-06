# worksheet-spec.md — v2.1
# Authoritative worksheet rules — Beechen Cliff School
# RENDERER IS FROZEN. Claude writes content JSON; build.js handles all layout and rendering.

---

## HARD RULES

- No class name in title — topic only. No Name/Class/Date fields.
- Write in books by default — no answer boxes unless marks/diagram/table required.
- **Review/improvement booklets: NO answer boxes** — students answer in exercise books. Only add writing space if Patryk explicitly asks. A booklet saying "answer in your book" must never also contain answer boxes.
- Print font is sans-serif (BDA/accessibility). Body ≥11pt, left-aligned ragged-right (never justified), line spacing 1.5.
- Tier badges = narrow pills (NOT full-width bars on worksheets — full-width is PPTX Apply only).
- Word banks: Developing tier only; never when only 2 options or answer is obvious.
- **Worksheets carry the FULL lesson.** Min 3 Apply questions per tier. Practical lessons include: diagram box + results table + conclusion questions.
- Any question referring to a circuit/diagram gets a `diagramBox()` beneath it (`q.diagram: true`).
- **When adapting a resource Patryk provides, every question and diagram position must survive the port.** Cutting content is a build failure.

## FILE NAMING

- Standard: `[topic]_[ability_label]_worksheet.docx` — e.g. `parallel_circuits_mixed_ability_worksheet.docx`
- Support version (built alongside standard for every NON-review lesson): `..._support_worksheet.docx`
- Answer sheet (review lessons only, replaces the support slot): `..._answers.docx`
- NEVER "developing" or "reaching" in a filename — students see filenames.
- No class code, no date, in any filename.

---

## Support worksheet — auto-scaffolding rules

The support worksheet (`_support_worksheet.docx`) carries the same questions and all three tiers with scaffolding added automatically from content object data:

| What gets added | Trigger |
|---|---|
| KEY WORDS definition table | `wx.definitions[]` or falls back to `title.keywords[]` |
| Keywords box alongside Do Now (right column, gold border) | `doNow.keywords[]` or falls back to `title.keywords[]` |
| Hint line under Do Now question | `doNow.questions[n].hint` (REQUIRED on every Do Now question) |
| Write-lines under True/False statements | always in support mode |
| Word bank on Developing Apply tier | `wx.wordBank[]` or `title.keywords[]` (if >2 terms) |
| Equation + units hint above GUESS scaffold | `q.equation` + optional `q.units` on Apply question |
| GUESS scaffold on calculation questions | `q.qType: "calculation"` |
| Practical design prompts above write lines (5 lines) | `q.qType: "practical_design"` on Apply question — replaces answer box |
| Explanation prompts above write lines (4 lines) | `q.contentType: "extended_writing"` + `q.marks ≥ 5` — replaces sentence starters + answer box |
| Lettered sub-question breakdown | `q.subSteps: ["step a", "step b"]` on Apply question — each step gets 1 write line |
| Sentence starters on extended-writing questions | `q.starters[]` (skipped when B3/B4/B5 scaffold fires) |
| Answer boxes +30% larger | always in support mode (skipped when B3/B4/B5 scaffold fires) |

Scaffold priority (high → low): B3 practical_design → B4 extended_writing ≥5 marks → B5 subSteps → starters → answer box. Only the first matching scaffold fires per question.

All scaffolds apply across ALL tiers (Developing, Reaching, Mastering) on the support sheet. Students who need support need it throughout, not just on the lowest tier.

"Support" = same questions, same tiers, scaffolding around them. Not fewer questions, not different content.

---

## Answer sheet — model-answer frameworks (review lessons only)

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

### markTheAnswers on the worksheet + answer sheet

A `markTheAnswers` Build item (see slide-options-v4.md) also prints in the BUILD section of the
worksheet (via `buildQuestionBlocks`):

- **Standard / support (`developing`) mode:** the question + each sample answer in a bordered box
  (navy label strip "Student A/B/C…"), followed by a `Level: __  Mark: __ / N` line and an
  annotation blank — space for pupils to mark and level each answer.
- **Answers (`answers`) mode:** each sample box is followed by its `Awarded:` verdict (level · mark),
  the MPs it **hit** (green `•` bullets) and **missed** (red `•` bullets, prefixed "missed:"), the
  teacher `comment`, and finally the full `markingPanelDocx(item)` scheme. No ✓/✗ dingbats in DOCX
  (Century Gothic lacks them → font substitution) — colour + `•` distinguish awarded from not-awarded.

---

## Scaffolding rules — content-type based

Tag Apply/Build questions with `contentType` before assigning support:

| Content type | Developing | Reaching | Mastering |
|---|---|---|---|
| `new_procedure` | `guessScaffold('full')` — G+U pre-filled | `guessScaffold('backward-fade')` — G/U/Eq/Sub filled, Solve blank | `guessScaffold('backward-fade')` — first exposure |
| `known_procedure` | `guessScaffold('full')` until 3rd repeat, then `'blank'` | `guessScaffold('blank')` | None |
| `extended_writing` | Explanation prompts (if ≥5 marks) or sentence starters | Sentence stems (lighter) | `sentenceStarters()`, minimal |
| `routine_recall` | None | None | None |
| `new_vocabulary` | Word bank, full | Word bank only if term is genuinely new | None |

**qType values:** `"concept"` · `"calculation"` · `"practical_design"` · `"extended_writing"`

- `"practical_design"` — triggers method prompt scaffold on support sheet (replaces answer box)
- `"calculation"` — triggers GUESS scaffold
- `"extended_writing"` — same as `contentType: "extended_writing"` for triggering explanation prompts

**subSteps** — optional array of strings on any Apply question. Support sheet only: breaks question into lettered sub-parts (a)(b)(c...) each with one write line. Use for multi-step problems where isolating each step prevents students getting stuck. Does not appear on standard worksheet.

```json
"subSteps": ["Calculate the resultant force.", "State its direction.", "Explain what would change if the mass doubled."]
```

Don't add scaffolding a question doesn't need. Practical/method tables (`variablesTable`, `resultsTable`) apply identically across tiers.

---

## Worksheet Types

**A — Lesson companion (default):** Do Now + Build + Apply (D/R/M). Write in books. Word bank + starters at Developing only.

**B — Exam practice:** Apply only, mark allocations, answer boxes by marks, context boxes.

**C — Post-test review booklet:** Nav table at top, D/R/M sections, answer boxes (marks-sized), links bar per section. NO answer boxes by default.

**D — Multi-topic revision grid:** Two-column question blocks, navy/gold headers per question.

**E — Practical:** Variables table + results table + conclusion questions. Write in books on qualitative questions.

**F — General revision:** Heavy question bank across tiers, worksheet carries lesson.

**G — Video companion:** Numbered video questions, applied questions at end, no boxes.

**H — Cover / independent:** Full question bank, worksheet is the lesson.

---

## worksheetExtras fields

```json
"worksheetExtras": {
  "wordBank": ["term1", "term2"],
  "definitions": [{ "term": "keyword", "hint": "optional usage hint" }],
  "cloze": ["The _____ is the basic unit of life."],
  "clozeWordBank": ["cell"],
  "intro": "context box text (Type B/C/E)",
  "navRows": [{ "q": "Q3b", "topic": "Waves", "section": "Section 2" }],
  "links": { "developing": "Links to test paper: Q1 and Q2" },
  "results": { "headers": ["Distance (m)", "Time (s)"], "rows": 5 },
  "referenceData": {
    "headers": ["Distance (m)", "Time (s)"],
    "rows": [["0.10", "0.45"], ["0.20", "0.63"]],
    "note": "Use if your own results were not valid."
  },
  "videoQuestions": ["Q1 text"]
}
```

### referenceData — mandatory for any practical lesson

Any lesson with a `build practical` entry must include `worksheetExtras.referenceData` — pre-collected backup data for students whose own experiment produces invalid results.

Rules:
- Values must be realistic with natural variability (not rounded to 0.5 or 1)
- Same column headers as `worksheetExtras.results`
- At least 4 pre-filled data rows
- Never label it "correct results" — it is reference data
- Rendered as: section label → italic note → pre-filled results table

---

## Styling rules (build.js visual conventions)

| Element | Rule |
|---|---|
| Section dividers | Thin top rule (1pt #CCCCCC) + ALL CAPS label, bold, 10pt, #003366. Single rule only — no second rule below the label. |
| Write lines | Support worksheet only (`developing` mode — the internal mode string for the support sheet). Hairline top-border rows, 0.5pt #BBBBBB, 200 twips (~0.14") tall. Never on the standard worksheet. |
| Answer boxes | Both sheets. Bordered box sized by marks (1 mark → 1 line, ≤3 marks → 3 lines, >3 marks → 5 lines). |
| Marks annotation | Right-aligned paragraph immediately after the question, size 10pt, colour #888888, format `[X marks]`. |
| Tier badges | Narrow pill (1800 DXA), pastel background, tier colour text. Gold left border (3pt #FFD700) on the badge paragraph. |

---

## Overflow priority

1. Cut Do Now · 2. Cut lowest-tier Build · 3. Cut answer lines · 4. Never cut Apply · 5. Never shrink below 11pt

Build once. Do not rebuild to fit.
