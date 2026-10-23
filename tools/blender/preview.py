"""Render previews of the exported GLBs (Cycles, GTX 1080 Ti) to tools/blender/out/.

  blender -b --factory-startup --python tools/blender/preview.py -- IDS=nucleus,golgi [VIEWS=iso,cut,side] [LOD=0]
          [SIZE=800] [SAMPLES=48] [SHEET=1]

Views: iso (3/4 from above), cut (half removed to see the inside), side (from the side), top.
SHEET=1 additionally writes out/contact_sheet.png (every id that has an iso render).
"""
import math
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = HERE / "out"
MODELS = ROOT / "public" / "models" / "organelles"
for _a in sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []:
    if _a.startswith("MODELS="):
        MODELS = Path(_a[7:])
sys.path.insert(0, str(HERE))
import json  # noqa: E402

ALL_IDS = ["nucleus", "mitochondrion", "rough-er", "smooth-er", "golgi", "ribosome", "lysosome", "centrosome",
           "vacuole", "chloroplast", "nucleoid", "plasmid", "flagellum", "pilus", "membrane-animal",
           "membrane-plant", "wall-plant", "envelope-bacterium"]
VIEWS = {"iso": (0.62, -0.55, 0.62), "side": (0.0, -1.0, 0.12), "top": (0.0, -0.1, 1.0), "cut": (0.35, -0.8, 0.7),
         "back": (-0.6, 0.6, 0.4)}


def args():
    out = {}
    for a in (sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []):
        if "=" in a:
            k, v = a.split("=", 1)
            out[k] = v
    return out


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def setup_render(size, samples):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "CUDA"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = d.type == "CUDA"
        sc.cycles.device = "GPU"
    except Exception:
        sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = -0.55
    sc.view_settings.gamma = 1.0
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    bg.inputs["Color"].default_value = (0.93, 0.87, 0.76, 1)
    bg.inputs["Strength"].default_value = 0.42
    bg2 = nt.nodes.new("ShaderNodeBackground")
    bg2.inputs["Color"].default_value = (0.93, 0.87, 0.76, 1)
    bg2.inputs["Strength"].default_value = 1.55
    lp = nt.nodes.new("ShaderNodeLightPath")
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Camera Ray"], mx.inputs["Fac"])
    nt.links.new(bg.outputs["Background"], mx.inputs[1])
    nt.links.new(bg2.outputs["Background"], mx.inputs[2])
    nt.links.new(mx.outputs["Shader"], nt.nodes["World Output"].inputs["Surface"])
    sc.world = w
    return sc


def preview_material(name, kind, color_name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = color_name
    nt.links.new(vc.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.42 if kind == "clay" else 0.25
    b.inputs["Subsurface Weight"].default_value = 0.12 if kind == "clay" else 0.0
    b.inputs["Subsurface Radius"].default_value = (0.6, 0.3, 0.25)
    b.inputs["Subsurface Scale"].default_value = 0.12
    b.inputs["Coat Weight"].default_value = 0.08 if kind == "clay" else 0.4
    b.inputs["Coat Roughness"].default_value = 0.3
    b.inputs["Specular IOR Level"].default_value = 0.45
    if kind == "gel":
        nt.links.new(vc.outputs["Alpha"], b.inputs["Alpha"])
        m.surface_render_method = "BLENDED"
    return m


def load(asset, lod):
    bpy.ops.import_scene.gltf(filepath=str(MODELS / f"{asset}.glb"))
    keep = f"LOD{lod}"
    for nm in ("LOD0", "LOD1", "LOD2"):
        o = bpy.data.objects.get(nm)
        if o is not None and nm != keep:
            for c in list(o.children_recursive):
                bpy.data.objects.remove(c)
            bpy.data.objects.remove(o)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    for o in meshes:
        me = o.data
        cname = me.color_attributes.active_color.name if me.color_attributes else "Col"
        kind = "gel" if "gel" in (o.active_material.name if o.active_material else "") else "clay"
        o.data.materials.clear()
        o.data.materials.append(preview_material(f"pv_{o.name}", kind, cname))
        o.data.shade_smooth()
    return meshes


def cut(meshes, normal=(0, 0, 1), offset=0.0):
    for o in meshes:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        geom = list(bm.verts) + list(bm.edges) + list(bm.faces)
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector(normal) * offset, plane_no=Vector(normal),
                               clear_outer=True)
        bm.to_mesh(o.data)
        bm.free()


def lights(radius):
    def area(name, loc, energy, size, color):
        d = bpy.data.lights.new(name, "AREA")
        d.energy, d.size, d.color = energy, size, color
        o = bpy.data.objects.new(name, d)
        bpy.context.scene.collection.objects.link(o)
        o.location = loc
        direction = Vector((0, 0, 0)) - Vector(loc)
        o.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    r = radius
    area("key", (-2.2 * r, -2.4 * r, 3.0 * r), 1220 * r * r / 4, 3.5 * r, (1.0, 0.93, 0.82))
    area("fill", (3.0 * r, -1.5 * r, 1.2 * r), 220 * r * r / 4, 4 * r, (0.85, 0.9, 1.0))
    area("rim", (1.0 * r, 3.0 * r, 2.0 * r), 500 * r * r / 4, 3 * r, (1.0, 0.95, 0.9))


def camera(radius, view, lens=70):
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.clip_end = 1000
    cam = bpy.data.objects.new("cam", cd)
    bpy.context.scene.collection.objects.link(cam)
    dirv = Vector(VIEWS[view]).normalized()
    dist = radius * 1.12 / math.tan(math.atan(18.0 / lens)) * 1.05
    cam.location = dirv * dist
    cam.rotation_euler = (-dirv).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    return cam


def render_one(asset, view, lod, size, samples, path):
    reset()
    setup_render(size, samples)
    meta = json.loads((MODELS / f"{asset}.meta.json").read_text())
    meshes = load(asset, lod)
    if view == "cut":
        cut(meshes, (0, -1, 0), 0.0) if False else cut(meshes, (0.0, 0.0, 1.0), 0.0)
    # Blender is z-up; the GLB is y-up so the importer rotates it. Frame on the real bounds.
    r = meta["boundsRadius"]
    lights(r)
    camera(r, view)
    bpy.context.scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def contact_sheet(ids, size=400):
    imgs = []
    for a in ids:
        p = OUT / f"{a}_iso.png"
        if p.exists():
            imgs.append(bpy.data.images.load(str(p)))
    if not imgs:
        return
    cols = 6
    rows = (len(imgs) + cols - 1) // cols
    sheet = np.ones((rows * size, cols * size, 4), dtype=np.float32)
    sheet[..., :3] = (0.93, 0.87, 0.76)
    for i, im in enumerate(imgs):
        w, h = im.size
        arr = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
        step = max(w // size, 1)
        arr = arr[::step, ::step][:size, :size]
        r, c = divmod(i, cols)
        y0 = (rows - 1 - r) * size
        sheet[y0:y0 + arr.shape[0], c * size:c * size + arr.shape[1]] = arr
    out = bpy.data.images.new("sheet", cols * size, rows * size, alpha=True)
    out.pixels.foreach_set(sheet.ravel())
    out.filepath_raw = str(OUT / "contact_sheet.png")
    out.file_format = "PNG"
    out.save()


def main():
    a = args()
    OUT.mkdir(exist_ok=True)
    ids = a["IDS"].split(",") if a.get("IDS") else ALL_IDS
    views = a.get("VIEWS", "iso").split(",")
    lod = int(a.get("LOD", 0))
    size = int(a.get("SIZE", 800))
    samples = int(a.get("SAMPLES", 48))
    for asset in ids:
        for v in views:
            suffix = f"_lod{lod}" if lod else ""
            render_one(asset, v, lod, size, samples, OUT / f"{asset}_{v}{suffix}.png")
            print("rendered", asset, v)
    if a.get("SHEET"):
        reset()
        contact_sheet(ALL_IDS)


main()
