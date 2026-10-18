# Homework replica: architecture (step 3, replica-architect)

Date: 2026-10-18. Research and planning only: no code changed, nothing on Drive, nothing published.
Reads: 00 to 03 in this folder, `design-audit/planner-tabs/spec.md`, and the current (uncommitted) `planner/Code.gs`, `planner/Planner.html`, `planner/test-homework-quiz.js`, `science-lesson/references/test-paper.js`, `homework-forms.js`, `ms-friendly.js`.

The pack's default stack (Next.js, Postgres, Stripe) does not apply. The stack is fixed and every part is already running. This file maps the homework features onto it.

## 1. Stack (fixed, nothing new)

| layer | what it is | why it stays |
| --- | --- | --- |
| Question choosing | Node scripts at home: `test-paper.js` (exam practice) and `homework-forms.js` (short weekly quiz), reading the local exam library | Verbatim exam questions and mark schemes live only at home |
| Carrier | Mailbox web app on his personal account (`Mailbox.gs`), reads `Admin/Planner Sync/homework-*.json` | School blocks sharing personal Drive; already works |
| Server | Planner Apps Script web app on the school account (`Code.gs`) | Free; already makes the Form and the Classroom draft |
| Teacher screen | `Planner.html` Homework tab (and Assessment tab later, per `planner-tabs/spec.md`) | Already where he checks quizzes |
| Pupil screen | Google Forms quiz, opened from a Classroom assignment | Pupils already sign in to Google; nothing new to log in to |
| Posting | Classroom advanced service: `CourseWork.create` with `state: DRAFT`, link material, due date and time, optional `scheduledTime` | Free; drafts already work |
| Records | Planner spreadsheet: new **Homework** sheet tab; mailbox file `homework-made.json` (the receipt, as now) | No database needed |
| Cost | No paid API, no Google Cloud project | Per CLAUDE.md |

## 2. Data flow

```
HOME (Node)                                  MAILBOX (personal)        PLANNER (school Apps Script)                 PUPIL
test-paper.js / homework-forms.js
  choose questions (exam library)
  ms-friendly.js markPoints()  -> mark points
  addQuizImages()              -> pictures
  write homework-<cls>-<due>[-core|-challenge].json  --->  Admin/Planner Sync
                                                         op=list, op=read  --->  homeworkList(): preview on Homework tab
                                                                                  Patryk ticks class, tier, dates, message
                                                                                  setHomework(items):
                                                                                    copy template Form (DriveApp.makeCopy)
                                                                                    buildQuiz_(): questions, pictures,
                                                                                      self-mark page, settings
                                                                                    classroomDraft_(): DRAFT or scheduled,
                                                                                      due = next lesson 08:00 UK -> UTC
                                                 op=write homework-made.json <---  receipt
                                                                                    Homework sheet tab: one row per class  ---> Classroom post -> Form
                                                                                                                                 page 1 answer, page 2 self-mark,
                                                                                                                                 submit, View score
                                                                                  later: formResults(formId) reads responses
```

One Form per class. The tier is chosen in the planner: home writes both `-core` and `-challenge` files for Years 9 to 11; the planner turns only the one ticked for that class into a Form.

## 3. Quiz JSON schema v2 (the file home writes)

The file name pattern does not change (`homework-<cls>-<yyyy-mm-dd>[-core|-challenge].json`), so `Mailbox.gs` needs no redeploy. The planner must still read v1 files (no `schema` field): it falls back to today's "mark k of n" items.

### 3.1 Whole file

| field | type | meaning |
| --- | --- | --- |
| `schema` | 2 | marks the new format |
| `cls` | "10C2" | class |
| `due` | "2026-10-26" | home's guess; the planner replaces it with the class's next lesson (section 7) |
| `kind` | "exam-practice" or "weekly" | which script made it |
| `tier` | "core", "challenge" or null | null = one version only (KS3, A level) |
| `board` | "AQA" or "OCR A" | |
| `title` | text | Form title, no due date in it (the planner adds the date, since it may change) |
| `topic` | "P1 Energy" | for the pupil message |
| `minutes` | number | about 1 minute per mark (1.2 at A level); shown in the intro |
| `intro` | text | page 1 description, home's wording (05 gives the words) |
| `questions` | list | below |
| `left` | list of `{ref, why}` | questions dropped (needs drawing, picture too big); shown on the Homework tab |
| `missingPictures` | list | as now |

### 3.2 Every question

| field | meaning |
| --- | --- |
| `type` | `mcq`, `number` or `written` |
| `label` | "Question 3(b)": the pupil-facing number, the same on the answer page and the marking page |
| `text` | verbatim question, tables as rows of text (`withTables`), powers typeset |
| `images` | `[{name, mime, data (base64), label?}]`; `label` "A".."D" for a picture that is an option; max 1.5 MB each (as now) |
| `ref`, `part`, `lesson` | library id, part letter, lesson title (as now; `ref` feeds exam-usage.json and later the results view) |

### 3.3 By type

**mcq** (marks itself)

| field | meaning |
| --- | --- |
| `options` | list of text |
| `answer` | index of the right option |
| `answers` | list of indexes when more than one box must be ticked (becomes a tick-box item, all-or-nothing) |
| `points` | usually 1; a "tick two boxes" part is worth its marks |
| `feedback` | examiner comment, shown to a pupil who got it wrong ("What examiners saw: ...") |

**number** (a calculation: the answer box only takes a number; marked by the pupil, never by exact match)

| field | meaning |
| --- | --- |
| `unit` | "J", shown after the question ("Give your answer in J") |
| `marks` | total marks |
| `markPoints` | as for written, with the calculation rule (3.4) |

The planner makes a short-answer box with "numbers only" checking, plus an optional "Your working" paragraph box. Neither scores; the marks come from the marking page. (A real answer key on a typed number needs the Forms REST API and a Cloud project: not now.)

**written** (marked by the pupil)

| field | meaning |
| --- | --- |
| `marks` | total marks |
| `scheme` | the full readable mark scheme (`msPlain`, as now), shown at the top of that question's block on the marking page |
| `markPoints` | list, below; their marks add up to `marks` |
| `levels` | for 6-mark level questions only: `[{level, from, to, need}]`, Level 1 first |

### 3.4 Mark points (`markPoints[]`, the core of v2)

```json
{ "id": "q3b-1", "part": "(b)", "marks": 1, "kind": "point",
  "says": "the block transfers energy to the surroundings",
  "also": ["heat lost to the surroundings"], "no": ["heat escapes"] }
```

| field | meaning |
| --- | --- |
| `says` | the mark scheme's own words for this mark (verbatim, from `friendlyMs`), trimmed of marker codes |
| `kind` | `point` (one creditworthy point), `answer` (final answer of a calculation), `method` (working mark), `level` (a level step), `mark` (fallback: the scheme could not be split) |
| `marks` | 1 for a point; 2 for a level step; 1 for each method mark |
| `also`, `no` | "Also accepted" and "No mark for" lines, shown under the item |
| `part` | part label for a multi-part OCR question |

How home makes them, from `friendlyMs(ms, {board, marks})` (new function `markPoints()` in `ms-friendly.js`):

| what the scheme looks like | mark points made | example item wording (05 has the full rules) |
| --- | --- | --- |
| Split into one line per mark (`split: true`, AQA) | one `point` per line, `marks` from the line | "Did you say: the block transfers energy to the surroundings? (1 mark)" |
| A point worth 2 that cannot be split | `mark` items, one per mark, each showing the whole point | "Mark 1 of 2 for: ...". Same as today's fallback |
| Calculation (OCR M1/C1/A1 codes, or AQA "2 marks: 24, 1 mark for converting time") | one `method` per working mark, then one `answer` for the last mark | "Did you get the final answer 24 (W)? (1 mark)". The marking page says: a right final answer gets every mark for that question, so tick Yes to all of them |
| Level of response (AQA `levels`, OCR `lor`) | one `level` per level, 2 points each, Level 1 first | "Does your answer reach Level 1: ...? (2 marks)". Tick Yes only if you also reached the levels before it |
| Answer is a picture or graph (`picture: true`) | question left out of the Form (in `left`) | |
| No scheme found | one `mark` per mark with "ask your teacher" | as today |

The level rule can over-count by 1 mark inside a level (a pupil at the bottom of Level 2 gets 4, not 3). Accepted: the Form total cannot do better without the teacher grading by hand.

## 4. Homework sheet tab (the records, in the planner spreadsheet)

One row per class per homework. Created by `setHomework`, read by `homeworkStatus`, ticked by `markHomework`.

| column | example |
| --- | --- |
| id | `10C2-2026-10-19-1` |
| cls | 10C2 |
| kind | exam-practice / weekly / seneca / key / revise / other |
| title | "P1 Energy exam practice (Core)" |
| file | `homework-10C2-2026-10-22-core.json` (blank for link homework) |
| tier | core |
| formId, formUrl | |
| courseId, courseWorkId | from `CourseWork.create`'s reply |
| setOn | 2026-10-19 |
| postAt | 2026-10-19T15:10 (UK) or blank for draft only |
| dueOn | 2026-10-26 |
| dueUtc | 2026-10-26T08:00Z |
| points | 23 |
| status | drafted / scheduled / live / due / marked (live and due are worked out when read) |
| made | timestamp |

`homework-made.json` stays as the guard against making the same file twice.

## 5. Server functions (the "API")

All are `google.script.run` calls from `Planner.html`, each starting with `check_(k)`. All free.

| function | does | input | output | flow |
| --- | --- | --- | --- | --- |
| `homeworkList(k)` (change) | quiz files waiting at home, with mark points, without pictures | | list of `{name, made, hw}` | preview (F-check) |
| `setHomework(k, items)` (new) | for each item: Form if needed, then Classroom draft or scheduled post, then a sheet row | `[{cls, kind, file?, tier, setOn, dueOn, post: 'draft' or 'schedule', postAt?, message, link?}]` | per item `{ok, formUrl, draft, why}` | set homework |
| `makeHomework(k, only)` (change) | kept for the menu; makes the Form only and no Classroom draft (spec 2.3) | file name | as now | old path |
| `buildQuiz_(hw, notes)` (change) | template copy, settings, page 1, marking page | | Form | inside setHomework |
| `classroomDraft_(hw, form, opt)` (change) | draft with UTC due time, optional `scheduledTime`, plain message | | `{ok, courseWorkId, why}` | inside setHomework |
| `ukToUtc_(date, h, m)` (new) | 08:00 UK on a date as a UTC time of day | "2026-10-26", 8, 0 | `{hours, minutes}` | inside classroomDraft_ |
| `homeworkStatus(k)` (new, later) | rows plus Classroom state and Form response counts | | list | status strip |
| `markHomework(k, id)` (new, later) | ticks Marked | id | row | |
| `formResults(k, formId)` (new, later) | % right per question, most-chosen wrong option, doubtful self-marks | formId | report | results |
| logic.js `dueFor(data, cls, setOn)` (new, page side) | the due-date rule | | `{due, why}` | set homework |

Mailbox ops used: `list`, `read`, `write homework-made.json` (all exist). No change to `Mailbox.gs`.

Triggers: none needed for the first version. Later, optional: a daily time trigger that closes Forms a week after their due date (`setAcceptingResponses(false)`); not asked for, so not planned.

## 6. buildQuiz_ in v2, item by item

1. `const id = PropertiesService.getScriptProperties().getProperty('TEMPLATE_FORM_ID')`. If set: `DriveApp.getFileById(id).makeCopy(title, folder)` then `FormApp.openById(copy.getId())`. If not set: `FormApp.create(title)` as now, and a note "made without the template: check Settings > Quizzes > Release grades".
2. Settings it can set: `setIsQuiz(true)`, `setCollectEmail(true)`, `setLimitOneResponsePerUser(true)`, `setAllowResponseEdits(false)`, `setShowLinkToRespondAgain(false)`, `setProgressBar(true)`, `setPublishingSummary(false)`, `setDescription(intro)`, `setConfirmationMessage(...)` (05).
3. Page 1: for each question, pictures first (as now), then:
   - mcq: `addChoice_` (as now).
   - number: `addTextItem().setTitle(label + text + unit line).setRequired(true).setValidation(requireNumber())`, then `addParagraphTextItem().setTitle(label + ': your working (optional)')`.
   - written: `addParagraphTextItem` (as now).
4. If any number or written questions: `addPageBreakItem()` "Mark your own answers" with help text (05).
5. For each self-marked question: `addSectionHeaderItem()` with the label and the whole scheme (as now), then one Yes/No item per mark point: choices "Yes" (correct) and "No", `setPoints(point.marks)`, required, `setFeedbackForIncorrect(<"You missed: " + point.says>)`, `setFeedbackForCorrect(<"Well done: " + point.says>)` only if short. The `also`/`no` lines go in the item's help text. Titles longer than about 200 characters put the point in the help text and keep a short title.
6. Fallback (v1 file or a question with no `markPoints`): today's "Question n, mark k of m" items.
7. Move to the "Planner homework quizzes" folder (the template copy is made straight into it).
8. `tryPlain_` stays round every item.

Points check: Form total = mcq points + sum of all mark-point marks. `classroomDraft_` uses the same sum for `maxPoints` (one shared helper, `totalPoints_(hw)`), so the two never disagree.

## 7. Dates and times

- **Due day**: `dueFor` in logic.js. From the set-on day, list that class's lessons from the timetable (`data.timetable[weekLetter]`, skipping days where `isTeachingDay` is false). Pick the lesson closest to 7 days later, within 4 to 9 days. None in range (half term, INSET): the first lesson after, with `why: 'half term'`.
- **Due time**: always 08:00 UK. `ukToUtc_`: `Utilities.formatDate(new Date(Date.UTC(y, m-1, d, 12)), 'Europe/London', 'Z')` gives "+0100" or "+0000"; UTC hour = 8 minus the offset. 26 Oct 2026 onwards: 08:00 UTC. Up to 23 Oct: 07:00 UTC. The date never moves (08:00 UK is always the same date in UTC).
- **Post time** (Schedule it): default the end of the set-on lesson, from `periodTime(data, cls, period)` (logic.js already has it), sent as `scheduledTime` in RFC 3339 UTC, with `state: 'DRAFT'`.
- **Draft only** (default, per spec question 1): no `scheduledTime`.

## 8. The parts that bite

- **Time zones**: due times are UTC; the current draft's `{hours: 8, minutes: 30}` is 09:30 UK until 25 Oct. Fixed by `ukToUtc_` per date; tested on dates either side of 25 Oct 2026 and 28 Mar 2027.
- **Settings the script cannot set**: release grades and what respondents see. Fixed only by the template copy. If the template is deleted, every new Form silently loses them: `buildQuiz_` must say so in the result, not fail quietly.
- **Twice-clicked buttons**: `LockService.getScriptLock().waitLock(30000)` round `setHomework`, plus the `homework-made.json` receipt and a check of the Homework tab for the same cls + file, so a double click never makes two Forms or two drafts.
- **6-minute limit**: Apps Script stops a call after 6 minutes. A Form with many pictures takes about 20 to 60 seconds; several classes in one click could run long. `setHomework` handles one class per server call (the page calls it in turn and shows each result).
- **Forms refusing text**: `tryPlain_` stays (12C/13D question 7 problem).
- **Picture size**: 1.5 MB cap at home (as now). Pictures stay as a block above the question (FormApp cannot put them inside).
- **Back button**: cannot be stopped. Wording on the marking page, and later the honesty flag in `formResults` (full marks claimed on fewer than 5 words).
- **Pupils cannot see their own answer on the marking page**: Forms cannot repeat an earlier answer on a later page. Each question block on the marking page repeats the start of the question, and the wording tells pupils they may press Back to read their answer but not change it (05 has the words). The honesty flag covers the rest.
- **Classroom names**: course matching by name (as now, with the "7Ml" rule).
- **Classroom edits later**: only this script project can edit the coursework it made; keep `courseWorkId` in the sheet.
- **Pupil data**: responses stay in the school's Forms; the planner reads counts and scores only; nothing goes to home or the mailbox.
- **Old files**: v1 quiz files still in Planner Sync must keep working (fallback in step 6).

## 9. What Patryk does once, by hand (about 10 minutes)

1. In the school Drive, open Google Forms, make a **blank** form named `Homework template (do not delete)`. Add no questions.
2. Settings > **Make this a quiz**: on.
   - Release grades: **Immediately after each submission**.
   - Respondent settings: tick **Missed questions**, **Correct answers**, **Point values**.
3. Settings > Responses: Collect email addresses **Verified**; **Limit to 1 response** on; **Allow response editing** off.
4. Settings > Presentation: **Show progress bar** on; Shuffle question order **off**.
5. Copy the form's id from its address bar (the long code between `/d/` and `/edit`).
6. In the planner's Apps Script: Project settings > Script properties > Add `TEMPLATE_FORM_ID` = that code. Save. (No redeploy needed for a property.)
7. Move the template into the `Planner homework quizzes` folder so it is easy to find.

## 10. The four checks on one throwaway Form (do before step 4 of the build)

Run from a small test function in the planner's Apps Script editor, on a copy of the template, with one test pupil account if he has one (or his own second account).

| # | check | how | pass |
| --- | --- | --- | --- |
| 1 | The copy keeps the quiz settings | `makeCopy` the template, open the copy's Settings | release immediately and all three respondent boxes still ticked |
| 2 | `getScore()` is filled without a grading pass | answer the copy once (MC right, one Yes, one No), then log each `itemResponse.getScore()` | MC and Yes items show their points, No shows 0, no manual grading needed |
| 3 | Classroom accepts `scheduledTime` on a draft | create a draft in a test class (or his own class with a far future time, then delete it in Classroom) | it appears under Scheduled at the right UK time |
| 4 | Cloud project allowed | only matters for typed-number answer keys and pictures inside questions | skip unless he wants those; nothing in this plan needs it |

Also look, during check 2, at what the pupil sees on View score: the "You missed: ..." feedback under each No.

## 11. Build steps, in order (each small and testable)

Each step ends with `node planner/test-homework-quiz.js` (planner steps) or `npm test` (home steps) green. Planner steps need a copy of Code.gs pasted and a New version deployed only at the end (step 12).

0. Patryk: template Form and `TEMPLATE_FORM_ID` (section 9); run the four checks (section 10). Nothing else depends on code.
1. **Home, `ms-friendly.js`**: add `markPoints(ms, {board, marks, calc})` from `friendlyMs`, rules in 3.4. Test in `test/ms-friendly.test.js`: an AQA split scheme, an AQA unsplit 2-marker, an AQA calculation, an OCR M1 A1 calculation, an OCR multi-part, an AQA levels 6-marker, an OCR `lor` 6-marker; marks always add up to the total.
2. **Home, `test-paper.js` `formsQuiz`**: write `schema: 2`, `label`, `markPoints`, `levels`, `topic`, `minutes`, `left`; `number` type for calculation parts that have one numeric answer and a unit; title without the due date. Test: build one fixture paper, check every written or number question's mark points add to its marks.
3. **Home, `homework-forms.js` `choose`**: the same fields; replace its stale intro ("the mark scheme appears after you submit") with the 05 wording. Test: dry run for one class, same check.
4. **Planner, `buildQuiz_`**: template copy with fallback (section 6, step 1) and the settings in step 2, including `setLimitOneResponsePerUser(true)`. Test: fake `DriveApp.makeCopy` and `FormApp.openById` in `test-homework-quiz.js`; check the copy is used when the property is set, the note appears when not, and one-response is on.
5. **Planner, `buildQuiz_` marking page**: one Yes/No per mark point with the point's own words, points = point marks, "You missed" feedback, also/no in help text; v1 fallback kept. Test: a v2 fixture (split point, calculation, level) and the existing v1 fixture both pass.
6. **Planner, number questions**: number box with `requireNumber()` plus optional working box. Test: fake validation builder records `requireNumber`.
7. **Planner, `totalPoints_` and `ukToUtc_`**: one points total for Form and Classroom; UTC conversion. Test: 23 Oct 2026 gives 07:00, 26 Oct 2026 gives 08:00, 29 Mar 2027 gives 07:00.
8. **Planner, `classroomDraft_`**: UTC due time, optional `scheduledTime`, message as description, return `courseWorkId`. Test: draft body has `dueTime.hours` 7 or 8 by date, `scheduledTime` only when asked.
9. **Planner, logic.js `dueFor`**: due rule in section 7. Test in `test-logic.js`: a normal week, a 2-lessons-a-week class, the Friday before half term (due first lesson back, `why` "half term"), an INSET day.
10. **Planner, `setHomework` + Homework sheet tab**: one class per call, lock, receipt, sheet row; `makeHomework` stops making drafts. Test: two calls for the same class and file make one Form and one draft.
11. **Planner, `Planner.html` Homework tab**: "Set new homework" section for the Exam practice and Weekly quiz kinds (05 section 2): class ticks, Core/Challenge, dates, send, message, Make the drafts; the existing check list moves under it. Test: `make-preview.js` screenshot check, plus a jsdom check that the due date shown matches `dueFor`.
12. **Ship at school**: paste Code.gs, logic.js, Planner.html; deploy a New version; make one real quiz for one class as Draft only; open it as a pupil (his second account) and do it end to end.
13. **Later, separate session**: `homeworkStatus`, `markHomework`, status strip; then `formResults` (most missed, most-chosen wrong option, honesty flag) for the Assessment tab and the next lesson's Do Now; then link homework kinds (Seneca, key homework, revise).

## 12. Summary

- Stack: home Node scripts + mailbox + planner Apps Script + Google Forms + Classroom drafts; nothing new.
- Records: 1 new sheet tab (Homework), 1 existing receipt file. Quiz file schema v2 with mark points.
- Server functions: 4 changed, 4 new now, 3 later; 1 new page-side helper.
- Riskiest: the template copy keeping its settings (check 1); `getScore()` without a grading pass (check 2); time zones on due times (step 7).
- Next: `05-design.md` (pupil Form pages and the Homework tab).
