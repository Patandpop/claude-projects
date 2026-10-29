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
  coin: 'Runes',                                             // the currency (Eldritch Doubloons until 2026-10-25)
  maxHp: 60,                                                 // 50 until 2026-10-28: the worst single day (3 long slips, 48) never faints you from full
  levelGift: 10,                                             // each new level pours level x 10 runes onto the heap (2026-10-28)
  tierLevel: { Basic: 1, Nice: 5, Fancy: 12, Eldritch: 20 },  // shop tiers open by level, runes still needed (2026-10-28)
  base: { 5: 3, 15: 6, 30: 10, 60: 16, 120: 25 },          // doubloons and XP by minutes (pay grows slower than time)
  mult: { necessary: 1, ahead: 1.5, external: 3, life: 2 },  // what kind of job it is
  hpLoss: { 5: 4, 15: 6, 30: 8, 60: 12, 120: 16 },           // a bad habit costs health, never runes; even so Absolution halves cleanly (2026-10-27)
  lifeFirst: 5, lifeThree: 15,                               // life bonus: first life goal of the day, then three or more
  afterWork: 1.5, afterHour: 16,                             // life done after work on a school day pays x1.5 (not holidays or days off)
  streakSteps: [[66, 1.5], [30, 1.25], [7, 1.1]],             // ritual streak multiplier (Patryk 2026-10-27)
  vespersSteps: [[66, 1.25], [30, 1.2], [7, 1.1]],           // Vespers streak multiplier, on everything earned
};
const G_HEAD = {
  player: ['Setting', 'Value'],
  goals: ['id', 'name', 'kind', 'polarity', 'days', 'everyN', 'minutes', 'track', 'auto', 'value', 'streak', 'best', 'lastDone', 'private', 'sittings', 'sitDone', 'due', 'archived', 'created', 'grp', 'steps', 'miss', 'anti', 'who', 'aim', 'ceil'],
  ticks: ['id', 'at', 'day', 'goalId', 'delta', 'coins', 'xp', 'hp', 'auto', 'ref', 'note'],
  freeze: ['day', 'reason', 'savedOn'],
  seen: ['lesson', 'built', 'firstBuiltOn'],
  owned: ['itemId', 'boughtOn', 'price', 'slot'],
  bosses: ['id', 'name', 'maxHp', 'stages', 'reward', 'startedOn', 'status', 'beatenOn', 'grp'],
  reviews: ['week', 'wentWell', 'slipped', 'p1', 'p2', 'p3', 'savedOn', 'change', 'kept'],
  hoard: ['id', 'name', 'cost', 'claims', 'archived', 'created'],
  // phase 2 (Patryk 2026-10-27): Vespers each evening, and the tags (sigil + detail) given to a curse or a good habit
  vespers: ['day', 'clean', 'savedOn', 'note'],
  tags: ['tickId', 'day', 'goalId', 'side', 'sig', 'detail', 'savedOn'],
  // 2026-10-28: how long or how fully a ritual was done that day (the aim on top of the bottom line)
  aims: ['day', 'goalId', 'minutes', 'full', 'savedOn'],
};
const G_DAYF = ['day', 'lastDone', 'due', 'created', 'firstBuiltOn', 'savedOn', 'boughtOn', 'startedOn', 'beatenOn', 'week'];
const G_TAB = { player: 'Game Player', goals: 'Game Goals', ticks: 'Game Ticks', freeze: 'Game Freeze', seen: 'Game Seen', owned: 'Game Owned', bosses: 'Game Bosses', reviews: 'Game Reviews', hoard: 'Game Hoard', vespers: 'Game Vespers', tags: 'Game Tags', aims: 'Game Aims' };

// who each habit makes him (Patryk 2026-10-27): every tick of a habit with one of these is a vote in High Vespers
const G_WHO = ['Devoted', 'Wordsmith', 'Leviathan', 'Diligent', 'Steadfast', 'Scholar', 'Trusted', 'Mentor', 'Sanctified', 'Dreamer', 'Serene', 'Homeflame', 'Frugal', 'Nourished', 'Wanderer', 'Valiant'];
const G_SIGS = ['Flesh', 'Domain', 'Scene', 'Coven'];

/* ---- time: test-friendly (GAME_NOW is set only by tests), all days are London yyyy-MM-dd text ---- */
function gNow_() { return (typeof GAME_NOW !== 'undefined' && GAME_NOW) ? new Date(GAME_NOW) : new Date(); }
function gDay_(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function gAdd_(key, n) { const p = key.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)); return d.toISOString().slice(0, 10); }
function gDow_(key) { const p = key.split('-').map(Number), w = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); return w === 0 ? 7 : w; }   // 1 Mon .. 7 Sun
function gDiff_(a, b) { const f = (k) => { const p = k.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }; return Math.round((f(b) - f(a)) / 864e5); }
function gMonday_(key) { return gAdd_(key, 1 - gDow_(key)); }

/* ---- sheet access ---- */
const G_HEADOK = {};
// Faster taps (Patryk 2026-10-28): within one request each tab is read from Sheets once and the planner's world once.
// Any write to a tab forgets that tab's copy, so the next read is fresh. Every request and every lock starts clean.
let G_C = { sh: {}, v: {}, world: null };
function gFresh_(keepWorld) { G_C = { sh: G_C.sh, v: {}, world: keepWorld ? G_C.world : null }; if (!keepWorld) G_C.sh = {}; }
function gTab_(t) {
  const sh = G_C.sh[t] || (G_C.sh[t] = tab_(G_TAB[t], G_HEAD[t]));
  if (!G_HEADOK[t]) { G_HEADOK[t] = true; const n = G_HEAD[t].length; if (sh.getLastColumn() < n) sh.getRange(1, 1, 1, n).setValues([G_HEAD[t]]); }
  return sh;
}
function gRows_(t) {
  const sh = gTab_(t), n = G_C.v[t] ? G_C.v[t].length : sh.getLastRow() - 1;
  if (n < 1) return [];
  // Google Sheets turns text like 2026-11-03 into a real date: read every date back as London yyyy-MM-dd text
  const fix = (v) => (v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : v);
  const vals = G_C.v[t] || (G_C.v[t] = sh.getRange(2, 1, n, G_HEAD[t].length).getValues());
  return vals.map((r, i) => { const o = { row: i + 2 }; G_HEAD[t].forEach((h, j) => { o[h] = (G_DAYF.indexOf(h) >= 0 || (t === 'player' && h === 'Value')) ? fix(r[j]) : r[j]; }); return o; });
}
function gAppend_(t, o) { delete G_C.v[t]; gTab_(t).appendRow(G_HEAD[t].map((h) => (o[h] === undefined ? '' : o[h]))); }
function gDel_(t, row) { delete G_C.v[t]; gTab_(t).deleteRow(row); }
function gSet_(t, row, field, v) { delete G_C.v[t]; gTab_(t).getRange(row, G_HEAD[t].indexOf(field) + 1).setValue(v); }
function gPlayer_() {
  const p = { coins: 0, xp: 0, level: 1, hp: GAME.maxHp, maxHp: GAME.maxHp, lastDay: '', deaths: 0, seeded: '', diedDay: '', levelUpDay: '', frozenOk: '', groups: '', wear: '', markPlan: '', vTime: '20:00', vStreak: 0, vBest: 0, vLast: '', vPrev: '', myChips: '', aimsSeeded: '', riseDay: '', riseLost: 0, riseDone: '' };
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
  if (G_C.world) return G_C.world;
  try { const a = loadDataWeeks_(true); G_C.world = { data: a.data || null, weeks: a.weeks || {} }; } catch (e) { return { data: null, weeks: {} }; }
  return G_C.world;
}
function gFrozenDays_() { const s = {}; gRows_('freeze').forEach((r) => { s[String(r.day)] = r.reason || 'off'; }); return s; }
// The moon of a day (Patryk 2026-10-27): 'full' = a working day, 'half' = work rest (teaching rituals and quests pause,
// life keeps counting), 'dark' = full rest (ill or truly off). A weekday out of term or on INSET starts at half moon.
// His own row wins: 'on' = full, 'half' = half, any other reason (sick, off, other) = dark. Weekends start full.
function gAutoPhase_(day, world) {
  const w = gDow_(day), d = world.data;
  if (w > 5 || !d || !(d.terms || []).length) return 'full';
  if ((d.inset || []).includes(day)) return 'half';
  return (d.terms || []).some((t) => day >= t[0] && day <= t[1]) ? 'full' : 'half';
}
function gPhase_(day, world, frozen) {
  const r = frozen[day];
  if (r === 'on') return 'full';
  if (r === 'half') return 'half';
  if (r) return 'dark';
  return gAutoPhase_(day, world);
}
// frozen for one goal: dark freezes everything; half freezes everything except life (pass the goal, or { track: 'life' }).
// With no goal a half-moon day counts as frozen (it is not a working day).
function gIsFrozen_(day, world, frozen, goal) {
  const ph = gPhase_(day, world, frozen);
  if (ph === 'dark') return true;
  if (ph === 'half') return !(goal && goal.track === 'life');
  return false;
}

/* ---- pay ---- */
// the step a streak has reached (0 none, 1 = 7 nights, 2 = 30, 3 = 66), one lower after a single missed day
function gStep_(steps, streak, missed) { let st = 0; steps.forEach((x, i) => { if (!st && streak >= x[0]) st = steps.length - i; }); return Math.max(0, st - (missed ? 1 : 0)); }
function gStepMult_(steps, st) { return st ? steps[steps.length - st][1] : 1; }
let G_VM = null;                                                  // the Vespers multiplier, worked out once per request
function gVMult_() {
  if (G_VM !== null) return G_VM;
  try { const today = gDay_(gNow_()), p = gPlayer_(), world = gWorld_(), frozen = gFrozenDays_(), st = gVespersStreak_(p, today, world, frozen);
    let missed = 0; const last = String(p.vLast || ''); if (last) for (let d = gAdd_(last, 1); d < gAdd_(today, 0); d = gAdd_(d, 1)) if (!gIsFrozen_(d, world, frozen, { track: 'life' })) missed++;
    G_VM = gStepMult_(GAME.vespersSteps, gStep_(GAME.vespersSteps, st, missed === 1)); } catch (e) { G_VM = 1; }
  return G_VM;
}
function gRitualMult_(goal) { return gStepMult_(GAME.streakSteps, gStep_(GAME.streakSteps, Number(goal.streak) || 0, !!goal.miss)); }
function gPay_(goal, todayTicks, goalsById) {
  const m = Number(goal.minutes) || 15, track = goal.track || 'necessary';
  const base = GAME.base[m] || GAME.base[15], mult = GAME.mult[track] || 1;
  const val = Number(goal.value) || 0, red = val < 0 ? 1 + (-val) * 0.1 : 1;
  const sm = gRitualMult_(goal) * gVMult_();
  const core = Math.round(base * mult * red * sm * (track === 'life' && gAfterWork_() ? GAME.afterWork : 1));
  let bonus = 0;
  if (track === 'life') {
    const net = {};                                             // life goals done today (an untick takes one back out)
    (todayTicks || []).forEach((t) => { if (goalsById[t.goalId] && goalsById[t.goalId].track === 'life' && t.goalId !== goal.id) net[t.goalId] = (net[t.goalId] || 0) + Number(t.delta); });
    const n = Object.keys(net).filter((id) => net[id] > 0).length;
    if (n === 0) bonus = GAME.lifeFirst; else if (n === 2) bonus = GAME.lifeThree - GAME.lifeFirst;
  }
  return { coins: core + bonus, xp: core, bonus };
}
// after work = 4 pm or later on a school day that is not frozen (Patryk 2026-10-26: life after work pays extra,
// work or life in the holidays does not). Worked out once per hour.
let G_AW = null;
function gAfterWork_() {
  const now = gNow_(), day = gDay_(now), h = Number(Utilities.formatDate(now, TZ, 'H')), key = day + h;
  if (G_AW && G_AW.key === key) return G_AW.v;
  const v = h >= GAME.afterHour && gDow_(day) <= 5 && !gIsFrozen_(day, gWorld_(), gFrozenDays_());
  G_AW = { key, v }; return v;
}
function gBlessAmt_(g) { return Math.max(2, Math.round((GAME.base[Number(g.minutes) || 15] || 6) / 2)); }
function gBlessings_(goals) { return goals.filter((g) => g.kind === 'habit' && g.polarity !== 'minus').sort((a, b) => (a.id < b.id ? -1 : 1)); }
function gFeatured_(goals, today) { const b = gBlessings_(goals); return b.length ? b[gDiff_('2026-01-01', today) % b.length].id : ''; }
function gBlessCount_(goals, todayTicks) { const ids = {}; gBlessings_(goals).forEach((g) => { ids[g.id] = true; }); return todayTicks.filter((t) => ids[t.goalId]).reduce((a, t) => a + Number(t.delta), 0); }
function gBlessPay_(g) { const amt = gBlessAmt_(g); return { coins: amt, xp: amt * 2, bonus: 0 }; }
function gHpLoss_(goal) { return GAME.hpLoss[Number(goal.minutes) || 15] || 4; }

function gAddXp_(p, xp, today) {
  p.xp += xp; let up = false;
  while (p.xp >= gNeed_(p.level)) { p.xp -= gNeed_(p.level); p.level++; p.hp = p.maxHp; p.coins += p.level * GAME.levelGift; up = true; }
  if (up) p.levelUpDay = today;
  return up;
}
function gTakeXp_(p, xp) {
  p.xp -= xp;
  while (p.xp < 0 && p.level > 1) { p.coins = Math.max(0, p.coins - p.level * GAME.levelGift); p.level--; p.xp += gNeed_(p.level); }   // an undone level takes its gift back
  if (p.xp < 0) p.xp = 0;
}
// 0 HP: level -1 (never below 1), XP to the start of that level, minus the doubloons earned in the last 7 days.
function gDie_(p, today, ticks) {
  const since = gAdd_(today, -7);
  const earned = ticks.filter((t) => String(t.day) > since && t.coins > 0 && !/^(buy|hoard)\|/.test(String(t.goalId))).reduce((a, t) => a + Number(t.coins), 0);
  const lost = Math.min(p.coins, earned);
  p.level = Math.max(1, p.level - 1); p.xp = 0; p.coins -= lost; p.hp = p.maxHp; p.deaths++; p.diedDay = today;
  p.riseDay = today; p.riseLost = lost; p.riseDone = '';           // the Rise quest: 3 rituals today win back half (2026-10-28)
  return { lost, level: p.level, rise: Math.floor(lost / 2) };
}

/* ---- goals ---- */
function gGoals_() {
  return gRows_('goals').filter((g) => String(g.archived) !== 'true' && g.archived !== true).map((g) => {
    g.minutes = Number(g.minutes) || 15; g.value = Number(g.value) || 0; g.streak = Number(g.streak) || 0; g.best = Number(g.best) || 0;
    g.everyN = Number(g.everyN) || 0; g.sittings = Number(g.sittings) || 0; g.sitDone = Number(g.sitDone) || 0;
    g.private = String(g.private) === 'true'; g.lastDone = String(g.lastDone || ''); g.due = String(g.due || ''); g.days = String(g.days || ''); g.grp = String(g.grp || ''); g.miss = String(g.miss || ''); g.anti = String(g.anti || ''); g.who = String(g.who || '');
    try { g.steps = g.steps ? JSON.parse(g.steps) : []; } catch (e) { g.steps = []; }
    g.aim = gAimParse_(g.aim); g.ceil = Number(g.ceil) || 0;
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

/* ---- Absolution (Patryk 2026-10-27): a slipped curse can be won back by its antidote blessing (a two-sided habit's own
   good side). Window = the slip day and the whole next day. Absolution I gives back half the health the slip cost,
   Absolution II the rest. The health rides on the blessing's own tick row, so its Undo reverses it exactly. ---- */
function gNote_(t) { try { return JSON.parse(t.note || '{}'); } catch (e) { return {}; } }
function gUndone_(ticks) { const u = {}; ticks.forEach((t) => { const n = gNote_(t); if (n.untick) u[n.untick] = true; }); return u; }
function gAntiOf_(g) { return g.polarity === 'both' ? g.id : String(g.anti || ''); }
// the open slips that blessing bid can absolve, oldest first: [{ slip, curse, stage, lost, until }]
function gOpenSlips_(ticks, goals, bid, today) {
  const undone = gUndone_(ticks), byId = {}; goals.forEach((g) => { byId[g.id] = g; });
  const steps = {}; ticks.forEach((t) => { const n = gNote_(t); if (n.absOf && !undone[t.id]) steps[n.absOf] = (steps[n.absOf] || 0) + 1; });
  return ticks.filter((t) => { const n = gNote_(t); return n.side === 'c' && !undone[t.id] && n.anti === bid && String(t.day) >= gAdd_(today, -1) && (steps[t.id] || 0) < 2 && byId[t.goalId]; })
    .map((t) => ({ slip: t.id, curse: t.goalId, name: byId[t.goalId].name, stage: steps[t.id] || 0, lost: -Number(t.hp) || 0, until: gAdd_(String(t.day), 1) }));
}

// one tick written and applied (used by manual ticks and by the auto hooks)
function gTick_(g, delta, auto, ref, note) {
  const now = gNow_(), today = gDay_(now), p = gPlayer_(), ticks = gRows_('ticks'), goals = gGoals_();
  const byId = {}; goals.forEach((x) => { byId[x.id] = x; });
  if (ref && ticks.some((t) => t.ref === ref)) return null;                  // the same evidence never pays twice
  const out = { coins: 0, xp: 0, hp: 0, bad: false, up: false, died: null };
  const prev = { s: g.streak, v: g.value, ld: g.lastDone, sd: g.sitDone, m: g.miss };
  note = Object.assign({}, note || {});
  if (delta < 0) {                                                            // a bad habit: health only
    out.bad = true; out.hp = -gHpLoss_(g); p.hp += out.hp;
    note.side = 'c'; if (gAntiOf_(g)) note.anti = gAntiOf_(g);
    if (p.hp <= 0) out.died = gDie_(p, today, ticks);
    if (g.row) gSet_('goals', g.row, 'value', Math.max(-5, g.value - 1));
  } else {
    const pay = g.kind === 'habit' ? gBlessPay_(g, goals, gTicksToday_(ticks, today), today) : gPay_(g, gTicksToday_(ticks, today), byId);
    out.coins = pay.coins; out.xp = pay.xp; p.coins += pay.coins; out.up = gAddXp_(p, pay.xp, today);
    out.hp = Math.min(1, p.maxHp - p.hp); p.hp = Math.min(p.maxHp, p.hp + 1);
    if (g.kind === 'habit') { note.side = 'b';
      const open = gOpenSlips_(ticks, goals, g.id, today)[0];
      if (open) { const back = open.stage === 0 ? Math.floor(open.lost / 2) : open.lost - Math.floor(open.lost / 2), got = Math.min(back, p.maxHp - p.hp);
        p.hp += got; out.hp += got; note.absOf = open.slip; out.abs = { stage: open.stage + 1, hp: back, curse: open.name }; } }
    if (g.row && g.kind !== 'ghost') {
      if (g.kind === 'termly') gSet_('goals', g.row, 'sitDone', g.sitDone + 1);
      else if (gNet_(ticks, g.id, today) === 0) {                           // first tick of the day moves streak and colour
        const st = g.streak + 1;
        gSet_('goals', g.row, 'streak', st); gSet_('goals', g.row, 'best', Math.max(g.best, st)); if (g.miss) gSet_('goals', g.row, 'miss', '');
        gSet_('goals', g.row, 'value', Math.min(5, g.value + 1));
      }
      gSet_('goals', g.row, 'lastDone', today);
    }
    // the Rise quest: the third different ritual ticked on the day he fainted wins back half the lost runes
    if (g.kind === 'daily' && p.riseDay === today && !p.riseDone && p.riseLost > 0) {
      const done = {}; goals.filter((x) => x.kind === 'daily' && gNet_(ticks, x.id, today) > 0).forEach((x) => { done[x.id] = 1; }); done[g.id] = 1;
      if (Object.keys(done).length >= 3) { const back = Math.floor(Number(p.riseLost) / 2); p.coins += back; out.coins += back; out.rise = back; note.rise = back; p.riseDone = today; }
    }
  }
  gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: today, goalId: g.id, delta: 1, coins: out.coins, xp: out.xp, hp: out.hp, auto: auto ? 'yes' : '', ref: ref || '', note: JSON.stringify(Object.assign({ prev, name: g.name }, note)) });
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
    goals.filter((g) => g.kind === 'daily' && !gIsFrozen_(d, world, frozen, g) && gIsDue_(Object.assign({}, g, { lastDone: '' }), d) && !g.everyN).forEach((g) => {
      if (gNet_(ticks, g.id, d) > 0) return;
      g.value = Math.max(-5, g.value - 1); gSet_('goals', g.row, 'value', g.value);   // missed: the goal turns redder, no health lost
      if (!g.miss) { g.miss = d; gSet_('goals', g.row, 'miss', d); return; }          // never miss twice: the first miss is forgiven
      g.streak = 0; g.miss = ''; gSet_('goals', g.row, 'streak', 0); gSet_('goals', g.row, 'miss', '');
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
/* ---- aims and bottom lines (Patryk 2026-10-28) ----
   A ritual's tick is always its bottom line (it keeps the streak). On top, an aim:
     avg   = minutes a day on average over the week (Read: 15), from the minutes dial after a tick
     count = full sessions in the week (Train: 3), marked by a second tap that day
     times = ticks in the week (Cook at home: 5)
   floor = the bottom line: days ticked in the week (Read 7, Train 3). Stored as text "avg:15:7" (never starts + - =).
   A curse can have a weekly ceiling (Netflix: 2); being over costs nothing, High Vespers just shows it. */
function gAimParse_(v) {
  const m = /^(avg|count|times):(\d+):(\d+)$/.exec(String(v || '').trim());
  return m ? { type: m[1], target: Number(m[2]), floor: Number(m[3]) } : null;
}
function gAimText_(a) {
  if (!a || ['avg', 'count', 'times'].indexOf(a.type) < 0) return '';
  const n = (x, hi) => Math.max(1, Math.min(hi, Math.round(Number(x) || 0)));
  return a.type + ':' + n(a.target, a.type === 'avg' ? 600 : 21) + ':' + n(a.floor, 7);
}
// one ritual's week from day `from` to day `to`: days ticked, minutes, full sessions, the average, and the verdict
function gAimWeek_(g, from, to, ticks, aimRows, undone, world, frozen) {
  const tickDays = {}; ticks.forEach((t) => { if (t.goalId === g.id && String(t.day) >= from && String(t.day) <= to && Number(t.delta) > 0 && !undone[t.id] && !gNote_(t).untick) tickDays[String(t.day)] = 1; });
  let minutes = 0, full = 0, live = 0;
  for (let d = from; d <= to; d = gAdd_(d, 1)) { if (!gIsFrozen_(d, world, frozen, g)) live++; }
  Object.keys(tickDays).forEach((d) => { const r = aimRows.find((x) => x.goalId === g.id && String(x.day) === d);
    minutes += r && Number(r.minutes) > 0 ? Number(r.minutes) : 1;                 // a tick with no minutes is the 1-minute bottom line
    if (r && String(r.full) === 'true') full++; });
  const days = Object.keys(tickDays).length, a = g.aim, span = Math.max(1, live), scale = span / 7;
  const avg = Math.round(minutes / span), floorNeed = a ? Math.ceil(a.floor * scale) : 0;
  let state = days ? 'floor' : 'miss';
  if (a) {
    const hit = a.type === 'avg' ? avg >= a.target : a.type === 'count' ? full >= Math.ceil(a.target * scale) : days >= Math.ceil(a.target * scale);
    state = hit ? 'aim' : days >= floorNeed ? 'floor' : 'miss';
  }
  return { id: g.id, name: g.name, aim: a, days, minutes, full, avg, floorNeed, state };
}
// set (or change) how long or how fully a ritual was done today; minutes null = leave, full null = leave
function gameAim(k, id, minutes, full) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const g = gGoals_().find((x) => x.id === id); if (!g || g.kind !== 'daily') return;
    const today = gDay_(gNow_()), r = gRows_('aims').find((x) => x.goalId === id && String(x.day) === today);
    const m = minutes === null || minutes === undefined ? null : Math.max(0, Math.min(600, Math.round(Number(minutes) || 0)));
    if (r) { if (m !== null) gSet_('aims', r.row, 'minutes', m); if (full !== null && full !== undefined) gSet_('aims', r.row, 'full', full ? 'true' : ''); }
    else gAppend_('aims', { day: today, goalId: id, minutes: m === null ? '' : m, full: full ? 'true' : '', savedOn: gNow_().toISOString() });
  });
  return gSnapshot_(gWorld_());
}
// once-only upgrades: health 60 (was 50), and the aims, bottom lines, ceilings and two new rituals he approved (2026-10-28)
function gUpgrade_(today) {
  const p = gPlayer_();
  if (Number(p.maxHp) < GAME.maxHp) { p.hp = Math.min(GAME.maxHp, Number(p.hp) + GAME.maxHp - Number(p.maxHp)); p.maxHp = GAME.maxHp; gSavePlayer_(p); }
  if (p.aimsSeeded) return;
  const goals = gGoals_(), find = (re, kind) => goals.find((g) => g.kind === kind && re.test(String(g.name)));
  [[/^read( |$)/i, 'avg:15:7'], [/^(train|workout|gym)( |$)/i, 'count:3:3'], [/martha/i, 'count:1:3'], [/friend/i, 'count:2:2']].forEach(([re, aim]) => {
    const g = find(re, 'daily'); if (g && !g.aim) gSet_('goals', g.row, 'aim', aim); });
  const nf = find(/netflix/i, 'habit'); if (nf && !nf.ceil) gSet_('goals', nf.row, 'ceil', 2);
  const mk = (name, aim) => ({ id: 'g' + Utilities.getUuid().slice(0, 7), name, kind: 'daily', polarity: 'plus', days: '1234567', everyN: '', minutes: 30, track: 'life', auto: '', value: 0, streak: 0, best: 0, lastDone: '', private: 'true', sittings: '', sitDone: '', due: '', archived: '', created: today, grp: '', aim });
  if (!find(/^writ/i, 'daily')) gAppend_('goals', mk('Write', 'count:2:4'));
  if (!find(/cook/i, 'daily')) gAppend_('goals', mk('Cook at home', 'times:5:3'));
  const p2 = gPlayer_(); p2.aimsSeeded = today; gSavePlayer_(p2);
}
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

// Patryk 2026-10-26: book marking one class a week, Year 9 first, then 10C2, 10S2, Year 7, Year 8; each due the
// Friday of its week, starting with the first school week from today. Only sets the dates (he can edit them after).
const G_MARK_ORDER = [['9AS', 0], ['9XS', 0], ['10C2', 1], ['10S2', 2], ['7MLA', 3], ['8XP', 4], ['8AG', 5]];
function gMarkPlan_(world, today) {
  const t = (((world.data || {}).terms) || []).find((x) => today <= x[1]), start = t && t[0] > today ? t[0] : today;
  let mon = gMonday_(start); if (gDow_(start) > 5) mon = gAdd_(mon, 7);
  gGoals_().filter((g) => g.kind === 'termly').forEach((g) => {
    const m = G_MARK_ORDER.find((x) => String(g.name).toUpperCase().split(/[^A-Z0-9]+/).indexOf(x[0]) >= 0);
    if (m) gSet_('goals', g.row, 'due', gAdd_(mon, 4 + 7 * m[1]));
  });
}

// ---- ahead charts (Patryk 2026-10-26): lessons built ahead (the Tide, 0-3) and homework set ahead (weeks) ----
// homework: for each class set homework in the last 5 weeks, the furthest set-on date already made; the least-ahead
// class decides how many whole weeks ahead the homework is.
function gHwAhead_(today) {
  let rows = []; try { rows = typeof hwRows_ === 'function' ? hwRows_() : []; } catch (e) { rows = []; }
  const by = {};
  rows.filter((r) => r.setOn && r.setOn >= gAdd_(today, -35) && r.status !== 'not made').forEach((r) => { if (!by[r.cls] || r.setOn > by[r.cls]) by[r.cls] = r.setOn; });
  const cls = Object.keys(by); if (!cls.length) return null;
  cls.sort((a, b) => (by[a] < by[b] ? -1 : 1));
  const days = gDiff_(today, by[cls[0]]);
  return { weeks: Math.max(0, Math.floor(days / 7)), last: cls[0] };
}
function gTide_(ahead, today) {
  const allBuilt = (days) => ahead.filter((L) => L.date <= gAdd_(today, days)).every((L) => L.built);
  return !ahead.length ? 0 : !ahead[0].built ? 0 : !allBuilt(7) ? 1 : !allBuilt(14) ? 2 : 3;
}
// a week ahead pays once a week, two weeks ahead pays again (lessons and homework each); never on frozen days
function gAheadPay_(world, today, out) {
  if (gIsFrozen_(today, world, gFrozenDays_())) return;
  const mon = gMonday_(today), tide = gTide_(gLessonsAhead_(world, today), today), hw = gHwAhead_(today);
  const pay = (key, name, minutes) => { const r = gTick_({ id: 'ahead|' + key, name, kind: 'ghost', minutes, track: 'ahead', streak: 0, value: 0 }, 1, true, 'ahead|' + key + '|' + mon); if (r) out.push({ name, coins: r.coins }); };
  if (tide >= 2) pay('lessons1', 'Lessons a week ahead', 60);
  if (tide >= 3) pay('lessons2', 'Lessons two weeks ahead', 120);
  if (hw && hw.weeks >= 1) pay('hw1', 'Homework a week ahead', 60);
  if (hw && hw.weeks >= 2) pay('hw2', 'Homework two weeks ahead', 120);
}

/* ---- public functions ---- */
function gSnapshot_(world, extra) {
  const today = gDay_(gNow_()), p = gPlayer_(), goals = gGoals_(), ticks = gRows_('ticks'), frozen = gFrozenDays_();
  const byId = {}; goals.forEach((g) => { byId[g.id] = g; }); const undone = gUndone_(ticks);
  const aimRows = gRows_('aims'), wkMon = gMonday_(today);
  const todayTicks = gTicksToday_(ticks, today), fz = gIsFrozen_(today, world, frozen), feat = gFeatured_(goals, today);
  const tickDay = {}; ticks.forEach((t) => { const key = t.goalId + '|' + t.day; tickDay[key] = (tickDay[key] || 0) + Number(t.delta); });
  const strip = (g) => { let s14 = ''; for (let i = 13; i >= 0; i--) { const d = gAdd_(today, -i); s14 += gIsFrozen_(d, world, frozen, g) ? 'f' : (tickDay[g.id + '|' + d] || 0) > 0 ? 'o' : (!g.everyN && gIsDue_(Object.assign({}, g, { lastDone: '' }), d) && String(g.created || '') <= d && d < today) ? 'x' : '-'; } return s14; };
  const view = goals.map((g) => {
    const net = gNet_(ticks, g.id, today), pay = gPay_(g, todayTicks, byId);
    const o = { id: g.id, name: g.name, kind: g.kind, polarity: g.polarity, minutes: g.minutes, track: g.track, auto: g.auto, value: g.value, streak: g.streak, private: g.private,
      days: g.days, everyN: g.everyN, pay: pay.coins, mult: g.kind === 'daily' ? gRitualMult_(g) : 1, hpLoss: g.kind === 'habit' ? gHpLoss_(g) : 0, doneToday: net > 0, count: net, grp: g.grp || gDefGrp_(g), steps: g.steps, miss: !!g.miss, anti: g.anti, who: g.who };
    if (g.kind === 'habit' && g.polarity !== 'minus') { o.featured = false; o.pay = gBlessAmt_(g); const sl = gOpenSlips_(ticks, goals, g.id, today); if (sl.length) o.absolve = sl[0]; }
    if (g.kind === 'habit' && g.polarity === 'both') { const side = (sd) => ticks.filter((t) => t.goalId === g.id && String(t.day) === today && gNote_(t).side === sd && !undone[t.id]).length; o.cCount = side('c'); o.bCount = side('b'); }
    if (g.kind === 'todo') { o.due = g.due; o.doneOn = g.lastDone; o.dueToday = !g.lastDone || gDiff_(g.lastDone, today) <= 14; }
    if (g.kind === 'daily') { o.dueToday = gIsDue_(g, today); o.strip = strip(g);
      if (g.aim) { const r = aimRows.find((x) => x.goalId === g.id && String(x.day) === today); o.aim = g.aim; o.aimToday = { minutes: r && r.minutes !== '' ? Number(r.minutes) : null, full: !!(r && String(r.full) === 'true') };
        o.aimWeek = gAimWeek_(g, wkMon, today, ticks, aimRows, undone, world, frozen); } }
    if (g.kind === 'habit' && g.ceil) { o.ceil = g.ceil; o.ceilWeek = ticks.filter((t) => t.goalId === g.id && String(t.day) >= wkMon && !undone[t.id] && gNote_(t).side === 'c').length; }
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
  const summoned = ahead.slice(0, 10).map((L) => ({ name: L.name, date: L.date, ahead: L.ahead, built: L.built, pay: gPay_({ minutes: 30, track: L.ahead ? 'ahead' : 'necessary' }, [], {}).coins }));   // pay = what building it pays (gTick_ in the auto-ticks above)
  // Tide Charts: 1 = the next lesson is built, 2 = everything this coming week, 3 = two weeks ahead
  const tide = gTide_(ahead, today), hw = gHwAhead_(today);
  const mon = gMonday_(today), weekCoins = ticks.filter((t) => String(t.day) >= mon && Number(t.coins) > 0 && !/^(buy|hoard)\|/.test(String(t.goalId))).reduce((a, t) => a + Number(t.coins), 0);
  const wearRows = gRows_('owned').filter((r) => String(r.itemId).indexOf('w:') === 0);
  const owned = gRows_('owned').filter((r) => String(r.itemId).indexOf('w:') !== 0), room = {}; owned.forEach((r) => { if (r.slot) room[r.slot] = r.itemId; });
  const bosses = gBosses_(today), review = gReviewCard_(today, ticks, goals, bosses), vespers = gVespers_(today, ticks, goals, p, world, frozen), high = gHighShape_(gHighVespers_(today, ticks, goals, world, frozen));
  const hoard = gRows_('hoard').filter((h) => String(h.archived) !== 'true').map((h) => ({ id: h.id, name: h.name, cost: Number(h.cost) || 0, claims: Number(h.claims) || 0 }));
  return gOut_(Object.assign({ bosses: bosses.filter((b) => b.status === 'active'), beaten: gBeaten_(), review, vespers, high, whoList: G_WHO, moon: gPhase_(today, world, frozen), vMult: gVMult_(), room, owned: owned.map((r) => r.itemId), player: { coins: p.coins, xp: p.xp, level, need: gNeed_(level), hp: p.hp, maxHp: p.maxHp, deaths: p.deaths, coinName: GAME.coin, gift: GAME.levelGift,
      rise: p.riseDay === today && Number(p.riseLost) > 0 ? { done: p.riseDone === today, back: Math.floor(Number(p.riseLost) / 2), got: goals.filter((x) => x.kind === 'daily' && gNet_(ticks, x.id, today) > 0).length, need: 3 } : null }, mood, today, frozen: fz,
    goals: view, summoned, tide, hw, weekCoins, groups: gGroups_(p), hoard, wear: gWearState_(p, wearRows), freezes: gFreezesAhead_(world, today, frozen), blessCount: gBlessCount_(goals, todayTicks), hour: Number(Utilities.formatDate(gNow_(), TZ, 'H')),
    table: { base: GAME.base, mult: GAME.mult, hpLoss: GAME.hpLoss } }, extra || {}));
}
// what goes back to the page is plain JSON (a Date or NaN inside makes Apps Script send back null)
function gOut_(o) { return JSON.parse(JSON.stringify(o)); }
function gameLoad(k) {
  check_(k); gFresh_();
  let extra = {};
  withLock_(function () { gFresh_(true);
    const world = gWorld_(), today = gDay_(gNow_());
    const p = gPlayer_();
    if (!p.seeded) { gSeed_(world, today); p.seeded = today; p.lastDay = gAdd_(today, -1); gSavePlayer_(p); }
    gOwned_();
    gGoals_().filter((g) => g.name === 'Set homework (the classes owed it)' && !g.auto).forEach((g) => gSet_('goals', g.row, 'auto', 'homeworkSet'));
    if (!p.markPlan) { gMarkPlan_(world, today); p.markPlan = today; gSavePlayer_(p); }
    gUpgrade_(today);
    gRollover_(world);
    const auto = []; gAutoScan_(world, today, gGoals_(), auto); gAheadPay_(world, today, auto);
    if (auto.length) extra.auto = auto;
  });
  return gSnapshot_(gWorld_(), extra);
}
// sig: the sigil tapped after a curse (Flesh, Domain, Scene, Coven), or '' for a double tap (Patryk 2026-10-27)
function gameTick(k, id, delta, sig) {
  check_(k); gFresh_();
  let res = null, bad = null;
  withLock_(function () { gFresh_(true);
    const g = gGoals_().find((x) => x.id === id);
    if (!g) { bad = 'That ritual is not in the list any more.'; return; }
    const today = gDay_(gNow_());
    if (delta < 0 && g.kind !== 'habit') { bad = 'Only a bad habit takes health.'; return; }
    if (delta > 0 && g.kind !== 'habit' && g.kind !== 'termly' && gNet_(gRows_('ticks'), g.id, today) > 0) { res = { already: true }; return; }
    if (delta > 0 && g.kind === 'todo' && g.lastDone) { res = { already: true }; return; }
    if (g.kind === 'termly' && g.sitDone >= g.sittings) { res = { already: true }; return; }
    res = gTick_(g, delta < 0 ? -1 : 1, false, '', delta < 0 && /^(Flesh|Domain|Scene|Coven)$/.test(String(sig || '')) ? { sig } : null);
  });
  if (bad) throw new Error(bad);
  return gSnapshot_(gWorld_(), { last: res ? { coins: res.coins || 0, hp: res.hp || 0, up: !!res.up, died: res.died || null, bad: !!res.bad, abs: res.abs || null } : null });
}
// untick: writes an exact reversing row (never deletes), restores streak, colour and sittings
function gameUntick(k, id) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const g = gGoals_().find((x) => x.id === id); if (!g) return;
    const now = gNow_(), today = gDay_(now), ticks = gRows_('ticks').filter((t) => t.goalId === id && String(t.day) === today);
    const stack = [];
    ticks.forEach((t) => { if (Number(t.delta) > 0) stack.push(t); else stack.pop(); });
    const t = stack.pop(); if (!t) return;
    const p = gPlayer_(), c = Number(t.coins) || 0, x = Number(t.xp) || 0, h = Number(t.hp) || 0;
    p.coins = Math.max(0, p.coins - c); gTakeXp_(p, x); p.hp = Math.max(1, Math.min(p.maxHp, p.hp - h));
    let prev = {}, tn = {}; try { tn = JSON.parse(t.note || '{}'); prev = tn.prev || {}; } catch (e) { prev = {}; }
    if (tn.rise) p.riseDone = '';                                                   // the Rise payout rode on this tick: its quest opens again
    if (g.kind === 'termly') gSet_('goals', g.row, 'sitDone', Math.max(0, g.sitDone - 1));
    else if (g.kind === 'todo') gSet_('goals', g.row, 'lastDone', '');
    else if (g.kind !== 'habit' && prev.s !== undefined) { gSet_('goals', g.row, 'streak', prev.s); gSet_('goals', g.row, 'value', prev.v); gSet_('goals', g.row, 'lastDone', prev.ld || ''); if (prev.m !== undefined) gSet_('goals', g.row, 'miss', prev.m || ''); }
    gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: today, goalId: id, delta: -1, coins: -c, xp: -x, hp: -h, auto: '', ref: '', note: JSON.stringify({ untick: t.id, name: g.name }) });
    gSavePlayer_(p);
  });
  return gSnapshot_(gWorld_());
}
function gameSaveGoal(k, goal) {
  check_(k); gFresh_();
  let savedId = '';
  withLock_(function () { gFresh_(true);
    const today = gDay_(gNow_()), name = String(goal.name || '').trim().slice(0, 80);
    if (!name) throw new Error('Give the ritual a name.');
    const kind = ['daily', 'habit', 'todo', 'termly'].indexOf(goal.kind) >= 0 ? goal.kind : 'daily';
    const track = ['necessary', 'ahead', 'external', 'life'].indexOf(goal.track) >= 0 ? goal.track : 'necessary';
    const minutes = [5, 15, 30, 60, 120].indexOf(Number(goal.minutes)) >= 0 ? Number(goal.minutes) : 15;
    const old = goal.id ? gRows_('goals').find((r) => r.id === goal.id) : null;
    const rec = { id: old ? old.id : 'g' + Utilities.getUuid().slice(0, 7), name, kind, polarity: ['plus', 'minus', 'both'].indexOf(goal.polarity) >= 0 ? goal.polarity : (kind === 'habit' ? 'minus' : 'plus'),
      days: String(goal.days || '').replace(/[^1-7]/g, ''), everyN: Number(goal.everyN) || '', minutes, track, auto: old ? old.auto : '', value: old ? old.value : 0, streak: old ? old.streak : 0, best: old ? old.best : 0,
      lastDone: old ? old.lastDone : '', private: goal.private ? 'true' : '', sittings: kind === 'termly' ? (Number(goal.sittings) || 1) : '', sitDone: old ? old.sitDone : (kind === 'termly' ? 0 : ''),
      due: String(goal.due || ''), archived: '', created: old ? old.created : today, miss: old ? (old.miss || '') : '', grp: String(goal.grp || '').slice(0, 40),
      anti: kind === 'habit' ? String(goal.anti || '').slice(0, 20) : '',
      who: G_WHO.indexOf(String(goal.who || '')) >= 0 ? goal.who : '',
      // a form that doesn't send aim or ceil (older pages) keeps what was there
      aim: kind !== 'daily' ? '' : goal.aim === undefined ? (old ? String(old.aim || '') : '') : gAimText_(goal.aim),
      ceil: kind !== 'habit' ? '' : goal.ceil === undefined ? (old ? old.ceil : '') : Number(goal.ceil) > 0 ? Math.min(50, Math.round(Number(goal.ceil))) : '',
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
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true); const r = gRows_('goals').find((x) => x.id === id); if (r) gSet_('goals', r.row, 'archived', back ? '' : 'true'); });
  return gSnapshot_(gWorld_());
}
// a sick or off day (today or the last 7 days): streaks and colours stay as they are
function gameMoon(k, day, phase) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const today = gDay_(gNow_()), world = gWorld_();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day)) || day > gAdd_(today, 60) || day < gAdd_(today, -7)) throw new Error('Only the last 7 days or the next 60.');
    if (['full', 'half', 'dark'].indexOf(phase) < 0) throw new Error('The moon is full, half or dark.');
    const r = gRows_('freeze').find((x) => String(x.day) === day);
    if (r) gDel_('freeze', r.row);
    if (phase !== gAutoPhase_(day, world)) gAppend_('freeze', { day, reason: phase === 'full' ? 'on' : phase === 'half' ? 'half' : 'off', savedOn: today });
  });
  G_VM = null;
  return gSnapshot_(gWorld_());
}
function gameFreeze(k, day, reason, on) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const today = gDay_(gNow_());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day)) || day > today || day < gAdd_(today, -7)) throw new Error('Only today or the last 7 days.');
    // his own row for the day goes; then a day that freezes itself (holiday, INSET) needs an 'on' row to unfreeze
    const r = gRows_('freeze').find((x) => String(x.day) === day), self = gIsFrozen_(day, gWorld_(), {});
    if (r) gDel_('freeze', r.row);
    if (on && !self) gAppend_('freeze', { day, reason: ['sick', 'off', 'other'].indexOf(reason) >= 0 ? reason : 'off', savedOn: today });
    if (!on && self) gAppend_('freeze', { day, reason: 'on', savedOn: today });
  });
  return gSnapshot_(gWorld_());
}


/* ---------------------------------------------------------------- shop and room (slice 5)
   The catalogue (GameShop.gs, made by replica/art/export_shop.py) has 120 items with price, lock, tier and the sprite
   layers they draw on the 128x116 room. Slots, one item each: floor, wall, rug, window, light, corner, furn, hang3,
   hang4, prop. The free starter items are owned from the first load, the first of each slot already placed.
   Locks: {level: n} or {outside_work: n} (n outside-work ticks done). Buying takes doubloons (a ticks row records it). */
let G_SHOP = null;
// one lock shape for every item (the shop file has {type,min}, {type,count}, {level} and {outside_work}), plus the
// tier's own level (2026-10-28): the higher of the two levels wins, deeds (outside-work ticks) stay as they were
function gLockOf_(i) {
  const l = i.lock || {}, lv = Math.max(Number(GAME.tierLevel[i.tier]) || 1, Number(l.level) || 0, l.type === 'level' ? Number(l.min) || 0 : 0);
  const ow = Number(l.outside_work) || (l.type === 'outside_work' ? Number(l.count) || 0 : 0);
  if (lv <= 1 && !ow) return null;
  const why = [lv > 1 ? 'needs level ' + lv : '', ow ? 'needs ' + ow + ' outside-work ticks' : ''].filter(Boolean).join(' and ');
  return { level: lv > 1 ? lv : 0, outside_work: ow, text: why };
}
function gShop_() {
  if (G_SHOP) return G_SHOP;
  const sh = (typeof SHOP !== 'undefined' && SHOP && SHOP.items) ? SHOP : { items: [], ulhu: { x: 48, y: 60 }, w: 128, h: 116, z: {} };
  G_SHOP = Object.assign({}, sh, { items: sh.items.map((i) => Object.assign({}, i, { price: Math.round(i.price * 1.2 / 5) * 5, lock: gLockOf_(i) })) });   // +20% (Patryk 2026-10-27)
  return G_SHOP;
}
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
  check_(k); gFresh_();
  const p = gPlayer_(), owned = gOwned_(), ticks = gRows_('ticks'), goals = gGoals_(), have = {}, hg = gHaggles_(gDay_(gNow_()));
  owned.forEach((r) => { have[r.itemId] = r; });
  return gOut_({ coins: p.coins, level: p.level, outside: gOutsideTicks_(ticks, goals), haggle: hg, items: gShop_().items.map((i) => {
    const lk = gLock_(i.lock, p, ticks, goals), r = have[i.id], kp = gKeeperOf_(i.category);
    return { id: i.id, name: i.name, category: i.category, keeper: kp, slots: i.slots, tier: i.tier, price: gHagglePrice_(i.price, hg[kp]), base: i.price, own: !!r, slot: r ? r.slot : '', locked: !lk.ok, why: lk.why, w: (i.layers[i.slots[0]] || {}).w, h: (i.layers[i.slots[0]] || {}).h };
  }) });
}
// the pictures, fetched once by the page (about 160 KB): { id: { slot: {art, ox, oy, w, h} } } plus the room geometry
function gameArt(k) {
  check_(k); gFresh_();
  const sh = gShop_(), art = {};
  sh.items.forEach((i) => { art[i.id] = i.layers; });
  return { w: sh.w, h: sh.h, ulhu: sh.ulhu, z: sh.z, art };
}
function gameBuy(k, id) {
  check_(k); gFresh_();
  let bad = '';
  withLock_(function () { gFresh_(true);
    const it = gShop_().items.find((x) => x.id === id), p = gPlayer_(), owned = gOwned_();
    if (!it) { bad = 'That item is not in the shop.'; return; }
    if (owned.some((r) => r.itemId === id)) { bad = 'Ulhu already has that.'; return; }
    const lk = gLock_(it.lock, p, gRows_('ticks'), gGoals_());
    if (!lk.ok) { bad = 'Locked: ' + lk.why; return; }
    const price = gHagglePrice_(it.price, gHaggles_(gDay_(gNow_()))[gKeeperOf_(it.category)]);   // the day's dice result at that stall
    if (p.coins < price) { bad = 'Not enough runes (' + price + ' needed).'; return; }
    const taken = {}; owned.forEach((r) => { if (r.slot) taken[r.slot] = true; });
    const slot = it.slots.filter((x) => !taken[x])[0] || '';       // it goes straight into an empty slot, else the drawer
    p.coins -= price; gSavePlayer_(p);
    const now = gNow_();
    gAppend_('owned', { itemId: id, boughtOn: gDay_(now), price, slot });
    gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: gDay_(now), goalId: 'buy|' + id, delta: 0, coins: -price, xp: 0, hp: 0, auto: '', ref: '', note: JSON.stringify({ name: it.name }) });
  });
  if (bad) throw new Error(bad);
  return gSnapshot_(gWorld_());
}
function gamePlace(k, id, slot) {
  check_(k); gFresh_();
  let bad = '';
  withLock_(function () { gFresh_(true);
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


/* ---------------------------------------------------------------- the Night Market keepers and their dice (Patryk 2026-10-28)
   Each stall's keeper plays one game of Swindlestones a day. Win: 20% off at that stall for the rest of the day.
   Lose: 10% more there today. Walking away from a game you started counts as losing. Rows: Game Haggle {day, keeper, result}. */
G_HEAD.haggle = ['day', 'keeper', 'result', 'savedOn']; G_TAB.haggle = 'Game Haggle';
const G_KEEPERS = { weaver: ['floors', 'rugs'], painter: ['wallpapers'], glass: ['windows', 'lights'], carpenter: ['seats', 'tables'], curio: ['corner', 'props'], gullet: ['wall'], tailor: ['wear'] };
const G_HAGGLE = { win: 0.8, lose: 1.1, playing: 1.1 };
function gKeeperOf_(cat) { return Object.keys(G_KEEPERS).filter((k) => G_KEEPERS[k].indexOf(cat) >= 0)[0] || ''; }
function gHaggles_(day) { const o = {}; gRows_('haggle').forEach((r) => { if (String(r.day) === day) o[r.keeper] = String(r.result); }); return o; }
function gHagglePrice_(price, result) { const f = G_HAGGLE[result]; return f && price ? Math.round(price * f) : price; }
// result: 'start' sits down at the table (once a day per keeper), then 'win' or 'lose' settles it. Returns the shop.
function gameHaggle(k, keeper, result) {
  check_(k); gFresh_();
  let bad = '';
  withLock_(function () { gFresh_(true);
    if (!G_KEEPERS[keeper]) { bad = 'There is no such keeper in the market.'; return; }
    const day = gDay_(gNow_()), row = gRows_('haggle').filter((r) => String(r.day) === day && r.keeper === keeper)[0];
    if (result === 'start') {
      if (row) { bad = 'You have already played this keeper today. Come back tomorrow.'; return; }
      gAppend_('haggle', { day, keeper, result: 'playing', savedOn: day });
    } else if (result === 'win' || result === 'lose') {
      if (!row) { bad = 'Sit down at the table first.'; return; }
      if (String(row.result) !== 'playing') { bad = 'That game is already settled.'; return; }
      gSet_('haggle', row.row, 'result', result);
    } else bad = 'Unknown dice result.';
  });
  if (bad) throw new Error(bad);
  return gameShop(k);
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
    return { id: b.id, name: b.name, grp: String(b.grp || 'teach'), maxHp, hp: b.status === 'beaten' ? 0 : Math.max(0, Math.round(maxHp - dealt)), status: b.status, reward: reward.coins || 0, trophy: reward.trophy || '', size: reward.size || 5, creature: reward.k || '',
      stages: st.map((x, i) => ({ i, name: x.name, due: x.due, done: x.done || '', late: !!x.late, overdue: !x.done && x.due && x.due < today })) };
  });
}
function gameBossStart(k, boss) {
  check_(k); gFresh_();
  let newId = '';
  withLock_(function () { gFresh_(true);
    const today = gDay_(gNow_()), name = String(boss.name || '').trim().slice(0, 80);
    const stages = (boss.stages || []).map((x) => ({ name: String(x.name || '').trim().slice(0, 80), due: /^\d{4}-\d{2}-\d{2}$/.test(String(x.due)) ? x.due : '' })).filter((x) => x.name);
    if (!name || stages.length < 1) throw new Error('A boss needs a name and at least one stage.');
    const each = Math.round(100 / stages.length); stages.forEach((x, i) => { x.dmg = i === stages.length - 1 ? 100 - each * (stages.length - 1) : each; x.done = ''; });
    const size = [2, 5, 10, 20].indexOf(Number(boss.size)) >= 0 ? Number(boss.size) : 5, k = /^[a-z]{2,8}$/.test(String(boss.k || '')) ? boss.k : G_BOSS[size].k;
    newId = 'b' + Utilities.getUuid().slice(0, 7);
    gAppend_('bosses', { id: newId, name, maxHp: 100, stages: JSON.stringify(stages), reward: JSON.stringify({ coins: G_BOSS[size].gold, trophy: 'Trophy: ' + name, size, k }), startedOn: today, status: 'active', beatenOn: '', grp: String(boss.grp || 'teach').slice(0, 40) });
  });
  return gSnapshot_(gWorld_(), { newBoss: newId });
}
function gameBossStage(k, id, i, on) {
  check_(k); gFresh_();
  let res = null;
  withLock_(function () { gFresh_(true);
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
// edit a boss still being fought (Patryk 2026-10-27): its name, area, size and stages. A stage already hit keeps its
// tick (stages are matched by i, their old place); the damage is shared out again across the new list of stages.
function gameBossSave(k, boss) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const row = gRows_('bosses').find((b) => b.id === boss.id); if (!row || row.status !== 'active') throw new Error('That boss is gone.');
    const name = String(boss.name || '').trim().slice(0, 80); let old = []; try { old = JSON.parse(row.stages || '[]'); } catch (e) { old = []; }
    const st = (boss.stages || []).map((x) => { const was = x.i === undefined || x.i === null || x.i === '' ? null : old[Number(x.i)];
      return { name: String(x.name || '').trim().slice(0, 80), due: /^\d{4}-\d{2}-\d{2}$/.test(String(x.due)) ? x.due : '', done: was ? was.done || '' : '', late: was ? !!was.late : false }; }).filter((x) => x.name);
    if (!name || !st.length) throw new Error('A boss needs a name and at least one stage.');
    const each = Math.round(100 / st.length); st.forEach((x, i) => { x.dmg = i === st.length - 1 ? 100 - each * (st.length - 1) : each; });
    let rw = {}; try { rw = JSON.parse(row.reward || '{}'); } catch (e) { rw = {}; }
    const size = [2, 5, 10, 20].indexOf(Number(boss.size)) >= 0 ? Number(boss.size) : (rw.size || 5);
    rw = { coins: G_BOSS[size].gold, trophy: 'Trophy: ' + name, size, k: /^[a-z]{2,8}$/.test(String(boss.k || '')) ? boss.k : (rw.k || G_BOSS[size].k) };
    gSet_('bosses', row.row, 'name', name); gSet_('bosses', row.row, 'stages', JSON.stringify(st)); gSet_('bosses', row.row, 'reward', JSON.stringify(rw));
    gSet_('bosses', row.row, 'grp', String(boss.grp || 'teach').slice(0, 40));
  });
  return gSnapshot_(gWorld_());
}
// remove a boss made by mistake (Patryk 2026-10-24: two made by accident). Only a boss still being fought; it is
// only marked "removed" (the row stays), so back = true puts it back exactly as it was (the Undo button).
function gameBossRemove(k, id, back) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const row = gRows_('bosses').find((b) => b.id === id); if (!row) throw new Error('That boss is gone.');
    if (!back && row.status === 'active') gSet_('bosses', row.row, 'status', 'removed');
    if (back && row.status === 'removed') gSet_('bosses', row.row, 'status', 'active');
  });
  return gSnapshot_(gWorld_());
}

/* ---------------------------------------------------------------- Vespers (phase 2, Patryk 2026-10-27)
   An evening tablet from vTime (default 8 pm): today's curses (with the sigil from the moment) to add detail to, and
   today's good habits to say when they worked. "Clean today" / "That's all" ticks it: a ritual with its own streak
   (the app-use streak), paid like a Tiny ritual, once a day. Never miss twice: one missed evening keeps the streak,
   two in a row start it again. A frozen day is skipped. Undo reverses it exactly. */
function gTagMap_() { const m = {}; gRows_('tags').forEach((t) => { m[String(t.tickId)] = t; }); return m; }
function gVespers_(today, ticks, goals, p, world, frozen) {
  const byId = {}; goals.forEach((g) => { byId[g.id] = g; });
  const undone = gUndone_(ticks), tags = gTagMap_(), tm = (t) => Utilities.formatDate(new Date(t.at), TZ, 'HH:mm');
  const mine = ticks.filter((t) => String(t.day) === today && byId[t.goalId] && !undone[t.id] && !gNote_(t).untick && Number(t.delta) > 0);
  const row = (t) => { const n = gNote_(t), tg = tags[t.id] || {}; return { tickId: t.id, goalId: t.goalId, name: byId[t.goalId].name, at: tm(t), sig: tg.sig || n.sig || '', detail: tg.detail || '' }; };
  const done = gRows_('vespers').find((r) => String(r.day) === today && String(r.clean) !== 'undone');
  const hm = Utilities.formatDate(gNow_(), TZ, 'HH:mm');
  return { time: p.vTime || '20:00', open: hm >= (p.vTime || '20:00'), done: !!done, streak: gVespersStreak_(p, today, world, frozen), best: Number(p.vBest) || 0,
    curses: mine.filter((t) => gNote_(t).side === 'c').map(row), goods: mine.filter((t) => gNote_(t).side !== 'c').map(row), chips: p.myChips ? String(p.myChips).split('|') : [] };
}
// the streak as it stands today: it only breaks after two missed evenings in a row (frozen days don't count)
function gVespersStreak_(p, today, world, frozen) {
  const last = String(p.vLast || ''); if (!last) return 0;
  let missed = 0; for (let d = gAdd_(last, 1); d < today; d = gAdd_(d, 1)) if (!gIsFrozen_(d, world, frozen, { track: 'life' })) missed++;
  return missed >= 2 ? 0 : Number(p.vStreak) || 0;
}
function gSaveTag_(tickId, goalId, side, sig, detail, today) {
  const rows = gRows_('tags'), old = rows.find((r) => String(r.tickId) === String(tickId));
  const rec = { tickId, day: today, goalId, side, sig: G_SIGS.indexOf(sig) >= 0 ? sig : '', detail: String(detail || '').slice(0, 80), savedOn: today };
  if (old) G_HEAD.tags.forEach((h) => { if (String(old[h]) !== String(rec[h])) gSet_('tags', old.row, h, rec[h]); });
  else gAppend_('tags', rec);
}
// tag one of today's ticks (Vespers detail, or the long-press "when did this work?" on a good habit). For a long press the page
// knows only the habit: tickId '' + goalId = that habit's latest tick today.
function gameTag(k, tickId, goalId, sig, detail) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const today = gDay_(gNow_()), ticks = gRows_('ticks'), undone = gUndone_(ticks);
    let t = tickId ? ticks.find((x) => x.id === tickId) : null;
    if (!t && goalId) t = ticks.filter((x) => x.goalId === goalId && String(x.day) === today && !undone[x.id] && !gNote_(x).untick && Number(x.delta) > 0).pop();
    if (!t) return;
    gSaveTag_(t.id, t.goalId, gNote_(t).side === 'c' ? 'c' : 'b', sig, detail, today);
  });
  return gSnapshot_(gWorld_());
}
// his own detail chips (the "+ add your own" chip): saved as one list
function gameChips(k, chips) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true); const p = gPlayer_(); p.myChips = (chips || []).map((c) => String(c).replace(/\|/g, '').trim().slice(0, 24)).filter(Boolean).slice(0, 24).join('|'); gSavePlayer_(p); });
  return gSnapshot_(gWorld_());
}
// Vespers done for today: tags in one go, then the tick of the ritual itself
function gameVespers(k, rv) {
  check_(k); gFresh_();
  let res = null;
  withLock_(function () { gFresh_(true);
    const now = gNow_(), today = gDay_(now), world = gWorld_(), frozen = gFrozenDays_(), p = gPlayer_();
    (rv && rv.tags || []).forEach((t) => { const tk = gRows_('ticks').find((x) => x.id === t.tickId); if (tk) gSaveTag_(tk.id, tk.goalId, gNote_(tk).side === 'c' ? 'c' : 'b', t.sig, t.detail, today); });
    if (gRows_('vespers').some((r) => String(r.day) === today && String(r.clean) !== 'undone')) { res = { already: true }; return; }
    const prev = { s: Number(p.vStreak) || 0, b: Number(p.vBest) || 0, l: String(p.vLast || '') };
    const st = gVespersStreak_(p, today, world, frozen) + 1;
    p.vStreak = st; p.vBest = Math.max(prev.b, st); p.vPrev = JSON.stringify(prev); p.vLast = today;
    const pay = GAME.base[5]; p.coins += pay; const up = gAddXp_(p, pay, today); gSavePlayer_(p);
    gAppend_('vespers', { day: today, clean: rv && rv.clean ? 'clean' : 'logged', savedOn: today, note: '' });
    gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: today, goalId: 'vespers', delta: 0, coins: pay, xp: pay, hp: 0, auto: '', ref: 'vespers|' + today, note: JSON.stringify({ name: 'Vespers' }) });
    res = { coins: pay, streak: st, up };
  });
  G_VM = null;
  return gSnapshot_(gWorld_(), { vespersDone: res });
}
// Undo of Vespers: the streak and runes go back exactly; the row is marked, never deleted
function gameVespersUndo(k) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const now = gNow_(), today = gDay_(now), r = gRows_('vespers').find((x) => String(x.day) === today && String(x.clean) !== 'undone'); if (!r) return;
    const p = gPlayer_(); let prev = {}; try { prev = JSON.parse(p.vPrev || '{}'); } catch (e) { prev = {}; }
    p.vStreak = prev.s || 0; p.vBest = prev.b || 0; p.vLast = prev.l || ''; p.coins = Math.max(0, p.coins - GAME.base[5]); gTakeXp_(p, GAME.base[5]); gSavePlayer_(p);
    gSet_('vespers', r.row, 'clean', 'undone');
    const tk = gRows_('ticks').filter((t) => t.ref === 'vespers|' + today).pop();
    if (tk) gSet_('ticks', tk.row, 'ref', 'vespers-undone|' + today + '|' + tk.id);
    gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: today, goalId: 'vespers', delta: 0, coins: -GAME.base[5], xp: -GAME.base[5], hp: 0, auto: '', ref: '', note: JSON.stringify({ name: 'Vespers undone' }) });
  });
  G_VM = null;
  return gSnapshot_(gWorld_());
}
function gameVespersTime(k, hm) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(hm))) throw new Error('Pick a time like 20:00.'); const p = gPlayer_(); p.vTime = hm; gSavePlayer_(p); });
  return gSnapshot_(gWorld_());
}

/* ---- High Vespers: Sunday's Vespers is the weekly review, open until Tuesday night if missed. In his order:
   the Week in Glass, who you are becoming, rituals that grew and slipped, where the curses came from, Absolutions
   won, three lines and one change (and last week's change checked). ---- */
const G_SLOTS = [['Morning', '05:00', '08:30'], ['School', '08:30', '15:30'], ['After school', '15:30', '18:00'], ['Evening', '18:00', '21:00'], ['Late', '21:00', '29:00']];
function gSlot_(hm) { if (hm < '05:00') hm = String(Number(hm.slice(0, 2)) + 24) + hm.slice(2); const s = G_SLOTS.findIndex((x) => hm >= x[1] && hm < x[2]); return s < 0 ? 4 : s; }
function gHighVespers_(today, ticks, goals, world, frozen) {
  const dow = gDow_(today), wk = dow === 7 ? gMonday_(today) : gAdd_(gMonday_(today), -7);
  const show = dow === 7 || dow <= 2;
  const saved = gRows_('reviews').find((r) => String(r.week) === wk), last = gRows_('reviews').find((r) => String(r.week) === gAdd_(wk, -7));
  const byId = {}; goals.forEach((g) => { byId[g.id] = g; });
  const undone = gUndone_(ticks), tags = gTagMap_(), sun = gAdd_(wk, 6);
  const wt = ticks.filter((t) => String(t.day) >= wk && String(t.day) <= sun && !undone[t.id] && !gNote_(t).untick && Number(t.delta) > 0 && byId[t.goalId]);
  const isC = (t) => gNote_(t).side === 'c';
  const days = []; for (let i = 0; i < 7; i++) { const d = gAdd_(wk, i), dt = wt.filter((t) => String(t.day) === d);
    const hmOf = (t) => Utilities.formatDate(new Date(t.at), TZ, 'HH:mm'), nm = (t) => { const g = byId[t.goalId]; return g.polarity === 'both' ? (String(g.name).split(' / ')[isC(t) ? 0 : 1] || g.name) : g.name; };
    days.push({ day: d, bless: dt.filter((t) => byId[t.goalId].kind === 'habit' && !isC(t)).length, curse: dt.filter(isC).length, rituals: dt.filter((t) => byId[t.goalId].kind === 'daily').length, frozen: !!gIsFrozen_(d, world, frozen),
      blessings: dt.filter((t) => byId[t.goalId].kind === 'habit' && !isC(t)).map(nm), curses: dt.filter(isC).map((t) => ({ name: nm(t), at: hmOf(t) })) }); }
  const votes = {}; wt.filter((t) => !isC(t) && byId[t.goalId].who).forEach((t) => { const w = byId[t.goalId].who; votes[w] = (votes[w] || 0) + 1; });
  const who = Object.keys(votes).map((w) => ({ who: w, votes: votes[w] })).sort((a, b) => b.votes - a.votes);
  // rituals: kept days vs due days this week; slipped = two due days missed in a row
  const grew = [], slipped = [];
  goals.filter((g) => g.kind === 'daily').forEach((g) => {
    let kept = 0, due = 0, run = 0, twice = false;
    for (let i = 0; i < 7; i++) { const d = gAdd_(wk, i); if (d > today || gIsFrozen_(d, world, frozen, g) || !gIsDue_(Object.assign({}, g, { lastDone: '' }), d) || String(g.created || '') > d) continue;
      due++; const k2 = wt.some((t) => t.goalId === g.id && String(t.day) === d); if (k2) { kept++; run = 0; } else if (++run >= 2) twice = true; }
    if (!due) return;
    const nights = []; let n = 0; for (let i = 0; i < 7; i++) { const d = gAdd_(wk, i);   // Monday to Sunday: the run that night, 'miss', 'rest' or null
      if (d > today || String(g.created || '') > d) nights.push(null); else if (gIsFrozen_(d, world, frozen, g)) nights.push('rest'); else if (!gIsDue_(Object.assign({}, g, { lastDone: '' }), d)) nights.push(null);
      else if (wt.some((t) => t.goalId === g.id && String(t.day) === d)) nights.push(++n); else { n = 0; nights.push('miss'); } }
    if (twice) slipped.push({ name: g.name, kept, due, nights }); else if (kept) grew.push({ name: g.name, kept, due, streak: g.streak, nights });
  });
  // where the curses came from
  const grid = Array.from({ length: 7 }, () => [0, 0, 0, 0, 0]), sigs = {}, dets = {};
  wt.filter(isC).forEach((t) => { const di = gDiff_(wk, String(t.day)), hm = Utilities.formatDate(new Date(t.at), TZ, 'HH:mm'); grid[di][gSlot_(hm)]++;
    const tg = tags[t.id] || {}, sg = tg.sig || gNote_(t).sig || ''; if (sg) sigs[sg] = (sigs[sg] || 0) + 1; if (tg.detail) { const key = (sg ? sg + ': ' : '') + tg.detail; dets[key] = (dets[key] || 0) + 1; } });
  const top = (o) => Object.keys(o).map((x) => ({ name: x, n: o[x] })).sort((a, b) => b.n - a.n).slice(0, 5);
  const abs = wt.filter((t) => gNote_(t).absOf);
  return { week: wk, show: show && !saved, saved: saved ? { wentWell: saved.wentWell, slipped: saved.slipped, change: saved.change || '' } : null,
    lastChange: last && last.change ? { change: last.change, kept: saved ? saved.kept || '' : '' } : null,
    days, who, grew, slipped, grid, slots: G_SLOTS.map((x) => x[0]), sigs: top(sigs), details: top(dets),
    absolutions: { n: abs.length, hp: abs.reduce((a, t) => a + Math.max(0, Number(t.hp) - 1), 0) },
    // 2026-10-28: each ritual with an aim (aim reached / bottom line held / missed), and each curse with a ceiling
    aims: goals.filter((g) => g.kind === 'daily' && g.aim && String(g.created || '') <= sun).map((g) => gAimWeek_(g, wk, sun < today ? sun : today, ticks, gRows_('aims'), undone, world, frozen)),
    ceilings: goals.filter((g) => g.kind === 'habit' && g.ceil).map((g) => { const n = wt.filter((t) => t.goalId === g.id && isC(t)).length; return { id: g.id, name: g.name, count: n, ceil: g.ceil, over: n > g.ceil }; }) };
}
// High Vespers in the shapes the screen (game-highvespers.js) reads: rituals with aims, and curses with a ceiling
function gHighShape_(h) {
  if (!h) return h;
  h.rituals = (h.aims || []).map((a) => ({ id: a.id, name: a.name, aim: a.aim, minutes: a.aim && a.aim.type === 'avg' ? a.avg : a.minutes, count: a.full, kept: a.days, floor: a.floorNeed, due: a.floorNeed, reached: a.state === 'aim', held: a.state !== 'miss' }));
  h.curses = (h.ceilings || []).map((c) => ({ name: c.name, count: c.count, ceiling: c.ceil }));
  return h;
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
  check_(k); gFresh_();
  let paid = 0;
  withLock_(function () { gFresh_(true);
    const today = gDay_(gNow_()), wk = /^\d{4}-\d{2}-\d{2}$/.test(String(rv.week)) ? rv.week : gMonday_(today);
    const clip = (v) => String(v || '').slice(0, 400);
    const old = gRows_('reviews').find((r) => String(r.week) === wk);
    // a field the page doesn't send keeps what was saved (High Vespers sends no priorities; the old card no change)
    const keep = (h, v) => (rv[h] === undefined && old ? old[h] : v);
    const rec = { week: wk, wentWell: keep('wentWell', clip(rv.wentWell)), slipped: keep('slipped', clip(rv.slipped)), p1: keep('p1', clip(rv.p1)), p2: keep('p2', clip(rv.p2)), p3: keep('p3', clip(rv.p3)), savedOn: today,
      change: keep('change', clip(rv.change)), kept: keep('kept', ['Yes', 'Partly', 'No'].indexOf(rv.kept) >= 0 ? rv.kept : '') };
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
  check_(k); gFresh_();
  let id = '';
  withLock_(function () { gFresh_(true);
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
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const g = gGoals_().find((x) => x.id === id); if (!g || !g.steps[i]) return;
    g.steps[i].d = !!on; gSet_('goals', g.row, 'steps', JSON.stringify(g.steps));
  });
  return gSnapshot_(gWorld_());
}
function gBeaten_() {
  return gRows_('bosses').filter((b) => b.status === 'beaten').map((b) => {
    let r = {}; try { r = JSON.parse(b.reward || '{}'); } catch (e) { r = {}; }
    return { id: b.id, name: b.name, k: r.k || (G_BOSS[r.size] || G_BOSS[5]).k, size: r.size || 5, reward: r.coins || 0, on: b.beatenOn };
  }).reverse();
}
// the next days that freeze themselves: INSET days and the next holiday
function gFreezesAhead_(world, today, frozen) {
  const out = [], d = world.data || {};
  (d.inset || []).filter((x) => x >= today && x <= gAdd_(today, 70)).slice(0, 2).forEach((x) => out.push({ name: 'INSET day', day: x }));
  const t = (d.terms || []).find((x) => today <= x[1]); if (t) out.push({ name: 'Holidays', day: gAdd_(t[1], 1) });
  Object.keys(frozen).filter((x) => x >= today && frozen[x] !== 'on').slice(0, 3).forEach((x) => out.push({ name: frozen[x] === 'sick' ? 'Sick day' : 'Day off', day: x }));
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
  check_(k); gFresh_();
  let bad = '';
  withLock_(function () { gFresh_(true);
    const w = gWearItem_(id); if (!w) { bad = 'That outfit is not in the wardrobe.'; return; }
    const p = gPlayer_(), rows = gRows_('owned'), st = gWearState_(p, rows.filter((r) => String(r.itemId).indexOf('w:') === 0));
    if (on && st.owned.indexOf(id) < 0) {
      if (w.lock > p.level) { bad = 'Locked: Level ' + w.lock; return; }
      const price = gHagglePrice_(w.price, gHaggles_(gDay_(gNow_())).tailor);   // the tailor's dice result today
      if (p.coins < price) { bad = 'Not enough runes (' + price + ' needed).'; return; }
      p.coins -= price; const now = gNow_();
      gAppend_('owned', { itemId: 'w:' + id, boughtOn: gDay_(now), price, slot: '' });
      gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: gDay_(now), goalId: 'buy|w:' + id, delta: 0, coins: -price, xp: 0, hp: 0, auto: '', ref: '', note: JSON.stringify({ name: id }) });
    }
    const wear = st.on; wear[w.cat] = on ? id : (w.cat === 'skin' ? 'skin-0' : '');
    p.wear = JSON.stringify(wear); gSavePlayer_(p);
  });
  if (bad) throw new Error(bad);
  return gSnapshot_(gWorld_());
}
// Undo a purchase made today (shop item or outfit): the doubloons come back and the item goes
function gameUnbuy(k, id) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const today = gDay_(gNow_()), rows = gRows_('owned'), key = gWearItem_(id) ? 'w:' + id : id;
    const r = rows.filter((x) => x.itemId === key && String(x.boughtOn) === today).pop(); if (!r) return;
    const p = gPlayer_(), price = Number(r.price) || 0; p.coins += price;
    if (key.indexOf('w:') === 0) { let wear = {}; try { wear = p.wear ? JSON.parse(p.wear) : {}; } catch (e) { wear = {}; } Object.keys(wear).forEach((c) => { if (wear[c] === id) wear[c] = c === 'skin' ? 'skin-0' : ''; }); p.wear = JSON.stringify(wear); }
    gSavePlayer_(p); gDel_('owned', r.row);
    gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: gNow_().toISOString(), day: today, goalId: 'buy|' + key, delta: 0, coins: price, xp: 0, hp: 0, auto: '', ref: '', note: JSON.stringify({ name: key, undo: true }) });
  });
  return gSnapshot_(gWorld_());
}

/* ---- the Hoard: rewards he writes himself and buys with doubloons ---- */
function gameHoardSave(k, h) {
  check_(k); gFresh_();
  let id = '';
  withLock_(function () { gFresh_(true);
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
  check_(k); gFresh_();
  let bad = '';
  withLock_(function () { gFresh_(true);
    const r = gRows_('hoard').find((x) => x.id === id); if (!r) { bad = 'That reward is gone.'; return; }
    const p = gPlayer_(), cost = Number(r.cost) || 0, claims = Number(r.claims) || 0, now = gNow_();
    if (!back && p.coins < cost) { bad = 'Not enough runes yet (' + (cost - p.coins) + ' more).'; return; }
    if (back && claims < 1) return;
    p.coins += back ? cost : -cost; gSavePlayer_(p); gSet_('hoard', r.row, 'claims', claims + (back ? -1 : 1));
    gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: gDay_(now), goalId: 'hoard|' + id, delta: 0, coins: back ? cost : -cost, xp: 0, hp: 0, auto: '', ref: '', note: JSON.stringify({ name: r.name, undo: !!back }) });
  });
  if (bad) throw new Error(bad);
  return gSnapshot_(gWorld_());
}

/* ---- the Chronicle: doubloons per week (7 weeks), a 5-week streak calendar, trophies ---- */
function gameChronicle(k) {
  check_(k); gFresh_();
  const today = gDay_(gNow_()), mon = gMonday_(today), ticks = gRows_('ticks'), world = gWorld_(), frozen = gFrozenDays_();
  const earn = (t) => Number(t.coins) > 0 && !/^(buy|hoard)\|/.test(String(t.goalId));
  const weeks = []; for (let i = 6; i >= 0; i--) { const m = gAdd_(mon, -7 * i), e = gAdd_(m, 6); weeks.push({ mon: m, coins: ticks.filter((t) => String(t.day) >= m && String(t.day) <= e && earn(t)).reduce((a, t) => a + Number(t.coins), 0) }); }
  const days = [], start = gAdd_(mon, -28), goals = gGoals_(), dailies = goals.filter((g) => g.kind === 'daily' && !g.everyN), net = {};
  ticks.forEach((t) => { const key = t.goalId + '|' + t.day; net[key] = (net[key] || 0) + Number(t.delta); });
  for (let i = 0; i < 35; i++) {
    const d = gAdd_(start, i), fz = gIsFrozen_(d, world, frozen), due = dailies.filter((g) => String(g.created || '') <= d && gIsDue_(Object.assign({}, g, { lastDone: '' }), d));
    const got = due.filter((g) => (net[g.id + '|' + d] || 0) > 0).length, share = due.length ? got / due.length : 0;
    const later = d > today ? due.length + goals.filter((g) => g.kind === 'todo' && !g.lastDone && g.due === d).length : 0;
    days.push({ day: d, n: got, due: due.length, share, level: fz ? 'off' : d > today ? 'future' : !due.length ? 'none' : share >= 1 ? 'all' : share >= 0.75 ? 'most' : share > 0 ? 'some' : 'none', later, frozen: fz, future: d > today, today: d === today });
  }
  return gOut_({ weeks, days, beaten: gBeaten_() });
}
