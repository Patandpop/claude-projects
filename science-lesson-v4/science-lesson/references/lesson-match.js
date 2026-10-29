'use strict';
/* ============================================================================
   lesson-match.js — is this exam question about this lesson? (Patryk 2026-10-15)

   Replaces loose word-overlap matching (satellite questions for "Energy Levels in Atoms",
   villi for "Microscopes", roof insulation for P3 Particles). Uses lesson-match-data.js: per
   lesson, the exam-library subtopics it draws on and the words a question must be about.

   The library's own subtopic labels are not always right (the A-level "Stars" file holds a
   satellite question), so a question needs BOTH the right area and the lesson's words. Before
   calling something a miss it tries, in order:
     tier 1  right subtopic, lesson words in the question
     tier 2  right subtopic, lesson words only in the mark scheme (short stems: "Calculate the...")
     tier 3  another subtopic of the same topic, with the lesson's own words (a GPE question
             filed under Efficiency)
     tier 4  any subtopic of the same subject, clearly about the lesson (2+ of its words incl. a
             "need" word): catches questions the library filed under the wrong subtopic
   Never a match on zero lesson words.

   specFor(lesson)            -> { key, subs:Set|'*', words, need, min, none, why } | null
   match(q, spec)             -> { ok, tier, score, hits, why }
       q = { text, ms, subtopic, subject }
   standalone(text, hasFigure)-> '' or the reason a part can't be used on its own
   ============================================================================ */

const DATA = require('./lesson-match-data.js');

const norm = (s) => ' ' + String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9µ²βλ.\-/ ]+/g, ' ')
  .replace(/\s+/g, ' ').trim() + ' ';
const tokens = (n) => n.trim().split(' ').map((t) => t.replace(/^[.\-/]+|[.\-/]+$/g, '')).filter(Boolean);
const key = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
// spelling slips in folder names ("Photosythesis", "Strucutre", "Componds"): same letters, any order
const loose = (s) => key(s).split('').sort().join('');

function parseWords(s) { return String(s || '').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean); }
function parseEntry(str, topicSubs) {
  if (str === 'none') return { none: true };
  const out = { words: [], need: [], subs: topicSubs, topicSubs, min: 1 };
  String(str).split('|').forEach((seg, i) => {
    const m = seg.match(/^\s*(need|subs|min)\s*:\s*(.*)$/i);
    if (!m && i === 0) out.words = parseWords(seg);
    else if (m && m[1] === 'need') out.need = parseWords(m[2]);
    else if (m && m[1] === 'subs') out.subs = parseSubs(m[2]);
    else if (m && m[1] === 'min') out.min = Math.max(1, Number(m[2]) || 1);
  });
  out.words = [...new Set([...out.words, ...out.need])];
  return out;
}
function parseSubs(s) { return String(s).trim() === '*' ? '*' : new Set(String(s).split(';').map((x) => key(x)).filter(Boolean)); }
// "Simple Models; Symbols; RAM; Charge; Isotopes" is ONE library name with semicolons in it: join the
// known multi-part names back up by checking against the full names when matching (key() drops ';').
function subsHas(subs, subtopic) {
  if (subs === '*') return true;
  const k = key(subtopic);
  if (subs.has(k)) return true;
  // a library name containing ';' was split into pieces: all pieces present = that name
  const parts = String(subtopic || '').split(';').map(key).filter(Boolean);
  return parts.length > 1 && parts.every((p) => subs.has(p));
}

// One word from the map found in a question?
function has(n, toks, w) {
  if (w.includes(' ')) return n.includes(' ' + w + ' ') || n.includes(' ' + w);
  if (w.length < 4) return toks.some((t) => t === w || t === w + 's');
  return toks.some((t) => t.startsWith(w));
}
// Answering instructions are not what a question is about ("drawing a ring around" is not a
// Biological Drawings question, 2026-10-29).
const INSTRUCTIONS = / (by )?draw(ing)? a (ring|circle) around( the correct (answer|word|line)s?)?(?= )| tick (one|two|three) box(es)?(?= )| complete the (sentence|table|diagram)s?(?= )/g;
function hitsIn(text, words) {
  const n = norm(text).replace(INSTRUCTIONS, ' '), toks = tokens(n);
  return words.filter((w) => has(n, toks, w));
}
// How many DIFFERENT lesson words: "atmosphere" and "atmospher" in one map are one hit, not two
// (2026-10-29). Counting only; the need-word check still sees every hit.
function distinct(hits) {
  return hits.filter((w) => w.includes(' ') || !hits.some((x) => x !== w && !x.includes(' ') && x.startsWith(w))).length;
}

// -------------------------------------------------------------- lesson lookup
function findTopic(topic) {
  if (!topic) return null;
  if (DATA[topic]) return topic;
  const k = key(topic), l = loose(topic);
  const keys = Object.keys(DATA);
  return keys.find((t) => key(t) === k) || keys.find((t) => loose(t) === l) ||
    // "P3 Particles 9XS" or "Chapter 20 - Cosmology (13D)": starts with a known topic
    keys.find((t) => k.startsWith(key(t))) || null;
}
const REVISION = /\b(revision|review|summary|consolidat|recap)\b/i;
const NO_EXAM = /\b(assessment|dirt|formative|marking point|self study|test)\b/i;

/* specFor({ topic|macrotopic, title }) */
function specFor(lesson) {
  const topic = findTopic(lesson.topic || lesson.macrotopic);
  const title = String(lesson.title || '').trim();
  if (!topic) return null;
  const T = DATA[topic], tsubs = parseSubs(T.subs);
  if (NO_EXAM.test(title) && !REVISION.test(title)) return { key: topic + ' / ' + title, none: true, why: 'an assessment lesson' };
  if (REVISION.test(title)) {
    // revision / review: every lesson of the topic
    const all = Object.values(T.L).filter((s) => s !== 'none').map((s) => parseEntry(s, tsubs));
    const subs = all.some((e) => e.subs === '*') ? '*' : new Set(all.flatMap((e) => [...e.subs]));
    return { key: topic + ' / ' + title, subs, words: [...new Set(all.flatMap((e) => e.words))], need: [], min: 1, any: all, revision: true };
  }
  const lk = Object.keys(T.L);
  const want = key(title), wl = loose(title);
  let hit = lk.find((t) => key(t) === want) || lk.find((t) => loose(t) === wl);
  if (!hit) {   // a renamed or added lesson: the listed title sharing the most words with it
    const tw = tokens(norm(title)).filter((w) => w.length > 3);
    let best = 0;
    for (const t of lk) {
      const n = tokens(norm(t)).filter((w) => w.length > 3);
      const s = tw.filter((w) => n.some((x) => x.slice(0, 5) === w.slice(0, 5))).length;
      if (s > best && s >= Math.min(2, tw.length)) { best = s; hit = t; }
    }
  }
  if (hit) {
    const e = parseEntry(T.L[hit], tsubs);
    if (e.none) return { key: topic + ' / ' + hit, none: true, why: 'no exam questions for this kind of lesson' };
    return Object.assign({ key: topic + ' / ' + hit }, e);
  }
  // not in the map at all: its own title words, within the topic's subtopics
  const words = tokens(norm(title)).filter((w) => w.length > 3 && !/^(lesson|required|practical|theory|part|introduction|higher|separate|core)$/.test(w)).map((w) => w.slice(0, Math.max(4, w.length - 2)));
  if (!words.length) return { key: topic + ' / ' + title, none: true, why: 'title has no words to match on' };
  return { key: topic + ' / ' + title + ' (from its title)', subs: tsubs, words, need: [], min: 1, guessed: true };
}

// -------------------------------------------------------------- matching
function scoreOne(q, e) {
  const subOk = subsHas(e.subs, q.subtopic);
  const th = hitsIn(q.text, e.words), mh = q.ms ? hitsIn(q.ms, e.words) : [];
  const needOk = (h) => !e.need.length || h.some((w) => e.need.includes(w));
  if (subOk && th.length >= e.min && needOk(th)) return { ok: true, tier: 1, score: th.length, hits: th };
  // only the mark scheme names it: needs two of the lesson's words there (one word in an answer is too thin:
  // "starch" in a respiration answer is not a Starch in Leaves question)
  const both = [...new Set([...th, ...mh])];
  if (subOk && both.length >= Math.max(2, e.min) && needOk(both)) return { ok: true, tier: 2, score: both.length / 2, hits: both };
  // the same topic, a neighbouring subtopic (a GPE question filed under Efficiency), with the lesson's own words
  if (!subOk && e.topicSubs && subsHas(e.topicSubs, q.subtopic) && th.length >= e.min && needOk(th) && (e.need.length || distinct(th) >= 2 || e.words.length <= 2)) return { ok: true, tier: 3, score: th.length / 2, hits: th };
  // filed under another subtopic: needs to be clearly about this lesson
  const strong = e.need.length ? th.filter((w) => e.need.includes(w)) : th;
  if (!subOk && distinct(th) >= Math.max(2, e.min + 1) && strong.length >= 1 && (!q.subject || !e.subject || q.subject === e.subject)) return { ok: true, tier: 4, score: th.length / 3, hits: th };
  return { ok: false, tier: 0, score: 0, hits: th, why: subOk ? (th.length ? 'not the words this lesson needs' : 'none of the lesson words') : 'another area of the course' };
}
function match(q, spec) {
  if (!spec) return { ok: false, tier: 0, score: 0, why: 'lesson not in the map' };
  if (spec.none) return { ok: false, tier: 0, score: 0, why: spec.why };
  if (spec.revision) {
    let best = { ok: false, tier: 0, score: 0, why: 'not about any lesson in this topic' };
    for (const e of spec.any) { const r = scoreOne(q, e); if (r.ok && (!best.ok || r.tier < best.tier || (r.tier === best.tier && r.score > best.score))) best = r; }
    return best;
  }
  return scoreOne(q, spec);
}
// Higher = better: tier first, then how many lesson words.
const rank = (r) => (r && r.ok ? (5 - r.tier) * 100 + r.score : -1);

// -------------------------------------------------------------- standalone parts
/* A question PART used on its own (a Do Now) must make sense without the rest of the question.
   OCR exports in particular split a question's data across parts (2026-10-15). */
function standalone(text, hasFigure) {
  const t = String(text || '');
  if (/\b(in|from|of|to|using) (part )?\(?[a-h]\)?\s*(\(?[ivx]+\)?)?\s*(above|below)?\b(?=[^a-z]|$)/i.test(t) && /\(([a-h]|[ivx]+)\)/i.test(t.replace(/^\s*\(([a-h]|[ivx]+)\)/i, ''))) return 'refers to another part of the question';
  if (/\b(your answer to|calculated in|found in|from your answer|the value (you )?(calculated|found)|answer to part|in part \(|in \([a-h]\))/i.test(t)) return 'refers to another part of the question';
  if (!hasFigure && /\b(fig\.?\s*\d|figure \d|the (diagram|graph|table|figure|photograph|data|results)( (below|above|shown))?|shown (below|above)|in the table|on the graph)\b/i.test(t)) return 'needs a picture or table it does not have';
  // "person A", "sample B", "Planet X": a labelled item from a table or picture the part does not carry
  if (!hasFigure && /\b(person|people|student|patient|sample|planet|athlete|tube|beaker|test tube|wire|point|position|graph|table|figure|diagram|line|curve|substance|metal|solution|liquid|object) [A-Z]\b/.test(t)) return 'names a labelled item from a picture or table it does not have';
  if (/^\s*[a-z]/.test(t.replace(/^\s*\(([a-h]|[ivx]+)\)\s*/i, ''))) return 'starts mid-sentence (lost its opening)';
  if (/\b(calculate|work out|determine|how many|how much)\b/i.test(t) && !/\d/.test(t)) return 'a calculation with no numbers in it';
  return '';
}

module.exports = { specFor, match, rank, standalone, hitsIn, distinct, findTopic, DATA };
