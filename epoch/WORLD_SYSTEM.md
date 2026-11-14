# Epoch — Procedural Forest World (v0.4)

## Goal and scope

The Stone Age now starts in a **seeded, chunk-loaded forest world** rather than a fixed 80 × 80 meter ground plane. This uses smooth terrain geometry, **not Minecraft voxel blocks**. There is only one biome: temperate prehistoric forest.

The environment still uses the original Epoch trees (cylindrical trunks and green canopy spheres), stone deposits, berry bushes and deer. The 3D Quaternius player/NPCs, controls, skills, village construction and save data are preserved.

## First implementation

| System | Current value |
|---|---|
| Terrain | Smooth deterministic noise-height terrain |
| World seed | Random for new games; saved in `epoch.stoneage.v1` |
| Existing saves | Stable seed 12000; houses and resources preserved |
| Biomes | Forest only |
| Chunk size | 32 × 32 meters |
| Visible terrain | 5 × 5 chunks (160 × 160 meters window) |
| Detailed terrain | 3 × 3 chunks (96 × 96 meters window) |
| Mesh resolution | 16 subdivisions per 32-meter chunk |
| World edges | No fixed playable border while walking |
| Scenery | Trees, rocks, berry bushes, short grass and deer |
| Starting region | Flatter 20–37-meter radius clearing around the camp |
| Movement | WASD/Shift and click-to-walk, with dynamically bounded A* paths |
| Village | Existing five fixed plots remain anchored in the clearing |

When crossing a chunk boundary, a new band of terrain meshes is created from the same world seed and distant chunks are disposed. Detailed scenery and wandering deer are displayed only on the closer 3 × 3 band. That prevents growth in memory usage as players explore, although creating a new group of meshes on a chunk crossing may still cause a brief stutter.

### Determinism

`js/forest-generation.js` uses deterministic integer-coordinate hashing, continuous noise and seeded pseudorandom placement. Changing the seed produces different hills and different trees, rocks and bushes. Returning to an area with the same seed regenerates it identically. Negative world coordinates and chunk seams are supported.

For existing player saves, the world seed is **12000** so a previous player sees the same forest on every visit. Fresh games receive a random seed. Resetting the game generates a new seed and regenerates the forest.

### Resource interactions

Trees still provide wood, stone deposits still provide stone, berry bushes provide food, and deer continue roaming as ambient wildlife. The original resource shapes and gathering skills remain. Certain familiar gathering spots from the first clearing are retained to keep the game immediately playable.

The exact same resource objects respawn when the surrounding chunk is loaded again. This is acceptable because the current game has unlimited resource gathering and no depletion simulation. In a later phase, chopped trees, mined deposits, player-made roads and cleared land must be stored as **world modifications** in the save, per chunk.

### Terrain and pathfinding

`world.groundY(x,z)` now calls the same deterministic height sampler as the chunk mesh generator, so actors and village sites sit on the terrain. A* click-to-walk searches a temporary grid around the player and destination, rather than an old hard-coded 39 × 39 navigation map. Extremely distant clicks approach in stages, capped to 90 meters per request to avoid an expensive route search; WASD movement has no square world boundary. This is still a prototype pathfinder and may need replanning around newly streamed objects.

### Architecture

- `js/forest-generation.js`: seed/hash functions, height sampler, chunk coordinates, spawn descriptors
- `js/forest-chunks.js`: local chunk manager, terrain LOD, mesh lifecycle, wildlife and resources
- `js/world.js`: Babylon scene, movement, interaction, and dynamic pathfinding
- `js/state.js`: persistent seed and legacy save migration
- `tests/check-forest.mjs`: deterministic terrain and chunk lifecycle tests
- `tests/check-settlement.mjs`: retains village and seed save compatibility
- `tests/browser-walk.mjs`: Chromium verifies scene loads, materials/animals, seed persistence, character movement and village construction

## Mountain ranges and foothills (Phase 4B.2, terrain pass 1)

Mountain elevations are calculated in `js/mountain-generation.js` using seeded regional noise, curving ridges, and a continuous foothill envelope. The base forest terrain height is retained, and mountain uplift is layered on top. An original-forest radius of 150 meters around the starting clearing has no mountain uplift, with a gradual transition beyond it. Mountains are generated in absolute world coordinates, so loaded 32-meter chunks share seamless boundaries.

The river and lake samplers use the same mountain-adjusted surface height as dry terrain, preventing water from floating above or sinking away from the new land. Physically downhill drainage and mountain-fed river sources are deferred to a later terrain/hydrology pass.

For pre-mountain save slots, the `mountainProtectedSites` array records the historical stockpile and completed building coordinates once, and attenuates uplift near those sites. This is independent of water protection, so saves that already contain water migration data are also handled. Protected wilderness tribe camp locations are included while terrain is streamed. New construction never reshapes an existing ridge.

Visual rock/cliff materials, steep-slope movement restrictions, specialized wildlife and mountain resources are planned separately. Unit checks live in `tests/check-mountains.mjs`.

## River corridors through mountains (valley pass)

`water-corridors.js` owns the original deterministic centerline, river width, lake sites and nearest signed shoreline distance. The water mesh keeps exactly the same footprint and existing depth rules. `mountain-generation.js` uses a smooth valley mask to reduce uplift close to the channel over a broad shoulder, while leaving mountain height away from the river unchanged. This prevents the older river splines from being draped directly over a cliff or a peak. River and mountain functions share the same signed-distance sample, avoiding redundant water-path lookups in the busiest mesh-generation path.

The water is not yet a hydrologically solved downhill network; source selection, proper tributaries, waterfall/fall gradients and route changes belong to a later world-generation milestone. Migration-protected settlements remain untouched.

## Rocky mountain visual pass (Implementation 2)

`js/mountain-appearance.js` adds deterministic color blending for the existing terrain heightfield. Exposed stone increases with mountain uplift and the actual mesh-normal slope; high ridge faces gain subtle weathered bedding and crest highlights, with gradual green-to-rock transitions. The mesh keeps 16 subdivisions per chunk and shares a single terrain material with vertex colors. Water surfaces and river shore treatments remain separate.

The nearby detailed 3×3 terrain window also contains occasional seed-based faceted bedrock outcrops. These visuals are deliberately non-interactive: they do not consume stockpile materials, create harvest nodes, affect building placement, or change movement. They stream and dispose using the existing chunk lifecycle. Mountain geometry, world seeds, save records, and one-time building protection areas are unchanged.

Pure logic and rendering checks are in `tests/check-mountain-appearance.mjs`. Steep-slope movement rules, mountain traversal and new resources are intentionally deferred to later phases.

## Planned future world improvements

1. **Performance profiling:** mesh instancing, worker-based chunk generation, and asynchronous chunk-load pacing
2. **Free building placement grid:** snap houses anywhere suitable rather than the five prototype sites; collision checks and building orientation
3. **Terrain modification:** roads, cleared woodland, mining scars, fences and stored per-chunk diffs
4. **New creatures:** woodland prey, predators and ecological simulation, then hunting
5. **More biomes and landmarks:** river valleys, mountains, coasts and deserts only after the forest performs well
6. **World persistence at scale:** compressed save migrations and potential cloud saves for very large histories

This is a client-side **effectively unbounded procedural forest**, not a multiplayer persistent server or a fully deformable voxel world. Only the seed, village and character/progression information are saved today; the procedural wildlife/scenery regenerate rather than representing a living persistent ecosystem.
