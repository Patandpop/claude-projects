# Rules for every lane (29 Oct 2026)

Three chats build the plan at the same time, in the SAME folder on Patryk's PC, on branch `pre-reskin`. These rules replace the old "one Fable session owns all code" rules in FABLE-WORKPLAN.md Part B. Every other rule in Part B and CLAUDE.md still applies: plain English, no em dashes, mock-up first for visual changes, Plan Mode for build.js and builder/, Drive create-and-copy only, no paid APIs, no pupil names, all checks green before each commit.

## Who owns which files (never edit another lane's files)
- **Lane A, Ulhu game:** planner/Game.gs, planner/game-*.js, planner/game-shop.json, planner/tests/game.test.js, planner/tests/ulhu_sim.py, and the Ulhu parts of Phone.html. Lane A ALSO owns making the paste files (always one complete set).
- **Lane B, learning:** planner/Code.gs, planner/Planner.html, planner/Mailbox.gs, planner/Behaviour.gs, the lesson builder (science-lesson/**), test/, and the lesson and homework tools.
- **Lane C, your day:** a new folder app/ (the installed app), plus the evening timer and day screen. Lane C needs small additions in Code.gs or Planner.html: keep each one small, re-read the file just before editing, commit straight away, and say so in your log.
- Anything else shared (bundle.js, README files): small targeted edits, commit at once.

## Working beside two other chats
- Before each item: `git pull --ff-only origin pre-reskin`. If it can't fast-forward, `git pull --no-rebase origin pre-reskin`. Never rebase or force.
- Commit after each item with `git add <explicit paths>` only (never -A or .), then `git push origin pre-reskin`. If git says a lock file exists, wait 5 seconds and retry. If the push is rejected, pull (merge) and push again.
- A check that fails in a file you did not touch: wait a minute and rerun; another lane is probably mid-edit. Never "fix" another lane's file; tell Patryk if it stays red.
- Lane A makes paste files only when `git status` shows no uncommitted changes under planner/, so it never ships another lane's half-finished work.

## Your log
Write to `lanes/log-<your lane letter>.md` (create it), not FABLE-WORKLOG.md (that is now history; its top is slightly jumbled, leave it). Same format: a "Waiting on you" list at the top, then newest-first entries (date, item, what changed in one plain line, "You need to:", save id).

## Talking to Patryk
He reads these chats on his phone. After each item, one or two plain lines: what changed, and anything he must do. When you need a pick, publish a mock-up (Artifact), give him the link with lettered options, and carry on with the next item while you wait. Don't stop to ask permission for things the plan already decides. If you hit the usage limit, just stop; he will say "carry on" later.

## Model switching
Design work that still needs deciding runs on Fable; spec-following building runs on Opus (model `claude-opus-5-5`). A Fable chat hands over by starting an Opus chat itself (see its own starter).
