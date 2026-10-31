"""Notifications in the installed app (app/src/push.js, app.js, sw.js), in headless Chromium against a fake planner.
The browser's own push service is replaced by a stand-in (a headless browser has none), so this checks the app's side:
the Notifications card says what the planner allows, On saves this device with the ticked kinds, a tick change while on
is saved, Send a test, Off, and an old planner copy without notifications gets a plain line. (Headless Chromium will not let a service worker show a
notification, so the service worker's own handling is checked in node: app/tests/push-client.test.js.) Made-up data only.
Run:  python app/tests/push_sim.py   (needs playwright + chromium)."""
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
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=dist))
srv.handle_error = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d/' % srv.server_address[1]
URL = 'https://script.google.com/macros/s/AKfyFAKE_good-1/exec'

# a stand-in for the browser's push service: subscribe gives a made-up address and keys
STUB = """
(() => {
  if (!self.PushManager) return;
  let sub = null;
  const keep = (on) => { try { on ? localStorage.setItem('__stubSub', '1') : localStorage.removeItem('__stubSub'); } catch (e) {} };
  const mk = () => ({ endpoint: 'https://push.example/dev1', toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'B' + 'x'.repeat(86), auth: 'a'.repeat(22) } }; },
    unsubscribe() { sub = null; keep(false); window.__unsub = (window.__unsub || 0) + 1; return Promise.resolve(true); } });
  PushManager.prototype.getSubscription = function () { if (!sub && localStorage.getItem('__stubSub')) sub = mk(); keep(true); return Promise.resolve(sub); };
  PushManager.prototype.subscribe = function (o) { window.__subKeyLen = o.applicationServerKey.length; sub = mk(); keep(true); return Promise.resolve(sub); };
})();
"""
res = []
def check(n, c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + 'push sim: ' + n)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844})
    ctx.grant_permissions(['notifications'], origin=BASE.rstrip('/'))
    ctx.add_init_script(STUB)
    seen, old = [], {'v': False}
    device = {'v': None}
    def server(route, req):
        body = json.loads(req.post_data or '{}'); fn = body.get('fn'); args = body.get('args') or []
        seen.append({'fn': fn, 'args': args})
        cors = {'Access-Control-Allow-Origin': '*'}
        def ans(result=None, error=None):
            out = {'ok': True, 'result': result} if error is None else {'ok': False, 'error': error}
            route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps(out))
        if fn.startswith('push') and old['v']: return ans(error='Not allowed: ' + fn)
        if fn == 'pushStatus': return ans({'ready': True, 'publicKey': 'BPUBLIC_key-made-up', 'kinds': ['morning', 'nudge'], 'device': device['v']})
        if fn == 'pushSave': device['v'] = {'status': 'on', 'kinds': args[1], 'lastSent': None}; return ans({'ready': True, 'device': device['v']})
        if fn == 'pushRemove': device['v'] = {'status': 'off', 'kinds': [], 'lastSent': None}; return ans({'ready': True, 'device': device['v']})
        if fn == 'pushTest': return ans({'sent': 1, 'gone': 0, 'failed': 0})
        ans({'mode': 'teaching'})
    ctx.route('https://script.google.com/**', server)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(300)
    pg.fill('#url', URL); pg.fill('#key', 'good-key-123'); pg.click('#save'); pg.wait_for_timeout(600)
    pressed = lambda: pg.eval_on_selector('#pushOn [aria-pressed="true"]', 'b => b.dataset.v')
    check('the Notifications card is there, Off, both kinds ticked, no test button yet',
          pg.is_visible('#pushCard') and pressed() == 'off' and pg.is_checked('#pushMorning') and pg.is_checked('#pushNudge') and not pg.is_visible('#pushTest'))
    pg.uncheck('#pushNudge'); pg.click('#pushOn [data-v="on"]'); pg.wait_for_timeout(600)
    save = [s for s in seen if s['fn'] == 'pushSave']
    check('On: this device is saved with only the ticked kind, its own id and push address, with the planner\'s key',
          len(save) == 1 and save[0]['args'][1] == ['morning'] and save[0]['args'][0]['endpoint'] == 'https://push.example/dev1' and len(save[0]['args'][0]['deviceId']) >= 6
          and pg.evaluate('window.__subKeyLen') == 14 and pressed() == 'on' and 'Send a test' in pg.inner_text('#pushCard'))
    pg.check('#pushNudge'); pg.wait_for_timeout(500)
    save = [s for s in seen if s['fn'] == 'pushSave']
    check('ticking a kind while on saves it straight away', len(save) == 2 and save[1]['args'][1] == ['morning', 'nudge'])
    pg.click('#pushTest'); pg.wait_for_timeout(400)
    check('Send a test: asks the planner and says it is on its way', any(s['fn'] == 'pushTest' for s in seen) and 'should arrive' in pg.inner_text('#pushMsg'))
    pg.reload(); pg.wait_for_timeout(700)
    check('opening the app again shows it On, from the planner', pressed() == 'on' and pg.is_checked('#pushNudge') and 'On for this device' in pg.inner_text('#pushMsg'))

    pg.click('#pushOn [data-v="off"]'); pg.wait_for_timeout(500)
    check('Off: the push address is dropped here and the planner is told', pg.evaluate('window.__unsub') == 1 and any(s['fn'] == 'pushRemove' for s in seen) and pressed() == 'off' and not pg.is_visible('#pushTest'))
    old['v'] = True; pg.reload(); pg.wait_for_timeout(600)
    check('an older planner copy without notifications: one plain line, nothing breaks', 'next paste' in pg.inner_text('#pushMsg') and pressed() == 'off')
    check('no page errors', not errs)
    b.close()
srv.shutdown()
print('push sim: all passed' if all(res) else 'push sim: %d FAILED' % res.count(False))
sys.exit(0 if all(res) else 1)
