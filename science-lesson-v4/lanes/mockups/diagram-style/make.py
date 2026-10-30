"""Three drawing styles for Claude-drawn science diagrams (future goal N1, 19 Oct 2026: one consistent style that
feels hand-drawn and well made, not AI-looking). Same three diagrams in each style, made with matplotlib only
(already installed for graph_gen.py; no paid tool, no network). The sketch style is matplotlib's own xkcd mode with
the Caveat font the builder already ships for handwriting.
Run: python lanes/mockups/diagram-style/make.py   -> writes the PNGs beside this file; index.html shows them."""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Rectangle, Circle, FancyBboxPatch, Ellipse, Polygon

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
CAVEAT = os.path.join(ROOT, 'science-lesson', 'references', 'Caveat-Regular.ttf')
if os.path.exists(CAVEAT):
    font_manager.fontManager.addfont(CAVEAT)
NAVY, GOLD, BLUE, BG, INK = '#0D1B5E', '#FABB2E', '#2b6cd9', '#EDF2FA', '#1A1A2E'

STYLES = {
    # name: (background, line colour, fill, label colour, font family, xkcd)
    'clean':  ('#FFFFFF', NAVY, '#DCE6F7', INK, 'Trebuchet MS', False),
    'sketch': ('#FFFDF7', '#2A2A2A', '#F3E7B9', '#2A2A2A', 'Caveat', True),
    'chalk':  ('#13203F', '#F4F1E8', '#2F4270', '#FFD60A', 'Caveat', True),
}


def particles(ax, S):
    bg, line, fill, lab, fam, _ = S
    for k, (x0, kind) in enumerate([(0.2, 'solid'), (3.6, 'liquid'), (7.0, 'gas')]):
        ax.add_patch(Rectangle((x0, 0.6), 3.0, 2.6, fill=False, lw=2.2, ec=line))
        if kind == 'solid':
            pts = [(x0 + 0.5 + i * 0.5, 1.0 + j * 0.5) for i in range(5) for j in range(4)]
        elif kind == 'liquid':
            pts = [(x0 + 0.45 + i * 0.52 + (0.12 if j % 2 else 0), 0.95 + j * 0.5 + (0.08 if i % 2 else -0.05)) for i in range(5) for j in range(3)]
        else:
            pts = [(x0 + 0.5, 2.7), (x0 + 1.6, 2.9), (x0 + 2.5, 2.2), (x0 + 0.9, 1.5), (x0 + 2.0, 1.1), (x0 + 1.4, 2.1)]
        for (x, y) in pts:
            ax.add_patch(Circle((x, y), 0.19, fc=fill if kind != 'gas' else bg, ec=line, lw=1.6))
        if kind == 'gas':
            for (x, y) in pts:
                ax.annotate('', (x + 0.45, y + 0.25), (x, y), arrowprops=dict(arrowstyle='->', lw=1.4, color=line))
        ax.text(x0 + 1.5, 0.25, kind, ha='center', color=lab, fontsize=15, fontfamily=fam)
    ax.annotate('', (3.6, 3.6), (3.0, 3.6), arrowprops=dict(arrowstyle='->', lw=2, color=line))
    ax.text(5.1, 3.65, 'heat in', ha='center', color=lab, fontsize=14, fontfamily=fam)
    ax.annotate('', (7.1, 3.6), (6.5, 3.6), arrowprops=dict(arrowstyle='->', lw=2, color=line))
    ax.set_xlim(0, 10.3); ax.set_ylim(0, 4.1)


def circuit(ax, S):
    bg, line, fill, lab, fam, _ = S
    ax.plot([1, 1, 9, 9, 6.2], [1, 4, 4, 1, 1], color=line, lw=2.2)
    ax.plot([1, 3.8], [1, 1], color=line, lw=2.2)
    # cell
    ax.plot([3.8, 3.8], [0.6, 1.4], color=line, lw=3.2); ax.plot([4.2, 4.2], [0.8, 1.2], color=line, lw=2.2)
    ax.plot([4.2, 4.6], [1, 1], color=line, lw=2.2); ax.plot([4.6, 4.6], [0.6, 1.4], color=line, lw=3.2); ax.plot([5.0, 5.0], [0.8, 1.2], color=line, lw=2.2)
    ax.plot([5.0, 6.2], [1, 1], color=line, lw=2.2)
    ax.text(4.4, 0.15, 'cell', ha='center', color=lab, fontsize=14, fontfamily=fam)
    # lamp on the top wire
    ax.add_patch(Circle((5, 4), 0.55, fc=fill, ec=line, lw=2.2))
    ax.plot([4.62, 5.38], [3.62, 4.38], color=line, lw=1.8); ax.plot([4.62, 5.38], [4.38, 3.62], color=line, lw=1.8)
    ax.text(5, 4.85, 'lamp', ha='center', color=lab, fontsize=14, fontfamily=fam)
    # ammeter on the right wire
    ax.add_patch(Circle((9, 2.5), 0.5, fc=fill, ec=line, lw=2.2))
    ax.text(9, 2.5, 'A', ha='center', va='center', color=lab, fontsize=15, fontfamily=fam, fontweight='bold')
    ax.text(9.9, 2.5, 'ammeter', va='center', color=lab, fontsize=14, fontfamily=fam)
    # switch on the left wire
    ax.plot([1, 1], [2.1, 2.9], color=bg, lw=4)
    ax.plot([1, 1.45], [2.1, 2.85], color=line, lw=2.2)
    ax.add_patch(Circle((1, 2.1), 0.07, fc=line)); ax.add_patch(Circle((1, 2.9), 0.07, fc=line))
    ax.text(0.2, 2.5, 'switch', va='center', color=lab, fontsize=14, fontfamily=fam, ha='right')
    ax.set_xlim(-1.6, 12); ax.set_ylim(-0.2, 5.4)


def cell(ax, S):
    bg, line, fill, lab, fam, _ = S
    ax.add_patch(Ellipse((5, 2.6), 6.4, 4.2, fc=fill, ec=line, lw=2.4))
    ax.add_patch(Circle((5.4, 2.7), 0.9, fc=bg, ec=line, lw=2.0))
    ax.add_patch(Circle((5.6, 2.9), 0.22, fc=line))
    for (x, y) in [(3.0, 3.4), (3.4, 1.6), (6.9, 1.5), (7.3, 3.5)]:
        ax.add_patch(Ellipse((x, y), 0.9, 0.42, angle=25, fc=bg, ec=line, lw=1.6))
    labels = [('cell membrane', (8.2, 2.6), (9.8, 4.6)), ('nucleus', (5.6, 2.7), (5.2, 5.4)), ('cytoplasm', (4.2, 2.3), (1.2, 0.4)), ('mitochondria', (6.9, 1.5), (9.6, 0.5))]
    for text, pt, at in labels:
        ax.annotate(text, pt, at, color=lab, fontsize=14, fontfamily=fam, ha='center', arrowprops=dict(arrowstyle='-', lw=1.4, color=line))
    ax.set_xlim(0, 12); ax.set_ylim(-0.2, 6.0)


DIAGRAMS = {'particles': particles, 'circuit': circuit, 'cell': cell}

for sname, S in STYLES.items():
    bg, line, fill, lab, fam, xk = S
    for dname, draw in DIAGRAMS.items():
        ctx = plt.xkcd(scale=1.1, length=120, randomness=2) if xk else None
        with (ctx if ctx else plt.rc_context()):
            if sname == 'chalk':
                plt.rcParams['path.effects'] = []   # xkcd mode's white halo round text and lines: wrong on a dark board
            fig, ax = plt.subplots(figsize=(6.4, 3.4), dpi=130)
            fig.patch.set_facecolor(bg); fig.patch.set_linewidth(0); ax.set_facecolor(bg); ax.patch.set_linewidth(0)
            draw(ax, S)
            ax.set_aspect('equal'); ax.axis('off')
            fig.tight_layout(pad=0.3)
            out = os.path.join(HERE, f'{sname}-{dname}.png')
            fig.savefig(out, facecolor=bg)
            plt.close(fig)
        print('wrote', os.path.basename(out))
