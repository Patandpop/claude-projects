"""Board simulation. Runs BoardPage.html in headless Chromium with a fake server and a fake microphone,
then drives countdown, silent entry, silent work with a timer, and a cancelled silence.
Run:  python3 tests/board_sim.py        (needs: pip install playwright && playwright install chromium)
Takes about 50 seconds because it runs in real time."""
import os, sys, tempfile
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'BoardPage.html')).read().replace('<?= key ?>', 'k')
MOCK = """<script>
window.NAMES=['Leo N.','Wilf Tu.','Casper A.','Oscar D.','Jake F.']; window.MODE={mode:'teaching'};
window.google={script:{run:{withSuccessHandler(ok){return {withFailureHandler(){return new Proxy({},{get(_,fn){return function(){
 const D={getBoard:{cls:'8XP',names:window.NAMES.slice(0,6),mode:window.MODE,now:Date.now(),version:18}}; setTimeout(()=>ok(D[fn]||{ok:1}),10);}}})}}}}}};
</script>"""
page = html.replace('<body data-key="k">', '<body data-key="k">' + MOCK, 1)
path = os.path.join(tempfile.mkdtemp(), 'board.html'); open(path, 'w').write(page)

results = []
def check(name, cond): results.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name)

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 900, 'height': 700})
    pg.route('**/*fonts*', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + path, wait_until='domcontentloaded'); pg.wait_for_timeout(500)
    # fake microphone at -80 dB (quiet level -80, limit 13 dB above, entry needs 4 s here instead of 30)
    pg.evaluate("BASE=-80; LIM=13; ENTRY=6; ENTRY_MIN=4; window.FAKE=-80; setInterval(()=>onMicLevel(FAKE+(Math.random()*2-1)),100); setInterval(poll,300)")
    ph = lambda: pg.evaluate("sess ? sess.phase : 'ended'")
    def start(mode, extra=''):
        pg.evaluate("MODE={mode:'%s',sid:'s'+Date.now(),start:Date.now(),%s}" % (mode, extra)); 
    def stop(cancelled='false'):
        pg.evaluate("MODE={mode:'teaching',lastSid:(sess?sess.sid:'x'),cancelled:%s}" % cancelled); pg.wait_for_timeout(700)

    # 1. quiet countdown: 3 s count, listening, spark and tick after 2.8 s of quiet (2026-10-07), then it ends
    start('countdown', 'countdown:3,grace:0,label:"Countdown"')
    pg.wait_for_timeout(1500); check('countdown: counting', ph() == 'count')
    pg.wait_for_timeout(2600); check('countdown: listening after the count', ph() == 'listen')
    pg.wait_for_timeout(2600); check('countdown: accepted after 2.8 s of quiet', ph() == 'celebrate')
    pg.wait_for_timeout(4000); check('countdown: ended itself after the tick', ph() == 'ended')
    stop()

    # 2. (silent work, so quiet can't end it) a single bang does not trip; sustained noise does; it clears after 1.75 s of quiet
    start('work', 'countdown:0,grace:3,label:"Silent work"')
    pg.evaluate("MODE.timer={kind:'timer',label:'Timer',end:Date.now()+60000,total:60000}")
    pg.wait_for_timeout(4500)
    pg.evaluate("FAKE=-40; setTimeout(()=>FAKE=-80,150)"); pg.wait_for_timeout(900)
    check('one short bang does not trip it', pg.evaluate("sess && !sess.tripped && sess.phase==='listen'"))
    pg.evaluate("FAKE=-60"); pg.wait_for_timeout(3200)
    check('sustained noise trips the warning', pg.evaluate("sess && sess.tripped"))
    pg.evaluate("FAKE=-80"); pg.wait_for_timeout(1000)
    check('warning stays until 1.75 s of quiet', pg.evaluate("sess && sess.tripped"))
    pg.wait_for_timeout(1800)
    check('warning clears after that', pg.evaluate("sess && !sess.tripped"))
    stop('true')

    # 3. silent entry: statement, higher line, accepted, tick, then the %
    start('entry', 'countdown:0,grace:2,label:"Silent entry"')
    pg.wait_for_timeout(1000); check('entry: statement first', ph() == 'statement')
    pg.wait_for_timeout(2500); check('entry: line sits higher while listening', pg.evaluate("sess && CH.y < 50"))
    pg.wait_for_timeout(5500)
    check('entry: result % plays after the tick', pg.evaluate("!!RESULT && RESULT.kind==='entry' && RESULT.pct===100"))
    pg.wait_for_timeout(6500); stop()

    # 4. silent work with a 14 s timer, noise in the middle: the % plays by itself when the timer ends
    start('work', 'countdown:0,grace:3,label:"Silent work"')
    pg.evaluate("MODE.timer={kind:'timer',label:'Timer',end:Date.now()+14000,total:14000}")
    pg.wait_for_timeout(6000); pg.evaluate("FAKE=-60"); pg.wait_for_timeout(3500); pg.evaluate("FAKE=-80")
    pg.wait_for_timeout(5500)
    pct = pg.evaluate("RESULT ? RESULT.pct : null")
    check(f'work: the % plays when the timer reaches 0:00 (value {pct})', pg.evaluate("!!RESULT && RESULT.kind==='work' && RESULT.pre===0.7") and pct is not None and 20 <= pct < 100)
    pg.wait_for_timeout(7500); stop()

    # 5. cancelled silence shows nothing
    start('work', 'countdown:0,grace:3,label:"Silent work"')
    pg.wait_for_timeout(5000); stop('true')
    check('cancel: no % is shown', pg.evaluate("RESULT") is None)
    # pause (2026-10-08): while paused, noise is not heard or scored; on resume the silence carries on
    start('work', 'countdown:0,grace:0,label:"Silent work",paused:false')
    pg.wait_for_timeout(1500)
    pg.evaluate("MODE=Object.assign({},MODE,{paused:true})"); pg.wait_for_timeout(700)
    red0 = pg.evaluate("sess ? sess.red : -1"); pg.evaluate("FAKE=-40"); pg.wait_for_timeout(3000)
    check('pause: loud noise while paused is not counted', pg.evaluate("sess && sess.red") == red0 and pg.evaluate("PAUSED") is True)
    pg.evaluate("FAKE=-80; MODE=Object.assign({},MODE,{paused:false})"); pg.wait_for_timeout(1500)
    check('pause: resumes listening, not tripped by the pause', pg.evaluate("sess && !PAUSED && !sess.tripped"))
    stop('true')
    check('no page errors', not errs)
    if errs: print(errs)
    b.close()
failed = [n for n, ok in results if not ok]
print(f'\n{len(failed)} FAILED' if failed else '\nAll passed'); sys.exit(1 if failed else 0)
