// Eyes-free behaviour entry (lanes/design-eyes-free.md): draw a pupil's initial with a thumb anywhere on the
// screen, then one tap = positive, two taps = negative, three taps = the pupil's menu. Pure rules and maths, no
// server calls, no pupil data kept beyond the list the page passes in. Used by the phone page's "Blind" mode, the
// mock-up (lanes/mockups/eyes-free.html) and the checks (window.EyesFree in a page, require() in node).
//
// The letter recogniser is the $P point-cloud recogniser (Vatavu, Anthony and Wobbrock, 2012): it does not care how
// many strokes a letter took, in what order, or in which direction, which is what a thumb drawing without looking
// needs. Built-in block capitals get it going; the letters Patryk draws himself are kept as extra templates and win.
(function (root) {
  'use strict';
  var N = 48;   // points per cloud after resampling

  // ------------------------------------------------------------------ geometry
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y, da = (a.a !== undefined && b.a !== undefined) ? Math.abs(a.a - b.a) : 0; return Math.sqrt(dx * dx + dy * dy + 0.35 * da * da); }
  // strokes: [[{x,y},...], ...]  ->  one flat list with a stroke id per point
  function flatten(strokes) {
    var out = [];
    strokes.forEach(function (s, id) { s.forEach(function (p) { out.push({ x: p.x, y: p.y, id: id }); }); });
    return out;
  }
  function pathLength(pts) {
    var d = 0;
    for (var i = 1; i < pts.length; i++) if (pts[i].id === pts[i - 1].id) d += dist(pts[i - 1], pts[i]);
    return d;
  }
  // n points spread evenly along the path (never jumping across a pen lift)
  function resample(pts, n) {
    pts = pts.map(function (p) { return { x: p.x, y: p.y, id: p.id }; });
    var I = pathLength(pts) / (n - 1), D = 0, out = [pts[0]];
    if (!(I > 0)) { while (out.length < n) out.push(pts[0]); return out; }
    for (var i = 1; i < pts.length; i++) {
      if (pts[i].id === pts[i - 1].id) {
        var d = dist(pts[i - 1], pts[i]);
        if (D + d >= I && d > 0) {
          var t = (I - D) / d;
          var q = { x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y), id: pts[i].id };
          out.push(q); pts.splice(i, 0, q); D = 0;
        } else D += d;
      }
    }
    while (out.length < n) out.push(pts[pts.length - 1]);
    return out.slice(0, n);
  }
  // scale so the longer side is 1 (shape kept), then move the centroid to 0,0
  function normalise(pts) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(function (p) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    var sx = (maxX - minX) || 1, sy = (maxY - minY) || 1; if (sx / sy < 0.25) sx = sy; if (sy / sx < 0.25) sy = sx;
    var cx = 0, cy = 0;
    var out = pts.map(function (p) { var q = { x: (p.x - minX) / sx, y: (p.y - minY) / sy, id: p.id }; cx += q.x; cy += q.y; return q; });
    cx /= out.length; cy /= out.length;
    return out.map(function (p) { return { x: p.x - cx, y: p.y - cy, id: p.id }; });
  }
  // the cloud a letter becomes, plus its proportions (a thin letter like I or L must not match a square one)
  function cloud(strokes) {
    var flat = flatten(strokes);
    if (!flat.length || pathLength(flat) === 0) return null;   // nothing, or a dot
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    flat.forEach(function (p) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    var w = maxX - minX, h = maxY - minY;
    return { points: angles(normalise(resample(flat, N))), aspect: Math.min(w, h) / (Math.max(w, h) || 1), strokes: strokes.length };
  }
  // $P+: each point also carries how sharply the path turns there (0 straight, 1 a full reversal), so a curve and a corner differ
  function angles(pts) {
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i - 1], q = pts[i], r = pts[i + 1];
      if (!p || !r || p.id !== q.id || r.id !== q.id) { q.a = 0; continue; }
      var ax = q.x - p.x, ay = q.y - p.y, bx = r.x - q.x, by = r.y - q.y, la = Math.sqrt(ax * ax + ay * ay) || 1, lb = Math.sqrt(bx * bx + by * by) || 1;
      q.a = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))) / Math.PI;
    }
    return pts;
  }
  function cloudDistance(a, b, start) {
    var n = a.length, matched = [], sum = 0, i = start;
    do {
      var best = -1, min = Infinity;
      for (var j = 0; j < n; j++) if (!matched[j]) { var d = dist(a[i], b[j]); if (d < min) { min = d; best = j; } }
      matched[best] = true;
      sum += (1 - ((i - start + n) % n) / n) * min;
      i = (i + 1) % n;
    } while (i !== start);
    return sum;
  }
  function greedyMatch(a, b) {
    var n = a.length, step = Math.floor(Math.pow(n, 0.5)), min = Infinity;
    for (var i = 0; i < n; i += step) min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
    return min;
  }

  // ------------------------------------------------------------------ built-in letters (block capitals in a 1 by 1 box, y down)
  function arc(cx, cy, rx, ry, a0, a1, steps) {
    var out = [], n = steps || 12;
    for (var i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
    return out;
  }
  function pl(pairs) { return pairs.map(function (p) { return { x: p[0], y: p[1] }; }); }
  var CIRCLE = arc(0.5, 0.5, 0.5, 0.5, -90, 270, 24);
  var SHAPES = {
    A: [[[[0, 1], [0.5, 0], [1, 1]], [[0.2, 0.62], [0.8, 0.62]]], [[[0, 1], [0.5, 0], [1, 1], [0.8, 0.62], [0.2, 0.62]]]],
    B: [[[[0, 1], [0, 0]].concat(arc(0, 0.25, 0.55, 0.25, -90, 90)).concat(arc(0, 0.75, 0.65, 0.25, -90, 90))]],
    C: [[arc(0.55, 0.5, 0.5, 0.5, -50, -310)]],
    D: [[[[0, 1], [0, 0]].concat(arc(0, 0.5, 0.95, 0.5, -90, 90))]],
    E: [[[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.7, 0.5]]], [[[1, 0], [0, 0], [0, 0.5], [0.7, 0.5], [0, 0.5], [0, 1], [1, 1]]]],
    F: [[[[1, 0], [0, 0], [0, 1]], [[0, 0.5], [0.7, 0.5]]], [[[1, 0], [0, 0], [0, 0.5], [0.7, 0.5], [0, 0.5], [0, 1]]]],
    G: [[arc(0.5, 0.5, 0.5, 0.5, -45, -360).concat([[0.55, 0.5]])]],
    H: [[[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]], [[[0, 0], [0, 1], [0, 0.5], [1, 0.5], [1, 0], [1, 1]]]],
    I: [[[[0.5, 0], [0.5, 1]]], [[[0.2, 0], [0.8, 0]], [[0.5, 0], [0.5, 1]], [[0.2, 1], [0.8, 1]]]],
    J: [[[[0.65, 0], [0.65, 0.7]].concat(arc(0.35, 0.7, 0.3, 0.3, 0, 180))]],
    K: [[[[0, 0], [0, 1]], [[1, 0], [0, 0.55]], [[0.25, 0.42], [1, 1]]], [[[0, 0], [0, 1]], [[1, 0], [0, 0.5], [1, 1]]]],
    L: [[[[0, 0], [0, 1], [1, 1]]]],
    M: [[[[0, 1], [0, 0], [0.5, 0.65], [1, 0], [1, 1]]]],
    N: [[[[0, 1], [0, 0], [1, 1], [1, 0]]]],
    O: [[CIRCLE]],
    P: [[[[0, 1], [0, 0]].concat(arc(0, 0.3, 0.7, 0.3, -90, 90))]],
    Q: [[CIRCLE, [[0.62, 0.68], [1, 1.05]]]],
    R: [[[[0, 1], [0, 0]].concat(arc(0, 0.3, 0.7, 0.3, -90, 90)), [[0.3, 0.6], [1, 1]]]],
    S: [[arc(0.5, 0.25, 0.3, 0.25, -30, -270).concat(arc(0.5, 0.75, 0.3, 0.25, -90, 150))]],
    T: [[[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]], [[[0, 0], [1, 0], [0.5, 0], [0.5, 1]]]],
    U: [[[[0, 0], [0, 0.6]].concat(arc(0.5, 0.6, 0.5, 0.4, 180, 360)).concat([[1, 0]])]],
    V: [[[[0, 0], [0.5, 1], [1, 0]]]],
    W: [[[[0, 0], [0.25, 1], [0.5, 0.35], [0.75, 1], [1, 0]]]],
    X: [[[[0, 0], [1, 1]], [[1, 0], [0, 1]]]],
    Y: [[[[0, 0], [0.5, 0.5], [1, 0]], [[0.5, 0.5], [0.5, 1]]], [[[0, 0], [0.5, 0.5], [1, 0], [0.5, 0.5], [0.5, 1]]]],
    Z: [[[[0, 0], [1, 0], [0, 1], [1, 1]]]]
  };
  var BUILT_IN = [];
  Object.keys(SHAPES).forEach(function (letter) {
    SHAPES[letter].forEach(function (variant) { BUILT_IN.push(makeTemplate(letter, variant.map(pl))); });
  });
  function makeTemplate(letter, strokes) {
    var c = cloud(strokes);
    return { letter: letter, points: c.points, aspect: c.aspect, strokes: strokes.length };
  }

  // ------------------------------------------------------------------ recognise
  // strokes: the drawing. opts.letters: the only letters worth considering (the class's initials); opts.own: Patryk's
  // own templates ({letter, strokes}) which count a little more than the built-in ones. Returns the letters best first:
  // [{ letter, score (0 to 1, 1 is a perfect match) }], and sure = true when the best is clearly ahead.
  function recognise(strokes, opts) {
    opts = opts || {};
    var c = cloud(strokes || []);
    if (!c) return { letters: [], sure: false };
    var allow = opts.letters ? opts.letters.map(function (l) { return String(l).toUpperCase(); }) : null;
    var templates = BUILT_IN.concat((opts.own || []).map(function (t) { return t.points ? t : makeTemplate(t.letter, t.strokes); }).map(function (t) { return Object.assign({}, t, { own: true }); }));
    var best = {};
    templates.forEach(function (t) {
      if (allow && allow.indexOf(t.letter) === -1) return;
      var d = greedyMatch(c.points, t.points);
      // a letter whose proportions are far off (a tall thin I against a square O) is penalised
      d += Math.abs(c.aspect - t.aspect) * 0.6;
      if (t.own) d *= 0.9;
      if (!(t.letter in best) || d < best[t.letter]) best[t.letter] = d;
    });
    var out = Object.keys(best).map(function (l) { return { letter: l, score: Math.max(0, (2 - best[l]) / 2), d: best[l] }; })
      .sort(function (a, b) { return a.d - b.d; });
    var sure = out.length === 1 || (out.length > 1 && out[1].d - out[0].d > Math.max(0.12, out[0].d * 0.18));
    return { letters: out.map(function (x) { return { letter: x.letter, score: Math.round(x.score * 1000) / 1000 }; }), sure: sure };
  }

  // ------------------------------------------------------------------ pupils
  // "First Last" or "Last, First" -> { first: 'F', last: 'L' }
  function initialsOf(name) {
    var t = String(name || '').trim(), first, last;
    if (t.indexOf(',') > -1) { var p = t.split(','); last = p[0].trim(); first = p.slice(1).join(',').trim().split(/\s+/)[0]; }
    else { var w = t.split(/\s+/); first = w[0]; last = w.length > 1 ? w[w.length - 1] : ''; }
    var up = function (s) { return s ? s.replace(/^[^A-Za-z]+/, '').charAt(0).toUpperCase() : ''; };
    return { first: up(first), last: up(last) };
  }
  // the letters that can start a first name in this class (stage one), or a surname among these pupils (stage two)
  function alphabet(students, stage) {
    var seen = {};
    (students || []).forEach(function (s) { var i = initialsOf(s.name); var l = stage === 'last' ? i.last : i.first; if (l) seen[l] = 1; });
    return Object.keys(seen).sort();
  }
  // pupils matching the letters drawn so far: one letter = first-name initial; two = first then surname initial.
  // letters may hold alternatives per position ("J" or ["J","I"]) when the recogniser was not sure.
  function candidates(students, letters) {
    var want = (letters || []).map(function (l) { return (Array.isArray(l) ? l : [l]).map(function (x) { return String(x).toUpperCase(); }); });
    return (students || []).filter(function (s) {
      var i = initialsOf(s.name);
      if (want[0] && want[0].indexOf(i.first) === -1) return false;
      if (want[1] && want[1].indexOf(i.last) === -1) return false;
      return true;
    });
  }
  // the pupils he meant most often come first, then the alphabet
  function rank(cands, recent) {
    var score = {};
    (recent || []).forEach(function (n, i) { score[n] = (score[n] || 0) + 1 / (i + 1); });
    return cands.slice().sort(function (a, b) { return (score[b.name] || 0) - (score[a.name] || 0) || String(a.name).localeCompare(String(b.name)); });
  }

  // ------------------------------------------------------------------ the session (one open class)
  // Phases: idle -> (letter) -> narrow (several pupils, waiting for a surname initial) or picked (one pupil) or
  // choose (a short list he taps). picked -> taps: 1 positive, 2 negative, 3 the menu; the taps commit after
  // doubleTapMs with no further tap, so one server call carries the final meaning. Everything takes the time as an
  // argument so the checks can run it without waiting.
  function createSession(students, opts) {
    opts = Object.assign({ doubleTapMs: 400, pickTimeoutMs: 6000, chooseMax: 3, recent: [] }, opts || {});
    var S = { phase: 'idle', letters: [], cands: [], picked: null, taps: 0, lastTap: 0, since: 0, recent: (opts.recent || []).slice() };
    function reset() { S.phase = 'idle'; S.letters = []; S.cands = []; S.picked = null; S.taps = 0; S.lastTap = 0; S.since = 0; }
    function pick(st, now) { S.phase = 'picked'; S.picked = st; S.cands = [st]; S.taps = 0; S.since = now; return { type: 'picked', student: st }; }
    function settle(list, now) {
      if (list.length === 1) return pick(list[0], now);
      if (!list.length) return null;
      S.cands = rank(list, S.recent); S.since = now;
      // after one letter he draws the surname initial without looking; the short list only comes after two letters or a tap
      if (S.letters.length >= 2) { S.phase = 'choose'; return { type: 'choose', cands: S.cands.slice(0, opts.chooseMax) }; }
      S.phase = 'narrow'; return { type: 'narrow', letters: S.letters.slice(), count: list.length };
    }
    function commit(now) {
      var st = S.picked, n = S.taps;
      reset();
      if (!st) return null;
      if (n >= 3) return { type: 'menu', student: st };
      S.recent.unshift(st.name); S.recent = S.recent.slice(0, 20);
      return { type: 'log', names: [st.name], kind: n === 2 ? '-' : '+', student: st };
    }
    var api = {
      // a finished letter: result from recognise(); returns what to show
      letter: function (rec, now) {
        if (S.phase === 'picked' && S.taps) { var done = commit(now); if (done) return done; }   // taps already made count first
        var top = (rec && rec.letters || []).slice(0, 2);
        if (!top.length) return { type: 'nobody', letters: S.letters.slice() };
        // when the recogniser was not sure, both of its top letters stay in play
        var alt = rec.sure ? [top[0].letter] : top.map(function (x) { return x.letter; });
        var letters = (S.phase === 'narrow' ? S.letters : []).concat([alt]);
        var list = candidates(students, letters);
        if (!list.length) {
          var ev = { type: 'nobody', letters: letters.map(function (l) { return l[0]; }) };
          if (S.phase !== 'narrow') reset();   // a second letter that fits nobody keeps the first letter's pupils
          return ev;
        }
        S.letters = letters; S.picked = null; S.taps = 0;
        return settle(list, now);
      },
      tap: function (now) {
        if (S.phase === 'picked') { S.taps++; S.lastTap = now; return { type: 'tap', count: S.taps, student: S.picked }; }
        if (S.phase === 'narrow' || S.phase === 'choose') { S.phase = 'choose'; S.since = now; return { type: 'choose', cands: S.cands.slice(0, opts.chooseMax) }; }
        return null;
      },
      // he tapped a name on the choose list
      choose: function (name, now) {
        var st = S.cands.filter(function (s) { return s.name === name; })[0];
        if (!st) return null;
        return pick(st, now);
      },
      // called often (every 100 ms or so): commits taps once the double-tap window has passed, drops a stale pick
      tick: function (now) {
        if (S.phase === 'picked' && S.taps && now - S.lastTap >= opts.doubleTapMs) return commit(now);
        if (S.phase !== 'idle' && !S.taps && now - S.since >= opts.pickTimeoutMs) { reset(); return { type: 'expired' }; }
        return null;
      },
      cancel: function () { var was = S.phase; reset(); return was === 'idle' ? null : { type: 'cleared' }; },
      // the letters worth recognising right now: first-name initials, or the surnames of the pupils still in play
      alphabet: function () { return S.phase === 'narrow' ? alphabet(S.cands, 'last') : alphabet(students, 'first'); },
      state: function () { return { phase: S.phase, letters: S.letters.slice(), cands: S.cands.slice(), picked: S.picked, taps: S.taps, recent: S.recent.slice() }; }
    };
    return api;
  }

  // ------------------------------------------------------------------ pointer input -> letters, taps and holds
  // Groups pen-downs into letters: strokes that start within strokeGapMs of the last pen-up belong to the same
  // letter; a tiny short press is a tap; a long still press is a hold. All times are passed in (ms).
  function createInput(opts) {
    opts = Object.assign({ tapMaxPx: 14, tapMaxMs: 260, strokeGapMs: 380, holdMs: 650 }, opts || {});
    var cur = null, pending = [], lastUp = 0, downAt = 0, held = false, start = null, far = 0;
    function finish(now) { if (pending.length) { var s = pending; pending = []; if (opts.onLetter) opts.onLetter(s, now); } }
    return {
      down: function (x, y, t) { cur = [{ x: x, y: y }]; start = { x: x, y: y }; downAt = t; held = false; far = 0; },
      move: function (x, y, t) {
        if (!cur) return;
        cur.push({ x: x, y: y }); far = Math.max(far, dist(start, { x: x, y: y }));
      },
      up: function (t) {
        if (!cur) return;
        var s = cur; cur = null;
        if (held) return;
        if (far <= opts.tapMaxPx && t - downAt <= opts.tapMaxMs) { finish(t); if (opts.onTap) opts.onTap(t); return; }
        if (far <= opts.tapMaxPx) return;   // a still press that was not long enough to hold: nothing
        pending.push(s); lastUp = t;
      },
      tick: function (t) {
        if (cur && !held && t - downAt >= opts.holdMs && far <= opts.tapMaxPx) { held = true; pending = []; if (opts.onHold) opts.onHold(t); return; }
        if (!cur && pending.length && t - lastUp >= opts.strokeGapMs) finish(t);
      },
      pending: function () { return pending.length; }
    };
  }

  // Patryk's own letters, kept on the phone: [{ letter, strokes }]. Capped so one letter cannot crowd the rest.
  function addOwn(own, letter, strokes, max) {
    var list = (own || []).slice(), L = String(letter).toUpperCase();
    var mine = list.filter(function (t) { return t.letter === L; });
    if (mine.length >= (max || 3)) list.splice(list.indexOf(mine[0]), 1);
    list.push({ letter: L, strokes: strokes });
    return list;
  }

  var api = { N: N, recognise: recognise, cloud: cloud, makeTemplate: makeTemplate, BUILT_IN: BUILT_IN, SHAPES: SHAPES,
    initialsOf: initialsOf, alphabet: alphabet, candidates: candidates, rank: rank, createSession: createSession, createInput: createInput, addOwn: addOwn };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EyesFree = api;
})(typeof window !== 'undefined' ? window : this);
