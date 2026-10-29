"""The quick-capture box and morning sort (planner/day-capture.js) in headless Chromium, against a fake server.
Checks: Save keeps the capture on the device first and sends it with its suggested home; no signal keeps it and sends
it later (once); typing is never lost by a redraw; the morning sort's Yes and Other; Obsidian is never offered for a
class or pupil capture; dark mode. Run: python planner/tests/day_capture_sim.py. Made-up names only."""
import os, sys, tempfile, json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
read = lambda f: open(os.path.join(ROOT, f), encoding='utf-8').read()
INBOX = [{'id': 'i1', 'text': 'order 30 beakers', 'suggestedHome': 'orderSheet', 'cls': '', 'lesson': ''},
         {'id': 'i2', 'text': 'book idea: Dune', 'suggestedHome': 'obsidian', 'cls': '', 'lesson': ''},
         {'id': 'i3', 'text': '9AS ran out of time', 'suggestedHome': 'class', 'cls': '9AS', 'lesson': ''},
         {'id': 'i4', 'text': 'Zorbo was great', 'suggestedHome': 'todo', 'cls': '', 'lesson': ''}]
page = '''<!doctype html><html data-theme="light"><meta charset="utf-8"><meta name=viewport content="width=device-width,initial-scale=1">
<style>:root{--plate:#FFFFFF;--ink:#12345C;--line:#C9D6E5;--deep:#0D2442}
html[data-theme="dark"]{--plate:#13294A;--ink:#EAF2FA;--line:#27456B;--deep:#1C3A63} body{margin:0;padding:12px;font:15px system-ui}</style>
<body><div id="c"></div><script>''' + read('day-logic.js') + '</script><script>' + read('day-capture.js') + '''</script>
<script>
window.CALLS=[]; window.DOWN=false; window.SAVED={};
function call(fn,...a){ CALLS.push([fn].concat(a)); return new Promise((ok,bad)=>setTimeout(()=>{ if(DOWN) return bad(new Error('no connection'));
  if(fn==='captureSave'){ SAVED[a[2]]=(SAVED[a[2]]||0)+1; } ok({}); },60)); }
window.C = DayCapture.mount(document.getElementById('c'), call, { names: () => ['Zorbo Testperson'], inbox: ''' + json.dumps(INBOX) + ''' });
</script></body></html>'''
d = tempfile.mkdtemp(); path = os.path.join(d, 'cap.html'); open(path, 'w', encoding='utf-8').write(page)

res = []
def check(n, c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(Path(path).as_uri()); pg.wait_for_timeout(150)
    pg.fill('[data-dc=text]', '10S2 L4 add ripple tank video'); pg.press('[data-dc=text]', 'Enter'); pg.wait_for_timeout(200)
    c = [x for x in pg.evaluate('CALLS') if x[0] == 'captureSave'][-1]
    check('Enter saves: sent with its own id and the suggested home (10S2 lesson 4)', c[1] == '10S2 L4 add ripple tank video' and c[4]['home'] == 'lesson' and c[4]['cls'] == '10S2' and c[4]['lesson'] == 4)
    check('the box empties and says where it will go', pg.input_value('[data-dc=text]') == '' and '10S2 L4' in pg.inner_text('[data-dc=note]'))
    check('nothing left waiting', pg.evaluate("JSON.parse(localStorage.getItem('dayCaptureQueue')||'[]').length") == 0)
    pg.evaluate('DOWN=true'); pg.fill('[data-dc=text]', 'Zorbo forgot his book'); pg.click('[data-dc=save]'); pg.wait_for_timeout(200)
    q = pg.evaluate("JSON.parse(localStorage.getItem('dayCaptureQueue')||'[]')")
    check('no signal: kept on the device and says so', len(q) == 1 and 'sends when there is signal' in pg.inner_text('[data-dc=note]'))
    check('a capture naming a pupil is suggested as a to-do, never Obsidian', q[0]['sug']['home'] == 'todo')
    pg.fill('[data-dc=text]', 'half typed'); pg.evaluate('C.setInbox(C.state().inbox)')
    check('a redraw never loses what is being typed', pg.input_value('[data-dc=text]') == 'half typed')
    pg.evaluate("DOWN=false; dispatchEvent(new Event('online'))"); pg.wait_for_timeout(300)
    check('signal back: it is sent once and the queue empties', pg.evaluate("Object.values(SAVED).every(n => n === 1) && JSON.parse(localStorage.getItem('dayCaptureQueue')||'[]').length === 0"))
    # reload with something left waiting: it is sent on open
    pg.evaluate("localStorage.setItem('dayCaptureQueue', JSON.stringify([{id:'cOLD',text:'left over',at:1,sug:{home:'obsidian',cls:'',lesson:''}}]))")
    pg.reload(); pg.wait_for_timeout(300)
    check('a capture left waiting is sent when the page opens', pg.evaluate("SAVED.cOLD === 1"))
    # the morning sort
    check('the sort shows each capture with its suggested home', pg.locator('.it').count() == 4 and 'Order sheet' in pg.inner_text('.it[data-id=i1]'))
    pg.click('.it[data-id=i1] [data-dc=file]'); pg.wait_for_timeout(150)
    c = pg.evaluate('CALLS[CALLS.length-1]')
    check('Yes files it where suggested and it leaves the list', c[0] == 'captureFile' and c[1] == 'i1' and c[2]['home'] == 'orderSheet' and pg.locator('.it[data-id=i1]').count() == 0)
    pg.click('.it[data-id=i3] [data-dc=other]')
    others = pg.eval_on_selector_all('.it[data-id=i3] [data-dc=file]:not(.ok)', 'b => b.map(x => x.textContent)')
    check('Other for a class capture offers To-do and Order sheet, never Obsidian: %s' % others, 'Obsidian' not in others and 'To-do' in others)
    pg.click('.it[data-id=i4] [data-dc=other]')
    others = pg.eval_on_selector_all('.it[data-id=i4] [data-dc=file]:not(.ok)', 'b => b.map(x => x.textContent)')
    check('Other for a pupil capture never offers Obsidian: %s' % others, 'Obsidian' not in others)
    pg.click('.it[data-id=i2] [data-dc=other]')
    pg.click(".it[data-id=i2] [data-dc=file]:has-text('To-do')"); pg.wait_for_timeout(150)
    c = pg.evaluate('CALLS[CALLS.length-1]')
    check('Other lets him pick another home (To-do)', c[0] == 'captureFile' and c[1] == 'i2' and c[2]['home'] == 'todo')
    pg.evaluate('DOWN=true'); pg.click('.it[data-id=i3] [data-dc=file].ok'); pg.wait_for_timeout(150)
    check('no signal when filing: it stays on the list and says so', pg.locator('.it[data-id=i3]').count() == 1 and 'Not filed' in pg.inner_text('[data-dc=note]'))
    pg.evaluate("document.documentElement.dataset.theme='dark'"); pg.wait_for_timeout(50)
    bg = pg.evaluate("getComputedStyle(document.querySelector('[data-dc=text]')).backgroundColor")
    check('dark mode: the box turns dark (%s)' % bg, bg == 'rgb(19, 41, 74)')
    check('no page errors', not errs)
    if errs: print(errs)
    b.close()
failed = res.count(False)
print(f'\n{failed} FAILED' if failed else '\nAll passed'); sys.exit(1 if failed else 0)
