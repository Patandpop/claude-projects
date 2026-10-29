# Lesson quality research: wording, highlighting, dual coding, hooks, MCQs

Written 2026-10-19 for the science-lesson skill. Free web sources only. Every claim has a source listed under it. Where a source is a secondary summary rather than the original paper, it says so.

The aim is practical: what the generator should do differently on Learn slides, definition boxes, images, Engage hooks and multiple-choice questions.

---

## 1. Slide wording: sounding like a teacher, not a chatbot

### 1.1 What makes text read as AI-written

Wikipedia editors keep a running list of the patterns that give AI text away, built from thousands of AI-written submissions. The patterns that matter most for science slides:

| Tell | What it looks like | Why it fails on a slide |
|---|---|---|
| AI vocabulary | delve, crucial, pivotal, tapestry, underscore, showcase, vibrant, landscape, foster, testament, enhance | Abstract words with no science content |
| Puffed-up importance | "stands as", "is a testament to", "plays a vital role", "a key turning point" | Says something matters without saying what it does |
| Trailing "-ing" analysis | "...highlighting the importance of energy", "...contributing to our understanding" | Empty clause bolted on the end |
| Negative parallels | "It's not just X, it's Y", "not only... but also" | Corrects a mistake nobody made |
| Rule of three | "fast, efficient and powerful" | Rhythm over content; the third item is usually filler |
| Copula avoidance | "serves as", "features", "boasts" instead of "is" or "has" | Longer, vaguer |
| Vague attribution | "scientists believe", "experts say" | No named source, no evidence |
| Formulaic wrap-ups | "Overall...", "In conclusion...", "Despite these challenges..." | Summary with no new information |
| Em dashes | used heavily | A known tell; Patryk has banned them |
| Bold and title case overuse | Bold Scattered Across Every Line | Kills the signal value of bold |

TechCrunch's write-up of the same guide makes a useful point: single words are weak evidence, but the patterns above in combination are strong. So a generator should ban the words AND check for the structures.

Words to add from science-lesson experience (common in AI lesson text): "dive into", "unlock", "journey", "explore the fascinating world of", "harness", "let's discover", "the magic of", "amazing", "incredible", "key role", "in today's world", "it is important to note that".

Sources:
- Wikipedia: Signs of AI writing. https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
- TechCrunch, "The best guide to spotting AI writing comes from Wikipedia" (2025). https://techcrunch.com/2025/11/20/the-best-guide-to-spotting-ai-writing-comes-from-wikipedia/
- Beutler Ink, "How to spot AI writing, according to Wikipedia" (secondary summary). https://www.beutlerink.com/blog/how-to-spot-ai-writing

### 1.2 Plain English rules that already exist

The UK Government Digital Service rules are the best free plain-English standard. They say: check any sentence over 25 words and split it if you can; prefer short everyday words ("buy" not "purchase", "help" not "assist", "about" not "approximately"); replace abstract words by saying the concrete action; watch nouns ending in "-ion" and "-ment" because they make sentences longer. The research GDS cites: 11-word sentences are easy, 21 words fairly difficult, 25 words difficult, 29+ very difficult.

Sources:
- GOV.UK, Writing to GOV.UK standards: clear language. https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/
- Inside GOV.UK, "Sentence length: why 25 words is our limit" (2014). https://insidegovuk.blog.gov.uk/2014/08/04/sentence-length-why-25-words-is-our-limit/
- Civil Service blog, "A simple guide on words to avoid in government" (2022). https://civilservice.blog.gov.uk/2022/08/16/a-simple-guide-on-words-to-avoid-in-government/
- GOV.UK style guide A to Z. https://www.gov.uk/guidance/style-guide/a-to-z

### 1.3 Controlled English (ASD-STE100)

Simplified Technical English is an aerospace standard for manuals read by non-native speakers. Its core ideas transfer well to slides: short sentences (about 20 words max for instructions, 25 for descriptions), active voice, one instruction per sentence, one meaning per word and no synonyms. The "no synonyms" rule is the most useful for science: if the slide says "resultant force", it should not switch to "net force" or "overall force" two lines later. Note: the official standard is not free, so these limits come from secondary summaries.

Sources:
- Sébastien Dubois, "ASD-STE100 Simplified Technical English" (summary). https://www.dsebastien.net/asd-ste100-simplified-technical-english/
- Franz Inc, Boeing Simplified English Checker (overview of the rules). https://examples.franz.com/success/customer_apps/natural_language/boeing.lhtml

### 1.4 Reading level by age

Flesch Reading Ease runs 0 to 100; higher is easier. It depends only on sentence length and syllables per word. Rough bands: 80 to 90 easy (about age 11 to 12), 70 to 80 fairly easy (about age 12 to 13), 60 to 70 plain English (age 13 to 15), 50 to 60 fairly difficult (age 15 to 18), 30 to 50 difficult (university).

Suggested targets for slide prose (excluding the key terms themselves, which are long words by nature):

| Year group | Target Flesch | Max words per sentence |
|---|---|---|
| Y7 to Y8 | 70 to 80 | 15 |
| Y9 to Y11 | 60 to 70 | 20 |
| Y12 to Y13 | 50 to 60 | 25 |

These are guides, not hard rules. Science terms ("photosynthesis", "electromagnetic") drag the score down unfairly, so score the text with key terms swapped for a one-syllable placeholder.

Sources:
- Readable, "Flesch Reading Ease and the Flesch Kincaid Grade Level". https://readable.com/blog/flesch-reading-ease-flesch-kincaid-grade-level
- Text Inspector, "Flesch Reading Ease: writing for clarity and accessibility". https://textinspector.com/flesch-reading-ease-writing-for-clarity-and-accessibility/

### 1.5 How much text per slide

Mayer's redundancy principle: people learn better from pictures plus spoken words than from pictures plus spoken words plus the same words printed on screen, especially at pace. In a classroom, the teacher is the narration. So slides should not carry the full script. They should carry the claim, the key term and the picture.

The assertion-evidence approach (Michael Alley, Penn State) puts this into a slide format: the headline is one full sentence stating the point, and the body is visual evidence (diagram, graph, photo) rather than bullets. In Alley's group's studies, students who saw assertion-evidence slides understood and remembered more than those who saw topic-plus-bullets slides for the same spoken talk, including at a one-week test. Caveat: most of this research is from Alley's own group.

Practical limit for a Learn slide: one headline sentence, plus no more than about 30 to 40 words of body text, plus the image. If it needs more, the teacher says it.

Sources:
- Mayer's multimedia principles (Mayer 2020 summary PDF). https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf
- Garner, Alley et al., "Assertion-evidence slides appear to lead to better comprehension and recall of more complex concepts" (ASEE). https://peer.asee.org/assertion-evidence-slides-appear-to-lead-to-better-comprehension-and-recall-of-more-complex-concepts.pdf
- Penn State, Scientific Presentations research page. https://writing.engr.psu.edu/research.html

### 1.6 Five before/after rewrites

1. Before: "Let's dive into the fascinating world of photosynthesis, a crucial process that plays a vital role in sustaining life on Earth."
   After: "Plants make glucose from carbon dioxide and water, using light energy."

2. Before: "Energy is not just something we use; it's a fundamental concept that underpins everything in our universe."
   After: "Energy is never made or destroyed. It only moves from one store to another."

3. Before: "Electrons, protons and neutrons work together in harmony, showcasing the intricate structure of the atom."
   After: "An atom has a tiny nucleus of protons and neutrons. Electrons orbit far outside it."

4. Before: "Understanding friction is key to unlocking how objects move, highlighting the importance of forces in everyday life."
   After: "Friction acts against motion. It slows a sliding box and heats both surfaces."

5. Before: "Scientists believe that the Big Bang was a pivotal moment that shaped the evolving landscape of our cosmos."
   After: "Galaxies are moving apart, so in the past they were closer. Run that back far enough and everything started at one hot, dense point."

The pattern in every rewrite: name the thing, say what it does, cut the importance-claim.

---

## 2. Highlighting key information

### 2.1 Signalling (cueing)

Mayer and Fiorella's signalling principle: people learn more deeply when cues point attention to the essential parts or show how the content is organised. Cues include bold key terms, arrows, colour-matching between text and diagram, and headings. A meta-analysis of signals that link text and pictures (Richter, Scheiter and Eitel, 2016; 27 studies, 2,464 people) found a small to medium benefit (r = 0.17), strongest for learners with low prior knowledge. That matches KS3 and lower-attaining KS4 classes. A 2020 meta-analysis (Alpizar, Adesope and Wong) found the evidence mixed: signals help when they are few and point at the right thing.

Sources:
- Cambridge Handbook of Multimedia Learning, "Signaling or cueing principle". https://www.cambridge.org/core/books/cambridge-handbook-of-multimedia-learning/signaling-or-cueing-principle-in-multimedia-learning/3972D4ACC628D5B53F7B2B4785DB2B06
- Richter, Scheiter and Eitel (2016) meta-analysis data, PsychArchives. https://psycharchives.org/handle/20.500.12034/2019
- Alpizar, Adesope and Wong (2020), "A meta-analysis of signaling principle in multimedia learning". https://rex.libraries.wsu.edu/esploro/outputs/journalArticle/A-meta-analysis-of-signaling-principle-in/99900601052901842

### 2.2 Bold vs colour vs underline vs boxes

- Bold: the clearest emphasis for on-screen reading. Government style guidance says use it sparingly, usually one or two words, never whole sentences. In a student survey, 62.5% preferred bold for emphasis (preference, not learning, but it shows bold reads as "this matters").
- Underline: avoid. It cuts through descenders (g, j, p, y) and reads as a link on screens.
- Colour: works as a signal only when it carries meaning, for example the same colour for a term in the text and its part on the diagram. Never rely on colour alone (colour-blind pupils), so pair it with bold.
- Boxes: best for one thing per slide that must be copied or remembered, such as the definition or the equation.
- Overuse: when too much is emphasised, the emphasis stops working. Dunlosky's 2013 review also found pupils' own highlighting is low value partly because people over-highlight.

Practical limit: no more than 3 bold terms on a Learn slide, and every bold term should be either the defined key term or a word that appears in the definition box or on the diagram.

Sources:
- Westmorland and Furness Council design guidelines, "Bold, italics and underlining". https://www.westmorlandandfurness.gov.uk/design-and-content-guidelines/formatting-spelling-and-grammar/bold-italics-and-underlining
- Dyson and others, "Investigating typographic differentiation: italics are more subtle than bold for emphasis", Information Design Journal (2016). https://centaur.reading.ac.uk/57479
- Kent State University, "All study strategies not created equal" (Dunlosky et al. 2013). https://www.kent.edu/node/295736

### 2.3 Defining key terms

Beck, McKeown and Kucan's three tiers: Tier 1 everyday words, Tier 2 general academic words used across subjects (for example "evaluate", "significant", "require", "emerge"), Tier 3 subject words ("refraction", "diffusion"). Science slides usually define the Tier 3 word and assume the Tier 2 words around it. That is often where pupils lose the thread. The definition itself should use only Tier 1 words plus Tier 3 words already taught. A UK Research School post suggests teachers use the tiers to pick words, not show them to pupils.

The Frayer model gives a term four boxes: definition, characteristics, examples, non-examples. The non-example is the part most AI slides skip, and it is the part that sharpens the meaning. Example: "conductor", non-example "plastic". Choose clear non-examples, not borderline ones (the guide's warning: tomato is a bad non-example of "fruit").

What this means for the definition box:
- One term per box, the term in bold, a one-sentence definition (max about 15 words for KS3, 20 for KS4).
- Optional "Example:" and "Not:" line. The "Not:" line is where a common misconception goes.
- The same wording every time the term appears in the lesson (no synonyms, see 1.3).
- The definition box should be on the slide where the term is first used, not later.

Sources:
- Strategram (University of Kansas), Tiers of vocabulary summary. https://simvilledev.ku.edu/sites/default/files/Strategram/gramv18no3.pdf
- University of Pittsburgh IFL, "Robust vocabulary instruction". https://researchsites.pitt.edu/ifl/news/robust-vocab
- Research School (Kingsbridge), "For your eyes only? Using the tiers of vocabulary model". https://researchschool.org.uk/kingsbridge/news/for-your-eyes-only
- University of Minnesota, Frayer Model. https://dhh-resources.umn.edu/language-literacy/k-12-reading-strategies/frayer-model/
- GiftedGuru, "Using the Frayer model to teach vocabulary concepts". https://giftedguru.com/?p=16809

---

## 3. Dual coding for science

### 3.1 The principles that matter most

| Principle (Mayer) | What it says | Slide rule |
|---|---|---|
| Coherence | Leave out decorative pictures, music and side facts | No stock photo unless the lesson points at something in it |
| Spatial contiguity | Put words next to the part of the picture they describe | Labels on the diagram, not in a legend or a separate text column |
| Redundancy | Don't print what the teacher is saying over a diagram | Short labels, not full sentences, over images |
| Signalling | Cue the essential parts | Arrows, numbered steps, colour-match term and part |
| Segmenting | Break a process into learner-paced chunks | One step per click, building the same image |

A broader meta-analysis of Mayer's work found an overall effect of g = 0.37. An education wiki reports that decorative images unrelated to the content show near-zero or slightly negative effects; that claim is unverified but fits the coherence principle.

Sources:
- Mayer (2020), Multimedia Principles summary. https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf
- University of Pittsburgh, Multimedia principles checklist. https://teaching.pitt.edu/wp-content/uploads/2023/03/multimedia-principles-checklist.pdf
- Dartmouth, Mayer's 12 principles of multimedia learning. https://services.dartmouth.edu/TDClient/1806/Portal/KB/PrintArticle?ID=171655
- Flip Education wiki, Dual coding theory (secondary, unverified meta-analysis claim). https://flipeducation.ai/teaching-wiki/dual-coding-theory

### 3.2 Caviglioli and teacher-made visuals

Oliver Caviglioli's "Dual Coding with Teachers" (John Catt, 2019) is the main UK practitioner book. Its point is that cognitive scientists show that visuals help but do not show teachers how to make them; the book fills that gap with graphic organisers, diagrams and the design basics (alignment, proximity, a small number of visual elements). The key message for a generator: the image is the explanation and the words annotate it, not the other way round.

Sources:
- STEM Learning, Dual coding with teachers. https://www.stem.org.uk/node/458279
- InnerDrive review of Dual Coding with Teachers. https://www.innerdrive.co.uk/reviews/dual-coding-with-teachers/

### 3.3 Photos vs labelled diagrams

Dwyer's studies on the human heart compared simple line drawings through to colour photos. More realism did not mean more learning, and detailed images led learners to look at the wrong parts. Realistic detail helped mainly on tests that asked pupils to recognise the real thing. A 2021 review agrees: simple, abstract visuals are often better for understanding; realistic ones help with recognising and recalling the real object.

Rule of thumb:
- Use a schematic (labelled diagram) when the lesson explains how something works: circuits, particle models, wave diagrams, the eye, the heart's flow, forces.
- Use a photo when pupils must recognise the real thing: lab equipment, a cell under a microscope, a rock type, a hazard symbol, a real-world example of a phenomenon.
- Use an annotated photo when the lesson links the two: a photo of a kettle with arrows and labels showing energy stores and transfers.

Sources:
- Dwyer study discussion, The eLearning Coach, "Realistic graphics". https://theelearningcoach.com/media/realistic-graphics/
- Educational Psychology Review (2021), review on realism in visualisations. https://link.springer.com/article/10.1007/s10648-021-09638-1

### 3.4 Building the explanation around the image

The assertion-evidence slide (1.5) is the cleanest layout for this. The headline sentence states the idea. The image fills most of the slide. Short labels sit on the image, each with a leader line. A process is shown as numbered steps on the same image, revealed one click at a time (segmenting), not as a bullet list beside a picture.

Concrete layout rules:
1. The image takes at least half the slide area on a Learn slide.
2. Labels sit on or touching the part they name, with a line if needed. No legends or keys unless there are more than six parts.
3. Labels are 1 to 5 words. Explanations go in the headline or the teacher's voice.
4. If text and image are both present, text describes what is in the image ("The arrows show..."), never facts the image does not show.
5. Key term colour on the text matches the colour of its part on the diagram.
6. A process with steps is one image with numbered steps, not two slides.

---

## 4. Lesson hooks (Engage)

### 4.1 What the evidence says

- Curiosity is an information gap. Loewenstein (1994) argues curiosity arises when attention lands on a gap in what we know, and that we need some knowledge first to feel it. A hook that poses a question pupils can almost answer works; a hook about something they know nothing about does not.
- Prediction and surprise. Predict-Observe-Explain (White and Gunstone, 1992): pupils commit to a prediction in writing, watch the event, then explain the result. Discrepant events (outcomes that contradict expectation) create the conflict that drives conceptual change, but research shows conflict alone is not enough: the lesson must resolve it.
- Pre-questions work. Asking questions before teaching improves retention of both the asked and the un-asked material (Carpenter and colleagues; Pan and Carpenter review), even when pupils guess wrong. The benefit holds up to at least a week.
- Retrieval at the start. Rosenshine's first principle: begin a lesson with a short review of previous learning. Specific questions beat "what did we do last time?".
- Seductive details hurt. Interesting but irrelevant material reduces both recall and transfer. Rey (2012) found medium negative effects across 39 effects; Sundararajan and Adesope (2020) found g = -0.33 across 58 studies. Visual seductive details are the worst.
- Pupils remember what they think about. Willingham warns that a "whizz bang" demo can leave pupils thinking about the bang, not the science. A story only helps if its vivid part is the concept.

Sources:
- Loewenstein (1994), "The psychology of curiosity: a review and reinterpretation" (summary page). https://stafforini.com/works/loewenstein-1994-psychology-curiosity-review/
- PBS NOVA, "How to stimulate curiosity". https://www.pbs.org/wgbh/nova/article/how-to-stimulate-curiosity/
- NZCER Assessment Resource Banks, Predict Observe Explain. https://arbs.nzcer.org.nz/node/7187
- "Using a discrepant event to facilitate preservice elementary teachers' conceptual change about force", EJMSTE (2019). https://ejmste.com/article/using-a-discrepant-event-to-facilitate-preservice-elementary-teachers-conceptual-change-about-force-7694
- Psychonomic Society, "Test first, learn later: the power of pretesting". https://featuredcontent.psychonomic.org/test-first-learn-later-the-power-of-pretesting-to-enhance-learning/
- Ollie Lovell, "How you can use prequestioning to boost student learning". https://www.ollielovell.com/how-you-can-use-prequestioning-to-boost-student-learning/
- Eton CIRL, "Rosenshine and Sherrington on reviewing". https://cirl.etoncollege.com/rosenshine-and-sherrington-on-reviewing/
- Wikipedia, Seductive details. https://en.wikipedia.org/wiki/Seductive_details
- Learning Scientists, "Cut it out: learning with seductive details" (2019). https://www.learningscientists.org/blog/2019/6/20-1
- Willingham, "Why do students remember everything that's on television and forget everything I say?", American Educator. https://www.aft.org/ae/summer2021/willingham
- Teacherhead, "Is everyone thinking? What are they all thinking about?" (2020). https://teacherhead.com/2020/10/18/is-everyone-thinking-what-are-they-all-thinking-about-this-is-the-key/

### 4.2 Ranked menu of hook formats

Ranked by how directly they feed the lesson's core idea and how often they can be used without going stale.

1. **Predict first (POE).** Show a set-up, pupils write a prediction with a reason, then show or describe the outcome. Use when there is a real demo or a short video with a clear result (falling objects, density, circuits, reaction colour change). The Learn section must explain the result.
2. **Pre-question.** Two or three questions on today's content before teaching ("Which falls faster, a hammer or a feather? Why?"). Use for almost any topic; cheapest to generate; revisit the same questions at the end.
3. **Puzzling phenomenon / discrepant event.** A photo or short clip of something that seems wrong (a ship made of steel floats; a can crushes when cooled). Use when the topic has a known counter-intuitive result. The lesson must answer it by the end.
4. **Big question answered later.** One question on the board that the lesson builds toward ("How do we know how old the Universe is?"). Use for A level and for topics with a clear end-point. Must be explicitly answered on a later slide.
5. **Which is right? (misconception choice).** Two or three pupil statements, one correct ("Sam says heavier objects fall faster. Priya says they fall at the same rate."). Use when a strong misconception exists. Doubles as a diagnostic.
6. **Odd one out.** Four items, more than one defensible answer, pupils justify. Use for classification topics (elements/compounds, types of energy store, cell parts). Works best when the "right" answer needs today's concept.
7. **Real-world anchor with a question.** A real object or event tied to the content, posed as a question ("Why does a phone get warm while charging?"). Use when the context is the concept, not decoration.
8. **Short history story.** Only when the story is the concept (Rutherford's gold foil result, Semmelweis and handwashing). The vivid detail must be the scientific finding.

Retrieval Do Now is not on the list because it already has its own slot in the lesson.

### 4.3 Hook kinds to avoid

| Avoid | Reason |
|---|---|
| "Fun fact" unrelated to the lesson | Seductive detail; lowers recall and transfer (Rey 2012) |
| Decorative image with "What do you think this lesson is about?" | Guessing the topic is not thinking about the science; no information gap |
| "Imagine a world without..." | Vague, unanswerable, pure AI filler |
| Dramatic demo with no prediction step and no later explanation | Pupils remember the bang, not the principle (Willingham) |
| Questions pupils cannot start on at all | No prior knowledge means no curiosity (Loewenstein) |
| Big question never answered later | Breaks the curiosity loop; pupils learn hooks are fake |
| Video longer than about 2 minutes | Eats lesson time; passive watching |
| Quiz about pop culture or sport tie-in with no science | Gimmick; attention goes to the wrong content |

Practical consequence: if the generator cannot produce a hook from the top five formats that links to the lesson's core idea, it should leave Engage out rather than fill it. This matches Patryk's own rule that Engage is used less.

---

## 5. Multiple-choice distractor quality

### 5.1 What makes a good distractor

- Distractors should be plausible and built from common pupil errors (Haladyna's item-writing rules, 1989 and 2002). An option that nobody picks is "non-functional" and is wasted.
- Sadler's research on science concept inventories: distractors built from documented pupil ideas are highly attractive, and tests without them give teachers little diagnostic information. Distractors drawn from research on misconceptions turn every wrong answer into information.
- Dylan Wiliam's hinge questions: each wrong option should map to a specific, predictable misconception, and the correct answer should not be reachable by flawed reasoning ("right answer for the right reason").
- Craig Barton's Diagnostic Questions: one correct answer plus three wrong answers, each designed to reveal a specific misconception, so a teacher knows not just who is wrong but what they think.
- Three options can be as good as four or five. A smaller number of plausible options beats padding with obviously wrong ones.

Kinds of plausible distractor for science:
1. Named misconception (heavier objects fall faster; current is used up in a circuit; plants get food from soil).
2. One-step error in a calculation (forgot to square; did not convert g to kg; divided instead of multiplied; used diameter for radius).
3. Unit or power-of-ten error (correct digits, wrong unit or wrong prefix).
4. Right fact, wrong question (a true statement about a related idea, such as quoting the definition of mass when asked for weight).
5. Partial answer (one of two required features).
6. Reversed relationship (inversely vs directly proportional; cause and effect swapped).

Sources:
- Haladyna, Downing and Rodriguez (2002) rules, summary chapter. https://bookdown.org/stefanmosjos/manualesitems/_book/haladyna-2002.html
- Penn State Schreyer Institute, Multiple-choice item writing rules. https://www.schreyerinstitute.psu.edu/pdf/Multiple_Choice_Item_Writing_Rules.pdf
- University of Kansas Special Connections, Multiple-choice questions. https://specialconnections.ku.edu/assessment/quality_test_construction/teacher_tools/multiple_choice_questions
- Sadler, "Psychometric models of student conceptions in science". https://users.nber.org/~sewp/events/2004.05.28/Sadler_PsychometricModels.pdf
- Harvard CfA, "What do students know?". https://www.cfa.harvard.edu/news/what-do-students-know
- Wind and Gale (2015), "Diagnostic opportunities using Rasch measurement in the context of a misconceptions-based physical science assessment". https://slider.gatech.edu/sites/default/files/documents/wind_gale_2015_diagnostic_opportunities_using_rasch.pdf
- Wiliam, "Designing great hinge questions", ASCD Educational Leadership. https://ascd.org/el/articles/designing-great-hinge-questions
- Research School (North London), "Uncovering misconceptions: harnessing diagnostic questions". https://researchschool.org.uk/north-london/news/uncovering-misconceptions-harnessing-diagnostic-questions-for-instant-high-quality-feedback-in-the-classroom

### 5.2 Item-writing flaws to block

From Haladyna's rules and university item-writing guides:
- "All of the above": avoid. Test-wise pupils guess it or avoid it, so it does not work fairly.
- "None of the above": use rarely, never as a lazy fourth option.
- Jokes or silly options: they do not work as distractors and reduce the effective number of options.
- Length cue: the correct answer is often the longest, most qualified option. Keep options similar in length and grammar.
- Grammar cue: stem ends in "an" and only one option starts with a vowel; stem is singular and only one option is singular.
- Word-repeat cue: the correct option repeats a distinctive word from the stem.
- Absolute words ("always", "never") only in the wrong options, which test-wise pupils spot.
- Overlapping options (one option includes another), or two options that mean the same thing (both must be wrong, so both are eliminated).
- Negative stems ("Which is NOT...") without the NOT in bold capitals.
- Correct answer always in position B or C. Randomise or balance positions.

### 5.3 Checks a generator can run automatically (free, no API)

1. Every distractor carries a tag naming its error type from a fixed list (misconception, calculation slip, unit error, right fact wrong question, partial answer, reversed relationship). No tag, no distractor.
2. If the tag is "misconception", it must name the misconception in a short phrase that could be shown to the teacher afterwards.
3. Length check: no option more than 1.5 times the length (in words) of the shortest, and the correct option is not the unique longest.
4. Banned options: "all of the above", "none of the above", "both A and B".
5. Duplicate check: no two options identical after removing punctuation and case.
6. Numerical questions: each wrong number must be reproducible by a named wrong method from the same input values (store the wrong method next to it).
7. Position balance: across the six-question MCQ block, the correct letter is not the same more than twice.
8. Stem cues: no distinctive stem word appears only in the correct option; "an" at the end of a stem is replaced with "a/an".
9. Absolute-word check: "always", "never", "only" do not appear only in wrong options.

Source for the systematic approach: Shin, Guo and Gierl (2019) generated distractors from real pupil responses using topic modelling, showing distractor creation can be a structured, checkable process. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6524712/

---

## Rules for the generator

Wording
1. No word from the banned list appears in slide or worksheet text: delve, dive into, unlock, journey, crucial, pivotal, vital, tapestry, underscore, showcase, foster, harness, landscape, testament, fascinating, amazing, incredible, magic, explore the world of, in today's world, it is important to note.
2. No em dashes anywhere.
3. No "not just X, but Y" or "It's not X, it's Y" sentences.
4. No sentence ends in an "-ing" clause that adds importance ("...highlighting...", "...contributing to...").
5. No list of exactly three adjectives in a row.
6. Max sentence length: 15 words (Y7 to Y8), 20 words (Y9 to Y11), 25 words (Y12 to Y13).
7. Flesch Reading Ease of slide prose, with key terms masked: at least 70 (KS3), at least 60 (KS4), at least 50 (KS5).
8. Every sentence on a Learn slide names a physical thing, quantity or process. A sentence that only says something is important is deleted.
9. A key term keeps the same wording throughout the lesson; no synonyms for it.
10. Use "is" and "has", not "serves as", "boasts" or "features".

Slide structure
11. Each Learn slide has one headline sentence stating its point (a full sentence, not a topic label).
12. Learn slide body text is at most 40 words, excluding labels and the definition box.
13. One idea per slide; a process with steps stays on one slide with step-by-step reveals, not split across two.

Highlighting and definitions
14. At most 3 bold terms per Learn slide; no bold whole sentences; no underline for emphasis.
15. Every bold term is the slide's key term or appears in the definition box or as a diagram label.
16. Every new Tier 3 term gets a definition box on the slide where it first appears.
17. A definition is one sentence of at most 15 words (KS3) or 20 words (KS4/5), using only everyday words and terms already taught.
18. Where a common misconception exists, the definition box has a "Not:" line naming it.
19. If colour marks a term in the text, the same colour marks its part on the diagram, and the term is also bold.

Images
20. Every Learn slide has a content image (diagram, graph or photo) that shows the idea; decorative images are not allowed.
21. The image takes at least half the slide area on a Learn slide.
22. Labels sit on the image next to the part they name; no separate legend unless there are more than 6 parts.
23. Image labels are 1 to 5 words.
24. Use a labelled schematic for "how it works" content and a photo for "recognise the real thing" content.
25. Body text refers to what the image shows ("The arrows show..."), not facts the image does not show.

Engage
26. The hook is one of: predict first, pre-question, puzzling phenomenon, big question, which-is-right, odd one out, real-world question, concept-carrying history story.
27. The hook asks pupils to commit to an answer (write, choose or vote).
28. The hook's question is answered on a named later slide in the same lesson.
29. No fun facts, "imagine a world without", or "guess today's topic" hooks.
30. If no hook meets rules 26 to 28, Engage is omitted.

MCQs
31. Every distractor has an error-type tag from the fixed list, and misconception tags name the misconception.
32. Numerical distractors each come from a stored wrong method applied to the question's own numbers.
33. No "all of the above", "none of the above" or "both A and B".
34. No option is more than 1.5 times the word count of the shortest, and the correct option is never the only longest.
35. The correct letter is not the same for more than 2 of the 6 questions in a block.
36. No duplicate or overlapping options; no stem word appears only in the correct option.
