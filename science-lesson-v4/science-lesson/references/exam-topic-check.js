#!/usr/bin/env node
/* exam-topic-check.js — checks every AQA exam question sits in the right subtopic (home only).

   Patryk exported his exam papers one subtopic at a time from an exam-question tool. That tool
   files some questions under the wrong subtopic (2026-10-09: a jetpack forces question sat in
   "National and Global Energy Resources"), and files many questions under several subtopics
   at once (the same solar-cell question is in Efficiency, Energy transfer AND Resources).

   This script reads every question's own words and mark scheme and scores them against every
   subtopic of the same subject (a word-count model of each subtopic, built from the library
   itself, leaving the question being judged out). No paid API, nothing leaves the PC.

   Output:
     exam-library/topic-check-report.md   plain-English report (what moved, what was doubtful)
     exam-categories.json (project root) the corrections the pickers apply:
        moves:     "<doc>#Q<n>": { topic, subtopic, from, score }   wrong subtopic -> right one
        dropped:   "<doc>#Q<n>": { kept, ... }   a copy of a question already filed (correctly)
                   elsewhere, so it is not offered twice
        figureGap: "<doc>#Q<n>": "..."   names a Figure the library has no picture for
   Hand decisions live in exam-categories-manual.json (never overwritten): "keep" a question
   where it is, or "move" it somewhere this script would not.

   Usage: node science-lesson/references/exam-topic-check.js [--report-only]
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LIB = path.join(ROOT, 'exam-library');
const DOCS = path.join(LIB, 'docs');
const OUT = path.join(ROOT, 'exam-categories.json');
const MANUAL = path.join(ROOT, 'exam-categories-manual.json');
const REPORT = path.join(LIB, 'topic-check-report.md');

// Thresholds, tuned by reading the flagged questions (2026-10-09). A question moves only when
// its own subtopic ranks badly AND another subtopic wins by a clear margin per word.
const MIN_WORDS = 8;        // fewer scored words than this: too little to judge
const TOPIC_MARGIN = 0.8;   // another TOPIC must beat the question's own by this (log-units per word).
                            // Read 2026-10-09: above 0.8 nearly all are real mislabels; 0.4-0.8 is read by hand (manual file); below that it is
                            // mostly multi-part questions that span two topics, so they stay put.
const DEST_MARGIN = 0.1;    // the winning topic must also clearly beat the runner-up, or we only
                            // stop offering the question under its wrong topic (no guessed home)
const SUB_RANK = 4;         // within the right topic: own subtopic must rank 4th or worse...
const SUB_MARGIN = Infinity; // ...and lose by this much. OFF (2026-10-09): read 45, only ~60% right; Forces
                            // subtopics overlap too much. Lessons pick by topic, so subtopic moves are by hand only.

const STOP = new Set(('a an the and or of to in on at for by with from as is are was were be been being it its this that these those ' +
  'which what why how when where who whom whose than then there their they them you your give state describe explain suggest ' +
  'calculate use using used show shown one two three four five six figure table graph diagram answer marks mark question ' +
  'complete tick box draw ring line below above following students student some other also more most less each per into ' +
  'would could should can may might will not no do does did has have had any all both between about after before only ' +
  'accept allow ignore reject award correct incorrect max scheme level marks mark points point must credit eg ie e g i ' +
  'there s t cm m g kg n j w v a').split(/\s+/));

function tokens(s) {
  return String(s || '').toLowerCase().replace(/[^a-z ]+/g, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1'));
}
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function loadQuestions() {
  const qs = [];
  for (const f of fs.readdirSync(DOCS).filter((n) => n.endsWith('.json')).sort()) {
    const d = JSON.parse(fs.readFileSync(path.join(DOCS, f), 'utf8'));
    const doc = f.replace(/\.json$/, '');
    const byQ = new Map();
    for (const p of d.parts || []) {
      if (!byQ.has(p.question)) byQ.set(p.question, []);
      byQ.get(p.question).push(p);
    }
    for (const [q, parts] of byQ) {
      const text = parts.map((p) => p.text || '').join(' ');
      const ms = parts.map((p) => (p.ms && p.ms.text) || '').join(' ');
      const figs = new Set(parts.flatMap((p) => p.figureFiles || []));
      qs.push({
        id: `${doc}#Q${q}`, doc, q, subject: String(d.subject).trim(), topic: String(d.topic).trim(), subtopic: String(d.subtopic).trim(),
        text, ms, figs: figs.size, key: norm(parts.map((p) => p.text || '').join(' ')).slice(0, 400),
        toks: tokens(text + ' ' + text + ' ' + ms),   // question words count double
      });
    }
  }
  return qs;
}

// Multinomial naive Bayes per subject, leave-one-out (the judged question's own words are
// taken back out of its subtopic's counts before scoring).
function buildModel(qs, keyOf) {
  const model = {};
  for (const q of qs) {
    const s = (model[q.subject] = model[q.subject] || { subs: {}, vocab: new Set() });
    const k = keyOf(q);
    const c = (s.subs[k] = s.subs[k] || { topic: q.topic, subtopic: q.subtopic, counts: new Map(), total: 0, n: 0 });
    c.n++;
    for (const t of q.toks) { c.counts.set(t, (c.counts.get(t) || 0) + 1); c.total++; s.vocab.add(t); }
  }
  return model;
}

// Score q against every group of its subject (optionally only groups passing `only`).
function score(model, q, keyOf, only) {
  const s = model[q.subject];
  const V = s.vocab.size;
  const own = keyOf(q);
  const mine = new Map();
  for (const t of q.toks) mine.set(t, (mine.get(t) || 0) + 1);
  const out = [];
  for (const [k, c] of Object.entries(s.subs)) {
    if (only && !only(c) && k !== own) continue;
    let lp = 0;
    const total = c.total - (k === own ? q.toks.length : 0);
    for (const [w, n] of mine) {
      const cnt = (c.counts.get(w) || 0) - (k === own ? n : 0);
      lp += n * Math.log((cnt + 0.5) / (total + 0.5 * V));
    }
    out.push({ k, topic: c.topic, subtopic: c.subtopic, lp });
  }
  out.sort((a, b) => b.lp - a.lp);
  const ownRank = out.findIndex((o) => o.k === own) + 1;
  return { ranked: out, ownRank, margin: (out[0].lp - out[ownRank - 1].lp) / Math.max(1, q.toks.length) };
}

function figureGap(q) {
  const refs = [...q.text.matchAll(/\bFigure\s+(\d+)/gi)].map((m) => +m[1]);
  const maxRef = refs.length ? Math.max(...refs) : 0;
  return maxRef > q.figs ? `asks about Figure ${maxRef} but only ${q.figs} picture(s) were recovered` : null;
}

function main() {
  const qs = loadQuestions();
  const byTopic = (q) => q.topic;
  const bySub = (q) => q.topic + ' / ' + q.subtopic;
  const tModel = buildModel(qs, byTopic);
  const sModel = buildModel(qs, bySub);
  const manual = fs.existsSync(MANUAL) ? JSON.parse(fs.readFileSync(MANUAL, 'utf8')) : { keep: {}, move: {} };
  const explore = process.argv.includes('--explore');

  // Copies of the same question across subtopic files.
  const copies = new Map();
  for (const q of qs) { if (!copies.has(q.key)) copies.set(q.key, []); copies.get(q.key).push(q); }

  const moves = {}, dropped = {}, offTopic = {}, gaps = {}, doubtful = [], all = [];
  for (const q of qs) {
    const g = figureGap(q);
    if (g) gaps[q.id] = g;
    if (q.toks.length < MIN_WORDS) continue;            // too few words to judge
    if ((manual.keep || {})[q.id]) continue;
    if (manual.move && manual.move[q.id]) {
      const m = manual.move[q.id];
      const rec = { from: q.topic + ' / ' + q.subtopic, level: m.topic !== q.topic ? 'topic' : 'subtopic', why: m.why || 'moved by hand' };
      const twin = copies.get(q.key).find((o) => o !== q && o.topic === m.topic && o.subtopic === m.subtopic);
      if (twin) dropped[q.id] = Object.assign({ kept: twin.id }, rec);   // already filed there: just drop this copy
      else moves[q.id] = Object.assign({ topic: m.topic, subtopic: m.subtopic }, rec);
      continue;
    }
    // 1. Is it in the right TOPIC? (Lessons pick exam questions by topic, so this matters most.)
    const t = score(tModel, q, byTopic);
    // 2. Within the topic it belongs to, which subtopic?
    const home = t.ownRank > 1 && t.margin >= TOPIC_MARGIN ? t.ranked[0].topic : q.topic;
    const st = score(sModel, q, bySub, (c) => c.topic === home);
    all.push({ q, t, st });
    let to = null;
    if (home !== q.topic) {
      const clear = (t.ranked[0].lp - t.ranked[1].lp) / Math.max(1, q.toks.length) >= DEST_MARGIN;
      const twinAnywhere = copies.get(q.key).some((o) => o !== q && o.topic !== q.topic);
      if (!clear && !twinAnywhere) { offTopic[q.id] = { from: q.topic + ' / ' + q.subtopic, likely: t.ranked[0].topic + ' or ' + t.ranked[1].topic, score: +t.margin.toFixed(2) }; continue; }
      to = st.ranked[0];
    }
    else if (st.ownRank >= SUB_RANK && st.margin >= SUB_MARGIN) to = st.ranked[0];
    if (to) {
      // Already filed (as a copy) where it really belongs? Then just drop this copy.
      const twin = copies.get(q.key).find((o) => o !== q && o.topic === to.topic && (home !== q.topic || o.subtopic === to.subtopic));
      const rec = { from: q.topic + ' / ' + q.subtopic, score: +(home !== q.topic ? t.margin : st.margin).toFixed(2), level: home !== q.topic ? 'topic' : 'subtopic' };
      if (twin) dropped[q.id] = Object.assign({ kept: twin.id }, rec);
      else moves[q.id] = Object.assign({ topic: to.topic, subtopic: to.subtopic }, rec);
    } else if (t.ownRank > 1 && t.margin >= TOPIC_MARGIN * 0.5) {
      doubtful.push({ q, best: t.ranked[0], r: t });
    }
  }
  if (explore) {
    for (const th of [0.05, 0.1, 0.15, 0.2, 0.3, 0.5]) console.log('topic margin', th, all.filter((a) => a.t.ownRank > 1 && a.t.margin >= th).length);
    for (const th of [0.2, 0.3, 0.5, 0.8]) console.log('sub margin (rank>=' + SUB_RANK + ')', th, all.filter((a) => a.st.ownRank >= SUB_RANK && a.st.margin >= th).length);
  }

  const multi = [...copies.values()].filter((v) => v.length > 1);
  const result = {
    _about: 'Written by exam-topic-check.js. Corrections to the exam tool\'s subtopic labels, applied whenever the catalogue is loaded (exam-categories-apply.js). Hand decisions go in exam-categories-manual.json.',
    builtOn: new Date().toISOString().slice(0, 10),
    counts: { questions: qs.length, moved: Object.keys(moves).length, droppedCopies: Object.keys(dropped).length, offTopicOnly: Object.keys(offTopic).length, figureGaps: Object.keys(gaps).length, doubtfulLeftAlone: doubtful.length, filedMoreThanOnce: multi.length },
    moves, dropped, offTopic, figureGap: gaps,
  };
  if (!process.argv.includes('--report-only')) fs.writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n', 'utf8');

  // Plain-English report.
  const byId = new Map(qs.map((q) => [q.id, q]));
  const short = (q) => q.text.replace(/\s+/g, ' ').slice(0, 170);
  const L = [];
  L.push(`# Exam library categorisation check (${result.builtOn})`, '');
  L.push(`${qs.length} questions read. ${multi.length} questions are filed under more than one subtopic (normal: the exam tool tags a question with every subtopic it touches).`, '');
  L.push(`- **Moved** to where they really belong: ${result.counts.moved} (${Object.values(moves).filter((m) => m.level === 'topic').length} to a different topic)`);
  L.push(`- **Copies dropped** (wrongly filed copy of a question already filed correctly): ${result.counts.droppedCopies}`);
  L.push(`- **Not offered under its topic** (clearly wrong topic, right one unclear): ${result.counts.offTopicOnly}`);
  L.push(`- **Figure missing** (question asks about a picture we do not have, never auto-picked): ${result.counts.figureGaps}`);
  L.push(`- **Doubtful, left where they are**: ${doubtful.length}`, '');
  L.push('## Moved', '');
  const order = (a, b) => (a[1].level === b[1].level ? (b[1].score || 0) - (a[1].score || 0) : a[1].level === 'topic' ? -1 : 1);
  for (const [id, m] of Object.entries(moves).sort(order)) L.push(`- \`${id}\` ${m.from} -> **${m.topic} / ${m.subtopic}** (${m.level || 'hand'}, ${m.score || ''}): ${short(byId.get(id))}`);
  L.push('', '## Copies dropped', '');
  for (const [id, m] of Object.entries(dropped)) L.push(`- \`${id}\` (${m.from}) kept as \`${m.kept}\`: ${short(byId.get(id))}`);
  L.push('', '## Not offered under its topic', '');
  for (const [id, m] of Object.entries(offTopic)) L.push(`- \`${id}\` ${m.from} (likely ${m.likely}): ${short(byId.get(id))}`);
  L.push('', '## Doubtful (left alone)', '');
  for (const d of doubtful.sort((a, b) => b.r.margin - a.r.margin)) L.push(`- \`${d.q.id}\` ${d.q.subtopic} (rank ${d.r.ownRank}) vs ${d.best.subtopic} (${d.r.margin.toFixed(2)}): ${short(d.q)}`);
  L.push('', '## Figure missing', '');
  for (const [id, g] of Object.entries(gaps)) L.push(`- \`${id}\` ${g}`);
  fs.writeFileSync(REPORT, L.join('\n') + '\n', 'utf8');
  console.log(JSON.stringify(result.counts));
  console.log('report: ' + path.relative(ROOT, REPORT));
}

if (require.main === module) main();
module.exports = { tokens, figureGap };
