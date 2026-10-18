# Recon map: science homework and quiz apps (web and phone)

Scope: how a teacher sets self-marking homework and how a pupil does it on a phone. Apps: Seneca Learning, Sparx Science, Educake, Carousel Learning, Google Forms quizzes with Google Classroom, Quizizz (now Wayground).
For: Patryk's planner (Google Apps Script, free, school Workspace). Research only, nothing built.
Date: 2026-10-18

Method: public help centres, marketing pages, school guides for parents, Google's own docs. No logins, no scraping. Where a point comes from general product knowledge rather than a page read today it is marked **(medium)** or **(guess)**. Everything unmarked has a source in the table.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Seneca help: create an assignment | https://help.senecalearning.com/en/articles/2483015-how-to-create-an-assignment-on-seneca | steps, content types, dates |
| 2 | Seneca help: AI-marked exam questions | https://help.senecalearning.com/en/articles/6536455-ai-marked-exam-questions-for-teachers | auto-marked, teacher re-mark |
| 3 | Seneca help: re-mark AI-marked EQs | https://help.senecalearning.com/en/articles/8536842-how-do-i-re-mark-ai-marked-exam-questions | pencil icon = pupil self-marked, flagging, Speedy Marking |
| 4 | Seneca CPD page on AI marking | https://senecalearning.com/en-GB/revision-notes/teacher-cpd/cpd-applications-of-artificial-intelligence-in-education/1-2-6-open-ended-questions | LLM plus human oversight |
| 5 | Sparx Science: introducing | https://support.sparxscience.com/en/articles/545977-introducing-sparx-science | homework "sets itself", auto-marked |
| 6 | Sparx Science: key concepts | https://support.sparxscience.com/en/articles/566257-key-concepts-of-a-sparx-science-homework | 40/30/30 mix, retry, guided support, 100% completion |
| 7 | School letters on Sparx (Samworth, Bohunt) | https://files.schudio.com/samworth/files/documents/Sparx_parental_letter_April_2026.pdf | set Thursday, due next Thursday; XP |
| 8 | Educake help: question types | https://help.educake.co.uk/en/articles/809801-what-are-educake-questions-like | short answers up to three words, all auto-marked (page 403 today; quoted via search) |
| 9 | Educake teacher case study | https://wp.educake.co.uk/wp-content/uploads/2022/02/John-Hanson-case-study.pdf | results grid, per-question averages |
| 10 | Carousel home page | https://carousel-learning.com/ | bank, quiz, pupils self-mark, teacher moderates, whole-class feedback |
| 11 | School guide to Carousel homework | https://ormistonsirstanleymatthewsacademy.co.uk/admin/wp-content/uploads/sites/22/2025/04/How-do-I-do-my-homework-on-carousel-learning.pdf | pupil compares own answer to correct answer, presses a button per answer (via search summary; PDF text not extractable here) |
| 12 | Google Forms help: quizzes | https://support.google.com/docs/answer/7032287?hl=en | release grades, respondent settings, answer keys |
| 13 | Classroom help: quiz assignment | https://support.google.com/edu/classroom/answer/9095575?hl=en | grade importing, locked mode, requirements |
| 14 | Wayground open-ended page | https://wayground.com/home/solutions/open-ended-questions-on-quizzes | open-ended reviewed and graded by hand |
| 15 | Quizizz homework mode (old deck) | https://www.slideshare.net/Quizizz/quizizz-presentation-49737217 | deadline up to 2 weeks, resume, show answers setting |
| 16 | Wayground exhibitor listing | https://www.terrapinn.com/exhibition/edutech-asia/exhibitor-wayground-formerly-quizizz.stm | AI grading of open answers against school mark schemes (marketing) |

## Core loop (shared by all six)

Teacher picks content for a class with a due date, pupils answer on a phone or laptop, most answers mark themselves at once, teacher sees a per-question results grid.

## How each app handles the eight questions

| | Seneca | Sparx Science | Educake | Carousel | Google Forms + Classroom | Wayground (Quizizz) |
| --- | --- | --- | --- | --- | --- | --- |
| **Teacher sets work** | Create + > Assignment > tick classes > pick course > tick topics and content type > name, students, start and due date and time > Create > copy link to Classroom (src 1). About 6 screens. | Teacher does not build each homework. Department enters scheme of learning once; Sparx sets weekly homework for each pupil (src 5, 6). Teacher picks topics taught that week. | Pick topics or questions from the bank, set date and class (medium). Teachers can pre-date many tasks at once and pupils get them on the chosen date (search summary of Educake teacher page). | Choose a question bank (community or own), build a quiz, share with pupils (src 10). | Classroom > Classwork > Create > Quiz assignment makes a blank Form; or build a Form and paste the link into an assignment (src 13). About 8 to 15 clicks plus writing every question and answer key. | Pick or build a quiz, Assign, set deadline and options, share code or post to Classroom (src 15, medium). |
| **Self-marking question types** | Multiple choice, typed short answer, ordering, matching, cloze; exam questions AI-marked (src 1, 2). | Multiple choice, linking boxes, tables, calculations, sorting, short text (spellchecker allows misspellings), short answer 1 to 4 marks AI-marked (src 6). | Typed answers up to three words, multiple choice, all auto-marked (src 8). | Pupil types an answer, then marks it against the model answer (src 10, 11). | Multiple choice, tick boxes, dropdown, short answer (exact match), MC grid, tick-box grid (src 12). | Multiple choice, fill-in, ordering, matching, many more (medium). |
| **Long answers** | Free-text exam questions marked by an AI with human oversight; pupils may also mark themselves (pencil icon); pupils can flag a mark; teacher can re-mark one by one or in bulk ("Speedy Marking") (src 2, 3, 4). Free plan: 3 live assignments with exam questions at a time (src 1 search). | AI marks 1 to 4 mark written questions (src 6). Pupils complain loudly about it (see 02). | Not offered. Educake says there is "no reliable way" to auto-mark longer answers (src 8). | Self-marked by the pupil against the model answer; teacher can moderate (overturn) marks (src 10). | Paragraph questions are not auto-graded; teacher grades by hand in the Individual tab and releases scores, or gives 0 points (src 12; see 03). | Open-ended answers reviewed and graded by hand by the teacher (src 14); AI grading advertised (src 16). |
| **Feedback to pupils, and when** | Instant right or wrong per answer; wrong ones come back later (medium). | Instant. Wrong answer gets a second attempt, then "guided support" questions; homework only complete at 100% correct (src 6). | Instant right or wrong and shown all accepted answers (search summary of Educake help). | After finishing: own answer shown next to the correct answer; pupil self-marks. Revise mode repeats missed ones (src 11). | After submit, if "Release grades: immediately" is on: View score shows total, and per question missed, correct answers and point values if those boxes are ticked; plus any answer feedback text (src 12). | Optional "show answers" after each question; end-of-quiz review (src 15). |
| **Due dates and scheduling** | Start and due date and time per assignment (src 1). | Weekly hand-out and hand-in day and time set by school, e.g. Thursday to Thursday (src 6, 7); tasks open 3 months after due. | Due date on each quiz; schedule ahead (pre-date) (search summary). | Quizzes set with dates (guess). | Classroom: schedule to post later plus due date and time (src 13). Forms has no due date of its own, only "accepting responses" on or off. | Deadline, originally up to two weeks ahead (src 15). |
| **Pupil flow on a phone** | App or browser; Google or Microsoft single sign-on; many log-in and loading complaints (see 02). | Browser, saves progress, works across sessions (src 6). | Browser (medium). | Browser (medium). | Classroom app notification > open assignment > Form opens in browser > answer > Submit > View score > back to Classroom > Mark as done (medium). The Mark as done step is often forgotten (guess). | App or browser, game style (medium). |
| **Teacher results and misconceptions** | Per-pupil scores, per exam question class view (Questions tab), re-mark (src 2). | Weekly insights; level per pupil 1 to 4, override; working time (src 6). Sparx Maths parents quote "a report of the questions that have been incorrectly answered the most" (Mumsnet, 02). | Results grid by pupil and question, average per question to spot misconceptions (src 9). | Moderation, results, Whole Class Feedback report (src 10). | Summary tab: average, median, range, "frequently missed questions", per-question chart of answers chosen (src 12, medium for wording). | Item analysis report (GetApp user review, via search: https://www.getapp.com.au/software/2050022/quizizz). |
| **Images in questions** | Yes, inside content (medium). | Yes (medium). | Yes (medium). | Yes, own banks can add images (guess). | Yes: image inside a question or as an answer option in the editor; Apps Script FormApp can only add a separate picture item (see 03). | Yes, in question and options (medium). |

## Screens (combined across the class of app)

| ID | screen | how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Class list | teacher home | pick class | class cards | empty (no classes), filled |
| S02 | Content picker | Create assignment | choose topics or questions | course tree, tick boxes, content-type tabs, time estimate | none ticked, filled, limit reached (Seneca 3 EQ assignments) |
| S03 | Assignment details | after S02 | name, students, start, due | text field, pupil tick list, date and time pickers | missing date error |
| S04 | Share step | after S03 | push link to Classroom or Teams | copy link, share-to-Classroom button | copied |
| S05 | Pupil to-do list | pupil home or Classroom | see what is due | cards with due date, status | nothing due, due today, overdue, done |
| S06 | Question page | open task | answer | question text, picture, options or text box, progress bar, Next | unanswered, answered, required missing |
| S07 | Instant feedback | after each answer (Seneca, Sparx, Educake, Wayground) | right or wrong now | tick or cross, correct answer, try again, hint | right, wrong first try, wrong second try (guided support) |
| S08 | Self-mark page | after answering (Carousel, Seneca pencil) | pupil judges own answer | own answer beside model answer, right or wrong buttons per answer | all marked, some unmarked |
| S09 | Score summary | end of task | total and review | score, list of missed questions, correct answers | released, not yet released (manual review) |
| S10 | Teacher results grid | teacher > assignment | who did what | pupil by question grid, colours, averages | nobody done, partial, all done |
| S11 | Question insight | click a question column | misconceptions | answer choice counts, most common wrong answer | |
| S12 | Moderation queue | Carousel, Seneca, Forms Individual tab | check or overturn marks | answer, mark, override, flagged filter | none flagged, flagged |
| S13 | Whole-class feedback | Carousel | plan next lesson | top missed, common errors, quotes of pupil answers | |

## Flows

```
F01 Teacher sets homework for one class (Seneca)
    S01 -> S02 -> S03 -> S04 -> (Classroom: paste link, post)
    happy path clicks: about 10 to 12 plus the Classroom post
    edge: EQ limit reached, pupil not in class list, due date in the past

F02 Teacher sets weekly homework (Sparx)
    one-off: scheme of learning entered; weekly: tick topics taught
    happy path clicks: about 2 a week
    edge: topic not taught yet appears ("questions that we have not learnt yet")

F03 Teacher sets a Forms quiz via Classroom
    Classroom > Create > Quiz assignment -> Form editor: every question, answer key, points
    -> Settings: release grades, respondent can see -> back to Classroom: due date, schedule, grade import on -> Assign or Schedule
    happy path clicks: 15+ plus typing every question
    edge: grade import turned off by adding a second attachment; email not collected

F04 Pupil does homework on a phone (auto-marked)
    notification -> S05 -> S06 (repeat) -> S07 each time -> S09
    happy path taps: 2 + 2 per question

F05 Pupil self-marks a written answer (Carousel model)
    S06 answer all -> S08 see model answer, mark each -> S09
    edge: pupil marks everything right; pupil goes back and edits after seeing the answer

F06 Teacher acts on results
    S10 -> S11 (most missed, common wrong answers) -> S13 -> next lesson's Do Now
    edge: few submissions, AI mark disputed -> S12
```

Clicks to beat for Patryk: one press in the planner per class (the planner already builds the Form and a Classroom draft).

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Question card | MC, tick boxes, short text, long text, picture | unanswered, answered, error (required) | S06 |
| Picture | in question, as option | loading, failed | S06 |
| Mark-point row | "did you get this point?" yes or no | unmarked, yes, no | S08 |
| Feedback panel | right, wrong, with answer, with hint | | S07, S09 |
| Progress bar | | | S06 |
| Date and time picker | due, scheduled post | | S03 |
| Results grid cell | right, wrong, partial, not done | | S10 |
| Answer distribution bar | per option | | S11 |

## Inferred data model (planner side, what any of these keep)

```
Homework   id, class, title, version (core | challenge), set_at, scheduled_post_at, due_at, form_id, classroom_coursework_id
           evidence: S03 fields in every app; Code.gs makeHomework/classroomDraft_
           confidence: high
Question   id, homework_id, order, type (mcq | multi | short | written), text, images[], options[], answer(s), points,
           mark_points[] (written only), misconception_by_option{} (mcq only), source (exam paper ref)
           evidence: S06, S08, S11; homework JSON today has text, options, answer, marks, scheme, images
           confidence: high
Response   pupil_email, homework_id, submitted_at, total, per_item {answer, score}
           evidence: Forms FormResponse (see 03)
           confidence: high
SelfMark   response_id, question_id, mark_point_index, claimed (yes | no), answer_word_count
           evidence: Carousel moderation; would be derived from Form items
           confidence: guess (new for Patryk)
```

Relationships: Class 1-n Homework, Homework 1-n Question, Homework 1-n Response, Response 1-n SelfMark.

## Feature matrix

| feature | area | priority for Patryk | who has it | Forms today | notes |
| --- | --- | --- | --- | --- | --- |
| Auto-marked multiple choice | marking | must | all | yes | |
| Auto-marked numeric answer | marking | should | Sparx, Educake, Wayground | no | needs Forms REST API (see 03) |
| Long answers self-marked against mark points, counting to score | marking | must | Carousel, Seneca (pencil) | built in Code.gs 2026-10-16, Yes/No per mark | label each item with the actual point |
| Teacher moderation of self-marks | marking | should | Carousel, Seneca | no | planner can flag doubtful self-marks |
| Score released at once, missed questions shown | feedback | must | all | default, but not settable by script | template-copy trick (see 03) |
| Per-wrong-option feedback | feedback | should | Sparx (guided), Wayground | partial (one feedback for any wrong answer) | |
| Due date and scheduled post | scheduling | must | all | yes, but dueTime is UTC (see 03) | |
| Images in question | content | must | all | yes, as separate picture item above | |
| Misconception view (most-chosen wrong answer) | insight | should | Educake, Sparx, Forms Summary | Forms Summary tab by hand | planner can tally from responses |
| Retry wrong answers in the same task | feedback | could | Sparx, Seneca | no | Forms cannot; do it in the next homework instead |
| Spaced recall of past misses | content | could | Sparx, Carousel | no | planner chooses |
| One version per class | setting | must | Educake, Seneca | yes (core or challenge file) | |
| Link drafts for other apps from the same tab | setting | should | none | no, but Classroom link drafts already work | |
| Locked mode | security | skip | Forms | | managed Chromebooks only |
| AI marking of long answers | marking | skip | Seneca, Sparx, Wayground | | paid or API cost; pupils dislike it (see 02) |
| Adaptive levels, XP, 100% completion loops | engagement | skip | Sparx | | the most hated part (see 02) |

## Out of scope

- Seneca, Sparx, Educake, Carousel question banks: their content, not copyable. Patryk's own exam library is the bank.
- AI marking: would be a paid API call (flag before building, per CLAUDE.md), and Ofqual/JCQ say AI cannot be the sole marker of qualification work (Tutopiya summary, https://www.tutopiya.com/tools/for-schools/school-blog/best-ai-marking-tools-igcse-a-level-2026/).
- Adaptive personalisation per pupil: needs a per-pupil Form; out of scope for one Form per class.

## Size

Screens 13 (most already exist as Google's own screens), flows 6, entities 4. Hard parts: settings Apps Script cannot reach (release grades, respondent view), honest self-marking with a Back button, time zones on Classroom dates. Size: S to M, because Google supplies the pupil side.
