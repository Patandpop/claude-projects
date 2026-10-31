# Log: the writing chat (Fable, started 31 Oct 2026)

## Waiting on you
- **Upload the writing analyser:** in claude.ai, Settings, Capabilities, Skills, replace (or add) `writing-analyser.skill` from the project folder. Not through Projects. Then open a chat, attach a photo of a page, and say "type this up and analyse it".
- **Two defaults you can change:** the report is a Word file with highlights and margin comments (a web page was the alternative), and the analysis is tuned for both poems and essays. Say the word and either changes.
- **Optional, no action needed:** `replica/design/level-titles.md` offers seven swaps for level titles taken straight from Lovecraft (Star Spawn, R'lyeh Mason, Elder Thing, Lord of R'lyeh, Elder God, Old One, Great Old One). The approved set stays unless you want a swap.

## 31 Oct 2026, the writing analyser (Job 2, as corrected by you)
**What changed:** a new claude.ai skill in `writing-analyser/`. You attach photos of a handwritten page (or paste typed text); it types the page up faithfully (your line breaks, your spelling, unreadable words marked `[?word]`, nothing silently fixed), shows you the transcript first to correct, then analyses the piece: exact quoted passages that work and that need a look, each under tone, style (voice, rhythm, imagery, diction) or structure (opening, pacing, turn, ending); three to six side-by-side revisions with one line on why; your three authors as lenses (Coelho, the Strugatskys, Danielewski), described in the skill's own words with one worked example each, all three unless you name one; a three-item "next time, try" list. It builds a Word report (`Writing report - <title> - <date>.docx`): your transcript with green and yellow highlights and margin comments, a table of the same notes for phones that hide comments, the revisions table, the lenses, the list. No scores, no em dashes. Adding an author later is one new section in `references/author-lenses.md`.
**Privacy:** your writing never goes into git; the test pages are made up (`writing-analyser/evals/`); test outputs and a `private/` folder are ignored by git.
**Cost:** none beyond your subscription. Reading handwriting uses Claude's own eyes inside the chat; no paid API.
**Packaging:** `.\package-writing-analyser.ps1` makes `writing-analyser.skill` (refuses to pack if an em dash slipped in).
**Tested on:** a made-up handwritten poem (with a crossed-out word and an insertion) and a made-up typed essay with the Coelho lens only. Results below.
**You need to:** upload the skill (see Waiting on you).

## 31 Oct 2026, Ulhu level titles (Job 1)
**What changed:** the brief said the game had 12 titles. It already had all 50 (your 28 Oct grill, built by Lane A), so no second set was written. New reference sheet `replica/design/level-titles.md`: the 50 titles in their five depths with Roman numerals, what each evokes, the depth and shop thresholds, and seven optional swaps. No game code touched. Lane A and the coordinating chat told.
**You need to:** nothing, unless you want a swap.
