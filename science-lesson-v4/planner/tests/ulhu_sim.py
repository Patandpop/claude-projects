"""Ulhu redesign end to end: the real Game.gs on the Apps Script mock behind a local server, the page in headless Chromium at phone size.
Run: python tests/ulhu_sim.py  (add --shots DIR to save screenshots). Synthetic data only."""
import os, sys, subprocess, time
from playwright.sync_api import sync_playwright
P = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'; SP = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else __import__('tempfile').mkdtemp()
js = ''.join(open(P + f, encoding='utf-8').read() + '\n' for f in ['game-ulhu.js', 'game-pixel.js', 'game-runes.js', 'game-temple.js', 'game-stone.js', 'game-bar.js', 'game-omens.js', 'game-tabs.js', 'game-blood.js', 'game-scroll.js', 'game-glass.js', 'game-highvespers.js', 'game-lair.js', 'game-brew.js', 'game-gate.js', 'game-levelup.js', 'game-faint.js', 'game-wall.js', 'game-grimoire.js', 'game-den.js', 'game-dicewater.js', 'game-golems.js', 'game-ui.js', 'game-oracle.js', 'game-pairs.js'])
page = '''<!doctype html><meta charset="utf-8"><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0;background:#0d1b3a">
<div style="height:60px;background:#0a1020;color:#fff">8AG header</div><div id=u></div><nav style="position:fixed;bottom:0;left:0;right:0;height:62px;background:#0a1020"></nav>
<script>window.CALLS=[];function call(fn,...args){CALLS.push(fn);window.ARGS=window.ARGS||[];ARGS.push(args);return fetch('/c',{method:'POST',body:JSON.stringify({fn,args})}).then(r=>r.json()).then(x=>{if(x.err)throw new Error(x.err);return x.ok;});}</script>
<script>''' + js + '''</script><script>GameUI.mount(document.getElementById('u'),call,{wide:false});</script>'''
f = os.path.join(SP, 'ul2.html'); open(f, 'w', encoding='utf-8').write(page)
# a free port of its own: two chats running this at once used to share one test server (and its data), which made
# checks fail at random (2026-10-29)
_s = __import__('socket').socket(); _s.bind(('127.0.0.1', 0)); PORT = str(_s.getsockname()[1]); _s.close()
srv = subprocess.Popen(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ulhu_server.js'), PORT, f], stdout=subprocess.PIPE, text=True)
srv.stdout.readline()
res = []
def check(n, c): res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n)
shots = '--shots' in sys.argv
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://localhost:' + PORT + '/', timeout=90000); pg.wait_for_timeout(2500)   # a busy PC can take over 30 s to load it
        try: pg.wait_for_function("document.querySelectorAll('img[alt=runes]').length > 5 && document.querySelector('.uz-coins b')", timeout=30000)
        except Exception: pass   # the first full paint, which a busy PC makes slow
        # the level-up scene covers the screen for 6 s and a tap ends it, which would swallow the next tap of these checks:
        # level ups here are only counted; the scene itself is played and checked on its own near the end (1U.11)
        pg.evaluate("window.LU_REAL = LEVELUP.play; window.LU_CALLS = []; LEVELUP.play = (h, l) => { LU_CALLS.push(l); return Promise.resolve(); }; 0")   # the 0: a string ending in a function would be called by evaluate
        check('banner shows coins (after-work life ticks pay x1.5 at 4.40 pm), level title and Ulhu', int(pg.inner_text('.uz-coins b')) > 400 and pg.locator('.uz-me img').count() >= 1)
        check('four tabs, Rituals first with a count badge', pg.locator('.uz-tabs button').count() == 4 and pg.locator('.uz-tabs button b.bd:not([hidden])').count() >= 1)
        check('The Call has Toil; the Grimoire opens folded: Breakwater, The Teaching Trench, The Surface World', 'Toil' in pg.inner_text('.uz-pane >> nth=0') and all(t in pg.inner_text('.uz-pane >> nth=1') for t in ['Breakwater', 'The Teaching Trench', 'The Surface World']))
        sizes = pg.evaluate("[...document.querySelectorAll('img[alt=runes]')].map(i => i.src)")
        check('the currency is runes: single runes, the cairn and the portal all appear', len(sizes) > 5 and pg.evaluate("[RUNES.pick(6,'x').src, RUNES.pick(25).src, RUNES.pick(600).src].every((s, i, a) => a.indexOf(s) === i)") and pg.evaluate("RUNES.pick(25).src") in sizes)
        check('the same row keeps the same rune between repaints', pg.evaluate("RUNES.pick(6,'g1').src === RUNES.pick(6,'g1').src"))
        check('on a Friday there is no review card (High Vespers is Sunday to Tuesday); Ulhu says a line of doom, not orders', pg.locator('.uz-rv, .uz-hvtab').count() == 0 and len(pg.inner_text('.uz-say')) > 10 and 'Next:' not in pg.inner_text('.uz-say'))
        pg.evaluate("(() => { const b = document.createElement('button'); b.className = 'uz-hvtab'; b.dataset.a = 'hvopen'; document.querySelector('.uz-pane').prepend(b); })()"); pg.click('.uz-hvtab'); pg.wait_for_timeout(600)
        check('High Vespers opens full screen with its sections and a Back button', pg.locator('.uz-hvback').count() == 1 and pg.locator('.hv-sec').count() >= 2)
        pg.click('.uz-hvback'); pg.wait_for_timeout(400)
        check('Back returns to The Call', pg.locator('.uz-hvback').count() == 0 and 'Toil' in pg.inner_text('.uz-pane >> nth=0'))
        if shots: pg.screenshot(path=os.path.join(SP, 's1.png'))
        c0 = int(pg.inner_text('.uz-coins b'))
        pg.locator('.uz-pane >> nth=0').locator('.uz-strow:not(.done) [data-a=tick]').first.click(); pg.wait_for_timeout(80)
        c1 = int(pg.inner_text('.uz-coins b'))
        check('a tick pays at once, before the server answers', c1 > c0 and ('Ticked:' in pg.inner_text('.uz-undo') or 'Marked:' in pg.inner_text('.uz-undo')))
        pg.wait_for_timeout(900)
        check('the server agrees', int(pg.inner_text('.uz-coins b')) == c1)
        check('1.16 every tick carries the moment it was made and its own id', pg.evaluate("(() => { const a = ARGS[CALLS.lastIndexOf('gameTick')]; const m = a && a[a.length - 1]; return !!(m && m.at && m.aid); })()"))
        n_loads = pg.evaluate("CALLS.filter(c => c === 'gameLoad').length"); pg.evaluate("window.dispatchEvent(new Event('focus'))"); pg.wait_for_timeout(700)
        check('1.10 coming back to a page whose day has passed reloads it from the server', pg.evaluate("CALLS.filter(c => c === 'gameLoad').length") == n_loads + 1)
        pg.locator('[data-a=undo]').dispatch_event('click'); pg.wait_for_timeout(900)   # pressed directly: on a busy PC the undo line can fold away (10 s) first
        check('Undo puts it back (screen and server)', int(pg.inner_text('.uz-coins b')) == c0 and 'Undone' in pg.inner_text('.uz-undo'))
        # 1U.1 (Patryk 29 Oct): a boss stage due today sits in The Call; tapping it must land a hit
        st = pg.locator('.uz-pane >> nth=0').locator('[data-a=stage]')
        check('1U.1 a boss stage due today is listed in The Call', st.count() >= 1)
        st.first.click(); pg.wait_for_timeout(1500)
        check('...and tapping it lands a hit on the boss (screen and server)', 'hit:' in pg.inner_text('.uz-undo').lower() and 'gameBossStage' in pg.evaluate('CALLS'))
        pg.locator('[data-a=undo]').dispatch_event('click'); pg.wait_for_timeout(900)   # pressed directly: on a busy PC the undo line can fold away (10 s) first
        check('...and Undo reopens the stage', 'Undone' in pg.inner_text('.uz-undo') and pg.locator('.uz-pane >> nth=0').locator('[data-a=stage]').count() >= 1)
        # swipe to Quests
        def swipe(dx):
            bx = pg.locator('.uz-body').bounding_box(); y = bx['y'] + 200; x = bx['x'] + bx['width'] / 2
            pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + dx / 2, y, steps=5); pg.mouse.move(x + dx, y, steps=5); pg.mouse.up(); pg.wait_for_timeout(500)
        swipe(-150)
        check('swiping left opens Quests', pg.evaluate("document.querySelectorAll('.uz-tabs button')[1].classList.contains('on')"))
        pg.click('[data-a=fold][data-v=teach]'); pg.wait_for_timeout(300); t = pg.inner_text('.uz-pane >> nth=1')
        check('the Teaching area opens: rituals, then quests with date chips, a checklist, marking and bosses', all(x in t for x in ['Rituals', 'Quests', 'today', 'Find the 2024 paper', 'Mark 9AS books', 'Mark the 10S2 test']))
        if shots: pg.screenshot(path=os.path.join(SP, 's2.png'))
        # the wall (WD-1b-ii, 30 Oct): this week and next in stained glass at the top of the Teaching area; a tap names the piece
        wl = pg.evaluate("(() => { const w = document.querySelector('.uz-pane:nth-child(2) .uz-wall'); if (!w) return null; return { pcs: w.querySelectorAll('.pc').length, head: w.querySelector('.uz-wallh').textContent }; })()")
        check('the wall: ten days of stained glass at the top of Teaching, its count in the heading: ' + str(wl), wl and wl['pcs'] >= 100 and '1 of 3 lessons built' in wl['head'])
        pg.locator('.uz-pane:nth-child(2) .uz-wall .pc[data-d="6"][data-p="3"][data-part="lesson"]').first.click(); pg.wait_for_timeout(300)   # a real tap on 13D, Tue 27 Oct P3 (the checks run on Fri 23 Oct, so next week is days 5 to 9)
        check('tapping a piece says its day, period and class', 'Tue 27 Oct' in pg.inner_text('.uz-pane:nth-child(2) .uz-walli') and '13D' in pg.inner_text('.uz-pane:nth-child(2) .uz-walli') and 'P3' in pg.inner_text('.uz-pane:nth-child(2) .uz-walli'))
        pg.locator('.uz-pane >> nth=1').locator('[data-a=step]').nth(1).click(); pg.wait_for_timeout(1400)
        check('a checklist step ticks', any(x in pg.inner_text('.uz-pane >> nth=1') for x in ['2/3', '2 of 3']))
        hs = pg.evaluate("[...document.querySelectorAll('.uz-pane:nth-child(2) .sc-card')].map(c => [c.querySelectorAll('.sc-step').length, c.querySelector('.sc-body').offsetHeight])")
        check('1U.2 a quest with no steps is a compact card, one with steps keeps its room: ' + str(hs), any(n == 0 and h < 110 for n, h in hs) and all(h >= 120 for n, h in hs if n) and all(h >= 80 for n, h in hs))
        q = pg.locator('.uz-pane >> nth=1').locator('[data-scroll] [data-a=tick], .uz-q [data-a=tick]').first; q.click()   # the scroll is sealed and burns first
        try: pg.wait_for_function("[...document.querySelectorAll('.uz-pane')][1].innerText.includes('Vanquished')", timeout=20000)
        except Exception: pass
        check('a fulfilled quest goes to Vanquished', 'Vanquished' in pg.inner_text('.uz-pane >> nth=1'))
        pg.locator('[data-a=banish]').first.click(); pg.locator('[data-a=banish]').first.click()
        try: pg.wait_for_function("document.querySelectorAll('.uz-bossw').length == 1", timeout=20000)
        except Exception: pass
        check('Banish (two taps) removes a boss, Undo brings it back', pg.locator('.uz-bossw').count() == 1)
        pg.locator('[data-a=undo]').dispatch_event('click')   # pressed directly: the undo line folds away 10 s after the last tap
        try: pg.wait_for_function("document.querySelectorAll('.uz-bossw').length == 2", timeout=6000)
        except Exception: pass
        check('...and it is back', pg.locator('.uz-bossw').count() == 2)
        # boss form
        pg.click('.uz-dock [data-v=boss]'); pg.wait_for_timeout(200)
        pg.fill('[data-name]', 'Mark the 9AS mocks'); pg.click('[data-a=tmpl]'); pg.click('[data-v="size:10"]'); pg.wait_for_timeout(100)
        check('boss form: size by hours (10h pays 300) and the marking template', '300' in pg.inner_text('.uz-total') and pg.locator('[data-step]').count() == 4)
        if shots: pg.screenshot(path=os.path.join(SP, 's3.png'))
        pg.click('[data-a=submit]'); pg.wait_for_timeout(900)
        check('the new boss appears with its creature', 'Mark the 9AS mocks' in pg.inner_text('.uz-pane >> nth=1') and 'Drowned Leviathan' in pg.inner_text('.uz-pane >> nth=1'))
        # edit a boss after summoning it: rename it and move it to Life (Patryk 2026-10-27)
        pg.locator('.uz-pane >> nth=1').locator('.uz-bossw', has_text='Mark the 9AS mocks').locator('[data-a=editb]').click(); pg.wait_for_timeout(300)
        check('a boss opens in its form to edit', 'Edit boss' in pg.inner_text('.uz-form') and pg.locator('.uz-form [data-step]').count() == 4)
        pg.fill('.uz-form [data-name]', 'Mark the 9AS mock papers'); pg.click('.uz-form [data-v="grp:life"]'); pg.click('.uz-form [data-a=submit]'); pg.wait_for_timeout(1200)
        life = pg.evaluate("[...document.querySelectorAll('.uz-pane')[1].querySelectorAll('.uz-sec')].find(function(x){ return /Surface/.test(x.innerText); }).innerText")
        check('the edited boss is renamed and now lives in Life', 'Mark the 9AS mock papers' in life)
        # curses tab
        pg.click('.uz-tabs button >> nth=2'); pg.wait_for_timeout(400)
        hp0 = pg.inner_text('.hpt')
        pg.locator('[data-a=curse]').first.dblclick(); pg.wait_for_timeout(900)
        check('a double tap on a curse logs it straight away (no sigils)', pg.locator('[data-sig]').count() == 0)
        check('a curse costs health, not coins', pg.inner_text('.hpt') != hp0)
        c2 = int(pg.inner_text('.uz-coins b')); pg.locator('[data-a=bless]').first.click(); pg.wait_for_timeout(900)
        check('a blessing pays', int(pg.inner_text('.uz-coins b')) > c2)
        nm = pg.evaluate("[...document.querySelectorAll('.uz-pane')[2].querySelectorAll('[data-a=bless] span span:last-child')].map(function(x){ return x.innerText.trim(); }).filter(Boolean)")
        check('blessings are in A to Z order', nm == sorted(nm, key=str.lower))
        check('no x2 blessing and no chain bar', pg.locator('.uz-x2').count() == 0 and '/ 8' not in pg.inner_text('.uz-pane >> nth=2'))
        if shots: pg.screenshot(path=os.path.join(SP, 's4.png'))
        # den (2026-10-28): the Round Grotto, the Night Market through its archway, dice with every keeper once a day
        coins = lambda: int(pg.inner_text('.uz-coins b'))
        pg.click('.uz-tabs button >> nth=3')
        try: pg.wait_for_function("document.querySelector('.dn-grot .dn-cv') && document.querySelectorAll('[data-a=dn-slot]').length == 10", timeout=25000)
        except Exception: pass
        pg.wait_for_timeout(600)
        check('the Den opens on the Round Grotto: rings, wardrobe, chests, the archway, then the Oracle', pg.locator('.dn-grot .dn-cv').count() == 1 and pg.locator('[data-a=dn-slot]').count() == 10 and pg.locator('[data-a=dn-ward]').count() == 1 and pg.locator('[data-a=dn-chest]').count() == 2 and pg.locator('.dn-arch').count() == 1 and 'Oracle' in pg.inner_text('.uz-pane >> nth=3'))
        check('the grotto is drawn from his own room (not blank)', pg.evaluate("(() => { const d = document.querySelector('.dn-cv').getContext('2d').getImageData(0, 0, 192, 216).data; let n = 0; for (let i = 0; i < d.length; i += 4) n += d[i] + d[i + 1] + d[i + 2] > 60 ? 1 : 0; return n; })()") > 4000 and pg.locator('.dn-u img').count() >= 1)
        if shots: pg.screenshot(path=os.path.join(SP, 's5.png'))
        pg.click('[data-a=dn-slot][data-v=hang4]'); pg.wait_for_timeout(300)
        check('tapping an empty ring lists what he owns for that spot', 'RIGHT WALL' in pg.inner_text('.dn-panel').upper() and pg.locator('[data-a=dn-place]').count() >= 1)
        pg.locator('[data-a=dn-place]').first.click(); pg.wait_for_timeout(1200)
        check('placing it there fills the spot (server agrees)', pg.locator('.dn-card.on').count() == 1 and pg.locator('[data-a=dn-slot][data-v=hang4]:not(.empty)').count() == 1)
        pg.click('[data-a=dn-ward]'); pg.wait_for_timeout(300)
        check('the wardrobe opens the cloaks he owns', 'wardrobe' in pg.inner_text('.dn-panel').lower() and pg.locator('.dn-panel [data-a=wear]').count() >= 1)
        pg.locator('[data-a=dn-chest]').nth(1).click(); pg.wait_for_timeout(300)
        # the stamp is timed inside the page (a busy test machine made outside timings unreliable): when it first shows
        # and when it goes, measured from the tap, with every paint (the server reply too) in between
        pg.evaluate("(() => { window.STAMPT = { on: null, off: null, gaps: 0 }; let was = false; const t0 = { v: 0 }; window.STAMPT0 = t0;"
                    " document.addEventListener('click', (e) => { if (e.target.closest('[data-a=claim]')) t0.v = performance.now(); }, true);"
                    " new MutationObserver(() => { if (!t0.v) return; const on = !!document.querySelector('.dn-stamp'), t = performance.now() - t0.v;"
                    " if (on && STAMPT.on == null) STAMPT.on = t; if (!on && was) { if (t < 2400) STAMPT.gaps++; else if (STAMPT.off == null) STAMPT.off = t; } was = on; }).observe(document.body, { childList: true, subtree: true }); })()")
        c4 = coins(); pg.locator('.dn-panel [data-a=claim]').nth(1).click(); pg.wait_for_timeout(900)
        check('a chest is the Hoard: breaking its seal claims the reward (80)', coins() == c4 - 80 and 'Claimed' in pg.inner_text('.uz-undo'))
        pg.wait_for_function("STAMPT.off != null", timeout=8000); st = pg.evaluate("STAMPT")
        check('1U.4 the CLAIMED stamp shows at once, stays through the server reply, then fades (%s)' % st, st['on'] is not None and st['on'] < 900 and st['gaps'] == 0 and 2400 <= st['off'] < 8000)   # the fade waits for the server reply, which a busy PC slows
        pg.click('.uz-dock [data-a=den][data-v=market]'); pg.wait_for_timeout(1500)
        check('the Night Market has seven stalls round the well, each with its keeper', pg.locator('.dn-booth').count() == 7 and pg.locator('img.dn-plz').count() == 1 and 'Mother Skein' in pg.inner_text('.dn-mkt'))
        if shots: pg.screenshot(path=os.path.join(SP, 's6.png'))
        pg.click('[data-a=dn-visit][data-v=tailor]'); pg.wait_for_timeout(2600)
        check('walking into the tailor shows Madame Moray and her wares', 'Madame Moray' in pg.inner_text('.dn-kh') and pg.locator('.dn-ware').count() >= 60)
        c3 = coins(); pg.locator('[data-a=dn-wear][data-id="hat-2"]').click(); pg.wait_for_timeout(900)
        check('buying an outfit (90) dresses Ulhu', coins() == c3 - 90 and pg.locator('.uz-me img').count() >= 2)
        check('ware cards are full size at phone width', pg.evaluate("Math.min(...[...document.querySelectorAll('.dn-ware')].map(function(c){ return c.getBoundingClientRect().width; }))") > 80)
        # haggle with the weaver: the stake first, then the table; one claim, then walk out (a loss)
        pg.click('.uz-dock [data-a=den][data-v=market]'); pg.wait_for_timeout(500); pg.click('[data-a=dn-visit][data-v=weaver]'); pg.wait_for_timeout(2600)
        pg.click('[data-a=dn-peek]'); pg.wait_for_timeout(300)
        check('1U.9 Haggle first asks which ONE item you play for (up to five, the best picked, its win and lose prices)', 'What you play for' in pg.inner_text('.dn-peek') and 2 <= pg.locator('.dn-pk').count() <= 5 and pg.locator('.dn-pk.on').count() == 1 and pg.locator('.dn-pk.on .ok').count() == 1)
        pg.locator('.dn-pk').nth(1).click(); pg.wait_for_timeout(250); hag_id = pg.locator('.dn-pk.on').get_attribute('data-id')
        check('...tapping another item picks it instead', pg.locator('.dn-pk').nth(1).get_attribute('aria-pressed') == 'true')
        pg.click('[data-a=dn-sit]'); pg.wait_for_timeout(1800)
        check('the dice table: her portrait, five bone dice in your hand', pg.locator('.dn-kbig').count() == 1 and pg.locator('.dn-hand .dn-die').count() == 5)
        if shots: pg.screenshot(path=os.path.join(SP, 's7.png'))
        if pg.locator('[data-a=dn-claim]:not([disabled])').count(): pg.click('[data-a=dn-claim]'); pg.wait_for_timeout(1800)
        pg.click('[data-a=dn-walk]'); pg.click('[data-a=dn-walk]'); pg.wait_for_timeout(1200)
        check('walking out settles it as a loss: UNDONE, then that item at its new price', 'UNDONE' in pg.inner_text('.dn-res') and pg.locator('.dn-res .dn-newp s').count() == 1)
        pg.click('[data-a=dn-leave]'); pg.wait_for_timeout(400)
        check('back at her stall: only the item played for costs 10% more, no second game', 'Undone' in pg.inner_text('.dn-kh') and pg.locator('[data-a=dn-peek]').count() == 0 and pg.locator('.dn-ware s').count() == 1 and pg.locator('.dn-ware[data-id="' + hag_id + '"] s').count() == 1)
        check('the server refuses a second game with the same keeper today', 'already played' in pg.evaluate("call('gameHaggle', 'weaver', 'start', '" + hag_id + "').then(function () { return 'ok'; }, function (e) { return e.message; })"))
        # a second keeper is still playable: the glassblower, played to the end
        pg.click('.uz-dock [data-a=den][data-v=market]'); pg.wait_for_timeout(500); pg.click('[data-a=dn-visit][data-v=glass]'); pg.wait_for_timeout(2600)
        pg.click('[data-a=dn-peek]'); pg.wait_for_timeout(300); pg.click('[data-a=dn-sit]'); pg.wait_for_timeout(1500)
        pg.evaluate("window.DW_SEEN = null; window.DW_LOOK = setInterval(() => { const w = document.querySelector('.dw-wrap'); if (w) DW_SEEN = { word: w.querySelector('.dw-word').textContent, drawn: w.querySelector('canvas').width }; }, 60); 0")
        t0 = time.time()
        while time.time() - t0 < 120 and not pg.locator('.dn-res').count():   # call Liar! whenever we can, else the lowest claim
            try:   # a slow PC can still be redrawing the table: try again next time round
                if pg.locator('[data-a=dn-next]:not([disabled])').count(): pg.click('[data-a=dn-next]', timeout=5000)
                elif pg.locator('[data-a=dn-liar]:not([disabled])').count(): pg.click('[data-a=dn-liar]', timeout=5000)
                elif pg.locator('[data-a=dn-claim]:not([disabled])').count(): pg.click('[data-a=dn-claim]', timeout=5000)
            except Exception: pass
            pg.wait_for_timeout(250)
        pg.wait_for_selector('.dn-res', timeout=10000)
        won = pg.locator('.dn-res.ok').count() == 1
        check('a second keeper plays the same day, to the end', pg.locator('.dn-res').count() == 1)
        dw = pg.evaluate("clearInterval(DW_LOOK), DW_SEEN")
        check('1U.6 at the end the sea comes over the whole table (D3) and the word is ' + ('VANQUISHT' if won else 'UNDONE') + ': ' + str(dw), dw and dw['drawn'] == 160 and dw['word'] == ('VANQUISHT' if won else 'UNDONE') and pg.locator('.dw-wrap').count() == 0)
        pg.click('[data-a=dn-leave]'); pg.wait_for_timeout(400)
        check('the result is kept at that stall, on that one item (Vanquisht and less on a win, Undone and 10% more on a loss)', ('Vanquisht' if won else 'Undone') in pg.inner_text('.dn-kh') and pg.locator('.dn-ware s').count() == 1)
        pg.click('.uz-dock [data-a=den][data-v=market]'); pg.wait_for_timeout(500)
        check('the plaza marks both stalls with today\'s result', pg.locator('.dn-booth i').count() == 2)
        pg.click('.uz-dock [data-a=den][data-v=room]'); pg.wait_for_timeout(600)
        pg.wait_for_timeout(1500)
        check('the Oracle: a stained-glass rose window (canvas) with 35 day panes, the days so far tappable', pg.locator('.orx-win canvas').count() == 1 and pg.locator('.orx-win .rs-over g.jw, .orx-win .rs-over g.rs-fut').count() == 35 and pg.locator('.orx-win [data-od]').count() >= 1)
        pg.locator('.orx-win [data-od]').last.dispatch_event('click'); pg.wait_for_timeout(300)
        check('tapping a day opens its sheet (date, rituals kept, curses and blessings, Vespers) and Close shuts it', pg.locator('.orx-sh').count() == 1 and 'rituals' in pg.inner_text('.orx-sh') and 'blessing' in pg.inner_text('.orx-sh') and 'Vespers' in pg.inner_text('.orx-sh'))
        if shots: pg.screenshot(path=os.path.join(SP, 's7b.png'))
        pg.click('.orx-sh .x'); pg.wait_for_timeout(200)
        check('the day sheet closes', pg.locator('.orx-sh').count() == 0)
        if shots: pg.screenshot(path=os.path.join(SP, 's7.png'))
        # 30 Oct picks: the paper golems (marking bosses) stand under the wall; nothing is summoned until he taps.
        # 31 Oct (Patryk: "they are still bosses"): each golem fights in the bosses' temple arena, on the boss card
        pg.click('.uz-tabs [data-v="1"]'); pg.wait_for_timeout(400)
        g1 = pg.locator('.uz-pane >> nth=1')
        check("golems: this week's books are suggested under the wall, none summoned yet", g1.locator('.uz-gs [data-a=gsum]').count() >= 1 and g1.locator('[data-tp-k^="gm:"]').count() == 0)
        g1.locator('.uz-gs [data-a=gsum]').first.click()
        pg.wait_for_function("window.CALLS.indexOf('gameGolem') >= 0", timeout=20000); pg.wait_for_timeout(1500)   # the summon has been answered and drawn
        pg.evaluate("(() => { const g = document.querySelectorAll('.uz-pane')[1].querySelector('[data-tp-k^=gm]'), p = g.closest('.uz-pane'); p.scrollTop += g.getBoundingClientRect().top - p.getBoundingClientRect().top - 40; })()"); pg.wait_for_timeout(1500)
        drawn = pg.evaluate("(() => { const a = document.querySelectorAll('.uz-pane')[1].querySelector('[data-tp-k^=gm]'); if (!a) return 0; const c = a.querySelector('.tp-scene'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] > 160 && d[i + 2] > 120) n++; return n; })()")
        check('...Summon puts the golem in the boss arena, drawn (' + str(drawn) + ' paper pixels), a stage per sitting', drawn > 40 and g1.locator('[data-a=gstage]').count() >= 1 and 'gameGolem' in pg.evaluate('CALLS'))
        if shots: pg.screenshot(path=os.path.join(SP, 'g1.png'))
        g1.locator('[data-a=gstage]').first.click(); pg.wait_for_timeout(2000)
        check('...a sitting is a claw strike: one block of its health gone (screen and server)', g1.locator('.tp-boss:has([data-a=gstage]) .tp-hpb.tp-lost').count() == 1 and 'Marked:' in pg.inner_text('.uz-undo'))
        g1.locator('[data-a=gpick]').first.click(); pg.wait_for_timeout(300)
        check('...its Edit button offers the eight class colours', g1.locator('.uz-gmt [data-a=gtheme]').count() == 8)
        g1.locator('.uz-gmt [data-t=coral]').click(); pg.wait_for_timeout(1500)
        check('...and a picked colour sticks', ':coral:' in pg.evaluate("document.querySelectorAll('.uz-pane')[1].querySelector('[data-tp-k^=gm]').dataset.tpK"))
        if shots: pg.screenshot(path=os.path.join(SP, 'g2.png'))
        # 2026-10-26: edit after setting, a date picker for quests, sizes not minutes, instant open, no-signal saving
        pg.click('.uz-tabs [data-v="1"]'); pg.wait_for_timeout(400)
        pg.locator('.uz-pane >> nth=1').locator('.uz-strow [data-a=editg]').first.click()
        pg.wait_for_timeout(300)
        check('tapping a ritual opens it to edit (Edit ritual, Save, Archive)', 'Edit ritual' in pg.inner_text('.uz-form') and pg.locator('.uz-form [data-a=farch]').count() == 1)
        check('sizes, not minutes', 'Medium' in pg.inner_text('.uz-form') and ' min' not in pg.inner_text('.uz-form'))
        pg.fill('.uz-form [data-name]', 'Workout'); pg.click('.uz-form [data-a=submit]')
        # wait for the save itself (up to 20 s), not a fixed pause: a busy test machine answers late, not wrongly
        try: pg.wait_for_function("(document.querySelectorAll('.uz-pane')[1] || {}).innerText && document.querySelectorAll('.uz-pane')[1].innerText.indexOf('Workout') >= 0", timeout=20000)
        except Exception: pass
        check('the edit is saved (renamed to Workout)', 'Workout' in pg.inner_text('.uz-pane >> nth=1'))
        pg.click('.uz-tabs [data-v="1"]'); pg.wait_for_timeout(300); pg.click('.uz-dock [data-v=quest]'); pg.wait_for_timeout(300)
        check('the quest form has a date picker', pg.locator('.uz-form input[type=date]').count() == 1)
        pg.fill('.uz-form [data-name]', 'Order ray boxes'); pg.fill('.uz-form input[type=date]', '2026-11-20'); pg.click('.uz-form [data-a=submit]'); pg.wait_for_timeout(1200)
        check('a quest saved with a picked date shows it', 'Order ray boxes' in pg.inner_text('.uz-pane >> nth=1') and 'Fri 20' in pg.locator('.uz-pane >> nth=1').locator('[data-scroll], .uz-q', has_text='Order ray boxes').first.inner_text())
        pg.click('.uz-tabs [data-v="0"]'); pg.wait_for_timeout(300)
        check('The Call lists a quest that is not due yet (Quests ahead)', 'Quests ahead' in pg.inner_text('.uz-pane >> nth=0') and 'Order ray boxes' in pg.inner_text('.uz-pane >> nth=0'))
        pg.click('.uz-tabs [data-v="1"]'); pg.wait_for_timeout(300)
        check('the phone keeps the last screen for an instant open', pg.evaluate("!!JSON.parse(localStorage.getItem('ulhuD')||'null')"))
        pg.context.set_offline(True); pg.click('.uz-tabs [data-v="0"]'); pg.wait_for_timeout(300)
        n0 = pg.evaluate("(JSON.parse(localStorage.getItem('ulhuQ')||'[]')).length")
        pg.locator('.uz-pane >> nth=0').locator('.uz-strow:not(.done) [data-a=tick]').first.click(); pg.wait_for_timeout(800)
        check('with no signal a tick is kept on the phone, not lost', pg.evaluate("(JSON.parse(localStorage.getItem('ulhuQ')||'[]')).length") == n0 + 1 and 'Saved on the phone' in pg.inner_text('.uz-undo'))
        pg.context.set_offline(False); pg.wait_for_timeout(1500)
        check('back online it is sent', pg.evaluate("(JSON.parse(localStorage.getItem('ulhuQ')||'[]')).length") == 0)
        h = pg.evaluate("document.querySelector('.uz').getBoundingClientRect().height")
        check('fills the screen between the header and the bottom bar', 780 > h > 600)
        # 2026-10-27 phase 3: the moon cycles full, half, dark
        pg.click('.uz-moonb'); pg.wait_for_timeout(900)
        check('tapping the moon goes to half moon (work rest)', 'Half moon' in pg.inner_text('.uz-undo'))
        pg.click('.uz-moonb'); pg.wait_for_timeout(900); pg.click('.uz-moonb'); pg.wait_for_timeout(900)
        check('and on round to full moon again', 'Full moon' in pg.inner_text('.uz-undo'))
        # 2026-10-27 phase 1: a two-sided omen, its curse half, then its blessing half as Absolution I
        pg.click('.uz-tabs [data-v="2"]'); pg.wait_for_timeout(400); pg.click('.uz-dock [data-v=curse]'); pg.wait_for_timeout(300)
        pg.click('.uz-form [data-v="type:both"]'); pg.wait_for_timeout(200)
        pg.fill('.uz-form [data-name]', 'Junk food'); pg.fill('.uz-form [data-name2]', 'Cooked from scratch')
        check('the form offers Both with two pictures', pg.locator('.uz-form').inner_text().count('PICTURE') == 2)
        pg.click('.uz-form [data-a=submit]'); pg.wait_for_timeout(1200)
        check('a two-sided omen shows under Both Ways with both names', pg.locator('.uz-two').count() == 1 and 'Cooked from scratch' in pg.inner_text('.uz-two'))
        hpb = pg.inner_text('.hpt'); pg.click('.uz-twl'); pg.wait_for_timeout(1500)
        check('one tap on a curse runs the blood to four sigils', pg.locator('[data-sig]').count() == 4)
        pg.click('[data-sig=Flesh]')
        try: pg.wait_for_function("document.querySelector('.uz-undo') && document.querySelector('.uz-undo').innerText.includes('Flesh')", timeout=12000)
        except Exception: pass
        check('picking a sigil logs it with the curse', 'Flesh' in pg.inner_text('.uz-undo'))
        check('tapping its left half logs the curse', pg.inner_text('.hpt') != hpb)
        check('1U.13 the two-sided omen becomes the stained-glass Absolution card at the very top of the omens', pg.evaluate("(() => { const p = document.querySelectorAll('.uz-pane')[2], a = p.querySelector('.uz-absq .gl-ab'); if (!a) return false; const first = [...p.children].find((n) => n.offsetHeight > 0); return first && first.contains(a) && !p.querySelector('.uz-two .uz-twl[data-id=\"' + a.closest('[data-abs]').dataset.abs + '\"]'); })()"))
        pg.locator('.uz-absq .gl-abB').first.click(); pg.wait_for_function("(document.querySelector('.uz-undo') || {}).innerText && document.querySelector('.uz-undo').innerText.indexOf('Absolution I') >= 0", timeout=9000); pg.wait_for_timeout(600)
        check('tapping its blessing half is Absolution I', 'Absolution I' in pg.inner_text('.uz-undo') and pg.locator('.uz-absq .gl-ab').first.get_attribute('data-gl-stage') == '1')
        pg.emulate_media(reduced_motion='reduce'); pg.locator('.uz-absq .gl-abC').first.click(); pg.wait_for_timeout(900)
        check('1.13 with reduced motion on, a curse still offers the four sigils (still, no flying blood)', pg.locator('[data-sig]').count() == 4)
        pg.wait_for_selector('[data-sig=Domain]', state='visible'); pg.wait_for_timeout(300)
        check('1U.13 the chosen reason turns red', pg.evaluate("(() => { const b = document.querySelector('[data-sig=Domain]'); if (!b) return false; b.click(); return b.classList.contains('bl-pick') && /rgb\(255, 106, 94\)/.test(getComputedStyle(b.querySelector('.bl-lab')).color); })()"))
        pg.wait_for_timeout(1200)
        check('...and the sigil picked is logged with the curse', 'Domain' in pg.inner_text('.uz-undo'))
        pg.emulate_media(reduced_motion='no-preference')
        pg.click('.uz-tabs [data-v="3"]'); pg.wait_for_timeout(600)
        check('nothing in the Den scrolls sideways at phone width', pg.evaluate("document.querySelectorAll('.uz-pane')[3].scrollWidth <= document.querySelectorAll('.uz-pane')[3].clientWidth + 1"))
        # 2026-10-28 night: one-sided omens get their other side (game-pairs.js)
        pg.click('.uz-tabs [data-v="2"]'); pg.wait_for_timeout(500); pane = pg.locator('.uz-pane >> nth=2')
        pc = pane.locator('.uz-bt', has_text='Hitting Snooze').locator('.pz-pair')
        check('a one-sided omen shows a Pair chip with a 44px tap target', pc.count() == 1 and pc.bounding_box()['height'] >= 44 and pc.bounding_box()['width'] >= 44)
        pc.click(); pg.wait_for_timeout(400)
        check('the Pair sheet offers his own Wake Up Early first, plus new names as chips', pg.locator('.pz').count() == 1 and pg.locator('.pz-c.on').inner_text().strip() == 'Wake Up Early' and pg.locator('[data-a=psug]').count() >= 2)
        check('sheet text is 13px or more', pg.evaluate("Math.min(...[...document.querySelectorAll('.pz *')].filter(function(n){ return n.childNodes.length && [...n.childNodes].some(function(c){ return c.nodeType === 3 && c.textContent.trim(); }); }).map(function(n){ return parseFloat(getComputedStyle(n).fontSize); }))") >= 13)
        if shots: pg.screenshot(path=os.path.join(SP, 'pair.png'))
        pg.click('[data-a=pgo]'); pg.wait_for_timeout(1500); pane = pg.locator('.uz-pane >> nth=2')
        tw = pane.locator('.uz-two', has_text='Hitting Snooze')
        check('accepting makes it one two-sided omen under Both Ways with both names', tw.count() == 1 and 'Wake Up Early' in tw.inner_text() and pane.locator('.uz-bt', has_text='Wake Up Early').count() == 0 and pane.locator('.uz-bt', has_text='Hitting Snooze').count() == 0)
        pane.locator('[data-a=edit]').click(); pg.wait_for_timeout(300)
        pg.locator('.uz-pane >> nth=2').locator('.uz-two', has_text='Hitting Snooze').locator('.uz-twl').click(); pg.wait_for_timeout(400)
        check('tapping a two-sided omen (in Edit) opens its edit form with Split', 'Edit two-sided omen' in pg.inner_text('.uz-form') and pg.locator('[data-a=psplit]').count() == 2)
        pg.click('[data-a=psplit][data-v=b]'); pg.wait_for_timeout(200); pg.click('.uz-form [data-a=submit]'); pg.wait_for_timeout(1500); pane = pg.locator('.uz-pane >> nth=2')
        check('Split returns it to one side (the blessing Wake Up Early)', pane.locator('.uz-two', has_text='Wake Up Early').count() == 0 and pane.locator('.uz-bt', has_text='Wake Up Early').count() == 1)
        pg.locator('.uz-pane >> nth=2').locator('.uz-bt', has_text='Flossing').click(); pg.wait_for_timeout(400)
        check('tapping a blessing (in Edit) opens its edit form, which spots the duplicate', 'Edit blessing' in pg.inner_text('.uz-form') and 'duplicate' in pg.inner_text('.uz-form'))
        pg.click('.uz-form [data-a=pdup]'); pg.wait_for_timeout(1500); pane = pg.locator('.uz-pane >> nth=2')
        check('Merge leaves one Floss card', pane.locator('.uz-bt', has_text='Floss').count() == 1)
        pane.locator('[data-a=edit]').click(); pg.wait_for_timeout(300)
        check('1U.13 the Pair prompt sits at the bottom of the omens, under the shelves', pg.evaluate("(() => { const p = document.querySelectorAll('.uz-pane')[2], a = p.querySelector('[data-a=pairall]'), s = [...p.querySelectorAll('.uz-bl')].pop(); return !!a && !!s && a.getBoundingClientRect().top > s.getBoundingClientRect().bottom && /^Pair \d+ missing$/.test(a.textContent); })()"))
        pg.locator('.uz-pane >> nth=2').locator('[data-a=pairall]').click(); pg.wait_for_timeout(400)
        n1 = pg.inner_text('.pz-n'); pg.click('[data-a=pskip]'); pg.wait_for_timeout(300)
        check('Pair all walks through the one-sided omens one at a time (skip moves on)', n1.startswith('1 of') and pg.inner_text('.pz-n').startswith('2 of'))
        pg.click('[data-a=pclose]'); pg.wait_for_timeout(300)
        # 1U.11 the level up (LU-X2 The Sky Answers): it covers the Ulhu screen, draws stars, aurora and the number, a tap ends it
        lu = pg.evaluate("""(() => { const box = document.querySelector('.uz'); const p = LU_REAL(box, 13);
          return new Promise((r) => setTimeout(() => { const w = box.querySelector('.lu-wrap'), c = w && w.querySelector('canvas'); if (!c) return r({ none: 1 });
            const x = c.getContext('2d').getImageData(0, 0, 240, 176).data; let lit = 0; for (let i = 0; i < x.length; i += 4) if (x[i] + x[i + 1] + x[i + 2] > 300) lit++;
            const b = w.getBoundingClientRect(), h = box.getBoundingClientRect(); w.click();
            Promise.race([p.then(() => 'over'), new Promise((q) => setTimeout(() => q('stuck'), 4000))]).then((end) => r({ lit, cover: b.width >= h.width - 1, end, gone: !box.querySelector('.lu-wrap'), ups: LU_CALLS.slice() })); }, 4200)); })()""")
        check('1U.11 level up: The Sky Answers covers the screen and lights up, and a tap ends it: ' + str(lu), lu.get('lit', 0) > 200 and lu.get('cover') and lu.get('end') == 'over' and lu.get('gone'))
        # 1U.11 the faint (FA-R3): the vial shatters, the lost runes float away, he wakes with all his health (rules of 30 Oct)
        fz = pg.evaluate("""(() => { const box = document.querySelector('.uz'); const p = FAINT.faint(box, { max: 60, hp: 20, runes: 200, lost: 80, wake: 60, lv: 7, title: 'Tide Caller' });
          // waits for each moment rather than a fixed time: a busy PC runs the scene slowly (30 Oct)
          const until = (f, ms) => new Promise((r) => { const t0 = performance.now(); (function go() { const v = f(); if (v || performance.now() - t0 > ms) return r(v); setTimeout(go, 100); })(); });
          const w = () => box.querySelector('.fz'), o = {};
          return until(() => { const x = w(), l = x && x.querySelector('.lab'); return l && /drift/.test(l.textContent) && l; }, 20000).then((l) => {
            const x = w(), b = x && x.getBoundingClientRect(), h = box.getBoundingClientRect();
            o.cover = !!x && b.width >= h.width - 1; o.lab = l ? l.textContent : ''; o.ulhu = !!(x && x.querySelector('.ulhu img'));
            return until(() => { const x2 = w(), hp = x2 && x2.querySelector('.hpl'); return hp && hp.textContent === '60/60' && hp.textContent; }, 25000); }).then((hp) => {
            const x = w(); o.hp = hp || (x && x.querySelector('.hpl') ? x.querySelector('.hpl').textContent : ''); if (x) x.click();
            return Promise.race([p.then(() => 'over'), new Promise((q) => setTimeout(() => q('stuck'), 4000))]).then((end) => { o.end = end; o.gone = !box.querySelector('.fz'); return o; }); }); })()""")
        check('1U.11 faint: it covers the screen, "80 runes drift out of reach", he wakes with all his health, a tap ends it: ' + str(fz), fz.get('cover') and '80 runes drift out of reach' in fz.get('lab', '') and fz.get('ulhu') and fz.get('hp') == '60/60' and fz.get('end') == 'over' and fz.get('gone'))
        # Rise again: the card at the top of The Call, three stained-glass stars, no tick boxes under them
        rc = pg.evaluate("""(() => { const d = document.createElement('div'); d.className = 'uz-pane'; d.innerHTML = FAINT.panel({ stage: 1, lit: 1, ids: ['a'], back: 30 }); document.body.appendChild(d); FAINT.paint(d);
          const cv = [...d.querySelectorAll('canvas[data-fs]')], lum = (c) => { const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0, s = 0; for (let i = 0; i < x.length; i += 4) if (x[i + 3]) { n++; s += x[i] + x[i + 1] + x[i + 2]; } return [n, Math.round(s / Math.max(1, n))]; };
          const o = { n: cv.length, lums: cv.map(lum), ticks: d.querySelectorAll('.rit, .sk, input[type=checkbox]').length, text: d.textContent }; d.remove(); return o; })()""")
        check('1U.11 Rise again card: three glass stars, the lit one brighter, no tick boxes under them: ' + str(rc), rc['n'] == 3 and all(n > 500 for n, _ in rc['lums']) and rc['lums'][0][1] > rc['lums'][1][1] + 60 and rc['ticks'] == 0 and 'RISE AGAIN' in rc['text'])
        # the third ritual of a set: the whole quarter of the runes rains home from the three stars
        sr = pg.evaluate("""(() => { const box = document.querySelector('.uz'); const p = FAINT.star(box, { stage: 1, coins: 18, max: 60, hp0: 60, runes: 100, lv: 7, title: 'Tide Caller', line: 'A quarter of my runes came home.' });
          let seen = 0; const look = setInterval(() => { seen = Math.max(seen, box.querySelectorAll('.fz .bb').length); }, 100);
          return new Promise((r) => { const t0 = performance.now(); (function wait() { const w0 = box.querySelector('.fz'), rs = w0 && w0.querySelector('.rc span'); if (performance.now() - t0 < 25000 && !(rs && rs.textContent === '118 runes')) return setTimeout(wait, 200); clearInterval(look); const w = box.querySelector('.fz'); const o = { bubbles: seen, hp: w.querySelector('.hpl').textContent, runes: w.querySelector('.rc span').textContent, back: w.querySelector('.back').textContent };
            w.click(); Promise.race([p.then(() => 'over'), new Promise((q) => setTimeout(() => q('stuck'), 4000))]).then((end) => { o.end = end; r(o); }); })(); }); })()""")
        check('1U.11 the whole set of three: the third star lights, all three rain rune bubbles into Ulhu, runes 100 to 118 (the quarter), health stays full: ' + str(sr), sr.get('bubbles') >= 12 and sr.get('hp') == '60/60' and sr.get('runes') == '118 runes' and sr.get('end') == 'over')
        nw = pg.evaluate("""(() => { const d = document.createElement('div'); d.innerHTML = FAINT.panel({ stage: 1, lit: 1, ids: ['a'], back: 30, fresh: 0 }); document.body.appendChild(d); FAINT.paint(d);
          const c = d.querySelector('canvas[data-fs="0"]'), lum = () => { const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0, n = 0; for (let i = 0; i < x.length; i += 4) if (x[i + 3]) { n++; s += x[i] + x[i + 1] + x[i + 2]; } return s / Math.max(1, n); };
          const a = lum(); return new Promise((r) => setTimeout(() => { const b = lum(); d.remove(); r([Math.round(a), Math.round(b)]); }, 1600)); })()""")
        check('1U.11 a ritual that lights star one or two lights it piece by piece on the card (dim first, bright after): ' + str(nw), nw[1] > nw[0] + 40)
        # 1U.11 Going deeper (DP3-b2): the kraken doors, the depth name, three strikes on the plaque, the crack clear of the number
        gt = pg.evaluate("""(() => { const box = document.querySelector('.uz'), lv = box.querySelector('.uz-lv'); window.scrollTo(0, 0);
          const p = GATE.play(box, { depth: 1, name: 'The Twilight', plaque: lv }), seen = {}, hx = box.querySelector('.uz-hex').getBoundingClientRect();
          const look = setInterval(() => { const a = box.querySelector('.gt-wrap .arch'); if (a) seen.arch = a.textContent; if (box.querySelectorAll('.gt-wrap .door').length) seen.doors = 1;
            const c = lv.querySelector('.gt-crk'); if (c) { const r = c.getBoundingClientRect(); seen.crack = 1; seen.clear = r.right <= hx.left || r.left >= hx.right || r.bottom <= hx.top || r.top >= hx.bottom; } }, 50);
          return Promise.race([p.then(() => 'over'), new Promise((r) => setTimeout(() => r('stuck'), 20000))]).then((end) => { clearInterval(look); seen.end = end; return seen; }); })()""")
        check('1U.11 going deeper: "DEPTH II The Twilight" over the doors, the plaque cracks clear of the number, and it ends: ' + str(gt), 'DEPTH II' in str(gt.get('arch')) and 'Twilight' in str(gt.get('arch')) and gt.get('crack') and gt.get('clear') and gt.get('end') == 'over')
        pg.evaluate("(() => { const d = document.createElement('div'); d.id = 'brewt'; d.style.cssText = 'position:fixed;inset:0;z-index:99;background:#070d0b'; d.innerHTML = BREW.html('Something is brewing'); document.body.appendChild(d); BREW.run(d); })()"); pg.wait_for_timeout(700)
        check('1U.12 the loading screen is Ulhu stirring the cauldron: the scene draws (fire, pot, Ulhu) with its caption', pg.evaluate("(() => { const c = document.querySelector('#brewt canvas'), x = c.getContext('2d').getImageData(0, 0, 90, 64).data; let n = 0, fire = 0; for (let i = 0; i < x.length; i += 4) { if (x[i + 3]) n++; if (x[i] > 200 && x[i + 1] > 80 && x[i + 2] < 80) fire++; } const ok = n > 4000 && fire > 20 && /Something is brewing/.test(document.querySelector('#brewt .cap').textContent); document.getElementById('brewt').remove(); return ok; })()"))
        check('1U.12 a loading scene in a pane off to the side is not drawn (no battery spent on it)', pg.evaluate("(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:200vw;top:0;width:300px'; d.innerHTML = BREW.html('x'); document.body.appendChild(d); BREW.run(d); return new Promise((r) => setTimeout(() => { const x = d.querySelector('canvas').getContext('2d').getImageData(0, 0, 90, 64).data; let n = 0; for (let i = 3; i < x.length; i += 4) if (x[i]) n++; d.remove(); r(n === 0); }, 700)); })()"))
        # 1U.10 Vespers: the tablet on The Call opens the Grimoire (BG1 desk, T1 tome, T4 chains), which drags him in and opens on
        # the day in glass, then the night line; a curse takes a sigil and a few words; "That's all" rings Vespers
        pg.evaluate("window.scrollTo(0, 0); document.querySelectorAll('.uz-tabs button')[0].click(); 0"); pg.wait_for_timeout(600)
        check('1U.10 from his Vespers time a Vespers tablet sits on The Call', pg.locator('.uz-pane >> nth=0').locator('[data-a=vespopen]').count() == 1)
        pg.evaluate("window.GR_SEEN = 0; window.GR_LOOK = setInterval(() => { const c = document.querySelector('.gr-wrap canvas'); if (c) GR_SEEN = Math.max(GR_SEEN, c.width); }, 50); 0")
        pg.locator('.uz-pane >> nth=0').locator('[data-a=vespopen]').click()
        try: pg.wait_for_function("document.querySelector('.uz-vs') && !document.querySelector('.gr-wrap')", timeout=25000)
        except Exception: pass
        vs = pg.evaluate("(() => { clearInterval(GR_LOOK); const s = document.querySelector('.uz-vs'); return s ? { book: GR_SEEN, glass: !!s.querySelector('.dayg canvas, .dayg [data-gl], .dayg .gl-day, .dayg div'), text: s.textContent, curses: s.querySelectorAll('.ev.c').length, ring: !!s.querySelector('[data-a=vring]') } : { book: GR_SEEN }; })()")
        check('1U.10 the book plays (a pixel canvas), then Vespers opens on the day in glass and the night line with the curses: ' + str({k: v for k, v in vs.items() if k != 'text'}), vs.get('book', 0) > 40 and vs.get('glass') and 'Today in glass' in vs.get('text', '') and 'The night line' in vs.get('text', '') and vs.get('curses', 0) >= 1 and vs.get('ring'))
        pg.locator('.uz-vs .ev.c').first.click(); pg.wait_for_timeout(300)
        pg.locator('.uz-vs [data-a=vsig][data-v=Flesh]').first.click(); pg.wait_for_timeout(200)
        pg.locator('.uz-vs [data-a=vchip][data-v=Tired]').first.click(); pg.wait_for_timeout(200)
        check('1U.10 a curse takes a sigil and a word on the night line', pg.locator('.uz-vs .ev.c').first.locator('.sd:not(.none)').count() == 1 and 'Tired' in pg.locator('.uz-vs .ev.c').first.inner_text())
        n0 = len(pg.evaluate("window.ARGS"))
        pg.locator('.uz-vs [data-a=vring]').click()
        try: pg.wait_for_function("!document.querySelector('.uz-vs') && CALLS.includes('gameVespers')", timeout=20000)
        except Exception: pass
        rv = pg.evaluate("(() => { const i = CALLS.lastIndexOf('gameVespers'); return i < 0 ? null : JSON.stringify(ARGS[i]); })()")
        check('1U.10 "That\'s all" rings Vespers with the tag, back on The Call, the tablet gone: ' + str(rv)[:160], rv and 'Flesh' in rv and 'Tired' in rv and pg.locator('.uz-vs').count() == 0 and pg.locator('[data-a=vespopen]').count() == 0)
        # 1U.13 the 2-week bar in glass under each ritual tablet (G1)
        pg.evaluate("document.querySelectorAll('.uz-tabs button')[1].click(); 0"); pg.wait_for_timeout(800)
        rb = pg.evaluate("(() => { const b = [...document.querySelectorAll('.rb[data-rb]')]; return { n: b.length, drawn: b.filter((x) => { const c = x.querySelector('canvas'); return c && c.width > 50; }).length, lets: b.length ? b[0].querySelectorAll('.rb-l > *').length : 0 }; })()")
        check('1U.13 each ritual tablet has its 2-week bar in glass, drawn, with 14 day letters: ' + str(rb), rb['n'] >= 3 and rb['drawn'] >= 1 and rb['lets'] == 14)
        check('no page errors', not errs)
        if errs: print(errs[:3])
        b.close()
finally:
    srv.kill()
print(sum(res), '/', len(res))
