/* Ulhu as a life companion, the page side (Lane D, Big goal 3, 29 Oct 2026). Decisions:
   replica/design/grills/ulhu-companion.md. The server side is Companion.gs; its data rides in every snapshot as D.comp.
   Part 1, sound (haunted ocarina style since 30 Oct): big moments only (a tick, a level-up, fainting, Vespers, Ulhu back from the deep). No music, nothing
   by time of day, and a switch to turn it off. Sounds are made on the spot (Web Audio), no sound files, nothing paid.
   It needs no hook in game-ui.js: the game saves its screen and fires "ulhuchange" after every change; this file
   compares the screen before and after and plays the moment. Undo and server catch-ups never make a sound twice.
   On the phone a web page cannot read the silent switch: where the browser supports it the sound is marked
   "ambient" (it then obeys silent mode), and the in-app switch is the sure way to keep it quiet. */
(function (root) {
  'use strict';

  /* ---------- what changed: pure, so it is tested in node (planner/tests/companion.test.js) ---------- */
  // good things done today: rituals ticked, sittings, quests done today, blessings (curses never count)
  const one = (g, today) => g.kind === 'daily' ? (g.doneToday ? 1 : 0) : g.kind === 'termly' ? Number(g.sitDone) || 0 : g.kind === 'todo' ? (g.doneOn === today ? 1 : 0)
    : g.polarity === 'both' ? Number(g.bCount) || 0 : g.polarity === 'minus' ? 0 : Number(g.count) || 0;
  const sumTicks = (d) => (d && d.goals ? d.goals.reduce((n, g) => n + one(g, d.today), 0) : 0);
  // the one moment worth a sound between two screens (the biggest wins), or '' for none
  function moment(a, b) {
    if (!a || !b || !a.player || !b.player || a.today !== b.today) return '';
    if ((Number(b.player.deaths) || 0) > (Number(a.player.deaths) || 0)) return 'faint';
    if ((Number(b.player.level) || 0) > (Number(a.player.level) || 0)) return 'level';
    const ra = a.comp && a.comp.adventure, rb = b.comp && b.comp.adventure;
    if (ra && rb && ra.state === 'back' && rb.state === 'home') return 'return';
    if (b.vespers && b.vespers.done && !(a.vespers && a.vespers.done)) return 'vespers';
    if (sumTicks(b) > sumTicks(a)) return 'tick';
    return '';
  }

  /* ---------- the sounds ---------- */
  const KEY = 'ulhuSound';
  const on = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } };
  function setOn(v) { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) { /* private mode */ } }
  let ctx = null;
  function audio() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
    try { if (root.navigator && root.navigator.audioSession) root.navigator.audioSession.type = 'ambient'; } catch (e) { /* not supported */ }
    ctx = new AC(); return ctx;
  }
  // video-game sounds, haunted (Patryk 2026-10-30): "aesthetic but slightly haunted, Ocarina of Time, all those sorts of
  // things". An ocarina-like voice (a soft pure tone with breath and a slow wobble), a cave echo, a faint ghost note an
  // octave below, minor keys. Every tune here is our own; nothing is copied from a game.
  let bus = null;
  // everything plays into one bus: straight out, and through a dark echo that repeats a few times and fades (the cave)
  function out(c) {
    if (bus && bus.c === c) return bus.in;
    const inp = c.createGain(), dl = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter(), wet = c.createGain();
    dl.delayTime.value = 0.27; fb.gain.value = 0.38; lp.type = 'lowpass'; lp.frequency.value = 1800; wet.gain.value = 0.32;
    inp.connect(c.destination); inp.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(c.destination);
    bus = { c, in: inp }; return inp;
  }
  // one plain note: frequency (or a slide from f to f2), start, length, wave, loudness
  function note(c, f, t, len, type, vol, f2) {
    const o = c.createOscillator(), g = c.createGain(), at = c.currentTime + t, v = vol || 0.05;
    o.type = type || 'triangle'; o.frequency.setValueAtTime(f, at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + len);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(v, at + 0.01); g.gain.setValueAtTime(v, at + len * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g); g.connect(out(c)); o.start(at); o.stop(at + len + 0.05);
  }
  // a burst of noise (breath, a splash, a thud), low-passed from f down to f2
  function noise(c, t, len, vol, f, f2) {
    const n = Math.floor(c.sampleRate * len), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain(), at = c.currentTime + t;
    s.buffer = buf; lp.type = 'lowpass'; lp.frequency.setValueAtTime(f, at); lp.frequency.exponentialRampToValueAtTime(f2 || f, at + len);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    s.connect(lp); lp.connect(g); g.connect(out(c)); s.start(at); s.stop(at + len + 0.05);
  }
  // the ocarina: a soft pure tone that swells in, a slow wobble that arrives late, a little breath, and a ghost an
  // octave below, slightly out of tune, very quiet (the haunted part)
  function oca(c, f, t, len, vol) {
    const at = c.currentTime + t, v = vol || 0.09, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.setValueAtTime(f, at); o2.frequency.setValueAtTime(f * 2, at);
    lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(f * 0.012, at + Math.min(0.35, len * 0.6));
    lfo.connect(lg); lg.connect(o.frequency);
    const g2 = c.createGain(); g2.gain.value = 0.08; o2.connect(g2); g2.connect(g);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(v, at + 0.05); g.gain.setValueAtTime(v * 0.85, at + len * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g); g.connect(out(c)); [o, o2, lfo].forEach((x) => { x.start(at); x.stop(at + len + 0.05); });
    noise(c, t, Math.min(0.12, len), v * 0.25, 2600, 1200);                       // the breath at the start
    note(c, f / 2 * 1.006, t + 0.03, len * 1.1, 'sine', v * 0.18);                 // the ghost below
  }
  // note names to frequencies (A4 = 440)
  const N = { A3: 220, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, Ds5: 622.3, E5: 659.3, F5: 698.5, Fs5: 740, G5: 784, Gs5: 830.6, A5: 880, B5: 987.8, C6: 1046.5, D6: 1174.7, E6: 1318.5 };
  const SOUNDS = {
    // a tick: two ocarina notes a fifth apart, and a faint chime in the echo
    tick: (c) => { oca(c, N.D5, 0, 0.12, 0.08); oca(c, N.A5, 0.1, 0.32, 0.08); note(c, N.A5 * 2, 0.1, 0.25, 'sine', 0.012); },
    // Vespers: a slow evening phrase in D minor that comes to rest
    vespers: (c) => { [[N.D5, 0, 0.3], [N.F5, 0.28, 0.3], [N.A5, 0.56, 0.3], [N.G5, 0.84, 0.9]].forEach(([f, t, l]) => oca(c, f, t, l, 0.07)); note(c, N.D4, 0, 1.6, 'sine', 0.05); },
    // level up: rising through A harmonic minor to a bright A, with a quiet sparkle above (eerie, then triumphant)
    level: (c) => { [[N.A4, 0, 0.14], [N.C5, 0.12, 0.14], [N.E5, 0.24, 0.14], [N.Gs5, 0.36, 0.2], [N.A5, 0.54, 0.9]].forEach(([f, t, l]) => oca(c, f, t, l, 0.09));
      [N.E6, N.A5 * 2, N.C6 * 2].forEach((f, i) => note(c, f, 0.6 + i * 0.08, 0.4, 'sine', 0.014)); note(c, N.A3, 0.54, 1.1, 'triangle', 0.08); },
    // fainting: a slow falling half-step line that wavers, then sinks into a breath
    faint: (c) => { [[N.E5, 0], [N.Ds5, 0.3], [N.D5, 0.6]].forEach(([f, t]) => oca(c, f, t, 0.32, 0.07)); oca(c, N.B4, 0.9, 0.9, 0.07); note(c, N.B4, 1.25, 0.8, 'sine', 0.03, N.B4 / 2); noise(c, 1.5, 0.6, 0.05, 700, 150); },
    // back from the deep: a splash, bubbles rising, then a small E minor arpeggio that opens out
    return: (c) => { noise(c, 0, 0.4, 0.12, 2400, 250); [0.15, 0.22, 0.29, 0.36].forEach((t, i) => note(c, 300 + i * 120, t, 0.06, 'sine', 0.06, 620 + i * 200));
      [[N.E5, 0.5, 0.14], [N.G5, 0.62, 0.14], [N.B5, 0.74, 0.14], [N.E6, 0.86, 0.7]].forEach(([f, t, l]) => oca(c, f, t, l, 0.07)); note(c, N.E4, 0.86, 1, 'sine', 0.05); },
  };
  // the ocarina chorus (Patryk 2026-10-30: "a chorus of ocarina sounds, the classic one-esque"): four voices in harmony,
  // each doubled a few cents apart so it shimmers like a small choir. Our own tune: A minor climbing, a turn through G, a
  // lift on E, landing on a bright A major chord. Plays on every 5th level; the plain level-up plays on the others.
  function voice(c, f, t, len, v, cents, rate) {
    const at = c.currentTime + t, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain(), l = c.createOscillator(), lg = c.createGain(), ff = f * Math.pow(2, cents / 1200);
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.setValueAtTime(ff, at); o2.frequency.setValueAtTime(ff * 2, at); g2.gain.value = 0.08; o2.connect(g2); g2.connect(g);
    l.frequency.value = rate; lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(ff * 0.011, at + Math.min(0.35, len * 0.6)); l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(v, at + 0.05); g.gain.setValueAtTime(v * 0.85, at + len * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g); g.connect(out(c)); [o, o2, l].forEach((x) => { x.start(at); x.stop(at + len + 0.05); });
  }
  function choir(c, f, t, len, v) { voice(c, f, t, len, v, -5, 5.0); voice(c, f, t, len, v, 5, 5.6); noise(c, t, Math.min(0.1, len), v * 0.18, 2600, 1200); voice(c, f / 2 * 1.006, t + 0.03, len * 1.1, v * 0.15, 0, 4.4); }
  SOUNDS.chorus = (c) => {
    [[0, 0.17, 440, 329.6, 261.6, 220], [0.16, 0.17, 523.3, 440, 329.6, 220], [0.32, 0.17, 659.3, 523.3, 440, 220], [0.48, 0.17, 587.3, 493.9, 392, 196], [0.64, 0.2, 659.3, 415.3, 329.6, 164.8], [0.84, 1.25, 880, 659.3, 554.4, 220]]
      .forEach((r) => { choir(c, r[2], r[0], r[1], 0.042); choir(c, r[3], r[0], r[1], 0.023); choir(c, r[4], r[0], r[1], 0.018); voice(c, r[5], r[0], r[1] + 0.05, 0.038, 0, 4.6); });
    [1318.5, 1760, 2217.5].forEach((f, i) => voice(c, f, 0.95 + i * 0.09, 0.45, 0.009, 0, 6));
  };
  // which sound a moment plays: the chorus on every 5th level (changeable)
  const soundFor = (m, d) => (m === 'level' && d && d.player && Number(d.player.level) % 5 === 0 ? 'chorus' : m);
  function play(name) {
    if (!on() || !SOUNDS[name]) return false;
    const c = audio(); if (!c) return false;
    try { if (c.state === 'suspended') c.resume(); SOUNDS[name](c); return true; } catch (e) { return false; }
  }

  /* ---------- watching the game's screen (browser only) ---------- */
  let last = null, quietUntil = 0;
  function read() { try { return JSON.parse(root.localStorage.getItem('ulhuD') || 'null'); } catch (e) { return null; } }
  function watch() {
    if (!root.addEventListener || root.UZCOMP_WATCHING) return;
    root.UZCOMP_WATCHING = true;
    last = read();
    quietUntil = Date.now() + 2500;   // the first load and the server's first reply are not moments
    root.addEventListener('ulhuchange', () => {
      const d = read(), m = moment(last, d); last = d;
      if (m && Date.now() > quietUntil) play(soundFor(m, d));
    });
    // browsers only allow sound after a tap: wake the sound up on the first one
    const wake = () => { const c = on() && audio(); if (c && c.state === 'suspended') c.resume(); root.removeEventListener('pointerdown', wake, true); };
    root.addEventListener('pointerdown', wake, true);
  }

  /* ---------- the screens (test build 30 Oct, from Patryk's picks; the letters in brackets are the mock-up options) ----------
     - day tags (A): HOLD the moon and a sheet rises with the week's days; pick a day, tap its tags. A plain tap still changes the moon.
     - overnight (1C-ii): while he is away the ledge is empty, a ghost-green lantern burns and his note hangs on dripping kelp.
     - the morning find (M1): a parchment scroll on two rods hangs under the banner, the find in a stone alcove; the wax seal keeps it.
     - the cabinets (3B, K1): one per act; open one, tap a find for its torn note; eight pieces make the act's page.
     game-ui.js hands this file its helpers once (UZCOMP.attach); everything else lives here. */
  let X = null, BOX = null, BAN = null, LAYER = null, CARD = null, SHEET = null, tucked = '';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const CSS = `
.uzc-layer{position:absolute;inset:0;pointer-events:none;z-index:9}
.uzc-layer>*{pointer-events:auto}
.uz-ban.uzc-away .uz-me{opacity:0;pointer-events:none;transition:opacity .8s}
.uzc-px{image-rendering:pixelated;display:block}
.uzc-px .fl{animation:uzcFl .9s steps(2) infinite}
@keyframes uzcFl{50%{opacity:.7}}
@keyframes uzcFlk{0%,100%{opacity:.75}40%{opacity:.55}55%{opacity:.85}70%{opacity:.62}}
.uzc-pool{position:absolute;width:170px;height:38px;border-radius:50%;filter:blur(6px);background:radial-gradient(ellipse,#3fd08a55,transparent 70%);animation:uzcFlk 2.2s infinite;pointer-events:none}
.uzc-halo{position:absolute;width:84px;height:84px;border-radius:50%;filter:blur(10px);background:radial-gradient(#3fd08a4d,transparent 65%);animation:uzcFlk 2.2s infinite;pointer-events:none}
.uzc-rip{position:absolute;width:28px;height:7px;border:2px solid #6ab8ff;border-radius:50%;opacity:0;animation:uzcRip 3.4s ease-out infinite;pointer-events:none}
@keyframes uzcRip{0%{transform:scale(.3);opacity:.9}100%{transform:scale(3);opacity:0}}
.uzc-note{position:absolute;width:104px;padding:8px 9px 9px;color:#2c3a2a;font:italic 12px/1.22 'IM Fell English',serif;cursor:pointer;background:linear-gradient(180deg,#d8dcc0,#b9c2a0);border-radius:2px 2px 6px 6px;transform-origin:50% -22px;animation:uzcSwing 4s ease-in-out infinite;box-shadow:inset 0 -6px 8px rgba(106,122,90,.35),2px 3px 0 rgba(0,0,0,.55)}
.uzc-note:before{content:"";position:absolute;left:50px;top:-24px;width:2px;height:24px;background:repeating-linear-gradient(180deg,#3f7a4a 0 3px,#2a5a34 3px 6px)}
.uzc-note:after{content:"";position:absolute;left:48px;bottom:-6px;width:4px;height:5px;border-radius:50%;background:#9fd0ff;animation:uzcDrip 2.4s infinite}
@keyframes uzcSwing{50%{transform:rotate(3deg)}}
@keyframes uzcDrip{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(22px);opacity:0}}
.uzc-peg{position:absolute;width:10px;height:6px;border-radius:2px;background:#5a4a3a;box-shadow:inset 0 -2px 0 #2a2018}
.uzc-note.big{position:absolute;left:50%;top:50%;width:250px;padding:18px 20px;font-size:20px;transform:translate(-50%,-50%) rotate(-2deg);z-index:70;animation:none}
.uzc-note.big:before,.uzc-note.big:after{display:none}
.uzc-dim{position:absolute;inset:0;background:rgba(0,0,0,.6);z-index:69}
.uzc-cabb{position:absolute;width:30px;height:39px;border:none;padding:0;background:none;cursor:pointer;z-index:8}
.uzc-cabb.glow{filter:drop-shadow(0 0 6px #ffd56a)}
.uzc-card{position:absolute;left:12px;right:12px;z-index:40;animation:uzcUnroll .8s cubic-bezier(.2,.8,.3,1.2) both;transform-origin:50% 0}
@keyframes uzcUnroll{from{transform:scaleY(.05);opacity:.4}to{transform:none;opacity:1}}
.uzc-scroll{position:relative;margin-top:26px;padding:16px 14px 14px;color:#3a2410;border-radius:3px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9 .06' numOctaves='3' seed='4'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .22 0 0 0 0 .08 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E"),radial-gradient(ellipse at 25% 20%,#fff6d8 0,#f0dfb0 35%,#dcc185 70%,#b8955a 100%);box-shadow:inset 0 0 0 1px rgba(90,58,28,.35),inset 0 0 26px rgba(122,74,24,.55),inset 0 0 6px rgba(70,40,10,.6),4px 10px 16px rgba(0,0,0,.65)}
.uzc-scroll .rod{position:absolute;left:-8px;right:-8px;height:12px;border-radius:6px;background:linear-gradient(180deg,#a87a44,#6a4422 55%,#3a220e);box-shadow:0 2px 3px rgba(0,0,0,.5)}
.uzc-scroll .rod:before,.uzc-scroll .rod:after{content:"";position:absolute;top:-2px;width:10px;height:16px;border-radius:4px;background:linear-gradient(180deg,#e0b860,#8a6a2a)}
.uzc-scroll .rod:before{left:-4px}.uzc-scroll .rod:after{right:-4px}
.uzc-scroll .rod.t{top:-7px}.uzc-scroll .rod.b{bottom:-7px}
.uzc-scroll:before,.uzc-scroll:after{content:"";position:absolute;top:-30px;width:2px;height:24px;background:repeating-linear-gradient(180deg,#8a6a3a 0 3px,#5a4418 3px 6px)}
.uzc-scroll:before{left:40px}.uzc-scroll:after{right:40px}
.uzc-niche{float:left;position:relative;width:74px;height:88px;margin:0 12px 4px 0;padding:5px;border-radius:37px 37px 6px 6px;background:repeating-linear-gradient(0deg,#4a463e 0 13px,#2a2620 13px 15px),#4a463e;box-shadow:inset 0 0 0 2px #2a2620,0 3px 0 #2a2620}
.uzc-niche>div{width:100%;height:100%;border-radius:32px 32px 3px 3px;background:radial-gradient(circle at 50% 62%,#ffe9a8 0,#d9a44e 28%,#6a4218 62%,#2a1608 90%);box-shadow:inset 0 6px 14px rgba(0,0,0,.6),inset 0 0 0 2px #1a0e04;display:flex;align-items:center;justify-content:center}
.uzc-niche:after{content:"";position:absolute;left:12px;right:12px;bottom:2px;height:6px;border-radius:2px;background:linear-gradient(180deg,#6a6458,#3a362e)}
.uzc-niche svg{animation:uzcBob 3.4s ease-in-out infinite}
@keyframes uzcBob{50%{transform:translateY(-4px) rotate(4deg)}}
.uzc-scroll h4{margin:0;font:700 21px 'Grenze Gotisch',serif;color:#5a2a0a;line-height:1.05}
.uzc-scroll .t{font:italic 15px/1.3 'IM Fell English',serif;margin:5px 0 6px}
.uzc-scroll .m{font:700 9.5px 'Atkinson Hyperlegible',sans-serif;letter-spacing:.12em;color:#7a5a30;clear:both;padding-top:4px}
.uzc-scroll .later{position:absolute;right:10px;top:12px;font:700 11px 'Atkinson Hyperlegible',sans-serif;color:#7a5a30;background:none;border:none;cursor:pointer}
.uzc-runes{display:inline-block;padding:3px 9px;border-radius:999px;background:#2a1a08;color:#ffd56a;font:700 12px 'Atkinson Hyperlegible',sans-serif}
.uzc-seal{float:right;position:relative;margin-top:-6px;width:60px;height:60px;border:none;border-radius:50%;background:radial-gradient(circle at 34% 28%,#ff8a70 0,#d23a2a 22%,#9a1a10 58%,#5a0a06 100%);box-shadow:inset -3px -4px 6px rgba(0,0,0,.45),inset 3px 3px 4px rgba(255,180,160,.35);text-shadow:0 1px 0 #5a0a06,0 -1px 0 rgba(255,160,140,.4);color:#ffe0c8;font:700 12px/1.05 'Atkinson Hyperlegible',sans-serif;cursor:pointer;
 clip-path:polygon(50% 0,61% 6%,74% 3%,80% 14%,93% 18%,92% 31%,100% 41%,95% 52%,100% 63%,91% 72%,92% 85%,80% 87%,73% 98%,61% 94%,50% 100%,39% 94%,27% 98%,20% 87%,8% 85%,9% 72%,0 63%,5% 52%,0 41%,8% 31%,7% 18%,20% 14%,26% 3%,39% 6%)}
.uzc-card.grey .uzc-scroll{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9 .06' numOctaves='3' seed='4'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .22 0 0 0 0 .08 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E"),radial-gradient(ellipse at 30% 30%,#dcd8c6,#b4ad94 60%,#8e8770);color:#2c2a22;margin-left:30px;margin-right:30px}
.uzc-card.grey .uzc-niche{width:56px;height:66px}.uzc-card.grey .uzc-niche>div{background:radial-gradient(circle at 50% 60%,#c8ccc8 0,#7a807c 40%,#2a2e2c 85%)}
.uzc-card.grey h4{color:#3a3a32;font-size:18px}
.uzc-card.grey .uzc-seal{width:48px;height:48px;background:radial-gradient(circle at 35% 30%,#7a8a84,#3a4440 70%)}
.uzc-sheet{position:absolute;inset:0;z-index:60;background:#060a09;display:flex;flex-direction:column;animation:uzcRise .35s ease-out both}
@keyframes uzcRise{from{transform:translateY(30px);opacity:0}}
.uzc-top{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid #1b2823}
.uzc-top b{flex:1;font:500 22px 'Grenze Gotisch',serif;color:#c9a560}
.uzc-x{width:38px;height:38px;border-radius:50%;border:1px solid #2f443b;background:#0b1411;color:#cfd8d3;font:700 18px 'Atkinson Hyperlegible',sans-serif;cursor:pointer}
.uzc-scrollarea{flex:1;overflow:auto;padding:12px}
.uzc-hall{display:flex;gap:8px;overflow-x:auto;padding:6px 2px 10px;border-bottom:10px solid #1b2823}
.uzc-mini{flex:none;width:72px;text-align:center;cursor:pointer;background:none;border:none;color:inherit;padding:0}
.uzc-mini .b{position:relative;height:104px;border-radius:34px 34px 4px 4px;background:linear-gradient(90deg,#3a2410,#5a3a1c 30%,#5a3a1c 70%,#3a2410);border:3px solid #1a0e04;box-shadow:inset 0 0 0 3px rgba(138,106,58,.27)}
.uzc-mini .g{position:absolute;inset:13px 8px 16px;border-radius:26px 26px 2px 2px;border:2px solid #1a0e04;background:linear-gradient(160deg,rgba(159,208,255,.13),transparent 50%)}
.uzc-mini .g i{position:absolute;left:3px;right:3px;height:2px;background:#8a6a3a}
.uzc-mini .g s{position:absolute;width:7px;height:7px;border-radius:2px;background:#ffd56a}
.uzc-mini.now .b{box-shadow:inset 0 0 0 3px rgba(138,106,58,.27),0 0 16px rgba(255,213,106,.35)}
.uzc-mini.later{opacity:.42;filter:saturate(.3)}
.uzc-mini.on .b{outline:2px solid #5ef2a0;outline-offset:2px}
.uzc-mini small{display:block;font:700 9px 'Atkinson Hyperlegible',sans-serif;letter-spacing:.1em;color:#7f9389;margin-top:5px}
.uzc-mini span{display:block;font:500 13px/1.05 'Grenze Gotisch',serif;color:#c9a560}
.uzc-big{position:relative;width:300px;height:360px;margin:16px auto 8px;perspective:1400px}
.uzc-big .back{position:absolute;inset:0;border-radius:130px 130px 10px 10px;background:radial-gradient(circle at 50% 30%,#3a2a18,#1a1008 80%);border:5px solid #1a0e04;box-shadow:inset 0 0 0 4px rgba(106,74,36,.4)}
.uzc-big .ti{position:absolute;top:22px;left:0;right:0;text-align:center;font:700 20px 'Grenze Gotisch',serif;color:#e8c878}
.uzc-big .ti small{display:block;font:700 10px 'Atkinson Hyperlegible',sans-serif;letter-spacing:.14em;color:#b8925a}
.uzc-shelves{position:absolute;left:24px;right:24px;top:80px;bottom:24px;display:grid;grid-template-rows:repeat(3,1fr)}
.uzc-sh{display:flex;justify-content:space-around;align-items:flex-end;padding-bottom:8px;border-bottom:7px solid #6a4a24;box-shadow:0 5px 0 rgba(0,0,0,.5)}
.uzc-slot{width:50px;height:50px;display:flex;align-items:center;justify-content:center;border-radius:8px;position:relative;border:none;background:none;padding:0;cursor:pointer}
.uzc-slot.empty{border:2px dashed rgba(184,146,90,.27);cursor:default}
.uzc-slot.found:after{content:"";position:absolute;inset:2px;border-radius:50%;box-shadow:0 0 14px rgba(255,213,106,.27);pointer-events:none}
.uzc-slot.sel{outline:2px solid #5ef2a0;outline-offset:2px}
.uzc-door{position:absolute;top:0;bottom:0;width:50%;background:linear-gradient(90deg,#4a2e12,#6a4626 40%,#4a2e12);border:5px solid #1a0e04;transition:transform 1.1s cubic-bezier(.3,.8,.3,1);z-index:3;box-shadow:inset 0 0 0 4px rgba(138,106,58,.33);pointer-events:none}
.uzc-door.l{left:0;border-radius:130px 0 0 10px;transform-origin:0 50%}
.uzc-door.r{right:0;border-radius:0 130px 10px 0;transform-origin:100% 50%}
.uzc-door i{position:absolute;inset:34px 16px;border:3px solid #1a0e04;background:linear-gradient(160deg,rgba(159,208,255,.2),rgba(11,26,23,.33))}
.uzc-door.l i{border-radius:96px 4px 4px 4px}.uzc-door.r i{border-radius:4px 96px 4px 4px}
.uzc-big.open .uzc-door.l{transform:rotateY(-80deg)}.uzc-big.open .uzc-door.r{transform:rotateY(80deg)}
.uzc-fnote{margin:6px 4px 12px;min-height:60px;padding:12px 14px;color:#3a2410;background:radial-gradient(circle at 20% 30%,#fff3cf,#e6d3a0 70%);font:italic 16px/1.32 'IM Fell English',serif;
 clip-path:polygon(0 3%,10% 0,22% 4%,35% 0,50% 3%,63% 0,78% 4%,90% 0,100% 2%,97% 30%,100% 55%,96% 80%,100% 100%,80% 97%,62% 100%,45% 96%,28% 100%,12% 96%,0 100%,3% 70%,0 45%,3% 20%)}
.uzc-fnote b{display:block;font:700 18px 'Grenze Gotisch',serif;font-style:normal;color:#5a2a0a}
.uzc-fnote small{display:block;font:11px 'Atkinson Hyperlegible',sans-serif;font-style:normal;color:#7a5a30;margin-top:6px}
.uzc-page{padding:12px;border-radius:6px;background:#0b1411;border:1px solid #2f443b;margin-bottom:12px}
.uzc-page h5{margin:0;font:500 19px 'Grenze Gotisch',serif;color:#c9a560}
.uzc-page .c{font:700 10px 'Atkinson Hyperlegible',sans-serif;letter-spacing:.12em;color:#7f9389;margin:2px 0 8px}
.uzc-pieces{display:grid;grid-template-columns:1fr 1fr;gap:3px;background:#1a120a;padding:3px;border-radius:3px}
.uzc-pc{min-height:58px;padding:7px 8px;font:italic 13px/1.28 'IM Fell English',serif;color:transparent;background:#0f0a06}
.uzc-pc.got{color:#3a2410;background:radial-gradient(circle at 30% 30%,#fff3cf,#dcc690 90%)}
.uzc-pc.got:nth-child(odd){clip-path:polygon(0 0,100% 0,97% 20%,100% 45%,96% 70%,100% 100%,0 100%)}
.uzc-pc.got:nth-child(even){clip-path:polygon(3% 0,100% 0,100% 100%,0 100%,4% 75%,0 50%,3% 25%)}
.uzc-pc.sel{box-shadow:inset 0 0 0 2px #c9a560}
.uzc-page.whole .uzc-pieces{gap:0;padding:0}.uzc-page.whole .uzc-pc{clip-path:none;background:#ecdcae}
.uzc-scratch{font:italic 14px/1.35 'IM Fell English',serif;color:#cfd8d3;border-left:2px solid #6b4a9a;padding:3px 10px;margin:6px 0}
.uzc-lbl{font:700 10px 'Atkinson Hyperlegible',sans-serif;letter-spacing:.12em;color:#c9a560;margin:12px 0 6px}
.uzc-odd{display:flex;gap:8px;flex-wrap:wrap}
.uzc-odd button{display:flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:8px;background:#121a17;border:1px solid #2f443b;cursor:pointer}
.uzc-tags{position:absolute;left:0;right:0;bottom:0;z-index:62;padding:12px 12px 16px;background:linear-gradient(180deg,#101a17,#070d0b);border-top:2px solid #3b5047;border-radius:18px 18px 0 0;box-shadow:0 -10px 30px rgba(0,0,0,.6);animation:uzcUp .3s ease-out both}
@keyframes uzcUp{from{transform:translateY(100%)}}
.uzc-tags h4{margin:0 0 8px;font:500 21px 'Grenze Gotisch',serif;color:#c9a560;display:flex;align-items:center;gap:8px}
.uzc-tags h4 span{flex:1}
.uzc-days{display:flex;gap:5px;align-items:stretch}
.uzc-days button.d{flex:1;min-width:0;padding:6px 0 5px;border-radius:10px;border:1px solid #2f443b;background:#0b1411;color:#cfd8d3;font:700 11px 'Atkinson Hyperlegible',sans-serif;cursor:pointer}
.uzc-days button.d b{display:block;font-size:16px}
.uzc-days button.d i{display:block;height:6px;margin:3px auto 0;width:6px;border-radius:50%}
.uzc-days button.d.today{border-color:#c9a560}
.uzc-days button.d.on{background:#5ef2a0;color:#06100c;border-color:#5ef2a0}
.uzc-days button.nav{flex:none;width:28px;border:none;background:none;color:#7f9389;font:700 18px 'Atkinson Hyperlegible',sans-serif;cursor:pointer}
.uzc-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}
.uzc-chips button{padding:9px 13px;border-radius:999px;border:1px solid #415a4f;background:#0b1411;color:#e8e1cf;font:700 13px 'Atkinson Hyperlegible',sans-serif;cursor:pointer}
.uzc-chips button.on{background:#c9a560;border-color:#c9a560;color:#1a0e04}
.uzc-chips button.ill.on{background:#6a8ab8;border-color:#6a8ab8;color:#06100c}
.uzc-tags p{margin:10px 2px 0;color:#9fb1a8;font-size:12px;line-height:1.4}
.uzc-soon{padding:30px 16px;text-align:center;color:#9fb1a8;font:italic 16px 'IM Fell English',serif}
.uzc-tabs{display:flex;gap:6px;padding:8px 12px 0;border-bottom:1px solid #1b2823}
.uzc-tabs button{flex:1;padding:8px 4px;border-radius:10px 10px 0 0;border:1px solid #2f443b;border-bottom:none;background:#0b1411;color:#9fb1a8;font:500 17px 'Grenze Gotisch',serif;cursor:pointer}
.uzc-tabs button.on{background:#1b2823;color:#ffd56a}
`;
  function css() { if (document.getElementById('uzc-css')) return; const st = document.createElement('style'); st.id = 'uzc-css'; st.textContent = CSS; document.head.appendChild(st); }

  /* pixel art: each map row is a string, each letter a colour (f, F and o are the flame, which flickers) */
  function px(map, pal, s) {
    let r = ''; map.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch !== '.' && pal[ch]) r += '<rect x="' + x + '" y="' + y + '" width="1.04" height="1.04" fill="' + pal[ch] + '"' + ('fFo'.indexOf(ch) >= 0 ? ' class="fl"' : '') + '/>'; } });
    return '<svg class="uzc-px" viewBox="0 0 ' + map[0].length + ' ' + map.length + '" width="' + map[0].length * s + '" height="' + map.length * s + '" shape-rendering="crispEdges">' + r + '</svg>';
  }
  const LANT = ['....kBBk....', '...k.kk.k...', '....kBBk....', '..kBBBBBBk..', '.kbbbbbbbbk.', '.kbggggggbk.', '.kbggooggbk.', '.kbgofFogbk.', '.kbgfFFfgbk.', '.kbgoFFogbk.', '.kbgoooogbk.', '.kbggggggbk.', '.kbbbbbbbbk.', '..kBBBBBBk..', '.kkkkkkkkkk.'];
  const LPAL = { k: '#0e1a16', B: '#8fd0b0', b: '#3f7a6a', g: 'rgba(26,74,58,.6)', o: '#3fd08a', f: '#8ff0c4', F: '#eafff4' };   // 1C-ii: an old verdigris lantern, a cold ghost-green flame
  const SPAL = { v: '#4a8a6a', V: '#8fd0b0', B: '#e0b860', b: '#8a6a2a', k: '#2a1a08', d: '#5a3a1c', s: '#2a3438', C: '#9aa8a4', w: '#7a8480', W: '#d0d8dc', r: '#7a5a2a', R: '#b8925a', D: '#2a1a0a', g: '#9fd0ff', G: '#e8f6ff', y: '#ffd56a' };
  const SPR = {
    bell: ['....vvvv....', '...v....v...', '....vvvv....', '.....vV.....', '.....vV.....', '.....vV.....', '....vvVv....', '...vVVVVv...', '..vVVVVVVv..', '..vVVVVVVv..', '...vVVVVv...', '....vvvv....'],
    key: ['..BBBB......', '.B....B.....', '.B....B.....', '..BBBB......', '...bB.......', '...bB.......', '...bB.......', '...bBBBB....', '...bB.......', '...bBBB.....', '...bB.......', '............'],
    plate: ['............', '.bbbbbbbbbb.', '.bBBBBBBBBb.', '.bBBkkkkBBb.', '.bBkBBBBkBb.', '.bBBkkkkkBb.', '.bBBBBBBkBb.', '.bBBBBBkBBb.', '.bBBkkkBBBb.', '.bBBBBBBBBb.', '.bbbbbbbbbb.', '............'],
    paper: ['............', '.WWWWWWWWW..', '.WCCCCCCCWW.', '.WWWWWWWWWW.', '.WCCCCCWWWW.', '.WWWWWWWWWW.', '.WCCCCCCCWW.', '.WWWWWWWWWW.', '.WCCCWWWWWW.', '.WWWWWWWWWW.', '..WWWWWWWWW.', '............'],
    bird: ['...BB.......', '..BBBB......', '..BBBBBBB...', '...BBBBBBB..', '....BBBBB.B.', '.....BB...B.', '.....b......', '.....b......', '..bbbbbbbb..', '.....b......', '.....b......', '....bbb.....'],
    rod: ['........ww..', '.......wWWw.', '.......wWWw.', '........ww..', '.......w....', '......w.....', '.....w......', '.....w......', '......w.....', '.....w......', '....w.......', '...ww.......'],
    coil: ['...rrrrrr...', '..rRRRRRRr..', '.rRrrrrrrRr.', '.rRr....rRr.', '.rRr.RR.rRr.', '.rRr....rRr.', '.rRrrrrrrRr.', '..rRRRRRRr..', '...rrrrrr.r.', '..........r.', '...........r', '............'],
    round: ['............', '............', '............', '....kkkk....', '...kwWWwk...', '..kwWWWwwk..', '..kwwwwwwk..', '..kwwwwwwk..', '...kwwwwk...', '....kkkk....', '............', '............'],
    jar: ['....kkkk....', '....kBBk....', '...kggggk...', '..kgGggggk..', '..kgGgyygk..', '..kgggyygk..', '..kggggggk..', '..kggggggk..', '...kggggk...', '....kkkk....', '............', '............'],
    star: ['.....yy.....', '.....yy.....', '....yyyy....', 'yyyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..', '...yyyyyy...', '...yyyyyy...', '..yyy..yyy..', '..yy....yy..', '.y........y.', '............'],
    bottle: ['....kk......', '....bb......', '...kggk.....', '...kggk.....', '..kgWWgk....', '..kgWCgk....', '..kgWWgk....', '..kgWCgk....', '..kgggGk....', '...kkkk.....', '............', '............']
  };
  const SPR_RX = [['bell', /bell|clapper/i], ['key', /key|hinge|doorknob/i], ['plate', /number|ticket|card|tablet/i], ['paper', /slate|page|music|ledger|list|postcard|paper|bookmark|index|window/i], ['bird', /cockerel|feather|gull|weathervane/i],
    ['rod', /spoon|hook|baton|nail|fork|wick|chess|icicle/i], ['coil', /rope|thread|ribbon|kelp|sail|collar|knot/i], ['jar', /glass|jar|bottle|float|globe|lantern|lens|ink|mirror|breath|snowflake|thimble/i], ['star', /star|flag|crown|cinder/i]];
  const spriteOf = (f) => f.kind === 'lore' ? 'bottle' : (SPR_RX.find((x) => x[1].test(f.name || '')) || ['round'])[0];
  const spr = (f, s) => px(SPR[spriteOf(f)], SPAL, s || 4);
  const CABICON = ['..kkkkkk..', '.kddddddk.', 'kdDDDDDDdk', 'kdDggggDdk', 'kdDgyygDdk', 'kdDDDDDDdk', 'kdDggggDdk', 'kdDgyggDdk', 'kdDDDDDDdk', 'kdDggggDdk', 'kdDDDDDDdk', 'kddddddddk', 'kk......kk'];
  const CPAL = { k: '#1a0e04', d: '#5a3a1c', D: '#7a5228', g: 'rgba(159,208,255,.35)', y: '#ffd56a' };
  // his note for the night: a different one each night
  const NOTES = ['Gone down to the bell. Back by first light. Keep the lamp lit.', 'The lamps are on again down there. I will count them. Back before you wake.', 'Do not wait up. Do not eat my kelp. Back by breakfast.', 'Someone is sweeping the square. I am going to ask why. Home at six.',
    'Following a light that is not mine. Back by six.', 'Gone looking for something small. I will know it when I see it.', 'Down and back. Keep my side of the ledge warm.'];
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };

  /* ---- the banner layer: the lantern and note at night, the cabinet button always ---- */
  function paintBanner() {
    const D = X && X.D; if (!D || !BAN) return;
    if (!LAYER || !BAN.contains(LAYER)) { LAYER = document.createElement('div'); LAYER.className = 'uzc-layer'; BAN.appendChild(LAYER); }
    const adv = (D.comp && D.comp.adventure) || {}, away = adv.state === 'away';
    BAN.classList.toggle('uzc-away', away);
    let h = '<button class="uzc-cabb' + (adv.state === 'back' ? ' glow' : '') + '" data-c="cab" aria-label="The cabinets" style="right:8px;bottom:56px">' + px(CABICON, CPAL, 3) + '</button>';
    if (away) {
      const lx = Math.round((BAN.clientWidth || 360) / 2) - 70;
      h += '<div class="uzc-pool" style="left:' + (lx - 60) + 'px;bottom:4px"></div><div class="uzc-halo" style="left:' + (lx - 18) + 'px;bottom:6px"></div>' +
        '<div style="position:absolute;left:' + lx + 'px;bottom:14px;pointer-events:none">' + px(LANT, LPAL, 4) + '</div>' +
        '<i class="uzc-peg" style="left:' + (lx + 105) + 'px;bottom:128px"></i><div class="uzc-note" data-c="note" style="left:' + (lx + 58) + 'px;bottom:28px">' + esc(NOTES[hash(D.today || '') % NOTES.length]) + '</div>' +
        [0, 1.1, 2.2].map((t) => '<div class="uzc-rip" style="left:' + (lx + 200) + 'px;bottom:8px;animation-delay:' + t + 's"></div>').join('');
    }
    if (LAYER.innerHTML !== h) LAYER.innerHTML = h;
    paintCard();
  }
  /* ---- the morning find: a scroll under the banner (M1); a grey night's is smaller and grey ---- */
  function paintCard() {
    const D = X.D, adv = (D.comp && D.comp.adventure) || {}, f = adv.find;
    if (adv.state !== 'back' || !f || tucked === f.night + (D.today || '')) { if (CARD) { CARD.remove(); CARD = null; } return; }
    const top = (BAN.offsetTop + BAN.offsetHeight - 4) + 'px';
    if (CARD && CARD.dataset.n === f.night) { CARD.style.top = top; return; }
    if (CARD) CARD.remove();
    const grey = /^small:/.test(f.fid || ''), more = (adv.waiting || 1) - 1;
    CARD = document.createElement('div'); CARD.className = 'uzc-card' + (grey ? ' grey' : ''); CARD.dataset.n = f.night; CARD.style.top = top;
    CARD.innerHTML = '<div class="uzc-scroll"><i class="rod t"></i><i class="rod b"></i><button class="later" data-c="later">later</button><div class="uzc-niche"><div>' + spr(f, grey ? 3 : 5) + '</div></div>' +
      '<h4>' + esc(f.kind === 'lore' ? 'A note in a bottle' : f.name) + '</h4><div class="t">' + esc(f.text) + '</div>' +
      (f.runes ? '<span class="uzc-runes">+' + f.runes + ' runes</span>' : '') + '<button class="uzc-seal" data-c="keep">' + (grey ? 'Keep' : 'Keep<br>it') + '</button>' +
      '<div class="m">' + (grey ? 'A GREY NIGHT. HE WENT ANYWAY.' : esc(((f.act || '') + (more > 0 ? ' · AND ' + more + ' MORE' : '')).toUpperCase())) + '</div></div>';
    BOX.appendChild(CARD);
  }
  function keep() {
    const f = X.D.comp.adventure.find;
    X.act({ verb: 'Kept:', name: f.kind === 'lore' ? 'a note in a bottle' : f.name }, ['gameLoad'], 'gameFindTake', [], (d) => { d.comp = Object.assign({}, d.comp, { adventure: Object.assign({}, d.comp.adventure, { state: 'home', find: null, waiting: 0 }) }); if (f.runes) d.player.coins += f.runes; });
    if (CARD) { CARD.remove(); CARD = null; }
    if (X.setMood) X.setMood('happy', f.kind === 'lore' ? 'I found it floating. I did not read it first. Much.' : 'For the cabinet. Careful, it is older than both of us.');
  }

  /* ---- the cabinets (3B, K1) ---- */
  let CABS = null, openAct = 0, selObj = -1;
  function cabinets() {
    TAB = 'cab';
    sheet('Cabinets', '<div class="uzc-soon">Opening the cabinets...</div>');
    X.call('gameCabinets').then((c) => { CABS = c; openAct = openAct || c.now; selObj = -1; paintCabs(true); }).catch((e) => sheet('Cabinets', '<div class="uzc-soon">The cabinets would not open: ' + esc((e && e.message) || e) + '</div>'));
  }
  function mini(a) {
    let g = ''; for (let s = 0; s < 3; s++) g += '<i style="top:' + (18 + s * 22) + 'px"></i>';
    for (let k = 0; k < a.pieces; k++) g += '<s style="left:' + (7 + (k % 3) * 12) + 'px;top:' + (9 + Math.floor(k / 3) * 22) + 'px"></s>';
    return '<button class="uzc-mini ' + a.state + (a.act === openAct ? ' on' : '') + '" data-c="act" data-v="' + a.act + '"><div class="b"><div class="g">' + g + '</div></div><small>ACT ' + ROMAN[a.act - 1] + '</small><span>' + esc(a.name) + '</span></button>';
  }
  function paintCabs(swing) {
    const a = CABS.acts[openAct - 1], later = a.state === 'later', o = a.objects[selObj];
    let sh = ''; for (let r = 0; r < 3; r++) { sh += '<div class="uzc-sh">'; for (let c = 0; c < 3; c++) { const i = r * 3 + c, ob = a.objects[i]; if (!ob) { sh += '<span style="width:50px"></span>'; continue; }
      sh += ob.found ? '<button class="uzc-slot found' + (i === selObj ? ' sel' : '') + '" data-c="obj" data-v="' + i + '" aria-label="' + esc(ob.name) + '">' + spr({ name: ob.name }, 4) + '</button>' : '<span class="uzc-slot empty"></span>'; } sh += '</div>'; }
    let h = '<div class="uzc-hall">' + CABS.acts.map(mini).join('') + '</div>' +
      '<div class="uzc-big' + (swing ? '' : ' open') + '"><div class="back"></div><div class="ti"><small>ACT ' + ROMAN[a.act - 1] + '</small>' + esc(a.name) + '</div><div class="uzc-shelves">' + sh + '</div><div class="uzc-door l"><i></i></div><div class="uzc-door r"><i></i></div></div>';
    if (later) h += '<div class="uzc-soon">This act has not begun. The cabinet waits, dusty.</div>';
    else {
      h += o ? '<div class="uzc-fnote"><b>' + esc(o.name) + '</b>"' + esc(o.piece) + '"<small>' + esc(o.line) + '</small></div>' : '<div class="uzc-soon" style="padding:6px">' + (a.pieces ? 'Tap a find for its note.' : 'Nothing yet. He brings the first piece back after a Vespers.') + '</div>';
      h += '<div class="uzc-page' + (a.pieces === 8 ? ' whole' : '') + '"><h5>The page of ' + esc(a.name) + '</h5><div class="c">' + a.pieces + ' OF 8 PIECES</div><div class="uzc-pieces">' +
        a.objects.map((x, i) => '<div class="uzc-pc' + (x.found ? ' got' : '') + (i === selObj ? ' sel' : '') + '">' + esc(x.found ? x.piece : '') + '</div>').join('') + '</div></div>';
      if (a.lore.length) h += '<div class="uzc-lbl">SCRATCHED INSIDE THE CABINET</div>' + a.lore.map((l) => '<div class="uzc-scratch">' + esc(l.text) + '</div>').join('');
    }
    if (CABS.odd.length) h += '<div class="uzc-lbl">ODD LITTLE THINGS (GREY NIGHTS AND BETWEEN ACTS)</div><div class="uzc-odd">' + CABS.odd.map((x, i) => '<button data-c="odd" data-v="' + i + '" aria-label="' + esc(x.name || 'a note') + '">' + spr(x, 3) + '</button>').join('') + '</div><div class="uzc-oddn"></div>';
    sheet('Cabinets', h);
    if (swing) setTimeout(() => { const b = SHEET && SHEET.querySelector('.uzc-big'); if (b) b.classList.add('open'); }, 60);
  }

  /* ---- a full sheet over the game, and the day-tag sheet that rises from the bottom ---- */
  function sheet(title, html) {
    if (!SHEET || !BOX.contains(SHEET)) { SHEET = document.createElement('div'); SHEET.className = 'uzc-sheet'; BOX.appendChild(SHEET); }
    const sa = SHEET.querySelector('.uzc-scrollarea'), y = sa ? sa.scrollTop : 0;
    const tabs = [['cab', 'Cabinets'], ['term', 'Becoming'], ['focus', 'Focus']].map((t) => '<button class="' + (t[0] === TAB ? 'on' : '') + '" data-c="tab" data-v="' + t[0] + '">' + t[1] + '</button>').join('');
    SHEET.innerHTML = '<div class="uzc-top"><b>' + esc(title) + '</b><button class="uzc-x" data-c="close" aria-label="Close">x</button></div><div class="uzc-tabs">' + tabs + '</div><div class="uzc-scrollarea">' + html + '</div>';
    if (y) SHEET.querySelector('.uzc-scrollarea').scrollTop = y;
  }
  const closeSheet = () => { if (SHEET) SHEET.remove(); SHEET = null; };
  // the other two tabs live in their own files: the term page (companion-term.js) and focus crafts (companion-focus.js)
  let TAB = 'cab';
  function openTab(t) {
    TAB = t; if (t === 'cab') return cabinets();
    const mod = t === 'term' ? root.UZCOMP_TERM : root.UZCOMP_FOCUS, title = t === 'term' ? 'Who I am becoming' : 'Focus';
    sheet(title, mod ? '<div class="uzc-mod"></div>' : '<div class="uzc-soon">Not here yet.</div>');
    if (mod) mod.render(SHEET.querySelector('.uzc-mod'), X);
  }

  let TAGS = null, tagWeek = 0, tagDay = '';
  const addDays = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const monday = (d) => addDays(d, -((new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7));
  function dayTags(open) {
    const D = X.D, c = D.comp || {}; if (!c.tags) return;
    if (open) { tagWeek = 0; tagDay = D.today; }
    if (!TAGS || !BOX.contains(TAGS)) { TAGS = document.createElement('div'); TAGS.className = 'uzc-tags'; BOX.appendChild(TAGS); }
    const m0 = addDays(monday(D.today), tagWeek * 7), days = [], dn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) days.push(addDays(m0, i));
    const has = (c.days && c.days[tagDay]) || [], early = addDays(D.today, -7);
    TAGS.innerHTML = '<h4><span>Tag a day</span><button class="uzc-x" data-c="tagsx" aria-label="Close">x</button></h4>' +
      '<div class="uzc-days"><button class="nav" data-c="wk" data-v="-1"' + (tagWeek <= -1 ? ' disabled style="opacity:.2"' : '') + ' aria-label="Week before">&lsaquo;</button>' +
      days.map((d, i) => { const t = (c.days && c.days[d]) || [], ill = t.indexOf('Ill') >= 0, gone = d < early;
        return '<button class="d' + (d === tagDay ? ' on' : '') + (d === D.today ? ' today' : '') + '" data-c="day" data-v="' + d + '"' + (gone ? ' disabled style="opacity:.3"' : '') + '>' + dn[i] + '<b>' + Number(d.slice(8)) + '</b><i style="background:' + (ill ? '#6a8ab8' : t.length ? '#c9a560' : 'transparent') + '"></i></button>'; }).join('') +
      '<button class="nav" data-c="wk" data-v="1"' + (tagWeek >= 1 ? ' disabled style="opacity:.2"' : '') + ' aria-label="Week after">&rsaquo;</button></div>' +
      '<div class="uzc-chips">' + c.tags.map((t) => '<button class="' + (has.indexOf(t) >= 0 ? 'on' : '') + (t === 'Ill' ? ' ill' : '') + '" data-c="tag" data-v="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' +
      '<p>' + (has.indexOf('Ill') >= 0 ? 'Ill: the moon goes dark and curses that day cost no health. Ulhu cannot faint from being ill.' : 'Tags just remember what the day held. They change nothing. Ill is the one that protects Ulhu.') + '</p>';
  }
  function toggleTag(tag) {
    const D = X.D, day = tagDay, on = (((D.comp.days || {})[day]) || []).indexOf(tag) < 0;
    X.act({ verb: on ? 'Tagged:' : 'Untagged:', name: tag + ', ' + day }, ['gameDayTag', day, tag, !on], 'gameDayTag', [day, tag, on], (d) => {
      const ds = Object.assign({}, d.comp.days), t = (ds[day] || []).filter((x) => x !== tag); if (on) t.push(tag); if (t.length) ds[day] = t; else delete ds[day];
      d.comp = Object.assign({}, d.comp, { days: ds }); if (tag === 'Ill' && day === d.today) { d.comp.ill = on; if (on) { d.moon = 'dark'; d.frozen = true; } } });
    dayTags(false);
  }

  /* ---- taps, and the hold on the moon ---- */
  let holdT = 0, held = false;
  function onDown(e) {
    const m = e.target.closest && e.target.closest('.uz-moonb'); if (!m || !BOX.contains(m)) return;
    held = false; clearTimeout(holdT);
    holdT = setTimeout(() => { held = true; try { if (navigator.vibrate) navigator.vibrate(15); } catch (er) { /* no buzz */ } dayTags(true); }, 550);
  }
  const onUp = () => clearTimeout(holdT);
  function onClick(e) {
    if (held && e.target.closest && e.target.closest('.uz-moonb')) { e.stopPropagation(); e.preventDefault(); held = false; return; }
    const b = e.target.closest && e.target.closest('[data-c]'); if (!b || !BOX.contains(b)) return;
    e.stopPropagation(); const c = b.dataset.c, v = b.dataset.v;
    if (c === 'cab') openTab(TAB);
    else if (c === 'tab') openTab(v);
    else if (c === 'close') closeSheet();
    else if (c === 'act') { openAct = Number(v); selObj = -1; paintCabs(true); }
    else if (c === 'obj') { selObj = Number(v); paintCabs(false); }
    else if (c === 'odd') { const x = CABS.odd[Number(v)], n = SHEET.querySelector('.uzc-oddn'); if (n) n.innerHTML = '<div class="uzc-fnote"><b>' + esc(x.name || 'A note in a bottle') + '</b>' + esc(x.text) + '</div>'; }
    else if (c === 'keep') keep();
    else if (c === 'later') { tucked = CARD.dataset.n + (X.D.today || ''); CARD.remove(); CARD = null; }
    else if (c === 'note') { const dim = document.createElement('div'); dim.className = 'uzc-dim'; dim.dataset.c = 'undim'; const n = b.cloneNode(true); n.className = 'uzc-note big'; n.dataset.c = 'undim'; n.removeAttribute('style'); BOX.appendChild(dim); BOX.appendChild(n); }
    else if (c === 'undim') BOX.querySelectorAll('.uzc-dim,.uzc-note.big').forEach((x) => x.remove());
    else if (c === 'tagsx') { TAGS.remove(); TAGS = null; }
    else if (c === 'wk') { tagWeek = Math.max(-1, Math.min(1, tagWeek + Number(v))); dayTags(false); }
    else if (c === 'day') { tagDay = v; dayTags(false); }
    else if (c === 'tag') toggleTag(v);
  }
  // game-ui.js calls this once with its helpers (act, call, D, setMood ...) and its box
  function attach(x, box) {
    if (BOX === box) return;
    X = x; BOX = box; BAN = box.querySelector('.uz-ban'); css();
    box.addEventListener('pointerdown', onDown, true); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => box.addEventListener(ev, onUp, true));
    box.addEventListener('click', onClick, true);
    box.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest('.uz-moonb')) e.preventDefault(); });
    root.addEventListener('ulhuchange', () => { paintBanner(); if (TAGS && BOX.contains(TAGS)) dayTags(false); });
    paintBanner();
  }

  const api = { moment, play, soundOn: on, setSound: setOn, SOUNDS: Object.keys(SOUNDS), soundFor, attach };
  root.UZCOMP = Object.assign(root.UZCOMP || {}, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else if (root.document) { if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', watch); else watch(); }
})(typeof window !== 'undefined' ? window : this);
