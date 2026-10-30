"""Lane D: the companion screens in the real game page (headless Chromium, phone size) on Game.gs + Companion.gs.
Run: python tests/companion_sim.py [--shots DIR]. Synthetic data only."""
import os, sys, subprocess, tempfile, socket
from playwright.sync_api import sync_playwright
P = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
SP = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else tempfile.mkdtemp()
GAME = ['game-ulhu.js', 'game-pixel.js', 'game-runes.js', 'game-temple.js', 'game-stone.js', 'game-omens.js', 'game-tabs.js', 'game-blood.js', 'game-scroll.js', 'game-glass.js', 'game-highvespers.js', 'game-lair.js', 'game-brew.js', 'game-gate.js', 'game-levelup.js', 'game-faint.js', 'game-den.js', 'game-ui.js', 'game-oracle.js', 'game-pairs.js', 'companion-term.js', 'companion-focus.js', 'game-companion.js']
js = ''.join(open(P + f, encoding='utf-8').read() + '\n' for f in GAME if os.path.exists(P + f))
page = '''<!doctype html><meta charset="utf-8"><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0;background:#0d1b3a">
<div style="height:60px;background:#0a1020;color:#fff">header</div><div id=u></div>
<script>window.CALLS=[];function call(fn,...args){CALLS.push(fn);return fetch('/c',{method:'POST',body:JSON.stringify({fn,args})}).then(r=>r.json()).then(x=>{if(x.err)throw new Error(x.err);return x.ok;});}</script>
<script>''' + js + '''</script><script>GameUI.mount(document.getElementById('u'),call,{wide:false});</script>'''
f = os.path.join(SP, 'comp.html'); open(f, 'w', encoding='utf-8').write(page)
res = []
def check(n, c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n)
def serve(mode):
    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = str(s.getsockname()[1]); s.close()
    srv = subprocess.Popen(['node', os.path.join(P, 'tests', 'companion_server.js'), port, f, mode], stdout=subprocess.PIPE, text=True)
    srv.stdout.readline(); return srv, port
SCEN = sys.modules[__name__].__dict__.get('SCEN')
with sync_playwright() as p:
    b = p.chromium.launch()
    for mode in ['night', 'morning', 'home']:
        srv, port = serve(mode)
        try:
            pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('http://localhost:' + port + '/', timeout=90000); pg.wait_for_timeout(3000)
            pg.screenshot(path=os.path.join(SP, mode + '.png'))
            if os.path.exists(os.path.join(P, 'tests', 'companion_steps.py')):
                exec(open(os.path.join(P, 'tests', 'companion_steps.py'), encoding='utf-8').read())
            check(mode + ': no page errors ' + '; '.join(errs)[:300], not errs)
            pg.close()
        finally:
            srv.kill()
    b.close()
print('shots in', SP)
print('All companion screen checks passed' if all(res) else 'SOME CHECKS FAILED'); sys.exit(0 if all(res) else 1)
