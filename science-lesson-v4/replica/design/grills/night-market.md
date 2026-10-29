# Grilling: the Night Market rebuild and haggle details

Started 2026-10-29. Builds on habits-v2-decisions.md "Merchant and haggle" and "Market rethink", and FABLE-WORKPLAN.md items 1U.6 and 1U.9.

## Decisions (final, 2026-10-29). Where this differs from older notes, THIS wins.

**Keepers (seven):** six themed stalls (crab weaver: Floors & Rugs; octopus fresco painter: Walls; anglerfish glassblower: Windows & Lights; hermit-crab carpenter: Seats & Tables; gull curio collector: Corners & Props; eel tailor: Ulhu's clothes) plus **Gullet, who replaces the hooded pawnbroker** and holds Patryk's real-life treats.

**The plaza**
- Whole plaza fits on one phone screen: a sunken plaza, the green-circle ritual well in the middle, the seven stalls spaced evenly in a ring round it, every one visible. Lanterns, occult mood, HD-2D lighting.
- Each stall shows a **sign with its title, made in that stall's own style** (woven for the weaver, painted for the fresco painter, and so on). No other labels.
- Ulhu walks freely: tap anywhere and he walks there; tap a stall and he walks up and goes straight in (one tap). Idle: he wanders, sits by the well, sulks near Gullet.

**Entering and leaving:** EN1 Low tide as picked (the sea floods the plaza with bubbles, then drains down the screen, leaving you dripping inside the stall). **Leaving plays it backwards** (the water rises in the stall, then drains back onto the plaza).

**Inside a stall**
- Rooms are bigger than the screen and you can **look around** inside (drag to pan). The builder must make panning and the spotlight swipe not fight each other (e.g. tap an item to spotlight it; swipe inside the spotlight to move to the next).
- **Five items per stall.** All five are visible in the room, shown the way that keeper would really display them, never a plain menu. **Personalisation per stall is key:**
  - weaver: rugs laid overlapping on the floor, the focused one unrolls in the light;
  - fresco painter: panels propped round the walls like a gallery;
  - glassblower: windows and lamps hung up, lit by her lure;
  - carpenter: seats and tables standing on a wrecked ship's deck;
  - curio collector: a cabinet of little nooks, one prop in each;
  - tailor: cloaks on driftwood dummies;
  - Gullet: real-life treats laid on a slab of ice like fish, the goal chest chained behind his counter.
- Focused item = the Ocarina spotlight (lifts, spins, catches a light shaft), with its name, price in glowing runes, the keeper's one-line pitch, and Buy / Haggle / Put back.
- Keeper: idle loop plus short reactions (sulks on Put back, gloats on a win, as already designed for Gullet; every keeper gets the same care).

**Text:** ONLY the item name, the price in glowing runes, the keeper's one-line pitch and the three buttons. No rules, hints or labels anywhere in the market or dice den.

**Haggle**
- Prize rule (1U.9) is PERMANENT and unchanged: one item, discount by dice kept (5 dice each: 5 or 4 left = 25%, 3 = 20%, 2 = 15%, 1 = 10%); a loss = +10% on that item today; that item can't be haggled again today.
- **Once a day with EACH keeper** (including Gullet and real-life treats), on one item at that stall.
- **The item is whatever is in the spotlight** when Haggle is tapped.
- **Every keeper plays the dice game themselves** (the keeper of the stall you are in sits across the table).
- **The game animation (the important part):** seen from above, looking over the table at the keeper. Flat **pixel-art water** washes over the table; when a die is lost, the water steals it, and something in the water may grab it (a tentacle or hand) and pull it under. At the end, the water sweeps away the loser: the keeper if Patryk wins, or floods towards the viewer and takes Patryk if he loses. Pixel style, NOT 3D (no three.js). Patryk wants this animation to really work well; mock it up first in the real pixel style, he picks, then build.
- **End words:** olden-style and strange, shown big, then the new price in glowing runes. Win = **VANQUISHT**. Lose word still to pick (Patryk wants better than "UNDONE"); candidates: **ENGULFT**, **FORFEIT**, **BEREFT**, **DROWNED**, **FORSAKEN**. Offer these on the dice mock-up; default ENGULFT if he does not pick.

**Buying feels grand:** the keeper wraps the item with their own flourish, a big olden word comes up, then the Sanctum window lights up as the item drops into place there. (The market growing as runes are spent stays as already planned.)

**Real-life treats (Gullet's stall)**
- Same runes as everything else. No second currency.
- Two ways: (1) **receipts**: after having a treat anyway, tap it and Gullet "sells" it afterwards (no planning); (2) **one goal chest**: Patryk picks one bigger treat, runes fill it, and Gullet hands it over with a big moment.
- Starts from the ready-made list below; **nothing goes in unless Patryk ticks it**, and he can add his own. Rune prices: the builder sets them by size (small < weekly < big) to fit the existing rune economy, and Patryk can edit any price.

### Ready-made treat list (for Patryk to tick)
Mostly weekly, some small, a few big (for the goal chest), plus permissions.
- **Weekly:** takeaway night; cinema trip; a new book; a new board or video game; a meal out; a long bath with no phone; a lie-in on Saturday; a new album or vinyl; a nice bottle of something; a craft beer or cake from a favourite place.
- **Small (daily):** a nice coffee out; one episode of a show; an hour of a game; a fancy snack; 30 minutes of reading for fun; a walk somewhere nice.
- **Big (goal chest):** a gadget; a day trip; a full free day with no work at all; concert or theatre tickets; a weekend away; new headphones or a good pen.
- **Permissions (guilt-free passes):** an early night with no marking; skip one chore; order in instead of cooking; a no-planning evening; a "do nothing" hour.

## Round 1 (2026-10-29)
- **How often you can haggle:** once a day with EACH keeper, on one item at their stall. That item can't be haggled again today (1U.9 prize rule stays exactly as written).
- **Which item:** whatever is in the Ocarina spotlight when Haggle is tapped.
- **Gullet:** runs his own stall (an eighth keeper; see round 2 for whether he replaces the pawnbroker). **Every keeper plays the dice game themselves** (you play the keeper of the stall you are in, not Gullet).
- **Dice result to improve:** who won must be clearer, and the animation between Ulhu and the keeper should be better. Minimal text: maybe one eldritch word for a win and one for a loss.
- **Plaza:** the whole plaza fits on one phone screen; the stalls sit evenly in a ring round the well and every one is visible.
- **Personal items (real-life rewards):** can be haggled like anything else. Idea: Gullet is the keeper for real-life items.
- **Doubt raised:** Patryk is not sure he would use real-life rewards ("I just do things because of how it works out in life"). He wants a pre-made set of options, and a system that works better: maybe a different method or a different currency, based on how other systems do it. Being worked through in round 2.

## Round 2 (2026-10-29)
- **Real-life treats work two ways:** (1) receipts: after having a treat anyway, tap it and Gullet "sells" it afterwards (no planning); (2) one goal chest: Patryk picks one bigger treat, runes fill it, Gullet hands it over with a big moment.
- **Currency:** the same runes as everything else. No second currency.
- **Gullet replaces the pawnbroker** and holds the real-life treats. Still seven keepers in total (six themed stalls plus Gullet).
- **Ready-made treat list:** to be written for Patryk to tick (nothing goes in without his tick). Mostly weekly treats (takeaway, cinema, new book), some small daily ones (coffee, an episode, an hour of a game), plus big ones (for the chest) and permissions (early night with no marking, skip a chore).
- **Win and lose on screen:** one big eldritch word, then the item's new price glowing in runes. Nothing else.

## Round 3 (2026-10-29)
- **Dice mock-ups DR1-DR3 (replica/design/mockups/market6/dice-result.html): all rejected.** The ask was about the animation DURING the game, not a result card.
- **The dice game view:** stays as it is, with the keeper in front across the table and Patryk looking at them (first person). During the game:
  - **losing a die:** a wave of the tide washes over the table, in a 3D style, and sweeps that die away;
  - **losing overall:** the tide sweeps the loser away: the keeper if Patryk wins, or Patryk (the view floods and he is swept off) if he loses.
  - It is close to DR3 but in 3D and first person. Patryk mentioned using "the overdrive we have" for the 3D (meaning to be confirmed in round 4).
- **Win and lose words:** strange words in an OLDEN style (archaic English), shown big, then the new price in glowing runes.
- **Stalls from above:** a sign with the stall's title, made in the stall's own style (e.g. woven for the weaver). That is enough; no items hung out front.
- **Walking:** tap anywhere and Ulhu walks there; tap a stall and he walks up and goes in; when idle he wanders, sits by the well, sulks near Gullet.
- **Items:** five per stall, swiped one at a time in the Ocarina spotlight. BUT the whole selection must be visible inside the stall itself, displayed the way that stall would really show its wares (rugs laid out or hung, etc.), never a plain menu. **Personalisation per stall is key.**
- **Text:** only the item name, price in glowing runes, the keeper's one-line pitch and Buy / Haggle / Put back. No rules, hints or labels anywhere.

## Round 4 (2026-10-29)
- "The overdrive" = a view from above, looking over the table, with flat pixel-art water washing over it and stealing a die; something in the water might grab it. Pixel style, not 3D. Patryk wants this animation to really work.
- Words: VANQUISHT for a win; better options than UNDONE wanted for a loss (candidates in Decisions).
- Stall displays as listed, approved. Patryk: this makes the rooms bigger, with the ability to look around ("the scope of this is amazing").
- Low tide in, and backwards on the way out.
- Buying: the keeper wraps it, a big olden word, the item drops into the Sanctum window.

## Other ideas
- None raised outside this topic.
