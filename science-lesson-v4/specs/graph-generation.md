# Spec: Graph Generation Renderer

## Overview

Adds automatic graph generation to the science lesson build pipeline. When a
practical lesson includes reference data and a graphing step, `build.js`
calls a fixed Python script (`references/graph_gen.py`) that renders a
matplotlib PNG in the approved V2 dark style, then embeds it as a BUILD slide
in the PPTX. Two slide variants exist: **Results Graph** (graph + analysis
panel) and **Data + Graph** (data table left, graph right). The Python script
is written once, packaged into the skill, and never regenerated per lesson.

---

## Inputs

- `worksheetExtras.referenceData` — object with:
  - `headers: string[]` — column headers; axis labels derived from these
  - `rows: any[][]` — data rows; `rows[n][0]` = x value, `rows[n][colIndex]` = y value
  - `xCol?: number` — index of x column (default 0)
  - `yCol?: number` — index of y column (default last column)
  - `xIntercept?: boolean` — whether to extrapolate to y=0 and annotate (default true)
  - `interceptLabel?: string` — label for the x-intercept annotation (e.g. `"Estimated absolute zero"`)
  - `interceptAccepted?: number` — accepted value for % error calculation (e.g. `-273.15`)
- `build[]` item with `type: "graphResults"` — triggers Variant A (graph + analysis panel)
  - `graphNotes: string[]` — numbered reading-the-graph points for right panel
  - `closingRemark?: string` — italic gold line at bottom of panel (e.g. `"This is a strong result for a school experiment."`)
- `build[]` item with `type: "graphWithData"` — triggers Variant B (data table left, graph right)
  - No `graphNotes` needed; the table provides the data context

---

## Outputs

- One additional PPTX slide per `graphResults` or `graphWithData` build item
- Slide inserted immediately after the model-data table slide (if present), before Visualiser
- Temporary PNG written to OS temp dir during build, deleted after PPTX is written
- No worksheet output — graph is slides-only

---

## Must-haves

**M1** `references/graph_gen.py` is a fixed file in the skill package. `build.js`
calls it via `child_process.execSync`, passing data as a JSON argument or temp
file. The script is never regenerated per lesson.

**M2** Default graph style = V2: navy `#152347` background, gold `#FABB2E`
data points (no coordinate labels), gold solid best-fit line (data range only),
amber `#E65100` dashed extrapolation, red `#E42431` shaded vertical band at
x-intercept, stats box top-left (gold border, gold bold text on navy).

**M3** Compact mode (`compact=True`) for Variant B: same V2 style but stats box
omitted (data table already visible) and figure size reduced to fit the right
~50% of the slide. One flag, same function.

**M4** Variant A — `type: "graphResults"`: two-column BUILD slide.
Left ~70%: graph image. Right ~30%: navy panel, gold "Reading the graph"
heading, numbered `graphNotes` items, optional italic gold `closingRemark`.
Slide header: `BUILD · RESULTS GRAPH`.

**M5** Variant B — `type: "graphWithData"`: two-column BUILD slide.
Left ~50%: reference data table (amber header, navy/white rows — same style as
existing model-data slide). Right ~50%: compact graph (M3). Slide header:
`BUILD · DATA + GRAPH`.

**M6** Axis labels derived automatically from `referenceData.headers` — x-axis
from `headers[xCol]`, y-axis from `headers[yCol]`. Never hardcoded to
temperature/pressure.

**M7** Linear regression via `numpy.polyfit` degree 1. Extrapolation range
computed automatically to reach y=0 (x-intercept), plus 20% padding beyond.

**M8** % error shown in stats box when `interceptAccepted` is provided:
`|estimated − accepted| / |accepted| × 100`, rounded to 2 decimal places.

**M9** Works in both environments: claude.ai Linux sandbox (matplotlib always
available) and home Windows PC (matplotlib now installed). No hardcoded paths.

**M10** Graph PNG is a temp file — written to `os.tmpdir()` path, embedded in
PPTX, deleted after build completes. Never left as a stray file.

---

## Nice-to-haves

**N1** `xIntercept: false` disables the extrapolation + red band entirely —
for graphs where y=0 has no physical meaning (e.g. extension vs force).

**N2** Auto-detect trigger: if `lessonType === "practical"` and
`worksheetExtras.referenceData` has ≥4 rows and any build step text contains
"plot", "graph", or "extrapolate" — automatically insert a `graphResults` slide
without needing an explicit build item. (Manual `type: "graphResults"` always
takes priority.)

**N3** Multiple y-columns: `yCol` accepts an array for plotting two data series
on the same graph (e.g. repeat readings).

---

## Out of scope

- Worksheet output — graph slides only, never in DOCX
- Interactive or animated charts
- Any graph type other than scatter + linear best-fit (no bar, pie, histogram)
- Curve fitting beyond degree-1 polynomial
- Student-editable charts (Office XML native charts) — matplotlib PNG only

---

## Integration points

- `references/graph_gen.py` — new file, added to skill package alongside `build.js`
- `references/build.js` — calls `graph_gen.py` via `child_process.execSync` when
  a `graphResults` or `graphWithData` build item is found; passes `referenceData`
  as JSON; receives back the temp PNG path
- Skill package (`science-lesson.skill`) — must include `graph_gen.py`; rebuild
  with `package-skill.ps1` after any change to the script
- Existing model-data slide (lines ~1105–1126 in `build.js`) — `graphWithData`
  replaces this slide when both data and graph are needed together; `graphResults`
  is additive (model-data slide still renders separately if present)
- `CLAUDE.md` three-file output rule unchanged — graph slides are PPTX-only

---

## Success criteria

1. Build a pressure law practical lesson with `referenceData` (≥4 rows) and
   `type: "graphResults"` — PPTX contains a BUILD slide with V2-style graph
   left and analysis panel right. Stats box top-left. No coordinate labels on
   points. Red shaded band at x-intercept.
2. Same lesson with `type: "graphWithData"` — PPTX contains a BUILD slide with
   data table left and compact graph right (no stats box).
3. Axis labels match `referenceData.headers`, not hardcoded strings.
4. No stray PNG files in the project directory after build.
5. Build completes without error on both Windows (home) and Linux (claude.ai).
6. `references/graph_gen.py` is present in the repacked `science-lesson.skill`.
