"""Mock-ups for specs/six-mark-breakdown.md (1333x750 = 13.33 x 7.5 in at 100 px/in)."""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\magda\claude-projects\science-lesson-v4"
OUT = os.path.join(ROOT, "specs", "six-mark-mockups")
os.makedirs(OUT, exist_ok=True)
FIG = os.path.join(ROOT, "exam-library", "figures", "6e6cd33682095955.jpg")
WINF = r"C:\Windows\Fonts"
REG = os.path.join(WINF, "trebuc.ttf"); BOLD = os.path.join(WINF, "trebucbd.ttf"); ITAL = os.path.join(WINF, "trebucit.ttf")
CAV = os.path.join(ROOT, "science-lesson", "references", "Caveat-Regular.ttf")

PX = 100  # px per inch
def pt(p): return int(round(p / 72 * PX))
def F(path, p): return ImageFont.truetype(path, pt(p))

NAVY, NAVY2, GOLD, BG, ANS = "#0D1B5E", "#152347", "#FABB2E", "#EDF2FA", "#FFD60A"
BUILD = "#E65100"
MARK_HI = ["#FFF176", "#90CAF9", "#F8BBD0", "#A5D6A7", "#FFCC80", "#CE93D8"]
MARK_INK = ["#F9A825", "#1565C0", "#AD1457", "#2E7D32", "#EF6C00", "#6A1B9A"]
SW, SH = 1333, 750
NAV_H, ACC_H, BOT_H = 55, 4, 35
TOP = NAV_H + ACC_H + 12
MX = 45
CW = SW - 2 * MX
BOT_Y = SH - BOT_H


def wrap(d, text, font, w):
    words, lines, cur = text.split(), [], ""
    for wd in words:
        t = (cur + " " + wd).strip()
        if d.textlength(t, font=font) <= w: cur = t
        else:
            if cur: lines.append(cur)
            cur = wd
    if cur: lines.append(cur)
    return lines


def chrome(d, header):
    tabs = ["DO NOW", "ENGAGE", "LEARN", "BUILD", "APPLY", "REVIEW"]
    tw = SW / 6
    for i, t in enumerate(tabs):
        act = t == "BUILD"
        d.rectangle([i * tw, 0, (i + 1) * tw, NAV_H], fill=BUILD if act else NAVY2)
        f = F(BOLD if act else REG, 11 if act else 10)
        d.text(((i + 0.5) * tw, NAV_H / 2), t, fill="white", font=f, anchor="mm")
    d.rectangle([0, NAV_H, SW, NAV_H + ACC_H], fill=GOLD)
    d.rectangle([0, TOP, SW, TOP + 38], fill=BUILD)
    d.text((SW / 2, TOP + 19), header, fill="white", font=F(BOLD, 13), anchor="mm")
    d.rectangle([0, BOT_Y, SW, SH], fill=NAVY)
    fb, fi = F(BOLD, 11), F(ITAL, 11)
    d.text((8, BOT_Y + BOT_H / 2), "Learning objective:  ", fill="white", font=fb, anchor="lm")
    x = 8 + d.textlength("Learning objective:  ", font=fb)
    d.text((x, BOT_Y + BOT_H / 2), "Describe how to investigate how the length of a wire affects its resistance", fill="white", font=fi, anchor="lm")
    return TOP + 38 + 10


def chip(d, x, y, n, size=30):
    d.ellipse([x, y, x + size, y + size], fill=MARK_INK[n - 1], outline="white", width=2)
    d.text((x + size / 2, y + size / 2 + 1), str(n), fill="white", font=ImageFont.truetype(BOLD, int(size * 0.6)), anchor="mm")


SUBS = [
    ("What do you change, and how do you change it?", "The length of the wire. Move one crocodile clip along the wire."),
    ("How do you measure the length?", "With the ruler, between the two crocodile clips."),
    ("What two readings do you take for each length?", "Current on the ammeter. Potential difference on the voltmeter."),
    ("How do you get the resistance from them?", "R = V ÷ I, for each length."),
    ("How do you make your results more reliable?", "Repeat each length, ignore anomalies, take a mean."),
    ("Why keep the current low and switch off between readings?", "So the wire does not heat up and change its resistance."),
]


def slide_subquestions():
    im = Image.new("RGB", (SW, SH), BG)
    d = ImageDraw.Draw(im)
    y = chrome(d, "BUILD · 6-MARK BREAKDOWN · BREAK THE QUESTION DOWN")
    # the real question, slim strip + figure thumbnail on the right
    fig = Image.open(FIG).convert("RGB")
    th = 92
    tw = int(fig.width * th / fig.height)
    qh = th + 8
    d.rectangle([MX, y, MX + CW, y + qh], fill="white", outline=GOLD, width=2)
    im.paste(fig.resize((tw, th)), (MX + CW - tw - 4, y + 4))
    q = ("The student plotted a graph of resistance against the length of wire. Describe a method the "
         "student could have used to collect the data needed to plot the graph.")
    fq, fqb = F(REG, 17), F(BOLD, 17)
    lines = wrap(d, "Q   " + q + "   [6 marks]", fq, CW - tw - 30)
    ly = y + (qh - len(lines) * pt(17) * 1.2) / 2
    for i, ln in enumerate(lines):
        if i == 0:
            d.text((MX + 10, ly), "Q", fill=NAVY, font=fqb)
            d.text((MX + 10 + d.textlength("Q   ", font=fqb), ly), ln[2:], fill="#1A1A2E", font=fq)
        else:
            d.text((MX + 10, ly), ln, fill="#1A1A2E", font=fq)
        ly += pt(17) * 1.2
    y += qh + 10
    d.text((MX, y), "Answer each small question in your book. Then put them together into the 6-mark answer.",
           fill="#333333", font=F(ITAL, 14))
    y += 30
    # 2 columns x 3 rows, numbered across (matches the click order: top to bottom, left to right)
    colW = (CW - 14) / 2
    rowH = (BOT_Y - 8 - y - 2 * 12) / 3
    qH, aH = rowH * 0.46, rowH * 0.54 - 6
    fs, fa = F(REG, 18), F(BOLD, 18)
    for i, (sq, sa) in enumerate(SUBS):
        r, c = divmod(i, 2)
        x0 = MX + c * (colW + 14)
        y0 = y + r * (rowH + 12)
        # sub-question box: white, gold border, colour stripe + numbered chip
        d.rectangle([x0, y0, x0 + colW, y0 + qH], fill="white", outline=GOLD, width=2)
        d.rectangle([x0 + 2, y0 + 2, x0 + 12, y0 + qH - 2], fill=MARK_HI[i])
        chip(d, x0 + 20, y0 + (qH - 30) / 2, i + 1)
        ql = wrap(d, sq, fs, colW - 70)
        ty = y0 + (qH - len(ql) * pt(18) * 1.15) / 2
        for ln in ql:
            d.text((x0 + 60, ty), ln, fill="#1A1A2E", font=fs); ty += pt(18) * 1.15
        # answer box right below: navy, yellow text (revealed on click)
        ay = y0 + qH + 6
        if i < 3:
            d.rectangle([x0, ay, x0 + colW, ay + aH], fill=NAVY, outline=GOLD, width=2)
            d.rectangle([x0 + 2, ay + 2, x0 + 12, ay + aH - 2], fill=MARK_HI[i])
            al = wrap(d, sa, fa, colW - 40)
            ty = ay + (aH - len(al) * pt(18) * 1.15) / 2
            for ln in al:
                d.text((x0 + 26, ty), ln, fill=ANS, font=fa); ty += pt(18) * 1.15
        else:  # not yet clicked: show where it will appear
            for k in range(int(x0), int(x0 + colW), 14):
                d.line([k, ay, min(k + 7, x0 + colW), ay], fill="#9AA5C8", width=2)
                d.line([k, ay + aH, min(k + 7, x0 + colW), ay + aH], fill="#9AA5C8", width=2)
            d.text((x0 + colW / 2, ay + aH / 2), f"answer {i + 1} appears on click {i + 1}", fill="#7A86AD",
                   font=F(ITAL, 13), anchor="mm")
    im.save(os.path.join(OUT, "1-sub-questions.png"))


MODEL = [
    ("Move one crocodile clip along the wire", 1), (" to change its length. ", None),
    ("Measure the length between the clips with the ruler.", 2), (" For each length, ", None),
    ("record the current on the ammeter and the potential difference on the voltmeter.", 3), (" ", None),
    ("Calculate the resistance using R = V ÷ I.", 4), (" ", None),
    ("Repeat each length, ignore anomalies and take a mean.", 5), (" ", None),
    ("Keep the current low and switch off between readings so the wire does not heat up.", 6),
]
SHORT = ["Change the length: move a clip", "Measure length: ruler", "Readings: ammeter and voltmeter",
         "Resistance: R = V ÷ I", "Repeat, mean, anomalies", "Low current: wire stays cool"]


def slide_model():
    im = Image.new("RGB", (SW, SH), BG)
    d = ImageDraw.Draw(im)
    y = chrome(d, "BUILD · 6-MARK BREAKDOWN · THE MODEL ANSWER")
    leftW = int(CW * 0.66)
    H = BOT_Y - 8 - y
    # ruled white answer box
    d.rectangle([MX, y, MX + leftW, y + H], fill="white", outline=GOLD, width=2)
    fh = F(CAV, 31)
    lineH = 55
    for ly in range(int(y + 14 + lineH), int(y + H - 6), lineH):
        d.line([MX + 10, ly, MX + leftW - 10, ly], fill="#C9D3EA", width=1)
    # lay out words with their mark numbers
    words = []
    for text, m in MODEL:
        for w in text.split(" "):
            if w: words.append((w, m))
    x0, y0 = MX + 22, y + 14
    cx, cy = x0, y0
    maxx = MX + leftW - 24
    placed = []
    space = d.textlength(" ", font=fh)
    circ = 30
    for k, (w, m) in enumerate(words):
        ww = d.textlength(w, font=fh)
        end_span = m is not None and (k + 1 == len(words) or words[k + 1][1] != m)
        need = ww + (circ + 8 if end_span else 0)
        if cx + need > maxx:
            cx, cy = x0, cy + lineH
        placed.append((w, m, cx, cy, ww, end_span))
        cx += ww + space + (circ + 8 if end_span else 0)
    # bands first (behind), then words, then circles
    runs = []
    for w, m, x, yy, ww, e in placed:
        if m is None: continue
        if runs and runs[-1][0] == m and abs(runs[-1][2] - yy) < 5:
            runs[-1][3] = x + ww
        else:
            runs.append([m, x, yy, x + ww])
    band = Image.new("RGBA", im.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    for m, xa, yy, xb in runs:
        c = MARK_HI[m - 1].lstrip("#")
        rgb = tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
        bd.rectangle([xa - 4, yy + lineH * 0.30, xb + 4, yy + lineH - 6], fill=rgb + (190,))
    im.paste(Image.alpha_composite(im.convert("RGBA"), band).convert("RGB"))
    d = ImageDraw.Draw(im)
    for w, m, x, yy, ww, e in placed:
        d.text((x, yy + 6), w, fill="#1A2A6C", font=fh)
        if e:
            chip(d, x + ww + 6, yy + lineH - circ - 6, m, circ)
    # right: the colour key (each sub-question, same colour as its box on the last slide) + the level
    rx = MX + leftW + 12
    rw = CW - leftW - 12
    keyH = int(H * 0.64)
    d.rectangle([rx, y, rx + rw, y + keyH], fill="white", outline=GOLD, width=2)
    d.text((rx + 12, y + 10), "Where each small question went", fill=NAVY, font=F(BOLD, 15))
    ky = y + 44
    step = (keyH - 54) / 6
    for i, s in enumerate(SHORT):
        d.rectangle([rx + 10, ky + 2, rx + rw - 10, ky + step - 6], fill=MARK_HI[i])
        chip(d, rx + 16, ky + (step - 4 - 26) / 2, i + 1, 26)
        d.text((rx + 50, ky + (step - 4) / 2), s, fill="#1A1A2E", font=F(REG, 15), anchor="lm")
        ky += step
    ly = y + keyH + 10
    lh = H - keyH - 10
    d.rectangle([rx, ly, rx + rw, ly + lh], fill=NAVY, outline=GOLD, width=2)
    lv = ["Level 3 (5-6 marks): the method", "would give a valid result. Key steps", "in a logical order.",
          "Level 2 (3-4): most steps, order unclear."]
    tyy = ly + 14
    for i, t in enumerate(lv):
        d.text((rx + 12, tyy), t, fill=GOLD if i < 3 else "white", font=F(BOLD if i == 0 else REG, 14))
        tyy += 26
    d.text((rx + 12, ly + lh - 30), "Real AQA mark scheme · 44% got 5-6", fill="#C9D3EA", font=F(ITAL, 12))
    im.save(os.path.join(OUT, "2-model-answer-highlighted.png"))


slide_subquestions()
slide_model()
print("ok")
