"""Rough ER (meandering folded cisternae + ribosomes), smooth ER (tubule network), Golgi (curved cisternae + vesicles)."""
import numpy as np

import geo
import noise
from paint import ramp
from shapes import res, part, slab, blob, normalize


def _curtain(n, length, height, th, seed, z0, phase, amp_k=1.0):
    """Cisterna standing on edge, then folded into a meander in plan view (x runs along the ribbon)."""
    s = slab(n, length, height, th, seed=seed, power=0.5, rim_ruffle=0.1, ruffle_freq=2.4)
    v = geo.xf(s, 1.0, geo.rot_axis((1, 0, 0), 90))[0]
    x, y, z = v[:, 0], v[:, 1], v[:, 2]
    # shared fold so neighbouring cisternae stay parallel; low-frequency drift so it never repeats exactly
    fold = 0.42 * amp_k * np.sin(2.7 * x + phase + 0.9 * np.sin(0.7 * z0 + 1.3 * x)) + 0.12 * np.sin(6.1 * x + 2 * z0)
    return np.stack([x, y + 0.06 * np.sin(3.1 * x + phase) * (y / height), z + z0 + fold], 1), s[1]


def rough_er(q):
    rng = np.random.default_rng(33)
    ncur = 6
    cur = []
    for i in range(ncur):
        z0 = (i - (ncur - 1) / 2) * 0.46
        cur.append(_curtain(res(18, q, 4), 1.78 - 0.16 * abs(i - 2.5) / 2.5, 0.52, 0.055, 50 + i, z0, 0.3, 1.0))
    base = slab(res(16, q, 4), 1.85, 1.45, 0.05, seed=77, power=0.5, rim_ruffle=0.1)
    bx, by, bz = base[0].T
    bv = np.stack([bx, by - 0.56, bz + 0.42 * np.sin(2.7 * bx + 0.3)], 1)
    sh = geo.merge(*cur, (bv, base[1]))
    per = len(cur[0][0])
    sid = np.concatenate([np.repeat(np.arange(ncur), per), np.full(len(bv), ncur)])
    t = 0.5 + 0.5 * noise.fbm(sh[0] * 0.9, 31, 1.0, 3)
    t = np.clip(0.6 * t + 0.4 * (np.minimum(sid, ncur - 1) % 3) / 2.0, 0, 1)
    col = ramp(t, [(0, "#e8503e"), (0.5, "#f27a52"), (1, "#f8ac6c")])
    parts = [part("sheets", sh, col, ao=(0.9, 0.7, 20), tint=(0.5, 0.25, 0.3))]
    # ribosome granules on both faces: pick order is fixed, count scales with q^2
    nrm = geo.normals(*sh)
    ok = np.where((np.abs(nrm[:, 2]) > 0.55) & (sid < ncur) & (np.abs(sh[0][:, 1]) < 0.5))[0]
    order = rng.permutation(len(ok))
    nrib = int(520 * q * q + 0.5)
    pick = ok[order[:max(nrib, 6)]]
    granules = [blob(res(2, q, 2), (0.064,) * 3, seed=int(j) % 60, amp=0.12, pos=sh[0][j] + nrm[j] * 0.025)
                for j in pick]
    g = geo.merge(*granules)
    t = 0.5 + 0.5 * noise.fbm(g[0] * 3.0, 33, 1.0, 2)
    parts.append(part("ribosomes", g, ramp(t, [(0, "#6a46b8"), (0.5, "#a85ca8"), (1, "#e87ea0")]),
                      ao=(0.6, 0.3, 8), tint=(0.5, 0.35, 0.5), form=0.2))
    return parts


def smooth_er(q):
    """Fenestrated tubular network: honeycomb of uniform tubules (3-way junctions) in two warped layers + sheet patches."""
    rng = np.random.default_rng(44)

    def warp(x, z, layer):
        return (0.85 * (1 - x * x / 5.3 - z * z / 2.4) + 0.2 * np.sin(1.6 * x + 0.5 * layer) + 0.14 * np.cos(2.1 * z)
                - 0.78 * layer * (1 - 0.35 * x * x / 5.3))

    nodes, edges = {}, []
    for layer in (0, 1):
        for i in range(-4, 5):
            for j in range(-3, 4):
                x, z = i * 0.52 + rng.uniform(-0.08, 0.08), j * 0.46 + rng.uniform(-0.08, 0.08)
                if (x / 2.3) ** 2 + (z / 1.55) ** 2 < 1.0 - 0.12 * layer:
                    nodes[(layer, i, j)] = np.array([x, warp(x, z, layer), z])
    for (layer, i, j) in list(nodes):
        for di, dj in ((1, 0), (0, 1)):
            if dj == 1 and (i + j) % 2:
                continue
            o = (layer, i + di, j + dj)
            if o in nodes and (layer == 0 or rng.random() < 0.8):
                edges.append(((layer, i, j), o))
    for (layer, i, j) in list(nodes):
        if layer == 0 and (layer + 1, i, j) in nodes and (i * 3 + j * 5) % 7 == 0:
            edges.append(((0, i, j), (1, i, j)))
    while True:                      # prune dangling tubules so the network has no loose ends
        deg = {}
        for a_, b_ in edges:
            deg[a_] = deg.get(a_, 0) + 1
            deg[b_] = deg.get(b_, 0) + 1
        keep_e = [e for e in edges if deg[e[0]] > 1 and deg[e[1]] > 1]
        if len(keep_e) == len(edges):
            break
        edges = keep_e
    tubes, junc = [], []
    for e, (a_, b_) in enumerate(edges):
        pa, pb = nodes[a_], nodes[b_]
        mid = (pa + pb) / 2 + rng.normal(0, 0.035, 3)
        path = geo.catmull([pa, mid, pb], res(6, q, 1))
        tubes.append(geo.tube(path, 0.07, res(10, q, 3), cap=1 if q < 0.45 else 2))
    for n_i, (key, c) in enumerate(nodes.items()):
        if deg.get(key, 0) >= 3 and (q >= 0.45 or (q >= 0.3 and n_i % 2 == 0)):
            junc.append(blob(res(5, q, 2), (0.1,) * 3, seed=hash(key) % 97, amp=0.1, pos=c))
    sheets = []
    for k in range(5):
        i, j = int(rng.integers(-2, 3)), int(rng.integers(-2, 2))
        c = nodes.get((0, i, j))
        if c is not None:
            sh = slab(res(10, q, 4), 0.42, 0.32, 0.03, seed=k, power=0.5, rim_ruffle=0.15)
            sheets.append(geo.xf(sh, 1.0, None, c + np.array([0, -0.02, 0.2])))
    tub = geo.merge(*tubes, *junc)
    t = 0.5 + 0.5 * noise.fbm(tub[0] * 0.9, 41, 1.0, 3)
    col = ramp(t, [(0, "#e8603e"), (0.5, "#f58e56"), (1, "#fbc07c")])
    parts = [part("tubules", tub, col, ao=(0.9, 0.5, 20), tint=(0.5, 0.28, 0.3))]
    if sheets:
        sv = geo.merge(*sheets)
        parts.append(part("sheets", sv, ramp(0.5 + 0.5 * noise.fbm(sv[0] * 1.5, 43, 1.0, 2), [(0, "#f0708a"), (1, "#f8b0a0")]),
                          ao=(0.7, 0.4, 12), tint=(0.55, 0.3, 0.4)))
    return parts


def golgi(q):
    ncis = 6
    cis, tid = [], []
    for i in range(ncis):
        t = i / (ncis - 1)
        rx = 1.78 * (1 - 0.1 * abs(t - 0.35))
        rz = 1.1 * (1 - 0.2 * t)
        curl = 0.95 * (1 - 0.12 * t)
        yoff = (i - (ncis - 1) / 2) * 0.34
        th = 0.085

        def bend(a, b, curl=curl, rx=rx, rz=rz):
            return curl * (a / rx) ** 2 + 0.28 * (b / rz) ** 2

        def wave(a, b, i=i):
            return 0.04 * np.sin(4.2 * a + i * 1.3) * np.cos(3 * b + i) + 0.02 * np.sin(9 * a + 3 * b)
        s = slab(res(24, q, 5), rx, rz, th, seed=70 + i, power=0.45, rim_ruffle=0.12, ruffle_freq=2.4, bend=bend,
                 wave=wave)
        v = s[0].copy()
        r2 = np.clip(np.sqrt((v[:, 0] / rx) ** 2 + (v[:, 2] / rz) ** 2), 0, 1.2)
        sgn = np.sign(v[:, 1] - bend(v[:, 0], v[:, 2]))
        v[:, 1] += sgn * 0.05 * np.clip((r2 - 0.78) / 0.22, 0, 1) + yoff
        cis.append((v, s[1]))
        tid.append(t)
    g = geo.merge(*cis)
    per = len(cis[0][0])
    tt = np.repeat(np.array(tid), per)
    n_ = 0.5 + 0.5 * noise.fbm(g[0] * 1.1, 61, 1.0, 3)
    tt = np.clip(0.8 * tt + 0.2 * n_, 0, 1)
    col = ramp(tt, [(0, "#5f3aae"), (0.35, "#8348c4"), (0.7, "#b455b8"), (1, "#e06a9c")])
    parts = [part("cisternae", g, col, ao=(0.9, 0.6, 20), tint=(0.45, 0.28, 0.55))]
    rng = np.random.default_rng(71)
    ves = []
    for k in range(14):
        a = rng.uniform(-1.9, 1.9)
        b = np.sign(rng.normal()) * rng.uniform(0.7, 1.15) * (1 - abs(a) / 3)
        r = rng.uniform(0.07, 0.15)
        y = (ncis - 1) / 2 * 0.34 + 0.95 * (a / 1.7) ** 2 + 0.3 * (b / 1.0) ** 2 + 0.3 + rng.uniform(0, 0.22)
        if k % 3 == 0:
            y = -(ncis - 1) / 2 * 0.34 + 0.95 * (a / 1.7) ** 2 - 0.28 - rng.uniform(0, 0.12)
        ves.append(blob(res(9, q, 3), (r,) * 3, seed=90 + k, amp=0.05, pos=(a, y, b)))
    v = geo.merge(*ves)
    t = 0.5 + 0.5 * noise.fbm(v[0] * 2.0, 62, 1.0, 2)
    parts.append(part("vesicles", v, ramp(t, [(0, "#e0709c"), (1, "#f4a8b4")]), ao=(0.6, 0.4, 10),
                      tint=(0.6, 0.4, 0.5)))
    return parts


BUILDERS = {"rough-er": rough_er, "smooth-er": smooth_er, "golgi": golgi}


LOD_Q = {"smooth-er": (1.0, 0.4, 0.2)}
