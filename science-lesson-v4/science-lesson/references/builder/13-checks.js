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

/* Teaching language (Patryk 2026-10-30, all 20 rules approved; SKILL.md "Teaching language").
   Warnings only, one ✗ line per rule naming the slides; the build never rewrites. */
const LANG_HYPE = /\b(explore|exploring|discover|discovering|journey|fascinating|amazing|incredible|unlock|dive into|delve)\b/i;
const langSentences = (t) => stripMarkTags(stripKeys(String(t || ''))).split(/(?<=[.?!])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
const langWords = (t) => t.split(/\s+/).filter(Boolean).length;
function languageChecks(L, lines, type) {
  const year = parseInt((L.meta || {}).year, 10) || 0;
  const aLevel = year >= 12;
  const maxWords = aLevel ? 25 : 20, maxNotes = aLevel ? 5 : 3;
  const learn = arr(L.learn), e = L.engage;
  const slideText = (it) => [...arr(it.boxes).flatMap((b) => [b.header, ...arr(b.items)]), it.body, it.content, it.hook, it.prompt].filter(Boolean);
  // (3) long sentences on slides
  const long = [];
  if (e) slideText(e).forEach((t) => langSentences(t).forEach((x) => { if (langWords(x) > maxWords) long.push('Engage'); }));
  learn.forEach((it, i) => slideText(it).forEach((t) => langSentences(t).forEach((x) => { if (langWords(x) > maxWords) long.push(`Learn ${i + 1}`); })));
  if (long.length) lines.push(`  ✗ LANGUAGE · sentence over ${maxWords} words on ${[...new Set(long)].join(', ')} (aim for 15 on slides; the rest goes in notes)`);
  // (4) the explanation lives in the notes, in Patryk's voice
  const noNotes = learn.map((it, i) => (it.notes ? null : `Learn ${i + 1}`)).filter(Boolean);
  if (noNotes.length) lines.push(`  ✗ LANGUAGE · no speaker notes on ${noNotes.join(', ')} (the slide has the short version, notes the full explanation)`);
  // (2) words by the picture: at most 3 notes on a picture slide (5 for Years 12 and 13); Learn L builds one per click
  const crowded = learn.map((it, i) => {
    const v = String(it.variant || 'A').toUpperCase();
    const pic = (v === 'A' && it.imagePlaceholder !== false && !it.annotationZone) || v === 'D' || v === 'J';
    const n = arr(it.boxes).reduce((t, b) => t + arr(b.items).length, 0) + arr(it.features).length;
    return pic && n > maxNotes ? `Learn ${i + 1} (${n})` : null;
  }).filter(Boolean);
  if (crowded.length) lines.push(`  ✗ LANGUAGE · more than ${maxNotes} notes beside a picture on ${crowded.join(', ')} (one sentence each, next to its part)`);
  // (6) "you" and "we", never the passive instruction
  const passive = JSON.stringify([L.learn, L.engage, L.build, L.apply, L.title]).match(/\b(?:is|are) to be \w+(?:ed|en)\b|\bby the (?:student|pupil)s?\b/gi);
  if (passive) lines.push(`  ✗ LANGUAGE · passive instruction ("${passive[0]}"): say "you" or "we" ("Work out the pressure")`);
  // (14-17) Engage: always a question, short, plain, and the notes say where the lesson answers it
  if (type === 'standard' || type === 'practical') {
    if (!e) lines.push('  ✗ LANGUAGE · no Engage: every lesson has one, always a question (from history, real data, or what you just said)');
    else {
      const q = [(e.reveal || {}).question, e.hook, e.prompt].filter(Boolean).map((t) => stripKeys(String(t))).find((t) => /\?\s*$/.test(t));
      if (!q) lines.push('  ✗ LANGUAGE · Engage asks no question (the hook, prompt or reveal question should end with "?")');
      else if (langWords(langSentences(q).slice(-1)[0] || q) > 15) lines.push(`  ✗ LANGUAGE · Engage question over 15 words: "${q}"`);
      const hype = slideText(e).join(' ').match(LANG_HYPE);
      if (hype) lines.push(`  ✗ LANGUAGE · Engage uses the hype word "${hype[0]}"`);
      if (!e.notes) lines.push('  ✗ LANGUAGE · Engage has no notes line saying where the lesson answers its question');
    }
  }
  // (20) MCQ options: one line each
  const wide = arr(L.build).filter((b) => ['mcq', 'mcq_image'].includes(b.type || b.variant)).map((b, i) => {
    const o = mcqOptions(b.options);
    return ['A', 'B', 'C', 'D'].some((k) => stripKeys(String(o[k] || '')).length > 70) ? `question ${i + 1}` : null;
  }).filter(Boolean);
  if (wide.length) lines.push(`  ✗ LANGUAGE · an MCQ option over 70 characters on ${wide.join(', ')} (one line each, answerable in under a minute)`);
}

// Em dashes (Patryk's rule, 2026-07-02): anywhere in what pupils or Patryk read, not the file's meta.
function emDashCheck(L, lines) {
  const where = Object.keys(L).filter((k) => k !== 'meta' && JSON.stringify(L[k] || '').includes('—'));
  if (where.length) lines.push(`  ✗ em dash in ${where.join(', ')}: rewrite with a comma, colon or new sentence`);
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
  // last week's homework slide (2.10, test build): three cards, each with its right answer
  if (L.homeworkFeedback) {
    const hq = arr(L.homeworkFeedback.questions);
    if (hq.length > 3) lines.push(`  ✗ homeworkFeedback has ${hq.length} questions: only the first 3 are shown`);
    const noRight = hq.slice(0, 3).filter((q) => !String((q && q.right) || '').trim()).length;
    check(hq.length && !noRight, `Last week's homework slide: ${Math.min(3, hq.length)} question(s)`, hq.length ? `homeworkFeedback: ${noRight} question(s) with no right answer (the click box is empty)` : 'homeworkFeedback has no questions: the slide is left out');
  }
  const nPrac = arr(L.build).filter((b) => (b.type || b.variant) === 'practical').length;
  if (nPrac > 2) lines.push(`  ✗ ${nPrac} practicals — a lesson has at most 2; only the first 2 are drawn on the worksheet`);
  if (arr(L.extension).length > 4) lines.push('  ✗ Extension has more than 4 subtopic columns — only the first 4 are drawn');

  if (isTeaching) {
    const mcq = arr(L.build).filter((b) => ['mcq', 'mcq_image'].includes(b.type || b.variant) && !b.from).length;   // a question back from 3 to 4 weeks ago (2.6) is extra
    check(mcq === 6, 'MCQ count 6/6', `MCQ count ${mcq} — rule is exactly 6 (one block after Learn; experiment MCQs tagged about:"practical" go after the method slide)`);
    // MCQ CHECK (Lesson quality A): every wrong option names its mistake; no give-aways
    const mcqBad = [];
    arr(L.build).filter((b) => ['mcq', 'mcq_image'].includes(b.type || b.variant)).forEach((b, i) => {
      const bad = mcqCheck(b);
      if (bad.length) mcqBad.push(`  ✗ MCQ CHECK · question ${i + 1}: ${bad.join('; ')}`);
    });
    if (mcq) { if (mcqBad.length) lines.push(...mcqBad); else lines.push('  ✓ MCQ CHECK · every wrong option names its mistake'); }
    learnChecks(L, lines);
    languageChecks(L, lines, type);
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
  // Only slides that draw a picture slot (item 2.5, 2026-10-30: no false warning on a comparison
  // table): Learn A, B with a picture below, D, H and J. K checks its events; C, E, F, G, I and L have none.
  const drawsPicture = (it) => {
    const v = String(it.variant || 'A').toUpperCase();
    if (v === 'B') { const b = String(it.below || 'none'); return b === 'image' || (b !== 'none' && b !== 'two-column' && arr(it.boxes).length > 0); }
    return ['A', 'D', 'H', 'J'].includes(v);
  };
  const imgItems = [
    L.engage && { it: L.engage, label: 'Engage' },
    ...arr(L.learn).map((it, i) => ({ it, label: `Learn ${i + 1} (${it.variant})` })).filter((x) => drawsPicture(x.it)),
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

  // Support sheet v2 (2026-10-23): each help is checked; a failing one is not printed.
  TIERS.forEach((t) => arr((L.apply || {})[t]).map(normQ).forEach((q, i) => {
    const h = pickSupportHelp(L, q);
    if (!h) return;
    const where = `Apply ${t} Q${i + 1}`;
    if (h.extra.length) lines.push(`  ✗ ${where}: more than one support help (${[h.kind].concat(h.extra).join(', ')}); only ${h.kind} is used`);
    if (!h.ok) lines.push(`  ✗ ${where}: support ${h.kind} not printed (${h.why.join('; ')}); the plain question is used`);
  }));
  // Word banks: at least 5 words, and 2 more than the gaps they serve (Patryk 2026-10-23).
  const gaps = arr(wx.cloze).reduce((n, s) => n + (String(s).match(/_{2,}/g) || []).length, 0);
  if (gaps) {
    const cb = arr(wx.clozeWordBank || wx.wordBank || (L.title || {}).keywords);
    check(cb.length >= Math.max(5, gaps + 2), `cloze word bank ${cb.length} words for ${gaps} gaps`,
      `cloze word bank has ${cb.length} words for ${gaps} gaps: give at least ${Math.max(5, gaps + 2)} (believable extras from the topic)`);
  }
  if (arr(wx.wordBank).length && arr(wx.wordBank).length < 5)
    lines.push(`  ✗ word bank has ${arr(wx.wordBank).length} words: give at least 5 (add believable extras from the topic)`);

  emDashCheck(L, lines);
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

/* ---- Support sheet v2 (Patryk 2026-10-23): ONE help per Apply question -----------------------
   The support sheet (mode 'developing') gives an Apply question at most one help, chosen by what
   would stop a support pupil starting (rules: SKILL.md "Support sheet helps"). Fields on the Apply
   question, in rule order: weighUp {options[], sides?[2], choice?} · compare {things[2], rows[],
   similarity?} · prompt (a guiding question) · steps [starters] (2-3 marks: linked starters,
   4+: Step 1..n) · supportQ (plain rewrite). Every help is checked; one that fails is NOT printed,
   the plain question is. Standard sheet and slides never change (except: steps lay the review
   slide answer out one sentence per line, so pupils see their starters completed). */
const COMMAND_WORDS = ['explain', 'describe', 'calculate', 'compare', 'evaluate', 'suggest', 'state', 'name',
  'give', 'define', 'plan', 'predict', 'justify', 'outline', 'identify', 'sketch', 'draw', 'complete', 'sort',
  'show', 'write', 'argue', 'discuss', 'determine', 'estimate', 'put', 'list', 'design', 'label'];
const CMD_RE = new RegExp('\\b(' + COMMAND_WORDS.join('|') + ')\\b', 'g');
const STOPWORDS = new Set('this that these those with from into onto than then them they their there what when where which while does each been being have more most much made make some such very also only just over under your about would could should'.split(' '));
const normTxt = (s) => stripMarkTags(stripKeys(prettyText(s || ''))).toLowerCase()
  .replace(/[^\p{L}\p{N}°%.\s]/gu, ' ').replace(/\.(?!\d)/g, ' ').replace(/\s+/g, ' ').trim();
const sentencesOf = (s) => stripMarkTags(stripKeys(prettyText(s || ''))).split(/(?<=[.?!])\s+/).map((x) => x.trim()).filter(Boolean);
const wordsOf = (s) => normTxt(s).split(' ').filter(Boolean);

function lessonTerms(L) {
  const t = L.title || {};
  const out = [].concat(arr(t.keywords), arr(t.knownWords));
  arr(L.learn).forEach((it) => { if (it.definition) out.push(it.definition); out.push(...arr(it.definitions)); });
  return out.map((k) => (typeof k === 'string' ? k : k.term)).filter(Boolean);
}

// The rewrite must ask exactly the same thing: same command words (none new, one leading a
// sentence), every number, every lesson key word and {k} term, most content words, short sentences.
function supportQCheck(L, q) {
  const why = [];
  const o = normTxt(q.q), r = normTxt(q.supportQ);
  const oc = o.match(CMD_RE) || [], rc = r.match(CMD_RE) || [];
  const lost = [...new Set(oc)].filter((c) => !rc.includes(c));
  const added = [...new Set(rc)].filter((c) => !oc.includes(c));
  if (lost.length) why.push('command word lost: ' + lost.join(', '));
  if (added.length) why.push('command word changed to: ' + added.join(', '));
  if (oc.length && !sentencesOf(q.supportQ).some((s) => new RegExp('^(then\\s+)?(' + COMMAND_WORDS.join('|') + ')\\b', 'i').test(s)))
    why.push('no sentence starts with the command word');
  const nums = (s) => s.match(/\d+(?:[.,]\d+)*/g) || [];
  const lostN = nums(o).filter((n) => !nums(r).includes(n));
  if (lostN.length) why.push('number lost: ' + lostN.join(', '));
  const kTerms = (String(q.q).match(/\{k\}([^{]+)\{\/k\}/g) || []).map((m) => m.replace(/\{\/?k\}/g, ''));
  const lostT = [...new Set(lessonTerms(L).concat(kTerms))].map(normTxt).filter((t) => t && o.includes(t) && !r.includes(t));
  if (lostT.length) why.push('key word lost: ' + lostT.join(', '));
  const content = wordsOf(q.q).filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !COMMAND_WORDS.includes(w));
  const rw = wordsOf(q.supportQ);
  const kept = content.filter((w) => rw.some((x) => x.slice(0, 5) === w.slice(0, 5))).length;
  if (content.length && kept / content.length < 0.6) why.push(`only ${kept} of ${content.length} content words kept (meaning may have drifted)`);
  const long = sentencesOf(q.supportQ).filter((s) => wordsOf(s).length > 15);
  if (long.length) why.push('sentence over 15 words');
  if (rw.length > wordsOf(q.q).length + 6) why.push('longer than the original');
  return { ok: !why.length, why };
}

// Each starter must be the exact opening words of a sentence of the model answer, in order,
// and leave something to write.
function stepsCheck(q) {
  const why = [];
  const sents = sentencesOf(q.a).map(normTxt);
  let at = 0;
  const clean = arr(q.steps).map((s) => String(s).replace(/[_.…\s]+$/u, '').trim());
  clean.forEach((st) => {
    const n = normTxt(st);
    const k = sents.findIndex((s, j) => j >= at && s.startsWith(n));
    if (k < 0) { why.push(`starter "${st}" is not the start of a model-answer sentence (in order)`); return; }
    if (wordsOf(sents[k]).length - wordsOf(n).length < 2) why.push(`starter "${st}" leaves nothing to write`);
    at = k + 1;
  });
  if (clean.length < 2 || clean.length > 4) why.push('steps need 2 to 4 starters');
  return { ok: !why.length, why, steps: clean };
}

// A guiding question points at the idea; it must be a question and must not give the answer.
function promptCheck(q) {
  const why = [];
  if (!/\?\s*$/.test(String(q.prompt))) why.push('guiding question must end with ?');
  const a = wordsOf(q.a), p = ' ' + normTxt(q.prompt) + ' ';
  for (let i = 0; i + 4 <= a.length; i++) {
    const g = a.slice(i, i + 4);
    if (g.filter((w) => !STOPWORDS.has(w) && w.length > 2).length >= 3 && p.includes(' ' + g.join(' ') + ' ')) { why.push(`gives the answer away ("${g.join(' ')}")`); break; }
  }
  return { ok: !why.length, why };
}

function pickSupportHelp(L, q) {
  const kinds = ['weighUp', 'compare', 'prompt', 'steps', 'supportQ'].filter((k) => (k === 'steps' ? arr(q.steps).length : q[k]));
  if (!kinds.length) return null;
  const kind = kinds[0];
  let res = { ok: true, why: [] };
  if (kind === 'supportQ') res = supportQCheck(L, q);
  else if (kind === 'steps') res = stepsCheck(q);
  else if (kind === 'prompt') res = promptCheck(q);
  else if (kind === 'weighUp' && !arr(q.weighUp.options).length) res = { ok: false, why: ['weighUp needs options'] };
  else if (kind === 'compare' && arr(q.compare.things).length !== 2) res = { ok: false, why: ['compare needs two things'] };
  return Object.assign({ kind, extra: kinds.slice(1) }, res);
}
