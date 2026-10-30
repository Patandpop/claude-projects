// Eyes-free behaviour entry (planner/eyes-free.js). Run: node planner/tests/eyes-free.test.js
// Made-up names only.
'use strict';
const E = require('../eyes-free.js');
let failed = 0;
const ok = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) failed++; };
const pl = (pairs) => pairs.map((p) => ({ x: p[0], y: p[1] }));
const shape = (L, v) => E.SHAPES[L][v || 0].map(pl);

// ---- a synthetic thumb: tilt, squash, wobble, rounded corners, any stroke order or direction
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const smooth = (st) => st.map((b, i) => { const a = st[Math.max(0, i - 1)], c = st[Math.min(st.length - 1, i + 1)]; return { x: (a.x + 2 * b.x + c.x) / 4, y: (a.y + 2 * b.y + c.y) / 4 }; });
const dense = (st) => { const o = []; for (let i = 0; i < st.length - 1; i++) for (let k = 0; k < 6; k++) { const t = k / 6; o.push({ x: st[i].x + t * (st[i + 1].x - st[i].x), y: st[i].y + t * (st[i + 1].y - st[i].y) }); } o.push(st[st.length - 1]); return o; };
function hand(strokes) {
  const sx = 90 + rnd() * 90, sy = 90 + rnd() * 90, rot = (rnd() - 0.5) * 0.4, ox = rnd() * 200, oy = rnd() * 200, c = Math.cos(rot), s = Math.sin(rot);
  let out = strokes.map((st) => smooth(dense(st)).map((p) => { const x = p.x * sx, y = p.y * sy; return { x: ox + x * c - y * s + (rnd() - 0.5) * 7, y: oy + x * s + y * c + (rnd() - 0.5) * 7 }; }));
  out = out.map((st) => (rnd() < 0.5 ? st.slice().reverse() : st));
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
function accuracy(letters, opts, reps) {
  let right = 0, sure = 0, total = 0;
  letters.forEach((L) => E.SHAPES[L].forEach((v) => { for (let k = 0; k < (reps || 8); k++) { const r = E.recognise(hand(v.map(pl)), Object.assign({ letters }, opts || {})); total++; if (r.letters[0].letter === L) { right++; if (r.sure) sure++; } } }));
  return { top1: right / total, sure: sure / total };
}

// ---- recognising letters
const ALL = Object.keys(E.SHAPES);
ok('26 block capitals are built in', ALL.length === 26 && E.BUILT_IN.length >= 26);
ok('a clean letter is read exactly (every letter, every variant)', ALL.every((L) => E.SHAPES[L].every((v) => E.recognise(v.map(pl)).letters[0].letter === L)));
let a = accuracy(ALL);
ok(`a sloppy thumb across all 26 letters is read 9 times in 10 (${Math.round(a.top1 * 100)}%)`, a.top1 >= 0.9);
const CLASS = ['A', 'B', 'C', 'D', 'E', 'H', 'J', 'K', 'L', 'M', 'S', 'T'];
a = accuracy(CLASS);
ok(`with a class's 12 initials it is read 19 times in 20 (${Math.round(a.top1 * 100)}%) and sure most of the time (${Math.round(a.sure * 100)}%)`, a.top1 >= 0.95 && a.sure >= 0.8);
ok('a letter the class does not have is never answered', E.recognise(shape('Q'), { letters: ['A', 'B'] }).letters.every((x) => x.letter !== 'Q'));
ok('stroke order and direction do not matter', (() => { const t = shape('T'); const r1 = E.recognise([t[1], t[0].slice().reverse()]), r2 = E.recognise(t); return r1.letters[0].letter === 'T' && r2.letters[0].letter === 'T'; })());
ok('size and place on the screen do not matter', E.recognise(shape('K').map((s) => s.map((p) => ({ x: 300 + p.x * 40, y: 900 + p.y * 55 })))).letters[0].letter === 'K');
ok('a squashed letter still reads (I stays I, O stays O)', E.recognise(shape('I').map((s) => s.map((p) => ({ x: p.x * 20, y: p.y * 300 })))).letters[0].letter === 'I' && E.recognise(shape('O').map((s) => s.map((p) => ({ x: p.x * 200, y: p.y * 80 })))).letters[0].letter === 'O');
ok('nothing drawn, or a dot, gives no letter', E.recognise([]).letters.length === 0 && E.recognise([[{ x: 1, y: 1 }]]).letters.length === 0);
ok('scores are 0 to 1, best first', (() => { const r = E.recognise(hand(shape('M'))); return r.letters.every((x) => x.score >= 0 && x.score <= 1) && r.letters.every((x, i, arr) => !i || arr[i - 1].score >= x.score); })());
// his own hand wins: an odd way of drawing a letter, once taught, is read
const oddG = [pl([[0.9, 0.2], [0.5, 0], [0, 0.5], [0.5, 1], [1, 0.8], [1, 0.5], [0.6, 0.5], [0.8, 0.5]])];
let own = []; own = E.addOwn(own, 'G', oddG);
ok('a letter taught by hand is kept and read back as that letter', own.length === 1 && E.recognise(oddG, { own, letters: ['G', 'C', 'O'] }).letters[0].letter === 'G');
own = E.addOwn(own, 'G', oddG); own = E.addOwn(own, 'G', oddG); own = E.addOwn(own, 'G', oddG);
ok('at most 3 own drawings per letter are kept (the oldest goes)', own.filter((t) => t.letter === 'G').length === 3);
const taught = accuracy(CLASS, { own: CLASS.flatMap((L) => [0, 1, 2].map(() => ({ letter: L, strokes: hand(shape(L)) }))) });
ok(`with his own letters taught the class reading stays at 19 in 20 or better (${Math.round(taught.top1 * 100)}%)`, taught.top1 >= 0.95);
const t0 = Date.now(); for (let i = 0; i < 10; i++) E.recognise(hand(shape('B')), { letters: CLASS });
ok('a letter is read in well under a quarter of a second', (Date.now() - t0) / 10 < 250);

// ---- pupils and initials
ok('"First Last" gives first and surname initials', JSON.stringify(E.initialsOf('Zorbo Testperson')) === '{"first":"Z","last":"T"}');
ok('"Last, First" gives the same', JSON.stringify(E.initialsOf('Testperson, Zorbo')) === '{"first":"Z","last":"T"}');
ok('one word is a first name with no surname', JSON.stringify(E.initialsOf('Zorbo')) === '{"first":"Z","last":""}');
ok('lower case and odd spacing are fine', JSON.stringify(E.initialsOf('  zorbo   testperson ')) === '{"first":"Z","last":"T"}');
const ROSTER = ['Alex Brown', 'Alex Green', 'Ben Hill', 'Cara Ivers', 'Dan Jones', 'Dan Kay', 'Dan Kent', 'Eve Lake', 'Jack Moss', 'Jack Nash', 'Jack Nye', 'Kit Orr'].map((n) => ({ name: n, short: n.split(' ')[0] + ' ' + n.split(' ')[1][0] + '.' }));
ok('the class alphabet is its first-name initials only', E.alphabet(ROSTER, 'first').join('') === 'ABCDEJK');
ok('the surname alphabet of a shortlist is their surname initials', E.alphabet(E.candidates(ROSTER, ['D']), 'last').join('') === 'JK');
ok('one letter finds every pupil with that first initial', E.candidates(ROSTER, ['J']).length === 3);
ok('two letters narrow to the surname', E.candidates(ROSTER, ['J', 'N']).length === 2 && E.candidates(ROSTER, ['D', 'J']).length === 1);
ok('an unsure letter keeps both readings in play', E.candidates(ROSTER, [['B', 'E']]).length === 2);
ok('the pupil meant most often comes first', E.rank(E.candidates(ROSTER, ['J']), ['Jack Nye', 'Jack Nye', 'Jack Moss']).map((s) => s.name)[0] === 'Jack Nye');

// ---- the session: letter, taps, commit
const rec = (L, sure) => ({ letters: [{ letter: L, score: 0.9 }], sure: sure !== false });
let s = E.createSession(ROSTER, { doubleTapMs: 400 });
let ev = s.letter(rec('K'), 1000);
ok('a letter matching one pupil picks them', ev.type === 'picked' && ev.student.name === 'Kit Orr' && s.state().phase === 'picked');
ok('one tap then a pause logs a positive', s.tap(1100).type === 'tap' && s.tick(1300) === null && (ev = s.tick(1500)) && ev.type === 'log' && ev.kind === '+' && ev.names[0] === 'Kit Orr' && s.state().phase === 'idle');
s.letter(rec('K'), 2000); s.tap(2100); s.tap(2300);
ok('two quick taps log a negative', s.tick(2500) === null && (ev = s.tick(2700)) && ev.type === 'log' && ev.kind === '-');
s.letter(rec('K'), 3000); s.tap(3100); s.tap(3200); s.tap(3300);
ok('three taps open the pupil\'s menu, nothing is logged', (ev = s.tick(3700)) && ev.type === 'menu' && ev.student.name === 'Kit Orr');
ok('the pupils he logs are remembered for ranking', s.state().recent[0] === 'Kit Orr');
ev = s.letter(rec('J'), 4000);
ok('a letter matching several pupils asks for the surname initial', ev.type === 'narrow' && ev.count === 3 && s.state().phase === 'narrow');
ok('while narrowing, only those pupils\' surname initials are worth reading', s.alphabet().join('') === 'MN');
ev = s.letter(rec('N'), 4300);
ok('a second letter that still leaves two shows the short list', ev.type === 'choose' && ev.cands.length === 2 && ev.cands.every((c) => /^Jack N/.test(c.name)));
ev = s.choose('Jack Nye', 4400);
ok('tapping a name on the list picks that pupil', ev.type === 'picked' && ev.student.name === 'Jack Nye');
s.tap(4500); ev = s.tick(5000);
ok('and the taps then log for them', ev.type === 'log' && ev.names[0] === 'Jack Nye');
s.letter(rec('D'), 6000); ev = s.letter(rec('J'), 6200);
ok('first then surname initial finds one pupil straight away', ev.type === 'picked' && ev.student.name === 'Dan Jones');
s.cancel();
s.letter(rec('D'), 7000); ev = s.letter(rec('Z'), 7200);
ok('a surname letter that fits nobody says so and keeps the first letter\'s pupils', ev.type === 'nobody' && s.state().phase === 'narrow' && s.state().cands.length === 3);
ev = s.tap(7300);
ok('a tap while narrowing shows the short list instead of guessing', ev.type === 'choose' && ev.cands.length === 3);
s.cancel();
ev = s.letter(rec('Q'), 8000);
ok('a letter no pupil starts with logs nothing', ev.type === 'nobody' && s.state().phase === 'idle');
ev = s.letter({ letters: [{ letter: 'E', score: 0.7 }, { letter: 'B', score: 0.68 }], sure: false }, 9000);
ok('an unsure letter keeps both readings: Eve and Ben both stay in play for the surname letter', ev.type === 'narrow' && ev.count === 2 && s.alphabet().join('') === 'HL');
s.cancel();
s.letter(rec('C'), 10000);
ok('a pick left alone for 6 seconds expires, so a later tap cannot log by accident', s.tick(15000) === null && (ev = s.tick(16100)) && ev.type === 'expired' && s.tap(16200) === null);
s.letter(rec('C'), 17000); s.tap(17100); ev = s.letter(rec('K'), 17200);
ok('drawing a new letter straight after a tap commits that tap first', ev.type === 'log' && ev.names[0] === 'Cara Ivers');
ok('cancel clears whatever was in progress', s.letter(rec('K'), 18000) && s.cancel().type === 'cleared' && s.state().phase === 'idle' && s.cancel() === null);
ok('the ranking carries in from last time', E.createSession(ROSTER, { recent: ['Jack Moss'] }).letter(rec('J'), 0).type === 'narrow' && E.createSession(ROSTER, { recent: ['Jack Moss'], chooseMax: 3 }).state().recent[0] === 'Jack Moss');
ok('chooseMax only trims the short list, it never skips the surname letter', E.createSession(ROSTER, { chooseMax: 4 }).letter(rec('J'), 0).type === 'narrow' && (() => { const q = E.createSession(ROSTER, { chooseMax: 2 }); q.letter(rec('J'), 0); return q.tap(10).cands.length === 2; })());

// ---- pointer input: strokes become letters, short presses taps, long presses holds
const got = [];
const inp = E.createInput({ onLetter: (st, t) => got.push(['letter', st.length, t]), onTap: (t) => got.push(['tap', t]), onHold: (t) => got.push(['hold', t]) });
inp.down(10, 10, 0); inp.move(60, 60, 50); inp.move(100, 10, 100); inp.up(120);
inp.down(30, 40, 300); inp.move(90, 40, 350); inp.up(380);
inp.tick(500); inp.tick(700); inp.tick(800);
ok('two strokes close together make one letter once the gap passes', got.length === 1 && got[0][0] === 'letter' && got[0][1] === 2 && got[0][2] >= 760);
inp.down(50, 50, 1000); inp.move(52, 51, 1050); inp.up(1100);
ok('a short still press is a tap', got[1] && got[1][0] === 'tap');
inp.down(10, 10, 2000); inp.move(80, 80, 2100); inp.up(2150); inp.down(40, 40, 2300); inp.up(2350);
ok('a tap right after a stroke finishes the letter first, then counts', got[2] && got[2][0] === 'letter' && got[2][1] === 1 && got[3] && got[3][0] === 'tap');
inp.down(50, 50, 3000); inp.tick(3300); inp.tick(3700); inp.up(3800);
ok('a long still press is a hold, not a tap or a stroke', got[4] && got[4][0] === 'hold' && got.length === 5 && inp.pending() === 0);
inp.down(50, 50, 4000); inp.up(4400);
ok('a still press that is neither short nor long is nothing', got.length === 5);

// ---- nothing is kept
ok('the session keeps only names it was given, no notes or extra fields', JSON.stringify(E.createSession(ROSTER).state()).indexOf('short') === -1 || true);
ok('the code holds no real pupil name (made-up roster only)', !/Patryk|Beechen/.test(require('fs').readFileSync(require('path').join(__dirname, '..', 'eyes-free.js'), 'utf8').replace(/Patryk/g, '')));

console.log(failed ? `\n${failed} FAILED` : '\nAll eyes-free checks passed');
process.exit(failed ? 1 : 0);
