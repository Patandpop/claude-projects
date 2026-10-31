# Science Lesson — Slide Reference v4.1
# RENDERER IS FROZEN. Claude writes content JSON only. Build.js handles all layout, colours, and dimensions.

---

## HARD CONTENT RULES — live in SKILL.md (one home; do not re-copy here)

SKILL.md's HARD RULES section is authoritative for counts and policy (Do Now = exactly 6; MCQ = exactly 6, one block — experiment MCQs tagged about:"practical"; Apply min 3 per tier; **omit `review` — build.js copies Apply itself, 2026-07-12**; Learn max 4; Visualiser mandatory on standard/practical). This file only adds the per-slide character limits the renderer cannot fix for you:

- Apply, Do Now and Review character limits, the 16pt minimum and the practical image placeholder rule: SKILL.md HARD RULES.
- **Engage:** hook ≤120 chars · body/content ≤400 chars · instruction steps ≤100 chars, max 4
- **Engage reveal:** `reveal.question` ≤120 chars · `reveal.answer` ≤200 chars

---

## SLIDE CONTENT SCHEMAS (what fields to provide)

### TITLE + DO NOW (combined slide)
Auto-rendered from `meta`, `title`, and `doNow`. No extra fields. `doNow` fields: SKILL.md schema.
```json
{ "title": { "objectives": ["max 3, short — fit left column"], "keywords": ["..."] } }
```

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

**Learn extras (Lesson quality A, 2026-10-19).** Optional on Learn A unless noted:
```json
{ "variant": "A", "heading": "Atoms and elements",
  "definition": { "term": "Element", "text": "a substance made of only one type of atom.", "origin": "Latin elementum: a basic part",
                  "examples": ["iron (Fe)", "oxygen (O_2)"], "notExamples": ["water (H_2O)", "air (a mixture)"] },
  "examDefinition": { "term": "Specific heat capacity", "wording": "is the {1}energy{/1} needed to raise the temperature of {2}1 kg{/2} of a substance by {3}1 °C{/3}.", "board": "AQA", "asked": 7 },
  "misconception": { "wrong": "A compound is just a mixture of its elements.", "right": "In a compound the atoms are joined, in a fixed ratio." },
  "notes": "Speaker notes: the plain explanation, history, quotes (any Learn variant, and engage.notes)",
  "boxes": [ { "header": "Element", "items": ["No chemical reaction can split an {k}element{/k} into anything simpler."] } ] }
```
- `definition`: white card with a gold edge at the top (term, text, small origin). `examples` / `notExamples` add green / red boxes underneath: use for the one or two terms pupils mix up.
- `examDefinition`: "LEARN THIS WORDING" box at the top, one highlight colour per mark ({n}…{/n}), "AQA: asked 7 times" when `asked` is given. Use it instead of `definition` (not both). Wording from `exam-definition.js` only, never invented.
- `misconception`: red "✗ Not quite" (crossed out) → green "✓ Actually" across the bottom. The boxes above shrink to fit.
- `title.knownWords` [{term, definition}]: the dark "WORDS YOU KNOW" band on the objectives slide (after the Do Now answers).
- `title.sequence` { learn, build, apply }: the "THIS LESSON" strip at the bottom of the objectives slide (three boxes in the stage colours, always shown). One plain instruction each (rules in SKILL.md); missing lines are filled from the lesson.
- `definition.parts` [{part, means}] + `definition.sum`: word parts as navy chips under a Learn definition (poly "many" + mer "part" → a chain of many parts). Replaces the grey `origin` text when given.
- `{k}` key words: SKILL.md. MCQ `why`: mcq-rules.md section 6.

### LEARN B: keywords band
Schema in SKILL.md (`definitions`, `below`, `boxes`).

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

### LEARN L — labelled picture (dual coding)
```json
{ "variant": "L", "heading": "The animal cell", "embeddedImagePath": ".../01.jpg", "imageConfidence": "search",
  "labels": [ { "text": "nucleus", "job": "controls the cell", "sentence": "The nucleus holds the genes that control the cell.", "x": 0.4007, "y": 0.4712 } ],
  "build": true, "notes": "..." }
```
Drawn by `references/learn-pictures.js`. `x`, `y` = where the part is, as fractions of the PICTURE (0 = left/top, 1 = right/bottom), so the line ends on it at any size. Labels with x < 0.5 go in the left column, the rest on the right, stacked in the order of their points. `text` = the term (1 to 3 words), `job` = what it does (under 6 words), `sentence` = the full sentence shown when its part is built (and in the speaker notes). `build` (default true): one slide per label, then an all-labels slide; `false` = only the all-labels slide. 3 to 7 labels. Counts as one Learn item.

**Check every point before building (required):**
`python references/label_points.py picture.png --points '[["nucleus!",0.40,0.47],["cell membrane",0.04,0.55]]' --out check.png --snap edge`
then LOOK at check.png and adjust. `--snap edge` moves a point onto the nearest outline (membranes, walls, glass); end a name with `!` to keep a point where it is (parts in the middle of a flat area: nucleus, cytoplasm). It prints the final points to paste into `labels`. On faint microscope photos the snap can catch a fleck inside the cell: always look, and pin the point with `!` if needed.

**Photo + model (pair):** a real photo beside a model diagram, with ONE column of shared labels in the middle, each joined to its part in BOTH pictures (use when pupils will see the real thing, e.g. under a microscope). Never call the model a "biological drawing".
```json
{ "variant": "L", "heading": "Cheek cells: photo and model",
  "pair": { "left": { "path": ".../04.jpg", "caption": "Cheek cells, microscope photo" }, "right": { "path": ".../01.jpg", "caption": "Model diagram" } },
  "labels": [ { "text": "nucleus", "job": "controls the cell", "sentence": "...", "left": { "x": 0.255, "y": 0.649 }, "right": { "x": 0.401, "y": 0.471 } } ] }
```
A label may have only `left` or only `right` (a part one picture does not show). The label order is chosen so the lines cross as little as possible. Check the points on BOTH pictures with label_points.py.

**Drawn diagrams (when the school slides have no usable picture):** `python references/diagram_gen.py particles --kind element|molecules|compound|mixture --out box.png` or `python references/diagram_gen.py atom --model dalton|thomson|rutherford|bohr|chadwick [--shells 2,8,1] --out atom.png`. One house style (navy outlines, shaded balls, white background). It prints the exact points of the parts it drew (nucleus, electron, shell, proton, neutron, atom, molecule...), ready for `labels`. Embed with `"imageConfidence": "search"`.

### LEARN VARIANT SELECTION GUIDE
In SKILL.md ("Learn variant selection guide").

---

### BUILD — mcq
```json
{ "type": "mcq", "q": "question text (≤140 chars)",
  "options": ["A...", "B...", "C...", "D..."],
  "answer": "B", "explanation": "one sentence" }
```
Single slide. Answer box at bottom.

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
"You do" independent-practice step, completing the I-do → we-do → you-do sequence (Learn-F → `guessExample` → this). Left ~65%: up to 3 short calculation questions, one gold-bordered box each, each with its answer in a navy box underneath and a copy in speaker notes. Right ~35%: the same equation + formula triangle pinned as a live reference.
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
One slide (4.9 layout A "the stamp", test build, pick still open): pupils point A = true, D = false; each click stamps TRUE or FALSE on one statement, tints the row and shows a false one's correction underneath. No answers slide. `"reveal": "answers"` brings back the old separate answers slide.

### BUILD — predictThenCheck
```json
{ "type": "predictThenCheck",
  "setup": "1 sentence of scenario context (≤120 chars)",
  "prediction": "question students must commit to before seeing answer (≤100 chars)",
  "reveal": "what actually happens",
  "explanation": "why it happens" }
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

**Indicative-content chunking (`group`):** give each `indicativeContent` item an optional `group` (e.g. `"substitution"`, `"answer"`, `"conversion"`) to break the marking panel into labelled visual blocks — structure, not more text. Same `group` field drives the answer-sheet panel. **Panel sections (2026-07-05):** the marking panel renders INDICATIVE CONTENT → BANDS (from `levelDescriptors`) → EXCLUSIONARY CLAIMS (from `doesNotAward`) as three split blocks, PPTX and DOCX alike. **6-mark rule:** an extended (non-calculation) ≥6-mark question must carry ≥6 `indicativeContent` points (match points to marks) — shortfalls are logged non-fatally at build time, EXCEPT band-marked questions (`levelDescriptors` present), which are exempt. The handwritten model-answer working now spreads to fill the whole box with evenly parallel ruled lines (no trailing blank rules). The same `indicativeContent` / `levelDescriptors` / `doesNotAward` fields feed the review lesson's `_answers.docx` model-answer sheet — author them on the Apply/Review questions too. See **Answer sheet** in review-lessons.md.

**Test review lessons (2026-10-10):** model answers for a school test are full, well-written sentences, not terse (Patryk). See review-lessons.md "Test review lessons".

**Question picture from the paper (2026-10-12):** add `"snippet": "path/to/Q2a.png"`, or set `meta.snippetDir` to the folder `paper-snippets.py` wrote (looked up by `questionNumber`, e.g. `"3(a)(iii)"`). The slide then shows the REAL question, never stretched: a tall question fills the left (answer above the mark scheme on the right), a short one runs across the top (answer left, scheme right). A long scheme narrows the picture, then cuts bands to their first sentence, then splits into points | bands columns, so nothing runs off. No picture: an optional typed `"question"` goes across the top. `"snippet": false` turns a picture off for one item.

**Two-paper tests (KS3/KS4 Core + Extend):** `"core": "4(e)"`, `"extend": "1(e)"` on a modelAnswerReview item or an answerList row name the question on each paper (header, 17pt bar since 2026-10-15: "Core paper Question 4(e) · Challenge paper Question 1(e)" / "Core paper Question 4(f) (not on the Challenge paper)" / "Challenge paper Question 3 (not on the Core paper)"; the school's Extend paper is always "Challenge" on slides); `meta.snippetDir: { core, extend }` finds the picture (Extend's for a shared question). Answer lines are cut out of the pictures by `paper-snippets.py`.

**Where each mark came from (2026-10-12):** wrap the words that earn a mark in `{1}…{/1}`, `{2}…{/2}` (`{x}…{/x}` = words that lost a mark) and give the matching `indicativeContent` point `"mark": 1`. The slide draws a highlighter band in that mark's colour (six colours, ordered so neighbours never look alike: yellow, blue, pink, green, orange, purple; a 6-marker shows 6) with a numbered circle after it; the scheme point carries the same coloured number. Works in `modelAnswer` (string or calculation lines) and `markTheAnswers` sample `text`. Tags are stripped everywhere else (worksheets, answer sheet). Making the snippets (home PC, needs PyMuPDF): convert a COPY of the test .docx to PDF, then `python paper-snippets.py paper.pdf outDir` — question pictures + `snippets.json`, local only, never Drive.

### BUILD — answerList (review lessons)
Short test parts answered together: Q on the left, the answer in a navy/gold box on the right (revealed on click). Up to 6 rows per slide; more rows continue on the next slide. **2026-10-12:** a row with `"qn": "1(b)"` (looked up in `meta.snippetDir`) or `"snippet"` shows the paper's question picture on the left instead of text (3 rows a slide). Multiple choice: `"correct": "B"` states the letter big, then `a` (the option text / reason). In a review lesson there is no purple-pen bar (whole-paper review).
```json
{ "type": "answerList", "heading": "Q1 · QUICK ANSWERS", "rows": [ { "q": "Q1(b) When was the ice melting?", "qn": "1(b)", "correct": "B", "a": "temperature stays at 0 °C while it melts" } ] }
```

### REVIEW lessons — ebiTask and extension (top-level fields)
Drawn after the review slides, before the exam slide.
```json
"ebiTask": { "rows": [ { "q": "Q1", "task": "<front-of-test follow-up task, verbatim>", "pages": "P6.3 p.80" } ] },
"extension": [ { "subtopic": "Density", "pages": "P6.1 p.76",
  "questions": [ { "q": "<real exam question, verbatim>", "a": "<from its mark scheme>", "marks": 2, "ref": "doc#Q5d" } ] } ]
```
- **ebiTask:** purple steps strip (pick 3 EBIs → follow-up task in purple pen → support page → Extension) plus a Question | Follow-up task | Support pages table.
- **extension:** up to 4 columns, questions E1, E2 ... Each card is sized to its question. Split over two slides when one would be too small to read. Then an answers slide (E-number + subtopic | answer). The booklet prints the questions; the answer sheet prints the answers.

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
Peer-assessment activity: one exam question, 3–4 **realistically-flawed** sample
student answers, students mark each against the mark scheme. The samples print on
the worksheet, so the board does not repeat them (redesign 2026-10-12, Patryk: the
old board scheme was bloated and the 6-marker ran off the slide).
**Slide 1 (task)** = purple-pen bar, the question across the top, then the mark
scheme filling the slide in big type: MARK POINTS (numbered) | BANDS (first sentence
each) + NO MARKS FOR, in two columns when there are bands.
**Slide 2 (MARKS AWARDED)** = one row per student: their handwritten answer on the
left with the marks highlighted and numbered (`{n}…{/n}` tags, `{x}…{/x}` for a lost
mark; see modelAnswerReview), and on the right only what they scored: big mark +
level, "Marks for: 1 2 4" in the matching colours, ✗ misses, the teacher note.
Up to 3 students a slide (4 → two slides of 2). Untagged samples still work (the
right box lists ✓ hits instead). Same mark-scheme fields as `modelAnswerReview`;
number the points with `"mark": n`.
```json
{ "type": "markTheAnswers",
  "questionNumber": "3", "marks": 6,
  "question": "the exam question being marked",
  "instruction": "Mark each answer. Give it a level and a mark out of 6.",
  "levelDescriptors": [{ "level": "Level 3", "range": "5–6", "desc": "..." }],
  "indicativeContent": [{ "text": "marking point", "group": "collision theory", "mark": 1 }],
  "doesNotAward": ["misconception — from the MS's do not accept notes"],
  "samples": [
    { "label": "Student A", "text": "the sample answer, {2}words that earned point 2{/2}, {x}a mistake{/x}",
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
slides. Worksheet and answer sheet: worksheet-spec.md "markTheAnswers on the worksheet".

### LEARN — check (revision lessons, 2026-10-14)
Any Learn item may carry `check: [{ "q", "a" }]` (3 quick questions). In a `revision` lesson a CHECK slide (Q | answer, answers on click) follows that Learn slide. `doNow.task: ["step", ...]` replaces the Do Now questions with numbered steps (test and test-review lessons; no Do Now answers slide).

### BUILD — practical
Up to two practical items: SKILL.md.
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

**subSteps**: worksheet-spec.md.
**Variant A** = default (individual gold-bordered boxes per question, three tier columns).
**Variant B** = use when Mastering has 1 long question (>140 chars) — Mastering goes full-width bottom half.
**Variant C** = revision/whiteboard lessons only — never auto-selected.
Questions per tier and tier mix: SKILL.md.

### REVIEW
Do not author: SKILL.md ("Review: DO NOT AUTHOR IT").

### WHITEBOARD ROUNDS
```json
"whiteboard": { "rounds": [{ "q": "...", "a": "...", "subject": "optional — Physics / Chemistry" }] }
```

---

## LESSON TYPE → SLIDE SEQUENCE — lives in SKILL.md (one home; do not re-copy here)

The sequence table is in SKILL.md ("Lesson type → slide sequence"). Renderer-side notes only:
Visualiser is mandatory in standard, practical and **review** — never omit. **review**
(`lessonType:"review"`) renders **all** Learn slides (no 4-slide cap — Bug 55) and runs
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
- **correctTheStatement** — any lesson, misconception-based correction task; use instead of trueFalse when pupils should write the correction themselves (handwritten claim, correction below)
- **markTheAnswers** — peer-assessment on an exam question (esp. review/revision): 3–4 realistically-flawed sample answers marked against the mark scheme; reuses the mark-scheme fields, prints on the worksheet + answer sheet too
