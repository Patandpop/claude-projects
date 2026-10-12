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
- [x] **2 and 3. Shared lesson state + slide-over** (2026-10-12)
  - One record per lesson in a new `Lessons` tab (taught, skipped, not taught, where you stopped). Ticks count in every week, earlier and later, and in the Classes view. Ticks saved inside old weeks move into it the first time the planner opens.
  - Slide-over: after any change, every later saved week (this week on) re-plans and saves straight away, so later weeks, the Tests list and Make next day agree. Past weeks never move.
  - Confirmation: Class away and Cover (something else) have "Shift later lessons forward", ticked by default. Unticking a lesson that didn't happen asks the same (OK = shift). No = that lesson is skipped and nothing moves.
  - "Didn't finish: continue next lesson" asks where you stopped. It shows on the next lesson and in the lesson list.
  - Undo also undoes ticks. Tested in `test-logic.js` and in the page (headless browser).
  - **Deploy: paste Code.gs, Planner.html and logic.js (the Logic file) into the planner's Apps Script, then Deploy > Manage deployments > New version.**
  - Not done: free-text notes per lesson (the record has room; no box yet). Classes page hover-over is item 12.
- [x] **7. Mark schemes pupils can read** (2026-10-12)
  - Exam practice mark schemes (printed and on the Google Form) and the Forms homework now show one line per mark ("✓ 1 mark: black"), with the marker notes sorted underneath: Also accepted / No mark for / Doesn't matter / Marker note. A key at the top explains them.
  - OCR (12C, 13D): codes in words ("Marks: 2 for working, 1 for the final answer"); a scheme covering (i) and (ii) gives each part its own row and marks. The source paper's question number and stray HTML are gone.
  - Still the exam board's own words: a test checks 8,265 real AQA schemes and finds no word added. When the marks can't be split safely (about 1 in 4 AQA parts), the answer stays one block, still with the notes sorted.
  - The examiner's common error shows once per question, as "Examiner tip".
  - Papers already on Drive (9AS P3, 13D Stars) are unchanged. New ones get the new layout. **Planner deploy** (above) also puts the Form's mark scheme on its own line.

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
- "No, don't shift" means the missed lesson is skipped (it can be un-skipped in the lesson list), not squeezed in later.
- Slide-over only moves periods you didn't place by hand. Anything you set yourself stays put.
- Cancel on silent work should stop the timer silent work started, but not a separate "Timer only" timer.
