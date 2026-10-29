"""Friday messages home (work plan 2.8, 29 Oct 2026). Runs Phone.html in headless Chromium against a fake server:
tick pupils on the Friday tab, make the list, and check a draft message appears for each ticked pupil (their
first name, this week's positives, the class's silent-work goal when met, the sign-off), and that nothing is sent.
Run:  python tests/friday_sim.py   (needs playwright + chromium, like vote_sim.py). Synthetic data only."""
import os, json, tempfile
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'Phone.html'), encoding='utf-8').read().replace('<?= key ?>', 'k').replace('<?= manifestUrl ?>', '')
FRI = [{'cls': '7MLA', 'fortnight': False, 'signOff': 'Mr Test', 'goal': {'status': 'hit', 'pct': 85, 'target': 80, 'lost': 0, 'lostMax': 180},
        'students': [{'name': 'Alpha Test', 'pos': 3, 'emailed': '', 'recent': False}, {'name': 'Beta Test', 'pos': 0, 'emailed': '', 'recent': False}]},
       {'cls': '8XP', 'fortnight': False, 'signOff': 'Mr Test', 'goal': {'status': 'missed', 'pct': 60, 'target': 80, 'lost': 0, 'lostMax': 180},
        'students': [{'name': 'Test, Gamma', 'pos': 1, 'emailed': '', 'recent': False}]}]
MOCK = r'''<script>
const FRI=%s; window.SENT=[];
const st=()=>({mode:'teaching',timer:null,now:Date.now(),board:Date.now()-3000});
const H={init:()=>({classes:['7MLA','8XP'],today:['7MLA'],week:'B',active:'7MLA',rules:{2:'Work ethic'},mode:st(),version:23}),
 openClass:()=>({students:[],ratio:2.4,events:[],silence:null}), getMode:()=>st(), positivesOver:()=>[], getSilence:()=>null,
 getFriday:()=>FRI, markEmailed:(p)=>{ window.SENT.push(p); return p.length; }};
window.google={script:{run:{withSuccessHandler(ok){return {withFailureHandler(fail){return new Proxy({},{get(_,fn){return function(k,...a){
  setTimeout(()=>{ try{ ok(H[fn](...a)); }catch(e){fail(e);} }, 40); }}})}}}}}};
</script>''' % json.dumps(FRI)
page = html.replace('<script>\nconst KEY', MOCK + '\n<script>\nconst KEY', 1)
path = os.path.join(tempfile.mkdtemp(), 'phone.html'); open(path, 'w', encoding='utf-8').write(page)
results = []
def check(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
    pg.route('**/*fonts*', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + path); pg.wait_for_timeout(900)
    pg.click('#tFri'); pg.wait_for_timeout(400)
    pg.click('.cls-h[data-open="7MLA"]'); pg.click('.st[data-name="Alpha Test"]'); pg.click('.st[data-name="Beta Test"]')
    pg.click('.cls-h[data-open="8XP"]'); pg.click('.st[data-name="Test, Gamma"]')
    pg.click('#makeList'); pg.wait_for_timeout(200)
    msg = pg.input_value('#msgText')
    blocks = msg.split('----------')
    check('one draft message per ticked pupil (3)', len(blocks) == 3)
    check('a pupil with positives: first name and the count', 'Alpha earned 3 positive points in our science lessons this week' in blocks[0])
    check('the class goal is mentioned when it was met, not when it was missed', 'quiet for 85% of silent work time' in blocks[0] and 'silent-work goal' not in blocks[2])
    check('no positives: still a kind message; "Surname, First" gives the first name', 'Beta has worked really well' in blocks[1] and 'Gamma earned 1 positive point in' in blocks[2])
    check('the sign-off from the settings, no em dashes', msg.count('Mr Test') == 3 and '—' not in msg)
    check('the messages can be edited before copying', not pg.locator('#msgText').evaluate('e => e.readOnly'))
    check('nothing is sent or marked by making the drafts', pg.evaluate('window.SENT.length') == 0)
    check('no page errors' + (': ' + errs[0] if errs else ''), not errs)
    b.close()
print('All passed' if all(results) else 'SOME FAILED')
import sys; sys.exit(0 if all(results) else 1)
