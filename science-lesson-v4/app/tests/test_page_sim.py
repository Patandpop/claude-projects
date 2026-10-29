"""The school test page (lanes/design-installed-app.md 3.12) in headless Chromium, against a fake mailbox.
Serves a fresh build of the app over a local web address, so the page runs as it will on the real site, and checks:
  - the mailbox answering both shapes gives "Works";
  - a wrong key gives the key message; a blocked network gives "Blocked";
  - the POST is sent as plain text (the shape Apps Script accepts from another site) and never asks the mailbox to write;
  - the key is never remembered; the read-back text has the three numbered results.
Run:  python app/tests/test_page_sim.py   (needs playwright + chromium, like the planner sims). No real data."""
import os, sys, json, subprocess, tempfile, threading, functools, http.server
from playwright.sync_api import sync_playwright

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist = os.path.join(tempfile.mkdtemp(), 'dist')
subprocess.run(['node', os.path.join(APP, 'build.js'), dist], check=True, capture_output=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=dist))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d/' % srv.server_address[1]
MAILBOX = 'https://script.google.com/macros/s/FAKE/exec'

results = []
def check(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 800})
    errs = []; seen = []
    state = {'mode': 'ok'}
    def mailbox(route, req):
        seen.append({'method': req.method, 'url': req.url, 'body': req.post_data, 'type': req.headers.get('content-type', '')})
        if state['mode'] == 'blocked': return route.abort()
        cors = {'Access-Control-Allow-Origin': '*'}
        if 'key=WRONG' in req.url or (req.post_data and '"WRONG"' in req.post_data):
            return route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps({'ok': False, 'error': 'Locked'}))
        body = {'ok': True} if req.method == 'GET' else {'ok': False, 'error': 'Unknown request'}
        route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps(body))
    ctx.route('https://script.google.com/**', mailbox)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + 'test/'); pg.wait_for_timeout(300)

    check('sign-in check: passes because the page opened, and says sign-in is not on yet', 'Passed' in pg.inner_text('#r1') and 'not switched on' in pg.inner_text('#r1note'))
    pg.click('#go'); pg.wait_for_timeout(200)
    check('no address typed: asks for the address and key', 'Paste the mailbox address' in pg.inner_text('#r2'))

    pg.fill('#url', MAILBOX); pg.fill('#key', 'GOODKEY'); pg.click('#go')
    pg.wait_for_function("document.getElementById('r2').textContent !== 'Checking...'")
    check('mailbox answers both shapes: "Works"', pg.inner_text('#r2').startswith('Works'))
    post = [s for s in seen if s['method'] == 'POST']
    check('the POST is plain text, never JSON (Apps Script refuses JSON from another site)', post and post[0]['type'].startswith('text/plain'))
    check('the POST never asks the mailbox to write or request anything', post and json.loads(post[0]['body'])['op'] not in ('write', 'request', 'mkdir'))
    check('the GET is the ping', any(s['method'] == 'GET' and 'op=ping' in s['url'] for s in seen))
    rb = pg.inner_text('#readback')
    check('the read-back text has the three numbered results', all(('%d. ' % i) in rb for i in (1, 2, 3)) and 'Works' in rb)
    check('the key is not kept in the browser', 'GOODKEY' not in json.dumps(pg.evaluate("Object.assign({}, localStorage)")))

    pg.fill('#key', 'WRONG'); pg.click('#go')
    pg.wait_for_function("document.getElementById('r2').textContent !== 'Checking...'")
    check('wrong key: says the key was not accepted', 'key was not accepted' in pg.inner_text('#r2'))

    state['mode'] = 'blocked'; pg.fill('#key', 'GOODKEY'); pg.click('#go')
    pg.wait_for_function("document.getElementById('r2').textContent !== 'Checking...'")
    check('network blocked: says "Blocked"', pg.inner_text('#r2').startswith('Blocked'))

    pg2 = ctx.new_page(); pg2.goto(BASE + 'test/'); pg2.wait_for_timeout(200)
    check('reopening keeps the address but not the key', pg2.input_value('#url') == MAILBOX and pg2.input_value('#key') == '')
    check('no page errors', not errs)
    if errs: print(errs)
    b.close()
srv.shutdown()
failed = results.count(False)
print(f'\n{failed} FAILED' if failed else '\nAll passed'); sys.exit(1 if failed else 0)
