# Spec: Test Review Lesson Generator

## Overview
Generates a complete test review lesson for a class after a marked test. Patryk inputs the core and extend test PDFs (read from `Admin/Assessment/` on Drive, or provided directly). The system reads the EBI tick table from the extend test front cover to identify subtopics. It then builds: a PowerPoint (Do Now → visualiser prompt → review task intro) and two worksheets — one per test tier (core / extend). Each worksheet has a student EBI tick grid on the front, then per-subtopic question sets (3 core question sets + extend questions on the back), all different from the test questions. The Drive folder `Lesson [n+1] - [Topic] Review` is created by this script — the only case where folder creation happens.

---

## Inputs

- **Test PDFs** — core and extend versions for the topic. Read from `G:\My Drive\Beechen Cliff Science\Admin\Assessment\Year [X]\[Topic]\` or passed as arguments. Extend PDF must include front cover with EBI tick table (Q1–Q5 or similar, listing subtopic descriptions per question).
- **Lesson metadata** — year group, class(es), topic name, lesson number of the preceding test lesson. Used to name the Drive folder and output files.
- **`references/textbook-index.md`** — for book references per subtopic (Activate 1, Activate 2, KS4 book). If a subtopic isn't in the index, that field is left blank.
- **`context.json`** — to confirm which class(es) this review is for and which tier each class sits on (core or extend).
- **`upload-log.txt`** — to find the preceding lesson number for folder naming.

---

## Outputs

- **`[Topic]_test_review_PTO.pptx`** — review lesson PowerPoint
- **`[Topic]_test_review_core_worksheet.docx`** — worksheet for core test students
- **`[Topic]_test_review_extend_worksheet.docx`** — worksheet for extend test students
- **Drive folder created**: `G:\My Drive\Beechen Cliff Science\Lessons\Year [X]\[Subject]\[Macrotopic]\Lesson [n+1] - [Topic] Review\`
- All three files copied into that folder automatically (via upload-to-drive.js pattern)
- Appended to `upload-log.txt`

---

## PowerPoint slide structure

1. **Do Now** — 5 recall questions drawn from a DIFFERENT topic to the test (not the topic just assessed). Questions come from `references/question-bank/[class].json` or generated from prior topics. Standard Do Now layout.
2. **Do Now Review** — model answers for each Do Now question. Standard review slide layout.
3. **Visualiser slide** — simple prompt: "Get out your marked test. We're going through it now." Teacher uses physical visualiser — no answer reveals needed on slides. Clean slide, not a wall of text.
4. **Review Task intro slide** — "Look at your EBI tick sheet. Find your ticked subtopics. Work through those question sets first. Begin in silence." Timer: 10–12 minutes silence, then whisper/quiet. If finished: put hand up to help others.

No per-question reveal slides — review happens via visualiser. Slides are intentionally minimal. Info is structured, not dumped in one text box.

---

## Worksheet structure (both tiers follow same layout)

### Front page — EBI tick grid
- Rows: Student 1 → Student [max class size], in register order (anonymised)
- Columns: one per subtopic (e.g. Q1 Circulatory system | Q2 Gas exchange | Q3 Tumours | Q4 Cells & organisation | Q5 Digestion & enzymes)
- Patryk fills ticks when marking. Students use this to navigate to their question sets.
- Subtopic names + book reference shown in column headers: book name + page number + section title (from textbook-index.md; left blank if not found)

### Review table (built 2026-10-29, workplan 2.11)
- The worksheet opens with one row per section of the test: Question, Section, Marks available, Your marks (pupil writes it), EBI (tick), and a Total row.
- Marks available come from `subtopics[].marks` in the content JSON (Claude reads them off the paper). Without marks the column is left out.
- The same marks show in each section heading ("Q3: Waves (12 marks)") and on the slide 4 chips.

### Question sets (core side — side A)
For each subtopic:
- **Subtopic header** — name, book reference (if available)
- **Set 1, Set 2, Set 3** — 3 sets of questions, same subtopic but DIFFERENT from test questions. Easier to harder progression within the set. Question types match the test style (MCQ, short answer, diagram label, explain, calculate as appropriate for topic).
- Students do the sets for their ticked EBI subtopics

### Extend tasks (extend side — side B)
For each subtopic:
- **Subtopic header** — same as side A
- Harder questions on the same subtopic — DIFFERENT from the test questions AND different from the core question sets
- These are extension-level: require explanation, application, data analysis, or evaluation

### Core worksheet vs Extend worksheet
- The extend test has the same question count as the core test. It drops the first 2 easiest questions and replaces them with 2 harder questions at the end. So extend students have not seen the easiest question types — their review questions can assume higher prior exposure.
- **Core worksheet**: question sets calibrated to core-level difficulty, including the easier question styles from the core test.
- **Extend worksheet**: question sets pitched higher throughout — no simplest-tier questions. Extend side harder again.
- Both worksheets cover ALL subtopics — students use EBI ticks to choose which ones to work on.

---

## Must-haves

- **M1** System reads the extend test PDF front cover to extract subtopic names and question numbers. These become the column headers for the EBI tick grid and the section headers for question sets.
- **M2** Core test PDF is also read to understand question style and difficulty calibration — generated questions must not duplicate any test question.
- **M3** Generated questions are topically identical to the test subtopics but textually distinct. Never reuse a test question verbatim or with trivial rewording.
- **M4** Extend questions are harder than core questions for the same subtopic, and different from both the test and the core question sets.
- **M5** Book references (book name, page range, section title) appended to subtopic headers on both worksheets and in slide 4. If not in textbook-index.md, field is left blank — never invented.
- **M6** KS3 topics use Activate 1 or Activate 2 (or both if topic spans both — order sheet should list both books). KS4 topics use the KS4 book. Reference is: book name + "pp.[X–Y]" + section title.
- **M7** Do Now uses questions from a DIFFERENT topic to the test. Drawn from question-bank for that class, or generated from a prior topic if bank is empty for a suitable topic.
- **M8** Drive folder `Lesson [n+1] - [Topic] Review` is created inside the correct macrotopic folder. Folder name uses the lesson number immediately following the test lesson (read from upload-log.txt or passed as argument).
- **M9** All three output files are copied into the Drive folder on completion.
- **M10** Visualiser slide is clean — a brief instruction, not a wall of text. No auto-generated Q&A on the slides.
- **M11** EBI tick grid rows go from Student 1 to Student [N] where N = class size from context-standing.json. If class size unknown, default to 30.
- **M12** Silence/whisper instruction and timer (10–12 min silence) included on the review task intro slide.
- **M13** "If you've finished, put your hand up to help others" shown on review task intro slide.
- **M14** Both worksheets (core + extend) are always built. Never build only one.

---

## Nice-to-haves

- **N1** After generating questions, print a summary for Patryk to review before writing output: subtopics found, question count per set, any book references missing. Confirm before building.
- **N2** `--dry-run` flag: shows what would be built (subtopics, question count, Drive path) without writing files.
- **N3** If both core and extend PDFs have front covers with EBI tables, cross-reference them to verify subtopics align. Warn if they differ significantly.

---

## Out of scope

- Automatically reading student EBI responses (Patryk fills the tick grid manually when marking).
- Marking or scoring — this generator produces the lesson materials, not the markbook.
- Cover sheet / lesson plan — that's the cover lesson generator (separate spec).
- Generating mark schemes for the review questions.
- Any slide other than the four defined — no per-subtopic reveal slides.

---

## Integration points

- `G:\My Drive\Beechen Cliff Science\Admin\Assessment\Year [X]\[Topic]\` — test PDF source (future; for now PDFs can be passed as CLI args).
- `upload-log.txt` — to determine lesson number N (test lesson) so review folder = Lesson [N+1].
- `science-lesson/references/upload-to-drive.js` — reused to copy files to Drive and append to upload-log.txt.
- `references/textbook-index.md` — book references per topic.
- `context.json` — which class(es), which tier.
- `context-standing.json` — class size for EBI tick grid row count.
- `references/question-bank/[class].json` — Do Now question source.
- `build.js` patterns — use existing docx/pptx rendering helpers for slide and worksheet layout; do not build a separate renderer.

---

## Success criteria

- Running the generator on the Organisation Year 9 example produces: a PPTX with 4 slides (Do Now, review, visualiser, intro), a core worksheet and extend worksheet, each with EBI tick grid + 5 subtopic sections (3 question sets each, extend side).
- Subtopic names on the worksheet match what's on the extend test front cover exactly (Circulatory system, Gas exchange, Tumours, Cells & organisation, Digestion & enzymes for Organisation).
- No generated question duplicates a question from either test PDF.
- Drive folder `Lesson [n+1] - Organisation Review` is created in the correct Year 9 Biology macrotopic folder.
- Book references appear in subtopic headers where the topic is in textbook-index.md; blank where it isn't.
- Patryk can run this within 15 minutes of triggering, including review of the N1 confirmation summary.
