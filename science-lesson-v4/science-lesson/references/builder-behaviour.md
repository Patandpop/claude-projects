# What the builder does by itself

> Part of the science-lesson skill, moved out of SKILL.md (2026-10-23) so it is read only when needed. Read it when a build looks wrong or Patryk asks how something is drawn. You never set any of this in the JSON; it is listed so nobody fights it.

- Nav bar = horizontal TOP strip, 6 tabs. Never a sidebar. Never on the right.
- **LAYOUT_WIDE = 13.33" × 7.5". Always define `var SW = 13.33; var SH = 7.5;` at top of script. Never hardcode `w: 10` — use `SW` everywhere. Full-width shapes: `w: SW`. Nav tabs: `SW / 6` each.**
- **Tier badges (Developing/Reaching/Mastering) on Apply slide = FULL-WIDTH column headers (not pills). Width = `colW`. Pills are DOCX-only.**
- **All content box gold borders: `line: { color: 'FABB2E', width: 2 }` (2pt = 25400 EMU). Never width 3 or 1.**
- **Visualiser slide is MANDATORY in standard and practical lessons. Never omit. The IPEVO link `https://apps.ipevo.com/pwa/visualizer.app/` is baked into the renderer — never output "[teacher inserts]".**
- **Do Now question numbers = gold rounded SQUARES with navy numbers. Never circles.**
- **Title slide left column: big title (26–32pt), then Learning Objectives in a bordered box (navy `#152347` fill, gold border, 14–15pt), then Key Words in a matching bordered box (13pt). No school name anywhere in the left column.**
- **MCQ = ONE slide.** Question + 4 coloured options + protocol strip + answer box at the bottom of the SAME slide. The renderer adds the click-to-appear animation to the answer box itself (2026-10-03); Patryk no longer adds it by hand. Never a separate answer slide.
- One MCQ per Build slide.
- Purple pen bar on every Do Now Answers + every Review slide.
- Theme colour on nav tab + header bar + bottom bar ONLY. Content box bodies = white fill + gold `#FABB2E` border. Exception: misconception callout body uses amber border `#E65100`; MCQ option cells keep their light tint of the badge colour (confirmed liked).
- MCQ colours: A=pink, B=blue, C=green, D=yellow (see slide-options-v4.md).
- **Click animations are automatic (2026-10-03):** every navy box with gold answer text (MCQ answers, Do Now answers, review answers, worked-answer boxes, reveals) gets an "Appear on click" animation in reading order. Learn slides and banners are never animated. Keep answers in navy/gold boxes so this works; never put an answer in another colour.
- Review tab/title = green `#1B5E20`. Never grey.
- Combine fill + text into one shape. No stacked rect + text box.
**File naming (renderer-enforced)**
- PPTX: `[topic]_[ability_label].pptx` — e.g. `parallel_circuits_mixed_ability.pptx`. NO class code, NO date in any filename. `differentiation: "split"` defaults the label to `mixed_ability`; override with `meta.abilityLabel` (e.g. "higher_ability").
- Worksheets: `[base]_worksheet.docx` (standard) and `[base]_support_worksheet.docx` (support — built for EVERY standard lesson). Review lessons build `[base]_answers.docx` (model-answer sheet) in the support slot instead. NEVER name worksheets "developing", "reaching", or "scaffolded" — students see filenames.

**Classroom routine elements (baked into slides — never omit)**
- Every Build MCQ slide: protocol strip — `THINK (silent) → DECIDE → SHOW on 3-2-1` — sits between the options and the answer box on the single MCQ slide.
- Every Do Now slide: silent-entry footer — `Silent start · pen out · attempt all questions`.

The final slide of every deck is the **IMAGE BANK** (kept, not deleted): it self-assembles from every embedded image + generated graphs + `image_dump.images`. Timeline (Learn-K) events may each carry `imageDescription`/`embeddedImagePath` — the image renders opposite the event box.

**Accessibility & readability (BDA / WCAG-aligned — applies to every resource)**
- **Print fonts are sans-serif.** The British Dyslexia Association and accessibility guidance recommend sans-serif for readers with dyslexia/visual stress because serifs interfere with letter recognition. Slides already use Trebuchet MS (BDA-approved). Worksheets use Century Gothic (sans-serif; checked 2026-10-23, the old Libre Baskerville note was out of date).
- **Body text ≥ 11pt on worksheets** (BDA recommends 12–14pt; 11pt is the floor for dense GCSE sheets). Never below. Headings ≥ 20% larger than body.
- **Left-align all body text, ragged right — never justify.** Justification creates uneven "rivers" of space that disrupt tracking.
- **Line length 60–75 characters.** Long lines across the full 10106 DXA width at small font exceed this and hurt readability — raise the font or narrow the column rather than run 90-character lines.
- **Line spacing 1.5** on worksheet body (BDA preferred) — set `line: 360` not `240` on question paragraphs.
- **Never rely on colour alone** to carry meaning. Tier badges already pair colour with a text label (Developing/Reaching/Mastering) — keep that pairing always, so a colour-blind reader still gets the tier. Avoid pure green-on-red adjacency for any colour-coded distinction.
- **No long stretches of BLOCK CAPITALS** in body text (harder to read). Short header bars in caps (DO NOW, APPLY, PART 1) are fine; never set a sentence or question in all caps.

- No animation injection. `present_files` only.
- **Output is portable.** `build.js` writes to the dir passed as the 2nd CLI arg, else `/mnt/user-data/outputs` if it exists, else cwd. It contains NO hardcoded Drive or Windows paths — this keeps the skill identical whether it runs on claude.ai (school) or Claude Code (home). Drive upload, if wanted, is done OUTSIDE build.js (a separate step/wrapper), never inside the frozen renderer.
- **Where this runs (two environments, one skill file):** claude.ai (e.g. school) runs the uploaded `.skill` in a Linux sandbox — build here, then `present_files` so files can be downloaded. Claude Code (home PC) runs the same skill against local files and can additionally copy outputs to Google Drive afterwards. The skill on claude.ai goes stale only if local files change at home and the new `.skill` isn't re-uploaded — so re-package and re-upload at the end of any session that edits the skill.
- Standard/practical/revision lessons always produce THREE files: `[base].pptx` + `[base]_worksheet.docx` + `[base]_support_worksheet.docx`. Review lessons (`lessonType: "review"`) also produce THREE files, but the third is a **model-answer sheet**: `[base].pptx` + `[base]_worksheet.docx` (the booklet) + `[base]_answers.docx` (see **Answer sheet** section). Review lessons never build a support worksheet — the answer sheet takes that slot. `differentiation: "split"` / `meta.abilityLabel` only change the filename label.
- Fallback: if `references/build.js` does not exist in this project, build the single-script way (content object at top, renderer below) and tell Patryk that generating build.js once would halve future build cost.
