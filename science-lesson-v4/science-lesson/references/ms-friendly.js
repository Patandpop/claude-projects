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
  const pts = [];
  let buf = '', got = 0;
  const re = /(^|\s)([1-9])(?=\s|$)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    buf = text.slice(last, m.index);
    pts.push({ marks: +m[2], raw: buf });
    got += +m[2]; last = re.lastIndex;
  }
  const tail = text.slice(last);
  const split = pts.length > 0 && got === marks && !/\S/.test(tail.replace(/\u0000\d+\u0000/g, ''));
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
  const lines = decode(ms.text).replace(/^\s*\d+\s+(?:\(?(?:[a-h]|iv|v|vi{0,3}|i{1,3})\)?\s+){0,3}/, '')
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
    if (l) g.ans.push(l);
  }
  const live = groups.filter((x) => x.ans.length || x.codes.length);
  const pts = live.map((x) => {
    x.pt.text = x.ans.join('\n');
    x.pt.marks = x.codes.reduce((a, c) => a + c.n, 0);
    x.pt.codes = codesText(x.codes);
    x.pt.label = x.label;
    return x.pt;
  });
  if (pts.length === 1 && !pts[0].marks) pts[0].marks = marks;
  const got = pts.reduce((a, p) => a + p.marks, 0);
  return { points: pts, codes: pts.length === 1 ? pts[0].codes : '', split: got === marks, parts: pts.length > 1 };
}

// ms: { text, notes, levels }; opts: { board: 'AQA'|'OCR A', marks }
function friendlyMs(ms, opts) {
  const o = opts || {};
  if (!ms || !ms.text) return { points: [], split: false, codes: '' };
  if ((ms.levels || []).length) return { points: [point(o.marks, decode(ms.text))], levels: ms.levels, split: false, codes: '' };
  const r = o.board === 'OCR A' ? ocr(ms, o.marks) : aqa(ms, o.marks);
  r.codes = r.codes || '';
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

module.exports = { friendlyMs, msPlain, MS_KEY, decode };
