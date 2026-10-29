"""The memory map's line on the phone (big goal 1, design 5.3, 29 Oct 2026): opening a class shows its 3 reddest
spots as one line ("Due back: Latent heat 48%, ..."), and switching to a class with none clears it.
Run:  python tests/memline_sim.py   (needs playwright + chromium). Synthetic data only."""
import os, json, tempfile, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'Phone.html'), encoding='utf-8').read().replace('<?= key ?>', 'k').replace('<?= manifestUrl ?>', '')
MEM = {'7MLA': [{'title': 'Latent heat', 'recall': 48, 'state': 'red'}, {'title': 'Transition metals', 'recall': 80, 'state': 'unknown'}], '8XP': []}
MOCK = r'''<script>
const MEM=%s;
const st=()=>({mode:'teaching',timer:null,now:Date.now(),board:Date.now()-3000});
const H={init:()=>({classes:['7MLA','8XP'],today:['7MLA','8XP'],week:'B',active:'7MLA',rules:{2:'Work ethic'},mode:st(),version:23}),
 openClass:(c)=>({students:[],ratio:2.4,events:[],silence:null,memory:MEM[c]||[]}), getMode:()=>st(), positivesOver:()=>[], getSilence:()=>null};
window.google={script:{run:{withSuccessHandler(ok){return {withFailureHandler(fail){return new Proxy({},{get(_,fn){return function(k,...a){
  setTimeout(()=>{ try{ ok(H[fn](...a)); }catch(e){fail(e);} }, 40); }}})}}}}}};
</script>''' % json.dumps(MEM)
page = html.replace('<script>\nconst KEY', MOCK + '\n<script>\nconst KEY', 1)
path = os.path.join(tempfile.mkdtemp(), 'phone.html'); open(path, 'w', encoding='utf-8').write(page)
results = []
def check(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
    pg.route('**/*fonts*', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + path); pg.wait_for_timeout(900)
    pg.click('.chip[data-cls="7MLA"]'); pg.wait_for_timeout(400)
    t = pg.inner_text('#memLine')
    check('the class shows its reddest spots in one line: ' + t, t == 'Due back: Latent heat 48%, Transition metals ?')
    pg.click('.chip[data-cls="8XP"]'); pg.wait_for_timeout(400)
    check('a class with nothing due shows no line', pg.inner_text('#memLine') == '')
    check('no page errors' + (': ' + errs[0] if errs else ''), not errs)
    b.close()
print('All passed' if all(results) else 'SOME FAILED')
sys.exit(0 if all(results) else 1)
