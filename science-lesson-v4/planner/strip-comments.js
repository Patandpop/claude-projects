'use strict';
/* ============================================================================
   strip-comments.js: takes the comments out of the pasted copies in planner/dist/
   (Fable work plan 0.4, 29 Oct 2026). The source files keep every comment; only
   what Patryk pastes into the Apps Script editor shrinks, so each paste file
   stays under the editor's size limit (about 340 KB).

   Safety rules:
     - A small tokenizer walks the code, so "//" inside strings, template literals
       and regular expressions is left alone. A regular expression that could not be
       read cleanly is copied through untouched.
     - After stripping, each .gs file and each <script> block is parsed again. If the
       stripped copy no longer parses but the original did, the original is used and
       a warning is printed. Nothing can be silently broken by this file.
     - Comments starting "/*!" are kept (none today; the hook is there for licences).
   ============================================================================ */
const vm = require('vm');

// After one of these words a "/" starts a regular expression, not a division.
const REGEX_AFTER = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

function regexAllowed(prev) {
  if (prev === '') return true;
  if (prev === 'str' || prev === 're') return false;
  if (/^[0-9]/.test(prev)) return false;
  if (/^[A-Za-z_$][\w$]*$/.test(prev)) return REGEX_AFTER.has(prev);
  if (prev === ')' || prev === ']') return false;
  return true;   // an operator, "(", ",", ";", "{", "}" ...
}

function stripJs(src) {
  const n = src.length;
  let out = '', i = 0, lineStart = 0, prev = '', mode = 'code';
  const tpl = [];   // one entry per open template literal: the "{" depth inside its ${ }
  const trimLine = () => { out = out.replace(/[ \t]+$/, ''); return out.length === lineStart; };
  const dropRestOfLine = (j) => {   // the comment stood alone on its line: drop the line's end too
    let k = j; while (k < n && (src[k] === ' ' || src[k] === '\t' || src[k] === '\r')) k++;
    if (src[k] === '\n') { lineStart = out.length; return k + 1; }
    if (k >= n) return k;
    return j;
  };
  while (i < n) {
    const c = src[i];
    if (mode === 'tpl') {
      if (c === '\\') { out += src.slice(i, i + 2); i += 2; continue; }
      if (c === '`') { out += c; i++; mode = 'code'; tpl.pop(); prev = 'str'; continue; }
      if (c === '$' && src[i + 1] === '{') { out += '${'; i += 2; mode = 'code'; tpl[tpl.length - 1] = 0; prev = '{'; continue; }
      if (c === '\n') lineStart = out.length + 1;
      out += c; i++; continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      let j = i + 2; while (j < n && src[j] !== '\n') j++;
      const empty = trimLine();
      i = empty ? dropRestOfLine(j) : j;
      continue;
    }
    if (c === '/' && src[i + 1] === '*' && src[i + 2] !== '!') {
      let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2;
      const multiline = src.slice(i, j).includes('\n');
      const empty = trimLine();
      if (empty) { const k = dropRestOfLine(j); if (k !== j) { i = k; continue; } }
      out += multiline ? '\n' : ' ';   // a comment over several lines counts as a line break (semicolon insertion)
      if (multiline) lineStart = out.length;
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
      j++;
      out += src.slice(i, j); i = j; prev = 'str'; continue;
    }
    if (c === '`') { out += c; i++; tpl.push(0); mode = 'tpl'; continue; }
    if (c === '/' && regexAllowed(prev)) {
      let j = i + 1, inClass = false, ok = false;
      while (j < n) {
        const ch = src[j];
        if (ch === '\\') { j += 2; continue; }
        if (ch === '\n') break;
        if (inClass) { if (ch === ']') inClass = false; }
        else if (ch === '[') inClass = true;
        else if (ch === '/') { ok = true; break; }
        j++;
      }
      if (ok) {
        j++; while (j < n && /[A-Za-z]/.test(src[j])) j++;
        out += src.slice(i, j); i = j; prev = 're'; continue;
      }
      out += c; i++; prev = '/'; continue;   // not a regular expression after all: copy the "/" and carry on
    }
    if (c === '{' && tpl.length) tpl[tpl.length - 1]++;
    if (c === '}' && tpl.length) {
      if (tpl[tpl.length - 1] === 0) { out += c; i++; mode = 'tpl'; continue; }
      tpl[tpl.length - 1]--;
    }
    if (/[A-Za-z0-9_$]/.test(c)) {
      let j = i; while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const w = src.slice(i, j); out += w; i = j; prev = w; continue;
    }
    if (c === '\n') { out += c; i++; lineStart = out.length; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { out += c; i++; continue; }
    out += c; i++; prev = c;
  }
  return out;
}

// Apps Script scriptlets (<?= key ?>, <?!= include('x') ?>) are not JavaScript: stand them in with 0 before parsing.
const parses = (js) => { try { new vm.Script(js.replace(/<\?!?=?[\s\S]*?\?>/g, '0')); return true; } catch (_) { return false; } };

// Strip one piece of JavaScript; fall back to the original if the stripped copy no longer parses.
function safeJs(js, label, warnings) {
  const s = stripJs(js);
  if (parses(s) || !parses(js)) return s;
  warnings.push(`${label}: the comment stripper broke the code, so the original (with comments) was kept`);
  return js;
}

const JS_TYPES = /^(|text\/javascript|application\/javascript|module)$/i;
function stripHtml(src, label, warnings) {
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const comments = (s) => s.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
  let out = '', last = 0, m, k = 0;
  while ((m = re.exec(src))) {
    out += comments(src.slice(last, m.index));
    const type = (/\btype\s*=\s*["']?([^"'\s>]*)/i.exec(m[1]) || [, ''])[1];
    const body = JS_TYPES.test(type) ? safeJs(m[2], `${label} <script> ${++k}`, warnings) : m[2];
    out += `<script${m[1]}>${body}</script>`;
    last = m.index + m[0].length;
  }
  out += comments(src.slice(last));
  return out;
}

// name decides the treatment: .gs and .js = JavaScript, .html = HTML with its <script> blocks, anything else untouched.
function stripFile(name, text) {
  const warnings = [];
  let out = text;
  if (/\.(gs|js)$/i.test(name)) out = safeJs(text, name, warnings);
  else if (/\.html?$/i.test(name)) out = stripHtml(text, name, warnings);
  return { text: out, warnings, saved: Buffer.byteLength(text) - Buffer.byteLength(out) };
}

module.exports = { stripJs, stripHtml, stripFile, parses };
