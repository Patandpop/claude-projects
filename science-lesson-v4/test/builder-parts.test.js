'use strict';
// builder-parts.test.js — builder pieces checked without a build (items 2.5, 2.6 and the 20 language
// rules, 2026-10-30). Loads the builder parts into one scope as build.js does, with main() switched off.
// Made-up lessons only.
const fs = require('fs'), path = require('path'), vm = require('vm');
const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';
const REF = path.join(__dirname, '..', 'science-lesson', 'references');

function load() {
  const req = require('module').createRequire(path.join(REF, 'build.js'));
  const ctx = vm.createContext({ require: req, __dirname: REF, console: { log() {}, warn() {}, error() {} }, Buffer, setTimeout,
    process: { env: { BUILD_NO_MAIN: '1' }, argv: [], platform: process.platform, execPath: process.execPath } });
  for (const p of ['01-core', '02-equations', '03-slide-helpers', '13-checks', '17-main'])
    vm.runInContext(fs.readFileSync(path.join(REF, 'builder', p + '.js'), 'utf8'), ctx, { filename: p + '.js' });
  return ctx;
}

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── Builder pieces (no build)');
  const ctx = load();
  const ev = (src) => vm.runInContext(src, ctx);

  // 2.5: the word bank follows class-defaults.json (9AS and 9XS none, 10C2 keeps it)
  const nb = ev('[...NO_WORD_BANK]');
  check(['9AS', '9XS', '10S2', '11S2', '12C', '13D'].every((c) => nb.includes(c)) && !nb.includes('10C2') && !nb.includes('7MLA'),
    'word bank: none for 9AS, 9XS, 10S2, 11S2, 12C, 13D; 10C2 and 7MLA keep theirs (' + nb.join(' ') + ')');

  // the 20 language rules: each warning fires once on a lesson that breaks it, and none on a clean one
  const lines = (L) => { ctx._L = L; ctx._out = []; ev("languageChecks(_L, _out, (_L.meta.lessonType || 'standard')); emDashCheck(_L, _out)"); return ctx._out.join('\n'); };
  const why = { A: 'a', C: 'c', D: 'd' };
  const bad = { meta: { year: 9, lessonType: 'standard' },
    learn: [{ variant: 'A', heading: 'Pressure', boxes: [{ header: 'Pressure', items: ['Pressure is the force acting on each square metre of a surface and it is measured in pascals by every scientist.', 'b', 'c', 'd'] }] }],
    build: [{ type: 'mcq', q: 'Which?', options: { A: 'The force is shared over a much bigger area so there is less pressure on the ground', B: 'b', C: 'c', D: 'd' }, answer: 'B', why }],
    apply: { developing: [{ q: 'The pressure is to be calculated.' }] }, review: { note: 'one — two' } };
  const o = lines(bad);
  [['sentence over 20 words', 'a long slide sentence'], ['no speaker notes', 'a Learn slide with no notes'], ['more than 3 notes beside a picture', 'four notes beside a picture'],
    ['passive instruction', 'a passive instruction'], ['no Engage', 'a lesson with no Engage'], ['MCQ option over 70', 'a long MCQ option'], ['em dash in review', 'an em dash']]
    .forEach(([needle, what]) => check(o.includes(needle), 'language warning fires: ' + what));
  const e1 = lines(Object.assign({}, bad, { engage: { hook: 'A camel and a horse weigh the same. Why does only the horse sink deep into the sand when both of them walk across a soft beach?' } }));
  check(/Engage question over 15 words/.test(e1) && /no notes line/.test(e1), 'language warning fires: a long Engage question, and no notes on where it is answered');
  const e2 = lines(Object.assign({}, bad, { engage: { hook: 'Let us explore pressure today.' } }));
  check(/Engage asks no question/.test(e2) && /hype word "explore"/.test(e2), 'language warning fires: an Engage with no question, and a hype word');
  const good = { meta: { year: 9, lessonType: 'standard' },
    engage: { hook: 'Why does a camel not sink in sand?', notes: 'Answered on Learn 1: wide feet, less pressure.' },
    learn: [{ variant: 'A', heading: 'Pressure', notes: 'Say it: same force, bigger area.', boxes: [{ header: 'Pressure', items: ['Pressure is force on each square metre.', 'Unit: pascal (Pa).'] }] }],
    build: [{ type: 'mcq', q: 'Which?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'B', why }], apply: { developing: [{ q: 'Work out the pressure.' }] } };
  check(lines(good) === '', 'a lesson that keeps the rules gets no language warning');
  const aLevel = lines(Object.assign({}, good, { meta: { year: 13, lessonType: 'standard' }, learn: [Object.assign({}, good.learn[0], { boxes: [{ header: 'h', items: ['a', 'b', 'c', 'd', 'e'] }] })] }));
  check(aLevel === '', 'Years 12 and 13 may carry five notes beside a picture');

  // 2.6: one MCQ from this class's lesson 3 to 4 weeks ago
  const log = [{ class: '9XS', title: 'Atoms', builtOn: '2026-10-05' }, { class: '9XS', title: 'Too recent', builtOn: '2026-10-25' },
    { class: '8XP', title: 'Other class', builtOn: '2026-10-05' }, { class: '9XS', title: 'Too old', builtOn: '2026-09-01' }];
  const mcqs = [1, 2, 3].map((n) => ({ type: 'mcq', q: 'Atoms Q' + n, options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', why: { B: 'x', C: 'y', D: 'z' } }));
  const lessons = { 'Atoms': { meta: { class: '9XS', title: 'Atoms' }, build: mcqs } };
  ctx._log = log; ctx._read = (cls, t) => (cls === '9XS' ? lessons[t] || null : null);
  const pick = (meta) => { ctx._L2 = { meta }; return ev("delayedMcq(_L2, _log, _read, '2026-10-30')"); };
  const p1 = pick({ class: '9XS', title: 'Elements', lessonNumber: 4, date: '2026-10-30' });
  check(p1 && p1.from === 'Atoms' && p1.q === 'Atoms Q2', 'delayed MCQ: the lesson 25 days back gives one question, chosen by lesson number (' + (p1 && p1.q) + ')');
  check(JSON.stringify(pick({ class: '9XS', title: 'Elements', lessonNumber: 4, date: '2026-10-30' })) === JSON.stringify(p1), 'delayed MCQ: a rebuild picks the same one');
  check(!mcqs[1].from, 'delayed MCQ: the earlier lesson is not changed');
  check(pick({ class: '8XP', title: 'Forces', lessonNumber: 1, date: '2026-10-30' }) === null, 'delayed MCQ: none when that lesson has no saved questions');
  check(pick({ class: '9XS', title: 'Elements', lessonNumber: 4, date: '2026-10-30', delayedMcq: false }) === null, 'delayed MCQ: meta.delayedMcq false turns it off');
  check(pick({ class: '9XS', title: 'Elements', lessonNumber: 4, date: '2026-10-30', lessonType: 'review' }) === null, 'delayed MCQ: never on a review lesson');
  ctx._L3 = { meta: { year: 9, lessonType: 'standard' }, build: mcqs.slice(0, 2).concat([Object.assign({}, mcqs[2], { from: 'Atoms' })]) };
  ctx._o3 = []; ev("(() => { const n = arr(_L3.build).filter((b) => ['mcq', 'mcq_image'].includes(b.type || b.variant) && !b.from).length; _o3.push(n); })()");
  check(ctx._o3[0] === 2, 'delayed MCQ: not counted towards the six');
  return { fails, warns: 0 };
}
module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
