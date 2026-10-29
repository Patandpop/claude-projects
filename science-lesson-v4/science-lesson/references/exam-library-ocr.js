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
     exam-library/docs-ocr/<slug>.json   one file per export, parts with text, marks, mark scheme,
                                         pictures (figureFiles, [FIG:n]) and tables ([TABLE:n], tables)
     exam-library/figures/<sha>.png      the pictures, taken from inside the exports (2026-10-10)
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
  sigma: 'σ', phi: 'φ', tau: 'τ', prop: '∝', ensp: ' ', emsp: ' ', thinsp: ' ', ndash: '–', mdash: '-', hellip: '…', sup2: '²', sup3: '³', middot: '·', plusmn: '±', le: '≤', ge: '≥', asymp: '≈', radic: '√', infin: '∞',
  rarr: '→', larr: '←', harr: '↔', uarr: '↑', darr: '↓', rArr: '⇒', ne: '≠', approx: '≈', equiv: '≡', sum: 'Σ', part: '∂', nabla: '∇', int: '∫',
  Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', psi: 'ψ', eta: 'η', kappa: 'κ', nu: 'ν', xi: 'ξ', zeta: 'ζ', chi: 'χ', Lambda: 'Λ', Gamma: 'Γ', Theta: 'Θ',
  frac12: '½', frac14: '¼', frac34: '¾', micro: 'µ', prime: '′', Prime: '″', permil: '‰', bull: '•', ordm: 'º', acute: '´', sdot: '⋅', lowast: '∗', ang: '∠', perp: '⊥', there4: '∴', Aring: 'Å' };
Object.assign(ENT, { pound: '£', Pi: 'Π', circ: 'ˆ', raquo: '»', laquo: '«', frasl: '⁄', upsilon: 'υ', Upsilon: 'Υ', Omicron: 'Ο', omicron: 'ο', Epsilon: 'Ε', Mu: 'Μ', Tau: 'Τ' });
// "&frac12;" has two digits (it used to stay as code: 2,342 times in the library)
const decodeEnt = (s) => s.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+\d*);/g, (m, e) => (e[0] === '#' ? String.fromCharCode(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] != null ? ENT[e] : m)));

// 2026-10-10: pictures, tables and lettered option lists are kept (they used to be dropped).
//   picture      -> [FIG:n]   n = its order in the export; the image itself is inside the .doc
//                             (one MIME part per picture, matched by its path after "core/files/")
//   answer box   -> [BOX]     ("Your answer" squares, tick circles, the no-calculator icon)
//   real table   -> [TABLE:n] on its own line; its rows and cells are kept (cells may hold [FIG:n])
//   option table -> "A ..." lines (A | option rows), or [TABLE:n] when each option is a table ROW
//   <ol type="A"> -> "A ..." lines (the letters were drawn by the list and got lost)
const BOX_IMG = /(?:square|circle|tick|box)(?:_150)?\.png|non_calculator_img|class="?totalrow/i;
const figKey = (src) => {
  let s = String(src || '');
  try { s = decodeURIComponent(s); } catch (_) { /* keep as is */ }
  // "https://exambuilder.ocr.org.uk/core/files/questions_migrate/..." and "core/public/../files/questions_migrate/..."
  const t = s.replace(/\\/g, '/');
  const m = /(questions_migrate\/.+)$/i.exec(t) || /core\/files\/(.+)$/i.exec(t);
  return m ? m[1].trim().toLowerCase() : null;
};
// italic / bold / span tags vanish without a space: "<em>F</em><sub>2</sub>" is F_2, not "F _2"
const INLINE_TAG = /<\/?(em|i|b|strong|u|span|font)\b[^>]*>/gi;
// decoded cell text going back into the html: "0 < F_2 < F_1" must not be read as a tag later
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inlineText = (h) => decodeEnt(String(h)
  .replace(/<sup[^>]*>\s*([^<]*)<\/sup>/gi, (m, x) => '^' + x.replace(/\s+/g, '')).replace(/<sub[^>]*>\s*([^<]*)<\/sub>/gi, (m, x) => '_' + x.replace(/\s+/g, ''))
  .replace(/<br\s*\/?>/gi, ' ').replace(INLINE_TAG, '').replace(/<[^>]+>/g, ' ')).replace(/[ \t   ]+/g, ' ').replace(/\^([−–\-+])\s*\^(?=\d)/g, '^$1').trim();

// the html page inside an export (the first "my_html" part)
function pageHtml(raw) {
  const parts = raw.split(/------=_NextPart[^\n]*\n/);
  return parts.filter((p) => /Content-Type: text\/html/i.test(p.slice(0, 400)) && /my_html/.test(p.slice(0, 400)))
    .map((p) => Buffer.from(p.slice(p.search(/\r?\n\r?\n/)).replace(/\s+/g, ''), 'base64').toString('utf8'))[0] || '';
}
// every picture stored inside an export: key (path after core/files/) -> image bytes
function embeddedImages(raw) {
  const out = new Map();
  for (const p of raw.split(/------=_NextPart[^\n]*\n/)) {
    const head = p.slice(0, 800);
    if (!/Content-Type:\s*image\//i.test(head)) continue;
    const key = figKey((/Content-Location:\s*([^\r\n]+)/i.exec(head) || [])[1]);
    if (!key || out.has(key)) continue;
    out.set(key, Buffer.from(p.slice(p.search(/\r?\n\r?\n/)).replace(/\s+/g, ''), 'base64'));
  }
  return out;
}

// Html -> lines, with pictures numbered, tables kept and option letters restored.
// Returns the lines with .figs (picture keys in [FIG:n] order) and .tables ([TABLE:n] rows).
function pageText(raw, html) {
  let h = (html != null ? html : pageHtml(raw)).replace(/<style[\s\S]*?<\/style>/gi, '');
  const figs = [], tables = [];
  h = h.replace(/<img\b[^>]*>/gi, (tag) => {
    if (BOX_IMG.test(tag)) return ' [BOX] ';
    const key = figKey((/\bsrc=["']?([^"'\s>]+)/i.exec(tag) || [])[1]) || figKey((/data-fallback=["']?([^"'>]+)/i.exec(tag) || [])[1]);
    if (!key) return ' [BOX] ';
    figs.push(key);
    return ` [FIG:${figs.length - 1}] `;
  });
  // only the questions get tables and lists rebuilt; the mark scheme is itself one big table
  // and is read as before (one line per row)
  const endAt = h.search(/END OF QUESTION PAPER/i);
  let q = endAt >= 0 ? h.slice(0, endAt) : h;
  const rest = endAt >= 0 ? h.slice(endAt) : '';
  // lettered lists: <ol type="A"><li>1.2 L</li>... -> "A 1.2 L"
  for (let guard = 0; guard < 50; guard++) {
    const before = q;
    q = q.replace(/<ol\b([^>]*)>((?:(?!<ol\b)[\s\S])*?)<\/ol>/i, (m, attrs, body) => {
      const type = (/type=["']?([AaIi1])/.exec(attrs) || [])[1] || (/oltype_i/.test(attrs) ? 'i' : '1');
      let k = Math.max(0, +((/start=["']?(\d+)/.exec(attrs) || [])[1] || 1) - 1);   // <ol start="2"> carries on from (ii)
      const label = () => { const n = k++; return type === 'A' ? 'ABCDEFGH'[n] : type === 'a' ? `(${'abcdefgh'[n]})` : /[iI]/.test(type) ? `(${['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'][n]})` : `(${n + 1})`; };   // never "2." (that would start a new question)
      return '\n' + body.replace(/<li\b[^>]*>/gi, () => '<br>' + label() + ' ').replace(/<\/li>/gi, '<br>') + '<br>';
    });
    if (q === before) break;
  }
  // tables, innermost first
  for (let guard = 0; guard < 400; guard++) {
    const m = /<table\b[^>]*>((?:(?!<table\b)[\s\S])*?)<\/table>/i.exec(q);
    if (!m) break;
    const rows = [...m[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) => [...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => inlineText(c[1])))
      .map((r) => { while (r.length && !r[r.length - 1]) r.pop(); return r; }).filter((r) => r.some(Boolean));
    const cols = Math.max(0, ...rows.map((r) => r.length));
    const isLetter = (c) => /^[A-D]$/.test(c);
    const optRows = rows.filter((r) => isLetter(r[0]));
    let rep;
    if (optRows.length >= 3 && cols > 2 && optRows.length >= rows.length - 1) {
      tables.push({ rows, optionRows: true });                 // "Which row is correct?": the options are table rows
      rep = `<br>[TABLE:${tables.length - 1}]<br>` + optRows.map((r) => `${r[0]} ${esc(r.slice(1).join(' | '))}`).join('<br>') + '<br>';
    } else if (optRows.length >= 3 && optRows.length === rows.length) {
      rep = '<br>' + rows.map((r) => esc(r.join(' '))).join('<br>') + '<br>';       // A | option
    } else if (rows.length >= 2 && cols >= 2 && !rows.some((r) => r.some((c) => /Your answer|\[\d+\]$/.test(c)))) {
      tables.push({ rows });
      rep = `<br>[TABLE:${tables.length - 1}]<br>`;
    } else {
      // layout table: keep its inside as it is (line breaks, lists, tables already rebuilt inside it)
      rep = '<br>' + m[1].replace(/<\/tr>/gi, '<br>').replace(/<\/t[dh]>/gi, ' ').replace(/<\/?(tbody|thead|tr|td|th)\b[^>]*>/gi, ' ') + '<br>';
    }
    q = q.slice(0, m.index) + rep + q.slice(m.index + m[0].length);
  }
  const lines = decodeEnt((q + rest)
    .replace(/<sup[^>]*>\s*([^<]*)<\/sup>/gi, (m, x) => '^' + x.replace(/\s+/g, '')).replace(/<sub[^>]*>\s*([^<]*)<\/sub>/gi, (m, x) => '_' + x.replace(/\s+/g, ''))
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|h\d|li|table)>/gi, '\n').replace(INLINE_TAG, '').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t   ]+/g, ' ').split('\n').map((l) => l.trim()).filter(Boolean);
  // "kms^− ^1" (the power written as two raised pieces) -> "kms^−1"
  // and "A." / "A)" option letters (some exports) -> "A "; a stray zero-width mark goes
  for (let i = 0; i < lines.length; i++) lines[i] = lines[i].replace(/\^([−–\-+])\s*\^(?=\d)/g, '^$1').replace(/\uFEFF|\u200B/g, '').replace(/^([A-D])[.)]\s+(?=\S)/, '$1 ');
  lines.figs = figs;
  lines.tables = tables;
  return lines;
}

const CMD = /\b(state|name|define|calculate|show that|explain|describe|suggest|determine|estimate|sketch|draw|compare|discuss|evaluate|write down|complete|which|what|label|identify|predict|deduce)\b/i;
const figsIn = (s) => [...String(s).matchAll(/\[FIG:(\d+)\]/g)].map((m) => +m[1]);
const tablesIn = (s) => [...String(s).matchAll(/\[TABLE:(\d+)\]/g)].map((m) => +m[1]);

function parseExport(raw, htmlIn) {
  const lines = pageText(raw, htmlIn);
  const end = lines.findIndex((l) => /^END OF QUESTION PAPER$/i.test(l));
  const msAt = lines.findIndex((l, k) => k > end && /^Mark scheme$/i.test(l));
  if (end < 0 || msAt < 0) throw new Error('no "END OF QUESTION PAPER" / "Mark scheme" found: not an ExamBuilder export?');
  const qLines = lines.slice(0, end), mLines = lines.slice(msAt + 2);   // skip the "Question Answer Marks Guidance" header

  // questions: "1." or "8(a)." starts a question; every "[n]" closes a part
  const questions = [];
  let cur = null, buf = [], label = '';
  for (const l of qLines) {
    const m = /^(\d+)(?:\(([a-z])\))?\.\s*(.*)$/.exec(l);
    // the paper's own part labels are kept in the text: "33(a). A nebula ..." -> "(a) A nebula ..."
    if (m && (!cur || +m[1] === cur.n + 1)) { cur = { n: +m[1], parts: [] }; questions.push(cur); buf = []; label = m[2] ? `(${m[2]}) ` : ''; if (m[3]) { buf.push(label + m[3]); label = ''; } continue; }
    if (!cur) continue;
    const sub = /^\(([a-z])\)\.\s*(.*)$/.exec(l);
    if (sub) { label = `(${sub[1]}) `; if (sub[2]) { buf.push(label + sub[2]); label = ''; } continue; }
    const mk = /\[(\d+)\]\s*$/.exec(l);
    if (mk) {
      const last = l.replace(/\[(\d+)\]\s*$/, '').trim();
      if (last) { buf.push(label + last); label = ''; }
      const text = buf.join('\n').replace(/\n?Your answer\s*(\[BOX\]|\[FIG:\d+\])?\s*$/i, '').replace(/\[BOX\]/g, '☐').trim();
      // the options: the LAST run of lines starting A, B, C, D in that order (a stem line such as
      // "A satellite of mass 320 kg ..." also starts with "A ")
      const ls = text.split('\n');
      let options = null, optionCount = 0;
      for (let i = ls.length - 1; i >= 0 && !options; i--) {
        if (!/^D\s+\S/.test(ls[i])) continue;
        let k = 3, j = i;
        while (k > 0 && j > 0 && new RegExp('^' + 'ABC'[k - 1] + '\\s+\\S').test(ls[j - 1])) { k--; j--; }
        optionCount = Math.max(optionCount, 4 - k);
        if (k === 0) options = ls.slice(j, i + 1);
      }
      cur.parts.push({ text, marks: +mk[1], mcqOptions: options, optionCount });
      buf = [];
    } else { buf.push(label + l); label = ''; }
  }

  // mark scheme: one block per question, closed by "Total N"
  const blocks = [];
  let mb = [];
  for (const l of mLines) {
    if (/^Total\s+\d+$/i.test(l)) { blocks.push(mb); mb = []; } else mb.push(l);
  }
  const figFiles = (ns) => ns.map((n) => lines.figs[n]);
  questions.forEach((q, k) => {
    const b = blocks[k] || [];
    const exAt = b.findIndex((l) => /^Examiner.s Comments?/i.test(l));
    const scheme = (exAt >= 0 ? b.slice(0, exAt) : b).join('\n').replace(/\[BOX\]/g, '').replace(/[ \t]{2,}/g, ' ');
    const comment = exAt >= 0 ? b.slice(exAt + 1).join(' ') : '';
    // the answer letter: "2 C", or "2" then "C" on the next line, or "C" alone, then the mark
    const head = b.slice(0, 3).join('\n');
    const letter = (/^\d+\s+([A-D])(?:\s|$)/.exec(head) || /^\d+\s*\n\s*([A-D])\s*(?:\n|$)/.exec(head) || /^([A-D])\s*(?:\n|\s+1\b|$)/.exec(head) || [])[1] || null;
    q.parts.forEach((p, i) => {
      p.ms = { text: q.parts.length === 1 ? scheme.replace(/^\d+\s+/, '') : scheme, examinerCommentary: comment };
      const single = q.parts.length === 1 && p.marks === 1;
      p.mcqAnswer = single && letter ? letter : null;
      if (p.mcqAnswer && !p.mcqOptions) {
        const t = tablesIn(p.text).map((n) => lines.tables[n]).find((t) => t && t.optionRows);
        if (t) p.mcqOptions = t.rows.filter((r) => /^[A-D]$/.test(r[0])).slice(0, 4).map((r) => `${r[0]} ${r.slice(1).join(' | ')}`);
        // no option lines but a picture or table: the options A to D are drawn in it ("Which graph ...",
        // "four materials A, B, C and D ..."), so the choices are just the letters
        else if (p.optionCount === 0 && (figsIn(p.text).length || tablesIn(p.text).length))
          { p.mcqOptions = ['A', 'B', 'C', 'D']; p.optionsInFigure = true; }
        else if (p.optionCount >= 2 && p.optionCount < 4) p.optionsMissing = 4 - p.optionCount;   // some options lost: may be written in (flagged)
      }
      const tIdx = tablesIn(p.text);
      p.tables = tIdx.map((n) => lines.tables[n]).filter(Boolean).map((t) => ({ rows: t.rows, optionRows: !!t.optionRows }));
      // renumber this part's tables [TABLE:0], [TABLE:1] ... so they index p.tables
      let tk = 0; p.text = p.text.replace(/\[TABLE:\d+\]/g, () => `[TABLE:${tk++}]`);
      const tFigs = p.tables.flatMap((t) => t.rows.flat()).flatMap(figsIn);
      p.figureKeys = figFiles(figsIn(p.text));
      p.tableFigureKeys = Object.fromEntries(tFigs.map((n) => [n, lines.figs[n]]));
      p.ms.figureKeys = figFiles(figsIn(p.ms.text));
      p.hasFigure = /\[FIG:\d+\]/.test(p.text) || tFigs.length > 0 || /\bFig\.\s*\d|shown below|diagram below/i.test(p.text);
      p.commandWord = ((CMD.exec(p.text.split('\n').slice(-1)[0]) || CMD.exec(p.text) || [])[1] || '').toLowerCase();
      p.part = q.parts.length > 1 ? String.fromCharCode(97 + i) : '';
      p.questionTotalMarks = q.parts.reduce((n, x) => n + x.marks, 0);
      delete p.optionCount;
    });
  });
  return { questions, blocks: blocks.length, figs: lines.figs };
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

// The pictures a part uses, saved once each (named by their contents, like the GCSE figures) into
// exam-library/figures. Returns key -> file name.
function saveFigures(keys, images, figDir, stats) {
  const crypto = require('crypto');
  const out = {};
  for (const key of new Set(keys)) {
    const buf = images.get(key) || images.get(key.replace(/_150(\.png)$/, '$1')) || images.get(key.replace(/(\.png)$/, '_150$1'));
    if (!buf || buf.length < 8 || buf[0] !== 0x89) { stats.missing++; continue; }
    const file = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16) + '.png';
    const fp = path.join(figDir, file);
    if (!fs.existsSync(fp)) { fs.writeFileSync(fp, buf); stats.written++; } else stats.reused++;
    out[key] = file;
  }
  return out;
}

function run(opts) {
  const o = opts || {};
  const root = o.root || DEFAULT_ROOT, out = o.out || DEFAULT_OUT;
  const xlsx = fs.readdirSync(root).find((f) => /\.xlsx$/i.test(f));
  if (!xlsx) throw new Error('no topic spreadsheet (.xlsx) in ' + root);
  const rows = readIndex(path.join(root, xlsx));
  const docsDir = path.join(out, 'docs-ocr'), figDir = path.join(out, 'figures');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(figDir, { recursive: true });
  const catalogue = [], report = [];
  const stats = { written: 0, reused: 0, missing: 0 };
  const files = fs.readdirSync(root).filter((f) => /^Assessment_bank_test_export( \(\d+\))?\.doc$/i.test(f));
  for (const f of files) {
    const n = /\((\d+)\)/.exec(f);
    const row = rows[(n ? +n[1] : 0) + 2] || {};
    const topic = row.B || '?', subtopic = row.C || '?', subsub = row.D || '';
    try {
      const raw = fs.readFileSync(path.join(root, f), 'latin1');
      const { questions, blocks, figs } = parseExport(raw);
      const fileOf = saveFigures(figs, embeddedImages(raw), figDir, stats);
      const files = (keys) => keys.map((k) => fileOf[k] || null);
      const id = slug(`ALevel-Physics-${subtopic}-${subsub}`);
      const parts = questions.flatMap((q) => q.parts.map((p) => {
        const figureFiles = files(p.figureKeys);
        const tableFigures = Object.fromEntries(Object.entries(p.tableFigureKeys).map(([k, v]) => [k, fileOf[v] || null]));
        return {
          id: `${id}#Q${q.n}${p.part}`, subject: 'Physics', board: 'OCR A', level: 'A', topic, subtopic, subsubtopic: subsub,
          question: q.n, part: p.part, text: p.text, marks: p.marks, commandWord: p.commandWord, hasFigure: p.hasFigure,
          figureFiles, figuresMissing: figureFiles.some((x) => !x) || Object.values(tableFigures).some((x) => !x),
          tables: p.tables, tableFigures,
          mcqOptions: p.mcqOptions, mcqAnswer: p.mcqAnswer, optionsInFigure: !!p.optionsInFigure, optionsMissing: p.optionsMissing || 0,
          questionTotalMarks: p.questionTotalMarks,
          ms: { text: p.ms.text, examinerCommentary: p.ms.examinerCommentary, figureFiles: files(p.ms.figureKeys) },
        };
      }));
      fs.writeFileSync(path.join(docsDir, id + '.json'), JSON.stringify({ source: f, board: 'OCR A', level: 'A', subject: 'Physics', topic, subtopic, subsubtopic: subsub, parsedAt: new Date().toISOString(), parts }, null, 1));
      parts.forEach((p) => catalogue.push({ id: p.id, topic, subtopic, subsubtopic: subsub, marks: p.marks, cmd: p.commandWord, mcq: !!p.mcqAnswer, figure: p.hasFigure }));
      const warn = blocks !== questions.length ? ` (mark scheme blocks ${blocks} vs questions ${questions.length})` : '';
      report.push(`ok   ${f} -> ${subtopic} / ${subsub}: ${questions.length} questions, ${parts.length} parts, ${figs.length} pictures${warn}`);
    } catch (e) { report.push(`FAIL ${f} (${subtopic} / ${subsub}): ${e.message}`); }
  }
  fs.writeFileSync(path.join(out, 'catalogue-ocr.json'), JSON.stringify({ builtOn: new Date().toISOString(), board: 'OCR A', level: 'A', parts: catalogue }));
  report.push(`pictures: ${stats.written} new, ${stats.reused} already saved, ${stats.missing} not found in the export`);
  return { report, parts: catalogue.length, stats };
}

if (require.main === module) {
  const a = process.argv.slice(2), v = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  const r = run({ root: v('--root'), out: v('--out') });
  r.report.forEach((l) => console.log(l));
  console.log(`\n${r.parts} A-level parts written`);
} else module.exports = { parseExport, pageText, pageHtml, embeddedImages, readIndex, run, figKey };
