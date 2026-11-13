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
1. Gather wood from trees and stone from rock deposits.
2. Research **Control of Fire** in the Tech tab.
3. Research **Stone Toolmaking**, then craft a **Stone Axe** in Pack.
4. Build your first **Shelter**.
5. Gather berries to earn Culture, then unlock **Tribal Community** and **Oral Tradition**.
6. Open the **Dynasty** tab and continue playing as a descendant; your civilization persists.

## What's implemented
- A small procedural wilderness, real skinned male and female Quaternius CC0 character models, an animated modular player, four visually varied human villagers and roaming deer
- Keyboard and click movement, camera controls and simple A* grid pathfinding
- Wood/stone/food gathering, XP and leveling for six initial skills
- Resource costs, technology and civic prerequisites
- Campfire, stone axe and shelter unlocks
- A prototype succession mechanic with partial skill-XP inheritance and inherited appearance traits
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
