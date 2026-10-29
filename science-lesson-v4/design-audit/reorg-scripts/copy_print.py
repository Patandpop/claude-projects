"""Phase 4b: KS4 topic overviews, Activate scans + answers, Chemsheets, Year 7 Intro to Science.

SAFETY: copies only, skips anything already present, logs every write. Archive folders skipped
(they stay in Downloads). Extracts with system unzip into local staging first.
Usage: python copy_print.py [--go]
"""
import os, re, sys, shutil, subprocess, datetime, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = os.environ.get("PRINT_STAGE", os.path.join(HERE, "staging_print"))
DL = "G:/My Drive/Beechen Cliff Downloads"
SCI = "G:/My Drive/Beechen Cliff Science"
LESSONS, ADMIN = f"{SCI}/Lessons", f"{SCI}/Admin"
LOG = os.path.join(HERE, "drive-write-log.txt")
ARCHIVE = re.compile(r"^z?\s*archived?", re.I)
JUNK = re.compile(r"(thumbs\.db|\.ds_store|desktop\.ini)$|^~\$", re.I)
ZIPS = ["7. KS4 Unit Front Sheets-20260721T170713Z-1-001.zip",
        "7. Activate Textbook Scans-20260721T171310Z-1-001.zip",   # the 170542 copy is identical
        "7.1 Activate Book Answers-20260721T171311Z-1-001.zip",
        "Chemsheets Resources-20260721T171324Z-1-001.zip",
        "2. Introduction to Science -20260721T213002Z-1-001.zip"]

TOPICS = {  # KS4 code -> Lessons topic folder
    "B1": "Year 9/Biology/B1 Cells", "B2": "Year 9/Biology/B2 Organisation",
    "B3": "Year 10/Biology/B3 Infection and Response", "B4": "Year 10/Biology/B4 Bioenergetics and Plants",
    "B5": "Year 10/Biology/B5 Homeostasis", "B6": "Year 11/Biology/B6 Inheritance, variation and evolution",
    "B7": "Year 11/Biology/B7 Ecology",
    "C1": "Year 9/Chemistry/C1 Atomic Structure", "C2": "Year 9/Chemistry/C2 Bonding and Structure",
    "C3": "Year 10/Chemistry/C3 Quantitative Chemistry", "C4": "Year 10/Chemistry/C4 Chemical Changes",
    "C5": "Year 10/Chemistry/C5 Energy Changes", "C6": "Year 11/Chemistry/C6 The rate and extent of chemical change",
    "C7": "Year 11/Chemistry/C7 Organic Chemistry", "C8": "Year 11/Chemistry/C8 Chemical Analysis",
    "C9": "Year 11/Chemistry/C9 Atmosphere", "C10": "Year 11/Chemistry/C10 Using Resources",
    "P1": "Year 10/Physics/P1 Energy", "P2": "Year 10/Physics/P2 Electricity",
    "P3": "Year 9/Physics/P3 Particles", "P4": "Year 9/Physics/P4 Atomic Strucutre",
    "P5": "Year 10/Physics/P5 Forces", "P6": "Year 11/Physics/P6 Waves", "P7": "Year 11/Physics/P7 Magnetism",
}
INTRO = {1: "Introduction and Safety", 2: "Key Equipment", 3: "Measuring and Collecting Data",
         4: "Variables", 5: "Results Tables", 6: "Bar Graphs", 7: "Line Graphs"}
INTRO_DIR = f"{LESSONS}/Year 7/Science Skills/Introduction to Science"

def safe(n):
    return re.sub(r"\s{2,}", " ", re.sub(r'[<>:"/\\|?*]', "-", n.strip().rstrip(". ")))

PLAN = {}
def add(src, dest):
    PLAN[os.path.normpath(dest)] = src

def walk(root):
    for b, dirs, fs in os.walk(root):
        dirs[:] = [d for d in dirs if not ARCHIVE.search(d)]
        for f in fs:
            if not JUNK.search(f): yield os.path.join(b, f)

def extract():
    os.makedirs(STAGE, exist_ok=True)
    for z in ZIPS:
        mark = os.path.join(STAGE, f".ok-{z[:20]}")
        if os.path.exists(mark): continue
        print("   extracting", z)
        r = subprocess.run(["unzip", "-o", "-q", os.path.join(DL, z), "-d", STAGE], capture_output=True, text=True)
        if r.returncode not in (0, 1): print("   !! unzip exit", r.returncode, r.stderr[:300])
        open(mark, "w").close()

def plan():
    fs_root = os.path.join(STAGE, "7. KS4 Unit Front Sheets")
    for fp in walk(fs_root):
        name = os.path.basename(fp)
        if "template" in name.lower():
            add(fp, f"{ADMIN}/Extra Resources/KS4/{safe(name)}"); continue
        m = re.match(r"([BCP]\d+)\b", name)
        if not m or m.group(1) not in TOPICS:
            print("   !! front sheet not matched:", name); continue
        add(fp, f"{LESSONS}/{TOPICS[m.group(1)]}/{safe(name)}")
    for fp in walk(os.path.join(STAGE, "7. Activate Textbook Scans")):
        add(fp, f"{ADMIN}/Homework/Activate Textbook Scans/{safe(os.path.basename(fp))}")
    ans = os.path.join(STAGE, "7.1 Activate Book Answers")
    for fp in walk(ans):
        rel = [safe(p) for p in os.path.relpath(fp, ans).split(os.sep)]
        add(fp, os.path.join(f"{ADMIN}/Homework/Activate Book Answers", *rel))
    chem = os.path.join(STAGE, "Chemsheets Resources")
    for fp in walk(chem):
        rel = [safe(p) for p in os.path.relpath(fp, chem).split(os.sep)]
        add(fp, os.path.join(f"{ADMIN}/Extra Resources/KS4/Chemistry/Chemsheets Resources", *rel))
    # the pack folder ends in a space; Windows only reads that through the \?\ long-path form
    intro = "\\\\?\\" + os.path.normpath(os.path.abspath(STAGE)) + "\\2. Introduction to Science "
    for fp in walk(intro):
        rel = fp[len(intro) + 1:].split(os.sep)    # relpath() would drop the trailing space
        if len(rel) > 1:   # 'Adapted or Additional Resources' and below
            add(fp, os.path.join(f"{ADMIN}/Extra Resources/Year 7/Science Skills/Introduction to Science",
                                 *[safe(p) for p in rel])); continue
        name = rel[0]
        core = re.sub(r"^(copy of |fca )", "", name, flags=re.I)
        m = re.match(r"L?(\d)[ _]", core)
        n = int(m.group(1)) if m else (3 if "equipment and unit" in name.lower() else None)
        if n not in INTRO:
            print("   !! intro file not matched:", name); continue
        add(fp, f"{INTRO_DIR}/Lesson {n} - {INTRO[n]}/{safe(name)}")

def main():
    go = "--go" in sys.argv
    extract(); plan()
    new = {d: s for d, s in PLAN.items() if not os.path.exists(d)}
    counts = {}
    for d in new:
        k = os.path.dirname(d).replace(os.path.normpath(SCI), "")
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
