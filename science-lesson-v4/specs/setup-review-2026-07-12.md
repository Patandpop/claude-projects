# Full Setup Review, 12 July 2026

A top-to-bottom review of the whole science-lesson setup, written for Patryk in plain English. Nothing in this document has been changed or built yet. Every item is a proposal waiting for a yes or no. The skill file was not touched (another project is working on it), so anything that needs the skill file is clearly marked BLOCKED until that project finishes.

How to read this: sections A to E explain what was found. Section F is the menu, one table, everything ranked. If you only read one section, read F.

---

## A. Health check: what is solid, what is at risk

### Solid (keep doing these)

- **The safety net around the builder works.** The builder (the big program that turns lesson content into PowerPoint and worksheets) is guarded by an automatic test that builds five sample lessons and checks for every past bug pattern. Any edit to the builder re-runs the test automatically. This is why recent sessions have not re-broken old fixes.
- **The changelog discipline is good.** Every change has a plain-English entry and a "how to undo it" line.
- **The session-start banner, auto-packaging at session end, and the plan-before-build habit** all work as designed.

### At risk (each line ends with the "so what")

1. **Seven important new files are not saved into version control yet.** These include the second-opinion advisor wiring, the exam question library test, the Silence Debt Timer, and two design documents. So what: one wrong cleanup command and they are gone with no way back. This is the single most urgent housekeeping item, and it costs five minutes.
2. **Silent failures inside the builder.** If an image fails to embed, or the handwriting font fails to load, or a textbook reference lookup fails, the build carries on and produces a slightly worse file with no warning. You would only notice standing in front of the class. So what: these are exactly the "it built fine but something is off" bugs that keep recurring.
3. **The content quality report warns but never stops a build.** A lesson with 5 Do Now questions instead of 6, or missing review questions, still builds. So what: the July audit found real lessons that shipped with these gaps.
4. **The packaging list lives in three places** (the PowerShell packer, the JavaScript packer, and the session-end hook) and must be kept identical by hand. So what: when they drift, a file silently stops being included in the skill you upload to school.
5. **Old duplicate copies of the skill sit in folders next to this project** (two older science-lesson folders, an orphaned upload script, a stale prompt file). So what: a future session could read or edit the wrong copy. This has happened before with the school sandbox.
6. **The project folder is cluttered.** Generated PowerPoints, Word files, teacher documents, test data, candidate images, and one leftover Microsoft Office lock file all sit in the root next to the real source files. So what: harder to tell inputs from outputs, and easier for a session to pick up the wrong file.
7. **The helper scripts are barely tested.** The daily brief, order sheet, and weekly context scripts total about 1,500 lines with only light test coverage, compared with the heavily guarded builder. So what: these are the scripts that will run unattended in September; a quiet break there means a wrong brief on a school morning.

---

## B. Cut your input (ranked by time saved)

1. **Build the Do Now question bank (the biggest single win).** Right now, six Do Now questions are written fresh for every lesson. The plan already exists in the skill: a per-class bank of tagged questions, with each lesson pulling a mix that leans on older topics (this is spaced retrieval, the best-evidenced technique in the whole of education research, see section E). Once the bank exists, the school session stops authoring Do Now questions at all: it just picks. This cuts your input, cuts tokens, and improves the teaching in one move. It was deliberately deferred until the lesson log had real data and the September classes were known; the lesson log now has data, so the remaining wait is only the class list. The bank engine and the tagging scheme can be built and tested NOW on this year's classes, then re-pointed in September. BLOCKED only for the final skill-file wiring, not for the build.
2. **Auto-map the macrotopic.** Today you must type the Drive folder name exactly (for example "P4 Earth in Space", not "Space") or the upload fails with only a "did you mean" hint. Proposal: the uploader reads the real folder names from Drive and accepts any close match automatically, keeping the loud warning only for genuinely ambiguous cases. One evening of work, removes a per-lesson typing trap forever.
3. **Per-class lesson defaults.** Every lesson starts with the same five questions (class, topic, title, lesson type, worksheet style). Most answers are predictable per class: 8XP always gets the word bank, 12D always gets homework. Proposal: a small defaults file per class so the school session only asks about what actually varies (topic and title). BLOCKED (needs a skill-file change) but the defaults file can be drafted now.
4. **Let the lesson log answer "what did we do last lesson".** You currently tell the school session the prior topic and Do Now by hand. The upload log already records every built lesson per class. Proposal: a tiny "last lesson" summary file the school session can read, generated automatically at build time. Partially BLOCKED (the reading side needs the skill file; the writing side does not).
5. **Trim the weekly context questions.** The weekly capture asks everything every week. Proposal: it pre-fills from last week and only asks "anything different this week?" This is a small comfort improvement, lower priority.

---

## C. Cut bugs (ranked by risk removed)

1. **Make the silent failures loud.** Add the image-embed, font-load, and textbook-lookup failures to the content quality report so a degraded build says so in big letters. Small change, directly targets the most annoying recurring bug family.
2. **Per-slide image check in the test harness.** The automatic test currently checks "at least one image somewhere in the deck". Tighten it to "every slide that promised an image actually has one". Catches the exact failure mode of Bug 26 and Bug 58 before it ships.
3. **Commit the seven untracked files.** Five minutes, removes the biggest data-loss risk in the project.
4. **One packaging list instead of three.** Move the file list into a single shared list that the PowerShell packer, the JavaScript packer, and the session-end hook all read. Drift becomes impossible.
5. **Smoke tests for the September scripts.** One small test each for the daily brief, order sheet, and context capture: feed in a known week, check the output mentions the right classes and days. Cheap insurance before these run unattended.
6. **Decide what "warning" means.** Option: the content quality report gets a strict mode where missing Drive information or a wrong question count stops the build instead of warning. Worth discussing; a hard stop at school could be annoying if you are in a hurry, so this one is a genuine judgement call for you.

---

## D. Cut tokens (all BLOCKED on the skill file; prepared here as a ready-to-go spec)

Numbers first: every school session currently loads about 1,500 lines of instructions (the skill file plus the two reference documents), and the same rules appear in two or three places. On top of that, about a quarter of the skill file (roughly 207 lines) is the old bug history: fix notes, dates, and commit references that help nobody writing a lesson.

Proposals, in order of payoff:

1. **Move the bug history out of the skill file** into the home backlog file where it belongs. Cuts about 26 percent of the skill file in one move with zero effect on lesson quality. The school session never needs to know how Bug 41 was fixed.
2. **One home for every rule.** Hard rules, the content schema, the maths notation rules, and the slide-sequence table each currently live in two or three documents. Pick one home for each (schema in the skill file, slide detail in the slide options document) and replace the copies with one-line pointers. Estimated combined saving: 35 to 40 percent of the per-session instruction load, with the bonus that a rule can no longer be updated in one place and missed in another (this has caused real inconsistencies before).
3. **Slim the per-lesson content.** Each lesson is 250 to 350 lines of generated content. Two savings without losing anything: stop requiring the review section to restate every Apply question word for word (the builder could copy them itself, since review questions mirror Apply questions by rule), and default the rarely-changed fields instead of writing them every time. Estimated 20 to 30 percent off every single lesson generated at school.
4. **The Do Now bank (again).** Once questions come from the bank, the school session neither reads examples of good Do Now questions nor writes six new ones. Every lesson gets cheaper.

When the other project finishes with the skill file, items 1 and 2 here are a single tidy session: no behaviour changes, just moving text, verified by re-reading and re-packaging.

---

## E. New classroom tools (research-backed shortlist)

### What the research says, in short

- **Retrieval practice, spaced out over time, is the single best-evidenced classroom technique.** Low-stakes quizzing on older material strengthens memory more than re-teaching, and it also reduces exam anxiety. This is the engine behind the Do Now, and behind tools like Carousel Learning and Adam Boxer's Retrieval Roulette (a spreadsheet that randomly mixes questions from past topics with current ones).
- **Checking for understanding beats asking "any questions?"** The strong versions are: mini whiteboards (every student answers, you see all of it at once), hinge questions (one carefully chosen multiple-choice question that decides whether the lesson moves on or re-teaches), and cold call (random selection so everyone stays ready, done warmly).
- **Tight routines and visible time pressure work.** "Teach Like a Champion" calls it brightening lines: clean starts, clean finishes, visible countdowns. Surveys of ClassroomScreen (the most popular teacher display toolkit) found the countdown timer is the most used widget of all, used several times per lesson by most teachers.
- **Noise self-regulation via visual feedback works** without the teacher saying a word: a meter on the screen and students adjust themselves. This is the same mechanic family as your Silence Debt Timer.
- **On workload, the UK evidence (the government workload toolkit and the FLASH marking study) points one way:** stop writing individual comments, use whole-class feedback sheets and codes. Teachers report class marking dropping from 2 to 3 hours to under one hour.
- **For classrooms without student devices** (your situation), the app world offers little: Plickers needs printed cards and phone scanning, and the rest (Blooket, Quizizz, Kahoot) need a device per pupil. A projector-only tool has to put the interaction in the room, not on screens. That is exactly the niche the Silence Debt Timer already occupies, and it is underserved.

### The shortlist (all follow the Silence Debt Timer pattern: one self-contained HTML file, works offline, no logins, no ads, no pupil data leaving the room, house navy and gold)

**Tool 1: Do Now board.** Shows the six Do Now questions full screen with a countdown, then flips to answers on one key press. Feeds from the same question bank as proposal B1, so it also works standalone on days when the deck is not ready. Clean start, clean finish, zero faff. Effort: small once the bank exists; medium if built first with a hand-made question file.

**Tool 2: Cold-call picker.** Random name picker loaded with your real class lists (the class data file already exists in the project). No repeats until everyone has been called, a "park this student today" option, and big friendly display. The popular web wheels are ad-covered and need typing names in every time. Effort: small.

**Tool 3: Hinge-question board.** Puts one multiple-choice question full screen (it can pull from the MCQs your lessons already contain), students vote with fingers or corners of the room, you tap the four counts in, and it shows the split with a clear "move on" or "re-teach" suggestion based on your chosen threshold. This is the strongest teaching win on the list because it turns a research darling into a ten-second routine. Effort: small to medium.

**Tool 4: Routine timer strip.** A lesson pacing bar: your standard lesson phases (Do Now 6 minutes, teach, practice, review) pre-loaded, one key to advance, colour change and hard stop at each boundary. Pairs naturally with the Silence Debt Timer, and could live in the same file as a second tab. Effort: small.

**Tool 5: Noise meter.** Uses the laptop microphone to show a live volume traffic light with your thresholds. Option worth discussing: connect it to the Silence Debt Timer so debt accrues automatically while the noise is over the line, which would make the debt objective rather than teacher-triggered. Effort: medium (microphone permissions and calibration need care).

**Tool 6: Whole-class feedback sheet builder.** A form you fill in while flicking through books (strengths, common errors, three re-teach points, next-lesson tasks), which prints as a tidy one-page sheet in house style, one per class set. The evidence on this one is about your evenings, not the pupils: it is the marking-time cut. Could later pre-fill from the lesson's Apply questions. Effort: medium.

Not proposed: anything needing pupil devices or accounts (wrong fit for the room), Plickers-style camera scanning (fragile, and the printed cards are the annoying part), and a seating plan generator (better handled inside the September behaviour tracker where the class data will live).

### Sources

Retrieval and spacing: [Nature Reviews Psychology on spacing and retrieval](https://www.nature.com/articles/s44159-022-00089-1), [Evidence Based Education on combining them](https://evidencebased.education/resource/retrieval-and-spaced-practice-study-strategies-that-must-be-combined/), [EEF-commissioned cognitive science review](https://potentialplusuk.org/wp-content/uploads/2022/02/Cognitive_Science_in_the_classroom_-_Evidence_and_practice_.pdf), [Structural Learning on KS3-4 retrieval](https://www.structural-learning.com/post/retrieval-practice-secondary). Checking for understanding: [Durrington Research School](https://researchschool.org.uk/durrington/news/checking-or-really-checking), [InnerDrive on cold call vs whiteboards](https://www.innerdrive.co.uk/blog/cold-calling-vs-think-pair-share-whiteboards/), [RSC Education questioning techniques](https://edu.rsc.org/ideas/10-effective-questioning-techniques/4011025.article), [mini whiteboards handout](https://mrthorntonteach.com/wp-content/uploads/2022/05/mini-whiteboards-handout.pdf). Routines and timers: [Teach Like a Champion on brightening lines](https://teachlikeachampion.org/blog/brightening-lines-video/), [ClassroomScreen widgets](https://classroomscreen.com/widgets), [NearHub survey of screen tools](https://www.nearhub.us/blog/top-classroom-screen-tools). Workload and feedback: [DfE workload reduction toolkit, feedback and marking](https://improve-workload-and-wellbeing-for-school-staff.education.gov.uk/workload-reduction-toolkit/address-workload-issues/feedback-and-marking/), [FLASH marking evaluation](https://www.tandfonline.com/doi/full/10.1080/03054985.2023.2258779), [marking crib sheet](https://mrthorntonteach.com/2016/04/08/marking-crib-sheet/). Question banks: [Carousel Learning](https://www.carousel-learning.com/), [Retrieval Roulette](https://achemicalorthodoxy.co.uk/2018/08/18/retrieval-roulettes/), [SLOP and how to write it](https://educationblog.oup.com/secondary/science/why-you-should-add-more-slop-to-your-science-lessons-and-how-to-do-it). Quiz tools without devices: [ClassPoint's Plickers comparison](https://www.classpoint.io/blog/best-alternatives-to-plickers-2024). Exit tickets: [Third Space Learning guide](https://thirdspacelearning.com/blog/exit-ticket/).

---

## F. The menu

Effort key: S = an evening or less, M = a weekend session, L = multiple sessions. "Skill file?" = blocked until the other project finishes with it.

| # | Proposal | Helps with | Payoff | Effort | Skill file? |
|---|---|---|---|---|---|
| 1 | Commit the seven unsaved files | Bugs/safety | Removes the biggest data-loss risk | S | No |
| 2 | Make silent image/font failures loud | Bugs | Kills the worst recurring bug family | S | No |
| 3 | Do Now question bank engine (build and test now, wire in September) | Input + tokens + teaching | Biggest single win in the project | L | Partly |
| 4 | Macrotopic auto-map for Drive uploads | Input | Removes a per-lesson typing trap | S | No |
| 5 | Per-slide image check in the test harness | Bugs | Catches Bug 26/58 class before shipping | S | No |
| 6 | Move bug history out of the skill file | Tokens | 26 percent off the skill file, zero risk | S | YES |
| 7 | De-duplicate the three instruction documents | Tokens + consistency | 35 to 40 percent off per-session load | M | YES |
| 8 | Slim the per-lesson content (auto-copy review, defaults) | Tokens | 20 to 30 percent off every lesson | M | YES |
| 9 | One shared packaging list | Bugs | Ends the three-list drift risk | S | No |
| 10 | Tool: Hinge-question board | Teaching | Best-evidence routine, ten seconds to use | S/M | No |
| 11 | Tool: Cold-call picker | Teaching | Ad-free, loads your real classes | S | No |
| 12 | Tool: Do Now board | Teaching + input | Pairs with #3, works standalone too | S | No |
| 13 | Tool: Routine timer strip | Teaching | Most-used widget category in surveys | S | No |
| 14 | Tool: Noise meter (optionally feeding the Silence Debt Timer) | Behaviour | Objective, hands-free debt | M | No |
| 15 | Tool: Whole-class feedback sheet builder | Workload | Marking from 2 to 3 hours toward 1 | M | No |
| 16 | Per-class lesson defaults file | Input | Clarify-five shrinks to two | S | YES |
| 17 | "Last lesson" summary for the school session | Input | Stops the verbal recap each lesson | M | Partly |
| 18 | Smoke tests for September scripts | Bugs | Insurance before unattended runs | M | No |
| 19 | Tidy the project root, delete stale sibling copies | Safety | Wrong-file accidents become unlikely | S | No |
| 20 | Strict mode for the content quality report | Bugs | Gaps cannot ship (needs your judgement) | S | No |

Suggested first bite, all doable before the skill file unlocks: 1, 2, 4, 5, 9 (one evening of safety work), then pick one tool from 10 to 13 to enjoy. Items 6, 7, 8, 16 queue up as one tidy token-cutting session the moment the other project finishes.
