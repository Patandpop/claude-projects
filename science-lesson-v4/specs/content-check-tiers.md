# CONTENT CHECK — blocking vs warning policy

Decided 2026-07-12 after a second-opinion consult. Plain English so the reasoning survives.

## The problem

The CONTENT CHECK report (in build.js) lists whether a lesson follows the authoring rules: Do Now of exactly 6, exactly 4 MCQs, at least 3 Apply questions per tier, images described, Drive details present. A July audit found real lessons shipping with only 1 MCQ, a Do Now of 5, no review, and missing Drive details. The report warned but always built, so the warnings were ignored.

The temptation was to make everything a hard stop. That is wrong. The build often runs at school on claude.ai a few minutes before the lesson. A hard stop there, especially from a checker that is itself mistaken, could leave Patryk with nothing to teach. A thin lesson at 8:55 beats no lesson.

## The rule

Three tiers.

1. **Hard fail (refuse to build).** Only when the output is genuinely broken or would be lost, not merely thin. Today that is exactly one case: a teaching lesson with no Apply questions in any tier, which would print empty tier headings on the worksheet. This cannot happen in a real lesson, so refusing is safe.

2. **Warn loudly.** Everything pedagogical: 5 Do Nows instead of 6, 2 MCQs instead of 4, a light Apply tier, a missing image description. These all still build. A plain-English one-line summary prints under the report so a thin lesson is visible at a glance.

3. **Always overridable.** Passing `--force` (or setting `FORCE_BUILD=1`) builds even the hard-fail case. It announces itself loudly ("FORCED BUILD") so it can never quietly become the normal way to build. This is the escape hatch for the worst case: a false positive in a checker, minutes before a lesson.

## Deliberately NOT blocking: missing Drive details

Missing year, subject, macrotopic, lesson number or title only stops the home auto-upload to Google Drive. The lesson itself builds and is completely teachable, and at school there is no uploader at all. Refusing to build over a field that does not matter in the room would be the exact mistake this policy exists to avoid. The uploader already refuses loudly by itself when the details are wrong, and now also maps a near-miss macrotopic onto the right folder automatically.

## Where it lives

- `contentCheck(L)` in build.js returns the list of blocking faults.
- `enforceBlockers(blockers, label)` throws (or, with `--force`, warns and continues).
- The regression harness builds a synthetic no-Apply lesson to prove the block fires and that `--force` overrides it.
