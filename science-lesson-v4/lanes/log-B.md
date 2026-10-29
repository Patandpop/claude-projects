# Lane B log (learning)

Plain-English record of Lane B's work, newest entry first. Each entry says what changed, what you need to do (if anything), and the save id.

## Waiting on you

1. **Approve the builder plan for item 1.8 (A-level Drive address).** It touches the lesson builder, so it waits for your yes. The problem: for a Year 12 or 13 lesson the builder writes the wrong Drive address into the two small note files beside the lesson (it says "Year 13/Physics/Chapter 20 ...", but on Drive there is no Physics level and the chapters sit inside Module folders). The files still land in the right place, but the planner uses that note to attach each lesson's multiple-choice questions for the phone voter, so 12C and 13D lessons get none, and the school push uses the same wrong address. The plan: (1) for Year 12 or 13 the builder asks the uploader's own chapter lookup for the real folder and writes that into both notes (when Drive is not reachable it works out the module from the chapter-to-module table the October reorganisation used); (2) check the planner finds 12C and 13D lessons by that address; (3) add a 13D test lesson so it cannot slip back. Nothing on Drive is created, moved or renamed. Reply "yes to 1.8".
2. **OK to write the Do Now mix rule into SKILL.md?** The picker now aims for 4 short recall questions, one 2-mark explain and one calculation (item 2.1). The plan says the rule only goes into the skill notes with your OK. Reply "yes to the mix rule".
3. **Next paste set (Lane A makes it):** my planner changes from items 2.2, 2.3, 2.4, 2.7, 2.8 and 2.12 (Planner.html, Code.gs, Phone.html, Behaviour.gs) need to go into the next complete set.

4. **Approve the builder plan for items 2.5 and 2.6 (lesson builder fixes).** They touch the lesson builder, so they wait for your yes. I checked the code itself, since the two audits disagree. What I would change, one at a time, with a test for each:
   - **Sentence starters:** the standard sheet still shows them on its easiest tier (and on any 4+ mark question). Move them to the support sheet only, except where a lesson asks for them on purpose.
   - **No calculation working given away:** on a lesson that teaches a new method, the standard sheet's GUESS box comes half filled in (Given, Unknown, Equation). Make that pre-filled box appear on the support sheet only; the standard sheet gets the empty GUESS box.
   - **Word bank from each class's setting:** the builder still has its own "no word bank" list naming last year's 8AB and 9AB. Read class-defaults.json instead, so 10S2, 11S2 and the A-level classes get none without anyone remembering. 9AS and 9XS are still undecided there, so they keep today's behaviour (a word bank) until you say.
   - **Whiteboard round answers:** the answer text is a fixed small size in a big box; size it to fill the box.
   - **Graph slide title:** it reads "READ THE GRAPH: ANSWERS" before the answers show. It becomes "READ THE GRAPH", with the answers still on click.
   - **False picture warning:** the build check asks for a picture description on comparison slides, which have no picture. Skip them.
   - **Long exam questions:** a long question (like the 7-mark one on 11S2) shrinks to the smallest text and still runs off. When it does not fit, the later parts move to a second slide, and the same for its mark scheme panel (which also overflows on long schemes, so that counts as not fixed). Also make sure no "[FIG]" marker can show in a board mark scheme.
   - **Mark totals:** "3 to 4 mark questions shown as 6" has no example yet. I would look for one in the October lessons first; if I can't find one, I'll ask you for the lesson where you saw it.
   - **2.6, a delayed multiple choice:** one question from a lesson 3 to 4 weeks ago joins the multiple-choice block (as its last question, labelled "from [lesson]"), taken from that earlier lesson's own checked questions, so the class meets it again at a spaced gap. It travels with the lesson's questions to the phone, so its ABCD vote is saved like the others.
   - **From 2.13, test lessons for this year:** a 10S2 test lesson (checks no word bank appears), a 13D one (comes with 1.8), and a build warning when lesson text has an em dash. These depend on the fixes above, so they go in with them.
   Nothing on Drive changes. Reply "yes to the builder plan" (or pick which bullets).
5. **Technicians' email addresses (item 2.7):** for the order sheet email draft. Send them to me, or add them as the TECH_EMAILS script property in Apps Script (commas between).
6. **Item 2.9, the silent-work timer: what is still missing?** Most of it was built on 24 Oct: on the phone, "silent work" on/off with the colour change, the "Talking: count the time lost" tap that turns phone and board red and counts the seconds, the % of silent time, and the weekly goal (80% silent and no more than 3 minutes lost; 6 for a fortnightly class) shown on the Friday tab. The plan also asks what "earning it" gives the class: (a) positives for everyone present, (b) a line in the Friday messages home (now built, item 2.8), (c) a celebration on the board, or a mix. Tell me which, and anything about the timer that does not work the way you want, and I will make a mock-up.
7. **Item 2.10, the "last week's homework" slide:** a builder job that needs a mock-up first. I can't publish mock-ups from this chat, so it waits; tell me if you want me to make the mock-up as a file you can open instead.

---
## 29 Oct 2026, big goal 1, step 2: the memory map's fading score

**What changed:** the maths behind the memory map is built and tested, on its own for now (nothing you can see yet). For each class and each part of the specification it keeps two numbers, how long the class will remember it and how hard it is for them, and works out the predicted % remembered today: green at 85% or more, amber 75 to 84, red under 75, and "?" for taught but never checked. An ABCD vote under 75% right counts as a miss and pulls the square towards red at half strength; homework counts at full strength; a good result pushes it back up, most of all when the class was expected to have forgotten. It also picks the reddest spots for a lesson's suggested Do Now (top 6 ticked, never green or untaught), learns once a month whether its predictions for each class were too hopeful, and carries each class forward in September. One small change from the design, stated in the code: its growth number (20) did not match its own worked example, so I used the standard Anki value, which gives the example's "about 12 days" (11).

**You need to:** nothing yet.

**Save:** see the history line "Memory map: the fading score".

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

