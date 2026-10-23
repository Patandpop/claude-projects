'use strict';
/* learn-pictures.js — Learn slides where the PICTURE carries the explanation (Lesson quality Part B,
   Patryk 2026-10-22/23). Kept out of build.js so the 6,000-line builder does not grow; build.js hands
   variant "L" here with its own drawing helpers (H).

   Learn variant L, "labelled picture" (his X2 / D1 choices):
     { "variant": "L", "heading": "The animal cell", "embeddedImagePath": "...", "imageConfidence": "search",
       "labels": [ { "text": "nucleus", "job": "controls the cell", "sentence": "The nucleus holds the genes.", "x": 0.345, "y": 0.465 } ],
       "build": true }
   x, y = where the part is, as fractions of the IMAGE (0 left/top to 1 right/bottom). Measure them with
   label_points.py and look at its check image before building.
   build (default true): one slide per label in order. The current part has a yellow ring and its label
   opens to show its sentence; the others are grey but still joined to their parts. The last slide shows
   every label, for pupils to copy. build: false = only that last slide. All of it is ONE Learn item. */

const Y5 = 'FFD60A';                       // answer yellow on the projector (build.js answerYellow)
const GREY = '9E9E9E', INK = '263238', NAVY_T = '0D1B5E';
const LW = 2.75;                           // label column width (inches)
const LH = 0.62, LH_OPEN = 1.25;           // label heights: closed (term + job), open (plus the sentence)

/* Where everything goes, as plain numbers (tested on its own). box = the drawn picture, area = the
   space for the columns. Returns [{ i, side, pt:{x,y}, rect:{x,y,w,h}, end:{x,y} }]: end = where the
   line leaves the label; pt = the exact point on the picture. Each column is stacked in the order of
   its points (top to bottom), every label as close to its point's height as it can be without overlap. */
function layout(labels, box, area, openIdx) {
  const out = labels.map((l, i) => ({ i, side: l.x < 0.5 ? 'L' : 'R', pt: { x: box.x + l.x * box.w, y: box.y + l.y * box.h }, h: i === openIdx ? LH_OPEN : LH }));
  for (const side of ['L', 'R']) {
    const col = out.filter((o) => o.side === side).sort((a, b) => a.pt.y - b.pt.y);
    const x = side === 'L' ? area.x : area.x + area.w - LW;
    const gap = 0.1, top = area.y, bottom = area.y + area.h;
    let y = top;
    col.forEach((o) => { o.y = Math.max(y, o.pt.y - o.h / 2); y = o.y + o.h + gap; });
    // too low: push the column back up from the bottom, keeping the order
    let lim = bottom;
    for (let k = col.length - 1; k >= 0; k--) { const o = col[k]; if (o.y + o.h > lim) o.y = lim - o.h; lim = o.y - gap; }
    // still above the top (too many labels): squeeze evenly
    if (col.length && col[0].y < top) {
      const total = col.reduce((n, o) => n + o.h, 0), g = Math.max(0.02, (area.h - total) / Math.max(1, col.length - 1));
      let yy = top; col.forEach((o) => { o.y = yy; yy += o.h + g; });
    }
    col.forEach((o) => { o.rect = { x, y: o.y, w: LW, h: o.h }; o.end = { x: side === 'L' ? x + LW : x, y: o.y + Math.min(o.h, LH) / 2 }; });
  }
  return out.map(({ i, side, pt, rect, end }) => ({ i, side, pt, rect, end }));
}

function line(s, a, b, color, width) {
  s.addShape('line', { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y),
    flipH: b.x < a.x, flipV: b.y < a.y, line: { color, width } });
}

function labelledPicture(pptx, L, item, H) {
  const C = H.C;
  const labels = (Array.isArray(item.labels) ? item.labels : []).filter((l) => l && l.text && isFinite(l.x) && isFinite(l.y));
  const file = item.embeddedImagePath;
  const have = item.imageConfidence === 'search' && file && require('fs').existsSync(file);
  if (!have) H.buildWarn(`Learn L "${item.heading || ''}": picture not found (${file || 'no embeddedImagePath'}), grey placeholder and no labels`);
  if (!labels.length) H.buildWarn(`Learn L "${item.heading || ''}": no labels with text, x and y`);
  const steps = item.build === false || !labels.length || !have ? [null] : labels.map((_, i) => i).concat([null]);
  const obj = H.objectiveText(L);
  steps.forEach((cur) => {
    const s = pptx.addSlide();
    s.background = { color: C.BG };
    H.navBar(s, 'learn');
    const head = 'LEARN · ' + H.stripStage(item.heading || L.meta.topic, 'LEARN') + (cur != null ? '  (' + (cur + 1) + ' of ' + labels.length + ')' : '');
    const y = H.sectionHeader(s, head.toUpperCase(), C.STAGE.learn, C.TOP);
    const area = { x: C.MX, y, w: C.CW, h: C.BOT_Y - 0.12 - y };
    const pic = { x: area.x + LW + 0.35, y: area.y, w: area.w - 2 * (LW + 0.35), h: area.h };
    if (!have) { H.imageOrPlaceholder(s, item, pic.x, pic.y, pic.w, pic.h); H.bottomBar(s, obj); return; }
    const box = H.addImageFit(s, file, pic.x, pic.y, pic.w, pic.h);
    layout(labels, box, area, cur).forEach((o) => {
      const l = labels[o.i], grey = cur != null && o.i !== cur, open = o.i === cur;
      const lc = grey ? GREY : C.NAVY;
      line(s, o.end, o.pt, lc, open ? 2.5 : 1.5);
      s.addShape('ellipse', { x: o.pt.x - 0.05, y: o.pt.y - 0.05, w: 0.1, h: 0.1, fill: { color: lc }, line: { type: 'none' } });
      if (open) s.addShape('ellipse', { x: o.pt.x - 0.24, y: o.pt.y - 0.24, w: 0.48, h: 0.48, fill: { type: 'none' }, line: { color: Y5, width: 4 } });
      const r = o.rect;
      s.addShape('rect', { x: r.x, y: r.y, w: r.w, h: r.h, fill: { color: open ? C.NAVY : 'FFFFFF' }, line: { color: lc, width: open ? 2 : 1.25 } });
      H.txt(s, [{ text: l.text, options: { bold: true, fontSize: 15, color: open ? Y5 : grey ? GREY : NAVY_T, breakLine: true } },
        { text: l.job || '', options: { fontSize: 11.5, color: open ? 'FFFFFF' : grey ? GREY : INK, breakLine: !!open } },
        ...(open && l.sentence ? [{ text: l.sentence, options: { fontSize: 12, color: 'FFFFFF', italic: false } }] : [])],
      { x: r.x, y: r.y, w: r.w, h: r.h, valign: 'top', margin: 5, fit: 'shrink' });
    });
    const notes = cur != null ? (labels[cur].sentence || labels[cur].job || '') : [labels.map((l) => l.text + ': ' + (l.sentence || l.job || '')).join('\n'), item.notes || ''].filter(Boolean).join('\n\n');
    if (notes) s.addNotes(H.stripKeys(notes));
    H.bottomBar(s, obj);
  });
  return steps.length;
}

module.exports = { labelledPicture, layout, LW, LH, LH_OPEN };
