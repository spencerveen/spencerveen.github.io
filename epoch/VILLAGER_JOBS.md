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

## Planned follow-ups

Phase 6B can add persistent personal cargo, dedicated hauling routes,
better navigation around major rivers, and multi-stockpile logistics. Phase 6C
will add daily needs, work shifts, food consumption and sleep. Phase 6D can
introduce work speed, equipment prerequisites and specialized village buildings.

Automated checks: `tests/check-villager-jobs.mjs` and
`tests/browser-villager-jobs.mjs`.
