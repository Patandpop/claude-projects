"""The evening timer picker (planner/day-timer.js) in headless Chromium at phone size, against a fake server.
Checks: the likeliest jobs, the two-tap pick (class only for jobs that carry one), one tap on a likely job starts it,
the running chip and Stop, no signal puts things back with a message, and Light and Dark both read well.
Run:  python planner/tests/day_timer_sim.py   (needs playwright + chromium, like the other sims). Made-up data."""
import os, sys, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
read = lambda f: open(os.path.join(ROOT, f), encoding='utf-8').read()
page = '''<!doctype html><html data-theme="light"><meta charset="utf-8"><meta name=viewport content="width=device-width,initial-scale=1">
<style>
 :root{--paper:#EDF2F8;--plate:#FFFFFF;--ink:#12345C;--line:#C9D6E5;--deep:#0D2442;--warn-text:#8A3F00}
 html[data-theme="dark"]{--paper:#0A1829;--plate:#13294A;--ink:#EAF2FA;--line:#27456B;--deep:#1C3A63;--warn-text:#FFB37A}
 body{margin:0;padding:12px;background:var(--paper);font:15px system-ui}
</style><body><div id="t"></div>
<script>''' + read('day-logic.js') + '''</script><script>''' + read('day-timer.js') + '''</script>
<script>
window.CALLS=[]; window.DOWN=false;
function call(fn,...a){ CALLS.push([fn].concat(a)); return new Promise((ok,bad)=>setTimeout(()=>DOWN?bad(new Error('no connection')):ok(fn==='timerStart'?{id:'tm1'}:{}),80)); }
window.T = DayTimer.mount(document.getElementById('t'), call, { todayClasses:['9AS','10S2'], recent:[{job:'Setting homework',cls:'10S2',startedAt:5}], source:'phone' });
</script></body></html>'''
path = os.path.join(tempfile.mkdtemp(), 'timer.html'); open(path, 'w', encoding='utf-8').write(page)

res = []
def check(n, c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(Path(path).as_uri()); pg.wait_for_timeout(200)
    likely = pg.eval_on_selector_all('[data-dt=likely]', 'b => b.map(x => x.textContent)')
    check('three likeliest jobs, recent first: %s' % likely, likely == ['Setting homework 10S2', 'Marking 9AS', 'Marking 10S2'])
    check('six jobs to pick from, no class row before a job is picked', pg.locator('[data-dt=job]').count() == 6 and pg.locator('[data-dt=cls]').count() == 0)
    check('Start waits for a pick', pg.is_disabled('[data-dt=start]'))
    pg.click('[data-dt=job][data-v="Marking"]')
    check('Marking asks which class (all ten)', pg.locator('[data-dt=cls]').count() == 10 and pg.is_disabled('[data-dt=start]'))
    pg.click('[data-dt=cls][data-v="9XS"]')
    check('picking the class readies Start', not pg.is_disabled('[data-dt=start]') and 'Marking 9XS' in pg.inner_text('[data-dt=start]'))
    pg.click('[data-dt=job][data-v="Emails"]')
    check('Emails needs no class: the class row goes and Start is ready', pg.locator('[data-dt=cls]').count() == 0 and pg.inner_text('[data-dt=start]') == 'Start: Emails')
    pg.click('[data-dt=start]'); pg.wait_for_timeout(30)
    check('starting shows the running chip at once', 'Emails · 0 min' in pg.inner_text('[data-dt=running]'))
    pg.wait_for_timeout(200)
    c = pg.evaluate('CALLS[CALLS.length-1]')
    check('the server is asked to start Emails with no class, from the phone', c[0] == 'timerStart' and c[1] == 'Emails' and c[2] == '' and c[4] == 'phone')
    pg.click('[data-dt=likely] >> nth=1'); pg.wait_for_timeout(200)
    check('one tap on a likely job starts it (the new job replaces the old)', 'Marking 9AS' in pg.inner_text('[data-dt=running]') and pg.evaluate('T.state().timer.id') == 'tm1')
    pg.evaluate('DOWN=true'); pg.click('[data-dt=stop]'); pg.wait_for_timeout(250)
    check('no signal: Stop puts the timer back and says so', pg.locator('[data-dt=running]').count() == 1 and 'Not stopped' in pg.inner_text('[data-dt=msg]'))
    pg.click('[data-dt=job][data-v="Admin"]'); pg.click('[data-dt=start]'); pg.wait_for_timeout(250)
    check('no signal: a new start is undone and the old timer stays', 'Marking 9AS' in pg.inner_text('[data-dt=running]') and 'Not started' in pg.inner_text('[data-dt=msg]'))
    pg.evaluate('DOWN=false'); pg.click('[data-dt=stop]'); pg.wait_for_timeout(250)
    check('Stop with signal clears the chip', pg.locator('[data-dt=running]').count() == 0 and pg.evaluate('CALLS[CALLS.length-1][0]') == 'timerStop')
    light = pg.evaluate("getComputedStyle(document.querySelector('[data-dt=job]')).backgroundColor")
    pg.evaluate("document.documentElement.dataset.theme='dark'"); pg.wait_for_timeout(50)
    dark = pg.evaluate("[getComputedStyle(document.querySelector('[data-dt=job]')).backgroundColor, getComputedStyle(document.querySelector('[data-dt=job]')).color]")
    check('dark mode: the buttons turn dark with light text (%s, %s)' % (dark[0], dark[1]), light == 'rgb(255, 255, 255)' and dark[0] == 'rgb(19, 41, 74)' and dark[1] == 'rgb(234, 242, 250)')
    check('no page errors', not errs)
    if errs: print(errs)
    b.close()
failed = res.count(False)
print(f'\n{failed} FAILED' if failed else '\nAll passed'); sys.exit(1 if failed else 0)
