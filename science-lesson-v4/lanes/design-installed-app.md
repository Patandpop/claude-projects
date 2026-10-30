# Design: the installed app (your day, Lane C)

Written 29 Oct 2026 by the Lane C design chat, from replica/design/grills/installed-app.md, day-screen.md, evening-timer.md and the Enabler line in FABLE-WORKPLAN.md. The builder (Lane C, Opus) follows this document and lanes/lane-c-build.txt. Patryk's decisions in the grill files win over anything here; where this document adds a detail the grills left open, it says "chosen here".

Plain English throughout. Code names appear only where the builder has to go to that file, each with a one-line explanation.

---

## 1. What it does

One app, installed on Patryk's Android phone and on his home PC as its own window, with tabs: Today (the day screen), Lesson (the behaviour page), Ulhu, Planner (week, day, classes), Homework, Assessment, Memory (built by Lane B), Friday, Settings. It opens instantly from the last saved screen, has no URL bar, keeps working without signal, can play Ulhu sounds and can send two kinds of notification.

It is the same planner, not a new one. The pages he uses today move across one at a time, most-used first, and the old-style links keep working the whole time on the same data.

**What it fixes, in his order:** launch speed and long jobs freezing the planner, updates going live without pasting, no URL bar, notifications, sound, desktop Ulhu.

**What it is not:** no new teaching features of its own (those belong to Lanes A and B), no paid service anywhere, no pupil data outside his own Google account, no pupil names in the repo.

---

## 2. Where the data lives

### 2.1 Today (for orientation)
- One Apps Script project on the **school** Google account, bound to the "Planner" Google Sheet in school Drive. It serves the planner page, the phone page and the board, deployed "Anyone within organisation" (the school blocks public school apps).
- Home and school talk through the **mailbox**: a tiny public web app on his personal account that reads and writes files in `Admin/Planner Sync` on his personal Drive. The school script calls it with a key.
- Behaviour data (pupil names), homework rows, results (class counts), MCQ votes, Ulhu's tabs: all in that one school Sheet.

### 2.2 After the move (the target)
Everything moves to his **personal** Google account (his informed decision, data-protection risk raised once in the grill). Only Classroom and the pupil Forms stay at school, because only the school account can make or read them.

| Thing | Where it lives after the move |
|---|---|
| The planner Sheet (all tabs: Data, Weeks, Equipment, Homework, Results, MCQ Votes, Behaviour Log, Students, Game tabs, and the new tabs below) | A Google Sheet called **Planner** in his personal Drive, made once from an Excel download of the school Sheet |
| The server code (Code.gs, Behaviour.gs, Game.gs and the HTML pages) | A new Apps Script project bound to that personal Sheet, deployed "Anyone" with the same `?key=` lock the mailbox uses today. This is the **data layer**. |
| The installed app's files (HTML, JavaScript, icons, service worker) | **Cloudflare Pages** (free), published from this repo's `app/` folder on every push. No data is ever stored at Cloudflare. |
| Planner Sync files (planner-data.json from home, requests for Claude, homework quiz files) | Same folder as now, `G:\My Drive\Beechen Cliff Science\Admin\Planner Sync`. The personal server reads them directly with DriveApp, so the mailbox is no longer needed for that. |
| Pupil Forms, Classroom drafts, Form responses | **School account.** A cut-down "school agent" script stays there (section 5.4). |
| Evening timer minutes, quick-capture inbox, to-dos, notification subscriptions | New tabs in the personal Planner Sheet (section 2.4) |
| Push notification keys and device subscriptions | A tiny Cloudflare Worker (free tier) holds the signing keys as secrets and the device subscriptions in its own key-value store. The subscriptions are browser push addresses, nothing about pupils. |
| Obsidian inbox note | One text note in a Drive folder his Obsidian vault syncs from (path to confirm, section 9) |

**Swappable by design (his long-term wish for "real apps"):** the app never calls Apps Script directly from screens. Every screen goes through one file, `app/src/api.js`, which has one function per server call (section 5). To move off Apps Script later, that one file changes and the screens do not.

### 2.3 Why the data has to move before the app can talk to it
A page hosted on Cloudflare can only call an Apps Script web app that is deployed "Anyone" (locked by key). The school project cannot be deployed that way (school policy), and a browser on another site cannot pass the school login along. The mailbox already proves the "Anyone + key" pattern works on the personal account. So the order is: move the data, then build the app against it (section 7).

### 2.4 New Sheet tabs (all in the personal Planner Sheet)
| Tab | Columns | Used by |
|---|---|---|
| **Jobs** | id, kind (orderSheet, homeworkDrafts, resultsRefresh, memoryUpdate, schoolAgent), askedAt, startedAt, doneAt, status (queued, running, done, failed), note, resultRef | long jobs (section 6.1) |
| **Todos** | id, text, due (day), addedOn, source (own, capture), status (open, done, dropped, moved), movedTo, minutes | day screen |
| **Inbox** | id, at, text, suggestedHome (orderSheet, class:9AS, lesson:9AS\|12, obsidian, todo), confirmedHome, status (new, filed), filedAt | quick capture |
| **Timer** | id, day, job (Marking, Building lessons, Admin, Emails, Setting homework, Personal), cls, minutes, source (pc, phone, free), startedAt, endedAt, maybe (true when the 2-hour stop or a guess ended it), taskRef, note | evening timer |
| **Timer Rules** | pattern (a word found in the app or window title), job, cls, enabled | evening timer PC mapping (editable list) |
| **Push** | deviceId, endpointHash, addedOn, kinds (morning, jobs), lastSent | notifications |
| **Day Settings** | key, value (shutdownTime 17:00, afterSchoolEnd 17:00, minutes per task kind, quietHoursOn, soundOn per device, obsidianFolder) | day screen, timer, sound |

Rules kept from CLAUDE.md: scripts only create or append; nothing on Drive is deleted, moved or renamed; every Drive write is logged (the planner's Log tab and the mailbox log already do this; the Obsidian append and any new file creation log the same way).

---

## 3. Every screen

The app is a plain HTML and JavaScript web app (no framework), the same style as Phone.html and Planner.html, so the builder can carry the existing screens across with their logic intact. Phone-width layouts come first; the desktop window shows the same screens with the planner grid widened, the way Planner.html does now.

### 3.1 Sign-in and first open
- First open asks for the planner key (the same `?key=` value as the old link; he pastes it once per device). It is kept in the browser's storage, never in the repo or the URL.
- Cloudflare Access (free for a handful of users) sits in front of the site and asks for his personal Google sign-in; only his address is allowed. This is the "personal Google account on phone, home PC and school PC" sign-in from the grill. Chosen here: Access on, key still required, so a lost phone shows nothing without both.
- If Access turns out to break the installed app's offline opening (its login cookie expires), the fallback is Access off and the key alone, as the planner works today. The school test page (section 3.12) checks this.

### 3.2 Today (the day screen, always the first tab)
From the day-screen grill. Top to bottom:
1. **Quick-capture box** at the very top: one line of text, a Save button. Text only. Saves to Inbox with a suggested home (section 3.11).
2. **Today's lessons strip:** P1 to P5 (or P6 where the timetable has it), each block in its class colour, class code, lesson title, a tick if the slides are built, a "?" if the planner's slot is empty. Tap opens that lesson's slot in the Planner tab.
3. **Workload line** under the strip: green "Fits" or amber "Over by N min". Minutes come from the to-do list (default minutes per kind, editable in Settings: mark a class set 60, chase a pupil 5, build a lesson 40, book-marking ritual 120). Time available = free periods today + after-school window (last lesson end to his set end, default 17:00). Nothing after 19:00 ever counts.
4. **To-dos**, at most 7 shown, the rest under "more":
   - lessons in the next 2 days not built;
   - marking due (key homework past its mark-by day, tests waiting for a review lesson);
   - pupils to chase (from homework status: not handed in);
   - rituals due today (from Ulhu's goals; ticking here calls the same tick as the Ulhu tab);
   - his own typed to-dos and confirmed captures.
   Each row: tick, Move (tomorrow, or pick a day), Drop (hides today only; planner-known items return tomorrow; his own typed to-dos are gone for good). Leftovers from yesterday show a small "yesterday" tag in the same list.
5. **Suggested blocks (ghosts)** in free periods and the after-school window: faded, "Mark 9AS books (60 min)", one tap accepts (it becomes a planned block for that period, saved to Todos with a time), x or swipe dismisses. Free periods get marking, tests and chasing; lesson builds are suggested only for after-school time. Placement rule: most urgent first, fixed rules, no AI. Nothing is saved until accepted.
6. **Evening timer chip:** "Start: Marking 9AS" showing his 3 likeliest jobs from today's classes; tap starts; a running timer shows the job and elapsed minutes with Stop. (Section 3.9.)
7. **Rituals** at the bottom (today's due rituals, same ticks as the Ulhu tab).
8. **Ulhu in a corner**, small: calm when the list is short, stirs when the workload line is amber. Tapping him opens the Ulhu tab. His art is Lane A's; the day screen only asks the game UI for the small idle and stirring sprites.
9. **Shutdown prompt** at his set time (default 17:00, never after 19:00): a gentle card: finished today, leftovers rolling to tomorrow (tagged "yesterday"), one "Done for today" button. Pressing it before 19:00 stops the timer, ticks the ritual called "Done for today" (made once through the normal Ulhu add-ritual screen, or by the app's setup through the existing save-goal call), and plays Ulhu's settle-to-sleep animation (Lane A supplies the sprite).
10. **Memory card** (once Lane B's memory map exists): today's classes with their 3 reddest spots, as the memory-map design says.
11. **Timer report card** every second week: "Where your time went", opens the report page (section 3.10).

### 3.3 Lesson (the behaviour page, moved as it is)
Everything Phone.html does now: class chips, seating plan, Plan and Names, positives and points with the offline queue, ABCD votes, silence and timers, time lost, the Friday list. Moved across whole; the only change is the transport (section 5.1). The old phone tab called "Today" (today in this class, positives, settings) becomes "This class" so it does not clash with the day screen.

### 3.4 Ulhu
The Ulhu tab exactly as on the phone page now, with Lane A's game files included by the app build. Lane C does not edit any game file. Extras the installed app enables: sound on Ulhu moments (tick, level up, faint, return from adventure) with a mute button, off by default on the phone, on by default on the home PC; the desktop window on the home PC is "desktop Ulhu".

### 3.5 Planner (Week, Day, Classes)
Planner.html's three main views, moved as they are: the week grid with drag and undo, the one-day view with kit, the classes view. Same editor, same build prompt, same Send to Claude. Phone width shows one day at a time; the desktop window shows the week.

### 3.6 Homework and Assessment
Planner.html's Homework and Assessment tabs, moved as they are. "Make the drafts" becomes a background job (section 6.1) because it needs the school agent.

### 3.7 Memory
Lane B builds the memory map inside Planner.html; the app carries that screen across after it exists (same transport). Not Lane C's to design.

### 3.8 Friday
The Friday message list from the phone page, as it is.

### 3.9 Timer (evening timer, phone side)
- A home-screen shortcut (a manifest shortcut: long-press the app icon on Android gives "Start timer" and "Capture") opens straight to a picker with the 3 likeliest jobs for today (Marking, Building or Setting homework for today's classes, most recent first), then the full two-tap picker (job, then class if the job carries one).
- One shared timer: starting a new job stops the old one, on either device. The running timer lives in the Timer tab (an open row with no end); each device shows it.
- In a free period at school: when the free starts, the Today screen offers "Start: book marking 9AS" if the planner's task list has a task set for that free. It stops when the free ends or earlier on Stop. Phone only at school; nothing on school PCs.
- A forgotten phone timer stops when the PC sees another job or after 2 hours, flagged "maybe"; he can edit any row.

### 3.10 Timer report
A full page, opened from the fortnightly card: hours per job and per class over the last two weeks, biggest drain on top, one plain line suggesting what could be automated next (a fixed rule: the biggest job that is not Personal). A list of "maybe" rows to fix. Setter feedback: when a task of the same kind and class is set again, the task row shows "last time this took about N frees / N min" (suggests only).

### 3.11 Inbox (the morning sort)
Captures land here and show on the Today screen each morning under "Inbox" with their suggested home and one-tap confirm, or tap to pick another:
- order words (beakers, bunsen, order, technician, kit, prep) go to the order sheet: confirming adds the text to the technician box of the next relevant lesson's equipment field;
- a class code (7MLA, 8XP, 8AG, 9AS, 9XS, 10C2, 10S2, 11S2, 12C, 13D) goes to that class: confirming attaches a note to the class's next lesson (the same carry-note mechanism the planner has for "review not finished");
- "L4" or "lesson 4" with a class goes to that lesson's slot note;
- a pupil-looking name or the words pupil, parent, email home, chase: stays in the planner as a to-do for that class (never Obsidian);
- everything else: Obsidian, appended to the "Inbox from planner" note as a dated bullet.
Plain keyword rules in one small function with tests; no AI.

### 3.12 The school test page (built first, two minutes at school)
A single static page on the same Cloudflare site, `/test`, with three checks and a plain result for each:
1. **Personal Google sign-in on the school PC:** if the page opens behind Cloudflare Access at all, this passed.
2. **Can a page here talk to a personal Apps Script web app:** a button that calls the mailbox's ping with the key he types; shows "works" or the error.
3. **Direct updates to the school project:** this cannot be tested from a web page. It is tested from the home PC instead: the command-line tool for Apps Script (clasp) is logged in with the school account once at home; if the school allows the Apps Script API, a push to the school project succeeds. The token stays on the home PC and is never committed. If it is blocked, only the personal project gets direct updates, which is enough once the data has moved.
The page also prints the browser's push and install support, so the builder knows what the school PC can do.

### 3.13 Settings
Key, sound (per device), quiet hours (fixed rule, shown not edited), shutdown time, after-school end, default minutes per task kind, timer rules (the website-to-job list), Obsidian folder, notification kinds on or off, "show the old links", app version and build stamp.

---

## 4. Offline and instant opening
- **Instant opening:** every screen saves its last data in the browser's storage; the app draws that first, then refreshes. The service worker caches the app's files, so it opens with no network at all.
- **Taps without signal:** positives and points, Ulhu ticks, timer start and stop, captures and to-do ticks go into one outbox (the phone page's tap queue, generalised), each with its own id and time, and are sent in order when signal returns. The server already refuses the same tap id twice (behaviour and Ulhu both do), so a resend never pays twice.
- **Reads while offline:** the last copy of every screen, marked "as of 08:12".

---

## 5. Every server call

### 5.1 The bridge (one small addition to the server)
Today the pages call server functions through Google's in-page bridge, which only works inside an Apps Script page. The app cannot use it. Add to Code.gs one dispatcher: a POST handler (`doPost`) that reads `{ key, fn, args }` as plain text, checks the key, allows only a fixed list of function names, calls that function with the arguments, and returns `{ ok, result }` or `{ ok: false, error }` as JSON. GET keeps serving the pages and the board's existing `api=` calls.

The pages get a tiny transport shim: the existing `call()` in Phone.html and `run()` in Planner.html keep their names; if Google's bridge is present they use it, otherwise they POST to the server URL with the stored key. One source file then serves both the pasted Apps Script copy and the installed app; nothing diverges. (Lane A owns the Ulhu parts of Phone.html; the shim is a small addition outside them, committed at once, and said in the log.)

Cross-site rules: plain-text POST and GET with "follow redirects" are the two shapes Apps Script accepts from another site; JSON content-type would be refused. Verified by the test page before anything else is built.

### 5.2 Calls carried across unchanged (already exist; the allowed list for the bridge)
Behaviour: init, openClass, logEvent, logMany, removeEvent, removeMany, positivesOver, getMode, setMode, setLive, setLost, setSupport, getSilence, setLimit, showRecap, stopRecap, setTimer, adjustTimer, stopTimer, setPause, endMode, getFriday, markEmailed, lessonMcqs, saveVote, removeVote.
Planner: loadAll, saveWeek, saveWeeks, saveLessonChanges, saveLessons, saveClassSetting, learnEquipment, createLesson, renameAdded, sendRequest, pushHome, behaviourWeek, syncWeek, myEvents, homeworkList, checkHomework, setHomework, homeworkStatus, markHomework, homeworkResults, setGradeBands, turnOnDailyResults, setBehaviourUrl, exportXlsx (becomes a job, below).
Ulhu: every public `game...` function in Game.gs (gameLoad, gameTick, gameUntick, gameSaveGoal, gameAim, gameVespers and the rest). The app passes the same tap metadata (time made, tap id) the phone page passes now.

### 5.3 New calls (Lane C adds them in a new server file `Day.gs`, chosen here so Lane B's Code.gs edits never collide; bundle.js learns the extra file)
| Call | What it does |
|---|---|
| `dayLoad(k, day)` | Everything the Today screen needs in one trip: today's lessons with built flags, free periods and after-school window from the timetable and period times, to-dos (open, with yesterday's leftovers), marking due, pupils to chase (from the cached homework status), rituals due (from the game's snapshot), inbox items, running timer, memory card (when present), settings. |
| `todoSave(k, todo)` / `todoSet(k, id, status, movedTo)` | Add or change a to-do (done, dropped, moved). A "dropped" planner-known item is recorded for today only. |
| `blockAccept(k, block)` | Saves an accepted ghost block as a timed to-do. |
| `doneForToday(k, at)` | Stops any running timer, records the day as shut down, and ticks the "Done for today" ritual through the game's own tick (no reward maths of its own). |
| `captureSave(k, text, at, id)` / `captureFile(k, id, home)` | Save a capture (idempotent on id); file it to its confirmed home: order sheet text, class note, lesson note, to-do, or the Obsidian append. |
| `timerStart(k, job, cls, at, source, taskRef)` / `timerStop(k, at)` / `timerLog(k, rows)` / `timerEdit(k, id, fields)` / `timerReport(k, from, to)` | The shared timer and the PC's batch log of minutes (job, class, minutes only; never window titles). |
| `timerRules(k)` / `timerRulesSave(k, rows)` | The editable website-to-job list. |
| `jobStart(k, kind, args)` / `jobStatus(k, id)` | Long jobs (section 6.1). |
| `pushSave(k, sub, kinds)` / `pushRemove(k, deviceId)` | Device subscriptions for notifications. |
| `daySettings(k)` / `daySettingsSave(k, obj)` | Settings above. |
| `schoolAgentPoll(k)` / `schoolAgentDone(k, id, result)` | Used only by the school agent (section 5.4). |

### 5.4 The school agent (what stays at school)
A small Apps Script on the school account, kept from today's Code.gs: the Forms quiz builder, the Classroom draft maker, and the Form results reader. It has no page. On a time trigger (every 15 minutes in school hours, plus 06:00 for results) it:
1. calls the personal server's `schoolAgentPoll` for queued jobs of kind homeworkDrafts;
2. makes the Forms and Classroom drafts from the quiz files it is given (the quiz JSON travels inside the job), and reports back with `schoolAgentDone` (form ids and links, the homework rows);
3. at 06:00 reads every Form set in the last 10 weeks and pushes the results. Class-level counts go to the Results tab as now. Per-pupil results (names, scores, late) also go, into a "Results Pupils" tab, because he chose to hold pupil data in his personal account; they never go anywhere else and never into the repo. The builder adds the same no-names test for anything synced to the repo or Cloudflare.
The agent is the only code left on the school account and it never serves a page, so the school's "no public apps" rule does not touch it.

---

## 6. Long jobs, notifications, sound

### 6.1 Long jobs run in the background
Order sheet Excel, homework drafts, results refresh, memory update. `jobStart` writes a Jobs row and creates a one-off time trigger for a few seconds later that runs the job and writes done or failed with a note. The app shows a small "making order sheet..." pill, polls `jobStatus` every 10 seconds while the app is open, and shows "order sheet ready" with a link when done. Every screen stays usable. Test making is still done at home by Claude through requests, and its "done" shows the same way from requests-done.

### 6.2 Notifications (two kinds only)
- **Morning:** "Today: 9AS P2 Latent Heat not built, 10S2 P4 not built" (class codes and lesson titles only, never names). Sent 07:00 on school days only; nothing at weekends, INSET or holidays (from the term dates in planner-data). Quiet hours are 07:00 to 19:00 on school days, so this is the one allowed morning message.
- **Job finished:** when a long job finishes and the app is not in front.
How: the browser's standard push needs a signed message from a server. Apps Script cannot sign them, so a tiny Cloudflare Worker (free tier, no paid plan) does: the personal server's 06:50 trigger works out the text and calls the Worker; the Worker signs and sends to every subscribed device. Job-finished messages: the app's own service worker shows them when its poll sees the job done; if the app is closed, the server asks the Worker. No Ulhu nudges in this build (companion grill, later; the same Worker will carry them).

### 6.3 Sound
Only Ulhu moments: tick, level up, faint, return from adventure. One mute button in the header. Default: muted on the phone, on in the home PC window. Respects the phone's silent switch. The sound files are small original files in `app/sounds/`.

---

## 7. The order to build it in

The lane file sets the big order (quick wins in the current app, then the installed app, then the evening timer, then the day screen). Inside the installed app, this order:

1. **Cloudflare site and the test page.** Patryk makes a free Cloudflare account and connects this GitHub repo (plain steps in the log). Pages builds `app/dist` from `app/` with `node app/build.js`. The test page goes live. Cloudflare Access with his Google address. He runs the test at school.
2. **The data move (one evening, home).** He downloads the school Planner Sheet as Excel at school and uploads it at home; a one-off setup script (`app/setup/move-planner.js`, run at home, creates only) turns it into the personal Planner Sheet and reports every tab and row count against the Excel. New personal Apps Script project: the same bundle pasted once (or pushed with clasp from the home PC). Script properties set (the key, template form id; Planner Sync is read directly now). Deploy "Anyone". The school Sheet stays untouched as a backup. The old-style links now point at the personal project's pages, same screens, no feature loss.
3. **The school agent** cut from Code.gs and left on the school account; the personal server gets its poll and done calls; homework drafts become a job.
4. **The bridge and the shim** (5.1), with tests. Direct updates: clasp push from the home PC to the personal project, token kept out of git.
5. **App shell:** manifest, icons (the Ulhu icon already in Planner Sync), service worker, key entry, settings, last-screen cache, outbox. Installable on phone and PC.
6. **Screens, most-used first:** Lesson (behaviour page), Ulhu, Friday, then Planner week and day, Homework, Assessment, then Memory when Lane B has it.
7. **Background jobs** and the pills.
8. **Notifications** (Worker, subscriptions, morning and job-done, quiet hours from term dates).
9. **Sound** and the desktop window on the home PC.
10. **Evening timer:** PC logging through ActivityWatch's local interface (section 8), the phone picker and shortcut, the free-period offer, the report page and the setter hint.
11. **Day screen and quick capture:** Today tab, to-dos, ghost blocks, workload line, shutdown, Done for today, Inbox sort, Obsidian append.
12. **Retire** the old pages only when he says so.

Each step ends with its tests green, a commit by explicit paths, a push, and one or two plain lines to Patryk. Visual screens (Today, timer picker, report, pills) get a mock-up and his pick first, as COMMON.md says.

---

## 8. How the evening timer logs by itself on the home PC
- Patryk installs **ActivityWatch** (free, local, open source) once; plain steps in the log. It records which program and website are in front and when the PC is idle (its own 5-minute idle rule matches the grill).
- The installed app, when open on the home PC, reads ActivityWatch's local interface (a local web address on the same PC; browsers allow a secure page to talk to the local machine). It reads only the events since its last sync, maps each to a job with the Timer Rules list (Gmail = Emails, a lesson PowerPoint = Building lessons, the planner = Admin, anything unmatched = Personal), guesses the class from a file or folder name like "Latent Heat 9AS", adds up minutes per job and class, and sends only those totals. Window titles never leave the PC.
- When a new job starts, a small Little Ulhu pop-up in the app's corner says what it is tracking, with one "not that" button; silence is yes. After 19:00 the pop-ups stop; un-confirming moves to the report.
- If the app was closed, the next open back-fills the gap from ActivityWatch's own record, silently.
- A starting rules list is proposed in the log for him to edit: Gmail and Outlook = Emails; PowerPoint, Word, the lessons folder = Building lessons; the planner, Arbor, the order sheet = Admin; Google Classroom and Forms = Setting homework; YouTube and everything else = Personal.
- A paper-marking session is the phone's job (section 3.9).

---

## 9. Open questions for Patryk (asked in the lane chat; the builder carries on with the pick)
1. **Obsidian inbox folder.** Where should the "Inbox from planner" note live so the vault picks it up? (a) `G:\My Drive\Obsidian\Inbox from planner.md` with the vault syncing that folder (my pick); (b) a folder he names; (c) inside `Beechen Cliff Science\Admin\` and he points the vault at it. Until answered the folder is a setting with (a) as the default, and nothing is written until he confirms the path.
2. **Per-pupil homework results in the personal Sheet** (section 5.4 point 3). The grill says everything moves; the earlier learning-loop spec kept per-pupil results at school. Default here: they move, as he decided. Say "keep them at school" if that changed.

---

## 10. How it is tested
- `app/tests/` run with `node app/tests/run.js` (added to the lane's pre-commit list): the API file against a fake server (every call shape, error shape, retry); the outbox (order kept, same id never sent twice, survives a reload); the day screen rules (to-do sources, 7-item fold, yesterday tag, drop and move, ghost placement most-urgent-first, workload line, never after 19:00); capture sorting rules (each route, class and pupil words never go to Obsidian); timer rules (mapping, class guess, 2-hour stop flagged maybe, one task over several sittings adds up); quiet hours against the term dates (weekend, INSET, holiday, 06:59, 19:01).
- `python app/tests/app_sim.py`, like the phone and vote sims: headless Chromium opens the built app against a fake server, installs the service worker, goes offline, taps, comes back online, and checks the outbox drains and the last screen was shown instantly.
- Server tests: `planner/tests/server.test.js` grows cases for the bridge (unknown function refused, bad key refused, result shape) and for every new call in Day.gs, using the existing fake Apps Script.
- A no-names test over `app/` and `app/dist` and over anything sent to the Worker (the morning message builder), like the learning loop's test.
- The data move script is tested against a small fake Excel export before the real one.
- Lane rules: all checks green before each commit; `npm test` at the root still runs.

---

## 11. Risks and what to do about them
| Risk | What to do |
|---|---|
| The school PC cannot reach a personal Apps Script page or the Cloudflare site | The test page decides before any build. If blocked, the phone (own data) covers school; the school PC keeps the old-style link only. |
| Cloudflare Access cookie expiry breaks offline opening on the phone | Access off, key only (3.1). Decide from the sim and one week of real use. |
| Cross-site calls to Apps Script fail in some shape | Only the two accepted shapes (5.1), verified by the test page. |
| The data move misses a tab or a formula cell | The move script reports tab and row counts against the Excel; the school Sheet stays as backup; he keeps using the old link until the counts match. |
| Two servers for a while (school agent + personal) drift | The agent is cut from the same Code.gs source and gets the same tests; its only job is Forms, Classroom and results. |
| Push notifications need a Worker he has not set up | Plain steps in the log; until then the app shows the morning list on open and job-done pills in the app; nothing else is lost. |
| ActivityWatch's local interface refuses the app's origin | Its settings allow listing the site; step in the install notes. If it still refuses, fall back to a tiny local sync script run by Windows Task Scheduler, sending totals only. |
| Pupil names leaking | Names only ever inside his Google account. No-names tests over the repo, the app build and the Worker messages. Never in notifications, never in the Obsidian note (class and pupil captures stay in the planner). |
| Long jobs hit Apps Script's time limit | Jobs run on their own trigger with up to six minutes; the order sheet and drafts finish well inside it; a failed job shows its note and can be retried. |
| Files that are Lane A's or Lane B's | Lane C edits none of them. Shim and Day.gs are Lane C's; one-line hooks elsewhere are committed at once and named in the log. |
| Working after 19:00 | The app never starts automatic work after 19:00; the 06:50 trigger and the 06:00 agent run are the only scheduled jobs. |

## 12. Later additions (design chat, 30 Oct 2026)

Built elsewhere, waiting for the day screen to pick them up when the builder gets there. None of these change the data model.
- **Open and Print on the home PC:** `node planner/tools/open-lesson.js today` opens a lesson's files in order; `pack` makes the week's print pack (lanes/design-lesson-launcher.md). On the desktop copy of the app, each lesson block gets an "Open" button and the Today card a "Print this week" button that run those commands (the browser cannot run them itself: the desktop app needs a tiny local helper, or the buttons copy the command to the clipboard until there is one).
- **"Built ahead" line:** `planner/tools/build-ahead.log` (lanes/design-build-ahead.md) holds one line per afternoon run. The Today card shows the latest line when it is from today ("9AS L4 built at 16:40"), under the lessons strip.
- **Blind mode in the Lesson tab:** eyes-free behaviour entry (lanes/design-eyes-free.md) is Lane B's to wire into Phone.html; the app's Lesson tab inherits it with the page.
- **Mock-ups on the site:** `app/src/mockups/` holds copies of the lane mock-ups (index at `/mockups/`), so Patryk can pick on his phone. `app/tests/mockups.test.js` keeps the copies equal to their sources. They carry made-up classes only.
