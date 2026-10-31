'use strict';
// build.js part 14-assemble: slide order for each lesson type, buildPptx. Loaded by build.js in order; all parts share one scope.

/* renderBuildSlides — dispatch each Build item to its slide(s). Shared by the
   standard/practical/annotation path and the review path (so Build activities
   reach review slides too). Visualiser is handled by the caller, not here. */
/* orderBuildItems — MCQ block placement (Patryk 2026-10-03: "having it scattered across the
   lesson makes it disjointed"). Whatever order the JSON lists them in:
   - learning MCQs form ONE block straight after Learn, before the rest of Build;
   - MCQs tagged about:"practical" sit straight after the practical METHOD slide, before the
     data/results slides (or join the learning block when the lesson has no practical slide).
   Every other Build item keeps its authored order. */
function orderBuildItems(items) {
  const kind = (b) => b.type || b.variant || 'mcq';
  const isMcq = (b) => kind(b) === 'mcq' || kind(b) === 'mcq_image';
  const isPrac = (b) => isMcq(b) && /practical|experiment/i.test(String(b.about || ''));
  const list = arr(items);
  const learnMcqs = list.filter((b) => isMcq(b) && !isPrac(b));
  const pracMcqs = list.filter(isPrac);
  const rest = list.filter((b) => !isMcq(b));
  const p = rest.findIndex((b) => kind(b) === 'practical');
  if (p < 0) return [...learnMcqs, ...pracMcqs, ...rest];
  // The practical renders its own method -> answers -> model-data slides; its experiment MCQs ride
  // along on the practical item and are drawn inside that group, between the answers and the data.
  const prac = Object.assign({}, rest[p], { _mcqs: pracMcqs });
  return [...learnMcqs, ...rest.slice(0, p), prac, ...rest.slice(p + 1)];
}

function renderBuildSlides(pptx, L, buildItems) {
  orderBuildItems(buildItems).forEach((b) => {
    const bt = (b.type || b.variant || 'mcq');
    if (bt === 'mcq') slideMcq(pptx, L, b);
    else if (bt === 'mcq_image') slideMcqImage(pptx, L, b);
    else if (bt === 'sort') slideSort(pptx, L, b);
    else if (bt === 'trueFalse') slideTrueFalse(pptx, L, b);
    else if (bt === 'practical') slidePractical(pptx, L, b, () => arr(b._mcqs).forEach((m) => {
      if ((m.type || m.variant) === 'mcq_image') slideMcqImage(pptx, L, m); else slideMcq(pptx, L, m);
    }));
    else if (bt === 'misconception') slideMisconception(pptx, L, b);
    else if (bt === 'bigFact') slideBigFact(pptx, L, b);
    else if (bt === 'reformatFlowchart') slideReformatFlowchart(pptx, L, b);
    else if (bt === 'annotatedDiagram') slideAnnotatedDiagram(pptx, L, b);
    else if (bt === 'workedExample') slideWorkedExample(pptx, L, b);
    else if (bt === 'guessExample') slideGuessExample(pptx, L, b);
    else if (bt === 'practiceTriangle') slidePracticeTriangle(pptx, L, b);
    else if (bt === 'errorAnalysis') slideErrorAnalysis(pptx, L, b);
    else if (bt === 'graphInterpret') slideGraphInterpret(pptx, L, b);
    else if (bt === 'graphResults') slideGraphResults(pptx, L, b);   // M4
    else if (bt === 'graphWithData') slideGraphWithData(pptx, L, b); // M5
    else if (bt === 'predictThenCheck' || bt === 'predict_then_check') slidePredictThenCheck(pptx, L, b);
    else if (bt === 'modelAnswerReview') slideModelAnswerReview(pptx, L, b);   // M4-M11
    else if (bt === 'correctTheStatement') slideCorrectStatement(pptx, L, b);  // M12-M16
    else if (bt === 'markTheAnswers') slideMarkTheAnswers(pptx, L, b);
    else if (bt === 'answerList') slideAnswerList(pptx, L, b);                 // review: short parts, Q | answer
    // 'visualiser' handled by the caller
  });
}

/* ---- PPTX assembly ------------------------------------------------------------ */
async function buildPptx(L, outPath) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';                                  // 13.33 × 7.5
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };

  const type = (L.meta.lessonType || L.meta.type || 'standard').toLowerCase();
  // 2026-07-09: loud authoring-rule report (replaces the lone MCQ warn).
  // 2026-07-12: it now also returns the BLOCKING faults — a lesson that would be
  // lost (no Drive meta) or empty (no Apply questions) refuses to build unless
  // --force is passed. Thin-but-usable lessons still build with a warning.
  enforceBlockers(contentCheck(L), L.meta.topic || L.meta.title || 'lesson');
  checkSixMarkRule(L);
  // Bug 57: the renderer reads flat apply.developing/reaching/mastering and
  // review.questions — a nested `.tiers.X.qs` shape is silently dropped. Warn
  // loudly rather than coerce, so the authoring gets fixed (no real lesson uses it).
  ['apply', 'review'].forEach((k) => {
    if (L[k] && L[k].tiers) console.error(`[build] "${k}.tiers" is not read — use flat ${k}.developing/reaching/mastering (this content is being dropped)`);
  });
  const buildItems = arr(L.build);
  const visItem = buildItems.find((b) => (b.type || b.variant) === 'visualiser');

  slideTitleDoNow(pptx, L);                                     // questions embedded — always
  slideDoNowAnswers(pptx, L);
  slideHomeworkFeedback(pptx, L);                               // workplan 2.10 (test build): only when given
  // Lesson quality A: O7 objectives + key words. Review/revision/test lessons used an authored
  // "Engage = objectives" slide before this existed: keep that one and don't add a second.
  if (['standard', 'practical', 'annotation'].includes(type) || !L.engage) slideObjectives(pptx, L);

  if (type === 'standard' || type === 'practical' || type === 'annotation') {
    slideEngage(pptx, L);
    (L.meta && L.meta.uncapLearn ? arr(L.learn) : arr(L.learn).slice(0, 4)).forEach((it) => slideLearn(pptx, L, it));
    renderBuildSlides(pptx, L, buildItems);
    slideVisualiser(pptx, L, visItem);                          // MANDATORY — never omit
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
    slideExam(pptx, L);                                         // real exam question AFTER the Apply answers (Y9-11, home)
  } else if (type === 'revision') {
    // Patryk 2026-10-14: Engage = the learning objectives; then Learn → 3-question check, per concept
    slideEngage(pptx, L);
    arr(L.learn).forEach((it, n) => {
      slideLearn(pptx, L, it);                                  // typically Learn-C (or one concept a slide)
      if (arr(it.check).length) slideAnswerList(pptx, L, { heading: `CHECK ${n + 1}` + ((it.heading || it.title) ? ' · ' + stripStage(it.heading || it.title, 'LEARN').toUpperCase() : ''), rows: it.check });
    });
    slideWhiteboardRounds(pptx, L);
    if (visItem) slideVisualiser(pptx, L, visItem);
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
    slideExam(pptx, L);                                         // real exam question AFTER the Apply answers (Y9-11, home)
  } else if (type === 'whiteboard') {
    slideWhiteboardRounds(pptx, L);
    if (visItem) slideVisualiser(pptx, L, visItem);
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
    slideExam(pptx, L);                                         // real exam question AFTER the Apply answers (Y9-11, home)
  } else if (type === 'review') {
    // Bug 55: review lessons are content-heavy — render ALL Learn slides (no
    // slice(0,4) cap), matching the revision branch. No Engage (matches the
    // review 8-slide order in SKILL.md). Build items DO render here so
    // markTheAnswers / modelAnswerReview reach the review slides.
    // 2026-10-14: Engage = the learning objectives (Patryk's standard opening); only when authored.
    slideEngage(pptx, L);
    arr(L.learn).forEach((it) => slideLearn(pptx, L, it));
    renderBuildSlides(pptx, L, buildItems);
    slideVisualiser(pptx, L, visItem);                          // mandatory (auto-generated) — matches the documented review sequence
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
    buildReviewExtras(pptx, L);                                 // EBI corrections + Extension (2026-10-10)
    slideExam(pptx, L);                                         // real exam question AFTER the Apply answers (Y9-11, home)
  } else if (type === 'test') {
    // Test lesson (Patryk 2026-10-14): pupils sit the school's paper. Title/Do Now ("look over your
    // notes", doNow.task) and Engage (the learning objectives). Nothing else; no worksheets.
    slideEngage(pptx, L);
  } else {
    // unknown type — treat as standard (keep the 4-Learn cap)
    slideEngage(pptx, L);
    (L.meta && L.meta.uncapLearn ? arr(L.learn) : arr(L.learn).slice(0, 4)).forEach((it) => slideLearn(pptx, L, it));
    renderBuildSlides(pptx, L, buildItems);
    slideVisualiser(pptx, L, visItem);
    slideApply(pptx, L);
    buildReviewSlides(pptx, L);
    slideExam(pptx, L);                                         // real exam question AFTER the Apply answers (Y9-11, home)
  }

  slideImageDump(pptx, L);                                       // M7: always last
  await pptx.writeFile({ fileName: outPath });
  const usesHandwriting = buildItems.some((b) => ['modelAnswerReview', 'correctTheStatement', 'markTheAnswers'].includes(b.type || b.variant));
  if (usesHandwriting) embedCaveatFont(outPath);                  // M2: embed Caveat so it survives on any machine
  try { finishText(outPath); }                                  // key-word gold underline + answer yellow
  catch (e) { buildWarn('key-word underline / answer yellow not applied: ' + e.message); }
  try { addRevealAnimations(outPath); }                           // 2026-10-03: answer boxes appear on click
  catch (e) { buildWarn('click animations not added: ' + e.message); }
  while (_tmpFiles.length) { try { fs.unlinkSync(_tmpFiles.pop()); } catch {} }
}

/* =========================================================================
   DOCX COMPONENTS — worksheet-spec.md v2.1
   ========================================================================= */

const PAGE_W = 10106;                                  // content width DXA
const B_NONE = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const NO_B = { top: B_NONE, bottom: B_NONE, left: B_NONE, right: B_NONE };
const NO_TBL_B = Object.assign({}, NO_B, { insideHorizontal: B_NONE, insideVertical: B_NONE });
