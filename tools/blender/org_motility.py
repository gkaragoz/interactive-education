"""Flagellum (motor basal body in two membrane plates, rod, hook, ridged helical filament) and a pilus tuft."""
import numpy as np

import geo
import noise
from paint import ramp
from shapes import res, part, slab, blob, normalize

X_AXIS = geo.align((0, 1, 0), (1, 0, 0))


def _plate(q, x, r, th, seed):
    return geo.xf(slab(res(22, q, 6), r, r, th, seed=seed, power=0.5, rim_ruffle=0.1, ruffle_freq=2.0), 1.0, X_AXIS,
                  (x, 0, 0))


def flagellum(q):
    parts = []
    x0 = -2.0
    sides = res(14, q, 5)
    # cell envelope fragments the motor sits in: inner membrane + outer membrane
    pl = [_plate(q, x0 - 0.12, 0.7, 0.05, 1), _plate(q, x0 + 0.28, 0.7, 0.05, 2)]
    base = np.concatenate([np.tile([0.18, 0.6, 0.62], (len(pl[0][0]), 1)), np.tile([0.45, 0.62, 0.25], (len(pl[1][0]), 1))])
    pv = geo.merge(*pl)
    parts.append(part("envelope", pv, base * (0.9 + 0.2 * noise.fbm(pv[0] * 2, 5, 1.0, 2))[:, None], ao=(0.8, 0.6, 12),
                      tint=(0.5, 0.55, 0.5)))
    pieces, cols = [], []

    def add(s, c):
        pieces.append(s)
        cols.append(c)
    nr = res(8, q, 3)
    add(geo.tube(np.stack([np.linspace(x0 - 0.7, x0 + 0.6, nr), np.zeros(nr), np.zeros(nr)], 1), 0.07, sides, cap=2),
        (0.96, 0.7, 0.3))
    for xr, rr, th, c in ((x0 - 0.12, 0.22, 0.085, (0.9, 0.35, 0.45)),      # MS ring (inner membrane)
                          (x0 + 0.05, 0.19, 0.05, (0.55, 0.4, 0.88)),        # P ring
                          (x0 + 0.28, 0.2, 0.06, (0.3, 0.65, 0.88)),         # L ring (outer membrane)
                          (x0 - 0.5, 0.3, 0.07, (0.96, 0.78, 0.3))):         # C ring
        add(geo.xf(geo.torus(res(28, q, 10), res(9, q, 4), rr, th), 1.0, geo.rot_axis((0, 0, 1), 90), (xr, 0, 0)), c)
    for k in range(10):                                                          # stator studs around the MS ring
        a = 2 * np.pi * k / 10
        add(blob(res(5, q, 3), (0.06, 0.06, 0.06), seed=k, amp=0.08,
                 pos=(x0 - 0.12, 0.33 * np.cos(a), 0.33 * np.sin(a))), (0.35, 0.78, 0.7))
    bb = geo.merge(*pieces)
    base = np.concatenate([np.tile(c, (len(p[0]), 1)) for p, c in zip(pieces, cols)])
    parts.append(part("motor", bb, base * (0.88 + 0.12 * noise.fbm(bb[0] * 3, 3, 1.0, 2))[:, None], ao=(0.8, 0.4, 14),
                      tint=(0.5, 0.4, 0.5)))
    n = res(320, q, 70)
    s = np.linspace(0, 1, n)
    xs = x0 + 0.6 + 4.2 * s
    grow = np.clip((xs - (x0 + 0.6)) / 0.7, 0, 1) ** 2
    A = 0.3 * grow
    ph = (xs - x0) * 2 * np.pi / 1.3
    path = np.stack([xs, A * np.sin(ph), A * np.cos(ph)], axis=1)
    hook = np.clip((0.5 - (xs - (x0 + 0.6))) / 0.5, 0, 1)
    path[:, 1] += 0.14 * hook * np.sin(np.pi * hook)
    ridge = 0.5 + 0.5 * np.cos(2 * np.pi * 4.2 * s * 15)               # flagellin subunit rows
    rad = 0.085 + 0.032 * hook + 0.014 * ridge * (1 - hook)
    fil, tv = geo.tube_t(path, rad, sides, cap=3)
    col = ramp(tv, [(0, "#e8584a"), (0.1, "#e8786a"), (0.5, "#8a62d0"), (1, "#3aa8d8")])
    ring_id = np.concatenate([np.full(3 * sides, ridge[0]), np.repeat(ridge, sides), np.full(3 * sides, ridge[-1]),
                              [ridge[0], ridge[-1]]])
    col = col * (0.82 + 0.28 * ring_id)[:, None]
    parts.append(part("filament", fil, col, ao=(0.7, 0.4, 14), tint=(0.5, 0.4, 0.6)))
    return parts


def pilus(q):
    rng = np.random.default_rng(61)
    sides = res(14, q, 5)
    plate = geo.xf(slab(res(20, q, 6), 0.55, 0.55, 0.07, seed=3, power=0.5, rim_ruffle=0.12), 1.0, X_AXIS, (-0.05, 0, 0))
    pieces, cols = [], []
    specs = [(3.0, (0, 0, 0), 0.0), (2.2, (0, 0.2, 0.1), 24.0), (1.7, (0, -0.18, 0.12), -28.0)]
    shafts, knobs = [], []
    for si, (L, off, ang) in enumerate(specs):
        n = res(150, q, 36)
        s = np.linspace(0, 1, n)
        wob = np.stack([s * L, 0.14 * np.sin(s * 6 + si) * s, 0.12 * np.cos(s * 5 + 2 * si) * s], axis=1)
        rot = geo.rot_axis((0, 0, 1), ang) @ geo.rot_axis((1, 0, 0), 40 * si)
        path = wob @ rot.T + np.array(off)
        rad = (0.07 - 0.022 * s) + 0.008 * np.sin(s * L * 60)
        rad = np.where(s > 0.98, 0.1, rad)
        sh, tv = geo.tube_t(path, rad, sides, cap=3)
        shafts.append((sh, tv))
        knobs.append(blob(res(8, q, 3), (0.13, 0.13, 0.13), seed=si, amp=0.1, pos=path[-1] + normalize(path[-1] - path[-4]) * 0.06))
        so = geo.xf(geo.torus(res(24, q, 8), res(8, q, 4), 0.14, 0.05), 1.0, geo.rot_axis((0, 0, 1), 90), (0.03, off[1], off[2]))
        pieces.append(so)
    parts = []
    sv = geo.merge(*[s for s, _ in shafts])
    tv = np.concatenate([t for _, t in shafts])
    col = ramp(tv, [(0, "#2f9d8f"), (0.6, "#5cc4a0"), (1, "#a0e0a0")])
    col = col * (0.9 + 0.1 * np.sin(tv * 200))[:, None]
    parts.append(part("shafts", sv, col, ao=(0.7, 0.4, 14), tint=(0.5, 0.5, 0.55)))
    kv = geo.merge(*knobs)
    parts.append(part("tips", kv, np.tile([0.97, 0.7, 0.25], (len(kv[0]), 1)), ao=(0.7, 0.3, 10), tint=(0.6, 0.5, 0.4)))
    bv = geo.merge(plate, *pieces)
    base = np.concatenate([np.tile([0.4, 0.6, 0.55], (len(plate[0]), 1)), np.tile([0.91, 0.35, 0.42], (len(bv[0]) - len(plate[0]), 1))])
    parts.append(part("base", bv, base, ao=(0.7, 0.4, 12), tint=(0.5, 0.45, 0.5)))
    return parts


BUILDERS = {"flagellum": flagellum, "pilus": pilus}
