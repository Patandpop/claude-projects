# Handoff: Ulhu's Rituals (phone redesign)

## Overview
Ulhu's Rituals is a habit and task game in the style of Habitica, themed around a small, cute Cthulhu. It is for a secondary-school science teacher and lives inside his own planner web app, which runs on Google Apps Script HtmlService in Chrome on Android. This bundle redesigns the phone view (390 × 844) with four tabs (**Rituals · Quests · Curses · Den**), a banner showing Ulhu, and a one-line Undo bar.

## About the design files
The `.dc.html` files are **design references made in HTML**. They are working prototypes that show the intended look and behaviour. They are not production code to paste in. Rebuild them inside the planner's existing Apps Script / HtmlService front end, following its patterns. The final page must be **one self-contained HTML page**:
- images as inline data-URI PNGs or CSS;
- fonts from Google Fonts only;
- no other outside requests.

To view them, open `Ulhu Rituals Prototype.dc.html` in Chrome. Keep every file in this folder together, because `support.js` is the small runtime the prototype needs. `Ulhu Design Sheets.dc.html` holds the art and style sheets.

## Fidelity
**High fidelity.** The colours, type, sizes, spacing, copy, art and interactions are final. Match them exactly.

---

## Screen layout (390 × 844, top to bottom)
1. **Android status bar** 28 px, **Chrome bar** 46 px, and the **planner bottom nav** 54 px plus a 16 px gesture bar. These belong to the host; you don't need to rebuild them.
2. **Banner**: 172 px tall, full width, `overflow:hidden`.
   - **Background:** a deep-sea gradient `#0f3a34 → #0b2522 → #08110f`. After 7 pm or on a day off, use the night gradient `#050a18 → #0a1424 → #0a1210`.
   - **Light rays:** a `repeating-linear-gradient(104deg, rgba(170,255,225,.055) 0 16px, transparent 16px 52px)` faded out with a mask.
   - **Scenery:** two dim fluted stone pillars, a kelp sprite on the right, and rising bubbles (9 small circles looping upward over 5–10 s).
   - **Stone ledge:** 22 px tall, `repeating-linear-gradient(90deg,#26362f 0 30px,#1b2823 30px 32px)` with a 2 px top border `#3b5047` and barnacle dots.
   - **Ulhu:** 108 × 108 at left 18, bottom 14, built from his sprite layers. Use `image-rendering: pixelated` everywhere.
   - **Doubloon counter** at left 12, top 9: a 32 px coin, then the number in Atkinson Hyperlegible 700 30 px, colour `#ffd56a`, `text-shadow 0 2px 0 #4a2c0c`, tabular numbers.
   - **Level badge** at top right: a hexagon (clip-path) with a gold gradient (`#ffd56a → #a8681c`) outer and a dark stone inner, showing the number at 18 px. To its left are "LEVEL" (11 px, tracking .12em, `#c9a560`) and the rank title in Grenze Gotisch 16 px.
   - **Speech bubble** at left 132, top 56: parchment `radial-gradient(#f3e7c8,#dcc797)`, radius `3px 10px 10px 10px`, IM Fell English italic 15 px in ink `#2a1a12`, with a left-pointing tail.
   - **XP and HP bars** at left 132, top 110: 7 px tall, each with a pixel icon on the left and a 12 px label on the right ("140 / 250").
     - XP fill: `#1d8a52 → #5ef2a0` with a glow.
     - HP fill: `#a3202a → #ff7a66`.
   - **"DAY FROZEN" chip:** shown when the day is off.
3. **Undo line**: 38 px, background `#0b1311`.
   - Left: a rune icon, then a verb in `#8fa298` ("Ticked:"), the item name in `#e8e1cf`, and the change in `#ffd56a` with a coin, or in `#ff7a66` with a heart for health.
   - Right: "↶ UNDO" in `#5ef2a0`, 700 13 px, tracking .08em, 38 px tall.
   - It is **never a pop-up**. It always sits in the layout.
4. **Tabs**: 46 px, four equal columns, labels in Grenze Gotisch 19 px.
   - **Active colours:** Rituals `#5ef2a0`, Quests `#a48aff`, Curses `#ff7a66`, Den `#ffd56a`. Inactive tabs are `#7f9389`.
   - **Indicator:** a 3 px bar, 56 % of the tab width, glowing in the active colour. It slides along `left` over 280 ms with `cubic-bezier(.2,.8,.2,1)`.
   - **Badges:** Rituals shows the number left to do today; Quests shows how many are due today or tomorrow.
5. **Content**: fills the rest of the height. It is a 400 %-wide track of four panels, moved with `translateX(-tab*25% + dragPx)` over 300 ms with the same easing.
   - **Swipe:** horizontal drag on the content follows the finger. Past 60 px it changes tab, with 1/3 resistance at either end.
   - **Gestures:** set `touch-action: pan-y` so vertical scroll still works. Ignore drags that start in horizontal strips (`[data-hscroll]`) or inputs.
   - **Panels:** padding 10 px, `display:grid; grid-auto-rows:max-content; gap:8px`, each scrolling on its own.
6. **Dock** (the thumb zone): 62 px, background `#0f1916 → #0a110f`. Buttons are 46 px tall, radius 6, Grenze Gotisch 19 px.
   - Rituals: **+ Ritual** (primary green, flex 2) and **+ Group**.
   - Quests: **+ Quest** (purple) and **+ Boss** (red).
   - Curses: **☾ Sick or off today** (ice blue, flex 2, toggles) and **+ Add**.
   - Den: sub-views **Room · Shop · Wardrobe · Hoard · Chronicle**, plus a gold "+" on the Hoard.
   - **Forms open in place of the content panel**, never on top of it.
7. **FX layer**: absolute, `pointer-events:none`. Flying coins, floating numbers, ripples and sparks are created here with the Web Animations API.

## Card types
- **Stone tablet** (rituals, marking, Den tiles): `linear-gradient(180deg,#1b2924,#131d19)`, 1 px border `#2a3b33`, radius 5, `inset 0 1px 0 rgba(255,255,255,.04), 0 2px 0 #040807`. A 4 px left border shows the **kind** colour.
- **Parchment scroll** (quests, Hoard, Sunday review): `radial-gradient(ellipse at 25% 0%,#f3e7c8,#dfcb9c 70%,#cdb37f)`, ink `#2a1a12`, radius 3, `0 2px 0 #3a2a14, inset 0 0 20px rgba(120,80,30,.22)`. Quest names are in IM Fell English 17 px.
- **Blood stone** (bosses, curses): `linear-gradient(180deg,#2a1215,#140a0c)`, border `#4a1e22`, with an inner red glow.
- **Blessing tile**: a green stone tile (`#152a20 → #0e1a15`). The featured "×2 TODAY" tile is in gold (`#2a2410 → #151208`, border `#8a6a2a`).

## Rituals tab
- **Groups fold** with a ▶ chevron that rotates 90° over 200 ms. Tapping ✎ renames the group in place (Enter saves, Esc cancels).
- **Group structure:** top-level group titles are Grenze 22 px; child groups are 18 px and indented 12 px. Each header shows a count ("2 of 6") and a subtitle in 11 px uppercase tracked text.
- **Default groups:** The Teaching Trench (Teaching) contains The Drudgery Shoals (Teaching chores), The Summoning Circle (Summoned) and The Marking Crypt (Book marking · "56 days left" in amber). The Surface World holds Life.
- **Ritual row** (min 58 px; 48 px once done, at opacity .62 with strike-through):
  - **Tick:** a 46 px circle. Rituals that tick themselves have a **dashed** purple ring and a "ticks itself" seal chip (`#26173a` / `#5a3a8a` / `#d4bfff`).
  - **Meta line:** "15 min · Necessary · School days" plus a streak flame and number.
  - **Pay:** "+8" with a coin, in `#f0c45a`.
- **Summoned:** "Build 9XS lesson 4 · for Mon 26". The Tide Charts card (blue, `#12202a`) has a 3-node progress line: next lesson built → a week ahead (+30) → two weeks ahead (done).
- **Book marking:** a two-column grid of class cards (9AS, 7MLA, 8XP, 8AG, 10C2, 10S2, 9XS). Each has two 44 px half buttons, "1st half" and "2nd half", and pays +16 each.
- **Sunday review** (Friday to Sunday): a parchment line at the very bottom, "Sunday review +20". Opened, it shows:
  - 3 stat boxes: ticks, doubloons and bosses beaten;
  - a split bar by kind;
  - "What went well" and "What slipped" text areas with lined paper;
  - three numbered priorities;
  - "Seal the week +20", which stamps SEALED.

## Quests tab
- **Lists:** The Errand Scrolls (Teaching) and Surface Errands (Life). Finished quests fold into "Finished" about 1.1 s after the tick.
- **Quest card:**
  - a 46 px tick that stamps a red wax seal;
  - the kind ink colour;
  - a due chip that glows more as the date gets close: today `#a3202a` with a red glow; tomorrow `#c4502a`; within 3 days `#e8b04a`; later, plain;
  - a checklist of 40 px rows with 22 px ink boxes.
- **Late work is never penalised.**
- **Bosses** live in The Boss Pit.
  - **Card header:** the creature sprite (with a red floor glow), the name in Grenze 19 px, "5h · Deep One · 1 of 4 stages", and an 8 px HP bar that drains over 600 ms.
  - **Folding:** tap the header to open or close the stages.
  - **Stage row:** a 44 px tick and "by Mon 26", plus a tag:
    - "−25 hit" when done on time;
    - "−12 late" when done late (half damage);
    - "overdue" in a coral outline;
    - "today" in amber;
    - otherwise "N days".
  - **Finishing:** the last stage always finishes the boss. Gold is paid in full and a trophy goes to the Chronicle.
  - **Banish** takes two taps (the second within 3 s) and can be undone.
- **+ Boss form:** pick a size by total hours (2h / 5h / 10h / 20h+, paying 60 / 150 / 300 / 600), then a creature (two per size). "Marking template" pre-fills Half marked, The rest, Scores summed and Entered with dates. Tapping a date chip moves it forward a day.

## Curses tab
- **The Cursed Shelf:** tapping costs **health, never doubloons**. Ulhu flinches (shake plus a red tint) and the HP bar flashes.
- **Fainting:** at 0 HP, Ulhu loses a level and the doubloons from the last 7 days, then wakes at full health.
- **Small Blessings:** a two-column grid of tiles (min 82 px), each with:
  - a 12 × 12 pixel icon in a glowing halo;
  - the name and "+N" with a coin;
  - 5 pips for today's taps.

  One tile each day is "×2 TODAY" in gold. Taps send out a ripple ring, a coin flight and a bounce.
- **Blessing chain:** every 8 blessings in a day pays a +10 bonus with a burst of sparks, shown on an 8-segment bar.
- **The Frozen Tide:** "Sick or off today" freezes the day, so streaks keep and nothing counts as missed. The content dims (`rgba(6,14,26,.5–.7)`), Ulhu sleeps and the banner turns to night. INSET days and holidays freeze by themselves.

## Den tab
- **Room:** a 160 × 112 isometric pixel room drawn on a canvas (`PX.drawRoom`) and scaled to fit, with Ulhu on top.
  - **What's drawn:** stone-brick walls with a gold skirting, a plank floor, and skewed wall items (window and hanging). Floor items are sorted by depth.
  - **Light and night:** the lamp throws a warm pool of light, and there is a night tint.
  - **Slot list:** a two-column list of slots with × to take an item out.
- **Shop:** 120 items, 12 in each of 10 categories, shown in a sideways-scrolling strip: Floors, Walls, Rugs, Windows, Lights, Corner, Seats, Tables, Hangings, Props.
  - **Tiers:** Basic, Nice, Fancy, Eldritch, with prices 0, 40, 80, 110, 200, 240, 320, 450, 600, 750, 1200, 2000.
  - **Level locks:** item 9 needs Level 6, item 10 Level 8, item 11 Level 10 and item 12 Level 12.
  - **Variants** are colour shifts (hue-rotate). Eldritch items also glow green.
  - **Buttons:** Buy N → Place → Take out. Locked or unaffordable items shake.
- **Wardrobe:** 71 outfits (Hats 20, Tops 14, Face 13, Held 12, Skins 12). They are 32 × 32 layers lined up with Ulhu and also show in the banner.
- **Hoard:** rewards he writes himself (Takeaway night 300, One hour of gaming 80, …). Claiming one stamps a "CLAIMED" wax stamp (scale 2.4 → 1, rotate −28° → −10°, 420 ms).
- **Chronicle:** doubloons per week (pixel-striped gold bars), a 5 × 7 streak calendar (green intensity, blue for frozen days) and a trophy shelf of gold-tinted boss sprites on a wooden shelf.

## Interactions and timing
- **A tick reacts at once**, before any server call:
  - 1–4 coins fly to the counter in an arc, scaling .6 → 1.35 → .8 over 560 ms;
  - the counter coin **spins** (scaleX flips, 520 ms);
  - "+N" floats up 34 px over 800 ms;
  - the tick glows (box-shadow ring, 480 ms);
  - Ulhu does a squash-and-stretch bounce (480 ms);
  - `navigator.vibrate(12)`;
  - his speech line changes for 2.4 s.
- **Big moments** (level up, boss beaten, blessing chain): a gold flash on the banner, 16 sparks and coins bursting out, a mood of "proud", and the vibration pattern `[20,60,30]`. Nothing blocks the screen.
- **Undo:** keep a stack of up to 30 snapshots of the game state. Every action pushes one first, and Undo pops it.
- **Ulhu's moods:** idle, happy (after a tick), proud (big moment), sad (curse or HP under 15) and sleepy (after 7 pm or on a day off).

## Rules (state)
- **Base pay by length:** 5 min = 3, 15 = 6, 30 = 10, 60 = 16, 120+ = 25.
- **Kind multiplier:** Necessary ×1 (`#5aa7ff`), Ahead ×1.5 (`#f2a93b`), Outside work ×3 (`#b07cff`), Life ×2 (`#5ee08a`).
- **Streak bonus:** +3 % per day, capped at +30 %.
- **XP** = base × 2. You level up at 200 + (level − 1) × 50.
- **Curse cost:** 5 min = −2 HP, 15 = −4, 30 = −6, 60 = −9, 120 = −12. Max HP is 50.
- **Boss:** health starts at 100. Each stage deals 100 ÷ the number of stages, or half that if it is late. The last stage finishes the boss. Gold is 60 / 150 / 300 / 600.
- **Repeats:** school days, chosen weekdays, or every N days or weeks.
- **State shape:** see the `INIT` object in the prototype's logic class. It covers `groups`, `quests`, `bosses`, `beaten`, `curses`, `blessings`, `owned`, `placed`, `wOwned`, `wear`, `hoard` and `review`.

## Design tokens
**Colours**
- abyss `#070d0b`, stone `#16211d`, stone 2 `#1b2924`, stone edge `#2a3b33`
- bone text `#e8e1cf`, muted `#93a69c`, dim `#7f9389`
- eldritch green `#5ef2a0`, deep green `#1d8a52`
- purple `#a48aff`, seal purple `#5a3a8a`
- blood `#c4323a`, wax red `#8a1a22`, coral `#ff7a66`
- gold `#ffd56a`, pay gold `#f0c45a`, bronze `#a8681c`
- parchment `#e8d9b5`, ink `#2a1a12`
- ice `#5aa7ff` / `#bfe0ff`

**Type**
- **Grenze Gotisch 500:** headings, tabs and buttons, 17–23 px.
- **IM Fell English:** Ulhu's voice (italic) and quest names, 14–17 px.
- **Atkinson Hyperlegible 400/700:** all numbers and labels, 12 px minimum. It was chosen so 2, 5 and 8 can't be confused.

**Sizes**
- **Radius:** 3 px (parchment), 5–6 px (stone).
- **Tap targets:** at least 44 px. Ticks are 46 px circles.

## Assets
- `ulhu-art.js`: `window.ULHU_ART`, with Ulhu's 5 moods at 8-bit (32 × 32, taken from the uploaded PNGs, with "proud" made from "happy") and 16-bit (64 × 64, generated by code; a hand redraw should follow). It also has the 7 furniture sprites cut from `Shop items.png`. Everything is a data-URI PNG.
- `pixel-art.js`: `window.PX`, a small pixel-sprite engine (shapes, then auto shading from the top-left, then auto outline). It provides:
  - the 22 × 22 tentacle-face doubloon;
  - 8 bosses (Spawnling, Mi-Go Mite, Shoggoth, Deep One, Drowned Leviathan, Nightgaunt, The Great Old One, The Gate of Orbs);
  - 43 wardrobe layers and 10 blessing icons;
  - UI icons;
  - the isometric room renderer.

  It all runs in the browser, so no image files are needed.
- `source_art/`: the original uploaded PNGs.

## Files
- `Ulhu Rituals Prototype.dc.html`: the full clickable prototype (template plus logic class).
- `Ulhu Design Sheets.dc.html`: 8-bit vs 16-bit Ulhu, the boss sheet, the doubloon, the wardrobe sheet and the style guide.
- `ulhu-art.js`, `pixel-art.js`: the art.
- `support.js`: the runtime needed to open the `.dc.html` files.
