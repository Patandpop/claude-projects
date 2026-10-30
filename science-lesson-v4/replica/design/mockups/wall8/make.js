// Builds index.html: the wall, round three (Patryk's final pick WD-1b-ii from ../wall7/index.html, with his fixes of
// 30 Oct): far fewer cracks inside the moon (one break per lesson wedge and per homework ring), the same moon size,
// slightly smaller numerals, NO cracks in the outer slices (each one clean piece of glass), a much less bumpy rim.
// wall7 is copied and only these settings change; WD-1b-ii as it was stays first, to compare.
// Run: node replica/design/mockups/wall8/make.js
const fs = require('fs'), path = require('path');
let s = fs.readFileSync(path.join(__dirname, '../wall7/index.html'), 'utf8');
const swap = (a, b) => { if (s.split(a).length !== 2) throw new Error('wall7 changed, look for: ' + a); s = s.replace(a, b); };
swap('<title>Moon Slice Variations</title>', '<title>The wall: WD-1b-ii with your fixes</title>');
swap('<h1>Moon slices, round two</h1>', '<h1>The wall, WD-1b-ii fixed</h1>');
swap(s.slice(s.indexOf('<p class="mute">Your pick WD-1b first'), s.indexOf('</p>', s.indexOf('<p class="mute">Your pick WD-1b first')) + 4),
  '<p class="mute">Your final pick WD-1b-ii as it was, then with your fixes: far fewer cracks inside the moon (one break in each lesson wedge and one in each homework ring), the same moon size, slightly smaller numerals, no cracks at all in the outer slices (each slice is one clean piece of glass) and a much smoother rim. In each period the inner piece is the lesson and the outer ring its homework. Tap any piece.</p>');
// the counts become settings (the old numbers are the defaults, so WD-1b-ii as it was still draws the same)
swap('shatter(poly,5,r,7,[barAvoid(v,p)]).forEach(', '((v.geo||{}).outK===1?[poly]:shatter(poly,5,r,7,[barAvoid(v,p)])).forEach(');
swap('const ls=shatter(les,3,r,6)', 'const ls=shatter(les,G.lesK||3,r,6)');
swap('ringShards(RI,R,a1,a2,3,r,2).forEach(q=>shatter(q,2,r,6).forEach(z=>hs.push(z)));', 'ringShards(RI,R,a1,a2,G.hwK||3,r,2).forEach(q=>(G.hwSplit===1?[q]:shatter(q,2,r,6)).forEach(z=>hs.push(z)));');
swap('if(G.rimSpeckle&&r()<.35)', 'if(G.rimSpeckle&&r()<(G.speck||.35))');
const BEFORE = "geo:{R:21,RI:12.8,RIM:2.4,cy:35,wobble:.7,craters:2,rimPieces:4,rimSpeckle:1},hh:3.6,";
const v0 = s.indexOf(' Object.assign({id:\'WD-1b-ii\''), v1 = s.indexOf('MOONBASE)', v0) + 'MOONBASE)'.length;
const ii = s.slice(v0, v1); if (ii.indexOf(BEFORE) < 0) throw new Error('wall7 WD-1b-ii changed');
const fixed = ii.replace("id:'WD-1b-ii',title:'A bigger, truer moon'", "id:'WD-1b-ii-fixed',title:'With your fixes'")
  .replace(BEFORE, "geo:{R:21,RI:12.8,RIM:2.4,cy:35,wobble:.2,craters:2,rimPieces:4,rimSpeckle:1,speck:.1,lesK:2,hwK:2,hwSplit:1,outK:1},hh:3,")
  .replace(/cap:'[^']*'/, "cap:'Fewer cracks in the moon, the same moon size, smaller numerals, clean outer slices, a smoother rim.'");
const a0 = s.indexOf('const VARS=['), a1 = s.indexOf('];', a0) + 2;
s = s.slice(0, a0) + 'const VARS=[\n' + ii.replace(/cap:'[^']*'/, "cap:'Your final pick as it was, to compare.'") + ',\n' + fixed + '\n];' + s.slice(a1);
fs.writeFileSync(path.join(__dirname, 'index.html'), s);
console.log('wrote', s.length, 'bytes; em dashes:', (s.match(/—/g) || []).length);
