/* ============================================================================
   Game.gs: Ulhu's Rituals (Patryk 2026-10-23). The work and life jobs ("rituals") of his day, each with a
   length and a kind; ticking one pays Eldritch Doubloons and XP to Ulhu, the Kelp Mint Cthulhu.
   Design: replica/architecture.md (tabs, reward maths), replica/design/rituals-tasksetter.md.
   Lives in the planner's own Apps Script project and Google Sheet. No triggers (the day rolls over lazily
   inside gameLoad), no paid service, nothing on Drive. Every public function starts with check_(k).
   Words not symbols in sheet cells (a cell that starts + - = turns into a formula): polarity is
   plus / minus / both. The pictures live on the page (game-ulhu.js, game-pixel.js); the server sends none.
   ============================================================================ */

const GAME = {
  coin: 'Eldritch Doubloons',
  maxHp: 50,
  base: { 5: 3, 15: 6, 30: 10, 60: 16, 120: 25 },          // doubloons and XP by minutes (pay grows slower than time)
  mult: { necessary: 1, ahead: 1.5, external: 3, life: 2 },  // what kind of job it is
  hpLoss: { 5: 2, 15: 4, 30: 6, 60: 9, 120: 12 },            // a bad habit costs health, never doubloons
  lifeFirst: 5, lifeThree: 15,                               // life bonus: first life goal of the day, then three or more
  streakStep: 0.1, streakCap: 0.3,                           // +10% per 7 days, capped at +30%
};
const G_HEAD = {
  player: ['Setting', 'Value'],
  goals: ['id', 'name', 'kind', 'polarity', 'days', 'everyN', 'minutes', 'track', 'auto', 'value', 'streak', 'best', 'lastDone', 'private', 'sittings', 'sitDone', 'due', 'archived', 'created', 'grp', 'steps'],
  ticks: ['id', 'at', 'day', 'goalId', 'delta', 'coins', 'xp', 'hp', 'auto', 'ref', 'note'],
  freeze: ['day', 'reason', 'savedOn'],
  seen: ['lesson', 'built', 'firstBuiltOn'],
  owned: ['itemId', 'boughtOn', 'price', 'slot'],
  bosses: ['id', 'name', 'maxHp', 'stages', 'reward', 'startedOn', 'status', 'beatenOn'],
  reviews: ['week', 'wentWell', 'slipped', 'p1', 'p2', 'p3', 'savedOn'],
  hoard: ['id', 'name', 'cost', 'claims', 'archived', 'created'],
};
const G_DAYF = ['day', 'lastDone', 'due', 'created', 'firstBuiltOn', 'savedOn', 'boughtOn', 'startedOn', 'beatenOn', 'week'];
const G_TAB = { player: 'Game Player', goals: 'Game Goals', ticks: 'Game Ticks', freeze: 'Game Freeze', seen: 'Game Seen', owned: 'Game Owned', bosses: 'Game Bosses', reviews: 'Game Reviews', hoard: 'Game Hoard' };

/* ---- time: test-friendly (GAME_NOW is set only by tests), all days are London yyyy-MM-dd text ---- */
function gNow_() { return (typeof GAME_NOW !== 'undefined' && GAME_NOW) ? new Date(GAME_NOW) : new Date(); }
function gDay_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function gAdd_(key, n) { const p = key.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)); return d.toISOString().slice(0, 10); }
function gDow_(key) { const p = key.split('-').map(Number), w = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); return w === 0 ? 7 : w; }   // 1 Mon .. 7 Sun
function gDiff_(a, b) { const f = (k) => { const p = k.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }; return Math.round((f(b) - f(a)) / 864e5); }
function gMonday_(key) { return gAdd_(key, 1 - gDow_(key)); }

/* ---- sheet access ---- */
const G_HEADOK = {};
function gTab_(t) {
  const sh = tab_(G_TAB[t], G_HEAD[t]);
  if (!G_HEADOK[t]) { G_HEADOK[t] = true; const n = G_HEAD[t].length; if (sh.getLastColumn() < n) sh.getRange(1, 1, 1, n).setValues([G_HEAD[t]]); }
  return sh;
}
function gRows_(t) {
  const sh = gTab_(t), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  // Google Sheets turns text like 2026-11-03 into a real date: read every date back as London yyyy-MM-dd text
  const fix = (v) => (v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : v);
  return sh.getRange(2, 1, n, G_HEAD[t].length).getValues().map((r, i) => { const o = { row: i + 2 }; G_HEAD[t].forEach((h, j) => { o[h] = (G_DAYF.indexOf(h) >= 0 || (t === 'player' && h === 'Value')) ? fix(r[j]) : r[j]; }); return o; });
}
function gAppend_(t, o) { gTab_(t).appendRow(G_HEAD[t].map((h) => (o[h] === undefined ? '' : o[h]))); }
function gSet_(t, row, field, v) { gTab_(t).getRange(row, G_HEAD[t].indexOf(field) + 1).setValue(v); }
function gPlayer_() {
  const p = { coins: 0, xp: 0, level: 1, hp: GAME.maxHp, maxHp: GAME.maxHp, lastDay: '', deaths: 0, seeded: '', diedDay: '', levelUpDay: '', frozenOk: '', groups: '', wear: '' };
  gRows_('player').forEach((r) => { const v = r.Value; p[r.Setting] = (typeof p[r.Setting] === 'number') ? Number(v) : String(v === undefined ? '' : v); });
  return p;
}
function gSavePlayer_(p) {
  const rows = gRows_('player'), by = {};
  rows.forEach((r) => { by[r.Setting] = r; });
  Object.keys(p).forEach((k) => {
    if (by[k]) { if (String(by[k].Value) !== String(p[k])) gSet_('player', by[k].row, 'Value', p[k]); }
    else gAppend_('player', { Setting: k, Value: p[k] });
  });
}
const gNeed_ = (level) => 150 + 50 * level;

/* ---- the planner's world: saved weeks and Data (terms, INSET, built flags). Tests set GAME_WORLD. ---- */
function gWorld_() {
  if (typeof GAME_WORLD !== 'undefined' && GAME_WORLD) return GAME_WORLD;
  try { const a = loadAll_(true); return { data: a.data || null, weeks: a.weeks || {} }; } catch (e) { return { data: null, weeks: {} }; }
}
function gFrozenDays_() { const s = {}; gRows_('freeze').forEach((r) => { s[String(r.day)] = r.reason || 'off'; }); return s; }
// A weekday that is not a school day (holiday, INSET) is frozen like a sick day. Weekends are not frozen.
function gIsFrozen_(day, world, frozen) {
  if (frozen[day]) return true;
  const w = gDow_(day), d = world.data;
  if (w > 5 || !d || !(d.terms || []).length) return false;
  if ((d.inset || []).includes(day)) return true;
  return !(d.terms || []).some((t) => day >= t[0] && day <= t[1]);
}

/* ---- pay ---- */
function gPay_(goal, todayTicks, goalsById) {
  const m = Number(goal.minutes) || 15, track = goal.track || 'necessary';
  const base = GAME.base[m] || GAME.base[15], mult = GAME.mult[track] || 1;
  const val = Number(goal.value) || 0, red = val < 0 ? 1 + (-val) * 0.1 : 1;
  const streak = Math.min(GAME.streakCap, Math.floor((Number(goal.streak) || 0) / 7) * GAME.streakStep);
  const core = Math.round(base * mult * red * (1 + streak));
  let bonus = 0;
  if (track === 'life') {
    const net = {};                                             // life goals done today (an untick takes one back out)
    (todayTicks || []).forEach((t) => { if (goalsById[t.goalId] && goalsById[t.goalId].track === 'life' && t.goalId !== goal.id) net[t.goalId] = (net[t.goalId] || 0) + Number(t.delta); });
    const n = Object.keys(net).filter((id) => net[id] > 0).length;
    if (n === 0) bonus = GAME.lifeFirst; else if (n === 2) bonus = GAME.lifeThree - GAME.lifeFirst;
  }
  return { coins: core + bonus, xp: core, bonus };
}
function gBlessAmt_(g) { return Math.max(2, Math.round((GAME.base[Number(g.minutes) || 15] || 6) / 2)); }
function gBlessings_(goals) { return goals.filter((g) => g.kind === 'habit' && g.polarity !== 'minus').sort((a, b) => (a.id < b.id ? -1 : 1)); }
function gFeatured_(goals, today) { const b = gBlessings_(goals); return b.length ? b[gDiff_('2026-01-01', today) % b.length].id : ''; }
function gBlessCount_(goals, todayTicks) { const ids = {}; gBlessings_(goals).forEach((g) => { ids[g.id] = true; }); return todayTicks.filter((t) => ids[t.goalId]).reduce((a, t) => a + Number(t.delta), 0); }
function gBlessPay_(g, goals, todayTicks, today) {
  const amt = gBlessAmt_(g) * (gFeatured_(goals, today) === g.id ? 2 : 1), chain = (gBlessCount_(goals, todayTicks) + 1) % 8 === 0 ? 10 : 0;
  return { coins: amt + chain, xp: amt * 2, bonus: chain };
}
function gHpLoss_(goal) { return GAME.hpLoss[Number(goal.minutes) || 15] || 4; }

function gAddXp_(p, xp, today) {
  p.xp += xp; let up = false;
  while (p.xp >= gNeed_(p.level)) { p.xp -= gNeed_(p.level); p.level++; p.hp = p.maxHp; up = true; }
  if (up) p.levelUpDay = today;
  return up;
}
function gTakeXp_(p, xp) {
  p.xp -= xp;
  while (p.xp < 0 && p.level > 1) { p.level--; p.xp += gNeed_(p.level); }
  if (p.xp < 0) p.xp = 0;
}
// 0 HP: level -1 (never below 1), XP to the start of that level, minus the doubloons earned in the last 7 days.
function gDie_(p, today, ticks) {
  const since = gAdd_(today, -7);
  const earned = ticks.filter((t) => String(t.day) > since && t.coins > 0 && !/^(buy|hoard)\|/.test(String(t.goalId))).reduce((a, t) => a + Number(t.coins), 0);
  const lost = Math.min(p.coins, earned);
  p.level = Math.max(1, p.level - 1); p.xp = 0; p.coins -= lost; p.hp = p.maxHp; p.deaths++; p.diedDay = today;
  return { lost, level: p.level };
}

/* ---- goals ---- */
function gGoals_() {
  return gRows_('goals').filter((g) => String(g.archived) !== 'true' && g.archived !== true).map((g) => {
    g.minutes = Number(g.minutes) || 15; g.value = Number(g.value) || 0; g.streak = Number(g.streak) || 0; g.best = Number(g.best) || 0;
    g.everyN = Number(g.everyN) || 0; g.sittings = Number(g.sittings) || 0; g.sitDone = Number(g.sitDone) || 0;
    g.private = String(g.private) === 'true'; g.lastDone = String(g.lastDone || ''); g.due = String(g.due || ''); g.days = String(g.days || ''); g.grp = String(g.grp || '');
    try { g.steps = g.steps ? JSON.parse(g.steps) : []; } catch (e) { g.steps = []; }
    return g;
  });
}
function gIsDue_(g, day) {
  if (g.kind === 'daily') {
    if (g.everyN) return !g.lastDone || gDiff_(g.lastDone, day) >= g.everyN;
    return (g.days || '12345').indexOf(String(gDow_(day))) >= 0;
  }
  return false;
}
function gTicksToday_(ticks, day) { return ticks.filter((t) => String(t.day) === day); }
function gNet_(ticks, id, day) { return ticks.filter((t) => String(t.day) === day && t.goalId === id).reduce((a, t) => a + Number(t.delta), 0); }

// one tick written and applied (used by manual ticks and by the auto hooks)
function gTick_(g, delta, auto, ref, note) {
  const now = gNow_(), today = gDay_(now), p = gPlayer_(), ticks = gRows_('ticks'), goals = gGoals_();
  const byId = {}; goals.forEach((x) => { byId[x.id] = x; });
  if (ref && ticks.some((t) => t.ref === ref)) return null;                  // the same evidence never pays twice
  const out = { coins: 0, xp: 0, hp: 0, bad: false, up: false, died: null };
  const prev = { s: g.streak, v: g.value, ld: g.lastDone, sd: g.sitDone };
  if (delta < 0) {                                                            // a bad habit: health only
    out.bad = true; out.hp = -gHpLoss_(g); p.hp += out.hp;
    if (p.hp <= 0) out.died = gDie_(p, today, ticks);
    if (g.row) gSet_('goals', g.row, 'value', Math.max(-5, g.value - 1));
  } else {
    const pay = g.kind === 'habit' ? gBlessPay_(g, goals, gTicksToday_(ticks, today), today) : gPay_(g, gTicksToday_(ticks, today), byId);
    out.coins = pay.coins; out.xp = pay.xp; p.coins += pay.coins; out.up = gAddXp_(p, pay.xp, today);
    out.hp = Math.min(1, p.maxHp - p.hp); p.hp = Math.min(p.maxHp, p.hp + 1);
    if (g.row && g.kind !== 'ghost') {
      if (g.kind === 'termly') gSet_('goals', g.row, 'sitDone', g.sitDone + 1);
      else if (gNet_(ticks, g.id, today) === 0) {                           // first tick of the day moves streak and colour
        const st = g.streak + 1;
        gSet_('goals', g.row, 'streak', st); gSet_('goals', g.row, 'best', Math.max(g.best, st));
        gSet_('goals', g.row, 'value', Math.min(5, g.value + 1));
      }
      gSet_('goals', g.row, 'lastDone', today);
    }
  }
  gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: today, goalId: g.id, delta: 1, coins: out.coins, xp: out.xp, hp: out.hp, auto: auto ? 'yes' : '', ref: ref || '', note: JSON.stringify(Object.assign({ prev, name: g.name }, note || {})) });
  gSavePlayer_(p);
  out.player = p;
  return out;
}

// ---- rollover: catches up every day since lastDay (safe to run twice) ----
function gRollover_(world) {
  const today = gDay_(gNow_()), p = gPlayer_();
  if (!p.lastDay) { p.lastDay = gAdd_(today, -1); gSavePlayer_(p); return; }
  if (p.lastDay >= gAdd_(today, -1)) return;
  const frozen = gFrozenDays_(), goals = gGoals_(), ticks = gRows_('ticks');
  for (let d = gAdd_(p.lastDay, 1); d < today; d = gAdd_(d, 1)) {
    const fz = gIsFrozen_(d, world, frozen);
    if (!fz) goals.filter((g) => g.kind === 'daily' && gIsDue_(Object.assign({}, g, { lastDone: '' }), d) && !g.everyN).forEach((g) => {
      if (gNet_(ticks, g.id, d) > 0) return;
      g.streak = 0; g.value = Math.max(-5, g.value - 1);                    // missed: streak resets, goal turns redder, no health lost
      gSet_('goals', g.row, 'streak', 0); gSet_('goals', g.row, 'value', g.value);
    });
    p.hp = Math.min(p.maxHp, p.hp + 5);
  }
  p.lastDay = gAdd_(today, -1);
  gSavePlayer_(p);
}

// ---- summoned rituals and auto-ticks: read-only scans of tabs the planner already writes ----
function gLessonsAhead_(world, today) {
  const out = [], d = world.data;
  if (!d || !d.classes) return out;
  Object.keys(world.weeks || {}).forEach((mon) => {
    ((world.weeks[mon] || {}).slots || []).forEach((s) => {
      if (s.kind !== 'lesson' || s.i === undefined || s.i === null) return;
      const date = gAdd_(mon, Number(s.day) || 0);
      if (date < today || date > gAdd_(today, 14)) return;
      const L = ((d.classes[s.cls] || {}).seq || [])[s.i]; if (!L) return;
      out.push({ ref: 'built|' + s.cls + '|' + s.i, key: s.cls + '|' + s.i, name: 'Build ' + s.cls + ' L' + (L.num || s.i), date, built: !!L.built, ahead: gDiff_(today, date) >= 7 });
    });
  });
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}
// "Order Sheet Week B - Nov 2" -> the Monday it is for (the year that puts it nearest to the download day)
function gOrderMonday_(title, day) {
  const m = /([A-Z][a-z]{2})\s+(\d{1,2})\s*$/.exec(title); if (!m) return '';
  const mi = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(m[1]); if (mi < 0) return '';
  const y = Number(day.slice(0, 4)); let best = '';
  [y - 1, y, y + 1].forEach((yy) => { const k = yy + '-' + ('0' + (mi + 1)).slice(-2) + '-' + ('0' + m[2]).slice(-2); if (!best || Math.abs(gDiff_(day, k)) < Math.abs(gDiff_(day, best))) best = k; });
  return best;
}
function gAutoScan_(world, today, goals, out) {
  // lessons built: a lesson that flips from not built to built pays once; lessons first seen built pay nothing
  const seen = {}; gRows_('seen').forEach((r) => { seen[r.lesson] = r; });
  const ahead = gLessonsAhead_(world, today);
  ahead.forEach((L) => {
    const row = seen[L.key];
    if (!row) { gAppend_('seen', { lesson: L.key, built: L.built ? 'true' : 'false', firstBuiltOn: L.built ? today : '' }); return; }
    if (String(row.built) !== 'true' && L.built) {
      gSet_('seen', row.row, 'built', 'true'); gSet_('seen', row.row, 'firstBuiltOn', today);
      const r = gTick_({ id: 'built|' + L.key, name: L.name, kind: 'ghost', minutes: 30, track: L.ahead ? 'ahead' : 'necessary', streak: 0, value: 0 }, 1, true, L.ref);
      if (r) out.push({ name: L.name, coins: r.coins });
    }
  });
  // order sheet downloaded (Code.gs exportXlsx logs it): 14+ days before its week pays the ahead rate, 7-13 the normal rate
  try {
    const lg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Log');
    if (lg && lg.getLastRow() > 1) lg.getRange(2, 1, lg.getLastRow() - 1, 3).getValues().forEach((r) => {
      if (String(r[1]) !== 'order sheet downloaded' || !(r[0] instanceof Date)) return;
      const mon = gOrderMonday_(String(r[2]), gDay_(r[0])); if (!mon) return;
      const lead = gDiff_(gDay_(r[0]), mon);
      if (lead < 7 || gDay_(r[0]) < gAdd_(today, -14)) return;
      const tr = gTick_({ id: 'order|' + mon, name: 'Order sheet ready (w/c ' + mon + ')', kind: 'ghost', minutes: 15, track: lead >= 14 ? 'ahead' : 'necessary', streak: 0, value: 0 }, 1, true, 'order|' + mon);
      if (tr) out.push({ name: 'Order sheet ready', coins: tr.coins });
    });
  } catch (e) { /* no Log tab yet */ }
  // goals with an auto source
  const log = (typeof readLog_ === 'function') ? (function () { try { return readLog_(); } catch (e) { return []; } })() : [];
  const emails = (typeof readEmails_ === 'function') ? (function () { try { return readEmails_(); } catch (e) { return []; } })() : [];
  const ticks = gRows_('ticks');
  goals.filter((g) => g.auto).forEach((g) => {
    if (gNet_(ticks, g.id, today) > 0) return;
    if (g.auto === 'behaviourLogged' && gIsDue_(g, today)) {
      const rows = log.filter((r) => r.ts instanceof Date ? gDay_(r.ts) === today : false);
      const slots = ((world.weeks || {})[gMonday_(today)] || {}).slots || [];
      const need = slots.filter((s) => (s.kind === 'lesson' || s.kind === 'taught') && Number(s.day) === gDow_(today) - 1).map((s) => s.cls);
      const okAll = need.length ? need.every((c) => rows.some((r) => String(r.cls).toUpperCase().replace(/[^A-Z0-9]/g, '') === String(c).toUpperCase().replace(/[^A-Z0-9]/g, ''))) : rows.length > 0;
      if (okAll && rows.length) { const r = gTick_(g, 1, true, 'beh|' + today); if (r) out.push({ name: g.name, coins: r.coins }); }
    }
    if (g.auto === 'homeworkSet' && gIsDue_(g, today)) {
      const now = gNow_();
      const live = (typeof hwRows_ === 'function' ? (function () { try { return hwRows_(); } catch (e) { return []; } })() : []).filter((r) => String(r.setOn) === today &&
        (r.status === 'marked' || (r.status === 'scheduled' && r.postAt && new Date(r.postAt) <= now) || r.status === 'posted' || r.status === 'live'));
      if (live.length) { const r = gTick_(g, 1, true, 'hw|' + today); if (r) out.push({ name: g.name, coins: r.coins }); }
    }
    if (g.auto === 'fridayEmails' && gIsDue_(g, today)) {
      const mon = gMonday_(today), sun = gAdd_(mon, 6);
      if (emails.some((e) => e.date instanceof Date && gDay_(e.date) >= mon && gDay_(e.date) <= sun)) { const r = gTick_(g, 1, true, 'emails|' + mon); if (r) out.push({ name: g.name, coins: r.coins }); }
    }
  });
}

// ---- starter rituals (first run only; he edits or archives any of them) ----
function gSeed_(world, today) {
  const termEnd = (() => { const t = ((world.data || {}).terms || []).find((x) => today <= x[1]); return t ? t[1] : gAdd_(today, 60); })();
  const mk = (o) => Object.assign({ id: 'g' + Utilities.getUuid().slice(0, 7), kind: 'daily', polarity: 'plus', days: '12345', everyN: '', minutes: 15, track: 'necessary', auto: '', value: 0, streak: 0, best: 0, lastDone: '', private: '', sittings: '', sitDone: '', due: '', archived: '', created: today }, o);
  const seeds = [
    mk({ name: 'Log behaviour', minutes: 5, auto: 'behaviourLogged' }),
    mk({ name: 'Friday emails', days: '5', minutes: 15, auto: 'fridayEmails' }),
    mk({ name: 'Set homework (the classes owed it)', minutes: 15, auto: 'homeworkSet' }),
    mk({ name: 'Read', days: '1234567', minutes: 30, track: 'life', private: 'true' }),
    mk({ name: 'Train', days: '1234567', minutes: 30, track: 'life', private: 'true' }),
    mk({ name: 'Do something for Martha', days: '', everyN: 7, minutes: 30, track: 'life', private: 'true' }),
    mk({ name: 'Call a friend or game', days: '', everyN: 3, minutes: 30, track: 'life', private: 'true' }),
    mk({ name: 'Binge-watching Netflix', kind: 'habit', polarity: 'minus', days: '', minutes: 120, track: 'life', private: 'true' }),
  ];
  [['9AS', 2], ['7MLA', 2], ['8XP', 2], ['8AG', 2], ['10C2', 2], ['10S2', 2], ['9XS', 1]].forEach(([c, n]) =>
    seeds.push(mk({ name: 'Mark ' + c + ' books' + (c === '9XS' ? ' (second half)' : ''), kind: 'termly', days: '', minutes: 60, sittings: n, sitDone: 0, due: termEnd })));
  seeds.forEach((s) => gAppend_('goals', s));
}

/* ---- public functions ---- */
function gSnapshot_(world, extra) {
  const today = gDay_(gNow_()), p = gPlayer_(), goals = gGoals_(), ticks = gRows_('ticks'), frozen = gFrozenDays_();
  const byId = {}; goals.forEach((g) => { byId[g.id] = g; });
  const todayTicks = gTicksToday_(ticks, today), fz = gIsFrozen_(today, world, frozen), feat = gFeatured_(goals, today);
  const view = goals.map((g) => {
    const net = gNet_(ticks, g.id, today), pay = gPay_(g, todayTicks, byId);
    const o = { id: g.id, name: g.name, kind: g.kind, polarity: g.polarity, minutes: g.minutes, track: g.track, auto: g.auto, value: g.value, streak: g.streak, private: g.private,
      days: g.days, everyN: g.everyN, pay: pay.coins, hpLoss: g.kind === 'habit' ? gHpLoss_(g) : 0, doneToday: net > 0, count: net, grp: g.grp || gDefGrp_(g), steps: g.steps };
    if (g.kind === 'habit' && g.polarity !== 'minus') { o.featured = feat === g.id; o.pay = gBlessAmt_(g) * (o.featured ? 2 : 1); }
    if (g.kind === 'todo') { o.due = g.due; o.doneOn = g.lastDone; o.dueToday = !g.lastDone || gDiff_(g.lastDone, today) <= 14; }
    if (g.kind === 'daily') o.dueToday = gIsDue_(g, today);
    if (g.kind === 'termly') { o.sittings = g.sittings; o.sitDone = g.sitDone; o.due = g.due; o.daysLeft = g.due ? gDiff_(today, g.due) : null; o.dueToday = g.sitDone < g.sittings || g.lastDone === today; o.pay = gPay_(Object.assign({}, g, { track: g.track || 'necessary' }), todayTicks, byId).coins; }
    return o;
  });
  const dueNec = view.filter((v) => v.kind === 'daily' && v.dueToday && v.track === 'necessary');
  const level = p.level;
  let mood = 'idle';
  if (p.diedDay === today || p.hp <= 10) mood = 'sad';
  else if (fz || gNow_().getHours() >= 21 && !(typeof GAME_NOW !== 'undefined' && GAME_NOW)) mood = 'sleepy';
  else if (p.levelUpDay === today || (dueNec.length && dueNec.every((v) => v.doneToday))) mood = 'proud';
  else if (todayTicks.some((t) => t.delta > 0)) mood = 'happy';
  const ahead = gLessonsAhead_(world, today);
  const summoned = ahead.slice(0, 10).map((L) => ({ name: L.name, date: L.date, ahead: L.ahead, built: L.built }));
  // Tide Charts: 1 = the next lesson is built, 2 = everything this coming week, 3 = two weeks ahead
  const allBuilt = (days) => ahead.filter((L) => L.date <= gAdd_(today, days)).every((L) => L.built);
  const tide = !ahead.length ? 0 : !ahead[0].built ? 0 : !allBuilt(7) ? 1 : !allBuilt(14) ? 2 : 3;
  const mon = gMonday_(today), weekCoins = ticks.filter((t) => String(t.day) >= mon && Number(t.coins) > 0 && !/^(buy|hoard)\|/.test(String(t.goalId))).reduce((a, t) => a + Number(t.coins), 0);
  const wearRows = gRows_('owned').filter((r) => String(r.itemId).indexOf('w:') === 0);
  const owned = gRows_('owned').filter((r) => String(r.itemId).indexOf('w:') !== 0), room = {}; owned.forEach((r) => { if (r.slot) room[r.slot] = r.itemId; });
  const bosses = gBosses_(today), review = gReviewCard_(today, ticks, goals, bosses);
  const hoard = gRows_('hoard').filter((h) => String(h.archived) !== 'true').map((h) => ({ id: h.id, name: h.name, cost: Number(h.cost) || 0, claims: Number(h.claims) || 0 }));
  return gOut_(Object.assign({ bosses: bosses.filter((b) => b.status === 'active'), beaten: gBeaten_(), review, room, owned: owned.map((r) => r.itemId), player: { coins: p.coins, xp: p.xp, level, need: gNeed_(level), hp: p.hp, maxHp: p.maxHp, deaths: p.deaths, coinName: GAME.coin }, mood, today, frozen: fz,
    goals: view, summoned, tide, weekCoins, groups: gGroups_(p), hoard, wear: gWearState_(p, wearRows), freezes: gFreezesAhead_(world, today, frozen), blessCount: gBlessCount_(goals, todayTicks), hour: Number(Utilities.formatDate(gNow_(), TZ, 'H')),
    table: { base: GAME.base, mult: GAME.mult, hpLoss: GAME.hpLoss } }, extra || {}));
}
// what goes back to the page is plain JSON (a Date or NaN inside makes Apps Script send back null)
function gOut_(o) { return JSON.parse(JSON.stringify(o)); }
function gameLoad(k) {
  check_(k);
  let extra = {};
  withLock_(function () {
    const world = gWorld_(), today = gDay_(gNow_());
    const p = gPlayer_();
    if (!p.seeded) { gSeed_(world, today); p.seeded = today; p.lastDay = gAdd_(today, -1); gSavePlayer_(p); }
    gOwned_();
    gGoals_().filter((g) => g.name === 'Set homework (the classes owed it)' && !g.auto).forEach((g) => gSet_('goals', g.row, 'auto', 'homeworkSet'));
    gRollover_(world);
    const auto = []; gAutoScan_(world, today, gGoals_(), auto);
    if (auto.length) extra.auto = auto;
  });
  return gSnapshot_(gWorld_(), extra);
}
function gameTick(k, id, delta) {
  check_(k);
  let res = null, bad = null;
  withLock_(function () {
    const g = gGoals_().find((x) => x.id === id);
    if (!g) { bad = 'That ritual is not in the list any more.'; return; }
    const today = gDay_(gNow_());
    if (delta < 0 && g.kind !== 'habit') { bad = 'Only a bad habit takes health.'; return; }
    if (delta > 0 && g.kind !== 'habit' && g.kind !== 'termly' && gNet_(gRows_('ticks'), g.id, today) > 0) { res = { already: true }; return; }
    if (delta > 0 && g.kind === 'todo' && g.lastDone) { res = { already: true }; return; }
    if (g.kind === 'termly' && g.sitDone >= g.sittings) { res = { already: true }; return; }
    res = gTick_(g, delta < 0 ? -1 : 1, false, '');
  });
  if (bad) throw new Error(bad);
  return gSnapshot_(gWorld_(), { last: res ? { coins: res.coins || 0, hp: res.hp || 0, up: !!res.up, died: res.died || null, bad: !!res.bad } : null });
}
// untick: writes an exact reversing row (never deletes), restores streak, colour and sittings
function gameUntick(k, id) {
  check_(k);
  withLock_(function () {
    const g = gGoals_().find((x) => x.id === id); if (!g) return;
    const now = gNow_(), today = gDay_(now), ticks = gRows_('ticks').filter((t) => t.goalId === id && String(t.day) === today);
    const stack = [];
    ticks.forEach((t) => { if (Number(t.delta) > 0) stack.push(t); else stack.pop(); });
    const t = stack.pop(); if (!t) return;
    const p = gPlayer_(), c = Number(t.coins) || 0, x = Number(t.xp) || 0, h = Number(t.hp) || 0;
    p.coins = Math.max(0, p.coins - c); gTakeXp_(p, x); p.hp = Math.max(1, Math.min(p.maxHp, p.hp - h));
    let prev = {}; try { prev = JSON.parse(t.note || '{}').prev || {}; } catch (e) { prev = {}; }
    if (g.kind === 'termly') gSet_('goals', g.row, 'sitDone', Math.max(0, g.sitDone - 1));
    else if (g.kind === 'todo') gSet_('goals', g.row, 'lastDone', '');
    else if (g.kind !== 'habit' && prev.s !== undefined) { gSet_('goals', g.row, 'streak', prev.s); gSet_('goals', g.row, 'value', prev.v); gSet_('goals', g.row, 'lastDone', prev.ld || ''); }
    gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: today, goalId: id, delta: -1, coins: -c, xp: -x, hp: -h, auto: '', ref: '', note: JSON.stringify({ untick: t.id, name: g.name }) });
    gSavePlayer_(p);
  });
  return gSnapshot_(gWorld_());
}
function gameSaveGoal(k, goal) {
  check_(k);
  let savedId = '';
  withLock_(function () {
    const today = gDay_(gNow_()), name = String(goal.name || '').trim().slice(0, 80);
    if (!name) throw new Error('Give the ritual a name.');
    const kind = ['daily', 'habit', 'todo', 'termly'].indexOf(goal.kind) >= 0 ? goal.kind : 'daily';
    const track = ['necessary', 'ahead', 'external', 'life'].indexOf(goal.track) >= 0 ? goal.track : 'necessary';
    const minutes = [5, 15, 30, 60, 120].indexOf(Number(goal.minutes)) >= 0 ? Number(goal.minutes) : 15;
    const old = goal.id ? gRows_('goals').find((r) => r.id === goal.id) : null;
    const rec = { id: old ? old.id : 'g' + Utilities.getUuid().slice(0, 7), name, kind, polarity: ['plus', 'minus', 'both'].indexOf(goal.polarity) >= 0 ? goal.polarity : (kind === 'habit' ? 'minus' : 'plus'),
      days: String(goal.days || '').replace(/[^1-7]/g, ''), everyN: Number(goal.everyN) || '', minutes, track, auto: old ? old.auto : '', value: old ? old.value : 0, streak: old ? old.streak : 0, best: old ? old.best : 0,
      lastDone: old ? old.lastDone : '', private: goal.private ? 'true' : '', sittings: kind === 'termly' ? (Number(goal.sittings) || 1) : '', sitDone: old ? old.sitDone : (kind === 'termly' ? 0 : ''),
      due: String(goal.due || ''), archived: '', created: old ? old.created : today, grp: String(goal.grp || '').slice(0, 40),
      steps: kind === 'todo' ? JSON.stringify((goal.steps || []).map((x) => ({ t: String(x.t || '').slice(0, 80), d: !!x.d })).filter((x) => x.t).slice(0, 12)) : '' };
    if (kind === 'todo' && rec.due && !/^\d{4}-\d{2}-\d{2}$/.test(rec.due)) rec.due = '';
    if (kind === 'daily' && !rec.days && !rec.everyN) rec.days = '12345';
    if (old) G_HEAD.goals.forEach((h, j) => { if (String(old[h]) !== String(rec[h])) gSet_('goals', old.row, h, rec[h]); });
    else gAppend_('goals', rec);
    savedId = rec.id;
  });
  return gSnapshot_(gWorld_(), { saved: savedId });
}
// back = true un-archives it again (the Undo button)
function gameArchive(k, id, back) {
  check_(k);
  withLock_(function () { const r = gRows_('goals').find((x) => x.id === id); if (r) gSet_('goals', r.row, 'archived', back ? '' : 'true'); });
  return gSnapshot_(gWorld_());
}
// a sick or off day (today or the last 7 days): streaks and colours stay as they are
function gameFreeze(k, day, reason, on) {
  check_(k);
  withLock_(function () {
    const today = gDay_(gNow_());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day)) || day > today || day < gAdd_(today, -7)) throw new Error('Only today or the last 7 days.');
    const r = gRows_('freeze').find((x) => String(x.day) === day);
    if (on && !r) gAppend_('freeze', { day, reason: ['sick', 'off', 'other'].indexOf(reason) >= 0 ? reason : 'off', savedOn: today });
    if (!on && r) gTab_('freeze').deleteRow(r.row);
  });
  return gSnapshot_(gWorld_());
}


/* ---------------------------------------------------------------- shop and room (slice 5)
   The catalogue (GameShop.gs, made by replica/art/export_shop.py) has 120 items with price, lock, tier and the sprite
   layers they draw on the 128x116 room. Slots, one item each: floor, wall, rug, window, light, corner, furn, hang3,
   hang4, prop. The free starter items are owned from the first load, the first of each slot already placed.
   Locks: {level: n} or {outside_work: n} (n outside-work ticks done). Buying takes doubloons (a ticks row records it). */
function gShop_() { return (typeof SHOP !== 'undefined' && SHOP && SHOP.items) ? SHOP : { items: [], ulhu: { x: 48, y: 60 }, w: 128, h: 116, z: {} }; }
function gOwned_() {
  const rows = gRows_('owned'), have = {}, taken = {};
  rows.forEach((r) => { have[r.itemId] = r; if (r.slot) taken[r.slot] = true; });
  let added = false;
  gShop_().items.filter((i) => i.price === 0 && !i.lock).forEach((i) => {
    if (have[i.id]) return;
    const slot = i.slots.filter((x) => !taken[x])[0] || '';
    if (slot) taken[slot] = true;
    gAppend_('owned', { itemId: i.id, boughtOn: 'start', price: 0, slot }); added = true;
  });
  return added ? gRows_('owned') : rows;
}
function gOutsideTicks_(ticks, goals) {
  const ext = {}; goals.forEach((g) => { if (g.track === 'external') ext[g.id] = true; });
  return ticks.filter((t) => ext[t.goalId]).reduce((a, t) => a + Number(t.delta), 0);
}
function gLock_(lock, p, ticks, goals) {
  if (!lock) return { ok: true, why: '' };
  if (lock.level && p.level < lock.level) return { ok: false, why: lock.text || ('Level ' + lock.level) };
  if (lock.outside_work && gOutsideTicks_(ticks, goals) < lock.outside_work) return { ok: false, why: lock.text || (lock.outside_work + ' outside-work ticks') };
  return { ok: true, why: '' };
}
function gameShop(k) {
  check_(k);
  const p = gPlayer_(), owned = gOwned_(), ticks = gRows_('ticks'), goals = gGoals_(), have = {};
  owned.forEach((r) => { have[r.itemId] = r; });
  return gOut_({ coins: p.coins, level: p.level, outside: gOutsideTicks_(ticks, goals), items: gShop_().items.map((i) => {
    const lk = gLock_(i.lock, p, ticks, goals), r = have[i.id];
    return { id: i.id, name: i.name, category: i.category, slots: i.slots, tier: i.tier, price: i.price, own: !!r, slot: r ? r.slot : '', locked: !lk.ok, why: lk.why, w: (i.layers[i.slots[0]] || {}).w, h: (i.layers[i.slots[0]] || {}).h };
  }) });
}
// the pictures, fetched once by the page (about 160 KB): { id: { slot: {art, ox, oy, w, h} } } plus the room geometry
function gameArt(k) {
  check_(k);
  const sh = gShop_(), art = {};
  sh.items.forEach((i) => { art[i.id] = i.layers; });
  return { w: sh.w, h: sh.h, ulhu: sh.ulhu, z: sh.z, art };
}
function gameBuy(k, id) {
  check_(k);
  let bad = '';
  withLock_(function () {
    const it = gShop_().items.find((x) => x.id === id), p = gPlayer_(), owned = gOwned_();
    if (!it) { bad = 'That item is not in the shop.'; return; }
    if (owned.some((r) => r.itemId === id)) { bad = 'Ulhu already has that.'; return; }
    const lk = gLock_(it.lock, p, gRows_('ticks'), gGoals_());
    if (!lk.ok) { bad = 'Locked: ' + lk.why; return; }
    if (p.coins < it.price) { bad = 'Not enough doubloons (' + it.price + ' needed).'; return; }
    const taken = {}; owned.forEach((r) => { if (r.slot) taken[r.slot] = true; });
    const slot = it.slots.filter((x) => !taken[x])[0] || '';       // it goes straight into an empty slot, else the drawer
    p.coins -= it.price; gSavePlayer_(p);
    const now = gNow_();
    gAppend_('owned', { itemId: id, boughtOn: gDay_(now), price: it.price, slot });
    gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: gDay_(now), goalId: 'buy|' + id, delta: 0, coins: -it.price, xp: 0, hp: 0, auto: '', ref: '', note: JSON.stringify({ name: it.name }) });
  });
  if (bad) throw new Error(bad);
  return gSnapshot_(gWorld_());
}
function gamePlace(k, id, slot) {
  check_(k);
  let bad = '';
  withLock_(function () {
    const it = gShop_().items.find((x) => x.id === id), rows = gRows_('owned'), r = rows.find((x) => x.itemId === id);
    if (!it || !r) { bad = 'Ulhu does not own that.'; return; }
    if (slot === '') { gSet_('owned', r.row, 'slot', ''); return; }       // back to the drawer
    if (it.slots.indexOf(slot) < 0) { bad = 'That item does not go there.'; return; }
    rows.forEach((o) => { if (o.slot === slot && o.itemId !== id) gSet_('owned', o.row, 'slot', ''); });
    gSet_('owned', r.row, 'slot', slot);
  });
  if (bad) throw new Error(bad);
  return gSnapshot_(gWorld_());
}


/* ---------------------------------------------------------------- boss fights (slice 7)
   A big job split into stages with deadlines (test marking: half marked, the rest, totals added, entered on the system).
   maxHp = 100, shared across the stages. A stage done on time deals full damage, late half. Beating the boss (every
   stage done) pays its reward (default 200) once. A slipped deadline takes nothing: the stage just shows overdue. */
function gBosses_(today) {
  return gRows_('bosses').filter((b) => b.status === 'active' || (b.status === 'beaten' && b.beatenOn && gDiff_(b.beatenOn, today) <= 14)).map((b) => {
    let st = []; try { st = JSON.parse(b.stages || '[]'); } catch (e) { st = []; }
    const maxHp = Number(b.maxHp) || 100, dealt = st.reduce((a, x) => a + (x.done ? (x.late ? x.dmg / 2 : x.dmg) : 0), 0);
    let reward = {}; try { reward = JSON.parse(b.reward || '{}'); } catch (e) { reward = {}; }
    return { id: b.id, name: b.name, maxHp, hp: b.status === 'beaten' ? 0 : Math.max(0, Math.round(maxHp - dealt)), status: b.status, reward: reward.coins || 0, trophy: reward.trophy || '', size: reward.size || 5, creature: reward.k || '',
      stages: st.map((x, i) => ({ i, name: x.name, due: x.due, done: x.done || '', late: !!x.late, overdue: !x.done && x.due && x.due < today })) };
  });
}
function gameBossStart(k, boss) {
  check_(k);
  let newId = '';
  withLock_(function () {
    const today = gDay_(gNow_()), name = String(boss.name || '').trim().slice(0, 80);
    const stages = (boss.stages || []).map((x) => ({ name: String(x.name || '').trim().slice(0, 80), due: /^\d{4}-\d{2}-\d{2}$/.test(String(x.due)) ? x.due : '' })).filter((x) => x.name);
    if (!name || stages.length < 1) throw new Error('A boss needs a name and at least one stage.');
    const each = Math.round(100 / stages.length); stages.forEach((x, i) => { x.dmg = i === stages.length - 1 ? 100 - each * (stages.length - 1) : each; x.done = ''; });
    const size = [2, 5, 10, 20].indexOf(Number(boss.size)) >= 0 ? Number(boss.size) : 5, k = /^[a-z]{2,8}$/.test(String(boss.k || '')) ? boss.k : G_BOSS[size].k;
    newId = 'b' + Utilities.getUuid().slice(0, 7);
    gAppend_('bosses', { id: newId, name, maxHp: 100, stages: JSON.stringify(stages), reward: JSON.stringify({ coins: G_BOSS[size].gold, trophy: 'Trophy: ' + name, size, k }), startedOn: today, status: 'active', beatenOn: '' });
  });
  return gSnapshot_(gWorld_(), { newBoss: newId });
}
function gameBossStage(k, id, i, on) {
  check_(k);
  let res = null;
  withLock_(function () {
    const row = gRows_('bosses').find((b) => b.id === id); if (!row) throw new Error('That boss is gone.');
    const st = JSON.parse(row.stages), x = st[i]; if (!x) return;
    const today = gDay_(gNow_());
    if (on && !x.done) { x.done = today; x.late = !!(x.due && today > x.due); }
    else if (!on && x.done && row.status === 'active') { x.done = ''; x.late = false; }
    else return;
    gSet_('bosses', row.row, 'stages', JSON.stringify(st));
    const all = st.every((y) => y.done);
    if (all && row.status === 'active') {
      let rw = {}; try { rw = JSON.parse(row.reward || '{}'); } catch (e) { rw = {}; }
      const p = gPlayer_(), coins = rw.coins || 200; p.coins += coins; const up = gAddXp_(p, coins, today); gSavePlayer_(p);
      gSet_('bosses', row.row, 'status', 'beaten'); gSet_('bosses', row.row, 'beatenOn', today);
      gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: gNow_().toISOString(), day: today, goalId: 'boss|' + id, delta: 0, coins, xp: coins, hp: 0, auto: '', ref: 'boss|' + id, note: JSON.stringify({ name: row.name }) });
      res = { beaten: true, coins, name: row.name, up };
    }
  });
  return gSnapshot_(gWorld_(), res ? { boss: res } : null);
}
// remove a boss made by mistake (Patryk 2026-10-24: two made by accident). Only a boss still being fought; it is
// only marked "removed" (the row stays), so back = true puts it back exactly as it was (the Undo button).
function gameBossRemove(k, id, back) {
  check_(k);
  withLock_(function () {
    const row = gRows_('bosses').find((b) => b.id === id); if (!row) throw new Error('That boss is gone.');
    if (!back && row.status === 'active') gSet_('bosses', row.row, 'status', 'removed');
    if (back && row.status === 'removed') gSet_('bosses', row.row, 'status', 'active');
  });
  return gSnapshot_(gWorld_());
}

/* ---------------------------------------------------------------- Sunday review (slice 8)
   A card from Friday to Sunday (and Monday if the week before was not reviewed): this week's numbers, three boxes
   and the next three priorities. Saving it pays 20 once per week. */
function gReviewCard_(today, ticks, goals, bosses) {
  const dow = gDow_(today), wk = dow >= 5 ? gMonday_(today) : gAdd_(gMonday_(today), -7);
  const saved = gRows_('reviews').find((r) => String(r.week) === wk);
  const mon = wk, sun = gAdd_(wk, 6), wt = ticks.filter((t) => String(t.day) >= mon && String(t.day) <= sun);
  const done = wt.filter((t) => Number(t.delta) > 0), byG = {}; goals.forEach((g) => { byG[g.id] = g; });
  const count = (tr) => done.filter((t) => byG[t.goalId] && byG[t.goalId].track === tr).length;
  const due = dow >= 5 || dow === 1;
  return { week: wk, show: due && (!saved || dow >= 5 && String(saved.week) === wk), saved: saved ? { wentWell: saved.wentWell, slipped: saved.slipped, p1: saved.p1, p2: saved.p2, p3: saved.p3 } : null,
    stats: { ticks: done.length, coins: wt.filter((t) => Number(t.coins) > 0).reduce((a, t) => a + Number(t.coins), 0), necessary: count('necessary'), ahead: count('ahead'), outside: count('external'), life: count('life'), stages: bosses.reduce((a, b) => a + b.stages.filter((x) => x.done && x.done >= mon && x.done <= sun).length, 0) } };
}
function gameReview(k, rv) {
  check_(k);
  let paid = 0;
  withLock_(function () {
    const today = gDay_(gNow_()), wk = /^\d{4}-\d{2}-\d{2}$/.test(String(rv.week)) ? rv.week : gMonday_(today);
    const clip = (v) => String(v || '').slice(0, 400);
    const old = gRows_('reviews').find((r) => String(r.week) === wk);
    const rec = { week: wk, wentWell: clip(rv.wentWell), slipped: clip(rv.slipped), p1: clip(rv.p1), p2: clip(rv.p2), p3: clip(rv.p3), savedOn: today };
    if (old) G_HEAD.reviews.forEach((h) => { if (String(old[h]) !== String(rec[h])) gSet_('reviews', old.row, h, rec[h]); });
    else {
      gAppend_('reviews', rec); const p = gPlayer_(); p.coins += 20; paid = 20; gAddXp_(p, 20, today); gSavePlayer_(p);
      gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: gNow_().toISOString(), day: today, goalId: 'review|' + wk, delta: 0, coins: 20, xp: 20, hp: 0, auto: '', ref: 'review|' + wk, note: '{"name":"Sunday review"}' });
    }
  });
  return gSnapshot_(gWorld_(), { reviewPaid: paid });
}


/* ---------------------------------------------------------------- redesign (Claude Design handoff, 2026-10-24)
   Groups that fold (Teaching / Life and his own), quests with a checklist and a due date, blessings, bosses sized by
   hours, Ulhu's wardrobe, the Hoard (real rewards he writes himself) and the Chronicle (history). */
const G_BOSS = { 2: { k: 'spawn', gold: 60 }, 5: { k: 'shog', gold: 150 }, 10: { k: 'levi', gold: 300 }, 20: { k: 'old', gold: 600 } };
const G_GROUPS = [
  { id: 'teach', name: 'The Teaching Trench', plain: 'Teaching', parent: '', type: 'parent' },
  { id: 'chores', name: 'The Drudgery Shoals', plain: 'Teaching chores', parent: 'teach', type: 'list' },
  { id: 'summon', name: 'The Summoning Circle', plain: 'Summoned · tick themselves when built', parent: 'teach', type: 'summon' },
  { id: 'marking', name: 'The Marking Crypt', plain: 'Book marking · termly', parent: 'teach', type: 'marking' },
  { id: 'life', name: 'The Surface World', plain: 'Life', parent: '', type: 'list' }];
// where a ritual or quest sits when it has no group of its own
function gDefGrp_(g) {
  if (g.kind === 'todo') return g.track === 'life' ? 'life' : 'teach';
  if (g.kind === 'termly') return 'marking';
  return g.track === 'life' ? 'life' : 'chores';
}
function gGroups_(p) {
  let mine = []; try { mine = p.groups ? JSON.parse(p.groups) : []; } catch (e) { mine = []; }
  const out = G_GROUPS.map((g) => Object.assign({}, g, (mine.find((m) => m.id === g.id) || {}).name ? { name: mine.find((m) => m.id === g.id).name } : {}));
  mine.filter((m) => !G_GROUPS.some((g) => g.id === m.id)).forEach((m) => out.push({ id: m.id, name: m.name, plain: m.plain || 'Own group', parent: m.parent || '', type: 'list' }));
  return out;
}
// new group, or a new name for any group (built-in ones keep their job, only the name changes)
function gameGroupSave(k, grp) {
  check_(k);
  let id = '';
  withLock_(function () {
    const p = gPlayer_(); let mine = []; try { mine = p.groups ? JSON.parse(p.groups) : []; } catch (e) { mine = []; }
    const name = String(grp.name || '').trim().slice(0, 50); if (!name) throw new Error('Give the group a name.');
    id = grp.id || ('u' + Utilities.getUuid().slice(0, 6));
    const old = mine.find((m) => m.id === id);
    if (old) old.name = name;
    else mine.push({ id, name, plain: grp.plain ? String(grp.plain).slice(0, 40) : (grp.parent === 'teach' ? 'Teaching' : grp.parent === 'life' ? 'Life' : 'Own group'), parent: grp.parent === 'teach' ? 'teach' : '' });
    p.groups = JSON.stringify(mine); gSavePlayer_(p);
  });
  return gSnapshot_(gWorld_(), { saved: id });
}
// a step in a quest's checklist (no pay: the quest pays when it is ticked)
function gameQuestStep(k, id, i, on) {
  check_(k);
  withLock_(function () {
    const g = gGoals_().find((x) => x.id === id); if (!g || !g.steps[i]) return;
    g.steps[i].d = !!on; gSet_('goals', g.row, 'steps', JSON.stringify(g.steps));
  });
  return gSnapshot_(gWorld_());
}
function gBeaten_() {
  return gRows_('bosses').filter((b) => b.status === 'beaten').map((b) => {
    let r = {}; try { r = JSON.parse(b.reward || '{}'); } catch (e) { r = {}; }
    return { id: b.id, name: b.name, k: r.k || (G_BOSS[r.size] || G_BOSS[5]).k, on: b.beatenOn };
  }).reverse();
}
// the next days that freeze themselves: INSET days and the next holiday
function gFreezesAhead_(world, today, frozen) {
  const out = [], d = world.data || {};
  (d.inset || []).filter((x) => x >= today && x <= gAdd_(today, 70)).slice(0, 2).forEach((x) => out.push({ name: 'INSET day', day: x }));
  const t = (d.terms || []).find((x) => today <= x[1]); if (t) out.push({ name: 'Holidays', day: gAdd_(t[1], 1) });
  Object.keys(frozen).filter((x) => x >= today).slice(0, 3).forEach((x) => out.push({ name: frozen[x] === 'sick' ? 'Sick day' : 'Day off', day: x }));
  return out.sort((a, b) => (a.day < b.day ? -1 : 1)).slice(0, 4);
}

/* ---- wardrobe: 71 outfits drawn on the page (pixel-art.js); index 0 of each kind is free. Bought ones are rows
   "w:hat-3" in Game Owned; what he wears is the player's "wear" setting. */
const G_WEAR = { hat: 20, top: 14, face: 13, held: 12, skin: 12 }, G_WPRICE = [0, 60, 90, 120, 180, 220, 260, 320, 400, 500, 650, 900, 1200, 1500];
function gWearItem_(id) {
  const m = /^(hat|top|face|held|skin)-(\d{1,2})$/.exec(String(id)); if (!m || Number(m[2]) >= G_WEAR[m[1]]) return null;
  const i = Number(m[2]); return { id, cat: m[1], i, price: G_WPRICE[i] || 1500, lock: i >= 10 ? 8 + (i - 10) * 2 : 0 };
}
function gWearState_(p, rows) {
  let wear = {}; try { wear = p.wear ? JSON.parse(p.wear) : {}; } catch (e) { wear = {}; }
  const owned = Object.keys(G_WEAR).map((c) => c + '-0').concat(rows.map((r) => String(r.itemId).slice(2)));
  return { on: Object.assign({ hat: 'hat-0', top: '', face: '', held: '', skin: 'skin-0' }, wear), owned };
}
function gameWear(k, id, on) {
  check_(k);
  let bad = '';
  withLock_(function () {
    const w = gWearItem_(id); if (!w) { bad = 'That outfit is not in the wardrobe.'; return; }
    const p = gPlayer_(), rows = gRows_('owned'), st = gWearState_(p, rows.filter((r) => String(r.itemId).indexOf('w:') === 0));
    if (on && st.owned.indexOf(id) < 0) {
      if (w.lock > p.level) { bad = 'Locked: Level ' + w.lock; return; }
      if (p.coins < w.price) { bad = 'Not enough doubloons (' + w.price + ' needed).'; return; }
      p.coins -= w.price; const now = gNow_();
      gAppend_('owned', { itemId: 'w:' + id, boughtOn: gDay_(now), price: w.price, slot: '' });
      gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: gDay_(now), goalId: 'buy|w:' + id, delta: 0, coins: -w.price, xp: 0, hp: 0, auto: '', ref: '', note: JSON.stringify({ name: id }) });
    }
    const wear = st.on; wear[w.cat] = on ? id : (w.cat === 'skin' ? 'skin-0' : '');
    p.wear = JSON.stringify(wear); gSavePlayer_(p);
  });
  if (bad) throw new Error(bad);
  return gSnapshot_(gWorld_());
}
// Undo a purchase made today (shop item or outfit): the doubloons come back and the item goes
function gameUnbuy(k, id) {
  check_(k);
  withLock_(function () {
    const today = gDay_(gNow_()), rows = gRows_('owned'), key = gWearItem_(id) ? 'w:' + id : id;
    const r = rows.filter((x) => x.itemId === key && String(x.boughtOn) === today).pop(); if (!r) return;
    const p = gPlayer_(), price = Number(r.price) || 0; p.coins += price;
    if (key.indexOf('w:') === 0) { let wear = {}; try { wear = p.wear ? JSON.parse(p.wear) : {}; } catch (e) { wear = {}; } Object.keys(wear).forEach((c) => { if (wear[c] === id) wear[c] = c === 'skin' ? 'skin-0' : ''; }); p.wear = JSON.stringify(wear); }
    gSavePlayer_(p); gTab_('owned').deleteRow(r.row);
    gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: gNow_().toISOString(), day: today, goalId: 'buy|' + key, delta: 0, coins: price, xp: 0, hp: 0, auto: '', ref: '', note: JSON.stringify({ name: key, undo: true }) });
  });
  return gSnapshot_(gWorld_());
}

/* ---- the Hoard: rewards he writes himself and buys with doubloons ---- */
function gameHoardSave(k, h) {
  check_(k);
  let id = '';
  withLock_(function () {
    const name = String(h.name || '').trim().slice(0, 60); if (!name) throw new Error('Name the reward.');
    const cost = Math.max(1, Math.min(5000, Math.round(Number(h.cost) || 80)));
    const old = h.id ? gRows_('hoard').find((r) => r.id === h.id) : null;
    if (old) { gSet_('hoard', old.row, 'name', name); gSet_('hoard', old.row, 'cost', cost); if (h.archived !== undefined) gSet_('hoard', old.row, 'archived', h.archived ? 'true' : ''); id = old.id; }
    else { id = 'h' + Utilities.getUuid().slice(0, 7); gAppend_('hoard', { id, name, cost, claims: 0, archived: '', created: gDay_(gNow_()) }); }
  });
  return gSnapshot_(gWorld_(), { saved: id });
}
// claim = pay its cost; back = true is the Undo (gives the doubloons back)
function gameHoardClaim(k, id, back) {
  check_(k);
  let bad = '';
  withLock_(function () {
    const r = gRows_('hoard').find((x) => x.id === id); if (!r) { bad = 'That reward is gone.'; return; }
    const p = gPlayer_(), cost = Number(r.cost) || 0, claims = Number(r.claims) || 0, now = gNow_();
    if (!back && p.coins < cost) { bad = 'Not enough doubloons yet (' + (cost - p.coins) + ' more).'; return; }
    if (back && claims < 1) return;
    p.coins += back ? cost : -cost; gSavePlayer_(p); gSet_('hoard', r.row, 'claims', claims + (back ? -1 : 1));
    gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: gDay_(now), goalId: 'hoard|' + id, delta: 0, coins: back ? cost : -cost, xp: 0, hp: 0, auto: '', ref: '', note: JSON.stringify({ name: r.name, undo: !!back }) });
  });
  if (bad) throw new Error(bad);
  return gSnapshot_(gWorld_());
}

/* ---- the Chronicle: doubloons per week (7 weeks), a 5-week streak calendar, trophies ---- */
function gameChronicle(k) {
  check_(k);
  const today = gDay_(gNow_()), mon = gMonday_(today), ticks = gRows_('ticks'), world = gWorld_(), frozen = gFrozenDays_();
  const earn = (t) => Number(t.coins) > 0 && !/^(buy|hoard)\|/.test(String(t.goalId));
  const weeks = []; for (let i = 6; i >= 0; i--) { const m = gAdd_(mon, -7 * i), e = gAdd_(m, 6); weeks.push({ mon: m, coins: ticks.filter((t) => String(t.day) >= m && String(t.day) <= e && earn(t)).reduce((a, t) => a + Number(t.coins), 0) }); }
  const days = []; const start = gAdd_(mon, -28);
  for (let i = 0; i < 35; i++) { const d = gAdd_(start, i); days.push({ day: d, n: ticks.filter((t) => String(t.day) === d && Number(t.delta) > 0 && !/^(buy|hoard|review)\|/.test(String(t.goalId))).length, frozen: gIsFrozen_(d, world, frozen), future: d > today, today: d === today }); }
  return gOut_({ weeks, days, beaten: gBeaten_() });
}
