"""Match KS3 DELBAR pack contents to Patryk's Drive lesson folders.

READ-ONLY. Produces a mapping report only; copies nothing.

Matching is by TITLE, never by number (pack and Drive numbering genuinely disagree).
"""
import os, re, json, difflib, io, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
LIST = os.path.join(HERE, "listings")
DRIVE = "G:/My Drive/Beechen Cliff Science/Lessons"

# pack listing file -> (drive year, drive subject, {pack topic folder: drive topic folder})
PACKS = {
    "4_Yr_7_KS3_Biology_DELBAR_2025": ("Year 7", "Biology", {
        "Topic 1 Cells (Autumn term)": "B1 Cells",
        "Topic 2 Body structure and systems (Spring term)": "B2 Body Systems",
        "Topic 3 Reproduction (Spring term)": "B3 Human and Plant Reproduction",
        "Topic 4 Interdependence (Summer term)": "B4 Interdependence",
    }),
    "5_Yr_7_KS3_Chemistry_DELBAR_2025": ("Year 7", "Chemistry", {
        # NOTE the number swaps - pack Topic 1 is Patryk's C2, pack Topic 2 is his C1
        "Topic 1 Atoms, elements and compounds (Autumn term)": "C2 Atoms, Elements, Compounds and Mixtures",
        "Topic 2 Particles (Autumn term)": "C1 Particles",
        "Topic 3 Separating mixtures (Spring term)": "C3 Separating Mixtures",
        "Topic 4 Earth Science (Summer term)": "C5 Earth Science",
        "Topic 5 Introduction to reactions (Summer term)": "C4 Introduction to Reactions",
    }),
    "6_Yr_7_KS3_Physics_DELBAR_2025": ("Year 7", "Physics", {
        "Topic 1 Forces (Autumn term)": "P1 Forces",
        "Topic 2 Energy (Spring term)": "P2 Energy",
        "Topic 3 Sound and waves (Spring term)": "P3 Sound and Waves",
        "Topic 4 Space (Summer term)": "P4 Earth in Space",
    }),
    "2_Year_8_Biology_DELBAR": ("Year 8", "Biology", {
        "Topic 1 Respiration and photosynthesis Autumn": "B1 Respiration and Photosythesis",
        "Topic 2 Health and digestion Spring": "B2 Health and Digestion",
        "Topic 3 Inheritance, variation and evolution Summer": "B3 Inheritance, Variation and Evolution",
    }),
    "3_Year_8_Chemistry_DELBAR": ("Year 8", "Chemistry", {
        "Topic 1 Acids and alkalis Autumn": "C1 Acids and Alkalis",
        "Topic 2 The periodic table Autumn": "C2 Periodic Table",
        "Topic 3 Metals and non metals_chemical energy Spring": "C3 Metals, Non Metals and Chemical Energy",
        "Topic 4 Atmosphere and resources Summer": "C4 Atmosphere and Resources",
    }),
    "4_Year_8_Physics_DELBAR": ("Year 8", "Physics", {
        "Topic 1 Motion and pressure Autumn": "P1 Motion and Pressure",
        "Topic 2 Energy resources Spring": "P2 Energy Resources",
        "Topic 3 Light Spring": "P3 Light",
        # pack merges electricity + magnetism; Drive keeps them apart. Split decided per lesson.
        "Topic 4+5 Electricity and magnetism Summer": "P4 Electricity|P5 Magnets",
    }),
}

JUNK = re.compile(r"(^|/)(thumbs\.db|\.ds_store|desktop\.ini)$", re.I)
THRESHOLD = 0.72
MERGE_THRESHOLD = 0.80   # bar for a second pack lesson joining a folder already matched
STOP = {"the", "a", "an", "and", "of", "in", "to", "for", "on", "with", "vs", "using", "&"}

def norm(title):
    """Reduce a lesson title to comparable core words."""
    t = title.lower()
    t = re.sub(r"^lesson\s*\d+(\s*-\s*\d+)?", "", t)          # drop leading "Lesson N"
    t = re.sub(r"\(.*?\)", " ", t)                              # drop bracketed tags
    t = t.replace("_", " ")
    t = re.sub(r"\b(core|required)\s+practical\b", " ", t)      # practical marker not a distinguisher
    t = re.sub(r"\band homework set(ting)?\b", " ", t)
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    # Crude singularisation so "Plants cells" and "Plant Cells" compare equal. Without this,
    # a lesson Patryk merged (his "Animal Cells and Plant Cells" = the school's separate
    # "Animal cells" + "Plants cells") reads as an unrelated new lesson.
    words = []
    for w in t.split():
        if w in STOP or not w:
            continue
        if len(w) > 3 and w.endswith("s") and not w.endswith(("ss", "us", "is")):
            w = w[:-1]
        words.append(w)
    return " ".join(words)

def score(a, b):
    na, nb = norm(a), norm(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    sa, sb = set(na.split()), set(nb.split())
    jac = len(sa & sb) / len(sa | sb)
    seq = difflib.SequenceMatcher(None, na, nb).ratio()
    # One title being a fuller version of the other is a strong signal, e.g.
    # "Making compounds Copper Sulphate" vs "Making Compounds" - same lesson, extra detail.
    # Require the smaller title to carry at least two real words, otherwise a one-word title
    # like "The Planets" swallows any longer title containing that word ("Planet data analysis").
    smaller = sa if len(sa) <= len(sb) else sb
    contained = (sa and sb) and (sa <= sb or sb <= sa) and len(smaller) >= 2
    return max(jac, seq * 0.95, 0.86 if contained else 0.0)

# A lesson folder is written either "Lesson 4 ..." or "L4 ..." depending on the pack.
# The negative lookahead stops loose FILES like "L13 WS.pptx" being read as lesson folders.
LESSON_DIR = re.compile(r"^(lesson\s*\d+|l\d+)\b(?!.*\.(pptx?|docx?|pdf|xlsx?|jpe?g|png|wmv|mp4)$)", re.I)

# Folders the pack numbers like lessons but which are not teaching lessons: they hold the
# topic's assessment, DIRT/EBI feedback and homework bundle. Patryk flagged these 2026-07-22.
PSEUDO_LESSON = re.compile(r"formative|assessment point|marking point|^\s*dirt\b", re.I)

def pack_tree(name):
    """{topic: {lesson_or_'' : [files]}} from a zip listing.

    Lesson folders are found at ANY depth under the topic, because some packs add a
    redundant nesting level (Year 8 Physics has 'Topic 4+5 .../Topic 4 .../Lesson 1 ...').
    Anything with no lesson component anywhere in its path is topic-level material.
    """
    tree = {}
    for line in open(os.path.join(LIST, name + ".txt"), encoding="utf8", errors="replace"):
        p = line.rstrip("\n").rstrip("/")
        if not p or JUNK.search(p):
            continue
        parts = p.split("/")[1:]        # drop the pack's own root folder
        if not parts or not parts[0]:
            continue
        topic = parts[0]
        tree.setdefault(topic, {})
        rest = parts[1:]
        if not rest:
            continue
        # first path component that looks like a lesson folder
        idx = next((i for i, c in enumerate(rest) if LESSON_DIR.match(c)), None)
        if idx is None:
            if "." in rest[-1]:                     # a real file, not a bare directory
                tree[topic].setdefault("", []).append(p)
            else:
                tree[topic].setdefault(rest[-1], [])   # empty/support directory
            continue
        lesson = rest[idx]
        tree[topic].setdefault(lesson, [])
        if "." in parts[-1]:                        # only count actual files
            tree[topic][lesson].append(p)
    return tree

def drive_lessons(year, subject, topic):
    d = os.path.join(DRIVE, year, subject, topic)
    if not os.path.isdir(d):
        return None
    return sorted(x for x in os.listdir(d) if os.path.isdir(os.path.join(d, x)))

report = {}
for pack, (year, subject, topicmap) in PACKS.items():
    tree = pack_tree(pack)
    print("=" * 100)
    print(f"PACK: {pack}   ->   {year} / {subject}")
    print("=" * 100)
    pr = {"year": year, "subject": subject, "topics": {}}

    for ptopic, dtopic_spec in topicmap.items():
        dtopics = dtopic_spec.split("|")
        lessons = tree.get(ptopic, {})
        lesson_names = [k for k in lessons if k]
        loose = lessons.get("", [])

        # collect Drive lesson folders across (possibly two) destination topics
        drive_map = {}
        for dt in dtopics:
            dl = drive_lessons(year, subject, dt)
            if dl is None:
                drive_map[dt] = None
            else:
                for x in dl:
                    drive_map.setdefault(dt, []).append(x)

        print(f"\n  PACK TOPIC : {ptopic}")
        print(f"  DRIVE TOPIC: {' + '.join(dtopics)}")
        missing_dt = [dt for dt in dtopics if drive_map.get(dt) is None]
        if missing_dt:
            print(f"    !! Drive topic folder NOT FOUND: {missing_dt}")

        # Split real lesson folders from support folders ("Additional", "unorganised ...").
        real_lessons = [k for k in lesson_names if LESSON_DIR.match(k) and not PSEUDO_LESSON.search(k)]
        pseudo = [k for k in lesson_names if LESSON_DIR.match(k) and PSEUDO_LESSON.search(k)]
        support = [k for k in lesson_names if k not in real_lessons and k not in pseudo]

        # Greedy best-first assignment so one Drive folder can never be claimed twice:
        # score every pair, take the strongest first, then remove both sides from the pool.
        pairs = []
        for pl in real_lessons:
            for dt in dtopics:
                for dl in (drive_map.get(dt) or []):
                    pairs.append((score(pl, dl), pl, dt, dl))
        pairs.sort(key=lambda x: -x[0])

        assigned, used = {}, set()
        for s, pl, dt, dl in pairs:
            if s < THRESHOLD or pl in assigned or (dt, dl) in used:
                continue
            assigned[pl] = (dt, dl, s)
            used.add((dt, dl))

        # Second pass: Patryk sometimes MERGED two of the school's lessons into one of his
        # (his "Animal Cells and Plant Cells" = their separate "Animal cells" + "Plants cells").
        # Those extra halves are still allowed into the folder already taken, but only on a
        # high score, so a genuinely new lesson is never swept into an unrelated folder.
        for s, pl, dt, dl in pairs:
            if pl in assigned or s < MERGE_THRESHOLD:
                continue
            assigned[pl] = (dt, dl, s)

        rows = []
        for pl in sorted(real_lessons, key=lambda s: (int(re.search(r"\d+", s).group()), s)):
            nfiles = len(lessons[pl])
            if pl in assigned:
                dt, dl, s = assigned[pl]
                kind = "MERGE" if sum(1 for k, v in assigned.items() if (v[0], v[1]) == (dt, dl)) > 1 else "MATCH"
                rows.append((pl, nfiles, dt, dl, s, kind))
            else:
                rows.append((pl, nfiles, dtopics[0], None, 0.0, "NEW"))
        for ps in sorted(pseudo):
            rows.append((ps, len(lessons[ps]), dtopics[0], None, 0.0, "ASSESSMENT-BUNDLE"))
        for sp in sorted(support):
            rows.append((sp, len(lessons[sp]), dtopics[0], None, 0.0, "SUPPORT"))

        for pl, nf, dt, dl, s, kind in rows:
            if kind == "MATCH":
                print(f"    [match {s:.2f}] {pl[:52]:<52} -> {dt}/{dl}   ({nf} files)")
            elif kind == "MERGE":
                print(f"    [MERGE {s:.2f}] {pl[:52]:<52} -> {dt}/{dl}   ({nf} files)")
            elif kind == "ASSESSMENT-BUNDLE":
                print(f"    [ ASSESS   ] {pl[:52]:<52} -> assessment/homework bundle, NOT a lesson   ({nf} files)")
            elif kind == "SUPPORT":
                print(f"    [ SUPPORT  ] {pl[:52]:<52} -> extra material, not a lesson   ({nf} files)")
            else:
                print(f"    [ NEW      ] {pl[:52]:<52} -> {dt}/ (create)   ({nf} files)")

        # Drive folders with no pack source
        for dt in dtopics:
            for dl in (drive_map.get(dt) or []):
                if (dt, dl) not in used:
                    print(f"    [ EMPTY    ] {'(no pack source)':<52} -> {dt}/{dl}")
        if loose:
            print(f"    [ TOPIC-LEVEL FILES ] {len(loose)} file(s) sitting in the topic folder:")
            for f in loose[:8]:
                print(f"        - {f.split('/')[-1]}")
            if len(loose) > 8:
                print(f"        ... and {len(loose)-8} more")

        pr["topics"][ptopic] = {
            "driveTopics": dtopics,
            "rows": [{"packLesson": a, "files": b, "driveTopic": c, "driveLesson": d, "score": round(e, 3), "kind": f}
                     for a, b, c, d, e, f in rows],
            "topicLevelFiles": loose,
        }
    report[pack] = pr
    print()

with open(os.path.join(HERE, "ks3_mapping.json"), "w", encoding="utf8") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

# summary
print("=" * 100)
print("SUMMARY")
print("=" * 100)
tot_m = tot_n = tot_f = 0
for pack, pr in report.items():
    m = sum(1 for t in pr["topics"].values() for r in t["rows"] if r["kind"] == "MATCH")
    n = sum(1 for t in pr["topics"].values() for r in t["rows"] if r["kind"] == "NEW")
    fl = sum(r["files"] for t in pr["topics"].values() for r in t["rows"])
    tot_m += m; tot_n += n; tot_f += fl
    print(f"  {pack:<36} {m:>3} matched   {n:>3} new folders   {fl:>4} files")
print(f"  {'TOTAL':<36} {tot_m:>3} matched   {tot_n:>3} new folders   {tot_f:>4} files")
