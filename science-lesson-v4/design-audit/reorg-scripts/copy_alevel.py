"""Phase 5: A-level (OCR Physics A) packs -> Year 12 / Year 13 chapter folders + Admin.

Each textbook section folder (e.g. '11.1 Characteristics of waves') becomes a lesson folder
'Lesson N - Characteristics of Waves' in the matching chapter (N = order within the chapter, so
two sections sharing a number never collide). Loose chapter files stay in the chapter folder;
non-section folders (revision, MCC/Kerboodle resources, booklets) go to Admin/Extra Resources.
SAFETY: copies only, skips existing files, logs every write, Archive folders left in Downloads.
Usage: python copy_alevel.py [--go]
"""
import os, re, sys, shutil, subprocess, datetime, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = os.environ.get("ALEVEL_STAGE", os.path.join(HERE, "staging_alevel"))
# long-path form so pack names ending in a space (e.g. "4. E fields & capacitors ") stay readable
LSTAGE = "\\\\?\\" + os.path.normpath(os.path.abspath(STAGE))
SPELLING = {"Hertzprung Russell": "Hertzsprung-Russell", "Stella Luminosity": "Stellar Luminosity",
            "Kirchoff": "Kirchhoff", "Faradays": "Faraday's"}
DL = "G:/My Drive/Beechen Cliff Downloads"
SCI = "G:/My Drive/Beechen Cliff Science"
LESSONS, ADMIN = f"{SCI}/Lessons", f"{SCI}/Admin"
LOG = os.path.join(HERE, "drive-write-log.txt")
ARCHIVE = re.compile(r"^z?\s*archived?", re.I)
JUNK = re.compile(r"(thumbs\.db|\.ds_store|desktop\.ini)$|^~\$", re.I)
SMALL = {"a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"}
CHAPTER_ZIPS = ["4. Module 4 Electrons Waves and Photons-20260721T170911Z-1-001.zip",
                "Chapter 14 Thermal Physics-20260721T170923Z-1-001.zip",
                "Chapter 15 Ideal Gases-20260721T170925Z-1-001.zip",
                "Chapter 19 Stars-20260721T170932Z-1-001.zip",
                "Chapter 21 Capacitors-20260721T171114Z-1-001.zip",
                "Chapter 22 Electric fields-20260721T171115Z-1-001.zip",
                "Chapter 23 Magnetic fields-20260721T171117Z-1-001.zip",
                "Chapter 27 Medical imaging-20260721T171123Z-1-001.zip"]
OTHER_ZIPS = ["Year 12-20260721T170835Z-1-001.zip", "Year 13-20260721T170841Z-1-001.zip",
              "7. Topic SLOP Booklets-20260721T170803Z-1-001.zip",
              "A level Student folder inserts - required-20260721T171239Z-1-001.zip"]
NEW_CHAPTERS = {19: "Year 13/Chapter 19 - Stars"}   # chapters with a pack but no folder yet

def safe(n):
    return re.sub(r"\s{2,}", " ", re.sub(r'[<>:"/\\|?*]', "-", n.strip().rstrip(". ")))

def title_case(s):
    out = []
    for i, w in enumerate(s.split()):
        if len(w) > 1 and w.isupper(): out.append(w)
        elif i and w.lower() in SMALL: out.append(w.lower())
        else: out.append(w[:1].upper() + w[1:])
    return " ".join(out)

def chapter_dirs():
    found = {}
    for y in ("Year 12", "Year 13"):
        for d in os.listdir(f"{LESSONS}/{y}"):
            m = re.match(r"Chapter (\d+)\b", d)
            if m: found[int(m.group(1))] = f"{y}/{d}"
    for n, rel in NEW_CHAPTERS.items(): found.setdefault(n, rel)
    return found

PLAN = {}
def add(src, dest): PLAN[os.path.normpath(dest)] = src

def walk(root):
    for b, dirs, fs in os.walk(root):
        dirs[:] = [d for d in dirs if not ARCHIVE.search(d)]
        for f in fs:
            if not JUNK.search(f): yield os.path.join(b, f)

def add_tree(src, dest_root):
    for fp in walk(src):
        rel = fp[len(src) + 1:]                     # relpath() would drop trailing spaces
        add(fp, os.path.join(dest_root, *[safe(p) for p in rel.split(os.sep)]))

def extract():
    os.makedirs(STAGE, exist_ok=True)
    for z in CHAPTER_ZIPS + OTHER_ZIPS:
        mark = os.path.join(STAGE, f".ok-{z[:24]}")
        if os.path.exists(mark): continue
        print("   extracting", z)
        r = subprocess.run(["unzip", "-o", "-q", os.path.join(DL, z), "-d", STAGE], capture_output=True, text=True)
        if r.returncode not in (0, 1): print("   !! unzip exit", r.returncode, r.stderr[:300])
        open(mark, "w").close()

def file_chapter(src_ch, num, chapters):
    if num not in chapters:
        print(f"   !! no Drive folder for chapter {num}; skipped"); return
    rel = chapters[num]
    year = rel.split("/")[0]
    tdir = f"{LESSONS}/{rel}"
    sections = []
    for e in os.listdir(src_ch):
        p = os.path.join(src_ch, e)
        if os.path.isfile(p):
            if not JUNK.search(e): add(p, f"{tdir}/{safe(e)}")
            continue
        if ARCHIVE.search(e): continue
        m = re.match(r"^(\d+)\.(\d+)(?:\s*-\s*\d+)?\s*[-.]?\s*(.*)$", e)
        if m and int(m.group(1)) == num:
            sections.append((int(m.group(2)), e, m.group(3)))
        else:
            add_tree(p, f"{ADMIN}/Extra Resources/{year}/{rel.split('/')[1]}/{safe(e)}")
    for i, (_, folder, title) in enumerate(sorted(sections), 1):
        t = title_case(re.sub(r"_s(?![a-z])", "'s", title).replace("_", " ")) or "Section"
        for wrong, right in SPELLING.items(): t = t.replace(wrong, right)
        add_tree(os.path.join(src_ch, folder), f"{tdir}/Lesson {i} - {safe(t)}")

def plan():
    chapters = chapter_dirs()
    m4 = os.path.join(LSTAGE, "4. Module 4 Electrons Waves and Photons")
    for e in os.listdir(m4):
        p = os.path.join(m4, e)
        m = re.match(r"Chapter (\d+)", e)
        if m and os.path.isdir(p): file_chapter(p, int(m.group(1)), chapters)
        elif os.path.isdir(p): add_tree(p, f"{ADMIN}/Extra Resources/Year 12/Module 4/{safe(e)}")
        elif not JUNK.search(e): add(p, f"{ADMIN}/Extra Resources/Year 12/Module 4/{safe(e)}")
    for e in os.listdir(STAGE):
        m = re.match(r"Chapter (\d+)\b", e)
        if m and os.path.isdir(os.path.join(STAGE, e)):
            file_chapter(os.path.join(STAGE, e), int(m.group(1)), chapters)
    for y in ("Year 12", "Year 13"):
        src = os.path.join(LSTAGE, y)
        for e in os.listdir(src):
            if ARCHIVE.search(e): continue
            p = os.path.join(src, e)
            if os.path.isdir(p): add_tree(p, f"{ADMIN}/Assessment/{y}/{safe(e)}")
            elif not JUNK.search(e): add(p, f"{ADMIN}/Assessment/{y}/{safe(e)}")
    add_tree(os.path.join(LSTAGE, "7. Topic SLOP Booklets"), f"{ADMIN}/Extra Resources/Year 12/SLOP Booklets")
    add_tree(os.path.join(LSTAGE, "A level Student folder inserts - required"),
             f"{ADMIN}/Extra Resources/A-level Student Folder Inserts")

def main():
    go = "--go" in sys.argv
    extract(); plan()
    new = {d: s for d, s in PLAN.items() if not os.path.exists(d)}
    counts = {}
    for d in new:
        k = os.path.dirname(d).replace(os.path.normpath(SCI), "")
        k = re.sub(r"(\\Lesson \d+ - [^\\]+).*", r"\1", k)          # one line per lesson folder
        k = re.sub(r"(\\(Extra Resources|Assessment)\\[^\\]+\\[^\\]+).*", r"\1", k)
        counts[k] = counts.get(k, 0) + 1
    for k in sorted(counts): print(f"  {counts[k]:4d}  {k}")
    print(f"\nplanned {len(PLAN)}, already there {len(PLAN) - len(new)}, to copy {len(new)}")
    if not go: print("(dry run - nothing written)"); return
    errs = []
    with open(LOG, "a", encoding="utf8") as log:
        for d, s in new.items():
            try:
                os.makedirs(os.path.dirname(d), exist_ok=True); shutil.copy2(s, d)
                log.write(f"{datetime.datetime.now().isoformat()} COPY {d}\n")
            except OSError as e:
                errs.append(f"{s} -> {d}: {e}")
    print(f"copied {len(new) - len(errs)}; errors {len(errs)}")
    for e in errs: print("  ERR", e)

if __name__ == "__main__":
    main()
