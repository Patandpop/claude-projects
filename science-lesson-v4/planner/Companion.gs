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

/* ---- what the page gets with every snapshot (Game.gs gSnapshot_ adds it as "comp") ---- */
function cSnap_(today, world, frozen, p) {
  cReg_();
  const by = cTagsByDay_(), days = {};
  for (let i = -7; i <= 14; i++) { const d = gAdd_(today, i); if (by[d]) days[d] = by[d]; }
  return { tags: cTagList_(p), days, ill: cIllDay_(today, frozen), story: cStory_(today, world), adventure: cAdventure_(today, world) };
}
