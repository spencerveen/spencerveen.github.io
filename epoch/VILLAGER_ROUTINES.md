# Epoch — Phase 6C.3–5: Villager Routines, Hunger and Village Life

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

Open the constructed **Council Lodge → People & Jobs** to see each resident’s energy bar.
Click **View profile** to see the exact energy, exhaustion and sleep status.

The People panel refreshes only the small meter readouts on energy ticks;
it does not re-render the 3D world each second.

## Phase 6C.4 — Hunger and shared meals (implemented)

Villagers now track their own **hunger (0–100)** as a saved value alongside
energy, exhaustion, job and cargo. Old saves start residents at 100 hunger;
the player's separate hunger and inventory are not changed. Hunger decreases
with active game time: roughly 0.22/sec gathering, 0.19/sec traveling,
0.085/sec sleeping, and 0.13–0.145/sec when awake or resting. A single
7m12s in-game year therefore requires modest but meaningful village rations.

**Meal trips:** When a villager reaches **48 hunger or below**, and edible
food is available in village storage, their next priority is to walk to the
stockpile and spend 2.5 seconds eating. They finish already claimed cargo
deliveries first, and never take a meal from another villager's cargo or from
the player's personal backpack. At the store they consume **exactly one**
real unit, then head home or resume the normal daily schedule.

Rations are served in this priority order:

| Stored item | Hunger restored |
| --- | ---: |
| Berry-Roasted Meat | 52 |
| Roasted Meat | 38 |
| Roasted Fish | 31 |
| Wild Berries | 24 |

**Raw fish and meat cannot be consumed without cooking.** If the village
runs out of edible food, villager hunger continues dropping. At 25 hunger,
energy recovery slows sharply; starving at zero hunger can lose energy even
while sleeping. Workers at 15 hunger or below cannot begin new work trips,
except for foragers, who can still try to rescue the settlement by bringing
back wild berries if they have the stamina to do so. Starvation currently
affects work and recovery, not mortality (a separate future balancing step).

Stockpile → Storage shows the quantity of ready-to-eat meals and a warning
for critically hungry residents. Council Lodge → People & Jobs displays each villager’s
hunger and energy bars. Individual profiles show exact hunger status and
the last meal eaten.

The hunger, energy, cargo and clock values are authoritative in GameState:
visual updates and Babylon's render loop never generate extra meals.
Meal consumption, remaining stock and the last eaten item persist in a save.
Workers outside local simulation range do not fabricate offline meals or
silently consume stockpile supplies.

Tests: `tests/check-villager-food.mjs` and
`tests/browser-villager-food.mjs`.

## Phase 6C.5 — A living village (implemented)

Villagers now spend **free time** in small, staggered activities:

- **Morning (5–8 AM):** villagers may visit the communal area and chat
  before the work shift.
- **Daytime (8 AM–6 PM):** unassigned villagers can gather or take short
  walks. Assigned workers continue their actual resource jobs instead.
- **Evening (6–8 PM):** villagers finishing deliveries can gather around a
  constructed Cooking Hearth, meet near the stockpile, or stroll along nearby
  footpaths.
- **Night (8 PM–5 AM):** leisure ends immediately. Villagers return to their
  home location and display the existing Zzz marker.

If the settlement has a **built Cooking Hearth**, social gatherings form in
small groups around its real world coordinates and face the fire or nearby
friends. Without a hearth they gather around the **communal clearing near
village storage**, not at a magically generated campfire. Some villagers
instead walk to two nearby points before returning home. They display a small
non-clickable conversation marker when actively chatting.

Leisure locations are chosen deterministically for each villager and visit.
They use the existing dry-land navigation and reject blocked or submerged
destinations. Social motion is lightweight, purely local, and does **not**
generate food, fire, resources or arbitrary extra villagers. Casual walking
consumes ordinary travel energy; standing and conversing allows modest
recovery. There are no new saved friendship points or happiness modifiers
in this phase.

**Priority:** cargo delivery, work shifts, food trips, exhaustion and
sleep take precedence. Very hungry, tired or resource-carrying villagers
do not start social activities. A job reassignment or the beginning of
the workday interrupts leisure safely; dusk visitors head home at
nightfall.

Council Lodge → People & Jobs includes live activity statuses such as *Walking to the
hearth*, *Gathering around the fire*, *Meeting villagers* or *Exploring
the village*. The conversation count and each resident's status refresh
with the existing village needs update. The individual profile describes
their activity when viewed.

Code: `js/village-life.js`, `js/world.js`,
`js/villager-routines.js`, `js/village-ui.js`, and `js/ui.js`.

Tests: `tests/check-village-life.mjs` and
`tests/browser-village-life.mjs`.

## Future phase

Next improvements may add richer gestures, true hut interiors, social
relationships, shared cooking and dining animations, and food rationing
policies. Food hunger and basic village social routines are implemented.

Implementation: `js/villager-routines.js`, `js/residents.js`,
`js/state.js`, `js/world.js` and the People panels.

Checks: `tests/check-villager-routines.mjs` and
`tests/browser-villager-sleep.mjs`.
