---
name: science-lesson-v2
description: Creates lesson PowerPoints and worksheets for Beechen Cliff School science lessons (physics, chemistry, biology). Use when asked to make a lesson, presentation, slide deck, PowerPoint, worksheet, booklet, or revision resource for any science topic. Triggers on phrases like "make me a lesson on", "create a worksheet for", "build a PowerPoint about", "Year 7/8/9/10/11/12 lesson", or any science topic combined with a request for teaching materials.
---

# Science Lesson Skill

## Reference files — read on demand only
- Full slide type menu, worksheet rules, class profiles, design system, conditional logic:
  `references/slide-options-v3.md`
- PowerPoint build instructions:
  `/mnt/skills/public/pptx/SKILL.md` + `html2pptx.md`
- Worksheet build instructions:
  `/mnt/skills/public/docx/SKILL.md`

---

## Workflow — follow in order every session

**STEP 1 — Upload prompt**
Ask: "Do you have the previous lesson's slides? Upload them for better Do Now questions and content continuity." Read any uploaded slides to extract content, key terms, diagrams taught.

**STEP 2 — Clarify brief**
Collect: class name · topic area · lesson title · position in unit (first/mid/pre-assessment) · lesson type (standard/practical/revision/cover) · worksheet needed and which sections.
Infer from class name: ability level · exam board · worksheet default sections.
Read `references/slide-options-v3.md` now.

**STEP 3 — Present slide plan**
Output plain text plan listing stage + slide type for every slide. Wait for approval. Do not build until approved.

**STEP 4 — Generate content object**
Write all content once: Do Now questions · video questions · build tasks · apply questions.
PPTX and worksheet both draw from this object. Nothing is regenerated.

**STEP 5 — Build PPTX**
Read `/mnt/skills/public/pptx/SKILL.md` and `html2pptx.md` before writing any code.
One HTML file per slide → html2pptx conversion → single .pptx output.

**STEP 6 — Build worksheet** (if confirmed)
Read `/mnt/skills/public/docx/SKILL.md` before writing any code.
Draw sections from content object. Reformat only — no new content.

**STEP 7 — present_files**
Present all output files. Teacher downloads and uploads to Drive manually.

---

## Hard rules — never break

- Navy nav bar (#0D1B5E) identical on every slide. Title gold (#FABB2E).
- Do Now slides: full navy content area. Gold badges. #25408D stage strip + LO strip.
- All other slides: #EDF2FA background. Stage colour as accent on panel headers and box borders.
- Visualiser slide always generated after Apply. Purple #4A148C. Link: https://apps.ipevo.com/pwa/visualizer.app/
- No animation injection. No Drive upload. No CORE.js.
- All content generated once. Never written twice.
- Always present slide plan and wait for approval before building.
- Fonts: Trebuchet MS (slides) · Libre Baskerville (worksheets). Min 16pt content.
- Required practical lesson: LEARN-LAB-METHOD mandatory + LEARN-RISK-ASSESSMENT appended + 6-marker at end of Apply.
- 6-marker in Mastering tier by default for standard lessons.
- GUESS framework for all calculation scaffolds (Given / Unknown / Equation / Substitute / Solve).
- Think-pair-share always includes four linguistic sentence starters.
- [SUGGEST] slides: generate 3 specific options from topic knowledge before building. Wait for teacher to choose.
- First lesson on topic: Do Now draws from related prior topics, not current topic.
- Class 12D-Phy: OCR Physics A exam style. All others: AQA.
- One worksheet version only. Scaffold always present.
- Homework out of scope entirely.
