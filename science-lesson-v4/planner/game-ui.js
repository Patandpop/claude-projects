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
.uz-me{position:absolute;left:14px;bottom:6px;width:100px;height:100px;transform-origin:50% 100%}
.uz-lay{position:absolute;inset:0;width:100%;height:100%}
.uz-coins{position:absolute;left:12px;top:9px;display:flex;align-items:center;gap:8px}
.uz-coins img{width:22px;height:22px;filter:drop-shadow(0 2px 0 #2a1806)}
.uz-coins b{font:700 22px/1 var(--a);color:#ffd56a;text-shadow:0 2px 0 #4a2c0c;font-variant-numeric:tabular-nums}
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
.uz-moonb{position:absolute;left:50%;top:2px;transform:translateX(-50%);z-index:3;width:50px;height:50px;padding:7px;border:none;background:none;border-radius:50%}.uz-moonb img{width:36px;height:36px;display:block}
.uz-flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 22% 70%,rgba(255,214,106,.55),rgba(255,214,106,0) 70%)}
.uz-undo.hide{height:0;border-bottom:0;overflow:hidden}.uz-undo{flex:none;height:38px;transition:height .25s;display:flex;align-items:center;gap:8px;padding:0 4px 0 14px;background:#0b1311;border-bottom:1px solid #1c2924}
.uz-undo .t{flex:1;min-width:0;display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;font:13px var(--a);color:#8fa298}
.uz-undo .t .n{color:#e8e1cf;overflow:hidden;text-overflow:ellipsis}
.uz-undo button{flex:none;height:38px;padding:0 12px;border:none;background:none;color:#5ef2a0;font:700 13px var(--a);letter-spacing:.08em}
.uz-tabs{flex:none;position:relative;height:46px;display:grid;grid-template-columns:repeat(4,1fr);background:linear-gradient(180deg,#101a17,#0b1311);border-bottom:1px solid #1c2924}
.uz-tabs button{position:relative;border:none;background:none;display:flex;align-items:center;justify-content:center;gap:5px;font:500 18px var(--g);white-space:nowrap;padding:0 2px;transition:color .2s}
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
.uz-row.sg{background:linear-gradient(135deg,#1a1230,#0e0a1c 60%,#170f2a);border:1px solid #3a2a6a;min-height:62px}.uz-row.sg.done{opacity:1}.uz-row.sg.done .nm{text-decoration:none}.uz-row.sg .nm{color:#efe6ff}.uz-row.sg .uz-sub{color:#a99cc8}
.uz-sig{position:relative;flex:none;width:50px;height:50px;border:none;background:none;padding:0}.uz-sig img.b{position:absolute;inset:0;width:50px;height:50px}
.uz-sig img.f{position:absolute;width:11px;height:16px;transform:translate(-50%,-100%);transform-origin:50% 100%;animation:uzflk 1.5s ease-in-out infinite}.uz-sig img.f.e{width:8px;height:11px;animation:none;opacity:.6;filter:saturate(.55) brightness(.8)}
@keyframes uzflk{0%,100%{transform:translate(-50%,-100%) scale(1,1)}35%{transform:translate(-50%,-100%) scale(.9,1.1)}70%{transform:translate(-50%,-100%) scale(1.08,.92)}}
@media (prefers-reduced-motion:reduce){.uz-sig img.f{animation:none}}
.uz-strip{display:flex;gap:2px;padding:0 0 2px 62px;margin-top:-3px}.uz-strip i{flex:1;max-width:14px;height:4px;border-radius:1px}
.uz-sub2{display:flex;align-items:center;justify-content:space-between;padding:6px 2px 0;font:500 17px var(--g);color:#9fb4aa}
.uz-bw{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:8px 10px;border-radius:6px;background:#0c1620;border:1px solid #1e3444;font:700 13px var(--a);color:#d0e4f4}.uz-bw b{font:500 18px var(--g);color:#bfe0ff;margin-right:2px}.uz-bw span{display:flex;align-items:center;gap:4px}
.uz-bw i{font-style:normal;padding:1px 7px;border-radius:10px;font:700 11px var(--a);border:1.5px solid #2a4a5e;color:#6f8a9a}.uz-bw i.on{border-color:#5aa7ff;background:#173040;color:#bfe0ff}
.uz-orc{padding:10px;border-radius:8px;background:radial-gradient(ellipse at 50% 0%,#1d1440,#0a0716 70%);border:1px solid #3a2a6a;display:flex;flex-direction:column;gap:8px}
.uz-orc h4{margin:0;font:500 21px var(--g);color:#d4bfff;display:flex;justify-content:space-between;align-items:baseline}.uz-orc h4 span{font:700 12px var(--a);color:#a99cc8}
.uz-wk{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font:700 11px var(--a);color:#a99cc8}.uz-wk div{display:flex;flex-direction:column;align-items:center;gap:2px;padding:3px 0;border-radius:6px}
.uz-wk div.t{background:rgba(164,138,255,.14);box-shadow:inset 0 0 0 1px #6a52b8;color:#efe6ff}.uz-wk img{width:38px;height:38px}.uz-wk small{font:700 11px var(--a);height:14px}
.uz-sky{width:100%;height:auto;display:block;border-radius:6px}.uz-leg{display:flex;flex-wrap:wrap;gap:10px;font:12px var(--a);color:#a99cc8}.uz-leg span{display:flex;align-items:center;gap:4px}.uz-leg i{width:9px;height:9px;border-radius:50%;display:inline-block}
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
.uz-two{position:relative;display:grid;grid-template-columns:1fr 1fr;min-height:92px;border-radius:7px;box-shadow:0 2px 0 #030806}
.uz-two button{position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:8px 10px;font:700 13px var(--a);text-align:left;border:1.5px solid}
.uz-twl{background:linear-gradient(180deg,#2a1216,#170a0c);border-right:none!important;border-radius:7px 0 0 7px;padding-right:34px!important}
.uz-twr{background:linear-gradient(180deg,#10233a,#0b1626);border-left:none!important;border-radius:0 7px 7px 0;padding-left:34px!important;align-items:flex-end;text-align:right!important}
.uz-two .tg{font:700 10.5px var(--a);letter-spacing:.1em}.uz-two .ft{display:flex;justify-content:space-between;gap:6px;width:100%}
.uz-twn{position:absolute;left:0;right:0;top:24px;display:flex;justify-content:space-between;gap:56px;padding:0 10px;pointer-events:none;font:700 14px/1.15 var(--a);color:#f0e8f0}
.uz-twm{position:absolute;left:50%;top:50%;width:48px;height:66px;margin:-33px 0 0 -24px;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.7))}
.uz-twm img{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}.uz-twm .rt{clip-path:polygon(62% 0,100% 0,100% 100%,38% 100%)}
.uz-twm i{position:absolute;left:50%;top:0;bottom:0;width:1.5px;margin-left:-1px;background:linear-gradient(#fff3c8,#ffd890);box-shadow:0 0 5px #ffd890;transform:rotate(9.8deg);opacity:.8}
.uz .bl-layer{background:linear-gradient(180deg,transparent 0,transparent calc(100% - 130px),rgba(4,8,7,.88) calc(100% - 96px))}
.uz-strow{margin-bottom:2px}
.uz-abs{display:block;font:700 11px/1.2 var(--a);color:#ffe2a0;text-shadow:0 0 6px rgba(255,214,140,.5)}
.uz-omc{flex:none;width:44px;height:60px;padding:0;border:none!important;background:none!important;border-radius:0!important;box-shadow:none!important;display:flex;align-items:center;justify-content:center}.uz-omc img{width:40px!important;height:55px!important;image-rendering:pixelated;filter:drop-shadow(0 2px 0 rgba(0,0,0,.6))}
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
.uz-aim{display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:2px 0 8px 62px}.uz-aim button{height:44px;min-width:44px;padding:0 10px;border-radius:6px;border:1.5px solid #2f443b;background:#131d19;color:#cfe8dc;font:700 14px var(--a)}.uz-aim button.on{border-color:#ffd56a;background:#2a2410;color:#ffe2a0}.uz-aim span{font:600 13px var(--a);color:#8fa298;margin-left:4px}
.uz-rise{margin:0 0 10px;padding:12px 14px;border-radius:8px;border:1.5px solid #5ef2a0;background:linear-gradient(180deg,#0c2a22,#08140f);color:#cfe8dc;font:600 15px var(--a)}.uz-rise b{font:500 21px var(--g);color:#5ef2a0;display:block}
.uz-chips button{min-width:44px;min-height:42px;display:flex;align-items:center;gap:6px;padding:0 12px;border-radius:5px;border:1.5px solid #2f443b;background:#131d19;color:#cfd8d3;font:700 14px var(--a)}
.uz-chips button img{height:22px;image-rendering:pixelated}
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
  // 50 titles in five depths (Patryk 2026-10-28); the plaque shows the title and its depth
  const TITLES = ['', 'Tadpole', 'Polyp', 'Brine Wriggler', 'Deep Dabbler', 'Kelp Lurker', 'Reef Creeper', 'Tide Caller', 'Shell Breaker', 'Rune Scratcher', 'Abyss Apprentice',
    'Lantern Fish', 'Ink Scribe', 'Rune Keeper', 'Current Rider', 'Wreck Diver', 'Dream Weaver', 'Siren Singer', 'Pearl Hoarder', 'Grotto Warden', 'Deep Acolyte',
    'Pressure Born', 'Gloom Walker', 'Cult Whisperer', 'Trench Stalker', 'Star Spawn', 'Void Oracle', 'Tentacle Lord', 'Kraken Rider', 'Leviathan Kin', 'High Priest',
    'Sunken Bishop', "R'lyeh Mason", 'Nightmare Sower', 'Sleepless Eye', 'Elder Thing', 'Dread Admiral', 'Abyss Hierarch', 'Herald of Tides', 'Void Sovereign', 'Great Dreamer',
    'The Stirring', 'Dreamer Awake', 'Breaker of Seals', "Lord of R'lyeh", 'Shaper of Tides', 'Star Devourer', 'Elder God', 'The Unspeakable', 'Old One', 'Great Old One'];
  const DEPTHS = ['The Shallows', 'The Twilight', 'The Midnight', 'The Abyss', 'The Risen'];
  const depthOf = (lv) => DEPTHS[Math.min(4, Math.floor((Math.max(1, lv) - 1) / 10))];
  const SIZE = { 2: { k: 'spawn', gold: 60 }, 5: { k: 'shog', gold: 150 }, 10: { k: 'levi', gold: 300 }, 20: { k: 'old', gold: 600 } };
  const TABC = ['#5ef2a0', '#a48aff', '#ff7a66', '#ffd56a'];
  const SAYS = {
    morning: ['Good morning. Everything is doomed. Have some tea first.', "A new day. Same inevitable void. Let's be productive about it.", 'Rise and shine, little mortal. The abyss is patient, but your lessons are not.', 'The sun rose again. How embarrassing for it.',
      "Another day closer to the end of all things. Let's tick some boxes.", 'I dreamt of drowned cities. Also, you have marking.', 'Morning! The stars are wrong, but the coffee is right.', "Today's forecast: tentacles, with a chance of Year 9."],
    left: ['{n} rituals left. Resistance is adorable.', 'Only {n} left. The void can wait. Briefly.', 'So many rituals. So little sanity.', 'Your list grows like the hungry deep. Feed it.', 'Do the thing. Then the next thing. Then the heat death of the universe.',
      "Tick one. It won't save you, but it feels nice.", 'The tide is rising. So is your to-do list.', 'I counted your tasks. I wept. Then I ate a fish.', 'Every unticked box is a tiny prophecy.', 'You are not behind. Time is merely a flat circle with a deadline.'],
    tick: ['Ticked! One step closer to oblivion, with a sticker.', 'Ooh, productive. The Old Ones will be mildly impressed.', 'The cosmos does not care, but I do.', 'Splendid. Your doom is now slightly more organised.', "Ticked! I'd clap, but I have tentacles.",
      'Look at you, defying entropy for a whole five minutes.', "Delicious progress. I'll file it under futile but cute.", 'Ritual complete. Somewhere, a star dies in your honour.', 'You did it! Nothing matters, and you still did it!', 'Tick. Tick. Tick. Like a clock counting down to the end. Lovely.'],
    all: ['All appeased! Now rest, before the inevitable end of all things.', 'Everything ticked. The deep is pleased. The deep is rarely pleased.', 'Nothing left. Go outside. Look at the sky. Wonder what is behind it.', "Reward yourself. The universe certainly won't.",
      'You have appeased me. For today. Tomorrow I hunger again.', 'Empty list. Empty void. Perfect symmetry.', 'You won today. The universe wins eventually, but not today.'],
    // an honest curse (Patryk 2026-10-27: 30 lines, dark humour, never a reminder)
    curse: ["Delicious. Same time tomorrow?", "I felt that in all my tentacles.", "Noted in the black ledger. Lovingly.", "Ah, a fellow creature of the deep.", "The abyss thanks you for your contribution.", "Honesty. How unsettling. Keep it up.", "You confess, I feast. Everyone wins.", "Mmm. Tastes like a Thursday.", "I'll pretend I didn't enjoy that.", "Written down. Truth is my favourite flavour.", "Even gods snack. Carry on.", "The stars are not yet right. Neither are you. Fine.", "A small sin. Barely worth a sacrifice.", "Logged. The ocean doesn't judge. I do, a bit.", "Thank you for telling me. Most mortals hide.", "One curse, freshly harvested.", "You could exorcise this, you know. Or not. Your soul.", "I've seen worse. I've done worse. Before breakfast.", "The deep remembers. That's the point.", "Recorded in ink made from regret.", "Ph'nglui... no, that one's private. Logged.", "Splendid. Chaos suits you.", "An honest slip. Dishonest ones are the real horror.", "My tentacles twitch with approval. And mild concern.", "Another tally on the wall of the sunken city.", "Confession accepted. Penance optional. For now.", "Ugh, fine. It counts. Everything counts.", "Note to self: the mortal enjoys this. Investigate.", "The tide goes out, the tide comes in. You'll live.", "Truth fed to the abyss. It is full. Mostly."],
    bless: ['Water! The source of all life, and of me.', 'How delightfully mortal.', 'Blessed. Disgustingly wholesome.', 'Your bones thank you, before they return to dust.', "Another blessing. I'm almost glowing. I am glowing. That's normal.", 'Tidy desk, tidy mind, same eternal darkness.', 'Good habit detected. Suspicious. Keep going.'],
    lowhp: ['I feel… unwell. Fewer curses, please.', 'My tentacles are wilting. Be kind to us.', 'Health is low. Even gods need a nap.', "I'm fading. Dramatically. Please tick something.", 'If I faint, I take a level with me. Just saying.'],
    faint: ["I fainted. It was very dramatic. I've recovered. Mostly.", 'I lost a level and some runes. The deep giveth, the deep taketh.', 'Back from the brink. The abyss sends its regards.'],
    level: ['Level up! I feel… larger. More ominous.', "I've grown! Soon I'll be the size of a small moon. Kidding. Unless?", 'New level. New horrors unlocked.', 'Ascended! The cultists will be so jealous.'],
    streak: ['Your streak is on fire. Not literally. Probably.', 'Seven nights in a row! Consistency is the true eldritch power.', 'The flame burns on. Like the stars before they collapse.', "One missed day is forgiven. Two? I don't forgive. I just sulk."],
    quest: ['Quest fulfilled. Sealed in wax, like a proper cursed artefact.', 'A new quest! Adventure, glory, admin.', "That quest had been waiting. It had grown teeth."],
    boss: ['Hit! The beast trembles. So do I, but with joy.', 'A late hit is still a hit. Half a doom is still doom.'],
    vanq: ['Vanquished! Another trophy for the shelf of futility.', "It's slain. Its cousins will come. They always come."],
    mark: ['The books await. They whisper. Mostly spelling mistakes.', 'A stack of exercise books. A true cosmic horror.', 'Half marked! The other half grows stronger in the dark.', "All marked. I'll tell the Old Ones. They won't care. I'm proud."],
    evening: ["It's after seven. Even old gods rest. Put the laptop down.", 'Zzz… evening work feeds the void. Feed yourself instead.', 'The day is over. Let it sink.', 'The marking will still be there tomorrow. So will I. Forever.', 'Life after work? Rare and precious. Extra runes for you.'],
    off: ['Even ancient horrors take sick days.', 'Day off. The tide will wait. It has waited millennia.', 'Holidays! Rest your mortal frame.', "No rituals today. I'll just float here. Menacingly.", 'Rest is not lazy. Rest is strategic hibernation.'],
    shop: ['Ooh, for the Sanctum?', 'Spend those runes before the universe ends.', 'Dashing. Truly eldritch.', "You've earned it. Probably. Who's counting? Me. I'm counting.", 'Treasure! Shiny things soothe the ancient mind.', 'Runes well spent. Runes are meaningless anyway. Enjoy.'],
    any: ["Did you know? I'm technically older than time. I still love stickers.", "Ph'nglui mglw'nafh… sorry, I was talking to my mum.", 'If you stare into the to-do list, the to-do list stares back.', 'I am the harbinger of doom, and also your emotional support octopus.',
      'Nothing lasts forever. Except unmarked books.', 'I believe in you. I also believe in the end of everything. Both can be true.', "You're doing great. The universe is indifferent, but I'm rooting for you.", 'Sometimes I eat a boat. We all cope differently.',
      'The deep is dark and full of terrors. Your desk is just full.', 'Small steps. Tiny tentacles. Big doom. We move.'],
    stars: ["A full constellation. The stars approve. I'm terrified.", 'Most of the week, kept. The heavens take note.', 'Your sky is filling with stars. Ominous. Lovely.'] };
  const pickSay = (k) => { const L = SAYS[k]; return L[Math.floor(Math.random() * L.length)]; };
  const TICK_SAYS = SAYS.tick;
  const CURSE_SAYS = SAYS.curse;
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
    // ritual sigils (Patryk 2026-10-26): purple pentagram, flames on its five points when ticked; its colour grows with the
    // streak from ember orange to eldritch green at 66 nights (a habit) and stays green; unlit = a faint tint of that colour
    const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const mixc = (a, b, t) => { const x = hx(a), y = hx(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
    const STOPS = [[1, '#ff6a2a'], [7, '#ffc040'], [21, '#6ab8ff'], [45, '#5adcd0'], [66, '#5ef2a0']];
    const sCol = (n) => { n = Math.max(1, n || 1); if (n >= 66) return '#5ef2a0'; for (let i = 1; i < STOPS.length; i++) if (n <= STOPS[i][0]) return mixc(STOPS[i - 1][1], STOPS[i][1], (n - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0])); return '#5ef2a0'; };
    const SPTS = [0, 1, 2, 3, 4].map((i) => [13.5 + Math.cos(i * 2 * Math.PI / 5 - Math.PI / 2) * 10, 13.5 + Math.sin(i * 2 * Math.PI / 5 - Math.PI / 2) * 10]);
    const SIGC = {};
    function sigilSrc(col, lit, share) {
      const key = col + lit + share; if (SIGC[key]) return SIGC[key];
      const c = document.createElement('canvas'); c.width = 27; c.height = 27; const x = c.getContext('2d');
      const ring = lit ? col : mixc('#2a2050', col, .38), star = lit ? '#efe6ff' : mixc('#231a40', col, .25), dot = (X, Y, k) => { x.fillStyle = k; x.fillRect(Math.round(X), Math.round(Y), 1, 1); };
      for (let a = 0; a < 360; a += 2.5) { const r = a * Math.PI / 180; dot(13.5 + Math.cos(r) * 12, 13.5 + Math.sin(r) * 12, ring); }
      SPTS.forEach((pt, i) => { const q = SPTS[(i + 2) % 5]; for (let t = 0; t <= 1; t += 0.025) dot(pt[0] + (q[0] - pt[0]) * t, pt[1] + (q[1] - pt[1]) * t, star); });
      if (share !== undefined) SPTS.forEach((pt, i) => { x.fillStyle = i < share ? col : '#2a2050'; x.fillRect(Math.round(pt[0]) - 1, Math.round(pt[1]) - 1, 3, 3); });
      return (SIGC[key] = c.toDataURL());
    }
    const FLC = {};
    function flameSrc(col) {
      if (FLC[col]) return FLC[col];
      const c = document.createElement('canvas'); c.width = 8; c.height = 12; const x = c.getContext('2d');
      for (let y = 1; y < 12; y++) for (let i = 0; i < 8; i++) { const dy = (12 - y) / 12, half = Math.sin(Math.PI * Math.min(1, dy * 1.05)) * 3.4 * (1 - dy * 0.5), dx = Math.abs(i + .5 - 4);
        if (dx <= half) { x.fillStyle = dx < half * 0.4 && dy < 0.55 ? '#ffffff' : dx < half * 0.75 ? col : mixc('#000000', col, .65); x.fillRect(i, y, 1, 1); } }
      return (FLC[col] = c.toDataURL());
    }
    // a ritual's sigil button: lit with five flames, unlit and tinted, or dim embers after a missed day
    function sigil(g, on) {
      const n = Math.max(1, g.streak + (on ? 0 : 1)), col = sCol(n), emb = !on && g.miss && !D.frozen;
      let h = '<button class="uz-sig" data-a="tick" data-id="' + g.id + '" data-fx="' + g.id + '" aria-label="' + esc(g.name) + '"><img class="b" src="' + sigilSrc(col, on) + '" alt=""' + (on ? ' style="filter:drop-shadow(0 0 5px ' + col + ')"' : '') + '>';
      if (on || emb) SPTS.forEach((pt) => { h += '<img class="f' + (on ? '' : ' e') + '" src="' + flameSrc(col) + '" style="left:' + (pt[0] * 50 / 27).toFixed(1) + 'px;top:' + (pt[1] * 50 / 27 + 3).toFixed(1) + 'px" alt="">'; });
      return h + '</button>';
    }
    const moonSrc = (full) => { const c = document.createElement('canvas'); c.width = 16; c.height = 16; const x = c.getContext('2d');
      for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) { const d = Math.hypot(i + .5 - 8, y + .5 - 8); if (d > 7 || (!full && Math.hypot(i + .5 - 11, y + .5 - 6.5) < 6.3)) continue; x.fillStyle = full ? (d > 6.2 ? '#c9b98a' : (i + y) % 5 === 0 && d < 5 ? '#d8cfa8' : '#f4ecc8') : (d > 6.2 ? '#8aa4b8' : '#cfe0ec'); x.fillRect(i, y, 1, 1); }
      return c.toDataURL(); };
    // the half and dark moons (Patryk 2026-10-27: three phases, full = working, half = work rest, dark = full rest)
    const moonPh = (lit) => { const c = document.createElement('canvas'); c.width = 16; c.height = 16; const x = c.getContext('2d');
      for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) { const d = Math.hypot(i + .5 - 8, y + .5 - 8); if (d > 7) continue;
        const on = lit && i >= 8; x.fillStyle = on ? (d > 6.2 ? '#c9b98a' : '#f4ecc8') : (d > 6.2 ? '#4a5a6a' : '#1c2630'); x.fillRect(i, y, 1, 1); }
      return c.toDataURL(); };
    const MOON = { full: moonSrc(true), cres: moonSrc(false), half: moonPh(true), dark: moonPh(false) };
    const PHASE = { full: ['Full moon: a working day', 'half'], half: ['Half moon: work rest, life still counts', 'dark'], dark: ['Dark moon: full rest', 'full'] };
    const coin = (z, n, key, kind) => { const s = RN ? RN.pick(n, key, kind) : P.coin, k = s.h >= 34 ? 1.35 : s.h > 24 ? 1.2 : 1; return '<img src="' + s.src + '" style="width:' + Math.round(z * k * s.w / s.h) + 'px;height:' + Math.round(z * k) + 'px;object-fit:contain" alt="runes">'; };
    if (RN) IMG.coin = RN.ones[0].src;
    const style = '16-bit';   // 16-bit only (2026-10-26)
    const V = { hand: {}, tab: 0, open: { teach: 0, chores: 1, summon: 1, marking: 1, life: 0, qteach: 1, qlife: 1, qdone: 0 }, den: 'room', sayIx: 0, shopCat: 'floors', tier: 'All', wCat: 'hat', form: null, draft: null, renaming: null, banishArm: null, stamp: null, vanq: false, rvOpen: false, mood: null, say: null, last: null, drag: 0, settling: {} };
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
      '<div class="uz-say" data-a="next"><div></div></div>' +
      '<div class="uz-bars"><div class="uz-bar"><img src="' + IMG.xp + '" alt=""><div style="background:#0b1513;border:1px solid #24443a"><i class="xp" style="background:linear-gradient(90deg,#1d8a52,#5ef2a0);box-shadow:0 0 6px #5ef2a0"></i></div><span class="xpt" style="color:#bfeed4"></span></div>' +
      '<div class="uz-bar"><img src="' + IMG.heart + '" alt=""><div class="hpw" style="background:#160b0c;border:1px solid #4a1e22"><i class="hp" style="background:linear-gradient(90deg,#a3202a,#ff7a66)"></i></div><span class="hpt" style="color:#ffc0b4"></span></div></div>' +
      '<button class="uz-moonb" data-a="dayoff" aria-label="Day off"><img alt=""></button><div class="uz-flash"></div></div>' +
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
    // one at a time, in tap order (2026-10-28): fast taps queue behind each other instead of fighting over the lock
    let line = Promise.resolve();
    function send(fn, args, after) {
      const my = ++seq, p = line.then(() => call(fn, ...args)); line = p.catch(() => null);
      return p.then((d) => {
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
    function earnLocal(d, n, xp) { const p = d.player; p.coins += n; d.weekCoins = (d.weekCoins || 0) + n; p.xp += xp; let up = false; while (p.xp >= p.need) { p.xp -= p.need; p.level++; p.need = need(p.level); p.hp = p.maxHp; p.coins += p.level * (p.gift || 10); up = true; } return up; }
    function earnFx(r, k, n, up) {
      flyCoin(r, n); floatText(r, '+' + n, '#ffd56a'); glow(k, 'rgba(94,242,160,.85)'); bounce(); buzz(12);
      if (up) { setTimeout(celebrate, 350); setMood('proud', pickSay('level')); } else setMood('happy', pickSay(V.sayKind || 'tick')); V.sayKind = null;
    }
    const goal = (id) => D.goals.find((g) => g.id === id);
    // log a curse: after its sigil is picked, or straight away on a double tap (Patryk 2026-10-27)
    function logCurse(id, r, k, sig) {
      const g = goal(id); if (!g) return; const cost = g.hpLoss; let faint = false;
      act({ verb: 'Cursed:', name: (g.polarity === 'both' ? sides(g.name)[0] : g.name) + (sig ? ' · ' + sig : ''), delta: '−' + cost, unit: 'hp' }, ['gameUntick', id], 'gameTick', [id, -1, sig], (d) => { const x = d.goals.find((y) => y.id === id); x.count = (x.count || 0) + 1; if (x.polarity === 'both') x.cCount = (x.cCount || 0) + 1; d.player.hp -= cost; if (d.player.hp <= 0) { faint = true; d.player.hp = d.player.maxHp; d.player.level = Math.max(1, d.player.level - 1); } });
      flinch(); floatText(r, '−' + cost + ' HP', '#ff7a66'); glow(k, 'rgba(196,50,58,.9)'); buzz([25, 40, 25]);
      if (faint) { V.last = { verb: 'Fainted:', name: 'lost a level and 7 days of runes' }; paintTop(); setMood('sad', pickSay('faint')); } else setMood('sad', CURSE_SAYS[Math.floor(Math.random() * CURSE_SAYS.length)]);
    }
    function archive(id) { const g = goal(id); if (!g) return; return act({ verb: 'Archived:', name: g.name }, ['gameArchive', id, true], 'gameArchive', [id], (d) => { d.goals = d.goals.filter((x) => x.id !== id); }); }
    // the "undo" of something new is only known when the server gives it an id
    const setRev = (rev) => { const u = stack[stack.length - 1]; if (u && !u.rev) u.rev = rev; };

    /* ---------- banner, undo line, tabs, dock ---------- */
    const dailies = () => D.goals.filter((g) => g.kind === 'daily' && g.dueToday);
    const ritualsLeft = () => dailies().filter((g) => !g.doneToday).length;
    const nextJob = () => { if (!D) return null; const T = todayItems(), x = T.work.find((i) => !i.auto) || T.life[0] || T.work[0]; return x || null; };
    function paintBanner() {
      if (!D) return;
      const p = D.player, nt = night();
      ban.style.background = nt ? 'linear-gradient(180deg,#050a18 0%,#0a1424 55%,#0a1210 100%)' : 'linear-gradient(180deg,#0f3a34 0%,#0b2522 50%,#08110f 100%)';
      $('.uz-moon').style.display = 'none'; const mb = $('.uz-moonb img'), ph = D.moon || (D.frozen ? 'dark' : 'full'); mb.src = MOON[ph]; mb.style.cssText = ph === 'full' ? 'opacity:.85' : 'filter:drop-shadow(0 0 8px #cfe0ec)'; $('.uz-moonb').setAttribute('aria-label', PHASE[ph][0] + '. Tap to change.');
      me.innerHTML = layers(mood());
      $('.uz-coins b').textContent = p.coins; $('.uz-lv span').textContent = TITLES[p.level] || 'Great Old One'; $('.uz-lv').title = depthOf(p.level); $('.uz-hex i').textContent = p.level;
      $('.xp').style.width = Math.min(100, Math.round(100 * p.xp / p.need)) + '%'; $('.xpt').textContent = p.xp + ' / ' + p.need;
      $('.hp').style.width = Math.round(100 * p.hp / p.maxHp) + '%'; $('.hpt').textContent = p.hp + ' / ' + p.maxHp;
      let say = V.say;
      if (!say) { const left = todayLeft(), k = D.frozen ? 'off' : D.hour >= 19 ? 'evening' : p.hp < 15 ? 'lowhp' : !left ? 'all' : D.hour < 10 ? 'morning' : (V.sayIx + D.hour) % 3 === 2 ? 'any' : 'left', L = SAYS[k];
        say = L[(V.sayIx + D.hour + Number(String(D.today).slice(-2))) % L.length].replace('{n}', left); }
      $('.uz-say div').textContent = say;
    }
    function paintTop() {
      if (V.last !== V.seenLast) { V.seenLast = V.last; V.lastAt = Date.now(); clearTimeout(V.lt); if (V.last) V.lt = setTimeout(paintTop, 10000); }
      $('.uz-undo').classList.toggle('hide', !V.last || Date.now() - V.lastAt > 9900);
      const L = V.last || {}, cn = L.unit === 'coin' && L.delta, col = L.unit === 'hp' ? '#ff7a66' : String(L.delta || '').charAt(0) === '−' ? '#c9a560' : '#ffd56a';
      $('.uz-undo').innerHTML = '<img src="' + IMG.rune + '" style="width:8px;height:10px;opacity:.8" alt=""><div class="t"><span>' + esc(L.verb || 'The tide is calm.') + '</span><span class="n">' + esc(L.name || '') + '</span><span style="font-weight:700;color:' + col + '">' + esc(L.delta || '') + '</span>' +
        (cn ? coin(14, String(L.delta).replace(/[^0-9]/g, ''), L.name) : '') + (L.unit === 'hp' ? '<img src="' + IMG.heart + '" style="width:11px;height:11px" alt="">' : '') + '</div>' + (stack.length ? '<button data-a="undo">↶ UNDO</button>' : '');
      const left = todayLeft(), soon = 0;
      $('.uz-tabs').innerHTML = ['The Call', 'Grimoire', 'Omens', 'Den'].map((l, i) => '<button data-a="tab" data-v="' + i + '" style="color:' + (V.tab === i ? TABC[i] : '#7f9389') + '">' + l +
        ((i === 0 && left) || (i === 1 && soon) ? '<b style="background:' + (i === 0 ? '#5ef2a0' : '#ff7a66') + '">' + (i === 0 ? left : soon) + '</b>' : '') + '</button>').join('') +
        '<div class="uz-ink" style="left:' + (V.tab * 25) + '%"><i style="background:' + TABC[V.tab] + ';box-shadow:0 0 10px ' + TABC[V.tab] + ',0 0 2px ' + TABC[V.tab] + '"></i></div>';
      const K = { pri: ['#5ef2a0', '#5ef2a0', '#08100d'], sec: ['#2f443b', '#131d19', '#cfd8d3'], pur: ['#a48aff', '#a48aff', '#0d0818'], red: ['#ff7a66', '#2a1214', '#ffb3a8'], ice: ['#5aa7ff', D.frozen ? '#5aa7ff' : '#0f1a24', D.frozen ? '#08101a' : '#bfe0ff'] };
      const dk = (label, a, kind, flex, v) => '<button data-a="' + a + '"' + (v ? ' data-v="' + v + '"' : '') + ' style="flex:' + (flex || 1) + ';border-color:' + K[kind][0] + ';background:' + K[kind][1] + ';color:' + K[kind][2] + '">' + label + '</button>';
      let h;
      if (V.form) h = dk('Cancel', 'close', 'sec');
      else if (V.tab === 0) h = dk('+ Quest', 'form', 'pur', 1, 'quest') + dk('+ Ritual', 'form', 'pri', 1, 'ritual');
      else if (V.tab === 1) h = dk('+ Ritual', 'form', 'pri', 1, 'ritual') + dk('+ Quest', 'form', 'pur', 1, 'quest') + dk('+ Boss', 'form', 'red', 1, 'boss');
      else if (V.tab === 2) h = dk('+ Curse or blessing', 'form', 'sec', 1, 'curse');
      else h = [['room', 'Sanctum'], ['shop', 'Black Market'], ['ward', 'Cloaks'], ['hoard', 'Hoard']].map(([k, l]) => '<button class="sm" data-a="den" data-v="' + k + '" style="flex:1;border-color:' + (V.den === k ? '#ffd56a' : '#2a3b33') + ';background:' + (V.den === k ? '#2a2210' : '#131d19') + ';color:' + (V.den === k ? '#ffd56a' : '#a9b8ae') + '">' + l + '</button>').join('') +
        (V.den === 'hoard' ? '<button data-a="form" data-v="reward" style="flex:0 0 46px;border-color:#ffd56a;background:#ffd56a;color:#1a1004;font:700 20px var(--a)">+</button>' : '');
      $('.uz-dock').innerHTML = h;
    }

    /* ---------- Rituals ---------- */
    const rep = (g) => { if (g.everyN) return g.everyN % 7 === 0 ? 'Every ' + (g.everyN === 7 ? 'week' : g.everyN / 7 + ' weeks') : 'Every ' + g.everyN + ' days';
      const d = String(g.days || ''); if (d === '12345') return 'School days'; if (d === '1234567') return 'Every day'; if (d.length === 1) return DN[Number(d) % 7] + 's'; return d.split('').map((x) => DN[Number(x) % 7]).join(', '); };
    const archBtn = (id, col) => V.edit ? '<button class="uz-pen" data-a="arch" data-id="' + id + '" title="Archive"' + (col ? ' style="color:' + col + '"' : '') + '>×</button>' : '';
    const SEAL = '<span class="uz-seal"><img src="' + IMG.seal + '" alt="">it will come to pass</span>';
    // a ritual: its sigil, its name, how often it repeats, its streak in nights, and the last 14 days as a thin strip
    // after a ritual with an aim is ticked (Patryk 2026-10-28): the tick is the bottom line; a minutes dial or a
    // "full session" mark records the aim. The phone remembers the usual minutes and sends them with the tick.
    const USUAL = (id, v) => { const u = LS('ulhuUsual') || {}; if (v === undefined) return u[id]; u[id] = v; LS('ulhuUsual', u); };
    function aimBar(g) {
      if (!g.aim || !g.doneToday) return '';
      const t = g.aimToday || {}, wk = g.aimWeek || {}, chip = (lbl, sel, a, v) => '<button class="' + (sel ? 'on' : '') + '" data-a="' + a + '" data-id="' + g.id + '" data-v="' + v + '">' + lbl + '</button>';
      const note = g.aim.type === 'avg' ? (wk.avg || 0) + ' of ' + g.aim.target + ' min a day' : g.aim.type === 'count' ? (wk.full || 0) + ' of ' + g.aim.target + ' full this week' : (wk.days || 0) + ' of ' + g.aim.target + ' this week';
      const chips = g.aim.type === 'avg' ? [1, 5, 15, 30, 60].map((m) => chip(m + ' min', t.minutes === m, 'aimmin', m)).join('') : g.aim.type === 'count' ? chip(t.full ? 'Full session ✓' : 'Full session?', !!t.full, 'aimfull', t.full ? 0 : 1) : '';
      return '<div class="uz-aim">' + chips + '<span>' + note + '</span></div>';
    }
    function ritualRow(g) {
      const on = g.doneToday, emb = !on && g.miss && !D.frozen, n = g.streak, col = sCol(Math.max(1, n + (on ? 0 : 1)));
      const st = g.strip ? '<div class="uz-strip">' + String(g.strip).split('').map((c) => '<i style="background:' + (c === 'o' ? col : c === 'f' ? '#3a6a9a' : c === 'x' ? '#3a1418' : '#1a1430') + '"></i>').join('') + '</div>' : '';
      if (window.STONE) return '<div class="uz-strow' + (on ? ' done' : '') + '">' + STONE.row({ id: g.id, name: g.name, streak: n, done: on,
          subHtml: '<span>' + (on ? 'appeased' : emb ? 'embers' : 'awaits') + '</span> <span>' + esc(rep(g)) + '</span>' + (n > 0 ? ' <span style="font-weight:700;color:' + col + '">' + n + ' night' + (n === 1 ? '' : 's') + '</span>' : ''),
          payHtml: '<span class="uz-pay">' + (g.auto ? SEAL : '') + '<span>+' + g.pay + coin(18, g.pay, g.id) + '</span></span>' + archBtn(g.id),
          tickAttrs: 'data-a="tick" data-id="' + g.id + '" data-fx="' + g.id + '"', bodyAttrs: 'data-a="editg" data-id="' + g.id + '"' }) + '</div>' + st + aimBar(g);
      return '<div class="uz-row sg' + (on ? ' done' : '') + '">' + sigil(g, on) +
        '<div class="uz-mid uz-ed" data-a="editg" data-id="' + g.id + '"><div class="nm">' + esc(g.name) + '</div><div class="uz-sub"><span>' + (on ? 'appeased' : emb ? 'embers' : 'awaits') + '</span><span>' + esc(rep(g)) + '</span>' +
        (n > 0 ? '<span style="font-weight:700;color:' + col + '">' + n + ' night' + (n === 1 ? '' : 's') + '</span>' : '') + '</div></div>' +
        '<div class="uz-pay">' + (g.auto ? SEAL : '') + '<span>+' + g.pay + coin(18, g.pay, g.id) + '</span></div>' + archBtn(g.id) + '</div>' + st + aimBar(g);
    }
    function header(id, name, plain, meta, metaCol, child) {
      const open = !!V.open[id];
      return '<div class="uz-h" style="border-color:' + (child ? '#1c2924' : '#2a3b33') + '"><button data-a="fold" data-v="' + id + '"><span class="uz-chev" style="transform:rotate(' + (open ? 90 : 0) + 'deg)">▶</span>' +
        '<span class="uz-ht"><b style="font-size:' + (child ? 18 : 22) + 'px;color:' + (child ? '#cfe8dc' : '#e8e1cf') + '">' + esc(name) + '</b></span></button>' +
        (V.renaming === id ? '<input class="uz-ren" data-ren="' + id + '" value="' + esc(name) + '">' : '') +
        '<span class="uz-meta" style="color:' + (metaCol || '#7f9389') + '">' + esc(meta) + '</span><button class="uz-pen" data-a="rename" data-v="' + id + '" title="Rename">✎</button></div>';
    }
    function markingCards(marking) {
      return '<div class="uz-mk">' + marking.map((m) => {
            const n = m.sittings || 1, cls = m.name.replace(/^Mark\s+/i, '').replace(/\s+books\b.*$/i, '');
            const lab = (i) => n === 1 ? 'Marked' : n === 2 ? (i ? '2nd half' : '1st half') : 'Part ' + (i + 1);
            return '<div class="uz-mc"><div class="hd"><b class="uz-ed" data-a="editg" data-id="' + m.id + '">' + esc(cls) + (m.due ? ' <small style="font:600 12px var(--a);color:#f2a93b">by ' + dshort(m.due) + '</small>' : '') + '</b><span>+' + m.pay + coin(13, m.pay, m.id) + '<span style="color:#93a69c;font-weight:400">each</span></span></div><div class="uz-hv" style="grid-template-columns:repeat(' + Math.min(n, 2) + ',1fr)">' +
              Array.from({ length: n }, (_, i) => { const on = i < m.sitDone, a = on ? (i === m.sitDone - 1 ? 'untick' : '') : (i === m.sitDone ? 'tick' : '');
                return '<button class="' + (on ? 'on' : '') + '"' + (a ? ' data-a="' + a + '" data-id="' + m.id + '" data-fx="' + m.id + i + '"' : '') + '>' + (on ? '✓ ' : '') + lab(i) + '</button>'; }).join('') + '</div>' +
              (V.edit ? '<button class="uz-pen" data-a="arch" data-id="' + m.id + '" style="width:auto;height:30px">Archive</button>' : '') + '</div>';
          }).join('') + '<button class="uz-new" data-a="form" data-v="mark">+ Class to mark</button></div>';
    }
    const summonRow = (s) => '<div class="uz-row' + (s.built ? ' done' : '') + '" style="--e:' + (s.ahead ? '#f2a93b' : '#5aa7ff') + '"><span class="uz-tk' + (s.built ? ' on' : ' auto') + '">' + (s.built ? '<img src="' + IMG.tick + '" alt="">' : '') + '</span>' +
              '<div class="uz-mid"><div class="nm">' + esc(s.name) + '</div><div class="uz-sub"><span>for ' + esc(dshort(s.date)) + '</span></div></div><div class="uz-pay">' + SEAL + (s.pay ? '<span>+' + s.pay + coin(18, s.pay, s.name) + '</span>' : '') + '</div></div>';
    const nextSchool = (t) => { let d = addD(t, 1); while (dt(d).getUTCDay() % 6 === 0) d = addD(d, 1); return d; };
    const dueTxt = (d) => { const n = diff(D.today, d); return n < 0 ? 'lurks' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : n < 7 ? DN[dt(d).getUTCDay()] : dshort(d); };
    function stageRow(b, st, i) {
      return '<div class="uz-row" style="--e:#ff7a66"><button class="uz-tk" data-a="stage" data-id="' + b.id + '" data-v="' + i + '" data-fx="' + b.id + 's' + i + '" aria-label="' + esc(st.name) + '"></button>' +
        '<div class="uz-mid"><div class="nm">' + esc(st.name) + '</div><div class="uz-sub"><span style="color:#ff9a85">' + esc(b.name) + '</span><span>' + dueTxt(st.due) + '</span></div></div></div>';
    }
    function markRow(m) {
      const full = m.sitDone >= m.sittings;
      return '<div class="uz-parch uz-q' + (full ? ' done' : '') + '" style="--e:#f2a93b"><div class="top"><button class="uz-tk" data-a="' + (full ? 'untick' : 'tick') + '" data-id="' + m.id + '" data-fx="' + m.id + 't" aria-label="' + esc(m.name) + '">' + (full ? '<img class="uz-stamp" src="' + IMG.wax + '" alt="">' : '') + '</button>' +
        '<div class="uz-mid uz-ed" data-a="editg" data-id="' + m.id + '"><div class="nm">' + esc(m.name) + '</div><div class="uz-sub"><span style="font-weight:700">' + m.sitDone + '/' + m.sittings + '</span>' + (m.due && !full ? dueChip(m.due) : '') + '</div></div>' +
        '<div style="flex:none;display:flex;align-items:center;gap:3px;font:700 16px var(--a);color:#7a4e14">+' + m.pay + coin(18, m.pay, m.id) + '</div>' + archBtn(m.id, '#7a5a34') + '</div></div>';
    }
    // everything due today, in the order to do it: overdue and due-today jobs, this week's marking, tomorrow's lessons, chores, then life
    function todayItems() {
      const t = D.today, nx = nextSchool(t), work = [], life = [], done = [];
      D.goals.filter((g) => g.kind === 'todo' && (!g.doneOn || V.settling[g.id]) && g.due && g.due <= t).forEach((q) => work.push({ id: q.id, name: q.name, html: questCard(q) }));
      D.bosses.forEach((b) => b.stages.forEach((st, i) => { if (!st.done && st.due && st.due <= t) work.push({ id: b.id + 's' + i, name: st.name, html: stageRow(b, st, i) }); }));
      D.goals.filter((g) => g.kind === 'termly' && g.sitDone < g.sittings && g.due && diff(t, g.due) <= 6).sort((a, b) => (a.due < b.due ? -1 : 1)).forEach((m) => work.push({ id: m.id, name: m.name, html: markRow(m) }));
      D.summoned.filter((x) => !x.built && x.date <= nx).forEach((x) => work.push({ id: x.name, name: x.name, html: summonRow(x), auto: true }));
      dailies().forEach((g) => { const it = { id: g.id, name: g.name, html: ritualRow(g), auto: !!g.auto };
        if (g.doneToday && !V.settling[g.id]) done.push(it); else (g.track === 'life' ? life : work).push(it); });
      return { work, life, done };
    }
    const todayLeft = () => { if (!D) return 0; const T = todayItems(); return T.work.length + T.life.length; };
    function today() {
      const T = todayItems(); let h = '';
      const rs = D.player.rise;   // the Rise quest after fainting (Patryk 2026-10-28)
      if (rs && !rs.done) h += '<div class="uz-rise"><b>Rise</b>Do 3 rituals today to win back ' + rs.back + ' of the lost runes. ' + Math.min(rs.got, 3) + ' of 3.</div>';
      if (D.review && D.review.show) h += review();
      if (T.work.length) h += '<div class="uz-cap"><span><b style="color:#cfe8dc">Toil</b></span><span style="font:700 12px var(--a);color:#5ef2a0">' + T.work.length + ' left</span></div>' + T.work.map((x) => x.html).join('');
      if (T.life.length) h += '<div class="uz-cap" style="margin-top:6px"><span><b style="color:#b6ffd6">The Surface</b></span><span style="font:700 12px var(--a);color:#5ee08a">' + T.life.length + ' left</span></div>' + T.life.map((x) => x.html).join('');
      // quests not due yet, or with no date, were nowhere on this tab (Patryk 2026-10-27: "I can't see any quests")
      const later = D.goals.filter((g) => g.kind === 'todo' && !g.doneOn && !(g.due && g.due <= D.today)).sort((a, b) => ((a.due || '9') < (b.due || '9') ? -1 : 1));
      if (later.length) h += '<div class="uz-cap" style="margin-top:6px"><span><b style="color:#c9b8ff">Quests ahead</b></span><span style="font:700 12px var(--a);color:#a48aff">' + later.length + '</span></div>' + later.map(questCard).join('');
      if (!T.work.length && !T.life.length && !later.length) h += '<p class="uz-p" style="color:#93a69c;font-size:15px;text-align:center;padding:18px 0">' + (D.frozen ? 'Day off. Rest.' : 'Nothing left today. The deep is pleased.') + '</p>';
      if (T.done.length) h += '<button class="uz-cap" data-a="fold" data-v="tdone" style="margin-top:6px"><span class="uz-chev" style="transform:rotate(' + (V.open.tdone ? 90 : 0) + 'deg)">▶</span><span><b style="color:#93a69c">Appeased</b></span><span style="font:700 12px var(--a);color:#93a69c">' + T.done.length + '</span></button>' + (V.open.tdone ? T.done.map((x) => x.html).join('') : '');
      return h;
    }
    // Breakwater: how far ahead lessons and homework are (a week ahead and two weeks ahead each pay once a week)
    function breakwater() {
      const L = D.tide >= 3 ? 2 : D.tide >= 2 ? 1 : 0, H = D.hw ? Math.min(2, D.hw.weeks) : null;
      const pills = (n) => ['1 wk', '2 wks'].map((w, i) => '<i class="' + (i < n ? 'on' : '') + '">' + (i < n ? '✓ ' : '') + w + '</i>').join('');
      return '<div class="uz-bw"><b>Breakwater</b><span>Lessons ' + pills(L) + '</span>' + (H === null ? '' : '<span>Homework ' + pills(H) + '</span>') + '</div>';
    }
    // which area a group belongs to: Teaching (teach and its children), Life (life and its children), or its own
    const areaOf = (gid) => { const g = D.groups.find((x) => x.id === gid); if (!g) return gid === 'life' ? 'life' : 'teach'; return g.parent || g.id; };
    // the Grimoire (Patryk 2026-10-26): your book by area. Each area holds its rituals, then its quests (marking and bosses
    // are quests too), folded to one line. Vanquished (finished quests and beaten bosses) at the bottom.
    function grimoire() {
      const t = D.today, rits = D.goals.filter((g) => g.kind === 'daily'), qs = D.goals.filter((g) => g.kind === 'todo' && (!g.doneOn || V.settling[g.id]));
      const marks = D.goals.filter((g) => g.kind === 'termly' && g.sitDone < g.sittings), byDue = (a, b) => ((a.due || '9') < (b.due || '9') ? -1 : 1);
      let h = breakwater();
      D.groups.filter((g) => !g.parent && g.type !== 'summon' && g.type !== 'marking').forEach((a) => {
        const kids = D.groups.filter((x) => (x.id === a.id || x.parent === a.id) && x.type === 'list');
        const r = rits.filter((g) => kids.some((x) => x.id === g.grp));
        const q = qs.filter((g) => areaOf(g.grp) === a.id);
        const mk = a.id === 'teach' ? marks : [], bo = D.bosses.filter((b) => areaOf(b.grp || 'teach') === a.id), nq = q.length + mk.length + bo.length;
        h += '<div class="uz-sec">' + header(a.id, a.name, '', r.length + ' rituals · ' + nq + ' quests', '', false);
        if (V.open[a.id]) {
          if (r.length) h += '<div class="uz-sub2">Rituals</div>';
          kids.forEach((x) => { const list = r.filter((g) => g.grp === x.id).sort((p1, p2) => (p2.dueToday - p1.dueToday)); if (!list.length) return;
            if (kids.length > 1) h += '<div class="uz-sub2" style="font-size:15px;color:#7f9389">' + esc(x.name) + '<button class="uz-pen" data-a="rename" data-v="' + x.id + '" title="Rename">✎</button></div>' + (V.renaming === x.id ? '<input class="uz-ren" data-ren="' + x.id + '" value="' + esc(x.name) + '">' : '');
            h += list.map(ritualRow).join(''); });
          if (nq) h += '<div class="uz-sub2">Quests</div>' + q.sort(byDue).map(questCard).join('') + mk.sort(byDue).map(markRow).join('') + bo.map(bossCard).join('');
        }
        h += '</div>';
      });
      const fin = D.goals.filter((g) => (g.kind === 'todo' && g.doneOn && !V.settling[g.id]) || (g.kind === 'termly' && g.sitDone >= g.sittings)), bt = D.beaten || [];
      if (fin.length || bt.length) h += '<button class="uz-cap" data-a="vanq" style="margin-top:4px"><span class="uz-chev" style="color:#8a7a74;transform:rotate(' + (V.vanq ? 90 : 0) + 'deg)">▶</span><span><b style="color:#c4b0aa">Vanquished</b></span><span style="font:700 12px var(--a);color:#8a7a74">' + (fin.length + bt.length) + '</span></button>' +
        (V.vanq ? fin.map((g) => g.kind === 'termly' ? markRow(g) : questCard(g)).join('') + (window.TEMPLE && bt.length ? '<ol style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px">' + bt.map((b) => TEMPLE.trophy(b, { fresh: V.freshTrophy === b.id })).join('') + '</ol>' : bt.map((b) => '<div style="display:flex;align-items:center;gap:10px;padding:4px 8px;border-radius:4px;background:#140c0d;border:1px solid #2a1a1c;opacity:.85"><img src="' + (P.bosses[b.k] || P.bosses.spawn).src + '" style="height:26px;filter:grayscale(.7)" alt=""><span style="flex:1;font:14px var(--a);color:#c4b0aa">' + esc(b.name) + '</span><img src="' + IMG.trophy + '" style="width:16px;height:16px" alt=""></div>').join('')) : '');
      h += '<button class="uz-new" data-a="form" data-v="group">+ New group</button><button class="uz-new" data-a="form" data-v="mark">+ Books to mark</button>';
      h += '<button class="uz-new" data-a="edit" style="font:700 13px var(--a)">' + (V.edit ? 'Stop editing' : 'Edit') + '</button>';
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
      if (dd < 0) { t = 'lurks'; bg = '#3a1418'; fg = '#ffb3a8'; } else if (dd === 0) { t = 'today'; bg = '#a3202a'; fg = '#fff0e8'; gl = '0 0 10px rgba(255,90,74,.9)'; } else if (dd === 1) { t = 'tomorrow'; bg = '#c4502a'; fg = '#fff0e8'; gl = '0 0 6px rgba(255,140,74,.7)'; } else if (dd <= 6) { t = DN[dt(due).getUTCDay()]; bg = '#e8b04a'; fg = '#3a2008'; } else t = dshort(due);
      return '<span class="uz-due" style="background:' + bg + ';color:' + fg + ';box-shadow:' + gl + '">' + t + '</span>';
    }
    function questCard(q) {
      const k = KIND[q.track] || KIND.necessary, done = !!q.doneOn, sd = q.steps.filter((x) => x.d).length;
      return '<div class="uz-parch uz-q' + (done ? ' done' : '') + '" style="--e:' + k.c + '"><div class="top"><button class="uz-tk" data-a="tick" data-id="' + q.id + '" data-fx="' + q.id + '" aria-label="' + esc(q.name) + '">' + (done ? '<img class="uz-stamp" data-q="' + q.id + '" src="' + IMG.wax + '" alt="">' : '') + '</button>' +
        '<div class="uz-mid uz-ed" data-a="editg" data-id="' + q.id + '"><div class="nm">' + esc(q.name) + '</div><div class="uz-sub">' + (q.due && !done ? dueChip(q.due) : '') + (q.steps.length ? '<span style="font-weight:700">' + sd + '/' + q.steps.length + '</span>' : '') + '</div></div>' +
        '<div style="flex:none;display:flex;align-items:center;gap:3px;font:700 16px var(--a);color:#7a4e14">+' + q.pay + coin(18, q.pay, q.id) + '</div>' + archBtn(q.id, '#7a5a34') + '</div>' +
        (q.steps.length && !done ? '<div class="uz-steps">' + q.steps.map((s, i) => '<button data-a="step" data-id="' + q.id + '" data-v="' + i + '"><i style="background:' + (s.d ? '#6a4a2a' : 'transparent') + '">' + (s.d ? '✓' : '') + '</i><span style="font:14px var(--a);text-decoration:' + (s.d ? 'line-through' : 'none') + ';color:' + (s.d ? '#7a6040' : '#2a1a12') + '">' + esc(s.t) + '</span></button>').join('') + '</div>' : '') + '</div>';
    }
    const creature = (b) => b.creature || SIZE[b.size || 5].k;
    function bossCard(b) {
      if (window.TEMPLE) { const arm = V.banishArm === b.id;
        return '<div class="uz-bossw" data-boss="' + b.id + '">' + TEMPLE.card(Object.assign({}, b, { k: creature(b) }), { today: D.today, stageAttrs: (i) => 'data-a="stage" data-id="' + b.id + '" data-v="' + i + '" data-fx="' + b.id + 's' + i + '"',
          editAttrs: 'data-a="editb" data-id="' + b.id + '"', banishHtml: '<button data-a="banish" data-id="' + b.id + '" style="height:40px;padding:0 10px;border:1px solid ' + (arm ? '#ff7a66' : '#4a2a2e') + ';border-radius:4px;background:' + (arm ? '#4a1418' : 'transparent') + ';color:' + (arm ? '#ffd0c4' : '#b08a84') + ';font:700 12px var(--a)">' + (arm ? 'Tap again to banish' : 'Banish') + '</button>' }) + '</div>'; }
      const k = creature(b), spr = P.bosses[k] || P.bosses.spawn, meta = P.bossMeta[k] || P.bossMeta.spawn, n = b.stages.length, arm = V.banishArm === b.id, open = V.open[b.id] !== 0;
      return '<div class="uz-boss"><button data-a="fold" data-v="' + b.id + '" data-def="1"><div class="uz-cr"><img data-creature="' + b.id + '" src="' + spr.src + '" style="width:' + Math.min(68, spr.w * 2) + 'px;height:auto;filter:drop-shadow(0 2px 0 #000)" alt=""></div>' +
        '<div style="flex:1;min-width:0"><div style="font:500 19px/1.05 var(--g);color:#f4e0d8">' + esc(b.name) + '</div><div style="margin-top:3px;font:12px var(--a);color:#c49a94">' + esc(meta.size || b.size + 'h') + ' · ' + esc(meta.name) + ' · ' + b.stages.filter((x) => x.done).length + ' of ' + n + ' stages</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:6px"><div class="uz-hpb"><i style="width:' + b.hp + '%"></i></div><span style="font:700 12px var(--a);color:#ffb3a8">' + b.hp + '/100</span></div></div></button>' +
        (open ? '<div style="padding:0 10px 8px;display:flex;flex-direction:column;gap:5px">' + b.stages.map((st, i) => {
          let tag, f, bg, bd; const over = !st.done && st.due && st.due < D.today;
          if (st.done && !st.late) { tag = '−' + Math.round(100 / n) + ' hit'; f = '#ffd0c4'; bg = '#5a1a20'; bd = '#a3202a'; } else if (st.done) { tag = '−' + Math.round(50 / n) + ' late'; f = '#ffd0c4'; bg = '#3a1418'; bd = '#6a2a2e'; }
          else if (over) { tag = 'overdue'; f = '#ff9a85'; bg = 'transparent'; bd = '#ff7a66'; } else if (st.due === D.today) { tag = 'today'; f = '#3a2008'; bg = '#e8b04a'; bd = '#e8b04a'; } else if (st.due) { tag = diff(D.today, st.due) + ' days'; f = '#b08a84'; bg = 'transparent'; bd = '#3a1a1e'; } else { tag = 'no date'; f = '#b08a84'; bg = 'transparent'; bd = '#3a1a1e'; }
          return '<div class="uz-st"><button class="uz-tk' + (st.done ? ' on' : '') + '" data-a="stage" data-id="' + b.id + '" data-v="' + i + '" data-fx="' + b.id + 's' + i + '">' + (st.done ? '<img src="' + IMG.tick + '" style="width:20px;height:16px" alt="">' : '') + '</button>' +
            '<div style="flex:1;min-width:0"><div style="font:700 14px var(--a);color:#f0e0d8;text-decoration:' + (st.done ? 'line-through' : 'none') + '">' + esc(st.name) + '</div><div style="font:12px var(--a);color:#b08a84">' + (st.due ? dueTxt(st.due) : '') + '</div></div>' +
            '<span class="uz-tag" style="color:' + f + ';background:' + bg + ';border-color:' + bd + '">' + tag + '</span></div>';
        }).join('') + '<div style="display:flex;align-items:center;justify-content:space-between;padding-top:2px"><span style="display:flex;align-items:center;gap:4px;font:700 13px var(--a);color:#f0c45a">' + b.reward + coin(16, b.reward, b.id, 'boss') + '<span style="color:#c49a94;font-weight:400">+ trophy when beaten</span></span>' +
          '<span style="display:flex;gap:6px"><button data-a="editb" data-id="' + b.id + '" style="height:40px;padding:0 10px;border:1px solid #4a2a2e;border-radius:4px;background:transparent;color:#ffb3a8;font:700 12px var(--a)">✎ Edit</button>' +
          '<button data-a="banish" data-id="' + b.id + '" style="height:40px;padding:0 10px;border:1px solid ' + (arm ? '#ff7a66' : '#4a2a2e') + ';border-radius:4px;background:' + (arm ? '#4a1418' : 'transparent') + ';color:' + (arm ? '#ffd0c4' : '#b08a84') + ';font:700 12px var(--a)">' + (arm ? 'Tap again to banish' : 'Banish') + '</button></span></div></div>' : '') + '</div>';
    }
    /* ---------- Omens (curses and blessings; tab renamed by Patryk 2026-10-25) ---------- */
    const isBless = (g) => g.kind === 'habit' && g.polarity === 'plus', isCurse = (g) => g.kind === 'habit' && g.polarity === 'minus', isBoth = (g) => g.kind === 'habit' && g.polarity === 'both';
    // a habit's picture for one side ('c' or 'b'); a two-sided habit keeps both in grp as 'curseKey|blessKey'
    const picOf = (g, side) => { const pol = side === 'c' ? 'minus' : 'plus'; if (g.polarity !== 'both') return OMENS.of(g); const pr = String(g.grp || '').split('|'); return OMENS.of({ polarity: pol, name: g.name, grp: pr[side === 'c' ? 0 : 1] || '' }); };
    const ROMAN = ['', 'I', 'II'];
    const sides = (nm) => { const pr = String(nm).split(' / '); return [pr[0], pr[1] || pr[0]]; };
    // a two-sided omen (Patryk 2026-10-27): curse half on the left, blessing half on the right, the two pictures meeting on a slanted seam
    function twoCard(g) { const cn = g.cCount || 0, bn = g.bCount || 0, ab = g.absolve;
      return '<div class="uz-two"><button class="uz-twl" data-a="curse" data-id="' + g.id + '" data-fx="' + g.id + '" style="border-color:' + (cn ? '#c4323a' : '#4a1c22') + '"><span class="tg" style="color:#ff7a66">CURSE</span>' +
        '<span class="ft"><span style="color:#ff7a66">−' + g.hpLoss + ' HP</span><span style="color:#b08a84">' + (cn ? cn + '×' : '') + '</span></span></button>' +
        '<button class="uz-twr" data-a="bless" data-id="' + g.id + '" data-fx="' + g.id + 'b" style="border-color:' + (ab ? '#d8b25a' : bn ? '#4a8ad0' : '#1f4266') + '"><span class="tg" style="color:' + (ab ? '#ffe2a0' : '#9fc8ff') + '">' + (ab ? 'ABSOLUTION ' + ROMAN[ab.stage + 1] : 'BLESSING') + '</span>' +
        '<span class="ft"><span style="color:#b08a84">' + (bn ? bn + '×' : '') + '</span><span style="display:flex;align-items:center;gap:3px;color:#f0c45a">+' + g.pay + coin(15, g.pay, g.id) + '</span></span></button>' +
        '<span class="uz-twn"><span>' + esc(sides(g.name)[0]) + '</span><span style="text-align:right">' + esc(sides(g.name)[1]) + '</span></span><span class="uz-twm"><img src="' + OMENS.card('c', picOf(g, 'c')) + '" alt=""><img class="rt" src="' + OMENS.card('b', picOf(g, 'b')) + '" alt=""><i></i></span></div>'; }
    // the line on an antidote blessing while its Absolution is open
    const absTag = (g) => g.absolve ? '<span class="uz-abs">Absolution ' + ROMAN[g.absolve.stage + 1] + ' · ' + esc(g.absolve.name) + ' · +' + (g.absolve.stage ? g.absolve.lost - Math.floor(g.absolve.lost / 2) : Math.floor(g.absolve.lost / 2)) + ' HP</span>' : '';
    function curses() {
      const abc = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }), cs = D.goals.filter(isCurse).sort(abc), bs = D.goals.filter(isBless).sort((a, b) => (b.absolve ? 1 : 0) - (a.absolve ? 1 : 0) || abc(a, b)), two = D.goals.filter(isBoth).sort(abc), cnt = D.blessCount || 0, cpos = cnt % 8, p = D.player;
      let h = two.length ? '<div class="uz-cap" style="border-color:#3a2a4e"><span><b style="color:#e0c8ff">Both Ways</b></span></div><div style="display:flex;flex-direction:column;gap:8px">' + two.map(twoCard).join('') + '</div>' +
        (V.edit ? '<div class="uz-chips">' + two.map((c) => '<button data-a="arch" data-id="' + c.id + '">× ' + esc(c.name) + '</button>').join('') + '</div>' : '') : '';
      h += '<div class="uz-cap" style="border-color:#3a1a1e;margin-top:' + (two.length ? 6 : 0) + 'px"><span><b style="color:#ffb3a8">The Cursed Shelf</b></span></div>';
      // curses as 2-column cards like the blessings (Patryk 2026-10-26)
      h += cs.length ? '<div class="uz-bl">' + cs.map((c) => { const n = c.count || 0;
        return '<button class="uz-bt" data-a="curse" data-id="' + c.id + '" data-fx="' + c.id + '" aria-label="Slipped: ' + esc(c.name) + '" style="background:linear-gradient(180deg,#2a1216,#170a0c);border:1.5px solid ' + (n ? '#c4323a' : '#4a1c22') + '">' +
          '<span style="display:flex;align-items:center;gap:7px"><span class="uz-omc"><img src="' + OMENS.card('c', OMENS.of(c)) + '" alt=""></span><span style="flex:1;min-width:0;font:700 14px/1.15 var(--a);color:#f0e0d8">' + esc(c.name) + '</span></span>' +
          '<span style="display:flex;align-items:center;justify-content:space-between"><span style="display:flex;align-items:center;gap:4px;font:700 14px var(--a);color:#ff7a66">−' + c.hpLoss + '<img src="' + IMG.heart + '" style="width:12px;height:12px" alt=""></span>' +
          '<span style="font:12px var(--a);color:#b08a84">' + (n ? n + '× today' : 'spared today') + '</span></span></button>'; }).join('') + '</div>' : '<p class="uz-p" style="color:#b08a84">No curses. Tap + Add.</p>';
      if (V.edit && cs.length) h += '<div class="uz-chips">' + cs.map((c) => '<button data-a="arch" data-id="' + c.id + '">× ' + esc(c.name) + '</button>').join('') + '</div>';
      if (p.hp <= 12) h += '<p class="uz-p" style="color:#b08a84">' + 'Careful: ' + p.hp + ' HP left.' + '</p>';
      h += '<div class="uz-cap" style="border-color:#1e2e4e;margin-top:6px"><span><b style="color:#c4e0ff;text-shadow:0 0 8px rgba(140,200,255,.7)">Small Blessings</b></span><span style="font:700 12px var(--a);color:#c4e0ff">' + cnt + ' today</span></div>';
      h += bs.length ? '<div class="uz-bl">' + bs.map((g) => { const f = false, n = g.count || 0;
        return '<button class="uz-bt" data-a="bless" data-id="' + g.id + '" data-fx="' + g.id + '" style="background:' + (f ? 'linear-gradient(180deg,#2a2410,#151208)' : 'linear-gradient(180deg,#10233a,#0b1626)') + ';border:1.5px solid ' + (g.absolve ? '#d8b25a' : f ? '#8a6a2a' : n ? '#4a8ad0' : '#1f4266') + (g.absolve ? ';box-shadow:0 0 12px rgba(255,214,140,.35)' : n ? ';box-shadow:0 0 10px rgba(110,180,255,.35)' : '') + '">' +
          '<span style="display:flex;align-items:center;gap:7px"><span class="uz-omc"><img src="' + OMENS.card('b', OMENS.of(g)) + '" alt=""></span><span style="flex:1;min-width:0;font:700 14px/1.15 var(--a);color:#e8f2ff">' + esc(g.name) + '</span></span>' + absTag(g) +
          '<span style="display:flex;align-items:center;justify-content:space-between"><span style="display:flex;align-items:center;gap:3px;font:700 14px var(--a);color:#f0c45a">+' + g.pay + coin(15, g.pay, g.id) + '</span><span style="display:flex;gap:3px">' +
          [0, 1, 2, 3, 4].map((i) => '<span style="width:7px;height:7px;border-radius:1px;background:' + (i < n ? (f ? '#ffd56a' : '#c8e6ff') : '#2c4a7a') + ';box-shadow:' + (i < n ? '0 0 5px rgba(170,215,255,.9)' : 'none') + '"></span>').join('') + '</span></span>' +
          (f ? '<span class="uz-x2">×2 TODAY</span>' : '') + '</button>'; }).join('') + '</div>' : '<p class="uz-p" style="color:#6f8a7c">No blessings yet.</p>';
      if (V.edit && bs.length) h += '<div class="uz-chips">' + bs.map((g) => '<button data-a="arch" data-id="' + g.id + '">× ' + esc(g.name) + '</button>').join('') + '</div>';
      // (The Frozen Tide list was removed 2026-10-26: days off are one button on the banner)
      h += '<button class="uz-new" data-a="edit" style="font:700 13px var(--a)">' + (V.edit ? 'Stop editing' : 'Edit') + '</button>';
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
      return h + (done ? '' : me2) + '<div style="position:absolute;left:10px;top:8px;font:500 18px var(--g);color:#cfe8dc;text-shadow:0 2px 0 #000">Sanctum</div></div>';
    }
    // the Oracle (Patryk 2026-10-26): this week as small sigils (a point lights per fifth of the day's rituals), then five weeks
    // as a star chart: all, most (three quarters or more), some, none; days you kept (most or all) join into constellations
    const LVC = { all: '#5ef2a0', most: '#ffd56a', some: '#a48aff', none: '#2a2050' };
    function oracle() {
      if (!CHRON) return '<div class="uz-orc"><h4>Oracle</h4><p class="uz-p" style="color:#a99cc8">Reading the stars…</p></div>';
      const wk = CHRON.days.slice(28), kept = CHRON.days.filter((d) => !d.future && (d.level === 'all' || d.level === 'most')).length;
      return '<div class="uz-orc"><h4>Oracle<span>' + kept + ' kept in 5 weeks</span></h4><div class="uz-wk">' + wk.map((d) => {
        const lab = DN[dt(d.day).getUTCDay()];
        if (d.level === 'off') return '<div class="' + (d.today ? 't' : '') + '"><span>' + lab + '</span><img src="' + MOON.cres + '" style="width:26px;height:26px;margin:6px" alt=""><small style="color:#cfe0ec">off</small></div>';
        if (d.future) return '<div><span>' + lab + '</span><img src="' + sigilSrc('#4a3a7a', false) + '" style="opacity:.5" alt=""><small>' + (d.later || '') + '</small></div>';
        const col = LVC[d.level], fifth = Math.round((d.share || 0) * 5);
        return '<div class="' + (d.today ? 't' : '') + '"><span>' + lab + '</span><img src="' + sigilSrc(col === LVC.none ? '#4a3a7a' : col, d.level === 'all', fifth) + '" alt=""' + (d.level === 'all' ? ' style="filter:drop-shadow(0 0 5px #5ef2a0)"' : '') + '><small style="color:' + (d.level === 'none' ? '#6a5a9a' : col) + '">' + (d.due ? d.n + '/' + d.due : '') + '</small></div>';
      }).join('') + '</div><canvas class="uz-sky" width="520" height="290"></canvas>' +
        '<div class="uz-leg">' + [['all', 'all'], ['most', 'most'], ['some', 'some'], ['none', 'none']].map(([k, l]) => '<span><i style="background:' + LVC[k] + '"></i>' + l + '</span>').join('') + '<span><i style="background:#cfe0ec"></i>day off</span></div></div>';
    }
    function drawSky() {
      const c = body.querySelector('.uz-sky'); if (!c || !CHRON) return; const x = c.getContext('2d'); x.clearRect(0, 0, 520, 290); x.fillStyle = '#0a0716'; x.fillRect(0, 0, 520, 290);
      for (let i = 0; i < 80; i++) { x.fillStyle = 'rgba(200,190,255,' + (((i * 37) % 23) / 100) + ')'; x.fillRect((i * 97) % 520, (i * 53) % 290, 1, 1); }
      x.font = '700 12px Atkinson Hyperlegible, sans-serif'; x.textAlign = 'center'; x.fillStyle = '#a99cc8'; ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, i) => x.fillText(d, 40 + i * 70, 18));
      const pos = (w, d) => [40 + d * 70 + ((w * 7 + d) % 3 - 1) * 9, 48 + w * 50 + ((w + d * 2) % 3 - 1) * 6], day = (w, d) => CHRON.days[w * 7 + d], kept = (o) => o && !o.future && (o.level === 'all' || o.level === 'most');
      x.strokeStyle = 'rgba(212,191,255,.5)'; x.lineWidth = 1.5;
      for (let w = 0; w < 5; w++) for (let d = 0; d < 6; d++) if (kept(day(w, d)) && kept(day(w, d + 1))) { const a = pos(w, d), b = pos(w, d + 1); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
      for (let w = 0; w < 5; w++) for (let d = 0; d < 7; d++) {
        const o = day(w, d), [X, Y] = pos(w, d); if (!o) continue;
        if (o.level === 'off') { x.fillStyle = '#cfe0ec'; x.beginPath(); x.arc(X, Y, 7, 0, Math.PI * 2); x.fill(); x.fillStyle = '#0a0716'; x.beginPath(); x.arc(X + 4, Y - 2, 6.5, 0, Math.PI * 2); x.fill(); continue; }
        if (o.future) { const n = Math.min(10, o.later || 0); x.setLineDash([2, 3]); x.strokeStyle = '#8a7ac8'; x.beginPath(); x.arc(X, Y, 4 + n, 0, Math.PI * 2); x.stroke(); x.setLineDash([]); if (n) { x.fillStyle = '#a99cc8'; x.fillText(n, X, Y + 4); } x.strokeStyle = 'rgba(212,191,255,.5)'; continue; }
        const L = { all: [6, 18], most: [5, 12], some: [3.5, 0], none: [2.5, 0] }[o.level] || [2.5, 0], col = LVC[o.level] || LVC.none;
        if (L[1]) { const gr = x.createRadialGradient(X, Y, 0, X, Y, L[1]); gr.addColorStop(0, col + '99'); gr.addColorStop(1, col + '00'); x.fillStyle = gr; x.fillRect(X - L[1], Y - L[1], L[1] * 2, L[1] * 2); }
        x.fillStyle = col; x.beginPath(); x.arc(X, Y, L[0], 0, Math.PI * 2); x.fill();
        if (o.level === 'all') { x.fillRect(X - 10, Y - .5, 20, 1); x.fillRect(X - .5, Y - 10, 1, 20); }
        if (o.today) { x.strokeStyle = '#efe6ff'; x.lineWidth = 2; x.beginPath(); x.arc(X, Y, 11, 0, Math.PI * 2); x.stroke(); x.lineWidth = 1.5; x.strokeStyle = 'rgba(212,191,255,.5)'; }
      }
    }
    function den() {
      let h = oracle();
      if (V.den === 'room') {
        h += roomHtml();
        const names = {}; (SHOP ? SHOP.items : []).forEach((i) => { names[i.id] = i.name; });
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' + Object.keys(SLOTL).map((sl) => { const id = (D.room || {})[sl];
          return '<div style="display:flex;align-items:center;gap:8px;min-height:48px;padding:3px 4px 3px 8px;border-radius:5px;background:#131d19;border:1px solid #23332c"><span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font:700 11px var(--a);letter-spacing:.1em;color:#7f9389;text-transform:uppercase">' + SLOTL[sl] + '</span><span style="font:13px var(--a);color:' + (id ? '#e0e8e3' : '#5a6a62') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(id ? names[id] || 'placed' : 'empty') + '</span></span>' +
            (id && sl !== 'floor' && sl !== 'wall' ? '<button data-a="unplace" data-id="' + id + '" data-v="' + sl + '" style="flex:none;width:40px;height:40px;border:none;background:none;color:#7f9389;font:16px var(--a)" title="Take out">×</button>' : '') + '</div>'; }).join('') + '</div>';
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
        if ((D.hoard || []).length) h += '<button class="uz-new" data-a="edit" style="font:700 13px var(--a)">' + (V.edit ? 'Stop editing' : 'Edit (remove rewards)') + '</button>';
      }
      return h;
    }

    /* ---------- forms (in place of the list, never over it) ---------- */
    const FORMS = {
      ritual: () => ({ name: '', len: 15, kind: 'necessary', rep: 'school', days: [1, 3, 5], n: 3, unit: 'days', group: 'chores' }),
      quest: () => ({ name: '', len: 30, kind: 'necessary', due: '', grp: 'teach', steps: [] }),
      mark: () => ({ name: 'Mark  books', len: 60, sittings: 2, due: '' }),
      boss: () => ({ name: '', size: 5, k: 'shog', grp: 'teach', steps: [{ n: '', by: addD(D.today, 3) }] }),
      group: () => ({ name: '', parent: 'teach' }), reward: () => ({ name: '', cost: 80 }), curse: () => ({ name: '', name2: '', len: 30, type: 'curse', anti: '', gc: '', gb: '' }) };
    const pay = (len, kind) => Math.round((D.table.base[len] || 6) * (D.table.mult[kind] || 1));
    // an existing ritual, quest, curse, blessing or marking class opened in its form (Patryk 2026-10-26: edit after setting)
    const formKind = (g) => ({ daily: 'ritual', todo: 'quest', termly: 'mark' }[g.kind] || 'curse');
    function draftOf(g) {
      const base = { id: g.id, name: g.name, len: g.minutes, grp0: g.grp, priv: g.private, who: g.who || '' };
      if (g.kind === 'daily') { const ds = String(g.days || ''), e = Number(g.everyN) || 0;
        return Object.assign(base, { kind: g.track, rep: e ? 'every' : ds === '12345' ? 'school' : 'days', days: ds.split('').map((x) => Number(x) % 7), n: e ? (e % 7 === 0 ? e / 7 : e) : 3, unit: e && e % 7 === 0 ? 'weeks' : 'days', group: g.grp }); }
      if (g.kind === 'todo') return Object.assign(base, { kind: g.track, due: g.due || '', grp: areaOf(g.grp), steps: (g.steps || []).map((x) => ({ n: x.t, d: !!x.d })) });
      if (g.kind === 'termly') return Object.assign(base, { sittings: g.sittings || 2, due: g.due || '' });
      const two = g.polarity === 'both', pr = String(g.grp || '').split('|'), nm = String(g.name).split(' / ');
      return Object.assign(base, { type: two ? 'both' : g.polarity === 'minus' ? 'curse' : 'bless', anti: g.anti || '', name: two ? nm[0] : g.name, name2: two ? (nm[1] || '') : '', gc: two ? pr[0] || '' : '', gb: two ? pr[1] || '' : '' });
    }
    // a boss opened in its form: stages remember their old place (i) so a stage already hit keeps its tick
    const draftOfBoss = (b) => ({ id: b.id, name: b.name, size: b.size || 5, k: b.creature || SIZE[b.size || 5].k, grp: b.grp || 'teach', steps: b.stages.map((x) => ({ n: x.name, by: x.due || '', i: x.i, d: !!x.done })) });
    // the pay kind: Life when it sits in the Life area, Outside work when switched on, otherwise as it was (old Ahead ones stay)
    const trackOf = (f, d) => ((f === 'ritual' ? areaOf(d.group) : d.grp) === 'life' ? 'life' : d.kind === 'external' ? 'external' : d.kind === 'ahead' ? 'ahead' : 'necessary');
    // what the server is sent for a form (new or edited)
    function goalOf(f, d) {
      const nm = d.name.trim(), o = { id: d.id, name: nm, minutes: d.len, private: d.priv, who: d.who || '' };
      if (f === 'ritual') return Object.assign(o, { track: trackOf(f, d), kind: 'daily', grp: d.group, days: d.rep === 'school' ? '12345' : d.rep === 'days' ? d.days.map((x) => x || 7).sort().join('') : '', everyN: d.rep === 'every' ? d.n * (d.unit === 'weeks' ? 7 : 1) : '' });
      if (f === 'quest') return Object.assign(o, { track: trackOf(f, d), kind: 'todo', grp: d.grp, due: d.due || '', steps: d.steps.filter((x) => x.n.trim()).map((x) => ({ t: x.n.trim(), d: !!x.d })) });
      if (f === 'mark') return Object.assign(o, { track: 'necessary', kind: 'termly', grp: d.grp0 || 'marking', sittings: d.sittings, due: d.due || '' });
      const two = d.type === 'both';
      return Object.assign(o, { kind: 'habit', polarity: two ? 'both' : d.type === 'curse' ? 'minus' : 'plus', track: 'life', grp: two ? (d.gc || '') + '|' + (d.gb || '') : d.grp0 || '', anti: d.type === 'curse' ? d.anti || '' : '',
        name: two && (d.name2 || '').trim() ? nm + ' / ' + d.name2.trim() : nm });
    }
    const dateRow = (label, v) => '<div style="display:flex;flex-direction:column;gap:5px"><span class="uz-lbl">' + label + '</span><div class="uz-date"><input type="date" data-due="1" value="' + esc(v || '') + '">' + (v ? '<button data-a="nodue">No date</button>' : '') + '</div></div>';
    function form() {
      const f = V.form, d = V.draft;
      const chip = (label, sel, a, v, col, img) => '<button data-a="' + a + '" data-v="' + esc(v) + '" style="border-color:' + (sel ? (col || '#5ef2a0') : '#2f443b') + ';background:' + (sel ? '#173a2c' : '#131d19') + ';color:' + (sel ? (col || '#b6ffd6') : '#cfd8d3') + '">' + (img ? '<img src="' + img + '" alt="">' : '') + esc(label) + '</button>';
      const row = (label, chips) => '<div style="display:flex;flex-direction:column;gap:5px"><span class="uz-lbl">' + label + '</span><div class="uz-chips">' + chips.join('') + '</div></div>';
      // every top-level area (Teaching, Life, his own areas): where a quest or boss lives, changeable later (Patryk 2026-10-27)
      const areaRow = (cur) => row('AREA', D.groups.filter((g) => !g.parent && g.type !== 'summon' && g.type !== 'marking').map((g) => chip(g.id === 'teach' ? 'Teaching' : g.id === 'life' ? 'Life' : g.name, cur === g.id, 'd', 'grp:' + g.id)));
      const lenRow = row('SIZE', LENS.map((n) => chip(EFF[n], d.len === n, 'd', 'len:' + n)));
      const outRow = '<div class="uz-chips">' + chip('Outside work', d.kind === 'external', 'd', 'kind:' + (d.kind === 'external' ? 'necessary' : 'external'), '#b07cff') + '</div>';
      let title, ph, col = '#5ef2a0', rows = '', payL = '', payV = '', payC = '#ffd56a', payCoin = true, go = '', goBg = '#5ef2a0', steps = '';
      if (f === 'ritual') { title = d.id ? 'Edit ritual' : 'New ritual'; ph = 'What is the ritual?';
        rows = lenRow + (areaOf(d.group) === 'life' ? '' : outRow) + row('REPEATS', [['school', 'School days'], ['days', 'Chosen days'], ['every', 'Every N']].map(([k, l]) => chip(l, d.rep === k, 'd', 'rep:' + k)));
        if (d.rep === 'days') rows += row('WHICH DAYS', [1, 2, 3, 4, 5, 6, 0].map((i) => chip(DN[i], d.days.indexOf(i) >= 0, 'dday', i)));
        if (d.rep === 'every') rows += row('EVERY', [1, 2, 3, 4, 5].map((n) => chip(String(n), d.n === n, 'd', 'n:' + n)).concat(['days', 'weeks'].map((u) => chip(u, d.unit === u, 'd', 'unit:' + u))));
        rows += row('GROUP', D.groups.filter((g) => g.type === 'list').map((g) => chip(g.name, d.group === g.id, 'd', 'group:' + g.id)));
        payL = 'Pays'; payV = '+' + pay(d.len, trackOf('ritual', d)); go = 'Add the ritual'; }
      if (f === 'quest') { title = d.id ? 'Edit quest' : 'New quest'; ph = 'What needs doing?'; col = '#a48aff';
        rows = lenRow + (d.grp === 'life' ? '' : outRow) + dateRow('DUE DATE', d.due) +
          areaRow(d.grp);
        steps = 'CHECKLIST (OPTIONAL)'; payL = 'Pays'; payV = '+' + pay(d.len, trackOf('quest', d)); go = 'Add the quest'; goBg = '#a48aff'; }
      if (f === 'boss') { title = d.id ? 'Edit boss' : 'Summon a boss'; ph = 'The big job, e.g. Mark the 9AS mocks'; col = '#ff9a85'; const k = d.k || SIZE[d.size].k;
        rows = row('SIZE · TOTAL HOURS (2 H MINIMUM)', [2, 5, 10, 20].map((n) => { const m = P.bossMeta[SIZE[n].k]; return chip(m.size + ' · ' + SIZE[n].gold, d.size === n, 'd', 'size:' + n, '#ff9a85', P.bosses[P.bossBySize[n][0]].src); })) +
          row('CREATURE', P.bossBySize[d.size].map((c) => chip(P.bossMeta[c].name, k === c, 'd', 'k:' + c, '#ff9a85', P.bosses[c].src))) + areaRow(d.grp || 'teach');
        steps = 'STAGES · EACH HAS A "BY" DATE'; payL = P.bossMeta[k].name + ' · paid when beaten, plus a trophy'; payV = String(SIZE[d.size].gold); go = 'Summon it'; goBg = '#ff7a66'; }
      if (f === 'mark') { title = d.id ? 'Edit marking' : 'Books to mark'; ph = 'Mark 9AS books'; col = '#f2a93b';
        rows = lenRow + row('SITTINGS', [1, 2, 3].map((n) => chip(String(n), d.sittings === n, 'd', 'sittings:' + n, '#f2a93b'))) + dateRow('DUE DATE', d.due);
        payL = 'Each sitting pays'; payV = '+' + pay(d.len, 'necessary'); go = 'Add it'; goBg = '#f2a93b'; }
      if (f === 'group') { title = 'New group'; ph = 'Name the group';
        rows = '<span class="uz-lbl">THEMED NAMES</span><div class="uz-chips">' + GROUP_SUGS.map((l) => '<button data-a="d" data-v="name:' + esc(l) + '" style="border-radius:20px;font:500 16px var(--g);color:#cfe8dc">' + esc(l) + '</button>').join('') + '</div>' +
          row('INSIDE', [['teach', 'Teaching'], ['life', 'Life'], ['top', 'Its own area']].map(([k, l]) => chip(l, d.parent === k, 'd', 'parent:' + k)));
        payL = 'Groups fold away and can be renamed with ✎'; payCoin = false; go = 'Make the group'; }
      if (f === 'reward') { title = 'New reward for the Hoard'; ph = 'e.g. Cinema trip'; col = '#ffd56a';
        rows = row('COST', [40, 80, 120, 300, 600, 1000].map((n) => chip(String(n), d.cost === n, 'd', 'cost:' + n, '#ffd56a'))); payL = 'Costs'; payV = String(d.cost); go = 'Add to the Hoard'; goBg = '#ffd56a'; }
      if (f === 'curse') { const cu = d.type === 'curse', two = d.type === 'both';
        title = (d.id ? 'Edit ' : 'New ') + (two ? 'two-sided omen' : cu ? 'curse' : 'blessing'); ph = two ? 'The bad side, e.g. Junk food' : cu ? 'The bad habit' : 'The good habit'; col = two ? '#e0c8ff' : cu ? '#ff7a66' : '#b6ffd6';
        const pics = (side, key, lbl) => { const pk = OMENS.of({ polarity: side === 'c' ? 'minus' : 'plus', name: side === 'c' ? d.name : d.name2 || d.name, grp: key });
          return row(lbl, OMENS.CATS[side].map(([k, l]) => chip(l, pk === k, 'd', (two ? (side === 'c' ? 'gc:' : 'gb:') : 'grp0:') + k, side === 'c' ? '#ff7a66' : '#b6ffd6', OMENS.card(side, k)))); };
        rows = row('TYPE', [chip('Curse', cu, 'd', 'type:curse', '#ff7a66'), chip('Blessing', d.type === 'bless', 'd', 'type:bless'), chip('Both', two, 'd', 'type:both', '#e0c8ff')]) +
          (two ? '<input data-name2="1" value="' + esc(d.name2 || '') + '" placeholder="The good side, e.g. Cooked from scratch">' : '') + lenRow +
          (two ? pics('c', d.gc, 'CURSE PICTURE') + pics('b', d.gb, 'BLESSING PICTURE') : pics(cu ? 'c' : 'b', d.grp0, 'PICTURE'));
        // a curse's antidote: the blessing that wins its health back (Absolution); a two-sided omen is its own antidote
        if (cu) rows += row('ANTIDOTE (WINS THE HEALTH BACK)', [chip('None', !d.anti, 'd', 'anti:', '#ffe2a0')].concat(D.goals.filter((g) => g.kind === 'habit' && g.polarity === 'plus').sort((a, b) => a.name.localeCompare(b.name)).map((g) => chip(g.name, d.anti === g.id, 'd', 'anti:' + g.id, '#ffe2a0', OMENS.card('b', OMENS.of(g))))));
        if (two) { payL = 'Curse side costs, blessing side pays'; payV = '−' + D.table.hpLoss[d.len] + ' HP · +' + Math.max(2, Math.round(D.table.base[d.len] / 2)); payC = '#e0c8ff'; payCoin = false; }
        else if (cu) { payL = 'Costs health, never runes'; payV = '−' + D.table.hpLoss[d.len] + ' HP'; payC = '#ff7a66'; payCoin = false; } else { payL = 'Pays each time you tap it'; payV = '+' + Math.max(2, Math.round(D.table.base[d.len] / 2)); }
        go = 'Add it'; goBg = two ? '#c8a8ff' : cu ? '#ff7a66' : '#5ef2a0'; }
      if ((f === 'ritual' || f === 'quest' || (f === 'curse' && d.type !== 'curse')) && D.whoList) rows += row('WHO YOU ARE BECOMING', [chip('None', !d.who, 'd', 'who:', '#ffe2a0')].concat(D.whoList.map((w) => chip(w, d.who === w, 'd', 'who:' + w, '#ffe2a0'))));
      if (steps) steps = '<span class="uz-lbl">' + steps + '</span>' + d.steps.map((s, i) => '<div class="uz-srow"><input data-step="' + i + '" value="' + esc(s.n) + '" placeholder="' + (f === 'boss' ? 'Stage ' + (i + 1) : 'A small step') + '">' +
        (f === 'boss' ? '<input type="date" data-sby="' + i + '" value="' + esc(s.by || '') + '" style="flex:none;width:150px;height:44px;padding:0 8px;border-radius:5px;border:1.5px solid #4a2a2e;background:#1c1012;color:#ffb3a8;font:700 13px var(--a);color-scheme:dark">' : '') +
        (s.d && f === 'boss' ? '<span style="flex:none;width:40px;text-align:center;color:#ff9a85;font:700 16px var(--a)" title="Already hit">✓</span>' : '<button data-a="sdel" data-v="' + i + '" style="flex:none;width:40px;height:44px;border:none;background:none;color:#7f9389;font:18px var(--a)">×</button>') + '</div>').join('') +
        '<div style="display:flex;gap:6px"><button data-a="sadd" style="flex:1;height:42px;border-radius:5px;border:1.5px dashed #2f443b;background:none;color:#8fa298;font:700 13px var(--a)">+ ' + (f === 'boss' ? 'Stage' : 'Checklist step') + '</button>' +
        (f === 'boss' ? '<button data-a="tmpl" style="flex:1;height:42px;border-radius:5px;border:1.5px solid #5a3a8a;background:#1e1430;color:#d4bfff;font:700 13px var(--a)">Marking template</button>' : '') + '</div>';
      return '<div class="uz-form"><div style="display:flex;align-items:center;justify-content:space-between"><span style="font:500 23px var(--g);color:' + col + '">' + title + '</span><button data-a="close" style="width:44px;height:44px;border:none;background:none;color:#8fa298;font:22px var(--a)">×</button></div>' +
        '<input data-name="1" value="' + esc(d.name) + '" placeholder="' + ph + '">' + rows + steps + '<div style="flex:1"></div>' +
        '<div class="uz-total"><span style="font:13px var(--a);color:#93a69c">' + payL + '</span><span style="display:flex;align-items:center;gap:4px;font:700 22px var(--a);color:' + payC + '">' + payV + (payCoin && payV ? coin(24, String(payV).replace(/[^0-9]/g, ''), f) : '') + '</span></div>' +
        '<button class="uz-go" data-a="submit" style="background:' + goBg + ';opacity:' + (d.name.trim() ? 1 : 0.45) + '">' + (d.id ? 'Save' : go) + '</button>' +
        (d.id && f !== 'boss' ? '<button data-a="farch" style="height:44px;border-radius:5px;border:1.5px solid #4a2a2e;background:none;color:#ff9a85;font:700 14px var(--a)">Archive</button>' : '') + '</div>';
    }
    function submit() {
      const f = V.form, d = V.draft; if (!d || !d.name.trim()) return;
      V.form = null; V.draft = null; const nm = d.name.trim();
      const archOnSave = (r) => { if (r.saved) setRev(['gameArchive', r.saved]); };
      if (d.id && /^(ritual|quest|mark|curse)$/.test(f)) { const o = V.orig; V.orig = null; return act({ verb: 'Edited:', name: nm }, o ? ['gameSaveGoal', goalOf(f, o)] : null, 'gameSaveGoal', [goalOf(f, d)]); }
      if (f === 'ritual') { V.tab = 0; V.open[d.group] = 1; return act({ verb: 'New ritual:', name: nm }, null, 'gameSaveGoal', [goalOf(f, d)], null, archOnSave); }
      if (f === 'boss' && d.id) V.open[d.grp] = 1;
      if (f === 'boss' && d.id) return act({ verb: 'Edited:', name: nm }, null, 'gameBossSave', [{ id: d.id, name: nm, size: d.size, k: d.k, grp: d.grp, stages: d.steps.filter((x) => x.n.trim()).map((x) => ({ name: x.n.trim(), due: x.by, i: x.i })) }]);
      if (f === 'quest') V.open[d.grp] = 1;
      if (f === 'quest') return act({ verb: 'New quest:', name: nm }, null, 'gameSaveGoal', [goalOf(f, d)], null, archOnSave);
      if (f === 'mark') { V.open.marking = 1; return act({ verb: 'New marking:', name: nm }, null, 'gameSaveGoal', [goalOf(f, d)], null, archOnSave); }
      if (f === 'boss') { const stages = d.steps.filter((s) => s.n.trim()).map((s) => ({ name: s.n.trim(), due: s.by })); if (!stages.length) stages.push({ name: 'Do it', due: addD(D.today, 7) });
        return act({ verb: 'Boss summoned:', name: nm }, null, 'gameBossStart', [{ name: nm, size: d.size, k: d.k || SIZE[d.size].k, grp: d.grp || 'teach', stages }], null, (r) => { if (r.newBoss) { V.open[r.newBoss] = 1; setRev(['gameBossRemove', r.newBoss]); } }); }
      if (f === 'group') return act({ verb: 'New group:', name: nm }, null, 'gameGroupSave', [{ name: nm, parent: d.parent === 'top' ? '' : d.parent }], null, (r) => { V.open[r.saved] = 1; paint(); });
      if (f === 'reward') return act({ verb: 'New reward:', name: nm }, null, 'gameHoardSave', [{ name: nm, cost: d.cost }], null, (r) => { if (r.saved) setRev(['gameHoardSave', { id: r.saved, name: nm, cost: d.cost, archived: true }]); });
      if (f === 'curse') { const cu = d.type === 'curse';
        return act({ verb: d.type === 'both' ? 'New omen:' : cu ? 'New curse:' : 'New blessing:', name: nm }, null, 'gameSaveGoal', [goalOf(f, d)], null, archOnSave); }
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
        '<div class="uz-pane">' + today() + '</div><div class="uz-pane">' + grimoire() + '</div><div class="uz-pane">' + curses() + '</div><div class="uz-pane">' + den() + '</div></div></div>' +
        '';
      if (V.form && oldForm) body.querySelector('.uz-form').scrollTop = fs;
      body.querySelectorAll('.uz-pane').forEach((p, i) => { if (keep[i]) p.scrollTop = keep[i]; });
      if (focus) { const n = body.querySelector(focus); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) { /* not a text box */ } } }
      drawSky();
      const sb = body.querySelector('.uz-stampbox'); if (sb && V.stampNew) { V.stampNew = false; anim(sb, [{ transform: 'scale(2.4) rotate(-28deg)', opacity: 0 }, { transform: 'scale(.92) rotate(-10deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(1) rotate(-10deg)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1.2)' }); }
      if (window.TEMPLE) TEMPLE.paint(body);
      if (window.STONE) STONE.paint(body);
      if (V.waxNew) { const n = body.querySelector('.uz-stamp[data-q="' + V.waxNew + '"]'); if (n) { V.waxNew = null; anim(n, [{ transform: 'scale(2.4) rotate(-28deg)', opacity: 0 }, { transform: 'scale(1) rotate(-10deg)', opacity: 1 }], { duration: 420 }); } }
    }

    /* ---------- typing (no repaint while typing) ---------- */
    box.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.name2 && V.draft) V.draft.name2 = t.value;
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
      if (!CHRON) call('gameChronicle').then((c) => { CHRON = c; const k = c.days.filter((d) => !d.future).slice(-7).filter((d) => d.level === 'all' || d.level === 'most').length; if (k >= 5) setMood('proud', pickSay('stars')); paint(); }).catch(() => {});
      if (!ROOM) call('gameArt').then((a) => { ROOM = a; paint(); }).catch(() => {});
      if (!SHOP) call('gameShop').then((s) => { SHOP = s; paint(); }).catch(() => {});
    }
    const shopRefresh = () => call('gameShop').then((s) => { SHOP = s; paint(); }).catch(() => {});

    /* ---------- taps ---------- */
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b || !box.contains(b)) return;
      const a = b.dataset.a, id = b.dataset.id, v = b.dataset.v, r = b.getBoundingClientRect(), k = b.dataset.fx;
      if (a === 'undo') return undo();
      if (a === 'next') { V.sayIx++; V.say = null; return paintBanner(); }
      if (a === 'nextOld') { const nj = nextJob(); V.tab = 0; V.form = null; paint(); if (nj) { const n = body.querySelector('[data-fx="' + nj.id + '"],[data-fx="' + nj.id + 't"]'); if (n) { n.scrollIntoView({ block: 'center', behavior: 'smooth' }); glow(n.dataset.fx, 'rgba(94,242,160,.85)'); } } return; }
      if (a === 'tab') { V.tab = Number(v); V.form = null; V.banishArm = null; tabOpened(); return paint(); }
      if (a === 'fold') { V.hand[v] = 1; V.open[v] = V.open[v] === undefined && b.dataset.def ? 0 : (V.open[v] ? 0 : 1); return paint(); }
      if (a === 'rename') { V.renaming = v; paint(); const n = body.querySelector('[data-ren]'); if (n) { n.focus(); n.select(); } return; }
      if (a === 'edit') { V.edit = !V.edit; return paint(); }
      if (a === 'vanq') { V.vanq = !V.vanq; return paint(); }
      if (a === 'rvopen') { V.rvOpen = !V.rvOpen; return paint(); }
      if (a === 'den') { V.den = v; V.form = null; denOpened(); return paint(); }
      if (a === 'cat') { V.shopCat = v; return paint(); }
      if (a === 'tier') { V.tier = v; return paint(); }
      if (a === 'wcat') { V.wCat = v; return paint(); }
      if (a === 'style') { style = v; try { localStorage.setItem('ulhuStyle', v); } catch (x) { /* private window */ } return paint(); }
      if (a === 'form') { V.form = v; V.draft = FORMS[v](); return paint(); }
      if (a === 'close') { V.form = null; V.draft = null; V.orig = null; return paint(); }
      if (a === 'editb') { const bo = D.bosses.find((x) => x.id === id); if (!bo) return; V.form = 'boss'; V.draft = draftOfBoss(bo); return paint(); }
      if (a === 'editg') { const g = goal(id); if (!g) return; V.form = formKind(g); V.draft = draftOf(g); V.orig = clone(V.draft); return paint(); }
      if (a === 'nodue') { V.draft.due = ''; return paint(); }
      if (a === 'farch') { const i2 = V.draft.id; V.form = null; V.draft = null; V.orig = null; return archive(i2); }
      if (a === 'd') { const i = v.indexOf(':'), f = v.slice(0, i), x = v.slice(i + 1); V.draft[f] = /^(len|n|size|cost|sittings)$/.test(f) ? Number(x) : x; if (f === 'size') V.draft.k = P.bossBySize[Number(x)][0]; return paint(); }
      if (a === 'dday') { const n = Number(v), ds = V.draft.days; V.draft.days = ds.indexOf(n) >= 0 ? ds.filter((x) => x !== n) : ds.concat([n]); return paint(); }
      if (a === 'sadd') { V.draft.steps.push({ n: '', by: addD(D.today, 7) }); return paint(); }
      if (a === 'sdel') { V.draft.steps.splice(Number(v), 1); return paint(); }
      if (a === 'tmpl') { V.draft.name = V.draft.name || 'Mark the 9AS test'; V.draft.size = 5; V.draft.k = 'shog'; V.draft.steps = [['Half marked', 2], ['The rest', 5], ['Scores summed', 6], ['Entered', 7]].map(([n, dd]) => ({ n, by: addD(D.today, dd) })); return paint(); }
      if (a === 'submit') return submit();
      if (a === 'aimmin' || a === 'aimfull') { const g = goal(id); if (!g) return; const t0 = Object.assign({ minutes: null, full: false }, g.aimToday), m = a === 'aimmin' ? Number(v) : null, f = a === 'aimfull' ? v === '1' : null;
        if (m !== null) USUAL(id, m); buzz(8);
        return act({ verb: a === 'aimmin' ? 'Logged:' : 'Marked:', name: g.name + (m !== null ? ' · ' + m + ' min' : f ? ' · full session' : ' · bottom line') }, ['gameAim', id, t0.minutes, t0.full], 'gameAim', [id, m, f], (d) => { const x = d.goals.find((y) => y.id === id); x.aimToday = Object.assign({}, x.aimToday, m !== null ? { minutes: m } : { full: f }); }); }
      if (a === 'dayoff') { const was = D.moon || (D.frozen ? 'dark' : 'full'), nx = PHASE[was][1]; return act({ verb: 'Moon:', name: PHASE[nx][0] }, ['gameMoon', D.today, was], 'gameMoon', [D.today, nx], (d) => { d.moon = nx; d.frozen = nx !== 'full'; }); }
      if (a === 'tick' || a === 'untick') {
        const g = goal(id); if (!g) return;
        if (g.kind === 'termly') {
          const on = a === 'tick', cls = g.name.replace(/^Mark\s+/i, '').replace(/\s+books\b.*$/i, ''), half = g.sittings === 2 ? ((on ? g.sitDone : g.sitDone - 1) ? ' 2nd half' : ' 1st half') : '';
          let upL = false;
          V.sayKind = 'mark'; act({ verb: on ? 'Marked:' : 'Unmarked:', name: cls + ' ' + (on ? g.sitDone + 1 : g.sitDone - 1) + '/' + g.sittings, delta: (on ? '+' : '−') + g.pay, unit: 'coin' }, on ? ['gameUntick', id] : ['gameTick', id, 1], on ? 'gameTick' : 'gameUntick', on ? [id, 1] : [id],
            (d) => { const x = d.goals.find((y) => y.id === id); x.sitDone += on ? 1 : -1; if (on) upL = earnLocal(d, g.pay, g.pay); else d.player.coins -= g.pay; });
          if (on) { earnFx(r, k, g.pay, upL); if (window.STONE) STONE.flare(k); } else buzz(6); return;
        }
        if (g.kind === 'todo') {
          const on = !g.doneOn; let upL = false;
          act({ verb: on ? 'Fulfilled:' : 'Reopened:', name: g.name, delta: (on ? '+' : '−') + g.pay, unit: 'coin' }, on ? ['gameUntick', id] : null, on ? 'gameTick' : 'gameUntick', on ? [id, 1] : [id],
            (d) => { const x = d.goals.find((y) => y.id === id); x.doneOn = on ? d.today : ''; if (on) upL = earnLocal(d, g.pay, g.pay); else d.player.coins -= g.pay; });
          if (on) { V.sayKind = 'quest'; V.waxNew = id; V.settling[id] = 1; paint(); setTimeout(() => { delete V.settling[id]; paint(); }, 1100); earnFx(r, k, g.pay, upL); } else buzz(6); return;
        }
        const on = !g.doneToday; let upL = false;
        if (on) { V.settling[id] = 1; setTimeout(() => { delete V.settling[id]; paint(); }, 1100); if ([7, 21, 66].indexOf(g.streak + 1) >= 0) V.sayKind = 'streak'; }
        act({ verb: on ? 'Ticked:' : 'Unticked:', name: g.name, delta: (on ? '+' : '−') + g.pay, unit: 'coin' }, on ? ['gameUntick', id] : ['gameTick', id, 1], on ? 'gameTick' : 'gameUntick', on ? [id, 1] : [id],
          (d) => { const x = d.goals.find((y) => y.id === id); x.doneToday = on; x.streak = Math.max(0, x.streak + (on ? 1 : -1)); if (on) upL = earnLocal(d, g.pay, g.pay); else { d.player.coins -= g.pay; d.weekCoins -= g.pay; } });
        if (on) { earnFx(r, k, g.pay, upL); if (window.STONE) STONE.flare(k); if (g.aim && g.aim.type === 'avg' && USUAL(id)) { const u = USUAL(id); send('gameAim', [id, u, null]); g.aimToday = Object.assign({}, g.aimToday, { minutes: u }); } } else buzz(6); return;
      }
      if (a === 'curse') {
        if (V.edit) { const g0 = goal(id); V.form = 'curse'; V.draft = draftOf(g0); V.orig = clone(V.draft); return paint(); }
        if (V.curseT && V.curseT.id === id) { clearTimeout(V.curseT.t); V.curseT = null; return logCurse(id, r, k, ''); }
        if (V.curseT) clearTimeout(V.curseT.t);
        V.curseT = { id, t: setTimeout(() => { V.curseT = null; const host = b.closest('.uz-pane');
          if (window.BLOOD && host && !matchMedia('(prefers-reduced-motion: reduce)').matches) BLOOD.open(host, b, (sig) => logCurse(id, b.getBoundingClientRect(), k, sig || '')); else logCurse(id, r, k, ''); }, 260) };
        return;
      }
      if (a === 'bless') {
        if (V.edit) { const g0 = goal(id); V.form = 'curse'; V.draft = draftOf(g0); V.orig = clone(V.draft); return paint(); }
        const g = goal(id), chain = false, n = g.pay; let upL = false;
        const ab = g.absolve, back = ab ? (ab.stage ? ab.lost - Math.floor(ab.lost / 2) : Math.floor(ab.lost / 2)) : 0;
        act(ab ? { verb: 'Absolution ' + ROMAN[ab.stage + 1] + ':', name: ab.name + ' · +' + back + ' HP' } : { verb: chain ? 'Blessing chain!' : 'Blessing:', name: g.polarity === 'both' ? sides(g.name)[1] : g.name, delta: '+' + n, unit: 'coin' }, ['gameUntick', id], 'gameTick', [id, 1],
          (d) => { const x = d.goals.find((y) => y.id === id); x.count = (x.count || 0) + 1; if (x.polarity === 'both') x.bCount = (x.bCount || 0) + 1; d.blessCount = (d.blessCount || 0) + 1; upL = earnLocal(d, n, g.pay);
            if (ab) { d.player.hp = Math.min(d.player.maxHp, d.player.hp + back); if (ab.stage) delete x.absolve; else x.absolve = Object.assign({}, ab, { stage: 1 }); } },
          (d2) => { if (d2.last && d2.last.abs && d2.last.abs.stage === 2) { V.last = { verb: 'Absolved:', name: d2.last.abs.curse }; paintTop(); } });
        if (ab) floatText(r, '+' + back + ' HP', '#ffe2a0');
        V.sayKind = 'bless'; ripple(r, '#bfe2ff'); earnFx(r, k, n, upL); return;
      }
      if (a === 'step') { const q = goal(id), i = Number(v), on = !q.steps[i].d; buzz(6);
        return act({ verb: on ? 'Step:' : 'Step reopened:', name: q.steps[i].t }, ['gameQuestStep', id, i, !on], 'gameQuestStep', [id, i, on], (d) => { d.goals.find((y) => y.id === id).steps[i].d = on; }); }
      if (a === 'stage') {
        const bo = D.bosses.find((x) => x.id === id), i = Number(v), st = bo.stages[i], on = !st.done, cr = box.querySelector('[data-creature="' + id + '"]');
        const late = on && !!st.due && D.today > st.due, n = bo.stages.length, dead = on && bo.stages.every((x, j) => j === i || x.done);
        if (!on) return act({ verb: 'Stage reopened:', name: st.name }, ['gameBossStage', id, i, true], 'gameBossStage', [id, i, false], (d) => { const x = d.bosses.find((y) => y.id === id); x.stages[i].done = ''; x.stages[i].late = false; x.hp = Math.min(100, x.hp + Math.round((st.late ? 50 : 100) / n)); });
        if (window.TEMPLE && !V.striking) { V.striking = true; buzz(15); setMood('happy', pickSay('boss'));
          const save = () => { V.striking = false;
            if (!dead) return act({ verb: late ? 'Late hit:' : 'Hit:', name: st.name + ' · ' + bo.name }, ['gameBossStage', id, i, false], 'gameBossStage', [id, i, true], (d) => { const x = d.bosses.find((y) => y.id === id); x.stages[i].done = d.today; x.stages[i].late = late; x.hp = Math.max(0, x.hp - Math.round((late ? 50 : 100) / n)); });
            TEMPLE.beaten(id, () => { let up2 = false;
              act({ verb: 'Vanquished:', name: bo.name, delta: '+' + bo.reward, unit: 'coin' }, null, 'gameBossStage', [id, i, true], (d) => { d.bosses = d.bosses.filter((y) => y.id !== id); d.beaten = [{ id, name: bo.name, k: creature(bo), size: bo.size, reward: bo.reward, on: d.today }].concat(d.beaten || []); up2 = earnLocal(d, bo.reward, bo.reward); });
              stack.pop(); V.freshTrophy = id; CHRON = null; earnFx(r, k, bo.reward, up2); celebrate(true); setMood('proud', pickSay('vanq')); }); };
          return Promise.resolve(TEMPLE.strike(id, i)).then(save, save); }
        if (V.striking) return;
        anim(cr, [{ transform: 'none', filter: 'none' }, { transform: 'translateX(5px)', filter: 'brightness(3) saturate(0)' }, { transform: 'translateX(-4px)' }, { transform: 'none', filter: 'none' }], { duration: 320 });
        glow(k, 'rgba(255,122,102,.9)'); floatText(r, late ? 'half hit' : 'hit!', '#ff9a85'); buzz(15); setMood('happy', pickSay('boss'));
        if (!dead) return act({ verb: late ? 'Late hit:' : 'Hit:', name: st.name + ' · ' + bo.name }, ['gameBossStage', id, i, false], 'gameBossStage', [id, i, true], (d) => { const x = d.bosses.find((y) => y.id === id); x.stages[i].done = d.today; x.stages[i].late = late; x.hp = Math.max(0, x.hp - Math.round((late ? 50 : 100) / n)); });
        let upL = false;
        act({ verb: 'Boss beaten:', name: bo.name, delta: '+' + bo.reward, unit: 'coin' }, null, 'gameBossStage', [id, i, true], (d) => { const x = d.bosses.find((y) => y.id === id); x.stages[i].done = d.today; x.hp = 0; upL = earnLocal(d, bo.reward, bo.reward); });
        stack.pop();   // a beaten boss has paid out and gone to the trophy shelf: not undoable
        const cr2 = box.querySelector('[data-creature="' + id + '"]');
        anim(cr2, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(6px) scale(1.1,.6)', opacity: 0.6 }, { transform: 'translateY(12px) scale(1.4,.1)', opacity: 0 }], { duration: 500, fill: 'forwards' });
        setTimeout(() => { earnFx(r, k, bo.reward, upL); celebrate(true); setMood('proud', pickSay('vanq')); }, 450);
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
