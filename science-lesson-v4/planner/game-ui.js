/* Ulhu's Rituals: the screen, shared by the planner (laptop) and the phone page.
   bundle.js pastes this file into both pages. GameUI.mount(element, call): call(name, ...args) runs a Game.gs
   function on the server and returns a promise (the pages already have one: run / call). All colours are set
   here so it looks the same in the planner's dark and light themes and on the phone.
   Redesign 2026-10-24 (Patryk's phone screenshots): three tabs you can swipe between (Habits | Rituals | Den),
   a slim header instead of the big room, ticks show at once and the server catches up, one quiet Undo line
   for the last thing tapped (no pop-ups), a coin instead of the Ð letter, deep-sea texture, and the Sunday
   review folded away at the bottom. */
(function (root) {
  const COIN = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='7.6' fill='%23a86f00'/%3E%3Ccircle cx='8' cy='7.6' r='6.6' fill='%23ffd60a'/%3E%3Ccircle cx='8' cy='7.6' r='4.9' fill='none' stroke='%23e8a400' stroke-width='.9'/%3E%3Cpath d='M5.7 6.6q2.3-2.6 4.6 0M6.6 7.4q-.2 2.2-1.2 2.9M8 7.6v3M9.4 7.4q.2 2.2 1.2 2.9' fill='none' stroke='%238a5a00' stroke-width='1' stroke-linecap='round'/%3E%3Ccircle cx='7.1' cy='6' r='.55' fill='%238a5a00'/%3E%3Ccircle cx='8.9' cy='6' r='.55' fill='%238a5a00'/%3E%3C/svg%3E";
  const WAVE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 6'%3E%3Cpath d='M0 3q3-3 6 0t6 0 6 0 6 0' fill='none' stroke='%23aae2be' stroke-opacity='.45' stroke-width='1.4'/%3E%3C/svg%3E";
  const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&display=swap');
.ul{--bg:#0b1530;--panel:#16244a;--panel2:#1d2f5c;--ink:#eef2ff;--mut:#97a8d4;--mint:#aae2be;--gold:#ffd60a;--red:#ef6a6a;--line:#2a3b72;--nec:#64b5f6;--ahead:#ffb74d;--ext:#ba68c8;--life:#81c784;--px:"Pixelify Sans",system-ui,sans-serif;
 color:var(--ink);font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;border-radius:18px;padding:10px 10px 18px;max-width:1000px;margin:0 auto;position:relative;overflow:hidden;
 background:radial-gradient(ellipse 90% 40% at 50% -6%,#24507a 0,transparent 70%),radial-gradient(circle at 50% 0,transparent 9px,rgba(170,226,190,.05) 10px,transparent 11px) 0 0/22px 12px,linear-gradient(#0e1a3c,#081027)}
.ul *{box-sizing:border-box}
.ul button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.ul textarea{min-height:0}
.ul-c{display:inline-block;width:1em;height:1em;background:url("${COIN}") center/contain no-repeat;vertical-align:-.14em}
.ul-panel{background:linear-gradient(#192a55,#14224a);border:1px solid rgba(170,226,190,.12);border-radius:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 2px 0 rgba(0,0,0,.3)}
/* header */
.ul-hud{display:flex;align-items:center;gap:10px;padding:8px 10px}
.ul-face{flex:none;width:56px;height:56px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#2f6b5c,#12304a);border:2px solid var(--mint);box-shadow:0 0 12px rgba(170,226,190,.35);overflow:hidden;display:flex;align-items:flex-end;justify-content:center}
.ul-face img{width:52px;height:52px;image-rendering:pixelated;image-rendering:crisp-edges}
.ul-hm{flex:1;min-width:0}
.ul-hr{display:flex;align-items:center;gap:8px}
.ul-coins{font:800 24px/1 system-ui,sans-serif;color:var(--gold);text-shadow:0 2px 0 #6b4a00;font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:6px}
.ul-lv{margin-left:auto;font:700 12px system-ui,sans-serif;color:var(--mint);border:1px solid var(--mint);border-radius:999px;padding:1px 9px}
.ul-say{font-size:12px;color:var(--mut);font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:2px 0 4px}
.ul-mini{display:flex;gap:6px}
.ul-mini div{flex:1;height:12px;border-radius:6px;background:#0a1430;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.06)}
.ul-mini i{position:absolute;left:0;top:0;bottom:0;border-radius:6px;transition:width .4s}
.ul-mini span{position:absolute;inset:0;font:700 9px/11px system-ui,sans-serif;text-align:center;letter-spacing:.04em}
.ul-mini .xp i{background:linear-gradient(90deg,#2f8f74,#7fe0b0)}.ul-mini .hp i{background:linear-gradient(90deg,#a53636,#ef6a6a)}
/* undo line and messages */
.ul-undo{display:flex;align-items:center;gap:8px;margin:6px 2px 0;font-size:13px;color:var(--mut);min-height:30px}
.ul-undo button{border:1px solid var(--line);background:transparent;border-radius:999px;padding:3px 12px;font-weight:700;color:var(--mint)}
.ul-undo .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ul-msg{background:#5b2b2b;border-radius:10px;padding:8px 10px;margin:6px 0}
/* tabs */
.ul-tabs{position:relative;display:flex;margin:8px 0 4px;background:#0a1430;border-radius:12px;padding:3px;border:1px solid rgba(170,226,190,.1)}
.ul-tabs button{flex:1;position:relative;z-index:1;background:none;border:0;padding:8px 0;font:700 14px var(--px);color:var(--mut);letter-spacing:.03em;transition:color .2s}
.ul-tabs button.on{color:#0b1f17}
.ul-tabs .ink{position:absolute;z-index:0;top:3px;bottom:3px;left:3px;width:calc((100% - 6px)/3);border-radius:9px;background:var(--mint);box-shadow:0 0 10px rgba(170,226,190,.4);transition:transform .25s cubic-bezier(.3,.7,.3,1)}
.ul-view{overflow:hidden}
.ul-track{display:flex;align-items:flex-start;transition:transform .28s cubic-bezier(.3,.7,.3,1)}
.ul-pane{flex:0 0 100%;min-width:0;padding:0 1px}
.ul.rest .ul-pane:not(.on){height:0;overflow:hidden}
/* sections */
.ul h3{display:flex;align-items:center;gap:8px;margin:16px 2px 6px;font:700 15px var(--px);letter-spacing:.06em;text-transform:uppercase;color:var(--mint)}
.ul h3:after{content:"";flex:1;height:6px;background:url("${WAVE}") repeat-x left center/24px 6px}
.ul h3 small{font:600 11px system-ui,sans-serif;color:var(--mut);text-transform:none;letter-spacing:0}
/* ritual rows */
.ul-row{display:flex;align-items:center;gap:10px;padding:8px 10px 8px 12px;margin:6px 0;min-height:54px;position:relative;overflow:hidden;transition:opacity .2s}
.ul-row:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--k,var(--nec))}
.ul-row.nec{--k:var(--nec)}.ul-row.ahead{--k:var(--ahead)}.ul-row.external{--k:var(--ext)}.ul-row.life{--k:var(--life)}.ul-row.habit{--k:var(--red)}
.ul-row.done{opacity:.55}.ul-row.done .nm b{text-decoration:line-through}
.ul-tick{flex:none;width:40px;height:40px;border-radius:50%;border:2.5px solid var(--mint);background:rgba(170,226,190,.06);font-size:20px;line-height:1;color:#0b1f17;font-weight:800;transition:transform .12s,background .15s}
.ul-tick:active{transform:scale(.88)}
.ul-row.done .ul-tick,.st.done .ul-tick{background:var(--mint)}
.ul-tick.bad{border-color:var(--red);color:var(--red);background:rgba(239,106,106,.08)}
.ul-row .nm{flex:1;min-width:0;overflow-wrap:anywhere}.ul-row .nm b{font-weight:650}
.ul-row small,.ul-boss small{display:block;color:var(--mut);font-weight:400;font-size:12px}
.ul-pay{flex:none;display:flex;align-items:center;gap:4px;color:var(--gold);font:800 16px system-ui,sans-serif;font-variant-numeric:tabular-nums}
.ul-pay.hp{color:var(--red)}
.ul-row.just .ul-pay{animation:ulpay .7s ease-out}
@keyframes ulpay{0%{transform:scale(1)}30%{transform:scale(1.45) translateY(-4px)}100%{transform:none}}
.ul-auto{flex:none;font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;background:rgba(255,183,77,.12);color:var(--ahead)}
.ul-x{flex:none;background:transparent;border:0;color:var(--mut);font-size:13px;padding:4px 6px;font-weight:700}
.ul-x.sure{color:var(--red)}
/* this term: two-column cards with one button per sitting */
.ul-terms{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.ul-term{padding:8px 10px}.ul-term b{font-weight:650;font-size:14px}
.ul-term .sits{display:flex;gap:5px;margin-top:6px}
.ul-term .sits button{flex:1;border:1.5px solid var(--mint);background:transparent;border-radius:8px;padding:5px 0;font-size:12px;font-weight:700;color:var(--mint)}
.ul-term .sits button.on{background:var(--mint);color:#0b1f17}
.ul-term.done{opacity:.55}
/* bosses */
.ul-boss{padding:10px;margin:6px 0}
.ul-bh{display:flex;align-items:center;gap:10px}
.ul-eye{flex:none;width:44px;height:44px}
.ul-bh .nm{flex:1;min-width:0}.ul-bh .nm b{font:700 16px var(--px)}
.ul-hpb{height:10px;border-radius:5px;background:#0a1430;overflow:hidden;margin-top:4px}.ul-hpb i{display:block;height:100%;background:linear-gradient(90deg,#7a1f3d,#ef6a6a);transition:width .4s}
.ul-boss .st{display:flex;align-items:center;gap:10px;padding:6px 0 0}
.ul-boss .st .ul-tick{width:32px;height:32px;font-size:16px}
.ul-boss .st .nm{flex:1}.ul-boss .st.done .nm{text-decoration:line-through;opacity:.6}.ul-boss .od{color:var(--red);font-size:12px;font-weight:700}
.ul-boss.beaten{opacity:.7}
/* buttons and forms */
.ul-btn{background:var(--panel2);border:1.5px solid var(--line);border-radius:10px;padding:8px 12px;font-weight:700}
.ul-btn.go{background:var(--mint);border-color:var(--mint);color:#10301f}
.ul-btn.on{border-color:var(--mint);color:var(--mint)}
.ul-bar2{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 0}
.ul-form{padding:10px;margin:6px 0}
.ul-form input[type=text],.ul-form textarea,.ul-rv textarea,.ul-rv input{width:100%;background:#0a1430;border:1.5px solid var(--line);color:var(--ink);border-radius:8px;padding:8px;font:inherit;margin:3px 0}
.ul-grp{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 2px}
.ul-grp b{width:100%;font-size:12px;color:var(--mut);font-weight:600}
.ul-note{color:var(--mut);font-size:12px;margin:6px 2px}
.ul-rv{margin:14px 0 0;padding:0}
.ul-rv summary{list-style:none;cursor:pointer;padding:12px;display:flex;align-items:center;gap:8px;font-weight:700}
.ul-rv summary::-webkit-details-marker{display:none}
.ul-rv summary span{margin-left:auto;color:var(--gold);display:flex;align-items:center;gap:4px}
.ul-rv .in{padding:0 12px 12px}
/* den: room + shop */
.ul-room{position:relative;border-radius:14px;overflow:hidden;height:210px;background:linear-gradient(#26366f,#1b2756)}
.ul-room img{position:absolute;left:50%;bottom:20px;width:128px;margin-left:-64px;image-rendering:pixelated}
.ul-scene{position:relative;width:100%;background:#0a1124;border-radius:14px;overflow:hidden}
.ul-scene img{position:absolute;image-rendering:pixelated;image-rendering:crisp-edges}
.ul-cats{display:flex;gap:6px;overflow-x:auto;margin:10px 0 8px;padding-bottom:2px;scrollbar-width:none}
.ul-cats .ul-btn{flex:none;padding:6px 11px;font-size:13px}
.ul-shop{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.ul-card{padding:8px;display:flex;flex-direction:column;gap:6px}
.ul-card.own{border-color:#3f7c6a}.ul-card.lock{opacity:.6}
.ul-card .pv{height:92px;background:#0a1124;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.ul-card .pv img{image-rendering:pixelated;image-rendering:crisp-edges;max-width:100%;max-height:100%}
.ul-card b{font-size:13px}.ul-card small{color:var(--mut);font-size:11px}
.ul-tier{font-size:11px;font-weight:700;border-radius:999px;padding:1px 7px;background:var(--panel2);align-self:flex-start;display:flex;align-items:center;gap:3px}
.ul-tier.Basic{color:#c8cdd9}.ul-tier.Nice{color:#8fe0b4}.ul-tier.Fancy{color:#ffd60a}.ul-tier.Eldritch{color:#aae2be;box-shadow:0 0 6px #aae2be88}
@media(prefers-reduced-motion:no-preference){.ul-face img{animation:ulbob 3.2s ease-in-out infinite}@keyframes ulbob{50%{transform:translateY(-3px)}}}
@media(prefers-reduced-motion:reduce){.ul-track,.ul-tabs .ink{transition:none}}
`;
  const SAY = { idle: 'Ulhu is waiting for a ritual.', happy: 'Ulhu approves.', proud: 'Ulhu is proud of you.', sad: 'Ulhu is hurt. Rest, then try again.', sleepy: 'Ulhu is dozing.' };
  const KIND = { necessary: ['Necessary', 'nec'], ahead: ['Ahead', 'ahead'], external: ['Outside work', 'external'], life: ['Life', 'life'] };
  const TABS = [['habits', 'Habits'], ['rituals', 'Rituals'], ['den', 'Den']];
  const C = '<i class="ul-c" aria-label="coins"></i>';
  const nice = (iso) => { const p = String(iso).split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // the boss: an eldritch eye that closes as its health drops
  const eye = (pct) => '<svg class="ul-eye" viewBox="0 0 44 44"><defs><radialGradient id="ulg" cx=".5" cy=".45"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#c0392b"/></radialGradient></defs>' +
    '<path d="M3 22Q22 2 41 22Q22 42 3 22Z" fill="#2a0f22" stroke="#ef6a6a" stroke-width="2"/><ellipse cx="22" cy="22" rx="10" ry="10" fill="url(#ulg)"/><ellipse cx="22" cy="22" rx="2.6" ry="8" fill="#14040c"/>' +
    '<path d="M3 22Q22 2 41 22Q22 ' + (2 + 40 * (100 - pct) / 100).toFixed(1) + ' 3 22Z" fill="#3b1530" stroke="#ef6a6a" stroke-width="1.2"/></svg>';

  function mount(el, call, opts) {
    if (!document.getElementById('ul-css')) { const st = document.createElement('style'); st.id = 'ul-css'; st.textContent = CSS; document.head.appendChild(st); }
    const S = { tab: 'rituals', bossOpen: false, boss: { name: '', text: '' }, rv: {}, d: null, art: null, shop: null, cat: 'floors', err: '', undo: null, just: '', seq: 0, edit: false, add: false, f: { name: '', minutes: 15, track: 'necessary', when: 'daily', n: 3 } };
    el.innerHTML = '<div class="ul rest' + (opts && opts.wide ? ' wide' : '') + '"><p class="ul-note">Waking Ulhu...</p></div>';
    const box = el.firstChild;
    // every server call: the newest reply wins, an older one that arrives late is ignored
    const run = (fn, ...a) => { const my = ++S.seq; return call(fn, ...a).then((d) => { if (!d) throw new Error('The planner sent nothing back. Reload, and if it keeps happening paste Game.gs again and deploy a new version.'); if (my !== S.seq) return d; const old = S.d; S.d = d; S.err = ''; const t = toastFor(d); if (t) S.undo = S.undo && S.undo.fn ? { text: S.undo.text + ' · ' + t, fn: S.undo.fn } : { text: t }; paint(); return { d, old }; }).catch((e) => { if (my === S.seq) { S.err = String((e && e.message) || e).replace(/^Error:\s*/, ''); paint(); } }); };
    function toastFor(d) {
      const l = d.last; let t = '';
      if (d.auto && d.auto.length) t = d.auto.map((a) => 'Ticked for you: ' + a.name + ' (+' + a.coins + ')').join('. ');
      if (d.boss && d.boss.beaten) t = 'Boss beaten: ' + d.boss.name + '! +' + d.boss.coins + (d.boss.up ? '. Level up!' : '');
      if (d.reviewPaid) t = 'Review saved: +' + d.reviewPaid + '.';
      if (l && l.died) t = 'Ulhu fainted. Level ' + l.died.level + ', and ' + l.died.lost + ' coins lost. Full health again.';
      if (l && l.up) t = 'Level up!';
      return t;
    }
    // the last thing tapped can be undone from one quiet line under the header (Patryk 2026-10-24)
    const undoable = (text, fn) => { S.undo = { text, fn }; };
    const pay = (min, track) => Math.round(((S.d.table.base[min] || 6) * (S.d.table.mult[track] || 1)));
    const CATS = [['floors', 'Floors'], ['wallpapers', 'Walls'], ['rugs', 'Rugs'], ['windows', 'Windows'], ['lights', 'Lights'], ['corner', 'Corner'], ['seats', 'Seats'], ['tables', 'Tables'], ['wall', 'Hangings'], ['props', 'Props']];
    const SLOTN = { hang3: 'left wall', hang4: 'right wall' };
    const goal = (id) => S.d.goals.find((g) => g.id === id);

    function room(d) {
      const A = S.art, me = d.art[d.mood] || d.art.idle || '';
      if (!A) return '<div class="ul-room"><img alt="Ulhu" src="' + me + '"></div>';
      const put = (l) => '<img alt="" src="' + l.art + '" style="left:' + (100 * l.ox / A.w) + '%;top:' + (100 * l.oy / A.h) + '%;width:' + (100 * l.w / A.w) + '%">';
      const slots = Object.keys(d.room || {}).filter((sl) => d.room[sl] && A.art[d.room[sl]] && A.art[d.room[sl]][sl]).sort((a, b) => (A.z[a] || 0) - (A.z[b] || 0));
      const u = '<img alt="Ulhu" src="' + me + '" style="left:' + (100 * A.ulhu.x / A.w) + '%;top:' + (100 * A.ulhu.y / A.h) + '%;width:' + (100 * 32 / A.w) + '%">';
      let h = '<div class="ul-scene" style="aspect-ratio:' + A.w + '/' + A.h + '">', done = false;
      slots.forEach((sl) => { if (!done && (A.z[sl] || 0) > 6) { h += u; done = true; } h += put(A.art[d.room[sl]][sl]); });
      return h + (done ? '' : u) + '</div>';
    }
    function den() {
      const d = S.d, sh = S.shop;
      let h = room(d);
      if (!sh) return h + '<p class="ul-note">Opening the shop...</p>';
      const A = S.art, items = sh.items.filter((i) => i.category === S.cat);
      h += '<div class="ul-cats">' + CATS.map((c) => '<button class="ul-btn' + (S.cat === c[0] ? ' on' : '') + '" data-act="cat" data-v="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>';
      return h + '<div class="ul-shop">' + items.map((i) => {
        const L = A && A.art[i.id] && A.art[i.id][i.slots[0]], z = L ? Math.max(1, Math.min(4, Math.floor(80 / Math.max(L.w, L.h)))) : 1;
        const placed = i.slot ? 'In the room' + (SLOTN[i.slot] ? ' (' + SLOTN[i.slot] + ')' : '') : 'In the drawer';
        let btn;
        if (i.own) btn = i.slot ? '<button class="ul-btn" data-act="unplace" data-id="' + i.id + '">Take out</button>' : i.slots.map((sl) => '<button class="ul-btn go" data-act="place" data-id="' + i.id + '" data-v="' + sl + '">Place' + (SLOTN[sl] ? ' ' + SLOTN[sl] : '') + '</button>').join('');
        else if (i.locked) btn = '<small>Locked: ' + esc(i.why) + '</small>';
        else btn = '<button class="ul-btn go" data-act="buy" data-id="' + i.id + '"' + (sh.coins < i.price ? ' disabled style="opacity:.5"' : '') + '>Buy ' + i.price + ' ' + C + '</button>';
        return '<div class="ul-card ul-panel' + (i.own ? ' own' : '') + (i.locked && !i.own ? ' lock' : '') + '"><div class="pv">' + (L ? '<img alt="" src="' + L.art + '" style="width:' + (L.w * z) + 'px">' : '') + '</div><b>' + esc(i.name) + '</b>' +
          '<span class="ul-tier ' + i.tier + '">' + i.tier + (i.price ? ' · ' + i.price + ' ' + C : ' · free') + '</span>' + (i.own ? '<small>' + placed + '</small>' : '') + btn + '</div>';
      }).join('') + '</div>';
    }
    const dayPlus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    function bossCard(b) {
      const beaten = b.status === 'beaten', pct = Math.round(100 * b.hp / b.maxHp);
      return '<div class="ul-boss ul-panel' + (beaten ? ' beaten' : '') + '"><div class="ul-bh">' + eye(pct) + '<div class="nm"><b>' + esc(b.name) + '</b>' +
        '<small>' + (beaten ? 'Beaten! +' + b.reward + ' ' + C + ' · ' + esc(b.trophy) : 'Boss health ' + b.hp + ' / ' + b.maxHp) + '</small><div class="ul-hpb"><i style="width:' + pct + '%"></i></div></div>' +
        (beaten ? '' : '<button class="ul-x" data-act="bdel" data-id="' + b.id + '" aria-label="Remove this boss">Remove</button>') + '</div>' +
        b.stages.map((x) => '<div class="st' + (x.done ? ' done' : '') + '"><button class="ul-tick" data-act="bstage" data-id="' + b.id + '" data-v="' + x.i + '" data-on="' + (x.done ? '0' : '1') + '"' + (beaten ? ' disabled' : '') + '>' + (x.done ? '&#10003;' : '') + '</button><div class="nm">' + esc(x.name) +
          '<small>' + (x.due ? 'by ' + esc(nice(x.due)) : '') + (x.late ? ' · done late (half damage)' : '') + '</small></div>' + (x.overdue ? '<span class="od">overdue</span>' : '') + '</div>').join('') + '</div>';
    }
    function bossForm() {
      const f = S.boss;
      return '<div class="ul-form ul-panel"><input type="text" id="ul-bname" placeholder="The big job (e.g. Mark 10S2 test)" value="' + esc(f.name) + '" maxlength="80">' +
        '<textarea id="ul-bstages" rows="4" placeholder="One stage per line: name | yyyy-mm-dd">' + esc(f.text) + '</textarea>' +
        '<div class="ul-grp"><button class="ul-btn" data-act="bpreset">Marking template</button><button class="ul-btn go" data-act="bsave">Start the boss</button><button class="ul-btn" data-act="bcancel">Cancel</button></div>' +
        '<p class="ul-note">Each stage deals equal damage. Late stages deal half. Beating it pays 200 ' + C + '.</p></div>';
    }
    function reviewCard(rv) {
      const st = rv.stats, v = rv.saved || S.rv;
      const ta = (id, label, val) => '<label class="ul-note">' + label + '<textarea id="' + id + '" rows="2" maxlength="400">' + esc(val || '') + '</textarea></label>';
      return '<details class="ul-rv ul-panel"' + (S.rvOpen ? ' open' : '') + '><summary data-act="rvopen">Sunday review' + (rv.saved ? ' (saved)' : '') + '<span>' + (rv.saved ? '' : '+20 ' + C) + '</span></summary><div class="in">' +
        '<p class="ul-note">Week of ' + esc(nice(rv.week)) + ': ' + st.ticks + ' ticks, ' + st.coins + ' ' + C + ' earned (' + st.necessary + ' necessary, ' + st.ahead + ' ahead, ' + st.outside + ' outside work, ' + st.life + ' life)' + (st.stages ? ', ' + st.stages + ' boss stages' : '') + '.</p>' +
        ta('ul-rv1', 'What went well', v.wentWell) + ta('ul-rv2', 'What slipped', v.slipped) +
        '<label class="ul-note">Next week, three priorities<input id="ul-rp1" type="text" placeholder="1" value="' + esc(v.p1 || '') + '"><input id="ul-rp2" type="text" placeholder="2" value="' + esc(v.p2 || '') + '"><input id="ul-rp3" type="text" placeholder="3" value="' + esc(v.p3 || '') + '"></label>' +
        '<button class="ul-btn go" data-act="rvsave" data-v="' + esc(rv.week) + '">' + (rv.saved ? 'Update the review' : 'Save the review') + '</button></div></details>';
    }
    const xBtn = (g) => S.edit ? '<button class="ul-x" data-act="arch" data-id="' + g.id + '" aria-label="Archive">Archive</button>' : '';
    function row(g) {
      const k = KIND[g.track] || KIND.necessary, just = S.just === g.id ? ' just' : '';
      if (g.kind === 'habit') {
        const minus = g.polarity === 'minus' || g.polarity === 'both', plus = g.polarity === 'plus' || g.polarity === 'both';
        return '<div class="ul-row ul-panel habit' + just + '"><div class="nm"><b>' + esc(g.name) + '</b><small>' + g.minutes + ' min · costs health, never coins</small></div>' +
          (plus ? '<button class="ul-tick" data-act="tick" data-id="' + g.id + '" aria-label="Did it: ' + esc(g.name) + '">+</button>' : '') +
          (minus ? '<span class="ul-pay hp">&minus;' + g.hpLoss + ' HP</span><button class="ul-tick bad" data-act="bad" data-id="' + g.id + '" aria-label="Slipped: ' + esc(g.name) + '">&minus;</button>' : '') + xBtn(g) + '</div>';
      }
      const note = [g.minutes + ' min', k[0]].concat(g.streak ? ['streak ' + g.streak] : [], g.kind === 'daily' && g.everyN ? ['every ' + g.everyN + ' days'] : [], g.auto ? ['ticks itself'] : []).join(' · ');
      return '<div class="ul-row ul-panel ' + k[1] + (g.doneToday ? ' done' : '') + just + '"><button class="ul-tick" data-act="' + (g.doneToday ? 'untick' : 'tick') + '" data-id="' + g.id + '" aria-label="' + esc(g.name) + '">' + (g.doneToday ? '&#10003;' : '') + '</button>' +
        '<div class="nm"><b>' + esc(g.name) + '</b><small>' + esc(note) + '</small></div><span class="ul-pay">+' + g.pay + ' ' + C + '</span>' + xBtn(g) + '</div>';
    }
    // "Sitting" was unclear (2026-10-24): one button per half of the marking, filled when done
    function termly(g) {
      const done = g.sitDone >= g.sittings, n = Number(g.sittings) || 1;
      const lab = (i) => n === 1 ? 'Marked' : n === 2 ? (i ? '2nd half' : '1st half') : 'Part ' + (i + 1);
      const btns = []; for (let i = 0; i < n; i++) {
        const on = i < g.sitDone, act = on ? (i === g.sitDone - 1 ? 'untick' : '') : (i === g.sitDone ? 'tick' : '');
        btns.push('<button class="' + (on ? 'on' : '') + '"' + (act ? ' data-act="' + act + '" data-id="' + g.id + '"' : ' disabled') + '>' + (on ? '&#10003; ' : '') + lab(i) + '</button>');
      }
      return '<div class="ul-term ul-panel' + (done ? ' done' : '') + (S.just === g.id ? ' just' : '') + '"><b>' + esc(g.name.replace(/^Mark /, '')) + '</b>' + (done ? '' : ' <small style="color:var(--gold)">+' + g.pay + ' ' + C + ' each</small>') + '<div class="sits">' + btns.join('') + '</div>' + xBtn(g) + '</div>';
    }
    function form(habit) {
      const f = S.f, chip = (grp, v, label, on) => '<button class="ul-btn' + (on ? ' on' : '') + '" data-act="f" data-g="' + grp + '" data-v="' + v + '">' + label + '</button>';
      const p = f.when === 'habit' ? '' : ' (+' + pay(f.minutes, f.track) + ' ' + C + ')';
      return '<div class="ul-form ul-panel"><input type="text" id="ul-name" placeholder="' + (habit ? 'The bad habit' : 'What is the ritual?') + '" value="' + esc(f.name) + '" maxlength="80">' +
        '<div class="ul-grp"><b>How long' + p + '</b>' + [5, 15, 30, 60, 120].map((m) => chip('minutes', m, m === 120 ? '120+' : m, f.minutes === m)).join('') + '</div>' +
        (habit ? '' : '<div class="ul-grp"><b>What kind</b>' + Object.keys(KIND).map((t) => chip('track', t, KIND[t][0], f.track === t)).join('') + '</div>' +
        '<div class="ul-grp"><b>When</b>' + chip('when', 'daily', 'Every school day', f.when === 'daily') + chip('when', 'todo', 'Once', f.when === 'todo') + chip('when', 'every', 'Every few days', f.when === 'every') + '</div>' +
        (f.when === 'every' ? '<div class="ul-grp"><b>Every how many days</b>' + [2, 3, 7, 14].map((n) => chip('n', n, n, f.n === n)).join('') + '</div>' : '')) +
        '<div class="ul-grp"><button class="ul-btn go" data-act="save">Add</button><button class="ul-btn" data-act="cancel">Cancel</button></div></div>';
    }
    function hud(d) {
      const p = d.player;
      return '<div class="ul-hud ul-panel"><div class="ul-face"><img alt="Ulhu" src="' + (d.art[d.mood] || d.art.idle || '') + '"></div><div class="ul-hm">' +
        '<div class="ul-hr"><span class="ul-coins">' + C + p.coins + '</span><span class="ul-lv">Lv ' + p.level + '</span></div>' +
        '<div class="ul-say">' + esc(SAY[d.mood] || '') + (d.frozen ? ' Today is off: nothing resets.' : '') + '</div>' +
        '<div class="ul-mini"><div class="xp"><i style="width:' + Math.min(100, Math.round(100 * p.xp / p.need)) + '%"></i><span>XP ' + p.xp + '/' + p.need + '</span></div>' +
        '<div class="hp"><i style="width:' + Math.round(100 * p.hp / p.maxHp) + '%"></i><span>HP ' + p.hp + '/' + p.maxHp + '</span></div></div></div></div>' +
        (S.err ? '<div class="ul-msg">' + esc(S.err) + '</div>' : '') +
        '<div class="ul-undo"><span class="t">' + (S.undo ? esc(S.undo.text) : 'Tap a circle to tick. Swipe for habits and the den.') + '</span>' + (S.undo && S.undo.fn ? '<button data-act="undo">&#8630; Undo</button>' : '') + '</div>';
    }
    function rituals(d) {
      const today = d.goals.filter((g) => g.kind !== 'termly' && g.kind !== 'habit' && g.dueToday);
      const tg = d.goals.filter((g) => g.kind === 'termly' && g.dueToday), left = tg.map((g) => g.daysLeft).filter((x) => x != null);
      let h = '<h3>Today</h3>' + (today.length ? today.map(row).join('') : '<p class="ul-note">Nothing due today.</p>');
      if (d.summoned && d.summoned.length) h += '<h3>Summoned <small>tick themselves when built</small></h3>' + d.summoned.map((s) => '<div class="ul-row ul-panel ' + (s.ahead ? 'ahead' : 'nec') + '"><div class="nm"><b>' + esc(s.name) + '</b><small>lesson ' + esc(nice(s.date)) + '</small></div><span class="ul-auto">' + (s.ahead ? 'ahead' : 'due') + '</span></div>').join('');
      const bosses = (d.bosses || []);
      h += '<h3>Boss fights</h3>' + (bosses.map(bossCard).join('') || '<p class="ul-note">No boss yet. Split a big job into stages.</p>') + (S.bossOpen ? bossForm() : '');
      if (tg.length) h += '<h3>Book marking <small>' + (left.length ? Math.min.apply(null, left) + ' days left' : '') + '</small></h3><div class="ul-terms">' + tg.map(termly).join('') + '</div>';
      if (d.review && d.review.show) h += reviewCard(d.review);
      h += S.add && !S.addHabit ? form(false) : '';
      h += '<div class="ul-bar2">' + (S.add ? '' : '<button class="ul-btn go" data-act="add">+ Ritual</button>') + (S.bossOpen ? '' : '<button class="ul-btn" data-act="bopen">+ Boss</button>') +
        '<button class="ul-btn' + (S.edit ? ' on' : '') + '" data-act="edit">' + (S.edit ? 'Done editing' : 'Edit') + '</button></div>';
      return h;
    }
    function habits(d) {
      const hb = d.goals.filter((g) => g.kind === 'habit');
      let h = '<h3>Bad habits</h3>' + (hb.length ? hb.map(row).join('') : '<p class="ul-note">None yet.</p>');
      h += S.add && S.addHabit ? form(true) : '';
      h += '<div class="ul-bar2">' + (S.add ? '' : '<button class="ul-btn go" data-act="addh">+ Bad habit</button>') + '<button class="ul-btn' + (S.edit ? ' on' : '') + '" data-act="edit">' + (S.edit ? 'Done editing' : 'Edit') + '</button></div>';
      h += '<h3>Days off</h3><button class="ul-btn' + (d.frozen ? ' on' : '') + '" data-act="off">' + (d.frozen ? 'Today is off (tap to undo)' : 'Sick or off today') + '</button>' +
        '<p class="ul-note">A day off freezes everything: streaks keep, nothing is missed. Holidays and INSET are off on their own.</p>' +
        '<p class="ul-note">Ticks pay coins and XP by length and kind. A bad habit costs health, never coins. Late work is never penalised.</p>';
      return h;
    }
    function paint() {
      const d = S.d; if (!d) { box.innerHTML = '<p class="ul-note">' + (S.err ? esc(S.err) : 'Waking Ulhu...') + '</p>'; return; }
      const ti = TABS.findIndex((t) => t[0] === S.tab), y = window.scrollY;
      const focus = document.activeElement && box.contains(document.activeElement) && document.activeElement.id;
      box.innerHTML = hud(d) +
        '<div class="ul-tabs">' + TABS.map((t) => '<button class="' + (t[0] === S.tab ? 'on' : '') + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '<span class="ink" style="transform:translateX(' + (ti * 100) + '%)"></span></div>' +
        '<div class="ul-view"><div class="ul-track" style="transform:translateX(' + (-ti * 100) + '%)">' +
        '<div class="ul-pane' + (ti === 0 ? ' on' : '') + '">' + habits(d) + '</div><div class="ul-pane' + (ti === 1 ? ' on' : '') + '">' + rituals(d) + '</div><div class="ul-pane' + (ti === 2 ? ' on' : '') + '">' + den() + '</div></div></div>';
      if (focus && document.getElementById(focus)) document.getElementById(focus).focus();
      if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
    }
    function goTab(t) {
      if (t === S.tab || !TABS.some((x) => x[0] === t)) return;
      const from = TABS.findIndex((x) => x[0] === S.tab), to = TABS.findIndex((x) => x[0] === t);
      S.tab = t; box.classList.remove('rest');
      box.querySelectorAll('.ul-pane').forEach((p, i) => p.classList.toggle('on', i === to));
      box.querySelectorAll('.ul-tabs button').forEach((b, i) => b.classList.toggle('on', i === to));
      const ink = box.querySelector('.ul-tabs .ink'), tr = box.querySelector('.ul-track');
      if (ink) ink.style.transform = 'translateX(' + (to * 100) + '%)';
      if (tr) tr.style.transform = 'translateX(' + (-to * 100) + '%)';
      clearTimeout(S.restT); S.restT = setTimeout(() => box.classList.add('rest'), 300);
      if (t === 'den' && !S.shop) shopLoad();
      if (from !== to && opts && !opts.wide) { const top = box.getBoundingClientRect().top + window.scrollY - 8; if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' }); }
    }
    // swipe left / right between the tabs (not while typing, not on the shop's category strip)
    let sx = null, sy = 0;
    box.addEventListener('touchstart', (e) => { const t = e.target; sx = /INPUT|TEXTAREA/.test(t.tagName) || t.closest('.ul-cats') ? null : e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    box.addEventListener('touchend', (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < 1.6 * Math.abs(dy)) return;
      const i = TABS.findIndex((x) => x[0] === S.tab) + (dx < 0 ? 1 : -1);
      if (TABS[i]) goTab(TABS[i][0]);
    }, { passive: true });

    // instant on screen, then the server: patch the numbers here, paint, and let the reply put the real ones in
    function quick(id, patch) { patch(); S.just = id; paint(); setTimeout(() => { if (S.just === id) S.just = ''; }, 800); }
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
      const a = b.dataset.act, id = b.dataset.id, f = S.f, d = S.d;
      if (a === 'tab') return goTab(b.dataset.v);
      if (a === 'undo') { const u = S.undo; S.undo = null; paint(); return u && u.fn ? u.fn() : null; }
      if (a === 'cat') { S.cat = b.dataset.v; return paint(); }
      if (a === 'buy') return act('gameBuy', id);
      if (a === 'place') return act('gamePlace', id, b.dataset.v);
      if (a === 'unplace') return act('gamePlace', id, '');
      if (a === 'bopen') { S.bossOpen = true; return paint(); }
      if (a === 'bcancel') { S.bossOpen = false; return paint(); }
      if (a === 'bpreset') { S.boss.name = (document.getElementById('ul-bname') || {}).value || ''; S.boss.text = 'Half marked | ' + dayPlus(2) + '\nThe rest marked | ' + dayPlus(5) + '\nSection scores summed | ' + dayPlus(7) + '\nEntered on the system | ' + dayPlus(9); return paint(); }
      if (a === 'bsave') {
        const name = document.getElementById('ul-bname').value, text = document.getElementById('ul-bstages').value;
        const stages = text.split('\n').map((l) => l.split('|')).map((p) => ({ name: (p[0] || '').trim(), due: (p[1] || '').trim() })).filter((x) => x.name);
        S.bossOpen = false; S.boss = { name: '', text: '' };
        const before = (d.bosses || []).map((x) => x.id);
        return run('gameBossStart', { name, stages }).then((r) => {
          const nb = r && r.d && (r.d.bosses || []).find((x) => before.indexOf(x.id) < 0);
          if (nb) { undoable('Boss started: ' + nb.name, () => run('gameBossRemove', nb.id)); paint(); }
        });
      }
      if (a === 'bdel') {
        if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'Remove?'; return; }
        const bo = d.bosses.find((x) => x.id === id);
        quick(id, () => { d.bosses = d.bosses.filter((x) => x.id !== id); undoable('Removed: ' + (bo ? bo.name : 'boss'), () => run('gameBossRemove', id, true)); });
        return run('gameBossRemove', id);
      }
      if (a === 'bstage') {
        const on = b.dataset.on === '1', i = Number(b.dataset.v), bo = d.bosses.find((x) => x.id === id), st = bo && bo.stages[i];
        if (st) quick(id, () => { st.done = on ? 'now' : ''; undoable((on ? 'Hit: ' : 'Unticked: ') + st.name, () => run('gameBossStage', id, i, !on)); });
        return run('gameBossStage', id, i, on);
      }
      if (a === 'rvopen') { S.rvOpen = !b.parentNode.open; return; }
      if (a === 'rvsave') { const g = (x) => (document.getElementById(x) || {}).value || ''; S.rv = { wentWell: g('ul-rv1'), slipped: g('ul-rv2'), p1: g('ul-rp1'), p2: g('ul-rp2'), p3: g('ul-rp3') }; S.rvOpen = false; return run('gameReview', Object.assign({ week: b.dataset.v }, S.rv)); }
      if (a === 'tick' || a === 'bad' || a === 'untick') {
        const g = goal(id); if (!g) return;
        quick(id, () => {
          const p = d.player;
          if (a === 'bad') { p.hp = Math.max(1, p.hp - (g.hpLoss || 0)); undoable('Slipped: ' + g.name + ' (−' + g.hpLoss + ' HP)', () => run('gameUntick', id)); }
          else if (g.kind === 'termly') { g.sitDone = Math.max(0, (Number(g.sitDone) || 0) + (a === 'tick' ? 1 : -1)); p.coins += a === 'tick' ? g.pay : -g.pay; undoable((a === 'tick' ? 'Marked: ' : 'Unmarked: ') + g.name, () => run(a === 'tick' ? 'gameUntick' : 'gameTick', id, 1)); }
          else if (g.kind === 'habit') { undoable('Did it: ' + g.name, () => run('gameUntick', id)); }
          else { g.doneToday = a === 'tick'; p.coins = Math.max(0, p.coins + (a === 'tick' ? g.pay : -g.pay)); undoable((a === 'tick' ? 'Ticked: ' : 'Unticked: ') + g.name + (a === 'tick' ? ' (+' + g.pay + ')' : ''), () => run(a === 'tick' ? 'gameUntick' : 'gameTick', id, 1)); }
        });
        return a === 'untick' ? run('gameUntick', id) : run('gameTick', id, a === 'bad' ? -1 : 1);
      }
      if (a === 'arch') {
        if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'Archive?'; return; }
        const g = goal(id); undoable('Archived: ' + (g ? g.name : ''), () => run('gameArchive', id, true));
        return run('gameArchive', id);
      }
      if (a === 'edit') { S.edit = !S.edit; return paint(); }
      if (a === 'add' || a === 'addh') { S.add = true; S.addHabit = a === 'addh'; if (S.addHabit) S.f.when = 'habit'; return paint(); }
      if (a === 'cancel') { S.add = false; S.f = { name: '', minutes: 15, track: 'necessary', when: 'daily', n: 3 }; return paint(); }
      if (a === 'off') { const on = !d.frozen; undoable(on ? 'Today is off' : 'Today is back on', () => run('gameFreeze', d.today, 'off', !on)); return run('gameFreeze', d.today, 'off', on); }
      if (a === 'f') { const nm = document.getElementById('ul-name'); if (nm) f.name = nm.value; f[b.dataset.g] = isNaN(b.dataset.v) ? b.dataset.v : Number(b.dataset.v); return paint(); }
      if (a === 'save') {
        const nm = document.getElementById('ul-name'); if (nm) f.name = nm.value;
        const g = { name: f.name, minutes: f.minutes, track: f.track, kind: f.when === 'daily' || f.when === 'every' ? 'daily' : f.when, days: f.when === 'daily' ? '12345' : '', everyN: f.when === 'every' ? f.n : '', polarity: f.when === 'habit' ? 'minus' : 'plus' };
        S.add = false; S.f = { name: '', minutes: 15, track: 'necessary', when: 'daily', n: 3 };
        const before = d.goals.map((x) => x.id);
        return run('gameSaveGoal', g).then((r) => {
          const ng = r && r.d && r.d.goals.find((x) => before.indexOf(x.id) < 0);
          if (ng) { undoable('Added: ' + ng.name, () => run('gameArchive', ng.id)); paint(); }
        });
      }
    });
    // shop: do it, then reload the room and the shop
    const shopLoad = () => call('gameShop').then((sh) => { S.shop = sh; paint(); }).catch((e) => { S.err = String((e && e.message) || e).replace(/^Error:\s*/, ''); paint(); });
    const act = (fn, ...a) => call(fn, ...a).then((r) => { S.d = r; return call('gameShop'); }).then((sh) => { S.shop = sh; S.err = ''; paint(); }).catch((e) => { S.err = String((e && e.message) || e).replace(/^Error:\s*/, ''); paint(); });
    run('gameLoad').then(() => call('gameArt')).then((A) => { S.art = A; paint(); }).catch(() => {});
  }
  root.GameUI = { mount };
})(typeof window !== 'undefined' ? window : this);
