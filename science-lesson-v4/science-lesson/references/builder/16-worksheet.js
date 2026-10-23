'use strict';
// build.js part 16-worksheet: worksheet assembly (standard and support), apply tier sections, exam block, buildDocx. Loaded by build.js in order; all parts share one scope.

/* =========================================================================
   WORKSHEET ASSEMBLY — types A–H, split differentiation
   ========================================================================= */

/* derive printable Build questions from build items */
function buildQuestionBlocks(L, state, mode) {
  const out = [];
  const scaffolded = mode === 'developing';
  arr(L.build).forEach((b) => {
    const bt = b.type || b.variant;
    if (bt === 'mcq' || bt === 'mcq_image') {
      // MCQs are run as a whole-class check (vote on 3-2-1), not written on the worksheet — skip.
      return;
    } else if (bt === 'sort') {
      out.push(...question(++state.n, (b.instruction || 'Sort each item into the correct category.') +
        '  Items: ' + arr(b.items).join(', ') + '.'));
      out.push(...sortTableDocx(b.categories));
    } else if (bt === 'reformatFlowchart') {
      const steps = arr(b.steps).slice(0, 6);
      const n = steps.length;
      const order = shuffleOrder(n);
      const letters = 'ABCDEF';
      out.push(...question(++state.n, b.instruction || 'These steps are in the wrong order. Write the letters in the correct order below.'));
      order.forEach((origIdx, k) => {
        out.push(P([R(letters[k] + '   ', { bold: true, size: 22 }), R(steps[origIdx].label || '', { size: 22 })], { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } })); // M3
      });
      out.push(P(R('Correct order:   ' + '_____   '.repeat(n), { size: 22 }), { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } })); // M3
      if (mode === 'answers') {
        const correctLetters = steps.map((_, i) => letters[order.indexOf(i)]).join(', ');
        out.push(...plainAnswerCallout(correctLetters));
      }
    } else if (bt === 'annotatedDiagram') {
      // Worksheet side stays minimal on purpose — the numbered key belongs on
      // the slide; confirm with Patryk once he's seen the slide whether he
      // also wants the key reproduced here.
      out.push(...question(++state.n, 'Label the diagram from the board, then describe what each labelled part does.'));
      if (mode === 'answers') {
        const keyText = arr(b.labels).map((lb, i) => (i + 1) + ' ' + String(lb.text || '')).join(', ');
        out.push(...plainAnswerCallout(keyText));
      }
    } else if (bt === 'trueFalse') {
      out.push(...question(++state.n, 'For each statement, write True or False. If False, correct it.'));
      arr(b.statements).forEach((st, i) => {
        out.push(P([R(`${i + 1}   `, { bold: true, size: 20 }), R(st.text || '', { size: 20 }), R('   (True / False)', { size: 18, italic: true, color: '666666' })], { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } })); // M3
      });
    } else if (bt === 'workedExample' && b.yourTurn && b.yourTurn.prompt) {
      out.push(...question(++state.n, b.yourTurn.prompt));
      if (mode === 'answers' && b.yourTurn.answer) out.push(...plainAnswerCallout(b.yourTurn.answer));
    } else if (bt === 'errorAnalysis') {
      out.push(...question(++state.n, 'Spot the mistake in this working, then write the corrected line:'));
      arr(b.wrongWorking).forEach((ln, i) => {
        out.push(P([R(`${i + 1}   `, { bold: true, size: 20 }), R(ln, { size: 20 })], { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } })); // M3
      });
    } else if (bt === 'graphInterpret') {
      arr(b.questions).forEach((q) => { out.push(...question(++state.n, q.q, q.marks)); if (mode === 'answers') out.push(...answerReveal(q)); });
    } else if (bt === 'practiceTriangle') {
      if (b.equation) {
        out.push(P([
          new TextRun({ text: 'Use: ', italics: true, size: 22, color: NAVY }),
          ...toDocxRuns(parseEq(b.equation), { size: 22, color: NAVY }),
        ], { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } }));
      }
      arr(b.questions).forEach((q) => { out.push(...question(++state.n, q.q, q.marks)); if (mode === 'answers') out.push(...answerReveal(q)); });
    } else if (bt === 'misconception') {
      out.push(...question(++state.n, 'A student says: \u201C' + (b.claim || '') + '\u201D  Explain why this is wrong.'));
    } else if (bt === 'predictThenCheck' || bt === 'predict_then_check') {
      const pq = (b.setup ? b.setup + '  ' : '') + (b.prediction || 'What do you predict will happen?');
      out.push(...question(++state.n, pq));
      // M6: E9 label removed — write-line is self-explanatory
      if (b.reveal && !scaffolded) {
        out.push(P(R('What actually happens:', { bold: true, size: 22, color: '1B5E20' }), { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } })); // M3
        out.push(P(R(b.reveal, { italic: true, size: 22, color: '1B5E20' }), { indent: { left: 720 }, spacing: { before: GAP_NONE, after: GAP_SM } })); // M3
      }
    } else if (bt === 'markTheAnswers') {
      // Peer-assessment: the question + sample answers to mark. Standard/support:
      // space to annotate + a level/mark line. Answers mode: awarded level/marks,
      // MPs hit (green) / missed (red), teacher note, then the full mark scheme.
      // No ✓/✗ glyphs — Century Gothic lacks them (font substitution). Colour +
      // • bullets distinguish awarded from not-awarded, matching markingPanelDocx.
      out.push(...question(++state.n, b.question || '', b.marks));
      out.push(P(R(b.instruction || 'Mark each answer against the mark scheme. Give it a level and a mark.', { italic: true, size: 20, color: '555555' }), { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_SM } }));
      const maxMk = b.marks || '';
      arr(b.samples).forEach((sm, i) => {
        const label = sm.label || ('Student ' + String.fromCharCode(65 + i));
        out.push(fullTable([
          new TableRow({ children: [cell({ w: PAGE_W, fill: NAVY, margins: { top: 40, bottom: 40, left: 160, right: 160 }, children: [P(R(label, { bold: true, size: 20, color: GOLD }))] })] }),
          new TableRow({ children: [cell({ w: PAGE_W, borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [P(R(prettyText(sm.text || ''), { size: 22 }))] })] }),
        ], [PAGE_W], GREY_TBL));
        if (mode === 'answers') {
          const mk = sm.awardedMarks != null ? String(sm.awardedMarks) + (maxMk ? '/' + maxMk : '') : '';
          out.push(P([R('Awarded:  ', { bold: true, size: 20, color: NAVY }), R([sm.awardedLevel || '', mk].filter(Boolean).join('  ·  '), { bold: true, size: 20, color: 'C05A00' })], { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } }));
          arr(sm.hits).forEach((h) => out.push(P([R('•  ', { bold: true, size: 20, color: '1B5E20' }), R(prettyText(h), { size: 20, color: '1B5E20' })], { indent: { left: 480 }, spacing: { before: GAP_NONE, after: GAP_NONE } })));
          arr(sm.misses).forEach((m) => out.push(P([R('•  ', { bold: true, size: 20, color: '9B1B1B' }), R('missed: ' + prettyText(m), { size: 20, color: '9B1B1B' })], { indent: { left: 480 }, spacing: { before: GAP_NONE, after: GAP_NONE } })));
          if (sm.comment) out.push(P(R(prettyText(sm.comment), { italic: true, size: 18, color: '555555' }), { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_SM } }));
        } else {
          out.push(P([R('Level: ', { bold: true, size: 20 }), R('__________', { size: 20 }), R('    Mark: ', { bold: true, size: 20 }), R('____' + (maxMk ? ' / ' + maxMk : ''), { size: 20 })], { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } }));
          out.push(...blanks(1));
        }
      });
      if (mode === 'answers') out.push(...markingPanelDocx(b));
    }
    // practical handled by Type E; visualiser has no worksheet output
  });
  return out;
}

/* one Apply tier section */
/* examWorksheetBlock(eq) — the worksheet's real exam question (verbatim, no answer lines). */
function examWorksheetBlock(eq) {
  const out = [spacer(), new Table({
    width: { size: 3600, type: WidthType.DXA }, columnWidths: [3600], borders: NO_TBL_B,
    rows: [new TableRow({ children: [cell({
      w: 3600, fill: 'E8EAF6', margins: { top: 40, bottom: 40, left: 140, right: 140 },
      children: [P(R(`Exam question (${eq.board || 'AQA'}) · answer in your book`, { bold: true, size: 18, color: NAVY }),
        { alignment: AlignmentType.CENTER, keepNext: true, border: { left: { style: BorderStyle.SINGLE, size: 24, color: 'FFD700' } } })],
    })] })],
  })];
  arr(eq.groups).forEach((g) => {
    if (g.stem) out.push(P(R(prettyText(g.stem), { size: 24 }), { spacing: { before: GAP_SM, after: GAP_XS } }));
    g.parts.forEach((pt) => {
      const label = pt.label ? `(${pt.label})  ` : '';
      out.push(P([R(label, { bold: true, size: 24 }), R(prettyText(pt.text), { size: 24 }),
        R('\t', { size: 24 }), R(`[${pt.marks} ${pt.marks === 1 ? 'mark' : 'marks'}]`, { size: 20, color: '888888' })],
        { spacing: { before: GAP_SM, after: GAP_SM }, tabStops: [{ type: TabStopType.RIGHT, position: PAGE_W }] }));
    });
  });
  return out;
}

function applyTierSection(L, tier, mode, opts) {
  const o = opts || {};
  const qs = arr(L.apply && L.apply[tier]).map(normQ);
  if (!qs.length) return [];
  const out = [...tierBadge(tier)];
  const wx = L.worksheetExtras || {};
  const isDev = tier === 'developing' || mode === 'developing';
  const bank = wx.wordBank || (!NO_WORD_BANK.has((L.meta || {}).class) ? arr((L.title || {}).keywords) : []); // M5: B13

  // word bank: Developing tier only; split-developing forces it — but only ONCE (on the
  // first tier rendered) rather than repeating identically above every tier.
  const showBank = ((tier === 'developing' && wx.wordBank) || (mode === 'developing' && bank.length)) && bank.length > 2;
  if (showBank && tier === 'developing' && mode !== 'answers') {
    out.push(wordBank(bank));
  }
  if (o.links && o.links[tier] && mode !== 'answers') out.push(...linksBar(o.links[tier]));

  // answers mode: question + model answer only (no scaffolds / blank boxes / word bank)
  if (mode === 'answers') {
    qs.forEach((q, i) => {
      out.push(...question(i + 1, q.q, o.marks ? q.marks : null, q.subParts));
      out.push(...answerReveal(q, tier));
    });
    return out;
  }

  qs.forEach((q, i) => {
    out.push(...question(i + 1, q.q, o.marks ? q.marks : null, q.subParts));
    if (q.diagram) out.push(...diagramBox(typeof q.diagram === 'string' ? q.diagram : null, q.diagramLines || 8));
    const calc = (q.qType || '').toLowerCase() === 'calculation';
    // support mode: equation and units hint printed above the GUESS scaffold
    if (mode === 'developing' && calc && (q.equationHint || q.equation)) {
      const eqHint = q.equationHint || q.equation;
      const unitsStr = q.units ? '  Give your answer in ' + q.units + '.' : '';
      out.push(P([
        new TextRun({ text: 'Use: ', italics: true, size: 22, color: NAVY }),
        ...toDocxRuns(parseEq(eqHint), { size: 22, color: NAVY }),
        ...(unitsStr ? [new TextRun({ text: unitsStr, italics: true, size: 22, color: NAVY })] : []),
      ], { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } })); // M3
    }
    let guessAdded = false;
    // 2026-10-03 (Patryk): GUESS is never auto-added for calculations, never on Year 7/8
    // (they don't know the structure), and at most ONE per worksheet — only where the
    // question asks for it (q.guess). Calculations without it get a normal answer box.
    const yearNum = parseInt((L.meta || {}).year || (String((L.meta || {}).class || '').match(/^\d+/) || [])[0], 10);
    if (q.guess && !(yearNum <= 8) && !_guessUsedOnSheet) {
      // contentType: 'new_procedure' | 'known_procedure' — defaults to known_procedure if unset
      const contentType = q.contentType || 'known_procedure';
      const isReaching = tier === 'reaching';
      const isMastering = tier === 'mastering';
      let scaffoldMode;
      if (contentType === 'new_procedure') {
        // first exposure: every tier gets backward-fade, not a separate worked example
        scaffoldMode = (mode === 'developing' || tier === 'developing') ? 'full' : 'backward-fade';
      } else {
        // known_procedure
        if (mode === 'developing' || tier === 'developing') scaffoldMode = q.repetitionCount >= 3 ? 'blank' : 'full';
        else if (isReaching) scaffoldMode = 'blank';
        else scaffoldMode = null; // Mastering known_procedure: no scaffold table at all
      }
      if (scaffoldMode) { out.push(...guessScaffold(scaffoldMode, { given: q.given, unknown: q.unknown, equation: q.equation, substitute: q.substitute })); guessAdded = true; _guessUsedOnSheet = true; }
    }
    if (q.structure) out.push(...structureGuide(q.structure));

    // B3/B4: structured writing scaffolds on support sheet — replace starters + answer box when fired
    let scaffoldRendered = false;
    if (mode === 'developing' && (q.qType || '').toLowerCase() === 'practical_design') {
      // B3: practical design — method prompt above free lines
      // No dingbat glyphs (pencil/arrow) — Century Gothic lacks them, which forces Word to
      // silently substitute a fallback font (seen as Nova Mono / Arial Unicode MS) for that run.
      out.push(P(R('Include in your method:', { bold: true, size: 22, color: NAVY }), { indent: { left: 360 }, spacing: { before: GAP_NONE, after: GAP_NONE } })); // M6
      ['how you set up the equipment',
        'what you change and by how much',
        'what you measure and what you use to measure it',
        'what you keep the same'].forEach(line => {
        out.push(P(R('-  ' + line, { size: 22, color: '444444' }), { indent: { left: 540 }, spacing: { before: GAP_NONE, after: GAP_NONE } })); // M6
      });
      scaffoldRendered = true;
    } else if (mode === 'developing' && q.contentType === 'extended_writing' && (q.marks || 0) >= 5) {
      // B4: explanation scaffold — prompts above free lines
      out.push(P(R('To answer this question:', { bold: true, size: 22, color: NAVY }), { indent: { left: 360 }, spacing: { before: GAP_NONE, after: GAP_NONE } })); // M6
      ['What changes? (name the effect)',
        'Why does this happen? (the mechanism or reason)',
        'What does this mean? (the consequence)'].forEach(line => {
        out.push(P(R('-  ' + line, { size: 22, color: '444444' }), { indent: { left: 540 }, spacing: { before: GAP_NONE, after: GAP_NONE } })); // M6
      });
      scaffoldRendered = true;
    }

    // B5: subSteps — lettered sub-questions with a write line each (support sheet only)
    if (!scaffoldRendered && mode === 'developing' && arr(q.subSteps).length) {
      arr(q.subSteps).forEach((step, si) => {
        const letter = String.fromCharCode(97 + si);
        out.push(P(R('(' + letter + ')  ' + step, { size: 20 }), { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } })); // M3
      });
      scaffoldRendered = true;
    }

    // sentence starters: extended_writing questions get tier-appropriate density at every tier, never zero
    const isExtendedWriting = q.contentType === 'extended_writing' || (q.marks || 0) >= 4;
    const starterOk = !scaffoldRendered && q.starters && (isExtendedWriting || mode === 'developing' || q.forceStarters);
    if (starterOk) out.push(...sentenceStarters(q.starters));
    if (!scaffoldRendered && !guessAdded && o.boxes && q.marks) out.push(...answerBox(q.marks));
  });
  return out;
}

function buildWorksheetChildren(L, mode) {
  const type = String(L.meta.worksheet || 'A').toUpperCase();
  const wx = L.worksheetExtras || {};
  const ch = [...worksheetHeader(L)];
  // answers mode: a marking-copy banner so a printed answer sheet is never mistaken for a pupil sheet
  if (mode === 'answers') {
    ch.push(fullTable([new TableRow({
      children: [cell({
        w: PAGE_W, fill: NAVY, margins: { top: 80, bottom: 80, left: 160, right: 160 },
        children: [P([R('MODEL ANSWERS', { bold: true, size: 26, color: GOLD }), R('  ·  marking copy', { size: 22, color: 'FFFFFF' })])],
      })],
    })], [PAGE_W]), spacer());
  }
  const bstate = { n: 0 };
  const doNowQs = arr(L.doNow && L.doNow.questions);

  const doNowSection = () => {
    if (!doNowQs.length) return;
    // Answer sheet is the mark scheme for the Apply/Build sections ONLY — Do Now
    // answers already live on the DoNow Answers slide, so they never print here
    // (Patryk 2026-07-05).
    if (mode === 'answers') return;
    ch.push(...divider('DO NOW'));
    const kwSrc = arr(L.doNow && L.doNow.keywords).length
      ? arr(L.doNow.keywords)
      : arr((L.title || {}).keywords);
    const qChildren = [];
    doNowQs.forEach((q, i) => {
      qChildren.push(...question(i + 1, q.q || ''));
      if (mode === 'answers') {
        qChildren.push(P([R('Answer:  ', { bold: true, size: 22, color: NAVY }), R(prettyText(q.a || ''), { size: 22 })],
          { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_SM } }));
      } else if (mode === 'developing' && q.hint) {
        qChildren.push(P(R(q.hint, { italic: true, size: 22, color: '555555' }), { indent: { left: 360 }, spacing: { before: GAP_XS, after: GAP_XS } })); // M3
      }
    });
    // answers mode: questions + answers only — no keyword reference box
    if (kwSrc.length && mode !== 'answers') {
      const maxKwLen = kwSrc.reduce((m, kw) => Math.max(m, (typeof kw === 'string' ? kw : kw.term || String(kw)).length), 9);
      const rightW = Math.min(Math.round(PAGE_W * 0.35), maxKwLen * 130 + 600);
      const leftW = PAGE_W - rightW;
      const bGold = { style: BorderStyle.SINGLE, size: 6, color: GOLD };
      const kwBorder = { top: bGold, bottom: bGold, left: bGold, right: bGold };
      const kwChildren = [
        P(R('Key words', { bold: true, size: 22, color: NAVY }), { spacing: { before: GAP_SM, after: GAP_SM } }), // M2
        ...kwSrc.map(kw => P(R('•  ' + (typeof kw === 'string' ? kw : kw.term || String(kw)), { size: 22 }), { spacing: { before: GAP_SM, after: GAP_SM } })), // M3
      ];
      ch.push(fullTable([new TableRow({
        ...(mode === 'developing' && { height: { value: 1440, rule: HeightRule.AT_LEAST } }),
        children: [
          cell({ w: leftW, valign: 'top', children: qChildren, margins: { top: 40, bottom: 40, left: 0, right: 180 } }),
          cell({ w: rightW, valign: 'top', borders: kwBorder, children: kwChildren, margins: { top: 80, bottom: 80, left: 140, right: 140 } }),
        ],
      })], [leftW, rightW]));
    } else {
      ch.push(...qChildren);
    }
  };
  // support sheet only: a key-term definition table with write-space on the sheet
  const definitionSection = () => {
    if (mode !== 'developing') return;
    const learnBTerms = arr(L.learn)
      .filter(i => ['B', 'KEYWORDS', 'WRITE_IN_BOOK'].includes(String(i.variant || '').toUpperCase()))
      .flatMap(i => arr(i.definitions));
    const alreadyDefined = new Set([
      ...learnBTerms.map(d => String(d.term || d).toLowerCase()),
      ...arr(L.learn).filter(i => String(i.variant || '').toUpperCase() === 'F')
        .flatMap(i => arr(i.components).map(c => String(c.name || '').toLowerCase())),
    ]);
    const terms = arr(wx.definitions).length
      ? arr(wx.definitions).filter(t => !alreadyDefined.has(String(t.term || t).toLowerCase()))
      : learnBTerms;
    if (!terms.length) return;
    ch.push(...divider('KEY WORDS'));
    ch.push(P(R('Write what each key word means. Use the word bank and your notes to help.', { italic: true, size: 18, color: '555555' }), { spacing: { before: GAP_SM, after: GAP_SM } })); // M2
    ch.push(...definitionTable(terms));
  };
  // optional cloze/gap-fill section, driven by worksheetExtras.cloze
  const clozeSection = () => {
    const sentences = arr(wx.cloze);
    if (!sentences.length) return;
    ch.push(...divider('FILL IN THE GAPS'));
    const bank = wx.clozeWordBank || wx.wordBank || (!NO_WORD_BANK.has((L.meta || {}).class) ? arr((L.title || {}).keywords) : []); // M5: B13
    if (bank.length > 2) ch.push(wordBank(bank));
    ch.push(...clozeDocx(sentences));
  };
  const buildSection = () => {
    const blocks = buildQuestionBlocks(L, bstate, mode);
    if (!blocks.length) return;
    ch.push(...divider('BUILD'));
    ch.push(...blocks);
  };
  const videoQSection = () => {
    const hItems = arr(L.learn).filter(item => String(item.variant || 'A').toUpperCase() === 'H' && arr(item.questions).length);
    if (!hItems.length) return;
    ch.push(...divider('VIDEO QUESTIONS'));
    hItems.forEach(item => {
      arr(item.questions).forEach((q, i) => ch.push(...question(i + 1, q.q || '')));
    });
  };
  const applySection = (o) => {
    if (!L.apply) return;
    ch.push(...divider('APPLY', lessonBookRef(L)));   // textbook ref top-right of the Apply title
    TIERS.forEach((t) => ch.push(...applyTierSection(L, t, mode, o || {})));
    // 2026-10-03: a second, different real exam question, only when it still fits 4 pages
    // (build.js decides with page-count.js). Answered in books: no answer lines.
    if (L.examWorksheet && L._examOnSheet && mode !== 'answers') ch.push(...examWorksheetBlock(L.examWorksheet));
  };


  // REVIEW lessons (2026-10-10): the EBI follow-up tasks + Extension questions for pupils (answered
  // in books, no boxes); on the answer sheet the model answers for the test (modelAnswerReview,
  // answerList) and the Extension answers. Only drawn when the lesson has them.
  const reviewExtrasSection = () => {
    const isReview = /^(review|revision)$/i.test(String(L.meta.lessonType || ''));
    if (!isReview) return;
    const ebi = arr(L.ebiTask && L.ebiTask.rows);
    if (ebi.length && mode !== 'answers') {
      ch.push(...divider('PURPLE PEN · 3 EBIs'));
      ch.push(P(R('Pick 3 EBIs from the front of your test. Do each one’s follow-up task in purple pen, using the support page.', { size: 20, italics: true }), { spacing: { after: GAP_SM } }));
      const colW = [1300, 6806, 2000];
      const rowsE = [new TableRow({ children: ['Question', 'Follow-up task', 'Support pages'].map((h, i) => cell({ w: colW[i], fill: NAVY, borders: GREY_TBL, margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [P(R(h, { bold: true, size: 20, color: 'FFFFFF' }))] })) })];
      ebi.forEach((r, i) => rowsE.push(new TableRow({ children: [r.q || '', r.task || '', pagesOnly(r.pages)].map((v, ci) => cell({ w: colW[ci], fill: i % 2 ? 'F5F5F5' : 'FFFFFF', borders: GREY_TBL,
        margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: [P(R(prettyText(String(v)), { size: 19, bold: ci === 0 }))] })) })));
      ch.push(fullTable(rowsE, colW, GREY_TBL), spacer());
    }
    if (mode === 'answers') {
      const items = arr(L.build).filter((b) => ['modelAnswerReview', 'answerList'].includes(b.type || b.variant));
      if (items.length) ch.push(...divider('TEST · MODEL ANSWERS'));
      items.forEach((b) => {
        if ((b.type || b.variant) === 'answerList') {
          arr(b.rows).map(normQ).forEach((r) => { ch.push(P(R(prettyText(r.q), { bold: true, size: 22 }), { spacing: { before: GAP_SM } })); ch.push(...plainAnswerCallout(r.a)); });
          return;
        }
        const head = `Q${b.questionNumber || ''}` + (b.marks ? `  [${b.marks} ${b.marks > 1 ? 'marks' : 'mark'}]` : '');
        ch.push(P(R(head, { bold: true, size: 24 }), { spacing: { before: GAP_SM }, keepNext: true }));
        const ma = Array.isArray(b.modelAnswer) ? b.modelAnswer.join(';   ') : (b.modelAnswer || '');   // working steps, one after another
        ch.push(...plainAnswerCallout(ma));
        if (arr(b.indicativeContent).length || arr(b.levelDescriptors).length || arr(b.doesNotAward).length) ch.push(...markingPanelDocx(b));
      });
    }
    const cols = extensionCols(L);
    if (cols.length) {
      ch.push(...divider(mode === 'answers' ? 'EXTENSION · ANSWERS' : 'EXTENSION'));
      if (mode !== 'answers') ch.push(P(R('Finished your 3 EBIs? Pick the subtopic you got wrong and answer in your book.', { size: 20, italics: true }), { spacing: { after: GAP_SM } }));
      cols.forEach((c) => {
        ch.push(P([R(c.subtopic, { bold: true, size: 24, color: NAVY }), ...(c.pages ? [R('    Support: ' + pagesOnly(c.pages), { size: 20, color: '555555' })] : [])], { spacing: { before: GAP_SM, after: GAP_XS }, keepNext: true }));
        c.qs.forEach((q) => {
          ch.push(P([R(q.label + '  ', { bold: true, size: 24 }), R(prettyText(q.q), { size: 24 }), ...(q.marks ? [R(`  [${q.marks} ${q.marks > 1 ? 'marks' : 'mark'}]`, { size: 20, color: '888888' })] : [])], { spacing: { before: GAP_SM, after: GAP_SM } }));
          if (mode === 'answers') ch.push(...plainAnswerCallout(q.a));
        });
      });
    }
  };
  if (type === 'B') {                                    // exam practice
    if (wx.intro) ch.push(...contextBox(wx.intro));
    applySection({ marks: true, boxes: true });
  } else if (type === 'C') {                             // post-test review booklet
    if (arr(wx.navRows).length) ch.push(...bookletNavTable(wx.navRows));
    applySection({ marks: true, boxes: true, links: wx.links || {} });
  } else if (type === 'D') {                             // multi-topic revision grid
    const all = TIERS.flatMap((t) => arr(L.apply && L.apply[t]).map(normQ));
    const colW = [5053, 5053];
    const rows = [];
    for (let i = 0; i < all.length; i += 2) {
      rows.push(new TableRow({
        children: [0, 1].map((j) => {
          const q = all[i + j];
          return cell({
            w: colW[j], borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: q ? [
              P(R(`Q${i + j + 1}`, { bold: true, size: 20, color: GOLD }), { shading: shade(NAVY), spacing: { after: GAP_SM } }), // M3
              P(R(q.q, { size: 20 })),
              ...blanks(4),
            ] : [new Paragraph({})],
          });
        }),
      }));
    }
    if (rows.length) { ch.push(spacer(), fullTable(rows, colW, GREY_TBL), spacer()); }
  } else if (type === 'E') {                             // practical
    // up to TWO experiments (Patryk 2026-10-12); the second uses its own `results` on the practical item
    const pracsE = arr(L.build).filter((b) => (b.type || b.variant) === 'practical').slice(0, 2);
    (pracsE.length ? pracsE : [{}]).forEach((prac, k) => {
    if (pracsE.length > 1) ch.push(...divider(prac.heading || prac.title || 'EXPERIMENT ' + (k + 1)));
    const intro = k === 0 ? (wx.intro || prac.intro) : prac.intro;
    if (intro) ch.push(...contextBox(intro));
    if (prac.embeddedImagePath || prac.imagePlaceholder !== false) ch.push(...diagramOrImage(prac));
    if (arr(prac.steps).length) {
      ch.push(...sectionLabel('Method'));
      arr(prac.steps).forEach((st, i) => ch.push(P([R(`${i + 1}.  `, { bold: true, size: 20 }), R(st, { size: 20 })], { spacing: { before: GAP_SM, after: GAP_SM } }))); // M3
    }
    ch.push(...sectionLabel('Variables'));
    ch.push(...variablesTable());
    ch.push(...divider('RESULTS'));
    const res = (k === 0 ? wx.results : prac.results) || {};
    ch.push(...resultsTable(res.headers || ['', '', ''], res.rows == null ? 5 : res.rows));
    });
    applySection({});                                    // conclusion questions — write in books
  } else if (type === 'G') {                             // video companion
    if (arr(wx.videoQuestions).length) {
      ch.push(...sectionLabel('Video questions'));
      arr(wx.videoQuestions).forEach((q, i) => ch.push(...question(i + 1, q)));
    }
    applySection({});
  } else if (type === 'H') {                             // cover / independent
    doNowSection();
    buildSection();
    applySection({ marks: true, boxes: true });
  } else if (type === 'F') {                             // general revision — question bank
    applySection({ marks: true });
  } else {                                               // A — lesson companion (default)
    doNowSection();
    clozeSection();
    videoQSection();
    // practical experiment section — diagram + results + conclusion questions (never strip)
    // up to TWO experiments (Patryk 2026-10-12: reflection then refraction); the first uses
    // worksheetExtras.results / referenceData, the second its own `results` on the practical item
    const pracs = arr(L.build).filter((b) => (b.type || b.variant) === 'practical').slice(0, 2);
    pracs.forEach((pracA, k) => {
      ch.push(...divider(pracA.heading || pracA.title || (pracs.length > 1 ? 'EXPERIMENT ' + (k + 1) : 'EXPERIMENT'))); // M2: B6 derive heading from item
      if (pracA.intro && pracA.worksheetIntro !== false) ch.push(...contextBox(pracA.intro)); // M7: E11
      if (pracA.embeddedImagePath || pracA.imagePlaceholder !== false) ch.push(...diagramOrImage(pracA));
      const resA = (k === 0 ? wx.results : pracA.results) || {};
      const rd = k === 0 ? wx.referenceData : null;
      if (resA.headers) {
        ch.push(...resultsTable(resA.headers, resA.rows == null ? 5 : resA.rows));
      } else if (rd && arr(rd.headers).length) {
        // no explicit results table — derive blank recording table from referenceData headers
        ch.push(...resultsTable(rd.headers, 5));
      }
      arr(pracA.questions).forEach((q, i) => ch.push(...question(i + 1, q.q || '')));
    });
    buildSection();
    if (wx.collectionTable && arr(wx.collectionTable.headers).length) {
      const ct = wx.collectionTable;
      ch.push(...divider(ct.title || 'DATA COLLECTION'));
      if (ct.instruction) ch.push(...contextBox(ct.instruction));
      ch.push(...resultsTable(ct.headers, ct.rows == null ? 6 : ct.rows));
    }
    applySection({});
  }
  reviewExtrasSection();
  return ch;
}
async function buildDocx(L, outPath, mode) {
  _guessUsedOnSheet = false;                                     // one GUESS row per worksheet
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Century Gothic', size: 22 },
          paragraph: { spacing: { line: 360, lineRule: LineRuleType.AUTO } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 720, bottom: 720, left: 900, right: 900 },
        },
      },
      children: tidyGaps(buildWorksheetChildren(L, mode)),
    }],
  });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buf);

  // MANDATORY post-process — Google Docs / LibreOffice shading compatibility
  const zip = new AdmZip(outPath);
  const entry = zip.getEntry('word/document.xml');
  if (entry) {
    let xml = zip.readAsText(entry);
    xml = xml.replace(/(<w:shd\b[^>]*w:val=")solid(")/g, '$1clear$2');
    zip.updateFile(entry, Buffer.from(xml, 'utf8'));
    zip.writeZip(outPath);
  }
}
