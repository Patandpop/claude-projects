# Grilling: the installed app (moving the phone and desktop side off Apps Script)

Grilled 2026-10-29 with Patryk, 4 rounds. Ready to build.

## Decisions

**What it fixes, in order:** 1. launch speed (and long jobs freezing the planner), 2. updates going live with no pasting, 3. no URL bar, 4. notifications, 5. sound, 6. desktop Ulhu. Speed is his pick for first place; Claude set the rest of the order as a default, and Patryk can change it. The paste size limit is no longer a problem.

**Shape:** one app with tabs (planner, behaviour, Ulhu), installable on his Android phone and his home PC (desktop Ulhu = the app installed on the home PC as its own window).

**Hosting:** Cloudflare Pages (free, private, goes live by itself on every change Claude pushes). Google Sheets/Drive stay as the data, with Apps Script as the data layer for now. Design the data layer so it can be swapped later: he wants "real apps" in future, not Apps Script and spreadsheets for ever.

**Accounts and pupil data:** everything moves to his **personal** Google account, pupil names included (his informed choice; Claude raised the data-protection risk once). Only what must stay in school stays there: Classroom and the pupil Forms. Forms working across both accounts would be nice, but may be hard. Hard limits: pupil data never goes into an outside company's database, and pupil names never go in the repo.

**Moving the data:** once, at school: download the Planner Sheet as Excel, then upload it to his personal Drive at home. A one-off setup script prepares it. The school Sheet stays untouched as a backup.

**Sign-in:** personal Google account on phone, home PC and the school PC (he believes he can log in to personal Google at school; confirm with the school test).

**School test first (two minutes, before building):** a tiny test page he opens once at school. It checks (1) the personal Google login works on the school PC, (2) whether the school project accepts direct updates from Claude Code (he wants them for both the school and personal projects if possible; the sign-in token lives on the home PC only and is never committed).

**Offline:** everything opened last stays readable; taps (behaviour points, Ulhu ticks) are saved on the phone and sent when signal returns.

**Notifications:** a morning one listing today's lessons not built yet, and one when a long job finishes. No Ulhu nudges yet (that's for the companion grilling). Quiet hours: 7am to 7pm on school days only; nothing at weekends or in the holidays (from the term dates).

**Sound:** only Ulhu moments (ritual done, level up), with a mute button, off by default at school.

**Long jobs** (test making, order-sheet changes): run in the background; the app stays usable; a small "making test... done" note when finished.

**Moving over:** screen by screen, most-used first; the old link keeps working on the same data the whole time.

**Quick wins:** Native Alpha is Patryk's job, some other time. The speed fixes in the current app (show the last saved screen instantly, the phone view stops loading the desktop planner, Ulhu art loads only when his tabs open) and the background long jobs stay on Fable's Phase 2 list. Assumed yes; he only deferred Native Alpha.

## Starting facts (from the repo)

- The planner, behaviour, phone page and board are one Apps Script web app saving into one Google Sheet in his school Drive.
- It is deployed "Anyone within organisation" because the school blocks public apps. So the app currently lives inside the school Google account.
- Phone page = planner link + `&view=phone`, added to the home screen. Board = `&view=board`.

## Rounds

### Round 1 (answered 2026-10-29)

- **Order of fixes:** launch speed first. (Rest of the order still to settle.)
- **Data:** first answer "everything stays in the school account", but he then asked why the planner is in the school account at all and whether it could live in his personal Drive. Answered in round 2.
- **School login to an outside app:** not sure. Must be checked before building.
- **Devices:** phone, home PC and the school PC.
- **Paste size limit:** not really an issue any more. The real pain is different: long jobs (Claude changing the order sheet, and especially test making) take ages and **freeze the planner** while they run. Loading of the planner and Ulhu is slower than he wants.
- **What he wants overall (his words):** "apps", things on the phone, connected in the smoothest way, more features, and **updates going straight from Claude** (no more pasting code into Apps Script).

### Round 2 (answered 2026-10-29)

- **Accounts:** he wants everything moved to the personal account (1b). His reason: he wants direct updates and thinks they can't reach the school project. Claude pushed back on pupil data (round 3, question 1). Still open.
- **Direct updates:** preferred (2a) if possible. Whether the school allows it is unknown. Test it alongside the school login test.
- **Long jobs:** run in the background; the planner stays usable; a small "making test... done" note when finished.
- **School test:** yes, a tiny test page opened once at school decides it.
- **One app with tabs** (planner, behaviour, Ulhu), not separate icons.
- **Longer term:** he wants to move away from Apps Script and spreadsheets towards "real apps", or whatever works. The builder should design so the data layer can be swapped later.

### Round 3 (answered 2026-10-29)

- **Pupil data: his decision is to move everything to the personal account, names included**, except what has to stay in school to work: Classroom and the pupil Forms. Forms could work across both accounts if that's doable, but that may be hard. Claude raised the data-protection risk once (an audit or a parent complaint lands on him) and he chose this knowingly. Builder: pupil data stays inside his own Google account (no outside database), and still no pupil names in the repo.
- He's fine with the work-only things living in the school account and the rest living with his home setup.
- **Offline:** everything opened last stays readable; taps (behaviour points, Ulhu ticks) are saved on the phone and sent when signal comes back.
- **Notifications:** (a) a morning one listing today's lessons not built yet; (c) a long job has finished. No Ulhu nudges yet (that's for the companion grilling).
- **Quiet hours:** 7am to 7pm on school days only; nothing at weekends or in the holidays (use the term dates file).
- **Moving over:** screen by screen, most-used first. The old link keeps working the whole time, on the same data.

### Round 4 (answered 2026-10-29)

- Hosting: Cloudflare Pages.
- Data move: download at school as Excel, upload at home, one-off setup script.
- School PC: he can most likely log in with his personal Google account; the school test confirms it.
- Sound: Ulhu moments only, mute button, off at school by default. Desktop Ulhu = the installed app on the home PC.
- Native Alpha: he'll do it another time.

## Other ideas
