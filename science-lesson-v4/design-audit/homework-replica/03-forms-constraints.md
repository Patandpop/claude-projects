# Google Forms / Apps Script constraints

Date: 2026-10-18. Read from Google's own docs today. "FormApp" means Apps Script's built-in Forms service (what `planner/Code.gs` uses). "REST API" means the separate Google Forms API, which Apps Script can call with `UrlFetchApp` but which needs extra set-up (see section 9). Points marked **(verify)** are not stated in the docs and should be tested on one throwaway Form.

## 1. The definitive answers first

| question | answer | source |
| --- | --- | --- |
| Can a tick-box question in a quiz give one point per correct box ticked? | **No.** A tick-box item has one point value for the whole item. A choice is only "correct" or not (`createChoice(value, isCorrect)`, a true/false flag). Google's docs never mention partial credit; independent guides and teachers all report all-or-nothing: points only if exactly the right boxes are ticked and no others. The only partial credit is the teacher typing a number by hand in question-by-question grading. | https://developers.google.com/apps-script/reference/forms/checkbox-item ; https://support.google.com/docs/answer/7032287 ; https://formswrite.com/blog/quiz-questions-with-multiple-correct-answers |
| So can pupils self-score with "tick the marks you got"? | **Not with one tick-box item.** Ticking 2 of 3 points scores 0. | as above |
| Can a dropdown or multiple-choice "How many marks did you get? 0 / 1 / 2 / 3" be scored? | **No.** A multiple-choice or dropdown item has one point value, awarded only if the pupil picks a choice marked correct. Every correct choice gets the same full points, so "2" cannot be worth 2 and "1" worth 1. | https://developers.google.com/apps-script/reference/forms/multiple-choice-item ; https://developers.google.com/apps-script/reference/forms/list-item |
| What does work? | **One Yes/No multiple-choice item per mark point, "Yes" marked correct, worth 1 point** (or 2 for a level step). The Form's total then adds the self-marks automatically. This is what `buildQuiz_` already does since 2026-10-16. | as above |
| Grids? | FormApp `GridItem` and `CheckboxGridItem` have **no `setPoints` and no answer key**, so a "one row per mark point" grid cannot be scored from Apps Script. Google's UI can grade grids, and the REST API might per row, but that is untested. | https://developers.google.com/apps-script/reference/forms/grid-item |
| Can Apps Script set "Release grades: immediately" or "Later, after manual review"? | **No.** There is no FormApp method and no REST API field for it. The REST `QuizSettings` has only `isQuiz`. | https://developers.google.com/apps-script/reference/forms/form ; https://developers.google.com/forms/api/reference/rest/v1/forms |
| Can Apps Script set what respondents see (missed questions, correct answers, point values)? | **No.** UI only: Settings > Quizzes > Respondent settings. | https://support.google.com/docs/answer/7032287 |
| Default? | Google: grades release immediately by default. The defaults of the three "respondent can see" boxes are not stated by Google **(verify)**. "Later, after manual review" needs email collection on. | https://support.google.com/docs/answer/7032287 |
| Workaround that is free | **Copy a template Form.** Make one empty quiz by hand with the settings right (release immediately; missed questions, correct answers and point values all on; school-only; one response). The planner then does `DriveApp.getFileById(TEMPLATE_ID).makeCopy(title, folder)` and `FormApp.openById(copy.getId())`, and adds the questions. A Drive copy carries the whole Form including its settings **(verify once; this is the standard way to get settings FormApp cannot set)**. | Drive copy behaviour; not a documented FormApp feature |

## 2. Pages (sections)

- `form.addPageBreakItem()` starts a new page; its title and help text show at the top. `setGoToPage(...)` sets where the page goes next. Doc: https://developers.google.com/apps-script/reference/forms/page-break-item
- **There is no way to stop a pupil pressing Back** from the marking page to page 1 and changing an answer after seeing the mark scheme. Nothing in FormApp or the REST API controls the Back button.
- Mitigations: wording ("Do not go back and change your answers", already in `SELF_MARK`); the planner can compare the answer text with the self-marks after submission (section 7).
- A multiple-choice item's "go to page based on answer" overrides the page break's navigation (same doc). Not needed here.

## 3. Short answer (TextItem) and numbers

- FormApp `TextItem` has `setPoints`, `setGeneralFeedback` and `setValidation`, but **no method to set the correct answer**. So from FormApp a short answer in a quiz can carry points but cannot be auto-marked. https://developers.google.com/apps-script/reference/forms/text-item
- The REST API **can** set an answer key on a short-answer question (`grading.correctAnswers`). "The answer must match the answer key exactly"; short answers get only `generalFeedback`, not right or wrong feedback. https://developers.google.com/workspace/forms/api/guides/setup-grading
- Exact match means "2.5" is right and "2.50" or "2.5 m/s" is wrong unless each is listed as an accepted answer. This is exactly the complaint pupils make about Sparx and Seneca (02, theme 1).
- Number validation (FormApp, free): `FormApp.createTextValidation().requireNumber()`, `requireNumberBetween(a, b)`, `requireWholeNumber()` and others, plus `requireTextMatchesPattern(regex)`. Validation only blocks badly formed input before submit; it does not score. https://developers.google.com/apps-script/reference/forms/text-validation-builder
- Practical rule: for calculations, a short answer with `requireNumber()` (pupil types only the number, unit given in the question) plus a REST answer key listing the sensible forms; or a 4-option multiple choice of numbers. For words, use choices, not typing.
- Paragraph items: never auto-graded. "Using Paragraph... does not auto grade. By default the score will count as a zero until graded by the teacher and the score is released." https://alicekeeler.com/2019/12/20/warning-google-forms-marks-it-wrong/

## 4. Pictures

- FormApp `ImageItem`: a separate picture block. `setImage(blob)`, `setTitle`, `setHelpText`, `setWidth(px)` (height follows), `setAlignment`. Not gradable. No size limit is documented. https://developers.google.com/apps-script/reference/forms/image-item
- FormApp **cannot put a picture inside a question or on an answer option.** The REST API can: `QuestionItem.image` ("The image displayed within the question") and `Option.image` ("Display image as an option"), but the image is given as `sourceUri`, a web address Google fetches, and width is 0 to 740. https://developers.google.com/workspace/forms/api/reference/rest/v1/forms
- So today's approach (picture block titled "Question 7" just above the question; "Question 1, option A" for picture options) is the best FormApp can do.

## 5. Feedback

- Choice items (multiple choice, tick boxes, dropdown): `setFeedbackForCorrect` and `setFeedbackForIncorrect`. **One feedback for any wrong answer, not one per wrong option.** So per-misconception feedback ("you picked B, which confuses mass and weight") is not possible from FormApp. https://developers.google.com/apps-script/reference/forms/checkbox-item
- Text and paragraph items: `setGeneralFeedback` only.
- Feedback content (`QuizFeedbackBuilder`): `setText` and `addLink(url, text)`. No pictures. No length limit documented. https://developers.google.com/apps-script/reference/forms/quiz-feedback-builder
- Feedback only appears on the pupil's View score page, so it depends on release being immediate and the respondent settings (section 1). This is why the mark scheme hidden as feedback on a 0-point paragraph question failed.
- Useful trick for the self-mark page: give each Yes/No mark item `setFeedbackForIncorrect(<that mark point>)`. A pupil who answered "No" then sees, on the score page, the exact points they missed.
- `setConfirmationMessage(text)`: shown straight after submit. `setPublishingSummary(true)` shows everyone's summary (do not use). https://developers.google.com/apps-script/reference/forms/form

## 6. Other Form settings Apps Script can set

From https://developers.google.com/apps-script/reference/forms/form :
- `setIsQuiz(true)`. "Graded questions are only allowed in Quizzes."
- `setCollectEmail(true)` (in a school domain, sign-in is needed). `getRespondentEmail()` needs this on.
- `setLimitOneResponsePerUser(true)`: one response per pupil (not set in `buildQuiz_` today; worth adding, and Classroom grade import needs it).
- `setAllowResponseEdits(false)`, `setShowLinkToRespondAgain(false)`, `setProgressBar(true)`, `setShuffleQuestions(...)` (shuffles within each page, so it would not break the marking page order).
- `setAcceptingResponses(false)` + `setCustomClosedFormMessage(...)`: can close the Form after the due date (a time trigger could do this).
- `setPublished(enabled)`: default true for FormApp. Note: Forms made with the **REST API** after 30 June 2026 start unpublished (https://developers.google.com/workspace/forms/api/guides/setup-grading). If the planner ever creates Forms through the REST API it must publish them.
- `setRequireLogin` is deprecated.

## 7. Reading responses back (all free, FormApp)

- `form.getResponses()` or `getResponses(sinceDate)`. https://developers.google.com/apps-script/reference/forms/form
- Each `FormResponse`: `getRespondentEmail()`, `getTimestamp()`, `getItemResponses()`, `getGradableItemResponses()`, `getResponseForItem(item)`. https://developers.google.com/apps-script/reference/forms/form-response
- Each `ItemResponse`: `getResponse()` (the answer chosen or typed), `getScore()`, `getFeedback()`; `setScore()` + `form.submitGrades(responses)` to change a score. https://developers.google.com/apps-script/reference/forms/item-response
- Total score: add `getScore()` over the gradable item responses. **(verify)** that `getScore()` is filled for auto-graded items without a teacher grading pass; Google's examples only show it after `setScore`.
- Warning in the docs: calling `submitGrades()` inside an on-submit trigger re-fires the trigger and loops.
- What the planner can build from this, free: per question percent right; for each multiple-choice question the count of each wrong option (misconceptions); for written questions, self-marks claimed versus answer word count (honesty flag, e.g. full marks on under 5 words).

## 8. Classroom CourseWork

From https://developers.google.com/classroom/reference/rest/v1/courses.courseWork and https://developers.google.com/classroom/reference/rest/v1/Material :
- `dueDate` and `dueTime` are **in UTC** ("Optional time of day, in UTC"). Both must be set together. **`classroomDraft_` sets `dueTime: {hours: 8, minutes: 30}`, which is 09:30 in the UK until British Summer Time ends on Sunday 25 October 2026, and 08:30 after. For 8am local it must convert Europe/London to UTC per date** (07:00 UTC in summer time, 08:00 UTC in winter).
- `scheduledTime`: "timestamp when this course work is scheduled to be published". Used with `state: 'DRAFT'` it is how schedule-ahead works **(verify that the API accepts it only on drafts)**. Lets Patryk set the homework days ahead to appear at, say, the end of the lesson.
- `state`: DRAFT or PUBLISHED.
- `maxPoints`: 0 or missing means ungraded.
- `materials`: up to 20. **A Form cannot be attached as a Forms material by the API** ("setting the form... field is not supported"); it goes in as a `link` ("On creation, this is upgraded to a more appropriate type if possible").
- **No API field turns on Classroom's "Grade importing".** That switch exists only on a Quiz assignment made in the Classroom UI, and needs the Form to be the only attachment, one response per pupil, same domain, emails collected. https://support.google.com/edu/classroom/answer/9095575
- CourseWork made by a script can only be changed later by the same script project ("must be made with an OAuth client ID from the associated Developer Console project", courses.courseWork/create). So the planner could later write each pupil's Form total into Classroom with `studentSubmissions.patch` (assignedGrade) **(verify scope and that the default Apps Script project counts as the same project)**.
- Seneca and other homework: the same `CourseWork.create` with a `link` material to the Seneca assignment link works as a draft. Free.

## 9. What is free and what needs set-up

| thing | cost | set-up |
| --- | --- | --- |
| FormApp, DriveApp, Classroom advanced service, triggers | free | already on |
| Template-copy for quiz settings | free | make one template Form by hand, store its id |
| Forms REST API from Apps Script (answer keys on short answers, picture inside a question) | free, no billing | needs a standard Google Cloud project linked to the script with the Forms API switched on, and the `forms.body` scope; school Workspace admins sometimes block making Cloud projects **(check before relying on it)** |
| AI marking | paid API | out, per CLAUDE.md |

## 10. Can and cannot, in one list

Apps Script CAN: make a quiz Form; add multiple-choice, tick-box, dropdown items with answer keys and points; add page breaks; add picture blocks; set right/wrong feedback per choice item and general feedback on text items; validate number input; collect verified school emails; limit to one response; close the Form; copy a template Form; read every response, answer and score; change scores; create a Classroom draft with link, points, due date (UTC) and scheduled post time.

Apps Script CANNOT (FormApp): set release-grades timing; set what respondents can see; give partial credit on tick boxes; score one dropdown with different marks per choice; score a grid; set a short-answer answer key; put a picture inside a question or option; give different feedback per wrong option; stop the Back button; turn on Classroom grade import.
