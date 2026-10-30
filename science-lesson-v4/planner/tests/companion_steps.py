# run inside companion_sim.py for each mode: pg, mode, check, SP are in scope
import os as _os
if mode == 'night':
    check('night: Ulhu is away and the ledge has his note', pg.locator('.uz-ban.uzc-away').count() == 1 and pg.locator('.uzc-note').count() == 1)
    pg.locator('.uzc-note').first.click(force=True); pg.wait_for_timeout(400); check('night: tapping the note shows it big', pg.locator('.uzc-note.big').count() == 1)
    pg.screenshot(path=_os.path.join(SP, 'night-note.png')); pg.locator('.uzc-note.big').click(force=True); pg.wait_for_timeout(300); check('night: tapping the big note puts it back', pg.locator('.uzc-note.big').count() == 0)
if mode == 'morning':
    check('morning: the find hangs under the banner', pg.locator('.uzc-card').count() == 1)
    pg.locator('[data-c=keep]').click(); pg.wait_for_timeout(5000)
    check('morning: keeping it takes it', 'gameFindTake' in pg.evaluate('CALLS') and pg.locator('.uzc-card').count() == 0)
    pg.screenshot(path=_os.path.join(SP, 'morning-kept.png'))
if mode == 'home':
    pg.locator('[data-c=cab]').click(); pg.wait_for_timeout(6000)
    check('home: the cabinets open', pg.locator('.uzc-mini').count() == 7)
    pg.screenshot(path=_os.path.join(SP, 'cabinets.png'))
    if pg.locator('.uzc-slot.found').count():
        pg.locator('.uzc-slot.found').first.click(); pg.wait_for_timeout(500)
        check('home: a find gives its note and its piece', pg.locator('.uzc-fnote').count() == 1 and pg.locator('.uzc-pc.got').count() >= 1)
        pg.screenshot(path=_os.path.join(SP, 'cabinet-note.png'), full_page=False)
    pg.locator('[data-c=tab][data-v=term]').click(); pg.wait_for_timeout(6000)
    check('home: the Becoming tab shows the stained-glass term page', pg.locator('.uzc-mod svg').count() > 3)
    pg.screenshot(path=_os.path.join(SP, 'becoming.png'))
    pg.locator('[data-c=tab][data-v=focus]').click(); pg.wait_for_timeout(4000)
    check('home: the Focus tab shows the knitting', pg.locator('.uzc-mod [class*=uzcf]').count() > 3)
    pg.screenshot(path=_os.path.join(SP, 'focus.png'))
    pg.locator('[data-c=close]').click(); pg.wait_for_timeout(300)
    calls0 = len(pg.evaluate('CALLS'))
    box = pg.locator('.uz-moonb').bounding_box(); pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2); pg.mouse.down(); pg.wait_for_timeout(900); pg.mouse.up(); pg.wait_for_timeout(300)
    check('home: holding the moon opens the day tags, without changing the moon', pg.locator('.uzc-tags').count() == 1 and 'gameMoon' not in pg.evaluate('CALLS')[calls0:])
    pg.locator('.uzc-chips button', has_text='Marking').click(); pg.wait_for_timeout(5000)
    check('home: tapping a tag saves it', 'gameDayTag' in pg.evaluate('CALLS') and pg.locator('.uzc-chips button.on', has_text='Marking').count() == 1)
    pg.screenshot(path=_os.path.join(SP, 'daytags.png'))
