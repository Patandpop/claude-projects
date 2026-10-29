# Architecture: the Cthulhu habit game (a game layer inside Patryk's planner)

From `replica/recon.md` + `replica/features.csv` (2026-10-23) and the wish list in memory
`project_habit_game_2026_10_22.md`. Personal tool for one teacher, not a product: no accounts,
payments, store or new services. Numbers in "Reward maths" are a first proposal for tuning.

## Stack (fixed by the planner, not chosen)

| layer | choice | why |
| --- | --- | --- |
| server | new `planner/Game.gs` in the planner's Apps Script project | same key check (`check_(k)`), same spreadsheet, same deploy as Code.gs + Behaviour.gs |
| shared maths | new `planner/game-logic.js`, pasted as `GameLogic.html` (bundle.js gains one line) | pure functions (coins, levels, streaks, freeze) testable in Node, used by both server and pages, like logic.js |
| data | new tabs on the planner's own Google Sheet, made on first use by the existing `tab_(name, head)` | free, private, already backed up; nothing new on Drive |
| pages | a Game tab in `Planner.html` (laptop) and `Phone.html` (phone), corner creature | reuse planner tab/card/button styles |
| art | pixel chibi Cthulhu from `replica/art/cthulhu_pixel.py`, room items as small inline PNG/SVG data in `game-logic.js` | original art, no web art |
| jobs | none. Day rollover runs lazily inside `gameLoad` (catches up every day since the last run) | no trigger to install or forget; safe to run twice |
| auth | the planner's `?key=` link | one user |

No paid API, no UrlFetch, no Gmail or new OAuth scopes. Classroom is already a planner service.

## Sheet tabs (exact header row; all prefixed "Game" so they sort together)

Dates are `yyyy-MM-dd` text in Europe/London (`TZ` in Code.gs). JSON columns are plain text.

| tab | header columns |
| --- | --- |
| Game Player | `Setting`, `Value` (rows: coins, xp, level, hp, maxHp, lastDay, deaths, cutoff, laptopShow, coinName, room) |
| Game Goals | `id`, `name`, `kind`, `polarity`, `days`, `everyN`, `minutes`, `track`, `autoSource`, `autoRule`, `value`, `streak`, `bestStreak`, `lastDone`, `private`, `sort`, `archived`, `created` |
| Game Ticks | `id`, `when`, `day`, `goalId`, `delta`, `coins`, `xp`, `hp`, `auto`, `ref`, `note` |
| Game Owned | `itemId`, `boughtOn`, `price`, `room`, `slot`, `worn` |
| Game Rewards | `id`, `name`, `need`, `limit`, `unlockedOn`, `claimedOn`, `archived` |
| Game Bosses | `id`, `name`, `art`, `maxHp`, `stages`, `reward`, `startedOn`, `status`, `beatenOn` |
| Game Reviews | `week`, `wentWell`, `slipped`, `p1`, `p2`, `p3`, `savedOn` |
| Game Freeze | `day`, `reason`, `savedOn` |
| Game Seen | `lesson`, `built`, `firstBuiltOn` |

Column meanings that are not obvious:
- Goals `kind` = `habit | daily | todo`; `polarity` = `+ | - | both` (habits only); `days` = weekdays
  `1234567` style string (dailies), `everyN` = every N days instead; `minutes` = how long it really
  takes him (5 / 15 / 30 / 60 / 120, picked from a list); `track` = `necessary | ahead | external |
  life` (see Reward maths); `autoSource` = blank or one of the hook names below; `autoRule` = JSON
  options for the hook (e.g. `{"aheadDays":14}`); `value` = -5..+5 (red to blue colour); `private`
  = never drawn when the laptop view is in safe mode (life goals default to private).
- Ticks `delta` = +1 done, -1 bad habit / untick; `coins`, `xp`, `hp` = the change it caused (so an
  untick writes the exact opposite row, and the totals can always be rebuilt from this tab);
  `ref` = unique evidence key for auto-ticks (`emails|2026-10-19`, `order|2026-11-02`,
  `built|10S2|14`), so the same evidence never pays twice.
- Catalogue of shop items is a constant in `game-logic.js` (id, name, kind
  furniture/wall/floor/outfit, set, price, lockLevel, lockExternal, season `[from,to]`, art, w, h),
  because the art ships with the code. Only what he owns goes in the sheet.
- Owned `slot` blank = in the decorate drawer; `worn` = TRUE for an outfit on the creature.
- Rewards `need` = JSON `{"track":"life","ticks":10,"days":7}` (10 life ticks in 7 days); `limit` =
  his spending cap as text (e.g. "£5").
- Bosses `stages` = JSON `[{"name":"Half of 10S2 marked","due":"2026-11-06","done":"","dmg":40}]`;
  `status` = `active | beaten | slipped`.
- Freeze `reason` = `sick | off | other`. INSET and holidays are NOT stored: they come from the
  planner Data (`data.terms`, `data.inset`, read with `isTeachingDay(data, d)` from logic.js).
- Seen: one row per lesson (`cls|seq index`) with the last `built` flag seen, for "newly built".

## Server functions by flow (all in Game.gs, all start with `check_(k)`)

| function | does | input | output | flow |
| --- | --- | --- | --- | --- |
| `gameLoad(k)` | runs rollover + auto-tick scan, then returns player, today's goals, owned items, active boss, rewards | key | `{player, goals, owned, boss, rewards, reviewDue, frozenToday}` | all |
| `tickGoal(k, id, delta)` | manual tick/untick or bad habit; pays coins/XP or takes HP; handles death | goal id, +1/-1 | new player + the tick row | F01, F02 |
| `saveGoal(k, goal)` / `archiveGoal(k, id)` | add or edit a goal; archive (never delete rows, ticks keep pointing at it) | goal object | goal | S07 |
| `buyItem(k, itemId)` | checks price, level lock, external lock, season; writes Owned row; takes coins | item id | player + owned | F04 |
| `placeItem(k, itemId, room, slot)` | moves an owned item to a slot (blank = drawer); one item per slot | ids | owned list | F05 |
| `wearItem(k, itemId, on)` | outfit on/off | id, bool | owned list | F04 |
| `startBoss(k, boss)` / `tickStage(k, id, n)` | make a boss from a big job; tick a stage = damage; last stage beats it and pays the reward | boss / stage index | boss + player | F06 |
| `claimReward(k, id)` | only if `need` is met in the window; stamps claimedOn | id | reward | F07 |
| `setFreeze(k, day, reason, on)` | mark or unmark a sick/off day (today or past 7 days only) | day, reason | freeze list | F08 |
| `saveReview(k, review)` | Sunday review; pays a small bonus once per week | three boxes + 3 priorities | review + card data | F09 |
| `setGameSetting(k, key, value)` | cut-off time, laptop safe mode, coin name | key, value | player | S09 |

Internal helpers: `rollover_()`, `autoScan_()`, `pay_(goal, delta, ref, auto)`, `gameRows_(tab)`.
All writes go through `withLock_` (Behaviour.gs) so a phone tap and a laptop tap cannot both pay.
Nothing in `loadAll` (the planner's main call) returns game data; the board page never calls Game.gs.

## Auto-tick hooks (where each reads from)

All hooks are READ-ONLY scans in `autoScan_()`, called from `gameLoad`. They read tabs the planner
already writes, so the existing functions stay untouched, with one exception (order sheet). A hook
pays only if its evidence row exists, and writes its `ref` so it never pays twice.

| hook (`autoSource`) | evidence it reads | rule | ref |
| --- | --- | --- | --- |
| `behaviourLogged` | "Behaviour Log" tab via `readLog_()` (Behaviour.gs; Timestamp, Class, Type); today's classes from `plannerTimetable_()` (Code.gs) | at least one row for every class he taught today; optional `autoRule.detentions` counts rows with Type `Negative` and a rule | `beh|day` |
| `classGoal` (later) | "Sessions" tab via `readSessions_()`, same maths as `getFriday()` (80% of silent time quiet) | per-class target in `autoRule` (e.g. `{"cls":"9XS","pct":85}`), tiers pay more | `quiet|cls|week` |
| `fridayEmails` | "Emails" tab via `readEmails_()`, written by `markEmailed()` (Behaviour.gs) | at least one row dated Mon-Sun of this teaching week | `emails|monday` |
| `homeworkSet` | "Homework" tab via `hwRows_()` (Code.gs, header `HW_HEAD`), state via the same `Classroom.Courses.CourseWork.get` call `homeworkStatus()` makes | counts only when the Classroom post is `PUBLISHED`, or status `scheduled` and `postAt` has passed, or status `marked`. A draft or "form only" does not count | `hw|row id` |
| `orderSheet` | ONE new line in `exportXlsx()` (Code.gs): append `[when, 'order sheet downloaded', title]` to the existing "Log" tab (`tab_('Log', ['when','what','where'])`). Week from the title ("Order Sheet Week B - Nov 2") | days between download and that week's Monday: 14+ pays tier 2, 7-13 tier 1, less pays nothing. This goal is "order sheet ready" (track `ahead`). **Sending it is a separate manual goal** "Order sheet sent to technicians" (track `necessary`, 5 min), ticked by him (Patryk 2026-10-23) | `order|monday` |
| `lessonsAhead` | Data tab (`data.classes[cls].seq[i].built`, set at home by planner-catalogue.js when the folder has a .pptx) against "Game Seen"; lesson dates from saved weeks in the "Weeks" tab (slot `cls`, `i`, `day`) | a lesson whose flag flips from not built to built counts once ("only newly built"). Days ahead = its planned date minus `firstBuiltOn`: 2+, 7+, 14+ are three separate goals (`autoRule.aheadDays`) | `built|cls|i` |
| `marking`, `reports` | none yet (no planner data) | manual ticks; boss fights for big marking jobs | n/a |

First run: Game Seen is filled silently with the current flags, so lessons already built before the
game started pay nothing. Lesson flags only change when home exports new planner data, so a lesson
built tonight ticks when the next data arrives (usually the next morning): `firstBuiltOn` = the day
the Data tab changed, which can only make him look less ahead, never more.

## Reward maths (v2, Patryk 2026-10-23; all in `game-logic.js` constants, tunable)

Coin name: **Eldritch Doubloons** (short "Ð" on small labels).

**Pay = time it takes × what kind of job it is.** Patryk asked for values based on his real time investment, and on whether a job is necessary, extra or outside work. Habitica's own advice is the same: set difficulty by how hard the task really is for you.

Time (picked when the goal is made; pay grows slower than time, so short jobs are still worth doing):

| minutes | 5 | 15 | 30 | 60 | 120+ |
| --- | --- | --- | --- | --- | --- |
| base Ð and XP | 3 | 6 | 10 | 16 | 25 |

Kind of job (`track`) multiplies the base:

| track | what | × | examples |
| --- | --- | --- | --- |
| `necessary` | has to happen anyway | ×1 | behaviour logged, homework set, order sheet sent, books marked, report data in |
| `ahead` | extra: beyond what's required, saves future stress | ×1.5 | lesson built 1-2 weeks ahead, order sheet ready 2 weeks early, ahead on marking |
| `external` | outside work | ×3 | tutoring, side business; also counts towards the locked shop shelf |
| `life` | his life goals | ×2, plus the life bonus below | reading, training, writing, Martha, a friend, bedtime |

**Life bonus (replaces the "no late work" idea, Patryk 2026-10-23):** the first life goal each day +5 Ð. Three or more life goals in a day +15 Ð. Five days in a week with a life goal unlocks a cute item from the life shelf. There's no evening condition, and late work is never counted against him.

Bad habits (−): HP loss by time sunk, so 15 min = 4, 60 min = 8, 120+ = 12. Doubloons are never taken for a bad habit, only health.

- **Value colour:**
  - doing a goal moves its value +1; a missed due daily moves it −1 (range −5 to +5, no HP loss);
  - a red goal pays up to ×1.5 (`1 + max(0, -value) * 0.1`), so doing the neglected thing pays more.
- **Streaks:**
  - +1 per due day done; a due day missed resets it, unless the day is frozen;
  - the bonus is +10% per 7 days, capped at +30% (low cap, since streak anxiety tends to start around day 30).
- **Levels:**
  - the XP to go from level L to L+1 is `150 + 50 * L`;
  - a typical teaching day is about 80 Ð:
    - 4 necessary jobs, about 30 Ð;
    - 1 ahead job, about 20 Ð;
    - 2 life goals plus the bonus, about 30 Ð.
- **Health:**
  - max 50; only a tapped "−" on a bad habit takes HP;
  - heal +1 per positive tick and +5 at each rollover, with a full heal on level up;
  - missed planner tasks never take HP.
- **At 0 HP (confirmed 2026-10-23):**
  - level −1 (never below 1) and XP to the start of that level;
  - doubloons minus what he EARNED in the last 7 days (positive ticks only), never below 0;
  - all items, outfits and placements are KEPT;
  - HP back to full, and the creature looks sad for the day.
- **Frozen days:**
  - a frozen day is a non-teaching day (holiday or INSET, from planner Data) or a day in Game Freeze;
  - on one, missed dailies reset nothing and things done still pay;
  - weekends aren't frozen; work dailies just aren't scheduled on them.

**Shop prices (Patryk: big items about a week, small about 2 days; a day is about 80 Ð):**

| band | what | price |
| --- | --- | --- |
| A small | posters, plants, little props | 150-180 Ð (about 2 days) |
| B medium | furniture, rugs, lamps | 250-350 Ð (3-4 days) |
| C big | fish tank, desk, bookcase wall, outfits | 500-600 Ð (about a week) |
| D special | locked shelf items (also need external count 1 / 3 / 5 / 10), seasonal, boss trophies | 600-900 Ð, or not for sale (trophies) |

- 13 starter items are free. Level locks open a new set every 3 levels; a second room at level 5, the outside at level 10. Seasonal shelf: 4-6 items per half term, gone when the term ends.
- **Boss fights:** maxHp = the sum of stage `dmg`. A stage done on time does full damage, late does half. Beating the boss pays 150-300 Ð plus an exclusive trophy item. A slipped deadline takes no HP.
- **Real-life rewards:** separate from doubloons, never bought with them, and unlocked by life goals only. For example, coffee out = 10 life ticks in 7 days, a pub drink = life goals on 5 days in a week. Each one shows his spending cap.
- **Sunday review:** +20 Ð once a week.

**What the research says about setting tasks (for the goal editor's tips and the starter set):**
- **Start with few dailies, 5 to 7.** Too many is the usual reason people quit; the Habitica wiki's fix is turning some into habits or to-dos.
- **Price by real effort for you,** not by how important it sounds. That's the time × kind model above.
- **Jobs done in several sittings:** one daily with a checklist (e.g. marking: 3 boxes for 3 sittings), not 3 separate dailies.
- **Rewards:**
  - a reward only after the work (redeem after, never on credit);
  - cheap ones for small treats, expensive ones for big;
  - adjust prices once real earning is known (review the numbers after 2 weeks).
- **Keep rewards modest and the game cute.** Big rewards for things he already enjoys can make them feel like chores (the "overjustification" effect). Life goals earn treats, but the main pull is the creature and the room.
- **Kind streaks:** freezes, a low bonus cap, and a broken streak never costs anything but the bonus.

Sources:
- [Habitica wiki: Establishing your goals](https://habitica.fandom.com/wiki/Establishing_Your_Goals)
- [How Habitica's creator uses Habitica](https://ocdevel.com/blog/20210108-how-to-use-habitica)
- [Habitica blog: custom rewards](https://blog.habitrpg.com/post/63773035693/custom-rewards-post-13)
- [The Decision Lab: streak creep](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)
- [Yu-kai Chou: streak design and burnout](https://yukaichou.com/gamification-analysis/streak-design-gamification-motivation-burnout/)
- [IRF: incentive fatigue](https://theirf.org/research_post/academic-research-in-action-incentive-fatigue-why-rewards-lose-steam-and-how-to-fix-them/)

## The parts that bite

- **Time zones:** every day key is made with `Utilities.formatDate(d, TZ, 'yyyy-MM-dd')`; never
  `toISOString()` (that is UTC and puts 00:30 on the wrong day in summer). Rollover processes each day
  from `lastDay + 1` to yesterday, in order, then sets `lastDay`, so it is safe to run twice.
- **Double pay:** auto-ticks are keyed by `ref`; manual ticks check "already done today" first; all
  writes in `withLock_`. An untick writes a reversing row, never deletes a row.
- **Projector:** game data lives only in Game.gs calls. The laptop shows the creature + coins only
  (no goal names, no private goals) unless he switches "show my goals" on; that switch resets on
  every page load. The board page (BoardPage.html) never loads game code.
- **Sheet speed:** Game Ticks grows ~15 rows a day (~5,000 a year), fine. Read only the last 60 days
  for the 7-day penalty and streak checks; totals live in Game Player.
- **Stale built flags:** see the hook table; first run seeds Game Seen with no pay.
- **Classroom call cost:** homework state is checked only for rows set in the last 14 days, reusing
  the 5-minute `hwstat` cache when present.

## Tests (same patterns as the planner)

- `planner/test-game-logic.js`: pure maths (pay per minutes and track, level thresholds, death
  penalty never below 0, streak reset vs freeze, 0 HP on a bad habit, season windows).
- `planner/tests/game.test.js`: Game.gs + Code.gs + Behaviour.gs loaded together on
  `tests/mock-appsscript.js` (as server.test.js does): tick pays once, untick reverses, each hook
  pays once per ref and not at all without evidence, first-run seeding, rollover twice = same result.
- `make-preview.js` stand-in gains fake Game calls, so the Game tab can be screenshotted headless
  before Patryk deploys (no live-desktop clicking).

## Build order (thin vertical slices; each ends deployable and tested)

1. **Room + one daily + doubloon counter, end to end.** Game Player, Game Goals, Game Ticks;
   `gameLoad`, `tickGoal` (+1 and untick only); one seeded daily goal; S01 bare room with the pixel
   Cthulhu (idle/happy) and the Ð counter, S02 with that one row; Phone.html and Planner.html tab,
   laptop in safe mode. Tests: pay once, untick, safe mode hides the name.
2. **Goals proper (F01, F02, S07).** Goal editor, habits +/-, minutes x track (necessary / ahead / external / life), life bonus,
   XP + levels, HP + death penalty, sad/proud moods.
3. **Days (F08).** Lazy rollover, streaks, value colour, Game Freeze + term/INSET freeze, sleepy mood.
4. **Auto-ticks (F03), one hook per step:** `fridayEmails`, `behaviourLogged`, `homeworkSet`,
   `orderSheet` (the one-line Log append in exportXlsx), `lessonsAhead` (+ Game Seen seeding).
5. **Shop + decorate (F04, F05, S03, S04).** Catalogue of ~30 items, Game Owned, level and external
   locks, outfits.
6. **Real-life rewards (F07, S05).** Game Rewards with need windows and spending caps.
7. **Boss fights (F06, S06).** Game Bosses, stages with deadlines, trophy items.
8. **Sunday review + weekly card (F09, S08), settings (S09).** Then the "should/could" list: seasonal shelf, second room and outside, class-goal tiers.

Next in the replica pack: `/replica-design` (room, creature moods, coin icon, item set in one style).

**Room world v2 (2026-10-23):** corner rooms, zones, upgrade lines, pets, outfits, potions, quests and the room list are in `design/world.md`. It replaces the room parts of slices 1 and 5; pets, potions, quests and new rooms become slices 9-12.

**BUILT 2026-10-23 (slices 1-3 plus first rituals):** `planner/Game.gs` (server, tabs Game Player/Goals/Ticks/Freeze/Seen), `planner/game-art.js` (Ulhu sprites, joined into dist/Game.gs), `planner/game-ui.js` (one screen shared by Planner.html and Phone.html, pasted at `<!--GAME_UI-->` by bundle.js). Public functions: gameLoad, gameTick, gameUntick, gameSaveGoal, gameArchive, gameFreeze. Tests: `node planner/tests/game.test.js`. Pure maths lives inside Game.gs (no separate game-logic.js was needed).

**BUILT 2026-10-23 (second round): slice 5 shop + room, slice 7 boss fights, slice 8 Sunday review, auto-ticks for homework set and order sheet.** New: `replica/art/export_shop.py` -> `planner/game-shop.json` (120 items, sprite layers with offsets) -> `dist/GameShop.gs` (const SHOP). Game.gs adds gameShop, gameArt, gameBuy, gamePlace, gameBossStart, gameBossStage, gameReview and tabs Game Owned / Game Bosses / Game Reviews. Code.gs `exportXlsx` now logs "order sheet downloaded" (read by the order sheet hook). Not yet: outfits (the 60 outfit items), real-life rewards (slice 6), pets, potions, rooms, seasonal items.
