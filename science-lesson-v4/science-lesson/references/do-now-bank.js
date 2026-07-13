#!/usr/bin/env node
'use strict';
/* ============================================================================
   do-now-bank.js — spaced-retrieval Do Now selector + exam-question sourcing.

   Goal (Patryk): stop authoring six fresh Do Now questions every lesson. Instead
   keep a per-class bank of tagged questions and PICK six per lesson, leaning on
   older topics so pupils re-retrieve them (spaced retrieval — the best-evidenced
   classroom technique). For KS4 the low-demand questions are grounded in real AQA
   exam parts he has indexed, so pupils practise the exact recall the exam wants.

   This module is pure and deterministic (seedable) so it can be simulated on this
   year's lesson log now and tested in the harness, long before September classes
   exist. Nothing here calls a paid API or touches Drive.

   Design decided with a second-opinion consult (2026-07-12) — see
   specs/do-now-bank.md. Plain-English summary lives there too.
   ============================================================================ */

/* ---- exam-question sourcing --------------------------------------------------
   Turn an exam-library-index.json (parts[] with marks / commandWord / hasFigure /
   ms) into Do Now candidates. A Do Now question must be short recall (AO1), not a
   four-mark "explain" that eats ten minutes. We FILTER, never rewrite — splitting
   an exam part would break its real mark-scheme join, which is the whole value. */

// Command words that ask for short recall. Anything asking to explain/evaluate/
// describe-at-length is left for Apply/review, not a Do Now.
const RECALL_COMMANDS = new Set([
  'state', 'name', 'give', 'identify', 'write down', 'what is', 'define',
  'calculate', 'complete', 'label', 'choose', 'select',
]);

function isDoNowCandidate(part) {
  if (!part) return false;
  if ((part.marks || 0) > 2) return false;                 // 1–2 mark parts only
  if (part.hasFigure) return false;                        // figures are a slide + time trap
  if (part.ms && Array.isArray(part.ms.levels) && part.ms.levels.length) return false; // levelled = extended
  const cw = String(part.commandWord || '').toLowerCase().trim();
  return RECALL_COMMANDS.has(cw);
}

// The mark-scheme text carries scoring noise ("allow…", "ignore…", "1"). Trim to
// the creditworthy answer so slide 2 shows something clean. Keeps the FIRST
// acceptable answer; the notes already list the allows for the teacher.
function tidyAnswer(ms) {
  if (!ms || !ms.text) return '';
  let t = String(ms.text);
  // cut everything from the first scheme keyword onward
  const cut = t.search(/\b(allow|accept|ignore|do not accept|or\b.*\bfor\b)\b/i);
  if (cut > 0) t = t.slice(0, cut);
  return t.replace(/\s*\b\d\b\s*$/, '').replace(/\s+/g, ' ').trim();
}

// examPartsToBank(index, opts) → [{ id, text, answer, type, subject, topic, KS,
//   AO, marks, source:'exam', examRef }]. examRef ties a bank question back to the
// exam part it came from so we never lose the real-exam provenance.
function examPartsToBank(index, opts) {
  const o = opts || {};
  const parts = (index && index.parts) || [];
  const subject = (index && index.subject) || o.subject || '';
  const topic = (index && index.topic) || o.topic || '';
  const ks = o.KS || 'KS4';
  const out = [];
  for (const p of parts) {
    if (!isDoNowCandidate(p)) continue;
    const ref = `${subject}-${topic}-Q${p.question}${p.part || ''}`.replace(/\s+/g, '_');
    out.push({
      id: 'exam-' + ref.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      text: p.text,
      answer: tidyAnswer(p.ms),
      type: (p.commandWord || '').toLowerCase() === 'calculate' ? 'calculate' : 'recall',
      subject, topic: p.subtopic || topic, KS: ks, AO: 'AO1',
      marks: p.marks || 1,
      source: 'exam',
      examRef: ref,
    });
  }
  return out;
}

/* ---- the selector ------------------------------------------------------------
   Spaced retrieval WITHOUT per-pupil data (we don't have it). We know, per class,
   which topics were taught and when (from lesson-log.json) and which question IDs
   were used recently. That is enough for class-level spacing, which is what real
   teachers do with a retrieval starter.

   Buckets by how long ago a topic was taught (0 = the lesson just gone):
     last lesson         → 1 question   (yesterday's content, still fresh)
     2–4 lessons ago     → 2 questions  (the sweet spot for spacing)
     5+  lessons ago     → 2 questions  (older, stops it fading)
     current/prerequisite→ 1 question   (sets up today)
   Total 6. Weights are data, not buried logic — pass your own via opts.plan. */

const DEFAULT_PLAN = [
  { label: 'last lesson',        min: 1, max: 1,        n: 1 },
  { label: '2–4 lessons ago',    min: 2, max: 4,        n: 2 },
  { label: '5+ lessons ago',     min: 5, max: Infinity, n: 2 },
  { label: 'today / prerequisite', current: true,       n: 1 },
];

// Small deterministic PRNG (mulberry32) so a given (class, lesson) picks the same
// questions every build — a Do Now that reshuffles on rebuild would confuse.
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* selectDoNow({ bank, history, currentTopic, count=6, plan, recentWindow=4, seed })
     bank         — this class's question objects (exam-sourced + generated)
     history      — ordered oldest→newest list of prior lessons for THIS class:
                    [{ topic, questionIds:[] }]  (from lesson-log.json)
     currentTopic — today's topic (for the prerequisite slot + dedup tagging)
   Returns { picked:[q…], report:{ buckets:[{label,filled,wanted}], reused:false,
     gaps:[topic…], shortfall:n } }.  Never throws; returns as many as it can. */
function selectDoNow(opts) {
  const o = opts || {};
  const bank = Array.isArray(o.bank) ? o.bank : [];
  const history = Array.isArray(o.history) ? o.history : [];
  const count = o.count || 6;
  const plan = o.plan || DEFAULT_PLAN;
  const recentWindow = o.recentWindow == null ? 4 : o.recentWindow;
  const rand = rng(o.seed != null ? o.seed >>> 0 : hashSeed((o.currentTopic || '') + '|' + history.length));

  // lessons-since-taught per topic: walk history newest→oldest, first hit wins.
  const sinceByTopic = new Map();
  for (let i = history.length - 1, ago = 1; i >= 0; i--, ago++) {
    const t = norm(history[i].topic);
    if (t && !sinceByTopic.has(t)) sinceByTopic.set(t, ago);
  }

  // Questions used in the last `recentWindow` lessons — never repeat these.
  const recentIds = new Set();
  history.slice(-recentWindow).forEach((h) => (h.questionIds || []).forEach((id) => recentIds.add(id)));

  const curTopic = norm(o.currentTopic);
  const used = new Set();
  const shuffle = (arr) => arr.map((v) => [rand(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

  // Assign each eligible bank question the age of its topic (or "current").
  const withAge = bank
    .filter((q) => !recentIds.has(q.id) && !used.has(q.id))
    .map((q) => {
      const t = norm(q.topic);
      const isCurrent = t && t === curTopic;
      return { q, age: sinceByTopic.has(t) ? sinceByTopic.get(t) : null, isCurrent };
    });

  const pickForBucket = (b) => {
    let pool;
    if (b.current) pool = withAge.filter((x) => x.isCurrent && !used.has(x.q.id));
    else pool = withAge.filter((x) => x.age != null && x.age >= b.min && x.age <= b.max && !used.has(x.q.id));
    const chosen = [];
    for (const x of shuffle(pool)) {
      if (chosen.length >= b.n) break;
      chosen.push(x.q); used.add(x.q.id);
    }
    return chosen;
  };

  const picked = [];
  const buckets = [];
  for (const b of plan) {
    const got = pickForBucket(b);
    buckets.push({ label: b.label, wanted: b.n, filled: got.length });
    picked.push(...got);
  }

  // Backfill any shortfall from the widest pool (any not-recent bank question),
  // oldest-first so spacing still wins, so a thin bank still yields a full six.
  if (picked.length < count) {
    const rest = shuffle(withAge.filter((x) => !used.has(x.q.id)))
      .sort((a, b) => (b.age || 0) - (a.age || 0));
    for (const x of rest) {
      if (picked.length >= count) break;
      picked.push(x.q); used.add(x.q.id);
    }
  }

  return {
    picked: picked.slice(0, count),
    report: {
      buckets,
      shortfall: Math.max(0, count - picked.length),
      bankSize: bank.length,
      eligible: withAge.length,
    },
  };
}

module.exports = {
  RECALL_COMMANDS, isDoNowCandidate, tidyAnswer, examPartsToBank,
  DEFAULT_PLAN, selectDoNow, _norm: norm,
};

// CLI: `node do-now-bank.js exam <index.json>` prints how many Do Now candidates
// an exam index yields (a quick sanity check when a new exam doc is added).
if (require.main === module) {
  const fs = require('fs');
  const [cmd, file] = process.argv.slice(2);
  if (cmd === 'exam' && file) {
    const idx = JSON.parse(fs.readFileSync(file, 'utf8'));
    const bank = examPartsToBank(idx);
    console.log(`${bank.length} Do Now candidate(s) from ${idx.parts ? idx.parts.length : 0} exam part(s) in ${idx.subject} — ${idx.topic}`);
    bank.slice(0, 8).forEach((q) => console.log(`  • [${q.marks}m] ${q.text}\n      → ${q.answer}`));
  } else {
    console.log('Usage: node do-now-bank.js exam <exam-library-index.json>');
  }
}
