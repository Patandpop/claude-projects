# Spec: Image Embedding Fix

## Overview
`build.js` currently only embeds real images on `slideEngage`. Every other slide type that has an image area calls `imagePlaceholder()` unconditionally, ignoring `embeddedImagePath` and often dropping `imageDescription` too — so the grey placeholder always appears even when a real image has been provided. This spec covers applying the proven fix pattern (already working on `slideEngage`, partially applied to `slidePractical` in the claude.ai sandbox) to the four remaining PPTX call sites and the one DOCX call site, and porting the sandbox `slidePractical` diff to the home `build.js`.

## Inputs
- `item.embeddedImagePath` — absolute path to a real image file (set when `imageConfidence: 'search'`)
- `item.imageConfidence` — `'search'` triggers real-image embedding; any other value falls back to placeholder
- `item.imageDescription` — description string for the placeholder box when no real image is present
- `item.imagePlaceholder` — if `false`, suppresses the image area entirely (existing behaviour, must be preserved)

## Outputs
- **PPTX:** real image rendered on the slide when `embeddedImagePath` is set; description-aware placeholder otherwise
- **DOCX worksheet:** real image in the practical experiment box when `embeddedImagePath` is set on the practical item; `imageDescription` text in the placeholder otherwise

## Must-haves

**M1** Port the `slidePractical` sandbox diff (from `skill-findings-chromatography-session.md`) to the home `build.js` (~line 1261/1267). The sandbox version is the authoritative patched copy.

**M2** Apply the fix pattern to `slideLearn` variant A (~line 683):
```js
if (item.imageConfidence === 'search' && item.embeddedImagePath) {
  s.addImage({ path: item.embeddedImagePath, x: rightX, y, w: rightW, h: bodyBottom - y });
} else {
  imagePlaceholder(s, rightX, y, rightW, bodyBottom - y, item.imageDescription || null);
}
```

**M3** Apply the same fix pattern to `slideLearn` variant B (~line 714) at its image call site.

**M4** Apply the same fix pattern to `slideLearn` variant D (~line 750) at its image call site.

**M5** Apply the fix pattern to `slideGraphInterpret` (~line 1478) — two things to fix here: add the `embeddedImagePath` check (same pattern), AND pass `item.imageDescription || null` as the description argument to `imagePlaceholder()` (currently it passes nothing, so description is always dropped).

**M6** Fix `diagramOrImage(prac)` in the DOCX builder (~line 2078) — same logic as PPTX: embed the real image via docx.js when `prac.embeddedImagePath` is set and `prac.imageConfidence === 'search'`; otherwise render `prac.imageDescription` as the placeholder text instead of the hardcoded generic string.

**M7** `imagePlaceholder: false` on any item must still suppress the image area entirely — existing behaviour must not regress.

**M8** `slideEngage` must be left untouched — it is the reference implementation and already works correctly.

## Out of scope
- `slideApply` — no image support exists in schema or renderer; separate feature if ever needed
- Any changes to `slideEngage` (already correct)
- The matplotlib/SVG image paths (Learn-G flow diagram, graph generation) — different code paths, not broken
- `embed_real_images.py` workaround script — useful fallback but not part of this renderer fix

## Integration points
- `science-lesson/references/build.js` — home copy, all edits go here
- `imagePlaceholder(s, x, y, w, h, description)` — existing utility, already accepts description param
- `s.addImage({ path, x, y, w, h })` — pptxgenjs method, already used in `slideEngage` at ~line 551
- DOCX builder image embedding — check whether docx.js has an existing image helper in the builder before adding inline; match the prac section's existing structure
- `skill-findings-chromatography-session.md` — contains the exact `slidePractical` diff to port for M1

## Success criteria
1. Build a lesson JSON with `imageConfidence: 'search'` and a valid `embeddedImagePath` on a Learn-A, Learn-B, Learn-D, graphInterpret, and practical item — every slide shows the real image, no grey placeholder
2. Build the same JSON with `embeddedImagePath` removed but `imageDescription` set — every placeholder shows the description text, not the generic `[Image — add imageDescription to JSON]` fallback
3. DOCX worksheet practical section embeds the real image when `embeddedImagePath` is set
4. DOCX worksheet practical section shows `imageDescription` in the placeholder when no `embeddedImagePath` is set
5. `slideEngage` with an existing `embeddedImagePath` still works (no regression)
6. `imagePlaceholder: false` on a practical item still suppresses the image column entirely
