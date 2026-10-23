# The Sunken House: rooms, upgrades, outfits, pets, potions and quests (design v2)

Patryk 2026-10-23: more to change in each room; more rooms as big goals; Eldritch items as the big buy in every category; outfits; a 3-surface room instead of a flat one; pets, potions, and quests that are more interesting than Habitica's. Prices use the economy in architecture.md: a day earns about 80 Ð, small items cost about 2 days, big ones about a week.

## What we took from Focus Friend, and what it is missing
- **Taken (the room side, no timer):**
  - a creature living in a house that grows room by room (Focus Friend has a living room, kitchen, bedroom, garden and a street outside);
  - themed furniture sets;
  - outfits and skins;
  - decorations saved per room;
  - small items about 50 of its currency, a new room about 2,000-3,000 ([rooms guide](https://focusfriend.me/focus-friend-rooms)).
- **Missing there, so we add it:**
  - **Walls and floors you can change**, not just furniture.
  - **Upgrade lines:** a fish bowl grows into a wall aquarium, not just "another item".
  - **Pets** with their own home.
  - **More to do with the creature:** its users' main complaint is that decorating runs out fast and there are few ways to interact. Ours wanders to its furniture, sits, reads, eats, sleeps in bed at night, plays with the pet, and reacts when tapped.
  - **Quests and potions**, to keep it fresh after the first month.

## The view: a corner room (floor + 2 walls)
- **The angle:** each room is drawn from a corner at a 2:1 pixel angle (isometric). That shows three surfaces: the floor, a left wall and a right wall.
- **Why:** it gives depth, lets furniture stand against either wall, and makes carpets and wallpaper visible.
- **Pixel art rules:** whole-number scaling only, drawn on a 128×112 base (×3 on phone, ×5 on laptop).
- **The front:** it's open (a dollhouse cut-away), so the creature is never hidden.

## Every room has the same zones (what can change)
| # | zone | what goes there | how many |
|---|---|---|---|
| 1 | Floor | flooring: planks, tiles, carpet, sand, mossy stone, starfield | 1 |
| 2 | Rug | a rug on the floor | 1 |
| 3 | Left wall | wallpaper + a window slot + 2 wall-hanging slots | 1 + 1 + 2 |
| 4 | Right wall | wallpaper + 1 big wall slot (aquarium, bookcase wall, mural) + 1 hanging slot | 1 + 1 + 1 |
| 5 | Back corner | one tall piece: shelf, plant, grandfather clock, statue | 1 |
| 6 | Furniture spots | sofa, chair, desk, table, bed, stove... (depends on the room) | 4 |
| 7 | Pet home | cage / tank / perch for the pet (upgrade line) | 1 |
| 8 | Light | ceiling or standing light; changes the room's evening glow | 1 |
| 9 | Small spots | small props on furniture tops (mug, candle, book stack, shell) | 3 |

Items snap to their zone, so placing is a tap and not fiddly dragging on a phone. Every zone has a free basic option, so a new room never looks empty.

## Rooms (each new room is a BIG goal)
| room | unlock | price | what's special |
|---|---|---|---|
| Study (start) | free | 0 | desk, bookshelf, the first pet home |
| Living room | level 5 | 2,400 Ð (about a month) | sofa, fireplace, big wall slot for the aquarium |
| Kitchen | level 8 | 2,800 Ð | stove, table; the creature eats here (potions are brewed here) |
| Bedroom | level 11 | 3,200 Ð | bed (the creature sleeps here after his evening cut-off time) |
| Attic: the Observatory | level 15 + 10 outside-work ticks | 4,000 Ð | telescope, star charts, the Eldritch room |
| Garden (later) | level 20 | 4,500 Ð | kelp beds, a pond, seasonal plants |
| Street front (later) | after the garden | 5,000 Ð | the house front, door, sign, lamp post |

A room unlock also opens that room's own shop shelf. Rooms are cosmetic: they change how it looks, never the rules.

## Item tiers: every category has an Eldritch top tier
| tier | look | price | example (floors) |
|---|---|---|---|
| Basic | plain and cosy | free or 80-120 Ð | pine planks |
| Nice | detailed, themed | 150-350 Ð (2-4 days) | checker tiles, woven carpet |
| Fancy | big pieces, small animation | 500-600 Ð (about a week) | deep-blue carpet with a gold border |
| **Eldritch** | glowing, animated, strange and cute | 900-1,400 Ð (1.5-2.5 weeks), some also need outside work | **starfield floor** (slow twinkling), **tentacle rug** that waves, **R'lyeh stone** with green glow |

Eldritch examples per zone:
- **Wallpaper:** sunken-ship timbers; runes that glow at night.
- **Window:** a porthole onto the deep, where a giant eye sometimes blinks past.
- **Big wall:** an abyssal aquarium with an anglerfish light.
- **Corner:** a tentacle grandfather clock that ticks the wrong way.
- **Light:** a jellyfish chandelier.
- **Furniture:**
  - an armchair of the deep (with barnacles);
  - a librarian's desk with a book that writes itself.

## Upgrade lines (one slot, grows over time)
- **Aquarium:**
  - jam jar with a guppy (free);
  - bowl (150);
  - tank on a stand (350);
  - wall aquarium (600);
  - abyssal aquarium (1,200, Eldritch).
  - Each step keeps its fish and adds more.
- **Pet home:**
  - cardboard box;
  - wire cage (200);
  - terrarium (450);
  - tide pool (700);
  - Eldritch: the pocket dimension (1,300), a small swirling portal the pet hops in and out of.
- **Bookshelf:**
  - plank shelf;
  - bookcase;
  - library wall;
  - the Necronomi-cosy (Eldritch; books float).
- **Light:**
  - candle;
  - lamp;
  - jellyfish lamp;
  - jellyfish chandelier (Eldritch).

## Pets (live in the pet home)
- **The pets:**
  - Each comes from a quest or a level, never just bought, so a pet means something.
  - Snail (start).
  - Hermit crab.
  - Baby anglerfish (needs the tank line).
  - Mi-go moth.
  - Tiny shoggoth blob (Eldritch).
  - Star-spawn hatchling (Eldritch).
- **What they do:**
  - a pet wanders and sleeps;
  - it plays with the creature when he ticks a life goal;
  - it has a pet bowl to fill (a free daily tap).

## Outfits (dress-up)
| slot | basic | nice | fancy | Eldritch |
|---|---|---|---|---|
| Hat | the sprout (his) | beret, bobble hat | wizard hat, little crown | crown of tiny tentacles (wiggles), starlight halo |
| Top | none | knitted jumper | teacher's cardigan with elbow patches, lab coat | robe of the deep (sparkles), cloak of stars |
| Face | none | round glasses | monocle | third eye (blinks) |
| Held | none | mug of tea | book, pointer stick | glowing lantern of the deep |
| Skins | Kelp Mint | Lavender, Coral, Gold, Sky, Peach (the round-2 looks) | seasonal: pumpkin, frost | Midnight glow |

Prices follow the tiers: nice 150-300, fancy 500-600, Eldritch 900-1,400.

## Potions (brewed in the kitchen, bought with doubloons)
Potions are limited, so they help but never replace doing the work: at most one active at a time, and a weekly stock of 3.

| potion | effect | price |
|---|---|---|
| Kelp Tonic | +20 health | 120 Ð |
| Streak Shield | protects every streak for one missed day (not frozen days, which are already free) | 250 Ð |
| Glow Draught | the creature glows for a day (just for fun) | 60 Ð |
| Tidal Luck | the next 3 life goals drop a quest item for sure | 200 Ð |
| Elder Brew (Eldritch) | ×1.25 doubloons for one day, at most once a week | 500 Ð |

## Quests: better than Habitica's
- **Habitica's problems:**
  - quests feel like an extra chore stuck on top of the tasks;
  - party damage punishes you for other people;
  - collection quests needed so many items they were made easier;
  - most quests cost gems.
- **Ours:**
  - solo;
  - free;
  - short (one week at most);
  - each has a little story;
  - each ends with something you can SEE in the house.
- **Quest kinds:**
  1. **Boss quests = his real big jobs.**
     - Examples: "The Marking Kraken" (a class's tests in 4 stages) and "The Report Wraith" (data on the spreadsheet, then on Arbor).
     - He makes them from a to-do.
     - The boss art gets weaker as stages tick.
     - The reward is a trophy item for the house.
  2. **Expeditions = life goals.**
     - Example: read on 3 evenings this week, and the creature goes on an expedition to the sunken library. It comes back with a book item and a postcard of where it went.
     - There's no fail state: if the week ends early, it comes home with a smaller find.
  3. **Collections = treasure from normal ticks.**
     - Any tick has a small chance (about 1 in 6) to drop a relic shard. Five shards restore an artefact, like a ship's wheel for the wall.
     - Each collection needs at most 5 pieces.
  4. **Story chapters: "The House Rises".** Each room unlock is a chapter. The creature is slowly raising its sunken house back up to the surface, a cute take on Cthulhu rising from R'lyeh. The chapter reward is the next room's shop shelf and a short story card.
  5. **Seasonal events (each half term):** a 2-week event with its own items, for example "The Lantern Tide" in autumn and "Frost on the Kelp" at Christmas.
- **How quests are chosen:**
  - He picks from 3 offered quests each Monday (one work, one life, one collection), so there's always choice and never a chore forced on him.
  - Quest text is short and plain; no long lore to read.

## Interactions (the "more ways to be with it" Focus Friend lacks)
- Tap the creature to make it wave. A long press pets it.
- It moves between furniture through the day: reads at the shelf, sits in the armchair, eats in the kitchen at lunch, sleeps in bed after the cut-off.
- It reacts:
  - happy after a tick;
  - proud after a boss stage;
  - sad after a bad habit;
  - it shows off each new item for a few seconds after buying.
- It wears the outfit he picked and holds its held item.

## Build order change
- This replaces the room part of slices 1 and 5 in architecture.md:
  - slice 1 builds the corner room with free basic items in every zone;
  - slice 5 adds the shop, zones and the aquarium and pet upgrade lines;
  - pets, potions, quests and more rooms become new slices 9-12, after the Sunday review.
- The art is the biggest job: about 9 zones × 4 tiers × 7 rooms, plus pets and outfits. It should be built a room at a time, starting with the Study.
