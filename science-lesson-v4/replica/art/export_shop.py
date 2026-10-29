"""Export the shop (surfaces + furniture) for the planner: one entry per item with its price, lock, tier and the
sprite layer(s) it draws on the room canvas (128x116), each cropped with its offset, so the page can stack them.

python export_shop.py -> ../../planner/game-shop.json

Slots (one item each): floor, wall, rug, window, light, corner, furn (a seat or a table), hang3 (left wall),
hang4 (right wall), prop. A wall hanging can go in hang3 or hang4, so it carries two layers.
Original art from iso_shop_*.py (read only). The first free item of each slot is the starter one.
"""
import base64, io, json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import iso_shop_furniture as F          # read only
import iso_shop_surfaces as S           # read only
import iso_items as I
from iso_room import P, W, H

SLOT_OF = {'floors': 'floor', 'wallpapers': 'wall', 'rugs': 'rug', 'windows': 'window', 'lights': 'light',
           'corner': 'corner', 'seats': 'furn', 'tables': 'furn', 'wall': 'hang', 'props': 'prop'}
Z = {'floor': 0, 'wall': 1, 'rug': 2, 'window': 3, 'hang3': 4, 'hang4': 4, 'corner': 5, 'furn': 6, 'prop': 7, 'light': 8}

def layer(img):
    bb = img.getbbox()
    if not bb:
        return None
    buf = io.BytesIO(); img.crop(bb).save(buf, 'PNG', optimize=True)
    return {'art': 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode(), 'ox': bb[0], 'oy': bb[1], 'w': bb[2] - bb[0], 'h': bb[3] - bb[1]}

def blank():
    return Image.new('RGBA', (W, H), (0, 0, 0, 0))

items = []
# ---- surfaces: fn(img) draws straight onto the room canvas
for key, (title, zone, rows) in S.CATS.items():
    n = {}
    for tier, name, label, price, lock, fn in rows:
        n[tier] = n.get(tier, 0) + 1
        im = I.canvas(); fn(im)
        lk = None if lock is None else {k: v for k, v in lock.items()}
        items.append({'id': f'{key}_{tier.lower()}_{n[tier]}_{name}', 'name': label, 'category': key, 'slots': [SLOT_OF[key]], 'tier': tier,
                      'price': price, 'lock': lk, 'layers': {SLOT_OF[key]: layer(im)}})
# ---- furniture: 'room' items draw onto the canvas, 'wall' items are flat sprites hung on a wall, 'prop' items stand on the table
for key, title, zone, kind, rows in F.CATS:
    n = {}
    for slug, name, tier, price, lock, fn in rows:
        n[tier] = n.get(tier, 0) + 1
        iid = f'{key}_{tier.lower()}_{n[tier]}_{slug}'
        lk = None if lock is None else {k: v for k, v in lock.items()}
        if kind == 'room':
            im = blank(); fn(im); layers = {SLOT_OF[key]: layer(im)}; slots = [SLOT_OF[key]]
        elif kind == 'wall':
            a = blank(); F.on_left_wall(a, fn(), 24, 43); b = blank(); F.on_right_wall(b, fn(), 14, 44)
            layers = {'hang3': layer(a), 'hang4': layer(b)}; slots = ['hang3', 'hang4']
        else:
            im = blank(); x, y = P(27, 18, 10); F.billboard(im, fn(), round(x), round(y) + 1); layers = {'prop': layer(im)}; slots = ['prop']
        items.append({'id': iid, 'name': name, 'category': key, 'slots': slots, 'tier': tier, 'price': price, 'lock': lk, 'layers': layers})
for it in items:
    assert all(v for v in it['layers'].values()), it['id']
fx, fy = P(17, 17)
out = {'w': W, 'h': H, 'ulhu': {'x': round(fx) - 16, 'y': round(fy) - 31}, 'z': Z, 'items': items}
dest = os.path.join(HERE, '..', '..', 'planner', 'game-shop.json')
json.dump(out, open(dest, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
free = [(i['id'], i['slots'][0]) for i in items if i['price'] == 0 and not i['lock']]
print(len(items), 'items,', os.path.getsize(dest) // 1024, 'KB; free:', free)
