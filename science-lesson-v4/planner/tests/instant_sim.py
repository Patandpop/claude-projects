"""Instant open (Lane C quick win, 29 Oct 2026). Opens the phone page and the planner twice in one headless Chromium
profile. The first open saves Google's answer in the browser; the second open has a slow or dead server and must:
  - phone: show the saved class straight away, with no server call to open a class (that would move the board) until
    the fresh answer lands; with no signal at all, keep the saved copy (no "Could not connect");
  - planner: draw the saved week straight away, hold back clicks while it is a saved copy, never save anything from
    it, and swap to the fresh copy when it arrives.
Run:  python planner/tests/instant_sim.py   (needs playwright + chromium, like phone_sim.py). Synthetic data only."""
import os, subprocess, sys, json, tempfile
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
results = []
def check(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)

# ---------- phone page: a tiny fake server; window.__mode = 'ok' | 'slow' | 'dead' set by an init script
STU = [{'name': f'{n} Test', 'short': f'{n} T.', 'x': 10 + i * 15, 'y': 20, 'support': ''} for i, n in enumerate(['Alex', 'Ben', 'Cara'])]
MOCK = r'''<script>
const STU=%s; window.__calls=[];
const H={init:()=>({classes:['10C2','9AS'],today:['10C2'],week:'B',active:'10C2',rules:{2:'Work ethic'},mode:{mode:'teaching',now:Date.now()},version:18}),
 openClass:()=>({students:STU,ratio:2.4,events:[],silence:null}), getMode:()=>({mode:'teaching',now:Date.now()}), positivesOver:()=>[], getSilence:()=>null};
window.google={script:{run:{withSuccessHandler(ok){return {withFailureHandler(fail){return new Proxy({},{get(_,fn){return function(k,...a){
  window.__calls.push(fn); const m = window.__mode || 'ok';
  if (m === 'dead') { setTimeout(()=>fail(new Error('no connection')), 50); return; }
  setTimeout(()=>{ try{ ok(H[fn] ? H[fn](...a) : null); }catch(e){fail(e);} }, m === 'slow' ? 2500 : 60);
}}})}}}}}};
</script>''' % json.dumps(STU)
html = open(os.path.join(ROOT, 'Phone.html'), encoding='utf-8').read().replace('<?= key ?>', 'k').replace('<?= manifestUrl ?>', '')
html = html.replace('<!--GAME_UI-->', '')   # Ulhu's code is not part of this test
phone = os.path.join(tempfile.mkdtemp(), 'phone.html')
open(phone, 'w', encoding='utf-8').write(html.replace('<script>\nconst KEY', MOCK + '\n<script>\nconst KEY', 1))

# ---------- planner: the real preview (make-preview.js), wrapped by an init script that can slow or kill the server
have_data = os.path.exists(os.path.join(ROOT, 'planner-data.json'))
if have_data:
    OUT = 'preview-instantsim.html'   # planner/preview*.html is ignored by git
    subprocess.run(['node', os.path.join(ROOT, 'make-preview.js'), '--out', OUT], check=True, cwd=ROOT, capture_output=True)
    planner = os.path.join(ROOT, OUT)
WRAP = """(mode) => { let g; window.__calls = [];
  Object.defineProperty(window, 'google', { configurable: true, get() { return g; }, set(v) {
    const real = v.script.run;
    g = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler(bad) { return new Proxy({}, { get(_, fn) { return (...a) => {
      window.__calls.push(fn);
      if (mode === 'dead') { setTimeout(() => bad(new Error('no connection')), 50); return; }
      setTimeout(() => real.withSuccessHandler(ok).withFailureHandler(bad)[fn](...a), mode === 'slow' && fn === 'loadAll' ? 2500 : 0);
    }; } }); } }; } } } };
  } }); }"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    errs = []
    url = 'file:///' + phone.replace('\\', '/')

    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*fonts*', lambda r: r.abort())
    pg.goto(url); pg.wait_for_timeout(800)
    check('phone, first open: the class loads and its answer is saved on the phone',
          pg.evaluate("S.students.length === 3 && !!localStorage.getItem('initCopy')"))
    pg.close()

    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*fonts*', lambda r: r.abort())
    pg.add_init_script("window.__mode = 'slow'")
    pg.goto(url); pg.wait_for_timeout(300)
    r = pg.evaluate("({ n: document.querySelectorAll('.tile').length, cls: S.cls, calls: window.__calls.slice(), when: $('when').textContent })")
    check('phone, slow server: the saved class shows at once (%s tiles, %s)' % (r['n'], r['cls']), r['n'] == 3 and r['cls'] == '10C2' and 'Week' in r['when'])
    check('...and no class is opened on the server before Google answers (the board does not move)', 'openClass' not in r['calls'])
    pg.wait_for_timeout(5600)
    check('...then the fresh answer opens the class for real', pg.evaluate("window.__calls.includes('openClass') && S.students.length === 3"))
    pg.close()

    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*fonts*', lambda r: r.abort())
    pg.add_init_script("window.__mode = 'dead'")
    pg.goto(url); pg.wait_for_timeout(600)
    r = pg.evaluate("({ n: document.querySelectorAll('.tile').length, studs: $('studs').textContent, bar: !!document.getElementById('errbar') })")
    check('phone, no signal: the saved copy stays, no "Could not connect" and no red bar', r['n'] == 3 and 'Could not connect' not in r['studs'] and not r['bar'])
    pg.close(); ctx.close()

    if not have_data:
        print('SKIP planner part: planner-data.json is not exported on this PC')
    else:
        purl = 'file:///' + planner.replace('\\', '/')
        ctx = b.new_context(viewport={'width': 1280, 'height': 800})
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(purl); pg.wait_for_function('typeof save === "function" && S.week')
        pg.wait_for_timeout(300)
        check('planner, first open: the answer is saved in the browser', pg.evaluate("!!localStorage.getItem('loadAllCopy')"))
        pg.close()

        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script('(' + WRAP + ")('slow')")
        pg.goto(purl); pg.wait_for_timeout(400)
        r = pg.evaluate("({ week: !!S.week, saved: showingSaved, status: $('status').textContent, cells: document.querySelectorAll('#grid .ev').length })")
        check('planner, slow server: the saved week is drawn at once (%s lessons): %s' % (r['cells'], r['status']), r['week'] and r['saved'] and r['cells'] > 0 and r['status'].startswith('Saved copy from'))
        pg.evaluate("document.querySelector('#grid .ev').click()")
        check('...a click on a lesson is held back while it is the saved copy', pg.evaluate("S.sel === -1"))
        pg.wait_for_timeout(3000)
        r = pg.evaluate("({ saved: showingSaved, calls: window.__calls.slice(), status: $('status').textContent })")
        check('...then the fresh copy replaces it and clicks work again: ' + r['status'], not r['saved'] and not r['status'].startswith('Saved copy'))
        check('...and nothing was saved from the saved copy', not any(c.startswith('save') for c in r['calls']))
        pg.close()

        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script('(' + WRAP + ")('dead')")
        pg.goto(purl); pg.wait_for_timeout(600)
        r = pg.evaluate("({ week: !!S.week, saved: showingSaved, status: $('status').textContent })")
        check('planner, no connection: the saved copy stays and says changes are off: ' + r['status'], r['week'] and r['saved'] and r['status'].startswith('No connection: showing the saved copy'))
        pg.close(); ctx.close()
        try: os.remove(planner)
        except OSError: pass

    check('no page errors', not errs)
    if errs: print(errs)
    b.close()
failed = results.count(False)
print(f'\n{failed} FAILED' if failed else '\nAll passed'); sys.exit(1 if failed else 0)
