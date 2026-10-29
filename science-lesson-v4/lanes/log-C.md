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
6. **Pick a day screen layout: A, B or C** (open `lanes/mockups/day-screen.html` on the home PC; the Light/Dark switch is top right). A = the list in your grill order; B = a timeline of your day with suggestions in the free periods; C = a slim summary bar on top and big easy-to-tap to-dos. Also say if the timer picker underneath needs changing. Until you pick, I build everything behind the screen.
5. **Next paste set** (for Lane A to make): the phone page and the planner now open instantly from their saved copy. Planner.html and Phone.html changed.

## Entries (newest first)

### 29 Oct 2026, Lane C part 2: the timer picker and the capture box, ready but not attached
- What changed: the evening timer picker (`planner/day-timer.js`: your three likeliest jobs, then job, then class only for Marking, Building and Homework; a running chip with Stop) and the quick-capture box with the morning sort (`planner/day-capture.js`: Save or Enter, kept on the phone first so no signal loses nothing; each capture shows its suggested home with Yes or Other; Obsidian is never offered for a class or pupil capture). Both follow Light, Dark and Auto. 30 browser checks.
- Neither is on any page yet: they go onto the day screen once you pick A, B or C, and the timer picker once you say its design is fine.
- You need to: pick A, B or C (Waiting item 6), and say if the timer picker needs changing.
- Save: see git log "Evening timer picker", "Quick-capture box".

### 29 Oct 2026, Lane C part 2, items 3 and 4 (behind the screen): the day screen, capture box and evening timer
- What changed: the rules (`planner/day-logic.js`: where a capture goes, your to-do list of 7, the yesterday tag, suggested blocks with marking in frees and lesson builds after school, the workload line, nothing after 7pm, how a PC window becomes a job and class, the 2-hour stop, the fortnightly report) and the server side (`planner/Day.gs`: today's lessons and to-dos in one trip, saving and ticking, drop and move, captures, the shared timer, Done for today). 91 new checks. Captures about a pupil never go to Obsidian; Obsidian is never written until you pick the folder; the timer never stores window titles.
- Dark mode: the day screen and the timer will follow the same Light, Dark or Auto setting as the phone page (you asked, 29 Oct). The mock-up has both.
- Not yet: the screen itself (waits for your A, B or C pick), and captures for the order sheet, a class or a lesson land as labelled to-dos for now rather than inside the planner's lesson notes (that part is in the planner page, which Lane B owns).
- You need to: pick A, B or C (Waiting item 6). Nothing to paste yet: Day.gs joins the paste set with the screen.
- Saves: see git log "Day screen and evening timer rules", "Day.gs: the day screen".

### 29 Oct 2026, Lane C part 2, item 2 (installed app step 5, first half): talking to the server, and the outbox
- What changed: `app/src/api.js` is the one file every app screen will use to reach the planner's server (so moving off Google one day changes one file), and `app/src/outbox.js` holds taps made without signal and sends them in order when signal returns, the same way the phone page's queue works now, never counting a tap twice and setting aside one the server keeps refusing. 22 new checks in `app/tests/api.test.js`. Nothing you can see yet.
- You need to: nothing.
- Save: see git log "Installed app: server file and outbox".

### 29 Oct 2026, Lane C part 2, item 2 (installed app step 4, done early): the bridge
- What changed: a new server file `planner/Day.gs` lets the installed app talk to the planner's server from outside Google's page. It only answers with the planner key, and only for the calls the pages already use (behaviour, planner, Ulhu); everything else is refused. Code.gs is untouched. New check: `planner/tests/bridge.test.js` (17 checks), run with the rest of Lane C's checks by `node app/tests/run.js`.
- Steps 2 (moving the planner to your personal account) and 3 (the small school helper for Forms and Classroom) wait for the school test, so I built this one first because nothing waits on it.
- You need to: nothing yet. Day.gs joins the paste set when the planner moves to your personal account, not before (it would be a new script file to make for nothing yet).
- Save: see git log "Installed app bridge".

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
