# Epoch — Stone Age Village Foundation

## First settlement milestone

The initial site is **Wanderer's Clearing**. The world contains five fixed, clickable construction sites to grow the village in a guided first building pass. Each construction plot has a boundary ring, a visible label, corner markers, and a distinct building when completed.

| Plot | Building | Resources | Gate | Current benefit |
|---|---|---|---|---|
| Family Hut 1 | Family Hut | 10 wood / 6 stone | None | +3 population capacity |
| Family Hut 2 | Family Hut | 10 wood / 6 stone | None | +3 population capacity |
| Cooking site | Cooking Hearth | 6 wood / 5 stone | Control of Fire | 3D cooking station; recipes later |
| Research site | Toolmaker's Shelter | 12 wood / 8 stone | Stone Toolmaking | 3D workshop; tech XP later |
| Gathering site | Council Lodge | 14 wood / 8 stone | Tribal Community | 3D longhouse; culture bonuses later |

Names are evocative game terminology, not claims that every real prehistoric society used these exact buildings or names. The region has not yet been assigned a specific historical location or archaeological tradition.

## Construction controls

Click a marked plot in the 3D world to automatically approach it. Its details open in the **Village** tab. You can also open the Village tab directly and click **Walk to construction site**. While near the edge of the plot, press **Construct** if you have the materials and prerequisite technology/civic. Construction earns a small amount of personal Construction skill XP.

The player must approach a construction site to build; this prevents instant world-wide building from anywhere on the map. The character must also stand outside the plot footprint so the new building doesn't trap them inside its collision volume. Buildings add collision and pathfinding obstacles once built.

## Population capacity

The existing four named villagers and the player are the initial five people at camp. This prototype begins at **5/5 capacity**, representing temporary sleeping places. Each Family Hut adds **3 maximum resident slots**, allowing 5/8 and then 5/11. This change is immediately functional, but additional settlers **do not spawn automatically yet**. Population, housing occupancy, survival consumption, villager jobs and family household assignment come in later milestones.

## Other buildings, later effects

- **Cooking Hearth:** real cooking system after hunting and raw meat resources arrive. Food processing, fuel and cooking skill are future extensions. The fire ring from Control of Fire remains in the same place.
- **Toolmaker's Shelter:** future knowledge production, workshops, experimentation and early tool recipes. No automatic Knowledge/Tech XP in this first implementation.
- **Council Lodge:** future culture generation, social decisions, tradition unlocks, oral history and ceremonies. No automatic Culture XP in this first implementation.

These structures are separate from future farm plots, animal husbandry, mines, advanced technology and region-specific settlement layouts.

## Ideas for the next village phase

1. **Storage Pit** or **Granary:** increases resource storage; early subterranean pits could be a credible prehistoric option.
2. **Hide-Drying Rack:** crafts leather/hide for primitive clothing and gear.
3. **Medicine Shelter:** heals injuries and adds a healing-herbs skill.
4. **Watchfire:** reveals approaching animals and nearby rival tribes.
5. **Animal Pen:** captures and domesticates animals when husbandry becomes available.
6. **Meeting Circle:** outdoor culture and diplomacy before permanent halls; could upgrade into the Council Lodge.

Only the four primary building types have been implemented for now. The additional options are design ideas, not hidden gameplay features.

## Source layout

- `js/settlement.js`: building definitions, costs, prerequisites, plot IDs/coordinates, housing formulas
- `js/state.js`: persistent construction, inventory deductions, eligibility checks, save migration, Construction XP
- `js/village-world.js`: 3D plot geometry, built structures, interaction markers, visibility and collisions
- `js/world.js`: click-to-approach pathfinding and plot interactions
- `js/village-ui.js`: Village panel, site selection, walk-to-build UI
- `js/ui.js`: integration with current objectives, top-level tabs, state updates
- `tests/check-settlement.mjs`: persistence, capacity, prerequisites and save migration
- `tests/browser-walk.mjs`: graphical construction, build sites and walking interaction

## Save migration

The storage key remains `epoch.stoneage.v1` and no existing save is deleted. Existing `shelter:true` is converted into `village.plots.family_1="family"` on first load, without charging materials, so the existing hut keeps its value. Current and future generations inherit village construction progress. Resetting the demo still requires explicit confirmation.

## Later: free placement and growing settlements

These first five sites are **fixed**. Moving/placing arbitrary new building footprints requires snapping, collision checks, persistent coordinates, navigation around structures and a scalable map. We should introduce those systems separately instead of hardcoding one building per location forever. Each construction site is already identified by a stable plot ID to support that upgrade.

### Initial acceptance checklist

- Village tab displays current population/capacity and five construction locations.
- Clicking plots in 3D walks the character to the site and opens the correct details.
- All four models look distinct and toggle from empty plot to built structure.
- Research/culture gates and material requirements work.
- Family Hut #1 and #2 each add exactly 3 housing capacity.
- Built structures persist on refresh and across descendants.
- Existing shelter is respected as the first hut.
- Babylon 3D scene, character animation and resource gathering continue to work.
