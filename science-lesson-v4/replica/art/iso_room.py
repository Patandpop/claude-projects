"""Corner (isometric) Study room: floor + left wall + right wall, with every zone filled.
python iso_room.py -> ../design/room_iso.png (x4) and ../design/room_iso_zones.png (numbered zones)
Original art, drawn from shapes. World design: ../design/world.md
"""
import math, os
from PIL import Image, ImageDraw
import cthulhu_pixel as C

W, H, S = 128, 116, 4
WALL = 46

def P(u, v, z=0):                      # floor coords u (right wall dir) v (left wall dir), height z
    return (64 + 2 * u - 2 * v, 52 + u + v - z)

def poly(d, pts, fill, outline=None):
    d.polygon([(round(x), round(y)) for x, y in pts], fill=fill, outline=outline)

def box(d, u0, v0, u1, v1, z0, z1, top, left, right, edge=(30, 30, 40)):
    poly(d, [P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], top, edge)
    poly(d, [P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)], left, edge)    # face v=v1 (front-left)
    poly(d, [P(u1, v0, z0), P(u1, v1, z0), P(u1, v1, z1), P(u1, v0, z1)], right, edge)   # face u=u1 (front-right)

LABELS = {1: (28, 27, 0), 2: (13, 21, 0), 3: (0, 20, 26), 4: (20, 0, 32), 5: (5, 0, 40), 6: (26, 21, 12),
          7: (3, 22, 15), 8: (12, 27, 24), 9: (28, 17, 14)}

def draw(zones=False):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 3 + 4: walls (left = striped wallpaper with dado rail, right = scale pattern)
    poly(d, [P(0, 0, WALL), P(0, 30, WALL), P(0, 30), P(0, 0)], (52, 104, 120))
    for v in range(0, 30, 4):
        poly(d, [P(0, v, WALL), P(0, v + 2, WALL), P(0, v + 2, 14), P(0, v, 14)], (60, 116, 132))
    poly(d, [P(0, 0, 14), P(0, 30, 14), P(0, 30), P(0, 0)], (42, 84, 98))
    d.line([P(0, 0, 14), P(0, 30, 14)], fill=(200, 160, 90))
    poly(d, [P(0, 0, WALL), P(30, 0, WALL), P(30, 0), P(0, 0)], (40, 86, 104))
    for u in range(1, 30, 3):
        for z in range(18, WALL - 2, 5):
            x, y = P(u + (1.5 if (z // 5) % 2 else 0), 0, z)
            d.arc([x - 2, y - 1, x + 2, y + 2], 0, 180, fill=(56, 108, 126))
    poly(d, [P(0, 0, 14), P(30, 0, 14), P(30, 0), P(0, 0)], (32, 70, 86))
    d.line([P(0, 0, 14), P(30, 0, 14)], fill=(200, 160, 90))
    for a, b in [(P(0, 0, WALL), P(0, 30, WALL)), (P(0, 0, WALL), P(30, 0, WALL)), (P(0, 0, WALL), P(0, 0))]:
        d.line([a, b], fill=(24, 44, 52))
    # 1: floor planks
    poly(d, [P(0, 0), P(30, 0), P(30, 30), P(0, 30)], (160, 112, 64))
    for v in range(0, 30, 3):
        poly(d, [P(0, v), P(30, v), P(30, v + 1.5), P(0, v + 1.5)], (146, 100, 56))
        j = 7 if (v // 3) % 2 else 15
        d.line([P(j, v), P(j, v + 3)], fill=(120, 80, 44))
    # 2: rug (spiral of diamonds)
    for k, col in enumerate([(92, 70, 140), (170, 226, 190), (92, 70, 140), (236, 190, 70), (120, 96, 170)]):
        poly(d, [P(11 + k, 11 + k), P(23 - k, 11 + k), P(23 - k, 23 - k), P(11 + k, 23 - k)], col)
    # 3: porthole window + 2 hangings on the left wall
    cx, cz, r = 10, 30, 6
    ring = [P(0, cx + r * 0.45 * math.cos(t), cz + r * math.sin(t)) for t in [i / 20 * 2 * math.pi for i in range(20)]]
    glass = [P(0, cx + (r - 1.5) * 0.45 * math.cos(t), cz + (r - 1.5) * math.sin(t)) for t in [i / 20 * 2 * math.pi for i in range(20)]]
    poly(d, ring, (214, 168, 70), (120, 84, 30)); poly(d, glass, (70, 150, 190))
    x, y = P(0, 9, 31); d.point([(x, y), (x + 1, y)], fill=(255, 214, 10))                # a fish swims past
    for v0, col in [(20, (236, 190, 70)), (25, (244, 140, 130))]:                          # pennants
        poly(d, [P(0, v0, 42), P(0, v0 + 3, 42), P(0, v0 + 1.5, 37)], col)
    # 4: right wall: picture + big slot (aquarium on a stand)
    poly(d, [P(21, 0, 44), P(28, 0, 44), P(28, 0, 36), P(21, 0, 36)], (120, 84, 40))
    poly(d, [P(22, 0, 43), P(27, 0, 43), P(27, 0, 37), P(22, 0, 37)], (236, 190, 70))
    box(d, 13, 0, 27, 5, 0, 12, (122, 82, 46), (98, 64, 34), (110, 72, 40))
    box(d, 13, 0, 27, 5, 12, 26, (150, 210, 235), (80, 150, 200), (96, 166, 214), (40, 70, 90))
    for u, z, c in [(17, 18, (255, 150, 60)), (22, 21, (255, 214, 10)), (25, 16, (240, 120, 160))]:
        x, y = P(u, 5, z); d.rectangle([x, y, x + 1, y], fill=c)
    for u in (15, 19, 24):
        x, y = P(u, 5, 13); d.line([(x, y), (x, y - 4)], fill=(60, 150, 90))
    # 5: back corner tall bookshelf (books on its front face)
    box(d, 2, 0, 9, 4, 0, 34, (130, 88, 50), (104, 70, 38), (116, 78, 44))
    for z0 in (4, 13, 22):
        for i, col in enumerate([(200, 70, 70), (70, 120, 200), (236, 190, 70), (90, 160, 100), (170, 110, 200), (220, 140, 80)]):
            u = 2.5 + i
            poly(d, [P(u, 4, z0), P(u + 0.9, 4, z0), P(u + 0.9, 4, z0 + 7), P(u, 4, z0 + 7)], col)
    # 7: pet home (wire cage with a snail) against the left wall
    box(d, 0, 19, 6, 26, 0, 1, (90, 90, 100), (70, 70, 80), (80, 80, 90))
    x, y = P(3, 23, 1); d.ellipse([x - 2, y - 3, x + 1, y], fill=(220, 150, 90)); d.point((x + 2, y - 1), fill=(240, 220, 160))
    for v in range(19, 27, 1):
        d.line([P(6, v, 1), P(6, v, 11)], fill=(170, 175, 185))
    for u in range(0, 7, 1):
        d.line([P(u, 26, 1), P(u, 26, 11)], fill=(170, 175, 185))
    poly(d, [P(0, 19, 11), P(6, 19, 11), P(6, 26, 11), P(0, 26, 11)], (150, 155, 165))
    # 6: furniture: armchair (left), little desk (front right)
    box(d, 1, 8, 7, 14, 0, 5, (120, 160, 110), (90, 130, 84), (100, 142, 92))
    box(d, 1, 8, 3, 14, 5, 12, (120, 160, 110), (90, 130, 84), (100, 142, 92))
    box(d, 24, 14, 29, 22, 0, 9, (150, 104, 60), (120, 82, 46), (134, 92, 52))
    # 9: small props on the desk: mug + book stack
    x, y = P(26, 16, 9); d.rectangle([x - 1, y - 3, x + 1, y], fill=(240, 240, 240)); d.point((x + 2, y - 2), fill=(240, 240, 240))
    x, y = P(27, 20, 9); d.rectangle([x - 3, y - 2, x + 2, y], fill=(200, 70, 70)); d.rectangle([x - 2, y - 4, x + 2, y - 2], fill=(70, 120, 200))
    # 8: jellyfish standing lamp (front left)
    x, y = P(12, 27); d.line([(x, y), (x, y - 20)], fill=(200, 160, 90))
    d.pieslice([x - 5, y - 26, x + 5, y - 16], 180, 360, fill=(245, 170, 210))
    for i in (-3, -1, 1, 3): d.line([(x + i, y - 21), (x + i, y - 17 + abs(i) % 2)], fill=(245, 170, 210))
    # the Cthulhu (Kelp Mint, idle) standing on the rug
    spr = C.render('idle', 1)
    fx, fy = P(17, 17)
    img.alpha_composite(spr, (fx - 16, fy - 31))
    return img

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'design')
    for z, name in [(False, 'room_iso.png'), (True, 'room_iso_zones.png')]:
        im = draw(z)
        bg = Image.new('RGBA', (W + 8, H + 8), (17, 24, 39, 255)); bg.alpha_composite(im, (4, 4))
        big = bg.resize(((W + 8) * S, (H + 8) * S), Image.NEAREST)
        if z:
            dd = ImageDraw.Draw(big)
            for n, (u, v, h) in LABELS.items():
                x, y = P(u, v, h); x, y = (x + 4) * S, (y + 4) * S
                dd.ellipse([x - 13, y - 13, x + 13, y + 13], fill=(255, 214, 10), outline=(20, 20, 30), width=2)
                dd.text((x, y), str(n), fill=(20, 20, 30), font_size=18, anchor='mm')
        big.save(os.path.join(out, name))
    print('saved room_iso.png, room_iso_zones.png')
