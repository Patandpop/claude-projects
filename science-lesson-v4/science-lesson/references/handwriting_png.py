#!/usr/bin/env python3
"""
Handwriting picture renderer: called by build.js (callHandwritingPng) via execSync.

Draws handwriting as a transparent PNG using Pillow and the bundled Caveat TTF.
The word layout is NOT decided here: build.js's layoutHandwriting() places every
word (position, rotation, baseline jitter) and this script only draws what it is
told, so the picture route and the editable-text route always match.

Usage:
    python handwriting_png.py <input.json>

input.json fields (all lengths in inches, relative to the box's top-left):
    outPath    str    where to write the PNG
    fontPath   str    Caveat TTF to draw with
    dpi        int    resolution (build.js sends 200)
    w, h       float  box size
    fontSize   float  points
    color      str    hex text colour, e.g. "1A1A2E"
    lineH      float  line height
    words      list   [{word, x, y, w, rot}] from layoutHandwriting(); y is the line top,
                      rot is degrees clockwise (PowerPoint's convention)
    rules      list   y of each ruled line
    ruleX0, ruleX1    ruled-line start and end
    ruleColor  str    hex colour of the ruled lines
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont


def _rgba(hex_colour):
    h = str(hex_colour).lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def render(d):
    dpi = float(d.get('dpi', 200))
    px = lambda inches: inches * dpi
    W, H = max(1, round(px(d['w']))), max(1, round(px(d['h'])))
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))

    # Ruled lines first, so the writing sits on top of them (0.75pt, as on the editable route).
    draw = ImageDraw.Draw(img)
    rule_w = max(1, round(0.75 / 72 * dpi))
    for ry in d.get('rules', []):
        draw.line([(px(d['ruleX0']), px(ry)), (px(d['ruleX1']), px(ry))],
                  fill=_rgba(d.get('ruleColor', 'C9C9DC')), width=rule_w)

    font_px = float(d['fontSize']) / 72 * dpi
    font = ImageFont.truetype(d['fontPath'], max(1, round(font_px)))
    colour = _rgba(d.get('color', '1A1A2E'))
    line_h = px(d['lineH'])
    pad = round(font_px)                       # room for rotation without clipping

    for wd in d.get('words', []):
        word = str(wd.get('word', ''))
        if not word:
            continue
        # The editable route puts each word in a text box (w + 0.14in wide, one line
        # tall, bottom-aligned) and rotates it about the box centre. Match that.
        box_w = px(float(wd.get('w', 0)) + 0.14)
        tile_w = int(max(box_w, draw.textlength(word, font=font)) + 2 * pad)
        tile = Image.new('RGBA', (tile_w, int(line_h + 2 * pad)), (0, 0, 0, 0))
        ImageDraw.Draw(tile).text((pad, pad + line_h), word, font=font, fill=colour, anchor='ld')
        # Pillow rotates anticlockwise; PowerPoint's rotation is clockwise.
        tile = tile.rotate(-float(wd.get('rot', 0)), resample=Image.BICUBIC,
                           center=(pad + box_w / 2, pad + line_h / 2))
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        layer.paste(tile, (round(px(wd['x'])) - pad, round(px(wd['y'])) - pad))
        img = Image.alpha_composite(img, layer)

    img.save(d['outPath'], 'PNG')
    return d['outPath']


if __name__ == '__main__':
    if len(sys.argv) < 2 or not os.path.isfile(sys.argv[1]):
        print('Usage: python handwriting_png.py <input.json>', file=sys.stderr)
        sys.exit(1)
    try:
        with open(sys.argv[1], encoding='utf-8') as f:
            data = json.load(f)
        out = render(data)
    except Exception as e:                     # build.js reports this and falls back to editable text
        print(f'handwriting_png: {e}', file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(out):
        print(f'handwriting_png: output not written: {out}', file=sys.stderr)
        sys.exit(1)
