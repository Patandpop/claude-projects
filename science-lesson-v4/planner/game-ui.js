/* Ulhu's Rituals: the screen, shared by the planner (laptop) and the phone page.
   Rebuilt 2026-10-24 from Patryk's Claude Design handoff (replica/design/claude-design-handoff/README.md):
   banner with Ulhu, one-line Undo, four swipeable tabs (Rituals, Quests, Omens, Den), a dock of buttons in
   the thumb zone, forms that open in place of the list. Every tap shows at once (with coins flying, Ulhu
   bouncing, a short buzz); the server (Game.gs) catches up and its reply replaces the numbers.
   bundle.js pastes game-ulhu.js (Ulhu's sprites, 8-bit and 16-bit), game-pixel.js (PX: coin, bosses,
   wardrobe, icons) and this file into Planner.html and Phone.html. GameUI.mount(element, call, opts):
   call(name, ...args) runs a Game.gs function and returns a promise. */
(function (root) {
  const FONTS = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Grenze+Gotisch:wght@500;700&family=IM+Fell+English:ital@0;1&display=swap';
  const CSS = `
.uz{--g:'Grenze Gotisch',serif;--a:'Atkinson Hyperlegible',system-ui,sans-serif;--f:'IM Fell English',serif;position:relative;display:flex;flex-direction:column;background:#070d0b;color:#e8e1cf;font:14px var(--a);overflow:hidden;user-select:none;-webkit-user-select:none}
.uz *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.uz button{font-family:inherit;cursor:pointer;color:inherit}
.uz input,.uz textarea{font-family:var(--a);user-select:text;-webkit-user-select:text}
.uz input::placeholder,.uz textarea::placeholder{color:#6f8178}
.uz img{image-rendering:pixelated}
.uz ::-webkit-scrollbar{width:0;height:0}
.uz-ban{flex:none;position:relative;height:172px;overflow:hidden}
.uz-rays{position:absolute;inset:0;background:repeating-linear-gradient(104deg,rgba(170,255,225,.055) 0 16px,transparent 16px 52px);-webkit-mask-image:linear-gradient(180deg,#000,transparent 85%);mask-image:linear-gradient(180deg,#000,transparent 85%)}
.uz-ledge{position:absolute;left:0;right:0;bottom:0;height:22px;background:repeating-linear-gradient(90deg,#26362f 0 30px,#1b2823 30px 32px);border-top:2px solid #3b5047;box-shadow:inset 0 3px 0 rgba(0,0,0,.25)}
.uz-ledge:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 18px 9px,#4a5e54 2px,transparent 2.5px),radial-gradient(circle at 24px 13px,#3e5148 1.5px,transparent 2px),radial-gradient(circle at 200px 8px,#4a5e54 2px,transparent 2.5px),radial-gradient(circle at 330px 12px,#4a5e54 2.5px,transparent 3px)}
.uz-me{position:absolute;left:18px;bottom:14px;width:108px;height:108px;transform-origin:50% 100%}
.uz-lay{position:absolute;inset:0;width:100%;height:100%}
.uz-coins{position:absolute;left:12px;top:9px;display:flex;align-items:center;gap:8px}
.uz-coins img{width:32px;height:32px;filter:drop-shadow(0 2px 0 #2a1806)}
.uz-coins b{font:700 30px/1 var(--a);color:#ffd56a;text-shadow:0 2px 0 #4a2c0c;font-variant-numeric:tabular-nums}
.uz-lv{position:absolute;right:12px;top:9px;display:flex;align-items:center;gap:8px;text-align:right}
.uz-lv small{display:block;font:700 11px var(--a);letter-spacing:.12em;color:#c9a560}.uz-lv span{font:500 16px/1 var(--g);color:#e8e1cf}
.uz-hex{width:38px;height:42px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:linear-gradient(180deg,#ffd56a,#a8681c);display:flex;align-items:center;justify-content:center}
.uz-hex i{width:32px;height:36px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:linear-gradient(180deg,#22322c,#101a17);display:flex;align-items:center;justify-content:center;font:700 18px var(--a);font-style:normal;color:#ffd56a}
.uz-say{position:absolute;left:132px;right:12px;top:56px}
.uz-say div{position:relative;display:inline-block;max-width:100%;padding:6px 11px 7px;background:radial-gradient(ellipse at 30% 20%,#f3e7c8,#dcc797 80%);color:#2a1a12;border-radius:3px 10px 10px 10px;font:italic 15px/1.2 var(--f);box-shadow:0 2px 0 #5a4428}
.uz-say div:before{content:"";position:absolute;left:-7px;top:6px;border-top:6px solid transparent;border-bottom:6px solid transparent;border-right:8px solid #e8d8b0}
.uz-bars{position:absolute;left:132px;right:12px;top:110px;display:flex;flex-direction:column;gap:6px}
.uz-bar{display:flex;align-items:center;gap:7px}.uz-bar img{width:11px;height:11px}
.uz-bar div{flex:1;height:7px;border-radius:1px;overflow:hidden}.uz-bar div i{display:block;height:100%;transition:width .4s}
.uz-bar span{font:700 12px var(--a);font-variant-numeric:tabular-nums;min-width:58px;text-align:right}
.uz-chip{position:absolute;left:12px;top:46px;padding:3px 8px;border-radius:3px;background:#173040;border:1px solid #3a6a8a;font:700 11px var(--a);letter-spacing:.1em;color:#bfe0ff}
.uz-flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 22% 70%,rgba(255,214,106,.55),rgba(255,214,106,0) 70%)}
.uz-undo{flex:none;height:38px;display:flex;align-items:center;gap:8px;padding:0 4px 0 14px;background:#0b1311;border-bottom:1px solid #1c2924}
.uz-undo .t{flex:1;min-width:0;display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;font:13px var(--a);color:#8fa298}
.uz-undo .t .n{color:#e8e1cf;overflow:hidden;text-overflow:ellipsis}
.uz-undo button{flex:none;height:38px;padding:0 12px;border:none;background:none;color:#5ef2a0;font:700 13px var(--a);letter-spacing:.08em}
.uz-tabs{flex:none;position:relative;height:46px;display:grid;grid-template-columns:repeat(4,1fr);background:linear-gradient(180deg,#101a17,#0b1311);border-bottom:1px solid #1c2924}
.uz-tabs button{position:relative;border:none;background:none;display:flex;align-items:center;justify-content:center;gap:5px;font:500 19px var(--g);transition:color .2s}
.uz-tabs b{min-width:18px;height:18px;padding:0 5px;border-radius:9px;color:#08100d;font:700 11px/18px var(--a)}
.uz-ink{position:absolute;bottom:-1px;width:25%;height:3px;display:flex;justify-content:center;transition:left .28s cubic-bezier(.2,.8,.2,1)}
.uz-ink i{width:56%;height:3px;transition:background .28s}
.uz-body{flex:1;min-height:0;position:relative;overflow:hidden}
.uz-sw{position:absolute;inset:0;overflow:hidden;touch-action:pan-y}
.uz-track{display:flex;width:400%;height:100%}
.uz-pane,.uz-form{height:100%;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;display:grid;grid-template-columns:minmax(0,1fr);grid-auto-rows:max-content;align-content:start}
.uz-pane{width:25%;padding:10px 10px 18px;gap:8px}
.uz-sec{display:flex;flex-direction:column;gap:6px}
.uz-h{display:flex;align-items:center;gap:2px;min-height:44px;border-bottom:1px solid #2a3b33;position:relative}
.uz-h>button:first-child{flex:1;min-width:0;display:flex;align-items:center;gap:8px;min-height:44px;border:none;background:none;padding:0 2px;text-align:left}
.uz-chev{flex:none;width:10px;font:700 12px var(--a);transition:transform .2s;color:#5ef2a0}
.uz-ht{display:flex;flex-direction:column;min-width:0}
.uz-ht b{font:500 22px/1 var(--g);color:#e8e1cf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uz-ht small,.uz-cap small{font:700 11px var(--a);letter-spacing:.1em;color:#7f9389;text-transform:uppercase;margin-top:2px}
.uz-meta{flex:none;font:700 12px var(--a);padding:0 4px;color:#7f9389}
.uz-pen{flex:none;width:36px;height:40px;border:none;background:none;color:#61756b;font:15px var(--a)}
.uz-ren{position:absolute;left:24px;right:44px;top:4px;height:36px;padding:0 10px;border:1px solid #5ef2a0;border-radius:4px;background:#0b1513;color:#e8e1cf;font:500 18px var(--g);outline:none}
.uz-row{position:relative;display:flex;align-items:center;gap:10px;min-height:58px;padding:5px 10px 5px 8px;background:linear-gradient(180deg,#1b2924,#131d19);border:1px solid #2a3b33;border-left:4px solid var(--e);border-radius:5px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 2px 0 #040807;transition:opacity .25s}
.uz-row.done{min-height:48px;opacity:.62}.uz-row.done .nm{text-decoration:line-through}
.uz-tk{flex:none;width:46px;height:46px;border-radius:50%;border:2px solid #4f6a5e;background:radial-gradient(circle,#1f2e28,#121b17);display:flex;align-items:center;justify-content:center;padding:0}
.uz-tk.auto{border:2px dashed #7a5ab0}.uz-tk.on{border:2px solid #5ef2a0;background:radial-gradient(circle,#2a9a62,#11402a)}
.uz-tk img{width:22px;height:18px}
.uz-mid{flex:1;min-width:0}.uz-mid .nm{font:700 15px/1.2 var(--a);color:#ece5d3}
.uz-sub{display:flex;flex-wrap:wrap;gap:4px 7px;align-items:center;margin-top:3px;font:12px var(--a);color:#93a69c}
.uz-flame{display:inline-flex;align-items:center;gap:3px;color:#5ef2a0;font-weight:700}.uz-flame img{width:8px;height:11px}
.uz-pay{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.uz-pay>span{display:flex;align-items:center;gap:3px;font:700 16px var(--a);color:#f0c45a}.uz-pay>span img{width:18px;height:18px}
.uz-pay>.uz-seal{font:700 11px var(--a)}
.uz-seal{display:inline-flex;align-items:center;gap:3px;padding:1px 6px 1px 2px;border-radius:9px;background:#26173a;border:1px solid #5a3a8a;font:700 11px var(--a);color:#d4bfff!important;white-space:nowrap}.uz-seal img{width:12px!important;height:12px!important}
.uz-tide{padding:9px 12px 10px;border-radius:5px;background:linear-gradient(180deg,#12202a,#0d161c);border:1px solid #23404e}
.uz-mk{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.uz-mc{padding:7px 8px 8px;border-radius:5px;background:linear-gradient(180deg,#1b2924,#131d19);border:1px solid #2a3b33;border-left:4px solid #5aa7ff;box-shadow:0 2px 0 #040807}
.uz-mc .hd{display:flex;align-items:baseline;justify-content:space-between;gap:4px;margin-bottom:6px}.uz-mc .hd b{font:700 17px var(--a);color:#ece5d3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uz-mc .hd span{display:flex;align-items:center;gap:2px;font:700 12px var(--a);color:#f0c45a;flex:none}
.uz-hv{display:grid;grid-template-columns:1fr 1fr;gap:5px}.uz-hv button{height:44px;border-radius:4px;border:1.5px solid #2f4a5e;background:#0f1a20;color:#bfe0ff;font:700 13px var(--a);padding:0}
.uz-hv button.on{border-color:#5ef2a0;background:#1a4a32;color:#b6ffd6}
.uz-new{height:44px;border:1px dashed #2f443b;border-radius:5px;background:none;color:#7f9389;font:500 17px var(--g)}
.uz-parch{border-radius:3px;background:radial-gradient(ellipse at 25% 0%,#f3e7c8,#dfcb9c 70%,#cdb37f);color:#2a1a12;box-shadow:0 2px 0 #3a2a14,inset 0 0 20px rgba(120,80,30,.22)}
.uz-rv>button{width:100%;height:46px;display:flex;align-items:center;gap:10px;padding:0 12px;border:none;background:none;color:#2a1a12}
.uz-rv textarea{resize:none;padding:6px 8px;border:1px solid #b89e6a;border-radius:3px;background:repeating-linear-gradient(180deg,rgba(255,255,255,.22) 0 21px,#c9b07a 21px 22px);color:#2a1a12;font:15px/22px var(--a);outline:none;width:100%}
.uz-rv input{flex:1;height:40px;padding:0 8px;border:none;border-bottom:1.5px solid #8a6a3a;background:transparent;color:#2a1a12;font:15px var(--a);outline:none}
.uz-rv label{font:italic 15px var(--f)}
.uz-cap{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 2px;border:none;border-bottom:1px solid #2a2440;background:none;text-align:left;width:100%}
.uz-cap>span:not(.uz-chev):first-of-type,.uz-cap>.uz-chev+span{flex:1;display:flex;flex-direction:column}.uz-cap b{font:500 20px/1 var(--g)}
.uz-q{position:relative;border-left:5px solid var(--e);transition:opacity .3s}
.uz-q .top{display:flex;align-items:center;gap:10px;padding:7px 10px 7px 8px}
.uz-q .uz-tk{border:2px solid #7a5a34;background:rgba(255,255,255,.3)}.uz-q .uz-tk img{width:40px;height:40px}
.uz-q .uz-mid .nm{font:17px/1.15 var(--f);color:#2a1a12}.uz-q.done .uz-mid .nm{text-decoration:line-through}.uz-q.done{opacity:.7}
.uz-q .uz-sub{color:#5a4428;margin-top:4px}
.uz-due{padding:1px 7px;border-radius:9px;font-weight:700}
.uz-steps{margin:0 10px 8px 64px;border-top:1px dashed #a88a5a}
.uz-steps button{width:100%;min-height:40px;display:flex;align-items:center;gap:9px;border:none;background:none;padding:0;color:#2a1a12;text-align:left}
.uz-steps i{flex:none;width:22px;height:22px;border:2px solid #6a4a2a;border-radius:2px;color:#f3e7c8;font:700 14px/18px var(--a);text-align:center;font-style:normal}
.uz-boss{border-radius:5px;background:linear-gradient(180deg,#2a1215,#140a0c);border:1px solid #4a1e22;box-shadow:inset 0 0 30px rgba(196,50,58,.12),0 2px 0 #050203;overflow:hidden}
.uz-boss>button{width:100%;display:flex;align-items:center;gap:10px;padding:8px 10px;border:none;background:none;text-align:left}
.uz-cr{flex:none;width:72px;height:60px;display:flex;align-items:flex-end;justify-content:center;background:radial-gradient(ellipse at 50% 90%,rgba(255,90,80,.25),transparent 70%)}
.uz-hpb{flex:1;height:8px;background:#3a1418;border:1px solid #5a2228;overflow:hidden}.uz-hpb i{display:block;height:100%;background:linear-gradient(90deg,#a3202a,#ff7a66);box-shadow:0 0 8px #ff5a4a;transition:width .6s cubic-bezier(.3,.7,.3,1)}
.uz-st{display:flex;align-items:center;gap:10px;min-height:48px;padding:2px 8px 2px 2px;border-radius:4px;background:rgba(0,0,0,.25);border:1px solid #3a1a1e}
.uz-st .uz-tk{width:44px;height:44px;border-color:#6a3a3e;background:radial-gradient(circle,#2a1416,#140a0c)}
.uz-st .uz-tk.on{border-color:#ff7a66;background:radial-gradient(circle,#a3202a,#4a0e14)}
.uz-tag{flex:none;padding:2px 7px;border-radius:3px;font:700 12px var(--a);white-space:nowrap;border:1px solid}
.uz-curse{display:flex;align-items:center;gap:10px;min-height:58px;padding:5px 10px 5px 8px;border-radius:5px;background:linear-gradient(180deg,#221315,#150b0d);border:1px solid #3e1c20;border-left:4px solid #c4323a;box-shadow:0 2px 0 #050203}
.uz-curse .uz-tk{border:2px solid #c4323a;background:radial-gradient(circle,#3a1216,#1a0a0c)}.uz-curse .uz-tk img{width:20px;height:20px}
.uz-bl{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.uz-bt{position:relative;overflow:hidden;min-height:82px;display:flex;flex-direction:column;align-items:stretch;justify-content:space-between;gap:6px;padding:8px 9px;border-radius:6px;text-align:left;box-shadow:0 2px 0 #030806}
.uz-halo{flex:none;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center}.uz-halo img{width:24px;height:24px}
.uz-x2{position:absolute;top:0;right:0;padding:2px 7px;border-bottom-left-radius:6px;background:#ffd56a;color:#1a1004;font:700 11px var(--a)}
.uz-card{display:flex;flex-direction:column;align-items:stretch;padding:0;border-radius:5px;border:1.5px solid #23332c;background:#131d19;overflow:hidden;text-align:left}
.uz-hscroll{display:flex;gap:6px;overflow-x:auto;margin:0 -10px;padding:0 10px 2px;touch-action:pan-x}
.uz-pill{flex:none;height:44px;display:flex;align-items:center;gap:6px;padding:0 12px 0 8px;border-radius:22px;border:1.5px solid #2a3b33;background:#131d19;color:#cfd8d3;font:700 13px var(--a);white-space:nowrap}
.uz-pill.on{border-color:#5ef2a0;background:#173a2c;color:#b6ffd6}
.uz-seg{display:grid;gap:3px;padding:3px;border-radius:5px;background:#0b1311;border:1px solid #1c2924}
.uz-seg button{height:36px;border:none;border-radius:3px;background:transparent;color:#7f9389;font:700 12px/1.1 var(--a)}.uz-seg button.on{background:#243a32}
.uz-stone{padding:10px 12px;border-radius:5px;background:linear-gradient(180deg,#1b2924,#131d19);border:1px solid #2a3b33}
.uz-stone .hd{display:flex;justify-content:space-between;align-items:baseline}.uz-stone .hd b{font:500 18px var(--g);color:#e8e1cf}
.uz-p{margin:0 2px;font:italic 14px/1.35 var(--f)}
.uz-dock{flex:none;height:62px;display:flex;align-items:center;gap:8px;padding:0 10px;background:linear-gradient(180deg,#0f1916,#0a110f);border-top:1px solid #1c2924}
.uz-dock button{min-width:0;height:46px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 6px;border-radius:6px;border:1.5px solid;white-space:nowrap;box-shadow:0 2px 0 rgba(0,0,0,.4);font:500 19px var(--g)}
.uz-dock button.sm{font:700 12px var(--a)}
.uz-form{position:absolute;inset:0;padding:12px 12px 16px;gap:10px;background:linear-gradient(180deg,#101a17,#0b1311)}
.uz-form>input{height:48px;padding:0 12px;border-radius:5px;border:1.5px solid #2f443b;background:#0b1513;color:#e8e1cf;font:16px var(--a);outline:none}
.uz-lbl{font:700 11px var(--a);letter-spacing:.1em;color:#7f9389}
.uz-chips{display:flex;flex-wrap:wrap;gap:6px}
.uz-chips button{min-width:44px;min-height:42px;display:flex;align-items:center;gap:6px;padding:0 12px;border-radius:5px;border:1.5px solid #2f443b;background:#131d19;color:#cfd8d3;font:700 14px var(--a)}
.uz-chips button img{height:22px}
.uz-srow{display:flex;gap:6px;align-items:center}.uz-date{display:flex;gap:6px}.uz-date input{flex:1;min-width:0;height:44px;padding:0 10px;border-radius:5px;border:1.5px solid #2f443b;background:#0b1513;color:#e8e1cf;font:15px var(--a);color-scheme:dark}.uz-date button{flex:none;height:44px;padding:0 12px;border-radius:5px;border:1.5px solid #2f443b;background:#131d19;color:#cfd8d3;font:700 13px var(--a)}.uz-ed{cursor:pointer}.uz-srow input{flex:1;min-width:0;height:44px;padding:0 10px;border-radius:5px;border:1.5px solid #2f443b;background:#0b1513;color:#e8e1cf;font:15px var(--a);outline:none}
.uz-total{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:5px;background:#0b1311;border:1px solid #1c2924}
.uz-go{flex:none;height:52px;border:none;border-radius:6px;color:#08100d;font:700 22px var(--g);box-shadow:0 3px 0 rgba(0,0,0,.4)}
.uz-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:30}
.uz-off{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(6,14,26,.5),rgba(6,14,26,.7));display:flex;align-items:flex-start;justify-content:center;padding-top:6px}
.uz-off span{padding:4px 12px;border-radius:3px;background:#173040;border:1px solid #3a6a8a;font:700 12px var(--a);letter-spacing:.1em;color:#bfe0ff}
.uz-scene{position:relative;width:100%;border-radius:6px;overflow:hidden;background:radial-gradient(ellipse at 50% 60%,#14302a,#070d0b 75%);border:1px solid #2a3b33;box-shadow:inset 0 0 40px rgba(0,0,0,.6)}
.uz-scene>img{position:absolute}
.uz.wide{max-width:460px;margin:0 auto;border-radius:18px;border:1px solid #1c2924}
`;
  // the kinds the server uses (track) with the design's colours
  const KIND = { necessary: { l: 'Necessary', c: '#5aa7ff', ink: '#1d4a8a' }, ahead: { l: 'Ahead', c: '#f2a93b', ink: '#8a5a0a' }, external: { l: 'Outside work', c: '#b07cff', ink: '#5a2a9a' }, life: { l: 'Life', c: '#5ee08a', ink: '#1a6a3a' } };
  const LENS = [5, 15, 30, 60, 120];
  const EFF = { 5: 'Tiny', 15: 'Small', 30: 'Medium', 60: 'Big', 120: 'Huge' }, eff = (m) => EFF[m] || 'Small';   // size of the effort (stored as minutes)
  const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const TITLES = ['', 'Tadpole', 'Polyp', 'Deep Dabbler', 'Abyssal Apprentice', 'Tide Caller', 'Rune Keeper', 'Dream Weaver', 'Star Spawn', 'High Priest', 'Elder Thing', 'Great Dreamer', 'Old One'];
  const SIZE = { 2: { k: 'spawn', gold: 60 }, 5: { k: 'shog', gold: 150 }, 10: { k: 'levi', gold: 300 }, 20: { k: 'old', gold: 600 } };
  const TABC = ['#5ef2a0', '#a48aff', '#ff7a66', '#ffd56a'];
  const TICK_SAYS = ["Ph'nglui! Lovely work.", 'The stars align.', 'Another rune glows.', 'Ia! Ia! Well done.', 'The deep approves.'];
  const CURSE_SAYS = ['Ow. That one stung.', 'The deep grows cold…', 'Ulhu flinches. Easy now.'];
  const CATS = [['floors', 'Floors'], ['wallpapers', 'Walls'], ['rugs', 'Rugs'], ['windows', 'Windows'], ['lights', 'Lights'], ['corner', 'Corner'], ['seats', 'Seats'], ['tables', 'Tables'], ['wall', 'Hangings'], ['props', 'Props']];
  const SLOTL = { floor: 'Floor', wall: 'Walls', rug: 'Rug', window: 'Window', light: 'Light', corner: 'Corner', furn: 'Furniture', hang3: 'Left wall', hang4: 'Right wall', prop: 'Props' };
  const TIERC = { Basic: '#c8beaa', Nice: '#5ee08a', Fancy: '#b49cff', Eldritch: '#5ef2a0' };
  const WCATS = [['hat', 'Hats', 20], ['top', 'Tops', 14], ['face', 'Face', 13], ['held', 'Held', 12], ['skin', 'Skins', 12]];
  const WNAMES = { hat: ['Pirate tricorn', 'Wizard hat', 'Little crown', 'Top hat', 'Teacher’s mortarboard', "Captain's cap", 'Fez', 'Witch hat', 'Knitted beanie', 'Flower crown', 'Horned helm', 'Party hat', 'Sailor cap', 'Halo', 'Propeller cap', 'Kelp crown', 'Ghost tricorn', 'Void wizard hat', 'Elder crown', 'Head of Department board'],
    top: ['Striped scarf', 'Sailor collar', 'Velvet cape', 'Lab coat', 'Bow tie', 'School tie', 'Rune jumper', 'Life ring', 'Medal of Marking', 'Kelp sash', 'Kelp scarf', 'Midnight cape', 'Gold bow tie', 'Eldritch mantle'],
    face: ['Monocle', 'Reading glasses', 'Eyepatch', 'Lab goggles', 'Fine moustache', 'Shades', 'Star glasses', '3D glasses', 'Half-moon specs', 'Gold monocle', 'Void shades', 'Rose goggles', 'Eye of the Deep'],
    held: ['Lantern', 'Trident', 'Quill and ink', 'Grimoire', 'Mug of tea', 'Red marking pen', 'Rune staff', 'Fishing rod', 'Ghost lantern', 'Coral trident', 'Green pen', 'Staff of the Deep'],
    skin: ['Kelp Mint', 'Abyssal Teal', 'Tidepool Blue', 'Deep Violet', 'Coral Pink', 'Sunken Gold', 'Ghostly', 'Ink Shadow', 'Bloom Rose', 'Moss Green', 'Star Spawn', 'Eldritch Glow'] };
  const SKINF = ['none', 'hue-rotate(30deg)', 'hue-rotate(60deg)', 'hue-rotate(110deg)', 'hue-rotate(180deg)', 'hue-rotate(-90deg) saturate(1.4)', 'saturate(0) brightness(1.15)', 'brightness(.55) saturate(.6)', 'hue-rotate(150deg) saturate(1.2)', 'hue-rotate(-30deg)', 'hue-rotate(80deg) saturate(1.6)', 'hue-rotate(-10deg) saturate(1.8) brightness(1.1) drop-shadow(0 0 3px #5ef2a0)'];
  const WPRICE = [0, 60, 90, 120, 180, 220, 260, 320, 400, 500, 650, 900, 1200, 1500];
  const BLESS_IC = [['water', /water|drink|hydrat/i], ['walk', /walk|run|step/i], ['stretch', /stretch|yoga|gym|train|exerc/i], ['tidy', /tidy|clean|desk|sort/i], ['door', /left|leave|home|door|by \d/i], ['apple', /lunch|eat|fruit|food|apple|breakfast/i], ['tea', /break|tea|coffee|rest/i], ['sun', /day ?light|sun|outside/i], ['moon', /bed|sleep|night/i], ['heart', /kind|thank|call|friend|love/i]];
  const GROUP_SUGS = ['The Lab of Forbidden Experiments', 'The Report Abyss', "The Parents' Evening Grotto", 'The Inbox Maelstrom', 'The Cauldron of Admin'];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const dt = (k) => { const p = String(k).split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
  const addD = (k, n) => { const d = dt(k); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const diff = (a, b) => Math.round((dt(b) - dt(a)) / 864e5);
  const dshort = (k) => { const d = dt(k); return DN[d.getUTCDay()] + ' ' + d.getUTCDate(); };
  const need = (lv) => 150 + 50 * lv;

  function mount(el, call, opts) {
    opts = opts || {};
    if (!document.getElementById('uz-css')) {
      const st = document.createElement('style'); st.id = 'uz-css'; st.textContent = CSS; document.head.appendChild(st);
      const ln = document.createElement('link'); ln.rel = 'stylesheet'; ln.href = FONTS; document.head.appendChild(ln);
    }
    const A = root.ULHU_ART, P = root.PX;
    const IMG = { coin: P.coin.src, flame: P.flame.src, heart: P.heart.src, skull: P.skull.src, seal: P.seal.src, wax: P.waxRed.src, xp: P.xp.src, trophy: P.trophy.src, tick: P.tick.src, moon: P.moon.src, spark: P.spark.src, rune: P.rune.src, plant: A.items.plant.src };
    // the currency is runes (2026-10-25): one rune under 15, the cairn for 15-99, the rune portal for 100+
    const RN = root.RUNES;
    const coin = (z, n, key, kind) => { const s = RN ? RN.pick(n, key, kind) : P.coin, k = s.h >= 34 ? 1.35 : s.h > 24 ? 1.2 : 1; return '<img src="' + s.src + '" style="width:' + Math.round(z * k * s.w / s.h) + 'px;height:' + Math.round(z * k) + 'px;object-fit:contain" alt="runes">'; };
    if (RN) IMG.coin = RN.ones[0].src;
    let style = '16-bit'; try { style = localStorage.getItem('ulhuStyle') || '16-bit'; } catch (e) { /* private window */ }
    const V = { tab: 0, open: { teach: 1, chores: 1, summon: 1, marking: 0, life: 1, qteach: 1, qlife: 1, qdone: 0 }, den: 'room', shopCat: 'floors', tier: 'All', wCat: 'hat', form: null, draft: null, renaming: null, banishArm: null, stamp: null, vanq: false, rvOpen: false, mood: null, say: null, last: null, drag: 0, settling: {} };
    let D = null, SHOP = null, ROOM = null, CHRON = null, seq = 0, err = '';
    const stack = [];

    el.innerHTML = '<div class="uz' + (opts.wide ? ' wide' : '') + '"><div class="uz-ban"><div class="uz-rays"></div>' +
      '<div style="position:absolute;right:62px;bottom:20px;width:26px;height:118px;background:repeating-linear-gradient(90deg,#14201c 0 4px,#1b2a25 4px 8px);opacity:.75;border-top:6px solid #1f302a"></div>' +
      '<div style="position:absolute;right:112px;bottom:20px;width:20px;height:76px;background:repeating-linear-gradient(90deg,#121c19 0 4px,#182520 4px 8px);opacity:.6;border-top:5px solid #1b2a25;transform:rotate(-6deg);transform-origin:bottom"></div>' +
      '<img src="' + IMG.plant + '" style="position:absolute;right:4px;bottom:16px;width:50px;height:64px;filter:brightness(.55) saturate(.8);transform:scaleX(-1)" alt="">' +
      '<div class="uz-bub" style="position:absolute;inset:0;pointer-events:none"></div><img class="uz-moon" src="' + IMG.moon + '" style="position:absolute;right:20px;top:58px;width:21px;height:21px;opacity:.85;display:none" alt="">' +
      '<div class="uz-ledge"></div><div class="uz-me"></div>' +
      '<div class="uz-coins"><img class="uz-ctr" src="' + IMG.coin + '" alt=""><b></b></div>' +
      '<div class="uz-lv"><div><small>LEVEL</small><span></span></div><div class="uz-hex"><i></i></div></div>' +
      '<div class="uz-say"><div></div></div>' +
      '<div class="uz-bars"><div class="uz-bar"><img src="' + IMG.xp + '" alt=""><div style="background:#0b1513;border:1px solid #24443a"><i class="xp" style="background:linear-gradient(90deg,#1d8a52,#5ef2a0);box-shadow:0 0 6px #5ef2a0"></i></div><span class="xpt" style="color:#bfeed4"></span></div>' +
      '<div class="uz-bar"><img src="' + IMG.heart + '" alt=""><div class="hpw" style="background:#160b0c;border:1px solid #4a1e22"><i class="hp" style="background:linear-gradient(90deg,#a3202a,#ff7a66)"></i></div><span class="hpt" style="color:#ffc0b4"></span></div></div>' +
      '<div class="uz-chip" style="display:none">DAY FROZEN</div><div class="uz-flash"></div></div>' +
      '<div class="uz-undo"></div><div class="uz-tabs"></div><div class="uz-body"></div><div class="uz-dock"></div><div class="uz-fx"></div></div>';
    const box = el.firstChild, $ = (s) => box.querySelector(s);
    const ban = $('.uz-ban'), me = $('.uz-me'), fx = $('.uz-fx'), body = $('.uz-body');

    // fill the space between the page's header and its bottom bar (phone), or a fixed height (laptop)
    function fit() {
      if (opts.wide) { box.style.height = '800px'; return; }
      const nav = document.querySelector('nav'), top = box.getBoundingClientRect().top + window.scrollY;
      box.style.height = Math.max(520, window.innerHeight - top - (nav ? nav.offsetHeight : 0)) + 'px';
    }
    window.addEventListener('resize', fit);
    for (let i = 0; i < 9; i++) {
      const b = document.createElement('div'), s = 3 + Math.random() * 5;
      b.style.cssText = 'position:absolute;left:' + (3 + Math.random() * 94) + '%;bottom:-10px;width:' + s + 'px;height:' + s + 'px;border-radius:50%;border:1px solid rgba(180,255,230,.35);background:rgba(180,255,230,.08)';
      $('.uz-bub').appendChild(b);
      if (b.animate) b.animate([{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 0.9, offset: 0.15 }, { transform: 'translate(' + ((Math.random() - 0.5) * 30) + 'px,-190px)', opacity: 0 }], { duration: 5000 + Math.random() * 5000, delay: Math.random() * 6000, iterations: Infinity });
    }

    /* ---------- art ---------- */
    const witem = (id) => { if (!id) return null; const [c, i] = id.split('-'); const n = Number(i), names = WNAMES[c]; if (!names || n >= names.length) return null;
      const set = P.wearSets[c]; return { id, cat: c, i: n, name: names[n], price: WPRICE[n] || 1500, lock: n >= 10 ? 8 + (n - 10) * 2 : 0, src: set ? P.wear[set[n % set.length]].src : null, filter: c === 'skin' ? SKINF[n] : (set && n < set.length ? 'none' : 'hue-rotate(' + ((n * 67) % 360) + 'deg)') }; };
    function layers(md) {
      const base = (style === '8-bit' ? A.b8 : A.b16)[md] || A.b8.idle, wear = (D && D.wear && D.wear.on) || {};
      const sk = witem(wear.skin), L = [{ src: base, filter: sk ? sk.filter : 'none' }];
      ['top', 'face', 'hat', 'held'].forEach((k) => { const w = witem(wear[k]); if (w && w.src) L.push({ src: w.src, filter: w.filter }); });
      return L.map((l) => '<img class="uz-lay" src="' + l.src + '" style="filter:' + l.filter + '" alt="">').join('');
    }
    const night = () => !!D && (D.frozen || D.hour >= 19);
    function mood() { if (night()) return 'sleepy'; if (V.mood) return V.mood; return D.player.hp < 15 ? 'sad' : 'idle'; }

    /* ---------- effects (Web Animations API, drawn in the fx layer) ---------- */
    const rel = (r) => { const f = fx.getBoundingClientRect(); return { x: r.left + r.width / 2 - f.left, y: r.top + r.height / 2 - f.top }; };
    const anim = (n, k, o) => (n && n.animate ? n.animate(k, o) : { set onfinish(f) { f(); } });
    function floatText(r, txt, col) { if (!r) return; const a = rel(r), t = document.createElement('div'); t.textContent = txt;
      t.style.cssText = 'position:absolute;left:' + a.x + 'px;top:' + (a.y - 10) + 'px;transform:translateX(-50%);font:700 18px var(--a);color:' + col + ';text-shadow:0 2px 0 #000;white-space:nowrap';
      fx.appendChild(t); anim(t, [{ transform: 'translate(-50%,0)', opacity: 1 }, { transform: 'translate(-50%,-34px)', opacity: 0 }], { duration: 800, easing: 'ease-out' }).onfinish = () => t.remove(); }
    function flyCoin(r, n) { if (!r) return; const a = rel(r), b = rel($('.uz-ctr').getBoundingClientRect());
      for (let i = 0; i < Math.min(4, 1 + Math.floor(n / 12)); i++) { const c = document.createElement('img'); c.src = RN ? RN.any().src : IMG.coin;
        c.style.cssText = 'position:absolute;left:' + (a.x - 11) + 'px;top:' + (a.y - 11) + 'px;width:22px;height:22px'; fx.appendChild(c); const dx = b.x - a.x, dy = b.y - a.y;
        anim(c, [{ transform: 'translate(0,0) scale(.6)', opacity: 0 }, { transform: 'translate(' + (dx * 0.35 + (i - 1) * 14) + 'px,' + (dy * 0.35 - 50) + 'px) scale(1.35)', opacity: 1, offset: 0.4 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.8)', opacity: 1 }], { duration: 560 + i * 70, easing: 'cubic-bezier(.45,0,.55,1)' }).onfinish = () => { c.remove(); if (i === 0) anim($('.uz-ctr'), [{ transform: 'scaleX(1)' }, { transform: 'scaleX(-1) scale(1.2)' }, { transform: 'scaleX(1)' }, { transform: 'scaleX(-1)' }, { transform: 'scaleX(1)' }], { duration: 520 }); }; } }
    const glow = (k, col) => { const n = k && box.querySelector('[data-fx="' + k + '"]'); anim(n, [{ boxShadow: '0 0 0 0 ' + col, transform: 'scale(.9)' }, { boxShadow: '0 0 0 12px rgba(0,0,0,0)', transform: 'scale(1.06)' }, { boxShadow: '0 0 0 0 rgba(0,0,0,0)', transform: 'scale(1)' }], { duration: 480, easing: 'ease-out' }); };
    const bounce = () => anim(me, [{ transform: 'none' }, { transform: 'translateY(-16px) scale(.94,1.06)', offset: 0.35 }, { transform: 'translateY(0) scale(1.08,.92)', offset: 0.7 }, { transform: 'none' }], { duration: 480, easing: 'ease-out' });
    function flinch() { anim(me, [{ transform: 'none', filter: 'none' }, { transform: 'translateX(-7px) rotate(-4deg)', filter: 'sepia(1) saturate(4) hue-rotate(-50deg)' }, { transform: 'translateX(6px) rotate(3deg)' }, { transform: 'translateX(-3px)' }, { transform: 'none', filter: 'none' }], { duration: 420 });
      anim($('.hpw'), [{ boxShadow: '0 0 0 0 #ff5a4a' }, { boxShadow: '0 0 10px 2px #ff5a4a' }, { boxShadow: '0 0 0 0 #ff5a4a' }], { duration: 500 }); }
    const buzz = (p) => { try { if (navigator.vibrate) navigator.vibrate(p || 12); } catch (e) { /* no vibration */ } };
    function ripple(r, col) { if (!r) return; const a = rel(r), d = document.createElement('div'); d.style.cssText = 'position:absolute;left:' + (a.x - 30) + 'px;top:' + (a.y - 30) + 'px;width:60px;height:60px;border-radius:50%;border:2px solid ' + col + ';box-shadow:0 0 12px ' + col; fx.appendChild(d); anim(d, [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(2.6)', opacity: 0 }], { duration: 600, easing: 'ease-out' }).onfinish = () => d.remove(); }
    function celebrate(big) {
      const o = rel(me.getBoundingClientRect());
      if (big && RN) { const h = document.createElement('img'); h.src = RN.hoard.src; h.style.cssText = 'position:absolute;left:' + (o.x - 60) + 'px;top:' + (o.y - 60) + 'px;width:120px;height:120px;image-rendering:pixelated;filter:drop-shadow(0 0 14px #b48aff)'; fx.appendChild(h);
        anim(h, [{ transform: 'scale(.2) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(4deg)', opacity: 1, offset: 0.3 }, { transform: 'scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translateY(-30px) scale(.9)', opacity: 0 }], { duration: 2200, easing: 'ease-out' }).onfinish = () => h.remove(); } anim($('.uz-flash'), [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { duration: 1100 });
      for (let i = 0; i < 16; i++) { const s = document.createElement('img'), z = i % 3 ? 14 : 18; s.src = i % 3 ? IMG.spark : (RN ? RN.any().src : IMG.coin);
        s.style.cssText = 'position:absolute;left:' + (o.x - z / 2) + 'px;top:' + (o.y - z / 2) + 'px;width:' + z + 'px;height:' + z + 'px'; fx.appendChild(s); const a = i / 16 * Math.PI * 2, r = 70 + Math.random() * 60;
        anim(s, [{ transform: 'translate(0,0) scale(.4)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * r) + 'px,' + (Math.sin(a) * r * 0.7 - 20) + 'px) scale(1.2)', opacity: 1, offset: 0.6 }, { transform: 'translate(' + (Math.cos(a) * r * 1.1) + 'px,' + (Math.sin(a) * r * 0.7 + 20) + 'px) scale(.8)', opacity: 0 }], { duration: 1000 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.4,1)' }).onfinish = () => s.remove(); }
      buzz([20, 60, 30]);
    }
    let mt = null;
    function setMood(m, say) { clearTimeout(mt); V.mood = m; V.say = say; paintBanner(); mt = setTimeout(() => { V.mood = null; V.say = null; paintBanner(); }, 2400); }
    const shake = (r) => { const n = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); anim(n && n.closest('button'), [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 220 }); buzz([8, 30, 8]); };

    /* ---------- server: every change shows first, then is sent; the newest reply wins ---------- */
    // the phone keeps the last screen (instant open) and any change made with no signal (sent later), 2026-10-26
    const LS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } return v; };
    const saveD = () => { if (D) { LS('ulhuD', D); try { window.dispatchEvent(new Event('ulhuchange')); } catch (e) { /* old browser */ } } };
    const READS = /^game(Load|Shop|Art|Chronicle)$/;
    const isNet = (e) => /network|connection|HTTP 0|failed to fetch|offline|timed? ?out/i.test(String((e && e.message) || e)) || (typeof navigator !== 'undefined' && navigator.onLine === false);
    function queue(fn, args) { const q = LS('ulhuQ') || []; q.push([fn, args]); LS('ulhuQ', q); }
    // send what was saved on the phone, oldest first; stop (and keep the rest) if the signal drops again
    async function flush() {
      const q = LS('ulhuQ') || []; if (!q.length) return; LS('ulhuQ', []);
      for (let i = 0; i < q.length; i++) {
        try { await call(q[i][0], ...q[i][1]); } catch (e) { if (isNet(e)) { LS('ulhuQ', q.slice(i).concat(LS('ulhuQ') || [])); return; } }
      }
    }
    function send(fn, args, after) {
      const my = ++seq;
      return call(fn, ...args).then((d) => {
        if (!d) throw new Error('The planner sent nothing back. Reload, and if it keeps happening paste Game.gs again and deploy a new version.');
        if (my === seq) { D = d; err = ''; saveD(); paint(); }
        if (after) after(d);
        return d;
      }).catch((e) => {
        if (isNet(e) && D) {
          if (!READS.test(fn)) { queue(fn, args); saveD(); V.last = { verb: 'Saved on the phone:', name: 'sends when there is signal' }; }
          else if (fn === 'gameLoad') V.last = { verb: 'No signal:', name: 'showing your last screen' };
          return paintTop();
        }
        err = String((e && e.message) || e).replace(/^Error:\s*/, ''); V.last = { verb: 'Not saved:', name: err }; if (my === seq && fn !== 'gameLoad') { const u = stack.pop(); if (u) D = u.d; } paint(); });
    }
    // remember how it was (for Undo), change it here, show it, send it
    function act(last, rev, fn, args, patch, after) {
      stack.push({ d: clone(D), rev, name: last && last.name }); if (stack.length > 30) stack.shift();
      if (patch) patch(D); V.last = last; saveD(); paint();
      return send(fn, args, after);
    }
    function undo() {
      const u = stack.pop(); if (!u) return;
      D = u.d; V.last = { verb: 'Undone:', name: u.name || '' }; V.banishArm = null; V.stamp = null; paint(); buzz(8);
      if (u.rev) send(u.rev[0], u.rev.slice(1));
    }
    // pay locally like the server: coins, XP, level (the reply then has the exact numbers)
    function earnLocal(d, n, xp) { const p = d.player; p.coins += n; d.weekCoins = (d.weekCoins || 0) + n; p.xp += xp; let up = false; while (p.xp >= p.need) { p.xp -= p.need; p.level++; p.need = need(p.level); p.hp = p.maxHp; up = true; } return up; }
    function earnFx(r, k, n, up) {
      flyCoin(r, n); floatText(r, '+' + n, '#ffd56a'); glow(k, 'rgba(94,242,160,.85)'); bounce(); buzz(12);
      if (up) { setTimeout(celebrate, 350); setMood('proud', 'Level ' + D.player.level + '! I feel… larger.'); } else setMood('happy', TICK_SAYS[Math.floor(Math.random() * TICK_SAYS.length)]);
    }
    const goal = (id) => D.goals.find((g) => g.id === id);
    function archive(id) { const g = goal(id); if (!g) return; return act({ verb: 'Archived:', name: g.name }, ['gameArchive', id, true], 'gameArchive', [id], (d) => { d.goals = d.goals.filter((x) => x.id !== id); }); }
    // the "undo" of something new is only known when the server gives it an id
    const setRev = (rev) => { const u = stack[stack.length - 1]; if (u && !u.rev) u.rev = rev; };

    /* ---------- banner, undo line, tabs, dock ---------- */
    const dailies = () => D.goals.filter((g) => g.kind === 'daily' && g.dueToday);
    const ritualsLeft = () => dailies().filter((g) => !g.doneToday).length;
    function paintBanner() {
      if (!D) return;
      const p = D.player, nt = night();
      ban.style.background = nt ? 'linear-gradient(180deg,#050a18 0%,#0a1424 55%,#0a1210 100%)' : 'linear-gradient(180deg,#0f3a34 0%,#0b2522 50%,#08110f 100%)';
      $('.uz-moon').style.display = nt ? '' : 'none'; $('.uz-chip').style.display = D.frozen ? '' : 'none';
      me.innerHTML = layers(mood());
      $('.uz-coins b').textContent = p.coins; $('.uz-lv span').textContent = TITLES[p.level] || 'Ancient'; $('.uz-hex i').textContent = p.level;
      $('.xp').style.width = Math.min(100, Math.round(100 * p.xp / p.need)) + '%'; $('.xpt').textContent = p.xp + ' / ' + p.need;
      $('.hp').style.width = Math.round(100 * p.hp / p.maxHp) + '%'; $('.hpt').textContent = p.hp + ' / ' + p.maxHp;
      let say = V.say;
      if (!say) { const left = ritualsLeft(); if (D.frozen) say = 'Day frozen. Streaks are safe. Rest now.'; else if (D.hour >= 19) say = 'Zzz… even old gods rest after seven.'; else if (p.hp < 15) say = 'I feel… unwell. Fewer curses, please.'; else say = left ? left + ' ritual' + (left === 1 ? '' : 's') + ' left today. The tide favours you.' : 'Every ritual done. The deep is pleased.'; }
      $('.uz-say div').textContent = say;
    }
    function paintTop() {
      const L = V.last || {}, cn = L.unit === 'coin' && L.delta, col = L.unit === 'hp' ? '#ff7a66' : String(L.delta || '').charAt(0) === '−' ? '#c9a560' : '#ffd56a';
      $('.uz-undo').innerHTML = '<img src="' + IMG.rune + '" style="width:8px;height:10px;opacity:.8" alt=""><div class="t"><span>' + esc(L.verb || 'The tide is calm.') + '</span><span class="n">' + esc(L.name || '') + '</span><span style="font-weight:700;color:' + col + '">' + esc(L.delta || '') + '</span>' +
        (cn ? coin(14, String(L.delta).replace(/[^0-9]/g, ''), L.name) : '') + (L.unit === 'hp' ? '<img src="' + IMG.heart + '" style="width:11px;height:11px" alt="">' : '') + '</div>' + (stack.length ? '<button data-a="undo">↶ UNDO</button>' : '');
      const left = ritualsLeft(), soon = D.goals.filter((g) => g.kind === 'todo' && !g.doneOn && g.due && diff(D.today, g.due) <= 1).length;
      $('.uz-tabs').innerHTML = ['Rituals', 'Quests', 'Omens', 'Den'].map((l, i) => '<button data-a="tab" data-v="' + i + '" style="color:' + (V.tab === i ? TABC[i] : '#7f9389') + '">' + l +
        ((i === 0 && left) || (i === 1 && soon) ? '<b style="background:' + (i === 0 ? '#5ef2a0' : '#ff7a66') + '">' + (i === 0 ? left : soon) + '</b>' : '') + '</button>').join('') +
        '<div class="uz-ink" style="left:' + (V.tab * 25) + '%"><i style="background:' + TABC[V.tab] + ';box-shadow:0 0 10px ' + TABC[V.tab] + ',0 0 2px ' + TABC[V.tab] + '"></i></div>';
      const K = { pri: ['#5ef2a0', '#5ef2a0', '#08100d'], sec: ['#2f443b', '#131d19', '#cfd8d3'], pur: ['#a48aff', '#a48aff', '#0d0818'], red: ['#ff7a66', '#2a1214', '#ffb3a8'], ice: ['#5aa7ff', D.frozen ? '#5aa7ff' : '#0f1a24', D.frozen ? '#08101a' : '#bfe0ff'] };
      const dk = (label, a, kind, flex, v) => '<button data-a="' + a + '"' + (v ? ' data-v="' + v + '"' : '') + ' style="flex:' + (flex || 1) + ';border-color:' + K[kind][0] + ';background:' + K[kind][1] + ';color:' + K[kind][2] + '">' + label + '</button>';
      let h;
      if (V.form) h = dk('Cancel', 'close', 'sec');
      else if (V.tab === 0) h = dk('+ Ritual', 'form', 'pri', 2, 'ritual') + dk('+ Group', 'form', 'sec', 1, 'group');
      else if (V.tab === 1) h = dk('+ Quest', 'form', 'pur', 1, 'quest') + dk('+ Boss', 'form', 'red', 1, 'boss');
      else if (V.tab === 2) h = dk(D.frozen ? '☾ Day off · tap to undo' : '☾ Sick or off today', 'dayoff', 'ice', 2) + dk('+ Add', 'form', 'sec', 1, 'curse');
      else h = [['room', 'Room'], ['shop', 'Shop'], ['ward', 'Wardrobe'], ['hoard', 'Hoard'], ['chron', 'Chronicle']].map(([k, l]) => '<button class="sm" data-a="den" data-v="' + k + '" style="flex:1;border-color:' + (V.den === k ? '#ffd56a' : '#2a3b33') + ';background:' + (V.den === k ? '#2a2210' : '#131d19') + ';color:' + (V.den === k ? '#ffd56a' : '#a9b8ae') + '">' + l + '</button>').join('') +
        (V.den === 'hoard' ? '<button data-a="form" data-v="reward" style="flex:0 0 46px;border-color:#ffd56a;background:#ffd56a;color:#1a1004;font:700 20px var(--a)">+</button>' : '');
      $('.uz-dock').innerHTML = h;
    }

    /* ---------- Rituals ---------- */
    const rep = (g) => { if (g.everyN) return g.everyN % 7 === 0 ? 'Every ' + (g.everyN === 7 ? 'week' : g.everyN / 7 + ' weeks') : 'Every ' + g.everyN + ' days';
      const d = String(g.days || ''); if (d === '12345') return 'School days'; if (d === '1234567') return 'Every day'; if (d.length === 1) return DN[Number(d) % 7] + 's'; return d.split('').map((x) => DN[Number(x) % 7]).join(', '); };
    const archBtn = (id, col) => V.edit ? '<button class="uz-pen" data-a="arch" data-id="' + id + '" title="Archive"' + (col ? ' style="color:' + col + '"' : '') + '>×</button>' : '';
    function ritualRow(g) {
      const k = KIND[g.track] || KIND.necessary, on = g.doneToday;
      return '<div class="uz-row' + (on ? ' done' : '') + '" style="--e:' + k.c + '"><button class="uz-tk' + (on ? ' on' : g.auto ? ' auto' : '') + '" data-a="tick" data-id="' + g.id + '" data-fx="' + g.id + '" aria-label="' + esc(g.name) + '">' + (on ? '<img src="' + IMG.tick + '" alt="">' : '') + '</button>' +
        '<div class="uz-mid uz-ed" data-a="editg" data-id="' + g.id + '"><div class="nm">' + esc(g.name) + '</div><div class="uz-sub"><span>' + eff(g.minutes) + '</span><span style="color:' + k.c + '">' + k.l + '</span><span>' + esc(rep(g)) + '</span>' +
        (g.streak > 0 ? '<span class="uz-flame"><img src="' + IMG.flame + '" alt="">' + g.streak + '</span>' : '') + '</div></div>' +
        '<div class="uz-pay">' + (g.auto ? '<span class="uz-seal"><img src="' + IMG.seal + '" alt="">ticks itself</span>' : '') + '<span>+' + g.pay + coin(18, g.pay, g.id) + '</span></div>' + archBtn(g.id) + '</div>';
    }
    function header(id, name, plain, meta, metaCol, child) {
      const open = !!V.open[id];
      return '<div class="uz-h" style="border-color:' + (child ? '#1c2924' : '#2a3b33') + '"><button data-a="fold" data-v="' + id + '"><span class="uz-chev" style="transform:rotate(' + (open ? 90 : 0) + 'deg)">▶</span>' +
        '<span class="uz-ht"><b style="font-size:' + (child ? 18 : 22) + 'px;color:' + (child ? '#cfe8dc' : '#e8e1cf') + '">' + esc(name) + '</b></span></button>' +
        (V.renaming === id ? '<input class="uz-ren" data-ren="' + id + '" value="' + esc(name) + '">' : '') +
        '<span class="uz-meta" style="color:' + (metaCol || '#7f9389') + '">' + esc(meta) + '</span><button class="uz-pen" data-a="rename" data-v="' + id + '" title="Rename">✎</button></div>';
    }
    function rituals() {
      const groups = D.groups, items = (gid) => dailies().filter((g) => g.grp === gid), marking = D.goals.filter((g) => g.kind === 'termly').sort((a, b) => ((a.due || '9') < (b.due || '9') ? -1 : 1));
      let h = '';
      groups.forEach((g) => {
        if (g.parent && !V.open[g.parent]) return;
        const child = !!g.parent; let meta = '', metaCol = '';
        if (g.type === 'parent') { let d = 0, t = 0; groups.filter((x) => x.parent === g.id).forEach((x) => { if (x.type === 'list') { const it = items(x.id); t += it.length; d += it.filter((i) => i.doneToday).length; } if (x.type === 'marking') marking.forEach((m) => { t += m.sittings; d += m.sitDone; }); }); meta = d + ' of ' + t; }
        else if (g.type === 'marking') { const dl = marking.map((m) => m.daysLeft).filter((x) => x != null); meta = dl.length ? Math.min.apply(null, dl) + ' days left' : ''; metaCol = '#f2a93b'; }
        else if (g.type === 'summon') meta = D.summoned.filter((s) => s.built).length + ' of ' + D.summoned.length;
        else { const it = items(g.id); meta = it.length ? it.filter((i) => i.doneToday).length + ' of ' + it.length : 'none today'; }
        h += '<div class="uz-sec" style="margin-left:' + (child ? 12 : 0) + 'px">' + header(g.id, g.name, g.plain, meta, metaCol, child);
        if (V.open[g.id]) {
          if (g.type === 'list') h += items(g.id).sort((a, b) => (a.doneToday && !V.settling[a.id]) - (b.doneToday && !V.settling[b.id])).map(ritualRow).join('');
          if (g.type === 'summon') {
            h += D.summoned.map((s) => '<div class="uz-row' + (s.built ? ' done' : '') + '" style="--e:' + (s.ahead ? '#f2a93b' : '#5aa7ff') + '"><span class="uz-tk' + (s.built ? ' on' : ' auto') + '">' + (s.built ? '<img src="' + IMG.tick + '" alt="">' : '') + '</span>' +
              '<div class="uz-mid"><div class="nm">' + esc(s.name) + '</div><div class="uz-sub"><span>for ' + esc(dshort(s.date)) + '</span><span style="color:' + (s.ahead ? '#f2a93b' : '#5aa7ff') + '">' + (s.ahead ? 'Ahead' : 'Necessary') + '</span></div></div><div class="uz-pay"><span class="uz-seal"><img src="' + IMG.seal + '" alt="">ticks itself</span>' + (s.pay ? '<span>+' + s.pay + coin(18, s.pay, s.name) + '</span>' : '') + '</div></div>').join('') || '<p class="uz-p" style="color:#7f9389">No lessons in the next two weeks.</p>';
            const n = D.tide || 0;
            h += '<div class="uz-tide"><div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font:500 17px var(--g);color:#bfe0ff">Tide Charts</span><span style="font:700 13px var(--a);color:#8ac8ff">' + n + ' of 3</span></div>' +
              '<div style="position:relative;height:30px;margin:4px 8px 0"><div style="position:absolute;left:0;right:0;top:13px;height:4px;background:repeating-linear-gradient(90deg,#1d3a4a 0 6px,transparent 6px 9px)"></div><div style="position:absolute;left:0;top:13px;height:4px;width:' + (n <= 1 ? 0 : (n - 1) * 50) + '%;background:#5aa7ff;box-shadow:0 0 8px #5aa7ff;transition:width .4s"></div>' +
              [0, 1, 2].map((i) => '<div style="position:absolute;left:' + i * 50 + '%;top:5px;width:20px;height:20px;margin-left:-10px;border-radius:50%;background:' + (i < n ? '#5aa7ff' : '#0d161c') + ';border:2px solid ' + (i < n ? '#bfe0ff' : '#2a4a5e') + ';box-shadow:' + (i < n ? '0 0 10px #5aa7ff' : 'none') + '"></div>').join('') + '</div>' +
              '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font:12px/1.25 var(--a)">' + ['Next lesson built', 'A week ahead', 'Two weeks ahead · done'].map((l, i) => '<span style="text-align:' + ['left', 'center', 'right'][i] + ';color:' + (i < n ? '#bfe0ff' : '#6f8a9a') + '">' + l + '</span>').join('') + '</div></div>';
          }
          if (g.type === 'marking') h += '<div class="uz-mk">' + marking.map((m) => {
            const n = m.sittings || 1, cls = m.name.replace(/^Mark\s+/i, '').replace(/\s+books\b.*$/i, '');
            const lab = (i) => n === 1 ? 'Marked' : n === 2 ? (i ? '2nd half' : '1st half') : 'Part ' + (i + 1);
            return '<div class="uz-mc"><div class="hd"><b class="uz-ed" data-a="editg" data-id="' + m.id + '">' + esc(cls) + (m.due ? ' <small style="font:600 12px var(--a);color:#f2a93b">by ' + dshort(m.due) + '</small>' : '') + '</b><span>+' + m.pay + coin(13, m.pay, m.id) + '<span style="color:#93a69c;font-weight:400">each</span></span></div><div class="uz-hv" style="grid-template-columns:repeat(' + Math.min(n, 2) + ',1fr)">' +
              Array.from({ length: n }, (_, i) => { const on = i < m.sitDone, a = on ? (i === m.sitDone - 1 ? 'untick' : '') : (i === m.sitDone ? 'tick' : '');
                return '<button class="' + (on ? 'on' : '') + '"' + (a ? ' data-a="' + a + '" data-id="' + m.id + '" data-fx="' + m.id + i + '"' : '') + '>' + (on ? '✓ ' : '') + lab(i) + '</button>'; }).join('') + '</div>' +
              (V.edit ? '<button class="uz-pen" data-a="arch" data-id="' + m.id + '" style="width:auto;height:30px">Archive</button>' : '') + '</div>';
          }).join('') + '<button class="uz-new" data-a="form" data-v="mark">+ Class to mark</button></div>';
        }
        h += '</div>';
      });
      h += '<button class="uz-new" data-a="form" data-v="group">+ New group</button>';
      h += '<button class="uz-new" data-a="edit" style="font:700 13px var(--a)">' + (V.edit ? 'Done editing' : 'Edit (archive rituals)') + '</button>';
      if (D.review && D.review.show) h += review();
      return h;
    }
    function review() {
      const rv = D.review, st = rv.stats, sv = rv.saved || {};
      if (!V.rv || V.rvWeek !== rv.week) { V.rvWeek = rv.week; V.rv = { wentWell: sv.wentWell || '', slipped: sv.slipped || '', p: [sv.p1 || '', sv.p2 || '', sv.p3 || ''] }; }
      const v = V.rv, kinds = [['Necessary', st.necessary, '#5aa7ff'], ['Ahead', st.ahead, '#f2a93b'], ['Outside work', st.outside, '#b07cff'], ['Life', st.life, '#5ee08a']];
      const beatenWk = (D.beaten || []).filter((b) => b.on && b.on >= rv.week).length;
      let h = '<div class="uz-parch uz-rv"><button data-a="rvopen"><img src="' + IMG.wax + '" style="width:20px;height:20px;opacity:' + (rv.saved ? 1 : 0.45) + '" alt=""><span style="flex:1;text-align:left;font:500 19px var(--g)">Sunday review</span>' +
        '<span style="display:flex;align-items:center;gap:3px;font:700 15px var(--a);color:#7a4e14">' + (rv.saved ? 'sealed' : '+20') + coin(17, 20) + '</span><span style="font:700 12px var(--a);transform:rotate(' + (V.rvOpen ? 90 : 0) + 'deg);transition:transform .2s">▶</span></button>';
      if (V.rvOpen) h += '<div style="padding:0 12px 12px;display:flex;flex-direction:column;gap:9px"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">' +
        [[st.ticks, 'ticks'], [st.coins, 'runes'], [beatenWk, 'bosses beaten']].map(([n, l]) => '<div style="padding:6px 8px;border:1px solid #b89e6a;border-radius:3px;background:rgba(255,255,255,.18)"><div style="font:700 20px var(--a)">' + n + '</div><div style="font:12px var(--a);color:#5a4428">' + l + '</div></div>').join('') + '</div>' +
        '<div style="display:flex;height:10px;border-radius:2px;overflow:hidden;border:1px solid #8a6a3a">' + kinds.map((k) => '<div style="flex:' + (k[1] || 0) + ';background:' + k[2] + '"></div>').join('') + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px 10px;font:12px var(--a);color:#4a3420">' + kinds.map((k) => '<span>' + k[0] + ' ' + k[1] + '</span>').join('') + '</div>' +
        '<label>What went well</label><textarea rows="2" data-rv="wentWell" placeholder="Year 10 practical ran smoothly…">' + esc(v.wentWell) + '</textarea>' +
        '<label>What slipped</label><textarea rows="2" data-rv="slipped" placeholder="Book marking fell behind…">' + esc(v.slipped) + '</textarea>' +
        '<label>Three priorities for next week</label>' + [0, 1, 2].map((i) => '<div style="display:flex;align-items:center;gap:8px"><span style="font:700 15px var(--a);width:14px">' + (i + 1) + '</span><input data-rvp="' + i + '" value="' + esc(v.p[i]) + '" placeholder="' + ['Mark the 10S2 test', 'Build lessons two weeks ahead', 'Two evenings with no marking'][i] + '"></div>').join('') +
        (rv.saved ? '<button data-a="seal" data-fx="seal" style="height:40px;border:1px solid #8a1a22;border-radius:4px;background:none;color:#8a1a22;font:500 17px var(--g)">Update the review</button><div style="align-self:center;padding:6px 16px;border:3px double #8a1a22;color:#8a1a22;font:700 20px var(--g);letter-spacing:.1em;transform:rotate(-6deg)">SEALED</div>'
          : '<button data-a="seal" data-fx="seal" style="height:46px;border:none;border-radius:4px;background:#8a1a22;color:#ffe9dc;font:500 19px var(--g);box-shadow:0 2px 0 #3a0a10">Seal the week +20</button>') + '</div>';
      return h + '</div>';
    }

    /* ---------- Quests ---------- */
    function dueChip(due) {
      const dd = diff(D.today, due); let t, bg = 'rgba(0,0,0,.08)', fg = '#5a4428', gl = 'none';
      if (dd < 0) t = 'was due ' + DN[dt(due).getUTCDay()]; else if (dd === 0) { t = 'due today'; bg = '#a3202a'; fg = '#fff0e8'; gl = '0 0 10px rgba(255,90,74,.9)'; } else if (dd === 1) { t = 'due tomorrow'; bg = '#c4502a'; fg = '#fff0e8'; gl = '0 0 6px rgba(255,140,74,.7)'; } else if (dd <= 3) { t = 'due ' + DN[dt(due).getUTCDay()]; bg = '#e8b04a'; fg = '#3a2008'; } else t = 'due ' + dshort(due);
      return '<span class="uz-due" style="background:' + bg + ';color:' + fg + ';box-shadow:' + gl + '">' + t + '</span>';
    }
    function questCard(q) {
      const k = KIND[q.track] || KIND.necessary, done = !!q.doneOn, sd = q.steps.filter((x) => x.d).length;
      return '<div class="uz-parch uz-q' + (done ? ' done' : '') + '" style="--e:' + k.c + '"><div class="top"><button class="uz-tk" data-a="tick" data-id="' + q.id + '" data-fx="' + q.id + '" aria-label="' + esc(q.name) + '">' + (done ? '<img class="uz-stamp" data-q="' + q.id + '" src="' + IMG.wax + '" alt="">' : '') + '</button>' +
        '<div class="uz-mid uz-ed" data-a="editg" data-id="' + q.id + '"><div class="nm">' + esc(q.name) + '</div><div class="uz-sub"><span>' + eff(q.minutes) + '</span><span style="font-weight:700;color:' + k.ink + '">' + k.l + '</span>' + (q.due && !done ? dueChip(q.due) : '') + (q.steps.length ? '<span>☐ ' + sd + ' of ' + q.steps.length + '</span>' : '') + '</div></div>' +
        '<div style="flex:none;display:flex;align-items:center;gap:3px;font:700 16px var(--a);color:#7a4e14">+' + q.pay + coin(18, q.pay, q.id) + '</div>' + archBtn(q.id, '#7a5a34') + '</div>' +
        (q.steps.length && !done ? '<div class="uz-steps">' + q.steps.map((s, i) => '<button data-a="step" data-id="' + q.id + '" data-v="' + i + '"><i style="background:' + (s.d ? '#6a4a2a' : 'transparent') + '">' + (s.d ? '✓' : '') + '</i><span style="font:14px var(--a);text-decoration:' + (s.d ? 'line-through' : 'none') + ';color:' + (s.d ? '#7a6040' : '#2a1a12') + '">' + esc(s.t) + '</span></button>').join('') + '</div>' : '') + '</div>';
    }
    const creature = (b) => b.creature || SIZE[b.size || 5].k;
    function bossCard(b) {
      const k = creature(b), spr = P.bosses[k] || P.bosses.spawn, meta = P.bossMeta[k] || P.bossMeta.spawn, n = b.stages.length, arm = V.banishArm === b.id, open = V.open[b.id] !== 0;
      return '<div class="uz-boss"><button data-a="fold" data-v="' + b.id + '" data-def="1"><div class="uz-cr"><img data-creature="' + b.id + '" src="' + spr.src + '" style="width:' + Math.min(68, spr.w * 2) + 'px;height:auto;filter:drop-shadow(0 2px 0 #000)" alt=""></div>' +
        '<div style="flex:1;min-width:0"><div style="font:500 19px/1.05 var(--g);color:#f4e0d8">' + esc(b.name) + '</div><div style="margin-top:3px;font:12px var(--a);color:#c49a94">' + esc(meta.size || b.size + 'h') + ' · ' + esc(meta.name) + ' · ' + b.stages.filter((x) => x.done).length + ' of ' + n + ' stages</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:6px"><div class="uz-hpb"><i style="width:' + b.hp + '%"></i></div><span style="font:700 12px var(--a);color:#ffb3a8">' + b.hp + '/100</span></div></div></button>' +
        (open ? '<div style="padding:0 10px 8px;display:flex;flex-direction:column;gap:5px">' + b.stages.map((st, i) => {
          let tag, f, bg, bd; const over = !st.done && st.due && st.due < D.today;
          if (st.done && !st.late) { tag = '−' + Math.round(100 / n) + ' hit'; f = '#ffd0c4'; bg = '#5a1a20'; bd = '#a3202a'; } else if (st.done) { tag = '−' + Math.round(50 / n) + ' late'; f = '#ffd0c4'; bg = '#3a1418'; bd = '#6a2a2e'; }
          else if (over) { tag = 'overdue'; f = '#ff9a85'; bg = 'transparent'; bd = '#ff7a66'; } else if (st.due === D.today) { tag = 'today'; f = '#3a2008'; bg = '#e8b04a'; bd = '#e8b04a'; } else if (st.due) { tag = diff(D.today, st.due) + ' days'; f = '#b08a84'; bg = 'transparent'; bd = '#3a1a1e'; } else { tag = 'no date'; f = '#b08a84'; bg = 'transparent'; bd = '#3a1a1e'; }
          return '<div class="uz-st"><button class="uz-tk' + (st.done ? ' on' : '') + '" data-a="stage" data-id="' + b.id + '" data-v="' + i + '" data-fx="' + b.id + 's' + i + '">' + (st.done ? '<img src="' + IMG.tick + '" style="width:20px;height:16px" alt="">' : '') + '</button>' +
            '<div style="flex:1;min-width:0"><div style="font:700 14px var(--a);color:#f0e0d8;text-decoration:' + (st.done ? 'line-through' : 'none') + '">' + esc(st.name) + '</div><div style="font:12px var(--a);color:#b08a84">' + (st.due ? 'by ' + dshort(st.due) : '') + '</div></div>' +
            '<span class="uz-tag" style="color:' + f + ';background:' + bg + ';border-color:' + bd + '">' + tag + '</span></div>';
        }).join('') + '<div style="display:flex;align-items:center;justify-content:space-between;padding-top:2px"><span style="display:flex;align-items:center;gap:4px;font:700 13px var(--a);color:#f0c45a">' + b.reward + coin(16, b.reward, b.id, 'boss') + '<span style="color:#c49a94;font-weight:400">+ trophy when beaten</span></span>' +
          '<button data-a="banish" data-id="' + b.id + '" style="height:40px;padding:0 10px;border:1px solid ' + (arm ? '#ff7a66' : '#4a2a2e') + ';border-radius:4px;background:' + (arm ? '#4a1418' : 'transparent') + ';color:' + (arm ? '#ffd0c4' : '#b08a84') + ';font:700 12px var(--a)">' + (arm ? 'Tap again to banish' : 'Banish') + '</button></div></div>' : '') + '</div>';
    }
    function quests() {
      const qs = D.goals.filter((g) => g.kind === 'todo'), isLife = (q) => q.grp === 'life', fresh = (q) => !q.doneOn || V.settling[q.id];
      let h = '';
      [['qteach', 'The Errand Scrolls', 'Teaching quests', (q) => !isLife(q)], ['qlife', 'Surface Errands', 'Life quests', isLife]].forEach(([id, name, plain, f]) => {
        const list = qs.filter((q) => f(q) && fresh(q)).sort((a, b) => ((a.due || '9') < (b.due || '9') ? -1 : 1));
        h += '<div class="uz-sec"><button class="uz-cap" data-a="fold" data-v="' + id + '"><span class="uz-chev" style="color:#a48aff;transform:rotate(' + (V.open[id] ? 90 : 0) + 'deg)">▶</span><span><b style="color:#d8ccff">' + name + '</b></span><span style="font:700 12px var(--a);color:#a48aff">' + list.filter((q) => !q.doneOn).length + ' open</span></button>' +
          (V.open[id] ? list.map(questCard).join('') || '<p class="uz-p" style="color:#7f7a99">No quests here.</p>' : '') + '</div>';
      });
      const fin = qs.filter((q) => q.doneOn && !V.settling[q.id]);
      if (fin.length) h += '<div class="uz-sec"><button class="uz-cap" data-a="fold" data-v="qdone"><span class="uz-chev" style="color:#a48aff;transform:rotate(' + (V.open.qdone ? 90 : 0) + 'deg)">▶</span><span><b style="color:#d8ccff">Finished</b></span><span style="font:700 12px var(--a);color:#a48aff">' + fin.length + '</span></button>' + (V.open.qdone ? fin.map(questCard).join('') : '') + '</div>';
      h += '<div class="uz-cap" style="border-color:#3a1a1e"><span><b style="color:#ffb3a8">The Boss Pit</b></span><span style="font:700 12px var(--a);color:#ff7a66">' + D.bosses.length + ' active</span></div>';
      h += D.bosses.map(bossCard).join('') || '<p class="uz-p" style="color:#8a6a6a">No bosses yet.</p>';
      const bt = D.beaten || [];
      if (bt.length) h += '<button class="uz-cap" data-a="vanq" style="border:none;color:#8a7a74;font:500 17px var(--g)"><span class="uz-chev" style="color:#8a7a74;transform:rotate(' + (V.vanq ? 90 : 0) + 'deg)">▶</span>Vanquished · ' + bt.length + '</button>' +
        (V.vanq ? bt.map((b) => '<div style="display:flex;align-items:center;gap:10px;padding:4px 8px;border-radius:4px;background:#140c0d;border:1px solid #2a1a1c;opacity:.8"><img src="' + (P.bosses[b.k] || P.bosses.spawn).src + '" style="height:26px;filter:grayscale(.7)" alt=""><span style="flex:1;font:14px var(--a);color:#c4b0aa;text-decoration:line-through">' + esc(b.name) + '</span><img src="' + IMG.trophy + '" style="width:16px;height:16px" alt=""></div>').join('') : '');
      // (the late-work rule line was removed 2026-10-25: Patryk found the small explanations cluttering)
      h += '<button class="uz-new" data-a="edit" style="font:700 13px var(--a)">' + (V.edit ? 'Done editing' : 'Edit (remove quests)') + '</button>';
      return h;
    }

    /* ---------- Omens (curses and blessings; tab renamed by Patryk 2026-10-25) ---------- */
    const isBless = (g) => g.kind === 'habit' && g.polarity !== 'minus', isCurse = (g) => g.kind === 'habit' && g.polarity !== 'plus';
    const blessIcon = (g) => { const m = BLESS_IC.find((x) => x[1].test(g.name)); return (m && P.bless[m[0]] ? P.bless[m[0]] : P.spark).src; };
    function curses() {
      const cs = D.goals.filter(isCurse), bs = D.goals.filter(isBless), cnt = D.blessCount || 0, cpos = cnt % 8, p = D.player;
      let h = '<div class="uz-cap" style="border-color:#3a1a1e"><span><b style="color:#ffb3a8">The Cursed Shelf</b></span></div>';
      h += cs.map((c) => '<div class="uz-curse"><button class="uz-tk" data-a="curse" data-id="' + c.id + '" data-fx="' + c.id + '" aria-label="Slipped: ' + esc(c.name) + '"><img src="' + IMG.skull + '" alt=""></button>' +
        '<div class="uz-mid uz-ed" data-a="editg" data-id="' + c.id + '"><div class="nm" style="color:#f0e0d8">' + esc(c.name) + '</div><div class="uz-sub" style="color:#b08a84">' + eff(c.minutes) + ' · ' + (c.count ? c.count + '× today' : 'not today') + '</div></div>' +
        '<span style="flex:none;display:flex;align-items:center;gap:4px;font:700 16px var(--a);color:#ff7a66">−' + c.hpLoss + '<img src="' + IMG.heart + '" style="width:13px;height:13px" alt=""></span>' + archBtn(c.id) + '</div>').join('') || '<p class="uz-p" style="color:#b08a84">No curses. Tap + Add.</p>';
      if (p.hp <= 12) h += '<p class="uz-p" style="color:#b08a84">' + 'Careful: ' + p.hp + ' HP left.' + '</p>';
      h += '<div class="uz-cap" style="border-color:#1e3a2c;margin-top:6px"><span><b style="color:#b6ffd6">Small Blessings</b></span><span style="font:700 12px var(--a);color:#b6ffd6">' + cnt + ' today</span></div>';
      h += bs.length ? '<div class="uz-bl">' + bs.map((g) => { const f = g.featured, n = g.count || 0;
        return '<button class="uz-bt" data-a="bless" data-id="' + g.id + '" data-fx="' + g.id + '" style="background:' + (f ? 'linear-gradient(180deg,#2a2410,#151208)' : 'linear-gradient(180deg,#152a20,#0e1a15)') + ';border:1.5px solid ' + (f ? '#8a6a2a' : n ? '#2f6a4e' : '#23483a') + (n ? ';box-shadow:0 2px 0 #030806,inset 0 0 18px rgba(94,242,160,.12)' : '') + '">' +
          '<span style="display:flex;align-items:center;gap:7px"><span class="uz-halo" style="background:radial-gradient(circle,' + (f ? 'rgba(255,214,106,.45)' : 'rgba(94,242,160,.35)') + ' 0%,transparent 70%)"><img src="' + blessIcon(g) + '" alt=""></span><span style="flex:1;min-width:0;font:700 14px/1.15 var(--a);color:#e0f5ea">' + esc(g.name) + '</span></span>' +
          '<span style="display:flex;align-items:center;justify-content:space-between"><span style="display:flex;align-items:center;gap:3px;font:700 14px var(--a);color:#f0c45a">+' + g.pay + coin(15, g.pay, g.id) + '</span><span style="display:flex;gap:3px">' +
          [0, 1, 2, 3, 4].map((i) => '<span style="width:7px;height:7px;border-radius:1px;background:' + (i < n ? (f ? '#ffd56a' : '#5ef2a0') : '#1d3a2c') + ';box-shadow:' + (i < n ? '0 0 4px rgba(94,242,160,.7)' : 'none') + '"></span>').join('') + '</span></span>' +
          (f ? '<span class="uz-x2">×2 TODAY</span>' : '') + '</button>'; }).join('') + '</div>' : '<p class="uz-p" style="color:#6f8a7c">No blessings yet.</p>';
      if (V.edit && bs.length) h += '<div class="uz-chips">' + bs.map((g) => '<button data-a="arch" data-id="' + g.id + '">× ' + esc(g.name) + '</button>').join('') + '</div>';
      h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:5px;background:#0e1a15;border:1px solid #1e3a2c"><img src="' + IMG.spark + '" style="width:16px;height:16px" alt=""><div style="flex:1;display:flex;flex-direction:column;gap:4px"><span style="font:12px var(--a);color:#a9c8b8">Blessing chain · every 8 in a day pays <b style="color:#f0c45a">+10 bonus</b></span>' +
        '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:3px">' + Array.from({ length: 8 }, (_, i) => '<div style="height:6px;border-radius:1px;background:' + (i < cpos ? '#5ef2a0' : '#1d3a2c') + ';box-shadow:' + (i < cpos ? '0 0 5px rgba(94,242,160,.7)' : 'none') + '"></div>').join('') + '</div></div><span style="font:700 14px var(--a);color:#b6ffd6">' + cpos + ' / 8</span></div>';
      h += '<div class="uz-cap" style="border-color:#1e3040;margin-top:6px"><span><b style="color:#bfe0ff">The Frozen Tide</b></span></div>';
      h += (D.freezes || []).map((f) => '<div style="display:flex;align-items:center;gap:10px;min-height:44px;padding:4px 10px;border-radius:5px;background:#0e1820;border:1px solid #1e3444"><img src="' + IMG.moon + '" style="width:14px;height:14px" alt=""><span style="flex:1;font:14px var(--a);color:#d0e4f4">' + esc(f.name) + '</span><span style="font:12px var(--a);color:#8aa4b8">' + (f.name === 'Holidays' ? 'from ' : '') + esc(dshort(f.day)) + ' · freezes itself</span></div>').join('');
      h += '<button class="uz-new" data-a="edit" style="font:700 13px var(--a)">' + (V.edit ? 'Done editing' : 'Edit') + '</button>';
      return h;
    }

    /* ---------- Den: his real room and shop (120 drawn items), the wardrobe, the Hoard, the Chronicle ---------- */
    function roomHtml() {
      const u = (style2) => '<div style="position:absolute;' + style2 + ';aspect-ratio:1">' + layers(mood()) + '</div>';
      if (!ROOM) return '<div class="uz-scene" style="height:240px">' + u('left:40%;top:40%;width:20%') + '</div>';
      const put = (l) => '<img src="' + l.art + '" style="left:' + (100 * l.ox / ROOM.w) + '%;top:' + (100 * l.oy / ROOM.h) + '%;width:' + (100 * l.w / ROOM.w) + '%" alt="">';
      const slots = Object.keys(D.room || {}).filter((sl) => D.room[sl] && ROOM.art[D.room[sl]] && ROOM.art[D.room[sl]][sl]).sort((a, b) => (ROOM.z[a] || 0) - (ROOM.z[b] || 0));
      const me2 = u('left:' + (100 * ROOM.ulhu.x / ROOM.w) + '%;top:' + (100 * ROOM.ulhu.y / ROOM.h) + '%;width:' + (100 * 32 / ROOM.w) + '%');
      let h = '<div class="uz-scene" style="aspect-ratio:' + ROOM.w + '/' + ROOM.h + (night() ? ';filter:brightness(.7) saturate(.85)' : '') + '">', done = false;
      slots.forEach((sl) => { if (!done && (ROOM.z[sl] || 0) > 6) { h += me2; done = true; } h += put(ROOM.art[D.room[sl]][sl]); });
      return h + (done ? '' : me2) + '<div style="position:absolute;left:10px;top:8px;font:500 18px var(--g);color:#cfe8dc;text-shadow:0 2px 0 #000">Ulhu\'s Den</div></div>';
    }
    function den() {
      let h = '';
      if (V.den === 'room') {
        h += roomHtml();
        const names = {}; (SHOP ? SHOP.items : []).forEach((i) => { names[i.id] = i.name; });
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' + Object.keys(SLOTL).map((sl) => { const id = (D.room || {})[sl];
          return '<div style="display:flex;align-items:center;gap:8px;min-height:48px;padding:3px 4px 3px 8px;border-radius:5px;background:#131d19;border:1px solid #23332c"><span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font:700 11px var(--a);letter-spacing:.1em;color:#7f9389;text-transform:uppercase">' + SLOTL[sl] + '</span><span style="font:13px var(--a);color:' + (id ? '#e0e8e3' : '#5a6a62') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(id ? names[id] || 'placed' : 'empty') + '</span></span>' +
            (id && sl !== 'floor' && sl !== 'wall' ? '<button data-a="unplace" data-id="' + id + '" data-v="' + sl + '" style="flex:none;width:40px;height:40px;border:none;background:none;color:#7f9389;font:16px var(--a)" title="Take out">×</button>' : '') + '</div>'; }).join('') + '</div>';
        h += '<div class="uz-seg" style="grid-template-columns:1fr 1fr">' + ['8-bit', '16-bit'].map((s) => '<button data-a="style" data-v="' + s + '" class="' + (style === s ? 'on' : '') + '"' + (style === s ? ' style="color:#b6ffd6"' : '') + '>' + s + ' Ulhu</button>').join('') + '</div>';
      }
      if (V.den === 'shop') {
        if (!SHOP || !ROOM) return '<p class="uz-p" style="color:#7f9389">Opening the shop…</p>';
        const icon = (c) => { const it = SHOP.items.find((i) => i.category === c), L = it && ROOM.art[it.id] && ROOM.art[it.id][it.slots[0]]; return L ? '<img src="' + L.art + '" style="height:22px;width:auto;max-width:26px" alt="">' : ''; };
        h += '<div class="uz-hscroll" data-hscroll="1">' + CATS.map(([c, l]) => '<button class="uz-pill' + (V.shopCat === c ? ' on' : '') + '" data-a="cat" data-v="' + c + '">' + icon(c) + l + '</button>').join('') + '</div>';
        h += '<div class="uz-seg" style="grid-template-columns:repeat(5,1fr)">' + ['All', 'Basic', 'Nice', 'Fancy', 'Eldritch'].map((t) => '<button data-a="tier" data-v="' + t + '" class="' + (V.tier === t ? 'on' : '') + '"' + (V.tier === t ? ' style="color:' + (TIERC[t] || '#e8e1cf') + '"' : '') + '>' + t + '</button>').join('') + '</div>';
        h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">' + SHOP.items.filter((i) => i.category === V.shopCat && (V.tier === 'All' || i.tier === V.tier)).map((i) => {
          const L = ROOM.art[i.id] && ROOM.art[i.id][i.slots[0]], placed = !!i.slot, lk = i.locked && !i.own, poor = i.price > D.player.coins;
          let btn, bg, fg, cn = false;
          if (placed) { btn = 'Take out'; bg = '#173a2c'; fg = '#b6ffd6'; } else if (i.own) { btn = 'Place'; bg = '#5ef2a0'; fg = '#08100d'; } else if (lk) { btn = esc(i.why || 'Locked'); bg = '#1a1a24'; fg = '#7a7a99'; } else if (!i.price) { btn = 'Free'; bg = '#5ef2a0'; fg = '#08100d'; } else { btn = String(i.price); cn = true; bg = poor ? '#1e1a12' : '#3a2a10'; fg = poor ? '#7a6a4a' : '#ffd56a'; }
          const z = L ? Math.min(2, 50 / L.h, 62 / L.w) : 1;
          return '<button class="uz-card" data-a="shop" data-id="' + i.id + '" data-fx="' + i.id + '" style="border-color:' + (placed ? '#5ef2a0' : '#23332c') + '"><span style="height:64px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 60%,' + (i.tier === 'Eldritch' ? '#1d4a38' : i.tier === 'Fancy' ? '#2a2244' : '#1a2a24') + ',#0b1311 75%)">' +
            (L ? '<img src="' + L.art + '" style="width:' + Math.round(L.w * z) + 'px;height:auto;filter:' + (i.tier === 'Eldritch' ? 'drop-shadow(0 0 4px #5ef2a0)' : 'none') + (lk ? ' grayscale(1) brightness(.6)' : '') + '" alt="">' : '') + '</span>' +
            '<span style="padding:5px 6px 0;font:700 12px/1.2 var(--a);color:#e0e8e3;min-height:34px">' + esc(i.name) + '</span><span style="padding:0 6px 4px;font:700 11px var(--a);color:' + TIERC[i.tier] + '">' + i.tier + '</span>' +
            '<span style="height:36px;display:flex;align-items:center;justify-content:center;gap:3px;background:' + bg + ';color:' + fg + ';font:700 12px var(--a);padding:0 4px;text-align:center">' + btn + (cn ? coin(13, i.price, i.id) : '') + '</span></button>';
        }).join('') + '</div><div style="text-align:center;font:12px var(--a);color:#6f8178">' + SHOP.items.length + ' items · 10 categories · Basic, Nice, Fancy, Eldritch</div>';
      }
      if (V.den === 'ward') {
        const W = D.wear || { on: {}, owned: [] }, baseIdle = (style === '8-bit' ? A.b8 : A.b16).idle;
        h += '<div style="display:flex;gap:10px;align-items:stretch"><div style="flex:none;width:118px;border-radius:6px;background:radial-gradient(circle at 50% 70%,#1f3a32,#0b1311 75%);border:1px solid #2a3b33;display:flex;align-items:center;justify-content:center"><div style="position:relative;width:96px;height:96px">' + layers(mood()) + '</div></div>' +
          '<div style="flex:1;display:flex;flex-direction:column;gap:5px">' + [['HAT', 'hat'], ['TOP', 'top'], ['FACE', 'face'], ['HELD', 'held'], ['SKIN', 'skin']].map(([l, k]) => '<div style="display:flex;justify-content:space-between;gap:6px;font:12px var(--a);padding:3px 0;border-bottom:1px solid #1c2924"><span style="color:#7f9389;font-weight:700;letter-spacing:.08em">' + l + '</span><span style="color:#e0e8e3;text-align:right">' + esc((witem(W.on[k]) || { name: '—' }).name) + '</span></div>').join('') + '</div></div>';
        h += '<div class="uz-seg" style="grid-template-columns:repeat(5,1fr)">' + WCATS.map(([c, l, n]) => '<button data-a="wcat" data-v="' + c + '" class="' + (V.wCat === c ? 'on' : '') + '" style="height:40px;' + (V.wCat === c ? 'color:#b6ffd6' : '') + '">' + l + '<br><span style="font-weight:400;font-size:11px">' + n + '</span></button>').join('') + '</div>';
        h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">' + WNAMES[V.wCat].map((_, i) => { const w = witem(V.wCat + '-' + i), own = W.owned.indexOf(w.id) >= 0, on = W.on[w.cat] === w.id, lk = w.lock > D.player.level, sk = w.cat === 'skin', gr = lk ? ' grayscale(1) brightness(.6)' : '';
          let st, fg, cn = false; if (on) { st = 'wearing'; fg = '#5ef2a0'; } else if (own) { st = 'owned'; fg = '#cfd8d3'; } else if (lk) { st = 'Level ' + w.lock; fg = '#7a7a99'; } else { st = String(w.price); fg = w.price > D.player.coins ? '#7a6a4a' : '#ffd56a'; cn = true; }
          return '<button class="uz-card" data-a="wear" data-id="' + w.id + '" data-fx="' + w.id + '" style="align-items:center;padding:0 0 4px;border-color:' + (on ? '#5ef2a0' : '#23332c') + '"><span style="position:relative;width:100%;height:58px;background:radial-gradient(circle,' + (on ? '#1d4a38' : '#1a2a24') + ',#0b1311 75%)"><span style="position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px">' +
            '<img src="' + baseIdle + '" class="uz-lay" style="opacity:' + (sk ? 1 : 0.35) + ';filter:' + (sk ? w.filter : 'none') + gr + '" alt="">' + (sk ? '' : '<img src="' + w.src + '" class="uz-lay" style="filter:' + w.filter + gr + '" alt="">') + '</span></span>' +
            '<span style="padding:3px 4px 2px;font:700 11px/1.15 var(--a);color:#e0e8e3;text-align:center;min-height:28px">' + esc(w.name) + '</span><span style="display:flex;align-items:center;gap:2px;font:700 11px var(--a);color:' + fg + '">' + st + (cn ? coin(11, w.price, w.id) : '') + '</span></button>'; }).join('') + '</div>';
      }
      if (V.den === 'hoard') {
        h += '<div class="uz-cap" style="border-color:#3a3018"><span><b style="color:#ffd56a">The Hoard</b></span></div>';
        h += (D.hoard || []).map((r) => { const can = r.cost <= D.player.coins, more = r.cost - D.player.coins;
          return '<div class="uz-parch" style="position:relative;display:flex;align-items:center;gap:10px;min-height:56px;padding:5px 6px 5px 12px;border-left:5px dotted #a88a5a"><div style="flex:1;min-width:0"><div style="font:17px/1.15 var(--f)">' + esc(r.name) + '</div><div style="font:12px var(--a);color:#5a4428;margin-top:2px">' +
            (r.claims ? 'claimed ' + r.claims + '× · ' + (can ? 'you can afford it' : more + ' more to go') : (can ? 'never claimed · you can afford it' : more + ' more to go')) + '</div></div>' +
            (V.edit ? '<button class="uz-pen" data-a="harch" data-id="' + r.id + '" style="color:#7a5a34">×</button>' : '') +
            '<button data-a="claim" data-id="' + r.id + '" data-fx="' + r.id + '" style="flex:none;height:44px;min-width:92px;display:flex;align-items:center;justify-content:center;gap:4px;padding:0 10px;border-radius:4px;border:none;background:' + (can ? '#8a1a22' : '#b8a074') + ';color:' + (can ? '#ffe9dc' : '#6a5434') + ';font:700 14px var(--a);box-shadow:0 2px 0 rgba(0,0,0,.35)">' + r.cost + coin(16, r.cost, r.id) + '</button>' +
            (V.stamp === r.id ? '<div class="uz-stampbox" style="position:absolute;right:110px;top:50%;margin-top:-22px;width:120px;height:44px;display:flex;align-items:center;justify-content:center;gap:6px;border:3px double #8a1a22;border-radius:4px;color:#8a1a22;font:700 20px var(--g);letter-spacing:.12em;transform:rotate(-10deg);background:rgba(243,231,200,.7);pointer-events:none"><img src="' + IMG.wax + '" style="width:22px;height:22px" alt="">CLAIMED</div>' : '') + '</div>'; }).join('') ||
          '<p class="uz-p" style="color:#8a7a5a">No rewards yet.</p>';
        if ((D.hoard || []).length) h += '<button class="uz-new" data-a="edit" style="font:700 13px var(--a)">' + (V.edit ? 'Done editing' : 'Edit (remove rewards)') + '</button>';
      }
      if (V.den === 'chron') {
        if (!CHRON) return '<p class="uz-p" style="color:#7f9389">Reading the Chronicle…</p>';
        const mx = Math.max.apply(null, CHRON.weeks.map((w) => w.coins).concat([1]));
        h += '<div class="uz-stone"><div class="hd"><b>Runes per week</b><span style="font:700 12px var(--a);color:#f0c45a">' + D.weekCoins + ' this week</span></div><div style="display:flex;align-items:flex-end;gap:6px;height:84px;margin-top:8px">' +
          CHRON.weeks.map((w, i) => { const last = i === CHRON.weeks.length - 1; return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end"><span style="font:700 11px var(--a);color:#c9a560">' + w.coins + '</span><div style="width:100%;height:' + Math.max(4, Math.round(w.coins / mx * 58)) + 'px;background:repeating-linear-gradient(180deg,' + (last ? '#ffd56a' : '#c48a3a') + ' 0 4px,' + (last ? '#e3a93a' : '#8a5a1c') + ' 4px 6px);border:1px solid #4a2c0c"></div></div>'; }).join('') + '</div>' +
          '<div style="display:flex;gap:6px;margin-top:4px">' + CHRON.weeks.map((w) => { const d = dt(w.mon); return '<span style="flex:1;text-align:center;font:11px var(--a);color:#7f9389">' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + '</span>'; }).join('') + '</div></div>';
        h += '<div class="uz-stone"><div class="hd"><b>Streak calendar</b><span style="display:flex;gap:8px;font:11px var(--a);color:#7f9389"><span style="color:#5ef2a0">■ ticked</span><span style="color:#5aa7ff">■ frozen</span></span></div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:8px">' +
          ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((c) => '<span style="text-align:center;font:700 11px var(--a);color:#61756b">' + c + '</span>').join('') +
          CHRON.days.map((d) => { let bg = '#0b1311', bd = d.today ? '#fff' : '#141e1a', gl = 'none';
            if (!d.future) { if (d.frozen && !d.n) { bg = '#1d3a5a'; if (!d.today) bd = '#5aa7ff'; } else { const lv = d.n === 0 ? 0 : d.n < 3 ? 1 : d.n < 6 ? 2 : 3; bg = ['#132a1e', '#1d6a42', '#2fae6a', '#5ef2a0'][lv]; if (lv === 3) gl = '0 0 6px rgba(94,242,160,.6)'; if (!d.today) bd = '#0b1311'; } }
            return '<div title="' + d.day + ': ' + d.n + '" style="height:22px;border-radius:2px;background:' + bg + ';border:1px solid ' + bd + ';box-shadow:' + gl + '"></div>'; }).join('') + '</div></div>';
        h += '<div class="uz-stone" style="padding-bottom:0"><div class="hd"><b>Trophy shelf</b><span style="font:700 12px var(--a);color:#ff7a66">' + CHRON.beaten.length + ' bosses beaten</span></div><div style="display:flex;align-items:flex-end;gap:10px;min-height:64px;padding:8px 4px 0;overflow-x:auto" data-hscroll="1">' +
          (CHRON.beaten.map((b) => '<div style="flex:none;display:flex;flex-direction:column;align-items:center;gap:2px"><img src="' + (P.bosses[b.k] || P.bosses.spawn).src + '" style="height:' + ({ spawn: 30, mite: 30, shog: 34, deep: 36, levi: 38, gaunt: 38, old: 46, yog: 46 }[b.k] || 34) + 'px;filter:sepia(1) saturate(2.4) hue-rotate(-12deg) brightness(1.05) drop-shadow(0 0 4px rgba(255,214,106,.4))" alt=""><span style="font:11px var(--a);color:#c9a560;max-width:70px;text-align:center;line-height:1.1">' + esc(b.name) + '</span></div>').join('') || '<span style="font:12px var(--a);color:#7f9389;padding-bottom:10px">Beat a boss to put its trophy here.</span>') +
          '</div><div style="height:10px;margin:4px -12px 0;background:linear-gradient(180deg,#8a5a34,#5a3a20);border-top:2px solid #b8843a;border-radius:0 0 5px 5px"></div></div>';
      }
      return h;
    }

    /* ---------- forms (in place of the list, never over it) ---------- */
    const FORMS = {
      ritual: () => ({ name: '', len: 15, kind: 'necessary', rep: 'school', days: [1, 3, 5], n: 3, unit: 'days', group: 'chores' }),
      quest: () => ({ name: '', len: 30, kind: 'necessary', due: '', grp: 'teach', steps: [] }),
      mark: () => ({ name: 'Mark  books', len: 60, sittings: 2, due: '' }),
      boss: () => ({ name: '', size: 5, k: 'shog', steps: [{ n: '', by: addD(D.today, 3) }] }),
      group: () => ({ name: '', parent: 'top' }), reward: () => ({ name: '', cost: 80 }), curse: () => ({ name: '', len: 30, type: 'curse' }) };
    const pay = (len, kind) => Math.round((D.table.base[len] || 6) * (D.table.mult[kind] || 1));
    // an existing ritual, quest, curse, blessing or marking class opened in its form (Patryk 2026-10-26: edit after setting)
    const formKind = (g) => ({ daily: 'ritual', todo: 'quest', termly: 'mark' }[g.kind] || 'curse');
    function draftOf(g) {
      const base = { id: g.id, name: g.name, len: g.minutes, grp0: g.grp, priv: g.private };
      if (g.kind === 'daily') { const ds = String(g.days || ''), e = Number(g.everyN) || 0;
        return Object.assign(base, { kind: g.track, rep: e ? 'every' : ds === '12345' ? 'school' : 'days', days: ds.split('').map((x) => Number(x) % 7), n: e ? (e % 7 === 0 ? e / 7 : e) : 3, unit: e && e % 7 === 0 ? 'weeks' : 'days', group: g.grp }); }
      if (g.kind === 'todo') return Object.assign(base, { kind: g.track, due: g.due || '', grp: g.grp === 'life' ? 'life' : 'teach', steps: (g.steps || []).map((x) => ({ n: x.t, d: !!x.d })) });
      if (g.kind === 'termly') return Object.assign(base, { sittings: g.sittings || 2, due: g.due || '' });
      return Object.assign(base, { type: g.polarity === 'minus' ? 'curse' : 'bless' });
    }
    // what the server is sent for a form (new or edited)
    function goalOf(f, d) {
      const nm = d.name.trim(), o = { id: d.id, name: nm, minutes: d.len, private: d.priv };
      if (f === 'ritual') return Object.assign(o, { track: d.kind, kind: 'daily', grp: d.group, days: d.rep === 'school' ? '12345' : d.rep === 'days' ? d.days.map((x) => x || 7).sort().join('') : '', everyN: d.rep === 'every' ? d.n * (d.unit === 'weeks' ? 7 : 1) : '' });
      if (f === 'quest') return Object.assign(o, { track: d.kind, kind: 'todo', grp: d.grp, due: d.due || '', steps: d.steps.filter((x) => x.n.trim()).map((x) => ({ t: x.n.trim(), d: !!x.d })) });
      if (f === 'mark') return Object.assign(o, { track: 'necessary', kind: 'termly', grp: d.grp0 || 'marking', sittings: d.sittings, due: d.due || '' });
      return Object.assign(o, { kind: 'habit', polarity: d.type === 'curse' ? 'minus' : 'plus', track: 'life', grp: d.grp0 || '' });
    }
    const dateRow = (label, v) => '<div style="display:flex;flex-direction:column;gap:5px"><span class="uz-lbl">' + label + '</span><div class="uz-date"><input type="date" data-due="1" value="' + esc(v || '') + '">' + (v ? '<button data-a="nodue">No date</button>' : '') + '</div></div>';
    function form() {
      const f = V.form, d = V.draft;
      const chip = (label, sel, a, v, col, img) => '<button data-a="' + a + '" data-v="' + esc(v) + '" style="border-color:' + (sel ? (col || '#5ef2a0') : '#2f443b') + ';background:' + (sel ? '#173a2c' : '#131d19') + ';color:' + (sel ? (col || '#b6ffd6') : '#cfd8d3') + '">' + (img ? '<img src="' + img + '" alt="">' : '') + esc(label) + '</button>';
      const row = (label, chips) => '<div style="display:flex;flex-direction:column;gap:5px"><span class="uz-lbl">' + label + '</span><div class="uz-chips">' + chips.join('') + '</div></div>';
      const lenRow = row('SIZE', LENS.map((n) => chip(EFF[n], d.len === n, 'd', 'len:' + n)));
      const kindRow = row('KIND', Object.keys(KIND).map((k) => chip(KIND[k].l, d.kind === k, 'd', 'kind:' + k, KIND[k].c)));
      let title, ph, col = '#5ef2a0', rows = '', payL = '', payV = '', payC = '#ffd56a', payCoin = true, go = '', goBg = '#5ef2a0', steps = '';
      if (f === 'ritual') { title = d.id ? 'Edit ritual' : 'New ritual'; ph = 'What is the ritual?';
        rows = lenRow + kindRow + row('REPEATS', [['school', 'School days'], ['days', 'Chosen days'], ['every', 'Every N']].map(([k, l]) => chip(l, d.rep === k, 'd', 'rep:' + k)));
        if (d.rep === 'days') rows += row('WHICH DAYS', [1, 2, 3, 4, 5, 6, 0].map((i) => chip(DN[i], d.days.indexOf(i) >= 0, 'dday', i)));
        if (d.rep === 'every') rows += row('EVERY', [1, 2, 3, 4, 5].map((n) => chip(String(n), d.n === n, 'd', 'n:' + n)).concat(['days', 'weeks'].map((u) => chip(u, d.unit === u, 'd', 'unit:' + u))));
        rows += row('GROUP', D.groups.filter((g) => g.type === 'list').map((g) => chip(g.name, d.group === g.id, 'd', 'group:' + g.id)));
        payL = 'Pays ' + D.table.base[d.len] + ' × ' + D.table.mult[d.kind] + ' (' + KIND[d.kind].l.toLowerCase() + ') · up to +30% with streak'; payV = '+' + pay(d.len, d.kind); go = 'Add the ritual'; }
      if (f === 'quest') { title = d.id ? 'Edit quest' : 'New quest'; ph = 'What needs doing?'; col = '#a48aff';
        rows = lenRow + kindRow + dateRow('DUE DATE', d.due) +
          row('LIST', [['teach', 'The Errand Scrolls'], ['life', 'Surface Errands']].map(([k, l]) => chip(l, d.grp === k, 'd', 'grp:' + k)));
        steps = 'CHECKLIST (OPTIONAL)'; payL = 'Pays by length × kind'; payV = '+' + pay(d.len, d.kind); go = 'Add the quest'; goBg = '#a48aff'; }
      if (f === 'boss') { title = 'Summon a boss'; ph = 'The big job, e.g. Mark the 9AS mocks'; col = '#ff9a85'; const k = d.k || SIZE[d.size].k;
        rows = row('SIZE · TOTAL HOURS (2 H MINIMUM)', [2, 5, 10, 20].map((n) => { const m = P.bossMeta[SIZE[n].k]; return chip(m.size + ' · ' + SIZE[n].gold, d.size === n, 'd', 'size:' + n, '#ff9a85', P.bosses[P.bossBySize[n][0]].src); })) +
          row('CREATURE', P.bossBySize[d.size].map((c) => chip(P.bossMeta[c].name, k === c, 'd', 'k:' + c, '#ff9a85', P.bosses[c].src)));
        steps = 'STAGES · EACH HAS A "BY" DATE'; payL = P.bossMeta[k].name + ' · paid when beaten, plus a trophy'; payV = String(SIZE[d.size].gold); go = 'Summon it'; goBg = '#ff7a66'; }
      if (f === 'mark') { title = d.id ? 'Edit marking' : 'Books to mark'; ph = 'Mark 9AS books'; col = '#f2a93b';
        rows = lenRow + row('SITTINGS', [1, 2, 3].map((n) => chip(String(n), d.sittings === n, 'd', 'sittings:' + n, '#f2a93b'))) + dateRow('DUE DATE', d.due);
        payL = 'Each sitting pays'; payV = '+' + pay(d.len, 'necessary'); go = 'Add it'; goBg = '#f2a93b'; }
      if (f === 'group') { title = 'New group'; ph = 'Name the group';
        rows = '<span class="uz-lbl">THEMED NAMES</span><div class="uz-chips">' + GROUP_SUGS.map((l) => '<button data-a="d" data-v="name:' + esc(l) + '" style="border-radius:20px;font:500 16px var(--g);color:#cfe8dc">' + esc(l) + '</button>').join('') + '</div>' +
          row('INSIDE', [['top', 'Top level'], ['teach', 'Teaching'], ['life', 'Life']].map(([k, l]) => chip(l, d.parent === k, 'd', 'parent:' + k)));
        payL = 'Groups fold away and can be renamed with ✎'; payCoin = false; go = 'Make the group'; }
      if (f === 'reward') { title = 'New reward for the Hoard'; ph = 'e.g. Cinema trip'; col = '#ffd56a';
        rows = row('COST', [40, 80, 120, 300, 600, 1000].map((n) => chip(String(n), d.cost === n, 'd', 'cost:' + n, '#ffd56a'))); payL = 'Costs'; payV = String(d.cost); go = 'Add to the Hoard'; goBg = '#ffd56a'; }
      if (f === 'curse') { const cu = d.type === 'curse'; title = (d.id ? 'Edit ' : 'New ') + (cu ? 'curse' : 'blessing'); ph = cu ? 'The bad habit' : 'The good habit'; col = cu ? '#ff7a66' : '#b6ffd6';
        rows = row('TYPE', [chip('Curse', cu, 'd', 'type:curse', '#ff7a66'), chip('Blessing', !cu, 'd', 'type:bless')]) + lenRow;
        if (cu) { payL = 'Costs health, never runes'; payV = '−' + D.table.hpLoss[d.len] + ' HP'; payC = '#ff7a66'; payCoin = false; } else { payL = 'Pays each time you tap it'; payV = '+' + Math.max(2, Math.round(D.table.base[d.len] / 2)); }
        go = 'Add it'; goBg = cu ? '#ff7a66' : '#5ef2a0'; }
      if (steps) steps = '<span class="uz-lbl">' + steps + '</span>' + d.steps.map((s, i) => '<div class="uz-srow"><input data-step="' + i + '" value="' + esc(s.n) + '" placeholder="' + (f === 'boss' ? 'Stage ' + (i + 1) : 'A small step') + '">' +
        (f === 'boss' ? '<input type="date" data-sby="' + i + '" value="' + esc(s.by || '') + '" style="flex:none;width:150px;height:44px;padding:0 8px;border-radius:5px;border:1.5px solid #4a2a2e;background:#1c1012;color:#ffb3a8;font:700 13px var(--a);color-scheme:dark">' : '') +
        '<button data-a="sdel" data-v="' + i + '" style="flex:none;width:40px;height:44px;border:none;background:none;color:#7f9389;font:18px var(--a)">×</button></div>').join('') +
        '<div style="display:flex;gap:6px"><button data-a="sadd" style="flex:1;height:42px;border-radius:5px;border:1.5px dashed #2f443b;background:none;color:#8fa298;font:700 13px var(--a)">+ ' + (f === 'boss' ? 'Stage' : 'Checklist step') + '</button>' +
        (f === 'boss' ? '<button data-a="tmpl" style="flex:1;height:42px;border-radius:5px;border:1.5px solid #5a3a8a;background:#1e1430;color:#d4bfff;font:700 13px var(--a)">Marking template</button>' : '') + '</div>';
      return '<div class="uz-form"><div style="display:flex;align-items:center;justify-content:space-between"><span style="font:500 23px var(--g);color:' + col + '">' + title + '</span><button data-a="close" style="width:44px;height:44px;border:none;background:none;color:#8fa298;font:22px var(--a)">×</button></div>' +
        '<input data-name="1" value="' + esc(d.name) + '" placeholder="' + ph + '">' + rows + steps + '<div style="flex:1"></div>' +
        '<div class="uz-total"><span style="font:13px var(--a);color:#93a69c">' + payL + '</span><span style="display:flex;align-items:center;gap:4px;font:700 22px var(--a);color:' + payC + '">' + payV + (payCoin && payV ? coin(24, String(payV).replace(/[^0-9]/g, ''), f) : '') + '</span></div>' +
        '<button class="uz-go" data-a="submit" style="background:' + goBg + ';opacity:' + (d.name.trim() ? 1 : 0.45) + '">' + (d.id ? 'Save' : go) + '</button>' +
        (d.id ? '<button data-a="farch" style="height:44px;border-radius:5px;border:1.5px solid #4a2a2e;background:none;color:#ff9a85;font:700 14px var(--a)">Archive</button>' : '') + '</div>';
    }
    function submit() {
      const f = V.form, d = V.draft; if (!d || !d.name.trim()) return;
      V.form = null; V.draft = null; const nm = d.name.trim();
      const archOnSave = (r) => { if (r.saved) setRev(['gameArchive', r.saved]); };
      if (d.id && /^(ritual|quest|mark|curse)$/.test(f)) { const o = V.orig; V.orig = null; return act({ verb: 'Edited:', name: nm }, o ? ['gameSaveGoal', goalOf(f, o)] : null, 'gameSaveGoal', [goalOf(f, d)]); }
      if (f === 'ritual') { V.tab = 0; V.open[d.group] = 1; return act({ verb: 'New ritual:', name: nm }, null, 'gameSaveGoal', [goalOf(f, d)], null, archOnSave); }
      if (f === 'quest') return act({ verb: 'New quest:', name: nm }, null, 'gameSaveGoal', [goalOf(f, d)], null, archOnSave);
      if (f === 'mark') { V.open.marking = 1; return act({ verb: 'New marking:', name: nm }, null, 'gameSaveGoal', [goalOf(f, d)], null, archOnSave); }
      if (f === 'boss') { const stages = d.steps.filter((s) => s.n.trim()).map((s) => ({ name: s.n.trim(), due: s.by })); if (!stages.length) stages.push({ name: 'Do it', due: addD(D.today, 7) });
        return act({ verb: 'Boss summoned:', name: nm }, null, 'gameBossStart', [{ name: nm, size: d.size, k: d.k || SIZE[d.size].k, stages }], null, (r) => { if (r.newBoss) { V.open[r.newBoss] = 1; setRev(['gameBossRemove', r.newBoss]); } }); }
      if (f === 'group') return act({ verb: 'New group:', name: nm }, null, 'gameGroupSave', [{ name: nm, parent: d.parent === 'top' ? '' : d.parent }], null, (r) => { V.open[r.saved] = 1; paint(); });
      if (f === 'reward') return act({ verb: 'New reward:', name: nm }, null, 'gameHoardSave', [{ name: nm, cost: d.cost }], null, (r) => { if (r.saved) setRev(['gameHoardSave', { id: r.saved, name: nm, cost: d.cost, archived: true }]); });
      if (f === 'curse') { const cu = d.type === 'curse';
        return act({ verb: cu ? 'New curse:' : 'New blessing:', name: nm }, null, 'gameSaveGoal', [goalOf(f, d)], null, archOnSave); }
    }

    /* ---------- paint ---------- */
    function paint() {
      if (!D) { body.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;font:24px var(--g);color:#5ef2a0;text-align:center;padding:20px">' + (err ? esc(err) : 'Summoning Ulhu…') + '</div>'; return; }
      paintBanner(); paintTop();
      const keep = [...body.querySelectorAll('.uz-pane')].map((p) => p.scrollTop), oldForm = body.querySelector('.uz-form'), fs = oldForm ? oldForm.scrollTop : 0;
      const ae = document.activeElement, ds = ae && body.contains(ae) ? ae.dataset : null;
      const focus = !ds ? '' : ds.step !== undefined ? '[data-step="' + ds.step + '"]' : ds.name ? '[data-name]' : ds.rv ? '[data-rv="' + ds.rv + '"]' : ds.rvp !== undefined ? '[data-rvp="' + ds.rvp + '"]' : ds.ren ? '[data-ren]' : '';
      if (V.form) body.innerHTML = form();
      else body.innerHTML = '<div class="uz-sw"><div class="uz-track" style="transform:translateX(' + (-V.tab * 25) + '%);transition:transform .3s cubic-bezier(.2,.8,.2,1)">' +
        '<div class="uz-pane">' + rituals() + '</div><div class="uz-pane">' + quests() + '</div><div class="uz-pane">' + curses() + '</div><div class="uz-pane">' + den() + '</div></div></div>' +
        (D.frozen ? '<div class="uz-off"><span>TODAY IS FROZEN · NOTHING CAN BE MISSED</span></div>' : '');
      if (V.form && oldForm) body.querySelector('.uz-form').scrollTop = fs;
      body.querySelectorAll('.uz-pane').forEach((p, i) => { if (keep[i]) p.scrollTop = keep[i]; });
      if (focus) { const n = body.querySelector(focus); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) { /* not a text box */ } } }
      const sb = body.querySelector('.uz-stampbox'); if (sb && V.stampNew) { V.stampNew = false; anim(sb, [{ transform: 'scale(2.4) rotate(-28deg)', opacity: 0 }, { transform: 'scale(.92) rotate(-10deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(1) rotate(-10deg)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1.2)' }); }
      if (V.waxNew) { const n = body.querySelector('.uz-stamp[data-q="' + V.waxNew + '"]'); if (n) { V.waxNew = null; anim(n, [{ transform: 'scale(2.4) rotate(-28deg)', opacity: 0 }, { transform: 'scale(1) rotate(-10deg)', opacity: 1 }], { duration: 420 }); } }
    }

    /* ---------- typing (no repaint while typing) ---------- */
    box.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.name && V.draft) { V.draft.name = t.value; const go = body.querySelector('.uz-go'); if (go) go.style.opacity = t.value.trim() ? 1 : 0.45; }
      if (t.dataset.step !== undefined && V.draft) V.draft.steps[Number(t.dataset.step)].n = t.value;
      if (t.dataset.due && V.draft) V.draft.due = t.value;
      if (t.dataset.sby !== undefined && V.draft && t.value) V.draft.steps[Number(t.dataset.sby)].by = t.value;
      if (t.dataset.rv && V.rv) V.rv[t.dataset.rv] = t.value;
      if (t.dataset.rvp !== undefined && V.rv) V.rv.p[Number(t.dataset.rvp)] = t.value;
    });
    function renameSave(inp) {
      const id = inp.dataset.ren, v = inp.value.trim(), g = D.groups.find((x) => x.id === id); V.renaming = null;
      if (!v || !g || v === g.name) return paint();
      const old = g.name; act({ verb: 'Renamed:', name: v }, ['gameGroupSave', { id, name: old }], 'gameGroupSave', [{ id, name: v }], (d) => { d.groups.find((x) => x.id === id).name = v; });
    }
    box.addEventListener('keydown', (e) => { const t = e.target; if (t.dataset.ren) { if (e.key === 'Enter') renameSave(t); if (e.key === 'Escape') { V.renaming = null; paint(); } } if (t.dataset.name && e.key === 'Enter') submit(); });
    box.addEventListener('focusout', (e) => { if (e.target.dataset && e.target.dataset.ren && V.renaming) renameSave(e.target); });

    /* ---------- swipe between tabs (the list follows the finger; past 60 px it changes tab) ---------- */
    let sw = null, swiped = false;
    body.addEventListener('pointerdown', (e) => { if (V.form || (e.target.closest && e.target.closest('[data-hscroll],input,textarea'))) return; sw = { x: e.clientX, y: e.clientY, on: false, dx: 0 }; });
    body.addEventListener('pointermove', (e) => {
      if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      if (!sw.on) { if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) sw.on = true; else if (Math.abs(dy) > 12) { sw = null; return; } else return; }
      sw.dx = (V.tab === 0 && dx > 0) || (V.tab === 3 && dx < 0) ? dx / 3 : dx;
      const tr = body.querySelector('.uz-track'); if (tr) { tr.style.transition = 'none'; tr.style.transform = 'translateX(calc(' + (-V.tab * 25) + '% + ' + sw.dx + 'px))'; }
    });
    const up = () => {
      const w = sw; sw = null; if (!w || !w.on) return;
      const t0 = V.tab; if (w.dx < -60 && V.tab < 3) V.tab++; else if (w.dx > 60 && V.tab > 0) V.tab--;
      V.banishArm = null; swiped = true; setTimeout(() => { swiped = false; }, 60);
      if (V.tab !== t0) { buzz(5); tabOpened(); }
      const tr = body.querySelector('.uz-track'); if (tr) { tr.style.transition = 'transform .3s cubic-bezier(.2,.8,.2,1)'; tr.style.transform = 'translateX(' + (-V.tab * 25) + '%)'; }
      paintTop();
    };
    body.addEventListener('pointerup', up); body.addEventListener('pointercancel', up);
    box.addEventListener('click', (e) => { if (swiped) { e.stopPropagation(); e.preventDefault(); } }, true);
    function tabOpened() { if (V.tab === 3) denOpened(); }
    function denOpened() {
      if (!ROOM) call('gameArt').then((a) => { ROOM = a; paint(); }).catch(() => {});
      if (!SHOP) call('gameShop').then((s) => { SHOP = s; paint(); }).catch(() => {});
      if (V.den === 'chron' && !CHRON) call('gameChronicle').then((c) => { CHRON = c; paint(); }).catch(() => {});
    }
    const shopRefresh = () => call('gameShop').then((s) => { SHOP = s; paint(); }).catch(() => {});

    /* ---------- taps ---------- */
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b || !box.contains(b)) return;
      const a = b.dataset.a, id = b.dataset.id, v = b.dataset.v, r = b.getBoundingClientRect(), k = b.dataset.fx;
      if (a === 'undo') return undo();
      if (a === 'tab') { V.tab = Number(v); V.form = null; V.banishArm = null; tabOpened(); return paint(); }
      if (a === 'fold') { V.open[v] = V.open[v] === undefined && b.dataset.def ? 0 : (V.open[v] ? 0 : 1); return paint(); }
      if (a === 'rename') { V.renaming = v; paint(); const n = body.querySelector('[data-ren]'); if (n) { n.focus(); n.select(); } return; }
      if (a === 'edit') { V.edit = !V.edit; return paint(); }
      if (a === 'vanq') { V.vanq = !V.vanq; return paint(); }
      if (a === 'rvopen') { V.rvOpen = !V.rvOpen; return paint(); }
      if (a === 'den') { V.den = v; V.form = null; if (v === 'chron') CHRON = null; denOpened(); return paint(); }
      if (a === 'cat') { V.shopCat = v; return paint(); }
      if (a === 'tier') { V.tier = v; return paint(); }
      if (a === 'wcat') { V.wCat = v; return paint(); }
      if (a === 'style') { style = v; try { localStorage.setItem('ulhuStyle', v); } catch (x) { /* private window */ } return paint(); }
      if (a === 'form') { V.form = v; V.draft = FORMS[v](); return paint(); }
      if (a === 'close') { V.form = null; V.draft = null; V.orig = null; return paint(); }
      if (a === 'editg') { const g = goal(id); if (!g) return; V.form = formKind(g); V.draft = draftOf(g); V.orig = clone(V.draft); return paint(); }
      if (a === 'nodue') { V.draft.due = ''; return paint(); }
      if (a === 'farch') { const i2 = V.draft.id; V.form = null; V.draft = null; V.orig = null; return archive(i2); }
      if (a === 'd') { const i = v.indexOf(':'), f = v.slice(0, i), x = v.slice(i + 1); V.draft[f] = /^(len|n|size|cost|sittings)$/.test(f) ? Number(x) : x; if (f === 'size') V.draft.k = P.bossBySize[Number(x)][0]; return paint(); }
      if (a === 'dday') { const n = Number(v), ds = V.draft.days; V.draft.days = ds.indexOf(n) >= 0 ? ds.filter((x) => x !== n) : ds.concat([n]); return paint(); }
      if (a === 'sadd') { V.draft.steps.push({ n: '', by: addD(D.today, 7) }); return paint(); }
      if (a === 'sdel') { V.draft.steps.splice(Number(v), 1); return paint(); }
      if (a === 'tmpl') { V.draft.name = V.draft.name || 'Mark the 9AS test'; V.draft.size = 5; V.draft.k = 'shog'; V.draft.steps = [['Half marked', 2], ['The rest', 5], ['Scores summed', 6], ['Entered', 7]].map(([n, dd]) => ({ n, by: addD(D.today, dd) })); return paint(); }
      if (a === 'submit') return submit();
      if (a === 'dayoff') { const on = !D.frozen; return act({ verb: on ? 'Day off:' : 'Day back on:', name: on ? 'today is frozen, streaks are safe' : 'the tide flows again' }, ['gameFreeze', D.today, 'off', !on], 'gameFreeze', [D.today, 'off', on], (d) => { d.frozen = on; }); }
      if (a === 'tick' || a === 'untick') {
        const g = goal(id); if (!g) return;
        if (g.kind === 'termly') {
          const on = a === 'tick', cls = g.name.replace(/^Mark\s+/i, '').replace(/\s+books\b.*$/i, ''), half = g.sittings === 2 ? ((on ? g.sitDone : g.sitDone - 1) ? ' 2nd half' : ' 1st half') : '';
          let upL = false;
          act({ verb: on ? 'Marked:' : 'Unmarked:', name: cls + half, delta: (on ? '+' : '−') + g.pay, unit: 'coin' }, on ? ['gameUntick', id] : ['gameTick', id, 1], on ? 'gameTick' : 'gameUntick', on ? [id, 1] : [id],
            (d) => { const x = d.goals.find((y) => y.id === id); x.sitDone += on ? 1 : -1; if (on) upL = earnLocal(d, g.pay, g.pay); else d.player.coins -= g.pay; });
          if (on) earnFx(r, k, g.pay, upL); else buzz(6); return;
        }
        if (g.kind === 'todo') {
          const on = !g.doneOn; let upL = false;
          act({ verb: on ? 'Quest done:' : 'Reopened:', name: g.name, delta: (on ? '+' : '−') + g.pay, unit: 'coin' }, on ? ['gameUntick', id] : null, on ? 'gameTick' : 'gameUntick', on ? [id, 1] : [id],
            (d) => { const x = d.goals.find((y) => y.id === id); x.doneOn = on ? d.today : ''; if (on) upL = earnLocal(d, g.pay, g.pay); else d.player.coins -= g.pay; });
          if (on) { V.waxNew = id; V.settling[id] = 1; paint(); setTimeout(() => { delete V.settling[id]; paint(); }, 1100); earnFx(r, k, g.pay, upL); } else buzz(6); return;
        }
        const on = !g.doneToday; let upL = false;
        if (on) { V.settling[id] = 1; setTimeout(() => { delete V.settling[id]; paint(); }, 1100); }
        act({ verb: on ? 'Ticked:' : 'Unticked:', name: g.name, delta: (on ? '+' : '−') + g.pay, unit: 'coin' }, on ? ['gameUntick', id] : ['gameTick', id, 1], on ? 'gameTick' : 'gameUntick', on ? [id, 1] : [id],
          (d) => { const x = d.goals.find((y) => y.id === id); x.doneToday = on; x.streak = Math.max(0, x.streak + (on ? 1 : -1)); if (on) upL = earnLocal(d, g.pay, g.pay); else { d.player.coins -= g.pay; d.weekCoins -= g.pay; } });
        if (on) earnFx(r, k, g.pay, upL); else buzz(6); return;
      }
      if (a === 'curse') {
        const g = goal(id), cost = g.hpLoss; let faint = false;
        act({ verb: 'Cursed:', name: g.name, delta: '−' + cost, unit: 'hp' }, ['gameUntick', id], 'gameTick', [id, -1], (d) => { const x = d.goals.find((y) => y.id === id); x.count = (x.count || 0) + 1; d.player.hp -= cost; if (d.player.hp <= 0) { faint = true; d.player.hp = d.player.maxHp; d.player.level = Math.max(1, d.player.level - 1); } });
        flinch(); floatText(r, '−' + cost + ' HP', '#ff7a66'); glow(k, 'rgba(196,50,58,.9)'); buzz([25, 40, 25]);
        if (faint) { V.last = { verb: 'Fainted:', name: 'lost a level and 7 days of runes' }; paintTop(); setMood('sad', 'Ulhu fainted… he wakes at full health, a little poorer.'); } else setMood('sad', CURSE_SAYS[Math.floor(Math.random() * CURSE_SAYS.length)]);
        return;
      }
      if (a === 'bless') {
        if (V.edit) { const g0 = goal(id); V.form = 'curse'; V.draft = draftOf(g0); V.orig = clone(V.draft); return paint(); }
        const g = goal(id), chain = ((D.blessCount || 0) + 1) % 8 === 0, n = g.pay + (chain ? 10 : 0); let upL = false;
        act({ verb: chain ? 'Blessing chain!' : 'Blessing:', name: g.name, delta: '+' + n, unit: 'coin' }, ['gameUntick', id], 'gameTick', [id, 1], (d) => { const x = d.goals.find((y) => y.id === id); x.count = (x.count || 0) + 1; d.blessCount = (d.blessCount || 0) + 1; upL = earnLocal(d, n, g.pay); });
        ripple(r, g.featured ? '#ffd56a' : '#5ef2a0'); earnFx(r, k, n, upL); if (chain) setTimeout(celebrate, 300); return;
      }
      if (a === 'step') { const q = goal(id), i = Number(v), on = !q.steps[i].d; buzz(6);
        return act({ verb: on ? 'Step done:' : 'Step reopened:', name: q.steps[i].t }, ['gameQuestStep', id, i, !on], 'gameQuestStep', [id, i, on], (d) => { d.goals.find((y) => y.id === id).steps[i].d = on; }); }
      if (a === 'stage') {
        const bo = D.bosses.find((x) => x.id === id), i = Number(v), st = bo.stages[i], on = !st.done, cr = box.querySelector('[data-creature="' + id + '"]');
        const late = on && !!st.due && D.today > st.due, n = bo.stages.length, dead = on && bo.stages.every((x, j) => j === i || x.done);
        if (!on) return act({ verb: 'Stage reopened:', name: st.name }, ['gameBossStage', id, i, true], 'gameBossStage', [id, i, false], (d) => { const x = d.bosses.find((y) => y.id === id); x.stages[i].done = ''; x.stages[i].late = false; x.hp = Math.min(100, x.hp + Math.round((st.late ? 50 : 100) / n)); });
        anim(cr, [{ transform: 'none', filter: 'none' }, { transform: 'translateX(5px)', filter: 'brightness(3) saturate(0)' }, { transform: 'translateX(-4px)' }, { transform: 'none', filter: 'none' }], { duration: 320 });
        glow(k, 'rgba(255,122,102,.9)'); floatText(r, late ? 'half hit' : 'hit!', '#ff9a85'); buzz(15);
        if (!dead) return act({ verb: late ? 'Late stage:' : 'Stage done:', name: st.name + ' · ' + bo.name }, ['gameBossStage', id, i, false], 'gameBossStage', [id, i, true], (d) => { const x = d.bosses.find((y) => y.id === id); x.stages[i].done = d.today; x.stages[i].late = late; x.hp = Math.max(0, x.hp - Math.round((late ? 50 : 100) / n)); });
        let upL = false;
        act({ verb: 'Boss beaten:', name: bo.name, delta: '+' + bo.reward, unit: 'coin' }, null, 'gameBossStage', [id, i, true], (d) => { const x = d.bosses.find((y) => y.id === id); x.stages[i].done = d.today; x.hp = 0; upL = earnLocal(d, bo.reward, bo.reward); });
        stack.pop();   // a beaten boss has paid out and gone to the trophy shelf: not undoable
        const cr2 = box.querySelector('[data-creature="' + id + '"]');
        anim(cr2, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(6px) scale(1.1,.6)', opacity: 0.6 }, { transform: 'translateY(12px) scale(1.4,.1)', opacity: 0 }], { duration: 500, fill: 'forwards' });
        setTimeout(() => { earnFx(r, k, bo.reward, upL); celebrate(true); setMood('proud', 'Vanquished! Another trophy for the shelf.'); }, 450);
        setTimeout(() => { if (D.bosses.some((x) => x.id === id)) { D.bosses = D.bosses.filter((x) => x.id !== id); D.beaten = [{ id, name: bo.name, k: creature(bo), on: D.today }].concat(D.beaten || []); } CHRON = null; paint(); }, 1300);
        return;
      }
      if (a === 'banish') {
        if (V.banishArm !== id) { V.banishArm = id; clearTimeout(V.bt); V.bt = setTimeout(() => { V.banishArm = null; paint(); }, 3000); return paint(); }
        const bo = D.bosses.find((x) => x.id === id); V.banishArm = null; buzz(10);
        return act({ verb: 'Banished:', name: bo.name }, ['gameBossRemove', id, true], 'gameBossRemove', [id], (d) => { d.bosses = d.bosses.filter((x) => x.id !== id); });
      }
      if (a === 'arch') return archive(id);
      if (a === 'harch') { const h = D.hoard.find((x) => x.id === id); return act({ verb: 'Removed:', name: h.name }, ['gameHoardSave', { id, name: h.name, cost: h.cost, archived: false }], 'gameHoardSave', [{ id, name: h.name, cost: h.cost, archived: true }], (d) => { d.hoard = d.hoard.filter((x) => x.id !== id); }); }
      if (a === 'seal') {
        const rv = V.rv || { p: [] }, first = !D.review.saved, data = { week: D.review.week, wentWell: rv.wentWell, slipped: rv.slipped, p1: rv.p[0], p2: rv.p[1], p3: rv.p[2] }; let upL = false;
        act({ verb: first ? 'Sealed:' : 'Review updated:', name: 'Sunday review', delta: first ? '+20' : '', unit: 'coin' }, null, 'gameReview', [data], (d) => { d.review.saved = { wentWell: data.wentWell, slipped: data.slipped, p1: data.p1, p2: data.p2, p3: data.p3 }; if (first) upL = earnLocal(d, 20, 20); });
        stack.pop(); paintTop(); if (first) earnFx(r, k, 20, upL); return;
      }
      if (a === 'claim') {
        const h = D.hoard.find((x) => x.id === id); if (h.cost > D.player.coins) return shake(r);
        clearTimeout(V.st); V.stamp = id; V.stampNew = true; V.st = setTimeout(() => { V.stamp = null; paint(); }, 2600); buzz([10, 40, 30]); setMood('happy', "You've earned that. Enjoy it.");
        return act({ verb: 'Claimed:', name: h.name, delta: '−' + h.cost, unit: 'coin' }, ['gameHoardClaim', id, true], 'gameHoardClaim', [id], (d) => { d.player.coins -= h.cost; d.hoard.find((x) => x.id === id).claims++; });
      }
      if (a === 'unplace') { const it = SHOP && SHOP.items.find((x) => x.id === id); return act({ verb: 'Took out:', name: it ? it.name : 'item' }, ['gamePlace', id, v], 'gamePlace', [id, ''], (d) => { delete d.room[v]; if (it) it.slot = ''; }, shopRefresh); }
      if (a === 'shop') {
        const it = SHOP.items.find((x) => x.id === id);
        if (it.slot) { const sl = it.slot; return act({ verb: 'Took out:', name: it.name }, ['gamePlace', id, sl], 'gamePlace', [id, ''], (d) => { delete d.room[sl]; it.slot = ''; }, shopRefresh); }
        if (it.own) { const sl = it.slots.find((s) => !D.room[s]) || it.slots[0], prev = D.room[sl];
          bounce(); return act({ verb: 'Placed:', name: it.name }, prev ? ['gamePlace', prev, sl] : ['gamePlace', id, ''], 'gamePlace', [id, sl], (d) => { d.room[sl] = id; if (prev) { const p = SHOP.items.find((x) => x.id === prev); if (p) p.slot = ''; } it.slot = sl; }, shopRefresh); }
        if (it.locked || it.price > D.player.coins) return shake(r);
        glow(k, 'rgba(255,214,106,.8)'); setMood('happy', 'Ooh! For the Den?'); bounce(); buzz(12);
        return act({ verb: 'Bought:', name: it.name, delta: '−' + it.price, unit: 'coin' }, ['gameUnbuy', id], 'gameBuy', [id], (d) => { d.player.coins -= it.price; it.own = true; const sl = it.slots.find((s) => !d.room[s]); if (sl) { d.room[sl] = id; it.slot = sl; } }, shopRefresh);
      }
      if (a === 'wear') {
        const w = witem(id), W = D.wear, own = W.owned.indexOf(id) >= 0;
        if (own) { const cur = W.on[w.cat], on = !(cur === id && w.cat !== 'skin'); bounce(); setMood('happy', on ? 'How do I look?' : 'Back to basics.');
          return act({ verb: on ? 'Wearing:' : 'Took off:', name: w.name }, cur ? ['gameWear', cur, true] : ['gameWear', id, false], 'gameWear', [id, on], (d) => { d.wear.on[w.cat] = on ? id : (w.cat === 'skin' ? 'skin-0' : ''); }); }
        if (w.lock > D.player.level || w.price > D.player.coins) return shake(r);
        bounce(); setMood('proud', 'Dashing. Truly eldritch.');
        return act({ verb: 'Bought:', name: w.name, delta: '−' + w.price, unit: 'coin' }, ['gameUnbuy', id], 'gameWear', [id, true], (d) => { d.player.coins -= w.price; d.wear.owned.push(id); d.wear.on[w.cat] = id; });
      }
    });

    D = LS('ulhuD');   // last time's screen, shown at once; the server's copy replaces it a moment later
    fit(); paint();
    window.addEventListener('online', () => flush().then(() => send('gameLoad', [])));
    flush().then(() => send('gameLoad', [], (d) => { setTimeout(fit, 50); if (d.auto && d.auto.length) { V.last = { verb: 'Ticked for you:', name: d.auto.map((x) => x.name).join(', '), delta: '+' + d.auto.reduce((n, x) => n + x.coins, 0), unit: 'coin' }; paint(); } }));
    return { refit: fit };
  }
  root.GameUI = { mount };
})(typeof window !== 'undefined' ? window : this);
