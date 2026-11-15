# Epoch — Phase 6C.3: Villager Energy and Sleep

## What happens every year

An in-game 24-hour day is one year, taking **432 real seconds**. The
daily schedule is:

| Game hours | Villager activity |
| --- | --- |
| 05:00–08:00 | Wake up, rest or prepare for the workday |
| 08:00–18:00 | Assigned workers gather and transport materials if rested |
| 18:00–20:00 | Stop accepting new work, deliver any current load, return home |
| 20:00–05:00 | Sleep at the assigned hut or communal camp |

Workers already gathering finish their short collection before returning;
outbound workers with empty hands turn around without claiming a resource.
Cargo already collected continues to its stockpile and is never silently
discarded on a shift boundary. Nighttime work does not restart until 8 AM.

## Energy / exhaustion

Every resident has saved **energy (0–100)** and a **resting/exhausted**
flag. Older save files migrate safely to 100 energy, not an empty bar.

- Active resource gathering: -0.48 energy per real second.
- Active travel: -0.32 energy per real second.
- Quiet rest at home during the day: +0.19 energy/sec.
- Evening rest at home: +0.29 energy/sec.
- Morning rest at home: +0.30 energy/sec.
- Sleep at home (8 PM–5 AM): +0.69 energy/sec.
- A stranded villager can rest slowly without claiming they have slept.

At 15 energy or below, workers become exhausted and stop starting new
gathering trips. They need to reach **65 energy** before resuming work.
A completed night's sleep can restore a severely exhausted resident to 100.

There is no manual exhaustion penalty for the player; this model applies to
other village residents only. Player survival still uses the existing health,
stamina and hunger bars.

Energy is advanced by GameState with **active calendar ticks**, never by
Babylon render frames. A save/reload preserves energy and the exhausted flag.
When a player is far beyond a streamed village, workers and their energy
simulation pause rather than simulating imaginary distant work.

## Visuals and controls

Villagers walk back to their assigned hut or communal camp, settle at home,
and show a floating **Zzz** indicator while sleeping. Hut interior beds and
lying-down animations are intentionally not included in this first pass.

Open **Village Stockpile → People** to see each resident's energy bar.
Click **View profile** to see the exact energy, exhaustion and sleep status.

The People panel refreshes only the small meter readouts on energy ticks;
it does not re-render the 3D world each second.

## Future phase

Phase 6C.4 will add hunger, food consumption, daily meals, reduced recovery
when hungry, and food storage priorities. Phase 6C.5 can add more complex
camp and hut routines, socializing and ambient village behavior.

Implementation: `js/villager-routines.js`, `js/residents.js`,
`js/state.js`, `js/world.js` and the People panels.

Checks: `tests/check-villager-routines.mjs` and
`tests/browser-villager-sleep.mjs`.
