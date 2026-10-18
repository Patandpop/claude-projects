# What teachers and pupils say about homework apps

Date: 2026-10-18. Research only.

## Sample, honestly

- **63 quotes from 6 kinds of source**, collected by reading pages, not scraping: Trustpilot (Sparx Science pages 1 and 2, Seneca, Educake, Carousel), Apple App Store public review feeds (Seneca, Google Classroom, Quizizz; UK store), Mumsnet, a Google Docs support thread, a Microsoft Forms community thread, and a teacher blog (Alice Keeler).
- Every quote is in `reviews.csv` in this folder with its link and date. Trustpilot and App Store links are page-level (the page or feed the review sits on), not per-review permalinks. Quotes are exact but some are the first 125 characters of a longer review, because the reading tool cut them there.
- **Not reached:** Reddit (the fetch tool is blocked from reddit.com and the mirror failed), TES forums (no thread found), Capterra and G2 (403), Google Play (no feed). So the sample is pupil-heavy and teacher-light. Treat teacher-side findings as thin.
- Many Trustpilot pupil reviews are jokes or abuse ("my cat ate me this sucks"). Those were left out of the CSV, not counted.
- Ranked with `reviews.py` from the replica pack: 1-star reviews weigh 1.0, 5-star 0.2, unrated 0.6; a theme with under 3 reviews or one source is "thin".

## Ranked themes (from reviews.py)

| rank | theme | weight | reviews | sources | avg stars |
| --- | --- | --- | --- | --- | --- |
| 1 | Wrong or harsh auto-marking (spelling, AI, exact match, all-or-nothing) | 13.6 | 16 | 4 | 1.3 |
| 2 | Bugs, log-in, loading, lost progress, notifications | 12.0 | 14 | 3 | 1.6 |
| 3 | Too long, too many questions, too much time | 11.6 | 14 | 4 | 1.4 |
| 4 | Stuck loops: cannot finish until right, same questions again | 4.6 | 6 | 2 | 1.0 |
| 5 | Stress, punishment, detentions | 4.0 | 5 | 2 | 2.0 |
| 6 | Questions not matched to what was taught | 4.0 | 4 | 2 | 1.0 |
| 7 | Feedback or hints unhelpful, score hidden (thin-ish) | 1.9 | 3 | 3 | 1.0 |

## 1. What they hate

**1. Auto-marking that marks right answers wrong.** 16 quotes, 4 sources. Worst for AI-marked written answers (Sparx, Seneca) and exact-match typed answers.
- "The AI is extremely stupid and will mark correct answers incorrect" (Sparx Science, 1 star, 2026-09-26) https://uk.trustpilot.com/review/sparxscience.com?page=2
- "I put in the awnser 170 into the awnser box and it said incorrect, the correct awnser is 170 like what the hell" (Sparx Science, 1 star, 2026-09-25) https://uk.trustpilot.com/review/sparxscience.com?page=2
- "I once spent 5 minutes on a question because it didn't accept fertilisation as a substitute for reproduction." (Seneca, 1 star, 2026-10-07) https://uk.trustpilot.com/review/senecalearning.com
- "The written answer questions are where it gets bad." (Sparx Science, 3 stars, 2026-10-10) https://uk.trustpilot.com/review/sparxscience.com
- "Senca is using AI to mark our work" (Seneca app, 1 star, 2025-12-16) https://itunes.apple.com/gb/rss/customerreviews/id=1631302657/sortBy=mostRecent/json
- Teacher side, Forms: "The 'all or nothing' grading is demoralising for students, and takes a load of extra work from a teacher to manually override." (Microsoft Forms community; same rule applies to Google Forms tick boxes, see 03) https://techcommunity.microsoft.com/discussions/microsoftforms/partial-scoring-for-multiple-choice-questions-in-forms/185273

**Lesson for Patryk:** do not let a machine judge written science answers. Self-marking against the real mark scheme sidesteps the most hated thing in the whole category. For short typed answers, avoid exact-match marking of words; use choices.

**2. Too long.** 14 quotes, 4 sources.
- "All homework take like 1 hour to complete, an absolute waste of time" (Seneca, 1 star, 2026-10-09) https://uk.trustpilot.com/review/senecalearning.com
- Seneca's reply to that review: "the length of each assignment is set by the teacher, not Seneca." (same page)
- "Not being funny it takes a hour if not more and the flash cards make me feel depressed." (Sparx Science, 1 star, 2026-09-20) https://uk.trustpilot.com/review/sparxscience.com?page=2
- "what do i see. 59 questions of complete terror." (Educake, 2 stars, 2026-10-07) https://uk.trustpilot.com/review/educake.co.uk

**Lesson:** say the length up front and keep it short. The question count is visible to pupils before they start (progress bar).

**3. Bugs, log-in and lost work.** 14 quotes, 3 sources. Mostly Seneca's app.
- "The time taken to open the app is abysmal. 60 seconds minimum, every single time. Sort it out." (Seneca app, 2 stars, 2026-05-04) https://itunes.apple.com/gb/rss/customerreviews/id=1631302657/sortBy=mostRecent/json
- "Falsely says I haven't done assignment when I have done it 10 times." (Seneca app, 1 star, 2026-09-17) same feed
- "i did 20 min of work and all my progress got deleted" (Seneca, 2 stars, 2026-09-16) https://uk.trustpilot.com/review/senecalearning.com
- "I ve missed 2 homeworks because of this silly app and have not been able to meassage my teachers about how to actually do it" (Google Classroom app, 2 stars, 2026-10-11) https://itunes.apple.com/gb/rss/customerreviews/id=924620788/sortBy=mostRecent/json

**Lesson:** Google Forms with the school sign-in is the most boring and so the most reliable option. One risk to plan for: a Form does not save half-done work between visits for a pupil reliably (Forms keeps drafts for signed-in users, medium confidence), so keep each homework short enough for one sitting.

**4. Stuck loops.** 6 quotes, 2 sources (Sparx).
- "Being forces to do 6-8 questions just to pass 1 question." (Sparx Science, 1 star, 2026-09-14) https://uk.trustpilot.com/review/sparxscience.com
- "you can't finish the work with a wrong question so at times she has ended up endlessly circling a question" (Mumsnet, about Sparx Maths, 2024-01-18) https://www.mumsnet.com/talk/secondary/4988025-sparx-maths

**Lesson:** never make completion depend on being right. Forms already works this way.

**5. Stress and detentions.** 5 quotes, 2 sources (thin, Sparx only in practice).
- "Spark science gives me some much stress I just can't go to bed without worrying I might get a detention tomorrow." (Sparx Science, 1 star, 2026-10-15) https://uk.trustpilot.com/review/sparxscience.com
- "when the child inevitably gets it wrong because they used the wrong word they get punished for not doing their homework" (Sparx Science, 1 star, 2026-09-12) https://uk.trustpilot.com/review/sparxscience.com?page=2

**6. Questions not matched to the lesson.** 4 quotes, 2 sources.
- "So annoying it gives us questions that we have not learnt yet" (Sparx Science, 1 star, 2026-10-18) https://uk.trustpilot.com/review/sparxscience.com
- "Doesnt even answer questions from what you've learnt." (Educake, 1 star, 2025-11-13) https://uk.trustpilot.com/review/educake.co.uk

**Lesson:** Patryk's advantage. His homework is built from the lesson he just taught, from real exam questions.

## 2. What is missing (asked for by name)

Thin. Only one direct request surfaced:
- "The notifications are at weird times and there's no way to see it" (Google Classroom app, 1 star, 2026-06-04) https://itunes.apple.com/gb/rss/customerreviews/id=924620788/sortBy=mostRecent/json. Supports posting at a fixed, sensible time (scheduled post) rather than whenever the teacher clicks.

Implied asks, Google Forms side (teacher sources, thin):
- Score not showing to pupils: "Scores on Google Form is not showing. Release grade immediately after each submission is checked" (Google Docs community thread title) https://support.google.com/docs/thread/51166593/scores-on-google-form-is-not-showing-release-grade-immediately-after-each-submission-is-checked?hl=en
- Written answers break the instant score: "By default the score will count as a zero until graded by the teacher and the score is released." (Alice Keeler, 2019-12-20) https://alicekeeler.com/2019/12/20/warning-google-forms-marks-it-wrong/. This is the likely cause of Patryk's "pupils could not see the mark scheme" problem: feedback on a 0-point paragraph question is not a reliable channel.

Positive signals worth keeping:
- "it helps my teacher quickly figure out where most of the class is struggling" (Quizizz app, 5 stars, 2021-01-12) https://itunes.apple.com/gb/rss/customerreviews/id=1160249042/sortBy=mostRecent/json
- "particularly answers and clear explanations" (Seneca, 5 stars, 2026-07-21) https://uk.trustpilot.com/review/senecalearning.com
- "better than sparx and actually helps me learn" (Carousel, 5 stars, 2023-09-25) https://uk.trustpilot.com/review/carousel-learning.com. Carousel is the self-marking app; it is the one pupils compare favourably with Sparx (3 of 7 Carousel reviews on that page).

## 3. What is unsolved

- **Fair marking of written science answers without AI or teacher hours.** Educake gives up ("no reliable way"), Sparx and Seneca use AI and are hated for it, Wayground and Forms push it to the teacher. Carousel's self-marking is the only free-of-AI answer and it needs moderation. Evidence: theme 1 (16 quotes, 4 sources) plus vendor docs in 01.
- **Homework that matches tonight's lesson.** Theme 6 (4 quotes, 2 sources, thin).
- **Self-marking honesty.** Carousel answers it with teacher moderation. No pupil quotes found on cheating (none reached), and a Carousel reviewer said "you can login to anyones account under your domain" (1 star, 2025-11-09) https://uk.trustpilot.com/review/carousel-learning.com. Forms with verified school email avoids that.

## Fix plan (what Patryk's version should do differently)

| # | change | size | evidence |
| --- | --- | --- | --- |
| 1 | Self-mark written answers against the real mark points, one Yes/No per point, counted in the score. No AI. | S (mostly built) | theme 1 |
| 2 | Each "No" shows the missed point as feedback on the score page, so the pupil sees what they lost | S | theme 7, Seneca 5-star quote |
| 3 | Say the length in the description ("12 questions, about 20 minutes") and keep to one sitting | S | theme 2 |
| 4 | Completion never depends on being right; one submission | none (Forms default) | theme 4 |
| 5 | Post at a fixed time (scheduled), due at 8am on the next lesson day, local time | S | missing list, Classroom quote |
| 6 | Avoid typed-word exact matching; use choices for keywords, number answers only with number validation | S | theme 1 |
| 7 | Planner flags doubtful self-marks (full marks claimed on a near-empty answer) for a quick look | M | unsolved: honesty |
| 8 | Most-missed questions and most-chosen wrong answers per class, for the next Do Now | M | Quizizz 5-star quote, Educake case study |

## The angle (for Patryk, not for sale)

Recommended: **"Homework from tonight's lesson, marked by the pupil against the real mark scheme, never by a robot."** Evidence: theme 1 (16 quotes, 4 sources) and theme 6.

Alternatives: "Twenty minutes, one sitting, no loops" (themes 2 and 4); "Runs on the school's own Google account, nothing to log in to" (theme 3).
