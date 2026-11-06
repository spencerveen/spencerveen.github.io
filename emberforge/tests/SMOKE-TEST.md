# Emberforge browser smoke test

Run after changes to combat, interface, art loading, or save compatibility.
The automated Node contract tests do not simulate a real browser.

1. Open the game in a fresh browser tab and verify icons, Forge artwork,
   main navigation, and the first combat enemy render.
2. Forge: click/tap the background several times; Ember increases and
   Forge progress and earnings continue to update.
3. Battle: manually Strike. Enemy HP falls; damage numbers and the
   in-scene combat message appear. The original boss-introduction tip
   must **not** appear.
4. Toggle Auto Attack on, then off. No unwanted mode popups appear.
   While on, enemy HP falls and the enemy attacks; while off, automatic
   attacks stop.
5. Use both left and right arrows, including moving away from and back
   to a boss. Check the correct stage, enemy name, HP, and artwork.
6. On a boss: verify special attack text, damage numbers, defeat,
   loot/chest display above controls, and stage unlocks.
7. Heal, take damage, and get knocked out. Verify timers, recovery,
   health, and messages all remain accurate.
8. Navigate between Forge, Battle, Kingdom, Armory, Mastery, and back.
   Confirm navigation stays clickable and the original engine state
   matches the new UI.
9. Save, reload, and verify Ember, stage, equipment, skills, combat
   level, and other progression persist. Never delete local storage
   during smoke testing.
10. Repeat at mobile width, and check the browser console for errors.

Run static checks locally with:
`node --test emberforge/tests/*.test.cjs`

Do not merge or call a build browser-verified solely because syntax checks pass.
