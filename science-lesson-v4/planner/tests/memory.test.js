// Memory map maths (lanes/design-memory-map.md section 10), 29 Oct 2026. Run: node planner/tests/memory.test.js
const M = require('../memory.js');
let failed = 0; const out = [];
const ok = (n, c) => { out.push((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };
const near = (a, b, e) => Math.abs(a - b) <= (e == null ? 0.01 : e);

// recall: 90% at t = S, 75% at 3S, 50% at 9S
ok('recall is 90% at t = S, 75% at t = 3S, 50% at t = 9S', near(M.recall(10, 10), 0.9) && near(M.recall(10, 30), 0.75) && near(M.recall(10, 90), 0.5));

// the worked example (design 4.5): 9AS, latent heat, taught 6 Oct
const code = 'Physics 4.3.2.1';
let r = M.update([], [{ cls: '9AS', spec: code, date: '2026-10-06' }], [], { today: '2026-10-06' });
let row = r.scores[0];
ok('just taught: unknown (amber "?"), S 4, D 5', row.state === 'unknown' && row.S === 4 && row.D === 5 && row.firstTaught === '2026-10-06');
r = M.update(r.scores, [], [{ id: 'v1', when: '2026-10-08', cls: '9AS', spec: code, source: 'vote', pct: 60 }], { today: '2026-10-08' });
row = r.scores[0];
ok('a vote at 60% is a miss at half weight: S (4 + 1.2) / 2 = 2.6, D 5.5, re-teach on', near(row.S, 2.6) && near(row.D, 5.5) && row.reteach === true && row.lapses === 1);
ok('...and it turns red nine days later (17 Oct)', M.stateOf(row, '2026-10-14').state === 'amber' && M.stateOf(row, '2026-10-17').state === 'red');
r = M.update(r.scores, [], [{ id: 'h1', when: '2026-10-17', cls: '9AS', spec: code, source: 'homework', pct: 80 }], { today: '2026-10-17' });
row = r.scores[0];
ok('homework at 80% is right: S grows a lot (to ' + row.S.toFixed(1) + ' days), D eases to 5.2, re-teach clears', row.S > 6 && row.S < 16 && near(row.D, 5.2) && row.reteach === false && row.reps === 2);
ok('...green straight after', M.stateOf(row, '2026-10-18').state === 'green');

// weights: a vote moves half as far as homework
const base = { cls: 'X', spec: 'c', S: 4, D: 5, reps: 1, lapses: 0, lastEvidence: '2026-10-01' };
const hw = M.apply(base, 40, 'homework', '2026-10-05'), vt = M.apply(base, 40, 'vote', '2026-10-05');
ok('a vote applies half the change homework does', near(4 - vt.S, (4 - hw.S) / 2) && near(vt.D - 5, (hw.D - 5) / 2));

// thresholds: exactly 75% is right, 74.9 a miss; green from 85
ok('exactly 75% counts as right, just under as a miss', M.apply(base, 75, 'homework', '2026-10-05').reteach === false && M.apply(base, 74.9, 'homework', '2026-10-05').reteach === true);
ok('green at 85% and above, amber 75 to 84, red below 75', M.stateOf({ S: 9 * 100, reps: 1, lastEvidence: '2026-10-01' }, '2026-10-01').state === 'green'
  && M.stateOf({ S: 1, reps: 1, lastEvidence: '2026-10-01' }, '2026-10-03').state === 'amber'   // 2 days, S 1: 82%
  && M.stateOf({ S: 1, reps: 1, lastEvidence: '2026-10-01' }, '2026-10-05').state === 'red');   // 4 days: 69%

// several results on one day are averaged first, applied once
r = M.update([], [{ cls: 'Y', spec: 'c', date: '2026-10-01' }], [
  { id: 'a', when: '2026-10-03', cls: 'Y', spec: 'c', source: 'vote', pct: 60 }, { id: 'b', when: '2026-10-03', cls: 'Y', spec: 'c', source: 'vote', pct: 100 }], { today: '2026-10-03' });
ok('two votes on one day (60% and 100%) average to 80% and count once', r.applied === 1 && r.scores[0].reps === 1 && r.scores[0].lastPct === 80 && r.scores[0].reteach === false);

// untaught stays grey; evidence for an untaught code is skipped
r = M.update([], [{ cls: 'Y', spec: 'later', date: '2026-12-01' }], [{ id: 'z', when: '2026-10-03', cls: 'Y', spec: 'later', source: 'vote', pct: 90 }], { today: '2026-10-03' });
ok('a lesson not yet taught has no square (grey) and its evidence is skipped', r.scores.length === 0 && r.skipped === 1 && M.stateOf(null, '2026-10-03').state === 'untaught');

// unknown drifts to red in about 12 days
const u = { S: 4, reps: 0, firstTaught: '2026-10-01' };
ok('an untested point drifts to red after about 12 days', M.stateOf(u, '2026-10-12').state === 'unknown' && M.stateOf(u, '2026-10-14').state === 'red');

// suggestions: red first, then unknown/amber, lowest recall first; green and grey never; top 6 ticked
const sc = [
  { cls: 'Z', spec: 'g', S: 500, reps: 2, lastEvidence: '2026-10-20' }, { cls: 'Z', spec: 'r1', S: 1, reps: 1, lastEvidence: '2026-10-01' },
  { cls: 'Z', spec: 'r2', S: 2, reps: 1, lastEvidence: '2026-10-01' }, { cls: 'Z', spec: 'a', S: 1.4, reps: 1, lastEvidence: '2026-10-18' },
  { cls: 'Z', spec: 'u', S: 4, reps: 0, firstTaught: '2026-10-19' }, { cls: 'Q', spec: 'other', S: 1, reps: 1, lastEvidence: '2026-09-01' }];
const sg = M.suggest(sc, 'Z', '2026-10-21', { tick: 2 });
ok('suggestions: red (lowest first), then unknown, then amber; green never; other classes never: ' + sg.map((x) => x.spec).join(','), sg.map((x) => x.spec).join(',') === 'r1,r2,u,a');
ok('the top ones come ticked, the rest unticked', sg.filter((x) => x.ticked).map((x) => x.spec).join(',') === 'r1,r2');
ok('a code used in the last two Do Nows is skipped unless still red', M.suggest(sc, 'Z', '2026-10-21', { recent: ['u', 'r1'] }).map((x) => x.spec).join(',') === 'r1,r2,a');
const many = Array.from({ length: 14 }, (_, i) => ({ cls: 'W', spec: 's' + String(i).padStart(2, '0'), S: 1, reps: 1, lastEvidence: '2026-09-01' }));
const sm = M.suggest(many, 'W', '2026-10-21');
ok('at most 10 suggestions, 6 ticked', sm.length === 10 && sm.filter((x) => x.ticked).length === 6);

// monthly learning: more misses than predicted lowers growth (floor 0.5), fewer raises it (cap 1.5)
const opt = [{ predicted: 0.9, pct: 50 }, { predicted: 0.9, pct: 40 }, { predicted: 0.9, pct: 30 }];
const pes = [{ predicted: 0.3, pct: 90 }, { predicted: 0.3, pct: 95 }, { predicted: 0.3, pct: 99 }];
ok('monthly learning: too optimistic lowers growth 10%, too pessimistic raises it 10%', M.adjustGrowth(1, opt) === 0.9 && M.adjustGrowth(1, pes) === 1.1);
ok('monthly learning respects its floor 0.5 and cap 1.5', M.adjustGrowth(0.52, opt) === 0.5 && M.adjustGrowth(1.45, pes) === 1.5);

// lineage: once only, chained moves, leavers replaced
const ln = [{ cls: '10S2', spec: 'p' }, { cls: '9AS', spec: 'q' }, { cls: '11S2', spec: 'old' }, { cls: '7MLA', spec: 'k' }];
const l1 = M.lineage(ln, '10S2 > 11S2, 9AS > 10S2', 2027, '');
ok('lineage: 10S2 > 11S2 and 9AS > 10S2 carry rows forward; last year\'s 11S2 rows go; others untouched',
  l1.ran && l1.scores.map((x) => x.cls + ':' + x.spec).sort().join(',') === '10S2:q,11S2:p,7MLA:k');
ok('lineage runs once a year only', M.lineage(l1.scores, '10S2 > 11S2', 2027, 2027).ran === false);

// no names: the maths only ever sees class codes and spec codes
ok('scores carry class and spec codes only (no pupil fields)', r.scores.every((x) => !('name' in x) && !('email' in x)));

console.log(out.join('\n')); console.log(failed ? `\n${failed} FAILED` : '\nAll passed'); process.exit(failed ? 1 : 0);
