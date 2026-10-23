"""Round 2: Kelp Mint colour + size as the base, five variations. python variants2.py -> variants2.png"""
import os
from PIL import Image, ImageDraw
import variants as V

MINT = {'b': (170, 226, 190), 's': (120, 190, 150), 'h': (225, 250, 230), 'l': (250, 245, 215),
        'w': (90, 140, 90), 'W': (60, 100, 60), 'o': (40, 70, 50)}
SMALL = {'head_rx': 9.5, 'head_ry': 8.5, 'body_rx': 6.5, 'body_ry': 5, 'sprout': False}   # sprout drawn per variant
def m(**kw): d = dict(MINT); d.update(kw); return d

def extra(img, kinds, s):
    d = ImageDraw.Draw(img)
    px = lambda x, y, c: d.rectangle([x * s, y * s, (x + 1) * s - 1, (y + 1) * s - 1], fill=c)
    for k in kinds:
        if k == 'sprout':
            for x, y, c in [(16, 2, 0), (16, 1, 0), (15, 0, 1), (14, 0, 1), (17, 1, 1), (18, 0, 1)]:
                px(x, y, (60, 100, 60) if c == 0 else (120, 200, 110))
        if k == 'horns':
            for x, y in [(10, 4), (9, 3), (9, 2), (21, 4), (22, 3), (22, 2)]: px(x, y, (200, 92, 90))
        if k == 'freckles':
            for x, y in [(7, 12), (9, 12), (8, 14), (22, 12), (24, 12), (23, 14)]: px(x, y, (190, 110, 90))
        if k == 'glint':
            for x, y in [(10, 8), (19, 8)]: px(x, y, (255, 230, 90))
        if k == 'star':
            for x, y in [(16, 1), (15, 2), (16, 2), (17, 2), (16, 3)]: px(x, y, (255, 214, 10))
        if k == 'pearl':
            for x, y, c in [(14, 3, 0), (15, 3, 0), (14, 2, 1), (15, 2, 0)]: px(x, y, (250, 250, 255) if c else (215, 205, 230))

VARS = [
    ('Kelp Mint (yours)', MINT, ['sprout']),
    ('Mint + Lavender', m(w=(170, 140, 220), W=(120, 92, 176), k=(245, 150, 190)), ['sprout', 'freckles']),
    ('Mint + Coral', m(w=(244, 140, 130), W=(200, 92, 90), l=(255, 228, 214)), ['horns']),
    ('Mint + Gold', m(w=(236, 190, 70), W=(186, 136, 30)), ['glint', 'star']),
    ('Seafoam + Sky', m(b=(160, 222, 214), s=(108, 182, 176), h=(220, 248, 244), w=(110, 160, 230), W=(70, 116, 190), o=(36, 64, 70)), ['pearl']),
    ('Mint + Peach', m(w=(250, 180, 120), W=(214, 132, 80), k=(250, 130, 130), l=(255, 236, 200)), ['sprout', 'freckles']),
]

if __name__ == '__main__':
    W, P = 32 * 8, 24
    sheet = Image.new('RGBA', (len(VARS) * (W + P) + P, W + 70), (244, 239, 226, 255))
    d = ImageDraw.Draw(sheet)
    for i, (name, pal, kinds) in enumerate(VARS):
        img = V.render(pal, SMALL, None)
        extra(img, kinds, 8)
        sheet.alpha_composite(img, (P + i * (W + P), P))
        d.text((P + i * (W + P) + W // 2, W + 40), f'{i}. {name}', fill=(40, 40, 50), anchor='mm', font_size=20)
    sheet.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'variants2.png'))
    print('saved')
