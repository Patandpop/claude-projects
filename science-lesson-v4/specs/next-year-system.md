# Next-year system (2026/27) — folder structure, scheme of learning, school-Drive uploader

Staged 2026-07-09. Class data: `classes-2026-27.json` (project root). Nothing here goes live before September.

## 1. Folder structure — YEAR GROUP → topic → lesson

No class-name layer: the same lesson is taught to every class in a year group.

```
Lessons 2026-2027/            (location decision UNRESOLVED — see §4)
  Year 8/
    Physics/
      P1 Forces/              (topic folder names come from the scheme of learning)
        Lesson 1 - Speed/
          Speed.pptx
          Speed_worksheet.docx
          Speed_support_worksheet.docx
          source-images/      (extracted source assets, generated graphs)
```

- **Dual-version rule:** standard + support worksheets come from the SAME content object. Support = added scaffolding (word banks, sentence starters, hints), NEVER fewer questions per tier. Sometimes Patryk wants two full versions generated to pick from — that is two builds of the same object with a variation note, not two content objects.
- Print assets (topic overview sheets KS3, unit front sheets KS4/5, homeworks, assessments/PLCs) are ORDER-SHEET items, not build outputs. They never appear in lesson folders. Quantity on the order sheet = class size, labelled by topic.
- **Drive as actually filed (reorganisation finished 2026-10-02):** the live tree is `G:\My Drive\Beechen Cliff Science\Lessons\Year X\Subject\Topic\Lesson N - Title` (Year 12/13 have no subject layer: `Lessons\Year 12\Chapter N - Name\Lesson N - Section`). KS4 topic overviews sit at TOPIC level (beside the lesson folders, never inside one). Tests/markschemes/PLCs: `Admin\Assessment\Year X\Subject\Topic`. Key homeworks + Activate scans: `Admin\Homework`. Full map: `design-audit/drive-inventory/REORG-SUMMARY.md`; open gaps: `GAPS-and-cleanup.md`.

## 2. scheme-of-learning.json — the central data source

One file Claude Code reads for: lesson sequencing, Do Now spaced retrieval (prior topics), practical order sheets, textbook/Kerboodle references.

**Schema (per year group):**
```json
{
  "year8": {
    "topics": [
      {
        "code": "P1", "name": "Forces", "subject": "Physics",
        "order": 1, "term": "Autumn 1",
        "lessons": ["Speed", "Acceleration", "..."],
        "textbook": "Activate 2", "practicals": ["trolley ramp"]
      }
    ]
  }
}
```

**BLOCKED ON PATRYK:** the trust's scheme of learning (topic order per year group) has not been supplied yet. Nothing real can be built until he pastes/uploads it. When it arrives: populate this file AND generate the folder tree from it.

## 3. School-Drive uploader (Apps Script web app)

School Workspace blocks Drive for Desktop, third-party API access, and Drive MCP (all confirmed). Apps Script runs first-party under Patryk's own school identity, so a web app is the only sanctioned door.

**Architecture:**
1. **Home side (BUILT):** build.js writes a `[base].manifest.json` sidecar next to each lesson's outputs — files list + intended Drive folder path + lesson meta. Same naming logic as the existing uploader.
2. **Pusher (BUILT, needs URL):** `references/push-to-school.js` reads a manifest, base64-encodes each file, POSTs to the deployed web-app URL with a shared secret. Config: `school-uploader.json` in the project root (`{"url": "...", "secret": "..."}`) — create after deployment.
3. **School side (WRITTEN, you deploy):** `references/appscript-uploader.gs`. Deployment (one-time, at school, ~10 min):
   1. On your school account, go to script.google.com → New project.
   2. Delete the empty code, paste the whole of appscript-uploader.gs.
   3. Change `SECRET` at the top to a password you invent (same one goes in school-uploader.json at home).
   4. Deploy → New deployment → type "Web app" → Execute as: **Me** → Who has access: **Anyone with the link** → Deploy. Authorise when asked.
   5. Copy the web app URL into `school-uploader.json` at home.

**Behaviour rules (both sides):**
- Idempotent: re-sending a file replaces the existing one of the same name in the same folder (no duplicates, no versions piling up).
- Failure-tolerant: each file is independent; one failure never blocks the rest; every result is reported per file.
- Folder creation IS allowed here (this is Patryk's own school-Drive structure being built to his design) but only under the configured root folder, never outside it.
- Every upload is logged (Apps Script keeps a log sheet; the pusher prints a per-file report).

**Migration of existing personal-Drive content:** Patryk plans to use Google's transfer tooling to move/copy content across, then Claude Code organises it into the structure above. Only one Year 7 Biology topic has been uploaded so far. Organising = a later session, after the transfer runs.

## 4. UNRESOLVED — Patryk paused these, do NOT assume

- (a) Do parallel classes in a year group ever need separate folders, or always one shared sequence per topic?
- (b) Fresh "Lessons 2026-2027" root vs continuing the existing structure — no preference given yet.

## 5. September flip checklist (for the session that goes live)

1. Point context.js / order-sheet.js / daily-brief.js class lists at `classes-2026-27.json` (7MLA needs its size filled in; 12C size TBC).
2. Load the populated scheme-of-learning.json; generate the folder tree.
3. Update CLAUDE.md class table; retire the 2025/26 one.
4. Homework day-of-week map for the new year (currently Y7 Mon / Y8 Tue / Y9 Wed / Y10 Thu — confirm still true).
5. Deploy the Apps Script uploader if not done over summer; test with one lesson.
6. PSHE-9AB (fortnightly, Week A Wed P5) added wherever lessons are planned but marked non-science.
