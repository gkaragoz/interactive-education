"""Closed prism from a polygon cross-section (numpy only): extrude_polygon builds side walls + ear-clipped end caps with chart data."""
import numpy as np

import geo
from clip import _ear_clip


def extrude_polygon(poly, length, nx):
    """poly: (M,2) points in the (y, z) plane, counter-clockwise seen from +X. Prism along +X from 0 to `length` with nx segments."""
    poly = np.asarray(poly, dtype=np.float64)
    M = len(poly)
    xs = np.linspace(0, length, nx + 1)
    V = np.concatenate([np.column_stack([np.full(M, x), poly[:, 0], poly[:, 1]]) for x in xs])
    side, suv = [], []
    for r in range(nx):
        for e in range(M):
            a, b = r * M + e, r * M + (e + 1) % M
            c, d = (r + 1) * M + e, (r + 1) * M + (e + 1) % M
            side += [(a, b, d), (a, d, c)]
            suv += [np.array([(r, e), (r, e + 1), (r + 1, e + 1)], float), np.array([(r, e), (r + 1, e + 1), (r + 1, e)], float)]
    tris = _ear_clip(poly)
    start = [(i, k, j) for (i, j, k) in tris]                 # x = 0 cap faces -X
    end = [(nx * M + i, nx * M + j, nx * M + k) for (i, j, k) in tris]   # x = length cap faces +X
    cuv0 = [np.stack([poly[x] for x in t]) for t in start_idx(tris, start)]
    cuv1 = [np.stack([poly[x] for x in (i, j, k)]) for (i, j, k) in tris]
    faces = np.array(side + start + end, dtype=np.int64)
    uv = np.array(suv + cuv0 + cuv1, dtype=np.float64)
    cid = np.array([0] * len(side) + [1] * len(start) + [2] * len(end))
    geo.reg(faces, uv, cid)
    rep = geo.topology_report(V, faces)
    if rep["inconsistent"] or rep["volumes"][0] < 0:
        faces2 = geo.flipf(faces)
        rep2 = geo.topology_report(V, faces2)
        if rep2["inconsistent"] == 0 and rep2["volumes"][0] > 0:
            return V, faces2
        # caps flipped relative to the sides: swap the cap winding only
        f3 = faces.copy()
        n = len(side)
        f3[n:] = f3[n:][:, ::-1]
        uv3 = uv.copy()
        uv3[n:] = uv3[n:][:, ::-1]
        geo.reg(f3, uv3, cid)
        rep3 = geo.topology_report(V, f3)
        if rep3["inconsistent"] == 0 and rep3["volumes"][0] > 0:
            return V, f3
        f4 = geo.flipf(f3)
        return V, f4
    return V, faces


def start_idx(tris, start):
    return [(i, k, j) for (i, j, k) in tris]


def half_annulus(r_out, r_in, a0, a1, n=24):
    """Polygon of an annular sector (angles in degrees, in the (y, z) plane), counter-clockwise."""
    t = np.radians(np.linspace(a0, a1, n))
    outer = np.column_stack([r_out * np.cos(t), r_out * np.sin(t)])
    inner = np.column_stack([r_in * np.cos(t[::-1]), r_in * np.sin(t[::-1])])
    return np.concatenate([outer, inner])
