# Special cases: uploaded source files, video lessons, practical sequences, combined lessons

> Part of the science-lesson skill, moved out of SKILL.md (2026-10-23) so it is read only when needed. Read it when one of these applies. Everything in SKILL.md still applies.

- **Image extraction (M1–M3):** When a source PPTX or DOCX is uploaded, extract images using Python's `zipfile` module before building the JSON. PPTX: extract from `ppt/media/`; DOCX: extract from `word/media/`. Write each file as `/mnt/user-data/outputs/img_1.png`, `img_2.png`, etc. Match EACH image to a slide slot by type group (real-world photo → Engage; labelled diagram → Learn A/B; apparatus setup → Build practical). **Set `embeddedImagePath` + `imageConfidence: "search"` on EVERY matched slide entry independently** — multiple `embeddedImagePath` fields per lesson are valid and expected. If Engage gets img_1.png and Learn A gets img_2.png, both entries get their own field. `image_dump` catches genuinely unmatched images only — never use it as a fallback for images that have a clear slot match. Matched images must NOT also appear in `image_dump`. The `image_dump` slide is appended last and must be deleted before sharing.
**3a — Image extraction (if source PPTX or DOCX uploaded).** Before writing the JSON: use Python `zipfile` to pull images from `ppt/media/` (PPTX) or `word/media/` (DOCX) → write to `/mnt/user-data/outputs/img_1.png`, `img_2.png`, etc. Match each image to a slide slot by type (real-world photo → Engage; labelled diagram → Learn A/B). Set `embeddedImagePath` + `imageConfidence: "search"` on matched items in the JSON. Add `image_dump` as the final field on the lesson object (all images, matched or not, with slot labels or `"unassigned"`). Skip this step if no source file is uploaded — placeholder behaviour is unchanged.
## Image extraction — when a source file is uploaded

Run this step only when Patryk uploads a PPTX or DOCX alongside the lesson request. **If no file is uploaded, skip entirely — placeholder behaviour is unchanged (no regression).**

### 1 — Extract images

PPTX and DOCX are ZIP archives. Use Python's `zipfile` to pull all images **before** writing the lesson JSON:

```python
import zipfile, os

out_dir = "/mnt/user-data/outputs"
# PPTX: media_prefix = "ppt/media/"
# DOCX: media_prefix = "word/media/"
media_prefix = "ppt/media/"

with zipfile.ZipFile("uploaded.pptx") as z:
    media = sorted(f for f in z.namelist() if f.startswith(media_prefix) and not f.endswith("/"))
    for i, path in enumerate(media, start=1):
        ext = os.path.splitext(path)[1] or ".png"
        with open(f"{out_dir}/img_{i}{ext}", "wb") as f:
            f.write(z.read(path))
```

Output: `img_1.png`, `img_2.png`, … written to `/mnt/user-data/outputs/` alongside the built PPTX/DOCX, so `build.js` can reference them by path.

### 2 — Match images to slide slots

Group by semantic type; assign sequentially within each group:

| Image type | → Slot |
|---|---|
| Real-world photo — scene, object, phenomenon | Engage `imagePlaceholder` |
| Labelled diagram, circuit diagram, apparatus setup | Learn A/B or Build practical |
| Graph, chart, axes | Learn J or Build `graphInterpret` |
| Genuinely ambiguous | unassigned |

If a slide type has no matching image, leave its `imagePlaceholder` as-is — the grey box renders as normal.

### 3 — Update matched slide entries in the JSON

For each matched entry, add two fields:

```json
"embeddedImagePath": "/mnt/user-data/outputs/img_1.png",
"imageConfidence": "search"
```

`build.js` detects `imageConfidence: "search"` and calls `addImage()` instead of the grey placeholder. Sizing (aspect-ratio-preserving fit within placeholder bounds) is handled by the renderer — no extra work needed.

### 4 — Append the image_dump entry

Add `image_dump` as the **final top-level field** on the lesson object (sibling of `meta`, `apply`, `review` — not inside any array):

```json
"image_dump": {
  "images": [
    { "path": "/mnt/user-data/outputs/img_1.png", "label": "Engage" },
    { "path": "/mnt/user-data/outputs/img_2.png", "label": "Learn A" },
    { "path": "/mnt/user-data/outputs/img_3.png", "label": "unassigned" }
  ]
}
```

Every extracted image appears here — matched ones carry their slot label, unmatched carry `"label": "unassigned"`. `build.js` renders this as a labelled grid appended as the last slide. **Always tell Patryk to delete the dump slide before sharing the lesson.**

---

## Planning practical sequences — when one practical = two lessons

A multi-step or concept-heavy practical should usually NOT be forced into a single theory+practical lesson. Decide the split from the lesson sequence (no manual flag):

**Default:** if the practical is short and the underlying idea is already secure, one `practical` lesson is fine.

**KS3 — split into two** when the practical is multi-step and needs real concept build-up before students can just *do* it:
- **Lesson N — build-up** (`standard` type): builds the ideas, ends by previewing the method.
- **Lesson N+1 — the practical** (`practical` type): students walk in ready to work.
- Naming: consecutive numbered lessons in the same macrotopic folder, e.g. `Lesson 4 - Enzymes and pH` then `Lesson 5 - Enzymes and pH practical`.

**Y12/13 — demo-then-practical pattern:**
- **Lesson N — demo lesson**: Patryk orders a demo setup and shows the technique in class.
- **Lesson N+1 — the practical**: students run it with a **method sheet listing the CPAC skills** (Common Practical Assessment Criteria) they must hit. Always put the CPAC success criteria on the A-level method sheet.

**Capstone rule (pairs with the above):** when a practical fills its whole lesson, the deep extended-writing payoff belongs in the follow-up lesson — build that follow-up (existing `revision` or `review` type) up to a genuine 6-mark extended question as the capstone, with sentence starters on the support sheet, using the class's real practical results as the data rather than generic textbook numbers.

This is a planning workflow, not a renderer feature — there is no dedicated lessonType for it.

---


## Learn variant H — video lessons

**Trigger:** use variant H whenever the lesson plan includes a video element — when `videoLink` is present OR when the lesson plan explicitly mentions a video as the primary learning activity. Never fall back to variant A when a video is the intended mechanism.

**Schema:**
```json
{ "variant": "H", "heading": "...", "videoLink": { "text": "descriptive title", "url": "https://..." }, "toWatch": ["look for X", "look for Y"], "prompt": "optional pause prompt", "questions": [ { "q": "...", "a": "..." } ] }
```

- `questions` must be `{q, a}` objects — not bare strings. The `q` text appears on the worksheet; the `a` text appears on the answer slide.
- `toWatch` bullets go in a **white-fill + gold-border** box (house style). Never amber or yellow fills on any Learn-H box.
- If `questions` contains objects with answers, the renderer automatically generates an answer slide (same purple-pen / review-row format as DoNow Answers) immediately after the Learn-H slide.
- Video questions appear on the worksheet automatically when the Learn-H item has a `questions` array (handled by `videoQSection` in the worksheet builder).

---

## Combined lesson mode

Valid when Patryk says "combine lessons X and Y" or "fast-paced hour covering both", typically when adjacent lessons in the scheme have thin or repetitive content.

Build a single lesson object: two Learn slides (one per topic), unified Do Now drawing from both topics, Build covering both topics, Apply and Review spanning both. Do NOT pad either topic to fill time. Same output format: PPTX + worksheets (not a double-length lesson — a merged single lesson). Normal MCQ count (6, one block) still applies across both topics combined.

---

