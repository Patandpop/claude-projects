'use strict';
// build.js part 07-slides-engage: Engage slide (all variants). Loaded by build.js in order; all parts share one scope.

/* ---- ENGAGE ------------------------------------------------------------- */
const ENGAGE_LABEL = {
  news: 'IN THE NEWS', news_hook: 'IN THE NEWS', prediction: 'MAKE A PREDICTION',
  video: 'WATCH', video_hook: 'WATCH', demo: 'DEMONSTRATION',
  mysteryImage: 'MYSTERY IMAGE', oddOneOut: 'ODD ONE OUT',
};
function slideEngage(pptx, L) {
  const e = L.engage; if (!e) return;
  const s = pptx.addSlide();
  if (e.notes) s.addNotes(stripKeys(e.notes));                   // Lesson quality A
  s.background = { color: BG };
  navBar(s, 'engage');
  const heading = e.title ? ('ENGAGE \u00B7 ' + stripStage(e.title, 'ENGAGE')) : ('ENGAGE \u00B7 ' + (ENGAGE_LABEL[e.variant] || 'HOOK'));
  let y = sectionHeader(s, heading.toUpperCase(), STAGE.engage, TOP);

  // imagePlaceholder wins when explicitly set; falls back to hasImage when imagePlaceholder is absent
  const hasImg = e.imagePlaceholder != null ? (e.imagePlaceholder !== false) : (e.hasImage !== false);
  const body = e.content || e.body || '';
  const promptH = e.prompt ? 0.75 : 0;
  const videoH = e.videoLink ? 0.55 : 0;
  // M3/M4: reveal reserves its own bottom row — sized bigger for Layout A (question + answer both prominent)
  const revealH = e.reveal ? (e.reveal.question ? 1.25 : 0.95) : 0;
  const blockBottom = BOT_Y - 0.08 - (promptH ? promptH + GAP : 0) - (revealH ? revealH + GAP : 0);
  const ctxH = blockBottom - y - (videoH ? videoH + GAP : 0);

  // e.hook: short punchy statement (stat, quote, big question) rendered large at the top.
  // Separates focal element from supporting context so the slide never looks empty.
  const hook = e.hook || null;
  const leftW = CW * 0.55;
  const hasQ = !!(e.reveal && e.reveal.question);
  // Patryk-approved fix: when reveal is used, content is usually omitted (M8) — without this,
  // the old hook-only-then-empty-box layout left a huge dead gap. No video: rare combo, skip.
  const fillGap = !!(e.reveal && !body && !e.videoLink);

  if (fillGap && hasQ) {
    // Layout A, no content: hook full-width header / question+image row / full-width answer row
    const bottom = BOT_Y - 0.08 - (promptH ? promptH + GAP : 0);
    const hookRowH = hook ? Math.min(1.0, (bottom - y) * 0.20) : 0;
    const answerRowH = Math.min(1.15, (bottom - y) * 0.26);
    const midY = y + (hookRowH ? hookRowH + GAP : 0);
    const midH = bottom - midY - GAP - answerRowH;

    if (hook) {
      goldBox(s, MX, y, CW, hookRowH, hook, { bold: true, fontSize: autoFontSize(hook, CW, hookRowH, { min: 14, max: 24 }), valign: 'middle', align: 'center', fill: 'FFFDE7' });
    }
    const qW = hasImg ? leftW : CW;
    goldBox(s, MX, midY, qW, midH, e.reveal.question, { bold: true, fontSize: autoFontSize(e.reveal.question, qW, midH, { min: 16, max: 34 }), valign: 'middle', align: 'center', fill: 'FFFDE7' });
    if (hasImg) {
      imageOrPlaceholder(s, e, MX + leftW + 0.15, midY, CW * 0.45 - 0.15, midH);
    }
    const ansY = midY + midH + GAP;
    txt(s, e.reveal.answer || '', {
      x: MX, y: ansY, w: CW, h: answerRowH, fill: { color: NAVY }, line: GOLD2,
      color: GOLD, bold: true, align: 'left', valign: 'middle', margin: 8, fit: 'shrink',
      fontSize: autoFontSize(e.reveal.answer, CW, answerRowH, { min: 12, max: 26 }),
    });
  } else {
    if (hasImg) {
      // fillGap && !hasQ (Layout B, no content): hook fills the full column, matching the image height
      const hookH = (fillGap && !hasQ) ? ctxH : Math.min(1.0, ctxH * 0.35);
      if (hook) {
        goldBox(s, MX, y, leftW, hookH, hook, { bold: true, fontSize: autoFontSize(hook, leftW, hookH, { min: 14, max: 30 }), valign: 'middle', fill: 'FFFDE7', align: 'center' });
        if (body) goldBox(s, MX, y + hookH + GAP, leftW, ctxH - hookH - GAP, body, { italic: true, fontSize: autoFontSize(body, leftW, ctxH - hookH - GAP, { min: 11, max: 20 }), valign: 'top' });
      } else {
        goldBox(s, MX, y, leftW, ctxH, body, { italic: true, fontSize: autoFontSize(body, leftW, ctxH, { min: 11, max: 20 }), valign: 'top' });
      }
      // imageConfidence: 'search' means a real image should already be embedded upstream
      // (image_search run, Wikimedia/clearly-licensed source) before this build step —
      // build.js itself does not call image_search. 'described' (or unset) renders the
      // placeholder with e.imageDescription so the description is never lost/blank.
      imageOrPlaceholder(s, e, MX + leftW + 0.15, y, CW * 0.45 - 0.15, ctxH + videoH + (videoH ? GAP : 0));
    } else {
      // No image: hook (large, prominent) + body below — or body alone at larger/centred size.
      // Prevents the single-flat-paragraph-in-a-huge-box layout that looks visually empty.
      const hookH = (fillGap && !hasQ) ? ctxH : Math.min(1.3, ctxH * 0.32);
      if (hook) {
        goldBox(s, MX, y, CW, hookH, hook, { bold: true, fontSize: autoFontSize(hook, CW, hookH, { min: 14, max: 32 }), valign: 'middle', fill: 'FFFDE7', align: 'center' });
        if (body) goldBox(s, MX, y + hookH + GAP, CW, ctxH - hookH - GAP, body, { italic: true, fontSize: autoFontSize(body, CW, ctxH - hookH - GAP, { min: 11, max: 22 }), valign: 'top' });
      } else {
        goldBox(s, MX, y, CW, ctxH, body, { italic: true, fontSize: autoFontSize(body, CW, ctxH, { min: 11, max: 24 }), valign: 'middle' });
      }
    }
    y += ctxH + GAP;
    if (e.videoLink) {
      goldBox(s, MX, y, hasImg ? CW * 0.55 : CW, videoH, [
        { text: '\u25BA  ', options: { color: TEAL, bold: true } },
        { text: e.videoLink.text || 'Watch the video', options: { color: TEAL, underline: true, hyperlink: e.videoLink.url ? { url: e.videoLink.url } : undefined } },
      ], { fontSize: 13, valign: 'middle' });
      y += videoH + GAP;
    }
    if (e.prompt) {
      goldBox(s, MX, BOT_Y - 0.08 - promptH, CW, promptH, e.prompt, { fill: 'FFF8E1', bold: true, fontSize: 14, valign: 'middle' });
    }
    // M1/M2/M7: reveal modifier — trigger is presence of e.reveal only, works on any variant
    if (e.reveal) {
      // stacks above e.prompt (if both present) — ctxH already reserved room for both
      const ry = BOT_Y - 0.08 - (promptH ? promptH + GAP : 0) - revealH;
      if (hasQ) {
        // M3: Layout A (content present) — large question + navy/gold reveal box side-by-side, same row
        const qW = CW * 0.55, aW = CW * 0.45 - 0.08;
        goldBox(s, MX, ry, qW, revealH, e.reveal.question, {
          bold: true, fontSize: autoFontSize(e.reveal.question, qW, revealH, { min: 16, max: 30 }),
          valign: 'middle', align: 'center', fill: 'FFFDE7',
        });
        txt(s, e.reveal.answer || '', {
          x: MX + qW + 0.08, y: ry, w: aW, h: revealH, fill: { color: NAVY }, line: GOLD2,
          color: GOLD, bold: true, align: 'left', valign: 'middle', margin: 8, fit: 'shrink',
          fontSize: autoFontSize(e.reveal.answer, aW, revealH, { min: 12, max: 22 }),
        });
      } else {
        // M4: Layout B — hook is the question; full-width reveal box, no shared row
        txt(s, e.reveal.answer || '', {
          x: MX, y: ry, w: CW, h: revealH, fill: { color: NAVY }, line: GOLD2,
          color: GOLD, bold: true, align: 'left', valign: 'middle', margin: 8, fit: 'shrink',
          fontSize: autoFontSize(e.reveal.answer, CW, revealH, { min: 12, max: 24 }),
        });
      }
    }
  }
}
