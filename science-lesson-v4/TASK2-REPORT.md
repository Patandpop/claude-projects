# Task 2 — Your AI setup, graded (2026-07-06)

Sources: three parallel transcript sweeps of all 66 sessions (June 19 to July 6), plus direct inspection of CLAUDE.md, SKILL.md, memory, hooks, tests, skills and settings. Grades reflect the state as of THIS MORNING (after the overnight fixes).

## Scorecard

| Component | Grade | Verdict |
|---|---|---|
| Hooks (session banner, auto-package, test-on-renderer-edit) | **A** | The best part of your setup. The renderer-edit hook caught every build.js change tonight automatically. |
| Regression harness (npm test, 5 fixtures, unit tests) | **A** | Real safety net; grew again tonight (script tests + fraction guard). |
| Git hygiene | **A now, was F** | You had WEEKS of work sitting uncommitted; one crash could have eaten it. Baselined and checkpointed tonight. Keep the habit: a commit after every working session. |
| CLAUDE.md | **A-, was D** | Was stale and self-contradicting (wrong upload procedure, dead classes, missing rules). Rebuilt tonight as the single source of truth. |
| SKILL.md | **A-** | Comprehensive and now truthful (bug statuses verified against code). It is long, but it is the product spec; length is fine. |
| Memory | **B+** | Clean after tonight's merge/archive. One structural issue left: TWO memory systems run side by side (see flags). |
| Project commands (/spec, /build, /review) | **B+** | Good workflow, genuinely used. No changes needed. |
| User skills (grilling + grill-me alias, find-skills, learned) | **B+** | grill-me is an intentional alias for /grilling, not a duplicate. Keep. |
| claude.ai side (school) | **C+** | The weak half: stale sandbox build.js risk (documented, structural), manual .skill upload, and session startup that costs you "try again" retries. |

## What the transcript sweeps found, and what happened to each

The sweeps surfaced ~40 findings. The pattern behind most of them: **you kept re-teaching the same rules because nothing wrote them down.** Almost all are now closed:

**Closed by tonight's work:** the "Projects" upload drift (worst repeated friction, June 19 onwards); class lists with 10C4/11C3 and no 12D; the em-dash ban you declared on July 2 (never captured until tonight); "less is more, Patryk adds the more"; answers-in-books / no write-lines (a stale CLAUDE.md row said the opposite); the review three-file rule; hint context rules (already in SKILL.md, verified); the duplicate Drive folder bug (root cause found and fixed); bug numbering drift (statuses reconciled); stale "more scaffolding is good" and SEND-large-font era guidance (superseded by current rules, now consistent everywhere).

**Closed tonight in Task 2 itself:** plain teacher-language rule for summaries and next-session prompts; paid-API flag-before-building rule; Drive write-only guardrail (create/copy in sanctioned places only, never delete or move). All three now in CLAUDE.md.

**One-offs, no action needed:** wifi drops, PC overheating (checkpoint commits are now your insurance), the Disco Elysium session landing in this workspace, manual parallel-chat orchestration (you've stopped doing it).

## FIX NOW (left for you — I could not safely do these from the repo)

1. **Session startup hang ("60000ms... try again 2-3 times").** Strong suspects: the Netlev YouTube-analytics connector (68 tools loaded into every science-lesson session, used never) and the Google Drive MCP connector. Disconnect Netlev from this project in the claude.ai connector settings. Two minutes, pays back every single session.
2. **Decide on claude-mem.** You have two memory systems: the built-in memory directory (what I read and maintain) and the claude-mem plugin (installed June 25, hooks in your user settings, web UI on localhost:37777). Double bookkeeping, extra startup work, and answers can diverge. My recommendation: uninstall claude-mem and keep the built-in memory, which is now clean and current. Your call, since other projects might use it.

## MERGE / DELETE

- MERGE: the two memory systems (above). Nothing else left; tonight's Task 1 already merged the duplicate memories and archived the stale files.
- DELETE: nothing. Everything stale was archived (recoverable), not deleted.

## THE ONE CHANGE that pays off most

**Fix the claude.ai session startup by stripping the unused connectors (and, if you accept the recommendation, claude-mem).** Every other part of your setup runs once per task; startup friction taxes you at the top of EVERY session, at school and at home, and it has trained you to open sessions with "try again" retries. It is also the only remaining finding that appeared in all three sweep periods.
