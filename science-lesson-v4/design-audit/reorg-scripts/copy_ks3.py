"""Copy KS3 pack content onto Drive according to ks3_mapping.json.

SAFETY: copies only. Never deletes, moves or renames anything on Drive. Skips a file that
already exists at the destination. Every write is logged.

Usage:  python copy_ks3.py <pack_key> [--go]      (without --go it is a dry run)
"""
import os, re, json, sys, shutil, subprocess, io, datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf8", errors="replace")

HERE = os.path.dirname(os.path.abspath(__file__))
DRIVE_LESSONS = "G:/My Drive/Beechen Cliff Science/Lessons"
DRIVE_ADMIN = "G:/My Drive/Beechen Cliff Science/Admin"
STAGE = os.path.join(HERE, "staging")
LOG = os.path.join(HERE, "drive-write-log.txt")

ZIPS = {
    "4_Yr_7_KS3_Biology_DELBAR_2025": "4. Yr 7 KS3 Biology DELBAR 2025-20260721T170457Z-1-001.zip",
    "5_Yr_7_KS3_Chemistry_DELBAR_2025": "5. Yr 7 KS3 Chemistry DELBAR 2025-20260721T200657Z-1-001.zip",
    "6_Yr_7_KS3_Physics_DELBAR_2025": "6. Yr 7 KS3 Physics DELBAR 2025-20260721T170500Z-1-001.zip",
    "2_Year_8_Biology_DELBAR": "2. Year 8 Biology DELBAR-20260721T200710Z-1-001.zip",
    "3_Year_8_Chemistry_DELBAR": "3. Year 8 Chemistry DELBAR-20260721T170523Z-1-001.zip",
    "4_Year_8_Physics_DELBAR": "4. Year 8 Physics DELBAR-20260721T200716Z-1-001.zip",
}
DOWNLOADS = "G:/My Drive/Beechen Cliff Downloads"

JUNK = re.compile(r"(thumbs\.db|\.ds_store|desktop\.ini)$|(^|/)~\$", re.I)  # +Office ~$ lock files
HOMEWORK = re.compile(r"homework|\bhw\b", re.I)
SMALL = {"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "of",
         "on", "or", "the", "to", "vs", "with"}

def title_case(s):
    """Patryk's convention: major words capitalised, small joining words lowercase unless first."""
    out = []
    for i, w in enumerate(s.split()):
        if w.isupper() and len(w) > 1:      # keep acronyms: ICT, WS, MRS, GREN
            out.append(w)
        elif w.lower() in SMALL and i > 0:
            out.append(w.lower())
        else:
            out.append(w[:1].upper() + w[1:] if w else w)
    return " ".join(out)

def clean_lesson_name(pack_name, number):
    """'Lesson 4 Core practical - lung dissection' -> 'Lesson 4 - Core Practical - Lung Dissection'."""
    body = re.sub(r"^(lesson\s*\d+|l\d+)\s*[-:]?\s*", "", pack_name, flags=re.I).strip()
    body = re.sub(r"\s*\(could be combined.*?\)", "", body, flags=re.I).strip()
    # keep an (Optional) style tag but normalise its case
    tag = ""
    m = re.search(r"\(([^)]*)\)\s*$", body)
    if m:
        tag = f" ({title_case(m.group(1))})"
        body = body[:m.start()].strip()
    body = re.sub(r"\s*-\s*", " - ", body)
    parts = [title_case(p.strip()) for p in body.split(" - ") if p.strip()]
    return f"Lesson {number} - " + " - ".join(parts) + tag

RESERVED = {}   # dirpath -> set of numbers already claimed during THIS run

def next_free(dirpath, wanted):
    """Use the pack's lesson number if free, else the next number after the highest used.

    Tracks numbers reserved earlier in the same run, so two brand-new lessons that both
    wanted a taken slot don't collide onto the same replacement number.
    """
    used = set(RESERVED.get(dirpath, set()))
    if os.path.isdir(dirpath):
        for f in os.listdir(dirpath):
            m = re.match(r"lesson\s*(\d+)", f, re.I)
            if m and os.path.isdir(os.path.join(dirpath, f)):
                used.add(int(m.group(1)))
    n = wanted if wanted not in used else (max(used) + 1)
    RESERVED.setdefault(dirpath, set()).add(n)
    return n, (n != wanted)

def main():
    if len(sys.argv) < 2:
        sys.exit("usage: copy_ks3.py <pack_key|ALL> [--go]")
    go = "--go" in sys.argv
    keys = list(ZIPS) if sys.argv[1] == "ALL" else [sys.argv[1]]
    mapping = json.load(open(os.path.join(HERE, "ks3_mapping.json"), encoding="utf8"))
    logf = open(LOG, "a", encoding="utf8") if go else None
    grand = {"files": 0, "created": 0, "skipped": 0, "renumbered": []}

    for key in keys:
        d = mapping[key]
        year, subject = d["year"], d["subject"]
        # extract this pack to staging
        packdir = os.path.join(STAGE, key)
        done_marker = os.path.join(packdir, ".extracted_ok")
        if not os.path.exists(done_marker):
            print(f"\n>> extracting {key} (via system unzip) ...")
            os.makedirs(packdir, exist_ok=True)
            # System unzip handles Drive's virtual filesystem far more reliably than Python's
            # zipfile, which can throw OSError 22 mid-stream on large Drive-hosted archives.
            r = subprocess.run(["unzip", "-o", "-q", os.path.join(DOWNLOADS, ZIPS[key]), "-d", packdir],
                               capture_output=True, text=True)
            if r.returncode not in (0, 1):   # 1 = warnings only, still usable
                sys.exit(f"!! extraction failed for {key}: {r.stderr.strip()}")
            open(done_marker, "w").close()
        root = os.path.join(packdir, next(x for x in os.listdir(packdir) if not x.startswith(".")))

        print(f"\n{'='*94}\nPACK {key}  ->  {year}/{subject}   {'[COPYING]' if go else '[DRY RUN]'}\n{'='*94}")

        for ptopic, t in d["topics"].items():
            src_topic = os.path.join(root, ptopic)
            if not os.path.isdir(src_topic):
                print(f"  !! source topic missing on disk: {ptopic}")
                continue

            for row in t["rows"]:
                pl, kind = row["packLesson"], row["kind"]
                # locate the source folder for this pack lesson (may be nested one level)
                cands = [os.path.join(src_topic, pl)]
                for sub in os.listdir(src_topic):
                    p = os.path.join(src_topic, sub, pl)
                    if os.path.isdir(p):
                        cands.append(p)
                src = next((c for c in cands if os.path.isdir(c)), None)
                if src is None:
                    continue

                if kind in ("MATCH", "MERGE"):
                    dest = os.path.join(DRIVE_LESSONS, year, subject, row["driveTopic"], row["driveLesson"])
                elif kind == "NEW":
                    tdir = os.path.join(DRIVE_LESSONS, year, subject, row["driveTopic"])
                    want = int(re.search(r"\d+", pl).group())
                    num, moved = next_free(tdir, want)
                    name = clean_lesson_name(pl, num)
                    dest = os.path.join(tdir, name)
                    if moved:
                        grand["renumbered"].append(f"{year}/{subject}/{row['driveTopic']}: '{pl}' -> {name} (wanted {want})")
                    if not os.path.isdir(dest):
                        print(f"  + CREATE  {row['driveTopic']}/{name}")
                        grand["created"] += 1
                        if go:
                            os.makedirs(dest, exist_ok=True)
                            logf.write(f"{datetime.datetime.now().isoformat()} MKDIR {dest}\n")
                elif kind == "ASSESSMENT-BUNDLE":
                    dest = None     # split per file below
                else:
                    continue

                # Walk the WHOLE source lesson folder, not just its top level: laminates,
                # worksheets and other necessary materials live in nested subfolders like
                # 'Additional/' and would otherwise be dropped (744 such files across KS3).
                for base, dirs, files in os.walk(src):
                    dirs[:] = [d for d in dirs if not JUNK.search(d)]
                    rel = os.path.relpath(base, src)   # preserve internal structure
                    for fn in sorted(files):
                        fp = os.path.join(base, fn)
                        if not os.path.isfile(fp) or JUNK.search(fn):
                            continue
                        if kind == "ASSESSMENT-BUNDLE":
                            # Not a real lesson: all of it is additional material (DIRT, EBI,
                            # help/laminate + the pack's own non-key homework doc). Admin/Homework
                            # is reserved for the KEY homework system (Phase 4), so nothing here
                            # goes there - it all lands in Admin/Extra Resources.
                            target = os.path.join(DRIVE_ADMIN, "Extra Resources", year, subject,
                                                  row["driveTopic"], "Formative")
                        else:
                            # Real lesson: keep the whole folder together, subfolders and all.
                            # Any homework doc inside stays put as additional lesson material -
                            # it is NOT a key homework, so it is not surfaced to Admin/Homework.
                            target = dest if rel == "." else os.path.join(dest, rel)
                        outp = os.path.join(target, fn)
                        if os.path.exists(outp):
                            grand["skipped"] += 1
                            continue
                        grand["files"] += 1
                        if go:
                            os.makedirs(target, exist_ok=True)
                            shutil.copy2(fp, outp)
                            logf.write(f"{datetime.datetime.now().isoformat()} COPY {outp}\n")

            # Topic-level SUPPORT folders (e.g. an 'Additional/' or 'unorganised ...' sitting
            # directly under the topic, not inside a lesson) still hold real materials -
            # laminates, worksheets. Route them to Admin/Extra Resources rather than dropping.
            for row in t["rows"]:
                if row["kind"] != "SUPPORT":
                    continue
                sfolder = find_src(src_topic, row["packLesson"]) if False else None
                # locate the support folder on disk (top level or nested under the topic)
                cands = [os.path.join(src_topic, row["packLesson"])]
                for sub in os.listdir(src_topic):
                    cands.append(os.path.join(src_topic, sub, row["packLesson"]))
                sdir = next((c for c in cands if os.path.isdir(c)), None)
                if not sdir:
                    continue
                for base, dirs, files in os.walk(sdir):
                    dirs[:] = [d for d in dirs if not JUNK.search(d)]
                    rel = os.path.relpath(base, sdir)
                    for fn in sorted(files):
                        fp = os.path.join(base, fn)
                        if not os.path.isfile(fp) or JUNK.search(fn):
                            continue
                        sub = "Homework" if HOMEWORK.search(fn) else "Extra Resources"
                        if sub == "Homework":
                            target = os.path.join(DRIVE_ADMIN, "Homework", year, subject, t["driveTopics"][0])
                        else:
                            target = os.path.join(DRIVE_ADMIN, "Extra Resources", year, subject,
                                                  t["driveTopics"][0], row["packLesson"] if rel == "." else os.path.join(row["packLesson"], rel))
                        outp = os.path.join(target, fn)
                        if os.path.exists(outp):
                            grand["skipped"] += 1
                            continue
                        grand["files"] += 1
                        if go:
                            os.makedirs(target, exist_ok=True)
                            shutil.copy2(fp, outp)
                            logf.write(f"{datetime.datetime.now().isoformat()} COPY {outp}\n")

            # topic-level files: overviews/technician guides stay with the topic,
            # homework docs go to Admin/Homework
            for rel in t["topicLevelFiles"]:
                fn = rel.split("/")[-1]
                if JUNK.search(fn):
                    continue
                fp = os.path.join(packdir, *rel.split("/"))
                if not os.path.isfile(fp):
                    continue
                dt = t["driveTopics"][0]
                if HOMEWORK.search(fn):
                    target = os.path.join(DRIVE_ADMIN, "Homework", year, subject, dt)
                else:
                    target = os.path.join(DRIVE_LESSONS, year, subject, dt)
                outp = os.path.join(target, fn)
                if os.path.exists(outp):
                    grand["skipped"] += 1
                    continue
                grand["files"] += 1
                if go:
                    os.makedirs(target, exist_ok=True)
                    shutil.copy2(fp, outp)
                    logf.write(f"{datetime.datetime.now().isoformat()} COPY {outp}\n")

    if logf:
        logf.close()
    print(f"\n{'='*94}")
    print(f"files to copy : {grand['files']}")
    print(f"folders to create: {grand['created']}")
    print(f"already present (skipped): {grand['skipped']}")
    if grand["renumbered"]:
        print(f"\nRENUMBERED (pack number was already taken by a different lesson):")
        for r in grand["renumbered"]:
            print("   " + r)
    print("\n(dry run - nothing written)" if not go else f"\nWritten. Log: {LOG}")

main()
