"""Homework ahead on the Homework tab (item 4.13, layout B2 made warmer, 30 Oct 2026). Runs the real Planner.html
through make-preview.js (the fake server with planner-data.json) in headless Chromium, with the clock on Friday
13 Nov 2026, and checks:
  - the section is first on the tab and open on a Friday; three weeks as a path, next week lit;
  - the cards match the planner's own list (logic.js homeworkAhead); each card has its class chip, due day and lesson;
  - a tick leaves a card out and the button count drops; it is remembered on this computer;
  - "Ask Claude to prepare these" sends ONE request home of kind homework naming each ticked lesson, nothing else;
    the cards then show "asked" and the button has nothing left to send;
  - a revision reminder's "Set it" fills in "Set new homework" as revision (never a draft by itself);
  - light mode keeps the colours readable; no em dashes; no page errors.
Saves homework_ahead_dark.png and homework_ahead_light.png in the temp folder for a look.
Run:  python planner/tests/homework_ahead_sim.py   (needs playwright + chromium). Made-up data only, no names."""
import os, subprocess, sys, tempfile, datetime
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if not os.path.exists(os.path.join(ROOT, 'planner-data.json')):
    print('SKIP planner-data.json is not exported on this PC')
    sys.exit(0)
OUT = 'preview-hwasim.html'   # planner/preview*.html is ignored by git
subprocess.run(['node', os.path.join(ROOT, 'make-preview.js'), '--out', OUT, '--monday', '2026-11-09'], check=True, cwd=ROOT, capture_output=True)
path = os.path.join(ROOT, OUT)
results = []
def check(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1280, 'height': 1000})
    page.clock.set_fixed_time(datetime.datetime(2026, 11, 13, 16, 0, 0))
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('file:///' + path.replace('\\', '/')); page.wait_for_function('typeof render === "function" && S.week && S.week.monday === "2026-11-09"')
    page.evaluate("() => { localStorage.removeItem('hwa.off'); localStorage.removeItem('hwa.asked'); S.view = 'homework'; render(); }"); page.wait_for_timeout(500)
    check('the section is first on the Homework tab', page.evaluate("document.querySelector('#grid details.hwsec').id") == 'hwAheadSec')
    check('open on a Friday', page.evaluate("document.getElementById('hwAheadSec').open"))
    check('three weeks as a path, next week lit', page.locator('#hwAhead .wk').count() == 3 and page.locator('#hwAhead .wk.now').count() == 1 and 'Next week' in page.inner_text('#hwAhead .wk.now'))
    want = page.evaluate("""() => { const A = P.homeworkAhead(S.data, hwaWeeks(), S.hwStat || S.hw || [], S.hwList || [], todayMidnight());
      return A.items.filter((x) => x.week <= 1 && !(x.week === 0 && x.past && !x.made)).filter((x) => !x.made).map((x) => x.cls); }""")
    cards = page.locator('#hwAhead .card:not(.ready) .chip').all_inner_texts()
    check('the cards match the planner\'s own list: ' + ', '.join(cards), len(cards) >= 1 and cards == want)
    first = page.inner_text('#hwAhead .card:not(.ready) .t small')
    check('a card says what, when due, and which lesson: ' + first, 'due ' in first and ' P' in first)
    ticks = page.locator('#hwAhead [data-hwtick]')
    n0 = ticks.count()
    btn = lambda: page.inner_text('#hwaGo')
    check('the button counts the ticked cards: ' + btn(), ('(%d)' % n0) in btn())
    ticks.first.click(); page.wait_for_timeout(150)
    check('a tick leaves a card out and the count drops', ('(%d)' % (n0 - 1)) in btn() and page.evaluate("Object.keys(JSON.parse(localStorage.getItem('hwa.off') || '{}')).length") == 1)
    page.screenshot(path=os.path.join(tempfile.gettempdir(), 'homework_ahead_dark.png'), full_page=True)
    page.click('#hwaGo'); page.wait_for_timeout(400)
    req = page.evaluate('window.__REQ')
    check('one request home, kind homework, naming each ticked lesson and nothing posted', req and req['kind'] == 'homework' and req['text'].count('\n- ') == n0 - 1 and 'post nothing' in req['text'])
    check('the request has no em dashes', req and '—' not in req['text'])
    check('the asked cards say so and the button has nothing left', page.locator('#hwAhead .kind.ok', has_text='asked').count() == n0 - 1 and '(0)' in btn())
    has_rev = page.locator('[data-hwrev]').count()
    if has_rev:
        page.locator('[data-hwrev]').first.click(); page.wait_for_timeout(300)
        check('a revision reminder fills in "Set new homework" as revision', page.evaluate('S.hwF.kind') == 'revise' and page.evaluate("document.getElementById('hwSet').open"))
    else:
        print('(no test two weeks away in this data: the reminder button is checked in test-logic.js)')
    page.evaluate("() => { document.body.classList.add('light'); render(); }"); page.wait_for_timeout(300)
    bg = page.evaluate("getComputedStyle(document.querySelector('#hwAhead .wk')).backgroundColor")
    check('light mode: the week boxes turn light ' + bg, bg == 'rgb(255, 255, 255)')
    page.screenshot(path=os.path.join(tempfile.gettempdir(), 'homework_ahead_light.png'), full_page=True)
    check('no em dashes in the section', '—' not in page.inner_text('#hwAheadSec'))
    check('no page errors' + (': ' + errors[0] if errors else ''), not errors)
    b.close()
print('All passed' if all(results) else 'SOME FAILED')
sys.exit(0 if all(results) else 1)
