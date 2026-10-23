"""Lysosome (thick-rimmed gel, multilamellar bodies, granules, digestive vesicles) and central vacuole."""
import numpy as np

import geo
import noise
from paint import ramp
from shapes import res, part, blob, radial, superellipsoid_r, normalize, slab


def _hollow_ball(n, r, th, seed, pos, amp=0.04):
    """Thin closed shell (outer outward + inner flipped) used for onion-like lamellae."""
    d, f = geo.cube_sphere(n)
    k = 1 + amp * noise.fbm(d, seed, 2.0, 2)
    outer = (d * (r * k)[:, None] + pos, f)
    inner = (d * ((r - th) * k)[:, None] + pos, geo.flipf(f))
    return geo.merge(outer, inner)


def lysosome(q):
    R = 0.55
    rng = np.random.default_rng(91)
    studs = geo.fibonacci(52, 0.7)
    d, f = geo.cube_sphere(res(24, q, 8))
    k = R * (1 + 0.02 * noise.fbm(d, 5, 1.6, 3)) + geo.bumps(d, studs, 0.024, 0.07)
    vo = (d * k[:, None], f)
    di, fi = geo.cube_sphere(res(14, q, 6))
    vi = (di * (R - 0.07) * (1 + 0.02 * noise.fbm(di, 6, 1.6, 2))[:, None], geo.flipf(fi))
    s = geo.merge(vo, vi)
    co = ramp(0.5 + 0.5 * noise.fbm(vo[0] * 1.5, 6, 1.0, 3), [(0, "#6b5ad0"), (0.5, "#8a6ee0"), (1, "#c08ae8")])
    ci = ramp(0.5 + 0.5 * noise.fbm(vi[0] * 2.0, 7, 1.0, 2), [(0, "#4a2f9a"), (1, "#8a4fb8")])
    alpha = np.concatenate([np.full(len(vo[0]), 0.5), np.full(len(vi[0]), 0.42)])
    parts = [part("membrane", s, np.concatenate([co, ci]), mat="gel", alpha=alpha, hollow=True, occ=False,
                  ao=(0.5, 0.5, 10), tint=(0.6, 0.5, 0.8))]
    pieces, cid = [], []
    centres = [np.array(c) for c in ((0.12, 0.1, 0.05), (-0.17, -0.06, 0.12), (0.0, -0.14, -0.17))]
    for bi, c in enumerate(centres):                           # multilamellar bodies: concentric thin shells
        layers = ((0.17, 0.02), (0.125, 0.018), (0.085, 0.016), (0.045, 0.03))
        layers = layers if q >= 0.6 else (layers[::2] if q >= 0.35 else layers[:1])
        for li, (rr, th) in enumerate(layers):
            pieces.append(_hollow_ball(res(9, q, 3), rr, th, bi * 7 + li, c, 0.03))
            cid.append(0.1 + 0.25 * (li % 2) + 0.3 * bi / 3)
    for i in range(int(46 * q * q + 0.5) + 6):                 # dense granules
        c = normalize(rng.normal(0, 1, 3)) * rng.uniform(0.0, 0.38)
        pieces.append(blob(res(3, q, 2), (0.032,) * 3, seed=i, amp=0.15, pos=c))
        cid.append(0.05)
    for i in range(5):                                         # small digestive vesicles
        c = normalize(rng.normal(0, 1, 3)) * rng.uniform(0.2, 0.33)
        pieces.append(blob(res(7, q, 3), (0.06 + 0.02 * rng.random(),) * 3, seed=60 + i, amp=0.1, pos=c))
        cid.append(0.75 + 0.05 * i)
    g = geo.merge(*pieces)
    ids = np.concatenate([np.full(len(p[0]), v) for p, v in zip(pieces, cid)])
    t = np.clip(ids + 0.1 * noise.fbm(g[0] * 3, 8, 1.0, 2), 0, 1)
    parts.append(part("contents", g, ramp(t, [(0, "#34227a"), (0.25, "#5b3aa8"), (0.45, "#b0509e"), (0.7, "#f09a58"),
                                              (1, "#7ac8a0")]), ao=(0.75, 0.25, 12), tint=(0.5, 0.35, 0.6), hollow=True))
    return parts


def vacuole(q):
    A = (2.6, 1.45, 1.25)

    def rfn(d):
        r = superellipsoid_r(d, A, 2.5)
        return r * (1 - 0.16 * np.exp(-((d[:, 2] - 0.9) / 0.5) ** 2) * np.exp(-(d[:, 0] / 0.9) ** 2))
    vo, fo = radial(res(34, q, 8), rfn, seed=12, amp=0.025, freq=1.1, detail=0.004, detail_freq=5)
    di, fi = geo.cube_sphere(res(16, q, 6))
    vi = di * (rfn(di) * 0.965)[:, None]
    t = 0.5 + 0.5 * noise.fbm(vo * 0.6, 4, 1.0, 3)
    t = np.clip(t * 0.7 + 0.3 * (0.5 + 0.5 * normalize(vo)[:, 1]), 0, 1)
    co = ramp(t, [(0, "#2f78c4"), (0.5, "#4f9ae0"), (1, "#8cc8f4")])
    ci = ramp(0.5 + 0.5 * noise.fbm(vi * 0.7, 5, 1.0, 2), [(0, "#1f58a4"), (1, "#3f86d0")])
    alpha = np.concatenate([np.full(len(vo), 0.55), np.full(len(vi), 0.5)])
    parts = [part("tonoplast", geo.merge((vo, fo), (vi, geo.flipf(fi))), np.concatenate([co, ci]), mat="gel",
                  alpha=alpha, hollow=True, occ=False, ao=(0.55, 1.0, 14), tint=(0.5, 0.6, 0.85))]
    rng = np.random.default_rng(15)
    pieces, cid = [], []
    dirs = geo.fibonacci(14, 0.4)
    for i, dv in enumerate(dirs):                              # faint inner membrane folds (ruffled sheets near the wall)
        pos = dv * (rfn(dv[None])[0] * 0.8)
        nrm = normalize(dv * np.array([1 / A[0], 1 / A[1], 1 / A[2]]) ** 2)
        wv = (lambda a, b, ph=i: 0.07 * np.sin(7 * a + ph) * np.cos(5 * b))
        sh = slab(res(10, q, 4), rng.uniform(0.35, 0.65), rng.uniform(0.25, 0.45), 0.025, seed=i, power=0.5,
                  rim_ruffle=0.2, wave=wv)
        pieces.append(geo.xf(sh, 1.0, geo.align((0, 1, 0), nrm), pos))
        cid.append(0.2)
    for i in range(int(60 * q * q + 0.5) + 8):                 # solute particles and a few vesicles
        c = rng.uniform(-1, 1, 3) * np.array([2.0, 0.9, 0.7])
        big = i % 9 == 0
        pieces.append(blob(res(7 if big else 3, q, 2), ((0.16 if big else 0.05) * rng.uniform(0.8, 1.3),) * 3,
                           seed=200 + i, amp=0.15, pos=c))
        cid.append(0.9 if big else 0.55)
    g = geo.merge(*pieces)
    ids = np.concatenate([np.full(len(p[0]), v) for p, v in zip(pieces, cid)])
    t = np.clip(ids + 0.15 * noise.fbm(g[0] * 2, 6, 1.0, 2), 0, 1)
    parts.append(part("solutes", g, ramp(t, [(0, "#8fc4ee"), (0.5, "#d0ecfa"), (1, "#f4f8ff")]), ao=(0.6, 0.4, 10),
                      tint=(0.5, 0.6, 0.8)))
    return parts


BUILDERS = {"lysosome": lysosome, "vacuole": vacuole}
