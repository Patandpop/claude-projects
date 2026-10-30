# Eyes-free behaviour entry: design (30 Oct 2026)

Source: Patryk's idea of 21 Oct (memory note "eyes-free behaviour entry"), his taste rules (passive, he stays in control, no microphone), and the phone page as it is today (planner/Phone.html, Behaviour.gs). Written in the Lane C design chat; the maths is built and checked, the screen waits for his picks. Builder: Lane B (it owns Phone.html and Behaviour.gs). No pupil data leaves the school account; nothing here decides for him.

## 1. What it does

In a lesson Patryk wants to log a positive or a negative for a pupil without looking at his phone. He draws the first letter of the pupil's name with his thumb, anywhere on the screen. If more than one pupil starts with that letter he draws the surname initial straight after (he usually knows it). The phone buzzes once when it has one pupil. Then:

- one tap = positive (the fastest path, as he asked);
- two taps = negative;
- three taps = that pupil's full menu (report to me, border, reason), for the rare case he wants more;
- a long press anywhere = clear, nothing logged.

Every outcome has its own buzz, so he never has to look: a tiny buzz for "pupil found", two tiny for "several, draw the surname letter", one short for a positive, short-long-short for a negative, one long for "nobody starts like that". If he does glance, the pupil's name is huge in the middle of the screen and the screen flashes green or red.

The seating plan and the Names list stay exactly as they are. Blind mode is an extra fast path, not a replacement. Everything it logs goes through the same `log()` as a seat tap today, so Undo, the offline queue, the board and the Friday tab all see it as a normal tap.

## 2. Where the data lives

- **The class list** is what the phone already has: `S.students` from `openClass` (name, short, seat, border). Blind mode reads the initials off `name` ("First Last"; "Last, First" also works). Nothing new is fetched and nothing new is stored on the server.
- **His own letters** (the "Teach it your hand" drawings, at most 3 per letter) live on the phone in localStorage under one key (`ef.own`), the same way the saved class copy and the tap queue do. They are strokes only, never names. If he changes phone he teaches it again (two minutes). Later, if wanted, they can ride home in planner-state.json like the theme setting; not needed now.
- **Who he meant most often** (for ordering a short list) is a list of the last 20 names logged through Blind mode, kept in memory for the open class only, dropped when the page closes. It is never written anywhere.
- **The log entries** are ordinary rows in the Log tab, written by the existing `logEvent` / `logMany` with the usual tap time and tap id. There is no way to tell from the Sheet that a tap came from Blind mode, and no need to.

## 3. Every screen

### 3.1 Blind mode (the one new screen)
Full height below the class bar. The seating plan or Names list shows underneath at a quarter strength so he knows which class is open; it does not take taps. Gold ink follows the thumb and fades once the letter is read.
- Top line (small, grey): "Draw the first letter of a name. One tap: positive. Two: negative. Hold: clear."
- Middle: the letters read so far in gold (so a glance confirms "J N"), then the pupil's short name huge, then one line under it ("tap once: positive, twice: negative", "draw the surname initial", "positive logged").
- Bottom: the short list, only when it is needed (see 3.2): two to four big buttons with the short names, biggest tap targets on the page (76 px).
- The connection dot, Undo bar and snackbar work as on the rest of the page.

### 3.2 When the first letter fits several pupils (pick 1)
- **A (my pick):** nothing is shown but "3 pupils"; he draws the surname initial without looking. Two tiny buzzes tell him to. Only the surname initials of those pupils are considered, so the second letter is read from a very small alphabet.
- **B:** the matching names appear big at once and he taps one; he may still draw the surname letter instead.
In both, if two letters still leave more than one pupil (two "J N" pupils in a class), the short list shows and he taps. A tap while it is still waiting for a letter also brings the list up (the glance fallback). The list is ordered by who he has logged most often this lesson, then alphabetically.

### 3.3 How a tap becomes a positive (pick 2)
- **A (my pick):** a tap, then 0.4 s with no second tap, saves one positive: one trip to the server, one row, the usual Undo. The positive buzz comes after the pause. A second tap inside the pause makes it a negative instead. Positives are still the fastest path (one tap and he moves on; the pause is shorter than a blink of attention).
- **B:** the positive is saved and buzzes the instant he taps; a second tap within 0.4 s undoes it and saves a negative (two trips, two Undo entries). Feels faster, costs a server call and an extra queue entry when offline.

### 3.4 How he gets into Blind mode (pick 3)
- **A (my pick):** a third button beside Plan and Names: "Blind". Remembered like the Plan/Names choice.
- **B:** no button: a drawn letter anywhere on the Plan or Names screen that is not a tap on a seat counts as Blind input. Seats keep working. (Risk: a scroll on the Names list looks like a stroke; the Names list would need its scrolling kept to a scrollbar edge.)
- **C:** Blind is what the Lesson tab becomes when the phone is upside down (screen rotation locked, so this is a cheap orientation check). Right way up shows the plan.

### 3.5 Teach it your hand (settings, once per phone)
On the Today tab's settings, "Teach the phone my letters". It asks for each letter that starts a first name or a surname in his classes (about 20), three times each, with the letter huge on screen. Takes two minutes. His drawings then count a little more than the built-in block capitals. "Forget my letters" beside it.

### 3.6 Try it (settings)
"Test my letters": it names a made-up pupil ("draw K"), he draws, it keeps a score out of 20. This is how the recogniser's real accuracy gets measured, with his hand, before Blind mode is trusted in a lesson. Target: 19 of 20 with the class's alphabet.

### 3.7 The mock-up
`lanes/mockups/eyes-free.html` (open on the PC from the project folder; on the phone once Lane C's app site is live, or published by the design chat). It is the real code behind a fake class: Blind, Teach, Try and a Picks panel where he can switch options 1 and 2 and feel the difference. Light and dark.

## 4. Every server call

None new. Blind mode calls what the page already calls:
- `logEvent(k, cls, name, type, rule, tapTime, tapId)` for one pupil (`'+'` or `'-'`), via the page's `log()` so the offline queue, the tap id and Undo all apply.
- Three taps open `studentSheet(name)`, the existing menu; whatever he picks there goes through the existing buttons.
- `removeMany` for Undo, as now (and for pick 2B's "undo the positive, save a negative").

## 5. How the maths works (built: `planner/eyes-free.js`)

- **Reading a letter:** the $P point-cloud recogniser (Vatavu, Anthony and Wobbrock, 2012), extended with a turning-angle feature at each point ($P+). It does not care how many strokes a letter took, in which order or direction, which is what a thumb drawing without looking needs. The drawing is resampled to 48 points, scaled to a unit box (a squashed letter still reads) and compared to every template; a letter whose proportions are far off is penalised. 26 built-in block capitals, with second variants where people commonly draw a letter in one stroke (A, E, F, H, I, K, T, Y).
- **The class prunes the alphabet.** Only letters that start a first name in the open class are candidates for the first letter; only the surname initials of the pupils still in play for the second. A typical class leaves 10 to 14 letters, which is where the accuracy comes from.
- **Not sure:** when the best two letters are close, both stay in play (an "E or B" keeps Eve and Ben as candidates) and the surname letter settles it.
- **His own letters** are extra templates that count 10% more than the built-in ones.
- **The session** (one open class): idle, then narrow (several pupils) or picked (one), then taps; taps commit after the 0.4 s window; a pick left alone for 6 s expires so a later accidental tap cannot log; drawing a new letter after a tap commits that tap first.
- **Pointer grouping:** strokes that start within 0.38 s of the last pen-up are one letter; a press under 14 px and 0.26 s is a tap; a still press of 0.65 s is a hold.
- **Measured on synthetic thumbs** (tilt, squash, wobble, rounded corners, any stroke order): all 26 letters 96%; a class's 12 initials 97%, and 89% "sure" at that; with his own letters taught 99%. Reading a letter takes under 80 ms on the PC. Real numbers come from "Try it" on his phone.

## 6. How it is tested

- `node planner/tests/eyes-free.test.js`: 55 checks, made-up names: the recogniser (every clean letter, sloppy synthetic hands at the thresholds above, size and place and squash do not matter, stroke order does not matter, own letters win, a dot is nothing, speed); initials in both name orders; candidates and ranking; the whole session (one pupil, several, surname letter, short list, one tap, two taps, three taps, expiry, cancel, nobody, unsure letters); the pointer grouping (letters, taps, holds, the in-between press).
- `python planner/tests/eyes_free_sim.py`: the mock-up in headless Chromium with synthetic pointer strokes: K picks Kit, one tap logs a positive, two taps a negative, J asks for the surname initial, J then N shows a list of two, a tap on the list picks, a hold clears, Teach keeps a letter, Try scores, the Picks panel, light and dark, no page errors.
- When Lane B wires it into Phone.html: `phone_sim.py` gains a Blind case (draw, tap, assert `logEvent` was called with the right name and `'+'`; two taps `'-'`; offline stroke queues like a seat tap).
- No pupil data check: eyes-free.js and the mock-up hold made-up names only; the app's names test covers the mock-up if it is ever bundled into the site.

## 7. The order to build it in (Lane B, after his picks)

1. **His picks** (1, 2, 3 above) and a "Try it" score from his phone: at least 18 of 20 before step 3. The score is the gate. If it is low, step 2 happens first.
2. **If needed, tune the reader to his hand:** his taught letters can be exported from the mock-up (a copy button, adds a Save) and used to adjust the built-in templates. Do not build a different recogniser; the templates are the knob.
3. **Phone.html:** include `eyes-free.js` as `EyesFree.html` the way `logic.js` becomes `Logic.html` (one line in bundle.js); the Blind button (or the chosen way in); the full-height canvas; the events mapped to `log()`, `studentSheet()` and the buzzes; the Blind choice remembered like Plan/Names.
4. **Settings:** Teach and Try on the Today tab; "Forget my letters".
5. **phone_sim.py** Blind cases; paste set (Lane A).
6. **Later, if he wants it:** his letters saved with the planner state so a new phone has them; a "which classes" switch (Blind off for a class whose names he does not know yet).

## 8. Risks

| Risk | What is done about it |
|---|---|
| The recogniser reads his real thumb worse than the synthetic one | "Try it" measures it before anything is wired in; his own letters are templates; the class alphabet is small. The gate is 18 of 20. |
| Two pupils with the same initials | The short list after two letters, ordered by whom he logs most. He glances once. |
| A pocket or palm draws a stroke | A pick expires after 6 s; taps never log without a picked pupil; a hold clears; Undo as always. |
| A stroke on the Names list is a scroll | Pick 3A (a Blind button) keeps scrolling and drawing apart. 3B needs care. |
| Logging the wrong pupil without noticing | Every log says the name on screen and in the snackbar with Undo for 5 s; the buzz pattern says positive or negative. He can check the Today tab. |
| Phone has no vibration or it is off | Everything also shows on screen; the design does not depend on the buzz. |
| Page gets heavier | eyes-free.js is 12 KB; nothing else loads. |
