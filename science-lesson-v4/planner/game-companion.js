/* Ulhu as a life companion, the page side (Lane D, Big goal 3, 29 Oct 2026). Decisions:
   replica/design/grills/ulhu-companion.md. The server side is Companion.gs; its data rides in every snapshot as D.comp.
   Part 1, sound: big moments only (a tick, a level-up, fainting, Vespers, Ulhu back from the deep). No music, nothing
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
  // one note: frequency (or a slide from f to f2), start, length, wave, loudness
  function note(c, f, t, len, type, vol, f2) {
    const o = c.createOscillator(), g = c.createGain(), at = c.currentTime + t;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + len);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol || 0.12, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + len + 0.02);
  }
  const SOUNDS = {
    tick: (c) => { note(c, 620, 0, 0.09, 'sine', 0.1, 980); },                                                  // a water drop
    vespers: (c) => { [392, 494, 587].forEach((f) => note(c, f, 0, 0.9, 'triangle', 0.05)); },                    // a soft chord
    level: (c) => { [523, 659, 784, 1047].forEach((f, i) => note(c, f, i * 0.09, 0.32, 'triangle', 0.09)); note(c, 1568, 0.38, 0.6, 'sine', 0.05); },
    faint: (c) => { note(c, 330, 0, 0.7, 'sawtooth', 0.04, 110); note(c, 247, 0.12, 0.7, 'sine', 0.06, 82); },
    return: (c) => { [0, 0.07, 0.15, 0.22].forEach((t, i) => note(c, 300 + i * 120, t, 0.08, 'sine', 0.06, 520 + i * 160)); note(c, 880, 0.38, 0.9, 'sine', 0.06); note(c, 1320, 0.38, 0.7, 'sine', 0.025); },
  };
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
      if (m && Date.now() > quietUntil) play(m);
    });
    // browsers only allow sound after a tap: wake the sound up on the first one
    const wake = () => { const c = on() && audio(); if (c && c.state === 'suspended') c.resume(); root.removeEventListener('pointerdown', wake, true); };
    root.addEventListener('pointerdown', wake, true);
  }

  const api = { moment, play, soundOn: on, setSound: setOn, SOUNDS: Object.keys(SOUNDS) };
  root.UZCOMP = Object.assign(root.UZCOMP || {}, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else if (root.document) { if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', watch); else watch(); }
})(typeof window !== 'undefined' ? window : this);
