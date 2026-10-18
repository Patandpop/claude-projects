/* ms-friendly.js — mark schemes pupils can read (Patryk 2026-10-12, brief item 7).
   The exam board's words are kept exactly; only the layout changes:
     - one line per mark ("✓ 1 mark: black"), with the marker notes sorted under it:
       Also accepted (allow / accept), No mark for (do not accept / not / reject), Doesn't matter (ignore);
     - OCR codes in words: B1 = 1 mark, M1 = method, C1 = working, A1 = final answer;
     - the source paper's question number ("15 i") and HTML (&bull;) removed.
   AQA: ms.notes already holds the notes; what is left splits on each bare mark digit. Used only when
   those digits add up to the part's marks; otherwise the answer stays one block (nothing guessed).
   OCR: the scheme keeps its lines: answer lines, code lines, guidance lines.
   Plain JS, no dependencies. Used by test-paper.js (printed MS + Forms), homework-forms.js,
   homework-booklet.js. Test: node test/ms-friendly.test.js */
'use strict';

const ENT = { rarr: '→', larr: '←', bull: '•', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', deg: '°', times: '×', divide: '÷', minus: '−', lambda: 'λ', Delta: 'Δ', delta: 'δ', theta: 'θ', mu: 'μ', Omega: 'Ω', sigma: 'σ', pi: 'π', rho: 'ρ', le: '≤', ge: '≥', asymp: '≈', ndash: '–', mdash: '–', frac12: '½' };
const decode = (s) => String(s || '').replace(/&([a-zA-Z]+\d*);/g, (m, k) => (ENT[k] != null ? ENT[k] : m)).replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n));
const tidy = (s) => String(s || '').replace(/[ \t]{2,}/g, ' ').replace(/\s+([;,.])/g, '$1').trim();

const MS_KEY = [
  ['✓', 'write this to get the mark'],
  ['Also accepted', 'these answers get the mark too'],
  ['No mark for', 'these answers do not get the mark'],
  ["Doesn't matter", 'you will not lose a mark for this'],
];

// A marker note sorted by its first word. The label replaces the marker's verb; the rest is verbatim.
function sortNote(n, pt) {
  const all = tidy(decode(n)).split(/(?<!\bnot)\s(?=(?:allow|accept|ignore|do not accept|do not allow|reject)\s)/i);   // two notes run together
  if (all.length > 1) { all.forEach((x) => sortNote(x, pt)); return; }
  const t = all[0];
  if (NOTE.test(t)) { pt.extra.push(t); return; }
  let m;
  if ((m = /^(?:do not|don['’]t|not|reject|no credit for|dnc|dna)\b\s*(?:accept|allow|credit|award)?\s*:?\s*/i.exec(t)) && !/^not\s+(?:required|needed)/i.test(t)) pt.no.push(t.slice(m[0].length) || t);
  else if ((m = /^(?:allow|accept|credit|also accept)\b\s*:?\s*/i.exec(t))) pt.also.push(t.slice(m[0].length) || t);
  else if ((m = /^ignore\b\s*:?\s*/i.exec(t))) pt.ignore.push(t.slice(m[0].length) || t);
  else pt.extra.push(t);
}
const NOTE = /^(?:check|note|examiner|ecf|mark is|marks? (?:can|may|are|for)|award|max\b|may be|must|look for|\(xp\)|any valid method)/i;
const point = (marks, text) => ({ marks, text: tidy(text), also: [], no: [], ignore: [], extra: [] });

// AQA: notes removed, then "answer 1 answer 1" split on the bare mark digits.
function aqa(ms, marks) {
  let text = decode(ms.text);
  const notes = (ms.notes || []).map(decode);
  const holes = [];
  for (const n of notes) {
    const at = text.indexOf(n);
    if (at < 0) continue;
    text = text.slice(0, at) + ` \u0000${holes.length}\u0000 ` + text.slice(at + n.length);
    holes.push(n);
  }
  // values: true skips a digit that is a calculation's value, not a mark ("half-lives = 4 1": the 4)
  const cut = (values) => {
    const pts = [];
    let got = 0, last = 0, m;
    const re = /(^|\s)([1-9])(?=\s|$)/g;
    while ((m = re.exec(text))) {
      if (values && /[=×÷/+−*-]\s*$/.test(text.slice(0, m.index + m[1].length))) continue;
      pts.push({ marks: +m[2], raw: text.slice(last, m.index) });
      got += +m[2]; last = re.lastIndex;
    }
    const tail = text.slice(last);
    return { pts, tail, split: pts.length > 0 && got === marks && !/\S/.test(tail.replace(/\u0000\d+\u0000/g, '')) };
  };
  let c = cut(false);
  if (!c.split) { const c2 = cut(true); if (c2.split) c = c2; }   // 2026-10-18: a second try for calculations
  const { pts, tail, split } = c;
  const build = (raw, mk) => {
    const p = point(mk, raw.replace(/\u0000\d+\u0000/g, ' '));
    for (const h of raw.matchAll(/\u0000(\d+)\u0000/g)) sortNote(holes[+h[1]], p);
    return p;
  };
  if (split) {
    const out = pts.map((x) => build(x.raw, x.marks));
    const lt = tail.match(/\u0000\d+\u0000/g);
    if (lt) lt.forEach((h) => sortNote(holes[+h.slice(1, -1)], out[out.length - 1]));
    return { points: out, split: true };
  }
  const one = build(text, marks);
  one.text = one.text.replace(new RegExp('\\s' + marks + '$'), '');   // the bare total at the end
  return { points: [one], split: false };
}

// OCR: answer lines, then C1 / M1 / A1 / B1 lines, then Allow / Ignore / Not lines.
const CODE = /^((?:[BMACP][0-9]\s*(?:[×x]\s*[0-9]+)?[\s,]*)+)(?=\s|$)/;
const CODE_END = /\s((?:[BMACP][0-9]\s*(?:[×x]\s*[0-9]+)?\s*)+)$/;
const GUIDE = /^(?:allow|accept|credit|ignore|not\b|do not|don['’]t|reject|dnc|dna|no credit)/i;
// A new part inside one OCR scheme: "ii ...", "(b) ...", "b i ..." at the start of a line.
const PART = /^(\(?(?:[a-h]|iv|vi{0,3}|i{1,3})\)?(?:\s*\(?(?:iv|vi{0,3}|i{1,3})\)?)?)\s+(?=\S)/;
const KIND = { M: 'for the method', C: 'for working', A: 'for the final answer', B: '', P: '' };
function codesText(codes) {
  if (!codes.length) return '';
  const byKind = {};
  codes.filter((c) => c.n).forEach((c) => { byKind[c.k] = (byKind[c.k] || 0) + c.n; });
  const parts = Object.entries(byKind).filter(([k]) => KIND[k]).map(([k, n]) => `${n} ${KIND[k]}`);
  const each = codes.find((c) => c.each);
  return each && codes.length === 1 ? `1 mark each, up to ${each.each}`
    : parts.length ? 'Marks: ' + parts.join(', ') + (byKind.B ? `, ${byKind.B} for the points` : '') : '';
}
function ocr(ms, marks) {
  // a code in the middle of a line ("... Sun. B1 Allow: ECF") starts a new line
  // 2026-10-16 (12C/13D Forms): the examiner's comments are not the mark scheme (they are kept apart in
  // ms.examinerCommentary), so they are cut off here
  const lines = decode(ms.text).replace(/\s*\b\d?\s*Examiner['’]?s?\s+Comments?\b[\s\S]*$/i, '').replace(/^\s*\d+\s+(?:\(?(?:[a-h]|iv|v|vi{0,3}|i{1,3})\)?\s+){0,3}/, '')
    .replace(/\s(?=[BMAC][0-9](?:\s*[×x]\s*[0-9]+)?\s+(?:allow|accept|ignore|not|do not|reject)\b)/gi, '\n')
    .split('\n').map((l) => l.trim()).filter(Boolean);
  const groups = [];
  let g = null;
  const open = (label) => { g = { pt: point(0, ''), codes: [], ans: [], label }; groups.push(g); };
  open('');
  const take = (s) => { for (const c of s.matchAll(/([BMACP])([0-9])\s*(?:[×x]\s*([0-9]+))?/g)) g.codes.push({ k: c[1], n: +c[2] * (c[3] ? +c[3] : 1), each: c[3] ? +c[3] : 0 }); };
  for (let l of lines) {
    let m = PART.exec(l);
    // a part label only once this part has its marks (else it is just a word like "a")
    if (m && g.codes.length && !GUIDE.test(l) && !NOTE.test(l)) { open(m[1]); l = l.slice(m[0].length); }
    if ((m = CODE.exec(l))) { take(m[1]); l = l.slice(m[0].length).trim(); if (!l) continue; if (!GUIDE.test(l)) { g.pt.extra.push(tidy(l)); continue; } }
    if (GUIDE.test(l) || NOTE.test(l)) { sortNote(l, g.pt); continue; }
    if ((m = CODE_END.exec(l))) { take(m[1]); l = l.slice(0, m.index).trim(); }
    if (/^[A-Da-d]$/.test(l)) l = 'Answer: ' + l.toUpperCase();                 // a multiple-choice answer letter
    if (l) g.ans.push(l);
  }
  const live = groups.filter((x) => x.ans.length || x.codes.length);
  // the first part's own label was cut with the question number: (ii) next means this is (i), (b) means (a)
  if (live.length > 1 && !live[0].label && live[1].label) {
    const nx = live[1].label.replace(/[()\s]/g, '');
    live[0].label = { ii: 'i', iii: 'ii', b: 'a', c: 'b' }[nx] || '';
  }
  const pts = live.map((x) => {
    x.pt.text = x.ans.join('\n');
    x.pt.marks = x.codes.reduce((a, c) => a + c.n, 0);
    x.pt.codes = codesText(x.codes);
    x.pt.codeList = x.codes;              // the codes one by one, for markPoints (2026-10-18)
    x.pt.label = x.label;
    return x.pt;
  });
  if (pts.length === 1 && !pts[0].marks) pts[0].marks = marks;
  const got = pts.reduce((a, p) => a + p.marks, 0);
  return { points: pts, codes: pts.length === 1 ? pts[0].codes : '', split: got === marks, parts: pts.length > 1 };
}

// OCR level-of-response schemes (the 6-mark "*" questions). Rules (Patryk 2026-10-15: "hard to see
// where pupils get marks from"):
//  1. one line per level, Level 3 first, holding only its science line ("Clear methods of measurement ...");
//     the writing sentences ("There is a well-developed line of reasoning ...") are the same on every OCR
//     6-marker, so they become one "How it is marked" line instead of being repeated per level;
//  2. "0 marks / No response ..." and marker codes (B1 × 6, RM Assessor) are dropped;
//  3. "Indicative scientific points" become "Points that earn credit", grouped under their area headings
//     (Measurement, Uncertainty, ...) with OCR's area letters (M, U, A) removed, one bullet per point.
// The board's words for each level and point are kept exactly.
const LEVEL = /^\*?\s*Level\s*([1-4])\s*\(([^)]*)\)\s*(.*)$/i;
const WRITING = /^(?:there is (?:a|an|no)\b|the information (?:is|presented)\b)/i;
const INDICATIVE = /^(?:indicative (?:scientific )?(?:points|content)[^:]*:?|the complete plan consists of[^:]*:?)\s*/i;
const AREA = /^(?:[A-Z]\s+)?((?:use of data|description|analysis|measurements?|uncertaint(?:y|ies)|minimising uncertaint(?:y|ies)|equipment(?: used)?(?: safety)?|safety|reliability|method|calculations?|explanation of (?:terms|results)|evaluation|conclusions?|further comments|energy approach|reverse thrust|forward thrust)(?:\s*\([A-Z]\))?)(?=\s|$)\s*(.*)$/i;
const LOR_HOW = 'How it is marked: the marker reads the whole answer and picks the level whose description fits the science best, then gives the higher mark in that level if the answer is clear and in a sensible order, the lower mark if not.';
function levelsBlock(text) {
  const t = String(text || '').replace(/\bB1\s*[×x]\s*\d\b/g, '\n').replace(/Use level of response annotations in RM Assessor/gi, '\n')
    .replace(/(\S)[ \t]*(\*?\s*Level\s*[1-4]\s*\()/g, '$1\n$2')
    .replace(/[ \t]+(Indicative scientific points)/i, '\n$1');
  if (!/Level\s*3\s*\(/i.test(t)) return null;
  const out = { before: [], levels: [], areas: [] };
  let mode = 'before', lv = null, area = null, m;
  for (let l of t.split('\n').map((x) => x.trim().replace(/^\*\s*$/, '')).filter(Boolean)) {
    if ((m = LEVEL.exec(l))) { lv = { level: +m[1], marks: m[2].replace(/\s*marks?$/i, '').replace(/\s*[-−]\s*/, '–'), need: m[3] ? [m[3]] : [] }; out.levels.push(lv); mode = 'lv'; continue; }
    if (mode === 'lv' && /^0 marks?\b/i.test(l)) { mode = 'zero'; continue; }
    if (mode !== 'before' && (m = INDICATIVE.exec(l))) { mode = 'pts'; l = l.slice(m[0].length).trim(); if (!l) continue; }
    if (mode === 'zero') { if (/^no response\b/i.test(l)) continue; mode = 'pts'; }
    if (mode === 'before') { out.before.push(l); continue; }
    if (mode === 'lv') { if (!WRITING.test(l)) lv.need.push(l); continue; }
    if ((m = AREA.exec(l))) { area = { head: m[1][0].toUpperCase() + m[1].slice(1), points: m[2] ? [m[2]] : [] }; out.areas.push(area); continue; }
    if (!area) out.areas.push(area = { head: '', points: [] });
    area.points.push(l.replace(/^×(?=\s*=)/, 'x'));   // the library's × where the scheme meant the letter x
  }
  out.levels.forEach((x) => { x.need = tidy(x.need.join(' ')); });
  out.how = LOR_HOW + (out.areas.filter((a) => a.head).length > 1 ? ' A Level 3 answer covers every area below.' : '');
  return out;
}

// ms: { text, notes, levels }; opts: { board: 'AQA'|'OCR A', marks }
function friendlyMs(ms, opts) {
  const o = opts || {};
  if (!ms || !ms.text) return { points: [], split: false, codes: '' };
  if ((ms.levels || []).length) return { points: [point(o.marks, decode(ms.text))], levels: ms.levels, split: false, codes: '' };
  const r = o.board === 'OCR A' ? ocr(ms, o.marks) : aqa(ms, o.marks);
  r.codes = r.codes || '';
  if (o.board === 'OCR A') for (const p of r.points) { const lor = levelsBlock(p.text); if (lor) { p.lor = lor; r.split = false; r.codes = ''; } }
  for (const p of r.points) if (!p.text.replace(/\[FIG:\d+\]|\[FIGURE\]|\bor\b/g, '').trim()) p.picture = true;   // the answer is a drawing / graph
  return r;
}

// Plain text for Google Forms feedback. `strip` removes picture / table markers.
const strip = (s) => tidy(String(s).replace(/\s•\s*/g, '\n• ').replace(/\[FIG:\d+\]|\[FIGURE\]/g, ' ').replace(/\[TABLE:\d+\]/g, ' (table on the paper mark scheme) '));
function msPlain(ms, opts, label) {
  const f = friendlyMs(ms, opts);
  const out = [];
  const head = (label ? label + ' ' : '') + (opts && opts.marks ? `${opts.marks} mark${opts.marks === 1 ? '' : 's'}` : '');
  if (head.trim()) out.push(head.trim());
  if (f.codes) out.push(f.codes);
  for (const p of f.points) {
    if (f.parts) out.push(`${p.label ? '(' + p.label.replace(/[()\s]/g, '') + ') ' : ''}${p.marks} mark${p.marks === 1 ? '' : 's'}${p.codes ? ' · ' + p.codes.replace(/^Marks: /, '') : ''}`);
    if (p.lor) {
      out.push(...p.lor.before.map(strip), p.lor.how);
      p.lor.levels.forEach((lv) => out.push(`Level ${lv.level} (${lv.marks} marks): ${strip(lv.need)}`));
      if (p.lor.areas.length) out.push('Points that earn credit:');
      p.lor.areas.forEach((a) => { if (a.head) out.push(a.head); a.points.forEach((x) => out.push('   • ' + strip(x))); });
      continue;
    }
    const body = p.picture ? 'shown as a picture: see the mark scheme on paper' : strip(p.text).split('\n').map(tidy).filter(Boolean).join('\n   ');
    out.push(f.split && !f.codes && !f.parts ? `✓ ${p.marks} mark${p.marks === 1 ? '' : 's'}: ${body}` : `✓ ${body}`);
    if (p.also.length) out.push('   Also accepted: ' + p.also.map(strip).join('; '));
    if (p.no.length) out.push('   No mark for: ' + p.no.map(strip).join('; '));
    if (p.ignore.length) out.push("   Doesn't matter: " + p.ignore.map(strip).join('; '));
    if (p.extra.length) out.push('   Marker note: ' + p.extra.map(strip).join('; '));
  }
  for (const lv of f.levels || []) out.push(`Level ${lv.level} (${lv.marks}): ${strip(lv.descriptor)}`);
  return out.join('\n');
}

/* ------------------------------------------------------------------ mark points (2026-10-18)
   markPoints(ms, {board, marks, calc, id}): the scheme as one item per mark (or per point / level),
   for the Form's "Mark your own answers" page: pupils choose Yes or No for each, and each Yes adds
   that item's marks to the Form's score. The items' marks always add up to the question's marks.
   kinds: point (one creditworthy point), method (a working mark), answer (a calculation's final
   answer), level (one level of a 6-mark question, Level 1 first), mark (the scheme could not be split:
   "mark 1 of 2", the whole point shown). `says` is the scheme's own words (marker codes and the
   "✓ 1 mark:" layout taken off, first letter lower case unless it is a symbol, unit or name).
   picture: true when the answer is a drawing or graph (the question stays out of the Form). */
const NAMES = /^(?:Sun|Earth|Moon|Mars|Jupiter|Saturn|Universe|Newton|Hubble|Kepler|Doppler|Wien|Stefan|Planck|Einstein|Celsius|Kelvin|Ohm|Joule|Watt|Avogadro|Boltzmann|Big|Milky|Coulomb|Faraday|Fleming|Rutherford|Bohr|Thomson|Chadwick|Geiger|Marsden|Darwin|Mendel|Mendeleev|Hooke|Snell|Young|Huygens|Maxwell|Lenz|Kirchhoff|Ek|Ep|UK|English|British)$/;
function lowerFirst(t) {
  const m = /^([A-Z][a-z]+)\b(\s*)(\S?)/.exec(t);
  if (!m || NAMES.test(m[1]) || m[3] === '=') return t;
  return t[0].toLowerCase() + t.slice(1);
}
const CODE_TAIL = /\s*\b[BMACP][0-9](?:\s*[×x]\s*[0-9]+)?\s*$/;
const saysOf = (t) => lowerFirst(strip(String(t || '')).split('\n').map((l) => tidy(l.replace(CODE_TAIL, '').replace(/^=\s*/, ''))).filter(Boolean).join('; '));
const range = (s) => {
  const m = /(\d+)\s*(?:-|–|−|to)\s*(\d+)/.exec(String(s));
  const one = +String(s).replace(/\D/g, '') || 0;
  return m ? { from: +m[1], to: +m[2] } : { from: one, to: one };
};
const RESULT = /=\s*[−-]?\d|^[−-]?\d[\d.,]*\s*(?:\(|[a-zA-Zμ%°]|$)/;   // a line that gives a value
const NO_MS ='No mark scheme was found for this question: ask your teacher.';
function markPoints(ms, opts) {
  const o = opts || {}, total = o.marks || 1;
  const out = [];
  const add = (kind, marks, says, x) => out.push(Object.assign({ kind, marks, says: says || '' }, x || {}));
  const notes = (pt) => {
    const r = {}, also = (pt.also || []).map(saysOf).filter(Boolean), no = (pt.no || []).map(saysOf).filter(Boolean);
    if (also.length) r.also = also;
    if (no.length) r.no = no;
    return r;
  };
  const markItems = (n, says, x) => { for (let k = 1; k <= n; k++) add('mark', 1, says, Object.assign({ k, of: n }, x || {})); };
  const levelItems = (lvs, x) => {
    const L = lvs.slice().sort((a, b) => a.level - b.level).map((lv) => Object.assign({ level: lv.level, need: tidy(strip(lv.need)) }, range(lv.marks)));
    L.forEach((lv) => add('level', lv.to - lv.from + 1, lowerFirst(lv.need), Object.assign({ level: lv.level, from: lv.from, to: lv.to }, x || {})));
    return L;
  };
  let levels = null, picture = false;
  if (!ms || !ms.text) markItems(total, NO_MS);
  else if ((ms.levels || []).length) levels = levelItems(ms.levels.map((lv) => ({ level: lv.level, marks: lv.marks, need: lv.descriptor || '' })));   // AQA level of response
  else {
    const f = friendlyMs(ms, o);
    picture = f.points.some((p) => p.picture);
    for (const pt of f.points) {
      const x = pt.label ? { part: '(' + pt.label.replace(/[()\s]/g, '') + ')' } : {};
      if (pt.lor) { levels = levelItems(pt.lor.levels, x); continue; }   // OCR level of response
      const lines = strip(pt.text).split('\n').map(tidy).filter(Boolean);
      const nt = notes(pt);
      if (o.board === 'OCR A') {
        const codes = (pt.codeList || []).filter((c) => c.n);
        const ones = codes.every((c) => c.n === 1 && !c.each);
        const kindOf = (c) => ({ M: 'method', C: 'method', A: 'answer' }[c.k] || 'point');
        const last = codes.length - 1;
        const calcCodes = codes.length > 1 && codes.every((c) => /[MCA]/.test(c.k)) && codes[last].k === 'A' && codes.slice(0, -1).every((c) => c.k !== 'A');
        if (codes.length && ones && lines.length === codes.length) codes.forEach((c, i) => add(kindOf(c), 1, saysOf(lines[i]), Object.assign({}, x, i === last ? nt : {})));
        else if (calcCodes && lines.length >= 2) {
          // working marks, then the final answer: the last line that gives a value ("T = 8600 (K)"),
          // not a marker's line after it ("answer is 8620 to 3 sf")
          let at = lines.length - 1;
          for (let j = lines.length - 1; j > 0; j--) if (RESULT.test(lines[j])) { at = j; break; }
          const nA = codes[last].n, nM = pt.marks - nA, work = lines.slice(0, at);
          if (work.length === nM) work.forEach((l) => add('method', 1, saysOf(l), x));
          else for (let k = 1; k <= nM; k++) add('method', 1, saysOf(work.join('\n')), Object.assign({ k, of: nM }, x));
          add('answer', nA, saysOf(lines[at]), Object.assign({}, x, nt));
        } else if (pt.marks === 1 && codes.length === 1 && codes[0].k === 'A') add('answer', 1, saysOf(lines[lines.length - 1]), Object.assign({}, x, nt));
        else if (pt.marks === 1) add('point', 1, saysOf(pt.text), Object.assign({}, x, nt));
        else if (pt.marks && codes.length === 1 && codes[0].each && lines.length === pt.marks) lines.forEach((l, i) => add('point', 1, saysOf(l), Object.assign({}, x, i === lines.length - 1 ? nt : {})));
        else if (pt.marks) markItems(pt.marks, saysOf(pt.text), Object.assign({}, x, nt));
        continue;
      }
      // AQA: one line per mark when the scheme splits, else "mark k of n" with the whole point
      const mk = pt.marks || total;
      if (mk === 1 || (f.split && o.calc)) add('point', mk, saysOf(pt.text), nt);
      else markItems(mk, saysOf(pt.text), nt);
    }
    // an AQA calculation split one line per mark: the working marks, then the final answer
    if (o.calc && o.board !== 'OCR A' && f.split && out.length > 1 && out.every((p) => p.kind === 'point') && /\d/.test(out[out.length - 1].says)) out.forEach((p, i) => { p.kind = i === out.length - 1 ? 'answer' : 'method'; });
  }
  // the safety net: items that do not add up to the question's marks become "mark k of n", the whole scheme each
  if (out.reduce((n, p) => n + p.marks, 0) !== total) {
    const says = ms && ms.text ? saysOf(friendlyMs(ms, o).points.map((p) => p.text).join('\n')) : NO_MS;
    out.length = 0;
    markItems(total, says);
    levels = null;
  }
  if (o.id) out.forEach((p, i) => { p.id = o.id + '-' + (i + 1); });
  return { points: out, levels, picture, calc: out.some((p) => p.kind === 'answer') };
}

// A calculation the Form can take as a number box (2026-10-18): the mark points end in a final answer
// "E = 10 800 000 (J)" with a unit, the question asks to calculate, and it does not want standard form
// (a number box cannot take "× 10"). Returns { unit } or null (then it stays a written answer).
function numberAnswer(mp, questionText) {
  const t = String(questionText || '');
  if (!mp || !mp.points.length || mp.picture || !/\b(calculate|work out|determine)\b/i.test(t) || /standard form|\[FIG|\[TABLE/i.test(t)) return null;
  const last = mp.points[mp.points.length - 1];
  if (last.kind !== 'answer') return null;
  const m = /(?:^|=\s*)(−?-?\d[\d ,.]*)\s*\(([^()\d]{1,12})\)/.exec(last.says);
  if (!m || /×|\^|10\d/.test(last.says.slice(m.index, m.index + m[0].length))) return null;
  return { unit: m[2].trim() };
}

module.exports = { friendlyMs, msPlain, markPoints, numberAnswer, MS_KEY, decode, levelsBlock };
