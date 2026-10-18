// node test/ms-friendly.test.js — mark schemes pupils can read (ms-friendly.js, 2026-10-12).
'use strict';
const fs = require('fs');
const path = require('path');
const F = require('../science-lesson/references/ms-friendly.js');

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`${c ? '  ok  ' : '  FAIL'} ${m}`); if (!c) fails++; };
  console.log('Mark schemes pupils can read (ms-friendly.js)');

  // AQA: three marks, notes already split out by the library
  const aqa = { text: 'rate / photosynthesis is faster / higher (at 40°C) allow converse for 10°C if clearly stated 1 particles have greater (kinetic) energy allow particles move faster 1 (so) collide more frequently allow (so) more collisions in a given time allow more successful collisions do not accept wind 1',
    notes: ['allow converse for 10°C if clearly stated', 'allow particles move faster', 'allow (so) more collisions in a given time allow more successful collisions do not accept wind'] };
  const a = F.friendlyMs(aqa, { board: 'AQA', marks: 3 });
  check(a.split && a.points.length === 3 && a.points.every((p) => p.marks === 1), 'AQA: one line per mark');
  check(a.points[2].also.length === 2 && a.points[2].no[0] === 'wind', 'AQA: notes sorted under their own mark (also accepted / no mark for)');
  const plain = F.msPlain(aqa, { board: 'AQA', marks: 3 }, '(c)');
  check(/^\(c\) 3 marks\n✓ 1 mark: rate/.test(plain) && !/\s1$/m.test(plain.split('\n')[1]), 'Forms text: "✓ 1 mark: ..." with no stray mark digit');

  // AQA that does not add up: one block, nothing guessed
  const odd = F.friendlyMs({ text: 'any two from: light intensity allow 1 mark for light 2', notes: [] }, { board: 'AQA', marks: 2 });
  check(!odd.split && odd.points.length === 1, 'AQA: digits that do not add up stay one block');

  // OCR: codes in words, guidance sorted
  const ocr = { text: '1 a Δλ = 656.3 - 654 (nm) or 2.3 (nm)\nv = c × Δλ / λ\n=1050 km s^−1\nC1\nC1\nA1 Allow between 2.25 and 2.35\nCheck denominator is 656.3 (XP)\nignore minus sign\naccept 1100 (km s^−1)' };
  const o = F.friendlyMs(ocr, { board: 'OCR A', marks: 3 });
  check(o.codes === 'Marks: 2 for working, 1 for the final answer', 'OCR: C1 C1 A1 read as "2 for working, 1 for the final answer"');
  check(/^Δλ/.test(o.points[0].text) && o.points[0].also.length === 2 && o.points[0].ignore[0] === 'minus sign' && /^Check/.test(o.points[0].extra[0]), 'OCR: source question number gone, Allow / Ignore / Check sorted');
  check(F.friendlyMs({ text: 'very hot\nUniverse expanded\nB1 × 2' }, { board: 'OCR A', marks: 2 }).codes === '1 mark each, up to 2', 'OCR: "B1 × 2" read as 1 mark each, up to 2');

  const two = F.friendlyMs({ text: '7 b i (λT = constant)\nT = 8600 (K)\nC1\nA1\nii P on the main sequence and to LEFT of Sun. B1 Allow: ECF from (b)(i)' }, { board: 'OCR A', marks: 3 });
  check(two.parts && two.points.length === 2 && two.points[1].label === 'ii' && two.points[1].marks === 1 && two.points[1].also[0] === 'ECF from (b)(i)', 'OCR: a scheme covering (i) and (ii) gives each part its own marks');

  // Verbatim: on the real library (home only), every word shown comes from the exam board's text
  const lib = path.join(__dirname, '..', 'exam-library', 'docs');
  if (fs.existsSync(lib)) {
    const LABEL = new Set(['shown', 'picture', 'see', 'mark', 'scheme', 'paper', 'table']);
    let n = 0, bad = 0, ex = '';
    for (const f of fs.readdirSync(lib).slice(0, 40)) {
      for (const p of JSON.parse(fs.readFileSync(path.join(lib, f), 'utf8')).parts) {
        if (!p.ms || !p.ms.text) continue;
        n++;
        const src = F.decode(p.ms.text).toLowerCase();
        const r = F.friendlyMs(p.ms, { board: 'AQA', marks: p.marks });
        const shown = r.points.flatMap((x) => [x.text, ...x.also, ...x.no, ...x.ignore, ...x.extra]).join(' ').toLowerCase();
        const miss = (shown.match(/[a-z]{3,}/g) || []).filter((w) => !LABEL.has(w) && !src.includes(w));
        if (miss.length) { bad++; ex = ex || miss.join(','); }
      }
    }
    check(n > 100 && !bad, `verbatim: ${n} real AQA mark schemes, no word added (${bad} with new words${ex ? ': ' + ex : ''})`);
  }
  // OCR level-of-response 6-marker (2026-10-15): levels short, writing sentences and codes gone, points by area
  const lorText = 'Level 3 (5–6 marks)\nClear methods of measurement and uncertainties\nThere is a well-developed line of reasoning which is clear and logically structured.\nLevel 2 (3–4 marks)\nAdequate methods\nThere is a line of reasoning presented with some structure.\nLevel 1 (1–2 marks)\nLimited methods\nThe information is basic and communicated in an unstructured way.\n0 marks\nNo response or no response worthy of credit. B1 × 6 Indicative scientific points may include:\nM measurement\nD measured with metre rulers\nU uncertainty\n× = 2.4 mm\nA minimising uncertainties\nD maximise distance on bench';
  const lor = F.friendlyMs({ text: lorText }, { board: 'OCR A', marks: 6 }).points[0].lor;
  check(lor && lor.levels.map((x) => x.level + ':' + x.marks).join(' ') === '3:5–6 2:3–4 1:1–2', 'level schemes: one line per level with its marks');
  check(lor && lor.levels[0].need === 'Clear methods of measurement and uncertainties', 'level schemes: only the science line kept, writing sentence dropped');
  check(lor && lor.areas.map((x) => x.head).join('|') === 'Measurement|Uncertainty|Minimising uncertainties', 'level schemes: points grouped under their areas, OCR letters removed');
  check(lor && lor.areas[1].points[0] === 'x = 2.4 mm', 'level schemes: library × fixed back to the letter x');
  const lp = F.msPlain({ text: lorText }, { board: 'OCR A', marks: 6 });
  check(!/B1|No response|well-developed/.test(lp) && /How it is marked/.test(lp), 'level schemes: Forms text has the how-it-is-marked line, no codes or 0-mark line');
  // mark points (2026-10-18): one Yes/No per mark on the Form's marking page; marks add up to the total
  const sum = (r) => r.points.reduce((n, p) => n + p.marks, 0);
  const mp1 = F.markPoints(aqa, { board: 'AQA', marks: 3, id: 'q1' });
  check(sum(mp1) === 3 && mp1.points.every((p) => p.kind === 'point' && p.marks === 1) && mp1.points[1].says === 'particles have greater (kinetic) energy' && mp1.points[2].no[0] === 'wind' && mp1.points[0].id === 'q1-1',
    'mark points, AQA split scheme: one point per mark in the scheme\'s own words, notes kept');
  const mp2 = F.markPoints({ text: 'any two from: light intensity allow 1 mark for light 2', notes: [] }, { board: 'AQA', marks: 2 });
  check(sum(mp2) === 2 && mp2.points.length === 2 && mp2.points.every((p) => p.kind === 'mark' && p.of === 2), 'mark points, AQA unsplit 2-marker: "mark 1 of 2", "mark 2 of 2", each with the whole point');
  const mp3 = F.markPoints({ text: 'number of half-lives = 4 1 time = 4 × 138 1 time = 552 (days) 1', notes: [] }, { board: 'AQA', marks: 3, calc: true });
  check(sum(mp3) === 3 && mp3.points.map((p) => p.kind).join() === 'method,method,answer' && mp3.points[2].says === 'time = 552 (days)', 'mark points, AQA calculation: working marks then the final answer (a value "= 4" is not read as a mark)');
  const mp4 = F.markPoints(ocr, { board: 'OCR A', marks: 3, calc: true });
  check(sum(mp4) === 3 && mp4.points.map((p) => p.kind).join() === 'method,method,answer' && mp4.points[2].says === '1050 km s^−1' && mp4.points[2].also.length === 2, 'mark points, OCR C1 C1 A1 calculation: two working marks and the answer, with what else is accepted');
  const mp5 = F.markPoints({ text: '7 b i (λT = constant)\nT = 8600 (K)\nC1\nA1\nii P on the main sequence and to LEFT of Sun. B1 Allow: ECF from (b)(i)' }, { board: 'OCR A', marks: 3 });
  check(sum(mp5) === 3 && mp5.points.map((p) => p.part).join() === '(i),(i),(ii)' && mp5.points[2].kind === 'point', 'mark points, OCR multi-part: each mark carries its part label');
  const aqaLv = { text: 'Level 3 ...', levels: [{ level: 3, marks: '5-6', descriptor: 'There is a detailed description.' }, { level: 2, marks: '3-4', descriptor: 'There is a clear description.' }, { level: 1, marks: '1-2', descriptor: 'There is a brief description.' }] };
  const mp6 = F.markPoints(aqaLv, { board: 'AQA', marks: 6 });
  check(sum(mp6) === 6 && mp6.points.map((p) => p.kind + p.level + ':' + p.marks).join() === 'level1:2,level2:2,level3:2' && mp6.levels[0].from === 1 && mp6.levels[2].to === 6, 'mark points, AQA 6-mark levels: one item per level, Level 1 first, 2 marks each');
  const mp7 = F.markPoints({ text: lorText }, { board: 'OCR A', marks: 6 });
  check(sum(mp7) === 6 && mp7.points.every((p) => p.kind === 'level') && /^clear methods/.test(mp7.points[2].says), 'mark points, OCR level-of-response 6-marker: three levels, Level 3 says "clear methods ..."');
  const mp8 = F.markPoints(null, { board: 'AQA', marks: 2 });
  check(sum(mp8) === 2 && /ask your teacher/.test(mp8.points[0].says), 'mark points, no scheme: one "mark k of n" each, "ask your teacher"');
  check(F.markPoints({ text: 'Ek = 270 (J) 1', notes: [] }, { board: 'AQA', marks: 1 }).points[0].says === 'Ek = 270 (J)', 'mark points: a symbol at the start keeps its capital (Ek = 270 J)');
  if (fs.existsSync(lib)) {
    let n = 0, bad = 0;
    for (const [dir, board] of [['docs', 'AQA'], ['docs-ocr', 'OCR A']]) {
      for (const f of fs.readdirSync(path.join(__dirname, '..', 'exam-library', dir)).slice(0, 60)) {
        const seen = new Set();
        for (const p of JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'exam-library', dir, f), 'utf8')).parts) {
          if (!p.ms || !p.ms.text || (board === 'OCR A' && seen.has(p.question))) continue;
          seen.add(p.question);
          const marks = board === 'OCR A' ? p.questionTotalMarks : p.marks;
          if (!marks) continue;
          n++;
          if (sum(F.markPoints(p.ms, { board, marks, calc: /\bcalculate\b/i.test(p.text) })) !== marks) bad++;
        }
      }
    }
    check(n > 100 && !bad, `mark points on ${n} real mark schemes: the marks always add up to the question's marks (${bad} did not)`);
  }
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
