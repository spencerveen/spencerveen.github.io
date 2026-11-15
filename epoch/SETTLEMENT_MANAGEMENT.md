# Epoch — Council Lodge management (Phase 6D)

The **Council Lodge** is the Stone Age civic center, and the home of
tribal administration. The former global V shortcut and Settlement
toolbar button have been removed. **Build a Council Lodge through the
stockpile, then click the actual 3D building** to convene your council.
If no Lodge exists, the full people-management panel is not available.

## Council Lodge

The existing saved `kind: "council"` building is reused, without moving,
deleting or reconstructing older villages. Its stable building ID and
`level` survive save/reload, so we can introduce more advanced council
structures in future ages without migrating villager identities,
culture discoveries or home assignments.

The first two stages are:
- **Level 1: Council Lodge** (Stone Age). Unlocks the management interface,
  with no additional unlock beyond constructing the original building.
- **Level 2: Elders' Council** (Stone Age). Built using 16 Wood, 12 Stone,
  and 4 Vines from actual village storage. Grants +2 Culture each in-game
  year. Adds the existing ceremonial banner visuals. The management panel
  remains available, with the evolved civic title.

Future eras can append more stages to `js/council-evolution.js` and provide
additional technology/civic requirements. Later-age stages are **not yet
implemented**.

### Council sections

**Overview:** Current leader, population and available beds, assigned
workers, food shortages, available Culture, and succession warnings.
Quick navigation opens the council's other functions.

**People & Jobs:** Search or filter the full villager roster; assign jobs,
change housing with capacity protection, inspect energy/hunger/cargo and
directly designate or clear a successor. If existing campers can fit into
constructed Huts, **Move campers into Huts** assigns all available beds in
one action without disturbing residents already housed. New unassigned
arrivals prefer available Hut beds; saved explicit camp assignments persist.
This uses the original saved GameState job/home/succession actions, so no
workers, cargo, homes or memories are recreated. Time pauses during
administration.

**Traditions & Leadership:** Inspect the current civic stage and its
upgrade materials, view the chosen successor and recent tribal history,
and open the **original Culture tree** to research civic advancements.
The Culture panel includes a **Return to Council Lodge** action.

## Other buildings keep their own roles

- **Stockpile:** Village founding; raw supplies and cooked food storage;
  deposits and withdrawals (only while physically nearby); tool crafting;
  building placement and structure upgrades. No duplicate people tab.
  An existing stockpile link can locate the Council Lodge in the world.
- **Huts:** Household occupancy, beds and resident profiles.
- **Toolmaker's Shelter:** Technology research and equipment development.
- **Cooking Hearth:** Food preparation, cooking yields and cooking upgrades.
- **Council Lodge:** Tribal administration, jobs, housing assignments,
  succession and Culture.

The game menu still provides save/load/controls, but no remote shortcut
for tribal administration.

## Saving and compatibility

All prior save slots are retained. Existing Council Lodges immediately
unlock the management screen; no second Lodge is spawned. A user without
a Council Lodge must build one with the normal Stone Age materials.

The simulation's year clock, aging, food, fatigue, movement, delivery and
career systems have not been replaced. Pausing while the Lodge is open
prevents an unintentional aging or resource drain during management.

Files: `js/council-evolution.js`,
`js/settlement-management.js`, `js/ui.js`, `js/village-ui.js`,
`js/settlement.js`, `index.html`, and `styles.css`.
Regression tests cover the built-only interface, direct jobs/home moves,
succession, Culture tree, level-two upgrades, HUD shortcut removal,
phone layout and save persistence.
