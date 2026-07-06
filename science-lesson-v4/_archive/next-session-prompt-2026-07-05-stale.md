> **How to run this:** Follow this brief — start in Plan Mode, get my go-ahead on the sign-off items below, then once I approve the plan, build it end-to-end (edits only), keep `npm test` green, and repackage + remind me to upload the skill at the end.

---

Science-lesson suite — next session. Headline job: **Bug 54 — native flowchart/cycle diagrams** (flow/sequence Learn slides render as one flattened image → text clips and overlaps; rebuild them as real PPTX shapes/text boxes). Bundle the **image-description placeholder regression** re-investigation (cheap win). Use Plan Mode.

Read first (don't re-derive): memory `project-science-lesson` and `project-audit-2026-07-02`, and the `## Session log — 2026-07-05` + `## Session log — 2026-07-04` blocks in `science-lesson/references/backlog.md`.

Locked facts — do NOT re-ask / do NOT rebuild:

- **Mark-the-answers is DONE and corrected (2026-07-05).** Layout v2: question top, 3-section marking panel (INDICATIVE CONTENT → BANDS → EXCLUSIONARY CLAIMS) left, samples right; slide 2 = same frame with MARKS AWARDED. Panel names, underline-only-for-must-use-words, band exemption on the 6-mark rule, answer sheet without Do Now — all shipped. Do not redesign any of it unless I raise a new visual issue after teaching with it.
- **Learn caps verified (cap-test fixtures 2026-07-04/05):** the ONLY hard cap anywhere is 4 Learn slides on standard/practical/annotation; review/revision/whiteboard are uncapped; Build and Apply have NO caps. `captest-standard.json` / `captest-review.json` are in the project root — rebuild them to demo any renderer change on overflow content.
- **Equation state:** `parseEq` now runs `normSym` first (word operators + units convert in GUESS cells / hints / worked steps); `prettyText` covers all question/answer prose sinks. The known remaining gap is **PPTX stacked fractions** — the diagonal `a⁄b` is still the fallback because pptxgenjs has no Office Math. That's phase 3, listed below — do not touch unless it's the session's chosen scope.
- **Learn-G flow slides** already build via `buildLearnGSvg(steps, n)` + `LEARN_G_LAYOUTS` (a rendered SVG image — that IS Bug 54's flattening). Variant I (FLOWCHART) exists too. Grep before assuming anything is missing.

In scope (the cluster):
1. **Bug 54** — replace the rendered-SVG flow/cycle diagram with native PPTX shapes + editable text boxes (numbered step badges, connector arrows, W/zigzag layout preserved). Kill the text-clipping/overlap class of bug for good. Mock the layout (per step count 3–6) and get my sign-off BEFORE touching the renderer.
2. **Image-description placeholder regression** — "[Image — add imageDescription to JSON]" still appearing on a Learn slide. Reproduce with a fixture, confirm the original bug number, fix, add a harness guard.
3. **(If time)** eyeball-check pass: I'll have taught with the new markTheAnswers slides by then — collect my observations and log any polish items to the backlog rather than building unprompted.

Scope to get my go-ahead on before touching build.js: the Bug 54 native-shape layout (mock slide per step count), whether Learn-G (SVG zigzag) and Learn-I (FLOWCHART) merge into one native implementation or stay separate types, and what happens to existing lessons authored against the old shapes.

Constraints: Claude Code = edits only (runs on claude.ai). Use Plan Mode. Regression harness is `npm test` — must stay green (add a fixture/assertions for native flow shapes). If SKILL.md / build.js / slide-options-v4.md / worksheet-spec.md change, run `.\package-skill.ps1` at session end and upload `science-lesson.skill` to claude.ai.

Rest of the backlog (secondary — several need design sign-off before building):
- **Bug 33/53 phase 3** — true stacked fractions in PPTX (native shape pairs or MathML-in-image; diagonal ⁄ is the current fallback). Design decision needed.
- **Subject-specific top bars** — Chemistry (graphene/fullerene) + Biology (serotonin?) top bars instead of the one fixed Physics bar. Needs a scope decision (subject detection + image storage).
- **Practical + theory-review two-lesson pattern** — needs my decision on naming/sequencing (documented workflow vs new lessonType) before anything is built.
- **Do Now question bank** — fill for 7BYA / 7MLA / 9AB / 10C4 / 11C3 (bank only covers 8AB, 8XP, 10S2, 12D). Data task, not renderer.
