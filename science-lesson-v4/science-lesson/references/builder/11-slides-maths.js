'use strict';
// build.js part 11-slides-maths: worked example, formula triangles, GUESS, practice triangle, error analysis, graphs (graph_gen.py), visualiser. Loaded by build.js in order; all parts share one scope.

/* ---- BUILD — workedExample → yourTurn (+ answer slide) -------------------- */
function slideWorkedExample(pptx, L, item) {
  const obj = objectiveText(L);
  const annotate = !!(L.meta && L.meta.annotation);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 WORKED EXAMPLE \u2192 YOUR TURN', STAGE.build, TOP);
  const colW = (SW - 1.8) / 2, x1 = 0.6, x2 = 0.6 + colW + 0.6;
  const worked = item.worked || {}, yourTurn = item.yourTurn || {};

  txt(s, 'WORKED EXAMPLE', { x: x1, y, w: colW, h: 0.38, fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 14, align: 'center', valign: 'middle' });
  txt(s, 'YOUR TURN', { x: x2, y, w: colW, h: 0.38, fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 14, align: 'center', valign: 'middle' });
  y += 0.38 + GAP;
  const promptH = 0.85;
  const wpFs = autoFontSize(worked.prompt, colW, promptH, { min: 16, max: 24 });
  goldBox(s, x1, y, colW, promptH, prettyText(worked.prompt || ''), { fontSize: wpFs, valign: 'middle' }); // prose: x^2 / H_2SO_4 typeset by txt (2026-10-22: parseEq lowered '2SO4' as one subscript)
  const ypFs = autoFontSize(yourTurn.prompt, colW, promptH, { min: 16, max: 24 });
  goldBox(s, x2, y, colW, promptH, prettyText(yourTurn.prompt || ''), { fontSize: ypFs, valign: 'middle' });
  y += promptH + GAP;
  const panelH = BOT_Y - 0.08 - y;
  if (annotate) {
    annotationZone(s, x1, y, Math.min(5.5, colW), Math.min(4.0, panelH));
    s.addNotes('Worked example steps (work live):\n' + arr(worked.steps).map((st, i) => `${i + 1}. ${st}`).join('\n'));
  } else {
    const allSteps = arr(worked.steps).join(' ');
    const stepFs = autoFontSize(allSteps, colW, panelH, { min: 16, max: 20, linesHint: arr(worked.steps).length });
    const runs = arr(worked.steps).flatMap((st, idx) => {
      const eqRuns = toPptxRuns(parseEq(st), {fontSize:stepFs});
      if (!eqRuns.length) eqRuns.push({text:'', options:{fontSize:stepFs}});
      eqRuns[0] = Object.assign({}, eqRuns[0], {text:`${idx+1}.  `+eqRuns[0].text});
      eqRuns[eqRuns.length-1] = Object.assign({}, eqRuns[eqRuns.length-1], {options:Object.assign({},eqRuns[eqRuns.length-1].options,{breakLine:true,paraSpaceAfter:8})});
      return eqRuns;
    });
    goldBox(s, x1, y, colW, panelH, runs, { valign: 'top' });
  }
  // Answer panel — dark NAVY; teacher adds entrance animation in PowerPoint to reveal
  if (yourTurn.answer) {
    const aFs = autoFontSize(yourTurn.answer, colW, panelH, { min: 16, max: 20 });
    goldBox(s, x2, y, colW, panelH, toPptxRuns(parseEq(yourTurn.answer), { fontSize: aFs, color: 'FFFFFF' }), { fill: NAVY, valign: 'top' }); // Bug 53: typeset working (× ÷ fractions)
  } else {
    slideRect(s, x2, y, colW, panelH);
  }
  bottomBar(s, obj);
}
function slideRect(slide, x, y, w, h) {
  slide.addShape('rect', { x, y, w, h, fill: { color: 'FFFFFF' }, line: GOLD2 });
}

/* Formula triangle model. One quantity on top, 2 to 4 MULTIPLIED quantities
   along the bottom: { top:"E", bottom:["m","c","Δθ"] } for E = mcΔθ. Covering
   any one still gives the rearrangement. (2026-10-02, Bug 59 point 4: until
   then anything beyond 3 symbols simply lost its triangle.) The original
   { top, bottomLeft, bottomRight } shape still works, read as a 2-item bottom;
   bottomMiddle extends it by hand. Bug 59 rule kept: anything that is not a
   clean "one quantity = product of the others" (missing top, unknown keys,
   5+ on the bottom, blanks) → null → no triangle, and the equation gets the
   full row instead. Never draw A/B/C defaults. */
const TRI_LEGACY = ['bottomLeft', 'bottomMiddle', 'bottomRight'];
function triangleSymbols(symbols) {
  if (!symbols || typeof symbols !== 'object') return null;
  if (Object.keys(symbols).some((k) => k !== 'top' && k !== 'bottom' && !TRI_LEGACY.includes(k))) return null;
  const hasLegacy = TRI_LEGACY.some((k) => k in symbols);
  let bottom;
  if (Array.isArray(symbols.bottom) && !hasLegacy) bottom = symbols.bottom;
  else if (!('bottom' in symbols) && hasLegacy) bottom = TRI_LEGACY.filter((k) => k in symbols).map((k) => symbols[k]);
  else return null;                              // neither form, or an ambiguous mix of both
  const clean = (v) => (v == null ? '' : prettyText(String(v)).trim());
  const top = clean(symbols.top);
  bottom = bottom.map(clean);
  if (!top || bottom.length < 2 || bottom.length > 4 || bottom.some((b) => !b)) return null;
  return { top, bottom };
}
function triangleUsable(symbols) { return !!triangleSymbols(symbols); }
/* width ÷ height. Wider for more bottom cells so each label keeps room:
   1.15 (two, the approved mock), 1.45 (three), 1.75 (four). */
function triangleAspect(symbols) {
  const t = triangleSymbols(symbols);
  return 1.15 + 0.3 * ((t ? t.bottom.length : 2) - 2);
}

/* drawFormulaTriangle(x, y, w, h, symbols) — white vector triangle with a
   horizontal divider and n−1 vertical dividers along the bottom. Never a
   raster image.
   2026-10-02: every label box is sized to the triangle's real INTERIOR at the
   label's height. Before, the boxes spanned the bounding box, so the slanted
   sides clipped anything wider than one letter ("rate" showed as "ate").
   Font size steps down to fit the room (floor 9pt), fit:'shrink' as backstop. */
function drawFormulaTriangle(slide, x, y, w, h, symbols) {
  const t = triangleSymbols(symbols);
  if (!t) return;
  const n = t.bottom.length;
  const apexX = x + w / 2;
  const f = 0.42;                                // fraction down the slanted side where the divider sits
  const Ly = y + f * h;
  const widthAt = (yy) => w * Math.max(0, Math.min(1, (yy - y) / h));   // interior width at height yy
  const fitFs = (label, room, max) => Math.max(9, Math.min(max, Math.floor((room * 105) / Math.max(1, label.length))));
  const label = (text, bx, by, bw, bh, fs) => txt(slide, text, {
    x: bx, y: by, w: Math.max(0.1, bw), h: bh, color: NAVY, bold: true, fontSize: fs,
    align: 'center', valign: 'middle', margin: 0, fit: 'shrink',
  });

  slide.addShape('triangle', { x, y, w, h, fill: { color: 'FFFFFF' }, line: { color: NAVY, width: 2 } });
  slide.addShape('line', { x: x + w * (1 - f) / 2, y: Ly, w: w * f, h: 0, line: { color: NAVY, width: 1.5 } });

  // Top: sat low in the top section, just above the divider, where it is widest.
  const topH = Math.min((Ly - y) * 0.7, 16 * 1.3 / 72);
  const topY = Ly - 0.03 - topH;
  const topRoom = widthAt(topY + topH / 2) - 0.08;
  label(t.top, apexX - topRoom / 2, topY, topRoom, topH, fitFs(t.top, topRoom, 16));

  // Bottom: dividers give every cell equal usable width at the row's midpoint
  // (equal spacing along the base would starve the outer cells, which lose
  // area to the slanted sides). Each outer label is also kept clear of the
  // slant at the TOP of its text, where the interior is narrowest.
  const midY = (Ly + y + h) / 2;
  const innerW = widthAt(midY), innerX = apexX - innerW / 2, cellW = innerW / n;
  for (let i = 1; i < n; i++) {
    slide.addShape('line', { x: innerX + i * cellW, y: Ly, w: 0, h: (y + h) - Ly, line: { color: NAVY, width: 1.5 } });
  }
  const rowH = (y + h) - Ly - 0.04;
  const textH = Math.min(rowH, 14 * 1.3 / 72);
  const slantRoom = widthAt(midY - textH / 2);   // interior width at the top of the text line
  t.bottom.forEach((sym, i) => {
    const left = Math.max(innerX + i * cellW, apexX - slantRoom / 2) + 0.04;
    const right = Math.min(innerX + (i + 1) * cellW, apexX + slantRoom / 2) - 0.04;
    label(sym, left, Ly + 0.02, right - left, rowH, fitFs(sym, right - left, 14));
  });
}

/* ---- BUILD — guessExample (GUESS-scaffolded worked example, ONE slide) ----
   Distinct from `workedExample` (which is the two-column Worked/Your-Turn
   type). This is the Given–Unknown–Equation–Substitute–Solve walkthrough,
   approved 2026-07-02: navy/gold throughout, vector formula triangle, gold
   Solve banner.
   Schema: { type:'guessExample', topic?, given, unknown, equation,
             equationSymbols?:{top,bottomLeft,bottomRight}, substitute, solve } */
function slideGuessExample(pptx, L, item) {
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD · WORKED EXAMPLE' + (item.topic ? ' · ' + String(item.topic).toUpperCase() : ''), STAGE.build, TOP);
  // Narrower right panel than the first cut (was 0.34/0.66) — the text inside
  // didn't need the full 66% width, so the left label column gets more breathing room.
  const leftW = CW * 0.38, rightX = MX + leftW + GAP, rightW = CW - leftW - GAP;
  const availH = BOT_Y - 0.08 - y;
  // Weighted row heights — approved mock 2026-07-10: gentler weighting than the old
  // [0.85,0.85,1.6,0.85,0.85], which starved the G/U rows; Solve gets a little extra.
  const ROW_WEIGHTS = [1, 1, 1.35, 1, 1.15];
  const weightUnit = availH / ROW_WEIGHTS.reduce((a, b) => a + b, 0);
  const rowHeights = ROW_WEIGHTS.map((w) => w * weightUnit);
  const rowY = [];
  rowHeights.forEach((h, i) => { rowY.push(i === 0 ? y : rowY[i - 1] + rowHeights[i - 1]); });
  const rows = [
    { letter: 'G', prompt: 'What are you given?', content: item.given || '' },
    { letter: 'U', prompt: 'What is unknown?', content: item.unknown || '' },
    { letter: 'E', prompt: 'What is the equation?', content: null },
    { letter: 'S', prompt: 'Substitute the numbers', content: item.substitute || '' },
    { letter: 'S', prompt: 'Solve (add units)', content: item.solve || '' },
  ];
  // one navy panel spans the full right column height — rows drawn on top of it
  s.addShape('rect', { x: rightX, y, w: rightW, h: availH, fill: { color: NAVY }, line: GOLD2 });
  rows.forEach((r, i) => {
    const ry = rowY[i];
    const rowH = rowHeights[i];
    const isLast = i === rows.length - 1;
    // left label column — badge scales with the row (approved mock: 55% capped 0.62")
    const badge = Math.min(0.62, rowH * 0.55);
    s.addShape('roundRect', { x: MX, y: ry + (rowH - badge) / 2, w: badge, h: badge, rectRadius: 0.07, fill: { color: GOLD }, line: { type: 'none' } });
    txt(s, r.letter, { x: MX, y: ry + (rowH - badge) / 2, w: badge, h: badge, color: NAVY, bold: true, fontSize: Math.round(badge * 42), align: 'center', valign: 'middle' });
    txt(s, r.prompt, { x: MX + badge + 0.15, y: ry, w: leftW - badge - 0.15, h: rowH, color: NAVY, bold: isLast, fontSize: 15, valign: 'middle' });
    // divider between rows (skip before first row)
    if (i > 0) s.addShape('line', { x: rightX, y: ry, w: rightW, h: 0, line: { color: GOLD, width: 1 } });
    if (i === 2) {
      // equation row. Triangle only for a genuine 3-symbol relationship (Bug 59);
      // otherwise the equation takes the full row at a larger size.
      const eqSegs = parseEq(item.equation || '');
      const hasTri = triangleUsable(item.equationSymbols);
      const triH = Math.min(1.25, rowH - 0.24);
      const triW = triH * triangleAspect(item.equationSymbols); // aspect-locked; wider for 3-4 bottom cells
      const triPad = 0.3;
      const eqW = hasTri ? rightW - triW - triPad - 0.45 : rightW - 0.5;
      const eqFs = hasTri ? 20 : 26;
      // Bug 33/53 phase 3: stacked fraction in the E row when it fits; diagonal fallback
      if (!renderEqShapes(s, eqSegs, { x: rightX + 0.25, y: ry + 0.06, w: eqW, h: rowH - 0.12 }, { fontSize: eqFs, color: GOLD, bold: true, align: 'left' })) {
        txt(s, toPptxRuns(eqSegs, { fontSize: eqFs, color: GOLD, bold: true }), { x: rightX + 0.25, y: ry, w: eqW, h: rowH, color: GOLD, valign: 'middle', margin: 0 });
      }
      if (hasTri) drawFormulaTriangle(s, rightX + rightW - triW - triPad, ry + (rowH - triH) / 2, triW, triH, item.equationSymbols);
    } else if (isLast) {
      // Solve row — gold banner echoing the reviewRow answer style, bold + larger.
      // Bug 59(5): rows run through parseEq so "\div"/"times"/"^2" typeset as ÷ × ².
      const fs = autoFontSize(r.content, rightW, rowH, { min: 16, max: 24 });
      txt(s, toPptxRuns(parseEq(r.content), { fontSize: Math.max(fs, 17), color: GOLD, bold: true }), { x: rightX + 0.15, y: ry, w: rightW - 0.3, h: rowH, valign: 'middle' });
    } else {
      const fs = autoFontSize(r.content, rightW, rowH, { min: 15, max: 22 });
      txt(s, toPptxRuns(parseEq(r.content), { fontSize: fs, color: GOLD }), { x: rightX + 0.15, y: ry, w: rightW - 0.3, h: rowH, valign: 'middle' });
    }
  });
  bottomBar(s, obj);
}

/* ---- BUILD — practiceTriangle ("I do → we do → you do" independent practice) ----
   Follows a Learn-F equation intro and a guessExample worked example: 3 short
   calculation questions on the left, the same equation + formula triangle
   pinned on the right as a live reference. Scaffolded by the reference, not by
   a GUESS table — this is the independent-practice step.
   Schema: { type:"practiceTriangle", topic?, questions:[{q,a,marks?}], equation,
             equationSymbols?:{top,bottomLeft,bottomRight} } */
function slidePracticeTriangle(pptx, L, item) {
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD · YOUR TURN' + (item.topic ? ' · ' + String(item.topic).toUpperCase() : ''), STAGE.build, TOP);
  const leftW = CW * 0.65, rightX = MX + leftW + GAP, rightW = CW - leftW - GAP;
  const bottom = BOT_Y - 0.08;
  const qs = arr(item.questions).slice(0, 3);
  const n = Math.max(1, qs.length);
  const cardH = (bottom - y - (n - 1) * 0.08) / n;
  qs.forEach((q, qi) => {
    const cy = y + qi * (cardH + 0.08);
    const qText = prettyText(q.q || '') + marksTag(q.marks); // 2026-07-05: superscripts/symbols
    // Bug 60 (approved mock 2026-07-10): the answer lives ON the slide, in its own
    // navy/gold box under each question — Patryk adds the reveal animation himself
    // in PowerPoint (same convention as the MCQ answer box). No answer authored →
    // the question keeps the full card.
    const hasA = !!q.a;
    const qH = hasA ? cardH * 0.58 : cardH;
    const qFs = autoFontSize(qText, leftW, qH, { min: 12, max: 22 });
    goldBox(s, MX, cy, leftW, qH, [
      { text: `Q${qi + 1}  `, options: { bold: true, fontSize: qFs } },
      { text: qText, options: { fontSize: qFs } },
    ], { valign: 'middle' });
    if (hasA) {
      const aH = cardH * 0.38;
      txt(s, [
        { text: 'ANSWER   ', options: { bold: true, fontSize: 12, color: 'FFFFFF' } },
        ...toPptxRuns(parseEq(String(q.a)), { fontSize: 16, color: GOLD, bold: true }),
      ], {
        x: MX + 0.35, y: cy + qH + cardH * 0.04, w: leftW - 0.35, h: aH,
        fill: { color: NAVY }, line: GOLD2, valign: 'middle', margin: 8,
      });
    }
  });
  // Speaker notes keep a plain-text copy of the answers (harmless, sometimes handy).
  if (qs.some((q) => q.a)) {
    s.addNotes('Answers:\n' + qs.map((q, i) => `${i + 1}. ${q.a || ''}`).join('\n'));
  }
  // right column: equation reference, standalone and larger since it's alone in the column
  const availH = bottom - y;
  txt(s, 'EQUATION', { x: rightX, y, w: rightW, h: 0.35, color: NAVY, bold: true, fontSize: 13, align: 'center' });
  const eqY = y + 0.35 + GAP;
  const eqH = Math.min(1.1, availH * 0.22);
  s.addShape('rect', { x: rightX, y: eqY, w: rightW, h: eqH, fill: { color: 'FFFFFF' }, line: GOLD2 });
  // Bug 33/53 phase 3: stacked fraction in the reference box when it fits; diagonal fallback
  const ptEqSegs = parseEq(item.equation || '');
  if (!renderEqShapes(s, ptEqSegs, { x: rightX + 0.1, y: eqY, w: rightW - 0.2, h: eqH }, { fontSize: 22, color: NAVY, bold: true })) {
    txt(s, toPptxRuns(ptEqSegs, { fontSize: 22, color: NAVY, bold: true }), { x: rightX + 0.1, y: eqY, w: rightW - 0.2, h: eqH, valign: 'middle', align: 'center', margin: 0 });
  }
  // Triangle only for a genuine 3-symbol relationship (Bug 59) — aspect-locked, never squashed.
  if (triangleUsable(item.equationSymbols)) {
    const triAvailH = availH - 0.35 - GAP - eqH - GAP;
    const triAspect = triangleAspect(item.equationSymbols);   // wider for 3-4 bottom cells
    const triH = Math.min(triAvailH, (rightW - 0.3) / triAspect);
    const triW = triH * triAspect;
    if (triH > 0.7) {
      const triY = eqY + eqH + GAP;
      drawFormulaTriangle(s, rightX + (rightW - triW) / 2, triY + (triAvailH - triH) / 2, triW, triH, item.equationSymbols);
    }
  }
  bottomBar(s, obj);
}

/* ---- BUILD — errorAnalysis (task + answer) -------------------------------- */
function slideErrorAnalysis(pptx, L, item) {
  const obj = objectiveText(L);
  const lines = arr(item.wrongWorking);
  const drawWorking = (s, y, h, highlight) => {
    const runs = lines.map((ln, i) => {
      const isErr = highlight && (i + 1) === item.errorLine;
      return {
        text: `${i + 1}   ${ln}`,
        options: {
          fontSize: 16, breakLine: true, paraSpaceAfter: 10,
          color: isErr ? AMBER : '1A1A2E', underline: !!isErr, bold: !!isErr,
        },
      };
    });
    if (highlight && item.fix) {
      runs.push({ text: '\u2713  ' + item.fix, options: { fontSize: 16, bold: true, color: GREEN_OK, breakLine: true } });
    }
    goldBox(s, MX, y, CW * 0.6, h, runs, { valign: 'top' });
  };

  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 SPOT THE MISTAKE', STAGE.build, TOP);
  const h = BOT_Y - 0.08 - y;
  // Working on the left, wider now that the prompts no longer hog 40% of the slide.
  drawWorking(s, y, h, false);
  const rx = MX + CW * 0.6 + 0.15, rw = CW * 0.4 - 0.15;
  // Compact instruction strip instead of three oversized empty prompt boxes.
  const stripH = 0.95;
  goldBox(s, rx, y, rw, stripH, [
    { text: 'Your task:', options: { bold: true, fontSize: 13, color: AMBER, breakLine: true, paraSpaceAfter: 4 } },
    { text: '1  Which line is wrong?', options: { fontSize: 12, breakLine: true } },
    { text: '2  Why is it wrong?', options: { fontSize: 12, breakLine: true } },
    { text: '3  Write the corrected line.', options: { fontSize: 12 } },
  ], { valign: 'top', fill: 'FFFDE7' });
  // The freed space becomes a real working zone students write into.
  const workZoneY = y + stripH + GAP;
  goldBox(s, rx, workZoneY, rw, h - stripH - GAP, [
    { text: 'Write your answer here', options: { italic: true, fontSize: 11, color: '999999' } },
  ], { valign: 'top', fill: 'FFFFFF' });
  bottomBar(s, obj);

  // answer slide
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, 'BUILD \u00B7 SPOT THE MISTAKE: ANSWER', STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);
  const h2 = BOT_Y - 0.08 - y;
  drawWorking(s, y, h2, true);
  const ansRuns = [
    { text: 'Error on line ' + (item.errorLine || '?'), options: { bold: true, fontSize: 14, breakLine: true, paraSpaceAfter: 8 } },
  ];
  if (item.errorType) ansRuns.push({ text: 'Error type: ' + item.errorType, options: { fontSize: 13, italic: true, breakLine: true, paraSpaceAfter: 8 } });
  if (item.fix) ansRuns.push({ text: 'Corrected: ' + item.fix, options: { fontSize: 13, color: GREEN_OK, bold: true } });
  goldBox(s, MX + CW * 0.6 + 0.15, y, CW * 0.4 - 0.15, h2, ansRuns, { valign: 'top' });
  bottomBar(s, obj);
}

/* ---- BUILD/APPLY — graphInterpret (question + answer) ---------------------- */
function slideGraphInterpret(pptx, L, item) {
  const obj = objectiveText(L);
  const qs = arr(item.questions).slice(0, 3);

  const drawFrame = (s, y, h) => {
    const fw = CW * 0.55;
    slideRect(s, MX, y, fw, h);
    txt(s, item.graphLabel || 'Graph', { x: MX + 0.1, y: y + 0.05, w: fw - 0.2, h: 0.3, bold: true, fontSize: 12, color: NAVY });
    // 2026-10-12 (Patryk): no drawn axes. They had no labels and shrank the graph into a smaller
    // box; the graph image carries its own axes and labels, so it gets the whole frame.
    const ax = MX + 0.1, ay = y + 0.4, aw = fw - 0.2, ah = h - 0.5;
    if (item.annotationZone) {
      annotationZone(s, ax + 0.05, ay + 0.05, aw - 0.1, ah - 0.1);
    } else if (item.imagePlaceholder !== false) {
      imageOrPlaceholder(s, item, ax + 0.05, ay + 0.05, aw - 0.1, ah - 0.1);
    }
    return MX + fw + 0.15;
  };

  // M4: single slide \u2014 Q in navy/white box, A in navy/gold box below; teacher animates A boxes to reveal
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD \u00B7 READ THE GRAPH: ANSWERS', STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);
  const h = BOT_Y - 0.08 - y;
  const rx = drawFrame(s, y, h);
  const rw = SW - rx - MX;
  const ph = (h - (qs.length - 1) * GAP) / Math.max(1, qs.length);
  const innerGap = 0.04;
  const qH = (ph - innerGap) * 0.4;
  const aH = (ph - innerGap) * 0.6;
  qs.forEach((q, i) => {
    const sy = y + i * (ph + GAP);
    const qBody = prettyText(q.q || '') + marksTag(q.marks); // 2026-07-05: superscripts/symbols
    const qFs = autoFontSize(`Q${i + 1}  ` + qBody, rw, qH, { min: 12, max: 20 });
    goldBox(s, rx, sy, rw, qH, [
      { text: `Q${i + 1}  `, options: { bold: true, fontSize: qFs, color: GOLD } },
      { text: qBody, options: { fontSize: qFs, color: 'FFFFFF' } },
    ], { fill: NAVY, line: { color: GOLD, width: 2 }, valign: 'middle' });
    goldBox(s, rx, sy + qH + innerGap, rw, aH, prettyText(q.a || ''), {
      fill: NAVY, color: GOLD, line: { color: GOLD, width: 2 },
      fontSize: autoFontSize(q.a || '', rw, aH, { min: 12, max: 20 }), valign: 'middle',
    });
  });
  bottomBar(s, obj);
}

/* ---- callGraphGen — spawns graph_gen.py, returns temp PNG path ------------- */
// M1: fixed Python script called via execSync; M9: cross-platform py command
function callGraphGen(rd, compact) {
  try {
    const t      = Date.now();
    const inP    = path.join(os.tmpdir(), `gg_in_${t}.json`);
    const outP   = path.join(os.tmpdir(), `gg_out_${t}.png`);
    const py     = process.platform === 'win32' ? 'python' : 'python3';
    const script = path.join(__dirname, 'graph_gen.py');
    fs.writeFileSync(inP, JSON.stringify(Object.assign({}, rd, { compact: !!compact, outPath: outP })));
    _tmpFiles.push(inP, outP);                                  // M10: cleaned up after writeFile
    cp.execSync(`${py} "${script}" "${inP}"`, { stdio: 'pipe' });
    return outP;
  } catch (e) {
    console.error('[graph_gen]', e.message || e);
    return null;
  }
}

/* ---- BUILD — graphResults (Variant A: 70% graph + 30% analysis panel) ----- */
function slideGraphResults(pptx, L, item) {                     // M4
  const rd = (L.worksheetExtras || {}).referenceData;
  if (!rd || !rd.rows) return;
  const pngPath = callGraphGen(rd, false);
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  const y = sectionHeader(s, 'BUILD · RESULTS GRAPH', STAGE.build, TOP);
  const availH = BOT_Y - 0.08 - y;
  const gW  = CW * 0.70;
  const pW  = CW - gW - GAP;
  const pX  = MX + gW + GAP;
  if (pngPath) {
    addImageFit(s, pngPath, MX, y, gW, availH); // 70% left: graph, shape kept
  } else {
    const desc = rd ? `Graph of ${arr(rd.headers)[1] || 'y'} against ${arr(rd.headers)[0] || 'x'}` : null;
    imagePlaceholder(s, MX, y, gW, availH, desc);
  }
  s.addShape('rect', { x: pX, y, w: pW, h: availH, fill: { color: NAVY2 }, line: GOLD2 });
  const notes    = arr(item.graphNotes || []);
  const remarkH  = item.closingRemark ? 0.7 : 0;
  const headH    = 0.45;
  const noteH    = notes.length ? (availH - headH - remarkH - 0.15) / notes.length : 0;
  txt(s, 'Reading the graph', {
    x: pX + 0.1, y: y + 0.05, w: pW - 0.2, h: headH,
    bold: true, fontSize: 13, color: GOLD, align: 'center', valign: 'middle',
  });
  notes.forEach((note, i) => {
    txt(s, [{ text: `${i + 1}  `, options: { bold: true, color: GOLD } }, { text: note }], {
      x: pX + 0.1, y: y + headH + 0.1 + i * (noteH + 0.05), w: pW - 0.2, h: noteH,
      fontSize: 11, color: 'FFFFFF', valign: 'top',
    });
  });
  if (item.closingRemark) {
    txt(s, item.closingRemark, {
      x: pX + 0.1, y: BOT_Y - 0.08 - remarkH, w: pW - 0.2, h: remarkH,
      italic: true, fontSize: 11, color: GOLD, align: 'center', valign: 'middle',
    });
  }
  bottomBar(s, obj);
}

/* ---- BUILD — graphWithData (Variant B: 50% data table + 50% compact graph) */
function slideGraphWithData(pptx, L, item) {                    // M5
  const rd = (L.worksheetExtras || {}).referenceData;
  if (!rd || !rd.rows) return;
  const pngPath = callGraphGen(rd, true);                       // M3: compact=true → no stats box
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  const y = sectionHeader(s, 'BUILD · DATA + GRAPH', STAGE.build, TOP);
  const availH  = BOT_Y - 0.08 - y;
  const halfW   = (CW - GAP) / 2;
  const gX      = MX + halfW + GAP;
  // left: data table — same style as model-data slide (amber header, navy/white rows)
  const headers  = rd.headers || [];
  const colCount = Math.max(headers.length, rd.rows[0] ? arr(rd.rows[0]).length : 1, 1);
  const colW     = Array(colCount).fill(halfW / colCount);
  const tRows    = [];
  if (headers.length) tRows.push(headers.map((h) => ({ text: String(h), options: { fill: { color: NAVY }, color: AMBER, bold: true, fontSize: 15, border: ab(AMBER), valign: 'middle', align: 'center' } })));
  rd.rows.forEach((row) => tRows.push(arr(row).map((cell) => ({ text: String(cell == null ? '' : cell), options: { fill: { color: 'FFFFFF' }, color: NAVY, fontSize: 15, border: ab(NAVY), valign: 'middle', align: 'center' } }))));
  const rowH = Math.max(0.45, availH / Math.max(1, tRows.length));
  table(s, tRows, { x: MX, y, w: halfW, colW, rowH: Array(tRows.length).fill(rowH), fontFace: FONT, margin: 0.06, autoPage: false });
  if (pngPath) {
    addImageFit(s, pngPath, gX, y, halfW, availH); // right: compact graph, shape kept
  } else {
    const desc = `Graph of ${arr(rd.headers)[1] || 'y'} against ${arr(rd.headers)[0] || 'x'}`;
    imagePlaceholder(s, gX, y, halfW, availH, desc);
  }
  bottomBar(s, obj);
}

/* ---- VISUALISER — mandatory in standard + practical ------------------------ */
function slideVisualiser(pptx, L, item) {
  const s = pptx.addSlide();
  s.background = { color: PURPLE_BG };
  navBar(s, 'build');
  const url = (item && item.url) || (L.meta && L.meta.visualiserUrl) || 'https://apps.ipevo.com/pwa/visualizer.app/';
  const subtitle = (item && (item.context || item.subtitle)) || `Model answers under the visualiser \u00B7 ${String(L.meta.topic || '').replace(/_/g, ' ')}`;
  const heights = [0.9, 0.2, 0.35, 0.25, 0.7, 0.15, 0.3];
  const total = heights.reduce((a, b) => a + b, 0);
  let y = NAV_H + ACC_H + (5.6 - total) / 2;
  txt(s, 'IPEVO Visualiser', { x: 0, y, w: SW, h: 0.9, color: GOLD, bold: true, fontSize: 40, align: 'center', valign: 'middle' });
  y += 0.9 + 0.2;
  txt(s, subtitle, { x: 0, y, w: SW, h: 0.35, color: 'FFFFFF', fontSize: 14, align: 'center', valign: 'middle' });
  y += 0.35 + 0.25;
  const lw = SW * 0.55, lx = (SW - lw) / 2;
  if (url) {
    goldBox(s, lx, y, lw, 0.7, [{ text: url, options: { color: TEAL, fontSize: 16, underline: true, hyperlink: { url } } }],
      { align: 'center', valign: 'middle' });
  } else {
    goldBox(s, lx, y, lw, 0.7, '[Visualiser link \u00B7 teacher inserts]', { color: '666666', italic: true, fontSize: 14, align: 'center', valign: 'middle' });
  }
  y += 0.7 + 0.15;
  txt(s, '\u2191  Click to open', { x: 0, y, w: SW, h: 0.3, color: 'FFFFFF', italic: true, fontSize: 11, align: 'center' });
  bottomBar(s, objectiveText(L));
}
