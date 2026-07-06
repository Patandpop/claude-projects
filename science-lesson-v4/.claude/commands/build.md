---
name: build
description: >
  Reads a spec from specs/<name>.md and implements it exactly. Produces a
  coverage report listing every must-have and whether it was addressed.
  Trigger when the user says: /build, "implement the spec", "build it",
  "code this up", "make it". Always read the spec first before writing any code.
---

# Build

Your job is to implement a spec and report what you did.

## Steps

1. **Find the spec.** If the user named it (e.g. `/build science-lesson-v3`),
   read `specs/science-lesson-v3.md`. If not, list the files in `specs/` and
   ask which one to build.

2. **Read the spec fully before writing a single line of code.**

3. **Plan before acting.** Write a brief implementation plan (bullet points,
   not prose) covering the major changes. Show it to the user and ask: "Any
   changes before I start?" Wait for confirmation.

4. **Implement.** Work through the must-haves in order (M1, M2, M3...). For
   each one:
   - Make the change
   - Add a brief inline comment noting which requirement it addresses
     (e.g. `// M3: validation pass`)

5. **Coverage report.** After implementing, print a table:

   | Req | Description | Status | Notes |
   |-----|-------------|--------|-------|
   | M1  | ...         | ✓ Done | ...   |
   | M2  | ...         | ✓ Done | ...   |

   If any must-have was not implemented, mark it ✗ Not done and explain why.

6. **Nice-to-haves.** If time and scope allow, implement any N-items and note
   them in the report. Otherwise list them as skipped.

7. Tell the user: "Run /review to check the build against the spec."

## Rules

- Never skip a must-have without flagging it.
- Never invent requirements not in the spec.
- If the spec is ambiguous, ask the user to clarify before proceeding — do not
  guess.
- If the build touches existing files, read them before editing. Do not assume
  their contents.
