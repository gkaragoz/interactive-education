"""Nucleus: pored outer envelope, inner membrane (double envelope), nucleolus, chromatin clumps."""
import numpy as np

import geo
import noise
from paint import ramp, mix
from shapes import blob, res, part, normalize

R = 3.0
W = 0.115                                   # angular radius of a pore ring (rad)
VIOLET = [(0.0, "#4b2a93"), (0.35, "#6f45bd"), (0.65, "#8a58cf"), (1.0, "#b987e6")]


def _pore_profile(x):
    return 0.9 * np.exp(-((x - 1.0) / 0.34) ** 2) - 1.7 * np.exp(-(x / 0.62) ** 2)


def nucleus(q):
    parts = []
    # ---- outer envelope with nuclear pores (rings with a dimple), mottled violet
    pores = geo.fibonacci(72, 0.4)
    d, f = geo.cube_sphere(res(46, q, 10))
    k = R * (1 + 0.028 * noise.fbm(d, 3, 1.4, 3) + 0.01 * noise.perlin(d, 5, 6.0))
    k = k + geo.bumps(d, pores, 0.062, W, _pore_profile)
    V = d * k[:, None]
    n_dir = normalize(V)
    dim = geo.bumps(d, pores, 1.0, W, lambda x: np.exp(-(x / 0.78) ** 2))
    ring = geo.bumps(d, pores, 1.0, W, lambda x: np.exp(-((x - 1.05) / 0.4) ** 2))
    t = 0.5 + 0.5 * noise.fbm(V * 0.45, 11, 1.0, 3)
    t = np.clip(t + 0.22 * (n_dir[:, 1] - 0.0) - 0.1 * noise.worley(V, 4, 1.7)[0], 0, 1)
    col = ramp(t, VIOLET)
    patch = noise.smoothstep(0.55, 0.8, noise.fbm(V * 0.7, 21, 1.0, 2))[:, None]
    col = mix(col, ramp(np.full(len(V), 0.3), [(0, "#4f56cc"), (1, "#4f56cc")]), 0.45 * patch[:, 0])
    col = mix(col, ramp(t * 0 + 0.0, [(0, "#2d1766"), (1, "#2d1766")]), np.clip(dim * 0.85, 0, 0.9))
    col = col + 0.07 * np.clip(ring, 0, 1)[:, None]
    parts.append(part("envelope", (V, f), col, ao=(0.8, 0.9, 20), tint=(0.50, 0.38, 0.72)))

    # ---- inner nuclear membrane: smooth, lighter, close under the outer one (the double envelope in the cut)
    d, f = geo.cube_sphere(res(22, q, 8))
    V = d * (R - 0.2) * (1 + 0.012 * noise.fbm(d, 8, 2.0, 2))[:, None]
    t = 0.5 + 0.5 * noise.fbm(V * 0.5, 12, 1.0, 2)
    parts.append(part("inner", (V, f), ramp(t, [(0, "#8c63cf"), (1, "#c4a0ee")]), occ=False,
                      ao=(0.5, 0.8, 12), tint=(0.6, 0.45, 0.8)))

    # ---- nucleolus: glossy dark violet ball, off-centre, slightly lumpy
    pos = np.array([0.55, 0.3, -0.35])
    d, f = geo.cube_sphere(res(24, q, 8))
    fc = geo.fibonacci(9, 2.0)
    k = (1 + 0.06 * noise.fbm(d, 31, 1.8, 3) + 0.012 * noise.perlin(d, 33, 7.0)) * 0.92
    k = k + geo.bumps(d, fc, 0.1, 0.32)
    V = d * k[:, None] * np.array([1.0, 0.95, 1.0]) + pos
    t = 0.5 + 0.5 * noise.fbm(V * 1.6, 14, 1.0, 3)
    col = ramp(t, [(0, "#3b1c86"), (0.5, "#5a31b3"), (1.0, "#8a58e0")])
    parts.append(part("nucleolus", (V, f), col, ao=(0.75, 1.0, 20), tint=(0.5, 0.4, 0.75)))

    # ---- chromatin: thick fibre loops hugging the lamina plus clumps and loose strands near the nucleolus
    rng = np.random.default_rng(5)
    pieces = []
    rr0 = R - 0.2 - 0.3
    for i in range(10):
        a = normalize(rng.normal(0, 1, 3))
        b = normalize(np.cross(a, rng.normal(0, 1, 3)))
        pts = []
        ang = rng.uniform(0, 6.28)
        dirv = a
        for k in range(9):
            pts.append(dirv * (rr0 - rng.uniform(0, 0.12)))
            ang += rng.uniform(-0.6, 0.6)
            step = rng.uniform(0.2, 0.3)
            tgt = normalize(np.cross(dirv, b)) * np.cos(ang) + b * np.sin(ang)
            dirv = normalize(dirv + tgt * step)
        path = geo.catmull(np.array(pts), res(5, q, 2))
        pieces.append(geo.tube(path, 0.085 + 0.02 * rng.random(), res(8, q, 4), cap=2))
    for i in range(14):
        c = normalize(rng.normal(0, 1, 3)) * rng.uniform(0.9, 1.6)
        if np.linalg.norm(c - pos) < 1.1:
            c = c + normalize(c - pos) * 0.8
        path = geo.catmull([c, c + rng.normal(0, 0.28, 3), c + rng.normal(0, 0.4, 3), c + rng.normal(0, 0.5, 3)],
                           res(4, q, 2))
        pieces.append(geo.tube(path, 0.035, res(6, q, 4), cap=2))
    for i in range(7):
        cdir = normalize(rng.normal(0, 1, 3))
        axes = rng.uniform(0.25, 0.4, 3)
        pieces.append(blob(res(8, q, 4), axes * (1.3, 0.6, 1.0), seed=40 + i, amp=0.18, freq=1.6,
                           pos=cdir * (rr0 - 0.05), rot=geo.align((0, 1, 0), cdir)))
    for i in range(int(48 * q * q + 0.5) + 6):          # euchromatin granules in the nucleoplasm
        c = normalize(rng.normal(0, 1, 3)) * rng.uniform(0.3, 2.3)
        if np.linalg.norm(c - pos) > 1.15:
            pieces.append(blob(res(3, q, 2), (0.06,) * 3, seed=i, amp=0.15, pos=c))
    ch = geo.merge(*pieces)
    t = 0.5 + 0.5 * noise.fbm(ch[0] * 1.1, 17, 1.0, 3)
    col = ramp(t, [(0, "#5a2fa6"), (0.5, "#8b52d0"), (1, "#c08cf0")])
    parts.append(part("chromatin", ch, col, ao=(0.75, 0.6, 14), tint=(0.5, 0.35, 0.8)))
    return parts


BUILDERS = {"nucleus": nucleus}
