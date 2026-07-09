# Behaviour tracker → phone-call suggestions (September build)

Grounded in `behaviour_tracker_term1.docx` (2026-07-09): Patryk already prints per-class grids — one column per lesson date, R (reward) and D (demerit) tick cells per student, organised in two-week blocks per half term. The classes and dates in that file match `classes-2026-27.json` exactly (7BYA appears daily = tutor group form time).

## Purpose

Turn the paper R/D ticks into data that drives a TWO-WEEK call cycle: enough negatives in a block = a suggested phone call home, surfaced in the morning brief, so calls happen on schedule instead of when guilt strikes. Positives drive praise calls the same way.

## Data model (extends brief-log.json machinery — no new infrastructure)

`behaviour-log.json` in Admin/Brief Data (same folder as context.json etc., cloud-brief readable):

```json
{
  "entries": [
    { "date": "2026-09-08", "class": "8XP", "student": "initials-or-first-name",
      "type": "D", "note": "optional one-liner" }
  ],
  "calls": [
    { "date": "2026-09-12", "student": "…", "class": "8XP", "kind": "concern|praise", "note": "spoke to mum" }
  ]
}
```

- Logged end of day via the same one-line habit as brief-log.js: `node references/behaviour-log.js "8XP: D TomB rude, D SamR, R LeoW great effort"` — one line per class, parser splits ticks. (Or typed directly to Claude, which writes the entries.)
- Student identifiers: first name + surname initial, never full names in any file that leaves the machine.
- The printed docx grid stays — the log mirrors it, it does not replace the classroom habit.

## Two-week cycle logic

Blocks align to the tracker's printed blocks (Week A + Week B = one block, dates from classes-2026-27.json).

Per student per block:
- **D count ≥ 3** (default, tune later): suggest a CONCERN call. Escalate: a student flagged in two consecutive blocks = "call this week, not next".
- **R count ≥ 4 with 0 D**: suggest a PRAISE call (these are the calls that never happen without a system).
- Any call logged in `calls[]` clears that student's flag for the current block and records "last called".

## Morning-brief integration

- Brief section lists: calls due this block (concern first, then praise), each with student, class, D/R counts, last-called date, and a one-line suggested script.
- No more than 2 suggested calls per day — the system spreads them across the block (workload distribution rule, see morning-brief-workload spec).
- End-of-block summary on the last Friday: who was flagged, who got called, who rolls over.

## Build order (September)

1. `references/behaviour-log.js` (clone of brief-log.js with the tick parser) + unit test.
2. Block calculator (dates from classes-2026-27.json) + flag logic as pure functions + tests.
3. daily-brief.js section 8 rendering the suggestions.
4. Only then: consider importing the paper grid retrospectively (photo → data is a claude.ai job, not code).

## Guardrails

- Names: first name + initial only. The log lives in Patryk's own Drive, never in the skill package or git.
- Thresholds are config at the top of the module, not buried constants — Patryk will tune them after the first block.
- A suggestion is a suggestion: the brief never auto-contacts anyone or drafts anything sendable without being asked that morning.
