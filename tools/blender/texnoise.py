"""Fast numpy noise for texture painting: table-based value noise, anisotropic strokes, cellular noise."""
import numpy as np

_TABLES = {}


def _table(seed):
    if seed not in _TABLES:
        rng = np.random.default_rng(1000 + seed)
        _TABLES[seed] = rng.uniform(-1, 1, 64 * 64 * 64).astype(np.float32)
    return _TABLES[seed]


def vnoise(Q, seed=0):
    """Smooth lattice value noise in [-1, 1]; Q (n,3) float32."""
    T = _table(seed)
    fl = np.floor(Q)
    f = (Q - fl).astype(np.float32)
    i = fl.astype(np.int32) & 63
    u = f * f * f * (f * (f * 6 - 15) + 10)
    x0, y0, z0 = i[:, 0], i[:, 1], i[:, 2]
    x1, y1, z1 = (x0 + 1) & 63, (y0 + 1) & 63, (z0 + 1) & 63

    def g(x, y, z):
        return T[(x * 64 + y) * 64 + z]
    ux, uy, uz = u[:, 0], u[:, 1], u[:, 2]
    c00 = g(x0, y0, z0) * (1 - ux) + g(x1, y0, z0) * ux
    c10 = g(x0, y1, z0) * (1 - ux) + g(x1, y1, z0) * ux
    c01 = g(x0, y0, z1) * (1 - ux) + g(x1, y0, z1) * ux
    c11 = g(x0, y1, z1) * (1 - ux) + g(x1, y1, z1) * ux
    return (c00 * (1 - uy) + c10 * uy) * (1 - uz) + (c01 * (1 - uy) + c11 * uy) * uz


def fbm(Q, seed=0, octaves=2):
    t, a, norm = 0.0, 1.0, 0.0
    for o in range(octaves):
        t = t + a * vnoise(Q * (2.0 ** o), seed + 7 * o)
        norm += a
        a *= 0.5
    return t / norm


def aniso(P, F, freq, k, seed, octaves=2):
    """Noise elongated k times along the unit flow field F (brush strokes)."""
    Q = P * np.float32(freq)
    d = (Q * F).sum(1, keepdims=True)
    return fbm(Q + (np.float32(1.0 / k) - 1) * d * F, seed, octaves)


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def worley_fast(P, freq, seed=0):
    """Cellular noise from jitter tables: returns (F1, F2, cell id in [0,1))."""
    Q = P * np.float32(freq)
    fl = np.floor(Q)
    f = (Q - fl).astype(np.float32)
    i = fl.astype(np.int32)
    Tj = [_table(900 + seed * 4 + k) for k in range(4)]
    b1 = np.full(len(Q), 9.0, np.float32)
    b2 = np.full(len(Q), 9.0, np.float32)
    cid = np.zeros(len(Q), np.float32)
    for dz in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ix, iy, iz = (i[:, 0] + dx) & 63, (i[:, 1] + dy) & 63, (i[:, 2] + dz) & 63
                h = (ix * 64 + iy) * 64 + iz
                jx = Tj[0][h] * 0.5 + 0.5
                jy = Tj[1][h] * 0.5 + 0.5
                jz = Tj[2][h] * 0.5 + 0.5
                d2 = (dx + jx - f[:, 0]) ** 2 + (dy + jy - f[:, 1]) ** 2 + (dz + jz - f[:, 2]) ** 2
                m1 = d2 < b1
                b2 = np.where(m1, b1, np.minimum(b2, d2))
                cid = np.where(m1, Tj[3][h] * 0.5 + 0.5, cid)
                b1 = np.where(m1, d2, b1)
    return np.sqrt(b1), np.sqrt(b2), cid
