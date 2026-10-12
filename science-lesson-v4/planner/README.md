# Planner web app

**Setting it up? Follow [SETUP-GUIDE.md](SETUP-GUIDE.md), step by step.**

Plans your week lesson by lesson, lets you drag things about, remembers equipment, and downloads the technicians' order sheet as Excel in the same layout as now. It works the same way as the behaviour tracker: an Apps Script web app that saves into its own Google Sheet, opened with a private link.

## Each time your lessons or progress change (on the home PC)

```
node science-lesson/references/planner-catalogue.js --export planner/planner-data.json
```

Then in the planner, click **Import data** and pick `planner/planner-data.json`. The file holds every class's lessons, equipment, textbook pages and how far each class has got (read from your Planner.xlsx sheets). It contains no student names.

## One-time setup (about 10 minutes)

1. Make a new Google Sheet in your school Drive called **Planner**. Then go to Extensions > Apps Script.
2. Run `node planner/bundle.js` on the home PC. This makes `planner/dist/` with three files.
3. In Apps Script:
   - Replace `Code.gs` with `dist/Code.gs`.
   - Add an HTML file called **Planner** with `dist/Planner.html`.
   - Add an HTML file called **Logic** with `dist/Logic.html`.
4. Run the `setup` function once and allow access. The log shows your **planner key**.
5. Deploy > New deployment > Web app:
   - Execute as **Me**.
   - Who has access: **Anyone within organisation** (the school blocks public apps).
   - Your link is the web app URL plus `?key=YOUR_KEY`.
6. **For the technicians' Excel download:**
   - Upload `Planner.xlsx` to Drive and open it with Google Sheets.
   - Right-click one filled order-sheet tab > Copy to > New spreadsheet.
   - Open that new spreadsheet and copy its ID (the long part of the URL between `/d/` and `/edit`).
   - In Apps Script go to Project Settings > Script properties and add `TEMPLATE_ID` = that ID.
   - The app fills a copy of that tab each time, so the technicians get the layout they know.

## Behaviour is part of the planner (2026-10-12)

One app, one spreadsheet. The behaviour app's code now sits in this Apps Script project, and its data sits in this spreadsheet.

**Switching over (once):**
1. Run `node planner/bundle.js`. Then, in the planner's Apps Script project:
   - Replace `Code.gs`, `Planner` and `Logic` with the new versions from `dist/`.
   - Add a script file **Behaviour** with `dist/Behaviour.gs`.
   - Add HTML files **Phone** (`dist/Phone.html`) and **BoardPage** (`dist/BoardPage.html`).
2. Open the old behaviour spreadsheet and copy its ID from the address bar (between `/d/` and `/edit`). In the planner: Project Settings > Script properties, add `OLD_BEHAVIOUR_SHEET_ID` = that ID.
3. Run `mergeBehaviourData` once and allow access. It copies Students, Log, Sessions, Emails and Settings into this spreadsheet. The planner already has a "Log" tab, so the behaviour ones are called **Behaviour Log** and **Behaviour Settings**. The old sheet is only read, never changed.
4. Deploy > Manage deployments > edit > **New version**.
5. **Phone:** open the planner link with `&view=phone` on the end (the Behaviour tab has "Copy phone link") and add it to the home screen. **Board:** the planner link with `&view=board`, or "Open the board" in the Behaviour tab.
6. Keep the old behaviour app until you are happy. Run `mergeBehaviourData` again just before you stop using it: it only adds entries newer than the ones already copied.

**In the planner:**
- The **Behaviour** tab shows the class's seating plan. It opens on the lesson on now, or the lesson you clicked.
  - Click a name for a positive.
  - Right-click (or switch to "Behaviour point") for a point with a rule.
  - Undo shows for 5 seconds.
  - Today's list is on the right.
- **Lesson cards** show "+4 −1" for what was logged in that lesson. A finished lesson with nothing logged shows "no behaviour". Click either to open Behaviour for that class.
- **Silence and timers** stay on the phone page.

## Using it

- **It opens on the first week after your filled sheets, already planned.** Each class gets its next lessons in turn. A topic ends with an end-of-topic test slot. INSET days and holidays are blank.
- **Click a slot** to change it:
  - pick another lesson, or mark it as a test, cover, custom or N/A;
  - edit the equipment and tick **remember for this lesson** to make it the default from then on;
  - **Add textbook** fills in the page numbers;
  - **Copy build prompt** gives you a ready-made prompt for claude.ai.
- **Review not finished / Homework to collect** attaches a note to that class's next lesson. It shows on the slot as "+1 carry" and goes into its build prompt, so the unfinished part is placed straight after the Do Now.
- **Drag a slot onto another.** It asks whether to shift that class's later lessons along, swap the two, or move just this one. **Undo** steps back.
- **Save week** when you're happy. Next week then carries on from it.
- **Print list** shows everything to photocopy, with quantities equal to class size.
- **Technicians' Excel** downloads the order sheet to email.
- **Flags on a slot:**
  - CHECK: the equipment is a guess, or it's an A-level section with no lesson folder yet.
  - NOT BUILT: the lesson folder has no slides yet.

## For Claude (maintenance)

- `logic.js` is shared by the page (as Logic.html) and the tests. Run `node planner/test-logic.js` after any change.
- `node planner/make-preview.js` builds `preview.html` with the server replaced, so the page can be screenshotted headless before deploying.
- Sequencing rules match `science-lesson/references/planner-catalogue.js`; keep the two in step.
- Behaviour merged in 2026-10-12: `Behaviour.gs` (was the root `Code.gs`), `Phone.html`, `BoardPage.html`, `BEHAVIOUR-HANDOFF.md`, tests in `planner/tests/` (`node planner/tests/server.test.js` loads Code.gs + Behaviour.gs together, so a name clash fails it). The behaviour tabs are mapped in `bSheet_` (`B_TAB`). Behaviour entries are matched to lessons when read (class + time against period times), not stored with a lesson.
- Later: brief and schedule join the same app (memory: project_tool_hub_vision).
- **Home <-> school link (2026-10-07):** the school blocks sharing personal Drive and public school web apps, so `Mailbox.gs` runs on his PERSONAL account (public web app + key) and the school `Code.gs` calls it with UrlFetchApp (MAILBOX_URL / MAILBOX_KEY script properties). Files live in `G:\My Drive\Beechen Cliff Science\Admin\Planner Sync`.
  - "refresh the planner data" = `node science-lesson/references/planner-catalogue.js --export planner/planner-data.json` then `node planner/planner-sync.js push`.
  - "do my planner requests" = `node planner/planner-sync.js requests`, build each one (normal lesson build), then `node planner/planner-sync.js done <id> "<what was done>"`.
  - A request of kind "practice" (from the Tests tab; older ones say "test") = exam practice HOMEWORK, never an in-class test: `node science-lesson/references/test-paper.js --class <cls> --topics "<topics>" --size mini|full --due <date>`. It saves the papers + mark schemes in Admin/Homework/Exam Practice/Year X/Subject/Topic and drops the Forms quiz file(s) in Planner Sync, so they show in the Homework tab. Check the papers, then mark it done.
  - `node planner/planner-sync.js state` = what the school planner last saved. `node planner/test-mailbox.js` simulates both scripts against a fake Drive.
- **Order sheet (2026-10-08):** no template. `logic.js sheetModel()` → `Code.gs exportXlsx()` draws it in a temporary Sheet (bins only that file), and `onePage_()` edits the .xlsx for landscape A4 fit-to-one-page. `node planner/test-ordersheet.js` checks it against a fake Sheet.
- **Exam questions + homework (2026-10-08):** library = AQA GCSE Bio/Chem/Phys (`exam-library/docs`, catalogue.json) + OCR A-level Physics (`exam-library/docs-ocr`, catalogue-ocr.json, read by `exam-library-ocr.js` using the folder's xlsx). `exam-categorise.js` labels kinds (mcq with known answer = self-marking).
  - "make homework for X due DATE" = `node science-lesson/references/homework-forms.js X --due YYYY-MM-DD` (writes homework-X-DATE.json to Planner Sync); at school ⋯ More → Homework quizzes (Code.gs makeHomework: Forms quiz + Classroom DRAFT). `node planner/test-homework-quiz.js` checks it.
  - Do Nows: `node science-lesson/references/do-now-pick.js X [--date]` suggests six from what X has covered (+1 last-year); a lesson JSON with `"doNow": {"auto": true}` fills itself. Banks: `seed-do-now-bank.js` (all classes; Y7-8 easy only; Y12-13 OCR only).
