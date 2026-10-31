# Lane C log (your day)

## Waiting on you
20. **CGP book scanner, ready for you at the PC (design chat, 31 Oct):** the tool that turns your three online CGP books into a topic-to-page index (with where the questions and answers are) is built and checked on a made-up book. It needs you for the one part only you can do: logging in. On the home PC, once: `npm install --no-save playwright` (free). Then for each book: `node planner/tools/cgp-index.js capture physics` (a browser window opens; log in, open the book at its cover, press Enter in the terminal; it takes one picture per page), then `node planner/tools/cgp-index.js ocr cgp-pages-physics`, then `node planner/tools/cgp-index.js index cgp-pages-physics`, and read `cgp-pages-physics\spot-check.txt`: ten pages to confirm against the book. Same with `chemistry` and `biology`. Three short questions on the decisions page first ("ice books", keep your login on the PC, the tool turns pages or you screenshot). Design and risks: `lanes/design-cgp-scanner.md`. Nothing from the books goes into git or Drive, only the index.
1. **Obsidian inbox: confirm the folder.** It is set to (a) `G:\My Drive\Obsidian\Inbox from planner.md`, with writing switched OFF. Captures you send to Obsidian are kept safe in the planner until you say yes; then they are written, oldest first. Say "yes, (a)", or name another folder.
2. **Per-pupil homework results**: the design moves them into your personal Planner Sheet along with everything else (your decision in the installed-app grill). Say "keep them at school" if that has changed.
4. **The school test** (two minutes at school): open https://ulhu-planner.pages.dev/test/ on a school PC, paste your mailbox address and key (the same two values in the school planner's Script properties, MAILBOX_URL and MAILBOX_KEY), press "Run the test", and read the three results back to the chat (the "Copy the results" button copies them). The page never remembers the key.
7. **Eyes-free behaviour entry: three picks and a score** (design chat, 30 Oct). Open `lanes/mockups/eyes-free.html` on the PC (or on the phone once the app site is live). Press **Try** and draw 20 letters: tell me the score. Then **Picks**: (1) when a first letter fits several pupils, A draw the surname initial without looking (my pick) or B the names pop up to tap; (2) a tap becomes a positive A after a 0.4 s pause, one trip (my pick) or B at once, a second tap undoing it; (3) how to get into Blind mode: A a "Blind" button beside Plan and Names (my pick), B drawing anywhere on the plan counts, C the phone upside down. Full design: `lanes/design-eyes-free.md`. Lane B builds it after your picks.
8. **Two picks for Lane B, one page:** `lanes/mockups/homework-feedback.html` (open on the PC; buttons along the top). **The "last week's homework" slide** (plan item 2.10, goes after the Do Now answers): A three cards side by side, B one question per slide with the answers as bars, C a table of the three misses plus a "Fix it now" whiteboard question. **The whole-class feedback sheet** (4.14, one A4 page per class after a marked test or key homework): A four boxes (went well, even better if, now do this, my target), B a bar per question for the whole paper then the red ones, C the spec parts coloured by the memory map beside the misses. Reply with a letter for each (or a mix); Lane B builds them.
9. **Four slide and worksheet picks for Lane B, one page:** `lanes/mockups/slides-polish.html` (open on the PC; the top buttons switch, "Next click" plays the animation, "Lights on" washes the slide out like the projector). (1) **Answer boxes on the board** (plan 4.12): A as now (yellow text on navy, since 19 Oct), B bigger and bolder with a yellow border, C white text with the label and numbers in yellow, D a cream box with navy text. (2) **True or false** (4.9): A a stamp drops onto each row with the correction underneath, B each row flips over like a card, C one statement per slide with the A and D corners and a huge tick or cross. (3) **GUESS worked example** (the example question on top, steps appear one click at a time): A today's rows, B five cards left to right, C steps down the page like board working; B and C end with a "Your turn". (4) **Exam questions with pictures on the worksheet** (4.4): A two columns, B picture above, C picture beside the stem only; in all three a question never splits across a page. Reply with four letters.
10. **Lessons built before 7 pm, switch it on when ready:** the afternoon run is built and checked but nothing is scheduled until you do it. On the PC, with one request waiting from the planner, run `powershell -File planner/tools/build-ahead.ps1 -DryRun` (it only prints what it would do), then the same with `-Install` to make the weekday 15:45 task, then watch the first run's log (`planner/tools/build-ahead.log`). Off switch: an empty file `planner/tools/.build-ahead-off`. Design: `lanes/design-build-ahead.md`.
11. **Learn slides, six dual-coding layouts to pick from:** `lanes/mockups/learn-dual-coding.html` (open on the PC; D plays with "Next click"). All six use the same topic (changing state) so you can compare: A notes around a picture, B "write this, see this" (book column left, picture right), C one idea per slide (big sentence, picture, Why and Example), D build it up (diagram and sentences grow click by click), E concept map, F cause and effect (before, arrow, after, "because"). Every one ends with the same "WRITE: in your book" strip and key-word chips in the title bar. Say which ones to build (several is fine) and which should be the default Learn.
12. **Open lesson and print the week, try it when Drive is back:** `node planner/tools/open-lesson.js list today` shows what would open; `node planner/tools/open-lesson.js today` opens the slides, worksheet and support sheet for each lesson in order; `node planner/tools/open-lesson.js pack` makes one PDF of the week's worksheets with a cover page (copies per class) on your Desktop in "Print packs". Say if the pack may live on Drive and where (nothing is written to Drive until you do). Design: `lanes/design-lesson-launcher.md`.
13. **All the mock-ups on your phone:** https://ulhu-planner.pages.dev/mockups/ lists every page waiting on a pick (items 7, 8, 9, 11 and Lane B's memory tab). Made-up classes only. The eyes-free page works on the phone there too (Blind, Teach, Try).
14. **Teaching-language rules, say yes or edit:** `lanes/research-teaching-language.md` has the research you asked for (14 Oct) and 20 proposed rules in section 3: slides (one idea a slide, words by their picture, 15 words a sentence, the board never repeats you word for word, reveal in steps, "you" and "we", looser for A-level), vocabulary (command words in the exam's sense, one academic word a lesson, everyday words with a science meaning get a line), your spoken instructions (statements, fewest words, what to do then why), Engage hooks (a question with a gap pupils can nearly close, commit then answer at Review, under 15 words, stays live), and multiple choice (each wrong option one known mistake, the right answer not reachable by a wrong route). Reply "yes to the language rules" or say which numbers to change; Lane B then puts them in SKILL.md with build warnings.
19. **Test defaults are set (your 30 Oct "everything unfinished made or test built"):** `lanes/test-defaults.md` names the first version each lane builds where I had a recommended pick (homework slide A, feedback sheet A, true or false A stamp, GUESS A rows, worksheet pictures A two-up, Learn B then A, diagram style B sketch, exam practice cover A with 6 mm boxes, memory tab A grid, the 6-mark slide's three answers, Obsidian (a), results move, print pack on the Desktop). The decisions page lists only what truly needs you, shortest first (3 things after your late-evening answers of 30 Oct: the eyes-free Try score, the site address, the school test). New mock-up for homework ahead (4.13): `lanes/mockups/homework-ahead.html`, A one list, B two weeks ahead, C a card per class.
18. **Every open decision in one list, on your phone:** https://ulhu-planner.pages.dev/mockups/decisions lists all 41 things waiting on you across the four lanes (this log's items, Lane A's picks, Lane B's plans and the 6-mark slide's three questions, Lane D's mock-ups, and the work plan's old decisions: 9AS and 9XS word bank, review answers sheet, Engage rule, Vespers bonus). Tap an answer under each, press "Copy my answers", paste the text into any lane chat. Answers stay on the phone until you clear them.
17. **Exam practice front cover and tick boxes:** `lanes/mockups/exam-practice-cover.html` (also on the site). Cover A exam-board style (title band, name box with the due date, instructions and information side by side, a marks-by-question strip for the self-mark), B one glance (chips, big name line, four plain steps), C a slim strip at the top of page 1 with the questions starting underneath (one sheet fewer per pupil). Tick boxes: 1 as now (about 4 mm, cut from the scan), 2 a drawn 6 mm box (what AQA prints), 3 an 8 mm box with bigger type. Reply with a letter and a number; Lane B builds them into test-paper.js.
16. **Lane A's and Lane D's open picks are on the phone too:** https://ulhu-planner.pages.dev/mockups/ now lists the ritual bar, the dice water, the Grimoire's opened page, the day tags, the overnight adventure, the term page, the focus crafts and the sounds page, copied as they are from the design folder. Reply to each lane's own waiting item as before.
15. **One drawing style for Claude-drawn diagrams, pick A, B or C:** `lanes/mockups/diagram-style/index.html` (also on the site under /mockups/). The same three diagrams (particles, a circuit, a cell) as A clean textbook, B pencil sketch (wobbly ink, cream paper, the handwriting font), C chalk on the navy board. All drawn by code already on this PC, nothing paid, so the pick can go straight into Learn slides.
20. **Notifications, when the app is on your personal planner (not before; nothing to do today):** five steps on the home PC, about 10 minutes.
   1. In the project folder run `node app/tools/make-push-keys.js` followed by your email. It only prints two blocks of keys; nothing is saved anywhere.
   2. Cloudflare (the same account as the app site): Workers and Pages, Create, Worker, name it `planner-push`, Deploy, then Edit code: replace everything with the contents of `app/worker/push-worker.js`, Deploy.
   3. That worker's Settings, Variables and secrets: add the four lines of block 1, each as a Secret. Open the worker's address in a browser: it should say "Planner push worker: ready".
   4. The planner's Apps Script, Project Settings, Script properties: add the three lines of block 2 (the worker address goes in PUSH_WORKER_URL).
   5. On the phone, the app's Settings, Notifications: tick what you want, press On, allow it, then "Send a test".
5. **Next paste set** (for Lane A to make): the phone page and the planner open instantly from their saved copy, and the phone has the new Day tab. Planner.html and Phone.html changed, and the set has **two new files** to make once in the Apps Script editor: a script file called `Day` (from Day.gs) and an HTML file called `DayUI` (from DayUI.html). Name them exactly that, or the phone's Day tab says "not in this copy yet". Day.gs changed again on 31 Oct (notifications); still no new Apps Script file.

## Entries (newest first)

### 31 Oct 2026, design chat: the CGP book scanner (your 15 Oct high priority), built up to the point that needs you
- What changed: a home tool reads your three online CGP Combined Science books and makes the same kind of topic-to-page index the planner and the lesson builder already use for Kerboodle and Activate, plus where every Warm-Up, Exam Questions and Revision Summary page is and which page holds its answers (that is what the "book task" after a test review needs: "questions 1 to 3 on page 5, answers on page 9").
  - **How it works:** a browser window you log into; the tool presses Right arrow and takes one picture per page; the OCR built into Windows (free, nothing leaves the PC) reads the words and where they sit; the big title in the band at the top of each page becomes the topic, the small strip at the top edge gives the chapter, the number in the corner is the printed page. Page numbers that do not follow their neighbours, and pages with text but no title, go on a doubts list. A `spot-check.txt` names ten pages per book for you to confirm, because the rule from 8 Oct stands: no page is trusted until checked.
  - **What is kept:** only the index (titles, page numbers, question numbers). The page pictures and the read text stay in a local folder outside git and Drive; your login stays only in the tool's own browser profile on this PC (or nowhere, with `--forget`).
  - **Checked** on a made-up 12-page book drawn by a script (nothing from a real book): 28 checks in `planner/tests/cgp-index.test.js`, including that the existing index reader takes the new block unchanged and sends a "Specific Heat Capacity" lesson to the right page, and one live read with the real Windows OCR.
  - **Not checked:** the page-turning in the real CGP viewer, because that needs your login. Its first run is the test; the design lists the fixes if the viewer turns pages differently, and the fallback where you screenshot the pages yourself and the tool does the rest.
- For Lane B (after your spot check): paste the three blocks into `textbook-index.md`, and let the class pick the book (10C2 Combined: CGP; 10S2 and 11S2 triple: Kerboodle Physics; KS3: Activate), then the follow-up book task (plan 4.2). Both are written out in the design, section 7.
- You need to: the three questions on the decisions page, then the commands in Waiting item 20 (about 15 minutes a book, mostly waiting), then say "pages right" or name the wrong ones.
- Save: see git log "CGP book scanner".

### 31 Oct 2026, Lane C (restarted after the PC restart): notifications (installed app step 8)
- What changed: the installed app can now send you notifications, two kinds, each one you can switch on or off per device:
  - **Morning, 7am, school days only:** "Today: 10S2 P3 L4 Ripple tanks not built, 8XP P2 not planned". Class codes and lesson titles only, never names. Nothing on weekends, INSET days or holidays (from the term dates), and nothing at all when every lesson today is built.
  - **Ulhu's nudge:** Lane D's rules decide (at most one a day, a real fact like "Read: 24 days"). This is the bit Lane D was waiting for.
  - **Nothing before 7am or after 7pm**, ever. The planner checks every half hour; the morning one is sent once, never repeated.
- How it works, in plain words: a phone only shows a notification that a server has locked and signed, and the planner cannot do that maths. So a tiny free Cloudflare worker does it (`app/worker/push-worker.js`, the same free account as the app site, no paid plan). It keeps nothing: no list of phones, no messages. The planner keeps the list of your devices in a new Push tab (rows are never deleted; a phone that stops existing is marked "gone").
- In the app: Settings has a new Notifications card: two ticks, On and Off, and "Send a test". It says plainly when the planner is not set up yet, when a browser cannot do it (an iPhone needs the app on the home screen first), or when the planner copy is older than this.
- Not yet: the "job finished" kind (it comes with long jobs, step 7, which are not built). The look of the card is the plain shell style, like the PC timer card; it gets a proper design with the other screens.
- Checks, all new: 13 for the worker (a message it locks is opened again by a separate implementation, and the signature checked), 28 for the planner side (school days, once a morning, quiet hours, nudges, a gone phone, the sender down), 12 for the app and service worker, 8 in a real browser.
- You need to: nothing now. Waiting item 20 is the set-up, for when the app is on your personal planner.
- For Lane A: Day.gs changed (next complete set; no new Apps Script file). The app's files are on the site, not in the paste.
- For Lane D: `pushTick` in Day.gs calls `gameNudge(key, true)` every half hour from 07:00 to 19:00, but only when a device has "Ulhu's nudge" ticked, and sends whatever comes back. `gameNudgeOff` still decides the kinds.
- Save: see git log "Installed app step 8: notifications".

### 30 Oct 2026, Lane C: the timer report (installed app 3.10), built in layout A
- What changed: the fortnightly report on where your hours outside lessons go is on the Day tab.
  - On a Friday, when you have not looked for two weeks, a card says "Your fortnight: where the hours went". At any other time a small "Timer report" link sits under your to-dos.
  - It shows the last 14 days: Ulhu's one line naming the biggest drain that is not Personal ("the one to automate next"), hours per job, and hours per class in class colours.
  - Then the rows marked "maybe" (the PC timer's "Not that", or a phone timer that stopped itself after 2 hours). A day of PC counting is one line, not dozens. **Right** keeps it; **Change** gives another job (and class, for marking, building and homework). With no signal the tap is put back with a message.
  - It opens at once from the copy saved last time, then gets the latest.
- Mock-up with three layouts: `lanes/mockups/timer-report.html` (also on the site's /mockups/): A the ledger, B a tide chart per day with the 7 pm line, C one big number with the top three drains. **A is built as the test default**; say B or C if you prefer.
- Not yet: the "last time this took about N min" hint when you set a task again (it belongs on the planner's task rows, Lane B's page; the sum is ready in day-logic.js).
- Also fixed: one app check failed after 7 pm only (it expected the daytime pop-up; after 7 pm Ulhu dozes, as designed). It now checks whichever one the clock calls for.
- For Lane A: `day-report.js` joins DayUI.html and Day.gs changed (one call can now fix several timer rows); both go in the next complete set, no new Apps Script file.
- Checks: 16 new browser checks in `planner/tests/day_screen_sim.py`, 3 new server checks in `day.test.js`.
- Save: see git log "Timer report".

### 30 Oct 2026, Lane C: "no term dates yet" fixes itself
- What changed: the error you hit ("The planner has no term dates yet") came from a Data tab imported before the term dates joined planner-data.json. Now, when the planner finds no term dates, it fetches planner-data.json from home by itself, stores it exactly as Import data does, and carries on. If home does not answer, you get the same plain message, and it tries home again after 10 minutes (not on every tap, so the phone never slows down). This is a small addition to Code.gs, made at the design chat's request.
- For Lane A: Code.gs changed, so it goes in the next complete set. For Lane B: one function in your Code.gs (`plannerCal_`) now reads the Data tab through a new helper (`calFromData_`) and asks home once if the dates are missing; your server checks all pass. 7 new checks in `planner/tests/cal-recover.test.js`, which fail on the old code.
- You need to: nothing once the next set is pasted. Until then, Import data with planner-data.json fixes it, as the design chat said.
- Save: see git log "No term dates: fetch from home".

### 30 Oct 2026, Lane C: the site address is in, and a fault it showed up
- Your site is https://ulhu-planner.pages.dev (the app), https://ulhu-planner.pages.dev/test/ (the school test) and https://ulhu-planner.pages.dev/mockups/ (every mock-up and the decisions page). Waiting item 3 is cleared. You can delete the old "ylhu-planner" project in Cloudflare whenever you like.
- **A fault the real site showed up, fixed before it mattered:** Cloudflare tidies addresses, so `/index.html` becomes `/`. The app kept its home page under the long name for opening with no signal, and a browser refuses to open a kept page that was a redirect, so the installed app would have shown an error offline. Also, opening a mock-up page replaced the app's kept home page. Now the app keeps its home page under `/` only, and mock-up pages are left to the browser. The app's test server now answers like Cloudflare does, and a new check opens a mock-up, goes offline and opens the app (it fails on the old code, passes on the new).
- Links on the mock-up pages that end in `.html` still work: Cloudflare sends them on to the tidy address (checked for every page on the index).
- **ActivityWatch, the line for later** (step 3 of the PC timer set-up, once the app is on your personal account). ActivityWatch keeps its settings in `%LOCALAPPDATA%ctivitywatchctivitywatch\`. Open the folder that exists there and add one line, then restart ActivityWatch (right-click its tray icon, Quit, open it again):
  - in `aw-serverw-server.toml` (the usual one), under the line `[server]`: `cors_origins = "https://ulhu-planner.pages.dev"`
  - or, if you run the newer server, in `aw-server-rust\config.toml`, at the top: `cors = ["https://ulhu-planner.pages.dev"]`
  - Then, when you switch the PC timer on, Chrome may ask whether the site may reach "devices on your local network": say Allow (it only means ActivityWatch on this PC).
- Save: see git log "Site address".

### 30 Oct 2026, design chat: the site builds its mock-ups from their source folders
- What changed: the app site no longer keeps copies of the mock-up pages (they went stale every time a lane edited one, and the copy check then failed everyone's test run). `app/build.js` now copies the pages, code and pictures straight from `lanes/mockups`, `planner/eyes-free.js` and the Ulhu mock-up folders when the site is built, so /mockups/ is always current; `app/src/mockups` holds only the index. The check now builds the site into a temporary folder and confirms every index link lands on a built page.
- You need to: nothing.
- Save: see git log "Site mock-ups built from source".

### 30 Oct 2026, design chat: homework ahead made warmer, decisions down to three
- What changed: you picked layout B for homework ahead but said it felt soulless, so `lanes/mockups/homework-ahead-b2.html` is the same idea in the planner's own look: the three weeks as a lantern-lit path with a progress ring each, one crafted card per lesson with its class colour ribbon and chip, "to prepare" and "already made" sections, and the gold button with a line saying what happens next. Lane B builds it. Your other answers (Engage always a question, keep the review answers sheet, Vespers only, yes to all 20 language rules, install build ahead) are recorded in `lanes/test-defaults.md`, and the decisions page is down to the three facts only you have.
- You need to: the eyes-free Try score, the site address when it exists, the school test.
- Save: see git log "Homework ahead B2".

### 30 Oct 2026, Lane C: build before 7pm, approved
- You said yes (through the design chat). I pulled Lane C design's fix (a dry run now writes nothing), ran `-DryRun` again ("not a school day", nothing marked), and the tool's own checks all pass.
- The design chat made the scheduled task with your direct yes: "Science lessons - build ahead" (Windows refused the colon in the first name; fixed in 43ae195f, which also logs "installed" only when it worked). It is ready; the first run is today at 15:45.
  - **It runs** weekdays at 15:45, and only builds when it is a school day, Drive is connected, requests are waiting and no other Claude session is busy. It starts nothing new after 18:30 and stops at 18:50.
  - **Off switch:** make an empty file called `.build-ahead-off` in `planner	ools\` (holidays, or any time you want quiet); delete it to switch back on. To remove the task completely: `.\planner	oolsuild-ahead.ps1 -Remove`.
  - **The log:** `planner	oolsuild-ahead.log` (one line per afternoon: ran or why not), and the last session's own output in `planner	oolsuild-ahead-run.log`. Anything it skipped is explained in `build-ahead-notes.txt` in the project folder.

### 30 Oct 2026, design chat: two faults fixed, and the Year 9 word bank
- What changed: (1) the afternoon run's dry run no longer marks the day as run (it used to, which would have blocked that day's real run); only the real run marks it, and six new checks prove it. (2) The print pack's Word step now has a time limit, closes only the Word it started if it hangs, and says plainly what went wrong (hung, failed with Word's reason, or finished without making a PDF); four new checks fake Word each way. (3) Your answer on the Year 9 word bank is in class-defaults.json: none for 9AS and 9XS, like 10S2 and 11S2 (10C2 keeps its word bank); the builder reads that file once Lane B's plan 2.5 lands. Taken off the decisions page.
- You need to: nothing, unless the word bank reading is wrong.
- Save: see git log "Build-ahead dry run".

### 30 Oct 2026, Lane C part 2, item 3 (installed app step 10, the home PC half): the evening timer counts by itself
- What changed: the app now has a "This PC's evening timer" switch in Settings. It is off by default and only for the home PC.
- When it is on and the app is open, every 5 minutes it reads ActivityWatch (a free program that records which window is in front; it stays on your PC):
  - it turns each window into a job and class (a "Latent Heat 9AS" PowerPoint is Building lessons 9AS, Gmail is Emails, anything it does not know is Personal);
  - it takes away the time you were away from the keyboard;
  - it sends only minutes per job and class to your planner. Window names never leave the PC.
- If the app was closed, it fills the gap next time (up to two days back). With no signal nothing is lost or counted twice.
- Little Ulhu's pop-up: when a new job has been in front for 2 minutes, he says what he is counting (the bubble you approved). "Not that" marks those minutes "maybe" for your report. After 7pm he shows the N3 night pop-up once, with tonight's tally, and then only counts.
- The planner's server now keeps that "maybe" mark from the PC (one line in Day.gs; it is in the next paste set anyway).
- Checks: 18 in `app/tests/pc-timer.test.js` and 5 more in `app/tests/shell_sim.py`.
- Nothing to do yet. Once the app is on the planner's personal account, setting it up on the home PC will be:
  1. install ActivityWatch from activitywatch.net (free);
  2. let it start with Windows;
  3. tell ActivityWatch to let your app's address read it: see the 30 Oct entry "the site address is in" for the exact line;
  4. open the app on the home PC and switch "This PC's evening timer" On.
- Risk to check then: Chrome may ask an extra question before a website reads a program on the same PC. If it blocks ActivityWatch, the fallback is a tiny script on the PC that sends the same totals (no change to what is counted).
- Save: see git log "Installed app step 10: the home PC timer".

### 30 Oct 2026, Lane C: the design chat's list (try everything that does not need you)
- **Obsidian inbox:** set to option (a), `G:\My Drive\Obsidian\Inbox from planner.md`, with writing OFF. A capture you send to Obsidian is now kept in the planner's Inbox tab as "held" (the capture box says "Kept for Obsidian. Nothing is written there until you switch it on"). When writing is switched on, everything held is written, oldest first, once each, and every write is logged. Anything about a class or a pupil still never goes to Obsidian. 7 new server checks, 1 new phone check. Day.gs changed (Lane A: it is in the next paste set anyway).
- **Build ahead, the dry run** (`planner/tools/build-ahead.ps1 -DryRun`, nothing installed, nothing built): today it says "not a school day" (half term). I also asked its rules about a school afternoon, Tuesday 3 Nov:
  - at 15:45 with Drive off: no run ("Google Drive (G:) is not mounted");
  - with Drive on and no requests: no run;
  - with three made-up requests (two build requests covering three lessons, and one exam practice): it would build three lessons, soonest first, start nothing new after 18:30 and stop at 18:50, leaving the exam practice for the next day;
  - at 18:40: no run ("after 17:45: too late");
  - with another Claude session busy, if it had already run that day, or with your off switch on: no run.
  - The instructions it would hand the session read correctly (no questions back, no paid services, no pupil names, no git).
  - **One fault for its owner:** on a school afternoon, `-DryRun` marks the day as "already ran", so the real 15:45 run would then do nothing that day. The dry run should not leave that mark.
- **Open-lesson tool:** Google Drive is not connected on this PC this morning, so I tried it on a copy shaped like Drive (a real 9AS latent heat lesson from this PC).
  - "list today" and "open today --dry-run" work: the lesson, then slides, worksheet and support sheet in the right order, and a lesson with nothing built is listed as such.
  - The pack's dry run works and shows the right cover page.
  - **The real pack failed:** Word hung, and no PDF was made. Also, 7 copies of Word are left running hidden on this PC from tool and test runs since 27 Oct, one of them mine. I was not allowed to close them; you can end them in Task Manager (each is "Microsoft Word" with no window).
  - **For the tool's owner:** the pack should give Word a time limit, close it if it hangs, and say so instead of finishing quietly.
- Save: see git log "Obsidian inbox held until confirmed".

### 30 Oct 2026, design chat: test defaults, a shorter decisions page, the homework-ahead mock-up
- What changed: following your "everything unfinished made, or artifacted, or tried out, or test built", every pick where I had a recommendation is now a test default handed to the building lane in `lanes/test-defaults.md`; the one item with no picture yet (homework ahead, 4.13) has a mock-up with three panels; and the decisions page is cut from 41 items to the 21 that only you can answer, shortest first, with the defaults listed under it. All on the site.
- You need to: Waiting item 19 (the 21 on the page).
- Save: see git log "Test defaults".

### 30 Oct 2026, design chat: every open decision in one list
- What changed: one phone page with every pick, plan approval and question the four lanes are waiting on (41 of them), each with its lettered options and a link to its mock-up, and a Copy button that turns your taps into a plain text list to paste into a chat. It keeps your answers on the phone only. Checked in a browser: taps, several-answer picks, typed answers, copy, and answers kept after a reload.
- You need to: Waiting item 18, when you have ten minutes.
- Save: see git log "Decisions page".

### 30 Oct 2026, design chat: exam practice cover and tick boxes
- What changed: two things you flagged on the printed exam practice papers now have options to pick from: the front cover (you said it still needed a better design) and the multiple-choice tick boxes (too small; today they are tiny pictures cut from the scanned paper, so the paper would draw its own instead). No feedback grid on any of them, as you ruled.
- You need to: Waiting item 17.
- Save: see git log "Exam practice cover".

### 30 Oct 2026, design chat: the other lanes' mock-ups on the site
- What changed: the eight Ulhu mock-ups Lanes A and D are waiting on you for (all self-contained pages) are copied onto the app site's mock-ups index, so every open pick is reachable on your phone at one address. The check keeps each copy identical to its source; a lane that changes a mock-up re-copies it (or asks me to).
- You need to: nothing new; pick on the lanes' own items.
- Save: see git log "Ulhu mock-ups on the app site".

### 30 Oct 2026, design chat: a drawing style for the diagrams Claude draws
- What changed: your 19 Oct goal (diagrams in one consistent, hand-drawn-feeling style that does not look AI-made) now has three real samples to choose from, each drawn by the chart library the builder already uses, so no picture service and no cost: clean textbook, pencil sketch (the library's own sketch mode with the worksheet handwriting font), and chalk on the navy board. `make.py` redraws them in seconds; the chosen style would become the way the builder draws any diagram a Learn slide names. Copied onto the app site's mock-ups index.
- You need to: Waiting item 15.
- Save: see git log "Diagram style".

### 30 Oct 2026, design chat: the teaching-language research
- What changed: the research you asked for before any new wording rules, from free sources only: Mayer's slide principles (fewer words, placed by the picture, one chunk per click, conversational voice, looser for experts), dual coding's real conditions (words and picture about the same thing at the same time, or it hurts), the EEF on vocabulary (the "academic" words hide in exam questions more than the science words do), what exam boards actually do about readability (language checks by hand, not a Flesch target), AQA's command-word meanings, Lemov and Rosenshine on short statement instructions, Loewenstein's information gap behind a good hook, and Wiliam's hinge-question rules for multiple choice. It ends with 20 proposed rules and how the build would check them. No em dashes.
- You need to: Waiting item 14.
- Save: see git log "Teaching-language research".

### 30 Oct 2026, design chat: the mock-ups on the app site
- What changed: copies of every mock-up waiting on a pick now sit on the installed app's site under `/mockups/` with an index page, so you can open them on your phone instead of the PC (the build copies every file in the site folder as it is). A check keeps each copy identical to its source. The installed-app design has a short new section (12) listing what the day screen can pick up later: Open and Print buttons, the "Built ahead" line, Blind mode in the Lesson tab, and this mock-ups folder.
- You need to: Waiting item 13 (open the address on your phone once it has built).
- Save: see git log "Mock-ups on the app site".

### 30 Oct 2026, design chat: Learn dual-coding mock-ups, and the open-lesson and print-the-week tool
- What changed: (1) six ways to lay out a Learn slide so the picture and the words carry the idea together, which you said is the top priority, in one page with lettered options and the same worked topic in each. (2) The plan's "one-press weekly printing and open-lesson launcher": a home tool that opens a lesson's files in the order you use them (slides, worksheet, support sheet; the school's original deck is never opened), prints a day's worksheets through Word, or makes one PDF of the whole week's worksheets behind a cover page with copy counts, for printing at school. 21 checks (`node planner/tests/open-lesson.test.js`), and a full run on a fake Drive tree with a real lesson's files made a 9-page pack through Word and the PDF library already on this PC. Nothing is written to Drive. Design: `lanes/design-lesson-launcher.md`.
- You need to: Waiting items 11 and 12.
- Save: see git log "Learn dual-coding mock-ups".

### 30 Oct 2026, design chat: lessons built before 7 pm (the afternoon run)
- What changed: the plan's "lessons built by a scheduled home session, never later than 7 pm" is designed and its parts are built. On weekdays at 15:45 a Windows task can wake a small script that checks seven rules (your off switch, a school day from the planner's term dates, between 15:30 and 17:45, Drive mounted, no other Claude session on the PC, not already run today, something waiting) and then starts one unattended Claude session that builds the lessons you sent from the planner, soonest first, at most three, marking each done so the planner shows it. It starts no new lesson after 18:30 and is ended at 18:50 whatever happens. Messages you send are never acted on unattended. 23 checks (`node planner/tests/build-ahead.test.js`); the dry run on this PC correctly says "not a school day" (half term).
- You need to: Waiting item 10 when you want it on. Nothing is scheduled until you run the install step yourself.
- Save: see git log "Build ahead".

### 30 Oct 2026, design chat: slide and worksheet polish mock-ups
- What changed: four Lane B builder items were waiting on a look. One page now shows lettered options for each: the answer-box colours on the board with a "lights on" wash-out to judge them by, the true or false rebuild with the reveal animation you asked for (pupils point A for true and D for false), the GUESS worked example with the example question on top and steps revealed one click at a time, and an exam question with a picture laid out on the worksheet without being dropped. Nothing in the builder changes until you pick; the builder work then needs Plan Mode as usual.
- You need to: Waiting item 9 (four letters).
- Save: see git log "Mock-ups: slide polish".

### 30 Oct 2026, Lane C part 2, item 2 (installed app step 5): the app shell
- What changed: the Cloudflare site is now a real app you can install, though there are no screens in it yet:
  - **Installing:** a manifest and icons (Ulhu's own pixel sprite on navy, made by `app/tools/make-icons.py`), so "Install" or "Add to home screen" puts a Planner icon on the phone or PC.
  - **No signal:** it keeps its own files on the device (never your data, never the planner's server, never the school test page), so it opens with no signal and says "No signal".
  - **Setting up:** the first time on each device it asks for the server address and planner key once, then tests them with one harmless read. A wrong address or key is refused in plain words and nothing is kept. The key never goes in a link.
  - **Settings:** Auto, Light or Dark; Change; Forget the key on this device; taps waiting to send, and any the planner refused, with Try again or Forget.
  - **Updates:** "A newer version is ready, Update now" when Cloudflare has a newer build.
- The look is plain navy and gold for now; the real screens come next (step 6, most-used first) and each gets a mock-up first.
- Checks: 20 in `app/tests/shell_sim.py`, plus two in `app/tests/run.js`.
- You need to: nothing new. It is useful once the planner moves to your personal account (step 2, after the school test).
- Save: see git log "Installed app step 5".

### 30 Oct 2026, design chat: mock-ups for the homework slide and the whole-class feedback sheet
- What changed: Lane B had two items stuck for want of a picture. One page now shows three lettered options for each: the slide that follows the Do Now answers with last week's three most-missed homework questions (class counts only: the right answer, the answer most gave, and why it is wrong), and the printed one-page whole-class feedback sheet. All the numbers come from what the planner already keeps (the Results tab and the ABCD votes), so no new data is needed; option C of the sheet also uses the memory map's colours. Made-up class and numbers; no names.
- You need to: Waiting item 8 (two letters).
- Save: see git log "Mock-ups: last week's homework slide".

### 30 Oct 2026, design chat: eyes-free behaviour entry (design, maths and mock-up)
- What changed: your 21 Oct idea is designed and its working parts are built. Draw a pupil's first-name initial with your thumb anywhere on the phone; if several pupils start with it, draw the surname initial; then one tap logs a positive, two taps a negative, three open that pupil's menu, a long press clears. Each outcome has its own buzz so you never look; the name is huge on screen if you do. `planner/eyes-free.js` holds the letter reader (a point-cloud method that does not care about stroke order or direction; the class's own initials shrink the alphabet to 10 to 14 letters, which is where the accuracy comes from), the pupil matching, the tap rules and the pointer grouping: 55 checks (`node planner/tests/eyes-free.test.js`). On synthetic thumb letters it reads 96% of all 26 and 97% of a class's 12 initials; your own taught letters push it to 99%. The mock-up `lanes/mockups/eyes-free.html` runs the real code on a made-up class, with Teach (your hand), Try (a score out of 20) and a Picks panel; 14 browser checks (`python planner/tests/eyes_free_sim.py`). Design: `lanes/design-eyes-free.md`. Nothing touches Phone.html or Behaviour.gs yet: Lane B wires it in after your picks, through the same `log()` as a seat tap, so Undo, the offline queue and the board all see it as a normal tap.
- You need to: Waiting item 7 (a Try score and three picks).
- Save: see git log "Eyes-free behaviour entry".

### 30 Oct 2026, Lane C part 2, item 4: the day screen in your pick (B3), on the phone's new Day tab
- What changed: the phone has a new **Day** tab (first in the bottom bar). It is B3: your day as a timeline in navy and gold, each lesson a block in its class colour (with "built" or "?" for not planned), suggested blocks in free periods (marking, test reviews, chasing) and after school (lesson builds) with Yes or a cross, the shutdown card with "Done for today", the workload line with Ulhu (calm when it fits, stirring when it is over), coloured Start buttons for your likeliest timer jobs plus "More..." for the full picker, the quick-capture box at the top, and your to-dos with Ulhu's line above them and a gold rune when you tick one. Move sends a to-do to the next school day.
- The running timer is a bar fixed at the top of the screen, on every tab, with Stop; its Start buttons stay where they are. The lesson silence controls sit just under it.
- It opens at once from the copy saved on the phone, then fetches the latest. Every tap shows straight away and is put back with a message if there is no signal. It follows Light, Dark and Auto like the rest of the phone page.
- One change to the suggestions: your own small to-dos (like "ring the garage") stay in the list and count in the workload, but no longer get a block on the timeline, so the timeline only holds marking, tests, chasing and builds.
- The home PC pop-up is ready too (`planner/day-popup.js`): by day Ulhu's approved bubble with "Not that"; after 7pm your pick N3, dozing with one eye open, his line, tonight's tally per job, then "Fix my dreams in the report", and no button. It goes on the planner once the home PC timer exists.
- For Lane A: "Done for today" sends a `daydone` event on the phone page; Ulhu's "Done for today" ritual can tick from it. Also, `lanes/mockups/day-screen-b2.html` now has the design chat's night versions that are not in `day-screen-b2.src.html`, so don't re-run `make-b2.py` on it.
- Also fixed: Lane B removed the noise-limit call today (no more microphone), so the bridge's allowed list no longer names it; and one server check that failed only between midnight and 3am.
- Checks: 40 for the day screen and pop-up (`planner/tests/day_screen_sim.py`), 11 for the phone's Day tab (`day_phone_sim.py`), and the older phone, Friday, vote, memory-line, server and paste-set checks all still pass.
- You need to: paste the next complete set when Lane A makes it (Waiting item 5).
- Save: see git log "Day screen B3" (0646145c).
- For Lane B: that save also carried your unfinished Phone.html backdating and end-of-day reminder work (Phase 5): you changed the file between my check and my commit. I did not undo it; every phone check passes with it. Its server half (Behaviour.gs) is still yours to commit, and the phone page should not go into a paste set before it is.

### 29 Oct 2026, Lane C part 2: the timer picker and the capture box, ready but not attached
- What changed: the evening timer picker (`planner/day-timer.js`: your three likeliest jobs, then job, then class only for Marking, Building and Homework; a running chip with Stop) and the quick-capture box with the morning sort (`planner/day-capture.js`: Save or Enter, kept on the phone first so no signal loses nothing; each capture shows its suggested home with Yes or Other; Obsidian is never offered for a class or pupil capture). Both follow Light, Dark and Auto. 30 browser checks.
- Neither is on any page yet: they go onto the day screen once you pick A, B or C, and the timer picker once you say its design is fine.
- You need to: pick A, B or C (Waiting item 6), and say if the timer picker needs changing.
- Save: see git log "Evening timer picker", "Quick-capture box".

### 29 Oct 2026, Lane C part 2, items 3 and 4 (behind the screen): the day screen, capture box and evening timer
- What changed: the rules (`planner/day-logic.js`: where a capture goes, your to-do list of 7, the yesterday tag, suggested blocks with marking in frees and lesson builds after school, the workload line, nothing after 7pm, how a PC window becomes a job and class, the 2-hour stop, the fortnightly report) and the server side (`planner/Day.gs`: today's lessons and to-dos in one trip, saving and ticking, drop and move, captures, the shared timer, Done for today). 91 new checks. Captures about a pupil never go to Obsidian; Obsidian is never written until you pick the folder; the timer never stores window titles.
- Dark mode: the day screen and the timer will follow the same Light, Dark or Auto setting as the phone page (you asked, 29 Oct). The mock-up has both.
- Not yet: the screen itself (waits for your A, B or C pick), and captures for the order sheet, a class or a lesson land as labelled to-dos for now rather than inside the planner's lesson notes (that part is in the planner page, which Lane B owns).
- You need to: pick A, B or C (Waiting item 6). Nothing to paste yet: Day.gs joins the paste set with the screen.
- Saves: see git log "Day screen and evening timer rules", "Day.gs: the day screen".

### 29 Oct 2026, Lane C part 2, item 2 (installed app step 5, first half): talking to the server, and the outbox
- What changed: `app/src/api.js` is the one file every app screen will use to reach the planner's server (so moving off Google one day changes one file), and `app/src/outbox.js` holds taps made without signal and sends them in order when signal returns, the same way the phone page's queue works now, never counting a tap twice and setting aside one the server keeps refusing. 22 new checks in `app/tests/api.test.js`. Nothing you can see yet.
- You need to: nothing.
- Save: see git log "Installed app: server file and outbox".

### 29 Oct 2026, Lane C part 2, item 2 (installed app step 4, done early): the bridge
- What changed: a new server file `planner/Day.gs` lets the installed app talk to the planner's server from outside Google's page. It only answers with the planner key, and only for the calls the pages already use (behaviour, planner, Ulhu); everything else is refused. Code.gs is untouched. New check: `planner/tests/bridge.test.js` (17 checks), run with the rest of Lane C's checks by `node app/tests/run.js`.
- Steps 2 (moving the planner to your personal account) and 3 (the small school helper for Forms and Classroom) wait for the school test, so I built this one first because nothing waits on it.
- You need to: nothing yet. Day.gs joins the paste set when the planner moves to your personal account, not before (it would be a new script file to make for nothing yet).
- Save: see git log "Installed app bridge".

### 29 Oct 2026, Lane C part 2, item 2 (installed app step 1): the site and the school test page
- What changed: a new `app/` folder holds the installed app. For now it has a holding home page and the school test page (one button: checks your personal Apps Script can be reached from that PC, both for reading and sending, without writing anything; also lists what the browser can do: notifications, installing, offline). A browser test covers every result message.
- You need to: make the free Cloudflare account (Waiting item 3), then run the school test (item 4).
- Save: see git log "Installed app step 1".

### 29 Oct 2026, Lane C part 2, item 1: instant opening
- What changed: the phone page and the desktop planner now draw the copy they saved last time straight away, then swap in the fresh copy when Google answers. On the phone, the saved class shows at once; the board only moves when Google answers. On the planner, the saved week shows at once with "Saved copy from Thu 20:29, getting the latest..." and clicks wait (a short message says why) until the fresh copy lands, so nothing can be saved over newer data. With no signal both keep the saved copy instead of an error. New check: `planner/tests/instant_sim.py`.
- Slimmer phone view: the phone page also loads all of Ulhu's code and art (about 690 KB) every time it opens, even for a behaviour lesson. Making that load only when the Ulhu tab opens is Ulhu's code, so it is noted for Lane A, not done here.
- You need to: paste the next complete set when Lane A makes it (Waiting item 5).
- Save: see git log "Instant opening".

### 29 Oct 2026, Lane C part 1: the two design documents
- What changed: `lanes/design-installed-app.md` (the installed app: data move to your personal account, the server bridge, every screen, long jobs, notifications, sound, the evening timer, the day screen and quick-capture box, build order, tests, risks) and `lanes/design-memory-map.md` (the memory map for Lane B: a spec index because no spec codes exist in the data yet, evidence and score tabs, the fading maths with a worked example, the grid, Do Now suggestions, the daily update, carry-forward, build order, tests, risks).
- You need to: answer the four items above when you can; nothing is blocked yet.
- Saves: 26adcd8b (installed app), a67a3502 (memory map).
