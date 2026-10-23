"""UV unwrap + atlas packing (one atlas per material), LOD UV transfer and UV statistics. Needs bpy."""
import math

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def _select(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]


def unwrap_pack(groups, margin=0.006, angle=89.0):
    angle = float(angle)
    """groups: {material: [LOD0 objects]}. Smart-project, equalise texel density across the group, pack into 0..1."""
    for objs in groups.values():
        _select(objs)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=0.0, scale_to_bounds=False)
        bpy.ops.uv.select_all(action="SELECT")
        bpy.ops.uv.average_islands_scale()
        bpy.ops.uv.pack_islands(margin=margin, margin_method="FRACTION", rotate=True, scale=True, shape_method="CONCAVE")
        bpy.ops.object.mode_set(mode="OBJECT")
        for o in objs:                    # snap to 1/8192: far better meshopt compression, invisible
            set_uv(o, np.round(get_uv(o) * 8192.0) / 8192.0)
    bpy.ops.object.select_all(action="DESELECT")


def get_uv(ob):
    me = ob.data
    uv = np.empty(len(me.loops) * 2, dtype=np.float32)
    me.uv_layers.active.data.foreach_get("uv", uv)
    return uv.reshape(-1, 2).astype(np.float64)


def set_uv(ob, uv):
    ob.data.uv_layers.active.data.foreach_set("uv", np.asarray(uv, dtype=np.float32).ravel())


def _tri_arrays(ob):
    me = ob.data
    n = len(me.polygons)
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    lv = np.empty(len(me.loops), dtype=np.int64)
    me.loops.foreach_get("vertex_index", lv)
    return co, lv.reshape(n, 3)          # all polygons are triangles (from_pydata with triangle lists)


def transfer_uv(src, dst):
    """Give `dst` (a lower LOD of the same part) UVs from `src` (LOD0): per triangle, the nearest LOD0 triangle's affine
    UV map is extrapolated to the corners, so triangles never stretch across island seams."""
    sco, sidx = _tri_arrays(src)
    suv = get_uv(src).reshape(-1, 3, 2)
    dco, didx = _tri_arrays(dst)
    tree = BVHTree.FromPolygons([tuple(v) for v in sco.tolist()], [tuple(t) for t in sidx.tolist()], epsilon=0.0)
    cen = dco[didx].mean(1)
    out = np.empty((len(didx), 3, 2))
    for i in range(len(didx)):
        loc, nrm, fi, dist = tree.find_nearest(Vector(cen[i]))
        a, b, c = sco[sidx[fi]]
        ua, ub, uc = suv[fi]
        e1, e2 = b - a, c - a
        d11, d12, d22 = e1 @ e1, e1 @ e2, e2 @ e2
        den = d11 * d22 - d12 * d12 or 1e-12
        for k in range(3):
            w = dco[didx[i, k]] - a
            d1, d2 = w @ e1, w @ e2
            b1 = (d22 * d1 - d12 * d2) / den
            b2 = (d11 * d2 - d12 * d1) / den
            out[i, k] = ua + b1 * (ub - ua) + b2 * (uc - ua)
    set_uv(dst, np.round(out.reshape(-1, 2) * 8192.0) / 8192.0)


def uv_stats(objs, res=1024):
    """Range, atlas coverage, overlap ratio (texels hit by more than one triangle / covered texels), stretch."""
    count = np.zeros((res, res), dtype=np.uint8)
    lo, hi = np.array([1e9, 1e9]), np.array([-1e9, -1e9])
    stretch = []
    for ob in objs:
        co, idx = _tri_arrays(ob)
        uv = get_uv(ob).reshape(-1, 3, 2)
        lo, hi = np.minimum(lo, uv.min((0, 1))), np.maximum(hi, uv.max((0, 1)))
        a3 = np.linalg.norm(np.cross(co[idx[:, 1]] - co[idx[:, 0]], co[idx[:, 2]] - co[idx[:, 0]]), axis=1) / 2
        e1, e2 = uv[:, 1] - uv[:, 0], uv[:, 2] - uv[:, 0]
        a2 = np.abs(e1[:, 0] * e2[:, 1] - e1[:, 1] * e2[:, 0]) / 2
        stretch.append(np.sqrt(np.maximum(a2, 1e-14) / np.maximum(a3, 1e-14)))
        p = uv * res
        for t in range(len(p)):
            tri = p[t]
            x0, y0 = np.floor(tri.min(0)).astype(int)
            x1, y1 = np.ceil(tri.max(0)).astype(int)
            x0, y0 = max(x0, 0), max(y0, 0)
            x1, y1 = min(x1, res - 1), min(y1, res - 1)
            if x1 < x0 or y1 < y0:
                continue
            xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5137, np.arange(y0, y1 + 1) + 0.4789)
            (ax, ay), (bx, by), (cx, cy) = tri
            den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
            if abs(den) < 1e-12:
                continue
            w1 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / den
            w2 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / den
            m = (w1 >= 0) & (w2 >= 0) & (1 - w1 - w2 >= 0)
            count[y0:y1 + 1, x0:x1 + 1] += m.astype(np.uint8)
    cov = int((count > 0).sum())
    st = np.concatenate(stretch)
    med = float(np.median(st))
    ratio = st / med
    return dict(uvMin=[round(float(x), 4) for x in lo], uvMax=[round(float(x), 4) for x in hi],
                coverage=round(cov / res / res, 4), overlap=round(float((count > 1).sum()) / max(cov, 1), 5),
                stretchP95=round(float(np.percentile(ratio, 95)), 3), stretchP05=round(float(np.percentile(ratio, 5)), 3))
