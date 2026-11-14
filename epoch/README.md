# Epoch — Dawn of the First Tribe

**Status:** Playable Stone Age foundation / pre-alpha.

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
| Inventory button / I | Ten-slot inventory, eat berries, stack inspection/discard, Stone Axe crafting |
| Skills button / K | Six personal skill tracks and XP progress |
| Objective → Establish camp | Free first-stockpile placement |
| Village Stockpile | Village **Storage / Build / Buildings / People** sections |
| Toolmaker's Shelter | Technology research |
| Council Lodge | Culture and traditions |
| Family Hut | Dynasty, family chronicle, and reviewed succession |
| Cooking Hearth | Hearth information; cooking recipes are planned |
| Wilderness tribal camps and leaders | Meet leaders, help with supply quests to earn Trust, and invite tribes to settle peacefully |
| Village residents (click people or open Stockpile → People) | Inspect a villager's personal chronicle, former clanmates, housemates and housing assignment |
| Survival HUD | Health, Stamina, Hunger and temporary food-bonus timer; bars appear by the founder's name |
| Game menu | Save game, Help, and Save & return to title |

New games start with **one resident: the founder**. Small independent tribes appear in the wilderness with **2–5 seeded, named people**, tribal leaders and simple camps. Visit the camp or click its people and huts to meet the leader. Their names and locations reproduce from the saved world seed. Tribes remember discovery, Trust, fulfilled requests and relocation through saves and terrain streaming. **Peaceful recruitment is now playable:** bring a tribal leader three requested sets of carried supplies (berries, wood and stone), earn 35 Trust per successful request, then invite the whole tribe when Trust reaches 100 and your village has enough open housing for everyone. The tribe dismantles its original camp, which remains an abandoned clearing and never respawns as an active settlement. Recruits become saved named residents visible in your village and the stockpile's People roster. Razing, combat, individual negotiations, happiness, traits and villager jobs are later milestones.

**Phase 3: people and housing.** The stockpile now has a **People** section with the founder, each named villager, a population summary, and actual occupancy for the communal camp and every Family Hut. Click **View profile**, or click a villager/nameplate in the 3D world, to inspect their story, origin tribe, arrival year, original tribal leadership, former clanmates and current housemates. The founder uses one of the five communal spaces; up to four other villagers can live in the camp, and each Family Hut provides three more beds. You can **assign a resident to any home with an available bed**; assignments instantly reposition that villager in the village, are recorded in their personal chronicle, and survive reloads and succession. Migrated saves receive compatible names and housing records. Housing moves are instantaneous for now: walking home, relationships beyond shared clan/household history, jobs and mood simulation are future development stages. Other home-village NPCs appear only for residents actually recorded in the save; older villages retain their saved residents. Recruitment, births, and villager jobs are planned for later. A Family Hut adds housing capacity, not residents.

**Phase 4 survival foundations.** Every controlled character has 100 Health, up to 100 base Stamina and 100 Hunger. Hunger decreases only during active unpaused gameplay and never directly hurts or kills the player. When hunger reaches zero, available stamina is capped at 45 and stamina regeneration slows; food restores your ability to act. Harvesting consumes stamina (tree 6, stone 5, berries 2, clearing a bush 8); actions do not spend stamina or deplete a resource when the pack is full or stamina is insufficient. Holding Shift while moving spends 11 stamina per second, and automatically slows to walking when exhausted. Stamina recovers naturally when not sprinting, with hunger affecting recovery speed. **Eat one carried berry** from Inventory to restore 24 Hunger and 12 Stamina and gain **+20 maximum Stamina for two active minutes**. The food timer refreshes rather than stacking; its expiration returns stamina to the normal limit. These values persist in each save and are not simulated while offline.

**Death and continuation.** You can designate any named village resident as your successor in Stockpile → People → View profile; the Family Hut's Dynasty screen also shows the current designation. When a character dies from damage, control moves to that named villager if available; otherwise, a random living resident takes over. The successor leaves the regular villager roster (so population is not duplicated), inherits the saved village, and begins their rule in the settlement. There is no automatic 24-year skip on death, and prior leaders are recorded in the lineage. **If nobody survives besides the player, death permanently ends the run**; the slot retains the final history but cannot be resumed. Old saves are migrated with full health, stamina and hunger, preserving existing progress. Weapons, hostile NPC combat and causes of injury are not playable yet; the damage/death logic is ready for them. The older manual Dynasty succession remains separate from combat death.

The title screen offers New Game, Continue, and three independent local save slots. Founder appearance is chosen when starting a new game and cannot be edited afterward. Descendants inherit related appearance traits. There is no global Village, Technology, Culture, Dynasty, or Character tab.

## First steps

1. Choose a slot and create your founder. Use **Establish camp** on the current objective to place a free stockpile, or choose the nearby-clearing option.
2. Gather wood and vines from trees, stone from deposits, and berries plus vines from bushes. Click the stockpile to approach it and open **Storage**. Move within 5 meters to deposit or withdraw supplies.
3. Open the stockpile's **Build** section. Construct a **Toolmaker's Shelter** with **12 stored wood and 8 stored stone**. It requires no prior research, so Technology is reachable from a fresh game.
4. Click the completed shelter to research **Control of Fire** and **Stone Toolmaking**. Research uses Inventory materials first and automatically draws any shortage from the village stockpile, plus Knowledge; no manual withdrawal is needed. Village founding and first-time construction now award Knowledge, and a Toolmaker's Shelter produces 1 Knowledge per active minute. Craft a **Stone Axe** in Inventory with 2 carried wood and 3 carried stone after learning Stone Toolmaking.
5. Build a **Family Hut** for 10 stored wood and 6 stored stone. It adds 3 housing capacity; click it to open Dynasty. Build a **Council Lodge** for 14 stored wood and 8 stored stone, then click it to establish traditions. The lodge requires no prior Culture unlock.
6. After researching Control of Fire, build a **Cooking Hearth** for 6 stored wood and 5 stored stone. Its fire appears only after construction. To change generations, visit a Family Hut and choose **Plan succession**, then review and confirm the change.

## Controls and placement

| Input | Action |
|---|---|
| WASD / Shift + WASD | Walk / sprint relative to the camera (sprinting uses Stamina) |
| Inventory → Eat 1 berry | Restore Hunger, Stamina and a timed +20 maximum Stamina bonus |
| Left-click ground | Auto-walk to a position |
| Left-click resource / E nearby | Approach and gather / gather a nearby resource |
| Shift-click berry bush / Shift + E nearby | Permanently clear a bush for vines |
| Click a tribal leader, sign or camp shelter | Approach the tribe; bring supply requests in your backpack, earn Trust, and invite people if housing is available |
| E near a tribal leader | Open a nearby tribe encounter (if no gatherable resource takes priority) |
| Click a named villager or overhead nameplate | Open their saved personal profile |
| E beside a villager | Inspect the closest villager if no gatherable resource takes priority |
| Hold arrow keys (outside build mode) | Smoothly rotate left/right or tilt up/down, easing to a stop |
| Right mouse drag / mouse wheel | Optional camera rotation / zoom |
| I / K | Toggle Inventory / Skills |
| Escape / game-menu button | Close the active panel or dialog, or open the game menu |
| Ground click during placement | Pin the stockpile or building preview |
| Arrow keys / on-screen arrows | Move the preview one 2-meter grid cell and pin it |
| R during building placement | Rotate the building preview 90 degrees |
| Confirm placement / Enter | Confirm a valid placement |

Placement starts from a movable preview. A click or arrow adjustment pins its location; rotating the camera does not move it. Village buildings use stored materials and must fit inside the stockpile's 24-meter territory, with clear, sufficiently level ground. Completed buildings retain their coordinates and rotation. Moving, rotating, or demolishing already-built structures is not implemented.

## Inventory, resources, and world

Knowledge comes from founding the stockpile (**+3**), constructing the first of each building type (Toolmaker's Shelter **+6**, Family Hut **+3**, Council Lodge **+3**, Cooking Hearth **+4**), and milestones at **3 buildings (+3)**, **6 buildings (+4)**, and **10 buildings (+5)**. Repeat huts cannot repeatedly award a first-build bonus. An existing Toolmaker's Shelter generates **1 Knowledge per 60 seconds of active gameplay** until villager research assignments are available. Gathering and crafting award skill XP, not Knowledge. Culture's existing earning rules remain temporary until the villager system is built.

Inventory has **10 slots**, with **12 items per stack**. The stockpile holds **480 individual items** separately. Crafting spends carried materials, while Technology and Culture use both carried Inventory and village stockpile supplies (carried items first). Knowledge and Culture points are paid separately. Village building construction still spends stockpiled materials only. Older excess inventory is retained as recoverable supplies.

Trees contain 12 wood and disappear when exhausted; stone deposits contain 12 stone and do not regrow. Bushes contain 8 berries, which regrow two minutes after depletion, including while the game is closed. Clearing a bush yields 3 vines and permanently removes it. This is a world interaction, not an Inventory action. Harvested resources and removed objects persist across chunk reloads and descendants.

The saved seed generates one forest biome in 32-meter chunks: 25 terrain chunks remain nearby, with scenery, wildlife and independent tribal camps in the inner nine. Camps appear in cleared sites, render and unload with terrain detail, and do not spawn inside the founding clearing. A seed-specific first tribe is placed in an explorable outer ring; additional tribes appear throughout the wilderness. Each tribe has a deterministic ID, leader, and 2–5 members. Tribe encounters now support three nonrepeatable supply requests and full peaceful relocation when housing permits. Quest supplies are consumed **only from your carried Inventory**, not remotely from the village stockpile. Recruited tribal residents persist individually; combat and cultural/reputation consequences are planned for later. Resources are finite, while untouched regions regenerate from the seed. Deer are ambient wildlife. See [RESOURCE_DEPLETION.md](./RESOURCE_DEPLETION.md) and [VILLAGE_SYSTEM.md](./VILLAGE_SYSTEM.md) for details.

## Saves

The three browser-local slots use `epoch.stoneage.slot.1`, `.2`, and `.3`. The previous `epoch.stoneage.v1` save is preserved as the one-time migration source; it is copied into an empty Slot 1. Existing completed villages and resource depletion are retained.

Progress autosaves after state changes. The game menu also offers **Save game** and **Save & return to title**. Slot deletion or replacement requires confirmation. Saves do not transfer between browsers or devices, and clearing site data removes them. The pre-alpha save format can change across future updates.

## Current limits and assets

Housing capacity increases immediately; peaceful recruitment, individual villager profiles, personal survival, food consumption and death/survivor succession are implemented. Worker jobs, villager hunger/deaths, happiness, personality traits, births, hostile combat, weapons, hunting, branching conversations, complex diplomacy, rival civilization AI, additional ages, multiplayer, accounts, and synced saves are not yet implemented. Research and Culture are functional building activities; automatic building production bonuses remain planned. Desktop play is the main target, with responsive panels and on-screen placement controls; complete touch movement still needs work.

Characters use Quaternius Universal Base Characters Standard **CC0** assets with real skinned rigs, separate hairstyles, and authored idle/walk/run clips. Source credit, license, pinned import revision, and rebuild instructions are in [assets/characters/QUATERNIUS.md](./assets/characters/QUATERNIUS.md). Previous original GLBs remain as fallback art. Stone Age clothing and animation polish are future visual work; the founder creator currently uses a stylized reference portrait.

Automated state/model checks and Chromium smoke tests exist under `tests/` and `.github/workflows/`. Wider production use still needs pinned or locally bundled Babylon dependencies, performance profiling, and broader device testing.

© 2026. Original Epoch prototype, built as an AI-assisted creative software project.
