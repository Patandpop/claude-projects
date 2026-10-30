"""Makes the installed app's icons (app/src/icons/) from Ulhu's real 16-bit sprite in planner/game-ulhu.js: the sprite
scaled up with hard pixel edges, centred on the planner's navy, with room round it so phones can crop it to a circle.
Run: python app/tools/make-icons.py  (needs Pillow). Re-run only if Ulhu's sprite changes."""
import base64, io, json, os, re
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
js = open(os.path.join(ROOT, 'planner', 'game-ulhu.js'), encoding='utf-8').read()
art = json.loads(re.search(r'window\.ULHU_ART\s*=\s*(\{.*?\});?\s*$', js.splitlines()[0]).group(1))
sprite = Image.open(io.BytesIO(base64.b64decode(art['b16']['idle'].split(',', 1)[1]))).convert('RGBA')
sprite = sprite.crop(sprite.getbbox())   # trim the empty border so he fills the icon
NAVY = (13, 27, 94, 255)
out = os.path.join(ROOT, 'app', 'src', 'icons')
os.makedirs(out, exist_ok=True)
for size, room in ((32, 0.92), (180, 0.7), (192, 0.7), (512, 0.7)):   # 0.7 keeps him inside a phone's circle crop
    f = size * room / max(sprite.size)
    if f >= 2: f = int(f)   # whole-number steps keep every pixel the same size
    big = sprite.resize((round(sprite.width * f), round(sprite.height * f)), Image.NEAREST if f >= 1 else Image.LANCZOS)
    im = Image.new('RGBA', (size, size), NAVY)
    im.alpha_composite(big, ((size - big.width) // 2, (size - big.height) // 2))
    im.convert('RGB').save(os.path.join(out, 'icon-%d.png' % size), optimize=True)
print('app/src/icons made from', sprite.size, 'sprite')
