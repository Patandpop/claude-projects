# CLAUDE.md — Science Lesson Skill (Beechen Cliff)
## Standing facts — read this at the start of every session

---

## Build architecture — portable by design

`build.js` runs in two environments and must work in both:

| Environment | Where it runs | Output lands |
|---|---|---|
| **Home (Claude Code)** | Windows PC, `node build.js lesson-content.json` | current working dir (or `meta.outputDir`) |
| **School (claude.ai)** | Linux sandbox | `/mnt/user-data/outputs` (auto-detected) |

**Output priority in build.js:**
1. `meta.outputDir` — explicit path set in the content JSON
2. CLI arg 2 — `node build.js content.json /some/path`
3. `/mnt/user-data/outputs` — auto-detected claude.ai sandbox
4. Current working directory

**NO Drive path is inside build.js.** To copy output into Google Drive after a home build, run a separate step:
```
node references/build.js lesson-content.json
# then copy from output folder into G:\My Drive\Beechen Cliff Science\Lessons\...
```

Google Drive for Desktop mounts at `G:\My Drive\Beechen Cliff Science\Lessons\Year [X]\[Subject]\[Macrotopic]\`.

---

## Three-file output rule (always, every lesson)

1. `[base].pptx` — slides, one version for everyone
2. `[base]_worksheet.docx` — standard worksheet
3. `[base]_support_worksheet.docx` — same questions, same tiers, scaffolding added automatically

The support worksheet is ALWAYS built. The PowerPoint is never split — one version for everyone.

---

## Support worksheet — what scaffolding is added automatically

Driven from data already in the content object — no manual scaffolding to write:

| What gets added | Trigger |
|---|---|
| Hint line under each Do Now question | `doNow.questions[n].hint` |
| Write-lines under Do Now questions | always in support mode |
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

At the end of any session where SKILL.md, build.js, slide-options-v4.md, or worksheet-spec.md changed:

1. Run `.\package-skill.ps1` from the project root in PowerShell — this rebuilds `science-lesson.skill`
2. Upload `science-lesson.skill` to claude.ai (Projects → Science Lesson) so the school version matches
3. This is a standing requirement — never skip it

Files included in the skill package (canonical list = `$ENTRIES` in package-skill.ps1): SKILL.md, references/build.js, references/graph_gen.py, references/textbook-index.js, references/textbook-index.md, references/slide-options-v4.md, references/worksheet-spec.md, references/engage-library.md, references/starfield_header_FINAL.png, references/backlog.md, references/lesson-backlog-SKILL.md, references/Caveat-Regular.ttf, references/Caveat-Bold.ttf

---

## Class profiles quick reference

| Class | Year | Notes |
|---|---|---|
| 7BYA, 7MLA | 7 | Mixed ability |
| 8AB | 8 | Higher — no word bank |
| 8XP | 8 | Lower mixed — word bank on cloze |
| 9AB | 9 | Higher — no word bank |
| 10S2 | 10 | Higher triple |
| 10C4 | 10 | Mid |
| 11C3 | 11 | Mixed |
