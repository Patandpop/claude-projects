/* planner/memory.js — the memory map's maths (big goal 1, lanes/design-memory-map.md, 29 Oct 2026).
   Plain JS, no dependencies, pure functions: runs in Apps Script (Code.gs's daily update), in the
   browser and in Node for tests (`node planner/tests/memory.test.js`). Class level only: no names.

   Each square = one class x one spec sub-point, a tiny model of the whole class (after Anki's FSRS):
     S  stability in days (how long until predicted recall falls to 90%), D  difficulty 1-10.
     recall = 1 / (1 + t / (9 S)), t = days since the last evidence (or since first taught).
   Colour: green >= dueBelow + 10 (85%), amber >= dueBelow (75%), red below; "unknown" = taught, no
   evidence yet (amber "?"); untaught = no row (grey, never suggested).
   Evidence = a class % right (p) with a weight (vote 1, homework 2, test 3 later). p < dueBelow is a miss.
   Right: S = S x (1 + growth x (11 - D) x S^-0.21 x (e^(0.3 (1 - r)) - 1) x e^1.5), D - 0.3 (floor 1).
     e^1.5 (about 4.5, FSRS's standard rate) where the design says 20: chosen here so the design's own
     worked example (section 4.5) lands near its "about 12 days"; 20 gives about 40.
   Miss: S = max(1, 0.3 S), D + 1 (cap 10), lapses + 1, re-teach flag on until the next right result.
   A vote applies half the change (average of old and new), homework the full change, a test 1.25x.
   Several results for one square on one day are averaged first, then applied once. */
(function (root) {
  const DAY = 864e5;
  const parse = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const days = (a, b) => Math.max(0, Math.round((parse(b) - parse(a)) / DAY));
  const START = { S: 4, D: 5 };
  const WEIGHT = { vote: 1, homework: 2, test: 3 };

  function recall(S, t) { return 1 / (1 + Math.max(0, t) / (9 * Math.max(0.1, S))); }
  function stateOf(row, today, dueBelow) {
    const due = dueBelow == null ? 75 : dueBelow;
    if (!row) return { recall: null, state: 'untaught' };
    const from = row.lastEvidence || row.firstTaught;
    const r = Math.round(100 * recall(row.S, days(from, today)));
    if (!row.reps) return { recall: r, state: r < due ? 'red' : 'unknown' };
    return { recall: r, state: r >= due + 10 ? 'green' : r >= due ? 'amber' : 'red' };
  }

  // One day's evidence for one square: p = class % right (already averaged), source = vote/homework/test.
  function apply(row, p, source, day, o) {
    const opt = o || {}, due = opt.dueBelow == null ? 75 : opt.dueBelow, growth = opt.growth == null ? 1 : opt.growth;
    const r = recall(row.S, days(row.lastEvidence || row.firstTaught || day, day));
    let S, D, lapses = row.lapses || 0, reteach = !!row.reteach;
    if (p >= due) {
      S = row.S * (1 + growth * (11 - row.D) * Math.pow(row.S, -0.21) * (Math.exp(0.3 * (1 - r)) - 1) * Math.exp(1.5));
      D = Math.max(1, row.D - 0.3); reteach = false;
    } else {
      S = Math.max(1, row.S * 0.3); D = Math.min(10, row.D + 1); lapses++; reteach = true;
    }
    const w = source === 'vote' ? 0.5 : source === 'test' ? 1.25 : 1;
    S = row.S + (S - row.S) * w; D = Math.min(10, Math.max(1, row.D + (D - row.D) * w));
    return Object.assign({}, row, { S: Math.max(0.5, S), D, lapses, reteach, reps: (row.reps || 0) + 1, lastEvidence: day, lastPct: p, predicted: r });
  }

  /* The daily update for the squares (design 6.3 steps 3-4), pure:
     scores   existing rows [{ cls, spec, S, D, reps, lapses, lastEvidence, lastPct, firstTaught, reteach }]
     taught   [{ cls, spec, date }] every code of every lesson taught on or before today
     evidence [{ id, when, cls, spec, source, pct }] new rows only (already-applied ids are left out by the caller)
     o        { today, dueBelow, growth: { cls: n } }
     Returns { scores (every row, with recall and state as of today), applied, skipped }. */
  function update(scores, taught, evidence, o) {
    const opt = o || {}, today = opt.today;
    const key = (c, s) => c + '|' + s;
    const map = new Map((scores || []).map((x) => [key(x.cls, x.spec), Object.assign({}, x)]));
    (taught || []).filter((t) => t.spec && t.date && t.date <= today).sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((t) => {
      const k = key(t.cls, t.spec);
      if (!map.has(k)) map.set(k, { cls: t.cls, spec: t.spec, S: START.S, D: START.D, reps: 0, lapses: 0, firstTaught: t.date, lastEvidence: '', lastPct: null, reteach: false });
    });
    // several results on one day for one square: averaged first (weighted by source), then applied once
    const groups = new Map();
    let skipped = 0;
    (evidence || []).forEach((e) => {
      if (!e.spec || e.pct == null || !map.has(key(e.cls, e.spec))) { skipped++; return; }
      const g = key(e.cls, e.spec) + '|' + String(e.when).slice(0, 10);
      if (!groups.has(g)) groups.set(g, { k: key(e.cls, e.spec), day: String(e.when).slice(0, 10), rows: [] });
      groups.get(g).rows.push(e);
    });
    const sorted = [...groups.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
    sorted.forEach((g) => {
      const wsum = g.rows.reduce((n, e) => n + (WEIGHT[e.source] || 1), 0);
      const p = g.rows.reduce((n, e) => n + e.pct * (WEIGHT[e.source] || 1), 0) / wsum;
      const best = g.rows.some((e) => e.source === 'test') ? 'test' : g.rows.some((e) => e.source === 'homework') ? 'homework' : 'vote';
      const row = map.get(g.k);
      map.set(g.k, apply(row, p, best, g.day, { dueBelow: opt.dueBelow, growth: (opt.growth || {})[row.cls] }));
    });
    const out = [...map.values()].map((x) => Object.assign(x, stateOf(x, today, opt.dueBelow)));
    return { scores: out, applied: sorted.length, skipped };
  }

  /* The lesson card's "Suggested Do Now" (design 5.2): the reddest taught sub-points of one class as of a
     day, red first, then unknown and amber, lowest recall first; never grey, never green. The top `tick`
     come ticked. recent = codes used in the class's last two Do Nows (skipped unless still red). */
  function suggest(scores, cls, today, o) {
    const opt = o || {}, n = opt.n || 10, tick = opt.tick == null ? 6 : opt.tick, recent = new Set(opt.recent || []);
    const rank = { red: 0, unknown: 1, amber: 2 };
    return (scores || []).filter((x) => x.cls === cls).map((x) => Object.assign({}, x, stateOf(x, today, opt.dueBelow)))
      .filter((x) => x.state in rank && (!recent.has(x.spec) || x.state === 'red'))
      .sort((a, b) => rank[a.state] - rank[b.state] || a.recall - b.recall || (a.spec < b.spec ? -1 : 1))
      .slice(0, n).map((x, i) => ({ spec: x.spec, recall: x.recall, state: x.state, reteach: !!x.reteach, ticked: i < tick }));
  }

  /* Monthly learning (design 4.4): per class, compare each evidence row's predicted recall with whether the
     class got it. More misses than predicted: growth down 10% (floor 0.5); fewer: up 10% (cap 1.5).
     rows = [{ predicted (0-1), pct }]. Returns the new growth. */
  function adjustGrowth(growth, rows, dueBelow) {
    const g = growth == null ? 1 : growth, due = dueBelow == null ? 75 : dueBelow;
    if (!(rows || []).length) return g;
    const expectMiss = rows.reduce((n, x) => n + (1 - x.predicted), 0), miss = rows.filter((x) => x.pct < due).length;
    if (miss > expectMiss + 0.5) return Math.max(0.5, Math.round(g * 0.9 * 1000) / 1000);
    if (miss < expectMiss - 0.5) return Math.min(1.5, Math.round(g * 1.1 * 1000) / 1000);
    return g;
  }

  /* September carry-forward (design 7): "10S2 > 11S2, 9AS > 10S2" copies each old class's rows to its new
     code, once (done = the year it last ran). Returns { scores, ran }. */
  function lineage(scores, list, year, done) {
    if (String(done) === String(year)) return { scores, ran: false };
    const pairs = String(list || '').split(',').map((x) => x.split('>').map((y) => y.trim())).filter((p) => p.length === 2 && p[0] && p[1]);
    const from = new Map(pairs), to = new Set(pairs.map((p) => p[1]));
    // a class in the list moves to its new code; a code that only receives (last year's leavers) is replaced;
    // a class not in the list is untouched
    const untouched = (scores || []).filter((x) => !from.has(x.cls) && !to.has(x.cls));
    const moved = (scores || []).filter((x) => from.has(x.cls)).map((x) => Object.assign({}, x, { cls: from.get(x.cls) }));
    return { scores: untouched.concat(moved), ran: true };
  }

  const api = { recall, stateOf, apply, update, suggest, adjustGrowth, lineage, days, START, WEIGHT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PlannerMemory = api;
})(typeof window !== 'undefined' ? window : this);
