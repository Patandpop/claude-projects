"""ABCD card votes on the next lesson card (work plan 2.2) and most-missed questions on the Assessment tab (2.3), 29 Oct 2026. Runs the real Planner.html through make-preview.js
(the fake server with planner-data.json) in headless Chromium, gives it made-up class-level votes, then checks:
  - the class's next lesson card shows "ABCD n%" from its last voted lesson;
  - the lesson's panel lists the weakest questions, and "Put on this lesson's Do Now" puts one in the build request;
  - pressing it again takes it off.
Run:  python planner/tests/planner_votes_sim.py   (needs playwright + chromium). Synthetic data only, no names."""
import os, subprocess, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if not os.path.exists(os.path.join(ROOT, 'planner-data.json')):
    print('SKIP planner-data.json is not exported on this PC')
    sys.exit(0)
OUT = 'preview-votesim.html'   # planner/preview*.html is ignored by git
subprocess.run(['node', os.path.join(ROOT, 'make-preview.js'), '--out', OUT, '--monday', '2026-11-09'], check=True, cwd=ROOT, capture_output=True)
path = os.path.join(ROOT, OUT)
results = []
def check(name, cond): results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name)
with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1280, 'height': 800})
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('file:///' + path.replace('\\', '/')); page.wait_for_function('typeof render === "function" && S.week && S.week.monday === "2026-11-09"')
    r = page.evaluate("""() => {
      const idx = S.week.slots.findIndex((s) => s.kind === 'lesson' && !s.double && s.day >= 1);
      const s = S.week.slots[idx], date = P.iso(P.addDays(P.parse(S.week.monday), s.day)), before = P.iso(P.addDays(P.parse(date), -1));
      S.votes = [{ cls: s.cls, key: 'made-up-key', title: 'Made Up Lesson', when: before, q: 1, question: 'Which is right?', right: 'B', pct: 30, wrong: 'C', why: 'mixes up two ideas' },
                 { cls: s.cls, key: 'made-up-key', title: 'Made Up Lesson', when: before, q: 2, question: 'And this one?', right: 'A', pct: 90, wrong: 'D', why: '' }];
      render();
      const card = document.querySelector('.ev[data-i="' + idx + '"]');
      return { idx, cls: s.cls, chip: card ? [...card.querySelectorAll('.flag')].map((f) => f.textContent).join(' | ') : '' };
    }""")
    check('the next lesson card shows the class\'s ABCD average: ' + r['chip'], 'ABCD 60%' in r['chip'])
    idx = r['idx']
    page.click('.ev[data-i="%d"]' % idx)
    page.wait_for_selector('.eDnv')
    txt = page.inner_text('#ed')
    check('the lesson panel lists the weakest question with its % and the most picked wrong answer', 'Q1: 30% right, most picked C' in txt and 'mixes up two ideas' in txt)
    page.click('.eDnv[data-q="1"]')
    r = page.evaluate("""(i) => ({ dn: S.week.slots[i].dnVotes || [], prompt: P.buildPrompt(S.data, S.week.slots[i], null, S.week),
      chip: [...document.querySelectorAll('.ev[data-i="' + i + '"] .flag')].map((f) => f.textContent).join(' | '), btn: (document.querySelector('.eDnv[data-q="1"]') || {}).textContent })""", idx)
    check('"Put on this lesson\'s Do Now" puts it in the build request', len(r['dn']) == 1 and 'Put on the Do Now (missed in the ABCD cards in Made Up Lesson, 30% right, most picked C): Which is right?' in r['prompt'])
    check('the card says it is on the Do Now and the button now takes it off: ' + r['chip'], '1 on Do Now' in r['chip'] and r['btn'] == 'Take off the Do Now')
    page.click('.eDnv[data-q="1"]')
    r = page.evaluate("(i) => ({ dn: S.week.slots[i].dnVotes || [], prompt: P.buildPrompt(S.data, S.week.slots[i], null, S.week) })", idx)
    check('pressing it again takes it off', len(r['dn']) == 0 and 'Put on the Do Now' not in r['prompt'])
    # work plan 2.4: homework due on the card, the collect tick on by itself, key homework to mark after 5 days, the two new ticks
    r = page.evaluate("""(i) => {
      const s = S.week.slots[i], date = P.iso(P.addDays(P.parse(S.week.monday), s.day));
      S.hw = [{ cls: s.cls, kind: 'quiz', title: 'Made up quiz', dueOn: date, status: 'live' }, { cls: s.cls, kind: 'key', title: 'Made up key', dueOn: P.iso(P.addDays(P.parse(date), -6)), status: 'due' }];
      delete S.week.slots[i].checks; S.sel = -1; render(); S.sel = i; editor();
      const chip = [...document.querySelectorAll('.ev[data-i="' + i + '"] .flag')].map((f) => f.textContent).join(' | ');
      const box = (k) => { const el = document.querySelector('.eChk[data-k="' + k + '"]'); return el ? el.checked : null; };
      return { chip, collect: box('collectHw'), follow: box('followUp'), key: box('keyBack') };
    }""", idx)
    check('the card shows "HW due" and "KEY HW to mark": ' + r['chip'], 'HW due' in r['chip'] and 'KEY HW to mark' in r['chip'])
    check('"Collect homework" is ticked by itself when homework is due; the follow-up and key-homework-returned ticks are there, unticked',
          r['collect'] is True and r['follow'] is False and r['key'] is False)
    # work plan 2.3: most-missed homework questions across classes on the Assessment tab
    r = page.evaluate("""() => {
      const cls = Object.keys(S.data.classes), day = P.iso(P.addDays(todayMidnight(), -3)), old = P.iso(P.addDays(todayMidnight(), -80));
      S.results = [{ id: 'h1', cls: cls[0], title: 'Quiz one', dueOn: day, done: 20, questions: [{ key: '1', text: 'First question', pct: 70, wrong: [], missed: [] }, { key: '2', text: 'Hard one', pct: 15, wrong: [{ answer: 'C', count: 9 }], missed: [] }] },
                   { id: 'h2', cls: cls[1], title: 'Quiz two', dueOn: day, done: 18, questions: [{ key: '4', text: 'Middling', pct: 40, wrong: [], missed: [{ title: 'names the force', pct: 60 }] }] },
                   { id: 'h3', cls: cls[1], title: 'Old quiz', dueOn: old, done: 18, questions: [{ key: '9', text: 'Too old', pct: 1, wrong: [], missed: [] }] }];
      S.view = 'tests'; render();
      const cards = () => [...document.querySelectorAll('#asMMB .hwcard b')].map((b) => b.textContent);
      const all = cards();
      document.querySelector('#asMMB .asMMc[data-c="' + cls[1] + '"]').click();
      return { all, one: cards(), c0: cls[0], c1: cls[1] };
    }""")
    check('Assessment: most-missed questions from every class, lowest first, old homework left out: ' + ', '.join(r['all']),
          r['all'] == [r['c0'] + ' Q2 (15%)', r['c1'] + ' Q4 (40%)', r['c0'] + ' Q1 (70%)'])
    check('Assessment: a class button narrows the list to that class', r['one'] == [r['c1'] + ' Q4 (40%)'])
    check('no page errors' + (': ' + errors[0] if errors else ''), not errors)
    b.close()
try: os.remove(path)
except OSError: pass
print('All passed' if all(results) else 'SOME FAILED')
sys.exit(0 if all(results) else 1)
