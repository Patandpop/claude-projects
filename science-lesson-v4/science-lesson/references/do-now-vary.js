'use strict';
/* ============================================================================
   do-now-vary.js — a Do Now calculation with NEW NUMBERS, same words (Patryk 2026-10-15).

   The exam library and the class banks stay word-for-word and are never written to. Only the
   copy that goes on the Do Now slide changes, and only when the change is provably safe:
     1. the mark scheme shows its working as a product/quotient of numbers that are each in the
        question exactly once ("radius = 1.7 × 4.2 ... radius = 7.14");
     2. that working, worked out with the ORIGINAL numbers, gives the mark scheme's own final
        answer (within 1%);
     3. physical constants (g = 9.8 N/kg, speed of light, water's 4200 J/kg °C) never change.
   Then each changeable number is scaled by a tidy factor, kept to its own significant figures,
   put back into the question in the same place and style ("205 000" stays spaced), and the
   answer is worked out again. Anything else: null, and the question is used as it is.

   vary(q, seed) -> { text, answer, from } | null
   ============================================================================ */

// "205 000", "0.00175", "4.2"; never part of a longer number or word ("P6", "12C")
const NUM = /(?<![\d.\w])(\d{1,3}(?: \d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?![\d]|\.\d)/g;
const val = (s) => Number(String(s).replace(/ /g, ''));
// g, speed of light, and water/ice's real values (SHC 4200/4180/2100, latent heats 334 000 and
// 2 260 000, density 1000): real properties pupils meet again, so they never change
const CONSTANTS = [9.8, 9.81, 10, 4200, 4180, 2100, 334000, 336000, 2260000, 2300000, 300000, 300000000, 299792458, 1000];
const FACTORS = [0.5, 0.6, 0.75, 0.8, 1.25, 1.5, 2];

const sigFigs = (s) => {
  const d = String(s).replace(/ /g, '').replace(/^0\.0*/, '').replace('.', '');
  const t = String(s).includes('.') ? d : d.replace(/0+$/, '');
  return Math.max(1, t.length);
};
const decimals = (s) => (String(s).split('.')[1] || '').length;
const spaced = (s) => / \d{3}/.test(String(s));
function format(x, like, sf) {
  let s = Number(x.toPrecision(sf));
  const dp = Math.max(0, decimals(like) || (Math.abs(s) < 1 ? decimals(s.toString()) : 0));
  let out = String(s).includes('e') ? s.toFixed(Math.min(10, dp)) : String(s);
  if (decimals(like) && decimals(out) < decimals(like) && sigFigs(out) < sf) out = s.toFixed(decimals(like));
  if (spaced(like) || Math.abs(s) >= 10000) {
    const [i, f] = out.split('.');
    out = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? '.' + f : '');
  }
  return out;
}

function vary(q, seed) {
  if (!q || !q.text || !q.answer) return null;
  const text = String(q.text), ans = String(q.answer);
  // 1. the working: a × b (÷ c ...) in the mark scheme
  const EXPR = /(\d{1,3}(?: \d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)((?:\s*[×÷/]\s*(?:\d{1,3}(?: \d{3})+(?:\.\d+)?|\d+(?:\.\d+)?))+)/;
  const m = ans.match(EXPR);
  if (!m) return null;
  // one step only: a second calculation or a figure in the answer means a multi-step question,
  // where the first number found may be a middle step (2026-10-15: concentration then mass)
  const ops0 = (ans.match(/[×÷]|\d\s*\/\s*\d/g) || []).length;
  if (ops0 !== (m[0].match(/[×÷]|\d\s*\/\s*\d/g) || []).length || /\[FIG|\[TABLE/.test(ans)) return null;
  const toks = m[0].split(/\s*([×÷/])\s*/);           // [num, op, num, op, num]
  const nums = toks.filter((_, i) => i % 2 === 0), ops = toks.filter((_, i) => i % 2 === 1);
  const calc = (vs) => vs.reduce((acc, v, i) => (i === 0 ? v : ops[i - 1] === '×' ? acc * v : acc / v), 0);
  // each number must be in the question exactly once (so we know which one to change)
  const inText = [...text.matchAll(NUM)].map((x) => ({ s: x[1], at: x.index }));
  const where = nums.map((n) => inText.filter((x) => val(x.s) === val(n)));
  if (where.some((w) => w.length !== 1)) return null;
  // 2. the mark scheme's own final answer must match the working
  const original = calc(nums.map(val));
  if (!isFinite(original) || original === 0) return null;
  // (after the working, or before it: "60 (W) P = 3 × 20")
  const rest = ans.slice(m.index + m[0].length) + ' | ' + ans.slice(0, m.index);
  const final = [...rest.matchAll(NUM)].map((x) => x[1]).find((s) => Math.abs(val(s) - original) / Math.abs(original) < 0.01);
  if (!final) return null;
  const after = rest;
  // 3. change what is not a constant
  const changeable = nums.map((n) => !CONSTANTS.includes(val(n)));
  if (!changeable.some(Boolean)) return null;
  let r = (seed >>> 0) || 7;
  const rand = () => ((r = (r * 1103515245 + 12345) >>> 0) / 4294967296);
  const fresh = nums.map((n, i) => {
    if (!changeable[i]) return where[i][0].s;
    for (let t = 0; t < 10; t++) {
      const f = FACTORS[Math.floor(rand() * FACTORS.length)];
      const s = format(val(n) * f, where[i][0].s, sigFigs(where[i][0].s));
      if (val(s) > 0 && val(s) !== val(n)) return s;
    }
    return null;
  });
  if (fresh.some((s) => s == null)) return null;
  // the factors must not cancel out (0.34 × 6 000 -> 0.51 × 4 000 is still 2040)
  if (Math.abs(calc(fresh.map(val)) - original) / Math.abs(original) < 0.02) return null;
  // put the new numbers into the question, last first so positions stay right
  let out = text;
  nums.map((n, i) => ({ at: where[i][0].at, old: where[i][0].s, s: fresh[i] })).sort((a, b) => b.at - a.at)
    .forEach((x) => { out = out.slice(0, x.at) + x.s + out.slice(x.at + x.old.length); });
  const result = calc(fresh.map(val));
  const unit = (after.slice(after.indexOf(final) + final.length).match(/^\s*(\([^)]{1,15}\))/) || [])[1] || '';
  const working = fresh.map((s, i) => (i ? ` ${ops[i - 1]} ` : '') + s).join('');
  const answer = `${working} = ${format(result, final, Math.min(4, Math.max(2, sigFigs(final))))}${unit ? ' ' + unit.replace(/[()]/g, '') : ''}`;
  return { text: out, answer, from: q.examRef || q.id || '' };
}

module.exports = { vary };
