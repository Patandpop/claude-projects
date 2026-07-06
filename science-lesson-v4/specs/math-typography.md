# Spec: Math Typography

## Overview
Replace precomposed Unicode sub/superscript glyphs in build.js with native run-level
formatting, and add stacked fraction support, for both DOCX worksheets and PPTX slides.
Currently, equations like `v = s/t` or `m s⁻²` use Unicode glyphs that Libre Baskerville
doesn't cover, causing Word to silently substitute a different font — bloating worksheet
files from ~41 KB to ~2 MB and producing visually mismatched characters. This fix makes
math render correctly regardless of font glyph coverage, and adds stacked fractions so
equations read like printed textbook notation rather than inline keyboard notation.

## Inputs
- Lesson content JSON strings containing math notation using the mini-syntax:
  - `{num/den}` — stacked fraction, e.g. `"v = {s/t}"`
  - `^n` — superscript, e.g. `"E = mc^2"`, `"m s^-2"`
  - `_n` — subscript, e.g. `"CO_2"`, `"H_2O"`
  - Tokens run to the next space, operator, or closing `}` — e.g. `^{long term}` for multi-character superscripts
- Existing JSON that uses Unicode glyphs (ₐ ᵣ ⁻ ² etc.) — must not break

## Outputs
- DOCX worksheets: sub/superscript rendered via `w:vertAlign val="superscript"/"subscript"` on `w:r` runs; fractions rendered as OOXML math objects (`<m:oMath>` / `<m:f>`)
- PPTX slides: equivalent run-level formatting via DrawingML `<a:rPr baseline="+30000"/"-25000">`; fractions as Office Math objects in text boxes
- No change in file size for worksheets that contain no math notation
- Worksheets with math notation stay near baseline size (~41–60 KB), not inflated to MB range

## Must-haves

**M1** A `parseMathString(str)` function in build.js that tokenises a string containing the mini-syntax into an array of segments: `{ type: 'text'|'sup'|'sub'|'frac', value, num, den }`.

**M2** `toDocxRuns(str)` uses `parseMathString` and emits:
- plain text → normal `w:r`
- sup/sub → `w:r` with `<w:vertAlign w:val="superscript"/"subscript"/>` in `w:rPr`
- frac → inline `<m:oMathPara><m:oMath><m:f>…</m:f></m:oMath></m:oMathPara>` block

**M3** The PPTX run builder (equivalent of `toDocxRuns` for slides) uses `parseMathString` and emits:
- sup/sub → `<a:rPr baseline="+30000"/>` (superscript) or `<a:rPr baseline="-25000"/>` (subscript)
- frac → Office Math object embedded in the text frame

**M4** All existing Unicode precomposed glyphs (ₐ ᵣ ₘ ₛ ⁻ ¹ ² ³ etc.) in equation strings are converted or left as literal text — they must not cause font substitution. If legacy JSON still contains Unicode glyphs, the parser passes them through as plain text (no crash, visible mismatch acceptable until content is updated).

**M5** Equation font: keep the existing equation font for runs (not switching to Cambria Math). Fractions use the same font for numerator and denominator text.

**M6** Surrounding non-math text is unaffected — font, size, colour, and spacing of adjacent normal runs must not change.

**M7** A worksheet built from a lesson JSON containing at least one fraction and one superscript must be ≤ 100 KB (no font-substitution bloat).

## Nice-to-haves

**N1** Multi-character super/subscript via `^{m s}` brace syntax.

**N2** Negative exponents: `^-2` correctly superscripts `-2` as a unit (e.g. `m s^-2`).

**N3** Strip any remaining precomposed Unicode glyphs from existing content JSONs as a one-off migration script.

## Out of scope
- True integral, sigma, or radical symbols (no LaTeX `\int`, `\sum`, `\sqrt`)
- Cambria Math / OMML full equation editor objects (overkill for science worksheet use)
- Automatic detection of `/` in plain prose as a fraction (too error-prone)
- Changing the font family for equations

## Integration points
- `science-lesson/references/build.js` — primary file; `toDocxRuns()` and the PPTX run builder live here
- Content JSON lesson files — input format changes (mini-syntax replaces Unicode glyphs)
- `science-lesson/references/worksheet-spec.md` — update equation notation section if it exists
- `science-lesson/SKILL.md` — add mini-syntax reference so claude.ai knows how to write equations

## Success criteria
- A worksheet containing `"v = {s/t}"`, `"E = mc^2"`, and `"CO_2"` renders stacked fraction, superscript, and subscript correctly when opened in Word
- The same lesson's PPTX shows matching formatting in PowerPoint
- Worksheet file size with math content is ≤ 100 KB (was ~2 MB with Unicode bloat)
- Existing lessons with no math notation produce identical output to before
- No manual font-fixing step needed after opening the file in Word
