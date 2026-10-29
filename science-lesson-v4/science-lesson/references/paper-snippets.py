"""paper-snippets.py: crop each question part of a test paper PDF into its own PNG.

Used for test review lessons (Patryk 2026-10-12): the model-answer slides show a
picture of the REAL question from the paper instead of retyped text. Pure text
search on the PDF (no AI image reading), so it costs no tokens.

  python paper-snippets.py <paper.pdf> <outDir> [--stem-max 300] [--dpi 200]

Writes <outDir>/Q1e.png, Q3a-iii.png ... and <outDir>/snippets.json mapping the
question number as written in lesson JSON ("1(e)", "3(a)(iii)") to the PNG path.
A later sub-part gets its part's long lead-in (a figure) only in a second picture,
key "3(b)(ii)*" / Q3b-ii-full.png: the model-answer slide uses that one, the
quick-answer rows use the short one so a figure is not repeated row after row.

Labels understood: "Q1." question starts, "(a)" parts, "(i)" sub-parts, and AQA
style "01.5" / "0 1 . 5". A part's crop runs from its label to the next label,
stitched across page breaks. Parent text (the question stem, a part's lead-in)
is added on top when it is short (<= --stem-max points) so the context is there.

The school papers are .docx: convert a COPY to PDF first (Word, at home). Never
point this at a Drive file for writing; it only reads the PDF you give it.
"""
import json, os, re, sys
import pymupdf
from PIL import Image, ImageDraw

ROMAN = r'(?:i{1,3}|iv|v|vi{1,3})'
LABEL = re.compile(r'^\s*(?:Q(\d+)\.)?\s*(?:\(([a-h])\))?\s*(?:\((' + ROMAN + r')\))?')
AQA = re.compile(r'^\s*0\s?(\d)\s?\.\s?(\d+)\b')
MARGIN_T, MARGIN_B, X0, X1 = 30, 40, 36, 562


def find_labels(doc):
    """Return [(key, page, y)] in reading order. key = ('3','a','iii') with blanks."""
    out, started = [], False
    q = a = None
    for pno, page in enumerate(doc):
        lines = []
        for b in page.get_text('dict')['blocks']:
            for ln in b.get('lines', []):
                t = ''.join(s['text'] for s in ln['spans'])
                if t.strip():
                    lines.append((ln['bbox'][1], ln['bbox'][0], t))
        lines.sort()
        for y, x, t in lines:
            if x > 150:          # labels sit in the left margin
                continue
            m = AQA.match(t)
            if m:
                q, a = m.group(1), m.group(2)
                started = True
                out.append(((q, a, ''), pno, y))
                continue
            m = LABEL.match(t)
            if not m or not any(m.groups()):
                continue
            nq, na, nr = m.groups()
            if nq:
                q, a, started = nq, None, True
                out.append(((q, '', ''), pno, y))
            if not started:
                continue
            if na:
                a = na
                out.append(((q, a, ''), pno, y))
            if nr:
                out.append(((q, a or '', nr), pno, y))
    return out


MARKS = re.compile(r'^\s*(?:\(\d+\)|\d+\s*marks?)\s*$')


def marks_lines(doc):
    """(page, bottom y) of every right-margin marks line: "(2)" or "1 mark"."""
    out = []
    for pno, page in enumerate(doc):
        for b in page.get_text('dict')['blocks']:
            for ln in b.get('lines', []):
                t = ''.join(s['text'] for s in ln['spans'])
                if ln['bbox'][0] > 470 and MARKS.match(t):
                    out.append((pno, ln['bbox'][3]))
    return out


def split_at_marks(parts, marks):
    """Cut a region just under its LAST marks line; return (own, leftover).
    Everything up to the last marks line before the next label belongs to this part (a
    part can hold two marked lines, e.g. "Tick the box (1 mark) ... Name a fuel (1 mark)");
    text after it is the lead-in of the next label."""
    for i in range(len(parts) - 1, -1, -1):
        p, t, b = parts[i]
        hits = sorted(y for mp, y in marks if mp == p and t < y <= b + 2)
        if hits:
            cut = min(hits[-1] + 4, b)
            own = parts[:i] + [(p, t, cut)]
            rest = ([(p, cut, b)] if b - cut > 12 else []) + parts[i + 1:]
            return own, rest
    return parts, []


def segments(doc, labels):
    """Each label owns the region down to the next label (any level), cut at its
    marks line. Text after the marks line (e.g. "The figure below shows...") is
    the lead-in for the NEXT label, so it moves there."""
    marks = marks_lines(doc)
    segs, carry = {}, []
    for i, (key, pno, y) in enumerate(labels):
        end = labels[i + 1] if i + 1 < len(labels) else None
        parts = []
        p, top = pno, y - 6
        while True:
            h = doc[p].rect.height
            if end and end[1] == p:
                bot = end[2] - 6
                if bot > top + 4:
                    parts.append((p, top, bot))
                break
            parts.append((p, top, h - MARGIN_B))
            p += 1
            if p >= len(doc) or (end is None and p > pno + 1):
                break
            top = MARGIN_T
        own, rest = split_at_marks(parts, marks) if (key[1] or key[2]) else (parts, [])
        segs.setdefault(key, []).extend(carry + own)
        carry = rest
    return segs


def seg_height(parts):
    return sum(b - t for _, t, b in parts)


def render(doc, parts, dpi, strip_lines=True):
    zoom = dpi / 72
    imgs = []
    for p, t, b in parts:
        pix = doc[p].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=pymupdf.Rect(X0, t, X1, b))
        im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        for info in doc[p].get_image_info():          # school logo (wide, short): paint it out
            x0, y0, x1, y1 = info['bbox']
            if y1 - y0 < 26 and (x1 - x0) / max(1, y1 - y0) > 3.5 and y1 > t and y0 < b:
                ImageDraw.Draw(im).rectangle([(x0 - X0) * zoom - 2, (y0 - t) * zoom - 2, (x1 - X0) * zoom + 2, (y1 - t) * zoom + 2], fill='white')
        imgs.append(trim(im))
    imgs = [drop_answer_lines(im, zoom) for im in imgs if im is not None] if strip_lines else [im for im in imgs if im is not None]
    if not imgs:
        return None
    w = max(im.width for im in imgs)
    gap = int(zoom * 6)
    out = Image.new('RGB', (w, sum(im.height for im in imgs) + gap * (len(imgs) - 1)), 'white')
    y = 0
    for im in imgs:
        out.paste(im, (0, y))
        y += im.height + gap
    return out


def drop_answer_lines(im, zoom):
    """Remove empty answer lines (ruled ____ or dotted ....) and close the gaps.

    An answer line is a thin band (<= 5 px) of dark pixels running across a good part
    of the width, with blank rows above and below. Table borders are kept because the
    table's side walls make the rows next to them non-blank; text lines are taller;
    a line with words on it ("Energy = ______ J") is taller too, so it stays.
    Long blank gaps left behind are shortened to a small fixed gap."""
    g = im.convert('L')
    w, h = g.size
    px = g.load()
    dark = [sum(1 for x in range(0, w, 2) if px[x, y] < 160) * 2 for y in range(h)]
    blank = [d <= 2 for d in dark]
    keep = [True] * h
    y = 0
    while y < h:
        if blank[y]:
            y += 1
            continue
        y0 = y
        while y < h and not blank[y]:
            y += 1
        band = range(y0, y)
        thin = (y - y0) <= 5
        wide = max(dark[r] for r in band) > w * 0.25
        dotted = (y - y0) <= 6 and max(dark[r] for r in band) > w * 0.12 and             all(px[x, r] > 160 or px[min(w - 1, x + 6), r] > 160 for r in band for x in range(0, w - 7, 3))
        if thin and (wide or dotted):
            for r in band:
                keep[r] = False
    # close gaps: blank or removed rows, more than max_gap in a row, are cut down
    max_gap = int(zoom * 8)
    rows, run = [], []
    for r in range(h):
        if not keep[r] or blank[r]:
            run.append(r)
            continue
        rows += run[:max_gap]
        run = []
        rows.append(r)
    rows += run[:max_gap]
    if len(rows) == h:
        return im
    out = Image.new('RGB', (w, len(rows)), 'white')
    for i, r in enumerate(rows):
        if keep[r]:
            out.paste(im.crop((0, r, w, r + 1)), (0, i))
    return out


def trim(im):
    """Cut blank rows top and bottom, and the blank right margin (2026-10-22: pictures read bigger on
    the slide). The left edge is kept so indents stay true between a question's parts."""
    g = im.convert('L').point(lambda v: 0 if v > 235 else 255)
    box = g.getbbox()
    if not box:
        return None
    pad = 8
    return im.crop((0, max(0, box[1] - pad), min(im.width, box[2] + 3 * pad), min(im.height, box[3] + pad)))


def key_name(key):
    q, a, r = key
    return f"{q}" + (f"({a})" if a else '') + (f"({r})" if r else '')


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    pdf, out_dir = args[0], args[1]
    stem_max = float(args[args.index('--stem-max') + 1]) if '--stem-max' in args else 300
    dpi = int(args[args.index('--dpi') + 1]) if '--dpi' in args else 200
    os.makedirs(out_dir, exist_ok=True)
    doc = pymupdf.open(pdf)
    labels = find_labels(doc)
    segs = segments(doc, labels)
    def is_context(key):
        q, a, r = key
        if not a and any(k[0] == q and k[1] for k in segs):
            return True                               # question stem alone: only used as context
        return bool(a and not r and any(k[:2] == (q, a) and k[2] for k in segs))  # part lead-in for sub-parts
    answerable = [k for k in segs if not is_context(k)]
    index = {}
    for key in answerable:
        q, a, r = key
        first = next(k for k in answerable if k[0] == q) == key
        first_sub = bool(r) and next(k for k in answerable if k[:2] == (q, a)) == key
        ancs = [(q, '', '')] + ([(q, a, '')] if r else [])

        def with_context(full):
            # stem / lead-in: always with the first part under it, with later parts only when
            # short; full=True also adds the part's own lead-in, e.g. its figure (big model-answer slide)
            parts = []
            for anc in ancs:
                lim = stem_max if ((full and anc[1]) or (first if not anc[1] else first_sub)) else min(stem_max, 120)
                if anc in segs and seg_height(segs[anc]) <= lim:
                    parts += segs[anc]
            return parts + segs[key]

        base = 'Q' + q + (a or '') + ('-' + r if r else '')
        short, full = with_context(False), with_context(True)
        for parts, suffix, k in [(short, '', key_name(key)), (full, '-full', key_name(key) + '*')]:
            if suffix and parts == short:
                continue                              # nothing extra: one picture serves both
            im = render(doc, parts, dpi)
            if im is None:
                continue
            im.save(os.path.join(out_dir, base + suffix + '.png'))
            index[k] = os.path.join(out_dir, base + suffix + '.png').replace('\\', '/')
    with open(os.path.join(out_dir, 'snippets.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=1)
    print(f'{len(index)} snippets -> {out_dir}')
    for k, v in index.items():
        w, h = Image.open(v).size
        print(f'  {k:12s} {w}x{h}')


if __name__ == '__main__':
    main()
