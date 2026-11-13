# Epoch Characters — Quaternius is the default

The primary player and NPC models are the real Quaternius Universal Base Characters (Standard CC0): skinned male/female meshes, a 65-bone humanoid skeleton, textured skin/eyes, and source hair geometry. These are artist-made meshes, not generated shapes.

See [QUATERNIUS.md](./assets/characters/QUATERNIUS.md) for the license, exact pinned source revision, conversion method, model filenames and limitations.

The existing dynasty appearance data remains in use for sex, hairstyle, hair and skin tint, height and build. Five distinct hair meshes and a shaved option are available in this first pass. Facial hair is currently a single source beard mesh with an on/off choice. Stone Age clothing and extended eye colors are future milestones.

Earlier experimental GLB models and procedural shapes remain available only if an asset fails to load.

---

## Archived fallback system notes
# Epoch — Stone Age Modular Character Assets (v0.3)

## Status

**Game integration:** real, original `.glb` mesh assets loaded by Babylon.js for the player and four settlement NPCs. The older primitive-based character model is now used only if a GLB asset cannot load.

**Artwork goal:** stylized, semi-realistic, simple enough to render efficiently in the browser. This is an **original modeled first iteration**, not a pixel-perfect translation of the approved character concept sheet. Expect additional art passes on faces, outfits, hair and animations.

## Actual 3D files

- `assets/characters/human_male.glb`
- `assets/characters/human_female.glb`

Both are **binary glTF 2.0** models, immediately importable into Blender's File → Import → glTF 2.0. Each model is approximately 279 KB and contains ~5,061 vertices / ~9,442 triangles **including all optional hair and beard meshes**, not all displayed at once.

The models use individually sculpted tapered body volumes, shaped head and facial features, detailed hands, layered hide clothing, fur collar, belt, boot wraps, laced tunic accents, six hair assemblies and three beard options. They are not made of the old Babylon spheres-and-boxes character generator.

## Blender workflow

Blender itself was not available in the environment used to create this build. The models were generated directly in glTF 2.0 format using the included deterministic builder, rather than exported from an interactive Blender session.

To create an editable `.blend` project on a machine with Blender installed:

```bash
blender --background --python epoch/tools/open_models_in_blender.py
```

Or open each GLB manually in Blender (File → Import → glTF 2.0).

This outputs `epoch/assets/characters/epoch_humans_editable.blend` locally. You can refine meshes and materials, and eventually create actual armatures and weight-paint deformations there. **The current in-game models use shared pivot-node joint animation, not a fully skinned, weight-painted Blender armature.** The transform hierarchy is intentionally named to make later rigging straightforward.

For deterministic regeneration of the two GLB assets:

```bash
node epoch/tools/build-avatar-glb.js
```

## Runtime integration

- `js/character-models.js`: lazy GLB load, one model source per body template per scene; scene clones for unique characters, with independent material colors and mesh visibility; animated named joints.
- `js/characters.js`: appearance schema and seeded descendant traits; includes backup procedural models if loading fails.
- `js/world.js`: creates player and villagers with `createModelHuman`.
- `js/ui.js`: appearance tab controls.
- `js/state.js`: stores appearance and inheritance in saved character data.

Appearance profile fields remain `sex`, `hairStyle`, `hairColor`, `skin`, `eyes`, `beard`, `outfit`, `height`, `build`. Existing saves remain compatible.

### Visible variations

- 2 modeled sex/body templates
- 6 swappable hairstyles: short, shaggy, shoulder length, tied back, braids, topknot
- 6 natural hair-color options
- 6 skin-tone palettes and 4 eye-color options
- 4 facial-hair settings (none, stubble, short, full; hidden on female template)
- 3 early outfit color palettes
- Adjustable height and build
- NPCs reuse the same GLB sources with unique saved/seeded appearance profiles

Changing appearance clones a new actor model without resetting the world actor's position or movement. Descendants retain some parent color traits and randomly change other features; actual two-parent genetics and family relations are still future systems.

## Browser performance and future work

Each source model contains multiple hidden alternate hairstyle and facial-hair assemblies. Only the selected style is visible in an individual character. The 3D source file is cached once per body template per scene and cloned for villagers.

This is an interim authored 3D art asset system. To approach the concept art more closely, the next iterations should focus on:
1. Blender hand-refinement of the mesh topology and face, with shape keys for facial genetics.
2. Proper **skinned armature**, weight painting around knees/elbows, hand and wrist deformation.
3. Shared authored idle, walk, sprint, gather and combat animation clips.
4. Individually modeled hide outfits, equipment and armor for historical eras.
5. LOD meshes and mesh combining for dozens or hundreds of NPCs.

There is no physics-driven hair, facial animation, cloth simulation, or gameplay AI in this iteration.
