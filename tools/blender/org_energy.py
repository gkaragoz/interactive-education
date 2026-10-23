"""Mitochondrion (double membrane + folded cristae) and chloroplast (envelope + grana stacks + stroma lamellae)."""
import numpy as np

import geo
import noise
from paint import ramp, mix
from shapes import res, part, slab, blob, radial, superellipsoid_r, normalize

L, RAD = 1.6, 0.62


def _curve(v):
    v = v.copy()
    v[:, 1] -= 0.22 * (v[:, 0] / L) ** 2
    return v


def _cur(surf):
    return _curve(surf[0]), surf[1]


def mitochondrion(q):
    parts = []
    p = 2.8
    outer = radial(res(30, q, 8), lambda d: superellipsoid_r(d, (L, RAD, RAD), p), seed=2, amp=0.03, freq=1.3,
                   detail=0.006, detail_freq=7)
    inner_abc = (L * 0.86, RAD * 0.84, RAD * 0.84)
    inner = radial(res(26, q, 8), lambda d: superellipsoid_r(d, inner_abc, p), seed=3, amp=0.02, freq=1.5)
    t = 0.5 + 0.5 * noise.fbm(outer[0] * 0.9, 5, 1.0, 3)
    col = ramp(t, [(0, "#9ab43c"), (0.5, "#c0d060"), (1, "#e2e690")])
    ov = _cur(outer)
    parts.append(part("outer", ov, col, mat="gel", alpha=0.28, occ=False, ao=(0.5, 0.8, 12), tint=(0.7, 0.7, 0.45)))
    iv = _cur(inner)
    t = 0.5 + 0.5 * noise.fbm(iv[0] * 1.1, 6, 1.0, 3)
    col = ramp(t, [(0, "#f2a870"), (0.6, "#f6c090"), (1, "#fbd8b0")])
    parts.append(part("inner", iv, col, mat="gel", alpha=0.3, occ=False, ao=(0.5, 0.6, 10), tint=(0.6, 0.45, 0.3)))
    # cristae: alternating shelf plates (touch the wall on one side, leave a gap on the other) with folds
    plates = []
    rng = np.random.default_rng(11)
    nplate = 10
    for i in range(nplate):
        x = -1.06 + 2.12 * i / (nplate - 1)
        prof = (1 - (abs(x) / inner_abc[0]) ** p) ** (1 / p)
        rr = inner_abc[1] * prof
        sgn = 1 if i % 2 == 0 else -1
        ph = rng.uniform(0, 6.28)
        rz, rx = rr * rng.uniform(0.68, 0.86), rr * rng.uniform(0.95, 1.02)
        tilt = geo.rot_axis((0, 1, 0), rng.uniform(-14, 14))
        wave = (lambda a, b, ph=ph: 0.07 * np.sin(7.0 * b + ph) + 0.045 * np.sin(5.5 * a + 2 * ph))
        rz *= 0.9
        cup = (lambda a, b, rz=rz, sg=sgn: 0.12 * sg * (b / rz) ** 2 - 0.05 * (a / rx) ** 2)
        s = slab(res(14, q, 5), rx, rz, 0.062, seed=20 + i, power=0.5, rim_ruffle=0.07, wave=wave, bend=cup)
        s = geo.xf(s, 1.0, tilt @ geo.rot_axis((0, 0, 1), 90), (x, 0, sgn * rr * 0.28))
        plates.append(s)
        # narrow crista junction: neck tube from the plate edge to the inner membrane + collar
        zi = sgn * rr * 0.28 + sgn * rz * 0.92
        zw = sgn * inner_abc[1] * prof * 0.99
        neck = geo.tube(geo.catmull([(x, 0.0, zi), (x + 0.02, 0.0, (zi + zw) / 2), (x, 0.0, zw)], res(4, q, 2)),
                        0.055, res(8, q, 4), cap=1)
        plates.append(neck)
    for k in range(res(7, q, 3)):                           # tubular cristae: curved tubes with bulb ends
        x = -0.95 + 1.9 * k / 6 + 0.13
        prof = (1 - (abs(x) / inner_abc[0]) ** p) ** (1 / p)
        ang = rng.uniform(0, 6.28)
        w0 = np.array([x, inner_abc[1] * prof * 0.98 * np.cos(ang), inner_abc[1] * prof * 0.98 * np.sin(ang)])
        pth = geo.catmull([w0, w0 * np.array([1, .7, .7]) + np.array([0.08, 0, 0]),
                           w0 * np.array([1, .3, .3]) + np.array([0.18, 0.05, 0])], res(5, q, 2))
        plates.append(geo.tube(pth, 0.048, res(8, q, 4), cap=2))
        plates.append(blob(res(6, q, 3), (0.085,) * 3, seed=k, amp=0.1, pos=pth[-1]))
    cr = geo.merge(*plates)
    cv = _curve(cr[0])
    t = 0.5 + 0.5 * noise.fbm(cv * 1.8, 7, 1.0, 3)
    col = ramp(t, [(0, "#e0401a"), (0.55, "#f46a20"), (1, "#fc9a3a")])
    parts.append(part("cristae", (cv, cr[1]), col, ao=(0.85, 0.5, 16), tint=(0.5, 0.3, 0.3)))
    # matrix: granules and the circular mtDNA
    gr = [blob(res(7, q, 3), (0.045,) * 3, seed=70 + i, amp=0.08,
               pos=(rng.uniform(-1.1, 1.1), rng.uniform(-0.2, 0.2), rng.uniform(-0.2, 0.2))) for i in range(14)]
    dna = geo.torus(res(40, q, 12), res(8, q, 5), 0.17, 0.03)
    dna = geo.xf(dna, 1.0, geo.rot_axis((1, 0, 0), 70), (0.3 + 0.2, 0.05, 0.0))
    mg = geo.merge(*gr, dna)
    mv = _curve(mg[0])
    base = np.tile(np.array([[0.62, 0.3, 0.2]]), (len(mv), 1))
    base[-len(dna[0]):] = (0.97, 0.78, 0.35)
    parts.append(part("matrix", (mv, mg[1]), base, ao=(0.6, 0.4, 10), tint=(0.6, 0.4, 0.3)))
    return parts


def chloroplast(q):
    parts = []
    A, B = 2.5, 1.2
    env = radial(res(28, q, 8), lambda d: superellipsoid_r(d, (A, B, B), 2.4), seed=8, amp=0.02, freq=1.2)
    t = 0.5 + 0.5 * noise.fbm(env[0] * 0.7, 9, 1.0, 3)
    col = ramp(t, [(0, "#4f8f2a"), (0.5, "#7fba3a"), (1, "#b6d85a")])
    parts.append(part("envelope", env, col, mat="gel", alpha=0.28, occ=False, ao=(0.4, 0.8, 12), tint=(0.7, 0.8, 0.5)))
    rng = np.random.default_rng(21)
    pos = []
    tries = 0
    while len(pos) < 9 and tries < 4000:
        tries += 1
        c = rng.uniform(-1, 1, 3) * np.array([A * 0.78, B * 0.5, B * 0.5])
        if (c[0] / (A * 0.8)) ** 2 + (c[1] / (B * 0.62)) ** 2 + (c[2] / (B * 0.62)) ** 2 > 1:
            continue
        if all(np.linalg.norm((c - p) * (1, 1.4, 1)) > 0.85 for p in pos):
            pos.append(c)
    pos = np.array(pos)
    discs, ids = [], []
    for gi, c in enumerate(pos):
        nd = max(3, int(int(rng.integers(7, 11)) * max(q, 0.4) + 0.5))
        tilt = geo.rot_axis((1, 0, 0), rng.uniform(-10, 10)) @ geo.rot_axis((0, 0, 1), rng.uniform(-10, 10))
        for k in range(nd):
            rr = 0.34 * (1 - 0.07 * abs(k - nd / 2))
            y = (k - (nd - 1) / 2) * 0.092
            s = slab(res(5, q, 2), rr, rr, 0.034, seed=gi * 20 + k, power=0.5, rim_ruffle=0.04)
            discs.append(geo.xf(s, 1.0, tilt, c + tilt @ np.array([0, y, 0])))
            ids.append(gi)
    gr = geo.merge(*discs)
    per = len(discs[0][0])
    gid = np.repeat(np.array(ids), per)
    t = (0.5 + 0.5 * noise.fbm(gr[0] * 2.0, 10, 1.0, 2)) * 0.6 + 0.4 * ((gid * 0.37) % 1.0)
    col = ramp(t, [(0, "#3f8f2e"), (0.5, "#62b83a"), (1, "#a4dd4e")])
    parts.append(part("grana", gr, col, ao=(0.85, 0.35, 16), tint=(0.45, 0.6, 0.35)))
    # stroma lamellae: flat ribbons joining neighbouring grana
    lam = []
    for i in range(len(pos)):
        d = np.linalg.norm(pos - pos[i], axis=1)
        for j in np.argsort(d)[1:3]:
            if j < i and i in np.argsort(np.linalg.norm(pos - pos[j], axis=1))[1:3]:
                continue
            a, b = pos[i], pos[j]
            ln = np.linalg.norm(b - a)
            s = slab(res(10, q, 4), ln / 2 * 0.98, 0.07, 0.022, seed=60 + i, power=0.5, rim_ruffle=0.05)
            yaw = geo.align((1, 0, 0), normalize(b - a))
            lam.append(geo.xf(s, 1.0, yaw, (a + b) / 2 + np.array([0, 0.12 * ((i + j) % 3 - 1), 0])))
    lm = geo.merge(*lam)
    t = 0.5 + 0.5 * noise.fbm(lm[0] * 1.5, 12, 1.0, 2)
    parts.append(part("stroma", lm, ramp(t, [(0, "#78b43a"), (1, "#c6e25e")]), ao=(0.6, 0.5, 14),
                      tint=(0.55, 0.7, 0.4)))
    # starch granule + plastoglobuli (orange lipid droplets)
    sv = blob(res(14, q, 5), (0.34, 0.24, 0.26), seed=3, amp=0.05, pos=(1.75, -0.45, 0.2))
    gl = [blob(res(8, q, 4), (0.11,) * 3, seed=40 + i, amp=0.06, pos=p) for i, p in enumerate(
        [(-1.95, 0.45, 0.3), (-2.1, 0.1, -0.35), (0.95, 0.8, -0.45), (-0.4, -0.85, 0.35), (1.0, -0.7, -0.5)])]
    gl = geo.merge(sv, *gl)
    nsv = len(sv[0])
    base = np.tile(np.array([[0.96, 0.55, 0.18]]), (len(gl[0]), 1))
    base[:nsv] = (0.95, 0.9, 0.7)
    parts.append(part("globules", gl, base, ao=(0.7, 0.5, 14), tint=(0.6, 0.45, 0.3)))
    return parts


BUILDERS = {"mitochondrion": mitochondrion, "chloroplast": chloroplast}
