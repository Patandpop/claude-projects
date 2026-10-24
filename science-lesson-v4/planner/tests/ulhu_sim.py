"""Ulhu redesign end to end: the real Game.gs on the Apps Script mock behind a local server, the page in headless Chromium at phone size.
Run: python tests/ulhu_sim.py  (add --shots DIR to save screenshots). Synthetic data only."""
import os, sys, subprocess, time
from playwright.sync_api import sync_playwright
P = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'; SP = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else __import__('tempfile').mkdtemp()
js = ''.join(open(P + f, encoding='utf-8').read() + '\n' for f in ['game-ulhu.js', 'game-pixel.js', 'game-ui.js'])
page = '''<!doctype html><meta charset="utf-8"><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0;background:#0d1b3a">
<div style="height:60px;background:#0a1020;color:#fff">8AG header</div><div id=u></div><nav style="position:fixed;bottom:0;left:0;right:0;height:62px;background:#0a1020"></nav>
<script>window.CALLS=[];function call(fn,...args){CALLS.push(fn);return fetch('/c',{method:'POST',body:JSON.stringify({fn,args})}).then(r=>r.json()).then(x=>{if(x.err)throw new Error(x.err);return x.ok;});}</script>
<script>''' + js + '''</script><script>GameUI.mount(document.getElementById('u'),call,{wide:false});</script>'''
f = os.path.join(SP, 'ul2.html'); open(f, 'w', encoding='utf-8').write(page)
srv = subprocess.Popen(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ulhu_server.js'), '8765', f], stdout=subprocess.PIPE, text=True)
srv.stdout.readline()
res = []
def check(n, c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n)
shots = '--shots' in sys.argv
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://localhost:8765/'); pg.wait_for_timeout(2500)
        check('banner shows coins, level title and Ulhu', pg.inner_text('.uz-coins b') == '437' and pg.locator('.uz-me img').count() >= 1)
        check('four tabs, Rituals first with a count badge', pg.locator('.uz-tabs button').count() == 4 and pg.locator('.uz-tabs button b').count() >= 1)
        check('groups: Teaching Trench, Drudgery Shoals, Summoning Circle, Marking Crypt, Surface World', all(t in pg.inner_text('.uz-pane >> nth=0') for t in ['The Teaching Trench', 'The Drudgery Shoals', 'The Summoning Circle', 'The Marking Crypt', 'The Surface World']))
        check('Tide Charts card and the Sunday review at the bottom', 'Tide Charts' in pg.inner_text('.uz-pane >> nth=0') and pg.locator('.uz-rv').count() == 1)
        if shots: pg.screenshot(path=os.path.join(SP, 's1.png'))
        c0 = int(pg.inner_text('.uz-coins b'))
        pg.locator('.uz-pane >> nth=0').locator('.uz-row:not(.done) [data-a=tick]').first.click(); pg.wait_for_timeout(80)
        c1 = int(pg.inner_text('.uz-coins b'))
        check('a tick pays at once, before the server answers', c1 > c0 and 'Ticked:' in pg.inner_text('.uz-undo'))
        pg.wait_for_timeout(900)
        check('the server agrees', int(pg.inner_text('.uz-coins b')) == c1)
        pg.click('[data-a=undo]'); pg.wait_for_timeout(900)
        check('Undo puts it back (screen and server)', int(pg.inner_text('.uz-coins b')) == c0 and 'Undone' in pg.inner_text('.uz-undo'))
        # swipe to Quests
        def swipe(dx):
            bx = pg.locator('.uz-body').bounding_box(); y = bx['y'] + 200; x = bx['x'] + bx['width'] / 2
            pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + dx / 2, y, steps=5); pg.mouse.move(x + dx, y, steps=5); pg.mouse.up(); pg.wait_for_timeout(500)
        swipe(-150)
        check('swiping left opens Quests', pg.evaluate("getComputedStyle(document.querySelectorAll('.uz-tabs button')[1]).color") == 'rgb(164, 138, 255)')
        t = pg.inner_text('.uz-pane >> nth=1')
        check('quests: Errand Scrolls, Surface Errands, due chips, checklist, Boss Pit', all(x in t for x in ['The Errand Scrolls', 'Surface Errands', 'due today', 'Find the 2024 paper', 'The Boss Pit', 'Mark the 10S2 test']))
        if shots: pg.screenshot(path=os.path.join(SP, 's2.png'))
        pg.locator('.uz-pane >> nth=1').locator('[data-a=step]').nth(1).click(); pg.wait_for_timeout(700)
        check('a checklist step ticks', '2 of 3' in pg.inner_text('.uz-pane >> nth=1'))
        q = pg.locator('.uz-pane >> nth=1').locator('.uz-q [data-a=tick]').first; q.click(); pg.wait_for_timeout(1600)
        check('a done quest folds into Finished', 'Finished' in pg.inner_text('.uz-pane >> nth=1'))
        pg.locator('[data-a=banish]').first.click(); pg.locator('[data-a=banish]').first.click(); pg.wait_for_timeout(700)
        check('Banish (two taps) removes a boss, Undo brings it back', pg.locator('.uz-boss').count() == 1)
        pg.click('[data-a=undo]'); pg.wait_for_timeout(800)
        check('...and it is back', pg.locator('.uz-boss').count() == 2)
        # boss form
        pg.click('.uz-dock [data-v=boss]'); pg.wait_for_timeout(200)
        pg.fill('[data-name]', 'Mark the 9AS mocks'); pg.click('[data-a=tmpl]'); pg.click('[data-v="size:10"]'); pg.wait_for_timeout(100)
        check('boss form: size by hours (10h pays 300) and the marking template', '300' in pg.inner_text('.uz-total') and pg.locator('[data-step]').count() == 4)
        if shots: pg.screenshot(path=os.path.join(SP, 's3.png'))
        pg.click('[data-a=submit]'); pg.wait_for_timeout(900)
        check('the new boss appears with its creature', 'Mark the 9AS mocks' in pg.inner_text('.uz-pane >> nth=1') and 'Drowned Leviathan' in pg.inner_text('.uz-pane >> nth=1'))
        # curses tab
        pg.click('.uz-tabs button >> nth=2'); pg.wait_for_timeout(400)
        hp0 = pg.inner_text('.hpt')
        pg.locator('[data-a=curse]').first.click(); pg.wait_for_timeout(900)
        check('a curse costs health, not coins', pg.inner_text('.hpt') != hp0)
        c2 = int(pg.inner_text('.uz-coins b')); pg.locator('[data-a=bless]').first.click(); pg.wait_for_timeout(900)
        check('a blessing pays and fills a pip', int(pg.inner_text('.uz-coins b')) > c2 and '1 / 8' in pg.inner_text('.uz-pane >> nth=2'))
        check('one blessing is x2 today', pg.locator('.uz-x2').count() == 1)
        if shots: pg.screenshot(path=os.path.join(SP, 's4.png'))
        # den
        pg.click('.uz-tabs button >> nth=3'); pg.wait_for_timeout(1500)
        check('the Den shows the real room and the slot list', pg.locator('.uz-scene img').count() > 5 and 'LEFT WALL' in pg.inner_text('.uz-pane >> nth=3').upper())
        if shots: pg.screenshot(path=os.path.join(SP, 's5.png'))
        pg.click('.uz-dock [data-v=shop]'); pg.wait_for_timeout(600)
        check('the shop has the 120 real items in categories', pg.locator('.uz-pane >> nth=3').locator('.uz-card').count() >= 10)
        pg.click('.uz-dock [data-v=ward]'); pg.wait_for_timeout(300)
        c3 = int(pg.inner_text('.uz-coins b')); pg.locator('[data-a=wear][data-id="hat-2"]').click(); pg.wait_for_timeout(900)
        check('buying an outfit (90) dresses Ulhu', int(pg.inner_text('.uz-coins b')) == c3 - 90 and pg.locator('.uz-me img').count() >= 2)
        if shots: pg.screenshot(path=os.path.join(SP, 's6.png'))
        pg.click('.uz-dock [data-v=hoard]'); pg.wait_for_timeout(300)
        c4 = int(pg.inner_text('.uz-coins b')); pg.locator('[data-a=claim]').nth(1).click(); pg.wait_for_timeout(900)
        check('claiming a Hoard reward costs its price and stamps CLAIMED', int(pg.inner_text('.uz-coins b')) == c4 - 80)
        pg.click('.uz-dock [data-v=chron]'); pg.wait_for_timeout(900)
        check('the Chronicle: weeks, calendar, trophies', 'Doubloons per week' in pg.inner_text('.uz-pane >> nth=3') and 'Streak calendar' in pg.inner_text('.uz-pane >> nth=3'))
        if shots: pg.screenshot(path=os.path.join(SP, 's7.png'))
        h = pg.evaluate("document.querySelector('.uz').getBoundingClientRect().height")
        check('fills the screen between the header and the bottom bar', 780 > h > 600)
        check('no page errors', not errs)
        if errs: print(errs[:3])
        b.close()
finally:
    srv.kill()
print(sum(res), '/', len(res))
