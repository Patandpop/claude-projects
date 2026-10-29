"""Read Science Pacing All Years 2026-27.xlsx and pull out the columns marked PTO.

Read-only. For each sheet: shows every column's class/qualification/teacher, marks
Patryk's, then prints the week-by-week grid for the WHOLE class block Patryk sits in
(so the co-teacher split is visible), not just his single column.
"""
import re, html, datetime, json, os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pacing_x")

def load_strings():
    p = os.path.join(SRC, "xl/sharedStrings.xml")
    if not os.path.exists(p):
        return []
    ss = open(p, encoding="utf8").read()
    return [html.unescape(re.sub("<[^>]+>", "", m)) for m in re.findall(r"<si>(.*?)</si>", ss, re.S)]

def sheet_files():
    """Map sheet display name -> worksheet xml path, via the rels file. Skips hidden sheets."""
    wb = open(os.path.join(SRC, "xl/workbook.xml"), encoding="utf8").read()
    rels = open(os.path.join(SRC, "xl/_rels/workbook.xml.rels"), encoding="utf8").read()
    rid_to_target = dict(re.findall(r'<Relationship Id="(rId\d+)"[^>]*Target="(worksheets/[^"]+)"', rels))
    out = []
    for m in re.finditer(r'<sheet ([^>]*)/>', wb):
        attrs = m.group(1)
        name = re.search(r'name="([^"]+)"', attrs)
        rid = re.search(r'r:id="(rId\d+)"', attrs)
        state = re.search(r'state="([^"]+)"', attrs)
        if not name or not rid:
            continue
        hidden = state and state.group(1) == "hidden"
        target = rid_to_target.get(rid.group(1))
        if target:
            out.append((html.unescape(name.group(1)), os.path.join(SRC, "xl", target), hidden))
    return out

def col_num(letters):
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n

def parse_sheet(path, strs):
    xml = open(path, encoding="utf8").read()
    out = {}
    for rn, rc in re.findall(r'<row[^>]*r="(\d+)"[^>]*>(.*?)</row>', xml, re.S):
        cells = {}
        for col, attrs, val, inline in re.findall(
            r'<c r="([A-Z]+)\d+"([^>]*)>(?:<v>([^<]*)</v>|<is><t[^>]*>([^<]*)</t></is>)?', rc
        ):
            if inline:
                t = inline
            elif val:
                t = strs[int(val)] if 't="s"' in attrs and val.isdigit() and int(val) < len(strs) else val
            else:
                continue
            t = html.unescape(str(t)).strip()
            if t:
                cells[col] = t
        if cells:
            out[int(rn)] = cells
    return out

def serial_to_date(v):
    try:
        n = float(v)
    except (ValueError, TypeError):
        return None
    if not (20000 < n < 60000):
        return None
    return (datetime.date(1899, 12, 30) + datetime.timedelta(days=int(n))).isoformat()

def main():
    strs = load_strings()
    result = {}
    for name, path, hidden in sheet_files():
        if hidden:
            print(f"--- SKIPPING hidden sheet: {name}\n")
            continue
        rows = parse_sheet(path, strs)
        if not rows:
            continue
        print("=" * 92)
        print(f"SHEET: {name}   ({os.path.basename(path)})")
        print("=" * 92)

        # locate the teacher-initials row (the one containing PTO), plus the class/qual rows above it
        hdr_teacher = next((rn for rn in sorted(rows)[:10] if any("PTO" in v.upper() for v in rows[rn].values())), None)
        if hdr_teacher is None:
            print("  (no PTO column on this sheet -- not Patryk's)\n")
            result[name] = {"patrykColumns": [], "note": "no PTO column"}
            continue
        above = [rn for rn in sorted(rows) if rn < hdr_teacher]
        hdr_class = above[0] if above else None
        hdr_qual = above[1] if len(above) > 1 else None

        teacher_row = rows[hdr_teacher]
        pto_cols = [c for c, v in teacher_row.items() if "PTO" in v.upper()]

        # forward-fill class names so every column knows which class block it belongs to
        cols_sorted = sorted(teacher_row, key=col_num)
        class_of, cur = {}, ""
        for c in cols_sorted:
            nm = rows.get(hdr_class, {}).get(c, "")
            if nm:
                cur = nm
            class_of[c] = cur
        patryk_classes = {class_of[c] for c in pto_cols}
        block = [c for c in cols_sorted if class_of[c] in patryk_classes and c != "A"]

        print(f"  header rows: class={hdr_class} qual={hdr_qual} teachers={hdr_teacher}")
        print(f"  {'col':>4} | {'class':<12} | {'qualification':<24} | teacher")
        for c in cols_sorted:
            if c == "A":
                continue
            mark = "   <<< PATRYK" if c in pto_cols else ""
            print(f"  {c:>4} | {class_of[c]:<12} | {rows.get(hdr_qual, {}).get(c, ''):<24} | {teacher_row[c]}{mark}")

        print(f"\n  Patryk's class block: {sorted(patryk_classes)}  (his col(s): {pto_cols})")
        hdrs = "  ".join(f"{teacher_row[c][:11]:<13}" for c in block)
        print(f"\n  {'week':<12}  {hdrs}")
        print("  " + "-" * (12 + len(hdrs) + 2))

        weeks = []
        for rn in sorted(rows):
            if rn <= hdr_teacher:
                continue
            row = rows[rn]
            a_val = row.get("A", "")
            date = serial_to_date(a_val)
            vals = [row.get(c, "") for c in block]
            if not any(vals) and not a_val:
                continue
            label = date or a_val[:12]
            cells = "  ".join(f"{v[:11]:<13}" for v in vals)
            # full text for Patryk's own column
            mine = next((row.get(c, "") for c in pto_cols if row.get(c)), "")
            print(f"  {label:<12}  {cells}   | {mine}")
            weeks.append({
                "weekOf": date, "raw": a_val,
                "patryk": mine,
                "block": {teacher_row[c]: row.get(c, "") for c in block},
            })

        result[name] = {
            "sheetFile": os.path.basename(path),
            "patrykColumns": [
                {"column": c, "class": class_of[c], "qualification": rows.get(hdr_qual, {}).get(c, ""), "teacher": teacher_row[c]}
                for c in pto_cols
            ],
            "blockTeachers": {c: teacher_row[c] for c in block},
            "weeks": weeks,
        }
        print()

    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "pacing_parsed.json"), "w", encoding="utf8") as f:
        json.dump(result, f, indent=2)
    print("\nSaved -> pacing_parsed.json")

main()
