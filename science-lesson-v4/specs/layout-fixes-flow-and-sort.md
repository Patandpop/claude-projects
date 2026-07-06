# Spec: Layout Fixes — Flow Diagram 6-step SVG and Sort Auto-scale

## Overview
Two isolated layout fixes to `slideLearn` (variant G) and `slideSort` in `build.js`.
Bug 20: the 6-step flow diagram falls into a character-arrow grid branch rather than the SVG bezier-arrow branch used by 3/4/5 steps, producing inconsistent styling and cramped arrows.
E2: `slideSort` caps item box height at 0.7" regardless of item count, leaving half the slide empty at low counts (e.g. 6 items in a 2×3 grid).

## Inputs
- `item.steps` array (Learn G) — 3 to 6 objects with `label` and optional `note`
- `item.items` array (sort question slide) — list of strings to sort
- `item.sorted` / `item.categories` (sort answer slide) — existing schema unchanged

## Outputs
- Learn G: 6-step slide rendered as SVG (same visual style as 3/4/5 steps)
- Sort question slide: box height and font size scale to fill available vertical space
- Sort answer slide: font size inside gold boxes scales to match

## Must-haves

**M1** Add a `6` entry to `LEARN_G_LAYOUTS` (line ~587) so the 6-step case enters the SVG branch (`buildLearnGSvg`) instead of the character-arrow grid branch.

**M2** The 6-step SVG layout follows the snake path: top-left → top-right → mid-right → mid-left → bottom-left → bottom-right. Grid is 3 rows × 2 cols. Boxes are sized to fill the viewBox (match proportions of existing 4-step layout).

**M3** Bezier arrows between the 6 boxes follow the same style as existing entries: gold stroke (#FABB2E), stroke-width 3, gold arrowhead marker. Arrow directions: right across row 1, down on right side, left across row 2, down on left side, right across row 3.

**M4** The character-arrow grid branch (`DEFS` object, line ~864) retains only `1` and `2` step cases; the `6` key is removed from `DEFS` (it is no longer needed).

**M5** In `slideSort` (question slide, line ~1204), remove the `Math.min(0.7, …)` height cap so `cellH` fills the available vertical space: `(BOT_Y - 0.08 - y - (rows - 1) * 0.1) / rows`.

**M6** Font size in each sort item box scales with `cellH`. Use the existing `autoFontSize` helper, or a simple linear rule: `fontSize = Math.min(16, Math.max(11, cellH * 14))`. Apply to both the number prefix and the item text.

**M7** Sort answer slide (line ~1231): font size inside the gold category boxes scales with available height per item. Rule: `fontSize = Math.min(16, Math.max(11, (boxH / list.length) * 14))` where `boxH = BOT_Y - 0.08 - y - 0.42`.

## Nice-to-haves
- N1: For the 6-step SVG, add a light curve to the vertical arrows (as used in the 4 and 5-step layouts) rather than straight vertical lines.

## Out of scope
- Changing layout patterns for 3/4/5-step Learn G (already correct)
- Adding support for 7+ steps
- Changes to the worksheet (sort table is DOCX, unaffected)
- Changing sort slide columns (always 2 columns)

## Integration points
- `science-lesson/references/build.js`
  - `LEARN_G_LAYOUTS` constant (~line 587) — add key `6`
  - `buildLearnGSvg(steps, n)` (~line 632) — no change needed if layout entry is correct
  - `slideLearn` variant G branch (~line 854) — remove `6` from the `else` branch condition
  - `slideSort` (~line 1191) — cellH cap and font scaling
- SVG coordinate system: viewBox units (not inches). Match existing 4-step viewBox `0 0 680 330` or scale to `0 0 680 440` for 3 rows.

## Success criteria
1. A 6-step Learn G slide renders with gold bezier arrows and gold-bordered navy boxes, visually matching the 4-step style.
2. Arrow path traces TL → TR → MR → ML → BL → BR with no overlapping boxes.
3. A sort slide with 6 items fills the slide vertically (no large empty gap below the last row).
4. A sort slide with 10 items still fits without overflow.
5. Sort answer slide font is legible and proportional at both 6 and 10 item counts.
6. Existing 3/4/5-step Learn G slides are visually unchanged.
