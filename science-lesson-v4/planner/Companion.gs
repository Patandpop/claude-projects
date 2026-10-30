/* ============================================================================
   Companion.gs: Ulhu as a life companion (Lane D, Big goal 3, 29 Oct 2026).
   Decisions: replica/design/grills/ulhu-companion.md (its Decisions block is law).
   Shares Game.gs's helpers (gRows_, gAppend_, gPlayer_ ...): Apps Script loads every file into one scope.
   Its own tabs are registered lazily (cReg_), so it never matters which file Apps Script loads first.
   Fixed rules only: no AI, no paid service, nothing on Drive. Ulhu never decides: every tag is Patryk's own.
   Public calls are named game* so the phone bridge (Day.gs) lets them through; each starts with check_(k).
   ============================================================================ */

// the day tags he starts with (editable). Heavy days change no rules; only Ill does (dark moon, curses cost no health).
const C_TAGS = ['Marking', "Parents' evening", 'INSET', 'Report writing', 'Trip', 'Cover', 'Ill'];
const C_ILL = 'Ill';
const C_BACK_HOUR = 6;   // Ulhu is back from the deep from 6 am

function cReg_() {
  if (G_HEAD.daytags) return;
  G_HEAD.daytags = ['day', 'tag', 'savedOn']; G_TAB.daytags = 'Game Day Tags';
  G_HEAD.finds = ['day', 'kind', 'fid', 'name', 'text', 'runes', 'act', 'savedOn']; G_TAB.finds = 'Game Finds';   // day = the night he dived
}

/* ---- day tags ---- */
function cTagList_(p) {
  const own = String((p || gPlayer_()).dayTagList || '').split('|').map((t) => t.trim()).filter(Boolean);
  const list = own.length ? own : C_TAGS.slice();
  if (list.indexOf(C_ILL) < 0) list.push(C_ILL);                     // Ill always stays: it is the one tag with a rule
  return list;
}
function cTagsByDay_() { cReg_(); const m = {}; gRows_('daytags').forEach((r) => { const d = String(r.day); (m[d] = m[d] || []).push(String(r.tag)); }); return m; }
// an Ill day: tagged Ill, or a day he already marked "sick" with the old freeze (the same thing, said earlier)
function cIllDay_(day, frozen) {
  if ((cTagsByDay_()[day] || []).indexOf(C_ILL) >= 0) return true;
  const f = frozen || gFrozenDays_();
  return f[day] === 'sick';
}

// tag a day (or untag it). Tagging Ill also turns that day's moon dark; untagging Ill gives the moon back.
function gameDayTag(k, day, tag, on) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true); cReg_();
    const today = gDay_(gNow_());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day)) || day > gAdd_(today, 60) || day < gAdd_(today, -7)) throw new Error('Only the last 7 days or the next 60.');
    tag = String(tag || '').trim();
    if (cTagList_().indexOf(tag) < 0) throw new Error('That tag is not in your list.');
    const has = gRows_('daytags').filter((r) => String(r.day) === day && String(r.tag) === tag);
    if (on && !has.length) gAppend_('daytags', { day, tag, savedOn: today });
    if (!on) has.slice().reverse().forEach((r) => gDel_('daytags', r.row));
    if (tag === C_ILL) {
      const fr = gRows_('freeze').find((x) => String(x.day) === day);
      if (on) { if (fr) gDel_('freeze', fr.row); gAppend_('freeze', { day, reason: 'sick', savedOn: today }); }
      else if (fr && String(fr.reason) === 'sick') gDel_('freeze', fr.row);
    }
  });
  G_VM = null;
  return gSnapshot_(gWorld_());
}
// his own tag list (add, rename or drop tags). Ill is always kept.
function gameDayTagList(k, list) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const clean = [];
    (list || []).forEach((t) => { t = String(t).replace(/\|/g, '').trim().slice(0, 24); if (t && clean.indexOf(t) < 0) clean.push(t); });
    const p = gPlayer_(); p.dayTagList = clean.slice(0, 16).join('|'); gSavePlayer_(p);
  });
  return gSnapshot_(gWorld_());
}

/* ---- the year's story: 6 half-term acts, a 7th for the summer, a short interlude in every other break ----
   The terms come from the planner (Data: six half terms). A day in term i is act i+1; the summer (after the 6th
   half term, or before the 1st) is act 7; any other gap between half terms is an interlude. Chapters are school
   weeks, counted from the Monday of the act's first week. */
const C_ACTS = ['The Drowned Bell', 'The Lantern Below', 'The Frozen Choir', 'The Waking Reef', 'The Tide Archive', 'The Surface Door', 'The Long Drift'];
const C_BREAKS = ['The Ember Tide', 'The Midwinter Hush', 'The Thaw', 'The Egg of the Deep', 'The Calm'];
function cStory_(day, world) {
  const terms = ((world && world.data && world.data.terms) || []).slice().sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const chap = (start) => Math.floor(gDiff_(gMonday_(start), gMonday_(day)) / 7) + 1;
  if (!terms.length) return { act: 1, name: C_ACTS[0], chapter: 1, interlude: '' };
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    if (day >= t[0] && day <= t[1]) { const a = Math.min(6, i + 1); return { act: a, name: C_ACTS[a - 1], chapter: chap(t[0]), interlude: '' }; }
    const nx = terms[i + 1];
    if (nx && day > t[1] && day < nx[0]) {
      if (i >= 5) break;                                              // after the 6th half term: the summer
      return { act: i + 1, name: C_ACTS[i], chapter: chap(t[0]), interlude: C_BREAKS[i] || 'The Still Water' };
    }
  }
  // the summer: after the last half term, or before the first
  const last = terms[terms.length - 1], start = day > last[1] ? gAdd_(last[1], 1) : gAdd_(terms[0][0], -42);
  return { act: 7, name: C_ACTS[6], chapter: chap(start), interlude: '' };
}

/* ---- what he brings back. Told only through things; never explained. kind o = an object for the Sanctum shelf,
   l = a lore line. Each act has its own pool; breaks have theirs; a bad day brings something small or strange. ---- */
const C_FINDS = {
  1: ['o|A bell clapper|Green with age. It still swings when no one is looking.', 'o|A brass house number|Number 9. The door it belonged to is somewhere below.', 'o|A church key|Too heavy for its size.', 'o|A child\'s slate|Someone wrote the same word on it a hundred times. The word has worn away.', 'o|A weathervane cockerel|It points down.', 'o|A pewter spoon|Bent, then carefully bent back.', 'o|A rope of bell-pull|Frayed at both ends.', 'o|A hymn board number|Four hundred and twelve.',
    'l|The bell rang once in the night. Nobody above heard it.', 'l|There is a street down there. The lamps are still on.', 'l|He says the town was not sunk. It sank on purpose.', 'l|Every house had a bell by the door. Every bell faces the same way.', 'l|Someone is still sweeping the square.', 'l|The tide came in on a Tuesday and stayed.'],
  2: ['o|A lantern wick|Dry. It has never been lit.', 'o|A glass float|A small flame lives inside. It does not need air.', 'o|A lamplighter\'s hook|Long, thin, patient.', 'o|A jar of glowing silt|It brightens when you are kind to it.', 'o|A tin star|Five points. One is a little longer, as if reaching.', 'o|A lighthouse lens shard|It makes everything look further away.', 'o|A box of matches|All of them struck. All of them still burning, very slowly.', 'o|A paper window|Someone cut it from black paper. Light comes through anyway.',
    'l|Lanterns go down in winter, never up.', 'l|There is a keeper who lights them one by one. She is a long way behind.', 'l|The deeper the water, the warmer the light.', 'l|He met something that glows and it asked his name. He gave a different one.', 'l|A lantern was left on the ledge. It was not his.', 'l|Below a certain depth, every light is a question.'],
  3: ['o|A tuning fork of ice|It hums one note. The note is cold.', 'o|A frozen breath|Kept in a stoppered bottle.', 'o|A choirboy\'s collar|Starched stiff by the sea.', 'o|A page of music|Only rests. Bars and bars of rest.', 'o|A snow globe|Inside, a tiny Ulhu looking at a tiny snow globe.', 'o|An icicle that will not melt|He keeps it near the fire to be sure.', 'o|A frost-etched mirror|The frost draws something new each morning.', 'o|A conductor\'s baton|Snapped in two, mended with kelp.',
    'l|The choir is frozen mid-song. The song is not finished.', 'l|Under the ice, voices carry for miles.', 'l|One singer moved. Only a little.', 'l|The ice is thinnest where someone is waiting.', 'l|He hummed back. The ice creaked in answer.', 'l|The note they are holding is the one you hold too.'],
  4: ['o|A coral bud|Pale, closed, warm to the touch.', 'o|A sea-glass seed|Plant it in nothing and it grows a little anyway.', 'o|A shell that opens|It opens a crack more each week.', 'o|A crab\'s old armour|Left behind, outgrown.', 'o|A pressed anemone|Still slowly waving.', 'o|A ribbon of new kelp|Brighter green than any he has seen.', 'o|A fossil that is not finished|The stone is still deciding.', 'o|A clutch of pearls|Small ones. More are coming.',
    'l|The reef has slept since before the bell. It is turning over.', 'l|Things that were stone are not entirely stone.', 'l|He felt it breathe out. Long, slow, like the end of a week.', 'l|New growth is always the colour of the thing that waited.', 'l|Some of the reef remembers him. Some of it is new.', 'l|Growth is quiet. The reef says nothing about it.'],
  5: ['o|A wax tablet|Covered in tally marks. They keep counting.', 'o|A drowned library card|Overdue by four centuries. No fine.', 'o|A brass page-turner|It always opens to the right page.', 'o|A bottle with a list inside|Every item is crossed out but one.', 'o|An ink pot|Squid ink. It writes in a hand that is not yours, then becomes yours.', 'o|A bookmark of whale bone|Marked at the middle of something.', 'o|A ledger|Two columns: what was carried, what was set down.', 'o|An index card|It reads: see also, you.',
    'l|The Archive keeps everything the tide forgets.', 'l|An archivist asked what he had come to return. He had nothing yet.', 'l|Every shelf ends in water.', 'l|There is a book about this year. It is being written as it happens.', 'l|The oldest record in the Archive is a single tick.', 'l|Nothing in the Archive is ever marked wrong. Only unfinished.'],
  6: ['o|A doorknob of sunlight|Warm. It turns, but not yet.', 'o|A gull feather|From above. He holds it like a rumour.', 'o|A beach pebble|Dry. He has never had a dry thing.', 'o|A strip of blue|Cut from the sky, by the look of it.', 'o|A hinge|Oiled. Recently.', 'o|A ferry ticket|Single. The destination is smudged.', 'o|A sandcastle flag|Paper on a cocktail stick.', 'o|A key that fits nothing down here|He thinks it fits the Door.',
    'l|The Door is not locked. It was waiting to be asked.', 'l|The light up there is louder than he remembered.', 'l|Someone left the Door ajar. It might have been him.', 'l|He pressed an ear to the Door. Laughter, then waves.', 'l|The water gets lighter the closer you get.', 'l|The year is almost through the Door.'],
  7: ['o|A drift-bottle|Empty. The note is in the shape of the glass.', 'o|A compass that points to rest|It spins on Sundays.', 'o|A sun-bleached sail|Patched in seven places.', 'o|A coconut|He does not know what it is. He loves it.', 'o|A flip-flop|One. A mystery.', 'o|A postcard|Wish you were here. No one signed it.', 'o|A sea-worn chess piece|A knight. It only moves sideways now.', 'o|A star that fell in|Small, dim, content.',
    'l|In summer the deep goes on holiday too.', 'l|He drifted for a whole day and called it work.', 'l|Nothing chases him out here.', 'l|The long drift is how the year forgets to hurry.', 'l|He floated over the Archive. All its windows were open.', 'l|The current knows the way back. No need to swim.'],
  interlude: ['o|A cinder that will not go out|From the Ember Tide.', 'o|A sprig of sea holly|Tied with string, left on the ledge.', 'o|A thawed snowflake|Kept in a thimble.', 'o|An egg the size of a fist|Speckled. Warm. Not yet.', 'o|A flat calm stone|Skimming it makes no ripples.', 'o|A paper crown|Slightly soggy, worn with pride.',
    'l|In the breaks between, the deep is quieter. Everything is listening.', 'l|No one rang the bell this week. It rang itself, softly.', 'l|He spent the night doing nothing at all, carefully.', 'l|Between acts, the stage lights stay on low.'],
  small: ['o|A very small stone|It is round. That is all. He is pleased with it.', 'o|A button|Four holes. He looked through each one.', 'o|Half a shell|The other half is somewhere. That is fine.', 'o|A wet leaf|From a tree that does not grow down here.', 'o|A bent nail|Still a nail.', 'o|A grain of sand|He insists it is a special one.', 'o|A knot of thread|He untied most of it.', 'o|A bottle cap|Rusty. Facing up.',
    'l|It was a grey night down there too. He came back anyway.', 'l|He found nothing much and brought it home.', 'l|Some nights the deep just hums.', 'l|He sat on the bottom for a while. It was enough.', 'l|The current was slow. So was he.', 'l|He says it was a strange night. He will not say more.'],
};
// a stable number from a day (the same night always brings the same find)
function cHash_(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
// the find for one night: from its act's pool (or the break's, or the small pool on a bad day), never one already found
function cFindFor_(night, story, bad, found) {
  const key = bad ? 'small' : story.interlude ? 'interlude' : String(story.act);
  const pool = C_FINDS[key] || C_FINDS.small, h = cHash_(night);
  let left = pool.map((x, i) => i).filter((i) => !found[key + ':' + i]);
  if (!left.length) left = pool.map((x, i) => i);                   // the pool is used up: things wash up again
  const i = left[h % left.length], parts = pool[i].split('|');
  const runes = !bad && h % 6 === 0 ? 3 + (h >> 5) % 10 : 0;        // now and then a few runes (never on a bad day: a bad day never costs anything, and never pays for itself)
  return { fid: key + ':' + i, kind: parts[0] === 'o' ? 'object' : 'lore', name: parts[0] === 'o' ? parts[1] : '', text: parts[0] === 'o' ? parts[2] : parts[1], runes, act: story.interlude || story.name };
}
// a bad day: more curses than good ticks (rituals, blessings) that day. It never costs anything; the find is just smaller.
function cBadDay_(day, ticks) {
  const und = gUndone_(ticks); let c = 0, g = 0;
  ticks.forEach((t) => { if (String(t.day) !== day || und[t.id] || gNote_(t).untick || Number(t.delta) <= 0 || /^(vespers|buy|hoard|find)/.test(String(t.goalId))) return; if (gNote_(t).side === 'c') c++; else g++; });
  return c > g;
}
function cVespersNights_() { return gRows_('vespers').filter((r) => String(r.clean) !== 'undone').map((r) => String(r.day)); }
// the adventure: after Vespers he dives (away until 6 am); next morning he is back with a find until it is taken
function cAdventure_(today, world) {
  cReg_();
  const hour = Number(Utilities.formatDate(gNow_(), TZ, 'H')), nights = cVespersNights_();
  const taken = {}, found = {}; gRows_('finds').forEach((r) => { taken[String(r.day)] = r; found[String(r.fid)] = true; });
  const away = nights.indexOf(today) >= 0 || (hour < C_BACK_HOUR && nights.indexOf(gAdd_(today, -1)) >= 0 && !taken[gAdd_(today, -1)]);
  const waiting = nights.filter((d) => d < today && d >= gAdd_(today, -7) && !taken[d] && !(d === gAdd_(today, -1) && hour < C_BACK_HOUR)).sort();
  let find = null;
  if (waiting.length && !away) { const ticks = gRows_('ticks'), n = waiting[waiting.length - 1]; find = Object.assign({ night: n }, cFindFor_(n, cStory_(n, world), cBadDay_(n, ticks), found)); }
  const shelf = gRows_('finds').slice(-40).reverse().map((r) => ({ night: String(r.day), kind: String(r.kind), name: String(r.name || ''), text: String(r.text || ''), runes: Number(r.runes) || 0, act: String(r.act || '') }));
  return { state: away ? 'away' : find ? 'back' : 'home', find, waiting: waiting.length, shelf };
}
// take what he brought back: every night still waiting (up to 7 back) goes on the shelf; any runes land on the heap
function gameFindTake(k) {
  check_(k); gFresh_();
  let got = null;
  withLock_(function () { gFresh_(true); cReg_();
    const now = gNow_(), today = gDay_(now), world = gWorld_(), a = cAdventure_(today, world);
    if (a.state !== 'back') return;
    const ticks = gRows_('ticks'), found = {}; gRows_('finds').forEach((r) => { found[String(r.fid)] = true; });
    const hour = Number(Utilities.formatDate(now, TZ, 'H')), p = gPlayer_(); let runes = 0; got = [];
    cVespersNights_().filter((d) => d < today && d >= gAdd_(today, -7) && !(d === gAdd_(today, -1) && hour < C_BACK_HOUR)).sort().forEach((n) => {
      if (gRows_('finds').some((r) => String(r.day) === n)) return;
      const f = cFindFor_(n, cStory_(n, world), cBadDay_(n, ticks), found); found[f.fid] = true;
      gAppend_('finds', { day: n, kind: f.kind, fid: f.fid, name: f.name, text: f.text, runes: f.runes, act: f.act, savedOn: today });
      if (f.runes && !ticks.some((t) => t.ref === 'find|' + n)) {
        runes += f.runes;
        gAppend_('ticks', { id: Utilities.getUuid().slice(0, 8), at: now.toISOString(), day: today, goalId: 'find|' + n, delta: 0, coins: f.runes, xp: 0, hp: 0, auto: '', ref: 'find|' + n, note: JSON.stringify({ name: 'Found in the deep' }) });
      }
      got.push(Object.assign({ night: n }, f));
    });
    if (runes) { p.coins += runes; gSavePlayer_(p); }
  });
  return gSnapshot_(gWorld_(), { found: got });
}

/* ---- "Who I'm becoming": the term page. The term is the act he is in (its half term, from its first day to today;
   in a break, the half term just gone; in the summer, the summer so far). Simple counting only:
   - each identity (who) gets one vote per tick of a habit or ritual that carries it (the same rule as High Vespers);
   - heavy days are just his own tags, listed with how the day went; they change nothing;
   - better days: days with at least one good tick whose score (good ticks minus twice the curses) is in the top half
     of the term's active days; "these came first" = the first two good ticks of each better day, counted. ---- */
const C_PANES = 30;   // a figure is fully lit at 30 votes (about one a school day across a half term)
function cTermRange_(today, world) {
  const terms = ((world && world.data && world.data.terms) || []).slice().sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const past = terms.filter((t) => t[0] <= today);
  if (!past.length) return { from: gAdd_(today, -42), to: today };
  const t = past[past.length - 1];
  if (today > t[1] && past.length === terms.length) return { from: gAdd_(t[1], 1), to: today };   // the summer so far
  return { from: t[0], to: today < t[1] ? today : t[1] };
}
function cTerm_(today, world, frozen) {
  const r = cTermRange_(today, world), story = cStory_(r.from, world), goals = gGoals_(), ticks = gRows_('ticks');
  const byId = {}; goals.forEach((g) => { byId[g.id] = g; });
  const undone = gUndone_(ticks), isC = (t) => gNote_(t).side === 'c';
  const tt = ticks.filter((t) => String(t.day) >= r.from && String(t.day) <= r.to && !undone[t.id] && !gNote_(t).untick && Number(t.delta) > 0 && byId[t.goalId]);
  const votes = {}; tt.filter((t) => !isC(t) && byId[t.goalId].who).forEach((t) => { const w = byId[t.goalId].who; votes[w] = (votes[w] || 0) + 1; });
  const mine = {}; goals.forEach((g) => { if (g.who) mine[g.who] = true; });
  const who = G_WHO.filter((w) => mine[w] || votes[w]).map((w) => ({ who: w, votes: votes[w] || 0, lit: Math.min(1, (votes[w] || 0) / C_PANES) })).sort((a, b) => b.votes - a.votes);
  const nm = (t) => { const g = byId[t.goalId]; return g.polarity === 'both' ? (String(g.name).split(' / ')[1] || g.name) : g.name; };
  const days = {};
  tt.forEach((t) => { const d = String(t.day), x = days[d] || (days[d] = { day: d, good: 0, curse: 0, first: [] }); if (isC(t)) x.curse++; else { x.good++; x.first.push(t); } });
  const active = Object.keys(days).map((d) => days[d]);
  active.forEach((x) => { x.score = x.good - 2 * x.curse; x.first = x.first.sort((a, b) => (String(a.at) < String(b.at) ? -1 : 1)).slice(0, 2).map(nm); });
  const sc = active.filter((x) => x.good > 0).map((x) => x.score).sort((a, b) => b - a), cut = sc.length ? sc[Math.floor((sc.length - 1) / 2)] : Infinity;
  const better = active.filter((x) => x.good > 0 && x.score >= cut), firsts = {};
  better.forEach((x) => x.first.forEach((n) => { firsts[n] = (firsts[n] || 0) + 1; }));
  const cameFirst = Object.keys(firsts).map((n) => ({ name: n, days: firsts[n] })).sort((a, b) => b.days - a.days || (a.name < b.name ? -1 : 1)).slice(0, 3);
  const tagBy = cTagsByDay_(), heavy = [];
  Object.keys(tagBy).filter((d) => d >= r.from && d <= r.to).sort().forEach((d) => {
    const tg = tagBy[d].filter((x) => x !== C_ILL), x = days[d] || { good: 0, curse: 0 };
    if (tg.length || tagBy[d].indexOf(C_ILL) >= 0) heavy.push({ day: d, tags: tagBy[d], good: x.good, curse: x.curse });
  });
  const tagCount = {}; heavy.forEach((h) => h.tags.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  // the act's chapters, one per school week: its stained-glass pane is that week's colours (blue blessings, red curses,
  // gold rituals); a chapter is closed when High Vespers for that week was saved
  const reviewed = {}; gRows_('reviews').forEach((x) => { reviewed[String(x.week)] = true; });
  const chapters = [];
  for (let mon = gMonday_(r.from), n = 1; mon <= r.to; mon = gAdd_(mon, 7), n++) {
    const sun = gAdd_(mon, 6), wk = tt.filter((t) => String(t.day) >= mon && String(t.day) <= sun);
    chapters.push({ chapter: n, from: mon, blessings: wk.filter((t) => !isC(t) && byId[t.goalId].kind === 'habit').length, curses: wk.filter(isC).length,
      rituals: wk.filter((t) => !isC(t) && byId[t.goalId].kind !== 'habit').length, closed: !!reviewed[mon], now: today >= mon && today <= sun });
  }
  return { from: r.from, to: r.to, act: story.name, chapters, actNo: story.act, panes: C_PANES, who, betterDays: better.length, activeDays: active.length, cameFirst,
    heavy, tagCount: Object.keys(tagCount).map((t) => ({ tag: t, days: tagCount[t] })).sort((a, b) => b.days - a.days) };
}
// the term page, asked for when it is opened (it reads the whole term, so it is not in every snapshot)
function gameCompanionTerm(k) {
  check_(k); gFresh_(); cReg_();
  const world = gWorld_(), today = gDay_(gNow_());
  return gOut_(cTerm_(today, world, gFrozenDays_()));
}

/* ---- nudges: at most one a day, never after 7 pm, never sad, each kind switchable off. They name something real.
   The installed app's notifications (Lane C, lanes/design-installed-app.md 6.2) will ask gameNudge every so often and
   send whatever comes back; nothing here sends anything by itself. Kinds:
   - streak: a ritual not yet done today whose usual time (the middle of its last 14 tick times) has passed, the
     longest streak first: "Read: 24 days";
   - find: Ulhu is back from the deep with something (from 7 am). ---- */
const C_NUDGE_END = 19;              // 7 pm: nothing reaches out after this
const C_NUDGE_KINDS = ['streak', 'find'];
function cHm_(t) { return Utilities.formatDate(new Date(t.at), TZ, 'HH:mm'); }
function cUsual_(goalId, ticks, today) {
  const from = gAdd_(today, -14), und = gUndone_(ticks);
  const hm = ticks.filter((t) => t.goalId === goalId && String(t.day) >= from && String(t.day) < today && Number(t.delta) > 0 && !und[t.id] && !gNote_(t).untick).map(cHm_).sort();
  return hm.length >= 3 ? hm[Math.floor(hm.length / 2)] : '';   // three ticks or more before there is a "usual"
}
function cNudge_(now, world) {
  const today = gDay_(now), hour = Number(Utilities.formatDate(now, TZ, 'H')), hm = Utilities.formatDate(now, TZ, 'HH:mm'), p = gPlayer_();
  if (hour >= C_NUDGE_END || String(p.nudgeLast || '') === today) return null;
  const off = String(p.nudgeOff || '').split('|');
  if (off.indexOf('all') >= 0) return null;
  if (off.indexOf('find') < 0 && hour >= 7) { const a = cAdventure_(today, world); if (a.state === 'back') return { kind: 'find', text: 'Ulhu is back from the deep. He found something.' }; }
  if (off.indexOf('streak') < 0) {
    const ticks = gRows_('ticks'), frozen = gFrozenDays_();
    const due = gGoals_().filter((g) => g.kind === 'daily' && g.streak >= 2 && gIsDue_(g, today) && !gIsFrozen_(today, world, frozen, g) && gNet_(ticks, g.id, today) <= 0)
      .map((g) => ({ g, at: cUsual_(g.id, ticks, today) })).filter((x) => x.at && x.at <= hm && x.at < String(C_NUDGE_END) + ':00')
      .sort((a, b) => b.g.streak - a.g.streak);
    if (due.length) return { kind: 'streak', text: due[0].g.name + ': ' + due[0].g.streak + ' days', goalId: due[0].g.id };
  }
  return null;
}
// what a nudge would say right now, or null. send = true marks today as used (the app calls it that way when it really sends).
function gameNudge(k, send) {
  check_(k); gFresh_();
  let out = null;
  withLock_(function () { gFresh_(true); cReg_();
    out = cNudge_(gNow_(), gWorld_());
    if (out && send) { const p = gPlayer_(); p.nudgeLast = gDay_(gNow_()); gSavePlayer_(p); }
  });
  return out;
}
// which kinds are switched off ('streak', 'find', or 'all')
function gameNudgeOff(k, kinds) {
  check_(k); gFresh_();
  withLock_(function () { gFresh_(true);
    const p = gPlayer_(); p.nudgeOff = (kinds || []).filter((x) => C_NUDGE_KINDS.indexOf(x) >= 0 || x === 'all').join('|'); gSavePlayer_(p); });
  return gSnapshot_(gWorld_());
}

/* ---- what the page gets with every snapshot (Game.gs gSnapshot_ adds it as "comp") ---- */
function cSnap_(today, world, frozen, p) {
  cReg_();
  const by = cTagsByDay_(), days = {};
  for (let i = -7; i <= 14; i++) { const d = gAdd_(today, i); if (by[d]) days[d] = by[d]; }
  return { tags: cTagList_(p), days, ill: cIllDay_(today, frozen), story: cStory_(today, world), adventure: cAdventure_(today, world), nudgeOff: String((p || gPlayer_()).nudgeOff || '').split('|').filter(Boolean) };
}

/* ---- the cabinets (Patryk 2026-10-30, adventure pick 3B with a twist): one cabinet per act. Each object find gives a
   torn note, one piece of that act's page; the act's eight pieces read in order make one short story, still never
   explained. Lore lines are scratched inside the cabinet. Grey-night and between-acts finds sit on their own shelf. ---- */
const C_PIECES = {
  1: ['They rang the bell once, at the wrong hour,', 'and the number on the last door was 9.', 'The church key turned from the inside.', 'A child wrote one word, again and again, so it would not be lost.', 'On the roof, the cockerel turned to face the water.', 'Someone set the table for one more.', 'Then the rope was cut, from both ends at once.', 'They sang four hundred and twelve, and the tide came in to listen.'],
  2: ['Before the first lamp, there was a wick nobody dared to light.', 'A keeper caught a flame in glass and let it sink.', 'She followed it down with her long hook,', 'lighting the silt as she passed, kindly, one patch at a time.', 'She hung a tin star where the dark was thickest.', 'From above, it looked very far away.', 'She is still striking matches. She has not run out.', 'Every window she passes remembers being lit.'],
  3: ['The choir took one breath together,', 'and the cold kept it for them.', 'The youngest singer\'s collar froze first.', 'Their music had only rests left in it.', 'Inside the ice they can see out. They are watching for someone.', 'Nothing down there melts until it is ready.', 'Each morning the frost draws the next note.', 'When the baton is whole again, they will sing the rest.'],
  4: ['The reef slept through the bell, the lanterns and the long cold.', 'Someone planted something in it anyway.', 'A shell opened, just a little, to see.', 'A crab left its old armour on the step and walked on, larger.', 'The anemones began to wave, slowly, at no one in particular.', 'The new kelp came up greener than it had any right to.', 'Even the stone was not sure it was still stone.', 'Growth comes in small round pieces. More are coming.'],
  5: ['Every tally ever made is kept in the Archive.', 'Nothing is overdue. Nothing is fined.', 'The pages turn themselves to where you are.', 'There is a list, and only one thing is left on it.', 'The ink writes in a stranger\'s hand, and then in yours.', 'The book of this year is open at the middle.', 'One column for what was carried. One for what was set down.', 'The index ends with your name.'],
  6: ['Above the deep there is a door with a handle made of sun.', 'A gull came down to look at it.', 'Beside it, a dry stone. Nothing down there is dry.', 'Someone cut a piece of sky to measure the gap.', 'The hinges were oiled by somebody patient.', 'There is a ticket, one way, with the place smudged out.', 'On the step, a little flag says somebody built something here.', 'The key was never lost. It was waiting to be carried up.'],
  7: ['The year put its last message in a bottle and let go.', 'The compass stopped pointing anywhere in particular.', 'An old sail, patched seven times, caught a slow wind.', 'Something round and strange floated by. He kept it.', 'Somebody up there lost a shoe and did not mind.', 'A card came, unsigned: wish you were here.', 'Even the knight stopped charging and went sideways for a while.', 'A small star fell in to rest, and so did he.']
};
// every act's cabinet: its objects in page order (found or not), the lore lines found, and the odd-things shelf
function cCabinets_(today, world) {
  cReg_();
  const got = {}; gRows_('finds').forEach((r) => { got[String(r.fid)] = String(r.day); });
  const now = cStory_(today, world).act;
  const acts = C_ACTS.map((name, a) => {
    const key = String(a + 1), objs = [], lore = []; let n = 0;
    C_FINDS[key].forEach((x, i) => { const p = x.split('|'), fid = key + ':' + i;
      if (p[0] === 'o') { objs.push({ fid, name: p[1], line: p[2], piece: (C_PIECES[key] || [])[n] || '', found: got[fid] || '' }); n++; }
      else if (got[fid]) lore.push({ fid, text: p[1], found: got[fid] }); });
    return { act: a + 1, name, state: a + 1 < now ? 'past' : a + 1 === now ? 'now' : 'later', objects: objs, lore, pieces: objs.filter((o) => o.found).length };
  });
  const odd = []; ['interlude', 'small'].forEach((key) => C_FINDS[key].forEach((x, i) => { const p = x.split('|'), fid = key + ':' + i;
    if (got[fid]) odd.push({ fid, kind: p[0] === 'o' ? 'object' : 'lore', name: p[0] === 'o' ? p[1] : '', text: p[0] === 'o' ? p[2] : p[1], found: got[fid], grey: key === 'small' }); }));
  return { now, acts, odd };
}
function gameCabinets(k) { check_(k); return cCabinets_(gDay_(gNow_()), gWorld_()); }

/* ==== FOCUS CRAFTS (companion-focus.js, 30 Oct 2026) ========================================================
   While Patryk focuses on a task, Ulhu knits (Patryk 30 Oct: knitting only for now; the craft column stays so more
   crafts can come later). The page keeps the running piece itself (it pauses when
   he leaves the app and is never lost); only a finished piece comes here, to go on the shelf. A bigger task makes a
   bigger piece. Ulhu never decides: Patryk picks the size and presses Start. ==== */
const CF_PIECES = { knit: { small: 'sock', medium: 'kelp scarf', large: 'jumper' } };
function cfReg_() {
  if (G_HEAD.focus) return;
  G_HEAD.focus = ['day', 'craft', 'size', 'minutes', 'piece', 'savedOn']; G_TAB.focus = 'Game Focus';
}
function cfShelf_() {
  cfReg_();
  return gRows_('focus').slice().reverse().slice(0, 40).map((r) => ({ day: String(r.day), craft: String(r.craft), size: String(r.size), minutes: Number(r.minutes) || 0, piece: String(r.piece), savedOn: String(r.savedOn) }));
}
// a finished piece goes on the shelf; returns the shelf (newest first)
function gameFocusDone(k, craft, size, minutes) {
  check_(k); gFresh_();
  craft = String(craft || ''); size = String(size || ''); minutes = Number(minutes);
  if (!CF_PIECES[craft]) throw new Error('Only knitting for now.');
  if (!CF_PIECES[craft][size]) throw new Error('Pick a small, medium or large task.');
  if (!isFinite(minutes) || minutes < 1 || minutes > 240) throw new Error('The focus time does not look right.');
  return withLock_(function () { gFresh_(true); cfReg_();
    const today = gDay_(gNow_());
    gAppend_('focus', { day: today, craft, size, minutes: Math.round(minutes), piece: CF_PIECES[craft][size], savedOn: today });
    return cfShelf_();
  });
}
function gameFocusShelf(k) { check_(k); gFresh_(); return cfShelf_(); }
/* ==== end FOCUS CRAFTS ==== */
