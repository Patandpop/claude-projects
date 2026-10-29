#!/usr/bin/env node
'use strict';
/* lesson-match-report.js — how many real exam questions each lesson can use (2026-10-15).
   For every lesson of every class (planner-data.json):
     Do Now  : single questions from that class's bank that match the lesson and stand on their own
     Board   : Years 9-11, whole AQA questions that match and fit a slide (exam-pick rules)
     Practice: whole questions that match (exam practice papers)
   Lessons with none are listed with the reason, plus a sample of matches to check by eye.
   node lesson-match-report.js [--class 9XS] [--samples 2] [--out report.md]
   Local only, reads the library, writes nothing unless --out. */

const fs = require('fs');
const path = require('path');
const lm = require('./lesson-match.js');

const ROOT = path.join(__dirname, '..', '..');
const a = process.argv.slice(2), v = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
const only = v('--class'), samples = Number(v('--samples') || 0);
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'planner', 'planner-data.json'), 'utf8'));

function bank(cls) {
  const f = path.join(__dirname, 'question-bank', cls + '.json');
  if (!fs.existsSync(f)) return [];
  const b = JSON.parse(fs.readFileSync(f, 'utf8'));
  return (b.questions || b).filter((q) => !lm.standalone(q.text, false));
}

const qp = require('./question-pool.js');
const defaults = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'class-defaults.json'), 'utf8')).classes; } catch (e) { return {}; } })();
const wideCache = new Map();
function wide(cls, c) {
  if (!wideCache.has(cls)) wideCache.set(cls, qp.widePool({ year: c.year, subjects: (defaults[cls] || {}).patrykTeaches }));
  return wideCache.get(cls);
}
let ep = null;
try { ep = require('./exam-pick.js'); } catch (e) { /* library absent */ }
const boardCache = new Map();
function wholeQuestions(subject, topic) {
  const k = subject + '|' + topic;
  if (!boardCache.has(k)) boardCache.set(k, ep ? ep.candidates(subject, topic).filter((q) => !q.tiny && !ep.damaged(q) && !ep.noData(q)) : []);
  return boardCache.get(k);
}
const boardFit = (q) => !ep.paperOnly(q) && q.marks >= 2 && q.marks <= 6 && q.parts.length <= 3 && q.figs.length <= 1 && !q.levelled && q.text.length <= 900 && q.msLen <= 900;

const lines = [];
const out = (s) => { lines.push(s); if (!v('--out')) console.log(s); };
const totals = { lessons: 0, none: 0, dnMiss: [], boardMiss: [], unmapped: [] };
for (const [cls, c] of Object.entries(data.classes)) {
  if (only && cls !== only) continue;
  const B = bank(cls);
  out(`\n## ${cls} (Year ${c.year})`);
  for (const L of c.seq) {
    const spec = lm.specFor({ topic: L.topic, title: L.title });
    totals.lessons++;
    if (!spec) { out(`  ?? ${L.topic} / ${L.title}: topic not in the map`); totals.unmapped.push(`${cls} ${L.topic} / ${L.title}`); continue; }
    if (spec.none) { totals.none++; continue; }
    let dn = B.map((q) => ({ q, r: lm.match({ text: q.text, ms: q.answer, subtopic: q.topic, subject: q.subject }, spec) })).filter((x) => x.r.ok);
    let wideUsed = false;
    if (!dn.length) {   // the class bank has nothing for this lesson: the wide pool (question-pool.js)
      dn = wide(cls, c).map((q) => ({ q, r: lm.match({ text: q.text, ms: q.answer, subtopic: q.topic, subject: q.subject }, spec) })).filter((x) => x.r.ok);
      wideUsed = dn.length > 0;
    }
    let board = [], prac = [], boardWhy = '';
    const code = (String(L.topic).match(/^([BCP]\d+)\b/) || [])[1];
    if (ep && c.year >= 9 && c.year <= 11 && code && ep.AQA_TOPIC[code]) {
      const subject = { B: 'Biology', C: 'Chemistry', P: 'Physics' }[code[0]];
      prac = wholeQuestions(subject, ep.AQA_TOPIC[code]).map((q) => ({ q, r: lm.match({ text: q.text, ms: q.parts.map((p) => (p.ms && p.ms.text) || '').join(' '), subtopic: q.subtopic, subject }, spec) })).filter((x) => x.r.ok);
      // the board question exactly as a build would pick it (exam-pick.js), nothing used yet
      const pk = ep.pickForLesson({ meta: { class: cls, year: c.year, macrotopic: L.topic, title: L.title } }, { usage: {}, picks: {} });
      board = pk.board ? [{ q: { id: pk.board.examRef + (pk.board.partsUsed ? ' (opening parts)' : ''), text: pk.board.groups.map((g) => [g.stem, ...g.parts.map((p) => p.text)].join(' ')).join(' ') }, r: { tier: 0, hits: [pk.board.marks + ' marks'] } }] : [];
      if (!board.length) boardWhy = pk.why || '';
    }
    const tiers = (xs) => [1, 2, 3, 4].map((t) => xs.filter((x) => x.r.tier === t).length).join('/');
    const flag = (dn.length ? '' : ' DO-NOW-MISS') + (c.year >= 9 && c.year <= 11 && code && !board.length ? ' BOARD-MISS (' + boardWhy + ')' : '') + (spec.guessed ? ' (guessed from title)' : '');
    out(`  ${String(L.num).padStart(2)}. ${L.title}: do now ${dn.length}${wideUsed ? ' (wide pool)' : ''} [${tiers(dn)}]` + (c.year >= 9 && c.year <= 11 ? `, board ${board.length ? 'yes' : 'no'}, practice ${prac.length}` : '') + flag);
    if (!dn.length) totals.dnMiss.push(`${cls} ${L.topic} / ${L.title}`);
    if (c.year >= 9 && c.year <= 11 && code && !board.length && !/for this lesson \(/.test(boardWhy)) totals.boardMiss.push(`${cls} ${L.topic} / ${L.title}: ${boardWhy}`);
    if (samples) {
      dn.sort((x, y) => lm.rank(y.r) - lm.rank(x.r)).slice(0, samples).forEach((x) => out(`        dn t${x.r.tier} [${x.r.hits.join(', ')}] ${String(x.q.text).replace(/\s+/g, ' ').slice(0, 110)}`));
      board.sort((x, y) => lm.rank(y.r) - lm.rank(x.r)).slice(0, samples).forEach((x) => out(`        bd [${x.r.hits.join(', ')}] ${x.q.id}: ${x.q.text.replace(/\s+/g, ' ').slice(0, 120)}`));
    }
  }
}
out(`\n## Summary\n${totals.lessons} lessons, ${totals.none} with no exam questions by design (assessments, safety, ICT).`);
out(`Do Now misses (${totals.dnMiss.length}):\n` + totals.dnMiss.map((x) => '  - ' + x).join('\n'));
out(`Board question misses, Years 9-11 (${totals.boardMiss.length}):\n` + totals.boardMiss.map((x) => '  - ' + x).join('\n'));
if (totals.unmapped.length) out(`Not in the map (${totals.unmapped.length}):\n` + totals.unmapped.map((x) => '  - ' + x).join('\n'));
if (v('--out')) { fs.writeFileSync(v('--out'), lines.join('\n') + '\n', 'utf8'); console.log(`written ${v('--out')}: ${totals.dnMiss.length} Do Now misses, ${totals.boardMiss.length} board misses`); }
module.exports = {};
