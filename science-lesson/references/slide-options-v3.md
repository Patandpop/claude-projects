# slide-options-v3.md
# Science Lesson Skill — Complete Reference
# Version 3.0 — LOCKED
# This file loads on demand from SKILL.md only

---

## WORKFLOW — every session

```
1. PROMPT for previous lesson slides upload
   "Do you have the previous lesson's slides? Upload them for better
   Do Now questions and content continuity." — optional but always ask.
   If uploaded: extract key terms, diagrams, content taught.
   Use to generate Do Now questions and avoid repeating content.

2. CLARIFY lesson brief
   - Class (infer ability + exam board from class name)
   - Topic area + lesson title
   - Position in unit (first lesson / mid-series / pre-assessment)
   - Lesson type (standard / practical / revision / cover)
   - Worksheet needed? Which sections?

3. PRESENT slide plan (text only) → wait for approval before building

4. BUILD PPTX via html2pptx
   Generate ALL content into one content object first.
   PPTX draws from content object. Worksheet draws from same object.
   Nothing is written twice.

5. BUILD worksheet if confirmed (draws from content object, reformats only)

6. present_files → teacher downloads and uploads to Drive manually
```

---

## CLASS PROFILES

| Class | Year | Ability | Exam board | Worksheet default |
|---|---|---|---|---|
| 7BYA | 7 | Mixed | AQA | Do Now + Build + Apply |
| 7MLA | 7 | Mixed | AQA | Do Now + Build + Apply |
| 8AB | 8 | Higher | AQA | Apply only |
| 8XP | 8 | Mixed lower | AQA | Do Now + Build + Apply |
| 9AB | 9 | Higher | AQA | Apply only |
| 10S2 | 10 | Higher triple | AQA | Apply only |
| 11C3 | 11 | Mid | AQA | Build + Apply |
| 10C4 | 10 | Mid | AQA | Build + Apply |
| 12D-Phy | 12 | Higher | OCR Physics A | Apply only |

Worksheet default is a starting point — teacher overrides at brief stage.

---

## GLOBAL RULES

**Single periods only.** No double lesson logic.

**SUGGEST system.** For any slide marked [SUGGEST], Claude generates
3 specific options drawn from topic knowledge or uploaded slide context
before building. Teacher picks one or provides their own.

**Step plan first.** Always present the full lesson plan in plain text
and wait for approval before writing any code.

**Content object.** All lesson content (questions, tasks, scaffolds)
is generated once into a single object. PPTX and worksheet both draw
from it. No regeneration.

**Learn→Build cycles.** When Claude spots two distinct concepts that
need separate treatment, suggest a double cycle (Learn→Build→Learn→Build)
before proceeding. Rare — do not default to it.

**Required practicals.** When the lesson topic matches a known required
practical for the exam board, LEARN-LAB-METHOD becomes mandatory and
LEARN-RISK-ASSESSMENT is always appended to it.

**6-marker rule.** Required practical lessons always end with a 6-marker style question in the Apply section. For standard lessons, a 6-marker appears in the Mastering tier by default but is not mandatory.

**Exam question style.** Apply questions follow AQA command words and
mark scheme format for all classes except 12D-Phy (OCR Physics A).

---

## DESIGN SYSTEM

**All slides:**
- Font: Trebuchet MS throughout. Minimum 16pt content.
- Nav bar: #0D1B5E navy, always identical across all slides
- Title text in nav bar: #FABB2E gold
- Stage strip: 6-8px band below nav bar in stage colour

**Do Now slides:**
- Entire content area: #0D1B5E navy (full dark slide)
- Question badges: #FABB2E gold fills
- Stage strip: #25408D
- LO strip: #25408D background

**All other slides:**
- Content area background: #EDF2FA light blue-grey
- Stage colour used as: filled panel headers, box top borders,
  section label chips, numbered step badges
- Dark panels (#0D1B5E) used for diagram areas and callout boxes
- Text on dark panels: #D4E8FF (light enough to read projected)

**Stage colours:**
| Stage | Hex |
|---|---|
| Do Now | #25408D |
| Engage | #18834B |
| Learn | #FABB2E |
| Build | #FE7B21 |
| Apply | #E42431 |
| Visualiser | #4A148C |
| Review (Developing) | #1E8C3A |
| Review (Reaching) | #D46B00 |
| Review (Mastering) | #C0161A |

**Visualiser slide:** always generated after Apply, always purple #4A148C.
Blank projection space. Always present regardless of lesson type.

---

## STAGE 1 — DO NOW

Default: 5 questions. Full navy slide. FABB2E badges.
Lower ability classes: some of the 5 questions in scaffolded format.
First lesson on a topic: questions draw from related prior topics, not current topic.

| Code | Status | Condition |
|---|---|---|
| DO-NOW-RECALL | USE | Default. Always base format unless specified |
| DO-NOW-CORRECT | USE | Instruction in LO strip. Q1–5 all mistake statements. Errors highlighted. [SUGGEST] 3 error options |
| DO-NOW-TRUE-FALSE | MAYBE | Scaffolded starter. Lower ability only. "Write T or F in your book." Never circle on slide. [SUGGEST] |
| DO-NOW-FILL-THE-GAP | MAYBE | Scaffolded. Good paired with recall for mixed ability |
| DO-NOW-UNIT-CONVERT | USE | Single question only, one of the five |
| DO-NOW-KEYWORD-DEFINITION | USE | Either direction. Keyword → definition or reverse |
| DO-NOW-SPOT-THE-ERROR | USE | Full calculation shown line by line. One line contains error. Claude generates working |
| DO-NOW-RETRIEVAL-GRID | MAYBE | Needs scaffolding (topic labels, sentence starters). Too open without support |

---

## STAGE 2 — ENGAGE

Hook before teaching. [SUGGEST] generates 3 specific options from topic knowledge
or uploaded slides for every engage type. Teacher picks one.
No multiple-choice options on engage slides — just the claim/question and a response prompt.

| Code | Status | Condition |
|---|---|---|
| ENGAGE-IMAGE | USE | Full or half slide. One open question. [SUGGEST] image search terms |
| ENGAGE-MISCONCEPTION | USE | Bold claim displayed. Key word chips. "Do you agree? Write before we discuss." Return to answer end of lesson. [SUGGEST] |
| ENGAGE-DISCREPANT-EVENT | USE | Surprising demo result described in words. Students explain before reveal. [SUGGEST] 3 examples |
| ENGAGE-SCENARIO | USE | Short real-world paragraph hook. [SUGGEST] |
| ENGAGE-PREDICTION | USE | Students commit to written prediction. Needs follow-up reveal later in lesson |
| ENGAGE-BIG-QUESTION | USE | Ethical or philosophical question. Think alone + link to science prompt. [SUGGEST] |
| ENGAGE-NEWS-HEADLINE | USE | Real or realistic headline. Two prompts: what science is involved + predict today's lesson. [SUGGEST] |
| ENGAGE-SCIENTIST-STORY | USE | Short narrative. Good for topics with clear discovery moment. [SUGGEST] |
| ENGAGE-VIDEO-PROMPT | MAYBE | See VIDEO INTEGRATION SPEC below |
| ENGAGE-PRIOR-KNOWLEDGE | MAYBE | Mostly no. Only if genuinely useful for the specific topic |
| ENGAGE-ANALOGY-INTRO | NO | — |

---

## VIDEO INTEGRATION SPEC

Applies to: ENGAGE-VIDEO-PROMPT, LEARN-VIDEO-SIDE-QUESTIONS

Teacher provides: YouTube URL or video title + runtime.
Teacher optionally pastes transcript.

If transcript pasted:
- Claude reads it, identifies key concept moments
- Questions placed at real content-significant timestamps

If no transcript:
- Claude generates questions from topic knowledge
- Spaced evenly across early / mid / late sections

Slide layout:
- Video embed or placeholder on left (YouTube URL shown clearly)
- Questions panel on right with timestamps
- Key word chips at bottom of questions panel
- Instruction: "Watch and answer the questions in your book as you go"

Following slide (always generated automatically):
- Same questions numbered
- Model answers drawn from transcript or topic knowledge

Worksheet:
- Video questions always go on the worksheet regardless of class ability
- Questions listed with timestamp and answer space below each

---

## STAGE 3 — LEARN

Content delivery. Dual coding is gold standard.
Lab method always four-panel (apparatus / method / risk / results table).
Risk assessment is always an add-on to lab method, never standalone.

| Code | Status | Condition |
|---|---|---|
| LEARN-DUAL-CODING | USE | Text + diagram side by side. Students annotate. Default for explanation slides |
| LEARN-STEP-BY-STEP | USE | Numbered stages with pause prompts. Good for processes |
| LEARN-WORKED-EXAMPLE-PAIR | USE | Worked example shown. Second example has deliberate gaps for students to complete |
| LEARN-LAB-METHOD | USE | Four-panel: apparatus / method / risk / results table. Teacher supplies practical name and key variables. Mandatory for required practicals |
| LEARN-RISK-ASSESSMENT | USE | Always add-on to LEARN-LAB-METHOD. Never standalone |
| LEARN-KEYWORD-ETYMOLOGY | USE | Scientific terms broken down by Latin/Greek roots. Good for vocab-heavy topics |
| LEARN-VIDEO-SIDE-QUESTIONS | MAYBE | See VIDEO INTEGRATION SPEC above |
| LEARN-STAGED-DIAGRAM | MAYBE | Diagram built element by element. Use for complex multi-part diagrams |
| LEARN-HISTORY-OF-IDEA | MAYBE | Only for topics with explicit historical context (atomic models, germ theory, plate tectonics) |
| LEARN-ZOOM-IN-OUT | MAYBE | Macro → micro or reverse. Scale-based topics only |
| COMPARE-CONTRAST | MOVED → BUILD | — |
| MISCONCEPTION-ADDRESSED | MOVED → BUILD | — |
| RESULTS-ANALYSIS | MOVED → BUILD | — |
| CONCLUSION-SCAFFOLD | MOVED → BUILD | — |
| MODELLING-WITH-GAP | MOVED → BUILD | — |
| LEARN-CORNELL-NOTES | NO | — |
| LEARN-PAUSE-AND-PREDICT | NO | — |
| LEARN-POST-VIDEO-RETRIEVAL | NO | — |
| LEARN-TEACHER-TALKS-SKETCH | NO | — |
| LEARN-ANALOGY-BREAKDOWN | NO | — |

---

## STAGE 4 — BUILD

Guided practice. Can cycle back to Learn (rare — Claude suggests when appropriate).
GUESS framework for all calculation scaffolds.
Word banks always include distractor items (mark ✗ on the word bank).
Think-pair-share always includes four linguistic sentence starters.

| Code | Status | Condition |
|---|---|---|
| BUILD-CLOZE | USE | Higher ability: fewer blanks, no word bank, more open. Lower ability: word bank always included |
| BUILD-DIAGRAM-LABEL | USE | Pre-drawn diagram, students add labels |
| BUILD-CALCULATION-SCAFFOLD | USE | GUESS framework: Given / Unknown / Equation / Substitute / Solve |
| BUILD-SORT-CATEGORISE | USE | 2+ sort zones. Rich word bank with distractor items marked ✗ — more keywords is what matters, not number of zones. [SUGGEST] |
| BUILD-MATCHING | USE | Terms to definitions, causes to effects. Claude generates pairs [SUGGEST] |
| BUILD-TABLE-COMPLETE | USE | Partially filled data table |
| BUILD-ANNOTATE-DIAGRAM | USE | Labels placed, students add explanations |
| BUILD-GRAPH-INTERPRET | USE | Graph provided, students answer interpretation questions |
| BUILD-THINK-PAIR-SHARE | USE | Includes four linguistic starters: "I agree…" / "I would add…" / "I would challenge…" / "I have a question…". No specific timings on slide — teacher controls |
| BUILD-COMPARE-CONTRAST | USE | Two-column or Venn [MOVED from Learn] |
| BUILD-MISCONCEPTION-CONFRONT | USE | State misconception, students identify what's wrong and correct it [MOVED from Learn] |
| BUILD-RESULTS-ANALYSIS | USE | Data table + pre-drawn axes + analysis questions. Follows LEARN-LAB-METHOD [MOVED] |
| BUILD-CONCLUSION-SCAFFOLD | USE | Sentence starters for conclusion and evaluation [MOVED] |
| BUILD-MODELLING-WITH-GAP | USE | Second worked example with deliberate gaps. Follows LEARN-WORKED-EXAMPLE-PAIR [MOVED] |
| BUILD-ODD-ONE-OUT | USE | 4 terms, multiple defensible answers. Good learning check [MOVED from Do Now] |
| BUILD-SEQUENCE | USE | Shuffled process steps, students reorder [MOVED from Do Now] |
| BUILD-EQUATION-REARRANGE | USE | Scaffolded. Not for Do Now — Build only [MOVED] |
| BUILD-MCQ-SCAFFOLD | USE | MCQ where each distractor maps to a specific student error. Used as Developing tier option within a tiered Build task |
| BUILD-POE | MAYBE | Predict → Observe → Explain. Only for lessons with explicit demo |
| BUILD-DIAGRAM-DRAW | MAYBE | Students draw from description or memory. Rare |
| BUILD-GRAPH-DRAWING | MOVED → APPLY | — |
| BUILD-PEEL-PARAGRAPH | NO | — |
| BUILD-OWN-ANALOGY | NO | — |

---

## THINK-PAIR-SHARE SPEC

Slide must include:
1. Discussion prompt [SUGGEST]
2. Think instruction (write alone first)
3. Pair instruction (discuss together)
4. Share prompt (to the class)
5. Linguistic scaffold panel — four starter phrases displayed clearly:
   - "I agree with ___ because…"
   - "I would add to that by saying…"
   - "I would challenge that because…"
   - "I have a question about…"

No specific timings on slide. Teacher controls pace.

---

## STAGE 5 — APPLY

Independent work. Tiered default. 3 questions per column where space allows.
Mastering tier always ends with a 6-marker style question.
Exam questions follow AQA style (OCR for 12D-Phy).
MCQ distractors used as Developing tier option — each wrong answer maps to a specific student error.

| Code | Status | Condition |
|---|---|---|
| APPLY-TIERED | USE | Developing / Reaching / Mastering. 3 questions per column. Default |
| APPLY-EXAM-QUESTION | USE | Past paper or Claude-generated. MCQ distractors as Developing. Open response for Reaching/Mastering. [SUGGEST] 3 question options |
| APPLY-DATA-ANALYSIS | USE | Table or graph provided, interpret and evaluate |
| APPLY-DESIGN-EXPERIMENT | USE | Given a question, students plan investigation. Must include scaffolding |
| APPLY-EXTENDED-WRITING | USE | 6-marker type. Sentence structure guidance included |
| APPLY-EVALUATE-METHOD | USE | Flawed method shown, students identify and improve. Good Mastering task |
| APPLY-PREDICT-EXPLAIN | USE | New unfamiliar context, apply learned concept |
| APPLY-ERROR-ANALYSIS | USE | Wrong working shown, students find and fix. Maths/calculation topics only |
| APPLY-MODEL-ANSWER-CRITIQUE | USE | Mark scheme answer shown, students annotate quality and rewrite |
| APPLY-PEER-TEACH | USE | Students write explanation for a younger student. Mastering. Light scaffolding |
| APPLY-GRAPH-DRAWING | USE | Axes given or to be chosen. Apply stage only [MOVED from Build]. Graph generated by Claude if needed — not always pre-provided |
| APPLY-TRANSFER | USE | Genuinely unfamiliar context. Claude checks the context is truly novel |
| APPLY-MCQ-SCAFFOLD | USE | See MCQ DISTRACTORS SPEC below |

---

## MCQ DISTRACTORS SPEC

Each wrong answer maps to a specific predictable student error.
Example for F = ma rearranged to find m (F = 3000N, a = 2m/s²):
  A) 1,500 kg ← correct
  B) 6,000 kg ← multiplied instead of divided
  C) 667 kg ← inverted the division (a÷F)
  D) 1,502 kg ← added instead of dividing

Used in two contexts:
1. APPLY-TIERED: as the Developing tier question
2. REVIEW-MCQ-DISTRACTORS: as the end-of-lesson diagnostic check

---

## STAGE 6 — VISUALISER

Always generated. Always after Apply. Purple #4A148C.
Blank projection space. No content. No conditions.
Slide must contain a clearly visible clickable hyperlink:
https://apps.ipevo.com/pwa/visualizer.app/

---

## STAGE 7 — REVIEW

Primary function: go through Build and Apply answers together.
Secondary function: exit check (one of the formats below).
Always show full working for calculation answers.
Common mistakes column on answer slides.

| Code | Status | Condition |
|---|---|---|
| REVIEW-BUILD-ANSWERS | USE | Primary. Shows worked answers to Build tasks. Common mistakes column. Always first |
| REVIEW-TIERED-EXIT | USE | Green / Amber / Red exit questions. Default exit check |
| REVIEW-MCQ-DISTRACTORS | USE | Most diagnostic. Each distractor maps to specific error. [SUGGEST] |
| REVIEW-TRUE-FALSE | USE | 4–6 statements with justification revealed |
| REVIEW-AGREE-DISAGREE | USE | 2–3 statements — one correct, others misconceptions. Students commit then discuss |
| REVIEW-CORRECT-MODEL-ANSWER | USE | Flawed written answer shown, students find errors |
| REVIEW-CONFIDENCE-GRID | USE | Learning objectives listed, students self-rate 1–5 |
| REVIEW-ONE-SENTENCE-SUMMARY | USE | Students write per objective before reveal |
| REVIEW-ODD-ONE-OUT | USE | Quick whole-class check |
| REVIEW-HEXAGONAL-LINKS | MAYBE | 6 key words, connections explained. Better for end-of-topic |
| REVIEW-DIAGNOSE-MISCONCEPTION | MAYBE | Student dialogue shown, students judge. Complex to generate well |
| REVIEW-MINI-WHITEBOARD | MAYBE | Numerical answer, all show simultaneously. Needs MWBs available |

---

## WORKSHEET RULES

**One version only.** Scaffold is always present. Students who don't need it self-select past it.
**No homework.** Out of scope.
**Content object.** Worksheet draws from the same content object as the PPTX. Nothing regenerated.

**Section selection logic:**

```
Class ability profile → baseline sections
      +
Lesson type → modifies included sections
      +
Slide-impossible content → always appended
      =
Final worksheet
```

**Slide-impossible content** (always on worksheet regardless of class/lesson):
- Exam questions needing a full page of writing space
- Complex diagrams to label or complete
- Extended data tables
- Anything needing more room than a 16:9 slide

**Lesson type modifiers:**

| Lesson type | Modification |
|---|---|
| Standard | Follow class ability default |
| Practical | Always include: results table, analysis questions, conclusion scaffold |
| Revision / cover | Full question bank regardless of ability. Worksheet carries the lesson |
| Pre-assessment | Heavy Apply / exam questions. Minimal other sections |
| Video lesson | Always include video questions section regardless of ability |
| First lesson on topic | Do Now section draws from related prior topics on worksheet too |

**Worksheet house style:**
- A4, double-sided
- Font: Libre Baskerville
- Navy page border: size 55, space 5, margin 500 DXA
- Left and right navy side bars on all pages
- Page 1: full-width starfield header strip (follow starfield-spec.md exactly)
- Level badges: Developing #1E8C3A / Reaching #D46B00 / Mastering #C0161A
- One scaffold type per question, consistent throughout. Never mix within same question.
- Developing questions almost always include a word bank.
- No name/class/date header. No AI-sounding phrasing. Write as a teacher would.

---

## CONDITIONAL LOGIC SUMMARY

| Condition | Rule |
|---|---|
| First lesson on topic | Do Now draws from related prior topics not current |
| Required practical lesson | 6-marker always at end of Apply. LEARN-LAB-METHOD mandatory + LEARN-RISK-ASSESSMENT appended |
| Required practical detected (non-practical lesson) | LEARN-LAB-METHOD mandatory + LEARN-RISK-ASSESSMENT appended |
| Mastering tier Apply | Always ends with 6-marker style question |
| Class = 12D-Phy | OCR Physics A exam style throughout |
| All other classes | AQA exam style throughout |
| Two distinct concepts in one lesson | Suggest Learn→Build→Learn→Build cycle |
| Previous slides uploaded | Extract content → inform Do Now → avoid repeating |
| Video in lesson | Worksheet always includes video questions section |
| Practical in lesson | Worksheet always includes results table + analysis |
| Revision/cover lesson | Worksheet is the lesson. Slide deck is lighter |

---

## PERMANENTLY EXCLUDED

Never generate under any circumstances:

- Any animation injection step (dropped entirely — teacher adds manually)
- Any Google Drive upload or download (teacher manages Drive manually)
- CORE.js (replaced by html2pptx)
- Homework tasks
- Double lesson structure
- Two versions of worksheet
- ENGAGE-ANALOGY-INTRO
- LEARN-ANALOGY-BREAKDOWN
- LEARN-ANALOGY-STRESS-TEST
- LEARN-TEACHER-TALKS-SKETCH
- LEARN-CORNELL-NOTES
- LEARN-PAUSE-AND-PREDICT
- LEARN-POST-VIDEO-RETRIEVAL
- LEARN-VIDEO-NOTE-FRAME
- BUILD-PEEL-PARAGRAPH
- BUILD-OWN-ANALOGY
- DO-NOW-EQUATION-REARRANGE (Do Now context only — lives in Build)
- DO-NOW-SEQUENCE (Do Now context only — lives in Build)
- DO-NOW-ODD-ONE-OUT (Do Now context only — lives in Build)
