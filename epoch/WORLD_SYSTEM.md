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
| Visible terrain | 9 × 9 chunks (288 × 288 meters window) |
| Detailed terrain | 5 × 5 chunks (160 × 160 meters window) |
| Mesh resolution | 16 subdivisions per 32-meter chunk |
| World edges | No fixed playable border while walking |
| Scenery | Trees, rocks, berry bushes, short grass and deer |
| Starting region | Flatter 20–37-meter radius clearing around the camp |
| Movement | WASD/Shift and click-to-walk, with dynamically bounded A* paths |
| Village | Existing five fixed plots remain anchored in the clearing |

When crossing a chunk boundary, a new band of terrain meshes is created from the same world seed and distant chunks are disposed. Detailed scenery and wandering deer are displayed only on the closer 5 × 5 band. That prevents growth in memory usage as players explore, although creating a new group of meshes on a chunk crossing may still cause a brief stutter.

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

## Swimming and floating

`js/swimming.js` centralizes the depth threshold, regular and fast swim costs, speeds and exhaustion recovery threshold. The movement system now blocks only physical obstacles; both river and ocean water can be crossed. A swim stroke charges the existing GameState stamina pool using the `swim` reason, suppressing passive regeneration for that tick. The temporary sprint-only cheat does not apply to swimming. Exhausted swimmers float until enough stamina recovers, with a free exit step into adjacent shallow water. The visual player root follows the sampled water surface while the streamed terrain remains the same seabed. A temporary bob and lean reuse locomotion until dedicated swim clips are made. No new saved settings or change to existing water generation is necessary.

## Ocean biome and coastline (Phase 4B.3)

`js/ocean-generation.js` defines one continuous seeded eastern shoreline and an open ocean extending toward positive X. The coastline sits roughly 470–665 meters from the origin depending on the seed and latitude (Z). It carves a gentle 96-meter coastal shelf into the existing mountain/forest height field. The water model reports `kind: "ocean"` in addition to rivers and lakes, returning constant sea level, a gradual seafloor, wadeable nearshore depths and impassable deeper water. Beach sands and underwater seafloor colors are applied through the existing vertex-color terrain pipeline. No ocean geometry is persisted; chunk meshes stream deterministically. Fully offshore chunks render a low-detail water grid to limit draw overhead.

Existing worlds migrate a one-time `oceanProtectedSites` snapshot from stockpiles and existing buildings, independent of older river/mountain protection. Nearby tribal camp clearings are also protected. This prevents the new sea from deleting historical settlements. New builds cannot reshape the ocean. The earlier rivers retain their seeded routes and join the ocean at the shore. We have not yet implemented realistic tide levels, sea currents, aquatic wildlife, swimming, watercraft, or ocean islands.

## Mountain ranges and foothills (Phase 4B.2, terrain pass 1)

Mountain elevations are calculated in `js/mountain-generation.js` using seeded regional noise, curving ridges, and a continuous foothill envelope. The base forest terrain height is retained, and mountain uplift is layered on top. An original-forest radius of 150 meters around the starting clearing has no mountain uplift, with a gradual transition beyond it. Mountains are generated in absolute world coordinates, so loaded 32-meter chunks share seamless boundaries.

The river and lake samplers use the same mountain-adjusted surface height as dry terrain, preventing water from floating above or sinking away from the new land. Physically downhill drainage and mountain-fed river sources are deferred to a later terrain/hydrology pass.

For pre-mountain save slots, the `mountainProtectedSites` array records the historical stockpile and completed building coordinates once, and attenuates uplift near those sites. This is independent of water protection, so saves that already contain water migration data are also handled. Protected wilderness tribe camp locations are included while terrain is streamed. New construction never reshapes an existing ridge.

Visual rock/cliff materials, steep-slope movement restrictions, specialized wildlife and mountain resources are planned separately. Unit checks live in `tests/check-mountains.mjs`.

## Geography cleanup — Riverbanks and lake basins

**Historical phase (superseded by Watershed v2):** The original centerline system added variable width and larger basins. Watershed v2 now replaces these repetitive rivers and repeated lake sites with finite branching routes and occasional irregular lakes, using a bounded region-network cache and spatial indexing. These are still procedural waterways rather than a full solved watershed, and old stockpile/building protection snapshots remain effective.

## Highland habitat cleanup

Forests and berry bushes now thin out on rocky mountain heights; grassy tufts and deer likewise avoid exposed highland stone. Stone deposits remain available on rocky slopes. Seeded resource IDs and saved depletion records are unchanged. New tribes also respect the buffer around recorded historical camps when streamed, without deleting the old discovery.

## Wider-spaced tribes and natural campsites

New tribes use deterministic 5×5 chunk territories rather than a 12%-per-chunk independent roll. Candidates are restricted to the center chunk, so regular settlements in adjacent territories remain at least 144m apart, with a 132m margin around the first guaranteed nearby encounter. Sites sample the center and eight points on each of two rings, 10m and 15m, to reject **any** river, lake, ocean or steep mountain intrusion across the camp clearing. New camps cannot reshape shorelines or force mountain terrain flat. Unsafe regions stay unoccupied.

Previously recorded camps retain exactly their legacy seed layout and member identities via a backwards-compatible `placementVersion` field. Historic camps alone receive their previous local terrain protection. Cached candidate sites and the absence of 121 new-tribe protections per streaming refresh reduce generation overhead.

## Watershed network v2 (river redesign)

`water-corridors.js` builds finite seeded 2D waterways per 720m catchment band. Each network has a main channel starting from a highland-biased source, curved cubic-spline bends, two tributaries joining exact downstream points, and a mouth matching the eastern ocean coast. A river tapers to a narrow headwater instead of extending forever westward. Large irregular lakes appear occasionally (about 34% of catchments) at river bends, not once per 232m interval.

Generation is deterministic from world seed, caches at most 24 region networks, and uses a 96m spatial index with ~85m river-valley padding, so chunk water/terrain sampling checks only nearby segments. The mountain-valley sampler uses these new corridors rather than the old parallel river splines, and water depths, shallow wading, swimming and ocean boundaries continue to use the existing water model. Historic stockpiles/buildings retain their protection snapshots; undiscovered camps are screened against actual new waterways. The river shape changes throughout wilderness when upgrading an old save. A one-time `watershedProtectedSites` snapshot protects existing stockpiles and every existing completed building from the new river routes, including buildings constructed after the prior water migration. The snapshot is fixed after migration.

The network is visually coherent rather than a fluid-dynamics model; a true downhill elevation solver and detailed watershed erosion remain future work.

## River corridors through mountains (valley pass)

`water-corridors.js` owns the original deterministic centerline, river width, lake sites and nearest signed shoreline distance. The water mesh uses the active watershed footprint and retains the same depth and swimming rules. `mountain-generation.js` uses a smooth valley mask to reduce uplift close to the channel over a broad shoulder, while leaving mountain height away from the river unchanged. This prevents the older river splines from being draped directly over a cliff or a peak. River and mountain functions share the same signed-distance sample, avoiding redundant water-path lookups in the busiest mesh-generation path.

The water is not yet a hydrologically solved downhill network; source selection, proper tributaries, waterfall/fall gradients and route changes belong to a later world-generation milestone. Migration-protected settlements remain untouched.

## Rocky mountain visual pass (Implementation 2)

`js/mountain-appearance.js` adds deterministic color blending for the existing terrain heightfield. Exposed stone increases with mountain uplift and the actual mesh-normal slope; high ridge faces gain subtle weathered bedding and crest highlights, with gradual green-to-rock transitions. The mesh keeps 16 subdivisions per chunk and shares a single terrain material with vertex colors. Water surfaces and river shore treatments remain separate.

The nearby detailed 5×5 terrain window also contains occasional seed-based faceted bedrock outcrops. These visuals are deliberately non-interactive: they do not consume stockpile materials, create harvest nodes, affect building placement, or change movement. They stream and dispose using the existing chunk lifecycle. Mountain geometry, world seeds, save records, and one-time building protection areas are unchanged.

Pure logic and rendering checks are in `tests/check-mountain-appearance.mjs`. Steep-slope movement rules, mountain traversal and new resources are intentionally deferred to later phases.

## Planned future world improvements

1. **Performance profiling:** mesh instancing, worker-based chunk generation, and asynchronous chunk-load pacing
2. **Free building placement grid:** snap houses anywhere suitable rather than the five prototype sites; collision checks and building orientation
3. **Terrain modification:** roads, cleared woodland, mining scars, fences and stored per-chunk diffs
4. **New creatures:** woodland prey, predators and ecological simulation, then hunting
5. **More biomes and landmarks:** river valleys, mountains, coasts and deserts only after the forest performs well
6. **World persistence at scale:** compressed save migrations and potential cloud saves for very large histories

This is a client-side **effectively unbounded procedural forest**, not a multiplayer persistent server or a fully deformable voxel world. Only the seed, village and character/progression information are saved today; the procedural wildlife/scenery regenerate rather than representing a living persistent ecosystem.
