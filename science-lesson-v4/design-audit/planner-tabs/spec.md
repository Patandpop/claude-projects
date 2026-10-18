# Planner: Homework and Assessment tabs (design, not built)

Status: for Patryk to approve. Nothing in the planner has changed. Mock-up: `mockup.html` in this folder (open it in a browser; it is fake data and saves nothing).

## The split in one line each

- **Homework** = setting work for classes and following it until it is marked.
- **Assessment** = tests: what is coming up, building practice papers, checking their questions, and (later) results.

Today the planner has "Homework (check, then make)" and "Tests (and exam practice)". Checking exam practice questions moves to Assessment, because it is about the paper, not about setting it.

---

## 1. Homework tab

The page is four folding sections. Only "Set new homework" is open when you arrive, so you never scroll through everything.

### 1.1 Status strip (top)
Counts per status across all classes: Drafted, Scheduled, Live, Due, Marked. Click one to show only those.
- Why: one glance tells you what needs you (Drafted = needs publishing, Due = needs looking at).
- Server: `homeworkStatus()` (below).

### 1.2 Set new homework (four steps, one screen)
1. **Kind**: Exam practice quiz (Google Form, self-marking) / Seneca or another link / The school's key homework / Revise for a test / Something else.
2. **Classes**: tick one or several.
3. **Per class** (one folding row each): Core or Challenge, set on (defaults to that class's next lesson), due date (worked out, can be changed), always 8:00, and send: "Draft only, I publish it" or "Schedule it" (date and time).
4. **Message to pupils**: a plain fixed template per kind, filled in per class, editable. No AI wording. Example (Seneca): "Your homework this week is on Seneca: Energy stores. Click the link and finish it by Monday 2 November, 8am. Message me on Google Classroom if you need any help."

Button: **Make the drafts**. Each class gets its own Classroom draft (or scheduled post). One homework per class: never per pupil.

- Why: one place to set work for several classes at once with the right due date each, instead of typing it per class.
- No printing anywhere on this tab. Exam practice is the Form only.

**Due date rule (as Patryk set it):** start from the day it is set (the class's next lesson). Pick that class's lesson closest to 7 days later, as long as it is 4 to 9 days later. Due that day at 8:00. If no lesson falls in 4 to 9 days (half term, INSET), it is due at the first lesson back, and the page says why ("half term").
- Server: none. It is worked out on the page from the planner's own weeks and term dates (one new helper in logic.js, `dueFor(class, setDay)`, with tests in test-logic.js).

**Kinds, what each makes:**

| Kind | What the planner makes | Notes |
|---|---|---|
| Exam practice quiz | Google Form (self-marking, as now) + Classroom draft | Questions checked first on Assessment. |
| Seneca or other link | Classroom draft with the message and his link | He pastes the Seneca link; it can be blank and added later in Classroom. |
| Key homework | Classroom draft with the school's file attached | Needs to know where key homework lives (question 3). |
| Revise for a test | Classroom draft: test date, PLC attached, optional Seneca link | Suggested automatically 2 weeks before each test (1.4). |
| Something else | Classroom draft with his title and text | |

- Server: `setHomework(items)`: for each class, makes the Form if needed (existing `buildQuiz_`), then a Classroom item with `state: DRAFT`, due date + 8:00, and `scheduledTime` when he chose to schedule. Writes one row per class item to a new **Homework** sheet tab (class, kind, title, form id, Classroom id, set on, due, tier, status). It only creates, like `makeHomework` does now.

### 1.3 Set work, by class
One folding row per class: class colour, how many items, the next due date, status pills. Open it to see each item: kind, Core/Challenge, due, a five-step status bar, how many pupils have handed in, and buttons (Open Form, Open in Classroom, Copy message, Mark as marked).

**Statuses:**
- **Drafted**: in Classroom as a draft; you still publish it.
- **Scheduled**: Classroom will post it at the time shown.
- **Live**: posted, not due yet.
- **Due**: due date reached; responses shown (for example 19 of 27).
- **Marked**: Form quizzes count as marked once due and responses are in (they self-mark). Key homework and other paper-free work: you tick "Marked".

- Why: answers "what has 10C2 got and has it come in?" without opening Classroom.
- Server: `homeworkStatus()`: reads the Homework sheet tab, asks Classroom each item's state (draft, scheduled, published) and turned-in count, and counts Form responses (`FormApp.openById(id).getResponses().length`). All free (Apps Script services). `markHomework(id)` saves the tick.
- Later (agreed separately): a "Mark 10C2 homework" task appears on the due day (see 3.3).

### 1.4 Coming up automatically (folded)
For every test in the planner: "revision homework suggested, set by [2 weeks before]". One click fills "Set new homework" with Revise for a test, that class and that test.
- Server: none (tests are already in the planner weeks).

---

## 2. Assessment tab

Four folding sections.

### 2.1 Tests coming up (open)
From the planner's own test lessons (the real school tests), next 8 weeks. Each row: class, topic, date, then:
- **Paper**: test found / mark scheme found (or "in the test", which is normal) / PLC found, in `Admin\Assessment\Year X\Subject\Topic`.
- **Revision homework**: set, scheduled, or "not set (suggested by date)". Button sends you to Homework, filled in.
- **Review lesson**: "after marking" (you say when), or a link to the built `Lesson [n+1] - [Topic] Review` folder.
- Buttons: Practice paper before it (fills the builder), Revision homework.
- Why: the test date, the paper, the revision and the review are one chain; today they are in four places.
- Server: test dates: none (planner weeks). Paper check: `assessmentFiles(cls, unit)` reads the Admin\Assessment folder (read only). That folder is on the personal Drive, so the mailbox needs a read-only `find` request (Mailbox.gs). Review folder: already in the planner data (the lesson's folder link).

### 2.2 Test builder (open)
- **Class**, then **what it covers**: Whole chapter / Part of a chapter (tick sub-topics) / Everything taught so far (from the planner's taught record) / Topics I choose.
- **Spread**: even over the sub-topics, or more weight on recent lessons.
- **Sliders**: multiple choice questions (0 to 20, 1 mark each) and length (switch between marks and minutes).
- **Paper**: Core, Challenge, or both (12C and 13D: the real OCR A layout).
- **Live summary**: "12 MCQ + 13 written = 25 marks, about 25 minutes", plus a bar per sub-topic showing its share, and a warning when there are more sub-topics than questions.
- Timing guide: about 1 minute per mark for Years 7 to 11, about 1.2 for A level.
- Button: **Ask Claude to make it**. Claude builds it at home from the exam library (verbatim questions only), it arrives in 2.3 to check, then goes to Homework as a quiz.
- Why: he wants control of size and coverage without typing flags, and "everything so far, spread out" is the spaced practice he wants.
- Server: the existing `sendRequest` with new fields; at home `test-paper.js` needs `--subtopics` and `--spread recent` (it already has `--taught`, `--topics`, `--minutes`, `--mcq`, `--tier`). "Taught so far" is worked out on the page from the planner records and sent as a list of lessons.

### 2.3 Check exam practice questions (folded)
What Homework shows today: each quiz's questions, answers and mark scheme, then **Looks right: make the Form**. Questions that need drawing are flagged as left out of the Form (as now).
- Server: existing `homeworkList()` and `makeHomework()`. `makeHomework` stops making the Classroom draft itself; the draft is made from Homework (1.2) so the due date and message follow the rules above.

### 2.4 Results and misconceptions (folded, later)
For a finished quiz: % correct per question, the 3 most-missed questions with the wrong answer most picked, and "put on the next lesson's Do Now" tick.
- Server: `formResults(formId)`: reads Form responses (free, Apps Script). Matches the saved idea from 15 Oct.

---

## 3. Small items to agree

### 3.1 Rename lessons you added
A pencil next to lessons you added yourself (the "4a" ones), never next to scheme lessons. Click, type, Enter.
- Changes the name in the planner only. **The Drive folder keeps its old name**, because the standing rule is: never rename anything on Drive.
- Server: `renameAdded(cls, key, title)` updates that row in the Added sheet tab.

### 3.2 Lesson extras checkbox
A second row of ticks in the lesson panel's checklist: Video clip, Simulation, Demo, Practical, Memory phrase, Real data. A few are pre-ticked as suggestions (for example Practical when the lesson has kit, Memory phrase on the first lesson of a topic), marked "suggested". Ticks go to Claude with the build request, like the checklist does now.
- Server: none (saved with the week, like the checklist).

### 3.3 Task checklist: where it lives
Recommendation: the Week view's "All day" row (tasks are already added there), with a fixed task list to pick from, and automatic tasks: "Mark 10C2 homework" on its due day, "Mark 10C2 tests" the day after a test. The Day view lists that day's tasks with ticks.
- Alternative: its own "Tasks" tab. Not recommended: another place to look.
- Server: none new for the planner (saved with the week). Fixed list: needs agreeing.

---

## New server pieces, all together (Apps Script, all free)

| Function | Does | Writes |
|---|---|---|
| `setHomework(items)` | Forms (if any) + Classroom drafts or scheduled posts | Classroom drafts, Forms in "Planner homework quizzes", Homework sheet tab |
| `homeworkStatus()` | Status, hand-ins, Form responses per item | nothing |
| `markHomework(id)` | Ticks an item as marked | Homework sheet tab |
| `assessmentFiles(cls, unit)` | Finds test / mark scheme / PLC | nothing (read only; via mailbox `find`) |
| `formResults(formId)` | % correct per question (later) | nothing |
| `renameAdded(cls, key, title)` | New name for an added lesson | Added sheet tab |
| logic.js `dueFor()` | Due date rule | nothing |

No paid APIs. Drive writes stay where they are now (Forms folder). Classroom items are drafts unless you choose "Schedule it" for that item.

---

## Open questions for Patryk

1. **Scheduled posts**: is it fine that "Schedule it" makes Classroom post by itself at the time you set? (Up to now everything stays a draft you publish.) Default would stay "Draft only".
2. **Exam practice paper**: Homework is now "no printing". Drop the printed Core/Challenge paper for exam practice and keep only the Form? Or keep the paper in Drive for your own reference without printing it?
3. **Key homework**: where do the school's key homework files live on Drive, and how do pupils hand them in (Classroom upload, on paper, a Form)?
4. **Half term**: if 7 days lands in a holiday, due first lesson back (as designed), or do you not set homework the lesson before a holiday?
5. **Core/Challenge for KS3 and A level**: should 7MLA, 8AG, 8XP get Core/Challenge too, or one version? 12C and 13D: always one paper?
6. **Marked**: is "due date passed and responses in" good enough to call a Form quiz marked, or do you want a minimum (for example 80% handed in)?
7. **Message wording**: are the five templates in the mock-up close? Anything you always say (for example "show your working")?
8. **Test builder**: should it ever make a paper for in class, or only exam practice homework (the current rule)?
9. **Lesson extras**: the list (video, sim, demo, practical, memory phrase, real data): anything to add or drop? Which should be suggested automatically?
10. **Tasks**: All day row (recommended) or its own tab? And what goes on the fixed task list?

## To fold in from the homework research

The research summary (`design-audit/homework-replica/00-summary.md`) was not written yet when this was designed. When it lands, check:
- Which features the research found that this design lacks (for example reminders before the due date, late hand-ins, a "missing" list per class).
- Status names and the order of steps other tools use, in case they are clearer than Drafted/Scheduled/Live/Due/Marked.
- Whether the research found any Classroom or Forms limits (scheduling, due times, response counts) that change the server table.
- Message templates or wording advice it recommends.
