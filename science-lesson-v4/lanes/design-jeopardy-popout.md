# Design: the Jeopardy and memory-phrase pop-outs, wired into the behaviour app

Written 31 Oct 2026 by the Lane C design chat, from Patryk's ask of 15 Oct 2026 (point 6 of his planner list: "pop-out classroom tools: Jeopardy, using the behaviour seating plan, a correct answer is a positive for that pupil, a second tab like the behaviour app; and the class memory-phrase tool") and the two tools he already has: `classroom-jeopardy.html` (his game, with the rules in `tools/JEOPARDY_HANDOVER.md`; both gitignored because the rosters hold real names) and `tools/vanishing-cues.html` (the memory-phrase tool, no names). Mock-up: `lanes/mockups/jeopardy-board.html` (made-up class, two looks). Nothing here is built yet.

## 1. What it does

Today the Jeopardy game is one HTML file on the classroom PC with the class rosters typed into it by hand, and the positives it earns are not positives anywhere else. After this:

- **The rosters come from the behaviour app.** Pick the class once; the sides (Left side and Right side of the room) are worked out from the seating plan the behaviour app already holds, with the mirroring rule he uses (the plan is drawn with the board at the bottom, so the sheet's left half is the room's Right side). Nothing to retype when a class changes; a "Swap sides" button stays for a class that comes out wrong.
- **A right answer is a positive.** When he presses "Left wins", the Left duellist gets a positive in the behaviour log, the same as a tap on the phone: it shows on the phone's plan at once, counts in the Friday list and in the pupil's week. Undo on the game undoes the positive.
- **Boards come from his lessons.** A tick on a lesson in the planner ("Jeopardy next lesson") makes the home build write a board for it, from that lesson's questions and the class's weak spots on the memory map, in the exact board format his game already reads. The game's own board library and the "Copy prompt, paste the reply" builder stay for anything else.
- **It is a second tab, as he asked:** the game runs full screen on the classroom PC (projector), driven by the keyboard as now (tile, Next, winner; nothing added to the click path). The phone gets a three-button strip for the same three presses, so he can run a round from anywhere in the room.
- **The memory-phrase tool** (Vanishing Cues) gets its phrases from the lessons: a lesson's memory phrase lands in that class's phrase bank by itself, and the class size comes from the class. It logs nothing per pupil (there is nothing per pupil in it), so it only gains the class picker and the bank.

What it does not do: no Ulhu points, no cold-call picker (the duel draw is the game's own rule, already his), no microphone, no change to the game's rules or screens beyond the class picker and the winner's positive.

## 2. Where the data lives

| What | Where | Notes |
|---|---|---|
| Pupils, seats, sides | the behaviour app's Students tab (class, name, short, x, y as % of the plan) through the existing `openClass` call | side = Right when x < 50, Left when x >= 50 (the mirroring rule, section 4); a pupil with no seat is asked once and remembered for the session |
| Positives | the behaviour Log tab, through `logEvent` (type `+`) and `removeEvent` | a win is one tap with its own tap id, so a retried call never writes twice |
| Boards built from lessons | `<lesson base>_jeopardy.json` beside the lesson's files at home; carried to school inside `planner-data.json` as `classes[cls].seq[n].jeopardy` | the same board shape as the game's library: rounds, values, categories, clues with q, a, mark, dd, and final |
| His own boards (pasted) | the game's library as now; the installed app keeps them in its local store, with "Download this game" still working | nothing of this goes to a Sheet |
| Game results | a new "Games" tab: date, class, board title, Left score, Right score, clues played | class level, no names; for the Friday list ("9AS: Jeopardy, 2400 to 1900") |
| Memory phrases | `classes[cls].seq[n].memoryPhrase` in planner-data.json (from the lesson's extras) plus his saved phrases in the app's local store | no names |

## 3. Every screen

### 3.1 Games (the way in, on the PC and on the phone)
A page in the installed app (section 3.3 of `lanes/design-installed-app.md`: the Lesson page family), opened on the classroom PC in a second tab, full screen. Class chips along the top (the same chips as the Lesson page, the current class pre-selected). Two cards: **Jeopardy** and **Memory phrase**. Under Jeopardy: "From your lessons" (boards the build made for this class, newest first, each with its lesson title and date) and "Your boards" (the library), and a Start button. The game's own builder panel (topic, scope, Copy prompt, Load this board) sits under "Your boards", unchanged.

### 3.2 Board, clue, answer, final, results
The game's screens exactly as they are (grid and score bar; question slide with the two duellists and the timer; answer slide; final with wagers; end scores), with three changes:
- the duellists' names come from the sides worked out in 3.1 and show the pupil's short name as the behaviour app prints it;
- the answer slide's "Left wins" and "Right wins" also show "+1 for <name>" under the button for a second after the press (the positive went in), or "will send when back online";
- a small "Swap sides" and "Not in" stay where they are.
Keyboard as now: Space, Enter or Right arrow to the answer; 1 Left wins, 2 Right wins, 0 or N nobody; T restarts the timer; Esc back to the board.

### 3.3 The phone strip
On the phone's Lesson page, when a game is running for the open class (the PC tells the server, the phone asks every few seconds as it does for the board), a strip under the class chips: the clue's value, the two duellists, and three buttons: **Left**, **Right**, **Nobody**. The PC screen moves on when the phone presses. Nothing else of the game is on the phone.

### 3.4 Memory phrase (Vanishing Cues)
The tool as it is, with the class chips above it and the phrase bank filled from the class's lessons (each phrase named after its lesson). Class size filled from the class. Save to bank keeps working for his own phrases.

## 4. The rules a builder needs

- **Sides from the plan.** The behaviour app stores x and y as percentages of the plan picture, drawn with the whiteboard at the bottom. Pupils face the board, so the picture's left is the room's right. Side = Right when x < 50, Left when x >= 50. A class with the plan drawn the other way round: "Swap sides" flips the whole class for the session and is remembered per class in the app's local store. Pupils with no seat (x empty): a one-time "Left or Right?" when the game starts, remembered for the session.
- **Draws without repeats** as now: each side shuffled into a queue; nobody repeats until the whole side has had a turn.
- **The positive.** "Left wins" = `logEvent(key, cls, leftDuellist.name, '+', '', tapTime, tapId)`. One tap id per clue per side, so a retry after a dropped connection cannot double it. "Nobody" logs nothing. A talking penalty logs nothing (points only; he did not ask for a negative). Undo of the last award (the game's score history) calls `removeEvent` for that positive. Offline: the same outbox the Lesson page uses, with "will send when back online" shown.
- **The board a lesson builds** (home build, Plan Mode, Lane B): one round of 3 to 5 categories from the lesson's own headings (Learn parts, the practical, key words), five clues each, harder down the column, written to the handover's rules (questions under 30 words, answers at most two sentences, maths in plain Unicode, one Daily Double in Round 1 and never on the easiest clue, only what the class has been taught). Sources, in order: the lesson's MCQs (the right answer as the answer, the question as the clue), the Do Now bank for this class's earlier lessons, the lesson's Apply questions with their model answers, and when the memory map marks a section red for this class, one category from that section. The build checks the board with the game's own `checkPack` rules and prints the category list in the CONTENT CHECK. A board is written only when the lesson's "Jeopardy next lesson" tick is on (lesson extras, already in the planner).
- **Which board the Games page offers first:** the class's most recent lesson that has one, then older ones.
- **Results to the Games tab** at the end screen: class, board title, scores, clues played. Nothing per pupil.

## 5. Every server call

| Call | Exists? | Used for |
|---|---|---|
| `openClass(k, cls)` | yes (Behaviour.gs) | the class's pupils with short names and x, y |
| `logEvent(k, cls, name, '+', '', tapTime, tapId)` | yes | the winner's positive (idempotent on tapId) |
| `removeEvent(k, cls, id)` | yes | undo |
| `gamesBoards(k, cls)` | new, in Day.gs (Lane C's server file, so Behaviour.gs is untouched) | the class's lesson-built boards and memory phrases from the planner's Data tab (the same read `lessonMcqs` does) |
| `gamesState(k, cls, state)` / `gamesState(k, cls)` | new, Day.gs | the PC writes the running clue (value, duellists, phase) to the script cache; the phone reads it; a phone press writes `{press: 'L'|'R'|'N', tapId}` which the PC picks up on its next read |
| `gamesResult(k, row)` | new, Day.gs | append to the Games tab |

All through the installed app's bridge (section 5.1 of the installed-app design), so the three new names join the allowed list.

## 6. How it is tested

- **Rules, in node (no browser):** sides from x with the mirroring rule and the swap; the no-repeat draw queue; one positive per win with a stable tap id (the same press twice logs once); undo removes the right event; "Nobody" logs nothing; the phone press moves the PC's phase; the board writer on two fixture lessons makes a board that passes `checkPack`, with questions under 30 words, answers at most two sentences, a Daily Double not on the cheapest clue, and nothing outside the lesson's content.
- **Click-through, Playwright, made-up roster:** pick a class, confirm a sheet-left pupil lands on the Right side; start; open a tile; the timer counts down; Space; the phase is "answer"; press 2; the Right score goes up and a fake `logEvent` was called once with the Right duellist's name; undo calls `removeEvent`; download, reopen, the class and board survive. Screenshots at 1400 x 900 of the board, question and answer slides for projector legibility (the handover's own test list).
- **No names:** the test roster is made up; the repo's no-names check covers the new files.

## 7. The order to build it in

1. **Mock-up pick (this chat, done):** `lanes/mockups/jeopardy-board.html`, A the game's own look moved across (navy, gold, Trebuchet, as his file is now) or B the planner's look (paper grid, Big Shoulders titles). Test default **A**: it is his own tool and he likes it; the change is in what feeds it, not how it looks.
2. **Lane C build, after the Lesson page is in the installed app (installed-app step 6):** the Games page with rosters from `openClass`, sides by the rule, the winner's positive through `logEvent` with the outbox, undo, results to the Games tab, `gamesBoards` and `gamesResult` in Day.gs. The game's own screens are moved in whole (his file minus the roster block, with its logic kept; the `PRISTINE` download trick is replaced by the app's local store, and "Download this game" still writes a standalone file for a colleague).
3. **Lane B, builder job (Plan Mode):** the board writer from the lesson (section 4), the "Jeopardy next lesson" tick flowing into the build request, `jeopardy` and `memoryPhrase` carried in `planner-data.json`.
4. **Lane C build:** the phone strip (`gamesState`), after step 2 has run in a real lesson.
5. **Lane C build:** Vanishing Cues into the Games page with the class picker and the lesson phrases.

## 8. Risks and what to do about them

- **Sides wrong for a class.** The rule matches his handover, but one class (11S2) was already a known exception there. "Swap sides" per class, remembered, and the setup screen shows both rosters before Start, as now.
- **A pupil without a seat** (new pupil, plan not updated): asked once at Start; the behaviour app's own "no seat" pupils already appear in its Names view, so they are never lost.
- **The positive feels cheap or too frequent.** It is his rule ("correct answer = positive"), and one game gives at most one positive per clue, around 20 a lesson across both sides. If he wants fewer, a setting "positives: every win / Daily Doubles and Final only / none" is one line in Settings; test default is every win.
- **Two screens, one key.** The PC tab and the phone share the one planner key; the phone strip only shows while the PC says a game is running, and a press from either is a tap with an id, so nothing doubles.
- **Boards built from thin lessons** (few MCQs, no Apply answers): the writer makes fewer categories (two is the game's minimum) rather than padding, and says so in the build output; the tick does nothing on a test or review lesson.
- **Names on the projector:** the game already shows them; the app only stops them leaving the classroom (the Games tab holds no names, the repo holds none).
- **Offline:** the game itself runs with no signal (the board is already loaded); positives queue in the outbox as the Lesson page's do; the phone strip simply does not show.

## 9. Open questions (answered with a test default; swap any of them)

1. **Who gets the positive:** A the winning duellist only (test default), B both duellists when both boards were right (he judges), C everyone on the winning side (too many; not recommended).
2. **Look:** A his game's look (test default), B the planner's look (both in the mock-up).
3. **Boards first from:** A the lesson build (test default), B pasted boards only, lesson boards later.
