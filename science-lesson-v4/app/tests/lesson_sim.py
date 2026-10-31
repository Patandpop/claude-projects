"""The Lesson screen in the installed app (installed app step 6): the planner's phone page, put together by app/build.js
from the same parts as the paste files, served like Cloudflare (tidy addresses), in headless Chromium against a fake
planner. Checks: no Apps Script tag or key is left in the page; "Open the planner" opens it; it loads the class through
the app (a POST with the key kept on this device, never in the page or a link); a positive reaches the planner; the
Day and Ulhu tabs are there; it opens again with no signal from the device's own copy; "App settings" goes back.
Made-up pupils only.  Run:  python app/tests/lesson_sim.py   (needs playwright + chromium)."""
import os, sys, json, time, subprocess, tempfile, threading, functools, http.server
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist = os.path.join(tempfile.mkdtemp(), 'dist')
subprocess.run(['node', os.path.join(APP, 'build.js'), dist], check=True, capture_output=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map, **{'.webmanifest': 'application/manifest+json', '.js': 'text/javascript'})
    def log_message(self, *a): pass
    def end_headers(self): self.send_header('Cache-Control', 'no-cache'); super().end_headers()
    def send_head(self):   # like Cloudflare Pages: /x.html answers 308 to /x, and /x serves x.html
        path = self.path.split('?')[0]
        if path.endswith('.html'):
            self.send_response(308); self.send_header('Location', path[:-len('index.html')] if path.endswith('index.html') else path[:-5]); self.end_headers(); return None
        if not os.path.splitext(path)[1] and not path.endswith('/') and os.path.isfile(os.path.join(dist, path.lstrip('/') + '.html')):
            self.path = path + '.html'
        return super().send_head()
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=dist))
srv.handle_error = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d/' % srv.server_address[1]
URL = 'https://script.google.com/macros/s/AKfyFAKE_good-1/exec'
STU = [{'name': n + ' Test', 'short': n + ' T.', 'x': 10 + i * 15, 'y': 20, 'support': ''} for i, n in enumerate(['Alex', 'Ben', 'Cara'])]
H = {'init': {'classes': ['10C2', '9AS'], 'today': ['10C2'], 'week': 'B', 'active': '10C2', 'rules': {'2': 'Work ethic'}, 'mode': {'mode': 'teaching', 'now': 0}, 'version': 18},
     'openClass': {'students': STU, 'ratio': 2.4, 'events': [], 'silence': None}, 'getMode': {'mode': 'teaching', 'now': 0}, 'positivesOver': [], 'getSilence': None}

lesson = open(os.path.join(dist, 'lesson.html'), encoding='utf-8').read()
res = []
def check(n, c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + 'lesson sim: ' + n)
check('the built Lesson page has no Apps Script tags and no key', '<?' not in lesson and 'data-key=""' in lesson and 'api.js' in lesson)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844})
    seen = []
    def server(route, req):
        body = json.loads(req.post_data or '{}'); seen.append(body)
        cors = {'Access-Control-Allow-Origin': '*'}
        if body.get('key') != 'good-key-123': return route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps({'ok': False, 'error': 'Locked'}))
        r = H.get(body.get('fn'))
        if body.get('fn') in ('logEvent', 'logMany'): r = {'ok': True, 'ids': ['e1']}
        if callable(r): r = r()
        route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps({'ok': True, 'result': r}))
    ctx.route('https://script.google.com/**', server)
    ctx.route('**/*fonts*', lambda r: r.abort())
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(300)
    pg.fill('#url', URL); pg.fill('#key', 'good-key-123'); pg.click('#save'); pg.wait_for_selector('#home:not(.hidden)')
    pg.click('#openLesson'); pg.wait_for_function('typeof S !== "undefined" && S.students && S.students.length === 3', timeout=20000)
    fns = [s.get('fn') for s in seen]
    check('Open the planner opens the Lesson page, and its class comes through the app', pg.url.rstrip('/').endswith('/lesson') and 'init' in fns and 'openClass' in fns)
    check('every call carries the key kept on this device, never in a link', all(s.get('key') == 'good-key-123' for s in seen if s.get('fn') in ('init', 'openClass')) and 'good-key-123' not in pg.url)
    nav = pg.eval_on_selector_all('nav button', 'b => b.map(x => x.textContent.trim())')
    check('the phone page\'s tabs are all there: %s' % nav, 'Lesson' in nav and 'Day' in nav and any('Ulhu' in x for x in nav))
    n0 = len(seen)
    pg.click('.tile >> nth=0'); pg.wait_for_timeout(1500)
    check('a tap on a pupil reaches the planner through the app', any(s.get('fn') in ('logEvent', 'logMany') for s in seen[n0:]))
    pg.wait_for_timeout(500)
    ctx.set_offline(True)
    pg.reload(); pg.wait_for_timeout(1500)
    check('with no signal the Lesson page opens again from the device\'s own copy', 'App settings' in pg.inner_text('body') and pg.locator('nav button').count() > 0)
    ctx.set_offline(False)
    pg.click('#appBack'); pg.wait_for_selector('#home:not(.hidden)')
    check('"App settings" goes back to the app', pg.url.rstrip('/') == BASE.rstrip('/'))
    check('no page errors' + (': ' + errs[0][:120] if errs else ''), not errs)
    b.close()
srv.shutdown()
print('lesson sim: all passed' if all(res) else 'lesson sim: %d FAILED' % res.count(False))
sys.exit(0 if all(res) else 1)
