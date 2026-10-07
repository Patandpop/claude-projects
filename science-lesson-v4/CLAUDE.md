# CLAUDE.md — Science Lesson Skill (Beechen Cliff)
## Standing facts — read this at the start of every session

**Division of labour:** Claude Code (home, this repo) = edits only. claude.ai (school) = run only — SKILL.md is read-only there, never modified in a school session. Use Plan Mode before any session that touches `build.js`.

Patryk cannot read code — explain every change in plain English (what changed and why), never in diff-speak. Session-end summaries and next-session prompts must also be plain teacher-facing language: break plans into phases, no jargon, no code identifiers without a one-line explanation.

**Cost + safety rules:** prefer local execution; if a change would introduce a paid API call, flag it to Patryk BEFORE building it. Scripts may only CREATE or COPY files on Drive in their sanctioned locations (uploader → existing lesson folders; test-review → its one folder; brief → Daily Brief folder) — never delete, move, or rename anything on Drive, and log every Drive write. **One approved exception (Patryk, 2026-10-07):** when the uploader builds into a lesson folder, the school's own lesson .pptx at that folder's top level moves into a `Beechen Cliff Original Lesson` subfolder in the same folder (resources/laminates and our built decks never move; each move logged in upload-log.txt).

---

## Build architecture — portable by design

`build.js` runs in two environments and must work in both:

| Environment | Where it runs | Output lands |
|---|---|---|
| **Home (Claude Code)** | Windows PC, `node science-lesson/references/build.js lesson-content.json` | current working dir (or `meta.outputDir`) |
| **School (claude.ai)** | Linux sandbox | `/mnt/user-data/outputs` (auto-detected) |

**Output priority in build.js:** 1. `meta.outputDir` → 2. CLI arg 2 → 3. `/mnt/user-data/outputs` (sandbox auto-detect) → 4. current working directory.

**NO Drive path is inside build.js.** At home, `upload-to-drive.js` is auto-invoked by build.js after the lesson loop: it copies the output files (clean names — the `_PTO` suffix was dropped 2026-07-09; matchers still accept legacy `_PTO` files) into the Drive lesson folder, and appends to `upload-log.txt` and `lesson-log.json`. It never creates lesson folders — it errors if the folder is missing. `--dry-run` previews; `NO_UPLOAD=1` skips upload entirely. On claude.ai the uploader file doesn't exist, so the step silently skips.

Google Drive for Desktop mounts at `G:\My Drive`. Lessons live at `G:\My Drive\Beechen Cliff Science\Lessons\Year [X]\[Subject]\[Macrotopic]\Lesson [N] - [title]\`. Brief/automation data lives at `G:\My Drive\Beechen Cliff Science\Admin\Brief Data\` (`context.json`, `context-standing.json`, `brief-log.json`, `lesson-log.json`).

---

## Output rule — three files per lesson (one exception)

**Standard lessons (always):**
1. `[base].pptx` — slides, one version for everyone (the PowerPoint is never split)
2. `[base]_worksheet.docx` — standard worksheet
3. `[base]_support_worksheet.docx` — same questions, same tiers, scaffolding added automatically

**Review lessons (`lessonType: "review"`) — the only exception:**
1. `[base].pptx`
2. `[base]_worksheet.docx` (review booklet)
3. `[base]_answers.docx` — model-answer sheet (replaces the support-worksheet slot; no support worksheet)

---

## Support worksheet — scaffolding added automatically

Driven from data already in the content object — no manual scaffolding to write:

| What gets added | Trigger |
|---|---|
| Hint line under each Do Now question | `doNow.questions[n].hint` (hints are optional and context-based — most questions have none) |
| Word bank on Developing Apply tier | `wx.wordBank[]` or `title.keywords[]` |
| GUESS scaffold on calculation questions | `q.qType: "calculation"` |
| Equation + units hint above GUESS scaffold | `q.equation` + optional `q.units` |
| Sentence starters | `q.starters[]` |
| Larger answer boxes (+30%) | always in support mode |

"Support" means same questions, same tiers, with scaffolding around them. Not fewer questions.

---

## Terminology (enforced — never use old terms)

| Old term | Current term |
|---|---|
| "scaffolded" | "support" |
| "extend" | "challenge" |
| "EXTEND PAPER" (Learn-C slide) | "CHALLENGE PAPER" |
| `_worksheet_scaffolded.docx` | `_support_worksheet.docx` |

---

## End-of-session skill packaging (REQUIRED every session the skill changes)

At the end of any session where SKILL.md, build.js, slide-options-v4.md, worksheet-spec.md, or any other packaged file changed:

1. Run `.\package-skill.ps1` from the project root in PowerShell — rebuilds `science-lesson.skill`. (A Stop hook also auto-runs this when packaged sources are newer than the .skill file.)
2. Remind Patryk to upload: he replaces the old `science-lesson.skill` file directly in claude.ai — he does NOT use Projects.

Canonical package list = `$ENTRIES` in `package-skill.ps1`. Keep `package-skill.js` and the Stop-hook WATCHED list in sync with it whenever the list changes.

---

## Regression harness — `npm test`

`npm test` → `test/run.js`. Builds all fixtures to a temp dir with `NO_UPLOAD=1` and asserts: exit 0, expected file count per lesson type, valid archives, no banned XML (scaffolded / EXTEND PAPER / ✎), typeset equations (× ÷ ² √, no raw `\times`), image embedding, native flow shapes, review answer-sheet content. It strips `meta.outputDir` from fixtures before building — fixtures may carry real output paths that would pollute Drive if built unsanitised. Add a new fixture by listing it in `FIXTURES` in `test/run.js`.

`npm test` must be green before any session ends. Renderer edits also trigger it via a PreToolUse hook.

---

## Test lessons and test review lessons (standing rules)

**Test lessons:** NO slides, NO Drive folder, NO build. The order sheet shows core/challenge paper counts per class. Test papers: `G:\My Drive\Beechen Cliff Science\Admin\Assessment\Year [X]\[Subject]\[Topic]\` (filename identifies higher vs lower tier, and Combined vs Separate). The folder is `Assessment` — NOT `Tests` (corrected 2026-07-22; the old `Admin\Tests` path never existed on Drive). Each topic folder holds the test, its markscheme, and its PLC together. **A missing markscheme means it is embedded in the test document itself** — that is expected, not a gap.

**Test review lessons:** the ONE case where the skill creates a Drive folder — `Lesson [n+1] - [Topic] Review` inside the same macrotopic folder. Timing is Patryk-controlled (marking time needed). Generator: `test-review-lesson.js` reads the test PDF from `Admin\Assessment`.

---

## Class profiles — current until end of term (July 2026)

Patryk gets NEW classes in September 2026 — he will supply the new list then; treat this table as expiring.

| Class | Year | Notes |
|---|---|---|
| 7BYA, 7MLA | 7 | Mixed ability |
| 8AB | 8 | Higher — no word bank |
| 8XP | 8 | Lower mixed — word bank on cloze |
| 9AB | 9 | Higher — no word bank |
| 10S2 | 10 | Higher triple |
| 12D | 12 | A-level (OCR A) — homework every lesson |

(10C4 and 11C3 appear in older files but are no longer Patryk's classes.)

**2026/27 is STAGED, not live:** `classes-2026-27.json` (project root) holds next year's full picture — classes, sizes, sharing teachers + specialisms, KS3 vs KS4/5 period times, lessons-per-fortnight, PSHE-9AB. In September: flip context.js / order-sheet.js / daily-brief.js class lists to it, and read `specs/next-year-system.md` for the folder structure + school-Drive uploader plan. Do not flip anything before then.

---

## Traps — read before believing any status claim

- **claude.ai sandbox build.js can be STALE.** Before porting any claude.ai-session backlog/build.js change home: compare line counts; if the sandbox copy is smaller, grep home build.js before believing any "not implemented" claim; never bulk-overwrite build.js with a sandbox copy — extract specific functions by diff. Stray dated files in the project root (`backlog DD-MM-YY.md`) are the sign a claude.ai paste landed outside `references/backlog.md`.
- **`fmt-equations.js` does NOT exist and never should.** Equation handling is `parseEq()`/`normSym`/`prettyText` inside build.js.
- **Backlog statuses lie.** Active backlog = `science-lesson/references/backlog.md` only. Always grep build.js before re-implementing anything a backlog entry claims is missing.
- **build.js creates missing LOCAL output dirs but refuses missing Drive dirs** (fixed 2026-07-06). A missing `meta.outputDir` on `G:\` is a hard per-lesson error by design — never "fix" it by creating Drive folders.
- **No em dashes** in generated lesson content or in prose written for Patryk (his rule, 2026-07-02: "refrain from using them across everything").
