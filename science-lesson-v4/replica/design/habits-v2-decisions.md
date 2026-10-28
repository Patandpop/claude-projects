# Ulhu habits v2: decisions (grilling with Patryk, 2026-10-27)

Nothing here is built yet. Build in the phases at the bottom; mock-up first for anything visual.

## Omens (curses and blessings)
- Two-sided habits (Habitica +/-): server already allows polarity 'both'. Card = two pictures (curse left on the bleeding back, blessing right on the constellation back), split by a slanted line through the middle (less than 45°, for effect). Tap the left half = curse, right half = blessing (a straight split for tapping). Each half lights in its own colour.
- Omens order: two-sided cards first, then curse-only, then blessing-only, each A to Z.
- Health costs, even and bigger (max HP stays 50): Tiny 4, Small 6, Medium 8, Big 12, Huge 16.
- Absolution (antidote): a curse picks an antidote blessing (a two-sided card's own right half automatically). After a slip the antidote rises to the top of the blessings with a stained-glass look holding the constellation pattern, glowing softly. Window = the slip day + the next day until midnight. "Absolution I" = half the health back, "Absolution II" = the other half, then "Absolved" flash and the glass fades. The light only grows brighter (one colour), it does not change colour per curse.
- Logging a curse: tap = a blood-rune trail runs from the card to four sigils: Flesh (feeling), Domain (place), Scene (what was going on around), Coven (who was there). Tap one. Double tap the curse = log with no sigil. Time and day are recorded automatically. Details (from the 30-item list, plus his own, editable) are added in Vespers.
- Ulhu reacts to a logged curse with one of 30 lines (dark humour, never disappointment). Ulhu never reminds or asks him to log.
- Good habits: long-press a ritual or blessing to tag its sigils. Vespers also asks when good habits worked. No random prompts.
- No flow-state feature.

## Vespers (the evening tablet) and High Vespers (the weekly review, core feature)
- Vespers: a glowing obsidian tablet at the top of The Call from a chosen time (default 8 pm). Lists today's curses with their sigils to add detail, plus "Clean today". It is a ritual with its own streak; the Vespers streak IS the app-use streak.
- High Vespers: Sunday's Vespers, open until Tuesday night if missed. Order:
  1. The Week in Glass (7 stained-glass panes, blue blessings / red curses / gold rituals)
  2. Who you are becoming (identity votes, only identities with votes that week, highest first, plus one evil Ulhu line)
  3. Rituals that grew
  4. Rituals that slipped (never miss twice)
  5. Where the curses came from (day x time grid + top sigils)
  6. Absolutions won
  7. Your three lines and one change (next week checks the change)
- Identities (each ritual/blessing votes for one): Devoted, Wordsmith, Leviathan, Diligent, Steadfast, Scholar, Trusted, Mentor, Sanctified, Dreamer, Serene, Homeflame, Frugal, Nourished, Wanderer, Valiant.

## Days and moon
- Full moon = working day. Half moon = work rest (teaching rituals/quests pause, life keeps counting). Dark moon = full rest. Tap cycles. Holidays/INSET start at half moon. No extra pay for working on a rest day.

## Multipliers (no boosts, no wagers, no earn-back)
- Ritual streak: x1.1 at 7 nights, x1.25 at 30, x1.5 at 66. Vespers streak (on everything): x1.1 at 7, x1.2 at 30, x1.25 at 66. They stack.
- One miss = down one step; two misses in a row = back to x1. Half/dark moon days never count as misses.
- Shown as rings in the rune circle (1/2/3 rings), base pay shown, count-up to the total on tick. Vespers multiplier = rings inside the Vespers tablet. No bell at the top.
- Shop prices up 20%.

## Look (mock-ups waiting, "build the Ulhu mock-ups")
- See memory project_habit_game_2026_10_22.md "Redesign decisions 2026-10-27".

## Phases
1. Omens upgrade (two-sided cards, sigils + blood trail, Absolution, new HP costs, 30 Ulhu lines)
2. Vespers + High Vespers (identities, pattern grid, long-press tagging)
3. Moon phases + multipliers + prices
4. The new look (tablets, scroll, bosses) after the mock-ups

## Mock-up picks so far (2026-10-27)
- Blood and Sigils (https://claude.ai/artifact/TW897bZVrcPDYFo5vfxHJD): BL8b Soaked in (less splatter round the icons, never on them), sigils F3 heart in thorns, D3 temple, S3a gilded stage, C3a three gilded hoods (Set 3 gilded reliquary style), glow G5 abyssal ripple.
- Sunken Temple (https://claude.ai/artifact/Fvtuun2mqhD9Bcveed5sHW): arena A1 Temple steps, circle B Elder Sign (behind the creature), strike S1 claw slash, ending D2 dragged down, then the trophy tarot card rises (dark outline style, K1 default, still choosing) and goes to the Vanquished list.
- Obsidian and Parchment (https://claude.ai/artifact/Lq69u4NhgH8cyxyiUggvDD): stone ST3 dressed black stone (variants pending), pixel-style pentagram tick lit like round 1, colour = streak; P2 Touched by age + E1 turned wooden rods; W1 seal, stamp press shows handle not face (K1-K5 pending); empty spot builds on S2/S3 (S6-S10 pending); burn B2 both sides, slightly longer, ash lingers.
- Absolution Glass (https://claude.ai/artifact/USVskdxqA4bVMgeKDNTokx): A1 light spills (Absolved must stand out), H3 sparks become health, L1 flood from a corner, less saturated yellow; round 2 pending (A1a-c, A4a-c, L1/L3 variants, CT1 calmer, BT2 made of glass).

## Later picks (2026-10-27, latest wins)
- Trophy card: K1 Silver etching (black card, creature in fine silver outline, faint red moon, red eye), NOT M1. Plate shows the task name with date and reward small under it.
- Undo: every curse tap, blessing tap and Absolution step (including the "Absolved" moment) must have an Undo button that reverses it exactly (health, runes, Absolution stage, sigil tag).
- Absolution: A4a "The shell shatters" with cracks building over the two stages (I = first part near the blessing, II = completes, shards fall), stars like L3a (real four-pointed sparks), low-key lighting from L1b, "Absolved" as A1b (light dims behind the word), H3 sparks become health. Curse tiles CT1b (drip only on tap). Blessing tiles: all rejected; redo with real stained glass (many small pieces, thin lead, grouped colours forming a pattern, constellation from the pieces). Glass yellow less saturated.
- Tablets: stone = ST3c finer polish mixed with ST3e deep bevel; pixel pentagram tick lit in chunky steps, colour = streak; multiplier = M1 studs set INTO the rim (no stray pixels above or below). Seal press = K1 from above with closing shadow, slower (~1 s finish), variants wanted. Seal spot = S6 inked ring with wax ghost but less eerie, variants wanted. Scroll P2 + E1 wooden rods + W1 seal + B2 burn from both sides (slightly slower, ash lingers).
- PAUSED 2026-10-27: glass round 3 and tablets round 4 were stopped mid-way; resume with "carry on with the mock-ups".

## Picks round 4-5 (2026-10-27, latest wins)
- Blessing tiles: BG1 honey border night field, with star-SHAPED glass pieces (not dots), constellation lines made of narrow glass pieces along the line, background pieces light a little, constellation more, light moving left to right.
- Absolution: X2 hairlines then the break.
- Tablet stone: ST-final (polished deep slab). NO multiplier studs on the tick.
- Seal: press K1a; seal spot = clean inked ring, no wax ghost; wax drop pools first, then the stamp presses it and the wax visibly spreads, slower (T1-T3 pending).
- Sigils: Scene = S3c (tentacle rising on stage). Coven C3c three in a row, overlap fix pending (C3c-1..3).
- Phase 1 screens built and committed 2026-10-27 (two-sided omens, blood + sigils, Absolution logic and simple gold label, antidote picker, Ulhu's 30 lines). Paste files on the desktop folder "Planner paste files" (Drive G: unavailable).

## Picks round 6-7 (2026-10-28)
- Blessing glass: SC2 all medium stars; path made of shaped pieces like the rest; surrounding glass cut to fit and bend round each star (G1-G4 pending).
- Seal: W9 gold-flecked wax; seal impression 7 variations F1-F7 and stamp shape S1-S3 pending. T2, R2, G5 ripple after, no flash.
- Vespers (evening): V3 night line, restyled N1-N6 pending; only the sigil picked in the moment is asked (all four if skipped); sigil names as headings, not questions (Q1-Q4 pending); good habits get positive feeling chips tied to his own cards; an entry to click into Vespers after 8 pm (E1-E5 pending).
- High Vespers: H1 cathedral scroll; Week in Glass loved; 5 variations of every section pending, incl. Who You Are Becoming and a redesigned curse table.
- Built into the app 2026-10-27: stone tablets (game-stone.js), temple bosses (game-temple.js), moon phases, multipliers, shop +20%. Art split into GameArt.html (new Apps Script file).

## 2026-10-28
- Seal picture: **F9 Ulhu in the pentagram**. Stamp: the original stamp back. Next: lingering mist instead of the vanishing ripple (4 versions); 4 variations of quest ticks and writing.
- Glass round 6: G1-G4 fitted leadwork, pick pending. WG1 and the chapel night line wait for it.
- Vespers round 3 and High Vespers round 2 paused (briefs in memory).
- Glass: **G1** picked. Tweaks: brighter path, brighter pieces round each star, clearer dark/lit boundary on the Absolution card in stages I and II.

## Shop redesign (grilled 2026-10-28)
- Place: a **merchant's stall** in the sunken temple, run by a **deep-one fishmonger** (pixel art, his own sly lines; Ulhu chips in jealously).
- **Sanctum preview always on top, half screen**, framed by the stall's stone arch (Sanctum restyled into the temple world; the 120 items are not redrawn).
- Below: **all 10 shelves stacked**, each swiped sideways, carved stone labels; tapping a spot in the Sanctum jumps to its shelf.
- Tap an item: it goes on the counter and appears in the Sanctum; Buy or Put back (try before buying).
- **Tier shown by the price-tag material:** Basic bone, Nice bronze, Fancy silver, Eldritch green-glowing obsidian. No tier filter buttons. Sorted cheapest to dearest.
- **Buy:** coins clink onto the counter, a tentacle sweeps them away, and the item lifts and settles into its spot in the Sanctum. Undo as now.
- **Owned:** stays on the shelf; the price tag becomes a red wax "Yours" seal. Tap to place or take out.
- **Locked (level):** NOT DECIDED (the cloth answer was an accident). **Too dear:** normal, dim price.
- **Set aside:** long-press one item; the merchant keeps it under the counter, and The Call shows it with a coin bar.
- **Wardrobe:** a clothes rack and mirror beside the stall; Ulhu tries things on in the mirror before you buy.
- **Hoard (real rewards):** an iron strongbox behind the counter. Pay to open; the reward is written on a receipt with the F9 seal.
- Next: one mock-up page with 5 stall looks.
- Future: a Sorcery!-style haggling mini game at the stall, after the whole build works (via /rebuild).
- **Shop status:** a starting draft only. A long research and grilling session comes later (Zelda Ocarina of Time and Majora's Mask shops, stall style, merchant, animations). The 5-look mock-up was stopped.

## Picks 2026-10-28 (evening)
- Quest scroll: mist rejected. The old abyssal ring was closer: make an in-between or other effect that feels like an evil pact has been made. Tick **K-T2**, with the strike-through crossing the WHOLE step text. Writing **WR1**.
- Vespers way in: **E7 book** loved. Next: 5 book versions (outside and inside), with tentacles dragging you in, or symbols and curse marks filling the page. Fix the transition after the suck-in on all of them.
- Night line: N1b leading, but first see ~4 stained-glass chart versions (built from D1) for the normal Vespers.
- Detail sheet: Q3a and Q4a, 3 variations each. Q4a: the side tarots must not be smaller.
- High Vespers: LC2 with the quest wax stamp (F9, original stamp) recoloured per verdict, all colours darker, no purple for the middle. Week in Glass = WG1 glass with WG1d's text and formatting. **WB1**. RG8 and RG9 properly integrated (bigger, better steps), 3 variations. RS7 and RS8 integrated, 3 variations. CC1a, 3 variations. **AW4c** with "Absolved" instead of "Fully mended". **TL1**.
- Glass: **D1** day-in-glass picked ("perfect"). New Absolved edge line and glow loved. Fix: going from Absolution I to II should only light middle to end (no second front from the start).

## Merchant and haggle (grilled 2026-10-28, second session)
- Research basis: Zelda Ocarina of Time shops (spotlight item on shelves, name, price and pitch, Buy / Don't buy, strong shopkeeper personality), Majora's Mask (pedestal spin), Wind Waker (loyalty).
- **Stall:** a drowned fish market: wet green stone, a sagging sailcloth awning, fish and lanterns on hooks, shelves of salvaged ship timber, murky water light. **Art style: HD-2D diorama** (like Octopath Traveler): pixel-art characters and items in a richly lit, painterly scene with depth, soft focus at the back, light shafts through water and lantern glow. The fishmonger is always 16-bit. The Sanctum preview gets the same diorama lighting; the rest of the app stays as picked.
- **Fishmonger:** an oily, flattering rogue ("my dear drowned friend", "barely haunted, this one"). He sulks on Put back and gloats when he wins. Ulhu despises him. Idle loop (gills, blink, wiping the counter) plus short reactions, with lines in a speech bubble.
- **Focus view: Ocarina spotlight.** Swipe along a shelf and the focused item lifts, spins and catches a shaft of light, with name, price and his one-line pitch, then Buy / Haggle / Put back. The Sanctum above shows it in place.
- **Stock:** fixed (no night trader or rotating stock).
- **Haggle (inspired by Swindlestones, Sorcery! 2; our own art and words):**
  - Once a day, on any item.
  - Win: by the dice you keep: 3 left = 25% off, 2 = 15%, 1 = 10%. Lose: +10% on that item today. No re-haggling that item.
  - Faithful liar's-dice rules but short: 3 dice each. Bone dice with 4 faces (eye, tentacle, moon, star), and the eye is wild.
  - The fishmonger NEVER sees your dice. "Harder" means he plays smarter (better odds-reading and bluffing) as your level rises, and over Eldritch items.
  - Shown as a full-screen den: a dark back room, a candle, a table.
  - A separate file, loaded only when Haggle is tapped (so the app stays light).
- Next: the stall mock-up (now). The dice game comes later (via /rebuild after the build).
- Stall mock-up stopped; restart it in HD-2D when Patryk says.
- High Vespers round 4 (2026-10-28): **LC2d** (dark amber Partly) with the quest R2 ring and NO see-through ink ghost. RG13 and RS13 best but not right: 3 varied new pillar takes each. CC = CC1a's bottom text with CC1a3's box (fixed).
- High Vespers FINAL (2026-10-28): RG13, RS13; CC with the summary above the grid removed (keep the box below). All sections fixed.
- Vespers: night line **NG1** (D1 glass, tall window; testing whole vs cracked crossing pieces). Detail sheet: **Q4a2 face up**, equal cards like Q4a1, no plates. Way in: the books were rejected (tentacles and the book entry "horrible"); 7 new higher-quality entries W1-W7 mixing the doorway, candle and book ideas.
- Dice haggle: **5 dice each**. Win by dice kept: 5 or 4 = 25%, 3 = 20%, 2 = 15%, 1 = 10% (my proposal; Patryk can change). Obsidian, evil dice. Mock-up fishmonger name: Gullet.

## Market rethink (2026-10-28, after the Drowned Market mock-up)
- M1 (night market) mood is best. One stall with stacked shelves is TOO CLUTTERED.
- New shape: a big overview of the whole market (bird's-eye or a good view from above), with a labelled stall for each type of item. Go into a stall to meet its OWN shopkeeper, characterised by what they sell, with fewer items per stall.
- Currency is RUNES, not coins, everywhere. The lore must explain why the merchants collect runes.
- More occult vibe.
- Grilling on layout and the rest in progress.
- Market: overview = bird's-eye night market (a sunken plaza, stalls in a ring round a central well or idol, lanterns, carved signs). **6 themed stalls**, each with its own keeper: Floors & Rugs (weaver), Walls & Wallpaper (fresco painter), Windows & Lights (glassblower/candlemaker), Seats & Tables (shipwreck carpenter), Corners & Props (curio collector), Tailor (Ulhu's clothes); plus the dice den and the strongbox. Rune lore: **L3 "will and tithe"** (variations offered).
- Dice: BH1 board fixed; looks DL1-DL5 and rolls R1-R3 to pick.
- Vespers way in: W3 and W7 best, but the tentacles are still bad (texture and angle). A new page "Grimoire Entries": first-person top-down, a leather-bound grimoire with a green occult circle that spawns tentacles which come toward you, wrap round you and drag you down; 5 grimoires and animations (three.js suggested).
- Market (continued): inside a stall the keeper shows ~5 items at a time with the Ocarina spotlight and a small Sanctum window. "Personal items" = his real-life rewards, held by a 7th keeper (a hooded pawnbroker). The market grows as runes are spent (lanterns, statues; keepers warm to him). Keepers are deep-folk sea creatures (crab weaver, octopus fresco painter, anglerfish glassblower, hermit-crab carpenter, gull curio collector, eel tailor, plus Gullet and the pawnbroker). Occult: a ritual well in a green summoning circle, sigil signs, prices as glowing runes. Transition: lantern path plus 3 more to mock up. Rune lore: L3 variations L3a-L3d offered.
- Quest pact effect: P1 and P2 both loved; 3 variations each requested. Dice: **DL1** (bone on black) + **R3** (skitter) fixed.
- Dice game FINAL: BH1 board, DL1 look, R3 roll (sources in replica/design/mockups/dice/).
- **Rune lore FINAL: L3a + L3c.** Runes are the player's trapped will, the only true will in the market. The deep folk owe the Old Ones a tithe they can never pay alone (they have no will left), so every keeper competes for his runes and flatters him (Gullet most desperate). Every stall holds a licence from Ulhu carved in its sign; a tenth of each sale sinks down the central well to the Old Ones, which is why Ulhu sulks when he shops (he only gets a cut).
- Dice: minimal text (the round result is just the claim number with a die picture, then the winner; the dice table is kept).
- Quest pact: P1c ring (tighter, from the seal's edge) + P2a veins (smaller, all directions, uneven), green (C1) vs red (C2); no overlap with text; the seal moves about 8-10px right.
- Quest pact FINAL: C1's sea-green ring, runes and veins as they animate, drying to C2's dark red-brown mark.
- Night Market round 2 feedback (2026-10-28): TR3 mist tentacle is best (or tap-to-walk Ulhu round the plaza instead of transitions). The stalls need far more detail from above showing what they sell. Stalls are unevenly placed and some can't be seen. Item display: hard to reach the last items, needs rethinking; items should feel bigger and grander. Keeper designs aren't cared for compared to Gullet: write backstories first, then design. Dislikes the runes being eaten and grabbed, and the "Yours" sticker. Buying doesn't feel like the big reward he wants, so an analysis of the best game shops was started. Haggle with EVERY keeper. The pawnbroker also needs the visual window in the top corner.
- Quest scroll FINAL (v14): every pick fixed; sources in replica/design/mockups/tablets2/.

## Visual grill, 28 Oct (everything not yet redesigned)
Patryk's answers, in grill order. Mock-ups follow each area.

### 1. Top banner: the living lair
- **Scene:** Ulhu on a stone ledge of sunken R'lyeh, with green-lit ruins behind, bubbles and drifting light. It sits above every tab, about 400 x 170 on the phone.
- **Health is a glowing vial** of green ichor on the ledge. It drains and darkens, and cracks when low, with a small number beside it.
  - **Max health goes up from 50 to 60** (server change: GAME.maxHp). Reasoning, agreed with Patryk:
    - the worst single day (three 2-hour slips, 48) never faints you from full;
    - a bad week with no Absolution faints you in about 8 days;
    - 6 bands of 10 in the vial.
- **Runes are a heap of glowing rune stones on the ledge** that grows with the total (a few, then a heap, then a hoard). The exact number is carved on a stone.
- **Level is a carved stone plaque** with the Roman numeral and the title (50 titles). **XP is the tide rising up the ruin wall** behind Ulhu, and at level-up the tide floods over.
- **Speech:** ink writes itself letter by letter on a torn scrap of parchment drifting by Ulhu, then fades. The lines are the same as now.
- **Moon:** a real moon in the water-sky; tap it to change phase. It is BIG: half or more of it off the banner, or only its middle band showing with the top and bottom cut off. The lair's light follows the phase: bright green at full, dim at half, candlelit dark at dark.
- **Time of day, 4 moods:** morning (pale light through the water), day (green), evening (amber, before Vespers), night (deep blue, Ulhu sleepy).

### 2. Level-up: the full-screen rite
- **The rite, about 5 seconds, tap to skip:**
  1. The tide floods the banner and pours down over the whole screen.
  2. Ulhu rises on a pillar of water.
  3. The new plaque is carved before your eyes: the numeral, then the title.
  4. Anything newly unlocked is shown.
- **Each level gives:**
  - the title;
  - full health;
  - a **rune gift worth level x 10**, poured onto the heap;
  - **market growth:** new stock or a new keeper, shown as a lantern lighting on the plaza.
  - NOT chosen: the lair changing every 10 levels, and a lore line per title.
- **Shop locks: a tier ladder plus masterpieces.** Runes are still needed on top.
  - Basic is open from level 1, Nice from 5, Fancy from 12, Eldritch from 20.
  - Each keeper has one masterpiece at level 30, 40 or 50.
  - A few of the old outside-work locks stay as deeds.
  - Today only 17 of the 120 items are locked, so almost everything can be bought at level 1.
- **Seasonal items (future):** they unlock only after gaining a set number of levels DURING that season, a number that's reachable about halfway through the season.

### 3. Fainting: dragged under, then a way back
- **The scene:** the vial shatters and the screen sinks into black water, with the lost runes drifting up out of reach. Then Ulhu washes up battered on the ledge and says one kind-but-evil line.
- **The "Rise" quest:** do 3 rituals today to win back half the lost runes.
- **The rule stays:** you lose a level and 7 days of runes; the Rise quest is the way back.

### 4. Breakwater becomes a real sea wall
- **Where:** a stone wall across the top of the Teaching area, with one block per lesson in the next 2 weeks.
  - A built lesson is a solid block; an unbuilt lesson is a gap where waves crash through.
  - Homework is the mortar.
  - A whole wall pays the bonus and the sea calms.
- **It must be designed well** (mock-ups first).
- **Tapping a gap:** inside the planner, it jumps to that lesson. On the phone, it at least shows the day, period and class of the missing lesson (or just "lesson", if that's how it's integrated).

### 5. Aims and bottom lines (compared in High Vespers)
- **Logging:** one tap on the tablet always counts as the bottom line and keeps the streak.
  - Time aims: a small dial pops up after the tick (1, 5, 15, 30, 60 min), remembering your usual.
  - Count aims: a second tap that day marks the full session.
- **The starting set** (Patryk accepted all of it, including the 2 new rituals):

| Ritual | Aim | Bottom line |
|---|---|---|
| Read | 15 min a day on average | open a book and sit with it 1 min, daily |
| Train | 3 full sessions a week | walk into the gym 3 times a week |
| Write (NEW) | 2 sessions of 20 min a week | write one line on 4 days |
| Do something for Martha | 1 planned thing a week | one kind act or message every 2 days |
| Call a friend or game | 2 a week | one message to a friend every 3 days |
| Cook at home (NEW) | 5 dinners a week | 3 dinners a week |
| Binge-watching Netflix (curse) | CEILING: at most 2 a week | logged honestly |

- **Ceilings:** every curse can optionally have a weekly ceiling. High Vespers shows "under" in honey or "over" in red. Going over costs nothing extra.
- **Work rituals** stay as plain ticks, with no aim.
- **Display: three-tier glass in the Week in Glass.** Each ritual pane is honey gold (aim reached), pale blue (bottom line held) or dark and cracked (missed). Tap a pane for the numbers, e.g. "12 min a day of 15".
- **The ritual form** gets aim and bottom-line fields (type: minutes a day on average, or times a week).

### 6. Tab bar
- **Text tabs, no icons or images** ("the words are nice"). The names stay.
- **Explore:** runic stone tabs with the words carved in, plain restyled text, and four tabs each in their own colour and style. Mock-up options TB1-TB6 are on the "Ulhu's Lair" page.

### 7. Forms: inscribe it on the object itself
- **Each form is the object, in that object's own style.**
  - Ritual: a blank obsidian tablet, inscribed.
  - Quest: a blank parchment scroll, inscribed.
  - Boss: the temple style, inscribed in RED.
  - Curse: BLACK text on RED stained glass.
  - Blessing: WHITE text on BLUE stained glass.
- **Options sit as chips beneath the object.** The less-used options (who you are becoming, aims) fold under "More".
- **On save,** the object is carved, sealed or summoned into its place.

### 8. History: the Oracle, restyled in stained glass
- **The name "Oracle" stays,** but he's open to better names (offer a few; "cathedral" or "temple" could fit the reflection side).
- **Idea A: hanging panes.** Each evening's Vespers becomes a mini stained-glass pane (the D1 day-in-glass), hung vertically on the black background, so the panes build up across a week. Tap one to reopen that night's Vespers later. It shows the last 5 weeks, as the Oracle does now.
- **Idea B: a cathedral window** in which dots (like the original Oracle's stars) carry the same meanings: a day where most rituals were kept, and so on.
- **Mock up both ideas, several iterations each.**

### 9. Sanctum, Cloaks and Hoard
- **The Sanctum is an HD-2D diorama room:** a tilted 3/4 view of a sunken chamber in the market's style, with light shafts and bubbles. Ulhu wanders it and sits on your furniture. Tap a spot to place or swap an item, and pinch to look closer. (Growing rooms were NOT picked.)
- **Everything you own lives in the Sanctum:**
  - Cloaks hang on a wardrobe or mirror; tap it to dress Ulhu.
  - Hoard rewards sit as sealed treasure chests in a corner; tap one to claim it (break the seal).
- **The Cloaks and Hoard sub-tabs go.** The Den becomes the Sanctum plus the Night Market.

### 10. Marking: paper golem mini-bosses
- **Each class's termly marking is a small boss in the temple style,** with one health block per sitting.
- **Paper golems:** creatures made of exercise books and loose paper, with a colour and style per class. They grow with the year group:
  - Year 7: a baby, cute and round with big eyes;
  - Years 8-9: older;
  - Years 10-11: bigger and different, less cute, with red-pen scars;
  - Years 12-13: elder forms, robed or crowned scholars.
- **Year 12 and 13 have no book marking but DO have PAG marking after practicals,** so PAG marking needs to become a marking type (it's new).

### 11. Undo: an ink scrap that fades
- **The same torn-parchment ink as Ulhu's speech** slides in at the bottom of the screen, with a big 44px Undo button that has a reverse-arrow sigil.
- **It fades after 6 seconds.** To undo later, tap Ulhu.

### 12. Loading and empty screens: Ulhu doing something
- **Loading:** Ulhu reads a scroll while the Grimoire loads, peers through a spyglass for the market, and stirs a cauldron for the Oracle.
- **Empty lists:** Ulhu with a themed line and a button to make the first one.

### 13. Quick-log omens on top of The Call
- **A plain row of 4 or 6 mini stained-glass omen cards.** No points or numbers next to them.
- **"Ulhu dancing, spinning around":** my reading is that this is the loading animation (Ulhu dances and spins while things load). Check with Patryk in the mock-up.

### 14. The 50 level titles (approved, with depths shown)
- **The plaque shows the title AND the depth name under it.**
- **Reaching a new depth (levels 11, 21, 31 and 41) has a special moment** on top of the level-up rite.
- **The titles:**

| Depth | Levels and titles |
|---|---|
| I. The Shallows | 1 Tadpole, 2 Polyp, 3 Brine Wriggler, 4 Deep Dabbler, 5 Kelp Lurker, 6 Reef Creeper, 7 Tide Caller, 8 Shell Breaker, 9 Rune Scratcher, 10 Abyss Apprentice |
| II. The Twilight | 11 Lantern Fish, 12 Ink Scribe, 13 Rune Keeper, 14 Current Rider, 15 Wreck Diver, 16 Dream Weaver, 17 Siren Singer, 18 Pearl Hoarder, 19 Grotto Warden, 20 Deep Acolyte |
| III. The Midnight | 21 Pressure Born, 22 Gloom Walker, 23 Cult Whisperer, 24 Trench Stalker, 25 Star Spawn, 26 Void Oracle, 27 Tentacle Lord, 28 Kraken Rider, 29 Leviathan Kin, 30 High Priest |
| IV. The Abyss | 31 Sunken Bishop, 32 R'lyeh Mason, 33 Nightmare Sower, 34 Sleepless Eye, 35 Elder Thing, 36 Dread Admiral, 37 Abyss Hierarch, 38 Herald of Tides, 39 Void Sovereign, 40 Great Dreamer |
| V. The Risen | 41 The Stirring, 42 Dreamer Awake, 43 Breaker of Seals, 44 Lord of R'lyeh, 45 Shaper of Tides, 46 Star Devourer, 47 Elder God, 48 The Unspeakable, 49 Old One, 50 Great Old One |

## Design picks, evening 28 Oct (mock-up working files in the 12d0aa3c session scratchpad: oracle5/, lair4/, grimoire5/, tabs4/, market5/)
- **Oracle:** R1 blessing glass, M3 Ember middle mark, **E1 gold eye** (iris in three facet rings: soft outside, vivid inside, dark slit pupil). Glass brighter all round (canvas brightness 1.28, saturate 1.18; lit-mark glow .78/.55/.48/.22). Page: https://claude.ai/artifact/42BxcvJEAkiS6xs8vM8qTv
- **Lair (B2 Band):** colours P2 morning, P3 day, P3 evening, P2 night; **M2 Crescent** half moon; **V1 round flask**; rune heap = the round-two pile remade: 30px runes in a pyramid, up to 21 (6-5-4-3-2-1), steps at 1/20/50/90/140/200/280/380/500/650/850/1100/1400/1750/2150/2600/3100/3600/4100/4600/5000. H4 (pile) vs H5 (pile + a tower per 500) still to pick. Page: https://claude.ai/artifact/NpevDxLcCNZSatRt69pV66
- **Grimoire:** pixel-art scene, **BG1 Candlelit desk** picked; T1 book + T4 animation kept. Page: https://claude.ai/artifact/2hhEpg5QBkqi7145xDtuBv
- **Tabs:** TB6c Tide line = the minimal pick. TB5b1 Lit niches = base for the textured bar, but round five looked childish; round six (finer textures: aged parchment Call, old dark leather Grimoire, real Oracle glass Omens, lair ruins Den) in progress. Don't build the tab bar until he picks. Page: https://claude.ai/artifact/HNAaSMmUp8o1DhmHdb3uJz
- **Market:** entrance Walk + TR3c picked; three more entrance options in progress (new page).
- Quest pact effect: already final and built (see above).
