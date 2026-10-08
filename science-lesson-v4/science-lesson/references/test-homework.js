#!/usr/bin/env node
// test-homework.js — "test-ready" homework (Patryk 2026-10-05): homework built FROM the class's
// end-of-topic test, so every homework is practice for that test, and marks itself.
//
//   node science-lesson/references/test-homework.js 10C2            current topic, what's taught so far
//   node science-lesson/references/test-homework.js 11S2 --marks 24 --due 2026-10-14
//   ... --topic "P6 Waves"   another topic     ... --all   every PLC statement, not just taught ones
//   ... --dry-run            show the choice, write nothing
//
// How it is built (the pedagogy, in order):
//   1. The topic's PLC (Admin/Assessment/...) is the checklist the TEST assesses. Only statements
//      the class has been TAUGHT are practised (matched to the lessons ticked off in the planner
//      data), and only the CURRENT topic (his rule 2026-10-03).
//   2. Real AQA questions from the exam library on those statements. NEVER a question that is in
//      the test itself (the test must stay a fair test), never one this class has had before, never
//      one that strays into other topics.
//   3. About 20 marks, 25-30 minutes, two sides of A4: easier first, one stretch question last.
//   4. Every question is labelled with its PLC statement(s). Pupils self-mark in green pen from the
//      projected answers (no teacher marking), then fill in the checklist table at the end, which
//      tells them (and him) exactly what to revise before the test.
// Output: homework-out/<class> <topic> <date>/  Homework.docx, Answers (project).pptx, Answers.docx
'use strict';

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const {
  Paragraph, TextRun, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, ImageRun, ShadingType,
} = require('docx');
const hb = require('./homework-booklet.js');
const ep = require('./exam-pick.js');
const pc = require('./planner-catalogue.js');

const ROOT = path.join(__dirname, '..', '..');
const FIGS = path.join(ROOT, 'exam-library', 'figures');
const ADMIN = 'G:/My Drive/Beechen Cliff Science/Admin/Assessment';
const DATA = path.join(ROOT, 'planner', 'planner-data.json');
const NAVY = '0D1B5E', GOLD = 'FABB2E', INK = '1A1A2E', GREY = '6B6B7B', PANEL = 'F4F6FB', LINE = 'C5CBDA';
const FONT = 'Century Gothic';

/* ----------------------------------------------------------- reading Drive */
// Paragraph texts of a .docx (tables included), in order.
function docxParas(file) {
  try {
    const xml = new AdmZip(file).readAsText('word/document.xml');
    return xml.split('</w:p>').map((p) => [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('').trim()).filter(Boolean)
      .map((t) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
  } catch { return []; }
}
// The topic's folder in Admin/Assessment: Year N/<Subject>/<topic> (or the closest by topic code).
function assessmentDir(yearDir, subject, topicFolder) {
  const base = path.join(ADMIN, yearDir, subject);
  if (fs.existsSync(path.join(base, topicFolder))) return path.join(base, topicFolder);
  const code = (topicFolder.match(/^[BCP]\d+/) || [])[0];
  const hit = fs.existsSync(base) ? fs.readdirSync(base).find((d) => code && d.startsWith(code + ' ')) : null;
  return hit ? path.join(base, hit) : null;
}
// Files in the topic folder (not the "Separate science - DO NOT USE", "Editable" or "Additional" ones).
function topicFiles(dir) {
  return fs.readdirSync(dir).filter((f) => /\.docx$/i.test(f) && !/^~\$/.test(f)).map((f) => path.join(dir, f));
}
// PLC statements: "I can ..." lines, with the code before them (E1, S6, C3...) when there is one.
function readPLC(dir, combined) {
  let plcs = topicFiles(dir).filter((f) => /plc/i.test(path.basename(f)));
  const comb = plcs.filter((f) => /combined|trilogy/i.test(path.basename(f)));
  const sep = plcs.filter((f) => !/combined|trilogy/i.test(path.basename(f)) && !/\bsep\b|separate/i.test(path.basename(f)));
  plcs = combined ? (comb.length ? comb : sep.length ? sep : plcs) : (sep.length ? sep : plcs);
  const out = [];
  for (const f of plcs.slice(0, 1)) {
    const ps = docxParas(f);
    ps.forEach((t, i) => {
      if (!/^\s*(i can|i know|i understand|i am able)\b/i.test(t) && !/^\s*(describe|explain|state|recall|calculate|use|define|compare)\b/i.test(t)) return;
      if (/\b(these (core )?questions|your revision|make sure you|revise|RAG)\b/i.test(t)) return;   // instructions, not statements
      const prev = ps[i - 1] || '';
      const code = /^[A-Z]{1,3}\d{1,2}[a-z]?$/.test(prev.trim()) ? prev.trim() : `${out.length + 1}`;
      const text = t.replace(/^\s*i can\s+/i, '').replace(/\s+/g, ' ').trim();
      if (text.length > 8 && !out.some((s) => s.text === text)) out.push({ code, text: text[0].toUpperCase() + text.slice(1), file: path.basename(f) });
    });
  }
  return out;
}
// Everything in the topic's test papers, squashed to letters, so "is this question IN the test?"
// is a substring check.
const squash = (s) => String(s || '').toLowerCase().replace(/\[fig:\d+\]/g, ' ').replace(/[^a-z]+/g, '');
function readTests(dir) {
  const tests = topicFiles(dir).filter((f) => !/mark ?scheme|\bms\b|plc|front cover|feedback|equations|guidance/i.test(path.basename(f)));
  const paras = tests.map((f) => docxParas(f).join(' ')).join(' ');
  return { files: tests.map((f) => path.basename(f)), text: squash(paras), words: new Set(pc.toks(paras)) };
}
// Words that belong to OTHER topics, learned from the exam library itself: a word is another
// topic's when most of its uses across the subject's questions are in that topic ("transformer",
// "nuclear", "acceleration"). Everyday words ("complete", "table", "student") belong to none.
function otherTopicWords(subject, ownTopic) {
  const docs = path.join(ROOT, 'exam-library', 'docs');
  const per = {};                                       // word -> { topic: count }
  for (const f of fs.readdirSync(docs)) {
    if (!f.startsWith(subject + '-')) continue;
    const d = JSON.parse(fs.readFileSync(path.join(docs, f), 'utf8'));
    for (const p of d.parts) for (const w of new Set(pc.toks(p.text))) {
      if (w.length < 4) continue;
      (per[w] = per[w] || {})[d.topic] = (per[w][d.topic] || 0) + 1;
    }
  }
  const words = new Set(), mine = new Set();
  for (const [w, by] of Object.entries(per)) {
    const total = Object.values(by).reduce((a, b) => a + b, 0);
    const [top, n] = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    if (total >= 8 && top !== ownTopic && n / total >= 0.6 && (by[ownTopic] || 0) / total < 0.2) words.add(w);
    if (total >= 5 && top === ownTopic && n / total >= 0.6) mine.add(w);
  }
  return { foreign: words, mine };
}

/* ---------------------------------------------------------- the questions */
// Small square images are the paper's tick boxes; tiny ones are the "✓" in "Tick (✓) one box".
const sizeCache = new Map();
function figKind(file) {
  if (!sizeCache.has(file)) {
    let d = null;
    try { d = hb.imageSize(fs.readFileSync(path.join(FIGS, file))); } catch { d = null; }
    sizeCache.set(file, d);
  }
  const d = sizeCache.get(file);
  if (!d) return 'missing';
  if (d.w <= 18 && d.h <= 18) return 'tick';
  if (d.w <= 60 && d.h <= 60 && Math.abs(d.w - d.h) <= 6) return 'box';
  return 'figure';
}
// part text -> tokens: {t:'text'} | {fig:file} | {box:true}
function tokens(part) {
  const map = {};
  (part.figures || []).forEach((n, i) => { map[n] = (part.figureFiles || [])[i]; });
  const out = [];
  String(part.text || '').split(/(\[FIG:\d+\])/).forEach((s) => {
    const m = s.match(/^\[FIG:(\d+)\]$/);
    // the library lost apostrophes: "the student s eye" -> "the student's eye"
    // ...and superscripts: "8.0 × 103 kg/m3" -> "8.0 × 10³ kg/m³"
    const SUP = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', 1: '¹', 0: '⁰' };
    const sup = (d) => [...d].map((c) => SUP[c] || c).join('');
    if (!m) {
      if (s.trim()) out.push({ t: s.replace(/\b([A-Za-z]{2,}) s (?=[a-z])/g, "$1's ")
        .replace(/×\s?10(-?\d{1,2})\b/g, (x, e) => '× 10' + sup(e))
        .replace(/\b(m|cm|mm|km|dm)([23])\b/g, (x, u, p) => u + sup(p)) });
      return;
    }
    const f = map[m[1]];
    const k = f ? figKind(f) : 'missing';
    if (k === 'tick') out.push({ t: '✓' });
    else if (k === 'box') out.push({ box: true });
    else if (k === 'figure') out.push({ fig: f });
  });
  return out;
}
const tokText = (ts) => ts.filter((x) => x.t).map((x) => x.t).join(' ').replace(/\s+/g, ' ').replace(/\(\s*✓\s*\)/g, '(✓)').trim();
// Figures of a question that no part's text points at: the question's own picture.
function questionFigures(q) {
  const used = new Set();
  q.parts.forEach((p) => tokens(p).forEach((x) => x.fig && used.add(x.fig)));
  const all = [];
  q.parts.forEach((p) => (p.figureFiles || []).forEach((f) => { if (!used.has(f) && figKind(f) === 'figure' && !all.includes(f)) all.push(f); }));
  return all;
}
// A tick-box part -> { lead tokens, options: [tokens] }; null if it isn't one, or an option is unreadable.
function tickBox(part) {
  const ts = tokens(part);
  const nBox = ts.filter((x) => x.box).length;
  if (nBox < 2) return null;
  // the instruction ends at "Tick (✓) one box." / "two boxes." ; options follow
  let lead = [], rest = ts, cut = -1;
  for (let i = 0; i < ts.length; i++) if (ts[i].t && /box(es)?\.?\s*$/i.test(ts[i].t.trim()) && /tick|box/i.test(ts[i].t)) { cut = i; }
  if (cut < 0) for (let i = 0; i < ts.length; i++) if (ts[i].t && /\bbox(es)?\b\.?/i.test(ts[i].t)) { cut = i; break; }
  if (cut >= 0) {
    // the instruction token may also hold the first option's text after "box."
    const t = ts[cut].t; const m = t.match(/^([\s\S]*?\bbox(?:es)?\.?)([\s\S]*)$/i);
    lead = [...ts.slice(0, cut), { t: m ? m[1] : t }];
    rest = [...(m && m[2].trim() ? [{ t: m[2] }] : []), ...ts.slice(cut + 1)];
  }
  const options = []; let cur = [];
  for (const x of rest) { if (x.box) { options.push(cur); cur = []; } else cur.push(x); }
  const tail = cur;                                      // text after the last box (rare)
  if (options.some((o) => !o.length)) return null;
  return { lead, options, tail };
}

/* --------------------------------------------------------------- choosing */
// Answered in BOOKS: nothing that only works on the printed paper (ticking IS fine: they write the answer).
const PAPER_ONLY = /complete the (table|diagram|graph|chart)|draw (on|a line|lines|a ring|a circle|an arrow|a straight)|on the (diagram|graph|figure|chart)|\blabel\b|\bplot\b|\bshade\b|ring around|circle the|on figure/i;
function relevance(q, own, foreign, untaught) {
  const words = new Set(pc.toks(q.text).filter((w) => w.length >= 4));
  const hits = (set) => [...words].filter((w) => set.has(w));
  return { own: hits(own), foreign: hits(foreign), untaught: hits(untaught) };
}
// The checklist statements a question practises: those whose DISTINCTIVE words it uses ("efficiency",
// "sankey", "elastic"), not words every statement shares ("energy", "transfer"). At most 3, best first.
function statementsHit(q, statements, all) {
  const words = (s) => [...new Set(pc.toks(s.text).filter((w) => w.length >= 4 && !/^(stat|describ|explain|identif|recall|appl|calculat|equation|correct|unit|measurement|necessar|convert|remember|interpret|example|mean|what|happen|thing|way)/.test(w)))];
  const df = {};
  (all || statements).forEach((s) => words(s).forEach((w) => { df[w] = (df[w] || 0) + 1; }));
  const n = (all || statements).length;
  const qw = new Set(pc.toks(q.text + ' ' + q.parts.map((p) => (p.ms && p.ms.text) || '').join(' ')));
  return statements.map((s) => {
    const sw = words(s);
    const rare = sw.filter((w) => df[w] <= Math.max(2, n / 6));
    const score = sw.reduce((a, w) => a + (qw.has(w) ? (rare.includes(w) ? 2 : 0.5) : 0), 0);
    return { code: s.code, score, rare: rare.some((w) => qw.has(w)) };
  }).filter((x) => x.rare && x.score >= 2).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.code);
}

function plan(cls, opts) {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const c = data.classes[cls];
  if (!c) throw new Error(`${cls}: not in planner data`);
  if (/^(12|13)/.test(cls)) throw new Error(`${cls} is OCR A-level: there are no OCR exam questions in the library yet (never AQA).`);
  const prog = data.progress[cls] || {};
  const taught = new Set(prog.taught || []);
  const unit = opts.topic ? (c.seq.find((L) => L.topic.toLowerCase() === opts.topic.toLowerCase()) || {}).unit : prog.unit;
  const lessons = c.seq.map((L, k) => ({ ...L, k })).filter((L) => L.unit === unit || (opts.topic && L.topic.toLowerCase() === opts.topic.toLowerCase()));
  if (!lessons.length) throw new Error(`${cls}: no lessons for that topic`);
  const topicFolder = lessons[0].topic;
  const rel = (lessons.find((L) => L.rel) || {}).rel || '';
  const [yearDir, subject] = rel.split('/');
  const code = (topicFolder.match(/^[BCP]\d+/) || [])[0];
  const libTopic = ep.AQA_TOPIC[code];
  const dir = assessmentDir(yearDir, subject, topicFolder);
  if (!dir) throw new Error(`No Admin/Assessment folder for ${yearDir}/${subject}/${topicFolder}`);
  const combined = /combined/i.test(JSON.stringify(c.seq.map((L) => L.rel).slice(0, 3))) || /C\d/.test(cls) || cls === '10C2';
  const plc = readPLC(dir, combined);
  const test = readTests(dir);

  // Which statements are taught: each statement's best-matching lesson in the topic must be taught.
  const done = lessons.filter((L) => taught.has(L.k));
  // a topic taught in two blocks (9XS B1 Cells L1-7, later L8-16): statements are matched against BOTH,
  // so an osmosis statement finds the osmosis lesson (not taught yet) instead of a block-1 lesson
  const wholeTopic = c.seq.map((L, k) => ({ ...L, k })).filter((L) => L.topic === lessons[0].topic);
  const notDone = wholeTopic.filter((L) => !taught.has(L.k) && !L.optional);
  const share = done.length / Math.max(1, done.length + notDone.length);
  const statements = plc.map((s) => {
    let best = null, bs = 0;
    // matched on what the lesson is ABOUT (its technician-guide overview), not just its title
    for (const L of wholeTopic) { const about = `${L.title} ${L.lo || ''}`; const sc = pc.sim(about, s.text) + pc.sim(s.text, about); if (sc > bs) { bs = sc; best = L; } }
    const covered = opts.all || (best && bs >= 0.35 ? taught.has(best.k) : share >= 0.6);
    return { ...s, lesson: best && bs >= 0.35 ? `L${best.num} ${best.title}` : null, covered };
  });
  const cov = statements.filter((s) => s.covered);
  const ownText = [topicFolder, libTopic, ...done.map((L) => L.title), ...cov.map((s) => s.text)].join(' ');
  const own = new Set(pc.toks(ownText).filter((w) => w.length >= 4));
  const topicAll = new Set(pc.toks([topicFolder, ...lessons.map((L) => `${L.title} ${L.lo || ''}`), ...plc.map((s) => s.text)].join(' ')));
  const tw = otherTopicWords(subject, libTopic);
  const foreign = new Set([...tw.foreign].filter((w) => !topicAll.has(w)));
  // this topic's own subject words that are in neither the checklist, the lessons nor the test:
  // content this class is not tested on (9XS: culturing bacteria is in the library's Cell Biology)
  const offPLC = new Set([...tw.mine].filter((w) => !topicAll.has(w) && !test.words.has(w)));
  const covWords = new Set(pc.toks(cov.map((s) => s.text).join(' ') + ' ' + done.map((L) => L.title).join(' ')));
  const untaught = new Set(pc.toks(notDone.map((L) => L.title).join(' ') + ' ' + statements.filter((s) => !s.covered).map((s) => s.text).join(' '))
    .filter((w) => w.length >= 4 && !covWords.has(w)));

  const usage = ep.loadUsage();
  const used = new Set(usage[cls + ':homework'] || []);
  const why = {};
  const pool = ep.candidates(subject, libTopic).filter((q) => {
    const id = q.id;
    const r = relevance(q, own, foreign, untaught);
    const realFigs = questionFigures(q).length + q.parts.flatMap((p) => tokens(p)).filter((x) => x.fig).length;
    const reason =
      used.has(id) ? 'had before' :
      q.marks > 10 ? 'too long' :
      ep.damaged(q) || ep.noData(q) ? 'damaged' :
      q.parts.some((p) => tokens(p).some((x) => x.fig && figKind(x.fig) === 'missing')) ? 'missing figure' :
      realFigs > 3 ? 'too many figures' :
      opts.inBooks && PAPER_ONLY.test(q.text) ? 'needs the printed paper' :
      q.parts.some((p) => /\bbox/i.test(p.text) && tokens(p).filter((x) => x.box).length >= 2 && !tickBox(p)) ? 'unreadable tick box' :
      q.parts.some((p) => { const s = squash(p.text).slice(20, 90); return s.length > 40 && test.text.includes(s); }) ? 'IN THE TEST' :
      // a data table the library flattened into a run of numbers ("A 232 292 B 382 409 C 622 524")
      q.parts.some((p) => /(?:\b[A-Z]?\s?\d[\d.,]*\s+){6,}/.test(hb.clean(p.text)) ||
        // "The table below shows the results. Volume of water in cm3 ... 5.0 5.4 0.4": headings then numbers, no picture
        /\btable\b[^[]{0,200}?(?:\d[\d.,]*\s+){2,}\d/.test(p.text.split(/\btable (?:below|above)?\s*shows/i)[1] ? 'table ' + p.text.split(/\btable (?:below|above)?\s*shows/i)[1] : '')) ? 'flattened table' :
      r.foreign.length >= 2 || r.foreign.length > r.own.length / 2 ? `other topic (${r.foreign.slice(0, 3).join(', ')})` :
      (r.off = [...new Set(pc.toks(q.text))].filter((w) => offPLC.has(w))).length >= 2 ? `not on the checklist (${r.off.slice(0, 3).join(', ')})` :
      r.untaught.length >= 2 ? `not taught yet (${r.untaught.slice(0, 3).join(', ')})` :
      r.own.length < 3 ? 'off topic' : '';
    why[reason || 'ok'] = (why[reason || 'ok'] || 0) + 1;
    if (reason) return false;
    q.plc = statementsHit(q, cov, plc);
    return q.plc.length > 0;
  });

  // Greedy: cover as many taught statements as possible within the mark budget, real exam pass
  // rates in a sensible range, then one harder stretch question last.
  const budget = opts.marks || 20;
  const chosen = []; let marks = 0; const seen = new Set();
  const ok = (q) => q.passRate == null || (q.passRate >= 25 && q.passRate <= 90);
  const gain = (q) => q.plc.filter((s) => !seen.has(s)).length;
  const stretch = pool.filter((q) => q.passRate != null && q.passRate < 45 && q.marks >= 4 && q.marks <= 7)
    .sort((a, b) => gain(b) - gain(a) || a.passRate - b.passRate)[0];
  const coreBudget = stretch ? budget - stretch.marks : budget;
  while (marks < coreBudget - 2) {
    const cand = pool.filter((q) => q !== stretch && !chosen.includes(q) && ok(q) && marks + q.marks <= coreBudget + 2)
      .sort((a, b) => (gain(b) / Math.sqrt(b.marks)) - (gain(a) / Math.sqrt(a.marks)) || (b.passRate || 50) - (a.passRate || 50))[0];
    if (!cand) break;
    chosen.push(cand); marks += cand.marks; cand.plc.forEach((s) => seen.add(s));
  }
  chosen.sort((a, b) => (b.passRate || 50) - (a.passRate || 50));        // easier first, like a real paper
  if (stretch) { stretch.stretch = true; chosen.push(stretch); stretch.plc.forEach((s) => seen.add(s)); marks += stretch.marks; }
  return { cls, c, topicFolder, subject, libTopic, dir, plc: statements, test, chosen, marks, pool: pool.length, why, usage };
}

/* --------------------------------------------------------------- the docx */
const run = (text, o) => new TextRun(Object.assign({ text: String(text), font: FONT, size: 21, color: INK }, o || {}));
const para = (children, o) => new Paragraph(Object.assign({ spacing: { before: 0, after: 60 }, children }, o || {}));
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noB = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
const cell = (children, o) => new TableCell(Object.assign({ borders: noB, children, margins: { top: 60, bottom: 60, left: 120, right: 120 } }, o || {}));
function image(file, maxW, maxH) {
  const buf = fs.readFileSync(path.join(FIGS, file));
  const d = hb.imageSize(buf);
  const sc = Math.min(1, maxW / d.w, maxH / d.h);
  return new ImageRun({ data: buf, transformation: { width: Math.round(d.w * sc), height: Math.round(d.h * sc) }, type: file.endsWith('.jpg') ? 'jpg' : 'png' });
}
// Text tokens -> paragraphs: text flows; a figure gets its own centred paragraph where it sits.
// `tail` runs (the [marks]) go on the end of the last text paragraph, right-aligned by a tab.
const RIGHT = 10100;                                     // the text width in twips (A4, 0.6" margins)
function flow(ts, firstRuns, o, tail) {
  const out = []; let runs = [...(firstRuns || [])];
  const flush = (last) => {
    if (!runs.length) return;
    if (last && tail) runs.push(run('\t'), ...tail);
    // the paragraph that ends a part (it carries the marks) may be followed by a page break
    out.push(para(runs, Object.assign({ keepNext: !(last && tail), keepLines: true, tabStops: [{ type: 'right', position: RIGHT }] }, o || {}))); runs = [];
  };
  ts.forEach((x, i) => {
    if (x.t) runs.push(run((runs.length ? x.t : x.t.replace(/^\s+/, '')).replace(/\s+/g, ' ')));
    else if (x.fig) { flush(false); out.push(para([image(x.fig, FIG_W, FIG_H)], { alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 40, after: 60 } })); }
    else if (x.words) {
      // the paper's word box, drawn as one: "decreased   unchanged   increased"
      flush(false);
      const edge = { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 };
      out.push(para([run(x.words.join('      '), { bold: true, color: NAVY })], { alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 60, after: 80 }, indent: { left: 1800, right: 1800 },
        border: { top: edge, bottom: edge, left: edge, right: edge }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: PANEL } }));
    }
  });
  if (runs.length) flush(true);
  else if (tail) out.push(para([run('\t'), ...tail], { tabStops: [{ type: 'right', position: RIGHT }], spacing: { after: 40 } }));
  return out;
}
let FIG_W = 260, FIG_H = 150;
// Ruled lines for answering ON the sheet: one table row per line (Word merges bordered paragraphs).
function writeLines(n) {
  if (!n) return [];
  const line = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { ...noB, insideHorizontal: line, bottom: line },
    rows: Array.from({ length: n }, () => new TableRow({ height: { value: 440, rule: 'exact' }, cantSplit: true, children: [cell([para([run('')], { spacing: { after: 0 } })], { margins: { top: 0, bottom: 0, left: 0, right: 0 } })] })) })];
}
function linesFor(part, text) {
  if (/_{4,}/.test(part.text)) return 0;                                     // the question has its own blanks
  if (/\b(draw|plot|complete the (table|graph|diagram)|label)\b/i.test(text)) return 0;
  return Math.max(1, Math.min(8, Math.round((part.marks || 1) * 1.5)));
}
function optionTable(opts) {
  const short = opts.every((o) => tokText(o).length <= 28 && !o.some((x) => x.fig));
  const cellOf = (o) => cell([para([run('☐  ', { size: 26, color: NAVY }), ...o.filter((x) => x.t).map((x) => run(x.t.trim()))], { spacing: { after: 0 } }),
    ...o.filter((x) => x.fig).map((x) => para([image(x.fig, 160, 60)], { spacing: { after: 0 } }))], { width: { size: short ? 50 : 100, type: WidthType.PERCENTAGE }, margins: { top: 20, bottom: 20, left: 240, right: 60 } });
  const rows = [];
  if (short) for (let i = 0; i < opts.length; i += 2) rows.push(new TableRow({ cantSplit: true, children: [cellOf(opts[i]), opts[i + 1] ? cellOf(opts[i + 1]) : cell([para([run('')])])] }));
  else opts.forEach((o) => rows.push(new TableRow({ cantSplit: true, children: [cellOf(o)] })));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noB, rows });
}
// A stem hoisted out of the parts (hb.letterGroups) is matched on cleaned text; cut it off the raw text.
function rawAfter(raw, stem) {
  if (!stem) return raw;
  const words = raw.split(/(\s+)/);
  let acc = '';
  for (let i = 0; i < words.length; i++) { acc += words[i]; if (hb.clean(acc) === stem) return words.slice(i + 1).join(''); }
  return raw;
}
function header(h) {
  const title = new Table({
    width: { size: RIGHT, type: WidthType.DXA }, columnWidths: [6670, 3430], layout: 'fixed', borders: noB,
    rows: [new TableRow({ children: [
      cell([para([run('TEST-READY HOMEWORK', { bold: true, size: 16, color: GOLD, characterSpacing: 40 })], { spacing: { after: 10 } }),
        para([run(h.topic, { bold: true, size: 38, color: 'FFFFFF' })], { spacing: { after: 10 } }),
        para([run(`${h.cls} · practice for your ${h.topic} test · about 25 minutes`, { size: 17, color: 'D6DCF0' })], { spacing: { after: 0 } })],
      { width: { size: 6670, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: NAVY }, margins: { top: 140, bottom: 140, left: 220, right: 120 } }),
      cell([para([run('Name', { size: 16, color: GREY })], { spacing: { after: 120 } }),
        para([run('Due  ', { size: 16, color: GREY }), run(h.due || '', { bold: true, size: 17 })], { spacing: { after: 120 } }),
        para([run('Score  ', { size: 16, color: GREY }), run(`____ / ${h.marks}`, { bold: true, size: 21, color: NAVY })], { spacing: { after: 0 } })],
      { width: { size: 3430, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: PANEL }, margins: { top: 140, bottom: 120, left: 200, right: 120 } }),
    ] })],
  });
  const steps = h.inBooks
    ? [['1', 'Stick this sheet in your book. Answer in your book: number each answer (1a, 1b...).'], ['2', 'No notes first time. Then check your notes and add what you missed in a different colour.'], ['3', 'In class we mark it in green pen, then you fill in the checklist at the end.']]
    : [['1', 'Answer on this sheet. No notes first time.'], ['2', 'Then check your notes and add what you missed in a different colour.'], ['3', 'In class we mark it in green pen, then you fill in the checklist at the end.']];
  const how = new Table({ width: { size: RIGHT, type: WidthType.DXA }, columnWidths: [3367, 3367, 3366], layout: 'fixed', borders: noB, rows: [new TableRow({ children: steps.map(([n, t]) =>
    cell([para([run(n + '  ', { bold: true, size: 18, color: GOLD }), run(t, { size: 16, color: GREY })], { spacing: { after: 0 } })], { width: { size: 3367, type: WidthType.DXA }, margins: { top: 100, bottom: 80, left: 80, right: 80 } })) })] });
  return [title, how];
}
function questionBlock(q, n, inBooks) {
  const out = [];
  out.push(para([
    run(` ${n} `, { bold: true, size: 24, color: 'FFFFFF', shading: { type: ShadingType.CLEAR, color: 'auto', fill: q.stretch ? 'B8860B' : NAVY } }),
    run(q.stretch ? '   STRETCH' : '', { bold: true, size: 16, color: 'B8860B' }),
    run(`   checklist ${q.plc.join(' · ')}`, { size: 16, color: GREY }),
    run('\t'), run(`${q.marks} marks`, { bold: true, size: 17, color: GREY }),
  ], { keepNext: true, tabStops: [{ type: 'right', position: RIGHT }], spacing: { before: 160, after: 60 },
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: q.stretch ? GOLD : LINE, space: 6 } } }));
  const qFigs = questionFigures(q);
  let figsPlaced = false;
  const placeFigs = () => { if (figsPlaced) return; figsPlaced = true; qFigs.forEach((f) => out.push(para([image(f, FIG_W + 40, FIG_H + 20)], { alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 20, after: 60 } }))); };
  hb.letterGroups(q.parts).forEach((g) => {
    if (g.stem) { out.push(...flow([{ t: g.stem }], null, { spacing: { before: 40, after: 40 } })); placeFigs(); }
    g.parts.forEach((part) => {
      let raw = rawAfter(String(part.text || ''), g.stem);
      const label = part.part ? run(`(${part.part})  `, { bold: true, color: NAVY }) : null;
      const marks = [run(`[${part.marks || 0}]`, { bold: true, size: 17, color: GREY })];
      const o = { spacing: { before: 60, after: 40 } };
      // the question's lead-in (the sentence(s) before the first question): its picture goes after it
      if (!figsPlaced && qFigs.length) {
        const text = tokText(tokens({ ...part, text: raw }));
        const m = text.match(/^(.*?[.!])\s+(?=(What|Which|Calculate|Describe|Explain|Give|Name|State|Suggest|Write|Complete|Tick|Use|Compare|Determine|Show|Draw|Plot|Why|How|Estimate)\b)/);
        if (m && m[1].length > 25) {
          out.push(...flow([{ t: m[1] }], label ? [label] : null, o));
          placeFigs();
          const cut = raw.indexOf(m[1].slice(-15));
          if (cut >= 0) raw = raw.slice(cut + 15);
          out.push(...partBody({ ...part, text: raw }, null, marks, { spacing: { before: 20, after: 40 } }, inBooks));
          return;
        }
        placeFigs();
      }
      out.push(...partBody({ ...part, text: raw }, label, marks, o, inBooks));
    });
  });
  placeFigs();
  return out;
}
function partBody(part, label, marks, o, inBooks) {
  const tb = tickBox(part);
  if (tb) return [...flow(tb.lead, label ? [label] : null, o), optionTable(tb.options), ...flow([], null, null, marks)];
  return [...flow(wordBoxes(tokens(part)), label ? [label] : null, o, marks), ...(inBooks ? [] : writeLines(linesFor(part, part.text)))];
}
// "Use the correct answer from the box ... not at all. decreased unchanged increased When the..." ->
// text, { words: [...] }, text. The box's words are the lower-case run before the next sentence.
const BOX_LEAD = /((?:from the box|not at all|from the list)[^.]*\.)\s+((?:[a-z0-9][\w\-/']*\s+){1,9}?[a-z0-9][\w\-/']*)(?:\s+(?=[A-Z])|\s*$)/;
function wordBoxes(ts) {
  return ts.flatMap((x) => {
    if (!x.t) return [x];
    x = { t: x.t.replace(/\s+\/\s+/g, '/') };                  // units in a box: "m3 / kg kg / m3" -> "m3/kg kg/m3"
    const m = x.t.match(BOX_LEAD);
    if (!m) return [x];
    const at = x.t.indexOf(m[0]);
    return [{ t: x.t.slice(0, at) + m[1] }, { words: m[2].split(/\s+/) }, { t: x.t.slice(at + m[0].length) }];
  });
}
function checklist(h) {
  const head = (t, w) => cell([para([run(t, { bold: true, size: 17, color: 'FFFFFF' })], { spacing: { after: 0 } })], { width: { size: w, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: NAVY } });
  const rows = [new TableRow({ tableHeader: true, children: [head('Your checklist (from the test)', 58), head('Questions', 14), head('My marks', 14), head('Revise?', 14)] })];
  h.statements.forEach((s, i) => {
    const qs = h.qs.map((q, k) => (q.plc.includes(s.code) ? k + 1 : null)).filter(Boolean);
    const fill = i % 2 ? 'FFFFFF' : PANEL;
    const c = (children, w) => cell(children, { width: { size: w, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, color: 'auto', fill } });
    rows.push(new TableRow({ cantSplit: true, children: [
      c([para([run(`${s.code}  `, { bold: true, size: 17, color: NAVY }), run(s.text, { size: 17 })], { spacing: { after: 0 } })], 58),
      c([para([run(qs.length ? 'Q' + qs.join(', Q') : '–', { size: 17, color: GREY })], { spacing: { after: 0 } })], 14),
      c([para([run('___ / ___', { size: 17, color: GREY })], { spacing: { after: 0 } })], 14),
      c([para([run('☐', { size: 24, color: NAVY })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } })], 14),
    ] }));
  });
  return [
    para([run('After marking', { bold: true, size: 24, color: NAVY })], { spacing: { before: 200, after: 40 }, keepNext: true }),
    para([run('Add up your marks for each statement. Tick "Revise?" for any where you got less than half: that is what to revise before the test.', { size: 17, color: GREY })], { spacing: { after: 80 }, keepNext: true }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { ...noB, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: LINE } }, rows }),
  ];
}

/* ------------------------------------------- mark schemes, readable
   AQA mark schemes come out of the library as one run-on string: "use a tape measure allow use a
   metre rule 1 one person holding the top ... or take repeat readings 1". For self-marking each
   marking point needs its own line, with its alternatives (allow / accept / ignore) under it.
   -> [{ text, marks, also: ['allow ...', 'ignore ...'] }] */
function msPoints(raw) {
  let s = hb.clean(raw).replace(/\s+/g, ' ').trim();
  const points = [];
  // a marking point ends at its mark: a lone 1-6 that isn't a quantity ("2 marks", "any 3 from")
  const re = /\s([1-6])(?=\s|$)/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 12), m.index);
    const after = s.slice(m.index + 2, m.index + 10);
    if (/\b(any|scores|for|max|=|×|x|of)\s*$/i.test(before) || /^\s*(mark|marks|from|m\b|s\b|kg|cm|mm|n\b|j\b|w\b|\(|×|=|%)/i.test(after)) continue;
    points.push({ body: s.slice(last, m.index).trim(), marks: +m[1] });
    last = m.index + 2;
  }
  const rest = s.slice(last).trim();
  if (rest) points.push({ body: rest, marks: null });
  return points.filter((p) => p.body).flatMap((p) => {
    // bullets inside a point ("any 3 from: • ... • ...") become their own lines
    const [head, ...bullets] = p.body.split(/\s*•\s*/);
    const split = (t) => {
      const bits = t.split(/(?<!\bnot)\s(?=(?:allow|accept|ignore|do not accept|do not allow|reject|an answer of|answer must|award)\b)/i)
        .flatMap((b, i) => b.split(/\s+or\s+(?=(?:use|take|the|a|an|by|it|they|measure|repeat)\b)/i).map((x, k) => (k ? 'OR ' + x : x)));
      return { text: bits[0].replace(/\s+or$/i, '').trim(), also: bits.slice(1).map((x) => x.replace(/\s+or$/i, '').trim()) };
    };
    if (!bullets.length) return [{ ...split(head), marks: p.marks }];
    return [{ text: head.trim(), marks: p.marks, also: [], heading: true }, ...bullets.map((b) => ({ ...split(b), marks: null, bullet: true }))];
  }).filter((x) => x.text || x.also.length);
}

// The answers on paper (for absent pupils, or to post on Google Classroom): same layout as the slides.
function answersDocx(h) {
  const ch = [para([run('MARK SCHEME', { bold: true, size: 16, color: GOLD, characterSpacing: 40 })], { spacing: { after: 0 } }),
    para([run(`${h.topic} · ${h.cls} test-ready homework`, { bold: true, size: 32, color: NAVY })], { spacing: { after: 60 } }),
    para([run('Green pen. Tick each marking point you made; write in the ones you missed. Grey lines are other answers that also get the mark.', { size: 17, color: GREY })],
      { spacing: { after: 160 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 6 } } })];
  h.qs.forEach((q, n) => {
    ch.push(para([run(` ${n + 1} `, { bold: true, size: 22, color: 'FFFFFF', shading: { type: ShadingType.CLEAR, color: 'auto', fill: NAVY } }),
      run(`   checklist ${q.plc.join(' · ')}`, { size: 16, color: GREY }), run('\t'), run(`${q.marks} marks`, { bold: true, size: 17, color: GREY })],
    { keepNext: true, tabStops: [{ type: 'right', position: RIGHT }], spacing: { before: 200, after: 60 } }));
    q.parts.forEach((p) => {
      const ms = p.ms || {}; const ex = ms.examiner || {};
      ch.push(para([run(`(${p.part || '-'})`, { bold: true, color: NAVY }), run(`   ${p.marks || 0} mark${p.marks === 1 ? '' : 's'}`, { size: 17, color: GREY })], { keepNext: true, spacing: { before: 80, after: 20 } }));
      msPoints(ms.text || 'see teacher').forEach((x) => {
        ch.push(para([run(x.heading ? '' : x.bullet ? '•  ' : '✓  ', { color: NAVY }), run(x.text, { bold: !!x.heading }), ...(x.marks ? [run('\t'), run(`[${x.marks}]`, { bold: true, size: 17, color: GREY })] : [])],
          { indent: { left: x.bullet ? 560 : 280 }, tabStops: [{ type: 'right', position: RIGHT }], spacing: { after: 10 }, keepNext: true }));
        x.also.forEach((a) => ch.push(para([run(a, { size: 17, color: GREY })], { indent: { left: 840 }, spacing: { after: 10 }, keepNext: true })));
      });
      (ms.levels || []).forEach((lv) => ch.push(para([run(`Level ${lv.level} (${lv.marks}): `, { bold: true, size: 17, color: NAVY }), run(hb.clean(lv.descriptor), { size: 17 })], { indent: { left: 280 }, spacing: { after: 10 } })));
      if (ex.commonError) ch.push(para([run('Watch out: ', { bold: true, size: 17, color: 'C25400' }), run(hb.clean(ex.commonError), { size: 17 })], { indent: { left: 280 }, spacing: { before: 20, after: 10 } }));
      if (p.passRate != null) ch.push(para([run(`${p.passRate}% of students got this in the real exam`, { size: 15, italics: true, color: GREY })], { indent: { left: 280 }, spacing: { after: 40 } }));
    });
  });
  return ch;
}

/* ----------------------------------------------- the answers to project */
async function answersPptx(h, file) {
  const PptxGenJS = require('pptxgenjs');
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
  const bg = (s) => { s.background = { color: 'FFFFFF' }; s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.95, fill: { color: NAVY } }); };
  let s = pptx.addSlide(); s.background = { color: NAVY };
  s.addText('Mark your homework', { x: 0.8, y: 1.6, w: 11.7, h: 1, fontFace: FONT, fontSize: 44, bold: true, color: GOLD });
  s.addText(`${h.topic} · test-ready homework`, { x: 0.8, y: 2.6, w: 11.7, h: 0.6, fontFace: FONT, fontSize: 24, color: 'FFFFFF' });
  s.addText([{ text: 'Green pen. ', options: { bold: true, color: GOLD } }, { text: 'Tick each marking point you made, write the correct answer for any you missed. A mark you didn\'t earn now is a mark you lose in the test.' }],
    { x: 0.8, y: 3.6, w: 11.2, h: 1.2, fontFace: FONT, fontSize: 20, color: 'D6DCF0' });
  h.qs.forEach((q, n) => {
    const stemOf = new Map(); hb.letterGroups(q.parts).forEach((g) => g.parts.forEach((p) => stemOf.set(p, g.stem)));
    // as many parts per slide as fit: each marking point and alternative is a line
    const weight = (p) => 1.3 + msPoints((p.ms || {}).text || '').reduce((a, x) => a + 1 + x.also.length * 0.7 + x.text.length / 110, 0) + ((p.ms || {}).examiner && p.ms.examiner.commonError ? 1 : 0);
    const chunks = []; let cur = [], load = 0;
    q.parts.forEach((p) => { const w = weight(p); if (cur.length && load + w > 13) { chunks.push(cur); cur = []; load = 0; } cur.push(p); load += w; });
    if (cur.length) chunks.push(cur);
    chunks.forEach((parts, ci) => {
      s = pptx.addSlide(); bg(s);
      s.addText(`Question ${n + 1}${chunks.length > 1 ? ` (${ci + 1}/${chunks.length})` : ''}`, { x: 0.4, y: 0.12, w: 7, h: 0.7, fontFace: FONT, fontSize: 26, bold: true, color: GOLD });
      s.addText(`${q.marks} marks · ${q.plc.join(' · ')}`, { x: 7.2, y: 0.12, w: 5.7, h: 0.7, fontFace: FONT, fontSize: 16, color: 'FFFFFF', align: 'right' });
      const rows = [];
      parts.forEach((p) => {
        const ms = p.ms || {}; const ex = ms.examiner || {};
        rows.push({ text: `(${p.part || '-'})   ${p.marks || 0} mark${p.marks === 1 ? '' : 's'}`, options: { bold: true, color: NAVY, fontSize: 17, breakLine: true } });
        const pts = msPoints(ms.text || 'see teacher');
        pts.forEach((x) => {
          rows.push({ text: x.heading ? `${x.text}` : `${x.bullet ? '   • ' : '✓  '}${x.text}`, options: { color: INK, fontSize: x.heading ? 16 : 18, bold: !!x.heading, breakLine: !x.marks } });
          if (x.marks) rows.push({ text: `   [${x.marks}]`, options: { color: GREY, fontSize: 14, bold: true, breakLine: true } });
          x.also.forEach((a) => rows.push({ text: `        ${a}`, options: { color: GREY, fontSize: 14, breakLine: true } }));
        });
        (ms.levels || []).slice(0, 3).forEach((lv) => rows.push({ text: `Level ${lv.level} (${lv.marks}): ${hb.clean(lv.descriptor).slice(0, 160)}`, options: { fontSize: 13, color: GREY, breakLine: true } }));
        if (ex.commonError) rows.push({ text: `Watch out: ${hb.clean(ex.commonError).slice(0, 200)}`, options: { fontSize: 14, color: 'C25400', breakLine: true } });
        if (p.passRate != null) rows.push({ text: `${p.passRate}% of students got this in the real exam`, options: { fontSize: 12, italic: true, color: GREY, breakLine: true } });
        rows.push({ text: ' ', options: { fontSize: 8, breakLine: true } });
      });
      s.addText(rows, { x: 0.5, y: 1.15, w: 12.3, h: 6.1, fontFace: FONT, valign: 'top', paraSpaceAfter: 4 });
    });
  });
  s = pptx.addSlide(); bg(s);
  s.addText('Now fill in your checklist', { x: 0.4, y: 0.12, w: 12, h: 0.7, fontFace: FONT, fontSize: 26, bold: true, color: GOLD });
  s.addText([
    { text: '1. Add up your marks for each statement in the table at the end of the homework.', options: { breakLine: true } },
    { text: '2. Less than half on a statement? Tick "Revise?".', options: { breakLine: true } },
    { text: '3. Those are the statements to revise before the test: your PLC has them all.', options: { breakLine: true } },
    { text: ' ', options: { breakLine: true } },
    { text: `Score out of ${h.marks}: hands up for 0-${Math.round(h.marks / 3)}, ${Math.round(h.marks / 3) + 1}-${Math.round(2 * h.marks / 3)}, ${Math.round(2 * h.marks / 3) + 1}-${h.marks}`, options: { color: GREY } },
  ], { x: 0.6, y: 1.3, w: 12, h: 5, fontFace: FONT, fontSize: 22, color: INK, valign: 'top', paraSpaceAfter: 10 });
  await pptx.writeFile({ fileName: file });
}

async function main() {
  const a = process.argv.slice(2);
  const cls = (a.find((x) => !x.startsWith('--')) || '').toUpperCase().replace(/^(\d+)([A-Z]+)(\d*)$/, '$1$2$3');
  const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
  if (!cls) { console.error('usage: node test-homework.js <class> [--marks 20] [--due YYYY-MM-DD] [--topic "P6 Waves"] [--all] [--dry-run]'); process.exit(1); }
  const p = plan(cls, { marks: +opt('marks', 20), topic: opt('topic', null), all: a.includes('--all'), inBooks: !a.includes('--lines') });
  console.log(`\n${cls} ${p.topicFolder}: test-ready homework`);
  console.log(`  test papers read: ${p.test.files.join(' | ') || '(none found)'}`);
  console.log(`  PLC: ${p.plc.length} statements, ${p.plc.filter((s) => s.covered).length} taught so far`);
  p.plc.forEach((s) => console.log(`    ${s.covered ? '✓' : ' '} ${s.code.padEnd(4)} ${s.text.slice(0, 70)}${s.lesson ? `  (${s.lesson})` : ''}`));
  console.log(`  questions considered: ${Object.entries(p.why).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  p.chosen.forEach((q, i) => console.log(`  ${i + 1}. [${q.marks}] ${q.id}  pass ${q.passRate == null ? '?' : q.passRate + '%'}  ${q.plc.join(',')}${q.stretch ? '  STRETCH' : ''}  "${hb.clean(q.parts[0].text).slice(0, 60)}"`));
  console.log(`  total ${p.marks} marks; statements practised: ${[...new Set(p.chosen.flatMap((q) => q.plc))].join(', ')}`);
  if (a.includes('--dry-run') || !p.chosen.length) return;

  const due = opt('due', '');
  const dueText = due ? new Date(due).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const practised = new Set(p.chosen.flatMap((q) => q.plc));
  const h = { inBooks: !a.includes('--lines'), cls, topic: p.topicFolder, due: dueText, marks: p.marks, qs: p.chosen, statements: p.plc.filter((s) => practised.has(s.code)) };
  const date = new Date().toISOString().slice(0, 10);
  const outDir = path.join(ROOT, 'homework-out', `${cls} ${p.topicFolder} ${date}`);
  fs.mkdirSync(outDir, { recursive: true });
  const children = [...header(h)];
  p.chosen.forEach((q, i) => children.push(...questionBlock(q, i + 1, h.inBooks)));
  children.push(...checklist(h));
  const hw = path.join(outDir, `${cls} ${p.topicFolder} Homework.docx`);
  await hb.writeDocx(children, hw);
  await answersPptx(h, path.join(outDir, `${cls} ${p.topicFolder} Answers (project).pptx`));
  await hb.writeDocx(answersDocx(h), path.join(outDir, `${cls} ${p.topicFolder} Answers.docx`));
  if (!a.includes('--no-record')) {
    p.usage[cls + ':homework'] = [...new Set([...(p.usage[cls + ':homework'] || []), ...p.chosen.map((q) => q.id)])];
    fs.writeFileSync(ep.USAGE, JSON.stringify(p.usage, null, 1), 'utf8');
  }
  console.log(`\n  -> ${outDir}`);
}

module.exports = { plan, readPLC, readTests, tickBox, tokens, figKind, msPoints };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
