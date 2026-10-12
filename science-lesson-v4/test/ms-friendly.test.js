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
  return { fails, warns: 0 };
}

module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
