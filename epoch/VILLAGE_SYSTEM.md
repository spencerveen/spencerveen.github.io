# Epoch — Stone Age Village

Village activities are tied to physical structures. **Inventory** and **Skills** are the only global gameplay tabs. Start through the **Establish camp** objective; after founding, click the stockpile for the village's **Storage / Build / Buildings** sections.

## Founding and storage

The first stockpile is free. Choose clear, sufficiently level ground using its preview, or use the nearby-clearing option. Click terrain to pin the preview, adjust it on the 2-meter grid, and confirm. The stockpile becomes the village center and holds **480 individual items**, separately from the character's 10-slot Inventory.

Clicking the stockpile approaches it and opens village storage when in range. Transfers require the player to be within **5 meters**. Deposit all carried materials or transfer up to 12 of a resource at a time, limited by available supplies and capacity. The panel distinguishes stored and carried quantities and updates transfer availability when interaction range changes.

All buildings spend **village storage** materials. Research, traditions, and personal crafting use **carried Inventory** materials instead. Withdraw supplies when needed for those activities.

## Buildings and activities

| Building | Stored material cost | Research gate | Current activity or effect |
|---|---|---|---|
| Family Hut | 10 wood / 6 stone | None | Opens Dynasty; +3 housing capacity per hut |
| Toolmaker's Shelter | 12 wood / 8 stone | None | Opens Technology research |
| Council Lodge | 14 wood / 8 stone | None | Opens Culture and traditions |
| Cooking Hearth | 6 wood / 5 stone | Control of Fire | Visible fire and hearth information; recipes later |

Toolmaker's Shelter and Council Lodge can be built **before any research or traditions**. Their interfaces provide access to those systems, so requiring their own discoveries first would block progression. A village may have multiple Family Huts, but only one shelter, lodge, and hearth.

Click a completed Toolmaker's Shelter, Council Lodge, or Family Hut in the world to open its activity. The stockpile's **Buildings** section also lists completed structures and opens their corresponding activities. Objective actions help locate the next relevant building. A Cooking Hearth opens its information panel; Control of Fire alone does not create a free campfire.

Names are evocative game terminology. The prototype has not been assigned a specific archaeological tradition or historical region.

## Free-grid construction

1. Click the stockpile, then open **Build**.
2. Select a blueprint. Costs show current stored quantities, required amounts, and shortages.
3. Click ground to pin the preview. Use arrow keys or on-screen arrows for 2-meter adjustments; use **R** or Rotate for 90-degree turns. Arrow adjustments and rotation also pin the preview. Camera rotation does not change its chosen position.
4. Use **Confirm placement** or Enter when the site and supplies are valid. Escape cancels placement. Closing the panel or switching to a personal interface also cancels placement.

The whole footprint must fit within the stockpile's **24-meter village radius**. Nearby buildings, the stockpile, trees, rocks, and steep terrain restrict placement. Only completed structures remain in the world; there are no preset empty plot circles. Construction spends stored supplies and grants Construction XP.

Finished structures save independent IDs, kinds, coordinates, and quarter-turn rotations. Current controls place new structures; moving, rotating, or demolishing existing buildings, relocating a founded stockpile, and a general village edit mode are not implemented.

## Housing and succession

The player and four existing villagers start at **5 / 5** capacity. Each Family Hut adds **3** maximum resident spaces: one hut gives 5 / 8, two give 5 / 11. Extra capacity does not automatically spawn settlers. Household assignment, population growth, food consumption, and worker jobs are future systems.

Click a Family Hut to view Dynasty and the family chronicle. **Plan succession** first opens a confirmation dialog explaining that control passes to an 18-year-old descendant and the calendar advances 24 years. Personal skill XP retention is 8%, or 15% with Oral Tradition, or 25% with Apprenticeship. Buildings, stored and carried supplies, discoveries, traditions, and saved resource changes persist.

The always-available game menu provides Save, Help, and Save & return to title. These actions are separate from Dynasty.

## Persistence and migration

Three local save slots store the village with the rest of its world. The old `epoch.stoneage.v1` save is preserved as a one-time migration source. Older completed plot-based buildings convert to individual building records and retain their locations; an old built village without storage receives a home stockpile. Original plot IDs exist only for compatibility, not as new-game construction sites.

Depleted trees, exhausted stone, and cleared bushes remain removed across reloads and descendants. Empty berry bushes retain their plant and regrow fruit after two minutes. Existing inventory overflow remains recoverable rather than being discarded.

## Planned extensions

Cooking recipes, automated workshop/research or Culture production, growing populations, household jobs, roads, fences, decorative variants, additional storage buildings, and editing completed layouts are future work. The present update changes how existing activities are reached and how their panels work; it does not add those simulations.

## Source and verification

- `js/settlement.js`: building definitions, costs, housing, and legacy plot IDs.
- `js/state.js`: construction spending, research/civic eligibility, succession, and save migration.
- `js/village-placement.js`: grid snapping, territory, slope, and overlap checks.
- `js/village-world.js` / `js/stockpile-world.js`: world models, interaction metadata, and previews.
- `js/world.js`: picking, stockpile approach, input handling, and pinned placement.
- `js/village-ui.js` / `js/ui.js`: contextual activities, objective guidance, and dialogs.
- `tests/check-contextual-ui.mjs`, `check-village-grid.mjs`, `check-stockpile.mjs`, and `check-settlement.mjs`: state and compatibility checks.
- `tests/browser-contextual-ui.mjs` / `tests/browser-walk.mjs`: browser interaction and responsive-layout checks.
