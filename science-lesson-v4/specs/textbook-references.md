# Spec: Textbook references + book ordering

## Purpose
Surface textbook page references to students in the **Apply** section of every lesson, and drive
**book ordering** on the weekly technician order sheet — both fed from the existing
`science-lesson/references/textbook-index.md`. One source of truth (the index), two consumers
(build.js for lessons, order-sheet.js for the order sheet).

Prompted by the "book index" goal: the index data already exists (Kerboodle GCSE Bio/Chem/Phys +
Activate 1 & 2, with page numbers). This spec covers the two *uses* of that data, not the data
itself. **CGP is out of scope for now** — KS4 GCSE (Kerboodle) books stand in for it.

---

## Signed-off decisions (2026-07-03)
- **Matching:** auto-match the lesson topic against the index, with an **optional per-lesson
  override** field. No confident match → no reference shown, no books ordered.
- **Apply display:** the page reference shows on the **Apply slide AND** the Apply section of the
  **worksheet**.
- **CGP:** excluded; KS4 books used instead.

---

## Shared module: `references/textbook-index.js` (NEW)
A single parser + matcher used by BOTH build.js and order-sheet.js (avoids two divergent matchers).

- `loadIndex(mdPath)` → parses `textbook-index.md` into structured entries:
  `{ book, code, title, page }` per section (e.g. `{book:'AQA Biology (Kerboodle)', code:'B3.4',
  title:'Catalysts and enzymes', page:42}`), plus the year→book mapping table at the top.
- `matchLesson({ year, subject, topic, keywords })` → `{ book, pages:[start,end?], sections:[…] }`
  or `null`. Fuzzy-match `topic` + `title.keywords`/`subtopics` against section titles, **constrained
  to the class's year→book set** (see below). Contiguous matched sections collapse to a page range.
  Confidence threshold; below threshold → `null` (this is the "can't be forced → no books" case,
  common for KS3 topics that don't line up with Activate 1/2).
- `primaryBook({ year, subject })` → the class's standard book for review ordering (no section match
  needed). KS4 → Kerboodle by subject; KS3 → Activate 1/2 by year; else `null`.

**Packaging:** `textbook-index.js` AND `textbook-index.md` must be added to the skill package
(`package-skill.ps1` `$ENTRIES` + CLAUDE.md list), because build.js runs on claude.ai too and needs
the index at build time. order-sheet.js is home-only and reads them directly.

### Year → book set (from textbook-index.md mapping; confirm)
| Year | Books searched |
|---|---|
| Y7, Y8 | Activate 1 + Activate 2 (KS3) |
| Y9 | Activate 2 + Kerboodle GCSE (dual — match against both, prefer confident hit) |
| Y10, Y11 | Kerboodle GCSE, by lesson `subject` (Biology / Chemistry / Physics) |
| Y12 | none (A-level not in index) → no reference, no books |

---

## Override field (lesson JSON)
`meta.textbookRef`, optional:
- `"B3.4"` or `["B3.4","B3.5"]` — force these section code(s); pages come from the index.
- `{ "book": "...", "pages": "42-44" }` — fully explicit.
- `"none"` — suppress reference + ordering even if auto-match would hit.
- absent — auto-match.

---

## Consumer 1 — Apply section (build.js)
On lessons where `matchLesson`/override yields a hit:
- **Apply slide** (`slideApply`, build.js ~L2350): add a compact reference strip — house style navy
  fill / gold text, no stray glyphs — e.g. `Read more — Activate 2, pp. 10–12`. Placed so it does
  not collide with the tier boxes (footer strip above `bottomBar`, or a right-aligned tag in the
  section header). Only rendered when there is a match.
- **Apply worksheet section**: same reference line at the head/foot of the Apply questions in the
  worksheet builder (and the support worksheet).
- No match / `"none"` → render nothing (silent, no placeholder).

## Consumer 2 — Order sheet (order-sheet.js)
Per period's next lesson, decide books alongside the existing equipment/sets logic:

| Lesson kind (detected as today, by name/type) | Books ordered |
|---|---|
| Practical / experiment (`practical`/`prac`/` rp`) | **none** |
| Test (name contains `test`, not `review`) | **none** |
| Test **review** / revision (`review`/`revision`) | **2 sets** of `primaryBook` (by year+subject); no page ref, just the book |
| Normal lesson **with** a textbook match | **1 set** of the matched book |
| Normal lesson with **no** match, or Y12, or no book for the year | **none** |

- **Where it appears:** append a `Books: N× [book]` clause to that period's equipment cell text
  (least-invasive; the sheet's row layout is fixed — see order-sheet.md output format). Page numbers
  are NOT written on the order sheet.
- Reuses the order sheet's existing lesson-name classification (Best-Guess rules already detect
  test/review/practical) and the class→year mapping.

---

## Verification
- Unit test for `textbook-index.js`: `loadIndex` count sanity; `matchLesson` returns correct
  book+pages for known topics (e.g. "Catalysts and enzymes"→B3.4 p42), `null` for an unmatchable
  KS3 topic; `"none"` override suppresses; review uses `primaryBook`. Wire into `test/run.js` or a
  sibling like `lesson-log.test.js`.
- build.js: extend a fixture (e.g. amylase = enzymes, matches B3.4) so `npm test` asserts the
  reference strip text appears in the Apply slide XML and the worksheet; a no-match fixture asserts
  nothing is rendered.
- order-sheet.js `--dry-run`: confirm 1× for a normal matched lesson, 2× for a review, none for a
  practical/test/unmatched, across a KS3 and a KS4 class.

## Packaging / build-order notes
- `build.js`, `SKILL.md`, `slide-options-v4.md`, `textbook-index.js`, `textbook-index.md` change →
  `package-skill.ps1` (repackage) + upload. order-sheet.js is home-only (not packaged).
- Touches build.js → **use Plan Mode** for the build phase.
- SKILL.md: document `meta.textbookRef` + the Apply reference behaviour. slide-options-v4.md: note
  the Apply reference strip.

## Open items to confirm before build
1. Year→book set table above (esp. the Y9 dual rule and Y12 = none).
2. "1 set" / "2 sets" = whole class sets (matching the order sheet's existing per-period sets
   notion), not per-student — assumed yes.
3. Exact on-slide placement of the reference strip (footer vs header tag) — settle during Plan Mode.
