---
name: lesson-backlog
description: "Log a bug or improvement idea for the science lesson skill. Use when Patryk says 'note this', 'add to backlog', 'log this', 'remember to fix', 'I want to change', or describes something wrong with a lesson that just built. Append to the running backlog artifact, never overwrite it."
---

# lesson-backlog skill

When invoked:

1. Read `references/backlog.md` if it is in context. If it is not in context, start from whatever entries already exist in the current backlog artifact (or an empty list if this is the first call this session).

2. Ask Patryk one question only if his description is too vague to act on. Otherwise infer type (bug / enhancement / content) and proceed.

3. Format the new entry:

```
## [YYYY-MM-DD] — <short title, ≤8 words>
**Type:** bug | enhancement | content
**Description:** <what Patryk said, cleaned up, one or two sentences max>
**Context:** <slide type / function / class affected if mentioned>
```

4. Append the new entry to the backlog artifact below all existing entries. Never delete, move, or reorder existing entries.

5. Confirm in one sentence: "Added to backlog — [short title]."

6. Do not build a lesson, edit any file, or suggest a fix. This skill only logs.

---

## Shipping home

When Patryk says "show me the backlog" or "what's queued", display the full artifact contents.

When he says "copy for Claude Code", output the full contents as a single fenced markdown block he can paste directly into `references/backlog.md` on his home machine.
