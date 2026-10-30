"""Backdating and the end-of-day reminder (Phase 5, 30 Oct 2026). Runs Phone.html in headless Chromium against a fake
server at 3:30 pm on a school day: the Lesson tab asks about today's classes with nothing logged; on the Today tab you
pick an earlier school day, an amber bar says which day taps go to, a tap is sent with that day, the list shows that
day's entries, and "Back to today" returns to normal taps.
Run:  python tests/backdate_sim.py   (needs playwright + chromium). Synthetic data only."""
import os, json, tempfile, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'Phone.html'), encoding='utf-8').read().replace('<?= key ?>', 'k').replace('<?= manifestUrl ?>', '')
RECENT = [{'day': '2026-11-03', 'label': 'Tue 3 Nov', 'classes': ['7MLA']}, {'day': '2026-11-02', 'label': 'Mon 2 Nov', 'classes': ['8XP']}]
MOCK = r'''<script>
const RECENT=%s; window.CALLS=[];
const st=()=>({mode:'teaching',timer:null,now:Date.now(),board:Date.now()-3000});
const OLD=[{id:1,t:'12:10',name:'Alpha Test',type:'+',rule:0}];
const H={init:()=>({classes:['7MLA','8XP'],today:['7MLA','8XP'],week:'B',active:'7MLA',rules:{2:'Work ethic'},mode:st(),version:24,recent:RECENT,quiet:['8XP']}),
 openClass:()=>({students:[{name:'Alpha Test',short:'Alpha T.'},{name:'Beta Test',short:'Beta T.'}],ratio:2.4,events:[],silence:null}),
 classDay:(c,d)=>d?OLD:[], getMode:()=>st(), positivesOver:()=>[], getSilence:()=>null,
 logEvent:(c,n,t,r,ts,id,day)=>{ window.CALLS.push({fn:'logEvent',n,day}); return day?OLD.concat([{id:2,t:'12:30',name:n,type:t,rule:0}]):[{id:3,t:'15:30',name:n,type:t,rule:0}]; }};
window.google={script:{run:{withSuccessHandler(ok){return {withFailureHandler(fail){return new Proxy({},{get(_,fn){return function(k,...a){
  setTimeout(()=>{ try{ ok(H[fn](...a)); }catch(e){fail(e);} }, 40); }}})}}}}}};
</script>''' % json.dumps(RECENT)
page = html.replace('<script>\nconst KEY', MOCK + '\n<script>\nconst KEY', 1)
path = os.path.join(tempfile.mkdtemp(), 'phone.html'); open(path, 'w', encoding='utf-8').write(page)
results = []
def check(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
    pg.clock.install(time='2026-11-04T15:30:00')   # a Wednesday, after 3:15 pm
    pg.route('**/*fonts*', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + path); pg.clock.run_for(1500)
    r = pg.inner_text('#remind')
    check('after 3:15 pm the Lesson tab asks about classes with nothing logged today: ' + r.replace('\n', ' '), 'Any positives to add for today?' in r and '8XP' in r and '7MLA' not in r)
    check('no amber bar while logging for today', pg.locator('#backBar').is_hidden())
    pg.click('#tDay'); pg.clock.run_for(300)
    days = pg.locator('#dayPick button').all_inner_texts()
    check('the Today tab offers Today and the recent school days: ' + ', '.join(days), days == ['Today', 'Tue 3 Nov', 'Mon 2 Nov'])
    pg.click('#dayPick [data-back="2026-11-03"]'); pg.clock.run_for(500)
    check('picking a day shows that day\'s entries under its name', pg.inner_text('#dayHead2') == 'Logged on Tue 3 Nov' and 'Alpha Test' in pg.inner_text('#dayList'))
    pg.click('#tLog'); pg.clock.run_for(300)
    check('the Lesson tab shows the amber bar "Logging for Tue 3 Nov" and no reminder', 'Logging for Tue 3 Nov' in pg.inner_text('#backBar') and pg.locator('#remind').is_hidden())
    pg.click('#studs [data-name="Beta Test"]'); pg.clock.run_for(500)
    if pg.locator('[data-act="+"]').count(): pg.click('[data-act="+"]'); pg.clock.run_for(500)
    c = pg.evaluate('window.CALLS')
    check('the tap is sent for that day', len(c) == 1 and c[0]['day'] == '2026-11-03' and c[0]['n'] == 'Beta Test')
    pg.click('#backBar [data-back=""]'); pg.clock.run_for(500)
    check('"Back to today" hides the bar and the reminder comes back', pg.locator('#backBar').is_hidden() and '8XP' in pg.inner_text('#remind'))
    pg.click('#studs [data-name="Alpha Test"]'); pg.clock.run_for(500)
    if pg.locator('[data-act="+"]').count(): pg.click('[data-act="+"]'); pg.clock.run_for(500)
    c = pg.evaluate('window.CALLS')
    check('after that, taps are for today again', len(c) == 2 and not c[1]['day'])
    pg.click('#remind [data-remind-off]'); pg.clock.run_for(200)
    check('"Not today" hides the reminder', pg.locator('#remind').is_hidden())
    check('no page errors' + (': ' + errs[0] if errs else ''), not errs)
    b.close()
print('All passed' if all(results) else 'SOME FAILED')
sys.exit(0 if all(results) else 1)
