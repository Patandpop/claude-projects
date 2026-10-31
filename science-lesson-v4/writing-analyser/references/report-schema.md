# The report file: what the script needs

`scripts/build-report.js` turns one JSON file into the marked-up Word report. Write the JSON after the analysis is done, save it as `report.json` in the working folder, then run:

```
node scripts/build-report.js report.json            # writes to /mnt/user-data/outputs (or the current folder)
node scripts/build-report.js report.json out-dir    # writes to out-dir
```

Output: `Writing report - <title> - <YYYY-MM-DD>.docx`. The script prints the path, and warns on stderr about any quote it could not find in the transcript (those still appear in the report, in a "not pinned to a line" list, so nothing is lost).

## The JSON

```json
{
  "title": "Harbour, Late",
  "form": "poem",
  "date": "2026-10-31",
  "transcript": "Harbour, Late\n\nThe salt has got into the handrail\nand the handrail into my hand.\n[?Gulls] argue over nothing.\n\nI came to count the boats\nand counted you instead.",
  "overview": "Two or three sentences: what the piece does, its real strength, the one thing that would most lift it.",
  "highlights": [
    { "quote": "The salt has got into the handrail", "kind": "works", "area": "style", "note": "One concrete object does the work of grief. The plain verb keeps it from being pretty." },
    { "quote": "argue over nothing", "kind": "look", "area": "tone", "note": "The only wry line in a tender poem. Decide whether the shrug is wanted here." }
  ],
  "slips": [
    "\"counted you instead\": no full stop after it, probably deliberate; left as written."
  ],
  "revisions": [
    { "original": "and counted you instead.", "revised": "and counted you.", "why": "\"Instead\" explains the turn the reader has already made." }
  ],
  "lenses": [
    {
      "author": "Paulo Coelho",
      "craft": "In your own words: what this author does with sentences, structure, voice.",
      "cost": "One line on where this style fails.",
      "toward": "How this piece could move toward it, in his voice.",
      "example": { "original": "I came to count the boats", "revised": "I came to count boats.", "why": "The bare noun is the parable register." }
    }
  ],
  "nextTime": [
    "Write the first draft without adjectives, then add back the three you miss.",
    "Stop one line before you want to.",
    "Read it aloud and mark where the breath runs out."
  ]
}
```

## Field notes

- **title**: the piece's title if it has one. If not, use the first line in quotation marks. The file name is built from it.
- **form**: `poem`, `essay` or `mixed`. Poems and mixed keep every line break as a line of its own; essays join single line breaks into paragraphs and keep blank lines as paragraph breaks.
- **date**: today, `YYYY-MM-DD`. Left out, the script uses today.
- **transcript**: exactly what he wrote (or pasted), line breaks as `\n`, blank line between stanzas or paragraphs, `[?word]` doubt marks kept. The script never alters it, and it never strips em dashes from it; his text is his.
- **highlights**: 6 to 12 for a page-length piece, fewer for a very short poem (never pad to reach six). `kind` is `works` (green) or `look` (yellow). `area` is `tone`, `style` or `structure`; you may add the facet after a colon, for example `style: rhythm`. `quote` must be an exact substring of one line (poem) or one paragraph (essay); the match ignores straight versus curly quotes and extra spaces, nothing else. Each highlight becomes a margin comment and a row in the "What stood out" table.
- **slips**: optional list of probable spelling or grammar slips, as sentences. Leave out or empty if none.
- **revisions**: 3 to 6, each with `original`, `revised`, `why`. `revised` may be a proposal in words rather than new text. Unlike highlight quotes, `original` here (and in lens examples) may span several lines; write the line breaks as `\n`.
- **lenses**: zero or more. `author` is free text, so a new author needs no code change. `cost` and `example` are optional.
- **nextTime**: three short practices.
- **Em dashes**: the script replaces any em dash in your analysis text (not the transcript) with a comma and warns, so a slip does not reach the report. Better not to write them in the first place.
