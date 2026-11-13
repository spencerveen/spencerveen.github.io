# Epoch: Quaternius locomotion

Epoch plays **real authored Quaternius idle, walking and jogging clips**, not a procedurally rotated cylinder model.

## Animation assets

| Motion | Official clip | Duration | Gameplay |
|---|---|---:|---|
| Idle | `Idle_Loop` | 2.50 s | Standing still, NPCs |
| Walk | `Walk_Loop` | 1.333 s | WASD and click-to-walk |
| Jog | `Jog_Fwd_Loop` | 0.933 s | Shift + WASD, sprinting |

Animation author/source: **Quaternius Universal Animation Library** (CC0), with credit also to animation contributor Gonzalo Furnier. See [the official pack](https://quaternius.com/packs/universalanimationlibrary.html). The subset was extracted from a CC0-credited optimized GLB in `Seyamalam/blood-league-kickoff`, pinned to `aa02a4e6d8337a0604d2da131bcbbeb1f01badf0`. No generated motion replaces these original clips.

The compact `assets/animations/quaternius-locomotion.json` contains three selected clips (rotation and translation tracks for all 65 bones). The importer `tools/import-quaternius-walk.mjs` is reproducible and correctly decodes glTF sparse animation accessors. The runtime does not have to download the entire 2.7 MB animation library.

## Why the old Quaternius characters stayed in T-pose

Babylon.js links imported glTF skeleton bones to matching `TransformNode` objects. Animating the `Bone` directly doesn't survive the render update, because Babylon copies the linked node's transform onto the skeleton. We now resolve `bone.getTransformNode()` and animate that node.

The controller in `js/locomotion.js` retargets local source keyframes to the loaded character's original bind/rest pose using:

`targetPose = targetRest * inverse(sourceRest) * sourceAnimatedPose`

This preserves each character's own rig rest offsets, preventing bent or dislocated joints when male/female bones differ. The source glTF root node is intentionally excluded so coordinate-conversion transforms remain intact. Pelvis bob and other local translation deltas apply relative to their target rest positions.

Quaternions are interpolated with slerp and movement transitions are blended. One small asset payload is cached per Babylon scene and shared between the player, descendants and NPCs.

## QA

From the repository root:

```bash
node epoch/tests/check-walk-clips.mjs
node epoch/tests/check-locomotion-runtime.mjs
```

The first test validates the original clip data; the second tests linked-node rig animation, walking, jogging, idle, return-to-idle, root rotation preservation and reset with a small Babylon API test double. GitHub Actions runs both checks alongside the GLB asset validator.

**Remaining visual QA:** Animation clip foot placement, hair attachment to moving head, motion speed versus gameplay velocity and final contact with uneven terrain should be evaluated in the browser. These are first professional motion clips; directional strafing/turning and tool-specific gathering animations are upcoming.
