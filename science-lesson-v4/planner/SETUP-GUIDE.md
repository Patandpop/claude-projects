# Planner: setup guide (step by step)

You do this once. It takes about 15 minutes. You need:
- your **school** Google account (the one the behaviour tracker uses), on any computer;
- two things from your **home PC**: the folder `planner/dist` (3 files) and the file `planner/planner-data.json`.

---

## Part 0: what those "node ..." lines mean (you can skip this)

Some steps say things like `node planner/bundle.js`. That is a command typed into a **terminal**, a box where you type instructions to the computer instead of clicking.
- `node planner/bundle.js` makes the 3 files you paste into Google (they appear in `planner/dist`).
- `node science-lesson/references/planner-catalogue.js --export planner/planner-data.json` reads your Drive lesson folders and your Planner.xlsx and writes `planner-data.json`: every class's lessons, equipment and how far each class has got.

**You never have to type these yourself.** Say to Claude "refresh the planner data" or "rebuild the planner files" and Claude runs them. Both are already done for today, so the files are ready.

If you ever want to run one yourself in VS Code:
1. Press **Ctrl + `** (the key above Tab). A panel opens at the bottom: that's the terminal. It already points at your project folder.
2. Type the line exactly and press **Enter**.
3. When it prints `planner data written...` or `planner/dist/ ready`, it's done.

---

## Part 1: get the files onto the computer you'll use

If you're setting up at **home**, skip to Part 2.

At **school**, you need the 3 files plus the data file:
1. At home, open File Explorer and go to `C:\Users\magda\claude-projects\science-lesson-v4\planner\`.
2. Copy the **dist** folder and **planner-data.json** to your Google Drive (e.g. drag them into `My Drive`). Drive for Desktop uploads them.
3. At school they're in your Drive.

The files are plain text: you'll open each one and copy what's inside.

## Part 2: make the Sheet and open Apps Script

1. Go to **sheets.google.com** and check the top-right picture is your **school** account.
2. Click the big **+ (Blank spreadsheet)**.
3. Click "Untitled spreadsheet" at the top left and rename it **Planner**.
4. In the menu, click **Extensions → Apps Script**. A new tab opens: that's Apps Script, the place where the app's code lives.
5. On the left, under **Files**, there's a file called `Code.gs` with a few lines in it. Click "Untitled project" at the top and rename it **Planner**.

## Part 3: paste in the 3 files

**File 1: Code.gs**
1. Open `dist/Code.gs`. At home: right-click it → Open with → Notepad. At school: open it from Drive (Open with → Text Editor, or download it and open in Notepad).
2. Press **Ctrl+A** (select everything), then **Ctrl+C** (copy).
3. In Apps Script, click inside `Code.gs`, press **Ctrl+A**, then **Ctrl+V** (paste over the old lines).

**File 2: Planner**
4. In Apps Script, click the **+** next to the word "Files" → **HTML**.
5. Type the name `Planner` and press Enter. Don't type ".html"; Google adds it.
6. Click inside the new file, **Ctrl+A**, **Delete**.
7. Open `dist/Planner.html`, **Ctrl+A**, **Ctrl+C**, then click in the Apps Script file and **Ctrl+V**.

**File 3: Logic** (use `dist/Logic.html`, NOT `logic.js`: Apps Script pages can only load HTML files, so the bundle step wrapped `logic.js` into `Logic.html` for you)
8. **+ → HTML** again, name it `Logic`, delete what's in it, then paste in everything from `dist/Logic.html`.

9. Press **Ctrl+S** to save. You should now have three files on the left: `Code.gs`, `Planner.html`, `Logic.html`.

## Part 4: run setup once and get your private key

1. At the top of Apps Script, next to the **▷ Run** button, there's a dropdown showing a function name. Pick **setup**.
2. Click **▷ Run**.
3. A box says "Authorisation required". Click **Review permissions** and choose your school account.
4. If it says "Google hasn't verified this app", click **Advanced** → **Go to Planner (unsafe)**. It's your own code, which is why Google hasn't checked it.
5. Click **Allow**. It asks to use your Sheets, Drive and Calendar (to send lessons to your calendar) and to connect to Google (for the Excel download).
6. At the bottom, an **Execution log** opens with a line like `Planner key: 3f9a1c2b7d4e`. **Copy that key** (only the letters and numbers) and keep it somewhere.

## Part 5: publish it as a web page

1. Top right: **Deploy → New deployment**.
2. Next to "Select type", click the **⚙ cog → Web app**.
3. Fill in:
   - Description: `Planner`
   - Execute as: **Me**
   - Who has access: **Anyone within Beechen Cliff** (the "within your organisation" option; the school blocks the public one)
4. Click **Deploy**. If it asks for permission again, allow it.
5. Copy the **Web app URL** (ends in `/exec`).
6. Make your link: put `?key=` and your key on the end, like
   `https://script.google.com/a/macros/.../exec?key=3f9a1c2b7d4e`
7. Open that link and **bookmark it**. That's your planner.

## Part 6: load your lessons

1. The planner opens and says "No data yet".
2. Click **⋯ More → Import data** (top right) and choose **planner-data.json**.
3. The week appears, already planned, starting from the first week after the sheets you filled in Planner.xlsx.

## Part 7 (optional): the Technicians' Excel button

This makes the button download your order sheet in exactly the layout the technicians know.
1. Upload **Planner.xlsx** to your school Drive.
2. In Drive, right-click it → **Open with → Google Sheets**.
3. At the bottom, right-click one of your **filled** order-sheet tabs (e.g. "Order Sheet Week A - Oct 5") → **Copy to → New spreadsheet** → open it.
4. Look at the address bar: `https://docs.google.com/spreadsheets/d/`**`1AbC...xyz`**`/edit`. Copy the long code between `/d/` and `/edit`.
5. Back in Apps Script, click **⚙ Project Settings** on the far left. Scroll to **Script properties → Add script property**.
   - Property: `TEMPLATE_ID`
   - Value: the long code
   - Click **Save script properties**.

## Part 8 (optional): let "New lesson" make folders on Drive

When you add a lesson that isn't in the list, the planner can make an empty folder for it, e.g. `Lesson 3a - Cell Models`, inside the topic folder on Drive. It only ever **creates** a folder. It never renames, moves or deletes anything, and every folder it makes is written in a **Log** tab in the planner's Sheet.

It looks for `Beechen Cliff Science > Lessons` in the Drive of the account the planner runs as (your school account). If your lessons live in your **personal** Drive, either:
- share the `Beechen Cliff Science` folder with your school account (Editor), or
- open the `Lessons` folder in Drive, copy the code from the address bar (`.../folders/`**`1AbC...xyz`**), and add a script property `LESSONS_FOLDER_ID` with that code (as in Part 7).

If it can't find the folder, the lesson is still added to the planner and it tells you no folder was made.

---

## Using it

**For a picture-by-picture tour of every part, open `planner/Planner-guide.pptx`.** Taught weeks (from Planner.xlsx) show read-only with a green badge; **Classes** shows where every class is up to; dark mode is the default (light mode in **⋯ More**).


| To... | Do this |
|---|---|
| change a lesson | click it. **Choose the lesson** on the right lists every lesson of its topic in order: green tick = taught (with the date and what you wrote), blue day = planned this week, gold star = what belongs here. Click one. That class's later lessons this week move along, so nothing is skipped |
| look in another topic | the topic box above the list, or type in the search box to search all of them |
| fix the record | tick a lesson you taught that wasn't recognised (or won't teach); untick one that was wrongly matched and it gets planned again |
| technician details | always on show above the list; they save as soon as you click out of a box. Tick **use this every time** to make your version the default |
| didn't finish a lesson | click it, then **Didn't finish: continue next lesson** |
| cover | **Cover** asks: cover work for this lesson (counts as taught), or something else (the lesson moves on) |
| add a lesson in an empty period | click the empty period, pick the class, click the lesson |
| move a lesson | drag it onto another slot, then **Move it here** or **Swap the two**. Whatever was there moves on, never disappears |
| revision lesson / test | **Revision** and **Test** under the technician details. They ask which topic (it picks the one the class is in at that point). When a topic's lessons are all taught it plans a revision lesson, then the test. If either would leave lessons untaught, it lists them first |
| a lesson that isn't in the list | **+ New lesson in this topic** under the list: type the title, choose which lesson it goes after. It goes in this period, gets an empty folder on Drive (`Lesson 3a - Title`, see Part 8) and stays in that class's list from then on |
| clear a period | **Clear** (the lesson moves on to the next period) |
| carry part of a lesson | **Notes and carry-over → Review not finished → next lesson** (shows as "+1 carry" and goes into its build prompt) |
| add a task, tests to mark, a meeting | hover the **All day** row under a day → **+ task / marking / meeting** (click a chip to remove it) |
| see your Google Calendar | **⋯ More → Show my calendar** shows your meetings in the All day row (read only) |
| put lessons in Google Calendar | **⋯ More → Send this week to Google Calendar**: writes the week into a separate calendar called "Lessons (Planner)". Sending again replaces that week; your main calendar is never changed |
| undo | **Undo**, Ctrl+Z, or the Undo link in the black bar at the bottom |
| save | nothing to do: changes save by themselves ("All changes saved", top right). Ctrl+S saves straight away |
| jump to a date | the date box in the top bar, **Today**, or ◀ ▶ |
| one day only | **Day**, or click a day's name. **Week** goes back |
| shortcuts | press **?** |

Flags on a lesson: **MISSED** = skipped earlier in this topic; **CHECK** = the equipment is a guess; **NOT BUILT** = the Drive folder has no slides yet; **NO FOLDER** = the technician guide lists it but Drive has no folder; **COVER** = cover work for this lesson; **DOUBLE** = the second half of a double lesson.

## When things change

- **Your lessons or Planner.xlsx changed:** ask Claude to "refresh the planner data", then **⋯ More → Import data** again and pick the new planner-data.json.
- **Claude changes the app's code:** ask Claude to "rebuild the planner files", then paste the 3 new files over the old ones (Part 3), Ctrl+S, then **Deploy → Manage deployments → ✏ (pencil) → Version: New version → Deploy**. The link stays the same.

## If something goes wrong

- **"Locked":** the link is missing `?key=...` or the key is wrong. Run `setup` again to see it in the log.
- **"Could not load":** run `setup` once more and allow the permissions.
- **"Old data file":** ask Claude to refresh the planner data and import it again.
- **The Calendar button fails the first time:** Google needs the Calendar permission. Run `setup` once more and allow it.
- Anything else: screenshot it and send it to Claude.
