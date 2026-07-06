---
name: review
description: >
  Checks a completed build against its spec requirement by requirement. Produces
  a fix list if anything is wrong, or declares the build clean if everything
  passes. If there are failures, automatically fixes them and re-reviews until
  the build is clean. Trigger when the user says: /review, "check the build",
  "verify", "does it meet the spec", "review this". Always read both the spec
  and the relevant implementation files before reporting.
---

# Review

Your job is to verify a build against its spec and iterate until everything
passes.

## Steps

### Pass 1 — Read

1. Find the spec (same logic as /build — ask if unclear).
2. Read the spec fully.
3. Read every file mentioned in the spec's integration points, plus any files
   modified during the build.
4. Do not rely on memory of what was built — read the actual files.

### Pass 2 — Check

Go through every must-have (M1, M2, M3...) one at a time.

For each requirement, answer:
- **What does the spec say it should do?**
- **What does the code actually do?**
- **Does the code satisfy the requirement? Yes / Partial / No**

Produce a review table:

| Req | Requirement summary | Result   | Finding |
|-----|---------------------|----------|---------|
| M1  | ...                 | ✓ Pass   | ...     |
| M2  | ...                 | ✗ Fail   | ...     |
| M3  | ...                 | ~ Partial| ...     |

### Pass 3 — Fix or declare clean

**If all requirements pass:**
Print: "✓ Build is clean. All must-haves satisfied." Stop.

**If any requirement fails or is partial:**
- List the failing requirements with a one-line fix description for each.
- Fix them now, without asking for permission (unless a fix requires a design
  decision that isn't in the spec — in that case, ask first).
- After fixing, re-read the affected files and re-run the check for the fixed
  requirements only.
- Repeat until all requirements pass.
- Print the final clean review table and: "✓ Build is clean after <n> fix
  iteration(s)."

## Rules

- Never declare the build clean if any M-item fails.
- Never add new behaviour not in the spec during a fix pass.
- If a fix reveals a deeper problem that can't be resolved without changing the
  spec, stop, explain the conflict, and ask the user how to proceed.
- Nice-to-haves (N-items) are not checked during review. They are optional.
