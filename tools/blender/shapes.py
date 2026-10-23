"""Shared organic shape helpers built on geo + noise (no bpy)."""
import numpy as np

import geo
import noise


GEO_SCALE = 0.9      # v2: the textures carry the surface detail, so LOD0 geometry is ~19 % lighter (GLB size limit)


def res(n, q, lo=4):
    """Resolution at quality q (LOD0 = 1.0)."""
    lo = max(min(lo, 3), int(lo * min(1.0, 2.0 * q) + 0.5))      # floors relax at tiny q so LOD2 can shrink enough
    return max(int(n * GEO_SCALE * q + 0.5), lo)


def blob(n, radii, seed=0, amp=0.1, freq=1.2, octaves=3, pos=(0, 0, 0), rot=None, detail=0.0, detail_freq=5.0):
    """Ellipsoid with fbm radial displacement (fraction of radius)."""
    d, f = geo.cube_sphere(n)
    k = 1.0 + amp * noise.fbm(d * 1.0, seed, freq, octaves)
    if detail:
        k = k + detail * noise.perlin(d, seed + 91, detail_freq)
    v = d * k[:, None] * np.asarray(radii, dtype=np.float64)
    return geo.xf((v, f), 1.0, rot, pos)


def slab(n, rx, rz, th, seed=0, power=0.55, rim_ruffle=0.12, ruffle_freq=2.2, bend=None, wave=None):
    """Flattened closed disc ('pancake'): radii rx, rz in the x/z plane, thickness th (y). Rim is ruffled by noise.
    bend(x, z) -> y offset (curved cisternae), wave(x, z) -> y offset (folds). Flat top, rounded rim."""
    d, f = geo.cube_sphere(n)
    # superellipsoid-like squash: keeps the top flat, rim rounded
    s = np.sign(d) * np.abs(d) ** power
    r2 = np.sqrt(d[:, 0] ** 2 + d[:, 2] ** 2)
    rim = np.clip(r2, 0, 1)
    ruf = 1.0 + rim_ruffle * noise.fbm(np.stack([d[:, 0], d[:, 2] * 1.0, np.zeros(len(d))], 1) * 1.0, seed, ruffle_freq, 3)
    x = d[:, 0] * rx * ruf
    z = d[:, 2] * rz * ruf
    y = s[:, 1] * th * (1.0 - 0.25 * rim ** 2)
    if bend is not None:
        y = y + bend(x, z)
    if wave is not None:
        y = y + wave(x, z)
    return np.stack([x, y, z], 1), f


def scatter_on(points_dir, n, seed):
    """n deterministic jittered Fibonacci directions."""
    rng = np.random.default_rng(seed)
    p = geo.fibonacci(n, seed_rot=float(rng.uniform(0, 6.28)))
    p = p + rng.normal(0, 0.04, p.shape)
    return p / np.linalg.norm(p, axis=1, keepdims=True)


def normalize(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def part(name, surf, base, **kw):
    from paint import Part
    return Part(name, surf[0], surf[1], base=base, **kw)


# ---------------------------------------------------------------------------------------------- radial surfaces
def superellipsoid_r(d, abc, p):
    """Radius along unit directions d of |x/a|^p + |y/b|^p + |z/c|^p = 1 (p=2 ellipsoid, p~5 rounded box)."""
    a = np.asarray(abc, dtype=np.float64)
    return (np.abs(d / a) ** p).sum(1) ** (-1.0 / p)


def capsule_r(d, half_len, rad):
    """Radius along unit directions d to a spherocylinder (axis x, cylinder half length half_len, radius rad)."""
    yz = np.sqrt(d[:, 1] ** 2 + d[:, 2] ** 2)
    t_cyl = rad / np.maximum(yz, 1e-9)
    on_cyl = np.abs(t_cyl * d[:, 0]) <= half_len
    cx = np.sign(d[:, 0]) * half_len
    b = cx * d[:, 0]
    t_cap = b + np.sqrt(np.maximum(b * b - cx * cx + rad * rad, 0))
    return np.where(on_cyl, t_cyl, t_cap)


def radial(n, rfn, seed=0, amp=0.0, freq=1.0, octaves=3, detail=0.0, detail_freq=6.0):
    """Closed surface from a radius function over unit directions plus fbm displacement (fraction)."""
    d, f = geo.cube_sphere(n)
    r = rfn(d)
    k = 1.0
    if amp:
        k = k + amp * noise.fbm(d, seed, freq, octaves)
    if detail:
        k = k + detail * noise.perlin(d, seed + 53, detail_freq)
    return d * (r * k)[:, None], f


def offset_surface(surf, dist):
    """Move every vertex along its smooth normal (closed inflation/deflation; keeps topology)."""
    v, f = surf
    return v + geo.normals(v, f) * dist, f
