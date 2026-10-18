# Homework replica: test (step 6, replica-test)

Date: 2026-10-19. Tested at home against the build in git 7c76dacf. Nothing deployed, nothing written to Drive (the real quiz files in `Admin\Planner Sync` were only read).

## How it was tested

| what | how | result |
| --- | --- | --- |
| Server code (Code.gs) | `node planner/test-homework-quiz.js`: Code.gs run against fake Forms, Classroom, Drive, Sheets and mailbox | 55 checks pass (52 before, 3 added today) |
| Due-date rules (logic.js) | `node planner/test-logic.js` | 78 pass |
| Planner server | `node planner/tests/server.test.js` | 43 pass |
| Mark points from mark schemes | `node test/ms-friendly.test.js` (includes 14,513 real schemes: marks always add up) | 24 pass |
| Exam practice and weekly quiz files from home | `test/test-paper.test.js` run() and runDocx(), `test/test-homework.test.js` run() | 0 fails, 0 warnings |
| Whole regression suite | `npm test` | PASS, all fixtures built clean (4 warnings, from lesson fixtures) |
| Homework tab | headless Chrome on `make-preview.js` with scripted clicks (results written into the page title, read back with `--dump-dom`) | 3 runs, results below |
| Real quiz files | each of the 14 `homework-*.json` files built through the real `buildQuiz_` with a fake FormApp that refuses what Forms refuses (duplicate or empty choices, a marked question with no right answer, an empty picture) | all 14 build; details below |

## Test plan

Flows from 05-design.md. H = happy path, E = edge case, N = negative case.

### F01 Teacher sets homework for several classes (Homework tab)

| id | case | how run | result |
| --- | --- | --- | --- |
| F01-H1 | Tick 9AS, 10C2, 11S2, 13D; each row shows quiz, version, set on, due 8:00, send; Make the drafts; every row says "Form made. Classroom draft made" with Open the Form, Open in Classroom, Copy message | Chrome | pass |
| F01-H2 | Core / Challenge switch swaps to the other file (10C2 Core to Challenge) | Chrome | pass |
| F01-H3 | A level class shows "One version" (13D) | Chrome | pass |
| F01-H4 | Message template filled per class; preview for the first three, "and 1 more" | Chrome | pass |
| F01-H5 | Edited message survives ticking and unticking a class | Chrome | pass |
| F01-H6 | Schedule it: post date and time default to the end of the set-on lesson (11S2 Mon 19 Oct 10:00) | Chrome | pass |
| F01-H7 | Looks right marks a quiz "checked" and the quiz list shows it | Chrome + node | pass |
| F01-E1 | Half term: set Wed 21 Oct, due Wed 4 Nov "half term: first lesson back"; Friday before half term due first lesson back; INSET on the due day moves it | Chrome + test-logic | pass |
| F01-E2 | Clocks go back (25 Oct) and forward (28 Mar): 8:00 UK becomes 07:00 or 08:00 UTC correctly; post time in summer time | node | pass |
| F01-E3 | Double click on Make the drafts: button disabled while running; 3 clicks gave 4 calls for 4 classes; clicking again after: "Those are made already" | Chrome | pass |
| F01-E4 | Double click reaching the server: lock plus receipt make ONE Form and ONE draft; second answer "Already made" with the links | node | pass |
| F01-E5 | No TEMPLATE_FORM_ID: Form made from scratch, row says "Made without the template..." | node + Chrome | pass |
| F01-E6 | Template deleted: still made, note says why | node | pass |
| F01-E7 | Class with no quiz from home: chip greyed, "Greyed out: no quiz from home yet" (7MLA, 8XP, 8AG, 9XS) | Chrome | pass |
| F01-E8 | One class fails (Forms error): that row says "Not made: ..." in Google's words, the others carry on; clicking again retries only that row | Chrome | pass |
| F01-E9 | Classroom class missing: Form made, row says "No Classroom class with 10C2 in its name. The Form was made: link it by hand." | node + Chrome | pass (see BUG-04 for the wording) |
| F01-E10 | After the Classroom problem is fixed, clicking again makes the draft with the same Form | node + Chrome | **failed, fixed (BUG-01)** |
| F01-E11 | Schedule it with a post time already gone | Chrome | **failed, fixed (BUG-02)** |
| F01-E12 | Due date typed by hand into half term (13D, Fri 30 Oct) | Chrome | accepted with no warning (BUG-05, open) |
| F01-E13 | Quiz file for another class refused; due on or before set day refused | node | pass |
| F01-E14 | Old (v1) quiz through the tab: 7MLA found as Classroom "7Ml", title kept, out of 3 | node | pass |
| F01-E15 | Phone width (390 px window) | Chrome | page scrolls sideways (898 px wide in a 485 px view); the Homework tab itself fits, the overflow is outside it. To check, laptop tool |
| F01-N1 | Mailbox old or failing: plain message, retried once on a Google error page | node | pass |

### F02 Pupil does the Form (page 1, then page 2 marking)

Google renders the pupil side, so this is checked as the items the code creates, not in a browser.

| id | case | how run | result |
| --- | --- | --- | --- |
| F02-H1 | Page 1: picture item "Question 3" just above its question; MCQ marks itself; written answers required | node | pass |
| F02-H2 | Page 2 "Mark your own answers" with the wording from 05-design 1.2; one Yes/No per mark point, Yes is correct, all required | node | pass |
| F02-H3 | Confirmation text, one response per pupil, no edits after, no "submit another", no public summary | node | pass |
| F02-H4 | Form total = MCQ points + mark points = Classroom points (13 in the fixture) | node | pass |
| F02-E1 | Number question: number box (numbers only), unit in the title, optional working box after it, neither scores | node | pass |
| F02-E2 | Calculation block says "a correct final answer gets all the marks" | node | pass |
| F02-E3 | Level-marked 6-marker: Level 1 first, 2 points each, "Yes only if the level before" from Level 2 | node | pass |
| F02-E4 | Multi-part OCR question: each item names its part; unsplit 2-marker is "mark 1 of 2" | node | pass |
| F02-E5 | Pictures that are the options A to D titled "option A"... | node | pass |
| F02-E6 | Odd symbols refused by Forms (×, 10⁸, ✓): retried as plain text | node | pass |
| F02-E7 | Drawing questions left out, with a note | node + real files | pass (7 left out across the real files) |
| F02-E8 | v1 file: one "mark k of n" per mark | node | pass |
| F02-E9 | v1 file with `"marks": null` | node | **failed, fixed (BUG-03)** |
| F02-E10 | Pupil changes a page 1 answer after seeing the scheme | not testable: Forms allows Back; the page 2 text asks them not to | known limit (03-forms-constraints) |

## Real quiz files (Planner Sync, read only)

All 14 are **schema 1** (written before the schema 2 change), so none uses mark points: every written mark becomes "Question N, mark k of n: did your answer earn this mark?" (279 such items in all). Rebuilding them at home with the current `test-paper.js` / `homework-forms.js` gives schema 2.

| file | questions | Form items | total points | notes |
| --- | --- | --- | --- | --- |
| 9AS 2026-10-14 core | 4 | 40 | 26 | |
| 9AS 2026-10-14 challenge | 4 | 41 | 25 | |
| 10C2 2026-10-22 core | 17 | 61 | 27 | 1 drawing question left out; Q6, Q8 say "the graph above": the picture is on Q5, two items higher |
| 10C2 2026-10-22 challenge | 16 | 68 | 27 | |
| 10C2 2026-11-02 | 3 | 18 | 12 | 1 drawing question left out (so 2 questions, all 6-markers) |
| 10S2 2026-10-22 core | 13 | 54 | 25 | 2 drawing questions left out; Q7, Q10, Q12 "the diagram shows": picture on an earlier part |
| 10S2 2026-10-22 challenge | 12 | 55 | 26 | **Q1 has `marks: null`**: shown as worth 1 though it is a 3-mark "which three" question (BUG-03, data); Q5 "drawn below": picture on an earlier part |
| 10S2 2026-11-02 challenge | 17 | 46 | 22 | |
| 11S2 2026-10-22 core | 17 | 65 | 25 | 1 drawing question left out |
| 11S2 2026-10-22 challenge | 14 | 62 | 28 | Q8 "Graph 1": picture on an earlier part |
| 11S2 2026-11-02 challenge | 19 | 54 | 24 | |
| 12C 2026-10-22 | 13 | 34 | 18 | 2 drawing questions left out; tables are typed into the text (fine) |
| 13D 2026-10-16 | 18 | 36 | 25 | Q16 shows a literal `&bull;` (BUG-06, data) |
| 13D 2026-10-22 | 11 | 46 | 25 | |

Form points equalled the planner's total in every file. No picture was empty or over 2 MB. No MCQ had duplicate or empty options, or an answer out of range. No question had empty text or no mark scheme.

## Bugs

### BUG-01: a failed Classroom step could never be retried
- Severity: S2 (fixed)
- Steps: set homework for a class whose Classroom draft fails (class name not matched, Classroom service off, post time refused). Fix the cause. Click Make the drafts again (or reload and pick it again).
- Expected: the draft is made, using the Form already made.
- Actual: the page treated the row as finished (no retry without a reload), and the server answered "Already made" because the "form only" row in the Homework sheet counted as made. The class never got its Classroom item.
- Evidence: new check in test-homework-quiz.js failed before the fix ("Classroom part failed first time: the next click makes the draft, reusing the same Form"); Chrome run 2 made 4 calls before, 5 after (10C2 retried).
- Fix: Code.gs `setHomework` only counts a Homework-tab row as made once it has a Classroom id; Planner.html only marks a row finished when it has a draft or was already made. The Form is reused (no second Form).

### BUG-02: Schedule it accepted a post time in the past
- Severity: S3 (fixed)
- Steps: Homework tab, a class, Send: Schedule it, post date last Monday, Make the drafts.
- Expected: refused before anything is made, in plain words.
- Actual: sent to Classroom, which (to check) refuses a past scheduled time, leaving "Form only".
- Evidence: Chrome run 3 now shows "Not made: the post time (Mon 12 Oct, 10:00) has passed. Pick a later time, or "Draft only"." and nothing is sent.
- Fix: Planner.html `hwMakeAll` checks the post time first.

### BUG-03: "null marks" from an old file with no marks
- Severity: S3 (display fixed; the data is still wrong)
- Steps: build `homework-10S2-2026-10-22-challenge.json`, question 1.
- Expected: "[3 marks]" and three Yes/No items.
- Actual: title ended "[null marks]", page 2 "mark 1 of null", and the question counted as 1 mark. The home file has `"marks": null` and text ending "3 [null]".
- Evidence: real-file simulation; check list card in Chrome showed "null mark".
- Fix: Code.gs and the check list now say "marks not given" and "mark 1 of 1" (test added). The file itself needs rebuilding at home to get its 3 marks.

### BUG-04: "Form made" said twice on a no-Classroom row
- Severity: S4 (open)
- Steps: set homework for a class with no Classroom match.
- Actual: "Form made. No Classroom class with 10C2 in its name. The Form was made: link it by hand."
- Evidence: Chrome run 2.

### BUG-05: a due date typed by hand is not checked
- Severity: S3 (open)
- Steps: 13D row, change Due to Fri 30 Oct (half term).
- Expected (05-design 2.1): "Change lets him pick another lesson".
- Actual: any date is accepted, only "Due date changed by you" shows. Workaround: use "Back to the rule" or pick a lesson date yourself.
- Evidence: Chrome run 1, `after13D`.

### BUG-06: an HTML entity in a question
- Severity: S4 (open, home data)
- `homework-13D-2026-10-16.json` Q16 shows `&bull;` to pupils. Home side should decode entities when it writes the file.

## To check (not reproduced here)
- Classroom API with a `scheduledTime` in the past: refused or posted at once?
- Forms number validation with standard form ("6.63e-34"): A level pupils cannot type × 10⁻³⁴.
- Level questions: 05-design says the title carries the level descriptor; the build says "does your answer match this level?" with the descriptor under it. Probably on purpose (descriptors are long); confirm with Patryk.
- Later parts of a question that say "the graph above" sit several items below the one picture. A repeat picture or "(picture at Question 2)" in the title would keep the "just above" promise.

## Fixes made (not committed)
1. `planner/Code.gs` `setHomework`: a "form only" row no longer blocks a retry (BUG-01).
2. `planner/Planner.html` `hwMakeAll`: a row without a draft can be retried (BUG-01); a past post time is refused before anything is made (BUG-02).
3. `planner/Code.gs` `buildQuiz_`, `homeworkList` and `planner/Planner.html` check list, `planner/make-preview.js`: no "null marks" or "of null" (BUG-03).
4. `planner/test-homework-quiz.js`: 3 new checks (retry after a Classroom failure, a third click still refused, missing marks).

## Summary
Cases: 37 (node and Chrome). Passed: 31. Failed: 4 (F01-E10, F01-E11, F02-E9 fixed; F01-E12 open). Not conclusive: 2 (F01-E15 phone width, F02-E10 Back button, a Forms limit). Bugs: S1 0, S2 1 (fixed), S3 3 (2 fixed, 1 open), S4 2 (open). No open S1 or S2.
