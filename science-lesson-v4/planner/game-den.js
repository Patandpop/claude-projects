/* ============================================================================
   game-den.js: the Den (Patryk 2026-10-28, picks S2 Round Grotto, Walk + TR3c, DL1 + R3).
   The Round Grotto is his Sanctum: placed items (tap a ring to place or swap), the wardrobe (cloaks) and sealed
   chests (the Hoard). An archway leads to the Night Market: one stall per keeper, each with its own wares, look
   and voice, and a game of Swindlestones (after Sorcery! 2 by inkle; our own art and words) once a day per keeper.
   Win: 20% off at that stall today. Lose (or walk out): 10% more there today. The server keeps the result.
   game-ui.js calls UZDEN.render / after / dock / click; everything here is drawn in code, nothing on Drive.
   ============================================================================ */
(function (root) {
  'use strict';
  const W = 192, H = 216;
  let RM = false;
  try { const mq = root.matchMedia('(prefers-reduced-motion: reduce)'); RM = mq.matches; if (mq.addEventListener) mq.addEventListener('change', (e) => { RM = e.matches; }); } catch (e) { /* no media queries */ }
  const mk = (w, h, pal, f, o) => root.PX.make(w, h, pal, f, o);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const IMGC = {};
  function img(src, then) { let im = IMGC[src]; if (!im) { im = IMGC[src] = new Image(); im.onload = () => { (im.waits || []).forEach((f) => f()); im.waits = null; }; im.waits = []; im.src = src; } if (!im.complete && then && im.waits) im.waits.push(then); return im; }

  /* ---------------- the keepers: who they are, what they sell, how they talk ----------------
     Runes are his trapped will; the deep folk owe the Old Ones a tithe and cannot pay it alone, so they all want his. */
  const KEEPERS = [
    { id: 'weaver', name: 'Mother Skein', what: 'the crab weaver', trade: 'Floors and rugs', cats: ['floors', 'rugs'], col: '#e0906a', lamp: '255,186,120',
      L: { arrive: ['Mind the threads, dear. Such a strong will on you. I can smell it from here.', 'Back to me and not that glass bully? Clever thing.', 'Sit. Not on the yarn. My favourite will in all the deep.'],
        haggle: ['Bones? I knit while I bargain, dear, and I never drop a stitch.', 'One game. If you win, I unravel my prices. If I win, I knit them tighter.'],
        claim: ['{c}, dear. Count them twice.', 'Mm. {c}. My needles say so.', '{c}. Click-click.'], call: ['Liar, dear. Your stitches are crooked.', 'Oh, I think not. Show me.'],
        win: ['Unravelled. By a squid. Twenty off, then, and not a thread more.', 'You cheat beautifully. Twenty off, for today.'], lose: ['Knit one, purl one, win one. Ten more today, dear.', 'There. Tighter prices. Do come back tomorrow.'],
        done: ['One game a day, dear. My claws are old.', 'Tomorrow. The needles need their rest.'], buy: ['Click-click. A warm floor for you, and a little will for my tithe.', 'Bless you, dear. The Old Ones will hear my name tonight.'], poor: 'Not enough will in you today, dear. Go and do your little tasks.' } },
    { id: 'painter', name: 'Maestro Murex', what: 'the octopus fresco painter', trade: 'Walls', cats: ['wallpapers'], col: '#b48ae0', lamp: '220,170,255',
      L: { arrive: ['Do not touch the walls! Wet ink. Oh, but your will, it glows.', 'You came to me before the gull? Sublime.', 'My muse! Eight arms, all trembling for you.'],
        haggle: ['Dice? I paint with eight arms. I can roll with eight.', 'A wager, darling. Art is nothing without risk.'],
        claim: ['{c}. Bold strokes.', '{c}, and I sign it.', 'Let us say {c}. A masterpiece.'], call: ['Liar! A forgery!', 'I know a fake when I see one. Lift it.'],
        win: ['Ruined. Twenty off, and I shall paint my grief.', 'You have the eye of a critic. Twenty off. Today only.'], lose: ['Bravo, me! Ten more today, darling. Art costs.', 'The house wins. The house is me.'],
        done: ['Once a day, darling. The muse tires.', 'Come back tomorrow. My ink is drying.'], buy: ['Ink well spent! The well drinks, I paint.', 'A masterpiece goes home with a monster.'], poor: 'Art costs will, darling. Come back fuller.' } },
    { id: 'glass', name: 'Lanthorn', what: 'the anglerfish glassblower', trade: 'Windows and lights', cats: ['windows', 'lights'], col: '#ffb060', lamp: '255,170,80',
      L: { arrive: ['Stand back from the forge. That will of yours burns hotter than my lure.', 'Hm. You. The weaver sells fluff. Glass lasts.', 'Friend. I saved the clearest glass for you.'],
        haggle: ['Bones by the forge light. Lose and I melt your discount down.', 'One throw. I see in the dark, you know.'],
        claim: ['{c}.', '{c}. Clear as glass.', '{c}. Hot and certain.'], call: ['Cracked. Liar.', 'That claim has a flaw in it. Lift.'],
        win: ['Shattered. Twenty off, today. Do not gloat near the furnace.', 'You read me like glass. Twenty off.'], lose: ['Tempered and true. Ten more today.', 'The lure never lies. You do. Ten more.'],
        done: ['One game. The furnace needs me.', 'Tomorrow. The glass is cooling.'], buy: ['Hot glass for cold runes. The tithe thanks you.', 'Mind it, still warm.'], poor: 'Your will runs thin. Glass will not blow itself.' } },
    { id: 'carpenter', name: 'Old Keelson', what: 'the hermit-crab carpenter', trade: 'Seats and tables', cats: ['seats', 'tables'], col: '#d09060', lamp: '255,200,140',
      L: { arrive: ['Hull is open. Mind the mast. Your will is worth more than my wood.', 'You. The one with will to spare. Sit.', 'Pull up a seat. I made it for you.'],
        haggle: ['Dice on the workbench? Fair enough. Measure twice, roll once.', 'One game, shipmate. Winner sets the price.'],
        claim: ['{c}. Square and level.', '{c}. Plumb.', 'I say {c}.'], call: ['Warped. Liar.', 'That joint will not hold. Show me.'],
        win: ['Sawn clean through. Twenty off, today.', 'Well built, that bluff. Twenty off.'], lose: ['Sound timber, my claim. Ten more today.', 'Nailed it. Ten more, shipmate.'],
        done: ['One game a tide. Back tomorrow.', 'The bench is shut for dice. Tomorrow.'], buy: ['Built to last. Longer than my debt, anyway.', 'Good wood for good will.'], poor: 'Wood is cheap. Will is not. Come back richer.' } },
    { id: 'curio', name: 'Squall', what: 'the gull curio collector', trade: 'Corners and props', cats: ['corner', 'props'], col: '#cfd8e0', lamp: '220,240,255',
      L: { arrive: ['Mine! Oh. You are buying. Your will smells shiny.', 'Shiny one! Ignore the painter, my trinkets are realer.', 'My best one! Kraa!'],
        haggle: ['Kraa! A game! I win shiny things at games.', 'Bones! I collect bones. Play for my prices.'],
        claim: ['{c}! Kraa!', '{c}. Shiny claim.', 'Kraa. {c}.'], call: ['Liar! Kraa! Liar!', 'Fake trinket! Lift it!'],
        win: ['Kraa... twenty off. My hoard weeps.', 'Robbed! By a squid! Twenty off.'], lose: ['Kraa! Mine! Ten more today!', 'I win the shiny prize. Ten more.'],
        done: ['Kraa. One game. Tomorrow, shiny one.', 'No more bones today. Mine.'], buy: ['Kraa! Runes! Lovely burning runes!', 'Another trinket flies the nest.'], poor: 'Kraa! Empty pockets! Fill them and fly back.' } },
    { id: 'gullet', name: 'Gullet', what: 'the fishmonger', trade: 'Hangings from the catch', cats: ['wall'], col: '#e0c040', lamp: '255,200,110',
      L: { arrive: ['My dear drowned friend! Fresh off the hooks. Barely haunted.', 'The others flatter you. I beg. It is more honest.', 'You came back! Sit, sit, before the weaver sees.'],
        haggle: ['Ahh, my dear drowned friend. Shall we let the bones decide the price?', 'One game. My tithe is SO overdue.'],
        claim: ['{c}. Fresh as the catch.', '{c}, my friend. Trust me.', 'Ohh, {c}. At least.'], call: ['Liar! Ha! Lift the cup!', 'Smells off, that one. Like old cod. Liar!'],
        win: ['Gutted. Twenty off, today. I shall cry into my eels.', 'You fleeced the fishmonger. Twenty off.'], lose: ['Ha! Ten more today, my dear friend. Ten more!', 'The bones love Gullet. Ten more.'],
        done: ['One game, one day. Even I have rules. Some.', 'Tomorrow, friend. The bones are sulking.'], buy: ['Wrapped in yesterday\'s news. Well, last century\'s.', 'Lovely. The well will hear of me.'], poor: 'No will left on you? Tragic. Go and earn some.' } },
    { id: 'tailor', name: 'Madame Moray', what: 'the eel tailor', trade: 'Clothes for Ulhu', cats: ['wear'], col: '#9ad070', lamp: '200,255,230',
      L: { arrive: ['Mmf. Pins in my mouth, darling. Such a will. Arms out.', 'Darling, the others dress you like a mop. I dress you like a god.', 'My muse returns. I saved the silk for you.'],
        haggle: ['Dice, darling? I cut cloth on the bias. I cut odds the same way.', 'One game. Win, and I take my prices in.'],
        claim: ['{c}, darling.', '{c}. Measured.', '{c}. Cut to fit.'], call: ['Liar. The seam shows.', 'That hem is crooked, darling. Lift.'],
        win: ['Unpicked. Twenty off, darling. Today.', 'Such cheek. Twenty off.'], lose: ['Fitted. Ten more today, darling.', 'Tailored to me. Ten more.'],
        done: ['One fitting a day, darling.', 'Tomorrow. My pins are tired.'], buy: ['It fits like a curse, darling.', 'Divine. Ulhu will sulk for a week.'], poor: 'Silk costs will, darling. Come back with more.' } }
  ];
  const KB = {}; KEEPERS.forEach((k) => { KB[k.id] = k; });
  const keeperOfCat = (c) => KEEPERS.find((k) => k.cats.indexOf(c) >= 0);
  const ULS = ['A tenth. They send a TENTH down the well. I licensed them!', 'I carved those licences myself. Do I get thanks? No.', 'Spend, spend. Your will, my market, their tithe. Hmph.'];
  const WHISPER = { start: ['Count yours, guess half of theirs. Old trick.', 'They never see your dice. Remember that.'], good: ['Ha! Another die gone.', 'Again. Do it again.'], bad: ['I will remember that face. For eons.', 'Careful. We are bleeding dice.'] };

  /* ---------------- Swindlestones: the rules and the keeper's brain (pure, no page) ----------------
     Faces: 0 Eye (wild), 1 Tentacle, 2 Moon, 3 Star. A claim says "at least n of a face" across both hands;
     each claim must go higher (more dice, or the same number of a higher face). Liar! lifts the cups; whoever
     was wrong loses a die. Lose every die and you lose. Five dice each. */
  const FACES = ['Eye', 'Tentacle', 'Moon', 'Star'], TIERS = ['Basic', 'Nice', 'Fancy', 'Eldritch'];
  const DICE = {
    roll: (n) => { const a = []; for (let i = 0; i < n; i++) a.push(Math.floor(Math.random() * 4)); return a; },
    count: (d, f) => d.filter((x) => x === f || x === 0).length,
    rank: (c) => (c ? c.n * 4 + c.f : 0),
    legal(c, prev, tot) { return c.n >= 1 && c.n <= tot && c.f >= 1 && c.f <= 3 && (!prev || DICE.rank(c) > DICE.rank(prev)); },
    raises(prev, tot) { const o = []; for (let n = 1; n <= tot; n++) for (let f = 1; f <= 3; f++) if (DICE.legal({ n, f }, prev, tot)) o.push({ n, f }); return o; },
    atLeast(n, q, need) { if (need <= 0) return 1; if (need > n) return 0; let p = 0; for (let k = need; k <= n; k++) { let c = 1; for (let i = 1; i <= k; i++) c = c * (n - k + i) / i; p += c * Math.pow(q, k) * Math.pow(1 - q, n - k); } return p; },
    smarts: (level, tier) => Math.max(0, Math.min(1, 0.08 + Math.min(level, 30) / 30 * 0.6 + Math.max(0, TIERS.indexOf(tier)) * 0.11)),
    label: (s) => (s < 0.3 ? 'Easy' : s < 0.55 ? 'Fair' : s < 0.8 ? 'Sharp' : 'Hard'),
    // the keeper sees only his own dice; mem = what you have named, and how honest you have been
    think(s, mine, opp, prev, mem) {
      const tot = mine.length + opp, noise = 0.22 + 0.3 * (1 - s) * (1 - s), useMem = s > 0.45;
      const q = (f) => Math.min(0.85, 0.5 + (useMem && mem.named[f] ? 0.14 * mem.trust * Math.min(1, (s - 0.3) * 1.6) : 0));
      const est = (c) => Math.max(0, Math.min(1, DICE.atLeast(opp, q(c.f), c.n - DICE.count(mine, c.f)) + (Math.random() * 2 - 1) * noise));
      const pPrev = prev ? est(prev) : 1; let best = null, bestP = -1, bluff = null;
      DICE.raises(prev, tot).forEach((c) => { if (prev && c.n > prev.n + 1) return; const p = est(c); if (p > bestP + 0.02) { bestP = p; best = c; } if (!bluff && !DICE.count(mine, c.f) && p > 0.45) bluff = c; });
      if (!best) return { call: true };
      let pk = best; if (bluff && Math.random() < 0.06 + 0.16 * s) pk = bluff;
      if (prev && (1 - pPrev) + (s < 0.3 ? 0.05 : 0) > bestP) return { call: true };
      return { claim: pk };
    }
  };


  /* ---------------- the keepers' portraits: 56 x 48 bust behind the counter, five frames each ----------------
     o.eye: o open, c closed, n narrowed; o.mouth: c closed, o talking, g grin, f frown; o.dy: lean (-1) or slump (+1). */
  const thick = (A, x0, y0, x1, y1, r, c) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2 + 1; for (let i = 0; i <= n; i++) A.ell(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r, r, c); };
  const curve = (A, pts, r0, r1, c) => { for (let i = 0; i < pts.length - 1; i++) { const t = i / (pts.length - 1); thick(A, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0 + (r1 - r0) * t, c); } };
  const spots = (A, key, to, seed, rate, x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (A.get(x, y) === key && hash(x, y, seed) < rate) A.set(x, y, to); };
  const FRAMES = { idle: { eye: 'o', mouth: 'c', dy: 0 }, blink: { eye: 'c', mouth: 'c', dy: 0 }, talk: { eye: 'o', mouth: 'o', dy: 0 }, gloat: { eye: 'n', mouth: 'g', dy: -1 }, sulk: { eye: 'n', mouth: 'f', dy: 1 } };
  const DRAW = {};
  // Mother Skein: an old crab with brass spectacles on her eye stalks, a plum knitted shawl, needles and teal yarn in her claws
  DRAW.weaver = { pal: { c: ['#b4503a', '#e08a5e', '#6e2a1e'], C: '#7a3020', f: ['#d88a64', '#f2b088', '#9a4a30'], F: '#5a1e14', d: '#f2b088', e: '#0b0a0e', E: '#ffffff', g: ['#b8902e', '#f0cc66', '#6a4e12'], G: '#cfe8e8',
      s: ['#5a2a52', '#8a4a7e', '#30142c'], S: '#b07aa8', y: ['#2f8a7a', '#6fd0be', '#16463e'], n: '#e6dcc0', m: '#3a0c0c', M: '#d87050', k: '#2a0c0c' },
    draw(A, o) { const d = o.dy;
      // eye stalks rising from the shell, spectacles on them
      const ex = [20, 36], ey = 6 + d + (o.mouth === 'f' ? 2 : 0);
      ex.forEach((x, i) => { thick(A, x + (i ? -2 : 2), 17 + d, x, ey + 2, 1.3, 'c'); });
      // the carapace: wide, ridged, serrated at the front edge
      A.ell(28, 26 + d, 18, 6, 'C'); A.ell(28, 21 + d, 20, 9, 'c'); A.ell(28, 18 + d, 14, 5, 'c'); A.ell(24, 16 + d, 6, 2, 'd');
      for (let i = 0; i < 6; i++) { A.tri(7 + i * 1.5, 22 + d + i * .6, 4 + i * 1.4, 25 + d + i * .8, 8 + i * 1.4, 26 + d + i * .6, 'c'); A.tri(49 - i * 1.5, 22 + d + i * .6, 52 - i * 1.4, 25 + d + i * .8, 48 - i * 1.4, 26 + d + i * .6, 'c'); }
      spots(A, 'c', 'C', 3, .07, 0, 12 + d, 56, 32 + d); [[18, 16], [22, 15], [33, 15], [38, 16], [27, 14]].forEach(([x, y]) => A.set(x, y + d, 'd'));
      A.line(12, 25 + d, 44, 25 + d, 'C');
      // the face plate under the shell: mouthparts
      A.ell(28, 31 + d, 9, 4.5, 'F'); A.ell(28, 30 + d, 7, 2.6, 'f'); [[22, 29], [34, 29], [25, 33], [31, 33]].forEach(([x, y]) => A.set(x, y + d, 'M'));
      if (o.mouth === 'o') { A.ell(28, 32 + d, 3, 1.6, 'm'); } else if (o.mouth === 'g') { A.line(24, 32 + d, 32, 32 + d, 'm'); A.set(23, 31 + d, 'm'); A.set(33, 31 + d, 'm'); }
      else if (o.mouth === 'f') { A.line(25, 32 + d, 31, 32 + d, 'm'); A.set(24, 33 + d, 'm'); A.set(32, 33 + d, 'm'); } else A.line(26, 32 + d, 30, 32 + d, 'm');
      // eyes and spectacles
      ex.forEach((x) => { if (o.eye === 'c') A.line(x - 1.5, ey, x + 1.5, ey, 'e'); else { A.ell(x, ey, 1.8, o.eye === 'n' ? 1 : 1.8, 'e'); A.set(x - 1, ey - 1, 'E'); }
        A.ring(x, ey, 3.4, 'g'); A.set(x + 2, ey - 2, 'G'); });
      A.line(23, ey - 1, 33, ey - 1, 'g');
      // the shawl over the shell, knitted in rows of little v's, with a fringe
      A.tri(6, 48, 16, 36, 22, 48, 's'); A.tri(50, 48, 40, 36, 34, 48, 's'); A.rect(14, 38, 28, 10, 's'); A.ell(28, 38, 14, 3, 's');
      for (let y = 36; y < 48; y += 3) for (let x = 6; x < 50; x += 3) if (A.get(x, y + d) === 's') { A.set(x, y + d, 'S'); A.set(x + 1, y + 1 + d, 'S'); }
      for (let x = 10; x < 46; x += 2) A.set(x, 47, 'S');
      // claws on the counter: needles crossed in the left, the yarn ball by the right
      const claw = (x, y, flip) => { A.ell(x, y, 5.5, 4.2, 'c'); A.tri(x - 4 * flip, y - 2, x - 9 * flip, y - 6, x - 3 * flip, y - 5, 'c'); A.tri(x - 4 * flip, y, x - 9 * flip, y + 1, x - 4 * flip, y + 3, 'c'); A.set(x, y - 2, 'd'); };
      claw(12, 41, -1); claw(44, 41, 1);
      A.line(6, 33, 22, 45, 'n'); A.line(4, 38, 24, 41, 'n'); A.rect(12, 36, 6, 5, 'y'); for (let x = 12; x < 18; x += 2) A.set(x, 38, 'k');
      A.ell(50, 44, 4.5, 4, 'y'); A.line(47, 42, 53, 46, 'k'); A.line(48, 46, 52, 41, 'k'); A.line(18, 39, 46, 43, 'y');
    } };
  // Maestro Murex: a violet octopus in a crimson beret, brush in one arm, palette in another, a white ruff at the throat
  DRAW.painter = { pal: { p: ['#6a3a8a', '#9a6ac0', '#3a1a52'], P: '#c8a0e0', Q: '#4a2462', r: ['#8a1a2a', '#c8404a', '#4a0a12'], e: ['#e8c040', '#fff0a0', '#a07a10'], k: '#0b0a0e',
      w: ['#e8e1cf', '#ffffff', '#a8a090'], b: ['#6a4a2a', '#9a7040', '#3a2414'], B: '#1a1010', a: ['#c8a070', '#e8c898', '#8a6a40'], R: '#e04a3a', U: '#3a8ae0', Y: '#f0d040', N: '#5ef2a0', m: '#2a0c22' },
    draw(A, o) { const d = o.dy;
      // arms first, behind: one curls up with the brush, one holds the palette, two curl on the counter
      curve(A, [[16, 34], [8, 30], [5, 22], [8, 15], [12, 12]], 3.2, 1.4, 'p'); curve(A, [[40, 34], [48, 34], [52, 40], [50, 46]], 3.2, 1.6, 'p');
      curve(A, [[20, 40], [12, 44], [6, 46], [3, 44]], 3, 1.2, 'p'); curve(A, [[36, 40], [42, 44], [47, 47]], 3, 1.4, 'p');
      // the mantle, a tall dome tipped back, and the head with its big eyes
      A.ell(28, 14 + d, 12, 11, 'p'); A.ell(28, 24 + d, 13, 9, 'p');
      spots(A, 'p', 'Q', 5, .06, 0, 0, 56, 48); [[24, 8], [30, 6], [21, 12], [35, 10]].forEach(([x, y]) => A.set(x, y + d, 'P'));
      // beret, tilted, with its little stalk
      A.ell(24, 5 + d, 11, 3.6, 'r'); A.ell(20, 4 + d, 7, 3, 'r'); A.rect(23, 0 + d, 2, 2, 'r');
      // eyes: gold with a bar pupil, heavy theatrical lids
      [22, 34].forEach((x) => { const y = 22 + d; A.ell(x, y, 3.6, 3.2, 'e');
        if (o.eye === 'c') { A.rect(x - 3, y - 3, 7, 4, 'p'); A.line(x - 3, y, x + 3, y, 'k'); } else { A.rect(x - 2, y, 5, 1, 'k'); if (o.eye === 'n') A.rect(x - 3, y - 3, 7, 2, 'p'); A.set(x - 1, y - 2, 'w'); }
        A.line(x - 4, y - 4 - (o.mouth === 'f' ? -1 : 0), x + 3, y - 5, 'Q'); });
      // the siphon, which is how an octopus pouts, and a mouth line
      if (o.mouth === 'o') A.ell(28, 29 + d, 2.2, 1.6, 'm'); else if (o.mouth === 'g') A.line(24, 28 + d, 32, 29 + d, 'm'); else if (o.mouth === 'f') { A.line(25, 30 + d, 31, 30 + d, 'm'); A.set(24, 31 + d, 'm'); } else A.line(26, 29 + d, 30, 29 + d, 'm');
      // the ruff
      for (let i = 0; i < 9; i++) A.ell(16 + i * 3, 34 + d + (i % 2), 2.6, 2.4, 'w');
      for (let i = 0; i < 9; i++) A.set(16 + i * 3, 34 + d + (i % 2), 'k');
      // the body, velvet
      A.ell(28, 44, 13, 7, 'p');
      // suckers along the lower arms
      [[9, 44], [6, 45], [44, 45], [41, 43], [50, 40], [7, 22]].forEach(([x, y]) => A.set(x, y, 'P'));
      // brush with a red loaded tip, palette with paint
      A.line(12, 12, 18, 2, 'b'); A.rect(17, 0, 2, 3, 'B'); A.set(18, 0, 'R');
      A.ell(50, 38, 6, 4, 'a'); A.ell(51, 39, 1.2, 1, 'k'); [['R', 47, 37], ['U', 50, 36], ['Y', 53, 37], ['N', 48, 40]].forEach(([c, x, y]) => { A.set(x, y, c); A.set(x + 1, y, c); });
      [[10, 30, 'U'], [6, 26, 'Y'], [44, 34, 'R']].forEach(([x, y, c]) => A.set(x, y, c));
    } };
  // Lanthorn: an anglerfish with an underbite of needle teeth, a lure glowing over his head, a leather apron and a blowpipe
  DRAW.glass = { pal: { f: ['#1e2a3a', '#3a5068', '#0c121c'], F: '#4a6680', t: '#ece8d8', m: '#3a0a14', l: ['#ffe9a0', '#ffffff', '#e0a030'], s: '#3a5068', e: '#c8e050', k: '#000000',
      a: ['#5a3a22', '#8a5a32', '#2e1c10'], A: '#c8a060', p: ['#6a6a72', '#a0a0aa', '#34343a'], g: ['#ff8a2a', '#ffd070', '#b04010'], x: '#e86a5a' },
    draw(A, o) { const d = o.dy, open = o.mouth === 'o' || o.mouth === 'g';
      // the lure on its stalk, arcing forward
      curve(A, [[24, 10 + d], [26, 3], [33, 0], [40, 2]], 1, .7, 's'); A.ell(42, 4, 3.4, 3.4, 'l');
      // shoulders and apron
      A.ell(28, 44, 20, 9, 'f'); A.rect(16, 36, 24, 12, 'a'); A.line(18, 36, 12, 30, 'a'); A.line(38, 36, 44, 30, 'a'); A.rect(25, 40, 6, 4, 'A');
      // the head: huge, the lower jaw jutting past the upper
      A.ell(27, 21 + d, 18, 12, 'f'); A.ell(30, 30 + d + (open ? 1 : 0), 17, 6, 'f');
      spots(A, 'f', 'F', 9, .06, 0, 6, 56, 40);
      // the mouth: a dark gap fringed with needles top and bottom
      const my = 27 + d, gap = o.mouth === 'o' ? 4 : o.mouth === 'g' ? 3 : o.mouth === 'f' ? 1 : 2;
      for (let x = 13; x <= 46; x++) { const u = (x - 30) / 17, y = my + Math.round(u * u * (o.mouth === 'f' ? 4 : -2)); A.rect(x, y, 1, gap, 'm'); }
      for (let x = 14; x <= 45; x += 3) { const u = (x - 30) / 17, y = my + Math.round(u * u * (o.mouth === 'f' ? 4 : -2)); A.tri(x, y - 1, x + 1, y + 2, x + 2, y - 1, 't'); A.tri(x + 1, y + gap + 1, x + 2, y + gap - 2, x + 3, y + gap + 1, 't'); }
      // one small mean eye high up, and a scar
      if (o.eye === 'c') A.line(33, 15 + d, 37, 15 + d, 'k'); else { A.ell(35, 15 + d, 2.4, o.eye === 'n' ? 1.2 : 2.2, 'e'); A.rect(35, 14 + d, 1, 3, 'k'); }
      A.line(20, 13 + d, 24, 17 + d, 'x');
      // fin-hands on the blowpipe, the glass bulb glowing at its end
      A.line(4, 42, 50, 32, 'p'); A.line(4, 43, 50, 33, 'p'); A.ell(51, 31, 4, 3.6, 'g');
      A.ell(14, 39, 4, 3, 'f'); A.tri(10, 37, 6, 34, 9, 41, 'f'); A.ell(36, 35, 4, 3, 'f'); A.tri(40, 33, 44, 30, 41, 37, 'f');
    } };
  // Old Keelson: a hermit crab living in a section of ship's hull, a pencil behind one eye stalk, mallet raised
  DRAW.carpenter = { pal: { w: ['#6a4426', '#9a6a3a', '#3a2412'], W: '#2a180c', i: ['#4a4e56', '#7a808a', '#24262c'], n: ['#c8c4b0', '#f0ecd8', '#8a8670'], c: ['#c86a3a', '#f0a060', '#7a3418'],
      e: '#0b0a0e', E: '#ffffff', h: ['#8a6a4a', '#b8946a', '#5a4028'], H: '#4a3020', y: '#e8c040', Y: '#e08080', m: '#3a1008', b: ['#c8a868', '#e8d0a0', '#8a6a40'] },
    draw(A, o) { const d = o.dy;
      // the hull he lives in: planks, two iron bands, barnacles, a porthole
      A.rect(8, 4 + d, 40, 36, 'w'); A.ell(28, 6 + d, 20, 5, 'w');
      for (let x = 12; x < 48; x += 6) A.line(x, 3 + d, x, 40, 'W');
      A.rect(8, 12 + d, 40, 2, 'i'); A.rect(8, 30, 40, 2, 'i'); [[10, 13], [46, 13], [10, 31], [46, 31]].forEach(([x, y]) => A.set(x, y + (y < 20 ? d : 0), 'E'));
      [[11, 7, 2], [14, 9, 1.4], [44, 20, 2.2], [41, 23, 1.4], [12, 35, 1.6]].forEach(([x, y, r]) => A.ell(x, y + d, r, r * .8, 'n'));
      A.ring(38, 8 + d, 2.6, 'i'); A.set(38, 8 + d, 'E');
      // the dark opening, and him in it
      A.ell(28, 30, 15, 11, 'W'); A.ell(28, 32 + d, 11, 9, 'c');
      // eye stalks, one squinting; the pencil
      const ey = 17 + d; [[23, 0], [33, 1]].forEach(([x, sq]) => { thick(A, x, 27 + d, x, ey + 2, 1.2, 'c');
        if (o.eye === 'c' || (sq && o.eye !== 'o')) A.line(x - 1.5, ey, x + 1.5, ey, 'e'); else { A.ell(x, ey, 1.9, sq ? 1.2 : 1.9, 'e'); A.set(x - 1, ey - 1, 'E'); } });
      A.line(36, 13 + d, 30, 21 + d, 'y'); A.set(36, 13 + d, 'Y'); A.set(30, 21 + d, 'e');
      // mouthparts
      if (o.mouth === 'o') A.ell(28, 33 + d, 2.5, 1.6, 'm'); else if (o.mouth === 'g') A.line(24, 32 + d, 32, 33 + d, 'm'); else if (o.mouth === 'f') { A.line(25, 34 + d, 31, 34 + d, 'm'); A.set(24, 35 + d, 'm'); } else A.line(26, 33 + d, 30, 33 + d, 'm');
      // the big claw raises a mallet; the small one rests on a plane
      const up = o.mouth === 'g' ? -3 : 0;
      thick(A, 18, 36, 11, 28 + up, 2.4, 'c'); A.ell(9, 26 + up, 5, 4, 'c'); A.tri(6, 23 + up, 3, 19 + up, 9, 22 + up, 'c');
      A.line(8, 26 + up, 14, 14 + up, 'H'); A.rect(10, 9 + up, 9, 5, 'h');
      thick(A, 38, 38, 45, 42, 2, 'c'); A.ell(46, 42, 3, 2.4, 'c'); A.rect(40, 43, 12, 4, 'b'); A.rect(44, 41, 3, 2, 'H');
      // legs on the counter
      [[20, 44], [24, 46], [33, 46], [36, 44]].forEach(([x, y]) => A.line(x, y - 4, x + (x < 28 ? -2 : 2), y, 'c'));
    } };
  // Squall: a scruffy gull with a brass monocle, a beard of little tentacles, a moth-eaten coat and a glowing specimen jar
  DRAW.curio = { pal: { g: ['#c8ccd0', '#f4f6f8', '#8a9098'], G: ['#7a8088', '#a8b0b8', '#4a5058'], b: ['#e8b830', '#ffe070', '#a07a10'], R: '#d8402a', k: '#0b0a0e', e: '#f0e8c0',
      m: ['#c8a040', '#ffe08a', '#7a5a18'], L: '#d8ecf0', t: ['#3a7a5a', '#5ec08a', '#1a4a32'], c: ['#6a4630', '#9a6a48', '#3a2418'], C: '#2a180e', K: '#3a2418', j: ['#5a8a8a', '#c0e8e0', '#2a4a4a'], J: '#5ef2a0', y: '#ffd56a' },
    draw(A, o) { const d = o.dy;
      // the coat, hunched shoulders, lapels and holes
      A.ell(26, 43, 18, 8, 'c'); A.rect(10, 40, 32, 8, 'c'); A.tri(18, 32, 26, 46, 20, 46, 'K'); A.tri(34, 32, 26, 46, 32, 46, 'K'); A.ell(26, 33, 8, 3, 'g'); spots(A, 'c', 'C', 11, .04, 0, 34, 56, 48); [[26, 40], [26, 44]].forEach(([x, y]) => A.set(x, y, 'y'));
      A.rect(8, 40, 4, 3, 'G');
      // head with a scruffy cap of grey and a tuft
      A.ell(25, 18 + d, 11, 10, 'g'); A.ell(22, 12 + d, 9, 5, 'G'); A.tri(18, 9 + d, 15, 2 + d, 22, 8 + d, 'G'); A.tri(23, 8 + d, 24, 1 + d, 27, 8 + d, 'G');
      // the hooked beak, red spot near the tip
      const by = 19 + d; A.tri(32, by - 4, 49, by - 1, 32, by + 2, 'b'); A.tri(46, by - 2, 50, by - 1, 47, by + 3, 'b'); A.set(45, by, 'R'); A.set(44, by, 'R');
      if (o.mouth === 'o' || o.mouth === 'g') { A.line(33, by, 45, by + 1, 'k'); A.tri(33, by + 1, 44, by + 2, 33, by + 4, 'b'); } else A.line(33, by - 1, 46, by, 'k');
      // the glaring eye behind the monocle; the chain
      const ex = 29, ey = 15 + d;
      if (o.eye === 'c') A.line(ex - 2, ey, ex + 2, ey, 'k'); else { A.ell(ex, ey, 2.2, o.eye === 'n' ? 1.1 : 2.2, 'e'); A.set(ex, ey, 'k'); A.set(ex + 1, ey, 'k'); }
      A.line(ex - 3, ey - 3 + (o.mouth === 'f' ? 1 : 0), ex + 3, ey - 2, 'G');
      A.ring(ex, ey, 3.8, 'm'); A.set(ex + 2, ey - 2, 'L'); A.line(ex - 3, ey + 3, 22, 34, 'm');
      // the tentacle beard
      for (let i = 0; i < 5; i++) curve(A, [[22 + i * 2.6, 25 + d], [21 + i * 2.6 + (i % 2 ? 2 : -2), 29 + d], [22 + i * 2.6, 33 + d]], 1.1, .6, 't');
      // a wing-hand round the specimen jar, the other holding a stolen coin
      A.rect(6, 30, 11, 13, 'j'); A.rect(6, 28, 11, 2, 'm'); A.ell(11, 37, 3, 3.5, 'J'); A.set(8, 33, 'L'); A.set(8, 34, 'L');
      A.ell(13, 43, 5, 3, 'G'); A.ell(42, 41, 5, 3, 'G'); A.ell(45, 38, 2.4, 2.4, 'y');
    } };
  // Madame Moray: a spotted eel rising in an S, pins in her mouth, pince-nez, a lace collar, tape measure and shears
  DRAW.tailor = { pal: { e: ['#3a6a3a', '#6aa05a', '#1a3a1e'], E: '#c8d050', D: '#22401f', k: '#0b0a0e', w: '#f0f0e0', t: ['#e8c040', '#fff0a0', '#a07a10'], T: '#3a2a0a',
      l: ['#e8e1cf', '#ffffff', '#a8a090'], p: '#d0d4dc', P: '#c8303a', s: ['#9aa0a8', '#e0e4e8', '#5a6068'], v: ['#5a1a3a', '#8a3a62', '#2e0a1e'], V: '#ffd56a', g: '#c8a040', m: '#2a0a12' },
    draw(A, o) { const d = o.dy;
      // velvet bodice at the bottom
      A.ell(26, 44, 17, 8, 'v'); [[26, 40], [26, 44]].forEach(([x, y]) => A.set(x, y, 'V'));
      // the long body in an S, the crest along its back
      curve(A, [[24, 44], [20, 36], [22, 28], [30, 22], [34, 16 + d]], 6, 5, 'e');
      curve(A, [[18, 40], [15, 33], [17, 26], [25, 19], [30, 13 + d]], 1, 1, 'E');
      spots(A, 'e', 'E', 13, .05, 0, 0, 56, 40); spots(A, 'e', 'D', 17, .05, 0, 0, 56, 40);
      // the head, snout to the right
      A.ell(38, 14 + d, 10, 6.4, 'e'); A.ell(45, 15 + d, 6, 4, 'e');
      const my = 17 + d;
      if (o.mouth === 'o') { A.line(36, my, 50, my, 'm'); A.line(38, my + 1, 49, my + 1, 'm'); } else if (o.mouth === 'g') { A.line(35, my - 1, 50, my + 1, 'm'); A.set(34, my - 2, 'm'); } else if (o.mouth === 'f') A.line(36, my + 1, 50, my, 'm'); else A.line(36, my, 50, my, 'm');
      // pins in her mouth
      [[42, 7], [45, 6], [48, 7]].forEach(([x, a]) => { A.line(x, my, x + 3, my - a + 2, 'p'); A.set(x + 3, my - a + 2, 'P'); });
      // a small sharp eye behind gold pince-nez
      const ex = 40, ey = 12 + d; if (o.eye === 'c') A.line(ex - 2, ey, ex + 2, ey, 'k'); else { A.ell(ex, ey, 1.8, o.eye === 'n' ? .9 : 1.8, 'k'); A.set(ex, ey - 1, 'w'); }
      A.ring(ex, ey, 3, 'g'); A.ring(ex + 7, ey + 1, 2.4, 'g'); A.line(ex + 3, ey, ex + 5, ey + 1, 'g');
      // the lace collar and the tape measure hanging round her neck
      for (let i = 0; i < 7; i++) A.ell(16 + i * 3.4, 31 + Math.abs(i - 3) * .6, 2.2, 2, 'l');
      for (let i = 0; i < 7; i++) A.set(16 + i * 3.4, 32 + Math.abs(i - 3) * .6, 'k');
      A.rect(14, 33, 3, 14, 't'); A.rect(33, 33, 3, 14, 't'); for (let y = 34; y < 47; y += 2) { A.set(14, y, 'T'); A.set(33, y, 'T'); }
      // shears in a fin on the counter
      A.line(40, 46, 52, 38, 's'); A.line(41, 44, 53, 41, 's'); A.ring(39, 45, 1.8, 's'); A.ring(41, 47, 1.8, 's');
      A.ell(44, 42, 4, 2.6, 'e');
    } };
  // Gullet: the fishmonger from the dice den (his own drawing, below), mapped onto the same five frames
  const GFR = { idle: ['rest', 0, 0, 0], blink: ['rest', 0, 1, 0], talk: ['rest', 1, 0, 1], gloat: ['lean', 0, 0, 0], sulk: ['sulk', 0, 0, 0] };
  const PORT = {};
  function portrait(id, f) {
    const key = id + f; if (PORT[key]) return PORT[key];
    if (id === 'gullet') { const g = GFR[f] || GFR.idle; return (PORT[key] = monger(g[0], g[1], g[2], g[3])); }
    const D = DRAW[id]; return (PORT[key] = mk(56, 48, D.pal, (A) => D.draw(A, FRAMES[f] || FRAMES.idle), { ol: '#07060a' }));
  }

  /* Gullet the fishmonger, as drawn for the dice den mock-up (replica/design/mockups/market5/gullet.part.js) */
  const MP = { s: ['#5f8270', '#8db298', '#3a5646'], b: ['#cbc796', '#ece8bc', '#96925f'], f: ['#3e7a80', '#7ab8b6', '#1f474e'], F: '#163238', j: ['#a8862a', '#d8b444', '#5e4612'], J: '#6e5414', H: ['#c49e34', '#ecca5a', '#6a4e12'],
    a: ['#d4caac', '#f1e9ce', '#9c9276'], t: '#7a5232', q: '#5e2424', u: '#4a2e16', e: ['#e6cf4e', '#fff3a0', '#a88a20'], k: '#0b0a0e', w: '#ffffff', L: '#46684f', K: '#1e3226', m: '#2a0c12',
    T: '#ece6d2', y: '#ffd56a', B: '#24321f', g: '#b04450', G: '#4a1418', h: '#d0d4dc', r: ['#b0aa92', '#d6d0b8', '#7a7462'], S: '#a6c8a8', P: '#8a8068', n: '#3a5646' };
  const MCACHE = {};
  function monger(pose, gill, blink, talk) {
    const key = pose + gill + blink + talk; if (MCACHE[key]) return MCACHE[key];
    const lean = pose === 'lean', sulk = pose === 'sulk', rub = pose === 'rub0' || pose === 'rub1', wipe = pose.startsWith('wipe');
    const dy = lean ? 2 : sulk ? 1 : 0, hy = 16 + dy + (lean ? 1 : 0);
    let lid = lean ? .08 : sulk ? .62 : rub ? .5 : .42; if (blink) lid = 1;
    const ppx = sulk ? 2 : 0, ppy = sulk ? 1 : rub ? -1 : 0;
    const mouth = talk ? 'open' : (lean || rub) ? 'grin' : sulk ? 'frown' : 'smirk';
    const r = MCACHE[key] = mk(52, 46, MP, (A) => {
      const thick = (x0, y0, x1, y1, rr, c) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2 + 1; for (let i = 0; i <= n; i++) A.ell(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, rr, rr, c); };
      const arm = (x0, y0, x1, y1) => { thick(x0, y0, x1, y1, 3.3, 'K'); thick(x0, y0, x1, y1, 2.5, 's'); };
      const sleeve = (x, y) => { A.ell(x, y, 4.4, 4, 'K'); A.ell(x, y, 3.6, 3.2, 'j'); A.set(x + 1, y + 1, 'J'); };
      const hand = (x, y) => { A.ell(x, y, 4.3, 3.2, 'K'); A.ell(x, y, 3.5, 2.4, 's'); A.line(x - 3, y + 2, x + 3, y + 2, 'f'); A.set(x - 2, y + 1, 'f'); A.set(x + 2, y + 1, 'f'); A.set(x - 1, y - 1, 'S'); };
      // hunched shoulders and striped jersey
      A.ell(26, 38 + dy - (gill ? .5 : 0), 18.5, 10.5, 'j');
      for (let y = 0; y < 46; y++) for (let x = 0; x < 52; x++) if (A.get(x, y) === 'j' && (x * 2 + Math.floor(y / 2)) % 11 === 0 && y > 30) A.set(x, y, 'J');
      // stained apron, straps, pocket with a fish tail poking out
      A.rect(16, 31 + dy, 20, 15, 'a'); A.rect(19, 28 + dy, 14, 4, 'a');
      A.line(19, 28 + dy, 15, 23 + dy, 'u'); A.line(32, 28 + dy, 37, 23 + dy, 'u');
      A.line(16, 32 + dy, 16, 45, 'P'); A.line(35, 32 + dy, 35, 45, 'P');
      [[20, 35, 1.6, 't'], [30, 42, 1.8, 'q'], [32, 33, 1.1, 't'], [18, 42, 1.2, 't'], [25, 30, 1, 'q'], [23, 44, 1, 't']].forEach(([x, y, rr, c]) => A.ell(x, y + dy, rr, rr * .8, c));
      A.rect(22, 37 + dy, 8, 5, 'a'); A.line(22, 37 + dy, 29, 37 + dy, 'P'); A.line(22, 37 + dy, 22, 41 + dy, 'P'); A.line(29, 37 + dy, 29, 41 + dy, 'P');
      A.tri(23, 33 + dy, 26.5, 36.5 + dy, 24.5, 36.5 + dy, 'f'); A.tri(29, 33 + dy, 25.5, 36.5 + dy, 27.5, 36.5 + dy, 'f');
      // arms: forearms resting on the counter, outlined so they read against the body
      if (pose === 'rest' || lean || wipe) { arm(9, 31 + dy, 15, 39); sleeve(9, 31 + dy); hand(16, 40); }
      if (pose === 'rest') { arm(43, 31 + dy, 37, 39); sleeve(43, 31 + dy); hand(36, 40); }
      if (wipe) { const xr = 35 + [-5, 0, 5][+pose[4]]; arm(43, 31, xr + 2, 38); sleeve(43, 31); A.ell(xr, 41, 5.5, 1.8, 'K'); A.ell(xr, 41, 4.8, 1.2, 'r'); A.set(xr - 2, 41, 't'); hand(xr + 2, 39); }
      if (rub) { const k = pose === 'rub1' ? 1 : -1; arm(9, 31, 21, 36); arm(43, 31, 31, 36); sleeve(9, 31); sleeve(43, 31); hand(23, 36 + k); hand(29, 36 - k); }
      if (sulk) { sleeve(9, 32); sleeve(43, 32); arm(10, 34, 36, 37); arm(42, 34, 16, 38); A.ell(36, 37, 3, 2.2, 's'); A.ell(16, 38, 3, 2.2, 's'); }
      // head: bulging brow, heavy jaw with a shadow under it
      A.ell(26, hy, 14, 10, 's'); A.ell(26, hy - 5, 9.5, 5.5, 's');
      A.ell(26, hy + 8.5, 12, 4.4, 'K'); A.ell(26, hy + 6.5, 11.8, 4.4, 'b');
      [[21, hy - 4], [24, hy - 5], [31, hy - 4], [34, hy - 3], [18, hy - 3], [36, hy - 1], [16, hy + 2]].forEach(([x, y]) => A.set(x, y, 'S'));
      // big side eyes with smug, heavy lids
      [14.5, 37.5].forEach((cx, side) => {
        const er = side ? 3.5 : 4.8, ey = hy - 1 + (side ? 1 : 0);
        A.ell(cx, ey, er + .9, er + .9, 'K'); A.ell(cx, ey, er, er, 'e');
        const px = Math.round(cx - 1.5 + (side ? -1 : 1) * (lean ? 0 : .6) + ppx), py = Math.round(ey) - 1 + ppy;
        if (side) { A.rect(px + 1, py + 1, 2, 2, 'k'); A.set(px + 1, py + 1, 'w'); } else { A.rect(px, py, 3, 3, 'k'); A.set(px, py, 'w'); }
        const top = Math.floor(ey - er - 1), rows = Math.round(lid * (er * 2 + 2));
        for (let y = top; y < top + rows; y++) for (let x = Math.floor(cx - 6); x <= Math.ceil(cx + 6); x++) { const v = A.get(x, y); if (v === 'e' || v === 'k' || v === 'w') A.set(x, y, 'L'); }
        if (rows > 0 && rows < er * 2 + 2) for (let x = Math.floor(cx - 6); x <= Math.ceil(cx + 6); x++) { const v = A.get(x, top + rows); if (v === 'e' || v === 'k' || v === 'w') A.set(x, top + rows, 'K'); }
      });
      // brows: sly, eager or sulky
      const bl = sulk ? [[9, hy - 5], [19, hy - 7]] : lean ? [[9, hy - 7], [19, hy - 7]] : [[9, hy - 7], [19, hy - 5]];
      A.line(bl[0][0], bl[0][1], bl[1][0], bl[1][1], 'K'); A.line(52 - bl[0][0] - 1, bl[0][1], 52 - bl[1][0] - 1, bl[1][1], 'K');
      A.set(24, hy + 1, 'k'); A.set(28, hy + 1, 'k');
      // mouth: wide, lipped, snaggle teeth, one gold tooth
      for (let x = 15; x <= 37; x++) {
        const u = (x - 26) / 11; let y;
        if (mouth === 'smirk') y = hy + 5 + (x < 19 ? Math.round((19 - x) * .5) : 0) - (x > 31 ? Math.round((x - 31) * .5) : 0);
        else if (mouth === 'grin') y = hy + 6 - Math.round(u * u * 3.6);
        else if (mouth === 'frown') y = hy + 4 + Math.round(u * u * 3);
        else y = hy + 5;
        A.set(x, y, 'm');
        if (mouth === 'grin' && Math.abs(u) < .8) { A.set(x, y + 1, 'm'); if (x % 2) A.set(x, y, 'T'); if (x === 30) A.set(x, y, 'y'); }
        if (mouth === 'open' && x > 18 && x < 34) { A.set(x, y + 1, 'm'); A.set(x, y + 2, x > 22 && x < 30 ? 'q' : 'm'); if (x % 3 === 0) A.set(x, y, 'T'); }
      }
      if (mouth !== 'grin') { const my = hy + (mouth === 'frown' ? 5 : 5); A.set(20, my - 1, 'T'); A.set(20, my - 2, 'T'); A.set(33, my - 1, 'T'); A.set(29, my - 1, 'y'); A.set(29, my, 'y'); }
      // barbels like a greasy moustache
      if (sulk) { A.line(15, hy + 6, 13, hy + 16, 'B'); A.line(37, hy + 6, 39, hy + 16, 'B'); }
      else { A.line(15, hy + 6, 9, hy + 9, 'B'); A.line(9, hy + 9, 7, hy + 15, 'B'); A.set(8, hy + 16, 'B'); A.line(37, hy + 6, 43, hy + 9, 'B'); A.line(43, hy + 9, 45, hy + 15, 'B'); A.set(44, hy + 16, 'B'); }
      // gill slits at the jaw hinge
      for (let i = 0; i < 3; i++) { A.line(12 + i, hy + 3 + i * .5, 12 + i, hy + 6 + i * .5, gill ? 'G' : 'K'); A.line(40 - i, hy + 3 + i * .5, 40 - i, hy + 6 + i * .5, gill ? 'G' : 'K'); }
      if (gill) { A.set(13, hy + 4, 'g'); A.set(39, hy + 4, 'g'); }
      // oily shine
      [[22, hy - 4], [23, hy - 4], [30, hy - 3], [19, hy - 2]].forEach(([x, y]) => A.set(x, y, 'w'));
      // a gold hoop through one gill
      A.ring(10.5, hy + 7, 2.4, 'y'); A.set(12, hy + 5, 'G');
      // the yellow oilskin sou'wester, a dorsal fin poking through
      A.ell(26, hy - 7.5, 18, 2.8, 'H'); A.ell(26, hy - 11, 10.5, 4.6, 'H'); for (let x = 10; x <= 42; x += 3) A.set(x, hy - 6, 'J'); A.line(16, hy - 9, 36, hy - 9, 'J');
      A.tri(31, hy - 13, 34, hy - 17, 37, hy - 13, 'f'); A.line(34, hy - 16, 34, hy - 13, 'F');
      A.set(21, hy - 13, 'w'); A.set(22, hy - 14, 'w');
      if (lean) { arm(44, 33, 42, hy + 9); sleeve(44, 33); hand(41, hy + 7); A.line(39, hy + 5, 39, hy + 9, 'f'); }
    });
    return r;
  }


  /* ---------------- the Round Grotto (S2): a round cave, one curved wall, a moon shaft through the roof ----------------
     Drawn at 192 x 216 from the items he owns (the shop's own room sprites: walls and floors re-mapped onto the curve). */
  const loadAll = (srcs) => Promise.all(srcs.map((s) => new Promise((res) => { const im = img(s, () => res(im)); if (im.complete) res(im); })));
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const vn = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s), u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y, s) => vn(x, y, s) * 0.6 + vn(x * 2.1, y * 2.1, s + 1) * 0.28 + vn(x * 4.3, y * 4.3, s + 2) * 0.12;
  function rockCol(x, y, pal, sc, seed, lift) {
    const t = Math.max(0, Math.min(pal.length - 1.001, (fbm(x / sc, y / sc, seed) + (lift || 0)) * pal.length * 1.1 - 0.3)); let i = Math.floor(t);
    if ((t - i) * 16 > BAY[(y & 3) * 4 + (x & 3)] + 0.5) i = Math.min(pal.length - 1, i + 1);
    return Math.abs(vn(x / 7, y / 5, seed + 9) - 0.5) < 0.025 ? pal[0].map((v) => v * 0.6) : pal[i];
  }
  const ROCK = ['#0d1416', '#162226', '#1f3136', '#2c4248'].map(hex), ROCKD = ['#070d0d', '#0c1817', '#122421', '#1a332e'].map(hex);
  const pixels = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return { w: im.width, h: im.height, d: x.getImageData(0, 0, im.width, im.height).data }; };
  const samp = (t, x, y) => { x = ((Math.floor(x) % t.w) + t.w) % t.w; y = ((Math.floor(y) % t.h) + t.h) % t.h; const i = (y * t.w + x) * 4; return [t.d[i], t.d[i + 1], t.d[i + 2]]; };
  // the wall sprite (two slanted panels) unskewed into a flat strip; the floor diamond turned into a square
  function wallTex(im) { const P = pixels(im), w = P.w, h = P.h, cols = []; let hs = 1e9;
    for (let x = 0; x < w; x++) { let t = -1, b = -1; for (let y = 0; y < h; y++) if (P.d[(y * w + x) * 4 + 3] > 0) { if (t < 0) t = y; b = y; } cols.push(t); if (t >= 0) hs = Math.min(hs, b - t + 1); }
    const out = new Uint8ClampedArray(w * hs * 4); let n = 0;
    for (let x = 1; x < w - 1; x++) { const t = cols[x]; if (t < 0) continue; for (let y = 0; y < hs; y++) { const s = ((t + y) * w + x) * 4, d = (y * (w - 2) + n) * 4; out[d] = P.d[s]; out[d + 1] = P.d[s + 1]; out[d + 2] = P.d[s + 2]; out[d + 3] = 255; } n++; }
    return { w: w - 2, h: hs, d: out }; }
  function floorTex(im) { const P = pixels(im), T = 52, m = 4, out = new Uint8ClampedArray(T * T * 4), cx = (P.w - 1) / 2, hh = (P.h - 1) / 2;
    for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) { const U = (u + m) / (T + 2 * m) * hh * 2, V = (v + m) / (T + 2 * m) * hh * 2, x = Math.round(cx + U - V), y = Math.round((U + V) / 2);
      const s = (Math.min(P.h - 1, y) * P.w + Math.max(0, Math.min(P.w - 1, x))) * 4, d = (v * T + u) * 4; out[d] = P.d[s]; out[d + 1] = P.d[s + 1]; out[d + 2] = P.d[s + 2]; out[d + 3] = 255; }
    return { w: T, h: T, d: out }; }
  const RG = { cx: 96, cy: 146, rx: 80, ry: 50, WH: 56, by(x) { const u = (x - this.cx) / this.rx; return Math.abs(u) >= 1 ? this.cy : this.cy - this.ry * Math.sqrt(1 - u * u); },
    anchors: { window: [104, 66], hang3: [32, 98], hang4: [150, 90], corner: [128, 112], light: [30, 136], seat: [76, 152], table: [116, 162], rug: [96, 152], prop: [116, 164] },
    walk() { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.62; return [this.cx + Math.cos(a) * r * this.rx, Math.max(this.cy + 2, this.cy + Math.abs(Math.sin(a)) * r * this.ry)]; },
    ward: { x: 58, y: 112 }, chests: [[140, 176], [156, 168], [168, 180], [152, 188], [128, 186], [174, 166]], arch: [170, 122] };
  function drawShell(x, wt, ft) {
    const im = x.createImageData(W, H), d = im.data, put = (X, Y, c) => { const i = (Y * W + X) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) { const hole = Math.hypot((X - 104) / 22, (y - 6) / 9); let c = rockCol(X, y, ROCK, 12, 31, 0.05 - y / 600);
      if (hole < 1) c = [150 - hole * 60, 180 - hole * 60, 210 - hole * 50]; else if (hole < 1.25) c = [40, 60, 72]; put(X, y, c); }
    for (let X = 0; X < W; X++) { const u = (X - RG.cx) / RG.rx; if (Math.abs(u) >= 1) continue;
      const a = Math.asin(u), base = Math.round(RG.by(X)), tc = Math.floor((a + Math.PI / 2) * RG.rx * 0.95), sh = 0.45 + 0.55 * Math.cos(a);
      for (let r = 0; r < RG.WH; r++) { const y = base - RG.WH + r; if (y >= 0 && wt) put(X, y, samp(wt, tc, Math.floor(r * wt.h / RG.WH)).map((v) => v * sh)); }
      for (let r = 1; r <= 3; r++) { const y = base - RG.WH - r; if (y >= 0) put(X, y, rockCol(X, y, ROCK, 4, 7, 0.35).map((v) => v * (r === 1 ? 1.4 : 1))); } }
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) { const e = Math.hypot((X - RG.cx) / RG.rx, (y - RG.cy) / RG.ry);
      if (e <= 1) { const c = ft ? samp(ft, (X - RG.cx) / RG.rx * 62 + 520, (y - RG.cy) / RG.ry * 62 + 520) : [40, 50, 50], k = e > 0.93 ? 0.62 : 1 - e * e * 0.18; put(X, y, c.map((v) => v * k)); }
      else if (y > RG.cy && e < 1.12) put(X, y, rockCol(X, y, ROCK, 5, 13, 0.3));
      else if (y > RG.cy && e < 1.12 + 14 / RG.ry && Math.abs(X - RG.cx) < RG.rx * 1.08) { const yy = RG.cy + RG.ry * 1.12 * Math.sqrt(Math.max(0, 1 - ((X - RG.cx) / (RG.rx * 1.12)) ** 2)); if (y > yy) put(X, y, rockCol(X, y, ROCKD, 6, 17, 0.1)); } }
    x.putImageData(im, 0, 0);
  }
  // the archway out to the Night Market, cut into the right of the wall, green light and a lantern beyond
  const ARCH = mk(22, 34, { s: ['#3a4a4a', '#6a7a76', '#1a2424'], k: '#030807', g: '#0f3a2a', G: '#1d6a48', y: '#ffd56a', Y: '#ff9a40' }, (A) => {
    A.rect(1, 12, 20, 22, 's'); A.ell(11, 12, 10, 11, 's'); A.rect(4, 13, 14, 21, 'k'); A.ell(11, 13, 7, 8, 'k');
    A.ell(11, 26, 6, 8, 'g'); A.ell(11, 28, 4, 5, 'G'); A.rect(10, 18, 2, 3, 'Y'); A.set(10, 19, 'y'); A.set(11, 19, 'y');
    for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8; A.set(11 + Math.cos(a) * 9.5, 12 + Math.sin(a) * 10, 'k'); }
    for (let y = 16; y < 34; y += 4) { A.set(1, y, 'k'); A.set(19, y + 2, 'k'); } }, { ol: '#020504' });
  // the wardrobe: drowned wood, an oval mirror on one door, the other open on the hanging cloaks
  const WARD = mk(28, 42, { w: ['#4a3020', '#7a5236', '#26160c'], y: ['#b88a3a', '#f0c870', '#6a4a18'], g: ['#3f7a72', '#bff0e4', '#1f4440'], k: '#0d0806', r: '#8a6a3a',
    v: ['#6a1f55', '#a6448a', '#34102c'], m: ['#1c2a5a', '#3c5296', '#0c1430'], d: ['#123a30', '#2f7a62', '#06201a'], b: '#c8d8c0', s: '#2f8a4a' }, (A) => {
    A.rect(2, 6, 24, 34, 'w'); A.ell(14, 6, 12, 5, 'w'); A.rect(1, 39, 26, 2, 'w'); A.rect(3, 41, 3, 1, 'w'); A.rect(22, 41, 3, 1, 'w');
    A.rect(3, 9, 22, 1, 'y'); A.ell(14, 4, 2, 2, 'y'); A.ell(8, 22, 4, 9, 'y'); A.ell(8, 22, 3, 8, 'g');
    A.rect(14, 10, 10, 28, 'k'); A.rect(14, 11, 10, 1, 'r');
    ['v', 'm', 'd'].forEach((c, i) => { const x = 15 + i * 3; A.tri(x, 12, x + 3, 12, x + 3.6, 27, c); A.tri(x, 12, x - 0.6, 27, x + 3.6, 27, c); });
    A.set(4, 30, 'b'); A.set(5, 31, 'b'); A.set(21, 36, 'b'); A.set(3, 14, 'b'); A.line(26, 40, 27, 30, 's'); A.line(27, 30, 26, 24, 's'); }, { ol: '#080503' });
  // chests by the size of the reward: wood, iron, gold, obsidian; a red wax seal in front
  const CHEST = {};
  [['wood', ['#6b4223', '#94633a', '#3e2412'], ['#5a5a60', '#8a8a92', '#2a2a30']], ['iron', ['#4a4e56', '#7a808a', '#24262c'], ['#9a7a3a', '#d8b060', '#5a4418']],
    ['gold', ['#c8962e', '#ffd970', '#7a5410'], ['#7a1a22', '#c4323a', '#4a0a10']], ['obsidian', ['#1c1a24', '#3e3a50', '#0a0910'], ['#1d8a52', '#5ef2a0', '#0d4a2a']]].forEach(([st, b, i]) => {
    CHEST[st] = mk(16, 13, { b, i, w: ['#a3202a', '#e0545a', '#5a0a10'], e: '#5ef2a0' }, (A) => { A.rect(1, 5, 14, 7, 'b'); A.rect(1, 1, 14, 4, 'b'); A.ell(8, 2, 7, 2, 'b'); A.rect(1, 4, 14, 1, 'i'); A.rect(3, 1, 1, 11, 'i'); A.rect(12, 1, 1, 11, 'i'); A.ell(8, 6, 1.8, 1.8, 'w'); if (st === 'obsidian') { A.set(5, 8, 'e'); A.set(10, 8, 'e'); } }, { ol: '#070404' }); });
  const chestOf = (cost) => CHEST[cost <= 200 ? 'wood' : cost <= 400 ? 'iron' : cost <= 800 ? 'gold' : 'obsidian'];
  const ROCKSEAT = mk(20, 9, { r: ['#2c4248', '#4a6a70', '#162226'] }, (A) => { A.ell(10, 5, 9, 4, 'r'); }, { ol: '#050909' });
  // where each placed item sits in the round room
  function layout(X) {
    const room = X.D.room || {}, art = X.ROOM.art, R = {}, sh = X.SHOP ? X.SHOP.items : [], cat = (id) => (sh.find((i) => i.id === id) || {}).category;
    ['rug', 'window', 'hang3', 'hang4', 'corner', 'light', 'furn', 'prop'].forEach((sl) => {
      const id = room[sl], L = id && art[id] && art[id][sl]; if (!L) return;
      const table = sl === 'furn' && cat(id) === 'tables', a = sl === 'furn' ? RG.anchors[table ? 'table' : 'seat'] : RG.anchors[sl];
      let r;
      if (sl === 'light' && L.oy < 40) r = { x: 104 - L.w / 2, y: 22, hang: 1 };
      else if (sl === 'prop') { const t = R.furn; r = t && t.table ? { x: t.x + t.w / 2 - L.w / 2, y: t.y + t.h * 0.37 - L.h } : { x: a[0] - L.w / 2, y: a[1] - L.h - 4, rock: 1 }; }
      else if (/^(window|hang3|hang4|rug)$/.test(sl)) r = { x: a[0] - L.w / 2, y: a[1] - L.h / 2 };
      else r = { x: a[0] - L.w / 2, y: a[1] - L.h };
      r.x = Math.round(r.x); r.y = Math.round(r.y); r.w = L.w; r.h = L.h; r.src = L.art; r.id = id; r.slot = sl; r.table = table; r.tier = (sh.find((i) => i.id === id) || {}).tier; R[sl] = r;
    });
    return R;
  }
  const spotOf = (sl, R) => { const r = R[sl]; if (r) return [r.x + r.w / 2, r.y + r.h / 2];
    const a = sl === 'furn' ? RG.anchors.seat : sl === 'prop' ? RG.anchors.prop : RG.anchors[sl]; return sl === 'floor' ? [64, 184] : sl === 'wall' ? [58, 80] : [a[0], /^(window|hang3|hang4|rug)$/.test(sl) ? a[1] : a[1] - 8]; };
  const GR = { key: '', wrap: null, raf: 0, U: { x: 96, y: 166, tx: 96, ty: 166, st: 'idle', t: 1, face: 1, seat: false }, bub: [], mote: [] };
  function grottoWrap() {
    if (GR.wrap) return GR.wrap;
    const w = document.createElement('div'); w.className = 'dn-gw';
    w.innerHTML = '<canvas class="dn-cv" width="192" height="216"></canvas><canvas class="dn-sh" width="384" height="432"></canvas><canvas class="dn-gl" width="384" height="432"></canvas><div class="dn-u"></div>';
    return (GR.wrap = w);
  }
  async function buildGrotto(X) {
    const room = X.D.room || {}, art = X.ROOM.art, R = layout(X), hoard = (X.D.hoard || []).slice(0, 6);
    const key = JSON.stringify([room, hoard.map((h) => h.cost), X.SHOP ? 1 : 0]); if (key === GR.key) return; GR.key = key;
    const wl = room.wall && art[room.wall] && art[room.wall].wall, fl = room.floor && art[room.floor] && art[room.floor].floor;
    const list = Object.values(R).map((r) => r.src).concat([ARCH.src, WARD.src, ROCKSEAT.src], Object.values(CHEST).map((c) => c.src), wl ? [wl.art] : [], fl ? [fl.art] : []);
    await loadAll(list); if (GR.key !== key) return;
    const cv = grottoWrap().querySelector('.dn-cv'), x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    drawShell(x, wl ? wallTex(img(wl.art)) : null, fl ? floorTex(img(fl.art)) : null);
    x.drawImage(img(ARCH.src), RG.arch[0] - 11, Math.round(RG.by(RG.arch[0])) - 33);
    const shadow = (cx, cy, rw) => { x.fillStyle = 'rgba(0,0,0,.32)'; x.beginPath(); x.ellipse(cx, cy, rw, rw * 0.3, 0, 0, Math.PI * 2); x.fill(); };
    ['rug', 'window', 'hang3', 'hang4'].forEach((sl) => { const r = R[sl]; if (r) x.drawImage(img(r.src), r.x, r.y); });
    const L = [];
    ['corner', 'furn'].forEach((sl) => { const r = R[sl]; if (r) L.push([r.y + r.h, () => x.drawImage(img(r.src), r.x, r.y)]); });
    if (R.light && !R.light.hang) L.push([R.light.y + R.light.h, () => x.drawImage(img(R.light.src), R.light.x, R.light.y)]);
    if (R.prop) L.push([(R.furn && R.furn.table ? R.furn.y + R.furn.h : R.prop.y + R.prop.h) + 0.5, () => { if (R.prop.rock) x.drawImage(img(ROCKSEAT.src), R.prop.x + R.prop.w / 2 - 10, R.prop.y + R.prop.h - 4); x.drawImage(img(R.prop.src), R.prop.x, R.prop.y); }]);
    L.push([RG.ward.y, () => { shadow(RG.ward.x, RG.ward.y - 1, 13); x.drawImage(img(WARD.src), RG.ward.x - 14, RG.ward.y - 42); }]);
    hoard.forEach((h, i) => { const p = RG.chests[i]; L.push([p[1], () => { shadow(p[0], p[1] - 1, 8); x.drawImage(img(chestOf(h.cost).src), p[0] - 8, p[1] - 13); }]); });
    L.sort((a, b) => a[0] - b[0]).forEach((o) => o[1]());
    if (R.light && R.light.hang) { x.fillStyle = '#3a2a1a'; x.fillRect(Math.round(R.light.x + R.light.w / 2), 0, 1, R.light.y + 2); x.drawImage(img(R.light.src), R.light.x, R.light.y); }
    // front rocks and kelp, soft
    x.fillStyle = '#0a1416'; x.beginPath(); x.ellipse(-6, 214, 40, 22, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(200, 220, 36, 20, 0, 0, 7); x.fill();
    shade(X, R); GR.R = R;
  }
  // the light: cool ambient, a moon pool, warm pools under lamps and the window, green for Eldritch things
  function shade(X, R) {
    const c = GR.wrap.querySelector('.dn-sh'), s = c.getContext('2d'), k = 2; s.globalCompositeOperation = 'source-over';
    s.fillStyle = X.night() ? 'rgb(64,80,112)' : 'rgb(86,108,140)'; s.fillRect(0, 0, c.width, c.height);
    const vg = s.createRadialGradient(W / 2 * k, H * 0.55 * k, 30 * k, W / 2 * k, H * 0.55 * k, 150 * k); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); s.fillStyle = vg; s.fillRect(0, 0, c.width, c.height);
    s.globalCompositeOperation = 'lighter';
    const pool = (x0, y0, r, col, a) => { const g = s.createRadialGradient(x0 * k, y0 * k, 0, x0 * k, y0 * k, r * k); g.addColorStop(0, 'rgba(' + col + ',' + a * 0.75 + ')'); g.addColorStop(1, 'rgba(' + col + ',0)'); s.fillStyle = g; s.fillRect((x0 - r) * k, (y0 - r) * k, r * 2 * k, r * 2 * k); };
    pool(96, 158, 54, '170,200,255', 0.9); pool(170, 108, 22, '90,240,160', 0.6); pool(96, 166, 34, '255,236,200', 0.45);
    const L = R.light; if (L) pool(L.x + L.w / 2, L.y + L.h * 0.3, 58, L.tier === 'Eldritch' ? '80,255,170' : '255,190,110', 1);
    const Wn = R.window; if (Wn) pool(Wn.x + Wn.w / 2, Wn.y + Wn.h / 2, 34, Wn.tier === 'Eldritch' ? '90,255,170' : '150,200,230', 0.8);
    Object.values(R).forEach((r) => { if (r.tier === 'Eldritch' && r !== L && r !== Wn) pool(r.x + r.w / 2, r.y + r.h / 2, 30, '70,230,150', 0.7); });
    (X.D.hoard || []).slice(0, 6).forEach((h, i) => { if (h.cost <= X.D.player.coins) pool(RG.chests[i][0], RG.chests[i][1] - 6, 12, '255,210,120', 0.5); });
    s.globalCompositeOperation = 'source-over';
  }
  // the moving light: the moon shaft, caustics on the floor, bubbles and marine snow; Ulhu wanders and sits
  function grottoTick(X, now, dt) {
    const c = GR.wrap.querySelector('.dn-gl'), g = c.getContext('2d'), k = 2; g.clearRect(0, 0, c.width, c.height);
    const drift = RM ? 0 : Math.sin(now / 2300) * 3, a = RM ? 0.2 : 0.16 + 0.06 * Math.sin(now / 1700), gr = g.createLinearGradient(0, 0, 0, 160 * k);
    gr.addColorStop(0, 'rgba(200,225,255,' + a * 1.4 + ')'); gr.addColorStop(0.75, 'rgba(200,225,255,' + a * 0.5 + ')'); gr.addColorStop(1, 'rgba(200,225,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo((92 + drift) * k, 0); g.lineTo((116 + drift) * k, 0); g.lineTo((146 + drift) * k, 160 * k); g.lineTo((66 + drift) * k, 160 * k); g.fill();
    g.strokeStyle = 'rgba(190,220,255,.16)'; g.lineWidth = 1.2; const t = RM ? 0 : now / 1400;
    for (let i = 0; i < 9; i++) { g.beginPath(); for (let j = 0; j <= 20; j++) { const u = j / 20, xx = 66 + u * 62, yy = 140 + i * 4 + Math.sin(u * 9 + t + i) * 2.2 + Math.sin(u * 3 - t * 0.7) * 1.5; if (j) g.lineTo(xx * k, yy * k); else g.moveTo(xx * k, yy * k); } g.stroke(); }
    if (!GR.mote.length) for (let i = 0; i < 40; i++) GR.mote.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() * 0.8, v: 1 + Math.random() * 2.5, p: Math.random() * 6 });
    if (!RM && Math.random() < dt * 1.4) { const p = RG.walk(); GR.bub.push({ x: p[0], y: p[1], r: 0.7 + Math.random() * 1.6, v: 8 + Math.random() * 10, p: Math.random() * 6 }); }
    g.lineWidth = 1;
    for (let i = GR.bub.length - 1; i >= 0; i--) { const b = GR.bub[i]; b.y -= b.v * dt; b.p += dt * 3; if (b.y < -4) { GR.bub.splice(i, 1); continue; } const bx = b.x + Math.sin(b.p) * 1.2;
      g.strokeStyle = 'rgba(200,245,235,.55)'; g.beginPath(); g.arc(bx * k, b.y * k, b.r * k, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect((bx - b.r * 0.4) * k, (b.y - b.r * 0.45) * k, 1, 1); }
    GR.mote.forEach((m) => { if (!RM) { m.p += dt; m.y += m.v * dt * 0.5; m.x += Math.sin(m.p) * dt * 1.5; if (m.y > H) { m.y = -2; m.x = Math.random() * W; } } g.fillStyle = 'rgba(190,230,220,.35)'; g.fillRect(m.x * k, m.y * k, m.s * k * 0.6, m.s * k * 0.6); });
    walkU(X, dt);
  }
  function walkU(X, dt) {
    const U = GR.U, R = GR.R || {}, seat = R.furn && !R.furn.table ? R.furn : null, el = GR.wrap.querySelector('.dn-u');
    if (!RM) { U.t -= dt;
      if (U.st === 'walk') { const dx = U.tx - U.x, dy = U.ty - U.y, dd = Math.hypot(dx, dy), sp = 16 * dt; if (Math.abs(dx) > 0.5) U.face = dx < 0 ? -1 : 1;
        if (dd <= sp) { U.x = U.tx; U.y = U.ty; if (U.goal === 'sit' && seat) { U.st = 'sit'; U.t = 5 + Math.random() * 5; } else { U.st = 'idle'; U.t = 1.5 + Math.random() * 2.5; } } else { U.x += dx / dd * sp; U.y += dy / dd * sp; } }
      else if (U.t <= 0) { if (U.st === 'sit' && seat) { U.y = seat.y + seat.h + 3; } const r = Math.random();
        if (r < 0.35 && seat) { U.tx = seat.x + seat.w / 2; U.ty = seat.y + seat.h + 3; U.goal = 'sit'; } else if (r < 0.5) { U.tx = RG.ward.x + 16; U.ty = RG.ward.y + 6; U.goal = 'mirror'; } else { const p = RG.walk(); U.tx = p[0]; U.ty = p[1]; U.goal = 'walk'; }
        U.st = 'walk'; } }
    else if (seat && U.st !== 'sit') { U.st = 'sit'; }
    const sit = U.st === 'sit' && seat, x = sit ? seat.x + seat.w / 2 : U.x, y = sit ? seat.y + seat.h * 0.78 : U.y;
    el.style.left = (100 * (x - 16) / W) + '%'; el.style.top = (100 * (y - 31) / H) + '%'; el.style.transform = U.face < 0 ? 'scaleX(-1)' : '';
  }
  function grottoLoop(X) {
    if (GR.raf) return; let last = performance.now();
    const fr = (now) => { GR.raf = 0; if (!GR.wrap || !GR.wrap.isConnected) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; if (X.V.tab === 3) grottoTick(X, now, dt); if (!RM) GR.raf = requestAnimationFrame(fr); };
    GR.raf = requestAnimationFrame(fr);
  }


  /* ---------------- the Night Market: a sunken plaza, a ritual well in a green circle, a stall for each keeper ---------------- */
  const PLAZA = { w: 192, h: 240, well: [96, 118], pos: { weaver: [36, 54], glass: [156, 54], painter: [36, 120], curio: [156, 120], carpenter: [36, 186], tailor: [156, 186], gullet: [96, 228] } };
  // each stall's look: awning colours and pattern, then its own goods, seen from the plaza (54 x 46)
  const AWN = { weaver: ['#7a2a3a', '#e8c8b0', 'stripe'], painter: ['#4a2a6a', '#e0c070', 'scallop'], glass: ['#7a3a1a', '#d8a050', 'stripe'], carpenter: ['#5a3a20', '#8a6038', 'planks'],
    curio: ['#2e3e4e', '#c8ccd0', 'scallop'], gullet: ['#1e4a6a', '#e8d070', 'stripe'], tailor: ['#1d4a42', '#c8a0c8', 'drape'] };
  const SPAL = { w: ['#3a2616', '#5a3a22', '#1e140a'], W: '#120c06', p: ['#4a3420', '#6a4a2c', '#24180c'], a: ['#7a2a3a', '#a84a5a', '#4a1420'], b: ['#e8c8b0', '#fff0e0', '#a88a70'], k: '#07060a',
    y: '#ffd56a', Y: '#ff9a40', g: ['#2f8a7a', '#6fd0be', '#16463e'], r: ['#a83a3a', '#e06a5a', '#5a1818'], u: ['#3a5aa0', '#6a8ad8', '#1a2a5a'], v: ['#6a3a8a', '#9a6ac0', '#3a1a52'],
    i: ['#b8e0ec', '#ffffff', '#6a9aaa'], f: ['#6a8a96', '#a8c8d0', '#3a5058'], s: ['#9aa0a8', '#e0e4e8', '#5a6068'], o: ['#c87a2a', '#ffb050', '#7a3a10'], e: '#5ef2a0', n: ['#d8cfb8', '#f4ecd8', '#9a907a'], q: ['#6a3020', '#8a4a30', '#3a160e'],
    m: ['#5a6070', '#8a90a0', '#2a2e38'], c: ['#c8a868', '#e8d0a0', '#8a6a40'], t: ['#3a6a5a', '#6aa08a', '#1a3a2e'], l: ['#c8a0c8', '#f0d0f0', '#7a5a7a'] };
  function awning(A, id, w, top, h) {
    const [c1, c2, kind] = AWN[id]; A.pal1 = c1;
    for (let y = top; y < top + h; y++) for (let x = 1; x < w - 1; x++) {
      const band = kind === 'stripe' ? Math.floor(x / 5) % 2 : kind === 'planks' ? (x % 6 === 0 ? 2 : 0) : kind === 'drape' ? Math.floor((x + Math.sin(y) * 2) / 9) % 2 : (y - top > h - 3 ? 1 : 0);
      A.set(x, y, band === 1 ? 'B' : band === 2 ? 'W' : 'A'); }
    if (kind === 'scallop' || kind === 'drape') for (let x = 1; x < w - 1; x += 6) A.ell(x + 3, top + h, 3, 2.2, kind === 'drape' ? 'B' : 'A');
    else for (let x = 1; x < w - 1; x += 5) A.tri(x, top + h, x + 5, top + h, x + 2.5, top + h + 3, Math.floor(x / 5) % 2 && kind === 'stripe' ? 'B' : 'A');
  }
  // the goods each stall shows from the plaza; also used, bigger, inside the stall
  const GOODS = {
    weaver(A, x, y, s) { [0, 1, 2].forEach((i) => { A.rect(x + i * 4 * s, y - 10 * s, 3 * s, 10 * s, i % 2 ? 'r' : 'g'); A.ell(x + i * 4 * s + 1.5 * s, y - 10 * s, 1.5 * s, 1 * s, 'b'); });
      A.rect(x + 13 * s, y - 14 * s, 10 * s, 12 * s, 'r'); for (let j = 0; j < 4; j++) A.tri(x + 18 * s, y - 13 * s + j * 3 * s, x + 15 * s, y - 11.5 * s + j * 3 * s, x + 21 * s, y - 11.5 * s + j * 3 * s, 'b'); },
    painter(A, x, y, s) { A.line(x + 2 * s, y, x + 7 * s, y - 16 * s, 'p'); A.line(x + 13 * s, y, x + 8 * s, y - 16 * s, 'p'); A.rect(x, y - 15 * s, 15 * s, 10 * s, 'c'); A.rect(x + 1 * s, y - 14 * s, 13 * s, 8 * s, 'u'); A.ell(x + 7 * s, y - 10 * s, 4 * s, 2 * s, 'g'); A.set(x + 10 * s, y - 11 * s, 'y');
      [['r', 0], ['y', 1], ['g', 2], ['v', 3]].forEach(([c, i]) => A.ell(x + 18 * s + i * 4 * s, y - 2 * s, 1.6 * s, 1.6 * s, c)); },
    glass(A, x, y, s) { A.rect(x, y - 16 * s, 14 * s, 16 * s, 'm'); for (let j = 0; j < 4; j++) A.line(x, y - 4 * s * j, x + 14 * s, y - 4 * s * j, 'W'); A.ell(x + 7 * s, y - 6 * s, 4 * s, 3.4 * s, 'o'); A.ell(x + 7 * s, y - 6 * s, 2 * s, 1.6 * s, 'y');
      [['u', 0], ['g', 1], ['o', 2], ['e', 3]].forEach(([c, i]) => { A.rect(x + 17 * s + i * 4 * s, y - 6 * s, 3 * s, 6 * s, c); A.rect(x + 18 * s + i * 4 * s, y - 8 * s, 1 * s, 2 * s, c); }); },
    carpenter(A, x, y, s) { A.rect(x, y - 9 * s, 10 * s, 2 * s, 'c'); A.rect(x + 1 * s, y - 7 * s, 1 * s, 7 * s, 'p'); A.rect(x + 8 * s, y - 7 * s, 1 * s, 7 * s, 'p'); A.rect(x + 7 * s, y - 16 * s, 2 * s, 8 * s, 'p');
      A.line(x + 14 * s, y, x + 26 * s, y - 6 * s, 'c'); A.line(x + 14 * s, y - 1 * s, x + 26 * s, y - 7 * s, 'c'); A.rect(x + 16 * s, y - 14 * s, 2 * s, 6 * s, 's'); A.rect(x + 20 * s, y - 15 * s, 4 * s, 2 * s, 's'); A.rect(x + 21 * s, y - 13 * s, 2 * s, 5 * s, 'p'); },
    curio(A, x, y, s) { for (let r = 0; r < 2; r++) { A.rect(x, y - 8 * s * r - 1 * s, 26 * s, 1 * s, 'p'); ['e', 'o', 'l', 'g', 'y'].forEach((c, i) => { A.rect(x + 1 * s + i * 5 * s, y - 8 * s * r - 6 * s, 3 * s, 5 * s, 'i'); A.rect(x + 1.5 * s + i * 5 * s, y - 8 * s * r - 4 * s, 2 * s, 2.6 * s, c); }); }
      A.ell(x + 13 * s, y - 19 * s, 3 * s, 2.6 * s, 'n'); A.set(x + 12 * s, y - 19 * s, 'k'); A.set(x + 14 * s, y - 19 * s, 'k'); },
    gullet(A, x, y, s) { A.rect(x, y - 3 * s, 26 * s, 3 * s, 'i'); [0, 1, 2, 3].forEach((i) => { A.ell(x + 3.5 * s + i * 6 * s, y - 4 * s, 3 * s, 1.4 * s, i % 2 ? 'f' : 's'); A.tri(x + 6 * s + i * 6 * s, y - 4 * s, x + 8 * s + i * 6 * s, y - 6 * s, x + 8 * s + i * 6 * s, y - 2 * s, i % 2 ? 'f' : 's'); });
      [2, 10, 18].forEach((dx) => { A.line(x + dx * s, y - 20 * s, x + dx * s, y - 16 * s, 'n'); A.ell(x + dx * s, y - 12 * s, 1.6 * s, 4 * s, 'f'); A.tri(x + dx * s - 2 * s, y - 7 * s, x + dx * s + 2 * s, y - 7 * s, x + dx * s, y - 9 * s, 'f'); }); },
    tailor(A, x, y, s) { [['t', 0], ['l', 1], ['r', 2]].forEach(([c, i]) => { A.rect(x + i * 5 * s, y - 12 * s, 4 * s, 12 * s, c); A.line(x + i * 5 * s, y - 12 * s, x + i * 5 * s + 4 * s, y - 12 * s, 'b'); });
      A.ell(x + 22 * s, y - 15 * s, 2 * s, 2 * s, 'n'); A.tri(x + 17 * s, y - 2 * s, x + 22 * s, y - 13 * s, x + 27 * s, y - 2 * s, 'v'); A.line(x + 22 * s, y - 2 * s, x + 22 * s, y, 'p'); }
  };
  const BOOTH = {};
  function booth(id) { if (BOOTH[id]) return BOOTH[id];
    const pal = Object.assign({}, SPAL, { A: [AWN[id][0], AWN[id][0], AWN[id][0]], B: [AWN[id][1], AWN[id][1], AWN[id][1]] });
    return (BOOTH[id] = mk(54, 46, pal, (A) => {
      A.rect(3, 10, 48, 26, 'W'); A.rect(3, 12, 2, 32, 'p'); A.rect(49, 12, 2, 32, 'p');
      GOODS[id](A, 12, 34, 1); A.rect(4, 34, 46, 3, 'w'); A.rect(5, 37, 44, 7, 'p');
      for (let x = 8; x < 48; x += 7) A.line(x, 37, x, 43, 'W');
      awning(A, id, 54, 2, 8); A.rect(26, 39, 2, 3, 'y'); A.set(26, 39, 'Y'); }, { ol: '#050407' })); }
  const WELL = mk(40, 30, { s: ['#3a4a4a', '#6a7a76', '#1a2424'], w: ['#0f3a2a', '#2a8a5a', '#06201a'], e: '#5ef2a0', k: '#020604' }, (A) => {
    A.ell(20, 14, 18, 9, 's'); A.ell(20, 13, 14, 6, 'k'); A.ell(20, 14, 12, 5, 'w'); A.rect(2, 14, 36, 8, 's'); A.ell(20, 22, 18, 7, 's');
    for (let x = 4; x < 38; x += 5) A.line(x, 15, x, 26, 'k'); A.set(16, 13, 'e'); A.set(24, 15, 'e'); }, { ol: '#020403' });
  const LANT = mk(8, 14, { i: ['#3a3a42', '#6c6c76', '#1c1c22'], G: '#ffc65e', C: '#fff6cf' }, (A) => { A.rect(3, 0, 2, 2, 'i'); A.rect(1, 2, 6, 1, 'i'); A.rect(1, 3, 6, 7, 'G'); A.rect(3, 5, 2, 3, 'C'); A.rect(4, 3, 1, 7, 'i'); A.rect(0, 10, 8, 2, 'i'); A.rect(3, 12, 2, 2, 'i'); });
  let PLZ = null;
  async function plazaSrc() {
    if (PLZ) return PLZ;
    await loadAll([WELL.src, LANT.src].concat(KEEPERS.map((k) => booth(k.id).src)));
    const c = document.createElement('canvas'); c.width = PLAZA.w; c.height = PLAZA.h; const x = c.getContext('2d'), im = x.createImageData(PLAZA.w, PLAZA.h), d = im.data;
    const [wx, wy] = PLAZA.well;
    for (let y = 0; y < PLAZA.h; y++) for (let X = 0; X < PLAZA.w; X++) {
      const r = Math.hypot(X - wx, (y - wy) * 1.25), ring = Math.floor(r / 11), ang = Math.atan2(y - wy, X - wx), seg = Math.floor((ang + Math.PI) / (Math.PI * 2) * (8 + ring * 4));
      let col = rockCol(X, y, ROCKD, 9, 41, 0.12 - r / 900); if (((ring + seg) % 2) === 0) col = col.map((v) => v * 1.12);
      if (Math.abs(r % 11) < 0.8) col = col.map((v) => v * 0.55);
      const i = (y * PLAZA.w + X) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
    x.putImageData(im, 0, 0);
    // the green summoning circle round the well
    x.save(); x.translate(wx, wy); x.scale(1, 0.8); x.strokeStyle = 'rgba(94,242,160,.75)'; x.lineWidth = 1; x.beginPath(); x.arc(0, 0, 38, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, 33, 0, 7); x.stroke();
    x.beginPath(); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; if (i) x.lineTo(Math.cos(a) * 33, Math.sin(a) * 33); else x.moveTo(Math.cos(a) * 33, Math.sin(a) * 33); } x.stroke(); x.restore();
    x.drawImage(img(WELL.src), wx - 20, wy - 14);
    [[60, 90], [132, 90], [60, 150], [132, 150], [96, 186]].forEach(([lx, ly]) => { x.fillStyle = '#1c1c22'; x.fillRect(lx, ly - 8, 1, 10); x.drawImage(img(LANT.src), lx - 3, ly - 22); });
    KEEPERS.forEach((k) => { const [px, py] = PLAZA.pos[k.id]; x.drawImage(img(booth(k.id).src), px - 27, py - 46); });
    return (PLZ = c.toDataURL());
  }

  /* ---------------- inside a stall: the keeper behind the counter, the stall's own fittings either side ---------------- */
  const INT = {};
  function interior(id) { if (INT[id]) return INT[id];
    const pal = Object.assign({}, SPAL, { A: [AWN[id][0], mixHex(AWN[id][0], '#ffffff', 0.25), mixHex(AWN[id][0], '#000000', 0.4)], B: [AWN[id][1], mixHex(AWN[id][1], '#ffffff', 0.3), mixHex(AWN[id][1], '#000000', 0.35)] });
    return (INT[id] = mk(192, 112, pal, (A) => {
      // back wall: dark planks (stone for the glassblower), the counter below
      for (let y = 14; y < 88; y++) for (let x = 0; x < 192; x++) A.set(x, y, id === 'glass' ? ((Math.floor(y / 5) % 2 ? x + 4 : x) % 10 === 0 || y % 5 === 0 ? 'W' : 'm') : (x % 12 === 0 ? 'W' : 'w'));
      if (id !== 'glass') for (let i = 0; i < 40; i++) A.set(Math.floor(hash(i, 3, 7) * 192), 14 + Math.floor(hash(i, 5, 7) * 72), 'p');
      awning(A, id, 192, 0, 14);
      FIT[id](A);
      A.rect(0, 86, 192, 4, 'c'); A.rect(0, 90, 192, 22, 'p'); for (let x = 6; x < 192; x += 16) A.line(x, 90, x, 112, 'W'); A.line(0, 90, 192, 90, 'W');
      [[8, 18], [176, 18]].forEach(([x, y]) => { A.rect(x + 3, y - 4, 2, 4, 'k'); A.rect(x, y, 8, 10, 'Y'); A.rect(x + 2, y + 2, 4, 6, 'y'); A.rect(x, y + 10, 8, 2, 'k'); });
    }, { ol: false })); }
  function mixHex(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  // each stall's fittings, left and right of the keeper (x 0-64 and 128-192, counter top at y 86)
  const FIT = {
    weaver(A) { // a loom with taut threads, rugs hanging and rolled, baskets of yarn
      A.rect(6, 22, 3, 64, 'p'); A.rect(50, 22, 3, 64, 'p'); A.rect(6, 22, 47, 3, 'p'); A.rect(6, 64, 47, 3, 'p');
      for (let x = 11; x < 50; x += 2) A.line(x, 25, x, 64, 'n'); for (let y = 44; y < 64; y++) for (let x = 11; x < 50; x++) A.set(x, y, Math.floor((x + y) / 4) % 2 ? 'r' : 'b');
      A.rect(9, 70, 44, 6, 'g'); A.ell(18, 80, 7, 6, 'g'); A.ell(34, 81, 6, 5, 'r'); A.ell(48, 82, 5, 4, 'u');
      A.rect(132, 20, 26, 54, 'r'); for (let y = 24; y < 72; y += 8) for (let x = 136; x < 156; x += 8) A.tri(x + 4, y, x, y + 4, x + 8, y + 4, 'b'); for (let x = 132; x < 158; x += 3) A.set(x, 74, 'b');
      [0, 1, 2].forEach((i) => { A.rect(164 + i * 9, 40 + i * 4, 7, 46 - i * 4, ['g', 'u', 'r'][i]); A.ell(167.5 + i * 9, 40 + i * 4, 3.5, 2, 'b'); });
    },
    painter(A) { // an easel with a fresco in progress, pots of pigment, a spattered drop cloth
      A.line(14, 86, 30, 24, 'p'); A.line(50, 86, 34, 24, 'p'); A.rect(10, 30, 46, 34, 'c'); A.rect(12, 32, 42, 30, 'u');
      for (let x = 12; x < 54; x++) { const y = 46 + Math.round(Math.sin(x / 4) * 5); A.rect(x, y, 1, 4, 'g'); } A.ell(44, 40, 5, 4, 'y'); A.set(22, 44, 'e'); A.set(23, 44, 'e');
      [['r', 136], ['y', 150], ['g', 164], ['v', 178]].forEach(([c, x]) => { A.rect(x, 74, 10, 12, 's'); A.rect(x + 1, 72, 8, 3, c); A.line(x + 6, 72, x + 9, 58, 'p'); });
      A.rect(130, 22, 58, 40, 'n'); for (let i = 0; i < 30; i++) A.set(130 + Math.floor(hash(i, 1, 9) * 58), 22 + Math.floor(hash(i, 2, 9) * 40), ['r', 'u', 'y', 'v', 'g'][i % 5]);
      for (let x = 130; x < 188; x += 6) A.ell(x + 3, 62, 3, 2, 'n');
    },
    glass(A) { // a brick furnace with a glowing mouth, shelves of coloured glass, lanterns
      A.rect(26, 14, 12, 16, 'm'); A.rect(25, 14, 14, 2, 's'); A.ell(32, 34, 25, 11, 'q'); A.rect(7, 34, 50, 52, 'q');
      for (let y = 24; y < 86; y++) for (let x = 7; x < 57; x++) if (A.get(x, y) === 'q' && (y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 5) % 10 === 0)) A.set(x, y, 'W');
      A.ell(32, 64, 12, 10, 'k'); A.ell(32, 66, 10, 7, 'o'); A.ell(32, 67, 6.5, 4, 'y'); A.ell(32, 68, 3, 2, 'b'); A.rect(19, 74, 26, 3, 's');
      [[20, 56], [44, 58], [28, 50], [38, 52]].forEach(([x, y]) => A.set(x, y, 'Y'));
      for (let s = 0; s < 3; s++) { A.rect(130, 34 + s * 18, 58, 2, 'p'); ['u', 'g', 'o', 'e', 'v', 'i', 'r'].forEach((c, i) => { const x = 133 + i * 8, h = 6 + ((i + s) % 3) * 2; A.rect(x, 34 + s * 18 - h, 5, h, c); A.rect(x + 2, 34 + s * 18 - h - 3, 1, 3, c); }); }
    },
    carpenter(A) { // timber beams, a sawhorse with a plank, tools on a pegboard, a half-built chair
      A.rect(0, 14, 192, 4, 'p'); A.rect(60, 14, 4, 74, 'p'); A.rect(128, 14, 4, 74, 'p');
      A.rect(8, 24, 44, 30, 'c'); for (let i = 0; i < 12; i++) A.set(10 + (i % 6) * 7, 27 + Math.floor(i / 6) * 22, 'W');
      A.rect(12, 28, 2, 18, 's'); A.rect(10, 26, 6, 3, 'p'); A.rect(22, 28, 12, 3, 's'); A.rect(26, 31, 3, 12, 'p'); A.line(40, 28, 48, 46, 's'); A.rect(38, 26, 4, 4, 'p');
      A.rect(10, 70, 46, 4, 'c'); A.line(14, 74, 10, 86, 'p'); A.line(18, 74, 22, 86, 'p'); A.line(48, 74, 44, 86, 'p'); A.line(52, 74, 56, 86, 'p');
      A.rect(144, 50, 22, 3, 'c'); A.rect(146, 53, 2, 33, 'p'); A.rect(162, 53, 2, 33, 'p'); A.rect(162, 26, 2, 26, 'p'); A.rect(164, 30, 3, 2, 'p');
      for (let i = 0; i < 14; i++) A.set(136 + Math.floor(hash(i, 4, 3) * 50), 82 + Math.floor(hash(i, 6, 3) * 4), 'c');
    },
    curio(A) { // tall shelves of jars, a skull, a clock, a stuffed fish on a board
      for (let side = 0; side < 2; side++) { const x0 = side ? 130 : 6; A.rect(x0, 20, 56, 66, 'W'); A.rect(x0, 20, 2, 66, 'p'); A.rect(x0 + 54, 20, 2, 66, 'p');
        for (let s = 0; s < 4; s++) { const y = 36 + s * 16; A.rect(x0, y, 56, 2, 'p'); for (let i = 0; i < 6; i++) { const x = x0 + 4 + i * 8 + ((s + side) % 2) * 2, h = 7 + ((i * 3 + s + side) % 4); if ((i + s + side) % 5 === 3) continue;
          A.rect(x, y - h, 6, h, 'i'); A.rect(x + 1, y - h + 3, 4, h - 4, ['e', 'o', 'l', 'g', 'y', 'r'][(i + s * 2 + side) % 6]); A.rect(x, y - h - 1, 6, 1, 's'); } } }
      A.ell(34, 15, 5, 4, 'n'); A.set(32, 15, 'k'); A.set(36, 15, 'k'); A.rect(31, 18, 6, 2, 'n');
      A.ell(160, 15, 5, 5, 'c'); A.ell(160, 15, 3.6, 3.6, 'n'); A.line(160, 15, 160, 12, 'k'); A.line(160, 15, 162, 16, 'k');
    },
    gullet(A) { // the fishmonger's: an ice slab with the catch, fish on hooks, a hanging net, salvaged hangings
      A.rect(0, 16, 192, 2, 'n'); [6, 18, 30, 42, 54, 136, 148, 160, 172, 184].forEach((x, i) => { A.line(x, 18, x, 24, 'n'); A.ell(x, 32, 3, 8, i % 2 ? 'f' : 's'); A.tri(x - 4, 42, x + 4, 42, x, 38, i % 2 ? 'f' : 's'); A.set(x - 1, 28, 'k'); });
      for (let y = 46; y < 76; y += 4) for (let x = 6; x < 60; x += 4) { A.set(x, y, 'n'); A.set(x + 2, y + 2, 'n'); }
      A.rect(132, 48, 52, 26, 'c'); A.rect(134, 50, 48, 22, 'u'); A.ell(150, 60, 6, 4, 'y'); A.line(138, 66, 178, 54, 'g');
      A.ring(48, 54, 6, 's'); A.line(48, 48, 48, 60, 's'); A.line(42, 54, 54, 54, 's');
      A.rect(0, 80, 192, 6, 'i'); for (let i = 0; i < 12; i++) { const x = 6 + i * 16; A.ell(x + 5, 80, 6, 2.4, i % 2 ? 'f' : 's'); A.tri(x + 10, 80, x + 14, 77, x + 14, 83, i % 2 ? 'f' : 's'); A.set(x + 1, 79, 'k'); }
    },
    tailor(A) { // swags of fabric, bolts of cloth standing, a mannequin wearing a cloak, a rail of garments
      for (let i = 0; i < 8; i++) for (let x = i * 24; x < i * 24 + 24; x++) { const y = 14 + Math.round(Math.sin((x - i * 24) / 24 * Math.PI) * 8); A.rect(x, 14, 1, y - 14, i % 2 ? 'B' : 'A'); }
      [['t', 6], ['l', 16], ['r', 26], ['v', 36], ['g', 46]].forEach(([c, x], i) => { A.rect(x, 50 - (i % 3) * 6, 8, 36 + (i % 3) * 6, c); A.ell(x + 4, 50 - (i % 3) * 6, 4, 1.6, 'b'); });
      A.ell(150, 34, 4, 5, 'n'); A.rect(148, 38, 4, 4, 'n'); A.tri(136, 82, 150, 40, 164, 82, 'v'); A.tri(142, 82, 150, 44, 158, 82, 'r'); A.rect(149, 82, 2, 4, 'p');
      A.rect(170, 26, 18, 2, 's'); [172, 178, 184].forEach((x, i) => { A.line(x, 28, x, 31, 's'); A.rect(x - 3, 31, 6, 26 - i * 3, ['t', 'l', 'g'][i]); });
    }
  };


  /* ---------------- the dice: DL1 bone carvings on matte black, the wild eye blood red; R3 skitter roll ---------------- */
  const GL = { rec: '#000000', g1: '#6e6452', g2: '#d9ceb4', g3: '#f6eedc', r1: '#3a0604', r2: '#9a1810', r3: '#e09080' };
  const ICON = {};
  function face(f) {
    if (ICON[f]) return ICON[f];
    const n = 32, k = n / 16, c = document.createElement('canvas'); c.width = n; c.height = n; const x = c.getContext('2d');
    const ell = (cx, cy, rx, ry, col, fn) => { x.fillStyle = col; for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) { const dx = (X + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1 && (!fn || fn(X, y))) x.fillRect(X, y, 1, 1); } };
    const E = (cx, cy, rx, ry, col, fn) => ell(cx * k, cy * k, Math.max(0.6, rx * k), Math.max(0.6, ry * k), col, fn), px = (X, Y, col) => { x.fillStyle = col; x.fillRect(Math.round(X), Math.round(Y), 1, 1); };
    if (f === 0) { E(8, 8, 7.8, 5.2, GL.rec); E(8, 8, 6.6, 4, GL.r1); E(8, 8, 5.6, 3.2, GL.r2); E(8, 8, 2.6, 2.6, GL.r3); x.fillStyle = '#000'; x.fillRect(Math.round(7.5 * k), Math.round(4.6 * k), Math.round(k), Math.round(6.8 * k)); }
    else if (f === 1) { const pts = []; for (let t = 0; t <= 1.0001; t += 0.02) pts.push([3.5 + t * 7 + Math.sin(t * 5) * 1.4, 14.5 - t * 9, 2.7 - t * 1.4]);
      for (let u = 0; u <= 1.0001; u += 0.04) { const a = Math.PI + u * 4.2, r = 2 - u * 1.3; pts.push([12.4 + Math.cos(a) * r, 5.5 + Math.sin(a) * r, 1.3 - u * 0.6]); }
      pts.forEach((q) => E(q[0], q[1], q[2] + 1.1, q[2] + 1.1, GL.rec)); pts.forEach((q) => E(q[0], q[1], q[2], q[2], GL.g1)); pts.forEach((q) => E(q[0] - 0.3, q[1] - 0.3, q[2] * 0.6, q[2] * 0.6, GL.g2));
      [8, 20, 32].forEach((i) => { const q = pts[i]; px((q[0] + q[2] * 0.5) * k, q[1] * k, GL.g3); }); }
    else if (f === 2) { const cut = (X, Y) => { const dx = (X + 0.5) / k - 10.6, dy = (Y + 0.5) / k - 6.4; return dx * dx + dy * dy > 22; };
      E(8, 8, 6.8, 6.8, GL.rec, (X, Y) => { const dx = (X + 0.5) / k - 10.6, dy = (Y + 0.5) / k - 6.4; return dx * dx + dy * dy > 15; }); E(8, 8, 5.6, 5.6, GL.g1, cut); E(7.5, 8.3, 4.4, 4.6, GL.g2, cut); px(4 * k, 8 * k, GL.g3); }
    else { const star = (sc, cx, cy) => { const st = []; for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, r = (j % 2 ? 3 : 7.4) * sc; st.push([(cx + Math.cos(a) * r) * k, (cy + Math.sin(a) * r) * k]); } return st; };
      const poly = (pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.fill(); };
      poly(star(1.1, 8, 8.6), GL.rec); poly(star(0.9, 8, 8.6), GL.g2); poly(star(0.42, 8.6, 9.2), GL.g1); px(7 * k, 6 * k, GL.g3); px(8 * k, 5 * k, GL.g3); }
    return (ICON[f] = c.toDataURL());
  }
  const die = (f, cls, i) => '<span class="dn-die' + (f === 0 ? ' eye' : '') + (cls || '') + '"' + (i !== undefined ? ' style="--i:' + i + '"' : '') + ' role="img" aria-label="' + FACES[f] + '"><img src="' + face(f) + '" alt=""></span>';
  const claimTxt = (c) => c.n + ' ' + FACES[c.f] + (c.n > 1 ? 's' : '');
  let DG = null;   // the game at the table: { k, you, him, yd, hd, prev, claimer, phase, pickN, pickF, mem, rev, starter, say, frame, wh }
  function bestTier(k) { const t = KEEP_ITEMS(k).map((i) => TIERS.indexOf(i.tier)); return TIERS[Math.max(0, Math.max.apply(null, t.concat([0])))]; }
  let KEEP_ITEMS = () => [];
  function newGame(X, k) { DG = { k, you: 5, him: 5, starter: 0, trustT: 1, trustN: 2, s: DICE.smarts(X.D.player.level, bestTier(k)) }; ksay(pick(KB[k].L.haggle), 'talk'); DG.wh = pick(WHISPER.start); newRound(X); }
  function ksay(t, frame) { DG.say = t; DG.frame = frame || 'idle'; }
  function newRound(X) {
    Object.assign(DG, { yd: DICE.roll(DG.you), hd: DICE.roll(DG.him), prev: null, claimer: -1, phase: 'roll', pickN: 1, pickF: 1, mem: { named: {}, trust: DG.trustT / DG.trustN }, rev: null });
    X.paint(); setTimeout(() => { if (!DG || DG.phase !== 'roll') return; DG.rolled = true; DG.phase = DG.starter === 0 ? 'you' : 'him'; X.paint(); if (DG.phase === 'him') himTurn(X); }, RM ? 50 : 700);
  }
  function youClaim(X, c) { DG.prev = c; DG.claimer = 0; DG.mem.named[c.f] = true; DG.phase = 'him'; DG.wh = Math.random() < 0.2 ? pick(WHISPER.start) : DG.wh; X.paint(); himTurn(X); }
  function himTurn(X) {
    const g = DG; setTimeout(() => { if (DG !== g || g.phase !== 'him') return;
      const a = DICE.think(g.s, g.hd, g.you, g.prev, g.mem);
      if (a.call) { ksay(pick(KB[g.k].L.call), 'gloat'); return liar(X, 1); }
      g.prev = a.claim; g.claimer = 1; g.phase = 'you'; const nx = DICE.raises(g.prev, g.you + g.him)[0]; if (nx) { g.pickN = nx.n; g.pickF = nx.f; }
      ksay(pick(KB[g.k].L.claim).replace('{c}', claimTxt(a.claim)), 'talk'); X.paint(); }, RM ? 200 : 900 + Math.random() * 600);
  }
  function liar(X, caller) {
    const g = DG, c = g.prev, count = DICE.count(g.yd, c.f) + DICE.count(g.hd, c.f), truth = count >= c.n, loser = truth ? caller : g.claimer;
    if (g.claimer === 0) { g.trustN++; if (truth) g.trustT++; }
    g.phase = 'lift'; X.paint();
    setTimeout(() => { if (DG !== g) return; g.rev = { claim: c, count, loser }; if (loser === 0) g.you--; else g.him--; g.starter = loser; g.phase = g.you && g.him ? 'reveal' : 'over';
      if (loser === 0) { ksay(pick(KB[g.k].L.lose), 'gloat'); g.wh = pick(WHISPER.bad); } else { ksay(pick(['Hm.', 'A lucky cup.', 'Again. Again!']), 'sulk'); g.wh = pick(WHISPER.good); }
      X.paint(); }, RM ? 50 : 700);
  }
  function settle(X, won) {
    const g = DG; g.phase = 'saving'; X.paint();
    X.call('gameHaggle', g.k, won ? 'win' : 'lose').then((s) => { X.setShop(s); g.phase = 'done'; g.won = won; ksay(pick(KB[g.k].L[won ? 'win' : 'lose']), won ? 'sulk' : 'gloat'); X.paint(); })
      .catch((e) => { g.phase = 'done'; g.won = won; g.err = String((e && e.message) || e).replace(/^Error:\s*/, ''); X.paint(); });
  }
  function diceHtml(X) {
    const g = DG, K = KB[g.k], my = g.phase === 'you', tot = g.you + g.him, draft = { n: g.pickN, f: g.pickF }, can = my && DICE.legal(draft, g.prev, tot);
    const pips = (n) => '<span class="dn-pips">' + [0, 1, 2, 3, 4].map((i) => '<i class="' + (i >= n ? 'gone' : '') + '"></i>').join('') + '</span>';
    let h = '<div class="dn-table"><div class="dn-den" style="--lamp:' + K.lamp + '"><img class="dn-kbig" src="' + portrait(g.k, g.frame || 'idle').src + '" alt="' + K.name + '">' +
      '<div class="dn-candle"></div><div class="dn-say"><b>' + K.name + '</b>' + X.esc(g.say || '') + '</div>' +
      (g.wh ? '<div class="dn-wh"><span class="dn-wu">' + X.layers('idle') + '</span><span><b>Ulhu whispers</b>' + X.esc(g.wh) + '</span></div>' : '') + '</div>';
    h += '<div class="dn-bar"><div><small>YOU</small>' + pips(g.you) + '</div><div class="dn-claim">' + (g.prev ? '<small>' + (g.claimer === 0 ? 'You' : K.name) + '</small><b>' + g.prev.n + '</b>' + die(g.prev.f, ' mini') : '<small>' + (g.phase === 'roll' ? 'The cups rattle' : my ? 'You open the bidding' : K.name + ' opens') + '</small>') + '</div><div><small>' + X.esc(K.name.split(' ').pop().toUpperCase()) + '</small>' + pips(g.him) + '</div></div>';
    if (g.phase === 'reveal' || g.phase === 'over' || g.phase === 'saving' || g.phase === 'done') {
      const R = g.rev, row = (l, a) => '<div class="dn-rrow"><small>' + l + '</small><span>' + a.map((f) => die(f, f === R.claim.f || f === 0 ? ' hit' : ' dim')).join('') + '</span></div>';
      if (g.phase === 'done') {
        h += '<div class="dn-res ' + (g.won ? 'ok' : 'bad') + '"><h3>' + (g.won ? 'You win the haggle' : K.name + ' wins the haggle') + '</h3><p>' + (g.won ? '20% off everything at this stall for the rest of today.' : 'Everything at this stall costs 10% more for the rest of today.') + '</p>' +
          (g.err ? '<p class="dn-err">Not saved: ' + X.esc(g.err) + '</p>' : '') + '<button class="dn-big" data-a="dn-leave">Back to the stall</button></div>';
      } else if (!R) h += '<div class="dn-hint">Settling the price...</div>';
      else {
        h += '<div class="dn-rev">' + '<div class="dn-verd"><b>' + R.claim.n + '</b>' + die(R.claim.f, ' mini') + '<span class="' + (R.loser === 0 ? 'bad' : 'ok') + '">' + (R.loser === 0 ? K.name.split(' ').pop() + ' wins' : 'You win') + '</span></div>' + row(K.name.split(' ').pop(), g.hd) + row('You', g.yd) + '</div>' +
          '<button class="dn-big" data-a="dn-next"' + (g.phase === 'saving' ? ' disabled' : '') + '>' + (g.phase === 'reveal' ? 'Next round' : g.phase === 'saving' ? 'Settling the price...' : 'See the price') + '</button>';
      }
      return h + '</div>';
    }
    const roll = g.phase === 'roll', sk = g.rolled ? ' r3' : '';
    h += '<div class="dn-lab">YOUR HAND <span>only you see it</span> <em>Eye is wild</em></div><div class="dn-hand">' + g.yd.map((f, i) => die(f, roll ? ' pre' : sk, i)).join('') + '</div>';
    h += '<div class="dn-pick"><div><div class="dn-lab">HOW MANY</div><div class="dn-step"><button data-a="dn-n" data-v="-1" aria-label="Fewer"' + (!my || g.pickN <= 1 ? ' disabled' : '') + '>&minus;</button><output>' + g.pickN + '</output><button data-a="dn-n" data-v="1" aria-label="More"' + (!my || g.pickN >= tot ? ' disabled' : '') + '>+</button></div></div>' +
      '<div><div class="dn-lab">WHICH FACE</div><div class="dn-faces">' + [1, 2, 3].map((f) => '<button data-a="dn-f" data-v="' + f + '" aria-pressed="' + (g.pickF === f) + '" class="' + (g.pickF === f ? 'on' : '') + '"' + (my ? '' : ' disabled') + '><img src="' + face(f) + '" alt="">' + FACES[f] + '</button>').join('') + '</div></div></div>';
    const minL = DICE.raises(g.prev, tot)[0];
    h += '<div class="dn-hint' + (my && !can && minL ? ' warn' : '') + '">' + (roll ? 'The cups are rattling...' : g.phase === 'lift' ? 'Lifting the cups...' : g.phase === 'him' ? K.name + ' is thinking...' : !minL ? 'Nothing higher is possible. Call Liar!' : !can ? 'Too low. Beat ' + claimTxt(g.prev) + ': more dice, or the same number of a higher face.' : g.prev ? 'Raise the claim, or call Liar! if you doubt it.' : 'Count both hands, Eyes included. Your call.') + '</div>';
    h += '<div class="dn-acts"><button class="claim" data-a="dn-claim"' + (can ? '' : ' disabled') + '>Claim ' + claimTxt(draft) + '</button><button class="liar" data-a="dn-liar"' + (my && g.prev && g.claimer === 1 ? '' : ' disabled') + '>Liar!</button></div>';
    h += '<button class="dn-walk" data-a="dn-walk">' + (g.walkArm ? 'Tap again to walk out (it counts as a loss)' : 'Walk out') + '</button>';
    return h + '</div>';
  }


  /* ---------------- the views ---------------- */
  const SLOTN = { floor: 'Floor', wall: 'Walls', rug: 'Rug', window: 'Window', light: 'Light', corner: 'Corner', furn: 'Seat or table', hang3: 'Left wall', hang4: 'Right wall', prop: 'Ornament' };
  const SLOTK = { floor: 'weaver', rug: 'weaver', wall: 'painter', window: 'glass', light: 'glass', furn: 'carpenter', corner: 'curio', prop: 'curio', hang3: 'gullet', hang4: 'gullet' };
  const hgPrice = (p, res) => { const f = { win: 0.8, lose: 1.1, playing: 1.1 }[res]; return f && p ? Math.round(p * f) : p; };
  const pct = (x, y) => 'left:' + (100 * x / W).toFixed(2) + '%;top:' + (100 * y / H).toFixed(2) + '%';
  let LINE = {};   // what each keeper last said in the stall
  function wears(X) { const out = [], hg = (X.SHOP.haggle || {}).tailor, W2 = X.D.wear || { on: {}, owned: [] };
    X.WCATS.forEach(([c]) => X.WNAMES[c].forEach((_, i) => { const w = X.witem(c + '-' + i); if (!w) return; out.push(Object.assign({}, w, { base: w.price, price: hgPrice(w.price, hg), own: W2.owned.indexOf(w.id) >= 0, on: W2.on[w.cat] === w.id, tier: i >= 10 ? 'Eldritch' : i >= 7 ? 'Fancy' : i >= 3 ? 'Nice' : 'Basic' })); }));
    return out; }
  function itemsOf(X, k) { if (k === 'tailor') return wears(X); return (X.SHOP ? X.SHOP.items : []).filter((i) => KB[k].cats.indexOf(i.category) >= 0).sort((a, b) => a.base - b.base); }
  function artOf(X, it, z) {
    if (it.cat) return '<span class="dn-wart" style="width:' + z + 'px;height:' + z + 'px"><img src="' + X.A.b16.idle + '" class="uz-lay" style="opacity:' + (it.cat === 'skin' ? 1 : 0.35) + ';filter:' + (it.cat === 'skin' ? it.filter : 'none') + '" alt="">' + (it.cat === 'skin' ? '' : '<img src="' + it.src + '" class="uz-lay" style="filter:' + it.filter + '" alt="">') + '</span>';
    const L = X.ROOM.art[it.id] && X.ROOM.art[it.id][it.slots[0]]; if (!L) return ''; const s = Math.min(3, z / L.h, (z + 10) / L.w);
    return '<img src="' + L.art + '" style="width:' + Math.round(L.w * s) + 'px;height:' + Math.round(L.h * s) + 'px;image-rendering:pixelated" alt="">';
  }
  const tag = (X, t) => '<span class="dn-tier" style="color:' + (X.TIERC[t] || '#c8beaa') + '">' + t + '</span>';
  function priceHtml(X, it, key) { return (it.price !== it.base ? '<s>' + it.base + '</s>' : '') + it.price + X.coin(13, it.price, key); }

  function grottoHtml(X) {
    const V = X.V, R = layout(X), names = {}; X.SHOP.items.forEach((i) => { names[i.id] = i.name; });
    let h = '<div class="dn-grot"><div class="dn-stage"></div>';
    Object.keys(SLOTN).forEach((sl) => { const [x, y] = spotOf(sl, R), id = (X.D.room || {})[sl];
      h += '<button class="dn-spot' + (id ? '' : ' empty') + (V.dsel === 'slot:' + sl ? ' on' : '') + '" data-a="dn-slot" data-v="' + sl + '" style="' + pct(x, y) + '" aria-label="' + SLOTN[sl] + ': ' + X.esc(id ? names[id] || 'placed' : 'empty') + '"></button>'; });
    h += '<button class="dn-spot" data-a="dn-ward" style="' + pct(RG.ward.x, RG.ward.y - 22) + '" aria-label="The wardrobe: dress Ulhu"></button>';
    (X.D.hoard || []).slice(0, 6).forEach((r, i) => { const p = RG.chests[i]; h += '<button class="dn-hit" data-a="dn-chest" data-v="' + i + '" style="' + pct(p[0], p[1] - 6) + '" aria-label="Chest: ' + X.esc(r.name) + '"></button>'; });
    h += '<button class="dn-arch" data-a="den" data-v="market" style="' + pct(RG.arch[0], RG.arch[1] - 16) + '" aria-label="Through the archway to the Night Market"><span>Night Market</span></button>';
    h += '<div class="dn-title">The Sanctum</div></div>';
    return h + grottoPanel(X);
  }
  function grottoPanel(X) {
    const V = X.V, sel = V.dsel || '';
    if (sel.indexOf('slot:') === 0) {
      const sl = sel.slice(5), cur = (X.D.room || {})[sl], own = X.SHOP.items.filter((i) => i.own && i.slots.indexOf(sl) >= 0), k = KB[SLOTK[sl]];
      return '<div class="dn-panel"><div class="dn-ph"><b>' + SLOTN[sl] + '</b><button class="dn-x" data-a="dn-close" aria-label="Close">×</button></div><div class="dn-row">' + own.map((i) => {
        const here = cur === i.id; return '<button class="dn-card' + (here ? ' on' : '') + '" data-a="dn-place" data-id="' + i.id + '" data-v="' + sl + '"><span class="dn-art">' + artOf(X, i, 44) + '</span><span class="dn-nm">' + X.esc(i.name) + '</span><span class="dn-st">' + (here ? (sl === 'floor' || sl === 'wall' ? 'In place' : 'Take out') : 'Place here') + '</span></button>'; }).join('') + '</div>' +
        '<button class="dn-go" data-a="dn-go" data-v="' + k.id + '">More ' + SLOTN[sl].toLowerCase() + ' at ' + k.name + '’s stall</button></div>';
    }
    if (sel === 'ward') {
      const W2 = X.D.wear || { on: {}, owned: [] }, own = wears(X).filter((w) => w.own);
      return '<div class="dn-panel"><div class="dn-ph"><b>The wardrobe</b><button class="dn-x" data-a="dn-close" aria-label="Close">×</button></div><p class="dn-note">Tap an outfit to put it on or take it off.</p><div class="dn-row">' + own.map((w) =>
        '<button class="dn-card' + (W2.on[w.cat] === w.id ? ' on' : '') + '" data-a="wear" data-id="' + w.id + '" data-fx="' + w.id + '"><span class="dn-art">' + artOf(X, w, 44) + '</span><span class="dn-nm">' + X.esc(w.name) + '</span><span class="dn-st">' + (W2.on[w.cat] === w.id ? 'Wearing' : 'Wear') + '</span></button>').join('') + '</div>' +
        '<button class="dn-go" data-a="dn-go" data-v="tailor">More at Madame Moray’s stall</button></div>';
    }
    if (sel === 'chest') {
      const hd = X.D.hoard || [];
      let h = '<div class="dn-panel dn-hoard"><div class="dn-ph"><b>The Hoard</b><button class="dn-x" data-a="dn-close" aria-label="Close">×</button></div><p class="dn-note">Each chest holds a reward from the surface. Break its seal to claim it.</p>';
      h += hd.map((r) => { const can = r.cost <= X.D.player.coins;
        return '<div class="dn-rw"><span class="dn-rn"><b>' + X.esc(r.name) + '</b><small>' + (r.claims ? 'claimed ' + r.claims + ' times. ' : '') + (can ? 'You can afford it.' : (r.cost - X.D.player.coins) + ' more to go.') + '</small></span>' +
          (V.edit ? '<button class="dn-x" data-a="harch" data-id="' + r.id + '" aria-label="Remove ' + X.esc(r.name) + '">×</button>' : '') +
          '<button class="dn-seal' + (can ? '' : ' poor') + '" data-a="claim" data-id="' + r.id + '" data-fx="' + r.id + '">' + r.cost + X.coin(15, r.cost, r.id) + '</button>' +
          (V.stamp === r.id ? '<div class="uz-stampbox dn-stamp"><img src="' + X.IMG.wax + '" alt="">CLAIMED</div>' : '') + '</div>'; }).join('') || '<p class="dn-note">No rewards yet. Add one with + Reward.</p>';
      if (hd.length) h += '<button class="dn-go" data-a="edit">' + (V.edit ? 'Stop editing' : 'Edit (remove rewards)') + '</button>';
      return h + '</div>';
    }
    return '<p class="dn-note">Tap a green ring to place or swap your things, the wardrobe to dress Ulhu, a chest to claim a reward, or the archway for the Night Market.</p>';
  }
  function marketHtml(X) {
    if (!PLZ) plazaSrc().then(() => X.paint());
    let h = '<div class="dn-mkt">' + (PLZ ? '<img class="dn-plz" src="' + PLZ + '" alt="">' : '<div class="dn-plz"></div>') + '<div class="dn-mglow"></div>';
    KEEPERS.forEach((k) => { const [x, y] = PLAZA.pos[k.id], res = (X.SHOP.haggle || {})[k.id];
      h += '<button class="dn-booth" data-a="dn-visit" data-v="' + k.id + '" style="left:' + (100 * (x - 30) / PLAZA.w) + '%;top:' + (100 * (y - 48) / PLAZA.h) + '%;width:' + (100 * 60 / PLAZA.w) + '%;height:' + (100 * 62 / PLAZA.h) + '%" aria-label="' + k.name + ', ' + k.what + ': ' + k.trade + '"><span>' + k.name + (res ? ' <i class="' + (res === 'win' ? 'ok' : 'bad') + '">' + (res === 'win' ? '−20%' : '+10%') + '</i>' : '') + '</span></button>'; });
    h += '<div class="dn-mu" style="left:' + (100 * (PLAZA.well[0] - 14) / PLAZA.w) + '%;top:' + (100 * (PLAZA.well[1] + 4) / PLAZA.h) + '%">' + X.layers(X.mood()) + '</div>';
    h += '<button class="dn-back" data-a="den" data-v="room">‹ Sanctum</button></div>';
    return h + '<p class="dn-note"><b>Ulhu:</b> ' + X.esc(pick(ULS)) + '</p>';   // 1U.3 (Patryk 29 Oct): no rules under the plaza, the keepers say what they do
  }
  function stallScene(X, k, frame, say) { const K = KB[k];
    return '<div class="dn-sc" style="--lamp:' + K.lamp + '"><img class="dn-int" src="' + interior(k).src + '" alt=""><img class="dn-kp" src="' + portrait(k, frame).src + '" alt="' + K.name + '"><div class="dn-lampg"></div>' +
      '<div class="dn-say2"><b>' + K.name + '</b>' + X.esc(say) + '</div><button class="dn-back" data-a="den" data-v="market">‹ Market</button></div>'; }
  function stallHtml(X) {
    const k = X.V.stall, K = KB[k], res = (X.SHOP.haggle || {})[k], its = itemsOf(X, k);
    const say = LINE[k] || (LINE[k] = pick(K.L.arrive));
    let h = stallScene(X, k, LINE.f || 'idle', say);
    h += '<div class="dn-kh"><span><b>' + K.name + '</b></span>' +   // 1U.3: no label under the name (the aria-label keeps what and trade for a screen reader)
      (res === 'win' ? '<span class="dn-badge ok">20% off today</span>' : res === 'lose' ? '<span class="dn-badge bad">10% more today</span>' : res === 'playing' ? (DG && DG.k === k ? '<button class="dn-hag" data-a="dn-resume">Back to the dice</button>' : '<span class="dn-badge bad">Walked out: 10% more</span>') : '<button class="dn-hag" data-a="dn-peek">Haggle</button>') + '</div>';
    h += '<div class="dn-wares">' + its.map((i) => {
      const key = i.id, lk = i.cat ? i.lock > X.D.player.level && !i.own : i.locked && !i.own; let a = i.cat ? (i.own ? 'wear' : 'dn-wear') : 'shop', st, cls = '';
      if (i.cat) st = i.on ? 'Wearing' : i.own ? 'Wear' : lk ? 'Level ' + i.lock : priceHtml(X, i, key);
      else st = i.slot ? 'Take out' : i.own ? 'Place' : lk ? X.esc(i.why || 'Locked') : !i.price ? 'Free' : priceHtml(X, i, key);
      if (lk) cls = ' lk'; else if (!i.own && i.price > X.D.player.coins) cls = ' poor'; else if (i.own) cls = ' own';
      return '<button class="dn-ware' + cls + '" data-a="' + a + '" data-id="' + i.id + '" data-fx="' + i.id + '"><span class="dn-art">' + artOf(X, i, 54) + '</span><span class="dn-nm">' + X.esc(i.name) + '</span>' + tag(X, i.tier) + '<span class="dn-st">' + st + '</span></button>'; }).join('') + '</div>';
    return h;
  }
  function peekHtml(X) {
    const k = X.V.stall, K = KB[k], its = itemsOf(X, k), s = DICE.smarts(X.D.player.level, bestTier(k));
    const want = its.filter((i) => !i.own && i.base).sort((a, b) => ((a.cat ? a.lock > X.D.player.level : a.locked) - (b.cat ? b.lock > X.D.player.level : b.locked)) || b.base - a.base).slice(0, 3);
    let h = stallScene(X, k, 'talk', LINE.peek || (LINE.peek = pick(K.L.haggle)));
    h += '<div class="dn-peek"><h3>What you play for</h3>' + want.map((i) => '<div class="dn-pk"><span class="dn-art">' + artOf(X, i, 40) + '</span><span class="dn-nm">' + X.esc(i.name) + tag(X, i.tier) + '</span><span class="dn-pp"><span>' + i.base + X.coin(12, i.base, i.id) + '</span><span class="ok">win ' + hgPrice(i.base, 'win') + '</span><span class="bad">lose ' + hgPrice(i.base, 'lose') + '</span></span></div>').join('') +
      '<p class="dn-how">Win: 20% off here today. Lose: 10% more. One game a day; walking out is a loss. ' + K.name + ' plays <b>' + DICE.label(s) + '</b>.</p>' +   // 1U.3: one line of stakes, no rulebook (the table's own hints guide each move)
      (DG && DG.err0 ? '<p class="dn-err">' + X.esc(DG.err0) + '</p>' : '') +
      '<div class="dn-two"><button class="dn-big" data-a="dn-sit">Sit down and play</button><button class="dn-go" data-a="dn-stall">Not now</button></div></div>';
    return h;
  }
  function render(X) {
    KEEP_ITEMS = (k) => itemsOf(X, k);
    if (!X.SHOP || !X.ROOM) return '<p class="dn-note">Opening the Den…</p>' + X.oracle();
    const v = X.V.den;
    if (v === 'market') return marketHtml(X);
    if (v === 'stall' && KB[X.V.stall]) return stallHtml(X);
    if (v === 'peek' && KB[X.V.stall]) return peekHtml(X);
    if (v === 'dice' && DG) return diceHtml(X);
    return grottoHtml(X) + X.oracle();
  }
  function after(X, body) {
    const st = body.querySelector('.dn-stage');
    if (st) { const w = grottoWrap(); st.appendChild(w); const md = X.mood(); if (GR.md !== md + JSON.stringify(X.D.wear)) { GR.md = md + JSON.stringify(X.D.wear); w.querySelector('.dn-u').innerHTML = X.layers(md); }
      buildGrotto(X).then(() => { if (RM) grottoTick(X, 0, 0); }); grottoLoop(X); if (RM) grottoTick(X, 0, 0); }
    if (DG && DG.rolled && DG.phase === 'you') DG.rolled = false;
    const view = X.V.den + (X.V.stall || ''); if (GR.view !== view) { GR.view = view; const p = body.querySelectorAll('.uz-pane')[3]; if (p && X.V.tab === 3) p.scrollTop = 0; }
  }
  function dock(X) {
    const v = X.V.den, inM = v !== 'room' && !!v, b = (on, a, val, l) => '<button class="sm" data-a="' + a + '" data-v="' + val + '" style="flex:1;border-color:' + (on ? '#ffd56a' : '#2a3b33') + ';background:' + (on ? '#2a2210' : '#131d19') + ';color:' + (on ? '#ffd56a' : '#a9b8ae') + '">' + l + '</button>';
    return b(!inM, 'den', 'room', 'Sanctum') + b(inM, 'den', 'market', 'Night Market') + '<button data-a="form" data-v="reward" style="flex:0 0 auto;padding:0 12px;border-color:#ffd56a;background:#ffd56a;color:#1a1004;font:700 14px var(--a)">+ Reward</button>';
  }
  /* ---------------- the walk to a stall, then eight mist arms from the well close over the view and open on the counter ---------------- */
  function enterStall(X, k) {
    const go = () => { X.V.den = 'stall'; X.V.stall = k; LINE = {}; X.paint(); };
    const mkt = X.body.querySelector('.dn-mkt'), u = mkt && mkt.querySelector('.dn-mu'), fx = X.fx;
    if (RM || !mkt || !u || !fx || !fx.animate) return go();
    const [px, py] = PLAZA.pos[k]; u.style.transition = 'left .7s ease-in-out, top .7s ease-in-out'; u.style.left = (100 * (px - 14) / PLAZA.w) + '%'; u.style.top = (100 * (py - 12) / PLAZA.h) + '%';
    const fr = fx.getBoundingClientRect(), mr = mkt.getBoundingClientRect(), sc = mr.width / PLAZA.w;
    const x0 = mr.left - fr.left + PLAZA.well[0] * sc, y0 = mr.top - fr.top + PLAZA.well[1] * sc, x1 = mr.left - fr.left + px * sc, y1 = mr.top - fr.top + (py - 20) * sc, Wd = fr.width, Ht = fr.height;
    const c = document.createElement('canvas'); c.width = Wd; c.height = Ht; c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;filter:blur(3px)';
    const mist = document.createElement('div'); mist.style.cssText = 'position:absolute;inset:0;opacity:0;background:radial-gradient(circle at ' + x0 + 'px ' + y0 + 'px,rgba(210,255,240,.95),rgba(110,210,180,.9) 45%,rgba(30,100,85,.97))';
    setTimeout(() => {
      fx.appendChild(c); fx.appendChild(mist); const g = c.getContext('2d');
      const blob = (x, y, r, al) => { r = Math.max(2, r); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(205,255,238,' + al + ')'); gr.addColorStop(1, 'rgba(120,220,190,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
      const arms = [-2.6, -1.9, -1.2, -0.5, 0.3, 1.1, 1.9, 2.6].map((a, i) => { const ex = x0 + Math.cos(a) * 520, ey = y0 + Math.sin(a) * 620, w = (i % 2 ? 1 : -1) * 90, c1 = [x0 + Math.cos(a + 0.6) * 110, y0 + Math.sin(a + 0.6) * 120], c2 = [(x0 + ex) / 2 + w, (y0 + ey) / 2 - w * 0.5];
        return (t) => { const b = 1 - t; return [b * b * b * x0 + 3 * b * b * t * c1[0] + 3 * b * t * t * c2[0] + t * t * t * ex, b * b * b * y0 + 3 * b * b * t * c1[1] + 3 * b * t * t * c2[1] + t * t * t * ey]; }; });
      const T0 = performance.now();
      (function step() { const p = Math.min(1, (performance.now() - T0) / 1000), e = 1 - (1 - p) * (1 - p); g.clearRect(0, 0, Wd, Ht);
        arms.forEach((bz, i) => { const len = Math.min(1, e * (1 + (i % 3) * 0.1)), w = 30 + 40 * p; for (let s = 0; s <= len; s += 0.01) { const [x, y] = bz(s); blob(x, y, w * (1 - s * 0.72) + 3, 0.5 * (1 - s * 0.3)); } });
        blob(x0, y0, 60 * e + 20, 0.8); mist.style.opacity = Math.max(0, (p - 0.55) / 0.45);
        if (p < 1) return requestAnimationFrame(step);
        c.remove(); go();
        mist.animate([{ clipPath: 'circle(150% at ' + x1 + 'px ' + y1 + 'px)', opacity: 1 }, { clipPath: 'circle(0% at ' + x1 + 'px ' + y1 + 'px)', opacity: 0.2 }], { duration: 800, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).onfinish = () => mist.remove(); })();
    }, 700);
  }
  /* ---------------- taps (game-ui.js passes every data-a tap here first; true = handled) ---------------- */
  function click(X, a, id, v, b, r) {
    const V = X.V;
    if (a === 'den' && DG && DG.k && ['roll', 'you', 'him', 'lift', 'reveal', 'over'].indexOf(DG.phase) >= 0 && V.den === 'dice') { if (!DG.walkArm) { DG.walkArm = true; X.paint(); return true; } DG.you = 0; settle(X, false); }
    if (a === 'den') { V.dsel = null; if (v === 'room' || v === 'market') return false; }
    if (a.indexOf('dn-') !== 0) { if (a === 'shop' && V.den === 'stall' && KB[V.stall]) { const it = X.SHOP.items.find((x) => x.id === id); if (it && !it.own && !it.locked && it.price <= X.D.player.coins) { LINE[V.stall] = pick(KB[V.stall].L.buy); LINE.f = 'gloat'; } else if (it && !it.own && !it.locked) { LINE[V.stall] = KB[V.stall].L.poor; LINE.f = 'sulk'; } } return false; }
    if (a === 'dn-slot') { V.dsel = V.dsel === 'slot:' + v ? null : 'slot:' + v; X.paint(); return true; }
    if (a === 'dn-ward') { V.dsel = V.dsel === 'ward' ? null : 'ward'; X.paint(); return true; }
    if (a === 'dn-chest') { V.dsel = 'chest'; X.paint(); return true; }
    if (a === 'dn-close') { V.dsel = null; V.edit = false; X.paint(); return true; }
    if (a === 'dn-go') { V.dsel = null; V.den = 'stall'; V.stall = v; LINE = {}; X.paint(); return true; }
    if (a === 'dn-visit') { enterStall(X, v); return true; }
    if (a === 'dn-stall') { V.den = 'stall'; X.paint(); return true; }
    if (a === 'dn-place') {
      const it = X.SHOP.items.find((x) => x.id === id), cur = (X.D.room || {})[v];
      if (cur === id) { if (v === 'floor' || v === 'wall') return true; return X.act({ verb: 'Took out:', name: it.name }, ['gamePlace', id, v], 'gamePlace', [id, ''], (d) => { delete d.room[v]; it.slot = ''; }, X.shopRefresh), true; }
      X.bounce(); X.act({ verb: 'Placed:', name: it.name }, cur ? ['gamePlace', cur, v] : ['gamePlace', id, ''], 'gamePlace', [id, v], (d) => { Object.keys(d.room).forEach((s) => { if (d.room[s] === id) delete d.room[s]; }); d.room[v] = id; it.slot = v; }, X.shopRefresh);
      return true;
    }
    if (a === 'dn-wear') {
      const w = wears(X).find((x) => x.id === id); if (!w) return true;
      if (w.lock > X.D.player.level || w.price > X.D.player.coins) { LINE.tailor = KB.tailor.L.poor; LINE.f = 'sulk'; X.shake(r); X.paint(); return true; }
      LINE.tailor = pick(KB.tailor.L.buy); LINE.f = 'gloat'; X.bounce(); X.setMood('proud', 'Dashing. Truly eldritch.');
      X.act({ verb: 'Bought:', name: w.name, delta: '−' + w.price, unit: 'coin' }, ['gameUnbuy', id], 'gameWear', [id, true], (d) => { d.player.coins -= w.price; d.wear.owned.push(id); d.wear.on[w.cat] = id; });
      return true;
    }
    if (a === 'dn-peek') { V.den = 'peek'; LINE.peek = null; if (DG && DG.err0) DG.err0 = ''; X.paint(); return true; }
    if (a === 'dn-resume') { V.den = 'dice'; X.paint(); return true; }
    if (a === 'dn-sit') {
      const k = V.stall; if (b) b.disabled = true;
      X.call('gameHaggle', k, 'start').then((s) => { X.setShop(s); newGame(X, k); V.den = 'dice'; X.paint(); })
        .catch((e) => { DG = { k: null, err0: String((e && e.message) || e).replace(/^Error:\s*/, '') }; X.paint(); });
      return true;
    }
    if (!DG || !DG.k) return true;
    const g = DG, tot = g.you + g.him;
    if (a === 'dn-n') { g.pickN = Math.max(1, Math.min(tot, g.pickN + Number(v))); X.paint(); return true; }
    if (a === 'dn-f') { g.pickF = Number(v); X.paint(); return true; }
    if (a === 'dn-claim') { const c = { n: g.pickN, f: g.pickF }; if (g.phase === 'you' && DICE.legal(c, g.prev, tot)) { g.walkArm = false; youClaim(X, c); } return true; }
    if (a === 'dn-liar') { if (g.phase === 'you' && g.prev && g.claimer === 1) { g.walkArm = false; liar(X, 0); } return true; }
    if (a === 'dn-next') { if (g.phase === 'reveal') newRound(X); else if (g.phase === 'over') settle(X, g.you > 0); return true; }
    if (a === 'dn-walk') { if (!g.walkArm) { g.walkArm = true; X.paint(); return true; } g.you = 0; settle(X, false); return true; }
    if (a === 'dn-leave') { DG = null; V.den = 'stall'; X.paint(); return true; }
    return true;
  }

  const CSS = `
.dn-grot{position:relative;width:100%;aspect-ratio:192/216;border-radius:8px;overflow:hidden;background:#05090a;border:1px solid #1f3136;box-shadow:inset 0 0 40px rgba(0,0,0,.7)}
.dn-stage,.dn-gw{position:absolute;inset:0}.dn-gw canvas{position:absolute;inset:0;width:100%;height:100%}.dn-cv{image-rendering:pixelated}.dn-sh{mix-blend-mode:multiply}.dn-gl{mix-blend-mode:screen;pointer-events:none}
.dn-u{position:absolute;width:16.67%;aspect-ratio:1;pointer-events:none;transition:transform .2s}.dn-u img,.dn-mu img,.dn-wu img{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
.dn-spot,.dn-hit,.dn-arch{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border:none;background:none;padding:0;z-index:2}
.dn-spot::after{content:'';position:absolute;left:50%;top:50%;width:12px;height:12px;margin:-7px 0 0 -7px;border-radius:50%;border:1.5px solid rgba(125,255,192,.8);box-shadow:0 0 8px rgba(94,242,160,.7),inset 0 0 4px rgba(94,242,160,.6);animation:dnp 2.4s ease-in-out infinite}
.dn-spot.empty::after{border-style:dashed;opacity:.75}.dn-spot.on::after{border-color:#ffd56a;box-shadow:0 0 10px #ffd56a}
@keyframes dnp{50%{transform:scale(1.25);opacity:.7}}
.dn-arch{width:64px;height:64px;margin:-32px 0 0 -32px}.dn-arch span{position:absolute;right:2px;bottom:-6px;white-space:nowrap;font:700 13px var(--a);color:#b6ffd6;text-shadow:0 1px 3px #000,0 0 6px #000}
.dn-title{position:absolute;left:10px;top:8px;font:500 20px var(--g);color:#cfe8dc;text-shadow:0 2px 0 #000;pointer-events:none}
.dn-note{font:13px/1.45 var(--a);color:#9fb3a9;margin:2px 2px}.dn-note b{color:#5ef2a0}
.dn-panel{border-radius:8px;background:linear-gradient(180deg,#121c1a,#0b1210);border:1px solid #23332c;padding:8px}
.dn-ph{display:flex;align-items:center;justify-content:space-between;font:500 19px var(--g);color:#e8e1cf}.dn-x{width:44px;height:44px;border:none;background:none;color:#8a9a92;font:20px var(--a)}
.dn-row{display:flex;gap:6px;overflow-x:auto;padding:4px 0 6px;scrollbar-width:thin}
.dn-card,.dn-ware{flex:none;width:96px;min-height:44px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px;border-radius:6px;border:1.5px solid #23332c;background:#131d19;color:#e0e8e3;text-align:center}
.dn-card.on{border-color:#5ef2a0;background:#14281f}.dn-art{height:56px;display:flex;align-items:center;justify-content:center}.dn-nm{font:700 13px/1.15 var(--a)}.dn-st{display:flex;align-items:center;gap:3px;font:700 13px var(--a);color:#ffd56a}
.dn-st s{color:#8a7a5a;font-weight:400;margin-right:2px}.dn-card .dn-st{color:#9fd8b8}.dn-wart{position:relative;display:block}
.dn-go{width:100%;min-height:44px;margin-top:6px;border-radius:6px;border:1px solid #2f443b;background:#131d19;color:#cfd8d3;font:700 13px var(--a)}
.dn-hoard .dn-rw{position:relative;display:flex;align-items:center;gap:8px;min-height:56px;padding:6px 6px 6px 10px;margin-top:6px;border-radius:5px;background:linear-gradient(180deg,#f3e7c8,#e2d0a4);color:#3a2a16}
.dn-rn{flex:1;min-width:0;display:flex;flex-direction:column}.dn-rn b{font:17px/1.15 var(--f)}.dn-rn small{font:13px var(--a);color:#5a4428}
.dn-seal{flex:none;min-width:84px;height:48px;display:flex;align-items:center;justify-content:center;gap:4px;border-radius:24px;border:none;background:radial-gradient(circle at 40% 35%,#d0404a,#8a1a22 60%,#5a0a12);color:#ffe9dc;font:700 15px var(--a);box-shadow:0 2px 0 rgba(0,0,0,.4),inset 0 0 0 3px rgba(255,180,170,.25)}
.dn-seal.poor{background:#b8a074;color:#6a5434}.dn-stamp{position:absolute;right:100px;top:50%;margin-top:-22px;width:120px;height:44px;display:flex;align-items:center;justify-content:center;gap:6px;border:3px double #8a1a22;border-radius:4px;color:#8a1a22;font:700 20px var(--g);transform:rotate(-10deg);background:rgba(243,231,200,.75);pointer-events:none}.dn-stamp img{width:22px;height:22px}
.dn-mkt{position:relative;width:100%;aspect-ratio:192/240;border-radius:8px;overflow:hidden;background:#06100d;border:1px solid #1f3136}
.dn-plz{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
.dn-mglow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 49%,rgba(94,242,160,.28),transparent 26%),radial-gradient(ellipse at 50% 50%,transparent 45%,rgba(0,0,0,.55));mix-blend-mode:screen}
.dn-booth{position:absolute;border:none;background:none;padding:0;display:flex;align-items:flex-end;justify-content:center}
.dn-booth span{font:700 13px/1.2 var(--a);color:#f0e6cc;background:rgba(8,10,10,.78);border:1px solid #3a3020;border-radius:4px;padding:2px 6px;white-space:nowrap;text-shadow:0 1px 2px #000}
.dn-booth i{display:block;font-style:normal;text-align:center}.ok{color:#5ef2a0}.bad{color:#ff8a70}
.dn-mu{position:absolute;width:14.6%;aspect-ratio:1;pointer-events:none;filter:drop-shadow(0 0 6px rgba(94,242,160,.5))}
.dn-back{position:absolute;left:8px;top:8px;min-height:44px;padding:0 12px;border-radius:6px;border:1px solid #3a4a40;background:rgba(8,14,12,.82);color:#cfe8dc;font:700 14px var(--a);z-index:3}
.dn-sc{position:relative;width:100%;aspect-ratio:192/112;border-radius:8px 8px 0 0;overflow:hidden;background:#0b0907}
.dn-int{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;filter:brightness(.82) saturate(.9)}
.dn-kp{position:absolute;left:35.4%;width:29.2%;bottom:23.2%;image-rendering:pixelated;filter:drop-shadow(0 0 10px rgba(var(--lamp),.35))}
.dn-lampg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 55%,rgba(var(--lamp),.30),transparent 45%),radial-gradient(ellipse at 50% 60%,transparent 50%,rgba(0,0,0,.6));mix-blend-mode:screen}
.dn-say2,.dn-say{position:absolute;right:8px;top:8px;max-width:58%;padding:6px 9px;border-radius:6px;background:rgba(240,230,205,.94);color:#2a1e10;font:italic 14px/1.3 var(--f);box-shadow:0 3px 0 rgba(0,0,0,.35)}
.dn-say2 b,.dn-say b{display:block;font:500 13px var(--g);color:#6a4a20;font-style:normal}
.dn-kh{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#15110c;border:1px solid #3a2c1c;border-top:none;border-radius:0 0 8px 8px}
.dn-kh>span:first-child{flex:1;min-width:0;display:flex;flex-direction:column}.dn-kh b{font:500 20px var(--g);color:#f0e0c0}.dn-kh small{font:13px var(--a);color:#a8987a}
.dn-hag{min-height:44px;padding:0 16px;border-radius:6px;border:1.5px solid #ffd88a;background:linear-gradient(180deg,#e6b45a,#b07a2a);color:#2a1606;font:700 18px var(--g);box-shadow:0 3px 0 rgba(0,0,0,.5)}
.dn-badge{padding:6px 8px;border-radius:5px;border:1px solid currentColor;font:700 13px var(--a)}
.dn-wares{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:6px;margin-top:8px}.dn-ware{width:auto;background:linear-gradient(180deg,#1a1510,#100c08);border-color:#3a2c1c}
.dn-ware.lk{opacity:.55}.dn-ware.lk .dn-st{color:#9a9ab0;font-weight:400}.dn-ware.poor .dn-st{color:#8a7a5a}.dn-ware.own .dn-st{color:#9fd8b8}.dn-tier{font:700 13px var(--a)}
.dn-peek{padding:10px;background:#15110c;border:1px solid #3a2c1c;border-top:none;border-radius:0 0 8px 8px;font:14px/1.45 var(--a);color:#e0d4bc}
.dn-peek h3{margin:0 0 6px;font:500 20px var(--g);color:#ffd56a}.dn-pk{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #2a2016}.dn-pk .dn-art{width:48px;height:44px;flex:none}
.dn-pk .dn-nm{flex:1;min-width:0;display:flex;flex-direction:column;text-align:left}.dn-pp{display:flex;flex-direction:column;align-items:flex-end;font:700 13px var(--a)}.dn-pp>span:first-child{display:flex;align-items:center;gap:3px;color:#ffd56a}
.dn-how{color:#a8987a;font-size:13px}.dn-err{color:#ff8a70;font:700 14px var(--a)}.dn-two{display:grid;grid-template-columns:1.4fr 1fr;gap:8px;align-items:end}
.dn-big{width:100%;min-height:52px;border-radius:8px;border:2px solid #5ef2a0;background:linear-gradient(180deg,#3a5a48,#1f3a2c);color:#eafff3;font:700 20px var(--g);box-shadow:0 3px 0 rgba(0,0,0,.55)}.dn-big:disabled{opacity:.5}
.dn-table{display:flex;flex-direction:column;gap:8px;padding:8px;border-radius:8px;background:#120d09;border:1px solid #3a2a1c}
.dn-den{position:relative;height:210px;margin:-8px -8px 0;border-radius:8px 8px 0 0;overflow:hidden;background:radial-gradient(circle at 50% 45%,rgba(var(--lamp),.22),transparent 55%),repeating-linear-gradient(180deg,#1a130d 0 46px,#2a1d12 46px 49px),#0e0a07}
.dn-den::after{content:'';position:absolute;left:0;right:0;bottom:0;height:46px;background:linear-gradient(180deg,#3a281a,#1d1510);border-top:2px solid #5a4030}
.dn-kbig{position:absolute;left:50%;bottom:40px;width:168px;margin-left:-84px;image-rendering:pixelated;z-index:1}
.dn-candle{position:absolute;left:18%;bottom:40px;width:8px;height:22px;background:linear-gradient(#f4ecd8,#c8bca0);z-index:2;box-shadow:0 -14px 18px 6px rgba(255,192,103,.35)}
.dn-candle::before{content:'';position:absolute;left:1px;top:-9px;width:6px;height:9px;border-radius:50% 50% 40% 40%;background:#ffd56a;box-shadow:0 0 8px #ffc067;animation:dnf .9s ease-in-out infinite alternate}@keyframes dnf{to{transform:scaleY(.8) translateX(1px)}}
.dn-say{top:6px;max-width:64%;z-index:3}.dn-wh{position:absolute;left:6px;bottom:4px;right:28%;display:flex;align-items:center;gap:6px;padding:4px 8px 4px 4px;border-radius:6px;background:rgba(10,30,22,.92);border:1px solid #2a6a4a;font:italic 13px/1.25 var(--f);color:#d8ffe8;z-index:3}
.dn-wh b{display:block;font:700 11px var(--a);letter-spacing:.1em;color:#5ef2a0;font-style:normal}.dn-wu{position:relative;width:36px;height:36px;flex:none}
.dn-bar{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center}.dn-bar>div:not(.dn-claim){display:flex;flex-direction:column;align-items:center;gap:3px}.dn-bar small{font:700 13px var(--a);color:#9a8f7a;letter-spacing:.06em}
.dn-pips{display:flex;gap:2px}.dn-pips i{width:8px;height:11px;border-radius:2px;background:#d9ceb4;border:1px solid #6e6452;box-shadow:inset -1px -1px 0 #9a8f7a}.dn-pips i.gone{background:none;border-color:#4a3828;box-shadow:none}
.dn-claim{min-height:48px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 8px;border-radius:6px;background:#0e0a07;border:1px solid #3a2a1c;font:700 22px var(--a);color:#ece4d0}.dn-claim small{font:500 15px var(--g);color:#ffc067;letter-spacing:0}
.dn-die{position:relative;aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 100% at 30% 20%,#24212a 0%,#0e0d11 55%,#070609 100%);border:1px solid #2a2630;box-shadow:inset 2px 2px 0 rgba(255,236,210,.07),inset 0 -5px 8px rgba(0,0,0,.65),0 4px 8px rgba(0,0,0,.6)}
.dn-die img{width:66%;height:66%;image-rendering:pixelated;filter:drop-shadow(0 1px 0 rgba(0,0,0,.95))}.dn-die.eye img{filter:drop-shadow(0 0 3px rgba(154,24,16,.55))}
.dn-die.mini{width:34px;flex:none}.dn-die.hit{box-shadow:0 0 0 2px #ffc067,0 0 14px rgba(255,192,103,.45);transform:translateY(-3px)}.dn-die.dim{opacity:.55;filter:saturate(.35)}.dn-die.pre{opacity:0}
.dn-die.r3{animation:dnsk .95s cubic-bezier(.15,.7,.3,1) both;animation-delay:calc(var(--i) * 85ms)}
@keyframes dnsk{0%{opacity:0;transform:translate(320px,-14px) rotate(620deg)}10%{opacity:1}30%{transform:translate(120px,0) rotate(250deg)}40%{transform:translate(70px,-8px) rotate(160deg)}52%{transform:translate(30px,0) rotate(70deg)}66%{transform:translate(12px,-3px) rotate(24deg)}80%{transform:translate(3px,0) rotate(5deg)}100%{opacity:1;transform:none}}
.dn-lab{font:700 13px var(--a);letter-spacing:.08em;color:#9a8f7a}.dn-lab span{letter-spacing:0;font-weight:400}.dn-lab em{font-style:normal;color:#ff6a50;letter-spacing:0}
.dn-hand{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;overflow:hidden}
.dn-pick{display:grid;grid-template-columns:minmax(0,120px) minmax(0,1fr);gap:8px;align-items:end}
.dn-step{display:grid;grid-template-columns:44px 1fr 44px;height:58px;border-radius:8px;background:#0e0a07;border:1.5px solid #4a3220;overflow:hidden}.dn-step button{border:none;background:#241a12;font:700 24px var(--a);color:#e9dcc0}.dn-step button:disabled{opacity:.3}
.dn-step output{display:flex;align-items:center;justify-content:center;font:700 28px var(--a);color:#ece4d0}
.dn-faces{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.dn-faces button{height:58px;border-radius:8px;border:1.5px solid #4a3220;background:#0e0d11;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font:700 13px var(--a);color:#9a8f7a;padding:0}
.dn-faces img{width:30px;height:30px;image-rendering:pixelated}.dn-faces button.on{border-color:#ffc067;background:#2c1e12;color:#ece4d0;box-shadow:0 0 12px rgba(255,192,103,.25)}.dn-faces button:disabled{opacity:.35}
.dn-hint{min-height:18px;font:13px var(--a);color:#9a8f7a;text-align:center}.dn-hint.warn{color:#ff9a80}
.dn-acts{display:grid;grid-template-columns:1.5fr 1fr;gap:8px}.dn-acts button{min-height:54px;border-radius:8px;font:700 21px var(--g);border:2px solid;box-shadow:0 3px 0 rgba(0,0,0,.55)}
.dn-acts .claim{background:linear-gradient(180deg,#e6b45a,#b07a2a);border-color:#ffd88a;color:#2a1606}.dn-acts .liar{background:linear-gradient(180deg,#a8321f,#6e1a0e);border-color:#ff7a62;color:#fff1e8}.dn-acts button:disabled{filter:grayscale(.85) brightness(.55)}
.dn-walk{min-height:44px;border:none;background:none;color:#8a7a6a;font:13px var(--a);text-decoration:underline}
.dn-rev{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:8px;background:#0e0a07;border:1px solid #3a2a1c}.dn-rrow{display:grid;grid-template-columns:62px 1fr;align-items:center;gap:6px}.dn-rrow small{font:700 13px var(--a);color:#9a8f7a}
.dn-rrow>span{display:grid;grid-template-columns:repeat(5,minmax(0,44px));gap:5px}.dn-verd{display:flex;align-items:center;gap:10px;font:700 28px var(--a);color:#ece4d0}.dn-verd span{margin-left:auto;font:700 22px var(--g)}
.dn-res{text-align:center;padding:10px;border-radius:8px;background:#0e0a07;border:1px solid #3a2a1c}.dn-res h3{margin:0;font:700 24px var(--g)}.dn-res.ok h3{color:#5ef2a0}.dn-res.bad h3{color:#ff8a70}.dn-res p{font:14px var(--a);color:#e0d4bc}
@media (prefers-reduced-motion:reduce){.dn-spot::after,.dn-candle::before,.dn-die.r3{animation:none}.dn-u{transition:none}}
`;
  function css() { if (document.getElementById('dn-css')) return; const s = document.createElement('style'); s.id = 'dn-css'; s.textContent = CSS; document.head.appendChild(s); }
  root.UZDEN = { render: (X) => { css(); return render(X); }, after, dock, click, KEEPERS, DICE, portrait, reset: () => { DG = null; } };

})(typeof window !== 'undefined' ? window : this);
