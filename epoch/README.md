# Epoch — Dawn of the First Tribe

**Status:** Playable Stone Age foundation / pre-alpha.  
**Website path:** `/epoch/` once merged into the site's main branch.  
**Design:** [GAME_DESIGN.md](./GAME_DESIGN.md)

Epoch is a first-person-in-history (third-person camera) browser RPG about learning personal skills, researching civilization technologies and culture, and passing control to your descendants across generations.

## Play
Open `index.html` via a local HTTP server or deploy the `epoch/` folder under a static website. An internet connection is required for the experimental Babylon.js CDN dependency. No backend is required.

If you have Python installed, run from the **site repository root**:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/epoch/`. A direct `file://` open is not recommended because the game uses JavaScript modules.

**World generation:** 32-meter chunks; 5×5 nearby terrain meshes; detailed forest, berry bushes, stone and deer inside a 3×3 neighborhood. It is one forest biome for now. Read [WORLD_SYSTEM.md](./WORLD_SYSTEM.md) for design, seed persistence and current limitations.

### Controls
| Input | Action |
|---|---|
| W A S D | Move relative to camera |
| Shift + WASD | Sprint |
| Left-click ground | Auto-walk to position using grid pathfinding |
| Left-click tree, rock or bush | Walk into range and gather |
| E | Gather nearest reachable resource |
| Right mouse drag | Rotate camera |
| Mouse wheel | Zoom camera |

## First objectives
1. Gather wood and vines from trees, stone from deposits, and wild berries plus vines from bushes. Manage your 10-slot pack (12 items per stack).
2. Research **Control of Fire** in the Tech tab.
3. Research **Stone Toolmaking**, then craft a **Stone Axe** in Pack.
4. Open **Village**, walk to a build plot, and construct a **Family Hut** to add room for 3 villagers.
5. Construct a **Cooking Hearth**, **Toolmaker’s Shelter**, and **Council Lodge** as their prerequisites become available.
5. Gather berries to earn Culture, then unlock **Tribal Community** and **Oral Tradition**.
6. Open the **Dynasty** tab and continue playing as a descendant; your civilization persists.

## What's implemented
- A seeded, smooth, continuously streamed forest biome with terrain chunks, original trees, stone deposits, berry bushes and deer; real Quaternius CC0 characters and four villagers
- Keyboard and click movement, camera controls, and dynamically bounded A* navigation across chunk borders
- A proper 10-slot personal inventory: wood, stone, wild berries and vines stack to 12 each; trees and bushes supply vines
- Woodcutting, mining and berry foraging, with XP and leveling for six initial skills
- Inventory-backed resource costs, technology and civic prerequisites; legacy resources migrate without loss
- Campfire, stone axe, and a five-plot village with Family Huts, Cooking Hearth, Toolmaker’s Shelter, and Council Lodge
- Each Family Hut expands population capacity by 3; cooking, research, and culture building bonuses come later
- A prototype succession mechanic with partial skill-XP inheritance and inherited appearance traits
- Persistent procedural world seed (same terrain and resource locations across reloads and descendants)
- Character appearance editor (male/female body templates; six hairstyles, six hair colors, skin and eye colors, outfits, facial hair and proportions)
- Versioned local save in the browser's `localStorage`

## Not yet implemented
Combat, active enemies, hostile animals, hunting, NPC conversations/AI, rival civilizations, diplomacy, real family/children mechanics, polished Blender-skinned armature rigs and advanced authored animation clips, additional historical ages, multiplayer, accounts and synced saves.

## Files
```
epoch/
  index.html
  styles.css
  js/
    main.js
    state.js
    world.js
    ui.js
    characters.js
    character-models.js
  assets/
    characters/
      human_male.glb
      human_female.glb
  tools/
    build-avatar-glb.js
    open_models_in_blender.py
  CHARACTER_SYSTEM.md
  GAME_DESIGN.md
  README.md
```

## Production readiness
This is a vertical slice, not a finished game. Babylon.js explicitly recommends **not** using its public CDN for production; when we're ready to publish widely, pin the version, bundle it locally, and build a real test pipeline. Epoch now loads Quaternius's genuinely skinned and weighted male and female humanoids by default, including source hairstyle meshes. The previous original experimental GLB assets remain as emergency fallback. Quaternius assets have a real rig but the game's walk/idle animation still needs refinement. Stone Age clothing is the next visual milestone. Desktop play is the current target; touch controls need work.

## Save format
Local storage key: `epoch.stoneage.v1`. This pre-alpha format can change, so saves aren't yet guaranteed across breaking updates. Reset is available in the Dynasty panel, with a confirmation.

© 2026. Original Epoch prototype, built as an AI-assisted creative software project.

## Character system
See [CHARACTER_SYSTEM.md](./CHARACTER_SYSTEM.md) for editable appearance profiles, inheritance rules and the GLB asset workflow and Blender import instructions. Use the **Character** tab to customize the player model; changing descendants generates a related but distinct appearance.

## Licensed Quaternius character pipeline
The default humans use Quaternius Universal Base Characters (free Standard CC0). Source: https://quaternius.com/packs/universalbasecharacters.html . Import provenance, author credit, selected hairstyles and source revision are documented in assets/characters/QUATERNIUS.md. Rebuild via node epoch/tools/import-quaternius.mjs.

## Settlement building
The **Village** tab has five buildable plots in the Stone Age clearing: two Family Huts (+3 people capacity each), a Cooking Hearth, a Toolmaker's Shelter, and a Council Lodge. Click a plot to approach it and use the Village panel to construct it. Resource costs and technology/culture prerequisites apply; older shelter saves migrate automatically. Other building production bonuses, growing population and freely placed buildings will be future work. See [VILLAGE_SYSTEM.md](./VILLAGE_SYSTEM.md) for full rules and ideas.

## Depletable forest resources

Trees now contain a finite amount of wood and fall when exhausted; rock deposits disappear after they have been mined out. Berry bushes remain standing after their eight berries run out and regenerate berries after two minutes. Shift+click a bush (or Shift+E nearby, or use the Pack button) to chop it down permanently for three vines. Depletion is saved per world object, so unloading/reloading chunks or starting a new generation does not magically restore felled trees or stones. For mechanics and limits see [RESOURCE_DEPLETION.md](./RESOURCE_DEPLETION.md).

## Village founding and stockpile

The first player village now begins by placing a **free Stockpile** on clear, level forest ground using a 2-meter grid. Click the Village tab and choose a location, or use the nearby-clearing shortcut. Once founded, click the physical stockpile (or use **Walk to stockpile**) to return with your gathered wood, stone, berries and vines. Its storage holds up to **480 items** and is separate from the 10-slot personal Pack. Deposit all or 12 at a time, and withdraw 12 at a time when nearby. All **village buildings use stockpiled materials** rather than backpack contents. The original five Stone Age structures are arranged around the Stockpile within a 24-meter village radius. Existing built villages receive a free home stockpile without losing their huts. See [STOCKPILE_SYSTEM.md](./STOCKPILE_SYSTEM.md) for controls, save migration and future plans.

## Personal inventory
The starter Wayfarer's Pack has **10 slots**, and wood, stone, wild berries and vines stack to **12 per slot**. Trees yield wood plus vines; berry bushes yield berries plus vines; stone deposits yield stone. Crafting, technology and buildings consume carried stacks. Select a filled slot to inspect or discard it if the pack becomes full. Existing saves with more resources than 10 slots can carry retain the excess as manually recoverable supplies. See [INVENTORY_SYSTEM.md](./INVENTORY_SYSTEM.md).

### Buildable Cooking Hearth

The original static campfire has been removed from the starting world. Researching **Control of Fire** unlocks the **Cooking Hearth** blueprint, but does not create an automatic campfire. Deposit **6 wood and 5 stone** at your village stockpile, approach the Cooking Hearth construction plot and build it; only then will the hearth's stones, logs, flames, and firelight appear. The completed structure and its location persist with the village save. Cooking food remains a future feature.
