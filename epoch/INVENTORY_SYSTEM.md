# Epoch — Starting Inventory v1

## Gameplay rules

The unmodified starting character has exactly **10 inventory slots**. The first four resource types are all stackable to **12 per slot**:

| Item | Source | Stack | Notes |
|---|---|---:|---|
| Wood | Trees | 12 | Existing woodcutting skill; +2 wood per interaction without an axe and +3 with a stone axe |
| Stone | Stone deposits | 12 | +2 stone per interaction |
| Wild Berries | Berry bushes | 12 | +2 berries per interaction; counts as Food for the existing Technology/Culture requirements |
| Vines | Trees and berry bushes | 12 | +1 vine bonus when harvesting wood or berries, if the pack has room |

A 13th item does not increase a 12-item stack. It creates another slot containing 1 item; multiple partial stacks are filled before allocating another slot. Inventory is an ordered array of 10 item stacks, or `null` for empty spots. A full pack cannot accept new resources unless some matching existing stack still has room. Gathering requires at least one unit of the primary resource to fit; if the pack is full, no primary item, bonus vines, experience or culture is awarded.

Every tech unlock, civic unlock, stone axe and village building **consumes materials from the actual inventory**. The `resources.food` property remains a derived compatibility alias of Wild Berries so the existing research and construction costs work as before. Wood, Stone and Vines are likewise derived counts. The slot contents are the authoritative state: the game never runs a separate infinite wallet.

## Pack interface

The Pack tab contains a **5 × 2 grid** of item slots with icons, stack counts, item descriptions and total carried item amounts. Click an occupied slot to inspect it. The selected stack can be discarded after explicit confirmation, to free space when the pack is full. Later storage/backpack upgrades may increase the 10-slot limit, but none exist in this update.

## Save migration and descendants

The original save key (`epoch.stoneage.v1`) and saved forest seed, skills, villagers and village structures are retained. Players who gathered materials under the previous unrestricted counter system may already own more than the new ten-slot backpack can hold. Those old quantities are **not deleted**. They are packed up to the available 10 × 12 capacity, and all excess goes into a separate one-time **unpacked legacy supplies** recovery record. This is only to preserve previous player progress; it is not an ordinary bank, and those supplies cannot be spent or used for crafting until they are manually retrieved into free or partially filled inventory slots.

The Pack tab shows the exact unclaimed supplies and a **Retrieve available supplies** button. Amounts and the inventory remain saved across refreshes and descendants. Resetting the game deliberately resets both.

## Technology and next milestones

This change only establishes the core inventory rules. It does not introduce raw meat, hunting drops, clothing, equipment slots, tool durability, backpacks, trade or permanent village storage. Those should be added on top of this item system. A natural next milestone would be a Storage Pit building that increases *village storage* without changing what one character can personally carry.

## Technical modules

- `js/inventory.js`: item definitions, stacks, insertion, consumption, legacy migration and recovery
- `js/state.js`: inventory-backed gathering, resource costs, save/descendant persistence
- `js/inventory-ui.js`: 10-slot interactive pack, selection, discard and legacy retrieval
- `js/ui.js`: Pack tab integration
- `tests/check-inventory.mjs`: quantity and stack boundaries, fullness, migration and persistence
- `tests/check-settlement.mjs`: village construction remains affordable under a finite pack
- `tests/browser-walk.mjs`: actual UI and browser-tested spending and save behavior
