# Lessons built before 7 pm by a scheduled home session: design (30 Oct 2026)

Source: FABLE-WORKPLAN.md Phase 5 ("Lessons built before 7 pm by a scheduled home session, never later than 7 pm"), the north star ("Patryk not working evenings"), his rule "no automatic work after 7pm" (memory, 23 Oct), and the planner's existing "Send to Claude" requests. Written in the Lane C design chat. The rules and the runner are built and checked; the scheduled task is his to switch on.

## 1. What it does

At school, Patryk presses "Send to Claude" in the planner for the lessons he wants built (or asks for exam practice). Today he then says "do my planner requests" in a chat at home, in the evening. With build ahead, his home PC does that itself in the late afternoon:

- every weekday at 15:45 a Windows scheduled task wakes a small script;
- the script checks the rules (section 4); if everything is right it starts one unattended Claude Code session with plain instructions: build these requests, the soonest lesson first, mark each done, never ask a question;
- the session builds each lesson the normal way (the science-lesson skill, then the usual build, which uploads to the lesson's Drive folder and records it in the lesson log), and marks the request done so the planner shows it built;
- the session starts no new lesson after 18:30 and is ended at 18:50 whatever happens, so nothing ever runs past 19:00;
- one line per run goes in a log he can read, and a lesson that could not be built keeps its request open with one plain line saying why.

He still chooses what gets built (only what he sent), still checks the lessons as now, and can switch the whole thing off with one empty file.

## 2. Where the data lives

- **Requests:** `requests.json` in `Admin\Planner Sync` on Drive, written by the planner's mailbox when he presses Send to Claude (id, time, kind "build" or "practice" or "message", the lesson prompts). Done ones are listed in `requests-done.json` by `planner-sync.js done`. Nothing new.
- **Term dates and INSET days:** `planner/planner-data.json` (`terms`, `inset`), the same source the day screen uses, so a holiday or INSET day never runs.
- **The once-a-day stamp:** `planner/tools/.build-ahead-last` holds the last run date (local, untracked).
- **The off switch:** an empty file `planner/tools/.build-ahead-off` (local, untracked). Present = no runs.
- **Logs:** `planner/tools/build-ahead.log` (one line per run or non-run, plain English) and `build-ahead-run.log` (what the session printed). Local, untracked. `build-ahead-notes.txt` in the project root: the session's own "why I skipped this" lines.
- **Built lessons:** recorded where they always are, by the normal build (the Drive lesson folder, `lesson-log.json`, `upload-log.txt`). The day screen's "built" tick and the planner's built flag read those, so nothing new is needed for them to show the result.
- **No pupil data** anywhere in this flow: requests carry class codes and lesson titles only.

## 3. Every screen

None new. What changes for him:
- the planner's request list shows the request done, as if he had done it at home;
- the day screen (Lane C) shows the lesson's built tick next morning, and its 07:00 message no longer lists that lesson as not built;
- later, if wanted: a "Built ahead" line on the day screen's Today card ("9AS L4 built at 16:40") read from `build-ahead.log`.

## 4. The rules (built: `planner/tools/build-ahead.js`, 23 checks)

A run happens only when all of these hold, checked in this order and logged by name when one fails:
1. the off switch file is absent;
2. it is a school day (weekday, inside term, not INSET), from planner-data;
3. the time is between 15:30 and 17:45 (a lesson takes up to 40 minutes; starting later could not finish before 19:00);
4. Google Drive (G:) is mounted (the build uploads there);
5. no other Claude session is running on the PC (he may be working, or a lane chat may be mid-item);
6. it has not already run today;
7. there is at least one lesson build request or exam practice request waiting. Requests of kind "message" are never acted on unattended: they need a person.

What it builds: the soonest lessons first (by the "when" date in the request), at most 3 lessons per run; the rest wait for the next run or for him. The run is given until 18:50 at most.

The instructions handed to the session say, in plain English: read CLAUDE.md; nobody is watching, never ask a question, skip and explain instead; build only these request ids; the normal skill and build for each lesson, which uploads by itself, never creating, moving or renaming anything on Drive by hand; mark each request done with its class and title; the exam practice command as written in the request; start no new lesson after 18:30, ended at 18:50 whatever happens, an unfinished lesson is left for tomorrow with its request open; no paid services, no pupil names, do not touch git; finish with one line per lesson.

## 5. The runner (built: `planner/tools/build-ahead.ps1`)

- `-DryRun` prints the decision and the instructions, builds nothing. This is how he checks it before trusting it.
- No switch: one run now, by the rules.
- `-Install` makes the Windows scheduled task "Science lessons: build ahead" (weekdays 15:45, runs when the PC wakes if it was asleep, never two at once, 4-hour limit). He runs this once. `-Remove` takes it away.
- The run uses his Claude subscription login (the API key variable is cleared, as the Fable restart script does), the Opus model (spec-following work), and permission mode auto, like the lane chats.
- The hard stop: the script waits for the session and ends it at 18:50 if it is still going. A lesson cut off mid-build keeps its request open; its folder may hold a partly built file, which the next build overwrites.

## 6. How it is tested

- `node planner/tests/build-ahead.test.js`: every rule above (school day, INSET, holiday, the off switch, the window both ends, Drive, busy, once a day, nothing waiting, messages never built, soonest first, at most 3, exam practice picked), the stop times, and the instructions (only the chosen ids, the forbidden things named, the stop times, how to mark done, no em dashes).
- `.\planner\tools\build-ahead.ps1 -DryRun` on the PC, with a real request waiting: the decision reads right and the instructions name the right lessons.
- First real run watched: he sends one request for a lesson he can check easily, lets the 15:45 task run, and reads the log and the lesson. Only then does he leave it on.

## 7. The order to build it in

1. Rules and checks (done).
2. Runner script with dry run and install (done).
3. Patryk: `-DryRun` once with a request waiting, then `-Install`, then one watched run (section 6).
4. Later, if wanted: the "Built ahead" line on the day screen (Lane C), and a weekly summary in the Friday tab.

## 8. Risks

| Risk | What is done about it |
|---|---|
| It builds something he did not want | It only ever builds what he sent from the planner, and only lesson builds and exam practice. Messages wait for him. |
| It runs in the evening | Three separate guards: the start window ends 17:45, the session is told 18:30, the script ends it at 18:50. The checks pin all three. |
| It runs on a holiday or INSET day | Term dates from planner-data, plus the off switch file. |
| It fights another session for the PC | It does not start while any Claude session is running. |
| Drive is down and lessons land nowhere | No run without G: mounted; the normal build refuses missing Drive folders anyway. |
| A half-built lesson at the hard stop | The request stays open and says so in the log; the next build overwrites the folder's files. |
| The session asks a question and stalls | It is told never to ask; the hard stop ends a stalled session; the log says the request is still open. |
| Cost | His subscription, no API key, same as the lane chats. A run uses roughly what one "do my planner requests" chat uses. |
