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
- **Visualiser slide is MANDATORY in standard and practical lessons. Never omit.**
- No emojis. No timers. No AO1/AO2. No "Mixed Ability".
- No class name in worksheet titles.
- Never abbreviate questions — full text on: Do Now slide, Do Now Answers (verbatim), Apply slide, Review (verbatim).
- Min 4 Do Now questions.
- One MCQ per Build slide.
- Purple pen bar on every Do Now Answers + every Review slide.
- Answers = core info only, 1–3 lines. Teacher elaborates.
- Theme colour on nav tab + header bar + bottom bar ONLY. Content box bodies = white fill + gold `#FABB2E` border. Exception: misconception callout body uses amber border `#E65100` (see slide-options-v5.md).
- MCQ colours: A=pink, B=blue, C=green, D=yellow (see slide-options-v5.md).
- Review tab/title = green `#1B5E20`. Never grey.
- Combine fill + text into one shape. No stacked rect + text box.
- Image placeholders on any slide expecting an image.

**Classroom routine elements (baked into slides — never omit)**
- Every Build MCQ slide: bottom protocol strip — `THINK (silent) → DECIDE → SHOW on 3-2-1`.
- Every MCQ answer slide: `CARDS DOWN` cue at left of header bar.
- Every Do Now slide: silent-entry footer — `Silent start · pen out · attempt all questions`.

**Writing rules (anti-AI-voice)**
- Banned phrases: "Let's explore", "delve", "It's important to note", "In this lesson we will", "fascinating", "dive into". No exclamation marks outside the Engage slide. No em dashes (—) anywhere — use commas, colons, or rewrite the sentence.
- Objectives written as plain teacher voice: "Calculate resultant force from a free-body diagram", not "Students will be able to understand...".
- All calculation questions use physically realistic values (a 1200 kg car, a 60 W bulb — never a 10 kg car or a 3 m tall person).
- Apply questions are tagged `"qType": "concept" | "calculation"`. Tier mix: Developing ≥1 concept; Mastering ≥1 calculation (KS4) or extended reasoning (KS3).
- Each Apply/Review question may carry `"commonError"` — one line on how students typically get it wrong. If present, it renders on the answer/review slide under the answer.

**Build architecture**
- No animation injection. No Drive. `present_files` only.
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
    "annotation": false
  },
  "doNow": {
    "variant": "A",
    "questions": [ { "q": "...", "a": "...", "marks": 1 } ]
  },
  "engage": { "variant": "news | prediction | video | demo | mysteryImage | oddOneOut", "content": "...", "imagePlaceholder": true },
  "learn": [
    { "variant": "A", "heading": "...", "body": "...", "keywords": ["..."], "imagePlaceholder": true, "annotationZone": false }
  ],
  "build": [
    { "type": "mcq", "q": "...", "options": ["A...","B...","C...","D..."], "answer": "B", "commonError": "..." },
    { "type": "workedExample", "worked": { "prompt": "...", "steps": ["..."] }, "yourTurn": { "prompt": "...", "answer": "..." } },
    { "type": "errorAnalysis", "wrongWorking": ["..."], "errorLine": 3, "fix": "..." },
    { "type": "graphInterpret", "graphLabel": "V-t graph", "axes": { "x": "time (s)", "y": "velocity (m/s)" }, "questions": [ { "q": "...", "a": "..." } ] },
    { "type": "misconception", "claim": "...", "whyWrong": "...", "truth": "..." },
    { "type": "practical", "...": "see slide-options-v5.md" },
    { "type": "sort", "...": "see slide-options-v5.md" }
  ],
  "apply": {
    "developing": [ { "q": "...", "a": "...", "marks": 2, "qType": "concept", "commonError": "..." } ],
    "reaching":   [ { "q": "...", "a": "...", "marks": 3, "qType": "calculation" } ],
    "mastering":  [ { "q": "...", "a": "...", "marks": 6, "qType": "calculation" } ]
  },
  "review": { "questions": [ { "q": "...", "a": "..." } ] }
}
```

Field names are fixed. If a slide type needs something not in the schema, check slide-options-v5.md; if still absent, ask — do not invent.

---

## Reference files — read on demand

| File | When to read |
|---|---|
| `references/slide-options-v5.md` | Step 2 — every PPTX build |
| `references/worksheet-spec.md` | Step 2 — every DOCX build |
| `references/build.js` | Never read in full — it is frozen. Only consult its header comment for the CLI usage. |
| `references/sol-log.md` (if present) | Step 1 — derive prior-lesson context |
| `references/aqa-spec-extract.md` (if present) | Step 2 — align objectives + keywords to spec points |
| `/mnt/skills/public/pptx/SKILL.md` | Non-standard PPTX layouts only |
| `/mnt/skills/public/docx/SKILL.md` | Non-standard DOCX layouts only |

---

## Class Profiles

| Class | Year | Ability | Exam | Worksheet default | Split differentiation |
|---|---|---|---|---|---|
| 7BYA | 7 | Mixed | AQA | Do Now + Build + Apply | **default ON** |
| 7MLA | 7 | Mixed | AQA | Do Now + Build + Apply | **default ON** |
| 8AB | 8 | Higher | AQA | Apply-heavy; no word bank | never |
| 8XP | 8 | Lower mixed | AQA | Do Now + Build; word bank on cloze | **default ON** |
| 9AB | 9 | Higher | AQA | Build + Apply; no word bank | never |
| 10S2 | 10 | Higher triple | AQA | Apply; 6-marker if practical | never |
| 10C4 | 10 | Mid | AQA | Do Now + Build + Apply | optional |
| 11C3 | 11 | Mixed | AQA | Build + Apply; 6-marker always | **default ON** |

`differentiation: "split"` → build.js emits TWO worksheets from the same content: **Developing** (word bank forced, GUESS scaffold on every calculation, sentence starters, answer boxes +30%) and **Reaching/Mastering** (standard rendering). Identical titles, identical layout family — never visibly "the easy sheet".

---

## Workflow

**1 — Prior context.** Patryk states prior lesson context verbally in chat (topic covered, Do Now questions used). Prefer, in order: (a) verbal statement in chat, (b) a pasted `next-lesson-brief`, (c) `references/sol-log.md`. Never ask for a PPTX upload for prior-context purposes. PPTX images may be shared only when Patryk is basing the new lesson structurally on a previous one.
**2 — Clarify:** class · topic · title · lesson type · worksheet needed. Read both reference files.
**3 — Build directly (standard).** Text plan first only if 6+ custom questions or unusual structure.
**4 — Write `lesson-content.json` only** (array, 1–N lessons) → run `node references/build.js lesson-content.json` → PPTX + DOCX out.
**5 — QA:** convert to images. ALWAYS check: Title, Do Now, every Apply, every Review, any annotationZone slide. Sample 1-in-3 of the rest. Fix visible defects. One cycle only.
**6 — `present_files`.**
**7 — Handoff.** End every build by emitting `next-lesson-brief.md`:

```
# Next-lesson brief — [class] — [date]
Covered: [topic, one line]
Keywords taught: [list]
Do Now used: [the 4+ questions, abbreviated]
Misconceptions observed: [Patryk fills in after teaching]
Suggested next Do Now: [4 retrieval questions spanning this + prior topics]
Avoid repeating: [questions/examples used]
```
If `references/sol-log.md` exists, also output the one-line log entry for Patryk to append.

---

## Lesson type → slide sequence

| Type | Sequence |
|---|---|
| standard | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → Build×3 (MCQ default; swap ≤2 for workedExample / errorAnalysis / graphInterpret / misconception as topic demands) → Visualiser → Apply → Review×3 |
| revision | Title → DoNow → DoNow Answers → Learn-C → Whiteboard QA rounds → Apply → Review×3 |
| practical | Title → DoNow → DoNow Answers → Engage → Learn(1–2) → Build practical → Build Q&A → Visualiser → Apply → Review×3 |
| whiteboard | Title → DoNow → DoNow Answers → Whiteboard QA rounds → Apply → Review×3 |
| annotation | As standard, but `meta.annotation: true` → Learn slides and one workedExample slide include an `annotationZone` (5.5"×4" blank panel, dashed gold border, "worked live" label). Use for calculation-heavy lessons taught with the drawing tablet. After the lesson: slideshow ink → "Keep ink annotations" → export annotated PDF → post to Classroom. |

Slide-type selection guidance: misconception slide whenever the topic has a canonical wrong belief (heavier falls faster, current gets used up, cold flows in); workedExample→yourTurn for any new calculation; errorAnalysis in the lesson AFTER a calculation is introduced; graphInterpret mandatory at least once per motion/electricity/waves topic.
