# Design tokens: Cthulhu habit game

Two layers, on purpose:

1. **The chrome** (bars, buttons, task rows, forms, the shop's cards) is the planner. It borrows the planner's own colour variables from `planner/Planner.html` (`--bg --panel --panel2 --ink --muted --line --gold`, dark by default, `body.light` for light), Century Gothic, 6 px buttons, 8 to 10 px cards, gold primary buttons with navy text. On the phone page (`planner/Phone.html`) the same roles map to its own fonts (Atkinson Hyperlegible Next).
2. **The room** is its own cosy pixel world: a dollhouse cutaway under the sea, the same in both themes because it is a picture.

The game adds only the roles the planner does not have: coin, health, XP, task value, track colours, the speech bubble and the room palette.

Files: `tokens.json` (values, checked), `tokens.css` (custom properties scoped to `.game`). No Tailwind: the planner is plain Apps Script HTML, so components use the `--g-*` variables directly, never raw hex.

## Colour roles

Contrast: `python contrast.py tokens.json` checks 56 pairs, **0 failing AA**. Text needs 4.5:1; bars, borders, focus rings and colour stripes need 3:1 ("ui").

| role | dark (default) | light | used for | lowest check |
|---|---|---|---|---|
| bg | #0E1424 | #EDF2FA | page | |
| surface | #161E33 | #FFFFFF | HUD panel, cards | |
| surface2 | #1C2540 | #F7F9FD | task rows, inputs | |
| bar | #0A0F1E | #0D1B5E | planner top bar | |
| border | #2A3555 | #D5DDEC | card edges (decorative only) | |
| border-input | #6B7799 | #7A8499 | checkbox, input, toggle edges | 3.40 / 3.76 ui |
| text | #E6EAF5 | #1A1A2E | body text | 12.6 / 15.2 |
| text-muted | #98A2BC | #5E5E6E | second lines, hints | 5.93 / 5.66 |
| accent | #FABB2E | #FABB2E | primary button, level pill, active tab edge | |
| on-accent | #0D1B5E | #0D1B5E | text on gold | 9.14 |
| accent-text | #FABB2E | #8A5A00 | gold-coloured headings and coin numbers | 9.63 / 5.27 |
| focus | #FABB2E | #0D47A1 | 2 px focus ring | 9.63 / 7.68 ui |
| danger | #EF5350 | #B71C1C | delete, health lost | 4.75 / 6.57 |
| success | #66BB6A | #1B5E20 | ticked, claimed | 7.01 / 7.87 |
| warning | #FFA726 | #B04500 | "leaving soon", deadline near (planner's #E65100 failed as text, darkened) | 8.53 / 5.68 |
| coin | #FABB2E | #FABB2E | Eldritch Doubloon icon and coin fly | 9.63 ui |
| hp | #EF5350 | #C62828 | health bar fill | 5.48 / 4.12 ui on track |
| xp | #B49CFF | #6A45C2 | XP bar fill (wing purple, lifted) | 8.31 / 4.74 ui |
| track | #0A0F1E | #D5DDEC | empty part of a bar | |
| value-bad / neutral / good | #EF5350 / #FABB2E / #64B5F6 | #C62828 / #B07800 / #1565C0 | 5 px left stripe on a task row (red = keeps being missed, gold = new, blue = going well) | 4.34 / 3.60 ui |
| track-work / external / life | #64B5F6 / #FFA726 / #F5B8D8 | #1565C0 / #C25400 / #B0407F | small track tag on goals and rewards | 4.37 ui |
| bubble / on-bubble | #FFF8E7 / #2B1F2E | same | creature's reaction bubble | 14.82 |

Colour is never the only signal: value stripes also get a word in the row's second line ("slipping", "on a roll"), and the track tag always has its word.

### Room world (both themes)
| role | hex | role | hex |
|---|---|---|---|
| frame (outline of the house) | #2B1F2E | roof / roof-lo | #7A5CA8 / #4E3A75 |
| wall / wall-hi / wall-lo | #2E4A5C / #3D5F73 / #22384A | sea / sea-hi (portholes) | #4FA3B8 / #96D6E2 |
| floor / floor-hi / floor-lo | #8A5A3C / #A8714B / #6B4430 | trim (skirting) | #4A3226 |
| night-tint (evening overlay, 35%) | #1B2140 | hud-plate / hud-text | #2B1F2E / #FFF8E7 (14.8) |

Item art palette (in `items_pixel.py PAL`): item outline #2B1F2E, wood #C98B55 / #A0663D / #74452A, book spines red #D9534F blue #4F86C6 yellow #F2C14E green #5FBF8F purple #7A5CA8, kelp #3FA66B / #2C7A4E / #7FD39A, terracotta #C8643B, water #5FB8D0, jelly pink #F5B8D8, brass #C9A34A, coin gold #FABB2E / #FFE28A / #D9930F / #8A5A00 with a #4E3A75 pupil. The creature keeps its own palette in `cthulhu_pixel.py` (teal #5FBF8F, outline #1E3A34, wings #7A5CA8). New art must pick from these lists; a new colour is added here first.

## Type scale (Century Gothic, planner font; phone page uses Atkinson Hyperlegible Next)
| token | size / line | weight | use |
|---|---|---|---|
| xs | 11 / 14 | 400 | bar numbers, tags, "auto-ticked" |
| sm | 13 / 18 | 400 | planner default: buttons, second lines |
| base | 14 / 20 | 400 (700 for names) | task names, card names |
| md | 16 / 22 | 700 | dialog titles, big buttons |
| lg | 20 / 26 | 700 | section headings ("Today's goals"), gold, as the planner's `.tab h2` |
| coin | 22 / 26 | 700, tabular numbers | coin count in the HUD |
| xl | 28 / 32 | 700 | boss name, weekly card title |

No pixel font: text stays readable; only the art is pixel.

## Spacing
Base 4, with a 2 for pixel nudges: 0, 2, 4, 8, 12, 16, 24, 32, 48. Phone side gutter 16 px for all text and cards. Touch targets at least 44 px tall on the phone (task rows 48, buttons 44).

## Radius
sm 4 (tags), md 6 (buttons, inputs: planner), lg 8 (task rows), card 10 (HUD, cards: planner), pill 12 (level pill, badges). Pixel parts (bars, item frames, the room) are square with **stepped corners** made from 2 px blocks, never `border-radius`.

## Shadows
none on cards (the planner uses borders, not shadows); pop `0 10px 30px rgba(0,0,0,.35)` for menus and dialogs (the planner's menu); pixel `0 3px 0 #05070F` hard drop under pixel buttons and the coin when it flies.

## Motion
fast 120 ms (hover, press), base 200 ms (drawers, tabs), coin-fly 600 ms (coins arc from the ticked row to the counter), creature reactions are frame swaps on `steps()`, never smooth tweening of pixel art. `prefers-reduced-motion`: no coin fly, the counter just updates.

## Pixel scale rules
- Art is drawn at 1x: creature 32x32, items 32x32 (wide items 64x32), coin 16x16, the room 128x148 logical pixels.
- **Whole-number scaling only** (1x to 5x), with `image-rendering: pixelated` on every `img`/`canvas` of art and `Image.NEAREST` in Python. Never 2.5x, never CSS `width:100%` on art.
- Room scale = the largest whole number where 128 x scale fits the column, capped at 5. Phone 390 px: 3x (384 px, full bleed, 3 px either side, the one place the 16 px gutter is broken). Laptop tab (980 px column): 5x (640 px), centred. Corner view: 1x of the creature only (32 px) or 2x (64 px).
- Everything inside the room (items, creature) uses the room's scale, so one art pixel is always the same size on screen. HUD icons (coin, heart, star) are 2x (32 px coin, 14 px heart) on all screens.
- Items snap to whole art pixels; slots are on an 8-pixel art grid.
- Outline rule: one dark outline pixel round the outside of every sprite, light from the top left, shade on the bottom right, no anti-aliasing, no gradients.

## Projector-safe state
Settings "Hide on projector" (and automatically when the planner's projector or class view is on): life and external goals, real-life rewards, health and the Sunday review are hidden; the room, work goals, coins and level can stay. Hidden things are removed from the page, not just blurred. A small "eye-off" chip in the HUD shows it is on.

## Layout
Phone: one column. Planner bar 48, HUD card 82, room 444 (3x), buttons 44, then goals. Laptop (Game in the planner sidebar, 980 px tab): room on the left at 5x, goals on the right in a 320 px column; under 900 px it falls back to the phone column, like the planner's sidebar.
