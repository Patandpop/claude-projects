"""Ulhu's outfit shop: hats, tops, face, held items and skins, 3 per tier (Basic, Nice, Fancy, Eldritch).
Original art, drawn from shapes with Pillow on top of cthulhu_pixel.render() at 1x.

python outfits_shop.py ->
  items/outfits/<slot>_<tier>_<n>_<name>.png   Ulhu wearing each item, 32x32
  ../design/shop_outfits_<slot>.png            one catalogue per slot (x4, rows = tiers)
  ../design/shop_outfits.json                  id, name, slot, tier, price, lock
  ../design/ulhu_dressed_up.png                six complete looks side by side

Reads (never edits) cthulhu_pixel.py and iso_items.py; the 6 outfits already drawn in iso_items.py are reused.
"""
import contextlib, json, math, os, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cthulhu_pixel as C                                    # read only
import iso_items as I                                        # read only: helpers + the 6 existing outfits

OUT_ITEMS = os.path.join(HERE, 'items', 'outfits')
OUT_DESIGN = os.path.join(HERE, '..', 'design')
INK = I.INK
GOLD, GOLD_D = I.GOLD, I.GOLD_D
MINT = I.MINT
TIERS = ['Basic', 'Nice', 'Fancy', 'Eldritch']


# ---------------------------------------------------------------- helpers
def P(im, x, y, c):
    if 0 <= x < 32 and 0 <= y < 32: im.putpixel((x, y), tuple(c[:3]) + (255,))

def grid():
    return I.ulhu_grid()

TENT = I.tentacle_pts()
BODY_LETTERS = ('b', 's', 'l', 'h', 'p', 'e', 'k', 't')

def protect_pts():
    """Head, body, tentacles: never painted over by an item's outline."""
    g = grid()
    return {(x, y) for y in range(32) for x in range(32) if g[y][x] in BODY_LETTERS}

PROTECT = protect_pts()

def ring(im, pts, col=INK, skip=()):
    """Outline a set of item pixels on every side (also over wings), but never over the creature itself."""
    for x, y in list(pts):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in pts and q not in PROTECT and q not in skip and 0 <= q[0] < 32 and 0 <= q[1] < 32:
                P(im, q[0], q[1], col)

def stamp(im, rows, x0, y0, pal):
    pts = set()
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == '.': continue
            P(im, x0 + i, y0 + j, pal[ch]); pts.add((x0 + i, y0 + j))
    return pts

def glow_under(im, spots, col, a=120):
    """Soft light behind the sprite (Eldritch items glow)."""
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    for cx, cy, r in spots: I.glow(lay, cx, cy, r, r, col, a)
    lay.alpha_composite(im); return lay

def glow_over(im, spots, col, a=90):
    lay = Image.new('RGBA', im.size, (0, 0, 0, 0))
    for cx, cy, r in spots: I.glow(lay, cx, cy, r, r, col, a)
    out = im.copy(); out.alpha_composite(lay); return out

def body_pts(extra_hem=0, sides=0):
    """Pixels a top covers: the lower body not under a tentacle, optionally a longer hem / wider sides."""
    g = grid(); pts = set()
    for y in range(19, 32):
        for x in range(32):
            on_body = C.inell(x, y, 16, 24, C.SHAPE['body_rx'] + sides, C.SHAPE['body_ry'] + extra_hem) and y >= 19
            if not on_body or (x, y) in TENT: continue
            if g[y][x] in ('b', 's', 'l') or (extra_hem or sides) and g[y][x] in (None, 'o', 'w', 'W') and y >= 22:
                pts.add((x, y))
    return pts

ARMS = [(8, 23), (8, 24), (24, 23), (24, 24)]

def paint_top(im, colour_at, extra_hem=0, sides=0, sleeves=None, edge=INK):
    im = im.copy(); pts = body_pts(extra_hem, sides)
    for x, y in pts:
        P(im, x, y, colour_at(x, y, x > 18 or y > 27))
    if sleeves:
        for x, y in ARMS: P(im, x, y, sleeves)
    if extra_hem or sides:
        g = grid()
        for x, y in pts:                                     # outline only the new hem edge
            for dx, dy in ((1, 0), (-1, 0), (0, 1)):
                q = (x + dx, y + dy)
                if q not in pts and q not in PROTECT and 0 <= q[0] < 32 and 0 <= q[1] < 32 and g[q[1]][q[0]] not in ('s',):
                    P(im, q[0], q[1], edge)
    return im, pts


# ---------------------------------------------------------------- skins (body palettes)
MINT_PAL = dict(C.PAL)

@contextlib.contextmanager
def palette(over, sprout):
    old_pal, old_sprout = dict(C.PAL), C.SHAPE.get('sprout')
    C.PAL.update(MINT_PAL); C.PAL.update(over); C.SHAPE['sprout'] = sprout
    try:
        yield
    finally:
        C.PAL.clear(); C.PAL.update(old_pal); C.SHAPE['sprout'] = old_sprout

def m(**kw): d = {}; d.update(kw); return d

SKINS = {   # key: (palette changes, extra marks)
    'kelp_mint': ({}, []),
    'lavender':  (m(w=(170, 140, 220), W=(120, 92, 176), k=(245, 150, 190)), ['freckles']),
    'peach':     (m(w=(250, 180, 120), W=(214, 132, 80), k=(250, 130, 130), l=(255, 236, 200)), ['freckles']),
    'coral':     (m(w=(244, 140, 130), W=(200, 92, 90), l=(255, 228, 214)), ['horns']),
    'gold':      (m(w=(236, 190, 70), W=(186, 136, 30)), ['glint']),
    'sky':       (m(b=(160, 222, 214), s=(108, 182, 176), h=(220, 248, 244), w=(110, 160, 230), W=(70, 116, 190), o=(36, 64, 70)), ['pearl']),
    'pumpkin':   (m(b=(250, 160, 70), s=(214, 112, 40), h=(255, 214, 150), l=(255, 236, 190), w=(70, 120, 60), W=(44, 84, 40),
                    o=(80, 40, 20), k=(220, 80, 60)), ['stem']),
    'frost':     (m(b=(214, 236, 250), s=(160, 198, 230), h=(250, 254, 255), l=(255, 255, 255), w=(150, 200, 240), W=(100, 150, 210),
                    o=(50, 70, 110), k=(160, 190, 250)), ['snow']),
    'blossom':   (m(b=(250, 200, 214), s=(226, 150, 176), h=(255, 236, 242), l=(255, 248, 240), w=(130, 196, 140), W=(84, 150, 100),
                    o=(100, 50, 70), k=(240, 110, 150)), ['flower']),
    'midnight':  (m(b=(92, 74, 150), s=(62, 48, 110), h=(150, 130, 210), l=(190, 175, 230), w=(50, 40, 96), W=(30, 24, 66),
                    o=(16, 12, 36), e=(255, 230, 90), p=(60, 30, 10), k=(200, 120, 200)), ['midnight_glow']),
    'abyss':     (m(b=(36, 70, 120), s=(24, 48, 90), h=(70, 110, 170), l=(60, 96, 150), w=(20, 36, 70), W=(12, 22, 48),
                    o=(6, 10, 24), k=(80, 200, 220)), ['biolum']),
    'aurora':    (m(o=(30, 40, 70), w=(120, 100, 200), W=(80, 64, 160)), ['aurora']),
}

def skin_marks(im, kinds):
    for k in kinds:
        if k == 'freckles':
            for x, y in [(7, 12), (9, 14), (8, 14), (23, 14), (24, 12), (22, 14)]: P(im, x, y, (190, 110, 90))
        if k == 'horns':
            for x, y in [(10, 4), (9, 3), (9, 2), (22, 4), (23, 3), (23, 2)]: P(im, x, y, (200, 92, 90))
        if k == 'glint':
            for x, y in [(10, 8), (19, 8)]: P(im, x, y, (255, 230, 90))
            for x, y in [(16, 0), (15, 1), (16, 1), (17, 1), (16, 2)]: P(im, x, y, (255, 214, 10))
        if k == 'pearl':
            for x, y, c in [(14, 2, 0), (15, 2, 0), (14, 1, 1), (15, 1, 0)]: P(im, x, y, (250, 250, 255) if c else (215, 205, 230))
        if k == 'stem':
            for x, y, c in [(16, 2, (90, 70, 40)), (16, 1, (90, 70, 40)), (17, 0, (90, 70, 40)), (14, 1, (90, 160, 70)), (15, 1, (90, 160, 70)), (13, 0, (90, 160, 70))]:
                P(im, x, y, c)
            for x, y in [(12, 8), (12, 9), (21, 8), (21, 9)]: pass
        if k == 'snow':
            for cx, cy in [(15, 1), (4, 6), (28, 9)]:
                for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)): P(im, cx + dx, cy + dy, (255, 255, 255))
                for dx, dy in ((1, 1), (-1, -1), (1, -1), (-1, 1)): P(im, cx + dx, cy + dy, (180, 220, 255))
        if k == 'flower':
            for x, y in [(14, 0), (16, 0), (14, 2), (16, 2)]: P(im, x, y, (255, 255, 255))
            P(im, 15, 1, (255, 214, 10)); P(im, 15, 3, (84, 150, 100))
        if k == 'biolum':
            for x, y in [(11, 5), (14, 4), (19, 4), (22, 6), (8, 9), (24, 9), (15, 16), (12, 26), (20, 26), (16, 28), (9, 17), (23, 17)]:
                P(im, x, y, (120, 255, 230))
    return im

def skin_img(key, sprout=True):
    over, kinds = SKINS[key]
    with palette(over, sprout and not ({'horns', 'glint', 'pearl', 'stem', 'flower'} & set(kinds))):
        im = C.render('idle', 1)
    if key == 'aurora':                                      # body colours sweep top to bottom: mint, sky, violet, pink
        stops = [(150, 240, 200), (140, 200, 250), (180, 150, 240), (250, 170, 210)]
        g = grid()
        for y in range(32):
            t = y / 31 * (len(stops) - 1); i = min(int(t), len(stops) - 2); f = t - i
            c = tuple(round(stops[i][j] * (1 - f) + stops[i + 1][j] * f) for j in range(3))
            for x in range(32):
                if g[y][x] in ('b', 'h'): P(im, x, y, c)
                elif g[y][x] == 's': P(im, x, y, tuple(round(v * .8) for v in c))
        im = glow_under(im, [(16, 14, 15)], (180, 160, 255), 70)
    if key == 'midnight':
        im = glow_under(im, [(16, 14, 15)], (150, 120, 255), 80)
        im = glow_over(im, [(11, 10, 3), (20, 10, 3)], (255, 230, 90), 70)
    if key == 'abyss':
        im = glow_under(im, [(16, 16, 16)], (60, 220, 220), 60)
    skin_marks(im, kinds)
    if key == 'abyss':
        im = glow_over(im, [(x, y, 2) for x, y in [(11, 5), (19, 4), (8, 9), (24, 9), (12, 26), (20, 26)]], (120, 255, 230), 90)
    return im


# ---------------------------------------------------------------- hats (eyes start at row 7: hats stay above)
HAT = {'c': (120, 110, 100), 'C': (84, 76, 70), 'v': (60, 54, 50), 'k': (70, 130, 190), 'K': (46, 90, 140), 'f': (220, 236, 250),
       'B': (34, 34, 44), 'b': (56, 56, 70), 'g': GOLD, 'G': GOLD_D, 'r': (220, 60, 80), 'u': (90, 170, 250), 'e': (120, 220, 140),
       'T': (36, 30, 34), 't': (60, 50, 56), 'w': (250, 250, 240), 'R': (200, 50, 60)}

def hat_sprout(im): return im                                # the sprout is part of the base render

def hat_flat_cap(im):
    im = im.copy()
    pts = stamp(im, ["....cccccccc......",
                     "..ccCccccccccc....",
                     ".cccccCccccccccc..",
                     ".CCCCCCCCCCCCCCvvvv",
                     "..............vvvvv"], 6, 1, HAT)
    ring(im, pts); return im

def hat_beanie(im):
    im = im.copy()
    pts = stamp(im, ["......kkkkkk......",
                     "....kkKkkKkkKk....",
                     "..kkKkkKkkKkkKkk..",
                     ".kkkkkkkkkkkkkkkk.",
                     ".ffffffffffffffff.",
                     ".fKfKfKfKfKfKfKff."], 7, 0, HAT)
    ring(im, pts); return im

def hat_grad_cap(im):
    im = im.copy()
    pts = stamp(im, ["........bbbbb........",
                     "....bbbbbbbbbbbbb....",
                     "bbbbbbbbbbbbbbbbbbbbb",
                     ".....BBBBBBBBBBB.....",
                     ".....BBBBBBBBBBB....."], 6, 0, HAT)
    for x, y in [(16, 1), (17, 2), (18, 2), (19, 2), (20, 2), (21, 2), (22, 2), (23, 2), (24, 2), (25, 3), (25, 4), (25, 5), (24, 6), (25, 6), (26, 6)]:
        P(im, x, y, GOLD); pts.add((x, y))
    P(im, 26, 5, GOLD_D); pts.add((26, 5))
    ring(im, pts); return im

def hat_crown(im):
    im = im.copy()
    pts = stamp(im, ["g....g....g",
                     "gg..ggg..gg",
                     "gGggrggggGg",
                     "ggguggggrgg",
                     "GGGGGGGGGGG"], 11, 0, HAT)
    ring(im, pts); return im

def hat_tricorn(im):
    im = im.copy()
    pts = stamp(im, ["......TTTTTTTTT......",
                     "...TTTTTTTTTTTTTTT...",
                     ".TTTTTTTtwwwtTTTTTTT.",
                     "TTTTTTTTwRwRwTTTTTTTT",
                     "gTTTTTTTTwwwTTTTTTTTg",
                     ".gggggggggggggggggggg."], 6, 0, HAT)
    ring(im, pts); return im

def hat_halo(im):
    out = glow_under(im, [(16, 1, 9)], (255, 240, 160), 130)
    pts = set()
    for x in range(9, 24):
        for y in range(0, 4):
            v = ((x + .5 - 16.5) / 7.2) ** 2 + ((y + .5 - 1.8) / 1.9) ** 2
            if 0.55 <= v <= 1.05: P(out, x, y, (255, 236, 140) if y < 2 else (236, 190, 70)); pts.add((x, y))
    for x, y in [(8, 0), (25, 2), (16, 0)]:
        P(out, x, y, (255, 255, 255))
    out = glow_over(out, [(9, 1, 2), (24, 1, 2)], (255, 255, 220), 80)
    return out

def hat_floating_eye(im):
    out = glow_under(im, [(16, 2, 7)], (200, 120, 255), 130)
    pts = stamp(out, ["..ppppp..",
                      ".pwwwwwp.",
                      "pwwmmmwwp",
                      "pwwmMmwwp",
                      ".pwwwwwp.",
                      "..ppppp.."], 12, -1, {'p': (110, 60, 170), 'w': (250, 250, 255), 'm': (90, 220, 170), 'M': (20, 14, 40)})
    P(out, 15, 1, (255, 255, 255))
    for x, y in [(10, 1), (22, 1), (11, 3), (21, 3)]: P(out, x, y, (200, 150, 255))   # tiny wisps that say "floating"
    return out

HATS = [
    ('Basic', 'sprout', 'The sprout', 0, hat_sprout, True),
    ('Basic', 'flat_cap', 'Flat cap', 60, hat_flat_cap, False),
    ('Basic', 'beanie', 'Beanie', 100, hat_beanie, False),
    ('Nice', 'beret', 'Beret', 150, I.hat_beret, False),
    ('Nice', 'bobble_hat', 'Bobble hat', 180, I.hat_bobble, False),
    ('Nice', 'graduation_cap', 'Graduation cap', 260, hat_grad_cap, False),
    ('Fancy', 'wizard_hat', 'Wizard hat', 550, I.hat_wizard, False),
    ('Fancy', 'little_crown', 'Little crown', 600, hat_crown, False),
    ('Fancy', 'pirate_tricorn', 'Pirate tricorn', 520, hat_tricorn, False),
    ('Eldritch', 'crown_of_tentacles', 'Crown of tiny tentacles', 1200, I.hat_tentacle_crown, False),
    ('Eldritch', 'starlight_halo', 'Starlight halo', 1100, hat_halo, False),
    ('Eldritch', 'floating_eye', 'Floating eye hat', 1400, hat_floating_eye, False),
]


# ---------------------------------------------------------------- tops (tentacles cover the chest: tops show low and at the arms)
def top_tee(im):
    im, _ = paint_top(im, lambda x, y, sh: ((90, 160, 230) if sh else (120, 190, 250)) if y % 2 else (250, 250, 245) if not sh else (215, 220, 230),
                      sleeves=(120, 190, 250))
    return im

def top_raincoat(im):
    yel, yel_d = (255, 210, 60), (220, 168, 30)
    im, pts = paint_top(im, lambda x, y, sh: yel_d if sh else yel, extra_hem=1, sides=1, sleeves=yel, edge=(120, 84, 20))
    for y in (25, 27): P(im, 16, y, (240, 240, 240))                       # toggles
    for x in range(10, 23):
        if (x, 28) in pts: P(im, x, 28, yel_d)
    return im

def top_scarf(im):
    im = im.copy(); g = grid(); pts = set()
    red, white = (220, 60, 70), (250, 240, 230)
    for y in (19, 20):
        for x in range(8, 25):
            if (x, y) in TENT or g[y][x] in ('e', 'p'): continue
            if g[y][x] in ('b', 's', 'o', 'w', 'W', None): P(im, x, y, red if (x // 2) % 2 else white); pts.add((x, y))
    for y in range(21, 27):                                   # the tail hangs down on his left side
        for x in (7, 8):
            P(im, x, y, red if (y // 2) % 2 else white); pts.add((x, y))
    for x in (6, 7, 8): P(im, x, 27, red); pts.add((x, 27))  # fringe
    ring(im, pts); return im

def top_jumper(im):
    main, shade, knit = (120, 170, 90), (90, 134, 66), (180, 214, 140)
    def c(x, y, sh):
        if y in (21, 23) and (x % 2 == 0): return knit                  # a knitted zigzag band
        if y == 22 and (x % 2 == 1): return knit
        if y >= 28: return shade                                       # ribbed hem
        return shade if sh else main
    im, _ = paint_top(im, c, sleeves=main)
    for x in range(10, 23, 2):
        if grid()[28][x] in ('b', 's', 'l'): P(im, x, 28, (70, 110, 50))
    return im

def top_lab_coat(im):
    white, grey, shirt = (250, 250, 250), (210, 214, 224), (150, 190, 240)
    def c(x, y, sh):
        if abs(x + .5 - 16.5) < 1.2 and y < 28: return shirt          # open front shows the shirt
        return grey if sh else white
    im, pts = paint_top(im, c, extra_hem=1, sides=1, sleeves=white, edge=(80, 90, 110))
    for x, y in [(12, 25), (13, 25), (12, 26), (13, 26)]: P(im, x, y, grey)          # pocket
    P(im, 12, 24, (60, 110, 220)); P(im, 13, 24, (220, 60, 70))                       # pens
    return im

def top_dungarees(im):
    den, den_d = (70, 110, 180), (50, 80, 140)
    im, pts = paint_top(im, lambda x, y, sh: den_d if sh else den)
    for x, y in [(11, 21), (11, 22), (21, 21), (21, 22)]:                              # straps over the shoulders
        if (x, y) not in TENT: P(im, x, y, den)
    for x, y in [(14, 25), (15, 25), (16, 25), (17, 25), (14, 26), (17, 26), (14, 27), (15, 27), (16, 27), (17, 27)]:
        P(im, x, y, den_d)                                                             # bib pocket
    for x, y in [(12, 24), (20, 24)]: P(im, x, y, GOLD)
    return im

def top_tweed(im):
    br, br_d, chk = (150, 110, 74), (116, 82, 54), (178, 140, 96)
    def c(x, y, sh):
        if x % 3 == 0 or y % 3 == 0: return br_d if sh else chk          # tweed check
        return br_d if sh else br
    im, pts = paint_top(im, c, extra_hem=1, sleeves=br, edge=(70, 46, 30))
    for y in range(24, 29):                                              # lapels and the waistcoat between them
        P(im, 15, y, (90, 60, 40)); P(im, 17, y, (90, 60, 40)); P(im, 16, y, (240, 230, 210))
    for x, y in ARMS: P(im, x, y, (100, 72, 50))                         # elbow patches
    P(im, 12, 24, (200, 60, 70)); P(im, 11, 24, (230, 90, 100))          # pocket square
    return im

def top_captain(im):
    nv, nv_d = (40, 52, 110), (28, 36, 80)
    im, pts = paint_top(im, lambda x, y, sh: nv_d if sh else nv, extra_hem=1, sides=1, sleeves=nv, edge=(14, 18, 40))
    for x in (14, 18):
        for y in (25, 27): P(im, x, y, GOLD)
    for x, y in ARMS: P(im, x, y, nv)
    pts = set()
    for x, y in [(7, 21), (8, 21), (9, 21), (7, 22), (23, 21), (24, 21), (25, 21), (25, 22)]:   # epaulettes
        P(im, x, y, GOLD); pts.add((x, y))
    for x, y in [(7, 23), (25, 23)]: P(im, x, y, GOLD_D); pts.add((x, y))
    ring(im, pts, (60, 40, 10))
    for x, y in [(8, 24), (24, 24)]: P(im, x, y, GOLD)                  # cuffs
    return im

def top_robe_deep(im):
    teal, teal_d, trim = (24, 90, 110), (14, 60, 80), (120, 240, 210)
    g = grid(); im = im.copy(); pts = set()
    for y in range(20, 31):
        for x in range(5, 28):
            inside = (C.inell(x, y, 16, 24, 6.5, 5) or (y >= 24 and abs(x + .5 - 16) < 6 + (y - 24) * 0.7)) and y <= 30
            if inside and (x, y) not in TENT and g[y][x] not in ('e', 'p', 'k', 't', 'h') :
                if g[y][x] in ('b', 's', 'l', None, 'o', 'w', 'W'):
                    P(im, x, y, trim if y == 30 else (teal_d if x > 18 else teal)); pts.add((x, y))
    for x, y in ARMS: P(im, x, y, teal); pts.add((x, y))
    ring(im, pts, (8, 30, 40))
    sp = [(12, 26), (19, 28), (10, 29), (22, 27), (15, 29), (8, 24), (24, 23)]
    for x, y in sp: P(im, x, y, (200, 255, 240))
    return glow_over(glow_under(im, [(16, 27, 9)], (80, 230, 210), 80), [(x, y, 1) for x, y in sp[:4]], (180, 255, 240), 120)

def top_kelp_mantle(im):
    out = glow_under(im, [(16, 22, 13)], (90, 255, 160), 60)
    g = grid(); pts = set()
    kelp, kelp_d, bladder = (70, 150, 70), (44, 104, 50), (220, 200, 70)
    for i, x0 in enumerate((4, 7, 25, 28)):                              # fronds hang from the shoulders and sway
        for y in range(13 + (i % 2) * 2, 29 - (i % 2) * 2):
            x = x0 + round(math.sin(y / 2.0 + i) * 1.2)
            P(out, x, y, kelp); P(out, x + 1, y, kelp_d); pts |= {(x, y), (x + 1, y)}
            if y % 5 == 0: P(out, x + 1, y, bladder)
    for y in (19, 20):                                                    # mantle band behind the tentacles
        for x in range(8, 25):
            if (x, y) not in TENT and g[y][x] in ('b', 's', 'o', 'w', 'W', None): P(out, x, y, kelp if (x + y) % 3 else kelp_d); pts.add((x, y))
    for x, y in ARMS: P(out, x, y, kelp); pts.add((x, y))
    ring(out, pts, (20, 50, 26))
    return out

TOPS = [
    ('Basic', 'striped_tee', 'Striped tee', 40, top_tee),
    ('Basic', 'yellow_raincoat', 'Yellow raincoat', 100, top_raincoat),
    ('Basic', 'striped_scarf', 'Striped scarf', 80, top_scarf),
    ('Nice', 'knitted_jumper', 'Knitted jumper', 180, top_jumper),
    ('Nice', 'lab_coat', 'Lab coat', 250, top_lab_coat),
    ('Nice', 'dungarees', 'Dungarees', 200, top_dungarees),
    ('Fancy', 'teachers_cardigan', "Teacher's cardigan", 500, I.top_cardigan),
    ('Fancy', 'tweed_jacket', 'Tweed jacket', 550, top_tweed),
    ('Fancy', 'captains_coat', "Captain's coat", 600, top_captain),
    ('Eldritch', 'robe_of_the_deep', 'Robe of the deep', 1100, top_robe_deep),
    ('Eldritch', 'cloak_of_stars', 'Cloak of stars', 1300, I.top_star_cloak),
    ('Eldritch', 'kelp_mantle', 'Kelp mantle (sways)', 1000, top_kelp_mantle),
]


# ---------------------------------------------------------------- face (eyes: x 9-13 and 18-22, rows 7-12)
EYES = (9, 18)

def rect_ring(im, x0, y0, x1, y1, col, corners=False):
    pts = set()
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            edge = x in (x0, x1) or y in (y0, y1)
            corner = x in (x0, x1) and y in (y0, y1)
            if edge and (corners or not corner): P(im, x, y, col); pts.add((x, y))
    return pts

def face_freckles(im):
    im = im.copy()
    for x, y in [(8, 14), (10, 14), (9, 15), (22, 14), (24, 14), (23, 15)]: P(im, x, y, (196, 120, 96))
    return im

def face_plaster(im):
    im = im.copy()
    pts = stamp(im, ["tTTt", "tTTt"], 22, 13, {'t': (240, 200, 160), 'T': (220, 170, 130)})
    P(im, 23, 13, (200, 150, 110)); P(im, 24, 14, (200, 150, 110))
    return im

def face_ink(im):
    im = im.copy()
    for x, y in [(7, 14), (8, 14), (8, 15), (9, 14), (9, 15), (10, 15), (7, 15)]: P(im, x, y, (60, 80, 170))
    P(im, 8, 13, (90, 110, 200))
    return im

def face_round_glasses(im):
    im = im.copy(); col = (90, 56, 40)
    for ex in EYES: rect_ring(im, ex - 1, 6, ex + 5, 13, col)
    for x in (15, 16): P(im, x, 9, col)
    P(im, 7, 9, col); P(im, 24, 9, col)
    return im

def face_goggles(im):
    im = im.copy(); fr, strap = (240, 130, 40), (60, 70, 80)
    for ex in EYES:
        rect_ring(im, ex - 1, 6, ex + 5, 13, fr, corners=True)
        for y in range(7, 13):
            for x in range(ex, ex + 5):
                if im.getpixel((x, y))[:3] == C.PAL['e']: P(im, x, y, (205, 240, 255))
        P(im, ex + 1, 7, (255, 255, 255))
    for x in (15, 16): P(im, x, 9, fr); P(im, x, 10, fr)
    for x in (6, 7, 24, 25):
        P(im, x, 9, strap); P(im, x, 10, strap)
    return im

def face_moustache(im):
    im = im.copy()
    stamp(im, ["M...........M",
               "MM..MMMMM..MM",
               ".MMMMM.MMMMM."], 10, 13, {'M': (110, 70, 44)})
    return im

def face_monocle(im):
    im = im.copy()
    pts = rect_ring(im, 17, 6, 23, 13, GOLD)
    P(im, 17, 6, GOLD_D); P(im, 23, 13, GOLD_D)
    for x, y in [(23, 14), (24, 15), (24, 16), (25, 17), (25, 18), (25, 19)]: P(im, x, y, GOLD_D if y % 2 else GOLD)
    P(im, 19, 7, (255, 255, 255))
    return im

def face_half_moon(im):
    im = im.copy()
    for ex in EYES:
        for x in range(ex - 1, ex + 6): P(im, x, 13, GOLD)
        for y in (10, 11, 12): P(im, ex - 1, y, GOLD); P(im, ex + 5, y, GOLD)
        for x in range(ex, ex + 5): P(im, x, 10, GOLD_D)
    for x in (15, 16): P(im, x, 10, GOLD)
    P(im, 7, 10, GOLD); P(im, 24, 10, GOLD)
    return im

def face_heart_specs(im):
    im = im.copy(); col = (240, 90, 140)
    for ex in EYES:
        for x, y in [(ex - 1, 6), (ex, 5), (ex + 1, 5), (ex + 2, 6), (ex + 3, 5), (ex + 4, 5), (ex + 5, 6),
                     (ex - 1, 7), (ex - 1, 8), (ex - 1, 9), (ex - 1, 10), (ex + 5, 7), (ex + 5, 8), (ex + 5, 9), (ex + 5, 10),
                     (ex - 1, 11), (ex + 5, 11), (ex, 12), (ex + 4, 12), (ex + 1, 13), (ex + 3, 13), (ex + 2, 14)]:
            P(im, x, y, col)
    for x in (15, 16): P(im, x, 9, col)
    return im

def face_third_eye(im):
    out = glow_under(im, [(16, 5, 4)], (200, 120, 255), 120)
    stamp(out, [".LLLL.",
                "LwwwwL",
                "LwMMwL",
                ".LLLL."], 13, 3, {'L': (110, 60, 170), 'w': (255, 255, 255), 'M': (120, 40, 160)})
    P(out, 15, 4, (255, 255, 255))
    for x, y in [(13, 2), (16, 2), (18, 2)]: P(out, x, y, (110, 60, 170))   # lashes
    return out

def face_rune(im):
    out = glow_under(im, [(16, 4, 5)], (90, 255, 190), 150)
    rune = (120, 255, 200)
    for x, y in [(16, 2), (16, 3), (16, 4), (16, 5), (16, 6), (14, 3), (15, 4), (18, 3), (17, 4), (14, 6), (18, 6)]:
        P(out, x, y, rune)
    for x, y in [(7, 14), (25, 14)]: P(out, x, y, rune)                     # two cheek dots
    return glow_over(out, [(16, 4, 3)], (180, 255, 230), 70)

def face_abyssal_gaze(im):
    out = im.copy(); g = grid()
    for y in range(32):
        for x in range(32):
            if g[y][x] == 'p' and 7 <= y <= 12: P(out, x, y, (40, 200, 180))
    for ex in EYES: P(out, ex + 2, 10, (200, 255, 240)); P(out, ex + 3, 11, (200, 255, 240))
    return glow_over(glow_under(out, [(11, 10, 6), (20, 10, 6)], (60, 240, 210), 140), [(11, 10, 3), (20, 10, 3)], (120, 255, 230), 50)

FACES = [
    ('Basic', 'freckles', 'Freckles', 0, face_freckles),
    ('Basic', 'sticking_plaster', 'Sticking plaster', 40, face_plaster),
    ('Basic', 'ink_smudge', 'Ink smudge', 60, face_ink),
    ('Nice', 'round_glasses', 'Round glasses', 150, face_round_glasses),
    ('Nice', 'safety_goggles', 'Safety goggles', 200, face_goggles),
    ('Nice', 'moustache', 'Moustache', 180, face_moustache),
    ('Fancy', 'monocle', 'Monocle', 550, face_monocle),
    ('Fancy', 'half_moon_specs', 'Half-moon specs', 500, face_half_moon),
    ('Fancy', 'heart_specs', 'Heart specs', 520, face_heart_specs),
    ('Eldritch', 'third_eye', 'Third eye (blinks)', 1200, face_third_eye),
    ('Eldritch', 'glowing_rune', 'Glowing rune mark', 900, face_rune),
    ('Eldritch', 'abyssal_gaze', 'Abyssal gaze', 1000, face_abyssal_gaze),
]


# ---------------------------------------------------------------- held items (at the right arm nub, x 24, rows 23-24)
HAND = {(24, 23), (24, 24)}

def held(im, rows, x0, y0, pal, edge=INK):
    im = im.copy(); pts = stamp(im, rows, x0, y0, pal); ring(im, pts, edge, skip=HAND); return im, pts

def held_pencil(im):
    im = im.copy(); pts = set()
    for i in range(7):
        x, y = 25 + i // 2 + (i % 2), 26 - i
        P(im, x, y, (250, 200, 60)); P(im, x + 1, y, (220, 160, 40)); pts |= {(x, y), (x + 1, y)}
    P(im, 25, 27, (240, 210, 170)); P(im, 24, 28, (40, 40, 50)); pts |= {(25, 27), (24, 28)}
    for x, y in [(29, 19), (30, 19), (29, 18), (30, 18)]: P(im, x, y, (240, 140, 160)); pts.add((x, y))
    P(im, 28, 20, (200, 200, 210)); P(im, 29, 20, (200, 200, 210)); pts |= {(28, 20), (29, 20)}
    ring(im, pts, INK, skip=HAND); return im

def held_apple(im):
    return held(im, ["..gL.",
                     ".rr.L",
                     "rRrrr",
                     "rrrrr",
                     "rrrrd",
                     ".rdd."], 25, 19, {'r': (220, 50, 60), 'R': (255, 150, 150), 'd': (170, 30, 44), 'g': (100, 70, 40), 'L': (100, 190, 80)})[0]

def held_shell(im):
    return held(im, [".ppppp.",
                     "pPpPpPp",
                     "pPpPpPp",
                     ".pPpPp.",
                     "..ddd.."], 25, 20, {'p': (250, 190, 190), 'P': (230, 140, 150), 'd': (210, 120, 130)})[0]

def held_mug(im):
    im, _ = held(im, ["mmmmm.",
                      "mttttm",
                      "mwwwwmh",
                      "mrrrrm.h",
                      "mwwwwmh",
                      "mwwwwm",
                      ".mmmm."], 25, 20, {'m': (240, 236, 226), 't': (150, 96, 50), 'w': (240, 236, 226), 'r': (90, 160, 220), 'h': (240, 236, 226)})
    for x, y in [(26, 17), (27, 16), (28, 18), (29, 17), (28, 15)]: P(im, x, y, (220, 225, 235))   # steam
    return im

def held_test_tube(im):
    im, _ = held(im, ["ccc",
                      ".g.",
                      ".g.",
                      ".g.",
                      ".v.",
                      ".V.",
                      ".v.",
                      ".V."], 25, 17, {'c': (200, 140, 90), 'g': (220, 240, 250), 'v': (110, 230, 120), 'V': (70, 190, 90)})
    for x, y in [(26, 15), (27, 13), (25, 14)]: P(im, x, y, (150, 240, 160))   # bubbles
    return im

def held_pointer(im):
    im = im.copy(); pts = set()
    for i in range(12):
        x, y = 25 + i // 2, 24 - i
        P(im, x, y, (170, 120, 70)); pts.add((x, y))
    for x, y in [(30, 13), (30, 12), (31, 12)]: P(im, x, y, (230, 60, 70)); pts.add((x, y))
    ring(im, pts, INK, skip=HAND); return im

def held_book(im):
    return held(im, ["rrrrrr",
                     "rggggr",
                     "rrrrrr",
                     "rrRRrr",
                     "rrrrrr",
                     "rrrrrr",
                     "wwwwwr"], 25, 19, {'r': (170, 50, 60), 'R': (236, 190, 70), 'g': (236, 190, 70), 'w': (250, 246, 230)})[0]

def held_lantern(im):
    im, _ = held(im, ["..k..",
                      ".k.k.",
                      "kkkkk",
                      "kyYyk",
                      "kYoYk",
                      "kyYyk",
                      "kkkkk"], 25, 17, {'k': (60, 56, 64), 'y': (255, 220, 110), 'Y': (255, 240, 170), 'o': (255, 160, 60)})
    return glow_under(im, [(27, 21, 6)], (255, 210, 100), 110)

def held_trident(im):
    im = im.copy(); pts = set()
    for y in range(9, 29): P(im, 27, y, GOLD if y % 4 else GOLD_D); pts.add((27, y))
    for x, y in [(25, 6), (25, 7), (25, 8), (26, 9), (27, 5), (27, 6), (27, 7), (27, 8), (29, 6), (29, 7), (29, 8), (28, 9)]:
        P(im, x, y, GOLD); pts.add((x, y))
    for x, y in [(26, 9), (28, 9)]: P(im, x, y, GOLD_D)
    P(im, 25, 23, GOLD_D); P(im, 26, 23, GOLD_D); pts |= {(25, 23), (26, 23)}           # his tentacle-hand wraps the shaft
    ring(im, pts, INK, skip=HAND); return im

def held_deep_lantern(im):
    im, _ = held(im, ["..t..",
                      ".tTt.",
                      "tmmmt",
                      "tmMmt",
                      "tMwMt",
                      "tmMmt",
                      ".ttt."], 25, 17, {'t': (30, 70, 80), 'T': (120, 240, 210), 'm': (90, 240, 200), 'M': (170, 255, 230), 'w': (255, 255, 255)},
                 edge=(10, 30, 40))
    im = glow_under(im, [(27, 21, 8)], (60, 255, 200), 140)
    for x, y in [(30, 15), (23, 17), (31, 22)]: P(im, x, y, (200, 255, 240))
    return glow_over(im, [(27, 21, 3)], (200, 255, 240), 80)

def held_moon(im):
    out = glow_under(im, [(28, 16, 5)], (220, 220, 255), 110)
    for t in range(0, 360, 30):                                        # dotted orbit round his hand
        x = round(26 + 4.5 * math.cos(math.radians(t))); y = round(20 + 2.2 * math.sin(math.radians(t)))
        if (x, y) not in PROTECT: P(out, x, y, (180, 180, 230))
    stamp(out, [".mmm.",
                "mMmmm",
                "mmmcm",
                "mcmmm",
                ".mmm."], 26, 13, {'m': (220, 220, 236), 'M': (255, 255, 255), 'c': (170, 170, 200)})
    for x, y in [(25, 13), (31, 14), (30, 18)]: P(out, x, y, (255, 240, 160))
    return out

def held_galaxy(im):
    out = glow_under(im, [(27, 20, 7)], (200, 120, 255), 150)
    for x in range(23, 32):
        for y in range(16, 25):
            dx, dy = x + .5 - 27.5, (y + .5 - 20.5) * 1.15
            r = math.hypot(dx, dy)
            if r > 4.2: continue
            a = (math.degrees(math.atan2(dy, dx)) - r * 70) % 180
            col = (255, 250, 230) if r < 1.1 else ((230, 150, 255) if a < 50 else (120, 90, 220) if a < 120 else (60, 40, 140))
            P(out, x, y, col)
    for x, y in [(24, 18), (30, 22), (29, 17)]: P(out, x, y, (255, 255, 255))
    return out

HELD = [
    ('Basic', 'pencil', 'Pencil', 0, held_pencil),
    ('Basic', 'apple', "Apple for teacher", 50, held_apple),
    ('Basic', 'sea_shell', 'Sea shell', 80, held_shell),
    ('Nice', 'mug_of_tea', 'Mug of tea', 150, held_mug),
    ('Nice', 'test_tube', 'Test tube', 200, held_test_tube),
    ('Nice', 'pointer_stick', 'Pointer stick', 220, held_pointer),
    ('Fancy', 'book', 'Book', 500, held_book),
    ('Fancy', 'lantern', 'Lantern', 550, held_lantern),
    ('Fancy', 'trident', 'Trident', 600, held_trident),
    ('Eldritch', 'lantern_of_the_deep', 'Glowing lantern of the deep', 1200, held_deep_lantern),
    ('Eldritch', 'orbiting_moon', 'Tiny orbiting moon', 1300, held_moon),
    ('Eldritch', 'pocket_galaxy', 'Pocket galaxy', 1400, held_galaxy),
]

SKIN_LIST = [
    ('Basic', 'kelp_mint', 'Kelp Mint (his own)', 0),
    ('Basic', 'lavender', 'Lavender', 80),
    ('Basic', 'peach', 'Peach', 120),
    ('Nice', 'coral', 'Coral', 180),
    ('Nice', 'gold', 'Gold', 250),
    ('Nice', 'sky', 'Sky', 220),
    ('Fancy', 'pumpkin', 'Pumpkin (autumn)', 550),
    ('Fancy', 'frost', 'Frost (winter)', 550),
    ('Fancy', 'blossom', 'Blossom (spring)', 500),
    ('Eldritch', 'midnight', 'Midnight glow', 1200),
    ('Eldritch', 'abyss', 'Abyss (glowing spots)', 1400),
    ('Eldritch', 'aurora', 'Aurora', 1000),
]

SEASON = {'pumpkin': 'season: Oct-Nov', 'frost': 'season: Dec-Feb', 'blossom': 'season: Mar-May'}

def lock_for(tier, key):
    if key in SEASON: return 'level 5, ' + SEASON[key]
    return {'Basic': None, 'Nice': 'level 2', 'Fancy': 'level 5', 'Eldritch': 'level 15 (the Observatory)'}[tier]


# ---------------------------------------------------------------- dressing
SLOTS = {}
for t, k, n, p, fn, *_ in HATS: SLOTS[('hat', k)] = fn
for t, k, n, p, fn in TOPS: SLOTS[('top', k)] = fn
for t, k, n, p, fn in FACES: SLOTS[('face', k)] = fn
for t, k, n, p, fn in HELD: SLOTS[('held', k)] = fn

def dress(skin='kelp_mint', hat='sprout', top=None, face=None, hold=None):
    im = skin_img(skin, sprout=(hat == 'sprout'))
    if top: im = SLOTS[('top', top)](im)
    if face: im = SLOTS[('face', face)](im)
    if hat and hat != 'sprout': im = SLOTS[('hat', hat)](im)
    if hold: im = SLOTS[('held', hold)](im)
    return im

def items():
    """(slot, tier, n, key, name, price, image) for every shop item."""
    out = []
    for slot, lst in (('hat', HATS), ('top', TOPS), ('face', FACES), ('held', HELD)):
        n = {}
        for t, k, name, price, *_ in lst:
            n[t] = n.get(t, 0) + 1
            kw = {'hat': {'hat': k}, 'top': {'top': k}, 'face': {'face': k}, 'held': {'hold': k}}[slot]
            out.append((slot, t, n[t], k, name, price, dress(**kw)))
    n = {}
    for t, k, name, price in SKIN_LIST:
        n[t] = n.get(t, 0) + 1
        out.append(('skin', t, n[t], k, name, price, dress(skin=k)))
    return out


# ---------------------------------------------------------------- sheets
BG, CARD, CARD_E = I.BG, I.CARD, I.CARD_E
TIER_COL = I.TIER_COL
S = 4
SLOT_TITLE = {'hat': 'Hats', 'top': 'Tops', 'face': 'Face', 'held': 'Held items', 'skin': 'Skins'}

def catalogue(slot, ents):
    cw, ch, gap, top, lab = 250, 128 + 2 * 18 + 56, 16, 70, 120
    sheet = Image.new('RGBA', (lab + 3 * cw + 4 * gap, top + 4 * (ch + gap)), BG + (255,))
    d = ImageDraw.Draw(sheet)
    d.text((gap, 20), f"Ulhu's shop: {SLOT_TITLE[slot]}", fill=(240, 236, 226), font=I.font(30))
    d.text((sheet.width - gap, 30), 'x4  |  rows = tiers  |  price in doubloons', fill=(130, 140, 170), font=I.font(16), anchor='ra')
    for r, tier in enumerate(TIERS):
        y0 = top + r * (ch + gap); eld = tier == 'Eldritch'
        d.text((gap, y0 + ch // 2), ('ELDRITCH' if eld else tier.upper()), fill=TIER_COL[tier], font=I.font(18), anchor='lm')
        row = [e for e in ents if e[1] == tier]
        for c, (s_, t, n, k, name, price, im) in enumerate(row):
            x0 = lab + gap + c * (cw + gap)
            d.rounded_rectangle([x0, y0, x0 + cw, y0 + ch], 10, fill=CARD_E if eld else CARD,
                                outline=MINT if eld else (52, 62, 90), width=3 if eld else 1)
            big = im.resize((128, 128), Image.NEAREST)
            sheet.alpha_composite(big, (x0 + (cw - 128) // 2, y0 + 18))
            d.text((x0 + cw // 2, y0 + ch - 50), name, fill=(240, 236, 226), font=I.font(17), anchor='ma')
            ptxt = 'free' if price == 0 else f'{price:,} D'
            d.text((x0 + cw // 2, y0 + ch - 26), ('* ELDRITCH *  ' + ptxt) if eld else ptxt, fill=TIER_COL[tier], font=I.font(15), anchor='ma')
    sheet.save(os.path.join(OUT_DESIGN, f'shop_outfits_{slot}.png'))

LOOKS = [
    ('Head of Science', dict(skin='kelp_mint', hat='graduation_cap', top='lab_coat', face='round_glasses', hold='test_tube')),
    ('Deep Sea Captain', dict(skin='sky', hat='pirate_tricorn', top='captains_coat', face='moustache', hold='trident')),
    ('Eldritch Scholar', dict(skin='midnight', hat='crown_of_tentacles', top='robe_of_the_deep', face='third_eye', hold='lantern_of_the_deep')),
    ('Cosy Marking Night', dict(skin='peach', hat='bobble_hat', top='knitted_jumper', face='half_moon_specs', hold='mug_of_tea')),
    ('Halloween Wizard', dict(skin='pumpkin', hat='wizard_hat', top='cloak_of_stars', face='glowing_rune', hold='orbiting_moon')),
    ('Professor Tweed', dict(skin='coral', hat='flat_cap', top='tweed_jacket', face='monocle', hold='book')),
]

def dressed_up():
    sc, gap, top = 6, 24, 70
    cw = 32 * sc + 3 * gap
    sheet = Image.new('RGBA', (len(LOOKS) * cw + gap, top + 32 * sc + 112), BG + (255,))
    d = ImageDraw.Draw(sheet)
    d.text((gap, 20), 'Ulhu dressed up: six complete looks', fill=(240, 236, 226), font=I.font(30))
    names = {k: n for lst in (HATS, TOPS, FACES, HELD) for t, k, n, *_ in lst}
    names.update({k: n for t, k, n, p in SKIN_LIST})
    for i, (title, kw) in enumerate(LOOKS):
        x0 = gap + i * cw
        d.rounded_rectangle([x0, top, x0 + cw - gap, top + 32 * sc + 96], 10, fill=CARD, outline=(52, 62, 90))
        sheet.alpha_composite(dress(**kw).resize((32 * sc, 32 * sc), Image.NEAREST), (x0 + (cw - gap - 32 * sc) // 2, top + 6))
        d.text((x0 + (cw - gap) // 2, top + 32 * sc + 14), title, fill=GOLD, font=I.font(19), anchor='ma')
        parts = [names[kw['skin']].split(' (')[0], names[kw['hat']], names[kw['top']].split(' (')[0], names[kw['face']].split(' (')[0], names[kw['hold']]]
        for j, line in enumerate((parts[:2], parts[2:4], parts[4:])):
            d.text((x0 + (cw - gap) // 2, top + 32 * sc + 42 + j * 17), ', '.join(line), fill=(200, 205, 220), font=I.font(13), anchor='ma')
    sheet.save(os.path.join(OUT_DESIGN, 'ulhu_dressed_up.png'))


def main():
    os.makedirs(OUT_ITEMS, exist_ok=True)
    ents = items(); rows = []
    for slot, t, n, k, name, price, im in ents:
        im.save(os.path.join(OUT_ITEMS, f'{slot}_{t.lower()}_{n}_{k}.png'))
        rows.append({'id': f'{slot}_{k}', 'name': name, 'slot': slot, 'tier': t, 'price': price, 'lock': lock_for(t, k)})
    for slot in SLOT_TITLE: catalogue(slot, [e for e in ents if e[0] == slot])
    with open(os.path.join(OUT_DESIGN, 'shop_outfits.json'), 'w', encoding='utf-8') as f:
        json.dump(rows, f, indent=2)
    dressed_up()
    print('saved', len(rows), 'items')

if __name__ == '__main__':
    main()
