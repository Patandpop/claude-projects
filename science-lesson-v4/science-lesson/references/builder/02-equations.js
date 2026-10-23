'use strict';
// build.js part 02-equations: equations and markup: normSym, prettyText, parseEq, proseMathSegs, toPptxRuns/toDocxRuns, renderEqShapes, parseMarkup. Loaded by build.js in order; all parts share one scope.

/* ========================= EQUATION RENDERING ========================== */
// Source notation: {num/den} fraction  x_sub  x^sup  x^-2  ^{multi}  \greek  \op  sqrt(...)
// parseEq → [{t:'text'|'sub'|'sup'|'frac'|'radical', v?, num?, den?, children?}]
// _SYM = Greek letters + maths operators. Unknown \cmd is left literal (`\cmd`).
const _SYM = {
  // Greek
  alpha:'α', beta:'β', gamma:'γ', delta:'δ', epsilon:'ε', theta:'θ',
  lambda:'λ', mu:'μ', rho:'ρ', sigma:'σ', omega:'ω', tau:'τ', phi:'φ',
  Delta:'Δ', Sigma:'Σ', Omega:'Ω', Lambda:'Λ', Gamma:'Γ', pi:'π',
  // Operators / relations (Bug 33/53)
  times:'×', div:'÷', pm:'±', cdot:'·', to:'→', rightarrow:'→',
  leq:'≤', geq:'≥', approx:'≈', neq:'≠', degree:'°', deg:'°', propto:'∝',
};

/* symCmds(str) — \cmd tokens → symbols (\times → ×, \rho → ρ), plus the Bug 61
   repair. Safe on ANY text: only backslash commands are touched. */
function symCmds(str) {
  let s = String(str == null ? '' : str);
  // Bug 61: JSON authored with a SINGLE backslash ("\rho") arrives mangled — JSON.parse
  // turns \r into a carriage return, so the renderer sees CR+"ho" and the symbol is lost.
  // Repair: a control char whose escape letter + the following letters spell EXACTLY a
  // known symbol name is restored (the author meant a backslash command). Exact match
  // only — legitimate newlines/tabs followed by ordinary words are never touched.
  const _CTRL = { '\r': 'r', '\n': 'n', '\t': 't', '\b': 'b', '\f': 'f' };
  s = s.replace(/[\r\n\t\b\f]([A-Za-z]+)/g, (m, rest) => {
    const name = _CTRL[m[0]] + rest;
    if (_SYM[name]) {
      console.warn(`[eq] repaired mangled \\${name} — author it as "\\\\${name}" (double backslash) in JSON`);
      return _SYM[name];
    }
    return m;
  });
  return s.replace(/\\([A-Za-z]+)/g, (_, g) => _SYM[g] || `\\${g}`);
}

/* wordSwaps(str) — unit/operator WORDS → symbols, but ONLY in a maths context
   (2026-10-03, Patryk): units directly after a number ("100 metres" → "100 m"),
   "times" / "divided by" only between operands ("V = I times R", "12 divided by 3").
   Before this, every "times"/"seconds"/"metre" was swapped, so prose broke:
   "repeat three times" → "three ×", "a few seconds later" → "a few s later". */
const _OP_L = String.raw`(?<=(?:\d|\)|(?<![A-Za-z])[A-Za-z])\s*)`;   // left operand: digit, ")" or a lone letter
const _OP_R = String.raw`(?=\s*(?:\d|\(|[A-Za-z](?![A-Za-z])))`;     // right operand: digit, "(" or a lone letter
const _RE_TIMES   = new RegExp(_OP_L + String.raw`\btimes\b` + _OP_R, 'gi');
const _RE_DIVBY   = new RegExp(_OP_L + String.raw`\bdivided by\b` + _OP_R, 'gi');
function wordSwaps(str) {
  return String(str == null ? '' : str)
    .replace(/(\d)(\s*)met(?:er|re)s?\s*(?:\/|per)\s*second\b/gi, '$1$2m/s')   // compound unit first
    .replace(/(\d)(\s*)met(?:er|re)s?\b/gi, '$1$2m')
    .replace(/(\d)(\s*)seconds?\b/gi, '$1$2s')
    .replace(_RE_DIVBY, '÷')
    .replace(_RE_TIMES, '×');
}

/* normSym(str) — plain-text symbol normaliser for PROSE sinks (reviewRow,
   indicative content, handwriting model answers) and equation fields (parseEq).
   Structure (^ _ {}/ sqrt) is NOT touched here — that is parseEq's job. */
function normSym(str) { return wordSwaps(symCmds(str)); }

/* unicodeScript(str) — plain-text super/subscript for PROSE sinks that render
   flat strings (no run-level super/superscript). Converts x^2 / x^{2} → x²,
   x_2 → x₂, but ONLY when every char in the arg has a Unicode mapping; otherwise
   the token is left untouched (better a literal ^ than a mangled glyph). */
const _SUP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾','n':'ⁿ' };
const _SUB = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎' };
function unicodeScript(str) {
  const conv = (arg, map) => {
    const out = [...arg].map((c) => map[c]);
    return out.every(Boolean) ? out.join('') : null;
  };
  // the bare form takes letters/digits, or ONE bracketed group "^(n+1)"; never a closing bracket
  // that belongs to the sentence: "(cm^3)" raises the 3 only (2026-10-10)
  return String(str == null ? '' : str).replace(/([\^_])(?:\{([^}]*)\}|(-?[A-Za-z0-9+=]+|\([A-Za-z0-9+\-=]+\)))/g,
    (m, mark, braced, bare) => {
      const arg = braced != null ? braced : bare;
      const mapped = conv(arg, mark === '^' ? _SUP : _SUB);
      return mapped != null ? mapped : m;
    });
}

/* prettyText(str) — combined plain-text normaliser for PROSE sinks: symbols +
   Unicode super/subscript, body font preserved. Not for equation FIELDS (those
   use parseEq → toPptxRuns/toDocxRuns). */
function prettyText(str) { return unicodeScript(normSym(stripMarkTags(str))); }

/* Mark tags (Patryk 2026-10-12): "{1}E = 0.250 × 334 000{/1}" marks the words that earned
   mark point 1, "{x}…{/x}" the words that lost a mark. Only the handwriting slides draw them
   (highlighter + numbered circle); every other sink strips them here. "^{2}" / "_{1}" are
   powers, not tags, so a ^ or _ just before the brace leaves it alone. */
const MARK_TAG_RE = /(?<![\^_])\{\/?(\d|x)\}/g;
function stripMarkTags(str) { return String(str == null ? '' : str).replace(MARK_TAG_RE, ''); }

// Powers/subscripts are drawn at 120% of the line's size. PowerPoint and Word both shrink
// raised/lowered text by about a third on their own, so they land at about 80% (Patryk
// 2026-10-03: they used to be 65% AND shrunk again, which made them tiny).
const SCRIPT_SCALE = 1.2;
const _SUP_REV = Object.fromEntries(Object.entries(_SUP).map(([k, v]) => [v, k]));
const _SUB_REV = Object.fromEntries(Object.entries(_SUB).map(([k, v]) => [v, k]));
const _RE_SCRIPT_GLYPH = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]/;

/* proseMathSegs(str) — maths shorthand in ORDINARY text (2026-10-03). Before this,
   only equation fields and a few prose sinks converted it, so ~100 slide fields
   (Learn boxes, comparison rows, MCQ options, Engage hook...) showed raw "v^2",
   "H_2O", "{1/2}". Returns [{t:'text'|'sup'|'sub', v}] or null when nothing to do.
   - \cmd → symbol (symCmds); {a/b} → diagonal a⁄b (same glyph as toPptxRuns)
   - ^x / _x: x is a number ("v^2", "10^-3"), one letter ("x^n"), "+"/"-" after ^
     ("Na^+"), or braced ("SO_{4}", "x^{2n}")
   - a bare "/" is left alone ("and/or", "m/s"); no word swaps here
   - links and file names are never touched */
/* docxMathRuns(text, opts) — Word twin of proseMathRuns: one TextRun per piece, raised/
   lowered pieces at SCRIPT_SCALE of the run size (Word's default body size is 11pt = 22). */
function docxMathRuns(text, opts) {
  const o = opts || {};
  const ks = keySplit(text);                                     // {k}word{/k}: plain bold on worksheets
  if (ks) return ks.flatMap((k) => docxMathRuns(k.v, k.key ? Object.assign({}, o, { bold: true }) : o));
  const segs = proseMathSegs(text);
  if (!segs) return [new TextRun(Object.assign({}, o, { text: String(text == null ? '' : text) }))];
  const scriptSize = Math.round((o.size || 22) * SCRIPT_SCALE);
  return segs.map(sg => new TextRun(Object.assign({}, o, { text: sg.v },
    sg.t !== 'text' && { size: scriptSize },
    sg.t === 'sup' && { superScript: true }, sg.t === 'sub' && { subScript: true })));
}

/* splitScriptGlyphs(segs) — text segments holding ² ³ ⁻ ₂... are split so those
   characters become real sup/sub segments (drawn at SCRIPT_SCALE, not glyph size). */
function splitScriptGlyphs(segs) {
  return segs.flatMap(sg => sg.t !== 'text' || !_RE_SCRIPT_GLYPH.test(sg.v || '') ? [sg]
    : sg.v.split(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ]+|[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+)/).filter(Boolean)
      .map(v => _SUP_REV[v[0]] ? { t: 'sup', v: [...v].map(c => _SUP_REV[c]).join('') }
        : _SUB_REV[v[0]] ? { t: 'sub', v: [...v].map(c => _SUB_REV[c]).join('') } : { t: 'text', v }));
}

function proseMathSegs(str) {
  const s0 = String(str == null ? '' : str);
  if (!/[\^_{}\\\r\n\t\b\f]/.test(s0) && !_RE_SCRIPT_GLYPH.test(s0)) return null;
  if (/:\/\/|www\.|\.(?:png|jpe?g|gif|pdf|pptx|docx)\b/i.test(s0)) return null;
  const s = symCmds(s0);
  const segs = [];
  let buf = '', i = 0;
  const push = (t, v) => { if (t === 'text') { buf += v; return; } if (buf) { segs.push({ t: 'text', v: buf }); buf = ''; } segs.push({ t, v }); };
  const braced = (at) => {                     // s[at] === '{' → [inner, indexAfter] or null
    let d = 1, j = at + 1;
    while (j < s.length && d > 0) { if (s[j] === '{') d++; else if (s[j] === '}') d--; j++; }
    return d === 0 ? [s.slice(at + 1, j - 1), j] : null;
  };
  while (i < s.length) {
    const ch = s[i];
    if (ch === '{') {
      const b = braced(i), m = b && /^([^{}/]+)\/([^{}/]+)$/.exec(b[0]);
      if (m) { push('text', unicodeScript(m[1]) + '⁄' + unicodeScript(m[2])); i = b[1]; continue; }
    }
    if ((ch === '^' || ch === '_') && /[A-Za-z0-9)\]]$/.test(buf || (segs.length ? 'x' : ''))) {
      let arg = null, next = i + 1;
      if (s[next] === '{') { const b = braced(next); if (b && b[0]) { arg = b[0]; next = b[1]; } }
      else {
        const m = /^-?\d+(?:\.\d+)?/.exec(s.slice(next))
          || (/^[A-Za-z](?![A-Za-z])/.exec(s.slice(next)))
          || (ch === '^' && /^[+-](?![\dA-Za-z])/.exec(s.slice(next)));
        if (m) { arg = m[0]; next += m[0].length; }
      }
      if (arg != null) { push(ch === '^' ? 'sup' : 'sub', arg); i = next; continue; }
    }
    push('text', ch); i++;
  }
  if (buf) segs.push({ t: 'text', v: buf });
  // Unicode ² ³ ⁻ ₂ (from prettyText, {a/b} parts, or typed by hand) become real raised/
  // lowered pieces too, so every power is drawn at the same SCRIPT_SCALE size.
  const out = splitScriptGlyphs(segs);
  const changed = out.length !== 1 || out[0].t !== 'text' || out[0].v !== s0;
  return changed ? out : null;
}

function parseEq(raw) {
  if (!raw) return [{t:'text',v:''}];
  // 2026-07-05: normSym first — equation FIELDS now also convert word operators
  // ("times"→×, "divided by"→÷) and the safe unit whitelist, so GUESS cells,
  // equation hints and worked steps typeset the same as prose sinks.
  let s = normSym(raw);
  const segs = [];
  let buf = '', i = 0;
  const flush = () => { if (buf) { segs.push({t:'text',v:buf}); buf=''; } };
  const readArg = () => {
    if (i >= s.length) return '';
    if (s[i] === '{') {
      let d=1, j=i+1;
      while (j < s.length && d > 0) { if (s[j]==='{') d++; else if (s[j]==='}') d--; j++; }
      const v = s.slice(i+1,j-1); i=j; return v;
    }
    const m = /^-?[A-Za-z0-9]+/.exec(s.slice(i)); // N2: allow leading - for ^-2 style exponents
    if (m) { i += m[0].length; return m[0]; }
    return s[i++] || '';
  };
  while (i < s.length) {
    const ch = s[i];
    if (s.startsWith('sqrt(', i)) {
      flush(); let depth=1, j=i+5;
      while (j < s.length && depth > 0) { if (s[j]==='(') depth++; else if (s[j]===')') depth--; j++; }
      segs.push({t:'radical', children: parseEq(s.slice(i+5,j-1))}); i=j; continue;
    }
    if (ch === '_' || ch === '^') { flush(); i++; segs.push({t:ch==='_'?'sub':'sup', v:readArg()}); continue; }
    if (ch === '/') {
      if (buf) {
        const sp = Math.max(buf.lastIndexOf(' '), buf.lastIndexOf('='), buf.lastIndexOf('+'), buf.lastIndexOf('('));
        const num = sp >= 0 ? buf.slice(sp+1) : buf;
        const prefix = sp >= 0 ? buf.slice(0,sp+1) : '';
        buf = '';
        if (prefix) segs.push({t:'text',v:prefix});
        i++;
        const ds=i; while (i < s.length && !/[\s=+\-()]/.test(s[i])) i++;
        const den = s.slice(ds,i);
        segs.push(den && num ? {t:'frac',num:unicodeScript(num),den:unicodeScript(den)} : {t:'text',v:num+'/'+den}); // kg/m^3 → kg⁄m³ (2026-10-03)
      } else { segs.push({t:'text',v:'/'}); i++; }
      continue;
    }
    if (ch === '{') { // M1: {num/den} explicit fraction syntax
      let d=1, j=i+1;
      while (j < s.length && d>0) { if(s[j]==='{') d++; else if(s[j]==='}') d--; j++; }
      const inner = s.slice(i+1, j-1); i=j;
      const si = inner.indexOf('/');
      if (si > 0 && si < inner.length-1) { flush(); segs.push({t:'frac',num:unicodeScript(inner.slice(0,si).trim()),den:unicodeScript(inner.slice(si+1).trim())}); }
      else { buf += inner; }
      continue;
    }
    buf += ch; i++;
  }
  flush();
  return segs;
}
// segsToPlain(segs) — flatten a parseEq tree to a plain string (used for OOXML
// math radicands, which take simple runs). Radicands here are always simple.
function segsToPlain(segs) {
  return arr(segs).map(seg => {
    if (seg.t === 'frac')    return `${seg.num}/${seg.den}`;
    if (seg.t === 'radical') return `√${segsToPlain(seg.children)}`;
    return seg.v || '';
  }).join('');
}
// pptxgenjs runs array — subscript/superscript are native pptxgenjs run props.
// Equation runs render in Cambria Math (FONT_MATH); every toPptxRuns call site
// is a real equation field, so no prose is serif-ified.
function toPptxRuns(segs, opts) {
  const o = opts || {};
  const fs = o.fontSize || 18;
  const subFs = Math.round(fs * SCRIPT_SCALE);
  const base = (x) => Object.assign({fontSize:fs, fontFace:FONT_MATH}, o.bold && {bold:true}, o.color && {color:o.color}, x);
  const small = (x) => Object.assign({fontSize:subFs, fontFace:FONT_MATH}, o.color && {color:o.color}, x);
  const part = (v) => splitScriptGlyphs([{ t: 'text', v }]).flatMap(sg => toPptxRuns([sg], o));   // kg/m³ → real raised 3
  return splitScriptGlyphs(arr(segs)).flatMap(seg => {
    // Bug 53: diagonal fraction at FULL size (num/den no longer shrunk sub+sup on
    // top of the 0.65 scale — that compounding made {d/t} render tiny). pptxgenjs
    // has no Office Math, so this stays a legible diagonal a⁄b.
    if (seg.t === 'frac') return [...part(seg.num), {text:'⁄',options:base()}, ...part(seg.den)];
    if (seg.t === 'radical') return [{text:'√', options:base()}, ...toPptxRuns(seg.children, o)]; // √-glyph, no vinculum in PPTX
    if (seg.t === 'sub')  return {text:seg.v, options:small({subscript:true})};
    if (seg.t === 'sup')  return {text:seg.v, options:small({superscript:true})};
    return {text:seg.v||'', options:base()};
  });
}
/* renderEqShapes — Bug 33/53 phase 3 (Patryk sign-off 2026-07-06: native shape
   pairs, NOT rendered images). Draws an equation as positioned PowerPoint shapes
   so {a/b} fractions render as a TRUE stack: numerator over a bar over the
   denominator, all editable text in Cambria Math. Only dedicated equation
   surfaces call this (Learn-F equation box, guessExample E row, practiceTriangle
   reference box) — they own their box geometry. Inline prose and small boxes
   keep the full-size diagonal a⁄b from toPptxRuns.
   Returns false when it drew nothing (no fraction, or the stack would not fit
   legibly) — the caller then falls back to the existing toPptxRuns path.
   NOTE: a fraction stack cannot be a single shape, so this is the sanctioned
   exception to the "combine fill+text into one shape" rule. Shape names
   eqFracNum / eqFracBar / eqFracDen are asserted by the regression harness. */
function renderEqShapes(slide, segs, box, opts) {
  const o = opts || {};
  if (!arr(segs).some(sg => sg.t === 'frac')) return false;
  const fs = o.fontSize || 24;
  // Average glyph-width factor for Cambria Math bold at slide sizes (~0.60 em).
  const estW = (text, size) => String(text || '').length * size * 0.60 / 72;

  // num/den size: a step below the line size, but the 2-line stack must fit box.h.
  const fracFs = Math.max(12, Math.min(Math.round(fs * 0.82), Math.floor((box.h * 72) / 3.0)));
  const lineH = fracFs * 1.30 / 72;
  if (lineH * 2.2 > box.h) return false; // box too shallow for a legible stack

  // Walk segments into layout groups: consecutive text/sub/sup segments stay one
  // txt() run group; each fraction becomes its own num/bar/den stack.
  const groups = [];
  let run = [], runW = 0;
  const flushRun = () => { if (run.length) { groups.push({ kind: 'run', runs: run, w: runW }); run = []; runW = 0; } };
  for (const sg of segs) {
    if (sg.t === 'frac') {
      flushRun();
      const w = Math.max(estW(sg.num, fracFs), estW(sg.den, fracFs)) + 0.10;
      groups.push({ kind: 'frac', num: sg.num, den: sg.den, w });
    } else {
      run.push(...toPptxRuns([sg], o));
      const scale = (sg.t === 'sub' || sg.t === 'sup') ? 0.8 : 1;   // rendered size of a raised piece
      const rawText = sg.t === 'radical' ? '√' + segsToPlain(sg.children) : (sg.v || '');
      runW += estW(rawText, fs * scale);
    }
  }
  flushRun();

  const totalW = groups.reduce((a, g) => a + g.w, 0) + 0.04 * Math.max(0, groups.length - 1);
  if (totalW > box.w - 0.1) return false; // equation too wide — diagonal fallback

  // Container (fill/border) drawn first when the caller hands one over.
  if (box.fill || box.line) {
    slide.addShape('rect', { x: box.x, y: box.y, w: box.w, h: box.h, fill: box.fill, line: box.line || { type: 'none' } });
  }
  let cx = (o.align === 'left') ? box.x + 0.05 : box.x + (box.w - totalW) / 2;
  const midY = box.y + box.h / 2;
  for (const g of groups) {
    if (g.kind === 'run') {
      txt(slide, g.runs, { x: cx, y: box.y, w: g.w + 0.30, h: box.h, valign: 'middle', align: 'left', margin: 0 });
    } else {
      const common = Object.assign(
        { fontFace: FONT_MATH, fontSize: fracFs, align: 'center', margin: 0 },
        o.color && { color: o.color }, o.bold && { bold: true });
      txt(slide, g.num, Object.assign({ objectName: 'eqFracNum', x: cx, y: midY - lineH - 0.005, w: g.w, h: lineH, valign: 'bottom' }, common));
      slide.addShape('line', {
        objectName: 'eqFracBar', x: cx + g.w * 0.08, y: midY, w: g.w * 0.84, h: 0,
        line: { color: o.color || '1A1A2E', width: Math.max(1.25, fs / 16) },
      });
      txt(slide, g.den, Object.assign({ objectName: 'eqFracDen', x: cx, y: midY + 0.005, w: g.w, h: lineH, valign: 'top' }, common));
    }
    cx += g.w + 0.04;
  }
  return true;
}

// docx TextRun array — subScript/superScript are docx TextRun constructor props.
// Fractions/radicals emit OOXML math (rendered in Cambria Math by Word default).
function toDocxRuns(segs, opts) {
  const o = opts || {};
  const sz = o.size || 22;
  const subSz = Math.round(sz * SCRIPT_SCALE);
  const base = (x) => Object.assign({size:sz}, o.bold && {bold:true}, o.color && {color:o.color}, o.italic && {italics:true}, x);
  const small = (x) => Object.assign({size:subSz}, o.color && {color:o.color}, x);
  return splitScriptGlyphs(arr(segs)).flatMap(seg => {   // typed ² → real raised run
    if (seg.t === 'frac') return new DocxMath({ children: [new MathFraction({ numerator: [new DocxMathRun(seg.num)], denominator: [new DocxMathRun(seg.den)] })] }); // M2: stacked fraction via OOXML math
    if (seg.t === 'radical') return new DocxMath({ children: [new MathRadical({ children: [new DocxMathRun(segsToPlain(seg.children))] })] }); // true radical with vinculum (Cambria Math)
    if (seg.t === 'sub')  return new TextRun(small({text:seg.v, subScript:true}));
    if (seg.t === 'sup')  return new TextRun(small({text:seg.v, superScript:true}));
    return new TextRun(base({text:seg.v||''}));
  });
}

/* ---- INLINE MARKUP (real AQA mark-scheme conventions, M7) -----------------
   <u>word</u> = essential wording (must appear). **word** = bold connector —
   real mark schemes bold "and"/"or" to signal both-parts-required vs
   accepted-alternative. Literal "/" and brackets need no markup — they are
   already meaningful as plain characters in mark-scheme prose. */
function parseMarkup(raw) {
  const s = String(raw || '');
  const segs = [];
  const re = /<u>(.*?)<\/u>|\*\*(.*?)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) segs.push({ text: s.slice(last, m.index) });
    if (m[1] != null) segs.push({ text: m[1], underline: true });
    else segs.push({ text: m[2], bold: true });
    last = re.lastIndex;
  }
  if (last < s.length) segs.push({ text: s.slice(last) });
  return segs.length ? segs : [{ text: s }];
}
function markupToPptxRuns(raw, baseOpts) {
  return parseMarkup(raw).map((seg) => ({
    text: seg.text,
    options: Object.assign({}, baseOpts, seg.underline ? { underline: true } : {}, seg.bold ? { bold: true } : {}),
  }));
}
// DOCX twin — same rule: underline ONLY marks a word that MUST be used.
function markupToDocxRuns(raw, baseOpts) {
  return parseMarkup(raw).flatMap((seg) => docxMathRuns(seg.text, Object.assign({}, baseOpts,   // maths, same as R()
    seg.underline ? { underline: {} } : {},
    seg.bold ? { bold: true } : {})));
}
