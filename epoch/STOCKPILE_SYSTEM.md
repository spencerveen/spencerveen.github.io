# Epoch — Founding a Village and the Stockpile

## First settlement hub

A new Stone Age game starts **without** a founded village. In the Village tab you can select **Choose stockpile location**. A transparent footprint follows the cursor and snaps to a 2-meter grid. Click clear, sufficiently level terrain within 18 meters of your character to place your **free first Stockpile**. Press Escape to cancel. The **Use nearby clearing** option finds a suitable site automatically if you prefer.

The wooden stockpile is a physical, clickable 3D structure containing stacks of timber, stone, baskets and vines, plus a marker showing the settlement's initial **24-meter building radius**. The village's five starter building plots are positioned relative to its center. In this first pass the template moves as a group; arbitrarily rotating or placing each hut will be a separate future construction milestone.

### Stockpile storage

Personal inventory stays at **10 slots with 12 items per stack**. This is the character's carrying capacity, not the village's permanent stores.

Stockpile storage holds **480 individual items across wood, stone, wild berries and vines**. Those are simple count totals without individual stack slots for now. You must return within 5 meters of the physical Stockpile to transfer goods. Clicking the stockpile in the 3D world or **Walk to stockpile** in Village guides the character back to the site. Once close enough, Village offers **Deposit all**, **Deposit 12**, and **Take 12** for each supported item. Transfers respect the stockpile's free capacity and the ten-slot personal backpack; neither duplicates nor loses items.

### Construction and ownership

Village construction is no longer paid using material carried in the personal Pack. It uses wood and stone deposited into the **stockpile**. The five initial building templates are:

| Building | Village cost | Effect |
|---|---:|---|
| Family Hut ×2 | 10 wood + 6 stone each | +3 population capacity per hut |
| Cooking Hearth | 6 wood + 5 stone | Cooking station foundation; recipes later |
| Toolmaker's Shelter | 12 wood + 8 stone | Technology research foundation; effects later |
| Council Lodge | 14 wood + 8 stone | Culture gathering foundation; effects later |

Technology and civic prerequisites still apply. Personal **axe crafting and technology/civic research** continue using the backpack, not the village stockpile, until those systems receive their own workshop interface.

Building previews/selection are still the original five blueprint plots, relocated around the Stockpile; a building site blocked by trees or rocks must be cleared through normal harvesting. Builders must approach a site before constructing, and completed structures retain their old population capacity rules.

### Saved villages

The same `epoch.stoneage.v1` local save key is retained. New players have no Stockpile; placing it commits its 2-meter-grid coordinates and stored item totals. Players whose existing saves already contain built village structures receive a **free legacy Stockpile at (-2, -8)** so all their original buildings keep exactly the same positions. Their already carried resources remain in their personal inventory; nothing is deposited or spent automatically. Save/reload and descendants preserve the Stockpile and its contents.

If the game is reset, all structures, inventory, stockpile and forest progress reset as before.

### Modules

- `js/stockpile.js`: pure storage, deposits, withdrawals, grid snapping, placement checks, territory range
- `js/stockpile-world.js`: physical 3D stockpile, visible stored item piles, ground placement preview, territory ring
- `js/settlement.js`: starter blueprint locations relative to founded home
- `js/state.js`: stockpile migration, founding, transfers and construction spending
- `js/village-world.js`: move blueprint markers and buildings with saved settlement center
- `js/world.js`: ground placement, returning-home pathfinding, site clearance and camp/NPC relocation
- `js/village-ui.js`: village interface, founding, storage operations, building selection
- `tests/check-stockpile.mjs`: founding, 2-meter grid, material transfers, persistence and building payments
- `tests/browser-walk.mjs`: browser checks for founding, returning, deposited items and a Family Hut made from stockpiled materials

### Future upgrades

More storage tiers, individual building placement with rotation and valid-footprint checks, hauling jobs for villagers, resource reservation for construction, storage pit upgrades, and multiple settlement centers are intentionally **not included** yet. Only one primary Stockpile can be founded in the current single-village prototype.

## Free 2-meter village building grid (November 2026)

The five original preselected building plots were removed from the world. Placing the first Stockpile does **not** spawn yellow rings, stakes or building labels in the forest.

**Stockpile founding:** In the Village tab, choose *Choose stockpile location*. A transparent footprint previews the placement without immediately founding it. Move it by clicking an open terrain position, clicking the on-screen arrow pad, or pressing the keyboard arrow keys (2-meter increments). Press **Confirm Placement** or Enter only when the footprint is valid; Escape cancels. The shortcut *Found at nearby clearing* can still establish a stockpile immediately when desired.

**Free construction:** After founding, the Village tab lists Family Hut, Cooking Hearth, Toolmaker's Shelter and Council Lodge. Select a building to enter construction mode and see a temporary 2-meter grid centered on the Stockpile's 24-meter village radius. One translucent footprint shows the pending structure; move it with mouse or arrow controls and rotate with **R** or the rotate button. Valid footprints are green, and blocked terrain is red with a reason. Confirm only when the site and stored materials are valid. The grid and preview disappear after placement or cancellation.

Building site validation rejects overlapping finished buildings, stockpile clearance, trees, stone, steep ground, and areas outside village territory. Buildings consume the same stockpiled costs and tech/culture requirements. Multiple Family Huts can be placed independently, with each adding +3 population capacity; the special Cooking Hearth, Toolmaker's Shelter and Council Lodge are one per village for now.

**Save migration:** Existing completed structures from the former five-plot village are migrated into records with their exact old world coordinates and saved rotations. Empty old sites are not recreated. Newly placed structures are persisted as `village.buildings` entries containing individual stable IDs, types, world coordinates and quarter-turn orientations. Existing stockpiles, stored materials, family populations and discoveries remain unchanged.

Future iterations may allow relocating already-built structures with a demolition/move cost, custom roads, additional storages and expanded village zones. This pass lets players decide where every *new* building is built, but existing finished buildings remain permanent.
