#!/usr/bin/env python3
"""
chalkify.py : recolour line-art figures into chalkboard / house-style versions.

Turns black-on-white diagrams (scans, exports) into:
  chalk      : warm off-white lines on dark slate
  gold_navy  : gold lines on navy   (background = navy)
  navy_gold  : navy lines on gold   (background = gold)

Works on a single image or a whole folder. Anti-aliased edges are preserved by
mapping each pixel's luminance to an "ink amount", then compositing two flat
colours. That keeps curves and thin lines smooth instead of jagged.

Usage:
  python chalkify.py input.png
  python chalkify.py ./figures --style chalk
  python chalkify.py ./figures --style house --alternate
  python chalkify.py input.png --style gold_navy --texture 0.12 --out ./out

PLATE MODE (print-ready A4 wall pages, one figure per page with a caption):
  python chalkify.py --plates feynman-plates.json
  python chalkify.py --plates feynman-plates.json --pdf     (also write a single PDF)

  The manifest says which palette each figure gets and what its caption reads.
  Edit the JSON, not this file, to re-tier a figure or reword a caption.

Requires: pip install pillow numpy
"""

import argparse
import json
import sys
import textwrap
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# palette name -> (background rgb, line rgb)
# off-white is warm (not pure white) and slate is charcoal (not pure black):
# both register more evenly on a printer and avoid harsh edges.
# navy / gold match the house style (#0D1B5E / #FABB2E).
PALETTES = {
    "chalk":     ((0x14, 0x18, 0x1c), (0xf3, 0xef, 0xe4)),
    "gold_navy": ((0x0d, 0x1b, 0x5e), (0xfa, 0xbb, 0x2e)),
    "navy_gold": ((0xfa, 0xbb, 0x2e), (0x0d, 0x1b, 0x5e)),
}

EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp"}


def luminance(img):
    arr = np.asarray(img.convert("RGB"), dtype=np.float32)
    return 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]


def ink_amount(lum, white=245.0, black=40.0, gamma=1.0):
    ink = (white - lum) / (white - black)
    ink = np.clip(ink, 0.0, 1.0)
    if gamma != 1.0:
        ink = ink ** gamma
    return ink


def add_texture(ink, strength, seed=0):
    if strength <= 0:
        return ink
    rng = np.random.default_rng(seed)
    noise = rng.random(ink.shape, dtype=np.float32)
    # subtle grain, applied only where there is ink, so lines look chalky
    return np.clip(ink * (1.0 - strength * noise), 0.0, 1.0)


def recolour(img, bg, line, texture=0.0, white=245.0, black=40.0, gamma=1.0, seed=0):
    lum = luminance(img)
    ink = ink_amount(lum, white, black, gamma)
    ink = add_texture(ink, texture, seed)[..., None]
    bg = np.array(bg, dtype=np.float32)
    line = np.array(line, dtype=np.float32)
    out = bg * (1.0 - ink) + line * ink
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")


def gather(inp):
    p = Path(inp)
    if p.is_dir():
        return sorted(f for f in p.iterdir() if f.suffix.lower() in EXTS)
    return [p]


def resolve_key(style, alternate, index):
    if style == "house":
        if alternate:
            return ("gold_navy", "navy_gold")[index % 2]
        return "gold_navy"
    if alternate and style in ("gold_navy", "navy_gold"):
        return ("gold_navy", "navy_gold")[index % 2]
    return style


# --------------------------------------------------------------------- plates
# A4 at 300 dpi. One figure per page, caption underneath, full-bleed background
# in the tier's colour so it reads from across the room when pinned to a wall.
# LANDSCAPE by default: these figures are wide, and on a portrait page they left
# big dead bands above and below. --portrait switches back.
A4_LANDSCAPE = (3508, 2480)
A4_PORTRAIT = (2480, 3508)
DPI = 300

# Serif first: the Lectures' captions are typeset, and a serif stops the page
# looking like a slide. Falls back through what Windows/Linux actually ship.
SERIF_CANDIDATES = [
    ("georgia.ttf", "georgiab.ttf"),
    ("constan.ttf", "constanb.ttf"),
    ("times.ttf", "timesbd.ttf"),
    ("DejaVuSerif.ttf", "DejaVuSerif-Bold.ttf"),
    ("LiberationSerif-Regular.ttf", "LiberationSerif-Bold.ttf"),
]


def _font_dirs():
    dirs = [Path("C:/Windows/Fonts"), Path("/usr/share/fonts/truetype/dejavu"),
            Path("/usr/share/fonts/truetype/liberation"), Path("/Library/Fonts")]
    try:  # matplotlib ships DejaVu, which is the only common serif with full
        import matplotlib  # Greek + subscripts + superscripts. Optional.
        dirs.insert(0, Path(matplotlib.get_data_path()) / "fonts" / "ttf")
    except Exception:
        pass
    return dirs


def _covers(font_path, chars):
    """True if the font has a glyph for every character we intend to draw.
    Without this check, missing glyphs (φ, ₁, ², θ) silently render as empty
    boxes — the caption looks broken and we would not know until it printed."""
    try:
        from fontTools.ttLib import TTFont
        tt = TTFont(str(font_path), fontNumber=0, lazy=True)
        cmap = set()
        for table in tt["cmap"].tables:
            cmap.update(table.cmap.keys())
        tt.close()
        return all(ord(c) in cmap for c in chars if not c.isspace())
    except Exception:
        return True  # cannot check — assume yes rather than block the run


def load_fonts(title_px, body_px, needed_chars=""):
    """Pick ONE serif used by every plate, so the set looks consistent. Prefers
    the prettier system serifs, but only if they can render every character in
    the captions; otherwise falls back to DejaVu, which always can."""
    for regular, bold in SERIF_CANDIDATES:
        for d in _font_dirs():
            r, b = d / regular, d / bold
            if r.exists() and _covers(r, needed_chars):
                try:
                    return (ImageFont.truetype(str(b if b.exists() else r), title_px),
                            ImageFont.truetype(str(r), body_px),
                            regular)
                except Exception:
                    pass
    print("  ! no serif font covers the caption characters — using the default bitmap font")
    return ImageFont.load_default(), ImageFont.load_default(), "default"


def wrap_to_width(draw, text, font, max_px):
    """Greedy wrap on real measured width (textwrap counts characters, which is
    wrong for proportional fonts and produces ragged, ugly caption blocks)."""
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_px or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def make_plate(fig_path, bg, line, title, caption, texture, gamma, white, black, seed,
               fonts, portrait=False):
    """Compose one A4 page: recoloured figure above, caption below."""
    img = Image.open(fig_path)
    fig = recolour(img, bg, line, texture=texture, white=white, black=black,
                   gamma=gamma, seed=seed)

    W, H = A4_PORTRAIT if portrait else A4_LANDSCAPE
    margin = 200                       # ~17mm
    gap = 130                          # between figure and caption
    page = Image.new("RGB", (W, H), tuple(bg))
    draw = ImageDraw.Draw(page)

    title_font, body_font, _ = fonts
    body_leading = 84
    title_h = 118 if title else 0

    text_w = W - 2 * margin
    body_lines = wrap_to_width(draw, caption, body_font, text_w)
    caption_h = title_h + len(body_lines) * body_leading

    # Fit the figure to whatever room the caption leaves. The sources are small webp
    # exports, so upscaling is capped — but these are wall posters read from across
    # a room, where filling the page beats pixel-crispness, so the cap is generous.
    fig_box_h = H - 2 * margin - caption_h - gap
    scale = min(text_w / fig.width, fig_box_h / fig.height, 4.5)
    fig = fig.resize((max(1, int(fig.width * scale)), max(1, int(fig.height * scale))),
                     Image.LANCZOS)

    # Centre the WHOLE block (figure + gap + caption) vertically, rather than
    # centring the figure inside an oversized box — otherwise a small figure
    # leaves a big dead gap at the top and the page looks unbalanced.
    block_h = fig.height + gap + caption_h
    top = max(margin, (H - block_h) // 2)

    page.paste(fig, ((W - fig.width) // 2, top))

    y = top + fig.height + gap
    if title:
        draw.text((margin, y), title, font=title_font, fill=tuple(line))
        y += title_h
    for ln in body_lines:
        draw.text((margin, y), ln, font=body_font, fill=tuple(line))
        y += body_leading

    return page


def run_plates(manifest_path, pdf=False, texture=0.0, gamma=1.0, white=245.0, black=40.0,
               portrait=False):
    mpath = Path(manifest_path)
    manifest = json.loads(mpath.read_text(encoding="utf-8"))
    root = mpath.parent
    src = root / manifest.get("_sourceFolder", ".")
    out = root / manifest.get("_outputFolder", "plates")
    out.mkdir(parents=True, exist_ok=True)

    tiers = manifest.get("_tiers", {})
    plates = [p for p in manifest.get("plates", []) if not p.get("skip")]

    # Choose ONE font for the whole set, and only one that can actually draw every
    # character used across every caption (φ, θ, ₁, ², Δ, ′ …). Consistency matters:
    # a set of wall plates in two different serifs looks like a mistake.
    all_chars = "".join(p.get("title", "") + p.get("caption", "") for p in plates)
    fonts = load_fonts(88, 62, needed_chars=all_chars)
    print(f"  font: {fonts[2]}")

    pages, missing, flagged = [], [], []

    for i, p in enumerate(plates):
        fig_path = src / p["file"]
        if not fig_path.exists():
            missing.append(p["file"])
            continue
        tier = p.get("tier", "lesser")
        style = tiers.get(tier, {}).get("style", "chalk")
        bg, line = PALETTES[style]

        page = make_plate(fig_path, bg, line, p.get("title", ""), p.get("caption", ""),
                          texture, gamma, white, black, seed=i, fonts=fonts,
                          portrait=portrait)
        name = f"{i + 1:02d}_{tier}_{fig_path.stem}.png"
        page.save(out / name, dpi=(DPI, DPI))
        pages.append(page)
        if p.get("needsPatrykCheck"):
            flagged.append(p["file"])
        print(f"  [{tier:6}] {p['file']}  ->  {name}")

    if pdf and pages:
        # Pillow's PDF writer reaches for the JPEG encoder, which is only
        # registered once the plugins are initialised. Without this it dies with
        # KeyError: 'JPEG' after all the pages have already been written.
        Image.init()
        pdf_path = out / "feynman-plates.pdf"
        pages[0].save(pdf_path, save_all=True, append_images=pages[1:],
                      resolution=DPI)
        print(f"\n  PDF: {pdf_path}")

    print(f"\nDone. {len(pages)} A4 plate(s) -> {out}")
    if missing:
        print(f"\n  MISSING ({len(missing)}) — named in the manifest but not in {src}:")
        for m in missing:
            print(f"    - {m}")
    if flagged:
        print(f"\n  CHECK THESE CAPTIONS ({len(flagged)}) — I could not identify the figure with")
        print("  confidence, so I described what is drawn rather than invent the physics:")
        for f in flagged:
            print(f"    - {f}")


def main():
    ap = argparse.ArgumentParser(description="Recolour line-art into chalk / house-style.")
    ap.add_argument("input", nargs="?", help="image file or folder (omit when using --plates)")
    ap.add_argument("--plates", default=None,
                    help="manifest JSON -> print-ready A4 pages with captions (e.g. feynman-plates.json)")
    ap.add_argument("--pdf", action="store_true", help="with --plates: also write one combined PDF")
    ap.add_argument("--portrait", action="store_true",
                    help="with --plates: portrait pages (default is landscape — the figures are wide)")
    ap.add_argument("--style", default="chalk", choices=list(PALETTES) + ["house"],
                    help="colour scheme; 'house' pairs with --alternate to flip navy/gold per file")
    ap.add_argument("--alternate", action="store_true",
                    help="alternate navy-background and gold-background across a folder")
    ap.add_argument("--texture", type=float, default=0.0,
                    help="chalk grain, 0.0 to 0.3 (0 = clean lines)")
    ap.add_argument("--gamma", type=float, default=1.0,
                    help="above 1 thins lines, below 1 thickens them")
    ap.add_argument("--white", type=float, default=245.0,
                    help="luminance treated as pure background (raise if scans are grey)")
    ap.add_argument("--black", type=float, default=40.0,
                    help="luminance treated as pure line")
    ap.add_argument("--out", default=None, help="output folder (default: alongside each input)")
    args = ap.parse_args()

    # Plate mode: build A4 wall pages from a manifest instead of loose recolours.
    if args.plates:
        run_plates(args.plates, pdf=args.pdf, texture=args.texture, gamma=args.gamma,
                   white=args.white, black=args.black, portrait=args.portrait)
        return

    if not args.input:
        sys.exit("Give an image/folder, or use --plates <manifest.json>.")

    files = gather(args.input)
    if not files:
        sys.exit("No images found at that path.")

    outdir = Path(args.out) if args.out else None
    if outdir:
        outdir.mkdir(parents=True, exist_ok=True)

    for i, f in enumerate(files):
        key = resolve_key(args.style, args.alternate, i)
        bg, line = PALETTES[key]
        try:
            img = Image.open(f)
        except Exception as e:
            print(f"  skipped {f.name}: {e}")
            continue
        out = recolour(img, bg, line, texture=args.texture, white=args.white,
                       black=args.black, gamma=args.gamma, seed=i)
        name = f"{f.stem}_{key}.png"
        dst = (outdir / name) if outdir else f.with_name(name)
        out.save(dst)
        print(f"  {f.name}  ->  {dst.name}")

    print(f"Done. {len(files)} image(s) processed.")


if __name__ == "__main__":
    main()
