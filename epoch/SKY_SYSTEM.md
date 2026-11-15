# Epoch Sky & Atmosphere — Phase 6C.1A–C

## Shipped

Epoch uses **two optimized, local CC0 pure-sky panoramas** as a photographic
360° background. The assets are converted from the official Poly Haven HDRIs
to 2K × 1K equirectangular WebP (`assets/sky/day.webp` and
`assets/sky/night.webp`). The respective downloads, authors, and license
are documented in [assets/sky/SOURCES.md](assets/sky/SOURCES.md).

The source downloader and optimizer are
`scripts/build-sky-assets.py`, invoked by
`.github/workflows/epoch-sky-assets.yml`. **Epoch does not download any
Poly Haven assets during gameplay**. If the local image files cannot be loaded,
the fragment shader shows a simple color gradient instead.

The browser renderer is `js/sky-atmosphere.js`. It creates exactly one
non-pickable, inward-facing sphere centered on the camera, with two texture
samplers in a minimal equirectangular shader. Both textures are loaded once
per game session. Switching sky preview modes only changes shader uniforms,
environment color, light intensities, and fog; no terrain regeneration or
new sky mesh is required.

To test, start or continue a game and click the **Day / Night** button in the
top header. This is intentionally a *preview*; it does not move the calendar,
change a villager's routine, or save a permanent time-of-day.

## Lighting integration

- Day uses the existing warm directional sun and ambient hemisphere.
- Night darkens both, changes the directional light to a cold moonlike fill,
  and shifts sky, fog, and water colors.
- The custom terrain shader has a `skyBrightness` uniform and is updated
  explicitly with fog and night brightness; it does not read Babylon light
  intensities automatically.
- The fixed moon and sun pictured in these photographic panoramas will not
  move until a future sky system uses moving or separate celestial bodies.
- Preview states are static. They do not fade automatically yet.

## Phase 6C.1C — Smooth sunrise and sunset (implemented)

The same top-bar **Day / Night** button now starts a **16-second transition**
instead of an instantaneous swap. Sunrise and sunset have separate amber
color palettes. The equirectangular panoramas crossfade while a localized
twilight glow appears near the horizon. The controller also interpolates
directional light direction and color, ambient hemisphere, fog, terrain shader
brightness, water colors and sky background.

The pure calculations live in `js/sky-transitions.js`, independent of
Babylon.js. A preview can be reversed halfway through a sunset or sunrise,
starting from its exact current blend without snapping. The transition's
remaining duration scales with remaining travel so backtracking doesn't take
an entire extra 16 seconds. The sky dome and textures are reused throughout.

The preview mode and detailed transition state (phase, blend, remaining
seconds) are inspectable through the game's developer debug hooks. **The
existing saved calendar and villager schedules are not altered.** Sun and
moon images are still fixed within the source sky panoramas; moving discs
and an astronomical sky are separate future work.

## Next milestone

**6C.1D:** add a persistent in-game 24-hour clock that controls the new
atmospheric transitions. Keep day/night progress separate from the
existing 90-real-second in-game year and population aging; introduce a
deliberate relationship between time of day and long-term aging before
work shifts are built.

Automated checks: `tests/check-sky-preview.mjs`,
`tests/check-sky-transitions.mjs` and
`tests/browser-sky-preview.mjs`.
