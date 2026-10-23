# Ulhu's Rituals: the new task setter (design, not built)

Patryk 2026-10-23: "Ulhu's Rituals" is the task setter redesign and the Cthulhu game as ONE tab.
His work jobs are the rituals; Ulhu's corner room sits on top; every ritual done pays Eldritch
Doubloons. Nothing goes on the pop-out or board, and there is no projector hide mode (he never
shows the planner in class), so the "safe mode" parts of architecture.md and tokens.md are dropped.
Mock-ups: `rituals_phone.png`, `rituals_laptop.png` (drawn by `../art/rituals_mockup.py`).
Updated the same day with his answers to the 5 questions (see the end).

## 1. What the task setter does today

The Week view's "All day" row: hover a day, "+ task / marking / meeting", type a line, and it
shows as a chip (copied to Google Calendar). Clicking the chip deletes it. Why he rejected it
twice: everything is typed by hand although the planner knows the jobs; no length (an email and
5 hours of marking look the same); no tick or carry-over; laptop and hover only; not linked to
anything; no reward and no "what slipped" review.

## 2. The idea in one line

Every job is a **ritual** with a **length** (minutes), a **kind** (necessary, ahead, outside work,
life), a **deadline**, and a **place in the day** (a free period, before school, after school,
evening). The planner summons most rituals itself; Patryk adds his own in two taps. Tick it and
Ulhu is paid.

## 3. How rituals are made

**Summoned automatically** (from data the planner already has; each one appears once and ticks
itself when the evidence appears, with a small "ticked for you" badge):

| ritual | appears when | due | ticks itself when | length, kind |
|---|---|---|---|---|
| Build 9XS Lesson 3 | a lesson in the next 2 weeks is not built and not "made it myself" | the school day before the lesson | the built flag turns on (next morning's data) | 30 min, necessary; a week or more ahead feeds the quest line (section 6) |
| Set 10S2 homework | the class is owed homework this week and nothing is set | its homework day | the Classroom post is live or scheduled | 15 min, necessary |
| Mark 10C2 homework | the day after a homework's due date | 3 school days later | "Mark as marked" on the Homework tab | from class size, necessary |
| Mark 9XS Particles tests | the day after a test slot | 1 week later | never: stages ticked by hand (a boss, see 5) | estimator, necessary |
| Order sheet ready, w/c 9 Nov | Monday, two weeks before that week | the Friday one week before | the order sheet is downloaded | 15 min, ahead if 14+ days early |
| Send order sheet to technicians | the moment "ready" ticks | same Friday | never: he ticks it (Patryk's rule) | 5 min, necessary |
| Friday emails | every Friday | Friday | an email logged that week | 15 min, necessary |
| Log behaviour | each teaching day | that day | a log row for every class taught | 5 min, necessary |
| Mark 9AS books (termly goal) | the start of each term, one per class | the last week of term | by hand, one tick per sitting | 2 sittings, a boss (see 4b) |
| Mark 8XP key homework (termly goal) | only once that class's key homework is handed out (see 4b) | 1 week after it is set | "Mark as marked" on the Homework tab | estimator, necessary |
| Report data in, Arbor in | the report dates he types in (usually the last week of term) | his dates | by hand | boss fight, necessary |

**His own rituals:** "+ Ritual" (both screens): one line of text, then chips with defaults so
most are two taps: **How long** (5, 15, 30, 60, 120+ min), **Kind** (Necessary, Ahead, Outside
work, Life; the pay shows live), **When** (Today, Tomorrow, This week, a date, or repeat). Life
goals (reading, training, Martha) are rituals too, so one list holds his whole day. The old Week
view link opens this box. Meetings and deadlines stay calendar chips and pay nothing.

## 4. Termly goals: books, key homework, reports

A **Termly goals** card sits under Today (phone and laptop): one line per class per goal, with a
progress bar for the term and the days left. They are rituals with a whole-term deadline, so
"Plan my day" can place their sittings like anything else. The list refills at the start of
each term (from the planner's term dates).

**4a. Book marking (Patryk 2026-10-23: termly, not weekly).** Each class's books is a 2.5 to 3
hour job (it takes him about 2 hours; the plan allows more). It is split into **two sittings** of
75 to 90 minutes, each placed and ticked on its own. Remaining this term, in this order:

| order | class | status |
|---|---|---|
| 1 | 9XS | half done: 1 sitting left |
| 2 | 9AS | 2 sittings |
| 3 | 7MLA | 2 sittings |
| 4 | 8XP | 2 sittings |
| 5 | 8AG | 2 sittings |
| 6 | 10C2 | 2 sittings |
| 7 | 10S2 | 2 sittings |

That is 13 sittings, about 18 hours. The card shows "13 sittings left, 7 weeks left, about 2 a
week" so the pace is visible. Only the next class in the order is offered to "Plan my day"; he
can tap any other class to start it early.

**4b. Key homework marking (termly).** It only appears once the key homework has been handed out.
It is set ON each class's test review lesson, so the ritual is summoned when that lesson's date
has passed AND a key homework row exists for the class on the Homework tab. Due one week after it
is set. Size from the estimator (class size x minutes per script, he sets the minutes once).
Status now (Patryk 2026-10-23):

| class | key homework now | ritual appears |
|---|---|---|
| 8XP, 8AG | had it, not marked yet | now (already live) |
| 7MLA | had it, comes back in the first week of next term | when it comes back |
| 9AS, 9XS | come back in the first week of next term | when it comes back |
| 10C2 | gets it on their test review lesson next term | after that lesson |
| 11S2 | the same, but after mocks, so later | after that lesson |
| 10S2 | not had one yet (fewer topics covered) | after their next test review lesson |

Ticking "marked" here is the same tick as "Mark as marked" on the Homework tab (one tick, both
places). That tick is also what unlocks the key-homework review section in the class's next
lesson (a future build: `specs/key-homework-review.md`).

**4c. Reports.** No school calendar to read: he types the dates in once per cycle. Until he
does, a reminder ritual sits in the last week of each term ("Type in this term's report dates?",
5 min). Each report is a boss fight (data on the spreadsheet, then on Arbor).

## 5. How rituals are scheduled

- **The day is split into places:** Before school, each free period, Break, Lunch, After school
  (end of school to 19:00), Evening (after 19:00). Free periods come from the week grid.
- **Plan my day** (one button, laptop and phone): first it puts in **"Build tomorrow's lessons"**
  (one ritual per lesson tomorrow that is not built yet: lessons are normally built the day
  before, and that pays the normal amount). Then it fills free periods, then after school, in
  deadline order, never over a place's length (a free period holds 60 minutes).
- **Never after 19:00 (Patryk 2026-10-23).** His goal is no work after 7pm. Plan my day never
  places work in the Evening, and never lets an after-school ritual run past 19:00: a 90-minute
  book sitting that would end at 19:30 goes to Waiting instead. Only he can drag work there.
  Weekends get no work rituals.
- **He can always move it** (drag on laptop, "Move" on phone); a placed ritual is never moved by
  the planner again. Anything that did not fit waits in a "Waiting" tray with its deadline, and
  any ritual can be ticked from anywhere.
- **Week view:** each free period shows a count ("2 rituals, 45 min"); placed rituals go to
  Google Calendar as timed events.

## 6. The lessons-ahead quest line: "The Tide Charts"

Patryk: tomorrow and the day after pay the SAME normal amount; a lesson built a week ahead (it is
Wednesday and next Wednesday's lesson is built) earns a quest bonus; two weeks ahead completes
the quest line. Ulhu is charting the tides ahead of the ship.

**Pay for one build ritual (30 min):** less than 5 school days ahead = 10 Ð (necessary).
5 or more school days ahead ("a week ahead") = 15 Ð (Ahead, x1.5) plus the quest stage below.
"Ahead" counts school days from the day he built it to the lesson; holidays do not count. The
built flag arrives the next morning, so the build day is taken as the day before the data came.

| stage | what he does | quest bonus |
|---|---|---|
| 1. First chart | build one lesson a week ahead | +10 Ð |
| 2. A full day charted | build every lesson of one day next week, a week ahead | +30 Ð |
| 3. The far tide (completes the line) | build one lesson two weeks ahead (10+ school days) | +150 Ð and an item |

- **Items, one per completed line, in order:** the Tide Clock (back-corner tall piece: a
  grandfather clock with a tide dial), the Ship's Chronometer (small prop), the Chart Table
  (furniture). All are trophies, not for sale. After all three, a completed line pays 150 Ð
  and a relic shard (world.md collections).
- **Size check:** a full line is about 190 Ð of bonus (about 2.5 days' earnings), the same as a
  boss fight.
- **Rules:** stages can be done in any order; the line completes when all three are ticked. One
  lesson fills one stage only (the highest one still open). Lessons built in the holidays count.
- **Reset:** a completed line starts again at stage 1 the next Monday. An unfinished line never
  fails and loses nothing: its ticked stages stay until the end of the half term, then it
  restarts. It is a standing work quest, so it is not one of the three Monday quest offers and
  it is allowed to run longer than world.md's one-week quests.
- **Note for the build:** architecture.md's `lessonsAhead` hook (2, 7, 14 days) should change to
  this (under 5, 5+, 10+ school days) when that part is built.

## 7. Big jobs: sittings and boss fights

- **Sittings:** a job over 60 minutes is split into sittings of up to 60, named "(2 of 3)".
  Book marking is the exception: two sittings of 75 to 90 minutes. Each sitting is a ritual that
  can be placed and ticked on its own, and pays for its own minutes (a 90-minute sitting pays as
  60: 16 Ð).
- **Marking estimator:** class size x minutes per script (he sets it once per kind: test 6 min,
  homework 2 min, key homework his own figure). 30 tests x 6 min = 3 hours = 3 sittings.
- **Boss fight:** any job of 2 hours or more, test marking, books and reports always, becomes a
  sea monster with a health bar; each stage is a sitting or a real step with its own date:
  - The Marking Kraken (9XS tests): half the class marked, the rest marked, section totals added
    up, marks entered on the system.
  - The Book Leviathan (one class's books): sitting 1, sitting 2. Each class beaten pays 150 Ð;
    the trophy (a Leviathan scale for the wall) comes when the whole termly list is done.
  - Report data on the spreadsheet, then on Arbor.
- A stage done on time does full damage, late does half. Beating it pays 150 to 300 Ð plus a
  trophy for the room. A missed date never costs health.

## 8. Ticking, carry-over and pay

- **Tick:** one tap. Doubloons fly to the counter, Ulhu reacts in the room above. The row dims
  and stays until tomorrow so he can see what he did. Untick puts the doubloons back.
- **Pay = minutes x kind** (Reward maths v2): 5 min = 3 Ð, 15 = 6, 30 = 10, 60 = 16, 120+ = 25;
  necessary x1, ahead x1.5, outside work x3, life x2 plus the life bonus (first life ritual of the
  day +5, three in a day +15). The pay is printed on every row, so he can pick the job worth most.
- **Carry-over:** an unticked ritual moves to the next school day by itself, at the top of
  "Waiting", with "moved 2x". Nothing is lost and no health is lost. Each move makes its stripe
  redder and its pay up to x1.5 bigger. After the third move it asks once: "Still needed? Split /
  Shrink to 15 min / Drop it". Termly goals do not carry over: they wait on the Termly card.
- **Deadline chip:** amber two school days before, red on the day.
- **End of week** (Friday after school, or Sunday): a card shows what was done, what slipped,
  hours worked per day (and any work ticked after 19:00, shown plainly, never as a penalty),
  doubloons earned, then asks for next week's three priorities. Pays +20 Ð once a week.

## 9. Sick days, INSET and holidays

- **Off sick:** "I'm off today" (phone, two taps). The day freezes: streaks are safe, work rituals
  move to the next school day without counting as carried over, today's deadlines show amber (for
  what someone else might need). Life rituals stay but are optional. Ulhu rests with a blanket.
- **INSET and holidays:** frozen from the term dates. No work rituals due; an optional "Holiday
  jobs" list shows the first week back, and anything done pays as Ahead (x1.5).
- **A day out of school** (trip, course): "Out today" moves work rituals to tomorrow.

## 10. Screens

**Phone (`rituals_phone.png`, 390 wide, a fourth button "Rituals" in the bottom bar):**
top bar (doubloons, level); the room at 2x with health and XP bars; boss and quest line banners
("Tide Charts: 2 of 3"); **Today** grouped by place, each row a colour stripe, 44 px tick box,
name, minutes, kind, deadline chip and pay; then Waiting, Termly goals, "+ Ritual", "Plan my day".

**Laptop (`rituals_laptop.png`, the planner's sidebar gets "Ulhu's Rituals"):**
left, the room at 3x with bars, boss and quest line; middle, **Today as a timeline** (lessons
greyed, free periods as drop zones, a line at 19:00 where work stops); right, Waiting, Termly
goals and This week (a bar per day of planned minutes).

## 11. Data (fits architecture.md)

Uses the planned Game Player, Game Goals and Game Ticks tabs (every tick pays through Game Ticks
with its evidence key, so nothing pays twice). One new tab, **Game Rituals**, for one-off and
termly jobs: id, name, source, ref (evidence key), minutes, track, due, place day, place slot,
sitting n of m, boss id, term, moves, done. Quest line progress: one row in Game Goals.

## 12. Build order (each slice ends usable and tested)

1. **His own rituals, ticked and paid, on laptop and phone,** plus ONE summoned ritual:
   "Build [class] Lesson [n]".
2. Places and "Plan my day" (build tomorrow's lessons first, the 19:00 stop), Waiting, Week counts.
3. The other summoned rituals: order sheet, Friday emails, homework set and marked, behaviour.
4. Termly goals (books, key homework, reports), sittings, the estimator and boss fights.
5. The Tide Charts quest line.
6. Sick day / holiday freeze, end-of-week card, then the shop and decorating from world.md.

## Answered 2026-10-23

1. **Books:** termly per class, two sittings each (4a). 2. **Plan my day:** puts in "build
tomorrow's lessons" (5). 3. **Evening:** no work placed after 19:00 (5). 4. **Building ahead:**
the Tide Charts quest line (6). 5. **Reports:** last week of term, he types the dates (4c).
Also: key homework marking is a termly goal that appears once it is handed out (4b).

## New questions for Patryk

1. **"This term" for books:** is the deadline the end of Autumn 2 (Fri 18 Dec)? And do 11S2, 12C
   and 13D have books to mark, or are they left off on purpose?
2. **Key homework "within a week":** a week from the day it is set, or from the day pupils hand
   it in (7MLA, 9AS and 9XS hand theirs in during the first week of next term)?
3. **Two parts not answered yet:** should Plan my day run by itself each morning, or only when
   you press it? And are there evening blocks to keep free, like training? (Defaults: only on
   the button; none.)
