"""Decor-only assets: cytoskeleton (branching ochre filament network) and vesicle (glossy translucent spheres)."""
import numpy as np

import geo
import noise
from paint import ramp
from shapes import res, part, normalize

HALF = 6.0          # cytoskeleton volume: about 12 um across


def _filament(rng, start, direction, length, stiff=0.12, step=0.3):
    """Smooth persistent random walk inside the cube; returns control points."""
    pts = [start]
    d = normalize(direction)
    p = start.copy()
    for _ in range(int(length / step)):
        d = normalize(d + rng.normal(0, stiff, 3))
        q = p + d * step
        for k in range(3):                       # bounce off the volume boundary
            if abs(q[k]) > HALF:
                d[k] = -d[k]
                q[k] = np.sign(q[k]) * HALF
        p = q
        pts.append(p.copy())
    return np.array(pts)


def cytoskeleton(q):
    rng = np.random.default_rng(404)
    filaments = []          # (control points, radius, kind)
    for i in range(14):                         # main microtubule-like cables radiating from a centre region
        s = normalize(rng.normal(0, 1, 3)) * rng.uniform(0.3, 1.8)
        filaments.append((_filament(rng, s, rng.normal(0, 1, 3), rng.uniform(7, 11)), 0.085, 0))
    for i in range(len(filaments) * 2):         # branches: thinner actin-like filaments leaving the cables
        pts, _, _ = filaments[int(rng.integers(0, 14))]
        j = int(rng.integers(3, len(pts) - 3))
        d = normalize(np.cross(pts[j + 1] - pts[j - 1], rng.normal(0, 1, 3)) + 0.7 * (pts[j + 1] - pts[j - 1]))
        filaments.append((_filament(rng, pts[j], d, rng.uniform(2.5, 5.5), 0.2), 0.052, 1))
    pieces, kinds = [], []
    keep = max(int(len(filaments) * (0.35 + 0.65 * min(q, 1.0) ** 1.5) + 0.5), 8)    # fewer filaments at lower LODs
    for pts, r, kind in filaments[:keep]:
        path = geo.catmull(pts, res(4, q, 2))
        s = np.linspace(0, 1, len(path))
        rad = r * (0.55 + 0.45 * np.sin(np.pi * np.clip(s * 1.0, 0, 1)) ** 0.35)      # soft tapered ends
        rad = rad * (1 + 0.08 * np.sin(np.arange(len(path)) * (1.3 if kind else 0.7)))   # subunit beading
        surf = geo.tube(path, rad, res(8, q, 3), cap=2 if q > 0.4 else 1)
        pieces.append(surf)
        kinds.append(kind)
    g = geo.merge(*pieces)
    kid = np.concatenate([np.full(len(p[0]), k) for p, k in zip(pieces, kinds)])
    t = 0.5 + 0.5 * noise.fbm(g[0] * 0.35, 5, 1.0, 3)
    cab = ramp(t, [(0, "#c4801f"), (0.5, "#e69a30"), (1, "#f5b95a")])
    act = ramp(t, [(0, "#d9602a"), (0.5, "#ee7a36"), (1, "#f79a58")])
    col = np.where(kid[:, None] == 0, cab, act)
    return [part("filaments", g, col, ao=(0.7, 1.0, 12), tint=(0.55, 0.38, 0.28))]


def vesicle(q):
    spec = [(0.5, (0.0, 0.0, 0.0), "#e86a9a", "#a8386a"), (0.34, (0.78, 0.15, 0.2), "#6aa8e8", "#3a68b0"),
            (0.24, (-0.2, -0.55, 0.45), "#f0b058", "#c07828")]
    pieces, cols = [], []
    for i, (r, c, hi, lo) in enumerate(spec):
        d, f = geo.cube_sphere(res(26, q, 5))
        k = r * (1 + 0.025 * noise.fbm(d, 20 + i, 1.8, 3) + 0.01 * noise.perlin(d, 30 + i, 6.0))
        outer = (d * k[:, None] + np.array(c), f)
        inner = (d * (k * 0.8)[:, None] + np.array(c), geo.flipf(f))
        pieces.append(geo.merge(outer, inner))
        t = 0.5 + 0.5 * noise.fbm(outer[0] * 2.0, 40 + i, 1.0, 2)
        co = ramp(np.clip(t * 0.6 + 0.4 * normalize(outer[0] - np.array(c))[:, 1] * 0.5 + 0.3, 0, 1), [(0, lo), (1, hi)])
        ci = ramp(t, [(0, lo), (1, lo)]) * 0.8
        cols.append(np.concatenate([co, ci]))
    g = geo.merge(*pieces)
    alpha = np.concatenate([np.concatenate([np.full(len(p[0]) // 2, 0.5), np.full(len(p[0]) // 2, 0.7)]) for p in pieces])
    return [part("spheres", g, np.concatenate(cols), mat="gel", alpha=alpha, hollow=True, occ=False, ao=(0.5, 0.4, 10),
                 tint=(0.7, 0.6, 0.7), speck=0.04)]


NO_TEXTURES = {"cytoskeleton", "vesicle"}
BUILDERS = {"cytoskeleton": cytoskeleton, "vesicle": vesicle}
