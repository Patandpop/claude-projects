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
const LWP = 2.3;                           // the shared middle column of a photo + model pair
const LH = 0.62, LH_OPEN = 1.25;           // label heights: closed (term + job), open (plus the sentence)

/* Where everything goes, as plain numbers (tested on its own). box = the drawn picture, area = the
   space for the columns. Returns [{ i, side, pt:{x,y}, rect:{x,y,w,h}, end:{x,y} }]: end = where the
   line leaves the label; pt = the exact point on the picture. Each column is stacked in the order of
   its points (top to bottom), every label as close to its point's height as it can be without overlap. */
// One column of labels: each as close to its wanted height (o.want, the centre) as it can be, in order,
// never overlapping, all between top and bottom. Sets o.y.
function stack(col, top, bottom, keepOrder) {
  const gap = 0.1;
  if (!keepOrder) col.sort((a, b) => a.want - b.want);
  let y = top;
  col.forEach((o) => { o.y = Math.max(y, o.want - o.h / 2); y = o.y + o.h + gap; });
  // too low: push the column back up from the bottom, keeping the order
  let lim = bottom;
  for (let k = col.length - 1; k >= 0; k--) { const o = col[k]; if (o.y + o.h > lim) o.y = lim - o.h; lim = o.y - gap; }
  // still above the top (too many labels): squeeze evenly
  if (col.length && col[0].y < top) {
    const total = col.reduce((n, o) => n + o.h, 0), g = Math.max(0.02, (bottom - top - total) / Math.max(1, col.length - 1));
    let yy = top; col.forEach((o) => { o.y = yy; yy += o.h + g; });
  }
}
function layout(labels, box, area, openIdx) {
  const out = labels.map((l, i) => ({ i, side: l.x < 0.5 ? 'L' : 'R', pt: { x: box.x + l.x * box.w, y: box.y + l.y * box.h }, h: i === openIdx ? LH_OPEN : LH }));
  out.forEach((o) => { o.want = o.pt.y; });
  for (const side of ['L', 'R']) {
    const col = out.filter((o) => o.side === side);
    const x = side === 'L' ? area.x : area.x + area.w - LW;
    stack(col, area.y, area.y + area.h);
    col.forEach((o) => { o.rect = { x, y: o.y, w: LW, h: o.h }; o.end = { x: side === 'L' ? x + LW : x, y: o.y + Math.min(o.h, LH) / 2 }; });
  }
  return out.map(({ i, side, pt, rect, end }) => ({ i, side, pt, rect, end }));
}
/* Photo + model (his D8): two pictures with ONE column of shared labels between them; each label has a
   line to the part in each picture. labels[k].left / .right = { x, y } fractions of that picture (either
   may be missing: that label then points at one picture only). Returns [{ i, rect, lines: [{ end, pt }] }]. */
function layoutPair(labels, boxL, boxR, col, openIdx) {
  const P = (b, p) => (p && isFinite(p.x) && isFinite(p.y) ? { x: b.x + p.x * b.w, y: b.y + p.y * b.h } : null);
  const out = labels.map((l, i) => {
    const a = P(boxL, l.left), b = P(boxR, l.right), ys = [a, b].filter(Boolean).map((p) => p.y);
    return { i, a, b, h: i === openIdx ? LH_OPEN : LH, want: ys.reduce((n, y) => n + y, 0) / Math.max(1, ys.length) };
  });
  // the parts are often in a different order in the two pictures: try every label order (up to 7 labels)
  // and keep the one whose lines cross least, then the shortest lines
  const place = (order) => {
    stack(order, col.y, col.y + col.h, true);
    return order.map((o) => {
      const rect = { x: col.x, y: o.y, w: col.w, h: o.h }, my = o.y + Math.min(o.h, LH) / 2;
      return { i: o.i, rect, lines: [o.a && { end: { x: col.x, y: my }, pt: o.a }, o.b && { end: { x: col.x + col.w, y: my }, pt: o.b }].filter(Boolean) };
    });
  };
  const score = (pl) => {
    const segs = pl.flatMap((p) => p.lines);
    let cross = 0, len = 0;
    segs.forEach((s, k) => { len += Math.hypot(s.pt.x - s.end.x, s.pt.y - s.end.y); for (let j = k + 1; j < segs.length; j++) if (crosses(s, segs[j])) cross++; });
    return cross * 1000 + len;
  };
  const perms = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((x, k) => perms(xs.slice(0, k).concat(xs.slice(k + 1))).map((p) => [x].concat(p))));
  const orders = out.length <= 7 ? perms(out) : [out.slice().sort((p, q) => p.want - q.want)];
  let best = null, bestS = Infinity;
  for (const ord of orders) { const pl = place(ord.map((o) => Object.assign({}, o))); const sc = score(pl); if (sc < bestS) { bestS = sc; best = pl; } }
  return best.sort((p, q) => p.i - q.i);
}
// do two line segments cross (sharing an end does not count)?
function crosses(s, t) {
  const A = s.end, B = s.pt, C = t.end, D = t.pt;
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(A, B, C) * o(A, B, D) < 0 && o(C, D, A) * o(C, D, B) < 0;
}

function line(s, a, b, color, width) {
  s.addShape('line', { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y),
    flipH: b.x < a.x, flipV: b.y < a.y, line: { color, width } });
}

function labelledPicture(pptx, L, item, H) {
  const C = H.C, fs = require('fs');
  const pair = item.pair && item.pair.left && item.pair.right ? item.pair : null;
  const ok = (p) => p && isFinite(p.x) && isFinite(p.y);
  const labels = (Array.isArray(item.labels) ? item.labels : []).filter((l) => l && l.text && (pair ? ok(l.left) || ok(l.right) : ok(l)));
  const files = pair ? [pair.left.path, pair.right.path] : [item.embeddedImagePath];
  const have = files.every((f) => f && fs.existsSync(f)) && (pair || item.imageConfidence === 'search');
  if (!have) H.buildWarn(`Learn L "${item.heading || ''}": picture not found (${files.filter((f) => !f || !fs.existsSync(f)).join(', ') || 'no path'}), grey placeholder and no labels`);
  if (!labels.length) H.buildWarn(`Learn L "${item.heading || ''}": no labels with text and points`);
  const steps = item.build === false || !labels.length || !have ? [null] : labels.map((_, i) => i).concat([null]);
  const obj = H.objectiveText(L);
  steps.forEach((cur) => {
    const s = pptx.addSlide();
    s.background = { color: C.BG };
    H.navBar(s, 'learn');
    const head = 'LEARN · ' + H.stripStage(item.heading || L.meta.topic, 'LEARN') + (cur != null ? '  (' + (cur + 1) + ' of ' + labels.length + ')' : '');
    const y = H.sectionHeader(s, head.toUpperCase(), C.STAGE.learn, C.TOP);
    const area = { x: C.MX, y, w: C.CW, h: C.BOT_Y - 0.12 - y };
    let placed;
    if (pair) {
      // two pictures, captions under them, the shared labels in the middle (D8)
      const capH = 0.32, side = (area.w - LWP - 2 * 0.3) / 2, ph = area.h - capH;
      const slotL = { x: area.x, y: area.y, w: side, h: ph }, slotR = { x: area.x + side + LWP + 0.6, y: area.y, w: side, h: ph };
      if (!have) { [slotL, slotR].forEach((b, k) => H.imageOrPlaceholder(s, { imageDescription: (k ? pair.right : pair.left).caption }, b.x, b.y, b.w, b.h)); H.bottomBar(s, obj); return; }
      const bL = H.addImageFit(s, pair.left.path, slotL.x, slotL.y, slotL.w, slotL.h), bR = H.addImageFit(s, pair.right.path, slotR.x, slotR.y, slotR.w, slotR.h);
      [[bL, pair.left], [bR, pair.right]].forEach(([b, p]) => { if (p.caption) H.txt(s, p.caption, { x: b.x, y: b.y + b.h + 0.04, w: b.w, h: capH - 0.06, fontSize: 11.5, italic: true, color: INK, align: 'center', valign: 'top', margin: 0 }); });
      placed = layoutPair(labels, bL, bR, { x: area.x + side + 0.3, y: area.y, w: LWP, h: area.h }, cur);
    } else {
      const pic = { x: area.x + LW + 0.35, y: area.y, w: area.w - 2 * (LW + 0.35), h: area.h };
      if (!have) { H.imageOrPlaceholder(s, item, pic.x, pic.y, pic.w, pic.h); H.bottomBar(s, obj); return; }
      const box = H.addImageFit(s, files[0], pic.x, pic.y, pic.w, pic.h);
      placed = layout(labels, box, area, cur).map((o) => ({ i: o.i, rect: o.rect, lines: [{ end: o.end, pt: o.pt }] }));
    }
    placed.forEach((o) => {
      const l = labels[o.i], grey = cur != null && o.i !== cur, open = o.i === cur;
      const lc = grey ? GREY : C.NAVY;
      o.lines.forEach(({ end, pt }) => {
        line(s, end, pt, lc, open ? 2.5 : 1.5);
        s.addShape('ellipse', { x: pt.x - 0.05, y: pt.y - 0.05, w: 0.1, h: 0.1, fill: { color: lc }, line: { type: 'none' } });
        if (open) s.addShape('ellipse', { x: pt.x - 0.24, y: pt.y - 0.24, w: 0.48, h: 0.48, fill: { type: 'none' }, line: { color: Y5, width: 4 } });
      });
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

module.exports = { labelledPicture, layout, layoutPair, stack, LW, LH, LH_OPEN };
