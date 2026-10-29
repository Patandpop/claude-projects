'use strict';
// do-now-vary.test.js — Do Now calculations get new numbers, same words, a correct answer (2026-10-15).
const { vary } = require('../science-lesson/references/do-now-vary.js');
const GRN = '\x1b[32m', RED = '\x1b[31m', RST = '\x1b[0m';

function run() {
  let fails = 0;
  const check = (c, m) => { console.log(`  ${c ? GRN + '✓' : RED + '✗'}${RST} ${m}`); if (!c) fails++; };
  console.log('── Do Now: new numbers on calculations, wording kept');
  const words = (t) => t.replace(/\d[\d .]*/g, '#');
  const num = (s) => Number(String(s).replace(/ /g, ''));
  const q = { id: 'r', type: 'calculate', text: 'An alpha particle has a radius of 1.7 femtometres. The radius of a gold nucleus is 4.2 times larger than the radius of an alpha particle. Calculate the radius of a gold nucleus in femtometres.', answer: 'radius = 1.7 × 4.2 1 radius = 7.14 (femtometres)' };
  const v = vary(q, 42);
  const got = v && v.text.match(/radius of (\d+(?:\.\d+)?) femto[\s\S]*?is (\d+(?:\.\d+)?) times/);
  check(v && words(v.text) === words(q.text) && v.text !== q.text, 'same wording, different numbers');
  check(got && Math.abs(num(v.answer.split('=').pop().trim().match(/^[\d .]+/)[0]) - got[1] * got[2]) / (got[1] * got[2]) < 0.01, `answer worked out again from the new numbers (${v && v.answer})`);
  check(v && vary(q, 42).text === v.text, 'the same lesson gets the same numbers on a rebuild');
  const ice = { type: 'calculate', text: 'Calculate the thermal energy needed to melt 0.250 kg of ice at 0 °C. specific latent heat of fusion of water = 334 000 J/kg', answer: 'E = 0.250 × 334 000 1 E = 83 500 (J)' };
  const vi = vary(ice, 3);
  check(vi && vi.text.includes('334 000') && !vi.text.includes('0.250 kg') && / J$/.test(vi.answer), 'real values (ice latent heat 334 000 J/kg) never change; the mass does');
  check(vary({ type: 'calculate', text: 'A sample has an activity of 400 Bq. Calculate its age.', answer: '2 half-lives 1 128.74 (s)' }, 1) === null, 'no working shown in the mark scheme: question left as it is');
  check(vary({ type: 'calculate', text: 'A force of 20 N acts over 3 m. Calculate the work done.', answer: 'W = 20 × 3 = 50 (J)' }, 1) === null, 'working that does not match the stated answer: left as it is');
  check(vary({ type: 'calculate', text: 'Concentration 0.0480 mol, volume 90 cm3. Calculate the mass.', answer: '(concentration = 90 × 0.0480 =) 4.32 (g/dm3) 1 (mass = 4.32 × 0.25) = 1.08 (g)' }, 1) === null, 'two-step working: left as it is (the first number may be a middle step)');
  return { fails, warns: 0 };
}
module.exports = { run };
if (require.main === module) process.exit(run().fails ? 1 : 0);
