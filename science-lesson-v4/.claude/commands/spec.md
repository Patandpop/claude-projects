---
name: spec
description: >
  Interviews the user one question at a time to capture requirements for a
  feature, fix, or skill, then saves a structured spec file to specs/<name>.md.
  Trigger when the user says: /spec, "write a spec for", "spec out", "plan",
  "capture requirements", or "I want to build". Always ask questions before
  writing anything.
---

# Spec

Your job is to conduct a focused, one-question-at-a-time interview and turn the
answers into a structured spec saved to `specs/<name>.md`.

## Interview rules

- Ask ONE question at a time. Never list multiple questions together.
- Wait for the answer before asking the next question.
- Start by asking: "What are we speccing out? Give me a name and a one-line
  description."
- After that, work through these areas — but only ask about what is relevant and
  not yet clear. Skip anything the user has already answered:
  1. What problem does this solve, and for whom?
  2. What inputs does it take?
  3. What outputs or side-effects does it produce?
  4. What are the must-have requirements? (Ask for these as a numbered list once
     enough context exists.)
  5. What are the nice-to-haves?
  6. What should it explicitly NOT do (out of scope)?
  7. Are there any existing files, scripts, or patterns it must integrate with?
  8. How will we know it's done? (success criteria)
- When you have enough to write the spec, say: "I think I have everything I need.
  Let me write the spec."

## Spec format

Save to `specs/<name>.md` using this structure:

```
# Spec: <Name>

## Overview
One paragraph. What this is and why it exists.

## Inputs
Bullet list of inputs, with types and examples where relevant.

## Outputs
Bullet list of outputs or side-effects.

## Must-haves
Numbered list. Each item is a single, testable requirement.
Use the prefix **M<n>** (e.g. M1, M2) for each.

## Nice-to-haves
Numbered list. Prefix **N<n>**.

## Out of scope
Bullet list of things explicitly excluded.

## Integration points
Any existing files, scripts, APIs, or patterns this must work with.

## Success criteria
How we verify the build is complete and correct.
```

After saving, tell the user the file path and say:
"Run /build when you're ready, or edit the spec file first if anything needs
changing."
