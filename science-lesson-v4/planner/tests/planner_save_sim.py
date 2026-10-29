"""Saving in the planner (work plan 1.2, 29 Oct 2026). Runs the real Planner.html through make-preview.js (the fake
server with planner-data.json) in headless Chromium, then makes saves fail on purpose:
  - a part that fails once is retried and lands ("All changes saved");
  - a part that fails twice shows a red "NOT saved" naming it, the page stays dirty, and Ctrl+S sends it again;
  - the leave-page warning stays on while a save is still travelling, and goes off once it has landed.
Run:  python planner/tests/planner_save_sim.py   (needs playwright + chromium, like phone_sim.py). Synthetic data only."""
import os, subprocess, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if not os.path.exists(os.path.join(ROOT, 'planner-data.json')):
    print('SKIP planner-data.json is not exported on this PC (node science-lesson/references/planner-catalogue.js --export planner/planner-data.json)')
    sys.exit(0)
OUT = 'preview-savesim.html'   # planner/preview*.html is ignored by git
subprocess.run(['node', os.path.join(ROOT, 'make-preview.js'), '--out', OUT], check=True, cwd=ROOT, capture_output=True)
path = os.path.join(ROOT, OUT)

# the fake server, wrapped: __fail[fn] = how many times that call should fail first; __delay = ms before a reply
PATCH = """() => {
  const real = google.script.run;
  window.__fail = {}; window.__calls = []; window.__delay = 0;
  google.script.run = { withSuccessHandler(ok) { return { withFailureHandler(bad) { return new Proxy({}, { get(_, fn) { return (...a) => {
    window.__calls.push(fn);
    if (window.__fail[fn] > 0) { window.__fail[fn]--; setTimeout(() => bad(new Error('no connection')), 20); return; }
    setTimeout(() => real.withSuccessHandler(ok).withFailureHandler(bad)[fn](...a), window.__delay);
  }; } }); } }; } };
}"""
results = []
def check(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1280, 'height': 800})
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('file:///' + path.replace('\\', '/')); page.wait_for_function('typeof save === "function" && S.week')
    page.evaluate(PATCH)

    r = page.evaluate("""async () => { window.__fail = { saveWeek: 1 }; window.__calls = []; S.dirty = true; await save();
      return { status: $('status').textContent, cls: $('status').className, calls: window.__calls, dirty: S.dirty, saving: S.saving }; }""")
    check('a save that fails once is retried and lands: ' + r['status'], r['status'] == 'All changes saved' and r['calls'].count('saveWeek') == 2 and 'failed' not in r['cls'] and not r['dirty'] and r['saving'] == 0)

    r = page.evaluate("""async () => { window.__fail = { saveLessons: 2 }; window.__calls = []; S.recSaved = null; S.dirty = true; await save();
      const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e);
      return { status: $('status').textContent, cls: $('status').className, calls: window.__calls, dirty: S.dirty, warn: e.defaultPrevented }; }""")
    check('lesson ticks failing twice: red "NOT saved" names them and the page stays unsaved: ' + r['status'],
          r['status'].startswith('NOT saved: lesson ticks') and 'failed' in r['cls'] and r['calls'].count('saveLessons') == 2 and r['dirty'] and r['warn'])
    r = page.evaluate("""async () => { window.__fail = {}; window.__calls = []; await save();
      return { status: $('status').textContent, cls: $('status').className, calls: window.__calls, dirty: S.dirty }; }""")
    check('...Ctrl+S sends them again and the red goes: ' + r['status'], r['status'] == 'All changes saved' and 'failed' not in r['cls'] and 'saveLessons' in r['calls'] and not r['dirty'])

    r = page.evaluate("""async () => { window.__delay = 600; S.dirty = true; const pr = save();
      const e1 = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e1); const during = { warn: e1.defaultPrevented, saving: S.saving };
      await pr; const e2 = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e2); window.__delay = 0;
      return { during, after: { warn: e2.defaultPrevented, saving: S.saving }, status: $('status').textContent }; }""")
    check('the leave-page warning stays on while a save travels, and goes off once it lands',
          r['during']['warn'] and r['during']['saving'] == 1 and not r['after']['warn'] and r['after']['saving'] == 0 and r['status'] == 'All changes saved')
    check('no page errors', not errors)
    b.close()
try: os.remove(path)
except OSError: pass
print(f'{sum(results)} / {len(results)}')
sys.exit(0 if all(results) else 1)
