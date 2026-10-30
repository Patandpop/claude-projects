"""Makes lanes/mockups/day-screen-b2.html from day-screen-b2.src.html by pasting in Ulhu's real sprites
(planner/game-ulhu.js), so the mock-up is one file that opens anywhere. Run: python lanes/mockups/make-b2.py"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
js = open(os.path.join(HERE, '..', '..', 'planner', 'game-ulhu.js'), encoding='utf-8').read()
art = json.loads(re.search(r'window\.ULHU_ART\s*=\s*(\{.*?\});?\s*$', js.splitlines()[0]).group(1))
src = open(os.path.join(HERE, 'day-screen-b2.src.html'), encoding='utf-8').read()
for size in ('b8', 'b16'):
    for mood, uri in art[size].items():
        src = src.replace('{{%s_%s}}' % (size.upper(), mood.upper()), uri)
left = re.findall(r'\{\{[A-Z0-9_]+\}\}', src)
if left: raise SystemExit('sprites missing: ' + ', '.join(sorted(set(left))))
open(os.path.join(HERE, 'day-screen-b2.html'), 'w', encoding='utf-8', newline='\n').write(src)
print('lanes/mockups/day-screen-b2.html made')
