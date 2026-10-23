"""Chibi pixel Cthulhu for Patryk's habit game: original art, drawn from shapes (no reference copied).
python cthulhu_pixel.py -> sprites/ (32x32 per mood, plus x12 previews) and sheet.png
"""
import math, os
from PIL import Image, ImageDraw

N = 32
PAL = {
    'o': (30, 58, 52), 'b': (95, 191, 143), 's': (62, 148, 112), 'h': (155, 227, 181),
    'l': (207, 239, 192), 'w': (122, 92, 168), 'W': (78, 58, 117), 'e': (255, 255, 255),
    'p': (27, 27, 47), 'k': (242, 140, 160), 't': (120, 200, 255), 'g': (255, 214, 10),
}

def inell(x, y, cx, cy, rx, ry):
    return ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1

def base():
    g = [[None] * N for _ in range(N)]
    def put(x, y, c):
        if 0 <= x < N and 0 <= y < N: g[y][x] = c
    # wings (behind): scalloped bat wings
    for y in range(6, 25):
        for x in range(N):
            d = abs(x + .5 - 16)                       # distance from the middle
            if not 6.5 < d < 15: continue
            top = 23 - (d - 6.5) * 1.75                # rises to a point at the outer tip
            k = (d - 6.5) % 3                          # scallops along the bottom edge
            bot = 24 - (d - 6.5) * 0.45 - (1.5 if k < 1.2 else 0)
            if top <= y <= bot:
                put(x, y, 'W' if (y > bot - 1.5 or d > 13.5) else 'w')
            if abs(d - 10.5) < .5 and top + 1 <= y <= bot - 1: put(x, y, 'W')   # wing bone
    # body
    for y in range(N):
        for x in range(N):
            if inell(x, y, 16, 24, 7.2, 5.5): put(x, y, 's' if x > 18 or y > 27 else 'b')
            if inell(x, y, 16, 25.5, 4, 3.2): put(x, y, 'l')
    # feet + arm nubs
    for x, y in [(11, 29), (12, 29), (13, 29), (19, 29), (20, 29), (21, 29), (8, 23), (8, 24), (24, 23), (24, 24)]:
        put(x, y, 's')
    # head (octopus dome)
    for y in range(N):
        for x in range(N):
            if inell(x, y, 16, 11, 10.5, 9): put(x, y, 's' if (x > 21 and y > 8) or y > 17 else 'b')
    for x, y in [(10, 5), (11, 4), (12, 4), (11, 5), (10, 6)]: put(x, y, 'h')   # shine
    # face tentacles, each wiggles and curls at the tip
    for i, tx in enumerate((10, 13, 17, 20)):
        for y in range(15, 24):
            off = round(math.sin((y - 15) / 2.2 + i) * 0.8)
            put(tx + off, y, 'h' if y > 21 else 'b'); put(tx + off + 1, y, 's')
            if y > 16: put(tx + off + 2, y, 'o')                  # dark gap so each tentacle reads
        put(tx + (2 if i % 2 else -1), 24, 'h')                   # curled tip
    return g

def outline(g):
    out = [row[:] for row in g]
    for y in range(N):
        for x in range(N):
            if g[y][x] is None and any(0 <= x + dx < N and 0 <= y + dy < N and g[y + dy][x + dx] not in (None,)
                                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[y][x] = 'o'
    return out

def face(g, mood):
    def put(x, y, c): g[y][x] = c
    for ex in (9, 18):                                    # eyes, 5 wide
        if mood in ('happy', 'proud'):                    # ^ ^
            for x, y in [(ex, 11), (ex + 1, 10), (ex + 2, 9), (ex + 3, 10), (ex + 4, 11)]: put(x, y, 'p')
        elif mood == 'sleepy':                            # closed, a little droopy
            for x in range(ex, ex + 5): put(x, 11, 'p')
            put(ex, 12, 'p'); put(ex + 4, 12, 'p')
        else:
            for y in range(7, 13):
                for x in range(ex, ex + 5): put(x, y, 'e')
            for y in range(8 if mood != 'sad' else 9, 13):
                for x in range(ex + 1, ex + 5): put(x, y, 'p')
            put(ex + 2, 8 if mood != 'sad' else 9, 'e'); put(ex + 3, 9 if mood != 'sad' else 10, 'e')  # glints
            if mood == 'sad':                             # worried brows
                put(ex, 5, 'o'); put(ex + 1, 5, 'o'); put(ex + 2, 6, 'o') if ex < 16 else None
                if ex > 16: put(ex + 2, 6, 'o'); put(ex + 3, 5, 'o'); put(ex + 4, 5, 'o')
    for x, y in [(7, 13), (8, 13), (24, 13), (25, 13)]: put(x, y, 'k')   # blush
    if mood == 'sad':
        put(9, 13, 't'); put(9, 14, 't'); put(8, 15, 't')
    return g

def extras(img, mood, scale):
    d = ImageDraw.Draw(img)
    if mood == 'sleepy':
        for x, y, s in [(24, 2, 5), (28, 0, 3)]:        # pixel "Z"s
            for i in range(s):
                for px, py in [(x + i, y), (x + i, y + s - 1), (x + s - 1 - i, y + i)]:
                    d.rectangle([px * scale, py * scale, (px + 1) * scale - 1, (py + 1) * scale - 1], fill=PAL['W'])
    if mood == 'proud':
        for x, y in [(4, 4), (27, 6), (3, 15)]:
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                d.rectangle([(x + dx) * scale, (y + dy) * scale, (x + dx + 1) * scale - 1, (y + dy + 1) * scale - 1], fill=PAL['g'])

def render(mood, scale):
    g = face(outline(base()), mood)
    img = Image.new('RGBA', (N * scale, N * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(N):
        for x in range(N):
            if g[y][x]: d.rectangle([x * scale, y * scale, (x + 1) * scale - 1, (y + 1) * scale - 1], fill=PAL[g[y][x]])
    extras(img, mood, scale)
    return img

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(os.path.join(here, 'sprites'), exist_ok=True)
    moods = ['idle', 'happy', 'proud', 'sad', 'sleepy']
    sheet = Image.new('RGBA', (len(moods) * 32 * 8 + (len(moods) + 1) * 24, 32 * 8 + 48), (244, 239, 226, 255))
    for i, m in enumerate(moods):
        render(m, 1).save(os.path.join(here, 'sprites', f'cthulhu_{m}.png'))
        big = render(m, 8)
        big.save(os.path.join(here, 'sprites', f'cthulhu_{m}_x8.png'))
        sheet.alpha_composite(big, (24 + i * (32 * 8 + 24), 24))
    sheet.save(os.path.join(here, 'sheet.png'))
    print('saved', len(moods), 'moods')
