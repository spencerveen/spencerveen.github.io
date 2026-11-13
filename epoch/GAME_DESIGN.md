# EPOCH — Game Design Document
**Working title:** Epoch: Dawn to Infinity  
**Revision:** 0.1 / First playable Stone Age vertical slice  
**Genre:** 3D browser-based, single-player, third-person RPG / civilization simulator / dynasty game  
**Creative references:** RuneScape's skills, Civilization VI's science and civics, and emergent generational simulation. Original systems, world, artwork and identity.

## 1. Vision
Start as a prehistoric survivor, develop RuneScape-like personal skills through actions, build a permanent civilization through scientific and cultural discoveries, and pass control to descendants as millennia unfold. Explore the 3D world yourself as it expands from a camp to a spacefaring society. Competing tribes and civilizations develop independently.

**Design pillars**
1. **Person to civilization:** Actions matter at the character, dynasty and societal levels.
2. **History is permanent:** Discovered technology, culture, settlements and major events persist across generations.
3. **Skills evolve:** Foundational professions expand and specialize as technologies become available; old skills remain useful.
4. **A living world:** Wildlife, villages and rival civilizations operate according to their own needs, not only in response to the player.
5. **Meaningful choices:** Exploration, research, diplomacy, economic growth and combat are viable paths.
6. **Play first, scale later:** Build a fun Stone Age game before attempting all historical periods.

## 2. Three progression layers

| Layer | Examples | On succession |
|---|---|---|
| Character | Name, age, personal XP, equipment, injuries, relationships | New playable descendant; personal skills partly transfer via education |
| Dynasty | Family tree, inherited property, reputation, traditions, legendary ancestors | Persists and grows |
| Civilization | Technology, civics, population, towns, built infrastructure, borders | Persists unless degraded by in-world events |

**Age advancement is not succession.** Several generations may occur in the same historical period. Advancing to a new age requires researched technologies and established institutions, not a specific generation number.

## 3. Core gameplay loop
Explore → Gather / Hunt / Interact → Improve skills and collect resources → Craft and build → Generate knowledge and culture → Research technology and civics → Open new occupations, settlements and threats → Pass the dynasty to a descendant → Repeat.

The player starts hands-on. As societies develop, automation, workers and infrastructure reduce manual chores and introduce new strategic responsibilities.

## 4. Historical progression (proposed)
1. **Stone Age:** Gathering, stone tools, fire, hunting, survival, tribal community.
2. **Agricultural & Bronze Ages:** Farming, husbandry, villages, trade, copper/tin metallurgy.
3. **Iron & Medieval Ages:** Smithing, guilds, roads, warfare, kingdoms, scholarship.
4. **Industrial Age:** Machinery, steam, electricity, factories, railroads.
5. **Modern Age:** Electronics, computing, aviation, large-scale cities and nations.
6. **Future Age:** Robotics, biotechnology, advanced energy, autonomous systems.
7. **Space Age:** Spaceflight, orbital stations, planetary colonies, asteroid industry and eventually interstellar expansion.

An era unlocks systems; it does not discard previous skills or geography. The same settlement site may grow from primitive campsite to spaceport.

## 5. Skills
Character skills earn XP from actions. Levels unlock improved yields, recipes, efficiency or specialization prerequisites. Foundational skills include:
- Woodcutting → Forestry → Automated Forestry
- Mining → Metallurgy / Deep Extraction → Asteroid Mining
- Foraging → Agriculture → Hydroponics
- Crafting → Smithing → Manufacturing → Robotics
- Construction → Architecture → Civil Engineering → Planetary Infrastructure
- Survival and Hunting → Scouting, Animal Husbandry, tactical skills
- Later skill branches: Trading, Leadership, Navigation, Chemistry, Computing, Piloting, Astronomy and more.

**Prototype implementation:** Woodcutting, Mining, Foraging, Crafting, Construction and Survival. XP curve is incremental and capped conceptually at level 99; no specialization bonuses beyond the stone axe yet. Gathering creates knowledge, and food-gathering creates culture. This is a first balancing pass, not the final economy.

## 6. Science and civic trees
**Technology** represents what the civilization knows how to build or do. Example: stone tools → metallurgy → steam → electronics → computing → spaceflight.

**Culture/Civics** represents how society organizes itself: tribal cooperation → oral tradition → specialization and education → law → institutions → government → international and interplanetary governance.

Technologies and civics require a combination of prerequisite nodes, resources and a distinct knowledge or culture currency. Later versions should add achievements or experiments as "eureka" boosts rather than requiring skill level alone.

**Playable prototype nodes**
- Technology: Control of Fire, Stone Toolmaking, Early Agriculture (preview).
- Culture: Tribal Community, Oral Tradition, Apprenticeship.
- Buildings: Primitive Shelter and Campfire.
- Equipment: Stone Axe.

## 7. Dynasties and time
Each playable character ages in simulation time. Players can nurture a household and prepare an heir. On succession, the new character keeps civilization and dynasty progress. Personal XP partially transfers, with cultural education increasing inheritance effectiveness.

**Prototype simplification:** An explicit "Continue as descendant" button simulates succession. It advances the calendar 24 years, picks a preset descendant name, and retains 8% of personal XP by default, 15% with Oral Tradition, or 25% with Apprenticeship. Knowledge, culture unlocks, resources, shelter and world discoveries remain. No actual spouse/child relationships, diseases or mortality are simulated yet.

**Prototype clock:** 90 real seconds = 1 in-game year while the page is active. This is provisional and will be replaced by a world-time and historical pacing system. No offline simulation yet.

**Future direction:** Age-specific time compression, household relationships, children with traits, retirement, genealogy, education, health and legacy events. Avoid forcing rushed death cycles.

## 8. Wild creatures, rivals and combat
The world will contain peaceful prey, predators, territorial animals, neighboring tribes and competing civilizations. Wildlife needs sensing, hunger, flee/fight behavior, habitat and population simulation.

Civilizations should each have technology, civics, resources, population, territory, attitudes, armed strength, ambitions and historical relations. They can trade, ally, settle, raid, negotiate, defend or wage wars. Different civilizations can occupy different technological eras simultaneously. Social and diplomatic solutions must remain meaningful.

Combat evolves alongside technology: primitive spears and clubs, metallurgy and armor, ranged and siege weapons, firearms, vehicles, automated defense and orbital warfare. Core personal combat skill should translate partially to future weapon specializations.

**Prototype scope:** Ambient deer wander visually. There is **no enemy AI, hunt/combat, rival tribe simulation, diplomacy, civilization expansion, multiplayer or warfare yet**.

## 9. Controls and presentation
Desktop: WASD to move, Shift to sprint, left click ground for automated route, left click resources to approach and gather, E to gather nearby, right mouse drag to orbit camera, wheel to zoom. Keyboard movement interrupts automated movement.

UI: Left-side current objective and character/settlement status, right-side Pack / Skills / Tech / Culture / Dynasty tabs, lower action feedback and knowledge/culture counters.

Target atmosphere: naturalistic Stone Age wilderness with readable resource objects, stable camera and minimalist bronze/forest interface. Procedural placeholder models first; replace with consistent licensed or original GLB models later.

## 10. Technical architecture
Initial deployment is a static folder at `/epoch/` under Spencer's GitHub Pages site:
- `index.html`: game HTML canvas and HUD
- `styles.css`: interface
- `js/world.js`: Babylon.js scene, terrain, procedural props, actor, movement, A* grid pathfinding and pointer interaction
- `js/state.js`: state, actions, skill XP, research, civics, succession and local persistence
- `js/ui.js`: tab rendering and player actions
- `js/main.js`: initialization and simulation clock

Persist a versioned JSON save in `localStorage`. There is no account synchronization. Later improvements: separate simulation engine, game-data registries, TypeScript, fixed simulation ticks, entity-component structures, save migrations, testing harness, navmesh, asset loading, workers for world simulation and eventually authoritative multiplayer services if chosen.

**Engine:** Babylon.js; the prototype uses its public CDN only for experimental development. Before production, pin a version and bundle/host the engine assets locally, following Babylon.js recommendations.

## 11. Milestones and acceptance criteria

### M1 — Browser foundation (this prototype)
- [x] A procedural explorable 3D forest clearing with primitive structures and ambient deer
- [x] WASD movement, Shift sprint, orbit/zoom camera
- [x] Click ground to auto-walk using grid A*; click resource to approach and gather
- [x] Resources, six skills with XP and level bars, working inventory
- [x] Research technologies and civics with prerequisites
- [x] Craft stone axe, reveal fire and build a shelter
- [x] Succession simulation that preserves civilization and partially transfers XP
- [x] Local save and loading
- [ ] Browser QA across multiple desktop browsers and mobile touch UI
- [ ] Professional 3D character/assets and animation polish

### M2 — Fun Stone Age survival
- Animal behavior, actual hunting and danger, player HP, food/shelter needs
- Crafting recipe system and gear, settlements that grow organically
- Reliable navmesh pathfinding, interactable villagers, accessible help and controller/mobile support
- Proper sound and original/appropriately licensed environment assets

### M3 — Generations and tribe
- Households, children, aging rules, mentorship, traits, succession with eligible heirs
- Worker assignments, first tribal NPCs, basic diplomacy and settlements
- History ledger, data-driven skills/tech/civics, balance pass

### M4 — Civilization competition and early new age
- Autonomous rival tribes with resources, goals, trade, defense and history
- Full agricultural era with crops, farming profession, new structures and sustained population
- Validated era-transition framework supporting all later periods

### M5+ — Long historical arc
- Bronze/Iron/Medieval, Industrial, Modern, Future and Space expansions delivered incrementally.
- Civilization scale, economies, wars, governments, spaceflight, colonies and galactic logistics.

## 12. Scope constraints and risks
A polished 3D MMO, fully simulated world history and seven production-ready eras are *not* first milestones. Risks include enormous asset requirements, browser CPU/memory limitations, hard-to-balance exponential economies, moving-path/pathfinding complexity and time pacing across generations. Mitigate with strong data separation, testable simulation, small explorable regions, instance-based asset batching, explicit frame/CPU budgets and careful scope control.

## 13. Decisions to revisit
- Permanent player death vs retirement and successor rules
- How heirs are selected and whether entire family can be simulated
- Era unlock conditions, pacing, and temporary setbacks after societal collapse
- Single settlement versus many cities and ability to travel between them
- Procedural versus handcrafted landscape; combat style and unit scale
- Single-player first vs asynchronous world events vs later multiplayer

## 14. Immediate playtest checklist
1. Open `/epoch/` on a desktop, allow Babylon.js CDN to load.
2. WASD and Shift work; right mouse orbits; scroll zooms.
3. Click ground to auto-walk; click tree/rock/bush to approach and gather.
4. Confirm inventory quantities, XP and knowledge/culture update.
5. Research fire; check campfire visually lights. Research stone tools; craft an axe.
6. Collect resources to build shelter; check it appears in the clearing.
7. Unlock Tribal Community and Oral Tradition.
8. Continue as descendant; confirm new name, skills partly transferred, tech/culture retained.
9. Reload; confirm resources, descendants, tech and building persist.
10. Check for JS errors and layout failures; test save reset with explicit confirmation.

---
**Guiding rule:** Never add a new age as a hardcoded second game. Keep reusable systems and let era-specific content define progression.
