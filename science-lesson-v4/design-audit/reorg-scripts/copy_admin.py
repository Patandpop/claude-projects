"""Phase 4: file the Assessments pack and the Year 7 Key Homeworks into Admin on Drive.

SAFETY: copies only, skips anything already present, logs every write. Archive folders were
left out at extraction and stay in Downloads.
Layout (CLAUDE.md): Admin/Assessment/Year X/Subject/Topic/ holds test + markscheme + PLC together.

Usage: python copy_admin.py [--go]
"""
import os, re, sys, shutil, datetime, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
STAGE = os.environ.get("ADMIN_STAGE", os.path.join(HERE, "staging_admin"))
ADMIN = "G:/My Drive/Beechen Cliff Science/Admin"
ASSESS = os.path.join(ADMIN, "Assessment")
LOG = os.path.join(HERE, "drive-write-log.txt")
ARCHIVE = re.compile(r"^z?\s*archived?", re.I)   # old versions stay in Downloads
JUNK = re.compile(r"(thumbs\.db|\.ds_store|desktop\.ini)$|^~\$", re.I)

KS3_TOPICS = {
    "Year 7": {
        "atoms, elements and compounds": "Chemistry/C2 Atoms, Elements, Compounds and Mixtures",
        "cells": "Biology/B1 Cells", "forces": "Physics/P1 Forces",
        "particles": "Chemistry/C1 Particles", "energy": "Physics/P2 Energy",
        "separating mixtures": "Chemistry/C3 Separating Mixtures",
        "sound and waves": "Physics/P3 Sound and Waves"},
    "Year 8": {
        "acids and alkalis": "Chemistry/C1 Acids and Alkalis",
        "pressure and motion": "Physics/P1 Motion and Pressure",
        "respiration and photosynthesis": "Biology/B1 Respiration and Photosythesis",
        "the periodic table": "Chemistry/C2 Periodic Table", "light": "Physics/P3 Light",
        "energy resources": "Physics/P2 Energy Resources",
        "health and digestion": "Biology/B2 Health and Digestion",
        "metals and non metals-chem energy": "Chemistry/C3 Metals, Non Metals and Chemical Energy",
        "variation and inheritance": "Biology/B3 Inheritance, Variation and Evolution"},
}
Y9_TOPICS = {
    "B1 Cells": "Biology/B1 Cells", "B2 Organisation": "Biology/B2 Organisation",
    "C1 Atomic structure and periodic table": "Chemistry/C1 Atomic Structure",
    "C2 Structure and bonding": "Chemistry/C2 Bonding and Structure",
    "P3 Particle model of matter": "Physics/P3 Particles",
    "P4 Atomic physics": "Physics/P4 Atomic Strucutre",
}
SEP9 = "Separate science version"
NOT_Y9 = "Separate science version - DO NOT USE FOR Y9"
# KS4 pack folder -> destination under Admin/Assessment (year/subject/topic[/subfolder])
KS4 = {
    "KS4 Biology": {
        "B1 Separate science": f"Year 9/Biology/B1 Cells/{SEP9}",
        "B3 Combined Infection and Response": "Year 10/Biology/B3 Infection and Response",
        "B3 Separate Infection": "Year 10/Biology/B3 Infection and Response",
        "B4 Combined Bioenergetics": "Year 10/Biology/B4 Bioenergetics and Plants",
        "B4 separates": "Year 10/Biology/B4 Bioenergetics and Plants",
        "B5 Combined": "Year 10/Biology/B5 Homeostasis",
        "B5 Separate": "Year 10/Biology/B5 Homeostasis",
        "B5 Separate science": "Year 10/Biology/B5 Homeostasis",
        "B6": "Year 11/Biology/B6 Inheritance, variation and evolution",
        "B7 Ecology": "Year 11/Biology/B7 Ecology",
        "End of year mock resources": "KS4/Biology/End of Year Mock Resources",
        "Term 5 formative assessment": "KS4/Biology/Term 5 Formative Assessment"},
    "KS4 Chemistry": {
        "C2 Separate Science": f"Year 9/Chemistry/C2 Bonding and Structure/{SEP9}",
        "C3 Combined Quantitative chemistry": "Year 10/Chemistry/C3 Quantitative Chemistry",
        "C3 Separates Quantitative chemistry": "Year 10/Chemistry/C3 Quantitative Chemistry",
        "C4 Combined": "Year 10/Chemistry/C4 Chemical Changes",
        "C4 Separates": "Year 10/Chemistry/C4 Chemical Changes",
        "C5 Combined": "Year 10/Chemistry/C5 Energy Changes",
        "C5 Separate": "Year 10/Chemistry/C5 Energy Changes",
        "C6 Single science Rates and extent": "Year 11/Chemistry/C6 The rate and extent of chemical change",
        "C7 Separate science organic chemistry": "Year 11/Chemistry/C7 Organic Chemistry",
        "C8 Separates": "Year 11/Chemistry/C8 Chemical Analysis",
        "C9 Combined": "Year 11/Chemistry/C9 Atmosphere",
        "C9 Separates": "Year 11/Chemistry/C9 Atmosphere",
        "End of year Chemistry PLCs": "KS4/Chemistry/End of Year Chemistry PLCs"},
    "KS4 Physics": {
        "P1 Combined Energy": "Year 10/Physics/P1 Energy",
        "P1 separates Energy": "Year 10/Physics/P1 Energy",
        "P2 Combined": "Year 10/Physics/P2 Electricity",
        "P2 Separate": "Year 10/Physics/P2 Electricity",
        "P3 Single science Particles DO NOT USE FOR Y9": f"Year 9/Physics/P3 Particles/{NOT_Y9}",
        "P4 Separate science Atomic physics and radiation DO NOT USE FOR Y9":
            f"Year 9/Physics/P4 Atomic Strucutre/{NOT_Y9}",
        "P5 Combined Forces": "Year 10/Physics/P5 Forces",
        "P5 Separate sciences": "Year 10/Physics/P5 Forces",
        "P6 Waves": "Year 11/Physics/P6 Waves",
        "P7 Single sciences Magnetism and electromagnetism": "Year 11/Physics/P7 Magnetism",
        "zEnd of year mock resources": "KS4/Physics/End of Year Mock Resources"},
}
KEY_HW_Y7 = [  # keyword in filename -> topic folder under Admin/Homework/Year 7
    ("interdependence", "Biology/B4 Interdependence"), ("reproduction", "Biology/B3 Human and Plant Reproduction"),
    ("cells", "Biology/B1 Cells"), ("a,e,c,m", "Chemistry/C2 Atoms, Elements, Compounds and Mixtures"),
    ("separating", "Chemistry/C3 Separating Mixtures"), ("particles", "Chemistry/C1 Particles"),
    ("sound and waves", "Physics/P3 Sound and Waves"), ("energy", "Physics/P2 Energy"),
    ("forces", "Physics/P1 Forces"), ("space", "Physics/P4 Earth in Space"),
]

def safe(name):
    n = re.sub(r'[<>:"/\\|?*]', "-", name.strip().rstrip(". "))
    return re.sub(r"\s{2,}", " ", n)

PLAN = {}   # dest file -> src file
def add(src, dest_dir, rel_name, tag=""):
    parts = [safe(p) for p in rel_name.split(os.sep)]
    dest = os.path.normpath(os.path.join(dest_dir, *parts))
    if dest in PLAN and PLAN[dest] != src:       # Combined + Separate share a filename
        parts[-1] = f"{tag} - {parts[-1]}" if tag else f"(2) {parts[-1]}"
        dest = os.path.normpath(os.path.join(dest_dir, *parts))
    PLAN[dest] = src

def add_tree(src_dir, dest_dir, tag=""):
    for b, dirs, fs in os.walk(src_dir):
        dirs[:] = [d for d in dirs if not ARCHIVE.search(d)]
        for f in fs:
            if JUNK.search(f): continue
            fp = os.path.join(b, f)
            add(fp, dest_dir, os.path.relpath(fp, src_dir), tag)

def tag_of(folder):
    f = folder.lower()
    return "Separate" if ("separate" in f or "single" in f) else ("Combined" if "combined" in f else "")

def plan():
    root = os.path.join(STAGE, "7. KS3-4 Science Assessments")
    for e in os.listdir(root):
        p = os.path.join(root, e)
        if os.path.isfile(p):
            if not JUNK.search(e): add(p, ASSESS, e)
        elif e.strip() == "GCSE past papers":
            add_tree(p, os.path.join(ASSESS, "GCSE Past Papers"))
        elif e in ("Year 7", "Year 8"):
            topics = KS3_TOPICS[e]
            for term in os.listdir(p):
                tp = os.path.join(p, term)
                if ARCHIVE.search(term): continue
                if os.path.isfile(tp):
                    if not JUNK.search(term): add(tp, os.path.join(ASSESS, e), term)
                    continue
                for sub in os.listdir(tp):
                    sp = os.path.join(tp, sub)
                    m = re.match(r"Assessment \d+ (.*)", sub)
                    if os.path.isdir(sp) and m and m.group(1).strip().lower() in topics:
                        add_tree(sp, os.path.join(ASSESS, e, *topics[m.group(1).strip().lower()].split("/")))
                    elif os.path.isdir(sp):
                        add_tree(sp, os.path.join(ASSESS, e, safe(term), safe(sub)))
                    elif not JUNK.search(sub):
                        add(sp, os.path.join(ASSESS, e, safe(term)), sub)
        elif e == "Year 9":
            for sub in os.listdir(p):
                sp = os.path.join(p, sub)
                if ARCHIVE.search(sub): continue
                if os.path.isfile(sp):
                    if not JUNK.search(sub): add(sp, os.path.join(ASSESS, "Year 9"), sub)
                else:
                    add_tree(sp, os.path.join(ASSESS, "Year 9", *Y9_TOPICS.get(sub, safe(sub)).split("/")))
        elif e in KS4:
            for sub in os.listdir(p):
                sp = os.path.join(p, sub)
                if os.path.isfile(sp):
                    if not JUNK.search(sub): add(sp, os.path.join(ASSESS, "KS4", e.split()[1]), sub)
                    continue
                dest = KS4[e].get(sub)
                if dest is None:
                    print(f"  !! unmapped KS4 folder: {e}/{sub} -> KS4/{e.split()[1]}/{sub}")
                    dest = f"KS4/{e.split()[1]}/{safe(sub)}"
                add_tree(sp, os.path.join(ASSESS, *dest.split("/")), tag_of(sub))
        elif ARCHIVE.search(e):
            continue                                     # zArchive KS4 assessments - stays in Downloads
        else:
            print(f"  !! unexpected top-level entry, skipped: {e}")
    kh = os.path.join(STAGE, "8. Y7 Key Homeworks")
    for f in os.listdir(kh):
        if JUNK.search(f) or not os.path.isfile(os.path.join(kh, f)): continue
        topic = next((t for k, t in KEY_HW_Y7 if k in f.lower()), None)
        if topic is None:
            print(f"  !! key homework not matched: {f}"); continue
        add(os.path.join(kh, f), os.path.join(ADMIN, "Homework", "Year 7", *topic.split("/")), f)

def main():
    go = "--go" in sys.argv
    plan()
    new = {d: s for d, s in PLAN.items() if not os.path.exists(d)}
    by_dir = {}
    for d in new: by_dir.setdefault(os.path.dirname(d).replace(ADMIN, "Admin"), 0); by_dir[os.path.dirname(d).replace(ADMIN, "Admin")] += 1
    for k in sorted(by_dir): print(f"  {by_dir[k]:4d}  {k}")
    print(f"\nplanned {len(PLAN)} files, {len(PLAN) - len(new)} already there, {len(new)} to copy")
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
