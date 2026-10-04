# Recon: Google Calendar (web) → Patryk's lesson planner

## Scope
- **App / platform:** Google Calendar, web on a computer.
- **Slice:** the week view and how events are added, edited and moved quickly, plus the link to a real Google Calendar.
- **Who for:** one teacher (Patryk), planning lessons and technician orders on a school PC. It is not a product for sale.
- **Clean room:** this map records behaviours and UX patterns from public help pages and common knowledge of the product. It contains no Google code, assets or copy. The planner keeps its own look (navy/gold).

## Sources
| source | url | what it gave |
|---|---|---|
| Help: create an event | https://support.google.com/calendar/answer/72143 | click an empty slot to create; Create button; quick add from typed text; C to create; colour per event; all-day events |
| Help: repeating events | https://support.google.com/calendar/answer/37115 | repeating events (the timetable is a repeating pattern) |
| Help: keyboard shortcuts | https://support.google.com/calendar/answer/37034 | well known: J/K next/previous period, T today, D/W/M/X views, C create, E edit, Delete, / search, ? help |
| Apps Script CalendarApp docs | https://developers.google.com/apps-script/reference/calendar/calendar-app | createCalendar, getOwnedCalendarsByName, createEvent(title,start,end,{description,location}), getEvents(start,end), setColor |

## Screens
| ID | screen | how you get there | purpose | key components | states |
|---|---|---|---|---|---|
| S01 | Week view | default | 5 or 7 day columns × time rows, events as blocks | header (Today, ‹ ›, date range, view switch), time axis, event blocks, current-time line, all-day row | empty, filled, today highlighted |
| S02 | Day view | D / view switch | one day, wide blocks | same as S01 | |
| S03 | Month view | M | the term at a glance, compact chips | month grid, "+N more" | |
| S04 | Event quick view | click an event | glance + actions | popover: title, time, details, Edit / Delete / colour | |
| S05 | Event editor | E / Edit | full edit | title, date/time, repeat, description, colour, calendar | validation error |
| S06 | Quick create | click an empty slot / C | create in two seconds | small popover with title + time prefilled | |
| S07 | Mini month + sidebar | left of S01 | jump to any date, toggle calendars | mini calendar, calendar list with colours | |
| S08 | Search | / | find an event | search box, results list | no results |
| S09 | Undo toast | after move/delete | safety | snackbar "Event moved · Undo" | |

## Flows (happy-path clicks)
- F01 Plan the week: S01 already shows the repeating timetable → nothing to click. *(Planner today: opens on the right week, auto-filled. 0 clicks. Keep.)*
- F02 Change one lesson: click event → S04 → Edit → S05 → Save = **3 clicks**. *(Planner today: click slot → side panel → choose topic → choose lesson → Apply = 4. Target: click slot → type a few letters → Enter = 2.)*
- F03 Move a lesson: drag block to new time = **1 drag**, undo toast. *(Planner today: drag → choose shift/swap/move = 2. Keep the question (his rule: "always ask"), add the undo toast.)*
- F04 Jump to a week: mini calendar click = **1**. *(Planner today: ‹ › repeatedly. Add date picker + Today.)*
- F05 Put it in my real calendar: (Calendar is the calendar). *(Planner: "Sync to Google Calendar" = 1 click, writes the saved week into a dedicated "Lessons" calendar.)*
- F06 Add a non-lesson (test to mark, meeting, deadline): click all-day row/empty slot → quick create = **2**.
- Edge: slot is INSET/holiday; double lesson; a lesson moved while the week is unsaved; calendar already has last version of the week (must replace, not duplicate).

## Components
event block (colour by class, states: normal / selected / dragging / drop-target / test / cover / INSET), quick-view popover, editor panel, quick-create box with search-as-you-type lesson picker, mini month picker, view switch, toast with Undo, all-day/notes row per day, current-time line, keyboard help overlay.

## Inferred data model (planner side)
- **Week** {monday, letter, slots[], extras[]}: evidence = existing app; confidence high.
- **Slot** {day, period, cls, kind, i, text, eq, sets, print, book, notes, carry}: existing.
- **Extra (new)** {id, day, text, kind: task|test-marking|meeting|deadline, colour}: Calendar's all-day/own events. Confidence: design choice.
- **CalendarLink (new)** {weekMonday → eventIds} so a re-sync replaces events instead of duplicating them. Stored in the Sheet (Settings tab).
- **Period times**: KS3 + Year 9 vs KS4/5 differ for P2/P4 (classes-2026-27.json periodStructure). Needed for real event times.

## Out of scope (skip)
guests/invites, video meetings, sharing calendars with others, time zones, Google's own event storage as the planner's database (the Sheet stays the source of truth), mobile layout (he plans on a computer).

## Size
S (a weekend). Screens touched: S01, S02, S04/S06 merged into the side panel, S07 as a date picker, S09. Hard parts:
1. calendar sync without duplicates;
2. per-class period times;
3. double lessons counted once.
