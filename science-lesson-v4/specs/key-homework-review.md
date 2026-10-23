# Spec: key homework review inside a normal lesson

Status: SPEC ONLY, nothing built. Written 2026-10-23 from Patryk's answer of the same day
(memory note `project_rituals_answers_2026_10_23.md`, "FUTURE BUILD"), joined to his follow-up
task idea of 2026-10-15 (`project_follow_up_tasks_2026_10_15.md`). Building it touches the
builder and the planner, so it needs Plan Mode and Patryk's approval first (CLAUDE.md rule).

---

## 1. In plain English (for Patryk)

**What it is.** Each class gets its key homework on its test review lesson. You mark it within
about a week. Once you have ticked it as marked, the class's NEXT normal lesson opens with a
short **key homework review**, straight after the Do Now answers and the objectives, before the
rest of the lesson. It works like a test review, only smaller:
1. **Model answers** for the homework's questions, in handwriting, with the real mark scheme
   beside them and one highlight per mark (exactly like the test review slides).
2. **Purple pen:** pupils correct the questions they lost marks on, on their own homework.
3. **Follow-up task:** "1" for pupils who need to improve (a textbook question, page given) and
   "2" for pupils who did well (a real exam question on the same topic, word for word).
Then the normal lesson carries on (Engage, Learn and so on).

**What starts it.** Only your tick. The planner already has a "Mark as marked" tick for key
homework on the Homework tab (Ulhu's Rituals will use the same tick). When it is ticked, the
build request for that class's next normal lesson gets one extra line: "Key homework back: add
the review section". No tick, no section. You can untick the line on the lesson card if you
do not want it that lesson.

**What you get.** The same three files as any normal lesson. The slides carry the review; the
worksheet only gets a small follow-up box if it still fits on 4 pages.

**What changes behind the scenes, in phases (when you approve):**
- Phase 1: the slides (reusing the test review slides, with small changes so they say "Key
  homework Question 3" instead of "Core paper").
- Phase 2: the worksheet follow-up box and the 4-page rule.
- Phase 3: the planner remembers WHEN you ticked "marked" and adds the line to the next lesson's
  build request.
- Phase 4: the instructions Claude follows (SKILL.md / review-lessons.md) and the skill package.

---

## 2. Where it sits in the lesson

Standard, practical and annotation lessons only (never review, revision, test or whiteboard
lessons; the check in section 6 warns and skips it there).

| # | slide | made by |
|---|---|---|
| 1 | Title / Do Now | unchanged |
| 2 | Do Now answers | unchanged |
| 3 | Objectives | unchanged |
| 4 | **KEY HOMEWORK BACK** banner: the homework title and the 3 steps (answers, purple pen, follow-up) | new, small |
| 5 | **Model answers**: one slide per question part worth 2+ marks | existing `slideModelAnswerReview` |
| 6 | **Quick answers**: 1-mark parts, up to 6 a slide | existing `slideAnswerList` |
| 7 | **PURPLE PEN · CORRECT YOUR KEY HOMEWORK** | existing `slideEbiTask`, made to take a heading |
| 8 | **Follow-up task**: 1 Improve / 2 Extend | new, reuses the Extension layout |
| 9 | Follow-up answers (on click) | reuses `slideExtensionAnswers` layout |
| 10+ | Engage, Learn, Build, Visualiser, Apply ... | unchanged |

**Size cap:** about 15 to 20 minutes. At most 4 model answer slides and 2 quick-answer slides.
If the homework has more, Claude picks the parts worth the most marks (see question 1).

---

## 3. The content Claude writes (lesson JSON)

One new optional top-level key, `keyHomeworkReview`. A lesson without it builds exactly as now.

```json
"keyHomeworkReview": {
  "title": "P1 Energy key homework",
  "homeworkId": "10C2-2026-11-04-1",
  "snippetDir": "khw-snippets/P1-energy",
  "items": [
    { "type": "modelAnswerReview", "hwq": "3(b)", "marks": 3,
      "question": "Explain why ...", "modelAnswer": "{1}...{/1} {2}...{/2} {3}...{/3}",
      "indicativeContent": [{ "text": "...", "mark": 1 }, { "text": "...", "mark": 2 }, { "text": "...", "mark": 3 }] },
    { "type": "answerList", "heading": "KEY HOMEWORK Q1 · QUICK ANSWERS",
      "rows": [{ "q": "Q1(a) Name the store ...", "a": "kinetic", "qn": "1(a)" }] }
  ],
  "purplePen": {
    "steps": ["Find the questions you lost marks on", "Correct them in purple pen using the model answers",
              "Use the support page", "Finished? Go to the follow-up task"],
    "rows": [{ "q": "Q3", "task": "Redo 3(b) using the energy store words", "pages": "p. 84" }]
  },
  "followUp": {
    "improve": { "task": "Activate 2, page 84, questions 1 to 3", "pages": "p. 84", "answers": ["...", "...", "..."] },
    "extend":  { "subtopic": "Energy stores", "pages": "p. 84",
                 "questions": [{ "q": "<real exam question, verbatim>", "a": "...", "marks": 3, "ref": "AQA 8463 1H Nov 2021 Q2.3" }] }
  }
}
```

Rules (the same as test review lessons in `review-lessons.md`):
- **Source:** Claude reads the key homework and its mark scheme from
  `Admin\Homework\...` on Drive (read only, never moved or edited). The planner's Homework row
  gives the title and link.
- **Model answers:** full sentences; the mark-scheme panel word for word from the school's mark
  scheme; one highlight per mark, `{1}` to `{N}`, never fewer. Never invented.
- **Pictures of the real question:** `snippetDir` = a folder made by `paper-snippets.py` from a
  PDF COPY of the homework (home only). At school: no snippets, the typed `question` is used.
- **Page numbers only** in every `pages` field ("p. 84").
- `purplePen.rows` is optional: key homework has no front-cover task grid, so most of the time
  the slide shows the 4 steps only. `steps` falls back to the 4 above.
- `followUp.improve`: KS3 = Activate (textbook-index.js), KS4 = CGP once the CGP page index
  exists; until then the textbook pages the lesson already uses. Activate has no answers in the
  back, so `answers` are shown on the answers slide.
- `followUp.extend`: real exam questions only, picked with `extension-pick.js`, never written
  by Claude. Year 12/13: OCR questions only, never AQA.

---

## 4. Which builder parts change

No change to how any existing lesson looks. Each change below is guarded by "only when
`keyHomeworkReview` is present".

| part | change |
|---|---|
| `10-slides-answers.js` | `qLabel(item)`: an item with `hwq` reads "Key homework Question 3(b)". `snippetFor`: take the folder from `keyHomeworkReview.snippetDir` for these items (it looks at `meta.snippetDir` today). |
| `12-slides-apply.js` | `slideEbiTask(pptx, L, t, opts)`: take the table and a heading as arguments (default = today's `L.ebiTask` and "PURPLE PEN · CORRECT 3 EBIs", so review lessons are unchanged), and draw the steps alone when there are no rows. `extensionCols` split so it can read any list, not only `L.extension`. New `slideKhwBanner`, `slideKhwFollowUp`, `slideKhwFollowUpAnswers`, and `buildKeyHomeworkReview(pptx, L)` that calls them in the order of section 2. The quick-answer slides keep the purple-pen bar (this is not a whole-paper review). |
| `14-assemble.js` | standard / practical / annotation / unknown branches: `buildKeyHomeworkReview(pptx, L)` straight after `slideObjectives`, before `slideEngage`. `usesHandwriting` also looks inside `keyHomeworkReview.items` so the Caveat font is embedded. |
| `13-checks.js` | new `checkKeyHomeworkReview(L)` (section 6). |
| `16-worksheet.js` | the follow-up box (section 5), only when `L._khwOnSheet`. |
| `17-main.js` | the page-count step for the box (section 5). |
| `slide-options-v4.md`, `review-lessons.md`, SKILL.md | a short authoring section; run `package-skill.ps1` after. |

---

## 5. The worksheet (4-page limit)

- Pupils correct ON their returned homework in purple pen, and do the follow-up in their books,
  so the review needs no worksheet space. The model answers stay on the slides only. No answer
  sheet: the lesson keeps its three files (pptx, worksheet, support worksheet).
- **Optional follow-up box** at the very end of both sheets: "KEY HOMEWORK FOLLOW-UP", then
  "1 Improve: Activate 2, page 84, questions 1 to 3" and "2 Extend: E1 <the exam question>
  [3 marks]", no answer lines (answered in books).
- **4-page rule (home):** built like the worksheet exam question (`17-main.js` step 3a): build
  both sheets with the box, ask `page-count.js`; if either is over 4 pages, rebuild without it
  and log "[khw] follow-up box left off: it would push the sheet past 4 pages". The box is the
  FIRST thing dropped, before the exam question, the GUESS table and the KEYS box, because the
  lesson's own content matters more and the box is already on the slides.
- **At school** (no page counter): the box is left off.

---

## 6. Content checks (`checkKeyHomeworkReview`, lines in the build report)

- Section on a review / revision / test / whiteboard lesson: warn "key homework review is for
  normal lessons; left out" and skip it.
- Every `modelAnswerReview` worth N marks has N highlights and N scheme points with `mark`.
- Every item has `hwq` (or `qn` on answer rows).
- `followUp.extend` questions each have `a` and `ref`; `improve` has `task` and `pages`.
- More than 4 model answers or 2 quick-answer slides: warn "the section runs over 20 minutes".
- No `homeworkId`: warn (the planner cannot link it back).

---

## 7. How the condition is detected (planner and Rituals)

Today: `markHomework(k, id, on)` in `planner/Code.gs` sets the Homework tab row's `status` to
"marked" (key homework rows have `kind` "key", made by `setLinkHomework_`). It does not record
WHEN, and `pushState_` does not send homework rows home.

Changes:
1. **Code.gs:** the Homework tab gets a `markedOn` column (added at the end of `HW_HEAD`, so old
   rows still read). `markHomework` writes today's date when ticked, clears it when unticked.
2. **Code.gs `pushState_`:** adds `keyHomework: [{ id, cls, title, file, setOn, dueOn, status,
   markedOn }]` (key rows only) to `planner-state.json`, so home can see it too.
3. **logic.js `buildPrompt`:** for a class's FIRST normal lesson dated after `markedOn` (kind
   "lesson", not a review, revision or test slot), add: "Key homework back: <title> (marked
   <date>, homework id <id>). Add the key homework review section after the Do Now
   (review-lessons.md)." The lesson card shows a "Key homework back" tag with a tick, ticked by
   default; unticking it moves the line to the next lesson. Once that lesson is built with the
   section, the line stops (the build log records `homeworkId`).
4. **Ulhu's Rituals:** the "Mark 8XP key homework" ritual's tick calls the same `markHomework`,
   so one tick in either place starts the chain (`replica/design/rituals-tasksetter.md` 4b).
5. **Timing check:** set on the test review lesson, marked within about a week, so the section
   normally lands about a week after the review lesson, as Patryk described.

---

## 8. Tests (`npm test` must stay green)

- **New fixture** `key-homework-review-test.json` (a standard Year 10 lesson with one 3-mark
  model answer, one answer list, steps-only purple pen and both follow-ups), listed in
  `FIXTURES` in `test/run.js`. Asserts: 3 files; the deck contains "KEY HOMEWORK BACK", "Key
  homework Question 3(b)" and "PURPLE PEN"; the banner slide comes before the Engage slide;
  Caveat is embedded; no banned XML.
- **Unchanged decks:** every existing fixture keeps its slide count (no section, no change), and
  the review fixture still says "PURPLE PEN · CORRECT 3 EBIs".
- **Checks:** a model answer with 2 highlights for 3 marks warns; the section on a review lesson
  warns and is skipped.
- **Worksheet:** with `NO_PAGECOUNT=1` (the harness) the box is left off; a unit test of the
  decision (over 4 pages, box dropped first) with a fake page counter.
- **Planner (`planner/test-logic.js`):** the build line appears only for a `key` row with status
  "marked", only on the first normal lesson after `markedOn`, never on a review lesson, and not
  after unticking. `markHomework` writes and clears `markedOn` (`test-homework-quiz.js`).

---

## 9. Three questions for Patryk before it is built

1. **Which questions get a model answer?** Default: every part worth 2+ marks, at most 4 slides,
   the biggest first. Or would you rather type the 2 or 3 most-missed questions when you tick
   "marked" (one small box), so the section covers exactly what went wrong?
2. **If the next lesson is already built when you tick "marked"**, should Claude rebuild it with
   the section, or should the section go to the lesson after? (Default: the lesson after.)
3. **Handing back:** do pupils get their marked homework back at the start of that lesson (so
   they have it for purple pen), and is 15 to 20 minutes about right for the whole section?
