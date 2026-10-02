# Render Constraints: what pptxgenjs can and cannot do in this renderer

Scope: the PowerPoint output of `science-lesson/references/build.js`.
Library: **pptxgenjs 4.0.1** (plus `docx` 9.7.1 and `adm-zip` 0.5.17 for other jobs).
Written 2026-09-03. This is the ceiling any visual reskin has to design inside.

Two separate limits apply and both matter:

1. **What pptxgenjs 4.0.1 can emit at all.**
2. **What this renderer actually uses.** Some pptxgenjs features are available but unused,
   which means a reskin can reach for them, but they are untested here.

Where the two differ, it is called out.

---

## 1. Canvas

| Property | Value | Notes |
|---|---|---|
| Layout | `LAYOUT_WIDE`, 13.33in x 7.5in | Hard-coded as `SW` and `SH`. The comment says "NEVER hardcode other values" |
| Units | Inches throughout, floats | pptxgenjs also accepts percentage strings, unused here |
| Slide background | Solid colour only (`s.background = { color: NAVY }`) | pptxgenjs also supports an image background, unused here |
| Backgrounds in use | Page `EDF2FA` (most slides), navy `0D1B5E` (Title+DoNow, DoNow Answers, bigFact), purple `4A148C` (Visualiser only) | |
| Z-order | Draw order only. There is no explicit z-index | Anything drawn later paints on top. Learn G relies on this: arrows first, boxes over them |
| Master slides / layouts | **Not used.** Every slide is built element by element | pptxgenjs supports `defineSlideMaster`. A reskin could adopt it, but the frame is currently redrawn per slide |

---

## 2. Fills

**Available:** solid colour, transparency percentage, and image fill.
**Used here:** solid colour only, as `{ color: 'RRGGBB' }`.

- No gradients. pptxgenjs 4.x has no gradient fill API at all, so a gradient would have to be
  a pre-rendered PNG inserted as an image.
- No transparency anywhere in this renderer. pptxgenjs does accept
  `fill: { color, transparency: 0-100 }`, so translucent panels are technically reachable but
  entirely untested in this codebase.
- No pattern or texture fills.
- Every "card" in the deck is one of a handful of flat fills: white `FFFFFF`, page `EDF2FA`,
  cream `FFFDE7` / `FFF8E1`, zebra grey `F5F5F5`, off-white `F8F7F0`, pale blue `F0F4FF`,
  navy `0D1B5E`, navy2 `152347`, or a verdict tint (`E8F5E9` green, `FFEBEE` red).

---

## 3. Borders and lines

| Capability | Status |
|---|---|
| Solid border on a shape | Yes: `line: { color, width }`, width in points |
| Dashed border | Yes: `line: { color, width, dashType: 'dash' }`. Used on the annotation zone (gold) and image placeholders (grey) |
| Other dash types | pptxgenjs supports `dot`, `lgDash`, `dashDot`, `sysDash`, `sysDot`. **Only `dash` is used** |
| Per-side borders on a **shape** | **No.** A shape's `line` applies to all four sides |
| Per-side borders on a **table cell** | Yes. `border: [top, right, bottom, left]`, each `{ type, pt, color }`. The `ab()` helper builds a uniform four-sided set |
| Line caps, joins, arrow sizes | Not exposed in any useful way. Arrowheads are `endArrowType: 'triangle'` only |
| Standalone lines | Yes: `addShape('line', { x, y, w, h, flipH, flipV, line })`. A line's direction comes from w/h plus flip flags, which is why `flowArrow` computes mins and flips |

**House rule inside the renderer:** gold 2pt (`GOLD2`) is described in the source as "the ONLY
content border". The amber border on the Misconception claim panel and the equipment box is
called out in comments as a deliberate exception.

---

## 4. Shape vocabulary

pptxgenjs exposes the full OOXML preset-geometry list (roughly 180 shapes). **This renderer
uses six**, 27 calls in total:

| Shape | Calls | Where |
|---|---|---|
| `rect` | 12 | Accent strips, timeline spine, panel backgrounds, annotation zone, equation containers, the empty "your turn" box |
| `line` | 8 | Formula triangle dividers, graph axes, equation fraction bars, handwriting rules, flow connectors |
| `roundRect` | 3 | Do Now number badges (radius 0.05), Learn G step boxes (0.06), GUESS letter badges (0.07) |
| `ellipse` | 2 | Gold number badges, timeline markers |
| `triangle` | 1 | The physics formula triangle |
| `custGeom` | 1 | Curved gold arrows (`flowArrow` bezier path) |

### Corner radius
- `roundRect` takes `rectRadius` **in inches**, one value applied to all four corners.
- **Per-corner radii are impossible.** OOXML `roundRect` has a single adjustment value.
  Asymmetric corners would need `custGeom` with a hand-built path.
- Only three radii exist in the whole deck: 0.05, 0.06 and 0.07 inches.

### custGeom
`addShape('custGeom', { points: [...] })` accepts `moveTo`, straight segments and
`curve: { type: 'cubic' | 'quadratic', x1, y1, x2, y2 }`. Coordinates are relative to the
shape's own bounding box, which is why `flowArrow` takes an `area` and subtracts its origin.
This is the only route to arbitrary vector artwork, and the renderer uses it for exactly one
thing: a single cubic bezier arrow.

### What is not available
No shadows, glows, reflections, soft edges, 3D bevels or rotation-in-space. pptxgenjs does
support a `shadow` object on shapes and text, but nothing in this renderer uses it, so every
element in the deck is flat.

---

## 5. Text

### Available and used

| Property | Notes |
|---|---|
| `fontFace` | Per text box and per run |
| `fontSize` | Points, fractional values accepted (10.5pt is used on the textbook tag) |
| `bold`, `italic`, `underline` | Per run |
| `color` | Six-digit hex, no alpha |
| `align` | `left`, `center`, `right` |
| `valign` | `top`, `middle`, `bottom` |
| `margin` | Internal padding in points, single value or `[t,r,b,l]`. This renderer only uses single values (3, 6, 8, 10, 12) |
| `wrap` | Boolean |
| `fit: 'shrink'` | Shrink-to-fit. Applied to nearly every box as a backstop for the auto-sizing heuristic |
| `rotate` | Degrees. Used only by the handwriting engine, roughly -3.9 to +3.3 degrees |
| `subscript`, `superscript` | Native run properties, used by the equation renderer |
| `hyperlink: { url }` | Used on video links and the visualiser link |
| `breakLine` | Run-level line break |
| `paraSpaceBefore`, `paraSpaceAfter` | Paragraph spacing in points, the only vertical rhythm control available |
| `objectName` | Shape naming. Used for `eqFracNum`, `eqFracBar`, `eqFracDen`, which the regression harness asserts on |

### Not available or not used
- **No line-height / leading control.** There is no `lineSpacing` in pptxgenjs 4.0.1 text
  options. Vertical rhythm is only reachable through `paraSpaceBefore` / `paraSpaceAfter`.
- **No letter spacing or tracking.**
- **No text columns** inside a box.
- **No real bullet lists.** pptxgenjs does support `bullet: true`, but this renderer fakes
  bullets with literal `•` and `·` characters inside runs.
- **No text on a path, no WordArt, no outlined or gradient-filled text.**
- **No vertical text.**
- **No hanging indents.** Numbered items are faked as a separate badge shape beside the text,
  or as a `"1  "` prefix run.

### Text measurement is guesswork
There is no font-metrics access in Node. `autoFontSize()` estimates with a fixed heuristic:
roughly 120 character-points per inch of width, with a 1.4x line height, targeting 85% of the
box height. `wordWidthIn()` for handwriting uses a Caveat constant of 100 characters per inch
per point. Both are approximations, which is why `fit: 'shrink'` is on nearly everything.
**A reskin that changes the body font invalidates both constants.**

---

## 6. Fonts

| Font | Role | Availability |
|---|---|---|
| **Trebuchet MS** | Body and headings, set as the pptx theme font and passed explicitly on every `txt()` call | Ships with Windows and Office |
| **Cambria Math** | Every equation run (`toPptxRuns`, `renderEqShapes`) | Ships with every version of Office, so zero install on school machines |
| **Caveat** (Regular and Bold) | Handwriting only | **Not installed on school machines.** Handled two ways: the TTFs are injected into the .pptx zip as `ppt/fonts/font1.fntdata` and `font2.fntdata` with an `embeddedFontLst` entry, and the raster fallback inlines the font as base64 inside an SVG |

Constraints that follow:

- Font embedding is a **post-processing step**, not a pptxgenjs feature. `embedCaveatFont()`
  rewrites `presentation.xml`, its rels and `[Content_Types].xml` by hand using adm-zip. It
  runs only when the deck contains a handwriting slide type, and it is best-effort: on any
  failure it leaves the file untouched and the text substitutes a fallback font.
- Any new font a reskin introduces has to either ship with Office or go through the same
  embedding path.
- Google Slides needs none of the embedding, since Caveat is a native Google Font there.
- Century Gothic is **not** used by the renderer.

---

## 7. Images

`addImage({ path, x, y, w, h })` is the only form used, six call sites.

| Capability | Status |
|---|---|
| Placement | Absolute box in inches |
| Aspect ratio | **Not preserved.** The image is stretched to fill w x h exactly. pptxgenjs 4.x does support `sizing: { type: 'contain' \| 'cover' \| 'crop', w, h }`, but **no call site uses it**, so every image in the deck is potentially distorted |
| Cropping | Only via the unused `sizing.crop` option |
| Rounded corners, circular masks, any clipping | **Impossible.** OOXML picture frames in pptxgenjs get no geometry override here |
| Borders on an image | Not applied anywhere. pptxgenjs does not expose a picture outline in this version |
| Shadows on images | Not available |
| Transparency on images | Not available |
| Source | `path` (a local file) in every case. pptxgenjs also accepts `data:` base64 URIs, unused here |
| Formats | PNG and JPEG are safe. **SVG is used once**, by the raster handwriting fallback, which writes a temp `.svg` and inserts it by path. This is the most fragile thing in the pipeline: SVG support in PowerPoint is version-dependent and it will not survive older clients or LibreOffice reliably |
| Generated images | matplotlib PNGs via `graph_gen.py`, spawned with `execSync` into the OS temp directory and cleaned up after `writeFile` |

**Practical consequence for a reskin:** anything that needs a gradient, a soft shadow, a
rounded photo, a texture or a non-rectangular crop has to become a pre-rendered PNG. There is
no in-PowerPoint route to it here.

---

## 8. Tables

`addTable(rows, opts)`, four call sites (navy header boxes, Learn C revision tables, the
practical model-data table, and the graphWithData table).

| Capability | Status |
|---|---|
| Column widths | `colW: [array of inches]` |
| Row heights | `rowH: [array of inches]` |
| Per-cell fill, text colour, bold, font size, alignment, vertical alignment | Yes, via cell `options` |
| Per-cell four-sided borders | Yes, as `border: [t,r,b,l]` |
| Table-wide border | Yes, as `border: { type, pt, color }` |
| `colspan` | Yes. Used on the Learn C title row |
| `rowspan` | Available in pptxgenjs, unused here |
| Cell margins | `margin` in inches at table level (0.04 to 0.06 in use) |
| Auto-pagination | Explicitly disabled everywhere with `autoPage: false` |
| Rich runs inside a cell | Yes. `navyHeaderBox` passes a run array as the cell text |
| Cell corner radius, cell shadows, merged diagonal borders | Not available |

Tables are the only way to get a genuinely aligned grid. Everywhere else, "grids" are
independently positioned boxes whose coordinates are computed in JavaScript, which is why so
much of build.js is arithmetic.

---

## 9. Equations

There is **no Office Math (OMML) support in pptxgenjs**. This is the single biggest visual
constraint in the deck. The renderer works around it three ways:

1. **`renderEqShapes`** builds a true stacked fraction out of three separate objects: a
   numerator text box, a `line` shape as the bar, and a denominator text box, all in Cambria
   Math. It is the sanctioned exception to the "one shape per element" rule. It bails out
   (returns false) when the box is under roughly 2.2 line-heights tall or the equation is
   wider than the box.
2. **`toPptxRuns`** falls back to a diagonal `a⁄b` using U+2044 FRACTION SLASH, with native
   `subscript` / `superscript` runs for indices.
3. **`prettyText`** converts to Unicode characters (`x²`, `x₂`, `×`, `÷`, `√`, Greek letters)
   for plain prose, but only when every character in the argument has a Unicode mapping.

The DOCX side does have real OOXML math (`MathFraction`, `MathRadical`), so worksheets and
slides can legitimately render the same equation differently. A radical on a slide is a bare
`√` glyph with **no vinculum**; in Word it is a proper radical.

---

## 10. Things pptxgenjs cannot do here at all

- **Animation and transitions.** Nothing in pptxgenjs emits them. Every "reveal" in this deck
  is a statically drawn answer box that the teacher animates by hand in PowerPoint afterwards.
  The MCQ answer box, the practiceTriangle answer boxes and the workedExample answer panel all
  work this way, and the comments say so.
- **Speaker-notes formatting.** `addNotes()` takes plain text only.
- **Hyperlinks to other slides.** Only external URLs are used; pptxgenjs does support a slide
  link, but the nav bar tabs in this deck are decorative, not clickable navigation.
- **Grouping.** There are no shape groups, so a "card" made of several shapes cannot be moved
  as a unit in PowerPoint afterwards.
- **Charts drawn natively.** pptxgenjs has `addChart`, but this renderer never uses it. Every
  graph is a matplotlib PNG, which means graphs are not editable in PowerPoint and their style
  is controlled by `graph_gen.py`, not by build.js.
- **Conditional or responsive layout.** Every position is computed once at build time from the
  content lengths. There is no reflow after the fact.

---

## 11. Reskin risk list

Ordered by how much of the deck a change would touch.

| Change | Risk | Why |
|---|---|---|
| Change the body font | **High** | `autoFontSize` (120 char-pt per inch) and `wordWidthIn` (Caveat CPI 100) are calibrated to Trebuchet and Caveat. Every box on every slide would need re-measuring, and `fit: 'shrink'` would start firing on slides that currently fit |
| Change the frame heights (`NAV_H`, `BOT_H`, `TOP`) | **High** | Every slide computes its content height as `BOT_Y - 0.08 - y`. All 30-odd layouts shift together |
| Introduce gradients or soft shadows | **High** | Not reachable in pptxgenjs. Every affected element becomes a pre-rendered PNG, and PNGs are stretched not aspect-fitted |
| Change the gold border weight or colour | **Medium** | `GOLD2` is referenced in dozens of places, but it is one constant. The amber exceptions are separate and would need deciding on |
| Change corner radii | **Medium** | Only three call sites, but `roundRect` gives one radius for all four corners, so a "rounded top only" card is not possible |
| Change the palette | **Low to medium** | The constants are centralised at the top of build.js. The MCQ letter colours and the tier colours are separate lookup tables |
| Add aspect-correct images | **Low** | `sizing: { type: 'contain' }` already exists in pptxgenjs 4.0.1 and would only need adding at the `imageOrPlaceholder` and `addImage` call sites |
| Switch to slide masters | **Low to medium** | Would tidy the frame, but every slide currently redraws it, so the change touches `navBar`, `bottomBar` and every `pptx.addSlide()` call |

---

## 12. Verification note on rendering

LibreOffice is **not installed on this machine**, so the golden PNG renders in `golden/` were
produced with **PowerPoint's own COM export API** (`Presentation.Export`, 1920x1080 PNG per
slide) rather than `soffice --headless` plus PyMuPDF. This is the same method the existing
`design-audit/export-slides.ps1` already uses in this repo, it is read-only with respect to
the deck, and it renders with the exact engine the deck is authored for. It is higher fidelity
than LibreOffice for pptx and it removes the intermediate PDF step, so PyMuPDF is not needed.

If a LibreOffice render is specifically wanted later (for example to check how the deck
degrades on a non-Office viewer), LibreOffice would have to be installed first.

### Three things the golden renders actually showed

These are observations from the 100 exported PNGs, not predictions.

1. **The handwriting does not look like handwriting on this machine.** In `C-09.png`
   (editable mode) and `C-10.png` (raster mode) the jitter, the word spacing and the ruled
   lines are all correct, but the glyphs render in a generic bold sans rather than Caveat.
   Caveat is not installed locally, so either the embedded font is not being picked up on
   this export path, or the raster SVG's base64 `@font-face` is not being honoured. The
   layout engine is fine; the typeface is not arriving. Worth confirming on a school machine
   before a reskin builds anything on top of the handwriting look.
2. **The formula triangle clips its bottom-left label.** In `B-21.png` the label "rate" reads
   as "ate", because `drawFormulaTriangle` places the bottom-left text box at the triangle's
   full bounding-box edge, where the slanted side has already cut in. Longer than a
   single-symbol label will always clip.
3. **`graph_gen.py` fits a straight line through curved data.** In `B-26.png` the rate curve
   gets a linear best fit plus an extrapolated x-intercept at -57.6 s. That is graph_gen's
   behaviour, not build.js's, but any reskin of the graph slides inherits it.
