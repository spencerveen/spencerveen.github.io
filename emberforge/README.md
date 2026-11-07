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

## Artwork follow-up

Realm, boss, and forge background sheets now live in `art/*.webp`,
referenced by small `data/*backgrounds.js` files. These eight WebP assets
can be cached independently of JavaScript and fetched when a scene uses them.

Monster portraits and kingdom vistas still contain larger inline image datasets.
Converting those safely requires handling the large source files, preserving
their indexed asset contracts, and verifying browser rendering. Keep their
script order and existing scene dependencies unchanged until then.

## Worker economy and future tiers

Worker definitions live in `data/catalogs.js`. Each entry uses
`[id, name, icon, startingCost, payoutPerWorker, description, intervalSeconds]`.
An omitted or `1`-second interval earns continuously; intervals above 1
grant discrete Ember batches after the timer completes. The Workforce screen
shows both each payout and its average Ember/sec for comparison.

The purchase growth constant (`WORKER_PRICE_GROWTH`, currently `1.33`),
cumulative +1%-per-threshold milestones, and batch accounting all live in
`systems/combat.js`. `accrueWorkerEarnings` handles both active and
half-rate offline earnings; never add `gain(income() * dt)` alongside it,
or timed workers will earn twice. Timer progress is saved in
`s.workerTimers` and resets on Ascension. New worker types can be appended
to the catalog with their own payout intervals and unlock tiers in
`GATE_WORKERS` in `data/definitions.js`.

## Checks

`node --test emberforge/tests/*.test.cjs`

The GitHub Actions workflow runs these checks on changes. Additional manual
browser steps are documented in `tests/SMOKE-TEST.md`.
