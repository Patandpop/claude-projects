# Science Lesson Template Reference — v4.1
## Beechen Cliff School · Updated from confirmed lesson builds + teacher review

---

## DESIGN CONSTANTS

| Element | Value |
|---|---|
| Nav bar | `#0D1B5E` navy · 6 equal-width tabs · TOP horizontal strip only |
| Active nav tab | stage colour fill + gold `#FABB2E` bold text |
| Inactive nav tabs | `#152347` slightly lighter navy + white text · same width as active |
| Content slide bg | `#EDF2FA` |
| Do Now bg | `#0D1B5E` full navy |
| Visualiser bg | `#4A148C` purple |
| Purple pen bar | `#6A0DAD` deep purple |
| Font | Trebuchet MS |
| Content box border | Gold `#FABB2E` **2pt** full border — always `width: 2` (25400 EMU), never 1 or 3 |
| Content box body | White `#FFFFFF` — never fill with theme colour |
| Accent strip | Thin gold `#FABB2E` bar `h=0.04"` between nav bar and first slide element |
| Bottom bar | `#0D1B5E` · `"Learning objective:  "` white bold 11pt + content white italic 11pt |
| Min margin | `0.45"` all sides |
| Usable height | ~5.6" after nav bar (0.55") and bottom bar (0.35") |

### Stage colours (nav active · section header bar · bottom bar)
| Stage | Colour |
|---|---|
| Do Now | `#0D1B5E` navy |
| Engage | `#1B5E20` green |
| Learn | `#F9A825` amber |
| Build | `#E65100` deep orange |
| Apply | `#B71C1C` dark red |
| Review | `#1B5E20` green |

### MCQ option colours (fixed)
| Option | Badge fill | Cell bg |
|---|---|---|
| A | `#C2185B` | `#FCE4EC` |
| B | `#1565C0` | `#E3F2FD` |
| C | `#2E7D32` | `#E8F5E9` |
| D | `#F57F17` | `#FFFDE7` |

---

## EDITABILITY RULE

Fill + text in one shape always. Table cell with fill + text inside. Never a separate coloured rect under a text box.

---

## STYLE RULES

1. **Nav tabs: equal width always.** Active tab = colour change only, not width change.
2. **Bottom bar format always:** `"Learning objective:  "` white bold 11pt + objective white italic 11pt.
3. **Left column (Do Now/Title): no school name.** "Beechen Cliff School / Science Department" is removed from the left column entirely. The space is used for a larger lesson title (28–34pt) and better-spaced objectives. School name appears only in the bottom bar area if anywhere.
4. **MCQ proportions:** question ~18% of usable height · options grid ~47% · answer box ~25%. Answer box is compact — 12pt text, max 1.5" tall, 1-sentence explanation. Options get the most space; they are the interactive part.
5. **Apply slide uses unified column boxes (slide 33 style).** Each tier = one large box containing all questions for that tier. Questions flow inside. No per-question individual boxes. This prevents overflow entirely — text reflows within the box rather than clipping.
6. **Apply variety:** three layout options exist (see Apply section). Don't always use the same one.
7. **Review slides fill the usable height.** Divide available height equally across all Q+A rows. `rowHeight = usableHeight / numRows`. Never leave dead space at the bottom.
8. **Visualiser: vertically centred.** All content centred in the 5.6" usable height. No empty bottom half.
9. **Question number visual hierarchy.** `"Q1  "` bold + question text regular weight, same font size.
10. **Examples/key terms strip on Learn slides** always has a small navy label pill (`"Examples:"` / `"Key terms:"`) before content. Never a plain unlabelled grey box.
11. **Left column text must not overflow.** If objectives don't fit at 11pt with generous spacing, shorten the objective text. Never let text overlap other elements.
12. **Content spacing rhythm.** Nav bar → first element: `0.12"`. Between elements: `0.1"`. Last element → bottom bar: `0.08"`. Consistent throughout.

---

## PRE-BUILT RENDERER FUNCTIONS

Define once at script top. Call by name on every slide. Never re-implement inline.

### `navBar(stage)`
Full-width strip `h=0.55"`. 6 equal-width tabs (slideWidth/6 each).
Active: fill=stage colour, text=gold `#FABB2E` bold 11pt.
Inactive: fill=`#152347`, text=white 10pt.
Stages: "donow"|"engage"|"learn"|"build"|"apply"|"review"

### `bottomBar(objectiveText)`
Full-width strip at bottom, `h=0.35"`, fill `#0D1B5E`.
`"Learning objective:  "` white bold 11pt + `objectiveText` white italic 11pt.

### `purplePenBar()`
Full-width bar, `h=0.38"`, fill `#6A0DAD`.
`"☞  Purple pen time — mark and correct your answers!"` white bold 13pt left-aligned.

### `sectionHeader(text, colour)`
Full-width bar, `h=0.38"`, fill=colour. White bold 13pt centred.

### `goldBox(x, y, w, h, content, opts?)`
Border `#FABB2E` 2.5pt, fill white, padding `0.08"`. Default 13pt.
opts: `{ fill, fontSize, bold, italic }`

### `navyHeaderBox(x, y, w, headerText, bodyLines[])`
Single combined shape (table):
- Header row: fill `#0D1B5E`, white bold 11pt
- Body: fill white, dark navy 12pt, gold `#FABB2E` full border

### `imagePlaceholder(x, y, w, h)`
Fill `#D0D0D0`, dashed border `#999999`, centred grey italic 11pt `"[IMAGE — teacher inserts]"`.

### `tierColumn(x, y, w, h, tier, questions[])`
Single unified tall box containing all questions for one tier.
Header: **full-width solid fill** (entire `w`), white bold 13pt centred, `h=0.42"`. NOT a pill — full column width.
Body: all questions flow inside as paragraphs.
`"Q{n}  "` bold 12pt + question text regular 12pt. Paragraph spacing between questions: 8pt.
Tier colours — header fill: Developing=`#2E7D32` · Reaching=`#E65100` · Mastering=`#B71C1C`.
Body fill: white. Gold `#FABB2E` 2pt border on full box.
**Key property:** text reflows within the box. No per-question individual boxes. No overflow risk.

### `reviewRow(y, h, tier, questionText, answerText)`
Two-cell row at position y, height h.
Left 35%: tier colour fill, white bold 12pt — verbatim question.
Right 65%: `#EDF2FA` fill, gold border — answer 12pt dark navy.
`h` is calculated as `usableHeight / numRows` before calling.

---

## TIER BADGES

**PPTX Apply slide:** Tier labels are full-width column headers — solid fill, white bold 13pt centred, `h=0.42"`, `w=colW`. NOT pills. Implemented via `tierColumn()` header row.

**DOCX worksheet only:** Narrow pill `width 1800 DXA`, no borders. See worksheet-spec.md.

Tier colours (both contexts):
| Tier | PPTX fill | DOCX fill |
|---|---|---|
| Developing | `#2E7D32` | `1E5C2D` |
| Reaching | `#E65100` | `C05A00` |
| Mastering | `#B71C1C` | `9B1B1B` |

---

## SLIDE TYPES

---

### TITLE  *(Do Now variant A is the canonical combined Title+DoNow slide)*
**Bg:** Full navy `#0D1B5E`. navBar("donow") all inactive.
**Layout:** Left 36% · divider `#FABB2E` 1pt · Right 62%

Left column (no school name):
- Lesson title: gold bold Trebuchet MS, 28–34pt (scale to fit, 2 lines max), positioned near top
- Year + subject: white 11pt below title
- Thin gold rule `#FABB2E`
- `"Learning Objectives:"` gold bold 11pt
- Objectives numbered, white 11pt, generous line spacing (max 3, keep short)
- Thin gold rule
- `"Key Words:"` white bold 9pt
- Keywords white 9pt, bullet-separated

Right column:
- DO NOW header bar (fill `#25408D`, gold text bold 14pt centred)
- Q1–Q5 goldBox rows: warm white `#F8F7F0` fill, gold border. Number badge circle (navy fill, gold number). `"Q{n}  "` bold 13pt + question text regular 13pt.

bottomBar(objective)

---

### DO NOW — Variant A: rows
**Bg:** Full navy. navBar("donow").
Same left/right layout as TITLE. School name NOT in left column.
Left: lesson title (gold, large) → year/subject → LO box → keywords.
Right: DO NOW bar → Q rows (warm white fill, gold border, number badge).
Optional subject pills for mixed-subject Do Nows only.
bottomBar.

**Confirmed font sizes:**
| Element | Size | Notes |
|---|---|---|
| School · Subject line | 11pt | `AABBD0`, not italic |
| Lesson title | 20–24pt | gold bold, scale to fit |
| LO label "Learning Objectives" | 15pt | gold bold |
| LO numbered objectives | 14pt | white, ≤8 words per line |
| Keywords | 13pt | `AABBD0`, NOT italic, NOT faint |
| DO NOW header | 15pt | bold gold |
| Question text | 16pt | wrap: true, valign: middle |
| Question number badge | 16pt | bold gold |

### DO NOW — Variant B: welcome column
**Bg:** Full navy. navBar("donow").
Left: school pill → welcome arrows → LO box → keywords.
Right: `"DO NOW — 5 minutes"` gold bar → thin blue accent bar → Q rows.
No school name at top of left column. No emoji. No timer.
bottomBar.

### DO NOW ANSWERS
**Bg:** Full navy. navBar("donow").
purplePenBar() at top.
Paired rows using `reviewRow()` pattern but with navy left cells:
- Left cell: navy `#25408D` fill, white bold 12pt — **verbatim question**
- Right cell: `#EDF2FA` fill, gold border — concise answer 12pt
Row heights: `usableHeight_after_purplebar / numRows`. Fill the slide. No dead space.
NEVER abbreviate the question.
bottomBar.

---

### ENGAGE
**Bg:** `#EDF2FA`. navBar("engage").
sectionHeader("ENGAGE — [TITLE]", green).
If hasImage: left 55% context goldBox · right 42% imagePlaceholder().
If no image: full-width context goldBox.
Context text: italic 13pt, 4 sentences MAX.
Video link goldBox: `"►  "` + hyperlinked descriptive text teal `#00838F`. NOT raw URL.
Discussion prompt goldBox: bold 14pt, warm fill `#FFF8E1`.
bottomBar.

---

### WHITEBOARD Q&A
**Bg:** `#EDF2FA`. navBar reflects position.
sectionHeader("[Subject] Round — Q[N] of [Total]", stage colour).
No AO1/AO2. No timer.
Question goldBox full width, `#EDF2FA` fill, bold centred 22–26pt, h≈2.5". Readable from back of room.
Answer goldBox full width, white fill, bold navy 15pt centred, h≈1.8". Core facts. Trim to 2 lines max.
bottomBar.

---

### LEARN — A: key_info
**Bg:** `#EDF2FA`. navBar("learn").
sectionHeader("LEARN — [TOPIC]", `#F9A825` amber).
Left 55%: navyHeaderBox stacked (1–2 concepts). 1 sentence per bullet. 12pt body.
Right 42%: image or imagePlaceholder(). Video link goldBox below if needed: `"►  Watch the [topic] video"` hyperlinked teal.
Examples strip (if used): small navy pill label `"Examples:"` white bold 9pt + examples text 10pt. Grey border.
bottomBar.

### LEARN — B: write_in_book
**Bg:** `#EDF2FA`. navBar("learn").
sectionHeader("LEARN — WRITE IN YOUR BOOK", `#F9A825`).
Large goldBox full width, `#FFFDE7` warm yellow fill: `"✍  Write in your book:"` red-orange bold 12pt → content 13pt generous line height.
bottomBar.

### LEARN — C: revision_table
**Bg:** `#EDF2FA`. navBar("learn").
purplePenBar().
Two equal-width tables side by side: CORE PAPER | EXTEND PAPER.
Green header rows (`#1B5E20`) white bold. Alternating white/`#F5F5F5` rows. Font 10–11pt.
bottomBar.

### LEARN — D: image_copy
**Bg:** `#EDF2FA`. navBar("learn").
sectionHeader("LEARN — [TITLE] (Copy into your book)", `#F9A825`).
Instruction goldBox: `"☞  [text]"` bold 13pt.
imagePlaceholder() centred (teacher inserts).
Optional tip 10pt below.
bottomBar.

---

### BUILD — practical
**Bg:** `#EDF2FA`. navBar("build").
sectionHeader("BUILD — [EXPERIMENT TITLE]", `#E65100`).
Italic intro 12pt.
Numbered step goldBoxes (1–4): equal height, orange number badge square, step text 12pt.
Warning goldBox at bottom: red border `#CC0000`, light red fill `#FFF3F3`, `"Warning:  "` red bold + text 12pt. Red border 3pt on warning only.
bottomBar.

### BUILD — mcq  *(slide 21 canonical — but fix proportions)*
**Bg:** `#EDF2FA`. navBar("build").
sectionHeader("BUILD — CHECK YOUR UNDERSTANDING", `#E65100`).

**Height allocation (strictly follow):**
- Section header: 0.38"
- Question box: ~1.0" (scales with question length, 2–3 lines at 14pt)
- Gap: 0.08"
- Options 2×2 grid: ~2.6" (this is the interactive element — give it the most space)
- Gap: 0.08"
- Answer box: ~1.1" max
- Gap to bottom bar: 0.08"

Question goldBox: `#EDF2FA` fill, question text bold 14pt.
Options 2×2: each cell uses MCQ colours. Letter badge (solid square, dark colour) 16pt bold left. Answer text 12pt regular. Gold border.
Answer goldBox: white fill. `"✓  Answer: [X]  —  "` bold 12pt + explanation 12pt regular. MAX 1 sentence explanation. MAX 1.1" height. If explanation is longer, trim it.
bottomBar.

### BUILD — mcq_image
Left 72%: question text + imagePlaceholder() + A/B/C/D labels.
Right 26%: navy fill answer box, gold border — letter 20pt gold + explanation 11pt white ≤3 sentences.
Bottom key strip.

### BUILD — sort  *(two slides)*
Task: sectionHeader + italic instruction + 2-col numbered goldBox grid.
Answers: Two solid-fill column headers + sorted goldBox cells below.

---

### APPLY — three variants (choose based on question length)

**Variant A: individual question boxes (DEFAULT)**
**Bg:** `#EDF2FA`. navBar("apply").
sectionHeader("APPLY — CHOOSE YOUR LEVEL", red) at top.
Three equal columns using `tierColumn()`.
- Column header: full-width solid fill `h=0.42"`, white bold 13pt centred
- Questions: **individual goldBox per question**, white fill, gold 2pt border. `"Q{n}  "` bold 12pt + question text regular 12pt.
- All columns same `colW`. Questions stack vertically with small gap between.
bottomBar.

**Variant B: two-tier + mastering full-width (use when Mastering has 1 long question)**
Top half: two equal columns — Developing left, Reaching right.
Bottom half: full-width Mastering box with gold border and red `#B71C1C` header.
Mastering question(s) have more horizontal space — no column width constraint.

**Variant C: card style (use for revision/whiteboard lessons)**
sectionHeader("APPLY — CHOOSE YOUR LEVEL", red) at top.
Three equal columns with tierHeader(). Individual question cards, font 11pt, questions SHORT (max 2 lines each). Cards equal height per row — aligned across columns.

**Choose based on question length:**
- Short questions (≤2 lines each): Variant C
- Normal questions: Variant A (default)
- One very long Mastering question: Variant B
bottomBar on all variants.

---

### VISUALISER  *(slide 28 canonical)*
**Bg:** Full purple `#4A148C`. navBar("build" or "apply").

All content vertically centred in 5.6" usable height. Calculate: total content height, then y_start = (5.6" - total) / 2 + nav_bar_bottom.
- `"IPEVO Visualiser"` gold bold 40pt centred
- Gap 0.2"
- Subtitle white 14pt centred (1 line, context-specific)
- Gap 0.25"
- goldBox centred, width 55% slide: hyperlinked URL teal `#00838F` 16pt underlined. Height 0.7".
- Gap 0.15"
- `"↑  Click to open"` white italic 11pt centred

Nothing else. No large white block. Link box is small and centred.
bottomBar (white text on purple).

---

### REVIEW — tier  *(slides 35/37/39/40/41/42 canonical)*
**Bg:** `#EDF2FA`. navBar("review").

Title row: `"Review — DEVELOPING/REACHING/MASTERING"` in tier colour bold 18pt, top-left. Year/class top-right small.
purplePenBar() immediately below title.

**Height calculation (always):**
```
usable = 5.6" - titleRow(0.35") - purplePenBar(0.38") - bottomBar(0.35") - gaps
rowH = usable / numQuestions
```
All rows same height. Rows fill the full usable area. No dead space.

Rows rendered using `reviewRow(y, rowH, tier, q, a)`:
- Left 35%: tier colour fill, white bold 12pt — **verbatim question, never abbreviated**
- Right 65%: `#EDF2FA` fill, gold border — concise answer 12pt dark navy, ≤3 lines

Review tab = green `#1B5E20`. Never grey.
bottomBar.

---

## LESSON TYPE → SLIDE SEQUENCE

| Type | Sequence |
|---|---|
| standard | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → Build MCQ×3 → Visualiser → Apply → Review×3 |
| revision | Title → DoNow → DoNow Answers → Learn-C → Whiteboard QA rounds → Apply → Review×3 |
| practical | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → Build practical → **Build Q&A answers** → **Visualiser** → Apply → Review×3 |
| whiteboard | Title → DoNow → DoNow Answers → Whiteboard QA rounds → Apply → Review×3 |

**⚠️ Visualiser slide is MANDATORY in standard and practical lessons — never omit.**
**⚠️ Practical lessons: Build Q&A answers slide (purple pen, Q/A pairs) comes before Visualiser, not after.**

---

## CONTENT OBJECT SCHEMA

```js
const lesson = {
  meta: { title, subject, class, type },  // type: standard|revision|practical|whiteboard

  title: {
    objectives: ["AQA verb + topic"],  // 3 max, short (fit left column at 11pt)
    keywords: ["term"],
  },

  doNow: {
    variant: "rows" | "welcome_column",
    objective: "string",
    questions: [ { q: "full text" } ],          // min 4
    answers:   [ { q: "verbatim q", a: "short teacher-voice" } ],
  },

  engage: {
    variant: "news_hook" | "prediction" | "video_hook",
    title: "ENGAGE — [TITLE]",
    body: "2–4 sentences",
    videoLink: { text: "descriptive text", url: "https://..." },
    prompt: "discussion question",
    hasImage: true | false,
  },

  learn: [{
    variant: "key_info" | "write_in_book" | "revision_table" | "image_copy",
    title: "LEARN — [TOPIC]",
    // key_info: boxes[{header, items[]}], imageRight, warningBox?
    // write_in_book: toWrite[]
    // revision_table: corePaper[{q,pages}], extendPaper[{q,pages}]
    // image_copy: instruction
  }],

  build: [
    // { variant:"mcq", question, options:{A,B,C,D}, answer, explanation }  ← 1 sentence only
    // { variant:"practical", intro, steps[], warning }
    // { variant:"sort", instruction, items[], categories:{A,B}, sorted:{A:[],B:[]} }
    // { variant:"visualiser", context }
  ],

  apply: {
    variant: "A" | "B" | "C",  // A=unified cols (default), B=2+mastering full, C=card style
    developing: ["Q1  text"],
    reaching:   ["Q1  text"],
    mastering:  ["Q1  text"],   // if 1 long question → variant B
  },

  review: {
    developing: [ { q: "verbatim from apply", a: "≤3 lines concise" } ],
    reaching:   [ { q: "verbatim from apply", a: "≤3 lines concise" } ],
    mastering:  [ { q: "verbatim from apply", a: "≤3 lines concise" } ],
  },
};
```
# Slide-Options Additions — paste into slide-options-v4.md to create v5

All new slides follow the house frame: navy `#0D1B5E` nav/header/bottom bars, white content boxes with gold `#FABB2E` 2pt borders, Trebuchet MS throughout, image placeholders where indicated. Dimensions assume `SW = 13.33`, `SH = 7.5`.

---

## BUILD — Misconception Callout

Purpose: directly confront a canonical wrong belief. Use whenever the topic has one (heavier objects fall faster; current is used up by components; cold "flows in"; sucking pulls liquid up a straw; mass is lost when things burn).

Layout:
- Header bar: "BUILD — What people get wrong" (navy, standard nav).
- Three stacked full-width panels, each ~1.5" tall, x = 0.6, w = SW − 1.2:
  1. **THE CLAIM** — white fill, **amber border `#E65100` 2pt** (the only non-gold border in the system; amber = warning, deliberately breaks the pattern so it registers). Claim text 20pt, italic, in quotation marks.
  2. **WHY IT FEELS TRUE** — white fill, gold border. 16pt body. One or two lines acknowledging the intuition.
  3. **WHAT'S ACTUALLY TRUE** — white fill, gold border, bold heading. 16–18pt body, ≤3 lines, core physics only.
- Optional bottom strip: ABCD prompt "Hold up A if you believed the claim before today" — reuses MCQ protocol strip.

Content object: `{ "type": "misconception", "claim": "...", "whyWrong": "...", "truth": "..." }`

---

## BUILD — Worked Example → Your Turn

Purpose: example-problem pair. Mandatory for any newly introduced calculation.

Layout: two columns, each w = (SW − 1.8) / 2.
- LEFT — "WORKED EXAMPLE" header strip (navy). Below it: prompt (16pt), then numbered solution steps (14–16pt), one physics operation per line (equation → substitution with units → answer with units). If `meta.annotation: true`, the steps panel is replaced by an empty `annotationZone` (see below) and the steps move to the slide notes — teacher works it live.
- RIGHT — "YOUR TURN" header strip (navy). Structurally identical question, different numbers/context. Blank white panel beneath (gold border) sized to match the worked side. No answer on this slide; answer appears on the following Review or a dedicated answer slide with purple pen bar.

Content object: `{ "type": "workedExample", "worked": { "prompt": "...", "steps": ["...", "..."] }, "yourTurn": { "prompt": "...", "answer": "..." } }`

Rule: the Your Turn question must be isomorphic — same method, same number of steps, no added twist. Twists belong in Apply.

---

## BUILD — Error Analysis ("Spot the mistake")

Purpose: students mark a deliberately wrong worked answer. Use the lesson AFTER a calculation method is introduced. Highest-value error types: unit not converted (g→kg, cm→m), equation rearranged wrongly, value substituted into wrong variable, answer missing units, premature rounding.

Layout:
- Header: "BUILD — Spot the mistake".
- Left panel (≈60% width): the wrong working, line-numbered, 16pt, monospace-feel via consistent line spacing. Exactly ONE error. White fill, gold border.
- Right panel: three prompts stacked — "Which line?" / "What's wrong?" / "Write the corrected line." Blank space beneath each (or whiteboard prompt for whiteboard lessons).
- Answer slide variant: same layout, error line highlighted with amber `#E65100` underline, corrected line shown beneath in green `#1B5E20`, purple pen bar present.

Content object: `{ "type": "errorAnalysis", "wrongWorking": ["line 1", "line 2", ...], "errorLine": 3, "fix": "corrected line", "errorType": "unit conversion" }`

---

## BUILD / APPLY — Graph Interpretation

Purpose: physics-specific graph reading. Mandatory at least once per motion / electricity / waves topic.

Layout:
- Left (≈55%): graph frame — white panel, gold border, drawn axes (navy 1.5pt lines) with axis labels from content object. Interior = image placeholder by default (Patryk drops in a real graph or sketches live if `annotationZone: true`). Gridlines optional, light grey `#E0E0E0`.
- Right (≈45%): three stacked question panels, escalating: (1) read a value, (2) describe/compare a region, (3) calculate from the graph (gradient or area). Full question text always, marks shown.
- Answer slide: same frame, answers ≤2 lines each, purple pen bar.

Content object: `{ "type": "graphInterpret", "graphLabel": "V-t graph for a skydiver", "axes": { "x": "time (s)", "y": "velocity (m/s)" }, "imagePlaceholder": true, "annotationZone": false, "questions": [ { "q": "...", "a": "...", "marks": 1 } ] }`

---

## COMPONENT — annotationZone

A reserved live-writing panel for the drawing tablet. Available on Learn, Worked Example, Graph Interpretation, and Visualiser slides via `"annotationZone": true`.

Spec:
- Size: 5.5" × 4.0" default (graph variant: fills the graph frame interior instead).
- White fill. **Dashed** gold border `#FABB2E` 1pt (dashed distinguishes "to be filled live" from finished content at a glance).
- Tiny label, top-left inside the zone: "worked live" — 9pt, grey `#9E9E9E`.
- Nothing else may be placed inside or overlapping the zone. Overflow rules treat the zone as immovable.

---

## COMPONENT — MCQ protocol strip (mandatory on every Build MCQ slide)

- Full-width strip above the bottom bar, h = 0.45", navy fill, white text 14pt, centred:
  `THINK (silent)   →   DECIDE   →   SHOW on 3 – 2 – 1`
- Arrows as text glyphs, not shapes. No animation.
- Corresponding MCQ answer slide: `CARDS DOWN` in bold at the left end of the header bar, before the slide title.

## COMPONENT — Do Now silent-entry footer (mandatory on every Do Now slide)

- Single line above the bottom bar, 12pt, grey `#616161`, centred:
  `Silent start · pen out · attempt all questions`
- Never varies in wording. Consistency carries the routine.