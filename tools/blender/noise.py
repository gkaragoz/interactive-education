"""Vectorised, deterministic 3D noise on numpy arrays (no bpy). All functions take points of shape (N, 3)."""
import numpy as np

_M = np.uint32(0xFFFFFFFF)


def _hash(ix, iy, iz, seed):
    """Integer lattice hash -> float in [0, 1)."""
    with np.errstate(over="ignore"):
        h = (ix.astype(np.uint32) * np.uint32(374761393)
             + iy.astype(np.uint32) * np.uint32(668265263)
             + iz.astype(np.uint32) * np.uint32(2147483629)
             + np.uint32((seed * 1274126177 + 12345) & 0xFFFFFFFF))
        h = (h ^ (h >> np.uint32(13))) * np.uint32(1274126177)
        h = h ^ (h >> np.uint32(16))
        h = h * np.uint32(2246822519)
        h = h ^ (h >> np.uint32(15))
    return (h & np.uint32(0xFFFFFF)).astype(np.float64) / float(0x1000000)


def _fade(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def perlin(p, seed=0, freq=1.0):
    """Gradient noise, roughly in [-1, 1]."""
    q = np.asarray(p, dtype=np.float64) * freq
    i = np.floor(q)
    f = q - i
    i = i.astype(np.int64)
    u = _fade(f)
    out = 0.0
    acc = []
    for dz in (0, 1):
        for dy in (0, 1):
            for dx in (0, 1):
                ix, iy, iz = i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz
                g = np.stack([_hash(ix, iy, iz, seed * 3 + k) * 2 - 1 for k in range(3)], axis=1)
                d = f - np.array([dx, dy, dz])
                acc.append(((g * d).sum(1), dx, dy, dz))
    res = {}
    for val, dx, dy, dz in acc:
        res[(dx, dy, dz)] = val
    x0 = res[(0, 0, 0)] * (1 - u[:, 0]) + res[(1, 0, 0)] * u[:, 0]
    x1 = res[(0, 1, 0)] * (1 - u[:, 0]) + res[(1, 1, 0)] * u[:, 0]
    x2 = res[(0, 0, 1)] * (1 - u[:, 0]) + res[(1, 0, 1)] * u[:, 0]
    x3 = res[(0, 1, 1)] * (1 - u[:, 0]) + res[(1, 1, 1)] * u[:, 0]
    y0 = x0 * (1 - u[:, 1]) + x1 * u[:, 1]
    y1 = x2 * (1 - u[:, 1]) + x3 * u[:, 1]
    out = y0 * (1 - u[:, 2]) + y1 * u[:, 2]
    return out * 1.7


def fbm(p, seed=0, freq=1.0, octaves=4, gain=0.5, lac=2.03):
    """Fractal sum of perlin, normalised to roughly [-1, 1]."""
    total, amp, norm = 0.0, 1.0, 0.0
    for o in range(octaves):
        total = total + amp * perlin(p, seed + o * 17, freq * lac ** o)
        norm += amp
        amp *= gain
    return total / norm


def ridged(p, seed=0, freq=1.0, octaves=3):
    """Ridge noise in [0, 1]: sharp crests (brain-like folds, wrinkles)."""
    total, amp, norm = 0.0, 1.0, 0.0
    for o in range(octaves):
        n = 1.0 - np.abs(perlin(p, seed + o * 31, freq * 2.0 ** o))
        total = total + amp * n * n
        norm += amp
        amp *= 0.5
    return total / norm


def worley(p, seed=0, freq=1.0):
    """Cellular noise: returns (F1 distance, cell id in [0,1))."""
    q = np.asarray(p, dtype=np.float64) * freq
    i = np.floor(q).astype(np.int64)
    f = q - np.floor(q)
    best = np.full(len(q), 9.0)
    cid = np.zeros(len(q))
    for dz in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ix, iy, iz = i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz
                jit = np.stack([_hash(ix, iy, iz, seed * 5 + k) for k in range(3)], axis=1)
                d = (np.array([dx, dy, dz]) + jit - f)
                dist = np.sqrt((d * d).sum(1))
                m = dist < best
                best = np.where(m, dist, best)
                cid = np.where(m, _hash(ix, iy, iz, seed * 5 + 7), cid)
    return best, cid


def worley2(p, seed=0, freq=1.0):
    """Cellular noise: (F1, F2, cell id). F2-F1 is ~0 on cell borders (grooves between plates)."""
    q = np.asarray(p, dtype=np.float64) * freq
    i = np.floor(q).astype(np.int64)
    f = q - np.floor(q)
    b1 = np.full(len(q), 9.0)
    b2 = np.full(len(q), 9.0)
    cid = np.zeros(len(q))
    for dz in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ix, iy, iz = i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz
                jit = np.stack([_hash(ix, iy, iz, seed * 5 + k) for k in range(3)], axis=1)
                d = np.array([dx, dy, dz]) + jit - f
                dist = np.sqrt((d * d).sum(1))
                m1 = dist < b1
                b2 = np.where(m1, b1, np.minimum(b2, dist))
                cid = np.where(m1, _hash(ix, iy, iz, seed * 5 + 7), cid)
                b1 = np.where(m1, dist, b1)
    return b1, b2, cid


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)
