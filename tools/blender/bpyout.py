"""Blender side: Parts -> objects (LOD groups), materials, validation, GLB export, meta.json."""
import json
import re
from pathlib import Path

import bpy
import numpy as np

import geo
import glbinfo

NAME_OK = re.compile(r"^[A-Za-z0-9_\-]+$")
LODS = (0, 1, 2)
GRID = 4096.0


class Scratch:
    """Remove every datablock created inside the scope (never touches existing ones)."""
    COLLS = ("objects", "meshes", "materials", "images", "node_groups")

    def __enter__(self):
        self.before = {k: set(getattr(bpy.data, k)) for k in self.COLLS}
        return self

    def __exit__(self, *exc):
        for k in self.COLLS:
            coll = getattr(bpy.data, k)
            for d in [d for d in coll if d not in self.before[k]]:
                try:
                    coll.remove(d)
                except Exception:
                    pass
        return False


def make_material(name, kind):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "Col"
    nt.links.new(vc.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.55 if kind == "clay" else 0.35
    if kind == "gel":
        nt.links.new(vc.outputs["Alpha"], b.inputs["Alpha"])
        m.surface_render_method = "BLENDED"
    return m


def uv_cube(V, F):
    """Per-loop cube-projected UVs: dominant axis of the face normal, 1 unit per 2 um, (M*3, 2)."""
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    ax = np.abs(fn).argmax(1)
    P = V[F] / 2.0                                   # (M,3,3)
    pick = np.array([[1, 2], [0, 2], [0, 1]])
    uv = np.empty((len(F), 3, 2))
    for a in range(3):
        sel = ax == a
        uv[sel] = P[sel][:, :, pick[a]]
    return uv.reshape(-1, 2)


def to_object(name, part, V, parent, mats):
    """Game coords (y up) -> Blender (z up), then a mesh object with COLOR layer, UVs, smooth shading."""
    B = np.stack([V[:, 0], -V[:, 2], V[:, 1]], axis=1)
    me = bpy.data.meshes.new(name)
    me.from_pydata(B.tolist(), [], part.F.tolist())
    me.shade_smooth()
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    col = np.asarray(part.col, dtype=np.float32)
    ca.data.foreach_set("color", col.ravel())
    me.color_attributes.active_color = ca
    uv = me.uv_layers.new(name="UVMap")
    uv.data.foreach_set("uv", (np.round(uv_cube(V, part.F) * 512) / 512).astype(np.float32).ravel())
    me.materials.append(mats[part.mat])
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = parent
    return ob


def bm_check(ob):
    """bmesh watertight check on the actual Blender mesh: boundary / non-manifold edges and verts."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bad_e = sum(1 for e in bm.edges if len(e.link_faces) != 2)
    bad_v = sum(1 for v in bm.verts if not v.is_manifold)
    bm.free()
    return bad_e, bad_v


def validate(asset, lods, problems):
    """Pure checks on the numpy parts; appends human-readable strings to `problems`."""
    mats = {p.mat for lod in lods.values() for p in lod}
    if len(mats) > 2:
        problems.append(f"{asset}: more than 2 materials")
    tris = {}
    for k, parts in lods.items():
        tris[k] = sum(len(p.F) for p in parts)
        for p in parts:
            nm = f"{asset}-{p.name}"
            if not NAME_OK.match(nm):
                problems.append(f"bad name {nm}")
            if p.col is None or len(p.col) != len(p.V):
                problems.append(f"{nm} LOD{k}: colour missing")
            r = geo.topology_report(p.V, p.F)
            if r["boundary"] or r["nonmanifold"] or r["inconsistent"] or r["degenerate"]:
                problems.append(f"{nm} LOD{k}: not closed/manifold {r['boundary']}b {r['nonmanifold']}n "
                                f"{r['inconsistent']}i {r['degenerate']}d")
            neg = sum(1 for v in r["volumes"] if v < 0)
            if neg > (len(r["volumes"]) // 2 if p.hollow else 0):
                problems.append(f"{nm} LOD{k}: {neg} inward-facing component(s)")
            if np.isnan(p.V).any():
                problems.append(f"{nm} LOD{k}: NaN vertices")
    if tris[0] > 60000:
        problems.append(f"{asset}: LOD0 {tris[0]} > 60000")
    if tris[1] > 0.30 * tris[0]:
        problems.append(f"{asset}: LOD1 {tris[1]} > 30% of LOD0 {tris[0]}")
    if tris[2] > 0.60 * tris[1]:
        problems.append(f"{asset}: LOD2 {tris[2]} > 60% of LOD1 {tris[1]}")
    if tris[2] < 300:
        problems.append(f"{asset}: LOD2 {tris[2]} < 300")
    return tris


def build_and_export(asset, lods, out_dir, generator, seed, extra_meta=None):
    """lods: {0: [Part], 1: [...], 2: [...]} in game coords. Writes <asset>.glb + <asset>.meta.json."""
    problems = []
    tris = validate(asset, lods, problems)
    if problems:
        raise ValueError("\n".join(problems))
    allv = np.concatenate([p.V for p in lods[0]])
    lo, hi = allv.min(0), allv.max(0)
    centre = (lo + hi) / 2
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    glb = out_dir / f"{asset}.glb"
    with Scratch():
        mats = {k: make_material(f"{asset}_{k}", k) for k in sorted({p.mat for ps in lods.values() for p in ps})}
        root = bpy.data.objects.new(asset, None)
        bpy.context.scene.collection.objects.link(root)
        made = [root]
        suffix = {0: "", 1: "-lod1", 2: "-lod2"}
        for k in LODS:
            grp = bpy.data.objects.new(f"LOD{k}", None)
            bpy.context.scene.collection.objects.link(grp)
            grp.parent = root
            made.append(grp)
            for p in lods[k]:
                ob = to_object(f"{asset}-{p.name}{suffix[k]}", p, p.V - centre, grp, mats)
                made.append(ob)
                if k == 0:
                    e, v = bm_check(ob)
                    if e or v:
                        raise ValueError(f"{asset}-{p.name}: bmesh found {e} bad edges, {v} non-manifold verts")
        bpy.ops.object.select_all(action="DESELECT")
        for o in made:
            o.select_set(True)
        bpy.context.view_layer.objects.active = root
        bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True, export_yup=True,
                                  export_apply=False, export_animations=False, export_cameras=False,
                                  export_lights=False, export_vertex_color="MATERIAL",
                                  export_meshopt_compression_enable=True)
    summary, matnames, ext = glbinfo.summarize(glb)
    for k in LODS:
        s = summary.get(f"LOD{k}")
        if not s or not s["color0"]:
            raise ValueError(f"{asset}: LOD{k} missing in GLB or COLOR_0 missing")
        if s["tris"] != tris[k]:
            raise ValueError(f"{asset}: LOD{k} exported {s['tris']} tris, expected {tris[k]}")
    size = glb.stat().st_size
    if size > 1.5 * 1024 * 1024:
        raise ValueError(f"{asset}: {size} bytes > 1.5 MB")
    meta = dict(id=asset, tris={f"LOD{k}": tris[k] for k in LODS},
                bboxMin=[round(float(x), 4) for x in (lo - centre)], bboxMax=[round(float(x), 4) for x in (hi - centre)],
                boundsRadius=round(float(np.linalg.norm(allv - centre, axis=1).max()), 4), closed=True,
                generator="tools/blender/make_organelles.py", seed=seed, bytes=size)
    meta.update(extra_meta or {})
    (out_dir / f"{asset}.meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    return meta, matnames, ext
