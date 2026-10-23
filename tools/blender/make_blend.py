"""Hero assets as hand-retouchable .blend files: GLB (LOD0) + UV atlas + baked textures wired into Principled materials.

  blender -b --factory-startup --python tools/blender/make_blend.py -- IDS=nucleus,wall-plant [TIER=high] [MODELS=dir]
Writes tools/blender/blend/<id>.blend (gitignored, large). The images are linked to tools/blender/out/tex/<id>/<tier>/*.png,
so retouch them in Texture Paint mode and save the image; re-encode with tools/textures/encode.mjs afterwards."""
import os
import sys
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
HEROES = ["nucleus", "wall-plant", "membrane-animal", "membrane-plant", "envelope-bacterium", "mitochondrion", "chloroplast",
          "rough-er"]


def args():
    out = {}
    for a in (sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []):
        if "=" in a:
            k, v = a.split("=", 1)
            out[k] = v
    return out


def material(name, kind, d):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tx = {}
    for key, srgb in (("albedo", True), ("normal", False), ("orm", False)):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(str(d / f"{kind}_{key}.png"))
        n.image.colorspace_settings.name = "sRGB" if srgb else "Non-Color"
        tx[key] = n
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nm.uv_map = "UVMap"
    nt.links.new(tx["normal"].outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    sp = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tx["orm"].outputs["Color"], sp.inputs["Color"])
    nt.links.new(sp.outputs["Green"], b.inputs["Roughness"])
    nt.links.new(sp.outputs["Blue"], b.inputs["Metallic"])
    nt.links.new(tx["albedo"].outputs["Color"], b.inputs["Base Color"])
    if kind == "gel":
        nt.links.new(tx["albedo"].outputs["Alpha"], b.inputs["Alpha"])
        m.surface_render_method = "BLENDED"
    return m


def main():
    a = args()
    models = Path(a.get("MODELS") or ROOT / "public" / "models" / "organelles")
    tier = a.get("TIER", "high")
    ids = a["IDS"].split(",") if a.get("IDS") else HEROES
    (HERE / "blend").mkdir(exist_ok=True)
    for asset in ids:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(models / f"{asset}.glb"))
        for nm in ("LOD1", "LOD2"):
            o = bpy.data.objects.get(nm)
            if o:
                for c in list(o.children_recursive):
                    bpy.data.objects.remove(c)
                bpy.data.objects.remove(o)
        d = HERE / "out" / "tex" / asset / tier
        for ob in [o for o in bpy.data.objects if o.type == "MESH"]:
            kind = "gel" if ob.active_material and "gel" in ob.active_material.name else "clay"
            ob.data.materials.clear()
            ob.data.materials.append(material(f"{asset}_{kind}", kind, d))
        path = HERE / "blend" / f"{asset}.blend"
        bpy.ops.wm.save_as_mainfile(filepath=str(path), compress=True, relative_remap=True)
        print("saved", path)


main()
