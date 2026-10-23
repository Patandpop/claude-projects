'use strict';
// build.js part 09-slides-build: Build activities: MCQ, MCQ image, true/false, correct statement, sort, practical, misconception, big fact, reformat flowchart, annotated diagram. Loaded by build.js in order; all parts share one scope.

/* ---- BUILD — MCQ (SINGLE slide — answer at bottom, teacher animates reveal) */
function slideMcq(pptx, L, item) {
  const opts = mcqOptions(item.options);
  const obj = objectiveText(L);
  const question = item.q || item.question || '';

  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 CHECK YOUR UNDERSTANDING', STAGE.build, TOP);
  goldBox(s, MX, y, CW, 0.9, question, { fill: BG, bold: true, fontSize: autoFontSize(question, CW, 0.9, { min: 12, max: 22 }), valign: 'middle' });
  y += 0.9 + 0.08;

  // protocol strip + answer box reserve space at the bottom
  const stripH = 0.4, ansH = 0.85;
  const optH = BOT_Y - 0.08 - y - stripH - ansH - 2 * GAP;
  const colW = (CW - 0.15) / 2, rowH = (optH - 0.12) / 2;
  ['A', 'B', 'C', 'D'].forEach((Lt, i) => {
    const cx = MX + (i % 2) * (colW + 0.15);
    const cy = y + Math.floor(i / 2) * (rowH + 0.12);
    goldBox(s, cx, cy, colW, rowH, [
      { text: Lt + '   ', options: { bold: true, fontSize: 16, color: MCQ[Lt].badge } },
      { text: opts[Lt] || '', options: { fontSize: autoFontSize(opts[Lt] || '', colW, rowH, { min: 11, max: 20 }), color: '24323F' } },
    ], { fill: MCQ[Lt].bg, valign: 'middle' });
  });
  y += optH + GAP;
  txt(s, 'THINK (silent)   \u2192   DECIDE   \u2192   SHOW on 3 \u2013 2 \u2013 1', {
    x: MX, y, w: CW, h: stripH, fill: { color: NAVY },
    color: 'FFFFFF', fontSize: 13, align: 'center', valign: 'middle',
  });
  y += stripH + GAP;
  // Answer box — teacher adds entrance animation in PowerPoint to reveal after countdown
  const ansText = '\u2713  Answer: ' + (item.answer || '') + '  \u00B7  ' + (item.explanation || '');
  const ansFs = autoFontSize(ansText, CW, ansH, { min: 10, max: 18 });
  const ansRuns = [
    { text: '\u2713  Answer: ' + (item.answer || '') + '  \u00B7  ', options: { bold: true, fontSize: ansFs } },
    { text: item.explanation || '', options: { fontSize: ansFs } },
  ];
  goldBox(s, MX, y, CW, ansH, ansRuns, { fill: NAVY, color: GOLD, valign: 'middle' }); // M3
  bottomBar(s, obj);
}

/* ---- BUILD — mcq_image --------------------------------------------------- */
function slideMcqImage(pptx, L, item) {
  const opts = mcqOptions(item.options);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 CHECK YOUR UNDERSTANDING', STAGE.build, TOP);
  const leftW = CW * 0.72, rx = MX + leftW + 0.15, rw = CW * 0.28 - 0.15;
  goldBox(s, MX, y, leftW, 0.8, item.q || item.question || '', { fill: BG, bold: true, fontSize: 14, valign: 'middle' });
  imageOrPlaceholder(s, item, MX, y + 0.9, leftW, 2.4);
  const optRuns = [];
  ['A', 'B', 'C', 'D'].forEach((Lt) => {
    optRuns.push({ text: Lt + '  ', options: { bold: true, color: MCQ[Lt].badge, fontSize: 13 } });
    optRuns.push({ text: opts[Lt] || '', options: { fontSize: 12, breakLine: true, paraSpaceAfter: 4 } });
  });
  goldBox(s, MX, y + 3.4, leftW, BOT_Y - 0.53 - (y + 3.4), optRuns, { valign: 'top' });
  txt(s, [
    { text: (item.answer || '') + '\n', options: { bold: true, fontSize: 20, color: GOLD, align: 'center', breakLine: true } },
    { text: item.explanation || '', options: { fontSize: 11, color: 'FFFFFF' } },
  ], { x: rx, y, w: rw, h: BOT_Y - 0.53 - y, fill: { color: NAVY }, line: GOLD2, valign: 'middle', align: 'center', margin: 8, fit: 'shrink', fontFace: FONT });
  mcqProtocolStrip(s);
  bottomBar(s, objectiveText(L));
}

/* ---- BUILD — sort (task + answers) --------------------------------------- */
/* ---- BUILD — trueFalse (+ answer slide) ----------------------------------- */
function slideTrueFalse(pptx, L, item) {
  const obj = objectiveText(L);
  const statements = arr(item.statements);
  const RED = 'B71C1C';
  const respW = 0.9;

  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 ' + (item.heading || 'TRUE OR FALSE'), STAGE.build, TOP);
  const footH = 0.4;
  const rows = statements.length;
  const gapTotal = (rows - 1) * GAP;
  const avail = BOT_Y - 0.08 - y - footH - GAP - gapTotal;
  // Fill available height like the Do Now slide: rows expand to use the space.
  // Floor keeps long lists legible; high ceiling lets short lists fill the slide
  // instead of leaving a dead zone underneath (the Do Now pattern, not the old 1.3 cap).
  const rowH = Math.max(0.7, Math.min(1.9, avail / rows));
  // Centre the block when it does not fill the slide so leftover space is shared.
  const blockH = rows * rowH + gapTotal;
  const ty = y + Math.max(0, (avail - blockH) / 2);
  statements.forEach((st, i) => {
    const ry = ty + i * (rowH + GAP);
    // Alternating warm tint gives rhythm instead of a stack of identical white boxes.
    const tint = i % 2 ? 'FFF8E1' : 'FFFFFF';
    goldBox(s, MX, ry, CW - respW - 0.15, rowH, [
      { text: (i + 1) + '   ', options: { bold: true, fontSize: 16, color: AMBER } },
      { text: String(st.text || ''), options: { fontSize: 15 } },
    ], { valign: 'middle', fill: tint });
    txt(s, 'T  /  F', {
      x: MX + CW - respW, y: ry, w: respW, h: rowH,
      fill: { color: NAVY }, line: GOLD2, color: 'FFFFFF',
      bold: true, fontSize: 15, align: 'center', valign: 'middle',
    });
  });
  y = ty + rows * rowH + gapTotal + GAP;
  txt(s, 'Decide T or F for each. Be ready to justify on 3-2-1', {
    x: MX, y, w: CW, h: footH, fill: { color: NAVY },
    color: 'FFFFFF', bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  bottomBar(s, obj);

  // answer slide
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, 'BUILD \u00B7 ' + (item.heading || 'TRUE OR FALSE') + ': ANSWERS', STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);
  const ansAvail = BOT_Y - 0.08 - y - gapTotal;
  const rowH2 = Math.max(0.7, Math.min(1.8, ansAvail / rows));
  const ansBlockH = rows * rowH2 + gapTotal;
  const ay = y + Math.max(0, (ansAvail - ansBlockH) / 2);
  statements.forEach((st, i) => {
    const ry = ay + i * (rowH2 + GAP);
    const isTrue = !!st.isTrue;
    // Colour-coded verdict tint lets the teacher read true/false split at a glance
    // (hinge-question principle: the check is only useful if go/no-go is visible fast).
    const verdictTint = isTrue ? 'E8F5E9' : 'FFEBEE';
    const runs = [
      { text: (i + 1) + '   ', options: { bold: true, fontSize: 15, color: AMBER } },
      { text: String(st.text || '') + '   ', options: { fontSize: 14 } },
      { text: isTrue ? '\u2713 TRUE' : '\u2717 FALSE', options: { bold: true, fontSize: 15, color: isTrue ? GREEN_OK : RED } },
    ];
    if (!isTrue && st.correction) {
      runs.push({ text: ':  ' + st.correction, options: { fontSize: 13, italic: true, color: '333333', breakLine: false } });
    }
    goldBox(s, MX, ry, CW, rowH2, runs, { valign: 'middle', fill: verdictTint });
  });
  bottomBar(s, obj);
}

/* ---- BUILD — correctTheStatement (M12-M16) --------------------------------
   General-purpose build task (any lesson, not just test review). 4 statements
   generated the same misconception-based way as trueFalse/MCQ distractors —
   but all 4 are false. 2 columns of 2: each unit = handwritten incorrect
   statement directly above its correction, revealed on the SAME slide as a
   navy/gold box (not a separate answer slide) — 4 lines per column, 8 total. */
function slideCorrectStatement(pptx, L, item) {
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD · CORRECT THE STATEMENT', STAGE.build, TOP);
  txt(s, item.instruction || 'These statements are incorrect. Correct each one in your book.', {
    x: MX, y, w: CW, h: 0.35, italic: true, fontSize: 12, color: '333333', valign: 'middle',
  });
  y += 0.42;

  const statements = arr(item.statements).slice(0, 4);
  const colW = (CW - GAP) / 2;
  const rowH = (BOT_Y - 0.08 - y - GAP) / 2;
  const claimH = rowH * 0.52, correctH = rowH - claimH - GAP * 0.4;
  const profile = item.jitterProfile != null ? item.jitterProfile : 3;

  statements.forEach((st, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = MX + col * (colW + GAP);
    const cy = y + row * (rowH + GAP);
    handwritingBlock(s, cx, cy, colW, claimH, prettyText(st.text || st.claim || ''), {
      fontSize: 22, profile, ruled: false, mode: handwritingMode(L, item),   // 2026-07-12: +2pt again per Patryk — pupils still found it small
    });
    goldBox(s, cx, cy + claimH + GAP * 0.4, colW, correctH, [
      { text: '✓  ', options: { bold: true, fontSize: 16, color: GOLD } },
      { text: prettyText(st.correction || ''), options: { fontSize: 15, color: GOLD } },
    ], { fill: NAVY, valign: 'middle' });
  });

  bottomBar(s, obj);
}

/* ---- BUILD — sort (two slides) -------------------------------------------- */
function slideSort(pptx, L, item) {
  const obj = objectiveText(L);
  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 SORT', STAGE.build, TOP);
  txt(s, item.instruction || 'Sort each item into the correct category.', {
    x: MX, y, w: CW, h: 0.35, italic: true, fontSize: 12, color: '333333', valign: 'middle',
  });
  y += 0.4;
  const items = arr(item.items);
  const colW = (CW - 0.15) / 2;
  const rows = Math.ceil(items.length / 2);
  const cellH = (BOT_Y - 0.08 - y - (rows - 1) * 0.1) / rows; // M5: removed 0.7 cap
  // 2026-10-03 (Patryk, 10C2 L11): short items ("wind", "coal") sat tiny in big boxes under the old
  // 16pt cap. Size every box from the LONGEST item (one size for all, so the grid stays even),
  // fitted to the box's real width and height: short words fill it, long ones still fit.
  const longest = items.reduce((a, it) => (String(it).length > a.length ? String(it) : a), '');
  const sortFs = autoFontSize('00   ' + longest, colW - 0.3, cellH, { min: 16, max: 32 });
  items.forEach((it, i) => {
    const cx = MX + (i % 2) * (colW + 0.15);
    const cy = y + Math.floor(i / 2) * (cellH + 0.1);
    goldBox(s, cx, cy, colW, cellH, [
      { text: (i + 1) + '   ', options: { bold: true, fontSize: sortFs, color: AMBER } },
      { text: String(it), options: { fontSize: sortFs } },
    ], { valign: 'middle' });
  });
  bottomBar(s, obj);

  // answers
  const cats = item.categories || { A: 'Group A', B: 'Group B' };
  const sorted = item.sorted || {};
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, 'BUILD \u00B7 SORT: ANSWERS', STAGE.build, TOP);
  const keys = Object.keys(cats);
  const cw2 = (CW - 0.15 * (keys.length - 1)) / keys.length;
  keys.forEach((k, ki) => {
    const cx = MX + ki * (cw2 + 0.15);
    txt(s, String(cats[k]).toUpperCase(), {
      x: cx, y, w: cw2, h: 0.42, fill: { color: ki ? AMBER : GREEN_OK },
      color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle',
    });
    const list = arr(sorted[k]);
    const boxH = BOT_Y - 0.08 - y - 0.42;
    const ansFs = fitListFont(list.map((it) => '·  ' + it), cw2 - 0.3, boxH, 16, 40); // M7, sized to fill (2026-10-03)
    // spread a short list down the box instead of bunching it at the top (2026-10-03)
    const spare = boxH * 72 * 0.8 - list.length * ansFs * 1.4;
    const gapPt = Math.max(6, Math.min(30, spare / Math.max(1, list.length)));
    const runs = list.map((it) => ({ text: '\u00B7  ' + it, options: { fontSize: ansFs, breakLine: true, paraSpaceAfter: gapPt } }));
    goldBox(s, cx, y + 0.42, cw2, boxH, runs, { valign: 'top', fill: NAVY, color: GOLD });
  });
  bottomBar(s, obj);
}

/* ---- BUILD — practical (+ optional Q&A answers slide) -------------------- */
function slidePractical(pptx, L, item, beforeData) {
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, ('BUILD \u00B7 ' + stripStage(item.title || L.meta.topic, 'BUILD')).toUpperCase(), STAGE.build, TOP);
  if (item.intro) {
    txt(s, item.intro, { x: MX, y, w: CW, h: 0.4, italic: true, fontSize: 12, color: '333333', valign: 'middle' });
    y += 0.45;
  }
  const steps = arr(item.steps);
  const warnH = item.warning ? 0.6 : 0;
  const equipment = arr(item.equipment);
  // steps in left ~52%; right = image placeholder + equipment list (image first)
  const hasRight = item.imagePlaceholder !== false || equipment.length;
  const stepsW = hasRight ? CW * 0.52 : CW;
  const rightX = MX + stepsW + 0.15;
  const rightW = CW - stepsW - 0.15;
  const rightH = BOT_Y - 0.08 - y;
  if (equipment.length) {
    const eqH = Math.min(rightH * 0.5, Math.max(0.8, equipment.length * 0.36 + 0.45));
    const eqRuns = [
      { text: 'EQUIPMENT PER GROUP', options: { bold: true, fontSize: 14, color: AMBER, breakLine: true } },
      ...equipment.map((e, i) => ({ text: `• ${e}`, options: { fontSize: 13, color: 'FFFFFF', breakLine: i < equipment.length - 1 } })),
    ];
    if (item.imagePlaceholder !== false) {
      const imgH = rightH - eqH - GAP;
      imageOrPlaceholder(s, item, rightX, y, rightW, imgH);
      goldBox(s, rightX, y + imgH + GAP, rightW, eqH, eqRuns, { fill: NAVY, line: { color: AMBER, width: 2 }, valign: 'top' });
    } else {
      goldBox(s, rightX, y, rightW, eqH, eqRuns, { fill: NAVY, line: { color: AMBER, width: 2 }, valign: 'top' });
    }
  } else if (item.imagePlaceholder !== false) {
    imageOrPlaceholder(s, item, rightX, y, rightW, rightH);
  }
  const stepH = (BOT_Y - 0.08 - y - (warnH ? warnH + GAP : 0) - (steps.length - 1) * GAP) / Math.max(1, steps.length);
  steps.forEach((st, i) => {
    txt(s, String(i + 1), {
      x: MX, y: y + (stepH - 0.42) / 2, w: 0.42, h: 0.42,
      fill: { color: AMBER }, color: 'FFFFFF', bold: true, fontSize: 16, align: 'center', valign: 'middle',
    });
    goldBox(s, MX + 0.55, y, stepsW - 0.55, stepH, String(st), { fontSize: autoFontSize(String(st), stepsW - 0.55, stepH, { min: 12, max: 22 }), valign: 'middle' });
    y += stepH + GAP;
  });
  if (item.warning) {
    goldBox(s, MX, y, stepsW, warnH, [
      { text: 'Warning:  ', options: { bold: true, color: 'CC0000', fontSize: 14 } },
      { text: item.warning, options: { fontSize: 14 } },
    ], { fill: 'FFF3F3', line: { color: 'CC0000', width: 2 }, valign: 'middle' });
  }
  bottomBar(s, obj);

  // Build Q&A answers slide (before Visualiser) — only if questions supplied
  const qa = arr(item.questions);
  if (qa.length) {
    const s2 = pptx.addSlide();
    s2.background = { color: BG };
    navBar(s2, 'build');
    let y2 = sectionHeader(s2, 'BUILD \u00B7 PRACTICAL QUESTIONS: ANSWERS', STAGE.build, TOP);
    y2 = purplePenBar(s2, y2 - GAP + 0.02);
    const rowH2 = (BOT_Y - 0.08 - y2 - (qa.length - 1) * 0.08) / qa.length;
    qa.forEach((q) => {
      reviewRow(s2, y2, rowH2, null, q.q || '', q.a || '');
      y2 += rowH2 + 0.08;
    });
    bottomBar(s2, obj);
  }

  // Experiment MCQs (about:"practical") go here: after the method (and its answers), BEFORE the data.
  if (typeof beforeData === 'function') beforeData();

  // Model data slide \u2014 skipped when graphWithData build item present (M5: graphWithData replaces it)
  const rd = (L.worksheetExtras || {}).referenceData;
  const hasGWD = arr(L.build).some((b) => (b.type || b.variant) === 'graphWithData');
  if (rd && Array.isArray(rd.rows) && rd.rows.length && !hasGWD) {
    const s3 = pptx.addSlide();
    s3.background = { color: BG };
    navBar(s3, 'build');
    let y3 = sectionHeader(s3, 'BUILD \u00B7 MODEL DATA', STAGE.build, TOP);
    if (rd.note) {
      txt(s3, rd.note, { x: MX, y: y3, w: CW, h: 0.35, italic: true, fontSize: 12, color: '555555', valign: 'middle' });
      y3 += 0.4;
    }
    const headers = rd.headers || [];
    const colCount = Math.max(headers.length, rd.rows[0] ? arr(rd.rows[0]).length : 1, 1);
    const colW = Array(colCount).fill(CW / colCount);
    const tRows = [];
    if (headers.length) tRows.push(headers.map((h) => ({ text: String(h), options: { fill: { color: NAVY }, color: AMBER, bold: true, fontSize: 18, border: ab(AMBER), valign: 'middle', align: 'center' } })));
    rd.rows.forEach((row) => tRows.push(arr(row).map((cell) => ({ text: String(cell == null ? '' : cell), options: { fill: { color: 'FFFFFF' }, color: NAVY, fontSize: 18, border: ab(NAVY), valign: 'middle', align: 'center' } }))));
    const rowH3 = Math.max(0.55, (BOT_Y - 0.08 - y3) / Math.max(1, tRows.length));
    table(s3, tRows, { x: MX, y: y3, w: CW, colW, rowH: Array(tRows.length).fill(rowH3), fontFace: FONT, margin: 0.06, autoPage: false });
    bottomBar(s3, obj);
  }
}

/* ---- BUILD — misconception ----------------------------------------------- */
function slideMisconception(pptx, L, item) {
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 WHAT PEOPLE GET WRONG', STAGE.build, TOP);
  const x = 0.6, w = SW - 1.2;
  const stripH = 0.45;
  const panelH = (BOT_Y - 0.08 - y - stripH - GAP - 2 * GAP) / 3;

  goldBox(s, x, y, w, panelH, [
    { text: 'THE CLAIM   ', options: { bold: true, fontSize: 12, color: AMBER } },
    { text: '\u201C' + (item.claim || '') + '\u201D', options: { italic: true, fontSize: 20 } },
  ], { line: { color: AMBER, width: 2 }, valign: 'middle' });        // amber border — deliberate
  y += panelH + GAP;
  goldBox(s, x, y, w, panelH, [
    { text: 'WHY IT FEELS TRUE   ', options: { bold: true, fontSize: 12, color: NAVY } },
    { text: item.whyWrong || '', options: { fontSize: 16 } },
  ], { valign: 'middle' });
  y += panelH + GAP;
  goldBox(s, x, y, w, panelH, [
    { text: 'WHAT\u2019S ACTUALLY TRUE   ', options: { bold: true, fontSize: 13, color: GREEN_OK } },
    { text: item.truth || '', options: { fontSize: 17 } },
  ], { valign: 'middle' });
  mcqProtocolStrip(s, 'Hold up A if you believed the claim before today');
  bottomBar(s, objectiveText(L));
}

/* ---- BUILD — bigFact (2026-07-11) ------------------------------------------
   One huge number/fact filling a navy slide, display-only (no worksheet
   output — unmatched Build types already produce nothing there). Schema:
   { type: "bigFact", fact, unit?, context? }. navBar/bottomBar kept for deck
   navigation consistency even though the body is a full navy background. */
function slideBigFact(pptx, L, item) {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  navBar(s, 'build');
  const x = MX, w = SW - 2 * MX;
  const bodyTop = TOP, bodyBot = BOT_Y - GAP;
  const contextH = item.context ? 0.6 : 0;
  const factH = bodyBot - bodyTop - contextH;

  const fact = String(item.fact != null ? item.fact : '');
  const factSize = autoFontSize(fact, w, factH, { min: 32, max: 96 });
  const runs = [{ text: fact, options: { fontSize: factSize, bold: true, color: GOLD } }];
  if (item.unit) {
    runs.push({ text: ' ' + item.unit, options: { fontSize: Math.round(factSize * 0.5), bold: true, color: GOLD } });
  }
  txt(s, runs, {
    x, y: bodyTop, w, h: factH,
    align: 'center', valign: 'middle', fit: 'shrink',
  });
  if (item.context) {
    txt(s, item.context, {
      x, y: bodyTop + factH, w, h: contextH,
      fontSize: 18, color: 'FFFFFF', align: 'center', valign: 'top', fit: 'shrink',
    });
  }
  bottomBar(s, objectiveText(L));
}

/* ---- BUILD — reformatFlowchart (2026-07-12) --------------------------------
   Students reorder scrambled process steps. Schema: { type:"reformatFlowchart",
   heading?, instruction?, steps:[{label, note?}] } — steps are authored in the
   CORRECT order; the question slide displays them shuffled (deterministic, not
   random, so slide/worksheet/tests always agree) and lettered A/B/C… instead of
   numbered, so the letter order itself doesn't leak the answer. The answer
   slide shows the same boxes back in the correct order, connected with the
   same native gold arrows used on Learn-I flowcharts, each labelled with its
   step number and a reminder of which letter it was shown as. */
function shuffleOrder(n) {
  const order = [];
  let lo = 0, hi = n - 1, takeHigh = true;
  while (lo <= hi) {
    if (takeHigh) { order.push(hi--); } else { order.push(lo++); }
    takeHigh = !takeHigh;
  }
  return order;
}

function slideReformatFlowchart(pptx, L, item) {
  const obj = objectiveText(L);
  const steps = arr(item.steps).slice(0, 6);
  const n = steps.length;
  const order = shuffleOrder(n);                 // shuffled[k] = steps[order[k]]
  const letters = 'ABCDEF';

  // ---- question slide: shuffled, lettered, no arrows (order is undetermined) ----
  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD · ' + (item.heading || 'REORDER THE STEPS'), STAGE.build, TOP);
  const cols = n > 3 ? 3 : n;
  const rows = Math.ceil(n / cols) || 1;
  const cellW = (CW - (cols - 1) * GAP) / cols, cellH = Math.min(1.8, (BOT_Y - 0.08 - y - 0.4 - GAP - (rows - 1) * GAP) / rows);
  order.forEach((origIdx, k) => {
    const col = k % cols, row = Math.floor(k / cols);
    const bx = MX + col * (cellW + GAP), by = y + row * (cellH + GAP);
    goldBox(s, bx, by, cellW, cellH, [
      { text: letters[k] + '   ', options: { bold: true, fontSize: 16, color: AMBER } },
      { text: String(steps[origIdx].label || ''), options: { fontSize: 14 } },
    ], { valign: 'middle' });
  });
  const footY = y + rows * cellH + (rows - 1) * GAP + GAP;
  txt(s, item.instruction || 'Work out the correct order. Write the letters in sequence.', {
    x: MX, y: footY, w: CW, h: 0.4, fill: { color: NAVY },
    color: 'FFFFFF', bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  bottomBar(s, obj);

  // ---- answer slide: correct order, native arrows, letter cross-reference ----
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, 'BUILD · ' + (item.heading || 'REORDER THE STEPS') + ': ANSWERS', STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);
  const arrowSz = 0.3;
  const nodeW = (CW - (n - 1) * arrowSz) / n;
  const nodeH = Math.min(2.2, BOT_Y - 0.08 - y);
  steps.forEach((st, i) => {
    const nx = MX + i * (nodeW + arrowSz);
    const shownAs = letters[order.indexOf(i)];
    goldBox(s, nx, y, nodeW, nodeH, [
      { text: (i + 1) + '  (shown as ' + shownAs + ')', options: { bold: true, fontSize: 11, color: GOLD, breakLine: true, paraSpaceAfter: 4 } },
      { text: String(st.label || ''), options: { fontSize: 13 } },
    ], { fill: NAVY, valign: 'middle', align: 'center' });
    if (i < n - 1) {
      const acy = y + nodeH / 2;
      flowArrow(s, nx + nodeW + 0.04, acy, nx + nodeW + arrowSz - 0.04, acy);
    }
  });
  bottomBar(s, obj);
}

/* ---- BUILD — annotatedDiagram (Bug 34, 2026-07-12) -------------------------
   Base image + numbered gold badges at labelled points, with a key box
   listing what each number means. Schema: { type:"annotatedDiagram", heading?,
   imageDescription?, embeddedImagePath?, labels:[{x, y, text}] } — x/y are
   fractions (0–1) of the image's own width/height, so badge placement survives
   the image being scaled to fit the slide. Reuses numberBadge() (the same gold
   circle already used on flow steps) and imageOrPlaceholder() for the base
   image, same as every other image slot in the deck. */
function slideAnnotatedDiagram(pptx, L, item) {
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  const y = sectionHeader(s, 'BUILD · ' + (item.heading || 'LABEL THE DIAGRAM'), STAGE.build, TOP);
  const labels = arr(item.labels);
  const bottomY = BOT_Y - 0.08;
  const imgW = CW * 0.6, imgX = MX, imgY = y;
  const imgH = bottomY - imgY;
  imageOrPlaceholder(s, item, imgX, imgY, imgW, imgH);
  const d = 0.32;
  labels.forEach((lb, i) => {
    const cx = imgX + Math.max(0, Math.min(1, lb.x || 0)) * imgW;
    const cy = imgY + Math.max(0, Math.min(1, lb.y || 0)) * imgH;
    numberBadge(s, cx, cy, d, i);
  });
  const keyX = imgX + imgW + 0.2, keyW = CW - imgW - 0.2;
  const keyLines = labels.map((lb, i) => (i + 1) + '.  ' + String(lb.text || ''));
  goldBox(s, keyX, imgY, keyW, imgH, [
    { text: 'KEY', options: { bold: true, fontSize: 13, color: NAVY, breakLine: true, paraSpaceAfter: 8 } },
    ...keyLines.flatMap((line, i) => [{ text: line, options: { fontSize: 13, breakLine: i < keyLines.length - 1, paraSpaceAfter: 6 } }]),
  ], { valign: 'top' });
  bottomBar(s, objectiveText(L));
}
