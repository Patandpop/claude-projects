# Lane D log: Ulhu as a life companion

## Waiting on you
1. Next paste set (Lane A makes it): Companion.gs and GameComp.html (now holds the term page, focus knitting, sound and the companion screens) plus one line in game-ui.js (already committed). These are the changed Apps Script files.
2. The overnight adventure round 2: mock-up ready: replica/design/mockups/companion/adventure2.html. The test build uses 1C-i (brass lantern, parchment note), M1 (the scroll) and K1 (wooden cabinets) until you pick.
3. Term page glass and all 16 identity windows: APPROVED as final ("perfect", 30 Oct). Leviathan stays a sea serpent. Already in the game screen (term-gallery.html shows it).
4. Knitting round 4: mock-up ready: replica/design/mockups/companion/focus-crafts-4.html. K1 (firelit nook) and K3 (diving-bell room with Bloop), both in his real 16-bit sprite, room included, with a knitted strip bar and a pixel yarn ball. Pick one; it then replaces the scene in the Focus tab.
5. Nudges on the phone need Lane C's notifications (installed app, step 8). The rules are built and waiting.

## Entries (newest first)

### 30 Oct, test build of the companion screens
- What changed: the companion screens are now in the game, as test builds from your picks. Hold the moon: the week's days rise, pick a day, tap its tags (a plain tap still changes the moon). After Vespers the ledge is empty, a brass lantern burns and his note lies beside it (tap to read it big). In the morning a parchment scroll hangs under the banner with his find; the wax seal keeps it ("later" tucks it away). A little cabinet on the banner opens the Cabinets: seven, one per act; tap a find for its torn note, which joins the act's page (eight pieces, a short story per act, all seven written). Tabs beside it: Becoming (the stained-glass term page, all 16 identity windows) and Focus (knitting only, small sock, medium kelp scarf, large jumper; leaving the app pauses it, stopping early keeps the piece on the bench, finished pieces go on the shelf). Sound: the ocarina chorus plays on every 5th level, the old level-up on the others (changeable).
- New files: planner/companion-term.js, planner/companion-focus.js (both packed into GameComp.html), tests companion_server.js, companion_sim.py, companion_steps.py (the screens tested in the real game page). One line added to game-ui.js (it hands the companion its helpers).
- You need to: nothing until Lane A's next complete paste set; then try holding the moon, and look at the cabinet after a Vespers.

### 30 Oct, your picks, and the adventure round 2
- Your picks: day tags A (hold the moon: the week's days rise, pick a day, tap its tags); adventure 1C (the note) with a better note and lantern, the card under the banner made far better (grey-night tone kept), and 3B cabinets that open, with finds giving notes you piece together; term page A, redone as real stained glass; focus crafts keep stone carving and knitting, drop the other four.
- What changed: a new mock-up, adventure2.html. Row 1: three lantern-and-note pairs in pixel art (brass lantern with torn parchment under a pebble; ghost-green lantern with a dripping note on kelp; glass float with a blue flame and a chalk slate), new note each night. Row 2: three morning finds (a scroll that unrolls with a wax seal, a dripping net you tap open, a drawer that slides out of the ledge), each with a grey-night version. Row 3: a hall of seven cabinets; tap one and its doors swing open; tap a find for its torn note, which joins that act's page; eight pieces make the act's page, a short story never quite explained. Three cabinet styles.
- You need to: pick one letter in each row.

### 30 Oct, ocarina chorus to try
- What changed: one new sound on the sounds test page, a small choir of ocarinas playing together in harmony: a short tune of our own that climbs in a haunted minor and lands on a bright major chord, with the same cave echo. It suits the level up best (the biggest happy moment), so it sits right under the old level up to compare. The five sounds you love are untouched, and the game itself does not use the chorus until you pick.
- You need to: play both level ups and say chorus, old, or both.

### 30 Oct, sounds kept
- You said you love the haunted ocarina sounds, so all five stay exactly as they are. Future Ulhu sounds (the focus crafts, if they get any) will be made in the same style.

### 30 Oct, sounds remade: haunted ocarina
- What changed: the five sounds (tick, Vespers, level-up, fainting, back from the deep) are now video-game style as you asked: a soft breathy ocarina tone with a slow wobble, a cave echo, a faint ghost note an octave below, and minor-key tunes (all our own, nothing copied). Test page to hear them: replica/design/mockups/companion/sounds.html.
- You need to: listen and say keep, or which ones to change.

### 29 Oct, items 3, 4, 5 and 7 (server side and sound) plus four mock-ups, commit 93432fcc
- What changed: the term page's numbers (identity figures fill one pane per vote, fully lit at 30; "on your better days, these came first"; your tagged heavy days, which change nothing); the act's chapter windows (each school week's blessings, curses and rituals, sealed when High Vespers closes the week); sound for the big moments only (a tick, Vespers, a level-up, fainting, Ulhu back from the deep), with an on/off switch; and the nudge rules (at most one a day, at the time you usually tick, a real fact like "Read: 24 days", never after 7 pm, each kind switchable off).
- Choices I made that you can change: the term page covers the current half term (the act), not the whole term; a "better day" is one in the top half of the term's days by good ticks minus twice the curses; a ritual needs three ticks in the last fortnight before it has a "usual time" for a nudge.
- Sound on the phone: a web page cannot read Android's silent switch. Where the browser allows it the sound is marked to obey silent mode; the sure way is the sound switch, which will sit in the companion settings once the screens are picked.
- New file: planner/game-companion.js (the page side; sound works now with no edit to Lane A's screen code: it listens to the change signal the game already sends). Checks: 89 companion checks.
- You need to: pick from the four mock-ups (Waiting list 1 to 4).

### 29 Oct, items 1 and 2: day tags, the Ill rule, the overnight adventure (server side), commit 59f349de
- What changed: Ulhu's server learned your day tags (Marking, Parents' evening, INSET, Report writing, Trip, Cover, Ill, and your own). Tagging a day Ill turns its moon dark and curses that day are still logged but cost no health, so being ill can never make him faint. A day you already marked "sick" the old way counts as Ill too. After Vespers he now dives into the deep and is back from 6 am with a find (an object for the Sanctum shelf or a lore line, now and then a few runes); after a bad day (more curses than good ticks) he still goes and brings back something small or strange, which never costs anything. The year is split into the 6 half-term acts, a 7th for summer and an interlude for every other break, one chapter per school week; each act has its own finds, written to be never explained.
- New files: planner/Companion.gs (server), planner/tests/companion.test.js. bundle.js puts Companion.gs in the paste set; the paste-file test also runs the companion checks on the comment-stripped copy.
- Hooks in Lane A's Game.gs (four lines: curse costs nothing on an Ill day, the Ill day shows no health cost, the snapshot carries the companion data). They were swept into Lane A's commit 080c1865 because we share one folder; they do nothing until Companion.gs is pasted.
- Checks: npm test, game, server, bridge, bundle (with companion), companion, phone sim all green. The Ulhu browser simulation (ulhu_sim.py) times out on a form button; it does the same on the saved version without any Lane D code, so it is not this lane (the PC is busy with three lanes running browser tests). Tell me if it stays red.
- You need to: nothing yet (paste comes with Lane A's next complete set; the screens wait for your mock-up pick).
