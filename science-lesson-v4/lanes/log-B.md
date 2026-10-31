# Lane B log (learning)

Plain-English record of Lane B's work, newest entry first. Each entry says what changed, what you need to do (if anything), and the save id.

## Waiting on you

1. **Upload the new skill file.** The skill notes and the lesson builder changed today (the items below), so the rebuilt `science-lesson.skill` needs uploading to claude.ai: replace the old file directly (not in Projects).
2. **Next paste set (Lane A makes it):** my planner changes from items 2.2, 2.3, 2.4, 2.7, 2.8 and 2.12, 2.9, backdating, the memory map, the Memory tab, Blind homework ahead and now last week's homework slide (Planner.html, Logic.html, Code.gs, Phone.html, EyesFree.html, Behaviour.gs, BoardPage.html, and the new Memory.gs) need to go into the next complete set; after pasting, re-import planner-data.json from home once. Optional: paste the new Mailbox.gs into the home link's own project and deploy a new version (item 4.6, faster quiz list).
3. **Which lesson showed "3 to 4 mark questions as 6"?** I searched every saved October lesson and found no mark total that disagrees with its parts. Tell me the class and lesson (or send a photo of the slide) and I'll fix it.
4. **After the paste: your Blind letters score.** Press Blind, then Today > Settings > "Test my letters" with a class open, and tell me the score.

---
## 31 Oct 2026, item 4.9: true or false with a stamp (layout A), TEST BUILD, pick still open

**What changed:**
- **True or false is now one slide, not two.** The rows look as before (numbered statements, a T / F box on the right) and the strip underneath says "Point: A = true, D = false. Be ready to justify on 3-2-1".
- **Each click does one statement:** a tilted TRUE (green) or FALSE (red) stamp zooms in over the right of the statement, the row turns light green or light red, and for a false one the corrected statement appears underneath in italics. Four statements, four clicks. The old answers slide is gone.
- Every row uses the same text size, and the statements never run under the stamp.
- The builder now warns when a false statement has no correction. The skill notes say every false statement needs one.
- **To go back to the old two slides** for one activity, Claude adds `"reveal": "answers"` to it.
- Checks: 3 new regression checks (one slide, the stamps and corrections are there, one click per statement). I built a lesson with the mock-up's four pressure statements and opened it in PowerPoint: it opens cleanly, it has 4 clicks, and it matches mock-up A.

**You need to:** upload the skill file (Waiting list item 1). The worksheet is unchanged, and so is the planner (nothing to paste). After a lesson with it, tell me whether to keep A or try B (the flip) or C (one statement a slide, with corners).

## 31 Oct 2026, item 2.10: "last week's homework" slide (layout A, three cards), TEST BUILD, pick still open

**What changed:**
- **A new slide straight after the Do Now answers**: the three questions the class got most wrong in last week's homework, side by side as three cards. Each card has the class's score in a coloured ring (red under 50%, amber 50 to 74%, green 75% and over), the question, the right answer in a navy box that appears when you click, "9 of 24 put ..." with the most common wrong answer in orange, and one line on why that answer is wrong. The bar at the top names the homework and how many did it. Class numbers only, never names. The three cards use the same text size row by row, so they read as a set.
- **In the planner**, click a lesson that has homework results from the last two weeks and a new box, "Last week's homework", lists the three with a tick "Show these on a slide after the Do Now answers (test build)". It is on by default; untick it to leave the slide out. When on, the build request asks Claude for the slide, with the numbers from the Results tab.
- The builder warns if a card has no right answer or more than three are given. The skill notes explain the new part of a lesson.
- Checks: 2 new planner logic checks, 4 new regression checks (slide 3, three rings, three click-to-show answers, no em dash). I built a test lesson and looked at the slide in PowerPoint: it matches mock-up A.

**You need to:** nothing until the next paste set (Planner.html, Logic.html) and the skill upload. Then tell me after a lesson or two whether to keep A or try B.

## 30 Oct 2026, homework ahead on the Homework tab (item 4.13, layout B2 made warmer)

**What changed:**
- **A new first section on the Homework tab, "Homework ahead"**, in the warmer B2 look you asked for: the three weeks (this week, next week, the week after) as a lantern-lit path, each with a ring showing how many of its homework lessons are made, next week's lamp lit gold.
- **One card per homework lesson**, with the class's colour ribbon and chip, the lesson's title, what kind it is (exam practice for Years 10 and 11, textbook questions for 12C and 13D, homework for the rest), when it is due, and which lesson it is set in. "To prepare: rest of this week" and "To prepare: next week" are separate, and "Already made" shows what is set (from Classroom) or ready from home.
- **Which lessons count:** a lesson's own "Set homework" tick decides; otherwise it is the class's last lesson of the week, the same rule the lesson card already uses.
- **One gold button, "Ask Claude to prepare these"**, sends a single request home for the ticked cards (untick any you don't want; it remembers). Nothing is posted: they come back as "ready" and you post them from Classroom. The afternoon build-ahead run never picks these up by itself.
- **A test two weeks away shows as a reminder card** with a "Set it" button that fills in "Set new homework" as revision. It never makes a draft by itself, as the test default said.
- It opens by itself on Friday to Sunday and stays shut on other days (click to open).
- Not yet: (c), a board 6-marker coming back three weeks later. Nothing records which 6-marker was done on the board yet, so that needs the builder to note it first.
- Checks: 8 new planner logic checks and a new browser check (tests/homework_ahead_sim.py, 14 checks), dark and light.

**You need to:** nothing until the next paste set; then open the Homework tab on a Friday.

## 30 Oct 2026, lesson builder: items 1.8, 2.5, 2.6, 2.13, the 20 language rules, Engage and the Do Now mix

**What changed:**
- **Year 12 and 13 lessons (item 1.8):** the two small note files beside each A-level lesson now name the real Drive folder (Module, then Chapter, no Physics level). At home the builder asks the uploader's own lookup; on claude.ai it uses the module list as it is on Drive today. The seven old 12C and 13D notes are corrected too, so the next planner data export attaches their multiple-choice questions for the phone voter. Nothing on Drive was created, moved or renamed.
- **Worksheets (2.5):** sentence starters are on the support sheet only (unless a lesson asks for them on purpose); the standard sheet's GUESS box is always empty (the half-filled one is support only); the word bank now follows each class's setting, so **9AS and 9XS get none**, like 10S2, 11S2, 12C and 13D, and 10C2 keeps its bank.
- **Slides (2.5):** whiteboard round answers fill their box; the graph slide says "READ THE GRAPH"; a long exam question no longer shrinks and runs off: the parts that don't fit move to a second slide marked "continued", and the same for its mark scheme; no "[FIG]" marker can reach the board.
- **Checks (2.5):** no false "picture description" warning on comparison tables.
- **A question from 3 to 4 weeks ago (2.6):** at home, one multiple-choice question from the class's lesson built 3 to 4 weeks earlier joins the block as its last question, labelled "FROM [that lesson]". It is extra to the six and goes to the phone voter too.
- **Memory map:** the sections you tick under "Suggested Do Now" go to the Do Now picker and show in the Do Now slide's notes.
- **Skill notes (SKILL.md):** Engage is now always there and always a question (from history, real data, or what you just said); the Do Now mix (4 short recall, one 2-mark explain, one calculation); your 20 teaching-language rules; 9AS and 9XS "No word bank". The build now warns (never rewrites) on: a slide sentence over 20 words (25 for A level), a Learn slide with no notes, more than 3 notes beside a picture (5 for A level), a passive instruction, a missing Engage, an Engage with no question, a long question or a hype word, no notes saying where the lesson answers it, a long multiple-choice option, and any em dash.
- **New test lessons (2.13):** a 13D one, a 10S2 one (no word bank on either sheet), a long exam question one, and checks on the new warnings and the 3-to-4-weeks question.
- The skill file is rebuilt.

**You need to:** upload the new `science-lesson.skill` to claude.ai (replace the old file directly). And tell me which lesson showed "3 to 4 mark questions as 6": I couldn't find one.

## 30 Oct 2026, eyes-free entry: the Blind button on the phone

**What changed:**
- **A "Blind" button beside Plan and Names** on the phone's Lesson tab (the designer's picks 1A, 2A, 3A; say if you want to switch). Press it and the area below becomes one big drawing box, with the class's names faint underneath so you know which class is open.
- **Draw the first letter of a pupil's first name** with your thumb, anywhere in the box. If only one pupil starts with it, the phone gives a tiny buzz and shows their name big. If several do, two tiny buzzes and "3 pupils": draw their surname initial straight after, no looking needed. If two letters still fit two pupils, two big name buttons appear to tap.
- **Then tap:** one tap is a positive (saved after a 0.4 second pause, one short buzz, the box flashes green); two taps is a negative (short, long, short buzz, red flash); three taps opens that pupil's usual menu (report to me, border). Hold your thumb still to clear. A pick left alone for 6 seconds is dropped, so a stray tap later never logs.
- **Same as a seat tap:** it uses the very same saving as tapping a seat, so Undo, the no-signal queue, backdating, the board and the Friday tab all work the same. Plan and Names are unchanged.
- **Today > Settings, "Blind mode letters":** "Teach the phone my letters" (each letter that starts a name in the open class, three times; about two minutes; the drawings stay on this phone only, never names), "Test my letters" (score out of 20; aim for 18 or more before using it in a lesson), and "Forget my letters".
- Checks: a new phone check that draws real letters (tests/blind_sim.py, 21 checks), plus the reader's own 55 checks.
- Also noticed: the ABCD vote check (tests/vote_sim.py) now stops at its "Talking" step. It does the same on the saved version from before this work, so it came with the day screen save, not Blind. Passed to the design chat.

**You need to:** after the next paste set, open the phone, press Blind, then Today > Settings > "Test my letters" with a class open and tell me the score.

**Save:** see the history line "Blind".

## 30 Oct 2026, big goal 1, step 4: the Memory tab (layout A, blue, orange, red)

**What changed:**
- **A new Memory tab** in the planner's sidebar, under Assessment. Pick a class at the top. Each row is a topic area of the specification that class's lessons cover; each square is one part of it, coloured by how well the class is predicted to remember it today: blue remembered (85% and over), orange fading (75 to 84%), red due (under 75%), faded orange taught but not checked yet (?), grey not taught yet. Each square shows its %. It follows the planner's Dark and Light setting (dark by default). The squares are worked out every morning at 6, as before; they fill in as lessons are taught and ABCD cards and homework results come in.
- **Click a square** for its panel: the % and whether it needs re-teaching, when it was last checked, and the ABCD card and homework questions behind it (date, % right, the most-picked wrong answer and the misconception). The button "Put on next lesson's Do Now" puts it at the top of that class's next lessons' suggestions for the next 14 days; press it again to take it off.
- **On every lesson card: "Suggested Do Now".** Up to 10 sections for that class, most due first (anything you put on from the Memory tab, then red, then not checked yet, then orange; never blue or grey), with the top 6 ticked. Tick or untick as you like. The ticked ones go to Claude with the build request, and the Do Now picker at home uses them. Nothing is ever put on a Do Now on its own.
- Class level only: no pupil names anywhere. No em dashes.
- Checks: 11 new planner logic checks, 2 new server checks, and a new browser check of the real planner (tests/memory_tab_sim.py, 19 checks).
- Not yet: the "Fix code" panel (moving a lesson or question to another spec part when the planner's guess is wrong); that is the next memory map step.

**You need to:** nothing now. It goes in the next complete paste set (Planner.html, Logic.html, Code.gs). The squares stay empty until the 6am job has run with planner-data.json imported (it already carries the spec codes).

**Save:** see the history line "Memory tab".

## 30 Oct 2026, Phase 5: backdating and an end-of-day reminder on the phone

**What changed:**
- **Add positives for an earlier day.** The phone's Today tab now has a row of days at the top: Today, then the last 5 school days (weekdays in term). Pick one and its entries for the class show underneath. Go to the Lesson tab: an amber bar says "Logging for Tue 3 Nov", and every tap (positive, negative, report to me) is saved on that day. Remove and Undo work on that day too. The board in the classroom is left alone. Press "Back to today" on the bar to return. You can go back up to 14 days; further back is refused.
- **End-of-day reminder.** After 3:15 pm on a school day, the Lesson tab asks "Any positives to add for today? Nothing logged yet for:" with a button for each of today's classes that has nothing logged. Tap one to open it, or "Not today" to hide it until tomorrow.
- Backdated positives count in that week's Friday messages home, like any other.
- Checks: 13 new server checks and a new phone check (tests/backdate_sim.py, 10 checks).

**You need to:** nothing now. It goes in the next complete paste set (Behaviour.gs, Phone.html). The phone's corner should then say "server 24".

**Save:** see the history line "Backdating". (Lane C's save 0646145c already carried the phone part.)

## 30 Oct 2026, item 4.14 dropped: you already make the whole-class feedback sheet

**What changed:** nothing built. You told me the marking feedback sheet is a printout you make yourself, so item 4.14 (a feedback sheet builder) is off Lane B's list and no longer waiting on you.

**You need to:** nothing.

**Save:** see the history line "4.14 dropped".

## 30 Oct 2026, item 2.9: silences judged by you, no microphone, and the weekly goal decides emails home

**What changed:**
- **No microphone any more.** The board page no longer listens: the "Turn on microphone" button, its pop-up window, the noise meter, the quiet-level and "trips at" settings and the measuring button are gone, and so is the noise limit on the phone. In a countdown, silent entry or silent work, a second now counts as not silent only while your phone's "Talking: count the time lost" button is on. While it is on, the board turns red with the sad face and counts up, and during silent work the timer keeps running in its corner. Tap again when they are back on task. The silent-work timeline and the % at the end are worked out from those same seconds. Silent entry passes after 30 seconds with no Talking tap; a countdown passes 3 seconds after it ends.
- **The weekly goal earns the emails home.** The goal is the same as before: 80% or more of silent time silent, and no more than 3 minutes lost (6 for a fortnightly class). On the Friday tab, a class that missed it now shows "Goal missed: no emails home this week" and nobody in it can be ticked. If you ever need to, open the class and press "Include anyway".
- **Order sheet email:** the draft now goes to the four technicians you gave me. Their addresses are kept only in a private settings file on this PC and copied into the pasted Code.gs when the paste set is made; they are never saved to the online project history.

**You need to:** nothing now. It all goes into the next complete paste set (BoardPage.html, Phone.html, Behaviour.gs, Code.gs). After pasting, reopen the board page once so it loads the new version (the page says "Board version 26").

**Save:** 990165d2.

## 30 Oct 2026, Phase 5: a smoke test for the morning brief (and no more em dashes in it)

**What changed:** the main test now runs the whole morning brief once in its preview mode (it prints the page and never writes to Drive) and checks that it finishes, makes a complete page, names only this year's classes, and has no em dashes. That last check found 21 em dashes the brief was showing you ("Period 1: 8AG — Photosynthesis", "HW OUT — SET"); they are now colons and commas ("Period 1: 8AG, Photosynthesis", "HW OUT (SET):").

**You need to:** nothing.

**Save:** 03ac68dc.

## 30 Oct 2026, item 4.11: checks on multiple-choice wrong answers (flag only)

**What changed:** a new report reads every built lesson's multiple-choice questions and flags the weak ones against the rules taken from real exam papers: the right answer clearly the longest (a give-away), very uneven options, two options the same, "all/none of the above", number options not smallest to largest, a NOT stem not in capitals, a wrong option without its "why" (the mistake it catches), and, across a lesson's six, a letter never used or used more than twice. It only reports; it never changes a lesson. Run today, 9 built lessons have something to look at, mostly lessons built before the 19 Oct "every wrong option names its mistake" rule. I will use it on lessons I build from now on.

**You need to:** nothing.

**Save:** 2ecd32e8.

## 30 Oct 2026, item 4.7: the behaviour log stays fast

**What changed:** opening a class on the phone used to read the last 8,000 rows of the behaviour log just to show today's taps. Now it reads upwards from the bottom, a few hundred rows at a time, and stops as soon as it reaches yesterday, so it reads only today's rows however long the log grows. The Friday tab and the weekly views already read a fixed slice, so they stay as they are. I did not build the per-term archive tab: with reads bounded like this the log no longer slows down as it grows, and moving old rows out would hide past weeks' behaviour from the planner's lesson cards. If the spreadsheet itself ever gets sluggish, an archive you run yourself once a term is easy to add.

**You need to:** nothing now. It goes into the next complete paste set (Behaviour.gs).

**Save:** bb6878f4.

## 30 Oct 2026, item 4.6: a faster Homework tab

**What changed:** three things. The list of quizzes from home used to be fetched one file at a time (up to 13 trips to the home link); now it comes in one trip. Homework already ticked as marked no longer opens its Google Form or asks Classroom each time (its "done" count comes from the morning's results instead). And unmarked homework more than 4 weeks past its due date is only checked again when you press Refresh; until then it says "Over 4 weeks old: press Refresh to check it again". Recent work is checked exactly as before.

**You need to:** nothing urgent. To get the one-trip list, paste the new Mailbox.gs into the home link's Apps Script project and deploy a new version; until you do, the planner simply reads the files one at a time as before. The rest goes into the next complete paste set (Code.gs).

**Save:** cd3bc042.

## 30 Oct 2026, item 4.8: planner speed, measured

**What changed:** I measured the planner with a whole school year of weeks. Working out where every class is up to takes under a tenth of a second even when most of the year is still to plan, and the screens draw in a quarter of a second or less (week view 5 thousandths of a second, the Classes tab the slowest at about a quarter). So the planner's own thinking is not what makes it feel slow; the waits are the trips to Google, which items 4.6 and 4.7 are about. I added the timing test the plan asked for, so a change that makes it slow is caught, and did not add the "remember last week's answer" shortcut, since it would add a way to show stale plans for no gain you would notice.

**You need to:** nothing.

**Save:** df7a4641.

## 30 Oct 2026, big goal 1, step 6: the phone shows what is due back

**What changed:** on the phone, opening a class now shows one extra line under the seating plan: "Due back: Latent heat 48%, Particle model and pressure 58%, Transition metals ?", the class's three reddest taught spots from the memory map ("?" = taught but not checked yet). Nothing else changes, and the line is empty when nothing is due or the map has no data yet. It is kept with the class's saved copy, so it also shows with no signal.

**You need to:** nothing now. It goes into the next complete paste set (Phone.html, Behaviour.gs).

**Save:** 4ae98dca.

## 29 Oct 2026, big goal 1, step 5 (home part): the Do Now uses the memory map

**What changed:** when a lesson is built, the Do Now picker now prefers questions from the parts of the specification the memory map says the class most needs back: either the ones you tick in the lesson's "Suggested Do Now" (once that box exists), or, with none ticked, the map's own reddest spots for that class. It still keeps the spacing pattern (one from last lesson, some from 2 to 4 and 5+ lessons ago, one from last year) and the question mix; it just picks within each slot from the red spots first. In a trial with two sections asked for, 4 of the 6 questions came from them. The builder side of this step (passing the ticked sections through to the slides' notes) waits with the builder plan.

**You need to:** nothing.

**Save:** 94ffa3bd.

## 29 Oct 2026, big goal 1, step 3: the memory map fills itself each morning

**What changed:** the planner's 6am daily job (the one that reads homework results) now also updates the memory map. It turns every ABCD vote and every homework quiz question into a "piece of evidence" for the right part of the specification (once only: running it again adds nothing), gives every lesson you have taught its square, works out each square's colour for today, learns once a month how quickly each class forgets, and writes it all into two new tabs in the planner spreadsheet, "Memory Evidence" and "Memory Scores" (class percentages only, no names). The snapshot also goes home with the rest of the planner state, so the Do Now picker can use it later. One small change from the design: votes are linked to their spec sections when the map updates, not when you tap, so fixing a lesson's code later also fixes its old votes.

**You need to:** nothing yet; the map has no screen until you pick a design (Waiting list). When you next paste, the set includes a new server file, Memory.gs, and the planner data needs re-importing from home once so it carries the spec codes.

**Save:** 619caf2f (and f7934265 for the paste set).

## 29 Oct 2026, big goal 1, step 1: every lesson knows its part of the specification

**What changed:** each lesson of your ten classes is now labelled with the part of the specification it teaches, worked out from the real exam questions that match the lesson: 405 lessons from their own questions, 1 by its title (marked as a guess), and 20 with no exam content (safety, assessments). The labels are the exam papers' own section names (for example "Physics: Internal Energy"), so nothing is made up; the official spec numbers can be added later. Year 7 to 9 lessons point at the GCSE sections they lead into, so a Year 9 class's map carries into Year 10; the few Year 7 to 9 topics GCSE does not cover (seasons, eclipses, history of the atom) get their own section. Each homework quiz question is labelled the same way. A test checks every lesson has a label.

**You need to:** nothing.

**Save:** d14ab3d5.

## 29 Oct 2026, big goal 1, step 2: the memory map's fading score

**What changed:** the maths behind the memory map is built and tested, on its own for now (nothing you can see yet). For each class and each part of the specification it keeps two numbers, how long the class will remember it and how hard it is for them, and works out the predicted % remembered today: green at 85% or more, amber 75 to 84, red under 75, and "?" for taught but never checked. An ABCD vote under 75% right counts as a miss and pulls the square towards red at half strength; homework counts at full strength; a good result pushes it back up, most of all when the class was expected to have forgotten. It also picks the reddest spots for a lesson's suggested Do Now (top 6 ticked, never green or untaught), learns once a month whether its predictions for each class were too hopeful, and carries each class forward in September. One small change from the design, stated in the code: its growth number (20) did not match its own worked example, so I used the standard Anki value, which gives the example's "about 12 days" (11).

**You need to:** nothing yet.

**Save:** fb200ee4.

## 29 Oct 2026, item 2.13 (part): smoke tests for four tools

**What changed:** four tools that had no checks now have them in the main test: the extension question picker (it finds real 2 to 4 mark questions with their mark schemes, and picking alone never marks questions as used), the homework booklet maker (it makes both the booklet and its answers), the paper-snippets tool that crops each question part out of a test paper (checked on a made-up PDF), and the collector that sends each lesson's multiple-choice questions to the phone (every question has four options and a letter answer). All of them write only to a temporary folder. The other parts of 2.13 (10S2 and 13D test lessons, an em-dash warning) wait with the builder plan, item 4 on the list.

**You need to:** nothing.

**Save:** 530d66c5.

## 29 Oct 2026, item 2.12: a note for next time on each lesson

**What changed:** click a lesson in the planner and there is a new box, "Note for next time" ("needs the long ruler", "start with the demo"). It is kept with that lesson's record, so whenever the same lesson is planned again, for another class this year or a new class next year, the note shows in that lesson's panel ("From 9AS: ...") and goes to Claude with the build request. Clearing the box removes it.

**You need to:** nothing now. It goes into the next complete paste set (Planner.html).

**Save:** e4e84b2a.

## 29 Oct 2026, item 2.11: marks available per section in the test review

**What changed:** the test review worksheet now opens with a review table: one row per section of the test (question number and section name), the marks that section was worth, an empty "Your marks" box for the pupil, an EBI tick box, and the total. The same marks show in each section's heading on the worksheet ("Q3: Waves (12 marks)") and on the review task slide. When I write a review lesson I read the marks off the paper; if a review has no marks, the table still lists the sections without that column. I also took out three em dashes the review lesson showed pupils, and added the first test for this generator (it builds in memory only, so it can never make a Drive folder).

**You need to:** nothing.

**Save:** 3ed58dcb.

## 29 Oct 2026, item 2.8: Friday messages home, drafted

**What changed:** on the phone's Friday tab, after you tick pupils and press "Make email list", a new box "Messages home" holds one short positive message for each ticked pupil, ready to check, change and copy into the school's system. Each uses the pupil's first name and how many positive points they earned this week (or "has worked really well" if none were logged), and mentions the class's silent-work goal when the class met it. You can edit the text before copying. Nothing is sent, and nothing is marked as emailed until you press "Mark as emailed" as before.

**You need to:** if you want your name under the messages, add a row to the behaviour Settings tab: SIGN_OFF, then how you sign (for example "Mr Tomczynski"). Until then they end with "Thank you,".

**Save:** 2861ee5d.

## 29 Oct 2026, item 2.7: the order sheet as an email draft

**What changed:** the planner menu has a new "Order sheet email" button beside "Technicians' Excel". It makes the same one-page order sheet and puts it in a Gmail draft (subject: the sheet's title, a two-line note, the spreadsheet attached). It never sends: you open Gmail, check it and press Send. Each draft is written in the planner's Log tab, and it counts for Ulhu's order sheet ritual like a download does.

**You need to:** (1) when you paste it, Google will ask once for permission to make Gmail drafts; say yes. (2) give me the technicians' email addresses, or add them yourself in Apps Script (Project Settings, Script properties, name TECH_EMAILS, the addresses with commas between them). Until then the draft has no "To" and the planner tells you so.

**Save:** cc1df6b6.

## 29 Oct 2026, item 2.4: homework on the lesson card

**What changed:** a lesson card now shows "HW due" when a class's homework is due that lesson (hover for which one), and the lesson's checklist ticks "Collect homework at the start" by itself on those days. A red "KEY HW to mark" shows on a class's lessons once a key homework is 5 days past its due date and still not ticked as marked on the Homework tab. Two new checklist ticks go to Claude with the build: "Follow-up task straight after the Do Now (a book task, or an extension exam question)" and "Key homework returned: hand it back and give time to act on the feedback". The homework list comes from the planner's own Homework tab, so the page does not wait for Classroom.

**You need to:** nothing now. It goes into the next complete paste set (Planner.html, Code.gs).

**Save:** fbcca8fd.

## 29 Oct 2026, items 2.2 and 2.3: ABCD card results on the next lesson, and the most-missed homework questions (one save, they share files)

**What changed:**
- **2.2 ABCD cards on the next lesson card:** the class's next lesson card in the planner now shows "ABCD 72%", the average from the multiple-choice votes you tapped on the phone in its last lesson (class level only, no names). Hover it for the weakest questions. Click the lesson and a new box, "ABCD cards last lesson", lists the weakest questions with the % right, the wrong letter picked most and the misconception behind it, each with a "Put on this lesson's Do Now" button. Pressed, the question (with its options and answer) goes to Claude in the build request, and the card says "1 on Do Now"; pressing again takes it off.
- **2.3 Most missed questions:** the Assessment tab has a new section listing the most-missed homework quiz questions from the last 6 weeks across every class, lowest first, with the wrong answers picked and the marks missed most. A class button narrows it to one class, and each question has "Put on [class]'s next Do Now". It reads the daily results (class counts only), so it opens instantly without asking Google Forms.

**You need to:** nothing now. Both go into the next complete paste set (Planner.html and Code.gs).

**Save:** 1496f8d4.

## 29 Oct 2026, item 2.1: the Do Now picker matches questions properly

**What changed:** the Do Now used to match a question to a lesson by shared words alone, so a satellite question could land on "Energy Levels in Atoms" or a climate question on "Elastic Potential Energy". It now uses the same lesson matcher the exam picks use: the right part of the course AND the lesson's own words. A lesson the class question bank has nothing for now draws on single parts from the whole exam library (still word for word with the real mark scheme). The six aim for 4 short recall questions, one 2-mark explain and one calculation; if the class's questions run thin it still gives six. Three smaller fixes on the way: "draw a ring around the answer" no longer counts as a "drawing" question, a word and its shortened form no longer count twice, and a multiple choice whose question starts with "A ..." now shows the real option A as the answer. Questions that point at another part ("described in part (a)") are left out. One thing to know: 13D gets only one or two real questions at the moment, because its exam practice homework has already used most of the matching questions (a Do Now never repeats homework).

**You need to:** nothing, except the "mix rule" question on the Waiting list.

**Save:** 0e286b7c.

