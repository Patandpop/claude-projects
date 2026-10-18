# Homework replica: design (step 4, replica-design)

Date: 2026-10-18. Research and planning only: nothing built, nothing published.
Builds on `04-architecture.md` and `design-audit/planner-tabs/spec.md` (and its `mockup.html`).

## 0. Look and feel: no new design system

The pupil side is Google Forms, so its look is Google's. The only choices are in the template Form (set once by hand, 04 section 9):
- Theme: **Basic** font (Google's own, free), a **dark** header colour (dark blue or dark green) so white header text is easy to read. No header picture.
- No logos, no school crest: plain is more reliable on phones.

The teacher side uses the planner's existing colours, buttons, cards and status pills (`Planner.html` and the mock-up). No new colours, so no new contrast check is needed; the contrast tool in this skill is for new colour sets.

## 1. The pupil's Form, page by page

Rules for every bit of wording: plain British English, short sentences, no em dashes, no "AI-sounding" phrases ("Great job!", "Let's dive in"). Words in [brackets] are filled in by the planner.

### 1.0 How they get there (Classroom)

Assignment title: `[topic] exam practice` (or `[topic] homework quiz` for the weekly quiz). Due [day date], 08:00. Points: the Form's total.

Assignment text (Patryk can change it on the Homework tab before making the drafts):

> This is exam practice on [topic]: [n] questions, about [m] minutes. Do it in one go. Answer every question, then mark your written answers on the last page using the mark scheme. Be honest, it shows you what to work on. Due [day date], 8am.

Weekly quiz version:

> Your homework is a short quiz on [topic]: [n] questions, about [m] minutes. Do it in one go. Answer every question, then mark your written answers on the last page. Due [day date], 8am.

### 1.1 Page 1: Answer the questions

**Form title**: `[class] [topic] exam practice ([Core or Challenge])`. No date in the title (it can change).

**Description** (top of page 1):

> Exam practice on [topic]. [n] questions, about [m] minutes. Do it in one go.
>
> If a question has a picture, it is just above the question.
> For a calculation, type only the number in the answer box. Put your working in the box under it if you want.
>
> Multiple-choice questions mark themselves. On the last page you mark your written answers yourself, using the real mark scheme.
>
> Stuck? Message me on Google Classroom.

(Shorter weekly-quiz version: the same without the first word "Exam practice", "Homework quiz on [topic]" instead.)

**Question items**, in paper order:

| type | what the pupil sees |
| --- | --- |
| picture | A picture block titled "Question 3" (or "Question 1, option B" for a picture that is an answer), just above its question |
| multiple choice | Title "3. [question]". Round buttons. One tick-box version for "tick two" parts: title ends "Choose two answers." |
| number | Title "5. [question] Give your answer in [unit]." Help text: "Numbers only, for example 2.5 or 0.04". A wrong-shape entry shows: "Type a number only. Put the unit and working in the next box." |
| working (after each number) | Title "5. Your working (not required)". Paragraph box |
| written | Title "6. [question] [3 marks]". Paragraph box. All required |

Progress bar on. Button: Google's own "Next".

### 1.2 Page 2: Mark your own answers

**Page title**: Mark your own answers

**Page help text**:

> Your answers are saved. Do not change them now.
>
> For each written question, read the mark scheme, then choose Yes or No for every mark. Choose Yes if your answer says this, or says the same thing in other words. If you are not sure, choose No.
>
> You can press Back to read what you wrote, but do not change it.
>
> Each Yes adds to your score. Be honest: it shows you and me what to work on next.

**Each question block** starts with a header item:

- Title: `Question 6 (3 marks): [first 100 characters of the question]...`
- Help text: the readable mark scheme as now (`msPlain`: "✓ 1 mark: ...", "Also accepted", "No mark for").

Then one Yes/No item per mark point. Choices are always **Yes** and **No**, in that order. Each Yes is worth the point's marks. All required.

| mark point kind | item title | help text under it | points for Yes |
| --- | --- | --- | --- |
| point | Question 6, mark 1: did you say [the block transfers energy to the surroundings]? | Also accepted: [...]. No mark for: [...] | 1 |
| mark (scheme cannot be split) | Question 6, mark 1 of 2: did your answer earn this mark? | the whole point, as in the mark scheme | 1 each |
| method (calculation working) | Question 5, working mark: did you [convert 10 minutes to 600 s]? | | 1 |
| answer (calculation final answer) | Question 5, final answer: did you get [24 W]? | Also accepted: [...] | 1 |
| level (6-mark question) | Question 8, Level 1 (1 to 2 marks): does your answer [give a simple description of ...]? | Choose Yes only if you also said Yes to the level before. | 2 |

Extra line in the header help text:
- Calculation: "A correct final answer gets all the marks for this question, even with no working. If you got it, choose Yes for every mark below."
- Level question: "Start at Level 1. Stop at the first No: every level after it is No too."

Point wording rules (home, `markPoints`):
- Use the scheme's own words after "did you say". Drop marker codes (B1, M1, A1) and the "✓ 1 mark:" prefix.
- If the point is longer than 150 characters, the title becomes "Question 6, mark 1: did you say this?" and the point goes in the help text.
- Lower-case the first letter unless it is a symbol, unit or name ("did you say Ek = 270 J?").

**Feedback** (seen on View score after submitting):
- On a No: "You missed: [the point]".
- On a wrong multiple-choice answer: "What examiners saw: [examiner comment]" when there is one (as now); otherwise nothing.

### 1.3 After Submit

**Confirmation message**:

> Done, thank you. Click View score to see your total. Under each question you got wrong, and each mark you said No to, it shows what you missed. Read those before next lesson.

**View score** (Google's page, settings from the template): total out of [points], each multiple-choice question right or wrong with the right answer, each self-mark item with "You missed: ..." on the Nos. One response only: no "Submit another response" link.

### 1.4 A worked example (10C2, Core, short)

Page 1: "1. Why did the student insulate the beaker?" (multiple choice). Picture "Question 2", then "2. Calculate the energy transferred each second... Give your answer in J." number box, then "2. Your working (not required)". "3. Give one reason the temperature rise was smaller than calculated. [1 mark]".

Page 2: header "Question 2 (2 marks): Calculate the energy transferred each second..." with the scheme. Items: "Question 2, working mark: did you convert 10 minutes to 600 seconds?" and "Question 2, final answer: did you get 24 J?". Header "Question 3 (1 mark): Give one reason..." then "Question 3, mark 1: did you say the block transfers energy to the surroundings?".

Score: 1 (multiple choice) + 2 + 1 = 4 points, the same as the Classroom points.

## 2. Homework tab: setting a quiz (what Patryk clicks)

Same layout as `planner-tabs/spec.md` 1.2 and the mock-up. This build covers the **Exam practice quiz** kind (both exam practice and the weekly quiz files appear in it). Seneca, key homework, revise and something else come later on the same screen (04 step 13).

### 2.1 The clicks

1. Open **Homework**. "Set new homework" is already open.
2. **Kind**: click "Exam practice quiz".
3. **Classes**: tick one or more. A class with no quiz waiting from home shows greyed: "No quiz from home yet". (Ask at home, or use the Test builder on Assessment.)
4. **Each class** (one row, click to open):
   - **Quiz**: a list of that class's quiz files, newest first, for example "P1 Energy, 12 questions, 23 marks, checked". Not yet checked shows "not checked yet".
   - **Version**: Core / Challenge (Years 9 to 11). Switching it swaps to the other file. KS3 and A level show "One version".
   - **Set on**: the class's next lesson (can change).
   - **Due**: worked out (closest lesson to 7 days, 4 to 9 days), with the reason if it moved ("half term: first lesson back"). "Change" lets him pick another lesson. Time always shows "8:00".
   - **Send**: "Draft only, I publish it" (default) or "Schedule it", with a time (default: end of the set-on lesson).
   - Notes from home, in plain words: "2 questions left out (they need drawing)", "1 picture too big, left out".
5. **Message to pupils**: the template from 1.0, filled in per class, editable. Preview under it for the first three classes.
6. Click **Make the drafts**.

### 2.2 What happens after the click

Each class row changes in turn (one class at a time, so a slow one never stops the rest):
- "Making the Form..." then "Form made" then "Classroom draft made" (or "Scheduled for Mon 19 Oct, 15:10").
- Buttons on the row: **Open the Form**, **Open in Classroom**, **Copy message**.
- If something fails, the row says what, in plain words, and the rest carry on. Examples:
  - "No Classroom class with 10C2 in its name. The Form was made: link it by hand."
  - "Made without the template, so pupils may not see their score straight away. See the setup guide: TEMPLATE_FORM_ID."
- Making the same quiz twice for the same class is refused: "Already made on 19 Oct" with the links.

### 2.3 Checking a quiz before it is made

Until the Assessment tab is built (spec 2.3), the current check list stays on Homework, folded under "Set new homework", as **Check the questions**. Each quiz shows:
- page 1 as pupils see it (questions, options with the right one ticked, "[picture]" where a picture goes);
- page 2 as pupils see it: every Yes/No item with its exact wording and points, so a badly split mark scheme is spotted here;
- the total, which must equal the Classroom points.

Button: **Looks right**. It marks the quiz "checked" in the Quiz list in 2.1. An unchecked quiz can still be made, after one question: "You have not checked this quiz yet. Make it anyway?"

### 2.4 Set work, by class (later step)

The status strip and per-class list in spec 1.1 and 1.3 (Drafted, Scheduled, Live, Due, Marked, hand-in counts) read the new Homework sheet tab. Not in the first build; the rows written in 2.2 are what they will read.

## 3. What is left open for Patryk

1. Header colour for the template Form (dark blue or dark green).
2. Calculation rule wording: is "a correct final answer gets all the marks" right for all his classes (AQA allows it for most calculations; some OCR questions want working)?
3. Level questions: 2 points per level (simple, can over-count by 1) or 2 items per level (exact, longer page)?
4. Default post time for "Schedule it": end of the set-on lesson, or a fixed time such as 16:00?
