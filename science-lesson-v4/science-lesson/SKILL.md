---
name: science-lesson
description: "Creates lesson PowerPoints and worksheets for science lessons (physics, chemistry, biology). Use when asked to make a lesson, presentation, slide deck, PowerPoint, worksheet, booklet, or revision resource for any science topic or class. Always trigger for: 'make a lesson on', 'create a worksheet for', 'build slides for', 'lesson for 7BYA', 'lesson for 7MLA', 'lesson for 8AB', 'lesson for 8XP', 'lesson for 9AB', 'lesson for 10S2', 'lesson for 10C4', 'lesson for 11C3', or any science topic paired with a teaching request. Also trigger for standalone worksheet requests: 'make me a Type C exam paper for 10S2', 'revision worksheet on forces'."
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
- No class name in worksheet titles.
- Never abbreviate questions — full text on: Do Now slide, Do Now Answers (verbatim), Apply slide, Review (verbatim).
- Min 4 Do Now questions.
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
- Worksheets: `[base]_worksheet.docx` (standard) and `[base]_support_worksheet.docx` (support — built for EVERY lesson). NEVER name worksheets "developing", "reaching", or "scaffolded" — students see filenames.

**Classroom routine elements (baked into slides — never omit)**
- Every Build MCQ slide: protocol strip — `THINK (silent) → DECIDE → SHOW on 3-2-1` — sits between the options and the answer box on the single MCQ slide.
- Every Do Now slide: silent-entry footer — `Silent start · pen out · attempt all questions`.

**Content volume & source fidelity**
- **Apply: minimum 3 questions per tier** unless Patryk says otherwise. One question per tier is never enough.
- **Apply slide = separate gold-bordered box per question (Variant A), three tiers across, questions stacking down.** Each question is its own box with a `"Q1 / Q2 / Q3"` label under a full-width tier header. This is the default and what Patryk means by "multiple boxes". The single-unified-column look (all of a tier's questions crammed into one tall box) is the failure mode he dislikes — never produce it. Use Variant B (full-width Mastering row) only when one Mastering question is genuinely long (>140 chars). The naming is now consistent between SKILL.md and slide-options-v4.md — do not reintroduce a "default to C" instruction.
- **Review MUST mirror EVERY Apply question.** The review section is the mark scheme for the Apply task: for each tier, include an answer for every Apply question in that tier (3 apply questions → 3 review Q/A pairs per tier), verbatim question text, each in its own separate box (`reviewRow`). Never collapse three Apply questions into one review answer. The review `developing`/`reaching`/`mastering` arrays must each have the same length as the matching Apply arrays.
- **When Patryk uploads an existing resource to work from, it is a floor, not a suggestion.** Port EVERY question, every table, every scaffold, and mark every image/diagram position with a placeholder. Adapt the format to the house style — never reduce the content. If something genuinely can't fit, ask before cutting.
- Worksheets must carry the full lesson: Do Now (with word bank/gap-fill recall for scaffolded versions), the experiment section (diagram box + results table + conclusion questions) for practical lessons, and the full Apply set. A worksheet with one question per tier is bland and wrong.

**Box and space economy (Patryk's confirmed preferences)**
- **Content boxes on Learn slides are NOT the default.** Use `navyHeaderBox` stacks only when a section genuinely needs a labelled header (e.g. definition box, equation box). Plain body text without a box is fine for examples, values tables, or brief notes — boxes waste vertical space and students are writing in their books not the slide.
- **Key terms strip at the bottom of Learn slides: omit unless the term list adds real value.** If keywords are already embedded in the slide content, the strip is redundant.
- **Worksheets — answer boxes:** Only add `answerBox()` where there is a genuine mark allocation AND no writing space already exists. Gap-fill questions already have blanks — never add an answer box beneath a gap-fill. Calculation questions get `guessScaffold()` or `answerBox(marks)` as appropriate, not both.
- **Students write in their books by default.** Worksheets should not duplicate what students record in their books. Do Now on the worksheet = questions only (no boxes). Learn section = never on the worksheet (students write core info in books during teacher explanation). Build on the worksheet = MCQ letter choice + Your Turn working space only.
- **Review/improvement booklets: NO answer boxes by default.** Students answer in their exercise books — this is what made the earlier improvement lessons better. Only add writing space to a review booklet if Patryk explicitly asks for it. A booklet whose instruction says "answer in your book" must not also contain answer boxes; that contradiction is a build failure.
- **Title/Do Now slide bans (review and standard lessons alike):** no school name anywhere on the slide; no seating/equipment bullet list ("sit in your seat", "pencil case out", etc.); no subject badges (Chemistry/Physics/Biology pills) on Do Now question rows; no timer ("5 minutes", "30:00") on any slide. Do Now question rows are min 0.9" tall so the question text is never cramped.
- **Instruction / protocol boxes are white-filled with a gold 2pt border** — never filled with the slide background colour (they vanish), and never preceded by a scene-setting sentence ("Here is how to get the most out of this lesson"). One sentence per step, four steps max.

**Writing rules (anti-AI-voice)**
- Banned phrases: "Let's explore", "delve", "It's important to note", "In this lesson we will", "fascinating", "dive into". Also banned: scene-setting openers on instruction slides — "Here is how to...", "Here's how to get the most out of...", "Welcome to...", "In today's lesson...". Start with the first actual instruction. No exclamation marks outside the Engage slide. No em dashes (—) anywhere — use commas, colons, or rewrite the sentence.
- Objectives written as plain teacher voice: "Calculate resultant force from a free-body diagram", not "Students will be able to understand...".
- All calculation questions use physically realistic values (a 1200 kg car, a 60 W bulb — never a 10 kg car or a 3 m tall person).
- Apply questions are tagged `"qType": "concept" | "calculation"`. Tier mix: Developing ≥1 concept; Mastering ≥1 calculation (KS4) or extended reasoning (KS3).
- Each Apply/Review question may carry `"commonError"` — one line on how students typically get it wrong. If present, it renders on the answer/review slide under the answer.

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
- Every lesson build always produces THREE files: `[base].pptx` + `[base]_worksheet.docx` + `[base]_support_worksheet.docx`. `differentiation: "split"` / `meta.abilityLabel` only change the filename label, not whether the support sheet is built.
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
    "annotation": false
  },
  "title": { "objectives": ["..."], "keywords": ["..."] },
  "doNow": {
    "variant": "A",
    "questions": [ { "q": "...", "a": "...", "marks": 1 } ]
  },
  "engage": {
    "variant": "news | prediction | video | demo | mysteryImage | oddOneOut",
    "hook": "Short focal statement — stat, quote, or forced-choice question. ≤120 chars. Renders at 20pt bold. Always set for new builds.",
    "content": "2–4 sentences of supporting context. Renders at 14pt italic below the hook.",
    "imagePlaceholder": true
  },
  "learn": [
    { "variant": "A", "heading": "...", "boxes": [ { "header": "...", "items": ["..."] } ], "keywords": ["..."], "imagePlaceholder": true, "annotationZone": false },
    { "variant": "E", "heading": "...", "comparison": { "aTitle": "Series circuit", "bTitle": "Parallel circuit", "rows": [ { "a": "...", "b": "..." } ] } },
    { "variant": "F", "heading": "...", "equation": "V = I × R", "components": [ { "symbol": "V", "name": "Voltage", "unit": "volts (V)" } ], "rearrangements": ["I = V / R"], "example": "..." }
  ],
  "build": [
    { "type": "mcq", "q": "...", "options": ["A...","B...","C...","D..."], "answer": "B", "explanation": "...", "commonError": "..." },
    { "type": "practical", "intro": "...", "steps": ["..."], "warning": "...", "imagePlaceholder": true, "questions": [ { "q": "...", "a": "..." } ] },
    { "type": "workedExample", "worked": { "prompt": "...", "steps": ["..."] }, "yourTurn": { "prompt": "...", "answer": "..." } },
    { "type": "errorAnalysis", "wrongWorking": ["..."], "errorLine": 3, "fix": "..." },
    { "type": "graphInterpret", "graphLabel": "V-t graph", "axes": { "x": "time (s)", "y": "velocity (m/s)" }, "questions": [ { "q": "...", "a": "..." } ] },
    { "type": "misconception", "claim": "...", "whyWrong": "...", "truth": "..." },
    { "type": "sort", "...": "see slide-options-v4.md" },
    { "type": "trueFalse", "statements": [ { "text": "...", "isTrue": true }, { "text": "...", "isTrue": false, "correction": "..." } ] },
    { "type": "predictThenCheck", "setup": "One sentence of scenario context.", "prediction": "What do you predict will happen?", "reveal": "What actually happens.", "explanation": "Why it happens.", "commonError": "..." }
  ],
  "apply": {
    "developing": [ { "q": "...", "a": "...", "marks": 2, "qType": "concept", "commonError": "...", "diagram": true } ],
    "reaching":   [ { "q": "...", "a": "...", "marks": 3, "qType": "calculation" } ],
    "mastering":  [ { "q": "...", "a": "...", "marks": 6, "qType": "calculation" } ]
  },
  "review": { "questions": [ { "q": "...", "a": "..." } ] },
  "worksheetExtras": { "wordBank": ["..."], "results": { "headers": ["Point","Current (A)"], "rows": 6 } }
}
```

Notes on key fields:
- `learn[].boxes` is the preferred Learn-A form (navy-header boxes stacking rules/key info) — much better than a flat `body` string, which renders plain.
- `apply[].diagram: true` (or a string label) emits a framed diagram box on the worksheet under that question — use for any question that refers to a circuit/diagram. `diagramLines` controls the box height.
- `build practical` slides get an apparatus image placeholder automatically; set `imagePlaceholder: false` only if there genuinely is no apparatus.

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
| 10C4 | 10 | Mid | AQA | Do Now + Build + Apply | Light scaffolding |
| 11C3 | 11 | Mixed | AQA | Build + Apply; 6-marker always | Full scaffolding |
| 12D-Phy | 12 | A-level | OCR Physics A | Build + Apply; calculation-heavy | Minimal — equation hints only |

Every lesson build always emits THREE files: `.pptx` + `_worksheet.docx` + `_support_worksheet.docx`. The support sheet is the same content with scaffolding added automatically (word bank where tier-appropriate, GUESS scaffold on calculations, equation/units hint line, optional Do Now `hint` lines, sentence starters, key-word definition table). `differentiation: "split"` / `meta.abilityLabel` only set the filename label — they never change whether the support sheet is produced. Identical titles, identical layout family — never visibly "the easy sheet".

---

## Workflow

**1 — Prior context.** Patryk states prior lesson context verbally in chat (topic covered, Do Now questions used). Prefer, in order: (a) verbal statement in chat, (b) `references/sol-log.md`. Never ask for a PPTX upload for prior-context purposes. PPTX uploads ARE the source material when Patryk is basing the new lesson on a previous one — in that case treat the upload as the content floor (see Content volume & source fidelity).
**2 — Clarify:** class · topic · title · lesson type · worksheet needed. Read both reference files.
**3 — Build directly (standard).** Text plan first only if 6+ custom questions or unusual structure.
**4 — Write `lesson-content.json` only** (array, 1–N lessons) → run `node references/build.js lesson-content.json` → 3 files out per lesson (PPTX + worksheet + support worksheet).
**5 — QA:** convert to images. ALWAYS check: Title, Do Now, every Apply, every Review, any annotationZone slide. Sample 1-in-3 of the rest. Check specifically for squished/cramped text on Engage and Learn. Fix visible defects. One cycle only.
**6 — `present_files`.**
**7 — Handoff (ONLY if Patryk asks).** Do not emit a next-lesson brief by default. If Patryk asks for one ("give me the brief" / "what should next lesson's do now be"), output 4 suggested retrieval Do Now questions spanning this + prior topics, plus a one-line `sol-log.md` entry if that file exists.

---

## Lesson type → slide sequence

| Type | Sequence |
|---|---|
| standard | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → Build×3 (MCQ default; swap ≤2 for workedExample / errorAnalysis / graphInterpret / misconception as topic demands) → Visualiser → Apply → Review×3 |
| revision | Title → DoNow → DoNow Answers → Learn-C → Whiteboard QA rounds → Apply → Review×3 |
| practical | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → Build practical → Build Q&A → Visualiser → Apply → Review×3 |
| whiteboard | Title → DoNow → DoNow Answers → Whiteboard QA rounds → Apply → Review×3 |
| review | Title/DoNow → DoNow Answers → Engage (How this lesson works: score the test, label EBI/WWW, work the booklet, self-mark) → Visualiser → Apply (point to the booklet sections by demand) → Review (single instruction: mark with the answer sheet, RAG-rate topics). Pairs with a Type C booklet + a separate answer sheet. Do NOT shoehorn this into `standard` — the Apply and Review here are instructions, not tiered Q&A. Build the deck with `lessonType: "standard"` only if a review type is unavailable in the renderer, and keep Apply/Review to single instruction content. |
| annotation | As standard, but `meta.annotation: true` → Learn slides and one workedExample slide include an `annotationZone` (5.5"×4" blank panel, dashed gold border, "worked live" label). Use for calculation-heavy lessons taught with the drawing tablet. After the lesson: slideshow ink → "Keep ink annotations" → export annotated PDF → post to Classroom. |

Slide-type selection guidance: misconception slide whenever the topic has a canonical wrong belief (heavier falls faster, current gets used up, cold flows in); workedExample→yourTurn for any new calculation; errorAnalysis in the lesson AFTER a calculation is introduced; graphInterpret mandatory at least once per motion/electricity/waves topic.
