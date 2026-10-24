# Spec: Learning loop (what pupils get wrong drives what comes next)

## Overview
Today nothing about what pupils actually learnt flows back into the lessons, homework or Do Nows. This builds the loop from the north-star brief (specs/north-star-brief.md): quick MCQ vote capture in lessons, homework Form results read back automatically, and spaced homework that revisits each class's weakest older content with real exam questions. Pupil-level data stays on the school account; home only ever sees class-level counts. It also adds a silent-work score with positive messages home to the behaviour app. Built in phases as tokens allow; this spec covers the realistic integration first.

## Inputs
- Lesson MCQs: each lesson's 6 MCQs from lesson-content.json (question, options, right letter, `why` per wrong option = the misconception it catches). Exported per lesson to Planner Sync as a small JSON (no pupil data).
- In-lesson MCQ votes: Patryk's phone gesture in the behaviour app (class, lesson, question, two letters, rough split).
- Homework Form responses: read by the school planner (Apps Script `FormApp`), from the Forms recorded in homework-made.json.
- Silent-work timer events: start/stop, "too loud" taps, per class per lesson.
- Scheme order and lesson log (which topic was taught when, per class).
- Exam library (real AQA/OCR questions, pass rates, examiner comments); OCR only for 12C/13D.

## Outputs
- Per class, per question: % right and the most-picked wrong answer (class level only at home).
- A misconception tally per class and topic (which `why` tags pupils fall for).
- Spaced homework: each Form about half new topic, half older content (taught 1, 3 and 6+ weeks ago), weighted to this class's weakest questions, real exam questions only.
- Behaviour app: MCQ vote screen; silent-work % per lesson; end-of-week positive message drafts for Patryk to review and send.
- Next lesson card in the planner: last homework's / last lesson's weak spots (the "results a week later" idea).

## Must-haves
1. **M1** Pupil names and individual results never leave the school account. Everything synced to home (Planner Sync) is class-level counts only. A test proves no pupil name appears in any synced file.
2. **M2** Each built lesson writes its MCQs (with right letter and `why` tags) to Planner Sync, so the app knows the answers without Patryk typing them.
3. **M3** MCQ vote capture on the phone (behaviour app): screen corners match the room (A bottom left, B top left, C top right, D bottom right). Swipe from the most-picked corner to the second; a slider on that line sets a rough split; release saves. A single tap = "nearly everyone picked this". Under 3 seconds per question; undo for 5 seconds. A **Skip** button moves to the next MCQ without recording (he doesn't vote on every MCQ). The corner letters use the same bright colours as the board's MCQ slides: A pink C2185B, B blue 1565C0, C green 2E7D32, D amber F57F17.
4. **M4** Votes are stored against class, lesson and question, and turned into "% right" and "main wrong answer → misconception" automatically.
5. **M5** The school planner reads homework Form responses (free, Apps Script) into a results tab: per question % right and most-picked wrong option, per class.
6. **M6** Spaced homework builder: test-paper.js / homework-forms.js pick about half older questions from topics taught 1, 3 and 6+ weeks ago, preferring this class's weakest questions (homework + MCQ votes), full difficulty range, real exam questions only, never repeating a used question (exam-usage.json).
7. **M7** MCQs in lessons come from real exam multiple choice first (exam library, with pass rates), then written ones that pass the MCQ CHECK; every wrong option carries its misconception tag.
8. **M8** The planner shows the class's weak spots from last week's homework and MCQ votes on the next lesson card.
9. **M9** Silent-work timer in the behaviour app: counts silent working time; a tap marks "too loud" and a second tap returns to quiet, as many times as needed in one silent spell (quiet, loud, quiet, loud...). **Stop** ends the spell and saves it; **Cancel** throws the spell away without recording. Records % of silent-work time actually silent per lesson.
10. **M10** End of week: the app drafts positive messages home (class or named pupils) from silent-work scores and behaviour; nothing is sent automatically, Patryk reviews and sends through school systems.

## Nice-to-haves
1. **N1** Research, then mock-ups, for the over-the-limit mechanic (earn time back vs fresh start vs tiers vs beat your own record), so a class that goes over doesn't give up. Patryk likes "earn time back" but wants it researched first.
2. **N2** Pupil codes so home can see "3 pupils keep missing X" without names (only if school policy allows).
3. **N3** Keep MCQs whose wrong answers actually get picked; flag ones nobody falls for.
4. **N4** Delayed check: one question from 3 to 4 weeks ago in the lesson MCQ block, recorded the same way.

## Out of scope
- Per-pupil personalised Forms (too heavy; needs pupil-level data at home).
- Microphone noise detection (doesn't work in his room; rejected before).
- Third-party voting services or scanning cards (Plickers-style).
- Automatic sending of emails or messages home.
- Any paid API (marking written answers with AI stays out unless flagged and approved).

## Integration points
- planner/Code.gs, Planner.html, Logic (school planner, Apps Script), planner/Behaviour.gs + Phone.html (behaviour app, same project), planner/Mailbox.gs (home-school link: class-level files only).
- G:\My Drive\Beechen Cliff Science\Admin\Planner Sync (sync folder), homework-made.json (Form URLs), exam-usage.json.
- science-lesson/references/build.js (lesson MCQ export, M2), test-paper.js, homework-forms.js (spaced homework, M6), exam library + mcq-written.js check.
- Existing memory notes: Forms misconceptions goal (2026-10-15), silence timer project, classroom tools taste (passive, he keeps control), school systems (name-bearing files gitignored).

## Success criteria
- A real lesson's 6 MCQ votes can be recorded on the phone in under 20 seconds total, and appear as % right per question in the planner.
- After one homework, the planner shows each class's three weakest questions and their misconceptions, with no pupil names outside the school account (automated check).
- The next spaced homework for that class contains older questions targeting those weak spots, all real exam questions, none repeated.
- Over a half term: the class's % right on re-tested question types goes up (the outside judge: delayed questions, not how the slides look).
- Silent-work % is recorded per lesson for a week and the Friday message drafts appear for review.

## Status
- **2026-10-22 built (step 1):** M1 (name-free results for home + test), M5 (daily results: Results tab, `turnOnDailyResults`, `dailyResults` trigger, sent home in planner-state.json), M8 (lesson card "HW n%" with the 3 weakest questions; logic.js lastResults + tests), M2 (lesson MCQs with answers and `why` attached to planner-data.json lessons via planner-catalogue.js lessonMcqs), M6 (homework-forms.js spaced picker: half current topic, half 1-3 / 3-6 / 6+ weeks, weak lessons first; `--no-spaced`; test/spaced-homework.test.js). npm test + planner tests green. Paste files: Admin/Planner Sync "PASTE INTO APPS SCRIPT - ... (22 Oct).txt".
- **Prototype for approval (M3, M9):** https://claude.ai/artifact/2EWLTwkuhcUi3F984isMNE (source design-audit/learning-loop/lesson-remote.src.html). After Patryk's OK: move into Phone.html + Behaviour.gs storage (M3/M4/M9), then M10 Friday message drafts.

## Patryk's feedback on the prototype (2026-10-22) — RECORDED, NOT ACTED ON YET
**MCQ voting (replaces the prototype's design):**
- Lives in the behaviour app: during an MCQ the A/B/C/D panel REPLACES the seating-plan area; every other app function stays available.
- Questions come in the lesson's order. Buttons a bit bigger. The % text bigger.
- Tap a letter = 100% that letter.
- Drag from one letter to another: the start letter does NOT mean the bigger share. The pair always shows in letter order (drag C→A or A→C both show "A | C").
- The same drag then sets the split: keep the finger down and slide left/right: sliding right lowers A and raises C (no separate slider to press). Must feel smooth (the prototype's drag did not).

**Silent work and time lost (replaces the prototype's separate timer screen; the old microphone strategies on his PC are no longer needed in the app):**
- The time of day stays at the top of the app. He switches ON "silent work" when he wants it: no countdown, just a clear colour shift / smiley-face style indicator that it is silent-work time.
- In silent work, he taps when it is too loud: instant switch to a sad face / red, counting up the seconds lost; tap again to go back.
- Second case, not in silent work: during instruction someone interrupts: one tap instantly switches to sad / red and counts up seconds lost, tap to stop.
- All other app functions stay available during both (an indicator, not a separate screen). Maybe linked with the ABCD cards.
- Scoring, still to design: silent work (and silent entry) as % of the time that was silent; interruptions as absolute seconds lost. How both feed the weekly score and the positive emails home is undecided: design and mock up first.
- **Adjusting the split (2026-10-22, added):** after a drag between two letters, he must be able to raise or lower either letter (e.g. A or C) from a control at the BOTTOM of the screen (thumb reach), not only by keeping the finger down during the drag.

## Built 2026-10-23: ABCD card votes in the behaviour app (M3, M4, with the feedback above)
- Phone: **ABCD** button beside Plan / Names. The A/B/C/D panel replaces the seating plan; header, class tabs, timers and the bottom tabs stay. Corners as the room (B C on top, A D below), board colours, right answer ticked, option text under each letter.
- Questions: today's lesson from the saved planner week (or this week's latest), in lesson order (`lessonMcqs`). A lesson with no saved MCQs (not built by Claude) still records as Question 1, 2, 3.
- Tap = 100% that letter. Drag from one letter to another = that pair, shown in letter order; keep the finger down and slide: further right = more for the later letter (5% steps). Lifting saves. Bottom buttons "more A" / "more C" move the split afterwards (same vote updated). Skip, previous / next arrows, Undo for 5 s.
- Storage: "MCQ Votes" tab (id, when, class, lesson, title, q, question, right, split, % right, main wrong, misconception from `why`). No pupil names. `saveVote` (same id = update), `removeVote`. Behaviour version 23.
- Tests: tests/server.test.js (ABCD checks), tests/vote_sim.py (13 checks in headless Chromium).
- **Next:** the silent-work / interruption indicator (feedback above; scoring still to design), then M10 Friday message drafts, then votes feeding the planner's lesson card (M8 uses homework only so far).

## Built 2026-10-24 (Patryk's feedback on the ABCD cards + time lost)
- ABCD: the pair is chosen by the drag's DIRECTION once the finger leaves the start card (a slant = the diagonal letter, even when it crosses a neighbour). The "more A / more C" buttons are gone (a rough estimate is enough). Undo is a button in the bottom row (clears this question's vote), no pop-up.
- Time lost: a "Talking: count the time lost" button under the timer controls (in teaching and during a silence). One tap: the phone panel and the board go red with a sad face and count up the seconds at once; a second tap stops and saves to the "Time Lost" tab. A count left over 30 min is dropped. Tap-driven (he hears it); the board's microphone is not used for this.
- Weekly goal (decided here, change LOST_GOAL_SECS in Behaviour Settings to tune): met when silent time is 80%+ (or no silences) AND no more than 3 minutes lost to talking that week (6 for a fortnightly class). The Friday chip shows "Silent 85% · 1:20 lost".
- Tests: server.test.js (time lost + goal), vote_sim.py 20/20.
