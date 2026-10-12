# Brief for Claude Code: planner, behaviour app, homework and tests

## How to work (read first)

I have about 20% of my weekly usage left, so be economical.

1. Do not start coding yet. First read the existing project and the new files (see "New files to ingest"), then write `PLAN.md` with a prioritised task list. Keep it short.
2. Prioritise by value per token. Rank every item below as Now, Next or Later. My suggested ranking is in "Suggested priority", but override it if the code shows something is cheaper or blocks something else.
3. Work through the Now items in order. After each one, commit with a clear message and tick it off in `PLAN.md`.
4. Do not ask me questions unless you are blocked. If something is ambiguous, pick the most reasonable reading, note it in `PLAN.md`, and carry on.
5. Do not rewrite working parts. Fix and extend. Avoid large refactors unless the shared lesson state genuinely needs one.
6. Stop and summarise when you reach a sensible checkpoint or when usage looks low. Leave `PLAN.md` accurate so I can resume.
7. Writing style for any text you produce for me or for students: direct, concise, no filler, no em-dashes, no AI-sounding phrasing.

## New files to ingest (do this before planning)

I added these to my Beechen Cliff folder in Downloads:

- The missing Year 13 lessons.
- The new assessments.

Tasks:
- Locate them, then add the Year 13 lessons into the planner and the Classes page in the correct order for each Year 13 class.
- Add the new assessments as tests on the Tests tab with their dates, and plan them into the planner.
- Report anything you could not match (missing dates, unclear class, duplicate lessons) in `PLAN.md` instead of stopping.

## Suggested priority

**Now (highest value, mostly bugs and shared state)**
1. Ingest the Year 13 lessons and new assessments.
2. Shared lesson state: one record per lesson (taught, partly taught, stopped-at point, notes). Everything else reads from it.
3. Cancelled-lesson cascade, slide-over confirmation, and checkmarks carrying between weeks.
4. "Make next day" after midnight bug.
5. Lesson builder bugs: experiments cap 1 to 2, exam questions missing from the end of lessons.
6. Behaviour app timer X button, then lag if cheap.
7. Mark schemes made more explicit and student-friendly.

**Next**
8. Collapsible "Your week" panel.
9. Tests and Homework split, test builder with defaults.
10. Behaviour app integrated into the planner (one app, entries tied to the lesson), Excel data moved into the app.
11. Behaviour desktop layout, backdating, end-of-day reminder.
12. Classes page hover-over and shared lesson state.
13. "Review last lesson" button using the stopped-at note.
14. Lesson content quality: engage tasks, single Learn section default.

**Later (only if usage remains)**
15. Open lesson button, Google Classroom auto-post and manual upload.
16. Task and shift planner.
17. Mobile version.
18. Lesson mode, data loop, student profiles, admin automation, separate tools.

## Full change list

### 1. Bugs

**Planner**
- Cancelled lessons do not cascade. When a class is off (e.g. 7 Nolton A on a trip, Mon to Wed), later lessons should slide forward into following weeks. Weeks currently do not share state.
- Slide-over needs a light confirmation ("Shift later lessons forward?"), defaulting to yes. Sometimes I will not want the shift, but most of the time I will.
- Completion checkmarks do not carry between weeks. Store lesson-done state once per lesson, not per week view.
- "Make next day" after midnight picks the wrong day (made Tuesday's lesson on Monday night). Use the next school day, not the clock date.

**Lesson builder**
- Experiments are capped at 1 per lesson (radiation, reflection and refraction lesson). Raise the cap to 2.
- Exam questions are no longer appended to the end of lessons as extension tasks. Restore this. Check whether a recent builder change dropped the step.

**Behaviour app**
- Timer X button does nothing. Check the click handler and whether something overlays it.
- Lag on the timer and positives board (nice to fix, not essential).
- Behaviour app does not link into the planner.

### 2. Architecture

- One integrated app: planner, behaviour, homework and tests in a single application, not separate folders.
- Move the Excel data into the app instead of the planner linking to separate sheets.
- Shared lesson state: one record per lesson (taught, partly taught, stopped-at point, notes). Slide-over, checkmarks, the review button and spec coverage all read from it.
- Mobile version that works like Google Calendar: view and edit the planner, tick things off, log behaviour, and send a request from my phone to make a lesson.

### 3. Planner features

- Collapsible "Your week" panel on the right of the day/week view.
- "Start with a short review of last lesson" button. Design: each lesson stores a covered / not finished note (from the stopped-here marker or end-of-lesson prompt), and the review pulls from that.
- Auto-post each lesson's PowerPoint and worksheet to Google Classroom at the start of the period, plus a manual "upload today's lessons" button so I can check first.
- "Open lesson" button: one click opens everything for the current or next lesson in order (PowerPoint, worksheet, timer, seating plan, behaviour app for that class, linked sims or videos). A "Start my day" version queues every lesson. Browsers block multiple pop-ups, so use a launcher page with tabs or a small local script.
- Pick-a-day button to generate everything for a chosen day.
- Sliders, checks and email lists where I want more control.

### 4. Classes page

- Keep the current look and formatting.
- Add hover-over on classes and topics so the info is usable inside the planner.
- Same slide-over logic and shared lesson-done state as the planner.

### 5. Behaviour app

**Desktop layout**
- One screen showing seating plan, the class's recent behaviour and positives, and the positives board.
- New positives pop up as a small corner notification that fades, not a modal.
- Collapsible panels so it works on a projector.
- Class page per lesson: roster, today's positives and behaviour points, running total per student.
- Quick-log by tapping a name. One tap for a positive, two for a behaviour point with my 1 to 9 rule picked from a short list.
- Undo toast for 5 seconds after each log.

**Backdating and missed logging**
- Day picker on desktop and phone to add or view positives for a previous day.
- Phone menu with Today, Yesterday and recent days.
- End-of-day reminder: "Any positives to add for today?" with the day's classes listed.
- Flag on taught lessons that have no behaviour or positive entries.
- Weekly catch-up grid of all classes and days.

**Phone**
- Offline logging that syncs later.
- Voice note: say a name and reason to fill an entry.

**Data links**
- Entries tied to the lesson so the planner and end-of-lesson prompt can show behaviour for that period.
- Tap a name to see the student's history across classes.
- Positives feed the Scientist League automatically instead of the weekly screenshot.
- Export to the termly Word tracker so it fills itself.
- Flags: 3 behaviour points in a week, or no positives in 2 weeks, prompts a call home or a positive.

### 6. Homework and Tests (separate them clearly)

The two tabs currently overlap and are confusing.

**Tests tab (main feature)**
- Overview of upcoming tests and dates, with the prompt to make a mini practice test.
- Tests are planned into the planner.
- Flow: test day, then students review content afterwards, then a week later homework is handed in and a review lesson runs. This goes into the daily plan.
- Mini practice tests stay, but clarify their purpose and size.
- Custom test builder: choose length (20, 25 or 45 minutes) or set numbers directly. Options for number of multiple choice questions, number of written or long-answer questions, and mark mix (e.g. 6-markers). Sensible default with a "Default" button, and the option to edit individual settings.

**Homework tab**
- For work set to be done at home.
- Per class, create a homework as a Seneca assignment, PDF, imported file, or mini classroom test.
- Keep the upload and make-a-test function (works well).
- Mark schemes need to be more explicit and much easier for students to understand.

### 7. Lesson content quality

- Engage tasks: more "why does this property occur" questions (e.g. oil spill colours from phase difference, 12C). Phrase them in a more human way so I stop skipping them.
- Learn section: default to one section. Stop splitting into two when unnecessary (e.g. cell wall and permanent vacuole/chloroplast split in animal and plant cells).
- Graphs and diagrams: the generated ones (interference and phase difference) are excellent. Keep building on these and grow a reusable library.

### 8. Task and shift planner

- Tick a task to create a shift of the default length (e.g. assessment marking about 2 hours).
- Adjustable duration, with the option to split a shift into parts.
- Auto-place shifts into my free periods.
- Recurring shifts: marking, emails, calls home, assessment planning, assessment marking of different lengths.
- Ticking a task off marks the shift done, with confirmation.
- Protected blocks (gym, evenings, uni study) the scheduler will not touch.
- Optionally include workouts, lifestyle tasks, uni reading and tutoring slots in the same calendar.
- Marking estimator: 30 students at 10 minutes each becomes 5 hours of split shifts.
- Workload view with weekly hours planned, and an end-of-week review of what slipped and rolls over.
- Must work smoothly on mobile.

### 9. Lesson mode (full-screen teaching view)

Build it as a wrapper around the existing PPTX (slides on one side, class panel alongside), not a slide rebuild. PPTX stays as the fallback.

- Seating plan with names, SEND flags and access arrangements.
- Cold-call picker weighted to students not asked recently.
- Group maker (random, mixed ability, avoiding clashes).
- Behaviour and positive logging by tapping a name, without leaving the slides.
- Built-in timers that auto-start per activity, plus a lesson clock showing ahead or behind plan, and a bell countdown.
- Skip or swap sections live.
- Hinge question tally with a reteach or move-on suggestion.
- Extension questions drawn live from the exam bank.
- Interactive sims with sliders (wavelength, phase, angle).
- "Stopped here" marker feeding the review button and slide-over.
- End-of-lesson prompt (10 seconds): finished or partly, how it went, misconceptions, absences.
- One-tap homework set and push to Google Classroom.
- Exit ticket responses feeding topic confidence data.
- Before committing, check the classroom PC can run a browser full-screen and the network is reliable.

### 10. Data loop

- Topic confidence per class (green, amber, red) from test results.
- Spaced retrieval: do-nows pulled from topics taught 1 week, 3 weeks and 2 months ago.
- Exam question tagging by spec point and difficulty, shared by the test builder and homework (ties to the exam doc library).
- Misconception log feeding next lesson's starter.
- Spec coverage tracker per class, accounting for trips and slide-over.

### 11. Student view and admin

- Student profile page: behaviour, positives, test scores, homework completion, SEND, seating.
- Auto flags: 2 missed homeworks, a dropped grade band.
- Parents' evening pack and report comment drafting in my voice.
- Technician order sheet tied to slide-over so shifted practicals update the order.
- Calls home and email templates pre-filled from behaviour data, logging the call as a ticked shift.
- Cover lesson button using my cover template and seating plan.
- Homework chasing list.
- Sunday weekly summary email: upcoming week, tests due, marking pending, flagged students.

### 12. Separate tools to consider

- Retrieval quiz generator for the board.
- Reusable physics sim library.
- Required practical tracker.
- Revision timetable builder for Year 11 and 13.
- Tutoring module (bookings, notes, session plans).
- Self-marking quiz links feeding topic confidence.

## Definition of done for this session

- Year 13 lessons and new assessments are in the planner and Tests tab.
- All "Now" items are fixed or built, committed, and ticked in `PLAN.md`.
- `PLAN.md` lists what is done, what is next, and any assumptions made, so I can pick it up next week.
