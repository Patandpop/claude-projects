# Morning brief repurposed: workload DIRECTION, not just information (September build)

Patryk's ruling (2026-07-09): "the purpose of my morning message is to give me direction in order to evenly distribute my workload." The existing daily-brief.js sections mostly INFORM (today's lessons, deadlines). The missing layer is a planner that decides WHEN the recurring work happens and hands him a short, ordered list each morning.

## The core idea

Every recurring obligation has a natural cycle. The brief's job is to spread each cycle's work across the free periods available BEFORE each deadline, so no day carries more than its share and nothing lands the night before.

Inputs (all already exist or are specced):
- Free periods today and this week: timetable from `classes-2026-27.json` minus lessons (loadTodayPeriods already computes lessons/free counts).
- Obligation cycles: marking rota (sec4), order sheet (Thu 15:15), homework set/collect days, PLC uploads (test minus 10-14 days), behaviour-tracker call suggestions (2-week blocks — see specs/behaviour-tracker.md), lesson building (next lesson per class from lesson-log.json + scheme-of-learning.json), Y12/13 weekly accountability.

## The algorithm (deliberately simple)

1. Collect every open obligation with its deadline and rough size in "period-units" (marking a class set = 2, order sheet = 1, a lesson build request = 1, a call = 0.25).
2. Count free periods between now and each deadline.
3. Assign obligations to days greedily, earliest-deadline-first, never exceeding that day's free capacity; spill backwards (earlier), never forwards.
4. Render TODAY's assignment as the brief's top section: "Today's 3 things, in order" with one line of why ("order sheet due tomorrow 15:15; you have P2+P4 free").
5. Anything unassignable (more work than free periods before deadline) is flagged RED at the top — that is the early-warning signal, days ahead instead of the night before.

## Rendering rules

- The direction list comes FIRST, above today's lessons; max 3 items + red flags.
- Each item: task, when today (which free period), why now. One line each, plain language.
- Friday's brief includes the next-week preview: which days look heavy, what to pull forward.
- Everything else in the current brief stays but moves below the direction section.

## Build order (September)

1. Obligation collector (pure function over context/logs/rota) + tests.
2. Greedy scheduler + tests (fixed examples: crunch week, empty week, impossible week).
3. Brief section rendering; retire nothing — reorder only.
4. Two weeks of real use, then tune sizes/cycles with Patryk.

## Guardrails

- The brief directs, it does not nag: no carry-over guilt lines, no "you failed yesterday". Unfinished items just reschedule silently.
- Sizes and cycles are a visible config block, not magic numbers.
- If context.json is stale (last week's), say so at the top rather than direct from wrong data.
