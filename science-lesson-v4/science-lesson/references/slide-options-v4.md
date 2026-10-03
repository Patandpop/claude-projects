# Science Lesson — Slide Reference v4.1
# RENDERER IS FROZEN. Claude writes content JSON only. Build.js handles all layout, colours, and dimensions.

---

## HARD CONTENT RULES — live in SKILL.md (one home; do not re-copy here)

SKILL.md's HARD RULES section is authoritative for counts and policy (Do Now = exactly 6; MCQ = exactly 4; Apply min 3 per tier; **omit `review` — build.js copies Apply itself, 2026-07-12**; Learn max 4; Visualiser mandatory on standard/practical). This file only adds the per-slide character limits the renderer cannot fix for you:

- **Apply question:** ≤140 chars · min 16pt (enforce before building — never let the renderer shrink)
- **Do Now question:** ≤120 chars
- **Engage:** hook ≤120 chars · body/content ≤400 chars · instruction steps ≤100 chars, max 4
- **Engage reveal:** `reveal.question` ≤120 chars · `reveal.answer` ≤200 chars
- **Review answer (when authored at all):** ≤160 chars, core info only (teacher elaborates aloud)
- **Practical/Build slides expecting apparatus MUST have an image placeholder** (set `imagePlaceholder: false` only when genuinely no apparatus)

---

## SLIDE CONTENT SCHEMAS (what fields to provide)

### TITLE + DO NOW (combined slide)
Auto-rendered from `meta`, `title`, and `doNow`. No extra fields.
```json
{ "title": { "objectives": ["max 3, short — fit left column"], "keywords": ["..."] },
  "doNow": {
    "variant": "A",
    "keywords": ["optional — overrides title.keywords for the support worksheet keywords box"],
    "questions": [{ "q": "...", "a": "...", "marks": 1, "hint": "REQUIRED — support worksheet shows as italic hint; write one for every question" }]
  }
}
```
Min 4 questions. Gold rounded-square number badges. `hint` is REQUIRED on every Do Now question — support worksheet shows it as an italic nudge below the question. If a question genuinely has no useful hint, write a thinking prompt ("Think about what energy stores are involved.").

Support worksheet: if `doNow.keywords[]` or `title.keywords[]` exists, a gold-bordered Key words box appears to the right of the Do Now questions. No write lines under Do Now questions (write in books).

### DO NOW ANSWERS
Auto-generated from `doNow.questions` — no additional fields needed.

### ENGAGE
```json
"engage": {
  "variant": "news | prediction | video | demo | mysteryImage | oddOneOut",
  "title": "optional — override the default ENGAGE-bar label. Omit by default; only set when the variant label genuinely doesn't fit. Keep it literal, not a clever rewrite.",
  "hook": "≤120 chars — stat, quote, or forced-choice. Renders large (20pt bold).",
  "content": "optional — 2–4 sentences of supporting context. Renders 14pt italic below hook.",
  "imagePlaceholder": true,
  "imageDescription": "describe exactly what image to source — never leave blank when hook calls for an image",
  "prompt": "discussion question pinned to bottom of slide",
  "videoLink": { "text": "descriptive text (not raw URL)", "url": "https://..." },
  "reveal": {
    "question": "optional, ≤120 chars. Presence triggers Layout A (question + answer side-by-side). Absence triggers Layout B (hook is treated as the question; answer spans full width).",
    "answer": "required when reveal is present, ≤200 chars. Renders navy background / gold text."
  }
}
```
`imagePlaceholder: true` (default unless explicitly false) → left 55% text, right 42% image placeholder.
Always set `hook` for new builds — prevents the flat single-paragraph-in-a-huge-box look.

#### `reveal` — hook/reveal modifier

Not a 7th variant. It's a navy/gold answer box that attaches to any of the 6 `engage.variant` values, for lessons where the payoff is "guess then find out" rather than plain context-setting. Adding `reveal` to the JSON is the only trigger — there is no auto-detection and no `reveal: false` flag; omit the key to suppress it.

- **Layout A** — `reveal.question` present: question renders large/prominent, reveal answer box sits beside it in the same bottom row.
- **Layout B** — `reveal.question` absent: `engage.hook` is treated as the question; reveal answer box spans the full width of the bottom row on its own.
- `build.js` renders a static box only — no PowerPoint animation is generated. Click-to-reveal animation is added manually in PowerPoint afterward.

**When to use `reveal` vs. the other variants** (from testing across forces, chemical reactions, lungs, circulatory system, punnett squares, diffraction, work done, climate change):

| Hook shape | Recommended | Why |
|---|---|---|
| Single clean factual "why/how" (e.g. why does an aerosol can explode in a hot car) | `reveal` | One correct answer, no need for a live investigation |
| "Guess the stat" (a number, distance, timescale) | `reveal` | Payoff is a fact check, not open debate |
| Open investigation with no single right answer, answer comes from doing the practical | `prediction` (no `reveal`) | Nothing to reveal yet — the practical *is* the answer |
| Multi-item sort/classify task | `oddOneOut` (no `reveal`) | Payoff is a set, not one fact |
| Live demo where a one-line mechanism follows | `demo` + `reveal` | Demo is the hook, explanation is the reveal |
| Image where the payoff is "what is this / why" | `mysteryImage` + `reveal` | Image is the hook, one-line answer is the reveal |

**`content` and `title` — less is more:**
- `content` (M8): optional, default-omitted. Only add it when there's genuine historical or real-world background worth including — never a manufactured sentence engineered to hint at the answer without giving it away. If it doesn't add real value, leave it out.
- `title` (M9): optional, default-omitted. Only set when the default variant label doesn't fit. Keep it literal and plain, not a stylized rewrite.

**Tone rules for `hook`, `reveal.question`, `reveal.answer`:**
- No em dashes.
- No exam-command verbs or phrasing ("State...", "Calculate...", "Determine...", "Using [equation], compare...").
- No slang or forced-casual tone ("OMG", "Bro", "you reckon").
- Never supply the data/criteria needed to solve it — that turns a spoken hook into a written exam question.
- Never narrate the mechanic ("Guess:", "have a guess before we find out") — the question already implies it.
- Forced-choice/ABCD phrasing is only valid when real selectable on-screen options are shown — never fake multiple choice in prose alone.
- The hook/question must actually be (or clearly imply) a question with a throughline into the lesson, not a flat statement.
- Must not presume content not yet taught in this lesson — except in `revision`/`whiteboard` lesson types, where testing recall of already-taught content is the point.
- `reveal.answer` must be teacher-voiced, like the hook — not flat/textbook phrasing.

**Worked example — converting a `news` engage block to `reveal`:**

Before:
```json
"engage": {
  "variant": "news",
  "hook": "A sealed aerosol can left in a hot car can explode — why?",
  "content": "As temperature rises inside a sealed container, gas particles move faster and collide with the walls harder. Pressure rises until the container fails.",
  "imagePlaceholder": true
}
```

After:
```json
"engage": {
  "variant": "news",
  "hook": "A sealed aerosol can left in a hot car can explode.",
  "imagePlaceholder": true,
  "reveal": {
    "question": "Why does the can fail?",
    "answer": "Heat speeds up the gas particles inside. They hit the walls harder and more often, and pressure builds until the can gives way."
  }
}
```
Note `content` was dropped entirely — the original sentence was already the answer, so keeping it would have spoiled the reveal. The em dash in the original hook is also removed per the tone rules above.

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
Produces CORE PAPER | CHALLENGE PAPER tables (navy header, gold title — house style). Purple pen bar auto-added. When only one of `corePaper`/`extendPaper` is supplied, a single full-width table is rendered instead of two half-width columns (no blank second column).

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

### MATH NOTATION (works in ANY text field since 2026-10-03, not only equation fields)
Equation fields render in **Cambria Math** (ships with every MS Office). In ordinary text (Learn boxes, MCQ options,
hooks, tables...) `^`/`_` become real raised/lowered text in the slide font and `{a/b}` a diagonal a⁄b; worksheets
use real raised/lowered runs too. Powers are drawn at 120% of the line size (PowerPoint/Word shrink them
to about 80%), and ² ³ ₂ characters typed by hand are converted to the same size. Links and file names are never touched, and a bare `/` in prose stays a slash. Mini-syntax:
`{num/den}` fraction (legible diagonal in PPTX, true stacked bar in Word) · `x^2` superscript ·
`x_2` subscript · `^{m s}` multi-char · `sqrt(...)` root (√ glyph in PPTX, true radical in Word) ·
`\greek` (`\Delta`, `\rho`) · operators `\times`→× `\div`→÷ `\pm`→± `\cdot`→· `\to`/`\rightarrow`→→
`\leq`→≤ `\geq`→≥ `\approx`→≈ `\neq`→≠ `\degree`/`\deg`→° `\propto`→∝.
**Rule (Bug 53):** author operators/units as symbols in model answers/working — × not "times", ÷ not
"divide", m/s not "meters/second" (or use the `\times`/`\div` commands). Don't hand-type ² ₂ glyphs —
write `^2`/`_2` and let the renderer place them.
**Word swaps (2026-10-03):** the renderer only turns words into symbols in a maths context: units straight
after a number ("100 metres" → "100 m") and "times"/"divided by" between operands ("V = I times R").
"Repeat three times" and "a few seconds later" are left as written. Typing × ÷ directly is still best.

### LEARN F — equation callout
```json
{ "variant": "F", "heading": "...",
  "equation": "V = I × R",
  "components": [{ "symbol": "V", "name": "Voltage", "unit": "volts (V)" }],
  "rearrangements": ["I = V / R", "R = V / I"],
  "example": "A 12 V battery drives 2 A. R = 12 / 2 = 6 Ω." }
```
Mandatory for any lesson introducing a new equation. Max 4 components.

### LEARN G — flow / sequence
```json
{ "variant": "G", "heading": "The Rock Cycle",
  "steps": [
    { "label": "Magma cools", "note": "igneous rock forms" },
    { "label": "Weathering", "note": "sediment produced" },
    { "label": "Compaction", "note": "sedimentary rock" },
    { "label": "Heat & pressure", "note": "metamorphic rock" },
    { "label": "Melting", "note": "back to magma" }
  ]
}
```
Zigzag / W-pattern flow diagram, **max 6 steps** — fills the whole slide. Rendered as **native, editable PPTX shapes** (roundRect step boxes, gold number badges, curved custom-geometry arrows that arch with the flow) — not a flattened image, so text stays editable and long `note` text is never truncated (Bug 54). Label bold, note italic. Aliases `"FLOW"` / `"SEQUENCE"` map to this variant. Use when content is a process, cycle, or causal chain (not a list of facts).

### LEARN H — video
```json
{ "variant": "H", "heading": "Resultant Forces",
  "videoLink": { "text": "BBC Bitesize: Resultant Forces (3 min)", "url": "https://..." },
  "toWatch": ["How forces add when acting in the same direction.", "What happens when forces oppose each other."],
  "prompt": "Pause at 1:45 — which way is the resultant?",
  "questions": [{ "q": "What is a resultant force?", "a": "The single force with the same effect as all individual forces combined." }]
}
```
Slide: left = gold box with video link + "While watching:" bullet list + optional italic prompt. Right = image placeholder.
`questions[]` appear on the **worksheet only** (VIDEO QUESTIONS section) — never on the slide. Write in books, no answer boxes.
Max 4 questions. `prompt` is optional — use for mid-video checkpoint questions only.

### LEARN I — flowchart (linear)
```json
{ "variant": "I", "heading": "The Nitrogen Cycle",
  "orientation": "vertical",
  "cycle": true,
  "nodes": [ { "label": "Nitrogen gas", "note": "unreactive N2" }, { "label": "Nitrates", "note": "fixed by bacteria" } ]
}
```
Linear node chain (aliases `"FLOWCHART"`). `orientation`: `"vertical"` (default) or `"horizontal"`. Arrows between nodes are **native gold arrow shapes**; `cycle: true` adds a curved native return arrow from the last node back to the first (Bug 54). Use G for a space-filling zigzag; use I for a simple straight chain or when a cycle-return arrow is wanted.

### LEARN VARIANT SELECTION GUIDE

| Content shape | Variant |
|---|---|
| Key facts, definitions, mechanisms | A — key info boxes |
| Copy notes into book | B — write in book |
| Revision paper navigation | C — revision table |
| Diagram to copy | D — image copy |
| Compare two things side by side | E — comparison table |
| New equation introduced | F — equation callout |
| Process / cycle / causal chain (space-filling) | G — flow / sequence |
| Linear chain or cycle with return arrow | I — flowchart |
| Watch a video in lesson | H — video |

---

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

### BUILD — guessExample
GUESS-scaffolded worked example on ONE slide ("we do" step). Distinct from `workedExample` (two-column Worked/Your-Turn) — this walks Given → Unknown → Equation → Substitute → Solve down the slide. Left column: gold rounded squares with G/U/E/S/S letters + prompts. Right column: one navy panel, gold text, gold divider rows; the Equation row gets extra height and carries a vector formula triangle drawn from native shapes.
```json
{ "type": "guessExample", "topic": "optional header suffix",
  "given": "p = 100 kPa, V = 0.5 m^3, T = 300 K",
  "unknown": "n (number of moles)",
  "equation": "pV = nRT",
  "equationSymbols": { "top": "pV", "bottomLeft": "n", "bottomRight": "RT" },
  "substitute": "n = (100000 × 0.5) ÷ (8.31 × 300)",
  "solve": "n = 20.1 mol" }
```
In `substitute`/`equation` prefer inline `÷` over `{a/b}` — these rows are short, and a one-line diagonal reads cleaner than a fraction here (the old tiny-fraction shrink is fixed, so `{a/b}` is legible too if you need it). Use for any lesson introducing a new equation, straight after the Learn-F intro.

### BUILD — practiceTriangle
"You do" independent-practice step, completing the I-do → we-do → you-do sequence (Learn-F → `guessExample` → this). Left ~65%: up to 3 short calculation questions, one gold-bordered box each, each with its answer in a navy box underneath (Patryk adds the reveal animation) and a copy in speaker notes. Right ~35%: the same equation + formula triangle pinned as a live reference.
```json
{ "type": "practiceTriangle", "topic": "optional header suffix",
  "questions": [{ "q": "...", "a": "...", "marks": 2 }],
  "equation": "pV = nRT",
  "equationSymbols": { "top": "pV", "bottomLeft": "n", "bottomRight": "RT" } }
```
Max 3 questions (hard cap). Worksheet carries the questions with working space.

### Formula triangle (`equationSymbols`, used by guessExample and practiceTriangle)
One quantity on top, **2 to 4 multiplied quantities along the bottom**. Use the `bottom` list for anything beyond three quantities:
```json
"equationSymbols": { "top": "Ep", "bottom": ["m", "g", "h"] }
"equationSymbols": { "top": "\\Delta E", "bottom": ["m", "c", "\\Delta\\theta"] }
```
The original `{ "top", "bottomLeft", "bottomRight" }` form still works for three quantities. The triangle only suits "one quantity = the others multiplied together". Leave `equationSymbols` out for anything else (`a = (v − u)/t`, `Ek = ½mv²`): the renderer suppresses a triangle that doesn't fit this shape and gives the equation the full row instead. Symbols accept the usual `\\Delta`, `\\rho`, `\\theta` commands. Labels shrink to fit their cell, so short symbols read best.

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

### BUILD — bigFact
Display-only — one huge number/fact filling a navy slide, gold text. No worksheet output.
```json
{ "type": "bigFact",
  "fact": "37",
  "unit": "°C",
  "context": "The optimum temperature for amylase" }
```
`unit` and `context` are optional.

### BUILD — reformatFlowchart
Students reorder scrambled process steps. Author `steps` in the CORRECT order — the
renderer shuffles them for display (question slide + worksheet show a fixed shuffle,
lettered A/B/C… not numbered, so the letters don't give the order away), then an
"ANSWERS" slide shows the same steps back in the correct order with native gold
arrows, each labelled with its step number and the letter it was shown as.
```json
{ "type": "reformatFlowchart",
  "heading": "How the heart pumps blood",
  "instruction": "Work out the correct order — write the letters in sequence.",
  "steps": [
    { "label": "Blood enters the right atrium", "note": "optional short note" },
    { "label": "..." }
  ] }
```
Up to 6 steps. `heading` and `instruction` are optional (sensible defaults used).

### BUILD — annotatedDiagram
Base image + numbered gold badges at labelled points, with a key box listing what
each number means (Bug 34). Same image convention as every other image slot
(`embeddedImagePath` + `imageDescription`) — ships a placeholder if no real image is
matched yet, same as Learn/Engage slides.
```json
{ "type": "annotatedDiagram",
  "heading": "Chromatography equipment",
  "imageDescription": "labelled chromatography apparatus: beaker, filter paper, splint, pencil line",
  "labels": [
    { "x": 0.5, "y": 0.85, "text": "Pencil line" },
    { "x": 0.5, "y": 0.55, "text": "Chromatography paper" },
    { "x": 0.3, "y": 0.9,  "text": "Small glass beaker" }
  ] }
```
`x`/`y` are fractions (0–1) of the image's own width/height, so badges stay on the
right spot however the image is scaled. Worksheet side is a plain "label the diagram
from the board" prompt — tell me if you'd like the numbered key reproduced there too.

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

Both `modelAnswerReview` and `correctTheStatement` share one handwriting engine.
Handwriting defaults to real editable PPTX text, with Caveat embedded in the
.pptx in the format PowerPoint loads (fixed 2026-10-02: before that the font
was ignored and handwriting showed as plain bold text in PowerPoint). Set
`"renderMode": "raster"` on the build item (or `"handwritingMode": "raster"`
in `meta`, for every handwriting slide in the lesson) to get a picture of the
same handwriting instead: identical layout, looks right on any machine or app,
but the words can't be edited on the slide (edit the JSON and rebuild).
Nothing else on the deck is affected either way.

### BUILD — modelAnswerReview
Test review Build slide — one slide per test question. Left: handwritten model
answer in Caveat (jittered, editable text, ruled lines beneath — like a real
exercise book). Right: navy/gold marking panel. **Content must be extracted
near-verbatim from the actual source mark scheme PDF Patryk provides — never
invent indicative content, marking points, or misconceptions.** Model answer
prose must be short, terse, natural student register, no em dashes — a real
student's exam-time answer, not polished writing. Hitting several (not all)
indicative content points is correct; "the less the better."
```json
{ "type": "modelAnswerReview",
  "questionNumber": "6.2", "marks": 6,
  "qType": "short | calculation | graph",
  "modelAnswer": "short terse prose (short/graph) OR array of working-step strings (calculation)",
  "jitterProfile": 0,
  "indicativeContent": [
    { "text": "marking point — use <u>word</u> for essential wording, **and**/**or** for logical connectors", "group": "substitution", "dependentOn": "MP1" }
  ],
  "levelDescriptors": [{ "level": "Level 2", "range": "4–6 marks", "desc": "..." }],
  "doesNotAward": ["plausible wrong answer / misconception — from the MS's own do not accept / ignore notes"],
  "ecfNote": "calculation only — how errors carried forward are still credited, per the source MS",
  "graphData": { "headers": [...], "rows": [...] }
}
```
`jitterProfile` (0–4, neat → messy) picks one of the 5 fixed handwriting presets — vary it slide to slide so a run of Build slides doesn't look identical. `qType:"graph"` renders a standard (non-handwritten) plot via `graph_gen.py` on the left instead of handwriting; the marking panel still applies. `levelDescriptors` only for level-of-response (extended-writing) questions. Conventions (`<u>`, `**and**/**or**`, `dependentOn`, `doesNotAward`) must trace back to what the actual mark scheme says — no invented shorthand, no arrows.

**Indicative-content chunking (`group`):** give each `indicativeContent` item an optional `group` (e.g. `"substitution"`, `"answer"`, `"conversion"`) to break the marking panel into labelled visual blocks — structure, not more text. Same `group` field drives the answer-sheet panel. **Panel sections (2026-07-05):** the marking panel renders INDICATIVE CONTENT → BANDS (from `levelDescriptors`) → EXCLUSIONARY CLAIMS (from `doesNotAward`) as three split blocks, PPTX and DOCX alike. **6-mark rule:** an extended (non-calculation) ≥6-mark question must carry ≥6 `indicativeContent` points (match points to marks) — shortfalls are logged non-fatally at build time, EXCEPT band-marked questions (`levelDescriptors` present), which are exempt. The handwritten model-answer working now spreads to fill the whole box with evenly parallel ruled lines (no trailing blank rules). The same `indicativeContent` / `levelDescriptors` / `doesNotAward` fields feed the review lesson's `_answers.docx` model-answer sheet — author them on the Apply/Review questions too. See **Answer sheet** in SKILL.md.

### BUILD — correctTheStatement
General-purpose build task, usable in any lesson (not just test review). 4
misconception-based **false** statements, generated the same way as
`trueFalse`/MCQ distractors. Handwritten claim above, correction directly
underneath in the same navy/gold box, on the **same slide** — no separate
answer slide.
```json
{ "type": "correctTheStatement",
  "instruction": "These statements are incorrect.",
  "jitterProfile": 3,
  "statements": [
    { "text": "incorrect statement (handwritten)", "correction": "the corrected version" }
  ]
}
```
Exactly 4 statements, rendered as 2 columns of 2 (4 lines per column, 8 lines total). No worksheet writing space — students correct in exercise books.

### BUILD — markTheAnswers
Peer-assessment activity (best in review/revision lessons): one exam question,
3–4 **realistically-flawed** sample student answers, students mark each against
the mark scheme. Two slides sharing ONE frame — **question full-width on top,
mark-scheme panel LEFT, samples RIGHT** — so the scheme and the answers are on
the same slide and the class can mark from the board alone (no worksheet needed):
**Slide 1** = samples as handwriting stacked on the right (`jitterProfile` varied
per sample so they read as different pupils). **Slide 2 (MARKS AWARDED)** = same
frame, right column becomes per-sample verdicts — awarded level/mark, ✓ hits /
✗ misses, teacher note. The panel is split into three sections: **INDICATIVE
CONTENT → BANDS → EXCLUSIONARY CLAIMS**. Reuses the SAME mark-scheme fields as
`modelAnswerReview`.
```json
{ "type": "markTheAnswers",
  "questionNumber": "3", "marks": 6,
  "question": "the exam question being marked",
  "instruction": "Mark each answer. Give it a level and a mark out of 6.",
  "levelDescriptors": [{ "level": "Level 3", "range": "5–6", "desc": "..." }],
  "indicativeContent": [{ "text": "marking point", "group": "collision theory" }],
  "doesNotAward": ["misconception — from the MS's do not accept notes"],
  "samples": [
    { "label": "Student A", "text": "the sample answer (handwritten)",
      "jitterProfile": 1, "awardedLevel": "Level 2", "awardedMarks": 3,
      "hits": ["MP the answer earned"], "misses": ["MP it missed"],
      "comment": "one-line teacher note / the misconception it shows" }
  ]
}
```
Author **realistically flawed** samples — each hits some MPs, misses others, and one
should carry a plausible misconception (never a polished perfect answer); short/terse
student register, no em dashes (grounded in the real mark scheme, not invented).
`awardedLevel`/`awardedMarks`/`hits`/`misses`/`comment` are the answer key — shown on
the MARKS AWARDED slide and the `_answers.docx` sheet only, never on slide 1 / the pupil
worksheet. `jitterProfile` defaults to a distinct value per sample slot; 3 samples is the
sweet spot (up to 4). **Underline rule:** `<u>word</u>` ONLY when the word HAS to be used
to earn the mark — never for emphasis. **Band-marked 6-markers:** when `levelDescriptors`
(BANDS) are present the ≥6-indicative-points rule is NOT enforced — marks are lost via the
bands, not the indicative count.
Renders on **review** slides (the review dispatcher runs Build items) and standard/practical
slides. On the worksheet it prints each sample in a box with a `Level: __  Mark: __ / N`
line to annotate; in `answers` mode it adds the verdict + `hits`/`misses` + the full
`markingPanelDocx` scheme.

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
Top-right of the Apply title (slide **and** worksheet) an automatic textbook reference —
`Read more — [book] pp. X–Y`, dark blue + gold — is shown when the lesson auto-matches
`textbook-index.md` (see SKILL.md `meta.textbookRef`). No match → nothing shown.
```json
"apply": {
  "variant": "A",
  "developing": [{ "q": "...", "a": "...", "marks": 2,
                   "qType": "concept | calculation | practical_design | extended_writing",
                   "contentType": "new_procedure | known_procedure | extended_writing | routine_recall",
                   "commonError": "...",
                   "diagram": true, "diagramLines": 8,
                   "starters": ["optional sentence frames"],
                   "given": "optional", "unknown": "optional", "equation": "F = ma", "units": "N",
                   "equationHint": "optional override of equation for support worksheet hint",
                   "subSteps": ["optional — lettered sub-questions on support sheet only"] }],
  "reaching":   [{ "q": "...", "a": "...", "marks": 3, "qType": "calculation" }],
  "mastering":  [{ "q": "...", "a": "...", "marks": 6, "qType": "calculation" }]
}
```
**qType guide:**
- `"concept"` — short recall or apply question, no calculation
- `"calculation"` — numerical answer; triggers GUESS scaffold on support sheet
- `"practical_design"` — write/plan a method; triggers method prompt above 5 write lines on support sheet
- `"extended_writing"` — multi-sentence explanation; when marks ≥ 5 triggers explanation prompt above 4 write lines on support sheet

**subSteps** — support sheet only: breaks question into lettered parts (a)(b)(c) each with one write line. Use when a multi-part question would cause students to miss steps without guidance.
**Variant A** = default (individual gold-bordered boxes per question, three tier columns).
**Variant B** = use when Mastering has 1 long question (>140 chars) — Mastering goes full-width bottom half.
**Variant C** = revision/whiteboard lessons only — never auto-selected.
Min 3 questions per tier. Developing ≥1 concept; Mastering ≥1 calculation (KS4) or extended reasoning (KS3).

### REVIEW
**Do not author (2026-07-12).** Omit the `review` field — build.js copies every Apply question and answer onto the review slides itself. Just ensure every Apply question carries its `a`. If a special case genuinely needs a hand-written review, the old shape still works (tier arrays mirroring Apply, answers ≤160 chars) but it is wasted output otherwise.

### WHITEBOARD ROUNDS
```json
"whiteboard": { "rounds": [{ "q": "...", "a": "...", "subject": "optional — Physics / Chemistry" }] }
```

---

## LESSON TYPE → SLIDE SEQUENCE — lives in SKILL.md (one home; do not re-copy here)

The sequence table is in SKILL.md ("Lesson type → slide sequence"). Renderer-side notes only:
Visualiser is mandatory in standard, practical and **review** — never omit. **review**
(`lessonType:"review"`) renders **all** Learn slides (no 4-slide cap — Bug 55), no Engage, and runs
Build items (so `markTheAnswers` / `modelAnswerReview` reach the review deck). Standard/practical/
annotation keep the 4-Learn cap.

---

## SLIDE TYPE SELECTION GUIDANCE

- **misconception** — available but NOT a default choice: Patryk consistently cuts the standalone "why it feels true" layout. Prefer `trueFalse` (heading "COMMON MISCONCEPTIONS"), `correctTheStatement`, `guessExample`, or `practiceTriangle` for Build checks
- **workedExample** — any newly introduced calculation; mandatory first-exposure
- **guessExample** — the "we do" worked example after a Learn-F equation intro; GUESS structure + formula triangle
- **practiceTriangle** — the "you do" step after `guessExample`: 3 short questions + pinned equation/triangle reference. Standard equation-lesson sequence: Learn-F → guessExample → practiceTriangle
- **errorAnalysis** — lesson AFTER a calculation method is introduced
- **graphInterpret** — mandatory at least once per motion/electricity/waves topic
- **predictThenCheck** — when key idea involves a mechanism students confidently mispredict (better than MCQ for those topics)
- **trueFalse** — several independent factual claims; use instead of errorAnalysis when statements don't form continuous worked lines
- **modelAnswerReview** — test review Build section, one per question; content sourced from the real mark scheme, never invented
- **correctTheStatement** — any lesson, misconception-based correction task; use instead of trueFalse when you want the correction shown inline rather than on a separate answer slide
- **markTheAnswers** — peer-assessment on an exam question (esp. review/revision): 3–4 realistically-flawed sample answers marked against the mark scheme; reuses the mark-scheme fields, prints on the worksheet + answer sheet too
