/* Ulhu: the other side of an omen (Patryk 2026-10-28 night).
   Every curse should have a matching blessing and every blessing a curse. This file holds the built-in list of
   opposites, a word matcher that finds the other side for an omen's name, a finder for his own omens that could be
   its other side (or a duplicate of it), and the pairing sheet. game-ui.js does the tapping and the saving. */
(function (root) {
  'use strict';
  // each line: curse names ; ... = blessing names ; ...   (the first name on each side is the one suggested)
  const LIST = [
    'Doomscrolling in bed;Phone in bed;Scrolled in bed = Read before sleep;Phone out of the bedroom;Read a book in bed',
    'Binge-watching Netflix;Binged a series;Binge-watching = One episode, then stop;Screen off by 10',
    'Junk or takeaway;Takeaway;Ordered a takeaway;Junk food = Cooked at home;Eating healthy;Cooked from scratch',
    'Up past midnight;Stayed up late;Late night = In bed by 10:30;Sleep 7.5 hrs +;Slept 7.5 hours',
    'Skipped training;Skipped the gym;Skipped exercise = Trained;Went to the gym;Exercised',
    'Worked after 7 pm;Marked in the evening = Stopped work by 7;Evening off',
    'Stayed at school past 6 = Left school by 5;Home on time',
    'Energy drink;Too much coffee = Drank water;Refilled the water bottle',
    'Snapped at someone;Lost my temper;Shouted = Stayed patient;Stayed calm',
    'Skipped lunch = Ate a proper lunch;Ate lunch',
    'Hitting snooze;Hit snooze;Snoozed the alarm;Overslept = Woke up early;Wake up early;Up with the alarm',
    'Left dirty dishes;Leaving dirty dishes;Dishes piled up = Tidied;Washed up;Did the dishes;Tidied the kitchen',
    'Ignored messages for days;Ignoring messages;Left messages unanswered = Called a friend;Call friends;Replied to messages',
    'Over agreeable;Said yes to everything;People pleasing = Said no kindly;Held a boundary',
    'Overspending;Impulse buy;Spent too much = No-spend day;Stuck to the budget',
    'Lying;Told a lie = Told the truth when it was hard;Was honest',
    'Skipped teeth at night;Skipped brushing;Skipped flossing = Brushed teeth;Brush teeth;Floss;Flossing',
    'Wasted the day;Lost the day = Proud of the day;Proud of day',
    'Left the bed unmade;Unmade bed = Made the bed;Making bed',
    'Skipped a shower = Showered;Took a shower',
    'Forgot to call home;Did not call family = Called family;Call family;Call grandma',
    'Mindless scrolling;Scrolled instead of thinking = Wordle;Did a puzzle',
    'Skipped breakfast = Ate breakfast',
    'Sugary snacks;Biscuits in the staffroom;Sweets = Ate fruit;Healthy snack',
    'Drank on a school night;Alcohol on a school night = Alcohol-free night;Dry night',
    'Skipped stretching = Stretched',
    'Sat all day;No steps = Went for a walk;10k steps',
    'Phone at dinner = Phone-free dinner',
    'Checked email at home;Emails after hours = Email closed after work',
    'Procrastinated;Put it off = Did the hard task first;Started straight away',
    'Moaned in the staffroom;Complained = Said thank you;Wrote a gratitude note',
    'Skipped meditation = Meditated;Breathing exercise',
    'Phone first thing;Social media first thing = Phone-free morning',
    'Rushed in late;Late to lesson = Arrived early;Set up before the bell',
    'Planned the night before;Left planning to the last minute = Planned ahead;Planned a week ahead',
    'Skipped reading;No reading = Read for 20 minutes;Read',
    'Messy desk;Desk piled up = Cleared the desk;Tidied the desk',
    'Laundry piled up = Did the laundry',
    'Coffee after 2 pm;Caffeine after 2 = Caffeine-free afternoon',
    'Lunch at the desk;Ate at the desk = Lunch away from the desk',
    'Cancelled on a friend;Cancelled plans = Kept plans with a friend;Saw a friend',
    'Skipped writing = Wrote;Wrote 200 words;Journaled',
    'Gossiped = Spoke well of others',
    'Brought marking home = Marked at school',
    'Drove when I could walk = Walked to school;Cycled to school',
    'Long nap;Napped too long = Short rest;Power nap',
    'Beat myself up;Self-criticism = Kind to myself;Self-compassion',
    'Skipped vegetables = Ate vegetables;Five a day',
  ].map((l) => l.split(' = ').map((s) => s.split(';')));

  // words: lower case, common little words dropped, simple endings trimmed so Flossing = Floss and Left = Leaving
  const STOP = { the: 1, a: 1, an: 1, to: 1, of: 1, for: 1, in: 1, on: 1, at: 1, my: 1, i: 1, and: 1, or: 1, with: 1, up: 1, it: 1, is: 1, was: 1, then: 1, by: 1, x: 1 };
  const SAME = { woke: 'wake', slept: 'sleep', made: 'make', ate: 'eat', did: 'do', went: 'go', told: 'tell', said: 'say', left: 'leave', kept: 'keep', spent: 'spend', brought: 'bring', hrs: 'hour', hr: 'hour', rang: 'call', teeth: 'tooth', didn: 'not', dont: 'not', don: 'not' };
  function stem(w) {
    w = SAME[w] || w;
    if (/ies$/.test(w) && w.length > 4) w = w.slice(0, -3) + 'y';
    else if (/ied$/.test(w) && w.length > 4) w = w.slice(0, -3) + 'y';
    else if (/ing$/.test(w) && w.length > 5) w = w.slice(0, -3);
    else if (/ed$/.test(w) && w.length > 4) w = w.slice(0, -2);
    else if (/[^s]s$/.test(w) && w.length > 3) w = w.slice(0, -1);
    if (/([b-df-hj-km-np-rtv-z])\1$/.test(w) && w.length > 3) w = w.slice(0, -1);   // hitt -> hit (not ss or ll)
    if (/e$/.test(w) && w.length > 3) w = w.slice(0, -1);
    return SAME[w] || w;
  }
  const words = (s) => String(s || '').toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter((w) => w && !STOP[w]).map(stem);
  // how alike two names are, 0 to 1 (shared words over the words in both)
  function sim(a, b) {
    const A = Array.from(new Set(words(a))), B = new Set(words(b)); if (!A.length || !B.size) return 0;
    const n = A.filter((w) => B.has(w)).length; return (2 * n) / (A.length + B.size);
  }
  const best = (name, alts) => Math.max.apply(null, alts.map((x) => sim(name, x)));
  const sideOf = (g) => (g.polarity === 'minus' ? 0 : 1);
  const lc = (s) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
  // when nothing in the list matches: a gentle wording of the opposite
  const generic = (name, pol) => (pol === 'minus' ? ['Resisted ' + lc(name), "Didn't " + lc(name)] : ['Skipped ' + lc(name), 'Missed ' + lc(name)]);
  // the list lines that match a name on its own side, best first
  function hits(name, side) { return LIST.map((p) => ({ p, s: best(name, p[side]) })).filter((x) => x.s > 0.5).sort((a, b) => b.s - a.s); }
  // names for the other side of an omen: the best match first, then alternatives (up to 3); a gentle generic wording when nothing matches
  function suggest(g) {
    const side = sideOf(g), out = [];
    hits(g.name, side).forEach((h) => h.p[1 - side].forEach((x) => { if (out.length < 3 && !out.some((y) => sim(x, y) > 0.99) && sim(x, g.name) < 0.99) out.push(x); }));
    if (!out.length) generic(g.name, g.polarity).forEach((x) => out.push(x));
    return out;
  }
  // his own one-sided omens on the other side, the likeliest partner first; score 0 means no match was found
  function rank(g, goals) {
    const side = sideOf(g), sugs = suggest(g).slice(0, 3), hs = hits(g.name, side);
    return goals.filter((c) => c.id !== g.id && c.kind === 'habit' && c.polarity === (side ? 'minus' : 'plus')).map((c) => {
      let s = 0; hs.forEach((h) => { s = Math.max(s, h.s * best(c.name, h.p[1 - side])); });
      sugs.forEach((x) => { s = Math.max(s, 0.9 * sim(c.name, x)); });
      return { g: c, s: s >= 0.5 ? s : 0 };
    }).sort((a, b) => b.s - a.s || a.g.name.localeCompare(b.g.name));
  }
  // another omen on the same side with (nearly) the same name: Brush Teeth twice, Floss and Flossing
  function dupes(g, goals) {
    const key = words(g.name).sort().join(' ');
    return goals.filter((c) => c.id !== g.id && c.kind === 'habit' && c.polarity === g.polarity && key && words(c.name).sort().join(' ') === key);
  }
  // one-sided omens still waiting for their other side (curses first, A to Z)
  const lonely = (goals) => goals.filter((g) => g.kind === 'habit' && (g.polarity === 'minus' || g.polarity === 'plus') && !g.absolve)
    .sort((a, b) => (a.polarity === b.polarity ? a.name.localeCompare(b.name) : a.polarity === 'minus' ? -1 : 1));

  /* ---------- the pairing sheet (in place of the list, like the forms) ----------
     o: { g, txt, withId, all, walk: { i, n } | null, goals, esc, card(side, key), keyOf(goal) } */
  function sheet(o) {
    const e = o.esc, g = o.g, cu = g.polarity === 'minus', cands = rank(g, o.goals), dup = dupes(g, o.goals)[0];
    const near = cands.filter((x) => x.s > 0), shown = o.all || !near.length ? cands : near.slice(0, 4);
    const chip = (lbl, on, a, v, side, key) => '<button class="pz-c' + (on ? ' on' : '') + '" data-a="' + a + '" data-v="' + e(v) + '">' + (key ? '<img src="' + o.card(side, key) + '" alt="">' : '') + '<span>' + e(lbl) + '</span></button>';
    const os = cu ? 'b' : 'c';
    let h = '<div class="uz-form pz">' +
      '<div class="pz-hd"><span class="pz-t">Its other side</span>' + (o.walk ? '<span class="pz-n">' + (o.walk.i + 1) + ' of ' + o.walk.n + '</span>' : '') + '<button data-a="pclose" class="pz-x" aria-label="Close">×</button></div>' +
      '<div class="pz-om ' + (cu ? 'cu' : 'bl') + '"><img src="' + o.card(cu ? 'c' : 'b', o.keyOf(g)) + '" alt=""><span><small>' + (cu ? 'CURSE' : 'BLESSING') + '</small>' + e(g.name) + '</span></div>';
    if (dup) h += '<div class="pz-dup"><span>Looks like a duplicate of “' + e(dup.name) + '”. Merge them?</span><button data-a="pdup" data-id="' + g.id + '" data-v="' + dup.id + '">Merge</button></div>';
    if (cands.length) h += '<span class="uz-lbl">PAIR WITH ONE OF YOUR ' + (cu ? 'BLESSINGS' : 'CURSES') + '</span><div class="pz-cs">' +
      shown.map((x) => chip(x.g.name, o.withId === x.g.id, 'pwith', x.g.id, os, o.keyOf(x.g))).join('') +
      (shown.length < cands.length ? '<button class="pz-c pz-more" data-a="pall">Show all ' + cands.length + '</button>' : '') + '</div>';
    h += '<span class="uz-lbl">' + (cands.length ? 'OR NAME A NEW ' : 'NAME ITS ') + (cu ? 'BLESSING' : 'CURSE') + '</span>' +
      '<input data-ptxt="1" value="' + e(o.withId ? '' : o.txt) + '" placeholder="' + e(suggest(g)[0]) + '">' +
      '<div class="pz-cs">' + suggest(g).map((x) => chip(x, !o.withId && o.txt === x, 'psug', x)).join('') + '</div>' +
      '<p class="pz-p">Joined, it becomes one two-sided omen under Both Ways. Its count and history stay' + (o.withId ? ', and both cards’ histories join' : '') + '.</p>' +
      '<div style="flex:1"></div><button class="uz-go pz-go" data-a="pgo">Join them</button>' +
      (o.walk ? '<button class="pz-skip" data-a="pskip">Skip this one</button>' : '') + '</div>';
    return h;
  }
  // the edit form's extra rows for an omen: split a two-sided one back to one side, or merge a duplicate
  function formRows(d, g, goals, e) {
    let h = '';
    if (g && g.polarity === 'both' && d.type === 'both') h += '<div style="display:flex;flex-direction:column;gap:5px"><span class="uz-lbl">SPLIT INTO ONE SIDE · WHICH SIDE STAYS?</span><div class="uz-chips">' +
      '<button data-a="psplit" data-v="c" style="color:#ffb3a8;border-color:#4a2a2e">Keep the curse: ' + e(d.name) + '</button><button data-a="psplit" data-v="b" style="color:#c4e0ff;border-color:#1f4266">Keep the blessing: ' + e(d.name2 || d.name) + '</button></div></div>';
    const dup = g && g.polarity !== 'both' ? dupes(g, goals)[0] : null;
    if (dup) h += '<div class="pz-dup"><span>Looks like a duplicate of “' + e(dup.name) + '”. Merge them?</span><button data-a="pdup" data-id="' + g.id + '" data-v="' + dup.id + '">Merge</button></div>';
    return h;
  }
  const CSS = '.pz{gap:10px;padding-bottom:24px;background:radial-gradient(120% 60% at 50% 0%,#1d1430,#0d0a14 70%)}' +
    '.pz-hd{display:flex;align-items:center;gap:10px}.pz-t{flex:1;font:500 23px var(--g);color:#e0c8ff;text-shadow:0 0 10px rgba(190,140,255,.45)}.pz-n{font:700 13px var(--a);color:#a991c8}' +
    '.pz-x{width:44px;height:44px;border:none;background:none;color:#a991c8;font:22px var(--a)}' +
    '.pz-om{display:flex;align-items:center;gap:10px;padding:10px;border-radius:6px;border:1.5px solid #4a1c22;background:linear-gradient(180deg,#2a1216,#170a0c)}.pz-om.bl{border-color:#1f4266;background:linear-gradient(180deg,#10233a,#0b1626)}' +
    '.pz-om img{width:44px;height:44px;image-rendering:pixelated;border-radius:4px}.pz-om span{display:flex;flex-direction:column;font:700 16px/1.2 var(--a);color:#f0e0d8}.pz-om small{font:700 13px var(--a);letter-spacing:.12em;color:#ff7a66}.pz-om.bl small{color:#9fc8ff}' +
    '.pz .uz-lbl{font-size:13px;color:#a991c8}.pz-cs{display:flex;flex-wrap:wrap;gap:6px}.pz-c{min-height:44px;display:flex;align-items:center;gap:6px;padding:0 12px;border-radius:5px;border:1.5px solid #3a2a4e;background:#16101f;color:#d8cce6;font:700 14px var(--a);text-align:left}' +
    '.pz-c img{height:24px;image-rendering:pixelated}.pz-c.on{border-color:#c8a8ff;background:#2a1d40;color:#f0e4ff;box-shadow:0 0 10px rgba(190,140,255,.35)}.pz-more{color:#a991c8;border-style:dashed}' +
    '.pz input{height:46px;padding:0 12px;border-radius:5px;border:1.5px solid #3a2a4e;background:#120d1a;color:#f0e4ff;font:700 16px var(--a)}' +
    '.pz-p{margin:0;font:13px/1.4 var(--a);color:#a991c8}.pz-go{background:#c8a8ff;color:#1a1026;text-shadow:none}' +
    '.pz-skip{height:44px;border-radius:5px;border:1.5px solid #3a2a4e;background:none;color:#a991c8;font:700 14px var(--a)}' +
    '.pz-dup{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 10px;border-radius:5px;border:1px dashed #4a3a5e;font:13px/1.35 var(--a);color:#b8a8cc}.pz-dup span{flex:1}' +
    '.pz-dup button{min-width:72px;min-height:44px;border-radius:5px;border:1.5px solid #5a4a7e;background:#1e1530;color:#e0c8ff;font:700 13px var(--a)}' +
    '.pz-pair{position:absolute;top:0;right:0;width:44px;height:44px;display:flex;align-items:flex-start;justify-content:flex-end;padding:4px;z-index:2}' +
    '.pz-pair i{font:700 13px/1 var(--a);font-style:normal;letter-spacing:.04em;padding:3px 5px;border-radius:3px;border:1px solid #5a4a7e;background:rgba(20,12,32,.88);color:#d8c4f4}' +
    '.pz-all{min-height:44px;padding:0 14px;border-radius:5px;border:1.5px solid #3a2a4e;background:linear-gradient(180deg,#1d1430,#120d1a);color:#e0c8ff;font:700 13px var(--a)}';
  root.PAIRS = { LIST, words, sim, suggest, rank, dupes, lonely, generic, sheet, formRows, CSS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PAIRS;
})(typeof window !== 'undefined' ? window : globalThis);
