# Fa
## 29 Oct 2026, paste files: one complete set every time

**What changed:** the paste-file step now always hands over every planner file (a complete set), never only the changed ones, since two partial sets on one night broke a deploy. The set goes into Admin\Planner Sync when Drive is up (the Desktop folder "Planner paste files" when it is not), named with the date and "complete set", and a line in that folder's sync-log.txt records the copy and which earlier set it replaces.

**You need to:** nothing.

**Save:** ec37bfea.

## 29 Oct 2026, item 1.4: homework slips

**What changed:** a double click on the menu's "Homework quizzes" used to start the Forms build twice; now the second click just says it is already making them. Also, undoing "marked" on a homework whose Classroom post was scheduled gives it back "scheduled" (it used to become "drafted", which made it look unposted).

**You need to:** nothing now. It goes into the next complete paste set.

**Save:** c89020d6.

## 29 Oct 2026, item 1.3: behaviour lock and taps

**What changed:** three things in the behaviour app. First, taps now take their own lock on the spreadsheet instead of the script-wide lock, so a tap never waits behind a homework Form build (which can hold the script lock for up to a minute). Second, every tap carries its own id and the moment it happened; if the phone sends the same tap again after a lost reply, the server writes it once, never a second positive or negative, and even an older phone page without ids is caught by checking the latest rows for the same moment, class, pupil and type. Third, a saved tap the server refuses three times while the connection looks fine is set aside instead of blocking the taps behind it, and the connection screen (the dot at the top) lists it with "Try again" and "Forget them". A tap that fails only because the signal dropped is never counted against. The test fixture's two pupils are now called "Test Pupil One" and "Test Pupil Two" so no name that could be real sits in the project history.

**You need to:** nothing now. It goes into the next complete paste set.

**Save:** 48df17e1.

ble work log

Plain-English record of the build list in `FABLE-WORKPLAN.md`, newest entry first. Each entry says what changed, what you need to do (if anything), and the save id in the project history.

## Waiting on you

1. **SUPERSEDED (design session, 29 Oct 01:5x): paste the twelve files named "(29 Oct, ONE COMPLETE SET)" in Admin\Planner Sync instead; they include these three, the Den, Oracle and omens, and a fix for a broken character in the omen code.** Old text: **Paste three files into Apps Script and deploy a new version.** They are on the Desktop in "Planner paste files", dated 2026-10-29: Code.gs (the homework id fix), Planner.html and Phone.html (the build date in the corner). They already include everything from the 27 and 28 Oct paste files of the same names. If you never pasted the 28 Oct Game.gs and GameUI.html or the 27 Oct GameArt.html, those still need pasting too.
2. **Run the one-off homework id repair once, after pasting Code.gs.** In the Apps Script editor pick the function `fixHomeworkIds` at the top and press Run. It renumbers any homework rows that share an id (the first keeps its id) and writes each change to the Log tab. Running it twice is harmless.

## Things I noticed but did not touch

- One Ulhu browser check was already failing before I started: "Banish (two taps) removes a boss, Undo brings it back" times out waiting for a click. That is in the boss code the design session owns, so I left it. The check itself still reports 75 of 76 and does not stop the run.

---

## 29 Oct 2026, item 1.2: failed tick saves

**What changed:** when the planner saves, three parts travel to Google: this week's plan, the lesson ticks, and any later weeks that slid along. Before, only the first part was watched; a failed tick save vanished silently. Now every part is retried once, the status reads "All changes saved" only when all three have landed, a failed part shows a red "NOT saved" naming it (and the page stays unsaved so Ctrl+S or your next change sends it again), and the "leave this page?" warning stays on while a save is still travelling. A browser test fakes each failure and checks all of this.

**You need to:** nothing now. It goes into the next complete paste set.

**Save:** add29c0e.

## 29 Oct 2026, items 0.2 and 1.1: planner checks inside the main test, and the homework id clash

**What changed:** the main test (`npm test`) now also runs the seven planner checks: planner logic, homework quizzes, the home link, the order sheet, the planner server and behaviour app, Ulhu's server, and the new paste-file guard. The two fake spreadsheets the tests use now store a typed date as a real date, as Google Sheets does. That change made the homework id bug show up as a failing check (two homeworks set for one class on the same day both came out as "10C2-2026-10-19-1"), and it is fixed: the planner now reads the dates back properly, counts that day's homeworks, and steps past any id already taken, so two homeworks can never share an id. A one-off repair function (`fixHomeworkIds`) renumbers old clashing rows when you run it from the editor. The two items are in one save because the test would have been red between them.

**You need to:** paste Code.gs and run the repair once (Waiting list, items 1 and 2).

**Save:** b5b914f2.

## 29 Oct 2026, item 0.3: the "never repeat a question" record is protected

**What changed:** `exam-usage.json` (which exam questions each class has already had) used to be read by six different scripts, each of which treated a damaged or half-written file as an empty record and then saved that emptiness over the top. Now one shared piece of code reads and writes it. A missing file is a fresh start, but a damaged, empty or wrongly shaped file stops the pick with a plain message telling you to restore it. Every save writes a temporary file first and swaps it in, so a crash can never leave half a file. The first save of each day keeps a dated copy in `exam-usage-backups/` (the last 30 kept). The test harness never makes backups of its own test writes. Twelve new checks cover this.

**You need to:** nothing.

**Save:** 5522835e.

## 29 Oct 2026, item 0.4: paste-file guard

**What changed:** the bundle that makes the paste files now strips the comments out of the pasted copies only (the source files keep every comment), which makes them 121 KB smaller in total. A small code reader does this safely: anything inside text, templates or patterns is left alone, and every stripped file is parsed again; if one would not parse, the original is used and a warning printed. The whole server test suite also runs against the stripped copies, and passes. The bundle warns if any paste file is over 340 KB (all are under: the largest is GameUI.html at 270 KB), compares each file with the last handover and prints which ones changed since the last paste, and stamps the build date and time in the bottom corner of the planner and the phone page so you can see at a glance that a new paste is live. Running the bundle with `--pasted` copies the changed files to the Desktop folder with the agreed names and records what was handed over.

**You need to:** nothing beyond the paste in Waiting item 1.

**Save:** 2df6b210.

## 29 Oct 2026, item 0.1: save point

**What changed:** everything that was finished but not yet saved in the project history is now saved, in five groups: the October lesson tools and their tests; the skill notes and the packaged skill file; class defaults, the scheme note, October lesson content and build manifests and the planner build-request batches; the Drive reorganisation scripts, the 28 Oct audits, lesson-quality research and small tools; and two new ignore rules (Python cache folders, and the Jeopardy handover note because it names pupils).

**Left out on purpose:**
- The picture folders inside the lesson folders (543 files, 66 MB): pictures pulled from the school's decks and exam papers. They can be pulled again, so they stay out of the history for now. Say the word if you want them in.
- `tools/JEOPARDY_HANDOVER.md`: names pupils, so it is now ignored and will never be saved.
- `CLAUDE (1).md`: a stray copy of the Scientist League notes. Left alone.
- The school test papers in `tests/Samples`: school files, ignored by type.
- The design session's mock-up folders under `replica/design/`: theirs, untouched.
- At the top level of the project history, two old skill copies (`science-lesson-v3` and `science-lesson`) show as deleted, and two stray folders (`.tmp.driveupload`, `_retired-2026-07-12`) sit unsaved. Left as they are.

**You need to:** nothing.

**Saves:** 56d73045, 5db91f2b, facbdb49, 36d3f302, ad10e77a.
