'use strict';
// build.js part 13-checks: content checks run before building (contentCheck, MCQ check, six-mark rule, blockers). Loaded by build.js in order; all parts share one scope.

/* CONTENT CHECK (2026-07-09, Patryk ruling; merged 2026-07-11 — see backlog.md):
   loud per-lesson validation of the authoring rules that keep slipping on the
   claude.ai side (audit found: 0-1 MCQs, Apply 2/1/1, no review sections, Do Now
   5, missing Drive meta). Prints ✓/✗ lines. NEVER blocks the build — warn loudly,
   never block. Mirrored in SKILL.md so the authoring side self-checks before
   handing a JSON over. Note (2026-07-11): this file briefly had two shadowed
   declarations of this function — a dead one that listed slide names for the
   missing-image-description warning, and this surviving one, which had the
   broader/more-correct image scan but only reported a count. Merged: keeps the
   broader scan, restores the slide-name listing. */
/* ---- Lesson quality A checks (2026-10-19) — warnings only, never block -------------------
   mcqCheck: each wrong option must name the mistake it catches (item.why / item.wrong {B: ...}),
     and the usual give-aways are flagged. Rules copied from mcq-written.js check(), which is not
     packed for claude.ai. Claude rewrites weak options while writing; this reports what's left.
   learnChecks: Learn slides over 45 words (research: about 40), two Learn slides that split one
     idea, more than 3 key words ({k}) on a slide or the same key word twice. */
function mcqCheck(item) {
  const bad = [];
  const o = mcqOptions(item.options), ans = String(item.answer || '').trim().toUpperCase().slice(0, 1);
  const opts = ['A', 'B', 'C', 'D'].map((k) => stripKeys(String(o[k] || '')).trim());
  if (opts.some((x) => !x)) bad.push('an option is missing');
  if (new Set(opts.map((x) => x.toLowerCase())).size !== opts.length) bad.push('two options are the same');
  if (opts.some((x) => /\b(all|none|both|neither) of (the|these) (above|answers|options)\b/i.test(x))) bad.push('"all/none of the above"');
  if (!/^[A-D]$/.test(ans)) bad.push('answer is not one letter A-D');
  const num = (x) => { const m = /^[−-]?\d[\d,]*(\.\d+)?/.exec(x.replace(/\s/g, '')); return m ? parseFloat(m[0].replace(/[,−]/g, (c) => (c === '−' ? '-' : ''))) : null; };
  const nums = opts.map(num);
  if (nums.every((n) => n != null)) {
    if (!nums.every((n, i) => !i || n >= nums[i - 1])) bad.push('number options not smallest to largest');
  } else if (/^[A-D]$/.test(ans)) {
    const len = opts.map((x) => x.length), r = len['ABCD'.indexOf(ans)];
    const others = len.filter((l, i) => i !== 'ABCD'.indexOf(ans));
    if (r > 1.3 * Math.max(...others) && r - Math.max(...others) > 6) bad.push('the right answer is clearly the longest');
  }
  const why = item.why || item.wrong || {};
  const missing = ['A', 'B', 'C', 'D'].filter((k) => k !== ans && !String(why[k] || '').trim());
  if (missing.length) bad.push(`no "why" for wrong option${missing.length > 1 ? 's' : ''} ${missing.join(', ')} (name the mistake it catches)`);
  return bad;
}
function learnWords(it) {
  const parts = [];
  arr(it.boxes).forEach((b) => parts.push(b.header || '', ...arr(b.items)));
  ['body', 'content'].forEach((k) => it[k] && parts.push(String(it[k])));
  return stripMarkTags(stripKeys(parts.join(' '))).split(/\s+/).filter(Boolean).length;
}
function learnChecks(L, lines) {
  const learn = arr(L.learn);
  learn.forEach((it, i) => {
    const n = learnWords(it);
    if (n > 45) lines.push(`  ✗ Learn ${i + 1} "${it.heading || ''}" has ${n} words of text (aim for about 40: the slide shows, you explain)`);
    const keys = (JSON.stringify(it).match(/\{k\}([\s\S]*?)\{\/k\}/g) || []).map((k) => k.replace(/\{\/?k\}/g, '').toLowerCase());
    if (keys.length > 3) lines.push(`  ✗ Learn ${i + 1} highlights ${keys.length} key words (soft cap 3)`);
    if (new Set(keys).size < keys.length) lines.push(`  ✗ Learn ${i + 1} highlights the same key word twice (first appearance only)`);
    const prev = learn[i - 1];
    if (prev) {
      const h0 = String(prev.heading || '').toLowerCase().split(/\s+/).slice(0, 2).join(' ');
      const h1 = String(it.heading || '').toLowerCase();
      if ((h0 && h0.split(' ').length === 2 && h1.startsWith(h0)) || /\((2|ii)\)|continued|part 2|2\/2/.test(h1))
        lines.push(`  ✗ Learn ${i} and ${i + 1} look like one idea split over two slides ("${prev.heading}" / "${it.heading}")`);
    }
  });
}

function contentCheck(L) {
  const meta = L.meta || {};
  const type = (meta.lessonType || meta.type || 'standard').toLowerCase();
  const name = meta.topic || meta.title || 'unknown';
  const isTeaching = type === 'standard' || type === 'practical' || type === 'annotation';
  const lines = [];
  const blockers = [];   // 2026-07-12: BROKEN output — refuse to build (overridable)
  const check = (ok, good, bad) => lines.push(ok ? `  ✓ ${good}` : `  ✗ ${bad}`);
  // A blocking check: the lesson would be unusable or unfindable, not merely thin.
  const must = (ok, good, bad) => { check(ok, good, bad); if (!ok) blockers.push(bad); };

  const dn = arr((L.doNow || {}).questions).length;
  // test and test-review lessons use doNow.task steps by design (2026-10-20: false warning on 12C Waves 1 review)
  if (!dn && arr((L.doNow || {}).task).length) lines.push(`  ✓ Do Now is ${arr(L.doNow.task).length} steps (doNow.task)`);
  else check(dn === 6, `Do Now ${dn}/6`, `Do Now has ${dn} question(s) — rule is exactly 6`);

  // review Extension (2026-10-10): every column names its support page, every question has its answer
  arr(L.extension).forEach((c, i) => {
    const qs = arr(c && c.questions).map(normQ);
    check(!!(c && c.pages), `Extension "${(c && c.subtopic) || i + 1}" support page`, `Extension column "${(c && c.subtopic) || i + 1}" has no support page (pages)`);
    check(qs.length && qs.every((q) => String(q.a || '').trim()), `Extension "${(c && c.subtopic) || i + 1}" answers`, `Extension column "${(c && c.subtopic) || i + 1}" has a question with no answer (it drops off the answers slide)`);
  });
  const nPrac = arr(L.build).filter((b) => (b.type || b.variant) === 'practical').length;
  if (nPrac > 2) lines.push(`  ✗ ${nPrac} practicals — a lesson has at most 2; only the first 2 are drawn on the worksheet`);
  if (arr(L.extension).length > 4) lines.push('  ✗ Extension has more than 4 subtopic columns — only the first 4 are drawn');

  if (isTeaching) {
    const mcq = arr(L.build).filter((b) => ['mcq', 'mcq_image'].includes(b.type || b.variant)).length;
    check(mcq === 6, 'MCQ count 6/6', `MCQ count ${mcq} — rule is exactly 6 (one block after Learn; experiment MCQs tagged about:"practical" go after the method slide)`);
    // MCQ CHECK (Lesson quality A): every wrong option names its mistake; no give-aways
    const mcqBad = [];
    arr(L.build).filter((b) => ['mcq', 'mcq_image'].includes(b.type || b.variant)).forEach((b, i) => {
      const bad = mcqCheck(b);
      if (bad.length) mcqBad.push(`  ✗ MCQ CHECK · question ${i + 1}: ${bad.join('; ')}`);
    });
    if (mcq) { if (mcqBad.length) lines.push(...mcqBad); else lines.push('  ✓ MCQ CHECK · every wrong option names its mistake'); }
    learnChecks(L, lines);
    TIERS.forEach((t) => {
      const a = arr((L.apply || {})[t]).length;
      check(a >= 3, `Apply ${t} ${a}/3+`, `Apply ${t} has ${a} question(s) — minimum 3 per tier`);
    });
    // Review policy (2026-07-12): review is a verbatim copy of Apply, and the
    // builder does the copying itself (buildReviewSlides falls back to Apply Q&A).
    // The authoring side should OMIT review entirely; an explicit review is still
    // honoured (must mirror every Apply question), but it is wasted authoring.
    const reviewAuthored = TIERS.some((t) => arr((L.review || {})[t]).length);
    if (reviewAuthored) {
      TIERS.forEach((t) => {
        const a = arr((L.apply || {})[t]).length;
        const r = arr((L.review || {})[t]).length;
        check(r === a && a > 0, `Review ${t} mirrors Apply (${r}/${a})`,
          `Review ${t} has ${r} answer(s) for ${a} Apply question(s) — review must mirror EVERY Apply question (or omit review and let the builder copy)`);
      });
    } else {
      TIERS.forEach((t) => {
        const missingA = arr((L.apply || {})[t]).map(normQ).filter((q) => !q.a).length;
        check(missingA === 0, `Review ${t} auto-copied from Apply`,
          `Apply ${t} has ${missingA} question(s) with NO answer — those drop off the auto-copied review slides`);
      });
    }
  }

  // Image discipline: every placeholder slot needs a Google-searchable description,
  // and a lesson with no images at all usually means source extraction was skipped.
  const imgItems = [
    L.engage && { it: L.engage, label: 'Engage' },
    ...arr(L.learn).map((it, i) => ({ it, label: `Learn ${i + 1} (${it.variant})` })),
  ].filter(Boolean).filter((x) => x.it.imagePlaceholder !== false);
  const noDesc = imgItems.filter((x) => !x.it.embeddedImagePath && !x.it.imageDescription).map((x) => x.label);
  check(noDesc.length === 0, 'image slots all described/embedded',
    `image slots with NO imageDescription (generic placeholder ships): ${noDesc.join(', ')}`);
  const anyImg = [L.engage, ...arr(L.learn), ...arr(L.build)].some((i) => i && i.embeddedImagePath)
    || arr((L.image_dump || {}).images).length > 0;
  check(anyImg, 'images embedded / image bank present',
    'NO images anywhere (no embeddedImagePath, empty image_dump) — if a source deck exists, extraction was skipped');

  // NOT blocking: missing Drive meta only stops the HOME auto-upload. The lesson
  // still builds and is fully teachable, and at school (claude.ai) there is no
  // uploader at all — so refusing to build here would deny a usable lesson over a
  // field that does not matter in the room. The uploader errors loudly by itself.
  const missMeta = ['year', 'subject', 'macrotopic', 'lessonNumber', 'title'].filter((k) => !meta[k]);
  check(missMeta.length === 0, 'Drive meta complete',
    `Drive meta missing: ${missMeta.join(', ')} — builds fine, but will NOT auto-upload or reach the lesson log`);

  // BLOCKING: a teaching lesson with no Apply questions has nothing for pupils to
  // do — the worksheet prints empty tier headings. That is a broken deliverable
  // rather than a thin one, and it cannot happen in a real lesson, so refusing is
  // safe. Everything else stays a warning: a thin lesson at 08:55 still beats no
  // lesson. --force overrides even this, in case the checker itself is wrong.
  if (isTeaching) {
    const applyTotal = TIERS.reduce((n, t) => n + arr((L.apply || {})[t]).length, 0);
    must(applyTotal > 0, 'Apply section present',
      'Apply has NO questions in any tier — the worksheet would print empty tier headings');
  }

  const wx = L.worksheetExtras || {};
  if (wx.cloze && !isTeaching)
    lines.push('  ✗ cloze only renders on standard/practical worksheets — it will be dropped on this lesson type');

  console.log(`── CONTENT CHECK · ${name}`);
  lines.forEach((l) => console.log(l));

  // Plain-English one-liner so a thin lesson is visible without reading the list.
  const thin = lines.filter((l) => l.startsWith('  ✗')).length - blockers.length;
  if (thin > 0) console.log(`  ⚠ Built, but ${thin} authoring rule(s) fell short — see the ✗ lines above.`);

  return blockers;
}

/* Blocking policy (2026-07-12, after a second-opinion consult):
     - HARD FAIL on faults that make the output broken or unfindable (no Drive
       meta, no Apply questions). Refusing is right: the lesson would be lost.
     - WARN on thin pedagogy (5 Do Nows, 2 MCQs, a light tier). A thin lesson at
       08:55 still beats no lesson, so these never block.
     - ALWAYS overridable with --force (or FORCE_BUILD=1) for the case that
       matters most: a false positive in a checker, minutes before a lesson.
       Every override is announced loudly so it can never become the silent norm. */
const FORCE_BUILD = process.argv.includes('--force') || process.env.FORCE_BUILD === '1';
function enforceBlockers(blockers, label) {
  if (!blockers.length) return;
  if (FORCE_BUILD) {
    console.error(`  ⚠ FORCED BUILD — ${blockers.length} blocking fault(s) ignored on "${label}":`);
    blockers.forEach((b) => console.error(`      • ${b}`));
    return;
  }
  const msg = [
    `${blockers.length} blocking fault(s) — refusing to build "${label}":`,
    ...blockers.map((b) => '      • ' + b),
    '    Fix the lesson JSON, or re-run with --force to build it anyway.',
  ].join('\n    ');
  throw new Error(msg);
}

/* 6-mark rule: an extended (non-calculation) question worth ≥6 marks must carry
   ≥6 indicative-content points — match points to marks. Non-fatal, logged like
   the B9 MCQ-count check so the shortfall is visible without breaking the build. */
function checkSixMarkRule(L) {
  const topic = (L.meta || {}).topic || (L.meta || {}).title || 'unknown';
  const scan = (q, where) => {
    if (!q || typeof q !== 'object') return;
    const calc = String(q.qType || '').toLowerCase() === 'calculation';
    if ((q.marks || 0) >= 6 && !calc) {
      // Band-marked questions are exempt (2026-07-05): when levelDescriptors are
      // present, marks are lost via the BANDS, not the indicative-point count —
      // ≥6 points is not a forced rule there.
      if (arr(q.levelDescriptors).length) return;
      const n = arr(q.indicativeContent).length;
      if (n < 6) console.error(`[build] 6-mark rule: ${topic} — ${where} "${String(q.q || q.questionText || '').slice(0, 40)}" has ${n} indicative point(s) for ${q.marks} marks`);
    }
  };
  TIERS.forEach((t) => arr(L.apply && L.apply[t]).map(normQ).forEach((q) => scan(q, 'Apply ' + t)));
  TIERS.forEach((t) => arr(L.review && L.review[t]).map(normQ).forEach((q) => scan(q, 'Review ' + t)));
  arr(L.review && L.review.questions).map(normQ).forEach((q) => scan(q, 'Review'));
  arr(L.build).forEach((b) => { if ((b.type || b.variant) === 'modelAnswerReview') scan(b, 'Build model answer'); });
}
