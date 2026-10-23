"""label_points.py: check (and tidy) where labels point on a picture, before building a Learn L slide.

  python label_points.py picture.png --points '[["nucleus",0.35,0.46],["membrane",0.08,0.5]]' --out check.png [--snap edge]

Draws each point as a numbered dot on a copy of the picture (check.png) so Claude can LOOK at it and adjust,
and prints the points as JSON ready for the lesson file. x and y are fractions of the picture (0 to 1).
--snap edge  moves each point to the strongest edge within a small radius (so a line meant for the cell
             membrane lands ON the membrane, not just inside it). Points marked with "!" at the end of the
             name are never moved (for parts in the middle of a flat area, such as cytoplasm).
--radius N   how far a snap may move, in pixels (default 2% of the picture width).
Python + Pillow only, so it runs on claude.ai too."""
import argparse, json, sys
from PIL import Image, ImageDraw, ImageFilter


def edge_snap(img, x, y, radius):
    """The strongest edge pixel within radius of (x, y), in pixels; (x, y) if there is no edge."""
    g = img.convert('L').filter(ImageFilter.FIND_EDGES)
    w, h = g.size
    best, bx, by = 40, x, y                       # weaker than 40 = no real edge: stay put
    for yy in range(max(0, y - radius), min(h, y + radius + 1)):
        for xx in range(max(0, x - radius), min(w, x + radius + 1)):
            if (xx - x) ** 2 + (yy - y) ** 2 > radius * radius:
                continue
            v = g.getpixel((xx, yy)) - 0.5 * (((xx - x) ** 2 + (yy - y) ** 2) ** 0.5)   # prefer closer edges
            if v > best:
                best, bx, by = v, xx, yy
    return bx, by


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('image')
    ap.add_argument('--points', required=True, help='JSON list of [name, x, y] with x, y as fractions')
    ap.add_argument('--out', required=True)
    ap.add_argument('--snap', choices=['edge'])
    ap.add_argument('--radius', type=int)
    a = ap.parse_args(argv)
    img = Image.open(a.image).convert('RGB')
    w, h = img.size
    pts = json.loads(a.points)
    radius = a.radius or max(3, round(w * 0.02))
    out = []
    for name, fx, fy in pts:
        x, y = round(fx * (w - 1)), round(fy * (h - 1))
        fixed = str(name).endswith('!')
        if a.snap == 'edge' and not fixed:
            x, y = edge_snap(img, x, y, radius)
        out.append([str(name).rstrip('!'), round(x / (w - 1), 4), round(y / (h - 1), 4)])
    d = ImageDraw.Draw(img)
    r = max(6, round(w / 90))
    for n, (name, fx, fy) in enumerate(out, 1):
        x, y = fx * (w - 1), fy * (h - 1)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 214, 10), outline=(13, 27, 94), width=max(2, r // 3))
        d.text((x + r + 3, y - r), f'{n} {name}', fill=(13, 27, 94))
    img.save(a.out)
    print(json.dumps(out))
    return out


if __name__ == '__main__':
    main(sys.argv[1:])
