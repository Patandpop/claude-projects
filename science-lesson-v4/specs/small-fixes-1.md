# Spec: Small Fixes Bundle 1 (B5, B6, B9, B10, B13, E9, E11)

## Overview

Seven small, isolated fixes to `references/build.js` covering visual regressions,
hardcoded strings, a missing enforcement guard, a class-name leak, and two worksheet
content tweaks. All changes are self-contained — no new schema fields except E11's
optional `worksheetIntro` flag. Each fix is a 1–5 line change at a known location.

## Inputs

- `references/build.js` — the renderer being patched
- Lesson content JSON — existing fields `meta.class`, `meta.year`, `meta.theme`,
  `title.keywords`, `worksheetExtras.wordBank`, `build[].intro`, `build[].title`,
  `build[].heading`; new optional field `build[practical].worksheetIntro`

## Outputs

- Patched `references/build.js` (in-place edit — no new files)
- No change to output file names or folder layout
- PPTX and DOCX outputs reflect all 7 fixes when next built

## Must-haves

**M1 — B5: Title slide Key Words box height**
The `kwH` constant (currently `1.05` inches) must be increased to give the Keywords
`goldBox` enough headroom that the text does not overflow the gold border after a
PowerPoint open/edit/resave cycle. Target: `1.2` inches (adjust if visual check shows
still tight). Change is in `slideTitleDoNow` around line 450.

**M2 — B6: Worksheet practical section heading**
`divider('EXPERIMENT')` (line 2643) must be replaced with a derived heading:
`divider(pracA.heading || pracA.title || 'EXPERIMENT')`.
If the practical item carries a `heading` field use that; else fall back to
`pracA.title`; else keep `'EXPERIMENT'` as the final fallback.
No new schema field required — `heading` and `title` already exist on build items.

**M3 — B9: MCQ count — error not just warning**
The MCQ count check (lines 1901–1903) currently `console.warn`. Change to
`console.error` so the issue is visually distinct in terminal output. Do NOT throw
or abort the build — output is still useful even if count is wrong. The goal is that
a count ≠ 4 is impossible to miss in the build log.

**M4 — B10: Do Now / title slide subtitle — strip class identifier**
Line 441 currently renders `meta.class` (e.g. `"8XP"`) as the subtitle.
Change the fallback to use `meta.year` if present, otherwise derive the year group
by taking the leading digit(s) of `meta.class` (e.g. `"8XP"` → `"Year 8"`).
Format: `` `Year ${year}  ·  ${cap(meta.theme || 'Science')}` ``.
`meta.yearLine` override must still take precedence (already wired — do not remove).

**M5 — B13: Support worksheet word bank — respect class profile**
Two call sites fall back to `title.keywords` when `worksheetExtras.wordBank` is
absent:
- `applyTierSection` line ~2412: `const bank = wx.wordBank || arr((L.title || {}).keywords);`
- `clozeSection` line ~2560: `const bank = wx.clozeWordBank || wx.wordBank || arr((L.title || {}).keywords);`

At both sites, skip the `title.keywords` fallback when `meta.class` is in the
no-word-bank set. Define once at the top of the worksheet builder function:
```js
const NO_WORD_BANK = new Set(['8AB', '9AB']);
const allowKeywordBank = !NO_WORD_BANK.has(L.meta && L.meta.class);
```
Then gate the keyword fallback: `wx.wordBank || (allowKeywordBank && arr(...keywords))`.
`wx.wordBank` (explicit override in JSON) must still work for any class — only the
`title.keywords` auto-fallback is suppressed.

**M6 — E9: Drop "Write your prediction:" label from worksheet**
Line ~2393 in `buildQuestionBlocks` renders:
```js
out.push(P(R('Write your prediction:', { italic: true, size: 22, color: '555555' }), ...));
```
Remove this line entirely. The ruled write-line that follows it is self-explanatory.
No flag needed — always omit.

**M7 — E11: Suppress slide-only intro text from worksheet**
Line 2644: `if (pracA.intro) ch.push(...contextBox(pracA.intro));`
Add a gate: only push to the worksheet if `pracA.worksheetIntro !== false`.
The slide renderer (line 1240) is unchanged — `item.intro` always renders on the slide.
New optional field: `build[practical].worksheetIntro` (boolean, default `true`/omitted).

## Nice-to-haves

**N1** — For M4, if neither `meta.year` nor `meta.class` is present, fall back to
`cap(meta.theme || 'Science')` alone (no year prefix), rather than an empty string.

## Out of scope

- Any change to the PPTX slide layouts beyond the Keywords box height (B5)
- Changing which classes have no word bank — the set `{8AB, 9AB}` is the spec;
  if more classes need adding that is a future change
- Enforcing MCQ count at content-generation time (B9 is renderer-side only)
- The `item.intro` field on non-practical build items

## Integration points

- `references/build.js` — all changes are in this single file
- Lesson content JSON schema — one new optional field: `build[practical].worksheetIntro`
  (boolean). Existing JSONs without it behave identically to today (default = render intro)
- `SKILL.md` — after patching, add a one-line note under the practical build item schema
  documenting `worksheetIntro: false`
- `package-skill.ps1` — must be run at end of session to repackage the skill

## Success criteria

1. Build `amylase-test-9ab.json` (or any 9AB lesson): support worksheet has no word bank.
2. Build any lesson with a `practical` build item that has `worksheetIntro: false`:
   worksheet omits the intro line; slide still shows it.
3. Build any lesson with a `practical` build item that has a `title` field:
   worksheet section heading shows the title, not `"EXPERIMENT"`.
4. Build any lesson with keywords on the title slide: Key Words box does not clip
   after manual open/resave in PowerPoint.
5. Build `amylase-test-9ab.json`: Do Now subtitle reads `"Year 9  ·  Chemistry"` (or
   the relevant subject), not `"9AB  ·  Chemistry"`.
6. Build any lesson with `predictThenCheck`: worksheet shows a ruled line with no
   `"Write your prediction:"` label above it.
7. Console output for a lesson with 3 MCQs shows `[build] MCQ count 3 ≠ 4` in red
   (error level), not buried as a warning.
