"""Blind mode on the real phone page (eyes-free entry, picks 1A 2A 3A, 30 Oct 2026). Runs Phone.html in headless Chromium
with planner/eyes-free.js and a fake server, draws letters with synthetic pointer strokes and checks:
  - the Blind button sits beside Plan and Names and is remembered like them;
  - K picks the one K pupil; one tap then the 0.4 s pause logs a positive through logEvent; two taps log a negative;
  - J fits three pupils: it asks for the surname initial with no names shown; J then N leaves two, the short list shows;
  - three taps open the pupil's menu; a hold clears; nothing logs without a picked pupil;
  - Settings: Teach keeps a drawing on the phone; Test names a letter; Forget clears;
  - with no signal the tap is queued like a seat tap.
Run:  python planner/tests/blind_sim.py   (needs playwright + chromium). Made-up names only."""
import os, json, tempfile, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'Phone.html'), encoding='utf-8').read().replace('<?= key ?>', 'k').replace('<?= manifestUrl ?>', '')
ef = open(os.path.join(ROOT, 'eyes-free.js'), encoding='utf-8').read()
html = html.replace('<!--EYES_FREE-->', '<script>\n' + ef + '\n</script>', 1)
NAMES = ['Kit Moss', 'Jack Nash', 'Jade Neve', 'Jon Hill', 'Zara Cole', 'Ben Hale', 'Eve Ford']
STUDS = [{'name': n, 'short': n.split()[0] + ' ' + n.split()[1][0] + '.', 'x': None, 'y': None, 'support': ''} for n in NAMES]
MOCK = r'''<script>
const STUDS=%s; window.CALLS=[]; window.DOWN=false;
const st=()=>({mode:'teaching',timer:null,now:Date.now(),board:Date.now()-3000});
const H={init:()=>({classes:['7MLA'],today:['7MLA'],week:'B',active:'7MLA',rules:{2:'Work ethic'},mode:st(),version:24,recent:[],quiet:[]}),
 openClass:()=>({students:STUDS,ratio:2.4,events:[],silence:null}), getMode:()=>st(), positivesOver:()=>[], getSilence:()=>null,
 logEvent:(c,n,t)=>{ if(window.DOWN) throw new Error('offline'); window.CALLS.push({n,t}); return [{id:Date.now(),t:'10:00',name:n,type:t,rule:0}]; }};
window.google={script:{run:{withSuccessHandler(ok){return {withFailureHandler(fail){return new Proxy({},{get(_,fn){return function(k,...a){
  setTimeout(()=>{ try{ ok(H[fn](...a)); }catch(e){fail(e);} }, 30); }}})}}}}}};
</script>''' % json.dumps(STUDS)
page = html.replace('<script>\nconst KEY', MOCK + '\n<script>\nconst KEY', 1)
path = os.path.join(tempfile.mkdtemp(), 'phone.html'); open(path, 'w', encoding='utf-8').write(page)
results = []
def check(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
BOX = {}
def here(pg):   # the box's place on screen now (the page can scroll when a list button is tapped)
    bb = pg.locator('#efBox').bounding_box(); BOX['x'], BOX['y'] = bb['x'], bb['y']
def letter(pg, strokes, s=120):
    # the strokes are drawn inside the page (no round trips), with real gaps between them
    pg.evaluate("""async ([strokes, s]) => {
      const el = document.getElementById('efBox'), r = el.getBoundingClientRect(), ox = r.left + 100, oy = r.top + 120;
      const wait = (ms) => new Promise((d) => setTimeout(d, ms));
      const fire = (type, x, y) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: ox + x * s, clientY: oy + y * s, pointerId: 7, pointerType: 'touch', isPrimary: true }));
      for (const st of strokes) {
        fire('pointerdown', st[0][0], st[0][1]);
        for (let i = 1; i < st.length; i++) for (let k = 1; k <= 6; k++) { const [px, py] = st[i - 1], [x, y] = st[i]; fire('pointermove', px + (x - px) * k / 6, py + (y - py) * k / 6); await wait(8); }
        fire('pointerup', st[st.length - 1][0], st[st.length - 1][1]); await wait(60);
      }
    }""", [strokes, s])
    pg.wait_for_timeout(600)
def tap(pg, n=1):
    # taps sent inside the page (no round trips), so n taps always land inside the 0.4 s window
    pg.evaluate("""async (n) => {
      const el = document.getElementById('efBox'), r = el.getBoundingClientRect(), x = r.left + 200, y = r.top + 300;
      const fire = (type) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true }));
      for (let i = 0; i < n; i++) { fire('pointerdown'); fire('pointerup');   // down and up together: a busy PC cannot stretch the press past the tap limit
        await new Promise((d) => setTimeout(d, 60)); }
    }""", n)

K = [[(0, 0), (0, 1)], [(1, 0), (0, 0.55)], [(0.25, 0.42), (1, 1)]]
Z = [[(0, 0), (1, 0), (0, 1), (1, 1)]]
J = [[(0.65, 0), (0.65, 0.7), (0.5, 0.95), (0.2, 0.9), (0.05, 0.7)]]
N = [[(0, 1), (0, 0), (1, 1), (1, 0)]]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 412, 'height': 900}, has_touch=True)
    pg.route('**/*fonts*', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + path); pg.wait_for_timeout(900)
    check('the Blind button sits beside Plan and Names', pg.locator('.seg #mBlind').count() == 1)
    pg.click('#mBlind'); pg.wait_for_timeout(300)
    check('Blind shows the drawing box, the hint, and the class faintly underneath', pg.locator('#efBox canvas').count() == 1 and 'Draw the first letter' in pg.inner_text('#efHint') and 'Kit M.' in pg.inner_text('.efGhost'))
    check('the choice is remembered like Plan and Names', pg.evaluate("localStorage.getItem('view')") == 'blind')
    bb = pg.locator('#efBox').bounding_box(); BOX['x'], BOX['y'] = bb['x'], bb['y']
    tap(pg, 1); pg.wait_for_timeout(600)
    check('a tap with nobody picked logs nothing', pg.evaluate('window.CALLS.length') == 0)
    letter(pg, K)
    check('drawing K picks the one K pupil, name shown big', pg.inner_text('#efN') == 'Kit M.')
    tap(pg, 1); pg.wait_for_timeout(800)
    c = pg.evaluate('window.CALLS')
    check('one tap, then the pause: a positive through the normal log ' + str(c), len(c) == 1 and c[0] == {'n': 'Kit Moss', 't': '+'})
    check('the snackbar says it with Undo', 'Positive for' in pg.inner_text('#snackText') and pg.locator('#snackUndo').is_visible())
    letter(pg, Z); tap(pg, 2); pg.wait_for_timeout(800)
    c = pg.evaluate('window.CALLS')
    check('two taps: a negative ' + str(c[1:]), len(c) == 2 and c[1] == {'n': 'Zara Cole', 't': '-'})
    letter(pg, J)
    check('J fits three pupils: asks for the surname initial, no names shown', pg.inner_text('#efN') == '3 pupils' and not pg.locator('#efList').is_visible())
    letter(pg, N)
    check('J then N leaves two: the short list shows', pg.locator('#efList button').count() == 2)
    pg.evaluate("document.querySelector('#efList button').click()"); pg.wait_for_timeout(150)
    check('tapping a name on the list picks them', pg.inner_text('#efN') in ('Jack N.', 'Jade N.'))
    pg.evaluate("() => { window.EVS=[]; const S0 = BL.session; ['tap','tick','choose','cancel'].forEach(k => { const o = S0[k]; S0[k] = (...a) => { const r = o(...a); if (r || k !== 'tick') EVS.push([k, Date.now() % 100000, r && r.type, S0.state().phase, S0.state().taps]); return r; }; }); document.addEventListener('pointerdown', e => EVS.push(['pd', e.target.tagName, e.target.className]), true); }")
    tap(pg, 3); pg.wait_for_timeout(800)
    check('three taps open the pupil\'s menu', pg.locator('#sheet.open').count() == 1 and len(pg.evaluate('window.CALLS')) == 2)
    pg.click('#close'); pg.wait_for_timeout(200)
    letter(pg, K); here(pg)
    pg.mouse.move(BOX['x'] + 200, BOX['y'] + 300); pg.mouse.down(); pg.wait_for_timeout(900); pg.mouse.up(); pg.wait_for_timeout(700)
    check('a hold clears the pick, nothing logged', pg.inner_text('#efN') == '' and len(pg.evaluate('window.CALLS')) == 2)
    pg.evaluate('window.DOWN = true'); letter(pg, K)
    if pg.inner_text('#efN') != 'Kit M.': letter(pg, K)   # a busy PC can split the synthetic K into two letters; draw it again
    tap(pg, 1); pg.wait_for_timeout(900)
    # kept on the phone: in the queue, or set aside after three refusals (the fake server refuses while "online")
    q = pg.evaluate("JSON.parse(localStorage.getItem('queue') || '[]').concat(JSON.parse(localStorage.getItem('stuck') || '[]'))")
    check('no signal: the Blind tap is saved on the phone like a seat tap ' + str(q) + pg.inner_text('#snackText'), len(q) == 1 and q[0]['names'] == ['Kit Moss'] and q[0]['type'] == '+')
    pg.evaluate('window.DOWN = false')
    pg.click('#mPlan'); pg.wait_for_timeout(200)
    check('Plan and Names still work as before (no seats here: the names list)', pg.locator('#efBox').count() == 0 and pg.locator('#studs .names').count() == 1)
    pg.click('#tDay'); pg.wait_for_timeout(300)
    pg.click('#efTeach'); pg.wait_for_timeout(300)
    check('Teach opens Blind and asks for the first letter, three times', 'draw it (1 of 3)' in pg.inner_text('#efS'))
    bb = pg.locator('#efBox').bounding_box(); BOX['x'], BOX['y'] = bb['x'], bb['y']
    letter(pg, K)
    check('a taught letter is kept on the phone (strokes only) ' + pg.inner_text('#efS') + str(pg.evaluate("localStorage.getItem('ef.own')"))[:80], len(pg.evaluate("JSON.parse(localStorage.getItem('ef.own')||'[]')")) == 1 and 'Kit' not in pg.evaluate("localStorage.getItem('ef.own')"))
    pg.click('#tDay'); pg.wait_for_timeout(200); pg.click('#efTry'); pg.wait_for_timeout(300)
    check('Test names the letter to draw', 'draw ' in pg.inner_text('#efS') and '0 / 0' in pg.inner_text('#efL'))
    pg.click('#tDay'); pg.wait_for_timeout(200)
    pg.once('dialog', lambda d: d.accept()); pg.click('#efForget'); pg.wait_for_timeout(200)
    check('Forget my letters clears them', pg.evaluate("localStorage.getItem('ef.own')") == '[]')
    check('no page errors' + (': ' + errs[0] if errs else ''), not errs)
    b.close()
print('All passed' if all(results) else 'SOME FAILED')
sys.exit(0 if all(results) else 1)
