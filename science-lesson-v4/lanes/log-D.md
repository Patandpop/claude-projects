# Lane D log: Ulhu as a life companion

## Waiting on you
1. Pick where day tags live: mock-up ready: replica/design/mockups/companion/day-tags.html (A hold the moon, B a ribbon under the tabs, C week stones). Until you pick, the server side works but there is no button for it yet.
2. Next paste set (Lane A makes it): the new server file Companion.gs is now part of the set.

## Entries (newest first)

### 29 Oct, items 1 and 2: day tags, the Ill rule, the overnight adventure (server side)
- What changed: Ulhu's server learned your day tags (Marking, Parents' evening, INSET, Report writing, Trip, Cover, Ill, and your own). Tagging a day Ill turns its moon dark and curses that day are still logged but cost no health, so being ill can never make him faint. A day you already marked "sick" the old way counts as Ill too. After Vespers he now dives into the deep and is back from 6 am with a find (an object for the Sanctum shelf or a lore line, now and then a few runes); after a bad day (more curses than good ticks) he still goes and brings back something small or strange, which never costs anything. The year is split into the 6 half-term acts, a 7th for summer and an interlude for every other break, one chapter per school week; each act has its own finds, written to be never explained.
- New files: planner/Companion.gs (server), planner/tests/companion.test.js (49 checks). bundle.js puts Companion.gs in the paste set; the paste-file test also runs the companion checks on the comment-stripped copy.
- Hooks in Lane A's Game.gs (four lines: curse costs nothing on an Ill day, the Ill day shows no health cost, the snapshot carries the companion data). They were swept into Lane A's commit 080c1865 because we share one folder; they do nothing until Companion.gs is pasted.
- Checks: npm test, game, server, bridge, bundle (with companion), companion, phone sim all green. The Ulhu browser simulation (ulhu_sim.py) times out on a form button; it does the same on the saved version without any Lane D code, so it is not this lane (the PC is busy with three lanes running browser tests). Tell me if it stays red.
- You need to: nothing yet (paste comes with Lane A's next complete set; the screens wait for your mock-up pick).
