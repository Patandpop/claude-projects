"""Lane D: the companion's waiting, error and odd-finds states in the real game page (headless Chromium, phone size).
Run: python tests/companion_states.py [--shots DIR]. Builds the page and server like companion_sim.py, then bends
the replies in the browser: a slow then failing cabinet, a first load with no tags yet, a cabinet with odd finds."""
import os, sys, json, subprocess, tempfile, socket
from playwright.sync_api import sync_playwright
P = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
SP = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else tempfile.mkdtemp()
src = open(P + 'tests/companion_sim.py', encoding='utf-8').read()
GAME = eval(src.split('GAME = ', 1)[1].split('\n', 1)[0])
js = ''.join(open(P + f, encoding='utf-8').read() + '\n' for f in GAME if os.path.exists(P + f))
page = '''<!doctype html><meta charset="utf-8"><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0;background:#0d1b3a">
<div style="height:60px;background:#0a1020;color:#fff">header</div><div id=u></div>
<script>window.CALLS=[];function call(fn,...args){CALLS.push(fn);return fetch('/c',{method:'POST',body:JSON.stringify({fn,args})}).then(r=>r.json()).then(x=>{if(x.err)throw new Error(x.err);return x.ok;});}</script>
<script>''' + js + '''</script><script>GameUI.mount(document.getElementById('u'),call,{wide:false});</script>'''
f = os.path.join(SP, 'states.html'); open(f, 'w', encoding='utf-8').write(page)
res = []
def check(n, c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n)
s = socket.socket(); s.bind(('127.0.0.1', 0)); port = str(s.getsockname()[1]); s.close()
srv = subprocess.Popen(['node', os.path.join(P, 'tests', 'companion_server.js'), port, f, 'home'], stdout=subprocess.PIPE, text=True)
srv.stdout.readline()
ODD = [{'fid': 'small:0', 'kind': 'object', 'name': 'A bent spoon', 'text': 'It was bent before he found it. He says.', 'found': '2026-10-28', 'grey': True},
       {'fid': 'interlude:1', 'kind': 'lore', 'name': '', 'text': 'Someone counted the tides here, and stopped at nine.', 'found': '2026-10-24', 'grey': False}]
state = {'cab': 0, 'tagless': True}
def bend(route):
    req = route.request
    if req.method != 'POST': return route.continue_()
    fn = json.loads(req.post_data or '{}').get('fn')
    r = route.fetch(); body = r.json()
    if fn == 'gameCabinets':
        state['cab'] += 1
        if state['cab'] == 1: return route.fulfill(response=r, body=json.dumps({'err': 'the deep is not answering'}))
        if body.get('ok'): body['ok']['odd'] = ODD
    if fn == 'gameLoad' and state['tagless'] and body.get('ok') and body['ok'].get('comp'):
        body['ok']['comp']['tags'] = []
    return route.fulfill(response=r, body=json.dumps(body))
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/c', bend)
        pg.goto('http://localhost:' + port + '/', timeout=90000); pg.wait_for_timeout(3000)
        # 1. tags not here yet: hold the moon
        box = pg.locator('.uz-moonb').bounding_box(); pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2); pg.mouse.down(); pg.wait_for_timeout(900); pg.mouse.up(); pg.wait_for_timeout(300)
        check('tags not here yet: the sheet says they are on their way', 'on their way' in (pg.locator('.uzc-tags').inner_text() if pg.locator('.uzc-tags').count() else ''))
        pg.screenshot(path=os.path.join(SP, 'tags-waiting.png'))
        pg.locator('.uzc-tags [data-c=tagsx]').click(); pg.wait_for_timeout(300)
        check('tags not here yet: the close button shuts it', pg.locator('.uzc-tags').count() == 0 or not pg.locator('.uzc-tags').is_visible())
        # 2. the cabinets: loading, then an error with Try again, then open with the odd shelf
        # slow the first cabinet reply by 2.5 s in the page itself, so the loading message stays long enough to see
        pg.evaluate("(() => { const f = window.fetch; let n = 0; window.fetch = (u, o) => (o && o.body && o.body.includes('gameCabinets') && !n++) ? new Promise((r) => setTimeout(r, 2500)).then(() => f(u, o)) : f(u, o); })()")
        pg.locator('[data-c=cab]').click(); pg.wait_for_timeout(600)
        check('cabinets: a loading message while they open', 'Opening the cabinets' in pg.locator('body').inner_text())
        pg.screenshot(path=os.path.join(SP, 'cab-loading.png'))
        pg.wait_for_timeout(5000)
        check('cabinets: a failed open says so with a Try again button', pg.locator('.uzc-retry').count() == 1 and 'would not open' in pg.locator('body').inner_text())
        pg.screenshot(path=os.path.join(SP, 'cab-error.png'))
        pg.locator('.uzc-retry').click(); pg.wait_for_timeout(6000)
        check('cabinets: Try again opens them', pg.locator('.uzc-mini').count() == 7)
        check('cabinets: the odd little things shelf shows both finds', pg.locator('.uzc-odd button').count() == 2)
        pg.locator('.uzc-odd').scroll_into_view_if_needed(); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SP, 'cab-odd.png'))
        pg.locator('.uzc-odd button').first.click(); pg.wait_for_timeout(400)
        check('cabinets: tapping an odd find shows its note', 'bent before he found it' in pg.locator('.uzc-oddn').inner_text())
        pg.locator('.uzc-oddn').scroll_into_view_if_needed(); pg.screenshot(path=os.path.join(SP, 'cab-odd-note.png'))
        pg.locator('.uzc-odd button').nth(1).click(); pg.wait_for_timeout(400)
        check('cabinets: a lore find with no name still reads', 'counted the tides' in pg.locator('.uzc-oddn').inner_text())
        check('no page errors ' + '; '.join(errs)[:300], not errs)
        b.close()
finally:
    srv.kill()
print('shots in', SP)
print('All companion state checks passed' if all(res) else 'SOME CHECKS FAILED'); sys.exit(0 if all(res) else 1)
