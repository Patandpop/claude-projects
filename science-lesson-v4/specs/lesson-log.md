# Spec: lesson-log.json

## Science Lesson Skill · Beechen Cliff

Status: CONFIRMED 2026-07-03. All four flagged decisions locked to the recommended option
(Drive Brief Data location · one record per class · upsert on rebuild · builtOn = build date).

---

## Purpose

Record **what was actually taught, to which class, when, and which Do Now questions were
used** — one record per built lesson. This is the missing keystone: right now
`upload-log.txt` only records *that* a lesson's files were copied to Drive (for link
generation). Nothing records the per-class teaching history, so:

- the **Do Now spaced-retrieval selector** (`specs/do-now-bank.md`) cannot answer "what were
  the last 2–3 lessons for 8AB?" or "which questions has 8AB seen in the last 3 Do Nows?";
- the **morning/daily brief** (`specs/daily-brief.md`) cannot say "last lesson for this class
  was X" or generate an accurate Homework-IN / cover note.

`lesson-log.json` is the append-only chronological source of truth those two consumers read.

---

## Who writes it

`upload-to-drive.js` appends one record per built lesson, at the end of a **home** build
(build.js → spawnSync upload-to-drive.js). On claude.ai the uploader file doesn't exist, so
no record is written there — acceptable, because Drive-bound builds happen at home.

The append happens **independently of whether the Drive file-copy succeeded** — the lesson was
still built, so it still gets logged. (If the copy fails but meta is valid, we still log.)

---

## File location

`G:\My Drive\Beechen Cliff Science\Admin\Brief Data\lesson-log.json`

This follows the established morning-brief data pattern (`context.json`, `brief-log.json`,
`context-standing.json` all live in `Admin/Brief Data/`, written locally, read by the cloud
brief agent via the Google Drive MCP). Keeping the log there means the cloud brief reads it with
zero extra plumbing.

- Overridable for tests via env var `LESSON_LOG` (absolute path to the JSON file).
- If the `Brief Data` folder doesn't exist, the uploader creates it (single, known, safe
  location — unlike lesson folders, which it must never create).

---

## Record schema

One record = one class's exposure to one built lesson.

```json
{
  "class": "8AB",
  "year": 8,
  "subject": "Biology",
  "macrotopic": "B1 Cells",
  "lessonNumber": 1,
  "topic": "MRS GREN",
  "title": "The 7 Life Processes",
  "subtopics": ["life processes", "living", "non-living", "MRS GREN", "excretion", "sensitivity"],
  "doNow": [
    { "q": "Name ONE thing you saw on the way to school that is definitely alive.", "marks": 1 },
    { "q": "Is a tree alive? Write YES or NO and give ONE reason.", "marks": 2 }
  ],
  "builtOn": "2026-07-03",
  "driveFolder": "G:\\My Drive\\...\\Lesson 1 - The 7 Life Processes",
  "uploaded": true
}
```

| Field | Source | Notes |
|---|---|---|
| `class` | `meta.class`, split | See Open decision A (compound class field) |
| `year` | `meta.year` | Already required by the uploader |
| `subject` | `meta.subject` | " |
| `macrotopic` | `meta.macrotopic` | " |
| `lessonNumber` | `meta.lessonNumber` | Ordering key for "last N lessons" |
| `topic` | `meta.topic` \|\| `meta.title` | |
| `title` | `meta.title` | |
| `subtopics` | `title.keywords[]` | Closest existing signal; empty array if none |
| `doNow` | `doNow.questions[]` → `{q, marks}` (+ `id` when present) | The record of what this class saw |
| `builtOn` | system date (ISO `YYYY-MM-DD`) | Build date, not teaching date — see Open decision C |
| `driveFolder` | computed dest path | Same path the uploader copies into |
| `uploaded` | boolean | Did the Drive copy of the 3 files succeed this run? |

### How consumers read it

- **Do Now selector** — filter records by `class`, sort by `lessonNumber` (desc), take the last
  2–3 for "recent topics"; union the `doNow[].q` of the last 3 records for "seen recently" so it
  never repeats a question. Uses `subtopics`/`topic` to build the candidate topic pool.
- **Daily brief** — for each class today, the record with the highest `lessonNumber` gives "last
  lesson taught"; `doNow` and `subtopics` feed Homework-IN and cover notes; `driveFolder`/`uploaded`
  can corroborate `upload-log.txt`.

---

## Decisions (locked 2026-07-03)

**A. Compound `meta.class` (e.g. `"7BYA / 7MLA"`) → one record per class.** Split on `/`, trim,
emit one record per class so each class's Do Now recency counter advances independently. A single
class field yields one record.

**B. Rebuild → upsert.** Replace an existing record matching `(class, lessonNumber, topic)` in
place, so a rebuild refreshes rather than duplicates. Match is case-insensitive on class/topic.

**C. Date → `builtOn` (system build date).** Ordering for "last N lessons" comes from
`lessonNumber`; true teaching date is out of scope and can be back-filled from `context.json`
later if it ever matters.

---

## Testing (harness coverage)

The harness (`test/run.js`) runs build.js with `NO_UPLOAD=1`, which skips the uploader entirely —
so the log-append can't be exercised through the normal build path. Plan:

1. Factor the log logic in `upload-to-drive.js` into two pure, exported functions:
   `buildLogRecords(content, { builtOn, driveFolder, uploaded })` → record[]  and
   `appendLog(logPath, records)` (read-existing → upsert → write).
2. Add `test/lesson-log.test.js` (invoked from `run.js`) that: loads a fixture, calls
   `buildLogRecords`, asserts the record shape (required fields present, `doNow` mirrors the
   fixture, compound class split correct), writes to a tmp `LESSON_LOG`, re-runs to assert
   **upsert not duplicate**, and asserts valid JSON round-trips.
3. No real Drive is touched (tmp `LESSON_LOG`), keeping the harness hermetic.

---

## Out of scope (for this build)

- Auto Do Now *selection* (`select-do-now.js`) — this spec only *records*; selection is the next
  step and reads this log.
- Back-filling true teaching dates from `context.json`.
- Migrating existing `upload-log.txt` history into the JSON log (starts fresh).
- Any claude.ai-side logging.

---

## Must-haves

- **M1** `upload-to-drive.js` writes one record per built lesson to the log file at the Drive
  Brief Data location (or `LESSON_LOG` override), independent of copy success.
- **M2** Record contains every field in the schema table, sourced as listed.
- **M3** Compound class field handled per Open decision A (default: one record per class).
- **M4** Rebuild does not duplicate — per Open decision B (default: upsert).
- **M5** `Brief Data` folder auto-created if missing; lesson folders still never created.
- **M6** Log logic is factored into exported pure functions and covered by a harness test that
  touches no real Drive.
- **M7** Malformed/partial meta never crashes the build — a log failure warns and the build still
  exits as it does today.
