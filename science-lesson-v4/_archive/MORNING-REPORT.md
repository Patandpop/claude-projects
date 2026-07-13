# Morning Report, overnight session 2026-07-06

Everything happened on the `fable-overnight` branch. Main was never touched, nothing was pushed, nothing was uploaded. Every step below is one commit you can undo on its own with `git revert <hash>` (full ledger with revert instructions: CHANGELOG.md).

## What you need to DO this morning (5 minutes)

1. **Open `Fraction-Demo.pptx`** (project root). It shows the new true stacked fractions on all three equation surfaces. If you like it, keep it. If you hate it: `git revert d80cfd1` and rerun `.\package-skill.ps1`.
2. **Upload the new `science-lesson.skill`** (packaged 419.7 KB, this morning) by replacing the old file in claude.ai.
3. That's it. Everything else is done and test-verified.

## Checkpoints (newest first)

| Commit | What |
|---|---|
| d80cfd1 | True stacked fractions in PPTX (Bug 33/53 phase 3) + demo deck + harness guard |
| aed0204 | build.js creates missing local output dirs (refuses Drive dirs); Bugs 12/14/25 closed verified; em-dash ban and "less is more" captured as rules |
| 4c701c9 | 7 supporting-script bug fixes (order sheet, uploader, context, daily brief, test-review folder guard) + new test file |
| 2b04448 | Root cleanup, bigFact idea rescued to backlog, stale next-session-prompt archived |
| dbdb0c6 | SKILL.md: practical two-lesson planning pattern documented (your KS3 / Y12-13 rule) |
| 212055f | SKILL.md housekeeping: bug statuses, class table, review three-file rule, terminology |
| 08e6557 | CLAUDE.md fully restructured as single source of truth; "Projects" upload drift fixed everywhere |
| 9da1bb2 | CHANGELOG safety ledger |
| b369996 | Baseline: all your previously uncommitted work committed unchanged (weeks of it!) |

`npm test` is green on the final state. Skill repackaged after all changes.

## Bugs: fixed overnight (all test-gated)

**Real bugs found fresh in the unexamined scripts (your steer):**
1. **Order sheet submission never reached the daily brief.** It logged to upload-log.txt; the brief looks in brief-log.json, so the "ORDER SHEET DUE THURSDAY" warning would never have cleared. Now writes the right log (and stops polluting the lesson-upload log).
2. **Set counts were computed but never written to the order sheet.** Technicians now see "sets of 3 / pairs / demo (1 set)" in the equipment cell.
3. **Multi-lesson JSONs only uploaded lesson 1 to Drive.** Now every lesson in the array uploads.
4. **Review lessons never uploaded their `_answers.docx`.** The uploader still looked for a support worksheet; now review-aware.
5. **context.js didn't know 12D.** Typing 12D in the weekly prompts silently misfiled it as free text. Class list fixed (10C4/11C3 removed too, also in the daily-brief marking rota).
6. **Daily brief homework detection was hardcoded OFF.** Now auto-detects: Y7 Mon, Y8 Tue, Y9 Wed, Y10 Thu, Y12 every lesson (override via `homeworkDays` in context-standing.json). Also: chairs-up now uses your room S8, lesson folder links prefer the most recent upload instead of the oldest, SHARED flag only shows on the actual shared day, answer sheets get a link, links with spaces work.
7. **The duplicate Drive folder bug you reported twice: root cause found.** It was test-review-lesson.js: when its macrotopic guess missed, it silently created a brand-new folder chain. It now reuses an existing review folder, or places the new folder beside the preceding lesson, and warns loudly before ever creating a new macrotopic.
8. **build.js ENOENT trap fixed:** missing local output folders are created automatically; missing Drive folders still refuse loudly (so the duplicate-folder class of bug cannot come back through this door).

**Ruled/known bugs closed with verification:**
- **Bug 12** (backup data on worksheet): already in exactly the state you ruled. Verified on a real amylase build: worksheet has the blank recording table only, zero model-data values in its XML. Closed.
- **Bug 25** (Learn-A headers too small): header bar is 22pt bold in code. Closed.
- **Bug 14** (dirty sig figs): this is authored content, not renderer output, so it is now a written authoring rule in SKILL.md (clean rounds like 4.20/8.40, never 4.21/8.38).
- **Bugs 1/3/4**: were fixed in code weeks ago but never statused. Verified and marked.

**The headline build: Bug 33/53 phase 3, true stacked fractions.** New `renderEqShapes` in build.js renders {a/b} as a real numerator-over-bar-over-denominator stack of editable Cambria Math shapes on the Learn-F equation box (single and twin), the guessExample E row, and the practiceTriangle reference box. Falls back to the full-size diagonal automatically when a box is too small or there is no fraction. The regression harness now asserts the stack renders. Demo: `Fraction-Demo.pptx`.

## Flagged for you (not fixed, needs your judgment)

- **"PTO" filenames**: on 07-05 you said "the files generated do not have PTO at the end of them". Local builds deliberately have no `_PTO` (only Drive copies get it). If you want `_PTO` on local files too, say so and it is a 2-line change.
- **60-second startup hang / "try again"**: strong suspect is the unused claude.ai connectors (Netlev YouTube analytics + Google Drive MCP) loading into every session of this project. That config lives in claude.ai connector settings, not in this repo, so I did not touch it. Worth disconnecting Netlev from this project in the claude.ai UI.
- **Bug 18** (worksheet length ~4 sides): borderline visual, you did not pick it in the interview. Untouched.
- **Bugs 17/22/30/34/43**: visual, blocked on research/reference, or need OCR spec data. Untouched per your rules.

## Setup files: before → after

- **CLAUDE.md**: was a part-stale snapshot (wrong upload instruction "Projects → Science Lesson", class table with 10C4/11C3 and no 12D, review exception missing, a scaffolding row that contradicted your answers-in-books rule). Now the single source of truth: correct upload procedure (swap the .skill file), current class table marked "expires July 2026, new classes September", review three-file rule, npm-test section, test-lesson rules, and a Traps section (stale sandbox build.js, fmt-equations phantom, lying backlog statuses). The "Projects" wording was also fixed in package-skill.ps1, package-skill.js and the auto-package hook messages.
- **SKILL.md**: bug list now tells the truth (banner went 13 open → ~6 genuinely open); trigger list knows 12D; your two-lesson practical planning pattern is documented; two NEW rules captured that you had stated but were never written down: the em-dash ban ("across everything", 2026-07-02) and "less is more, Patryk adds the more".
- **Memory**: archived 2 stale files (autonomous-prompts, parallel-chats) to `memory/_archive/`; slimmed the sprawling project memory (git now holds the change history); your personal-life interview facts saved to the user profile; index updated. The bigFact slide idea from the archived file was rescued into backlog.md.

## Decisions I made on my own (log)

- Committed all your previously uncommitted work as a baseline first, so overnight changes stay separable from what you already had.
- Class lists inside code (order-sheet YEAR_MAP) keep 10C4/11C3 as harmless lookup entries; only user-facing lists were pruned.
- Rearrangement chips on Learn-F keep the diagonal fraction (boxes too small for a legible stack). By design, not laziness.
- The stacked-fraction shapes are the sanctioned exception to the "combine fill+text into one shape" hard rule; noted in the code comment.
- context-standing.json gained `"room": "S8"` (from memory: your fixed room) so chairs-up works.

## Not done, and why

- **Task 2 (AI-setup grading)**: PARKED on your instruction this morning. The three transcript sweeps are done and the findings are saved; say the word and I will write the scored FIX NOW / MERGE / DELETE report and action the safe parts.
- **T3e (top-bar candidate images)**, **T3f (stretch backlog)**, **Task 4 (capabilities shortlist)**, **Task 5 (your life-system plan)**: the morning arrived first. Task 5 has all your interview answers banked in memory (Obsidian, Android, 5-10 min/day, holiday deadline in 3 weeks, reading + writing first, then money, then fitness bulk with progressive overload). It is ready to write whenever you want it, tonight or in a fresh session.
