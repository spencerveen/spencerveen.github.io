# Epoch — Phase 6D: Village Development

Epoch now supports material-funded, **one-time level-two upgrades** for the
stockpile and each constructed village building. All effects are derived from
saved structure levels, not decorative UI flags. Upgrades require the founder
to stand by the village stockpile (within 5m) and spend **delivered** supplies
only; goods still carried by villagers or held in the founder's backpack
cannot be spent until deposited.

Open **Village Stockpile → Buildings**, inspect the displayed costs and
benefits, then choose **Improve**. The Storage screen links directly to this
section. Once purchased, a structure is marked **Level 2 / 2**, and the
button disappears. Already-built structures in older saves safely start at
Level 1 without resetting locations, resident assignments, stockpile items,
or character ages.

## Level-two improvements

| Building | Upgrade | Materials | Actual gameplay effect |
| --- | --- | --- | --- |
| Stockpile | Raised Granary | 18 Wood, 12 Stone, 4 Vines | Total item capacity increases from 480 to 720. Worker deliveries and player deposits use the larger limit. |
| Individual Hut | Extended Sleeping Hut | 12 Wood, 8 Stone, 3 Vines | Adds two beds to this particular hut (3 to 5); village recruitment capacity and household assignments use those beds. |
| Cooking Hearth | Improved Cooking Hearth | 8 Wood, 10 Stone, 2 Vines | Each recipe yields one additional edible serving from the **same actual ingredient cost** (roasted meat 2 to 3; berry-roasted meat 1 to 2; fish 2 to 3). Inventory space is validated before the ingredients are consumed. |
| Toolmaker's Shelter | Toolmaker's Workshop | 14 Wood, 12 Stone, 1 Flint | Villagers complete their actual harvesting actions 20% faster (3.5 to 2.8 seconds for woodcutters); the Toolmaker's passive Knowledge production becomes 1.5× the normal rate. |
| Council Lodge | Elders' Council | 16 Wood, 12 Stone, 4 Vines | Generates +2 Culture each in-game year when the saved calendar rolls over. |

A built improvement adds a visible architectural detail: huts gain an
alcove/awning, hearths gain stone windbreaks, workshops receive tool racks,
council lodges display banners, and the improved stockpile gains raised
granary racks. These additions don't alter the player's collision, mouse
selection, or resource nodes.

## Save and simulation integrity

- Each saved building retains an integer `level` (1 or 2); the stockpile
  similarly keeps `level` while preserving its exact coordinates and items.
- No upgrade appears without the correct constructed building; no free
  Cooking Hearth or Council Lodge is created by the upgrade system.
- Upgrades are purchased in a single transaction with validated materials.
  Repeated clicks, missing materials, distant requests and missing building
  IDs cannot charge resources.
- Extra meals are created through the normal transactional crafting code,
  not by granting resources directly to the stockpile.
- No imaginary work is performed while the village is unloaded: the workshop
  only reduces the *real*, physically observed collection timer. Faster
  Knowledge production uses the pre-existing active-time research system.
- Council Culture accrues precisely on the in-game year's rollover, not once
  per frame or per reload.
- Workers, food, day/night cycles, and historical character progress are
  preserved on old save files.

## Next potential milestones

6D can be extended with a true village prosperity score, different worker
assignments based on professions, upgraded village architecture, more building
levels, construction tasks that villagers perform physically, farming and
food-production upgrades, and future-age progression.

Automated tests:
`tests/check-village-development.mjs` and
`tests/browser-village-development.mjs`, alongside the existing resident,
cooking, gathering, storage and save regression suite.
