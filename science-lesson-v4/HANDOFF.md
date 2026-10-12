# Behaviour app: handoff for Claude Code

Read this first. It covers what the app is, how it is built and deployed, how every important behaviour works, what the user wants and does not want, what is tested, and what is still open.

Current stamps: server `VERSION = 19` (Code.gs), phone "App version 19", board "Board version 24".

---

## 1. The user and how to work with him

- **Patryk**, early career teacher (physics/science) at Beechen Cliff School, Bath, UK secondary. Teaches Years 7 to 13 across 12 classes on a Week A / Week B timetable. Technical and builds his own tools.
- **Devices:** Android phone (Chrome) for logging in lessons. School Windows PC (Brave) connected to the classroom screen runs the board and has the microphone.
- **School Google Workspace** (beechencliff.mnsp.org.uk) blocks public web app deployments. The app must stay "Anyone within organisation".
- **Style:** direct and concise. No filler. No em-dashes. Nothing that sounds like generic AI writing. This applies to everything written for him, including docs.
- **How he works:** sends phone and PC screenshots, describes problems in plain words (often typos, read for meaning), and likes options. For any non-trivial visual or behaviour change he wants mock-ups or options with a recommended choice first, then says "build it". Do not make big changes without that.
- **He gets frustrated by regressions.** Test before delivering. The most repeated complaint was the board window size changing or breaking. Never change the pop-out window size without asking (see section 7).
- **He tests in real lessons**, so anything that can fail silently (a lost tap, a frozen board) matters more than polish.

### Hard product rules (do not break)

- **Never show negatives to students.** The board shows positives only. Negatives exist only on the teacher's phone.
- No class goal or % shown permanently on the board (the % appears only as the end-of-silence count up).
- No lesson phase strip. No border drawn around the whole screen. No "listen now" button. No half positives. No automatic feed to the tutor-group league (other staff also give positives). No "show today's positives" recap button (removed on purpose).
- Do not put the phone settings (tap behaviour, theme, wake lock) on the Lesson tab. They live under Today > Settings.
- Positives are one tap by default. Multi-select is not on by default. Both are changeable in settings.

---

## 2. What the system is

Three files plus a Google Sheet:

| File | What it is |
| --- | --- |
| `Code.gs` | Apps Script server. Reads and writes the Sheet, holds the silence/timer state, serves the two pages. |
| `Phone.html` | Teacher UI on the phone: class chips, seating plan, one-tap positives, silence and timer controls, Today and Friday tabs, settings. |
| `BoardPage.html` | Page opened on the classroom PC. Draws a small board into a canvas, streams it into a `<video>`, and pops that out as picture-in-picture so it floats over a full-screen PowerPoint. Also runs the microphone and the silence logic. |

`Board.html` (old standalone local file) and the JSONP endpoints in `doGet` (`api=board`, `api=live`, `api=result`) are obsolete. Do not extend them. Safe to delete.

Data flow: phone and board both talk to the server with `google.script.run` (not HTTP fetch), because HTTP from outside Google's page hits CORS and cookie problems under the org-restricted deployment. The board polls `getBoard` about once a second. The phone polls `getMode`. The phone starts a silence; the board (which owns the microphone) runs it and reports the result back with `submitResult`.

---

## 3. Deployment

- Apps Script project bound to the Google Sheet. Web app, **Execute as: me**, **Who has access: Anyone within organisation**.
- URL pattern (the real deployment ID and key are in the user's Apps Script, not in this document, because this file may be committed):
  - Phone: `https://script.google.com/a/macros/beechencliff.mnsp.org.uk/s/<DEPLOYMENT_ID>/exec?key=<KEY>`
  - Board: same URL plus `&view=board`
- `KEY` and `SHEET_ID` live in Script Properties. `setup()` (run once from the editor) writes `SHEET_ID`, creates a `KEY` if missing, and creates the tabs.
- Every server function takes the key as its first argument (`check_(k)`). The client wrapper `call(fn, ...args)` adds it.
- `doGet` renders `Phone` or `BoardPage` with `HtmlService.createTemplateFromFile`. The only template tags are `<?= key ?>` and `<?= manifestUrl ?>`. Do not type `<?` anywhere else in those files.

### How to update the live app

1. Paste `Code.gs`, `Phone.html`, `BoardPage.html` into the Apps Script project (same file names; HTML files are named `Phone` and `BoardPage`).
2. Press Ctrl+S. Unsaved changes are not deployed.
3. Deploy > Manage deployments > pencil > Version: **New version** > Deploy. Leaving the old version number selected keeps the old code live. This was the cause of several "it's still broken" reports.
4. Phone: close the app completely, reopen the link. Board: reload.
5. Check the stamps: phone header shows `(app N, server M)`, bottom of Today shows `App version N`, board shows `Board version N`. Bump all of them whenever a file changes:
   - `Code.gs`: `const VERSION`
   - `Phone.html`: `App version N` (Settings area) and `(app N, server ...)` in the init handler
   - `BoardPage.html`: `Board version N`
- Alternative while iterating: Deploy > Test deployments gives a `/dev` URL that always runs the latest saved code (add `?key=...`). Works for the owner only.

---

## 4. Google Sheet

Tabs created by `setup()`:

| Tab | Columns |
| --- | --- |
| Students | Class, Name, Short, X, Y, Ratio, **Support** |
| Log | Timestamp, Class, Name, Type, Rule, Rule name |
| Sessions | Start, Class, Mode, Monitored (s), Red (s), Settle (s) |
| Emails | Date, Class, Name |
| Settings | Setting, Value (STANDARD, STEP, SENSITIVITY, COUNTDOWN_SECS, EMAIL_GAP_DAYS) |

Notes:

- **Sheets formula gotcha (caused a major bug).** A cell value starting with `+`, `-` or `=` is parsed as a formula and becomes `#ERROR!`. The Log therefore stores the words `Positive`, `Negative`, `Report to me` (`TYPE_WORD`) and converts back on read (`WORD_TYPE`). Never write raw `+` or `-` into a cell.
- **Students.** X and Y are the seat position as a percentage of the seating plan image; Ratio is image width / height. Blank or 0 means "not on the plan". `Short` is first name plus first letter of surname (two letters if two students clash). **Support** is `prompt` (blue border on the phone) or `extend` (purple border), edited from the phone with `setSupport`.
- `setup()` creates the Students header without `Support`; `setSupport` adds the header the first time. Minor: add `Support` to the setup header list.
- `Students.csv` (347 students, 12 classes) is imported through File > Import > Replace current sheet. It was generated by OCR of the seating-plan PowerPoint images matched to the SEND register spreadsheet. 10C2 was later re-read from a school-system screenshot. Support was filled from the register: "Top 5" gives `extend`; "Bottom 5", or a category starting with K or E (SEN support, EHCP), gives `prompt`. That mapping is a heuristic the user can edit.
- **Students.csv is deliberately not included in the handoff zip: it contains real student names. Keep it out of any git repo.**
- `google.script.run` can only return plain JSON. A `Date` object in a result makes the whole call fail. Convert before returning.

---

## 5. Classes, rules, timetable

- Classes: 7BYA, 7ML, 8AG, 8XP, 9AS, 9XS, PSHE-9AB, 10C2, 10S2, 11S2, 12C, 13D.
- Week A starts Monday 2026-09-07 (`WEEK_A_START`). The A/B sequence carries on across holidays: only weeks with a term day count (`TERMS`, 2026/27 dates), so w/c 19 Oct = A and w/c 2 Nov = B (Patryk, 2026-10-03; server version 19). Same rule as science-lesson/references/school-classes.js. Update `TERMS` each September. `TIMETABLE` in Code.gs maps class to days for A and B. 8AG and PSHE-9AB are reviewed per fortnight (`FORTNIGHTLY`).
- User's classroom rules: 1 Beauty (positive), 2 Work ethic, 3 Quality (report to me), 4 Attention, 5 Voice, 6 Lab safety, 7 Fixed stations, 8 Silent entry, 9 Exit routine. Two negatives mean a detention and a call for support. `RULES` in Code.gs currently holds 2 to 8.
- **Report to me** requires a rule and counts as a negative. A **second negative** (which makes a detention) opens an optional reason picker (same rule keys plus Skip); the reason is stored in the Log's Rule column.

---

## 6. Server (Code.gs)

Functions the clients call (all take `k` first):

| Function | Purpose |
| --- | --- |
| `init` | Classes, today's classes, week letter, rules, current mode, version. |
| `openClass(cls)` | Students (with seat, support), ratio, today's events, today's silent-time %. Also sets the board's class. |
| `logEvent`, `logMany` (`cls, name(s), type, rule, tapTime`) | Append to Log. `tapTime` is when the phone tapped (used for taps saved offline); ignored if implausible (more than 36 h old or in the future). Negatives may carry a rule. |
| `removeEvent`, `removeMany` | Undo. |
| `positivesOver(cls, days)` | Positives in the last N days. |
| `setMode(mode, cls, secs)` | Start a silence: `countdown`, `entry` or `work`. For `work` it creates a timer of `secs` if none is running, or keeps the running one. |
| `endMode(cancel)` | Ends the silence. `cancel = true` means it is not recorded. |
| `setTimer(kind, cls, seconds)`, `adjustTimer(deltaSeconds)`, `stopTimer` | Timer stored in Script Property `TIMER` (`{kind, cls, end, total}`). `adjustTimer` never goes below zero. |
| `getMode` | Current mode, timer, live noise state (`quiet/amber/red`), `board` (time the board last checked in, for the phone's dot), server `now`. |
| `getBoard(n)` | Called by the board about once a second: class, up to n short names with positives today, mode, `now`, version. Also records `boardSeen`. |
| `setLive(sid, state)` | Board reports quiet/amber/red so the phone strip shows it. |
| `submitResult(sid, mon, red, settle, end)` | Board reports a finished silence: seconds monitored, seconds red, settle time. Appends a Sessions row (not for cancelled). |
| `getSilence(cls)` | Today's silent-time %. |
| `getFriday` | Weekly review per class (see section 8). |
| `markEmailed(picks)` | Records students picked for positive emails home. |
| `setSupport(cls, name, val)` | Writes the Support column. |

State: Script Properties `KEY`, `SHEET_ID`, `MODE`, `TIMER`, `LIMIT_DB`; CacheService `sess_<sid>`, `live_<sid>`, `boardSeen`.

Mode definitions (`MODES`, `startSilence_`):

- `countdown`: 3 second count (`COUNTDOWN_SECS`), grace 0 (listens straight after the count).
- `entry`: grace 2 s (statement), no count.
- `work`: grace 3 s (statement), always has a timer.
- Modes switch themselves back to teaching after a maximum (`max`) and when a result is recorded with `end`.

**Silent-time %:** `silenceToday_` sums `Monitored` and `Red` over every recorded session for the class today (countdowns and entries included) and returns `round(100 * (1 - red / monitored))`. Cancelled silences are never recorded. This weighting by seconds is intentional. Whether countdown and entry sessions should be included is a design decision worth confirming with the user.

---

## 7. Board (BoardPage.html)

### Window and picture size (the thing he cares about most)

- The picture is **204 x 78** logical pixels. 204 wide is the size of the red corner box on his slides (top right). Height was reduced by a fifth from 98 to 78 on request.
- The floating picture-in-picture window opens at the size of the picture. Chrome enforces a minimum PiP size and ignores sizes it dislikes, so earlier attempts with very thin strips opened bigger than drawn.
- Sharper text without changing size: the canvas starts at 204 x 78 (SCALE 1). 800 ms after PiP opens it switches to 408 x 156 (SCALE 2, same aspect ratio). Resizing the canvas while streaming once froze the window, so a watchdog watches frame delivery: if frames stop after the switch it drops back to SCALE 1 and stores `sharp = off` in localStorage so it does not try again.
- Frames are pushed explicitly (`MediaStreamTrackGenerator`, or `captureStream(0)` + `requestFrame()`) after every `draw()`, because browsers throttle hidden tabs. A second watchdog switches video source if frames do not arrive for 4 s.
- Brave does not autoplay the video, so the Pop out click starts it, waits for metadata, then calls `requestPictureInPicture()`.
- All drawing is laid out for 204 x 78 only. Do not change W/H without asking.

### Microphone

- Google's page frame cannot use the microphone. "Turn on microphone" opens a small helper window (`window.open('', 'board_mic', ...)`) that listens and calls `window.opener.onMicLevel(db)` about 10 times a second. `micFresh()` is true if a level arrived in the last 800 ms.
- Settings on the board page (stored in localStorage): `baseline` (quiet level in dB, e.g. -89), `limitDb` (default 13 dB above quiet), `entryDb` (extra allowance for silent entry, default +6), `entryMin` (seconds before entry may pass, default 30), `sharp`.
- The panel shows "Room now", a bar with quiet and trip marks, and plus/minus controls for each setting. Changes apply immediately, even mid-silence. "Measure quiet level now" takes the 20th percentile of 5 s.
- **Smoothing (`smooth`)**: keeps the last 10 readings, floored at quiet level - 6 dB (some mics gate silence to almost nothing); a LONE reading more than 12 dB above max(median, quiet level) is treated as that level (rejects single bangs); the rest are averaged by energy. (2026-10-07)
- **Thresholds** (`step`, runs every 100 ms from the audio clock, or from a 100 ms interval if the audio clock is not running; all timing uses real elapsed time):
  - `over` = level > baseline + limit (+ entry allowance in silent entry).
  - **Trip** after 2.5 s of continuous `over`. **Clear** only after 1.75 s continuously below limit minus 3 dB (hysteresis).
  - **Countdown/entry accepted** after `ACCEPT = 2.8` s of continuous quiet (was 1.8, Patryk 2026-10-07). Entry also needs `entryMin` seconds first.
  - Scoring is per second: a second is loud if the warning was tripped at any point in it, or the level was over for at least 0.5 s of it. Timeline and % both use these seconds, so they always agree.
- If no baseline exists, the first silence measures one.
- Known environment problem: Windows audio enhancements (automatic gain) cannot be turned off on the school PC, so the quiet level drifts. See section 11.

### Phases and drawing

One session object `sess` with a `phase`: `count` (countdown only) > `statement` (entry, work) > `listen` > `celebrate` (countdown, entry) > finish. `RESULT` drives the final count up.

**One line, one height (`LINE = 62`)** in every mode. Smoothly animated channels (`CH`: red, amp, glow, hero, y) ease between states so nothing swaps abruptly: background colour to red, wave amplitude, glow, the big time sliding into the corner, and the line's height.

- **Countdown:** "Silence in" + big number 3, 2, 1 over a gold line that drains toward the centre, then grows back into the listening line. Flat and glowing while quiet, wave when loud, red striped warning with SILENCE above the same line when tripped. After 2.8 s of quiet: a spark runs along the line, a tick draws and stays 3.4 s with twinkling stars, then the session ends.
- **Silent entry:** statement "Silent entry" (2 s) with draining line, then the line sits **higher (y = 40)** while listening (glides back to 62 for the warning and the tick). On acceptance: tick (1.8 s, fades out) then the **% count up**.
- **Silent work:** statement (3 s) whose bar drains **to the left edge** and becomes the **timeline**: the timer length across the bottom, gold per quiet second, red per loud second, red immediately while loud, with a bright head. The remaining time is big in gold. On trip the time glides to the top right and SILENCE appears. **When the timer reaches 0:00 the session ends by itself**, holds 0:00 for 0.7 s, then the % plays. End (phone) also plays it. Cancel shows nothing.
- **% count up:** the timeline drains into a number counting up in white; colour arrives only at the end. 80% or more: gold with underline and a spark. Below 80%: soft coral with "goal 80%" under it (no harsh red).
- **Timer only** (no silence): big gold time, draining gold bar along the bottom, pulses in the last 10 s and flashes at zero.
- **Names (idle):** up to six names, two columns, each with a gold star, shimmer and spark when a new positive arrives. No heading and no class code.

### Polling and resilience

- `poll()` every second. Three failures show "Offline"; twenty reload the page (Google login may have lapsed).
- `doneSids` stops a silence that has already finished from being restarted by a late poll.
- Phone dot "Board" status uses `boardSeen` written by `getBoard`.

---

## 8. Phone (Phone.html)

### Structure

Tabs: **Lesson**, **Today**, **Friday**. Header shows class, week, `(app N, server M)`, a connection dot, and refresh. Class chips list today's classes first, then the rest, then "All classes".

### Lesson tab

- **Silence panel (sticky at the top):** two buttons, **Countdown** and **Silent entry**. Below: a time row with minus 30 s, the time, plus 30 s. Then **Timer only** or **Silent work** (starts the timer and listening together). If a timer is already running, a wide "Start silent work with this timer" button appears. While a silence runs, one large panel replaces all of it, with the time, a live status (Listening / Getting loud / Tripped), the timer left with minus 30 / plus 30, and big **End** and **Cancel** buttons. Last chosen time is remembered (`timerSet`).
- **Why timer taps used to fail, and the fix (important):** the panel was re-rendered every second, so taps could land on a button being replaced; and replies to older `getMode` checks could overwrite newer taps. Now `renderSilence` only rebuilds the HTML when its layout key changes and otherwise updates text nodes (`data-k`) in place, every tap applies optimistically then calls the server through `act()`, and a sequence counter `actSeq` makes any reply to an older request be ignored. A timer that ended more than 1.5 s ago counts as no timer (`timerOn`). Keep these properties.
- **Seating plan view and Names view.** Plan: seats at their sheet positions, fitted to the phone width (no sideways scroll). Rows keep their order but are evenly spaced so close rows never overlap. Seats show first name large (sized to fit its seat by measuring the text) and the surname initial underneath. Students not on the plan appear under "Not on the plan". Under the plan: **Silent time today** bar (green at 80% or more, red below, "no data yet" if none). Names view: larger buttons.
- **Tap behaviour (setting, default one tap):** tap gives a positive with an undo bar; hold opens the student sheet (Positive, Negative, Report to me, Border). With the setting changed to "Opens options": tap opens the sheet, hold selects several.
- **Gold means "has a positive today"** for that class, with no number. Blue border = prompt, purple border = extend (from Support). No other colours on seats.
- **Student sheet** also sets the border (Blue: prompt / Purple: extend / None) via `setSupport`.
- Below the plan: lists of Report to me, One negative, Detention (with the reasons).

### Today tab

Per-class Positives and Negatives summary, the full log with Remove, positives over the last N days. **Settings** at the bottom: tapping a student (gives a positive / opens options), keep screen awake (on/off), theme (Auto/Light/Dark).

### Friday tab

Classes ordered Y7 to Y13. Each shows its silent-time % for the week (or fortnight), **green at 80% or more, red below, no data counts as met**. Classes that meet the goal can pick up to three students for positive emails home; students emailed in the last 21 days are highlighted. Workflow: pick students, Make list, copy names, send one school email, Mark as emailed.

### Reliability features

- **Offline saving:** a tap that cannot reach the server is kept in `localStorage` (`queue`) with the time it was tapped and sent later (`flushQueue` every 15 s, on `online`, and on return to the page). Each class's last data is cached so the lesson still works with no signal.
- **No stale lists:** when switching class the previous class's lists are cleared immediately and replaced by the cached copy or "Loading".
- **Connection dot** (header, tap for details): green all fine; amber if the board is not open (no `getBoard` in 20 s) or taps are waiting; red if the last server call failed.
- **Accidental reload guard:** `overscroll-behavior-y: contain`.
- **Wake lock** keeps the screen on while visible if allowed (Google's page may block it; the setting shows a note and tells him to use the phone's Screen timeout).

### Theme

CSS variables on `:root`; `html[data-theme="dark"]` and `html[data-theme="auto"]` with `prefers-color-scheme: dark` override them. Light palette: paper `#EDF2F8`, ink `#12345C`, plate `#FFF`, gold `#F2AE12`. Dark: paper `#0A1829`, plate `#13294A`, ink `#EAF2FA`, brighter blue `#6FA8FF` and purple `#C09BFF` borders, gold unchanged (so gold always means positive). Fonts: Big Shoulders Display (class codes, numbers), Atkinson Hyperlegible Next (names, text), from Google Fonts with system fallbacks.

---

## 9. Design system (board)

Navy `#0D2442`, gold `#FFC53D`, chalk `#EAF2FA`, warning red `#C8372D` with faint moving diagonal stripes, orange `#F0A020` for the loud wave, coral `#F08A6C` for a % under 80. Gold is reserved for positive/success. Colour is never the only signal: the warning also changes text (SILENCE) and the stripes, because some students are colour blind.

---

## 10. Testing

`tests/` contains three runnable checks. All pass on this version.

- `node tests/server.test.js`: runs `Code.gs` against an in-memory mock of Apps Script and Sheets (`tests/mock-appsscript.js`, which also mimics Sheets turning `+`/`-` cells into `#ERROR!`). 28 checks: logging, undo, offline tap time, detention reasons, modes, timers, silent time %, cancel, Friday goal, support column, board check-in.
- `python3 tests/phone_sim.py`: headless Chromium running `Phone.html` against a slow fake server. Checks six rapid +30 s taps, that Stop is not undone by an old reply, silent work and End, one-tap positive, hold opens options, the dot, and dark mode. Uses synthetic students only.
- `python3 tests/board_sim.py`: headless Chromium running `BoardPage.html` with a fake microphone. Real time, about a minute. Checks the countdown, bang rejection, trip and clear timing, silent entry, the % at timer end, and cancel.
- Setup for the Python tests: `pip install playwright && playwright install chromium`.

Not covered by tests: real microphone behaviour in a classroom, real Apps Script quotas and latency, picture-in-picture in Brave, wake lock on the phone, Google Fonts. These need the user's real devices.

---

## 11. Known issues, risks, open items

1. **Microphone drift.** Windows audio enhancements (automatic gain) cannot be switched off on the school PC, so the quiet level keeps moving. Advice given: a wired USB microphone is the cheapest likely fix (about GBP 10 to 20; for example a small omnidirectional conference mic such as the TONOR G11 on Amazon UK), plus a 5 m active USB extension (about GBP 14 to 16) so it can sit far from the door. Not Bluetooth (call mode adds more processing). The user has not confirmed a purchase. Test: watch "Room now" in a silent room; steady within about 2 dB is good. School IT may block new USB devices. **Not built, offered, not yet accepted:** make the board follow slow drift in the quiet level automatically.
2. **Thresholds are untested in a real classroom.** Smoothing, the 3 dB hysteresis and the per-second scoring were only tested with a simulated microphone. Expect tuning after the first real lessons (limit, entry allowance, spike rejection).
3. **The board shows whichever class was last opened or logged on the phone.** If he checks another class mid-lesson, the board names change. Locking it to the current lesson would fix this. Not requested yet.
4. **Silent-time % includes countdown and entry sessions** as well as silent work (all sessions for the class that day). Confirm this is wanted.
5. **Auto-open the right class from the timetable** was proposed and welcomed but needs his bell times, which he has not given.
6. **Wake lock** may be blocked inside Google's page on his phone. If so he must use the phone's own Screen timeout.
7. **Picture-in-picture size is controlled by Chrome/Brave.** Window size is not changeable by the page. The SCALE 2 switch has a watchdog fallback.
8. `setup()` does not create the Support header (minor).

### Dead code that can be removed

- Server: `showRecap`, `stopRecap` and the `recap` field in `boardData_`; `setLimit`, `limit_`, `LIMIT_DB` and `limit` in `init` (the limit is now set on the board page); the `seated` entry in `TIMERS` and its branch in `timerState_`; the `api=board|live|result|manifest` JSONP endpoints used only by the old `Board.html`.
- Phone: the `showRecap` click handler on `#lesson`; `LIMIT` and its use in `init`; `.recap` and `.limit` CSS.
- `Board.html` entirely.

---

## 12. Things the user tried and rejected (do not re-propose)

- A transparent or semi-transparent border around the whole screen (needs an installed Windows program, and a red frame feels like an alarm aimed at everyone).
- A "Listen now" button for silent entry (use the softer limit instead).
- A fuse or segment meter while listening (replaced by the line; students played with up-and-down meters).
- Showing the class goal on the board; a lesson phase strip; the review of "who got positives" scrolling on the board; green for "checked" on seats.
- Half positives.
- Time preset chips (1, 3, 5, 10 minutes): he picks classes instead.
- Silence controls at the bottom of the screen.
- The phone noise-limit control (moved to the board page).

---

## 13. Ideas discussed but not built

- Auto-follow of slow drift in the quiet level (see issue 1).
- Quiet minutes banked as a positive-only indicator.
- Per-student understanding map over time (blue/purple tags saved across weeks) and a "who haven't I asked" view.
- Draft report comments from positives, borders and detention reasons; evidence for ECT meetings from silence % and settle times.
- A second device (old phone) as the microphone, if the PC microphone stays unreliable (it would add 1 to 3 s of delay through the server).

---

## 14. Practical notes for editing

- Keep the three files self-contained; Apps Script serves them as templates, and external scripts are limited. Fonts load from Google Fonts with fallbacks.
- Everything user-facing should stay in plain, short wording.
- When changing the board drawing, test every mode at 204 x 78 (and the SCALE 2 path). Screenshot the canvas with `canvas.toDataURL()` in Playwright; the tests show how to inject the fake `google.script.run`.
- After any change: run the three tests, bump the version stamps, and tell him the deploy steps from section 3 in two or three lines.

---

## 15. Changes 2026-10-08 (server 20, board 25, phone 20)

- **Pause (Patryk asked for it: his own talking and mic spikes were tripping silences).** Phone: big "Pause" / "Resume" in the running-silence panel and on the timer row. Board: press P. Server `setPause(k, on)` stores `PAUSE {at}` in Script Properties and freezes `TIMER` (`paused`, `left`). While paused the board's `step()` returns at once (nothing heard, nothing scored), the canvas shows "Paused" over the picture, the timer stands still, and a paused silence never runs out. Resume moves the silence's `start` (server) and the board's session clocks on by the paused time and clears the noise history, so the pause never counts as noise. `setMode`, `setTimer` and `endMode` clear any pause. +/-30 s while paused changes the frozen time. Board-pressed P wins over poll replies for 4 s.
- **Mic check** line under the board's settings: raw dB, what the board hears after cleaning, and how many single bangs were ignored. Use it to see whether spikes are single blips (ignored) or longer bursts (counted).
- **ACCEPT is 2.8 s** (2026-10-07). `tests/board_sim.py` timings updated to match.
- **Tests now live in `tests/`** in this folder (copied from behaviour-app-handoff.zip): `node tests/server.test.js`, `python tests/board_sim.py`, `python tests/phone_sim.py` (Playwright installed on this PC). New checks: pause/resume on the server, board (no scoring while paused, not tripped after resume) and phone (Paused shown, timer frozen). The phone's +30 s check now allows for the time the taps take.
