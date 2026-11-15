# Epoch — Dawn of the First Tribe

**Status:** Playable Stone Age foundation / pre-alpha.

**Phase 7A.1:** [Friendships and partnerships](./RELATIONSHIPS.md) now grow through real nearby conversations and shared Hut years. View reciprocal bonds in the Council Lodge and resident profiles. Family formation and births are future work.

**Phase 7A.2A:** [Wilderness families](./TRIBE_FAMILIES.md) now generate seeded parents, partners and young children in many newly discovered tribes. Their original kinship survives peaceful recruitment and appears in villager profiles; existing discovered tribes keep their previous rosters. Family co-housing and births are later milestones.

**Static site path:** `/epoch/`

**Design:** [GAME_DESIGN.md](./GAME_DESIGN.md)  
**Civilization roadmap:** [Tribes, Recruitment, Fear, Diplomacy & Generations — Issue #27](https://github.com/spencerveen/spencerveen.github.io/issues/27)

Epoch is a third-person browser RPG about gathering, founding a village, discovering technologies and traditions, and passing control to descendants. Village activities open from buildings in the world. **Inventory** and **Skills** are the only global gameplay tabs.

## Play locally

Serve the site repository root over HTTP; opening `index.html` directly with `file://` is not supported by the JavaScript module setup.

```bash
python -m http.server 8765 --bind 127.0.0.1
```

Visit `http://127.0.0.1:8765/epoch/`. No backend is required. The current Babylon.js engine and loader use a public CDN, so an internet connection is needed.

## Find activities in the world

| Interface or place | What it opens |
|---|---|
| Inventory button / I | Ten-slot backpack with brief item hover hints and Eat/Discard context menus |
| Skills button / K | Six personal skill tracks and XP progress |
| Objective → Establish camp | Free first-stockpile placement |
| Village Stockpile | Village **Storage / Build / Craft / Buildings / People** sections |
| Toolmaker's Shelter | Technology research |
| Council Lodge | Culture and traditions |
| Hut | Shows actual residents, available beds and villager profiles |
| Cooking Hearth | Cook roasted meat and berry-roasted meat from hunted supplies |
| Wilderness tribal camps and leaders | Meet leaders, help with supply quests to earn Trust, and invite tribes to settle peacefully |
| Village residents (click people or open Stockpile → People) | Inspect a villager's personal chronicle, former clanmates, housemates and housing assignment |
| Survival HUD | Health, Stamina, Hunger and temporary food-bonus timer; bars appear by the founder's name |
| Game menu | Save game, Help, and Save & return to title |

New games start with **one resident: the founder**. Small independent tribes appear in the wilderness with **2–5 seeded, named people**, tribal leaders and simple camps. Visit the camp or click its people and huts to meet the leader. Their names and locations reproduce from the saved world seed. Tribes remember discovery, Trust, fulfilled requests and relocation through saves and terrain streaming. **Peaceful recruitment is now playable:** bring a tribal leader three requested sets of carried supplies (berries, wood and stone), earn 35 Trust per successful request, then invite the whole tribe when Trust reaches 100 and your village has enough open housing for everyone. The tribe dismantles its original camp, which remains an abandoned clearing and never respawns as an active settlement. Recruits become saved named residents visible in your village and the stockpile's People roster. Razing, combat, individual negotiations, happiness, traits and villager jobs are later milestones.

**Phase 3: people and housing.** The stockpile now has a **People** section with the founder's name and age, each named villager, a population summary, and actual occupancy for the communal camp and every Hut. Click **View profile**, or click a villager/nameplate in the 3D world, to inspect their story, origin tribe, arrival year, original tribal leadership, former clanmates and current housemates. The founder uses one of the five communal spaces; up to four other villagers can live in the camp, and each Hut provides three more beds. You can **assign a resident to any home with an available bed**; assignments instantly reposition that villager in the village, are recorded in their personal chronicle, and survive reloads and succession. Migrated saves receive compatible names and housing records. Housing moves are instantaneous for now: walking home, relationships beyond shared clan/household history, jobs and mood simulation are future development stages. Other home-village NPCs appear only for residents actually recorded in the save; older villages retain their saved residents. Recruitment, births, and villager jobs are planned for later. A Hut adds housing capacity, not residents.

**Phase 4 survival foundations.** Every controlled character has 100 Health, up to 100 base Stamina and 100 Hunger. Hunger decreases only during active unpaused gameplay and never directly hurts or kills the player. When hunger reaches zero, available stamina is capped at 45 and stamina regeneration slows; food restores your ability to act. Harvesting consumes stamina (tree 6, stone 5, berries 2, clearing a bush 8); actions do not spend stamina or deplete a resource when the pack is full or stamina is insufficient. Holding Shift while moving spends 11 stamina per second, and automatically slows to walking when exhausted. Stamina recovers at **1 point per second** when not sprinting; hunger lowers this rate further. **Eat one carried berry** from Inventory to restore 24 Hunger and 12 Stamina and gain **+20 maximum Stamina for two active minutes**. The food timer refreshes rather than stacking; its expiration returns stamina to the normal limit. These values persist in each save and are not simulated while offline.

**Death and continuation.** You can designate any named village resident as your successor in Stockpile → People → View profile. When a character dies from damage, control moves to that named villager if available; otherwise, a random living resident takes over. The successor leaves the regular villager roster (so population is not duplicated), inherits the saved village, and begins their rule in the settlement. There is no automatic 24-year skip on death, and prior leaders are recorded in the lineage. **If nobody survives besides the player, death permanently ends the run**; the slot retains the final history but cannot be resumed. Old saves are migrated with full health, stamina and hunger, preserving existing progress. Weapons, hostile NPC combat and causes of injury are not playable yet; the damage/death logic is ready for them. There is no manual death or succession button in village housing.

**Aging and natural death.** Each **90 seconds of active gameplay** advances the in-game calendar by one year. All named village residents now age on this same calendar, and villagers who reach age **100** die of old age, leave the living roster, and free their housing. The last 100 natural deaths are retained in a saved memorial archive, visible under **Village → People → Remembered villagers**. If a named successor dies, the designation clears. Your controlled character also dies automatically at age **100**, handing control to a living named successor or randomly to another living villager. If nobody survives, the save is ended as normal. Births, villager hunger and aging of un-recruited wilderness tribes are not implemented yet.

**Minimal survival HUD.** Once the village stockpile is founded, the chapter-prompt card disappears; the upper-left panel contains only Health, Stamina and Hunger bars. The player name and age are shown alongside other villagers in **Village → People**. Timed berry-buff details remain available on the Stamina value's hover tooltip, with no extra permanent text beneath Hunger.

The title screen offers New Game, Continue, and three independent local save slots. Founder appearance is chosen when starting a new game and cannot be edited afterward. Descendants inherit related appearance traits. There is no global Village, Technology, Culture, Dynasty, or Character tab.

## Phase 5B — Wild animals and hunting

The wilderness now spawns seeded **deer, wild boars and rabbits**, each with distinct size, health, movement speed, and behavior. Deer and rabbits wander and flee from approaching hunters; boars respond aggressively when provoked and can damage your hero. Wildlife avoids swimming into rivers and crossing blocked terrain, and stays near its original habitat. The original procedural deer are retained with stable identifiers; extra rabbits and boars vary by chunk and world seed.

Craft and **equip a Wooden Club, Stone Axe or Stone Spear**, approach wildlife with WASD, then press **H** or click a nearby animal to attack. Weapons use their real catalog damage, reach and stamina costs, and lose one durability per successful blow. Hunting has a short cooldown and requires sufficient stamina. A defeated animal leaves a persistent carcass; stand beside it and press **F** (or click it) to collect meat, fur, hide and bone. Loot goes to your backpack only if all drops fit, avoiding accidental losses when full; a harvested carcass stays gone when terrain chunks reload or the save reopens. Animal injuries are recorded, too, so a damaged animal doesn't mysteriously heal when a chunk unloads.

**Raw animal meat cannot be eaten.** Build a Cooking Hearth to roast it into meals for Hunger, Stamina and modest Health recovery.

## Phase 5D — Spear Fishing

Shallow rivers, lakes and eastern ocean coastline now contain deterministic small low-poly fish. The fish appear in the detailed 3×3 chunk window, move gently at the water surface and unload as you travel. Their water locations are generated from the same seeded hydrology as terrain, never on dry land or far out at sea. Successful catches remain depleted after chunk streaming or reloading because only caught fish IDs are saved.

Craft and equip a **Stone Spear**, approach a fish in the shallows with WASD, then press **H** or click the fish within 3 meters. Each catch grants 1 raw Fish Meat and Fishing skill XP, costing **8 Stamina** and **1 spear durability**. A full backpack, insufficient stamina or missing spear prevents a catch without losing anything. H still attacks nearby deer, boar and rabbits, choosing the nearest available hunting/fishing target. Fishing from boats, rod fishing and nets are planned for later updates.

Roast your catch at your built **Cooking Hearth**: **2 Fish Meat + 1 Wood → 2 Roasted Fish**. Each portion restores 31 Hunger, 18 Stamina and 4 Health. Raw fish is not edible. **E** now prioritizes Berry-Roasted Meat, Roasted Meat, Roasted Fish, then Wild Berries.

## Phase 5C — Cooking and Food

The constructed **Cooking Hearth** opens an actual cooking station. Click the building and stand within 6m to prepare one of three recipes: **Roasted Meat** (2 Animal Meat + 1 Wood → 2 Roasted Meat) or **Berry-Roasted Meat** (1 Animal Meat + 2 Wild Berries + 1 Wood → 1 Berry-Roasted Meat). Wood is consumed as fuel. Ingredients are drawn from Inventory first, then village stockpile; finished meals go into the backpack. Cooking is instantaneous and earns Cooking XP. Failed attempts with insufficient supplies, no hearth or no output space never consume materials.

Roasted Meat restores **38 Hunger, 16 Stamina and 6 Health**. Berry-Roasted Meat restores **52 Hunger, 20 Stamina and 10 Health**, plus a timed +20 maximum-Stamina boost. Both can be eaten from Inventory. **E** now consumes the first available food in order: Berry-Roasted Meat, Roasted Meat, Roasted Fish, Wild Berries. Raw meat and raw fish are not edible.

## Phase 5A — Primitive crafting and durability

**Village Stockpile → Craft** now supports three complete recipes. A **Wooden Club** costs 3 stored Wood and is available immediately. The **Stone Axe** costs 2 stored Wood and 3 stored Stone, requiring Stone Toolmaking. The **Stone Spear** costs 2 stored Wood, 1 stored Flint and 1 stored Vines, also requiring Stone Toolmaking. Deposit gathered supplies at the village stockpile before crafting. A crafted tool equips automatically if Main Hand is empty; otherwise it enters a free backpack slot. Costs are not charged when crafting is blocked by research, distance, missing supplies, a full backpack or already owning that weapon.

Crafted tools track **durability**: Club 36, Axe 45, Spear 48. Remaining condition is displayed in Inventory and persists through backpack swaps, equipped changes and reloads. A Stone Axe yields 3 Wood per tree gathering (instead of 2) and loses 1 durability on each successful chop. At zero durability it breaks and must be crafted again. Clubs and spears are equipable weapons with existing damage/reach values, but hunting, weapon swings and combat are **not yet active**; these tools don't wear until those actions exist. Crafting uses the existing Village Craft menu rather than adding a duplicate global tab.

## First steps

1. Choose a slot and create your founder. Use **Establish camp** on the current objective to place a free stockpile, or choose the nearby-clearing option.
2. Gather wood and vines from trees, stone from deposits, and berries plus vines from bushes. Move within 5 meters of the stockpile with WASD, then click it to open **Storage** and deposit or withdraw supplies.
3. Open the stockpile's **Build** section. Construct a **Toolmaker's Shelter** with **12 stored wood and 8 stored stone**. It requires no prior research, so Technology is reachable from a fresh game.
4. Click the completed shelter to research **Control of Fire** and **Stone Toolmaking**. Research uses Inventory materials first and automatically draws any shortage from the village stockpile, plus Knowledge; no manual withdrawal is needed. Village founding and first-time construction now award Knowledge, and a Toolmaker's Shelter produces 1 Knowledge per active minute. Craft a **Wooden Club** from 3 stored Wood, or learn Stone Toolmaking to craft Stone Axes and Stone Spears from stored supplies.
5. Build a **Hut** for 10 stored wood and 6 stored stone. It adds 3 housing capacity; click it to see its occupants. Build a **Council Lodge** for 14 stored wood and 8 stored stone, then click it to establish traditions. The lodge requires no prior Culture unlock.
6. After researching Control of Fire, build a **Cooking Hearth** for 6 stored wood and 5 stored stone. Click it to cook hunted meat and berry-roasted meals. Leadership changes when your character dies. Name a successor from a villager's profile in **Village → People**.

## Quick eat shortcut

Press **E** during gameplay to eat one cooked meal or Wild Berry straight from the backpack. Meals are prioritized over berries, with their own Hunger, Stamina and Health benefits. The shortcut does not eat from village storage, does not work if no berries are carried, and ignores held-key repeat, text inputs, the title screen, and modal dialogs. **Nearby gathering and interaction are now F; Shift + F cuts a bush for vines.** Mouse interaction remains unchanged.

## Controls and placement

| Input | Action |
|---|---|
| WASD / Shift + WASD | Walk / sprint relative to the camera (sprinting uses Stamina) |
| E (quick eat) | Eat one cooked meal from your backpack, falling back to berries; raw meat is not edible |
| Click an edible stack → Eat | Eat one berry or cooked meal for its listed benefits |
| Left-click ground | No movement; clicking terrain pins placement only when building |
| Left-click resource / F nearby | Gather only when in range; walk with WASD first |
| Shift-click berry bush / Shift + F nearby | Permanently clear a bush for vines |
| Click a tribal leader, sign or camp shelter | Interact after approaching manually with WASD; trust quests remain available |
| Click Cooking Hearth | Cook roasted meat and berry-roasted meat from carried and stored ingredients |
| H beside wildlife / click animal | Attack with an equipped primitive weapon; costs Stamina and weapon durability |
| H near fish / click fish | Spear fish in shallow water with a Stone Spear; costs Stamina and durability |
| F near a carcass / click carcass | Harvest meat, fur, hides and bones into backpack |
| F near a tribal leader | Open a nearby tribe encounter (if no gatherable resource takes priority) |
| Click a named villager or overhead nameplate | Open their saved personal profile |
| F beside a villager | Inspect the closest villager if no gatherable resource takes priority |
| Hold arrow keys (outside build mode) | Smoothly rotate left/right or tilt up/down, easing to a stop |
| Right mouse drag / mouse wheel | Optional camera rotation / zoom |
| I / K | Toggle Inventory / Skills |
| Escape / game-menu button | Close the active panel or dialog, or open the game menu |
| Ground click during placement | Pin the stockpile or building preview |
| Arrow keys / on-screen arrows | Move the preview one 2-meter grid cell and pin it |
| R during building placement | Rotate the building preview 90 degrees |
| Confirm placement / Enter | Confirm a valid placement |

Placement starts from a movable preview. A click or arrow adjustment pins its location; rotating the camera does not move it. Village buildings use stored materials and must fit inside the stockpile's 24-meter territory, with clear, sufficiently level ground. Completed buildings retain their coordinates and rotation. Moving, rotating, or demolishing already-built structures is not implemented.

## Phase 4B.1 — Stone Age catalog and equipment

The item catalog now defines **nine foundational resources** (Wood, Stone, Vines, Berries, Animal Meat, Fur, Flint, Fish Meat and Feathers), plus Raw Hide, Leather and Bone for future processing. It also includes **Wooden Club, Stone Axe, Stone Spear, Sling, Bow, Stone-Tipped Arrows, Fur Armor and Leather Armor**. Their categories, stack sizes, short tooltips, planned crafting recipes and preliminary combat/protection statistics are centralized as data rather than hard-coded inventory summaries.

**Availability:** Wood, Stone, Vines and Berries can be gathered in forests, Flint from beaches, and Animal Meat, Fur, Raw Hide and Bone from hunted deer, rabbits and boars. Clubs, axes and spears are crafted at the village stockpile. Bow, sling, armor crafting, fishing and defensive armor effects remain future milestones.

The **Inventory** panel still has ten carried slots. New gear such as clubs, axes, spears and armor occupies one slot per item when carried; stackable materials and arrows use stacks of twelve. Under the backpack is a compact **Equipment** section with **Main Hand, Body Armor and Ammunition** slots. Click carried gear to **Equip**; click a slot's **Unequip** button to return it to the backpack. Swapping a weapon places the previous one directly into the vacated backpack slot; unequipping requires space. Equipped items do not count toward backpack capacity. Existing saves with a crafted Stone Axe automatically migrate it into Main Hand, and the woodcutting bonus applies **only while the axe is equipped**. Material storage at the village stockpile accepts new materials and arrows, not equipped weapons or armor. Inventory, equipment and old saves retain their item quantities and identities.

## Temporary developer panel (press L)

During a running game, press **L** to open or close the developer panel. It contains independent toggles for **Unlimited Sprint** (only Shift-running is free; gathering and weapon actions still cost stamina), **Unlimited Health** (blocks damage and fills health, but does not prevent old age), **Unlimited Hunger** (keeps hunger at 100%) and **Never Die** (prevents lethal damage and the age-100 player death). Escape also closes it.

These are deliberately temporary, session-only test switches in `js/dev-cheats.js`. They default to off every time Epoch opens, are not stored in save slots, and do not undo an already completed game-over. Players' villages, normal saves and death/permadeath rules when the toggles are off remain intact. The dev-only module, UI controls and state hooks can all be removed before release.

## Highland environment cleanup

High mountains no longer receive the same density of leafy trees, berry bushes, grass tufts and deer as ordinary forest. Exposed rock is visually more convincing, while natural stone deposits are still available. Newly spawned camps also stay clear of legacy discovered tribal settlements.

## Generated terrain textures (grass, sand, and water)

Epoch uses three texture tiles, derived from the generated grass, turquoise water, and golden sand artwork, converted into small, seam-blended WebP assets under `assets/textures/`. All 25 streamed terrain chunks share **one** two-texture Babylon shader: world-space UVs tile grass and sand without seams at chunk boundaries, and the beach mask smoothly blends between them. Existing rock colors and mountain slopes remain prominent rather than turning green. Water triangles use a **separate shared tiled water image**, subtle UV drift, existing marine-depth tinting, and alpha. Shoreline clipping, swimming collision, water depth and seed generation remain unchanged.

The source images are artwork; no external texture library or network asset service is required. Three tiles use only about 7 KB combined and load from the same GitHub Pages site. Texture errors fall back to the previous vertex-colored terrain without changing gameplay.

## Coastal beach biome and beach flint

Ocean beaches now extend roughly **70–110 meters inland**, with a broader gently sloped sandy shelf continuing about **20 meters into the shallows**. The sandy band has varying seeded width, a gently irregular waterline and subtle dune-to-wet-sand coloring. Trees, large stone deposits, berry bushes, grass tufts and deer now stay beyond the beach's inland buffer (about 12m beyond the sandy transition); the coastline is open and feels like a real shore.

Small low-poly **Flint Flakes** generate sparsely on dry beach sand, never underwater. They use stable seeded positions, click/F gathering, 2 flint per deposit, a small stamina cost and the normal ten-slot inventory. Harvested flint nodes permanently disappear when exhausted. Flint was already present in the Stone Age catalog, so future spearheads, arrowheads and fire-starting recipes can use the material without introducing another item type. The beach biome uses lightweight shoreline math and the existing streamed chunk system.

## Finite two-dimensional watersheds (river redesign)

Rivers no longer repeat as near-parallel, endless ribbons. Seeded highland headwaters feed **finite, winding 2D river courses** with pronounced turns; two narrower tributaries join each main river and many branches travel mostly north or south before merging. Every main course terminates at the eastern ocean. Rivers narrow toward their sources and widen downstream.

**Large lakes are now uncommon** (roughly one in three broad catchments), instead of appearing every few hundred meters. Their positions follow river bends and their broad shores are irregular. The entire network is cached and spatially indexed by 96m cells to keep terrain streaming fast; it is still reproducible from your existing world seed. New rivers may cross different wilderness terrain than before. A **one-time watershed migration** captures existing stockpiles and all current buildings, including huts constructed since the earlier water update, so those settlements remain dry. Existing tribe records remain intact, and unsafe undiscovered camps are filtered by the tribe placement checks.

This is a procedural branching watershed with highland-selected sources, **not yet a physically solved downhill flow simulation**. A later hydrology pass can model precise drainage gradients, currents and waterfalls.

## World ecology cleanup — More natural water and tribes

Rivers now vary in width as they meander, and seeded lakes are larger, elongated, and gently lobed rather than small circles. This earlier lake expansion was superseded by Watershed v2 above, which changes river courses and makes large lakes occasional. Water geometry is still seed-generated, not stored in saves.

New tribes have genuinely suitable dry, mostly flat land across the **entire camp footprint** (including a 15m margin), and won't generate in rivers, lakes, oceans or high mountain terrain. New settlements use a sparse 160m seeded territory grid: two regular territories are separated by at least 144m, and the guaranteed nearby starter tribe is at least 132m from a regular territory. Unsuitable territories remain empty instead of reshaping terrain into artificial flat islands.

Previously discovered or recruited tribes preserve their saved IDs, population, members, trust, quests and original campsite positions using a backward-compatible `placementVersion` record. Only these historical sites retain former terrain-protection rules. New camps never flatten mountains or suppress waterways.

## Swimming pose polish — No more T-posing

Swim strokes now start from the Quaternius **bent-arm jogging skeleton poses** instead of replacing rotations with the straight-arm binding pose. Small procedural shoulder paddles, elbow bends, and alternating kicks layer over the animation. Treading water uses the authored idle pose and subtle sculling, not the T-pose. Moving swimmers lie mostly prone with their chest nearer the surface, while resting/exhausted swimmers transition upright so their head remains above the water. Transitions to land walk/run are preserved.

## Animated swimming and floating

The real Quaternius humanoid now has **procedural skeletal swimming**: alternating arm pulls, bent elbows, fluttering leg kicks, and subtle torso movement while crossing rivers, lakes, or ocean. Releasing WASD switches to a slower treading/float animation, including when exhausted. Pressing Shift increases the stroke rhythm for fast swimming. The avatar's visual root leans into a mostly horizontal floating position above the water surface, with smooth transitions when entering or leaving water. Animated hair, accessories and the existing glTF rig stay attached.

The original idle, walk and jog animations remain active on dry ground and transition cleanly from swimming. No imported animation assets or save fields were changed. The procedural motion is implemented in `swim-animation.js` and layered onto `locomotion.js`. A formal mocap swimming clip may replace the procedural motion later.

## Swimming and water traversal

Deep water in rivers, lakes and oceans is now traversable with **WASD**. Shallows (under 0.85m depth) remain walkable, while swimming moves at 2.25m/s and drains **5.25 stamina per second**. **Shift** swims at 3.1m/s for **9.25 stamina per second**. Swimming consumes the same stamina as sprinting and gathering, and stops normal stamina regeneration during active swim strokes. Releasing movement allows the character to float in place and recover. Exhausted swimmers remain afloat without dying and can continue when they have recovered 5 stamina; an exhausted swimmer can always climb into adjacent shallows. This makes rivers crossable without enabling endless free swimming.

The player floats near the water surface rather than walking on the seabed. The existing walking cycle is a temporary paddling placeholder with a subtle forward lean and bob until real swim animations are added. Swimming does not change saves, river positions or marine terrain. Drowning, currents and dedicated swimming abilities can be developed later. The temporary **Unlimited Sprint** cheat affects running only; it does not disable swimming stamina costs.

## Phase 4B.3 — Ocean and coastline (first biome pass)

Epoch now has a distinct **ocean biome to the east (+X) of the starting forest**. The saved seed controls a broad, winding coastline about 470–665 meters east of the starting clearing. A gently sloped sandy beach separates existing forests/mountains from shallow tidal water and progressively deeper open ocean, which continues as you travel farther east. Ocean water is blue-green in the shallows and deeper blue offshore. Beach and seafloor colors blend directly into the existing terrain; dense marine chunks use cheaper 8-subdivision water meshes, while shoreline chunks keep the existing detailed 32-subdivision clipping.

Ocean movement follows the existing water rule: wade in the shallows, but deep ocean blocks walking until swimming/boats are implemented. Trees, berry bushes, wild deer and stone deposits are suppressed underwater. Oceans are **not a world edge**: the surface continues indefinitely and can support swimming, ships, fishing and coastal villages later. Rivers keep their existing inland paths and merge visually into the sea at the coastline. Real tides, ocean wildlife, waves, currents, offshore islands and travel are future milestones.

A one-time `oceanProtectedSites` snapshot shelters pre-ocean stockpiles and buildings, even in saves that already completed earlier water migrations. Historic tribal camps are also kept on dry ground as chunks stream. Newly built villages cannot reshape the coast, and existing saves retain their seeds, materials, residents and progress.

## Phase 4B.2 — Rivers, lakes and water

The same saved **world seed** now creates connected, meandering rivers and lakes that widen sections of the river corridor. Water generation uses continuous **world coordinates**, not independent chunk endpoints, so rivers remain seamless as you walk between the existing 32-meter terrain chunks. Water surfaces are translucent, with sandy shore transitions and a recessed river/lake bed. Water meshes load and unload with the same 5×5 chunk window as the rest of the forest.

**Water depth matters:** Shallow banks can be waded through using WASD; deep water blocks walking until swimming is implemented. Ground clicks still do not move the player. Trees, rocks, berry bushes, grass and deer no longer appear underwater. Players cannot place new stockpiles or buildings on wet sites. There are **no fish, fishing equipment, aquatic wildlife, bridges or swimming mechanics yet**; those remain later Phase 4B tasks.

**Existing saves:** The original founding clearing is always dry. Saves created before 4B.2 automatically preserve a one-time snapshot of their existing stockpile and building locations. This keeps old settlements above water, and the saved protected sites do not change as new buildings are constructed. Seed, settled villages and tribal camp locations are unchanged. Water itself is generated deterministically and doesn't need a separate save record.

## Phase 4B.2 — Mountains and foothills (terrain pass 1)

The terrain now includes **seeded mountain belts and long, curving ridges** beyond the original founding area. Gradual foothills connect the older rolling forest to higher land, with lower saddles between ridges. These mountains are part of the continuous world-coordinate heightfield, not separately spawned decorative rocks, and they stream with the existing 32-meter terrain chunks. The starting forest remains unchanged within 150 meters of the original clearing.

**Existing saves:** When loading a save created before this update, Epoch takes a one-time snapshot of its stockpile and completed building positions. The new mountain uplift is suppressed near those original sites, keeping the village at its previous elevation. Procedural tribal camps are also locally protected. Newly built structures do not alter mountains after this initial migration, and saves retain their current world seed and water layout.

This first pass concentrates on the terrain shapes. Rocky slopes, cliffs, slope-aware navigation, specialized resources, and mountain-fed water drainage are separate follow-up improvements.

## Mountain waterways — Valley-carving fix

Mountains give way to wide, gently tapered valleys wherever the active river or lake footprint crosses high ground. Watershed v2 now replaces the original centerlines, so these valleys follow the new network. The shared `water-corridors.js` module describes the original waterways independently of elevation; mountains fade out toward those corridors and rocky terrain uses the resulting lower ground. The shoreline still has natural green, stony shoulders rather than a sudden wall.

This is a **terrain-aware river-valley pass**, not yet a downhill watershed or waterfall simulation. Protected villages, swimming depth rules, and chunk continuity remain intact under the newer network.

## Mountain implementation 2 — Rocky slopes and exposed stone

Mountains now transition from forest green to subdued foothill scrub and gray-brown exposed rock as their uplift and slope steepness increase. A shared terrain-specific material uses per-vertex coloring, with weathered color bands on higher rocky faces and lighter rock highlights toward the peaks. Riverbanks retain their subtle muted transition, and old villages remain green because the previous terrain-protection snapshots are reused.

In the nine detailed terrain chunks nearest the player, a few low-poly **decorative bedrock outcrops** appear on steep, dry mountain ground. They are seed-based, not collectable stone deposits, have no collision or harvest interaction, and disappear when their chunks unload. This pass **does not change mountain heights, village positions, water boundaries, movement rules or saves**. Navigable mountain passes and steep-slope collision are planned in the next implementation.

## Inventory, resources, and world

Knowledge comes from founding the stockpile (**+3**), constructing the first of each building type (Toolmaker's Shelter **+6**, Hut **+3**, Council Lodge **+3**, Cooking Hearth **+4**), and milestones at **3 buildings (+3)**, **6 buildings (+4)**, and **10 buildings (+5)**. Repeat huts cannot repeatedly award a first-build bonus. An existing Toolmaker's Shelter generates **1 Knowledge per 60 seconds of active gameplay** until villager research assignments are available. Gathering and crafting award skill XP, not Knowledge. Culture's existing earning rules remain temporary until the villager system is built.

Inventory has **10 slots**, with **12 items per stack**. The stockpile holds **480 individual items** separately. The **Inventory** panel displays the item grid and compact contextual actions: hover for details; click ready-to-eat food (berries, roasted meat and berry-roasted meat) for **Eat** then **Discard stack**, or raw ingredients and other materials for **Discard stack**. Discard removes the chosen stack immediately without confirmation. Primitive tool crafting is available only nearby under **Village → Craft**, and spends **stored stockpile materials**. Technology and Culture still use carried items and village stockpile supplies (carried first). Knowledge and Culture points are paid separately. Village building construction still spends stockpiled materials only. Older excess inventory is retained as recoverable supplies.

Trees contain 12 wood and disappear when exhausted; stone deposits contain 12 stone and do not regrow. Bushes contain 8 berries, which regrow two minutes after depletion, including while the game is closed. Clearing a bush yields 3 vines and permanently removes it. This is a world interaction, not an Inventory action. Harvested resources and removed objects persist across chunk reloads and descendants.

The saved seed generates one forest biome in 32-meter chunks: 25 terrain chunks remain nearby, with scenery, wildlife and independent tribal camps in the inner nine. Camps appear in cleared sites, render and unload with terrain detail, and do not spawn inside the founding clearing. A seed-specific first tribe is placed in an explorable outer ring; additional tribes appear throughout the wilderness. Each tribe has a deterministic ID, leader, and 2–5 members. Tribe encounters now support three nonrepeatable supply requests and full peaceful relocation when housing permits. Quest supplies are consumed **only from your carried Inventory**, not remotely from the village stockpile. Recruited tribal residents persist individually; combat and cultural/reputation consequences are planned for later. Resources are finite, while untouched regions regenerate from the seed. Deer, rabbits and boars can be hunted for meat and crafting materials. See [RESOURCE_DEPLETION.md](./RESOURCE_DEPLETION.md) and [VILLAGE_SYSTEM.md](./VILLAGE_SYSTEM.md) for details.

## Saves

The three browser-local slots use `epoch.stoneage.slot.1`, `.2`, and `.3`. The previous `epoch.stoneage.v1` save is preserved as the one-time migration source; it is copied into an empty Slot 1. Existing completed villages and resource depletion are retained.

Progress autosaves after state changes. The game menu also offers **Save game** and **Save & return to title**. Slot deletion or replacement requires confirmation. Saves do not transfer between browsers or devices, and clearing site data removes them. The pre-alpha save format can change across future updates.

## Current limits and assets

Housing capacity increases immediately; peaceful recruitment, individual villager profiles, personal survival, food consumption and death/survivor succession are implemented. Villager jobs, real transport, daily schedules, hunger, resting, hunting, cooking, fishing, building upgrades, and persistent social bonds are implemented. Children, family trees, happiness, personality traits, hostile tribe combat, complex diplomacy, rival civilization AI, additional ages, multiplayer, accounts and synced saves remain future work. Research and Culture are functional building activities; level-two structures provide working storage, production, housing and civic benefits. Desktop play is the main target, with responsive panels and on-screen placement controls; complete touch movement still needs work.

Characters use Quaternius Universal Base Characters Standard **CC0** assets with real skinned rigs, separate hairstyles, and authored idle/walk/run clips. Source credit, license, pinned import revision, and rebuild instructions are in [assets/characters/QUATERNIUS.md](./assets/characters/QUATERNIUS.md). Previous original GLBs remain as fallback art. Stone Age clothing and animation polish are future visual work; the founder creator currently uses a stylized reference portrait.

Automated state/model checks and Chromium smoke tests exist under `tests/` and `.github/workflows/`. Wider production use still needs pinned or locally bundled Babylon dependencies, performance profiling, and broader device testing.

© 2026. Original Epoch prototype, built as an AI-assisted creative software project.
