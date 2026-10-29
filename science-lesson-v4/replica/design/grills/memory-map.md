# Grilling: Goal 1, a memory map for every class

Started 29 Oct 2026. Sources read: CLAUDE.md, FABLE-WORKPLAN.md "Big goals", replica/design/big-goals-research.md section 1, specs/learning-loop.md.

## Decisions

Grilled 29 Oct 2026, ready to build. Builds on specs/learning-loop.md (ABCD votes, homework results, lesson MCQs with `why` tags already exist).

1. **What a square is.** Every result is stored against a spec sub-point (AQA like 4.1.1.2, OCR A level like 4.2.1). The grid shows topics; tap a topic to see its sub-points.
2. **Evidence (first build).** ABCD MCQ votes and homework Forms. Weighting: homework Forms count more than votes (votes are his rough estimate). Marked tests come later and count most (see 10).
3. **Linking to spec points.** Automatic: lesson MCQs take the lesson's spec code, exam questions take the paper's. He fixes the odd mistake only.
4. **Class level only.** No per-pupil map. Nothing with pupil names leaves the school account.
5. **Fading score (Anki-style maths, free, no AI).** Each square has a predicted class recall that fades with time. Starts from Anki's standard rates and learns from his classes' real answers. A right result raises it and slows future fading; a miss drops it and speeds fading. Pure planner maths; pupils never use Anki.
6. **The 75% line (one setting).** Below 75% predicted recall = red / due. A single result under 75% right (vote or homework question) counts as a miss: pushes the square towards amber/red and shows a "re-teach" flag. At or above 75% counts as right. Re-teach is a flag only; he decides.
7. **What he sees.** A "Memory" tab in the PC planner: one class at a time (class picker bar), topics as rows of squares in scheme order, green/amber/red, untaught topics grey. Tap opens sub-points, the questions behind them and the most-picked wrong answers with their misconceptions. Phone: only today's classes and their 3 reddest spots.
8. **Do Now suggestions.** Each lesson card shows "Suggested Do Now": top 10 from the reddest taught spots, top 6 pre-ticked, he unticks. Only used when he builds the lesson; never inserted on its own. Grey (untaught) topics are never suggested.
9. **Misconception tags.** Lesson MCQs: Claude tags each wrong option at build time (written ones already have `why`; exam MCQs used in lessons get the same). Homework/library MCQs: one home Claude session tags the whole exam MCQ library once, then new ones as they are added. No paid API, no work for Patryk.
10. **Tests (later, not first build).** Photograph the test front covers (his mark summary is written there); the planner reads the numbers free via Google Drive text reading and shows a grid of guesses to fix before saving. Photos stay on the school account; only class % per question goes into the map.
11. **Starting from zero.** Topics already taught start amber with a "?" (no evidence yet) and fill in as results arrive.
12. **End of topic / year.** Nothing resets. Old topics keep fading and keep being suggested. In September each class's map carries forward to its next year (10S2 becomes 11S2).
13. **When it updates.** Once a day, early morning, with the existing daily homework results run. Nothing after 7pm.

## Round log

### Round 1 (29 Oct)
- **Square size: 1d.** Store every result at spec sub-point level (AQA 4.1.1.2, OCR 4.2.1), show topics on the grid, tap a topic to open its sub-points.
- **Evidence:** MCQ votes + homework Forms for sure. Marked tests "would be a dream" BUT only if it adds little or no marking work. He already writes a summary of marks on the front of test papers; asked whether filming/photographing the fronts could capture it. Open, see round 2.
- **Weighting: 3b.** Tests count most, then homework Forms, then MCQ votes.
- **Pupils: 4a.** Class level only.
- **Tagging: 5a.** Automatic from the lesson's / paper's spec code; he fixes the odd mistake.
- **Anki:** he loves the Anki ideas and wants as much taken from them as possible; "Anki integration as a tool in some way". What that means exactly is open, see round 2.

### Round 2 (29 Oct)
- **Tests: 1d now, 1b later.** Tests stay out of the first build. When they are added, the route is photographing the test front covers (his mark summary is written there); the planner reads the numbers free (Google Drive text reading) and shows a grid of guesses to fix before saving. Photos have names: school account only, never synced home; only class % per question leaves.
- **Anki: 2a (tentative, he has not used Anki).** Anki's maths inside the planner only; no pupil decks, he does not need to use Anki himself.
- **Red line: 75%.** He chose between 70 and 80 because his ABCD % drags are rough, so leave slack. Make it one setting.
- **Fading: 4a.** Start from Anki's standard rates and let it learn from his classes' real answers.

### Round 3 (29 Oct)
- **Where: 1a.** Own "Memory" tab in the PC planner; phone shows only today's classes and their 3 reddest spots.
- **Look: 2b.** One class at a time (class picker bar), topics as rows of squares in scheme order, tap opens sub-points + most-picked wrong answers.
- **Do Now: 3b.** Top 6 already ticked on the lesson card's "Suggested Do Now" (from a top 10), he unticks what he doesn't want. "Less work is better"; builder may adjust details around this. Guard kept: suggestions are only ever used when he builds/approves the lesson, never auto-inserted.
- **Untaught topics: 4a.** Grey, never suggested.
- **Misconception tags: 5a, done by Claude at build time.** When a lesson is built, every exam MCQ used gets a misconception tag per wrong option (same as written MCQs' `why` today), saved with the lesson so the map just reads it. No extra work for Patryk, no paid API (it happens inside the normal build session).

### Round 4 (29 Oct)
- **Library tags: 1a.** One home session tags all exam MCQs once, then new ones as added.
- **Votes: his own rule.** Under 75% right = a miss, moves towards amber/red, means re-teach (flag). 75%+ = right.
- **Start: 3a.** Taught topics start amber with "?".
- **Year end: 4a.** No reset; maps carry forward to the next year.
- **Updates: 5a.** Daily early morning, nothing after 7pm.

## Other ideas
