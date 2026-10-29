#!/usr/bin/env node
'use strict';
/* ============================================================================
   mcq-analyse.js — how real exam multiple-choice questions are built (Patryk 2026-10-10).

   Reads every multiple-choice question in the exam library (AQA GCSE "Tick one box" questions and
   OCR A-level A-D questions, found by exam-categorise.js) and measures what makes them work:
     - where the right answer sits (A, B, C, D) and whether options are put in order;
     - option lengths: is the right answer the longest (a give-away)?
     - numeric questions: how each WRONG number relates to the right one (a power of ten out,
       doubled/halved, squared or square-rooted, upside down, a small slip, the same digits ...);
     - word questions: options that differ by one word, "not"/"never" stems, all/none of the above;
     - what examiners say about the wrong answers ("many chose B because ...");
     - how hard each kind is (the AQA pass rate).
   Output: exam-library/mcq-analysis.json (numbers + examples) and exam-library/mcq-analysis.md
   (a short readable summary). Local, free: no API. The rules drawn from it are written by hand
   into references/mcq-rules.md, which is what lessons and homework follow.

   Usage: node references/mcq-analyse.js [--quiet]
   ============================================================================ */

const fs = require('fs');
const path = require('path');
const { categorise } = require('./exam-categorise.js');

const ROOT = path.join(__dirname, '..', '..');
const LIB = path.join(ROOT, 'exam-library');
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return d; } };

// every real MCQ: { board, level, subject, topic, stem, options[], answer(index), passRate, commentary }
function collect() {
  const out = [];
  for (const [dir, board] of [['docs', 'AQA'], ['docs-ocr', 'OCR A']]) {
    const d = path.join(LIB, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      const doc = readJson(path.join(d, f), null);
      if (!doc) continue;
      for (const p of doc.parts || []) {
        const c = categorise(p);
        if (!c || !c.mcq || c.mcq.answer < 0) continue;
        const opts = c.mcq.options.map((o) => String(o).trim());
        if (opts.length < 3 || opts.some((o) => !o)) continue;
        out.push({ id: p.id || `${f}#Q${p.question}${p.part || ''}`, board, level: board === 'AQA' ? 'GCSE' : 'A', subject: doc.subject || p.subject,
          topic: p.subsubtopic || p.subtopic || doc.subtopic || '', stem: String(c.mcq.stem || ''), options: opts, answer: c.mcq.answer,
          pictures: /\[FIG/.test(opts.join(' ')), passRate: p.passRate != null ? p.passRate : null,
          commentary: String((p.ms && p.ms.examinerCommentary) || '') });
      }
    }
  }
  return out;
}

// "4.9 × 10^7 J kg^−1" -> 4.9e7 ; "2.5 × 10^–6" ; "1.91 pc" ; "35.5°" ; "0.48 L". Null if not a number option.
function numberOf(s) {
  const t = String(s).replace(/[−–]/g, '-').replace(/\s+/g, ' ').trim().replace(/(\d)[ \u2009\u00a0](?=\d{3}\b)/g, '$1');   // "60 000 J" is 60000, not 60
  // AQA text lost its raised powers: "3 × 10–12" means 3 × 10^-12
  const m = /^(-?\d+(?:\.\d+)?)(?:\s*[×x]\s*10\^?\{?(-?\d+)\}?)?/.exec(t);
  if (!m) return null;
  return parseFloat(m[1]) * Math.pow(10, m[2] ? +m[2] : 0);
}
const unitOf = (s) => String(s).replace(/[−–]/g, '-').replace(/(\d)[   ](?=\d{3}\b)/g, '$1').replace(/^-?\d+(?:\.\d+)?(?:\s*[×x]\s*10\^?\{?-?\d+\}?)?/, '').trim();
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b));

// how a wrong number relates to the right one
function relation(wrong, right) {
  if (!isFinite(wrong) || !isFinite(right) || right === 0 || wrong === 0) return 'other';
  const r = wrong / right;
  const lg = Math.log10(Math.abs(r));
  const TOL = 0.005;                                       // about 1%: 9.81 is not 10
  const isPow10 = Math.abs(lg - Math.round(lg)) < TOL && Math.round(lg) !== 0;
  if (isPow10) return 'power of ten out';
  if (Math.sign(wrong) !== Math.sign(right) && near(Math.abs(wrong), Math.abs(right), 0.02)) return 'sign wrong';
  if (near(wrong, right, 0.15)) return 'close: a small slip or rounding';
  for (const [k, name] of [[2, 'doubled / halved'], [4, 'x4 / quartered'], [3, 'x3 / a third'], [Math.PI, 'pi slip'], [2 * Math.PI, '2 pi slip'], [9.81, 'g slip (x 9.81)'], [60, 'minutes / seconds'], [3600, 'hours / seconds']]) {
    for (const x of [k, 1 / k]) { const q = r / x; const l = Math.log10(Math.abs(q)); if (Math.abs(l - Math.round(l)) < TOL) return name + (Math.round(l) ? ' and a power of ten' : ''); }
  }
  const sq = Math.abs(wrong) / (right * right), rt = Math.abs(wrong) / Math.sqrt(Math.abs(right));
  for (const x of [sq, rt]) { const l = Math.log10(x); if (Math.abs(l - Math.round(l)) < TOL) return 'squared / square-rooted'; }
  const inv = Math.abs(wrong * right); const li = Math.log10(inv);
  if (Math.abs(li - Math.round(li)) < TOL) return 'upside down (1/x)';
  const dw = String(wrong.toExponential(3)).split('e')[0].replace('.', '').replace(/0+$/, ''), dr = String(right.toExponential(3)).split('e')[0].replace('.', '').replace(/0+$/, '');
  if (dw === dr) return 'same digits';
  return 'other';
}

function analyse(all) {
  const by = (xs, f) => xs.reduce((m, x) => { const k = f(x); (m[k] = m[k] || []).push(x); return m; }, {});
  const pct = (n, d) => (d ? Math.round(1000 * n / d) / 10 : 0);
  const avg = (xs) => (xs.length ? Math.round(10 * xs.reduce((a, b) => a + b, 0) / xs.length) / 10 : null);
  const out = { builtOn: new Date().toISOString().slice(0, 10), total: all.length, byBoard: {} };
  for (const [board, xs] of Object.entries(by(all, (x) => x.board))) {
    const four = xs.filter((x) => x.options.length === 4);
    const pos = [0, 1, 2, 3].map((i) => pct(four.filter((x) => x.answer === i).length, four.length));
    const textual = xs.filter((x) => !x.pictures && x.options.every((o) => numberOf(o) == null));
    const longest = textual.filter((x) => { const L = x.options.map((o) => o.length); return L[x.answer] === Math.max(...L) && L.filter((l) => l === Math.max(...L)).length === 1; });
    const shortest = textual.filter((x) => { const L = x.options.map((o) => o.length); return L[x.answer] === Math.min(...L) && L.filter((l) => l === Math.min(...L)).length === 1; });
    const spread = textual.map((x) => { const L = x.options.map((o) => o.length); return Math.max(...L) / Math.max(1, Math.min(...L)); });
    const numeric = xs.filter((x) => x.options.every((o) => numberOf(o) != null));
    const ascending = numeric.filter((x) => { const v = x.options.map(numberOf); return v.every((n, i) => !i || n >= v[i - 1]); });
    const descending = numeric.filter((x) => { const v = x.options.map(numberOf); return v.every((n, i) => !i || n <= v[i - 1]); });
    const sameUnit = numeric.filter((x) => new Set(x.options.map(unitOf)).size === 1);
    const unitTrap = numeric.filter((x) => new Set(x.options.map(unitOf)).size > 1);
    const rel = {};
    const relEx = {};
    for (const x of numeric) {
      const right = numberOf(x.options[x.answer]);
      x.options.forEach((o, i) => { if (i === x.answer) return; const r = relation(numberOf(o), right); rel[r] = (rel[r] || 0) + 1; if (!relEx[r] || relEx[r].length < 3) (relEx[r] = relEx[r] || []).push({ id: x.id, right: x.options[x.answer], wrong: o }); });
    }
    const relTotal = Object.values(rel).reduce((a, b) => a + b, 0);
    // pairs: the right answer and one wrong answer differ by a single word (the "near miss" distractor)
    const oneWord = textual.filter((x) => x.options.some((o, i) => i !== x.answer && wordDiff(o, x.options[x.answer]) === 1));
    const negStem = xs.filter((x) => /\b(not|never|incorrect|false|least)\b/i.test(x.stem));
    const allNone = xs.filter((x) => x.options.some((o) => /\b(all|none|both|neither) of (the|these)\b/i.test(o)));
    const pictures = xs.filter((x) => x.pictures);
    const rates = xs.filter((x) => x.passRate != null);
    const kindRate = {
      numeric: avg(rates.filter((x) => numeric.includes(x)).map((x) => x.passRate)),
      words: avg(rates.filter((x) => textual.includes(x)).map((x) => x.passRate)),
      'one-word near miss': avg(rates.filter((x) => oneWord.includes(x)).map((x) => x.passRate)),
      'negative stem (NOT ...)': avg(rates.filter((x) => negStem.includes(x)).map((x) => x.passRate)),
    };
    // what examiners say about wrong answers
    const said = xs.filter((x) => /\b(chose|selected|opted|distractor|option [A-D]|response [A-D]|[A-D] was (the )?(most )?(common|popular))\b/i.test(x.commentary));
    const reasons = {};
    const REASONS = [['forgot to square / square root', /\b(square|squar(ed|ing)|root)\b/i], ['power of ten / prefix', /\b(power of ten|prefix|milli|kilo|micro|nano|×\s*10|factor of 10)\b/i],
      ['units', /\bunits?\b/i], ['upside down / inverse', /\b(invert|inverse|reciprocal|upside)\b/i], ['halved / doubled', /\b(halved|halving|doubled|doubling|twice|factor of (2|two))\b/i],   // not "half of students"
      ['misread the graph or diagram', /\b(graph|gradient|area under|diagram|axis|scale)\b/i], ['confused two quantities', /\b(confus|mix(ed)? up|instead of)\b/i],
      ['did not read the question carefully', /\b(misread|read the question|carefully|overlooked|ignored)\b/i], ['direction / sign', /\b(direction|sign|negative|opposite)\b/i]];
    for (const x of said) for (const [k, re] of REASONS) if (re.test(x.commentary)) reasons[k] = (reasons[k] || 0) + 1;
    out.byBoard[board] = {
      questions: xs.length, withFourOptions: four.length, answerPosition: { A: pos[0], B: pos[1], C: pos[2], D: pos[3] },
      wordOptions: { count: textual.length, rightIsLongestPct: pct(longest.length, textual.length), rightIsShortestPct: pct(shortest.length, textual.length),
        lengthRatioMedian: Math.round(10 * spread.sort((a, b) => a - b)[Math.floor(spread.length / 2)]) / 10, oneWordNearMissPct: pct(oneWord.length, textual.length) },
      numericOptions: { count: numeric.length, inAscendingOrderPct: pct(ascending.length, numeric.length), inDescendingOrderPct: pct(descending.length, numeric.length),
        allSameUnitPct: pct(sameUnit.length, numeric.length), unitsDifferPct: pct(unitTrap.length, numeric.length),
        wrongAnswerKinds: Object.fromEntries(Object.entries(rel).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, pct(n, relTotal)])), examples: relEx },
      negativeStemPct: pct(negStem.length, xs.length), allOrNoneOfTheAbovePct: pct(allNone.length, xs.length), pictureOptionsPct: pct(pictures.length, xs.length),
      passRateByKind: kindRate, examinerNamesAWrongAnswer: said.length, examinerReasons: Object.fromEntries(Object.entries(reasons).sort((a, b) => b[1] - a[1])),
      examinerExamples: said.filter((x) => x.commentary.length < 600).slice(0, 8).map((x) => ({ id: x.id, stem: x.stem.slice(0, 200), options: x.options, answer: 'ABCD'[x.answer], said: x.commentary.slice(0, 400) })),
    };
  }
  return out;
}
function wordDiff(a, b) {
  const A = String(a).toLowerCase().split(/\s+/), B = String(b).toLowerCase().split(/\s+/);
  if (A.length !== B.length) return 99;
  return A.filter((w, i) => w !== B[i]).length;
}

function summary(r) {
  const L = [`# Real exam multiple choice: what makes them work`, '', `Built ${r.builtOn} from ${r.total} real questions in the exam library (mcq-analyse.js). Numbers are percentages.`, ''];
  for (const [board, b] of Object.entries(r.byBoard)) {
    L.push(`## ${board === 'AQA' ? 'AQA GCSE' : 'OCR A-level'} (${b.questions} questions)`, '');
    L.push(`- Right answer position: A ${b.answerPosition.A}, B ${b.answerPosition.B}, C ${b.answerPosition.C}, D ${b.answerPosition.D}.`);
    L.push(`- Word options (${b.wordOptions.count}): the right answer is the longest in ${b.wordOptions.rightIsLongestPct}, the shortest in ${b.wordOptions.rightIsShortestPct}. Longest option is typically ${b.wordOptions.lengthRatioMedian} times the shortest. One wrong option differs from the right one by a single word in ${b.wordOptions.oneWordNearMissPct}.`);
    L.push(`- Number options (${b.numericOptions.count}): in ascending order ${b.numericOptions.inAscendingOrderPct}, descending ${b.numericOptions.inDescendingOrderPct}; all the same unit ${b.numericOptions.allSameUnitPct}.`);
    L.push(`- What the wrong numbers are: ${Object.entries(b.numericOptions.wrongAnswerKinds).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
    L.push(`- Stems with NOT / never / least: ${b.negativeStemPct}. "All/none of the above": ${b.allOrNoneOfTheAbovePct}. Picture options: ${b.pictureOptionsPct}.`);
    const pr = Object.entries(b.passRateByKind).filter(([, v]) => v != null);
    if (pr.length) L.push(`- Average pass rate: ${pr.map(([k, v]) => `${k} ${v}%`).join(', ')}.`);
    if (Object.keys(b.examinerReasons).length) L.push(`- Examiner comments naming a wrong answer (${b.examinerNamesAWrongAnswer}), by reason: ${Object.entries(b.examinerReasons).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
    L.push('');
  }
  return L.join('\n');
}

if (require.main === module) {
  const all = collect();
  const r = analyse(all);
  fs.writeFileSync(path.join(LIB, 'mcq-analysis.json'), JSON.stringify(r, null, 1));
  const md = summary(r);
  fs.writeFileSync(path.join(LIB, 'mcq-analysis.md'), md);
  if (!process.argv.includes('--quiet')) console.log(md);
} else module.exports = { collect, analyse, numberOf, relation, summary };
