"""Shop furniture and props for Ulhu's Study (corner room): 5 categories x 4 tiers x 3 options = 60 items.
Categories: corner pieces (zone 5), seats and tables (zone 6), wall hangings (zones 3/4), small props (zone 9).
Original art, drawn from shapes with Pillow (nothing copied).

python iso_shop_furniture.py ->
  items/shop/<category>_<tier>_<n>_<name>.png   every item at 1x (cropped)
  ../design/shop_<category>.png                 one labelled catalogue per category (x4, rows = tiers)
  ../design/shop_furniture.json                 every item: id, name, category, zone, tier, price, lock
  ../design/room_iso_teacher.png                the Study furnished in a science-teacher mix (x4)

Reads (never edits) iso_room.py, iso_items.py and cthulhu_pixel.py.
Furniture draws itself at its zone position in room coordinates, so one function makes the shop picture
and places the item in the room. Wall hangings and props are flat sprites: hangings are sheared onto a wall.
"""
import json, math, os, random, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cthulhu_pixel as C                                               # read only
from iso_room import P, poly, box, W, H, WALL                           # read only
import iso_items as I                                                   # read only
from iso_items import glow, px, outline_all, INK, EDGE, GOLD, GOLD_D, MINT, MINT_L, VIOLET, VIOLET_D, PINK

OUT_ITEMS = os.path.join(HERE, 'items', 'shop')
OUT_DESIGN = os.path.join(HERE, '..', 'design')
S = 4

WHITE = (250, 248, 240)
CREAM = (250, 240, 215)
BONE, BONE_D = (244, 238, 220), (196, 188, 166)
GLASS, GLASS_E = (206, 236, 244), (90, 130, 150)
STONE = (100, 116, 108)
PURPLE_WOOD = (78, 54, 112)
TENT = ((56, 34, 100), (150, 100, 214), (190, 156, 238))
BOOKS = [(200, 70, 70), (70, 120, 200), (236, 190, 70), (90, 160, 100), (170, 110, 200), (220, 140, 80), (60, 150, 160)]


# ---------------------------------------------------------------- helpers
def sh(c, k):
    return tuple(max(0, min(255, round(x * k))) for x in c)

def bx(d, u0, v0, u1, v1, z0, z1, c, edge=EDGE):
    """box() with automatic shading: top = c, front-left face darker, front-right a little darker."""
    box(d, u0, v0, u1, v1, z0, z1, c, sh(c, .74), sh(c, .86), edge)

def fv(d, u0, u1, v, z0, z1, col, out=None):          # a patch on a face that faces +v (front-left)
    poly(d, [P(u0, v, z0), P(u1, v, z0), P(u1, v, z1), P(u0, v, z1)], col, out)

def fu(d, u, v0, v1, z0, z1, col, out=None):          # a patch on a face that faces +u (front-right)
    poly(d, [P(u, v0, z0), P(u, v1, z0), P(u, v1, z1), P(u, v0, z1)], col, out)

def top(d, u0, v0, u1, v1, z, col, out=None):
    poly(d, [P(u0, v0, z), P(u1, v0, z), P(u1, v1, z), P(u0, v1, z)], col, out)

def R(p):
    return (round(p[0]), round(p[1]))

def flat(w, h):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); return im, ImageDraw.Draw(im)

def cmap(rows, pal, pad=1):
    w = max(len(r) for r in rows)
    im = Image.new('RGBA', (w + 2 * pad, len(rows) + 2 * pad), (0, 0, 0, 0))
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.': im.putpixel((i + pad, j + pad), pal[ch] + (255,))
    return im

def put(img, spr, x, y):
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); lay.paste(spr, (round(x), round(y)), spr)
    img.alpha_composite(lay)

def billboard(img, spr, x, y):
    """Stand a flat sprite with its bottom-centre on screen point (x, y)."""
    put(img, spr, x - spr.width // 2, y - spr.height + 1)

def shear(spr, slope):
    """+1: the picture lies on a plane facing +v (right wall, front-left faces): it drops 1px every 2px right.
       -1: a plane facing +u (left wall, front-right faces): it rises 1px every 2px right."""
    w, h = spr.size; n = (w - 1) // 2
    out = Image.new('RGBA', (w, h + n + 1), (0, 0, 0, 0))
    for i in range(w):
        col = spr.crop((i, 0, i + 1, h))
        out.paste(col, (i, i // 2 if slope > 0 else n - i // 2), col)
    return out

def on_left_wall(img, spr, v_left, ztop):
    """Hang a flat sprite on the left wall: its left edge at v_left, its top at height ztop."""
    x, y = P(0, v_left, ztop); n = (spr.width - 1) // 2
    put(img, shear(spr, -1), x, y - n)

def on_right_wall(img, spr, u_left, ztop):
    x, y = P(u_left, 0, ztop); put(img, shear(spr, 1), x, y)

def with_glow(spr, col, a=120, k=0.75):
    w, h = spr.size; m = max(6, int(max(w, h) * 0.35))
    out = Image.new('RGBA', (w + 2 * m, h + 2 * m), (0, 0, 0, 0))
    glow(out, out.width / 2, out.height / 2, w * k, h * k, col, a)
    out.alpha_composite(spr, (m, m)); return out

def bez(p0, p1, p2, n=14):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in [i / (n - 1) for i in range(n)]]

def tentacle(d, pts, w=3, cols=TENT, suck=PINK, curl=True):
    pts = [R(p) for p in pts]
    d.line(pts, fill=cols[0], width=w + 2, joint='curve')
    d.line(pts, fill=cols[1], width=w, joint='curve')
    if w >= 3: d.line(pts[:-2], fill=cols[2], width=1)
    for p in pts[2:-2:3]: d.point((p[0], p[1] + 1), fill=suck)
    if curl:
        x, y = pts[-1]; d.point([(x, y), (x + 1, y)], fill=cols[2])

def cylinder(d, cu, cv, r, z0, z1, col, edge=EDGE, topc=None):
    """Round thing standing on the floor: column-by-column shading, lit from the left."""
    x, yb = P(cu, cv, z0); _, yt = P(cu, cv, z1)
    rx, ry = 2.83 * r, 1.41 * r
    light, mid, dark = sh(col, 1.08), sh(col, .9), sh(col, .72)
    for xx in range(math.ceil(x - rx), math.floor(x + rx) + 1):
        t = (xx - x) / rx
        s = math.sqrt(max(0, 1 - t * t)) * ry
        c = light if t < -0.4 else (dark if t > 0.45 else mid)
        d.line([(xx, round(yt + s)), (xx, round(yb + s))], fill=c)
        d.point((xx, round(yb + s)), fill=edge)
    d.line([(round(x - rx), round(yt)), (round(x - rx), round(yb))], fill=edge)
    d.line([(round(x + rx), round(yt)), (round(x + rx), round(yb))], fill=edge)
    d.ellipse([round(x - rx), round(yt - ry), round(x + rx), round(yt + ry)], fill=topc or sh(col, 1.18), outline=edge)
    return x, yt, rx, ry

def books_row(d, u0, u1, v, z0, rnd, maxh=7, pal=BOOKS, glowy=False):
    u = u0
    while u < u1 - 0.7:
        wd = rnd.choice((0.8, 0.9, 1.0, 1.1)); h = rnd.randint(maxh - 2, maxh); col = rnd.choice(pal)
        fv(d, u, min(u + wd, u1), v, z0, z0 + h, col)
        x, y = P(u + wd / 2, v, z0 + h - 2); px(d, x, y, MINT if glowy and rnd.random() < .5 else sh(col, 1.35))
        u += wd + 0.05

def stamp_face_px(d, pts, col):
    for p in pts: px(d, p[0], p[1], col)


# ================================================================ ZONE 5: CORNER PIECES (back corner, u 2-9, v 0-4)
def c_plank_bookcase(img):
    d = ImageDraw.Draw(img); c = (190, 140, 88); rnd = random.Random(2)
    bx(d, 2, 0, 8, 3.5, 0, 28, c)
    for z0 in (2, 11, 20):
        fv(d, 2.6, 7.4, 3.5, z0, z0 + 7, (104, 68, 38))
    books_row(d, 2.7, 7.3, 3.5, 2, rnd, 6)
    books_row(d, 2.7, 5.4, 3.5, 11, rnd, 6)
    fv(d, 5.6, 7.3, 3.5, 11, 12.2, (200, 70, 70)); fv(d, 5.8, 7.1, 3.5, 12.2, 13.4, (70, 120, 200))   # lying books
    x, y = P(4, 3.5, 20)                                                  # a little pot with a sprout
    d.rectangle([x - 1, y - 3, x + 2, y], fill=(206, 112, 72), outline=EDGE)
    d.point([(x, y - 4), (x + 1, y - 5), (x - 1, y - 5), (x + 1, y - 4)], fill=(90, 190, 110))
    x, y = P(6.3, 3.5, 20); d.rectangle([x - 1, y - 2, x + 1, y], fill=GLASS, outline=GLASS_E); px(d, x, y - 1, (255, 180, 90))

def c_kelp_fern(img):
    d = ImageDraw.Draw(img)
    cylinder(d, 5.6, 2.2, 2.4, 0, 7, (206, 112, 72), topc=(90, 62, 40))
    x, yt = P(5.6, 2.2, 7)
    d.ellipse([round(x - 7), round(yt - 4), round(x + 7), round(yt + 3)], outline=(226, 138, 92))
    x0, y0 = x, yt
    blades = [(-6, 20, (50, 130, 80), 0.0), (5, 18, (60, 150, 90), 2.6), (-2, 28, (90, 190, 110), 1.3),
              (2, 25, (60, 160, 90), 2.1), (-4, 14, (110, 200, 120), .7), (7, 12, (90, 190, 110), 1.9)]
    for dx, h, col, ph in blades:
        for t in range(h):
            xx = round(x0 + dx * t / h + math.sin(t / 3 + ph) * 1.3); yy = round(y0 - t)
            d.point([(xx - 1, yy), (xx + 2, yy)], fill=sh(col, .55))
            d.point([(xx, yy), (xx + 1, yy)], fill=col if t % 4 else sh(col, 1.2))
        xx = round(x0 + dx + math.sin(h / 3 + ph) * 1.3); d.point([(xx, round(y0 - h)), (xx + 1, round(y0 - h))], fill=sh(col, .55))
        if h > 16:
            bx_, by_ = round(x0 + dx * .6 + math.sin(.6 * h / 3 + ph) * 1.3) + 2, round(y0 - .6 * h)
            d.point((bx_, by_), fill=(214, 196, 90))                      # a little kelp float
    for bxx, byy in ((x0 + 6, y0 - 26), (x0 + 8, y0 - 31)):
        d.point((round(bxx), round(byy)), fill=(220, 244, 250))

def c_crate_tower(img):
    d = ImageDraw.Draw(img)
    def crate(u0, v0, u1, v1, z0, z1, c):
        bx(d, u0, v0, u1, v1, z0, z1, c)
        for z in range(z0 + 3, z1, 3):
            d.line([R(P(u0, v1, z)), R(P(u1, v1, z))], fill=sh(c, .58)); d.line([R(P(u1, v0, z)), R(P(u1, v1, z))], fill=sh(c, .66))
        d.line([R(P(u0 + .3, v1, z0 + .5)), R(P(u1 - .3, v1, z1 - .5))], fill=sh(c, .58))   # brace
    crate(2, 0, 9, 4, 0, 12, (200, 156, 100))
    crate(3, 0.3, 8, 3.7, 12, 21, (186, 140, 88))
    crate(4, 0.8, 7.5, 3.3, 21, 27, (208, 164, 110))
    x, y = P(4.2, 4, 7)                                                   # a stencilled fish on the bottom crate
    d.point([(x, y), (x + 1, y), (x + 2, y + 1), (x + 3, y + 1), (x + 4, y + 2), (x - 1, y - 1), (x - 1, y + 1)], fill=(60, 90, 140))
    d.point([(x + 1, y + 2), (x + 2, y + 2), (x + 3, y + 3)], fill=(60, 90, 140))
    x, y = P(7, 3.3, 27)                                                  # a coil of rope on top
    d.ellipse([x - 4, y - 3, x + 3, y + 1], fill=(222, 196, 140), outline=EDGE); d.ellipse([x - 2, y - 2, x + 1, y], outline=(170, 140, 90))

def c_library_bookcase(img):
    d = ImageDraw.Draw(img); c = (110, 68, 42); rnd = random.Random(5)
    bx(d, 2, 0, 9, 4, 0, 36, c)
    bx(d, 1.6, -0.2, 9.4, 4.4, 36, 38.5, sh(c, 1.25))
    d.line([R(P(1.6, 4.4, 37)), R(P(9.4, 4.4, 37))], fill=GOLD)
    for z0 in (2, 10.5, 19, 27.5):
        fv(d, 2.6, 8.4, 4, z0, z0 + 7, (58, 34, 24))
    books_row(d, 2.7, 8.3, 4, 2, rnd, 7)
    books_row(d, 2.7, 6.2, 4, 10.5, rnd, 7)
    fv(d, 6.5, 8.2, 4, 10.5, 11.6, (90, 160, 100)); fv(d, 6.7, 8, 4, 11.6, 12.7, (236, 190, 70)); fv(d, 6.6, 8.1, 4, 12.7, 13.8, (200, 70, 70))
    books_row(d, 2.7, 8.3, 4, 19, rnd, 7)
    books_row(d, 4.4, 8.3, 4, 27.5, rnd, 6)
    x, y = P(3.4, 4, 27.5)                                                # a starfish on the top shelf
    d.point([(x, y - 4), (x - 2, y - 2), (x - 1, y - 2), (x, y - 2), (x + 1, y - 2), (x + 2, y - 2), (x, y - 3), (x - 1, y - 1), (x + 1, y - 1), (x - 2, y), (x + 2, y)], fill=(244, 120, 110))
    for u, h in ((2.4, 9), (8.6, 6)):                                     # seaweed hanging off the crown
        x, y = P(u, 4.4, 36)
        for k in range(h): px(d, x + (1 if (k // 2) % 2 else 0), y + k, (60, 160, 90) if k % 3 else (90, 200, 110))

def c_grandfather_clock(img):
    d = ImageDraw.Draw(img); c = (156, 96, 54)
    bx(d, 3.5, 0.5, 7.5, 3.5, 0, 10, c)
    bx(d, 4, 1, 7, 3, 10, 24, c)
    bx(d, 3.3, 0.3, 7.7, 3.7, 24, 35, c)
    bx(d, 3.6, 0.6, 7.4, 3.4, 35, 37, sh(c, 1.2))
    x, y = P(5.5, 2, 37); d.point([(x, y - 1), (x, y - 2), (x - 1, y - 1), (x + 1, y - 1)], fill=GOLD)    # finial
    fv(d, 4.5, 6.5, 3, 12, 22, (54, 40, 46))                              # pendulum window
    x, y = P(5.5, 3, 21); d.line([(x, y), (x, y + 6)], fill=GOLD_D); d.ellipse([x - 2, y + 5, x + 1, y + 8], fill=GOLD, outline=GOLD_D)
    fv(d, 4, 7, 3.5, 3, 8, sh(c, .62)); x, y = P(5.5, 3.5, 5.5); px(d, x, y, GOLD)
    cx, cy = P(5.5, 3.7, 29.5)
    d.ellipse([cx - 4, cy - 4, cx + 3, cy + 3], fill=GOLD, outline=GOLD_D)
    d.ellipse([cx - 3, cy - 3, cx + 2, cy + 2], fill=CREAM)
    d.line([(cx, cy), (cx, cy - 2)], fill=INK); d.line([(cx, cy), (cx + 1, cy)], fill=INK)
    for dx, dy in ((-2, 0), (2, 0), (0, 2)): px(d, cx + dx * .9 - .5, cy + dy * .9 - .5, (150, 120, 90))

def c_lab_cabinet(img):
    d = ImageDraw.Draw(img); c = (216, 228, 232)
    bx(d, 2, 0, 9, 4, 0, 30, c)
    for u0 in (2.5, 5.7):
        fv(d, u0, u0 + 2.8, 4, 1, 11, sh(c, .82), sh(c, .6))
    for u in (5.2, 6.2): x, y = P(u, 4, 7); px(d, x, y, (120, 124, 134))
    fv(d, 2.6, 8.4, 4, 13, 29, (176, 216, 232), (120, 150, 170))
    for z in (18.5, 24): d.line([R(P(2.6, 4, z)), R(P(8.4, 4, z))], fill=(150, 160, 170))
    d.line([R(P(5.5, 4, 13)), R(P(5.5, 4, 29))], fill=(120, 150, 170))
    for u, z, col, kind in ((3.2, 13, (240, 120, 160), 'f'), (6.2, 13, (110, 210, 120), 'b'), (7.6, 13, (110, 170, 230), 't'),
                            (3.4, 18.5, (255, 214, 90), 'b'), (4.6, 18.5, (170, 110, 200), 't'), (7, 18.5, (240, 140, 60), 'f'),
                            (3.6, 24, (90, 200, 200), 't'), (6.6, 24, (240, 120, 160), 'b')):
        x, y = R(P(u, 4, z)); y -= 1
        if kind == 'f':
            d.point([(x, y - 3), (x, y - 2)], fill=GLASS); d.line([(x - 1, y - 1), (x + 1, y - 1)], fill=col); d.line([(x - 1, y), (x + 1, y)], fill=col)
        elif kind == 'b':
            d.rectangle([x - 1, y - 2, x + 1, y], fill=col); d.line([(x - 1, y - 3), (x + 1, y - 3)], fill=GLASS)
        else:
            d.line([(x, y - 4), (x, y)], fill=col); px(d, x, y - 4, GLASS)
    x, y = P(5.5, 4, 32)                                                  # a hazard-free yellow sticker on top front
    x, y = P(4.2, 4, 28); d.polygon([(x, y - 3), (x - 2, y), (x + 2, y)], fill=(255, 214, 10), outline=EDGE)

def skeleton_sprite():
    pal = {'w': BONE, 's': BONE_D, 'k': (60, 50, 60), 'g': (150, 154, 164), 'G': (100, 104, 114), 'r': (210, 60, 70), 'R': (150, 40, 50)}
    rows = [
        ".......gg........",
        "......g..g.......",
        "......wwww.......",
        ".....wwwwww......",
        "....wwwwwwww.....",
        "w...wkkwwkkw.....",
        "ww..wkkwwkkw.....",
        ".w..wwwwswww.....",
        ".w...wkwkwk......",
        "..w...wwww.......",
        "...w.rrRRrr......",
        "...wwwwwwwwww....",
        ".....w.ww.w.w....",
        ".....wwwwww.w....",
        ".....w.ww.w..w...",
        "......wwww...w...",
        ".......ww....w...",
        ".......ww...ww...",
        ".....wwwwww......",
        ".....ww.gww......",
        "......w.g.w......",
        "......w.g.w......",
        "......w.g.w......",
        "......w.g.w......",
        "......w.g.w......",
        ".....ww.g.ww.....",
        "........g........",
        "....GGGGGGGGG....",
    ]
    return outline_all(cmap(rows, pal))

def c_skeleton(img):
    d = ImageDraw.Draw(img)
    x, y = P(5.5, 2.2, 0)
    billboard(img, skeleton_sprite(), x, y + 1)

def diving_suit_sprite():
    pal = {'b': (214, 160, 70), 'B': (170, 116, 40), 'y': (255, 220, 130), 'g': (120, 190, 220), 'G': (70, 130, 170),
           'w': (230, 250, 255), 'c': (196, 172, 124), 'C': (160, 136, 92), 'l': (90, 94, 110), 'L': (60, 62, 76),
           'n': (130, 88, 50), 'N': (96, 64, 36), 'k': (40, 40, 50)}
    rows = [
        "......bbbb......",
        "....bbyybbbb....",
        "...byybbbbbbB...",
        "..bybbggggbbbB..",
        "..bbbgwwgggbbB..",
        ".bbbgwgggggbbbB.",
        ".bkbgggggggbkbB.",
        ".bbbgggggGgbbbB.",
        "..bbbgggGGbbbB..",
        "..bbbbggggbbbB..",
        "...bbbbbbbbbB...",
        ".BbbbbbbbbbbbbB.",
        "BccCbBbBbBbBcccB",
        "cccC.cccccc.cccC",
        "ccC..cccccC..ccC",
        "bbB..cccccC..bbB",
        "ccC..LLLLLL..ccC",
        "cc...cccccC...cc",
        ".....cccccC.....",
        ".....ccC.ccC....",
        ".....ccC.ccC....",
        ".....ccC.ccC....",
        ".....bbB.bbB....",
        "....LLLL.LLLL...",
        "....LLLL.LLLL...",
        "..NNNNNNNNNNNN..",
        "..nnnnnnnnnnnn..",
    ]
    return outline_all(cmap(rows, pal))

def c_diving_suit(img):
    x, y = P(5.5, 2.2, 0); billboard(img, diving_suit_sprite(), x, y + 1)

def c_coral_tree(img):
    d = ImageDraw.Draw(img)
    cylinder(d, 5.6, 2.2, 2.2, 0, 8, (226, 232, 246), topc=(232, 201, 135))
    x, yt = P(5.6, 2.2, 8)
    for xx in range(round(x - 5), round(x + 6), 3): d.point([(xx, yt + 5), (xx + 1, yt + 6)], fill=(60, 100, 190))   # blue pattern
    d.line([(round(x - 6), yt + 3), (round(x + 6), yt + 3)], fill=(60, 100, 190))
    lay, ld = flat(W, H)
    def branch(x0, y0, ang, ln, wid, col, depth):
        x1, y1 = x0 + math.cos(ang) * ln, y0 - math.sin(ang) * ln
        ld.line([R((x0, y0)), R((x1, y1))], fill=col, width=wid)
        if depth:
            branch(x1, y1, ang + 0.55, ln * .72, max(1, wid - 1), col, depth - 1)
            branch(x1, y1, ang - 0.5, ln * .7, max(1, wid - 1), col, depth - 1)
        else:
            ld.point(R((x1, y1 - 1)), fill=sh(col, 1.25))
    branch(x - 1, yt, math.pi / 2 + .25, 9, 3, (244, 120, 140), 3)
    branch(x + 1, yt, math.pi / 2 - .3, 8, 2, (250, 160, 110), 3)
    outline_all(lay); img.alpha_composite(lay)
    d = ImageDraw.Draw(img)
    for fx, fy, col in ((x + 9, yt - 18, (255, 214, 10)), (x - 10, yt - 12, (120, 200, 255))):   # two tiny fish
        d.point([(fx, fy), (fx + 1, fy), (fx + 2, fy), (fx - 1, fy - 1), (fx - 1, fy + 1)], fill=col); px(d, fx + 2, fy, INK)

def c_tentacle_clock(img):
    x, y = P(5.5, 3.7, 29.5); glow(img, x, y, 16, 22, (90, 255, 190), 150)
    d = ImageDraw.Draw(img); c = PURPLE_WOOD
    bx(d, 3.5, 0.5, 7.5, 3.5, 0, 10, c)
    bx(d, 4, 1, 7, 3, 10, 24, c)
    bx(d, 3.3, 0.3, 7.7, 3.7, 24, 35, c)
    bx(d, 3.6, 0.6, 7.4, 3.4, 35, 37, sh(c, 1.3))
    fv(d, 4.5, 6.5, 3, 12, 22, (20, 16, 40))
    px_, py_ = P(5.5, 3, 20)                                              # the pendulum is a sleepy glowing eye
    d.line([(px_, py_ - 6), (px_, py_)], fill=MINT)
    d.ellipse([px_ - 2, py_, px_ + 2, py_ + 3], fill=(230, 210, 100), outline=(120, 90, 40)); px(d, px_, py_ + 2, INK); px(d, px_, py_ + 1, INK)
    cx, cy = P(5.5, 3.7, 29.5)
    d.ellipse([cx - 4, cy - 4, cx + 3, cy + 3], fill=MINT, outline=(40, 140, 110))
    d.ellipse([cx - 3, cy - 3, cx + 2, cy + 2], fill=(220, 255, 236))
    d.line([(cx, cy), (cx, cy - 2)], fill=VIOLET_D); d.line([(cx, cy), (cx - 2, cy)], fill=VIOLET_D)
    # a little backwards arrow over the hood (it runs anticlockwise)
    ax, ay = P(5.5, 2, 39)
    d.arc([ax - 4, ay - 4, ax + 4, ay + 2], 200, 340, fill=MINT_L)
    d.point([(ax - 4, ay - 2), (ax - 5, ay - 3), (ax - 3, ay - 3)], fill=MINT_L)
    # tentacles hugging the case
    tentacle(d, bez((x - 14, y + 34), (x - 16, y + 14), (x - 4, y + 10)), 3)
    tentacle(d, bez((x + 12, y + 32), (x + 12, y + 18), (x + 2, y + 16)), 3)
    tentacle(d, bez((x - 6, y + 10), (x - 12, y - 4), (x - 8, y - 9)), 2)

def idol_sprite():
    pal = {'j': (90, 170, 120), 'J': (60, 126, 90), 'h': (140, 214, 160), 'e': MINT_L, 'E': (40, 200, 140),
           'k': (30, 60, 46), 'w': (60, 126, 90), 'W': (44, 96, 70)}
    rows = [
        "....hhhhh....",
        "...hjjjjjjJ..",
        "..hjjjjjjjjJ.",
        "WWjEejjjEejJW",
        "WwjeEjjjeEjJw",
        "Wwjjjjjjjjjjw",
        "WwwjjJjJjjjww",
        ".WwjJjJjJjJw.",
        "..jJjJjJjJjJ.",
        "..jjJjjJjjJJ.",
        ".hjjjjjjjjjJJ",
        ".jjjjjjjjjjJJ",
        ".JJJJJJJJJJJ.",
    ]
    return outline_all(cmap(rows, pal))

def c_rlyeh_idol(img):
    d = ImageDraw.Draw(img)
    x, y = P(5.5, 2.2, 22); glow(img, x, y, 14, 14, (90, 255, 190), 150)
    d = ImageDraw.Draw(img)
    bx(d, 3, 0.5, 8, 3.8, 0, 14, STONE)
    bx(d, 2.7, 0.2, 8.3, 4.1, 14, 15.5, sh(STONE, 1.2))
    bx(d, 2.7, 0.2, 8.3, 4.1, 0, 1.5, sh(STONE, 1.1))
    gx, gy = R(P(4, 3.8, 11))
    for j, row in enumerate(I.RUNES[0]):
        for i, ch in enumerate(row):
            if ch == 'x': px(d, gx + i, gy + j + i // 2, MINT_L)
    gx, gy = R(P(6.3, 3.8, 11))
    for j, row in enumerate(I.RUNES[2]):
        for i, ch in enumerate(row):
            if ch == 'x': px(d, gx + i, gy + j + i // 2, MINT)
    x, y = P(5.5, 2.2, 15.5); billboard(img, idol_sprite(), x, y + 2)

def c_necronomicosy(img):
    x, y = P(5.5, 2, 30); glow(img, x, y, 20, 20, (150, 110, 255), 150)
    d = ImageDraw.Draw(img); c = (64, 44, 86); rnd = random.Random(9)
    pal = [(110, 60, 120), (60, 90, 120), (120, 50, 70), (70, 110, 90), (150, 120, 70)]
    bx(d, 2, 0, 9, 4, 0, 30, c)
    bx(d, 1.6, -0.2, 9.4, 4.4, 30, 32, sh(c, 1.3))
    d.line([R(P(1.6, 4.4, 31)), R(P(9.4, 4.4, 31))], fill=MINT)
    for z0 in (2, 11, 20):
        fv(d, 2.6, 8.4, 4, z0, z0 + 7, (26, 18, 44))
    books_row(d, 2.7, 8.3, 4, 2, rnd, 7, pal, True)
    books_row(d, 2.7, 5, 4, 11, rnd, 7, pal, True)
    books_row(d, 6.6, 8.3, 4, 11, rnd, 7, pal, True)
    books_row(d, 2.7, 8.3, 4, 20, rnd, 7, pal, True)
    def fbook(bxx, byy, col):                                             # an open floating book
        spr = cmap(["kk.kk", "cWkWc", "cWkWc", ".kkk."], {'k': (40, 30, 60), 'c': col, 'W': CREAM})
        put(img, spr, bxx, byy)
    fbook(x - 10, y - 9, (120, 50, 70)); fbook(x + 3, y - 15, (60, 90, 120)); fbook(x - 3, y - 21, (110, 60, 120))
    for sx, sy in ((x - 6, y - 12), (x + 9, y - 9), (x + 1, y - 25), (x - 9, y - 18)):
        d.point([(sx, sy), (sx + 1, sy), (sx - 1, sy), (sx, sy + 1), (sx, sy - 1)], fill=MINT_L)
    x, y = P(5.8, 4, 12.5); d.ellipse([x - 1, y - 1, x + 2, y + 1], fill=(230, 210, 100)); px(d, x + 1, y, INK)   # a peeking eye in the gap


# ================================================================ ZONE 6: SEATS (against the left wall, facing +u)
def chair(d, c, u0=1, v0=8, u1=7, v1=14, seat=5, back=13, arm=9, bd=2, aw=1.5, lift=0, feet=None, cushion=None):
    if lift:
        fc = feet or (90, 60, 36)
        for fu_, fv_ in ((u1 - .8, v0), (u0, v1 - .8), (u1 - .8, v1 - .8)):
            bx(d, fu_, fv_, fu_ + .8, fv_ + .8, 0, lift, fc)
    bx(d, u0, v0, u0 + bd, v1, lift, back, c)
    bx(d, u0 + bd, v0, u1, v0 + aw, lift, arm, c)
    bx(d, u0 + bd, v0 + aw, u1, v1 - aw, lift, seat, sh(c, .95))
    if cushion:
        bx(d, u0 + bd, v0 + aw + .2, u1 - .3, v1 - aw - .2, seat, seat + 1.5, cushion)
    bx(d, u0 + bd, v1 - aw, u1, v1, lift, arm, c)

def s_wooden_chair(img):
    d = ImageDraw.Draw(img); c = (190, 140, 88)
    for lu, lv in ((6, 9), (2, 13), (6, 13)):
        bx(d, lu, lv, lu + .8, lv + .8, 0, 6, sh(c, .9))
    bx(d, 2, 9, 6.8, 13.8, 6, 7.3, c)
    for lv in (9, 13):
        bx(d, 2, lv, 2.8, lv + .8, 7.3, 17, sh(c, .95))
    bx(d, 2, 9, 2.8, 13.8, 14.5, 17, c)
    bx(d, 2, 9, 2.8, 13.8, 10.5, 11.8, c)
    x, y = P(4.4, 11.4, 7.3); d.ellipse([x - 4, y - 2, x + 4, y + 2], fill=(200, 90, 80), outline=EDGE)    # seat pad
    d.point([(x - 2, y), (x + 1, y - 1), (x + 2, y + 1)], fill=(240, 150, 140))

def s_beanbag(img):
    d = ImageDraw.Draw(img)
    x, y = R(P(4.5, 11, 0)); col = (236, 176, 70)
    d.ellipse([x - 12, y - 9, x + 12, y + 4], fill=sh(col, .8), outline=EDGE)
    d.ellipse([x - 11, y - 14, x + 9, y + 1], fill=col, outline=EDGE)
    d.ellipse([x - 7, y - 10, x + 5, y - 3], fill=sh(col, .86))                  # the dent where you sit
    d.arc([x - 9, y - 13, x + 2, y - 5], 190, 260, fill=sh(col, 1.2))
    d.line([(x + 1, y - 13), (x + 5, y - 6)], fill=sh(col, .7))                 # a seam
    d.point([(x - 8, y - 11), (x - 9, y - 10)], fill=(255, 236, 180))

def s_crate_seat(img):
    d = ImageDraw.Draw(img); c = (200, 156, 100)
    bx(d, 1.5, 8.5, 7, 14, 0, 7, c)
    for z in (2.5, 5): d.line([R(P(1.5, 14, z)), R(P(7, 14, z))], fill=sh(c, .58)); d.line([R(P(7, 8.5, z)), R(P(7, 14, z))], fill=sh(c, .66))
    x, y = P(3, 14, 4); d.point([(x, y), (x + 1, y), (x + 2, y + 1), (x + 3, y + 1), (x - 1, y - 1), (x - 1, y + 1)], fill=(60, 90, 140))
    bx(d, 1.8, 8.8, 6.7, 13.7, 7, 9, (90, 130, 200))
    for k in range(3):
        d.line([R(P(1.8 + k * 1.6 + .8, 8.8, 9)), R(P(1.8 + k * 1.6 + .8, 13.7, 9))], fill=(220, 236, 250))
        d.line([R(P(1.8, 8.8 + k * 1.6 + .8, 9)), R(P(6.7, 8.8 + k * 1.6 + .8, 9))], fill=(220, 236, 250))

def s_green_armchair(img):
    d = ImageDraw.Draw(img); c = (110, 168, 120)
    chair(d, c, back=15, arm=9.5, seat=6, lift=1.5, feet=(100, 64, 38), cushion=(140, 196, 146))
    for v in (9.6, 11.6):                                                 # buttons on the back
        for z in (10, 13): x, y = P(3, v + 1, z); px(d, x, y, sh(c, .55))
    for v in (8, 12.5):
        d.line([R(P(3, v + .2, 9.6)), R(P(7, v + .2, 9.6))], fill=sh(c, 1.3))
    x, y = P(2, 13.5, 15); d.line([(x - 2, y), (x + 3, y - 2)], fill=sh(c, 1.3))

def s_striped_sofa(img):
    d = ImageDraw.Draw(img); c = (64, 140, 150)
    chair(d, c, v0=6, v1=17, back=14, arm=9, seat=6, lift=1.5, feet=(100, 64, 38))
    for vv in (7.7, 11.6):
        bx(d, 3.2, vv, 7, vv + 3.7, 6, 7.5, (236, 220, 180))
    for v in range(7, 17, 2):                                             # cream stripes on the back
        fu(d, 3, v + .3, v + 1, 7.5, 13.6, (236, 220, 180))
    for u in (3.6, 5.2):
        fv(d, u, u + .7, 17, 2, 8.6, (236, 220, 180))
    x, y = P(4, 15, 10); d.polygon([(x - 2, y - 3), (x + 2, y - 4), (x + 3, y), (x - 1, y + 1)], fill=(236, 120, 110), outline=EDGE)  # cushion

def s_rocking_chair(img):
    d = ImageDraw.Draw(img); c = (176, 120, 70)
    for v in (9, 13):                                                     # curved rockers
        pts = [R(P(u / 2, v, 1.2 + 0.08 * (u / 2 - 4.5) ** 2)) for u in range(0, 18)]
        d.line(pts, fill=EDGE, width=3); d.line(pts, fill=sh(c, .9), width=1)
    for lu, lv in ((6, 9), (2, 13), (6, 13)): bx(d, lu, lv, lu + .7, lv + .7, 1.5, 6, sh(c, .85))
    bx(d, 2, 9, 6.8, 13.8, 6, 7.2, c)
    for lv in (9, 10.6, 12.2, 13.1):
        bx(d, 2, lv, 2.7, lv + .7, 7.2, 18, sh(c, .95))
    bx(d, 1.9, 8.8, 2.8, 14, 17, 19, c)
    lay, ld = flat(W, H)                                                  # knitted blanket over the back
    pts = [P(2.8, 9.5, 18), P(2.8, 13.6, 18), P(2.9, 13.6, 7), P(4.5, 12.4, 7.2), P(4.5, 10.2, 7.2), P(2.9, 9.5, 9)]
    poly(ld, pts, (200, 70, 70), EDGE)
    for k, z in enumerate(range(9, 18, 2)):
        ld.line([R(P(2.8, 9.6, z)), R(P(2.8, 13.5, z))], fill=(240, 220, 180) if k % 2 else (150, 44, 52))
    img.alpha_composite(lay)

def s_velvet_wingback(img):
    d = ImageDraw.Draw(img); c = (52, 66, 150)
    for fu_, fv_ in ((6.2, 8), (1, 13.2), (6.2, 13.2)):
        bx(d, fu_, fv_, fu_ + .8, fv_ + .8, 0, 1.8, GOLD)
    bx(d, 1, 8, 3, 14, 1.8, 19, c)
    bx(d, 3, 8, 4.6, 9.5, 9, 17, sh(c, .95)); bx(d, 3, 12.5, 4.6, 14, 9, 17, sh(c, .95))   # wings
    chair(d, c, back=9, arm=9.5, seat=6, lift=1.8, feet=GOLD, cushion=(76, 92, 186))
    bx(d, 3, 12.5, 4.6, 14, 9.5, 17, sh(c, .95))
    for z in (11, 14, 17):
        for v in (9.5, 11, 12.5): x, y = P(3, v, z); px(d, x, y, sh(c, .6))
    for u in range(4, 8): x, y = P(u - .3, 14, 8.5); px(d, x, y, GOLD)            # gold studs
    for v in (8.3, 9.1, 12.8, 13.6): x, y = P(7, v, 8.5); px(d, x, y, GOLD)

def s_chesterfield(img):
    d = ImageDraw.Draw(img); c = (150, 78, 44)
    chair(d, c, v0=6, v1=17, back=11, arm=11, seat=6, aw=1.8, lift=1.5, feet=(70, 40, 24), cushion=(166, 90, 52))
    for z in (8, 10):                                                     # buttoned (tufted) back
        for v in range(8, 16, 2):
            x, y = P(3, v + (1 if z == 10 else 0), z); px(d, x, y, sh(c, .5))
    for v0_ in (6, 15.2):
        d.line([R(P(3, v0_ + .3, 11)), R(P(7, v0_ + .3, 11))], fill=sh(c, 1.35))
        for u in range(4, 8):
            x, y = P(u - .3, v0_ + 1.8, 9.8) if v0_ > 10 else P(7, v0_ + 1, 10); px(d, x, y, GOLD)
    for v in range(7, 17, 1): x, y = P(1, v, 11); px(d, x, y, sh(c, 1.3))

def s_clamshell(img):
    d = ImageDraw.Draw(img)
    cx, cy = R(P(2.5, 11, 7))
    for k in range(9):                                                    # the fan of the shell
        a0, a1 = 180 + k * 20, 180 + (k + 1) * 20
        d.pieslice([cx - 15, cy - 16, cx + 15, cy + 12], a0, a1, fill=(250, 186, 196) if k % 2 else (236, 150, 168), outline=(150, 80, 100))
    d.arc([cx - 15, cy - 16, cx + 15, cy + 12], 180, 360, fill=INK)
    d.ellipse([cx - 3, cy - 2, cx + 3, cy + 2], fill=(236, 150, 168), outline=(150, 80, 100))
    x, y = R(P(4.5, 11, 0))
    d.ellipse([x - 5, y - 3, x + 5, y + 2], fill=GOLD, outline=EDGE)
    d.rectangle([x - 2, y - 6, x + 2, y - 1], fill=GOLD_D, outline=EDGE)
    x, y = R(P(4.5, 11, 6))
    d.ellipse([x - 10, y - 4, x + 10, y + 5], fill=(140, 214, 210), outline=EDGE)
    d.ellipse([x - 8, y - 4, x + 6, y + 2], fill=(180, 236, 230))
    d.ellipse([x + 2, y - 7, x + 6, y - 3], fill=WHITE, outline=EDGE); px(d, x + 3, y - 6, (255, 255, 255)); px(d, x + 4, y - 4, (220, 210, 230))   # pearl

def barnacle(d, x, y):
    d.point([(x, y), (x + 1, y), (x - 1, y + 1), (x + 2, y + 1)], fill=(220, 216, 200)); d.point([(x, y + 1), (x + 1, y + 1)], fill=(80, 80, 90))

def s_armchair_deep(img):
    x, y = P(4, 11, 8); glow(img, x, y, 22, 16, (90, 255, 190), 150)
    d = ImageDraw.Draw(img); c = (36, 104, 116)
    chair(d, c, back=16, arm=10, seat=6, lift=1.5, feet=GOLD, cushion=(50, 130, 140))
    for pt in ((3, 9, 14), (3, 12.5, 11), (1, 9.5, 16), (6, 14, 6), (7, 9, 4), (4, 14, 3.5), (7, 12.5, 7), (3, 11, 15.5)):
        bx_, by_ = R(P(*pt)); barnacle(d, bx_, by_)
    for v, h in ((9.2, 9), (12, 11), (13.4, 6)):                          # kelp draped over the back
        x, y = R(P(3, v, 16))
        for k in range(h): d.point((x + (1 if (k // 2) % 2 else 0), y + k), fill=(70, 170, 90) if k % 3 else (110, 210, 120))
    x, y = R(P(5.5, 14, 10))                                              # a glowing anemone on the arm
    glow(img, x, y - 2, 6, 5, PINK, 140); d = ImageDraw.Draw(img)
    for dx in (-2, -1, 0, 1, 2): d.line([(x + dx, y), (x + dx * 1.5, y - 3 - (dx % 2))], fill=(250, 150, 210))
    d.point([(x, y), (x - 1, y), (x + 1, y)], fill=(200, 80, 150))
    x, y = R(P(5.5, 8.6, 10)); d.point([(x, y - 2), (x - 2, y), (x - 1, y), (x, y), (x + 1, y), (x + 2, y), (x - 1, y + 1), (x + 1, y + 1), (x, y - 1)], fill=(244, 120, 110))
    for bxx, byy in ((x - 4, y - 20), (x - 2, y - 26), (x - 6, y - 29)): px(d, bxx, byy, (220, 244, 250))

def s_rlyeh_throne(img):
    x, y = P(2, 11, 26); glow(img, x, y, 14, 16, (90, 255, 190), 150)
    d = ImageDraw.Draw(img); c = STONE
    chair(d, c, back=22, arm=10, seat=6, aw=1.6, lift=0, cushion=(130, 90, 200))
    poly(d, [P(1, 8, 22), P(3, 8, 22), P(3, 11, 29), P(1, 11, 29)], sh(c, 1.15), EDGE)      # pointed top (back)
    poly(d, [P(3, 8, 22), P(3, 14, 22), P(3, 11, 29)], sh(c, .86), EDGE)
    poly(d, [P(1, 11, 29), P(3, 11, 29), P(3, 14, 22), P(1, 14, 22)], sh(c, 1.0), EDGE)
    gx, gy = R(P(3, 11, 25)); d.ellipse([gx - 2, gy - 2, gx + 1, gy + 1], fill=MINT_L, outline=(40, 140, 110))
    for z, rune in ((18, 3), (12, 1)):
        gx, gy = R(P(3, 12.2, z))
        for j, row in enumerate(I.RUNES[rune]):
            for i, ch in enumerate(row):
                if ch == 'x': px(d, gx + i, gy + j - i // 2, MINT)
    for v in (8.8, 13.2):                                                 # tentacle curls carved on the arm ends
        x, y = R(P(7, v, 9)); d.arc([x - 2, y - 1, x + 2, y + 3], 0, 300, fill=MINT)

def s_shoggoth_beanbag(img):
    x, y = R(P(4.5, 11, 0)); glow(img, x, y - 7, 18, 13, (150, 110, 255), 150)
    d = ImageDraw.Draw(img); col = (120, 76, 190)
    for dx, dy, r in ((-10, 2, 3), (9, 1, 3), (-3, 4, 2), (5, 4, 2)):     # little drips
        d.ellipse([x + dx - r, y + dy - r // 2 - 1, x + dx + r, y + dy + r // 2], fill=sh(col, .8), outline=EDGE)
    d.ellipse([x - 12, y - 9, x + 12, y + 4], fill=sh(col, .8), outline=EDGE)
    d.ellipse([x - 11, y - 15, x + 10, y + 1], fill=col, outline=EDGE)
    d.ellipse([x - 7, y - 11, x + 5, y - 4], fill=sh(col, .88))
    d.arc([x - 9, y - 14, x + 1, y - 6], 190, 260, fill=(200, 170, 255))
    for ex, ey, r in ((-8, -6, 2), (6, -9, 2), (8, -3, 1), (-3, -13, 1), (2, -1, 1)):   # many cute eyes
        d.ellipse([x + ex - r, y + ey - r, x + ex + r, y + ey + r], fill=WHITE, outline=INK)
        px(d, x + ex, y + ey, INK)
    d.arc([x - 4, y - 3, x, y], 20, 160, fill=INK)
    for bxx, byy in ((x + 10, y - 16), (x + 12, y - 20)): px(d, bxx, byy, MINT_L)


# ================================================================ ZONE 6: TABLES (front-right spot, u 22-29, v 14-22)
def legs(d, u0, v0, u1, v1, z, c, t=.8):
    for lu, lv in ((u1 - t, v0), (u0, v1 - t), (u1 - t, v1 - t)):
        bx(d, lu, lv, lu + t, lv + t, 0, z, c)

def t_little_desk(img):
    d = ImageDraw.Draw(img); c = (176, 124, 72)
    bx(d, 23, 15, 29, 21, 0, 9, sh(c, .92))
    fv(d, 23.6, 28.4, 21, 1, 4, sh(c, .7)); fv(d, 23.6, 28.4, 21, 5, 8, sh(c, .7))
    for z in (2.5, 6.5): x, y = P(26, 21, z); px(d, x, y, GOLD)
    bx(d, 22.6, 14.6, 29.4, 21.4, 9, 10.2, c)

def t_barrel_table(img):
    d = ImageDraw.Draw(img)
    x, yt, rx, ry = cylinder(d, 26, 18, 2.6, 0, 9, (176, 120, 70), topc=(150, 100, 56))
    _, yb = P(26, 18, 0)
    for z in (2, 7):                                                      # iron hoops
        _, yy = P(26, 18, z); d.arc([round(x - rx), round(yy - ry), round(x + rx), round(yy + ry)], 0, 180, fill=(70, 70, 80))
    for dx in (-4, 1, 5): d.line([(round(x + dx), round(yt + ry * .8)), (round(x + dx), round(yb + ry * .8))], fill=(130, 86, 48))
    cylinder(d, 26, 18, 3.6, 9, 10.2, (200, 150, 96))

def t_side_table(img):
    d = ImageDraw.Draw(img); c = (196, 150, 100)
    legs(d, 24, 15, 29, 20, 9, sh(c, .85))
    bx(d, 24, 15, 29, 20, 3, 4, sh(c, .95))
    x, y = P(26.5, 17.5, 4)                                               # a basket on the low shelf
    d.rectangle([x - 4, y - 3, x + 3, y], fill=(214, 176, 110), outline=EDGE); d.line([(x - 3, y - 2), (x + 2, y - 2)], fill=(170, 130, 70))
    bx(d, 23.7, 14.7, 29.3, 20.3, 9, 10.2, c)

def t_study_table(img):
    d = ImageDraw.Draw(img); c = (120, 76, 46)
    legs(d, 22.5, 14, 29.5, 21.5, 9, sh(c, .9), 1)
    bx(d, 22.5, 14, 29.5, 21.5, 7, 9, sh(c, .9))
    fv(d, 24, 28, 21.5, 7.4, 8.6, sh(c, .6)); x, y = P(26, 21.5, 8); px(d, x, y, GOLD)
    bx(d, 22.2, 13.7, 29.8, 21.8, 9, 10.2, c)
    top(d, 23.2, 14.7, 28.8, 20.8, 10.2, (60, 120, 80), (40, 90, 60))     # green leather inlay
    for k in range(4): x, y = P(23.6 + k * 1.4, 15.1, 10.2); px(d, x, y, GOLD)

def t_mosaic_coffee(img):
    d = ImageDraw.Draw(img)
    cylinder(d, 26, 18, 2.2, 0, 1, (120, 80, 50))
    cylinder(d, 26, 18, .8, 1, 7, (150, 100, 60))
    x, yt, rx, ry = cylinder(d, 26, 18, 4, 7, 8.6, (236, 226, 200), topc=(244, 238, 222))
    rnd = random.Random(4)
    for k in range(40):
        a = k / 40 * 2 * math.pi; r = .78 + (k % 2) * .08
        d.point((round(x + rx * r * math.cos(a)), round(yt + ry * r * math.sin(a))), fill=(62, 128, 138) if k % 3 else (236, 190, 70))
    for k in range(10):
        a = k / 10 * 2 * math.pi; d.point((round(x + rx * .35 * math.cos(a)), round(yt + ry * .35 * math.sin(a))), fill=(62, 128, 138))
    d.point((round(x), round(yt)), fill=(236, 120, 110))

def t_lectern(img):
    d = ImageDraw.Draw(img); c = (150, 100, 58)
    bx(d, 24, 16, 28, 20, 0, 2, sh(c, .9))
    bx(d, 25.2, 17.2, 26.8, 18.8, 2, 14, c)
    poly(d, [P(23.5, 15.5, 19), P(28.5, 15.5, 19), P(28.5, 20.5, 14), P(23.5, 20.5, 14)], c, EDGE)
    poly(d, [P(23.5, 20.5, 14), P(28.5, 20.5, 14), P(28.5, 20.5, 12.8), P(23.5, 20.5, 12.8)], sh(c, .7), EDGE)
    poly(d, [P(28.5, 15.5, 19), P(28.5, 20.5, 14), P(28.5, 20.5, 12.8), P(28.5, 15.5, 17.8)], sh(c, .8), EDGE)
    poly(d, [P(24.2, 16.3, 18.5), P(26, 16.3, 18.5), P(26, 19.8, 15), P(24.2, 19.8, 15)], CREAM, (150, 130, 100))   # open book
    poly(d, [P(26, 16.3, 18.5), P(27.8, 16.3, 18.5), P(27.8, 19.8, 15), P(26, 19.8, 15)], (236, 226, 200), (150, 130, 100))
    for k in range(3):
        a, b = P(24.6, 16.9 + k * .9, 17.9 - k * .9), P(25.6, 16.9 + k * .9, 17.9 - k * .9); d.line([R(a), R(b)], fill=(160, 150, 140))
        a, b = P(26.4, 16.9 + k * .9, 17.9 - k * .9), P(27.4, 16.9 + k * .9, 17.9 - k * .9); d.line([R(a), R(b)], fill=(160, 150, 140))
    x, y = R(P(26, 19.8, 15)); d.line([(x, y), (x, y + 3)], fill=(200, 60, 70))   # ribbon

def t_lab_bench(img):
    d = ImageDraw.Draw(img); c = (226, 230, 232)
    bx(d, 22, 13.5, 29, 21, 0, 9, c)
    for u0 in (22.5, 25.7):
        fv(d, u0, u0 + 2.8, 21, 1, 8, sh(c, .84), sh(c, .62)); x, y = P(u0 + 2.4, 21, 6); px(d, x, y, (120, 124, 134))
    fu(d, 29, 14, 20.5, 1, 8, sh(c, .9), sh(c, .66))
    bx(d, 21.6, 13.1, 29.4, 21.4, 9, 10.5, (54, 58, 68))
    top(d, 22.4, 13.6, 24.8, 16.2, 10.5, (130, 136, 146), (80, 84, 94))   # little sink
    top(d, 22.8, 14, 24.4, 15.8, 10.5, (170, 180, 190))
    x, y = R(P(22.2, 13.4, 10.5)); d.line([(x, y), (x, y - 6), (x + 2, y - 7), (x + 3, y - 5)], fill=(170, 175, 185))   # swan-neck tap
    x, y = R(P(28.8, 13.4, 10.5)); d.rectangle([x - 1, y - 3, x, y], fill=GOLD, outline=EDGE)   # brass gas tap
    px(d, x + 1, y - 2, (240, 140, 60))

def t_chart_table(img):
    d = ImageDraw.Draw(img); c = (110, 66, 40)
    legs(d, 22.5, 14, 29.5, 21.5, 9, sh(c, .9), 1.1)
    bx(d, 22.5, 14, 29.5, 21.5, 7.5, 9, sh(c, .95))
    d.line([R(P(22.5, 21.5, 8.2)), R(P(29.5, 21.5, 8.2))], fill=GOLD); d.line([R(P(29.5, 14, 8.2)), R(P(29.5, 21.5, 8.2))], fill=GOLD)
    bx(d, 22.2, 13.7, 29.8, 21.8, 9, 10, c)
    top(d, 23, 14.5, 29, 21, 10, (232, 210, 160), (170, 140, 90))         # the sea chart
    rnd = random.Random(6)
    for u, v in ((24, 16), (24.5, 16.5), (25, 15.8)): x, y = P(u, v, 10); d.ellipse([x - 2, y - 1, x + 2, y + 1], fill=(120, 170, 110))
    pts = [R(P(25, 17, 10)), R(P(26, 18.2, 10)), R(P(27.2, 18.6, 10)), R(P(28, 19.8, 10))]
    for p_ in pts: px(d, p_[0], p_[1], (200, 60, 60))
    x, y = pts[-1]; d.point([(x - 1, y - 1), (x + 1, y + 1), (x + 1, y - 1), (x - 1, y + 1)], fill=(200, 60, 60))
    for u in (24, 27.5): x, y = P(u, 20, 10); d.arc([x - 2, y - 1, x + 2, y + 1], 0, 360, fill=(90, 130, 170))
    x, y = R(P(27.6, 15.6, 10))                                           # brass compass
    d.ellipse([x - 3, y - 2, x + 3, y + 1], fill=GOLD, outline=EDGE); d.ellipse([x - 2, y - 1, x + 2, y], fill=CREAM); px(d, x, y - 1, (200, 60, 60))

def t_rolltop(img):
    d = ImageDraw.Draw(img); c = (150, 70, 50)
    bx(d, 23, 15, 29, 21, 0, 9, c)
    for z0 in (1, 5): fv(d, 23.6, 28.4, 21, z0, z0 + 3, sh(c, .66), sh(c, .5))
    for z in (2.5, 6.5): x, y = P(26, 21, z); d.point([(x - 1, y), (x, y), (x + 1, y)], fill=GOLD)
    bx(d, 22.8, 14.8, 29.2, 21.2, 9, 10, sh(c, 1.1))
    top(d, 23.4, 18.2, 28.6, 20.8, 10, (60, 110, 76))
    bx(d, 23, 15, 29, 18, 10, 17, c)                                      # the roll top
    bx(d, 23, 15, 29, 17, 17, 18.6, c); bx(d, 23, 15, 29, 16, 18.6, 19.6, c)
    for z in range(11, 17): d.line([R(P(23.1, 18, z)), R(P(28.9, 18, z))], fill=sh(c, .58))
    d.line([R(P(23, 18, 17)), R(P(29, 18, 17))], fill=GOLD)
    x, y = R(P(27.4, 19.6, 10)); d.rectangle([x - 1, y - 2, x + 1, y], fill=(40, 40, 60), outline=EDGE)   # inkwell
    d.line([(x, y - 2), (x + 2, y - 7)], fill=WHITE); px(d, x + 3, y - 8, WHITE)

def t_librarians_desk(img):
    x, y = P(26, 18, 16); glow(img, x, y, 22, 18, (90, 255, 190), 150)
    d = ImageDraw.Draw(img); c = (64, 42, 84)
    for lu, lv in ((28.2, 14), (22.5, 20.7), (28.2, 20.7)):
        bx(d, lu, lv, lu + 1.1, lv + 1.1, 0, 2, GOLD); bx(d, lu + .2, lv + .2, lu + .9, lv + .9, 2, 8, c)
    bx(d, 22.5, 14, 29.3, 21.8, 7, 9, c)
    d.line([R(P(22.5, 21.8, 8)), R(P(29.3, 21.8, 8))], fill=GOLD)
    bx(d, 22.2, 13.7, 29.6, 22.1, 9, 10.2, sh(c, 1.2))
    bx(d, 23.2, 14.4, 25.2, 16.6, 10.2, 11.4, (120, 50, 70)); bx(d, 23.4, 14.6, 25, 16.4, 11.4, 12.4, (60, 90, 120))   # book stack
    top(d, 25.4, 16.8, 27.4, 20.8, 10.2, CREAM, (150, 130, 100))         # the book that writes itself
    top(d, 27.4, 16.8, 29.2, 20.8, 10.2, (236, 226, 200), (150, 130, 100))
    for k in range(3):
        a, b = P(25.8, 17.4 + k, 10.2), P(26.9, 17.4 + k, 10.2); d.line([R(a), R(b)], fill=(70, 150, 130))
    a, b = P(27.8, 17.4, 10.2), P(28.4, 17.4, 10.2); d.line([R(a), R(b)], fill=MINT)
    qx, qy = R(P(28.6, 18, 18))                                           # the floating quill
    d.line([(qx - 2, qy + 4), (qx + 3, qy - 3)], fill=(150, 130, 120))
    d.polygon([(qx - 1, qy + 2), (qx + 2, qy - 4), (qx + 5, qy - 5), (qx + 3, qy - 1)], fill=WHITE, outline=(140, 140, 170))
    tx, ty = R(P(28.2, 17.6, 10.2))
    for k, (dx, dy) in enumerate(((0, -2), (1, -4), (-1, -6))): px(d, tx + dx, ty + dy, MINT_L)
    for sx, sy in ((qx + 7, qy - 2), (qx - 5, qy - 2), (qx + 4, qy - 9)):
        d.point([(sx, sy), (sx + 1, sy), (sx - 1, sy), (sx, sy + 1), (sx, sy - 1)], fill=MINT_L)

def t_tentacle_lectern(img):
    x, y = P(26, 18, 16); glow(img, x, y, 18, 18, (150, 110, 255), 150)
    d = ImageDraw.Draw(img)
    bx_, by_ = R(P(26, 18, 0))
    for (sx, ex, cx_) in ((-9, -1, -10), (8, 1, 10), (-3, 0, -6), (3, 0, 6)):   # tentacles twisting up into a stand
        tentacle(d, bez((bx_ + sx, by_ + 2), (bx_ + cx_, by_ - 8), (bx_ + ex, by_ - 14)), 3, curl=False)
    for tx in (-9, 8): px(d, bx_ + tx - 1, by_ + 2, (190, 156, 238))
    c = (50, 36, 74)
    poly(d, [P(23.5, 15.5, 19), P(28.5, 15.5, 19), P(28.5, 20.5, 14), P(23.5, 20.5, 14)], c, EDGE)
    poly(d, [P(23.5, 20.5, 14), P(28.5, 20.5, 14), P(28.5, 20.5, 12.8), P(23.5, 20.5, 12.8)], sh(c, .7), EDGE)
    poly(d, [P(28.5, 15.5, 19), P(28.5, 20.5, 14), P(28.5, 20.5, 12.8), P(28.5, 15.5, 17.8)], sh(c, .8), EDGE)
    poly(d, [P(24.2, 16.3, 18.5), P(26, 16.3, 18.5), P(26, 19.8, 15), P(24.2, 19.8, 15)], (220, 255, 236), (40, 140, 110))
    poly(d, [P(26, 16.3, 18.5), P(27.8, 16.3, 18.5), P(27.8, 19.8, 15), P(26, 19.8, 15)], (200, 245, 225), (40, 140, 110))
    for u0 in (24.5, 26.4):
        for k in range(3):
            a = P(u0 + (k % 2) * .3, 16.9 + k * .9, 17.9 - k * .9); px(d, a[0], a[1], VIOLET); px(d, a[0] + 2, a[1] + 1, MINT)
    ex, ey = R(P(26, 20.5, 13.4)); d.ellipse([ex - 2, ey - 1, ex + 2, ey + 1], fill=(230, 210, 100), outline=INK); px(d, ex, ey, INK)
    for sx, sy in ((ex - 8, ey - 14), (ex + 7, ey - 16), (ex, ey - 20)): d.point([(sx, sy), (sx, sy - 1)], fill=MINT_L)

def t_void_table(img):
    x, y = P(26, 18, 8); glow(img, x, y, 20, 12, (90, 255, 190), 150)
    d = ImageDraw.Draw(img)
    bx_, by_ = R(P(26, 18, 0))
    for sx, cx_ in ((-8, -11), (7, 10), (0, -3)):
        tentacle(d, bez((bx_ + sx * .4, by_ - 7), (bx_ + cx_, by_ - 3), (bx_ + sx, by_ + 2)), 2)
    x, yt, rx, ry = cylinder(d, 26, 18, 4, 7, 8.6, (64, 44, 110), topc=(16, 12, 40))
    d.ellipse([round(x - rx), round(yt - ry), round(x + rx), round(yt + ry)], outline=MINT)
    rnd = random.Random(8)
    for _ in range(20):
        a = rnd.uniform(0, 2 * math.pi); r = rnd.uniform(0, .85)
        px(d, x + rx * r * math.cos(a), yt + ry * r * math.sin(a), rnd.choice([WHITE, MINT_L, (200, 190, 255)]))
    t = 0.0
    while t < 3.2 * math.pi:                                              # a little swirling galaxy
        r = .1 + t * .07; px(d, x + rx * r * math.cos(t), yt + ry * r * math.sin(t), (200, 160, 255)); t += .15
    d.point([(round(x), round(yt))], fill=WHITE)


# ================================================================ ZONES 3/4: WALL HANGINGS (flat, sheared onto a wall)
def framed(w, h, frame, inner):
    im, d = flat(w + 2, h + 2)
    d.rectangle([1, 1, w, h], fill=frame); d.rectangle([2, 2, w - 1, h - 1], fill=inner)
    d.line([(1, 1), (w, 1)], fill=sh(frame, 1.25)); d.line([(1, 1), (1, h)], fill=sh(frame, 1.15))
    return im, d

def w_postcard():
    im, d = framed(13, 10, (196, 150, 100), (150, 210, 235))
    d.rectangle([2, 6, 11, 9], fill=(60, 120, 190))
    for x in range(2, 12, 3): d.point([(x, 6), (x + 1, 7)], fill=(220, 240, 250))
    d.ellipse([8, 2, 10, 4], fill=(255, 214, 90))
    d.polygon([(4, 6), (7, 6), (6, 7), (5, 7)], fill=(150, 90, 50)); d.line([(5, 3), (5, 5)], fill=INK); d.polygon([(5, 3), (5, 5), (7, 5)], fill=WHITE)
    return outline_all(im)

def w_cork_board():
    im, d = framed(15, 11, (176, 124, 72), (196, 150, 96))
    rnd = random.Random(3)
    for _ in range(14): d.point((rnd.randint(2, 13), rnd.randint(2, 9)), fill=(176, 130, 80))
    d.rectangle([3, 3, 6, 6], fill=(255, 230, 110)); d.point([(4, 5), (5, 5)], fill=(180, 150, 60))
    d.rectangle([8, 2, 12, 5], fill=(250, 248, 240)); d.ellipse([9, 3, 11, 5], outline=(70, 120, 200)); d.point((10, 4), fill=(200, 60, 60))  # an atom drawing
    d.rectangle([4, 7, 8, 10], fill=(245, 170, 210)); d.line([(5, 9), (7, 9)], fill=(180, 100, 140))
    d.rectangle([10, 7, 13, 10], fill=(150, 210, 235))
    for p in ((4, 3), (10, 2), (6, 7), (11, 7)): d.point(p, fill=(220, 50, 60))
    return outline_all(im)

def w_plank_shelf():
    im, d = flat(18, 14)
    d.rectangle([1, 9, 16, 10], fill=(176, 124, 72)); d.line([(1, 9), (16, 9)], fill=(206, 156, 100))
    for x in (3, 13): d.polygon([(x, 11), (x + 2, 11), (x, 13)], fill=(130, 88, 50))
    d.rectangle([2, 5, 5, 8], fill=(206, 112, 72)); d.line([(2, 5), (5, 5)], fill=(226, 138, 92))   # pot
    d.point([(3, 4), (4, 3), (2, 3), (4, 2), (5, 3), (3, 2)], fill=(90, 190, 110)); d.point((3, 3), fill=(60, 150, 90))
    d.rectangle([7, 4, 9, 8], fill=GLASS); d.line([(7, 3), (9, 3)], fill=(150, 150, 160)); d.point([(8, 6), (8, 7)], fill=(240, 150, 160))   # shell jar
    d.rectangle([11, 3, 12, 8], fill=(200, 70, 70)); d.polygon([(13, 8), (14, 8), (16, 4), (15, 4)], fill=(70, 120, 200))   # books
    return outline_all(im)

def w_periodic_table():
    im, d = flat(22, 16)
    d.rectangle([1, 1, 20, 14], fill=(248, 246, 238))
    d.line([(4, 2), (17, 2)], fill=(60, 70, 120))                         # the title
    cols = {0: (230, 90, 90), 1: (245, 160, 80)}
    def cell(cx, cy):
        if cx == 0: return (230, 90, 90)
        if cx == 1: return (245, 160, 80)
        if 2 <= cx <= 11: return (250, 214, 110)
        if cx == 17: return (170, 120, 220)
        if cx >= 12 and cx + cy >= 17: return (110, 190, 220)
        return (130, 200, 130)
    for r in range(7):
        for cx in range(18):
            if r == 0 and cx not in (0, 17): continue
            if r in (1, 2) and 2 <= cx <= 11: continue
            d.point((2 + cx, 4 + r), fill=cell(cx, r))
    for r in range(2):
        for cx in range(3, 17): d.point((2 + cx, 12 + r), fill=(240, 150, 190))
    d.point([(1, 1), (20, 1)], fill=(220, 50, 60))
    return outline_all(im)

def w_sea_map():
    im, d = flat(18, 14)
    d.rectangle([1, 1, 16, 12], fill=(236, 214, 160))
    d.line([(1, 12), (16, 12)], fill=(200, 170, 110)); d.line([(16, 1), (16, 12)], fill=(200, 170, 110))
    d.point([(1, 1), (16, 12), (16, 1)], fill=(0, 0, 0, 0))
    d.polygon([(4, 5), (7, 3), (10, 4), (9, 7), (6, 8), (4, 7)], fill=(150, 190, 120)); d.point([(6, 5), (7, 5), (7, 6)], fill=(110, 150, 90))
    for x, y in ((3, 10), (11, 9), (13, 3)): d.point([(x, y), (x + 1, y - 1), (x + 2, y)], fill=(90, 140, 190))
    for x, y in ((9, 6), (10, 8), (11, 9), (12, 10)): pass
    for p in ((10, 7), (11, 8), (13, 8)): d.point(p, fill=(200, 60, 60))
    d.point([(13, 9), (15, 9), (14, 10), (13, 11), (15, 11)], fill=(200, 60, 60))   # X marks the spot
    d.point([(3, 2), (3, 4), (2, 3), (4, 3)], fill=(150, 110, 70)); d.point((3, 3), fill=(200, 60, 60))   # compass rose
    return outline_all(im)

def w_anchor():
    pal = {'n': (120, 78, 44), 'N': (92, 58, 32), 'h': (150, 100, 58), 'g': (160, 166, 178), 'G': (110, 116, 130),
           'w': (220, 226, 236), 't': (222, 196, 140), 'T': (180, 150, 96)}
    rows = [
        "...hhhhhhhh...",
        "..hnnnnnnnnN..",
        ".hnnnnggnnnnN.",
        ".hnnnngGgnnnN.",
        ".hnnnnggnnnnN.",
        ".hnngggggggnN.",
        ".hnnnnngnnnnN.",
        ".hnnnttgtnnnN.",
        ".hnnnTTgTTnnN.",
        ".hnnnnngnnnnN.",
        ".hgnnnngnnngN.",
        ".hggnnngnnggN.",
        ".hnggggGggggN.",
        "..nnngGGGgnN..",
        "...NNNNNNNN...",
    ]
    return outline_all(cmap(rows, pal))

def w_star_chart():
    im, d = flat(20, 17)
    d.rectangle([1, 1, 18, 15], fill=GOLD); d.rectangle([2, 2, 17, 14], fill=GOLD_D); d.rectangle([3, 3, 16, 13], fill=(26, 32, 80))
    for p in ((1, 1), (18, 1), (1, 15), (18, 15)): d.point(p, fill=(255, 236, 150))
    stars = [(5, 5), (8, 4), (10, 7), (7, 9), (13, 5), (14, 10), (11, 11)]
    d.line([stars[0], stars[1], stars[2], stars[3]], fill=(80, 100, 170)); d.line([stars[4], stars[2], stars[6], stars[5]], fill=(80, 100, 170))
    for s in stars: d.point(s, fill=(255, 240, 180))
    d.point([(4, 11), (15, 3), (9, 12), (12, 3)], fill=(150, 170, 230))
    d.point([(14, 4), (15, 4), (15, 5), (15, 6), (14, 7)], fill=(250, 240, 200))   # moon
    return outline_all(im)

def w_ships_wheel():
    im, d = flat(19, 19); cx = cy = 9
    for k in range(8):
        a = k * math.pi / 4
        d.line([(cx, cy), (round(cx + 7 * math.cos(a)), round(cy + 7 * math.sin(a)))], fill=(150, 100, 58))
        d.ellipse([round(cx + 8 * math.cos(a)) - 1, round(cy + 8 * math.sin(a)) - 1, round(cx + 8 * math.cos(a)) + 1, round(cy + 8 * math.sin(a)) + 1], fill=(176, 124, 72))
    d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], outline=(130, 86, 48), width=2)
    d.arc([cx - 6, cy - 6, cx + 6, cy + 6], 190, 260, fill=(206, 156, 100))
    d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=GOLD); d.point((cx - 1, cy - 1), fill=(255, 236, 150))
    return outline_all(im)

def w_portrait_ulhu():
    pal = {'g': GOLD, 'G': GOLD_D, 'y': (255, 236, 150), 'r': (130, 40, 60), 'R': (100, 30, 46),
           'b': (170, 226, 190), 's': (120, 190, 150), 'e': WHITE, 'p': (27, 27, 47), 'w': (90, 140, 90), 'k': (242, 140, 160), 'l': (250, 245, 215)}
    rows = [
        "ygggggggggggggy",
        "gGGGGGGGGGGGGGg",
        "gGrrrrrrrrrrrGg",
        "gGrrrrbbbbrrrGg",
        "gGrrrbbbbbbrrGg",
        "gGrwwbeebeebwwg",
        "gGwwbbpebpebbwg",
        "gGrwbkbbbbbkbwg",
        "gGrrbbsbsbsbrGg",
        "gGrrrbsbsbsrrGg",
        "gGRrlllllllrRGg",
        "gGRRllllllllRGg",
        "gGGGGGGGGGGGGGg",
        "ygggggggggggggy",
    ]
    return outline_all(cmap(rows, pal))

def w_watching_portrait():
    im, d = flat(19, 18)
    d.rectangle([1, 1, 17, 16], fill=(90, 60, 130)); d.rectangle([2, 2, 16, 15], fill=(60, 40, 96)); d.rectangle([3, 3, 15, 14], fill=(20, 40, 56))
    for p in ((1, 1), (17, 1), (1, 16), (17, 16)): d.point(p, fill=MINT_L)
    t = 0.0
    while t < 4 * math.pi:
        r = 1 + t * .5; d.point((round(9 + r * math.cos(t)), round(8.5 + r * .9 * math.sin(t))), fill=(36, 70, 86)); t += .2
    d.ellipse([4, 5, 14, 12], fill=WHITE, outline=INK)
    d.ellipse([7, 6, 11, 11], fill=MINT); d.ellipse([8, 7, 10, 10], fill=INK); d.point((8, 7), fill=WHITE)
    for x in (5, 8, 11, 13): d.line([(x, 5), (x - 1 if x < 9 else x + 1, 3)], fill=INK)
    out = outline_all(im)
    return with_glow(out, (90, 255, 190), 180, .7)

def w_map_rlyeh():
    im, d = flat(20, 16)
    d.rectangle([1, 1, 18, 14], fill=(62, 54, 84)); d.line([(1, 14), (18, 14)], fill=(44, 38, 62)); d.line([(18, 1), (18, 14)], fill=(44, 38, 62))
    for k, r in enumerate((6, 4, 2)):
        pts = [(round(10 + r * 1.2 * math.cos(a / 8 * 2 * math.pi + k)), round(7.5 + r * math.sin(a / 8 * 2 * math.pi + k))) for a in range(9)]
        d.line(pts[:-1 - k], fill=MINT if k != 1 else (150, 255, 210))
    d.point((10, 8), fill=WHITE); d.point([(9, 8), (11, 8), (10, 7), (10, 9)], fill=MINT_L)
    for x, y in ((3, 12), (4, 11), (5, 12)): d.point((x, y), fill=(190, 156, 238))   # a tentacle at the edge
    d.point([(3, 3), (16, 12), (15, 3)], fill=(200, 160, 255))
    out = outline_all(im)
    return with_glow(out, (90, 255, 190), 180, .7)

def w_tentacle_shelf():
    im, d = flat(20, 17)
    for sx in (4, 15):                                                    # tentacle brackets
        pts = [(sx, 11), (sx + (1 if sx < 9 else -1), 13), (sx, 15), (sx + (2 if sx < 9 else -2), 15)]
        d.line(pts, fill=(150, 100, 214), width=2)
        d.point((pts[-1][0], 14), fill=(190, 156, 238))
    d.rectangle([1, 9, 18, 10], fill=(64, 44, 86)); d.line([(1, 9), (18, 9)], fill=MINT)
    d.rectangle([3, 4, 5, 8], fill=(140, 255, 200)); d.line([(3, 3), (5, 3)], fill=(150, 150, 160))   # glowing jars
    d.ellipse([7, 4, 11, 8], fill=(245, 150, 210)); d.line([(9, 2), (9, 3)], fill=(180, 130, 80))
    d.rectangle([13, 6, 15, 8], fill=(150, 110, 255)); d.point([(14, 5)], fill=(150, 150, 160))
    d.point([(4, 5), (8, 5), (14, 7)], fill=WHITE)
    out = outline_all(im)
    return with_glow(out, (150, 110, 255), 190, .8)


# ================================================================ ZONE 9: SMALL PROPS (flat sprites, sit on furniture tops)
PROP_PAL = {'k': INK, 'w': WHITE, 'W': (210, 214, 224), 'n': (150, 96, 56), 'i': (240, 120, 150),
            'b': (70, 120, 200), 'B': (40, 70, 140), 'r': (210, 70, 70), 'R': (150, 44, 52), 'e': (90, 170, 100),
            'E': (50, 110, 70), 'y': (255, 214, 90), 'T': CREAM, 'p': (250, 186, 196), 'P': (226, 130, 150)}

def p_mug():
    return cmap(["..W..W..", "...W..W.", "kkkkkkk.", "knnnnnk.", "kwiwiwkkk", "kwiiiwk.k",
                 "kwwiwwk.k", "kwwwwwkkk", "kwwwwwk..", ".kkkkk..."], PROP_PAL)

def p_candle():
    im, d = flat(14, 17)
    d.ellipse([1, 12, 12, 15], fill=GOLD); d.ellipse([3, 12, 10, 14], fill=(255, 226, 138))
    d.rectangle([5, 6, 8, 13], fill=(250, 244, 225)); d.line([(8, 6), (8, 13)], fill=(220, 210, 190)); d.point([(6, 7), (6, 8)], fill=WHITE)
    d.point((6, 5), fill=(60, 40, 30))
    outline_all(im); d = ImageDraw.Draw(im)
    d.point([(6, 3), (5, 3), (6, 2), (7, 3), (6, 4)], fill=(255, 190, 60)); d.point([(6, 1), (6, 3)], fill=(255, 240, 170))
    return with_glow(im, (255, 214, 120), 170, .6)

def p_books():
    return cmap(["..kkkkkkkk..", "..kbbybbbTk.", "..kBBBBBBTk.", "kkkkkkkkkkk.", "krrrrrrrrTk.", "kRRyRRRRRTk.",
                 "kkkkkkkkkkkk", ".keeeeeeeeTk", ".kEEEEEEEETk", ".kkkkkkkkkkk"], PROP_PAL)

def p_scallop():
    return cmap(["....kkkkk....", "..kkTpTpTkk..", ".kTpTpTpTpTk.", "kTpTpTpTpTpTk", "kTpTpTpTpTpTk",
                 ".kTpTpTpTpTk.", "..kTpTpTpTk..", "...kkPTPkk...", "....kPPPk....", "....kkkkk...."], PROP_PAL)

def p_globe():
    im, d = flat(15, 18)
    d.ellipse([2, 1, 11, 10], fill=(70, 130, 210))
    d.polygon([(4, 3), (6, 2), (7, 4), (5, 6), (4, 5)], fill=(90, 180, 100)); d.polygon([(8, 6), (10, 5), (10, 8), (8, 9)], fill=(90, 180, 100))
    d.point([(4, 2), (3, 3)], fill=(170, 210, 250))
    d.arc([0, 0, 13, 11], 280, 100, fill=GOLD)
    d.line([(6, 11), (6, 13)], fill=GOLD_D); d.rectangle([3, 14, 9, 15], fill=GOLD); d.line([(3, 15), (9, 15)], fill=GOLD_D)
    return outline_all(im)

def p_beakers():
    im, d = flat(22, 15); e = (90, 130, 150)
    d.rectangle([1, 2, 3, 12], fill=GLASS, outline=e); d.rectangle([2, 7, 2, 11], fill=(240, 130, 170)); d.line([(0, 13), (4, 13)], fill=e)
    d.rectangle([8, 1, 10, 5], fill=GLASS, outline=e)
    d.polygon([(8, 5), (10, 5), (14, 12), (4, 12)], fill=GLASS, outline=e); d.polygon([(6, 9), (12, 9), (13, 11), (5, 11)], fill=(110, 210, 120))
    d.point([(9, 7), (10, 3)], fill=WHITE)
    d.rectangle([14, 6, 20, 12], fill=GLASS, outline=e); d.rectangle([15, 9, 19, 11], fill=(110, 170, 230)); d.point((14, 5), fill=e)
    d.line([(15, 7), (15, 8)], fill=WHITE)
    return outline_all(im)

def p_newtons_cradle():
    im, d = flat(19, 15)
    d.rectangle([1, 12, 17, 13], fill=(90, 58, 34)); d.line([(1, 12), (17, 12)], fill=GOLD)
    d.line([(2, 2), (2, 11)], fill=(170, 175, 185)); d.line([(16, 2), (16, 11)], fill=(170, 175, 185)); d.line([(2, 2), (16, 2)], fill=(190, 195, 205))
    for x in (5, 7, 9, 11): d.line([(x, 3), (x, 7)], fill=(120, 120, 130))
    d.line([(13, 3), (14, 5)], fill=(120, 120, 130))
    for x, y in ((4, 8), (6, 8), (8, 8), (10, 8), (14, 6)):
        d.rectangle([x, y, x + 1, y + 1], fill=(170, 176, 190)); d.point((x, y), fill=WHITE)
    return outline_all(im)

def p_bunsen():
    im, d = flat(14, 22)
    d.rectangle([2, 19, 10, 20], fill=(70, 74, 84)); d.line([(2, 19), (10, 19)], fill=(110, 114, 124))
    d.rectangle([5, 9, 7, 18], fill=(176, 180, 190)); d.line([(5, 9), (5, 18)], fill=(220, 224, 230))
    d.rectangle([4, 14, 8, 15], fill=(150, 154, 164)); d.point((6, 15), fill=(60, 60, 70))
    d.line([(8, 17), (10, 17), (11, 18), (12, 20)], fill=(240, 140, 60))
    outline_all(im); d = ImageDraw.Draw(im)
    d.polygon([(4, 8), (8, 8), (6, 1)], fill=(90, 140, 255)); d.polygon([(5, 8), (7, 8), (6, 4)], fill=(170, 220, 255))
    return with_glow(im, (120, 170, 255), 170, .5)

def p_specimen_jar():
    im, d = flat(13, 17)
    d.rectangle([2, 4, 10, 15], fill=GLASS); d.rectangle([3, 6, 9, 14], fill=(214, 230, 150))
    d.rectangle([2, 1, 10, 3], fill=(150, 150, 160)); d.line([(2, 1), (10, 1)], fill=(190, 190, 200))
    sea = cmap([".oo.", "ooko", ".o..", ".oo.", "..o.", ".o.."], {'o': (240, 150, 70), 'k': INK}, 0)
    im.alpha_composite(sea, (5, 6))
    d.rectangle([4, 12, 8, 13], fill=CREAM); d.line([(5, 13), (7, 13)], fill=(150, 150, 150))
    d.line([(3, 5), (3, 11)], fill=WHITE)
    return outline_all(im)

def p_potion():
    im, d = flat(16, 19)
    d.ellipse([2, 7, 13, 17], fill=(150, 90, 230)); d.rectangle([6, 3, 9, 8], fill=GLASS); d.rectangle([6, 1, 9, 2], fill=(180, 130, 80))
    d.line([(6, 6), (9, 6)], fill=GOLD)
    t = 0.0
    while t < 3 * math.pi:
        r = .5 + t * .45; d.point((round(7.5 + r * math.cos(t)), round(12.5 + r * .8 * math.sin(t))), fill=(210, 180, 255) if t < 6 else MINT); t += .25
    d.point([(4, 10), (4, 11)], fill=WHITE)
    outline_all(im); d = ImageDraw.Draw(im)
    d.point([(12, 2), (13, 0), (11, 0)], fill=MINT_L)
    return with_glow(im, (170, 120, 255), 190, .6)

def p_elder_candle():
    im, d = flat(13, 22)
    d.ellipse([1, 17, 11, 20], fill=GOLD_D); d.ellipse([2, 17, 10, 19], fill=GOLD)
    d.rectangle([4, 6, 8, 18], fill=(120, 76, 190)); d.line([(8, 6), (8, 18)], fill=(90, 56, 150))
    d.point([(5, 7), (5, 8), (5, 9), (7, 7), (7, 8)], fill=(170, 130, 230))
    d.point([(6, 11), (5, 12), (6, 12), (7, 12), (6, 13), (5, 14), (7, 14)], fill=GOLD)   # elder star
    d.point((6, 5), fill=(40, 30, 40))
    outline_all(im); d = ImageDraw.Draw(im)
    d.polygon([(4, 4), (8, 4), (6, -1)], fill=(90, 255, 170)); d.point([(6, 2), (6, 3)], fill=(220, 255, 236))
    return with_glow(im, (90, 255, 190), 190, .6)

def p_snow_globe():
    im, d = flat(16, 18)
    d.rectangle([2, 13, 13, 16], fill=(70, 50, 110)); d.line([(2, 13), (13, 13)], fill=GOLD); d.point((7, 15), fill=MINT_L); d.point((8, 15), fill=MINT_L)
    d.ellipse([2, 1, 13, 14], fill=(30, 70, 90))
    d.polygon([(4, 12), (5, 7), (7, 7), (7, 12)], fill=(80, 130, 110)); d.polygon([(7, 12), (8, 4), (10, 6), (11, 12)], fill=(100, 150, 120))
    d.point([(6, 9), (9, 8), (9, 10)], fill=MINT_L)
    for p in ((4, 4), (11, 3), (6, 3), (12, 8), (3, 8)): d.point(p, fill=WHITE)
    d.point([(4, 3), (4, 5)], fill=(180, 220, 240))
    return with_glow(outline_all(im), (90, 255, 190), 180, .6)


# ================================================================ the item list (name, prices from world.md bands)
TIERS = ['Basic', 'Nice', 'Fancy', 'Eldritch']
CATS = [
    ('corner', 'Corner pieces', '5 back corner', 'room', [
        ('plank_bookcase', 'Plank bookcase', 'Basic', 0, None, c_plank_bookcase),
        ('kelp_fern', 'Potted kelp', 'Basic', 90, None, c_kelp_fern),
        ('crate_tower', 'Crate tower', 'Basic', 110, None, c_crate_tower),
        ('library_bookcase', 'Library bookcase', 'Nice', 300, None, c_library_bookcase),
        ('grandfather_clock', 'Grandfather clock', 'Nice', 280, None, c_grandfather_clock),
        ('lab_cabinet', 'Lab glass cabinet', 'Nice', 250, None, c_lab_cabinet),
        ('skeleton_model', 'Skeleton model', 'Fancy', 550, None, c_skeleton),
        ('diving_suit', 'Brass diving suit', 'Fancy', 600, None, c_diving_suit),
        ('coral_tree', 'Coral tree in a vase', 'Fancy', 520, None, c_coral_tree),
        ('tentacle_clock', 'Backwards tentacle clock', 'Eldritch', 1300, {'outside_work': 8}, c_tentacle_clock),
        ('rlyeh_idol', "R'lyeh idol", 'Eldritch', 1400, {'level': 15}, c_rlyeh_idol),
        ('necronomicosy', 'The Necronomi-cosy', 'Eldritch', 1200, None, c_necronomicosy)]),
    ('seats', 'Seats', '6 furniture spot', 'room', [
        ('wooden_chair', 'Wooden chair', 'Basic', 0, None, s_wooden_chair),
        ('beanbag', 'Beanbag', 'Basic', 100, None, s_beanbag),
        ('crate_seat', 'Fish-crate seat', 'Basic', 80, None, s_crate_seat),
        ('green_armchair', 'Green armchair', 'Nice', 250, None, s_green_armchair),
        ('striped_sofa', 'Striped sofa', 'Nice', 350, None, s_striped_sofa),
        ('rocking_chair', 'Rocking chair', 'Nice', 220, None, s_rocking_chair),
        ('velvet_wingback', 'Velvet wingback', 'Fancy', 550, None, s_velvet_wingback),
        ('chesterfield', 'Chesterfield sofa', 'Fancy', 600, None, s_chesterfield),
        ('clamshell_chair', 'Clamshell chair', 'Fancy', 520, None, s_clamshell),
        ('armchair_of_the_deep', 'Armchair of the deep', 'Eldritch', 1200, None, s_armchair_deep),
        ('rlyeh_throne', "Throne of R'lyeh", 'Eldritch', 1400, {'level': 18}, s_rlyeh_throne),
        ('shoggoth_beanbag', 'Shoggoth beanbag', 'Eldritch', 1000, {'outside_work': 5}, s_shoggoth_beanbag)]),
    ('tables', 'Tables and desks', '6 furniture spot', 'room', [
        ('little_desk', 'Little desk', 'Basic', 0, None, t_little_desk),
        ('barrel_table', 'Barrel table', 'Basic', 90, None, t_barrel_table),
        ('side_table', 'Side table', 'Basic', 100, None, t_side_table),
        ('study_table', 'Study table', 'Nice', 300, None, t_study_table),
        ('mosaic_coffee_table', 'Mosaic coffee table', 'Nice', 250, None, t_mosaic_coffee),
        ('lectern', 'Lectern', 'Nice', 200, None, t_lectern),
        ('lab_bench', 'Lab bench', 'Fancy', 600, None, t_lab_bench),
        ('chart_table', "Captain's chart table", 'Fancy', 550, None, t_chart_table),
        ('rolltop_bureau', 'Roll-top bureau', 'Fancy', 580, None, t_rolltop),
        ('librarians_desk', "Librarian's desk", 'Eldritch', 1300, {'outside_work': 10}, t_librarians_desk),
        ('tentacle_lectern', 'Tentacle lectern', 'Eldritch', 1100, None, t_tentacle_lectern),
        ('void_table', 'Void-top table', 'Eldritch', 1000, {'level': 12}, t_void_table)]),
    ('wall', 'Wall hangings', '3/4 wall hanging', 'wall', [
        ('sea_postcard', 'Seaside picture', 'Basic', 0, None, w_postcard),
        ('cork_board', 'Cork board', 'Basic', 80, None, w_cork_board),
        ('plank_shelf', 'Plank wall shelf', 'Basic', 100, None, w_plank_shelf),
        ('periodic_table', 'Periodic table poster', 'Nice', 150, None, w_periodic_table),
        ('sea_map', 'Old sea map', 'Nice', 200, None, w_sea_map),
        ('mounted_anchor', 'Mounted anchor', 'Nice', 250, None, w_anchor),
        ('star_chart', 'Star chart', 'Fancy', 500, None, w_star_chart),
        ('ships_wheel', "Ship's wheel", 'Fancy', 550, None, w_ships_wheel),
        ('portrait_of_ulhu', 'Portrait of Ulhu', 'Fancy', 600, None, w_portrait_ulhu),
        ('watching_portrait', 'The watching painting', 'Eldritch', 900, None, w_watching_portrait),
        ('map_of_rlyeh', "Map of R'lyeh", 'Eldritch', 1100, {'outside_work': 6}, w_map_rlyeh),
        ('tentacle_shelf', 'Tentacle shelf', 'Eldritch', 1000, None, w_tentacle_shelf)]),
    ('props', 'Small props', '9 small spot', 'prop', [
        ('mug_of_tea', 'Mug of tea', 'Basic', 0, None, p_mug),
        ('candle', 'Candle', 'Basic', 80, None, p_candle),
        ('book_stack', 'Book stack', 'Basic', 80, None, p_books),
        ('scallop_shell', 'Scallop shell', 'Nice', 150, None, p_scallop),
        ('globe', 'Globe', 'Nice', 200, None, p_globe),
        ('beaker_set', 'Beaker set', 'Nice', 180, None, p_beakers),
        ('newtons_cradle', "Newton's cradle", 'Fancy', 500, None, p_newtons_cradle),
        ('bunsen_burner', 'Bunsen burner', 'Fancy', 520, None, p_bunsen),
        ('specimen_jar', 'Specimen jar', 'Fancy', 500, None, p_specimen_jar),
        ('bubbling_potion', 'Bubbling potion', 'Eldritch', 900, None, p_potion),
        ('elder_candle', 'Elder-sign candle', 'Eldritch', 950, None, p_elder_candle),
        ('rlyeh_snow_globe', "R'lyeh snow globe", 'Eldritch', 1000, {'level': 10}, p_snow_globe)]),
]


def render(kind, fn):
    if kind == 'room':
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); fn(im)
    elif kind == 'wall':
        im = shear(fn(), -1)
    else:
        im = fn()
    bb = im.getbbox(); return im.crop(bb)


# ---------------------------------------------------------------- catalogue
BG, CARD, CARD_E, BAND_E = (17, 24, 39), (32, 40, 62), (40, 26, 66), (28, 20, 48)
TIER_COL = {'Basic': (190, 196, 210), 'Nice': (130, 210, 170), 'Fancy': GOLD, 'Eldritch': MINT}
BAND = {'Basic': 'free-120', 'Nice': '150-350', 'Fancy': '500-600', 'Eldritch': '900-1,400'}

def font(n, bold=False):
    for f in (('arialbd.ttf' if bold else 'arial.ttf'), 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(f, n)
        except OSError:
            pass
    return ImageFont.load_default(n)

def price_txt(p):
    return 'Free' if p == 0 else f'{p:,} Ð'

def lock_txt(lock):
    if not lock: return ''
    if 'level' in lock: return f'needs level {lock["level"]}'
    return f'needs {lock["outside_work"]} outside-work ticks'

def catalogue(key, title, zone, entries):
    big = [(e, im.resize((im.width * S, im.height * S), Image.NEAREST)) for e, im in entries]
    iw = max(b.width for _, b in big); ih = max(b.height for _, b in big)
    pad, txt, gap, side, topm = 16, 74, 16, 150, 84
    cw, ch = max(iw + 2 * pad, 250), ih + 2 * pad + txt
    sheet = Image.new('RGBA', (side + 3 * cw + 4 * gap, topm + 4 * (ch + gap) + gap), BG + (255,))
    d = ImageDraw.Draw(sheet)
    d.text((gap, 18), title, fill=(240, 236, 226), font=font(32, True))
    d.text((gap, 56), f'zone {zone}  |  x{S}  |  prices in Eldritch Doubloons (Ð)', fill=(130, 140, 170), font=font(17))
    for r, tier in enumerate(TIERS):
        y0 = topm + r * (ch + gap)
        eld = tier == 'Eldritch'
        if eld:
            d.rounded_rectangle([gap // 2, y0 - gap // 2, sheet.width - gap // 2, y0 + ch + gap // 2], 14, fill=BAND_E, outline=MINT, width=2)
        d.text((gap + 4, y0 + ch // 2 - 26), tier.upper(), fill=TIER_COL[tier], font=font(22, True))
        d.text((gap + 4, y0 + ch // 2 + 4), BAND[tier] + ' Ð', fill=(150, 160, 185), font=font(15))
        if eld: d.text((gap + 4, y0 + ch // 2 + 24), 'glows, the big buys', fill=MINT, font=font(13))
        row = [(e, b) for e, b in big if e[2] == tier]
        for i, (e, b) in enumerate(row):
            x0 = side + gap + i * (cw + gap)
            d.rounded_rectangle([x0, y0, x0 + cw, y0 + ch], 10, fill=CARD_E if eld else CARD, outline=MINT if eld else (52, 62, 90), width=2 if eld else 1)
            sheet.alpha_composite(b, (x0 + (cw - b.width) // 2, y0 + pad + (ih - b.height) // 2))
            d.text((x0 + cw // 2, y0 + ch - txt + 6), e[1], fill=(240, 236, 226), font=font(18), anchor='ma')
            d.text((x0 + cw // 2, y0 + ch - txt + 30), price_txt(e[3]), fill=TIER_COL[tier], font=font(17, True), anchor='ma')
            if e[4]: d.text((x0 + cw // 2, y0 + ch - txt + 52), lock_txt(e[4]), fill=(255, 190, 110), font=font(14), anchor='ma')
    sheet.save(os.path.join(OUT_DESIGN, f'shop_{key}.png'))


# ---------------------------------------------------------------- the Study, science-teacher mix
def teacher_room():
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    I.wall_stripes(img); I.floor_checker(img); I.rug_woven(img)
    d = ImageDraw.Draw(img)
    cx, cz, r = 4.6, 30, 6                                                # the porthole (as in the basic Study)
    ring = [P(0, cx + r * 0.45 * math.cos(t), cz + r * math.sin(t)) for t in [i / 20 * 2 * math.pi for i in range(20)]]
    glass = [P(0, cx + (r - 1.5) * 0.45 * math.cos(t), cz + (r - 1.5) * math.sin(t)) for t in [i / 20 * 2 * math.pi for i in range(20)]]
    poly(d, ring, (214, 168, 70), (120, 84, 30)); poly(d, glass, (70, 150, 190))
    on_left_wall(img, w_periodic_table(), 29.6, 43)
    on_left_wall(img, w_cork_board(), 17, 41)
    on_right_wall(img, w_star_chart(), 18.5, 45)
    I.aqua_tank(img)
    c_skeleton(img)
    I.home_cage(img)
    x, y = P(3, 23, 1); d = ImageDraw.Draw(img)
    d.ellipse([x - 2, y - 3, x + 1, y], fill=(220, 150, 90)); d.point((x + 2, y - 1), fill=(240, 220, 160))
    s_green_armchair(img)
    spr = I.top_cardigan(I.ulhu(True))
    fx, fy = P(17, 17); img.alpha_composite(spr, (round(fx) - 16, round(fy) - 31))
    t_lab_bench(img)
    for spr_fn, u, v in ((p_bunsen, 26.2, 14.4), (p_specimen_jar, 28.4, 16.6), (p_mug, 28.2, 19.6)):
        x, y = P(u, v, 10.5); billboard(img, spr_fn(), x, y + 1)
    I.light_lamp(img)
    return img


def main():
    os.makedirs(OUT_ITEMS, exist_ok=True)
    rows = []
    for key, title, zone, kind, items in CATS:
        ents = []; count = {}
        for slug, name, tier, price, lock, fn in items:
            count[tier] = count.get(tier, 0) + 1
            iid = f'{key}_{tier.lower()}_{count[tier]}_{slug}'
            im = render(kind, fn); im.save(os.path.join(OUT_ITEMS, iid + '.png'))
            ents.append(((iid, name, tier, price, lock), im))
            rows.append({'id': iid, 'name': name, 'category': key, 'zone': zone, 'tier': tier, 'price': price, 'lock': lock})
        catalogue(key, title, zone, ents)
    with open(os.path.join(OUT_DESIGN, 'shop_furniture.json'), 'w', encoding='utf-8') as f:
        json.dump({'currency': 'Eldritch Doubloons', 'note': 'lock = null, {"level": n} or {"outside_work": n ticks}',
                   'items': rows}, f, indent=1, ensure_ascii=False)
    room = teacher_room()
    bg = Image.new('RGBA', (W + 8, H + 8), BG + (255,)); bg.alpha_composite(room, (4, 4))
    bg.resize(((W + 8) * S, (H + 8) * S), Image.NEAREST).save(os.path.join(OUT_DESIGN, 'room_iso_teacher.png'))
    print(f'saved {len(rows)} items to {OUT_ITEMS}, 5 catalogues + shop_furniture.json + room_iso_teacher.png to design/')

if __name__ == '__main__':
    main()
