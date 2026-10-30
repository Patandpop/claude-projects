"""Joins a week's worksheet PDFs behind a cover page (planner/tools/open-lesson.js pack).
Usage: python -I week-pack.py cover.txt out.pdf a.pdf b.pdf ...   Writes only out.pdf. No pupil names anywhere."""
import sys
import pymupdf

cover_path, out_path, pdfs = sys.argv[1], sys.argv[2], sys.argv[3:]
lines = open(cover_path, encoding='utf-8').read().split('\n')
doc = pymupdf.open()
page = doc.new_page(width=595, height=842)   # A4
y = 70
for i, line in enumerate(lines):
    size = 18 if i == 0 else 12
    page.insert_text((50, y), line, fontsize=size, fontname='helv', color=(0.05, 0.1, 0.37) if i == 0 else (0, 0, 0))
    y += 30 if i == 0 else 20
for p in pdfs:
    src = pymupdf.open(p)
    doc.insert_pdf(src)
    if len(src) % 2:   # keep each worksheet starting on a fresh sheet when printed double-sided
        doc.new_page(width=595, height=842)
    src.close()
doc.save(out_path)
print('cover + %d worksheets, %d pages' % (len(pdfs), len(doc)))
