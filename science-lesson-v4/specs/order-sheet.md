# Spec: Weekly Equipment Order Sheet Generator

## Purpose
Automate Patryk Tomczynski's weekly lab equipment order sheet for Beechen Cliff School technicians. Currently filled manually each week. The tool reads last week's order data from Planner.xlsx, determines next lessons in sequence, looks up equipment, and writes a new order sheet tab into the same file.

---

## File locations (home / Windows only)

| Resource | Path |
|---|---|
| Planner.xlsx | `./Planner.xlsx` (project root at time of run) |
| Equipment key | `./science-lesson/references/equipment-key.md` |
| Textbook index | `./science-lesson/references/textbook-index.md` |
| Upload log | `./upload-log.txt` (created if absent) |
| Drive lessons | `G:\My Drive\Beechen Cliff Science\Lessons\Year [N]\[Subject]\[Macrotopic]\` |

---

## CLI

```
node science-lesson/references/order-sheet.js [--week-start YYYY-MM-DD] [--dry-run]
```

- `--week-start` — override the Monday date (default: next Monday from today)
- `--dry-run` — print summary and exit, write nothing

---

## Classes (all taught by Patryk alone)

`7BYA`, `7MLA`, `8AB`, `8XP`, `9AB`, `10S2`, `12D`

Also: `7MLB` appears in the timetable (other teacher — mark N/A for equipment)

Year groups: 7→Year7, 8→Year8, 9→Year9, 10→Year10, 11→Year11, 12→Year12

---

## Week A/B logic

- Academic year always starts **Week B** (first Monday of September term)
- Alternates B→A→B→A continuously, **including over school holidays** (holidays do not reset or skip the alternation)
- To determine next week type: find the most recent filled order sheet in Planner.xlsx, read its week type from the sheet name (`Order Sheet Week A - ...` or `Order Sheet Week B - ...`), return the opposite
- "Anomalous" sheet names (e.g. "Order Sheet Week 9  - Feb  ") are treated as whatever matches based on alternation count from the start of year

---

## Input: Planner.xlsx structure

### Planner sheet (last tab)
- Col A: Excel date serial (first row of each date) OR period number 2–5 (subsequent rows for same date)
- Col B: Period number (always present for period 1 row; blank for periods 2–5)
- Col C: Class name (e.g. "7BYA") or blank
- Col D: Lesson name (not always filled)
- Col H: Notes

### Filled order sheets (all tabs with a date in the name)
Tab naming pattern: `Order Sheet Week [A|B] - [Mon] [DD]`

Two formats exist (old pre-2026 had 4-row day blocks; new 2026 has 5-row day blocks):

**New format (5-row day blocks — use this going forward):**

| Relative row | Content |
|---|---|
| +0 | Day header: A=day name, B=Mon1, F=Mon2, J=Mon3, N=Mon4, R=Mon5 |
| +1 | Room/Class: B=Room:, C=room, D=Class:, E=class, F=Room:, G=room, H=Class:, I=class … (repeat pattern per period) |
| +2 | Lesson names: B=P1, F=P2, J=P3, N=P4, R=P5 |
| +3 | Equipment: B=P1, F=P2, J=P3, N=P4, R=P5 |
| +4 | Class size: B=Class size:, C=size, D=No. of Sets:, E=sets … |

Day start rows: Mon=4, Tue=9, Wed=14, Thu=19, Fri=24

Class columns per period (in Room/Class row): P1→E, P2→I, P3→M, P4→Q, P5→U

**Old format (4-row day blocks):**

| Relative row | Content |
|---|---|
| +0 | Day header + Room/Class inline: A=day, B=Room:, C=room, D=Class:, E=class … |
| +1 | Lesson names: B=P1, F=P2, J=P3, N=P4, R=P5 |
| +2 | Equipment: B=P1, F=P2, J=P3, N=P4, R=P5 |
| +3 | Class size |

Day start rows: Mon=4, Tue=8, Wed=12, Thu=16, Fri=20

Detection: if Row 4 / Col B contains "Mon" → new format; if "Room:" → old format.

**Header row (Row 1):**
- Col A: "Teacher:      " (label)
- Col C: "Patryk Tomczynski"
- Col R: "Week A" or "Week B" (sometimes "Week 2" in older sheets — ignore)
- Col S: Monday date as Excel date serial

---

## Algorithm

1. **Load Planner.xlsx** — parse shared strings + all sheet XMLs
2. **Find all filled sheets** — sheets whose name matches `Order Sheet Week [AB9\s]+ - `
3. **Sort by date** — use the S1 cell (Excel date serial); fall back to parsing the tab name
4. **Extract timetable** from most recent filled sheet: for each day, which class is in which period column
5. **Extract last lessons** for each class: scan from most recent to oldest sheet, find the first non-empty, non-N/A lesson for each class
6. **Determine next week date**:
   - Default: next Monday from `Date.now()`
   - Override: `--week-start` arg
7. **Determine Week A/B**:
   - Count the most recent sheet, take opposite
8. **Drive lookup** (home only — G: drive must be mounted):
   - For each class, determine year group
   - Search `G:\My Drive\Beechen Cliff Science\Lessons\Year [N]\` recursively for a folder whose name contains the last lesson name (case-insensitive)
   - The NEXT folder by lesson number is the next lesson
   - Falls back to "?" if Drive not found or lesson not matched
9. **Equipment lookup** (from equipment-key.md):
   - Normalize both lesson name and key entries: lowercase, strip punctuation, collapse spaces, "pt 2"/"part 2"→"pt2", "practical"→"prac"
   - Levenshtein/substring match; threshold: if normalized key is a substring of normalized lesson OR vice versa, count as match
   - If no match: generate best-guess from lesson name (see Best-Guess Rules)
10. **Print terminal summary** — one line per class showing last/next lesson and equipment
11. **Confirm prompt** — "Press Enter to generate, Ctrl+C to cancel" (skipped in --dry-run)
12. **Clone latest filled sheet XML** — copy most recent sheet as template for new week
13. **Update cells** in clone:
    - Row 1 col R: "Week A" or "Week B"
    - Row 1 col S: new Monday date as Excel serial
    - For each day+period: update lesson and equipment cells with new shared string indices
14. **Add new shared strings** — append any new lesson/equipment strings to sharedStrings.xml
15. **Add new sheet** to Planner.xlsx:
    - New worksheet file: `xl/worksheets/sheet[N+1].xml`
    - New entry in `xl/workbook.xml` `<sheets>` element
    - New entry in `xl/_rels/workbook.xml.rels`
    - Sheet name: `Order Sheet Week [A|B] - [Mon abbreviation] [DD]`
16. **Write upload-log.txt** — append line: `[ISO date] [Week A/B] [Monday date DD/MM/YYYY]`

---

## Best-Guess Equipment Rules

Applied when a lesson has no entry in equipment-key.md:

| Pattern in lesson name | Equipment guess |
|---|---|
| "practical" / "prac" / " rp" | "see teacher — practical equipment needed" |
| "graph" | "graph paper, ruler, pencil" |
| "demo" | "DEMO — see teacher" |
| "test" (standalone or end) | "already printed — confirm with Patryk" |
| "revision" / "review" | "N/A" |
| "trip" / "pshe" / "cover" | "N/A" |
| anything else | "see teacher" |

---

## Output: New order sheet format

Matches the improved May/June 2026 format (5-row blocks per day):

**Row 1:** `Teacher:      ` | `Patryk Tomczynski` | (blank) | `Week A` or `Week B` | `DD/MM/YYYY` (Monday date as text)

**Row 2:** `Day` | `Period`

**Row 3:** Period numbers `1` | `2` | `3` | `4` | `5` (in cols B, F, J, N, R)

**Per day (5 rows × 5 days = rows 4–28):**
- Row +0: Day name (Mon/Tue/Wed/Thu/Fri) + period labels (`Mon 1`, `Mon 2`, … `Mon 5`)
- Row +1: `Room:` | room | `Class:` | class_name (×5 periods)
- Row +2: Lesson names (one per period, cols B/F/J/N/R)
- Row +3: Equipment text (one per period, cols B/F/J/N/R)
- Row +4: `Class size:` | size | `No. of Sets:` | sets (×5 periods)

**Equipment text rules:**
- Patryk's classes: lesson equipment from key or best-guess
- N/A lesson (PSHE, trip, assembly, noted in planner): `N/A`
- Covered by another teacher: `N/A — covered by [name] if known]`
- Empty period (no class): leave blank

**No. of Sets:** derived from sets field in equipment-key.md:
- `pairs` → `Math.ceil(classSize / 2)`
- `threes` → `Math.ceil(classSize / 3)`
- `demo` → `1`
- Class size: use the value from the most recent order sheet for that class (or leave blank if unknown)

---

## Equipment-key.md format

```markdown
## [Lesson Name]
- Equipment: [comma-separated items]
- Sets: [pairs | threes | demo]
- Notes: [optional — variation across sheets, typos, etc.]
```

Set size inference rules:
- Contains any of: bunsen, flame, heat, acid, boiling, melting, exothermic, hazardous → **pairs**
- Contains "demo" anywhere in equipment text → **demo**
- Default: **threes**

---

## upload-log.txt format

```
2026-06-23 Week B 23/06/2026
2026-06-30 Week A 30/06/2026
```

---

## Error handling

- Missing Planner.xlsx: exit with helpful message
- Drive not mounted: skip Drive lookup, mark next lesson as "?" in summary
- Lesson not found in Drive: mark as "?" 
- No equipment match: use best-guess, flag in summary with `[GUESS]`
- Ctrl+C at confirm prompt: exit cleanly with "Cancelled — no changes written"
