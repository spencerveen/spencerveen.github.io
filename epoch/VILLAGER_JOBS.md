# Phase 6A — The Living Village: Jobs

Residents recruited from wilderness tribes (or migrated from legacy villages)
can be assigned one of five professions in **Village → People → View profile**.
Assignments are stored with each individual's age, home and story and survive
save/reload and leadership succession.

| Job | Work site | Supplies added to village stockpile |
| --- | --- | --- |
| Woodcutter | Seeded living trees | Wood |
| Stone Gatherer | Finite stone deposits | Stone |
| Forager | Berry bushes | Berries |
| Hunter | Wild deer and rabbits | Meat, fur and hide from existing loot tables |
| Fisher | Real fish nodes near traversable shorelines | Raw fish meat |
| Unassigned | Home | None |

## What the first pass does

- The world selects nearby, unreserved resource targets within 56 meters of
  the village stockpile, using existing chunk-loaded nodes.
- A worker walks from their current position to a work site, spends a few
  seconds working, and walks back to the stockpile before receiving credit.
- On arrival, a single state transaction checks the **current** resource status,
  stockpile capacity, and job assignment before consuming the node/catch or
  wildlife record and crediting the appropriate stored materials.
- Two workers cannot simultaneously reserve the same target, and player
  gathering while a villager travels cannot duplicate resources.
- Trees and stone stay depleted; berries follow existing regrowth; fish and
  harvested wildlife retain the same permanent world-state flags.
- Workers do not use the player's backpack or grant the player skill XP.
- Reloading mid-trip simply resets an unfinished trip, without deleting any
  resources or crediting a fake delivery.
- Work pauses when the player travels beyond the loaded village area, so this
  initial implementation does not create or simulate distant chunks.
- Unassigning a villager sends them toward their home. Saved housing changes
  still update the NPC's home location.

## Phase 6B: Real resource transportation (implemented)

- Materials now leave their source **when gathered**, not on arrival.
- Every resident has a saved eight-item cargo manifest and a last known work
  position. Incomplete trips survive reloading without duping resources.
- A low-poly bundle/basket on the villager's back visibly changes with its
  materials (timber, stone, berries, fish or hunting supplies).
- Workers seek dry, collision-free paths and make bounded A* detours around
  rocks, trees, buildings and water. They never teleport across rivers.
- Distinct stockpile receiving spots help reduce crowding. A villager deposits
  when it physically reaches the village; partial space means partial delivery.
  The rest of the load remains held until storage has room.
- Reassignments, founder succession, and natural aging preserve or settle
  outstanding loads rather than duplicating saved cargo.
- Village Storage separately shows materials on hand versus in transit.
  People and individual profiles display current work activity and load.
- Workers still operate only while the home village is in the streamed area.
  Pathfinding is local and never generates unloaded terrain.

Phase 6C will introduce daily schedules, meals, rest and seasonal needs.
Phase 6D can bring carts, specialist hauling/storage buildings, additional
stockpiles, production efficiency, advanced tools and more complex logistics.

Automated checks: `tests/check-villager-jobs.mjs`,
`tests/check-villager-hauling.mjs`, `tests/browser-villager-jobs.mjs`,
and `tests/browser-villager-hauling.mjs`.
