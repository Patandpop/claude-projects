'use strict';
// build.js part 06-slides-opening: title + Do Now, Do Now answers, lessonSequence, objectives slide ("This lesson" strip). Loaded by build.js in order; all parts share one scope.

/* =========================================================================
   SLIDE BUILDERS
   ========================================================================= */

function objectiveText(L) {
  const obj = (L.title && L.title.objectives) || L.meta.objectives || [];
  return stripKeys(obj[0] || L.meta.title || L.meta.topic || '');
}


/* strip a duplicate stage prefix from authored headings ("LEARN — X" → "X") */
function stripStage(h, stage) {
  h = String(h || '').replace(/_/g, ' ');
  return h.replace(new RegExp('^\\s*' + stage + '\\s*[\\u00B7\\u2014\\u2013:-]\\s*', 'i'), '');
}

/* ---- TITLE + DO NOW (combined slide — questions always embedded) -------- */
function slideTitleDoNow(pptx, L) {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  navBar(s, 'donow');

  const meta = L.meta, t = L.title || {};
  const objectives = arr(t.objectives).slice(0, 3);
  const keywords = arr(t.keywords);
  const leftW = SW * 0.36 - MX;
  let y = 0.78;

  const title = meta.title || meta.topic || '';
  const titleFs = title.length > 45 ? 26 : 32; // E12: extracted for subtitle gap scaling
  txt(s, title, {
    x: MX, y, w: leftW, h: 1.45, color: GOLD, bold: true,
    fontSize: titleFs, align: 'left', valign: 'top',
    fit: 'shrink', wrap: true,
  });
  y += titleFs >= 32 ? 1.65 : 1.5; // E12: larger gap when 32pt title to prevent subtitle crowding
  // M4: B10 strip class identifier \u2014 show year group not class code
  const _yr = meta.year || (String(meta.class || '').match(/^\d+/) || [])[0];
  const _yearStr = _yr ? `Year ${_yr}` : '';
  txt(s, meta.yearLine || (_yearStr ? `${_yearStr}  \u00B7  ${cap(meta.theme || 'Science')}` : cap(meta.theme || 'Science')), {
    x: MX, y, w: leftW, h: 0.3, color: 'AABBD0', fontSize: 12, align: 'left', valign: 'middle',
  });
  y += 0.42;
  // Learning objectives — boxed, larger text
  const loRuns = [{ text: 'Learning Objectives:', options: { bold: true, color: GOLD, fontSize: 15, breakLine: true, paraSpaceAfter: 8 } }]
    .concat(objectives.map((o, i) => ({
      text: `${i + 1}.  ${o}`, options: { color: 'FFFFFF', fontSize: 14, breakLine: true, paraSpaceAfter: 8 },
    })));
  const kwH = keywords.length ? 1.2 : 0; // M1: B5 extra headroom prevents overflow on PPT resave
  const loH = BOT_Y - 0.45 - y - (kwH ? kwH + 0.12 : 0);
  goldBox(s, MX, y, leftW, loH, loRuns, { fill: '152347', valign: 'top' });
  y += loH + 0.12;
  if (keywords.length) {
    goldBox(s, MX, y, leftW, kwH, [
      { text: 'Key Words:', options: { bold: true, color: GOLD, fontSize: 13, breakLine: true, paraSpaceAfter: 6 } },
      { text: keywords.join('  \u00B7  '), options: { color: 'FFFFFF', fontSize: 13 } },
    ], { fill: '152347', valign: 'top' });
  }

  // divider
  const divX = SW * 0.36 + 0.08;
  s.addShape('rect', { x: divX, y: 0.78, w: 0.013, h: BOT_Y - 0.45 - 0.78, fill: { color: GOLD }, line: { type: 'none' } });

  // right column — DO NOW
  const rx = divX + 0.18, rw = SW - rx - MX;
  const headerText = (L.doNow && L.doNow.variant === 'B') ? 'DO NOW \u00B7 5 minutes' : 'DO NOW';
  txt(s, headerText, {
    x: rx, y: 0.78, w: rw, h: 0.4, fill: { color: DONOW_BAR },
    color: GOLD, bold: true, fontSize: 15, align: 'center', valign: 'middle',
  });
  const qs = (L.doNow && arr(L.doNow.questions)) || [];
  const top = 0.78 + 0.4 + 0.1, bottom = BOT_Y - 0.40;
  // Instruction Do Now (Patryk 2026-10-14): test lessons ("look over your notes") and review lessons
  // ("tick WWWs and EBIs, pick 3 areas of focus") have steps, not questions. doNow.task = the steps.
  const task = !qs.length && L.doNow ? arr(L.doNow.task) : [];
  if (task.length) {
    const rowH = Math.min(1.5, (bottom - top - (task.length - 1) * 0.12) / task.length);
    task.forEach((line, i) => {
      const ry = top + i * (rowH + 0.12);
      s.addShape('roundRect', { x: rx, y: ry + (rowH - 0.5) / 2, w: 0.5, h: 0.5, rectRadius: 0.05, fill: { color: GOLD }, line: { type: 'none' } });
      txt(s, String(i + 1), { x: rx, y: ry + (rowH - 0.5) / 2, w: 0.5, h: 0.5, color: NAVY, bold: true, fontSize: 20, align: 'center', valign: 'middle' });
      goldBox(s, rx + 0.65, ry, rw - 0.65, rowH, prettyText(line), { fill: 'F8F7F0', fontSize: autoFontSize(line, rw - 0.65, rowH, { min: 18, max: 26 }), valign: 'middle' });
    });
    silentEntryFooter(s);
    bottomBar(s, objectiveText(L));
    return;
  }
  const n = Math.max(qs.length, L.doNow?.count ?? 5); // E6: configurable slot floor
  const rowH = (bottom - top - (n - 1) * 0.08) / n;
  qs.concat(Array(Math.max(0, n - qs.length)).fill({ q: '' })).forEach((q, i) => {
    const ry = top + i * (rowH + 0.08);
    s.addShape('roundRect', { x: rx, y: ry + (rowH - 0.42) / 2, w: 0.42, h: 0.42, rectRadius: 0.05, fill: { color: GOLD }, line: { type: 'none' } });
    txt(s, String(i + 1), {
      x: rx, y: ry + (rowH - 0.42) / 2, w: 0.42, h: 0.42,
      color: NAVY, bold: true, fontSize: 18, align: 'center', valign: 'middle',
    });
    goldBox(s, rx + 0.55, ry, rw - 0.55, rowH, prettyText(q.q || ''), { fill: 'F8F7F0', fontSize: 19, valign: 'middle' }); // 2026-07-05: superscripts/symbols in Do Now
  });

  silentEntryFooter(s);
  if (L.doNow && arr(L.doNow.specPoints).length) {
    s.addNotes('Spec points:\n' + arr(L.doNow.specPoints).join('\n'));
  }
  bottomBar(s, objectiveText(L));
}

/* ---- DO NOW ANSWERS ----------------------------------------------------- */
function slideDoNowAnswers(pptx, L) {
  const qs = (L.doNow && arr(L.doNow.questions)) || [];
  if (!qs.length) return;
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  navBar(s, 'donow');
  let y = purplePenBar(s, TOP);
  const bottom = BOT_Y - 0.08;
  const n = qs.length;
  const rowH = (bottom - y - (n - 1) * 0.08) / n;
  qs.forEach((q) => {
    reviewRow(s, y, rowH, null, q.q || '', q.a || '');   // verbatim question, navy left
    y += rowH + 0.08;
  });
  bottomBar(s, objectiveText(L));
}

/* ---- LAST WEEK'S HOMEWORK (workplan 2.10, layout A "three cards", TEST BUILD 2026-10-31) ----
   Straight after the Do Now answers when L.homeworkFeedback is given (the planner asks for it when the
   class has homework results; one untick turns it off). Class counts only, never names.
   homeworkFeedback: { title, due?, done, size?, questions: [{ n, q, pct, right, wrong?, wrongN?, why? }] }
   (first 3 used). Each card: % ring (red under 50, amber 50-74, green 75+), the question, the right
   answer in a navy box with gold text (appears on click via the finish pass), "n of N put <wrong>", why. */
function slideHomeworkFeedback(pptx, L) {
  const hf = L.homeworkFeedback;
  const qs = (hf && arr(hf.questions).filter((q) => q && q.q)) || [];
  if (!qs.length) return;
  const list = qs.slice(0, 3);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'donow');
  const head = 'DO NOW · LAST WEEK’S HOMEWORK' + (hf.title ? ' · ' + String(hf.title).toUpperCase() : '') +
    (hf.done != null ? ' · ' + hf.done + (hf.size ? ' of ' + hf.size : '') + ' did it' : '');
  const y0 = sectionHeader(s, head, DONOW_BAR, TOP) + 0.04;
  const cardH = BOT_Y - 0.12 - y0, n = list.length;
  const cw = (CW - (n - 1) * 0.18) / n, iw0 = cw - 0.3;
  // one font size per row across the cards (the smallest any card needs), so the three read as a set
  const room0 = y0 + cardH - 0.12 - (y0 + 1.1), same = (f) => Math.min(...list.map(f));
  const fsQ = same((q) => autoFontSize(prettyText(q.q), iw0, room0 * 0.4, { min: 12, max: 20 }));
  const fsA = same((q) => autoFontSize(prettyText(q.right || ''), iw0 - 0.2, room0 * 0.22, { min: 12, max: 20 }));
  const fsW = same((q) => autoFontSize((q.wrongN != null ? q.wrongN + ' of ' + (hf.done != null ? hf.done : '') + ' put ' : 'Most common wrong answer: ') + (q.wrong || ''), iw0, room0 * 0.14, { min: 11, max: 16 }));
  const fsY = same((q) => autoFontSize(prettyText(q.why || ''), iw0, room0 - room0 * 0.76 - 0.24, { min: 11, max: 15 }));
  list.forEach((q, i) => {
    const x = MX + i * (cw + 0.18), ix = x + 0.15, iw = cw - 0.3;
    s.addShape('rect', { x, y: y0, w: cw, h: cardH, fill: { color: 'FFFFFF' }, line: GOLD2 });
    const pct = Math.max(0, Math.min(100, Math.round(+q.pct || 0)));
    const ring = pct < 50 ? 'C62828' : pct < 75 ? AMBER : '2E7D32';
    s.addShape('ellipse', { x: ix, y: y0 + 0.15, w: 0.8, h: 0.8, fill: { color: ring }, line: { type: 'none' } });
    txt(s, pct + '%', { x: ix, y: y0 + 0.15, w: 0.8, h: 0.8, color: 'FFFFFF', bold: true, fontSize: 17, align: 'center', valign: 'middle', margin: 0 });
    txt(s, [{ text: 'Question ' + (q.n != null ? q.n : i + 1), options: { color: '555555', fontSize: 13, breakLine: true } },
      { text: pct + '% of marks', options: { color: '111111', bold: true, fontSize: 15 } }],
    { x: ix + 0.95, y: y0 + 0.15, w: iw - 0.95, h: 0.8, valign: 'middle', margin: 0 });
    // the rest of the card: question, answer box, "n of N put", why (heights share what is left)
    const top = y0 + 1.1, room = y0 + cardH - 0.12 - top;
    const qh = room * 0.4, ah = room * 0.22, wh = room * 0.14, yh = room - qh - ah - wh - 0.24;
    const qt = prettyText(q.q);
    txt(s, qt, { x: ix, y: top, w: iw, h: qh, color: '111111', fontSize: fsQ, valign: 'top', fit: 'shrink', margin: 0 });
    const at = prettyText(q.right || '');
    txt(s, at, { x: ix, y: top + qh + 0.08, w: iw, h: ah, fill: { color: NAVY }, color: GOLD, bold: true,
      fontSize: fsA, valign: 'middle', fit: 'shrink', margin: 6 });
    if (q.wrong) {
      const wn = q.wrongN != null ? q.wrongN + (hf.done != null ? ' of ' + hf.done : '') + ' put ' : 'Most common wrong answer: ';
      txt(s, [{ text: wn, options: { color: '333333' } }, { text: prettyText(q.wrong), options: { color: AMBER, bold: true } }],
        { x: ix, y: top + qh + ah + 0.16, w: iw, h: wh, fontSize: fsW, valign: 'middle', fit: 'shrink', margin: 0 });
    }
    if (q.why) {
      const wt = prettyText(q.why);
      txt(s, wt, { x: ix, y: top + qh + ah + wh + 0.24, w: iw, h: yh, color: '444444', italic: true,
        fontSize: fsY, valign: 'top', fit: 'shrink', margin: 0 });
    }
  });
  s.addNotes('Last week\'s homework (test build, pick still open): the ' + (n === 1 ? 'question' : n + ' questions') + ' the class missed most' +
    (hf.due ? ' (due ' + hf.due + ')' : '') + '. Click to show each answer. Class numbers only. Untick it on the planner lesson card to leave this slide out.');
  bottomBar(s, objectiveText(L));
}

/* ---- OBJECTIVES (Lesson quality A, Patryk's O7, 2026-10-19) -------------
   Straight after the Do Now answers, before Engage. The Do Now slide keeps its own objectives.
   Dark band "WORDS YOU KNOW" (title.knownWords: [{term, definition}] — only words an earlier lesson
   taught; left out when empty), "WORDS FOR THIS LESSON" as navy tags (title.keywords minus known
   ones, no definitions), then the numbered objectives with {k} key words highlighted. */
/* lessonSequence(L) — the "This lesson" lines (Patryk 2026-10-23): what pupils do in Learn, Build and
   Apply. Claude writes title.sequence { learn, build, apply } (plain instructions, his voice); any line
   left out is filled from the lesson itself. */
function lessonSequence(L) {
  const seq = (L.title && L.title.sequence) || {};
  const learn = arr(L.learn), build = arr(L.build);
  const cmp = learn.find((x) => String(x.variant || '').toUpperCase() === 'E' && x.comparison && x.comparison.aTitle);
  const heads = learn.map((x) => stripStage(stripKeys(x.heading || x.title || ''), 'LEARN')).filter(Boolean);
  const pr = build.find((b) => (b.type || b.variant) === 'practical');
  const lower = (s) => String(s).charAt(0).toLowerCase() + String(s).slice(1);
  return {
    learn: seq.learn || (cmp ? `Note down the key terms, then compare ${lower(cmp.comparison.aTitle)} and ${lower(cmp.comparison.bTitle)}.`
      : 'Note down the key terms' + (heads.length ? ': ' + heads.slice(0, 3).map(lower).join(', ') : '') + '.'),
    build: seq.build || (pr ? 'Do the experiment' + (pr.heading ? ': ' + lower(stripKeys(pr.heading)) : '') + '.'
      : build.some((b) => (b.type || b.variant) === 'workedExample') ? 'Follow the worked example, then try one yourself.' : 'Quick questions to check you\'ve got it.'),
    apply: seq.apply || 'Use what you\'ve learnt on the worksheet questions.',
  };
}
function slideObjectives(pptx, L) {
  const t = L.title || {};
  const objectives = arr(t.objectives).slice(0, 3);
  const known = arr(t.knownWords).filter((k) => k && k.term).slice(0, 4);
  const knownSet = new Set(known.map((k) => String(k.term).toLowerCase()));
  const lesson = arr(t.keywords).filter((w) => !knownSet.has(String(w).toLowerCase())).slice(0, 8);
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'engage');
  let y = sectionHeader(s, 'LEARNING OBJECTIVES', STAGE.engage, TOP);
  if (known.length) {
    const rowH = 0.42, h = 0.38 + known.length * rowH + 0.08;
    s.addShape('rect', { x: MX, y, w: CW, h, fill: { color: NAVY }, line: { type: 'none' } });
    txt(s, 'WORDS YOU KNOW', { x: MX + 0.15, y: y + 0.06, w: CW - 0.3, h: 0.3, color: 'C9D3F2', fontSize: 11, charSpacing: 1, valign: 'middle' });
    known.forEach((k, i) => {
      const line = [{ text: String(k.term), options: { bold: true, color: ANSWER } }, { text: ':  ' + prettyText(k.definition || ''), options: { color: 'FFFFFF' } }];
      txt(s, line, { x: MX + 0.15, y: y + 0.38 + i * rowH, w: CW - 0.3, h: rowH, fontSize: autoFontSize(k.term + ': ' + (k.definition || ''), CW - 0.3, rowH, { min: 12, max: 17 }), valign: 'middle', fit: 'shrink' });
    });
    y += h + 0.14;
  }
  if (lesson.length) {
    txt(s, 'WORDS FOR THIS LESSON', { x: MX, y, w: 2.6, h: 0.42, color: '555555', fontSize: 11, charSpacing: 1, valign: 'middle' });
    let tx = MX + 2.65;
    lesson.forEach((w) => {
      const tw = Math.min(3.2, 0.35 + String(w).length * 0.13);
      if (tx + tw > MX + CW) return;
      txt(s, String(w), { x: tx, y: y + 0.03, w: tw, h: 0.36, fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 14, align: 'center', valign: 'middle', rectRadius: 0.06, shape: pptx.ShapeType.roundRect });
      tx += tw + 0.12;
    });
    y += 0.42 + 0.2;
  }
  // "This lesson": Learn, Build, Apply in their stage colours, across the bottom (always shown)
  const sq = lessonSequence(L), stripH = 1.05, sy = BOT_Y - 0.12 - stripH, bw = (CW - 2 * GAP) / 3;
  [['learn', 'LEARN'], ['build', 'BUILD'], ['apply', 'APPLY']].forEach(([k, head], i) => {
    const bx = MX + i * (bw + GAP);
    txt(s, head, { x: bx, y: sy, w: bw, h: 0.32, fill: { color: STAGE[k] }, color: 'FFFFFF', bold: true, fontSize: 12, charSpacing: 1, valign: 'middle', margin: 6 });
    txt(s, prettyText(sq[k]), { x: bx, y: sy + 0.32, w: bw, h: stripH - 0.32, fill: { color: 'FFFFFF' }, line: { color: STAGE[k], width: 1.5 }, color: '1A1A2E',
      fontSize: autoFontSize(sq[k], bw - 0.2, stripH - 0.32, { min: 13, max: 17 }), valign: 'middle', fit: 'shrink', margin: 6 });
  });
  txt(s, 'THIS LESSON', { x: MX, y: sy - 0.32, w: 3, h: 0.3, color: '555555', fontSize: 11, charSpacing: 1, valign: 'middle' });
  const bottom = sy - 0.4;
  const rowH = objectives.length ? Math.min(1.1, (bottom - y) / objectives.length) : 0;
  objectives.forEach((o, i) => {
    const ry = y + i * rowH;
    s.addShape('ellipse', { x: MX, y: ry + (rowH - 0.5) / 2, w: 0.5, h: 0.5, fill: { color: GOLD }, line: { color: NAVY, width: 1.5 } });
    txt(s, String(i + 1), { x: MX, y: ry + (rowH - 0.5) / 2, w: 0.5, h: 0.5, color: NAVY, bold: true, fontSize: 18, align: 'center', valign: 'middle' });
    txt(s, prettyText(o), { x: MX + 0.7, y: ry, w: CW - 0.7, h: rowH, color: '1A1A2E', fontSize: autoFontSize(o, CW - 0.7, rowH, { min: 16, max: 24 }), valign: 'middle', fit: 'shrink' });
  });
  bottomBar(s, objectiveText(L));
}
