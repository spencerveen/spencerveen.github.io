# Epoch Sky & Atmosphere — Phase 6C.1A–D

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

The previous Day/Night preview control has been replaced by a live game clock.
The clock automatically drives this sky controller. See
[CLOCK_SYSTEM.md](CLOCK_SYSTEM.md) for the cycle schedule and aging rules.

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

## Phase 6C.1D — Complete

The automatic game clock now drives sunrise, daytime, sunset and night. One
24-hour cycle is one calendar year and takes 7 minutes 12 seconds of active
play; the previous manual preview button is replaced by a live HUD clock.

See [CLOCK_SYSTEM.md](CLOCK_SYSTEM.md) for the time and age balance,
save/reload integration, the 24-hour schedule and next-phase villager shifts.

Automated checks: `tests/check-sky-preview.mjs`,
`tests/check-sky-transitions.mjs`, `tests/check-game-clock.mjs` and
`tests/browser-sky-preview.mjs`.
