# Writing multiple-choice questions (rules from real exam papers)

Drawn on 2026-10-10 from 2,745 real questions in Patryk's exam library: 1,872 AQA GCSE "Tick one box"
questions and 873 OCR A-level A to D questions. The numbers come from `mcq-analyse.js` (full figures
in `exam-library/mcq-analysis.md`). Follow these rules whenever you WRITE a multiple-choice
question: lesson MCQ slides, Do Nows, homework top-ups and written practice questions.

**Real questions first.** A real exam question is always better than a written one. Write one
only when no real question fits. A written question is never presented as a real exam question.

## 1. The stem

- Ask one clear question that can be answered before looking at the options ("What is the
  power of the heater?"). Do not write "Which of these statements is true?" with four unrelated
  facts.
- Negative stems are rare: 3% of GCSE questions and 5% of A-level ones. Use one only when the
  NOT is the point, and write **NOT**, **NEVER** or **LEAST** in capitals.
- Never use "all of the above" or "none of the above". Real papers use it in 0.3% of questions.
- Slides: 140 characters or fewer.

## 2. The four options

- **Exactly four** options with one right answer. (Older AQA questions sometimes have three. Write four.)
- **Spread the right answer.** On real papers it is A about 22%, B 28%, C 29% and D 20%. Over a
  lesson's 6 MCQs, use every letter, and do not use the same letter more than twice.
- **Similar lengths.** The right answer is the longest option only 16 to 22% of the time
  (chance is 25%). The longest option is about 1.4 times the shortest. Never make the right
  answer the longest, most careful one.
- **Parallel wording.** Every option is the same kind of thing (four organelles, four values with
  the same unit, four sentences built the same way).
- **Near misses.** In 55 to 66% of real questions, one wrong option differs from the right one by
  a single word (Translocation / Transpiration; Lost 25 electrons / Gained 25 electrons). Use at
  least one near miss.
- **Two-way grids.** When the answer has two parts, cross them: Gained 25 / Gained 64 / Lost 25 /
  Lost 64. Each wrong option then catches one specific mistake.

## 3. Number options

- **Smallest to largest.** Real papers order them this way 89 to 91% of the time.
- **Same unit** in all four. Real papers do this 83 to 88% of the time. Put a unit trap in the
  stem (data in g or cm), not in the options.
- **Each wrong number is one real mistake.** Work it out from the slip, never pick a random
  number. Kinds found on real papers, most common first:
  1. A different method or a step missed. OCR's biggest group, about half: for example, not
     converting °C to K before using Wien's law. Name the step you skipped.
  2. Doubled or halved: GCSE 17%, A level 8%. Typical slips are forgetting ½ in ½mv², using
     the diameter for the radius, or counting a round trip once.
  3. A small slip or rounding: 13 to 14%. Use this kind sparingly at KS3/4, because it
     punishes care more than understanding.
  4. A power of ten: GCSE 14%, A level 5%. Typical slips are g for kg, a missed prefix (mA, kJ,
     nm) or cm for m.
  5. ×3 or ×4: about 7%. Typical slips are ×4 from using d where r was needed, and ×3 from
     a wrong count.
  6. Squared or square-rooted, and upside down (1/x): 1 to 2% each at A level. Typical slips
     are forgetting to square v or r, and using 1/R for R.
  7. Time slips: 1 to 4%. Typical slips are minutes for seconds and hours for seconds.
- Number questions are harder. GCSE pass rate is 57%, against 64% for word questions. Use them
  for Challenge, and keep Core number options to one-step mistakes.

## 4. Word options

- Each wrong option is a **misconception pupils really hold**, ideally one named in the lesson's
  misconception slide or the examiner comments. Examiners praise distractors that "each attract
  many students" (Transpiration for Translocation; epidermis for palisade mesophyll).
- Common traps named by examiners:
  - misreading a graph or diagram (gradient for area, the wrong axis);
  - a direction or sign the wrong way round (absorbed for emitted, gained for lost, up for down);
  - confusing two quantities (mass and weight, current and charge);
  - forgetting to square.
- Never use a joke option or an obviously silly one. Every option must tempt someone.

## 5. Checking a written question

Before using a written question, check that:

- it has 4 options with exactly one right answer;
- for every wrong option, you can say the mistake that leads to it (`wrong: {B: "used diameter
  as radius", ...}`);
- number options run smallest to largest, in one unit;
- the lengths are even and the answer is not the longest;
- across the set, the letters are spread;
- for 12C/13D it uses OCR wording and notation (ms^−1, ×10^n). Never use AQA style for OCR.

Written practice questions are stored with `node references/mcq-written.js add <file.json>`.
That command checks them against the machine-checkable parts of these rules and labels each
one `written: true`. They are used only to top up homework quizzes and Do Nows that are short of
real questions. They never go on an exam practice paper.

## 6. Every wrong option names its mistake (Patryk 2026-10-19)
- In lessons, each MCQ carries `why: {letter: "the mistake that leads here"}` for all three wrong letters, e.g. `"B": "thinks two atoms joined means a compound"`.
- A wrong option must be one of: one realistic mistake away from the right answer, a common faulty line of reasoning, or a test of a key idea. If you can't name the mistake, the option is weak: rewrite it before building.
- The build's CONTENT CHECK runs an "MCQ CHECK": missing `why`, duplicate options, "all/none of the above", number options out of order, the right answer clearly the longest. Fix anything it flags.
