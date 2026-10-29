# Spec: Lesson quality: Learn, images, Engage and MCQs

## Overview
Patryk's Learn slides read as AI-written, key terms are often not defined or not highlighted, the definition box is underused, ideas are split across two slides for no reason, and images sit next to the text instead of carrying the explanation. Engage hooks are often filler, so he skips them. Multiple-choice wrong answers are sometimes obviously wrong. This spec improves the lessons the skill writes: research first, then many mock-ups for him to pick from, then rules and checks built into the skill and the build so every lesson (home and school) follows them. Dual coding is the top priority.

## Inputs
- Existing lesson content files (`*/lesson-content.json`) for the failure analysis of past Engage and Learn slides.
- The school's own lesson slides on Drive (images extracted with `image-extract.js`), for the image library.
- Free research sources (web pages, education research summaries). No paid APIs.
- Patryk's picks from the mock-up page (layouts, highlighting style, objectives panel).
- Sample content for five Learn types: equation, diagram, graph, normal content, story (history/storyline).

## Outputs
- `design-audit/lesson-quality/research.md`: research report (phrasing, highlighting, dual coding, hooks) and failure analysis of past Engage and Learn slides.
- A mock-up web page (published artifact) with many Learn slide versions for the five types, objectives panel versions and Engage versions; the best few also rendered as pictures in chat.
- Updated SKILL.md / slide-options-v4.md: writing rules, key-term rules, image rules, Engage menu and avoid-list, MCQ option rules.
- build.js changes (after Plan Mode approval): chosen Learn layouts and highlighting, objectives side panel with key words, MCQ check report, split-idea flag.
- Image library improvements so images from school slides are found and reused.
- New regression tests; `npm test` green; skill re-packaged.

## Must-haves
1. **M1** Research report covering natural (not AI-sounding) slide phrasing, highlighting key information, dual coding, and lesson hooks, comparing different hook approaches, plus an analysis of what failed in past Engage and Learn slides. Free sources only.
2. **M2** Mock-ups: one web page with many versions of Learn slides for equation, diagram, graph, normal content and story lessons; the best few shown in chat as pictures. Patryk picks before any build.js change.
3. **M3** Writing rules (plain, spoken-style, built from the research) written into the skill so home and school lessons follow them.
4. **M4** Every key term is defined somewhere in the lesson and highlighted the same way every time, in the style Patryk picks; the definition box is used properly.
5. **M5** One idea stays on one slide unless it truly needs two; the build flags slides that split an idea for no reason.
6. **M6** Every Learn slide has an image or diagram the explanation is built around, labelled or annotated. Source order: school slides first, then diagrams Claude draws. One consistent rule set for labelling a photo vs drawing a diagram.
7. **M7** Better use of the image library from the school's slides so the right image is found and reused across lessons.
8. **M8** Objectives slide has a consistent side panel with key words: words from previous lessons shown with definitions, new words shown without.
9. **M9** Engage: a researched menu of hook formats plus a written list of kinds to avoid.
10. **M10** MCQ check: every wrong option is one realistic mistake away, a common faulty line of reasoning, or a test of a key idea. Claude rewrites weak options while writing the lesson; the build checks again and reports what was fixed or still weak.
11. **M11** Nothing working gets worse: `npm test` stays green, new tests cover the MCQ check and the objectives panel.

## Nice-to-haves
1. **N1** A consistent drawn diagram style that feels hand-drawn and well made, not AI-looking (future goal).
2. **N2** True/false slide rebuilt with a reveal animation (A = true, D = false).
3. **N3** MCQs linked to the Learn slide and scheme-of-work point they test.
4. **N4** History, context and real quotes in slide notes (free sources only).

## Out of scope
- Homework results from Google Forms (separate spec).
- Review lessons: annotated graphs, ticks on sample answers (separate spec).
- Exam practice paper tick-box size (separate spec).
- Web image search and AI-generated images; any paid API.
- Planner changes.

## Integration points
- `science-lesson/references/build.js` (Plan Mode required before editing), `slide-options-v4.md`, `SKILL.md`, `worksheet-spec.md`.
- `engage-library.md`, `mcq-rules.md`, `mcq-analyse.js`, `image-extract.js`, spec `specs/engage-reveal.md`.
- `test/run.js` regression harness; `package-skill.ps1` (re-package and remind Patryk to upload).
- Rules: no em dashes, Century Gothic house font, Learn A max 2 boxes with an image, mock-up then approval before visual changes.

## Success criteria
- research.md exists and names sources and the failure patterns found in real past lessons.
- Patryk has picked from the mock-up page; his picks are recorded in the spec or research file.
- A rebuilt sample lesson for each of the five types shows: an image on every Learn slide, consistent key-term highlighting, the objectives side panel, and a researched Engage.
- The MCQ check flags a seeded obviously-wrong option in a test fixture, and passes good ones.
- `npm test` green; skill packaged.

## Patryk's picks, round 1 (2026-10-19)
- Highlighting: soft cap of 3 per slide. Likes style 4 (navy tag) but wants more tag variants. Labels and notes ON the picture, big enough for the back row.
- Wording: keep the meaning (the energy rewrite changed it). Every hook poses one clear question, ideally a problem the lesson solves at the end. Cells line: add something to discuss. Definitions: break the word down (what it means, where it comes from, history). Likes the P1 line.
- Keep: C0, C1, C2, C3 (fix C1 text boxes), D1 (best), G1, G2, G3 (better text formatting), E1, S1, S2, S3 (S2 and S3 diagrams better), F2, N1 (fix stretched pictures, small text).
- Change: D0 labels spread out; D2 caption says "model diagram" (a real biological drawing looks different); D3 less preferred. E2: use a real picture, not drawn shoes. F1 colours off, definition goes ABOVE. F3 no.
- Objectives: O2 preferred, better formatted (dark colour), two groups with no "new today" tags: known words with longer definitions (only if a previous lesson taught them), this lesson's words without definitions.
- Answer/reveal boxes: a yellow that works on his projector.
- Engage: N2 needs no drawing. N3: every option odd in some way, for discussion. N4 better formatting.

## Patryk's picks, round 2 (2026-10-19)
- Highlighting: style 2 (bold + gold underline), also combined with the navy tag or navy pill.
- Answer/reveal colour: between the gold and the yellow (gold looks orange on his phone); more options to try.
- Objectives: O4 liked most; highlight key terms well; O6's way of showing this lesson's words (navy tags) is best.
- Wording: no silly questions with an obvious answer (e.g. "is your hair a virus"); intrigue, not idiocy. A lesson problem must be posed as a QUESTION, not a statement.
- Pressure symbol is capital P (P = F ÷ A) in his lessons.
- No biological drawings: label the cell model or use the school's image. An odd one out with one real answer is fine.
- N5, N6, N7, S4, S5 good. N8's reveal must answer HOW to prove it, not WHAT it is.
- Wants more examples of good Engage and Learn wording.

## Patryk's picks, round 3 (2026-10-19)
- Answer/reveal boxes: Y5 (#ffd60a) text on navy, the highest-contrast option.
- Objectives: O7 (dark band of known words with definitions, this lesson's words as navy tags, key terms highlighted in the objectives).
- Engage wording bank: approved as the model for hooks.
- Misconceptions: one consistent box format whenever something is false (round 4 offers M1-M3).
- Exam definitions: the mark scheme wording is the slide statement (from the exam library, with how often it was asked); the plain explanation goes in the slide notes for him to say.
- Longer sentences (e.g. the nucleus line) belong in the D1 label build, one part at a time.
- Fool's gold: use the standard ask and reveal boxes with the round 3 wording.
- Photo plus model: labels must point at the parts in both pictures; no key.

## Patryk's picks, round 4 (2026-10-19)
- Misconception box: M3 layout (side by side) with "Not quite / Actually" wording, not "People say". Filled key-word tags clash with the red and green boxes. Round 5 offers M4-M7.
- Exam definitions: "AQA: asked X times" and one highlight colour per mark are approved.
- X1 one-part-at-a-time build approved; every label must have a connecting line.
- Labels must land exactly on the part (measure from the image, e.g. the membrane edge).

## FINAL DECISIONS (2026-10-19, after 5 mock-up rounds)
Mock-up page: https://claude.ai/artifact/MRSkoUqyE6y5acqYkmLTae · source + pictures: design-audit/lesson-quality/mockups/ · research: design-audit/lesson-quality/research.md
1. Key terms: bold + gold underline (style 2); navy tag / navy pill + gold underline (13/14) also acceptable. Soft cap 3 per slide, first appearance only.
2. Answer/reveal boxes: Y5 yellow (#ffd60a) text on navy (replaces gold #f9a826 text).
3. Objectives slide: O7 (dark band "Words you know" with full definitions, only if an earlier lesson in the scheme taught them; "Words for this lesson" as navy tags with no definitions; key terms highlighted in the objectives).
4. Misconceptions: M7 (Not quite box, struck through, arrow, Actually box). Key words near it use the underline style, not filled tags.
5. Exam definitions: "LEARN THIS WORDING" box with the mark scheme's words, one highlight colour per mark, "AQA: asked X times" from the exam library; the plain explanation goes in the slide notes.
6. Labelled pictures: labels ON the picture with leader lines that land exactly on the part (positions measured from the image); one part at a time build (X2): current part ringed with its sentence open, others greyed but connected. Photo + model: shared labels in the middle pointing at both (D8); "model diagram", never biological drawings.
7. Learn layouts kept: C0-C3, D1/X2, D4, D8, G1-G3, E1, E3 (school photos), S1, S4, S5, F2, F4 (definition on top).
8. Engage: N5, N6, N7 (odd one out with a reason per box, or one real answer), N10 (standard ask + Y5 reveal). Hooks pose a real question the lesson answers; no silly questions; the Engage question bank (round 3) is the model.
9. Wording: keep meaning, one clear question, etymology/history where useful, Learn sentence bank (round 3) is the model.
10. Pressure symbol: capital P (P = F ÷ A).

## Status
- **Part A BUILT 2026-10-20:** {k} key words (gold underline), Y5 answer yellow everywhere, objectives slide (O7) after the Do Now answers, Learn definition / examDefinition / misconception / notes, MCQ CHECK + Learn word-count / split / key-word checks, exam-definition.js helper, skill docs, fixture lesson-quality-test.json. npm test green; skill packed. 9XS Atoms lesson upgraded locally (lesson-content.v2-before-partA.json = previous), NOT re-uploaded.
- **Part B next:** labelled pictures (one slide per part, measured points), photo + model pairs, drawn diagrams, Engage picture rows / odd-one-out grids, image library.
