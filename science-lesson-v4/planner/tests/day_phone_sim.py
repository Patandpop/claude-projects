"""The Day tab on the phone page (Phone.html with the day screen, planner/day-screen.js). Headless Chromium, fake server,
made-up data. Checks: the Day tab is in the bottom bar; it opens the timeline with the date as the title and no class
chips; a started timer shows as the top bar and stays there on the Lesson tab; refresh on the Day tab reloads the day;
"Done for today" sends the 'daydone' event for Ulhu; a copy without the day screen says so instead of breaking.
Run:  python planner/tests/day_phone_sim.py   (needs playwright + chromium, like the other sims)."""
import json, os, sys, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
read = lambda f: open(os.path.join(ROOT, f), encoding='utf-8').read()
STU = [{'name': f'{n} Test', 'short': f'{n} T.', 'x': 10 + i * 15, 'y': 20, 'support': ''} for i, n in enumerate(['Alex', 'Ben', 'Cara'])]
PT = {'ks3': {'P1': '09:00-10:00', 'P2': '10:25-11:30', 'P3': '11:30-12:30', 'P4': '13:15-14:15', 'P5': '14:15-15:15'},
      'ks4': {'P1': '09:00-10:00', 'P2': '10:00-11:05', 'P3': '11:30-12:30', 'P4': '12:30-13:30', 'P5': '14:15-15:15'}}
MOCK = r'''<script>
const STU=%s, PT=%s; window.__calls=[];
const today = (() => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })();
const H={init:()=>({classes:['10C2','9AS'],today:['10C2'],week:'B',active:'10C2',rules:{2:'Work ethic'},mode:{mode:'teaching',now:Date.now()},version:18}),
 openClass:()=>({students:STU,ratio:2.4,events:[],silence:null}), getMode:()=>({mode:'teaching',now:Date.now()}), positivesOver:()=>[], getSilence:()=>null,
 dayLoad:()=>({day:today,periodTimes:PT,settings:{shutdownTime:'17:00'},lessons:[{period:1,cls:'9AS',title:'L3 Latent heat',kind:'lesson',built:true,planned:true},{period:3,cls:'10C2',title:'L2 Efficiency',kind:'lesson',built:true,planned:true}],
   items:[{id:'c',kind:'mark',text:'Mark 9AS key homework',cls:'9AS',due:today,since:today}],recent:[],inbox:[],timer:null,doneForToday:false}),
 timerStart:()=>({id:'tm1'}), timerStop:()=>({}), doneForToday:()=>({day:today,beforeSeven:true}), todoSet:()=>({})};
window.google={script:{run:{withSuccessHandler(ok){return {withFailureHandler(fail){return new Proxy({},{get(_,fn){return function(k,...a){
  window.__calls.push([fn].concat(a)); setTimeout(()=>{ try{ ok(H[fn] ? H[fn](...a) : null); }catch(e){fail(e);} }, 60);
}}})}}}}}};
</script>''' % (json.dumps(STU), json.dumps(PT))
html = read('Phone.html').replace('<?= key ?>', 'k').replace('<?= manifestUrl ?>', '').replace('<!--GAME_UI-->', '<script>' + read('game-ulhu.js') + '</script>')
html = html.replace('<script>\nconst KEY', MOCK + '\n<script>\nconst KEY', 1)
tmp = tempfile.mkdtemp()
with_day = os.path.join(tmp, 'phone.html')
open(with_day, 'w', encoding='utf-8').write(html.replace('<!--DAY_UI-->', ''.join('<script>' + read(f) + '</script>' for f in ['day-logic.js', 'day-timer.js', 'day-capture.js', 'day-screen.js'])))
without = os.path.join(tmp, 'phone-old.html')
open(without, 'w', encoding='utf-8').write(html)

res = []
def check(n, c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844})
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*fonts*', lambda r: r.abort())
    pg.goto(Path(with_day).as_uri()); pg.wait_for_function('S.students.length === 3')
    nav = pg.eval_on_selector_all('nav button', 'b => b.map(x => x.textContent.trim())')
    check('the Day tab is in the bottom bar: %s' % nav, nav[0] == 'Day' and 'Lesson' in nav)
    pg.click('#tDs'); pg.wait_for_function('document.querySelectorAll("#dayScreen .les").length === 2')
    check('Day opens the timeline (two lessons) with the date as the title and no class chips',
          pg.evaluate("$('clsTitle').textContent") != '10C2' and pg.is_hidden('#chips') and pg.is_hidden('#vLog') and pg.evaluate("$('tDs').getAttribute('aria-pressed')") == 'true')
    check('the lesson silence controls stay off the Day tab', pg.is_hidden('#silence'))
    check('the capture box sits at the top of the day', pg.locator('#dayScreen [data-dc=text]').count() == 1)
    pg.click('#dayScreen [data-ds=go] >> nth=0'); pg.wait_for_timeout(200)
    if os.environ.get('SHOTS'): pg.screenshot(path=os.path.join(os.environ['SHOTS'], 'phone-day.png'))
    check('a started timer shows as the top bar', pg.evaluate('!DAYS.bar.hidden') and 'Marking' in pg.evaluate('DAYS.bar.textContent'))
    pg.click('#tLog'); pg.wait_for_timeout(100)
    check('the lesson silence controls sit just under the bar, not behind it', pg.evaluate("getComputedStyle($('silence')).top") == '46px')
    check('...and stays at the top on the Lesson tab, with room made for it', pg.evaluate('!DAYS.bar.hidden && DAYS.bar.getBoundingClientRect().top === 0') and pg.evaluate("document.body.classList.contains('ds-running')"))
    pg.click('#tDs'); pg.wait_for_timeout(200)
    n = pg.evaluate('__calls.filter(c => c[0] === "dayLoad").length')
    pg.click('#refresh'); pg.wait_for_timeout(200)
    check('refresh on the Day tab reloads the day (not the class)', pg.evaluate('__calls.filter(c => c[0] === "dayLoad").length') == n + 1)
    pg.evaluate("window.GOT = null; addEventListener('daydone', e => GOT = e.detail)")
    pg.click('#dayScreen [data-ds=done]'); pg.wait_for_timeout(250)
    check('"Done for today" sends the daydone event for Ulhu\'s ritual', pg.evaluate('GOT && GOT.beforeSeven') is True and pg.evaluate('DAYS.bar.hidden'))
    check('no page errors', not errs)
    if errs: print(errs)

    pg2 = ctx.new_page(); errs2 = []; pg2.on('pageerror', lambda e: errs2.append(str(e)))
    pg2.route('**/*fonts*', lambda r: r.abort())
    pg2.goto(Path(without).as_uri()); pg2.wait_for_function('S.students.length === 3')
    pg2.click('#tDs'); pg2.wait_for_timeout(100)
    check('a copy without the day screen says so instead of breaking', 'not in this copy' in pg2.inner_text('#dayScreen') and not errs2)
    b.close()
failed = res.count(False)
print(f'\n{failed} FAILED' if failed else '\nAll passed'); sys.exit(1 if failed else 0)
