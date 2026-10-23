'use strict';
// build.js part 15-worksheet-parts: worksheet (.docx) pieces: tables, dividers, tier badges, word bank, answer boxes, GUESS scaffold, marking panel, cloze, header. Loaded by build.js in order; all parts share one scope.
const bGrey = (sz) => ({ style: BorderStyle.SINGLE, size: sz, color: 'CCCCCC' });
const GREY_TBL = { top: bGrey(4), bottom: bGrey(4), left: bGrey(4), right: bGrey(4), insideHorizontal: bGrey(4), insideVertical: bGrey(4) };
const shade = (fill) => ({ type: ShadingType.CLEAR, color: 'auto', fill });   // only form both renderers respect
// Section divider colours — pastel fill + dark left border matched to PPTX STAGE colours
const DIVIDER_THEME = {
  'DO NOW':           { fill: 'E0E6F5', border: '0D1B5E' },
  'BUILD':            { fill: 'FFF3E0', border: 'E65100' },
  'APPLY':            { fill: 'FFEBEE', border: 'B71C1C' },
};

const P = (children, opts) => new Paragraph(Object.assign({ children: arr(children).flat(Infinity) }, opts || {}));
// Every worksheet run: maths shorthand → real raised/lowered runs at SCRIPT_SCALE. Returns an
// array when the text holds maths; P() flattens it, and every R() goes through P().
const R = (text, opts) => { const r = docxMathRuns(text, opts); return r.length === 1 ? r[0] : r; };
// M6: standardised paragraph-spacing scale (twips) — replaces the previous scattered
// 0/10/20/30/40/60/80/120/160 mix. Line spacing (1.5x, BDA rule) is untouched — see ~L2745.
const GAP_NONE = 0;   // tightly-grouped lines within one scaffold block
const GAP_XS = 10;    // hint/annotation lines directly under a question
const GAP_SM = 20;    // list items, sub-parts, between question blocks, before/after tables
const GAP_MD = 40;    // after section titles/headers, around embedded images
const blanks = (n) => Array.from({ length: n }, () => new Paragraph({ spacing: { before: GAP_NONE, after: GAP_NONE } }));
// M1: a gap before/after tables. 2026-10-03 (Patryk deletes these by hand): a THIN 6pt line, not a
// full blank line, and tidyGaps() merges runs of them into one. Word still needs SOME paragraph
// between two tables (or it fuses them into one), so it is never removed entirely.
const spacer = () => {
  const p = new Paragraph({ keepNext: true, spacing: { before: 0, after: 0, line: 120, lineRule: LineRuleType.EXACT }, children: [new TextRun({ text: '', size: 4 })] });
  p._gap = true;
  return p;
};
// Drop a gap paragraph that directly follows another gap (or opens the sheet).
function tidyGaps(children) {
  const out = [];
  for (const c of children) {
    if (c && c._gap && (!out.length || out[out.length - 1]._gap)) continue;
    out.push(c);
  }
  return out;
}

function fullTable(rows, columnWidths, borders) {
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths, borders: borders || NO_TBL_B, rows,
  });
}
function cell(o) {
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.fill ? shade(o.fill) : undefined,
    borders: o.borders || NO_B,
    margins: o.margins,
    verticalAlign: o.valign || VerticalAlign.CENTER,
    children: o.children,
  });
}

/* divider(text) — full-width pastel bar; fill + left border matched to PPTX STAGE colour for that section */
function divider(text, rightRef) {
  const theme = DIVIDER_THEME[String(text).toUpperCase()] || { fill: 'EEF1F8', border: '003366' };
  const leftB = { style: BorderStyle.SINGLE, size: 36, color: theme.border };
  const titleCellArgs = { fill: theme.fill, borders: { ...NO_B, left: leftB }, margins: { top: 60, bottom: 60, left: 180, right: 80 }, children: [P(R(String(text).toUpperCase(), { bold: true, size: 28, color: theme.border }), { keepNext: true, keepLines: true })] }; // never stranded at a page foot
  if (rightRef) {
    // Two-column: title left, textbook reference top-right in dark blue on gold.
    const refW = 5600, titleW = PAGE_W - refW;
    return [spacer(), new Table({
      width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: [titleW, refW], borders: NO_TBL_B,
      rows: [new TableRow({ children: [
        cell({ w: titleW, ...titleCellArgs }),
        cell({ w: refW, fill: '003366', borders: NO_B, margins: { top: 60, bottom: 60, left: 100, right: 160 },
          children: [P(R(rightRef, { bold: true, size: 18, color: 'FFD700' }), { alignment: AlignmentType.RIGHT })] }),
      ] })],
    }), spacer()];
  }
  return [spacer(), new Table({
    width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: [PAGE_W], borders: NO_TBL_B,
    rows: [new TableRow({ children: [cell({ w: PAGE_W, ...titleCellArgs })] })],
  }), spacer()];
}

/* tierBadge(tier) — narrow pill, 1800 DXA */
function tierBadge(tier) {
  const pastel = { developing: 'E8F5E9', reaching: 'FFF3E0', mastering: 'FFEBEE' };
  return [spacer(), new Table({
    width: { size: 1800, type: WidthType.DXA }, columnWidths: [1800], borders: NO_TBL_B,
    rows: [new TableRow({
      children: [cell({
        w: 1800, fill: pastel[tier] || 'F5F5F5', margins: { top: 40, bottom: 40, left: 140, right: 140 },
        children: [P(R(cap(tier), { bold: true, size: 18, color: TIER_DOCX[tier] || '333333' }), { alignment: AlignmentType.CENTER, keepNext: true, border: { left: { style: BorderStyle.SINGLE, size: 24, color: 'FFD700' } } })], // stays with its first question
      })],
    })],
  })];
}

/* wordBank(terms[]) — Developing only; caller enforces */
function wordBank(terms) {
  const runs = [R('Word bank: ', { bold: true, size: 22, color: '1E5C2D' })];
  arr(terms).forEach((t, i) => {
    if (i) runs.push(R(' \u00B7 ', { italic: true, size: 22, color: '1E5C2D' }));
    runs.push(R(t, { italic: true, size: 22, color: '1E5C2D' }));
  });
  return P(runs, { spacing: { before: GAP_SM, after: GAP_SM } }); // M3
}

/* question(num, text, marks?) (+ optional subParts[]) */
function question(num, text, marks, subParts) {
  // C4 (revised 2026-10-03): the marks sit at the right-hand end of the question's LAST line,
  // exam-paper style, instead of taking a whole line of their own. Colour-muted annotation.
  const runs = [
    R(`Q${num}  `, { bold: true, size: 24 }),
    R(prettyText(text), { size: 24 }),   // 2026-07-05: superscripts/symbols typeset in every worksheet question
  ];
  if (marks) runs.push(R('	', { size: 24 }), R(`[${marks} ${marks > 1 ? 'marks' : 'mark'}]`, { size: 20, color: '888888' }));
  const out = [P(runs, { spacing: { before: GAP_SM, after: GAP_SM }, tabStops: [{ type: TabStopType.RIGHT, position: PAGE_W }] })]; // M3
  arr(subParts).forEach((sp) => {
    out.push(P(R(sp, { size: 24 }), { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } })); // M3
  });
  return out;
}

/* answerBox(marks) — lines by marks */
function answerBox(marks) {
  const base = (marks == null || marks <= 1) ? 1 : marks <= 3 ? 3 : 5;
  const n = base;
  const rowH = n * 360;  // AT_LEAST: 360 twips (0.25") per answer line — prevents Google Docs collapse
  return [fullTable([new TableRow({
    height: { value: rowH, rule: HeightRule.AT_LEAST },
    children: [cell({
      w: PAGE_W, margins: { top: 60, bottom: 60, left: 120, right: 120 },
      borders: { top: bGrey(1), bottom: bGrey(1), left: bGrey(1), right: bGrey(1) },
      valign: VerticalAlign.TOP, children: blanks(n),
    })],
  })], [PAGE_W]), spacer()];
}

/* diagramBox(label?, lines?) — framed space for a circuit/apparatus diagram.
   Teacher pastes the image in, or students draw. Worksheets must carry the
   diagrams the questions refer to — never strip them out. */
function diagramBox(label, lines) {
  const n = lines || 8;
  const kids = [P(R(label || '[Diagram: teacher inserts]', { italic: true, size: 18, color: '777777' }), { alignment: AlignmentType.CENTER })]
    .concat(blanks(n));
  return [spacer(), fullTable([new TableRow({
    children: [cell({
      w: PAGE_W, margins: { top: 80, bottom: 80, left: 120, right: 120 },
      borders: { top: bGrey(2), bottom: bGrey(2), left: bGrey(2), right: bGrey(2) },
      valign: VerticalAlign.TOP, children: kids,
    })],
  })], [PAGE_W]), spacer()];
}

/* diagramOrImage(prac) — renders embeddedImagePath if present, else diagramBox.
   Cap: full content width (674px ≈ 7"), max 288px tall (3" ≈ 8cm) per spec. */
function diagramOrImage(prac) {
  if (prac.imageConfidence === 'search' && prac.embeddedImagePath) { // M6: match PPTX condition
    try {
      const imgData = fs.readFileSync(prac.embeddedImagePath);
      const ext = (path.extname(prac.embeddedImagePath).slice(1) || 'png').toLowerCase();
      return [spacer(), new Paragraph({
        children: [new ImageRun({ data: imgData, transformation: { width: 674, height: 288 }, type: ext })],
        alignment: AlignmentType.CENTER,
        spacing: { after: GAP_MD }, // M2
      }), spacer()];
    } catch (e) {
      buildWarn(`worksheet diagram image failed to embed (${prac.embeddedImagePath}): ${e.message || e} — description box shipped instead`);
    }
  }
  return diagramBox(prac.imageDescription || '[Equipment / apparatus diagram: teacher inserts]', 8); // M6: use imageDescription in fallback
}

/* contextBox(text) */
function contextBox(text) {
  return [spacer(), fullTable([new TableRow({
    children: [
      cell({ w: 120, fill: NAVY, children: [new Paragraph({})] }),
      cell({
        w: 9986, fill: BG, margins: { top: 80, bottom: 80, left: 160, right: 160 },
        children: [P(R(text, { italic: true, size: 20 }))],
      }),
    ],
  })], [120, 9986]), spacer()];
}

/* resultsTable(headers[], rows) — rows: number of blank rows OR array of arrays */
function resultsTable(headers, rows) {
  const n = Math.max(1, headers.length);
  const colW = Array.from({ length: n }, (_, i) => (i === n - 1 ? PAGE_W - Math.floor(PAGE_W / n) * (n - 1) : Math.floor(PAGE_W / n)));
  const head = new TableRow({
    children: headers.map((h, i) => cell({
      w: colW[i], fill: NAVY, borders: GREY_TBL, margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [P(R(h, { bold: true, size: 20, color: 'FFFFFF' }), { alignment: AlignmentType.CENTER })],
    })),
  });
  const bodyRows = [];
  const data = typeof rows === 'number' ? Array.from({ length: rows }, () => null) : arr(rows);
  data.forEach((r) => {
    bodyRows.push(new TableRow({
      children: colW.map((w, i) => cell({
        w, borders: GREY_TBL, margins: { top: 40, bottom: 40, left: 80, right: 80 }, valign: VerticalAlign.TOP,
        children: r ? (r[i] == null || r[i] === '' ? blanks(2) : [P(R(r[i], { size: 20 }))]) : blanks(3),
      })),
    }));
  });
  return [spacer(), fullTable([head, ...bodyRows], colW, GREY_TBL), spacer()];
}

/* variablesTable() */
function variablesTable() {
  const colW = [3368, 3368, 3370];
  const heads = ['Independent variable', 'Dependent variable', 'Control variables'];
  return [spacer(), fullTable([
    new TableRow({
      children: heads.map((h, i) => cell({
        w: colW[i], fill: NAVY, borders: GREY_TBL, margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [P(R(h, { bold: true, size: 20, color: 'FFFFFF' }), { alignment: AlignmentType.CENTER })],
      })),
    }),
    new TableRow({
      children: colW.map((w) => cell({ w, borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: blanks(3) })),
    }),
  ], colW, GREY_TBL), spacer()];
}

let _guessUsedOnSheet = false;   // set by applyTierSection, reset per buildDocx

/* guessScaffold(mode, vals?) — mode: 'full' | 'backward-fade' | 'blank' | 'answer'
   'full': Given + Unknown pre-filled (vals.given, vals.unknown), rest blank — Developing.
   'backward-fade': Given/Unknown/Equation/Substitute pre-filled (vals.given, vals.unknown,
     vals.equation, vals.substitute), only Solve blank — Reaching on new_procedure, or any
     tier's genuine first exposure to a procedure this unit.
   'blank': entire row blank — known_procedure once a tier has already seen it worked.
   'answer': all five cells filled (given, unknown, equation, substitute, solve) with NO
     write-lines — the model-answer sheet's filled GUESS framework; Solve cell emphasised.
   Back-compat: guessScaffold(given, unknown) (two string args, no mode) behaves as 'full'. */
function guessScaffold(mode, vals) {
  let pre;
  const isAns = mode === 'answer';
  if (mode === 'backward-fade') {
    vals = vals || {};
    pre = [vals.given, vals.unknown, vals.equation, vals.substitute, null];
  } else if (mode === 'blank') {
    pre = [null, null, null, null, null];
  } else if (isAns) {
    vals = vals || {};
    pre = [vals.given, vals.unknown, vals.equation, vals.substitute, vals.solve];
  } else {
    // 'full' (default)
    vals = vals || {};
    pre = [vals.given, vals.unknown, vals.equation || null, null, null];
  }
  // 2026-10-03 (Patryk chose "Option A", design-audit/guess-options-2026-10-03.png): ONE row of
  // five boxes with the letter inside each — no navy header row, no spacer paragraphs — about a
  // third of the old table's height. Pre-filled values follow the letter.
  const colW = [2021, 2021, 2021, 2021, 2022];
  const heads = ['G', 'U', 'E', 'S', 'S'];
  return [fullTable([
    new TableRow({
      children: colW.map((w, i) => {
        const emph = isAns && i === 4;                                  // Solve cell — the final answer
        const has = pre[i] != null && pre[i] !== '';
        const letter = R(heads[i] + '  ', { bold: true, size: 20, color: NAVY });
        const first = has
          ? P([letter, ...toDocxRuns(parseEq(String(pre[i])), { size: isAns ? 20 : 18, bold: emph, color: emph ? NAVY : undefined })])
          : P(letter);
        return cell({
          w, fill: emph ? 'FFF8E1' : undefined,
          borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: isAns ? [first] : [first, ...blanks(1)],
        });
      }),
    }),
  ], colW, GREY_TBL)];
}

/* ---- ANSWER SHEET (mode 'answers') — model-answer frameworks ---------------
   answerFramework(q) picks the framework; answerReveal(q, tier) renders it
   interleaved under the question. Mirrors slideModelAnswerReview's qType logic
   so the printed answer sheet and the on-screen model-answer slide agree. */
function answerFramework(q) {
  const override = String(q.answerStyle || '').toLowerCase();
  if (['guess', 'indicative', 'graph', 'plain'].includes(override)) return override;
  const qType = String(q.qType || '').toLowerCase();
  if (qType === 'graph') return 'graph';
  const hasGuess = q.given != null || q.unknown != null || q.substitute != null || q.solve != null;
  if (qType === 'calculation' || hasGuess) return 'guess';
  if ((q.marks || 0) >= 6 || q.contentType === 'extended_writing' || arr(q.indicativeContent).length) return 'indicative';
  return 'plain';
}

/* plainAnswerCallout(text) — short model answer as a navy-left-border callout. */
function plainAnswerCallout(text) {
  const t = prettyText(text || '');
  return [fullTable([new TableRow({
    children: [
      cell({ w: 120, fill: NAVY, children: [new Paragraph({})] }),
      cell({
        w: PAGE_W - 120, fill: 'F3F6FC', margins: { top: 80, bottom: 80, left: 160, right: 160 },
        children: [P([R('Model answer:  ', { bold: true, size: 20, color: NAVY }), R(t, { size: 22 })])],
      }),
    ],
  })], [120, PAGE_W - 120]), spacer()];
}

/* markingPanelDocx(q) — DOCX analogue of buildMarkingPanelRuns: navy panel,
   gold text; level descriptors + INDICATIVE CONTENT bullets (chunked by
   ic.group when present — structural blocks, not more text) + DOES NOT AWARD.
   No dingbat glyphs (Century Gothic lacks ✗/✎ → font substitution); bullets
   use "•" (safe) and colour to distinguish awarded vs not-awarded. */
function markingPanelDocx(q) {
  const kids = [];
  const gold = (text, opts) => P(R(text, Object.assign({ color: GOLD, size: 22 }, opts || {})), { spacing: { before: GAP_XS, after: GAP_XS } });
  // Section order (Patryk 2026-07-05): INDICATIVE CONTENT → BANDS → EXCLUSIONARY CLAIMS.
  kids.push(gold('INDICATIVE CONTENT', { bold: true, size: 24 }));
  // Chunk by ic.group when authors supply it (e.g. Substitution / Answer / Conversion).
  const items = arr(q.indicativeContent);
  const groups = [], byName = new Map();
  items.forEach((ic) => {
    const g = (ic && typeof ic === 'object' && ic.group) ? String(ic.group) : '';
    if (!byName.has(g)) { byName.set(g, []); groups.push(g); }
    byName.get(g).push(ic);
  });
  groups.forEach((g) => {
    if (g) kids.push(P(R(g.toUpperCase(), { bold: true, size: 20, color: 'FFE082' }), { spacing: { before: GAP_SM, after: GAP_XS }, indent: { left: 120 } }));
    byName.get(g).forEach((ic) => {
      const isObj = ic && typeof ic === 'object';
      const text = isObj ? ic.text : ic;
      const dep = isObj && ic.dependentOn ? `  (dependent on ${ic.dependentOn})` : '';
      kids.push(P([
        R('•  ', { bold: true, size: 22, color: GOLD }),
        ...markupToDocxRuns(prettyText(text), { size: 22, color: GOLD }),   // <u> = must-use word only
        ...(dep ? [R(dep, { italics: true, size: 18, color: 'FFE082' })] : []),
      ], { spacing: { before: GAP_XS, after: GAP_XS }, indent: { left: g ? 240 : 120 } }));
    });
  });
  arr(q.levelDescriptors).forEach((ld, i) => {
    if (i === 0) kids.push(gold('BANDS', { bold: true, size: 24 }));
    kids.push(P([
      R(`${ld.level || ''} (${ld.range || ''}):  `, { bold: true, size: 22, color: GOLD }),
      R(prettyText(ld.desc || ''), { size: 22, color: GOLD }),
    ], { spacing: { before: GAP_XS, after: GAP_SM } }));
  });
  arr(q.doesNotAward).forEach((dna, i) => {
    if (i === 0) kids.push(P(R('EXCLUSIONARY CLAIMS', { bold: true, size: 22, color: 'FF8A80' }), { spacing: { before: GAP_SM, after: GAP_XS } }));
    kids.push(P([R('•  ', { bold: true, size: 20, color: 'FF8A80' }), R(prettyText(dna), { size: 20, color: 'FFCDD2' })],
      { spacing: { before: GAP_XS, after: GAP_XS }, indent: { left: 120 } }));
  });
  if (q.ecfNote) kids.push(P([R('ECF:  ', { bold: true, size: 18, color: GOLD }), R(prettyText(q.ecfNote), { italics: true, size: 18, color: GOLD })], { spacing: { before: GAP_SM, after: GAP_XS } }));
  return [fullTable([new TableRow({
    children: [cell({ w: PAGE_W, fill: NAVY, margins: { top: 120, bottom: 120, left: 200, right: 200 }, children: kids })],
  })], [PAGE_W]), spacer()];
}

/* answerReveal(q, tier) — interleaved model answer under a question on the
   answer sheet, dispatched by answerFramework(q). */
function answerReveal(q, tier) {
  const fw = answerFramework(q);
  if (fw === 'guess') {
    return guessScaffold('answer', {
      given: q.given, unknown: q.unknown, equation: q.equation || q.equationHint,
      substitute: q.substitute, solve: q.solve != null ? q.solve : q.a,
    });
  }
  if (fw === 'indicative') return markingPanelDocx(q);
  if (fw === 'graph') return plainAnswerCallout((q.a || q.modelAnswer || '') + '  (see model graph on the slide)');
  return plainAnswerCallout(q.a || q.modelAnswer || '');
}

/* structureGuide(lines[]) — italic frames; "(a / b)" options grey */
function structureGuide(lines) {
  return arr(lines).map((l) => {
    const m = String(l).match(/^(.*?)(\([^()]*\/[^()]*\))\s*$/);
    const runs = m
      ? [R(m[1], { italic: true, size: 20 }), R(' ' + m[2], { size: 18, color: '555555' })]
      : [R(l, { italic: true, size: 20 })];
    return P(runs, { indent: { left: 360 }, spacing: { before: GAP_SM, after: GAP_SM } }); // M3
  });
}

/* sentenceStarters(starters[]) — gold left-border boxes */
function sentenceStarters(starters) {
  const rows = arr(starters).map((st) => new TableRow({
    children: [cell({
      w: PAGE_W, fill: 'FFFDE7',
      borders: { top: B_NONE, bottom: B_NONE, right: B_NONE, left: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
      margins: { top: 40, bottom: 40, left: 200, right: 120 },
      children: [P(R(st, { italic: true, size: 20, color: '555500' }))],
    })],
  }));
  return [fullTable(rows, [PAGE_W])];
}

/* bookletNavTable(rows[]) — Type C only */
function bookletNavTable(rows) {
  const colW = [1500, 5606, 3000];
  const heads = ['Test Question', 'Topic', 'Booklet Section'];
  const out = [new TableRow({
    children: heads.map((h, i) => cell({
      w: colW[i], fill: NAVY, borders: GREY_TBL, margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [P(R(h, { bold: true, size: 20, color: 'FFFFFF' }), { alignment: AlignmentType.CENTER })],
    })),
  })];
  arr(rows).forEach((r, i) => {
    const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
    const vals = [r.q || r.question || '', r.topic || '', r.section || ''];
    out.push(new TableRow({
      children: vals.map((v, ci) => cell({
        w: colW[ci], fill, borders: GREY_TBL, margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [P(R(v, { size: 18 }))],
      })),
    }));
  });
  return [spacer(), fullTable(out, colW, GREY_TBL), spacer()];
}

/* linksBar(text) — Type C only */
function linksBar(text) {
  return [fullTable([new TableRow({
    children: [cell({
      w: PAGE_W, fill: BG, margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [P(R(text, { italic: true, size: 22, color: NAVY }))],
    })],
  })], [PAGE_W]), spacer()];
}

/* sortTableDocx — grey borders, NOT gold */
function sortTableDocx(categories) {
  const cats = categories || { A: 'Group A', B: 'Group B' };
  const keys = Object.keys(cats);
  const colW = keys.map((_, i) => (i === keys.length - 1 ? PAGE_W - Math.floor(PAGE_W / keys.length) * (keys.length - 1) : Math.floor(PAGE_W / keys.length)));
  return [spacer(), fullTable([
    new TableRow({
      children: keys.map((k, i) => cell({
        w: colW[i], borders: GREY_TBL, margins: { top: 50, bottom: 50, left: 80, right: 80 },
        children: [P(R(cats[k], { bold: true, size: 20 }), { alignment: AlignmentType.CENTER })],
      })),
    }),
    new TableRow({
      children: colW.map((w) => cell({ w, borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 40, bottom: 40, left: 80, right: 80 }, children: blanks(7) })),
    }),
  ], colW, GREY_TBL), spacer()];
}

/* sectionLabel(text) — sub-section bar, softer than divider() */
function sectionLabel(text) {
  const leftB = { style: BorderStyle.SINGLE, size: 24, color: 'FFD700' };
  return [spacer(), new Table({
    width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: [PAGE_W], borders: NO_TBL_B,
    rows: [new TableRow({ children: [cell({ w: PAGE_W, fill: 'EEF1F8', borders: { ...NO_B, left: leftB }, margins: { top: 40, bottom: 40, left: 160, right: 80 }, children: [P(R(text, { bold: true, size: 24, color: '003366' }))] })] })],
  })];
}

/* clozeDocx(sentences[]) — gap-fill. Each sentence is a string with one or more
   "____" markers; rendered with an underlined blank space at each gap so students
   write a single word rather than copying a whole sentence. Pairs with a wordBank.
   For students who struggle with handwriting: minimises writing load. */
function clozeDocx(sentences) {
  return arr(sentences).map((sentence, i) => {
    const parts = String(sentence).split(/_{2,}/);
    const runs = [R(`${i + 1}.  `, { bold: true, size: 20 })];
    parts.forEach((part, j) => {
      if (part) runs.push(R(part, { size: 20 }));
      if (j < parts.length - 1) runs.push(R('\u2002__________\u2002', { size: 20, underline: {} }));
    });
    return P(runs, { spacing: { before: GAP_SM, after: GAP_SM } }); // M3
  });
}

/* definitionTable(terms[]) — two-column: term on the left, ruled write-space on the
   right for the definition. For students who struggle with handwriting, the space is
   ON the sheet so they don't copy the term into a book first. terms: [{term, hint?}] */
function definitionTable(terms) {
  const colW = [3000, PAGE_W - 3000];
  const rows = [new TableRow({
    children: [
      cell({ w: colW[0], fill: NAVY, borders: GREY_TBL, margins: { top: 50, bottom: 50, left: 100, right: 100 }, children: [P(R('Key term', { bold: true, size: 20, color: 'FFFFFF' }))] }),
      cell({ w: colW[1], fill: NAVY, borders: GREY_TBL, margins: { top: 50, bottom: 50, left: 100, right: 100 }, children: [P(R('What it means (write your definition here)', { bold: true, size: 20, color: 'FFFFFF' }))] }),
    ],
  })];
  arr(terms).forEach((t, i) => {
    const term = typeof t === 'string' ? t : (t.term || '');
    const leftKids = [P(R(term, { bold: true, size: 20 }))];
    rows.push(new TableRow({
      children: [
        cell({ w: colW[0], fill: i % 2 ? 'F5F5F5' : 'FFFFFF', borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: leftKids }),
        cell({ w: colW[1], fill: i % 2 ? 'F5F5F5' : 'FFFFFF', borders: GREY_TBL, valign: VerticalAlign.TOP, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: blanks(2) }),
      ],
    }));
  });
  return [spacer(), fullTable(rows, colW, GREY_TBL), spacer()];
}

/* writeLines(n) — hairline ruled lines for working space; support worksheet only.
   Callers must be wrapped in if (scaffolded). */
function writeLines(n) {
  const count = n || 2;
  const rows = Array.from({ length: count }, () => new TableRow({
    cantSplit: true,
    height: { value: 200, rule: HeightRule.EXACT },
    children: [cell({
      w: PAGE_W,
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' }, bottom: B_NONE, left: B_NONE, right: B_NONE },
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      children: [new Paragraph({})],
    })],
  }));
  return [fullTable(rows, [PAGE_W]), spacer()];
}

/* ---- Starfield header ------------------------------------------------------- */
// ponytail: PNG is always bundled in the skill package — Python regeneration was dead code
function getStarfield() {
  const candidates = [
    path.join(__dirname, 'starfield_header_FINAL.png'),
    path.join(__dirname, 'references', 'starfield_header_FINAL.png'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  console.warn('  ! starfield_header_FINAL.png not found — worksheet header image omitted');
  return null;
}

function worksheetHeader(L) {
  const out = [];
  const sf = getStarfield();
  if (sf) {
    out.push(new Paragraph({
      children: [new ImageRun({ data: fs.readFileSync(sf), transformation: { width: 674, height: 54 }, type: 'png' })],
      spacing: { after: GAP_MD }, // M2
    }));
  }
  // topic only — never class name, never Name/Class/Date
  out.push(P(R(L.meta.title || L.meta.topic || '', { bold: true, size: 36, color: NAVY }), { spacing: { after: GAP_MD } })); // M2
  return out;
}
