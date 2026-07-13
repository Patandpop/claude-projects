---
name: science-lesson
description: "Creates lesson PowerPoints and worksheets for science lessons (physics, chemistry, biology). Use when asked to make a lesson, presentation, slide deck, PowerPoint, worksheet, booklet, or revision resource for any science topic or class. Always trigger for: 'make a lesson on', 'create a worksheet for', 'build slides for', 'lesson for 7BYA', 'lesson for 7MLA', 'lesson for 8AB', 'lesson for 8XP', 'lesson for 9AB', 'lesson for 10S2', 'lesson for 12D', or any science topic paired with a teaching request. Also trigger for standalone worksheet requests: 'make me a Type C exam paper for 10S2', 'revision worksheet on forces'."
---

# Science Lesson Skill — v2

## HARD RULES — no exceptions

**Slides**
- Nav bar = horizontal TOP strip, 6 tabs. Never a sidebar. Never on the right.
- **LAYOUT_WIDE = 13.33" × 7.5". Always define `var SW = 13.33; var SH = 7.5;` at top of script. Never hardcode `w: 10` — use `SW` everywhere. Full-width shapes: `w: SW`. Nav tabs: `SW / 6` each.**
- **Tier badges (Developing/Reaching/Mastering) on Apply slide = FULL-WIDTH column headers (not pills). Width = `colW`. Pills are DOCX-only.**
- **All content box gold borders: `line: { color: 'FABB2E', width: 2 }` (2pt = 25400 EMU). Never width 3 or 1.**
- **Visualiser slide is MANDATORY in standard and practical lessons. Never omit. The IPEVO link `https://apps.ipevo.com/pwa/visualizer.app/` is baked into the renderer — never output "[teacher inserts]".**
- **Do Now question numbers = gold rounded SQUARES with navy numbers. Never circles.**
- **Title slide left column: big title (26–32pt), then Learning Objectives in a bordered box (navy `#152347` fill, gold border, 14–15pt), then Key Words in a matching bordered box (13pt). No school name anywhere in the left column.**
- **MCQ = ONE slide.** Question + 4 coloured options + protocol strip + answer box at the bottom of the SAME slide. Patryk adds the entrance animation to the answer box himself in PowerPoint for the 3-2-1 reveal. Never a separate answer slide.
- **Practical/Build slides expecting apparatus (circuits, equipment setups) MUST have an image placeholder** — steps in the left ~56%, placeholder on the right.
- No emojis. No timers. No AO1/AO2. No "Mixed Ability" written on slides.
- **No em dashes in any generated content** — slides, worksheets, answers, model text (Patryk's rule, 2026-07-02: "refrain from using them across everything"). Use a comma, a full stop, or a hyphen instead. Keep generated prose lean — less is more; Patryk adds the more.
- No class name in worksheet titles.
- Never abbreviate questions — full text on: Do Now slide, Do Now Answers (verbatim), Apply slide, Review (verbatim).
- **Exactly 6 Do Now questions** (Patryk ruling 2026-07-09 — replaces the old "min 4"). All retrieval from PREVIOUSLY-TAUGHT content, never the current lesson.
- One MCQ per Build slide.
- Purple pen bar on every Do Now Answers + every Review slide.
- Answers = core info only, 1–3 lines. Teacher elaborates.
- Theme colour on nav tab + header bar + bottom bar ONLY. Content box bodies = white fill + gold `#FABB2E` border. Exception: misconception callout body uses amber border `#E65100`; MCQ option cells keep their light tint of the badge colour (confirmed liked).
- MCQ colours: A=pink, B=blue, C=green, D=yellow (see slide-options-v4.md).
- Review tab/title = green `#1B5E20`. Never grey.
- Combine fill + text into one shape. No stacked rect + text box.
- Image placeholders on any slide expecting an image.
- **No squished text.** If a Learn or Engage slide's content would render below ~12pt or visibly cramped, split it across two slides or cut content — never let the renderer shrink it into illegibility. Prefer `boxes` (navyHeaderBox stacks) on Learn-A over a single body string.
- **The renderer auto-shrinks (`fit: 'shrink'`) — this is the enemy, not a safety net.** When content overflows a box, PowerPoint silently drops the font, which is the "tiny text" failure. The renderer is frozen, so the fix is upstream: never hand a box more text than fits at its intended size. Hard content caps (enforce before building):
  - **Apply question: ≤ 140 characters per question** in the 3-column layout. Over that → move detail to the worksheet/booklet, or use a 2-question split, or Variant B (full-width Mastering). Never let a 3rd long question ride into a shrink.
  - **Review answer: ≤ 160 characters.** Longer → trim to core marking points; the teacher elaborates aloud.
  - **Engage instruction step: ≤ 100 characters, max 4 steps.** Longer or more → cut, don't cram.
  - **Do Now question: ≤ 120 characters.** Retrieval questions are short by nature.
  - If any text would render below **16pt on a slide** (classroom minimum; projector standard is 18pt), that is a build failure — split the slide or cut content. Verify at QA by eye on every Apply and Review slide.

**File naming (renderer-enforced)**
- PPTX: `[topic]_[ability_label].pptx` — e.g. `parallel_circuits_mixed_ability.pptx`. NO class code, NO date in any filename. `differentiation: "split"` defaults the label to `mixed_ability`; override with `meta.abilityLabel` (e.g. "higher_ability").
- Worksheets: `[base]_worksheet.docx` (standard) and `[base]_support_worksheet.docx` (support — built for EVERY standard lesson). Review lessons build `[base]_answers.docx` (model-answer sheet) in the support slot instead. NEVER name worksheets "developing", "reaching", or "scaffolded" — students see filenames.

**Classroom routine elements (baked into slides — never omit)**
- Every Build MCQ slide: protocol strip — `THINK (silent) → DECIDE → SHOW on 3-2-1` — sits between the options and the answer box on the single MCQ slide.
- Every Do Now slide: silent-entry footer — `Silent start · pen out · attempt all questions`.

**CONTENT CHECK — the build prints a ✓/✗ report on every lesson; author so every line is ✓**
The renderer validates each lesson loudly (never blocks): Do Now exactly 6 · MCQ count exactly 4 · Apply ≥3 per tier · Review mirrors EVERY Apply question per tier · every image slot has imageDescription or an embedded image · at least one image somewhere (empty image bank = extraction was probably skipped) · Drive meta complete (year/subject/macrotopic/lessonNumber/title — missing meta = never uploads, never reaches lesson-log) · cloze only on standard/practical. Fix the JSON until the report is clean BEFORE handing files over. `meta.macrotopic` must be the EXACT Drive folder name (e.g. "P4 Earth in Space", not "Space") or the upload will fail.

The final slide of every deck is the **IMAGE BANK** (kept, not deleted): it self-assembles from every embedded image + generated graphs + `image_dump.images`. Timeline (Learn-K) events may each carry `imageDescription`/`embeddedImagePath` — the image renders opposite the event box.

**Content volume & source fidelity**
- **Always build exactly 4 MCQs, each positioned AFTER the Learn content it tests** (confirmed standing rule 2026-07-02). Never fewer even if Patryk may not use all four live; never place an MCQ before or disconnected from the content it checks.
- **Equation lessons follow I do → we do → you do:** Learn-F equation intro → `guessExample` worked example (1–2 slides) → `practiceTriangle` independent practice. This is the default sequence whenever a new equation is introduced.
- **Source material is a floor to EXTEND, not just preserve** (confirmed 2026-07-02): beyond porting every question/table/scaffold, actively add genuine depth — historical context, the "why this mattered" layer, connections to the bigger picture — woven into the same slides. Pre-build checklist question: "what's the one thing in this topic that makes it click, that isn't in the source material yet?"
- **Apply: minimum 3 questions per tier** unless Patryk says otherwise. One question per tier is never enough.
- **Apply slide = separate gold-bordered box per question (Variant A), three tiers across, questions stacking down.** Each question is its own box with a `"Q1 / Q2 / Q3"` label under a full-width tier header. This is the default and what Patryk means by "multiple boxes". The single-unified-column look (all of a tier's questions crammed into one tall box) is the failure mode he dislikes — never produce it. Use Variant B (full-width Mastering row) only when one Mastering question is genuinely long (>140 chars). The naming is now consistent between SKILL.md and slide-options-v4.md — do not reintroduce a "default to C" instruction.
- **Review: DO NOT AUTHOR IT (2026-07-12).** The review slides are a verbatim copy of the Apply questions and answers, and build.js now makes that copy itself. **Omit the `review` field entirely** on standard/practical lessons — just make sure every Apply question carries its `a` answer (an answerless Apply question drops off the review slides, and the CONTENT CHECK flags it). Writing a review section out by hand is wasted output; if one IS authored (special case), it must mirror every Apply question per tier, verbatim. Review-TYPE lessons (`lessonType: "review"`) are unaffected — their structure is its own section below.
- **When Patryk uploads an existing resource to work from, it is a floor, not a suggestion.** Port EVERY question, every table, every scaffold, and mark every image/diagram position with a placeholder. Adapt the format to the house style — never reduce the content. If something genuinely can't fit, ask before cutting.
- Worksheets must carry the full lesson: Do Now (with word bank/gap-fill recall for support versions), the experiment section (diagram box + results table + conclusion questions) for practical lessons, and the full Apply set. A worksheet with one question per tier is bland and wrong.

**Box and space economy (Patryk's confirmed preferences)**
- **Content boxes on Learn slides are NOT the default.** Use `navyHeaderBox` stacks only when a section genuinely needs a labelled header (e.g. definition box, equation box). Plain body text without a box is fine for examples, values tables, or brief notes — boxes waste vertical space and students are writing in their books not the slide.
- **Key terms strip at the bottom of Learn slides: omit unless the term list adds real value.** If keywords are already embedded in the slide content, the strip is redundant.
- **Worksheets — answer boxes:** Only add `answerBox()` where there is a genuine mark allocation AND no writing space already exists. Gap-fill questions already have blanks — never add an answer box beneath a gap-fill. Calculation questions get `guessScaffold()` or `answerBox(marks)` as appropriate, not both.
- **Students write in their books by default.** Worksheets should not duplicate what students record in their books. Do Now on the worksheet = questions only (no boxes). Learn section = never on the worksheet (students write core info in books during teacher explanation). Build on the worksheet = MCQ letter choice + Your Turn working space only.
- **Review/improvement booklets: NO answer boxes by default.** Students answer in their exercise books — this is what made the earlier improvement lessons better. Only add writing space to a review booklet if Patryk explicitly asks for it. A booklet whose instruction says "answer in your book" must not also contain answer boxes; that contradiction is a build failure.
- **Title/Do Now slide bans (review and standard lessons alike):** no school name anywhere on the slide; no seating/equipment bullet list ("sit in your seat", "pencil case out", etc.); no subject badges (Chemistry/Physics/Biology pills) on Do Now question rows; no timer ("5 minutes", "30:00") on any slide. Do Now question rows are min 0.9" tall so the question text is never cramped.
- **Instruction / protocol boxes are white-filled with a gold 2pt border** — never filled with the slide background colour (they vanish), and never preceded by a scene-setting sentence ("Here is how to get the most out of this lesson"). One sentence per step, four steps max.

**Writing rules (anti-AI-voice) — enforced, not optional**
- **No em dashes (—) anywhere.** Hard ban. Rewrite using a comma, colon, or new sentence. Wrong: "The enzyme — a biological catalyst — speeds up reactions." Right: "The enzyme is a biological catalyst. It speeds up reactions."
- **Banned words/phrases:** "Let's explore", "delve", "It's important to note", "In this lesson we will", "fascinating", "dive into", "crucial", "key takeaway", "essentially", "in order to", "it is worth noting". Flag and replace any occurrence.
- **No scene-setting openers** on instruction slides. Never "Here is how to...", "Welcome to...", "In today's lesson...". Start with the first actual instruction.
- **No exclamation marks** outside the Engage slide.
- **Science teacher voice:** direct, plain UK English. Write as you'd say it in class. "Name two factors that affect enzyme activity." not "Students are invited to consider which factors might influence enzyme activity." Short sentences. No hedging.
- Objectives written as plain teacher voice: "Calculate resultant force from a free-body diagram", not "Students will be able to understand...".
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

**Accessibility & readability (BDA / WCAG-aligned — applies to every resource)**
- **Print fonts are sans-serif.** The British Dyslexia Association and accessibility guidance recommend sans-serif for readers with dyslexia/visual stress because serifs interfere with letter recognition. Slides already use Trebuchet MS (BDA-approved). **Worksheets currently use Libre Baskerville (serif) — this is the one house-style choice that works against accessibility.** Default new worksheets to a sans-serif on the BDA list (Trebuchet, Verdana, Tahoma, Open Sans) unless Patryk has confirmed he wants the serif look for a specific resource. If keeping Libre Baskerville, treat it as a deliberate exception, not the default.
- **Body text ≥ 11pt on worksheets** (BDA recommends 12–14pt; 11pt is the floor for dense GCSE sheets). Never below. Headings ≥ 20% larger than body.
- **Left-align all body text, ragged right — never justify.** Justification creates uneven "rivers" of space that disrupt tracking.
- **Line length 60–75 characters.** Long lines across the full 10106 DXA width at small font exceed this and hurt readability — raise the font or narrow the column rather than run 90-character lines.
- **Line spacing 1.5** on worksheet body (BDA preferred) — set `line: 360` not `240` on question paragraphs.
- **Never rely on colour alone** to carry meaning. Tier badges already pair colour with a text label (Developing/Reaching/Mastering) — keep that pairing always, so a colour-blind reader still gets the tier. Avoid pure green-on-red adjacency for any colour-coded distinction.
- **No long stretches of BLOCK CAPITALS** in body text (harder to read). Short header bars in caps (DO NOW, APPLY, PART 1) are fine; never set a sentence or question in all caps.

**Build architecture**
- No animation injection. `present_files` only.
- **Output is portable.** `build.js` writes to the dir passed as the 2nd CLI arg, else `/mnt/user-data/outputs` if it exists, else cwd. It contains NO hardcoded Drive or Windows paths — this keeps the skill identical whether it runs on claude.ai (school) or Claude Code (home). Drive upload, if wanted, is done OUTSIDE build.js (a separate step/wrapper), never inside the frozen renderer.
- **Where this runs (two environments, one skill file):** claude.ai (e.g. school) runs the uploaded `.skill` in a Linux sandbox — build here, then `present_files` so files can be downloaded. Claude Code (home PC) runs the same skill against local files and can additionally copy outputs to Google Drive afterwards. The skill on claude.ai goes stale only if local files change at home and the new `.skill` isn't re-uploaded — so re-package and re-upload at the end of any session that edits the skill.
- Standard/practical/revision lessons always produce THREE files: `[base].pptx` + `[base]_worksheet.docx` + `[base]_support_worksheet.docx`. Review lessons (`lessonType: "review"`) also produce THREE files, but the third is a **model-answer sheet**: `[base].pptx` + `[base]_worksheet.docx` (the booklet) + `[base]_answers.docx` (see **Answer sheet** section). Review lessons never build a support worksheet — the answer sheet takes that slot. `differentiation: "split"` / `meta.abilityLabel` only change the filename label.
- **Renderer is frozen.** All rendering lives in `references/build.js`. Claude NEVER rewrites renderer functions. Per build, Claude writes ONLY `lesson-content.json` (an array of 1–N lesson objects matching the schema below), then runs `node references/build.js lesson-content.json`.
- Fallback: if `references/build.js` does not exist in this project, build the single-script way (content object at top, renderer below) and tell Patryk that generating build.js once would halve future build cost.
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
  "engage": {
    "variant": "news | prediction | video | demo | mysteryImage | oddOneOut",
    "hook": "Short focal statement — stat, quote, or forced-choice question. ≤120 chars. Renders at 20pt bold. Always set for new builds.",
    "content": "2–4 sentences of supporting context. Renders at 14pt italic below the hook.",
    "imagePlaceholder": true
  },
  "learn": [

// MATH MINI-SYNTAX — use in any string field containing equations (equation, q, a, steps, body, etc.)
// Equations render in Cambria Math (ships with every MS Office → zero install on school PCs).
// {num/den}   fraction           → "v = {s/t}",  "KE = {1/2}mv^2"  (legible diagonal in PPTX; true stacked bar in Word)
// x^2         superscript        → "E = mc^2",   "m s^-2"
// x_2         subscript          → "CO_2",        "H_2O"
// ^{m s}      multi-char super   → "m^{-1} s^{-2}"
// sqrt(...)   square root        → "sqrt(2gh)"   (√ glyph in PPTX; true radical + vinculum in Word)
// \greek      Greek letter       → "\Delta T",    "\rho"
// \op         operator/relation  → \times → ×  \div → ÷  \pm → ±  \cdot → ·  \to/\rightarrow → →
//                                  \leq → ≤  \geq → ≥  \approx → ≈  \neq → ≠  \degree/\deg → °  \propto → ∝
// RULE (Bug 53): write operators and units as SYMBOLS in model answers / working — "×" not "times",
//   "÷" not "divide", "m/s" not "meters/second". Use the \times / \div commands or the symbol itself.
//   The renderer also converts a small safe whitelist (meters/second→m/s, seconds→s, times→×, divide→÷)
//   but do not rely on it for anything outside that list — author symbols directly.
// DO NOT hand-type Unicode super/subscript glyphs (₂ ² ⁻) in source — use ^ / _ so the renderer
//   controls them (it emits Unicode super/subscript only where a run can't carry real super/subscript).

    { "variant": "A", "heading": "...", "boxes": [ { "header": "...", "items": ["..."] } ], "keywords": ["..."], "imagePlaceholder": true, "imageDescription": "diagram of lock and key enzyme model with active site and substrate labelled", "annotationZone": false },
    { "variant": "B", "heading": "...", "definitions": [ { "term": "Osmosis", "definition": "The net movement of water molecules from a high water concentration to a low water concentration through a partially permeable membrane." } ], "below": "content+image|image|two-column|none", "boxes": [ { "header": "...", "items": ["..."] } ] },
    { "variant": "E", "heading": "...", "comparison": { "aTitle": "Series circuit", "bTitle": "Parallel circuit", "rows": [ { "a": "...", "b": "..." } ] } },
    { "variant": "F", "heading": "...", "equation": "V = I × R", "components": [ { "symbol": "V", "name": "Voltage", "unit": "volts (V)" } ], "rearrangements": ["I = V / R"], "example": "..." },
    { "variant": "G", "heading": "...", "steps": [ { "label": "Step label", "note": "brief clarification" } ] },
    { "variant": "H", "heading": "...", "videoLink": { "text": "descriptive title (not raw URL)", "url": "https://..." }, "toWatch": ["look for 1", "look for 2"], "prompt": "optional pause/discussion prompt", "questions": [ { "q": "...", "a": "..." } ] },
    { "variant": "I", "heading": "...", "nodes": [ { "label": "Mouth", "note": "mechanical digestion" }, { "label": "Stomach", "note": "acid + enzymes" } ], "orientation": "vertical", "cycle": false },
    { "variant": "J", "heading": "...", "axes": { "x": "Force (N)", "y": "Extension (cm)" }, "features": [ { "label": "Linear region", "description": "Extension proportional to force — obeys Hooke's Law" } ], "instruction": "Sketch the graph and label these features." },
    { "variant": "K", "heading": "...", "events": [ { "year": "1803", "label": "Dalton", "detail": "Solid sphere model" }, { "year": "1911", "label": "Rutherford", "detail": "Nuclear model" } ] }
  ],
  "build": [
    { "type": "mcq", "q": "...", "options": ["A...","B...","C...","D..."], "answer": "B", "explanation": "...", "commonError": "..." },
    { "type": "practical", "intro": "...", "worksheetIntro": false, "steps": ["..."], "equipment": ["beaker", "thermometer", "..."], "warning": "...", "imagePlaceholder": true, "questions": [ { "q": "...", "a": "..." } ] },
    { "type": "workedExample", "worked": { "prompt": "...", "steps": ["..."] }, "yourTurn": { "prompt": "...", "answer": "..." } },
    { "type": "guessExample", "topic": "...", "given": "...", "unknown": "...", "equation": "...", "equationSymbols": { "top": "...", "bottomLeft": "...", "bottomRight": "..." }, "substitute": "...", "solve": "..." },
    { "type": "practiceTriangle", "questions": [ { "q": "...", "a": "...", "marks": 2 } ], "equation": "...", "equationSymbols": { "top": "...", "bottomLeft": "...", "bottomRight": "..." } },
    { "type": "errorAnalysis", "wrongWorking": ["..."], "errorLine": 3, "fix": "..." },
    { "type": "graphInterpret", "graphLabel": "V-t graph", "axes": { "x": "time (s)", "y": "velocity (m/s)" }, "questions": [ { "q": "...", "a": "..." } ] },
    { "type": "misconception", "claim": "...", "whyWrong": "...", "truth": "..." },
    { "type": "sort", "...": "see slide-options-v4.md" },
    { "type": "trueFalse", "heading": "COMMON MISCONCEPTIONS", "statements": [ { "text": "...", "isTrue": true }, { "text": "...", "isTrue": false, "correction": "..." } ] },
    { "type": "predictThenCheck", "setup": "One sentence of scenario context.", "prediction": "What do you predict will happen?", "reveal": "What actually happens.", "explanation": "Why it happens.", "commonError": "..." }
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
- **Image extraction (M1–M3):** When a source PPTX or DOCX is uploaded, extract images using Python's `zipfile` module before building the JSON. PPTX: extract from `ppt/media/`; DOCX: extract from `word/media/`. Write each file as `/mnt/user-data/outputs/img_1.png`, `img_2.png`, etc. Match EACH image to a slide slot by type group (real-world photo → Engage; labelled diagram → Learn A/B; apparatus setup → Build practical). **Set `embeddedImagePath` + `imageConfidence: "search"` on EVERY matched slide entry independently** — multiple `embeddedImagePath` fields per lesson are valid and expected. If Engage gets img_1.png and Learn A gets img_2.png, both entries get their own field. `image_dump` catches genuinely unmatched images only — never use it as a fallback for images that have a clear slot match. Matched images must NOT also appear in `image_dump`. The `image_dump` slide is appended last and must be deleted before sharing.
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
| `references/build.js` | Never read in full — it is frozen. Only consult its header comment for the CLI usage. |
| `references/sol-log.md` (if present) | Step 1 — derive prior-lesson context |
| `references/aqa-spec-extract.md` (if present) | Step 2 — align objectives + keywords to spec points |
| `references/textbook-index.md` | When mapping lessons to textbook pages or adding "read more" references for students (Y7/Y8 = Activate 1+2; Y9 = Activate 2 + Kerboodle; Y10/Y11 = Kerboodle only) |
| `/mnt/skills/public/pptx/SKILL.md` | Non-standard PPTX layouts only |
| `/mnt/skills/public/docx/SKILL.md` | Non-standard DOCX layouts only |

---

## Class Profiles

| Class | Year | Ability | Exam | Worksheet default | Support sheet notes |
|---|---|---|---|---|---|
| 7BYA | 7 | Mixed | AQA | Do Now + Build + Apply | Word bank + sentence starters — lean heavy |
| 7MLA | 7 | Mixed | AQA | Do Now + Build + Apply | Same as 7BYA |
| 8AB | 8 | Higher | AQA | Apply-heavy; no word bank | No word bank — omit `wx.wordBank`, don't rely on keyword fallback |
| 8XP | 8 | Lower mixed | AQA | Do Now + Build; word bank on cloze | Full scaffolding |
| 9AB | 9 | Higher | AQA | Build + Apply; no word bank | No word bank |
| 10S2 | 10 | Higher triple | AQA | Apply; 6-marker if practical | Minimal scaffolding |
| 12D-Phy | 12 | A-level | OCR Physics A | Build + Apply; calculation-heavy | Minimal — equation hints only |

This table expires July 2026 — Patryk gets new classes in September 2026 and will supply the new list. (10C4 and 11C3 in older files are no longer his classes.)

Standard lessons emit THREE files: `.pptx` + `_worksheet.docx` + `_support_worksheet.docx`. Review lessons also emit three, but different: `.pptx` + `_worksheet.docx` (the booklet) + `_answers.docx` (model-answer sheet — takes the support-worksheet slot). The support sheet is the same content with scaffolding added automatically across ALL tiers (word bank where tier-appropriate, GUESS scaffold on calculations, equation/units hint line, Do Now `hint` lines + keywords box, sentence starters, key-word definition table, practical design prompt checklist, explanation prompt chain). `differentiation: "split"` / `meta.abilityLabel` only set the filename label — they never change whether the support sheet is produced. Identical titles, identical layout family — never visibly "the easy sheet".

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

Learn H worksheet questions appear only on the worksheet (not repeated on the slide). Learn G has no worksheet output (students annotate in books). Learn I/J/K have no dedicated worksheet output — pair with a worksheet question set as needed.

---

## Workflow

**1 — Prior context.** Patryk states prior lesson context verbally in chat (topic covered, Do Now questions used). Prefer, in order: (a) verbal statement in chat, (b) `references/sol-log.md`. Never ask for a PPTX upload for prior-context purposes. PPTX uploads ARE the source material when Patryk is basing the new lesson on a previous one — in that case treat the upload as the content floor (see Content volume & source fidelity).
**2 — Clarify:** class · topic · title · lesson type · worksheet needed. Read both reference files.
**3 — Build directly (standard).** Text plan first only if 6+ custom questions or unusual structure.
**3a — Image extraction (if source PPTX or DOCX uploaded).** Before writing the JSON: use Python `zipfile` to pull images from `ppt/media/` (PPTX) or `word/media/` (DOCX) → write to `/mnt/user-data/outputs/img_1.png`, `img_2.png`, etc. Match each image to a slide slot by type (real-world photo → Engage; labelled diagram → Learn A/B). Set `embeddedImagePath` + `imageConfidence: "search"` on matched items in the JSON. Add `image_dump` as the final field on the lesson object (all images, matched or not, with slot labels or `"unassigned"`). Skip this step if no source file is uploaded — placeholder behaviour is unchanged.
**4 — Write `lesson-content.json` only** (array, 1–N lessons) → run `node references/build.js lesson-content.json` → 3 files out per lesson (PPTX + worksheet + support worksheet; review lessons swap the support worksheet for a model-answer sheet).
**5 — QA:** convert to images. ALWAYS check: Title, Do Now, every Apply, every Review, any annotationZone slide. Sample 1-in-3 of the rest. Check specifically for squished/cramped text on Engage and Learn. Fix visible defects. One cycle only.
**6 — `present_files`.**
**7 — Handoff (ONLY if Patryk asks).** Do not emit a next-lesson brief by default. If Patryk asks for one ("give me the brief" / "what should next lesson's do now be"), output 4 suggested retrieval Do Now questions spanning this + prior topics, plus a one-line `sol-log.md` entry if that file exists.
**Logging:** When Patryk says "log it", "log that", or similar — use the `lesson-backlog` skill to append an entry to the running backlog artifact. Do not modify this file (SKILL.md). Do not write to any output file. The backlog artifact lives in chat; Patryk copies it home at the end of the day by saying "copy for Claude Code".

---

## Image extraction — when a source file is uploaded

Run this step only when Patryk uploads a PPTX or DOCX alongside the lesson request. **If no file is uploaded, skip entirely — placeholder behaviour is unchanged (no regression).**

### 1 — Extract images

PPTX and DOCX are ZIP archives. Use Python's `zipfile` to pull all images **before** writing the lesson JSON:

```python
import zipfile, os

out_dir = "/mnt/user-data/outputs"
# PPTX: media_prefix = "ppt/media/"
# DOCX: media_prefix = "word/media/"
media_prefix = "ppt/media/"

with zipfile.ZipFile("uploaded.pptx") as z:
    media = sorted(f for f in z.namelist() if f.startswith(media_prefix) and not f.endswith("/"))
    for i, path in enumerate(media, start=1):
        ext = os.path.splitext(path)[1] or ".png"
        with open(f"{out_dir}/img_{i}{ext}", "wb") as f:
            f.write(z.read(path))
```

Output: `img_1.png`, `img_2.png`, … written to `/mnt/user-data/outputs/` alongside the built PPTX/DOCX, so `build.js` can reference them by path.

### 2 — Match images to slide slots

Group by semantic type; assign sequentially within each group:

| Image type | → Slot |
|---|---|
| Real-world photo — scene, object, phenomenon | Engage `imagePlaceholder` |
| Labelled diagram, circuit diagram, apparatus setup | Learn A/B or Build practical |
| Graph, chart, axes | Learn J or Build `graphInterpret` |
| Genuinely ambiguous | unassigned |

If a slide type has no matching image, leave its `imagePlaceholder` as-is — the grey box renders as normal.

### 3 — Update matched slide entries in the JSON

For each matched entry, add two fields:

```json
"embeddedImagePath": "/mnt/user-data/outputs/img_1.png",
"imageConfidence": "search"
```

`build.js` detects `imageConfidence: "search"` and calls `addImage()` instead of the grey placeholder. Sizing (aspect-ratio-preserving fit within placeholder bounds) is handled by the renderer — no extra work needed.

### 4 — Append the image_dump entry

Add `image_dump` as the **final top-level field** on the lesson object (sibling of `meta`, `apply`, `review` — not inside any array):

```json
"image_dump": {
  "images": [
    { "path": "/mnt/user-data/outputs/img_1.png", "label": "Engage" },
    { "path": "/mnt/user-data/outputs/img_2.png", "label": "Learn A" },
    { "path": "/mnt/user-data/outputs/img_3.png", "label": "unassigned" }
  ]
}
```

Every extracted image appears here — matched ones carry their slot label, unmatched carry `"label": "unassigned"`. `build.js` renders this as a labelled grid appended as the last slide. **Always tell Patryk to delete the dump slide before sharing the lesson.**

---

## Lesson type → slide sequence

| Type | Sequence |
|---|---|
| standard | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → Build×3 (MCQ default; swap ≤2 for workedExample / errorAnalysis / graphInterpret / trueFalse as topic demands) → Visualiser → Apply → Review×3 |
| revision | Title → DoNow → DoNow Answers → Learn-C → Whiteboard QA rounds → Apply → Review×3 |
| practical | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → Build practical → Build Q&A → Visualiser → Apply → Review×3 |
| whiteboard | Title → DoNow → DoNow Answers → Whiteboard QA rounds → Apply → Review×3 |
| review | Title/DoNow (combined) → DoNow Answers (purple pen) → Learn (all — typically Learn-C 3-col; **no cap**, Bug 55) → Build items if authored (`markTheAnswers` / `modelAnswerReview`) → Visualiser → Apply (booklet instructions by tier) → Review — Developing/Reaching/Mastering. **No Engage.** Output: PPTX + review booklet DOCX + **model-answer sheet** (`_answers.docx`) — no support worksheet. See **Review lesson specification** and **Answer sheet** sections. |
| annotation | As standard, but `meta.annotation: true` → Learn slides and one workedExample slide include an `annotationZone` (5.5"×4" blank panel, dashed gold border, "worked live" label). Use for calculation-heavy lessons taught with the drawing tablet. After the lesson: slideshow ink → "Keep ink annotations" → export annotated PDF → post to Classroom. |

Slide-type selection guidance: use `trueFalse` with `"heading": "COMMON MISCONCEPTIONS"` whenever the topic has a canonical wrong belief (heavier falls faster, current gets used up, cold flows in) — write statements that may be true or false, students evaluate each; workedExample→yourTurn for any new calculation; errorAnalysis in the lesson AFTER a calculation is introduced; graphInterpret mandatory at least once per motion/electricity/waves topic. (`type: "misconception"` still exists in the renderer but is not recommended — the standalone 3-box layout is less effective than a trueFalse evaluation activity.)

---

## Planning practical sequences — when one practical = two lessons

A multi-step or concept-heavy practical should usually NOT be forced into a single theory+practical lesson. Decide the split from the lesson sequence (no manual flag):

**Default:** if the practical is short and the underlying idea is already secure, one `practical` lesson is fine.

**KS3 — split into two** when the practical is multi-step and needs real concept build-up before students can just *do* it:
- **Lesson N — build-up** (`standard` type): builds the ideas, ends by previewing the method.
- **Lesson N+1 — the practical** (`practical` type): students walk in ready to work.
- Naming: consecutive numbered lessons in the same macrotopic folder, e.g. `Lesson 4 - Enzymes and pH` then `Lesson 5 - Enzymes and pH practical`.

**Y12/13 — demo-then-practical pattern:**
- **Lesson N — demo lesson**: Patryk orders a demo setup and shows the technique in class.
- **Lesson N+1 — the practical**: students run it with a **method sheet listing the CPAC skills** (Common Practical Assessment Criteria) they must hit. Always put the CPAC success criteria on the A-level method sheet.

**Capstone rule (pairs with the above):** when a practical fills its whole lesson, the deep extended-writing payoff belongs in the follow-up lesson — build that follow-up (existing `revision` or `review` type) up to a genuine 6-mark extended question as the capstone, with sentence starters on the support sheet, using the class's real practical results as the data rather than generic textbook numbers.

This is a planning workflow, not a renderer feature — there is no dedicated lessonType for it.

---

## Review lesson specification

### Slide sequence
1. **Title / Do Now** (combined — Do Now questions only; no Engage on review lessons)
2. **Do Now Answers** (purple pen bar)
3. **Learn** (all Learn slides — typically one Learn-C 3-column revision table; **no 4-slide cap**, Bug 55)
4. **Build items** — only if authored; review-appropriate ones (`markTheAnswers`, `modelAnswerReview`)
5. **Visualiser**
6. **Apply** (booklet instructions by tier — not tiered Q&A)
7. **Review — Developing / Reaching / Mastering**

Removed from review lessons: Engage slide (cut entirely). Kept: DoNow Answers and Visualiser (mandatory).
**Build items now render in review lessons** (the review dispatcher runs them) — the earlier "no Build
slides" only held because none were authored. Add a `markTheAnswers` Build item to run a mark-the-answers
peer-assessment inside a review lesson; it also prints on the booklet + answer sheet. Do not add MCQ/sort
"quiz" Build slides to a review lesson — they don't suit the booklet format.

`lessonType: "review"` in `meta`. Build the PPTX with the above sequence. Review lessons render **all**
Learn slides (no cap — Bug 55). The review lesson is NOT a standard lesson — never use `lessonType: "standard"` for a review lesson.

### Learn-C table — always 3 columns
- Column 1: topic description (the question area being tested)
- Column 2: booklet section reference (e.g. "Section 3")
- Column 3: heading is exactly **"Support pages"** — Kerboodle page refs (e.g. "C1.6 p.14, C1.7 p.16"). Never "Textbook", never "Pages".

Single-test classes (e.g. 9AB — Extend only): one question column ("Extend PAPER") + "Support pages". Multi-paper classes: ask Patryk which papers the class sat (Core / Extend / Challenge) before building — one column per paper.

### Review booklet (the `_worksheet.docx` output)
Set `worksheetExtras.worksheetType: "C"`. Do NOT set `navRows` — the nav/RAG table is suppressed entirely.

- **Title:** `[Year group] [Subject] — EOY Test Review Questions` — never include the word "Booklet"
- **No NAV/RAG table.** No intro paragraph above it. Students track progress on their own test paper. Never generate `navRows`.
- **Section heading format (always two lines):**
  ```
  Section N — Topic name
  Kerboodle: C1.6 p.14, C1.7 p.16
  ```
  Never add `(links to Q1 in your test)` or any cross-reference suffix after the topic name.
- **No phantom figure references.** Never write "Figure 1 shows..." or "The diagram below shows..." unless a diagram is actually embedded. Rephrase as a plain statement ("An atom of nitrogen has 7 protons...").
- **No answer space.** Students answer in exercise books. No answer boxes. No blank lines between questions. `[N marks]` sits immediately beneath the question text with no gap before the next question. Section heading → first question: one line gap maximum. Tier pill boxes: minimal padding.

### Output for review lessons
- PPTX + `[base]_worksheet.docx` (the booklet) + `[base]_answers.docx` (the model-answer sheet)
- No `_support_worksheet.docx` — the answer sheet takes the support slot (the booklet has no answer space, so the answer sheet is the mark scheme)
- No `_PTO` suffix anywhere in any filename — ever

---

## Answer sheet (review lessons only)

Review lessons (`lessonType: "review"`) build `[base]_answers.docx` — a model-answer / marking copy
that mirrors the worksheet's question order for the **Apply tiers and Build questions only** (each
question printed then its model answer directly below). **No Do Now section** (2026-07-05) — Do Now
answers live on the DoNow Answers slide, not the marking copy. It is generated automatically from the
same content object — no separate authoring. Built by `buildWorksheetChildren(L, 'answers')`.

**Framework is chosen automatically per question** (override with `q.answerStyle`: `"guess"` |
`"indicative"` | `"plain"` | `"graph"`):
- **Filled GUESS table** — `qType: "calculation"` (or any GUESS field present). Fills all five cells
  from `q.given` / `q.unknown` / `q.equation` / `q.substitute` / `q.solve` (falls back to `q.a` for
  Solve); the Solve cell is emphasised. Author equations with the math mini-syntax (× ÷ fractions
  typeset via Cambria Math).
- **Indicative-content panel** — `marks ≥ 6`, or `contentType: "extended_writing"`, or any
  `q.indicativeContent`. Navy/gold panel in three split sections (2026-07-05): **INDICATIVE CONTENT**
  (`q.indicativeContent[]` bullets; `<u>word</u>` renders underlined ONLY when the word HAS to be
  used) → **BANDS** (`q.levelDescriptors[]`) → **EXCLUSIONARY CLAIMS** (`q.doesNotAward[]`). Reuses
  the same fields as the on-screen `modelAnswerReview` / `markTheAnswers` slides.
- **Plain callout** — everything else: `q.a` (or `q.modelAnswer`) as a short navy-border answer.

**Model-answer authoring rules:** short and terse, operators as symbols (× not "times", ÷ not
"divide"), grounded in the real mark scheme — never invent marking content.

**6-mark rule:** an extended (non-calculation) question worth ≥6 marks must carry ≥6
`indicativeContent` points — match points to marks. Shortfalls are logged at build time (non-fatal).
**Exception (2026-07-05): band-marked questions** — if `levelDescriptors` (BANDS) are present the
rule is NOT enforced, because marks are lost via the bands, not the indicative-point count.

**Indicative-content chunking (`ic.group`):** give each `indicativeContent` item an optional
`group` (e.g. `"substitution"`, `"answer"`, `"conversion"`, or `"collision theory"`) to break the
panel into labelled visual blocks — both on the answer sheet and the `modelAnswerReview` slide.
`indicativeContent` items are either plain strings or `{ text, group?, dependentOn? }`.

**Mark-the-answers on the sheet:** a `markTheAnswers` Build item (slide-options-v4.md) also prints in
the BUILD section — the question, each sample answer boxed with a `Level: __  Mark: __ / N` line to
annotate; on the answer sheet each sample gains its `Awarded:` verdict, MPs hit/missed, teacher note,
then the full marking panel. This is the "mark the answers" peer-assessment activity.

---

## Learn variant H — video lessons

**Trigger:** use variant H whenever the lesson plan includes a video element — when `videoLink` is present OR when the lesson plan explicitly mentions a video as the primary learning activity. Never fall back to variant A when a video is the intended mechanism.

**Schema:**
```json
{ "variant": "H", "heading": "...", "videoLink": { "text": "descriptive title", "url": "https://..." }, "toWatch": ["look for X", "look for Y"], "prompt": "optional pause prompt", "questions": [ { "q": "...", "a": "..." } ] }
```

- `questions` must be `{q, a}` objects — not bare strings. The `q` text appears on the worksheet; the `a` text appears on the answer slide.
- `toWatch` bullets go in a **white-fill + gold-border** box (house style). Never amber or yellow fills on any Learn-H box.
- If `questions` contains objects with answers, the renderer automatically generates an answer slide (same purple-pen / review-row format as DoNow Answers) immediately after the Learn-H slide.
- Video questions appear on the worksheet automatically when the Learn-H item has a `questions` array (handled by `videoQSection` in the worksheet builder).

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

## Combined lesson mode

Valid when Patryk says "combine lessons X and Y" or "fast-paced hour covering both", typically when adjacent lessons in the scheme have thin or repetitive content.

Build a single lesson object: two Learn slides (one per topic), unified Do Now drawing from both topics, Build covering both topics, Apply and Review spanning both. Do NOT pad either topic to fill time. Same output format: PPTX + worksheets (not a double-length lesson — a merged single lesson). Normal MCQ count (4) still applies across both topics combined.

---

## Known Bugs and fixes

The bug-fix history (Bugs 1 to 61, dates, code notes) lives at home in
`references/backlog.md` and is deliberately NOT shipped in this skill: it is
developer history with no bearing on authoring a lesson. If a build looks wrong,
describe the problem plainly to Patryk so Claude Code can fix build.js at home.
Never try to edit build.js from a school session.

---

## Do Now question bank — spaced retrieval (engine built at home; wiring pending)

A per-class bank with a spaced-retrieval selector now EXISTS at home
(`references/do-now-bank.js`, tested) but is not yet wired into build.js. Until it
is, author the six Do Now questions as normal: backwards-looking, mostly recall
(AO1), never previewing today.

When wired, the session will PICK six from the bank instead of writing them,
leaning on older topics; for KS4 the low-demand questions will come from real AQA
exam parts. Design and status: `specs/do-now-bank.md` (home).
