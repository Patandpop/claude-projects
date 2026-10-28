# Fable work plan (written 28 Oct 2026)

Everything Patryk wants built, in one order, for a Fable session to work through on the home PC.
Sources: the four audits of 28 Oct (copies in `docs/audits-2026-10-28/`), `replica/design/habits-v2-decisions.md`, and the memory notes.

---

## Part A: for Patryk (plain English)

### What Fable will do
Work down the list below, one job at a time. For each job it:
1. reads what it needs;
2. makes the change;
3. runs every check;
4. saves it in the project history;
5. writes one plain line in `FABLE-WORKLOG.md` saying what changed and what you need to do, if anything.

Anything that needs your eyes (a look to pick, a decision, a paste into Apps Script) goes on a "Waiting on you" list at the top of that log. Fable then moves on to the next job instead of stopping.

### The order, and why
1. **Phase 0: safety first.** A save point of all current work, the planner's checks added to the main test, the "never repeat a question" record protected, and a size alarm for the paste files.
2. **Phase 1: things that can lose or spoil your data.** Lesson ticks wiped by an old tab, homework labels clashing, saves that fail silently, double-counted behaviour taps, wrong term dates next September, A-level lessons missing their phone MCQs, and the Ulhu streak and shop bugs.
3. **Phase 2: the learning loop and daily time-savers.** This follows your north star: pupils remember the spec, and you don't work evenings. It covers Do Nows on topic, votes and homework results flowing into the next lesson, the support sheet fixes, the order sheet as an email draft, Friday messages drafted, and the new silent-work tap timer.
4. **Phase 3: Ulhu's new screens.** High Vespers first (fully picked), then the glass, the quest scroll, the multipliers on show, and Vespers once you've picked its way in.
5. **Phase 4: this half-term.** The CGP book scanner (needs you there to log in), follow-up tasks, the 6-mark slide, worksheet layout, the "Today" panel, and speed fixes.
6. **Phase 5: this year.** The bigger tools: lesson launcher, print the week, Classroom drafts, eyes-free behaviour entry, the stall and dice game, the rooms.

### What it needs from you
- **Before it starts:** say yes to the save point (step 0.1). It saves all the work that isn't in the project history yet.
- **5-minute checks only you can do:**
  1. In Apps Script, go to Project Settings and check the time zone says London.
  2. Find out whether the school lets you use Google's upload tool ("clasp") on your account. If yes, pasting could stop altogether.
  3. Give Fable the technicians' email addresses for the order sheet draft.
- **Decisions, whenever you have a moment** (Fable skips these jobs until you answer):
  - word bank for 9AS and 9XS;
  - whether review lessons keep the answers sheet or move answers to the board;
  - the 3 open questions on the 6-mark slide;
  - whether the Vespers bonus also boosts blessings, bosses and the weekly review;
  - whether fainting should hit less hard;
  - OK for the new Engage rule;
  - a colour for the board answer boxes.
- **Pasting:** Fable puts new paste files in the desktop folder "Planner paste files". You paste them into Apps Script and deploy a new version, as now.
- **Your picks** on mock-up pages it makes (anything visual gets a mock-up first, as always).

### How to start it
1. Open a new terminal in `C:\Users\magda\claude-projects\science-lesson-v4` and start Claude Code.
2. Type `/model` and choose Fable.
3. Paste the message in Part C.
4. Leave it running. Check `FABLE-WORKLOG.md` when you like.

**Two things to know:**
- Both sessions share your usage limit. This design session got cut off overnight, so it will stay quiet unless you ask it for a mock-up round.
- While Fable works, this design session only touches the mock-ups and the design notes, never the app's code, so the two never trip over each other.

---

## Part B: for Fable (operating rules and the list)

### Rules (read CLAUDE.md first; it overrides anything here)
- **Talking to Patryk:**
  - Patryk can't read code. Explain everything in plain English, with no em dashes, and never use the word "done" in text he reads.
  - Visual changes need a mock-up first (a claude.ai Artifact) and his pick. When an item needs a pick, publish the mock-up, add it to the Waiting list, and move on.
  - When Patryk calls an option awesome, best or amazing, the next round is variations of that option.
- **Plan Mode before touching `science-lesson/references/build.js` or its `builder/` parts** (CLAUDE.md). Group builder jobs. Write the plan into the log under "Waiting on you: approve builder plan", and do them when he approves.
- **Drive:**
  - Never delete, move or rename anything on Drive.
  - Creates and copies only, in the sanctioned places, and log every write.
  - One standing exception (28 Oct): the order-sheet download may bin its own temporary Sheet.
  - Drive (G:) is currently down. Paste files go to `C:\Users\magda\Desktop\Planner paste files` named "PASTE INTO APPS SCRIPT - X (date, label).txt". When G: is back, copy them to `G:\My Drive\Beechen Cliff Science\Admin\Planner Sync` and log the copy in sync-log.txt.
- **Paid services and pupil data:**
  - No paid APIs: flag them and skip.
  - Pupil names and pupil data stay on the school account. Home gets class-level counts only. Never put names in commits, logs or artifacts.
  - Nothing that decides for him: show information or prepare drafts; never send, post or re-teach by itself.
- **Checks:** before every commit, run `npm test` at the root plus the planner and game checks:
  - `node planner/tests/game.test.js`
  - `node planner/tests/server.test.js`
  - `python planner/tests/ulhu_sim.py`
  - `python planner/tests/phone_sim.py` (flaky; rerun once)
  - the planner test files listed in item 0.2

  All must be green before a commit and before the session ends.
- **Git:**
  - Commit after each item, adding files by explicit path (never `git add -A`). The design session may have uncommitted files in `replica/design/`; leave them alone.
  - Commit messages in plain English.
  - Never rewrite history.
- **Code ownership:** you own all code. The design session only edits `replica/design/**` and its scratchpad.
- **Skills:** use the user skills `/bug-hunter` (seam-first, test-gated fixes), `/security-sweep` (before anything is packaged or pasted) and `/honest-adviser` when a choice is unclear.
- **Skill packaging:** if a packaged skill file changes, run `.\package-skill.ps1` and add "upload the new science-lesson.skill to claude.ai" to the Waiting list.
- **Paste-file size:** keep every paste file under 340 KB.
- **Statuses lie:** grep the code before believing any "missing" claim.

### Log format (`FABLE-WORKLOG.md`)
- Top: **Waiting on you**, a numbered list of plain one-liners, each with a link if there's a mock-up.
- Then, newest first, one entry per item:
  - the date;
  - the item number;
  - what changed (one plain line);
  - "You need to:" (paste which files, or nothing);
  - the commit id.

---

### Phase 0: safety (do first)
- **0.1 Save point.** Review `git status`. Commit the modified tracked source files and new source files in logical groups, with plain messages.
  - Don't commit built lesson outputs (.pptx/.docx) or anything with pupil names. Gitignored files stay ignored.
  - If unsure about a file, leave it and list it in the log.
- **0.2 Planner checks in `npm test`.** Add these to `test/run.js` (or a second npm step):
  - planner/test-logic.js
  - test-homework-quiz.js
  - test-mailbox.js
  - test-ordersheet.js
  - planner/tests/server.test.js
  - planner/tests/game.test.js

  In both fake spreadsheets, turn appended 'YYYY-MM-DD' strings into Dates, like real Sheets.
  *Done when:* `npm test` runs them, and the homework label bug (1.1) shows as a failing test before its fix.
- **0.3 Protect `exam-usage.json`** (the "never repeat a question" record). It is untracked.
  - Fail loudly on a read or parse error instead of treating it as empty.
  - Write via a temp file then rename, and keep a rolling dated backup.
  - Places to change: homework-forms.js write(), test-paper.js (~1081), exam-pick recordUse, extension-pick.
- **0.4 Paste-file guard in `planner/bundle.js`.**
  - Warn at 340 KB per file.
  - Strip comments from the pasted copies.
  - Store hashes in `dist/.last-paste.json` and print "changed since last paste".
  - Stamp a build date that shows in a corner of Planner and Phone.

### Phase 1: data safety and bugs
Planner (details: `docs/audits-2026-10-28/planner-deep-audit.html`):
- **1.1 Homework label clash.**
  - Code.gs setHomework compares a Date with 'YYYY-MM-DD'. Use hwRows_().
  - Relabel clashing existing rows only by a one-off script that Patryk runs.
- **1.2 Failed tick saves.** Planner.html save(): run('saveLessons') needs a .catch.
  - Show a red "NOT saved" until all three parts land.
  - Retry once.
  - Keep the beforeunload warning on while saves are in flight.
- **1.3 Behaviour lock and taps.**
  - Behaviour gets its own lock (the homework Form build holds the script lock for up to a minute).
  - Each tap carries an id, and the server ignores repeats.
  - After 3 failures, a queued tap is set aside and shown on the connection screen.
- **1.4 Homework slips.** Double-click guard on the menu "Homework quizzes". Unmarking a scheduled homework restores 'scheduled'.
- **1.5 Stale tab overwrite (medium).**
  - saveLessons and saveWeeks: save changed ticks only.
  - Send a version stamp; the server refuses an out-of-date save with "This page is out of date. Reload".
  - Test with two simulated tabs.
- **1.6 Term dates and Week A/B in one place.** Behaviour.gs reads data.terms and weekAStart from the planner.
  - Remove the old fallback timetable (last year's classes).
  - Test that both Week A/B answers agree for every week of 2026-27 and the September 2027 rollover.
- **1.7 Throttle pushState_** to home: at most every few minutes, plus always from dailyResults and sendRequest.

Lessons (details: `docs/audits-2026-10-28/lessons-homework-audit.html`):
- **1.8 A-level Drive address.** builder/17-main.js writes the wrong folder for Year 12/13 (no Physics level; it's Module then Chapter). Reuse the uploader's chapter lookup.
  - **Builder job: Plan Mode.**
  - Fixes lessonMcqs for 12C and 13D.
  - Add a 13D fixture.

Ulhu (details: `docs/audits-2026-10-28/ulhu-deep-audit.html`):
- **1.9 Shop locks.** Normalise {type:"level",min} and {type:"outside_work",count} in gShop_. Test that every locked item is refused at level 1.
- **1.10 Day rollover before any tick.** gRollover_ at the top of gameTick/gameUntick. On the client, reload on visibilitychange when D.today is stale.
- **1.11 Exact Undo after fainting.** Store the lost runes, level and XP in the tick note and restore them. Also restore prev.v.
- **1.12 Formula guard.** In gAppend_/gSet_, prefix "'" for /^[=+\-@]/ and for date- or number-like text in text columns.
- **1.13 Reduced motion keeps the sigils.** Open BLOOD in still mode.
- **1.14 Life bonus ignores curses and blessings** (kind habit).
- **1.15 Every-few-days rituals can miss** (never-miss-twice for everyN).
- **1.16 Offline ticks.** Each tick carries the client time and an action id. The server accepts a tap day up to about 36 h old and never pays twice.
- **1.17 Faster taps.** BUILT in the design session on 28 Oct (commit 4fb55d11: per-request sheet cache with write invalidation, gWorld_ reads only Data and Weeks, client sends chained). Skip it, but don't undo it.

### Phase 2: learning loop and daily time-savers
- **2.1 Do Now picker uses lesson-match.js and question-pool.js.** Mix: 4 short recall, one 2-mark explain, one calculation. The mix rule goes into SKILL.md only with Patryk's OK (put it on the Waiting list).
- **2.2 MCQ votes on the next lesson card** (MCQ Votes tab, class level), plus "Put on next lesson's Do Now".
- **2.3 Most-missed questions view** in the Assessment tab, from S.results.
- **2.4 Homework due on the lesson card.** Plus default collect tick, "follow-up task here" and "key homework returned" ticks into the build request; key-homework "due to mark" after 5 days.
- **2.5 Builder small fixes (builder job: Plan Mode).**
  - Starters go to the support sheet.
  - No pre-filled GUESS working on the standard sheet.
  - Word bank read from class-defaults.json (9AS and 9XS await a decision).
  - Whiteboard answers auto-size.
  - The graph slide reads "READ THE GRAPH" until answers.
  - No false picture warning on variant E.
  - Long exam questions and mark schemes split over two slides.
  - Correct mark totals.
  - First check the mark-scheme overflow: the two audits disagree on whether it's already fixed.
- **2.6 A delayed MCQ from 3 to 4 weeks ago in the MCQ block**, recorded with the votes (builder job).
- **2.7 Order sheet email draft.** GmailApp.createDraft with the xlsx attached; TECH_EMAILS script property (Waiting on Patryk for addresses). Logged in the Log tab.
- **2.8 Friday messages home drafted** from the pupils he ticks (drafts only; he sends).
- **2.9 Silent-work tap timer (NEW, Patryk 28 Oct; replaces the microphone idea, which is dropped):**
  - **What he wants:** a timer he starts when he wants a class silent (and during instruction). One easy thumb tap marks "too loud" (red, counting seconds lost) and one tap marks "good noise level" (green). He can still give positives while it runs. At the end it shows the % of time at a good level. **80% or more = the class earns it** (his 80% rule; the judge is him, not a meter).
  - **Where:** the phone behaviour app, with a passive display on the board.
  - **Spec:** follows the 22 Oct prototype notes in memory (project_learning_loop: a toggle with a smiley or colour, no countdown).
  - **Mock-up first.** Confirm with him what "earns it" gives: positives, Friday message credit, or a board celebration.
- **2.10 "Last week's homework" slide** after the Do Now answers: the 3 most-missed questions, the right answer, and the common wrong answer with why. Class totals only. Builder job, mock-up first.
- **2.11 Marks available per section** in the test review table.
- **2.12 A note for next year on each lesson** (Lessons record field, shown when the lesson is planned again).
- **2.13 Update the test fixtures** to this year's classes: a 10S2 (no word bank) and a 13D lesson, an em-dash content warning, and smoke tests for extension-pick, homework-booklet, test-review-lesson, paper-snippets and lessonMcqs.

### Phase 3: Ulhu's new screens (from `replica/design/habits-v2-decisions.md`; mock-up sources in `replica/design/mockups/`)
Each look goes in its own include file. Size plan: GameGlass.html and GameVespers.html, and High Vespers loaded only Sunday to Tuesday.
- **3.1 High Vespers (fully picked: `mockups/highvespers/`).**
  - Replace the old Sunday review card, because they clash on the same weekly slot.
  - High Vespers counts as that Sunday's Vespers and pays +20.
  - Seal: brown R2 rings; red wax and seal for every answer; the answer word pressed in the rim.
- **3.2 Glass module (`mockups/glass/`).**
  - G1 blessing tiles with the brighter path and star rings.
  - X2 Absolution with the honey edge line; stage II lights middle to end only.
  - D1 day-in-glass (d1.js) for the Vespers night line (NG1).
- **3.3 Quest scroll module (`mockups/tablets2/`):**
  - P2 parchment on E1 rods;
  - F9 seal, original stamp, K1a press, W9 wax at T2;
  - B2 burn;
  - K-T2 tick striking the whole step;
  - WR1 ink.
  - The "evil pact" effect is still waiting on Patryk's pick (P1-P4).
- **3.4 Multiplier display:** rings in the rune circle, base pay counting up on tick.
- **3.5 A pencil per group** for editing (V.edit = groupId).
- **3.6 Vespers screen (`mockups/vespers/`).** Its way in is still being picked, so build the sheet first:
  - NG1 night line;
  - Q4a2 face-up equal cards;
  - only the sigil picked in the moment;
  - good and bad chips;
  - long-press tagging on rituals and blessings.
- **3.7 Phone comfort pass:**
  - 44 px targets (keep every animation; Patryk rejected the "daily taps under half a second" idea);
  - the two faint greys;
  - redraw only the visible tab;
  - Ulhu not asleep all day at half moon.
- **3.8 Levels to 50**, with steeper need and unlocks at 20/30/40. Patryk confirmed 28 Oct: **50 level titles**, each one named (in the eldritch style of the first 12).
- **3.9 Quick-log omens on top of The Call** (Patryk said yes, 28 Oct). His most-used curses and blessings sit at the top, one tap each, with Absolution. Keep every animation as it is: he wants logging grand, not fast.
- **3.10 Aims with a bottom line, compared in High Vespers** (Patryk 28 Oct). Each ritual can carry a weekly aim and a bottom line. For example, gym: aim 3 sessions, bottom line = walking into the gym 3 times; reading: aim an average of 15 min a day, bottom line = open a book and sit with it for 1 minute a day. High Vespers shows, per ritual: aim reached, bottom line held, or missed. Design this with Patryk first (the grill session is designing it), so wait for its entry in habits-v2-decisions.md.
- **3.11 Text a couple of pixels bigger** across Ulhu, then check at 360 px and 412 px that nothing overflows or wraps badly. **No first-time hints, and keep the tab names** (Patryk 28 Oct).

### Phase 4: this half-term
- **4.1 CGP book scanner.** Needs Patryk at the PC to log in; ask what "ice books" means first. It's an index only.
- **4.2 Follow-up task after the Do Now ("1" book task, "2" exam question)** and the key-homework review in a normal lesson (specs/key-homework-review.md). Needs 4.1.
- **4.3 6-mark breakdown slide** (specs/six-mark-breakdown.md). Waiting on his 3 answers.
- **4.4 Worksheet tables and sections keep together** (keepNext), and exam questions with pictures two-up. Mock-up first.
- **4.5 "Today" panel** (the morning brief inside the planner), plus a phone Today card.
- **4.6 Faster Homework tab** (Mailbox readMany, only check recent unmarked work).
- **4.7 Behaviour log stays fast** (read from the bottom, a per-term archive tab in the same spreadsheet, cached lesson data).
- **4.8 Planner speed** (memoise progress per week; a timing test with 41 weeks).
- **4.9 True/false click reveal and the GUESS worked-example slide.** Mock-ups first.
- **4.10 Engage rule** (a real question the lesson answers). Waiting on his OK.
- **4.11 MCQ distractor checks** (flag only).
- **4.12 Board answer-box contrast.** Waiting on a colour. Change the navy and gold constants together, and add an animation-count test.
- **4.13 Homework prepared a week ahead**, revision set two weeks before a test (as a draft), and the 6-marker returning as homework.
- **4.14 Whole-class feedback sheet builder.**

### Phase 5: this year
- One-press weekly printing and an open-lesson launcher (one goal).
- Classroom drafts for lessons.
- Lessons built before 7 pm by a scheduled home session (never later than 7 pm).
- Eyes-free initials on the phone (design first).
- Backdating and an end-of-day reminder.
- League feed and a termly tracker.
- OCR textbook questions for 12C and 13D.
- The Ulhu suggestions tray.
- Smoke tests for the brief.
- Learn slides dual coding (mock-ups).
- Real exam MCQs first.
- Ulhu:
  - the stall and dice game (once picked; mock-ups in `mockups/market/` and `mockups/dice/`, loaded only on demand);
  - rooms, pets, potions and seasonal items;
  - Breakwater: Patryk finds the strip disjointed (28 Oct); it is being redesigned or cut in the grill session. Don't touch it until habits-v2-decisions.md says what it becomes;
  - key-homework and report rituals;
  - a shareable weekly card;
  - the Disco Elysium ideas (`docs/audits-2026-10-28/disco-ulhu.html`; his pick first).

### Not to build (dropped or clashing)
- Microphone or voice-driven anything.
- A cold-call picker or hinge tally.
- AI marking (paid).
- Painterly art through a paid image tool.
- Duplicate task-planner goals (now Ulhu's Rituals).

---

## Part C: the message to paste into the Fable session

> You are working through my build list unattended. Read `CLAUDE.md`, then `FABLE-WORKPLAN.md` (Part B is for you), then `FABLE-WORKLOG.md` if it exists, to see where you got to. Work the items in order, one at a time, following every rule in Part B: checks green before each commit, commit by explicit file paths, one plain-English log line per item, anything needing my pick or decision goes on the Waiting list and you move on, Plan Mode jobs wait for my approval, nothing deleted, moved or renamed on Drive, no paid services, no pupil names anywhere. Start with Phase 0. I approve the save point in 0.1. Talk to me in plain English with no em dashes. Keep going until the list is finished or everything left is waiting on me, then summarise what you built and what you need from me.
