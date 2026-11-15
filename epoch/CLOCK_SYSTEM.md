# Epoch — 6C.1D: The Annual Day/Night Clock

Implemented: **one complete 24-hour visual cycle equals one in-game year**.

## Time balance

The clock runs only during active gameplay: **432 real seconds = one year**
(7 minutes 12 seconds). One in-game hour lasts 18 real seconds. New game
years begin at **7:00 AM**, with the landscape in daylight.

| Age | Real-time elapsed, assuming uninterrupted play |
| --- | --- |
| Starting at 18 until age 100 | 9 hours 50 minutes 24 seconds |
| Starting at 25 until age 100 | Exactly 9 hours |
| Starting at 50 until age 100 | Exactly 6 hours |

Natural age death remains at 100. Village residents and founders age together
once each year at 7:00 AM. The game continues through successor selection.
Gameplay can end earlier due to other survival causes.

## Visual schedule

| Game hour | Appearance |
| --- | --- |
| 05:00–07:00 | Sunrise, cooler moonlight warming to a clear day |
| 07:00–18:00 | Day |
| 18:00–20:00 | Sunset, golden-hour haze transitioning to stars |
| 20:00–05:00 | Night |

The world sky uses the existing local CC0 day/night panoramas and smoothly
interpolated Babylon ambient/directional lighting, fog, water and shader
brightness. **The manual sky preview button was replaced by a live clock HUD.**

## Save and performance model

The existing `calendarProgress` fractional-year value remains authoritative
in save files. This preserves a player's year and progress within that year
when upgrading from the previous 90-second years. The save data is advanced
once per active second by `GameState.advance()`; Babylon's 3D renderer merely
interpolates between ticks for smoothly changing illumination. Rendering
frames cannot advance game years, age villagers, or write save files.

The game pauses its calendar with existing modal UI and game-over states.
There is no simulated offline aging. Display is a 12-hour AM/PM clock.

See `js/game-clock.js` for the pure timing math, `js/sky-atmosphere.js`
for graphics, and `tests/check-game-clock.mjs` and
`tests/browser-sky-preview.mjs` for validation.

## Next phase

**6C.2: Villager work schedules.** Use the shared clock to schedule
work, returning home, rest and food breaks. Carrying loads must remain
persistent and safe during sleep or a change in shifts.
