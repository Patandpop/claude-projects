/* Ulhu tab bar (Patryk's pick 28 Oct 2026, "Tabs Round Six" TB5b1-A Fine textures): four lit arched niches, each filled with
   its own material drawn on a canvas: The Call = aged parchment with an inked sigil and a small wax seal; Grimoire = a close-up
   of an old dark leather cover (grain, blind tooling, worn gilt, brass corners with verdigris); Omens = the real stained glass
   (GLASS.tile from game-glass.js); Den = the lair ruins in the Jade deep palette. Resting niches are dimmed; the chosen one
   lifts with a glowing outline. Textures are painted once per size (not on every repaint).
   UZTABS.render(el, tab, badges) builds the bar inside el (buttons keep data-a="tab" data-v="i") and then only toggles state.
   Mock-up: replica/design/mockups/tabs/. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.UZTABS) return;
const NAMES = ['The Call', 'Grimoire', 'Omens', 'Den'];
function rnd(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function grain(ctx,w,h,R,amt){const d=ctx.getImageData(0,0,w,h),a=d.data;for(let i=0;i<a.length;i+=4){const n=(R()-.5)*amt;a[i]+=n;a[i+1]+=n;a[i+2]+=n;}ctx.putImageData(d,0,0);}
function blot(ctx,x,y,r,c0,c1){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c0);g.addColorStop(1,c1);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}
function vignette(ctx,w,h,c,inner){const g=ctx.createRadialGradient(w/2,h*.55,Math.min(w,h)*inner,w/2,h*.55,Math.max(w,h)*.72);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,c);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}

/* ---------- The Call: aged parchment ---------- */
function parchment(ctx,w,h,u,R){
  let g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#e6d3a4');g.addColorStop(.5,'#dcc590');g.addColorStop(1,'#cdb178');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  for(let i=0;i<26;i++)blot(ctx,R()*w,R()*h,(8+R()*26)*u,R()<.6?'rgba(150,108,48,.10)':'rgba(255,246,220,.12)','rgba(0,0,0,0)');
  ctx.lineCap='round';
  for(let i=0;i<w*h/(14*u*u);i++){const x=R()*w,y=R()*h,L=(2+R()*7)*u,a=(R()-.5)*.6;ctx.strokeStyle=R()<.7?'rgba(110,80,36,.16)':'rgba(255,248,226,.22)';ctx.lineWidth=(.25+R()*.35)*u;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.cos(a)*L/2,y+Math.sin(a)*L/2+(R()-.5)*u,x+Math.cos(a)*L,y+Math.sin(a)*L);ctx.stroke();}
  for(let i=0;i<9;i++){const x=R()*w,y=R()*h,r=(.8+R()*3.2)*u;blot(ctx,x,y,r*1.8,'rgba(150,84,30,.30)','rgba(150,84,30,0)');blot(ctx,x+(R()-.5)*r*.5,y,r*.45,'rgba(110,56,18,.35)','rgba(110,56,18,0)');}
  grain(ctx,w,h,R,14);
  vignette(ctx,w,h,'rgba(92,52,16,.62)',.22);
  ctx.strokeStyle='rgba(60,30,10,.35)';ctx.lineWidth=1.2*u;ctx.strokeRect(0,0,w,h);
  /* inked sigil, crisp and thin */
  const cx=w/2,cy=h*.34,r=Math.min(w*.2,h*.22);ctx.strokeStyle='rgba(38,18,8,.86)';ctx.fillStyle='rgba(38,18,8,.86)';ctx.lineWidth=Math.max(.6,.55*u);
  ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,r*.78,0,7);ctx.stroke();
  for(let k=0;k<12;k++){const a=k/12*Math.PI*2;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r*.8,cy+Math.sin(a)*r*.8);ctx.lineTo(cx+Math.cos(a)*r*(k%3?0.9:.98),cy+Math.sin(a)*r*(k%3?0.9:.98));ctx.stroke();}
  ctx.beginPath();for(let k=0;k<4;k++){const a=-Math.PI/2+k*Math.PI*2/3;ctx[k?'lineTo':'moveTo'](cx+Math.cos(a)*r*.74,cy+Math.sin(a)*r*.74);}ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx,cy-r*.74);ctx.lineTo(cx,cy+r*.5);ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy+r*.06,r*.17,0,7);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-r*.3,cy+r*.38);ctx.quadraticCurveTo(cx,cy+r*.18,cx+r*.3,cy+r*.38);ctx.stroke();
  /* a small wax seal low on the right */
  const sx=w-8.5*u,sy=h-10*u,sr=4.6*u;ctx.beginPath();for(let k=0;k<=22;k++){const a=k/22*Math.PI*2,rr=sr*(1+(R()-.5)*.16);ctx[k?'lineTo':'moveTo'](sx+Math.cos(a)*rr,sy+Math.sin(a)*rr);}
  g=ctx.createRadialGradient(sx-sr*.35,sy-sr*.4,sr*.1,sx,sy,sr*1.1);g.addColorStop(0,'#c8322c');g.addColorStop(.6,'#8a1616');g.addColorStop(1,'#4a0808');ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle='rgba(40,4,4,.7)';ctx.lineWidth=.5*u;ctx.beginPath();ctx.arc(sx,sy,sr*.62,0,7);ctx.stroke();
  ctx.strokeStyle='rgba(255,150,130,.45)';ctx.beginPath();ctx.arc(sx,sy,sr*.62,3.6,4.9);ctx.stroke();
}
/* ---------- Grimoire: close-up of an old leather cover ---------- */
function leather(ctx,w,h,u,R){
  let g=ctx.createRadialGradient(w*.45,h*.35,0,w*.5,h*.5,Math.max(w,h)*.8);g.addColorStop(0,'#52281a');g.addColorStop(.55,'#2e160c');g.addColorStop(1,'#120705');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  const n=w*h/(7*u*u);for(let i=0;i<n;i++){const x=R()*w,y=R()*h,r=(.6+R()*1.1)*u;ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y,r,r*.8,R()*3,0,7);ctx.fill();ctx.fillStyle='rgba(220,150,110,.05)';ctx.beginPath();ctx.ellipse(x-.35*u,y-.35*u,r*.55,r*.4,0,0,7);ctx.fill();}
  ctx.lineCap='round';for(let i=0;i<14;i++){let x=R()*w,y=R()*h;ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=(.3+R()*.4)*u;ctx.beginPath();ctx.moveTo(x,y);for(let k=0;k<4;k++){x+=(R()-.3)*7*u;y+=(R()-.5)*4*u;ctx.lineTo(x,y);}ctx.stroke();}
  for(let i=0;i<5;i++){ctx.save();ctx.translate(R()*w,R()*h);ctx.rotate((R()-.5)*1.2);ctx.scale(1,.28);blot(ctx,0,0,(6+R()*10)*u,'rgba(150,96,64,.22)','rgba(150,96,64,0)');ctx.restore();}
  for(let i=0;i<7;i++){const x=R()*w,y=R()*h,L=(4+R()*10)*u,a=(R()-.5)*1.4;ctx.strokeStyle='rgba(210,160,120,.16)';ctx.lineWidth=.35*u;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*L,y+Math.sin(a)*L);ctx.stroke();}
  grain(ctx,w,h,R,9);
  /* blind tooling: debossed double rule, corner fillets, stamped dots */
  const deb=(fn)=>{ctx.strokeStyle='rgba(0,0,0,.7)';ctx.lineWidth=.9*u;fn(0);ctx.strokeStyle='rgba(235,180,130,.22)';ctx.lineWidth=.6*u;fn(.8*u);};
  const i1=5*u,i2=8.5*u;
  deb(o=>{ctx.strokeRect(i1+o,i1+o,w-2*i1,h-2*i1);ctx.strokeRect(i2+o,i2+o,w-2*i2,h-2*i2);ctx.beginPath();ctx.moveTo(i1+o,h-i1+o);ctx.lineTo(i2+o,h-i2+o);ctx.moveTo(w-i1+o,h-i1+o);ctx.lineTo(w-i2+o,h-i2+o);ctx.stroke();});
  for(let x=i2+3*u;x<w-i2-2*u;x+=4.2*u){ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.arc(x,(i1+i2)/2,.55*u,0,7);ctx.fill();ctx.beginPath();ctx.arc(x,h-(i1+i2)/2,.55*u,0,7);ctx.fill();}
  /* worn gilt on the outer rule */
  ctx.strokeStyle='rgba(206,160,76,.75)';ctx.lineWidth=.7*u;let x=i1;while(x<w-i1){const L=(2+R()*9)*u;if(R()<.45){ctx.beginPath();ctx.moveTo(x,h-i1);ctx.lineTo(Math.min(x+L,w-i1),h-i1);ctx.stroke();}x+=L;}
  let y=i1+12*u;while(y<h-i1){const L=(2+R()*7)*u;if(R()<.4){ctx.beginPath();ctx.moveTo(i1,y);ctx.lineTo(i1,Math.min(y+L,h-i1));ctx.stroke();ctx.beginPath();ctx.moveTo(w-i1,y);ctx.lineTo(w-i1,Math.min(y+L,h-i1));ctx.stroke();}y+=L;}
  vignette(ctx,w,h,'rgba(0,0,0,.6)',.3);
  /* tarnished brass corners, low left and low right */
  [[0,1],[w,-1]].forEach(([ox,dx])=>{const s=13*u;ctx.beginPath();ctx.moveTo(ox,h);ctx.lineTo(ox+dx*s,h);ctx.quadraticCurveTo(ox+dx*s*.42,h-s*.42,ox,h-s);ctx.closePath();
    g=ctx.createLinearGradient(ox,h-s,ox+dx*s,h);g.addColorStop(0,'#3a2c14');g.addColorStop(.45,'#7e6632');g.addColorStop(.6,'#a08848');g.addColorStop(1,'#2e2210');ctx.fillStyle=g;ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=.6*u;ctx.stroke();
    for(let k=0;k<5;k++)blot(ctx,ox+dx*(1+R()*s*.5),h-(1+R()*s*.5),(.6+R()*1.4)*u,'rgba(90,150,120,.45)','rgba(90,150,120,0)');
    [[3.2,3.2],[7.5,2.3],[2.3,7.5]].forEach(([a,b])=>{const rx=ox+dx*a*u,ry=h-b*u;blot(ctx,rx,ry,1.1*u,'#c8b070','#3a2c14');});});
}
/* ---------- Omens: the Oracle's glass ---------- */
/* ---------- Den: the lair ruins (lair3.html RUINS[2], Jade deep palette) ---------- */
const hx=(h)=>[1,3,5].map((i)=>parseInt(h.slice(i,i+2),16)),toHex=(c)=>'#'+c.map((v)=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const mixC=(a,b,t)=>{const A=hx(a),B=hx(b);return toHex(A.map((v,i)=>v+(B[i]-v)*t));},lift=(a,t)=>mixC(a,'#ffffff',t),sink=(a,t)=>mixC(a,'#000000',t);
function mkPal(name,top,bot,stone,glow,moss){const far=sink(mixC(top,bot,.5),.15),ledge=mixC(stone,bot,.15);return{name,top,bot,far,farHi:lift(far,.15),mid:stone,midHi:lift(stone,.22),midLo:sink(stone,.45),ledge,ledgeHi:lift(ledge,.25),ledgeLo:sink(ledge,.5),moss,glow};}
const JADE=mkPal('Jade deep','#17684c','#020e0a','#173229','#c8f060','#5aa040');
function lrng(seed){return function(){seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function pen(ctx){return(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};}
function ledge(R,r,p,W,top,from,to){R(from,top,to-from,57-top,p.ledge);R(from,top,to-from,1,p.ledgeHi);let x=from+Math.floor(r()*6);while(x<to){R(x,top+1,1,57-top-2,p.ledgeLo);x+=8+Math.floor(r()*11);}R(from,56,to-from,1,p.ledgeLo);for(let i=0;i<(to-from)/7;i++)R(from+r()*(to-from),top+2+r()*4,1,1,p.ledgeHi);for(let i=0;i<(to-from)/11;i++){const mx=from+r()*(to-from);R(mx,top-1,2+Math.floor(r()*3),1,p.moss);}}
function kelp(R,x,base,h,p,ph){for(let j=0;j<h;j++){const xx=x+Math.round(Math.sin(j/3.2+ph)*1.4);R(xx,base-j,1,1,p.moss);if(j%4===2)R(xx+(j%8===2?1:-1),base-j,1,1,p.moss);}}
function towers(R,r,p,W,n,base){for(let i=0;i<n;i++){const x=r()*W,w=5+Math.floor(r()*8),h=16+Math.floor(r()*26),s=(r()-.5)*.5;for(let j=0;j<h;j++){R(x+s*j,base-j,w,1,p.far);R(x+s*j,base-j,1,1,p.farHi);}for(let k=0;k<3;k++)if(r()<.5)R(x+s*(h*.6)+2+k*2,base-h*.6-k*3,1,1,p.glow);}}
function blocksWall(R,r,p,x0,x1,top,base){R(x0,top,x1-x0,base-top,p.mid);let y=top;while(y<base){const bh=4+Math.floor(r()*3);let x=x0-Math.floor(r()*6);while(x<x1){const bw=6+Math.floor(r()*9);R(Math.max(x0,x),y,Math.min(bw,x1-Math.max(x0,x)),1,p.midHi);R(x+bw-1,y,1,bh,p.midLo);if(r()<.12)R(x+2+r()*(bw-4),y+2,1,1,p.glow);x+=bw;}R(x0,y+bh-1,x1-x0,1,p.midLo);y+=bh;}for(let i=x0;i<x1;i++)if(r()<.5)R(i,top-1,1,1,p.mid);}
function ruins2(ctx,W,p){const R=pen(ctx),r=lrng(23);
  const zig=(cx,base,n,w0)=>{for(let s=0;s<n;s++){const w=w0-s*7;R(cx-w/2,base-(s+1)*5,w,5,p.far);R(cx-w/2,base-(s+1)*5,w,1,p.farHi);}R(cx-1,base-n*5-3,3,3,p.far);R(cx,base-n*5-2,1,1,p.glow);};
  zig(Math.round(W*.14),50,5,40);zig(Math.round(W*.86),50,4,34);towers(R,r,p,W,3,48);
  const mono=(x,h,w,lean)=>{for(let j=0;j<h;j++){const xx=x+lean*j;R(xx,50-j,w,1,p.mid);R(xx,50-j,1,1,p.midHi);R(xx+w-1,50-j,1,1,p.midLo);if(j%6===3&&j>4&&j<h-3){R(xx+w/2-1,50-j,3,1,p.glow);R(xx+w/2,50-j-1,1,3,p.glow);}}for(let i=0;i<w;i++)R(x+lean*h+i,50-h-Math.floor(r()*2),1,1,p.mid);};
  mono(Math.round(W*.02),44,9,.22);mono(Math.round(W*.2),30,7,-.1);mono(Math.round(W*.74),34,7,.12);mono(Math.round(W*.9),46,9,-.2);
  blocksWall(R,r,p,Math.round(W*.3),Math.round(W*.7),40,50);
  kelp(R,Math.round(W*.33),49,14,p,0);kelp(R,Math.round(W*.7),49,18,p,2);
  ledge(R,r,p,W,50,0,W);
  for(let i=0;i<3;i++){const x=W*(.2+i*.3);for(let k=0;k<4;k++)R(x+k,51+k,1,1,p.ledgeLo);}}
function den(cv,w,h,pixel){const W=Math.max(40,Math.round(pixel?w/1.5:w)),H=57;cv.width=W;cv.height=H;cv.style.imageRendering='pixelated';const ctx=cv.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,JADE.top);g.addColorStop(1,JADE.bot);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const s=ctx.createLinearGradient(W*.3,0,W*.55,H);s.addColorStop(0,'rgba(150,255,205,.14)');s.addColorStop(1,'rgba(150,255,205,0)');ctx.fillStyle=s;ctx.beginPath();ctx.moveTo(W*.35,0);ctx.lineTo(W*.55,0);ctx.lineTo(W*.75,H);ctx.lineTo(W*.45,H);ctx.fill();
  const r=lrng(5);for(let i=0;i<10;i++){ctx.fillStyle='rgba(200,240,96,'+(.3+r()*.5)+')';ctx.fillRect(Math.round(r()*W),Math.round(r()*36),1,1);}
  ruins2(ctx,W,JADE);}

function paintTex(cv, i) {
  const box = cv.parentElement, w = box.clientWidth, h = box.clientHeight; if (!w || !h) return false;
  if (i === 3) { den(cv, w, h, false); return true; }
  const k = Math.min(3, window.devicePixelRatio || 1), W = Math.round(w * k), H = Math.round(h * k); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'), u = W / 80, R = rnd(31 + i * 101 + 65 * 7); (i === 0 ? parchment : leather)(ctx, W, H, u, R); return true;
}
const CSS = '.uz-tabs.uzt{height:auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:7px 6px 8px;background:linear-gradient(180deg,#0a0e10 0 87%,#1a1f1c 87% 89%,#050708 89%);border-bottom:1px solid #1c2924}' +
  '.uzt button{position:relative;min-width:0;min-height:58px;border:0;background:none;cursor:pointer;white-space:nowrap;padding:0 0 6px;font:500 17px/1 "Grenze Gotisch",Georgia,serif;border-radius:44px 44px 3px 3px/22px 22px 3px 3px;overflow:hidden;isolation:isolate;display:flex;align-items:flex-end;justify-content:center;' +
  'box-shadow:inset 0 0 0 1px #000,inset 0 8px 12px -6px #000;filter:brightness(.55) saturate(.6);transition:transform .3s cubic-bezier(.3,1.3,.5,1),box-shadow .3s,filter .35s}' +
  '.uzt button.on{filter:none;transform:translateY(-3px);box-shadow:inset 0 0 0 1.5px var(--glow),inset 0 8px 12px -8px rgba(0,0,0,.6),0 0 16px -2px var(--glow)}' +
  '.uzt button:focus-visible{outline:2px solid #ffd56a;outline-offset:-3px;z-index:3}' +
  '.uzt .u0{--glow:#f0d9a0;--ftc:#22120a}.uzt .u1{--glow:#c89a48;--ftc:#f6e8c4}.uzt .u2{--glow:#ffd56a;--ftc:#fff}.uzt .u3{--glow:#c8f060;--ftc:#e8f6d8}' +
  '.uzt .tex,.uzt .gl-tile,.uzt .om{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0}' +
  '.uzt .lb{position:relative;z-index:1;color:var(--ftc);padding:6px 12px 7px;background:radial-gradient(closest-side,rgba(4,6,6,.78),rgba(4,6,6,.5) 60%,rgba(4,6,6,0));text-shadow:0 1px 0 #000,0 0 4px #000}' +
  '.uzt .u0 .lb{background:radial-gradient(closest-side,rgba(240,226,188,.7),rgba(240,226,188,0));text-shadow:0 0 3px rgba(250,238,205,.9)}' +
  '.uzt b.bd{position:absolute;z-index:2;top:6px;right:6px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;color:#08100d;font:700 11px/18px "Atkinson Hyperlegible",sans-serif;box-shadow:0 0 0 1px #000}' +
  '@media (prefers-reduced-motion:reduce){.uzt button{transition:none}}';
function css() { if (document.getElementById('uzt-css')) return; const s = document.createElement('style'); s.id = 'uzt-css'; s.textContent = CSS; document.head.appendChild(s); }
function paintAll(el) {
  el.querySelectorAll('canvas.tex').forEach((cv) => { const i = +cv.dataset.i, b = cv.parentElement, key = b.clientWidth + 'x' + b.clientHeight;
    if (cv._key === key) return; try { if (paintTex(cv, i)) cv._key = key; } catch (e) { if (window.console) console.error(e); } });
  const om = el.querySelector('.om'); if (window.GLASS && om && !om._gl) { om._gl = true; om.innerHTML = GLASS.tile({ key: 'uz-tab-omens', lit: 1 }); } // GameArt (the glass) loads after GameUI
  if (window.GLASS) { const g = el.querySelector('.gl-tile'), key = g && (g.clientWidth + 'x' + g.clientHeight); if (g && g._uztKey !== key && g.clientWidth) { g._uztKey = key; try { GLASS.paint(el); } catch (e) { if (window.console) console.error(e); } } }
}
function render(el, tab, badges) {
  if (!el) return; css(); badges = badges || [];
  if (!el._uzt) {
    el.classList.add('uzt'); el.setAttribute('role', 'tablist'); el.setAttribute('aria-label', 'Ulhu');
    el.innerHTML = NAMES.map((n, i) => '<button data-a="tab" data-v="' + i + '" class="u' + i + '" role="tab">' +
      (i === 2 ? '<span class="om"><span class="gl-tile" style="background:linear-gradient(135deg,#3a2a6a,#1a5a5a,#7a5a1a)"></span></span>' : '<canvas class="tex" data-i="' + i + '" aria-hidden="true"></canvas>') +
      '<span class="lb">' + n + '</span><b class="bd" hidden></b></button>').join('');
    el._uzt = true;
    if (window.ResizeObserver) { let t; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => paintAll(el), 150); }).observe(el); }
  }
  el.querySelectorAll('button').forEach((b, i) => { const on = i === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on));
    const bd = b.querySelector('b.bd'), v = badges[i]; if (v && v.n) { bd.hidden = false; bd.textContent = v.n; bd.style.background = v.c || '#5ef2a0'; } else bd.hidden = true; });
  paintAll(el);
}
window.UZTABS = { render };
})();
