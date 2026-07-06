# Spec: Enhancements E6, E7, E12 — A-Level Lesson Improvements

## Overview
Three targeted improvements to build.js for A-level and dense-lesson scenarios.
E6 adds a configurable question-slot count to the Do Now slide (floor currently
hardcoded to 5). E7 extends Learn-F to render two headline equations side by side
when a derivation uses paired relationships. E12 increases the gap between the
title text and subtitle line on the title/Do Now slide when the large (32 pt)
title font is in use, preventing crowding.

## Inputs
- `L.doNow.count` — new optional integer; sets the minimum number of question
  slots on the Do Now slide. Default behaviour (absent field): current floor of 5.
  Typical A-level value: 6.
- `L.learn[n].equations` — new optional two-element string array on a Learn-F
  item; replaces `L.learn[n].equation` when a twin-equation layout is needed.
  Example: `["N = nN_{A}", "k = R/N_{A}"]`
- `L.meta.title` — existing field; its derived font size (already computed in
  `slideTitleDoNow`) drives the subtitle spacing adjustment.

## Outputs
PPTX output only — no DOCX worksheet impact for any of the three changes.

## Must-haves

**M1** — `doNow.count` slot floor: extract `doNow.count` in `slideTitleDoNow`
and use `Math.max(qs.length, doNow.count ?? 5)` in place of the hardcoded
`Math.max(qs.length, 5)` at line 478.

**M2** — `slideDoNowAnswers` is not changed: it continues to render only
questions with content (`qs.length` rows), regardless of `doNow.count`.

**M3** — Learn-F twin layout render: when `item.equations` is a two-element
array, render two equation boxes side by side (equal widths, gap ≈ 0.12 in,
same combined height `eqH = 1.0`) each with the same dark fill (`'152347'`) and
GOLD border as the existing single equation box. Both strings pass through
`parseEq` / `toPptxRuns` with the same font settings (fontSize 28, GOLD, bold).

**M4** — Learn-F twin layout guard: when `item.equations` is present (and has
two elements), `item.equation` (singular) is ignored. When `item.equations` is
absent or has fewer than two elements, existing single-equation behaviour is
unchanged.

**M5** — Title subtitle spacing: in `slideTitleDoNow`, extract the title font
size to a local variable (`const titleFs = title.length > 45 ? 26 : 32`) and
replace `y += 1.5` with `y += titleFs >= 32 ? 1.65 : 1.5`, adding 0.15 in
extra vertical gap when the title renders at the larger size.

## Nice-to-haves

**N1** — `doNow.count` accepts any positive integer (4, 5, 6, 7 …), not just
the A-level value of 6.

**N2** — If `item.equations` has more than two elements, only the first two are
rendered; no error is thrown.

## Out of scope
- Worksheet DOCX changes — all three patches are PPTX-only.
- Auto-detecting class profile to set `doNow.count` — the field is explicit in
  the lesson JSON; there is no inferred behaviour from `meta.class`.
- Three-or-more equation layouts for Learn-F.
- Changing the title font size algorithm itself.

## Integration points

| Patch | File | Approx line | Current code |
|-------|------|-------------|--------------|
| M1 | `science-lesson/references/build.js` | 478 | `const n = Math.max(qs.length, 5);` |
| M3/M4 | same file | 793–798 | `txt(s, toPptxRuns(parseEq(item.equation …` |
| M5 | same file | 437–441 | `fontSize: title.length > 45 ? 26 : 32` / `y += 1.5` |

## Success criteria
1. Lesson JSON with `doNow: { count: 6, questions: [{…}×4] }` renders 6 slots on
   the Do Now slide (4 filled, 2 blank); without `count` field, 5 slots appear.
2. Learn-F item with `equations: ["N = nN_{A}", "k = R/N_{A}"]` renders two
   side-by-side equation boxes of equal width; an adjacent Learn-F item using
   `equation: "F = ma"` still renders the single-box layout unchanged.
3. A lesson with a short title (≤ 45 chars, 32 pt) shows a visibly larger gap
   between the title and the year/theme subtitle line compared to before; a long
   title (> 45 chars, 26 pt) is unchanged.
4. All three changes build without error against an existing lesson JSON.
