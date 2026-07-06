# Spec: Drive Uploader

## Overview
A Node.js script (`upload-to-drive.js`) that runs automatically at the end of a
home build. It reads the lesson content JSON to construct the correct Drive
folder path, then copies the three build output files into that folder. No
manual input required. Designed as the foundation for the future weekly pipeline
(B) where lessons are generated and uploaded in sequence.

## Inputs
- The lesson content JSON (same file passed to `build.js`) — provides the meta
  fields needed to construct the Drive path
- The three output files written by `build.js` to the current working directory:
  - `[base].pptx`
  - `[base]_worksheet.docx`
  - `[base]_support_worksheet.docx`

## Outputs
- The three files copied into:
  `G:\My Drive\Beechen Cliff Science\Lessons\Year [X]\[Subject]\[MacrotopicCode Name]\Lesson [N] - [title]\`
  e.g. `Year 8\Physics\P6 Waves\Lesson 4 - Reflection\`
- Files renamed with `_PTO` suffix before the extension:
  e.g. `lesson4-reflection_PTO.pptx`
- A one-line confirmation printed to terminal: path copied to, filenames

## Must-haves

**M1** — Reads `meta.year`, `meta.subject`, `meta.macrotopic`, `meta.lessonNumber`, and `meta.title` from the content JSON to construct the full Drive destination path.

**M2** — Constructs the path in the form:
`G:\My Drive\Beechen Cliff Science\Lessons\Year [meta.year]\[meta.subject]\[meta.macrotopic]\Lesson [meta.lessonNumber] - [meta.title]\`

**M3** — Copies all three output files (`.pptx`, `_worksheet.docx`, `_support_worksheet.docx`) into the destination folder.

**M4** — Appends `_PTO` to each filename before the extension on the destination copy (source files are left unchanged).

**M5** — If the destination folder does not exist, prints a clear error naming the missing path and exits without copying. Does not create folders.

**M6** — Prints a confirmation line to terminal on success: destination path and the three filenames written.

**M7** — Invoked automatically at the end of `build.js` (after all three files are written), passing the content JSON path as an argument. No separate manual step required.

**M8** — Supports a `--dry-run` flag: prints the destination path and filenames that would be written, without copying anything or writing to the log.

## Nice-to-haves

**N1** — If a file with the same name already exists in the destination, prompt before overwriting (useful when re-running a build after a fix).

**N2** — Timestamped log entry appended to a local `upload-log.txt` recording: date, lesson, destination path. Useful later for the order sheet to infer class progress without reading Drive directly.

## Out of scope
- Creating Drive folders — all lesson folders already exist
- Uploading to the school Drive account (`ptomczynski@beechencliff.mnsp.org.uk`) — personal Gmail Drive only
- Running on claude.ai — home/Claude Code only
- Any interaction with the order sheet or weekly pipeline — those are separate projects that will call this script as a step

## Integration points
- `references/build.js` — must call `upload-to-drive.js` as the final step, passing the content JSON path
- Content JSON `meta` object — fields `year`, `subject`, `macrotopic`, `lessonNumber`, `title` must be present for path construction
- Google Drive for Desktop mounted at `G:\My Drive\` on the home Windows machine
- Future weekly pipeline skill will call this script per lesson

## Success criteria
- Script exits `0` on success, `1` on failure — visible in terminal without opening Drive
- Terminal prints the destination path and three filenames on success; a clear error naming the missing path on failure
- A line is appended to `upload-log.txt` on every successful upload (date, lesson, destination path)
- Running with `--dry-run` prints what would be copied without touching Drive — path logic can be verified without a live build
- build.js exits cleanly regardless of upload outcome (upload failure warns, does not crash the build)
