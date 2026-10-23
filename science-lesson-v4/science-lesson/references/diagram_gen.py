"""diagram_gen.py: diagrams Claude draws in ONE house style (Lesson quality Part B, 2026-10-23), for when
the school's slides have no usable picture. Navy outlines, shaded balls, white background. Python +
Pillow only, so it runs on claude.ai too. Never a web or AI image.

  python diagram_gen.py particles --kind element|molecules|compound|mixture --out box.png
  python diagram_gen.py atom --model dalton|thomson|rutherford|bohr|chadwick [--shells 2,8,1] --out atom.png

It prints JSON: {"file": ..., "points": [[name, x, y], ...]}, the exact parts as fractions of the picture,
ready for a Learn L slide's labels (it drew them, so no measuring is needed; still look at the picture).
Embed with "embeddedImagePath": <file>, "imageConfidence": "search"."""
import argparse, json, math, random, sys
from PIL import Image, ImageDraw, ImageFont

NAVY = (13, 27, 94)
W = H = 1000                                   # drawn at 1000 px, saved at 600 (smooth edges)
COLS = {'blue': (66, 133, 244), 'red': (229, 57, 53), 'grey': (120, 130, 140), 'yellow': (251, 192, 45), 'green': (67, 160, 71), 'white': (236, 239, 241)}


def font(n):
    for f in ('arialbd.ttf', 'Arial Bold.ttf', 'DejaVuSans-Bold.ttf'):
        try:
            return ImageFont.truetype(f, n)
        except OSError:
            pass
    return ImageFont.load_default()


def ball(d, cx, cy, r, col, outline=True, text=None):
    """A shaded ball: dark rim to a light spot up and to the left."""
    steps = max(8, int(r))
    for k in range(steps, 0, -1):
        t = k / steps                                        # 1 = rim, 0 = highlight
        rr = r * t
        ox, oy = cx - r * 0.35 * (1 - t), cy - r * 0.35 * (1 - t)
        mix = 0.45 + 0.55 * (1 - t)
        c = tuple(int(v * (1 - mix * 0.6) + 255 * mix * 0.6) if t < 1 else int(v * 0.78) for v in col)
        d.ellipse([ox - rr, oy - rr, ox + rr, oy + rr], fill=c)
    if outline:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=NAVY, width=max(3, min(9, int(r / 9))))
    if text:
        f = font(int(r * 0.9))
        d.text((cx, cy), text, fill=NAVY if sum(col) > 500 else (255, 255, 255), font=f, anchor='mm')


def save(img, out, pts):
    img = img.resize((600, int(600 * img.height / img.width)), Image.LANCZOS)
    img.save(out)
    res = {'file': out, 'points': [[n, round(x / W, 4), round(y / H, 4)] for n, x, y in pts]}
    print(json.dumps(res))
    return res


def particles(kind, out, seed=3):
    """A box of particles. element = one kind of atom; molecules = an element made of pairs (O2);
    compound = pairs of two different atoms joined (CO); mixture = two kinds of particle, not joined."""
    rnd = random.Random(seed)
    img = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(img)
    d.rectangle([40, 40, W - 40, H - 40], outline=NAVY, width=10)
    r = 52
    cells = [(150 + c * 175 + rnd.randint(-18, 18), 160 + rr * 175 + rnd.randint(-18, 18)) for rr in range(4) for c in range(4)]
    pts = []
    for k, (x, y) in enumerate(cells):
        if kind == 'element':
            ball(d, x, y, r, COLS['blue'])
            if k == 5: pts.append(['atom', x, y])
        elif kind in ('molecules', 'compound'):
            a = rnd.uniform(0, math.pi)
            dx, dy = math.cos(a) * r * 0.85, math.sin(a) * r * 0.85
            ball(d, x - dx, y - dy, r * 0.8, COLS['red'])
            ball(d, x + dx, y + dy, r * 0.8, COLS['red'] if kind == 'molecules' else COLS['grey'])
            if k == 5: pts.append(['molecule' if kind == 'molecules' else 'molecule of a compound', x, y])
        else:  # mixture: atoms of one element and molecules of another, not joined to each other
            if k % 2 == 0:
                ball(d, x, y, r * 0.9, COLS['yellow'])
                if k == 4: pts.append(['atom of one element', x, y])
            else:
                a = rnd.uniform(0, math.pi); dx, dy = math.cos(a) * r * 0.75, math.sin(a) * r * 0.75
                ball(d, x - dx, y - dy, r * 0.72, COLS['green']); ball(d, x + dx, y + dy, r * 0.72, COLS['green'])
                if k == 5: pts.append(['molecule of another substance', x, y])
    return save(img, out, pts)


def ring(d, cx, cy, rad, width=6):
    d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], outline=NAVY, width=width)


def atom(model, out, shells=(2, 8, 1)):
    img = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(img)
    cx = cy = W // 2
    pts = []
    if model == 'dalton':                                  # a solid ball: atoms cannot be divided
        ball(d, cx, cy, 330, COLS['grey']); pts.append(['solid sphere', cx + 230, cy - 230])
    elif model == 'thomson':                               # plum pudding: electrons in a ball of positive charge
        ball(d, cx, cy, 360, (255, 205, 210))
        rnd = random.Random(7)
        es = []
        while len(es) < 10:                                # spread out: no two electrons touching
            rr, t = rnd.uniform(40, 290), rnd.uniform(0, 6.28)
            x, y = cx + rr * math.cos(t), cy + rr * math.sin(t)
            if all((x - a) ** 2 + (y - b) ** 2 > 95 ** 2 for a, b in es): es.append((x, y))
        for x, y in es: ball(d, x, y, 34, COLS['blue'], text='-')
        pts += [['ball of positive charge', cx + 250, cy + 220], ['electron', es[0][0], es[0][1]]]
    else:
        n = [int(s) for s in shells] if model in ('bohr', 'chadwick') else [0]
        if model == 'rutherford':                          # tiny dense nucleus, electrons far out, mostly empty space
            ball(d, cx, cy, 55, COLS['red'], text='+'); pts.append(['nucleus', cx, cy])
            for k in range(6):
                t = k * math.pi / 3; ball(d, cx + 330 * math.cos(t), cy + 330 * math.sin(t), 30, COLS['blue'], text='-')
            pts += [['electron', cx + 330, cy], ['empty space', cx - 170, cy - 170]]
        else:                                              # bohr / chadwick: electrons in shells
            radii = [190 + 115 * k for k in range(len(n))]
            for rad in radii: ring(d, cx, cy, rad)
            if model == 'chadwick':                        # nucleus of protons and neutrons
                for k, (dx, dy) in enumerate([(-40, -30), (40, -30), (0, 30), (-40, 60), (40, 60), (0, -80)]):
                    ball(d, cx + dx, cy + dy, 40, COLS['red'] if k % 2 == 0 else COLS['grey'], text='+' if k % 2 == 0 else None)
                pts += [['proton', cx - 40, cy - 30], ['neutron', cx + 40, cy - 30]]
            else:
                ball(d, cx, cy, 90, COLS['red'], text='+'); pts.append(['nucleus', cx, cy])
            for rad, count in zip(radii, n):
                for j in range(count):
                    t = -math.pi / 2 + j * 2 * math.pi / max(1, count)
                    ball(d, cx + rad * math.cos(t), cy + rad * math.sin(t), 28, COLS['blue'], text='-')
            if n and n[0]:
                pts += [['electron', cx, cy - radii[0]], ['shell (energy level)', cx + radii[-1] * math.cos(0.6), cy + radii[-1] * math.sin(0.6)]]
    return save(img, out, pts)


def main(argv=None):
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='what', required=True)
    p = sub.add_parser('particles'); p.add_argument('--kind', choices=['element', 'molecules', 'compound', 'mixture'], required=True); p.add_argument('--out', required=True)
    a = sub.add_parser('atom'); a.add_argument('--model', choices=['dalton', 'thomson', 'rutherford', 'bohr', 'chadwick'], required=True)
    a.add_argument('--shells', default='2,8,1'); a.add_argument('--out', required=True)
    o = ap.parse_args(argv)
    if o.what == 'particles':
        return particles(o.kind, o.out)
    return atom(o.model, o.out, o.shells.split(','))


if __name__ == '__main__':
    main(sys.argv[1:])
