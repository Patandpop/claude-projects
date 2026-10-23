"""Room items and the Eldritch Doubloon for Patryk's habit game: original art, drawn from shapes.
python items_pixel.py -> items/ (1x and x8 previews), items_sheet.png, and ../design/room_mockup.png

Same house style as cthulhu_pixel.py: chunky shapes, a dark outline added round the outside,
light from the top left, no anti-aliasing. Every image is scaled by whole numbers only (NEAREST).
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cthulhu_pixel  # read only: we only call render()

# one shared item palette (tokens.md "Room world" lists these)
PAL = {
    'o': (43, 31, 46),                                           # item outline (warm dark plum)
    'a': (201, 139, 85), 'm': (160, 102, 61), 'd': (116, 69, 42),  # wood light / mid / dark
    'R': (217, 83, 79), 'B': (79, 134, 198), 'Y': (242, 193, 78), 'G': (95, 191, 143), 'P': (122, 92, 168),
    'k': (63, 166, 107), 'K': (44, 122, 78), 'q': (127, 211, 154),   # kelp
    't': (200, 100, 59), 'T': (143, 65, 40), 'u': (224, 138, 92),    # terracotta pot
    'w': (95, 184, 208), 'W': (58, 141, 168), 'v': (168, 226, 238), 'x': (232, 248, 252),  # water + glass
    'f': (242, 140, 56), 'F': (196, 96, 30), 's': (232, 201, 135),   # fish, sand
    'j': (245, 184, 216), 'J': (196, 127, 176), 'c': (255, 241, 184), # jelly lamp shade + glow
    'b': (201, 163, 74), 'n': (138, 107, 37),                         # brass
    'e': (62, 156, 143), 'E': (40, 110, 100), 'r': (244, 235, 208), 'z': (214, 201, 168),  # rug teal + cream
    'p': (247, 243, 232), 'h': (205, 196, 176),                       # paper
    'g': (250, 187, 46), 'l': (255, 226, 138), 'S': (217, 147, 15), 'D': (138, 90, 0),  # coin gold
    'C': (255, 244, 204), 'U': (78, 58, 117), 'Z': (255, 255, 255),   # coin eye cream, pupil, sparkle
}


class Grid:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [[None] * w for _ in range(h)]

    def put(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h: self.g[y][x] = c

    def rect(self, x0, y0, x1, y1, c):          # inclusive corners
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): self.put(x, y, c)

    def ell(self, cx, cy, rx, ry, c, test=None):
        for y in range(self.h):
            for x in range(self.w):
                if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1 and (test is None or test(x, y)):
                    self.put(x, y, c)

    def ascii(self, x0, y0, rows):
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch != '.': self.put(x0 + dx, y0 + dy, ch)

    def outline(self, c='o'):
        src = [r[:] for r in self.g]
        for y in range(self.h):
            for x in range(self.w):
                if src[y][x] is None and any(0 <= x + dx < self.w and 0 <= y + dy < self.h and src[y + dy][x + dx]
                                             for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    self.g[y][x] = c
        return self

    def image(self, scale=1, pal=PAL):
        img = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        px = img.load()
        for y in range(self.h):
            for x in range(self.w):
                if self.g[y][x]: px[x, y] = pal[self.g[y][x]] + (255,)
        return img.resize((self.w * scale, self.h * scale), Image.NEAREST) if scale > 1 else img


# ---------------------------------------------------------------- the coin (16x16)
def doubloon():
    g = Grid(16, 16)
    for y in range(16):
        for x in range(16):
            d = math.hypot(x + .5 - 8, y + .5 - 8)
            if d <= 7.2:
                if d > 5.9: c = 'S' if (x + y) > 15 else 'g'          # rim: shaded bottom right
                elif (x + y) < 11 and d > 4.2: c = 'l'                 # inner highlight arc
                elif (x - y) > 3 or (x + y) > 19: c = 'S'
                else: c = 'g'
                g.put(x, y, c)
    for y in range(16):                                               # stamped ring inside the rim
        for x in range(16):
            if abs(math.hypot(x + .5 - 8, y + .5 - 8) - 5.6) < .45: g.put(x, y, 'D' if (x + y) > 13 else 'S')
    g.ascii(4, 6, [                                                   # the eldritch eye stamped on it
        "..DDDD..",
        ".DCCUCD.",
        "DCCUUCCD",
        ".DCCUCD.",
        "..DDDD..",
    ])
    g.put(4, 4, 'Z'); g.put(5, 3, 'Z')                                # glint
    return g.outline('D')


# ---------------------------------------------------------------- room items (32x32)
def bookshelf():
    g = Grid(32, 32)
    g.rect(5, 5, 26, 30, 'm')                                         # carcass
    g.rect(5, 5, 6, 30, 'a'); g.rect(25, 5, 26, 30, 'd')              # lit left side, shaded right
    g.rect(5, 5, 26, 6, 'a')                                          # top board
    spines = 'RBYGPRYBGP'
    for row, base_y in enumerate((14, 22, 29)):
        g.rect(7, base_y - 6, 24, base_y, 'd')                        # shelf hollow
        x = 7
        i = row * 3
        while x < 24:
            w = 2 if (i % 3) else 3
            h = 6 - (i % 2)
            if row == 1 and x > 18: break                             # gap for the shell
            c = spines[i % len(spines)]
            g.rect(x, base_y - h + 1, min(x + w - 1, 24), base_y, c)
            g.put(x, base_y - h + 1, 'p') if w == 3 else None         # tiny label
            x += w + (1 if i % 4 == 0 else 0)
            i += 1
        g.rect(5, base_y + 1, 26, base_y + 1, 'a') if base_y < 29 else None  # shelf board
    g.ascii(19, 18, ["..jj.", ".jJjj", "jjJjJ", "JjjjJ"])            # a pink shell on the middle shelf
    g.ascii(9, 1, ["..ww", ".wvw", "wwww", ".PP."])                   # a little sea-glass bottle on top
    g.rect(8, 4, 12, 4, 'W')
    return g.outline()


def kelp():
    g = Grid(32, 32)
    for i, (bx, ph, top) in enumerate(((11, 0, 4), (16, 1.6, 1), (20, 3.1, 6))):
        for y in range(top, 22):
            off = round(math.sin((y + ph * 3) / 2.6) * 1.6)
            g.put(bx + off, y, 'k'); g.put(bx + off + 1, y, 'K' if i != 1 else 'k')
            g.put(bx + off - 1, y, 'q' if y % 3 == 0 else 'k')
            if y % 5 == i and y < 19: g.put(bx + off + 2, y, 'K'); g.put(bx + off + 3, y - 1, 'K')  # little leaves
    g.rect(9, 21, 23, 22, 'T')                                        # pot rim
    g.rect(9, 21, 23, 21, 'u')
    for y in range(23, 31):                                           # tapered pot
        inset = (y - 23) // 3
        g.rect(10 + inset, y, 22 - inset, y, 't')
        g.put(22 - inset, y, 'T'); g.put(21 - inset, y, 'T')
        g.put(10 + inset + 1, y, 'u')
    for bx, by in ((6, 6), (25, 3), (5, 12)):                         # bubbles
        g.ascii(bx - 1, by - 1, [".v.", "vxv", ".v."])
    return g.outline()


def rug():
    g = Grid(32, 32)
    cx, cy = 16, 25
    g.ell(cx, cy, 14.5, 5.2, 'P')
    g.ell(cx, cy, 12.5, 4.0, 'r')
    g.ell(cx, cy, 10.5, 3.0, 'e')
    g.ell(cx, cy, 7, 1.8, 'r')
    g.ell(cx, cy, 4, 1.0, 'E')
    for x in range(4, 29, 3):                                         # stitched dots on the purple band
        g.put(x, 21 if 8 < x < 24 else 22, 'j')
    g.outline()
    for x in range(4, 29, 2):                                         # fringe at the front edge
        g.put(x, 31, 'z')
    return g


def jelly_lamp():
    g = Grid(32, 32)
    g.ell(16, 10, 9.5, 7.5, 'j', test=lambda x, y: y <= 11)           # dome shade
    g.ell(16, 10, 6.5, 5, 'c', test=lambda x, y: y <= 11)             # warm glow inside
    g.rect(7, 11, 25, 12, 'J')                                        # scalloped rim
    for x in range(7, 26, 3): g.put(x, 13, 'J')
    g.ascii(10, 4, ["jjj", "jx.", ])                                  # shade shine
    for i, x in enumerate((10, 14, 18, 22)):                          # dangly jelly tentacles
        for y in range(14, 19 + (i % 2) * 2):
            g.put(x + (1 if (y // 2) % 2 else 0), y, 'j')
    g.rect(15, 13, 16, 27, 'b'); g.put(16, 14, 'n'); g.rect(16, 15, 16, 27, 'n')   # brass pole
    g.rect(11, 28, 21, 29, 'b'); g.rect(10, 30, 22, 30, 'n')          # base
    g.rect(12, 28, 14, 28, 'l')
    return g.outline()


def fish_tank():
    g = Grid(32, 32)
    g.rect(3, 9, 28, 27, 'w')                                         # water
    g.rect(3, 9, 28, 10, 'v')                                         # surface
    g.rect(3, 23, 28, 27, 's')                                        # sand
    for x in range(4, 28, 4): g.put(x, 24, 'Y')
    for y in range(13, 24):                                           # weed
        g.put(7 + (1 if y % 4 < 2 else 0), y, 'k'); g.put(24 - (1 if y % 4 < 2 else 0), y + 2 if y < 22 else y, 'K')
    g.ascii(13, 14, [                                                 # round little fish
        "..ff..f",
        ".fffffF",
        "fZpfff.",
        ".fffffF",
        "..ff..F",
    ])
    g.put(14, 16, 'o')
    for bx, by in ((19, 11), (21, 12)): g.put(bx, by, 'x')
    g.rect(3, 11, 3, 22, 'x')                                         # glass glint, left edge
    g.rect(27, 11, 28, 22, 'W')                                       # shaded right edge
    g.rect(1, 7, 30, 8, 'd')                                          # wooden lid
    g.rect(1, 7, 30, 7, 'm')
    g.rect(1, 28, 30, 30, 'd'); g.rect(1, 28, 30, 28, 'm')            # wooden stand
    return g.outline()


def teachers_desk():
    g = Grid(32, 32)
    g.rect(1, 17, 30, 19, 'a')                                        # desk top
    g.rect(1, 19, 30, 19, 'm')
    g.rect(2, 20, 12, 30, 'm'); g.rect(12, 20, 12, 30, 'd')           # drawer pedestal
    for y in (23, 27): g.rect(3, y, 11, y, 'd'); g.rect(6, y - 2, 8, y - 2, 'b')  # drawers + brass pulls
    g.rect(27, 20, 29, 30, 'm'); g.rect(29, 20, 29, 30, 'd')          # right leg
    g.rect(13, 20, 26, 21, 'd')                                       # modesty panel
    for i in range(4):                                                # pile of marking
        g.rect(3 + (i % 2), 15 - i * 2, 13 + (i % 2), 16 - i * 2, 'p')
        g.rect(3 + (i % 2), 16 - i * 2, 13 + (i % 2), 16 - i * 2, 'h')
    g.put(5, 9, 'R'); g.put(6, 9, 'R'); g.put(7, 10, 'R')             # red tick on the top sheet
    g.put(8, 9, 'R'); g.put(9, 8, 'R')
    g.ascii(16, 10, [                                                 # apple
        "..K..",
        ".RRR.",
        "RZRRR",
        "RRRRR",
        ".RRR.",
        "..R..",
    ])
    g.rect(16, 15, 20, 16, 'R'); g.put(17, 15, 'R')
    g.rect(23, 12, 27, 16, 'B'); g.rect(27, 12, 27, 16, 'W')          # pen mug
    g.rect(23, 12, 27, 12, 'v')
    g.rect(24, 8, 24, 11, 'R'); g.rect(26, 7, 26, 11, 'G')            # pens
    return g.outline()


ITEMS = [('bookshelf', bookshelf), ('kelp_plant', kelp), ('spiral_rug', rug),
         ('jelly_lamp', jelly_lamp), ('fish_tank', fish_tank), ('teachers_desk', teachers_desk)]


# ---------------------------------------------------------------- the room (S01) at 1x
ROOM = {'wall': (46, 74, 92), 'wall_hi': (61, 95, 115), 'wall_lo': (34, 56, 74), 'floor': (138, 90, 60),
        'floor_hi': (168, 113, 75), 'floor_lo': (107, 68, 48), 'trim': (74, 50, 38), 'frame': (43, 31, 46),
        'roof': (122, 92, 168), 'roof_lo': (78, 58, 117), 'sea': (79, 163, 184), 'sea_hi': (150, 214, 226)}


def room_1x():
    W, H = 128, 148
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    px = lambda x0, y0, x1, y1, c: d.rectangle([x0, y0, x1, y1], fill=c)
    # roof: a purple gable (wing colours) over the dollhouse box, 4 px across per row
    for y in range(2, 19):
        half = (y - 2) * 4
        px(max(0, 63 - half), y, min(127, 64 + half), y, ROOM['frame'])
        if y > 4:
            ih = (y - 5) * 4
            px(max(2, 63 - ih), y, min(125, 64 + ih), y, ROOM['roof'] if y < 15 else ROOM['roof_lo'])
    for y in range(8, 16, 3):                                         # roof tile scallops
        ih = (y - 5) * 4
        for x in range(63 - ih + 3, 64 + ih - 2, 4): px(x, y, x + 1, y, ROOM['roof_lo'])
    px(60, 8, 67, 15, ROOM['frame']); px(61, 9, 66, 14, ROOM['sea']); px(62, 10, 63, 11, ROOM['sea_hi'])  # attic porthole
    # box frame
    px(0, 18, 127, 147, ROOM['frame'])
    px(3, 21, 124, 144, ROOM['wall'])
    # back wall with a soft scale pattern (sea-cave wallpaper)
    for y in range(24, 100, 6):
        for x in range(6 + (y // 6 % 2) * 4, 124, 8):
            px(x, y, x + 2, y, ROOM['wall_hi'])
    px(3, 21, 124, 23, ROOM['wall_lo'])                                # shadow under the ceiling
    # side walls in slight perspective (the dollhouse cutaway)
    for y in range(21, 145):
        k = max(0, (y - 100)) // 5
        px(3, y, 3 + 4 + k, y, ROOM['wall_lo']) if y < 100 else None
    # porthole window on the back wall
    cx, cy, r = 40, 50, 13
    d.ellipse([cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2], fill=ROOM['frame'])
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(201, 163, 74))
    d.ellipse([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], fill=ROOM['sea'])
    px(cx - 6, cy - 6, cx - 3, cy - 5, ROOM['sea_hi']); px(cx - 6, cy - 4, cx - 5, cy - 3, ROOM['sea_hi'])
    for bx_, by_ in ((cx + 3, cy + 4), (cx + 5, cy), (cx + 2, cy - 3)):  # bubbles rising outside
        px(bx_, by_, bx_ + 1, by_ + 1, ROOM['sea_hi'])
    # pennant string on the wall
    for i, c in enumerate([(217, 83, 79), (242, 193, 78), (95, 191, 143), (79, 134, 198), (245, 184, 216)]):
        x = 70 + i * 10
        px(x, 30 + (1 if i % 2 else 0), x + 6, 30 + (1 if i % 2 else 0), ROOM['trim'])
        for k in range(4): px(x + 1 + k // 2, 31 + k, x + 5 - k // 2, 31 + k, c)
    # skirting + floor planks
    px(3, 100, 124, 102, ROOM['trim'])
    px(3, 103, 124, 144, ROOM['floor'])
    for y in range(103, 145, 7):
        px(3, y, 124, y, ROOM['floor_lo'])
        for x in range(10 + (y // 7 % 3) * 13, 124, 38): px(x, y + 1, x, y + 6, ROOM['floor_lo'])
    px(3, 103, 124, 103, ROOM['floor_hi'])
    # front sill of the dollhouse
    px(0, 145, 127, 147, ROOM['frame'])
    return img


def place(room, item, x, bottom):
    room.alpha_composite(item, (x, bottom - item.height))


def build_room():
    room = room_1x()
    it = {n: f().image() for n, f in ITEMS}
    place(room, it['bookshelf'], 6, 106)
    place(room, it['jelly_lamp'], 34, 106)
    place(room, it['fish_tank'], 92, 106)                             # back row, on its own stand
    place(room, it['teachers_desk'], 92, 141)                          # front row
    place(room, it['spiral_rug'], 46, 142)
    place(room, it['kelp_plant'], 4, 143)
    creature = cthulhu_pixel.render('idle', 1)
    place(room, creature, 47, 137)
    return room


# ---------------------------------------------------------------- phone mock-up of S01 (390 x 844)
UI = {'bar': '#0A0F1E', 'bg': '#0E1424', 'panel': '#161E33', 'panel2': '#1C2540', 'line': '#2A3555',
      'ink': '#E6EAF5', 'muted': '#98A2BC', 'gold': '#FABB2E', 'navy': '#0D1B5E', 'hp': '#EF5350',
      'xp': '#B49CFF', 'track': '#0A0F1E', 'blue': '#64B5F6', 'green': '#66BB6A', 'bubble': '#FFF8E7'}


def font(size, bold=False):
    for name in (('GOTHICB.TTF' if bold else 'GOTHIC.TTF'), ('segoeuib.ttf' if bold else 'segoeui.ttf')):
        try: return ImageFont.truetype(os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts', name), size)
        except OSError: pass
    return ImageFont.load_default()


def pixel_bar(d, x, y, w, h, frac, fill, track, edge):
    """Chunky bar with stepped (pixel) corners, 2px steps, so it matches the room."""
    d.rectangle([x + 2, y, x + w - 3, y + h - 1], fill=edge); d.rectangle([x, y + 2, x + w - 1, y + h - 3], fill=edge)
    d.rectangle([x + 2, y + 2, x + w - 3, y + h - 3], fill=track)
    fw = int((w - 4) * frac)
    if fw > 0:
        d.rectangle([x + 2, y + 2, x + 1 + fw, y + h - 3], fill=fill)
        d.rectangle([x + 2, y + 2, x + 1 + fw, y + 3], fill=tuple(min(255, c + 50) for c in Image.new('RGB', (1, 1), fill).getpixel((0, 0))))


def heart(img, x, y, s, c):
    rows = [".hh.hh.", "hhhhhhh", "hhhhhhh", ".hhhhh.", "..hhh..", "...h..."]
    g = Grid(7, 6); g.ascii(0, 0, rows)
    img.alpha_composite(g.image(s, {'h': Image.new('RGB', (1, 1), c).getpixel((0, 0))}), (x, y))


def star(img, x, y, s, c):
    g = Grid(7, 7); g.ascii(0, 0, ["...h...", "..hhh..", "hhhhhhh", ".hhhhh.", ".hh.hh.", "hh...hh", "......."])
    img.alpha_composite(g.image(s, {'h': Image.new('RGB', (1, 1), c).getpixel((0, 0))}), (x, y))


def rounded(d, box, r, fill, outline=None):
    d.rounded_rectangle(box, r, fill=fill, outline=outline, width=1)


def mockup(path):
    W, H = 390, 844
    img = Image.new('RGBA', (W, H), UI['bg'])
    d = ImageDraw.Draw(img)
    # planner top bar
    d.rectangle([0, 0, W, 47], fill=UI['bar']); d.line([0, 47, W, 47], fill=UI['line'])
    d.text((16, 13), 'Planner', font=font(18, True), fill=UI['gold'])
    for i, (lab, on) in enumerate((('Today', False), ('Game', True), ('More', False))):
        x = 132 + i * 80
        rounded(d, [x, 9, x + 70, 38], 6, (60, 48, 26) if on else UI['bar'], UI['gold'] if on else '#3A4466')
        tw = d.textlength(lab, font=font(13, on))
        d.text((x + 35 - tw / 2, 15), lab, font=font(13, on), fill='#FFFFFF')
    # HUD: coins, level, bars
    rounded(d, [16, 58, W - 16, 140], 10, UI['panel'], UI['line'])
    img.alpha_composite(doubloon().image(2), (28, 68))
    d.text((66, 70), '1,284', font=font(22, True), fill=UI['gold'])
    d.text((66, 96), 'Eldritch Doubloons', font=font(11), fill=UI['muted'])
    rounded(d, [W - 94, 68, W - 28, 92], 12, UI['gold'])
    d.text((W - 83, 71), 'Lv 7', font=font(14, True), fill=UI['navy'])
    heart(img, 28, 116, 2, UI['hp']); pixel_bar(d, 48, 114, 92, 16, 0.8, UI['hp'], UI['track'], '#05070F')
    star(img, 196, 115, 2, UI['xp']); pixel_bar(d, 214, 114, 80, 16, 0.55, UI['xp'], UI['track'], '#05070F')
    d.text((146, 115), '40/50', font=font(11, True), fill=UI['ink'])
    d.text((300, 115), '330/600', font=font(11, True), fill=UI['ink'])
    # the room, full bleed at 3x (128 logical px -> 384), 3px either side
    room = build_room().resize((128 * 3, 148 * 3), Image.NEAREST)
    ry = 150
    img.alpha_composite(room, (3, ry))
    # reaction bubble from the creature
    bx, by = 150, ry + 58 * 3
    rounded(d, [bx, by, bx + 140, by + 40], 8, UI['bubble'], '#2B1F2E')
    d.polygon([(bx + 34, by + 40), (bx + 46, by + 40), (bx + 44, by + 58)], fill=UI['bubble'], outline='#2B1F2E')
    d.line([bx + 35, by + 40, bx + 45, by + 40], fill=UI['bubble'], width=1)
    img.alpha_composite(doubloon().image(1), (bx + 10, by + 12))
    d.text((bx + 30, by + 10), '+12  Lesson built', font=font(12, True), fill='#2B1F2E')
    # Shop / Decorate buttons (planner primary + secondary)
    y = ry + 148 * 3 + 12
    rounded(d, [16, y, 189, y + 44], 6, UI['gold'])
    tw = d.textlength('Shop', font=font(15, True)); d.text((102 - tw / 2, y + 12), 'Shop', font=font(15, True), fill=UI['navy'])
    rounded(d, [201, y, W - 16, y + 44], 6, UI['panel2'], UI['line'])
    tw = d.textlength('Decorate', font=font(15)); d.text((288 - tw / 2, y + 12), 'Decorate', font=font(15), fill=UI['ink'])
    # top of S02 Today's goals underneath
    y += 60
    d.text((16, y), "Today's goals", font=font(18, True), fill=UI['gold'])
    d.text((W - 16 - d.textlength('3 of 5 done', font=font(12)), y + 5), '3 of 5 done', font=font(12), fill=UI['muted'])
    y += 30
    for name, val, done, auto in (('Send the order sheet', UI['blue'], True, True), ('Mark 10S2 books', UI['hp'], False, False)):
        rounded(d, [16, y, W - 16, y + 48], 8, UI['panel2'], UI['line'])
        d.rectangle([17, y + 1, 21, y + 47], fill=val)
        rounded(d, [32, y + 12, 56, y + 36], 5, UI['green'] if done else UI['panel'], UI['green'] if done else '#6B7799')
        if done: d.line([37, y + 24, 42, y + 29, 51, y + 18], fill=UI['bg'], width=3)
        d.text((68, y + 9), name, font=font(14, True), fill=UI['ink'])
        d.text((68, y + 28), 'auto-ticked from the planner' if auto else 'work  ·  medium', font=font(11), fill=UI['muted'])
        y += 56
    img.convert('RGB').save(path)


if __name__ == '__main__':
    out = os.path.join(HERE, 'items'); os.makedirs(out, exist_ok=True)
    tiles = [('eldritch_doubloon', doubloon())] + [(n, f()) for n, f in ITEMS]
    for n, g in tiles:
        g.image(1).save(os.path.join(out, n + '.png'))
        g.image(8 if g.w == 32 else 16).save(os.path.join(out, n + '_x8.png'))   # previews all 256 px
    sheet = Image.new('RGBA', (len(tiles) * 256 + (len(tiles) + 1) * 24, 256 + 48), (244, 239, 226, 255))
    for i, (n, g) in enumerate(tiles):
        sheet.alpha_composite(g.image(8 if g.w == 32 else 16), (24 + i * 280, 24))
    sheet.save(os.path.join(HERE, 'items_sheet.png'))
    design = os.path.join(HERE, '..', 'design'); os.makedirs(design, exist_ok=True)
    mockup(os.path.join(design, 'room_mockup.png'))
    print('saved coin +', len(ITEMS), 'items, items_sheet.png, design/room_mockup.png')
