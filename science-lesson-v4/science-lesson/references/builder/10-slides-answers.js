'use strict';
// build.js part 10-slides-answers: marking panels, exam snippets, model answer review, mark the answers. Loaded by build.js in order; all parts share one scope.

/* ---- BUILD — modelAnswerReview (M4-M11) -----------------------------------
   One slide per test question. Left: handwritten model answer (or, for
   qType:'graph', a standard graph_gen.py plot). Right: navy/gold marking
   panel built from indicative content already extracted (by Claude, at
   authoring time, from the real source mark scheme PDF — this renderer never
   invents marking content). See slide-options-v4.md for the full JSON shape. */
function buildMarkingPanelRuns(item, opts) {
  // opts.fs = base size (default 14, the original look); opts.only = 'points' | 'bands' to
  // draw half of the panel (Mark the Answers splits a long scheme over two columns).
  const o = opts || {};
  const F = o.fs || 14, d = (n) => Math.max(9, F - n);
  const show = (part) => !o.only || o.only === part;
  const runs = [];
  const push = (text, opts) => runs.push({ text, options: opts });

  // M7: navy background, gold text — gold is the base colour throughout the
  // panel (exclusions use a deliberate red accent to flag "wrong" at a glance).
  // Section order (Patryk 2026-07-05): INDICATIVE CONTENT → BANDS → EXCLUSIONARY
  // CLAIMS — three clearly-split blocks. Underline (<u>) renders ONLY on words
  // that MUST be used; nothing else is underlined.
  if (show('points')) {
  push(o.pointsTitle || 'INDICATIVE CONTENT', { bold: true, fontSize: F, color: GOLD, breakLine: true, paraSpaceAfter: 2 });
  let curGroup = null;
  arr(item.indicativeContent).forEach((ic) => {
    const isObj = ic && typeof ic === 'object';
    const text = isObj ? ic.text : ic;
    const dep = isObj && ic.dependentOn ? `  (dependent on ${ic.dependentOn})` : '';
    // Structural chunking: a sub-heading whenever ic.group changes (Substitution /
    // Answer / Conversion) — visual blocks, not more text.
    const grp = isObj && ic.group ? String(ic.group) : null;
    if (grp && grp !== curGroup) {
      push(grp.toUpperCase(), { bold: true, fontSize: d(2), color: 'FFE082', breakLine: true, paraSpaceBefore: 3, paraSpaceAfter: 2 });
      curGroup = grp;
    }
    // numbered point (mark: n) → a chip in the same colour as its highlight on the answer
    if (isObj && ic.mark != null) push(` ${ic.mark} `, { fontSize: F, bold: true, color: NAVY, highlight: markHi(String(ic.mark)) }), push('  ', { fontSize: F });
    else push('•  ', { fontSize: F, color: GOLD, bold: true });
    const markupRuns = markupToPptxRuns(prettyText(text), { fontSize: F, color: GOLD });
    markupRuns.forEach((r) => runs.push(r));
    if (dep) push(dep, { fontSize: d(2), italic: true, color: 'FFE082' });
    runs[runs.length - 1] = Object.assign({}, runs[runs.length - 1], {
      options: Object.assign({}, runs[runs.length - 1].options, { breakLine: true, paraSpaceAfter: 4 }),
    });
  });
  }

  if (show('bands') && arr(item.levelDescriptors).length) {
    if (runs.length) push(' ', { fontSize: 6, breakLine: true });
    push('BANDS', { bold: true, fontSize: F, color: GOLD, breakLine: true, paraSpaceAfter: 2 });
    arr(item.levelDescriptors).forEach((ld) => {
      push(`${ld.level || ''} (${ld.range || ''}):  `, { bold: true, fontSize: d(1), color: GOLD });
      push(prettyText(o.shortBands ? firstSentence(ld.desc || '') : (ld.desc || '')), { fontSize: d(1), color: GOLD, breakLine: true, paraSpaceAfter: 3 });
    });
  }

  if (show('bands') && arr(item.doesNotAward).length) {
    if (runs.length) push(' ', { fontSize: 6, breakLine: true });
    push(o.exclTitle || 'EXCLUSIONARY CLAIMS', { bold: true, fontSize: F, color: 'FF8A80', breakLine: true, paraSpaceAfter: 2 });
    arr(item.doesNotAward).forEach((dna) => {
      push(`✗  ${prettyText(dna)}`, { fontSize: d(1), color: 'FFCDD2', breakLine: true, paraSpaceAfter: 3 });
    });
  }

  if (show('points') && item.ecfNote) {
    push(' ', { fontSize: 4, breakLine: true });
    push('ECF:  ', { bold: true, fontSize: d(3), color: GOLD });
    push(item.ecfNote, { fontSize: d(3), italic: true, color: GOLD, breakLine: true });
  }
  return runs;
}
/* markingPanelFs — largest base size (10–16pt) at which the whole panel fits its box, so a long
   scheme shrinks instead of running off the slide. Same width model as autoFontSize. */
function markingPanelFs(item, w, h, opts) {
  const o = opts || {};
  const items = [], heads = new Set();
  arr(item.indicativeContent).forEach((ic) => {
    items.push(String((ic && ic.text) || ic) + '    ');
    if (ic && ic.group) heads.add(ic.group);
  });
  arr(item.levelDescriptors).forEach((ld) => items.push(`${ld.level} (${ld.range}): ` + (o.shortBands ? firstSentence(ld.desc || '') : (ld.desc || ''))));
  arr(item.doesNotAward).forEach((d) => items.push('✗  ' + d));
  const headCount = 1 + heads.size + (arr(item.levelDescriptors).length ? 1 : 0) + (arr(item.doesNotAward).length ? 1 : 0);
  for (let fs = o.max || 22; fs > 10; fs--) {   // 2026-10-12: up to 22pt, a short scheme fills its box
    const cpl = Math.max(1, Math.floor(((w - 0.25) * 120) / fs));
    const lines = items.reduce((t, l) => t + Math.max(1, Math.ceil(l.length / cpl)), 0) + headCount;
    if ((lines * fs * 1.3) / 72 + (items.length + headCount) * 0.065 <= (h - 0.25) * 0.92) return fs;   // + paragraph spacing
  }
  return 10;
}
/* firstSentence — a band descriptor cut to its first sentence (board version; the full
   wording stays on the worksheet / answer sheet). */
function firstSentence(t) {
  const m = String(t).match(/^(.+?[.;])(\s|$)/);
  return m ? m[1] : String(t);
}

/* Question pictures from the real test paper (Patryk 2026-10-12). item.snippet = a png path, or
   meta.snippetDir = the folder paper-snippets.py wrote, looked up by question number ("3(a)(iii)").
   Relative paths resolve from the lesson JSON's folder, then the working folder. */
const _snipIdx = {};
function resolveLocal(p) {
  if (!p) return null;
  const cands = path.isAbsolute(p) ? [p] : [path.resolve(path.dirname(process.argv[2] || '.'), p), path.resolve(p)];
  return cands.find((c) => fs.existsSync(c)) || null;
}
function snippetFor(L, item, qn, opts) {
  if (item && item.snippet === false) return null;
  if (item && item.snippet) {
    const f = resolveLocal(item.snippet);
    if (!f) buildWarn(`question picture not found: ${item.snippet} (typed question used instead)`);
    return f;
  }
  // meta.snippetDir: one folder, or { core: folder, extend: folder } for a two-paper test
  // (a shared question shows the Extend picture; the content is the same)
  const sd = L.meta && L.meta.snippetDir;
  if (sd && typeof sd === 'object') {
    for (const pp of ['extend', 'core']) {
      if (item && item[pp] && sd[pp]) {
        const f = snippetFor({ meta: { snippetDir: sd[pp] } }, Object.assign({}, item, { snippet: undefined }), item[pp], opts);
        if (f) return f;
      }
    }
    return null;
  }
  const dir = resolveLocal(sd);
  const key = String(qn || (item && item.questionNumber) || '').replace(/\s+/g, '');
  if (!dir || !key) return null;
  if (!_snipIdx[dir]) {
    try { _snipIdx[dir] = JSON.parse(fs.readFileSync(path.join(dir, 'snippets.json'), 'utf8')); } catch (_) { _snipIdx[dir] = {}; }
  }
  const hit = (opts && opts.full && _snipIdx[dir][key + '*']) || _snipIdx[dir][key];   // "*" = with its figure lead-in
  const f = hit && (fs.existsSync(hit) ? hit : resolveLocal(path.join(dir, path.basename(hit))));
  if (!f) buildWarn(`no question picture for Q${key} in ${dir}`);
  return f || null;
}

/* qLabel — how a test question is named on a slide. KS3/KS4 tests come as a Core and an
   Extend paper that share most questions under different numbers (2026-10-12): items carry
   "core": "4(e)" and/or "extend": "1(e)", and the label says which paper(s) it is on. */
function qLabel(item) {
  const c = item.core, e = item.extend;
  // the school calls it the Extend paper; on slides it is the CHALLENGE paper (terminology rule).
  // Plain words (Patryk 2026-10-15: "more explicit"), not CORE Q4(e) = CHALLENGE Q1(e).
  if (c && e) return `Core paper Question ${c}  ·  Challenge paper Question ${e}`;
  if (c) return `Core paper Question ${c} (not on the Challenge paper)`;
  if (e) return `Challenge paper Question ${e} (not on the Core paper)`;
  return 'Question ' + (item.questionNumber || '');
}

/* pagesOnly — review support pages show page numbers only (Patryk 2026-10-15: "P6.2 p.78" read as
   a code, not a page). "P6.2 p.78, P6.3 p.80" -> "p. 78, p. 80"; "pp.78-80" -> "pp. 78–80";
   repeats dropped. Text with no page number is left alone. */
function pagesOnly(v) {
  const t = String(v == null ? '' : v);
  if (!/\bpp?\.\s*\d/i.test(t)) return t;
  const seen = new Set();
  return t.split(/\s*[,;]\s*/).map((bit) => {
    const m = bit.match(/\b(pp?)\.\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
    if (!m) return bit.replace(/\b[BCP]\d+(\.\d+)+\b\s*/g, '').trim();
    return m[3] ? `pp. ${m[2]}–${m[3]}` : `p. ${m[2]}`;
  }).filter((x) => x && !seen.has(x) && seen.add(x)).join(', ');
}

function slideModelAnswerReview(pptx, L, item) {
  const obj = objectiveText(L);
  const qType = item.qType || 'short';
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  const header = 'MODEL ANSWER   ' + qLabel(item) + (item.marks ? `  ·  ${item.marks} mark${item.marks === 1 ? '' : 's'}` : '');
  let y = sectionHeader(s, header, STAGE.build, TOP, null, true);
  const profile = item.jitterProfile != null ? item.jitterProfile : 2;
  const bottom = BOT_Y - 0.08;

  // the model answer itself, in whatever box the layout gives it
  const drawAnswer = (x, ay, w, h) => {
    if (qType === 'graph') {
      const rd = item.graphData;
      const pngPath = rd && rd.rows ? callGraphGen(rd, true) : null;
      if (pngPath) addImageFit(s, pngPath, x, ay, w, h);
      else imagePlaceholder(s, x, ay, w, h, 'Model graph: add graphData to JSON');
      return;
    }
    // raw text in: handwritingBlock reads the {n} mark tags, then tidies symbols itself
    const raw = qType === 'calculation' ? arr(item.modelAnswer).map(String) : String(item.modelAnswer || '');
    const text = hasMarkTags(raw) ? raw : (Array.isArray(raw) ? raw.map(prettyText) : prettyText(raw));
    // as big as the box allows (24/26pt as before), shrinking only for a long answer (never below 16pt)
    let fit = fitHandwritingFs(raw, w, h, qType === 'calculation' ? 24 : 26, 16);
    // working steps: one line each, so shrink (to 16pt) before a step wraps
    if (Array.isArray(raw)) while (fit > 16 && handwritingLines(raw, w, fit) > raw.length) fit--;
    handwritingBlock(s, x, ay, w, h, text, { fontSize: fit, profile, ruled: true, mode: handwritingMode(L, item) });
  };
  // long schemes (6-markers): bands cut to their first sentence on the board so it still fits
  const panelOpts = (w, h) => {
    const full = markingPanelFs(item, w, h);
    return full >= 12 ? { fs: full } : { fs: markingPanelFs(item, w, h, { shortBands: true }), shortBands: true };
  };
  const pStyle = { fill: NAVY, color: 'FFFFFF', valign: 'top', fontSize: 12, line: { color: GOLD, width: 2 } };
  const panel = (x, py, w, h) => {
    const po = panelOpts(w, h);
    const hasBands = arr(item.levelDescriptors).length || arr(item.doesNotAward).length;
    if (po.fs >= 12 || !hasBands) { goldBox(s, x, py, w, h, buildMarkingPanelRuns(item, po), pStyle); return; }
    // still too long: mark points | bands + "no marks for", side by side, each sized to fit
    const ptsOnly = Object.assign({}, item, { levelDescriptors: [], doesNotAward: [] });
    const bandsOnly = Object.assign({}, item, { indicativeContent: [], ecfNote: '' });
    const len = (o) => JSON.stringify([o.indicativeContent, arr(o.levelDescriptors).map((l) => firstSentence(l.desc || '')), o.doesNotAward]).length;
    const share = Math.min(0.66, Math.max(0.5, len(ptsOnly) / (len(ptsOnly) + len(bandsOnly))));   // the longer half gets more width
    const cw = (w - GAP) * share, cw2 = w - GAP - cw;
    goldBox(s, x, py, cw, h, buildMarkingPanelRuns(item, { fs: markingPanelFs(ptsOnly, cw, h), only: 'points' }), pStyle);
    goldBox(s, x + cw + GAP, py, cw2, h, buildMarkingPanelRuns(item, { fs: markingPanelFs(bandsOnly, cw2, h, { shortBands: true }), only: 'bands', shortBands: true }), pStyle);
  };

  const snip = snippetFor(L, item, null, { full: true });
  const px = snip && imagePixelSize(snip);
  if (snip && px && px.w && px.h) {
    // Pick the layout that shows the paper's question BIGGER (never stretched):
    //   tall question → picture fills the left half, answer + mark scheme stacked on the right;
    //   short/wide question → picture across the top, answer left + mark scheme right below.
    const H = bottom - y;
    const topH = Math.min(H * 0.5, (CW * px.h) / px.w);
    const raw = qType === 'calculation' ? arr(item.modelAnswer).map(String) : String(item.modelAnswer || '');
    // picture on the left: as wide as possible (half the slide) while the answer (at 20pt)
    // and the mark scheme (at 12pt+) still fit the column beside it; long schemes narrow it
    const plan = [0.5, 0.44, 0.38].map((f) => {
      const rw = CW * (1 - f) - GAP;
      const need = qType === 'graph' ? (H - GAP) * 0.5 : Math.max((H - GAP) * 0.3, handwritingNeedH(raw, rw, 20));
      return { f, rw, ansH: Math.min(need, (H - GAP) * 0.6), ok: markingPanelFs(item, rw, H - GAP - need) >= 12 };
    });
    const pick = plan.find((p) => p.ok) || plan[plan.length - 1];
    const leftW = CW * pick.f;
    const sLeft = Math.min(leftW / px.w, H / px.h), sTop = Math.min(CW / px.w, topH / px.h);
    // across-the-top plan: picture height as drawn, then the answer gets only the width it
    // needs at 22pt (40–56%), the mark scheme the rest
    const picH = Math.min(topH, (CW * px.h) / px.w);
    const h2top = bottom - (y + picH + GAP);
    // calculation lines must not wrap (each working step stays on one line)
    const fitsAt = (f) => handwritingNeedH(raw, CW * f, 22) <= h2top &&
      (!Array.isArray(raw) || handwritingLines(raw, CW * f, 22) <= raw.length);
    const awFrac = qType === 'graph' ? 0.52 : ([0.4, 0.46, 0.52].find(fitsAt) || 0.56);
    const topFs = markingPanelFs(item, CW * (1 - awFrac) - GAP, h2top);
    const leftFs = markingPanelFs(item, pick.rw, H - GAP - pick.ansH);
    // a long scheme that would be squeezed under the picture goes beside it instead
    const useLeft = sLeft > sTop * 1.15 || (topFs < 14 && leftFs >= topFs);
    if (useLeft) {
      const b = addImageFit(s, snip, MX, y, leftW, H);
      s.addShape('rect', { x: b.x, y: b.y, w: b.w, h: b.h, fill: { color: 'FFFFFF', transparency: 100 }, line: GOLD2 });
      const rx = MX + leftW + GAP, rw = pick.rw;
      const ansH = pick.ansH;
      drawAnswer(rx, y, rw, ansH);
      panel(rx, y + ansH + GAP, rw, H - ansH - GAP);
    } else {
      const b = addImageFit(s, snip, MX, y, CW, topH);
      s.addShape('rect', { x: b.x, y: b.y, w: b.w, h: b.h, fill: { color: 'FFFFFF', transparency: 100 }, line: GOLD2 });
      const ty = y + b.h + GAP, h2 = bottom - ty;
      const aw = CW * awFrac;
      drawAnswer(MX, ty, aw, h2);
      panel(MX + aw + GAP, ty, CW - aw - GAP, h2);
    }
    bottomBar(s, obj);
    return;
  }

  // no picture: typed question across the top when given, then the original two-column layout
  if (item.question) {
    const qH = 0.75;
    const qFs = autoFontSize(prettyText(item.question), CW, qH, { min: 14, max: 20 });
    goldBox(s, MX, y, CW, qH, [
      { text: 'Q' + (item.questionNumber || '') + '  ', options: { bold: true, fontSize: qFs, color: NAVY } },
      { text: prettyText(item.question), options: { fontSize: qFs } },
    ], { valign: 'middle' });
    y += qH + GAP;
  }
  const leftW = CW * 0.48, rightX = MX + leftW + GAP, rightW = CW - leftW - GAP;
  const panelH = bottom - y;
  drawAnswer(MX, y, leftW, panelH);
  panel(rightX, y, rightW, panelH);
  bottomBar(s, obj);
}

/* ---- BUILD — markTheAnswers (peer-assessment) ----------------------------
   Redesigned 2026-10-12 (Patryk: the board scheme was bloated, the 6-marker ran off the slide,
   and the samples are already on the worksheet).
   TASK slide: the question across the top, the mark scheme filling the rest in big type
   (two columns: numbered points | bands + "no marks for"), no samples repeated.
   MARKS slide(s): one row per student, their handwritten answer on the left with the earned
   marks highlighted + numbered (tags {1}…{/1}, {x}…{/x} for a lost mark), and on the right
   only what they scored: big mark/level, the point numbers earned, what was missed.
   Up to 3 students a slide (4 → 2 + 2) so the handwriting stays readable. Samples without
   tags still work: the right box lists their ✓ hits / ✗ misses as before.
   Same mark-scheme fields as modelAnswerReview (indicativeContent / levelDescriptors / doesNotAward). */
const MTA_JITTER = [1, 3, 2, 4];                 // distinct handwriting per sample slot
const mtaLabel = (sm, i) => sm.label || ('Student ' + String.fromCharCode(65 + i));
function mtaQuestionBox(s, item, y) {
  const q = prettyText(item.question || '');
  const qH = Math.min(1.1, Math.max(0.6, Math.ceil(q.length / 110) * 0.36 + 0.2));
  const qFs = autoFontSize(q, CW, qH, { min: 14, max: 20 });
  goldBox(s, MX, y, CW, qH, [
    { text: 'Q  ', options: { bold: true, fontSize: qFs, color: NAVY } },
    { text: q, options: { fontSize: qFs } },
  ], { valign: 'middle' });
  return y + qH + GAP;
}
function slideMarkTheAnswers(pptx, L, item) {
  const obj = objectiveText(L);
  const samples = arr(item.samples).slice(0, 4);
  const header = 'BUILD · MARK THE ANSWERS · Q' + (item.questionNumber || '') + marksTag(item.marks);

  // --- task slide: question + mark scheme, full width -------------------------
  let s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'build');
  let y = sectionHeader(s, header, STAGE.build, TOP);
  y = purplePenBar(s, y - GAP + 0.02);
  y = mtaQuestionBox(s, item, y);
  txt(s, item.instruction || 'Mark each answer on your worksheet. Give it a level and a mark.', {
    x: MX, y, w: CW, h: 0.3, italic: true, fontSize: 14, color: '333333', valign: 'middle',
  });
  y += 0.36;
  const H = BOT_Y - 0.08 - y;
  const hasBands = arr(item.levelDescriptors).length || arr(item.doesNotAward).length;
  const panelOpts = { fill: NAVY, color: 'FFFFFF', valign: 'top', line: { color: GOLD, width: 2 }, margin: 10 };
  const pointsText = arr(item.indicativeContent).map((ic) => (ic && ic.text) || ic).join(' ');
  if (hasBands) {
    const colW = (CW - GAP) / 2;
    const bandsText = arr(item.levelDescriptors).map((l) => firstSentence(l.desc || '')).join(' ') + ' ' + arr(item.doesNotAward).join(' ');
    const n1 = arr(item.indicativeContent).length + 1, n2 = arr(item.levelDescriptors).length + arr(item.doesNotAward).length + 2;
    const fs = Math.min(autoFontSize(pointsText, colW - 0.2, H, { min: 12, max: 22, linesHint: undefined }),
      autoFontSize(bandsText, colW - 0.2, H, { min: 12, max: 22 }));
    const fsL = Math.min(fs, Math.floor((H * 72) / (n1 * 1.6)));
    const fsR = Math.min(fs, Math.floor((H * 72) / (n2 * 1.8)));
    const F = Math.max(12, Math.min(fsL, fsR));
    if (F < 14) buildWarn(`Mark the Answers Q${item.questionNumber || ''}: mark scheme is long, board text is ${F}pt`);
    goldBox(s, MX, y, colW, H, buildMarkingPanelRuns(item, { fs: F, only: 'points', pointsTitle: 'MARK POINTS' }), panelOpts);
    goldBox(s, MX + colW + GAP, y, colW, H, buildMarkingPanelRuns(item, { fs: F, only: 'bands', shortBands: true, exclTitle: 'NO MARKS FOR' }), panelOpts);
  } else {
    const n = arr(item.indicativeContent).length + 1;
    const F = Math.max(14, Math.min(26, autoFontSize(pointsText, CW - 0.2, H, { min: 14, max: 26 }), Math.floor((H * 72) / (n * 1.7))));
    goldBox(s, MX, y, CW, H, buildMarkingPanelRuns(item, { fs: F, pointsTitle: 'MARK POINTS' }), panelOpts);
  }
  bottomBar(s, obj);
  if (!samples.length) return;

  // --- marks slide(s): each student's answer, highlighted, + what they scored ---
  const groups = samples.length === 4 ? [samples.slice(0, 2), samples.slice(2)] : [samples];
  groups.forEach((grp, gi) => {
    s = pptx.addSlide();
    s.background = { color: BG };
    navBar(s, 'build');
    y = sectionHeader(s, 'BUILD · MARK THE ANSWERS: MARKS AWARDED' + (groups.length > 1 ? ` (${gi + 1} of ${groups.length})` : ''), STAGE.build, TOP);
    const vGap = GAP * 1.2, labelH = 0.3;
    const rowH = (BOT_Y - 0.08 - y - vGap * (grp.length - 1)) / grp.length;
    const lw = CW * 0.66, rx = MX + lw + GAP, rw = CW - lw - GAP;
    grp.forEach((sm, k) => {
      const i = gi * 2 + k;
      const ry = y + k * (rowH + vGap);
      txt(s, mtaLabel(sm, i), {
        x: MX, y: ry, w: lw, h: labelH, fill: { color: NAVY }, color: GOLD,
        bold: true, fontSize: 14, align: 'left', valign: 'middle', margin: 6,
      });
      const raw = String(sm.text || '');
      const tagged = hasMarkTags(raw);
      const hwFs = fitHandwritingFs(raw, lw, rowH - labelH, 24, 16);
      handwritingBlock(s, MX, ry + labelH, lw, rowH - labelH, tagged ? raw : prettyText(raw), {
        fontSize: hwFs, ruled: true, mode: handwritingMode(L, item),
        profile: sm.jitterProfile != null ? sm.jitterProfile : (MTA_JITTER[i] != null ? MTA_JITTER[i] : 2),
      });

      // right: only what this student scored
      const mk = sm.awardedMarks != null ? sm.awardedMarks + (item.marks ? '/' + item.marks : '') : '';
      const runs = [];
      const big = rowH > 2.2 ? 36 : 28;
      if (mk) runs.push({ text: mk + (sm.awardedLevel ? '  ' : ''), options: { bold: true, fontSize: big, color: NAVY, breakLine: !sm.awardedLevel } });
      if (sm.awardedLevel) runs.push({ text: sm.awardedLevel, options: { bold: true, fontSize: Math.round(big * 0.6), color: AMBER, breakLine: true, paraSpaceAfter: 4 } });
      const earned = tagged ? [...new Set((parseMarkWords(raw).marks || []).filter((m) => m != null && m !== 'x'))] : [];
      if (earned.length) {
        runs.push({ text: 'Marks for:  ', options: { fontSize: 15, color: '333333' } });
        earned.forEach((m) => runs.push({ text: ` ${m} `, options: { bold: true, fontSize: 18, color: NAVY, highlight: markHi(m) } }, { text: ' ', options: { fontSize: 15 } }));
        runs[runs.length - 1].options = Object.assign({}, runs[runs.length - 1].options, { breakLine: true, paraSpaceAfter: 6 });
      } else {
        arr(sm.hits).forEach((h) => runs.push({ text: '✓ ' + prettyText(h), options: { fontSize: 14, color: GREEN_OK, breakLine: true } }));
      }
      arr(sm.misses).forEach((m) => runs.push({ text: '✗ ' + prettyText(m), options: { fontSize: 13, color: 'B71C1C', breakLine: true } }));
      if (sm.comment) runs.push({ text: prettyText(sm.comment), options: { italic: true, fontSize: 12, color: '333333' } });
      goldBox(s, rx, ry, rw, rowH, runs, { valign: 'middle', align: 'center', fontSize: 14 });
    });
    bottomBar(s, obj);
  });
}
