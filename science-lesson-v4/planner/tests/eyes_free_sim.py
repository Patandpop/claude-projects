"""Eyes-free mock-up in a browser (lanes/mockups/eyes-free.html): draws letters with synthetic pointer events and
checks a pupil is picked, one tap logs a positive, two taps a negative, a hold clears, and Teach keeps letters.
Run:  python planner/tests/eyes_free_sim.py        (needs: pip install playwright && playwright install chromium)
Made-up names only."""
import os, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PAGE = 'file:///' + os.path.join(ROOT, 'lanes', 'mockups', 'eyes-free.html').replace('\\', '/')
fails = 0
def check(name, cond):
    global fails
    print(('PASS ' if cond else 'FAIL ') + name)
    if not cond: fails += 1

def stroke(page, pts, ox=120, oy=260, s=140):
    page.mouse.move(ox + pts[0][0] * s, oy + pts[0][1] * s); page.mouse.down()
    for i in range(1, len(pts)):
        (px, py), (x, y) = pts[i - 1], pts[i]
        for k in range(1, 7):
            page.mouse.move(ox + (px + (x - px) * k / 6) * s, oy + (py + (y - py) * k / 6) * s)
    page.mouse.up()

def letter(page, strokes, **kw):
    for st in strokes: stroke(page, st, **kw); page.wait_for_timeout(60)
    page.wait_for_timeout(600)   # the stroke gap passes, the letter is read

def tap(page, n=1):
    for _ in range(n):
        page.mouse.move(200, 500); page.mouse.down(); page.wait_for_timeout(40); page.mouse.up(); page.wait_for_timeout(120)

K = [[(0, 0), (0, 1)], [(1, 0), (0, 0.55)], [(0.25, 0.42), (1, 1)]]
Z = [[(0, 0), (1, 0), (0, 1), (1, 1)]]
J = [[(0.65, 0), (0.65, 0.7), (0.5, 0.95), (0.2, 0.9), (0.05, 0.7)]]
N = [[(0, 1), (0, 0), (1, 1), (1, 0)]]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 412, 'height': 900})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(PAGE); pg.wait_for_timeout(300)
    check('the page opens with the real code loaded', pg.evaluate('!!window.EyesFree') and pg.locator('#hint').is_visible())

    letter(pg, K)
    check('drawing K picks the one K pupil', 'Kit' in pg.locator('#bigName').inner_text() and pg.locator('#phase').inner_text() == 'picked')
    tap(pg, 1); pg.wait_for_timeout(700); sub = pg.locator('#bigSub').inner_text()
    check('one tap logs a positive', 'positive logged' in sub)

    letter(pg, Z); tap(pg, 2); pg.wait_for_timeout(700); sub = pg.locator('#bigSub').inner_text()   # read once: the screen clears itself 1.2 s after a log
    check('two taps log a negative', 'negative logged' in sub)

    letter(pg, J)
    check('J fits three pupils: it asks for the surname initial, no names shown (pick A)', '3 pupils' in pg.locator('#bigName').inner_text() and not pg.locator('#list').is_visible())
    letter(pg, N)
    check('J then N leaves two: the short list shows', pg.locator('#list button').count() == 2)
    pg.locator('#list button').first.click(); pg.wait_for_timeout(100)
    check('tapping a name picks them', pg.locator('#phase').inner_text() == 'picked')
    pg.mouse.move(200, 500); pg.mouse.down(); pg.wait_for_timeout(900); pg.mouse.up(); pg.wait_for_timeout(200)
    check('a hold clears the pick', pg.locator('#phase').inner_text() == 'idle')

    pg.click('#bTeach'); pg.wait_for_timeout(200)
    check('Teach asks for the first letter of the class', pg.locator('#bigSub').inner_text().startswith('draw it'))
    letter(pg, [[(0, 1), (0.5, 0), (1, 1)], [(0.2, 0.62), (0.8, 0.62)]])
    check('a taught letter is kept on the phone', pg.evaluate("JSON.parse(localStorage.getItem('ef.own')||'[]').length") == 1)

    pg.click('#bTry'); pg.wait_for_timeout(200)
    check('Try names a pupil and says which letter to draw', 'draw ' in pg.locator('#bigSub').inner_text())
    pg.click('#bPicks'); pg.wait_for_timeout(200)
    check('the Picks panel lists the lettered options', pg.locator('#panel .opt').count() >= 7)
    pg.click('#theme'); pg.wait_for_timeout(100)
    check('light and dark both work', pg.evaluate("document.documentElement.dataset.theme") == 'light')
    check('no page errors', not errors)
    if errors: print(errors)
    b.close()

print('\nAll eyes-free browser checks passed' if not fails else f'\n{fails} FAILED')
sys.exit(1 if fails else 0)
