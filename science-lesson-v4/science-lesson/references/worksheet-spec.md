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
- Support version (always built alongside standard): `..._support_worksheet.docx`
- NEVER "developing" or "reaching" in a filename — students see filenames.
- No class code, no date, in any filename.

---

## Support worksheet — auto-scaffolding rules

The support worksheet (`_support_worksheet.docx`) carries the same questions and all three tiers with scaffolding added automatically from content object data:

| What gets added | Trigger |
|---|---|
| KEY WORDS definition table | `wx.definitions[]` or falls back to `title.keywords[]` |
| Hint line under Do Now question | `doNow.questions[n].hint` |
| Write-lines under every Do Now question | always in support mode |
| Write-lines under True/False statements | always in support mode |
| Word bank on Developing Apply tier | `wx.wordBank[]` or `title.keywords[]` (if >2 terms) |
| Equation + units hint above GUESS scaffold | `q.equation` + optional `q.units` on Apply question |
| GUESS scaffold on calculation questions | `q.qType: "calculation"` |
| Sentence starters on extended-writing questions | `q.starters[]` |
| Answer boxes +30% larger | always in support mode |

"Support" = same questions, same tiers, scaffolding around them. Not fewer questions, not different content.

---

## Scaffolding rules — content-type based

Tag Apply/Build questions with `contentType` before assigning support:

| Content type | Developing | Reaching | Mastering |
|---|---|---|---|
| `new_procedure` | `guessScaffold('full')` — G+U pre-filled | `guessScaffold('backward-fade')` — G/U/Eq/Sub filled, Solve blank | `guessScaffold('backward-fade')` — first exposure |
| `known_procedure` | `guessScaffold('full')` until 3rd repeat, then `'blank'` | `guessScaffold('blank')` | None |
| `extended_writing` | Full structure guide + `sentenceStarters()` | Sentence stems (lighter) | `sentenceStarters()`, minimal |
| `routine_recall` | None | None | None |
| `new_vocabulary` | Word bank, full | Word bank only if term is genuinely new | None |

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

## Overflow priority

1. Cut Do Now · 2. Cut lowest-tier Build · 3. Cut answer lines · 4. Never cut Apply · 5. Never shrink below 11pt

Build once. Do not rebuild to fit.
