# Epoch — Settlement Management (Phase 6D UI)

The dedicated, responsive Settlement Management screen replaces repeated
click-through to the stockpile and individual villager profiles for routine
village administration.

**Open from anywhere:** press **V**, click the **Settlement** button beside
Inventory and Skills, or use **Open Settlement Management** on the old
stockpile interface. It is also accessible through the game menu. The screen
is a full-size dashboard on desktop and a vertical, touch-friendly page on
mobile.

**Time pauses** while the manager is open. Opening the manager does not
advance the 24-hour clock, drain NPC hunger or energy, or skip a work shift.

## Sections

### Overview
View population, occupied/available beds, active workers, ready-to-eat
stockpile food, starving or tired residents, storage usage, items in transit,
worker distribution, and critical supply/housing warnings. Jump to any
management section or start placing a new building.

### People & Jobs
Manage the entire resident roster in one place:
- Direct drop-down for each villager's current job, including Unassigned,
  Woodcutter, Stone Gatherer, Forager, Hunter and Fisher.
- Direct drop-down for assigned homes. Full homes are visibly unavailable
  unless they are the villager's existing home; no move exceeds housing
  capacity or discards personal cargo.
- Search by name, occupation or housing location.
- Filters for all villagers, assigned workers and residents who need attention.
- Energy, hunger, age, housing and live work-status summaries.
- Detailed resident profile with a **Back to People & Jobs** link.

Job changes and household moves use the existing GameState transactions;
changes persist immediately. An NPC carrying gathered resources still
delivers their cargo under the original hauling rules.

### Development
Manage the stockpile and every constructed building centrally. The page
displays actual levels, material requirements, shortage counts, benefits and
purchase buttons. Administrative upgrade orders can be made **remotely**,
as long as the village exists and the stockpile holds the delivered materials.
They still use the original atomic purchase validation and reject repeated
purchases, missing structures or insufficient stored resources.

The manager provides a **Place new building** link; placement remains a
physical action in the 3D world, with all existing dry-land, radius and
collision requirements. Opening a constructed building still provides
its original technology/culture/hut/cooking context as appropriate.

### Supplies
Review ready-to-eat meals, villagers needing food, total storage occupancy,
per-item counts, backpack quantities and workers' carried cargo. Physically
transferring items remains limited to **5 metres from the actual stockpile**.
When far away, transfer actions are disabled and a **Locate stockpile**
control returns to the world and frames the destination.

## Compatibility and controls
- The old stockpile tabs remain functional; the new screen provides a much
  faster path for administrative actions, not a destructive rewrite.
- All existing browser-local save slots, worlds, residents, cargo, jobs, huts,
  upgrades, and food remain unchanged.
- Esc closes the manager. The V key toggles it unless a text/select field
  is focused. The page is keyboard accessible and supports phone-sized
  viewports without replacing the full game layout.
- The manager uses the existing modal input lock and automatic clock pause;
  jobs resume when the screen closes.
- Descriptions and names are HTML-escaped. Material costs are shown directly
  from the authoritative inventory/upgrade definitions.

Implementation:
`js/settlement-management.js`, `js/ui.js`, `js/state.js`,
`js/village-ui.js`, `index.html`, `styles.css`.

Regression checks:
`tests/check-settlement-management.mjs` and
`tests/browser-settlement-management.mjs`, plus the existing
village development, gathering, hauling, food and clock QA.
