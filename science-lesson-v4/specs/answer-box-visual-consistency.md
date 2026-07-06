# Spec: Answer Box Visual Consistency

## Overview
Three related fixes to unify the navy/gold colour scheme across all answer-reveal slides in build.js. The rule: whenever a box contains content a teacher reveals via animation, it uses navy fill (`0D1B5E`) with gold text (`FABB2E`). Currently, sort activity answer boxes use plain white fill; MCQ and review/Do Now answer cells use navy fill but white text; and the graphInterpret answer slide combines Q+A in one box (making per-answer animation impossible). This spec standardises all three to the navy/gold scheme and eliminates the graphInterpret two-slide pattern.

## Inputs
- Existing lesson content JSON — no schema changes required
- `science-lesson/references/build.js` — the only file to modify

## Outputs
- Modified `build.js` with consistent navy/gold answer boxes in `slideSort`, `reviewRow`, `slideMcq`, and `slideGraphInterpret`
- No worksheet output changes

## Must-haves

**M1** — `slideSort` answer content boxes (the item lists under each category header, `goldBox` call at ~line 1228) use navy fill + gold text: `{ fill: NAVY, color: GOLD }`. Category header boxes (amber/green) are unchanged.

**M2** — `reviewRow()` answer cell (right column, ~line 386–389) uses navy fill + gold text. Change `color: 'FFFFFF'` → `color: GOLD`. Applies to both Do Now answer slides and Review answer slides, which share this function.

**M3** — `slideMcq` answer box (~line 1085) uses navy fill + gold text. Change `color: 'FFFFFF'` → `color: GOLD`. Run-level colour overrides in `ansRuns` are not set, so the box default propagates.

**M4** — `slideGraphInterpret` is refactored from two slides to one:
- The question-only slide (slide 1) is removed
- The answer slide is kept with the "READ THE GRAPH: ANSWERS" header and purple pen bar
- For each question, Q and A are rendered as **two separate stacked boxes** within the same right-side panel:
  - Question box: navy fill, white text, `"Q1  …question…"`
  - Answer box: navy fill, gold text, answer text
- The combined height of the Q+A pair equals the current per-question slot (`ph`)
- Teacher adds entrance animation to each answer box manually in Google Slides — no animation set in code

**M5** — No other slide types are changed.

## Nice-to-haves
None.

## Out of scope
- Worksheet changes
- Programmatic animation (entrance effects applied manually in Google Slides)
- Changes to category header colours in `slideSort`
- New content schema fields

## Integration points
- `build.js` functions: `slideSort` (~1228), `reviewRow` (~386), `slideMcq` (~1085), `slideGraphInterpret` (~1483–1517)
- Colour constants already in scope: `NAVY = '0D1B5E'`, `GOLD = 'FABB2E'`
- `goldBox(slide, x, y, w, h, content, opts)` accepts `{ fill, color }` overrides — use `{ fill: NAVY, color: GOLD }` pattern throughout

## Success criteria
1. Sort activity answer slide: item-list boxes are navy fill with gold text; category headers unchanged
2. Do Now answer slide: answer cells (right column of `reviewRow`) show gold text on navy
3. Review answer slide: same — gold text on navy via the shared `reviewRow()` change
4. MCQ answer box: gold text on navy
5. `graphInterpret` lesson produces **one** slide (not two) — graph on left, stacked Q-box + A-box pairs on right, each pair filling the same vertical slot as before
6. No layout regressions — no overflow, text legible at classroom projection size
