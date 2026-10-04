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

**File 3: Logic**
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
2. Click **Import data** (top bar) and choose **planner-data.json**.
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

---

## Using it

| To... | Do this |
|---|---|
| change a lesson | click it, type a few letters in the box on the right (e.g. "heart"), press **Enter**. ★ marks the next lesson in order |
| add a lesson in an empty period | click the empty period, pick the class, type, **Enter** |
| move a lesson | drag it onto another slot; it asks: shift that class's later lessons along / swap / move just this one |
| make it a test / cover / clear it | buttons under the lesson search |
| fix equipment | edit it, tick **remember for this lesson** to make it the default from now on, then **Apply changes** |
| carry unfinished work | **Review not finished → next lesson** (shows as "+1 carry" on the next lesson and goes into its build prompt) |
| add a task, tests to mark, a meeting | hover the **All day** row under a day → **+ task / marking / meeting** (click a chip to remove it) |
| see your Google Calendar | **My calendar** shows your meetings in the All day row (read only) |
| put lessons in Google Calendar | **Send to Google Calendar**: writes the week into a separate calendar called "Lessons (Planner)". Sending again replaces that week; your main calendar is never changed |
| undo | **Undo**, Ctrl+Z, or the Undo link in the black bar at the bottom |
| save | **Save** or Ctrl+S. A gold dot means unsaved changes; the page warns you before leaving |
| jump to a date | the date box in the top bar, **Today**, or ◀ ▶ |
| one day only | **Day**, or click a day's name. **Week** goes back |
| shortcuts | press **?** |

Flags on a lesson: **CHECK** means the equipment is a guess; **NOT BUILT** means the Drive folder has no slides yet; **DOUBLE** means the second half of a double lesson.

## When things change

- **Your lessons or Planner.xlsx changed:** ask Claude to "refresh the planner data", then click **Import data** again and pick the new planner-data.json.
- **Claude changes the app's code:** ask Claude to "rebuild the planner files", then paste the 3 new files over the old ones (Part 3), Ctrl+S, then **Deploy → Manage deployments → ✏ (pencil) → Version: New version → Deploy**. The link stays the same.

## If something goes wrong

- **"Locked":** the link is missing `?key=...` or the key is wrong. Run `setup` again to see it in the log.
- **"Could not load":** run `setup` once more and allow the permissions.
- **"Old data file":** ask Claude to refresh the planner data and import it again.
- **The Calendar button fails the first time:** Google needs the Calendar permission. Run `setup` once more and allow it.
- Anything else: screenshot it and send it to Claude.
