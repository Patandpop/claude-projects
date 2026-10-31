"""The installed app's shell (app/src/index.html, app.js, sw.js, manifest) in headless Chromium, served from a fresh
build over a local web address (service workers need a real address), against a fake planner server. No real data.
The server answers like Cloudflare Pages (/index.html and /x.html redirect to / and /x). Checks: the manifest and icons are installable; first open asks to set up; a bad address or key is refused with a plain
message and the old settings kept; a good one connects and the key never appears in a link; it opens again with no
signal from the device's own copy; the service worker never keeps the planner's server or the school test; theme;
waiting and stuck taps with Try again and Forget; Forget the key; a newer build offers "Update now".
Run:  python app/tests/shell_sim.py   (needs playwright + chromium)."""
import os, sys, json, subprocess, tempfile, threading, functools, http.server
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist = os.path.join(tempfile.mkdtemp(), 'dist')
subprocess.run(['node', os.path.join(APP, 'build.js'), dist], check=True, capture_output=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map, **{'.webmanifest': 'application/manifest+json', '.js': 'text/javascript'})
    def log_message(self, *a): pass
    def end_headers(self): self.send_header('Cache-Control', 'no-cache'); super().end_headers()
    # like Cloudflare Pages' tidy addresses: /x.html and /index.html answer 308 to /x and /, and /x serves x.html
    def send_head(self):
        path = self.path.split('?')[0]
        if path.endswith('.html'):
            self.send_response(308); self.send_header('Location', path[:-len('index.html')] if path.endswith('index.html') else path[:-5]); self.end_headers(); return None
        if not os.path.splitext(path)[1] and not path.endswith('/') and os.path.isfile(os.path.join(dist, path.lstrip('/') + '.html')):
            self.path = path + '.html'
        return super().send_head()
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=dist))
srv.handle_error = lambda *a: None   # the browser hanging up early is not a failure
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d/' % srv.server_address[1]
GOOD = 'https://script.google.com/macros/s/AKfyFAKE_good-1/exec'
BAD = 'https://script.google.com/macros/s/AKfyFAKE_nothere/exec'

res = []
def check(n, c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844})
    seen = []
    def server(route, req):
        seen.append({'url': req.url, 'body': req.post_data or ''})
        cors = {'Access-Control-Allow-Origin': '*'}
        if BAD.split('/s/')[1].split('/')[0] in req.url: return route.fulfill(status=404, headers=cors, body='Not found')
        body = json.loads(req.post_data or '{}')
        if body.get('key') != 'good-key-123': return route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps({'ok': False, 'error': 'Locked'}))
        if body.get('fn') == 'saveVote': return route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps({'ok': False, 'error': 'That lesson has gone'}))
        route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps({'ok': True, 'result': {'mode': 'teaching'}}))
    ctx.route('https://script.google.com/**', server)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(300)

    # ---- installable
    man = json.loads(open(os.path.join(dist, 'manifest.webmanifest'), encoding='utf-8').read())
    check('the page links its manifest and icons', pg.evaluate("!!document.querySelector('link[rel=manifest]') && !!document.querySelector('link[rel=apple-touch-icon]')"))
    sizes = pg.evaluate("""Promise.all(%s.map(i => new Promise(ok => { const im = new Image(); im.onload = () => ok(im.naturalWidth); im.onerror = () => ok(0); im.src = i.src; })))""" % json.dumps(man['icons']))
    check('the manifest: standalone, navy, 192 and 512 icons that load (%s)' % sizes, man['display'] == 'standalone' and man['theme_color'] == '#0D1B5E' and sizes == [192, 512, 512] and any(i['purpose'] == 'maskable' for i in man['icons']))
    pg.wait_for_function('navigator.serviceWorker && navigator.serviceWorker.ready.then(() => true)')
    pg.reload(); pg.wait_for_function('!!navigator.serviceWorker.controller', timeout=10000)
    check('the service worker takes charge of the page', pg.evaluate('!!navigator.serviceWorker.controller'))

    # ---- set up
    check('first open asks to set up this device, with no Cancel', pg.is_visible('#setup') and pg.is_hidden('#home') and pg.is_hidden('#cancel'))
    pg.fill('#url', 'https://example.com/x'); pg.fill('#key', 'good-key-123'); pg.click('#save')
    check('a wrong-looking address is refused in plain words', 'should look like' in pg.inner_text('#setupMsg') and pg.evaluate("localStorage.getItem('app.key')") is None)
    pg.fill('#url', GOOD); pg.fill('#key', 'wrong-key-99'); pg.click('#save'); pg.wait_for_function("!document.getElementById('save').disabled")
    check('a key the planner refuses says so, and nothing is kept', 'did not accept' in pg.inner_text('#setupMsg') and pg.evaluate("localStorage.getItem('app.key')") is None and pg.is_visible('#setup'))
    pg.fill('#url', BAD); pg.fill('#key', 'good-key-123'); pg.click('#save'); pg.wait_for_timeout(1800)
    check('an address with no planner behind it says "Could not reach"', 'Could not reach' in pg.inner_text('#setupMsg') and pg.evaluate("localStorage.getItem('app.serverUrl')") is None)
    pg.fill('#url', GOOD); pg.fill('#key', 'good-key-123'); pg.click('#save'); pg.wait_for_selector('#home:not(.hidden)')
    check('the right address and key connect, and the home and Settings show', 'Connected' in pg.inner_text('#homeMsg') and pg.is_hidden('#setup'))
    check('the key is never in a link or on screen, and the key box is emptied', all('good-key-123' not in s['url'] for s in seen) and 'good-key-123' not in pg.inner_text('body') and pg.input_value('#key') == '')
    good = [json.loads(s['body'])['fn'] for s in seen if 'good-key-123' in s['body']]
    check('it was tested with one harmless read (getMode), sent as plain text; the only other call reads the notifications state', good[0] == 'getMode' and set(good) <= {'getMode', 'pushStatus'})

    # ---- no signal: opens from the device's own copy (after a mock-up page was opened, which must not replace it)
    pg.goto(BASE + 'mockups/')
    ctx.set_offline(True); pg.goto(BASE); pg.wait_for_timeout(500)
    check('with no signal it still opens, says "No signal", and stays set up', pg.is_visible('#home') and pg.inner_text('#net') == 'No signal')
    ctx.set_offline(False); pg.reload(); pg.wait_for_timeout(300)
    kept = pg.evaluate("caches.keys().then(ks => Promise.all(ks.map(k => caches.open(k).then(c => c.keys()).then(r => r.map(x => x.url))))).then(a => a.flat())")
    check('it keeps only its own files: never the planner server, never the school test (%d kept)' % len(kept),
          kept and all(u.startswith(BASE) for u in kept) and not any('/test/' in u for u in kept))

    # ---- theme
    pg.click('#theme [data-t=dark]')
    check('Dark: deep background, gold headings, kept for next time', pg.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(14, 20, 36)' and
          pg.evaluate("getComputedStyle(document.querySelector('h2')).color") == 'rgb(250, 187, 46)' and pg.evaluate("localStorage.getItem('app.theme')") == 'dark')
    pg.click('#theme [data-t=light]')
    check('Light: pale background, navy headings', pg.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(237, 242, 250)')

    # ---- waiting taps
    pg.evaluate("Outbox.add('saveVote', ['$id'], 'An ABCD vote')")
    for _ in range(3): pg.evaluate('Outbox.flush()'); pg.wait_for_timeout(300)
    check('a tap the planner keeps refusing is listed with its reason, with Try again and Forget', 'An ABCD vote (That lesson has gone)' in pg.inner_text('#outbox') and pg.is_visible('#retry'))
    pg.click('#forget'); pg.wait_for_timeout(100)
    check('Forget clears it and the box goes', pg.is_hidden('#outbox'))

    # ---- this PC's evening timer, against a fake ActivityWatch on this PC
    import datetime
    t0 = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=12)
    AW = {'aw-watcher-window_PC': {}, 'aw-watcher-afk_PC': {}}
    WIN = [{'timestamp': t0.isoformat(), 'duration': 600, 'data': {'app': 'POWERPNT.EXE', 'title': 'Latent Heat 9AS.pptx - PowerPoint'}}]
    awseen = []
    def aw(route, req):
        awseen.append(req.url); h = {'Access-Control-Allow-Origin': '*'}
        body = AW if req.url.endswith('/buckets/') else (WIN if 'window' in req.url else [])
        route.fulfill(status=200, headers=h, content_type='application/json', body=json.dumps(body))
    ctx.route('http://localhost:5600/**', aw)
    check('the PC timer is off until switched on, and asks nothing of ActivityWatch', pg.evaluate("document.querySelector('#pcOn [data-v=off]').getAttribute('aria-pressed')") == 'true' and not awseen)
    n = len(seen); pg.click('#pcOn [data-v=on]'); pg.wait_for_timeout(1200)
    logs = [json.loads(x['body']) for x in seen[n:] if x['body'] and json.loads(x['body']).get('fn') == 'timerLog']
    check('switched on: it reads ActivityWatch on this PC and says what it is counting (%s)' % pg.inner_text('#pcMsg'), awseen and 'Counting' in pg.inner_text('#pcMsg') and 'Building lessons 9AS' in pg.inner_text('#pcMsg'))
    check('it sends 10 minutes of Building lessons 9AS, and no window name', logs and logs[0]['args'][0][0]['job'] == 'Building lessons' and logs[0]['args'][0][0]['cls'] == '9AS' and logs[0]['args'][0][0]['minutes'] == 10 and 'Latent' not in json.dumps(logs))
    check('Little Ulhu pops up to say what he is counting', pg.locator('.dp').count() == 1 and 'Building lessons 9AS' in pg.inner_text('.dp'))
    if datetime.datetime.now().hour < 19:
        pg.click('.dp [data-dp=not]'); pg.click('#pcOn [data-v=off]'); pg.wait_for_timeout(100)
        check('"Not that" closes it; Off stops the counting', pg.locator('.dp').count() == 0 and 'Off' in pg.inner_text('#pcMsg'))
    else:   # after 7pm: the night pop-up (N3), dozing, with only a close cross
        check('after 7pm it is the night pop-up, with no "Not that" button', pg.get_attribute('.dp', 'data-variant') == 'night' and pg.locator('.dp [data-dp=not]').count() == 0)
        pg.click('#pcOn [data-v=off]'); pg.wait_for_timeout(100)
        check('Off stops the counting', 'Off' in pg.inner_text('#pcMsg'))

    # ---- forget the key
    pg.once('dialog', lambda d: d.accept()); pg.click('#forgetKey')
    check('Forget the key: gone from the device, back to set up, the address kept', pg.is_visible('#setup') and pg.evaluate("localStorage.getItem('app.key')") is None and pg.input_value('#url') == GOOD)

    # ---- a newer build
    sw = os.path.join(dist, 'sw.js'); open(sw, 'a', encoding='utf-8').write('\n// newer build\n')
    pg.evaluate("navigator.serviceWorker.getRegistration().then(r => r.update())"); pg.wait_for_selector('#update:not(.hidden)', timeout=10000)
    check('a newer build shows "A newer version is ready"', pg.is_visible('#updateNow'))
    with pg.expect_navigation(timeout=10000): pg.click('#updateNow')
    pg.wait_for_timeout(300)
    check('"Update now" switches to it and reloads once', pg.is_hidden('#update') and pg.evaluate('!!navigator.serviceWorker.controller'))

    check('no page errors', not errs)
    if errs: print(errs)
    b.close()
srv.shutdown()
failed = res.count(False)
print(f'\n{failed} FAILED' if failed else '\nAll passed'); sys.exit(1 if failed else 0)
