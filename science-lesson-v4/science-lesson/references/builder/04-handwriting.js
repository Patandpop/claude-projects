'use strict';
// build.js part 04-handwriting: handwriting (Caveat font, editable and picture versions), mark-tag highlights, font metrics, EOT conversion. Loaded by build.js in order; all parts share one scope.

/* ---- HANDWRITING ENGINE (M1) — shared by model-answer-review + correct-the-
   statement slide types. Each word gets its own tiny editable text box in
   Caveat, rotated/baseline-shifted per JITTER_PROFILES — real PPTX text, not
   a rasterised image, so it stays editable (M1/M2). */
function jitterFor(profileIdx, wordIdx) {
  const p = JITTER_PROFILES[Math.max(0, Math.min(JITTER_PROFILES.length - 1, profileIdx))];
  return { rot: p.rot[wordIdx % p.rot.length], base: p.base[wordIdx % p.base.length] };
}
/* ---- CAVEAT FONT FILE HELPERS (2026-10-02) --------------------------------
   Read the bundled Caveat TTF directly, so (1) it can be wrapped in the format
   PowerPoint actually loads from inside a .pptx, and (2) word spacing uses the
   font's real letter widths instead of a guess. */
function ttfTables(buf) {
  const tables = {};
  const n = buf.readUInt16BE(4);
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    tables[buf.toString('latin1', o, o + 4)] = { off: buf.readUInt32BE(o + 8), len: buf.readUInt32BE(o + 12) };
  }
  return tables;
}

/* ttfToEot(buf) — wrap a TrueType font in an uncompressed Embedded OpenType
   header (EOT v0x00020001). PowerPoint IGNORES a raw .ttf placed in
   ppt/fonts/*.fntdata and silently substitutes another font; wrapped like
   this it loads it (verified by PowerPoint export, golden render C-09,
   2026-10-02). Every header field is copied from the font's own OS/2, head
   and name tables. */
function ttfToEot(ttf) {
  const t = ttfTables(ttf);
  const os2 = t['OS/2'], head = t.head, name = t.name;
  if (!os2 || !head || !name) throw new Error('font is missing its OS/2, head or name table');
  const nameStr = (id) => {                      // Windows Unicode string, UTF-16BE → LE
    const count = ttf.readUInt16BE(name.off + 2), strOff = name.off + ttf.readUInt16BE(name.off + 4);
    let best = null;
    for (let i = 0; i < count; i++) {
      const r = name.off + 6 + i * 12;
      if (ttf.readUInt16BE(r) !== 3 || ttf.readUInt16BE(r + 2) !== 1 || ttf.readUInt16BE(r + 6) !== id) continue;
      const s = strOff + ttf.readUInt16BE(r + 10);
      if (!best || ttf.readUInt16BE(r + 4) === 0x409) best = ttf.subarray(s, s + ttf.readUInt16BE(r + 8));
    }
    const le = Buffer.from(best || Buffer.alloc(0));
    le.swap16();
    return le;
  };
  const fixed = Buffer.alloc(82);
  fixed.writeUInt32LE(0x00020001, 8);                                   // Version
  ttf.copy(fixed, 16, os2.off + 32, os2.off + 42);                      // PANOSE
  fixed.writeUInt8(1, 26);                                              // Charset: default
  fixed.writeUInt8(ttf.readUInt16BE(os2.off + 62) & 1, 27);             // Italic
  fixed.writeUInt32LE(ttf.readUInt16BE(os2.off + 4), 28);               // Weight
  fixed.writeUInt16LE(ttf.readUInt16BE(os2.off + 8), 32);               // fsType
  fixed.writeUInt16LE(0x504C, 34);                                      // Magic number
  for (let i = 0; i < 4; i++) fixed.writeUInt32LE(ttf.readUInt32BE(os2.off + 42 + i * 4), 36 + i * 4);
  if (ttf.readUInt16BE(os2.off) >= 1) {                                 // code page ranges (OS/2 v1+)
    fixed.writeUInt32LE(ttf.readUInt32BE(os2.off + 78), 52);
    fixed.writeUInt32LE(ttf.readUInt32BE(os2.off + 82), 56);
  }
  fixed.writeUInt32LE(ttf.readUInt32BE(head.off + 8), 60);              // checkSumAdjustment
  const parts = [fixed];
  [1, 2, 5, 4].forEach((id, i) => {             // family, style, version, full name
    const s = nameStr(id);
    const sz = Buffer.alloc(i === 0 ? 2 : 4);   // a 2-byte padding precedes every name after the first
    sz.writeUInt16LE(s.length, i === 0 ? 0 : 2);
    parts.push(sz, s);
  });
  parts.push(Buffer.alloc(4));                  // padding + empty root string
  const header = Buffer.concat(parts);
  header.writeUInt32LE(header.length + ttf.length, 0);                  // EOTSize
  header.writeUInt32LE(ttf.length, 4);                                  // FontDataSize
  return Buffer.concat([header, ttf]);
}

/* caveatMetrics() — advance width (in em) for any character, from the bold
   Caveat file's cmap (format 4) + hmtx tables. null when the font can't be
   read, in which case wordWidthIn falls back to the old flat estimate. */
let _caveatMetrics;
function caveatMetrics() {
  if (_caveatMetrics !== undefined) return _caveatMetrics;
  _caveatMetrics = null;
  try {
    const buf = fs.readFileSync(fs.existsSync(CAVEAT_BOLD_PATH) ? CAVEAT_BOLD_PATH : CAVEAT_REGULAR_PATH);
    const t = ttfTables(buf);
    const upm = buf.readUInt16BE(t.head.off + 18);
    const nHM = buf.readUInt16BE(t.hhea.off + 34);
    const adv = (g) => buf.readUInt16BE(t.hmtx.off + Math.min(g, nHM - 1) * 4);
    let sub = null;                              // first Unicode format-4 cmap subtable
    for (let i = 0; i < buf.readUInt16BE(t.cmap.off + 2); i++) {
      const r = t.cmap.off + 4 + i * 8;
      const plat = buf.readUInt16BE(r), enc = buf.readUInt16BE(r + 2);
      const so = t.cmap.off + buf.readUInt32BE(r + 4);
      if (((plat === 3 && enc === 1) || plat === 0) && buf.readUInt16BE(so) === 4) { sub = so; break; }
    }
    if (!sub) return _caveatMetrics;
    const seg = buf.readUInt16BE(sub + 6) / 2;
    const endA = sub + 14, startA = endA + seg * 2 + 2, deltaA = startA + seg * 2, rangeA = deltaA + seg * 2;
    const glyph = (c) => {
      for (let i = 0; i < seg; i++) {
        if (buf.readUInt16BE(endA + i * 2) < c) continue;
        const start = buf.readUInt16BE(startA + i * 2);
        if (start > c) return 0;
        const delta = buf.readUInt16BE(deltaA + i * 2), ro = buf.readUInt16BE(rangeA + i * 2);
        if (!ro) return (c + delta) & 0xFFFF;
        const g = buf.readUInt16BE(rangeA + i * 2 + ro + (c - start) * 2);
        return g ? (g + delta) & 0xFFFF : 0;
      }
      return 0;
    };
    const cache = new Map();
    _caveatMetrics = (ch) => {
      if (!cache.has(ch)) cache.set(ch, adv(glyph(ch.codePointAt(0))) / upm);
      return cache.get(ch);
    };
  } catch (e) {
    buildWarn(`could not read Caveat letter widths (${e.message || e}) — handwriting spacing uses a rough estimate`);
  }
  return _caveatMetrics;
}

/* wordWidthIn — width of one handwritten word INCLUDING the gap after it.
   2026-10-02: measured from the real Caveat glyph widths. The old flat
   estimate (CAVEAT_CPI) was roughly twice too wide for Caveat, which only
   became visible once PowerPoint finally displayed the real font: huge,
   uneven gaps between words. The gap is 1.4 spaces, a touch looser than
   typeset text, as handwriting is. */
function wordWidthIn(word, fontSize) {
  const m = caveatMetrics();
  if (!m) return (String(word).length * fontSize) / CAVEAT_CPI + 0.05;
  const em = [...String(word)].reduce((sum, ch) => sum + m(ch), 0) + 1.4 * m(' ');
  return (em * fontSize) / 72;
}
/* M3: per-item override, else lesson-wide L.meta.handwritingMode, else editable (default) */
function handwritingMode(L, item) {
  return (item && item.renderMode) || (L.meta && L.meta.handwritingMode) || 'editable';
}

/* layoutHandwriting(text, w, h, opts) — word-wraps text (string = one
   paragraph; array = each entry forced onto its own line, e.g. calculation
   steps) into a list of {word, x, y, rot} placements plus per-word jitter.
   Shared by both render paths below so layout logic exists exactly once. */
function layoutHandwriting(text, w, opts) {
  const o = opts || {};
  const fontSize = o.fontSize || 22;
  const profile = o.profile != null ? o.profile : 2;
  const baseLineH = (fontSize * 1.55) / 72;
  const paras = Array.isArray(text) ? text.map(String) : [String(text || '')];
  // mark circles (o.marks): the last word of each tagged span gets room for its circle
  const gap = markCircleD(fontSize) + 0.06;
  const gapAfter = (i) => (o.marks && o.marks[i] != null && o.marks[i + 1] !== o.marks[i] ? gap : 0);
  let gi = 0;
  const padX = 0.14, padTop = 0.12;
  const maxLineW = w - padX * 2;
  const lines = [];
  paras.forEach((para) => {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = [], curW = 0;
    words.forEach((word) => {
      const ww = wordWidthIn(word, fontSize) + gapAfter(gi++);
      if (curW + ww > maxLineW && cur.length) { lines.push(cur); cur = []; curW = 0; }
      cur.push(word); curW += ww;
    });
    lines.push(cur);
  });
  // Spread mode (RULED boxes only): when a box height is supplied, stretch the
  // line spacing so the working fills the whole box (no dead space / trailing
  // blank rules) and the baseline rules come out evenly parallel. Capped so
  // short answers don't sprawl.
  // Unruled boxes (correctTheStatement) keep natural spacing and are centred
  // vertically instead (2026-10-02): once the real, narrower Caveat was in use
  // most statements fit on one line, and spreading one line over the whole box
  // sank the words to the bottom edge with empty space above.
  let lineH = baseLineH;
  let top = padTop;
  if (o.boxH && lines.length) {
    if (o.ruled) {
      const avail = o.boxH - padTop * 2;
      lineH = Math.min(Math.max(baseLineH, avail / lines.length), baseLineH * 2.4);
    } else {
      top = Math.max(padTop, (o.boxH - lines.length * lineH) / 2);
    }
  }
  const placed = [];
  let wordIdx = 0;
  lines.forEach((line, li) => {
    let cx = padX;
    const cy = top + li * lineH;
    line.forEach((word) => {
      const ww = wordWidthIn(word, fontSize);
      const g = gapAfter(wordIdx);
      const { rot, base } = jitterFor(profile, wordIdx++);
      placed.push({ word, x: cx, y: cy + base, w: ww, rot });
      cx += ww + g;
    });
  });
  return { placed, lineH, padTop: top, lineCount: lines.length, usedH: top + lines.length * lineH };
}

/* handwritingBlockEditable — primary render path (M1/M2): each word is its
   own tiny editable PPTX text box in Caveat, rotated/baseline-shifted per
   JITTER_PROFILES. Real, editable text — not an image. */
function handwritingBlockEditable(slide, x, y, w, h, text, opts) {
  const o = opts || {};
  const fontSize = o.fontSize || 22;
  const color = o.color || '1A1A2E';
  if (o.fill !== false) {
    slide.addShape('rect', { x, y, w, h, fill: { color: o.bg || 'FFFFFF' }, line: o.line || GOLD2 });
  }
  const { placed, lineH, padTop, lineCount, usedH } = layoutHandwriting(text, w, Object.assign({ boxH: h }, o));
  drawMarkHighlights(slide, x, y, w, placed, lineH, o.marks, fontSize, 'bands');
  placed.forEach(({ word, x: wx, y: wy, w: ww, rot }) => {
    slide.addText(word, {
      x: x + wx, y: y + wy, w: ww + 0.14, h: lineH,
      fontFace: CAVEAT, fontSize, bold: true, color, rotate: rot,   // bold 2026-07-12: heavier stroke reads better from the back
      align: 'left', valign: 'bottom', margin: 0,
    });
  });
  if (o.ruled) {
    handwritingRuleYs(padTop, lineH, h).forEach((ry) => {
      slide.addShape('line', { x: x + 0.14, y: y + ry, w: w - 0.14 * 2 - 0.05, h: 0, line: { color: 'C9C9DC', width: 0.75 } });
    });
  }
  drawMarkHighlights(slide, x, y, w, placed, lineH, o.marks, fontSize, 'circles');
  return { usedH, lineCount };
}

/* handwritingRuleYs — box-relative y of each ruled line. Even baseline rules
   under every line, stepped by the (spread) line height, so the working sits
   on evenly parallel rules and fills the box (no trailing blanks). Shared by
   both render paths. */
function handwritingRuleYs(padTop, lineH, h) {
  const ys = [];
  for (let ly = padTop + lineH; ly < h - 0.04; ly += lineH) ys.push(ly);
  return ys;
}

/* callHandwritingPng(spec) — spawns handwriting_png.py (Pillow + the bundled
   Caveat TTF), returns a temp PNG path or null. Mirrors callGraphGen: same
   python command, temp files cleaned up after writeFile. */
function callHandwritingPng(spec) {
  try {
    const t = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const inP = path.join(os.tmpdir(), `hw_in_${t}.json`);
    const outP = path.join(os.tmpdir(), `hw_out_${t}.png`);
    const py = process.platform === 'win32' ? 'python' : 'python3';
    const fontPath = fs.existsSync(CAVEAT_BOLD_PATH) ? CAVEAT_BOLD_PATH : CAVEAT_REGULAR_PATH;
    fs.writeFileSync(inP, JSON.stringify(Object.assign({}, spec, { fontPath, dpi: 200, outPath: outP })));
    _tmpFiles.push(inP, outP);
    cp.execSync(`${py} "${path.join(__dirname, 'handwriting_png.py')}" "${inP}"`, { stdio: 'pipe' });
    return fs.existsSync(outP) ? outP : null;
  } catch (e) {
    console.error('[handwriting_png]', String((e.stderr && e.stderr.toString()) || e.message || e).trim());
    return null;
  }
}

/* handwritingBlockRaster — the picture route: the SAME word layout as the
   editable route, drawn into a real PNG by handwriting_png.py so it looks
   identical on any machine, any app, with no font install. Not editable on
   the slide (edit the lesson JSON and rebuild). Opt in per item with
   renderMode:'raster', or for a whole lesson with meta.handwritingMode.
   2026-10-02: replaces the old SVG version, which never worked in PowerPoint
   (its SVG renderer ignores @font-face, and pptxgenjs's companion ".png" was
   SVG text with the wrong extension, so there was no real fallback image).
   The gold box itself stays a native shape so its border matches the deck.
   If Python is unavailable, warns loudly and falls back to editable text. */
function handwritingBlockRaster(slide, x, y, w, h, text, opts) {
  const o = opts || {};
  const lay = layoutHandwriting(text, w, Object.assign({ boxH: h }, o));
  const png = callHandwritingPng({
    w, h, fontSize: o.fontSize || 22, color: o.color || '1A1A2E',
    lineH: lay.lineH, words: lay.placed,
    rules: o.ruled ? handwritingRuleYs(lay.padTop, lay.lineH, h) : [],
    ruleX0: 0.14, ruleX1: w - 0.19, ruleColor: 'C9C9DC',
  });
  if (!png) {
    buildWarn('picture handwriting could not be drawn (Python/Pillow) — editable handwriting shipped instead');
    return handwritingBlockEditable(slide, x, y, w, h, text, o);
  }
  if (o.fill !== false) {
    slide.addShape('rect', { x, y, w, h, fill: { color: o.bg || 'FFFFFF' }, line: o.line || GOLD2 });
  }
  slide.addImage({ path: png, x, y, w, h });
  drawMarkHighlights(slide, x, y, w, lay.placed, lay.lineH, o.marks, o.fontSize || 22, 'over');
  return { usedH: lay.usedH, lineCount: lay.lineCount };
}

/* Mark highlighting (Patryk 2026-10-12): show WHERE each mark came from. A tagged span of
   handwriting gets a see-through highlighter band in that mark's colour and a numbered circle
   after it; the mark-scheme point with the same number carries the same colour. "x" = a mark
   lost (red band, red cross). Six colours (2026-10-15: a 6-marker shows 6), ordered so each mark
   looks unlike the one before it: yellow, blue, pink, green, orange, purple. Cycle after 6.
   Circles and bands were made a little bigger and stronger the same day, to read from the back. */
const MARK_HI = ['FFF176', '90CAF9', 'F8BBD0', 'A5D6A7', 'FFCC80', 'CE93D8'];   // highlighter (light)
const MARK_INK = ['F9A825', '1565C0', 'AD1457', '2E7D32', 'EF6C00', '6A1B9A'];  // circle (dark)
const markCircleD = (fontSize) => Math.max(0.28, Math.min(0.40, (fontSize * 1.1) / 72));
const markSlot = (m, n) => (((Number(m) - 1) % n) + n) % n;   // mark 1 = first colour, whatever the list length
const markHi = (m) => (m === 'x' ? 'FFCDD2' : MARK_HI[markSlot(m, MARK_HI.length)]);
const markInk = (m) => (m === 'x' ? 'C62828' : MARK_INK[markSlot(m, MARK_INK.length)]);

/* parseMarkWords(text) — text (string, or array of lines) with {n}…{/n} tags →
   { text: same shape, tags removed and prettyText'd, marks: one entry per word in layout
   order (null = untagged) }. If prettyText changes the word count the marks can't be lined
   up, so they are dropped with a warning (the answer still renders). */
function parseMarkWords(text) {
  const lines = Array.isArray(text) ? text.map(String) : [String(text == null ? '' : text)];
  const marks = [];
  let open = null;
  const out = lines.map((raw) => {
    const words = [];
    raw.trim().split(/\s+/).filter(Boolean).forEach((tok) => {
      let mark = open, rest = '', last = 0, m;
      const re = new RegExp(MARK_TAG_RE.source, 'g');
      while ((m = re.exec(tok))) {
        rest += tok.slice(last, m.index); last = re.lastIndex;
        if (m[0][1] === '/') { if (rest.trim()) mark = open; open = null; }
        else { open = m[1]; mark = open; }
      }
      rest += tok.slice(last);
      if (rest.trim()) { words.push(rest); marks.push(mark); }
    });
    return words;
  });
  const pretty = out.map((ws) => prettyText(ws.join(' ')));
  const count = pretty.reduce((t, l) => t + l.trim().split(/\s+/).filter(Boolean).length, 0);
  const tagged = marks.some((m) => m != null);
  if (tagged && count !== marks.length) {
    buildWarn('mark highlights dropped on one answer (symbol tidy-up changed the word count)');
    return { text: Array.isArray(text) ? pretty : pretty[0], marks: null };
  }
  return { text: Array.isArray(text) ? pretty : pretty[0], marks: tagged ? marks : null };
}
const hasMarkTags = (t) => new RegExp(MARK_TAG_RE.source).test(Array.isArray(t) ? t.join(' ') : String(t || ''));

/* fitHandwritingFs — biggest handwriting size (max..min) whose words fit a w×h box, mark
   circles included. Used where the box size is decided by the layout, not the content. */
function fitHandwritingFs(text, w, h, max, min) {
  const pm = hasMarkTags(text) ? parseMarkWords(text) : { text, marks: null };
  for (let fs = max; fs > min; fs--) {
    if (layoutHandwriting(pm.text, w, { fontSize: fs, marks: pm.marks }).usedH + 0.1 <= h) return fs;
  }
  return min;
}
/* handwritingLines — how many lines the words wrap onto. */
function handwritingLines(text, w, fs) {
  const pm = hasMarkTags(text) ? parseMarkWords(text) : { text, marks: null };
  return layoutHandwriting(pm.text, w, { fontSize: fs, marks: pm.marks }).lineCount;
}
/* handwritingNeedH — height a handwriting block needs at a given size. */
function handwritingNeedH(text, w, fs) {
  const pm = hasMarkTags(text) ? parseMarkWords(text) : { text, marks: null };
  return layoutHandwriting(pm.text, w, { fontSize: fs, marks: pm.marks }).usedH + 0.16;
}

/* drawMarkHighlights — bands + circles for the placed words (layoutHandwriting order).
   behind=true draws only the bands (before the words); behind=false only the circles. */
function drawMarkHighlights(slide, x, y, w, placed, lineH, marks, fontSize, part) {
  if (!marks) return;
  const runs = [];                       // consecutive same-mark words on the same line
  placed.forEach((p, i) => {
    const m = marks[i];
    if (m == null) return;
    const prev = runs[runs.length - 1];
    if (prev && prev.m === m && prev.last === i - 1 && Math.abs(prev.y - p.y) < lineH * 0.5) {
      prev.x1 = p.x + p.w; prev.last = i;
    } else runs.push({ m, x0: p.x, x1: p.x + p.w, y: p.y, first: i, last: i });
  });
  const bandH = Math.min(lineH * 0.62, (fontSize * 1.05) / 72);
  runs.forEach((r, k) => {
    const next = runs[k + 1];
    const endOfSpan = !(next && next.m === r.m && next.first === r.last + 1);   // span wraps onto the next line
    if (part === 'bands' || part === 'over') {
      slide.addShape('rect', {
        x: x + r.x0 - 0.04, y: y + r.y + lineH - bandH - 0.02, w: r.x1 - r.x0 + 0.08, h: bandH,
        fill: { color: markHi(r.m), transparency: part === 'over' ? 35 : 0 }, line: { type: 'none' },
      });
    }
    if (part !== 'bands' && endOfSpan) {
      const d = markCircleD(fontSize);
      const cx = Math.min(x + r.x1 + 0.03, x + w - d - 0.02);
      slide.addText(r.m === 'x' ? '✗' : String(r.m), {
        shape: 'ellipse', x: cx, y: y + r.y + lineH - d - 0.02, w: d, h: d,
        fill: { color: markInk(r.m) }, line: { color: 'FFFFFF', width: 1 },
        color: 'FFFFFF', bold: true, fontFace: FONT, fontSize: Math.round(d * 72 * 0.55),
        align: 'center', valign: 'middle', margin: 0,
      });
    }
  });
}

/* handwritingBlock(x, y, w, h, text, opts) — public entry, dispatches on
   opts.mode ('editable' default, or 'raster' for the M3 fallback). Same
   signature/behaviour either way from the caller's point of view. */
function handwritingBlock(slide, x, y, w, h, text, opts) {
  let o = opts || {};
  if (hasMarkTags(text)) {                 // {1}…{/1} tags → highlighter bands + numbered circles
    const pm = parseMarkWords(text);
    text = pm.text; o = Object.assign({}, o, { marks: pm.marks });
  }
  return o.mode === 'raster'
    ? handwritingBlockRaster(slide, x, y, w, h, text, o)
    : handwritingBlockEditable(slide, x, y, w, h, text, o);
}

/* embedCaveatFont(pptxPath) (M2) — post-processes the written .pptx to embed
   Caveat so it displays correctly in PowerPoint without a local font install.
   Google Slides needs none of this (native Google Font there). Best-effort:
   on any failure, leaves the file untouched — text still carries
   fontFace:'Caveat' so an unpatched file just substitutes a fallback font.
   The fonts go in EOT-wrapped (ttfToEot): until 2026-10-02 they went in as
   raw .ttf, which PowerPoint ignored, so handwriting showed as plain sans. */
/* addRevealAnimations(pptxPath) — Patryk 2026-10-03: every navy/gold answer box appears as a
   WHOLE box on click, so he no longer adds the entrance animations by hand each morning.
   A reveal box = a shape filled house navy (0D1B5E) whose text includes gold (FABB2E) runs. That
   excludes the nav and bottom bars (white text) and the empty navy decoration (formula-triangle
   bars). Effect: "Appear", one click per box, in reading order (top to bottom, then left to right).
   animBg="1" makes the box and its text appear together. Appear is the simplest entrance effect
   and the one most likely to survive Google Slides' import. A slide that already has its own
   timing is left alone. Returns the number of boxes animated. */
/* Lesson quality A (2026-10-19): two finishing passes on the saved file, before the animations.
   goldUnderlines — key words ({k}) get a GOLD underline: pptxgenjs can only underline in the text
     colour, so the runs were tagged lang="en-001"; here the tag becomes en-GB plus <a:uFill>.
   answerYellow — Patryk's projector: answer text on navy is Y5 yellow (FFD60A), not gold, which
     washes out with the lights on. An answer box = navy fill whose text is mostly gold (the same
     test the reveal animations use); headers, titles and Learn slides keep gold. */
const ANSWER = 'FFD60A';
