"""The day screen, layout B3 (planner/day-screen.js) and the home PC pop-up (planner/day-popup.js) in headless Chromium at
phone size, against a fake server with a fixed clock (Tuesday 3 Nov 2026, 08:00). Made-up data, no pupil names.
Checks: it opens at once from the saved copy; the timeline (class colours, unplanned lessons, suggested blocks, shutdown);
the workload line with Ulhu; the start buttons, the fixed top bar and Stop; the "More..." picker; tick (with its rune),
Move, Yes and the cross on a suggestion; "Done for today"; no signal puts things back; Ulhu's line; Light and Dark; the
pop-up by day and at night (N3, one eye open).
Run:  python planner/tests/day_screen_sim.py   (needs playwright + chromium, like the other sims)."""
import json, os, sys, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
read = lambda f: open(os.path.join(ROOT, f), encoding='utf-8').read()
T = '2026-11-03'
PT = {'ks3': {'P1': '09:00-10:00', 'break': '10:00-10:25', 'P2': '10:25-11:30', 'P3': '11:30-12:30', 'lunch': '12:30-13:15', 'P4': '13:15-14:15', 'P5': '14:15-15:15'},
      'ks4': {'P1': '09:00-10:00', 'P2': '10:00-11:05', 'break': '11:05-11:30', 'P3': '11:30-12:30', 'P4': '12:30-13:30', 'lunch': '13:30-14:15', 'P5': '14:15-15:15'}}
LOAD = {'day': T, 'periodTimes': PT, 'settings': {'shutdownTime': '17:00', 'afterSchoolEnd': '17:00'}, 'doneForToday': False, 'timer': None, 'inbox': [],
  'recent': [], 'cal': {},
  'lessons': [{'period': 1, 'cls': '9AS', 'title': 'L3 Latent heat', 'kind': 'lesson', 'built': True, 'planned': True},
              {'period': 3, 'cls': '10C2', 'title': 'L2 Efficiency', 'kind': 'lesson', 'built': True, 'planned': True},
              {'period': 4, 'cls': '10S2', 'title': '', 'kind': 'lesson', 'built': None, 'planned': False},
              {'period': 5, 'cls': '12C', 'title': 'L7 Superposition', 'kind': 'lesson', 'built': True, 'planned': True}],
  'items': [{'id': 'b', 'kind': 'build', 'text': 'Build 10S2 P4', 'cls': '10S2', 'due': T, 'since': T},
            {'id': 'c', 'kind': 'mark', 'text': 'Mark 9AS key homework', 'cls': '9AS', 'due': '2026-11-02', 'since': '2026-11-02'},
            {'id': 'd', 'kind': 'chase', 'text': 'Chase 4 pupils 10C2', 'cls': '10C2', 'count': 4, 'since': T},
            {'id': 'e', 'kind': 'review', 'text': '8XP test review', 'cls': '8XP', 'due': '2026-11-05', 'since': T},
            {'id': 'g1', 'kind': 'own', 'text': 'Order 30 beakers for Tuesday', 'since': T},
            {'id': 'g2', 'kind': 'own', 'text': 'Print the starch sheet', 'cls': '7MLA', 'since': T},
            {'id': 'g3', 'kind': 'own', 'text': 'Reply to the head of year', 'since': T},
            {'id': 'g4', 'kind': 'own', 'text': 'Book the computer room', 'since': T},
            {'id': 'r1', 'kind': 'ritual', 'text': 'Walk', 'since': T}]}

page = '''<!doctype html><html data-theme="light"><meta charset="utf-8"><meta name=viewport content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:12px;font:15px system-ui;background:#ccd}</style><body><div id="d"></div>
<script>''' + read('game-ulhu.js') + '''</script>
<script>''' + read('day-logic.js') + '''</script><script>''' + read('day-timer.js') + '''</script><script>''' + read('day-capture.js') + '''</script>
<script>''' + read('day-screen.js') + '''</script><script>''' + read('day-popup.js') + '''</script>
<script>
const LOAD = ''' + json.dumps(LOAD) + ''';
window.NOW = Date.parse('2026-11-03T08:00:00');
window.CALLS = []; window.DOWN = false; window.DELAY = +(new URLSearchParams(location.search).get('delay') || 80);
const SERVER = { gone: {}, done: false, timer: null };
function call(fn, ...a) {
  CALLS.push([fn].concat(a));
  return new Promise((ok, bad) => setTimeout(() => {
    if (DOWN) return bad(new Error('no connection'));
    if (fn === 'dayLoad') { const d = JSON.parse(JSON.stringify(LOAD)); d.items = d.items.filter(x => !SERVER.gone[x.id]); d.doneForToday = SERVER.done; d.timer = SERVER.timer; return ok(d); }
    if (fn === 'todoSet') { SERVER.gone[a[0]] = 1; return ok({}); }
    if (fn === 'blockAccept') { SERVER.gone[a[0].todoId] = 1; return ok({ id: 'blk', at: a[0].start }); }
    if (fn === 'doneForToday') { SERVER.done = true; return ok({ day: '2026-11-03', stopped: null, beforeSeven: true }); }
    if (fn === 'timerStart') { SERVER.timer = { job: a[0], cls: a[1], startedAt: a[2] }; return ok({ id: 'tm1' }); }
    if (fn === 'timerStop') { SERVER.timer = null; return ok({}); }
    ok({});
  }, DELAY));
}
window.DONE = null;
window.D = DayScreen.mount(document.getElementById('d'), call, { now: () => NOW, names: () => [], onDone: (r) => { DONE = r; } });
</script></body></html>'''
tmp = tempfile.mkdtemp()
path = os.path.join(tmp, 'day.html'); open(path, 'w', encoding='utf-8').write(page)
URL = Path(path).as_uri()

res = []
def check(n, c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    calls = lambda: pg.evaluate('CALLS')
    last = lambda: pg.evaluate('CALLS[CALLS.length-1]')
    pg.goto(URL); pg.wait_for_function('CALLS.some(c => c[0]==="dayLoad") && document.querySelectorAll(".ds .les").length > 0')
    pg.wait_for_timeout(150)

    # ---- the timeline
    les = pg.eval_on_selector_all('.ds .les', 'b => b.map(x => [x.querySelector("b").textContent, getComputedStyle(x).backgroundColor, x.textContent])')
    check('four lessons in time order, each a solid block in its class colour: %s' % [l[0] for l in les],
          [l[0] for l in les] == ['9AS', '10C2', '10S2', '12C'] and les[0][1] == 'rgb(198, 40, 40)' and les[1][1] == 'rgb(0, 131, 143)')
    check('a built lesson says so; the unplanned one says "not planned" with a question mark', '✓ built' in les[0][2] and 'not planned' in les[2][2] and '?' in les[2][2])
    ghosts = pg.eval_on_selector_all('.ds .ghost', 'b => b.map(x => [x.closest(".slot").querySelector(".when").textContent, x.querySelector(".s").textContent])')
    check('suggested blocks: marking in the free P2 at 10:25, the build after school at 15:15: %s' % ghosts,
          ['10:25', 'Mark 9AS key homework · 60 min'] in ghosts and ['15:15', 'Build 10S2 P4 · 40 min'] in ghosts)
    check('the shutdown card at 17:00 with a gold "Done for today"', pg.inner_text('.ds .shut') .startswith('Shut down') and
          pg.evaluate("getComputedStyle(document.querySelector('[data-ds=done]')).backgroundColor") == 'rgb(250, 187, 46)')
    w = pg.inner_text('[data-ds=work]')
    check('workload line: over, in amber, with Ulhu stirring (%s)' % w, 'Over by' in w and pg.locator('[data-ds=work] img.ulhu.stir').count() == 1 and
          pg.evaluate("document.querySelector('[data-ds=work] img').src.startsWith('data:image')"))

    # ---- the to-dos (B3)
    say = pg.inner_text('[data-ds=say]')
    check('Ulhu\'s line above the to-dos, with his sprite: "%s"' % say, say in json.loads(pg.evaluate('JSON.stringify(DayScreen.SAY.over)')) and pg.locator('[data-ds=say] img').count() == 1)
    todos = pg.eval_on_selector_all('.ds .todo', 'b => b.map(x => x.textContent)')
    check('seven to-dos shown, most urgent first, the rest behind "+ 1 more"', len(todos) == 7 and todos[0].startswith('9AS') and pg.inner_text('[data-ds=all]') == '+ 1 more')
    check('each class to-do carries its class chip in the class colour; yesterday\'s is tagged', pg.evaluate("getComputedStyle(document.querySelector('.ds .todo .cc')).backgroundColor") == 'rgb(198, 40, 40)' and 'yesterday' in todos[0])
    check('rituals sit in their own row', pg.inner_text('.ds .rit') == 'Walk')
    pg.click('[data-ds=all]')
    check('"+ 1 more" opens the whole list', pg.locator('.ds .todo').count() == 8)

    # ---- the timer: start buttons in the page, the running timer in a bar fixed at the top
    starts = pg.eval_on_selector_all('[data-ds=go]', 'b => b.map(x => [x.textContent, getComputedStyle(x).backgroundColor])')
    check('start buttons for the likeliest jobs, in the class colour: %s' % [s[0] for s in starts], starts and starts[0][0] == '▶ Marking 9AS' and starts[0][1] == 'rgb(198, 40, 40)')
    check('no bar while nothing runs', pg.evaluate('D.bar.hidden') and not pg.evaluate("document.body.classList.contains('ds-running')"))
    pg.click('[data-ds=go] >> nth=0'); pg.wait_for_timeout(30)
    bar = pg.evaluate("(() => { const r = D.bar.getBoundingClientRect(), s = getComputedStyle(D.bar); return [D.bar.hidden, s.position, r.top, D.bar.textContent, getComputedStyle(D.bar.querySelector('.run')).borderBottomColor]; })()")
    barcol = pg.evaluate("[getComputedStyle(D.bar.querySelector('.run')).color, getComputedStyle(D.bar.querySelector('.run')).display]")
    check('the bar reads well: white text, laid out in a row (%s)' % barcol, barcol == ['rgb(255, 255, 255)', 'flex'])
    check('starting shows the bar at once, fixed at the very top, navy with a gold edge: %s' % bar[3], bar[0] is False and bar[1] == 'fixed' and bar[2] == 0 and 'Marking 9AS · 0 min' in bar[3] and bar[4] == 'rgb(250, 187, 46)')
    check('the page makes room for the bar, and the Start buttons stay in the page', pg.evaluate("document.body.classList.contains('ds-running')") and pg.locator('[data-ds=go]').count() == len(starts))
    if os.environ.get('SHOTS'): pg.screenshot(path=os.path.join(os.environ['SHOTS'], 'day-light-running.png'))
    pg.wait_for_timeout(200)
    c = last(); check('the server is asked to start Marking 9AS from the phone', c[0] == 'timerStart' and c[1] == 'Marking' and c[2] == '9AS' and c[4] == 'phone')
    pg.mouse.wheel(0, 900); pg.wait_for_timeout(50)
    check('the bar stays at the top while the page scrolls', pg.evaluate('D.bar.getBoundingClientRect().top') == 0)
    pg.click('.ds-bar [data-dt=stop]'); pg.wait_for_timeout(250)
    check('Stop in the bar stops it: bar gone, room given back', pg.evaluate('D.bar.hidden') and last()[0] == 'timerStop' and not pg.evaluate("document.body.classList.contains('ds-running')"))
    pg.click('[data-ds=pick]')
    check('"More..." opens the job picker (no second "Likeliest" row)', pg.is_visible('[data-ds=picker]') and pg.locator('[data-dt=job]').count() == 6 and 'Likeliest' not in pg.inner_text('[data-ds=picker]'))
    pg.click('[data-dt=job][data-v="Emails"]'); pg.click('[data-dt=start]'); pg.wait_for_timeout(250)
    check('a job from the picker runs in the top bar and the picker closes', 'Emails' in pg.evaluate('D.bar.textContent') and not pg.is_visible('[data-ds=picker]'))
    pg.click('.ds-bar [data-dt=stop]'); pg.wait_for_timeout(250)

    # ---- tick, move, suggestions
    pg.click('.ds .todo[data-todo="d"] [data-ds=tick]'); pg.wait_for_timeout(20)
    check('ticking shows a gold rune and strikes it through at once', pg.locator('.ds .todo.done[data-todo="d"] .rune').count() == 1 and
          pg.evaluate("getComputedStyle(document.querySelector('.ds .todo.done .s')).textDecorationLine") == 'line-through')
    pg.wait_for_timeout(200)
    check('the server is told it is done', last()[:3] == ['todoSet', 'd', 'done'])
    pg.click('.ds .todo[data-todo="g3"] [data-ds=move]'); pg.wait_for_timeout(200)
    check('Move sends it to the next school day (Wednesday) and says so', last() == ['todoSet', 'g3', 'moved', '2026-11-04'] and 'Moved to Wed' in pg.inner_text('[data-ds=msg]') and pg.locator('.ds .todo[data-todo="g3"]').count() == 0)
    pg.evaluate('DOWN=true'); pg.click('.ds .todo[data-todo="g4"] [data-ds=tick]'); pg.wait_for_timeout(250)
    check('no signal: a tick is put back with a message', pg.locator('.ds .todo[data-todo="g4"] [data-ds=tick]').count() == 1 and 'Not ticked' in pg.inner_text('[data-ds=msg]') and
          pg.locator('.ds .todo.done[data-todo="g4"]').count() == 0)
    pg.evaluate('DOWN=false')
    pg.click('.ds .ghost[data-todo="b"] [data-ds=no]')
    check('the cross hides a suggestion', pg.locator('.ds .ghost[data-todo="b"]').count() == 0)
    n = len(calls()); pg.click('.ds .ghost[data-todo="c"] [data-ds=yes]'); pg.wait_for_timeout(400)
    acc = [x for x in calls()[n:] if x[0] == 'blockAccept']
    check('Yes books the block (to-do, class, minutes, start) and reloads the day', acc and acc[0][1] == {'todoId': 'c', 'text': 'Mark 9AS key homework', 'cls': '9AS', 'minutes': 60, 'start': '10:25'} and
          any(x[0] == 'dayLoad' for x in calls()[n:]) and 'Booked for 10:25' in pg.inner_text('[data-ds=msg]'))

    # ---- shut down
    pg.click('[data-ds=done]'); pg.wait_for_timeout(250)
    check('"Done for today" tells the server, shows the day shut, and hands the page the result (for Ulhu\'s ritual)',
          last()[0] == 'doneForToday' and 'Done for today' in pg.inner_text('.ds .shut.done') and pg.evaluate('DONE && DONE.beforeSeven') is True)

    # ---- opening again: at once from the saved copy, ticks and crosses kept
    pg.goto(URL + '?delay=1500'); pg.wait_for_timeout(150)
    check('opening again shows the saved copy at once, saying it is getting the latest', pg.locator('.ds .les').count() == 4 and pg.locator('[data-ds=saved]').count() == 1)
    check('the tick (with its rune, shown once), the dismissed suggestion and the shutdown are all kept', pg.locator('.ds .todo.done[data-todo="d"] .rune').count() == 1 and pg.locator('.ds .todo[data-todo="d"]').count() == 1 and
          pg.locator('.ds .ghost[data-todo="b"]').count() == 0 and pg.locator('.ds .shut.done').count() == 1)
    pg.wait_for_function('!document.querySelector("[data-ds=saved]")', timeout=5000)
    check('the latest copy replaces it quietly', pg.locator('[data-ds=saved]').count() == 0 and pg.locator('.ds .les').count() == 4)

    # ---- the clock: Ulhu at shutdown time and after seven
    pg.evaluate("NOW = Date.parse('2026-11-03T19:05:00'); D.draw()")
    check('after seven Ulhu\'s line goes quiet', pg.inner_text('[data-ds=say]') in json.loads(pg.evaluate('JSON.stringify(DayScreen.SAY.late)')))

    # ---- Light and Dark
    light = pg.evaluate("[getComputedStyle(document.querySelector('.ds-main')).backgroundColor, getComputedStyle(document.querySelector('.ds h3')).color]")
    pg.evaluate("document.documentElement.dataset.theme='dark'"); pg.wait_for_timeout(50)
    dark = pg.evaluate("[getComputedStyle(document.querySelector('.ds-main')).backgroundColor, getComputedStyle(document.querySelector('.ds h3')).color, getComputedStyle(document.querySelector('.ds .todo')).color]")
    check('Light: pale page, navy headings (%s)' % light, light == ['rgb(237, 242, 250)', 'rgb(13, 27, 94)'])
    check('Dark: deep page, gold headings, light text (%s)' % dark, dark == ['rgb(14, 20, 36)', 'rgb(250, 187, 46)', 'rgb(230, 234, 245)'])
    pg.evaluate("document.documentElement.dataset.theme='auto'")
    pg.emulate_media(color_scheme='dark'); pg.wait_for_timeout(50)
    check('Auto follows the phone (dark here)', pg.evaluate("getComputedStyle(document.querySelector('.ds-main')).backgroundColor") == 'rgb(14, 20, 36)')
    if os.environ.get('SHOTS'): pg.screenshot(path=os.path.join(os.environ['SHOTS'], 'day-dark.png'), full_page=True)

    # ---- the home PC pop-up
    pop = lambda at, extra='': pg.evaluate("(() => { document.querySelectorAll('.dp').forEach(x => x.remove()); window.NOTTHAT = 0; const p = DayPopup.show(document.body, Object.assign({ job: 'Building lessons', cls: '10S2', since: Date.parse('2026-11-03T18:02:00'), now: () => Date.parse('2026-11-03T" + at + ":00'), onNotThat: () => NOTTHAT++, ledger: [{ job: 'Building lessons', cls: '10S2', minutes: 48 }, { job: 'Emails', cls: '', minutes: 18 }] }, " + (extra or '{}') + ")); return [p.el.dataset.variant, p.el.textContent, p.el.className]; })()")
    d = pop('18:10')
    check('by day: his voice, what he is counting, since when, and "Not that"', d[0] == 'day' and 'I see Building lessons 10S2' in d[1] and 'Counting since 18:02' in d[1] and pg.locator('.dp [data-dp=not]').count() == 1)
    pg.click('.dp [data-dp=not]')
    check('"Not that" tells the page and the pop-up goes', pg.evaluate('NOTTHAT') == 1 and pg.locator('.dp').count() == 0)
    n = pop('19:20')
    if os.environ.get('SHOTS'): pg.screenshot(path=os.path.join(os.environ['SHOTS'], 'popup-night.png'))
    check('after seven: "one eye open" (N3), dozing with Zs, no question and no button', n[0] == 'night' and 'sleep' in n[2] and 'Mmm... one eye open. Building lessons 10S2, still.' in n[1] and
          pg.locator('.dp .zz').count() == 1 and pg.locator('.dp [data-dp=not]').count() == 0)
    check("under his words, tonight's tally per job, then 'Fix my dreams in the report.'", pg.locator('.dp .ledger div').count() == 2 and '48 min' in n[1] and n[1].index('48 min') < n[1].index('Fix my dreams in the report.'))
    check("none of N2's wording", 'scribble' not in n[1] and 'ledger' not in n[1].lower() and 'knock' not in n[1])
    ev = pop('18:10', "{ job: '<img src=x onerror=alert(1)>' }")
    check('a job name is shown as text, never as markup', pg.locator('.dp img[src=x]').count() == 0 and '<img' in ev[1])

    check('no page errors', not errs)
    if errs: print(errs)
    b.close()
failed = res.count(False)
print(f'\n{failed} FAILED' if failed else '\nAll passed'); sys.exit(1 if failed else 0)
