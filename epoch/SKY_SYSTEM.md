# Epoch Sky & Atmosphere — Phase 6C.1A/B

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

## Next steps

**6C.1C:** smooth dawn/dusk interpolation and matching sun, moon, fog, water,
and terrain color. A future update should replace the fixed celestial
hotspots with controllable sun/moon visuals if they are animated.

**6C.1D:** persisted in-game 24-hour clock, separate from the existing
year/aging system. Do not repurpose the existing calendar's age counter as
the daily clock.

Automated tests: `tests/check-sky-preview.mjs` and
`tests/browser-sky-preview.mjs`.
