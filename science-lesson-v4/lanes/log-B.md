# Lane B log (learning)

Plain-English record of Lane B's work, newest entry first. Each entry says what changed, what you need to do (if anything), and the save id.

## Waiting on you

1. **Approve the builder plan for item 1.8 (A-level Drive address).** It touches the lesson builder, so it waits for your yes. The problem: for a Year 12 or 13 lesson the builder writes the wrong Drive address into the two small note files beside the lesson (it says "Year 13/Physics/Chapter 20 ...", but on Drive there is no Physics level and the chapters sit inside Module folders). The files still land in the right place, but the planner uses that note to attach each lesson's multiple-choice questions for the phone voter, so 12C and 13D lessons get none, and the school push uses the same wrong address. The plan: (1) for Year 12 or 13 the builder asks the uploader's own chapter lookup for the real folder and writes that into both notes (when Drive is not reachable it works out the module from the chapter-to-module table the October reorganisation used); (2) check the planner finds 12C and 13D lessons by that address; (3) add a 13D test lesson so it cannot slip back. Nothing on Drive is created, moved or renamed. Reply "yes to 1.8".
2. **OK to write the Do Now mix rule into SKILL.md?** The picker now aims for 4 short recall questions, one 2-mark explain and one calculation (item 2.1). The plan says the rule only goes into the skill notes with your OK. Reply "yes to the mix rule".
3. **Next paste set (Lane A makes it):** my planner changes from items 2.2, 2.3 and 2.4 (Planner.html, Code.gs) need to go into the next complete set.

---
## 29 Oct 2026, item 2.4: homework on the lesson card

**What changed:** a lesson card now shows "HW due" when a class's homework is due that lesson (hover for which one), and the lesson's checklist ticks "Collect homework at the start" by itself on those days. A red "KEY HW to mark" shows on a class's lessons once a key homework is 5 days past its due date and still not ticked as marked on the Homework tab. Two new checklist ticks go to Claude with the build: "Follow-up task straight after the Do Now (a book task, or an extension exam question)" and "Key homework returned: hand it back and give time to act on the feedback". The homework list comes from the planner's own Homework tab, so the page does not wait for Classroom.

**You need to:** nothing now. It goes into the next complete paste set (Planner.html, Code.gs).

**Save:** see the history line "Homework on the lesson card".

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

