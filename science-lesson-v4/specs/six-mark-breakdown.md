# Spec: the 6-mark breakdown (optional lesson slides)

Status: SPEC ONLY, nothing built. Written 2026-10-23 from Patryk's grill decisions of the same day.
Building it touches the builder, so it needs Plan Mode and Patryk's approval first (CLAUDE.md rule).

Mock-ups: `specs/six-mark-mockups/1-sub-questions.png` and `specs/six-mark-mockups/2-model-answer-highlighted.png`
(redraw with `python -I specs/six-mark-mockups/draw-mockups.py`).

---

## 1. In plain English (for Patryk)

**What it is.** A tool you switch on for one lesson at a time. After the experiment (after its questions and its
results data), the deck shows a real 6-mark exam question about that experiment, taken word for word from the exam
library with its picture. Then it breaks the question into 4 to 6 small questions. Each small question has its
answer underneath, hidden until you click. Last comes a model answer in handwriting, with each small question's part
highlighted in the same colour as that small question, so pupils see how the small answers join up into 6 marks.

**What it is not.** It does not go on the worksheet. Pupils do it in their books. The only exception: if that same
6-marker is already one of your Apply questions, it stays on the worksheet as an Apply question, as now.

**What happens later.** The build remembers the question. A week or two later (you decide, question 2 below) the
planner reminds you to set the same question as homework, this time with no small questions, so pupils have to
build the answer on their own. The planner ticks it for you in the exam practice builder.

**Three slides, in this order:**
1. The question: the real 6-marker and its figure, nothing else.
2. Break it down: the question in a slim strip at the top, then the small questions in a grid, each answer
   appearing on its own click, straight under its question (mock-up 1).
3. The model answer: handwriting with coloured highlights and numbered circles; on the right a colour key
   ("where each small question went") and the real mark scheme's Level 3 and Level 2 wording (mock-up 2).

**Where it works.** Home builds only, because the exam library lives at home. At school (claude.ai) see section 9.

**What changes behind the scenes, in phases (when you approve):**
- Phase 1: the slides (three new slide types, the placing rule, the checks, the tests).
- Phase 2: the memory for homework (a small record file, the planner reminder and pre-tick).
- Phase 3: the instructions Claude follows (SKILL.md) and a helper that lists good 6-markers for a lesson.

---

## 2. The content Claude writes (lesson JSON)

One new Build item type, `sixMarkBreakdown`. At most one per lesson. Listed anywhere in `build`; the build puts it
in the right place (section 4).

```json
{
  "type": "sixMarkBreakdown",
  "examRef": "Physics-Electricity-Current-Potential-Difference-and-Resistance-1#Q11",
  "part": "a",
  "leadIn": null,
  "figures": "auto",
  "afterPractical": 1,
  "subQuestions": [
    { "q": "What do you change, and how do you change it?",
      "a": "The length of the wire. Move one crocodile clip along the wire.", "markPoints": [2] },
    { "q": "How do you measure the length?",
      "a": "With the ruler, between the two crocodile clips.", "markPoints": [1] },
    { "q": "What two readings do you take for each length?",
      "a": "Current on the ammeter. Potential difference on the voltmeter.", "markPoints": [3, 4, 7] },
    { "q": "How do you get the resistance from them?",
      "a": "R = V ÷ I, for each length.", "markPoints": [5, 6] },
    { "q": "How do you make your results more reliable?",
      "a": "Repeat each length, ignore anomalies, take a mean.", "markPoints": [8, 9] },
    { "q": "Why keep the current low and switch off between readings?",
      "a": "So the wire does not heat up and change its resistance.", "markPoints": [10, 11] }
  ],
  "modelAnswer": "{1}Move one crocodile clip along the wire{/1} to change its length. {2}Measure the length between the clips with the ruler.{/2} For each length, {3}record the current on the ammeter and the potential difference on the voltmeter.{/3} {4}Calculate the resistance using R = V ÷ I.{/4} {5}Repeat each length, ignore anomalies and take a mean.{/5} {6}Keep the current low and switch off between readings so the wire does not heat up.{/6}",
  "keyLabels": ["Change the length: move a clip", "Measure length: ruler", "Readings: ammeter and voltmeter",
                "Resistance: R = V ÷ I", "Repeat, mean, anomalies", "Low current: wire stays cool"],
  "homework": true
}
```

| Field | Required | Meaning |
|---|---|---|
| `examRef` | yes | Library id `"<doc>#Q<n>"`, the same id style exam-pick.js, test-paper.js and the planner's `long6` list use. Looked up across the WHOLE library, not just the lesson's topic (the chromatography 6-marker is filed under C8 but taught in C1; the latent heat one is filed under Electricity). |
| `part` | no | The part letter of the 6-mark part (`"a"`, `"e"`, `"b.ii"`). Left out: the first part worth 6 marks. |
| `leadIn` | no | Sentence(s) from EARLIER parts of the same question that the 6-mark part leans on ("Ice forms on the windscreen at a temperature of 0 °C."). Must be copied word for word: the build checks it is in the library text and refuses it otherwise. Shown before the 6-mark text on slides 1 and 2. |
| `figures` | no | `"auto"` (default): the figures attached to the 6-mark part, at most 2, tiny ones dropped (same size test as exam-pick: under 6000 bytes or under 120 x 60 px). A list of figure positions (`[0]`, `[0, 1]`) picks from the whole question's figures. `false`: no figure (the latent heat heater circuit adds nothing to its 6-marker). |
| `afterPractical` | no | Which experiment it follows when the lesson has two (1 or 2). Default: the last one. |
| `subQuestions` | yes | 4 to 6 items. `q` = the small question (ends with "?", at most 90 characters). `a` = its answer (at most 110 characters, core words only, Patryk's terse model-answer style). `markPoints` = optional list of the indicative-content points (numbered from 1, in the order the real mark scheme lists them; `six-mark-pick.js --show` prints the numbers) this small question earns. |
| `modelAnswer` | yes | The full answer, written FIRST, at Level 3 standard, terse, no em dashes. Each small question k owns the words between `{k}` and `{/k}`. Same tag syntax as `modelAnswerReview` and `markTheAnswers` (`04-handwriting.js` parseMarkWords). `{x}` is not allowed here. |
| `keyLabels` | no | Short labels for the colour key on slide 3 (at most 34 characters each). Left out: each small question's answer, cut to fit. |
| `homework` | no | `true` (default) records the homework follow-up (section 7). `false` for a one-off. |

**How answers map to highlights (one rule).** Small question k, its answer box, tag `{k}...{/k}` in the model
answer, and colour `MARK_HI[k-1]` / circle colour `MARK_INK[k-1]` (`04-handwriting.js`) are all the same k:
1 yellow, 2 blue, 3 pink, 4 green, 5 orange, 6 purple. A small question may own two spans if its point really is
split in the answer; each span gets the band, and the numbered circle sits at the end of each span (current
behaviour of `drawMarkHighlights`).

**How Claude writes it (authoring rule for SKILL.md).** Read the real mark scheme first (`six-mark-pick.js --show`).
Write `modelAnswer` at Level 3 from the indicative content, in order, one sentence per idea. Then cut it into the
small questions: each `a` is the content of one tagged span in plainer words, each `q` asks for exactly that.
Never add a small question whose answer is not in the mark scheme. Numbers, equations and units stay together
(the build keeps "R = V ÷ I" on one line by joining its pieces with non-breaking spaces).

---

## 3. The three slides (exact behaviour)

All three: `navBar(s, 'build')`, orange BUILD section header, `bottomBar` with the objective, house fonts and
colours. They live in `10-slides-answers.js` next to `slideModelAnswerReview` (they reuse the same handwriting and
highlight code), so no new builder part file and no change to `build.js` itself or to `skill-manifest.json`.

### Slide 1: the question (`slideSixMarkQuestion`)
- Header: `BUILD · 6-MARK QUESTION · AQA · 6 MARKS`.
- Line under the header (italic, 14pt): "Real exam question. Read it. Don't answer yet."
- Figure(s) on the left (at most half the width, never stretched; two figures stacked), the verbatim text on the
  right in a white gold-bordered box: lead-in (if any), then the 6-mark part's text, then `[6 marks]`.
  This is the existing `slideExamQuestion` layout: its figure-and-text drawing is moved into a shared helper
  `examQuestionPanel(s, eqLike, y)` used by both, with no visible change to the existing exam question slide.
- Text size by `autoFontSize`, 16pt minimum, 26pt maximum.

### Slide 2: break it down (`slideSixMarkSubs`) - mock-up 1
- Header: `BUILD · 6-MARK BREAKDOWN · BREAK THE QUESTION DOWN`.
- Slim strip: `Q` + the 6-mark text + `[6 marks]` in a white gold-bordered box, 17pt; a small thumbnail of the
  first figure on its right when the strip has room (skip the thumbnail for two figures).
- Instruction line (italic, 14pt): "Answer each small question in your book. Then put them together into the 6-mark answer."
- The grid: 2 columns. 4 small questions = 2 rows; 5 = 3 rows with the 5th on the left of row 3; 6 = 3 rows.
  Numbered ACROSS (1 2 / 3 4 / 5 6), because the click order of `addRevealAnimations` is top to bottom, then
  left to right (boxes within 0.1 inch of the same top count as one row). Every cell in a row uses the same fixed
  row height, so both answer boxes in a row start at exactly the same y and the clicks go 1, 2, 3... in order.
- Each cell:
  - question box: white fill, gold 2pt border, a 0.1 inch stripe in `MARK_HI[k-1]` down its left edge, a numbered
    circle in `MARK_INK[k-1]`, then the question (18pt, never below 16pt);
  - answer box straight under it: navy fill, gold 2pt border, answer text written in GOLD. The existing finishing
    passes then do the rest with no change: `answerYellow` turns it Y5 yellow (FFD60A) and `addRevealAnimations`
    makes the whole box appear on one click.
  - The answer box has NO coloured stripe (the mock-up shows one; in the real deck a separate stripe shape would
    sit on the slide before the click and give the box's position away). The colour link is the question's
    stripe and circle.
- If any text would need less than 16pt at this size: the build splits the grid over two slides (first half, second
  half, same header with "(1 of 2)"), never shrinks.

### Slide 3: the model answer (`slideSixMarkModel`) - mock-up 2
- Header: `BUILD · 6-MARK BREAKDOWN · THE MODEL ANSWER`.
- Left, 66% of the width: `handwritingBlock(..., modelAnswer, { ruled: true, mode: handwritingMode(L, item) })`.
  The tags give the coloured bands and numbered circles exactly as on review slides today. Size from
  `fitHandwritingFs(text, w, h, 32, 20)`: 20pt minimum for handwriting.
- Right, top (about two thirds): white gold-bordered key, title "Where each small question went", one row per small
  question: band in its colour, numbered circle, `keyLabels[k-1]` (15pt).
- Right, bottom: navy box with the real mark scheme's Level 3 wording (gold) and Level 2 wording (white),
  verbatim, taken from the library mark scheme text (section 5). Under it, small italic: "Real AQA mark scheme" and,
  only when the library's figure is a real examiner figure (`difficultyBasis === "examiner pass rate"`),
  "<passRate>% got 5-6".
- Highlights all appear at once (no clicks) unless Patryk chooses otherwise (question 1).
- Caveat is embedded: add `'sixMarkBreakdown'` to the `usesHandwriting` list in `buildPptx`.

---

## 4. Where it goes in the lesson (`14-assemble.js`)

Patryk's rule: after the practical's data and the practical's questions.

Today `slidePractical` draws: method, then the practical questions' answers slide, then the experiment MCQs, then
the MODEL DATA slide. `graphWithData` (which replaces model data) and `graphResults` are separate Build items.

Change `orderBuildItems(items)`:
1. Take the `sixMarkBreakdown` item out of the list (only the first one; a second is ignored with a CONTENT CHECK ✗).
2. Find the practical it follows: `afterPractical` (1 or 2) among the `practical` items, else the last practical.
3. Insert it after that practical, and after any `graphWithData` / `graphResults` items that come after that
   practical and before the next practical (they are its data).
4. No practical in the lesson: it goes last in Build (just before the Visualiser) and the CONTENT CHECK says so.

Then in `renderBuildSlides`: `else if (bt === 'sixMarkBreakdown') slideSixMarkBreakdown(pptx, L, b);` which draws
slides 1, 2, 3, or nothing when the item has no fetched exam data (section 9).

Resulting practical-lesson order: ... Learn → MCQ block → practical method → practical questions answers →
experiment MCQs → model data (or graph items) → **6-mark question → break it down → model answer** → rest of
Build → Visualiser → Apply → Review → exam question + mark scheme (the existing board question, always a
DIFFERENT question, section 5).

Worksheets (`16-worksheet.js`): no change needed, because `buildQuestionBlocks` already skips Build types it does
not know. Add one comment line there saying `sixMarkBreakdown` is deliberately left off (done in books), and a test
(section 8) so that stays true.

---

## 5. Fetching the real question (home only)

New file `science-lesson/references/six-mark-pick.js`. Home only, like `exam-pick.js`: NOT added to
`skill-manifest.json`, so it is never in the claude.ai package.

`fetch(item)` returns the data the slides need, or `{ error }`:
1. Split `examRef` into doc and question number; read `exam-library/docs/<doc>.json` directly (whole library, no
   topic filter, no "already used" filter: Patryk named it).
2. The part: `item.part`, else the first part with `marks === 6`. Error if missing, or if it has no mark scheme.
3. Text: `hb.clean(part.text)` (homework-booklet.js: removes the `[FIG:n]` markers, otherwise verbatim).
   `leadIn`, when given, must be found word for word (spaces normalised) in the earlier parts' cleaned text.
4. Figures: as `figures` says; paths `exam-library/figures/<file>` with width and height (`hb.imageSize`), same
   tiny-figure rule as `exam-pick.js figureInfo`.
5. Mark scheme, split from `ms.text` (these schemes keep the levels inside the text; `ms.levels` is empty for all
   five candidates below):
   - `levels`: `{ 3: "...", 2: "...", 1: "..." }` from `Level n: <words> <a>−<b>`, verbatim;
   - `points`: the indicative-content bullets, split on "•", numbered from 1 in order. Group words the export glued
     onto a bullet ("Method", "Measurements", a trailing "Level 3: ..." note) are moved off the bullet into
     `groups` / `levelNote`, never dropped or reworded.
6. Also returns `passRate`, `passBasis` (the part's `difficultyBasis`) and `examinerCommentary` (presenter notes
   for slide 3, not on the slide).

Called from `17-main.js`, beside the exam-pick call, guarded the same way (`fs.existsSync(path)` and
`!process.env.NO_EXAM_LIB`). The result is attached as `item._exam`. Fetch errors become a loud `buildWarn` and a
CONTENT CHECK ✗; the rest of the lesson still builds.

**Never the same question twice in one lesson.** `exam-pick.js pickForLesson(L, opts)` gains `opts.exclude` (a set
of library ids); `17-main.js` passes the breakdown's `examRef`, so the automatic board question and worksheet exam
question are always different. (Both already avoid levelled 6-markers, so this is a backstop.)

**Helper for Claude when writing the JSON** (same file, CLI):
- `node six-mark-pick.js --lesson lesson-content.json` lists levelled 6-mark parts that match the lesson
  (lesson-match.js, like exam-pick), not yet used by that class, "Describe a method / Plan" first, with pass rate
  and figure count.
- `node six-mark-pick.js --show "<examRef>" [--part e]` prints the verbatim text, the earlier parts (for `leadIn`),
  the numbered indicative points (for `markPoints`), the level wording and the figure files.

---

## 6. Content checks (`13-checks.js`, new `checkSixMarkBreakdown(L)`, lines in the ✓/✗ report)

✗ = the three slides are left out and the report says why; the lesson itself still builds (nothing here blocks a
lesson).

| # | Check | Result |
|---|---|---|
| 1 | At most one `sixMarkBreakdown` item | extra ones ignored, ✗ |
| 2 | Year 9-11 (AQA library). Year 7/8 and 12/13: not supported yet | ✗ |
| 3 | `examRef` found, the part exists, it is worth 6 marks and has a levelled mark scheme | ✗ if not found; ⚠ if not 6 marks or no levels |
| 4 | `leadIn` (if given) is word for word in the earlier parts | ✗ (verbatim rule) |
| 5 | 4 to 6 `subQuestions`, each with `q` and `a` | ✗ |
| 6 | `q` ≤ 90 characters and ends with "?"; `a` ≤ 110 characters; no em dashes anywhere in the item | ✗ for length (slide would go under 16pt), ✗ for em dash |
| 7 | `modelAnswer` has a `{k}` span for every k from 1 to the number of small questions, nothing above it, no `{x}` | ✗ |
| 8 | Span k shares at least one content word with answer k (so the highlight matches its small question) | ⚠ names the pair |
| 9 | `markPoints` are real point numbers; together they cover at least 4 different points | ✗ for a bad number, ⚠ under 4 |
| 10 | The model answer fits slide 3 at 20pt or more | ⚠ (cut words) |
| 11 | Not the same `examRef` as the board or worksheet exam question | ✗ (backstop to section 5) |
| 12 | The lesson has a practical | ⚠ "shown at the end of Build" |
| 13 | `keyLabels` (if given) has one label per small question, each ≤ 34 characters | ⚠ |

`checkSixMarkRule` needs no change: the breakdown uses the real levelled scheme, which that rule already exempts.

---

## 7. The homework follow-up (where it is remembered)

Patryk: it comes back later as homework, without the small questions, and the planning must remember to set it.

**The record.** New file `six-mark-followups.json` in the project root, next to `exam-usage.json` and
`exam-lesson-picks.json`:

```json
{
  "10S2": [
    { "examRef": "Physics-Electricity-Current-Potential-Difference-and-Resistance-1#Q11", "part": "a",
      "lesson": "10S2|P2 Electricity|L4", "title": "Required Practical 3 Investigating Resistance on Different Length Wire",
      "taught": "2026-11-12", "setBy": "2026-11-26", "status": "due", "setIn": null, "setOn": null }
  ]
}
```

- Written by `17-main.js` after a real home build, by the same rule as `recordUse` in exam-pick.js: not with
  `NO_UPLOAD` and not with `NO_EXAM_LOG`, so check builds never create reminders.
- One entry per class and `examRef`. A rebuild updates `title` / `taught`, never adds a second entry, and never
  resets an entry that is already `set`.
- `taught` = `meta.date` if present, else the build date. `setBy` = `taught` + the gap Patryk picks (question 2;
  14 days until he says).
- The question is also added to `exam-usage.json` under the plain class key (it has been on the board), so no
  automatic pick shows it again before the planned homework. The homework path below names it directly, so this
  does not block it.

**The planner** (Phase 2; planner code, so also with approval):
- `planner-catalogue.js` reads `six-mark-followups.json` and adds `sixMarkDue: [{ cls, id, part, title, taught,
  setBy, status, text }]` to `planner-data.json` (`text` = the start of the 6-mark part, like `long6`).
- `Planner.html`, Assessment tab, test builder: for the chosen class, every `due` follow-up is shown at the top of
  "Choose the 6-markers yourself", already ticked, labelled "From the lesson <title> (<taught>): set it without the
  small questions". It is shown even when its topic code is not in the chosen topics (the chromatography and
  latent heat questions are filed under other topics). Unticking it leaves it due.
- A reminder line on the Assessment tab: "6-mark follow-ups due: 10S2 resistance of a wire (by 26 Nov)" with a
  button that opens the builder for that class with the follow-up ticked. What the button builds depends on
  question 2.
- No change to `Code.gs`: the request travels through the existing `sendRequest` (kind `practice`) and
  `practiceRequest` already passes `--with`.

**test-paper.js** (home):
- `--with` looks the id up across the whole library, not only the chosen topics' subtopics (today it throws
  "6-mark question not usable or not found" for the chromatography and latent heat cases), and accepts the part
  syntax `doc#Q5(e)` like `--ids` already does.
- The "a table reads as a jumble" filter in `aqaQuestions` is applied to the parts actually printed, not the whole
  question (today the IR flask 6-marker is dropped because a LATER part has a table).
- The paper prints the exam question verbatim as today. The small questions are never stored anywhere the
  homework reads, so the homework is the bare 6-marker by design.
- After a real (not `--dry-run`) build, every follow-up in the paper is marked `status: "set"`, `setIn: <paper
  file name>`, `setOn: <date>`.
- `longCut` already decides whether the 6-mark part can stand alone or needs its earlier parts; that rule is kept
  (the refraction 6-marker keeps parts (a) to (c), because it says "the graph above").

---

## 8. Tests to add (`npm test` must stay green)

**Fixture.** `six-mark-test.json`: a Year 10 practical lesson (RP3 resistance of a wire) with a `practical` item
that has `questions`, `worksheetExtras.referenceData`, 6 MCQs (2 tagged `about: "practical"`), and the
`sixMarkBreakdown` item from section 2. Add it to `FIXTURES` in `test/run.js`. No `meta.outputDir`.

**In `test/run.js`** (deck and sheets of that fixture):
1. Slide order: the slides with "6-MARK QUESTION", "BREAK THE QUESTION DOWN" and "THE MODEL ANSWER" come straight
   after the "MODEL DATA" slide and before the Visualiser.
2. Slide 1 contains the verbatim library text of Q11(a) and one embedded picture.
3. Slide 2: 6 navy answer boxes, and the slide's timing XML has 6 click effects whose targets run 1 to 6 in the
   numbered order; answer text is FFD60A.
4. Slide 3: band fills in all six `MARK_HI` colours, circles "1" to "6", Caveat embedded.
5. Both worksheets: none of the small questions and not the 6-mark text.
6. `NO_EXAM_LIB=1` build (stands in for claude.ai): exits 0, none of the three slides (or the typed version, per
   question 3), and the warning text is printed.

**New `test/six-mark.test.js`** (wired into `npm test` like the other `*.test.js`):
- fetch: Q11(a) text equals the library text with `[FIG]` markers removed; 11 indicative points; Level 3 and Level 2
  wording found; the chromatography question splits into 14 points with "Method" / "Measurements" as groups;
  `leadIn` not in the library → refused.
- checks: 3 small questions → ✗; `{7}` with 6 small questions → ✗; a missing `{4}` → ✗; a 120-character answer →
  ✗; an em dash → ✗; `markPoints: [99]` → ✗.
- placement: practical + `graphWithData` → after the graph item; two practicals with `afterPractical: 1` → between
  them; no practical → last in Build.
- follow-up record: with a temporary record path (`SIXMARK_FOLLOWUPS=<tmp file>` plus `SIXMARK_RECORD=1`, test
  only), two builds of the same lesson leave ONE `due` entry; an entry already `set` stays `set`.

**`test/test-paper.test.js`:** `--with` finds the chromatography id when the topics are "C1 Atomic Structure";
`--with "...#Q5(e)"` prints only part (e); `--dry-run` never marks a follow-up `set`.

**Planner** (`planner/test-logic.js`): a class with a due follow-up gets it pre-ticked in the builder state; one
already `set` does not.

---

## 9. At school on claude.ai (no exam library)

`six-mark-pick.js` and `exam-library/` are not in the package, so `item._exam` is never filled:
- Default: the three slides are left out, the build prints one loud line ("6-mark breakdown needs the exam library:
  rebuild at home"), the CONTENT CHECK shows ✗, everything else builds. No follow-up is recorded (that file only
  exists at home), so nothing is half-remembered.
- The alternative is question 3 below (a typed version from the paper).
- SKILL.md must say: on claude.ai, only write a `sixMarkBreakdown` if Patryk asks, and tell him it shows up when the
  lesson is rebuilt at home.

---

## 10. Exactly what changes (for the build session)

| File | Change |
|---|---|
| `builder/10-slides-answers.js` | `slideSixMarkBreakdown` with its three slides (section 3) |
| `builder/12-slides-apply.js` | move the figure-plus-text drawing of `slideExamQuestion` into `examQuestionPanel`, reused by slide 1; no visible change |
| `builder/14-assemble.js` | `orderBuildItems` placement (section 4), the dispatch line, `'sixMarkBreakdown'` in `usesHandwriting` |
| `builder/13-checks.js` | `checkSixMarkBreakdown` (section 6), called from `contentCheck` |
| `builder/17-main.js` | fetch before `buildPptx`; pass `exclude` to exam-pick; write the follow-up after the build |
| `builder/16-worksheet.js` | one comment only |
| `builder/04-handwriting.js`, `05-pptx-finish.js`, `build.js`, `skill-manifest.json` | no change |
| `references/six-mark-pick.js` | NEW, home only (section 5) |
| `references/exam-pick.js` | `opts.exclude` |
| `references/test-paper.js` | `--with` library-wide + part syntax, part-aware table filter, mark follow-ups `set` |
| `references/planner-catalogue.js` | `sixMarkDue` in planner-data.json |
| `planner/Planner.html` (+ `planner/dist` rebuild) | pre-tick, reminder line and button |
| `SKILL.md` | the authoring rule (section 2), the schema line, the practical row of the slide-sequence table, the claude.ai rule (section 9) |
| `test/run.js`, `test/six-mark.test.js`, `test/test-paper.test.js`, `planner/test-logic.js`, `six-mark-test.json` | section 8 |

Then repackage the skill (`.\package-skill.ps1`) and Patryk uploads the new `science-lesson.skill`.

---

## 11. Five real candidates for lessons coming up

All five are real levelled 6-markers from `exam-library/docs`, none used yet with these classes
(`exam-usage.json` checked 2026-10-23), each tied to a practical in the class's planner sequence. Text below is the
library's own words; answers and model answers are in Patryk's terse style. Point numbers refer to the real
indicative content in the order printed.

### A. 9AS, Latent Heat Capacity Practical (P3 Particles Lesson 14, two lessons away)
- `examRef`: `Physics-Electricity-Domestic-Uses-and-Safety-1#Q5`, part `e` (the same question is also filed as
  `Physics-Particle-Model-of-Matter-Changes-of-Heat-and-Specific-Latent-Heat#Q1`; use the Domestic id, it is the
  copy test-paper.js keeps). Examiner: only 9% scored 5-6, mean 3.
- `leadIn`: "Ice forms on the windscreen at a temperature of 0 °C."  `figures`: false (the figure is the heater circuit).
- Question: "The electrical circuit was left switched on while the ice changed from a solid to a liquid and
  increased in temperature to 5 °C. Explain the changes in the arrangement and movement of the particles as the ice
  melted and the temperature increased to 5 °C."
- Points: 1 solid regular pattern · 2 liquid random · 3 solid vibrating about fixed positions · 4 liquid moving
  freely · 5 temperature constant while it melts · 6 potential energy increases while it melts · 7 particles move
  faster as water warms · 8 kinetic energy increases · 9 internal energy = total kinetic + potential.

| # | Small question | Answer | Points |
|---|---|---|---|
| 1 | How are the particles in ice arranged, and how do they move? | Regular pattern. Vibrate about fixed positions. | 1, 3 |
| 2 | How are the particles in liquid water arranged, and how do they move? | Random arrangement. Move freely past each other. | 2, 4 |
| 3 | What happens to the temperature while the ice melts? | Stays at 0 °C. | 5 |
| 4 | Where does the energy go while the ice melts? | Increases the potential energy of the particles. | 6 |
| 5 | What happens to the particles as the water warms to 5 °C? | Move faster, so their kinetic energy increases. | 7, 8 |
| 6 | What is internal energy? | Total kinetic and potential energy of all the particles. | 9 |

Model answer: "In ice {1}the particles are in a regular pattern and vibrate about fixed positions.{/1} In water
{2}they are in a random arrangement and move freely.{/2} {3}While the ice melts the temperature stays at 0 °C{/3}
because {4}the energy increases the potential energy of the particles.{/4} {5}As the water warms the particles move
faster, so their kinetic energy increases.{/5} {6}Internal energy is the total kinetic and potential energy of the
particles.{/6}"

### B. 9XS and 9AS, Mixtures and Separating Techniques Practical (C1 Atomic Structure Lesson 3; 9AS in about 8 lessons, 9XS in about 7)
- `examRef`: `Chemistry-Chemical-Analysis-Purity-formulations-and-chromatography#Q12`, part `a`. Filed under C8,
  taught in C1: the library-wide lookup in sections 5 and 7 is what makes this one work. No examiner pass rate.
- Question: "Plan an investigation to determine the Rf value for the dye in this food colouring. [Rf equation
  figure] Your plan should include the use of: • a beaker • a solvent • chromatography paper."
  `figures`: auto (the figure IS the Rf equation, so the small questions do not ask for it).
- Points: 1 pencil start line · 2 spot on start line · 3 suitable solvent · 4 solvent in beaker · 5 paper in beaker ·
  6 paper in solvent · 7 solvent below start line · 8 lid · 9 wait until solvent near top · 10 mark solvent front ·
  11 dry paper · 12 start line to centre of spot · 13 start line to solvent front · 14 use them for Rf.
  (Groups: Method 1-11, Measurements 12-14.)

| # | Small question | Answer | Points |
|---|---|---|---|
| 1 | What do you draw on the paper first, and with what? | A start line, in pencil. | 1 |
| 2 | Where does the food colouring go? | A small spot on the start line. | 2 |
| 3 | How do you set up the beaker and paper? | Solvent in the beaker. Paper dips in, solvent below the start line. | 3, 4, 5, 6, 7 |
| 4 | When do you stop, and what do you do then? | Solvent near the top. Mark the solvent front, dry the paper. | 9, 10, 11 |
| 5 | Which two distances do you measure for Rf? | Start line to centre of spot. Start line to solvent front. | 12, 13, 14 |

Model answer: "{1}Draw a start line on the chromatography paper in pencil.{/1} {2}Put a small spot of food colouring
on the start line.{/2} {3}Pour solvent into the beaker and stand the paper in it, with the solvent below the start
line.{/3} {4}When the solvent is near the top, take the paper out, mark the solvent front and let it dry.{/4}
{5}Measure the distance from the start line to the centre of the spot and to the solvent front.{/5} Divide the
first by the second to get Rf."

### C. 10S2, Reducing Heat Transfers Required Practical (P1 Energy Lesson 9, two lessons away)
- `examRef`: `Physics-Energy-Energy-transfer-in-a-system#Q12`, part `a`. Examiner: only 2% scored 6, 15% scored 4;
  some described the wrong practical.
- Question: "Describe a method the student could have used to obtain the results shown in Figure2."
  `figures`: [0, 1] (Figure 1 the can with layers of newspaper and digital thermometer, Figure 2 the graph of
  temperature decrease after 5 minutes against layers: 0, 8, 16, 24, 32).
- Points: 1 wrap N layers round the can · 2 heat water in a kettle · 3 hot water in the can · 4 measuring cylinder
  for volume · 5 initial and final temperature with the digital thermometer · 6 stopclock, 5 minutes · 7 calculate
  temperature decrease · 8 repeat with different numbers of layers · 9 repeat with no layers · 10 same starting
  temperature · 11 same volume. Level 3 needs the layers changed and one control variable.

| # | Small question | Answer | Points |
|---|---|---|---|
| 1 | What do you change, and in what steps? | Layers of newspaper: 0, 8, 16, 24, 32. | 1, 8, 9 |
| 2 | How do you get the hot water into the can? | Heat in a kettle. Measure a volume with a measuring cylinder. | 2, 3, 4 |
| 3 | What do you read at the start and the end? | Temperature on the digital thermometer. | 5 |
| 4 | How long between the readings, and how do you time it? | 5 minutes, with a stopclock. | 6 |
| 5 | What do you work out from the two readings? | Temperature decrease = start - end. | 7 |
| 6 | What do you keep the same each time? | Volume of water and starting temperature. | 10, 11 |

Model answer: "{1}Wrap 8 layers of newspaper round the can, then repeat with 0, 16, 24 and 32 layers.{/1} {2}Heat
water in a kettle and pour a measured volume into the can using a measuring cylinder.{/2} {3}Read the temperature
on the digital thermometer.{/3} {4}Start a stopclock and wait 5 minutes{/4}, then read the temperature again.
{5}Work out the temperature decrease.{/5} {6}Use the same volume of water and the same starting temperature each
time.{/6}"

### D. 10C2 and 10S2, Required Practical 3: resistance of a wire (P2 Electricity Lesson 4; 10C2 in about 5 lessons, 10S2 in about 10)
- `examRef`: `Physics-Electricity-Current-Potential-Difference-and-Resistance-1#Q11`, part `a`. Examiner: 44% scored
  5-6, mean 4. This is the worked example in section 2 and both mock-ups.
- Question: "The student plotted a graph of resistance against the length of wire. Describe a method the student
  could have used to collect the data needed to plot the graph."  `figures`: auto (the photo of the circuit with
  ruler and crocodile clips).
- Points: 1 measure length between clips with the ruler · 2 vary length by moving a clip · 3 ammeter for current ·
  4 voltmeter for p.d. · 5 resistance for each length · 6 V = IR · 7 current and p.d. for different lengths · 8
  repeat and mean · 9 remove anomalies · 10 low current to stop heating · 11 disconnect between readings.
- Small questions, answers, point numbers and model answer: section 2.
- 10C2 gets a word bank on cloze tasks; that does not touch these slides.

### E. 11S2, Reflection and Refraction (P6 Waves Lesson 7, the next lesson)
- `examRef`: `Physics-Waves-Electromagnetic-Waves-1#Q20`, part `c`. Examiner: few complete answers; many missed the
  range of angles, some described reflection.
- `leadIn`: "The ray of light from the ray box should be as narrow as possible."  `figures`: auto (the graph of
  angle of refraction against angle of incidence).
- Question: "Describe a method the student could have used to obtain the results shown in the graph above."
- Points: 1 glass block on paper · 2 draw round it · 3 ray box through the block · 4 mark ray entering · 5 mark ray
  leaving · 6 join to show the path · 7 normal at 90° · 8 protractor for angle of incidence · 9 protractor for angle
  of refraction · 10 range of angles · 11 10° steps · 12 from 10° to 70°.

| # | Small question | Answer | Points |
|---|---|---|---|
| 1 | How do you set up the glass block? | On paper. Draw round it. | 1, 2 |
| 2 | How do you record where the ray goes? | Ray box through the block. Mark the ray going in and coming out. | 3, 4, 5 |
| 3 | How do you get the ray's path inside the block? | Remove the block. Join the marks. | 6 |
| 4 | What line do you draw to measure angles from? | The normal, at 90° to the surface. | 7 |
| 5 | What do you measure, and with what? | Angle of incidence and angle of refraction, with a protractor. | 8, 9 |
| 6 | What range of angles do you use? | 10° to 70°, in 10° steps. | 10, 11, 12 |

Model answer: "{1}Put the glass block on paper and draw round it.{/1} {2}Shine a ray from the ray box into the block
and mark the ray going in and coming out.{/2} {3}Remove the block and join the marks.{/3} {4}Draw the normal at 90°
to the surface where the ray enters.{/4} {5}Measure the angle of incidence and the angle of refraction with a
protractor.{/5} {6}Repeat for angles of incidence from 10° to 70° in 10° steps.{/6}"
- Homework note: this 6-marker says "the graph above", so the homework keeps parts (a) to (c) (10 marks).

**Backups found:** 10C2/10S2 I-V of a filament lamp (`...Current-Potential-Difference-and-Resistance-1#Q15`(a),
14% scored 5-6; needs negative readings for Level 3); 11S2 IR emission flask hypothesis
(`Physics-Waves-Black-Body-Radiation#Q4`(b), for Required Practical Absorbancy and Emittance; usable for homework only
after the part-aware table fix in section 7); 10C2/10S2 resistance with risk assessment (`...-1#Q40`(b), but its
opening sentence was lost in the export, so it reads oddly on its own).

---

## 12. Three questions for Patryk before it is built

1. **Highlights on the model answer slide:** all colours showing at once (simplest, as in mock-up 2), or one
   colour appearing per click, 1 to 6, so you can talk through each part?
2. **When and how it comes back as homework:** how many days after the lesson (14 is pencilled in), and as what:
   pre-ticked inside the next exam practice homework, or its own one-question homework (a printed sheet plus a
   Form with the real mark scheme shown after submitting)?
3. **At school on claude.ai, where there is no exam library:** leave the three slides out and add them when the
   lesson is rebuilt at home (the current plan), or let Claude type the 6-marker from a photo of the paper you give
   it, building the slides without the library figure and without the homework reminder?
