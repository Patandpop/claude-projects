# Open lesson and print the week: design (30 Oct 2026)

Source: FABLE-WORKPLAN.md Phase 5 ("One-press weekly printing and an open-lesson launcher, one goal"), the morning brief's "Open lesson" idea (brief item 15), and his 13 Oct note ("Print everything / open everything: open each Drive file in the order he will use them, PPTX first, then worksheets"). Written in the Lane C design chat. The tool is built and checked on a fake Drive tree; the first real run waits for Drive (G:) to be back.

## 1. What it does

Two jobs, one small home tool:
- **Open lesson:** one command opens everything for a lesson in the order he uses it: the slides, then the worksheet, then the support sheet (or the answers sheet for a review lesson). "Today" opens every lesson of the day in period order; "next" is the next school day; a class code narrows it to one lesson. Nothing is copied or changed: the files open from their Drive folder as they are.
- **Print the week:** one command makes a single PDF of the whole week's worksheets, behind a cover page that lists each lesson with how many copies (standard copies = the class size; support copies as he says). He prints that one file double-sided at school. A "print" command also sends a day's worksheets straight to the home printer through Word, for the rare day he prints at home.

He prints at school from his personal Drive (that is why the brief gives Drive links), so the pack is made at home and he opens it at school.

## 2. Where the data lives

- **What is planned:** the planner's saved weeks, `planner-state.json` in `Admin\Planner Sync` (the school planner writes it each time he saves; home reads it). A slot holds the day, period, class and the index of the lesson in that class's list. The tool reads only that.
- **Which Drive folder:** `planner/planner-data.json`, where every lesson in every class list carries its folder under `Lessons` (the `rel` field, made by the planner catalogue). A-level lessons already use the Module and Chapter path there.
- **The files:** the lesson folder on `G:\My Drive\Beechen Cliff Science\Lessons\...`. Ours are found by the build's own naming (base.pptx, base_worksheet.docx, base_support_worksheet.docx, or base_answers.docx for a review; the old _PTO names still count). The school's original deck, which the uploader moves into "Beechen Cliff Original Lesson", is never opened. Word's lock files are ignored.
- **The pack:** written to `Desktop\Print packs\Worksheets week of <Monday>.pdf` on the home PC. **It is not put on Drive**: a new Drive location needs his say-so (CLAUDE.md: creates only in sanctioned places). If he names a folder (say `Admin\Print Packs`), one line changes and the write is logged like the uploader's.
- **No pupil data:** the cover carries class codes, lesson titles and copy counts only, and the checks assert that.

## 3. Every screen

None. It is a command for now, and a button later:
- the day screen (Lane C) can get an "Open" button on each lesson block and a "Print this week" button on the Today card, calling these same commands on the home PC;
- the morning brief's "Open lesson" item can point at the same command.

```
node planner/tools/open-lesson.js today                 opens every lesson today, in order
node planner/tools/open-lesson.js next --cls 9AS         opens 9AS's lesson on the next school day
node planner/tools/open-lesson.js list tomorrow          lists what would open, opens nothing
node planner/tools/open-lesson.js print today            prints today's worksheets at home (Word prints)
node planner/tools/open-lesson.js pack                   this week's print pack, cover included
node planner/tools/open-lesson.js pack 2026-11-09 --support 6 --out "D:\packs"
```
`--dry-run` on any of them prints what would happen and does nothing.

## 4. How it works

- Day words: today, tomorrow, next (the next school day, so Friday and the weekend give Monday), or a date.
- The lesson list comes from the saved week for that date (tests, frees, cover and INSET slots are left out); the title, folder and built flag come from the class list.
- The pack: Word (already on the PC) turns each worksheet into a PDF through its own export, in a temporary folder; `week-pack.py` (PyMuPDF, already installed for the exam snippets) makes the A4 cover and joins the PDFs, adding a blank page after any odd-length worksheet so each one starts on a fresh sheet when printed double-sided. The temporary folder is removed.
- A lesson whose folder has nothing built yet is listed as "(nothing built here yet)" and in the pack cover as "(not built yet)", never an error.

## 5. How it is tested

- `node planner/tests/open-lesson.test.js` (21 checks): the day words; a day's lessons in period order with tests and frees left out; title, folder, size and built flag; the week Monday to Friday; file matching (our three files, old names, a review's answers sheet, a deck-only lesson, an empty folder, the school's own deck never picked); the opening order; the print list; the cover lines; no pupil names on the cover.
- End to end on this PC (30 Oct, Drive down): a fake Drive tree with a real built lesson's files and a fake saved week; `list`, `open --dry-run`, `print --dry-run` gave the right files in the right order, and `pack` made a 9-page PDF (cover, a 4-page worksheet, a 4-page support sheet) through Word and PyMuPDF.
- First real run: when G: is back, `list today` then `today`, watched.

## 6. The order to build it in

1. The tool, its checks and the pack (done).
2. Patryk: try `list today` and `today` on a school day with Drive mounted; say where on Drive the pack may live, if anywhere.
3. Later: the day screen's Open and Print this week buttons (Lane C); the brief's Open lesson line.

## 7. Risks

| Risk | What is done about it |
|---|---|
| Opening the wrong file (the school's deck, a stray copy) | Ours are matched by the build's naming; the original-lesson subfolder is never read; the checks cover it. |
| Nothing planned, or Drive down | Plain messages, nothing opened; the pack refuses with "no worksheets". |
| Writing on Drive without permission | The pack goes to the Desktop until he names a Drive folder. Nothing else writes anywhere. |
| Word pops up or hangs | It runs hidden and quits after the export; a dry run never touches Word. |
| Copy counts wrong | Standard = class size from planner-data (he can change it there); support is "as needed" unless he gives a number. |
| Names on the cover | Only class codes, titles and counts; a check asserts no name-shaped text. |
