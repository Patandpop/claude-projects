---
name: science-lesson
description: "Creates lesson PowerPoints and worksheets for science lessons (physics, chemistry, biology). Use when asked to make a lesson, presentation, slide deck, PowerPoint, worksheet, booklet, or revision resource for any science topic or class. Always trigger for: 'make a lesson on', 'create a worksheet for', 'build slides for', 'lesson for 7MLA', 'lesson for 8XP', 'lesson for 8AG', 'lesson for 9AS', 'lesson for 9XS', 'lesson for 10C2', 'lesson for 10S2', 'lesson for 11S2', 'lesson for 12C', 'lesson for 13D', or any science topic paired with a teaching request. Also trigger for standalone worksheet requests: 'make me a Type C exam paper for 10S2', 'revision worksheet on forces'."
---

# Science Lesson Skill — v2

**Read only what this lesson needs** (the rest of the skill stays closed):
- Every build: this file + `references/slide-options-v4.md` + `references/worksheet-spec.md` (+ `references/mcq-rules.md` when writing MCQs).
- **Revision, test, test review or review lesson** (`lessonType` revision / test / review): read `references/review-lessons.md` first.
- **Source PPTX/DOCX uploaded, a video lesson (Learn H), a practical that may need two lessons, or "combine lessons"**: read `references/special-lessons.md`.
- **A build looks wrong, or Patryk asks how the builder draws something** (nav bar, colours, borders, animations, file names, fonts): `references/builder-behaviour.md`. The builder does all of that by itself; you never set it.

## HARD RULES — no exceptions

**Slides**
- **Practical/Build slides expecting apparatus (circuits, equipment setups) MUST have an image placeholder** — steps in the left ~56%, placeholder on the right.
- No emojis. No timers. No AO1/AO2. No "Mixed Ability" written on slides.
- **No em dashes in any generated content** — slides, worksheets, answers, model text (Patryk's rule, 2026-07-02: "refrain from using them across everything"). Use a comma, a full stop, or a hyphen instead. Keep generated prose lean — less is more; Patryk adds the more.
- Never abbreviate questions — full text on: Do Now slide, Do Now Answers (verbatim), Apply slide, Review (verbatim).
- **Exactly 6 Do Now questions** (Patryk ruling 2026-07-09 — replaces the old "min 4"). All retrieval from PREVIOUSLY-TAUGHT content, never the current lesson.
- **Calculation Do Nows get new numbers, same words (Patryk 2026-10-15).** Home builds with `doNow.auto` do this by themselves (do-now-vary.js; only when the mark scheme's one-step working checks out; real values like g = 9.8 N/kg or ice's 334 000 J/kg never change; the exam library is never changed). When you WRITE a Do Now calculation that revisits an earlier lesson or exam question, use different numbers and work the answer out again; keep the wording. `"varyNumbers": false` on `doNow` keeps the original numbers.
- Answers = core info only, 1–3 lines. Teacher elaborates.
- Image placeholders on any slide expecting an image.
- **No squished text.** If a Learn or Engage slide's content would render below ~12pt or visibly cramped, split it across two slides or cut content — never let the renderer shrink it into illegibility. Prefer `boxes` (navyHeaderBox stacks) on Learn-A over a single body string.
- **The renderer auto-shrinks (`fit: 'shrink'`) — this is the enemy, not a safety net.** When content overflows a box, PowerPoint silently drops the font, which is the "tiny text" failure. The renderer is frozen, so the fix is upstream: never hand a box more text than fits at its intended size. Hard content caps (enforce before building):
  - **Apply question: ≤ 140 characters per question** in the 3-column layout. Over that → move detail to the worksheet/booklet, or use a 2-question split, or Variant B (full-width Mastering). Never let a 3rd long question ride into a shrink.
  - **Review answer: ≤ 160 characters.** Longer → trim to core marking points; the teacher elaborates aloud.
  - **Engage instruction step: ≤ 100 characters, max 4 steps.** Longer or more → cut, don't cram.
  - **Do Now question: ≤ 120 characters.** Retrieval questions are short by nature.
  - If any text would render below **16pt on a slide** (classroom minimum; projector standard is 18pt), that is a build failure — split the slide or cut content. Verify at QA by eye on every Apply and Review slide.

**CONTENT CHECK — the build prints a ✓/✗ report on every lesson; author so every line is ✓**
The renderer validates each lesson loudly (never blocks): Do Now exactly 6 · MCQ count exactly 6 · Apply ≥3 per tier · Review mirrors EVERY Apply question per tier · every image slot has imageDescription or an embedded image · at least one image somewhere (empty image bank = extraction was probably skipped) · Drive meta complete (year/subject/macrotopic/lessonNumber/title — missing meta = never uploads, never reaches lesson-log) · cloze only on standard/practical. Fix the JSON until the report is clean BEFORE handing files over. `meta.macrotopic` must be the EXACT Drive folder name (e.g. "P4 Earth in Space", not "Space") or the upload will fail.

**Content volume & source fidelity**
- **Mastering includes at least one SCENARIO question** (2026-10-03): an unfamiliar context the pupil has not seen in the lesson, where they must apply the idea (e.g. a new device, a real situation, a data set). Write these yourself for KS3 and A-level. (The old "student first names in Apply" idea is dropped.)
- **Real exam questions are added automatically at home, never authored** (2026-10-03): for Year 9-11 Biology, Chemistry and Physics, a home build adds an "Exam question" slide and a "Mark scheme" slide after Apply, using a real AQA question (verbatim) chosen for the lesson. When the worksheet still fits 4 pages, a different exam question is also added under Mastering with no answer lines (answered in books). Do not write exam questions into the JSON yourself, and never write an `examQuestion` key (not even null: it switches the automatic question off); set `meta.examQuestion: false` only if Patryk asks for a lesson without one. Year 12/13 (OCR) get none on the slides yet: their OCR questions are used for homework quizzes and exam practice papers at home. They never get AQA questions.
- **Up to TWO experiments per lesson** (Patryk 2026-10-12) when the lesson needs them (e.g. reflection, then refraction). Each is its own `type: "practical"` Build item with its own `heading`; the worksheet gives each one its own section. The second experiment's results table goes in `results` on its practical item (the first keeps `worksheetExtras.results`). Never more than two.
- **Always build exactly 6 MCQs, as ONE block** (Patryk 2026-10-03, replaces the old 4-scattered rule: scattered MCQs make the lesson feel disjointed). Learning MCQs come straight after the Learn section, before the rest of Build. An MCQ about the experiment gets `"about": "practical"` and is shown right after the practical method slide (and its answers), before the data. The renderer does the ordering itself, so list them anywhere in `build`; just tag the experiment ones. Never fewer than 6.
- **Writing MCQs: follow `references/mcq-rules.md`** (2026-10-10, drawn from 2,745 real AQA and OCR questions).
- **Equation lessons follow I do → we do → you do:** Learn-F equation intro → `guessExample` worked example (1–2 slides) → `practiceTriangle` independent practice. This is the default sequence whenever a new equation is introduced.
- **Source material is a floor to EXTEND, not just preserve** (confirmed 2026-07-02): beyond porting every question/table/scaffold, actively add genuine depth — historical context, the "why this mattered" layer, connections to the bigger picture — woven into the same slides. Pre-build checklist question: "what's the one thing in this topic that makes it click, that isn't in the source material yet?"
- **Apply: minimum 3 questions per tier** unless Patryk says otherwise. One question per tier is never enough.
- **Apply slide = separate gold-bordered box per question (Variant A), three tiers across, questions stacking down.** Each question is its own box with a `"Q1 / Q2 / Q3"` label under a full-width tier header. This is the default and what Patryk means by "multiple boxes". The single-unified-column look (all of a tier's questions crammed into one tall box) is the failure mode he dislikes — never produce it. Use Variant B (full-width Mastering row) only when one Mastering question is genuinely long (>140 chars). The naming is now consistent between SKILL.md and slide-options-v4.md — do not reintroduce a "default to C" instruction.
- **Review: DO NOT AUTHOR IT (2026-07-12).** The review slides are a verbatim copy of the Apply questions and answers, and build.js now makes that copy itself. **Omit the `review` field entirely** on standard/practical lessons — just make sure every Apply question carries its `a` answer (an answerless Apply question drops off the review slides, and the CONTENT CHECK flags it). Writing a review section out by hand is wasted output; if one IS authored (special case), it must mirror every Apply question per tier, verbatim. Review-TYPE lessons (`lessonType: "review"`) are unaffected — their structure is in `references/review-lessons.md`.
- **When Patryk uploads an existing resource to work from, it is a floor, not a suggestion.** Port EVERY question, every table, every scaffold, and mark every image/diagram position with a placeholder. Adapt the format to the house style — never reduce the content. If something genuinely can't fit, ask before cutting.
- Worksheets must carry the full lesson: Do Now (with word bank/gap-fill recall for support versions), the experiment section (diagram box + results table + conclusion questions) for practical lessons, and the full Apply set. A worksheet with one question per tier is bland and wrong.

**Box and space economy (Patryk's confirmed preferences)**
- **Content boxes on Learn slides are NOT the default.** Use `navyHeaderBox` stacks only when a section genuinely needs a labelled header (e.g. definition box, equation box). Plain body text without a box is fine for examples, values tables, or brief notes — boxes waste vertical space and students are writing in their books not the slide.
- **Key terms strip at the bottom of Learn slides: omit unless the term list adds real value.** If keywords are already embedded in the slide content, the strip is redundant.
- **Worksheets — answer boxes:** Only add `answerBox()` where there is a genuine mark allocation AND no writing space already exists. Gap-fill questions already have blanks — never add an answer box beneath a gap-fill. Calculation questions get `answerBox(marks)` by default. **GUESS rule (2026-10-03):** a GUESS row appears ONLY when the question sets `"guess": true`, ONLY in Year 9+ (never Year 7/8 — they don't know the structure), and at most ONE per worksheet (the renderer enforces all three). Use it sparingly, on the one calculation where the structure genuinely helps.
- **Students write in their books by default.** Worksheets should not duplicate what students record in their books. Do Now on the worksheet = questions only (no boxes). Learn section = never on the worksheet (students write core info in books during teacher explanation). Build on the worksheet = MCQ letter choice + Your Turn working space only.
- **Review/improvement booklets: NO answer boxes by default.** Students answer in their exercise books — this is what made the earlier improvement lessons better. Only add writing space to a review booklet if Patryk explicitly asks for it. A booklet whose instruction says "answer in your book" must not also contain answer boxes; that contradiction is a build failure.
- **Title/Do Now slide bans (review and standard lessons alike):** no school name anywhere on the slide; no seating/equipment bullet list ("sit in your seat", "pencil case out", etc.); no subject badges (Chemistry/Physics/Biology pills) on Do Now question rows; no timer ("5 minutes", "30:00") on any slide. Do Now question rows are min 0.9" tall so the question text is never cramped.
- **Instruction / protocol boxes are white-filled with a gold 2pt border** — never filled with the slide background colour (they vanish), and never preceded by a scene-setting sentence ("Here is how to get the most out of this lesson"). One sentence per step, four steps max.

**Writing rules (anti-AI-voice) — enforced, not optional**
- **No em dashes (—) anywhere.** Hard ban. Rewrite using a comma, colon, or new sentence. Wrong: "The enzyme — a biological catalyst — speeds up reactions." Right: "The enzyme is a biological catalyst. It speeds up reactions."
- **Banned words/phrases:** "Let's explore", "delve", "It's important to note", "In this lesson we will", "fascinating", "dive into", "crucial", "key takeaway", "essentially", "in order to", "it is worth noting". Flag and replace any occurrence.
- **No scene-setting openers** on instruction slides. Never "Here is how to...", "Welcome to...", "In today's lesson...". Start with the first actual instruction.
- **No exclamation marks** outside the Engage slide.
- **Never write a sentence or question in BLOCK CAPITALS** (harder to read). Short header labels are fine.
- **Science teacher voice:** direct, plain UK English. Write as you'd say it in class. "Name two factors that affect enzyme activity." not "Students are invited to consider which factors might influence enzyme activity." Short sentences. No hedging.
- Objectives written as plain teacher voice: "Calculate resultant force from a free-body diagram", not "Students will be able to understand...".

**Lesson quality rules (Patryk 2026-10-19, from research + 5 mock-up rounds; full record: specs/lesson-quality-learn-images-engage-mcq.md "FINAL DECISIONS")**
- **Keep the meaning, say it plainly.** Name the thing, say what it does, cut any claim that it is important. Sentences at most 15 words (KS3), 20 (KS4), 25 (KS5). One name per idea: never swap in a synonym for a key term.
- **About 40 words of text per Learn slide.** The slide shows, Patryk explains. Put the extra explanation, history, quotes and word origins in `notes` (speaker notes). The build warns above 45 words and when one idea is split over two Learn slides.
- **Key words:** wrap the key term in `{k}…{/k}` the first time it appears on a slide (bold, gold underline). At most 3 per slide. Works in any slide text; worksheets show it as plain bold.
- **Every hook is a real question the lesson answers** (see engage-library.md bank). Never a silly question with an obvious answer ("is your hair a virus?"). A lesson problem is posed as a QUESTION pupils can attempt, never a statement. If no good hook fits, leave Engage out.
- **Exam definitions use the board's own words.** At home run `node science-lesson/references/exam-definition.js "term"` (add `--board OCR` for 12C/13D), read the hits (it can return a near miss), and put the wording in `examDefinition` with `{1}…{/1}` round each mark-earning part and the count in `asked`. On claude.ai (no library) leave `asked` out. The plain explanation goes in `notes`.
- **Misconceptions:** when pupils commonly believe something wrong, add `misconception: {wrong, right}` to the Learn slide ("Not quite" crossed out → "Actually"). Keep it to one per slide.
- **Objectives slide:** the build adds it after the Do Now answers. `title.knownWords` = words an EARLIER lesson taught, each with a full definition (check lesson-log / earlier lesson files; if unsure, leave the word out). `title.keywords` not in knownWords show as this lesson's words, with no definition. Put `{k}` round the key terms in `title.objectives`. Review, revision and test lessons: don't author an "Engage = objectives" slide any more; leave `engage` out and the build makes the objectives slide.
- **"This lesson" (always on the objectives slide, Patryk 2026-10-23):** write `title.sequence: { "learn": "...", "build": "...", "apply": "..." }`: what pupils will DO in each part, from the objectives and this lesson's real activities. One line each, under about 12 words, as a plain instruction in Patryk's voice: "Note down the key terms, then compare animal and plant cells." / "Do the experiment: looking at onion cells." / "Carousel: collect information from the sheets around the room." / "Quick questions to check you've got it." / "Use what you've learnt on the worksheet questions." Name the real activity (experiment, carousel = information sheets round the room, whole-class check). Never hype words ("explore", "discover", "journey", "dive into", "unlock"). A line left out is filled in from the lesson.
- **Word parts (Learn slides, Patryk 2026-10-23):** for a key word built from roots pupils will meet again, add `definition.parts` and `definition.sum` on the Learn item where the word is taught: polymer = `[{part:"poly",means:"many"},{part:"mer",means:"part"}]`, sum "a chain of many parts". Real roots only (poly-, mono-, photo-, -synthesis, thermo-, endo-, exo-, -lysis, iso-, hydro-, -cyte, chloro-, chroma-, -graphy); never invent parts for a word that doesn't split. Shown under the definition line (not on a Learn item that has `examDefinition`).
- **Pictures:** `embeddedImagePath` only embeds with `"imageConfidence": "search"`; any other value builds a grey box (the build now warns).
- **Pressure is P** (P = F ÷ A) in Patryk's lessons.
- **Answers on navy are Y5 yellow** (FFD60A), set by the build automatically; never hand-colour answers.
- All calculation questions use physically realistic values (a 1200 kg car, a 60 W bulb — never a 10 kg car or a 3 m tall person).
- **Backup/model data values must be clean round numbers to 2-3 sig figs.** No noise-like values (4.21, 8.38, 12.61). Use clean multiples like 4.20, 8.40, 12.60 or 4, 8, 12. Values that look like measurement noise destroy credibility. Applies to `worksheetExtras.referenceData.rows`.
- Apply questions are tagged `"qType": "concept" | "calculation" | "practical_design" | "extended_writing"`. Tier mix: Developing ≥1 concept; Mastering ≥1 calculation (KS4) or extended reasoning (KS3).
- **`qType: "practical_design"`** — use on any question asking students to plan/design an investigation. Auto-triggers a method scaffold on the support worksheet (prompt checklist above free lines: setup, what to change, what to measure, what to keep same). Pair with `contentType: "new_procedure"`.
- **`contentType: "extended_writing"` + marks ≥ 5** — auto-triggers an explanation scaffold on the support worksheet (prompts above free lines: what changes, why it happens, what it means). Use on any Mastering or high-mark question requiring a written explanation. Both scaffolds fire for ALL tiers on the support worksheet (Developing, Reaching, Mastering) — scaffolding covers the whole support sheet, not just Developing tier.
- **Do Now support scaffolds — type-specific rules (support worksheet only). Never write "Hint:" as a label. Never write "Think about...". Never add a scaffold to every question — only where the type below specifies one:**

  | Question type | Scaffold |
  |---|---|
  | Definition | Gap fill — blank key terms, give first letter of each blank: *"Osmosis is the movement of w_______ molecules from a h_______ to a l_______ concentration."* |
  | Simple recall / naming | First letter(s) of each answer: *"S_______, l_______, g_______"* |
  | Fact recall (answer is the answer) | Nothing |
  | True/false | Nothing |
  | Spot the error | Nothing |
  | Sequence/order | List items out of order with commas — appears on **both** worksheets, no extra support scaffold |
  | Calculation | Equation only, no label: *"v = f × λ"* |
  | Explain mechanism | Gap fill — blank the mechanism words, first letter if the term is obscure |
  | Describe multi-step | Key words list: *"Key words: osmosis, root hair cell, concentration"* |
  | Compare / difference | Completed unfinished sentence, no ellipsis: *"Speed only tells us how fast something is moving, whereas velocity also tells us _______."* |
  | Complex apply / predict | Short contextual note only if writable in language the year group already knows — otherwise nothing |
  | Etymology | Context note under a real science question — never a standalone question |
- Do not add a `commonError` field to any question — it has been removed from the renderer.

**Support sheet helps (Patryk 2026-10-23, tested with him on 20 real questions).** For each Apply question, decide what would stop a support pupil STARTING, and give it at most ONE help. Use the first rule that fits. "None" is a normal answer. Helps print on the support sheet only. The standard sheet and slides are unchanged.

| # | when | help (field on the Apply question) |
|---|---|---|
| 1 | calculation | none new (equation + units hint as now) |
| 2 | short answer (name, state, give, define, complete, sort, order), or draw / sketch | **none** (the word bank covers recall; drawings go in books) |
| 3 | weighing up ("evaluate", "advantages and disadvantages", "argue", "A or B?") | `weighUp: { options: ["Gas", "Nuclear"], sides?: ["For","Against"], choice?: true }`. Add `choice` only if the question asks for one. |
| 4 | comparing two things ("compare", "one similarity and one difference") | `compare: { things: ["Plant","Animal"], rows: ["How it reproduces"], similarity?: true }` |
| 5 | the answer hinges on an idea the question does NOT already point at | `prompt`: a guiding QUESTION, in the question's own context, that points at the idea without giving it. Model: "Which MRS GREN processes can fire NOT carry out?" Don't use one when the context already shows the purpose (the camel's wide feet on sand needs none). |
| 6 | written, 4+ marks (describe, explain, plan, design) | `steps`: 2-4 starters → "Step 1 ... Step n". If the question lists its own parts, follow them. |
| 7 | written, 2-3 marks | `steps`: 2-3 linked starters |
| 8 | the wording hides the ask (two instructions in one sentence, "but not", "each") | `supportQ`: a plain rewrite. Split it into short sentences; the build puts each on its own line and bolds every command word. Use it only when it clearly reads easier, and never as numbered fragments. |

- **Starters (`steps`):**
  - Write the model answer `a` FIRST, as full sentences in order. Each starter is the exact opening words of one of its sentences.
  - Open each sentence with a neutral lead-in that holds no mark point: "As the universe cooled, ...", not "Electrons combined with nuclei, so ...". Leave at least 2 words to write.
  - The review slide then shows `a` one sentence per line, so support pupils see their own sentences completed.
  - Example:
    - `a`: "First, use a magnet to remove the iron. Add water and stir, so the salt dissolves. Filter to remove the sand. Distil the salt water to collect the water; the salt is left behind."
    - `steps`: ["First, use a magnet to", "Add water and stir, so", "Filter to", "Distil the salt water to"]
- **Rewrite (`supportQ`):**
  - Keep the same command words, every number and unit, every key word, and most of the content words.
  - No sentence over 15 words, and not much longer than the original.
  - Example: "A magnet separates iron from an iron and sulfur mixture, but not from iron sulfide. Explain why." → "Explain why a magnet separates iron from an iron and sulfur mixture. Then explain why it cannot separate iron from iron sulfide."
- **The build checks every help.** A failing one is not printed (the plain question is), and the CONTENT CHECK names it. The build also prints which help each question got: `[support] reaching Q1: supportQ · ...`.
- **What the build adds by itself on the support sheet:**
  - A **KEYS** box above APPLY: the key words the Apply questions actually use, with the lesson's own meanings from `definition`, `definitions` and `title.knownWords`, plus each calculation's equation with its symbols and units from Learn F `components`. It leaves out the words in the write-in KEY WORDS table. Don't write key facts for it.
  - If a sheet runs over 4 pages, the GUESS table is left off first, then KEYS.
- The practical intro box on the worksheet drops a first sentence that only repeats the experiment title, so don't write intros that restate the title.

**Build architecture**
- **Renderer is frozen.** All rendering lives in `references/build.js`. Claude NEVER rewrites renderer functions. Per build, Claude writes ONLY `lesson-content.json` (an array of 1–N lesson objects matching the schema below), then runs `node references/build.js lesson-content.json`.
- Multi-lesson batching = more objects in the JSON array. Same run. build.js wraps each lesson in try/catch so one bad lesson never kills the batch.
- Build once. If overflow: cut per priority in worksheet-spec.md. Never resize fonts.

---

## Content object schema — authoritative. Never invent fields.

```json
{
  "meta": {
    "class": "10S2",
    "topic": "Resultant forces",
    "title": "Resultant Forces and Free-Body Diagrams",
    "lessonType": "standard",
    "theme": "physics",
    "worksheet": "A",
    "differentiation": "none | split",
    "abilityLabel": "mixed_ability | higher_ability (optional — filename label)",
    "annotation": false,
    "year": 10,
    "subject": "Physics",
    "macrotopic": "Forces",
    "lessonNumber": 3,
    "textbookRef": "optional — override the auto textbook match (see below)",
    "uncapLearn": false
  },
// meta.uncapLearn: standard/practical lessons normally cap the Learn section at 4 slides.
// Set true ONLY when a lesson genuinely needs a longer gallery of Learn slides (e.g. one
// image per item — phases of the Moon, one slide per phase). Default false keeps the 4-cap.
  "title": { "objectives": ["..."], "keywords": ["..."] },
  // Lesson quality A: "knownWords": [{ "term": "particle", "definition": "a tiny piece of matter..." }] (earlier lessons only)

// TEXTBOOK REFERENCES (automatic) — the Apply slide + Apply worksheet section show
// "Read more — [book] pp. X–Y" in dark blue + gold, top-right of the Apply title.
// The book/pages are AUTO-MATCHED from meta year+subject(or theme)+topic and
// title.keywords against references/textbook-index.md (Kerboodle GCSE Bio/Chem/Phys
// for KS4, Activate 1 & 2 for KS3). No confident match → nothing shown (normal for
// KS3 topics that don't line up with Activate). CGP is not indexed; KS4 books stand in.
// Override with meta.textbookRef: "B3.4" | ["B3.4","B3.5"] | {"book":"…","pages":"42-44"} | "none".
// Test-review lessons: each subtopic's bookRef is auto-filled the same way (shown on every
// subheading + the intro-slide chips). Order sheet: 1 set for a normal matched lesson,
// 2 sets for a test-review, none for practicals/tests/unmatched.
  "doNow": {
    "variant": "A",
    "questions": [ { "q": "...", "a": "...", "marks": 1, "hint": "support worksheet scaffold — content depends on question type (see Do Now scaffold rules above). Gap fill text, first letters, equation, key words list, or short contextual note. Never the string 'Hint:'. Never 'Think about...'. Omit entirely for true/false, spot-the-error, and fact recall questions." } ],
    "keywords": ["optional — overrides title.keywords as the source for the support worksheet keywords box"],
    "specPoints": ["optional — spec reference strings shown in presenter notes on the Do Now slide only. Use for spec codes or statements the Do Now is testing (e.g. 'AQA P5.1 — alternating current'). Never shown to students."]
  },
  "engage": { "...": "see slide-options-v4.md ENGAGE" },
  "learn": [

// MATH MINI-SYNTAX ({a/b}, ^, _, sqrt, \greek, \times ...) in any string field: slide-options-v4.md "MATH NOTATION".

    { "variant": "A", "heading": "...", "boxes": [ { "header": "...", "items": ["..."] } ], "keywords": ["..."], "imagePlaceholder": true, "imageDescription": "diagram of lock and key enzyme model with active site and substrate labelled", "annotationZone": false },
    // Learn (any variant): "notes": "what Patryk says (speaker notes)". Learn A also takes: "definition": {term, text, origin, examples[], notExamples[]},
    //   "examDefinition": {term, wording with {1}..{/1}, board, asked}, "misconception": {wrong, right}. See slide-options-v4.md.
    { "variant": "B", "heading": "...", "definitions": [ { "term": "Osmosis", "definition": "The net movement of water molecules from a high water concentration to a low water concentration through a partially permeable membrane." } ], "below": "content+image|image|two-column|none", "boxes": [ { "header": "...", "items": ["..."] } ] },
    // Learn E, F, G, H, I: field lists in slide-options-v4.md.
    { "variant": "J", "heading": "...", "axes": { "x": "Force (N)", "y": "Extension (cm)" }, "features": [ { "label": "Linear region", "description": "Extension proportional to force — obeys Hooke's Law" } ], "instruction": "Sketch the graph and label these features." },
    { "variant": "K", "heading": "...", "events": [ { "year": "1803", "label": "Dalton", "detail": "Solid sphere model" }, { "year": "1911", "label": "Rutherford", "detail": "Nuclear model" } ] }
  ],
  "build": [
    // mcq, workedExample, errorAnalysis, graphInterpret, misconception, predictThenCheck and more: field lists in slide-options-v4.md.
    { "type": "practical", "intro": "...", "worksheetIntro": false, "steps": ["..."], "equipment": ["beaker", "thermometer", "..."], "warning": "...", "imagePlaceholder": true, "questions": [ { "q": "...", "a": "..." } ] },
    { "type": "guessExample", "topic": "...", "given": "...", "unknown": "...", "equation": "...", "equationSymbols": { "top": "...", "bottom": ["...", "..."] }, "substitute": "...", "solve": "..." },
    { "type": "practiceTriangle", "questions": [ { "q": "...", "a": "...", "marks": 2 } ], "equation": "...", "equationSymbols": { "top": "...", "bottom": ["...", "...", "..."] } },
    { "type": "sort", "...": "see slide-options-v4.md" },
    { "type": "trueFalse", "heading": "COMMON MISCONCEPTIONS", "statements": [ { "text": "...", "isTrue": true }, { "text": "...", "isTrue": false, "correction": "..." } ] }
  ],
  "apply": {
    "developing": [ { "q": "...", "a": "...", "marks": 2, "qType": "concept", "commonError": "...", "diagram": true,
                      "contentType": "new_procedure | known_procedure | extended_writing | routine_recall",
                      "subSteps": ["optional — lettered sub-questions on support worksheet only"] } ],
    "reaching":   [ { "q": "...", "a": "...", "marks": 3, "qType": "calculation" } ],
    "mastering":  [ { "q": "...", "a": "...", "marks": 6, "qType": "extended_writing",
                      "contentType": "extended_writing" } ]
  },
// "review": OMIT on standard/practical lessons — build.js copies Apply Q&A onto the
// review slides itself (2026-07-12). Only author it for a special case, and then it
// must mirror every Apply question per tier.
  "worksheetExtras": { "wordBank": ["..."], "results": { "headers": ["Point","Current (A)"], "rows": 6 },
    "collectionTable": { "title": "PLANET DATA", "instruction": "Use the data cards to complete the table.", "headers": ["Planet","Day length","Temp"], "rows": [["Mercury","",""],["Venus","",""]] } },
// worksheetExtras.collectionTable: a student data-collection grid on the standard worksheet
// for NON-practical lessons (research-from-laminates / data-card tasks — planets, recycling).
// `rows` is a number (all-blank writing rows) OR an array of row arrays; a prefilled first cell
// becomes a fixed row label and the empty cells become writing space. Renders after the Build
// section. (Practical lessons keep using `results` inside the experiment section.)
  "image_dump": {
    "images": [
      { "path": "/mnt/user-data/outputs/img_1.png", "label": "Engage" },
      { "path": "/mnt/user-data/outputs/img_2.png", "label": "Learn A" },
      { "path": "/mnt/user-data/outputs/img_3.png", "label": "unassigned" }
    ]
  }
}
```

Notes on key fields:
- **`equationSymbols` (formula triangle):** Full rules in slide-options-v4.md.
- `learn[].boxes` is the preferred Learn-A form (navy-header boxes stacking rules/key info) — much better than a flat `body` string, which renders plain.
- `apply[].diagram: true` (or a string label) emits a framed diagram box on the worksheet under that question — use for any question that refers to a circuit/diagram. `diagramLines` controls the box height.
- `build practical` slides get an apparatus image placeholder automatically; set `imagePlaceholder: false` only if there genuinely is no apparatus. `equipment: ["..."]` lists apparatus items — rendered as a labelled amber-tinted section on the slide.
- `build trueFalse` accepts an optional `heading` field (e.g. `"heading": "COMMON MISCONCEPTIONS"`) — use this instead of `type: "misconception"` for any activity presenting statements to evaluate. The slide header and answer slide header both use the heading value.

Field names are fixed. If a slide type needs something not in the schema, check slide-options-v4.md; if still absent, ask — do not invent.

---

## Reference files — read on demand

| File | When to read |
|---|---|
| `references/slide-options-v4.md` | Step 2 — every PPTX build |
| `references/worksheet-spec.md` | Step 2 — every DOCX build |
| `references/engage-library.md` | When picking an Engage mechanism — six-mechanism table, examples, and the no-repeat-consecutive-lessons rule (tag each Engage with `engageType` 1–6) |
| `references/review-lessons.md` | Revision, test, test review and review lessons (opening, slide order, model answers, EBIs, Extension, booklet, answer sheet) |
| `references/special-lessons.md` | Uploaded source PPTX/DOCX (image extraction), Learn H video lessons, practical sequences over two lessons, combined lessons |
| `references/builder-behaviour.md` | Only when a build looks wrong: what the builder draws by itself (house style, file names, fonts, animations) |
| `references/build.js` | Never read it: it is frozen. Its top comment has the CLI usage and a map of the `references/builder/` parts. |
| `references/sol-log.md` (if present) | Step 1 — derive prior-lesson context |
| `references/aqa-spec-extract.md` (if present) | Step 2 — align objectives + keywords to spec points |
| `references/textbook-index.md` | When mapping lessons to textbook pages or adding "read more" references for students (Y7/Y8 = Activate 1+2; Y9 = Activate 2 + Kerboodle; Y10/Y11 = Kerboodle only) |
| `/mnt/skills/public/pptx/SKILL.md` | Non-standard PPTX layouts only |
| `/mnt/skills/public/docx/SKILL.md` | Non-standard DOCX layouts only |

---

## Class Profiles

2026/27 classes (September 2026 to July 2027). Build only the subjects Patryk teaches each class; the other teacher's subject is theirs.

| Class | Year | Course / exam | Patryk teaches | Word bank | Notes |
|---|---|---|---|---|---|
| 7MLA | 7 | KS3 | All science (sole teacher) | Yes: support sheet + cloze | Lean heavy on support: word bank + sentence starters |
| 8XP | 8 | KS3 | Biology + Physics (Ms Sole: Chemistry) | Yes: word bank on cloze | Full scaffolding |
| 8AG | 8 | KS3 | Biology, then Physics (Mr Hollis: Chemistry) | Yes: word bank on cloze | Once a week |
| 9AS | 9 | AQA (GCSE starts) | Physics + Chemistry (Ms Milland: Biology) | Not decided: ask Patryk | Low-demand AQA questions on taught topics only |
| 9XS | 9 | AQA (GCSE starts) | All science (sole teacher) | Not decided: ask Patryk | Low-demand AQA questions on taught topics only |
| 10C2 | 10 | AQA Combined Science | Physics + Chemistry | Yes: support sheet + cloze | Needs extra support |
| 10S2 | 10 | AQA Separate (triple) | Physics only | **No** | Higher; 6-marker if practical |
| 11S2 | 11 | AQA Separate (triple) | Physics only | **No** | Exam year |
| 12C | 12 | OCR A Physics | Half the content (shared) | **No** | DOUBLE lessons. OCR only, never AQA questions. Calculation-heavy, equation hints only |
| 13D | 13 | OCR A Physics | Half the content (shared) | **No** | OCR only, never AQA questions. Exam year |

**Switching the word bank off:** for a **No** class set `"worksheetExtras": { "wordBank": [] }`. An empty list stops the automatic word bank (otherwise the support sheet builds one from `title.keywords`). For a **Yes** class give `worksheetExtras.wordBank` and, with a cloze, `clozeWordBank`. **Word bank rule (Patryk 2026-10-23):** at least 5 words, and at least 2 more words than the gaps they serve. The extras must be believable wrong answers from the same topic (e.g. "condensation" in a separation lesson). The build prints every bank in alphabetical order, never the answer order, and warns when a bank is too small.

Homework: 10C2, 10S2, 11S2 = long-term exam-question booklets; 12C and 13D = every lesson (end-of-subsection textbook questions); KS3 not decided. PSHE-9AB is not science. (7BYA, 8AB, 9AB, 12D, 10C4 and 11C3 in older files are no longer his classes.)

The support sheet is the same content with scaffolding added automatically across ALL tiers (word bank where tier-appropriate, the one GUESS row where a Year 9+ question sets `guess: true`, equation/units hint line, Do Now `hint` lines + keywords box, sentence starters, key-word definition table, practical design prompt checklist, explanation prompt chain). `differentiation: "split"` / `meta.abilityLabel` only set the filename label — they never change whether the support sheet is produced. Identical titles, identical layout family — never visibly "the easy sheet".

**Learn variant selection guide (choose the one that fits the content):**
- A: Key info in boxes (definitions, key facts, labelled sections)
- B: **Keywords band** — full-width teal bar listing key terms (underlined) + definitions. Optional below section (image, info boxes, or none). Use when the lesson turns on a set of defined terms students must use in exam answers.
- C: Revision table (Core/Challenge paper map)
- D: Image copy (diagram to reproduce)
- E: Comparison table (two concepts side by side)
- F: Equation callout (formula + components + rearrangements + worked example)
- G: Flow/sequence (ordered steps or cause-effect chain — rock cycle, digestion, cardiac cycle, etc.). Max 6 steps. Layout auto-selects zigzag/W-pattern by step count (3: diagonal; 4: Z-pattern 2×2; 5: X-pattern; 6: 2×3 snake). 1–2 steps render horizontal.
- H: Video (linked video + while-watching prompts + questions on the worksheet). Use when a mid-lesson video is the primary learning activity.
- I: **Flowchart** — vertical (default) or horizontal step nodes with → / ↓ arrows. Supports cycle annotation. Use for processes with a clear order: digestive system, water cycle, neural pathway. Max 6 nodes.
- J: **Graph sketch** — image/axes placeholder left, annotated feature list right. Use when the learning objective is to read or sketch a graph (Hooke's Law, V-I characteristics, distance-time, etc.).
- K: **Timeline** — horizontal line with alternating above/below event boxes. Use for history of science, evolution of models, geological time, etc. Max 8 events.
- L: **Labelled picture** (dual coding, Patryk's top priority): the picture carries the explanation. Labels down both sides, each joined by a line that ends exactly on its part. By default it is BUILT one part at a time (one slide per label: current part ringed in yellow with its sentence open, others grey) and ends with an all-labels slide to copy; it counts as ONE Learn item. Use for anything pupils must recognise or name the parts of (cells, organs, apparatus, the eye, a circuit, a wave). Schema and the point-checking rule: slide-options-v4.md "LEARN L". Picture sources, in order: the school's own slides (at home: `node science-lesson/references/image-library.js "<lesson folder under Lessons>"`, then look at its sheet.png once), then a diagram Claude draws with `references/diagram_gen.py` (particle boxes, atom models). A photo + model pair (shared labels pointing at both) when pupils will see the real thing. Never web or AI images.

Learn G has no worksheet output (students annotate in books). Learn I/J/K have no dedicated worksheet output — pair with a worksheet question set as needed.

---

## Workflow

**1 — Prior context.** Patryk states prior lesson context verbally in chat (topic covered, Do Now questions used). Prefer, in order: (a) verbal statement in chat, (b) `references/sol-log.md`. Never ask for a PPTX upload for prior-context purposes. PPTX uploads ARE the source material when Patryk is basing the new lesson on a previous one — in that case treat the upload as the content floor (see Content volume & source fidelity).
**2 — Clarify:** class · topic · title · lesson type · worksheet needed. Read both reference files.
**3 — Build directly (standard).** Text plan first only if 6+ custom questions or unusual structure.
**3a — Source PPTX or DOCX uploaded:** extract and match its images before writing the JSON (steps in `references/special-lessons.md`). No upload: skip.
**4 — Write `lesson-content.json` only** (array, 1–N lessons) → run `node references/build.js lesson-content.json` → 3 files out per lesson (PPTX + worksheet + support worksheet; review lessons swap the support worksheet for a model-answer sheet).
**5 — QA:** convert to images. ALWAYS check: Title, Do Now, every Apply, every Review, any annotationZone slide. Sample 1-in-3 of the rest. Check specifically for squished/cramped text on Engage and Learn. Fix visible defects. One cycle only.
**6 — `present_files`.**
**7 — Handoff (ONLY if Patryk asks).** Do not emit a next-lesson brief by default. If Patryk asks for one ("give me the brief" / "what should next lesson's do now be"), output 4 suggested retrieval Do Now questions spanning this + prior topics, plus a one-line `sol-log.md` entry if that file exists.
**Logging:** When Patryk says "log it", "log that", or similar — use the `lesson-backlog` skill to append an entry to the running backlog artifact. Do not modify this file (SKILL.md). Do not write to any output file. The backlog artifact lives in chat; Patryk copies it home at the end of the day by saying "copy for Claude Code".

---

## Lesson type → slide sequence

| Type | Sequence |
|---|---|
| standard | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → MCQ block ×6 → Build (workedExample / errorAnalysis / graphInterpret / trueFalse as topic demands) → Visualiser → Apply → Review×3 |
| revision | Title → DoNow → DoNow Answers → **Engage (learning objectives)** → per concept: **Learn → CHECK (3 quick questions, answers on click)**, usually ×4 → Whiteboard QA rounds (if authored) → Apply → Review×3. See `references/review-lessons.md` (Test-cycle lessons). |
| test | Title/DoNow (`doNow.task`: "Look over your notes in your book", no questions) → Engage (learning objectives). PPTX only, no worksheets. |
| practical | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → Build practical (1–2) → Build Q&A → Visualiser → Apply → Review×3 |
| whiteboard | Title → DoNow → DoNow Answers → Whiteboard QA rounds → Apply → Review×3 |
| review | Title/DoNow (combined) → DoNow Answers (purple pen) → Learn (all — typically Learn-C 3-col; **no cap**, Bug 55) → Build items if authored (`markTheAnswers` / `modelAnswerReview`) → Visualiser → Apply (booklet instructions by tier) → Review — Developing/Reaching/Mastering. **Engage (learning objectives) after the Do Now answers when authored (2026-10-14).** Output: PPTX + review booklet DOCX + **model-answer sheet** (`_answers.docx`) — no support worksheet. See `references/review-lessons.md` (Review lesson specification, Answer sheet). |
| annotation | As standard, but `meta.annotation: true` → Learn slides and one workedExample slide include an `annotationZone` (5.5"×4" blank panel, dashed gold border, "worked live" label). Use for calculation-heavy lessons taught with the drawing tablet. After the lesson: slideshow ink → "Keep ink annotations" → export annotated PDF → post to Classroom. |

Slide-type selection guidance: use `trueFalse` with `"heading": "COMMON MISCONCEPTIONS"` whenever the topic has a canonical wrong belief (heavier falls faster, current gets used up, cold flows in) — write statements that may be true or false, students evaluate each; workedExample→yourTurn for any new calculation; errorAnalysis in the lesson AFTER a calculation is introduced; graphInterpret mandatory at least once per motion/electricity/waves topic. (`type: "misconception"` still exists in the renderer but is not recommended — the standalone 3-box layout is less effective than a trueFalse evaluation activity.)

---

## Do Now hints — rule reinforcement

`hint` on a Do Now question is **optional**. Default is no hint. Add one only where a nudge genuinely helps a lower-attaining student who might be completely stuck.

**Never add a hint to:**
- Definition questions — the hint gives the answer away
- Questions where a chemical equation is near-complete — the equation IS the scaffold
- Any question where a competent student would find it patronising

**When a hint IS included:** it must nudge toward correct thinking without giving the answer away. One short sentence.

---

## Image placeholders — description rule

Every `imagePlaceholder` description (via `imageDescription` field or `description` arg) must be **specific enough to paste into Google Images and find a useful result**.

Good: `"distillation apparatus with condenser, flask, and collecting beaker"`
Good: `"Bohr model of oxygen atom with electron shells labelled"`
Bad: `"image to describe the slide"` — never use generic descriptions

Applies to all Engage, Learn, and Build practical image placeholders.

---

## Known Bugs and fixes

The bug-fix history (Bugs 1 to 61, dates, code notes) lives at home in
`references/backlog.md` and is deliberately NOT shipped in this skill: it is
developer history with no bearing on authoring a lesson. If a build looks wrong,
describe the problem plainly to Patryk so Claude Code can fix build.js at home.
Never try to edit build.js from a school session.

---

## Do Now: automatic at home

Home builds can fill the Do Now by themselves: `"doNow": { "auto": true }` with no questions picks six from what the class has covered (spaced retrieval plus one question from last year's content). On claude.ai, or whenever you write the Do Now yourself, write six as normal: backwards-looking, mostly recall, never previewing today. A Do Now written into the lesson is always used as written.

