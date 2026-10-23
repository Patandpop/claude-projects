"""Mock-ups of Ulhu's Rituals (the new task setter + Cthulhu game tab). Design only, fake data.

Writes ../design/rituals_phone.png (390x844) and ../design/rituals_laptop.png (1280x800).
Colours from ../design/tokens.md (dark theme), room art from ../design/room_iso.png scaled with
nearest-neighbour only. Run: python rituals_mockup.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
DESIGN = os.path.join(HERE, '..', 'design')

# tokens.md, dark (default)
BG, SURF, SURF2, BAR = '#0E1424', '#161E33', '#1C2540', '#0A0F1E'
BORDER, BINPUT = '#2A3555', '#6B7799'
TEXT, MUTED = '#E6EAF5', '#98A2BC'
GOLD, NAVY = '#FABB2E', '#0D1B5E'
DANGER, SUCCESS, WARN = '#EF5350', '#66BB6A', '#FFA726'
HP, XP, TRACK = '#EF5350', '#B49CFF', '#0A0F1E'
V_BAD, V_NEU, V_GOOD = '#EF5350', '#FABB2E', '#64B5F6'
T_WORK, T_EXT, T_LIFE = '#64B5F6', '#FFA726', '#F5B8D8'
BUBBLE, ON_BUBBLE = '#FFF8E7', '#2B1F2E'
TRACKS = {'Necessary': T_WORK, 'Ahead': '#9AD0F5', 'Outside': T_EXT, 'Life': T_LIFE}


def font(size, bold=False):
    names = ['GOTHICB.TTF', 'segoeuib.ttf'] if bold else ['GOTHIC.TTF', 'segoeui.ttf']
    for n in names:
        for d in [r'C:\Windows\Fonts', '/usr/share/fonts/truetype/dejavu']:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)


def room(scale):
    big = Image.open(os.path.join(DESIGN, 'room_iso.png')).convert('RGBA')
    one = big.resize((big.width // 4, big.height // 4), Image.NEAREST)  # back to 1 art pixel
    return one.resize((one.width * scale, one.height * scale), Image.NEAREST)


def coin(scale=2):
    c = Image.open(os.path.join(HERE, 'items', 'eldritch_doubloon.png')).convert('RGBA')
    return c.resize((16 * scale, 16 * scale), Image.NEAREST)


class Pen:
    def __init__(self, img):
        self.img, self.d = img, ImageDraw.Draw(img, 'RGBA')

    def box(self, xy, fill, outline=None, r=8, w=1):
        self.d.rounded_rectangle(xy, r, fill=fill, outline=outline, width=w)

    def text(self, xy, s, size=13, bold=False, fill=TEXT, anchor='la'):
        self.d.text(xy, s, font=font(size, bold), fill=fill, anchor=anchor)

    def width(self, s, size=13, bold=False):
        return self.d.textlength(s, font=font(size, bold))

    def tag(self, x, y, s, col, size=10):
        w = self.width(s, size, True) + 10
        self.box((x, y, x + w, y + 15), None, outline=col, r=4)
        self.text((x + 5, y + 2), s, size, True, col)
        return x + w + 5

    def bar(self, x, y, w, h, frac, col, label=None):
        self.d.rectangle((x, y, x + w, y + h), fill=TRACK, outline='#05070F', width=2)
        fw = int((w - 4) * frac)
        if fw > 0:
            self.d.rectangle((x + 2, y + 2, x + 2 + fw, y + h - 2), fill=col)
            self.d.rectangle((x + 2, y + 2, x + 2 + fw, y + 3), fill='#FFFFFF60')
        if label:
            self.text((x + w + 6, y + h // 2), label, 11, True, MUTED, 'lm')

    def tick(self, x, y, s, done):
        if done:
            self.box((x, y, x + s, y + s), SUCCESS, r=5)
            self.d.line([(x + s * .25, y + s * .52), (x + s * .43, y + s * .7), (x + s * .76, y + s * .3)],
                        fill=NAVY, width=3)
        else:
            self.box((x, y, x + s, y + s), SURF2, outline=BINPUT, r=5, w=2)

    def pay(self, x_right, y_mid, n, extra=''):
        s = str(n) + extra
        tw = self.width(s, 14, True)
        self.img.alpha_composite(coin(1), (int(x_right - tw - 20), int(y_mid - 8)))
        self.text((x_right, y_mid), s, 14, True, GOLD, 'rm')

    def ritual(self, x, y, w, h, name, meta, track, pay, stripe=V_NEU, done=False, due=None,
               auto=False, extra=''):
        self.box((x, y, x + w, y + h), SURF2, outline=BORDER, r=8)
        self.d.rounded_rectangle((x, y, x + 5, y + h), 3, fill=stripe)
        ts = 22 if h >= 44 else 18
        self.tick(x + 13, y + (h - ts) // 2, ts, done)
        tx = x + 13 + ts + 10
        self.text((tx, y + (4 if h < 44 else 6)), name, 13, True, MUTED if done else TEXT)
        if done:
            self.d.line([(tx, y + (12 if h < 44 else 14)), (tx + self.width(name, 13, True), y + (12 if h < 44 else 14))], fill=MUTED, width=1)
        cx = tx
        ty = y + h - (17 if h < 44 else 19)
        self.text((cx, ty), meta, 10, False, MUTED)
        cx += self.width(meta, 10) + 6
        cx = self.tag(cx, ty - 1, track, TRACKS[track], 9)
        if due:
            cx = self.tag(cx, ty - 1, due[0], due[1], 9)
        if auto:
            cx = self.tag(cx, ty - 1, 'ticked for you' if done else 'auto', SUCCESS, 9)
        self.pay(x + w - 10, y + h // 2, pay, extra)

    def bubble(self, x, y, s, tail_left=True):
        w = self.width(s, 12, True) + 16
        self.box((x, y, x + w, y + 24), BUBBLE, outline=ON_BUBBLE, r=8)
        tx = x + 14 if tail_left else x + w - 20
        self.d.polygon([(tx, y + 23), (tx + 8, y + 23), (tx - 2, y + 32)], fill=BUBBLE, outline=ON_BUBBLE)
        self.d.line([(tx + 1, y + 23), (tx + 7, y + 23)], fill=BUBBLE, width=2)
        self.text((x + 8, y + 12), s, 12, True, ON_BUBBLE, 'lm')

    def button(self, xy, s, primary=False, size=13):
        self.box(xy, GOLD if primary else SURF2, outline=GOLD if primary else BINPUT, r=6)
        self.text(((xy[0] + xy[2]) // 2, (xy[1] + xy[3]) // 2), s, size, True,
                  NAVY if primary else TEXT, 'mm')


def phone():
    W, H = 390, 844
    img = Image.new('RGBA', (W, H), BG)
    p = Pen(img)
    # top bar
    p.d.rectangle((0, 0, W, 48), fill=BAR)
    p.text((16, 24), "Ulhu's Rituals", 17, True, GOLD, 'lm')
    img.alpha_composite(coin(2), (238, 8))
    p.text((274, 24), '1,284', 18, True, GOLD, 'lm')
    p.box((332, 13, 374, 35), GOLD, r=11)
    p.text((353, 24), 'Lv 7', 12, True, NAVY, 'mm')
    # room 2x, left; bars on the right
    rm = room(2)
    img.alpha_composite(rm, (4, 54))
    rx = 4 + rm.width + 6
    p.text((rx, 70), 'Health', 10, True, MUTED)
    p.bar(rx, 84, 68, 12, 0.8, HP)
    p.text((rx + 74, 90), '40', 10, True, MUTED, 'lm')
    p.text((rx, 106), 'XP to Lv 8', 10, True, MUTED)
    p.bar(rx, 120, 68, 12, 0.45, XP)
    p.text((rx + 74, 126), '45%', 10, True, MUTED, 'lm')
    p.text((rx, 146), 'Today', 10, True, MUTED)
    p.text((rx, 160), '+46', 18, True, GOLD)
    p.text((rx, 184), 'of about 80', 10, False, MUTED)
    p.text((rx, 206), 'Streak', 10, True, MUTED)
    p.text((rx, 220), '6 days', 14, True, TEXT)
    p.bubble(150, 66, '+10 Lesson built!', tail_left=True)
    # boss banner
    y = 312
    p.box((16, y, W - 16, y + 40), SURF, outline=DANGER, r=10, w=2)
    p.text((28, y + 12), 'The Marking Kraken', 13, True, TEXT, 'lm')
    p.text((28, y + 28), '9XS tests: stage 2 of 4, due Tue', 10, False, MUTED, 'lm')
    p.bar(250, y + 14, 112, 12, 0.6, DANGER)
    # today list
    y = 360
    groups = [
        ('BEFORE SCHOOL', [('Log behaviour, all classes', '5 min', 'Necessary', 3, V_GOOD, True, None, True, '')]),
        ('P2 FREE  10:25-11:25', [
            ('Build 9XS Lesson 3', '30 min', 'Necessary', 10, V_NEU, False, ('due Thu', WARN), True, ''),
            ('Mark 10S2 books (2 of 3)', '30 min', 'Necessary', 12, V_BAD, False, ('moved 2x', V_BAD), False, '')]),
        ('AFTER SCHOOL', [
            ('Send order sheet to technicians', '5 min', 'Necessary', 3, V_NEU, False, ('due today', DANGER), False, ''),
            ('Set 10S2 homework', '15 min', 'Necessary', 6, V_NEU, False, None, True, '')]),
        ('EVENING', [('Read 20 pages', '15 min', 'Life', 12, V_GOOD, False, None, False, '+5')]),
    ]
    for head, rows in groups:
        p.text((16, y + 4), head, 10, True, MUTED)
        y += 20
        for r in rows:
            p.ritual(16, y, W - 32, 44, r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8])
            y += 48
    # buttons
    y += 4
    p.button((16, y, 120, y + 40), 'Waiting (3)')
    p.button((128, y, 250, y + 40), 'Plan my day')
    p.button((258, y, W - 16, y + 40), '+ Ritual', True)
    # bottom nav (Phone.html style + a fourth button)
    p.d.rectangle((0, H - 56, W, H), fill=BAR)
    p.d.line([(0, H - 56), (W, H - 56)], fill=BORDER)
    labels = ['Lesson', 'Today', 'Friday', 'Rituals']
    for i, s in enumerate(labels):
        cx = int(W / 8 * (2 * i + 1))
        on = s == 'Rituals'
        if on:
            p.box((cx - 22, H - 50, cx + 22, H - 26), '#3A3121', r=10)
        p.d.rounded_rectangle((cx - 8, H - 46, cx + 8, H - 30), 3, outline=GOLD if on else MUTED, width=2)
        p.text((cx, H - 14), s, 11, True, TEXT if on else MUTED, 'mm')
    img.convert('RGB').save(os.path.join(DESIGN, 'rituals_phone.png'))


def laptop():
    W, H = 1280, 800
    img = Image.new('RGBA', (W, H), BG)
    p = Pen(img)
    # planner header
    p.d.rectangle((0, 0, W, 44), fill=BAR)
    p.text((16, 22), 'Planner', 18, True, GOLD, 'lm')
    p.box((100, 12, 196, 32), GOLD, r=10)
    p.text((148, 22), 'Week A', 12, True, NAVY, 'mm')
    p.text((214, 22), 'w/c 19 Oct', 13, False, MUTED, 'lm')
    img.alpha_composite(coin(1), (1150, 14))
    p.text((1172, 22), '1,284', 14, True, GOLD, 'lm')
    p.box((1226, 12, 1264, 32), GOLD, r=10)
    p.text((1245, 22), 'Lv 7', 11, True, NAVY, 'mm')
    # sidebar
    p.d.rectangle((0, 44, 176, H), fill=SURF)
    for i, s in enumerate(['Week', 'Day', 'Classes', 'Homework', 'Assessment', 'Behaviour', "Ulhu's Rituals"]):
        y = 58 + i * 40
        on = s.startswith('Ulhu')
        p.box((10, y, 166, y + 32), '#3F3A32' if on else SURF2, outline=GOLD if on else BORDER, r=6)
        p.text((22, y + 16), s, 13, on, TEXT, 'lm')
    # left column: room 3x + HUD + boss
    x0 = 192
    rm = room(3)
    p.box((x0, 56, x0 + 420, 56 + rm.height + 12), SURF, outline=BORDER, r=10)
    img.alpha_composite(rm, (x0 + 6, 62))
    p.bubble(x0 + 230, 94, '+10 Lesson built!')
    y = 56 + rm.height + 22
    p.box((x0, y, x0 + 420, y + 72), SURF, outline=BORDER, r=10)
    img.alpha_composite(coin(2), (x0 + 14, y + 12))
    p.text((x0 + 54, y + 28), '1,284', 22, True, GOLD, 'lm')
    p.text((x0 + 14, y + 58), 'Eldritch Doubloons  ·  +46 today', 11, False, MUTED, 'lm')
    p.text((x0 + 220, y + 14), 'Health', 10, True, MUTED)
    p.bar(x0 + 270, y + 12, 110, 12, 0.8, HP, '40')
    p.text((x0 + 220, y + 40), 'XP', 10, True, MUTED)
    p.bar(x0 + 270, y + 38, 110, 12, 0.45, XP, 'Lv 8')
    y += 82
    p.box((x0, y, x0 + 420, H - 12), SURF, outline=DANGER, r=10, w=2)
    p.text((x0 + 14, y + 18), 'The Marking Kraken', 18, True, TEXT, 'lm')
    p.text((x0 + 14, y + 38), '9XS Particles tests · 30 scripts x 6 min = 3 hours', 11, False, MUTED, 'lm')
    p.bar(x0 + 14, y + 50, 390, 14, 0.6, DANGER)
    stages = [('Half the class marked', 'Mon', True), ('The rest marked', 'Tue', False),
              ('Section totals added up', 'Wed', False), ('Marks on the system', 'Thu', False)]
    for i, (s, d, done) in enumerate(stages):
        sy = y + 74 + i * 26
        if sy + 20 > H - 16:
            break
        p.tick(x0 + 14, sy, 18, done)
        p.text((x0 + 42, sy + 9), s, 12, True, MUTED if done else TEXT, 'lm')
        p.text((x0 + 404, sy + 9), d, 11, False, MUTED, 'rm')
    p.text((x0 + 14, H - 52), 'Beat it: 250 doubloons + a Kraken trophy for the room.', 11, True, GOLD, 'lm')
    p.text((x0 + 14, H - 32), 'On time = full damage, late = half. A missed date never costs health.', 10, False, MUTED, 'lm')
    # middle: today timeline
    mx, mw = 628, 330
    p.text((mx, 64), 'Today · Friday 23 Oct', 20, True, GOLD, 'lm')
    y = 84
    plan = [
        ('place', 'Before school', '8:00-8:40'),
        ('rit', 'Log behaviour, all classes', '5 min', 'Necessary', 3, V_GOOD, True, None, True, ''),
        ('lesson', 'P1  9XS  Atoms, elements, compounds'),
        ('place', 'P2 free', '9:40-10:40'),
        ('rit', 'Build 9XS Lesson 3', '30 min', 'Necessary', 10, V_NEU, False, ('due Thu', WARN), True, ''),
        ('rit', 'Mark 10S2 books (2 of 3)', '30 min', 'Necessary', 12, V_BAD, False, ('moved 2x', V_BAD), False, ''),
        ('lesson', 'P3  10S2  Efficiency'),
        ('lesson', 'P4  8XP  Distance-time graphs'),
        ('place', 'Lunch', '13:30-14:15'),
        ('rit', 'Friday emails', '15 min', 'Necessary', 6, V_NEU, False, None, True, ''),
        ('lesson', 'P5  13D  Hubble\'s law'),
        ('place', 'After school', '15:30-17:00'),
        ('rit', 'Send order sheet to technicians', '5 min', 'Necessary', 3, V_NEU, False, ('due today', DANGER), False, ''),
        ('rit', 'Set 10S2 homework', '15 min', 'Necessary', 6, V_NEU, False, None, True, ''),
        ('place', 'Evening', 'never auto-filled'),
        ('rit', 'Read 20 pages', '15 min', 'Life', 12, V_GOOD, False, None, False, '+5'),
    ]
    for it in plan:
        if it[0] == 'place':
            y += 6
            p.text((mx, y + 8), it[1].upper(), 11, True, GOLD, 'lm')
            p.text((mx + mw, y + 8), it[2], 10, False, MUTED, 'rm')
            y += 20
        elif it[0] == 'lesson':
            y += 4
            p.box((mx, y, mx + mw, y + 24), BG, outline=BORDER, r=6)
            p.text((mx + 10, y + 12), it[1], 11, False, MUTED, 'lm')
            y += 28
        else:
            p.ritual(mx, y, mw, 42, *it[1:])
            y += 46
    # right: waiting + this week
    rx, rw = 976, 292
    p.text((rx, 64), 'Waiting (3)', 16, True, TEXT, 'lm')
    p.text((rx + rw, 64), 'drag into a place', 10, False, MUTED, 'rm')
    y = 82
    for r in [('Order sheet ready, w/c 9 Nov', '15 min', 'Ahead', 9, V_NEU, ('due Fri 30', WARN)),
              ('Mark 10C2 homework', '30 min', 'Necessary', 10, V_NEU, ('due Tue', MUTED)),
              ('Tutoring prep: GCSE forces', '30 min', 'Outside', 30, V_GOOD, None)]:
        p.ritual(rx, y, rw, 42, r[0], r[1], r[2], r[3], r[4], False, r[5])
        y += 46
    p.button((rx, y + 4, rx + 140, y + 38), 'Plan my day')
    p.button((rx + 150, y + 4, rx + rw, y + 38), '+ Ritual', True)
    y += 56
    p.box((rx, y, rx + rw, y + 228), SURF, outline=BORDER, r=10)
    p.text((rx + 14, y + 20), 'This week', 16, True, TEXT, 'lm')
    p.text((rx + rw - 14, y + 20), 'planned work', 10, False, MUTED, 'rm')
    week = [('Mon', 95, 95), ('Tue', 150, 150), ('Wed', 300, 260), ('Thu', 120, 80), ('Fri', 140, 20)]
    for i, (d, plan_m, done_m) in enumerate(week):
        by = y + 44 + i * 34
        p.text((rx + 14, by + 8), d, 12, True, TEXT, 'lm')
        full = rw - 120
        pw = int(full * plan_m / 300)
        dw = int(full * done_m / 300)
        p.d.rectangle((rx + 52, by, rx + 52 + full, by + 16), fill=TRACK)
        p.d.rectangle((rx + 52, by, rx + 52 + pw, by + 16), fill='#2A3555')
        p.d.rectangle((rx + 52, by, rx + 52 + dw, by + 16), fill=SUCCESS)
        col = WARN if plan_m >= 240 else MUTED
        p.text((rx + rw - 14, by + 8), '%dh%02d' % (plan_m // 60, plan_m % 60), 11, True, col, 'rm')
    p.text((rx + 14, y + 216), 'Green = done.  Wednesday is heavy: Kraken stage.', 10, False, MUTED, 'lm')
    y += 240
    p.box((rx, y, rx + rw, H - 12), SURF, outline=BORDER, r=10)
    p.text((rx + 14, y + 20), 'Half-term jobs (optional)', 12, True, TEXT, 'lm')
    p.text((rx + 14, y + 42), 'Build 4 lessons for w/c 2 Nov · pays Ahead x1.5', 10, False, MUTED, 'lm')
    img.convert('RGB').save(os.path.join(DESIGN, 'rituals_laptop.png'))


if __name__ == '__main__':
    phone()
    laptop()
    print('saved rituals_phone.png, rituals_laptop.png')
