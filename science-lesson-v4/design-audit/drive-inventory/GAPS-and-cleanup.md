# Gaps & cleanup list — Drive reorganisation (started 2026-07-22)

Living list of things that need Patryk's hand or a later pass. Not blocking.

## Genuine content gaps (no source uploaded yet)

- **Year 8 Chemistry — C4 Atmosphere and Resources** (6 lesson folders empty). The DELBAR
  Year 8 Chemistry pack has this topic folder but it is EMPTY. Checked "7. Archived Resources"
  (both zip parts) — they are entirely Year 7 content, no Year 8 Atmosphere. **Action:** Patryk
  to locate/upload the Atmosphere content, then fill like the other packs.
- **Year 8 Chemistry — C5 Earths Resources** — no matching source topic in the pack. Pacing
  merges "C4 Atmosphere & Earth" into one, so C5 may be redundant. Confirm with Patryk.

## Cleanup (Patryk to review, then a confirmed pass)

- **Year 7 Biology B4 Interdependence duplicates.** Three lessons appear twice under two
  numbers each. Lower numbers were FILLED, higher-numbered duplicates left empty:
  - Lesson 7 - Classification (dup of Lesson 4) — empty, safe to delete after check
  - Lesson 10 - Food Chains (dup of Lesson 8) — empty, safe to delete after check
  - Lesson 11 - Pyramids of Numbers and Biomass (dup of Lesson 9) — empty, safe to delete
- **RESOLVED 2026-10-03:** Year 9 Biology stray folders from generator testing 2026-06-24 (the real topic folder is
  `B2 Organisation`): delete `Organisation/` and `Cells and Organisation/` after Patryk confirms.
- **"Untitled document.docx"** left in the Y7 Physics Stretching Springs Additional folder — a
  teacher's stray file, harmless, ignore unless Patryk wants it gone.

## Good-to-know (not a gap)

- "7. Archived Resources" (both parts) = Year 7 assessments/homeworks/knowledge organisers,
  and notably lots of FCA/RBA GOLD lesson slides. Left untouched for now per Patryk. Prime
  source when Year 7 lessons get generated. See [[reference_teacher_initials_source_quality]].

## Duplicate lesson folders made by the copy script (found 2026-10-02) - DELETED 2026-10-02 with Patryk's OK (48 folders, each checked identical/subset of its lower twin; logged)

Cause: when a re-run found a lesson's number already taken (by its OWN earlier folder) it made a new
folder at the next free number. Fixed in copy_ks4.py (re-runs now reuse the same-titled folder).
In every case below the LOWER-numbered set is the one to keep; the higher set is an identical copy
made by the script, never one of Patryk's originals (checked against before-2026-07-22.txt).

- Year 10 Physics P1 Energy: delete Lessons 13-24 (copies of 1-12).
- Year 10 Physics P2 Electricity: delete Lessons 18-33 (copies of 2-17).
- Year 9 Biology B1 Cells: delete Lessons 18-31 (copies of 2-17; made 2026-10-02, 238 files).
- Year 9 Biology B2 Organisation: delete Lessons 16-18 (copies of 1-3).
- Year 9 Physics P3 Particles: delete Lessons 16-18 (copies of 13-15). RESOLVED 2026-10-03:
  Lessons 10, 12 and 7 (10 'Specific Latent Heaty Practical', 12 'Revision',
  7 second 'Internal Energy'); content went into 13-15 instead. Patryk to decide which to keep.

## Found during Phases 3-5 (2026-10-02)

- **Year 13 chapters 20, 24, 25 and 26** (Cosmology, Particle Physics, Radioactivity, Nuclear
  Physics) are on Patryk's pacing but NO pack was uploaded for them, so no folders were made.
  The SLOP workbooks for 24 and 25+26 are in Admin/Extra Resources/Year 12/SLOP Booklets.
- **Year 11 B6 Lesson 12 - Extinction** is an empty folder: the school pack had nothing in it.
- **Year 11 B7 Ecology** folder names carry the pack's own numbering ("Lesson 4 - L5 Distribution
  and Abundance Required Practical", "Lesson 6 - L7 Carbon and Water Cycle"). Tidy on request.
- **Year 9 P3 Particles**: Patryk's original EMPTY folders Lesson 7 (second 'Internal Energy'),
  10 'Specific Latent Heaty Practical' and 12 'Revision' - content went into 13-15. He decides.
- **Year 8 baseline file "2023 Paper version "** could not be copied (school saved it with a
  trailing space and no file type). Still in the Downloads zip.
- **Archive folders** in every pack were deliberately NOT copied; they remain in Downloads.

## Resolved 2026-10-03 (Patryk's judgment calls)

- **Year 9 Biology stray folders moved into B2 Organisation**, then the stray folders deleted:
  - `Organisation/Lesson 6 - Organisation Review` and `Cells and Organisation/Lesson 6 - Organisation Review`
    both went into `B2 Organisation/Lesson 6 - Organisation Review` (B2 had no Lesson 6). The two
    folders both had a `..._PTO.pptx` file that genuinely differed from each other (checked with
    `cmp`, not just filenames) - kept BOTH rather than guessing which was final: the second is
    `Organisation_test_review_PTO (2).pptx`. Patryk should open both and delete whichever is stale.
  - `Organisation/Lesson 13 - Organisation Review` went into `B2 Organisation/Lesson 14` (Lesson 13
    was already taken by "Health Issues and Life Style"; 14 was free).
  - Verified every moved file exists and is byte-identical in B2 Organisation before deleting the
    two stray folders. Logged in drive-write-log.txt.
- **Year 9 Physics P3 Particles empty originals deleted** (Claude's judgment, approved by Patryk):
  Lesson 7 "Internal Energy" (empty - Lesson 6 already holds that content), Lesson 10 "Specific
  Latent Heaty Practical" (empty - content is at Lesson 14 "Latent Heat Capacity Practical"),
  Lesson 12 "Revision" (empty - content is at Lesson 15 "Revision Lesson"). All three were 0 files,
  so deleting them lost nothing; left 13-15 untouched rather than renumbering (no reference elsewhere
  depends on those specific numbers). P3 Particles now runs Lessons 1,2,3,4,5,6,8,9,11,13,14,15.
