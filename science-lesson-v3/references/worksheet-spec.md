# worksheet-spec.md — v2.1
# Authoritative worksheet formatting spec — Beechen Cliff School
# All worksheet rules live here. slide-options-v4.md defers entirely to this file.

---

## HARD RULES

- No class name in title — topic only
- No Name / Class / Date fields — never add
- No sidebars — no navy side columns or any sidebar element
- No horizontal rules between questions — spacing only
- Write in books by default — no answer boxes unless marks/table/diagram required
- Tier badges = narrow pills, NOT full-width bars
- Section dividers = full-width navy bars (DO NOW / BUILD / APPLY / RESULTS only)
- Word banks: Developing tier only; never when only 2 options or answer is obvious
- No strikethrough distractors in word banks
- No hint boxes, no purple pen, no AO1/AO2

---

## Page Setup

A4: `{ width: 11906, height: 16838 }` · margins `top/bottom 720, left/right 900` · content width **10106 DXA**
Font: Libre Baskerville · min 18 half-pts

---

## Header (page 1 only)

Starfield image (`references/starfield_header_FINAL.png`), full width, inline before title. No frame.

**⚠️ Starfield must be regenerated each session** — files do not persist between sessions. Use `gen_starfield.py` with galaxy parameters. The header must use the galaxy variant (arms, tilt, wipe) — plain random stars look flat and wrong.

Confirmed working parameters:
```python
# Header: 1500×120px, galaxy, cx=750 cy=60 scale=330 tilt=0.22, 3 arms, seed=92
# wipe_rx=349 wipe_ry=76, 220 stars seed=3
# Sidebar (if used): 120×1754px, stars-only, 257 stars seed=42
```

---

## Google Docs / LibreOffice compatibility

The DOCX must open correctly in both Word and Google Docs. Key requirements:

- **Cell shading**: use `ShadingType.CLEAR` (not `SOLID`) with `color: 'auto'` — this is the only form both renderers respect. `SOLID` shows no fill.
- **Post-process the DOCX zip**: after `Packer.toBuffer()`, open the zip with `AdmZip`, read `word/document.xml`, and ensure all `w:shd` elements use `w:val="clear"` not `w:val="solid"`. Patch before writing the final file.
- **Table widths**: always set at both table level and cell level (`WidthType.DXA`). Post-process sort tables if needed.
- These steps are mandatory — without them, coloured dividers and tier badges will not render in Google Docs or LibreOffice.

---

## Pre-built component functions

Write these once at the top of every worksheet script and call by name.

### `divider(text)`
Full-width navy bar, gold bold text. Margins top/bottom 80, left/right 180. No borders.
`fill: "0D1B5E"` · text `size 22, bold, color "FABB2E"`

### `tierBadge(tier)`
Narrow pill `width 1800 DXA`. No borders. Margins top/bottom 40, left/right 140.
| tier | fill | text color |
|---|---|---|
| Developing | `1E5C2D` | `FFFFFF` |
| Reaching | `C05A00` | `FFFFFF` |
| Mastering | `9B1B1B` | `FFFFFF` |
Text: `size 18, bold`

### `wordBank(terms[])`
Single paragraph. `size 18`.
Label: `bold, color "1E5C2D"` → `"Word bank: "`
Terms: `italic, color "1E5C2D"` → joined with ` · `

**Sort tables:** use plain grey borders (`CCCCCC size 4`), NOT gold. Gold borders on paper look garish and waste ink.

### `question(num, text, marks?)`
Paragraph `size 20, spacing before/after 60`.
`"Q{num}  "` bold + question text plain + optional `"  [{marks} marks]"` plain.
Sub-parts: `indent left 360`, same size.

### `answerBox(marks)`
Full-width single-cell table, border `CCCCCC size 1`, margins 60/120.
Lines: `marks <= 1` → 2 blank paras · `marks <= 3` → 5 · `marks <= 6` → 10
Only use when question has mark allocation or needs write-on space.

### `contextBox(text)`
2-col table `[120, 9986]`. Left cell: fill `0D1B5E`, no border. Right cell: fill `EDF2FA`, no border, margins 80/160. Text `size 20, italic`.

### `resultsTable(headers[], rows)`
Full-width. Header row: fill `0D1B5E`, white bold centred text `size 20`. Data rows: border `CCCCCC`, 3 blank paragraphs per row. Column widths proportional, sum to 10106.

### `variablesTable()`
3-col `[3368, 3368, 3370]`. Headers: "Independent variable" | "Dependent variable" | "Control variables". Navy fill header, 3 blank lines per body cell.

### `guessScaffold()`
5-col `[2021, 2021, 2021, 2021, 2022]`. Headers: Given | Unknown | Equation | Substitute | Solve. Fill `0D1B5E`, text `FABB2E`. Answer row: 3 blank paras, border `CCCCCC`.

### `structureGuide(lines[])`
Each line: paragraph `indent left 360, size 20, italic`. Blanks as underscores. Options as `(a / b)` appended in `size 18, color "555555"`.

### `sentenceStarters(starters[])`
Table, full width `10106 DXA`. One row per starter.
Each cell: `shading fill "FFFDE7"`, left border only `FABB2E size 12`, margins top/bottom 40, left 200.
Text: `size 20, italic, color "555500"`.
Use for Mastering 6-mark questions. Gold left-border signals "scaffold, not answer".

### `bookletNavTable(rows[])`  *(Type C only)*
3-col `[1500, 5606, 3000]`. Headers: "Test Question" | "Topic" | "Booklet Section". Fill `0D1B5E`, white bold. Alternating rows white / `F5F5F5`.

### `linksBar(text)`  *(Type C only)*
Single-cell table, fill `EDF2FA`, italic `size 18, color "0D1B5E"`. e.g. `"Links to test paper: Q1 and Q2"`.

---

## Scaffolding rules

| Scaffold | Developing | Reaching | Mastering |
|---|---|---|---|
| Word bank | ✅ vocab-heavy only | ❌ | ❌ |
| Sentence starters | Full | Stems | Minimal |
| Structure guide | Full frame | Partial | Bare |
| GUESS scaffold | Pre-filled G+U | Blank | ❌ |
| Answer box | Only with marks | Only with marks | Marks-sized |

**Exception:** Mastering 6-mark questions may have sentence starters via `sentenceStarters()` regardless of tier rules — confirmed acceptable for complex explain/draw questions where structure genuinely helps.

---

## Typography

| Element | Size (half-pts) | Bold | Notes |
|---|---|---|---|
| Title | 36 | Yes | Navy `0D1B5E` |
| Section divider | 22 | Yes | Gold on navy |
| Tier badge | 18 | Yes | White on tier colour |
| Body / question | 20 | No | Spacing 60/60 |
| Word bank | 18 | Label only | Green `1E5C2D`, italic terms |
| Italic scaffold | 20 | No | Italic |
| Sentence starter | 20 | No | Italic, `555500`, gold left border |
| Table header | 20 | Yes | White on navy |
| Links-to-test | 18 | No | Italic, `EDF2FA` bg |

Line spacing: `{ line: 240, rule: LineRuleType.AUTO }`

---

## Worksheet Types

**A — Lesson companion:** Do Now + Build + Apply (D/R/M). Write in books. Word banks + starters at Developing only.
**B — Exam practice:** Apply only, mark allocations, answer boxes by marks, context boxes.
**C — Post-test review booklet:** Nav table at top, D/R/M sections, answer boxes (marks-sized), links bar per section. Ref: Quantum_Physics_Review_Booklet.
**D — Multi-topic revision grid:** Two-column question blocks, gold/navy headers per question. Ref: Y8_Mixed_Extension_Questions.
**E — Practical:** Variables table + results table + conclusion questions. Write in books on qualitative questions. Ref: 7MLA_Combustion_Worksheet.
**F — General revision:** Heavy question bank across tiers, worksheet carries lesson.
**G — Video companion:** Numbered video questions, applied questions at end, no boxes.
**H — Cover / independent:** Full question bank, worksheet is the lesson.

---

## Overflow priority

1. Cut Do Now · 2. Cut lowest-tier Build · 3. Cut answer lines · 4. Never cut Apply · 5. Never shrink below size 18
Build once. Do not rebuild to fit.
