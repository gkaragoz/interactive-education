"""Shells: hollow nested closed surfaces (outer outward, inner flipped) for animal/plant cells and the bacterial envelope.

Membranes are soft translucent gel with a tinted inner leaflet plus embedded protein domes, channel rings and
microvilli (separate closed clay meshes). The plant wall is a layered plate/brick relief (cellulose weave in colour);
the bacterial envelope has pitted wall, protein studs and a fuzzy capsule. Half extents go into meta.json `shell`.
"""
import numpy as np

import geo
import noise
from paint import ramp
from shapes import res, part, superellipsoid_r, capsule_r, normalize, blob

PAL_ANIMAL = [(0, "#b0589a"), (1, "#d68cb8")]      # tone-on-tone with the shell hue
PAL_PLANT = [(0, "#4a92ac"), (1, "#86c4d0")]
PAL_BACT = [(0, "#1c8488"), (1, "#58bcae")]


def _surf(n, rfn, disp=None, noise_amp=0.0, seed=0, freq=1.4, flip=False):
    """Closed surface over unit directions: radius rfn(d) * (1 + fbm) + disp(d, P0). Returns V, F, d, P0."""
    d, f = geo.cube_sphere(n)
    r = rfn(d)
    p0 = d * r[:, None]
    k = 1.0 + (noise_amp * noise.fbm(d, seed, freq, 3) if noise_amp else 0.0)
    r = r * k
    if disp is not None:
        r = r + disp(d, p0)
    v = d * r[:, None]
    return v, (geo.flipf(f) if flip else f), d, p0


def _normals_at(rfn, dirs, seed=0):
    """Outward normals of the base surface at unit directions (nearest vertex of a coarse copy)."""
    d, f = geo.cube_sphere(28)
    v = d * rfn(d)[:, None]
    nv = geo.normals(v, f)
    idx = np.argmax(dirs @ d.T, axis=1)
    return nv[idx]


def _decor(q, rfn, count, size, height, seed, pal, rings=0, villi=0, base_n=4):
    """Protein domes (+ channel rings + microvilli) sitting on the surface rfn; one clay mesh."""
    rng = np.random.default_rng(seed)
    dirs = geo.fibonacci(count + rings + villi, rng.uniform(0, 6.28))
    dirs = dirs[rng.permutation(len(dirs))]
    if rings:                                   # channel rings sit in a few clusters, not a uniform sprinkle
        centres = geo.fibonacci(max(rings // 3, 2), rng.uniform(0, 6.28))
        for i in range(rings):
            c = centres[i % len(centres)] + rng.normal(0, 0.1, 3)
            dirs[count + i] = c / np.linalg.norm(c)
    nrm = _normals_at(rfn, dirs)
    pos = dirs * rfn(dirs)[:, None]
    keep = lambda c: 0 if c == 0 else max(int(c * (q * q if q < 1 else 1) + 0.5), 3)
    pieces, ids = [], []
    for i in range(keep(count)):
        s = size * rng.uniform(0.7, 1.3)
        h = height * rng.uniform(0.7, 1.4)
        b = blob(res(base_n, q, 2), (s, h, s), seed=i % 40, amp=0.06,
                 pos=pos[i] - nrm[i] * 0.5 * h, rot=geo.align((0, 1, 0), nrm[i]))
        pieces.append(b)
        ids.append(rng.random())
    for i in range(keep(rings)):
        j = count + i
        t = geo.torus(res(16, q, 8), res(6, q, 3), size * 1.1, size * 0.3)
        pieces.append(geo.xf(t, 1.0, geo.align((0, 1, 0), nrm[j]), pos[j] + nrm[j] * height * 0.1))
        ids.append(rng.random())
    for i in range(keep(villi)):
        j = count + rings + i
        L = rng.uniform(0.35, 0.6)
        path = np.array([pos[j] - nrm[j] * 0.3, pos[j] + nrm[j] * L * 0.5 + rng.normal(0, 0.06, 3),
                         pos[j] + nrm[j] * L])
        pieces.append(geo.tube(geo.catmull(path, res(5, q, 2)), size * 0.55, res(8, q, 4), cap=2))
        ids.append(rng.random())
    g = geo.merge(*pieces)
    cid = np.concatenate([np.full(len(p[0]), v) for p, v in zip(pieces, ids)])
    col = ramp(cid, pal) * (0.95 + 0.1 * noise.fbm(g[0] * 1.5, seed, 1.0, 2))[:, None]
    return part("proteins", g, col, ao=(0.7, 0.5, 10), tint=(0.55, 0.4, 0.5), speck=0.04)


def _gel(name, n_out, n_in, rfn_o, rfn_i, pal_o, pal_i, alpha_o, alpha_i, seed, noise_amp, disp=None, ao=(0.5, 4.0, 10)):
    vo, fo, d, p0 = _surf(n_out, rfn_o, disp, noise_amp, seed)
    vi, fi, _, _ = _surf(n_in, rfn_i, None, noise_amp * 0.6, seed + 1, flip=True)
    t = 0.5 + 0.5 * noise.fbm(vo * 0.12, seed + 5, 1.0, 3)
    co = ramp(np.clip(t + 0.15 * normalize(vo)[:, 1], 0, 1), pal_o)
    ti = 0.5 + 0.5 * noise.fbm(vi * 0.2, seed + 6, 1.0, 3)
    ci = ramp(ti, pal_i)
    s = geo.merge((vo, fo), (vi, fi))
    alpha = np.concatenate([np.full(len(vo), alpha_o), np.full(len(vi), alpha_i)])
    return part(name, s, np.concatenate([co, ci]), mat="gel", alpha=alpha, hollow=True, occ=False, ao=ao,
                tint=(0.7, 0.6, 0.75), speck=0.05)


def membrane_animal(q):
    abc = (11.0, 8.5, 9.5)
    ro = lambda d: superellipsoid_r(d, abc, 2.4)
    ri = lambda d: superellipsoid_r(d, (abc[0] - 0.25, abc[1] - 0.25, abc[2] - 0.25), 2.4)
    sp = geo.fibonacci(900, 0.3)
    disp = lambda d, p0: geo.bumps(d, sp, 0.05, 0.035) + 0.12 * noise.fbm(p0, 5, 0.9, 3)
    mem = _gel("membrane", res(42, q, 10), res(22, q, 8), ro, ri,
               [(0, "#c58ad8"), (0.5, "#eaa0c8"), (1, "#f8cdb8")], [(0, "#9a4a9a"), (1, "#d46a9c")], 0.32, 0.5, 2, 0.02,
               disp)
    return [mem, _decor(q, ro, 44, 0.32, 0.2, 3, PAL_ANIMAL, rings=14, villi=6)]


def membrane_plant(q):
    abc = (13.0, 7.0, 10.0)
    ro = lambda d: superellipsoid_r(d, abc, 5.0)
    ri = lambda d: superellipsoid_r(d, (abc[0] - 0.25, abc[1] - 0.25, abc[2] - 0.25), 5.0)
    sp = geo.fibonacci(900, 0.9)
    disp = lambda d, p0: geo.bumps(d, sp, 0.04, 0.032) + 0.08 * noise.fbm(p0, 8, 1.0, 3)
    mem = _gel("membrane", res(42, q, 10), res(22, q, 8), ro, ri,
               [(0, "#78b4d8"), (0.5, "#9ad0e2"), (1, "#d0f0e0")], [(0, "#2f7f9a"), (1, "#56b0b0")], 0.3, 0.5, 3, 0.012,
               disp)
    return [mem, _decor(q, ro, 48, 0.32, 0.2, 4, PAL_PLANT, rings=16, villi=0)]


def wall_plant(q):
    a0 = np.array((13.04, 7.04, 10.04))
    t = 1.4
    ro = lambda d: superellipsoid_r(d, a0 + t, 4.2)
    ri = lambda d: superellipsoid_r(d, a0, 5.0)

    def disp(d, p0):
        w1, w2, cid = noise.worley2(p0, 4, 1.0 / 2.0)
        edge = noise.smoothstep(0.0, 0.2, w2 - w1)
        rim = np.sort(np.abs(d / (a0 + t)), axis=1)
        bead = np.exp(-((rim[:, 2] - rim[:, 1]) / (0.1 * rim[:, 2])) ** 2) * (rim[:, 1] > 0.2 * rim[:, 2])
        return (0.38 * edge + 0.2 * (cid - 0.5) * edge - 0.1 * w1 + 0.06 * noise.ridged(p0, 6, 0.6, 2)
                + 0.85 * bead * (0.7 + 0.3 * noise.fbm(d, 9, 3.0, 2)))
    vo, fo, d, p0 = _surf(res(58, q, 12), ro, disp, 0.006, 4)
    vi, fi, _, _ = _surf(res(18, q, 8), ri, None, 0.004, 5, flip=True)
    w1, w2, cid = noise.worley2(p0, 4, 1.0 / 2.0)
    edge = noise.smoothstep(0.0, 0.2, w2 - w1)
    n_ = 0.5 + 0.5 * noise.fbm(vo * 0.15, 7, 1.0, 3)
    t_ = np.clip(0.45 * cid + 0.35 * n_ + 0.2 * normalize(vo)[:, 1], 0, 1)
    col = ramp(t_, [(0, "#3a6a1a"), (0.4, "#5f8f2e"), (0.75, "#76a436"), (1, "#92bc46")])
    col = col * (0.32 + 0.68 * edge)[:, None]                       # dark mortar grooves between plates
    weave = 0.5 + 0.5 * np.sin(2 * np.pi * (vo[:, 0] * np.cos(cid * 6.28) + vo[:, 2] * np.sin(cid * 6.28)) * 2.2)
    col = col * (0.93 + 0.07 * weave)[:, None]                       # cellulose microfibril stripes, rotated per plate
    ci = ramp(0.5 + 0.5 * noise.fbm(vi * 0.2, 8, 1.0, 2), [(0, "#3f5a1a"), (1, "#628a2a")])
    s = geo.merge((vo, fo), (vi, fi))
    pw = part("wall", s, np.concatenate([col, ci]), hollow=True, occ=True, ao=(0.85, 1.2, 14),
              tint=(0.45, 0.6, 0.3), speck=0.03)
    pw.aux = np.concatenate([edge, np.ones(len(vi))])            # plate-groove factor (1 = flat) for the painter
    pw.aux2 = np.concatenate([cid, np.full(len(vi), 0.5)])        # per-plate id
    return [pw]


def envelope_bacterium(q):
    layers = []
    specs = [("membrane", 4.2, 2.0, 0.12), ("wall", 4.7, 2.5, 0.38), ("capsule", 5.3, 3.1, 0.1)]
    fn = {k: (lambda d, hl=hl, rd=rd: capsule_r(d, hl, rd), lambda d, hl=hl, rd=rd, th=th: capsule_r(d, hl, rd - th))
          for k, hl, rd, th in specs}
    pits = geo.fibonacci(260, 0.5)
    ro, ri = fn["membrane"]
    layers.append(_gel("membrane", res(26, q, 8), res(14, q, 6), ro, ri,
                       [(0, "#2a8f9a"), (0.5, "#44b8b0"), (1, "#8ce0c8")], [(0, "#1d6a7a"), (1, "#2f9a9a")], 0.4, 0.55,
                       10, 0.012, lambda d, p0: -geo.bumps(d, pits[:120], 0.03, 0.05), ao=(0.6, 3.0, 12)))
    ro, ri = fn["wall"]

    def wdisp(d, p0):
        w1, w2, cid = noise.worley2(p0, 11, 1.0 / 0.55)
        return 0.05 * noise.smoothstep(0.0, 0.25, w2 - w1) - geo.bumps(d, pits, 0.07, 0.04) + 0.03 * noise.fbm(p0, 12, 1.2, 2)
    vo, fo, d, p0 = _surf(res(40, q, 10), ro, wdisp, 0.01, 11)
    vi, fi, _, _ = _surf(res(16, q, 6), ri, None, 0.008, 12, flip=True)
    w1, w2, cid = noise.worley2(p0, 11, 1.0 / 0.55)
    edge = noise.smoothstep(0.0, 0.25, w2 - w1)
    pit = geo.bumps(d, pits, 1.0, 0.05, lambda x: np.exp(-x * x))
    t = np.clip(0.5 * cid + 0.5 * (0.5 + 0.5 * noise.fbm(vo * 0.4, 13, 1.0, 3)), 0, 1)
    col = ramp(t, [(0, "#4c7a2a"), (0.5, "#76a636"), (1, "#b4cf54")]) * (0.7 + 0.3 * edge)[:, None]
    col = col * (1 - 0.45 * np.clip(pit, 0, 1))[:, None]
    ci = ramp(0.5 + 0.5 * noise.fbm(vi * 0.4, 14, 1.0, 2), [(0, "#3f6a24"), (1, "#5c8c30")])
    layers.append(part("wall", geo.merge((vo, fo), (vi, fi)), np.concatenate([col, ci]), hollow=True, occ=True,
                       ao=(0.7, 2.0, 12), tint=(0.5, 0.65, 0.35), speck=0.04))
    ro, ri = fn["capsule"]
    fuzz = geo.fibonacci(500, 1.7)
    layers.append(_gel("capsule", res(24, q, 8), res(12, q, 6), ro, ri,
                       [(0, "#dfe6a8"), (0.5, "#f0f2c4"), (1, "#fbf6dc")], [(0, "#c8d28a"), (1, "#e0e6a8")], 0.26, 0.3,
                       15, 0.03, lambda d, p0: geo.bumps(d, fuzz, 0.06, 0.05), ao=(0.5, 3.0, 10)))
    rm, _ = fn["membrane"]
    layers.append(_decor(q, rm, 18, 0.13, 0.08, 21, PAL_BACT, rings=6))
    return layers


META = {
    "membrane-animal": {"shell": {"shape": "ellipsoid", "halfExtents": [11.0, 8.5, 9.5]}},
    "membrane-plant": {"shell": {"shape": "rounded-box", "halfExtents": [13.0, 7.0, 10.0]}},
    "wall-plant": {"shell": {"shape": "rounded-box", "halfExtents": [14.44, 8.44, 11.44]}},
    "envelope-bacterium": {"shell": {"shape": "capsule", "halfExtents": [6.2, 2.0, 2.0]},
                           "layers": {"membrane": 2.0, "wall": 2.5, "capsule": 3.1}},
}
BUILDERS = {"membrane-animal": membrane_animal, "membrane-plant": membrane_plant, "wall-plant": wall_plant,
            "envelope-bacterium": envelope_bacterium}
