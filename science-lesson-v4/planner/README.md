# Planner web app

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
- Later: merge into the single hub with the behaviour tracker, brief and schedule (memory: project_tool_hub_vision).
