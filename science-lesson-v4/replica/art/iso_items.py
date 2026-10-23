"""Isometric shop items for the Study (Ulhu's corner room): floors, rugs, wallpapers, the aquarium and
pet-home upgrade lines, lights, pets and outfits. Original art, drawn from shapes with Pillow.

python iso_items.py ->
  items/iso/<name>.png          every item at 1x (cropped)
  ../design/catalogue_<cat>.png one labelled sheet per category (x4, whole-number scaling only)
  ../design/room_iso_fancy.png  the Study with a Fancy/Eldritch mix applied (x4)

Uses P(), poly(), box() and the canvas size from iso_room.py, and render() from cthulhu_pixel.py
(both read only). Each room item draws itself at its own zone position in room coordinates, so the
same function makes the shop picture and places the item in the room.
"""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cthulhu_pixel as C                                   # read only
from iso_room import P, poly, box, W, H, WALL               # read only

OUT_ITEMS = os.path.join(HERE, 'items', 'iso')
OUT_DESIGN = os.path.join(HERE, '..', 'design')
S = 4
EDGE = (30, 30, 40)
INK = (30, 24, 40)
GOLD, GOLD_D = (236, 190, 70), (180, 132, 40)
MINT, MINT_L = (120, 240, 190), (200, 255, 225)
VIOLET, VIOLET_D = (130, 90, 200), (80, 52, 140)
PINK = (245, 170, 210)


# ---------------------------------------------------------------- helpers
def canvas():
    return Image.new('RGBA', (W, H), (0, 0, 0, 0))

def glow(img, cx, cy, rx, ry, col, a=110):
    """Stepped (3-ring) soft light. Composited on its own layer so it blends."""
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); dl = ImageDraw.Draw(lay)
    for k, aa in ((1.0, a // 4), (0.68, a // 2), (0.38, a)):
        dl.ellipse([round(cx - rx * k), round(cy - ry * k), round(cx + rx * k), round(cy + ry * k)], fill=col + (aa,))
    img.alpha_composite(lay)

def px(d, x, y, c):
    d.point((round(x), round(y)), fill=c)

def mask_of(pts):
    m = Image.new('L', (W, H), 0); poly(ImageDraw.Draw(m), pts, 255); return m

FLOOR_PTS = [P(0, 0), P(30, 0), P(30, 30), P(0, 30)]
LWALL_PTS = [P(0, 0, WALL), P(0, 30, WALL), P(0, 30), P(0, 0)]
RWALL_PTS = [P(0, 0, WALL), P(30, 0, WALL), P(30, 0), P(0, 0)]

def clipped(img, pts, painter):
    """Paint on an opaque layer, then paste only inside the polygon."""
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    painter(lay, ImageDraw.Draw(lay))
    img.paste(lay, (0, 0), mask_of(pts))

def stamp(img, rows, x0, y0, pal):
    """Put a little char map onto img; returns the set of painted pixels."""
    pts = set()
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == '.': continue
            x, y = x0 + i, y0 + j
            if 0 <= x < img.width and 0 <= y < img.height:
                img.putpixel((x, y), pal[ch] + (255,)); pts.add((x, y))
    return pts

def outline_pts(img, pts, col=INK):
    """Dark outline round a set of new pixels, only where the outside is empty."""
    for x, y in list(pts):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in pts and 0 <= q[0] < img.width and 0 <= q[1] < img.height and img.getpixel(q)[3] == 0:
                img.putpixel(q, col + (255,))

def outline_all(img, col=INK):
    """Outline every opaque pixel of a small sprite (pets)."""
    a = img.getchannel('A'); w, h = img.size
    for y in range(h):
        for x in range(w):
            if a.getpixel((x, y)) == 0 and any(0 <= x + dx < w and 0 <= y + dy < h and a.getpixel((x + dx, y + dy)) > 0
                                                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                img.putpixel((x, y), col + (255,))
    return img


# ---------------------------------------------------------------- 1 floors
def floor_pine(img):
    def paint(l, d):
        poly(d, FLOOR_PTS, (160, 112, 64))
        for v in range(0, 30, 3):
            poly(d, [P(0, v), P(30, v), P(30, v + 1.5), P(0, v + 1.5)], (146, 100, 56))
            j = 7 if (v // 3) % 2 else 15
            d.line([P(j, v), P(j, v + 3)], fill=(120, 80, 44))
            d.line([P(j + 15 if j < 15 else j - 12, v), P(j + 15 if j < 15 else j - 12, v + 3)], fill=(120, 80, 44))
        for u, v in ((4, 5), (22, 11), (12, 23), (26, 26)):                 # knots
            x, y = P(u, v); px(d, x, y, (112, 74, 40)); px(d, x + 1, y, (112, 74, 40))
    clipped(img, FLOOR_PTS, paint)

def floor_checker(img):
    def paint(l, d):
        for i in range(10):
            for j in range(10):
                c = (236, 226, 200) if (i + j) % 2 == 0 else (62, 128, 138)
                poly(d, [P(3 * i, 3 * j), P(3 * i + 3, 3 * j), P(3 * i + 3, 3 * j + 3), P(3 * i, 3 * j + 3)], c)
                if (i + j) % 2 == 0:
                    x, y = P(3 * i + 1, 3 * j + 1); px(d, x, y, (255, 250, 236))          # shine
                else:
                    x, y = P(3 * i + 2, 3 * j + 2); px(d, x, y, (48, 106, 116))
    clipped(img, FLOOR_PTS, paint)

def floor_royal(img):
    def paint(l, d):
        rnd = random.Random(7)
        poly(d, FLOOR_PTS, GOLD)
        poly(d, [P(1.5, 1.5), P(28.5, 1.5), P(28.5, 28.5), P(1.5, 28.5)], (36, 54, 124))
        for _ in range(260):                                                 # carpet pile
            u, v = rnd.uniform(2, 28), rnd.uniform(2, 28); x, y = P(u, v); px(d, x, y, (30, 46, 108))
        poly(d, [P(3.5, 3.5), P(26.5, 3.5), P(26.5, 26.5), P(3.5, 26.5)], None, GOLD_D)
        for u in range(7, 26, 6):                                            # little gold diamonds
            for v in range(7, 26, 6):
                x, y = P(u, v)
                d.polygon([(x, y - 2), (x + 2, y), (x, y + 2), (x - 2, y)], fill=(212, 170, 60))
                px(d, x, y, (255, 230, 150))
        for u, v in ((1.5, 1.5), (28.5, 1.5), (28.5, 28.5), (1.5, 28.5)):   # corner studs
            x, y = P(u, v); d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=(255, 226, 138))
        for t in range(2, 29, 2):                                            # border stitch
            for a, b in ((t, 0.7), (0.7, t)):
                x, y = P(a, b); px(d, x, y, GOLD_D)
    clipped(img, FLOOR_PTS, paint)

def floor_starfield(img):
    def paint(l, d):
        rnd = random.Random(11)
        poly(d, FLOOR_PTS, (22, 16, 48))
        for u in range(0, 31, 6):                                            # faint void tiles
            d.line([P(u, 0), P(u, 30)], fill=(40, 30, 82)); d.line([P(0, u), P(30, u)], fill=(40, 30, 82))
        for (u, v, rx, ry, c) in ((9, 20, 18, 9, (88, 44, 130)), (22, 8, 16, 8, (30, 80, 110)), (20, 24, 10, 5, (120, 50, 120))):
            glow(l, *P(u, v), rx, ry, c, 150)
        for _ in range(70):
            x, y = P(rnd.uniform(0.5, 29.5), rnd.uniform(0.5, 29.5))
            px(d, x, y, rnd.choice([(255, 255, 255), (255, 240, 180), MINT_L, (200, 190, 255)]))
        for u, v in ((6, 7), (19, 15), (25, 23), (11, 26), (24, 4)):         # twinkling crosses
            x, y = P(u, v)
            glow(l, x, y, 4, 3, (200, 230, 255), 120)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): px(d, x + dx, y + dy, (170, 200, 255))
            px(d, x, y, (255, 255, 255))
        x, y = P(14, 9)                                                      # a tiny ringed planet
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(240, 150, 120)); d.line([(x - 4, y + 1), (x + 4, y - 1)], fill=GOLD)
    clipped(img, FLOOR_PTS, paint)


# ---------------------------------------------------------------- 3+4 wallpapers (both walls)
def walls(img, upper, lower, rail, pattern=None, trim=None):
    """upper/lower = (left colour, right colour). Right wall is a shade darker (light from the left)."""
    for pts, side in ((LWALL_PTS, 0), (RWALL_PTS, 1)):
        def paint(l, d, side=side):
            Q = (lambda a, z: P(0, a, z)) if side == 0 else (lambda a, z: P(a, 0, z))
            poly(d, [Q(0, WALL), Q(30, WALL), Q(30, 0), Q(0, 0)], upper[side])
            if pattern: pattern(l, d, Q, side)
            poly(d, [Q(0, 14), Q(30, 14), Q(30, 0), Q(0, 0)], lower[side])
            for a in range(0, 30, 5):                                        # panel lines on the dado
                d.line([Q(a + 2.5, 12), Q(a + 2.5, 2)], fill=tuple(max(0, c - 14) for c in lower[side]))
            d.line([Q(0, 14), Q(30, 14)], fill=rail); d.line([Q(0, 13), Q(30, 13)], fill=tuple(max(0, c - 50) for c in rail))
            if trim:
                d.line([Q(0, WALL - 1), Q(30, WALL - 1)], fill=trim)
        clipped(img, pts, paint)
    d = ImageDraw.Draw(img)
    for a, b in [(P(0, 0, WALL), P(0, 30, WALL)), (P(0, 0, WALL), P(30, 0, WALL)), (P(0, 0, WALL), P(0, 0))]:
        d.line([a, b], fill=(24, 44, 52))

def wall_plain(img):
    walls(img, ((88, 140, 136), (70, 118, 116)), ((120, 86, 56), (100, 70, 44)), (200, 160, 90))

def wall_stripes(img):
    def pat(l, d, Q, side):
        for a in range(0, 30, 4):
            poly(d, [Q(a, WALL), Q(a + 2, WALL), Q(a + 2, 14), Q(a, 14)], (60, 116, 132) if side == 0 else (48, 98, 114))
            d.line([Q(a + 3, WALL), Q(a + 3, 14)], fill=(236, 214, 160) if side == 0 else (200, 180, 136))
    walls(img, ((52, 104, 120), (40, 86, 104)), ((42, 84, 98), (32, 70, 86)), (200, 160, 90), pat)

def wall_scales(img):
    def pat(l, d, Q, side):
        base = (64, 130, 140) if side == 0 else (52, 110, 122)
        for zi, z in enumerate(range(WALL - 2, 14, -5)):
            for a in range(0, 33, 4):
                x, y = Q(a + (2 if zi % 2 else 0), z)
                d.ellipse([x - 4, y - 3, x + 4, y + 4], fill=base, outline=(96, 170, 170) if (a // 4 + zi) % 4 else (226, 196, 120))
                px(d, x - 2, y - 1, (130, 210, 200)); px(d, x - 1, y - 1, (130, 210, 200))
    walls(img, ((40, 96, 112), (32, 80, 96)), ((30, 60, 92), (24, 48, 78)), GOLD, pat, trim=GOLD)

RUNES = [  # 5x5 original glyphs (eye, spiral, wave-trident, little star-sigil, hook)
    ["..x..", ".x.x.", "x.x.x", ".x.x.", "..x.."],
    ["xxxx.", "...x.", ".x.x.", ".xxx.", "....."],
    ["x.x.x", "x.x.x", "xxxxx", "..x..", "..x.."],
    [".x.x.", "xxxxx", ".x.x.", "xxxxx", ".x.x."],
    [".xx..", "x..x.", "...x.", "..x..", ".xxxx"],
]

def wall_runes(img):
    def pat(l, d, Q, side):
        rnd = random.Random(3 + side)
        for a, z in ((4, 37), (11, 26), (19, 35), (26, 24), (14, 41), (6, 21), (24, 40)):
            x, y = Q(a, z); g = RUNES[rnd.randrange(len(RUNES))]
            glow(l, x + 2, y + 2, 7, 7, (90, 255, 180), 90)
            for j, row in enumerate(g):
                for i, ch in enumerate(row):
                    if ch == 'x': px(d, x + i, y + j, MINT_L if (i + j) % 3 else MINT)
        for _ in range(18):                                                  # drifting motes
            x, y = Q(rnd.uniform(1, 29), rnd.uniform(16, WALL - 2)); px(d, x, y, (150, 120, 230))
    walls(img, ((62, 50, 112), (50, 40, 94)), ((36, 30, 62), (28, 24, 50)), (120, 220, 170), pat, trim=(120, 96, 190))


# ---------------------------------------------------------------- 2 rugs (centred on the room's middle)
def oval(cu, cv, ru, rv, n=28, z=0):
    return [P(cu + ru * math.cos(t), cv + rv * math.sin(t), z) for t in [i / n * 2 * math.pi for i in range(n)]]

def rug_plain(img):
    d = ImageDraw.Draw(img)
    poly(d, oval(17, 17, 8, 7), (200, 112, 96)); poly(d, oval(17, 17, 6.6, 5.6), (236, 214, 172))
    poly(d, oval(17, 17, 4, 3.2), None, (214, 186, 140))

def rug_woven(img):
    d = ImageDraw.Draw(img)
    cols = [(196, 78, 70), (236, 190, 70), (62, 138, 140), (236, 220, 190)]
    for k, u in enumerate(range(10, 24)):
        poly(d, [P(u, 12), P(u + 1, 12), P(u + 1, 22), P(u, 22)], cols[(k // 2) % 4])
    for u in range(10, 24, 2):                                               # weave dots
        for v in range(13, 22, 2):
            x, y = P(u + 0.5, v + (1 if (u // 2) % 2 else 0)); px(d, x, y, (120, 60, 50))
    poly(d, [P(10, 12), P(24, 12), P(24, 22), P(10, 22)], None, (110, 56, 46))
    for v in range(12, 23, 2):                                               # fringe at both ends
        a = P(10, v); d.line([a, (a[0] - 2, a[1] - 1)], fill=(236, 220, 190))
        b = P(24, v); d.line([b, (b[0] + 2, b[1] + 1)], fill=(236, 220, 190))

def rug_spiral(img):
    d = ImageDraw.Draw(img)
    poly(d, oval(17, 17, 8, 7), (70, 52, 120)); poly(d, oval(17, 17, 7, 6), (100, 78, 160))
    t = 0.0
    while t < 5.6 * math.pi:
        r = 0.4 + t * 0.36
        x, y = P(17 + r * math.cos(t), 17 + r * 0.86 * math.sin(t)); px(d, x, y, GOLD); t += 0.06
    for k in range(10):
        a = k / 10 * 2 * math.pi; x, y = P(17 + 7.5 * math.cos(a), 17 + 6.5 * math.sin(a)); px(d, x, y, (170, 226, 190))

def rug_tentacle(img):
    gx, gy = P(17, 17)
    glow(img, gx, gy, 34, 17, (90, 255, 190), 120)
    d = ImageDraw.Draw(img)
    for k in range(6):                                                       # six wavy tentacles, curled tips
        a0 = k / 6 * 2 * math.pi + 0.3
        pts = []
        for i in range(12):
            r = 3.5 + i * 0.6; a = a0 + 0.22 * math.sin(i / 2.2) + (0.12 * (i - 8) ** 2 if i > 8 else 0)
            pts.append(P(17 + r * math.cos(a), 17 + r * math.sin(a)))
        d.line(pts, fill=(56, 34, 100), width=5)
        d.line(pts, fill=(150, 100, 214), width=3)
        d.line(pts[:-2], fill=(186, 150, 236), width=1)
        for i in (3, 6, 9):
            px(d, pts[i][0], pts[i][1] + 1, PINK)                             # suckers
        px(d, pts[-1][0], pts[-1][1], MINT_L)
    poly(d, oval(17, 17, 4.6, 4.6), (64, 40, 110)); poly(d, oval(17, 17, 3.8, 3.8), (150, 100, 210))
    poly(d, oval(16.4, 16.4, 1.6, 1.6), (186, 150, 236))
    x, y = P(17, 17)                                                          # a sleepy little face
    for ex in (x - 4, x + 2):
        d.rectangle([ex, y - 1, ex + 2, y], fill=(255, 255, 255)); px(d, ex + 1, y, (27, 27, 47))
    px(d, x - 6, y + 1, PINK); px(d, x + 5, y + 1, PINK)
    d.line([(x - 1, y + 2), (x, y + 3), (x + 1, y + 2)], fill=(64, 40, 110))


# ---------------------------------------------------------------- aquarium line (right wall big slot)
WOOD = ((150, 104, 60), (120, 82, 46), (134, 92, 52))

def aqua_jar(img):
    d = ImageDraw.Draw(img)
    box(d, 17, 1, 22, 5, 0, 4, *WOOD)
    x, y = P(19.5, 3, 4); x -= 0; y += 1
    d.rectangle([x - 4, y - 11, x + 3, y - 1], fill=(200, 232, 240), outline=(60, 90, 110))     # glass
    d.rectangle([x - 3, y - 7, x + 2, y - 2], fill=(110, 186, 216))                              # water
    d.line([(x - 3, y - 7), (x + 2, y - 7)], fill=(170, 222, 240))
    d.rectangle([x - 4, y - 13, x + 3, y - 12], fill=GOLD, outline=GOLD_D)                       # lid
    d.line([(x - 4, y - 13), (x + 3, y - 13)], fill=(255, 226, 138))
    d.point([(x - 1, y - 4), (x, y - 4)], fill=(255, 140, 60)); px(d, x + 1, y - 5, (255, 180, 90)); px(d, x + 1, y - 3, (255, 180, 90))
    px(d, x - 3, y - 10, (255, 255, 255)); px(d, x - 3, y - 9, (255, 255, 255))
    d.line([(x - 2, y - 2), (x - 2, y - 5)], fill=(60, 150, 90))

def aqua_bowl(img):
    d = ImageDraw.Draw(img)
    box(d, 16, 1, 23, 6, 0, 7, *WOOD)
    x, y = P(19.5, 3.5, 7)
    cx, cy, r = x, y - 7, 7
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(200, 232, 240), outline=(60, 90, 110))
    d.chord([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 20, 160, fill=(100, 180, 216))
    d.chord([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], 340, 200, fill=(100, 180, 216))
    d.rectangle([cx - r + 2, cy - 1, cx + r - 2, cy + 3], fill=(100, 180, 216))
    d.ellipse([cx - 4, cy - r - 1, cx + 4, cy - r + 2], fill=(220, 244, 250), outline=(60, 90, 110))   # rim
    d.line([(cx - 5, cy + 5), (cx + 5, cy + 5)], fill=(232, 201, 135))                                  # pebbles
    for dx, c in ((-3, (240, 120, 160)), (0, (255, 214, 10)), (3, (232, 201, 135))): px(d, cx + dx, cy + 5, c)
    d.line([(cx + 3, cy + 4), (cx + 3, cy)], fill=(60, 150, 90)); px(d, cx + 4, cy + 1, (60, 150, 90))
    d.point([(cx - 2, cy + 1), (cx - 1, cy + 1)], fill=(255, 140, 60)); d.point([(cx, cy), (cx, cy + 2)], fill=(255, 180, 90))
    px(d, cx + 1, cy - 4, (255, 255, 255)); px(d, cx - 4, cy - 3, (255, 255, 255)); px(d, cx - 5, cy - 2, (255, 255, 255))

def aqua_tank(img):
    d = ImageDraw.Draw(img)
    box(d, 13, 0, 27, 5, 0, 12, (122, 82, 46), (98, 64, 34), (110, 72, 40))
    box(d, 13, 0, 27, 5, 12, 26, (150, 210, 235), (80, 150, 200), (96, 166, 214), (40, 70, 90))
    poly(d, [P(13, 5, 12), P(27, 5, 12), P(27, 5, 14), P(13, 5, 14)], (232, 201, 135))
    for u, z, c in [(17, 18, (255, 150, 60)), (22, 21, (255, 214, 10)), (25, 16, (240, 120, 160))]:
        x, y = P(u, 5, z); d.rectangle([x, y, x + 1, y], fill=c)
    for u in (15, 19, 24):
        x, y = P(u, 5, 14); d.line([(x, y), (x, y - 4)], fill=(60, 150, 90))
    for z in (16, 19, 22): x, y = P(20, 5, z); px(d, x, y, (220, 244, 250))

def _wall_tank(img, frame, water, deep=False):
    d = ImageDraw.Draw(img)
    box(d, 11, 0, 29, 3.5, 11, 35, *frame)
    poly(d, [P(12, 3.5, 12.5), P(28, 3.5, 12.5), P(28, 3.5, 33.5), P(12, 3.5, 33.5)], water[0])
    poly(d, [P(12, 3.5, 12.5), P(28, 3.5, 12.5), P(28, 3.5, 20), P(12, 3.5, 20)], water[1])
    return d

def aqua_wall(img):
    d = _wall_tank(img, ((150, 104, 60), (112, 76, 42), (128, 88, 50)), ((110, 190, 226), (86, 166, 210)))
    poly(d, [P(12, 3.5, 12.5), P(28, 3.5, 12.5), P(28, 3.5, 15), P(12, 3.5, 15)], (232, 201, 135))   # sand
    x, y = P(24, 3.5, 15); d.rectangle([x - 2, y - 4, x + 2, y], fill=(150, 150, 170)); d.rectangle([x - 1, y - 6, x + 1, y - 4], fill=(150, 150, 170))
    px(d, x, y - 2, (40, 40, 60))                                                                          # little castle
    for u, h in ((13.5, 9), (15, 6), (20, 8), (27, 7)):                                                    # weed
        x, y = P(u, 3.5, 15)
        for k in range(h): px(d, x + (1 if (k // 2) % 2 else 0), y - k, (60, 160, 90) if k % 3 else (90, 200, 110))
    for u, z, c, f in [(16, 26, (255, 150, 60), 1), (21, 22, (255, 214, 10), -1), (25, 29, (240, 120, 160), 1), (18, 18, (120, 200, 255), -1)]:
        x, y = P(u, 3.5, z); d.point([(x, y), (x + 1, y), (x + 2, y)], fill=c)
        px(d, x - f if f > 0 else x + 3, y - 1, c); px(d, x - f if f > 0 else x + 3, y + 1, c)
    for z in (19, 23, 27, 31): x, y = P(22.5, 3.5, z); px(d, x, y, (230, 250, 255))
    d.line([P(12, 3.5, 33.5), P(28, 3.5, 33.5)], fill=(200, 236, 250))

def aqua_abyss(img):
    cx, cy = P(17, 3.5, 21)
    d = _wall_tank(img, ((70, 64, 96), (46, 40, 70), (56, 50, 82)), ((16, 22, 54), (10, 12, 32)), deep=True)
    for u in range(12, 29, 3):                                                # glowing rune studs on the frame
        x, y = P(u, 3.5, 34.3); px(d, x, y, MINT)
        x, y = P(u, 3.5, 11.7); px(d, x, y, MINT)
    rnd = random.Random(5)
    for _ in range(22):                                                       # bioluminescent specks
        x, y = P(rnd.uniform(12.5, 27.5), 3.5, rnd.uniform(13, 33)); px(d, x, y, rnd.choice([MINT, PINK, (140, 180, 255)]))
    for u, h in ((13.5, 6), (27, 8)):                                         # glowing tube coral
        x, y = P(u, 3.5, 13)
        for k in range(h): px(d, x, y - k, (240, 120, 200) if k < h - 1 else (255, 200, 240))
    ex, ey = P(25.5, 3.5, 29)                                                 # a big sleepy eye peeking in the dark
    d.ellipse([ex - 3, ey - 2, ex + 3, ey + 2], fill=(230, 210, 100), outline=(120, 90, 40)); px(d, ex, ey, (30, 20, 40)); px(d, ex, ey + 1, (30, 20, 40))
    d.line([(ex - 3, ey - 1), (ex + 3, ey - 1)], fill=(70, 56, 120)); d.line([(ex - 2, ey - 2), (ex + 2, ey - 2)], fill=(70, 56, 120))
    # the anglerfish with its lantern
    lx, ly = cx + 6, cy - 7
    glow(img, lx, ly, 9, 9, (255, 236, 120), 150)
    d = ImageDraw.Draw(img)
    d.line([(cx, cy - 3), (cx + 2, cy - 7), (cx + 4, cy - 8), (lx - 1, ly)], fill=(110, 110, 150))
    d.ellipse([lx - 1, ly - 1, lx + 1, ly + 1], fill=(255, 236, 120)); px(d, lx, ly, (255, 255, 230))
    d.ellipse([cx - 4, cy - 3, cx + 3, cy + 3], fill=(70, 84, 130), outline=(150, 170, 230))
    d.polygon([(cx - 4, cy), (cx - 7, cy - 3), (cx - 7, cy + 3)], fill=(70, 84, 130), outline=(150, 170, 230))
    d.rectangle([cx, cy - 2, cx + 1, cy - 1], fill=(255, 255, 255)); px(d, cx + 1, cy - 1, (27, 27, 47))
    d.line([(cx, cy + 1), (cx + 3, cy + 1)], fill=(27, 27, 47)); px(d, cx + 1, cy + 2, (255, 255, 255)); px(d, cx + 3, cy, (255, 255, 255))
    px(d, cx - 2, cy + 1, PINK)
    d.line([P(12, 3.5, 33.5), P(28, 3.5, 33.5)], fill=(90, 255, 190))


# ---------------------------------------------------------------- pet home line (against the left wall)
def home_box(img):
    d = ImageDraw.Draw(img)
    box(d, 0, 19, 7, 26, 0, 7, (110, 78, 46), (200, 154, 98), (180, 136, 86))
    poly(d, [P(1, 20, 7), P(7, 20, 7), P(7, 26, 7), P(1, 26, 7)], (110, 78, 46))
    poly(d, [P(1, 21, 7), P(5, 21, 7), P(5, 25, 7), P(1, 25, 7)], (196, 70, 70))         # a red blanket inside
    poly(d, [P(0, 26, 7), P(7, 26, 7), P(7, 27.5, 11), P(0, 27.5, 11)], (216, 172, 116), EDGE)    # front flap
    poly(d, [P(7, 19, 7), P(7, 26, 7), P(8.5, 26, 11), P(8.5, 19, 11)], (196, 152, 100), EDGE)    # side flap
    x, y = P(3.5, 26, 3); d.point([(x - 1, y - 1), (x + 1, y - 1), (x - 2, y), (x, y), (x + 2, y), (x - 1, y + 1), (x + 1, y + 1), (x, y + 2), (x, y + 1), (x - 1, y), (x + 1, y)], fill=(236, 110, 120))

def home_cage(img):
    d = ImageDraw.Draw(img)
    box(d, 0, 19, 6, 26, 0, 1, (90, 90, 100), (70, 70, 80), (80, 80, 90))
    poly(d, [P(0.5, 20, 1), P(5, 20, 1), P(5, 25, 1), P(0.5, 25, 1)], (232, 201, 135))     # sawdust
    x, y = P(2, 21, 1); d.rectangle([x - 2, y - 3, x + 1, y], fill=(120, 170, 220))       # little water dish
    for v in range(19, 27):
        d.line([P(6, v, 1), P(6, v, 11)], fill=(170, 175, 185))
    for u in range(0, 7):
        d.line([P(u, 26, 1), P(u, 26, 11)], fill=(170, 175, 185))
    poly(d, [P(0, 19, 11), P(6, 19, 11), P(6, 26, 11), P(0, 26, 11)], (150, 155, 165))
    x, y = P(3, 22.5, 13); d.arc([x - 3, y - 4, x + 3, y + 2], 180, 360, fill=(190, 195, 205))   # handle

def home_terrarium(img):
    d = ImageDraw.Draw(img)
    box(d, 0, 18, 8, 27, 0, 2, *WOOD)
    box(d, 0, 18, 8, 27, 2, 13, (200, 236, 228), (150, 210, 200), (170, 220, 210), (60, 100, 100))
    poly(d, [P(0, 27, 2), P(8, 27, 2), P(8, 27, 5), P(0, 27, 5)], (110, 76, 46))
    poly(d, [P(8, 18, 2), P(8, 27, 2), P(8, 27, 5), P(8, 18, 5)], (96, 66, 40))
    for u, h in ((1.5, 5), (3, 7), (6.5, 4)):
        x, y = P(u, 27, 5)
        for k in range(h): px(d, x + (1 if k % 4 == 2 else 0), y - k, (60, 160, 90) if k % 2 else (90, 200, 110))
        px(d, x - 1, y - h + 2, (90, 200, 110)); px(d, x + 1, y - h + 1, (90, 200, 110))
    x, y = P(5, 27, 5); d.ellipse([x - 2, y - 3, x + 2, y], fill=(150, 150, 160)); px(d, x - 1, y - 2, (190, 190, 200))
    x, y = P(8, 22, 5)                                                                       # a toadstool on the side
    d.rectangle([x, y - 3, x, y - 1], fill=(240, 230, 210)); d.line([(x - 1, y - 4), (x + 1, y - 4)], fill=(220, 70, 70))
    for a, b in ((P(0, 27, 13), P(8, 27, 13)), (P(8, 27, 13), P(8, 18, 13)), (P(8, 27, 2), P(8, 27, 13))):
        d.line([a, b], fill=(200, 160, 90))
    x, y = P(1, 26, 11); px(d, x, y, (255, 255, 255)); px(d, x, y + 1, (255, 255, 255))

def home_tidepool(img):
    d = ImageDraw.Draw(img)
    box(d, 0, 17, 9, 28, 0, 3, (150, 150, 160), (110, 110, 124), (126, 126, 140))
    poly(d, [P(1, 18, 3), P(8, 18, 3), P(8, 27, 3), P(1, 27, 3)], (232, 201, 135))
    poly(d, [P(2, 19, 3), P(7.5, 19, 3), P(7.5, 25, 3), P(2, 25, 3)], (80, 170, 210))
    for u, v in ((3, 21), (5.5, 23)):
        a, b = P(u, v, 3); d.line([(a - 1, b), (a + 2, b)], fill=(190, 230, 250))
    for (u, v) in ((0.5, 18), (8.5, 27.5), (1, 27)):                                        # rocks
        x, y = P(u, v, 3); d.ellipse([x - 3, y - 3, x + 3, y + 1], fill=(130, 130, 145), outline=EDGE); px(d, x - 1, y - 2, (180, 180, 195))
    x, y = P(7, 26.5, 3)                                                                     # starfish
    d.point([(x, y - 2), (x - 2, y), (x - 1, y), (x, y), (x + 1, y), (x + 2, y), (x - 1, y + 1), (x + 1, y + 1), (x, y - 1)], fill=(244, 120, 110))
    x, y = P(4, 18.5, 3); px(d, x, y, (240, 230, 250)); px(d, x + 1, y, (220, 200, 230))          # shell
    for (u, v) in ((3, 25.5), (6, 19)):                                                        # sea grass
        x, y = P(u, v, 3); d.line([(x, y), (x, y - 4)], fill=(60, 160, 90)); px(d, x + 1, y - 3, (90, 200, 110))

def home_portal(img):
    x, y = P(3.5, 22.5, 0)
    box(ImageDraw.Draw(img), 0, 19, 7, 26, 0, 2, (90, 84, 110), (62, 56, 84), (74, 68, 96))
    cx, cy = x, y - 13
    glow(img, cx, cy, 16, 16, (150, 110, 255), 150)
    d = ImageDraw.Draw(img)
    d.ellipse([cx - 8, cy - 10, cx + 8, cy + 10], fill=(60, 40, 110), outline=(40, 26, 70))
    d.ellipse([cx - 7, cy - 9, cx + 7, cy + 9], fill=(40, 24, 80))
    for arm, col in ((0, MINT), (math.pi, (200, 140, 255))):
        t = 0.0
        while t < 3.2 * math.pi:
            r = 0.6 + t * 0.62
            if r < 7.2: px(d, cx + r * math.cos(t + arm), cy + r * 1.25 * math.sin(t + arm), col)
            t += 0.05
    d.rectangle([cx - 1, cy - 1, cx, cy], fill=(255, 255, 255))
    for sx, sy in ((cx - 10, cy - 8), (cx + 9, cy - 3), (cx - 9, cy + 6), (cx + 7, cy + 9)):
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)): px(d, sx + dx, sy + dy, MINT_L if dx or dy else (255, 255, 255))
    for k in range(5):                                                                        # stone ring studs
        a = k / 5 * 2 * math.pi - math.pi / 2; px(d, cx + 8 * math.cos(a), cy + 10 * math.sin(a), GOLD)


# ---------------------------------------------------------------- 8 lights (front-left floor spot)
LX, LY = P(12, 27)

def light_candle(img):
    d = ImageDraw.Draw(img)
    box(d, 10, 25, 14, 29, 0, 7, *WOOD)
    x, y = P(12, 27, 7)
    glow(img, x, y - 8, 9, 9, (255, 214, 120), 110); d = ImageDraw.Draw(img)
    d.ellipse([x - 3, y - 1, x + 3, y + 1], fill=GOLD, outline=GOLD_D)
    d.rectangle([x - 1, y - 6, x + 1, y - 1], fill=(250, 245, 225)); px(d, x + 1, y - 4, (220, 210, 190))
    px(d, x - 1, y - 5, (255, 255, 255)); px(d, x, y - 7, (60, 40, 30))
    d.point([(x, y - 9), (x, y - 8)], fill=(255, 200, 60)); px(d, x, y - 10, (255, 240, 170))

def light_lamp(img):
    x, y = LX, LY
    glow(img, x, y - 21, 12, 10, (255, 220, 140), 110); d = ImageDraw.Draw(img)
    d.ellipse([x - 3, y - 1, x + 3, y + 1], fill=(80, 70, 70))
    d.line([(x, y), (x, y - 18)], fill=(90, 80, 80))
    d.polygon([(x - 3, y - 26), (x + 3, y - 26), (x + 6, y - 18), (x - 6, y - 18)], fill=(244, 226, 180), outline=(160, 120, 80))
    d.line([(x - 5, y - 19), (x + 5, y - 19)], fill=(220, 150, 90))
    d.line([(x - 2, y - 25), (x - 4, y - 19)], fill=(255, 248, 225))

def light_jelly(img):
    x, y = LX, LY
    glow(img, x, y - 20, 10, 9, PINK, 100); d = ImageDraw.Draw(img)
    d.ellipse([x - 3, y - 1, x + 3, y + 1], fill=(200, 160, 90))
    d.line([(x, y), (x, y - 20)], fill=(200, 160, 90))
    d.pieslice([x - 5, y - 26, x + 5, y - 16], 180, 360, fill=PINK, outline=(196, 127, 176))
    for i in (-3, -1, 1, 3): d.line([(x + i, y - 21), (x + i, y - 17 + abs(i) % 2)], fill=PINK)
    px(d, x - 2, y - 24, (255, 230, 245)); px(d, x - 3, y - 23, (255, 230, 245))

def light_chandelier(img, at=None):
    x, y = at or P(14, 14, 44)
    cy = y + 10
    glow(img, x, cy, 22, 16, (150, 120, 255), 110)
    glow(img, x, cy + 4, 12, 9, (120, 255, 200), 110)
    d = ImageDraw.Draw(img)
    for k in range(-12, 4, 2): px(d, x, y + k, GOLD_D); px(d, x, y + k + 1, GOLD)     # chain from the ceiling
    d.pieslice([x - 9, cy - 7, x + 9, cy + 7], 180, 360, fill=(170, 130, 240), outline=(96, 64, 160))
    d.line([(x - 9, cy), (x + 9, cy)], fill=(96, 64, 160))
    d.arc([x - 6, cy - 5, x + 2, cy + 1], 200, 290, fill=(230, 210, 255))
    for i, h in zip(range(-8, 9, 2), (6, 9, 7, 11, 8, 11, 7, 9, 6)):                   # glowing tentacles with lights
        for k in range(1, h):
            px(d, x + i + (1 if (k // 2) % 2 and i % 4 == 0 else 0), cy + k, (150, 110, 230) if k < h - 1 else MINT_L)
    for i in (-6, 0, 6):
        d.rectangle([x + i - 1, cy + 11, x + i, cy + 12], fill=(255, 250, 210))
    for ex in (x - 4, x + 2):                                                           # it is smiling up there
        d.rectangle([ex, cy - 4, ex + 1, cy - 3], fill=(27, 27, 47))
    d.line([(x - 1, cy - 2), (x, cy - 1), (x + 1, cy - 2)], fill=(27, 27, 47))
    px(d, x - 6, cy - 2, PINK); px(d, x + 5, cy - 2, PINK)


# ---------------------------------------------------------------- pets (16x16, side view, auto outline)
PET_PAL = {
    's': (226, 150, 90), 'S': (166, 92, 58), 'b': (214, 226, 160), 'B': (168, 182, 118), 'p': (27, 27, 47),
    'k': (242, 140, 160), 'w': (255, 255, 255), 'r': (230, 92, 72), 'R': (180, 60, 50), 'c': (240, 206, 170),
    'C': (204, 150, 120), 'a': (66, 82, 128), 'A': (110, 128, 180), 'l': (120, 120, 160), 'y': (255, 236, 120),
    'Y': (255, 255, 230), 'T': (240, 240, 250), 'g': (64, 128, 116), 'G': (150, 226, 196), 'v': (130, 92, 184),
    'm': (40, 60, 56), 't': (96, 112, 170),
}
PETS = {
    'snail': [
        "................",
        "................",
        "...........p..p.",
        "...........b..b.",
        "....ssss..bbbbb.",
        "...sSSSSs.bbbbbb",
        "..sSsssSSsbpbbpb",
        "..sSsSSsSsbbbbbb",
        "..sSsSssSsbkbbkb",
        "..sSssSSsSbbbbb.",
        "...sSSSSsbbbbb..",
        ".BbbbbbbbbbbbB..",
        "..BBBBBBBBBBB...",
    ],
    'hermit_crab': [
        "................",
        "................",
        "....ccc.........",
        "...cCCCc....pp.pp",
        "..cCcccCc....r..r",
        "..cCcCCcCc...r..r",
        "..cCcCccCcrrrrrr.",
        "..ccCcCCcrrrrrrrRR",
        "...ccCCccrkrrrkrRr",
        "....cccrrrrrrrrrRR",
        ".....RrrrrrrrrR...",
        ".....R.R.R.R.R....",
    ],
    'baby_anglerfish': [
        "..........yy....",
        ".........yYYy...",
        ".......ll.yy....",
        "......l.........",
        "....aaal........",
        "..aaaaaaaa......",
        ".aaAaaaaaaa.....",
        "taaaaaawwaaa....",
        "ttaaaaawpwaaa...",
        "taaaaaawwaapp...",
        ".aaAaaaaaaTpT...",
        "..aaaaaaaapppp..",
        "...aaAaaaaaa....",
        "....aaaaaa......",
    ],
    'tiny_shoggoth': [
        "..........g.....",
        ".........gG.....",
        "....ggggggg.....",
        "...gGGggggggg...",
        "..gGwwgggwwwgg..",
        "..gGwpggvwppwg..",
        ".ggggggvgwwwggg.",
        ".gwwgvggggggwgg.",
        ".gwpggkgmmgkgggg",
        "ggggggggggggvggg",
        "gvgggggggggggggg",
        ".ggg.gggg.gggg..",
    ],
}

def pet(name):
    rows = [r[:16].ljust(16, '.') for r in PETS[name]]
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    stamp(im, rows, 0, 16 - len(rows) - 1, PET_PAL)
    outline_all(im)
    if name == 'baby_anglerfish':
        g = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); glow(g, 11, 1, 3, 3, (255, 236, 120), 150)
        g.alpha_composite(im); im = g
    if name == 'tiny_shoggoth':
        g = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); glow(g, 8, 10, 9, 6, (90, 255, 190), 90)
        g.alpha_composite(im); im = g
    return im


# ---------------------------------------------------------------- outfits on Ulhu (idle, 32x32)
def ulhu(sprout=True):
    old = C.SHAPE.get('sprout'); C.SHAPE['sprout'] = sprout
    try:
        return C.render('idle', 1)
    finally:
        C.SHAPE['sprout'] = old

def ulhu_grid():
    return C.face(C.outline(C.base()), 'idle')

def tentacle_pts():
    pts = set()
    for i, tx in enumerate((10, 13, 17, 20)):
        for y in range(15, 24):
            off = round(math.sin((y - 15) / 2.2 + i) * 0.8)
            pts |= {(tx + off, y), (tx + off + 1, y), (tx + off + 2, y)}
        pts.add((tx + (2 if i % 2 else -1), 24))
    return pts

OUT_PAL = {
    'r': (184, 58, 72), 'R': (226, 104, 110), 'D': (120, 34, 50), 'd': (90, 30, 40),
    'w': (250, 245, 230), 'W': (210, 200, 190), 'h': (210, 80, 80), 'H': (160, 52, 58), 'm': GOLD, 'b': GOLD, 'B': GOLD_D,
    'n': (52, 62, 150), 'N': (34, 40, 104), 'y': (255, 226, 90), 'g': GOLD, 'G': GOLD_D,
}

def hat_beret(im):
    im = im.copy()
    pts = stamp(im, ["...........dd...",
                     "...rrRRrrrrr....",
                     ".rrRRrrrrrrrrr..",
                     "rrrrrrrrrrrrrrrr",
                     ".DDDDDDDDDDDDDD."], 7, 0, OUT_PAL)
    outline_pts(im, pts); return im

def hat_bobble(im):
    im = im.copy()
    pts = stamp(im, ["........wwww........",
                     "........wWWw........",
                     "......hhhhhhhh......",
                     "....hhmmmmmmmmhh....",
                     "...hhhhhhhhhhhhhH...",
                     "..bBbBbBbBbBbBbBbB..",
                     "..BbBbBbBbBbBbBbBb.."], 6, 0, OUT_PAL)
    outline_pts(im, pts); return im

def hat_wizard(im):
    im = im.copy()
    pts = stamp(im, ["............nnnnnny......",
                     "...........nnnn..........",
                     "..........nnnnn..........",
                     ".........nnynnnn.........",
                     "........nnnnnnnyn........",
                     ".......ggggggggggg.......",
                     "..NNNNNNNNNNNNNNNNNNNNN.."], 4, 0, OUT_PAL)
    outline_pts(im, pts); return im

def hat_tentacle_crown(im):
    base = im.copy()
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); glow(lay, 16, 2, 10, 5, (90, 255, 190), 120)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.alpha_composite(lay); out.alpha_composite(base)
    pts = set()
    for x in range(10, 22):
        out.putpixel((x, 3), GOLD + (255,)); out.putpixel((x, 4), GOLD_D + (255,)); pts |= {(x, 3), (x, 4)}
    for x in (12, 16, 19): out.putpixel((x, 4), MINT + (255,))
    for x, dr in ((10, -1), (13, 1), (18, -1), (21, 1)):
        for (px_, py_), c in (((x, 2), VIOLET), ((x, 1), (170, 120, 230)), ((x + dr, 0), PINK)):
            out.putpixel((px_, py_), c + (255,)); pts.add((px_, py_))
    outline_pts(out, pts)
    return out

def top_cardigan(im):
    im = im.copy(); g = ulhu_grid(); tent = tentacle_pts()
    main, shade = (196, 112, 76), (150, 80, 56)
    for y in range(32):
        for x in range(32):
            if C.inell(x, y, 16, 24, C.SHAPE['body_rx'], C.SHAPE['body_ry']) and (x, y) not in tent and (g[y][x] in ('b', 's') or (g[y][x] == 'l' and abs(x + .5 - 16) > 1.5)):
                im.putpixel((x, y), (shade if (x > 18 or y > 27) else main) + (255,))
    for x, y in ((8, 23), (8, 24), (24, 23), (24, 24)): im.putpixel((x, y), (112, 76, 52, 255))      # elbow patches
    for x, y in ((9, 23), (9, 24), (23, 23), (23, 24)):
        if im.getpixel((x, y))[3] and g[y][x] in ('b', 's') and (x, y) not in tent: im.putpixel((x, y), main + (255,))
    for y in (25, 27): im.putpixel((14, y), GOLD + (255,))                                            # buttons
    for x in (11, 12, 13, 19, 20, 21):                                                                 # ribbed hem
        if g[28][x] in ('b', 's', 'l'): im.putpixel((x, 28), shade + (255,))
    return im

def top_star_cloak(im):
    g = ulhu_grid(); base = im.copy()
    cloak = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    pts = set()
    for y in range(14, 31):                                     # the cloak hangs behind, from the wings to the floor
        for x in range(5, 27):
            wing = g[y][x] in ('w', 'W')
            drape = y >= 22 and abs(x + .5 - 16) < 6 + (y - 22) * 0.9 and y <= 30
            if wing or drape:
                cloak.putpixel((x, y), ((40, 42, 104) if (x + y) % 7 else (54, 56, 130)) + (255,)); pts.add((x, y))
    for x, y in ((6, 20), (9, 17), (24, 18), (22, 21), (7, 26), (25, 26), (11, 29), (21, 29), (26, 22)):
        if (x, y) in pts: cloak.putpixel((x, y), (255, 236, 140, 255))
    for x, y in ((8, 23), (24, 24)):
        if (x, y) in pts: cloak.putpixel((x, y), (255, 255, 255, 255))
    outline_pts(cloak, pts, (24, 20, 60))
    out = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    lay = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    for sx, sy in ((6, 20), (24, 18), (11, 29), (21, 29)): glow(lay, sx, sy, 3, 3, (200, 220, 255), 120)
    out.alpha_composite(cloak); out.alpha_composite(lay)
    keep = Image.new('RGBA', (32, 32), (0, 0, 0, 0))            # creature on top, except its wings
    for y in range(32):
        for x in range(32):
            p = base.getpixel((x, y))
            if p[3] and not (g[y][x] in ('w', 'W') and y >= 14) and not ((x, y) in pts and g[y][x] == 'o' and y >= 14 and not C.inell(x, y, 16, 24, 7.5, 6) and not C.inell(x, y, 16, 11, 10.5, 9.5)):
                keep.putpixel((x, y), p)
    out.alpha_composite(keep)
    for x, y in ((9, 19), (22, 19)): out.putpixel((x, y), GOLD + (255,))                                 # clasps
    return out

OUTFITS = [
    ('beret', 'Beret', 'Nice', lambda: hat_beret(ulhu(False))),
    ('bobble_hat', 'Bobble hat', 'Nice', lambda: hat_bobble(ulhu(False))),
    ('wizard_hat', 'Wizard hat', 'Fancy', lambda: hat_wizard(ulhu(False))),
    ('crown_of_tentacles', 'Crown of tiny tentacles', 'Eldritch', lambda: hat_tentacle_crown(ulhu(False))),
    ('teachers_cardigan', "Teacher's cardigan", 'Fancy', lambda: top_cardigan(ulhu(True))),
    ('starry_cloak', 'Starry cloak', 'Eldritch', lambda: top_star_cloak(ulhu(True))),
]


# ---------------------------------------------------------------- catalogue
CATS = {
    'floors': ('Floors', [('floor_pine_planks', 'Pine planks', 'Basic', floor_pine),
                          ('floor_checker_tiles', 'Checker tiles', 'Nice', floor_checker),
                          ('floor_royal_carpet', 'Deep-blue carpet', 'Fancy', floor_royal),
                          ('floor_starfield', 'Starfield floor', 'Eldritch', floor_starfield)]),
    'rugs': ('Rugs', [('rug_plain', 'Plain rug', 'Basic', rug_plain),
                      ('rug_woven', 'Woven rug', 'Nice', rug_woven),
                      ('rug_spiral', 'Spiral rug', 'Fancy', rug_spiral),
                      ('rug_tentacle', 'Tentacle rug', 'Eldritch', rug_tentacle)]),
    'wallpapers': ('Wallpapers', [('wall_plain', 'Plain', 'Basic', wall_plain),
                                  ('wall_stripes', 'Stripes', 'Nice', wall_stripes),
                                  ('wall_scales', 'Scales', 'Fancy', wall_scales),
                                  ('wall_runes', 'Glowing runes', 'Eldritch', wall_runes)]),
    'aquarium': ('Aquarium upgrade line', [('aqua_1_jam_jar', 'Jam jar + guppy', 'Basic', aqua_jar),
                                           ('aqua_2_bowl', 'Fish bowl', 'Nice', aqua_bowl),
                                           ('aqua_3_tank', 'Tank on a stand', 'Nice', aqua_tank),
                                           ('aqua_4_wall', 'Wall aquarium', 'Fancy', aqua_wall),
                                           ('aqua_5_abyssal', 'Abyssal aquarium', 'Eldritch', aqua_abyss)]),
    'pet_homes': ('Pet home upgrade line', [('home_1_box', 'Cardboard box', 'Basic', home_box),
                                            ('home_2_cage', 'Wire cage', 'Nice', home_cage),
                                            ('home_3_terrarium', 'Terrarium', 'Nice', home_terrarium),
                                            ('home_4_tide_pool', 'Tide pool', 'Fancy', home_tidepool),
                                            ('home_5_portal', 'Swirling portal', 'Eldritch', home_portal)]),
    'lights': ('Lights', [('light_candle', 'Candle', 'Basic', light_candle),
                          ('light_lamp', 'Lamp', 'Nice', light_lamp),
                          ('light_jellyfish_lamp', 'Jellyfish lamp', 'Fancy', light_jelly),
                          ('light_chandelier', 'Jellyfish chandelier', 'Eldritch', light_chandelier)]),
}
PET_LIST = [('pet_snail', 'Snail', 'Basic', 'snail'), ('pet_hermit_crab', 'Hermit crab', 'Nice', 'hermit_crab'),
            ('pet_baby_anglerfish', 'Baby anglerfish', 'Fancy', 'baby_anglerfish'),
            ('pet_tiny_shoggoth', 'Tiny shoggoth', 'Eldritch', 'tiny_shoggoth')]

BG, CARD, CARD_E = (17, 24, 39), (32, 40, 62), (40, 26, 66)
TIER_COL = {'Basic': (190, 196, 210), 'Nice': (130, 210, 170), 'Fancy': GOLD, 'Eldritch': MINT}

def font(n):
    try:
        return ImageFont.truetype('arial.ttf', n)
    except OSError:
        return ImageFont.load_default(n)

def item_png(fn):
    im = canvas(); fn(im); bb = im.getbbox(); return im.crop(bb)

def catalogue(key, title, entries):
    """entries: (file name, label, tier, 1x image). x4 cards, names + tier under each."""
    big = [(n, l, t, im.resize((im.width * S, im.height * S), Image.NEAREST)) for n, l, t, im in entries]
    iw = max(b.width for *_, b in big); ih = max(b.height for *_, b in big)
    pad, txt = 20, 58
    cw, ch = max(iw + 2 * pad, 220), ih + 2 * pad + txt
    cols = 2 if cw > 420 else min(len(big), 5 if cw < 300 else 3)
    rows = math.ceil(len(big) / cols); gap, top = 18, 70
    sheet = Image.new('RGBA', (cols * cw + (cols + 1) * gap, top + rows * (ch + gap)), BG + (255,))
    d = ImageDraw.Draw(sheet)
    d.text((gap, 20), title, fill=(240, 236, 226), font=font(30))
    d.text((sheet.width - gap, 30), 'x4  |  Eldritch items glow', fill=(130, 140, 170), font=font(16), anchor='ra')
    for i, (n, l, t, b) in enumerate(big):
        cx0 = gap + (i % cols) * (cw + gap); cy0 = top + (i // cols) * (ch + gap)
        eld = t == 'Eldritch'
        d.rounded_rectangle([cx0, cy0, cx0 + cw, cy0 + ch], 10, fill=CARD_E if eld else CARD,
                            outline=MINT if eld else (52, 62, 90), width=3 if eld else 1)
        sheet.alpha_composite(b, (cx0 + (cw - b.width) // 2, cy0 + pad + ih - b.height))
        d.text((cx0 + cw // 2, cy0 + ch - txt + 6), l, fill=(240, 236, 226), font=font(19), anchor='ma')
        d.text((cx0 + cw // 2, cy0 + ch - txt + 32), ('* ELDRITCH *' if eld else t), fill=TIER_COL[t], font=font(15), anchor='ma')
    sheet.save(os.path.join(OUT_DESIGN, f'catalogue_{key}.png'))


# ---------------------------------------------------------------- the Fancy/Eldritch Study
def fancy_room():
    img = canvas(); d = ImageDraw.Draw(img)
    wall_runes(img)
    floor_royal(img)
    d = ImageDraw.Draw(img)
    # porthole (left wall) with the deep outside and a passing eye
    cx, cz, r = 10, 30, 6
    ring = [P(0, cx + r * 0.45 * math.cos(t), cz + r * math.sin(t)) for t in [i / 20 * 2 * math.pi for i in range(20)]]
    glass = [P(0, cx + (r - 1.5) * 0.45 * math.cos(t), cz + (r - 1.5) * math.sin(t)) for t in [i / 20 * 2 * math.pi for i in range(20)]]
    poly(d, ring, (214, 168, 70), (120, 84, 30)); poly(d, glass, (20, 40, 80))
    x, y = P(0, 10, 30); d.point([(x - 1, y), (x, y), (x + 1, y)], fill=(255, 220, 90)); px(d, x, y, (30, 20, 40))
    # framed star chart on the right wall
    poly(d, [P(21, 0, 45), P(28, 0, 45), P(28, 0, 37), P(21, 0, 37)], (120, 84, 40))
    poly(d, [P(22, 0, 44), P(27, 0, 44), P(27, 0, 38), P(22, 0, 38)], (30, 30, 70))
    for u, z in ((23, 42), (25, 40), (26, 43), (24, 39)): x, y = P(u, 0, z); px(d, x, y, (255, 236, 140))
    rug_tentacle(img)
    aqua_abyss(img)
    d = ImageDraw.Draw(img)
    # back corner bookshelf (as in the basic Study)
    box(d, 2, 0, 9, 4, 0, 34, (130, 88, 50), (104, 70, 38), (116, 78, 44))
    for z0 in (4, 13, 22):
        for i, col in enumerate([(200, 70, 70), (70, 120, 200), (236, 190, 70), (90, 160, 100), (170, 110, 200), (220, 140, 80)]):
            u = 2.5 + i
            poly(d, [P(u, 4, z0), P(u + 0.9, 4, z0), P(u + 0.9, 4, z0 + 7), P(u, 4, z0 + 7)], col)
    home_tidepool(img)
    crab = pet('hermit_crab'); x, y = P(4.5, 22, 3); img.alpha_composite(crab, (round(x) - 8, round(y) - 13))
    d = ImageDraw.Draw(img)
    box(d, 1, 8, 7, 14, 0, 5, (120, 160, 110), (90, 130, 84), (100, 142, 92))
    box(d, 1, 8, 3, 14, 5, 12, (120, 160, 110), (90, 130, 84), (100, 142, 92))
    box(d, 24, 14, 29, 22, 0, 9, (150, 104, 60), (120, 82, 46), (134, 92, 52))
    x, y = P(26, 16, 9); d.rectangle([x - 1, y - 3, x + 1, y], fill=(240, 240, 240)); px(d, x + 2, y - 2, (240, 240, 240))
    x, y = P(27, 20, 9); d.rectangle([x - 3, y - 2, x + 2, y], fill=(200, 70, 70)); d.rectangle([x - 2, y - 4, x + 2, y - 2], fill=(70, 120, 200))
    # Ulhu in the cardigan + crown of tentacles, with the tiny shoggoth beside him
    spr = hat_tentacle_crown(top_cardigan(ulhu(False)))
    fx, fy = P(17, 17); img.alpha_composite(spr, (round(fx) - 16, round(fy) - 31))
    sh = pet('tiny_shoggoth'); x, y = P(21, 23); img.alpha_composite(sh, (round(x) - 8, round(y) - 14))
    light_chandelier(img, P(16, 16, 54))
    return img


def main():
    os.makedirs(OUT_ITEMS, exist_ok=True)
    for key, (title, items) in CATS.items():
        ents = []
        for name, label, tier, fn in items:
            im = item_png(fn); im.save(os.path.join(OUT_ITEMS, name + '.png')); ents.append((name, label, tier, im))
        catalogue(key, title, ents)
    ents = []
    for name, label, tier, k in PET_LIST:
        im = pet(k); im.save(os.path.join(OUT_ITEMS, name + '.png')); ents.append((name, label, tier, im))
    catalogue('pets', 'Pets', ents)
    ents = []
    for name, label, tier, fn in OUTFITS:
        im = fn(); im.save(os.path.join(OUT_ITEMS, 'outfit_' + name + '.png')); ents.append((name, label, tier, im))
    catalogue('outfits', 'Outfits on Ulhu', ents)
    room = fancy_room()
    bg = Image.new('RGBA', (W + 8, H + 8), BG + (255,)); bg.alpha_composite(room, (4, 4))
    bg.resize(((W + 8) * S, (H + 8) * S), Image.NEAREST).save(os.path.join(OUT_DESIGN, 'room_iso_fancy.png'))
    print('saved items to', OUT_ITEMS, 'and catalogues + room_iso_fancy.png to design/')

if __name__ == '__main__':
    main()
