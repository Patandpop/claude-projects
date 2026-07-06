# Overnight session changelog — fable-overnight branch (2026-07-06)

Every checkpoint below is one git commit on the `fable-overnight` branch.
To undo any single step: `git revert <hash>` (safe, keeps later work).
To throw the whole night away: `git checkout main` (main was never touched).

| Commit | Task | What it did | How to revert |
|---|---|---|---|
| b369996 | safety | Baseline commit of all pre-existing uncommitted work — nothing changed, just committed so overnight changes are separable | Nothing to revert — this IS your pre-session state |
| (next) | Task 1a | CLAUDE.md fully restructured: fixed "Projects → Science Lesson" (you swap the .skill file directly — also fixed in package-skill.ps1/.js and the auto-package hook messages), class table now 7BYA/7MLA/8AB/8XP/9AB/10S2/12D marked "expires July 2026", added review-lesson 3-file exception, npm-test section, test-lesson rules, uploader behaviour, and a "Traps" section (stale sandbox, fmt-equations phantom, lying backlog statuses, no-mkdir). npm test green before commit. | `git revert` this commit to get the old CLAUDE.md back |
| (next) | Task 1b | SKILL.md housekeeping: Bugs 1/3/4 marked FIXED (re-verified in build.js tonight), class table pruned to current classes + July-2026 expiry note, stale "review = TWO files" line corrected to three (answers sheet), skill trigger list swaps 10C4/11C3 for 12D, "scaffolded versions" → "support versions", worksheet-spec.md stale `scaffolded` mode name corrected to the real `developing` mode string. Docs only — no code touched. | `git revert` this commit |
