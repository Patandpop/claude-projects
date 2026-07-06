# Spec: Engage Reveal Modifier

## Overview
A new optional "reveal" modifier for the ENGAGE slide, for lessons where the payoff is "guess then find out" rather than plain context-setting. It is NOT a 7th standalone Engage variant — it's a navy-background/gold-text answer box that can attach to any of the 6 existing variants (`news`, `prediction`, `video`, `demo`, `mysteryImage`, `oddOneOut`). It renders as a static box; the teacher adds PowerPoint click-to-reveal animation manually afterward — `build.js` does not generate any animation.

Grilling against real lesson JSON and a spread of classic topics (forces, chemical reactions, lungs, circulatory system, punnett squares, diffraction, work done, climate change) showed `reveal` fits any hook with a single, clean, factual "why/how" or "guess-the-stat" payoff — which is most standard Engage hooks going forward. It does NOT fit open investigations with no single answer (most `prediction` lessons) or multi-item sorting (`oddOneOut`), though it can still pair with `demo` or `mysteryImage` when a live demo or an image is the hook and a one-line explanation follows.

## Inputs
- Lesson content JSON `engage` block, with an optional new `reveal` object:
  ```json
  "engage": {
    "variant": "news | prediction | video | demo | mysteryImage | oddOneOut",
    "hook": "...",
    "content": "optional — see M8",
    "reveal": {
      "question": "optional — ≤120 chars. Presence triggers Layout A.",
      "answer": "required when reveal present — ≤200 chars. Rendered navy bg / gold text."
    }
  }
  ```
- `reveal` is entirely optional. Its absence must render the slide exactly as it does today — no other change to existing engage behavior.

## Outputs
- Rendered ENGAGE slide with one of two layouts when `engage.reveal` is present:
  - **Layout A** (`reveal.question` present): question rendered large/prominent + reveal answer box side-by-side in the same bottom row, in line with each other.
  - **Layout B** (`reveal.question` absent): `engage.hook` is treated as the question; reveal answer box spans the full width at the bottom, not sharing its row with anything.
- Updated authoring guidance in `slide-options-v4.md`: schema for `reveal`, a variant-selection table (which topics/hook shapes want `reveal` vs `prediction` vs `oddOneOut` etc.), and the tone/word rules below.

## Must-haves
1. **M1** — `engage.reveal` is optional. When absent, the ENGAGE slide renders identically to current behavior (no regression).
2. **M2** — `reveal` can be added to any of the 6 existing `engage.variant` values. It is a modifier, not a new variant value.
3. **M3** — Layout A: when `reveal.question` is present, render the question at a proportionally large size (it is the important element) and the reveal answer box in the same bottom row, side-by-side/in line with it. Reveal box style: navy background, gold text — reuse existing `NAVY`/`GOLD` constants and the box pattern already used in `reviewRow`/`goldBox`.
4. **M4** — Layout B: when `reveal.question` is absent, `engage.hook` is treated as the question. Render the reveal answer box full-width at the bottom of the slide, not sharing the row with any other element. Same navy/gold styling as M3.
5. **M5** — No PowerPoint animation/transition is generated for the reveal box by `build.js`. It is a normal static shape. (Animation is added manually by the teacher afterward.)
6. **M6** — `reveal.question` ≤120 chars, `reveal.answer` ≤200 chars. Enforce before building, same discipline as existing Engage field limits (never let the renderer silently shrink text to fit).
7. **M7** — There is no runtime "should this lesson have a reveal" detection logic in `build.js`. Whether a slide gets a `reveal` box is decided entirely by the presence/absence of the `reveal` key in the authored JSON — no `reveal: false` flag needed, no auto-detection.
8. **M8** — `engage.content` (context) is optional and default-omitted for `reveal`-modified engage blocks. Only include it when there is genuine historical/real-world background worth adding. It must never be a manufactured "hint" sentence engineered to dance around the answer without revealing it — that failure mode is explicitly disallowed. Less is more; omit unless it adds real value.
9. **M9** — `engage.title` (the ENGAGE-bar label override) is optional and default-omitted. Only set it when the default variant label (e.g. "IN THE NEWS") genuinely doesn't fit, and keep it literal/plain — not a stylized or "clever" rewrite.
10. **M10** — Tone/word rules for `hook`, `reveal.question`, and `reveal.answer` text:
    - No em dashes anywhere.
    - No exam-command verbs or phrasing ("State...", "Calculate...", "Determine...", "Using [equation], compare...").
    - No slang or forced-casual tone ("OMG", "Bro", "you reckon").
    - Never supply the data/criteria needed to solve it (e.g. a given rate or measurement) — that turns a spoken hook into a written exam question.
    - Never narrate the mechanic ("Guess:", "have a guess before we find out") — the question already implies it.
    - Forced-choice/ABCD phrasing is only valid when real selectable on-screen options are shown — never fake multiple choice in prose alone.
    - The hook/question must actually be (or clearly imply) a question — not a flat statement with no throughline into the lesson.
    - The hook/question must not presume content not yet taught in this lesson — except in `revision`/`whiteboard` lesson types, where testing recall of already-taught content is the point.
    - `reveal.answer` must be written in the same teacher-voiced tone as the hook — not flat/textbook phrasing (e.g. not "well, in physics you've done the same work").
11. **M11** — `slide-options-v4.md` is updated with: the `reveal` schema (Inputs section above), the variant-selection guidance table (topic/hook shape → recommended variant + whether `reveal` fits), and the M10 tone rules, so future lesson-authoring sessions apply them without re-deriving from scratch.

## Nice-to-haves
1. **N1** — A worked example in `slide-options-v4.md` showing a full before/after conversion of an existing `news`-variant engage block (e.g. the aerosol-can lesson) into a `reveal`-modified one, as a reference pattern.

## Out of scope
- Any PowerPoint animation/transition generation in `build.js`.
- Automatic/heuristic detection of which lessons should default to a `reveal` box — this is always an authoring decision.
- Changes to the behavior of the 6 existing engage variants when `reveal` is absent.
- A `reveal: false` suppression flag — omission of the `reveal` key already suppresses it.

## Integration points
- `science-lesson/references/build.js` — `slideEngage()` (around line 532) needs the new Layout A/B branch, reusing `NAVY`, `GOLD`, and the existing `goldBox`/`reviewRow` box-drawing patterns for visual consistency with other navy/gold answer boxes in the deck.
- `science-lesson/references/slide-options-v4.md` — ENGAGE section (around line 40) needs the schema addition and new authoring guidance (variant table + tone rules).
- Per `CLAUDE.md`: since this changes `build.js` and `slide-options-v4.md`, the end-of-session skill packaging step is required — run `.\package-skill.ps1` and re-upload `science-lesson.skill` to claude.ai before the next school-side session.

## Success criteria
- A test lesson JSON with only `reveal.answer` set (no `reveal.question`) renders Layout B: hook top, optional context, full-width navy/gold reveal box at the bottom.
- A test lesson JSON with both `reveal.question` and `reveal.answer` set renders Layout A: large question + reveal box side-by-side in the bottom row.
- A test lesson JSON with no `reveal` key renders byte-for-byte the same as before this change (regression check).
- The aerosol-can example (`bug-test.json`, currently `news` variant) is manually converted to use `reveal` and visually confirmed by Patryk to look right in PowerPoint.
- `slide-options-v4.md` changes reviewed and approved by Patryk before packaging.
