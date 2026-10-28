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
