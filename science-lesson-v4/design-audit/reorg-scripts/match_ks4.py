"""Match/route KS4 MNSP pack contents to Patryk's Drive lesson folders. READ-ONLY report.

Differences from KS3:
- One pack per subject holds ALL topics; each topic routes to a specific YEAR (9/10/11).
- Year 9 topics already have lesson folders on Drive -> fuzzy-match like KS3.
- Year 10/11 topics have NO lesson folders yet -> every lesson is NEW, created from the
  pack sequence.
- Separate/Triple-only lessons are tagged '(Separate)' from the pack's own 'X ONLY' markers.
- Extra naming styles: 'Lesson N', 'LN', '6.1.1.1 lesson N', 'Lesson N_N'.
"""
import os, re, json, difflib, io, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
LIST = os.path.join(HERE, "listings")
DRIVE = "G:/My Drive/Beechen Cliff Science/Lessons"

# pack root prefix inside each zip
ROOTS = {"Biology": "0.1 MNSP KS4 Biology", "Chemistry": "0.2 MNSP KS4 Chemistry",
         "Physics": "0.3 MNSP KS4 Physics"}
LISTS = {"Biology": "mnsp_Biology", "Chemistry": "mnsp_Chemistry", "Physics": "mnsp_Physics"}

# pack topic folder -> (year, drive topic folder)
ROUTING = {
    "Physics": {
        "P1 Energy": ("Year 10", "P1 Energy"),
        "P2 Electricity": ("Year 10", "P2 Electricity"),
        "P3 The Particle Model": ("Year 9", "P3 Particles"),
        "P4 Atomic structure": ("Year 9", "P4 Atomic Strucutre"),
        "P5 Forces": ("Year 10", "P5 Forces"),
        "P6 Waves": ("Year 11", "P6 Waves"),
        "P7 Magnetism": ("Year 11", "P7 Magnetism"),
        "P8 Space": ("Year 11", "P8 Space"),
    },
    "Chemistry": {
        "C1 Atomic structure and the periodic table": ("Year 9", "C1 Atomic Structure"),
        "C2 Bonding, structure and the properties of matter": ("Year 9", "C2 Bonding and Structure"),
        "C3 Quantitative chemistry": ("Year 10", "C3 Quantitative Chemistry"),
        "C4 Chemical changes": ("Year 10", "C4 Chemical Changes"),
        "C5 Energy changes": ("Year 10", "C5 Energy Changes"),
        "C6 The rate and extent of chemical change": ("Year 11", "C6 The rate and extent of chemical change"),
        "C7 Organic Chemistry": ("Year 11", "C7 Organic Chemistry"),
        "C8 Chemical Analysis": ("Year 11", "C8 Chemical Analysis"),
        "C9 Atmosphere": ("Year 11", "C9 Atmosphere"),
        "C10 Using Resources": ("Year 11", "C10 Using Resources"),
    },
    "Biology": {
        "B1 Cell Biology": ("Year 9", "B1 Cells"),
        "B2 Organisation": ("Year 9", "B2 Organisation"),
        "B3 Infection and response": ("Year 10", "B3 Infection and Response"),
        "B4 Bioenergetics and plant tissues": ("Year 10", "B4 Bioenergetics and Plants"),
        "B5 Homeostasis and response": ("Year 10", "B5 Homeostasis"),
        "B6 Inheritance, variation and evolution": ("Year 11", "B6 Inheritance, variation and evolution"),
        "B7 Ecology": ("Year 11", "B7 Ecology"),
    },
}

JUNK = re.compile(r"(thumbs\.db|\.ds_store|desktop\.ini)$|(^|/)~\$", re.I)
# lesson folder: 'Lesson 3', 'L3', optionally a leading spec code '6.1.1.1 lesson 3'
# Three lesson-naming styles across the KS4 packs:
#   'Lesson 5a ...' / 'L5 ...'        (trailing [a-z]? catches 5a required-practical splits, 3b DIRT)
#   '6.1.1.3 lesson 5 ...'            (spec-code prefix, Physics)
#   '2. Life cycle of a star'         (bare number + dot, e.g. P8 Space - number then SPACE then a letter,
#                                      which is what distinguishes it from a '6.1.1.1' spec code)
_NOFILE = r"(?!.*\.(pptx?|docx?|pdf|xlsx?|jpe?g|png|wmv|mp4)$)"
# Lesson-folder naming styles seen across the KS4 packs (a folder, never a file):
#   'Lesson 5a ...' / 'L5 ...'          - word "Lesson"/L + number (+ optional a/b suffix)
#   'Lesson 1_RFM'                      - underscore straight after the number (C3) - the old \b failed here
#   '6.1.1.3 lesson 5 ...'              - spec-code prefix then "lesson N" (Physics)
#   'B6.1 Sexual...' / '6.1 Title'      - topic-code prefix, no "lesson" word (B6)
#   '1 Intro to homeostasis' / '3-4 ..' - bare number or range then a title (B5)
#   '2. Life cycle of a star'           - number-dot-space (P8)
LESSON_DIR = re.compile(
    rf"^("
    rf"((\d+\.)+\d+\s+)?(lesson\s*\d+[a-z]?|l\d+[a-z]?)([\s_.\-]|$)"   # Lesson N / LN, any separator incl _
    rf"|[A-Z]{{0,2}}\d+\.\d+[a-z]?\s+[A-Za-z]"                          # code prefix  B6.1 / 6.1
    rf"|\d+(-\d+)?\s+[A-Za-z]"                                          # bare number / range  '1 Intro', '3-4 Reaction'
    rf"|\d+\.\s+[A-Za-z]"                                               # 'N. Title'  (P8)
    rf"){_NOFILE}", re.I)
# pseudo-lessons: DIRT / homework-dirt / homework check -> not a teaching lesson
PSEUDO = re.compile(
    r"\bDIRT\b|homework\s*-?\s*dirt|homework check|assessment point|marking point"
    r"|\bIMPORTANT\b|use of radioactive sources",   # P4's safety notice is numbered like a lesson
    re.I)
# separate/triple-only markers in a lesson name
SEP = re.compile(r"\b(physics only|chemistry only|biology only|(chem|bio|phys)\w*\s*sep\w*|sep\w*\s*only|separates?|triple)\b", re.I)
STOP = {"the","a","an","and","of","in","to","for","on","with","vs","using","&","part"}

def norm(t):
    t = t.lower()
    t = re.sub(r"^((\d+\.)+\d+\s+)?(lesson\s*\d+[a-z]?|l\d+[a-z]?)\s*[-_]?\s*", "", t)
    t = re.sub(r"\(.*?\)", " ", t)
    t = re.sub(r"\b(physics|chemistry|biology)\s+only\b", " ", t)
    t = re.sub(r"\b(required|core)\s+practical\b", " ", t)
    t = re.sub(r"\bht\b|\bhigher( tier)?\b|\bfoundation\b", " ", t)
    t = t.replace("_", " ")
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    out = []
    for w in t.split():
        if w in STOP or not w: continue
        if len(w) > 3 and w.endswith("s") and not w.endswith(("ss","us","is")): w = w[:-1]
        out.append(w)
    return " ".join(out)

def score(a, b):
    na, nb = norm(a), norm(b)
    if not na or not nb: return 0.0
    if na == nb: return 1.0
    sa, sb = set(na.split()), set(nb.split())
    jac = len(sa & sb) / len(sa | sb)
    seq = difflib.SequenceMatcher(None, na, nb).ratio()
    smaller = sa if len(sa) <= len(sb) else sb
    contained = (sa and sb) and (sa <= sb or sb <= sa) and len(smaller) >= 2
    return max(jac, seq*0.95, 0.86 if contained else 0.0)

def lesson_num(name):
    m = re.search(r"(?:lesson\s*|\bl)(\d+)", name, re.I)   # explicit 'Lesson N' / 'LN'
    if m: return int(m.group(1))
    m = re.match(r"[A-Za-z]{0,2}\d+\.(\d+)", name)          # code prefix X.N -> N  (B6.1 -> 1)
    if m: return int(m.group(1))
    m = re.match(r"(\d+)", name)                            # leading bare number / range
    if m: return int(m.group(1))
    return 999

def pack_tree(subject):
    """{topic: {lesson_or_'': [files]}} merged across all parts of a subject pack."""
    root = ROOTS[subject]
    tree = {}
    for fn in sorted(os.listdir(LIST)):
        if not fn.startswith(LISTS[subject]): continue
        for line in open(os.path.join(LIST, fn), encoding="utf8", errors="replace"):
            p = line.rstrip("\n").rstrip("/")
            if not p or JUNK.search(p): continue
            parts = p.split("/")
            if parts and parts[0] == root: parts = parts[1:]
            if not parts or not parts[0]: continue
            topic = parts[0]
            tree.setdefault(topic, {})
            rest = parts[1:]
            if not rest: continue
            # A lesson folder must sit DIRECTLY under the topic. Lesson-named folders buried
            # inside 'Additional material' / 'ARCHIVE' / 'Revision material' are old or spare
            # copies, not real lessons - counting them inflated C1 from 14 lessons to 36.
            if LESSON_DIR.match(rest[0]):
                lesson = rest[0]
                tree[topic].setdefault(lesson, [])
                if "." in parts[-1]: tree[topic][lesson].append(p)
            elif len(rest) == 1 and "." in rest[0]:
                tree[topic].setdefault("", []).append(p)          # file loose in the topic
            else:
                tree[topic].setdefault(rest[0], [])               # support folder
                if "." in parts[-1]: tree[topic][rest[0]].append(p)
    return tree

def drive_lessons(year, subject, topic):
    d = os.path.join(DRIVE, year, subject, topic)
    if not os.path.isdir(d): return None
    return sorted(x for x in os.listdir(d) if os.path.isdir(os.path.join(d, x)))

report = {}
for subject in ("Physics", "Chemistry", "Biology"):
    tree = pack_tree(subject)
    print("=" * 100); print(f"SUBJECT: {subject}"); print("=" * 100)
    for ptopic, (year, dtopic) in ROUTING[subject].items():
        lessons = tree.get(ptopic, {})
        reals = [k for k in lessons if k and LESSON_DIR.match(k) and not PSEUDO.search(k)]
        pseudos = [k for k in lessons if k and LESSON_DIR.match(k) and PSEUDO.search(k)]
        support = [k for k in lessons if k and not LESSON_DIR.match(k)]
        dls = drive_lessons(year, subject, dtopic)
        exists = dls is not None
        print(f"\n  {ptopic}")
        print(f"    -> {year}/{subject}/{dtopic}   ({'existing folders: '+str(len(dls)) if exists else 'NO lesson folders yet - all NEW'})")
        print(f"    pack: {len(reals)} lessons, {len(pseudos)} DIRT, {len(support)} support folders")

        rows = []
        if exists and dls:
            pairs = sorted(((score(pl, dl), pl, dl) for pl in reals for dl in dls), key=lambda x: -x[0])
            assigned, used = {}, set()
            for s, pl, dl in pairs:
                if s < 0.72 or pl in assigned or dl in used: continue
                assigned[pl] = (dl, s); used.add(dl)
            for pl in sorted(reals, key=lesson_num):
                sep = bool(SEP.search(pl))
                if pl in assigned:
                    dl, s = assigned[pl]; rows.append((pl, len(lessons[pl]), "MATCH", dl, s, sep))
                else:
                    rows.append((pl, len(lessons[pl]), "NEW", None, 0.0, sep))
        else:
            for pl in sorted(reals, key=lesson_num):
                rows.append((pl, len(lessons[pl]), "NEW", None, 0.0, bool(SEP.search(pl))))

        nnew = sum(1 for r in rows if r[2] == "NEW"); nsep = sum(1 for r in rows if r[5])
        print(f"    -> {sum(1 for r in rows if r[2]=='MATCH')} match, {nnew} new, {nsep} tagged (Separate)")
        report[f"{subject}/{ptopic}"] = {
            "year": year, "subject": subject, "driveTopic": dtopic, "existed": exists,
            "rows": [{"packLesson": a, "files": b, "kind": c, "driveLesson": d, "score": round(e,3), "separate": f} for a,b,c,d,e,f in rows],
            "pseudo": pseudos, "support": support,
        }

with open(os.path.join(HERE, "ks4_mapping.json"), "w", encoding="utf8") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

# summary
print("\n" + "=" * 100); print("SUMMARY"); print("=" * 100)
by_year = {}
for k, v in report.items():
    y = v["year"]
    m = sum(1 for r in v["rows"] if r["kind"] == "MATCH")
    n = sum(1 for r in v["rows"] if r["kind"] == "NEW")
    s = sum(1 for r in v["rows"] if r["separate"])
    by_year.setdefault(y, [0,0,0])
    by_year[y][0]+=m; by_year[y][1]+=n; by_year[y][2]+=s
for y in sorted(by_year):
    m,n,s = by_year[y]
    print(f"  {y}: {m} matched, {n} new lessons, {s} tagged (Separate)")
tot_files = sum(r["files"] for v in report.values() for r in v["rows"])
print(f"  total lesson files (excl. top-level material): {tot_files}")
