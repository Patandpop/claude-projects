# Spec: Daily Brief

## Overview
A terminal-run script that generates a daily HTML briefing file for Patryk, written to Google Drive at `G:\My Drive\Beechen Cliff Science\Admin\Daily Brief\[YYYY-MM-DD].html`. Covers today's lessons period-by-period, tutor responsibilities, urgent tasks, AI-suggested work spread across the week, upcoming deadlines, Y12/13 accountability, and an end-of-day checklist. Designed to be comprehensive — sections lower in the priority order are still generated even if Patryk doesn't always read them.

---

## Inputs

- `context.json` — weekly scheduling context (from context input skill): lessons per period, absences, tests, revision mode, sharing arrangements
- `Planner.xlsx` — timetable and lesson history
- `upload-log.txt` — which lessons have been built and uploaded to Drive (for generating folder links)
- `context-standing.json` — permanent class arrangements, extra time students (anonymised), class counts (standard/support split, core/extended test split)
- `brief-log.json` — running log Patryk updates via "update daily brief" messages: homework set per class, late/owed work flags, parent call notes, observation dates, lunchtime sessions, tutor notes, deadlines, seating plan changes, goals
- `references/question-bank/[class].json` — for generating homework questions (end-of-subtopic questions from current lesson)
- Date: today's date (system clock)

---

## Outputs

- `G:\My Drive\Beechen Cliff Science\Admin\Daily Brief\[YYYY-MM-DD].html` — formatted HTML file, opens cleanly in browser
- Console confirmation: file written, path printed

---

## Brief structure (priority order)

### 1. Today's Lessons — per period
For each period Patryk teaches today:
- **Drive folder link** — clickable link to `G:\My Drive\...\Lesson [N] - [title]\` (from upload-log.txt)
- **Presentation link** — direct link to `[base]_PTO.pptx`
- **Worksheet links** — `[base]_worksheet.docx` and `[base]_support_worksheet.docx`
- **Print counts** — e.g. "22 standard, 4 support" for worksheets; "18 core, 8 extended" for test days (from class counts in context-standing.json)
- **Extra time** — anonymised: "Student A — 25% extra time" (Patryk holds the key mapping Student A → real name)
- **Homework OUT** — if homework is set this lesson: questions from end of subtopic (generated from question-bank or lesson content). Label clearly: "SET: [question list]"
- **Homework IN** — if homework was set last time this class was seen: "COLLECT: [topic set]". Flag: if Seneca homework, show "CHECK SENECA — log detentions for non-completion"
- **Late / owed work** — list of students (anonymised as Student 1, 2… by register order) who owe work. Policy note: SUPER GOOD EXCUSES ONLY
- **Cover class note** — if another teacher taught this class last lesson: "Last lesson taught by [teacher] — topic: [lesson name]. Do Now should draw from prior lesson."
- **Flags** — TEST / REVISION / SHARED / MOVED / COVER / DISJOINTED as applicable

### 2. Tutor Time (every day)
- **Attendance summary** — anonymised (Student 1–[max class size] by register): attendance flags for the week so far (late, absent)
- **Behaviour / concern notes** — any logged concerns from brief-log.json, anonymised
- **Tracker goals** — current positives target and where students stand; reward threshold reminder
- **Parent contact flag** — any tutor students whose parents need contacting (not Friday); whether a call has been made this week
- **Tutor tracker maintenance reminder** — weekly prompt: is the tracker up to date?

### 3. Urgent Today
- **Lunchtime / extra sessions** — any intervention, catch-up, or revision sessions booked today; which students (anonymised), which topic
- **Order sheet warning** — if order sheet for next week not yet submitted and today is Wednesday or later: "ORDER SHEET DUE THURSDAY 3:15 — not yet submitted"
- **Any item from brief-log with today as deadline**

### 4. AI-Suggested Tasks for Today
Spread across Mon–Thu (never weekends, never after school), adjusted for free periods:
- **Book marking rota** — which class's books to mark today/this week. Week 1 of year: skip. Weeks 2–4: two classes per week to build evidence. After that: one class per week, evenly cycled
- **Parent calls** — which classes/students to call home for (never Friday). Drawn from brief-log flags
- **PLC upload** — if a test is 1.5–2 weeks away: "PLC for [topic] due — upload now"
- **ATL / behaviour data** — if an Arbor deadline is approaching: "Fill [Year X] spreadsheet → transfer to Arbor by [date]"
- **Marking goals** — any outstanding marking tasks (tests, books) with suggested completion day
- **Y12/13 homework set reminder** — on lesson day: generate questions for homework (1 week deadline)

### 5. Upcoming Deadlines
- **Test in X days** — lesson, class, tier (higher/lower), PLC status
- **Arbor ATL submission** — date, cohort, step (spreadsheet or Arbor)
- **Observation warning** — if an observation is logged in brief-log: "Observation [date] — check books for [class] by [date of previous lesson with that class]". Day before that previous lesson: "TRIPLE CHECK POWERPOINT — observation [date]"
- **Parents evening** — day before: list of students being seen with any logged notes (anonymised)
- **Any other logged deadline** from brief-log

### 6. Y12/13 Accountability (weekly, shown every Monday)
- Summary of last week's homework completion from accountability spreadsheet (Patryk inputs manually)
- Students below threshold: flagged (anonymised)
- Suggested action: contact, conversation, or note

### 7. End of Day Checklist
- [ ] Positives logged on system
- [ ] Negatives logged on system
- [ ] Classroom clean
- [ ] Chairs up — periods: [list the last period Patryk teaches in each room today, unless another teacher follows in that room]

---

## Must-haves

- **M1** HTML output written to `G:\My Drive\Beechen Cliff Science\Admin\Daily Brief\[date].html`. Folder created if it doesn't exist.
- **M2** Section 1 (Today's Lessons) generated from context.json + upload-log.txt for every period Patryk teaches today.
- **M3** Drive/file links are real paths from upload-log.txt. If a lesson hasn't been uploaded yet, show `[NOT YET UPLOADED]` in place of the link.
- **M4** Print counts come from context-standing.json class counts. If no counts on file, show `[CHECK COUNTS]`.
- **M5** Homework OUT generated as end-of-subtopic questions from question-bank or flagged as `[GENERATE HOMEWORK — topic: X]` if bank is empty.
- **M6** Homework IN flag shown if homework was set last session for that class (tracked via brief-log.json).
- **M7** Seneca homework shows as a check reminder, not an automatic pull (no API).
- **M8** Late/owed work shown per class from brief-log.json, anonymised by register position.
- **M9** Cover class note shown if brief-log records another teacher covering last lesson for that class.
- **M10** Tutor section (Section 2) shown every day — attendance, concerns, tracker goals, parent flag.
- **M11** Order sheet warning shown from Wednesday if not submitted (tracks submission via a flag in brief-log or order-sheet output).
- **M12** AI task suggestions (Section 4) spread Mon–Thu only. More tasks suggested on days with more free periods (free period count read from timetable).
- **M13** Book marking rota: week 1 of year = skip; weeks 2–4 = two classes/week; thereafter one class/week cycling through all classes.
- **M14** PLC reminder triggered 1.5–2 weeks before a test date (from context.json tests).
- **M15** Observation logic: flag the previous lesson date with that class before the observation; day before that lesson = triple-check PPT reminder.
- **M16** End of day checklist (Section 7) always present. Chairs up shows correct periods based on today's timetable and room usage.
- **M17** `brief-log.json` is the update mechanism. Running `node brief-log.js "update daily brief: [note]"` appends to the log. No manual JSON editing.
- **M18** If Drive is not mounted (G:\ not found), print brief to terminal instead and warn.

---

## Nice-to-haves

- **N1** Google Calendar entries for book marking rota (one per class, recurring weekly from week 5 of year).
- **N2** `--preview` flag: prints brief to terminal without writing to Drive.
- **N3** HTML styling: colour-coded by section (red = urgent, amber = upcoming, green = done), clean readable font (Trebuchet or similar).
- **N4** Y12/13 accountability spreadsheet auto-read (if path configured) rather than manual input.

---

## Out of scope

- Sending email to school account (Gmail API OAuth too complex for now — Drive file is the output).
- Reprographics requests.
- Lab / room booking system integration.
- Student data beyond anonymised identifiers — Patryk holds the name→ID mapping externally.
- Reports.
- Scheme of learning pace check (handled by lesson sequence tracking when revision module is built).

---

## Integration points

- `context.json` — from context input skill (Goal 12). Must exist before brief runs.
- `Planner.xlsx` — timetable source (same as order sheet).
- `upload-log.txt` — written by upload-to-drive.js. Drive links read from here.
- `context-standing.json` — class counts, extra time students (anonymised), permanent arrangements.
- `brief-log.json` — new file. Written by a lightweight `brief-log.js` update command. Contains: homework set/due per class, late work, parent call log, observation dates, lunchtime sessions, tutor notes, deadlines.
- `science-lesson/references/order-sheet.js` — order sheet writes a `submitted` flag that brief reads for the Thursday warning.
- `references/question-bank/[class].json` — homework questions source.

---

## Success criteria

- Running `node daily-brief.js` on a school morning produces an HTML file in Drive within 10 seconds.
- Section 1 correctly lists today's lessons with links (or `[NOT YET UPLOADED]` placeholders) and accurate homework in/out flags.
- On a week with a test 12 days away, the PLC reminder appears in Section 5.
- On Wednesday when order sheet is unsubmitted, Section 3 shows the warning.
- Book marking rota in Section 4 cycles correctly and shows two classes/week in weeks 2–4 of year.
- End of day checklist shows correct rooms and periods for chairs-up based on today's timetable.
