# Lane C log (your day)

## Waiting on you
1. **Obsidian inbox folder** for the quick-capture box: (a) `G:\My Drive\Obsidian\Inbox from planner.md` with the vault syncing that folder (my pick), (b) a folder you name, (c) inside `Beechen Cliff Science\Admin\`. Nothing is written to Obsidian until you answer.
2. **Per-pupil homework results**: the design moves them into your personal Planner Sheet along with everything else (your decision in the installed-app grill). Say "keep them at school" if that has changed.
3. **A free Cloudflare account, connected to this GitHub repo** (about 10 minutes, any evening). The site's files are ready (the `app/` folder). Steps:
   1. Go to dash.cloudflare.com, sign up free with your personal Google address.
   2. Left menu: Workers & Pages, then Create, then the Pages tab, then "Connect to Git". Allow Cloudflare to see the GitHub repo `Patandpop/claude-projects` (only that one repo).
   3. Settings for the project: name `ulhu-planner` (or any name you like; it becomes the web address). Production branch: `pre-reskin`. Framework preset: None. Build command: `node app/build.js`. Build output directory: `app/dist`. Root directory: `science-lesson-v4`.
   4. Save and Deploy. When it says Success, open the address it shows and add `/test/` on the end: that is the school test page. Paste the address into this chat.
   5. Google sign-in in front of the site (Cloudflare Access) comes after the school test, so the test also tells us whether the school PC lets you reach the site at all. I will give those steps then.
4. **The school test** (two minutes at school) once the test page is live: open the page on a school PC, paste your mailbox address and key (the same two values in the school planner's Script properties, MAILBOX_URL and MAILBOX_KEY), press "Run the test", and read the three results back to the chat (the "Copy the results" button copies them). The page never remembers the key.
5. **Next paste set** (for Lane A to make): the phone page and the planner now open instantly from their saved copy. Planner.html and Phone.html changed.

## Entries (newest first)

### 29 Oct 2026, Lane C part 2, item 2 (installed app step 1): the site and the school test page
- What changed: a new `app/` folder holds the installed app. For now it has a holding home page and the school test page (one button: checks your personal Apps Script can be reached from that PC, both for reading and sending, without writing anything; also lists what the browser can do: notifications, installing, offline). A browser test covers every result message.
- You need to: make the free Cloudflare account (Waiting item 3), then run the school test (item 4).
- Save: see git log "Installed app step 1".

### 29 Oct 2026, Lane C part 2, item 1: instant opening
- What changed: the phone page and the desktop planner now draw the copy they saved last time straight away, then swap in the fresh copy when Google answers. On the phone, the saved class shows at once; the board only moves when Google answers. On the planner, the saved week shows at once with "Saved copy from Thu 20:29, getting the latest..." and clicks wait (a short message says why) until the fresh copy lands, so nothing can be saved over newer data. With no signal both keep the saved copy instead of an error. New check: `planner/tests/instant_sim.py`.
- Slimmer phone view: the phone page also loads all of Ulhu's code and art (about 690 KB) every time it opens, even for a behaviour lesson. Making that load only when the Ulhu tab opens is Ulhu's code, so it is noted for Lane A, not done here.
- You need to: paste the next complete set when Lane A makes it (Waiting item 5).
- Save: see git log "Instant opening".

### 29 Oct 2026, Lane C part 1: the two design documents
- What changed: `lanes/design-installed-app.md` (the installed app: data move to your personal account, the server bridge, every screen, long jobs, notifications, sound, the evening timer, the day screen and quick-capture box, build order, tests, risks) and `lanes/design-memory-map.md` (the memory map for Lane B: a spec index because no spec codes exist in the data yet, evidence and score tabs, the fading maths with a worked example, the grid, Do Now suggestions, the daily update, carry-forward, build order, tests, risks).
- You need to: answer the four items above when you can; nothing is blocked yet.
- Saves: 26adcd8b (installed app), a67a3502 (memory map).
