# Claude Design brief: Ulhu's Rituals (phone redesign)

Please design a **clickable phone prototype** (Android, 390 x 844, Chrome) of "Ulhu's Rituals": a Cthulhu-themed habit and task game for a secondary-school science teacher. It lives inside his own planner web app. It is like Habitica, but it is about his real teaching jobs and his life. Make it look amazing, feel fast and tactile, and fit a lot into a small space without clutter.

## 1. The mascot and the mood
- **Ulhu** is a small, friendly, cute Cthulhu, mint green ("Kelp Mint") with little wings and face tentacles. He lives in a cosy sunken room, the **Den**. Today he is 32 x 32 pixel art (8-bit feel). He has five moods: idle, happy, proud, sad (hurt), sleepy.
- **Please make a comparison sheet:** today's 8-bit Ulhu next to a **16-bit redraw** (about 64 x 64, more shading and detail, same character and palette), each in all five moods. Show both inside the banner and the Den, so we can judge which fits the rest of the design.
- **The style is a mix of two looks:**
  - **Sunken R'lyeh:** carved stone tablets as cards, barnacles, glowing runes, a dark green-black deep sea.
  - **Forbidden tome:** parchment paper, ink, wax seals, red and black, and handwritten runic headings.
  - Keep **pixel art** for the characters, items, coins and icons.
- **Colours:**
  - eldritch glowing green (rituals, success);
  - deep purple (quests, magic);
  - blood red and coral (curses, bosses, damage);
  - old gold and bronze (coins, rewards, frames);
  - on a near-black deep-sea background, with parchment for the paper elements.
- **Text:** headings in a runic or handwritten display font. Numbers must be very legible in a plain font: a pixel font made 2 and 5 look like 8 and S.
- **Currency:** Eldritch Doubloons. Show them as a **chunky pixel-art gold doubloon with a tentacle face**, about twice the size of normal text, never as a letter symbol. It spins briefly when earned.

## 2. Layout (phone)
1. **Top banner (about a quarter of the screen):** Ulhu at medium size in a small scene. He reacts: happy bounce on a tick, a flinch on a curse, asleep after 7 pm and on days off. Overlaid on the banner:
   - the doubloon counter (big);
   - the level badge;
   - thin XP and health bars;
   - one short line of what Ulhu "says".
2. **The Undo line:** one quiet line under the banner showing the last action (e.g. "Ticked: Read +25") with an **Undo** button. It must never be a pop-up that covers anything; the teacher hates pop-ups.
3. **Four tabs:** **Rituals | Quests | Curses | Den**. Switch by tapping the tab or by **swiping left and right** on the content. The active tab indicator slides.
4. **Lists use fold-away groups** with themed names, which open and shut. He can **add and rename** groups. The two main ones are **Teaching** and **Life**. Inside Teaching there are sub-groups such as **Teaching chores** and **Book marking**. Suggest themed names, e.g. "The Marking Crypt".
5. **Ticks:**
   - a big round tick target (44 px or more);
   - the length and the reward visible;
   - a coloured edge for the kind: **Necessary** (blue), **Ahead** (amber), **Outside work** (purple), **Life** (green).
   - A tick must react **instantly**: the coin flies to the counter, a rune glows, Ulhu reacts in the banner, one short phone buzz, all in under a second. The server catches up afterwards.
   - Big moments (boss beaten, level up) get a slightly bigger celebration, never a blocking screen.

## 3. The tabs

### Rituals (repeating things)
- **Repeats:** every school day, **chosen weekdays** (e.g. Mon/Wed/Fri), or **every N days** (every 3 days, every 2 weeks).
- **Each ritual:** name, length (5 / 15 / 30 / 60 / 120+ min), kind, and streak (a small flame-like rune with a number).
- **Pay:** set by length × kind.
  - **Base by length:** 5 min = 3, 15 = 6, 30 = 10, 60 = 16, 120 = 25.
  - **Multiplier by kind:** necessary ×1, ahead ×1.5, outside work ×3, life ×2 (plus a small first-life-goal bonus).
  - **Streak:** adds up to +30%.
- **Rituals that tick themselves**, shown with a small "ticks itself" seal: Log behaviour, Friday emails, Set homework, Order sheet downloaded.
- **"Summoned":**
  - **What it is:** a group where the planner automatically summons "Build 9XS lesson 4" for upcoming lessons. Each ticks itself when the lesson is built.
  - **The Tide Charts quest line:** building a week ahead earns a bonus, and two weeks ahead completes it. Show it as a small progress chart, e.g. "Tide Charts 2 of 3".
- **Book marking (termly):**
  - **Who:** one card per class (9AS, 7MLA, 8XP, 8AG, 10C2, 10S2, 9XS).
  - **Halves:** each card has two halves, "1st half" and "2nd half", to tick.
  - **Deadline:** "56 days left" in the group header.
  - **Layout:** compact, two columns.
- **Sunday review:**
  - **When:** appears Friday to Sunday.
  - **Folded:** one line at the very bottom, "Sunday review +20".
  - **Open:** this week's stats, "What went well", "What slipped", and three priorities for next week.
- **"+ Ritual" form:** fast, mostly taps (chips for length, kind, repeat, group), with live pay shown.

### Quests (one-off tasks and boss fights)
- **A quest** is a one-off task with a themed feel. It has:
  - a name;
  - a length (sets the gold, same table as rituals);
  - a kind colour;
  - an optional **due date** ("due Fri", glowing as it gets close);
  - an optional **checklist** of small sub-steps ticked inside it.
- **Late work is never penalised.**
- **Boss fights:** big jobs split into stages (e.g. "Mark the 10S2 test": half marked, the rest, scores summed, entered).
  - **Size sets the gold.** When creating a boss, pick its size by **total hours: 2h, 5h, 10h, 20h+**. 2 hours is the minimum to be a boss. Gold scales with size; suggested 60 / 150 / 300 / 600 doubloons when beaten, plus a trophy.
  - **Stages:** each has a name and a "by" date. A stage done on time deals full damage; a late one deals half. An overdue stage just shows "overdue".
  - **The boss is a creature:** design 3 or 4 pixel-art boss creatures by size (a small spawn up to a great old one) with a health bar that drains.
  - **Fixing mistakes:** a boss made by mistake can be removed (two taps), and Undo puts it back.
  - **Templates:** "Marking template" pre-fills the four marking stages with dates.
- **"+ Quest" and "+ Boss":** quick forms.

### Curses (and Blessings)
- **Curses:** bad habits (e.g. "Binge-watching Netflix", 120 min). Tapping one costs **health, never coins** (5 min = −2 HP … 120 min = −12 HP).
  - At 0 health Ulhu faints: he loses a level and the coins earned in the last 7 days, then comes back at full health.
- **Blessings:** good habits you can tap any time, as often as you like (e.g. "Drank water", "Went for a walk"). Each tap pays a few coins.
- **Days off:** a "Sick or off today" button freezes the day, so streaks keep and nothing counts as missed. Holidays and INSET days freeze on their own. Show this visually: Ulhu asleep, the page dimmed.

### Den (room, shop, wardrobe, rewards)
- **The room:** an isometric pixel room (floor, walls, rug, window, light, corner, seat, table, wall hangings, props) with Ulhu in it.
  - **The shop:** 120 items in tiers **Basic / Nice / Fancy / Eldritch**, with prices and some level locks. Buy, place and take out.
  - **Categories:** a scrolling strip.
- **Ulhu's wardrobe:** 60 outfits (hats, tops, face, held items, skins) to dress him. They show on him in the banner too.
- **The Hoard (real-life rewards):** rewards he writes himself and buys with doubloons, e.g. "Takeaway night 300", "One hour of gaming 80". Buying one plays a small "claimed" seal stamp.
- **The Chronicle (stats):** coins per week, a streak calendar, bosses beaten, and a trophy shelf.

## 4. Rules for the design
- Phone first and thumb-reachable: the main actions sit in the lower half; no tiny targets.
- Fast: everything reacts on the tap; nothing waits for the server.
- Clean: show only what matters today. Older and finished things fold away. No pop-ups and no full-screen blockers.
- Must work as **one self-contained web page**:
  - Google Apps Script HtmlService;
  - images as inline pixel art (data URIs) or CSS;
  - fonts from Google Fonts only;
  - no other outside images or services.
- **Dark only** is fine.
- **What to deliver:**
  1. The clickable prototype: all four tabs with realistic content (the examples above), tick and undo, swipe between tabs, the add-quest form, a boss card, and the Den shop and wardrobe.
  2. The 8-bit vs 16-bit Ulhu sheet.
  3. The boss creature sheet.
  4. The doubloon coin.
  5. A short style guide (colours, fonts, card types, icons) so it can be rebuilt in the real app.
