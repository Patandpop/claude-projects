# Ulhu's Rituals: the new task setter (design, not built)

Patryk 2026-10-23: "Ulhu's Rituals" is the task setter redesign and the Cthulhu game as ONE tab.
His work jobs are the rituals; Ulhu's corner room sits on top; every ritual done pays Eldritch
Doubloons. Nothing goes on the pop-out or board, and there is no projector hide mode (he never
shows the planner in class), so the "safe mode" parts of architecture.md and tokens.md are dropped.
Mock-ups: `rituals_phone.png`, `rituals_laptop.png` (drawn by `../art/rituals_mockup.py`).

## 1. What the task setter does today

- **Where:** the Week view has an "All day" row. Hover a day, click "+ task / marking / meeting",
  type a line of text, pick Task, Tests to mark, Meeting or Deadline. It shows as a small chip.
- **Done:** there is no tick. Clicking the chip deletes it. Nothing records that it happened.
- **Copies to Google Calendar** as an all-day event with the text.

Where it falls short (why he rejected the "All day row" idea twice):
1. **Everything is typed by hand**, although the planner already knows the jobs: lessons not built,
   homework due back, tests to mark, the order sheet, Friday emails.
2. **No time.** A 5-minute email and 5 hours of test marking look the same. No length, no splitting,
   no "when will I actually do this".
3. **No tick, no carry-over.** An unfinished chip stays on Tuesday forever, or he deletes it and
   loses it. Nothing rolls to tomorrow, nothing is counted.
4. **Laptop only, hover only.** No phone use at all.
5. **Not linked to anything:** ticking homework set or a lesson built elsewhere never clears it.
6. **No reward and no review:** brief section 8 asked for shifts, a marking estimator, a workload
   view and an end-of-week "what slipped". None of that exists.

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
| Build 9XS Lesson 3 | a lesson in the next 2 weeks is not built and not "made it myself" | 2 school days before the lesson | the built flag turns on (next morning's data) | 30 min, necessary; 7+ days early pays ahead |
| Set 10S2 homework | the class is owed homework this week and nothing is set | its homework day | the Classroom post is live or scheduled | 15 min, necessary |
| Mark 10C2 homework | the day after a homework's due date | 3 school days later | "Mark as marked" on the Homework tab | from class size, necessary |
| Mark 9XS Particles tests | the day after a test slot | 1 week later | never: stages ticked by hand (it is a boss, see 5) | estimator, necessary |
| Order sheet ready, w/c 9 Nov | Monday, two weeks before that week | the Friday one week before | the order sheet is downloaded | 15 min, ahead if 14+ days early |
| Send order sheet to technicians | the moment "ready" ticks | same Friday | never: he ticks it (Patryk's rule) | 5 min, necessary |
| Friday emails | every Friday | Friday | an email logged that week | 15 min, necessary |
| Log behaviour | each teaching day | that day | a log row for every class taught | 5 min, necessary |
| Mark 10S2 books (1 of 2) | the weekly book rotation, one class a week | Friday | by hand | 30 min each, necessary |
| Report data in, Arbor in | report deadlines he types in once per cycle | his dates | by hand | boss fight, necessary |

**His own rituals:** a "+ Ritual" button (top of the list on both screens). One line of text,
then three rows of chips, all with defaults so most are two taps:
- **How long:** 5, 15, 30, 60, 120+ minutes.
- **Kind:** Necessary, Ahead, Outside work, Life. The pay shows live ("pays 10 Ð").
- **When:** Today, Tomorrow, This week, a date; plus "repeat" (daily, weekdays, weekly).

Life goals (Read 20 pages, Training, Call a friend, Something for Martha) are rituals too, in the
Life kind, so one list holds his whole day. The old "+ task / marking / meeting" link in the Week
view opens this same box. Meetings and deadlines are not rituals: they stay as calendar chips
and pay nothing.

## 4. How rituals are scheduled

- **The day is split into places:** Before school, each free period, Break, Lunch, After school,
  Evening. The planner knows his free periods from the week grid (empty or "free" slots).
- **Plan my day** (one button, laptop and phone): fills free periods first, then after school,
  in deadline order, never over a place's length (a free period holds 60 minutes). Evening is
  only filled if he drags something there himself. Weekends get no work rituals.
- **He can always move it:** drag on the laptop, "Move" on the phone (pick a place). A placed
  ritual is never moved by the planner again.
- **Not placed yet:** anything that did not fit sits in a "Waiting" tray under the day, with its
  deadline. Placing is help, not a rule: a ritual can be ticked from anywhere.
- **Week view link:** each free period in the Week grid shows a small count ("2 rituals, 45 min").
  Placed rituals go to Google Calendar as timed events, replacing today's all-day chips.

## 5. Big jobs: sittings and boss fights

- **Sittings:** a job over 60 minutes is split into sittings of up to 60, named "(2 of 3)".
  Each sitting is a ritual that can be placed and ticked on its own, and pays for its own minutes.
- **Marking estimator:** class size x minutes per script (he sets it once per kind: test 6 min,
  book 3 min, homework 2 min). 30 tests x 6 min = 3 hours = 3 sittings.
- **Boss fight:** any job of 2 hours or more, test marking and reports always, becomes a boss.
  It is a sea monster with a health bar; each stage is a sitting or a real step with its own date:
  - The Marking Kraken (9XS tests): half the class marked, the rest marked, section totals added
    up, marks entered on the system.
  - Report data on the spreadsheet, then on Arbor.
- A stage done on time does full damage, late does half. Beating it pays 150 to 300 Ð plus a
  trophy for the room. A missed date never costs health.

## 6. Ticking, carry-over and pay

- **Tick:** one tap. Doubloons fly to the counter, Ulhu reacts in the room above. The row dims
  and stays until tomorrow so he can see what he did. Untick puts the doubloons back.
- **Pay = minutes x kind** (Reward maths v2): 5 min = 3 Ð, 15 = 6, 30 = 10, 60 = 16, 120+ = 25;
  necessary x1, ahead x1.5, outside work x3, life x2 plus the life bonus (first life ritual of the
  day +5, three in a day +15). The pay is printed on every row, so he can pick the job worth most.
- **Carry-over:** an unticked ritual moves to the next school day by itself, at the top of
  "Waiting", with "moved 2x". Nothing is lost and no health is lost; missed rituals simply have
  not paid yet. Each move makes its stripe redder and its pay up to x1.5 bigger (doing the
  neglected thing pays more). After the third move it asks once: "Still needed? Split / Shrink
  to 15 min / Drop it".
- **Deadline chip:** amber two school days before, red on the day. Order sheet, homework and
  build rituals have real deadlines; his own may have none.
- **End of week** (Friday after school, or Sunday): a card shows what was done, what slipped,
  hours worked per day, doubloons earned, then asks for next week's three priorities. Those three
  become rituals for Monday. Pays +20 Ð once a week.

## 7. Sick days, INSET and holidays

- **Off sick:** "I'm off today" (phone, two taps). The day freezes: streaks are safe, today's work
  rituals move to the next school day without counting as carried over, and anything with a
  deadline today shows amber so he can see what someone else might need (e.g. the order sheet).
  Life rituals stay but are optional. Ulhu is shown resting with a blanket.
- **INSET and holidays:** known from the planner's term dates, frozen automatically. No work
  rituals are summoned or due. A "Holiday jobs (optional)" list shows what is due in the first
  week back (lessons to build, order sheet), and anything done pays as Ahead (x1.5).
  Life rituals carry on, and the life bonus still counts.
- **A day out of school** (trip, course): "Out today" moves work rituals to tomorrow and keeps life
  ones; no freeze needed for a single day unless he picks "off".

## 8. Screens

**Phone (`rituals_phone.png`, 390 wide, a fourth button "Rituals" in the bottom bar):**
1. Top bar: Ulhu's Rituals, doubloon count, level pill.
2. Ulhu's corner room at 2x (272 px), with the health and XP bars beside it and a speech bubble
   for the last reaction. Tapping the room opens the room screen (shop, decorate).
3. Boss banner when one is live (one line + bar, tap to open its stages).
4. **Today**, grouped by place: Before school, P2 free, Lunch, After school, Evening. Each row:
   colour stripe, 44 px tick box, name, second line (minutes, kind tag, deadline chip, "auto"),
   pay on the right.
5. Waiting tray (count, tap to open), then "+ Ritual" and "Plan my day" buttons.

**Laptop (`rituals_laptop.png`, the planner's sidebar gets "Ulhu's Rituals"):**
- Left column (420 px): the room at 3x, doubloons, level, bars, the live boss with its stages.
- Middle: **Today as a timeline**: lessons shown greyed for context (9XS P1, 10S2 P3...), free
  periods and before/after school as drop zones holding rituals.
- Right: **Waiting** (unplaced, by deadline) and **This week**: a bar per day of planned minutes,
  so a 5-hour Wednesday is visible on Monday.

## 9. Data (fits architecture.md)

Uses the planned Game Player, Game Goals and Game Ticks tabs (repeating rituals and life goals are
Game Goals; every tick pays through Game Ticks with its evidence key, so nothing pays twice). One
new tab, **Game Rituals**, for one-off jobs: id, name, source, ref (evidence key), minutes, track,
due, place day, place slot, sitting n of m, boss id, moves, done. The old Week "extras" stay for
meetings and deadlines only; existing task chips are copied in once as rituals.

## 10. Build order (each slice ends usable and tested)

1. **First slice: his own rituals, ticked and paid, on laptop and phone.** The tab, "+ Ritual"
   (length, kind, when), Today list, tick and untick, pay on each row, doubloon counter, carry-over
   to the next school day, the room picture with Ulhu reacting. Plus ONE summoned ritual:
   "Build [class] Lesson [n]", because unbuilt lessons are the biggest real worry.
2. Places and "Plan my day" (free periods from the week grid), the Waiting tray, Week grid counts.
3. The other summoned rituals, one at a time: order sheet ready + send, Friday emails, homework
   set, homework marking, behaviour logged.
4. Sittings, the marking estimator and boss fights (tests, books, reports).
5. Sick day / holiday freeze, end-of-week card, then the shop and decorating from world.md.

## Questions for Patryk

1. **Book marking:** which classes are on the weekly rotation, and roughly how many minutes per
   book? (Default: one class a week, 3 minutes a book, in two sittings.)
2. **Plan my day:** should the planner place rituals by itself every morning, or only when you
   press the button? (Default: only when you press it.)
3. **Evening:** after what time should it never place work (e.g. 7pm), and are there fixed
   blocks it must keep free, like training?
4. **Lessons to build:** how far ahead should "Build" rituals appear, and when are they due?
   (Default: show 2 weeks ahead, due 2 school days before the lesson.)
5. **Reports:** are you happy to type each report deadline in once per cycle, or is there a
   school calendar we can read the dates from?
