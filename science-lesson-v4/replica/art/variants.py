"""Five colour/size/face variants of the chibi Cthulhu, normal (idle) face. python variants.py -> variants.png"""
import os
from PIL import Image, ImageDraw
import cthulhu_pixel as C

BASE_PAL = dict(C.PAL, **C.TEAL_PAL)
BASE_SHAPE = {'head_rx': 10.5, 'head_ry': 9, 'body_rx': 7.2, 'body_ry': 5.5}   # round-1 base (teal)
VARIANTS = [
    ('Original', {}, {}, None),
    ('Abyss Blue', {'b': (88, 150, 222), 's': (56, 106, 176), 'h': (160, 205, 245), 'l': (214, 232, 250),
                    'w': (240, 150, 70), 'W': (196, 100, 40), 'o': (24, 36, 70), 'k': (250, 160, 170)},
     {'head_rx': 11, 'head_ry': 9.5}, None),                                       # bigger head
    ('Coral Pink', {'b': (240, 140, 160), 's': (204, 96, 124), 'h': (255, 200, 210), 'l': (255, 230, 220),
                    'w': (70, 170, 160), 'W': (40, 120, 116), 'o': (80, 30, 50), 'k': (255, 90, 120)},
     {'body_rx': 8, 'body_ry': 6}, 'freckles'),                                    # chubbier, freckles
    ('Midnight', {'b': (92, 74, 150), 's': (62, 48, 110), 'h': (150, 130, 210), 'l': (190, 175, 230),
                  'w': (230, 180, 40), 'W': (170, 120, 20), 'o': (20, 14, 40), 'e': (255, 230, 90), 'p': (40, 20, 10),
                  'k': (200, 120, 200)}, {}, 'glow'),                              # glowing gold eyes
    ('Kelp Mint', {'b': (170, 226, 190), 's': (120, 190, 150), 'h': (225, 250, 230), 'l': (250, 245, 215),
                   'w': (90, 140, 90), 'W': (60, 100, 60), 'o': (40, 70, 50)},
     {'head_rx': 9.5, 'head_ry': 8.5, 'body_rx': 6.5, 'body_ry': 5}, 'sprout'),   # small baby, sprout on head
    ('Lava', {'b': (238, 110, 70), 's': (190, 70, 44), 'h': (255, 180, 130), 'l': (255, 226, 170),
              'w': (60, 50, 60), 'W': (36, 30, 40), 'o': (60, 20, 14), 'k': (255, 210, 90)},
     {'head_rx': 11, 'head_ry': 9}, 'horns'),                                      # little horns
]

def extra(img, kind, s):
    d = ImageDraw.Draw(img)
    px = lambda x, y, c: d.rectangle([x * s, y * s, (x + 1) * s - 1, (y + 1) * s - 1], fill=c)
    if kind == 'freckles':
        for x, y in [(7, 14), (9, 15), (24, 14), (22, 15)]: px(x, y, (204, 96, 124))
    if kind == 'glow':
        for x, y in [(8, 9), (14, 9), (17, 9), (23, 9)]: px(x, y, (255, 240, 150))
    if kind == 'sprout':
        for x, y, c in [(16, 2), (16, 1), (15, 0), (17, 0), (14, 0), (18, 1)] and [(16, 2, 0), (16, 1, 0), (15, 0, 1), (14, 0, 1), (17, 1, 1), (18, 0, 1)]:
            px(x, y, (60, 100, 60) if c == 0 else (120, 200, 110))
    if kind == 'horns':
        for x, y in [(9, 3), (8, 2), (8, 1), (22, 3), (23, 2), (23, 1)]: px(x, y, (255, 226, 170))

def render(pal, shape, kind, s=8):
    C.PAL.clear(); C.PAL.update(BASE_PAL, **{}); C.PAL.update(pal)
    C.SHAPE.clear(); C.SHAPE.update(BASE_SHAPE); C.SHAPE.update(shape)
    img = C.render('idle', s)
    extra(img, kind, s)
    return img

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    W, P = 32 * 8, 24
    sheet = Image.new('RGBA', (len(VARIANTS) * (W + P) + P, W + 70), (244, 239, 226, 255))
    d = ImageDraw.Draw(sheet)
    for i, (name, pal, shape, kind) in enumerate(VARIANTS):
        img = render(pal, shape, kind)
        sheet.alpha_composite(img, (P + i * (W + P), P))
        d.text((P + i * (W + P) + W // 2, W + 40), f'{i}. {name}', fill=(40, 40, 50), anchor='mm', font_size=22)
    sheet.save(os.path.join(here, 'variants.png'))
    print('saved variants.png')
