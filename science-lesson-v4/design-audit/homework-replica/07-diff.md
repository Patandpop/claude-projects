# Homework replica: parity (step 7, replica-diff)

Date: 2026-10-19. Scored against the feature matrix in 01-recon.md, plus Patryk's own requirements (self-marking, no printing, Google Forms, smooth, one version per class, due 8am next lesson about 7 days on, schedule ahead, plain wording, pictures). Weights: must 3, should 2, could 1; partial counts half. Tool: the skill's `parity.py`. No layout diff: the pupil side is Google's own Forms page and the teacher side is the planner's own design, so there is no original screen to compare against.

## Score

**Feature parity 70.4 / 100.** Must-haves: 10 of 12 done, 2 partial. Verdict: **not shippable yet** by the skill's rule (a must-have not fully done), although both gaps are one-off steps rather than code (see below). No open S1 or S2 bugs after 06-test.

| area | score |
| --- | --- |
| scheduling | 100 |
| setting (several classes, versions, never twice, no printing) | 90.5 |
| content (pictures, wording, spaced recall) | 85.7 |
| marking | 45.0 |
| feedback | 41.7 |
| insight | 0 |

## Feature by feature

| feature | priority | built | note |
| --- | --- | --- | --- |
| Auto-marked multiple choice (and tick two) | must | yes | |
| Long answers self-marked against mark points, counting to the score | must | partial | built and tested for schema 2; all 14 real files are schema 1, so pupils would get 279 generic "mark k of n" items |
| Score released at once, missed questions shown | must | partial | code copies TEMPLATE_FORM_ID; the template Form is a hand step not yet confirmed |
| Due 8am at the lesson about 7 days on, half term aware | must | yes | a hand-typed date is not checked (BUG-05) |
| Schedule a post ahead | must | yes | past post time now refused |
| Pictures just above the question | must | yes | later parts that say "graph above" are several items below |
| One version per class | must | yes | |
| No printing: Forms and Classroom only | must | yes | |
| Several classes at once, one at a time, failures isolated and retryable | must | yes | retry fixed today (BUG-01) |
| Never made twice | must | yes | |
| Classroom points equal the Form total | must | yes | |
| Plain wording | must | yes | one doubled phrase (BUG-04) |
| Check the quiz first (Looks right) | should | yes | |
| Editable message with preview | should | yes | |
| Per-wrong-option feedback | should | partial | one examiner comment for any wrong answer |
| Auto-marked number answer | should | no | number box exists, but marked by the pupil; needs the Forms REST API |
| Teacher moderation of self-marks | should | no | |
| Misconception view | should | no | |
| Set work by class: status strip, hand-in counts | should | no | rows are already written to the Homework sheet tab |
| Seneca and other links from the same tab | should | no | buttons say "Later" |
| Retry wrong answers in the same task | could | no | Forms cannot; use the next homework |
| Spaced recall of past misses | could | no | |
| Locked mode, AI marking, adaptive XP | skip | | Chromebooks only; paid API; most hated by pupils |

## Behaviour differences

| flow | the apps do | this build does | fix or keep |
| --- | --- | --- | --- |
| Set for several classes | Seneca, Educake: one assignment, then pick classes | one click, each class its own Form, dates and version | keep (fewer clicks per class) |
| Long answers | Seneca AI marks; Carousel self-mark | self-mark per mark point in the scheme's words | keep; needs schema 2 files |
| Due dates | teacher types a date | worked out from the timetable, half term aware | keep; add a lesson picker for changes |
| Errors | generic failure | each row says what failed, others carry on, retry reuses the Form | keep |
| Results | teacher dashboard | Google's View score; nothing in the planner yet | build the status strip and misconception view |

## Missing, in build order

1. **Rebuild the quiz files at home as schema 2** (run `test-paper.js` / `homework-forms.js` again for the classes in Planner Sync), so page 2 uses mark points in the scheme's words. This also clears the 10S2 `marks: null` and 13D `&bull;` data bugs. No code.
2. **Make the template Form once and save TEMPLATE_FORM_ID** (setup guide), then check one copy shows the score straight away. No code.
3. **Set work by class**: the status strip and per-class list reading the Homework sheet tab (05-design 2.4).
4. **Misconception view**: tally Form responses for the most-chosen wrong answers and the most-missed mark points (free with Apps Script; matches the 2026-10-15 future goal).
5. **Teacher moderation of self-marks**: flag doubtful self-marks (for example full marks on a question with a short answer).
6. Then: Seneca and link drafts from the same tab; due-date change as a lesson picker (BUG-05); auto-marked number answers (Forms REST API, free but more setup); per-option feedback; spaced recall.

Items 1 and 2 bring the must-haves to 12 of 12 and the score to 75.9: every must-have done, but still under the skill's "shippable" bar of 80. Items 3 and 4 (both should-haves) would take it past 80.
