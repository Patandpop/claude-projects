"""Copy KS4 MNSP pack content onto Drive per ks4_mapping.json.

SAFETY: copies only. Never deletes/moves/renames anything on Drive. Skips files already
present. Every write logged. Extracts ONE subject at a time and clears staging after, because
the three packs total ~14GB against ~21GB free.

Usage: python copy_ks4.py <Physics|Chemistry|Biology|ALL> [--go]
"""
import os, re, json, sys, shutil, subprocess, io, datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
DRIVE_LESSONS = "G:/My Drive/Beechen Cliff Science/Lessons"
DRIVE_ADMIN = "G:/My Drive/Beechen Cliff Science/Admin"
DOWNLOADS = "G:/My Drive/Beechen Cliff Downloads"
STAGE = os.path.join(HERE, "staging_ks4")
LOG = os.path.join(HERE, "drive-write-log.txt")

ROOTS = {"Biology": "0.1 MNSP KS4 Biology", "Chemistry": "0.2 MNSP KS4 Chemistry",
         "Physics": "0.3 MNSP KS4 Physics"}
ZIP_GLOB = {"Biology": "0.1 MNSP KS4 Biology-", "Chemistry": "0.2 MNSP KS4 Chemistry-",
            "Physics": "0.3 MNSP KS4 Physics-"}

JUNK = re.compile(r"(thumbs\.db|\.ds_store|desktop\.ini)$|(^|/)~\$", re.I)
SMALL = {"a","an","and","as","at","but","by","for","from","in","into","of","on","or","the","to","vs","with"}
SEP_MARK = re.compile(r"\(?\b(physics only|chemistry only|biology only|(chem|bio|phys)\w*\s*sep\w*|sep\w*\s*only|separates?|triple)\b\)?", re.I)

# Top-level (non-topic) pack folders -> where they go. None = skip.
TOPLEVEL = {
    # key homeworks -> the Homework hub (this IS the key homework system)
    "key homeworks": ("HOMEWORK", None),
    # revision / do-nows / absentee / skills -> Extra Resources
    "do nows": ("EXTRA", "Do Nows"), "revision": ("EXTRA", "Revision"),
    "absentee": ("EXTRA", "Resources for Absentees"),
    "equations starter tests": ("EXTRA", "Equations Starter Tests"),
    "maths for science": ("EXTRA", "Maths for Science"),
    # superseded / admin clutter -> skip
    "admin": (None, None), "old teaching stuff": (None, None), "to be sorted": (None, None),
}

def classify_toplevel(name):
    n = name.lower()
    for key, val in TOPLEVEL.items():
        if key in n:
            return val
    if n.endswith(".pdf") and "specification" in n:
        return (None, None)          # AQA spec PDFs - skip
    return ("EXTRA", None)           # anything else: keep, don't lose it

def title_case(s):
    out = []
    for i, w in enumerate(s.split()):
        if w.isupper() and len(w) > 1: out.append(w)
        elif w.lower() in SMALL and i > 0: out.append(w.lower())
        else: out.append(w[:1].upper() + w[1:] if w else w)
    return " ".join(out)

HIGHER_MARK = re.compile(r"\(?\b(higher only|HT only|HIGHER|\bHT\b)\b\)?", re.I)

def clean_lesson_name(pack_name, number, separate):
    # Detect Higher-tier from the ORIGINAL name first, before the parenthetical that carries
    # the marker (e.g. '(HT ONLY)') gets stripped below.
    higher = bool(HIGHER_MARK.search(pack_name))
    # Strip the leading lesson-number token in ANY of the pack's styles, keep the title:
    #   '6.1.1.3 lesson 5' | 'B6.1' | 'Lesson 1_' | 'L5' | '3-4' | '2.'
    body = re.sub(
        r"^("
        r"(\d+\.)+\d+\s+lesson\s*\d+[a-z]?"      # spec-code + Lesson N
        r"|[A-Za-z]{0,2}\d+\.\d+[a-z]?"          # code prefix  B6.1 / 6.1
        r"|lesson\s*\d+[a-z]?|l\d+[a-z]?"        # Lesson N / LN
        r"|\d+(-\d+)?\.?"                        # bare number / range / 'N.'
        r")\s*[-_:.]?\s*", "", pack_name, flags=re.I).strip()
    # Remove any tier-marker PARENTHETICAL as a whole first, e.g. '(chem sep only)', '(HT ONLY)',
    # so no stray 'only)' fragment is left behind, then any bare marker words.
    body = re.sub(r"\(\s*[^)]*\b(sep\w*|only|triple|HT|higher)\b[^)]*\)", " ", body, flags=re.I)
    body = SEP_MARK.sub(" ", body)                       # drop any remaining ONLY/Separate marker text
    # Higher-tier marker becomes a bracket tag (matches Patryk's '(Optional)' convention).
    body = HIGHER_MARK.sub(" ", body)
    # the packs SHOUT these; normalise so title casing does not preserve them as acronyms
    body = re.sub(r"\bREQUIRED PRACTICAL\b", "Required Practical", body)
    body = re.sub(r"\bCORE PRACTICAL\b", "Core Practical", body)
    body = re.sub(r"\s*\(\s*\)", "", body)
    tag = ""
    m = re.search(r"\(([^)]*)\)\s*$", body)
    if m and m.group(1).strip():
        tag = f" ({title_case(m.group(1).strip())})"
        body = body[:m.start()].strip()
    body = re.sub(r"[_]+", " - ", body)
    body = re.sub(r"\s*-\s*", " - ", body).strip(" -")
    body = re.sub(r"\s{2,}", " ", body)
    parts = [title_case(p.strip()) for p in body.split(" - ") if p.strip()]
    name = f"Lesson {number} - " + " - ".join(parts) if parts else f"Lesson {number}"
    name += tag
    if higher and "(higher" not in name.lower():
        name += " (Higher)"
    if separate and "(separate)" not in name.lower():
        name += " (Separate)"
    return re.sub(r'[<>:"/\\|?*]', "-", name)[:150].strip()

RESERVED = {}
CLAIMED = set()   # lesson folders already used in THIS run
def next_free(dirpath, wanted):
    used = set(RESERVED.get(dirpath, set()))
    if os.path.isdir(dirpath):
        for f in os.listdir(dirpath):
            m = re.match(r"lesson\s*(\d+)", f, re.I)
            if m and os.path.isdir(os.path.join(dirpath, f)): used.add(int(m.group(1)))
    n = wanted if wanted not in used else (max(used) + 1 if used else wanted)
    RESERVED.setdefault(dirpath, set()).add(n)
    return n, (n != wanted)

def lesson_num(name):
    m = re.search(r"(?:^|\s)lesson\s*(\d+)", name, re.I)   # the word 'Lesson N' (authoritative)
    if m: return int(m.group(1))
    m = re.match(r"[A-Za-z]{0,2}\d+\.(\d+)", name)          # leading code prefix X.N -> N (B6.6 -> 6)
    if m: return int(m.group(1))
    m = re.match(r"l(\d+)", name, re.I)                     # leading 'LN' (not an 'L4' mid-title note)
    if m: return int(m.group(1))
    m = re.match(r"(\d+)", name)                            # leading bare number / range
    if m: return int(m.group(1))
    return 999

def extract(subject):
    d = os.path.join(STAGE, subject)
    if os.path.exists(os.path.join(d, ".ok")): return d
    os.makedirs(d, exist_ok=True)
    zips = sorted(f for f in os.listdir(DOWNLOADS) if f.startswith(ZIP_GLOB[subject]) and f.endswith(".zip"))
    for z in zips:
        print(f"   extracting {z} ...")
        r = subprocess.run(["unzip", "-o", "-q", os.path.join(DOWNLOADS, z), "-d", d],
                           capture_output=True, text=True)
        # returncode 2/3 = a corrupt entry, but unzip still extracts every GOOD file around it.
        # Do not abort - copy what came out and record the archive as damaged.
        if r.returncode not in (0, 1):
            msg = (r.stderr or r.stdout).strip().splitlines()
            bad = [l for l in msg if "error" in l.lower()][:6]
            print(f"   !! {z} is damaged (exit {r.returncode}); extracted what was readable. "
                  f"Missing entries:")
            for b in bad:
                print("        " + b[:160])
            with open(os.path.join(HERE, "damaged-archives.txt"), "a", encoding="utf8") as f:
                f.write(f"{z} exit={r.returncode}\n" + "\n".join("  "+b for b in bad) + "\n")
    open(os.path.join(d, ".ok"), "w").close()
    return d

def safe_component(name):
    """Windows/Drive reject leading-or-trailing spaces and trailing dots in a path component.
    The packs contain e.g. ' Electron Configuration.docx' (leading space), which killed a run."""
    n = name.strip().rstrip(". ")
    n = re.sub(r'[<>:"/\\|?*]', "-", n)
    n = re.sub(r"\s{2,}", " ", n)
    return n or "unnamed"

def safe_relpath(rel):
    if rel == ".":
        return "."
    return os.path.join(*[safe_component(p) for p in rel.split(os.sep) if p not in ("", ".")])

def copy_tree(src, target, go, logf, stats):
    for base, dirs, files in os.walk(src):
        dirs[:] = [x for x in dirs if not JUNK.search(x)]
        rel = safe_relpath(os.path.relpath(base, src))
        for fn in sorted(files):
            fp = os.path.join(base, fn)
            if not os.path.isfile(fp) or JUNK.search(fn): continue
            tgt = target if rel == "." else os.path.join(target, rel)
            outp = os.path.join(tgt, safe_component(fn))
            if os.path.exists(outp):
                stats["skipped"] += 1; continue
            stats["files"] += 1
            if go:
                try:
                    os.makedirs(tgt, exist_ok=True)
                    shutil.copy2(fp, outp)
                    logf.write(f"{datetime.datetime.now().isoformat()} COPY {outp}\n")
                except OSError as e:
                    # never let one awkward filename kill the whole run
                    stats["errors"].append(f"{fp} -> {outp}: {e}")
                    stats["files"] -= 1

def main():
    if len(sys.argv) < 2: sys.exit("usage: copy_ks4.py <Subject|ALL> [--go]")
    go = "--go" in sys.argv
    subs = ["Physics", "Chemistry", "Biology"] if sys.argv[1] == "ALL" else [sys.argv[1]]
    mapping = json.load(open(os.path.join(HERE, "ks4_mapping.json"), encoding="utf8"))
    logf = open(LOG, "a", encoding="utf8") if go else None
    stats = {"files": 0, "created": 0, "skipped": 0, "renamed": [], "errors": []}

    for subject in subs:
        print(f"\n{'='*92}\nSUBJECT {subject}   {'[COPYING]' if go else '[DRY RUN]'}\n{'='*92}")
        packdir = extract(subject)
        root = os.path.join(packdir, ROOTS[subject])
        if not os.path.isdir(root):
            cands = [x for x in os.listdir(packdir) if not x.startswith(".")]
            root = os.path.join(packdir, cands[0]) if cands else packdir

        for key, v in mapping.items():
            if v["subject"] != subject: continue
            ptopic = key.split("/", 1)[1]
            src_topic = os.path.join(root, ptopic)
            if not os.path.isdir(src_topic):
                print(f"  !! missing on disk: {ptopic}"); continue
            year, dtopic = v["year"], v["driveTopic"]
            tdir = os.path.join(DRIVE_LESSONS, year, subject, dtopic)

            for row in v["rows"]:
                src = os.path.join(src_topic, row["packLesson"])
                if not os.path.isdir(src): continue
                if row["kind"] == "MATCH":
                    dest = os.path.join(tdir, row["driveLesson"])
                else:
                    # Re-runs must reuse the folder an earlier run made for this lesson (same title),
                    # not grab the next free number - that is what doubled P1 Energy, P2 Electricity,
                    # P3 Particles and B1 Cells. CLAIMED stops two same-titled pack lessons in ONE
                    # run being merged into a single folder.
                    title = clean_lesson_name(row["packLesson"], 0, row["separate"]).split(" - ", 1)[-1].lower()
                    prior = [f for f in (os.listdir(tdir) if os.path.isdir(tdir) else [])
                             if re.match(r"Lesson \d+\w? - ", f) and f.split(" - ", 1)[1].lower() == title
                             and os.path.join(tdir, f) not in CLAIMED]
                    if prior:
                        dest = os.path.join(tdir, sorted(prior, key=lambda f: int(re.match(r"Lesson (\d+)", f).group(1)))[0])
                    else:
                        num, moved = next_free(tdir, lesson_num(row["packLesson"]))
                        nm = clean_lesson_name(row["packLesson"], num, row["separate"])
                        dest = os.path.join(tdir, nm)
                    CLAIMED.add(dest)
                    if not os.path.isdir(dest):
                        stats["created"] += 1
                        if go: os.makedirs(dest, exist_ok=True); logf.write(
                            f"{datetime.datetime.now().isoformat()} MKDIR {dest}\n")
                copy_tree(src, dest, go, logf, stats)

            # DIRT pseudo-lessons + support folders -> Admin/Extra Resources under the topic
            for name in v.get("pseudo", []) + v.get("support", []):
                src = os.path.join(src_topic, name)
                if not os.path.isdir(src): continue
                copy_tree(src, os.path.join(DRIVE_ADMIN, "Extra Resources", year, subject, dtopic, name),
                          go, logf, stats)

            # files loose in the topic folder -> the topic folder on Drive
            for fn in sorted(os.listdir(src_topic)):
                fp = os.path.join(src_topic, fn)
                if os.path.isfile(fp) and not JUNK.search(fn):
                    outp = os.path.join(tdir, safe_component(fn))
                    if os.path.exists(outp): stats["skipped"] += 1; continue
                    stats["files"] += 1
                    if go:
                        try:
                            os.makedirs(tdir, exist_ok=True); shutil.copy2(fp, outp)
                            logf.write(f"{datetime.datetime.now().isoformat()} COPY {outp}\n")
                        except OSError as e:
                            stats["errors"].append(f"{fp}: {e}"); stats["files"] -= 1

        # ---- top-level (non-topic) pack folders ----
        topics = {k.split("/", 1)[1] for k in mapping if mapping[k]["subject"] == subject}
        for entry in sorted(os.listdir(root)):
            if entry in topics or entry.startswith("."): continue
            ep = os.path.join(root, entry)
            where, sub = classify_toplevel(entry)
            if where is None:
                print(f"  - skip (superseded/admin): {entry}"); continue
            if where == "HOMEWORK":
                target = os.path.join(DRIVE_ADMIN, "Homework", "KS4", subject)
            else:
                target = os.path.join(DRIVE_ADMIN, "Extra Resources", "KS4", subject, sub or entry)
            if os.path.isdir(ep):
                copy_tree(ep, target, go, logf, stats)
            elif os.path.isfile(ep) and not JUNK.search(entry):
                outp = os.path.join(target, safe_component(entry))
                if os.path.exists(outp): stats["skipped"] += 1; continue
                stats["files"] += 1
                if go:
                    try:
                        os.makedirs(target, exist_ok=True); shutil.copy2(ep, outp)
                        logf.write(f"{datetime.datetime.now().isoformat()} COPY {outp}\n")
                    except OSError as e:
                        stats["errors"].append(f"{ep}: {e}"); stats["files"] -= 1

        if go:
            shutil.rmtree(packdir, ignore_errors=True)   # free disk before the next subject
            print(f"  (staging cleared for {subject})")

    if logf: logf.close()
    print(f"\n{'='*92}\nfiles: {stats['files']}   folders created: {stats['created']}   skipped(existing): {stats['skipped']}")
    if stats["errors"]:
        print(f"\n{len(stats['errors'])} file(s) could not be written:")
        for e in stats["errors"][:15]: print("   " + e[:160])
    print("(dry run - nothing written)" if not go else f"Written. Log: {LOG}")

main()
