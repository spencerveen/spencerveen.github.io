# Quaternius assets in Epoch

## Source and license

**Original artist:** Quaternius  
**Pack:** [Universal Base Characters — Standard](https://quaternius.com/packs/universalbasecharacters.html)  
**Original license:** [Creative Commons Zero 1.0 Universal (CC0)](https://creativecommons.org/publicdomain/zero/1.0/)  
**Original free download:** https://quaternius.itch.io/universal-base-characters

The free Standard version supplies the real skinned male/female Superhero base meshes, properly-weighted 65-bone humanoid skeletons, 20 hair options in the full pack, and color textures. The optional paid Source pack includes additional editor source files. Epoch uses the CC0 Standard assets only.

The reproducible importer in `epoch/tools/import-quaternius.mjs` fetches its original Standard source files from a public mirror:

https://github.com/NafisRayan/Animate-Rigged-Humanoid-No-Blender

Pinned mirror revision: `5821923af517ac5fdc82505faa92a0d575fc1b1a`. This pin is for reproducibility only; the underlying models and hairstyles are **Quaternius's work**, not assets created by Epoch. Our previous synthetic GLBs remain in this repository as fallback assets, and are not confused with Quaternius's original work.

## What Epoch imports

- `quaternius_male.glb`: Original Superhero male skinned mesh and humanoid rig, original base-color images embedded.
- `quaternius_female.glb`: Original Superhero female skinned mesh and humanoid rig, original base-color images embedded.
- `quaternius_hair_simpleparted.glb`: Side-parted hair.
- `quaternius_hair_buzzed.glb`: Buzz haircut.
- `quaternius_hair_buzzedfemale.glb`: Close-cropped style.
- `quaternius_hair_long.glb`: Long hair.
- `quaternius_hair_buns.glb`: Tied hair buns.
- `quaternius_hair_beard.glb`: Facial hair.

The body files include the Quaternius source UVs, normal vectors, joints, skin weights, inverse-bind matrices and image-based color materials. The hair assets use original geometry with small colorizable materials. The entire set remains in glTF 2.0 / GLB format and is importable in Blender.

## In-game use

`epoch/js/quaternius-models.js` loads the assets using Babylon.js, caches base templates per scene, clones materials for skin and hair variation, and animates the shared humanoid skeleton. NPCs, heirs and players use the same model assets and existing appearance profile.

**Current limitations:** These are base humanoid meshes, not yet the hide tunic/boots shown on our approved reference sheet. An authentic clothing set from a licensed outfit pack or a Blender-authored clothing overlay is a subsequent art step. Not all 20 original Quaternius hairstyles are imported yet; this first milestone includes five distinct hair meshes and a shaved appearance. Source-format skeletons are rigged and deformable, but our initial in-game walk/idle animator is deliberately simple.

If importing fails due to asset delivery or an unsupported browser, Epoch falls back to its previous character art so the entire game can still start.

## Rebuild

The import workflow runs from the named GitHub branch. To regenerate the assets on a machine with network access:

```bash
node epoch/tools/import-quaternius.mjs
node epoch/tests/check-quaternius.mjs
```

The binary output is deterministic for the pinned original input files. This project keeps Quaternius's artistic work clearly distinct from original Epoch game code and prototype assets.
