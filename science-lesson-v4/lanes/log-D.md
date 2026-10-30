# Lane D log: Ulhu as a life companion

## Waiting on you
1. Day tags: where do they live? mock-up ready: replica/design/mockups/companion/day-tags.html (A hold the moon, B a ribbon under the tabs, C week stones).
2. The overnight adventure: mock-up ready: replica/design/mockups/companion/adventure.html (row 1 while he is away, row 2 the morning find, row 3 where finds live; pick one letter per row).
3. The term page and chapter windows: mock-up ready: replica/design/mockups/companion/term-page.html (A one scroll, B cathedral wall with a rose window, C two tabs).
4. Focus crafts: mock-up ready: replica/design/mockups/companion/focus-crafts.html (six crafts; say which to keep and which to drop).
5. Listen to the sounds: replica/design/mockups/companion/sounds.html (keep, or say which to change).
6. Next paste set (Lane A makes it): two new files join the set, Companion.gs (server) and GameComp.html (sound).
7. Nudges on the phone need Lane C's notifications (installed app, step 8). The rules are built and waiting; nothing reaches your phone until then.

## Entries (newest first)

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
