# North star: what the whole project is for (Patryk, 2026-10-21)

From "How to be more ambitious" (altitude, depth, range), applied to lessons, planner and teaching.

## The goal beyond the goal (altitude)
Every pupil in Patryk's classes knows, and still remembers when tested, the spec content, and Patryk is not working evenings to make that happen. The system runs as a loop: what pupils got wrong (homework Forms, MCQ checks in lessons, test marks) feeds the next homework, Do Nows and lessons without Patryk asking each time.

## Working like the best teachers (depth)
- Raw material: pupils' actual answers (which MCQ letter, which homework question, test marks, examiner reports), not the finished lesson content.
- Methods: item analysis (how many got it right, which wrong answer), a misconception map per topic, spaced and interleaved retrieval timed to forgetting, worked example → partly completed → independent.
- Outside judge: how pupils do on unseen questions weeks later, and what Patryk sees in the room. Never Claude judging its own lessons by how they look.
- Unreasonable goal: no class loses marks on a question type it has been taught and practised twice.

## Fields to borrow from (range)
Memory researcher (spacing), exam board examiner (examiners' reports), data analyst (item analysis), sports coach (short drills on the weak skill), information designer (dual coding), behavioural scientist (homework completion), red team: a pupil who missed last lesson.

## Kind as well as effective
Specific hard goals for pupils, anonymised peer models, low-stakes retrieval that is never public. Tools take decisions off Patryk's plate but he keeps the final say (no tools that decide for him).

## Order to build (first ideas, see specs/learning-loop.md)
1. Read homework Form results back in (free, Apps Script).
2. Misconception map per topic from examiner comments, feeding MCQs and misconception boxes.
3. Delayed checks: questions from weeks ago, in homework (Do Nows are too narrow and easy for this).

## HIGH PRIORITY future goal: same results, fewer tokens (Patryk 2026-10-21)
The code is getting bloated, so every session spends tokens re-reading it. Sizes on 2026-10-21: build.js 6,066 lines, SKILL.md 645, planner Planner.html 1,843, Code.gs 1,107. Ideas to plan (spec first, nothing built):
- Split build.js into small modules (text runs, Learn slides, MCQ, worksheets, checks) with a one-page map, so a change reads one module, not 6,000 lines. npm test proves nothing changed.
- Slim SKILL.md: keep the hard rules and the schema; move rarely used sections (review lessons, practicals, image extraction) into reference files read only when needed. This also cuts what claude.ai loads at school.
- Remove dead code and old notes; one source of truth per rule (no rule repeated in SKILL.md, slide-options and CLAUDE.md).
- Session habits: helpers for big builds, one mock-up round with fewer, bigger choices, short check pictures instead of full contact sheets.
- Measure it: count tokens for a standard "build tomorrow's lesson" session before and after.
- **DONE 2026-10-23:** build.js split into 17 parts (`references/builder/`), 5 dead pieces removed, SKILL.md 72 KB -> 47 KB (sections moved word for word to review-lessons.md, special-lessons.md, builder-behaviour.md). A build session reads about 27,200 tokens of skill instead of 33,600; a builder fix reads a 5 KB map plus one 5-40 KB part instead of a 335 KB file. Proof: 12 lessons rebuilt byte-identical. Still open: slide-options-v4.md overlap, rule wording (needs Patryk), planner file sizes.
