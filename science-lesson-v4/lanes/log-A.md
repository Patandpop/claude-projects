# Lane A log: Ulhu game

Plain-English record of Lane A's work (the Ulhu game), newest entry first.

## Waiting on you

0. **Paste the complete set (30 Oct, 17 files).** On the PC, in the Desktop folder "Planner paste files", every file ending "(2026-10-30, complete set, Lair banner, haggle, loading screen, Day tab).txt". (Drive wasn't connected, so they went to the Desktop, not Admin\Planner Sync.) In Apps Script, paste each one over the file of the same name: Code, Planner, Logic, Memory, Behaviour, Phone, BoardPage, Game, Companion, GameShop, GameUI, GameArt, GameHV, GameDen, GameComp, Day, DayUI. **Two are new:** make a Script file called **Day** and an HTML file called **DayUI** (also make Companion as a Script and GameComp as HTML if you don't have them yet). Then Deploy, Manage deployments, edit, New version. It holds every lane's saved work: the Lair banner, the one-item haggle, the cauldron loading screen, the omens fixes, the Day tab, the backdating and Ulhu's companion. It replaces every older set.
4. **Check the faint rules I chose (1U.11).** Your notes left some details open, so I built: he wakes on a quarter of his health; each of the next three rituals gives back a quarter of his health and a third of a quarter of the lost runes; three more the next day bring the second quarter; the first three can be the day he faints or the next day; no second faint before the stars are lit. Say "fine", or what to change (the full list is in the 1U.11 entry below).
3. **Pick the Grimoire's opened page (1U.10).** Mock-up: `replica/design/mockups/grimoire/opened.html`. **O1** one rose window across both pages, **O2** a round window on the left page and a tall lancet window of the day on the right, **O3** three glass medallions down the gutter with the day's rituals inked either side. The book itself (BG1 desk, T1 tome, T4 chains) is already approved; I build it after your pick.
2. **Pick the dice-game water (1U.6).** Mock-up: `replica/design/mockups/dicewater/index.html` (open it on the PC; it plays by itself, Win and Lose buttons show each ending). Round two, after your note: you and the keeper in a slim strip at the top with his call between you, the table filling the rest; this layout goes into the build whichever water you pick. **W1** tide sweep, **W2** tentacle in the pool, **W3** breaking wave with a pale hand. Also pick the losing word: ENGULFT (default), FORFEIT, BEREFT, DROWNED or FORSAKEN.
1. **Pick a 2-week bar for under the rituals (1U.13).** Mock-up file: `replica/design/mockups/ritualbar/index.html` (sent to you in the chat). **B1** two weeks of pebbles with day letters, **B2** a tide line that rises and sinks, **B3** a carved ledge on the bottom of the stone tablet. Reply with a letter, or what to mix.

---

## 30 Oct 2026, item 1U.11 (last part): the faint and Rise again

**What changed:** fainting now plays your pick FA-R3. The health flask shatters, ink fills the water, Ulhu lies down (still breathing) and the lost runes float away in bubbles ("80 runes drift out of reach"). He then wakes on a quarter of his health. The old Rise tablet is gone. At the top of The Call sits a RISE AGAIN card with three many-coloured stained-glass stars and no tick boxes under them (the stars are the marks). Each ritual you tick lights the next star piece by piece, and six bubbles carrying rune tablets rain from it down into Ulhu. His health and runes climb by the real amounts, and he gets up a little more each time.

**The rules I built** (from your notes of 29 and 30 Oct; change any of them):
- He wakes on a quarter of his health. Each of the first three rituals gives back another quarter, so he is full after three.
- Those three rituals also bring back a quarter of the lost runes, a third of it with each star.
- The day after, three more rituals bring the next quarter (the card shows "RISE AGAIN · II"; no health this time, he is already full).
- The first three can be done the day he faints (only rituals after the faint count) or the next day, in case he faints late in the evening.
- No second faint before the first three stars are lit: health stops at 1.
- Each ritual lights one star per round; the same ritual twice doesn't count twice. Undo puts the star out and takes its health and runes back.

**You need to:** nothing now; it goes into the next complete paste set. If any rule above is wrong, say which (it's on the Waiting list).

## 30 Oct 2026, item 1U.11 (first part): the level up and Going deeper

**What changed, level up:** every level up now plays your pick LU-X2 "The Sky Answers" over the Ulhu screen: Ulhu rises from the deep, stars rush in from every edge, aurora curtains fall, his new number pulses three times like a fanfare, and the heal comes last as a small flask and bar in the corner. It lasts about six seconds; a tap ends it early. It is copied straight from the mock-up's own drawing code. With reduced motion on, the last frame shows for a moment.

**What changed, Going deeper:** when a level up takes Ulhu into a new depth (level 11 The Twilight, 21 The Midnight, 31 The Abyss, 41 The Risen), your pick DP3-b2 plays straight after The Sky Answers. Two carved stone doors slide in and meet as one gold kraken eye, "DEPTH II" and the depth's name glow over them, a gold blade of light cuts down the pupil, the doors part on a warm gold flood with bubbles, and the level plaque is struck three times. The crack sits in the plaque's far corner, away from the number, as you asked, and fades after a few seconds. It plays once per level. With reduced motion on, just the name shows for a moment. The faint (FA-R3) comes next, the last of the Big Moments.

**You need to:** nothing now. It goes into the next complete paste set.

## 29 Oct 2026, item 1U.12: the loading screen

**What changed:** wherever Ulhu waits (opening Ulhu, opening the Den, the Oracle reading the stars), he now stands behind the cauldron and stirs it over the fire, your pick L3a with the improved fire, with a short line under it ("Something is brewing", "Opening the Den", "Reading the stars") and ticking dots. It is copied straight from the mock-up's own drawing. With reduced motion on it is one still picture. A scene waiting in a pane you can't see (the Den or the Oracle before their data comes) is not drawn at all, so it costs no battery.

**You need to:** nothing now. It goes into the next complete paste set.

Also: the Ulhu browser check now copes with a very busy PC (all the chats at once). It waits longer for the first page load and presses Undo directly, because on a slow PC the Undo line folded itself away (it hides 10 seconds after a tap) before the check could press it.

**Queued from the design chat (30 Oct):** faint FA-R3 (no ticks under the stars; over three rituals he climbs back to full health and the lost runes come back as tablets in bubbles), level up LU-X2 "The Sky Answers", and the wall WD-1b (final look from wall7 once you pick). Each is built where it sits in the list: Big Moments next, then the wall and golems.

## 29 Oct 2026, item 1U.9: the haggle prize is one item, by dice kept

**What changed:** before you sit down, the keeper asks which ONE item you play for (up to five of that stall's best, the dearest picked; tap another to switch). When the stalls get their spotlight (1U.6) it will be whatever is in the spotlight. A win takes money off that item only: 25% if you still hold 5 or 4 dice, 20% with 3, 15% with 2, 10% with 1. A loss or walking out puts 10% on that item today. Still one game a day with each keeper. The end shows one big word, VANQUISHT or ENGULFT (the default until you pick the losing word on the dice mock-up), then the item at its new price. The stall's badge says the same word.

**You need to:** nothing now. It goes into the next complete paste set.

**Save:** see below (saved with 1U.5's paste set).

## 29 Oct 2026, item 1U.5: the Lair banner

**What changed:** the banner at the top of Ulhu is now your B2 Band: the middle of a huge moon behind Ulhu (he stands in the middle), the rune pile on the left (H4, runes stacked in a pyramid up to 21), the round flask for health on the right (V1), your colours for each time of day (P2 morning before 10, P3 day until 5 pm, P3 evening until 9 pm, P2 night), the M2 crescent when the moon is half, and candles when it is dark. Level and title sit on a stone plaque top left; Ulhu's line sits top right. A level up floods the band with the tide; a slip shakes the flask. Tapping the moon still marks a day off. It is built straight from the mock-up's own drawing code, so it matches lair3.html.

**You need to:** nothing now. It goes into the next complete paste set.

**Save:** see below.

## 29 Oct 2026, item 1U.13: omens and rituals fixes from your phone

**What changed:**
- **Absolution card:** it now rises to the very top of the Omens tab as the stained-glass card. The cause: your omens are mostly two-sided now, and a two-sided omen never turned into the glass card (it only got a gold label inside Both Ways). Now it does, straight after the slip, before the server even replies; tap the curse half or the blessing half as before.
- **Coven (and every reason):** the reason you pick now turns blood red (red ring, red glow, red name) and stays for a moment before the sigils sink. Coven's figures are dark, so the old red soak hid it.
- **Every-few-days rituals:** a row of small pips fills as the days pass, with "due by Thu", "due today" (amber), "next by Sun" once done, or "overdue". So a quiet day reads as inside the range, not a skip.
- **Pairs:** the "Pair 8 missing" button is now at the bottom of the Omens tab. Pairing a lonely blessing asks "Name the curse it answers" first, with the blessing underneath, the way a two-sided card reads curse then blessing.
- **Rolling twice:** the dice roll played a second time whenever the keeper went first (his turn redrew the table with the roll still switched on). Now it plays once.
- **2-week bar:** mock-up made, waiting for your pick (above).
- Also: the Ulhu browser check now picks its own free port. Two chats were running it at the same moment on one shared test server, which is why its checks failed at random.

**You need to:** pick a 2-week bar. The rest goes into the next complete paste set.

**Save:** a3ccd74c.
