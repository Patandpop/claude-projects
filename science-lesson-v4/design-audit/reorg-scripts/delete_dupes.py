"""Delete the duplicate lesson folders the copy script made on re-runs (approved by Patryk 2026-10-02).
Only deletes a folder if a LOWER-numbered folder with the same title holds identical files (path+size)."""
import os, re, shutil, sys, datetime
L = "G:/My Drive/Beechen Cliff Science/Lessons"
TARGETS = {"Year 10/Physics/P1 Energy": range(13, 25), "Year 10/Physics/P2 Electricity": range(18, 34),
           "Year 9/Biology/B1 Cells": range(18, 32), "Year 9/Biology/B2 Organisation": range(16, 19),
           "Year 9/Physics/P3 Particles": range(16, 19)}
go = "--go" in sys.argv
def files(d):
    # names compared with runs of spaces collapsed: later runs tidied '  ' to ' ' in filenames
    return {(re.sub(r"\s+", " ", os.path.relpath(os.path.join(b, f), d)), os.path.getsize(os.path.join(b, f)))
            for b, _, fs in os.walk(d) for f in fs}
log = open("drive-write-log.txt", "a", encoding="utf8")
for topic, nums in TARGETS.items():
    tdir = os.path.join(L, topic)
    folders = {}
    for f in os.listdir(tdir):
        m = re.match(r"Lesson (\d+) - (.*)", f)
        if m: folders[f] = (int(m.group(1)), m.group(2).strip().lower())
    for f, (n, title) in sorted(folders.items(), key=lambda x: x[1][0]):
        if n not in nums: continue
        twins = [g for g, (n2, t2) in folders.items() if t2 == title and n2 < n]
        if not twins: print("  KEEP (no lower twin):", topic, f); continue
        twin = min(twins, key=lambda g: folders[g][0])
        a, b = files(os.path.join(tdir, f)), files(os.path.join(tdir, twin))
        if not a <= b: print(f"  KEEP (contents differ from {twin}):", topic, f, len(a), len(b)); continue
        print(f"  {'DELETE' if go else 'would delete'}: {topic}/{f}  ({len(a)} files, same as {twin})")
        if go:
            shutil.rmtree(os.path.join(tdir, f))
            log.write(f"{datetime.datetime.now().isoformat()} DELETE-DUPLICATE {tdir}/{f} (identical to / subset of {twin}; approved by Patryk)\n")
