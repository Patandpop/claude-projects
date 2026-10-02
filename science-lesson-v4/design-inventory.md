# Design Inventory: every slide the renderer can produce

Source of truth: `science-lesson/references/build.js` (4451 lines, frozen), cross-checked
against `science-lesson/references/slide-options-v4.md` (v4.1).
Written 2026-09-03 as the "before" picture for a visual reskin. Nothing in build.js was changed.

This document covers the **PowerPoint** side only. The two Word documents per lesson
(`_worksheet.docx`, plus `_support_worksheet.docx` or `_answers.docx`) come from a separate
renderer inside the same file and are not inventoried here.

---

## 0. How a deck is assembled

`buildPptx()` reads `meta.lessonType` and follows one of five sequences. This matters for a
reskin because some slide types only ever appear in certain lesson types.

| `lessonType` | Slide sequence |
|---|---|
| `standard`, `practical`, `annotation` | Title+DoNow, DoNow Answers, Engage, Learn (**capped at 4** unless `meta.uncapLearn`), Build items, Visualiser, Apply, Review, Image Bank |
| `revision` | Title+DoNow, DoNow Answers, Learn (uncapped), Whiteboard rounds, Visualiser (only if authored), Apply, Review, Image Bank |
| `whiteboard` | Title+DoNow, DoNow Answers, Whiteboard rounds, Visualiser (only if authored), Apply, Review, Image Bank |
| `review` | Title+DoNow, DoNow Answers, Learn (uncapped), Build items, Visualiser, Apply, Review, Image Bank |
| anything else | Treated as `standard`, with the Learn cap of 4 restored |

Facts that affect layout everywhere:

- Slide size is fixed at **13.33in x 7.5in** (`LAYOUT_WIDE`). `SW` and `SH` are the only
  permitted dimensions; everything else is derived from them.
- Every content slide except the Image Bank carries the same **frame**: a six-tab nav bar at
  the top (0.55in) with a 0.04in gold accent line under it, and a navy learning-objective bar
  at the bottom (0.35in, starting at y = 7.15).
- The content area therefore runs from y = 0.71 to y = 7.07, with a 0.45in side margin
  (content width 12.43in).
- The **Visualiser slide is mandatory** on standard, practical, annotation and review decks.
  It is emitted even when the lesson JSON never mentions it.
- The **Image Bank is always last**, and is emitted whenever the lesson has any image at all.

---

## 1. Frame elements (present on nearly every slide)

| Element | What it renders | Variants and edge states |
|---|---|---|
| `navBar(stage)` | Six equal 2.22in tabs across the top: DO NOW, ENGAGE, LEARN, BUILD, APPLY, REVIEW. The active tab is filled with that stage's colour and set bold at 11pt; inactive tabs are navy2 at 10pt. Text is always white, never gold. | Six states, one per stage. The Image Bank slide has **no** nav bar. |
| gold accent strip | A 0.04in gold rectangle immediately under the nav bar | None |
| `bottomBar(objective)` | Full-width navy bar: "Learning objective:" in bold plus the first objective in italic, 11pt white | An empty objective renders the label alone. Absent on the Image Bank slide. |
| `sectionHeader(text, colour)` | Full-width 0.38in band in the stage colour, white bold 13pt | Centred when passed a string, left-aligned when passed pre-built runs |
| `purplePenBar(y)` | Full-width 0.38in purple bar: "Purple pen time · mark and correct your answers" | Appears on every answers slide. On Learn C it replaces the section header entirely. |
| `silentEntryFooter()` | Grey 12pt centred line, Title+DoNow slide only | None |
| `mcqProtocolStrip(text)` | Full-width navy strip pinned above the bottom bar | Default "THINK (silent) → DECIDE → SHOW on 3-2-1", or a custom override (used by Misconception) |

**Colour set actually in use:** navy `0D1B5E`, navy2 `152347`, Do Now bar `25408D`, gold
`FABB2E`, page background `EDF2FA`, purple background `4A148C`, purple pen `6A0DAD`, teal
`00838F`, amber `E65100`, greens `1B5E20` and `2E7D32`, red `B71C1C`, learn yellow `F9A825`.
Tier colours: developing `2E7D32`, reaching `E65100`, mastering `B71C1C`.
MCQ option colours are fixed per letter: A pink `C2185B` on `FCE4EC`, B blue `1565C0` on
`E3F2FD`, C green `2E7D32` on `E8F5E9`, D yellow `F57F17` on `FFFDE7`.

---

## 2. Opening slides

### 2.1 `slideTitleDoNow`: Title + Do Now (1 slide, always first)

Full navy background. The left 36% is lesson identity, the right 64% is the Do Now.
Left column: gold title, grey year and theme line, a navy2 "Learning Objectives" box with a
gold border, and an optional "Key Words" box below it. A 0.013in vertical gold divider
separates the columns. Right column: a Do Now header bar, then numbered rows, each a gold
rounded-square badge (0.42in, radius 0.05) beside an off-white question box at 19pt.

| Variant or edge state | Trigger | Visual difference |
|---|---|---|
| Do Now variant A | `doNow.variant` is not "B" | Header reads "DO NOW" |
| Do Now variant B | `doNow.variant === "B"` | Header reads "DO NOW · 5 minutes" |
| Long title | title longer than 45 characters | Title drops from 32pt to 26pt and the subtitle gap tightens from 1.65in to 1.5in |
| Keywords present | `title.keywords[]` non-empty | A second 1.2in gold-bordered box appears under the objectives box, shrinking it |
| Keywords absent | no keywords | Objectives box takes the full column height |
| Row count | `max(questions.length, doNow.count ?? 5)` | Row height is arithmetic. Fewer questions than the floor pads **blank** gold boxes that still carry numbered badges |
| Objectives | 0 to 3 rendered, extras silently dropped | |
| `meta.yearLine` | override string | Replaces the derived "Year N · Theme" line |
| `doNow.specPoints[]` | present | Written to speaker notes, invisible on the slide |

### 2.2 `slideDoNowAnswers`: Do Now Answers (1 slide)

Navy background, purple pen bar, then one `reviewRow` per question filling the slide. Each
row is a Do Now blue question cell (35% width, white bold text) beside a navy answer cell
with a gold border and gold text (65%). Row height is pure arithmetic, so four questions give
tall rows and eight give short ones.

**Edge state:** skipped entirely when `doNow.questions` is empty.

---

## 3. `slideEngage`: Engage (1 slide)

Page background. The section header text is `ENGAGE · <label>`, where the label comes from the
variant or from an explicit `engage.title` override.

**Six variant labels** (`news` and `news_hook` give IN THE NEWS, `prediction` gives MAKE A
PREDICTION, `video` and `video_hook` give WATCH, `demo` gives DEMONSTRATION, `mysteryImage`
gives MYSTERY IMAGE, `oddOneOut` gives ODD ONE OUT). The variant changes **only the header
text**. The layout is driven entirely by which optional fields are present.

**Three mutually exclusive layout branches:**

| Branch | Trigger | Layout |
|---|---|---|
| **Fill-gap Layout A** | `reveal.question` present, no `content`, no `videoLink` | Full-width hook band (max 1.0in, cream), then a middle row with the reveal question (large, auto-sized 16 to 34pt) beside the image, then a full-width navy and gold answer row |
| **Image branch** | `imagePlaceholder` not false | Left 55% text column, right 45% image. The hook box is capped at 1.0in, or stretched to the full column height when `reveal` is present with no question and no content. Body renders italic underneath |
| **No-image branch** | `imagePlaceholder: false` | Hook full width (capped 1.3in) plus body underneath, or body alone vertically centred when there is no hook |

**Modifiers that stack on the image and no-image branches:**

| Modifier | Trigger | Rendering |
|---|---|---|
| Video link bar | `engage.videoLink` | 0.55in gold-bordered box, teal ► glyph plus underlined teal hyperlink text |
| Prompt | `engage.prompt` | 0.75in cream box pinned to the bottom |
| **Reveal Layout A** | `reveal.question` present | Bottom row 1.25in high: question box at 55% (cream, 16 to 30pt) beside a navy box with gold text at 45% |
| **Reveal Layout B** | `reveal` present, `reveal.question` absent | Bottom row 0.95in high: the navy and gold answer box spans the full width; the hook is treated as the question |
| No reveal | `reveal` omitted | No bottom row; the body block grows into the space |

Image sub-states are shared with every other image slot, see 9.1.

---

## 4. `slideLearn`: Learn variants A to K (1 slide per item, H can add a second)

`item.variant` accepts the letter or a named alias: KEY_INFO to A, KEYWORDS and
WRITE_IN_BOOK to B, REVISION_TABLE to C, IMAGE_COPY to D, COMPARISON_TABLE to E,
EQUATION_CALLOUT to F, FLOW and SEQUENCE to G, VIDEO to H, FLOWCHART to I, GRAPH_SKETCH to J,
TIMELINE to K. **An unrecognised variant silently falls back to A.**

Variants J and K exist in the renderer but are **not documented** in slide-options-v4.md.

### A: Key information
Left 55%: up to **two** navy header boxes. Each is a two-row pptx table with a 2pt gold
border, a 0.65in navy header row at 22pt white, over a white body row with auto-sized text.
An optional "Key terms:" box of the same construction pins to the bottom left.
Right 45%: image or annotation zone.

| Edge state | Effect |
|---|---|
| `item.boxes[]` supplied | Up to 2 boxes stacked, splitting the available height |
| No `boxes`, only `body` | A single box titled from `heading`, body split on newlines |
| More than 2 boxes | Silently truncated to 2 |
| `keywords[]` present | A 1.0in key-terms box appears and the stack height shrinks |
| `annotationZone: true` | Right column becomes a dashed gold empty box labelled "worked live", capped at 4.0in high |
| `imagePlaceholder: false` with no annotation zone | Right column is **empty** and the left column does not widen |

### B: Key words card grid
Definition cards, each navy with a gold border: gold 18pt term, white 13pt italic definition,
optional gold 11pt etymology line.

| Edge state | Effect |
|---|---|
| 4 or fewer definitions | 2-column grid |
| 5 or more definitions | 3-column grid |
| `below: "none"` (default) | Cards fill the whole content area |
| `below: "image"` | Cards take the top band (max 50% of height), full-width image underneath |
| `below: "two-column"` | Two navy header boxes side by side underneath |
| `below` any other value with `boxes[]` | One navy header box at 55% plus an image at 45% underneath |
| Band height | `min(50% of available, definitions x 0.42in + 0.35)` |

### C: Revision table
**The only Learn variant with no section header.** A purple pen bar at the top, then pptx
tables with a navy title row (gold text), a navy column header row (white text), and
zebra-striped body rows at 10pt with a 0.5pt grey border.

| Edge state | Effect |
|---|---|
| Both `corePaper[]` and `extendPaper[]` | Two tables side by side, titled CORE PAPER and CHALLENGE PAPER |
| Only one of the two | A single full-width table |
| Neither | Slide renders as bar plus empty space |

### D: Copy the diagram
Gold-bordered instruction band (0.55in, ☞ glyph) at the top, then a **fixed 5.4in wide**
horizontally centred image, then an optional grey 10pt tip line.

Edge state: `item.tip` reserves 0.35in and shrinks the image.

### E: Comparison table
Two headers side by side (left navy, right build orange), then zebra-striped paired rows in
gold-bordered boxes at 14pt.

Edge state: row height is clamped to 0.7in to 1.8in and the whole block is **vertically
centred** in the leftover space, so a two-row comparison sits in the middle rather than
hugging the top.

### F: Equation callout
Navy2 equation box with a gold border at the top (1.0in), then a component grid, then
rearrangements, then an example box.

| Edge state | Effect |
|---|---|
| `equations[]` with 2 entries | Two side-by-side equation boxes of equal width |
| `equation` single string | One full-width box |
| More than 2 in `equations[]` | Truncated to 2 |
| Equation has a fraction and it fits | Rendered as a **true stacked fraction**: three native shapes named `eqFracNum`, `eqFracBar`, `eqFracDen` |
| Fraction too wide or box too shallow | Falls back to a diagonal `a⁄b` run in Cambria Math |
| `components[]` 4 or fewer | One row of navy2 boxes, each with a 24pt gold symbol, 17pt white name and 15pt italic unit |
| `components[]` 5 or more | Two rows, and the last row rebalances its widths |
| `rearrangements[]` | A 0.65in row of page-background boxes at 20pt |
| `example` | Bottom box, "Example:" prefix in navy bold, auto-sized 20 to 32pt |

### G: Flow and sequence (zigzag)
Up to 6 steps. Steps are navy2 rounded rectangles (radius 0.06) with a gold border, a gold
number badge overlapping the top-left corner, a white bold label and a gold italic note.

| Edge state | Effect |
|---|---|
| 3, 4, 5 or 6 steps | One of **four hand-tuned geometries** from `LEARN_G_LAYOUTS`, with curved gold bezier arrows drawn as `custGeom` freeforms. 3 is a descending staircase, 4 is a 2x2 with a crossing arrow, 5 is a W pattern with a centre box, 6 is a snake running TL, TR, MR, ML, BL, BR |
| 1 or 2 steps | Falls back to a plain grid with gold **text glyph** arrows, not drawn arrows |
| 7 or more | Truncated to 6 |
| 0 steps | Header only, empty body |

### H: Video
Left 56%: teal video link box, then a "☞ While watching:" bullet list, then an optional
italic prompt box. Right 44%: image.

**Edge state:** `questions[]` entries that carry an answer produce a **second slide**
("LEARN · VIDEO QUESTIONS: ANSWERS") with a purple pen bar and one review row per question.
The questions themselves never appear on the Learn H slide; they live on the worksheet.

### I: Flowchart (linear)
Up to 6 navy nodes with gold borders, gold bold labels and grey-blue italic notes, connected
by native gold arrows with triangle heads.

| Edge state | Effect |
|---|---|
| `orientation: "vertical"` (default) | Nodes at 60% of content width, centred, stacked, block vertically centred |
| `orientation: "horizontal"` | Nodes share the full width, height capped at 2.0in, vertically centred |
| `cycle: true` vertical | A bezier return arch bulges left from the last node to the first, plus a teal italic "cycle continues" caption |
| `cycle: true` horizontal | A bezier return arch over the top, plus a teal italic "cycle" caption |
| 0 nodes | Header only |

### J: Graph sketch (undocumented in slide-options-v4.md)
Left 52%: an optional axis label strip (pale blue, "y │ x"), then the image.
Right 48%: a stack of pale blue feature boxes, each with a navy bold label and a description.

| Edge state | Effect |
|---|---|
| `axes.x` or `axes.y` present | A 0.32in axis strip appears and pushes the image down |
| Neither axis | Image starts at the top |
| `features[]` present | Boxes clamped to 0.5in to 1.6in each, vertically centred as a block |
| No features, `instruction` present | A single full-height italic navy box instead |
| Neither | Right column empty |

### K: Timeline (undocumented in slide-options-v4.md)
Up to 8 events on a horizontal navy spine, alternating above and below, each with a gold
tick, a gold circular marker outlined in navy, and a white event box carrying a teal year, a
navy label and a grey detail line.

| Edge state | Effect |
|---|---|
| Few events | Box width grows toward a 2.4in cap, and a "spare" factor scales box height by up to 15% and every font size by up to 40% |
| Many events | Box width shrinks toward the 1.55in baseline, fonts return to 10 or 11pt |
| Event has `embeddedImagePath` or `imageDescription` | An image renders on the **opposite side** of the spine from that event's box |
| 9 or more events | Truncated to 8 |

---

## 5. Build activity slides

`renderBuildSlides()` dispatches on `type` (falling back to `variant`, defaulting to `mcq`).
An unrecognised type renders **nothing at all**, silently.

| Type | Slides | What it renders | Variants and edge states |
|---|---|---|---|
| `mcq` | 1 | Question box, a 2x2 grid of four option boxes each in its fixed letter colour, the protocol strip, then a navy and gold answer box carrying "✓ Answer: X · explanation" | Options accept an array of 4 or an `{A,B,C,D}` object. The answer box is always drawn; the teacher animates the reveal by hand. Missing options render as empty coloured boxes |
| `mcq_image` | 1 | Left 72%: question box, a **fixed 2.4in tall** image, then all four options stacked as text runs. Right 28%: a full-height navy column with a 20pt gold answer letter over a white explanation | Image sub-states as usual. The option layout is a run list rather than four boxes, so the option colours appear only on the letters |
| `trueFalse` | **2** | Task slide: numbered statement rows in alternating cream and white with a navy "T / F" tab at the right, plus a navy instruction footer. Answers slide: purple pen bar, then the same rows tinted green (true) or red (false) with a ✓ TRUE or ✗ FALSE verdict | Row height clamps to 0.7in to 1.9in on the task slide and 0.7in to 1.8in on the answers slide, and the block is vertically centred. `correction` on a false statement appends an italic clause |
| `correctTheStatement` | 1 | A 2x2 grid. Each cell is a **handwritten** false statement (Caveat, jittered) sitting directly above its navy and gold correction. No separate answer slide | Exactly 4 statements, extras truncated. `jitterProfile` 0 to 4, default 3. Handwriting renders as editable words or as a rasterised SVG, see 9.2 |
| `sort` | **2** | Task slide: italic instruction, then a numbered two-column grid of item boxes with font size scaled to box height. Answers slide: one column per category, first header green and the rest amber, each over a navy box with gold bulleted items | Categories default to `{A: "Group A", B: "Group B"}`. More than two categories widens into more columns |
| `practical` | 1 to **3** | Main slide: amber numbered step badges with gold-bordered step boxes on the left 52%; the right column carries the image and/or an "EQUIPMENT PER GROUP" navy box with an amber border; an optional red-bordered warning box sits at the bottom | Sub-slides: a **Q&A answers slide** when `questions[]` is present; a **MODEL DATA table slide** when `worksheetExtras.referenceData.rows` exists **and no `graphWithData` item is in the deck**. With no equipment and `imagePlaceholder: false`, steps take the full width |
| `misconception` | 1 | Three stacked equal panels: THE CLAIM in an amber-bordered box with the claim at 20pt italic in quotes, WHY IT FEELS TRUE, and WHAT'S ACTUALLY TRUE in green. Custom protocol strip: "Hold up A if you believed the claim before today" | The amber border is the deliberate exception to the gold-only border rule |
| `bigFact` | 1 | Full navy slide. One giant gold fact auto-sized between 32pt and 96pt, an optional unit at half that size, and an optional 18pt white context line | Display only; it produces no worksheet output. The context line reserves 0.6in |
| `reformatFlowchart` | **2** | Question slide: steps **deterministically shuffled** (outside-in, never random) and lettered A to F in a grid of up to 3 columns, with a navy instruction footer. Answer slide: purple pen bar, then the correct order left to right as navy boxes joined by native gold arrows, each labelled "N (shown as X)" | Up to 6 steps. Cell height capped at 1.8in on the question slide, node height at 2.2in on the answer slide |
| `annotatedDiagram` | 1 | Image at 60% width with gold numbered badges positioned at fractional (0 to 1) coordinates of the image box, plus a KEY box on the right listing "N — meaning" | Coordinates are clamped to 0 to 1. Badge diameter fixed at 0.32in. Works over a placeholder as well as a real image |
| `modelAnswerReview` | 1 | Left 48%: the model answer. Right 52%: a navy marking panel with a gold border | **Three `qType` states.** `short` is handwriting at 26pt; `calculation` is handwriting from an array of step strings at 24pt; `graph` is a matplotlib plot from `graphData` via `graph_gen.py`, or a grey placeholder if Python fails. Panel sections appear conditionally: INDICATIVE CONTENT always, BANDS only with `levelDescriptors`, EXCLUSIONARY CLAIMS in red only with `doesNotAward`, an ECF note only with `ecfNote`. A `group` on an indicative item inserts a pale gold sub-heading; `dependentOn` appends an italic clause. `<u>` and `**` markup are honoured |
| `markTheAnswers` | **2** | A shared frame: question full width on top, marking panel on the left 42%, samples on the right 58%. Slide 1: each sample is a navy and gold name tab over handwriting. Slide 2 ("MARKS AWARDED"): the same frame with the right column replaced by verdicts (level and mark in amber, green ✓ hits, red ✗ misses, italic comment) | 1 to 4 samples, extras truncated. Each sample gets a different jitter preset by default (1, 3, 2, 4) |
| `workedExample` | 1 | Two columns under navy headers WORKED EXAMPLE and YOUR TURN. Left: numbered steps with equation typesetting. Right: the your-turn prompt over a navy answer panel | **Edge: `meta.annotation: true`** replaces the left steps with a dashed "worked live" annotation zone and moves the steps into speaker notes. **Edge: no `yourTurn.answer`** renders an empty white gold-bordered rectangle instead of the navy panel |
| `guessExample` | 1 | Five GUESS rows. Left: a gold rounded badge (G, U, E, S, S) plus a navy prompt. Right: one tall navy panel with gold hairline dividers between rows | **Edge: `triangleUsable`** (exactly three symbols supplied and no extra keys) draws the white vector formula triangle beside a 20pt equation; otherwise the equation takes the full row at 26pt and no triangle is drawn. Stacked versus diagonal fraction as in Learn F. The last row is a gold bold "Solve" banner |
| `practiceTriangle` | 1 | Left 65%: up to 3 question cards. Right 35%: an "EQUATION" label, a white reference box with the equation, and optionally the formula triangle | **Edge: `q.a` present** splits each card 58/38 and adds a navy and gold ANSWER box under the question; absent leaves the question the full card. **Edge:** the triangle is drawn only when `triangleUsable` **and** at least 0.7in of height remains. Answers are also written to speaker notes |
| `errorAnalysis` | **2** | Task slide: numbered wrong working on the left 60%, a cream "Your task" strip and a white working zone on the right. Answer slide: purple pen bar, the same working with the error line amber, bold and underlined plus a green ✓ fix line, and an answer panel on the right | `errorType` adds an italic line to the answer panel |
| `graphInterpret` | 1 | Left 55%: a white gold-bordered frame with a label, two drawn navy axis lines, and the image or annotation zone inside. Right 45%: up to 3 question and answer pairs, question in navy with white text (40% of the row) over the answer in navy with gold text (60%) | **Edge: `annotationZone: true`** puts a dashed live-working box inside the axes instead of an image. The header always reads ": ANSWERS" even on first showing |
| `graphResults` | 1 | 70% matplotlib graph, 30% navy2 "Reading the graph" panel with numbered notes and an optional gold italic closing remark | **Renders nothing at all** without `worksheetExtras.referenceData.rows`. Grey placeholder if `graph_gen.py` fails |
| `graphWithData` | 1 | 50% data table (navy header row with amber text, white body rows with navy text and navy cell borders), 50% compact graph | **Renders nothing at all** without `referenceData.rows`. Its presence also **suppresses** the practical Model Data slide |
| `predictThenCheck` | **2** | Predict slide: an optional cream setup box, a large amber prediction band at 22pt, a cream "write it in your book" zone, and a navy commit footer. Check slide: purple pen bar, then YOUR PREDICTION (amber header, white box) beside WHAT ACTUALLY HAPPENS (navy header, navy and gold box), plus an optional full-width WHY box | The WHY box takes up to 30% of the height, capped at 1.3in |
| `visualiser` | 1 | Handled by the caller, not the dispatcher. See section 6 | |

---

## 6. `slideVisualiser`: Visualiser (1 slide, mandatory)

**The only purple slide in the deck.** Purple background, centred stack: "IPEVO Visualiser" in
40pt gold, a white subtitle, a gold-bordered link box with an underlined teal hyperlink, and a
small white italic "↑ Click to open" line.

| Edge state | Effect |
|---|---|
| `item.url`, else `meta.visualiserUrl`, else the IPEVO default | The URL is never blank in practice, so the greyed "teacher inserts" fallback is effectively dead code |
| `item.context` or `item.subtitle` | Overrides the derived "Model answers under the visualiser · Topic" line |
| Not authored at all | Still emitted on standard, practical, annotation and review decks. **Omitted** on revision and whiteboard decks unless a `visualiser` build item exists |

---

## 7. `slideApply`: Apply (1 slide, three layout variants)

Header "APPLY · CHOOSE YOUR LEVEL". A textbook reference tag ("Read more — book pp. X to Y")
is overlaid top right in navy with gold text whenever the textbook index resolves a match.

`pickApplyVariant()`: an explicit `apply.variant` wins; otherwise a single mastering question
longer than 160 characters selects **B**; otherwise **A**.

| Variant | Layout |
|---|---|
| **A** (default) | Three tier columns. Each has a coloured tier header, then **one gold-bordered card per question**, all cards the same height (driven by the fullest tier). Font auto-sized 10 to 22pt per card |
| **B** | Two by two: developing top left, reaching top right, mastering full width underneath. Each is a `tierColumn`, that is a single reflowing box under a coloured header |
| **C** | Three `tierColumn` boxes side by side at full height. Explicitly never the silent default; intended for revision and whiteboard decks |

Edge states: empty tiers are filtered out in variants A and C, so a two-tier lesson gives two
wider columns in A but still leaves a gap in B, which is hard-coded to three slots.

---

## 8. Closing slides

### 8.1 `buildReviewSlides` and `slideReviewTier`: Review (0 to 3 slides)

Each slide has an inline coloured tier title (not a full-width header band), a purple pen bar,
and one `reviewRow` per question filling the height arithmetically.

**Three source precedences, checked in order:**

| Source | Result |
|---|---|
| `review.developing`, `review.reaching`, `review.mastering` | One slide per non-empty tier, title in the tier colour |
| `review.questions[]` | **One** untiered slide titled "Review · TODAY'S LEARNING" with navy left cells |
| Neither, `apply` present | Falls back to the Apply questions **that carry an answer**, one slide per tier. Apply questions with no answer silently vanish |

### 8.2 `slideWhiteboardRounds`: Whiteboard rounds (2 slides per round)

Question slide: the question in a large 24pt centred box. Answer slide: the same question at
20pt over a separate answer box at 15pt navy. The header reads "<subject> Round · QN of M".
Both slides use the BUILD nav tab and stage colour.

### 8.3 `slideImageDump`: Image Bank (1 slide, always last)

**The only slide with no nav bar and no bottom bar.** It has its own navy header band with
gold text and its own gold accent line. Images are laid out in a grid of up to 3 columns with
a gold italic caption under each.

Sources, deduplicated by path: the auto-generated results graph, every `embeddedImagePath`
found on the Engage item, each Learn item, each timeline event and each Build item, then any
manually authored `image_dump.images`.

| Edge state | Effect |
|---|---|
| No images anywhere | Slide is **not emitted** |
| 1 or 2 images | Column count drops to match, so images stretch very wide |
| A listed path does not exist | Grey placeholder in that cell plus a loud build warning |
| Caption missing | Renders "unassigned" in a dull gold |

---

## 9. Cross-cutting sub-states (they apply to many slide types)

### 9.1 Image slots, three states
Every image position goes through `imageOrPlaceholder()`:

1. **Real image**: `imageConfidence === "search"` **and** `embeddedImagePath` exists on disk.
   Drawn with `addImage` into the exact box, **stretched, not aspect-fitted**.
2. **Described placeholder**: grey `D0D0D0` fill, dashed grey border, italic 11pt
   "[Paste image — suggested search: <description>]".
3. **Generic placeholder**: "[Image — add imageDescription to JSON]".

A promised image that is missing or unreadable falls back to state 2 or 3 **and** logs a build
warning. Slots appear on Engage, Learn A, B, D, H, J, K (per event), mcq_image, practical,
annotatedDiagram and graphInterpret.

### 9.2 Handwriting, two render modes
Used by `correctTheStatement`, `modelAnswerReview` and `markTheAnswers`.

- **`editable` (default)**: every word becomes its own small Caveat text box, bold, rotated and
  baseline-shifted per one of five fixed jitter presets (0 neat to 4 messy). Real, selectable
  PPTX text. Caveat is embedded into the .pptx afterwards by rewriting the zip.
- **`raster`**: the identical layout is written as an SVG with Caveat inlined as a base64
  `@font-face` and inserted as an image. Set via `item.renderMode` or `meta.handwritingMode`.

Both modes share `layoutHandwriting`, which stretches line spacing to fill the box (capped at
2.4x the natural line height) so working never leaves trailing blank rules. `ruled: true`
draws pale blue baseline rules under each line.

### 9.3 Equations, three rendering paths
- **Stacked fraction** (`renderEqShapes`): only on the three dedicated equation surfaces, that
  is the Learn F box, the guessExample E row and the practiceTriangle reference box. It emits
  `eqFracNum`, `eqFracBar` and `eqFracDen` shapes. It returns false and defers when there is no
  fraction, when the box is under roughly 2.2 line heights tall, or when the equation is wider
  than the box.
- **Diagonal runs** (`toPptxRuns`): Cambria Math runs with native sub and superscript and a `⁄`
  glyph for fractions. Used everywhere else an equation field appears.
- **Pretty text** (`prettyText`): plain prose sinks. Converts `\alpha`, `\times` and a small
  unit whitelist to symbols, and `x^2` or `x_2` to Unicode `x²` or `x₂` when every character
  maps. Used on Do Now questions, review rows, tier questions and handwriting.

### 9.4 Auto-sizing
`autoFontSize` estimates fit using a Trebuchet heuristic of roughly 120 character-points per
inch of width and a 1.4x line height, and every box also carries `fit: "shrink"` as a safety
net. This means **the same slide type can render at very different text sizes** depending on
content length, which a reskin has to tolerate.

### 9.5 Annotation zone
A dashed gold empty rectangle with a small grey "worked live" caption. It appears on Learn A
(`annotationZone: true`), graphInterpret (`annotationZone: true`) and workedExample
(`meta.annotation: true`).

---

## 10. Coverage summary

| Group | Distinct slide functions | Distinct visual layouts |
|---|---|---|
| Opening | 2 | 2, plus 9 documented edge states |
| Engage | 1 | 3 layout branches x 6 labels x reveal A, reveal B or none |
| Learn | 1 | 11 variants, plus 4 flow geometries, 4 Learn B `below` modes, 2 Learn I orientations with or without cycle, 2 Learn C table modes, and the Learn H answer slide |
| Build | 21 dispatch types | 30 slides, since 6 types emit 2 slides each and practical can emit 3 |
| Visualiser | 1 | 1 |
| Apply | 1 | 3 |
| Review | 1 | 3 source precedences |
| Whiteboard | 1 | 2 per round |
| Image Bank | 1 | 1 |

**Types that emit more than one slide:** trueFalse, sort, reformatFlowchart, errorAnalysis,
predictThenCheck and markTheAnswers emit 2 each; practical emits 1 to 3; Learn H emits 1 or 2.

**Types that can silently emit nothing:** `graphResults` and `graphWithData` without
`referenceData`; any unrecognised build `type`; `slideDoNowAnswers` with no questions;
`slideImageDump` with no images; `slideWhiteboardRounds` with no rounds; `slideApply` and
`slideEngage` when the section is absent.
