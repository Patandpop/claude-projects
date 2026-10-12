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
const { friendlyMs, msPlain, MS_KEY } = require('./ms-friendly.js');

const ROOT = path.join(__dirname, '..', '..');
const LIB = path.join(ROOT, 'exam-library');
const FIGS = path.join(LIB, 'figures');
const USAGE = path.join(ROOT, 'exam-usage.json');
const FONT = 'Arial';                       // exam papers are Arial, not the lesson house font
const SZ = 22;                              // 11pt
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
    if (!nFigs && /\b(figure|diagram|graph|table) (below|above)\b|shown (below|above)/i.test(text)) continue;
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
      if (!tw.some((t) => t.length && t.every((w) => name.includes(w)))) continue;
      const total = parts[0].questionTotalMarks, sum = parts.reduce((n, p) => n + (p.marks || 0), 0);
      if (!total || sum !== total) continue;
      // since 2026-10-10 the library keeps the pictures and tables: a question is used when every
      // picture it (or its mark scheme) needs was found, and never when it points at a figure it lacks
      if (!parts.every(figsOk)) continue;
      const allText = clean(parts.map((p) => p.text).join(' '));
      const refs = [...allText.matchAll(/\bFig(?:ure|\.)\s*\d/gi)].length;
      if (refs && !parts.some((p) => (p.figureFiles || []).length || (p.tables || []).length)) continue;
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

const SIZES = { mini: { ks3: 20, ks4: 25, ks5: 30 }, full: { ks3: 40, ks4: 45, ks5: 60 } };   // mini is the default (Patryk 2026-10-10)

function choose(o) {
  const info = classInfo(o.cls);
  const year = info.year, ks = year >= 12 ? 'ks5' : year >= 9 ? 'ks4' : 'ks3';
  const target = o.marks || SIZES[o.size === 'full' ? 'full' : 'mini'][ks];
  const usage = readJson(USAGE, {});
  const used = new Set([...(usage[o.cls] || []), ...(usage[o.cls + ':homework'] || []), ...(usage[o.cls + ':test'] || [])]);
  const papers = [];
  if (ks === 'ks5') {
    const all = ocrQuestions(o.topics).filter((q) => !used.has(q.id));
    if (!all.length) throw new Error(`no OCR questions found for "${o.topics.join(', ')}" (check the topic names: OCR chapter names such as Stars, Cosmology)`);
    // real A-level layout: about a quarter multiple choice (Section A), the rest structured (Section B)
    const mcqs = all.filter((q) => q.mcq), long = all.filter((q) => !q.mcq).sort((a, b) => a.marks - b.marks);
    const a = fill(mcqs, Math.round(target * 0.25));
    const b = fill(long, target - a.reduce((n, q) => n + q.marks, 0), 0.6);
    papers.push({ tier: null, sectionA: a, questions: b });
  } else {
    const cat = applyToCatalogue(readJson(path.join(LIB, 'catalogue.json'), null));
    const subjects = info.patrykTeaches || ['Biology', 'Chemistry', 'Physics'];
    const targets = aqaTargets(year, o.topics, subjects, cat);
    if (!targets.length) throw new Error(`no exam topic matches "${o.topics.join(', ')}"`);
    let all = aqaQuestions(targets, cat).filter((q) => !used.has(q.id));
    if (ks === 'ks3') all = all.filter((q) => q.passRate == null || q.passRate >= 45);       // KS3: the more accessible GCSE questions
    // Core aims at questions about 70% of real candidates got right, Challenge at about 40% (KS3: 75 / 55).
    // Questions with no known pass rate use the library's estimate. Nothing below 15% (old-spec oddities).
    const ease = (q) => (q.passRate != null ? q.passRate : 100 - q.difficulty);
    const aim = ks === 'ks3' ? { core: 75, challenge: 55 } : { core: 70, challenge: 40 };
    const tiers = o.tier ? [o.tier] : ['core', 'challenge'];
    const taken = new Set();
    for (const tier of tiers) {
      const pool = all.filter((q) => ease(q) >= 15 && !(tier === 'challenge' && taken.has(q.id)))
        .sort((a, b) => Math.abs(ease(a) - aim[tier]) - Math.abs(ease(b) - aim[tier]) || (b.passRate != null) - (a.passRate != null));
      const qs = fill(pool, target, 0.3).sort((a, b) => ease(b) - ease(a));                       // a paper ramps easy -> hard
      qs.forEach((q) => taken.add(q.id));
      papers.push({ tier, questions: qs });
    }
  }
  const subjects = [...new Set(papers.flatMap((p) => [...(p.sectionA || []), ...p.questions].map((q) => q.subject)))];
  return { cls: o.cls, year, ks, target, topics: o.topics, papers, subject: subjects.length === 1 ? subjects[0] : 'Science' };
}

/* ------------------------------------------------------------------ the paper */

const plainRun = (text, o) => new TextRun(Object.assign({ text: String(text), font: FONT, size: SZ }, o || {}));
// a text run, with exam-export maths notation typeset: x^2, 10^−4, 10^{-11}, λ_max, v_0
function run(text, o) {
  const t = decode(text);
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
const line = () => para(run('_'.repeat(75), { color: '444444' }), { spacing: { before: 160, after: 0 } });
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
  if (inline && buf.length < 6000 && dim.w < 60 && dim.h < 60) return run(' ☐ ');                 // the tick box glyph
  const maxW = inline === 'option' ? 330 : inline ? 160 : 520, maxH = inline === 'option' ? 110 : inline ? 120 : 360;
  const scale = Math.min(1, maxW / dim.w, maxH / dim.h);
  return new ImageRun({ data: buf, type: file.endsWith('.jpg') ? 'jpg' : 'png', transformation: { width: Math.round(dim.w * scale), height: Math.round(dim.h * scale) } });
}
// A part's text with its inline figures where the [FIG:n] markers were.
// Returns paragraphs: the text with small inline pictures (tick boxes, equation options) in place,
// and any big picture (graph, diagram) on its own line. A picture already shown in this question
// (the stem's diagram repeated on every part) is not shown again.
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
        if (o.inlineFigs || isSmall(file)) { const f = figure(file, o.inlineFigs ? 'option' : true); if (f) runs.push(f); return; }   // option pictures sit next to their letter
        if (shown.has(file)) return;
        shown.add(file); flush();
        const im = figure(file, false);
        if (im) out.push(para(im, { alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 } }));
        return;
      }
      const t = b.replace(/[ \t]{2,}/g, ' ');
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
  [`Homework: exam practice from real ${meta.ks === 'ks5' ? 'OCR A-level' : 'GCSE'} exam questions. Work through it at home.`,
    'Answer all the questions in the spaces provided.',
    'You may use a calculator and a ruler.',
    `Aim to spend about ${Math.max(15, Math.round(total * (meta.ks === 'ks5' ? 1.2 : 1)))} minutes on it.`,
    'Then mark it with the mark scheme in green and correct anything you got wrong.'].forEach((t) => ch.push(para(run('• ' + t))));
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

// The same paper as a Google Forms quiz (homework-forms.js format): multiple choice marks itself;
// each structured question is one written answer with its real mark scheme shown after submitting.
function formsQuiz(paper, pick, o, name) {
  const due = o.due || new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const tier = paper.tier ? (paper.tier === 'core' ? 'Core' : 'Challenge') : '';
  const qs = [];
  for (const q of paper.sectionA || []) {
    const p = q.parts[0];
    const stem = String(p.text).split('\n').map((l) => l.trim()).filter((l) => l && !q.options.some((x) => l === x || l.replace(/^[A-D][.)]?\s+/, '') === x)).join(' ');
    const pic = (p.figureFiles || []).length || /\[FIG/.test(p.text);
    qs.push({ type: 'mcq', text: (pic ? '(Use the diagram on your paper copy.) ' : '') + clean(stem), options: q.options.map((x, k) => clean(x) || 'ABCD'[k]), answer: 'ABCD'.indexOf(q.answer), points: 1,
      feedback: p.ms && p.ms.examinerCommentary ? clean(p.ms.examinerCommentary).slice(0, 400) : '', ref: q.id, lesson: q.subtopic });
  }
  paper.questions.forEach((q, i) => {
    const n = (paper.sectionA || []).length + i + 1;
    const pic = q.parts.some((p) => (p.figureFiles || []).length || /\[FIG/.test(p.text));
    const text = q.parts.map((p) => (p.part ? `(${p.part}) ` : '') + clean(p.text) + ` [${p.marks}]`).join('\n');
    // one line per mark, notes underneath (2026-10-12: readable mark schemes)
    const scheme = q.board === 'OCR A' ? msPlain(q.parts[0].ms, { board: 'OCR A', marks: q.marks })
      : q.parts.map((p) => msPlain(p.ms, { board: 'AQA', marks: p.marks }, p.part ? `(${p.part})` : '')).join('\n\n');
    qs.push({ type: 'written', text: `Question ${n} on your paper copy.${pic ? ' It has a diagram, graph or picture: look at the paper copy.' : ''}\n${text}`, marks: q.marks, scheme, ref: q.id, lesson: q.subtopic });
  });
  return { cls: o.cls, due, board: pick.ks === 'ks5' ? 'OCR A' : 'AQA', kind: 'exam-practice', tier: paper.tier || null,
    file: `homework-${o.cls}-${due}${paper.tier ? '-' + paper.tier : ''}.json`,
    title: `${o.cls} exam practice: ${name}${tier ? ' (' + tier + ')' : ''} (due ${due.split('-').reverse().slice(0, 2).join('/')})`,
    intro: 'Exam practice homework from real exam questions. Answer each question, ideally on your paper copy first. The multiple-choice questions mark themselves. For the written questions, check your answer against the mark scheme shown after you submit and correct it in green.',
    questions: qs };
}

async function build(o) {
  const pick = choose(o);
  const name = o.title || o.topics.join(' and ');
  const meta = { cls: o.cls, ks: pick.ks, title: name + (o.size === 'full' ? ' exam practice' : ' mini exam practice') };
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
    const base = safe(`${o.cls} ${name}${o.size === 'full' ? '' : ' mini'} exam practice${paper.tier ? ' ' + (paper.tier === 'core' ? 'Core' : 'Challenge') : ''}`);
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

module.exports = { choose, build, aqaTargets, aqaQuestions, ocrQuestions, fill, questionFigures, partParas, formsQuiz, outFolder };

if (require.main === module) {
  const a = process.argv.slice(2), v = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  if (!v('--class') || !v('--topics')) { console.error('usage: node test-paper.js --class 10C2 --topics "P1 Energy" [--size mini|full] [--marks N] [--tier core|challenge] [--due YYYY-MM-DD] [--no-form] [--dry-run]'); process.exit(1); }
  build({ cls: v('--class'), topics: v('--topics').split(',').map((s) => s.trim()).filter(Boolean), size: v('--size') || 'mini', marks: v('--marks') ? +v('--marks') : null,
    tier: v('--tier'), out: v('--out'), title: v('--title'), due: v('--due'), noForm: a.includes('--no-form'), dryRun: a.includes('--dry-run'), noRecord: a.includes('--no-record') })
    .catch((e) => { console.error('exam practice not made: ' + e.message); process.exit(1); });
}
