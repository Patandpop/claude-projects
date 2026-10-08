#!/usr/bin/env node
'use strict';
/* ============================================================================
   exam-library-ocr.js — read Patryk's OCR A-level Physics question exports (2026-10-08).

   The files in Admin/Exam Questions/A Level Physics are OCR ExamBuilder exports saved as web
   pages ("MIME-Version: 1.0", the page itself base64 inside). Their names carry no topic:
   Assessment_bank_test_export.doc, then (1) ... (67). A_Level_Physics_folder_names.xlsx in the
   same folder says which is which: row 2 = the file with no number, row n+2 = "(n)".
   Columns: B Topic, C Sub-topic, D Sub-sub-topic.

   Each file: numbered questions ("1.", "8(a).") whose parts end with their marks "[2]", then
   "END OF QUESTION PAPER", "Mark scheme", and one block per question ending "Total N" (a
   multiple-choice answer is the letter: "2 C"), with the examiner's comments.

   Output (local only; Drive files are never changed):
     exam-library/docs-ocr/<slug>.json   one file per export, parts with text, marks, mark scheme
     exam-library/catalogue-ocr.json     the slim index
   Every question and answer stays VERBATIM (the exam library's rule). Board: OCR A, A-level.

   Usage: node references/exam-library-ocr.js [--root "<folder>"] [--out "<exam-library>"]
   ============================================================================ */

const fs = require('fs');
const path = require('path');

const DEFAULT_ROOT = 'G:\\My Drive\\Beechen Cliff Science\\Admin\\Exam Questions\\A Level Physics';
const DEFAULT_OUT = path.join(__dirname, '..', '..', 'exam-library');

const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', minus: '−', times: '×', divide: '÷',
  deg: '°', rho: 'ρ', Omega: 'Ω', omega: 'ω', pi: 'π', epsilon: 'ε', lambda: 'λ', mu: 'μ', Delta: 'Δ', delta: 'δ', theta: 'θ', alpha: 'α', beta: 'β', gamma: 'γ',
  sigma: 'σ', phi: 'φ', tau: 'τ', prop: '∝', ensp: ' ', emsp: ' ', thinsp: ' ', ndash: '–', mdash: '-', hellip: '…', sup2: '²', sup3: '³', middot: '·', plusmn: '±', le: '≤', ge: '≥', asymp: '≈', radic: '√', infin: '∞' };
const decodeEnt = (s) => s.replace(/&(#\d+|[a-zA-Z]+\d?);/g, (m, e) => (e[0] === '#' ? String.fromCharCode(+e.slice(1)) : (ENT[e] != null ? ENT[e] : m)));

// The question-and-answer page inside an export, as plain text (one line per paragraph).
function pageText(raw) {
  const parts = raw.split(/------=_NextPart[^\n]*\n/);
  const html = parts.filter((p) => /Content-Type: text\/html/i.test(p.slice(0, 400)) && /my_html/.test(p.slice(0, 400)))
    .map((p) => Buffer.from(p.slice(p.search(/\r?\n\r?\n/)).replace(/\s+/g, ''), 'base64').toString('utf8'))[0] || '';
  return decodeEnt(html.replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<sup>\s*([^<]*)<\/sup>/gi, '^$1').replace(/<sub>\s*([^<]*)<\/sub>/gi, '_$1')
    .replace(/<img[^>]*>/gi, ' [FIGURE] ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|h\d|li|table)>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t\u2002\u2003]+/g, ' ').split('\n').map((l) => l.trim()).filter(Boolean);
}

const CMD = /\b(state|name|define|calculate|show that|explain|describe|suggest|determine|estimate|sketch|draw|compare|discuss|evaluate|write down|complete|which|what|label|identify|predict|deduce)\b/i;

function parseExport(raw) {
  const lines = pageText(raw);
  const end = lines.findIndex((l) => /^END OF QUESTION PAPER$/i.test(l));
  const msAt = lines.findIndex((l, k) => k > end && /^Mark scheme$/i.test(l));
  if (end < 0 || msAt < 0) throw new Error('no "END OF QUESTION PAPER" / "Mark scheme" found: not an ExamBuilder export?');
  const qLines = lines.slice(0, end), mLines = lines.slice(msAt + 2);   // skip the "Question Answer Marks Guidance" header

  // questions: "1." or "8(a)." starts a question; every "[n]" closes a part
  const questions = [];
  let cur = null, buf = [];
  for (const l of qLines) {
    const m = /^(\d+)(?:\(([a-z])\))?\.\s*(.*)$/.exec(l);
    if (m && (!cur || +m[1] === cur.n + 1)) { cur = { n: +m[1], parts: [] }; questions.push(cur); buf = []; if (m[3]) buf.push(m[3]); continue; }
    if (!cur) continue;
    const sub = /^\(([a-z])\)\.\s*(.*)$/.exec(l);
    if (sub) { if (sub[2]) buf.push(sub[2]); continue; }
    const mk = /\[(\d+)\]\s*$/.exec(l);
    if (mk) {
      const last = l.replace(/\[(\d+)\]\s*$/, '').trim();
      if (last) buf.push(last);
      const text = buf.join('\n').replace(/\n?Your answer\s*(\[FIGURE\])?\s*$/i, '').trim();
      const options = text.split('\n').filter((x) => /^[A-D]\s+\S/.test(x));
      cur.parts.push({ text, marks: +mk[1], mcqOptions: options.length === 4 ? options : null });
      buf = [];
    } else buf.push(l);
  }

  // mark scheme: one block per question, closed by "Total N"
  const blocks = [];
  let mb = [];
  for (const l of mLines) {
    if (/^Total\s+\d+$/i.test(l)) { blocks.push(mb); mb = []; } else mb.push(l);
  }
  questions.forEach((q, k) => {
    const b = blocks[k] || [];
    const exAt = b.findIndex((l) => /^Examiner.s Comments?/i.test(l));
    const scheme = (exAt >= 0 ? b.slice(0, exAt) : b).join('\n');
    const comment = exAt >= 0 ? b.slice(exAt + 1).join(' ') : '';
    const mcq = /^\d+\s+([A-D])\b/.exec(b[0] || '');
    q.parts.forEach((p, i) => {
      p.ms = { text: q.parts.length === 1 ? scheme.replace(/^\d+\s+/, '') : scheme, examinerCommentary: comment };
      p.mcqAnswer = p.mcqOptions && mcq && q.parts.length === 1 ? mcq[1] : null;
      p.hasFigure = /\[FIGURE\]|\bFig\.\s*\d|shown below|diagram below/i.test(p.text);
      p.commandWord = ((CMD.exec(p.text.split('\n').slice(-1)[0]) || CMD.exec(p.text) || [])[1] || '').toLowerCase();
      p.part = q.parts.length > 1 ? String.fromCharCode(97 + i) : '';
      p.questionTotalMarks = q.parts.reduce((n, x) => n + x.marks, 0);
    });
  });
  return { questions, blocks: blocks.length };
}

// Which topic each export holds, from his spreadsheet (no extra libraries: read the xlsx XML).
function readIndex(xlsxPath) {
  const AdmZip = require('adm-zip');
  const z = new AdmZip(xlsxPath);
  const ssXml = z.getEntry('xl/sharedStrings.xml') ? z.readAsText('xl/sharedStrings.xml') : '';
  const ss = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decodeEnt([...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((t) => t[1]).join('')));
  const sheet = z.readAsText('xl/worksheets/sheet1.xml');
  const rows = {};
  for (const c of sheet.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, col, row, attrs, inner] = c;
    if (!inner) continue;
    let v = (/<v>([^<]*)<\/v>/.exec(inner) || [])[1];
    if (/t="s"/.test(attrs)) v = ss[+v];
    else if (/t="inlineStr"/.test(attrs)) v = [...inner.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((t) => t[1]).join('');
    (rows[+row] = rows[+row] || {})[col] = decodeEnt(String(v == null ? '' : v)).trim();
  }
  return rows;
}

const slug = (s) => String(s || '').trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function run(opts) {
  const o = opts || {};
  const root = o.root || DEFAULT_ROOT, out = o.out || DEFAULT_OUT;
  const xlsx = fs.readdirSync(root).find((f) => /\.xlsx$/i.test(f));
  if (!xlsx) throw new Error('no topic spreadsheet (.xlsx) in ' + root);
  const rows = readIndex(path.join(root, xlsx));
  const docsDir = path.join(out, 'docs-ocr');
  fs.mkdirSync(docsDir, { recursive: true });
  const catalogue = [], report = [];
  const files = fs.readdirSync(root).filter((f) => /^Assessment_bank_test_export( \(\d+\))?\.doc$/i.test(f));
  for (const f of files) {
    const n = /\((\d+)\)/.exec(f);
    const row = rows[(n ? +n[1] : 0) + 2] || {};
    const topic = row.B || '?', subtopic = row.C || '?', subsub = row.D || '';
    try {
      const { questions, blocks } = parseExport(fs.readFileSync(path.join(root, f), 'latin1'));
      const id = slug(`ALevel-Physics-${subtopic}-${subsub}`);
      const parts = questions.flatMap((q) => q.parts.map((p) => ({
        id: `${id}#Q${q.n}${p.part}`, subject: 'Physics', board: 'OCR A', level: 'A', topic, subtopic, subsubtopic: subsub,
        question: q.n, part: p.part, text: p.text, marks: p.marks, commandWord: p.commandWord, hasFigure: p.hasFigure,
        mcqOptions: p.mcqOptions, mcqAnswer: p.mcqAnswer, questionTotalMarks: p.questionTotalMarks, ms: p.ms,
      })));
      fs.writeFileSync(path.join(docsDir, id + '.json'), JSON.stringify({ source: f, board: 'OCR A', level: 'A', subject: 'Physics', topic, subtopic, subsubtopic: subsub, parsedAt: new Date().toISOString(), parts }, null, 1));
      parts.forEach((p) => catalogue.push({ id: p.id, topic, subtopic, subsubtopic: subsub, marks: p.marks, cmd: p.commandWord, mcq: !!p.mcqAnswer, figure: p.hasFigure }));
      const warn = blocks !== questions.length ? ` (mark scheme blocks ${blocks} vs questions ${questions.length})` : '';
      report.push(`ok   ${f} -> ${subtopic} / ${subsub}: ${questions.length} questions, ${parts.length} parts${warn}`);
    } catch (e) { report.push(`FAIL ${f} (${subtopic} / ${subsub}): ${e.message}`); }
  }
  fs.writeFileSync(path.join(out, 'catalogue-ocr.json'), JSON.stringify({ builtOn: new Date().toISOString(), board: 'OCR A', level: 'A', parts: catalogue }));
  return { report, parts: catalogue.length };
}

if (require.main === module) {
  const a = process.argv.slice(2), v = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  const r = run({ root: v('--root'), out: v('--out') });
  r.report.forEach((l) => console.log(l));
  console.log(`\n${r.parts} A-level parts written`);
} else module.exports = { parseExport, pageText, readIndex, run };
