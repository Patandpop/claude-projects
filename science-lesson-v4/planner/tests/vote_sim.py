"""ABCD card votes on the phone (2026-10-23, specs/learning-loop.md M3 + Patryk's feedback). Runs Phone.html in
headless Chromium against a fake server: tap = 100% one letter, drag between two letters then slide = the split
(pair in letter order), diagonal drags, Skip, the Undo button, and the seating plan coming back.
Run:  python tests/vote_sim.py   (needs playwright + chromium, like phone_sim.py). Synthetic data only."""
import os, json, tempfile
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'Phone.html'), encoding='utf-8').read().replace('<?= key ?>', 'k').replace('<?= manifestUrl ?>', '')
STU = [{'name': f'P{i} Test', 'short': f'P{i} T.', 'x': 10 + (i % 6) * 15, 'y': 18 if i < 6 else 50, 'support': ''} for i in range(12)]
MCQ = [{'q': 'Which cell has a tail?', 'o': ['Egg cell', 'Sperm cell', 'Nerve cell', 'Ciliated cell'], 'a': 'B', 'why': {'A': 'thinks the egg swims'}},
       {'q': 'Why has a red blood cell no nucleus?', 'o': ['To swim', 'To absorb water', 'To carry signals', 'More room for oxygen'], 'a': 'D', 'why': {}},
       {'q': 'Which cell is full of chloroplasts?', 'o': ['Palisade', 'Root hair', 'Red blood', 'Egg'], 'a': 'A', 'why': {}}]
MOCK = r'''<script>
const STU=%s, MCQ=%s; window.VOTES=[]; let N=0;
const st=()=>({mode:'teaching',timer:null,now:Date.now(),board:Date.now()-3000});
const H={init:()=>({classes:['7MLA'],today:['7MLA'],week:'B',active:'7MLA',rules:{2:'Work ethic'},mode:st(),version:23}),
 openClass:()=>({students:STU,ratio:2.4,events:[],silence:null}), getMode:()=>st(), positivesOver:()=>[], getSilence:()=>null,
 lessonMcqs:()=>({key:'Y7/B1/L4',title:'Specialised Cells',today:true,mcq:MCQ}),
 saveVote:(v)=>{ const id=v.id||('v'+(++N)); window.VOTES=window.VOTES.filter(x=>x.id!==id).concat([Object.assign({},v,{id})]);
   return {id,pctRight:v.right?(v.split[v.right]||0):'',mainWrong:''}; },
 setLost:(c,on)=>{ window.LOST=on; return Object.assign(st(),{lost:on?{cls:c,start:Date.now()}:null}); },
 removeVote:(id)=>{ window.VOTES=window.VOTES.filter(x=>x.id!==id); return true; }};
window.google={script:{run:{withSuccessHandler(ok){return {withFailureHandler(fail){return new Proxy({},{get(_,fn){return function(k,...a){
  setTimeout(()=>{ try{ ok(H[fn](...a)); }catch(e){fail(e);} }, 60); }}})}}}}}};
</script>''' % (json.dumps(STU), json.dumps(MCQ))
page = html.replace('<script>\nconst KEY', MOCK + '\n<script>\nconst KEY', 1)
path = os.path.join(tempfile.mkdtemp(), 'phone.html'); open(path, 'w', encoding='utf-8').write(page)
results = []
def check(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
    pg.route('**/*fonts*', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + path, timeout=90000); pg.wait_for_function('S.students.length === 12', timeout=30000)
    pg.click('#mAbcd'); pg.wait_for_timeout(400)
    check('ABCD replaces the seating plan; the class tabs and header stay', pg.is_visible('#vgrid') and not pg.is_visible('#studs') and pg.is_visible('#chips'))
    box = lambda L: pg.locator(f'.vl[data-l="{L}"]').bounding_box()
    a, bb, c, d = box('A'), box('B'), box('C'), box('D')
    check('corners match the room: B top left, C top right, A bottom left, D bottom right', bb['y'] < a['y'] and bb['x'] < c['x'] and a['x'] < d['x'] and c['y'] < d['y'])
    check('question 1 of 3 in lesson order, right answer ticked', 'Q1 of 3' in pg.inner_text('.vq') and pg.locator('.vl[data-l="B"] .tick').count() == 1)
    # tap = everyone
    pg.mouse.click(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.wait_for_timeout(300)
    v = pg.evaluate('VOTES')
    check('tap a letter = 100% that letter, saved straight away', len(v) == 1 and v[0]['split'] == {'B': 100} and v[0]['q'] == 0)
    check('the result shows big, with the right letter marked', 'B 100%' in pg.inner_text('.vres'))
    pg.click('#vNext'); pg.wait_for_timeout(200)
    # drag C -> A (pair reads "A | C"), then slide: the further right, the more C
    a, c = box('A'), box('C')
    pg.mouse.move(c['x'] + c['width'] / 2, c['y'] + c['height'] / 2); pg.mouse.down()
    pg.mouse.move(a['x'] + a['width'] / 2, a['y'] + a['height'] / 2, steps=6)
    W = pg.locator('#vgrid').bounding_box()
    pg.mouse.move(W['x'] + W['width'] * 0.7, a['y'] + a['height'] / 2, steps=6)
    live = pg.inner_text('.vres')
    pg.mouse.up(); pg.wait_for_timeout(300)
    v = [x for x in pg.evaluate('VOTES') if x['q'] == 1]
    check('drag C to A shows "A | C" in letter order while dragging', live.index('A') < live.index('C'))
    check('sliding right gives the later letter more: A 30% | C 70%', len(v) == 1 and v[0]['split'] == {'A': 30, 'C': 70})
    pg.click('#vUndo'); pg.wait_for_timeout(300)
    check('the Undo button (no pop-up) clears this question', not [x for x in pg.evaluate('VOTES') if x['q'] == 1] and not pg.is_visible('#snack.show'))
    def drag(f, t):
        pg.mouse.move(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2); pg.mouse.down()
        pg.mouse.move(t['x'] + t['width'] / 2, t['y'] + t['height'] / 2, steps=8); pg.mouse.up(); pg.wait_for_timeout(300)
        return sorted([x for x in pg.evaluate('VOTES') if x['q'] == 1][0]['split'].keys())
    check('a slanted drag A to C picks the diagonal pair A | C', drag(box('A'), box('C')) == ['A', 'C'])
    check('a flat drag A to D picks A | D', drag(box('A'), box('D')) == ['A', 'D'])
    check('a straight-up drag A to B picks A | B', drag(box('A'), box('B')) == ['A', 'B'])
    check('a slanted drag D to B picks B | D', drag(box('D'), box('B')) == ['B', 'D'])
    check('no fine-adjust buttons', pg.locator('#vMoreA').count() == 0)
    pg.click('#vSkip'); pg.wait_for_timeout(200)
    check('Skip moves on without saving', 'Q3 of 3' in pg.inner_text('.vq') and len(pg.evaluate('VOTES')) == 2)
    d = box('D'); pg.mouse.click(d['x'] + 20, d['y'] + 20); pg.wait_for_timeout(300)
    check('a third vote is saved', len(pg.evaluate('VOTES')) == 3)
    pg.click('#vUndo'); pg.wait_for_timeout(300)
    check('Undo removes the last vote', len(pg.evaluate('VOTES')) == 2)
    pg.click('#mAbcd'); pg.wait_for_timeout(200)
    check('ABCD off: the seating plan is back', pg.is_visible('#studs') and not pg.is_visible('#vgrid'))
    pg.click('.talk')
    try: pg.wait_for_function("window.LOST === true && !!document.querySelector('.lostp')", timeout=10000)   # waits for the result, not a fixed time (busy PCs)
    except Exception: pass
    check('Talking: one tap turns the panel red and counts up at once', pg.is_visible('.lostp') and pg.evaluate('LOST') is True and pg.inner_text('.lostp b').startswith('0:0'))
    pg.click('.lostp')
    try: pg.wait_for_function("window.LOST === false && !document.querySelector('.lostp')", timeout=10000)
    except Exception: pass
    check('a second tap stops it', not pg.is_visible('.lostp') and pg.evaluate('LOST') is False)
    check('no page errors', not errs)
    if errs: print(errs)
    b.close()
print(f'\n{sum(results)}/{len(results)} passed')
raise SystemExit(0 if all(results) else 1)
