"""Shop items for the room SURFACES, windows and lights of Ulhu's Study: floors, rugs, wallpapers,
windows (left-wall slot) and lights, three per tier (Basic, Nice, Fancy, Eldritch). Original art, drawn
from shapes with Pillow. The first item in each tier of floors/rugs/wallpapers/lights is the existing one
from iso_items.py (imported, read only), except the Eldritch rune wallpaper, which is redrawn here with
non-letter glyphs (the old runes read like "#", "2", "4", "J").

python iso_shop_surfaces.py ->
  items/shop/<category>_<tier>_<n>_<name>.png   every item at 1x (cropped)
  ../design/shop_<category>.png                   one labelled catalogue per category (rows = tiers)
  ../design/shop_surfaces.json                    every item with zone, tier, price (Eldritch Doubloons), lock
  ../design/room_iso_fancy2.png                   the Study with a new Fancy/Eldritch mix (x4)

Walls and windows are drawn flat first, then sheared column by column onto the 2:1 wall, so patterns
and glyphs sit on the wall the same way the room's own lines do.
"""
import json, math, os, random, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import iso_items as I                                       # read only
from iso_room import P, poly, box, W, H, WALL               # read only
from iso_items import (canvas, glow, px, clipped, walls, oval, FLOOR_PTS, GOLD, GOLD_D, MINT, MINT_L,
                       VIOLET, VIOLET_D, PINK, INK, EDGE, LX, LY, font, BG, CARD, CARD_E, TIER_COL)

OUT_ITEMS = os.path.join(HERE, 'items', 'shop')
OUT_DESIGN = os.path.join(HERE, '..', 'design')
TIERS = ['Basic', 'Nice', 'Fancy', 'Eldritch']
CREAM = (250, 242, 220)
DARK = (27, 27, 47)


def rnd(seed):
    return random.Random(seed)

def shade(c, k):
    return tuple(max(0, min(255, int(v + k))) for v in c)


# ---------------------------------------------------------------- wall shear (flat art -> 2:1 wall)
def shear(tex, side, i0=0, r0=0):
    """tex column i, row r -> wall column I=i0+i, row R=r0+r (R=0 is the wall top, z=46).
    Left wall: x = 4 + I, y = 36 + R - I/2.  Right wall: x = 64 + I, y = 6 + R + I/2."""
    out = canvas()
    for i in range(tex.width):
        Ii = i0 + i
        col = tex.crop((i, 0, i + 1, tex.height))
        if side == 0:
            x, y = 4 + Ii, 36 + r0 - (Ii + 1) // 2
        else:
            x, y = 64 + Ii, 6 + r0 + Ii // 2
        out.paste(col, (x, y))
    return out

def wall_tex(painter, upper, lower, rail, trim=None, seedbase=0):
    """painter(t, d, side, r) draws a flat 62x48 texture; reuses iso_items.walls() for dado + rail."""
    def pat(l, d, Q, side):
        t = Image.new('RGBA', (62, 48), upper[side] + (255,))
        painter(t, ImageDraw.Draw(t), side, rnd(seedbase + side))
        l.alpha_composite(shear(t, side))
    return lambda img: walls(img, upper, lower, rail, pat, trim)

def stampmap(d, rows, x0, y0, col, col2=None):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == 'x': d.point((x0 + i, y0 + j), fill=col)
            elif ch == 'o' and col2: d.point((x0 + i, y0 + j), fill=col2)


# ---------------------------------------------------------------- FLOORS
def tile(d, u0, v0, u1, v1, c, edge=None):
    poly(d, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], c, edge)

def floor_sand(img):
    def paint(l, d):
        r = rnd(21)
        poly(d, FLOOR_PTS, (228, 200, 146))
        for v in range(2, 30, 4):                                           # wind ripples
            pts = [P(u, v + 0.8 * math.sin(u / 2.5 + v)) for u in range(0, 31)]
            d.line(pts, fill=(212, 180, 124))
        for _ in range(140):
            x, y = P(r.uniform(0, 30), r.uniform(0, 30)); px(d, x, y, r.choice([(240, 218, 170), (204, 172, 120)]))
        x, y = P(6, 22)                                                     # starfish
        d.point([(x, y - 2), (x - 2, y), (x - 1, y), (x, y), (x + 1, y), (x + 2, y), (x - 1, y + 1), (x + 1, y + 1), (x, y - 1)], fill=(240, 120, 100))
        for u, v in ((22, 8), (25, 24), (12, 5)):                           # little shells
            x, y = P(u, v); d.point([(x, y), (x + 1, y), (x, y - 1)], fill=(250, 236, 230)); px(d, x + 1, y - 1, (236, 180, 190))
    clipped(img, FLOOR_PTS, paint)

def floor_flagstones(img):
    def paint(l, d):
        r = rnd(22)
        poly(d, FLOOR_PTS, (70, 72, 84))
        for j, v in enumerate(range(0, 30, 5)):
            off = (j % 2) * 3
            for u in range(-3 + off, 30, 6):
                c = r.choice([(132, 134, 146), (122, 126, 140), (140, 138, 146), (118, 124, 132)])
                tile(d, u + 0.4, v + 0.4, u + 5.6, v + 4.6, c)
                x, y = P(u + 1.5, v + 1.2); px(d, x, y, shade(c, 22)); px(d, x + 1, y, shade(c, 22))
        for _ in range(16):                                                 # moss in the cracks
            u = r.choice(range(0, 30, 5)); v = r.uniform(0, 30)
            x, y = P(v, u); px(d, x, y, (90, 150, 80)); px(d, x + 1, y, (120, 180, 96))
    clipped(img, FLOOR_PTS, paint)

def floor_parquet(img):
    def paint(l, d):
        cols = [(196, 140, 78), (176, 122, 66)]
        for i in range(5):
            for j in range(5):
                u0, v0 = i * 6, j * 6
                for k in range(3):
                    c = shade(cols[(i + j) % 2], -8 * (k % 2))
                    if (i + j) % 2: tile(d, u0 + 2 * k, v0, u0 + 2 * k + 2, v0 + 6, c, (120, 80, 44))
                    else:           tile(d, u0, v0 + 2 * k, u0 + 6, v0 + 2 * k + 2, c, (120, 80, 44))
                x, y = P(u0 + 1, v0 + 1); px(d, x, y, (226, 176, 110))
    clipped(img, FLOOR_PTS, paint)

def floor_wave_mosaic(img):
    def paint(l, d):
        pal = [(234, 222, 190), (120, 200, 196), (60, 150, 170), (36, 104, 140)]
        r = rnd(23)
        for i in range(15):
            for j in range(15):
                u, v = i * 2, j * 2
                band = int((u + 4 * math.sin(v / 4.0) + 30) / 4) % 4
                c = shade(pal[band], r.randint(-8, 8))
                tile(d, u + 0.15, v + 0.15, u + 1.85, v + 1.85, c)
        poly(d, [P(0, 0), P(30, 0), P(30, 30), P(0, 30)], None, (40, 80, 96))
    poly_bg = lambda l, d: poly(d, FLOOR_PTS, (200, 196, 180))
    def both(l, d): poly_bg(l, d); paint(l, d)
    clipped(img, FLOOR_PTS, both)

def compass_rose(d, cu, cv, R, a, b, c):
    for k in range(8):
        ang = k / 8 * 2 * math.pi
        rr = R if k % 2 == 0 else R * 0.6
        tip = P(cu + rr * math.cos(ang), cv + rr * math.sin(ang))
        l1 = P(cu + 1.2 * math.cos(ang + 0.8), cv + 1.2 * math.sin(ang + 0.8))
        l2 = P(cu + 1.2 * math.cos(ang - 0.8), cv + 1.2 * math.sin(ang - 0.8))
        poly(d, [tip, l1, P(cu, cv)], a if k % 2 == 0 else c)
        poly(d, [tip, l2, P(cu, cv)], b if k % 2 == 0 else shade(c, -30))
    x, y = P(cu, cv); px(d, x, y, (255, 250, 230))

def floor_ship_deck(img):
    def paint(l, d):
        poly(d, FLOOR_PTS, (112, 70, 44))
        for v in range(0, 30, 2):
            c = (126, 80, 50) if (v // 2) % 2 else (118, 74, 46)
            tile(d, 0, v, 30, v + 2, c)
            d.line([P(0, v), P(30, v)], fill=(44, 30, 26))                  # caulking
            j = (v * 7) % 24 + 3
            d.line([P(j, v), P(j, v + 2)], fill=(80, 52, 34))
            x, y = P(j + 0.6, v + 1); px(d, x, y, (210, 170, 90))            # brass nails
        poly(d, oval(15, 15, 7.5, 7.5), (232, 214, 170)); poly(d, oval(15, 15, 6.8, 6.8), (60, 70, 100))
        compass_rose(d, 15, 15, 6.4, GOLD, GOLD_D, (232, 214, 170))
        for k in range(16):                                                 # tick ring
            a = k / 16 * 2 * math.pi; x, y = P(15 + 7.1 * math.cos(a), 15 + 7.1 * math.sin(a)); px(d, x, y, GOLD_D)
        tile(d, 0, 0, 30, 0.8, GOLD); tile(d, 0, 0, 0.8, 30, GOLD)          # brass edge strips
    clipped(img, FLOOR_PTS, paint)

def floor_marble(img):
    def paint(l, d):
        r = rnd(24)
        poly(d, FLOOR_PTS, (40, 40, 52))
        s = 5
        for i in range(-6, 7):                                               # tiles set on the diagonal: squares on screen
            for j in range(0, 13):
                cu, cv = 15 + (i + j) * s / 2 - 15, 15 + (j - i) * s / 2 - 15
                cu += 0; dark = (i + j) % 2
                q = [P(cu, cv - s / 2), P(cu + s / 2, cv), P(cu, cv + s / 2), P(cu - s / 2, cv)]
                poly(d, q, (52, 52, 66) if dark else (236, 230, 214))
                if not dark and r.random() < 0.7:                            # grey veins
                    a = P(cu - 1.2, cv - 0.4); b = P(cu + 0.8, cv + 1.2); d.line([a, b], fill=(200, 196, 190))
                elif dark:
                    x, y = P(cu, cv); px(d, x, y, (80, 80, 100))
                d.line([q[0], q[1], q[2], q[3], q[0]], fill=(200, 160, 70))    # gold inlay
        tile(d, 0, 0, 30, 1, GOLD); tile(d, 0, 0, 1, 30, GOLD)
    clipped(img, FLOOR_PTS, paint)

def floor_rlyeh(img):
    def paint(l, d):
        r = rnd(25)
        poly(d, FLOOR_PTS, (8, 20, 20))
        slabs = [[(0, 0), (11, 0), (9, 9), (0, 12)], [(11, 0), (30, 0), (30, 7), (9, 9)],
                 [(0, 12), (9, 9), (13, 20), (0, 22)], [(9, 9), (30, 7), (30, 18), (13, 20)],
                 [(0, 22), (13, 20), (17, 30), (0, 30)], [(13, 20), (30, 18), (30, 30), (17, 30)]]
        for k, s in enumerate(slabs):                                        # tilted, slightly wrong slabs
            cu = sum(p[0] for p in s) / 4; cv = sum(p[1] for p in s) / 4
            sh = [(cu + (u - cu) * 0.9, cv + (v - cv) * 0.9) for u, v in s]
            c = [(84, 108, 96), (62, 86, 80), (98, 118, 104)][k % 3]
            poly(d, [P(*p) for p in sh], c)
            poly(d, [P(*p) for p in [(cu + (u - cu) * 0.9, cv + (v - cv) * 0.9) for u, v in sh[:2]] + [P(*sh[1]), P(*sh[0])]], shade(c, 14))
            for _ in range(6):
                x, y = P(cu + r.uniform(-3, 3), cv + r.uniform(-3, 3)); px(d, x, y, shade(c, -16))
        cracks = [((9, 9), (11, 0)), ((9, 9), (30, 7)), ((9, 9), (0, 12)), ((9, 9), (13, 20)), ((13, 20), (0, 22)),
                  ((13, 20), (30, 18)), ((13, 20), (17, 30))]
        for a, b in cracks:                                                  # glowing seams
            glow(l, *P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), 8, 4, (90, 255, 170), 70)
        for a, b in cracks:
            d.line([P(*a), P(*b)], fill=(110, 255, 180))
        for u, v in ((9, 9), (13, 20)):
            x, y = P(u, v); glow(l, x, y, 6, 4, (160, 255, 210), 140); d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=MINT_L)
        x, y = P(21, 12)                                                     # a carved sigil: a sleepy eye
        d.ellipse([x - 4, y - 2, x + 4, y + 2], outline=(110, 255, 180)); d.line([(x - 2, y), (x + 2, y)], fill=(110, 255, 180))
        for _ in range(14):
            x, y = P(r.uniform(1, 29), r.uniform(1, 29)); px(d, x, y, (90, 200, 120))
    clipped(img, FLOOR_PTS, paint)

def floor_noneuclid(img):
    def paint(l, d):
        cuts = [30 * (t / 7) ** 1.7 for t in range(8)]                      # tiles shrink into one corner
        cols = [(70, 40, 120), (40, 120, 140), (130, 80, 200)]
        for i in range(7):
            for j in range(7):
                u0, u1, v0, v1 = cuts[i], cuts[i + 1], cuts[j], cuts[j + 1]
                k = (i + 2 * j) % 3
                poly(d, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], cols[k])
                poly(d, [P(u0, v0), P(u1, v0), P(u1, v1)], shade(cols[k], 26))   # each tile is a little cube
                poly(d, [P(u0, v0), P(u1, v1), P(u0, v1)], shade(cols[k], -18))
                d.line([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), P(u0, v0)], fill=(170, 240, 255))
        for i in range(1, 7):
            for j in range(1, 7):
                if (i * j) % 3 == 1:
                    x, y = P(cuts[i], cuts[j]); glow(l, x, y, 3, 2, (200, 240, 255), 120); px(d, x, y, (255, 255, 255))
        x, y = P((cuts[5] + cuts[6]) / 2, (cuts[4] + cuts[5]) / 2)          # one tile has an eye in it
        d.ellipse([x - 3, y - 2, x + 3, y + 2], fill=(250, 240, 200), outline=DARK); px(d, x, y, DARK); px(d, x, y - 1, DARK)
    clipped(img, FLOOR_PTS, paint)


# ---------------------------------------------------------------- RUGS (centred on 17,17 like iso_items)
def rug_rag(img):
    d = ImageDraw.Draw(img)
    cols = [(200, 90, 80), (236, 214, 172), (70, 120, 170), (236, 190, 70), (236, 214, 172), (200, 90, 80)]
    for k, c in enumerate(cols):
        rr = 8 - k * 1.3
        poly(d, oval(17, 17, rr, rr * 0.8), c)
    for k in range(5):                                                       # braid dashes
        rr = 7.4 - k * 1.3
        for t in range(0, 24, 2):
            a = t / 24 * 2 * math.pi; x, y = P(17 + rr * math.cos(a), 17 + rr * 0.8 * math.sin(a)); px(d, x, y, shade(cols[k], -40))

def rug_kelp_mat(img):
    d = ImageDraw.Draw(img)
    poly(d, [P(11, 11), P(23, 11), P(23, 23), P(11, 23)], (70, 120, 70))
    poly(d, [P(12, 12), P(22, 12), P(22, 22), P(12, 22)], (100, 156, 90))
    for u in range(12, 22):                                                  # weave
        for v in range(12, 22):
            if (u + v) % 2 == 0: x, y = P(u + 0.5, v + 0.5); px(d, x, y, (84, 138, 76))
    for k, u in enumerate((14, 17, 20)):                                     # three kelp leaves
        pts = [P(u + 0.8 * math.sin(v / 1.4 + k), v) for v in range(13, 22)]
        d.line(pts, fill=(200, 230, 120), width=1)
        for v in (15, 18):
            a = P(u + 0.8 * math.sin(v / 1.4 + k), v); px(d, a[0] + 1, a[1], (200, 230, 120))
    for v in range(11, 24, 2):
        a = P(11, v); px(d, a[0] - 1, a[1], (236, 220, 160))
        b = P(23, v); px(d, b[0] + 1, b[1], (236, 220, 160))

def rug_fish(img):
    d = ImageDraw.Draw(img)
    poly(d, [P(8, 17), P(4, 12), P(4, 22)], (230, 120, 70), (150, 70, 40))   # tail
    poly(d, oval(16, 17, 8, 5.5), (150, 70, 40)); poly(d, oval(16, 17, 7.3, 4.8), (244, 150, 80))
    for u in (11, 14, 17):                                                   # scale arcs
        for v in (15, 18):
            a = P(u, v); d.arc([a[0] - 2, a[1] - 1, a[0] + 2, a[1] + 2], 0, 180, fill=(250, 196, 120))
    poly(d, [P(15, 11.6), P(18, 12), P(17, 9.5)], (230, 120, 70))            # fin
    x, y = P(21, 15.5); d.ellipse([x - 2, y - 2, x + 2, y + 1], fill=(255, 255, 255), outline=DARK); px(d, x, y - 1, DARK)
    x, y = P(23, 18); d.line([(x - 1, y), (x + 1, y + 1)], fill=(150, 70, 40))
    x, y = P(21.5, 19); px(d, x, y, PINK); px(d, x + 1, y, PINK)

def rug_book(img):
    d = ImageDraw.Draw(img)
    poly(d, [P(10, 11), P(24, 11), P(24, 23.5), P(10, 23.5)], (120, 60, 50))  # cover edge
    poly(d, [P(10.5, 11.5), P(23.5, 11.5), P(23.5, 16.8), P(10.5, 16.8)], CREAM)
    poly(d, [P(10.5, 17.2), P(23.5, 17.2), P(23.5, 22.8), P(10.5, 22.8)], (240, 230, 200))
    d.line([P(10, 17), P(24, 17)], fill=(150, 120, 90))                      # spine
    for side, (v0, v1) in enumerate(((12.5, 16), (18, 21.8))):               # wavy "text" lines (not letters)
        for u in range(12, 23, 2):
            for v in range(int(v0 * 2), int(v1 * 2)):
                if (v + u) % 3: x, y = P(u, v / 2); px(d, x, y, (150, 140, 160))
    poly(d, [P(10, 16.5), P(10, 17.5), P(6.5, 17.6), P(7.5, 17), P(6.5, 16.4)], (210, 60, 70))   # ribbon
    x, y = P(20, 14); d.point([(x, y), (x + 1, y), (x, y + 1)], fill=GOLD)   # a doodled star

def rug_medallion(img):
    d = ImageDraw.Draw(img)
    poly(d, [P(9, 10), P(25, 10), P(25, 24), P(9, 24)], (120, 34, 44))
    poly(d, [P(10, 11), P(24, 11), P(24, 23), P(10, 23)], (160, 44, 54))
    for k in range(10, 24, 2):                                               # zigzag border
        a, b = P(k, 11.6), P(k + 1, 12.4); d.line([a, b], fill=GOLD)
        a, b = P(k, 22.4), P(k + 1, 21.6); d.line([a, b], fill=GOLD)
    for k, (r, c) in enumerate(((6, (36, 44, 100)), (4.6, GOLD), (3.4, (36, 44, 100)), (2, (250, 230, 170)))):
        poly(d, [P(17, 17 - r), P(17 + r, 17), P(17, 17 + r), P(17 - r, 17)], c)
    for u, v in ((12, 13), (22, 13), (12, 21), (22, 21)):
        x, y = P(u, v); d.point([(x, y - 1), (x - 1, y), (x + 1, y), (x, y + 1)], fill=GOLD)
    for v in range(10, 25, 2):                                               # tassels
        a = P(9, v); d.line([a, (a[0] - 2, a[1] - 1)], fill=(250, 220, 150))
        b = P(25, v); d.line([b, (b[0] + 2, b[1] + 1)], fill=(250, 220, 150))

def rug_starchart(img):
    d = ImageDraw.Draw(img)
    poly(d, oval(17, 17, 8.5, 8.5, 36), GOLD_D); poly(d, oval(17, 17, 8, 8, 36), (28, 34, 80))
    poly(d, oval(17, 17, 5.5, 5.5, 36), None, (90, 90, 150))
    for k in range(24):
        a = k / 24 * 2 * math.pi; x, y = P(17 + 7.3 * math.cos(a), 17 + 7.3 * math.sin(a)); px(d, x, y, GOLD)
    stars = [(13, 13), (15, 15), (18, 14), (20, 16), (21, 19), (14, 20), (16, 22)]
    d.line([P(*s) for s in stars[:5]], fill=(200, 170, 90)); d.line([P(*stars[5]), P(*stars[6]), P(*stars[4])], fill=(200, 170, 90))
    for s in stars:
        x, y = P(*s); px(d, x, y, (255, 250, 220))
    x, y = P(12, 19); d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(250, 236, 180)); d.ellipse([x - 1, y - 3, x + 3, y + 1], fill=(28, 34, 80))

def rug_eye(img):
    gx, gy = P(17, 17); glow(img, gx, gy, 30, 15, (180, 120, 255), 110)
    d = ImageDraw.Draw(img)
    # almond: points along a lens between two arcs (in screen space, centred on the rug spot)
    pts_top = [(gx + 22 * math.cos(t), gy - 9 * math.sin(t)) for t in [i / 16 * math.pi for i in range(17)]]
    pts_bot = [(gx + 22 * math.cos(t), gy + 8 * math.sin(t)) for t in [i / 16 * math.pi for i in range(16, -1, -1)]]
    lens = pts_top + pts_bot[1:]
    d.polygon([(round(x), round(y)) for x, y in lens], fill=(250, 240, 230), outline=(60, 40, 100))
    d.ellipse([gx - 8, gy - 7, gx + 8, gy + 7], fill=(110, 220, 170))           # iris
    d.ellipse([gx - 6, gy - 5, gx + 6, gy + 5], fill=(60, 170, 140))
    d.ellipse([gx - 2, gy - 4, gx + 2, gy + 4], fill=DARK)                      # tall pupil
    d.rectangle([gx - 5, gy - 4, gx - 3, gy - 2], fill=(255, 255, 255))
    lidc = (120, 80, 200)                                                       # sleepy lid half closed
    d.chord([gx - 22, gy - 9, gx + 22, gy + 9], 180, 360, fill=lidc, outline=(60, 40, 100))
    d.line([(gx - 21, gy), (gx + 21, gy)], fill=(60, 40, 100))
    for k in range(-3, 4):                                                      # lashes
        x = gx + k * 6; d.line([(x, gy + 1), (x + (k // 2), gy + 4)], fill=(60, 40, 100))
    for x, y in ((gx - 26, gy - 4), (gx + 25, gy - 3), (gx - 14, gy + 10), (gx + 13, gy + 11)):
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)): px(d, x + dx, y + dy, MINT_L if dx or dy else (255, 255, 255))

def rug_tidehole(img):
    gx, gy = P(17, 17); glow(img, gx, gy, 32, 16, (90, 255, 210), 120)
    d = ImageDraw.Draw(img)
    poly(d, oval(17, 17, 8, 7.4, 36), (40, 90, 110)); poly(d, oval(17, 17, 7.2, 6.6, 36), (14, 22, 60))
    poly(d, oval(17.6, 17.6, 5, 4.4, 36), (20, 40, 96))
    for k in range(3):                                                         # ripples
        poly(d, oval(17, 17, 2.4 + k * 1.6, 2.2 + k * 1.4, 28), None, (60, 140, 190) if k % 2 else (40, 100, 160))
    r = rnd(26)
    for _ in range(10):
        x, y = P(17 + r.uniform(-5, 5), 17 + r.uniform(-4.5, 4.5)); px(d, x, y, (230, 240, 255))
    for k in range(18):                                                        # glowing rim stones
        a = k / 18 * 2 * math.pi; x, y = P(17 + 7.6 * math.cos(a), 17 + 7 * math.sin(a)); px(d, x, y, MINT if k % 3 else MINT_L)
    # a tiny tentacle poking out to wave hello
    bx, by = P(20, 19)
    pts = [(bx + 2 * math.sin(k / 2.2), by - k) for k in range(0, 13)]
    d.line(pts, fill=(56, 34, 100), width=4); d.line(pts, fill=(160, 110, 220), width=2)
    for k in (3, 7): px(d, pts[k][0] + 1, pts[k][1], PINK)
    tx, ty = pts[-1]; d.line([(tx, ty), (tx - 2, ty - 1), (tx - 3, ty + 1)], fill=(186, 150, 236))


# ---------------------------------------------------------------- WALLPAPERS (both walls)
GLYPHS = [   # 9x9 strange non-letter sigils: eye, jelly, starburst, cradle, watching triangle, nested diamond
    [".........", "...xxx...", ".xx...xx.", "x..xxx..x", "x..x.x..x", "x..xxx..x", ".xx...xx.", "...xxx...", "........."],
    ["...xxx...", ".xx...xx.", "x...x...x", "xxxxxxxxx", ".x..x..x.", "x..x..x..", ".x..x..x.", "..x..x..x", "........."],
    ["....x....", ".x..x..x.", "..x...x..", "...xxx...", "xx.x.x.xx", "...xxx...", "..x...x..", ".x..x..x.", "....x...."],
    [".........", "....x....", "...xxx...", "....x....", "x.......x", ".x.....x.", "..xxxxx..", ".........", "..x.x.x.."],
    ["....x....", "...x.x...", "..x...x..", "..x.x.x..", ".x.xxx.x.", ".x..x..x.", "x.......x", "xxxxxxxxx", "........."],
    ["....x....", "...x.x...", "..x.x.x..", ".x.x.x.x.", "x.x...x.x", ".x.x.x.x.", "..x.x.x..", "...x.x...", "....x...."],
]

def paint_glyphs(t, d, side, r):
    spots = [(4, 2), (20, 6), (37, 1), (50, 9), (12, 17), (30, 18), (46, 22)]
    lay = Image.new('RGBA', t.size, (0, 0, 0, 0))
    for k, (x, y) in enumerate(spots):
        glow(lay, x + 4, y + 4, 8, 8, (90, 255, 180), 90)
    t.alpha_composite(lay); d = ImageDraw.Draw(t)
    for k, (x, y) in enumerate(spots):
        g = GLYPHS[(k + 3 * side) % len(GLYPHS)]
        stampmap(d, g, x, y, MINT_L)
        for j, row in enumerate(g):                                          # mint shading on the lower half
            for i, ch in enumerate(row):
                if ch == 'x' and j > 5: d.point((x + i, y + j), fill=MINT)
    for _ in range(22):
        px(d, r.uniform(0, 61), r.uniform(0, 32), (150, 120, 230))

wall_glyphs = wall_tex(paint_glyphs, ((62, 50, 112), (50, 40, 94)), ((36, 30, 62), (28, 24, 50)), (120, 220, 170), (120, 96, 190), 30)

def paint_wood(t, d, side, r):
    for x in range(0, 62, 5):
        d.line([(x, 0), (x, 47)], fill=(110, 76, 46))
        for _ in range(5):
            y = r.randint(0, 32); d.line([(x + 2, y), (x + 2, y + 2)], fill=(134, 94, 58))
    for _ in range(6): px(d, r.randint(1, 60), r.randint(1, 30), (96, 64, 38))
wall_wood = wall_tex(paint_wood, ((150, 108, 70), (128, 90, 58)), ((104, 70, 42), (86, 58, 34)), (200, 160, 90), None, 31)

def paint_brick(t, d, side, r):
    for row, y in enumerate(range(0, 34, 4)):
        d.line([(0, y), (61, y)], fill=(196, 188, 170))
        for x in range(-4 + (row % 2) * 4, 62, 8):
            d.line([(x, y), (x, y + 3)], fill=(196, 188, 170))
            if r.random() < 0.08:                                            # chipped whitewash
                d.rectangle([x + 2, y + 1, x + 4, y + 2], fill=(190, 110, 90))
wall_brick = wall_tex(paint_brick, ((232, 226, 212), (210, 204, 190)), ((110, 120, 130), (92, 100, 110)), (160, 166, 176), None, 32)

def paint_waves(t, d, side, r):
    for row, y in enumerate(range(3, 32, 8)):
        for x in range(-6 + (row % 2) * 6, 64, 12):
            d.arc([x, y, x + 7, y + 6], 180, 360, fill=CREAM)
            d.arc([x + 2, y + 2, x + 5, y + 5], 180, 360, fill=(170, 220, 220))
    for x, y in ((10, 16), (44, 5), (30, 28)):
        d.point([(x, y), (x + 1, y), (x + 2, y), (x - 1, y - 1), (x - 1, y + 1)], fill=(255, 170, 80))
wall_waves = wall_tex(paint_waves, ((60, 140, 170), (48, 118, 148)), ((36, 84, 110), (28, 70, 94)), CREAM, None, 33)

def paint_library(t, d, side, r):
    cols = [(196, 70, 70), (70, 120, 200), (236, 190, 70), (90, 160, 100), (170, 110, 200), (220, 140, 80), (240, 230, 210)]
    for y0 in (1, 12, 23):
        d.rectangle([0, y0 + 9, 61, y0 + 10], fill=(110, 74, 42))
        x = 0
        while x < 62:
            w = r.choice([2, 2, 3]); h = r.choice([6, 7, 8, 9]); c = r.choice(cols)
            if r.random() < 0.12:                                             # a leaning book
                d.line([(x, y0 + 9), (x + 3, y0 + 3)], fill=c); d.line([(x + 1, y0 + 9), (x + 4, y0 + 3)], fill=c); x += 5; continue
            d.rectangle([x, y0 + 9 - h, x + w - 1, y0 + 8], fill=c)
            d.point((x, y0 + 9 - h + 2), fill=shade(c, 50)); x += w
wall_library = wall_tex(paint_library, ((80, 56, 40), (66, 46, 32)), ((70, 46, 30), (56, 36, 24)), GOLD, None, 34)

FAN = ["....x....", "..x.x.x..", ".x.xxx.x.", "x.xx.xx.x", ".xx...xx.", "..x...x..", "...xxx...", "....x...."]

def paint_damask(t, d, side, r):
    for row, y in enumerate(range(2, 30, 11)):
        for x in range(-6 + (row % 2) * 10, 62, 20):
            stampmap(d, FAN, x, y, (200, 170, 90))
            d.point((x + 4, y + 3), fill=(255, 230, 150))
    for x in range(4, 62, 8): d.point((x, 33), fill=(200, 170, 90))
wall_damask = wall_tex(paint_damask, ((34, 82, 64), (26, 66, 52)), ((60, 40, 30), (48, 32, 24)), GOLD, GOLD, 35)

def paint_chalk(t, d, side, r):
    d.rectangle([2, 4, 59, 31], fill=(116, 80, 46)); d.rectangle([3, 5, 58, 30], fill=(40, 70, 56))
    ch = (226, 236, 226)
    if side == 0:
        cx, cy = 16, 16                                                       # an atom
        d.ellipse([cx - 7, cy - 3, cx + 7, cy + 3], outline=ch); d.line([(cx - 5, cy - 5), (cx + 5, cy + 5)], fill=ch)
        d.line([(cx - 5, cy + 5), (cx + 5, cy - 5)], fill=ch); d.rectangle([cx - 1, cy - 1, cx + 1, cy + 1], fill=(250, 200, 120))
        d.line([(28 + k, 22 - round(4 * math.sin(k / 3))) for k in range(0, 26)], fill=(160, 220, 250))   # a wave
        d.line([(30, 27), (54, 27)], fill=ch); d.line([(30, 27), (30, 15)], fill=ch)
        d.line([(44, 9), (52, 9)], fill=ch); d.line([(50, 7), (52, 9), (50, 11)], fill=ch)               # an arrow
    else:
        cx, cy = 14, 18                                                       # a little chalk Ulhu
        d.arc([cx - 6, cy - 7, cx + 6, cy + 5], 180, 360, fill=ch); d.line([(cx - 6, cy - 1), (cx + 6, cy - 1)], fill=ch)
        for k in (-4, -1, 2, 5): d.line([(cx + k, cy), (cx + k, cy + 5)], fill=(160, 250, 200))
        d.point([(cx - 3, cy - 4), (cx + 2, cy - 4)], fill=ch)
        for k, (x, y) in enumerate(((32, 10), (40, 14), (48, 9), (54, 18))):  # a doodled constellation
            d.point((x, y), fill=(250, 220, 120))
        d.line([(32, 10), (40, 14), (48, 9), (54, 18)], fill=(120, 150, 130))
        d.rectangle([30, 23, 38, 27], outline=(250, 180, 190)); d.line([(30, 23), (34, 20), (38, 23)], fill=(250, 180, 190))   # a house
    d.rectangle([2, 31, 59, 32], fill=(150, 104, 60)); d.point([(10, 30), (11, 30), (40, 30)], fill=(250, 250, 250))  # chalk tray
wall_chalk = wall_tex(paint_chalk, ((150, 120, 90), (126, 100, 74)), ((90, 60, 36), (74, 50, 30)), (200, 160, 90), None, 36)

def paint_timbers(t, d, side, r):
    for y in range(0, 34, 4):
        c = (54, 50, 62) if (y // 4) % 2 else (62, 58, 70)
        d.rectangle([0, y, 61, y + 3], fill=c); d.line([(0, y), (61, y)], fill=(28, 26, 38))
        for x in range(3 + (y * 3) % 11, 62, 13): d.point([(x, y + 1), (x, y + 2)], fill=(110, 90, 70))
    for x in (14, 44):                                                        # ribs of the hull
        d.rectangle([x, 0, x + 3, 33], fill=(42, 38, 50)); d.line([(x, 0), (x, 33)], fill=(70, 66, 82))
    d.line([(20 + k, 4 + round(2 * math.sin(k / 4))) for k in range(0, 22)], fill=(170, 140, 90))   # a rope
    lay = Image.new('RGBA', t.size, (0, 0, 0, 0))
    bar = [(6, 30), (8, 31), (26, 29), (36, 30), (52, 28), (55, 30), (31, 12), (49, 16)]
    for x, y in bar: glow(lay, x, y, 5, 4, (90, 255, 200) if x % 2 else (255, 140, 220), 120)
    t.alpha_composite(lay); d = ImageDraw.Draw(t)
    for x, y in bar:                                                          # glowing barnacles
        d.point([(x, y), (x + 1, y), (x, y - 1)], fill=MINT_L if x % 2 else (255, 190, 235)); d.point((x + 1, y - 1), fill=(255, 255, 255))
    for x in (8, 27, 39, 58):                                                 # drips
        L = r.randint(2, 5); d.line([(x, 0), (x, L)], fill=(90, 150, 170)); d.point((x, L + 1), fill=(150, 220, 240))
wall_timbers = wall_tex(paint_timbers, ((58, 54, 66), (48, 44, 56)), ((30, 34, 52), (24, 28, 44)), (90, 255, 200), (90, 255, 200), 37)

def paint_starchart(t, d, side, r):
    lay = Image.new('RGBA', t.size, (0, 0, 0, 0))
    glow(lay, 40 if side == 0 else 20, 14, 18, 12, (110, 60, 170), 140); t.alpha_composite(lay); d = ImageDraw.Draw(t)
    cx, cy = (22, 16) if side == 0 else (40, 17)
    for rr in (13, 9):
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(150, 130, 70))
    for k in range(24):
        a = k / 24 * 2 * math.pi; d.point((round(cx + 13 * math.cos(a)), round(cy + 13 * math.sin(a))), fill=GOLD)
    d.line([(cx - 13, cy), (cx + 13, cy)], fill=(80, 74, 120)); d.line([(cx, cy - 13), (cx, cy + 13)], fill=(80, 74, 120))
    for _ in range(40): px(d, r.uniform(0, 61), r.uniform(0, 33), r.choice([(255, 255, 255), (200, 210, 255), (255, 236, 170)]))
    const = [(48, 6), (53, 10), (57, 7), (55, 16)] if side == 0 else [(4, 6), (9, 3), (12, 9), (7, 13)]
    d.line(const, fill=(220, 190, 110))
    for x, y in const: d.point([(x, y), (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)], fill=(255, 250, 220))
    px_ = (cx + 6, cy - 6)                                                    # a ringed planet on the chart
    d.ellipse([px_[0] - 2, px_[1] - 2, px_[0] + 2, px_[1] + 2], fill=(240, 150, 120)); d.line([(px_[0] - 4, px_[1] + 1), (px_[0] + 4, px_[1] - 1)], fill=GOLD)
    if side == 1:
        d.line([(56, 26), (48, 30)], fill=(150, 220, 255)); d.point((56, 26), fill=(255, 255, 255))      # a comet
    stampmap(d, GLYPHS[0], cx - 4, cy - 4, MINT_L)                            # the chart's watching eye
wall_starchart = wall_tex(paint_starchart, ((24, 26, 64), (18, 20, 52)), ((30, 22, 56), (24, 18, 46)), GOLD, GOLD, 38)


# ---------------------------------------------------------------- WINDOWS (left wall slot, drawn flat then sheared)
WIN_I, WIN_R = 40, 16          # wall column/row of the slot's centre (v=10, z=30), as in iso_room's porthole

def flat(w, h):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); return im, ImageDraw.Draw(im)

def place(img, f, glow_col=None, glow_a=110):
    s = shear(f, 0, WIN_I - f.width // 2, WIN_R - f.height // 2)
    if glow_col:
        bb = s.getbbox(); cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
        glow(img, cx, cy, f.width * 0.9, f.height * 0.8, glow_col, glow_a)
    img.alpha_composite(s)

def sea(d, x0, y0, x1, y1, top=(110, 190, 220), bot=(40, 100, 160)):
    h = max(1, y1 - y0)
    for y in range(y0, y1 + 1):
        k = (y - y0) / h; d.line([(x0, y), (x1, y)], fill=tuple(round(a + (b - a) * k) for a, b in zip(top, bot)))

def porthole(size, ring, ring_d, inside):
    """inside(im, d, cx, cy, r) paints the glass; then the brass ring goes on top."""
    f, d = flat(size, size); c = (size - 1) / 2; r = size / 2 - 0.5
    glass, gd = flat(size, size); inside(glass, gd, c, c, r - 2)
    m = Image.new('L', (size, size), 0); ImageDraw.Draw(m).ellipse([2, 2, size - 3, size - 3], fill=255)
    d.ellipse([0, 0, size - 1, size - 1], fill=ring, outline=ring_d)
    f.paste(glass, (0, 0), m)
    d.ellipse([2, 2, size - 3, size - 3], outline=ring_d)
    return f, d

def win_porthole(img):
    def inside(g, d, cx, cy, r):
        sea(d, 0, 0, g.width, g.height)
        d.point([(cx - 2, cy + 1), (cx - 1, cy + 1), (cx, cy + 1)], fill=(255, 214, 10)); d.point((cx + 1, cy), fill=(255, 214, 10))
        d.point([(cx + 3, cy - 3), (cx + 3, cy - 5)], fill=(230, 250, 255))
    f, d = porthole(17, (214, 168, 70), (120, 84, 30), inside)
    for a in range(0, 360, 60):
        d.point((round(8 + 7.4 * math.cos(math.radians(a))), round(8 + 7.4 * math.sin(math.radians(a)))), fill=(255, 226, 138))
    place(img, f)

def win_fourpane(img):
    f, d = flat(16, 18)
    sea(d, 1, 1, 14, 15)
    for k in range(3): d.line([(3 + 4 * k, 1), (1 + 4 * k, 15)], fill=(140, 210, 230))            # sun rays
    d.rectangle([0, 0, 15, 16], outline=(150, 104, 60)); d.rectangle([1, 1, 14, 15], outline=(120, 82, 46))
    d.line([(7, 1), (7, 15)], fill=(150, 104, 60)); d.line([(8, 1), (8, 15)], fill=(120, 82, 46)); d.line([(1, 8), (14, 8)], fill=(150, 104, 60))
    d.rectangle([0, 16, 15, 17], fill=(176, 126, 76))                                                  # sill
    d.point([(3, 12), (4, 12)], fill=(255, 150, 60))
    place(img, f)

def win_curtain(img):
    def inside(g, d, cx, cy, r):
        sea(d, 0, 0, g.width, g.height, (150, 210, 230), (70, 140, 190))
        d.point([(cx + 2, cy + 2), (cx + 3, cy + 2)], fill=(240, 120, 160))
    f, d = porthole(17, (236, 226, 200), (150, 140, 120), inside)
    g, gd = flat(21, 20); g.paste(f, (2, 1), f)
    for x0, s in ((0, 1), (20, -1)):                                          # gingham curtains tied back
        for y in range(0, 15):
            w = max(1, 4 - abs(y - 9) // 2)
            for k in range(w):
                x = x0 + s * k
                gd.point((x, y), fill=(220, 90, 100) if (x + y) % 2 else (250, 230, 230))
        gd.point([(x0 + s, 9), (x0 + 2 * s, 9)], fill=GOLD)
    gd.line([(0, 0), (20, 0)], fill=(150, 104, 60))
    place(img, g)

def arch(d, w, h, fill, outline=None):
    r = w // 2
    d.pieslice([0, 0, w - 1, w - 1], 180, 360, fill=fill, outline=outline)
    d.rectangle([0, r, w - 1, h - 1], fill=fill, outline=outline)
    if outline: d.line([(1, r), (w - 2, r)], fill=fill)

def arch_mask(w, h, inset):
    m = Image.new('L', (w, h), 0); dm = ImageDraw.Draw(m); r = w // 2
    dm.pieslice([inset, inset, w - 1 - inset, w - 1 - inset], 180, 360, fill=255)
    dm.rectangle([inset, r, w - 1 - inset, h - 1 - inset], fill=255); return m

def win_arched(img):
    w, h = 16, 25
    f, d = flat(w + 4, h + 3)
    a, ad = flat(w, h); arch(ad, w, h, CREAM, (150, 140, 120))
    g, gd = flat(w, h); sea(gd, 0, 0, w, h)
    for x, y in ((4, 14), (5, 11), (4, 8), (9, 16), (10, 12)): gd.point((x, y), fill=(230, 250, 255))
    gd.point([(8, 18), (9, 18), (10, 18)], fill=(255, 170, 80))
    a.paste(g, (0, 0), arch_mask(w, h, 2))
    ad.line([(w // 2, 2), (w // 2, h - 3)], fill=CREAM); ad.line([(2, 12), (w - 3, 12)], fill=CREAM)
    f.paste(a, (2, 0), a)
    d.rectangle([0, h, w + 3, h + 1], fill=(210, 200, 180))                   # sill + a tiny kelp pot
    d.rectangle([w - 1, h - 3, w + 1, h - 1], fill=(200, 110, 80)); d.line([(w, h - 4), (w, h - 7)], fill=(90, 200, 110)); d.point((w + 1, h - 6), fill=(90, 200, 110))
    place(img, f)

def win_twin(img):
    def mk(fish):
        def inside(g, d, cx, cy, r):
            sea(d, 0, 0, g.width, g.height)
            if fish: d.point([(cx - 1, cy), (cx, cy), (cx + 1, cy), (cx + 2, cy - 1), (cx + 2, cy + 1)], fill=fish)
            else: d.point([(cx, cy - 2), (cx + 1, cy - 3)], fill=(230, 250, 255))
        return porthole(13, (190, 196, 210), (90, 96, 110), inside)[0]
    f, d = flat(15, 28)
    f.paste(mk((255, 150, 60)), (1, 0)); a = mk(None); f.paste(a, (1, 14), a)
    for y in (0, 12, 14, 26): d.point([(7, y)], fill=(240, 240, 250))         # rivets
    place(img, f)

def win_kelp(img):
    f, d = flat(18, 18)
    sea(d, 1, 1, 16, 16, (90, 180, 200), (30, 90, 110))
    for k, x in enumerate((3, 7, 12, 15)):
        for y in range(16, 3 + k, -1):
            d.point((x + round(math.sin(y / 2 + k)), y), fill=(70, 170, 90) if y % 3 else (130, 210, 110))
    d.point([(9, 6), (10, 6), (11, 6), (8, 5), (8, 7)], fill=(255, 214, 10))
    d.rectangle([0, 0, 17, 17], outline=(60, 70, 80)); d.rectangle([1, 1, 16, 16], outline=(110, 120, 130))
    for x, y in ((0, 0), (17, 0), (0, 17), (17, 17)): d.point((x, y), fill=(200, 200, 210))
    place(img, f)

def win_stained(img):
    w, h = 18, 27
    f, d = flat(w, h)
    arch(d, w, h, (50, 40, 50))
    g, gd = flat(w, h)
    cols = [(90, 140, 220), (120, 200, 200), (90, 170, 120), (230, 190, 90), (150, 110, 210), (90, 140, 220)]
    for k in range(6):                                                        # coloured panes in bands
        gd.rectangle([0, 3 + k * 4, w, 6 + k * 4], fill=cols[k])
    gd.rectangle([0, 0, w, 3], fill=(200, 160, 240))
    for x in range(0, w, 5): gd.line([(x, 0), (x + 3, h)], fill=(50, 40, 50))
    for y in range(6, h, 4): gd.line([(0, y), (w, y)], fill=(50, 40, 50))
    cx, cy = 9, 15                                                            # an orange fish in the middle
    gd.ellipse([cx - 4, cy - 3, cx + 3, cy + 3], fill=(250, 150, 70), outline=(50, 40, 50))
    gd.polygon([(cx + 3, cy), (cx + 6, cy - 3), (cx + 6, cy + 3)], fill=(250, 190, 90), outline=(50, 40, 50))
    gd.point((cx - 2, cy - 1), fill=DARK)
    f.paste(g, (0, 0), arch_mask(w, h, 1))
    d.rectangle([0, h - 1, w - 1, h - 1], fill=GOLD_D)
    place(img, f)

def win_rose(img):
    s = 22; f, d = flat(s, s); c = s // 2
    d.ellipse([0, 0, s - 1, s - 1], fill=(120, 90, 60), outline=(70, 50, 34))
    cols = [(210, 70, 90), (90, 140, 220), (236, 190, 70), (90, 170, 120)]
    for k in range(8):
        a0 = k * 45
        d.pieslice([2, 2, s - 3, s - 3], a0, a0 + 45, fill=cols[k % 4], outline=(60, 44, 40))
    d.ellipse([c - 3, c - 3, c + 3, c + 3], fill=(250, 220, 120), outline=(60, 44, 40)); d.point((c, c), fill=(255, 255, 255))
    for k in range(8):
        a = math.radians(k * 45 + 22.5); d.point((round(c + 7 * math.cos(a)), round(c + 7 * math.sin(a))), fill=(255, 255, 255))
    place(img, f)

def win_diving(img):
    s = 22
    def inside(g, d, cx, cy, r):
        sea(d, 0, 0, g.width, g.height, (70, 130, 190), (20, 50, 100))
        d.pieslice([cx - 4, cy - 5, cx + 4, cy + 1], 180, 360, fill=PINK); d.line([(cx - 4, cy - 2), (cx + 4, cy - 2)], fill=PINK)
        for k in (-3, -1, 1, 3): d.line([(cx + k, cy - 1), (cx + k, cy + 3 + abs(k) % 2)], fill=(250, 200, 230))
        d.point([(cx - 1, cy - 4), (cx - 2, cy - 3)], fill=(255, 240, 250))
    f, d = porthole(s, (200, 150, 60), (110, 76, 30), inside)
    d.ellipse([1, 1, s - 2, s - 2], outline=(240, 200, 100))
    for k in range(8):
        a = k / 8 * 2 * math.pi; d.point((round(10.5 + 9.6 * math.cos(a)), round(10.5 + 9.6 * math.sin(a))), fill=(110, 110, 120))
    d.line([(4, 10), (17, 10)], fill=(150, 110, 50)); d.line([(10, 4), (10, 17)], fill=(150, 110, 50))   # grille bars
    d.line([(4, 11), (17, 11)], fill=(240, 200, 100))
    place(img, f)

def win_eye(img):
    s = 23
    def inside(g, d, cx, cy, r):
        cx, cy = int(cx), int(cy)
        sea(d, 0, 0, g.width, g.height, (20, 30, 70), (6, 8, 26))
        d.ellipse([cx - 9, cy - 5, cx + 9, cy + 5], fill=(250, 240, 200), outline=(90, 60, 30))   # a huge eye drifting past
        d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(110, 220, 130), outline=(40, 120, 70))
        d.rectangle([cx - 1, cy - 4, cx, cy + 4], fill=DARK)                                     # slit pupil
        d.rectangle([cx - 4, cy - 3, cx - 3, cy - 2], fill=(255, 255, 255))
        d.arc([cx - 9, cy - 8, cx + 9, cy + 4], 200, 340, fill=(130, 90, 200))                  # its heavy, sleepy lid
        for x, y in ((4, 5), (17, 17), (6, 18), (16, 4)): d.point((x, y), fill=(140, 200, 255))
    f, d = porthole(s, (70, 64, 96), (40, 34, 60), inside)
    for k in range(8):
        a = k / 8 * 2 * math.pi; d.point((round(11 + 10.4 * math.cos(a)), round(11 + 10.4 * math.sin(a))), fill=MINT)
    place(img, f, (120, 255, 170), 90)

def win_void(img):
    w, h = 18, 27
    f, d = flat(w, h); arch(d, w, h, (70, 50, 120), (40, 26, 70))
    g, gd = flat(w, h); sea(gd, 0, 0, w, h, (40, 20, 80), (10, 10, 30))
    lay = Image.new('RGBA', (w, h), (0, 0, 0, 0)); glow(lay, 6, 12, 7, 6, (200, 90, 200), 160); glow(lay, 11, 6, 5, 4, (80, 160, 230), 140)
    g.alpha_composite(lay); gd = ImageDraw.Draw(g)
    r = rnd(40)
    for _ in range(18): gd.point((r.randint(1, w - 2), r.randint(1, h - 2)), fill=r.choice([(255, 255, 255), (255, 236, 170), (190, 210, 255)]))
    gd.ellipse([8, 14, 12, 18], fill=(240, 150, 120)); gd.line([(6, 17), (14, 15)], fill=GOLD)          # ringed planet
    gd.line([(3, 4), (7, 7)], fill=(150, 220, 255)); gd.point((7, 7), fill=(255, 255, 255))            # comet
    f.paste(g, (0, 0), arch_mask(w, h, 2))
    for y in (10, 16, 22): d.point([(0, y), (w - 1, y)], fill=MINT)
    d.point((w // 2, 0), fill=MINT_L)
    place(img, f, (190, 120, 255), 90)

def win_rlyeh(img):
    w, h = 21, 27
    f, d = flat(w, h)
    frame = [(2, 0), (w - 1, 3), (w - 3, h - 1), (0, h - 2)]                  # a window with no right angles
    inner = [(4, 2), (w - 3, 5), (w - 5, h - 3), (2, h - 4)]
    d.polygon(frame, fill=(60, 84, 76), outline=(26, 40, 36))
    g, gd = flat(w, h); sea(gd, 0, 0, w, h, (30, 70, 70), (10, 30, 34))
    gd.ellipse([10, 3, 15, 8], fill=(220, 240, 180))                         # a green moon
    for x0, x1, top, lean in ((3, 6, 9, 1), (7, 10, 6, -1), (11, 14, 11, 2), (14, 16, 14, 0)):   # tilted towers
        gd.polygon([(x0, h), (x1, h), (x1 + lean, top), (x0 + lean, top + 1)], fill=(20, 50, 44))
        for y in range(top + 3, h - 3, 3): gd.point((x0 + 1 + lean // 2, y), fill=(120, 255, 170))
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).polygon(inner, fill=255)
    f.paste(g, (0, 0), m)
    d.line([(4, 13), (w - 4, 14)], fill=(60, 84, 76))
    for x, y in frame: d.point((x, y), fill=MINT_L)
    place(img, f, (90, 255, 170), 80)


# ---------------------------------------------------------------- LIGHTS (standing: front-left spot LX, LY; hanging from above)
def light_lantern(img):
    x, y = LX, LY
    glow(img, x, y - 7, 10, 8, (255, 210, 120), 110); d = ImageDraw.Draw(img)
    d.rectangle([x - 4, y - 1, x + 4, y], fill=(60, 60, 70))
    d.rectangle([x - 3, y - 10, x + 3, y - 2], fill=(255, 236, 170), outline=(60, 60, 70))
    d.line([(x, y - 10), (x, y - 2)], fill=(60, 60, 70))
    d.polygon([(x - 4, y - 11), (x + 4, y - 11), (x, y - 14)], fill=(70, 70, 82)); d.arc([x - 2, y - 18, x + 2, y - 13], 180, 360, fill=(90, 90, 100))
    d.point([(x - 2, y - 6), (x - 2, y - 5)], fill=(255, 180, 60)); d.point((x - 2, y - 7), fill=(255, 250, 220))

def light_shell(img):
    x, y = LX, LY
    glow(img, x, y - 6, 12, 9, (255, 200, 230), 120); d = ImageDraw.Draw(img)
    d.polygon([(x - 2, y), (x + 2, y), (x + 3, y + 2), (x - 3, y + 2)], fill=(230, 170, 180), outline=(170, 100, 120))   # hinge
    d.pieslice([x - 8, y - 10, x + 8, y + 6], 200, 340, fill=(250, 214, 220), outline=(170, 100, 120))
    d.polygon([(x - 7, y - 4), (x + 7, y - 4), (x + 2, y), (x - 2, y)], fill=(250, 214, 220))
    for k in (-6, -3, 0, 3, 6): d.line([(x, y), (x + k, y - 9 + abs(k) // 3)], fill=(214, 140, 160))    # ridges
    d.line([(x - 7, y - 4), (x - 2, y), (x + 2, y), (x + 7, y - 4)], fill=(170, 100, 120))
    d.ellipse([x - 2, y - 1, x + 2, y + 3], fill=(255, 255, 245), outline=(200, 190, 210)); px(d, x - 1, y, (255, 255, 255))   # pearl

def light_bankers(img):
    box(ImageDraw.Draw(img), 10, 25, 14, 29, 0, 7, (110, 70, 40), (86, 54, 30), (98, 62, 34))
    x, y = P(12, 27, 7)
    glow(img, x, y - 2, 10, 5, (255, 236, 160), 110); d = ImageDraw.Draw(img)
    d.rectangle([x - 2, y - 1, x + 2, y], fill=GOLD_D); d.line([(x, y - 1), (x, y - 6)], fill=GOLD)
    d.pieslice([x - 6, y - 10, x + 6, y - 2], 180, 360, fill=(40, 130, 80), outline=(20, 70, 40))
    d.line([(x - 5, y - 7), (x - 1, y - 9)], fill=(110, 200, 140)); d.line([(x - 6, y - 6), (x + 6, y - 6)], fill=GOLD)
    d.line([(x + 2, y - 5), (x + 2, y - 3)], fill=GOLD); px(d, x + 2, y - 2, GOLD_D)          # pull chain

def light_puffer(img, at=None):
    x, y = at or P(12, 27, 40)
    glow(img, x, y + 12, 11, 10, (255, 190, 110), 110); d = ImageDraw.Draw(img)
    d.line([(x, y - 2), (x, y + 6)], fill=(90, 80, 70))
    cx, cy = x, y + 12
    for k in range(10):                                                       # spikes
        a = k / 10 * 2 * math.pi; d.line([(cx + 5 * math.cos(a), cy + 5 * math.sin(a)), (cx + 7 * math.cos(a), cy + 7 * math.sin(a))], fill=(200, 120, 50))
    d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(255, 190, 90), outline=(200, 120, 50))
    d.chord([cx - 6, cy - 6, cx + 6, cy + 6], 20, 160, fill=(255, 236, 180))
    for ex in (cx - 3, cx + 2): d.rectangle([ex, cy - 2, ex + 1, cy - 1], fill=DARK)
    d.ellipse([cx - 1, cy + 1, cx + 1, cy + 3], fill=(200, 90, 70))
    px(d, cx - 5, cy + 1, PINK); px(d, cx + 5, cy + 1, PINK)
    d.polygon([(cx + 6, cy), (cx + 9, cy - 2), (cx + 9, cy + 2)], fill=(255, 170, 80))

def light_coral(img):
    x, y = LX, LY
    for cx, cy in ((x - 5, y - 21), (x, y - 25), (x + 5, y - 20)): glow(img, cx, cy - 2, 6, 6, (255, 220, 140), 110)
    d = ImageDraw.Draw(img)
    d.ellipse([x - 4, y - 2, x + 4, y + 1], fill=(160, 150, 140))
    branch = (240, 110, 130)
    d.line([(x, y), (x, y - 20)], fill=branch, width=2)
    d.line([(x, y - 10), (x - 5, y - 14), (x - 5, y - 18)], fill=branch, width=2)
    d.line([(x, y - 12), (x + 5, y - 15), (x + 5, y - 17)], fill=branch, width=2)
    for k in (6, 14): px(d, x - 1, y - k, (255, 180, 190)); px(d, x + 1, y - k - 2, (200, 80, 100))
    for cx, cy in ((x - 5, y - 19), (x, y - 21), (x + 5, y - 18)):
        d.rectangle([cx - 1, cy - 4, cx + 1, cy], fill=(250, 245, 225)); px(d, cx, cy - 5, (60, 40, 30))
        d.point([(cx, cy - 7), (cx, cy - 6)], fill=(255, 200, 60)); px(d, cx, cy - 8, (255, 240, 170))

def light_orrery(img):
    x, y = LX, LY
    glow(img, x, y - 24, 14, 12, (255, 220, 140), 120); d = ImageDraw.Draw(img)
    d.ellipse([x - 4, y - 1, x + 4, y + 1], fill=GOLD_D); d.line([(x, y), (x, y - 18)], fill=GOLD)
    d.line([(x - 1, y), (x - 1, y - 18)], fill=GOLD_D)
    d.ellipse([x - 9, y - 27, x + 9, y - 21], outline=GOLD)                   # orbit ring
    d.ellipse([x - 4, y - 28, x + 4, y - 20], fill=(255, 236, 160), outline=(220, 150, 60))   # glowing sun globe
    px(d, x - 2, y - 26, (255, 255, 240)); px(d, x - 1, y - 26, (255, 255, 240))
    for (ox, oy, c) in ((x - 9, y - 24, (120, 180, 240)), (x + 8, y - 23, (240, 140, 110)), (x + 2, y - 21, (150, 220, 150))):
        d.ellipse([ox - 1, oy - 1, ox + 1, oy + 1], fill=c)

def light_eye_orb(img, at=None):
    x, y = at or (LX, LY - 18)
    glow(img, x, y, 16, 14, (180, 120, 255), 130); glow(img, x, y, 8, 7, (120, 255, 200), 110)
    d = ImageDraw.Draw(img)
    fx, fy = x, (at[1] + 16 if at else LY)                                   # its shadow on the floor
    d.ellipse([fx - 5, fy - 1, fx + 5, fy + 1], fill=(40, 30, 64))
    d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(240, 236, 250), outline=(80, 52, 140))
    d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(150, 110, 230)); d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=DARK)
    d.rectangle([x - 3, y - 4, x - 2, y - 3], fill=(255, 255, 255))
    d.arc([x - 7, y - 7, x + 7, y + 7], 200, 340, fill=(190, 150, 240))       # sleepy lid line
    d.ellipse([x - 11, y - 2, x + 11, y + 3], outline=(120, 255, 200))        # floating ring
    for k in (-4, 0, 4):                                                     # little tentacle tufts
        d.line([(x + k, y + 7), (x + k + (1 if k else 0), y + 10)], fill=(150, 110, 230))
        px(d, x + k + (1 if k else 0), y + 11, MINT_L)
    for sx, sy in ((x - 12, y - 8), (x + 11, y - 9), (x + 13, y + 6)):
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)): px(d, sx + dx, sy + dy, MINT_L if dx or dy else (255, 255, 255))

def light_lure(img):
    x, y = LX, LY
    rock = (60, 60, 92)
    d = ImageDraw.Draw(img)
    d.pieslice([x - 9, y - 10, x + 9, y + 6], 180, 360, fill=rock, outline=(30, 30, 50))
    d.line([(x - 9, y - 2), (x + 9, y - 2)], fill=(30, 30, 50))
    px(d, x - 5, y - 8, (96, 96, 130)); px(d, x - 4, y - 8, (96, 96, 130)); px(d, x + 6, y - 5, (90, 160, 120))
    for ex in (x - 4, x + 1):                                                 # the shy anglerfish hiding in the rock
        d.rectangle([ex, y - 4, ex + 2, y - 3], fill=(255, 255, 255)); px(d, ex + 1, y - 3, DARK)
    d.line([(x - 2, y - 1), (x + 2, y - 1)], fill=(250, 250, 250)); px(d, x - 1, y, (250, 250, 250)); px(d, x + 1, y, (250, 250, 250))
    lx, ly = x + 5, y - 22
    glow(img, lx, ly, 14, 13, (255, 236, 120), 160); glow(img, lx, ly, 6, 6, (255, 255, 200), 160)
    d = ImageDraw.Draw(img)
    stalk = [(x, y - 9), (x - 2, y - 14), (x - 1, y - 18), (x + 2, y - 22), (lx - 1, ly)]
    d.line(stalk, fill=(60, 60, 92), width=2); d.line(stalk, fill=(130, 130, 170), width=1)
    d.ellipse([lx - 3, ly - 3, lx + 3, ly + 3], fill=(255, 236, 120), outline=(220, 170, 60)); d.rectangle([lx - 1, ly - 1, lx, ly], fill=(255, 255, 240))


# ---------------------------------------------------------------- the item list (prices in Eldritch Doubloons)
def lock_out(n): return {'type': 'outside_work', 'count': n, 'text': f'needs {n} outside-work ticks'}
def lock_lv(n): return {'type': 'level', 'min': n, 'text': f'needs level {n}'}

CATS = {
    'floors': ('Floors', 'floor', [
        ('Basic', 'pine_planks', 'Pine planks', 0, None, I.floor_pine),
        ('Basic', 'sandy_floor', 'Sandy floor', 80, None, floor_sand),
        ('Basic', 'grey_flagstones', 'Grey flagstones', 110, None, floor_flagstones),
        ('Nice', 'checker_tiles', 'Checker tiles', 200, None, I.floor_checker),
        ('Nice', 'library_parquet', 'Library parquet', 260, None, floor_parquet),
        ('Nice', 'wave_mosaic', 'Wave mosaic', 320, None, floor_wave_mosaic),
        ('Fancy', 'deep_blue_carpet', 'Deep-blue carpet', 550, None, I.floor_royal),
        ('Fancy', 'ship_deck_compass', "Ship's deck + compass", 520, None, floor_ship_deck),
        ('Fancy', 'gold_inlay_marble', 'Gold-inlay marble', 600, None, floor_marble),
        ('Eldritch', 'starfield_floor', 'Starfield floor', 1200, lock_lv(15), I.floor_starfield),
        ('Eldritch', 'rlyeh_stone', "R'lyeh stone", 1000, None, floor_rlyeh),
        ('Eldritch', 'non_euclidean_tiles', 'Non-Euclidean tiles', 1400, lock_out(10), floor_noneuclid)]),
    'rugs': ('Rugs', 'rug', [
        ('Basic', 'plain_rug', 'Plain rug', 0, None, I.rug_plain),
        ('Basic', 'rag_rug', 'Rag rug', 80, None, rug_rag),
        ('Basic', 'kelp_mat', 'Kelp mat', 100, None, rug_kelp_mat),
        ('Nice', 'woven_rug', 'Woven rug', 180, None, I.rug_woven),
        ('Nice', 'fish_rug', 'Fish rug', 220, None, rug_fish),
        ('Nice', 'open_book_rug', 'Open-book rug', 280, None, rug_book),
        ('Fancy', 'spiral_rug', 'Spiral rug', 500, None, I.rug_spiral),
        ('Fancy', 'medallion_rug', 'Medallion rug', 560, None, rug_medallion),
        ('Fancy', 'star_chart_rug', 'Star-chart rug', 600, None, rug_starchart),
        ('Eldritch', 'tentacle_rug', 'Tentacle rug', 1100, None, I.rug_tentacle),
        ('Eldritch', 'sleepy_eye_rug', 'Sleepy eye rug', 1200, lock_lv(10), rug_eye),
        ('Eldritch', 'tide_hole', 'Tide hole (waves back)', 1300, lock_out(8), rug_tidehole)]),
    'wallpapers': ('Wallpapers', 'walls', [
        ('Basic', 'plain', 'Plain', 0, None, I.wall_plain),
        ('Basic', 'wood_panels', 'Wood panels', 90, None, wall_wood),
        ('Basic', 'whitewash_brick', 'Whitewash brick', 120, None, wall_brick),
        ('Nice', 'stripes', 'Stripes', 180, None, I.wall_stripes),
        ('Nice', 'cosy_waves', 'Cosy waves', 240, None, wall_waves),
        ('Nice', 'library_print', 'Library print', 300, None, wall_library),
        ('Fancy', 'scales', 'Scales', 550, None, I.wall_scales),
        ('Fancy', 'study_damask', 'Study damask', 520, None, wall_damask),
        ('Fancy', 'chalkboard_wall', 'Chalkboard wall', 580, None, wall_chalk),
        ('Eldritch', 'glowing_glyphs', 'Glowing glyphs', 1000, None, wall_glyphs),
        ('Eldritch', 'sunken_ship_timbers', 'Sunken-ship timbers', 1100, lock_out(6), wall_timbers),
        ('Eldritch', 'star_chart_walls', 'Star-chart walls', 1300, lock_lv(15), wall_starchart)]),
    'windows': ('Windows (left-wall slot)', 'left_wall_window', [
        ('Basic', 'brass_porthole', 'Brass porthole', 0, None, win_porthole),
        ('Basic', 'four_pane_window', 'Four-pane window', 80, None, win_fourpane),
        ('Basic', 'curtained_porthole', 'Curtained porthole', 110, None, win_curtain),
        ('Nice', 'arched_window', 'Arched window', 200, None, win_arched),
        ('Nice', 'twin_portholes', 'Twin portholes', 240, None, win_twin),
        ('Nice', 'kelp_forest_view', 'Kelp-forest view', 320, None, win_kelp),
        ('Fancy', 'stained_glass_fish', 'Stained-glass fish', 550, None, win_stained),
        ('Fancy', 'rose_window', 'Rose window', 600, None, win_rose),
        ('Fancy', 'diving_bell_porthole', 'Diving-bell porthole', 520, None, win_diving),
        ('Eldritch', 'eye_in_the_deep', 'Eye in the deep', 1200, lock_out(5), win_eye),
        ('Eldritch', 'window_on_the_void', 'Window on the void', 1000, None, win_void),
        ('Eldritch', 'rlyeh_view', "R'lyeh view", 1400, lock_lv(15), win_rlyeh)]),
    'lights': ('Lights', 'light', [
        ('Basic', 'candle', 'Candle', 0, None, I.light_candle),
        ('Basic', 'ships_lantern', "Ship's lantern", 90, None, light_lantern),
        ('Basic', 'shell_night_light', 'Shell night light', 110, None, light_shell),
        ('Nice', 'lamp', 'Lamp', 160, None, I.light_lamp),
        ('Nice', 'bankers_lamp', "Banker's lamp", 240, None, light_bankers),
        ('Nice', 'pufferfish_lantern', 'Pufferfish lantern', 300, None, light_puffer),
        ('Fancy', 'jellyfish_lamp', 'Jellyfish lamp', 500, None, I.light_jelly),
        ('Fancy', 'coral_candelabra', 'Coral candelabra', 560, None, light_coral),
        ('Fancy', 'brass_orrery_lamp', 'Brass orrery lamp', 600, None, light_orrery),
        ('Eldritch', 'jellyfish_chandelier', 'Jellyfish chandelier', 1300, None, I.light_chandelier),
        ('Eldritch', 'floating_eye_orb', 'Floating eye orb', 1000, None, light_eye_orb),
        ('Eldritch', 'anglerfish_lure_lamp', 'Anglerfish lure lamp', 1150, lock_out(6), light_lure)]),
}

TIER_NOTE = {'Basic': 'BASIC   free to 120', 'Nice': 'NICE   150 to 350', 'Fancy': 'FANCY   500 to 600',
             'Eldritch': '* ELDRITCH *   the big buys: they glow'}


def item_png(fn):
    im = canvas(); fn(im); return im.crop(im.getbbox())

def price_txt(p):
    return 'Free' if p == 0 else f'{p:,} Ð'

def catalogue(key, title, entries):
    """entries: (tier, label, price, lock, 1x image). Rows = tiers, 3 per row."""
    maxw = max(e[4].width for e in entries)
    S = 4 if maxw * 4 <= 400 else 3
    big = [(t, l, p, lk, im.resize((im.width * S, im.height * S), Image.NEAREST)) for t, l, p, lk, im in entries]
    iw = max(b.width for *_, b in big); ih = max(b.height for *_, b in big)
    pad, txt, gap, top, head = 16, 76, 16, 74, 34
    cw, ch = max(iw + 2 * pad, 250), ih + 2 * pad + txt
    sheet = Image.new('RGBA', (3 * cw + 4 * gap, top + 4 * (head + ch + gap)), BG + (255,))
    d = ImageDraw.Draw(sheet)
    d.text((gap, 20), title, fill=(240, 236, 226), font=font(30))
    d.text((sheet.width - gap, 30), f'x{S}  |  prices in Eldritch Doubloons (Ð)', fill=(130, 140, 170), font=font(16), anchor='ra')
    for row, tier in enumerate(TIERS):
        y0 = top + row * (head + ch + gap)
        eld = tier == 'Eldritch'
        if eld:
            d.rounded_rectangle([gap // 2, y0 - 6, sheet.width - gap // 2, y0 + head + ch + 6], 12, fill=(28, 20, 52), outline=MINT, width=2)
        d.text((gap, y0 + 6), TIER_NOTE[tier], fill=TIER_COL[tier], font=font(19))
        for k, (t, l, p, lk, b) in enumerate([e for e in big if e[0] == tier]):
            cx0 = gap + k * (cw + gap); cy0 = y0 + head
            d.rounded_rectangle([cx0, cy0, cx0 + cw, cy0 + ch], 10, fill=CARD_E if eld else CARD,
                                outline=MINT if eld else (52, 62, 90), width=2 if eld else 1)
            sheet.alpha_composite(b, (cx0 + (cw - b.width) // 2, cy0 + pad + (ih - b.height) // 2))
            d.text((cx0 + cw // 2, cy0 + ch - txt + 6), l, fill=(240, 236, 226), font=font(18), anchor='ma')
            d.text((cx0 + cw // 2, cy0 + ch - txt + 30), price_txt(p), fill=TIER_COL[tier], font=font(17), anchor='ma')
            if lk: d.text((cx0 + cw // 2, cy0 + ch - txt + 52), lk['text'], fill=(200, 170, 255), font=font(14), anchor='ma')
    sheet.save(os.path.join(OUT_DESIGN, f'shop_{key}.png'))


# ---------------------------------------------------------------- the new Fancy/Eldritch Study
def fancy_room2():
    img = canvas()
    wall_glyphs(img)                          # Eldritch walls with the fixed glyphs
    floor_rlyeh(img)                          # Eldritch floor
    win_eye(img)                              # Eldritch window
    d = ImageDraw.Draw(img)
    for v0, col in [(20, GOLD), (25, PINK)]:  # the two left-wall pennants, as in the basic Study
        poly(d, [P(0, v0, 42), P(0, v0 + 3, 42), P(0, v0 + 1.5, 37)], col)
    rug_starchart(img)                        # Fancy rug
    I.aqua_wall(img)                          # Fancy wall aquarium (not this sheet's category, for context)
    d = ImageDraw.Draw(img)
    box(d, 2, 0, 9, 4, 0, 34, (130, 88, 50), (104, 70, 38), (116, 78, 44))
    for z0 in (4, 13, 22):
        for i, col in enumerate([(200, 70, 70), (70, 120, 200), (236, 190, 70), (90, 160, 100), (170, 110, 200), (220, 140, 80)]):
            u = 2.5 + i
            poly(d, [P(u, 4, z0), P(u + 0.9, 4, z0), P(u + 0.9, 4, z0 + 7), P(u, 4, z0 + 7)], col)
    I.home_terrarium(img)
    d = ImageDraw.Draw(img)
    box(d, 1, 8, 7, 14, 0, 5, (120, 160, 110), (90, 130, 84), (100, 142, 92))
    box(d, 1, 8, 3, 14, 5, 12, (120, 160, 110), (90, 130, 84), (100, 142, 92))
    box(d, 24, 14, 29, 22, 0, 9, (150, 104, 60), (120, 82, 46), (134, 92, 52))
    x, y = P(26, 16, 9); d.rectangle([x - 1, y - 3, x + 1, y], fill=(240, 240, 240)); px(d, x + 2, y - 2, (240, 240, 240))
    x, y = P(27, 20, 9); d.rectangle([x - 3, y - 2, x + 2, y], fill=(200, 70, 70)); d.rectangle([x - 2, y - 4, x + 2, y - 2], fill=(70, 120, 200))
    light_orrery(img)                         # Fancy standing light, front left
    spr = I.hat_tentacle_crown(I.ulhu(False))
    fx, fy = P(17, 17); ux, uy = round(fx) - 16, round(fy) - 31
    img.alpha_composite(spr, (ux, uy))
    # Eldritch chandelier hung high in the corner, then checked so it never touches Ulhu's head
    ch_at = (64, 14)
    lay = canvas(); I.light_chandelier(lay, ch_at)
    solid = lay.getchannel('A').point(lambda a: 255 if a > 200 else 0).getbbox()
    head = spr.getbbox(); head = (head[0] + ux, head[1] + uy, head[2] + ux, head[3] + uy)
    assert solid[3] + 4 <= head[1] or solid[2] <= head[0] or solid[0] >= head[2], ('chandelier overlaps Ulhu', solid, head)
    img.alpha_composite(lay)
    return img


def main():
    os.makedirs(OUT_ITEMS, exist_ok=True)
    rows = []
    for key, (title, zone, items) in CATS.items():
        ents, n = [], {}
        for tier, name, label, price, lock, fn in items:
            n[tier] = n.get(tier, 0) + 1
            iid = f'{key}_{tier.lower()}_{n[tier]}_{name}'
            im = item_png(fn); im.save(os.path.join(OUT_ITEMS, iid + '.png'))
            ents.append((tier, label, price, lock, im))
            rows.append({'id': iid, 'name': label, 'category': key, 'zone': zone, 'tier': tier, 'price': price,
                         'lock': None if lock is None else {k: v for k, v in lock.items() if k != 'text'} | {'text': lock['text']}})
        catalogue(key, title, ents)
    with open(os.path.join(OUT_DESIGN, 'shop_surfaces.json'), 'w', encoding='utf-8') as f:
        json.dump({'currency': 'Eldritch Doubloons (Ð)', 'bands': {'Basic': [0, 120], 'Nice': [150, 350], 'Fancy': [500, 600], 'Eldritch': [900, 1400]},
                   'items': rows}, f, indent=2, ensure_ascii=False)
    for r_ in rows:
        lo, hi = {'Basic': (0, 120), 'Nice': (150, 350), 'Fancy': (500, 600), 'Eldritch': (900, 1400)}[r_['tier']]
        assert lo <= r_['price'] <= hi, r_
    room = fancy_room2()
    bg = Image.new('RGBA', (W + 8, H + 8), BG + (255,)); bg.alpha_composite(room, (4, 4))
    bg.resize(((W + 8) * 4, (H + 8) * 4), Image.NEAREST).save(os.path.join(OUT_DESIGN, 'room_iso_fancy2.png'))
    print(len(rows), 'items ->', OUT_ITEMS, '| catalogues, shop_surfaces.json, room_iso_fancy2.png -> design/')

if __name__ == '__main__':
    main()
