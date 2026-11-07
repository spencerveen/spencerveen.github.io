# Emberforge architecture

Emberforge is a static browser game served from GitHub Pages. All progression
is calculated by the game iframe. Its surrounding site and visual skins should
**never** independently calculate damage, experience, rewards, or saves.

## Modules

- `game.html`: original game DOM and script load order
- `data/`: item, realm, monster, illustration, and other game data
- `systems/combat.js`: combat, loot, target selection, combat messages
- `core/loop.js`: engine update loop and `window.EmberforgeGame` public API
- `core/storage.js`: local save loading, migrations, and persistence
- `ui/views.js`: original engine-owned UI and interactions
- `index.html`: outer site and iframe mounting
- `emberforge-hud.js`, `emberforge-forge.js`, `emberforge-battle.js`:
  presentation layers that preserve underlying engine controls and state
- `emberforge-*.css`, `styles/game.css`: presentation styles

## Safe integration rules

1. Use the `EmberforgeGame` API for actions where available (stage selection,
   auto attack, strike, and healing). Do not add another combat timer.
2. Do not remove or rename engine DOM IDs without updating all dependent code.
3. Hide obsolete boss instructions only via `#ef4-combattip` and
   `#ef4-bosslootnote`. These nodes must remain present because the engine
   continues writing into them.
4. Floating damage uses `.floatpop` in the native battle scene; keep the
   scene visible above its surrounding art layers.
5. Route battle notifications to the in-arena event log. Do not hide arbitrary
   `div` or `span` elements based on their text.
6. Protect `core/storage.js` migrations and the current localStorage save key.
   Never clear or reset player data during a visual change.
7. Bump the appropriate `?v=` cache parameter in HTML when changing a served
   JavaScript or CSS file.
8. Run the contract suite and the browser smoke test after combat or UI changes.

## Artwork storage and loading

All original illustrations now live in independently cacheable WebP files
instead of inline base64 image strings. Art is organized by purpose:

- `art/monsters/realm-<1-6>-stage-<1-9>.webp`: 54 monster portraits
- `art/kingdom/vista-<0-5>.webp`: six evolving kingdom scenes
- `art/icons/<name>.webp`: 52 original HUD, worker and monster icons
- `art/realm-*.webp`, `art/boss-0.webp`, `art/forge-0.webp`: existing background sheets

`data/monster-portraits.js` and `data/kingdom-vistas.js` remain lightweight
lookup tables so the engine keeps its original `MONSTER_PORTRAITS[realm][stage]`,
`KINGDOM_VISTAS[index]`, and `ICON_DATA[name]` interfaces. This greatly
reduces JavaScript payload and defers actual image downloads until used.
Hunt thumbnails are lazy-loaded; active enemy art loads eagerly.
When altering backgrounds, compare the complete asset URL rather than its
string length; different files can have equal-length paths.

Keep the indexed image contracts stable for existing combat, kingdom and
Mastery rendering. `tests/artwork-assets.test.cjs` validates all 112 files,
path mappings, lazy-loading behavior and background cache updates.

## Worker economy and future tiers

Worker definitions live in `data/catalogs.js`. Each entry uses
`[id, name, icon, startingCost, payoutPerWorker, description, intervalSeconds]`.
An omitted or `1`-second interval earns continuously; intervals above 1
grant discrete Ember batches after the timer completes. The Workforce screen
shows both each payout and its average Ember/sec for comparison.

The purchase growth constant (`WORKER_PRICE_GROWTH`, currently `1.33`),
cumulative +1% milestones at 10, 25, 50, 100, then at every doubling
(200, 400, 800, 1,600, ...), and batch accounting all live in
`systems/combat.js`. `accrueWorkerEarnings` handles both active and
half-rate offline earnings; never add `gain(income() * dt)` alongside it,
or timed workers will earn twice. Timer progress is saved in
`s.workerTimers` and resets on Ascension. New worker types can be appended
to the catalog with their own payout intervals and unlock tiers in
`GATE_WORKERS` in `data/definitions.js`.

Triumphs tracks a separate permanent per-worker Mastery achievement at 1,000 
lifetime hires across Ascensions, using `s.workerLifetimeHires`. Once earned, 
its progress bar disappears, but the per-run output bonus keeps scaling. 
Existing saves migrate current worker ownership as the initial known lifetime 
hire count; earlier Ascension runs cannot be reconstructed retroactively.

## Runtime optimization notes

The HUD updates frequently, so `writeStatusText()` skips unchanged text
instead of repeatedly notifying UI observers. `updateHuntBoard()` updates
only while the World is visible, rebuilds stage buttons only when their
contents change, and limits the display-only safe-target forecast to
roughly once per second. The combat AI still calculates farming decisions
independently when needed. Worker income and batch payout calculations share
one production multiplier per evaluation.

Avatar-name typing is kept in memory and saved on blur, autosave, or page exit.
Avoid adding expensive DOM updates or save writes to per-frame callbacks.

## Checks

`node --test emberforge/tests/*.test.cjs`

The GitHub Actions workflow runs these checks on changes. Additional manual
browser steps are documented in `tests/SMOKE-TEST.md`.
