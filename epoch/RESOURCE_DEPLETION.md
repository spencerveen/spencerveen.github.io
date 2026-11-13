# Epoch — Persistent Resource Depletion

Epoch's procedural forest now contains **finite, individually tracked resources**. Every resource has a deterministic ID derived from its world coordinates and type. A world seed alone regenerates the *original* forest; a sparse map of modifications in `epoch.stoneage.v1` determines what has been harvested, felled, chopped, or mined.

## First Stone Age balance

| World node | Starting supply | Harvest | When emptied |
|---|---:|---|---|
| Tree | 12 wood | 2 wood/hit, 3 with stone axe; also 1 vine if room | Fells (disappears); does not regrow automatically |
| Stone deposit | 12 stone | 2 stone/hit | Disappears; never regenerates naturally |
| Berry bush | 8 berries | 2 berries/pick; also 1 vine if room | Leaves stay; berries disappear until 2-minute regrowth |
| Berry bush, chopped | Same bush | **Shift+click**, **Shift+E** nearby, or **Chop nearby berry bush** in Pack | Gives 3 vines at once and permanently removes the entire bush |

These numbers are intentionally simple tuning values, not fixed long-term balance. Berry regrowth is currently based on elapsed real time (120 seconds), including while the game is closed or the chunk is unloaded.

Chopping a bush requires room in the ten-slot inventory for **all 3 vines**. A full pack never destroys a resource without awarding its material. Regular harvesting may add a *partial* amount when inventory space is limited, and only that amount is deducted from the resource's remaining durability. No XP is granted for unsuccessful/full-pack harvests.

## Gameplay controls

- Left-click or E near a tree, rock or bush: gather from that specific resource
- Shift+left-click a berry bush: cut it for vines instead of picking berries
- Shift+E while near a berry bush: same cut action
- Pack tab: **Chop nearby berry bush**, an alternative control for touch/keyboard access
- Remaining resources appear in the harvest feedback (e.g. 8/12 left); messages explain exhaustion and berry regrowth

Felled trees, exhausted rocks and chopped bushes are removed from the Babylon scene and collision/pathfinding data. Empty berry bushes keep their leaves but hide the red berry meshes. The fruit meshes return when the timer expires.

## Save compatibility

The existing save key, character, village, inventory, world seed and descendants are preserved. Older saves start with an empty `resourceNodes` map, meaning the forest is initially untouched; there is no need to reset a character or change the world seed.

Each interaction modifies only the resource entry for that particular object, for example:

```js
resourceNodes["wood:400:400"]={remaining:6,removed:false,regrowAt:0};
resourceNodes["stone:1100:200"]={remaining:0,removed:true,regrowAt:0};
resourceNodes["food:600:-400"]={remaining:0,removed:false,regrowAt:1794600120000};
```

These values are illustrative. Objects outside the loaded chunks remain implicit; they materialize only when the player explores that area. When a chunk reloads, removed objects are skipped and depleted berry bushes are rendered without fruit. This prevents a player from walking away and returning to reset a mined deposit.

## Implementation

- `js/resource-nodes.js`: immutable yield settings, node status, regrowth timestamps and persistence helpers
- `js/harvest.js`: atomic inventory-aware resource harvesting and bush cutting
- `js/state.js`: save migration and access to persistent resource node data
- `js/forest-chunks.js`: skip removed nodes on load, dispose depleted meshes, restore berry visuals
- `js/world.js`: interactive selection, player approach, Shift actions, gathering feedback and visibility changes
- `js/inventory-ui.js`: player-facing bush cutting and help text
- `tests/check-resource-nodes.mjs`: depletion, timer, full inventory, descendant and save regression tests
- `tests/browser-walk.mjs`: browser check for removed forest meshes across reload and unaffected game systems

## Future evolution

Future farming and forestry may provide planting, tree regrowth and berry cultivation. Animal grazing/berry yields, rock quarries, stumps, logging animations, accurate environmental changes and persistent mining scars can build on these resource IDs. **Stone currently has no natural regeneration.** A distant-future replicator might create stone in an industrial system, but does not affect this Stone Age world.
