"""Ribosome cluster (polysome), lysosome, centrosome (two centrioles), central vacuole."""
import numpy as np

import geo
import noise
from paint import ramp
from shapes import res, part, blob, radial, superellipsoid_r, normalize


def _subunit(n, radii, u, groove, seed, pos, tunnel=None):
    """Lumpy ellipsoid with a groove facing unit vector u (where the other subunit / mRNA sits) and an optional tunnel dimple."""
    d, f = geo.cube_sphere(n)
    k = 1 + 0.1 * noise.fbm(d, seed, 2.0, 3) + 0.03 * noise.perlin(d, seed + 5, 6.0)
    k = k - groove * np.exp(-((np.arccos(np.clip(d @ u, -1, 1))) / 0.5) ** 2)
    if tunnel is not None:
        k = k - 0.12 * np.exp(-((np.arccos(np.clip(d @ tunnel, -1, 1))) / 0.28) ** 2)
    return d * k[:, None] * np.asarray(radii) + pos, f


def ribosome(q):
    """Polysome: large + small subunit pairs (grooved, differently tinted) strung on a thin mRNA strand with tails."""
    rng = np.random.default_rng(81)
    n = 8
    ctrl = np.array([(-0.7, 0.3, -0.05), (-0.58, 0.14, 0.14), (-0.42, 0.02, -0.02), (-0.30, -0.05, 0.05), (-0.18, 0.12, -0.08),
                     (-0.02, 0.08, 0.12), (0.14, -0.1, 0.02), (0.27, -0.02, -0.12), (0.34, 0.14, 0.05),
                     (0.46, 0.22, 0.12), (0.6, 0.12, 0.3), (0.66, -0.04, 0.2)])
    ctrl[3:9] *= 1.3
    path = geo.catmull(ctrl, 24)
    cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))])
    cum /= cum[-1]

    def at(t):
        return np.array([np.interp(t, cum, path[:, k]) for k in range(3)])
    big, small = [], []
    for i, t in enumerate(np.linspace(0.2, 0.8, n)):
        c = at(t)
        tang = normalize(at(min(t + 0.02, 1)) - at(max(t - 0.02, 0)))
        side = normalize(np.cross(tang, (0, 1, 0)) + rng.normal(0, 0.25, 3))
        big.append(_subunit(res(13, q, 3), (0.105, 0.092, 0.1), side, 0.28, 100 + i, c - side * 0.012,
                            tunnel=-side))
        small.append(_subunit(res(11, q, 3), (0.078, 0.055, 0.075), -side, 0.3, 120 + i,
                              c + side * 0.115 + np.array([0, 0.02, 0])))
    strand = geo.tube(path, 0.017, res(8, q, 4), cap=2)
    gb = geo.merge(*big)
    t = 0.5 + 0.5 * noise.fbm(gb[0] * 6.0, 91, 1.0, 2)
    parts = [part("large", gb, ramp(t, [(0, "#e0507a"), (0.5, "#f27a8c"), (1, "#fba898")]), ao=(0.8, 0.25, 14),
                  tint=(0.55, 0.3, 0.45))]
    gs = geo.merge(*small)
    t = 0.5 + 0.5 * noise.fbm(gs[0] * 6.0, 92, 1.0, 2)
    parts.append(part("small", gs, ramp(t, [(0, "#4f5cd0"), (0.5, "#7a82e6"), (1, "#a8b0f4")]), ao=(0.8, 0.25, 14),
                      tint=(0.45, 0.4, 0.65)))
    parts.append(part("mrna", strand, ramp(np.linspace(0, 1, len(strand[0])) % 1.0, [(0, "#f6d060"), (1, "#f0a848")]),
                      ao=(0.6, 0.2, 8), tint=(0.6, 0.5, 0.4)))
    return parts


def _barrel(q, length, rad):
    """Centriole: 9 microtubule triplets in a ring, cartwheel hub with spokes at the proximal end. Axis +x."""
    out = []
    sides = res(8, q, 4)
    nax = res(14, q, 3)
    xs = np.linspace(0, length, nax)
    for i in range(9):
        a = 2 * np.pi * i / 9
        rd = np.array([np.cos(a), np.sin(a)])
        tg = np.array([-np.sin(a), np.cos(a)])
        for j in range(3 if q >= 0.6 else 1):
            off = rd * (rad - 0.036 * j) + tg * (j - 1) * 0.052 + tg * 0.0
            path = np.stack([xs, np.full(nax, off[0]), np.full(nax, off[1])], axis=1)
            out.append(geo.tube(path, 0.045 if j == 0 else 0.04, sides, cap=1))
    hub = geo.tube(np.stack([np.linspace(0.0, 0.1, 3), np.zeros(3), np.zeros(3)], 1), 0.05, res(10, q, 5), cap=1)
    spokes = []
    for i in range(9):
        a = 2 * np.pi * i / 9
        p = np.array([[0.05, 0, 0], [0.05, np.cos(a) * rad * 0.5, np.sin(a) * rad * 0.5],
                      [0.05, np.cos(a) * rad * 0.98, np.sin(a) * rad * 0.98]])
        spokes.append(geo.tube(p, 0.012, 4, cap=1))
    return geo.merge(*out, hub, *spokes)


def centrosome(q):
    parts = []
    mv = geo.xf(_barrel(q, 0.9, 0.24), 1.0, None, (-0.8, 0.0, 0.0))
    dv = geo.xf(_barrel(q, 0.9, 0.24), 1.0, geo.rot_axis((0, 1, 0), -90), (0.42, 0.0, -0.1))
    for name, s, pal in (("mother", mv, [(0, "#2f9d8f"), (0.5, "#3bbfa6"), (1, "#7ee0c0")]),
                         ("daughter", dv, [(0, "#2a7fc0"), (0.5, "#4a9fe0"), (1, "#8ec8f4")])):
        t = 0.5 + 0.5 * noise.fbm(s[0] * 3.0, 3, 1.0, 2)
        parts.append(part(name, s, ramp(t, pal), ao=(0.8, 0.3, 14), tint=(0.45, 0.45, 0.6)))
    rng = np.random.default_rng(31)
    pcm = [blob(res(7, q, 3), (rng.uniform(0.04, 0.075),) * 3, seed=i, amp=0.1,
                pos=np.array([-0.18, 0, 0.05]) + normalize(rng.normal(0, 1, 3)) * rng.uniform(0.5, 0.72)
                * np.array([1.25, 0.7, 0.8])) for i in range(max(int(36 * q * q + 0.5), 6))]
    g = geo.merge(*pcm)
    parts.append(part("pcm", g, ramp(0.5 + 0.5 * noise.fbm(g[0] * 4, 5, 1.0, 2), [(0, "#e8a050"), (1, "#f8d080")]),
                      ao=(0.5, 0.3, 8), tint=(0.7, 0.55, 0.4)))
    return parts


LOD_Q = {"ribosome": (1.0, 0.45, 0.25), "centrosome": (1.0, 0.6, 0.28)}
BUILDERS = {"ribosome": ribosome, "centrosome": centrosome}
