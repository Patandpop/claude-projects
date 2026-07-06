# Spec: Worksheet Apply Spacing Fix

## Overview
The DOCX worksheet renderer in `build.js` uses inconsistent paragraph spacing (`spacing: { before, after }`) values throughout the document body — before tables, after titles/headings, and between question blocks (Apply section and elsewhere). These values are currently a loose, uncoordinated mix (0, 10, 20, 30, 40, 60, 80, 120, 160 twips) that add up to regular page overflow, most visibly in the Apply section. This spec tightens and standardises paragraph spacing document-wide, in both the standard and support worksheets, while leaving the 1.5 line-spacing rule (`spacing.line: 360, LineRuleType.AUTO`, BDA accessibility requirement) completely untouched. Marks annotations (e.g. "[2 marks]") already provide visual separation between questions, so gaps do not need to carry that job on their own.

## Inputs
- `science-lesson/references/build.js` — the only file to modify
- Benchmark lesson content JSON used to measure before/after impact: `amylase-test-9ab.json` (a normal experiment-based lesson, has the correct `meta`/`apply` schema build.js expects)
  - `_organisation_review_content.json` was considered but dropped during /build — it's consumed by a separate script (`test-review-lesson.js`), has no `meta`/`apply` fields, and can't be rendered through `build.js`'s worksheet path at all
- No lesson content schema changes required

## Outputs
- Modified `build.js` with reduced, standardised `spacing.before`/`spacing.after` values across worksheet-generating paragraph/table calls (both standard and support worksheet code paths)
- A before/after count of spacing-affecting paragraphs (headers, question blocks, spacers) generated for each benchmark lesson, so the reduction can be sanity-checked without opening Word
- No change to slide (pptx) output — worksheets (docx) only
- No change to `spacing.line` (1.5 line spacing) anywhere

## Must-haves

**M1** — Reduce and standardise `spacing.before`/`spacing.after` values on paragraphs immediately before tables (e.g. GUESS scaffold tables, sentence-starter tables) across the worksheet renderer.

**M2** — Reduce and standardise `spacing.after` on title/heading paragraphs (e.g. lesson title at ~line 2426, section headers).

**M3** — Reduce and standardise `spacing.before`/`spacing.after` between question blocks in the Apply section (`applyTierSection`, ~line 2482 onward), including around word banks, GUESS scaffolds, sentence starters, and hint lines.

**M4** — Changes apply uniformly to both the standard worksheet and the support worksheet code paths — the support worksheet keeps no extra "breathing room" despite its denser scaffolding (hints, word bank, GUESS boxes).

**M5** — `spacing.line` / `LineRuleType.AUTO` (1.5 line spacing, ~line 2745) is never modified anywhere in the file.

**M6** — The tightened values are consistent — collapse the current scattered set (0/10/20/30/40/60/80/120/160) down to a small, deliberate set of values reused across similar paragraph types, rather than each call site picking its own number.

**M7** — Produce a paragraph-count comparison (before vs. after) for the benchmark lesson (`amylase-test-9ab.json`, both worksheet modes) — total spacing-affecting paragraphs generated, broken out so header/question counts are visibly unchanged (content wasn't dropped) while spacer/gap contribution is visibly reduced.

## Nice-to-haves
None.

## Out of scope
- Line spacing (1.5x) — never touched, per BDA accessibility rule
- Font sizes, margins, page size/orientation
- PPTX (slide) rendering — this is worksheet (DOCX) only
- Question/content changes — same questions, same tiers, same scaffolding elements; only the spacing around them changes
- Automated page-count verification (e.g. via LibreOffice/Word CLI) — user will verify final page count manually by opening the generated `.docx` files in Word

## Integration points
- `science-lesson/references/build.js`:
  - `applyTierSection` (~line 2482) — primary Apply-section spacing logic
  - `wordBank()` (~line 2099), `sentenceStarters()` (~line 2275) — called within Apply and cloze sections
  - `spacer()` (~line 2055) and `blanks()` (~line 2054) — shared spacer paragraph helpers
  - Title paragraph (~line 2426), section headers (~line 2600)
  - Line-spacing definition (~line 2745) — reference only, not modified
- Benchmark content file: `amylase-test-9ab.json`
- Both worksheet generation paths (standard + support), which share most of the same functions with `mode`/tier branching

## Success criteria
1. For the benchmark lesson, the paragraph-count comparison (M7) shows fewer total spacing-contributing paragraphs after the change, with header/question counts identical before and after
2. User opens the regenerated `.docx` files (standard and support) for the benchmark lesson in Word and confirms the Apply section fits on one page
3. Line spacing remains visibly 1.5 throughout — no regression to that rule
4. No content (questions, hints, word banks, scaffolds) is dropped or altered — only spacing values changed
5. Spacing values are consistent across similar paragraph types (not ad hoc per call site)
