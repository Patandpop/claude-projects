# Design: a memory map for every class (Lane B builds this)

Written 29 Oct 2026 by the Lane C design chat, from replica/design/grills/memory-map.md and specs/learning-loop.md. Lane B (Opus) builds it inside its own files (Code.gs, Planner.html, logic.js, the lesson builder and the home tools). Patryk's grill decisions win over anything here; where this document fills a gap the grill left, it says "chosen here".

Plain English throughout. Code names appear only where the builder has to go to that file.

---

## 1. What it does

For each class, a grid of coloured squares showing how well the class is predicted to remember each part of the specification right now. Green = remembered, amber = fading, red = due for retrieval, grey = not taught yet. The colour fades with time on its own (free spaced-repetition maths, no AI) and is pushed up or down by real evidence: the ABCD votes he records in lessons and the homework Forms results the planner already reads every morning. Marked tests join later.

The map suggests a Do Now for each lesson from the reddest taught spots; he ticks what he wants when he builds the lesson. It never inserts anything on its own and never re-teaches on its own; "re-teach" is a flag he reads.

Nothing resets at the end of a topic or year. In September each class's map carries forward to its next class code.

---

## 2. The one thing that does not exist yet: spec codes

Today nothing in the data carries a spec code. Lessons have a topic, a unit and a title. Exam-library questions have a subject, topic and subtopic (AQA) or topic, subtopic and sub-subtopic (OCR). MCQ votes carry a lesson key. Homework results carry a question key within a Form. So the first build job is a **spec index** and automatic tagging, as the grill decided (automatic, he fixes the odd mistake).

### 2.1 The spec index (a file in the repo, exported into planner-data.json)
`science-lesson/references/spec-points/` holds one JSON file per board and subject, written once by Claude at home from the public specifications (short titles and codes only, no copied spec prose):
- `aqa-biology.json`, `aqa-chemistry.json`, `aqa-physics.json` (GCSE, separate-science numbering, 4.x.x.x)
- `ocr-a-physics.json` (A level, 4.2.1 style)
- `ks3-science.json` (Years 7 to 9: there is no exam spec, so the school scheme's units are the "topics" and each scheme lesson's objective is the "sub-point", coded `KS3-<unit>.<n>`, chosen here)

Each entry: `code`, `title` (short), `topic` (the spec section it sits in, e.g. "4.1 Energy"), `unit` (the macrotopic name used in the planner's scheme, so the grid rows match the planner), `keywords` (a handful of matching words), `tier` (all, triple only, higher only), `library` (the exam-library subject/topic/subtopic names that belong to it).

**Combined science:** AQA Trilogy numbers chemistry 5.x and physics 6.x where the separate papers use 4.x. The index stores one code per point in separate-science numbering with the subject in the key ("Physics 4.1.1.2"); a Combined class simply treats `tier: triple` points as not on its course (grey, never suggested). Chosen here, so 10C2 and 10S2 share one Physics index.

### 2.2 Automatic tagging (no work for Patryk)
| What | How it gets its codes |
|---|---|
| A built lesson | Claude writes `spec: ["Physics 4.1.1.2", ...]` into lesson-content.json when it builds the lesson (a new optional field; SKILL.md gains one line). The catalogue export (`planner-catalogue.js`) reads it from the lesson folder's content file and puts it on the lesson record in planner-data.json. |
| An unbuilt or older lesson | The catalogue export matches the lesson's unit and title against the index's units and keywords (the same shared-words matching the textbook matcher and the Do Now picker already use) and records the best codes with `specGuess: true`. |
| A lesson's MCQs | Take the lesson's codes. Votes saved with `saveVote` therefore gain a `spec` column filled from the lesson record at save time (the phone already knows the lesson key). |
| An exam-library question | Its subject, topic and subtopic are looked up in the index's `library` names; the first match wins, `specGuess` when more than one. Stored once in `exam-library-index.json` by a home script so the lookup is instant. |
| A homework Form question | The quiz file (homework-X-DATE.json) already lists its library question ids; the daily results run joins question key to library id to spec code. Written questions with no library id (none today) would be skipped. |
| A marked test (later) | Each question on the paper maps to codes the same way; the photographed front-cover marks per question give one evidence row per code. |

**Fixing mistakes:** the Memory tab shows a small "guessed" mark on any square whose codes were matched rather than written; tapping it lets him move the lesson or question to another code. The fix is saved to a "Memory Fixes" tab and wins over the guess next time.

---

## 3. Where the data lives

All in the planner's own Google Sheet (today on the school account, later the personal one; this design does not care which). Class-level only: no pupil names anywhere in these tabs.

| Tab | Columns | What it is |
|---|---|---|
| **Memory Evidence** | id, when, cls, board, spec, source (vote, homework, test), pctRight, n (pupils or "votes"), weight, qRef (lesson key + question number, or library id), mainWrong, misconception, guess (true when the code was matched, not written) | One row per question result per class. Append only. |
| **Memory Scores** | cls, spec, stability, difficulty, lastEvidence, lastPct, reps, lapses, recall (the predicted % right now), state (untaught, unknown, green, amber, red), firstTaught, reteach (true or blank), updated | One row per class per sub-point. Rewritten by the daily update. |
| **Memory Fixes** | when, kind (lesson, question), ref, fromSpec, toSpec | His corrections. |
| **Memory Settings** | key, value | The one 75% setting (`dueBelow`), the learning rates per class (section 4.4), the lineage list (section 7). |

The spec index itself travels inside planner-data.json (from the repo), the way term dates and the scheme do, so the server never needs to read the repo.

**What goes home:** the Memory Scores snapshot (class, spec, recall, state) joins planner-state.json, which already carries the class-level Results tab home, so the home tools (Do Now picker, lesson builder) can read it. Evidence rows stay in the Sheet.

---

## 4. The fading score (free spaced-repetition maths, no AI)

Each square is a tiny memory model of the whole class, borrowed from Anki's modern scheduler (FSRS). Pupils never see Anki; this is planner maths only.

### 4.1 Two numbers per square
- **Stability (S)**, in days: how long until the class's predicted recall falls to 90%. Big S = well remembered.
- **Difficulty (D)**, 1 to 10: how hard this point is for this class. Starts at 5.

### 4.2 Predicted recall right now
```
recall = 1 / (1 + t / (9 × S))        t = days since the last evidence (or since first taught)
```
So recall is 90% at t = S, about 75% at t = 3S, 50% at t = 9S. The colour: green at or above 85%, amber between 75% and 85%, red below 75% (the 75% is the one setting; the green line is 10 points above it, chosen here).

### 4.3 What evidence does
One evidence row has a class % right (p) and a weight (homework 2, vote 1, test 3 later). The rule from the grill: p under 75% counts as a **miss**, p at or above 75% counts as **right**.

Before applying it, work out the recall the model predicted for that day (r).

- **Right:**
  `S = S × (1 + growth × (11 − D) × S^−0.21 × (e^(0.3 × (1 − r)) − 1) × 20)` with `growth` starting at 1.0. In words: stability grows most when the point was hard, when it was young, and when the model expected a miss (r low) and the class got it anyway. Difficulty eases a little: `D = D − 0.3`, floor 1.
- **Miss:** `S = max(1, S × 0.3)` (chosen here, close to FSRS's post-lapse shrink), `D = D + 1`, cap 10, `lapses + 1`, and the square gets the **re-teach** flag until the next right result.
- **Weight:** a vote applies half the change a homework result applies (do the update with the full change, then take the average of old and new S and D). A test (later) applies the full change plus a quarter again.
- **Several results on one day** for the same square (a lesson's three MCQs on one code): average their p first, then apply once.
- `lastEvidence` = that day, `lastPct` = p, `reps + 1`.

### 4.4 Starting values and learning from his classes
- **Just taught, no evidence:** state `unknown`, shown amber with "?", `S = 4`, `D = 5`, `firstTaught` = the lesson's date from the planner's saved weeks. So an untested point drifts to red after about 12 days, which is roughly when he would want it in a Do Now anyway (chosen here).
- **Learning from real answers** (the grill: start from Anki's standard rates, learn from the classes): once a month the daily update compares, per class, every evidence row's predicted recall r with whether the class actually got it (p ≥ 75%). If predictions were too optimistic (more misses than predicted), `growth` for that class drops by 10% (floor 0.5); too pessimistic, it rises 10% (cap 1.5). One number per class in Memory Settings. Plain counting, nothing fancy, reported in the log.

### 4.5 Worked example
9AS taught "Physics 4.3.2.1 latent heat" on 6 Oct: S = 4, amber "?". A lesson vote on 8 Oct: 60% right, r was 0.95. Miss: S = max(1, 4 × 0.3) = 1.2, D = 6, re-teach flag on; vote weight halves it: S = (4 + 1.2) / 2 = 2.6, D = 5.5. The square goes red within a week. Homework on 17 Oct: 80% right, r was about 0.5. Right: S grows a lot (hard point, young, expected to be missed) to about 12 days; D eases to 5.2; re-teach clears. Green for a fortnight, amber by early November, red by late November unless it is retrieved again.

---

## 5. What the grid shows

### 5.1 The Memory tab (PC planner, Planner.html sidebar after Assessment)
- **Class picker bar** across the top (one class at a time, his classes in timetable order).
- **Rows = units** in scheme order for that class (the macrotopics the planner already knows: "P1 Energy", "C2 Bonding"...). Each row is a line of squares, **one square per topic** (spec section, e.g. 4.1.1 Energy stores), in spec order. A square's colour is the **lowest** recall among its taught sub-points (so a weak sub-point surfaces); its label is the topic's short title; a small number shows how many sub-points are red. Untaught topics grey. A topic with any "guessed" code shows a small mark.
- **Tap a square:** a panel lists the sub-points with their recall %, state, last evidence date and source, the re-teach flag, and under each the questions behind it (text, % right, date) and the most-picked wrong answers with their misconception tags. Buttons: "Put on next lesson's Do Now" (adds to that lesson's suggestion list, pre-ticked), "Fix code" (section 2.2).
- **Header line:** "32 taught, 6 red, 9 amber, 17 green; last update 06:10".
- **A "?" legend** for untaught-or-unknown, and the 75% setting shown as text, changed in Memory Settings (one field, in the tab's settings cog).

### 5.2 On every lesson card (Week and Day views)
"Suggested Do Now": the top 10 reddest taught sub-points for that class as of today (red first, then amber, then by lowest recall; grey never), the top 6 ticked. He unticks or ticks. The ticked codes go into the build request and the build prompt ("Do Now spec: Physics 4.1.1.2, 4.1.2.1 ...") so the Do Now picker at home uses them. Only used when he builds or approves the lesson; nothing is ever inserted on its own.

### 5.3 Phone
On the day screen (Lane C's Today tab, when it exists) and until then on the phone page's class view: for each of today's classes, its 3 reddest taught spots as one line each ("Latent heat 48%, Specific heat 61%, Conduction 70%"). Nothing else.

---

## 6. Every server call and home tool

### 6.1 Server (Code.gs, Lane B)
| Call or job | What it does |
|---|---|
| `memoryUpdate_()` | The daily job (section 6.3). Pure functions in `planner/memory.js` (shared with tests, included as `Memory.html` the way logic.js is `Logic.html`) do the maths; Code.gs only reads and writes the tabs. |
| `memoryLoad(k, cls)` | The grid for one class: units, topics, sub-points with recall, state, flags, and the evidence behind each (text, %, date, wrong answers, misconceptions). |
| `memorySuggest(k, cls, date)` | The top-10 list for a lesson card, with the top 6 pre-ticked. Also folded into `loadAll` so the week view has it without extra trips. |
| `memoryFix(k, kind, ref, fromSpec, toSpec)` | Saves a correction and re-tags the affected evidence rows. |
| `memorySetting(k, key, value)` | The 75% line and the lineage list. |
| `saveVote` (exists) | Gains the `spec` codes of the lesson at save time (`lessonMcqs` already returns the lesson record; add its codes to the reply). |
| `dailyResults` (exists) | After refreshing the Results tab, calls `memoryUpdate_()`. Same 06:00 trigger, so nothing new to turn on and nothing after 7pm. |

### 6.2 Home (Lane B's tools)
| Tool | Change |
|---|---|
| `planner-catalogue.js` | Reads `spec` from each lesson's content file, guesses codes for the rest, exports the spec index and the per-lesson codes into planner-data.json. |
| `exam-library-index.json` builder (a small new script, `spec-tag-library.js`) | Tags every library question with codes from the index's `library` names. Run once, then whenever the library grows. |
| `do-now-pick.js` | Accepts `--spec "Physics 4.1.1.2,..."` (from the build request) and prefers questions tagged with those codes; the rest of its spacing rule stays. With no codes given it reads the Memory Scores snapshot from planner-state.json and uses the reddest taught spots for that class. |
| Lesson builder (`build.js` parts, Plan Mode) | `doNow.auto` passes the request's codes through; the Do Now slide's presenter notes already show `specPoints`, so the chosen codes land there. Every MCQ used in a lesson gets a misconception tag per wrong option at build time (exam MCQs included), as the grill decided; the MCQ check refuses an MCQ without them. |
| Library misconception tags | One home session tags every exam MCQ's wrong options once (`mcq-analysis.json` grows a `why` per option), then new ones as added. No paid API; it is Claude writing them in the session. |

### 6.3 The daily update, step by step (06:00, after the results refresh)
1. Load the spec index, the class list and the saved weeks (what was taught when).
2. **New evidence:** every MCQ Votes row and every Results tab question not yet in Memory Evidence (by id) becomes evidence rows: one per spec code the question carries. Votes: p = % right, n = "votes", weight 1. Homework: p = the question's % of marks, n = pupils done, weight 2. Rows with no code (an unbuilt lesson's "Question 1") are skipped and counted in the log.
3. **First taught:** for every lesson in a saved week on or before today, each of its codes gets a Memory Scores row for that class if none exists (state `unknown`, S = 4, D = 5, firstTaught = the lesson date). Codes of lessons not yet taught stay absent (grey).
4. **Apply evidence** in date order per class and code (section 4.3), then **recompute recall** for every row as of today and set state and the re-teach flag.
5. **Monthly learning** (first run of each month): adjust `growth` per class (section 4.4).
6. **Lineage** (first run on or after 1 September): copy each old class code's rows to its new code (section 7).
7. Write Memory Scores, append the log line ("9AS: 14 new evidence rows, 3 codes skipped, 6 red"), and let `pushState_` send the snapshot home.

---

## 7. End of topic and end of year
Nothing resets. Old topics keep fading and keep being suggested. In September the `lineage` setting (a list like `10S2 > 11S2, 9AS > 10S2`) carries each class's rows forward; the new year's planner-data (new class codes) is imported first, then the first daily run after 1 September does the copy once and marks it done in Memory Settings. Classes that split or merge are his call: the lineage list is edited by hand in the tab's settings.

---

## 8. Tests (later, not the first build)
Not built now; designed so the first build does not block it. Photographs of the test front covers (where he writes his per-question mark summary) go into a school-account Drive folder; the planner reads the numbers with Google Drive's free text reading, shows a grid of guesses to fix before saving, and writes one evidence row per question code with source `test`, weight 3. Photos stay on the school account and are never synced home; only class % per question becomes evidence.

---

## 9. The order to build it in
1. **Spec index files** and the tagging rules (section 2), with a home test that every scheme lesson for his ten classes gets at least one code and that guessed codes are marked.
2. **`planner/memory.js`** with the maths and the daily-update steps as pure functions, fully tested (section 10) before any Sheet code.
3. **Evidence and scores tabs** and `memoryUpdate_()` hooked onto the existing 06:00 run; `saveVote` records codes.
4. **Memory tab** in the planner (mock-up first, his pick), then the lesson-card suggestion list and the build-request field.
5. **Home side:** catalogue export, library tagging, Do Now picker codes, builder notes (Plan Mode for the builder parts).
6. **Phone line** (3 reddest spots for today's classes).
7. **Fix code** panel and the monthly learning rule.
8. **Lineage** before next September.
9. Tests from photos: a separate design and build later.

---

## 10. How it is tested
- `planner/tests/memory.test.js` (new, in the lane's pre-commit list): recall formula at t = S, 3S, 9S; right and miss updates against the worked example in 4.5; weights (vote half, homework full); several results in one day averaged; thresholds at exactly 75% and 85%; untaught stays grey and is never suggested; `unknown` drifts to red in about 12 days; suggestion ordering (red before amber, lowest recall first, top 6 ticked, grey never); lineage copy once only; monthly growth adjustment moves the right way and respects its floor and cap.
- Tagging tests: a sample of lessons and library questions with expected codes; a guessed code is marked; a Memory Fix wins over a guess.
- `planner/tests/server.test.js`: the daily update over a fake Sheet with votes, results and saved weeks; evidence appended once (re-running adds nothing); scores rewritten; the snapshot reaches planner-state.json; no pupil name in any memory tab (the learning loop's no-names test extended to the new tabs).
- Headless planner screenshot (make-preview.js) of the Memory tab for the mock-up round.
- `npm test` at the root still green; builder changes under Plan Mode with their fixtures.

---

## 11. Risks and what to do about them
| Risk | What to do |
|---|---|
| Spec codes are wrong or missing for many lessons | Guessed codes are marked and fixable; the home test lists every lesson with no code so Claude writes them; the grid still works with gaps (grey). |
| Votes are rough and could drag squares red unfairly | Votes carry half weight; the 75% line has slack by his choice; a homework result soon corrects it. |
| Combined and triple numbering mix-ups | One index in separate numbering with a `tier` flag; Combined classes never see triple-only points. |
| KS3 has no spec | The scheme's units and lesson objectives stand in; coded consistently so Year 9 to 10 carry-forward still finds Physics 4.x points by keyword where the content overlaps (a `successor` field on KS3 entries, filled where obvious). |
| The daily job grows slow (thousands of evidence rows) | Evidence is appended, scores are recomputed only for classes with new evidence or a day boundary; the update reads each tab once. A timing test with two years of fake data. |
| Pupil data | Only class percentages ever enter these tabs; the no-names test covers them; photos (later) never leave the school account. |
| Over-suggesting the same spots | The suggestion list skips codes used in that class's last two Do Nows (lesson-log already records Do Now use) unless still red. |
| Nothing after 7pm | Only the 06:00 run touches the data; his taps during the day only append evidence. |
