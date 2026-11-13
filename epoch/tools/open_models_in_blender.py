"""
Epoch: import original, editable GLB avatars and save a Blender project.
Run from the repository root with Blender (4.x recommended):
    blender --background --python epoch/tools/open_models_in_blender.py
or open Blender, paste this script into the Scripting workspace, and run it.

The imported objects already have a shared hierarchical joint layout.
They are not yet a weight-painted Armature rig; Babylon.js animates transform
joints. Weight painting and motion capture clips can be added in the next pass.
"""
import bpy
from pathlib import Path

SOURCE = Path(__file__).resolve().parent.parent / "assets" / "characters"
if not SOURCE.exists():
    raise FileNotFoundError(f"Avatar assets missing: {SOURCE}")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

for sex, offset in (("male", -1.9), ("female", 1.9)):
    before = {ob.as_pointer() for ob in bpy.data.objects}
    path = SOURCE / f"human_{sex}.glb"
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = [o for o in bpy.data.objects if o.as_pointer() not in before]
    collection = bpy.data.collections.new(f"Epoch {sex.title()} Base")
    bpy.context.scene.collection.children.link(collection)
    for ob in imported:
        if collection.name not in [c.name for c in ob.users_collection]:
            collection.objects.link(ob)
        for c in list(ob.users_collection):
            if c != collection:
                c.objects.unlink(ob)
    roots = [o for o in imported if o.parent not in imported]
    for ob in roots:
        ob.location.x += offset
    # Hide unused hairstyles by default; preserve for customization.
    for ob in imported:
        if any(ob.name.startswith(f"Hair_{n}") for n in range(1,6)):
            ob.hide_set(True)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.world.color = (0.15,0.15,0.15)
scene.unit_settings.system = "METRIC"

output = SOURCE / "epoch_humans_editable.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(output))
print(f"Epoch Blender project saved at: {output}")
