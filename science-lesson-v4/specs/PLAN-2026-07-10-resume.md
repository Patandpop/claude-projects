# Plan: Lesson audit + fixes, new-year system, exam-doc library (3 Fable days)

## COLD-START RESUME NOTES (read first after any compaction)

Working dir: c:\Users\magda\claude-projects\science-lesson-v4 (git repo root is the PARENT claude-projects; branch: fable-overnight; never push, never touch main). npm test must be green before any session ends; a PostToolUse hook auto-runs it on build.js edits. One commit per finished step + a row in CHANGELOG.md (plain English + revert hash). Patryk cannot read code: plain-English summaries, no em dashes in prose to him. Mock deck mock-visual-fixes.pptx (project root) = APPROVED design reference for P4. Sample exam doc for P7: "Physics - Atomic Structure - Nuclear Fission and Fusion.doc" (RTF inside) in the project root. After skill-source changes: .\package-skill.ps1 and remind Patryk to replace the .skill file in claude.ai (never "Projects"). First copy this whole plan to specs/PLAN-2026-07-10-resume.md and commit it so it is also in git.

## REVISED 2026-07-10 — layered delegation for token economy + P4 approval

Done so far (committed): P0 baseline 94fd7f7 · P1+P2 audit e994479 · P3 logic fixes a9a7d9c · P5 staging 3f2cc11 · P6 specs 00467e5. Remaining: P4 (NOW APPROVED — all three mocks), P7 (exam-doc parser), finish (test/package/report).

**Delegation model (Patryk-approved, "more layers"):**
- **Fable (orchestrator):** decisions, the Bug 59/60 renderer edits in build.js (delicate, house-style-sensitive), review of every delegated result, closing report.
- **Opus (middle layer):** the exam-doc library parser prototype — one self-contained brief (sample RTF in project root, structure already reconned: Q-paragraphs, lettered parts, right-aligned tariffs, "Mark schemes" split at ~line 4500, [FIG] blobs, examiner commentary). Opus may spawn its own Sonnet helpers for test iterations.
- **Sonnet (worker):** npm-test verification runs, demo-deck rebuilds, mechanical checks, spec-file assembly from dictation.
- No third-party orchestrator skill installed — the Agent tool's model parameter IS the mechanism; an installed skill would only add context weight.

**P4 (approved):** implement in build.js: (a) guessExample row weights [1,1,1.35,1,1.15], badge scales with row (55% capped 0.62"), prompt 15pt, aspect-locked triangle (w = 1.15h, padded); (b) triangle suppressed when equationSymbols has >3 entries or is absent — equation gets the full row at larger size; (c) practiceTriangle: per-question navy-fill gold-border ANSWER box under each question card (q 58% / answer 38% of card height), answers on the SAME slide, Patryk animates reveals. Rebuild captest/fraction demos; npm test; new harness assertion for the answer boxes.

**P7 (Opus brief):** references/exam-library.js + exam-library-index.json + specs/exam-doc-library.md per the original Phase 7 section below; parser fails loudly; join coverage reported; never invents answers; unit test wired into npm test.

## Context

Patryk has Fable for ~3 more days. Confirmed priority: (1) audit the recent lessons and fix what it surfaces, (2) stage the 2026/27 system, (3) exam-doc library spec + prototype. Recon (two Explore agents) already inventoried the 7 recent lessons (4 from lessons-2026-07-08.json + 3 from lesson-content.json 2026-07-07), the new memory state, and repo status. Interview rulings locked (3 rounds, all recorded below).

Locked rulings: audit scope = local 4 + JSON (recon added the Jul-7 three for free); logic fixes automatic test-gated; visual fixes mock-first with same-day sign-off; PTO suffix dropped from uploader, matchers accept legacy; image-dump slide ALWAYS wanted at deck end (bug = it sometimes missing; assets also belong in the folder); Do Now = exactly 6, hard rule; content violations get a loud CONTENT CHECK report at build (warn, never block); the new `science-lesson-use-to-check-memory-and-log.skill` gets inspected for fallen-through memory/goal content, extracted, then archived; 2026/27 config STAGED (flip in September); Apps Script uploader = spec + manifest side + ready-to-paste .gs; behaviour tracker + morning-message-as-workload-direction = specs now.

## Phase 0 — Baseline checkpoint

Commit current uncommitted state on `fable-overnight` branch (backlog.md 07-08 paste, rebuilt science-lesson.skill, lessons-2026-07-08.json + sidecars; heavy media stays untracked via existing .gitignore). CHANGELOG.md rows continue for every checkpoint.

## Phase 1 — Inspect the new .skill package, then archive it

Unzip `science-lesson-use-to-check-memory-and-log.skill` read-only. Diff its SKILL.md/memory-log/goal-log content against repo SKILL.md + backlog + memory. Extract anything not yet captured — especially 2026/27 classes/sizes/sharing/timetable and any goals that "fell through the cracks". Then move the package to `_archive/` (never hard-delete).

## Phase 2 — Audit report (AUDIT-2026-07-09.md in project root)

Grade the 7 recent lessons against Patryk's §7 discrepancy checklist + recon findings. Per item: status (renderer-fixed / authoring-failure / broken / needs-check), which builder version built it, evidence. Known already from recon: renderer markers clean in all 4 decks (no raw \times, no ⁄, no placeholder text, no ✎); IMAGE DUMP present in the 4 but its absence elsewhere is the defect per Patryk; content-discipline failures = 0-1 MCQs (rule: 4), Apply 2/1/1 (rule: ≥3), NO review sections at all, Do Now 5 (new rule: 6), 3 of 4 lessons missing Drive meta so never uploaded/logged. Remaining deep checks: worksheet keywords-table prefill (item 6), Learn-H worksheet questions (item 7, in Resources & Recycling), nav-tab colour, purple-pen single-tier, tier pills, dead ruled lines — verify against output XML where cheap, else against current build.js code (most were fixed 07-04/05; harness guards exist).

## Phase 3 — Logic fixes (test-gated, one commit per fix group)

- **F1 image-dump always-on:** `slideImageDump` (build.js ~line 2712) currently renders only when `image_dump.images` or referenceData graphs exist. Change: collect EVERY embedded image used in the lesson (engage/learn/practical `embeddedImagePath`, graph PNGs, image_dump.images) and always append the dump slide when any exist. Keep generated assets (graphs) written into the lesson output folder as files too.
- **F2 CONTENT CHECK block:** new validation pass in the build loop printing per lesson: MCQ count = 4, Apply ≥3 per tier, review arrays mirror Apply lengths, Do Now = 6, image placeholders carry imageDescription, Drive meta complete (else "will not upload"), ≤1 cloze-type worksheet extra. ✗/✓ lines, loud, never blocks. Mirror the rules in SKILL.md (incl. Do Now "exactly 6" replacing "min 4") so claude.ai self-checks.
- **F3 PTO drop:** upload-to-drive.js stops adding `_PTO` to Drive copies; daily-brief.js `folderFiles` matches both suffixed and clean names. CLAUDE.md/SKILL.md references updated.
- **F4 upload-path mismatch (Space → P4 Earth in Space):** uploader error now lists the actual macrotopic folders that DO exist under the Year/Subject dir ("did you mean…"), still never creates. SKILL.md authoring rule: meta.macrotopic must exactly match the Drive folder name.
- **F5 backlog 07-08 warn items:** missing-imageDescription warning, source-image extraction guard (warn when source-images/ exists but no embeddedImagePath was set), timeline (Learn-K) per-event image support if small, Bug 59 item 5 (GUESS S-rows through parseEq — separable logic).
- Each fix gets a harness assertion where the class of bug allows it. npm test after every build.js edit (hook enforces anyway).

## Phase 4 — Mock-first visual pass (Bug 59 + Bug 60)

Build a mock deck to the project root: corrected guessExample proportions/letter scale, aspect-locked formula triangle, triangle suppressed when >3 symbols, practiceTriangle navy/gold answer boxes under each question. Patryk approves in chat → implement in build.js → rebuild captest/fraction demos + npm test. If not approved, iterate once; if still not, log and move on.

## Phase 5 — New-year (2026/27) staging — nothing flips until September

- `classes-2026-27.json` in project root: every class from the interview chat (7MLA sole-teacher size TBC, 8XP 32 + Ms S Sole Wed P2 both weeks, 8AG 32 + Mr L Hollis Tue P4/Thu P3 (Chem specialist, likely Bio too → Patryk Physics), 9AS 32 + Ms A Milland Mon P5 (she takes Bio), 9XS 32 sole, 10C2 23 + Ms B Cox Wed P1 + Ms R Bala Tue P2 & Fri P3 (B), 10S2 29 physics-only, 11S2 32 physics-only, 12C TBC half-content, 13D ~23, PSHE-9AB 25 fortnightly Wed P5 Week A; specialism rules; KS3 vs KS4/5 period/break structure incl. the calendar's KS3-P2 mislabel note; lessons-per-fortnight table).
- CLAUDE.md: short "2026/27 staged" section pointing at the file; current class table stays live until September.
- `specs/next-year-system.md`: folder structure (YEAR GROUP → topic → lesson, no class layer; dual-version standard+support from one content object), scheme-of-learning.json schema (placeholder — BLOCKED on Patryk supplying the trust SoL, stated in the spec), the two UNRESOLVED questions (parallel-class folders; fresh root vs continue) left explicitly open.
- Apps Script uploader: build.js emits `manifest.json` sidecar per build (files + intended Drive folder path, reusing existing naming logic); `references/appscript-uploader.gs` ready-to-paste web app (idempotent by filename+size, failure-tolerant, logs) + deployment walkthrough in the spec, plain English. Not deployable from here (school account) — clearly marked.

## Phase 6 — September specs

- `specs/behaviour-tracker.md`: read `behaviour_tracker_term1.docx` first; negatives on a 2-week cycle → call-home suggestions, brief-log data model, thresholds, feeds the morning brief.
- `specs/morning-brief-workload.md`: brief's purpose restated as workload DIRECTION (even distribution across free periods, 2-week horizon), pulling behaviour tracker + homework + marking rota.

## Phase 7 — Exam-doc library (spec + working prototype)

- `specs/exam-doc-library.md`: full design from Patryk's §3-§5 (library not merged paper, PART granularity, Q+part join to real mark scheme, command-word/tariff ranking, figure-free v1, examiner-report layer later, usage tracking, index-once + cache, spec-version tags, NEVER invent answers — no MS match = flag; parser fails loudly; generalises to Chem/Bio/OCR later).
- Prototype `references/exam-library.js`: parse the sample doc in the project folder ("Physics - Atomic Structure - Nuclear Fission and Fusion", RTF format) → `exam-library-index.json` (per part: topic code, Q number, part letter, command word, marks, text, figure-flag, mark-scheme text + level descriptors). Validation output for Patryk to eyeball. Unit test with the sample. No build.js integration yet — that's application #1 for a later session.

## Finish

npm test green, `.\package-skill.ps1`, CHANGELOG rows per checkpoint, memory updates (new-year staging, audit outcomes, library prototype state), plain-English closing report with revert hashes.

## Verification

- npm test after every build.js change (PostToolUse hook enforces); new assertions for image-dump-always, CONTENT CHECK output, PTO-free uploader naming.
- Audit deliverable: AUDIT-2026-07-09.md, findings reproducible (each cites the file + marker checked).
- Rebuild one real lesson (Eclipses) end-to-end with NO_UPLOAD=1 into scratchpad → confirm image-dump slide present, CONTENT CHECK block prints the known violations.
- Uploader --dry-run against a synthetic lesson with wrong macrotopic → shows "did you mean" list, still refuses creation.
- exam-library.js run against the sample doc → index JSON + human-readable summary; join coverage reported (parts with/without matched mark scheme).
- Mock deck approval is the gate for Phase 4 renderer changes.
