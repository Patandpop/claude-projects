# Homework replica: summary

Date: 2026-10-18. Research only: no code changed, nothing written to Drive.

Files in this folder:
- `01-recon.md`: how Seneca, Sparx Science, Educake, Carousel, Google Forms with Classroom, and Wayground (Quizizz) set, mark and report homework; screens, flows, feature matrix.
- `02-entrepreneur.md`: 63 real quotes (pupils mostly; Reddit and TES could not be reached), ranked pain points, fix plan.
- `03-forms-constraints.md`: exactly what Apps Script can and cannot do in Forms and Classroom, with Google doc links.
- `reviews.csv`: every quote with its link and date.

## The short version

1. The thing pupils hate most across the whole category is **machines marking their written answers wrong** (16 quotes, 4 sources). Carousel avoids it with pupil self-marking plus teacher checking, and it is the app pupils compare well with Sparx. Patryk's self-marking plan is the right call.
2. **Tick boxes in a Forms quiz are all-or-nothing.** One tick-box item cannot give one point per mark point. A dropdown "how many marks did you get" cannot be scored either. The only way the Form's own total includes self-marks is **one Yes/No question per mark point, Yes worth 1 point**. `buildQuiz_` already does this (since 2026-10-16).
3. **Apps Script cannot set "Release grades" or "Respondent can see"** (missed questions, correct answers, point values). Google says release is immediate by default. The free fix is to copy a hand-made template Form that has the settings right, then add the questions.
4. **Classroom due times are UTC.** The draft's 8:30 is 9:30 UK time until 25 October, 8:30 after. For "8am on the next lesson day" the planner must convert UK time to UTC for each date.

## Top 10 to copy into his Forms homework

| # | what to copy | from | how in Forms / Apps Script | free? | feasible? |
| --- | --- | --- | --- | --- | --- |
| 1 | Self-mark each written answer point by point, counting toward the score | Carousel, Seneca (pupil self-mark) | Marking page after a page break; one Yes/No multiple-choice per mark point, Yes = 1 point. Write the actual point in each item ("Says the particles gain energy") rather than "mark 1 of 2". For levelled 6-markers, one item per level step worth 2 points | free | yes, mostly built; needs mark schemes split into points at home |
| 2 | Show the pupil what they missed straight after submitting | all apps | `setFeedbackForIncorrect(<the mark point>)` on each Yes/No item, so a "No" lists the missed point on the View score page; MC items keep "what examiners saw" | free | yes |
| 3 | Score shown at once with missed questions and correct answers | all apps | Template Form made once by hand (release immediately; missed, correct, points all on), copied with `DriveApp...makeCopy` and filled by the planner. FormApp cannot set these | free | yes; test once that the copy keeps the settings |
| 4 | Set ahead, appears at a sensible time, due next lesson 8am | Seneca, Sparx, Classroom | Classroom draft with `scheduledTime` (post time) and due date plus due time converted from UK time to UTC | free | yes; fix the UTC time first |
| 5 | Teacher checks self-marks without marking everything | Carousel moderation, Seneca flags | Planner reads responses (`getResponses`, `getItemResponses`, `getScore`) and lists doubtful ones: full marks claimed on a near-empty answer | free | yes |
| 6 | Most-missed questions and most-chosen wrong answers for the next lesson | Educake grid, Sparx report, Forms Summary | Planner tallies each MC option chosen; map wrong options to misconceptions from the exam library; show on the next lesson | free | yes (fits his saved Forms-misconceptions goal) |
| 7 | Short and honest about length | pupil complaints (02 theme 2) | Description says "N questions, about M minutes"; aim for one sitting; progress bar is on | free | yes |
| 8 | Number answers that mark themselves | Sparx, Educake | Short answer with `requireNumber()` validation (unit in the question). Auto-marking it needs the Forms REST API answer key (exact match, list the accepted forms); otherwise use a 4-option number MC | free | MC now; REST API only if the school allows a Cloud project |
| 9 | Pictures with the question | all apps | Picture block titled "Question n" just above (current method). Pictures inside the question or as options need the REST API and a web link to the picture | free | yes as now; inside-question is a maybe |
| 10 | One tab for all homework, other apps as link drafts | none do this | Same Classroom draft call with a `link` material (Seneca assignment link), same due-time rule | free | yes |

Also add: `setLimitOneResponsePerUser(true)` (one go each).

## Do not copy

- AI marking (paid, hated, and exam boards will not accept AI as the only marker).
- "Must get it right to finish" loops and 100% completion rules (Sparx: the second most bitter theme).
- Per-wrong-option feedback inside the Form: Forms has one wrong-answer feedback per question, so do misconceptions in the next lesson instead.
- Classroom grade import: the API cannot switch it on. If marks are wanted in Classroom, the planner can write them later from the Form responses (needs testing).

## Things to test on one throwaway Form before building

1. A copied template keeps "release immediately" and the three respondent boxes.
2. `getScore()` returns the auto-marked score without a teacher grading pass.
3. Classroom accepts `scheduledTime` on a draft and posts it at that time.
4. Whether the school lets the script use a Cloud project (only matters for items 8 and 9).
