#!/usr/bin/env python3
"""Dump the visible header/first-text of every slide in every deck, so slides can be labelled."""
import re, zipfile, pathlib, json

ROOT = pathlib.Path(__file__).parent
DECKS = sorted((ROOT / 'decks').glob('*.pptx'))

NAV = {'DO NOW', 'ENGAGE', 'LEARN', 'BUILD', 'APPLY', 'REVIEW'}

def slide_texts(z, name):
    xml = z.read(name).decode('utf8', 'ignore')
    runs = re.findall(r'<a:t>(.*?)</a:t>', xml, re.S)
    runs = [re.sub(r'\s+', ' ', r).strip() for r in runs]
    runs = [r for r in runs if r]
    # drop the leading nav-bar chips so the real section header surfaces
    while runs and runs[0].upper() in NAV:
        runs.pop(0)
    return runs

out = {}
for deck in DECKS:
    with zipfile.ZipFile(deck) as z:
        names = [n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)]
        names.sort(key=lambda n: int(re.search(r'(\d+)', n.split('/')[-1]).group(1)))
        rows = []
        for i, n in enumerate(names, 1):
            t = slide_texts(z, n)
            rows.append({'n': i, 'first': t[:4]})
        out[deck.stem] = rows

lines = []
for deck, rows in out.items():
    lines.append(f'\n===== {deck} =====')
    for r in rows:
        lines.append(f"  {r['n']:>2}  {' | '.join(r['first'])[:110]}")

(ROOT / 'manifest.txt').write_text('\n'.join(lines), encoding='utf8')
(ROOT / 'manifest.json').write_text(json.dumps(out, indent=1), encoding='utf8')
print('written')
