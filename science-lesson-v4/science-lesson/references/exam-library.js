'use strict';
/* ============================================================================
   exam-library.js — parse ONE exam doc (AQA/Exampro RTF-in-.doc) into a
   structured, per-question-part index for the lesson-generation suite.

   This is a LIBRARY builder, not a paper merger: it turns a heavy exam export
   into a light JSON index of individual question PARTS, each joined to the
   REAL mark scheme (marking points, allow/accept notes, Level descriptors) and
   any examiner commentary. Downstream tools (challenge tasks, Do Now bank,
   revision lessons, answer sheets, MCQ distractor mining, ...) rank and pull
   parts from this index — they never invent scheme content.

   Design doc: specs/exam-doc-library.md

   HARD RULES (see spec):
     - A part with NO mark-scheme match gets ms:null and is listed in joinMisses.
       Scheme content is NEVER fabricated.
     - The parser THROWS (with context) on structures it cannot interpret
       (missing section heading, question/total-marker mismatch, ...).
       Skippable oddities go into `warnings`, printed at the end — never silent.

   CLI:
     node references/exam-library.js "<docPath>" [--out <indexPath>]
   Writes exam-library-index.json next to the doc by default and prints a
   human-readable summary.

   Public API (guarded by require.main so tests import the pure functions):
     stripRtf(latin1String)         -> plain text with [FIG] markers
     parseDoc(docPath)              -> index object
     splitParts(lines)              -> segmented parts (used for Q / MS / ER)
     topicFromFilename(filename)    -> { subject, topic, subtopic }
     commandWord(text)              -> canonical command word | "other"
     challengeScore(cmd, marks)     -> number
   ============================================================================ */

const fs   = require('fs');
const path = require('path');

const SPEC_VERSION = '1';

/* ------------------------------------------------------------------ RTF strip */

// Replace balanced {\pict ...} blobs with [FIG] BEFORE anything else. Braces
// inside a pict are balanced; \-escaped chars are skipped so a stray brace in
// hex data cannot unbalance the scan.
function stripPictBlobs(s) {
  let out = '';
  let i = 0;
  const n = s.length;
  while (i < n) {
    const idx = s.indexOf('{\\pict', i);
    if (idx === -1) { out += s.slice(i); break; }
    out += s.slice(i, idx);
    let depth = 0, j = idx;
    for (; j < n; j++) {
      const c = s[j];
      if (c === '\\') { j++; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    if (depth !== 0) throw new Error('exam-library: unbalanced {\\pict} blob starting at offset ' + idx);
    out += '[FIG]';
    i = j;
  }
  return out;
}

function stripRtf(raw) {
  let s = stripPictBlobs(raw);
  // \'hh  -> cp1252/latin1 byte
  s = s.replace(/\\'([0-9a-fA-F]{2})/g, (m, h) => Buffer.from([parseInt(h, 16)]).toString('latin1'));
  // \uNNNN(?) -> unicode code point (optional trailing fallback char '?')
  s = s.replace(/\\u(-?\d+)\??/g, (m, num) => {
    let code = parseInt(num, 10);
    if (code < 0) code += 65536;
    try { return String.fromCharCode(code); } catch (_) { return ''; }
  });
  // paragraph / line / tab breaks -> real breaks
  s = s.replace(/\\par[d]?\b ?/g, '\n');
  s = s.replace(/\\line\b ?/g, '\n');
  s = s.replace(/\\tab\b ?/g, '\t');
  // remaining control words (\word, \word-12) and control symbols (\*, \~ ...)
  s = s.replace(/\\[a-zA-Z]+-?\d* ?/g, '');
  s = s.replace(/\\[^a-zA-Z]/g, '');
  // braces gone
  s = s.replace(/[{}]/g, '');
  // whitespace tidy
  s = s.replace(/[ \t]+\n/g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s;
}

/* ------------------------------------------------------------- topic from name */

function topicFromFilename(filename) {
  const base = String(filename || '').replace(/\.[^.]+$/, '').trim();
  const bits = base.split(/\s+-\s+/).map((b) => b.trim()).filter(Boolean);
  return {
    subject:  bits[0] || null,
    topic:    bits[1] || null,
    subtopic: bits.length > 2 ? bits.slice(2).join(' - ') : null,
  };
}

/* ---------------------------------------------------------------- command word */

// Canonical command words. Order does not matter — first MATCH in the text wins.
const COMMAND_WORDS = [
  'Describe','Explain','Calculate','Give','Name','State','Write','Compare',
  'Evaluate','Suggest','Complete','Draw','Tick','Choose','Determine','Show',
  'Use','Define','Label','Estimate','Sketch','Justify','Plan',
  'What','Which','How',
];
const COMMAND_LOOKUP = new Map(COMMAND_WORDS.map((w) => [w.toLowerCase(), w]));

function commandWord(text) {
  const toks = String(text || '').toLowerCase().match(/[a-z']+/g) || [];
  for (const t of toks) if (COMMAND_LOOKUP.has(t)) return COMMAND_LOOKUP.get(t);
  return 'other';
}

// Command-word tier for challengeScore.
const TIER3 = new Set(['Evaluate', 'Explain', 'Compare', 'Justify']);
const TIER2 = new Set(['Calculate', 'Determine', 'Show', 'Describe', 'Suggest']);
function commandTier(cmd) {
  if (TIER3.has(cmd)) return 3;
  if (TIER2.has(cmd)) return 2;
  return 1;
}
function tariffBonus(marks) {
  if (marks == null) return 0;
  if (marks >= 3 && marks <= 6) return 3; // the sweet spot for a meaty challenge part
  if (marks > 6) return 2;
  if (marks === 2) return 1;
  return 0;
}
function challengeScore(cmd, marks) {
  return commandTier(cmd) + tariffBonus(marks);
}

/* --------------------------------------------------------------- part segmenter */

const ROM = 'viii|vii|xii|xi|iv|ix|iii|vi|ii|x|v|i'; // longest-first so 'iii' beats 'i'
const RE_LETTER_ROMAN = new RegExp('^\\(([a-z])\\)\\s*\\((' + ROM + ')\\)\\s*', 'i');
const RE_LETTER       = /^\(([a-z])\)\s*/i;
const RE_ROMAN        = new RegExp('^\\((' + ROM + ')\\)\\s*', 'i');
const RE_TARIFF       = /^\((\d+)\)\s*$/;

// Segment a block of lines into ordered raw segments keyed by part id. Shared by
// question, mark-scheme and examiner-report parsing so ids line up for the join.
// Returns { stem:[lines], segments:[{ id, letter, roman, isContainer, lines:[] }] }.
function splitParts(lines) {
  const stem = [];
  const segments = [];
  let cur = null;
  let curLetter = null;

  const open = (id, letter, roman, firstText) => {
    cur = { id, letter, roman, isContainer: false, lines: [] };
    if (firstText && firstText.trim()) cur.lines.push(firstText.trim());
    segments.push(cur);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let m;
    if ((m = RE_LETTER_ROMAN.exec(line))) {
      // "(a) (i)" — letter then roman on one line.
      curLetter = m[1].toLowerCase();
      const roman = m[2].toLowerCase();
      open(curLetter + '.' + roman, curLetter, roman, line.slice(m[0].length));
    } else if ((m = RE_ROMAN.exec(line))) {
      // A bare roman numeral. Under a current letter it is a sub-part
      // (a.i); with no letter yet it is a top-level roman part (id "i").
      // Roman is tested BEFORE letter so "(i)" is never mistaken for letter i
      // (which would desync the question/scheme ids and break the join).
      const roman = m[1].toLowerCase();
      open(curLetter ? curLetter + '.' + roman : roman, curLetter, roman, line.slice(m[0].length));
    } else if ((m = RE_LETTER.exec(line))) {
      curLetter = m[1].toLowerCase();
      open(curLetter, curLetter, null, line.slice(m[0].length));
    } else if (cur) {
      cur.lines.push(line);
    } else {
      stem.push(line);
    }
  }

  // A bare-letter segment with no tariff whose letter has roman children is a
  // CONTAINER: its text is lead-in shared by the children, not a part of its own.
  const hasTariff = (seg) => seg.lines.some((l) => RE_TARIFF.test(l));
  for (const seg of segments) {
    if (seg.roman == null && !hasTariff(seg)) {
      const kids = segments.filter((s) => s.letter === seg.letter && s.roman != null);
      if (kids.length) seg.isContainer = true;
    }
  }
  return { stem, segments };
}

// Pull the standalone (N) tariff out of a segment's lines; return { marks, text }.
function extractTariff(segLines) {
  let marks = null;
  const kept = [];
  for (const l of segLines) {
    const t = RE_TARIFF.exec(l);
    if (t) { marks = parseInt(t[1], 10); continue; } // last tariff wins
    kept.push(l);
  }
  return { marks, text: kept.join(' ').replace(/\s{2,}/g, ' ').trim() };
}

/* ---------------------------------------------------------------- MS extraction */

const RE_LEVEL = /^Level\s+(\d)\s*\((\d+)\s*(?:-\s*(\d+))?\s*marks?\)/i;

// Extract Level 0-3 descriptors from a mark-scheme part's lines.
function extractLevels(segLines) {
  const levels = [];
  let cur = null;
  for (const l of segLines) {
    const m = RE_LEVEL.exec(l);
    if (m) {
      if (cur) levels.push(cur);
      const lo = m[2], hi = m[3];
      cur = { level: parseInt(m[1], 10), marks: hi ? `${lo}-${hi}` : lo, descriptor: '' };
    } else if (cur) {
      if (/^Examples of the points/i.test(l)) { levels.push(cur); cur = null; continue; }
      cur.descriptor += (cur.descriptor ? ' ' : '') + l;
    }
  }
  if (cur) levels.push(cur);
  return levels;
}

// allow / accept / ignore / do not accept notes embedded in a scheme part.
function extractNotes(segLines) {
  return segLines
    .filter((l) => /^(allow|accept|ignore|do not accept|do not credit|credit|or\b|reference)/i.test(l))
    .map((l) => l.trim());
}

/* ---------------------------------------------------------------- section split */

function findHeading(lines, re) {
  for (let i = 0; i < lines.length; i++) if (re.test(lines[i].trim())) return i;
  return -1;
}

// Slice a section's lines into per-question blocks keyed by number. Blocks run
// from one "Q<n>." marker to the next (or the section end).
function questionBlocks(lines, from, to) {
  const marks = [];
  for (let i = from; i < to; i++) {
    const m = /^Q(\d+)\.$/.exec(lines[i].trim());
    if (m) marks.push({ q: parseInt(m[1], 10), at: i });
  }
  const blocks = [];
  for (let k = 0; k < marks.length; k++) {
    const start = marks[k].at + 1;
    const end   = k + 1 < marks.length ? marks[k + 1].at : to;
    blocks.push({ q: marks[k].q, lines: lines.slice(start, end) });
  }
  return blocks;
}

/* --------------------------------------------------------------------- parseDoc */

function parseDoc(docPath) {
  const warnings = [];
  const raw = fs.readFileSync(docPath, 'latin1');
  if (!/^\s*\{\\rtf/.test(raw)) {
    throw new Error(`exam-library: ${path.basename(docPath)} does not start with an RTF header — not an Exampro .doc export?`);
  }
  const text = stripRtf(raw);
  const lines = text.split('\n');

  const { subject, topic, subtopic } = topicFromFilename(path.basename(docPath));
  if (!subject || !topic || !subtopic) {
    warnings.push(`filename "${path.basename(docPath)}" did not split into Subject - Topic - Subtopic; got ${JSON.stringify({ subject, topic, subtopic })}`);
  }

  const msStart = findHeading(lines, /^Mark schemes$/i);
  const erStart = findHeading(lines, /^Examiner reports$/i);
  if (msStart === -1) throw new Error('exam-library: "Mark schemes" heading not found — cannot locate the scheme section');
  const erAt = erStart === -1 ? lines.length : erStart;
  if (erStart === -1) warnings.push('no "Examiner reports" heading found — examiner commentary will be empty');

  /* ---- QUESTIONS ---- */
  const qBlocks = questionBlocks(lines, 0, msStart);
  if (!qBlocks.length) throw new Error('exam-library: no "Q<n>." markers found in the questions section');

  // Total-marks markers (one per question) — a structural sanity gate.
  let totalMarkers = 0;
  for (let i = 0; i < msStart; i++) if (/\(Total\s+\d+\s+marks?\)/.test(lines[i])) totalMarkers++;
  if (totalMarkers !== qBlocks.length) {
    throw new Error(`exam-library: found ${qBlocks.length} question markers but ${totalMarkers} "(Total N marks)" markers — structure not understood`);
  }

  const questions = qBlocks.map((b) => parseQuestionBlock(b, warnings));

  /* ---- MARK SCHEMES ---- */
  const msBlocks = questionBlocks(lines, msStart + 1, erAt);
  const msByQ = new Map();
  for (const b of msBlocks) msByQ.set(b.q, parseSchemeBlock(b));

  /* ---- EXAMINER REPORTS ---- */
  const erByQ = new Map();
  if (erStart !== -1) {
    for (const b of questionBlocks(lines, erStart + 1, lines.length)) {
      erByQ.set(b.q, parseReportBlock(b));
    }
  }

  /* ---- JOIN ---- */
  const parts = [];
  const joinMisses = [];
  for (const q of questions) {
    const ms = msByQ.get(q.q) || { byId: new Map(), whole: null };
    const er = erByQ.get(q.q) || { byId: new Map(), whole: null };
    for (const p of q.parts) {
      const scheme = ms.byId.get(p.id) || (p.id === '' ? ms.whole : null);
      const examiner = er.byId.get(p.id) || (p.id === '' ? er.whole : null) || er.whole || null;
      let msObj = null;
      if (scheme) {
        msObj = {
          text: scheme.text,
          notes: scheme.notes,
          levels: scheme.levels,
          examinerCommentary: examiner,
        };
      } else {
        joinMisses.push(`Q${q.q} part "${p.id || '(whole)'}"`);
      }
      const cmd = commandWord(p.text);
      parts.push({
        subject, topic, subtopic,
        question: q.q,
        part: p.id,
        text: p.text,
        commandWord: cmd,
        marks: p.marks,
        hasFigure: p.hasFigure || q.stemHasFigure,
        questionTotalMarks: q.totalMarks,
        challengeScore: challengeScore(cmd, p.marks),
        ms: msObj,
      });
    }
  }

  // Sanity: no part may carry more marks than its whole question.
  for (const p of parts) {
    if (p.marks != null && p.questionTotalMarks != null && p.marks > p.questionTotalMarks) {
      throw new Error(`exam-library: Q${p.question} part "${p.part}" has ${p.marks} marks > question total ${p.questionTotalMarks} — parsing went wrong`);
    }
  }

  const joinHits = parts.length - joinMisses.length;
  return {
    specVersion: SPEC_VERSION,
    parsedAt: new Date().toISOString(),
    source: path.basename(docPath),
    subject, topic, subtopic,
    counts: {
      questions: questions.length,
      parts: parts.length,
      joinHits,
      joinMisses: joinMisses.length,
      joinCoveragePct: parts.length ? Math.round((joinHits / parts.length) * 1000) / 10 : 0,
    },
    parts,
    joinMisses,
    warnings,
  };
}

// One question block (lines after the "Q<n>." marker) -> parts + totals.
function parseQuestionBlock(block, warnings) {
  const q = block.q;
  // The (Total N marks) line ends the question; capture N and drop the line.
  let totalMarks = null;
  const body = [];
  for (const l of block.lines) {
    const m = /\(Total\s+(\d+)\s+marks?\)/.exec(l);
    if (m) { totalMarks = parseInt(m[1], 10); continue; }
    body.push(l);
  }

  const { stem, segments } = splitParts(body);
  const stemText = stem.join(' ').replace(/\s{2,}/g, ' ').trim();
  const stemHasFigure = /\[FIG\]/.test(stemText);

  const hasOwnTariff = (seg) => seg.lines.some((l) => RE_TARIFF.test(l));

  // A container letter whose roman children do NOT each carry their own (N)
  // tariff is an extended-response part: the (i)/(ii)/(iii) are bullet prompts
  // of ONE answer with a single shared tariff, and the mark scheme keys it by
  // the letter alone. Collapse those into a single part so the join lands.
  const collapseLetters = new Set();
  for (const seg of segments) {
    if (!seg.isContainer) continue;
    const kids = segments.filter((s) => s.letter === seg.letter && s.roman != null);
    const withTariff = kids.filter(hasOwnTariff).length;
    if (kids.length && withTariff < kids.length) collapseLetters.add(seg.letter);
  }

  const parts = [];
  const leadByLetter = new Map();
  for (const seg of segments) {
    if (seg.isContainer) {
      const lead = seg.lines.join(' ').trim();
      leadByLetter.set(seg.letter, lead);
      if (collapseLetters.has(seg.letter)) {
        // Gather this letter's roman children into one collapsed part.
        const kids = segments.filter((s) => s.letter === seg.letter && s.roman != null);
        const allLines = seg.lines.concat(...kids.map((k) => k.lines));
        const { marks, text } = extractTariff(allLines);
        if (marks == null) warnings.push(`Q${q} part "${seg.letter}" (extended, collapsed) has no (N) tariff line — marks set null`);
        parts.push({ id: seg.letter, marks, text: text.trim(), hasFigure: /\[FIG\]/.test(text) });
      }
      continue;
    }
    if (seg.roman != null && collapseLetters.has(seg.letter)) continue; // folded into the letter part
    const { marks, text } = extractTariff(seg.lines);
    const lead = seg.roman != null && leadByLetter.has(seg.letter) ? leadByLetter.get(seg.letter) : '';
    const full = (lead ? lead + ' ' : '') + text;
    if (marks == null) {
      warnings.push(`Q${q} part "${seg.id}" has no (N) tariff line — marks set null`);
    }
    parts.push({ id: seg.id, marks, text: full.trim(), hasFigure: /\[FIG\]/.test(full) });
  }

  // Whole-question single-part case: no markers at all.
  if (!parts.length) {
    parts.push({ id: '', marks: totalMarks, text: stemText, hasFigure: stemHasFigure });
  }

  if (totalMarks == null) throw new Error(`exam-library: Q${q} has no "(Total N marks)" marker`);
  return { q, totalMarks, stemText, stemHasFigure, parts };
}

// One mark-scheme block -> { byId: Map(partId -> {text,notes,levels}), whole }.
function parseSchemeBlock(block) {
  // Drop the [N] total marker line(s).
  const body = block.lines.filter((l) => !/^\[\d+\]$/.test(l.trim()));
  const { stem, segments } = splitParts(body);

  const byId = new Map();
  let whole = null;
  const build = (segLines) => ({
    text: segLines.join(' ').replace(/\s{2,}/g, ' ').trim(),
    notes: extractNotes(segLines),
    levels: extractLevels(segLines),
  });

  const leadByLetter = new Map();
  for (const seg of segments) {
    if (seg.isContainer) { leadByLetter.set(seg.letter, seg.lines); continue; }
    byId.set(seg.id, build(seg.lines));
  }
  if (!segments.filter((s) => !s.isContainer).length) {
    whole = build(stem); // whole-question scheme (extended-response single mark scheme)
  } else if (stem.length) {
    whole = build(stem);
  }
  return { byId, whole };
}

// One examiner-report block -> { byId: Map(partId -> text), whole }.
function parseReportBlock(block) {
  const { stem, segments } = splitParts(block.lines);
  const byId = new Map();
  for (const seg of segments) {
    if (seg.isContainer) continue;
    byId.set(seg.id, seg.lines.join(' ').replace(/\s{2,}/g, ' ').trim());
  }
  const whole = stem.length ? stem.join(' ').replace(/\s{2,}/g, ' ').trim() : null;
  return { byId, whole };
}

/* --------------------------------------------------------------------- CLI */

function summarise(index) {
  const c = index.counts;
  const L = [];
  L.push('');
  L.push(`Exam library — ${index.subject} / ${index.topic} / ${index.subtopic}`);
  L.push(`  source: ${index.source}   spec v${index.specVersion}   parsed ${index.parsedAt.slice(0, 10)}`);
  L.push(`  questions: ${c.questions}   parts: ${c.parts}`);
  L.push(`  mark-scheme join: ${c.joinHits}/${c.parts} parts (${c.joinCoveragePct}%)   misses: ${c.joinMisses}`);
  const withLevels = index.parts.filter((p) => p.ms && p.ms.levels && p.ms.levels.length).length;
  const withFig    = index.parts.filter((p) => p.hasFigure).length;
  L.push(`  parts with Level descriptors: ${withLevels}   parts flagged hasFigure: ${withFig}`);

  const top = index.parts
    .filter((p) => !p.hasFigure && p.ms)          // figure-free + real scheme
    .slice()
    .sort((a, b) => b.challengeScore - a.challengeScore || (b.marks || 0) - (a.marks || 0))
    .slice(0, 5);
  L.push('  top challenge candidates:');
  top.forEach((p, i) => {
    L.push(`    ${i + 1}. Q${p.question}${p.part ? '(' + p.part + ')' : ''}  ${p.commandWord}  ${p.marks} mark(s)  score ${p.challengeScore}`);
  });
  if (index.joinMisses.length) L.push(`  joinMisses: ${index.joinMisses.join(', ')}`);
  if (index.warnings.length) {
    L.push(`  warnings (${index.warnings.length}):`);
    index.warnings.forEach((w) => L.push(`    ! ${w}`));
  } else {
    L.push('  warnings: none');
  }
  L.push('');
  return L.join('\n');
}

function main(argv) {
  const args = argv.slice(2);
  if (!args.length) {
    console.error('usage: node references/exam-library.js "<docPath>" [--out <indexPath>]');
    process.exit(1);
  }
  const docPath = args[0];
  let outPath = null;
  const oi = args.indexOf('--out');
  if (oi !== -1) outPath = args[oi + 1];
  if (!outPath) outPath = path.join(path.dirname(path.resolve(docPath)), 'exam-library-index.json');

  const index = parseDoc(docPath);
  fs.writeFileSync(outPath, JSON.stringify(index, null, 2), 'utf8');
  console.log(summarise(index));
  console.log(`index written -> ${outPath}`);
  if (index.counts.joinCoveragePct < 80) {
    console.log(`\n! join coverage ${index.counts.joinCoveragePct}% is below the 80% floor — inspect joinMisses above.`);
  }
}

module.exports = {
  stripRtf, stripPictBlobs, parseDoc, splitParts, extractTariff, extractLevels,
  topicFromFilename, commandWord, challengeScore, commandTier, tariffBonus,
  SPEC_VERSION,
};

if (require.main === module) main(process.argv);
