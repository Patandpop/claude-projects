"""The Memory tab (big goal 1, layout A, blue/orange/red, 30 Oct 2026). Runs the real Planner.html through make-preview.js
(the fake server with planner-data.json) in headless Chromium, gives it a made-up class-level memory map, then checks:
  - the sidebar has Memory; the tab shows the key, the class buttons and one row of squares per spec unit;
  - squares are coloured blue / orange / red / faded orange / grey by state, with their %;
  - clicking a square opens its panel with the questions behind it; "Put on next lesson's Do Now" saves a pin;
  - the class's lesson card shows "Suggested Do Now" with the pinned section first and ticked, and the build request
    carries the ticked sections; unticking one takes it out;
  - dark by default, the light switch changes the colours; no page errors.
Saves memory_tab_dark.png and memory_tab_light.png in the temp folder for a look.
Run:  python planner/tests/memory_tab_sim.py   (needs playwright + chromium). Synthetic data only, no names."""
import os, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if not os.path.exists(os.path.join(ROOT, 'planner-data.json')):
    print('SKIP planner-data.json is not exported on this PC')
    sys.exit(0)
OUT = 'preview-memsim.html'   # planner/preview*.html is ignored by git
subprocess.run(['node', os.path.join(ROOT, 'make-preview.js'), '--out', OUT, '--monday', '2026-11-09'], check=True, cwd=ROOT, capture_output=True)
path = os.path.join(ROOT, OUT)
results = []
def check(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1280, 'height': 900})
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('file:///' + path.replace('\\', '/')); page.wait_for_function('typeof render === "function" && S.week && S.week.monday === "2026-11-09"')
    info = page.evaluate("""() => {
      // a class with a lesson this week that carries spec codes
      const idx = S.week.slots.findIndex((s) => s.kind === 'lesson' && !s.double && ((S.data.classes[s.cls].seq[s.i] || {}).spec || []).length);
      const s = S.week.slots[idx], codes = [...new Set(S.data.classes[s.cls].seq.flatMap((L) => L.spec || []))];
      const st = ['red', 'amber', 'green', 'unknown'], rc = [48, 79, 91, 70];
      S.memory = { [s.cls]: codes.slice(0, 4).map((c, i) => ({ spec: c, state: st[i], recall: rc[i], reteach: i === 0, lastEvidence: '2026-10-20' })) };
      window.__MEMEV = [{ when: '2026-10-22', spec: codes[0], source: 'homework', pct: 52, n: '20', qRef: 'Made up homework Q3', mainWrong: 'C', why: 'thinks the temperature rises', guess: false },
                        { when: '2026-10-15', spec: codes[0], source: 'vote', pct: 40, n: 'votes', qRef: 'made-up Q1', mainWrong: 'B', why: '', guess: false }];
      S.mem = { cls: s.cls };
      return { idx, cls: s.cls, codes: codes.slice(0, 4) };
    }""")
    check('the sidebar has a Memory tab', page.locator('#vMemory').count() == 1)
    page.click('#vMemory'); page.wait_for_timeout(300)
    g = page.inner_text('#grid')
    check('the tab shows the key and the class buttons', 'remembered (85%+)' in g and 'fading (75 to 84%)' in g and page.locator('[data-mcls="' + info['cls'] + '"].on').count() == 1)
    check('one row per unit, with squares', page.locator('.mrow').count() >= 1 and page.locator('[data-msq]').count() >= 4)
    cols = page.evaluate("""(codes) => codes.map((c) => getComputedStyle(document.querySelector('[data-msq="' + CSS.escape(c) + '"]')).backgroundColor)""", info['codes'])
    check('dark: red, orange, blue and faded orange squares: ' + ', '.join(cols), cols[0] == 'rgb(217, 61, 66)' and cols[1] == 'rgb(232, 129, 42)' and cols[2] == 'rgb(47, 126, 240)' and cols[3] == 'rgb(232, 129, 42)')
    check('a red square shows its %, a not-checked one shows ?', '48%' in page.inner_text('[data-msq="%s"]' % info['codes'][0]) and '?' in page.inner_text('[data-msq="%s"]' % info['codes'][3]))
    check('untaught sections are grey, with no %', page.locator('.m-untaught').count() >= 1 and page.locator('.m-untaught small').count() == 0)
    check('the head counts the squares', '4 taught: 1 red, 1 orange, 1 blue, 1 not checked yet.' in page.inner_text('.mhead'))
    page.screenshot(path=os.path.join(tempfile.gettempdir(), 'memory_tab_dark.png'), full_page=True)
    page.click('[data-msq="%s"]' % info['codes'][0]); page.wait_for_timeout(300)
    pn = page.inner_text('#mPanel')
    check('clicking a square opens its panel: % and re-teach, the homework and ABCD rows', '48%, due, re-teach' in pn and 'Made up homework Q3' in pn and '52% right' in pn and 'most picked C' in pn and 'ABCD cards' in pn)
    page.click('#mPin'); page.wait_for_timeout(300)
    pins = page.evaluate('(c) => (S.classSettings[c] || {}).memPin', info['cls'])
    check('"Put on next lesson\'s Do Now" saves the section for the class', pins and pins[0]['spec'] == info['codes'][0])
    check('...and the button now offers to take it off', 'Take off' in page.inner_text('#mPin'))
    page.evaluate('() => { S.mem.sel = ""; renderMemory(); }')
    page.evaluate('(i) => { S.view = "week"; S.sel = i; render(); editor(); }', info['idx']); page.wait_for_timeout(300)
    card = page.locator('.memDn')
    check('the lesson card shows Suggested Do Now', card.count() == 1 and 'suggested do now' in card.inner_text().lower())
    labels = card.locator('label').all_inner_texts()
    check('the section put on from the Memory tab is listed and ticked: ' + ' | '.join(labels), len(labels) == 3 and 'from the Memory tab' in labels[0] and card.locator('input').first.is_checked())
    prompt = page.evaluate('(i) => P.buildPrompt(S.data, S.week.slots[i], (S.classSettings || {})[S.week.slots[i].cls], S.week, S.memory)', info['idx'])
    check('the build request carries the ticked sections', ('Do Now spec (from the memory map, most due first): ' + info['codes'][0] + ' (48%)') in prompt)
    card.locator('input').first.uncheck(); page.wait_for_timeout(300)
    prompt = page.evaluate('(i) => P.buildPrompt(S.data, S.week.slots[i], (S.classSettings || {})[S.week.slots[i].cls], S.week, S.memory)', info['idx'])
    check('unticking takes it out of the build request', page.evaluate('(i) => S.week.slots[i].dnSpec', info['idx']) is not None and (info['codes'][0] + ' (48%)') not in prompt)
    page.evaluate("() => { document.body.classList.add('light'); S.view = 'memory'; render(); }"); page.wait_for_timeout(200)
    c0 = page.evaluate("""(c) => getComputedStyle(document.querySelector('[data-msq="' + CSS.escape(c) + '"]')).backgroundColor""", info['codes'][2])
    check('light mode: blue changes to the light blue ' + c0, c0 == 'rgb(31, 111, 209)')
    page.screenshot(path=os.path.join(tempfile.gettempdir(), 'memory_tab_light.png'), full_page=True)
    check('no em dashes on the tab', '—' not in page.inner_text('#grid'))
    check('no page errors' + (': ' + errors[0] if errors else ''), not errors)
    b.close()
print('All passed' if all(results) else 'SOME FAILED')
sys.exit(0 if all(results) else 1)
