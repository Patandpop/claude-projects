'use strict';
const fs = require('fs');
const DOC = 'C:/Users/magda/claude-projects/science-lesson-v4/Physics - Atomic Structure - Nuclear Fission and Fusion.doc';
let raw = fs.readFileSync(DOC, 'latin1');

// 1. Replace {\pict...} blobs (balanced braces) with [FIG]
function stripPict(s) {
  let out = '';
  let i = 0;
  const n = s.length;
  while (i < n) {
    const idx = s.indexOf('{\\pict', i);
    if (idx === -1) { out += s.slice(i); break; }
    out += s.slice(i, idx);
    // find balanced close brace from idx
    let depth = 0, j = idx;
    for (; j < n; j++) {
      const c = s[j];
      if (c === '\\') { j++; continue; } // skip escaped char
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    out += '[FIG]';
    i = j;
  }
  return out;
}

raw = stripPict(raw);
console.log('after pict strip, pict left', raw.split('\\pict').length - 1);
console.log('FIG markers', raw.split('[FIG]').length - 1);

// decode \'hh
raw = raw.replace(/\\'([0-9a-fA-F]{2})/g, (m, h) => {
  const code = parseInt(h, 16);
  // latin1/cp1252
  return Buffer.from([code]).toString('latin1');
});
// \uNNNN?  (unicode, followed by fallback char)
raw = raw.replace(/\\u(-?\d+)\??/g, (m, num) => {
  let code = parseInt(num, 10);
  if (code < 0) code += 65536;
  try { return String.fromCharCode(code); } catch (_) { return ''; }
});
// \par -> newline
raw = raw.replace(/\\par[d]?\b ?/g, '\n');
raw = raw.replace(/\\line\b ?/g, '\n');
raw = raw.replace(/\\tab\b ?/g, '\t');
// remove remaining control words \word or \word123 (optionally trailing space)
raw = raw.replace(/\\[a-zA-Z]+-?\d* ?/g, '');
// remove control symbols like \*
raw = raw.replace(/\\[^a-zA-Z]/g, '');
// drop braces
raw = raw.replace(/[{}]/g, '');
// collapse whitespace: multiple spaces
raw = raw.replace(/[ \t]+\n/g, '\n');
raw = raw.replace(/\n{3,}/g, '\n\n');
raw = raw.replace(/[ \t]{2,}/g, ' ');

fs.writeFileSync('C:/Users/magda/claude-projects/science-lesson-v4/$scratch/stripped.txt', raw, 'latin1');
console.log('written stripped, length', raw.length, 'lines', raw.split('\n').length);
