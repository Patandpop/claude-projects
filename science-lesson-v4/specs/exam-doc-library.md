# Exam-doc Library — design

## What this is

An exam doc (from AQA / Exampro) is a big file with 60 exam questions, all their
mark schemes, and the examiner reports, glued together into one Word file. On
its own it is dead weight: heavy to open, impossible to search, and never in the
shape a lesson needs.

The exam-doc library turns ONE such doc into a light, structured index. The
index lists every question PART on its own, with the part's question text, its
command word, its marks, and, joined to it, the REAL mark scheme for that exact
part. Once a doc is indexed, the lesson-generation tools pull individual parts
out of the library and drop them into lessons, worksheets, quizzes and answer
sheets.

This is a LIBRARY, not a merged paper. We are not stapling questions together
into a new exam. We are building a searchable shelf of individual, self-contained
question parts that other tools reach into. The unit on the shelf is the PART,
not the whole question, because a challenge task, a Do Now item, or a homework
question is almost always ONE meaty part, not a whole multi-part question.

Built and verified: `science-lesson/references/exam-library.js`. The prototype
was proven on "Physics - Atomic Structure - Nuclear Fission and Fusion.doc":
60 questions, 217 parts, 100% of parts joined to their mark scheme, zero
fabricated content, zero warnings.

## How a doc is read

The doc is RTF text wrapped in a `.doc` container. The parser reads it as latin1,
swaps every embedded picture blob for a plain `[FIG]` marker BEFORE anything else,
decodes the hex and unicode escapes, turns paragraph breaks into real line breaks,
strips the remaining formatting codes, and collapses the whitespace. What is left
is plain text in three clearly-headed sections: the questions, then "Mark schemes",
then "Examiner reports". Each section is keyed by the same question numbers
(Q1 ... Q60), which is what lets the three be stitched back together.

## Part granularity

Inside a question, parts are marked "(a)", "(b)", and so on, sometimes with roman
sub-parts "(i)", "(ii)". The part's mark tariff is the right-aligned "(2)" line
that follows its text; the question ends with "(Total X marks)". The parser gives
each answerable part an id: "a", "b", "a.i", "b.ii", and so on. A question that is
a single extended answer with no lettered parts becomes one part with an empty id.

One important case is the extended-response part where the exam lists "(i) (ii)
(iii)" as bullet prompts under one letter but the mark scheme marks the whole
thing as one answer with a single tariff. The parser detects this (the sub-parts
share ONE tariff instead of each carrying their own) and collapses those bullets
back into a single part keyed by the letter, so it lines up with the single mark
scheme entry. This is what took the sample doc from 5 unmatched parts to zero.

## The join — real mark schemes only

Each part is joined to its mark scheme on question number PLUS part id. The joined
scheme carries:

- the full mark-scheme text for that exact part,
- the allow / accept / ignore / do-not-accept notes pulled out separately,
- the Level 0-3 descriptors when the part is an extended-response (each as
  {level, marks, descriptor}),
- the examiner commentary for that question, when the doc has one.

This real mark scheme is what feeds the GUESS calculation scaffold and the
"six or more indicative points from a real Level 3 descriptor" rule on the
answer sheets. Model answers are grounded in the actual scheme, never invented.

HARD RULE, enforced in code: if a part has no mark-scheme match, its `ms` is set
to `null` and the part is listed in `joinMisses`. The parser NEVER makes up
scheme content to fill a gap. Separately, the parser fails loudly (it throws,
with the question and part named) on structures it genuinely cannot read — a
missing section heading, a mismatch between the number of questions and the
number of "(Total X marks)" markers, or a part that somehow out-marks its own
question. Oddities that can be safely skipped go into a `warnings` list that is
printed at the end, never swallowed.

## Selection ranking

Every part gets a `challengeScore` so the tools can pick the best part for a job
without a human reading all 217. The score adds two things:

- Command-word tier. Evaluate / Explain / Compare / Justify score 3; multi-step
  Calculate / Determine / Show and the extended Describe / Suggest score 2; recall,
  tick and choose score 1.
- Tariff bonus. A 3-to-6 mark part is the sweet spot for a meaty challenge task and
  scores best; 2-mark and 7-plus parts score a little; 1-mark parts score nothing
  extra.

So a 4-mark "Explain" ranks above a 1-mark "State", which is exactly the ordering
a challenge task wants.

## Figure-free version 1

Some parts lean on a figure (a diagram, a table, a graph). Pulling figures out of
the RTF cleanly is a later feature. Until then, any part that contains a `[FIG]`
marker (in the part or its question stem) is flagged `hasFigure: true`. Version 1
DEPRIORITISES figure-flagged parts in the ranked picks; it never drops them from
the index. When figure extraction lands, those parts become first-class without
re-indexing anything else.

## Examiner-report trip-ups — the future ranking layer

The examiner reports say what students actually got wrong ("Only 6% scored all 4
marks", "a common incorrect answer was ..."). Today the commentary is stored
verbatim on each part. Later it becomes a ranking and teaching layer: parts with
a known, well-described trip-up are gold for command-word training, for MCQ
distractors, and for "here is the mistake to avoid" teaching moments.

## Usage tracking for variety

If every lesson pulled the single highest-scoring part, classes would see the same
question again and again. The library records how often each part has been used so
the tools can rotate: prefer strong parts that have NOT been used recently, not
just the one best part. Usage tracking is a per-part counter the downstream tools
update; the index carries the slots for it.

## Index once, cache

These docs are heavy (about 2 MB) and slow to parse. A doc is indexed ONCE into
`exam-library-index.json` next to it, and the tools read the light JSON after
that. Re-indexing only happens when the doc changes. The index is home-side data
and is kept OUT of the skill package.

## Spec-version and date tags

Every index records the parser spec version and the date it was built, plus the
source filename and the subject / topic / subtopic. If the parser improves, we can
tell which indexes were built by which version and re-index the stale ones.

## Generalising beyond this doc

The sample is OCR-free AQA Physics, but nothing in the parser is Physics-specific.
The subject, topic and subtopic come straight from the filename convention
"Subject - Topic - Subtopic.doc" (for example "Chemistry - Bonding - Ionic
Bonding.doc" or "Biology - Cells - Cell Transport.doc"). As Chemistry, Biology and
OCR Physics A docs arrive, each is dropped in, indexed the same way, and joins the
same library. The command-word list already covers the imperatives those boards
use. Any doc whose structure the parser cannot read fails loudly rather than
producing a quietly wrong index.

## The 13 downstream applications

The library exists to feed all of these, from the one index:

1. Challenge tasks — pull a high-`challengeScore`, figure-free part with its real
   mark scheme.
2. Do Now bank — short recall parts (1-mark State / Give / Name) for spaced retrieval.
3. Revision lessons — a spread of parts across a topic with model answers.
4. Auto-tiering — sort parts by tariff and command tier into core vs challenge.
5. Mark-the-answers sourcing — real mark schemes and Level descriptors behind the
   model-answer sheets.
6. MCQ distractor mining — turn allow / accept / insufficient notes into believable
   wrong options.
7. Examiner trip-ups — surface the "students commonly got this wrong" points.
8. Command-word training — group parts by command word to teach exam technique.
9. PLC-linked practice — map parts to the subtopic so a personal learning checklist
   can hand a student targeted questions.
10. Homework generation — pull a balanced set of parts per lesson.
11. Synoptic questions — combine parts across subtopics once several docs are indexed.
12. Curriculum weighting analytics — count parts and marks per subtopic to see where
    the exam load actually sits.
13. Verbal quizzing — short parts with terse mark schemes for quick oral Q and A.

All 13 read the SAME light index. Index once, use everywhere.
