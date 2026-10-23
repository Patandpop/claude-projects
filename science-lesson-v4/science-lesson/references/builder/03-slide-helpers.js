'use strict';
// build.js part 03-slide-helpers: slide drawing helpers: txt, keySplit, table, navBar, bottomBar, sectionHeader, goldBox, autoFontSize, navyHeaderBox, images, buildWarn. Loaded by build.js in order; all parts share one scope.

/* =========================================================================
   PPTX RENDERER FUNCTIONS — defined once, called by name everywhere
   ========================================================================= */

function txt(slide, content, o) {
  slide.addText(proseMathRuns(content, o && o.fontSize, o && o.color), Object.assign({ fontFace: FONT }, o));
}

/* proseMathRuns(content) — every slide text box passes through here (via txt), so
   maths shorthand typesets in ANY field: real super/subscript runs in the box's own
   font (Patryk 2026-10-03). Runs that are already equations (Cambria Math from
   toPptxRuns) or already raised/lowered are left exactly as they are. */
/* Key words (Lesson quality A, Patryk 2026-10-19, style 2): {k}word{/k} = bold, gold underline.
   On a light box the word is navy; on a dark box it keeps the box's light colour. pptxgenjs can't
   colour an underline, so the run is tagged lang="en-001" and finishText() adds the gold
   underline to the saved file (then puts the language back to en-GB). */
const KEY_RE = /\{k\}([\s\S]*?)\{\/k\}/g;
const KEY_LANG = 'en-001';
const stripKeys = (s) => String(s == null ? '' : s).replace(KEY_RE, '$1');
const isLight = (c) => /^(FFFFFF|FFF|FFD60A|FABB2E|F9A825|C9D3F2)$/i.test(String(c || ''));
function keySplit(text) {
  if (typeof text !== 'string' || !text.includes('{k}')) return null;
  const out = []; let last = 0, m;
  KEY_RE.lastIndex = 0;
  while ((m = KEY_RE.exec(text))) {
    if (m.index > last) out.push({ v: text.slice(last, m.index), key: false });
    out.push({ v: m[1], key: true });
    last = KEY_RE.lastIndex;
  }
  if (last < text.length) out.push({ v: text.slice(last), key: false });
  return out;
}
function keyOpts(base) {
  return { bold: true, underline: { style: 'sng' }, lang: KEY_LANG, color: isLight(base && base.color) ? base.color : NAVY };
}

function proseMathRuns(content, boxSize, boxColor) {
  const toRuns = (text, opts) => {
    const ks = keySplit(text);
    if (ks) {                                                    // key words: split, then maths per piece
      const base = Object.assign(boxColor ? { color: boxColor } : {}, opts || {});
      const runs = ks.flatMap((k) => {
        const o = Object.assign({}, base, { breakLine: false }, k.key ? keyOpts(base) : {});
        return toRuns(k.v, o) || [{ text: k.v, options: o }];
      });
      runs[runs.length - 1].options.breakLine = !!base.breakLine;
      runs.forEach(r => { if (!r.options.breakLine) delete r.options.breakLine; });
      return runs;
    }
    const segs = proseMathSegs(text);
    if (!segs) return null;
    const base = opts || {};
    const runs = segs.map(sg => ({
      text: sg.v,
      options: Object.assign({}, base, { breakLine: false },
        sg.t !== 'text' && { fontSize: Math.round((base.fontSize || boxSize || 18) * SCRIPT_SCALE) },
        sg.t === 'sup' && { superscript: true }, sg.t === 'sub' && { subscript: true }),
    }));
    // A line break belongs after the LAST piece only, never mid-equation.
    runs[runs.length - 1].options.breakLine = !!base.breakLine;
    runs.forEach(r => { if (!r.options.breakLine) delete r.options.breakLine; });
    return runs;
  };
  if (typeof content === 'string') return toRuns(content) || content;
  if (!Array.isArray(content)) return content;
  return content.flatMap(run => {
    if (!run || typeof run.text !== 'string') return [run];
    const op = run.options || {};
    if (op.fontFace === FONT_MATH || op.superscript || op.subscript) return [run];
    return toRuns(run.text, op) || [run];
  });
}

/* table(slide, rows, opts) — addTable with the same maths pass on every cell
   (Learn A boxes, Learn C revision tables, reference data are tables, not txt()). */
function table(slide, rows, opts) {
  const cellMath = (cell) => {
    const size = (cell && cell.options && cell.options.fontSize) || (opts && opts.fontSize);
    const col = (cell && cell.options && cell.options.color) || (opts && opts.color);
    if (typeof cell === 'string') return (proseMathSegs(cell) || keySplit(cell)) ? { text: proseMathRuns(cell, size, col) } : cell;
    if (cell && cell.text != null) return Object.assign({}, cell, { text: proseMathRuns(cell.text, size, col) });
    return cell;
  };
  slide.addTable(rows.map(r => r.map(cellMath)), opts);
}

/* navBar(stage) — 6 equal tabs, TOP strip. Active = stage fill + WHITE text. */
function navBar(slide, stage) {
  const tabs = ['donow', 'engage', 'learn', 'build', 'apply', 'review'];
  const tw = SW / 6;
  tabs.forEach((t, i) => {
    const active = t === stage;
    txt(slide, STAGE_LABEL[t], {
      x: i * tw, y: 0, w: tw, h: NAV_H,
      fill: { color: active ? STAGE[t] : NAVY2 },
      color: 'FFFFFF',                                  // never gold
      bold: active, fontSize: active ? 11 : 10,
      align: 'center', valign: 'middle',
    });
  });
  slide.addShape('rect', { x: 0, y: NAV_H, w: SW, h: ACC_H, fill: { color: GOLD }, line: { type: 'none' } });
}

/* bottomBar(objectiveText) */
function bottomBar(slide, objective) {
  txt(slide, [
    { text: 'Learning objective:  ', options: { bold: true } },
    { text: objective || '', options: { italic: true } },
  ], {
    x: 0, y: BOT_Y, w: SW, h: BOT_H, fill: { color: NAVY },
    color: 'FFFFFF', fontSize: 11, align: 'left', valign: 'middle', margin: 8,
  });
}

/* purplePenBar() */
function purplePenBar(slide, y) {
  txt(slide, '\u261E  Purple pen time \u00B7 mark and correct your answers', {
    x: 0, y, w: SW, h: 0.38, fill: { color: PURPLE_PEN },
    color: 'FFFFFF', bold: true, fontSize: 13, align: 'left', valign: 'middle', margin: 8,
  });
  return y + 0.38 + GAP;
}

/* sectionHeader(text, colour) — returns next y */
function sectionHeader(slide, text, colour, y, runs, big) {
  // big: the test-review question bars (Patryk 2026-10-15: clearer and slightly bigger)
  const h = big ? 0.5 : 0.38;
  txt(slide, runs || text, {
    x: 0, y, w: SW, h, fill: { color: colour },
    color: 'FFFFFF', bold: true, fontSize: big ? 17 : 13, align: runs ? 'left' : 'center',
    valign: 'middle', margin: 8,
  });
  return y + h + GAP;
}

/* lessonBookRef(L) — "Read more — [book] pp. X–Y" for a lesson's Apply section,
   or '' when nothing matches. Auto-matched from meta year/subject/topic +
   title.keywords; meta.textbookRef overrides ("B3.4" | [codes] | {book,pages} |
   "none"). Wrapped so a bad index never breaks a build. */
function lessonBookRef(L) {
  try {
    const meta = (L && L.meta) || {}, title = (L && L.title) || {};
    const m = TBIDX.resolve({
      year: meta.year, subject: meta.subject || meta.theme,
      topic: meta.topic || meta.title, keywords: title.keywords,
      override: meta.textbookRef,
    });
    return m ? 'Read more: ' + TBIDX.formatRef(m) : '';
  } catch (e) {
    buildWarn(`textbook reference lookup failed (${e.message || e}) — Apply slide/worksheet ships without a page ref`);
    return '';
  }
}

/* goldBox(x, y, w, h, content, opts?) — white fill, gold 2pt border */
function goldBox(slide, x, y, w, h, content, opts) {
  const o = opts || {};
  txt(slide, content, {
    x, y, w, h,
    fill: { color: o.fill || 'FFFFFF' },
    line: o.line || GOLD2,
    color: o.color || '1A1A2E',
    fontSize: o.fontSize || 13,
    bold: !!o.bold, italic: !!o.italic,
    align: o.align || 'left', valign: o.valign || 'top',
    margin: o.margin != null ? o.margin : 6,
    fit: o.fit || 'shrink',
    hyperlink: o.hyperlink,
    underline: o.underline,
  });
}

/* flattenText — extract plain string from runs array or plain string */
function flattenText(t) {
  if (typeof t === 'string') return stripKeys(t);
  if (Array.isArray(t)) return stripKeys(t.map((r) => (typeof r === 'string' ? r : r.text || '')).join(''));
  return stripKeys(String(t || ''));
}

/* autoFontSize — largest font size that fits text in a box of w×h inches.
   Model: Trebuchet MS ~120 char·pt per inch of width; line height 1.4× font size.
   Always pair with fit:'shrink' as a fallback for estimation error. */
function autoFontSize(text, w, h, { min = 10, max = 28, linesHint } = {}) {
  const s = flattenText(text).trim();
  if (!s) return max;
  for (let fs = max; fs >= min; fs--) {
    const cpl = Math.max(1, Math.floor((w * 120) / fs));
    const n = linesHint != null ? linesHint : Math.ceil(s.length / cpl);
    if ((n * fs * 1.4) / 72 <= h * 0.85) return fs;
  }
  return min;
}

/* fitListFont(lines, w, h, min, max) — biggest size at which a bulleted list (one item per
   paragraph, 6pt after each) fits the box. Same width model as autoFontSize. */
function fitListFont(lines, w, h, min, max) {
  for (let fs = max; fs >= min; fs--) {
    const cpl = Math.max(1, Math.floor((w * 120) / fs));
    const n = lines.reduce((t, l) => t + Math.max(1, Math.ceil(flattenText(l).length / cpl)), 0);
    if ((n * fs * 1.4 + lines.length * 6) / 72 <= h * 0.85) return fs;
  }
  return min;
}

/* navyHeaderBox(x, y, w, headerText, bodyLines[]) — one table shape */
function navyHeaderBox(slide, x, y, w, headerText, bodyLines, bodyH) {
  const border = [{ type: 'solid', pt: 2, color: GOLD }, { type: 'solid', pt: 2, color: GOLD },
                  { type: 'solid', pt: 2, color: GOLD }, { type: 'solid', pt: 2, color: GOLD }];
  const bodyText = arr(bodyLines).map((l, i) => ({
    text: String(l), options: { breakLine: true, paraSpaceAfter: 4 },
  }));
  table(slide, [
    [{ text: headerText, options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, fontSize: 22, border, valign: 'middle' } }],
    [{ text: bodyText, options: { fill: { color: 'FFFFFF' }, color: '1A1A2E', fontSize: autoFontSize(arr(bodyLines).join(' '), w, Math.max(0.4, (bodyH || 1.2) - 0.65), { min: 11, max: 20 }), border, valign: 'top' } }],
  ], { x, y, w, colW: [w], rowH: [0.65, Math.max(0.4, (bodyH || 1.2) - 0.65)], fontFace: FONT, margin: 0.06, autoPage: false });
}

/* imagePlaceholder(x, y, w, h, description?) */
function imagePlaceholder(slide, x, y, w, h, description) {
  // Always prefer a concrete suggestion of WHAT to insert. The generic fallback
  // still asks for a specific thing rather than the bare "teacher inserts".
  const label = description
    ? `[Paste image. Suggested search: ${description}]`
    : '[Image: add imageDescription to JSON]';
  txt(slide, label, {
    x, y, w, h, fill: { color: 'D0D0D0' },
    line: { color: '999999', width: 1, dashType: 'dash' },
    color: '666666', italic: true, fontSize: 11, align: 'center', valign: 'middle',
  });
}

/* BUILD WARNINGS (2026-07-12) — degraded-output collector. Any failure that
   used to be swallowed (image embed, handwriting font, textbook lookup) now
   logs "⚠ BUILD WARNING" immediately and is counted per lesson so a build that
   "succeeded" but shipped a worse file says so out loud. Never blocks. */
const BUILD_WARNS = [];
function buildWarn(msg) {
  BUILD_WARNS.push(msg);
  console.error(`  ⚠ BUILD WARNING: ${msg}`);
}
function flushBuildWarns(name) {
  const n = BUILD_WARNS.length;
  if (n) console.error(`  ⚠ ${n} build warning(s) on "${name}" — output is degraded, see lines above`);
  BUILD_WARNS.length = 0;
  return n;
}

/* imageOrPlaceholder(item, x, y, w, h) — embed the lesson's real image when one
   was matched (imageConfidence 'search' + embeddedImagePath), else a
   description-aware grey placeholder. Single source of truth so a slide type can
   never again forget to pass item.imageDescription (Bug 58 regression — variants
   H and J were calling imagePlaceholder without it). A promised image that is
   missing or unreadable now warns loudly instead of degrading silently. */
/* imagePixelSize(file) — width/height in pixels read from the file header (PNG, JPEG, GIF,
   BMP), or null. 2026-10-12: pictures were being stretched to the shape of their box. */
function imagePixelSize(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b.length > 10 && b.toString('ascii', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
    if (b.length > 26 && b.toString('ascii', 0, 2) === 'BM') return { w: b.readInt32LE(18), h: Math.abs(b.readInt32LE(22)) };
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch (_) { /* unreadable: caller falls back to the box */ }
  return null;
}
/* addImageFit — the picture as large as the box allows, its own shape kept, centred in the box. */
function addImageFit(slide, file, x, y, w, h) {
  const px = imagePixelSize(file);
  if (!px || !px.w || !px.h) { slide.addImage({ path: file, x, y, w, h }); return { x, y, w, h }; }
  const s = Math.min(w / px.w, h / px.h);
  const iw = px.w * s, ih = px.h * s;
  const box = { x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih };
  slide.addImage({ path: file, ...box });
  return box;
}

function imageOrPlaceholder(slide, item, x, y, w, h) {
  if (item && item.imageConfidence === 'search' && item.embeddedImagePath) {
    if (fs.existsSync(item.embeddedImagePath)) {
      try {
        addImageFit(slide, item.embeddedImagePath, x, y, w, h);
        return;
      } catch (e) {
        buildWarn(`image embed failed, grey placeholder shipped instead (${item.embeddedImagePath}): ${e.message || e}`);
      }
    } else {
      buildWarn(`image file NOT FOUND, grey placeholder shipped instead: ${item.embeddedImagePath}`);
    }
  } else if (item && item.embeddedImagePath) {
    // 2026-10-23: a picture given with another imageConfidence ("school") was silently left out
    buildWarn(`picture NOT embedded (imageConfidence is "${item.imageConfidence || ''}", must be "search"): ${item.embeddedImagePath}`);
  }
  imagePlaceholder(slide, x, y, w, h, (item && item.imageDescription) || null);
}

/* annotationZone — dashed gold, "worked live" label. Immovable. */
function annotationZone(slide, x, y, w, h) {
  slide.addShape('rect', { x, y, w: w || 5.5, h: h || 4.0, fill: { color: 'FFFFFF' }, line: GOLD_DASH });
  txt(slide, 'worked live', {
    x: x + 0.05, y: y + 0.03, w: 1.2, h: 0.25,
    color: '9E9E9E', fontSize: 9, align: 'left', valign: 'top',
  });
}
