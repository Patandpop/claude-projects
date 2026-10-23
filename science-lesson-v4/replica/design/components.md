# Components: Cthulhu habit game

Every component from `recon.md`, plus the small parts they are made of. Tokens are the `--g-*` roles in `tokens.md`. "Planner style" means reuse the planner's existing CSS (`button`, `button.primary`, `.card`, `#side button.on`, `#toast`, `.box` dialog) rather than drawing a new one. All copy below is our own.

Rules for every component: a real `<button>` for anything you tap; visible 2 px `--g-focus` ring on `:focus-visible`; 44 px minimum touch height on the phone; nothing that matters shown by colour alone; projector-safe hides life/external/health/reward content by not rendering it.

---

## Game tab (entry)
```
variants  sidebar button "Game" (laptop), chip in the phone top row
states    default, hover, on (planner #side button.on: gold edge, gold wash), with dot (something new: boss, Sunday review, new stock)
tokens    planner sidebar styles; dot 8 px --g-accent
a11y      aria-current="page" when on; the dot has a text label ("new")
used on   all screens
```

## Corner view (mini creature)
```
variants  1x (32 px) in the planner header, 2x (64 px) on the phone Today page
states    idle, happy (after a tick, 2 s), proud (level up or boss beaten, 3 s), sad (bad habit, 2 s), sleepy (after the evening cut-off), hidden (projector-safe off by choice)
tokens    pixel scale whole numbers only; no frame
a11y      button "Open the game"; mood change announced politely only for proud ("Level 8")
used on   planner header, Phone Today
```

## HUD card (coin counter + level + bars)
```
parts     Coin counter, Level pill, Health bar, XP bar, projector chip
states    default, coin gain (count rolls up over 600 ms, coin icon bounces once), coin spend (count rolls down, no bounce),
          level up (pill flashes gold, proud creature), health low (< 25%: bar edge pulses once, heart turns sad grey),
          frozen day (snowflake chip "Rest day: nothing can hurt today"), projector-safe (health bar removed, chip "Hidden for class")
tokens    bg --g-surface, border --g-border, radius card 10, padding 12; coin number type coin 22/700 --g-accent-text, label xs --g-text-muted
a11y      coin count in an aria-live="polite" region that reads the new total once, not every frame
used on   S01, S03, S05 (coin counter only), S06 (health bar only)
```

### Coin counter
```
parts     Eldritch Doubloon icon (16x16 art at 2x = 32 px), number, "Eldritch Doubloons" label (hidden under 340 px)
states    default, gaining, spending, can't afford (number shakes 2 px left-right twice, turns --g-danger for 1 s)
tokens    numbers tabular; icon image-rendering pixelated
a11y      text "1,284 Eldritch Doubloons", icon alt=""
```

### Bar (health, XP, boss health)
```
variants  hp (heart icon, --g-hp), xp (star icon, --g-xp), boss (skull-shell icon, --g-danger), stage (segmented, one block per boss stage)
sizes     16 px tall on phone and laptop; boss 20 px
states    default, filling (width animates 200 ms, steps(4)), full (xp: becomes level up), empty (hp 0: gentle penalty dialog), frozen (striped track)
tokens    stepped 2 px corners, 2 px dark edge #05070F, track --g-track, 2 px lighter top highlight on the fill, value "40/50" xs/700 to the right
a11y      role="progressbar" with aria-valuenow/min/max and aria-label "Health" / "XP to level 8"
```

## Room canvas
```
variants  full room (S01), decorate mode (S04), card (S08 weekly card, 2x), locked room (next room, silhouette + "Level 10")
states    morning (light), day, evening (after the cut-off: --room-night at 35%, lamp glows, creature sleepy), first day (empty: just the creature, a rug and a note "Your room. Earn doubloons to fill it"),
          reacting (creature swaps mood frame), boss active (banner pinned to the top of the room), projector-safe (unchanged)
tokens    128x148 art pixels, whole-number scale (phone 3x, laptop 5x), frame --room-frame, full bleed on phone
a11y      role="img" with a generated label listing what is in the room ("Bookshelf, jelly lamp, fish tank, desk, kelp; Cthulhu looks happy"); decorate mode is fully keyboard usable (below)
used on   S01, S04, S08
```

## Creature sprite
```
moods     idle, happy, proud, sad, sleepy (cthulhu_pixel.py), outfits drawn as an overlay layer on the same 32x32 grid
states    idle bob (1 art pixel up/down every 800 ms), reaction (frame swap), tapped (happy + a random kind line in the bubble), wearing outfit
tokens    same scale as the room; never mirrored by CSS (draw a facing-left frame if needed)
a11y      decorative inside the room label; a tap is a button "Say hello"
used on   S01, corner view, S08 card, S06 (cheering beside the boss)
```

## Reaction bubble / toast
```
variants  bubble (from the creature, in the room), toast (planner #toast, bottom centre, for everything outside the room)
states    coin (+12 with a mini coin and the reason: "Lesson built"), health (−5 with a heart), level up, auto-tick ("Ticked for you: order sheet sent"), undo (toast with an Undo button, 5 s)
tokens    bubble --g-bubble / --g-on-bubble, 1 px --room-frame edge, radius 8, tail pointing at the creature; type sm/700
a11y      toasts in aria-live="polite"; Undo is a real button and stays until focus leaves
used on   everywhere
```

## Task row (goal row)
```
variants  daily (tick box), habit good (+ button), habit bad (− button), habit both (+ and −), to-do (tick box, checklist count "2/4"), boss stage
parts     5 px value stripe on the left, tick box or +/− buttons, name, second line (track tag, difficulty, streak, "auto"), edit pencil
states    default, done (green tick, name stays readable, row dims 70%), not due today (greyed with "Not today"), auto-ticked (badge "auto" + tooltip saying which planner record ticked it),
          overdue to-do (stripe moves toward red as days pass), frozen (snowflake, streak kept), pressed (+/− scale 96%), unticked (undo toast), hidden (projector-safe: life/external rows removed)
tokens    bg --g-surface2, border --g-border, radius lg 8, 48 px tall phone / 40 px laptop, name base/700, second line xs --g-text-muted; + button --g-success edge, − button --g-danger edge, both 44x44 on phone
a11y      tick box is a checkbox with the goal name as its label; +/− buttons named "Did it: Netflix binge" style; streak read as text ("streak 6 days")
used on   S02, S06
```

## Empty / all-done panel
```
variants  none due ("Nothing due today. Cthulhu approves of rest."), all done (proud creature, total coins today), holiday freeze ("Holiday: streaks are frozen")
tokens    .card planner style, creature 2x
used on   S02, S03 (nothing to buy yet), S04 (nothing owned)
```

## Item card (shop and inventory)
```
parts     item art (32x32 at 3x = 96 px, on a stepped pixel tile), name, price with mini coin, theme tag, lock badge
states    default, hover/focus (tile lifts 2 px, pixel shadow), can't afford (price in --g-danger, Buy disabled with reason "Need 40 more"),
          locked by level ("Level 6"), locked by external work ("Do 3 external goals", progress 1/3), owned (tick + "Owned", Place button instead of Buy),
          placed (in inventory: "In the room"), new stock (gold "New" corner), seasonal (warning "Leaves at half term"), bought (confirm sheet then coin fly out)
tokens    bg --g-surface, border --g-border, radius card 10; tile --room-wall; price coin/700 --g-accent-text; 2 columns phone, 4 laptop
a11y      the card is one button "Bookshelf, 120 doubloons"; locked reason is in the label, not just a padlock
used on   S03, S04 (inventory drawer, compact 64 px tiles)
```

## Buy sheet (confirm)
```
states    confirm ("Buy Jelly lamp for 90?" Buy / Not now), can't afford (Buy disabled, shortfall shown), done (coins fly out, "Place it now?")
tokens    planner .box dialog on laptop, bottom sheet on phone (radius card top corners only)
a11y      focus trapped in the dialog, Escape closes, focus returns to the card
```

## Shop shelf tabs
```
variants  Room items, Outfits, Real-life rewards (S05), This half term (seasonal)
states    default, on (planner .hwseg button.on: gold fill, navy text), empty shelf
a11y      role="tablist" with arrow-key movement
used on   S03, S05
```

## Decorate mode (S04)
```
parts     room canvas with slot outlines, inventory drawer, Done button, Store button
states    browsing (dotted 1-art-pixel slot outlines), dragging (item follows, valid slot glows --g-success, invalid --g-danger), placed, swapped (old item goes back to the drawer),
          room full ("No free slots: store something first"), nothing owned ("Buy something in the shop first" + Shop button)
tokens    drawer --g-surface, slots on an 8-art-pixel grid; wall slots, floor-back slots, floor-front slots, a desk-top slot
a11y      keyboard: pick an item, arrow keys move it slot to slot, Enter places, Delete stores; screen reader reads "Bookshelf, back left floor slot"
used on   S04
```

## Reward card (real life)
```
parts     reward name ("Coffee out on Saturday"), the life goal it needs with a progress bar, spending-limit note, Claim button
states    locked (bar shows 2/5), unlocked (gold edge, Claim enabled), claimed (date + success tick), over limit ("This month's treat budget is used")
tokens    .card planner style, track-life tag; progress bar = stage bar
a11y      Claim is a button; progress read as "2 of 5 runs done"
used on   S05 (never shown in projector-safe)
```

## Boss panel (S06)
```
parts     boss art (64x64 pixel sea monster, own drawing), boss name ("The Marking Kraken"), boss health bar, stage checklist (task rows, boss variant), deadline chip, reward preview
states    not started (Start button), part done (hit flash on the art, bar drops), beaten (art turns to a shell, big coin reward, proud creature), deadline near (warning chip), deadline missed (gentle: "Missed the date. Keep going, the reward halves" no health loss unless Patryk chooses)
tokens    bg --g-surface, border --g-danger 2 px when active; boss name xl
a11y      each stage is a checkbox; boss health is a progressbar
used on   S06, banner version in S01 (one line + bar)
```

## Goal form (S07)
```
fields    name, kind (daily / habit / to-do: segmented), polarity (+ / − / both, habits only), schedule (weekday chips or "every N days"), difficulty (4-step segmented: tiny / easy / medium / big),
          track (work / external / life), auto-tick source (none / behaviour log / order sheet / lesson built / Friday emails), checklist (to-dos), reward if life goal
states    new, edit, invalid (name empty: inline message, field edge --g-danger), saving, saved (toast), delete (confirm "Delete this goal? Its streak goes too"), archive
tokens    planner inputs (select, input[type=text]: radius 6, --g-surface2, border-input edge), segmented = planner .hwseg
a11y      every field has a visible label; errors linked with aria-describedby; segmented controls are radio groups
used on   S07
```

## Sunday review (S08)
```
parts     three text boxes (Went well / Slipped / Next week's three priorities as three short inputs), Make my card button, weekly card preview
states    not done (Sunday dot on the Game tab), part filled (saved as you type), done (card shown), skipped (no penalty, ever)
tokens    planner textarea; card = room at 2x + coins, goals done, best streak, three priorities, on --g-surface with stepped frame
a11y      card has a text version beside it; Save image button gives a PNG
used on   S08 (hidden on projector)
```

## Settings (S09)
```
controls  evening cut-off (time), hide on projector (toggle), freeze days (date list + "use school holidays" toggle), currency name (text, default "Eldritch Doubloons"), sounds off/on, reduced motion follows the device
states    toggle on/off/disabled, saving, saved
tokens    toggle 44x24, track --g-border-input, on --g-accent with navy knob
a11y      toggles are role="switch" with aria-checked
used on   S09
```

## Buttons (game uses the planner's)
```
variants  primary (gold, navy text: Shop, Buy, Claim), secondary (planner default: Decorate, Edit), ghost (text only), danger (Delete: --g-danger text and edge), plus / minus (habit, square 44)
sizes     sm 28 px, md 36 px laptop / 44 px phone
states    default, hover (gold edge, planner), active (scale 97%), focus-visible, disabled (50% with a reason in the title and label), loading (label kept, small spinner)
tokens    radius md 6, font sm/700 for primary
```
