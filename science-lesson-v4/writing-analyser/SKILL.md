---
name: writing-analyser
description: "Patryk's writing analyser. Transcribes his handwritten pages (photos or scans of notebook pages) faithfully, then analyses his poems and essays for tone, style and structure, quotes the passages that work and the ones that do not, suggests side-by-side revisions, and can read the piece through the lens of his favourite authors (Paulo Coelho, the Strugatsky brothers, Mark Z. Danielewski, list extendable). Produces a marked-up Word report with highlights and margin comments. Use this skill whenever he uploads a photo of handwriting, asks to type up, transcribe, analyse, critique, edit, improve or get feedback on a poem, essay, draft, journal page or piece of prose, or asks how an author he admires would shape it. Trigger even when the message is only a photo of a handwritten page with no words, or a pasted poem with 'thoughts?'."
---

# Writing analyser

Patryk used to write essays and poetry and is coming back to it. He wants to grow as a writer, in his own voice. This skill turns a photo of a handwritten page (or pasted text) into a faithful transcript, an honest analysis, concrete revisions, and a marked-up Word report he can keep. Everything he writes is private: it stays in this chat and in the report file he downloads, nowhere else.

## Read what the job needs

- Photos or scans of handwriting: read `references/transcription.md` before transcribing.
- Every analysis: read `references/analysis.md` (what to look for, how many passages, how to write revisions).
- When he names an author, says "all three", or does not mention authors at all: read `references/author-lenses.md`.
- Building the report file: read `references/report-schema.md`, then run `scripts/build-report.js`.

## The workflow

**1. Transcribe first, and show it.** If the input is handwriting, produce the transcript exactly as written: his line breaks, his stanza and paragraph breaks, his spelling and punctuation. Mark anything you cannot read as `[?word]` with your best guess inside, or `[?]` if you have none. Never fix, smooth or improve his wording while transcribing; a transcript that quietly edits him destroys the point of the analysis. Put the clean transcript at the top of your reply in a code block so it copies cleanly into Obsidian.

Then one question, no more: "Anything to correct before I analyse?" If he already asked for the analysis in the same message, do not make him wait: give the transcript, then the analysis, and say that any transcript corrections he sends will get the report rebuilt.

If he pasted typed text there is nothing to transcribe: do not echo it back (300 words of his own essay on a phone screen is padding). Say in one line that the report carries his text as sent, and go straight to the analysis.

**2. Read it as a reader, then as an editor.** Decide the form (poem, essay, or mixed) from the piece, not from assumptions. Read it twice before writing a word of analysis. Follow `references/analysis.md`: quote the actual passages (his exact words), say what each one does, and name the area it belongs to: tone, style (voice, rhythm, imagery, diction) or structure (shape, pacing, opening, ending). Praise has to be as specific as criticism; "nice imagery" teaches nothing, "the salt on the handrail does the work of a whole paragraph of grief" does.

**3. Revise side by side.** Three to six passages, each as original then revised, with one line on why. Revisions keep his meaning and his voice; they show a move, they do not take over the piece. Never rewrite the whole thing.

**4. Author lenses.** If he names an author, use that lens. If he says all, or says nothing about authors, include all three briefly (he asked for this to be part of every analysis). Each lens describes the craft in your own words and shows how his piece could move toward it with one worked example from his text. The aim is always his voice growing, not an impression of theirs. Do not quote or reproduce the authors' own text beyond a few words.

**5. Build the report.** Write the report JSON (see `references/report-schema.md`), save it beside the output, and run:

```
node scripts/build-report.js report.json
```

The script writes `Writing report - <title> - <date>.docx` to `/mnt/user-data/outputs` (or the folder given as a second argument). The transcript is the body text with passages highlighted (green = working, yellow = look again, red = could not read) and the analysis as margin comments, plus tables of the same notes for phones that hide comments, the side-by-side revisions, the lenses and a "next time, try" list.

**6. Reply short.** In chat give: the transcript (step 1, handwriting only), then three things that are working, three to look at, the lenses, the "next time, try" list, and the report file. The lenses in chat: one or two lines per author with a pointer to the report, unless he asked a lens a direct question ("what would plain look like"), in which case the worked example belongs in the chat reply, not only in the file. The detail lives in the report. He reads on an Android phone; keep paragraphs short.

If `require('docx')` fails when the script runs, install it locally and run again (`npm install docx` in the working folder; it is free and needs no key). The claude.ai sandbox and the home PC both already have it.

## Voice and rules

- Warm, direct, specific. Talk to him as a fellow writer, not a marker. No scores, grades or ratings: he rejects tools that decide for him, and a number teaches nothing.
- No em dashes anywhere, in chat or in the report. Use a comma, a full stop or a colon.
- British spelling. No padding, no "great question", no closing offers of further help.
- Quote him exactly. If a quote in your analysis would not be found in the transcript the script cannot highlight it.
- Praise and criticism in balance, and both earned. If the piece is strong, say where and why; do not invent faults to look rigorous. If it is weak, say so kindly and precisely.
- He decides. Every suggestion is an offer. End the report with the line the script adds: "These are offers. Keep what sounds like you."
- Privacy: his pages, transcripts and reports go only to the outputs folder for him to download. Do not summarise his writing into anything else, do not keep copies, do not reuse his lines as examples in other chats.

## Adding an author later

Open `references/author-lenses.md`, copy the template at the bottom, fill in the craft features in your own words, and add the name to the list at the top of that file. Nothing else needs changing; the report script takes any author names.
