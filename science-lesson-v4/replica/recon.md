# Recon map: Habitica + Focus Friend → Patryk's Cthulhu habit game

Clean-room recon (2026-10-23). It covers what the apps DO and how a user moves through them. Nothing they own is copied: code, art, names, copy. Public sources only (below); no account used.

## Scope
- **Apps:** Habitica (web + phone) for the game rules; Focus Friend by Hank Green (iOS/Android) for the **room and shop only**.
- **Slice:** Habitica's core loop (tick tasks → earn coins/XP, miss or do bad things → lose health), plus Focus Friend's creature-in-a-room and decoration shop.
- **Not taken (Patryk 2026-10-23):** Focus Friend's focus timer, session lengths, app blocking and "put your phone down" mechanic. In this game coins come from planner tasks and life goals, not from timers.
- **Who for:** Patryk only, inside his planner (Apps Script web app, phone + laptop). Not a product, so no accounts, payments, store listing or rebrand checks.
- **His full wish list:** memory note project_habit_game_2026_10_22.md (two reward tracks, kind streaks, evening cut-off, boss fights for big jobs, Sunday review, weekly card).

## Sources
| source | what it gave |
|---|---|
| [Focus Friend App Store listing](https://apps.apple.com/US/app/id6742278016) | feature list, changelog (Street View 1.27, bean clothes 1.24, bedroom), 4.8★ / 9.2K, cosmetic-only purchases |
| [Nerdschalk explainer](https://nerdschalk.com/how-does-focus-friend-work-hugely-productivity-app-explained/) | socks currency, shop of posters/plants, room decorating in breaks, naming the bean |
| [Good Good Good](https://www.goodgoodgood.co/articles/hank-green-focus-friend), [Tedium](https://tedium.co/2025/08/19/focus-friend-hank-green-adhd-app/), [HackerNoon roundup](https://hackernoon.com/wtf-is-focus-friend-app-what-42-real-internet-people-think) | socks/scarves traded for furniture; praise (low pressure, cute); complaints (novelty fades, want more rooms/decor) |
| [Habitica wiki: Death](https://habitica.fandom.com/wiki/Death), [Rest in the Inn](https://habitica.fandom.com/wiki/Rest_in_the_Inn), [Tasks](https://habitica.fandom.com/wiki/Tasks) | health loss, death penalty, streak reset, red/blue task value, difficulty, boss damage, pause |
| [Habitica reviews roundup](https://habi.app/insights/habitica-alternatives/), [unstar.app comparison](https://unstar.app/blog/streaks-habitica-way-of-life-strides-habit-tracking-apps-ranked-2026), [Trustpilot](https://dk.trustpilot.com/review/habitica.com) | what users hate (below) |

## How the two apps work (the parts we want)
**Habitica**
- Four task kinds:
  - **Habits** with + and/or −;
  - **Dailies** on a schedule;
  - **To-dos** (one-off, with checklists and due dates);
  - **Rewards**, built-in and custom.
- Ticking earns **gold + XP**. Harder tasks earn more (difficulty ×0.1 trivial, ×1 easy, ×1.5 medium, ×2 hard, from a secondary source).
- **Task colour shows its value.** Yellow is neutral, blue means you've been doing it, red means you've been missing it. Red tasks give more reward when done and do more damage when missed. To-dos redden the longer they wait.
- **Health:**
  - a missed daily at day end, or a tapped "−" habit, takes health;
  - at 0 you "die": you lose a level, your XP towards the next level, all gold and one piece of gear, and come back on full health;
  - a missed daily resets that daily's streak.
- **Rest in the Inn** pauses all damage (holidays and sick days).
- **Boss quests:**
  - your ticks damage the boss;
  - your misses let the boss hit you, multiplied by its strength;
  - in a party, everyone suffers.
- There's also gear, pets, mounts, classes and mana.

**Focus Friend (room and shop only)**
- **The Bean:** one creature with a name, who lives in a room you can see.
- **Its reactions:** happy, or sad after a failure. Proud on a win.
- **Currency:**
  - earned socks (free);
  - scarves (paid).
- **The shop:**
  - decorations in themed sets (hundreds of them), plus outfits and skins;
  - the stock changes, with new outfits in recent updates.
- **The room:**
  - you decorate it by placing items;
  - more rooms were added over time: a bedroom, then the Street View house front.
- **The mood:** cosy, low pressure, cute.

## What their users hate (and what we do instead)
| complaint | our answer |
|---|---|
| Health loss causes anxiety, not motivation (Habitica) | Health only drops for things Patryk chooses as bad habits (e.g. Netflix binges). A missed planner task never hurts; it just earns nothing. Kind streaks freeze on sick days, INSET and holidays. |
| The RPG layer is overwhelming (Habitica) | No classes, mana, pets, mounts or stats. Keep coins, levels, health and the room. |
| Party members dragging you down | Solo only. |
| Motivation fades after a month (both) | Seasonal stock each half term; boss fights for real big jobs (test marking); external-work items locked until earned; the Sunday review. |
| Sync bugs mark done things as missed (Habitica) | Ticks come from planner data that's already saved (behaviour logs, order sheet, built lessons) wherever possible. |
| Wants more rooms and decorations (Focus Friend) | Start with one room plus a shop of about 30 items; rooms unlock with levels. |
| Ticking without the behaviour changing | Auto-ticks only count when the thing has really happened, as he asked. |

## Screen inventory (for our version; S = screen)
| ID | screen | how you get there | purpose | key components | states |
|---|---|---|---|---|---|
| S01 | Cthulhu room | Game tab (and a small corner view) | Home: the creature in its room, coins, level, health | room canvas, creature sprite, coin counter, health bar, XP bar | morning/day/evening (yawns after the cut-off), happy/proud/sad, empty room (first day) |
| S02 | Today's goals | Game tab, first panel | Tick dailies, habits (+/−) and to-dos | task rows with value colour, + and − buttons, auto-tick badge | none due, all done, overdue, holiday freeze |
| S03 | Shop | button in S01 | Buy room items and outfits | item cards, price in Cthulhu coins, locked badge (needs external work / level), seasonal shelf | can't afford, locked, owned, new stock |
| S04 | Decorate | tap "Decorate" in S01 | Place, move and store owned items | room grid, inventory drawer, snap slots | nothing owned, room full |
| S05 | Real-life rewards | tab in S03 | Big real rewards (coffee out, pub drink), unlocked by life goals | reward cards with goal progress, spending-limit note | locked, unlocked, claimed |
| S06 | Boss fight | banner in S01 when one is active | Big job split into stages with deadlines (e.g. test marking) | boss art, health bar, stage checklist, deadline | not started, part done, beaten, deadline missed |
| S07 | Goal editor | ✎ on any goal, "+ goal" | Add or edit a goal: kind, schedule, difficulty, track (work/life), auto-tick source | form | new, edit, delete |
| S08 | Sunday review + weekly card | appears on Sunday | Went well / slipped / next week's 3 priorities, then a cute summary card | three text boxes, card preview | not done, done |
| S09 | Settings | gear | Evening cut-off, hide on projector, freeze days, coin name | toggles | n/a |

## User flows (F = flow; clicks counted on the happy path)
- **F01 Tick a goal:** S02 tap a daily, then coins fly to the counter and the creature reacts (1 tap).
  - Edges: the daily isn't due today; it was already auto-ticked; an untick.
- **F02 Bad habit:** S02 tap − on "Netflix binge", then health drops and the creature looks sad (1 tap).
  - Edge: health hits 0, with a gentle penalty (decide with Patryk; Habitica's is harsh).
- **F03 Auto-tick:** the planner logs behaviour, builds a lesson or sends the order sheet, and that goal ticks itself with a badge (0 taps).
- **F04 Buy an item:** S01, then Shop, pick an item, then Buy (3 taps).
  - Edges: can't afford it; it's locked behind external work; it's seasonal and leaving soon.
- **F05 Decorate:** S01, then Decorate, drag the item to a slot, then Done (3 or 4 taps).
- **F06 Boss fight:** start one from a to-do ("Mark 10S2 tests"), tick stages to damage the boss, beat it for a big reward.
- **F07 Claim a real reward:** finish a life goal and the reward card unlocks; Claim logs it (2 taps).
- **F08 Freeze:** mark a sick day or holiday, streaks freeze, and no health loss (2 taps). The planner already knows INSET and holiday dates.
- **F09 Sunday review:** S08, fill in three boxes, see the card (about 4 taps).

## Components
- Room canvas with item slots (S01, S04)
- Creature sprite with moods (S01, corner view, S08 card)
- Coin counter with its own coin icon (S01, S03, S05)
- Bars for health and XP (S01, S06)
- Task row with value colour and the + / − buttons (S02)
- Item card (S03, S04)
- Reward card (S05)
- Boss panel (S06)
- Goal form (S07)
- Toast or reaction bubble (everywhere)

Reuse the planner's existing tab, card and button styles.

## Inferred data model (our version; a guess where marked)
- **Goal:**
  - id, name, kind (habit | daily | todo), polarity (+ | − | both), schedule (days / every N days), difficulty (1-4), track (work | external | life), autoSource (null | behaviourLog | orderSheet | lessonBuilt | ...), value (−ve red … +ve blue), streak, frozen, archived.
  - Evidence: the Habitica task kinds and value colours; his wish list.
  - Confidence: high.
- **Tick:**
  - goalId, date, delta (+1/−1), coins, xp, hp, auto (bool).
  - Confidence: high.
- **Player:**
  - coins, xp, level, hp, maxHp, evening cut-off, freeze dates.
  - Confidence: high.
- **Item:**
  - id, name, kind (furniture | wall | floor | outfit | skin), price, lock (level N | external work N | season), set/theme.
  - Evidence: the Focus Friend shop themes and outfits.
  - Confidence: medium.
- **Placement:**
  - itemId, room, slot.
  - Confidence: medium (a guess at Focus Friend's grid).
- **Reward:**
  - id, name (real life), goalNeeded, cost limit, claimedOn.
  - Confidence: high (his spec).
- **Boss:**
  - id, name, art, hp, stages [{name, due, done}], reward.
  - Evidence: Habitica quests; his test-marking example.
  - Confidence: high.
- **Review:**
  - week, wentWell, slipped, priorities[3].
  - Confidence: high.
- **Storage:**
  - These become tabs on the planner's own Google Sheet, the same as Weeks and Homework.
  - Free, private, and nothing new outside his Drive.

## What we don't take (skip)
- Focus timer, sessions, app blocking, live activity: Patryk doesn't want them.
- Parties, guilds, chat, challenges: solo game.
- Classes, mana, pets, mounts, eggs and potions: too much, and a top complaint.
- All Habitica and Focus Friend art, names ("Bean", "socks", "Habitica"), sounds and copy: we draw our own Cthulhu, coin and items.
- Paid currency (scarves, gems): no payments. Locks come from real work instead.

## Size
- About 9 screens, 9 flows and 8 data types.
- **Size M** (a few focused sessions).
- **Hardest parts:**
  1. **The art.** A creature with moods, about 30 room items and a coin, all in one cute style. The pixel version starts now.
  2. **Auto-ticks** from planner data, each needing its own hook.
  3. **Fair balance** of coins, prices, health and locks, so it feels kind and isn't grindy. This needs his tuning.

**Next step:** replica-architect, which plans the sheet tabs, the server calls and the build order. Before that, Patryk approves this map and the creature.
