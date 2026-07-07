# Task 4 — What Claude could do for you every day (school-first shortlist)

Ranked by how often you'd actually use it divided by how much work it takes to adopt. "Exists" means the machinery is already in this repo.

| # | Capability | What it does | Why it helps YOU | Effort | Status |
|---|---|---|---|---|---|
| 1 | **Marking assistant** | Photo a set of student answers on your phone → claude.ai gives feedback per answer in your house style (terse, mark-scheme grounded, no invented content — the rules are already in memory) | Marking is your biggest recurring time sink; this halves the comment-writing part | Small: a claude.ai prompt template, no code | Build next (one evening) |
| 2 | **Sunday cockpit** | One command chains what already exists: context.js weekly prompts → order-sheet dry-run → confirm → daily-brief preview for Monday | Turns 3 separate Sunday chores into one 5-minute sit-down | Small: a wrapper script over existing tools | Exists in parts; needs the wrapper |
| 3 | **Visual QA at home** | Before school: convert a built deck to images, Claude checks every slide against the house rules (squished text, wrong colours, missing placeholders) and lists defects | Catches the "tiny text on slide 14" class of problem before a classroom does | Medium: a small script + checklist prompt (the rules are all in SKILL.md already) | Build next |
| 4 | **Do Now auto-fill** | lesson-log.json (already being written per class per build) feeds the spaced-retrieval bank so Do Nows generate themselves from what each class actually covered | Removes the last manual step in lesson prep; gets better every week automatically | Medium; deliberately DEFERRED until the log has real data + September classes | Planned, waiting on data |
| 5 | **markTheAnswers everywhere** | The activity type you already built: 3-4 flawed sample answers marked against the scheme | Highest-value teaching activity per minute of prep; it's built, it just needs to become a habit in lesson requests | Zero: say "add a markTheAnswers" when building | Exists — adopt |
| 6 | **Parent-call scripts** | End of day: tell brief-log who needs a call → next morning's brief includes a 4-line script per call (praise or concern) in plain language | Makes the calls you postpone easy enough to actually make | Small: extends daily-brief, log machinery exists | Build next |
| 7 | **PLC generator** | After a test: mark distribution in → per-student personal learning checklist out, matched to the textbook index pages for revision | The PLC upload warning is already in your brief; this fills the thing it nags about | Medium | Build later |

The pattern behind all seven: the plumbing (logs, briefs, banks, index) already exists in this repo. The wins now come from thin layers ON TOP of it, not new systems.
