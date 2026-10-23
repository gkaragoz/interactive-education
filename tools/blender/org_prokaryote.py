"""Nucleoid (tangled supercoiled loop), plasmid (ring), flagellum (helical filament + basal body), pilus."""
import numpy as np

import geo
import noise
from paint import ramp
from shapes import res, part, blob, normalize


def nucleoid(q):
    rng = np.random.default_rng(5)
    m = res(1000, q, 90)
    t = np.linspace(0, 2 * np.pi, m, endpoint=False)
    ks = [(2, 3, 5), (3, 5, 2), (5, 2, 3)]
    ph = rng.uniform(0, 6.28, (3, 3))
    amp = np.array([0.7, 0.5, 0.5])
    main = np.stack([sum(a * np.sin(k * t + p) for a, k, p in zip((1, 0.6, 0.35), ks[i], ph[i])) * amp[i]
                     for i in range(3)], axis=1)
    _, nn, bn = geo._frames(main, True)
    turns = 42
    cr = 0.17 + 0.04 * np.sin(5 * t)
    path = main + cr[:, None] * (np.cos(turns * t)[:, None] * nn + np.sin(turns * t)[:, None] * bn)
    rad = 0.068 + 0.01 * np.sin(11 * t)
    sides = res(8, q, 4)
    fibre, tv = geo.tube_t(path, rad, sides, closed=True)
    col = ramp(tv, [(0, "#d94b8a"), (0.3, "#f07a5a"), (0.55, "#f2b04a"), (0.8, "#e0607a"), (0.999, "#c0508a")])
    col = col * (0.9 + 0.1 * np.sin(turns * 2 * np.pi * tv))[:, None]
    beads = [blob(res(6, q, 3), (0.1,) * 3, seed=i, amp=0.1, pos=path[int(rng.integers(0, m))]) for i in range(max(int(24 * q + 0.5), 4))]
    bd = geo.merge(*beads)
    cloud = blob(res(18, q, 6), (1.6, 1.2, 1.2), seed=4, amp=0.1, freq=1.3)
    sp = []
    for i in range(int(190 * q * q + 0.5) + 10):                # ribosome speckles floating in the cloud
        c = normalize(rng.normal(0, 1, 3)) * rng.uniform(0.5, 1.0) * np.array([1.5, 1.1, 1.1])
        sp.append(blob(res(2, q, 2), (0.055,) * 3, seed=i % 30, amp=0.1, pos=c))
    spv = geo.merge(*sp)
    tsp = 0.5 + 0.5 * noise.fbm(spv[0] * 2, 9, 1.0, 2)
    return [part("fibre", fibre, col, ao=(0.8, 0.6, 18), tint=(0.5, 0.35, 0.55)),
            part("cloud", cloud, ramp(0.5 + 0.5 * noise.fbm(cloud[0] * 0.8, 3, 1.0, 2), [(0, "#f4c0a8"), (1, "#f8e0c8")]),
                 mat="gel", alpha=0.2, occ=False, ao=None, tint=(0.8, 0.7, 0.7)),
            part("speckles", spv, ramp(tsp, [(0, "#7a58c0"), (0.5, "#c0609c"), (1, "#f090a0")]), ao=(0.6, 0.2, 8),
                 tint=(0.55, 0.4, 0.55)),
            part("proteins", bd, np.tile(np.array([[0.96, 0.82, 0.29]]), (len(bd[0]), 1)), ao=(0.6, 0.3, 8),
                 tint=(0.6, 0.5, 0.3))]


def plasmid(q):
    """Supercoiled ring drawn as a DNA double helix wound round a circle, with coloured gene segments."""
    m = res(260, q, 48)
    t = np.linspace(0, 2 * np.pi, m, endpoint=False)
    R = 0.24
    centre = np.stack([R * np.cos(t), 0.05 * np.sin(3 * t), R * np.sin(t)], axis=1)
    _, nn, bn = geo._frames(centre, True)
    turns = 7
    parts = []
    pal = [(0, "#2fb6a0"), (0.28, "#2fb6a0"), (0.32, "#f0a030"), (0.5, "#f0a030"), (0.54, "#e0508a"),
           (0.74, "#e0508a"), (0.78, "#6a5acd"), (0.999, "#6a5acd")]
    for k in range(2):
        a = turns * t + k * np.pi
        path = centre + 0.062 * (np.cos(a)[:, None] * nn + np.sin(a)[:, None] * bn)
        strand, tv = geo.tube_t(path, 0.034, res(8, q, 4), closed=True)
        col = ramp(tv, pal)
        if k:
            col = col * 0.82
        parts.append(part(f"strand{k}", strand, col, ao=(0.8, 0.25, 12), tint=(0.5, 0.4, 0.55)))
    return parts


BUILDERS = {"nucleoid": nucleoid, "plasmid": plasmid}
