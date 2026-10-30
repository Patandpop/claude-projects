/* The wall (Breakwater), at the top of the Teaching area (Patryk's final pick WD-1b-ii with his fixes of 30 Oct).
   MADE BY planner/tools/make-wall.js from replica/design/mockups/wall8/index.html; change those, not this file.
   One square stained-glass block per school day, this week on top and next week below. In each block a moon of five
   wedges, one per period (I gold at the top, round to V ruby): the inner piece is the lesson (lit in the class colour
   once built), the outer ring its homework (white once set, lilac when none is needed); a free period has its own calm
   colour. Every piece is real leaded glass.
   WALL.html(w) -> the SVG. w = { days: ['Mon 2 Nov', ... 10], lessons: [{ day 0-9, per 1-5, cls, col, built, hw:
     'set'|'needed'|'none' }] }. Each piece carries data-d, data-p and data-part, so a tap can say what it is:
   WALL.describe(w, d, p, part) -> one line of HTML. WALL.count(w) -> { built, lessons, hwSet, hwNeed }. */
(function () {
'use strict';
if (typeof window === 'undefined' || window.WALL) return;
let LESSONS = [], CLASSCOL = {};
const DL = ['M', 'T', 'W', 'T', 'F'];
function dayDone(st,d){return LESSONS.filter(l=>l.day===d).every(l=>st[l.i].built&&st[l.i].hw!=='needed')}
/* ---------- geometry helpers ---------- */
const S=64,GAP=3,TOP=11,ROWGAP=4,CX=32;
let CY=34.5; // set per card: the moon sits a little low to leave room for numeral I
const f=n=>(+n).toFixed(2);
const P=(r,a)=>[CX+r*Math.cos(a),CY+r*Math.sin(a)];
const DEG=Math.PI/180;
const ANGC=k=>-Math.PI/2+k*72*DEG; // centre angle of period k (0 = P1, at 12 o'clock), clockwise
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function area(p){let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s/2)}
function centroid(p){let x=0,y=0;p.forEach(q=>{x+=q[0];y+=q[1]});return[x/p.length,y/p.length]}
function clipHalf(poly,o,n){const out=[],d=q=>(q[0]-o[0])*n[0]+(q[1]-o[1])*n[1];
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=d(a),db=d(b);
    if(da>=0)out.push(a);
    if((da>=0)!==(db>=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}
  return out}
function split(poly,o,n){return[clipHalf(poly,o,n),clipHalf(poly,o,[-n[0],-n[1]])]}
function crossings(poly,o,n){let c=0;const d=q=>(q[0]-o[0])*n[0]+(q[1]-o[1])*n[1];
  for(let i=0;i<poly.length;i++){if((d(poly[i])>=0)!==(d(poly[(i+1)%poly.length])>=0))c++}return c}
// break a piece into about k shards with straight leaded cuts; cuts never run through a numeral
function shatter(poly,k,r,minA,avoid){let ps=[poly];minA=minA||5;avoid=avoid||[];
  for(let i=0,tries=0;i<k-1&&tries<80;tries++){ps.sort((a,b)=>area(b)-area(a));const big=ps[0],c=centroid(big);
    const o=[c[0]+(r()-.5)*4,c[1]+(r()-.5)*4],a=r()*Math.PI,n=[Math.cos(a),Math.sin(a)];
    if(crossings(big,o,n)!==2)continue;
    if(avoid.some(([x,y,rad])=>Math.abs((x-o[0])*n[0]+(y-o[1])*n[1])<rad))continue;
    const[A,B]=split(big,o,n);
    if(A.length>2&&B.length>2&&area(A)>minA&&area(B)>minA){ps[0]=A;ps.push(B);i++}}
  return ps}
function ringShards(r0,r1,a1,a2,k,r,seg){const cuts=[a1];for(let i=1;i<k;i++)cuts.push(a1+(a2-a1)*(i+(r()-.5)*.6)/k);cuts.push(a2);
  const out=[];for(let i=0;i<k;i++)out.push(ringPoly(r0,r1,cuts[i],cuts[i+1],seg||3));return out}
// a radius can be a number, or a function of the angle (for a bumpy moon rim)
const RAD=(r,a)=>typeof r==='function'?r(a):r;
function arcPts(r,a1,a2,n){const o=[];for(let i=0;i<=n;i++){const a=a1+(a2-a1)*i/n;o.push(P(RAD(r,a),a))}return o}
function ringPoly(r0,r1,a1,a2,n){return arcPts(r1,a1,a2,n).concat(arcPts(r0,a2,a1,n))}
function edgePt(a){const c=Math.cos(a),s=Math.sin(a);let t=1e9;
  if(c>1e-9)t=Math.min(t,(S-CX)/c);if(c<-1e-9)t=Math.min(t,-CX/c);
  if(s>1e-9)t=Math.min(t,(S-CY)/s);if(s<-1e-9)t=Math.min(t,-CY/s);return[CX+c*t,CY+s*t]}
function cornersBetween(a1,a2){const out=[];[[S,S],[0,S],[0,0],[S,0]].forEach(([x,y])=>{let aa=Math.atan2(y-CY,x-CX);while(aa<a1)aa+=2*Math.PI;if(aa<a2)out.push([aa,x,y])});return out.sort((p,q)=>p[0]-q[0]).map(p=>[p[1],p[2]])}
function mixHex(a,b,t){const A=[1,3,5].map(i=>parseInt(a.substr(i,2),16)),B=[1,3,5].map(i=>parseInt(b.substr(i,2),16));
  return '#'+A.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+(B[i]-v)*t))).toString(16).padStart(2,'0')).join('')}
function tint(col,r,amt){const t=(r()-.5)*2*(amt||.16);return t>0?mixHex(col,'#ffffff',t):mixHex(col,'#000000',-t)}

/* ---------- the Roman numerals: thin pieces of dark glass, each leaded in ---------- */
const NUMPOS=[[32,7.6],[56.4,25],[54,56],[10,56],[7.6,25]];
function glyph(p,hh){
  if(p===1)return[[0,-hh,0,hh]];
  if(p===2)return[[-1.5,-hh,-1.5,hh],[1.5,-hh,1.5,hh]];
  if(p===3)return[[-2.9,-hh,-2.9,hh],[0,-hh,0,hh],[2.9,-hh,2.9,hh]];
  if(p===4)return[[-3.6,-hh,-3.6,hh],[-1.3,-hh,1.2,hh],[3.7,-hh,1.2,hh]];
  return[[-2.8,-hh,0,hh],[2.8,-hh,0,hh]]}
const GHALF=[0,0,1.5,2.9,3.7,2.8];
const BAR={hh:4.4,w:1.75};
function numPos(v,p){return(v.numpos||NUMPOS)[p-1]}
function barAvoid(v,p){const[x,y]=numPos(v,p);return[x,y,Math.max(GHALF[p],v.hh||BAR.hh)+2.2]}
function barPieces(v,p){const[x,y]=numPos(v,p),out=[],hh=v.hh||BAR.hh;
  glyph(p,hh).forEach(([x1,y1,x2,y2])=>{const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy),nx=-dy/L*BAR.w/2,ny=dx/L*BAR.w/2;
    out.push({pts:[[x+x1+nx,y+y1+ny],[x+x2+nx,y+y2+ny],[x+x2-nx,y+y2-ny],[x+x1-nx,y+y1-ny]],col:v.numGlass,on:'calm'})});
  return out}

/* ---------- the lit slices outside the moon ---------- */
function outerGlass(v,sh,top,r,sec,done){
  for(let k=0;k<5;k++){const p=k+1,poly=sec(k);
    let base=v.zones[k],on=true;
    // WD-1b-iii: an unfinished day keeps its slices dim; a finished day blazes
    if(v.glowDone){if(done)base=mixHex(base,'#fff6dc',.14);else{base=mixHex(base,'#17121c',.55);on='calm'}}
    ((v.geo||{}).outK===1?[poly]:shatter(poly,5,r,7,[barAvoid(v,p)])).forEach(q=>sh.push({pts:q,col:tint(base,r,.07),kind:'fill',on}));
    barPieces(v,p).forEach(q=>top.push(q))}}

/* ============ the moon ============ */
function moonBlock(v,st,d){const sh=[],top=[],r=rng(1000+d*31),G=v.geo||{};
  CY=G.cy||34.5;
  const R=G.R||19,RI=G.RI||11.5,RIM=G.RIM||2.2,HALO=G.halo||0,RO0=R+RIM;
  // the moon's outer edge: a perfect circle, or (WD-1b-ii) a gently bumpy rim
  const RO=G.wobble?(a=>RO0+G.wobble*(.55*Math.sin(3*a+1.3+d)+.45*Math.sin(7*a+.4+2*d))):RO0;
  const RH=HALO?(typeof RO==='function'?a=>RO(a)+HALO:RO0+HALO):RO;
  const done=dayDone(st,d);
  const sec=k=>{const a1=ANGC(k)-36*DEG,a2=ANGC(k)+36*DEG;return[P(RAD(RH,a1),a1),edgePt(a1)].concat(cornersBetween(a1,a2),[edgePt(a2)],arcPts(RH,a2,a1,6))};
  outerGlass(v,sh,top,r,sec,done);
  for(let k=0;k<5;k++){const a=ANGC(k)-36*DEG;sh.push({spoke:[P(RAD(RH,a),a),edgePt(a)]})}
  // WD-1b-iii: a thin halo of gold glass round the moon, lit only when the day is finished
  if(HALO)for(let k=0;k<5;k++){const a=ANGC(k);for(let j=0;j<2;j++){const a1=a-36*DEG+j*36*DEG,a2=a1+36*DEG;
    sh.push({pts:ringPoly(RO,RH,a1,a2,4),col:done?tint('#ffd36a',r,.05):tint('#4a3a1c',r,.05),kind:'fill',on:done?true:'calm'})}}
  // rim of the moon: lit silver on the right, shadowed on the left (crescent), cut with every wedge
  const rimN=G.rimPieces||3,rimW=72/rimN;
  for(let k=0;k<5;k++){const a=ANGC(k);for(let j=0;j<rimN;j++){const a1=a-36*DEG+j*rimW*DEG,a2=a1+rimW*DEG,mid=(a1+a2)/2;
    const lit=Math.cos(mid-(-20*DEG));
    let col=lit>0?mixHex(v.rimLit,v.rimDark,.5-lit*.5):v.rimDark;
    if(G.rimSpeckle&&r()<(G.speck||.35))col=mixHex(col,'#000000',.22); // pitted, uneven rim glass
    sh.push({pts:ringPoly(R,RO,a1,a2,3),col:tint(col,r,.06),kind:'fill',on:lit>0?true:'calm'})}}
  // the five period wedges: lesson in the middle, homework round the outside
  const nCr=G.craters||1;
  for(let k=0;k<5;k++){const p=k+1,a1=ANGC(k)-36*DEG,a2=ANGC(k)+36*DEG;
    const L=partState(v,st,d,p,'lesson'),H=partState(v,st,d,p,'hw');
    const les=[[CX,CY]].concat(arcPts(RI,a1,a2,3));
    sh.push({heavy:1,pts:les},{heavy:1,pts:ringPoly(RI,R,a1,a2,6)});
    const ls=shatter(les,G.lesK||3,r,6),craterL=Math.floor(r()*ls.length);
    ls.forEach((q,i)=>sh.push({pts:q,col:moonTint(L,r,i===craterL,G),kind:'lesson',p,on:L.on}));
    const hs=[];ringShards(RI,R,a1,a2,G.hwK||3,r,2).forEach(q=>(G.hwSplit===1?[q]:shatter(q,2,r,6)).forEach(z=>hs.push(z)));
    const cr=new Set();while(cr.size<Math.min(nCr,hs.length))cr.add(Math.floor(r()*hs.length));
    hs.forEach((q,i)=>sh.push({pts:q,col:moonTint(H,r,cr.has(i),G),kind:'hw',p,on:H.on}))}
  return{sh,top,done}}
function moonTint(s,r,crater,G){let c=s.on===true?mixHex(s.col,'#f4f1ff',.18):s.col;
  if(crater)c=G.craters>1?mixHex(c,'#26304a',s.on?.34:.24):mixHex(c,'#000000',s.on?.28:.22);return tint(c,r,.12)}

/* ---------- what colour a period's piece is ---------- */
function partState(v,st,d,p,part){const l=LESSONS.find(x=>x.day===d&&x.per===p);
  if(!l)return part==='lesson'?{col:v.free,on:'calm'}:{col:v.noHw,on:'calm'};
  const s=st[l.i];
  if(part==='lesson')return s.built?{col:CLASSCOL[l.cls],on:true}:{col:v.unlit,on:false};
  if(s.hw==='set')return{col:v.hwSet,on:true};
  if(s.hw==='none')return{col:v.noHw,on:'calm'};
  return{col:v.unlit,on:false}}


const SLICES=['#f3cd63','#eeab4f','#e48f4c','#d97357','#c95d68']; // WD-1b: gold at P1, warming to ruby by P5
const DAWN=['#f2ab9c','#f6c868','#f1dc92','#e9984f','#a985cf'];   // dawn pink, morning gold, noon straw, afternoon amber, dusk violet
const MOONBASE={block:moonBlock,rimLit:'#c3cbe0',rimDark:'#3b4257',free:'#7f97ab',noHw:'#8b84b4',hwSet:'#fbfaff',unlit:'#171a24',numGlass:'#1b1520'};

const V = Object.assign({id:'WD-1b-ii-fixed',title:'With your fixes',zones:SLICES,
  geo:{R:21,RI:12.8,RIM:2.4,cy:35,wobble:.2,craters:2,rimPieces:4,rimSpeckle:1,speck:.1,lesK:2,hwK:2,hwSplit:1,outK:1},hh:3,
  numpos:[[32,6.6],[55.5,16.5],[56,56.5],[8,56.5],[8.5,16.5]],
  cap:'Fewer cracks in the moon, the same moon size, smaller numerals, clean outer slices, a smoother rim.'},MOONBASE);
/* ---------- drawing: every shard is its own leaded piece ---------- */
const LEAD='#0a090c';
function pathD(pts,open){return 'M'+pts.map(q=>f(q[0])+' '+f(q[1])).join('L')+(open?'':'Z')}
function blockSVG(v,st,d,uid){const{sh,top,done}=v.block(v,st,d);let g='',bloom='',lead='',heavy='',g2='',lead2='';
  sh.forEach(s=>{if(s.spoke){heavy+=pathD(s.spoke,1);return}
    const D=pathD(s.pts);if(s.heavy){heavy+=D;return}
    const attrs=s.kind==='fill'?'':' class="pc" data-d="'+d+'" data-p="'+s.p+'" data-part="'+s.kind+'"';
    const filt=s.on===false?' filter="url(#'+uid+'tex)"':'';
    const op=s.on==='calm'&&s.kind!=='fill'?' fill-opacity=".88"':'';
    g+='<path'+attrs+' d="'+D+'" fill="'+s.col+'"'+op+filt+'/>';
    if(s.on===true)bloom+='<path d="'+D+'" fill="'+s.col+'"'+(s.kind==='fill'?' fill-opacity=".55"':'')+'/>';
    lead+=D});
  top.forEach(s=>{const D=pathD(s.pts);g2+='<path d="'+D+'" fill="'+s.col+'"/>';lead2+=D});
  return{g,bloom,lead,heavy,g2,lead2,done}}
function defsFor(uid){return '<filter id="'+uid+'tex" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .55  0 0 0 0 .58  0 0 0 0 .66  0 0 0 .2 0" result="c"/><feComposite in="c" in2="SourceGraphic" operator="in" result="t"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="t"/></feMerge></filter>'+
  '<filter id="'+uid+'bloom" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.5"/></filter>'+
  '<filter id="'+uid+'blaze" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>'}
function wallSVG(v,st,uid){const W=5*S+4*GAP,H=TOP+2*S+ROWGAP;let glass='',bloom='',blaze='',lead='',top='',labels='';
  for(let c=0;c<5;c++)labels+='<text x="'+(c*(S+GAP)+S/2)+'" y="8.5" text-anchor="middle" font-size="8.5" font-weight="700" fill="#aab2c4" font-family="system-ui,sans-serif">'+DL[c]+'</text>';
  for(let d=0;d<10;d++){const ox=(d%5)*(S+GAP),oy=TOP+(d>=5?S+ROWGAP:0),T='translate('+ox+' '+oy+')',b=blockSVG(v,st,d,uid);
    glass+='<g transform="'+T+'">'+b.g+'</g>';
    if(v.glowDone&&b.done)blaze+='<g transform="'+T+'">'+b.bloom+'</g>';else bloom+='<g transform="'+T+'">'+b.bloom+'</g>';
    lead+='<g transform="'+T+'"><path d="'+b.lead+'"/><path d="'+b.heavy+'" stroke-width="2.3"/></g>';
    top+='<g transform="'+T+'">'+b.g2+'<g fill="none" stroke="'+LEAD+'" stroke-linejoin="round" stroke-linecap="round"><path d="'+b.lead2+'" stroke-width=".9"/></g>'+
      '<rect x="1" y="1" width="'+(S-2)+'" height="'+(S-2)+'" rx="1.5" fill="none" stroke="'+LEAD+'" stroke-width="2.4"/></g>'}
  return '<svg class="wall" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+v.title+' wall, two weeks"><defs>'+defsFor(uid)+'</defs>'+labels+glass+
   '<g filter="url(#'+uid+'bloom)" opacity="'+(v.glowDone?.3:.42)+'" style="mix-blend-mode:screen" pointer-events="none">'+bloom+'</g>'+
   (blaze?'<g filter="url(#'+uid+'blaze)" opacity=".8" style="mix-blend-mode:screen" pointer-events="none">'+blaze+'</g>':'')+
   '<g fill="none" stroke="'+LEAD+'" stroke-width="1.3" stroke-linejoin="round" pointer-events="none">'+lead+'</g><g pointer-events="none">'+top+'</g><g class="sel" pointer-events="none"></g></svg>'}

function load(w) { LESSONS = (w && w.lessons || []).map((l, i) => Object.assign({}, l, { i })); CLASSCOL = {}; LESSONS.forEach((l) => { CLASSCOL[l.cls] = l.col || '#3fb4e8'; }); return LESSONS.map((l) => ({ built: !!l.built, hw: l.hw || 'none' })); }
function html(w) { const st = load(w); return wallSVG(V, st, 'wl'); }
function describe(w, d, p, part) {
  const l = (w.lessons || []).find((x) => x.day === d && x.per === p), day = (w.days || [])[d] || '', base = '<b>' + day + ', P' + p;
  if (!l) return base + '</b>: free period.';
  if (part === 'lesson') return base + ', ' + l.cls + '</b>: lesson ' + (l.built ? 'built.' : 'not built yet.');
  return base + ', ' + l.cls + '</b>: ' + (l.hw === 'set' ? 'homework set.' : l.hw === 'none' ? 'no homework needed.' : 'homework needed, not set yet.');
}
function count(w) { const L = (w && w.lessons) || []; return { lessons: L.length, built: L.filter((l) => l.built).length, hwNeed: L.filter((l) => l.hw !== 'none').length, hwSet: L.filter((l) => l.hw === 'set').length }; }
window.WALL = { html, describe, count };
})();
