# Epoch — Modular Human System (v0.2)

## Purpose
Build one reusable set of **stylized, clearly human** characters for player adventurers, descendants and prehistoric villagers. Do not require a unique mesh or rig for each person. Character appearances live in serializable data and can later be extended with true GLB base meshes, Blender shape keys and animations.

## Current implementation
**File:** `js/characters.js`

The current generator creates articulated 3D humans procedurally in Babylon.js with shared pivot hierarchy:
- Stable actor root (movement/collision)
- Human body root (body build and height)
- Head/neck pivot and facial meshes: visible eyes, eyebrows, nose, jaw, ears and mouth
- Shoulder/elbow arms and hip/knee legs, feet, hands and simple walking/idle motion
- Interchangeable hair geometry, beards, clothing forms, belts and accessories
- Male/female body template with differing shoulders/hips/head proportions
- Six basic skin tones and four eye colors
- Six hair styles: Short & messy, Shaggy, Shoulder-length, Tied back, Single braid, Topknot
- Six natural hair colors: Black, Dark brown, Chestnut, Auburn, Dirty blond, Gray
- Three Stone Age outfits: Hide wrap, Fur mantle, Primitive tunic
- Facial hair: None, Stubble, Short beard, Full beard
- Adjustable height and body build

Characters use a shared animation-pivot convention regardless of the selected parts. All geometry and appearance parameters are intended to be cheap enough for a small browser prototype. Materials are cached per scene, and replacing one character does not destroy materials used by the NPCs.

## Player and descendants
The starting character has a saved `hero.appearance` object. Existing saves without appearance data receive the original founder's default profile. The Character panel enables cosmetic edits at runtime and updates the 3D avatar immediately.

When succession occurs, `descendantAppearance(parent, generation)` uses a deterministic seeded generator. Skin, hair and eye colors are biased toward the previous character but allow occasional nearby or independent variation. Sex/body template, hairstyle, beard and clothing can differ. Height and build drift gently, bounded to safe ranges.

This is **visual trait inheritance**, not yet biological family genetics. It currently uses the previous playable character as its input; a full family/parents model will be introduced with households and offspring.

NPCs use `randomAppearance(seed, sex)` with stable seeds and the **same** shared model and animation API. There are four ambient villagers in the clearing for now; AI, speech and activities are not implemented.

## Example data profile
```json
{
  "sex": "female",
  "hairStyle": 4,
  "hairColor": 2,
  "skin": 3,
  "eyes": 1,
  "beard": 0,
  "outfit": 1,
  "height": 0.98,
  "build": 1.03
}
```

All numeric indexes are clamped. Profiles are small enough to store for hundreds or thousands of NPCs.

## Engine API
```js
import { createHuman, randomAppearance, descendantAppearance } from "./characters.js";

const npc = createHuman(scene, randomAppearance("npc-127"), null, "npc-127");
npc.root.position = new BABYLON.Vector3(2, 0, 4);
npc.animate(elapsedSeconds, false); // idle
const heir = descendantAppearance(npc.appearance, 2);
npc.dispose(); // generated meshes removed; cached materials survive
```

## Planned modeling improvements
The generator is intentionally a **first real character-shaped prototype**. It is not a completed sculpt, skinned GLB, or Blender armature; it doesn't include facial shape keys, fingers, hair physics or texture maps. Next improvements:

1. Design a consistent underlying character topology and low-to-mid-poly proportions.
2. Model two rigged base meshes in Blender with identical skeleton names, weights and binding pose.
3. Add swappable GLB hair meshes, beard variants, and modular Stone Age outfits.
4. Implement shared idle, walk, sprint, gather, craft and combat animations.
5. Add face shape keys and deterministic inherited facial traits (nose, brow, jaw, cheeks).
6. Move to batched/instanced crowd models with mesh LOD to support larger settlements.
7. Preserve the existing `appearance` data schema and Babylon actor API, so the visuals can improve without changing dynasties or saves.

## Testing
Use the Character tab to switch body templates, hair, skin, eye color, beard, outfits and body proportions. Move with WASD to check clipping. Then use Dynasty to switch generations and reload the browser to ensure the new appearance persists. NPC villagers should visibly vary in presentation.

## Notes
Each sex/body template is a starting geometry preset only. Hairstyles, colors, clothing and body proportions can be used with either. The visual traits have no gameplay statistics or restrictions.

The look should be stylized and believable, not photographic. Cosmetic options should remain compatible with future eras: hide and fur clothing will eventually be replaced by medieval, industrial, modern and space-age wardrobes on the same character framework.
