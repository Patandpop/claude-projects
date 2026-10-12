# Plan: planner, behaviour app, homework and tests

Source: `claude-code-brief.md` (2026-10-12). Tick items as they are done.

## Now

- [x] **1. Year 13 lessons and new assessments** (2026-10-12)
  - Copied from `G:\My Drive\Beechen Cliff Downloads` zips: Ch 20 Cosmology (Lessons 1-5), Ch 24 Particle Physics (1, 2, 3, 5 + an empty "Lesson 4 - Quarks" so the planner keeps 24.4 in order), Ch 25 Radioactivity (Lessons 1-5), Ch 26 Nuclear Physics (Lessons 1-5). Chapter-wide files (tests, checklists, OJA sets, booklets) sit at chapter level, like Ch 19.
  - New KS3 Core/Extend papers + mark schemes in a `NEW 2026` folder inside: Y7 B1 Cells, Y8 B1 Respiration and Photosythesis, Y8 P1 Motion and Pressure, Y8 C1 Acids and Alkalis.
  - 41 folders, 200 files, copy only, nothing overwritten, every write in `upload-log.txt` ("ingest-2026-10-12").
  - Planner data refreshed and pushed. 13D now shows the real lesson names for Ch 20, 24, 25, 26.
- [x] **4. "Make next day" after midnight** (commit 860744c5). Uses the next school day: before 6am counts as the night before; weekends, holidays and INSET skipped.
- [x] **5. Lesson builder** (commit a040a3af)
  - Up to two experiments per lesson: the worksheet now gives each its own section and results table. SKILL.md says so.
  - Exam questions: if no question passes the strict "fits a slide" rules, the picker now tries looser ones (10C2 P1 Energy had none, now gets one). A Year 9-11 deck with no exam question prints a loud BUILD WARNING with the reason.
  - Skill re-packaged. **Upload `science-lesson.skill` to claude.ai.**
- [x] **6. Behaviour app timer X** (commits 7bd68bec, cb6b002d). The X itself worked in tests. Fixed what made it look dead: "✕ Cancel" on silent work left its timer running; X on a paused timer left the board stuck on "Paused". Version 21. **Paste Code.gs + Phone.html into Apps Script and deploy a New version.** Lag not looked at (needs a real lesson to measure).
- [ ] **2 and 3. Shared lesson state** (one record per lesson: taught / partly / stopped-at / notes), cancelled-lesson cascade, slide-over confirmation, checkmarks carrying between weeks. NEXT. The biggest item: changes how the planner saves weeks. Start in Plan Mode.
- [ ] **7. Mark schemes** more explicit and student-friendly.

## Next

8 Collapsible "Your week" panel · 9 Tests/Homework split + test builder · 10 Behaviour app inside the planner · 11 Behaviour desktop layout, backdating, reminder · 12 Classes page hover-over · 13 "Review last lesson" button · 14 Engage tasks, one Learn section by default

## Later

15 Open lesson / Classroom auto-post · 16 Task and shift planner · 17 Mobile · 18 Lesson mode, data loop, student profiles, admin

## Not matched / notes

- Year 12 and Year 13 assessment zips: everything current is already in `Admin\Assessment\Year 12|13`; the rest is Archive. Nothing copied.
- `year 7 PLCs` zip is empty (190 bytes). Re-download if you meant to send PLCs.
- Acids and Alkalis zip has no Core paper PDF, only the editable Core mark scheme and the Extend paper.
- Ch 15, 19 and 27 zips: those chapters are already full on Drive. Not copied.
- Test dates: the Tests tab lists the end-of-topic tests the planner places after each topic, so the new chapters' tests appear on their own. No separate dates were given.
- The Reflection and Refraction build that missed its exam question can't be traced (its lesson file is gone). The new warning will name the cause next time.
- Lots of earlier planner and build.js work is still uncommitted (from before this session). Today's commits only include today's changes.

## Assumptions

- "Missing Year 13 lessons" = the 13D chapters with no lesson folders (20, 24, 25, 26).
- Cancel on silent work should stop the timer silent work started, but not a separate "Timer only" timer.
