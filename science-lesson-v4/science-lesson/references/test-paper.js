#!/usr/bin/env node
'use strict';
/* ============================================================================
   test-paper.js — EXAM PRACTICE homework in the layout of Patryk's real tests (home only).

   Patryk 2026-10-10: the real tests come from the scheme (Admin/Assessment) and are sat in class.
   This makes EXAM PRACTICE for pupils to work through AT HOME, never in class: a printed paper and
   the same questions as a Google Forms quiz (multiple choice marks itself; written answers are
   checked by pupils against the real mark scheme shown after they submit).

   Layout modelled on Admin/Assessment/Year 10/Physics/P1 Energy: a short front sheet (Name, Class,
   Score), questions in the exam export layout ("Q1.", (a) (b), answer lines, "(3)" on the right,
   "(Total 8 marks)", the real figures), and a separate mark scheme. No feedback grid: the school's
   tests carry their own, and exam practice does not need one.
   KS3 and KS4: a CORE paper and a CHALLENGE paper (easier / harder by the examiners' own pass rates).
   KS5 (12C, 13D): one paper in the real A-level layout (Section A multiple choice, Section B
   structured, marks in [ ]), OCR A only, never AQA.

   Every question and mark scheme is verbatim from the exam library; nothing is invented.
   Questions used are recorded as that class's homework (exam-usage.json "<cls>:homework") so they
   are not repeated in later homework, Do Nows or board questions.

   Saved to (the only Drive place this script writes, each file logged in upload-log.txt):
     G:/My Drive/Beechen Cliff Science/Admin/Homework/Exam Practice/Year X/<Subject>/<Topic>/
   With NO_UPLOAD=1 or no G: drive: homework-out/exam-practice/<class>/ (local).
   The Forms quiz file goes to Admin/Planner Sync (homework-<class>-<due>[-core|-challenge].json);
   the school planner's Homework tab previews it and makes the Form + Classroom draft.

   Usage
     node references/test-paper.js --class 10C2 --topics "P1 Energy"            (core + challenge, mini)
     node references/test-paper.js --class 10S2 --topics "P1,P2" --size full
     node references/test-paper.js --class 8XP --topics "Respiration,Photosynthesis"
     node references/test-paper.js --class 13D --topics "Stars,Cosmology"         (A-level layout)
       --size mini|full     mini ≈ 20 min at home (KS3 20, KS4 25, KS5 30 marks); full ≈ 45 min (40 / 45 / 60)
       --marks N            exact mark target instead of --size
       --tier core|challenge only one of the two papers (KS3/KS4)
       --in-class           front sheet worded as an in-class test, not homework
       --ids "id1,id2"      hand-picked questions (library ids, e.g. Physics-Waves-Electromagnetic-Waves-3#Q14), one paper, in that order
       --match "a,b,c"      only questions whose wording mentions one of these words (narrows a broad topic)
       --due YYYY-MM-DD     when the Form is due (default a week today)
       --no-form            paper only, no Forms quiz file
       --out <folder>       save the papers here instead
       --dry-run            list the questions, write nothing, record nothing
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType, ImageRun, TableLayoutType, VerticalAlign,
} = require('docx');
const hb = require('./homework-booklet.js');
const { applyToCatalogue } = require('./exam-categories-apply.js');
const ep = require('./exam-pick.js');
const { categorise } = require('./exam-categorise.js');
const { friendlyMs, msPlain, markPoints, numberAnswer, MS_KEY } = require('./ms-friendly.js');

const ROOT = path.join(__dirname, '..', '..');
const LIB = path.join(ROOT, 'exam-library');
const FIGS = path.join(LIB, 'figures');
const USAGE = path.join(ROOT, 'exam-usage.json');
const FONT = 'Arial';                       // exam papers are Arial, not the lesson house font
const SZ = 24;                              // 12pt (2026-10-15: 11pt read cramped)
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return d; } };
const ENT = { rarr: '→', larr: '←', bull: '•', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', deg: '°', times: '×', divide: '÷', minus: '−', lambda: 'λ', Delta: 'Δ', delta: 'δ', theta: 'θ', mu: 'μ', Omega: 'Ω', sigma: 'σ', pi: 'π', rho: 'ρ', le: '≤', ge: '≥', asymp: '≈', ndash: '–', mdash: '–', frac12: '½' };
const decode = (s) => String(s || '').replace(/&([a-zA-Z]+\d*);/g, (m, k) => (ENT[k] != null ? ENT[k] : m)).replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n));
const clean = (s) => decode(s).replace(/\[FIG:\d+\]|\[FIGURE\]/g, ' ').replace(/\[TABLE:\d+\]/g, ' (table on the paper copy) ').replace(/[ \t]{2,}/g, ' ').trim();
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3);
const pre6 = (w) => w.slice(0, 6);

/* ------------------------------------------------------------------ which questions */

function classInfo(cls) {
  const d = readJson(path.join(ROOT, 'class-defaults.json'), {});
  const c = (d.classes || d)[cls];
  if (!c) throw new Error(`${cls}: not in class-defaults.json`);
  return c;
}

// "P1 Energy" / "P1" -> AQA topic (Years 9-11 use the AQA codes); otherwise match words against the
// library's topic and subtopic names, forgiving spelling slips ("Photosythesis").
function aqaTargets(year, topics, subjects, catalogue) {
  const names = new Map();   // "subject|topic|subtopic" -> {subject, topic, subtopic}
  for (const r of catalogue.parts) if (subjects.includes(r.subject)) names.set(`${r.subject}|${r.topic}|${r.subtopic}`, { subject: r.subject, topic: r.topic, subtopic: r.subtopic });
  const want = [];
  for (const t of topics) {
    const code = (String(t).trim().match(/^([BCP]\d+)\b/i) || [])[1];
    if (code && year >= 9 && ep.AQA_TOPIC[code.toUpperCase()]) {
      const topic = ep.AQA_TOPIC[code.toUpperCase()];
      for (const n of names.values()) if (n.topic === topic) want.push(n);
      continue;
    }
    const tw = words(String(t).replace(/^[BCP]\d+\s*/i, '')).map(pre6);
    const hits = [...names.values()].filter((n) => {
      const sub = words(n.subtopic).map(pre6), top = words(n.topic).map(pre6);
      return tw.some((w) => sub.includes(w)) || tw.every((w) => top.includes(w));
    });
    want.push(...hits);
  }
  return want;
}

// Whole questions (all parts, in order) for the chosen subtopics, with their figures.
function aqaQuestions(targets, catalogue) {
  const keys = new Set(targets.map((t) => `${t.subject}|${t.topic}|${t.subtopic}`));
  const rows = catalogue.parts.filter((r) => keys.has(`${r.subject}|${r.topic}|${r.subtopic}`));
  const groups = new Map();
  for (const r of rows) { const k = `${r.doc}#Q${r.q}`; if (!groups.has(k)) groups.set(k, r); }
  const docCache = new Map();
  const load = (d) => { if (!docCache.has(d)) docCache.set(d, readJson(path.join(LIB, 'docs', d + '.json'), { parts: [] })); return docCache.get(d); };
  const out = [];
  for (const [id, r] of groups) {
    const parts = load(r.doc).parts.filter((p) => p.question === r.q);
    if (!parts.length || parts.some((p) => !p.ms || !p.ms.text)) continue;          // a real scheme for every part, or not used
    const marks = parts.reduce((n, p) => n + (p.marks || 0), 0);
    if (!marks) continue;
    const rates = parts.map((p) => p.passRate).filter((x) => x != null);
    const text = parts.map((p) => clean(p.text)).join(' ');
    // a figure the library never recovered, or a question cut off at the start: never printed
    const refs = [...text.matchAll(/\bFigure\s+(\d+)/gi)].map((m) => +m[1]);
    const nFigs = new Set(parts.flatMap((p) => p.figureFiles || [])).size;
    if ((refs.length && Math.max(...refs) > nFigs) || parts.some((p) => /^[a-z]/.test(clean(p.text)))) continue;
    if (parts.some((p) => clean(p.text).trim().length < 12)) continue;                         // a part whose words were lost in the export (2026-10-15: blank 10S2 question)
    if (!nFigs && /\b(figure|diagram|graph|table) (below|above)\b|shown (below|above)/i.test(text)) continue;
    if (missingData(parts)) continue;
    // the library keeps a table's words but not its rows and columns: a table or matching task reads as a jumble
    if (/\btable\b|draw (one|a) line from each|list a\b|complete the (table|chart)/i.test(text)) continue;
    out.push({
      id, board: 'AQA', subject: r.subject, topic: r.topic, subtopic: r.subtopic, parts, marks,
      passRate: rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null,
      difficulty: parts.reduce((n, p) => n + (p.difficulty || 50), 0) / parts.length,
      key: text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 120),
    });
  }
  // the same question filed under two subtopics: once
  const seen = new Set();
  return out.filter((q) => (seen.has(q.key) ? false : seen.add(q.key)));
}

// OCR A-level (12C, 13D): whole questions, with their pictures and tables (kept since 2026-10-10).
function ocrQuestions(topics) {
  const dir = path.join(LIB, 'docs-ocr');
  const tw = topics.map((t) => words(t).map(pre6));
  const out = [];
  const figsOk = (p) => !p.figuresMissing && (p.figureFiles || []).every((f) => f && fs.existsSync(path.join(FIGS, f))) &&
    ((p.ms || {}).figureFiles || []).every((f) => f && fs.existsSync(path.join(FIGS, f)));
  for (const f of fs.readdirSync(dir)) {
    const d = readJson(path.join(dir, f), null);
    if (!d) continue;
    const byQ = new Map();
    for (const p of d.parts) { const k = `${f.replace(/\.json$/, '')}#Q${p.question}`; if (!byQ.has(k)) byQ.set(k, []); byQ.get(k).push(p); }
    for (const [id, parts] of byQ) {
      const name = words((parts[0].subsubtopic || '') + ' ' + (parts[0].subtopic || '')).map(pre6);
      if (!topics.includes('*') && !tw.some((t) => t.length && t.every((w) => name.includes(w)))) continue;
      const total = parts[0].questionTotalMarks, sum = parts.reduce((n, p) => n + (p.marks || 0), 0);
      if (!total || sum !== total) continue;
      // since 2026-10-10 the library keeps the pictures and tables: a question is used when every
      // picture it (or its mark scheme) needs was found, and never when it points at a figure it lacks
      if (!parts.every(figsOk)) continue;
      const allText = clean(parts.map((p) => p.text).join(' '));
      const refs = [...allText.matchAll(/\bFig(?:ure|\.)\s*\d/gi)].length;
      if (refs && !parts.some((p) => (p.figureFiles || []).length || (p.tables || []).length)) continue;
      // OCR exports can drop a part's table or data (2026-10-15): a question that talks about "the table"
      // or "the data" with no table or picture anywhere is not printed
      if (/\b(the|this) (table|data|results) (below|above|shows|in)\b|\btable \d/i.test(allText) && !parts.some((p) => (p.figureFiles || []).length || (p.tables || []).length)) continue;
      // a later part that points back at information the export lost ("the value in (b)" with nothing in (b))
      if (parts.slice(1).some((p) => /\b(from|in|using) \(([a-h])\)/i.test(p.text) && !parts.some((x) => x.part && x.part[0] === (p.text.match(/\b(?:from|in|using) \(([a-h])\)/i) || [])[1]))) continue;
      if (/^[a-z]/.test(clean(parts[0].text))) continue;                             // cut off at the start
      const ms = (parts[0].ms || {}).text;
      if (!ms) continue;
      if (/^(stars|cosmology|electromagnetic radiation from stars)$/i.test(parts[0].subsubtopic || '') &&
        /\b(satellite|orbit|gravitational (potential|field)|kepler|escape velocity|geostationary)\b/i.test(allText) && !/\bstar|galax|universe/i.test(allText)) continue;
      const p0 = parts[0];
      const mcq = parts.length === 1 && !!p0.mcqAnswer && Array.isArray(p0.mcqOptions) && p0.mcqOptions.length === 4;
      if (parts.length === 1 && !mcq && /^\s*[A-D]\s*(\n\s*1)?\s*$/.test(ms)) continue;   // a lettered answer with no options to show
      out.push({ id, board: 'OCR A', subject: 'Physics', topic: p0.subsubtopic || p0.subtopic, subtopic: p0.subsubtopic || p0.subtopic,
        parts, marks: total, mcq, options: mcq ? p0.mcqOptions.map((o) => o.replace(/^[A-D]\s+/, '')) : null, optionsInFigure: !!p0.optionsInFigure,
        answer: mcq ? p0.mcqAnswer : null, passRate: null, difficulty: 50 + total, key: allText.toLowerCase().slice(0, 120) });
    }
  }
  const seen = new Set();
  return out.filter((q) => (seen.has(q.key) ? false : seen.add(q.key)));
}

// Data the export lost (2026-10-15: 11S2 Q1 asked about "the results from this experiment" with no results).
//   - a part talks about the results / data / readings / table / graph but no picture or table carries them
//   - a calculation's mark-scheme working uses numbers that appear nowhere in the question so far
const COMMON = new Set(['0', '1', '2', '3', '4', '5', '10', '100', '1000', '60', '3600', '0.5', '9.8', '10.0', '4200', '24', '365']);
function missingData(parts) {
  let seen = '';
  for (const p of parts) {
    const t = clean(p.text), pics = (p.figureFiles || []).length || (p.tables || []).length;
    seen += ' ' + t;
    if (!pics && /\b(the|these|his|her|their|our|the student'?s) (results|data|readings|measurements)\b|\bthe (table|graph|bar chart)\b/i.test(t) &&
        (t.match(/\d+(\.\d+)?/g) || []).length < 3 && !parts.some((x) => (x.figureFiles || []).length > 1 || (x.tables || []).length)) return true;
    if (/\b(calculate|work out|determine)\b/i.test(t) && !pics) {
      const ms = String((p.ms && p.ms.text) || '');
      const work = ms.match(/\d[\d.]*\s*[×÷/]\s*\d[\d.]*(\s*[×÷/]\s*\d[\d.]*)*/);
      if (work) {
        const nums = work[0].split(/\s*[×÷/]\s*/).map((x) => x.replace(/\.$/, ''));
        const have = new Set((seen.replace(/(\d) (\d{3})\b/g, '$1$2').match(/\d+(\.\d+)?/g) || []).map((x) => String(Number(x))));
        if (nums.some((x) => !COMMON.has(String(Number(x))) && !have.has(String(Number(x))))) return true;
      }
    }
  }
  return false;
}

// Fill a mark target from a list (already in preference order), never more than +3 over.
function fill(list, target, maxShare) {
  const out = []; let got = 0;
  const perSub = new Map();
  for (const q of list) {
    if (got >= target) break;
    if (got + q.marks > target + 3) continue;
    const n = perSub.get(q.subtopic) || 0;
    if (maxShare && n + q.marks > Math.max(8, target * maxShare)) continue;   // spread over the subtopics
    out.push(q); got += q.marks; perSub.set(q.subtopic, n + q.marks);
  }
  if (got < target) for (const q of list) { if (got >= target) break; if (!out.includes(q) && got + q.marks <= target + 3) { out.push(q); got += q.marks; } }
  return out;
}

const lm = require('./lesson-match.js');
// What a paper covers (Patryk 2026-10-15, planner test controls):
//   o.taught    : every lesson the class has had so far (planner record), each question matched to one
//                 of those lessons (lesson-match.js), spread evenly across them
//   o.allTopics : the whole course for the subjects Patryk teaches the class (Year 11 general revision),
//                 spread evenly across the topics
//   o.topics    : chosen topics (as before), still checked against the topic's lessons
function taughtLessons(o) {
  if (o._taught) return o._taught;
  const dp = require('./do-now-pick.js');
  o._taught = dp.taughtFor(o.cls, o.date || new Date().toISOString().slice(0, 10))
    .map((L) => ({ L, spec: lm.specFor({ topic: L.topic, title: L.title }) })).filter((x) => x.spec && !x.spec.none);
  return o._taught;
}
// The lesson a question belongs to, best match first; null = about none of them.
function lessonOf(q, specs, notYet) {
  let best = null, br = -1;
  const ms = (q.parts || []).map((p) => (p.ms && p.ms.text) || '').join(' ');
  const text = clean((q.parts || []).map((p) => p.text).join(' '));
  if (notYet && notYet.length && lm.hitsIn(text, notYet).length) return null;
  for (const x of specs) {
    const r = lm.match({ text, ms, subtopic: q.subtopic, subject: q.subject }, x.spec);
    if (r.ok && lm.rank(r) > br) { br = lm.rank(r); best = x.spec.key; }
  }
  return best;
}
// Fill a mark target taking one question from each group in turn (each group in preference order),
// so every lesson or topic gets its share instead of the easiest topic taking the paper.
function spreadFill(list, target, groupOf) {
  const groups = new Map();
  for (const q of list) { const g = groupOf(q); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(q); }
  const out = []; let got = 0, moved = true;
  while (got < target && moved) {
    moved = false;
    for (const [, qs] of groups) {
      if (got >= target) break;
      const i = qs.findIndex((q) => got + q.marks <= target + 3);
      if (i < 0) continue;
      const [q] = qs.splice(i, 1);
      out.push(q); got += q.marks; moved = true;
    }
  }
  return out;
}
const minutesToMarks = (min, ks) => Math.max(8, Math.round(min * (ks === 'ks3' ? 1 : 1.25)));   // mini = 20 minutes = 25 marks (KS3: a mark a minute)

const SIZES = { mini: { ks3: 20, ks4: 25, ks5: 30 }, full: { ks3: 40, ks4: 45, ks5: 60 } };   // mini is the default (Patryk 2026-10-10)

function choose(o) {
  const info = classInfo(o.cls);
  const year = info.year, ks = year >= 12 ? 'ks5' : year >= 9 ? 'ks4' : 'ks3';
  const target = o.marks || (o.minutes ? minutesToMarks(o.minutes, ks) : SIZES[o.size === 'full' ? 'full' : 'mini'][ks]);
  const taught = o.taught ? taughtLessons(o) : null;
  if (o.taught && !taught.length) throw new Error(`${o.cls}: the planner has no taught lessons recorded yet`);
  if (o.taught) o.topics = [...new Set(taught.map((x) => x.L.topic))];
  if (!o.topics || !o.topics.length) {
    if (!o.allTopics) throw new Error('say which topics (or use --taught / --all-topics)');
  }
  // the lessons a chosen topic covers: a question must be about one of them (2026-10-15 off-topic picks)
  const topicSpecs = !o.taught && !o.allTopics && o.topics ? o.topics.flatMap((t) => {
    const T = lm.findTopic(t);
    return T ? Object.keys(lm.DATA[T].L).map((title) => ({ L: { topic: T, title }, spec: lm.specFor({ topic: T, title }) })).filter((x) => x.spec && !x.spec.none) : [];
  }) : [];
  // "everything so far" for all topics = this year's taught lessons + last year's (Year 11 general revision)
  let covered = taught;
  if (o.allTopics) {
    const data = readJson(path.join(ROOT, 'planner', 'planner-data.json'), { classes: {} });
    const prev = Object.values(data.classes).filter((c) => c.year === year - 1).flatMap((c) => c.seq.map((L) => ({ L, spec: lm.specFor({ topic: L.topic, title: L.title }) })));
    covered = [...taughtLessons(o), ...prev].filter((x) => x.spec && !x.spec.none);
    o.topics = [...new Set(covered.map((x) => x.L.topic))];
  }
  const specs = covered || topicSpecs;
  // the words only lessons NOT yet had use ("diffract" before the diffraction lesson): such questions are out
  const notYet = (() => {
    if (!o.taught && !o.allTopics) return (o.exclude || []).map((w) => w.toLowerCase());
    const had = new Set(specs.map((x) => x.spec.key));
    const hadWords = new Set(specs.flatMap((x) => x.spec.words || []));
    const words = [];
    for (const t of new Set(specs.map((x) => lm.findTopic(x.L.topic)).filter(Boolean).concat(o.allTopics ? Object.keys(lm.DATA).filter((k) => /^P\d/.test(k)) : []))) {
      for (const title of Object.keys(lm.DATA[t].L)) {
        const sp = lm.specFor({ topic: t, title });
        if (!sp || sp.none || sp.revision || had.has(sp.key)) continue;
        (sp.need.length ? sp.need : sp.words).filter((w) => w.length > 4 && !hadWords.has(w)).forEach((w) => words.push(w));
      }
    }
    return [...new Set(words.concat((o.exclude || []).map((w) => w.toLowerCase())))];
  })();
  const usage = readJson(USAGE, {});
  const used = new Set([...(usage[o.cls] || []), ...(usage[o.cls + ':homework'] || []), ...(usage[o.cls + ':test'] || [])]);
  const papers = [];
  if (ks === 'ks5' && o.same) {
    // --same <record .json>: the same questions again (a remake after a layout change), nothing re-picked
    const rec = readJson(o.same, null);
    if (!rec) throw new Error('record not found: ' + o.same);
    const byId = new Map(ocrQuestions(['*']).map((q) => [q.id, q]));
    const get = (id) => { if (!byId.has(id)) throw new Error('not usable or not found: ' + id); return byId.get(id); };
    for (const p of rec.papers) papers.push({ tier: p.tier, sectionA: (p.sectionA || []).map(get), questions: p.questions.map((q) => get(q.ref)) });
  } else if (o.same) {
    // --same <record .json> for GCSE too (2026-10-19): the same questions again after a format change (quiz
    // file v2), nothing re-picked. Section A multiple choice is rebuilt from each question's first part, the
    // same way Section A picks it; practice-bank questions come back from the bank.
    const rec = readJson(o.same, null);
    if (!rec) throw new Error('record not found: ' + o.same);
    const cat = applyToCatalogue(readJson(path.join(LIB, 'catalogue.json'), null));
    const want = new Set(rec.papers.flatMap((p) => [...(p.sectionA || []), ...p.questions.map((q) => q.ref)]).map((id) => String(id).replace(/#Q\d+.*$/, '')));
    const keys = new Map();
    cat.parts.filter((r) => want.has(r.doc)).forEach((r) => keys.set(`${r.subject}|${r.topic}|${r.subtopic}`, { subject: r.subject, topic: r.topic, subtopic: r.subtopic }));
    const byId = new Map(aqaQuestions([...keys.values()], cat).map((q) => [q.id, q]));
    // a question filed under two topics is kept once, under whichever filing comes first: look again
    // with only this question's own topic
    const get = (id) => {
      if (byId.has(id)) return byId.get(id);
      const doc = String(id).replace(/#Q\d+.*$/, ''), r = cat.parts.find((x) => x.doc === doc);
      const q = r && aqaQuestions([{ subject: r.subject, topic: r.topic, subtopic: r.subtopic }], cat).find((x) => x.id === id);
      if (!q) throw new Error('not usable or not found: ' + id);
      return q;
    };
    let bank = [];
    try { bank = require('./mcq-written.js').load(); } catch (e) { /* no practice bank */ }
    const mcqItem = (id) => {
      if (/^practice:/.test(id)) {
        const x = bank.find((b) => 'practice:' + b.id === id);
        if (!x) throw new Error('practice question not found: ' + id);
        return { id, part: '', practice: true, board: 'AQA', subject: 'Physics', topic: x.topic, subtopic: x.topic, marks: 1, options: x.options, answer: x.answer,
          parts: [{ part: '', marks: 1, figureFiles: [], text: x.stem + '\n' + x.options.join('\n'), mcqOptions: x.options, ms: { text: x.answer } }] };
      }
      const q = get(id), p = q.parts[0], c = categorise(p);
      if (!c.mcq) throw new Error('no multiple-choice first part: ' + id);
      return { id: q.id, part: p.part, board: 'AQA', subject: q.subject, topic: q.topic, subtopic: q.subtopic, marks: 1, passRate: p.passRate, difficulty: p.difficulty || 50,
        options: c.mcq.options, answer: 'ABCD'[c.mcq.answer], parts: [Object.assign({}, p, { text: c.mcq.stem + '\n' + c.mcq.options.join('\n'), mcqOptions: c.mcq.options })] };
    };
    // a hand-picked part ("doc#Q8(a+b)") was recorded as the whole question id: keep the parts the record's marks say
    const writtenOf = (r) => {
      const q = get(r.ref);
      if (!r.marks || q.marks === r.marks) return q;
      let n = 0; const parts = [];
      for (const p of q.parts) { if (n >= r.marks) break; parts.push(p); n += p.marks || 0; }
      return Object.assign({}, q, { parts, marks: n });
    };
    for (const p of rec.papers) papers.push({ tier: p.tier, sectionA: (p.sectionA || []).length ? p.sectionA.map(mcqItem) : undefined, questions: p.questions.map(writtenOf) });
  } else if (ks === 'ks5') {
    // OCR chapters ("Chapter 19 - Stars") are found by their lessons' sub-subtopics (Stars, Cosmology ...)
    const ocrTopics = o.allTopics ? ['*'] : specs.length ? [...new Set(specs.flatMap((x) => (x.spec.subs === '*' ? [] : [...x.spec.subs])))] : o.topics;
    let all = ocrQuestions(ocrTopics).filter((q) => !used.has(q.id));
    if (specs.length) all = all.filter((q) => (q.lesson = lessonOf(q, specs, notYet)));
    if (!all.length) throw new Error(`no OCR questions found for "${o.topics.join(', ')}" (check the topic names: OCR chapter names such as Stars, Cosmology)`);
    // real A-level layout: about a quarter multiple choice (Section A), the rest structured (Section B)
    const mcqs = all.filter((q) => q.mcq), long = all.filter((q) => !q.mcq).sort((a, b) => a.marks - b.marks);
    const nM = o.mcq != null ? Math.min(o.mcq, mcqs.length) : null;
    const group = (q) => q.lesson || q.subtopic;
    const a = nM != null ? spreadFill(mcqs, nM, group).slice(0, nM) : (specs.length || o.allTopics ? spreadFill(mcqs, Math.round(target * 0.25), group) : fill(mcqs, Math.round(target * 0.25)));
    const rest = target - a.reduce((n, q) => n + q.marks, 0);
    const b = specs.length || o.allTopics ? spreadFill(long, rest, group) : fill(long, rest, 0.6);
    papers.push({ tier: null, sectionA: a, questions: b });
  } else {
    const cat = applyToCatalogue(readJson(path.join(LIB, 'catalogue.json'), null));
    const subjects = info.patrykTeaches || ['Biology', 'Chemistry', 'Physics'];
    const codes = { Biology: 'B', Chemistry: 'C', Physics: 'P' };
    const wantTopics = o.topics && o.topics.length ? o.topics : Object.keys(ep.AQA_TOPIC).filter((k) => subjects.some((sb) => k[0] === codes[sb]));
    const targets = aqaTargets(year, wantTopics, subjects, cat);
    // a lesson's questions may be filed under another library topic (P1 Energy's specific heat sits in
    // Particle Model of Matter): add those subtopics too
    if (specs.length) {
      const want = new Set(specs.flatMap((x) => (x.spec.subs === '*' ? [] : [...x.spec.subs])));
      const have = new Set(targets.map((t) => `${t.subject}|${t.topic}|${t.subtopic}`));
      for (const r of cat.parts) {
        const k = `${r.subject}|${r.topic}|${r.subtopic}`;
        if (!have.has(k) && subjects.includes(r.subject) && want.has(String(r.subtopic).toLowerCase().replace(/[^a-z0-9]+/g, ''))) { have.add(k); targets.push({ subject: r.subject, topic: r.topic, subtopic: r.subtopic }); }
      }
    }
    if (!targets.length) throw new Error(`no exam topic matches "${o.topics.join(', ')}"`);
    let all = aqaQuestions(targets, cat).filter((q) => !used.has(q.id));
    // --match "reflect,refract,...": keep only questions whose wording mentions one of these (narrows a broad topic)
    if (o.match && o.match.length) {
      const re = new RegExp(o.match.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
      all = all.filter((q) => re.test(clean(q.parts.map((p) => p.text).join(' '))));
    }
    if (ks === 'ks3') all = all.filter((q) => q.passRate == null || q.passRate >= 45);       // KS3: the more accessible GCSE questions
    if (specs.length) all = all.filter((q) => (q.lesson = lessonOf(q, specs, notYet)));                  // about a lesson they have had
    // Core aims at questions about 70% of real candidates got right, Challenge at about 40% (KS3: 75 / 55).
    // Questions with no known pass rate use the library's estimate. Nothing below 15% (old-spec oddities).
    const ease = (q) => (q.passRate != null ? q.passRate : 100 - q.difficulty);
    const aim = ks === 'ks3' ? { core: 75, challenge: 55 } : { core: 70, challenge: 40 };
    const tiers = o.tier ? [o.tier] : ['core', 'challenge'];
    const taken = new Set();
    // GCSE multiple choice (Patryk 2026-10-16: "the first half multiple choice"): --mcq N puts N real
    // one-mark "Tick one box" parts in a Section A, one per question, spread over the subtopics. Only parts
    // that make sense on their own (a one-part question, or wording that does not lean on the rest of it);
    // a part that needs its diagram keeps it (the Form shows the picture above the question).
    let sectionA = null;
    if (o.mcq) {
      const tierAim = aim[tiers[0]];
      const pool = [];
      for (const q of all) {
        for (const p of q.parts.slice(0, 1)) {          // the first part carries the question's opening (later parts lean on it)
          const c = categorise(p);
          if (!c.mcq || p.marks !== 1) continue;
          const stem = c.mcq.stem, figs = (p.figureFiles || []).filter((f) => !tickFile(f));
          if (q.parts.length > 1 && /\b(this|these|the student|the teacher|the scientist)\b/i.test(stem)) continue;
          if (/\btable\b/i.test(stem) || (/\b(figure|graph|diagram)\b/i.test(stem) && !figs.length)) continue;
          if (c.mcq.options.some((x) => x.length > 150 || /\[FIG|\bfigure\b/i.test(x))) continue;
          pool.push({ id: q.id, part: p.part, board: 'AQA', subject: q.subject, topic: q.topic, subtopic: q.subtopic, marks: 1,
            passRate: p.passRate, difficulty: p.difficulty || 50, options: c.mcq.options, answer: 'ABCD'[c.mcq.answer],
            parts: [Object.assign({}, p, { text: stem + '\n' + c.mcq.options.join('\n'), mcqOptions: c.mcq.options })] });
          break;                                                                  // one part per question
        }
      }
      const stemKey = (q) => clean(q.parts[0].text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 70);
      const seenStem = new Set();
      for (let k = pool.length - 1; k >= 0; k--) { const s = stemKey(pool[k]); if (seenStem.has(s)) pool.splice(k, 1); else seenStem.add(s); }   // the same question filed twice: once
      const easeA = (q) => (q.passRate != null ? q.passRate : 100 - q.difficulty);
      pool.sort((a, b) => Math.abs(easeA(a) - tierAim) - Math.abs(easeA(b) - tierAim));
      const bySub = new Map();
      pool.forEach((q) => { if (!bySub.has(q.subtopic)) bySub.set(q.subtopic, []); bySub.get(q.subtopic).push(q); });
      sectionA = [];
      for (let round = 0; sectionA.length < o.mcq && [...bySub.values()].some((l) => l.length > round); round++)
        for (const l of bySub.values()) if (l[round] && sectionA.length < o.mcq) sectionA.push(l[round]);
      // too few real ones: top up from the practice bank (mcq-written.js, the same bank the homework quizzes
      // use), labelled as practice questions so nobody mistakes them for real exam questions
      if (sectionA.length < o.mcq) {
        try {
          const mw = require('./mcq-written.js');
          const words = o.match && o.match.length ? o.match : o.topics.map((t) => t.replace(/^[BCP]\d+\s+/, ''));   // "P1 Energy" -> "Energy"
          for (const x of mw.forTopics('AQA', words, { subjects })) {
            if (sectionA.length >= o.mcq) break;
            if (used.has('practice:' + x.id)) continue;
            sectionA.push({ id: 'practice:' + x.id, part: '', practice: true, board: 'AQA', subject: 'Physics', topic: x.topic, subtopic: x.topic, marks: 1,
              options: x.options, answer: x.answer, parts: [{ part: '', marks: 1, figureFiles: [], text: x.stem + '\n' + x.options.join('\n'), mcqOptions: x.options, ms: { text: x.answer } }] });
          }
        } catch (e) { /* no practice bank */ }
      }
      if (sectionA.length < o.mcq) console.log(`  (only ${sectionA.length} suitable multiple-choice questions for these topics)`);
      const inA = new Set(sectionA.map((q) => q.id));
      all = all.filter((q) => !inA.has(q.id));
    }
    const targetB = sectionA ? Math.max(1, target - sectionA.length) : target;
    if (o.ids && o.ids.length) {            // --ids: hand-picked questions, one paper, in the order given
      const byId = new Map(aqaQuestions(targets, cat).map((q) => [q.id, q]));
      // "doc#Q8(a,b)" takes only those parts of the question (Patryk 2026-10-16: two 6-markers for 10C2)
      const want = o.ids.map((i) => { const m = /^(.*#Q\d+)(?:\(([^)]+)\))?$/.exec(i); return { id: m[1], parts: m[2] ? m[2].split(/[,+]/).map((s) => s.trim()) : null }; });
      const miss = want.filter((w) => !byId.has(w.id)).map((w) => w.id);
      if (miss.length) throw new Error('not usable or not found: ' + miss.join(', '));
      papers.push({ tier: null, questions: want.map((w) => {
        const q = byId.get(w.id);
        if (!w.parts) return q;
        const parts = q.parts.filter((p) => w.parts.includes(p.part));
        if (!parts.length) throw new Error(w.id + ' has no part ' + w.parts.join(','));
        return Object.assign({}, q, { parts, marks: parts.reduce((n, p) => n + (p.marks || 0), 0) });
      }) });
      all = [];
    }
    for (const tier of (o.ids && o.ids.length ? [] : tiers)) {
      const pool = all.filter((q) => ease(q) >= 15 && !(tier === 'challenge' && taken.has(q.id)))
        .sort((a, b) => Math.abs(ease(a) - aim[tier]) - Math.abs(ease(b) - aim[tier]) || (b.passRate != null) - (a.passRate != null));
      const spread = specs.length || o.allTopics;
      const qs = (spread ? spreadFill(pool, targetB, (q) => (o.allTopics ? String(q.lesson).split(' / ')[0] : q.lesson)) : fill(pool, targetB, 0.3)).sort((a, b) => ease(b) - ease(a));   // a paper ramps easy -> hard
      qs.forEach((q) => taken.add(q.id));
      papers.push(sectionA ? { tier, sectionA, questions: qs } : { tier, questions: qs });
    }
  }
  const subjects = [...new Set(papers.flatMap((p) => [...(p.sectionA || []), ...p.questions].map((q) => q.subject)))];
  return { cls: o.cls, year, ks, target, topics: o.topics, papers, subject: subjects.length === 1 ? subjects[0] : 'Science' };
}

/* ------------------------------------------------------------------ the paper */

const plainRun = (text, o) => new TextRun(Object.assign({ text: String(text), font: FONT, size: SZ }, o || {}));
// a text run, with exam-export maths notation typeset: x^2, 10^−4, 10^{-11}, λ_max, v_0
function powers(t) {
  return String(t).replace(/(×\s*10)\s?[–−-]\s?(\d+)\b/g, '$1^−$2').replace(/(×\s*10)\s?(\d)\b(?![\d.])/g, (m, a, b) => (b === '0' ? m : a + '^' + b))
    .replace(/(\/|\d\s?)(m|cm|mm|km|dm|s)([23])\b(?![\d.])/g, '$1$2^$3');
}
function run(text, o) {
  const t = powers(decode(text));
  if (!/[\^_]/.test(t)) return plainRun(t, o);
  const out = [];
  const re = /\^\{([^}]+)\}|\^([−–\-+]?[0-9.]+)|_\{([^}]+)\}|_(max|min|0|[0-9])\b/g;
  let last = 0, m;
  while ((m = re.exec(t))) {
    if (m.index > last) out.push(plainRun(t.slice(last, m.index), o));
    if (m[1] != null || m[2] != null) out.push(plainRun(m[1] != null ? m[1] : m[2], Object.assign({}, o, { superScript: true })));
    else out.push(plainRun(m[3] != null ? m[3] : m[4], Object.assign({}, o, { subScript: true })));
    last = re.lastIndex;
  }
  if (last < t.length) out.push(plainRun(t.slice(last), o));
  return out;
}
const runs = (...xs) => xs.flat();
const para = (children, o) => new Paragraph(Object.assign({ children: [].concat(children).flat() }, o || {}));
const right = (text) => para(run(text, { bold: true }), { alignment: AlignmentType.RIGHT, spacing: { before: 40, after: 120 } });
const line = () => para(run('.'.repeat(118), { color: '555555' }), { spacing: { before: 200, after: 0 } });   // dotted, as on real papers
const cellBorders = { top: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, left: { style: BorderStyle.SINGLE, size: 4, color: '000000' }, right: { style: BorderStyle.SINGLE, size: 4, color: '000000' } };
const TW = 9900;   // text width in twips (A4 minus margins)
const cell = (text, w, o) => new TableCell({ width: { size: Math.round(TW * w / 100), type: WidthType.DXA }, borders: cellBorders, columnSpan: (o || {}).span,
  children: [].concat(text).map((t) => (t instanceof Paragraph ? t : para(run(t, (o || {}).run), { spacing: { before: 30, after: 30 } }))) });

// A figure, inline (tick box, equation option) or as the question's diagram.
function figure(file, inline) {
  const fp = path.join(FIGS, file);
  if (!fs.existsSync(fp)) return null;
  const buf = fs.readFileSync(fp);
  const dim = hb.imageSize(buf);
  if (!dim || !dim.w) return null;
  if (inline && dim.w <= 22 && dim.h <= 22) return run('✓');                                      // "Put a tick (✓)": the tick itself (2026-10-15)
  if (inline && isTickBox(dim, buf.length)) return run(' ☐');                                      // the tick box glyph
  const maxW = inline === 'option' ? 330 : inline ? 160 : 520, maxH = inline === 'option' ? 110 : inline ? 120 : 360;
  const scale = Math.min(1, maxW / dim.w, maxH / dim.h);
  return new ImageRun({ data: buf, type: file.endsWith('.jpg') ? 'jpg' : 'png', transformation: { width: Math.round(dim.w * scale), height: Math.round(dim.h * scale) } });
}
// A part's text with its inline figures where the [FIG:n] markers were.
// Returns paragraphs: the text with small inline pictures (tick boxes, equation options) in place,
// and any big picture (graph, diagram) on its own line. A picture already shown in this question
// (the stem's diagram repeated on every part) is not shown again.
// A tick box: small and square. Thin or wide small pictures are equations or words, shown as pictures.
const isTickBox = (dim, bytes) => bytes < 6000 && dim.w >= 23 && dim.w < 64 && dim.h < 64 && dim.w / dim.h > 0.75 && dim.w / dim.h < 1.33;
function tickFile(file) {
  const fp = path.join(FIGS, file);
  if (!fs.existsSync(fp)) return false;
  const buf = fs.readFileSync(fp), dim = hb.imageSize(buf) || { w: 0, h: 0 };
  return isTickBox(dim, buf.length);
}
function isSmall(file) {
  const fp = path.join(FIGS, file);
  if (!fs.existsSync(fp)) return true;
  const dim = hb.imageSize(fs.readFileSync(fp)) || { w: 0, h: 0 };
  return dim.w <= 200 && dim.h <= 120;
}
// [FIG:n] marker number -> picture file, for one part's text (markers and figureFiles are in step)
function figMapOf(text, files) {
  const map = {};
  [...String(text || '').matchAll(/\[FIG:(\d+)\]/g)].forEach((m, i) => { if (files && files[i] && map[m[1]] == null) map[m[1]] = files[i]; });
  return map;
}
// A table kept by the A-level reader (rows of cells; cells may hold pictures), as a Word table.
function wordTable(t, tableFigs) {
  const cols = Math.max(1, ...t.rows.map((r) => r.length));
  const w = Math.floor(TW / cols);
  const cellParas = (s, bold) => {
    const out = [];
    String(s || '').split(/(\[FIG:\d+\])/).forEach((b) => {
      const m = /^\[FIG:(\d+)\]$/.exec(b);
      if (m) { const f = (tableFigs || {})[m[1]]; const im = f ? figure(f, true) : null; if (im) out.push(im); }
      else if (b.trim()) out.push(...[].concat(run(b.trim(), bold ? { bold: true } : undefined)));
    });
    return para(out.length ? out : [run('')], { spacing: { before: 30, after: 30 } });
  };
  return new Table({ width: { size: w * cols, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: Array(cols).fill(w),
    rows: t.rows.map((r, i) => new TableRow({ children: Array.from({ length: cols }, (_, c) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: cellBorders,
      children: [cellParas(r[c], i === 0 && !t.optionRows)] })) })) });
}
// Text with its pictures and tables where the markers were, one paragraph per line: small pictures
// (tick boxes, equations) stay in the line, big ones (graphs, diagrams) and tables stand on their
// own. A picture already shown in this question is not shown again.
function richParas(text, o) {
  const figMap = o.figMap || {}, tables = o.tables || [], shown = o.shown || new Set();
  const out = [];
  let runs = o.label ? [].concat(run(o.label, { bold: true })) : [];
  const flush = () => { if (runs.length) out.push(para(runs, { spacing: { before: 60, after: 40 }, keepNext: !!o.keepNext })); runs = []; };
  String(text || '').split('\n').forEach((ln, li) => {
    if (li && !o.oneLine) flush();
    ln.split(/(\[FIG:\d+\]|\[TABLE:\d+\])/).forEach((b) => {
      const fm = /^\[FIG:(\d+)\]$/.exec(b), tm = /^\[TABLE:(\d+)\]$/.exec(b);
      if (tm) { const t = tables[+tm[1]]; if (t) { flush(); out.push(wordTable(t, o.tableFigs)); } return; }
      if (fm) {
        const file = figMap[fm[1]];
        if (!file) return;
        if (o.inlineFigs || isSmall(file)) {
          const f = figure(file, o.inlineFigs ? 'option' : true);
          if (f) runs.push(f);
          if (!o.inlineFigs && tickFile(file)) flush();                // one option per line, box after it (2026-10-15)
          return;
        }   // option pictures sit next to their letter
        if (shown.has(file)) return;
        shown.add(file); flush();
        const im = figure(file, false);
        if (im) out.push(para(im, { alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 } }));
        return;
      }
      let t = b.replace(/[ \t]{2,}/g, ' ');
      // "Tick (✓) one box." / "Tick two boxes." ends its own line, so the options start underneath
      const tm2 = /^([\s\S]*?\btick\b[^.]{0,30}?\b(one|two|three) box(es)?\.)\s*([\s\S]*)$/i.exec(t);
      if (tm2 && tm2[4].trim()) { runs.push(...[].concat(run(runs.length ? tm2[1] : tm2[1].replace(/^\s+/, '')))); flush(); t = tm2[4]; }
      if (t.trim()) runs.push(...[].concat(run(runs.length ? t : t.replace(/^\s+/, ''))));
    });
  });
  flush();
  return out;
}
const orBlank = (paras) => (paras.length ? paras : [para(run(''))]);   // a table cell must hold a paragraph
function partParas(p, label, shown) {
  return richParas(p.text, { figMap: figMapOf(p.text, p.figureFiles), tables: p.tables, tableFigs: p.tableFigures, label, shown, oneLine: p.board !== 'OCR A' && !p.tables });
}
// The figures that belong to the whole question: those beyond a part's inline markers.
function questionFigures(parts) {
  const seen = new Set(), out = [];
  for (const p of parts) {
    const inline = (String(p.text).match(/\[FIG:\d+\]/g) || []).length;
    for (const f of (p.figureFiles || []).slice(inline)) if (!seen.has(f)) { seen.add(f); out.push(f); }
  }
  return out;
}
const noLines = (t) => /\btick\b|draw (a|one) (ring|line)|ring around|put a cross/i.test(t);
function linesFor(p, ks5) {
  const t = clean(p.text);
  if (p.mcqAnswer) return [];
  if (noLines(t)) return [];
  if (/=\s*\.{6,}/.test(String(p.text)) && (p.marks || 1) <= 3) return [];            // its own "answer = ......" line (OCR)
  const n = Math.max(1, Math.min(9, Math.round((p.marks || 1) * (ks5 ? 1.5 : 1.8))));
  return Array.from({ length: n }, line);
}

function frontSheet(paper, meta) {
  const ch = [];
  const total = [...(paper.sectionA || []), ...paper.questions].reduce((n, q) => n + q.marks, 0);
  const title = `${meta.title}${paper.tier ? ' : ' + (paper.tier === 'core' ? 'Core' : 'Challenge') : ''}`;
  ch.push(para(run(title, { bold: true, size: 32 }), { spacing: { after: 160 } }));
  ch.push(new Table({ width: { size: TW, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [TW * 0.2, TW * 0.8], rows: [
    new TableRow({ children: [cell('Name', 20, { run: { bold: true } }), cell('', 80)] }),
    new TableRow({ children: [cell('Class', 20, { run: { bold: true } }), cell(meta.cls, 80)] }),
    new TableRow({ children: [cell('Score', 20, { run: { bold: true } }), cell(`        / ${total}`, 80)] }),
  ] }));
  ch.push(para(run('INSTRUCTIONS', { bold: true }), { spacing: { before: 240, after: 40 } }));
  [meta.inClass ? `In-class mini test, made from real ${meta.ks === 'ks5' ? 'OCR A-level' : 'GCSE'} exam questions. Work on your own and in silence.`
      : `Homework: exam practice from real ${meta.ks === 'ks5' ? 'OCR A-level' : 'GCSE'} exam questions. Work through it at home.`,
    'Answer all the questions in the spaces provided.',
    'You may use a calculator and a ruler.',
    `Aim to spend about ${Math.max(15, Math.round(total * (meta.ks === 'ks5' ? 1.2 : 1)))} minutes on it.`,
    meta.inClass ? 'Your teacher will tell you how it will be marked.' : 'Then mark it with the mark scheme in green and correct anything you got wrong.'].forEach((t) => ch.push(para(run('• ' + t))));
  ch.push(para(run('INFORMATION', { bold: true }), { spacing: { before: 160, after: 40 } }));
  [`The total mark is ${total}.`, `The marks for each question are shown in brackets ${meta.ks === 'ks5' ? '[ ]' : '( )'}.`].forEach((t) => ch.push(para(run('• ' + t))));
  return ch;
}

function questionBlock(q, n, ks5) {
  const ch = [para(run(`Q${n}.`, { bold: true }), { spacing: { before: 280, after: 80 }, keepNext: true })];
  const shown = new Set();
  for (const f of questionFigures(q.parts)) { if (shown.has(f)) continue; shown.add(f); const im = figure(f, false); if (im) ch.push(para(im, { alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 } })); }
  const multi = q.parts.length > 1 || (q.parts[0] && q.parts[0].part);
  for (const g of hb.letterGroups(q.parts)) {
    if (g.stem) ch.push(para(run(g.stem), { spacing: { before: 100, after: 60 } }));
    for (const p of g.parts) {
      const body = g.stem && clean(p.text).startsWith(g.stem) ? Object.assign({}, p, { text: String(p.text).replace(g.stem, '') }) : p;
      // A level: the paper's own labels, (a) (i), are in the text already
      const label = multi && p.part && q.board !== 'OCR A' ? `(${p.part.split('.').join(')(')}) ` : '';
      ch.push(...partParas(body, label, shown));
      ch.push(...linesFor(p, ks5));
      ch.push(right(ks5 ? `[${p.marks}]` : `(${p.marks})`));
    }
  }
  if (!ks5) ch.push(right(`(Total ${q.marks} mark${q.marks === 1 ? '' : 's'})`));
  return ch;
}

function paperChildren(paper, meta) {
  const ch = frontSheet(paper, meta);
  ch.push(para(run(''), { pageBreakBefore: true }));
  let n = 0;
  if (paper.sectionA && paper.sectionA.length) {
    ch.push(para(run('SECTION A', { bold: true, size: 26 }), { spacing: { after: 60 } }));
    ch.push(para(run('Answer all the questions. For each question, write the letter of the correct answer in the box.', { italics: true })));
    for (const q of paper.sectionA) {
      n++;
      const p = q.parts[0];
      const optLines = new Set(q.optionsInFigure ? [] : (p.mcqOptions || []));
      const stem = String(p.text).split('\n').map((l) => l.trim()).filter((l) => l && !optLines.has(l) &&
        !q.options.some((o) => !q.optionsInFigure && (l === o || l.replace(/^[A-D][.)]?\s+/, '') === o))).join('\n');
      const figMap = figMapOf(p.text, p.figureFiles);
      ch.push(...richParas(stem, { figMap, tables: p.tables, tableFigs: p.tableFigures, label: `${n}  `, keepNext: true }));
      // options drawn in the picture or table ("Which graph ...?"): the letters are there already
      if (!q.optionsInFigure && q.options.some((o) => /\[FIG:\d+\]/.test(o))) {
        // picture options (equations, graphs): letter and picture side by side, like the real paper
        const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const nb = { top: none, bottom: none, left: none, right: none };
        ch.push(new Table({ width: { size: 6000, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [600, 5400],
          rows: q.options.map((o, k) => new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 600, type: WidthType.DXA }, borders: nb, verticalAlign: VerticalAlign.CENTER, children: [para(run('ABCD'[k], { bold: true }))] }),
            new TableCell({ width: { size: 5400, type: WidthType.DXA }, borders: nb, verticalAlign: VerticalAlign.CENTER, children: orBlank(richParas(o, { figMap, oneLine: true, inlineFigs: true })) }),
          ] })) }));
      } else if (!q.optionsInFigure) q.options.forEach((o, k) => ch.push(...richParas(o, { figMap, label: 'ABCD'[k] + '   ', keepNext: true, oneLine: true, inlineFigs: true })));
      ch.push(para([run('Your answer  '), run('☐', { size: 32 }), run('          '), run('[1]', { bold: true })], { alignment: AlignmentType.RIGHT }));
    }
    ch.push(para(run('SECTION B', { bold: true, size: 26 }), { pageBreakBefore: true, spacing: { after: 60 } }));
    ch.push(para(run('Answer all the questions.', { italics: true })));
  }
  for (const q of paper.questions) ch.push(...questionBlock(q, ++n, meta.ks === 'ks5'));
  ch.push(para(run('END OF QUESTION PAPER', { bold: true }), { alignment: AlignmentType.CENTER, spacing: { before: 400 } }));
  return ch;
}

function schemeChildren(paper, meta) {
  const ch = [para(run(`${meta.title}${paper.tier ? ' : ' + (paper.tier === 'core' ? 'Core' : 'Challenge') : ''}`, { bold: true, size: 28 })),
    para(run('Mark schemes', { bold: true, size: 26 }), { spacing: { before: 120, after: 160 } }), msKey()];
  let n = 0;
  if (paper.sectionA && paper.sectionA.length) {
    ch.push(para(run('Section A', { bold: true })));
    const rows = [new TableRow({ children: [cell('Question', 30, { run: { bold: true } }), cell('Answer', 40, { run: { bold: true } }), cell('Marks', 30, { run: { bold: true } })] })];
    for (const q of paper.sectionA) rows.push(new TableRow({ children: [cell(String(++n), 18), cell(q.answer || q.parts[0].mcqAnswer, 24), cell('1', 18)] }));
    ch.push(new Table({ width: { size: Math.round(TW * 0.6), type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [0.3, 0.4, 0.3].map((p) => Math.round(TW * 0.6 * p)), rows }));
    ch.push(para(run('Section B', { bold: true }), { spacing: { before: 200 } }));
  }
  for (const q of paper.questions) {
    ch.push(para([run(`Q${++n}.`, { bold: true, size: 24 }), run(`    ${q.marks} mark${q.marks === 1 ? '' : 's'}`, { bold: true, color: GREEN })], { spacing: { before: 240, after: 60 }, keepNext: true }));
    if (q.board === 'OCR A') {
      const ms = q.parts[0].ms;
      ch.push(msTable(friendlyMs(ms, { board: 'OCR A', marks: q.marks }), figMapOf(ms.text, ms.figureFiles)));
    } else {
      for (const p of q.parts) {
        ch.push(para([run(p.part ? `(${p.part})` : '', { bold: true }), run(`  ${p.marks} mark${p.marks === 1 ? '' : 's'}`, { color: GREY })], { spacing: { before: 100, after: 40 }, keepNext: true }));
        ch.push(msTable(friendlyMs(p.ms, { board: 'AQA', marks: p.marks }), figMapOf(p.ms.text, p.ms.figureFiles)));
        for (const lv of (p.ms.levels || [])) ch.push(para(run(`Level ${lv.level} (${lv.marks}): ${clean(lv.descriptor)}`, { size: 20 })));
        const tip = p.ms.examiner && p.ms.examiner.commonError;
        if (tip && !(q.tipsShown = q.tipsShown || new Set()).has(tip) && q.tipsShown.add(tip)) ch.push(para([run('Examiner tip: ', { bold: true, size: 18, color: GREY }), run(clean(tip), { italics: true, size: 18, color: GREY })], { spacing: { before: 40 } }));
      }
    }
  }
  return ch;
}
// Readable mark schemes (Patryk 2026-10-12): a key, then per part one row per mark with its notes
// underneath. The exam board's words, only laid out (ms-friendly.js).
const GREEN = '2E7D32', GREY = '666666';
function msKey() {
  return para(MS_KEY.flatMap(([k, v], i) => [run((i ? '    ' : '') + k, { bold: true, size: 18, color: k === '✓' ? GREEN : '000000' }), run(' = ' + v, { size: 18 })]),
    { spacing: { after: 120 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: '999999' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' } } });
}
function msTable(fm, figMap) {
  const W = [12, 88].map((p) => Math.round(TW * p / 100));
  const tc = (children, w) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: cellBorders, children: children.length ? children : [para(run(''))] });
  const rows = fm.points.map((pt) => {
    if (pt.lor) return lorRow(pt, figMap, tc, W);
    const body = pt.picture ? [para(run('Shown as a picture in the exam board mark scheme.', { italics: true }))]
      : richParas(pt.text, { figMap, shown: new Set() });
    [['Also accepted', pt.also], ['No mark for', pt.no], ["Doesn't matter", pt.ignore], ['Marker note', pt.extra]].forEach(([k, xs]) => {
      if (xs.length) body.push(para([run(k + ': ', { bold: true, size: 18, color: GREY }), run(xs.map(clean).join('; '), { size: 18, color: GREY })], { indent: { left: 240 }, spacing: { before: 20, after: 20 } }));
    });
    if (fm.parts) body.unshift(para([run(pt.label ? `(${pt.label.replace(/[()\s]/g, '')})  ` : '', { bold: true }), run(pt.codes, { bold: true, size: 18 })], { spacing: { before: 20, after: 20 } }));
    const mk = fm.parts ? `✓ ${pt.marks}` : fm.split && !fm.codes ? `✓ ${pt.marks}` : '✓';
    return new TableRow({ cantSplit: true, children: [tc([para(run(mk, { bold: true, size: 24, color: GREEN }), { alignment: AlignmentType.CENTER })], W[0]), tc(body, W[1])] });
  });
  if (fm.codes) rows.unshift(new TableRow({ children: [tc([para(run('', {}))], W[0]), tc([para(run(fm.codes, { bold: true, size: 20 }))], W[1])] }));
  return new Table({ width: { size: TW, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: W, rows });
}

// A level-of-response 6-marker (ms-friendly.js levelsBlock): how it is marked, one line per level,
// then the points that earn credit grouped by area, one bullet each.
function lorRow(pt, figMap, tc, W) {
  const L = pt.lor, shown = new Set(), small = { size: 20 };
  const body = [...L.before.flatMap((x) => richParas(x, { figMap, shown })),
    para(run(L.how, { italics: true, size: 18, color: GREY }), { spacing: { after: 80 } })];
  for (const lv of L.levels) body.push(para([run(`Level ${lv.level}  (${lv.marks} marks)  `, { bold: true, color: GREEN }), run(clean(lv.need), small)], { spacing: { before: 20, after: 20 } }));
  if (L.areas.length) body.push(para(run('Points that earn credit', { bold: true }), { spacing: { before: 120, after: 20 } }));
  for (const a of L.areas) {
    if (a.head) body.push(para(run(a.head, { bold: true, size: 20, color: GREY }), { spacing: { before: 60, after: 0 }, keepNext: true }));
    for (const x of a.points) body.push(...richParas('• ' + x, { figMap, shown }).map((p) => p));
  }
  [['Also accepted', pt.also], ['No mark for', pt.no], ["Doesn't matter", pt.ignore], ['Marker note', pt.extra]].forEach(([k, xs]) => {
    if (xs.length) body.push(para([run(k + ': ', { bold: true, size: 18, color: GREY }), run(xs.map(clean).join('; '), { size: 18, color: GREY })], { indent: { left: 240 } }));
  });
  if (pt.label) body.unshift(para(run(`(${pt.label.replace(/[()\s]/g, '')})`, { bold: true })));
  return new TableRow({ children: [tc([para(run(`✓ ${pt.marks}`, { bold: true, size: 24, color: GREEN }), { alignment: AlignmentType.CENTER })], W[0]), tc(body, W[1])] });
}

async function writeDocx(children, out) {
  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SZ } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 1000, right: 1000 } } }, children }],
  });
  fs.writeFileSync(out, await Packer.toBuffer(doc));
}

const DRIVE_HW = 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Homework\\Exam Practice';
const safe = (s) => String(s).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+$/, '');
// Where the papers go: Drive (Admin/Homework/Exam Practice/Year X/Subject/Topic) unless told otherwise.
function outFolder(o, pick, name) {
  if (o.out) return { dir: o.out, drive: false };
  if (!process.env.NO_UPLOAD && fs.existsSync(path.dirname(DRIVE_HW))) return { dir: path.join(DRIVE_HW, `Year ${pick.year}`, pick.subject, safe(name)), drive: true };
  return { dir: path.join(ROOT, 'homework-out', 'exam-practice', o.cls), drive: false };
}

// A real "Tick (✓) one box." part whose options are words: its options and the mark scheme's answer.
function tickOne(p) {
  const t = String(p.text || '');
  if (!/\btick\b[^.]{0,30}\bone box\b/i.test(t) || (p.marks || 1) !== 1) return null;
  const pieces = t.split(/\[FIG:\d+\]/);
  if (pieces.length < 3) return null;
  const head = /^([\s\S]*?\bone box\.)\s*([\s\S]*)$/i.exec(pieces[0]);
  if (!head) return null;
  const options = [head[2], ...pieces.slice(1, -1)].map((x) => clean(x).trim()).filter(Boolean);
  if (options.length < 2 || options.length > 5 || pieces[pieces.length - 1].trim().length > 3) return null;
  const bare = (x) => String(x).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const ms = bare(clean((p.ms && p.ms.text) || ''));
  const hits = options.map((x, k) => (ms.includes(bare(x).slice(0, 40)) ? k : -1)).filter((k) => k >= 0);
  if (hits.length !== 1) return null;
  return { stem: powers(clean(head[1])), options: options.map(powers), answer: hits[0] };
}

// The same paper as a Google Forms quiz (homework-forms.js format): multiple choice marks itself;
// each structured question is one written answer with its real mark scheme shown after submitting.
// A Form has no tables, and pupils have no paper copy (2026-10-16): a kept A-level table goes into the
// question as rows of text, "Material | Refractive index".
function withTables(p) {
  return String(p.text).replace(/\[TABLE:(\d+)\]/g, (m, k) => {
    const t = (p.tables || [])[+k];
    if (!t || !t.rows) return m;
    return '\n' + t.rows.map((r) => r.map((c) => clean(String(c == null ? '' : c)) || '-').join(' | ')).join('\n') + '\n';
  });
}
// Quiz file schema 2 (2026-10-18, design-audit/homework-replica/04-architecture.md section 3): every
// question has its pupil-facing label ("Question 3(b)", the same on the answer page and the marking
// page) and its text without it; written and number questions carry their mark points (one Yes/No each
// on the marking page, adding up to the question's marks); a calculation with one numeric answer and a
// unit is a "number" question (a number box plus an optional working box). The title has no due date
// (the planner adds it, since the due day may move). Questions that cannot go in a Form are listed in
// `left` with the reason, for the planner's Homework tab.
function formsQuiz(paper, pick, o, name) {
  const due = o.due || new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const tier = paper.tier ? (paper.tier === 'core' ? 'Core' : 'Challenge') : '';
  const board = pick.ks === 'ks5' ? 'OCR A' : 'AQA';
  const qs = [], left = [];
  const nA = (paper.sectionA || []).length;
  (paper.sectionA || []).forEach((q, i) => {
    const p = q.parts[0];
    const stem = withTables(p).split('\n').map((l) => l.trim()).filter((l) => l && !q.options.some((x) => l === x || l.replace(/^[A-D][.)]?\s+/, '') === x)).join((p.tables || []).length ? '\n' : ' ');   // table rows keep their lines
    qs.push({ type: 'mcq', label: `Question ${i + 1}`, text: (q.practice ? '(Practice question) ' : '') + clean(stem), options: q.options.map((x, k) => clean(x) || 'ABCD'[k]), answer: 'ABCD'.indexOf(q.answer), points: 1,
      feedback: p.ms && p.ms.examinerCommentary ? clean(p.ms.examinerCommentary).slice(0, 400) : '', ref: q.id, part: q.part, lesson: q.subtopic });
  });
  // a written or number question with its mark points; null if the answer is a picture (left out)
  const selfMarked = (base, ms, marks, calcText) => {
    const mp = markPoints(ms, { board, marks, calc: /\b(calculate|work out|determine)\b/i.test(calcText), id: base.label.replace(/^Question /, 'q').replace(/[()]/g, '') });
    if (mp.picture) { left.push({ ref: base.ref, label: base.label, why: 'the answer is a drawing or graph' }); return null; }
    const num = board === 'AQA' ? numberAnswer(mp, calcText) : null;
    return Object.assign(base, { type: num ? 'number' : 'written', marks, ...(num ? { unit: num.unit } : {}), markPoints: mp.points, ...(mp.levels ? { levels: mp.levels } : {}) });
  };
  paper.questions.forEach((q, i) => {
    const n = nA + i + 1;
    if (q.board !== 'OCR A') {               // AQA: part by part (2026-10-15), tick-one parts mark themselves
      q.parts.forEach((p) => {
        const label = `Question ${n}${p.part ? '(' + p.part + ')' : ''}`;
        if (needsDrawing(p.text)) { left.push({ ref: q.id, label, why: 'it needs drawing' }); return; }    // a Form cannot take a drawing (2026-10-16)
        const mc = tickQuestion(p, label, q.id, q.subtopic);
        if (mc) { mc.label = label; mc.text = mc.text.slice(label.length + 2); mc.part = p.part || undefined; qs.push(mc); return; }
        const w = selfMarked({ label, text: powers(ringToWrite(clean(p.text))), scheme: msPlain(p.ms, { board: 'AQA', marks: p.marks }), ref: q.id, part: p.part || undefined, lesson: q.subtopic }, p.ms, p.marks, clean(p.text));
        if (w) qs.push(w);
      });
      return;
    }
    const label = `Question ${n}`;
    if (q.parts.some((p) => needsDrawing(p.text))) { left.push({ ref: q.id, label, why: 'it needs drawing' }); return; }    // OCR: one mark scheme per question, so the whole question goes
    const text = q.parts.map((p) => (p.part ? `(${p.part}) ` : '') + ringToWrite(clean(withTables(p))) + ` [${p.marks}]`).join('\n');
    // one line per mark, notes underneath (2026-10-12: readable mark schemes)
    const w = selfMarked({ label, text, scheme: msPlain(q.parts[0].ms, { board: 'OCR A', marks: q.marks }), ref: q.id, lesson: q.subtopic }, q.parts[0].ms, q.marks, clean(q.parts.map((p) => p.text).join(' ')));
    if (w) qs.push(w);
  });
  const hw = { schema: 2, cls: o.cls, due, kind: 'exam-practice', tier: paper.tier || null, board, topic: name,
    file: `homework-${o.cls}-${due}${paper.tier ? '-' + paper.tier : ''}.json`,
    title: `${o.cls} ${name} exam practice${tier ? ' (' + tier + ')' : ''}`, questions: qs, left };
  return addQuizImages(hw);
}

// Any "tick" part whose options are words (Patryk 2026-10-16: "Put a tick next to your answer. X Y Z"
// came out as a typed answer with the options run into the question). One to tick -> multiple choice;
// "Tick two boxes" / "each of your choices" -> tick-boxes (Forms gives the marks only if all are right).
// The options sit between the tick-box pictures ([FIG:n]), or are whole sentences when there are none.
// The right answers are the options the mark scheme names; if that is not exactly the number to tick,
// it stays a written question.
const TICK_INSTR = /(put a tick \([^)]*\)(?: in the box)? next to (your answer|each of your choices)\.|tick \([^)]*\) (one|two|three) box(?:es)?\.|tick (one|two|three) box(?:es)?\.)/i;
function tickChoice(p) {
  const t = String(p.text || '');
  const m = TICK_INSTR.exec(t);
  if (!m) return null;
  const word = (m[3] || m[4] || (m[2] && /each/i.test(m[2]) ? null : 'one'));
  const want = word ? { one: 1, two: 2, three: 3 }[word.toLowerCase()] : (p.marks || 0);
  const stem = t.slice(0, m.index) + (want === 1 ? 'Choose one answer.' : 'Choose ' + ['', 'one', 'two', 'three', 'four', 'five'][want] + ' answers.');
  let rest = t.slice(m.index + m[0].length).replace(/^\s*tick\s*\([^)]*\)\s*/i, '');
  let options;
  if (/\[FIG:\d+\]/.test(rest)) {
    const pieces = rest.split(/\[FIG:\d+\]/);
    if (pieces[pieces.length - 1].trim().length > 3) return null;
    options = pieces.slice(0, -1).map((x) => clean(x)).filter(Boolean);
  } else options = (rest.match(/[^.]+\./g) || []).map((x) => clean(x)).filter(Boolean);
  if (!want || options.length < 2 || options.length > 6 || options.length <= want) return null;
  // the next bit of the question ("The figure below shows ...") is not an option
  if (options.some((x) => x.length > 200 || /\b(figure|graph|table|diagram)\b.{0,20}\b(below|shows)\b/i.test(x))) return null;
  const bare = (x) => ' ' + String(x).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const ms = bare(clean((p.ms && p.ms.text) || ''));
  const answers = options.map((x, k) => (ms.includes(bare(x).slice(0, 41).trimEnd() + (bare(x).length <= 41 ? ' ' : '')) ? k : -1)).filter((k) => k >= 0);
  if (answers.length !== want) return null;
  return { stem: powers(clean(stem)), options: options.map(powers), answers };
}
// A tick part as a Form question that marks itself: "answers" holds every right option (tick-boxes
// when more than one), "answer" the first, for the planner's preview. Null if it cannot be converted.
function tickQuestion(p, label, ref, lesson) {
  const one = tickOne(p);
  const tc = one ? { stem: one.stem, options: one.options, answers: [one.answer] } : tickChoice(p);
  if (!tc) return null;
  return { type: 'mcq', text: `${label}. ${tc.stem}`, options: tc.options, answer: tc.answers[0], answers: tc.answers.length > 1 ? tc.answers : undefined,
    points: p.marks || tc.answers.length, feedback: '', ref, lesson };
}
// Questions that need drawing ("Draw arrows on the diagram") stay out of the Form; "Draw a ring around
// the correct answer" can be typed, so it is reworded. Same rule as needsDrawing_ in planner/Code.gs:
// keep the two in step (Patryk 2026-10-16).
const DRAWING = /(?<!not )\bdraw\b|\bsketch\b(?! graph)|\b(plot|shade)\b|\blabel (the|each|it|all|on|one|two|a)\b|\bput a cross\b|\bmark (on|with) an? \b|\bcomplete the (diagram|graph|chart|circuit|ray diagram|bar chart)\b/i;
const ringToWrite = (t) => String(t || '').replace(/\bdraw a (ring|circle) (around|round) (each|the|your)\b/gi, (m, a, b, c) => 'Write down ' + c.toLowerCase());
const needsDrawing = (t) => DRAWING.test(ringToWrite(t));
// Pupils have no paper copy (Patryk 2026-10-16): every picture goes into the Form, above its question,
// and they mark their own long answers from the mark scheme shown after submitting.
const QUIZ_INTRO = 'This is exam practice homework, made from real exam questions.\n\n' +
  'Answer every question in this form. If a question has a picture, it is just above the question. Work out calculations on paper first if that helps, then type your answer and your working.\n\n' +
  'The multiple-choice questions mark themselves. For the longer answers, the next page shows the mark scheme and you mark yourself, one mark at a time.\n\n' +
  'If you get stuck, message me on Google Classroom.';
const IMG_MAX = 1500000;                         // bytes; Google Forms takes images up to about 2 MB
// The library parts behind a quiz question: "<doc>#Q<n>", and the part from "Question 3(b)" when it names one.
function partsForRef(ref, text, part) {
  const [doc, qn] = String(ref || '').split('#Q');
  if (!doc || !qn) return [];
  const d = readJson(path.join(LIB, /^ALevel-/.test(doc) ? 'docs-ocr' : 'docs', doc + '.json'), null);
  const parts = d ? d.parts.filter((p) => String(p.question) === qn) : [];
  if (part != null && part !== '') return parts.filter((p) => p.part === part);   // a Section A multiple-choice part, or a schema 2 AQA part
  const m = /^Question \d+\(([^)]+)\)/.exec(String(text || ''));   // older files: the label starts the text
  return m ? parts.filter((p) => p.part === m[1]) : parts;
}
// Adds each question's pictures (base64, in the quiz file; the planner puts them in the Form) and
// tidies wording left in older files. A picture is shown once, above the first question that uses it.
// Tick boxes are left out. Works on new quizzes and on files already waiting in Planner Sync.
function addQuizImages(hw) {
  const shown = new Set();
  hw.missingPictures = [];
  // files made before 2026-10-16: tick parts that came out as typed answers become multiple choice
  hw.questions = hw.questions.map((q) => {
    if (hw.schema === 2 || q.type !== 'written' || !q.ref || !TICK_INSTR.test(String(q.text))) return q;
    const parts = partsForRef(q.ref, q.text);
    const mc = parts.length === 1 ? tickQuestion(parts[0], String(q.text).split('\n')[0], q.ref, q.lesson) : null;
    return mc || q;
  });
  for (const q of hw.questions) {
    q.text = String(q.text).replace(/ on your paper copy\./, '').replace(/ It has a diagram, graph or picture: look at the paper copy\./, '')
      .replace(/\(Use the diagram on your paper copy\.\) /, '');
    if (!q.ref) continue;
    const qparts = partsForRef(q.ref, q.text, q.part);
    const files = [...new Set(qparts.flatMap((p) => p.figureFiles || []))].filter((f) => f && !shown.has(f));
    // a picture that IS an answer option ("A [FIG:12]") is titled with its letter (Patryk 2026-10-16)
    const letter = {};
    if (q.type === 'mcq') for (const p of qparts) {
      const marks = [...String(p.text || '').matchAll(/(?:^|\n|\s)([A-D])[.)]?\s*\[FIG:\d+\]|\[FIG:\d+\]/g)];
      marks.forEach((m, k) => { const f = (p.figureFiles || [])[k]; if (f && m[1]) letter[f] = m[1]; });
    }
    q.images = [];
    for (const f of files) {
      const fp = path.join(FIGS, f);
      if (!fs.existsSync(fp)) { hw.missingPictures.push(q.ref + ' ' + f); continue; }
      if (tickFile(f)) continue;
      const buf = fs.readFileSync(fp);
      if (buf.length > IMG_MAX) { hw.missingPictures.push(q.ref + ' ' + f + ' (too big)'); continue; }
      shown.add(f);
      q.images.push({ name: f, mime: /\.jpe?g$/i.test(f) ? 'image/jpeg' : 'image/png', data: buf.toString('base64'), ...(letter[f] ? { label: letter[f] } : {}) });
    }
    if (!q.images.length) delete q.images;
  }
  if (!hw.missingPictures.length) delete hw.missingPictures;
  if (hw.schema === 2) require('./homework-forms.js').finishV2(hw);   // minutes and the page 1 wording (05-design.md 1.1)
  else if (hw.kind === 'exam-practice') hw.intro = QUIZ_INTRO;
  return hw;
}

async function build(o) {
  const pick = choose(o);
  const name = o.title || (o.allTopics ? 'All topics' : o.topics.join(' and ') + (o.taught ? ' (everything so far)' : ''));
  const meta = { cls: o.cls, ks: pick.ks, title: name + (o.inClass ? ' mini test' : o.size === 'full' ? ' exam practice' : ' mini exam practice'), inClass: !!o.inClass };
  const where = outFolder(o, pick, name);
  const outDir = where.dir;
  const files = [];
  const quizzes = [];
  for (const paper of pick.papers) {
    const total = [...(paper.sectionA || []), ...paper.questions].reduce((n, q) => n + q.marks, 0);
    console.log(`\n${meta.title}${paper.tier ? ' : ' + paper.tier : ''} — ${total} marks, ${(paper.sectionA || []).length + paper.questions.length} questions`);
    (paper.sectionA || []).forEach((q, i) => console.log(`  A${i + 1}. [${q.marks}] ${q.subtopic} · ${clean(q.parts[0].text).slice(0, 90)}`));
    paper.questions.forEach((q, i) => console.log(`  Q${i + 1}. [${q.marks}${q.passRate != null ? ', pass ' + q.passRate + '%' : ''}] ${q.subtopic} · ${clean(q.parts[0].text).slice(0, 90)}`));
    if (o.dryRun) continue;
    fs.mkdirSync(outDir, { recursive: true });
    const base = safe(`${o.cls} ${name}${o.inClass ? ' mini test' : (o.size === 'full' ? '' : ' mini') + ' exam practice'}${paper.tier ? ' ' + (paper.tier === 'core' ? 'Core' : 'Challenge') : ''}`);
    await writeDocx(paperChildren(paper, meta), path.join(outDir, base + '.docx'));
    await writeDocx(schemeChildren(paper, meta), path.join(outDir, base + ' MS.docx'));
    files.push(base + '.docx', base + ' MS.docx');
    if (!o.noForm) quizzes.push(formsQuiz(paper, pick, o, name));
  }
  if (o.dryRun) return pick;
  // the questions used, for the record
  const manifest = { cls: o.cls, made: new Date().toISOString().slice(0, 10), kind: 'exam-practice homework', topics: o.topics, size: o.size === 'full' ? 'full' : 'mini', files,
    papers: pick.papers.map((p) => ({ tier: p.tier, sectionA: (p.sectionA || []).map((q) => q.id), questions: p.questions.map((q) => ({ ref: q.id, marks: q.marks, subtopic: q.subtopic })) })) };
  const manifestName = safe(`${o.cls} ${name}${o.size === 'full' ? '' : ' mini'} exam practice.json`);
  fs.writeFileSync(path.join(outDir, manifestName), JSON.stringify(manifest, null, 1));
  if (where.drive) {
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    fs.appendFileSync(path.join(ROOT, 'upload-log.txt'), [...files, manifestName].map((f) => `${stamp}  exam practice  wrote ${path.join(outDir, f)}\n`).join(''));
  }
  // the Forms quizzes go through the planner's sync folder, like every homework quiz
  const formFiles = [];
  if (!process.env.NO_UPLOAD) {
    const hf = require('./homework-forms.js');
    for (const hw of quizzes) {
      try { const f = hf.write(hw, false); if (f) formFiles.push(path.basename(f)); }
      catch (e) { console.log(`  (Forms quiz not written: ${e.message})`); }
    }
  }
  if (!o.noRecord) {
    const u = readJson(USAGE, {});
    const ids = pick.papers.flatMap((p) => [...(p.sectionA || []), ...p.questions].map((q) => q.id));
    u[o.cls + ':homework'] = [...new Set([...(u[o.cls + ':homework'] || []), ...ids])];
    fs.writeFileSync(USAGE, JSON.stringify(u, null, 1), 'utf8');
  }
  console.log(`\nwritten to ${outDir}:\n  ` + files.join('\n  '));
  if (formFiles.length) console.log(`Forms quizzes (planner Homework tab): ${formFiles.join(', ')}`);
  return pick;
}

module.exports = { addQuizImages, _tickOne: tickOne, _tickChoice: tickChoice, _powers: powers, choose, build, aqaTargets, aqaQuestions, ocrQuestions, fill, questionFigures, partParas, formsQuiz, outFolder };

if (require.main === module) {
  const a = process.argv.slice(2), v = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  if (!v('--class') || !(v('--topics') || a.includes('--taught') || a.includes('--all-topics'))) { console.error('usage: node test-paper.js --class 10C2 (--topics "P1 Energy" | --taught | --all-topics) [--size mini|full] [--minutes N] [--marks N] [--mcq N] [--tier core|challenge] [--due YYYY-MM-DD] [--no-form] [--dry-run]'); process.exit(1); }
  build({ cls: v('--class'), topics: (v('--topics') || '').split(',').map((s) => s.trim()).filter(Boolean), taught: a.includes('--taught'), allTopics: a.includes('--all-topics'),
    minutes: v('--minutes') ? +v('--minutes') : null, exclude: v('--not') ? v('--not').split(',').map((x) => x.trim()).filter(Boolean) : [], mcq: v('--mcq') != null ? +v('--mcq') : null, date: v('--date'), size: v('--size') || 'mini', marks: v('--marks') ? +v('--marks') : null,
    tier: v('--tier'), out: v('--out'), title: v('--title'), due: v('--due'), noForm: a.includes('--no-form'), dryRun: a.includes('--dry-run'), noRecord: a.includes('--no-record'), same: v('--same'), inClass: a.includes('--in-class'), ids: v('--ids') ? v('--ids').split(',').map((s) => s.trim()).filter(Boolean) : null, match: v('--match') ? v('--match').split(',').map((s) => s.trim()).filter(Boolean) : null })
    .catch((e) => { console.error('exam practice not made: ' + e.message); process.exit(1); });
}
