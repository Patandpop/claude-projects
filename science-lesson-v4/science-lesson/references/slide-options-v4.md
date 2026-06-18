# Science Lesson — Slide Reference v4.1
# RENDERER IS FROZEN. Claude writes content JSON only. Build.js handles all layout, colours, and dimensions.

---

## HARD CONTENT RULES

- **Apply:** min 3 questions per tier · ≤140 chars per question · min 16pt (enforce before building — never let renderer shrink)
- **Review:** mirror EVERY Apply question verbatim · same count per tier as Apply · fill slide, no dead space
- **Do Now:** min 4 questions · ≤120 chars each
- **Engage:** hook ≤120 chars · body/content ≤400 chars · instruction steps ≤100 chars, max 4
- **Build MCQ:** min 4 per lesson, each targeting a distinct idea/pitfall · single slide, no separate answer slide
- **Review answer:** ≤160 chars, core info only (teacher elaborates aloud)
- **Visualiser:** mandatory in standard and practical lessons — IPEVO URL is baked in, never write "[teacher inserts]"
- **Learn:** max 2 Learn slides per lesson
- **Practical/Build slides expecting apparatus MUST have an image placeholder** (set `imagePlaceholder: false` only when genuinely no apparatus)

---

## SLIDE CONTENT SCHEMAS (what fields to provide)

### TITLE + DO NOW (combined slide)
Auto-rendered from `meta`, `title`, and `doNow`. No extra fields.
```json
{ "title": { "objectives": ["max 3, short — fit left column"], "keywords": ["..."] },
  "doNow": { "variant": "A", "questions": [{ "q": "...", "a": "...", "marks": 1, "hint": "optional — support worksheet only" }] } }
```
Min 4 questions. Gold rounded-square number badges.

### DO NOW ANSWERS
Auto-generated from `doNow.questions` — no additional fields needed.

### ENGAGE
```json
"engage": {
  "variant": "news | prediction | video | demo | mysteryImage | oddOneOut",
  "hook": "≤120 chars — stat, quote, or forced-choice. Renders large (20pt bold).",
  "content": "2–4 sentences of supporting context. Renders 14pt italic below hook.",
  "imagePlaceholder": true,
  "imageDescription": "describe exactly what image to source — never leave blank when hook calls for an image",
  "prompt": "discussion question pinned to bottom of slide",
  "videoLink": { "text": "descriptive text (not raw URL)", "url": "https://..." }
}
```
`imagePlaceholder: true` (default unless explicitly false) → left 55% text, right 42% image placeholder.
Always set `hook` for new builds — prevents the flat single-paragraph-in-a-huge-box look.

### LEARN A — key info
```json
{ "variant": "A", "heading": "Topic label",
  "boxes": [{ "header": "Section header", "items": ["one sentence per bullet"] }],
  "keywords": ["optional — key terms strip at bottom"],
  "imagePlaceholder": true, "annotationZone": false }
```
Max 2 boxes left. Image placeholder right by default. Omit `keywords` if already embedded in box content.

### LEARN B — write in book
```json
{ "variant": "B", "heading": "...", "toWrite": ["line 1", "line 2"] }
```

### LEARN C — revision table
```json
{ "variant": "C",
  "corePaper": [{ "q": "Question text", "pages": "12–14" }],
  "extendPaper": [{ "q": "...", "pages": "..." }] }
```
Produces CORE PAPER | CHALLENGE PAPER table. Purple pen bar auto-added.

### LEARN D — image copy
```json
{ "variant": "D", "heading": "...", "instruction": "Copy this diagram into your book." }
```

### LEARN E — comparison table
```json
{ "variant": "E", "heading": "...",
  "comparison": {
    "aTitle": "Series circuit", "bTitle": "Parallel circuit",
    "rows": [{ "a": "Same current everywhere", "b": "Different currents in each branch" }]
  } }
```
Max 6 rows. Rows expand to fill slide (no dead zone at bottom).

### LEARN F — equation callout
```json
{ "variant": "F", "heading": "...",
  "equation": "V = I × R",
  "components": [{ "symbol": "V", "name": "Voltage", "unit": "volts (V)" }],
  "rearrangements": ["I = V / R", "R = V / I"],
  "example": "A 12 V battery drives 2 A. R = 12 / 2 = 6 Ω." }
```
Mandatory for any lesson introducing a new equation. Max 4 components.

### BUILD — mcq
```json
{ "type": "mcq", "q": "question text (≤140 chars)",
  "options": ["A...", "B...", "C...", "D..."],
  "answer": "B", "explanation": "one sentence", "commonError": "..." }
```
Single slide. Answer box at bottom — teacher adds entrance animation in PowerPoint for 3-2-1 reveal.

### BUILD — workedExample
```json
{ "type": "workedExample",
  "worked": { "prompt": "...", "steps": ["equation → substitution with units → answer with units"] },
  "yourTurn": { "prompt": "isomorphic question, different numbers", "answer": "..." } }
```
`annotation: true` in meta → steps move to slide notes, replaced by annotationZone for tablet use.

### BUILD — errorAnalysis
```json
{ "type": "errorAnalysis",
  "wrongWorking": ["step 1", "step 2", "wrong step", "step 4"],
  "errorLine": 3, "fix": "corrected step 3", "errorType": "unit conversion" }
```
Exactly ONE error. Use in the lesson AFTER a calculation method is introduced.

### BUILD — graphInterpret
```json
{ "type": "graphInterpret", "graphLabel": "V-t graph for a skydiver",
  "axes": { "x": "time (s)", "y": "velocity (m/s)" },
  "imagePlaceholder": true, "annotationZone": false,
  "questions": [{ "q": "...", "a": "...", "marks": 1 }] }
```
Max 3 questions. Answer slide auto-generated.

### BUILD — misconception
```json
{ "type": "misconception",
  "claim": "quoted claim students believe",
  "whyWrong": "why the intuition feels right (1–2 lines)",
  "truth": "what's actually true (≤3 lines, core physics/chem/bio only)" }
```

### BUILD — sort
```json
{ "type": "sort", "instruction": "Sort each item into the correct category.",
  "items": ["item 1", "item 2", "item 3"],
  "categories": { "A": "Group A label", "B": "Group B label" },
  "sorted": { "A": ["item 1"], "B": ["item 2", "item 3"] } }
```

### BUILD — trueFalse
```json
{ "type": "trueFalse",
  "statements": [
    { "text": "statement (≤110 chars)", "isTrue": true },
    { "text": "...", "isTrue": false, "correction": "the corrected version — never omit for false" }
  ] }
```
Min 4 statements. Mix ~40–60% false. Every false statement needs `correction`.

### BUILD — predictThenCheck
```json
{ "type": "predictThenCheck",
  "setup": "1 sentence of scenario context (≤120 chars)",
  "prediction": "question students must commit to before seeing answer (≤100 chars)",
  "reveal": "what actually happens",
  "explanation": "why it happens",
  "commonError": "optional" }
```
Best for lessons where the key idea involves a mechanism students confidently mispredict.

### BUILD — practical
```json
{ "type": "practical", "intro": "optional 1-sentence context",
  "steps": ["≤100 chars each", "max 4 steps"],
  "warning": "optional safety note",
  "imagePlaceholder": true,
  "questions": [{ "q": "...", "a": "..." }] }
```
Steps left ~56%, apparatus image placeholder right. `questions` produces a separate Q&A answers slide before Visualiser.

### VISUALISER (auto-generated — include only to customise subtitle)
```json
{ "type": "visualiser", "context": "optional subtitle, e.g. 'Model answers · Resultant Forces'" }
```

### APPLY
```json
"apply": {
  "variant": "A",
  "developing": [{ "q": "...", "a": "...", "marks": 2, "qType": "concept", "commonError": "...",
                   "diagram": true, "diagramLines": 8, "starters": ["optional sentence frames"],
                   "given": "optional", "unknown": "optional", "equation": "F = ma", "units": "N",
                   "equationHint": "optional override of equation for support worksheet hint",
                   "contentType": "new_procedure | known_procedure | extended_writing | routine_recall" }],
  "reaching":   [{ "q": "...", "a": "...", "marks": 3, "qType": "calculation" }],
  "mastering":  [{ "q": "...", "a": "...", "marks": 6, "qType": "calculation" }]
}
```
**Variant A** = default (individual gold-bordered boxes per question, three tier columns).
**Variant B** = use when Mastering has 1 long question (>140 chars) — Mastering goes full-width bottom half.
**Variant C** = revision/whiteboard lessons only — never auto-selected.
Min 3 questions per tier. Developing ≥1 concept; Mastering ≥1 calculation (KS4) or extended reasoning (KS3).

### REVIEW
```json
"review": {
  "developing": [{ "q": "verbatim from apply Q1", "a": "≤160 chars — core marking points", "commonError": "..." }],
  "reaching":   [{ "q": "...", "a": "..." }],
  "mastering":  [{ "q": "...", "a": "..." }]
}
```
Must mirror EVERY Apply question — same count per tier. Rows fill the slide (no dead space).

### WHITEBOARD ROUNDS
```json
"whiteboard": { "rounds": [{ "q": "...", "a": "...", "subject": "optional — Physics / Chemistry" }] }
```

---

## LESSON TYPE → SLIDE SEQUENCE

| Type | Sequence |
|---|---|
| standard | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → Build×4min → Visualiser → Apply → Review×3 |
| practical | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → Build practical → Q&A answers → Visualiser → Apply → Review×3 |
| revision | Title → DoNow → DoNow Answers → Learn-C → Whiteboard rounds → Apply → Review×3 |
| whiteboard | Title → DoNow → DoNow Answers → Whiteboard rounds → Apply → Review×3 |

Visualiser is mandatory in standard and practical — never omit.

---

## SLIDE TYPE SELECTION GUIDANCE

- **misconception** — whenever topic has a canonical wrong belief (heavier falls faster, current gets used up, cold flows in)
- **workedExample** — any newly introduced calculation; mandatory first-exposure
- **errorAnalysis** — lesson AFTER a calculation method is introduced
- **graphInterpret** — mandatory at least once per motion/electricity/waves topic
- **predictThenCheck** — when key idea involves a mechanism students confidently mispredict (better than MCQ for those topics)
- **trueFalse** — several independent factual claims; use instead of errorAnalysis when statements don't form continuous worked lines
