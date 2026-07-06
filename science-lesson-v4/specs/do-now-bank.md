# Do Now Bank — Spec
## Science Lesson Skill · Beechen Cliff

---

## Purpose

Bank all Do Now questions so that `build.js` can eventually select them automatically using spaced retrieval, instead of Patryk writing them manually each lesson.

---

## Data model

Each class has its own JSON file at `science-lesson/references/question-bank/<CLASS>.json`.

### Top-level file structure

```json
{
  "class": "8AB",
  "year": 8,
  "KS": "KS3",
  "questions": [ ...question objects... ]
}
```

### Question object schema

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Globally unique, class-prefixed: `"8ab-001"` |
| `text` | string | yes | The question as shown to students |
| `answer` | string | yes | Mark-scheme answer (shown on slide 2) |
| `type` | string | yes | `recall` · `define` · `calculate` · `explain` · `complete` |
| `subject` | string | yes | `Biology` · `Chemistry` · `Physics` |
| `topic` | string | yes | Curriculum topic tested, e.g. `"Electricity — Circuits"` |
| `KS` | string | yes | `KS3` · `KS4` · `KS5` (matches class year: Y7-9=KS3, Y10-11=KS4, Y12=KS5) |
| `AO` | string | yes | `AO1` (recall/define) · `AO2` (apply/calculate) · `AO3` (evaluate/analyse) |
| `dateAdded` | string | yes | ISO 8601 date: `"2026-06-23"` |
| `lessonRef` | string | yes | Topic lesson where this question first appeared as a Do Now |
| `usedIn` | string[] | no | Array of lesson names where this was used as a Do Now (for recency tracking) |

### Type definitions

| `type` | Typical stem | Example |
|---|---|---|
| `recall` | State, Name, Give, What is | "Name one non-contact force." |
| `define` | What is meant by, Define | "What is a gene?" |
| `calculate` | Find, Calculate, Work out | "Find the new pressure." |
| `explain` | Explain why, State one advantage | "State one advantage of a parallel circuit." |
| `complete` | Complete the equation/sentence | "Hydrocarbon + _____ → _____ + _____" |

---

## Selection algorithm

### Inputs

- `classId` — which bank file to use
- `lessonTopic` — the topic being taught TODAY (used only to **exclude** it from candidates)
- `mode` — `"normal"` or `"start-of-topic"`

### Normal mode (mid-topic)

Used when the lesson continues an existing topic.

1. Get candidate questions from topics taught in the **last 2–3 lessons** (use `lessonRef` to match).
2. Exclude questions whose `lessonRef` matches `lessonTopic` (no preview of today's content).
3. Exclude questions used in the **last 3 Do Nows** for this class (check `usedIn`).
4. Weight by recency:
   - 1 lesson ago: weight 3
   - 2 lessons ago: weight 2
   - 3 lessons ago: weight 1
5. Weighted sample without replacement → 5 questions.
6. If fewer than 5 candidates, backfill from older topics (no weighting).
7. If still fewer than 5, append from the empty-bank fallback list until 5 total.

### Start-of-topic mode

Used on the first lesson of a new topic.

1. Candidate pool = **all** questions in the class bank, excluding `lessonTopic`.
2. Exclude questions used in the last 3 Do Nows.
3. Target subject balance: 2 Biology · 2 Chemistry · 1 Physics (or nearest available). Adjust if one subject is underrepresented in the bank.
4. Target AO mix: 3 × AO1, 2 × AO2 (standard Do Now is recall-heavy).
5. Within each subject/AO bucket, prefer questions not used recently.
6. Sample to fill 5 slots.

### Empty-bank fallback

When the bank has insufficient questions (fewer than 5 candidates after all filters):

```json
[
  { "text": "What is the difference between a hypothesis and a theory?", "answer": "A hypothesis is an untested prediction; a theory is a well-tested explanation supported by evidence." },
  { "text": "Name the five steps of the scientific method.", "answer": "Observation, hypothesis, experiment, results, conclusion." },
  { "text": "What does a control variable do in an experiment?", "answer": "It is kept constant so it does not affect the dependent variable." },
  { "text": "What is the difference between accuracy and precision?", "answer": "Accuracy: how close to the true value. Precision: how repeatable the measurements are." },
  { "text": "State one way to make a scientific investigation more reliable.", "answer": "Repeat the experiment and calculate a mean." }
]
```

These are subject-neutral and always valid as backwards-looking science questions.

---

## build.js integration (future — not yet implemented)

When `build.js` processes a lesson's `doNow` block, it will support an `"auto"` mode:

```json
"doNow": {
  "variant": "A",
  "mode": "auto",
  "lessonTopic": "Formation of Fossil Fuels",
  "startOfTopic": true
}
```

If `mode` is `"auto"`, build.js will:
1. Load `science-lesson/references/question-bank/<meta.class>.json`.
2. Call `selectDoNow(bank, lessonTopic, startOfTopic)` → returns 5 question objects.
3. Map each to `{ q: text, a: answer }` for the existing `doNow.questions` renderer.
4. If `mode` is `"manual"` or absent, use the existing `questions` array as now (no change to current behaviour).

The selection logic lives in a separate `select-do-now.js` helper, not inside build.js, to keep the renderer clean.

---

## Review script

`node science-lesson/references/review-bank.js`

Reports:

1. **Total questions per class** — summary table.
2. **Duplicate pairs** — identical text (case-insensitive), exact match flagged as ERROR.
3. **Near-duplicate pairs** — Jaccard word similarity ≥ 0.85, flagged as WARNING.
4. **Missing required fields** — any question where `text`, `answer`, `type`, `subject`, `topic`, `KS`, `AO`, or `dateAdded` is absent or empty.
5. **Recent additions** — questions with `dateAdded` within the last 30 days (may need answer review).

Exit code 0 if no ERRORs; exit code 1 if any ERRORs found (warnings do not affect exit code).

---

## Class profile table

| Class | Year | KS | Notes |
|---|---|---|---|
| 7BYA | 7 | KS3 | Mixed ability |
| 7MLA | 7 | KS3 | Mixed ability |
| 8AB | 8 | KS3 | Higher |
| 8XP | 8 | KS3 | Lower mixed |
| 9AB | 9 | KS3 | Higher |
| 10S2 | 10 | KS4 | Higher triple |
| 10C4 | 10 | KS4 | Mid |
| 11C3 | 11 | KS4 | Mixed |
| 12D | 12 | KS5 | A-level Physics (definitions and equations focus) |

---

## File locations

```
science-lesson/references/
  question-bank/
    schema.json          ← field definitions and example
    8AB.json
    7BYA.json
    7MLA.json
    8XP.json
    9AB.json
    10S2.json
    10C4.json
    11C3.json
    12D.json
  review-bank.js         ← standalone review script
```

---

## Constraints

- Do Now questions **never** preview today's lesson topic.
- Students answer in exercise books — **no answer lines** on the worksheet.
- The bank is the source of truth; `build.js` JSON files do not duplicate question text.
- Question `id` values are permanent once assigned — never reuse or renumber.
