'use strict';
// build.js part 08-slides-learn: Learn slides: all variants, flow diagrams (G/I), learnTopExtras (definitions, word parts), misconception box. Loaded by build.js in order; all parts share one scope.

/* ---- Learn G SVG builder — unified 3/4/5-step layouts ------------------- */
// All layouts approved by Patryk (2026-06-22). Coordinates final — do not adjust.
// ponytail: was 3 near-identical functions; unified into one with a layout table
const LEARN_G_LAYOUTS = {
  3: {
    viewBox: '0 0 700 440',
    B: [
      [15,  20,  210, 120, 41,  42,  143, 120, 77,  93 ],
      [245, 160, 210, 120, 271, 182, 373, 350, 217, 233],
      [475, 300, 210, 120, 501, 322, 603, 580, 357, 373],
    ],
    ARROWS: [
      'M 120,140 C 120,220 205,220 245,220',
      'M 350,280 C 350,360 435,360 475,360',
    ],
  },
  4: {
    viewBox: '0 0 680 330',
    B: [
      [10,  12,  252, 124, 36,  34,  159, 136, 69,  85 ],
      [418, 12,  252, 124, 444, 34,  567, 544, 69,  85 ],
      [10,  194, 252, 124, 36,  216, 159, 136, 251, 267],
      [418, 194, 252, 124, 444, 216, 567, 544, 251, 267],
    ],
    ARROWS: [
      'M 262,74 C 325,35 355,35 418,74',
      'M 504,129 C 460,175 220,155 174,201',
      'M 262,256 C 325,295 355,295 418,256',
    ],
  },
  5: {
    viewBox: '0 0 680 330',
    B: [
      [18,  18,  220, 110, 44,  40,  151, 128, 75,  91 ],
      [442, 18,  220, 110, 468, 40,  575, 552, 75,  91 ],
      [230, 108, 220, 114, 256, 130, 363, 340, 158, 174],
      [18,  205, 220, 110, 44,  227, 151, 128, 258, 274],
      [442, 205, 220, 110, 468, 227, 575, 552, 258, 274],
    ],
    ARROWS: [
      'M 238,73 C 280,40 390,40 440,73',
      'M 552,128 C 552,210 510,165 454,165',
      'M 230,162 C 155,108 128,170 128,203',
      'M 238,260 C 280,290 390,290 440,260',
    ],
  },
  // M1: 6-step snake — TL→TR→MR→ML→BL→BR, same bezier/gold style as 3/4/5
  6: {
    viewBox: '0 0 680 512',
    B: [
      [10,  12,  252, 124, 36,  34,  159, 136, 69,  85 ],   // TL
      [418, 12,  252, 124, 444, 34,  567, 544, 69,  85 ],   // TR
      [418, 194, 252, 124, 444, 216, 567, 544, 251, 267],   // MR
      [10,  194, 252, 124, 36,  216, 159, 136, 251, 267],   // ML
      [10,  376, 252, 124, 36,  398, 159, 136, 433, 449],   // BL
      [418, 376, 252, 124, 444, 398, 567, 544, 433, 449],   // BR
    ],
    // M3: gold bezier arrows — right / down / left / down / right
    ARROWS: [
      'M 262,74 C 325,50 355,50 418,74',        // TL→TR
      'M 544,136 C 570,155 570,173 544,194',    // TR→MR
      'M 418,256 C 355,278 325,278 262,256',    // MR→ML
      'M 136,318 C 110,337 110,357 136,376',    // ML→BL
      'M 262,438 C 325,415 355,415 418,438',    // BL→BR
    ],
  },
};

/* Bug 54 — native flow renderer. The step boxes / badges / arrows below are all
   real, editable PPTX shapes (was buildLearnGSvg, a single flattened image that
   clipped text and truncated notes). Geometry is LEARN_G_LAYOUTS above, unchanged
   — the approved zigzag. The tx/sx/sy1/sy2 columns of B and the SVG marker were
   only needed by the old rasteriser and are no longer read. */
function _flowViewBox(vb) { const n = String(vb).match(/-?\d+(?:\.\d+)?/g).map(Number); return [n[2], n[3]]; }
function _flowBezier(d) {
  const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  return { x0: n[0], y0: n[1], c1x: n[2], c1y: n[3], c2x: n[4], c2y: n[5], x1: n[6], y1: n[7] };
}

/* flowStepBox — one native step: navy roundRect + gold number badge + editable
   label/note. The badge sits over the top-left corner; the text box starts to
   the RIGHT of the badge so text can never overlap the number. Inch coords. */
/* numberBadge — the gold numbered circle used on flow steps and, since
   2026-07-12, on annotatedDiagram labels. (cx, cy) is the circle's centre. */
function numberBadge(slide, cx, cy, d, idx) {
  const BX = cx - d / 2, BY = cy - d / 2;
  slide.addShape('ellipse', { x: BX, y: BY, w: d, h: d, fill: { color: GOLD }, line: { type: 'none' } });
  txt(slide, String(idx + 1), { x: BX, y: BY, w: d, h: d, bold: true, color: NAVY2, fontSize: 15, align: 'center', valign: 'middle' });
}

function flowStepBox(slide, X, Y, W, H, bcx, bcy, idx, step) {
  slide.addShape('roundRect', { x: X, y: Y, w: W, h: H, rectRadius: 0.06, fill: { color: NAVY2 }, line: GOLD2 });
  const bd = 0.34, BX = bcx - bd / 2;
  const padL = Math.max(0.1, (BX + bd) - X + 0.06);
  const tX = X + padL, tW = Math.max(0.4, W - padL - 0.08);
  const label = String(step.label || ('Step ' + (idx + 1))), note = String(step.note || '');
  const runs = [{ text: label, options: { bold: true, color: 'FFFFFF', fontSize: autoFontSize(label, tW, H * 0.45, { min: 13, max: 19 }), breakLine: true, paraSpaceAfter: 4 } }];
  if (note) runs.push({ text: note, options: { italic: true, color: GOLD, fontSize: autoFontSize(note, tW, H * 0.55, { min: 10, max: 13 }) } });
  txt(slide, runs, { x: tX, y: Y + 0.04, w: tW, h: H - 0.08, align: 'left', valign: 'middle', margin: 3, fit: 'shrink' });
  numberBadge(slide, bcx, bcy, bd, idx);
}

/* flowArrow — native gold arrow between two points (INCHES). Straight line by
   default; pass ctrl=[c1x,c1y,c2x,c2y] (inches) + area={x,y,w,h} for a bezier
   arch rendered as an editable custom-geometry freeform. Shared by Learn-G
   (curved arches, from the approved beziers) and Learn-I (straight connectors). */
function flowArrow(slide, x0, y0, x1, y1, ctrl, area) {
  if (ctrl && area) {
    slide.addShape('custGeom', {
      x: area.x, y: area.y, w: area.w, h: area.h,
      points: [
        { x: x0 - area.x, y: y0 - area.y, moveTo: true },
        { x: x1 - area.x, y: y1 - area.y, curve: { type: 'cubic',
            x1: ctrl[0] - area.x, y1: ctrl[1] - area.y, x2: ctrl[2] - area.x, y2: ctrl[3] - area.y } },
      ],
      line: { color: GOLD, width: 2.5, endArrowType: 'triangle' },
    });
  } else {
    slide.addShape('line', {
      x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0),
      flipH: x1 < x0, flipV: y1 < y0, line: { color: GOLD, width: 2.5, endArrowType: 'triangle' },
    });
  }
}

/* renderLearnGFlow — draw the whole flow diagram natively into area {x,y,w,h}. */
function renderLearnGFlow(slide, steps, n, area) {
  const layout = LEARN_G_LAYOUTS[n];
  const [vbW, vbH] = _flowViewBox(layout.viewBox);
  const fx = (v) => area.x + (v / vbW) * area.w, fy = (v) => area.y + (v / vbH) * area.h;
  const fw = (v) => (v / vbW) * area.w, fh = (v) => (v / vbH) * area.h;
  layout.ARROWS.forEach((d) => {                 // arrows first — under the boxes
    const b = _flowBezier(d);
    flowArrow(slide, fx(b.x0), fy(b.y0), fx(b.x1), fy(b.y1),
      [fx(b.c1x), fy(b.c1y), fx(b.c2x), fy(b.c2y)], area);
  });
  layout.B.forEach((box, i) => {
    const [bx, by, bw, bh, cx, cy] = box;
    flowStepBox(slide, fx(bx), fy(by), fw(bw), fh(bh), fx(cx), fy(cy), i, steps[i] || {});
  });
}

/* ---- LEARN A–D ----------------------------------------------------------- */
/* ---- LEARN EXTRAS (Lesson quality A, Patryk's picks 2026-10-19) ---------------------------
   examDefinition {term, wording, board, asked}: "LEARN THIS WORDING" box; wording carries {1}…{/1}
     around each mark-earning part, drawn in the review mark colours (one per mark); the term is
     printed bold before it. The plain explanation goes in item.notes.
   definition {term, text, origin, examples[], notExamples[]}: white card with a gold edge (F4),
     plus green "Examples" / red "Not examples" boxes when given (F2).
   misconception {wrong, right}: "✗ Not quite" (crossed out) → "✓ Actually" (M7). */
function markedRuns(text, base) {
  const out = []; const re = /\{(\d)\}([\s\S]*?)\{\/\1\}/g; let last = 0, m;
  const s = String(text || '');
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: prettyText(s.slice(last, m.index)), options: Object.assign({}, base) });
    out.push({ text: prettyText(m[2]), options: Object.assign({}, base, { highlight: MARK_HI[(+m[1] - 1) % MARK_HI.length] }) });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ text: prettyText(s.slice(last)), options: Object.assign({}, base) });
  return out;
}
function learnTopExtras(s, item, y) {
  const ed = item.examDefinition, df = item.definition;
  if (ed && ed.wording) {
    const head = 0.34, words = stripMarkTags(ed.term + ' ' + ed.wording);
    const bodyH = Math.max(0.7, Math.min(1.3, 0.35 + Math.ceil(words.length / 70) * 0.36));
    s.addShape('rect', { x: MX, y, w: CW, h: head + bodyH, fill: { color: 'FFFFFF' }, line: { color: NAVY, width: 2 } });
    txt(s, 'LEARN THIS WORDING', { x: MX, y, w: CW, h: head, fill: { color: NAVY }, color: ANSWER, bold: true, fontSize: 12, charSpacing: 1, valign: 'middle', margin: 8 });
    if (ed.asked) txt(s, `${ed.board || 'AQA'}: asked ${ed.asked} time${ed.asked === 1 ? '' : 's'}`, { x: MX + CW - 3.2, y, w: 3.1, h: head, color: 'C9D3F2', fontSize: 11, align: 'right', valign: 'middle' });
    const fs = autoFontSize(words, CW - 0.2, bodyH, { min: 14, max: 22 });
    txt(s, [{ text: String(ed.term) + ' ', options: { bold: true, color: NAVY } }].concat(markedRuns(ed.wording, { color: '1A1A2E' })),
      { x: MX + 0.1, y: y + head, w: CW - 0.2, h: bodyH, fontSize: fs, valign: 'middle', fit: 'shrink' });
    return y + head + bodyH + GAP;
  }
  if (df && df.text) {
    // word parts (Patryk 2026-10-23): poly "many" + mer "part" → a chain of many parts; they replace the origin line
    const parts = arr(df.parts).filter((p) => p && p.part);
    const line = [{ text: String(df.term || '') + '  ', options: { bold: true, color: NAVY } }, { text: prettyText(df.text), options: { color: '1A1A2E' } }]
      .concat(df.origin && !parts.length ? [{ text: '   ' + prettyText(df.origin), options: { color: '666666', fontSize: 12, italic: true } }] : []);
    const ph = parts.length ? 0.44 : 0, h = 0.62 + ph;
    s.addShape('rect', { x: MX, y, w: CW, h, fill: { color: 'FFFFFF' }, line: { type: 'none' } });
    s.addShape('rect', { x: MX, y, w: 0.09, h, fill: { color: GOLD }, line: { type: 'none' } });
    txt(s, line, { x: MX + 0.18, y, w: CW - 0.25, h: 0.62, fontSize: autoFontSize(stripKeys(df.term + ' ' + df.text), CW - 0.25, 0.62, { min: 13, max: 19 }), valign: 'middle', fit: 'shrink' });
    if (parts.length) {
      let px = MX + 0.18;
      const py = y + 0.62, maxX = MX + CW - 0.1;
      parts.forEach((p, k) => {
        if (k) { txt(s, '+', { x: px, y: py, w: 0.3, h: 0.36, color: NAVY, bold: true, fontSize: 16, align: 'center', valign: 'middle' }); px += 0.3; }
        const cw = 0.3 + String(p.part).length * 0.14, mw = 0.25 + String(p.means || '').length * 0.11;
        if (px + cw + mw > maxX) return;
        txt(s, String(p.part), { x: px, y: py + 0.02, w: cw, h: 0.34, fill: { color: NAVY }, color: ANSWER, bold: true, fontSize: 15, align: 'center', valign: 'middle', rectRadius: 0.06, shape: 'roundRect' });
        txt(s, String(p.means || ''), { x: px + cw + 0.05, y: py, w: mw, h: 0.38, color: '1A1A2E', italic: true, fontSize: 14, valign: 'middle' });
        px += cw + 0.05 + mw;
      });
      if (df.sum && px + 1 < maxX) txt(s, '→  ' + prettyText(df.sum), { x: px + 0.1, y: py, w: maxX - px - 0.1, h: 0.38, color: NAVY, bold: true, fontSize: 14, valign: 'middle', fit: 'shrink' });
    }
    y += h + GAP;
    const ex = arr(df.examples), no = arr(df.notExamples);
    if (ex.length || no.length) {
      const bw = (CW - GAP) / 2, bh = 0.95;
      [[ex, 'Examples', '2E7D32'], [no, 'Not examples', 'C62828']].forEach(([list, head, col], i) => {
        if (!list.length) return;
        const bx = MX + i * (bw + GAP);
        txt(s, head, { x: bx, y, w: bw, h: 0.3, fill: { color: col }, color: 'FFFFFF', bold: true, fontSize: 12, valign: 'middle', margin: 6 });
        txt(s, prettyText(list.join('  \u00B7  ')), { x: bx, y: y + 0.3, w: bw, h: bh - 0.3, fill: { color: 'FFFFFF' }, line: { color: col, width: 1.5 }, color: '1A1A2E', fontSize: 14, valign: 'middle', fit: 'shrink', margin: 6 });
      });
      y += bh + GAP;
    }
  }
  return y;
}
function learnMisconception(s, mc, bottom) {
  const h = 1.0, aw = 0.5, bw = (CW - aw - 2 * GAP) / 2, y = bottom - h;
  txt(s, [{ text: '\u2717 Not quite', options: { bold: true, color: 'C62828', breakLine: true } },
          { text: prettyText(mc.wrong || ''), options: { color: '1A1A2E', strike: 'sngStrike' } }],
    { x: MX, y, w: bw, h, fill: { color: 'FFFFFF' }, line: { color: 'C62828', width: 1.5 }, fontSize: 18, valign: 'middle', margin: 8, fit: 'shrink' });
  txt(s, '\u2192', { x: MX + bw + GAP, y, w: aw, h, color: NAVY, bold: true, fontSize: 28, align: 'center', valign: 'middle' });
  txt(s, [{ text: '\u2713 Actually', options: { bold: true, color: '2E7D32', breakLine: true } },
          { text: prettyText(mc.right || ''), options: { color: '1A1A2E' } }],
    { x: MX + bw + aw + 2 * GAP, y, w: bw, h, fill: { color: 'FFFFFF' }, line: { color: '2E7D32', width: 1.5 }, fontSize: 18, valign: 'middle', margin: 8, fit: 'shrink' });
  return h;
}

function slideLearn(pptx, L, item) {
  const v = String(item.variant || 'A').toUpperCase();
  // Learn L, labelled picture (Part B 2026-10-23): drawn by learn-pictures.js, one item however many slides
  if (v === 'L' || v === 'LABELLED_PICTURE') return require('./learn-pictures.js').labelledPicture(pptx, L, item, {
    C: { BG, NAVY, STAGE, TOP, MX, CW, BOT_Y }, navBar, sectionHeader, bottomBar, objectiveText, stripStage, stripKeys, txt, addImageFit, imageOrPlaceholder, buildWarn });
  const map = { KEY_INFO: 'A', KEYWORDS: 'B', WRITE_IN_BOOK: 'B', REVISION_TABLE: 'C', IMAGE_COPY: 'D', COMPARISON_TABLE: 'E', EQUATION_CALLOUT: 'F', FLOW: 'G', SEQUENCE: 'G', VIDEO: 'H', FLOWCHART: 'I', GRAPH_SKETCH: 'J', TIMELINE: 'K' };
  const variant = map[v] || (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(v) ? v : 'A');
  const s = pptx.addSlide();
  s.background = { color: BG };
  navBar(s, 'learn');
  const obj = objectiveText(L);

  if (variant === 'A') {
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const bodyBottom = BOT_Y - 0.08;
    // 2026-10-14: no picture and no annotation zone → the boxes use the full width (was: an empty
    // right half), and up to 3 boxes fit. Box height is shared by the boxes actually drawn (was: a
    // 3rd box was dropped but still took its share, squashing the others).
    const noRight = item.imagePlaceholder === false && !item.annotationZone;
    const leftW = noRight ? CW : CW * 0.55, rightX = MX + leftW + 0.15, rightW = CW * 0.45 - 0.15;
    const boxes = (item.boxes || [{ header: item.heading || 'Key information', items: arr(item.body ? String(item.body).split('\n') : []) }]).slice(0, noRight ? 3 : 2);
    const kw = arr(item.keywords);
    const kwH = kw.length ? 1.0 : 0;
    // Lesson quality A: exam wording / definition card on top, misconception box at the bottom
    y = learnTopExtras(s, item, y);
    const misH = item.misconception ? learnMisconception(s, item.misconception, bodyBottom) + GAP : 0;
    const stackBottom = bodyBottom - misH;
    const stackH = stackBottom - y - (kwH ? kwH + GAP : 0);
    const each = (stackH - (boxes.length - 1) * GAP) / boxes.length;
    let by = y;
    boxes.forEach((b) => {
      navyHeaderBox(s, MX, by, leftW, b.header || 'Key information', arr(b.items), each);
      by += each + GAP;
    });
    if (kw.length) {
      navyHeaderBox(s, MX, stackBottom - kwH, leftW, 'Key terms:', [kw.join('  \u00B7  ')], kwH);
    }
    if (item.annotationZone) {
      annotationZone(s, rightX, y, rightW, Math.min(4.0, stackBottom - y));
    } else if (item.imagePlaceholder !== false) {
      imageOrPlaceholder(s, item, rightX, y, rightW, stackBottom - y);
    }
  }

  if (variant === 'B') {
    // Card-grid layout \u2014 each keyword in its own navy box with gold border.
    // Schema: { variant:'B', heading, definitions:[{term,definition,etymology?}], below:'content+image'|'image'|'two-column'|'none', boxes:[{header,items}] }
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN') + ' \u00B7 KEY WORDS').toUpperCase(), STAGE.learn, TOP);
    const defs = arr(item.definitions);
    const below = String(item.below || 'none');
    const boxes = arr(item.boxes);
    const hasBelow = below !== 'none' && (boxes.length || below === 'image');
    const availH = BOT_Y - 0.08 - y;
    const bandH = hasBelow ? Math.min(availH * 0.5, Math.max(1.0, defs.length * 0.42 + 0.35)) : availH;
    const belowY = y + bandH + GAP;
    const belowH = BOT_Y - 0.08 - belowY;
    const cols = defs.length <= 4 ? 2 : 3;
    const rows = Math.ceil(defs.length / cols);
    const gap = 0.1;
    const cardW = (CW - gap * (cols - 1)) / cols;
    const cardH = (bandH - gap * (rows - 1)) / rows;
    defs.forEach((d, i) => {
      const cx = MX + (i % cols) * (cardW + gap);
      const cy = y + Math.floor(i / cols) * (cardH + gap);
      const runs = [{ text: String(d.term || ''), options: { bold: true, color: GOLD, fontSize: 18, breakLine: true, paraSpaceAfter: 4 } },
                    { text: String(d.definition || ''), options: { color: 'FFFFFF', italic: true, fontSize: 13 } }];
      if (d.etymology) runs.push({ text: '\n' + String(d.etymology), options: { color: GOLD, italic: true, fontSize: 11 } });
      txt(s, runs, { x: cx, y: cy, w: cardW, h: cardH, fill: { color: NAVY }, line: GOLD2, fontSize: 13, align: 'left', valign: 'middle', margin: 10 });
    });
    if (hasBelow && belowH > 0.3) {
      if (below === 'image') {
        imageOrPlaceholder(s, item, MX, belowY, CW, belowH);
      } else if (below === 'two-column') {
        const colW = (CW - 0.15) / 2;
        boxes.slice(0, 2).forEach((b, bi) => navyHeaderBox(s, MX + bi * (colW + 0.15), belowY, colW, b.header || '', arr(b.items), belowH));
      } else {
        const leftW = CW * 0.55, rightX = MX + leftW + 0.15, rightW = CW - leftW - 0.15;
        if (boxes.length) navyHeaderBox(s, MX, belowY, leftW, boxes[0].header || '', arr(boxes[0].items), belowH);
        imageOrPlaceholder(s, item, rightX, belowY, rightW, belowH);
      }
    }
  }

  if (variant === 'C') {
    let y = purplePenBar(s, TOP);
    const hasCore = arr(item.corePaper).length, hasExt = arr(item.extendPaper).length;
    // Header: navy fill / gold title (house style — the green header read as off).
    // few rows: bigger text so the table reads from the back (it used to sit in 10pt at the top)
    const fsFor = (n) => (n <= 5 ? 18 : n <= 8 ? 14 : 10);
    const mk = (rows, x, w, title) => {
      const fs = fsFor(Math.max(arr(item.corePaper).length, arr(item.extendPaper).length) * (hasCore && hasExt ? 1.5 : 1));
      const trows = [[{ text: title, options: { fill: { color: NAVY }, color: GOLD, bold: true, fontSize: fs + 2, align: 'center', colspan: 2 } }],
        [{ text: 'Question', options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: fs } },
         { text: 'Support pages', options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: fs } }]]
        .concat(arr(rows).map((r, i) => {
          const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
          return [{ text: r.q || '', options: { fill: { color: fill }, fontSize: fs } },
                  { text: pagesOnly(r.pages), options: { fill: { color: fill }, fontSize: fs, align: 'center' } }];
        }));
      table(s, trows, { x, y, w, colW: [w * 0.72, w * 0.28], fontFace: FONT, border: { type: 'solid', pt: 0.5, color: 'BBBBBB' }, margin: 0.04, autoPage: false });
    };
    // Bug 56: two tiers → side-by-side; a single tier → one full-width table (no forced blank column).
    if (hasCore && hasExt) {
      const colW = (CW - 0.2) / 2;
      mk(item.corePaper, MX, colW, 'CORE PAPER');
      mk(item.extendPaper, MX + colW + 0.2, colW, 'CHALLENGE PAPER');
    } else if (hasCore || hasExt) {
      mk(hasCore ? item.corePaper : item.extendPaper, MX, CW, hasCore ? 'CORE PAPER' : 'CHALLENGE PAPER');
    }
  }

  if (variant === 'D') {
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN') + ' (Copy into your book)').toUpperCase(), STAGE.learn, TOP);
    goldBox(s, MX, y, CW, 0.55, '\u261E  ' + (item.instruction || 'Copy this diagram into your book.'), { bold: true, fontSize: 13, valign: 'middle' });
    y += 0.55 + GAP;
    const ih = BOT_Y - 0.08 - y - (item.tip ? 0.35 : 0);
    const imgX = MX + (CW - 5.4) / 2;
    imageOrPlaceholder(s, item, imgX, y, 5.4, ih);
    if (item.tip) {
      txt(s, item.tip, { x: MX, y: BOT_Y - 0.43, w: CW, h: 0.3, fontSize: 10, color: '555555', align: 'center' });
    }
  }

  if (variant === 'E') {
    // Comparison table \u2014 two-column contrast layout.
    // Use for: series vs parallel, mitosis vs meiosis, speed vs velocity, acids vs alkalis, etc.
    // Schema: item.comparison = { aTitle, bTitle, rows: [{a, b}] }
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const cmp = item.comparison || {};
    const aTitle = String(cmp.aTitle || 'A').toUpperCase();
    const bTitle = String(cmp.bTitle || 'B').toUpperCase();
    const cmpRows = arr(cmp.rows);
    const headerH = 0.42;
    const colW = (CW - 0.15) / 2;
    txt(s, aTitle, { x: MX, y, w: colW, h: headerH, fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 16, align: 'center', valign: 'middle' });
    txt(s, bTitle, { x: MX + colW + 0.15, y, w: colW, h: headerH, fill: { color: STAGE.build }, color: 'FFFFFF', bold: true, fontSize: 16, align: 'center', valign: 'middle' });
    y += headerH + 0.06;
    const cmpAvail = BOT_Y - 0.08 - y - (cmpRows.length - 1) * 0.06;
    // Fill the slide like Do Now: floor keeps many-row tables legible, generous
    // ceiling lets a 2-3 row comparison expand instead of leaving the bottom empty.
    const rowH = Math.max(0.7, Math.min(1.8, cmpAvail / Math.max(1, cmpRows.length)));
    const cmpBlockH = cmpRows.length * rowH + (cmpRows.length - 1) * 0.06;
    let cy = y + Math.max(0, (cmpAvail - cmpBlockH) / 2);
    cmpRows.forEach((r, i) => {
      const fill = i % 2 ? 'F5F5F5' : 'FFFFFF';
      // 2026-10-22: rows grow into their space (was a fixed 14pt: 7MLA animal cells table read small)
      const fs = Math.min(...[r.a, r.b].map((t) => autoFontSize(String(t || ''), colW - 0.15, rowH, { min: 14, max: 22 })));
      goldBox(s, MX, cy, colW, rowH, String(r.a || ''), { fill, fontSize: fs, valign: 'middle' });
      goldBox(s, MX + colW + 0.15, cy, colW, rowH, String(r.b || ''), { fill, fontSize: fs, valign: 'middle' });
      cy += rowH + 0.06;
    });
  }

  if (variant === 'F') {
    // Equation callout \u2014 large equation box + per-component breakdown + optional rearrangements.
    // Use for any lesson introducing a new equation (V=IR, F=ma, E=Pt, etc.).
    // Schema: item.equation, item.components=[{symbol,name,unit}], item.rearrangements?[], item.example?
    let y = sectionHeader(s, ('LEARN \u00B7 ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const eqH = 1.0;
    const twinEqs = arr(item.equations).slice(0, 2); // E7/M4: twin guard — at most two items
    if (twinEqs.length === 2) {
      // E7/M3: two side-by-side equation boxes of equal width
      const eqW = (CW - 0.12) / 2;
      twinEqs.forEach((eq, i) => {
        const eqSegs = parseEq(eq);
        const eqX = MX + i * (eqW + 0.12);
        // Bug 33/53 phase 3: true stacked fraction as native shapes; diagonal fallback
        if (!renderEqShapes(s, eqSegs, { x: eqX, y, w: eqW, h: eqH, fill: { color: '152347' }, line: GOLD2 }, { fontSize: 28, color: GOLD, bold: true })) {
          txt(s, toPptxRuns(eqSegs, { fontSize: 28, color: GOLD, bold: true }), {
            x: eqX, y, w: eqW, h: eqH, fill: { color: '152347' }, line: GOLD2,
            align: 'center', valign: 'middle',
          });
        }
      });
    } else {
      // M4: single equation — Bug 33/53 phase 3: stacked fraction, diagonal fallback
      const eqSegs = parseEq(item.equation || '');
      if (!renderEqShapes(s, eqSegs, { x: MX, y, w: CW, h: eqH, fill: { color: '152347' }, line: GOLD2 }, { fontSize: 28, color: GOLD, bold: true })) {
        txt(s, toPptxRuns(eqSegs, {fontSize:28, color:GOLD, bold:true}), {
          x: MX, y, w: CW, h: eqH, fill: { color: '152347' }, line: GOLD2,
          align: 'center', valign: 'middle',
        });
      }
    }
    y += eqH + GAP;
    const comps = arr(item.components);
    const rears = arr(item.rearrangements);
    if (comps.length) {
      const cols = comps.length <= 4 ? comps.length : Math.ceil(comps.length / 2);
      const rows = Math.ceil(comps.length / cols);
      const availForComps = BOT_Y - 0.08 - y
        - (rears.length ? 0.65 + GAP : 0)
        - (item.example ? 0.7 + GAP : 0);
      const compH = Math.max(1.05, (availForComps - (rows - 1) * 0.12) / rows);
      comps.forEach((c, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const isLastRow = row === rows - 1;
        const thisRowCount = isLastRow ? comps.length - (rows - 1) * cols : cols;
        const thisW = (CW - (thisRowCount - 1) * 0.12) / thisRowCount;
        const cx = MX + col * (thisW + 0.12);
        const cy = y + row * (compH + 0.12);
        const symRuns = toPptxRuns(parseEq(String(c.symbol||'')), {fontSize:24,color:GOLD,bold:true});
        if (symRuns.length) symRuns[symRuns.length-1].options = Object.assign({}, symRuns[symRuns.length-1].options, {breakLine:true});
        goldBox(s, cx, cy, thisW, compH, [
          ...symRuns,
          { text: String(c.name || ''), options: { fontSize: 17, color: 'FFFFFF', breakLine: true } },
          { text: prettyText(String(c.unit || '')), options: { fontSize: 15, italic: true, color: 'AABBD0' } }, // Bug 61: m/s^2 → m/s²
        ], { fill: '152347', valign: 'middle', align: 'center' });
      });
      y += rows * compH + (rows - 1) * 0.12 + GAP;
    }
    if (rears.length) {
      const rearH = 0.65;
      const rearW = (CW - (rears.length - 1) * 0.12) / rears.length;
      rears.forEach((r, i) => {
        goldBox(s, MX + i * (rearW + 0.12), y, rearW, rearH, toPptxRuns(parseEq(String(r)), {fontSize:20,bold:true}), { align: 'center', valign: 'middle', fill: BG });
      });
      y += rearH + GAP;
    }
    if (item.example) {
      const expH = BOT_Y - 0.08 - y;
      if (expH > 0.3) {
        const exFs = autoFontSize('Example:  ' + item.example, CW, expH, { min: 20, max: 32 });
        goldBox(s, MX, y, CW, expH, [
          { text: 'Example:  ', options: { bold: true, fontSize: exFs, color: NAVY } },
          { text: item.example, options: { fontSize: exFs } },
        ], { valign: 'top' });
      }
    }
  }

  if (variant === 'G') {
    // Flow / sequence — zigzag/W-pattern fills slide vertically. Max 6 steps.
    // Use for: rock cycle, digestive system, nitrogen cycle, any causal chain.
    let y = sectionHeader(s, ('LEARN · ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const steps = arr(item.steps).slice(0, 6);
    const n = steps.length;
    if (n) {
      const availH = BOT_Y - 0.08 - y;
      if (n >= 3) {
        // Bug 54: native shapes + editable text (was a flattened SVG image).
        renderLearnGFlow(s, steps, n, { x: MX, y, w: CW, h: availH });
      } else {
        // 1/2 steps: DEFS grid with text-arrow connectors
        const ARR = 0.28;
        // [rows, cols, [[row,col]...]] keyed by step count; 3+ handled by SVG branch above
        const DEFS = {
          1: [1, 1, [[0,0]]],
          2: [1, 2, [[0,0],[0,1]]],
        };
        const [nRows, nCols, pos] = DEFS[n];
        const cellW = CW / nCols, cellH = availH / nRows;
        const bw = cellW - ARR, bh = cellH - ARR;
        const bX = (c) => MX + c * cellW + ARR / 2;
        const bY = (r) => y + r * cellH + ARR / 2;
        const cX = (c) => bX(c) + bw / 2;
        const cY = (r) => bY(r) + bh / 2;
        const arrowCh = (r1, c1, r2, c2) => {
          const dr = r2 - r1, dc = c2 - c1;
          if (dr === 0) return dc > 0 ? '→' : '←';
          if (dc === 0) return dr > 0 ? '↓' : '↑';
          return dr > 0 ? (dc > 0 ? '↘' : '↙') : (dc > 0 ? '↗' : '↖');
        };
        for (let i = 0; i < n - 1; i++) {
          const [r1, c1] = pos[i], [r2, c2] = pos[i + 1];
          txt(s, arrowCh(r1, c1, r2, c2), {
            x: (cX(c1) + cX(c2)) / 2 - ARR / 2, y: (cY(r1) + cY(r2)) / 2 - ARR / 2,
            w: ARR, h: ARR, fontSize: 18, color: GOLD, align: 'center', valign: 'middle',
          });
        }
        pos.forEach(([r, c], i) => {
          const step = steps[i];
          const fs = autoFontSize(String(step.label || '') + '  ' + String(step.note || ''), bw, bh, { min: 12, max: 22 });
          goldBox(s, bX(c), bY(r), bw, bh, [
            { text: String(step.label || ''), options: { bold: true, fontSize: fs, breakLine: true, paraSpaceAfter: 8 } },
            { text: String(step.note || ''), options: { italic: true, fontSize: Math.max(10, fs - 3), color: 'AABBD0' } },
          ], { fill: '152347', valign: 'middle', align: 'center' });
        });
      }
    }
  }

  if (variant === 'H') {
    // Video — left: link + watching bullets + optional prompt; right: image placeholder.
    // Questions appear on the WORKSHEET ONLY (videoQSection in buildWorksheetChildren), never here.
    const leftW = CW * 0.56;
    const rightX = MX + leftW + 0.15;
    const rightW = CW - leftW - 0.15;
    let y = sectionHeader(s, ('LEARN · VIDEO · ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const startY = y;
    const vl = item.videoLink || {};
    const videoH = 0.55;
    goldBox(s, MX, y, leftW, videoH, [
      { text: '►  ', options: { color: TEAL, bold: true } },
      { text: vl.text || 'Watch the video', options: { color: TEAL, underline: true, hyperlink: vl.url ? { url: vl.url } : undefined } },
    ], { fontSize: 13, valign: 'middle' });
    y += videoH + GAP;
    const toWatch = arr(item.toWatch);
    const promptH = item.prompt ? 0.55 : 0;
    const watchH = BOT_Y - 0.08 - y - (promptH ? promptH + GAP : 0);
    const watchRuns = [
      { text: '☞  While watching:', options: { bold: true, color: NAVY, fontSize: 13, breakLine: true, paraSpaceAfter: 8 } },
      ...toWatch.map(w => ({ text: '•  ' + String(w), options: { fontSize: 12, breakLine: true, paraSpaceAfter: 6 } })),
    ];
    goldBox(s, MX, y, leftW, watchH, watchRuns, { valign: 'top' });
    if (item.prompt) {
      goldBox(s, MX, BOT_Y - 0.08 - promptH, leftW, promptH, '⏸  ' + item.prompt, { italic: true, fontSize: 12, valign: 'middle' });
    }
    imageOrPlaceholder(s, item, rightX, startY, rightW, BOT_Y - 0.08 - startY);
    // Answer slide — show after students complete worksheet video questions
    const hqs = arr(item.questions).filter(q => typeof q === 'object' && q.a);
    if (hqs.length) {
      const as = pptx.addSlide();
      as.background = { color: BG };
      navBar(as, 'learn');
      let ay = sectionHeader(as, 'LEARN · VIDEO QUESTIONS: ANSWERS', STAGE.learn, TOP);
      ay = purplePenBar(as, ay - GAP + 0.02);
      const rh = (BOT_Y - 0.08 - ay - (hqs.length - 1) * 0.06) / hqs.length;
      hqs.forEach(q => { reviewRow(as, ay, rh, null, q.q || '', q.a || ''); ay += rh + 0.06; });
      bottomBar(as, obj);
    }
  }

  if (variant === 'I') {
    // Flowchart — vertical (default) or horizontal step nodes with arrows.
    // Schema: { variant:'I', heading, nodes:[{label,note?}], orientation:'vertical'|'horizontal', cycle? }
    let y = sectionHeader(s, ('LEARN · ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const nodes = arr(item.nodes).slice(0, 6);
    const orient = String(item.orientation || 'vertical').toLowerCase();
    if (nodes.length) {
      const arrowSz = 0.3;
      if (orient === 'horizontal') {
        const nodeW = (CW - (nodes.length - 1) * arrowSz) / nodes.length;
        const nodeH = Math.min(2.0, (BOT_Y - 0.08 - y) * 0.75);
        const nodeY = y + (BOT_Y - 0.08 - y - nodeH) / 2;
        nodes.forEach((n, i) => {
          const nx = MX + i * (nodeW + arrowSz);
          goldBox(s, nx, nodeY, nodeW, nodeH, [
            { text: String(n.label || ''), options: { bold: true, fontSize: 13, color: GOLD, breakLine: true, paraSpaceAfter: 6 } },
            { text: String(n.note || ''), options: { italic: true, fontSize: 11, color: 'AABBD0' } },
          ], { fill: NAVY, valign: 'middle', align: 'center' });
          if (i < nodes.length - 1) {           // Bug 54: native gold arrow, not a glyph
            const acy = nodeY + nodeH / 2;
            flowArrow(s, nx + nodeW + 0.04, acy, nx + nodeW + arrowSz - 0.04, acy);
          }
        });
        if (item.cycle) {                         // native return arch over the top, last → first
          const firstCX = MX + nodeW / 2;
          const lastCX = MX + (nodes.length - 1) * (nodeW + arrowSz) + nodeW / 2;
          const archH = Math.min(0.45, Math.max(0.15, nodeY - y));
          flowArrow(s, lastCX, nodeY, firstCX, nodeY,
            [lastCX, nodeY - archH, firstCX, nodeY - archH],
            { x: firstCX, y: nodeY - archH, w: lastCX - firstCX, h: archH });
          txt(s, 'cycle', { x: MX, y: nodeY + nodeH + 0.04, w: CW, h: 0.28, fontSize: 12, color: TEAL, italic: true, align: 'center', valign: 'middle' });
        }
      } else {
        const availH = BOT_Y - 0.08 - y;
        const nodeH = Math.max(0.55, (availH - (nodes.length - 1) * arrowSz) / nodes.length);
        const totalH = nodes.length * nodeH + (nodes.length - 1) * arrowSz;
        const nodeW = CW * 0.6;
        const nodeX = MX + (CW - nodeW) / 2;
        const startNy = y + Math.max(0, (availH - totalH) / 2);
        let ny = startNy;
        nodes.forEach((n, i) => {
          goldBox(s, nodeX, ny, nodeW, nodeH, [
            { text: String(n.label || ''), options: { bold: true, fontSize: 13, color: GOLD, breakLine: true, paraSpaceAfter: 4 } },
            { text: String(n.note || ''), options: { italic: true, fontSize: 11, color: 'AABBD0' } },
          ], { fill: NAVY, valign: 'middle', align: 'center' });
          if (i < nodes.length - 1) {           // Bug 54: native gold arrow, not a glyph
            const acx = nodeX + nodeW / 2;
            flowArrow(s, acx, ny + nodeH + 0.03, acx, ny + nodeH + arrowSz - 0.03);
          }
          ny += nodeH + arrowSz;
        });
        if (item.cycle) {                         // native return arch up the left, last → first
          const firstCY = startNy + nodeH / 2;
          const lastCY = startNy + totalH - nodeH / 2;
          const bulge = Math.min(0.55, Math.max(0.2, nodeX - MX));
          flowArrow(s, nodeX, lastCY, nodeX, firstCY,
            [nodeX - bulge, lastCY, nodeX - bulge, firstCY],
            { x: nodeX - bulge, y: startNy, w: nodeW + bulge, h: totalH });
          txt(s, 'cycle continues', { x: MX, y: ny, w: CW, h: 0.28, fontSize: 12, color: TEAL, italic: true, align: 'center', valign: 'middle' });
        }
      }
    }
  }

  if (variant === 'J') {
    // Graph sketch — image/axes left, annotated feature list right.
    // Schema: { variant:'J', heading, axes:{x,y}, features:[{label,description}], instruction? }
    let y = sectionHeader(s, ('LEARN · ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const leftW = CW * 0.52, rightX = MX + leftW + 0.15, rightW = CW - leftW - 0.15;
    const availH = BOT_Y - 0.08 - y;
    const axes = item.axes || {};
    let imgY = y;
    if (axes.x || axes.y) {
      const axH = 0.32;
      goldBox(s, MX, y, leftW, axH, [
        ...(axes.y ? [{ text: String(axes.y), options: { bold: true, fontSize: 11, color: NAVY } }, { text: '  │  ', options: { fontSize: 11, color: '999999' } }] : []),
        ...(axes.x ? [{ text: String(axes.x), options: { bold: true, fontSize: 11, color: NAVY } }] : []),
      ], { fill: 'F0F4FF', valign: 'middle' });
      imgY = y + axH + 0.05;
    }
    imageOrPlaceholder(s, item, MX, imgY, leftW, BOT_Y - 0.08 - imgY);
    const features = arr(item.features);
    if (features.length) {
      const eachH = (availH - (features.length - 1) * GAP) / features.length;
      const clampH = Math.min(1.6, Math.max(0.5, eachH));
      const totalH = features.length * clampH + (features.length - 1) * GAP;
      let fy = y + Math.max(0, (availH - totalH) / 2);
      features.forEach((f) => {
        goldBox(s, rightX, fy, rightW, clampH, [
          { text: String(f.label || ''), options: { bold: true, fontSize: 12, color: NAVY, breakLine: true, paraSpaceAfter: 4 } },
          { text: String(f.description || ''), options: { fontSize: 11 } },
        ], { fill: 'F0F4FF', valign: 'top' });
        fy += clampH + GAP;
      });
    } else if (item.instruction) {
      goldBox(s, rightX, y, rightW, availH, item.instruction, { italic: true, fontSize: 12, color: NAVY, valign: 'middle' });
    }
  }

  if (variant === 'K') {
    // Timeline — horizontal chronological with alternating above/below event boxes. Max 8 events.
    // Schema: { variant:'K', heading, events:[{year,label,detail?}] }
    let y = sectionHeader(s, ('LEARN · ' + stripStage(item.heading || item.title || L.meta.topic, 'LEARN')).toUpperCase(), STAGE.learn, TOP);
    const events = arr(item.events).slice(0, 8);
    if (events.length) {
      const availH = BOT_Y - 0.08 - y;
      const lineY = y + availH * 0.5 - 0.03;
      s.addShape('rect', { x: MX, y: lineY, w: CW, h: 0.06, fill: { color: NAVY }, line: { type: 'none' } });
      const stepW = CW / events.length;
      // Box width now scales with however much room a low event count actually leaves per
      // step, instead of capping at a fixed 1.55" that strands dead space either side.
      const boxW = Math.min(2.4, stepW - 0.3);
      // spare: 0 at the old 1.55" baseline, 1 at the new 2.4" cap — used to scale box height
      // and font sizes together so a roomy 2-3 event timeline doesn't look under-filled.
      const spare = Math.max(0, Math.min(1, (boxW - 1.55) / (2.4 - 1.55)));
      const boxH = availH * 0.36 * (1 + spare * 0.15);
      const fsScale = 1 + spare * 0.4;
      const tickH = availH * 0.07;
      const markerR = 0.08 + spare * 0.05;
      events.forEach((ev, i) => {
        const cx = MX + i * stepW + stepW / 2;
        const bx = cx - boxW / 2;
        const above = i % 2 === 0;
        const tickY = above ? lineY - tickH : lineY + 0.06;
        const by = above ? lineY - tickH - boxH : lineY + 0.06 + tickH;
        s.addShape('rect', { x: cx - 0.02, y: tickY, w: 0.04, h: tickH, fill: { color: GOLD }, line: { type: 'none' } });
        // Stronger visual anchor than the old thin tick — gold circle matching the Do Now
        // question-number motif used elsewhere in the deck.
        s.addShape('ellipse', { x: cx - markerR, y: lineY + 0.03 - markerR, w: markerR * 2, h: markerR * 2, fill: { color: GOLD }, line: { color: NAVY, width: 1 } });
        goldBox(s, bx, by, boxW, boxH, [
          { text: String(ev.year || ''), options: { bold: true, fontSize: Math.round(11 * fsScale), color: TEAL, breakLine: true, paraSpaceAfter: 2 } },
          { text: String(ev.label || ''), options: { bold: true, fontSize: Math.round(11 * fsScale), color: NAVY, breakLine: true, paraSpaceAfter: 2 } },
          { text: String(ev.detail || ''), options: { fontSize: Math.round(10 * fsScale), color: '555555' } },
        ], { fill: 'FFFFFF', valign: 'top' });
        // 2026-07-08 request: each event can carry its own image — it renders on the
        // OPPOSITE side of the timeline from the event box (that space was empty),
        // with the usual suggested-search placeholder when only a description exists.
        if (ev.embeddedImagePath || ev.imageDescription) {
          const imgH2 = Math.min(boxH, availH * 0.32);
          const iy = above ? lineY + 0.06 + tickH : lineY - tickH - imgH2;
          imageOrPlaceholder(s, ev, bx, iy, boxW, imgH2);
        }
      });
    }
  }

  if (item.notes) s.addNotes(stripKeys(item.notes));               // Lesson quality A: what Patryk says
  bottomBar(s, obj);
}
