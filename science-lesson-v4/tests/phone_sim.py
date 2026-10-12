"""Phone simulation. Runs Phone.html in headless Chromium against a slow fake server and checks the timer taps,
stale replies, silent work, one-tap positives, hold for options, the connection dot and dark mode.
Run:  python3 tests/phone_sim.py        (needs: pip install playwright && playwright install chromium)
Uses synthetic students only, no real names."""
import os, sys, json, tempfile
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'Phone.html')).read().replace('<?= key ?>', 'k').replace('<?= manifestUrl ?>', '')
first = ['Alex', 'Ben', 'Cara', 'Dan', 'Eve', 'Finn', 'Gus', 'Hana', 'Ivy', 'Jack', 'Kit', 'Lea']
STU = [{'name': f'{n} Test', 'short': f'{n} T.', 'x': 10 + (i % 6) * 15, 'y': 18 if i < 6 else 50,
        'support': 'prompt' if i == 2 else 'extend' if i == 7 else ''} for i, n in enumerate(first)]
MOCK = r'''<script>
const STU=%s, RATIO=2.4; let EV=[]; let TIMER=null, MODE={mode:'teaching'}, DELAY=150;
const st=()=>Object.assign({},MODE,{timer:TIMER,now:Date.now(),board:Date.now()-3000});
const H={init:()=>({classes:['10C2'],today:['10C2'],week:'B',active:'10C2',rules:{2:'Work ethic',4:'Attention'},mode:st(),version:18}),
 openClass:()=>({students:STU,ratio:RATIO,events:EV,silence:null}), getMode:()=>st(),
 setTimer:(kind,c,s)=>{TIMER={kind:'timer',label:'Timer',end:Date.now()+s*1000,total:s*1000};return st();},
 adjustTimer:(d)=>{if(TIMER)TIMER.end+=d*1000;return st();}, stopTimer:()=>{TIMER=null;return st();},
 setMode:(md,c,s)=>{if(md==='work'&&!TIMER)TIMER={kind:'timer',label:'Timer',end:Date.now()+s*1000,total:s*1000};
   MODE={mode:md,label:{countdown:'Countdown',entry:'Silent entry',work:'Silent work'}[md],sid:'s'+Date.now(),start:Date.now(),countdown:md==='countdown'?3:0,live:'quiet'};return st();},
 endMode:()=>{MODE={mode:'teaching',lastSid:MODE.sid};return st();},
 setPause:(on)=>{ if(on){MODE=Object.assign({},MODE,{paused:true,pausedAt:Date.now()}); if(TIMER&&!TIMER.paused)TIMER=Object.assign({},TIMER,{paused:true,left:TIMER.end-Date.now()});}
   else {MODE=Object.assign({},MODE,{paused:false,pausedAt:null}); if(TIMER&&TIMER.paused)TIMER=Object.assign({},TIMER,{paused:false,end:Date.now()+TIMER.left});} return st();},
 logEvent:(c,n,ty)=>{EV=EV.concat([{id:Date.now(),t:'09:30',name:n,type:ty,rule:0}]);return EV;}, positivesOver:()=>[], getSilence:()=>null};
window.google={script:{run:{withSuccessHandler(ok){return {withFailureHandler(fail){return new Proxy({},{get(_,fn){return function(k,...a){
  const snap = fn==='getMode' ? st() : null;   // getMode answers with the state at the moment it was asked (like a slow network)
  setTimeout(()=>{ try{ ok(snap || H[fn](...a)); }catch(e){fail(e);} }, fn==='getMode'? DELAY*4 : DELAY);
}}})}}}}}};
</script>''' % json.dumps(STU)
page = html.replace('<script>\nconst KEY', MOCK + '\n<script>\nconst KEY', 1)
path = os.path.join(tempfile.mkdtemp(), 'phone.html'); open(path, 'w').write(page)

results = []
def check(name, cond): results.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name)

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.route('**/*fonts*', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + path, wait_until='domcontentloaded'); pg.wait_for_timeout(1200)
    secs = lambda: pg.evaluate("[Math.round((S.mode.timer.end-Date.now()-offset)/1000), Math.round((TIMER.end-Date.now())/1000)]")

    import time
    pg.click('[data-t="start"]'); t0 = time.time(); pg.wait_for_timeout(400)
    check('timer starts at 3:00', abs(secs()[0] - 180) <= 2)
    for _ in range(6): pg.click('[data-t="+30"]', delay=120); pg.wait_for_timeout(230)
    pg.wait_for_timeout(700); a, bb = secs(); want = 360 - (time.time() - t0)   # the timer keeps running while we tap
    check('six quick +30 s taps all count, phone and server agree (%s, %s)' % (a, bb), abs(a - want) <= 2 and abs(a - bb) <= 2)
    # an older getMode reply (from before Stop) must not bring the timer back
    pg.evaluate("DELAY=300; clearTimeout(modeTimer); refreshMode()"); pg.click('[data-t="stop"]'); pg.wait_for_timeout(1800)
    check('stop stays stopped even when an old reply arrives', pg.evaluate("[!!S.mode.timer, !!TIMER, !!document.querySelector('[data-t=\"start\"]')]") == [False, False, True])
    pg.evaluate("DELAY=150"); pg.click('[data-mode="work"]'); pg.wait_for_timeout(600)
    check('silent work starts with the big End button', pg.evaluate("S.mode.mode==='work' && !!document.querySelector('.live .end')"))
    # pause (2026-10-08): one tap freezes the timer and shows Paused; Resume carries on
    pg.click('.live .pz'); pg.wait_for_timeout(400)
    left1 = pg.evaluate("document.querySelector('[data-k=left]').textContent"); pg.wait_for_timeout(2200)
    check('Pause: the phone says Paused and the timer stands still', pg.evaluate("S.mode.paused===true && document.querySelector('.live').textContent.includes('Paused')") and pg.evaluate("document.querySelector('[data-k=left]').textContent") == left1)
    pg.click('.live .pz'); pg.wait_for_timeout(400)
    check('Resume: listening again', pg.evaluate("!S.mode.paused && document.querySelector('.live .pz').textContent.includes('Pause')"))
    pg.click('.live .end'); pg.wait_for_timeout(500)
    check('End returns to teaching', pg.evaluate("S.mode.mode") == 'teaching')

    pg.evaluate("setView('names')"); pg.wait_for_timeout(200)
    n = pg.evaluate("S.students[0].name"); pg.click('.tile[data-name="%s"]' % n); pg.wait_for_timeout(600)
    check('one tap gives a positive and the tile turns gold', pg.evaluate("EV.length")==1 and 'has' in pg.evaluate("document.querySelector('.tile[data-name=\"%s\"]').className" % n))
    n2 = pg.evaluate("S.students[1].name"); box = pg.query_selector('.tile[data-name="%s"]' % n2).bounding_box()
    pg.mouse.move(box['x'] + 20, box['y'] + 20); pg.mouse.down(); pg.wait_for_timeout(650); pg.mouse.up(); pg.wait_for_timeout(300)
    check('holding a tile opens the options sheet, no positive given', pg.evaluate("!!document.querySelector('.sheet .who') && EV.length===1"))
    pg.evaluate("closeSheet()")
    check('connection dot is green', pg.evaluate("document.getElementById('dot').className") == 'dot green')
    pg.evaluate("setTab('day')"); pg.wait_for_timeout(300)
    pg.click('[data-set="theme"] button[data-v="dark"]'); pg.wait_for_timeout(200)
    check('dark theme can be switched on', pg.evaluate("document.documentElement.dataset.theme") == 'dark')
    check('no page errors', not errs)
    if errs: print(errs)
    b.close()
failed = [n for n, ok in results if not ok]
print(f'\n{len(failed)} FAILED' if failed else '\nAll passed'); sys.exit(1 if failed else 0)
