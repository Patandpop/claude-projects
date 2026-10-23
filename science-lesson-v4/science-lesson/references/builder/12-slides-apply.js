'use strict';
// build.js part 12-slides-apply: Apply, exam question + mark scheme, review tiers, EBI task, extension, answer list, whiteboard rounds, predict then check, image bank. Loaded by build.js in order; all parts share one scope.

/* ---- APPLY — variants A / B / C -------------------------------------------- */
function pickApplyVariant(apply) {
  if (apply.variant) return String(apply.variant).toUpperCase();
  const mast = arr(apply.mastering).map(normQ);
  if (mast.length === 1 && (mast[0].q || '').length > 160) return 'B';
  return 'A'; // default: individual question boxes — never silently fall to the unified-box layout (C)
}
/* ---- EXAM QUESTION + MARK SCHEME (Patryk 2026-10-03) ------------------------------
   After Apply, every Year 9-11 lesson shows ONE real exam question on the board (chosen by
   exam-pick.js at home), answered in books, then its real mark scheme. Text is VERBATIM.
   L.examQuestion = { examRef, board, marks, passRate, figure:{path,w,h}|null,
                      groups:[{ stem, parts:[{label,text,marks,ms,commonError,passRate}] }] } */
function examQuestionRuns(eq, fs) {
  const runs = [];
  eq.groups.forEach((g) => {
    if (g.stem) runs.push({ text: g.stem, options: { fontSize: fs, breakLine: true, paraSpaceAfter: 6 } });
    g.parts.forEach((p) => {
      if (p.label) runs.push({ text: `(${p.label})  `, options: { fontSize: fs, bold: true, color: NAVY } });
      runs.push({ text: p.text, options: { fontSize: fs } });
      runs.push({ text: `   [${p.marks} mark${p.marks === 1 ? '' : 's'}]`, options: { fontSize: Math.max(14, fs - 4), color: '777777', breakLine: true, paraSpaceAfter: 8 } });
    });
  });
  return runs;
}

function slideExamQuestion(pptx, L) {
  const eq = L.examQuestion;
  if (!eq || !arr(eq.groups).length) return;
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'apply');
  let y = sectionHeader(s, `EXAM QUESTION \u00B7 ${eq.board || 'AQA'} \u00B7 ${eq.marks} MARKS`, STAGE.apply, TOP);
  txt(s, 'Real exam question. Answer it in your book.', { x: MX, y, w: CW, h: 0.35, italic: true, fontSize: 14, color: '333333', valign: 'middle' });
  y += 0.42;
  const h = BOT_Y - 0.1 - y;
  const plain = eq.groups.map((g) => [g.stem, ...g.parts.map((p) => `(${p.label}) ${p.text} [${p.marks} marks]`)].filter(Boolean).join(' ')).join(' ');
  let tx = MX, tw = CW;
  if (eq.figure && eq.figure.path && fs.existsSync(eq.figure.path)) {
    // figure on the left, at most half the width, never stretched
    const maxW = CW * 0.48, maxH = h;
    const r = (eq.figure.w && eq.figure.h) ? eq.figure.w / eq.figure.h : 4 / 3;
    let iw = maxW, ih = iw / r;
    if (ih > maxH) { ih = maxH; iw = ih * r; }
    s.addImage({ path: eq.figure.path, x: MX, y: y + (maxH - ih) / 2, w: iw, h: ih });
    tx = MX + iw + 0.25; tw = CW - iw - 0.25;
  }
  const fsz = autoFontSize(plain, tw - 0.2, h, { min: 16, max: 26 });
  goldBox(s, tx, y, tw, h, examQuestionRuns(eq, fsz), { valign: 'top', margin: 10 });
  bottomBar(s, obj);
}

function slideExamMarkScheme(pptx, L) {
  const eq = L.examQuestion;
  if (!eq || !arr(eq.groups).length) return;
  const obj = objectiveText(L);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'apply');
  let y = sectionHeader(s, 'EXAM QUESTION \u00B7 MARK SCHEME', STAGE.apply, TOP);
  txt(s, 'Mark your answer in purple pen. This is the real examiner mark scheme.', { x: MX, y, w: CW, h: 0.35, italic: true, fontSize: 14, color: '333333', valign: 'middle' });
  y += 0.42;
  const parts = eq.groups.flatMap((g) => g.parts);
  const insight = parts.map((p) => {
    const bits = [];
    if (p.passRate != null) bits.push(`${p.passRate}% of students got (${p.label || 'this'}) right.`);
    if (p.commonError) bits.push(p.commonError);
    return bits.join(' ');
  }).filter(Boolean).join('  ');
  const insH = insight ? 1.1 : 0;
  const h = BOT_Y - 0.1 - y - (insH ? insH + 0.12 : 0);
  // AQA writes marking points as one run-on line with a bare "1" after each point. Put each point on
  // its own line and show its mark as "(1)". The words themselves are untouched (verbatim rule).
  const UNIT = /^(kg|g|mg|m|cm|mm|km|s|ms|h|min|j|kj|mj|w|kw|mw|n|v|a|ma|hz|khz|k|pa|kpa|mol|dm|l|ml|%)\b/i;
  const points = (ms) => {
    const out = []; let cur = '';
    const toks = String(ms || '').split(/\s+/);
    toks.forEach((t, k) => {
      const next = toks[k + 1] || '';
      if (/^[1-3]$/.test(t) && cur && !UNIT.test(next)) { out.push(`${cur.trim()}  (${t})`); cur = ''; }
      else cur += ' ' + t;
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  };
  // one navy/gold box per part (each answer appears on its own click), height shared by text length
  const texts = parts.map((p) => points(p.ms));
  const weight = texts.map((t) => Math.max(60, t.join(' ').length + 40 * t.length));
  const avail = h - 0.1 * (parts.length - 1);
  const tot = weight.reduce((a, b) => a + b, 0);
  let yy = y;
  parts.forEach((p, i) => {
    const bh = avail * weight[i] / tot;
    const lines = texts[i];
    const plain = `(${p.label || i + 1})  ` + lines.join(' ');
    const fsz = autoFontSize(plain, CW - 0.25, bh, { min: 16, max: 24, linesHint: undefined });
    const runs = [{ text: `(${p.label || i + 1})  `, options: { fontSize: fsz, bold: true } }];
    lines.forEach((ln, k) => runs.push({ text: ln, options: { fontSize: fsz, breakLine: k < lines.length - 1 } }));
    goldBox(s, MX, yy, CW, bh, runs, { fill: NAVY, color: GOLD, valign: 'middle', margin: 10 });
    yy += bh + 0.1;
  });
  if (insight) {
    const iy = BOT_Y - 0.1 - insH;
    txt(s, [{ text: 'What the examiner saw:  ', options: { bold: true, color: NAVY } }, { text: insight }], {
      x: MX, y: iy, w: CW, h: insH, fontSize: autoFontSize(insight, CW - 0.3, insH, { min: 12, max: 16 }),
      color: '333333', fill: { color: 'FFF8E1' }, line: GOLD2, valign: 'middle', margin: 8, fit: 'shrink',
    });
  }
  bottomBar(s, obj);
}

// Patryk 2026-10-07: the exam question and its mark scheme come after the Apply answers (Review slides).
function slideExam(pptx, L) {
  slideExamQuestion(pptx, L);
  slideExamMarkScheme(pptx, L);
}

function slideApply(pptx, L) {
  const apply = L.apply; if (!apply) return;
  const obj = objectiveText(L);
  const variant = pickApplyVariant(apply);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'apply');
  let y = sectionHeader(s, 'APPLY \u00B7 CHOOSE YOUR LEVEL', STAGE.apply, TOP);
  const ref = lessonBookRef(L);
  if (ref) {
    // top-right dark-blue / gold reference tag, overlaid on the header band
    txt(s, ref, { x: SW - 4.6, y: TOP, w: 4.5, h: 0.38, fill: { color: NAVY },
      color: GOLD, bold: true, fontSize: 10.5, align: 'right', valign: 'middle', margin: 6 });
  }
  const bottom = BOT_Y - 0.08;
  const tiers = TIERS.map((t) => ({ t, qs: arr(apply[t]).map(normQ) })).filter((x) => x.qs.length);

  if (variant === 'B') {
    const dev = arr(apply.developing).map(normQ), rea = arr(apply.reaching).map(normQ), mas = arr(apply.mastering).map(normQ);
    const halfH = (bottom - y - GAP) / 2;
    const colW = (CW - 0.15) / 2;
    tierColumn(s, MX, y, colW, halfH, 'developing', dev);
    tierColumn(s, MX + colW + 0.15, y, colW, halfH, 'reaching', rea);
    tierColumn(s, MX, y + halfH + GAP, CW, halfH, 'mastering', mas);
  } else if (variant === 'A') { // A — individual question boxes, three tiers across (DEFAULT, per-question gold boxes)
    const colW = (CW - 2 * 0.15) / 3;
    const maxRows = Math.max(1, ...tiers.map((x) => x.qs.length));
    const bodyH = bottom - y - 0.42 - 0.06;
    const cardH = (bodyH - (maxRows - 1) * 0.08) / maxRows;
    tiers.forEach((x, ci) => {
      const cx = MX + ci * (colW + 0.15);
      txt(s, x.t.toUpperCase(), { x: cx, y, w: colW, h: 0.42, fill: { color: TIER_PPTX[x.t] }, color: 'FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle' });
      x.qs.forEach((q, qi) => {
        const qFs = autoFontSize(q.q, colW, cardH, { min: 10, max: 22 });
        goldBox(s, cx, y + 0.42 + 0.06 + qi * (cardH + 0.08), colW, cardH, [
          { text: `Q${qi + 1}  `, options: { bold: true, fontSize: qFs } },
          { text: prettyText(q.q) + marksTag(q.marks), options: { fontSize: qFs } }, // 2026-07-05: superscripts/symbols
        ], { valign: 'middle' });
      });
    });
  } else { // C — unified tier columns (revision/whiteboard only; NEVER the silent default)
    const colW = (CW - 2 * 0.15) / 3;
    tiers.forEach((x, ci) => {
      tierColumn(s, MX + ci * (colW + 0.15), y, colW, bottom - y, x.t, x.qs);
    });
  }
  bottomBar(s, obj);
}

/* ---- REVIEW — tiered slides, arithmetic height, no dead space --------------- */
function slideReviewTier(pptx, L, tier, questions) {
  if (!questions.length) return;
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'review');
  txt(s, 'Review \u00B7 ' + (tier ? tier.toUpperCase() : 'TODAY\u2019S LEARNING'), {
    x: MX, y: 0.66, w: CW * 0.7, h: 0.35, color: tier ? TIER_PPTX[tier] : NAVY, bold: true, fontSize: 18, valign: 'middle',
  });
  let y = purplePenBar(s, 1.04);
  const bottom = BOT_Y - 0.08;
  const n = questions.length;
  const rowH = (bottom - y - (n - 1) * 0.06) / n;       // fill the slide — no dead space
  questions.forEach((q) => {
    reviewRow(s, y, rowH, tier, q.q || '', q.a || '');   // verbatim question
    y += rowH + 0.06;
  });
  bottomBar(s, objectiveText(L));
}
function buildReviewSlides(pptx, L) {
  const r = L.review || {};
  const tiered = TIERS.some((t) => arr(r[t]).length);
  if (tiered) {
    TIERS.forEach((t) => slideReviewTier(pptx, L, t, arr(r[t]).map(normQ)));
    return;
  }
  if (arr(r.questions).length) {
    slideReviewTier(pptx, L, null, arr(r.questions).map(normQ));
    return;
  }
  // fall back to apply q/a verbatim
  if (L.apply) {
    TIERS.forEach((t) => {
      const qs = arr(L.apply[t]).map(normQ).filter((q) => q.a);
      slideReviewTier(pptx, L, t, qs);
    });
  }
}

/* ---- REVIEW lessons: EBI corrections + Extension (Patryk 2026-10-10) ----------------------------
   After the test review answers, pupils correct 3 EBIs in purple pen using the follow-up tasks on
   the front of the school's test and the support pages, then pupils who have finished go to the
   Extension: harder real exam questions per subtopic with the support page.
     ebiTask:   { rows: [{ q: "Q1", task: "<front-of-test follow-up task, verbatim>", pages: "P6.3 p.80" }] }
     extension: [{ subtopic: "Specific latent heat", pages: "P6.5 p.84", questions: [{ q, a, marks, ref }] }]
   Both optional; nothing is drawn when absent. Answers reveal on click (navy/gold boxes). */
function slideEbiTask(pptx, L) {
  const t = L.ebiTask;
  const rows = arr(t && t.rows);
  if (!rows.length) return;
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'review');
  let y = sectionHeader(s, 'PURPLE PEN · CORRECT 3 EBIs', PURPLE_PEN, TOP);
  const steps = arr(t.steps).length ? arr(t.steps) : ['Pick 3 EBIs from the front of your test', 'Do that question’s follow-up task in purple pen',
    'Use the support page in the textbook', 'Finished all 3? Go to the Extension'];
  const sw = (CW - (steps.length - 1) * 0.1) / steps.length;
  steps.forEach((st, i) => {
    txt(s, [{ text: `${i + 1}  `, options: { bold: true, color: GOLD, fontSize: 16 } }, { text: st, options: { color: 'FFFFFF', fontSize: 12 } }],
      { x: MX + i * (sw + 0.1), y, w: sw, h: 0.62, fill: { color: PURPLE_PEN }, align: 'left', valign: 'middle', margin: 6, fit: 'shrink' });
  });
  y += 0.62 + GAP;
  // KS3/KS4 tests come as Core + Extend papers with different front-cover tasks: rows with
  // "paper" get one table per paper, side by side, sized to fill the slide (2026-10-12)
  const papers = [...new Set(rows.map((r) => r.paper).filter(Boolean))];
  if (papers.length > 1) {
    const colGap = 0.2, tw = (CW - colGap * (papers.length - 1)) / papers.length;
    const avail = BOT_Y - 0.08 - y - 0.42;
    papers.forEach((pp, pi) => {
      const pr = rows.filter((r) => r.paper === pp);
      const tx = MX + pi * (tw + colGap);
      txt(s, String(pp).toUpperCase().replace(/^EXTEND$/, 'CHALLENGE') + ' PAPER', { x: tx, y, w: tw, h: 0.38, fill: { color: NAVY }, color: GOLD, bold: true, fontSize: 15, align: 'center', valign: 'middle' });
      const cw = [tw * 0.13, tw * 0.64, tw * 0.23];
      let fs = 20;
      for (; fs > 10; fs--) {
        const lines = pr.reduce((n, r) => n + Math.max(Math.ceil(prettyText(r.task || '').length / Math.floor((cw[1] - 0.1) * 120 / fs)),
          Math.ceil(pagesOnly(r.pages).length / Math.floor((cw[2] - 0.1) * 120 / fs))), 0);
        if ((lines * fs * 1.3) / 72 + pr.length * 0.12 <= avail * 0.92) break;
      }
      const trows = pr.map((r, i) => {
        const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
        return [{ text: String(r.q || ''), options: { fill: { color: fill }, bold: true, fontSize: fs, align: 'center', valign: 'middle' } },
          { text: prettyText(r.task || ''), options: { fill: { color: fill }, fontSize: fs, valign: 'middle' } },
          { text: pagesOnly(r.pages), options: { fill: { color: fill }, fontSize: fs, align: 'center', valign: 'middle' } }];
      });
      table(s, trows, { x: tx, y: y + 0.42, w: tw, colW: cw, rowH: avail / pr.length, fontFace: FONT, border: { type: 'solid', pt: 0.5, color: 'BBBBBB' }, margin: 0.06, autoPage: false });
    });
    bottomBar(s, objectiveText(L));
    return;
  }
  const total = rows.reduce((n, r) => n + String(r.task || '').length, 0);
  const fs = total > 1400 ? 11 : total > 1000 ? 13 : total > 600 ? 15 : 17;
  const head = (h) => ({ text: h, options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: fs } });
  const trows = [[head('Question'), head('Follow-up task (front of your test)'), head('Support pages')]].concat(rows.map((r, i) => {
    const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
    return [{ text: String(r.q || ''), options: { fill: { color: fill }, bold: true, fontSize: fs, align: 'center' } },
      { text: prettyText(r.task || ''), options: { fill: { color: fill }, fontSize: fs } },
      { text: pagesOnly(r.pages), options: { fill: { color: fill }, fontSize: fs, align: 'center' } }];
  }));
  table(s, trows, { x: MX, y, w: CW, colW: [CW * 0.12, CW * 0.68, CW * 0.2], fontFace: FONT, border: { type: 'solid', pt: 0.5, color: 'BBBBBB' }, margin: 0.05, autoPage: false });
  bottomBar(s, objectiveText(L));
}
// extension questions numbered E1, E2 ... across the columns (the answers slide and sheets use the same numbers)
function extensionCols(L) {
  let n = 0;
  return arr(L.extension).slice(0, 4).map((c) => ({ subtopic: c.subtopic || '', pages: pagesOnly(c.pages), qs: arr(c.questions).map(normQ).map((q) => Object.assign({ label: 'E' + (++n), sub: c.subtopic || '' }, q)) }))
    .filter((c) => c.qs.length);
}
// The text size the cards of these columns would get on one slide.
function extensionFontFor(cols) {
  const colW = (CW - (cols.length - 1) * 0.15) / cols.length;
  const avail = BOT_Y - 0.08 - (TOP + 0.38 + GAP) - 0.62 - 0.06;
  const bodyOf = (q) => `${q.label}  ` + prettyText(q.q) + marksTag(q.marks);
  return Math.min(...cols.flatMap((c) => {
    const lens = c.qs.map((q) => Math.max(170, bodyOf(q).length));
    const sum = lens.reduce((a, b) => a + b, 0), gaps = (c.qs.length - 1) * 0.08;
    return c.qs.map((q, qi) => autoFontSize(bodyOf(q), colW, (avail - gaps) * lens[qi] / sum, { min: 9, max: 18 }));
  }));
}
// One slide, a column per subtopic (Patryk 2026-10-10). Long real exam questions would come out
// too small to read from the back on one slide, so then the columns go two to a slide.
function slideExtension(pptx, L) {
  const all = extensionCols(L);
  if (!all.length) return;
  const groups = all.length > 2 && extensionFontFor(all) < 12 ? [all.slice(0, 2), all.slice(2, 4)] : [all];
  groups.forEach((g, gi) => slideExtensionPart(pptx, L, g, groups.length > 1 ? ` (${gi + 1} of ${groups.length})` : ''));
}
function slideExtensionPart(pptx, L, cols, partLabel) {
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'review');
  let y = sectionHeader(s, 'EXTENSION · FINISHED YOUR 3 EBIs? PICK YOUR SUBTOPIC' + partLabel + ' (also in your booklet)', STAGE.review, TOP);
  const bottom = BOT_Y - 0.08;
  const colW = (CW - (cols.length - 1) * 0.15) / cols.length;
  const headH = 0.62;
  // each card is as tall as its question needs (a long calculation gets more room than "What is
  // meant by ...?"), and every card uses the same text size, the largest that fits them all
  const avail = bottom - y - headH - 0.06;
  const bodyOf = (q) => `${q.label}  ` + prettyText(q.q) + marksTag(q.marks);
  const layout = cols.map((c) => {
    const lens = c.qs.map((q) => Math.max(170, bodyOf(q).length));
    const sum = lens.reduce((a, b) => a + b, 0), gaps = (c.qs.length - 1) * 0.08;
    return lens.map((l) => (avail - gaps) * l / sum);
  });
  const qFs = Math.min(...cols.flatMap((c, ci) => c.qs.map((q, qi) => autoFontSize(bodyOf(q), colW, layout[ci][qi], { min: 9, max: 18 }))));
  cols.forEach((c, ci) => {
    const cx = MX + ci * (colW + 0.15);
    txt(s, [{ text: c.subtopic, options: { bold: true, color: GOLD, fontSize: 13, breakLine: true } },
      { text: c.pages ? 'Support: ' + c.pages : '', options: { color: 'FFFFFF', fontSize: 10.5 } }],
      { x: cx, y, w: colW, h: headH, fill: { color: NAVY }, align: 'center', valign: 'middle', margin: 4, fit: 'shrink' });
    let cy = y + headH + 0.06;
    c.qs.forEach((q, qi) => {
      goldBox(s, cx, cy, colW, layout[ci][qi], [
        { text: `${q.label}  `, options: { bold: true, fontSize: qFs, color: AMBER } },
        { text: prettyText(q.q) + marksTag(q.marks), options: { fontSize: qFs } },
      ], { valign: 'top' });
      cy += layout[ci][qi] + 0.08;
    });
  });
  bottomBar(s, objectiveText(L));
}
function slideExtensionAnswers(pptx, L) {
  const qs = extensionCols(L).flatMap((c) => c.qs);
  for (let i = 0; i < qs.length; i += 5) {
    const part = qs.slice(i, i + 5);
    const s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'review');
    let y = sectionHeader(s, 'EXTENSION · ANSWERS' + (qs.length > 5 ? ` (${i / 5 + 1} of ${Math.ceil(qs.length / 5)})` : ''), STAGE.review, TOP);
    if (!isReviewLesson(L)) y = purplePenBar(s, y);   // whole-paper review: no purple-pen bar (Patryk 2026-10-12)
    const bottom = BOT_Y - 0.08;
    const rowH = (bottom - y - (part.length - 1) * 0.06) / part.length;
    // the question itself is on the Extension slide and in the booklet: here just its number + subtopic
    part.forEach((q) => { reviewRow(s, y, rowH, null, `${q.label}  ${q.sub}`, q.a || ''); y += rowH + 0.06; });
    bottomBar(s, objectiveText(L));
  }
}
function buildReviewExtras(pptx, L) {
  slideEbiTask(pptx, L);
  slideExtension(pptx, L);
  slideExtensionAnswers(pptx, L);
}
/* answerList build item (review lessons): short test parts answered together, Q | answer rows with the
   answer revealed on click; up to 6 rows a slide.  { type: "answerList", heading, rows: [{ q, a }] } */
const isReviewLesson = (L) => ((L.meta && L.meta.lessonType) || L.lessonType) === 'review';
function slideAnswerList(pptx, L, item) {
  const rows = arr(item.rows).map(normQ);
  // MCQ rows state the letter: { q, correct: "B", a: "the option text" } → "B   the option text"
  const answerOf = (q) => (q.correct ? `${q.correct}${q.a ? '   ' + q.a : ''}` : (q.a || ''));
  // rows with a picture of the paper's question: 3 a slide, picture left, answer right
  const snips = rows.map((q) => (q.qn || q.snippet || q.core || q.extend ? snippetFor(L, q, q.qn) : null));
  const cap = snips.some(Boolean) ? 3 : 6;
  const per = Math.ceil(rows.length / Math.ceil(rows.length / cap));   // balanced: 4 rows → 2 + 2, not 3 + 1
  for (let i = 0; i < rows.length; i += per) {
    const part = rows.slice(i, i + per);
    const s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'build');
    let y = sectionHeader(s, item.heading || 'QUICK ANSWERS', STAGE.build, TOP, null, isReviewLesson(L));
    if (!isReviewLesson(L)) y = purplePenBar(s, y);   // whole-paper review: no purple-pen bar (Patryk 2026-10-12)
    const bottom = BOT_Y - 0.08;
    const rowH = (bottom - y - (part.length - 1) * 0.06) / part.length;
    part.forEach((q, k) => {
      const snip = snips[i + k];
      if (snip) {
        const lw = CW * 0.62;
        s.addShape('rect', { x: MX, y, w: lw, h: rowH, fill: { color: 'FFFFFF' }, line: GOLD2 });
        const tagH = (q.core || q.extend) ? 0.3 : 0;
        if (tagH) txt(s, qLabel(q), { x: MX, y, w: lw, h: tagH, fill: { color: NAVY }, color: GOLD, bold: true, fontSize: 12, align: 'left', valign: 'middle', margin: 6 });
        addImageFit(s, snip, MX + 0.04, y + tagH + 0.04, lw - 0.08, rowH - tagH - 0.08);
        const a = prettyText(answerOf(q));
        const big = !!q.correct;
        txt(s, a, {
          x: MX + lw + 0.08, y, w: CW - lw - 0.08, h: rowH, fill: { color: NAVY }, line: GOLD2, color: GOLD,
          bold: big, fontSize: autoFontSize(a, CW - lw - 0.08, rowH, { min: 14, max: big ? 40 : 26 }),
          align: big ? 'center' : 'left', valign: 'middle', margin: 8, fit: 'shrink',
        });
      } else reviewRow(s, y, rowH, null, (q.core || q.extend ? qLabel(q) + ' · ' : '') + (q.q || ''), answerOf(q));
      y += rowH + 0.06;
    });
    bottomBar(s, objectiveText(L));
  }
}

/* ---- WHITEBOARD Q&A rounds --------------------------------------------------- */
function slideWhiteboardRounds(pptx, L) {
  const rounds = arr(L.whiteboard && L.whiteboard.rounds ? L.whiteboard.rounds : L.whiteboard);
  if (!rounds.length) return;
  const obj = objectiveText(L);
  rounds.forEach((r, i) => {
    const head = `${r.subject ? r.subject + ' ' : ''}Round \u00B7 Q${i + 1} of ${rounds.length}`;
    // question slide
    let s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'build');
    let y = sectionHeader(s, head, STAGE.build, TOP);
    goldBox(s, MX, y + 0.4, CW, 2.5, prettyText(r.q || ''), { fill: BG, bold: true, fontSize: 24, align: 'center', valign: 'middle' });
    bottomBar(s, obj);
    // answer slide
    s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'build');
    y = sectionHeader(s, head + ' \u00B7 ANSWER', STAGE.build, TOP);
    goldBox(s, MX, y, CW, 2.0, prettyText(r.q || ''), { fill: BG, bold: true, fontSize: 20, align: 'center', valign: 'middle' });
    goldBox(s, MX, y + 2.0 + GAP, CW, 1.8, r.a || '', { bold: true, fontSize: 15, color: NAVY, align: 'center', valign: 'middle' });
    bottomBar(s, obj);
  });
}

/* ---- BUILD — predictThenCheck (two slides) ---------------------------------- */
// Best diagnostic value of any non-MCQ check: students commit their mental model
// BEFORE the reveal, exposing reasoning gaps rather than just recall failures.
// Use instead of MCQ when the lesson's key idea involves a mechanism students
// often mispredict (e.g. forces, energy transfer, rates of reaction).
// Schema: { type:"predictThenCheck", setup, prediction, reveal, explanation, commonError? }
function slidePredictThenCheck(pptx, L, item) {
  const obj = objectiveText(L);

  // --- Slide 1: Predict ---
  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, 'BUILD · MAKE A PREDICTION', STAGE.build, TOP);

  if (item.setup) {
    goldBox(s, MX, y, CW, 0.75, item.setup, { italic: true, fontSize: 13, fill: 'FFFDE7', valign: 'middle' });
    y += 0.75 + GAP;
  }

  const predH = 1.3;
  txt(s, item.prediction || 'What do you predict?', {
    x: MX, y, w: CW, h: predH,
    fill: { color: AMBER }, color: 'FFFFFF',
    bold: true, fontSize: 22, align: 'center', valign: 'middle', margin: 12,
  });
  y += predH + GAP;

  const noteH = BOT_Y - 0.08 - y - 0.45 - GAP;
  if (noteH > 0.3) {
    goldBox(s, MX, y, CW, noteH, [
      { text: 'Write your prediction in your book now.', options: { fontSize: 14, italic: true, color: '555555' } },
    ], { fill: 'FFFDE7', valign: 'middle', align: 'center' });
    y += noteH + GAP;
  }

  txt(s, 'Commit your prediction before seeing the answer', {
    x: MX, y, w: CW, h: 0.45,
    fill: { color: NAVY }, color: 'FFFFFF',
    bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  bottomBar(s, obj);

  // --- Slide 2: Check ---
  s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  y = sectionHeader(s, 'BUILD · CHECK YOUR PREDICTION', STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);

  const colW = (CW - 0.2) / 2;
  const hdrH = 0.38;
  const availH = BOT_Y - 0.08 - y;
  const expH = item.explanation ? Math.min(availH * 0.30, 1.3) : 0;
  const resH = availH - hdrH - (expH > 0 ? expH + GAP : 0) - GAP;

  txt(s, 'YOUR PREDICTION', {
    x: MX, y, w: colW, h: hdrH,
    fill: { color: AMBER }, color: 'FFFFFF', bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  goldBox(s, MX, y + hdrH, colW, resH, item.prediction || '', { italic: true, fontSize: 16, valign: 'middle' });

  const rx = MX + colW + 0.2;
  txt(s, 'WHAT ACTUALLY HAPPENS', {
    x: rx, y, w: colW, h: hdrH,
    fill: { color: NAVY }, color: GOLD, bold: true, fontSize: 12, align: 'center', valign: 'middle',
  });
  goldBox(s, rx, y + hdrH, colW, resH, item.reveal || '', { fill: NAVY, line: { color: GOLD, width: 2 }, bold: true, fontSize: 16, color: GOLD, valign: 'middle' });

  y += hdrH + resH + GAP;

  if (item.explanation && expH > 0.2) {
    goldBox(s, MX, y, CW, expH, [
      { text: 'WHY:  ', options: { bold: true, fontSize: 13, color: NAVY } },
      { text: item.explanation, options: { fontSize: 13 } },
    ], { valign: 'middle' });
  }
  bottomBar(s, obj);
}

/* image_dump — image-bank grid appended last. Patryk ruling 2026-07-09: he ALWAYS
   wants this slide when the lesson has any images (it was missing from lessons
   whose JSON had no explicit image_dump field). So the slide now self-assembles:
   generated graphs + every embedded image used on slides + the authored dump list,
   deduplicated by path. Generated assets (graphs) also stay on disk in the output
   folder. */
function slideImageDump(pptx, L) {
  const rd = (L.worksheetExtras || {}).referenceData;
  const autoImages = [];
  if (rd && rd.rows) {
    const pngPath = callGraphGen(rd, false);
    if (pngPath) autoImages.push({ path: pngPath, label: 'Results graph' });
  }
  // Every image actually embedded on a slide, labelled by where it was used.
  const embedded = [];
  const grab = (it, label) => {
    if (it && it.embeddedImagePath) embedded.push({ path: it.embeddedImagePath, label });
  };
  grab(L.engage, 'Engage');
  arr(L.learn).forEach((it, i) => {
    grab(it, `Learn ${String(it.variant || '').toUpperCase() || i + 1}`);
    arr(it.events).forEach((ev, j) => grab(ev, `Timeline event ${j + 1}`));
  });
  arr(L.build).forEach((b) => grab(b, (b.type || b.variant || 'Build') + ''));
  const userImages = Array.isArray((L.image_dump || {}).images) ? L.image_dump.images : [];
  const seen = new Set();
  const images = [...autoImages, ...embedded, ...userImages].filter((img) => {
    const key = img.path || img.label || '';
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!images.length) return;

  const s = pptx.addSlide();
  s.background = { color: BG };

  // Navy header bar with gold title — house style. Patryk KEEPS this slide (2026-07-09
  // ruling) — it is the lesson's image bank, not a delete-me artifact.
  const headerH = 0.5;
  txt(s, 'IMAGE BANK · sources and assets used in this lesson', {
    x: 0, y: 0, w: SW, h: headerH,
    fill: { color: NAVY }, color: GOLD, bold: true,
    fontSize: 14, align: 'center', valign: 'middle',
  });
  // Gold accent line below header (matches navBar style)
  s.addShape('rect', { x: 0, y: headerH, w: SW, h: ACC_H, fill: { color: GOLD }, line: { type: 'none' } });

  const COLS = Math.min(3, images.length);   // max 3 per row per spec
  const rows = Math.ceil(images.length / COLS);
  const cellW = CW / COLS;
  const labelH = 0.30;
  const startY = headerH + ACC_H + GAP;
  const availH = BOT_Y - 0.08 - startY;
  const cellH = availH / rows;
  const imgH = Math.max(0.3, cellH - labelH - GAP * 0.5);

  images.forEach((img, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = MX + col * cellW;
    const y = startY + row * cellH;
    const iw = cellW - GAP;
    try {
      if (img.path && fs.existsSync(img.path)) {
        addImageFit(s, img.path, x, y, iw, imgH);
      } else {
        imagePlaceholder(s, x, y, iw, imgH, img.label || 'no path');
      }
    } catch (e) {
      buildWarn(`image bank: "${img.label || img.path}" failed to load (${e.message || e}) — grey placeholder shipped`);
      imagePlaceholder(s, x, y, iw, imgH, img.label || 'load error');
    }
    // Gold italic label below each image (always gold — unassigned shown grey-gold)
    txt(s, img.label || 'unassigned', {
      x, y: y + imgH + 0.04, w: iw, h: labelH,
      color: img.label ? GOLD : '9E8020',
      fontSize: 10, align: 'center', valign: 'top', italic: true,
    });
  });
}
