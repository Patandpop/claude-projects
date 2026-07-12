# Design-pending options — for Patryk's sign-off

Three backlog items where the *idea* is agreed but the *look* isn't — same workflow as
Bug 59/60 (mock → Patryk picks → build). Nothing in this document has been built. Pick
an option (or tell me to mix and match) and I'll build it next session.

---

## 1. "Reformat the information" — a new Build activity type

**The idea:** students are given information and have to reorganise it into a
different format — a task type Patryk likes and currently has no equivalent for.

Rather than one flexible "do anything" type, here are three separate candidate
features. Recommend picking **one to build and try first** rather than all three at
once.

**Option A — Sort into a table**
Students are given a jumbled list of items/facts and sort them into the correct
columns of a table (e.g. "sort these 8 properties into Solids / Liquids / Gases").
Lowest renderer risk — this is close to the existing `sort` Build type, just with a
table layout instead of category boxes.

**Option B — Extract key points into a mind-map skeleton**
Students read a paragraph of prose and pull out key points onto a pre-drawn mind-map
skeleton (a central topic box with empty branch boxes radiating out). Medium renderer
risk — needs a new native-shape layout (radiating boxes + connector lines).

**Option C — Reorder scrambled steps into a flowchart**
Students are given process steps out of order and put them in the correct sequence.
Could reuse the flow/arrow native shapes already built for Learn-G/I (Bug 54) — lowest
extra renderer work of the three, since the shape-drawing code already exists.

**My recommendation:** Option C, since it reuses existing native-shape code (Bug 54's
`flowStepBox`/`flowArrow`) rather than needing anything new — fastest to ship and
lowest risk of a new visual bug.

---

## 2. Subject-specific top-bar images

**Clarifying what "top bar" currently means:** there is currently only ONE such
element in the whole system — the thin decorative strip image at the top of every
worksheet page (Word document, not the slides). It is currently hardcoded to always
show the same image (a Physics starfield), regardless of subject. If you meant
something on the slides instead of the worksheet, tell me and I'll re-scope this.

**What's ready:** five candidate images already exist on disk, correctly sized to
match the current strip (1500×120px, same 12.5:1 aspect ratio as the current 674×54
placement — no resizing/distortion risk, confirmed):
- `topbar-chem-1-graphene.png`
- `topbar-chem-2-fullerene.png`
- `topbar-bio-1-dna.png`
- `topbar-bio-2-neuron.png`
- `topbar-bio-3-leafveins.png`

Chemistry was already decided in an earlier session (graphene/fullerene, you were
keen on both). Biology is undecided — three candidates exist (DNA helix / neuron
network / leaf veins).

**Questions for you:**
1. Which one Biology image? (or do you want more than one, chosen some other way —
   see Q2)
2. Do you want ONE fixed image per subject, or variety — e.g. picked at random per
   lesson, or rotated by macrotopic? (fixed-per-subject is simplest to build)
3. Physics currently has the starfield already — keep that as Physics's fixed image,
   or replace it too?

---

## 3. Bug 34 — annotated diagram breakdown slide

**Source material:** the backlog names a file `Lesson_4_-_EPIBA_Chromatography_EPA.pptx`
which does not exist under that name anywhere in this repo or on the Drive mount.
What I did find on Drive, which is almost certainly the intended reference:
`G:\My Drive\Beechen Cliff Science\Lessons\Year 7\Chemistry\C3 Separating Mixtures\
Lesson 1 - Chromatography\WS Chromatography.pptx` (and a second file, `DELBAR
Chromatography.pptx`, in the same folder). Worth a 30-second check that this is the
right deck before the mock session — the backlog's filename may just be an old/renamed
reference.

**The idea:** a slide type that takes one base diagram image and labels parts of it
with callouts (e.g. "Solvent Front", "Separated Dyes", "Filter Paper" on a
chromatography diagram), instead of the current workaround (you draw the labels on
the board by hand).

**Option A — Edge labels with leader lines**
Labels sit around the outside of the diagram, each with a thin line pointing to the
labelled spot. Classic textbook-diagram look. Most layout math (line routing so labels
don't overlap) — highest renderer complexity of the three.

**Option B — Numbered badges + a key box** (recommended default)
Small numbered circles sit directly on the diagram at each labelled point; a
key/legend box elsewhere on the slide lists "1 = Solvent Front", "2 = Separated Dyes"
etc. Reuses the numbered-badge visual language already used elsewhere in the deck
system (lower risk, familiar to students already).

**Option C — Click-to-reveal build**
Each label appears one at a time as a separate slide-advance/animation step, building
up the full annotated diagram progressively. Highest teaching value (matches how you'd
narrate it live) but by far the most renderer complexity — PowerPoint animation
sequencing from a generated deck is a different code path to everything else in the
skill.

**My recommendation:** Option B — reuses existing visual language, avoids new layout
math, and is the standard textbook convention anyway.
