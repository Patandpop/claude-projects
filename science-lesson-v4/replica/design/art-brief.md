# Art brief: first 30 room items and 6 outfits

All original pixel art in the house style (`tokens.md` pixel rules): drawn at 1x on 32x32 (wide pieces 64x32, wall pieces 32x32), one dark outline (#2B1F2E), light from the top left, colours only from the item palette. Made with Pillow in `replica/art/items_pixel.py`, one function per item. Names and wording are ours.

**Price bands** (Eldritch Doubloons; to be tuned with Patryk once real earning rates are known):
A = 20 to 50 (a day or two of ticks) · B = 60 to 120 (about a week) · C = 150 to 300 (a few weeks) · D = 400+ (a half term, big goals)

**Lock rules:** none · Level N · External N (needs N external-work goals done; the "earn it outside school" track) · Season (on sale this half term only, then back next year) · Boss (reward for beating a boss, never sold)

**Slots:** floor-back, floor-front, wall, desk-top (on a desk or shelf), rug (floor, under everything), ceiling, window (replaces the porthole)

Drawn already (in `items_sheet.png`): ★

## Room items

| # | name | slot | size | band | lock | theme set |
|---|---|---|---|---|---|---|
| 1 | Snug kelp rug (oval, spiral) ★ | rug | 32x32 | A | none | Cosy Sea |
| 2 | Potted kelp ★ | floor-front | 32 | A | none | Cosy Sea |
| 3 | Jelly lamp ★ | floor-back | 32 | B | none | Cosy Sea |
| 4 | Fish tank on a stand ★ | floor-back | 32 | B | Level 3 | Cosy Sea |
| 5 | Barnacle armchair | floor-front | 32 | B | none | Cosy Sea |
| 6 | Clam shell bed | floor-back | 64x32 | C | Level 5 | Cosy Sea |
| 7 | Bubble string lights | ceiling | 64x32 | A | none | Cosy Sea |
| 8 | Starfish wall clock | wall | 32 | A | none | Cosy Sea |
| 9 | Coral bean bag | floor-front | 32 | B | External 2 | Cosy Sea |
| 10 | Round porthole with a whale going past | window | 32 | C | External 5 | Cosy Sea |
| 11 | Little bookshelf ★ | floor-back | 32 | A | none | Sunken Library |
| 12 | Tall barnacled bookcase | floor-back | 32x48* | C | Level 6 | Sunken Library |
| 13 | Stack of soggy tomes | floor-front | 32 | A | none | Sunken Library |
| 14 | Reading candle in a jar (green flame) | desk-top | 32 | A | none | Sunken Library |
| 15 | Globe of the sea floor | desk-top | 32 | B | Level 4 | Sunken Library |
| 16 | Library ladder | floor-back | 32 | B | none | Sunken Library |
| 17 | Framed map of the deep | wall | 32 | B | none | Sunken Library |
| 18 | Ink octopus quill stand | desk-top | 32 | A | none | Sunken Library |
| 19 | Ancient reading lectern with an open book | floor-front | 32 | D | Boss | Sunken Library |
| 20 | Teacher's desk with marking pile ★ | floor-front | 32 | B | none | Teacher's Desk |
| 21 | Swivel chair | floor-front | 32 | A | none | Teacher's Desk |
| 22 | Mini whiteboard with an equation | wall | 32 | A | none | Teacher's Desk |
| 23 | Bunsen burner lamp (blue flame) | desk-top | 32 | B | Level 2 | Teacher's Desk |
| 24 | Periodic table poster (blank squares, no real data) | wall | 32 | A | none | Teacher's Desk |
| 25 | Beaker plant (cress in a beaker) | desk-top | 32 | A | none | Teacher's Desk |
| 26 | Model planets mobile | ceiling | 32 | C | External 3 | Teacher's Desk |
| 27 | "Best Teacher" mug on a coaster | desk-top | 32 | B | External 8 | Teacher's Desk |
| 28 | Pumpkin with a tentacle carving | floor-front | 32 | B | Season (autumn half term) | Seasonal |
| 29 | Snowy sea-glass tree | floor-back | 32 | C | Season (Christmas term) | Seasonal |
| 30 | Wallpaper swap: deep-night stars (whole back wall) | wall (room) | 128x80 | D | Level 10 | Cosy Sea |

\* 32x48 is the one tall exception; it still scales by whole numbers.

## Outfits (overlay on the 32x32 creature, every mood)

| # | name | covers | band | lock | theme set |
|---|---|---|---|---|---|
| 1 | Knitted bobble hat | head | A | none | Cosy Sea |
| 2 | Round reading glasses | face (between the eyes and brow; must not hide the eyes) | A | none | Sunken Library |
| 3 | Lab coat with a pocket of pens | body (wings poke through) | B | Level 4 | Teacher's Desk |
| 4 | Lanyard and staff badge | body | A | none | Teacher's Desk |
| 5 | Sailor's scarf | neck | B | External 3 | Cosy Sea |
| 6 | Tiny wizard hat with stars | head | C | Boss | Sunken Library |

Outfit art rule: draw on a separate layer that keeps the creature's outline, check all five moods (happy and proud close the eyes, sad adds a tear on the left cheek), and never cover the blush pixels.

## Theme mix check
Cosy Sea 11 (incl. the wallpaper), Sunken Library 9, Teacher's Desk 8, Seasonal 2. Free-to-start (band A, no lock): 13. Locked by external work: 6 items, 1 outfit. Boss-only: 1 item, 1 outfit.
