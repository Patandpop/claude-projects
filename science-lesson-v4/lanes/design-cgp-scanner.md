# Design: the CGP book scanner (a topic to page index for the three online CGP books)

Written 31 Oct 2026 by the Lane C design chat, from the memory notes of 15 Oct 2026 (Patryk moved this up the list, ahead of the planner tabs) and the textbook rules of 8 Oct 2026 (page data must be accurate; the planner and the builder share one matcher). The reading and indexing half is built and checked (`planner/tools/cgp-index.js`, `planner/tools/cgp-ocr.ps1`, `planner/tests/cgp-index.test.js`). The capture half needs Patryk at the PC once per book, because only he can log in.

## 1. What it does

Patryk's Year 10 and 11 Combined classes (10C2 now, more next year) use the CGP AQA Combined Science revision guides. The lesson builder and the planner still point those classes at the Kerboodle books, which he has dropped as too hard. This tool reads his three online CGP books and makes the same kind of index `textbook-index.md` already holds for Kerboodle and Activate:

- for every topic page: its title, its topic (chapter) and its printed page number;
- for every questions page (Warm-Up, Exam Questions, Revision Summary): its page number and the page its answers are on, which the "book task" follow-up (plan item 4.2) needs: "answer questions 1 to 3 on page 5, answers on page 9";
- a spot-check list of ten pages for him to confirm against the real book before anything trusts it.

What it never does: it keeps no copy of the book. The page pictures and the words read off them stay in a local folder on the home PC, outside git, Drive and the skill. Only the index (titles, numbers, question numbers) goes into the repo. Nothing is paid for: the browser is already on the PC, the OCR is the one built into Windows.

## 2. Where the data lives

| What | Where | Goes to git? |
|---|---|---|
| His CGP login (browser cookies) | `planner/tools/.cgp-browser-profile/` on the home PC (gitignored), or nowhere with `--forget` | no |
| Page pictures | `cgp-pages-physics/` (and chemistry, biology) in the project folder, gitignored | no |
| Words read off each page, with positions | `cgp-pages-<book>/ocr/page-NNNN.json` | no |
| The index | `cgp-pages-<book>/cgp-index.md` (a block to paste into `science-lesson/references/textbook-index.md`), `cgp-index.json` (every page with its kind, title, chapter, question numbers; the answers map), `spot-check.txt` | the md block and the json, once he has spot-checked them (Lane B pastes them in; see section 7) |
| The made-up test book | `planner/tests/cgp-fake-pages.ps1` draws it; `planner/tests/fixtures/cgp-ocr/` is its OCR output | yes (nothing from a real book) |

## 3. The steps he sees (there is no screen; it is four commands on the home PC)

1. **Capture** (once per book, needs him): `node planner/tools/cgp-index.js capture physics`. A browser window opens on the CGP library page. He logs in, opens the book at its cover, comes back to the terminal and presses Enter. The tool then takes one picture per page, pressing Right arrow between pictures, and stops when the picture stops changing (the last page) or at `--pages N`. He can leave it running; a 300-page book takes about ten minutes at the default 1.5 s a page.
   - `--forget` uses a throwaway browser profile, so nothing of his login stays on the PC (he logs in again next time).
   - If the viewer turns pages with a different key or needs a click, that is a one-line change in `stepCapture` (the key pressed), found on the first real run.
   - Fallback that needs no browser automation at all: he takes the page pictures himself (any screenshot tool, saved as `page-0001.png` and so on in a folder) and starts at step 2. The reading and indexing work on any folder of page pictures.
2. **Read the words**: `node planner/tools/cgp-index.js ocr cgp-pages-physics`. Windows OCR reads every picture (about half a second a page) and writes one JSON per page with every line, every word and where it sits. Already-read pages are skipped, so a long book can be done in sittings.
3. **Index**: `node planner/tools/cgp-index.js index cgp-pages-physics` (the book name and code letter come from the folder name; `--book` and `--letter` override). It writes the three files in section 2 and prints a count: topic pages, question pages, pages matched to answers, doubts.
4. **Spot check** (needs him, two minutes a book): `spot-check.txt` names ten pages: "page-0007.png: printed page 5, 'Warm-Up and Exam Questions' (questions, questions 1, 2, 3, 1.1, 1.2, 2). Open the book at page 5 and confirm." He opens the book at each and says yes or names the wrong ones. The doubts list below it names every page the tool was unsure about (a page number that does not follow its neighbours, a page full of text with no title). A wrong page is fixed by hand in the md block before it is pasted.

## 4. How a page is read (the rules, so a builder can tune them)

From the OCR lines and their positions on the page (`analysePage`):
- **Body size** = the middle line height of the long lines. Everything is measured against it.
- **The title** = the tallest line in the top fifth of the page that is at least 1.4 times the body height. CGP guides print each topic's title in a band at the top.
- **The topic strip** = a small line at the very top edge saying "Topic 1: Energy" (the guides repeat the topic over every page). It gives the chapter number and name; a page without one keeps the last chapter seen.
- **The printed page number** = a one-to-three digit line alone, near the bottom (or top) edge, in an outer corner. Picture order is not page order: the cover and inside cover have no number. Numbers that do not follow their neighbours (one or two pages away) are doubted and replaced by counting on; both are reported.
- **Sub-headings** = lines at least 1.2 times the body height but smaller than the title.
- **The kind of page**, from the title: contents, index, answers, summary ("Revision Summary"), questions (any title with "questions", "exam practice", "practice paper", "mixed questions"), reference (glossary, equations, periodic table, data sheet), otherwise a topic page. A page with no title is "other" (the cover, a picture page) and is reported if it had a lot of text.
- **Questions** = numbered lines under a heading that contains "questions" ("Q1 ...", "1) ...", "1.1 ..."), with the common OCR slips fixed (Q1 read as QI or Ql, 10 read as lO).
- **Answers pages** say which page they answer ("Page 5: Exam Questions"); the tool maps each question page to the first answers page that names it.
- **The contents page** is read too (OCR splits the dotted leaders and page numbers onto their own lines, so lines are joined back by row first): "Topic 1: Energy" headings and "Specific Heat Capacity ...... 4" entries. It is used twice: as the fallback for chapters when a book prints no topic strip (each page takes the topic whose first contents page it falls under), and as a cross-check: every contents entry must be found on that printed page with that title, or it goes on the doubts list ("contents says page 4 is 'Specific Heat Capacity', but page-0006.png was read as 'Latent Heat'").

Section codes are `P1.1, P1.2 ...` (book letter, topic number, count within the topic), which is the shape the existing parser in `textbook-index.js` expects, so the block is read by the same code that reads Kerboodle and Activate; the check proves it (the parser reads exactly the five topic pages of the test book and the existing matcher sends a "Specific Heat Capacity" lesson to the right page). Question and answer lines are written in words ("page 5 (answers on page 9)") so the parser never mistakes them for sections.

## 5. Every server call

None. Everything runs on the home PC. The index reaches the planner the way Kerboodle's does today: through `textbook-index.md` in the repo and the skill package, and through `planner-data.json` (which the planner imports) once Lane B's matcher knows the book.

## 6. How it is tested

`node planner/tests/cgp-index.test.js` (33 checks, all green on 31 Oct):
- the made-up 12-page book (cover, contents, five topic pages over two topics, a Warm-Up and Exam Questions page, a Revision Summary, an Answers page, an Index) from its saved OCR: titles, topic strip, page numbers, sub-headings, questions (with the QI slip), the questions page's exam question 1.1 under "Exam Questions", the answers page naming page 5, contents and index not topics, the cover having neither title nor number;
- the whole index: codes P1.1 to P2.2 with the right pages, the question page with its answers page, the answers map, no doubts on a clean book, ten spot-check lines, the three files written;
- the existing parser (`textbook-index.js`) reads the block unchanged and the existing matcher finds the right page;
- the contents page: entries joined back across OCR's split rows, "Revision Summary for Topic 1" an entry and not a topic, the two topic headings, chapters from the contents page when the strips are blanked, and a doubt when a page's title disagrees with the contents page;
- a page number read wrongly (50 between 2 and 4) becomes 3 and is listed as a doubt; a text-heavy page with no title is reported;
- on Windows only: one page is drawn afresh and read with the real Windows OCR (title and page number right).
Nothing from a real book is in the repo. The capture step is not covered by a check: it needs his login, and its first real run is the test (section 9).

## 7. The order to build it in (what is left)

1. **Done:** the OCR helper, the reader and indexer, the fake book, the checks, the gitignore lines (his login profile, the pages folders).
2. **Him, once per book (about 15 minutes each, mostly waiting):** `npm install --no-save playwright` once (free; the browser is already on this PC), then the capture, read and index commands for physics, chemistry and biology, then the spot check. Say "pages right" or name the wrong ones in any lane chat.
3. **Lane B, after his spot check (small, in `textbook-index.js` and `textbook-index.md`):**
   - paste the three md blocks into `textbook-index.md` and add the three book names to `BOOK_NAMES` ("CGP AQA Combined Science: Physics" and so on);
   - **the class, not just the year, picks the book:** Combined classes (10C2, and next year's Combined sets) search the CGP books; the triple physics classes (10S2, 11S2) keep Kerboodle Physics; Year 9 keeps Activate 2 plus the class's GCSE book. The class's board and tier are already in `class-defaults.json`, so `booksForYear` grows a `cls` (or `combined: true`) argument, and the three callers (build.js, test-review-lesson.js, order-sheet.js) and the planner's autofill pass it. A test per class;
   - `primaryBook` the same way (a Combined class's revision lesson orders two sets of the CGP book);
   - the "Read more" strip on the Apply slide and worksheet reads "CGP Physics, p. 4" for those classes;
   - the planner's textbook autofill (`planner-catalogue.js`) picks up the new sections with no change, because it calls the shared matcher; spot-check three 10C2 lessons;
   - keep the question pages and the answers map (`cgp-index.json`) in `science-lesson/references/` as `cgp-questions.json`, for step 4.
4. **Lane B, the follow-up task (plan item 4.2, after the Memory tab and homework ahead):** after a marked test review or returned key homework, the next lesson's slide after the Do Now offers "1: answer questions N on page P of the CGP book (answers on page A)" from `cgp-questions.json` for the lesson's matched section, and "2: an exam question on the same topic" from the exam library. KS3 keeps Activate (answers on the board, as Activate has none in the book). The planner tick boxes for it are in the memory note of 15 Oct.

## 8. Risks and what to do about them

- **The online viewer may not turn pages with the Right arrow, or may draw two pages at once.** Found on the first capture. Fixes, in order: change the key or click the "next" control (one line); take the picture of the page area only (`clip` in the screenshot call, so the viewer's toolbar is never read as a title); split a two-page spread down the middle before OCR. The reader needs no change for any of these.
- **The viewer may block automation or show a "verify you are human" step.** He does that step himself in the window before pressing Enter. If the site refuses the automated browser outright, the fallback in section 3 step 1 (his own screenshots) still gives the full index; the reading and indexing are the same.
- **Terms of use.** He is a paying reader paging through his own book; the tool keeps an index, not the book. It is still his call (question 3 below). The fallback keeps him in charge of every page turn.
- **OCR slips on real pages** (coloured bands, pictures behind text, small italics). The fake book is clean print, so the real books will raise more doubts. The doubts list and the ten-page spot check exist for this; the rule of 8 Oct stands: nothing is trusted until spot-checked, because a wrong page wastes a lesson and the technicians' time. If a book comes out with many doubts, raise the capture zoom (`deviceScaleFactor` 2) and read again; the OCR step skips nothing when `-Force` is given.
- **Page numbers in the online edition differing from the printed books.** He said on 15 Oct that they match. The spot check confirms it on ten pages per book.
- **The books' layout may not use a topic strip.** Then every page lands in "Other pages" with codes P0.1, P0.2 ... The index is still correct by page; the chapter names can be added from the contents page by hand, or the reader can take them from the contents page (a small addition: read "Topic 1: Energy ... 2" lines on the contents page and assign chapters by page range).
- **His login on the PC.** Kept only in the gitignored profile folder, only if he says so (question 2). `--forget` keeps nothing.

## 9. Open questions for Patryk (asked on the decisions page; the tool carries on with the pick)

1. **"ice books".** On 15 Oct he said CGP "and ice books". Nobody knows what that means (a second publisher's online books, the KS3 Activate online edition, or a slip of the thumb). Answer in a few words; if they are online page-by-page books too, the same three commands index them.
2. **Keeping the CGP login on the home PC:** A keep it in the tool's own browser profile, like Chrome remembering him (my pick: it is his own PC, and the profile folder is outside git); B log in every time (`--forget`).
3. **Go ahead with the automated page turning?** A yes, run the capture (my pick); B he screenshots the pages himself and runs the read and index steps on the folder.

Already answered, recorded here: the three online books are the Combined Science ones whose pages match the printed books pupils hold (15 Oct); triple physics (10S2, 11S2) keeps Kerboodle; KS3 keeps Activate 1 and 2.
