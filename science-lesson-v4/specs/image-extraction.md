# Spec: Image Extraction

## Overview
Automatic extraction and placement of images from source PowerPoint or Word
files into the generated lesson output. When Patryk uploads a school source
PPTX or DOCX alongside the lesson request on claude.ai, images are extracted
from the file's media folder, matched to the correct output slide slots, and
embedded automatically. A labelled dump slide is always appended so Patryk can
verify the matching and delete it before sharing. Falls back to placeholder
behaviour when no source file is provided.

## Inputs
- Source PPTX (optional) — school PowerPoint uploaded to claude.ai alongside
  the lesson content request
- Source DOCX (optional) — school worksheet uploaded to claude.ai; applies the
  same extraction to fix the current image-loss problem when worksheets are
  converted to MD
- Lesson content JSON — generated as normal by claude.ai; gains `embeddedImagePath`
  and `imageConfidence: 'search'` fields per slide when images are matched

## Outputs
- Extracted image files written to `/mnt/user-data/outputs/` (e.g. `img_1.png`,
  `img_2.png`) alongside the lesson build output
- Content JSON with `embeddedImagePath` and `imageConfidence: 'search'` set on
  each matched slide entry — build.js reads these to call `addImage()`
- A new `image_dump` slide appended as the final slide of the output PPTX,
  containing a labelled grid of all extracted images

## Must-haves

**M1** — When a source PPTX is provided, extract all images from `ppt/media/`
(PPTX is a ZIP archive). Write each image as a numbered file to the output
directory (`img_1.png`, `img_2.png`, etc.).

**M2** — When a source DOCX is provided, extract all images from `word/media/`
using the same ZIP extraction. This fixes the current bug where worksheet
images are lost on MD conversion.

**M3** — Match extracted images to output slide slots by grouping first by
slide type (Engage, Learn A, Learn B, Build, Practical, etc.), then assigning
sequentially within each group. For ambiguous images, apply semantic judgement:
diagrams with labels → Learn; real-world photos → Engage. Anything genuinely
uncertain is left unassigned.

**M4** — For each matched slot, set `embeddedImagePath` (path to the extracted
file) and `imageConfidence: 'search'` in the content JSON entry. build.js
already uses these fields to call `addImage()` — no change to build.js image
placement logic required.

**M5** — Images must be sized to fit within the existing placeholder bounds,
maintaining aspect ratio. build.js passes the placeholder dimensions to
`addImage()` — this sizing behaviour is already correct.

**M6** — When no source file is provided, behaviour is unchanged: `imagePlaceholder()`
renders the grey box with description as today. No regression.

**M7** — A new `image_dump` slide type is added to build.js. It renders a grid
of all extracted images (matched and unmatched), each with a minor label showing
its assigned slot (e.g. "Engage", "Learn A box 2") or "unassigned". Always
appended as the last slide when images were extracted.

**M8** — The `image_dump` entry is added to the content JSON by claude.ai as
the final item: `{ "type": "image_dump", "images": [{ "path": "img_1.png",
"label": "Engage" }] }`. build.js renders it from data — no rendering logic
lives in the claude.ai generation step.

## Nice-to-haves

**N1** — Where the same image clearly serves multiple slide slots (appears
identical or near-identical in source), flag it in the dump slide rather than
assigning it to only one slot, so Patryk can decide.

## Out of scope
- Image search from the internet (separate future goal)
- Running image extraction in Claude Code at home (deferred — this is
  claude.ai only for now; home pipeline follows once order sheet is built)
- Creating, editing, or resizing images beyond aspect-ratio-preserving fit
- Animated GIFs or embedded video frames
- Images inside PDF source files

## Integration points
- `build.js` — `imagePlaceholder()` and the `imageConfidence: 'search'` +
  `embeddedImagePath` path already exist (lines ~436–464). New work: add
  `image_dump` slide type renderer.
- `SKILL.md` — needs new instructions telling claude.ai to extract images from
  uploaded source files and populate `embeddedImagePath` fields and the
  `image_dump` entry in the content JSON.
- Content JSON — `embeddedImagePath` and `imageConfidence` fields per slide
  entry; `image_dump` as final entry when images present.
- `/mnt/user-data/outputs/` — extracted image files land here so build.js can
  reference them by path during the same sandbox run.

## Success criteria
- A lesson built with a source PPTX has real images in slide slots instead of
  grey placeholders, with no manual intervention from Patryk
- All extracted images appear on the final dump slide with their slot labels;
  the slide can be deleted before sharing
- A lesson built without any source file is byte-for-byte identical in
  behaviour to today (no regression to placeholders)
- A worksheet built from a source DOCX retains images in the correct positions
  rather than losing them at MD conversion
- The `image_dump` slide type is the only build.js code change required; no
  existing slide type logic is modified
