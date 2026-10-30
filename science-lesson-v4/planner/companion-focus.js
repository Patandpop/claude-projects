/* ============================================================================
   companion-focus.js: focus crafts (Lane D, 30 Oct 2026). While Patryk focuses on a task, Ulhu makes something.
   From the approved mock-up replica/design/mockups/companion/focus-crafts-2.html. Patryk 30 Oct: KNITTING ONLY for now,
   with the "yarn to row" progress bar (P4). The craft is still stored with each piece so more crafts can come later.
   The knitting scene is the mock-up's; a new scene may replace knitStage() once he picks one.
   Law: leaving the app PAUSES the piece (it never crumbles and is never lost) and coming back resumes it. A bigger task
   makes a bigger piece. The tool suggests, never decides: Patryk picks the size and presses Start. He can
   stop early: the piece waits on the bench, half made, and can be picked up again later.
   The running piece lives in localStorage "ulhuFocus"; only a finished piece goes to the server (gameFocusDone).
   Opened by game-companion.js as the "Focus" tab: window.UZCOMP_FOCUS.render(el, X). Loads harmlessly in node.
   ============================================================================ */
(function (root) {
  'use strict';
  const KEY = 'ulhuFocus';
  const MIN = { small: 15, medium: 30, large: 60 };
  const SIZES = ['small', 'medium', 'large'];
  const CRAFT = { knit: 'Knitting' };
  const PIECE = { knit: { small: 'sock', medium: 'kelp scarf', large: 'jumper' } };
  const api = { MIN, PIECE, render: function () {} };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root || !root.document) return;
  const doc = root.document;

  /* ---------------- the stored focus ---------------- */
  // { pick:{craft,size}, cur:{craft,size,el,run,done,day}|null, bench:[{craft,size,el,day}], owed:[{id,craft,size}] }
  function load() {
    let s = null;
    try { s = JSON.parse(root.localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    s = (s && typeof s === 'object') ? s : {};
    if (!s.pick || !CRAFT[s.pick.craft] || !MIN[s.pick.size]) s.pick = { craft: 'knit', size: 'medium' };
    if (s.cur && (!CRAFT[s.cur.craft] || !MIN[s.cur.size])) s.cur = null;
    s.bench = (Array.isArray(s.bench) ? s.bench : []).filter((b) => b && CRAFT[b.craft] && MIN[b.size]);
    s.owed = (Array.isArray(s.owed) ? s.owed : []).filter((o) => o && CRAFT[o.craft] && MIN[o.size]);
    return s;
  }
  function store() { try { root.localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) { /* private mode: it still runs this visit */ } }
  const ST = load();
  const total = (c) => MIN[c.size] * 60;
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const an = (w) => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- the clock: counts only while the page is visible and the piece is running ---------------- */
  let LAST = 0;
  function count(evenHidden) {
    const c = ST.cur, now = Date.now();
    if (!c || !c.run || c.done || (doc.hidden && !evenHidden)) { LAST = 0; return; }
    if (LAST && now > LAST && now - LAST < 5000) c.el = Math.min(total(c), (Number(c.el) || 0) + (now - LAST) / 1000);
    LAST = now;
    if (c.el >= total(c)) {   // finished: it goes on the shelf
      c.el = total(c); c.done = true; c.run = false; LAST = 0;
      ST.owed.push({ id: now, craft: c.craft, size: c.size }); NEWEST = true;
    }
    store();
  }
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) { count(true); LAST = 0; store(); } else LAST = 0;   // away: paused; back: carries on from here
    paint();
  });
  root.addEventListener('pagehide', function () { count(true); LAST = 0; store(); });
  root.setInterval(function () { count(false); saveOwed(); paint(); }, 1000);

  /* ---------------- the shelf on the server ---------------- */
  let XX = null, SHELF = null, SHELF_ERR = '', NOTE = '', SAVING = false, RETRY = 0, NEWEST = false;
  function saveOwed() {
    const o = ST.owed[0];
    if (!o || SAVING || !XX || Date.now() < RETRY) return;
    SAVING = true;
    XX.call('gameFocusDone', o.craft, o.size, MIN[o.size]).then(function (shelf) {
      SAVING = false; ST.owed = ST.owed.filter((x) => x.id !== o.id); store();
      if (Array.isArray(shelf)) SHELF = shelf; NOTE = ''; SHELF_ERR = ''; paint(true);
      if (ST.owed.length) saveOwed();
    }).catch(function () {
      SAVING = false; RETRY = Date.now() + 30000;
      NOTE = 'The shelf could not be reached just now. The piece is safe and will go up by itself.'; paint(true);
    });
  }
  function loadShelf() {
    if (!XX) return;
    XX.call('gameFocusShelf').then(function (s) { SHELF = Array.isArray(s) ? s : []; SHELF_ERR = ''; paint(true); })
      .catch(function () { SHELF_ERR = 'The shelf would not open just now.'; paint(true); });
  }

  /* ---------------- drawing helpers (from the mock-up) ---------------- */
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let uid = 0;

  // Ulhu, drawn to match the game sprite: mint head, big dark eyes, blush, face tentacles, dark green wings, cream belly, sprout
  function ulhuBody(o) {
    o = o || {};
    const wing = '<path d="M0,2 C-10,-12 -22,-20 -28,-16 L-24,-9 L-29,-2 L-23,2 L-25,10 C-16,10 -6,8 0,6 Z" fill="#3f8a57" stroke="#1d4a33" stroke-width="1.5" stroke-linejoin="round"/><path d="M0,4 L-24,-9 M0,5 L-23,2" stroke="#1d4a33" stroke-width="1" fill="none"/>';
    let s = `<g transform="translate(-11,-27)"><g class="uzcf-wing">${wing}</g></g><g transform="translate(11,-27) scale(-1,1)"><g class="uzcf-wing">${wing}</g></g>`;
    s += '<ellipse cx="-8" cy="-3.5" rx="6.5" ry="4.5" fill="#6cc79f" stroke="#2f6b55" stroke-width="1.4"/><ellipse cx="8" cy="-3.5" rx="6.5" ry="4.5" fill="#6cc79f" stroke="#2f6b55" stroke-width="1.4"/>';
    s += '<ellipse cx="0" cy="-17" rx="15.5" ry="15" fill="#8fdcb9" stroke="#2f6b55" stroke-width="1.6"/><ellipse cx="0" cy="-12" rx="9.5" ry="8" fill="#f3ecd2"/>';
    s += '<circle cx="0" cy="-42" r="22" fill="url(#uzcf-hg)" stroke="#2f6b55" stroke-width="1.8"/><ellipse cx="-9" cy="-55" rx="6" ry="3.2" fill="#fff" opacity=".45" transform="rotate(-20 -9 -55)"/>';
    s += '<path d="M0,-63 q-1.5,-5 1,-9" stroke="#3f8a57" stroke-width="2" fill="none"/><ellipse cx="-4" cy="-71" rx="4.6" ry="2.4" transform="rotate(-25 -4 -71)" fill="#7fe07a" stroke="#3f8a57" stroke-width=".8"/><ellipse cx="6" cy="-73" rx="4.6" ry="2.4" transform="rotate(25 6 -73)" fill="#7fe07a" stroke="#3f8a57" stroke-width=".8"/>';
    const eo = (x) => `<g transform="translate(${x},-45)"><g class="uzcf-blink"><ellipse rx="5.3" ry="6.5" fill="#16203a"/><circle cx="-1.8" cy="-2.5" r="2" fill="#fff"/><circle cx="1.7" cy="2.1" r=".95" fill="#fff"/></g></g>`;
    s += `<g class="uzcf-eo">${eo(-8)}${eo(8)}</g>`;
    s += '<g class="uzcf-ec"><path d="M-13,-44 q5,3.5 10,0 M3,-44 q5,3.5 10,0" stroke="#16203a" stroke-width="2" fill="none" stroke-linecap="round"/></g>';
    s += '<g class="uzcf-eh"><path d="M-13,-43 q5,-6 10,0 M3,-43 q5,-6 10,0" stroke="#16203a" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>';
    s += '<ellipse cx="-15.5" cy="-36" rx="4.2" ry="2.4" fill="#ff9fb4" opacity=".85"/><ellipse cx="15.5" cy="-36" rx="4.2" ry="2.4" fill="#ff9fb4" opacity=".85"/>';
    [-9, -3, 3, 9].forEach((x) => { const d = x < 0 ? -1 : 1; s += `<path d="M${x},-33 q${2.5 * d},5 0,9 q${-2.5 * d},4 ${d},7.5" stroke="#2f6b55" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M${x},-33 q${2.5 * d},5 0,9 q${-2.5 * d},4 ${d},7.5" stroke="#5fb894" stroke-width="3.2" fill="none" stroke-linecap="round"/>`; });
    if (o.glasses) {
      s += '<g class="uzcf-glasses"><path d="M-15,-46 Q-22,-40 -20,-26 Q-17,-14 -10,-10" stroke="#e0b85c" stroke-width=".8" fill="none" stroke-dasharray="1.4 1.2" opacity=".85"/><circle cx="-8" cy="-45" r="7.3" fill="#fff" fill-opacity=".14" stroke="#e0b85c" stroke-width="1.5"/><circle cx="8" cy="-45" r="7.3" fill="#fff" fill-opacity=".14" stroke="#e0b85c" stroke-width="1.5"/><path d="M-1.2,-46 q1.2,-2 2.4,0" stroke="#e0b85c" stroke-width="1.3" fill="none"/><path d="M-15.2,-46 L-21,-48 M15.2,-46 L21,-48" stroke="#e0b85c" stroke-width="1.2"/><ellipse cx="-10.5" cy="-48" rx="2.2" ry="1.1" fill="#fff" opacity=".55" transform="rotate(-30 -10.5 -48)"/><ellipse cx="5.5" cy="-48" rx="2.2" ry="1.1" fill="#fff" opacity=".55" transform="rotate(-30 5.5 -48)"/></g>';
    }
    s += '<g class="uzcf-zz"><text class="uzcf-z" x="16" y="-64">z</text><text class="uzcf-z uzcf-z2" x="22" y="-74">z</text><text class="uzcf-z uzcf-z3" x="28" y="-84">Z</text></g>';
    return s;
  }
  function tentArm(d) { return `<path d="${d}" stroke="#2f6b55" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#8fdcb9" stroke-width="4.6" fill="none" stroke-linecap="round"/>`; }

  /* ---------------- KNIT: Ulhu in his armchair, the piece growing row by row ---------------- */
  const KNITS = { small: { H: 60 }, medium: { H: 92 }, large: { H: 76 } };
  function knitPiece(key, f, id) { // f = 0..1; the piece hanging from the needles (top centre = 0,0)
    const K = KNITS[key], rowH = 4, vp = 'url(#uzcf-v)';
    if (key === 'medium') {
      const d = 'M0,0 V58 Q0,80 22,80 H112', L = 58 + 34.6 + 90;
      let s = `<mask id="${id}m" maskUnits="userSpaceOnUse" x="-40" y="-20" width="200" height="140"><path d="${d}" stroke="#fff" stroke-width="30" fill="none" stroke-dasharray="${(L * f).toFixed(1)} 400"/></mask>`;
      s += `<g mask="url(#${id}m)"><path d="${d}" stroke="#2c1a10" stroke-width="25" fill="none"/><path d="${d}" stroke="#2e8a64" stroke-width="22" fill="none"/><path d="${d}" stroke="#5ef2a0" stroke-width="22" fill="none" stroke-dasharray="8 8"/><path d="${d}" stroke="#ffd56a" stroke-width="22" fill="none" stroke-dasharray="3 29" stroke-dashoffset="-10"/><path d="${d}" stroke="${vp}" stroke-width="22" fill="none"/></g>`;
      if (f >= 0.999) s += '<g stroke="#ffd56a" stroke-width="1.6" stroke-linecap="round">' + [-8, -4, 0, 4, 8].map((y) => `<path d="M112,${80 + y} h7"/>`).join('') + '</g>';
      return s;
    }
    let shape, fills;
    if (key === 'small') {
      shape = 'M-14,0 H14 V36 Q14,42 20,42 H32 Q42,42 42,51 Q42,60 32,60 H-4 Q-14,60 -14,50 Z';
      fills = '<rect x="-20" y="-2" width="70" height="70" fill="#4fd394"/><rect x="-20" y="-2" width="70" height="10" fill="#2e8a64"/><rect x="-20" y="16" width="70" height="4" fill="#f3ecd2"/><rect x="-20" y="26" width="70" height="4" fill="#f3ecd2"/><path d="M-14,40 Q-14,58 -2,60 H6 V44 Q-2,44 -14,40 Z" fill="#ffd56a"/><path d="M30,42 Q44,42 42,52 Q42,60 32,60 H28 Z" fill="#ffd56a"/>';
    } else {
      shape = 'M-11,0 H11 Q12,5 18,5 L32,8 L58,40 L47,50 L33,34 V76 H-33 V34 L-47,50 L-58,40 L-32,8 L-18,5 Q-12,5 -11,0 Z';
      fills = '<rect x="-60" y="-2" width="120" height="80" fill="#8a3f72"/><rect x="-60" y="-2" width="120" height="8" fill="#5c2a4c"/><rect x="-60" y="12" width="120" height="4" fill="#f3ecd2"/><rect x="-60" y="20" width="120" height="4" fill="#5ef2a0"/><rect x="-60" y="28" width="120" height="4" fill="#f3ecd2"/><rect x="-60" y="70" width="120" height="8" fill="#5c2a4c"/><path d="M58,40 L47,50 L43,46 L54,36 Z M-58,40 L-47,50 L-43,46 L-54,36 Z" fill="#5c2a4c"/><circle cx="0" cy="51" r="10" fill="#8fdcb9"/><circle cx="-3.6" cy="50" r="2" fill="#16203a"/><circle cx="3.6" cy="50" r="2" fill="#16203a"/><path d="M-4,56 v4 M0,56 v5 M4,56 v4" stroke="#2f6b55" stroke-width="1.6" stroke-linecap="round"/><path d="M0,41 q-1,-3 1,-5" stroke="#3f8a57" stroke-width="1.4" fill="none"/>';
    }
    const tot = Math.ceil(K.H / rowH), done = f * tot, rows = Math.floor(done), frac = done - rows;
    let rev = `<rect x="-80" y="-4" width="160" height="${rows * rowH + 4}" fill="#fff"/>`;
    if (frac > 0 && rows < tot) rev += `<rect x="-80" y="${rows * rowH}" width="${(160 * frac).toFixed(1)}" height="${rowH + 0.3}" fill="#fff"/>`;
    return `<clipPath id="${id}c"><path d="${shape}"/></clipPath><mask id="${id}m" maskUnits="userSpaceOnUse" x="-80" y="-10" width="160" height="100">${rev}</mask>
     <g mask="url(#${id}m)"><g clip-path="url(#${id}c)">${fills}<rect x="-60" y="0" width="120" height="80" fill="${vp}"/></g><path d="${shape}" fill="none" stroke="#2c1a10" stroke-width="1.4"/></g>`;
  }
  function knitStage() {
    const sc = 1.35;
    return `<defs>
     <linearGradient id="uzcf-kbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a35"/><stop offset="1" stop-color="#140c1b"/></linearGradient>
     <linearGradient id="uzcf-vel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a0466a"/><stop offset="1" stop-color="#5a1f3c"/></linearGradient>
     <radialGradient id="uzcf-lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd56a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd56a" stop-opacity="0"/></radialGradient>
     <radialGradient id="uzcf-sea" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#1d5a7a"/><stop offset="1" stop-color="#0a1f33"/></radialGradient>
     <pattern id="uzcf-wall" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M13,4 l3,5 l-3,5 l-3,-5 Z" fill="#ffffff08"/></pattern>
     <clipPath id="uzcf-port"><circle cx="318" cy="118" r="31"/></clipPath>
    </defs>
    <rect width="380" height="330" fill="url(#uzcf-kbg)"/><rect width="380" height="262" fill="url(#uzcf-wall)"/>
    <circle cx="318" cy="118" r="31" fill="url(#uzcf-sea)"/>
    <g clip-path="url(#uzcf-port)"><g transform="translate(318,120)"><g class="uzcf-fish"><path d="M0,0 q8,-6 16,0 q-8,6 -16,0 Z M0,0 l-6,-4 v8 Z" fill="#5aa7ff" opacity=".7"/></g></g>
     ${[[305, 148, 0], [325, 152, -2], [335, 146, -4]].map(([x, y, d]) => `<circle class="uzcf-bub" style="animation-delay:${d}s;animation-duration:5s" cx="${x}" cy="${y}" r="2" fill="none" stroke="#bfe0ff" stroke-width=".8"/>`).join('')}</g>
    <circle cx="318" cy="118" r="31" fill="none" stroke="#c9a560" stroke-width="6"/><circle cx="318" cy="118" r="34.5" fill="none" stroke="#7a5a26" stroke-width="1.5"/>
    ${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${(318 + 31 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(118 + 31 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="1.6" fill="#7a5a26"/>`).join('')}
    <circle cx="44" cy="176" r="60" fill="url(#uzcf-lamp)" class="uzcf-jelly"/>
    <rect x="0" y="262" width="380" height="68" fill="#2b1a12"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M0,${270 + i * 9} H380" stroke="#1c110b" stroke-width="1"/>`).join('')}
    <ellipse cx="168" cy="268" rx="150" ry="10" fill="#5a1f3c"/><ellipse cx="168" cy="268" rx="140" ry="7" fill="none" stroke="#ffd56a55" stroke-width="1.4" stroke-dasharray="4 4"/>
    <g><path d="M44,264 V210" stroke="#5a3a1e" stroke-width="5"/><path d="M30,264 l14,-8 l14,8" stroke="#5a3a1e" stroke-width="4" fill="none"/><ellipse cx="44" cy="208" rx="24" ry="5" fill="#7a5230"/>
     <path d="M30,206 q0,-20 8,-26 h12 q8,6 8,26 Z" fill="#bfe0ff22" stroke="#bfe0ff77" stroke-width="1.2"/><g class="uzcf-jelly"><path d="M36,190 q8,-12 16,0 Z" fill="#ff9fd8"/><path d="M38,190 q-1,6 1,10 M42,190 q1,7 -1,12 M46,190 q-1,6 1,10 M50,190 q1,5 -1,9" stroke="#ff9fd8" stroke-width="1.2" fill="none"/></g>
     <path d="M60,203 h12 v-1 q0,-7 -6,-7 q-6,0 -6,7 Z" fill="#f3ecd2"/><path d="M72,198 q4,0 3,3 q-1,2 -3,1" stroke="#f3ecd2" stroke-width="1.4" fill="none"/><path class="uzcf-steam" d="M64,193 q-3,-4 0,-8 q3,-4 0,-8" stroke="#ffffff88" stroke-width="1.2" fill="none"/><path class="uzcf-steam" style="animation-delay:1.3s" d="M68,193 q-3,-4 0,-8 q3,-4 0,-8" stroke="#ffffff88" stroke-width="1.2" fill="none"/></g>
    <path class="uzcf-strand" d="" stroke="#5ef2a0" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <g transform="translate(305,266)"><g class="uzcf-ball"></g></g>
    <g transform="translate(160,268)"><g class="uzcf-rock">
     <path d="M-78,-4 Q0,14 78,-4" stroke="#7a5230" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-50,-14 V2 M50,-14 V2" stroke="#7a5230" stroke-width="5"/>
     <path d="M-58,-58 L-58,-150 Q-58,-178 -30,-181 Q0,-190 30,-181 Q58,-178 58,-150 L58,-58 Z" fill="url(#uzcf-vel)" stroke="#3a1226" stroke-width="2"/>
     ${[[-30, -150], [0, -158], [30, -150], [-30, -110], [0, -116], [30, -110]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#3a1226"/>`).join('')}
     <rect x="-60" y="-50" width="120" height="38" rx="6" fill="#6e2848" stroke="#3a1226" stroke-width="2"/><path d="M-58,-20 H58" stroke="#ffd56a66" stroke-width="1.2" stroke-dasharray="3 3"/>
     <rect x="-56" y="-66" width="112" height="20" rx="9" fill="#b45a80" stroke="#3a1226" stroke-width="2"/>
     <g transform="translate(0,-60) scale(${sc})"><g class="uzcf-tilt"><g class="uzcf-breath">${ulhuBody({ glasses: true })}</g></g></g>
     <path d="M-74,-50 V-92 Q-74,-106 -60,-106 Q-46,-106 -46,-92 V-50 Z" fill="url(#uzcf-vel)" stroke="#3a1226" stroke-width="2"/><circle cx="-60" cy="-94" r="6" fill="none" stroke="#3a1226" stroke-width="1.5"/>
     <path d="M74,-50 V-92 Q74,-106 60,-106 Q46,-106 46,-92 V-50 Z" fill="url(#uzcf-vel)" stroke="#3a1226" stroke-width="2"/><circle cx="60" cy="-94" r="6" fill="none" stroke="#3a1226" stroke-width="1.5"/>
     <g transform="translate(0,${(-60 - 18 * sc).toFixed(1)})" class="uzcf-piece"></g>
     <g transform="translate(0,-60) scale(${sc})"><g class="uzcf-tilt">
      ${tentArm('M-13,-24 q-6,5 -3,10')}${tentArm('M13,-24 q6,5 3,10')}
      <g transform="translate(-16,-14)"><g class="uzcf-nl"><path d="M-11,5 L29,-13" stroke="#e0b85c" stroke-width="2.3" stroke-linecap="round"/><circle cx="-11" cy="5" r="2.6" fill="#ff7a8a"/></g></g>
      <g transform="translate(16,-14)"><g class="uzcf-nr"><path d="M11,5 L-29,-13" stroke="#e0b85c" stroke-width="2.3" stroke-linecap="round"/><circle cx="11" cy="5" r="2.6" fill="#ff7a8a"/></g></g>
      <circle cx="-16" cy="-14" r="3.6" fill="#8fdcb9" stroke="#2f6b55" stroke-width="1.2"/><circle cx="16" cy="-14" r="3.6" fill="#8fdcb9" stroke="#2f6b55" stroke-width="1.2"/>
      <text class="uzcf-clk" x="-46" y="-16">click</text><text class="uzcf-clk uzcf-clk2" x="26" y="-16">clack</text>
      <g class="uzcf-heart">${[[-24, -60, 0], [22, -66, 0.7], [0, -80, 1.4]].map(([x, y, d]) => `<g transform="translate(${x},${y})"><path class="uzcf-hrt" style="animation-delay:${d}s" d="M0,3 C-6,-2 -4,-7 0,-4 C4,-7 6,-2 0,3 Z" fill="#ff7a8a"/></g>`).join('')}</g>
     </g></g>
    </g></g>
    <g class="uzcf-bar"></g>`;
  }
  // the progress bar he picked (P4, yarn to row): a loose strand along the floor turns into a knitted band; the ball shrinks
  function knitBar(p, live) {
    const f = p / 100, x0 = 18, x1 = 350, xp = x0 + (x1 - x0) * f, y = 300;
    let s = `<rect x="${x0}" y="${y - 8}" width="${(xp - x0).toFixed(1)}" height="16" fill="#2e8a64"/><rect x="${x0}" y="${y - 8}" width="${(xp - x0).toFixed(1)}" height="16" fill="url(#uzcf-v)"/>`;
    for (let x = x0; x < xp; x += 30) s += `<rect x="${x + 18}" y="${y - 8}" width="${Math.max(0, Math.min(6, xp - x - 18)).toFixed(1)}" height="16" fill="#ffd56a"/><rect x="${x + 18}" y="${y - 8}" width="${Math.max(0, Math.min(6, xp - x - 18)).toFixed(1)}" height="16" fill="url(#uzcf-v)"/>`;
    s += `<rect x="${x0}" y="${y - 8}" width="${(xp - x0).toFixed(1)}" height="16" fill="none" stroke="#14301f" stroke-width="1"/>`;
    if (p < 100) {
      let d = `M${xp.toFixed(1)},${y}`; for (let x = xp; x < x1; x += 8) d += ' q2,-5 4,0 q2,5 4,0';
      s += `<path d="${d}" stroke="#5ef2a0" stroke-width="1.6" fill="none"/><circle cx="${x1 + 9}" cy="${y}" r="${(3 + 7 * (1 - f)).toFixed(1)}" fill="#3fc283" stroke="#1d5a3c"/>`;
      s += `<g transform="translate(${xp.toFixed(1)},${y})"><g class="${live ? 'uzcf-sway' : ''}"><path d="M-6,-14 L6,8 M6,-14 L-6,8" stroke="#c9a560" stroke-width="1.8" stroke-linecap="round"/></g></g>`;
    }
    return s;
  }
  function knitUpdate(svg, size, p, live) {
    svg.querySelector('.uzcf-piece').innerHTML = knitPiece(size, p / 100, 'uzcf-kp');
    svg.querySelector('.uzcf-bar').innerHTML = knitBar(p, live);
  }
  // the yarn ball wobbles and the strand sways (still when he is resting or done)
  function ballFrame(svg, p, live, t) {
    const ball = svg.querySelector('.uzcf-ball'), strand = svg.querySelector('.uzcf-strand'); if (!ball || !strand) return;
    const bs = 1 - 0.62 * p / 100, a = live ? 9 * Math.sin(t / 1000 * 2 * Math.PI / 1.1) : 0, r = 22 * bs;
    ball.setAttribute('transform', `rotate(${a.toFixed(2)}) translate(${(a * 0.25).toFixed(2)},0)`);
    ball.innerHTML = `<circle cx="0" cy="${-r}" r="${r}" fill="#3fc283" stroke="#1d5a3c" stroke-width="1.5"/><g transform="translate(0,${-r}) scale(${bs})"><path d="M-18,-8 Q0,-22 18,-8 M-21,2 Q0,-14 21,2 M-17,12 Q0,-2 17,12 M-8,-20 Q6,0 -2,21" stroke="#1d5a3c" stroke-width="1.4" fill="none"/></g>`;
    const rad = a * Math.PI / 180, bx = 305 + Math.sin(rad) * 2 * r * 0.9 + a * 0.25, by = 266 - Math.cos(rad) * 2 * r * 0.9;
    const nx = 172, ny = 180, sag = 34 + (live ? 5 * Math.sin(t / 1000 * 2 * Math.PI / 1.4) : 0);
    strand.setAttribute('d', `M${nx},${ny} Q${((nx + bx) / 2).toFixed(1)},${(Math.max(ny, by) + sag).toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`);
  }

  /* ---------------- small pictures of a finished piece (shelf and picker) ---------------- */
  const KBOX = { small: [-16, -2, 60, 64], medium: [-13, -2, 138, 96], large: [-60, -2, 120, 80] };
  function pieceIcon(craft, size, cls) {
    return `<svg class="${cls}" viewBox="${KBOX[size].join(' ')}" aria-hidden="true">${knitPiece(size, 1, 'uzcf-i' + (uid++))}</svg>`;
  }
  // one plank holds four pieces; each sits on the plank, its name cut into the front edge
  function shelfSvg(list, popFirst) {
    if (!list.length) return '<svg class="uzcf-plank" viewBox="0 0 380 104"><rect x="6" y="4" width="368" height="76" rx="10" fill="#0b1a17" stroke="#26362f"/><rect x="0" y="78" width="380" height="18" fill="#5d6a64"/><rect x="0" y="78" width="380" height="2" fill="#8a9993"/><rect x="152" y="14" width="76" height="60" rx="8" fill="none" stroke="#5ef2a066" stroke-dasharray="4 4"/><text x="190" y="48" text-anchor="middle" font-size="11" fill="#9fb1a8">first piece</text></svg>';
    let out = '';
    for (let i = 0; i < list.length; i += 4) {
      let s = '<rect x="6" y="4" width="368" height="76" rx="10" fill="#0b1a17" stroke="#26362f"/><rect x="0" y="78" width="380" height="18" fill="#5d6a64"/><rect x="0" y="78" width="380" height="2" fill="#8a9993"/>';
      list.slice(i, i + 4).forEach((x, j) => {
        const cx = 50 + j * 93, craft = 'knit', size = MIN[x.size] ? x.size : 'small', first = popFirst && i + j === 0;
        let art;
        { const fit = { small: [0.82, -52, -10], medium: [0.5, -48, -30], large: [0.62, -50, 0] }[size]; art = `<g transform="translate(${cx + fit[2]},${78 + fit[1]}) scale(${fit[0]})">${knitPiece(size, 1, 'uzcf-sh' + (uid++))}</g>`; }
        s += `<g${first ? ' class="uzcf-pop"' : ''}><title>${esc(an(x.piece || PIECE[craft][size]))}, ${Number(x.minutes) || MIN[size]} min, ${esc(x.day || '')}</title>${art}</g>`;
        s += `<text x="${cx}" y="91" text-anchor="middle" font-size="10" fill="#d6ddd9" font-weight="700">${esc(x.piece || PIECE[craft][size])}</text>`;
        if (first) s += `<path class="uzcf-glint" d="M${cx + 26},22 l1.5,-4 l1.5,4 l4,1.5 l-4,1.5 l-1.5,4 l-1.5,-4 l-4,-1.5 Z" fill="#ffd56a"/>`;
      });
      out += `<svg class="uzcf-plank" viewBox="0 0 380 100">${s}</svg>`;
    }
    return out;
  }

  /* ---------------- the screen ---------------- */
  const CSS = `
.uzcf{color:#e8e1cf;font:14px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',system-ui,sans-serif;padding:0 0 18px;max-width:420px;margin:0 auto}
.uzcf-defs{position:absolute;width:0;height:0;overflow:hidden}
.uzcf-sw{position:relative;border:1px solid #1b2823;border-radius:16px;overflow:hidden;margin:4px 10px 0;background:#07100d}
.uzcf-stage{display:block;width:100%;height:auto}
.uzcf-time{position:absolute;left:8px;top:8px;background:#020504c0;border:1px solid #2f443b;border-radius:14px;padding:5px 12px 6px;line-height:1}
.uzcf-time b{font:700 30px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',sans-serif;color:#fff}
.uzcf-time i{font:700 15px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',sans-serif;color:#fff;font-style:normal;margin-left:4px}
.uzcf-time span{display:block;font:700 12px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',sans-serif;color:#c9a560;margin-top:3px}
.uzcf-pz{display:none;position:absolute;right:8px;top:10px;font:700 11px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',sans-serif;letter-spacing:.06em;color:#bfe0ff;background:#0f1a24e0;border:1px solid #5aa7ff;border-radius:999px;padding:4px 9px;text-align:center;line-height:1.3}
.uzcf-paused .uzcf-pz{display:block}
.uzcf-fintag{display:none;position:absolute;left:50%;bottom:4.5%;transform:translateX(-50%);white-space:nowrap;text-align:center;font:700 20px 'Grenze Gotisch',serif;color:#ffd56a;text-shadow:0 2px 0 #000;background:#020504d9;border:1px solid #c9a560;border-radius:999px;padding:3px 16px 5px}
.uzcf-fin .uzcf-fintag{display:block}
.uzcf-panel{margin:10px 10px 0}
.uzcf-lab{font:700 12px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#c9a560;margin:12px 2px 6px}
.uzcf-row{display:flex;gap:8px}
.uzcf-row button{flex:1;min-width:0}
.uzcf button{font:700 14px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}
.uzcf-ico{width:38px;height:38px;flex:none}
.uzcf-size{padding:8px 4px 7px;border-radius:14px;border:1px solid #6b5630;background:#1a140a;color:#ffe2a0;text-align:center;line-height:1.15}
.uzcf-size.on{background:#c9a560;color:#1a140a;border-color:#c9a560}
.uzcf-size b{display:block;font-size:15px}.uzcf-size span{display:block;font-size:12px;font-weight:700;opacity:.85}.uzcf-size i{display:block;font-style:normal;font-size:11.5px;font-weight:400;margin-top:2px}
.uzcf-go{display:block;width:100%;margin:14px 0 0;padding:13px 14px;border-radius:999px;border:0;background:#5ef2a0;color:#04120b;font-size:16px!important}
.uzcf-go:active{transform:translateY(1px)}
.uzcf-soft{display:block;width:100%;margin:10px 0 0;padding:11px 14px;border-radius:999px;border:1px solid #5aa7ff;background:#0f1a24;color:#bfe0ff}
.uzcf-hint{color:#9fb1a8;font-size:13px;line-height:1.4;margin:10px 2px 0}
.uzcf-note{color:#ffe2a0;font-size:13px;line-height:1.4;margin:10px 2px 0;padding:8px 10px;border:1px solid #6b5630;border-radius:10px;background:#1a140a}
.uzcf-bench{display:flex;align-items:center;gap:8px;padding:7px 8px;margin:6px 0 0;border:1px dashed #2f443b;border-radius:12px;background:#08110e}
.uzcf-bench .uzcf-ico{width:30px;height:30px;opacity:.75}
.uzcf-bench span{flex:1;color:#cfd8d3;font-size:13px;line-height:1.25}
.uzcf-bench button{padding:7px 11px;border-radius:999px;border:1px solid #5ef2a0;background:#0f2a1f;color:#bff7e4;font-size:12.5px}
.uzcf-shh{display:flex;align-items:baseline;gap:8px;font:500 22px 'Grenze Gotisch',serif;color:#c9a560;margin:18px 12px 4px}
.uzcf-shh small{font:400 12.5px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',sans-serif;color:#9fb1a8}
.uzcf-shelf{margin:0 10px}
.uzcf-plank{display:block;width:100%;height:auto;margin:0 0 6px}
/* Ulhu bits */
.uzcf-blink{animation:uzcf-blink 4.2s infinite;transform-box:fill-box;transform-origin:center}
@keyframes uzcf-blink{0%,93%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.uzcf-eo{display:inline}.uzcf-ec,.uzcf-eh{display:none}
.uzcf-paused .uzcf-eo,.uzcf-fin .uzcf-eo{display:none}.uzcf-paused .uzcf-ec{display:inline}.uzcf-fin .uzcf-eh{display:inline}
.uzcf-zz{display:none}.uzcf-paused .uzcf-zz{display:inline}
.uzcf-z{font:700 13px 'Grenze Gotisch',serif;fill:#bfe0ff;animation:uzcf-zz 2.6s ease-in-out infinite;opacity:0}
.uzcf-z2{animation-delay:.85s}.uzcf-z3{animation-delay:1.7s}
@keyframes uzcf-zz{0%{transform:translate(0,0);opacity:0}25%{opacity:1}100%{transform:translate(10px,-18px);opacity:0}}
.uzcf-wing{animation:uzcf-flap .7s ease-in-out infinite alternate}
@keyframes uzcf-flap{from{transform:rotate(-7deg)}to{transform:rotate(6deg)}}
.uzcf-paused .uzcf-wing,.uzcf-idle .uzcf-wing{animation-duration:2.4s}
.uzcf-paused .uzcf-breath,.uzcf-idle .uzcf-breath{animation:uzcf-breath 3.2s ease-in-out infinite}
@keyframes uzcf-breath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.97)}}
@keyframes uzcf-sp{0%,100%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1)}}
.uzcf-bub{animation:uzcf-bub 7s linear infinite}
@keyframes uzcf-bub{0%{transform:translate(0,0);opacity:0}10%{opacity:.7}100%{transform:translate(6px,-260px);opacity:0}}
/* knit */
.uzcf-work .uzcf-rock{animation:uzcf-rock 3.2s ease-in-out infinite}
@keyframes uzcf-rock{0%,100%{transform:rotate(-1.6deg)}50%{transform:rotate(1.6deg)}}
.uzcf-work .uzcf-nl{animation:uzcf-nl .45s ease-in-out infinite alternate}
.uzcf-work .uzcf-nr{animation:uzcf-nl .45s ease-in-out infinite alternate-reverse}
@keyframes uzcf-nl{from{transform:rotate(-7deg)}to{transform:rotate(5deg)}}
.uzcf-clk{opacity:0;font:700 8px 'Atkinson Hyperlegible Next','Atkinson Hyperlegible',sans-serif;fill:#ffe2a0}
.uzcf-work .uzcf-clk{animation:uzcf-clk .9s ease-out infinite}
.uzcf-work .uzcf-clk2{animation-delay:.45s}
@keyframes uzcf-clk{0%{opacity:0;transform:translate(0,2px)}12%{opacity:1;transform:translate(0,0)}45%{opacity:0;transform:translate(0,-5px)}100%{opacity:0}}
.uzcf-glasses{transition:transform .7s ease}
.uzcf-paused .uzcf-glasses{transform:translateY(7px) rotate(-6deg)}
.uzcf-tilt{transition:transform .7s ease}
.uzcf-paused .uzcf-tilt{transform:rotate(-7deg)}
.uzcf-heart{display:none}.uzcf-fin .uzcf-heart{display:inline}
.uzcf-hrt{animation:uzcf-hrt 2.2s ease-out infinite;opacity:0}
@keyframes uzcf-hrt{0%{opacity:0;transform:translate(0,0) scale(.5)}20%{opacity:1}100%{opacity:0;transform:translate(4px,-30px) scale(1.1)}}
.uzcf-steam{animation:uzcf-steam 2.6s ease-in-out infinite;opacity:0}
@keyframes uzcf-steam{0%{opacity:0;transform:translate(0,0)}30%{opacity:.6}100%{opacity:0;transform:translate(3px,-16px)}}
.uzcf-jelly{animation:uzcf-jelly 3s ease-in-out infinite alternate}
@keyframes uzcf-jelly{from{opacity:.55}to{opacity:1}}
.uzcf-fish{animation:uzcf-fish 9s linear infinite}
@keyframes uzcf-fish{from{transform:translateX(-50px)}to{transform:translateX(50px)}}
.uzcf-sway{animation:uzcf-sway 2.4s ease-in-out infinite alternate}
@keyframes uzcf-sway{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
/* shelf */
.uzcf-pop{animation:uzcf-pop .9s cubic-bezier(.3,1.6,.5,1) both;transform-box:fill-box;transform-origin:50% 100%}
@keyframes uzcf-pop{from{transform:translateY(-40px) scale(.2);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
.uzcf-glint{animation:uzcf-sp 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion:reduce){.uzcf-work .uzcf-nl,.uzcf-work .uzcf-nr{animation-duration:1.4s}.uzcf-work .uzcf-rock{animation:none}}
`;
  function css() {
    if (doc.getElementById('uzcf-css')) return;
    const st = doc.createElement('style'); st.id = 'uzcf-css'; st.textContent = CSS; doc.head.appendChild(st);
  }
  const DEFS = '<svg class="uzcf-defs" aria-hidden="true" focusable="false"><defs>' +
    '<radialGradient id="uzcf-hg" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#d4fae8"/><stop offset=".55" stop-color="#93dfbd"/><stop offset="1" stop-color="#5cb893"/></radialGradient>' +
    '<pattern id="uzcf-v" width="6" height="4" patternUnits="userSpaceOnUse"><path d="M.6,.3 L3,3.6 L5.4,.3" fill="none" stroke="#00000055" stroke-width="1"/><path d="M1.1,.4 L3,2.7" stroke="#ffffff38" stroke-width=".8"/></pattern>' +
    '</defs></svg>';

  let V = null;   // the open screen: { el, key, state, p, panel, shelfKey, raf }
  function state() {
    const c = ST.cur;
    if (!c) return 'idle';
    if (c.done) return 'fin';
    return (!c.run || doc.hidden) ? 'paused' : 'work';
  }
  function minsLeft(c) { return Math.max(1, Math.ceil((total(c) - (Number(c.el) || 0)) / 60)); }
  function panelHtml(st) {
    const c = ST.cur, pk = ST.pick;
    const benchList = (st === 'idle' || st === 'paused') && ST.bench.length ? '<div class="uzcf-lab">Waiting on the bench</div>' + ST.bench.map((b, i) =>
      `<div class="uzcf-bench">${pieceIcon(b.craft, b.size, 'uzcf-ico')}<span>${esc(PIECE[b.craft][b.size])}, ${Math.floor((Number(b.el) || 0) / 60)} of ${MIN[b.size]} min done</span><button data-f="pick" data-v="${i}">Pick it up</button></div>`).join('') : '';
    const note = NOTE ? `<p class="uzcf-note">${esc(NOTE)}</p>` : '';
    if (st === 'idle') {
      return '<div class="uzcf-lab">How big is your task?</div><div class="uzcf-row">' +
        SIZES.map((s) => `<button class="uzcf-size${pk.size === s ? ' on' : ''}" data-f="size" data-v="${s}" aria-pressed="${pk.size === s}"><b>${s[0].toUpperCase() + s.slice(1)}</b><span>${MIN[s]} min</span><i>${PIECE[pk.craft][s]}</i></button>`).join('') + '</div>' +
        `<button class="uzcf-go" data-f="start">Start: ${MIN[pk.size]} min, ${esc(an(PIECE[pk.craft][pk.size]))}</button>` +
        '<p class="uzcf-hint">Ulhu works while you work. If you leave the app he waits for you, and nothing is lost.</p>' + benchList + note;
    }
    if (st === 'work') return '<button class="uzcf-soft" data-f="stop">Stop for now</button><p class="uzcf-hint">Stopping keeps the piece on his bench, half made. You can carry on later. Leaving the app pauses it too.</p>' + note;
    if (st === 'paused') {
      if (c.run) return '<p class="uzcf-hint">Paused while you were away. It carries on now you are back.</p>' + note;
      return '<button class="uzcf-go" data-f="resume">Carry on</button><button class="uzcf-soft" data-f="aside">Leave it on the bench, start something else</button>' +
        `<p class="uzcf-hint">${esc(an(PIECE[c.craft][c.size]))[0].toUpperCase() + esc(an(PIECE[c.craft][c.size])).slice(1)}, ${Math.floor((Number(c.el) || 0) / 60)} of ${MIN[c.size]} min done. It stays exactly as it is until you come back to it.</p>` + benchList + note;
    }
    return `<button class="uzcf-go" data-f="again">Make another</button><p class="uzcf-hint">${ST.owed.length ? 'Putting it on the shelf...' : 'It is on the shelf below.'}</p>` + note;
  }
  function timeHtml(st, c, craft, size) {
    if (st === 'fin') return `<b>Done</b><span>${MIN[size]} min focus. On the shelf now</span>`;
    if (st === 'idle') return `<b>${MIN[size]}</b><i>min</i><span>ready to make ${esc(an(PIECE[craft][size]))}</span>`;
    return `<b>${minsLeft(c)}</b><i>min left</i><span>${st === 'paused' && !c.run ? 'on the bench: ' : 'making '}${esc(an(PIECE[craft][size]))}</span>`;
  }
  function paint(full) {
    if (!V || !V.el.isConnected) return;
    const st = state(), c = ST.cur, craft = c ? c.craft : ST.pick.craft, size = c ? c.size : ST.pick.size;
    const p = c ? clamp((Number(c.el) || 0) / total(c) * 100, 0, 100) : 0;
    const key = craft + '|' + size;
    if (key !== V.key) {
      V.svg.innerHTML = knitStage();
      V.key = key; V.p = -1; V.state = '';
    }
    if (st !== V.state || Math.abs(p - V.p) >= 0.05) {
      knitUpdate(V.svg, size, p, st === 'work');
      V.p = p;
    }
    if (st !== V.state) { V.wrap.className = 'uzcf-sw uzcf-' + st; V.state = st; }
    V.time.innerHTML = timeHtml(st, c, craft, size);
    V.pz.innerHTML = c && c.run ? 'PAUSED<br>back when you are' : 'RESTING<br>carry on when you like';
    V.fintag.textContent = st === 'fin' ? 'Finished: ' + an(PIECE[craft][size]) : '';
    const ph = panelHtml(st);
    if (ph !== V.panelHtml) { V.panel.innerHTML = ph; V.panelHtml = ph; }
    const sk = JSON.stringify([SHELF, SHELF_ERR, ST.owed.length]);
    if (full || sk !== V.shelfKey) {
      V.shelfKey = sk;
      const n = SHELF ? SHELF.length : 0;
      V.shh.innerHTML = 'The shelf' + (SHELF ? `<small>${n ? n + (n === 1 ? ' piece' : ' pieces') + (n >= 40 ? ', the newest 40' : '') : 'empty so far'}</small>` : '');
      V.shelf.innerHTML = SHELF_ERR ? `<p class="uzcf-hint">${esc(SHELF_ERR)}</p>` : SHELF ? shelfSvg(SHELF, NEWEST) : '<p class="uzcf-hint">Opening the shelf...</p>';
    }
  }
  function frame(t) {
    if (!V || !V.el.isConnected) { if (V) V.raf = 0; return; }
    if (V.key.indexOf('knit') === 0) ballFrame(V.svg, V.p < 0 ? 0 : V.p, V.state === 'work', t);
    V.raf = root.requestAnimationFrame(frame);
  }
  function act(f, v) {
    const c = ST.cur;
    if (f === 'size' && MIN[v]) ST.pick.size = v;
    else if (f === 'start') { ST.cur = { craft: ST.pick.craft, size: ST.pick.size, el: 0, run: true, done: false, day: today() }; LAST = 0; NEWEST = false; }
    else if (f === 'stop' && c) { count(true); c.run = false; LAST = 0; }
    else if (f === 'resume' && c) { c.run = true; LAST = 0; }
    else if (f === 'aside' && c && !c.done) { ST.bench.unshift({ craft: c.craft, size: c.size, el: c.el, day: c.day }); ST.pick = { craft: c.craft, size: c.size }; ST.cur = null; }
    else if (f === 'pick') {
      const b = ST.bench.splice(Number(v), 1)[0]; if (!b) return;
      if (c && !c.done) ST.bench.unshift({ craft: c.craft, size: c.size, el: c.el, day: c.day });
      ST.cur = { craft: b.craft, size: b.size, el: Number(b.el) || 0, run: true, done: false, day: b.day || today() }; LAST = 0; NEWEST = false;
    } else if (f === 'again') { if (c) ST.pick = { craft: c.craft, size: c.size }; ST.cur = null; NEWEST = false; }
    else return;
    store(); paint();
  }
  function render(el, X) {
    XX = X || XX; css();
    el.innerHTML = '<div class="uzcf">' + DEFS +
      '<div class="uzcf-sw"><svg class="uzcf-stage" viewBox="0 0 380 330" role="img" aria-label="Ulhu at his craft"></svg><div class="uzcf-time"></div><div class="uzcf-pz"></div><div class="uzcf-fintag"></div></div>' +
      '<div class="uzcf-panel"></div><div class="uzcf-shh">The shelf</div><div class="uzcf-shelf"></div></div>';
    if (V && V.raf) root.cancelAnimationFrame(V.raf);
    V = { el, key: '', state: '', p: -1, panelHtml: '', shelfKey: '', raf: 0,
      svg: el.querySelector('.uzcf-stage'), wrap: el.querySelector('.uzcf-sw'), time: el.querySelector('.uzcf-time'), pz: el.querySelector('.uzcf-pz'),
      fintag: el.querySelector('.uzcf-fintag'), panel: el.querySelector('.uzcf-panel'), shh: el.querySelector('.uzcf-shh'), shelf: el.querySelector('.uzcf-shelf') };
    el.querySelector('.uzcf').addEventListener('click', function (e) {
      const b = e.target.closest && e.target.closest('button[data-f]'); if (!b) return;
      act(b.getAttribute('data-f'), b.getAttribute('data-v'));
    });
    paint(true); loadShelf(); saveOwed();
    V.raf = root.requestAnimationFrame(frame);
  }
  api.render = render;
  root.UZCOMP_FOCUS = api;
})(typeof window !== 'undefined' ? window : null);
