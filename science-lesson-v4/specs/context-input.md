# Spec: Context Input Skill

## Overview
A terminal-based tool that captures weekly scheduling exceptions and produces a `context.json` file consumed by the order sheet and daily brief. Two layers: a standing config (permanent arrangements set once — shared classes, co-teacher splits) and a weekly interactive prompt session (run each Monday morning, updatable mid-week). The system uses context.json + the lesson sequence from Planner.xlsx to determine what each class actually does each period that week, without Patryk manually recalculating.

## Inputs

- **Standing config** (`context-standing.json`) — set once, updated when arrangements change:
  - Class sharing: `{ class, weekType (A/B), day, teacher, note }` — e.g. 7MLA shared Week B Monday with another teacher; their lesson that day, sequence resumes next time Patryk has them
  - Other permanent per-class arrangements

- **Weekly prompts** (interactive terminal, each Monday):
  1. Any planned missing days, half-days, or periods? (trips, INSET, bank holidays — date + which classes affected)
  2. Any tests this week? (confirm auto-scheduled from pacing, or add/remove overrides)
  3. Any combined classes or disjointed lessons that should NOT enter the lesson sequence? (includes open evenings — pre-made lesson, one-off, not in sequence)
  4. Any classes in assessment or revision mode? (revision sequence, Y11 repeat-revision loop)

- **Mid-week update** (same script, single command) — illness or same-day absence: flag which periods are affected. Updates context.json in place without re-asking Monday prompts.

## Outputs

- `context.json` — one file, updated in place each run. Structure:
  ```json
  {
    "weekOf": "2026-06-30",
    "weekType": "A",
    "missingPeriods": [
      { "date": "2026-07-02", "periods": "all", "reason": "trip", "classes": ["8AB"] }
    ],
    "tests": [
      { "class": "9AB", "date": "2026-07-01", "topic": "Forces", "confirmed": true }
    ],
    "combinedOrDisjointed": [
      { "class": "9AB", "date": "2026-07-03", "note": "Combined with 9XP — one-off assessment lesson, not in sequence" }
    ],
    "revisionMode": [
      { "class": "11C3", "active": true, "type": "Y11-repeat-revision" }
    ],
    "eventsAffectingPeriods": [
      { "date": "2026-07-03", "event": "Parents Evening", "periodsAffected": "P5-P6" }
    ],
    "sharing": [
      { "class": "7MLA", "weekType": "B", "day": "Mon", "teacher": "Other Teacher", "sequenceEffect": "advance-by-1" }
    ]
  }
  ```
- **Proposed changes summary** — before writing context.json, the system prints what it intends to do with each affected lesson (move or cover, and where moved lessons land). Patryk confirms or overrides. Only then is context.json written.
- Console summary after confirmation — one line per class showing the finalised week: lesson name, day, any flags (TEST / REVISION / SHARED / ABSENT / MOVED / COVER / DISJOINTED).

## Must-haves

- **M1** Standing config (`context-standing.json`) stores permanent arrangements. Script reads it at startup — no re-entering sharing arrangements every week.
- **M2** Weekly interactive session covers the five prompt areas, one at a time, with sensible defaults (Enter = nothing unusual).
- **M3** Mid-week update mode: `node context.js --absent 2026-06-25` (or `--absent today`) updates `missingPeriods` without re-running Monday prompts.
- **M4** For each missed lesson, the system automatically decides: practical or practical-review lesson → move to next available slot; everything else → cover. No manual classification needed.
- **M5** Before writing, the system prints its proposed moves/covers per affected class with destination slots. Patryk confirms or corrects. Context.json is written only after confirmation.
- **M6** Context.json is written (or updated in place) after confirmation.
- **M7** Console summary after every run: one line per class — what lesson, what day, any flags (TEST / REVISION / SHARED / ABSENT / MOVED / COVER / DISJOINTED).
- **M8** If context.json already exists for the current week, prompt "Week already set. Update or replace?" before overwriting.
- **M9** Sharing arrangements from standing config are automatically applied — no prompt needed each week. Patryk only prompted if standing config has nothing for that class.
- **M10** Tests from pacing plan auto-populate as suggestions; Patryk confirms, removes, or overrides at the tests prompt.
- **M11** Revision mode persists week-to-week once set (Y11 repeat-revision stays active until Patryk clears it).

## Nice-to-haves

- **N1** `--dry-run` flag: shows proposed changes and what context.json would contain without writing.
- **N2** `--review` flag: prints current context.json in a readable summary without prompting.
- **N3** Warn if a class has no lesson scheduled for a day they're normally timetabled (could catch missed entries).
- **N4** If a practical move pushes into a week with a test already scheduled, warn rather than silently colliding.

## Out of scope

- Cover lesson generation — separate build job.
- Pacing plan parsing to auto-schedule tests — pacing plan reader is a future spec; for now, Patryk manually confirms tests at the weekly prompt.
- Class counts (how many worksheets to print) — tracked separately in class counts file (Goal 17).
- Markbook, seating plans — separate projects.

## Integration points

- `Planner.xlsx` — order sheet reads this; context.json sits alongside it and the order sheet reads both.
- `specs/order-sheet.md` — order sheet spec defines what it expects from context.json; this spec must match that contract.
- `science-lesson/references/order-sheet.js` — will read context.json; field names here must align.
- `context-standing.json` — new file, lives in project root alongside Planner.xlsx.
- Future daily brief (`specs/daily-brief.md` when written) reads context.json with the same structure.

## Success criteria

- Running `node context.js` on a Monday completes in under 2 minutes of Patryk's time for a normal week (no unusual flags).
- Running `node context.js --absent today` mid-week updates context.json and prints the updated summary without re-asking any Monday prompts.
- For a week with one practical missed (moved), one non-practical missed (covered), one shared class, and one test: the system's proposal matches what Patryk would have manually worked out. Confirmed after vetting.
- Order sheet run after context.js produces correct lesson assignments for that same week.
- Console summary flags are accurate enough that Patryk can spot a wrong lesson assignment before running the order sheet.
