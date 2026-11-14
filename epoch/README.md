# Epoch — Dawn of the First Tribe

**Status:** Playable Stone Age foundation / pre-alpha.

**Static site path:** `/epoch/`

**Design:** [GAME_DESIGN.md](./GAME_DESIGN.md)

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
| Inventory button / I | Ten-slot inventory, stack inspection/discard, Stone Axe crafting |
| Skills button / K | Six personal skill tracks and XP progress |
| Objective → Establish camp | Free first-stockpile placement |
| Village Stockpile | Village **Storage / Build / Buildings** sections |
| Toolmaker's Shelter | Technology research |
| Council Lodge | Culture and traditions |
| Family Hut | Dynasty, family chronicle, and reviewed succession |
| Cooking Hearth | Hearth information; cooking recipes are planned |
| Game menu | Save game, Help, and Save & return to title |

The title screen offers New Game, Continue, and three independent local save slots. Founder appearance is chosen when starting a new game and cannot be edited afterward. Descendants inherit related appearance traits. There is no global Village, Technology, Culture, Dynasty, or Character tab.

## First steps

1. Choose a slot and create your founder. Use **Establish camp** on the current objective to place a free stockpile, or choose the nearby-clearing option.
2. Gather wood and vines from trees, stone from deposits, and berries plus vines from bushes. Click the stockpile to approach it and open **Storage**. Move within 5 meters to deposit or withdraw supplies.
3. Open the stockpile's **Build** section. Construct a **Toolmaker's Shelter** with **12 stored wood and 8 stored stone**. It requires no prior research, so Technology is reachable from a fresh game.
4. Click the completed shelter to research **Control of Fire** and **Stone Toolmaking**. Research uses carried Inventory materials and Knowledge; keep or withdraw the required supplies. Craft a **Stone Axe** in Inventory with 2 carried wood and 3 carried stone after learning Stone Toolmaking.
5. Build a **Family Hut** for 10 stored wood and 6 stored stone. It adds 3 housing capacity; click it to open Dynasty. Build a **Council Lodge** for 14 stored wood and 8 stored stone, then click it to establish traditions. The lodge requires no prior Culture unlock.
6. After researching Control of Fire, build a **Cooking Hearth** for 6 stored wood and 5 stored stone. Its fire appears only after construction. To change generations, visit a Family Hut and choose **Plan succession**, then review and confirm the change.

## Controls and placement

| Input | Action |
|---|---|
| WASD / Shift + WASD | Walk / sprint relative to the camera |
| Left-click ground | Auto-walk to a position |
| Left-click resource / E nearby | Approach and gather / gather a nearby resource |
| Shift-click berry bush / Shift + E nearby | Permanently clear a bush for vines |
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

Inventory has **10 slots**, with **12 items per stack**. The stockpile holds **480 individual items** separately. Crafting, Technology, and Culture spend carried materials; village construction spends stockpiled materials. Older excess inventory is retained as recoverable supplies.

Trees contain 12 wood and disappear when exhausted; stone deposits contain 12 stone and do not regrow. Bushes contain 8 berries, which regrow two minutes after depletion, including while the game is closed. Clearing a bush yields 3 vines and permanently removes it. This is a world interaction, not an Inventory action. Harvested resources and removed objects persist across chunk reloads and descendants.

The saved seed generates one forest biome in 32-meter chunks: 25 terrain chunks remain nearby, with scenery and wildlife in the inner nine. Resources are finite, while untouched regions regenerate from the seed. Deer are ambient wildlife. See [RESOURCE_DEPLETION.md](./RESOURCE_DEPLETION.md) and [VILLAGE_SYSTEM.md](./VILLAGE_SYSTEM.md) for details.

## Saves

The three browser-local slots use `epoch.stoneage.slot.1`, `.2`, and `.3`. The previous `epoch.stoneage.v1` save is preserved as the one-time migration source; it is copied into an empty Slot 1. Existing completed villages and resource depletion are retained.

Progress autosaves after state changes. The game menu also offers **Save game** and **Save & return to title**. Slot deletion or replacement requires confirmation. Saves do not transfer between browsers or devices, and clearing site data removes them. The pre-alpha save format can change across future updates.

## Current limits and assets

Housing capacity increases immediately, but new settlers, household assignment, worker jobs, cooking, combat, hunting, NPC conversations, rival civilizations, additional ages, multiplayer, accounts, and synced saves are not implemented. Research and Culture are functional building activities; automatic building production bonuses remain planned. Desktop play is the main target, with responsive panels and on-screen placement controls; complete touch movement still needs work.

Characters use Quaternius Universal Base Characters Standard **CC0** assets with real skinned rigs, separate hairstyles, and authored idle/walk/run clips. Source credit, license, pinned import revision, and rebuild instructions are in [assets/characters/QUATERNIUS.md](./assets/characters/QUATERNIUS.md). Previous original GLBs remain as fallback art. Stone Age clothing and animation polish are future visual work; the founder creator currently uses a stylized reference portrait.

Automated state/model checks and Chromium smoke tests exist under `tests/` and `.github/workflows/`. Wider production use still needs pinned or locally bundled Babylon dependencies, performance profiling, and broader device testing.

© 2026. Original Epoch prototype, built as an AI-assisted creative software project.
