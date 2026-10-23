"""Learning-module assets for mitosis / meiosis (public/models/modules): chromosomes, chromatin, spindle pieces, cell plate,
cleavage ring segment and a nuclear envelope fragment. Units are about micrometres (a replicated chromosome spans ~1).
Pivot and axes of every asset are written to meta.json through META below."""
import numpy as np

import geo
import noise
from paint import ramp
from shapes import res, part, blob, slab, normalize
from org_misc import _barrel

NEUTRAL = [(0, "#d6cede"), (0.5, "#e9e3ee"), (1, "#f6f2f8")]       # light neutral albedo: the app tints per instance


def _chromatid_path(sgn, single=False):
    if single:       # V-shaped chromatid, centromere leading towards -X, arms trailing to +X
        pts = [(0.27, 0.20), (0.15, 0.09), (0.045, 0.02), (0.0, 0.0), (0.04, -0.07), (0.14, -0.20), (0.25, -0.34), (0.30, -0.44)]
    else:            # one chromatid of the X, sgn = +1 for the +X sister
        pts = [(0.19, 0.31), (0.115, 0.17), (0.05, 0.06), (0.036, 0.0), (0.05, -0.08), (0.11, -0.25), (0.19, -0.45), (0.225, -0.58)]
    return np.array([(sgn * x, y, 0.0) for x, y in pts])


def _chromatid(q, sgn, single=False, seed=0):
    ctrl = _chromatid_path(sgn, single)
    path = geo.catmull(ctrl, res(60, q, 4))
    # constriction at the centromere and rounded arm tips; fine coil rings along the length
    near = np.linalg.norm(path[:, :2], axis=1) if single else np.abs(path[:, 1])
    r = 0.088 - 0.040 * np.exp(-(near / 0.065) ** 2)
    coil = 1 + 0.07 * np.sin(np.arange(len(path)) * (2 * np.pi / max(len(path) / 24.0, 3.0)))
    surf, tv, av = geo.tube_ta(path, r * coil, res(24, q, 5), cap=3)
    return surf, tv, av


def chromosome(q, single=False):
    arms, kin = [], []
    tvs, avs = [], []
    sg = [1.0] if single else [1.0, -1.0]
    for k, s in enumerate(sg):
        surf, tv, av = _chromatid(q, s, single, k)
        arms.append(surf)
        tvs.append(tv)
        avs.append(av)
    a = geo.merge(*arms)
    tv = np.concatenate(tvs)
    av = np.concatenate(avs)
    # painted G-bands and a helical coil: neutral light base, the app tints it (maternal / paternal / copy colour)
    t = 0.5 + 0.5 * noise.fbm(a[0] * 7.0, 11, 1.0, 3)
    col = ramp(t, NEUTRAL)
    pa = part("arms", a, col, ao=(0.8, 0.25, 16), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)
    pa.aux, pa.aux2 = tv, av
    pa.tex = dict(neutral=True)
    # kinetochore discs on the outer face of the centromere (ochre, not tinted)
    for s in ([-1.0] if single else [1.0, -1.0]):
        x0 = 0.115 if not single else 0.075
        d, f = geo.cube_sphere(res(12, q, 4))
        disc = (d * np.array([0.022, 0.075, 0.075]) + np.array([s * x0, 0.0, 0.0]), f)
        kin.append(disc)
        d2, f2 = geo.cube_sphere(res(8, q, 3))
        kin.append((d2 * np.array([0.012, 0.05, 0.05]) + np.array([s * (x0 + 0.02), 0.0, 0.0]), f2))
    kv = geo.merge(*kin)
    pk = part("kinetochore", kv, ramp(0.5 + 0.5 * noise.fbm(kv[0] * 9, 3, 1.0, 2), [(0, "#d9892a"), (1, "#f3c04f")]),
              ao=(0.7, 0.2, 12), tint=(0.5, 0.35, 0.3))
    return [pa, pk]


def chromosome_single(q):
    return chromosome(q, single=True)


def _walk(rng, start, length, step, stiff, radius):
    p = np.array(start, dtype=np.float64)
    d = normalize(rng.normal(0, 1, 3))
    pts = [p.copy()]
    for _ in range(max(int(length / step), 3)):
        d = normalize(d + rng.normal(0, stiff, 3))
        p = p + d * step
        n = np.linalg.norm(p)
        if n > radius:                                  # reflect back into the ball
            p = p / n * radius * 0.98
            d = normalize(d - 2 * (d @ (p / n)) * (p / n))
        pts.append(p.copy())
    return np.array(pts)


def chromatin(q):
    """Loose interphase tangle in a unit ball: `fine` threads (gel, translucent) and `coarse` loops (clay)."""
    rng = np.random.default_rng(909)
    fine, coarse = [], []
    kf = 0.3 + 0.7 * min(q, 1.0) ** 1.5                        # fewer threads at lower LODs
    for i in range(max(int(34 * kf), 6)):
        s = normalize(rng.normal(0, 1, 3)) * rng.uniform(0.0, 0.95)
        pts = _walk(rng, s, rng.uniform(2.4, 3.6), 0.26, 0.55, 1.0)
        fine.append(geo.tube(geo.catmull(pts, res(4, q, 2)), 0.02 + 0.004 * rng.random(), res(6, q, 3), cap=2 if q > 0.4 else 1))
    for i in range(max(int(13 * kf), 3)):
        s = normalize(rng.normal(0, 1, 3)) * rng.uniform(0.0, 0.85)
        pts = _walk(rng, s, rng.uniform(1.8, 2.6), 0.3, 0.45, 0.95)
        coarse.append(geo.tube(geo.catmull(pts, res(5, q, 2)), 0.05 + 0.012 * rng.random(), res(9, q, 3), cap=2 if q > 0.4 else 1))
    fv = geo.merge(*fine)
    cv = geo.merge(*coarse)
    tf = 0.5 + 0.5 * noise.fbm(fv[0] * 1.5, 5, 1.0, 3)
    tc = 0.5 + 0.5 * noise.fbm(cv[0] * 1.5, 6, 1.0, 3)
    return [part("fine", fv, ramp(tf, [(0, "#a98ad8"), (0.5, "#c3a8ec"), (1, "#e0d0f6")]), mat="gel", alpha=0.6, occ=False,
                 ao=(0.4, 0.3, 10), tint=(0.7, 0.62, 0.85)),
            part("coarse", cv, ramp(tc, [(0, "#6d46b4"), (0.5, "#8d62cc"), (1, "#b48ae6")]), ao=(0.8, 0.3, 14),
                 tint=(0.5, 0.35, 0.7))]


def kinetochore_fibre(q):
    """Bundle of microtubules from the kinetochore (x = 0, wide and frayed) to the pole (x = 1, converged)."""
    rng = np.random.default_rng(55)
    tubes, tvs = [], []
    n = max(int(14 * (0.4 + 0.6 * min(q, 1.0))), 5)
    for i in range(n):
        a = rng.uniform(0, 2 * np.pi)
        r0 = 0.085 * np.sqrt(rng.uniform(0.05, 1.0))
        r1 = 0.012 * np.sqrt(rng.uniform(0.0, 1.0))
        x0 = rng.uniform(0.0, 0.12)
        xs = np.linspace(x0, 1.0, 7)
        rr = r0 + (r1 - r0) * (xs - x0) / (1.0 - x0 + 1e-9) ** 1 * 1.0
        rr = np.interp(xs, [0, 1], [r0, r1])
        wob = 0.006 * np.sin(xs * 9 + i)
        pts = np.stack([xs, rr * np.cos(a) + wob, rr * np.sin(a) - wob], 1)
        path = geo.catmull(pts, res(7, q, 2))
        s, tv = geo.tube_t(path, 0.0165, res(8, q, 3), cap=3)
        tubes.append(s)
        tvs.append(tv)
    g = geo.merge(*tubes)
    tv = np.concatenate(tvs)
    t = np.clip(tv * 0.8 + 0.2 * (0.5 + 0.5 * noise.fbm(g[0] * 5, 4, 1.0, 2)), 0, 1)
    p = part("microtubules", g, ramp(t, [(0, "#e9a640"), (0.6, "#f2c466"), (1, "#f8de98")]), ao=(0.7, 0.2, 12),
             tint=(0.55, 0.4, 0.3))
    p.aux = tv
    return [p]


def spindle_pole(q):
    """Centriole pair (reuses the centrosome barrel) with an aster of microtubule rays."""
    rng = np.random.default_rng(77)
    sc = 0.5
    m = geo.xf(_barrel(q, 0.9, 0.24), sc, None, (-0.4 * sc * 1.0, 0.0, 0.0))
    d = geo.xf(_barrel(q, 0.9, 0.24), sc, geo.rot_axis((0, 1, 0), -90), (0.21 * sc, 0.0, -0.05 * sc))
    parts = []
    for name, s, pal in (("mother", m, [(0, "#2f9d8f"), (0.5, "#3bbfa6"), (1, "#7ee0c0")]),
                         ("daughter", d, [(0, "#2a7fc0"), (0.5, "#4a9fe0"), (1, "#8ec8f4")])):
        parts.append(part(name, s, ramp(0.5 + 0.5 * noise.fbm(s[0] * 5, 3, 1.0, 2), pal), ao=(0.8, 0.2, 12),
                          tint=(0.45, 0.45, 0.6)))
    rays = []
    dirs = geo.fibonacci(res(34, q, 10), 0.3)
    for i, dv in enumerate(dirs):
        L = rng.uniform(0.85, 1.3)
        side = normalize(np.cross(dv, rng.normal(0, 1, 3)))
        pts = np.array([dv * 0.16, dv * L * 0.4 + side * 0.02 * rng.normal(), dv * L * 0.75 + side * 0.05 * rng.normal(), dv * L])
        path = geo.catmull(pts, res(6, q, 2))
        s = np.linspace(0, 1, len(path))
        rays.append(geo.tube(path, 0.022 * (1 - 0.55 * s) + 0.006, res(7, q, 3), cap=2 if q > 0.4 else 1))
    g = geo.merge(*rays)
    parts.append(part("aster", g, ramp(0.5 + 0.5 * noise.fbm(g[0] * 3, 8, 1.0, 2), [(0, "#e49a38"), (0.5, "#f0b858"), (1, "#f8d890")]),
                      ao=(0.6, 0.3, 10), tint=(0.55, 0.42, 0.3)))
    return parts


def cleavage_furrow_ring(q):
    """120-degree segment of the contractile ring (radius 1, plane XZ, centred on +X): actin rope + myosin clusters."""
    rng = np.random.default_rng(31)
    n = res(90, q, 14)
    th = np.linspace(-np.pi / 3, np.pi / 3, n)
    strands = []
    for k in range(7):
        if k == 0:
            off_r, off_y, rad = 0.0, 0.0, 0.034
        else:
            ph = 2 * np.pi * (k - 1) / 6 + 7.0 * th
            off_r, off_y, rad = 0.05 * np.cos(ph), 0.05 * np.sin(ph), 0.022
        R = 1.0 + off_r
        path = np.stack([R * np.cos(th), off_y if k else np.zeros(n), R * np.sin(th)], 1)
        strands.append(geo.tube(path, rad, res(9, q, 3), cap=3))
    sv = geo.merge(*strands)
    col = ramp(0.5 + 0.5 * noise.fbm(sv[0] * 4, 2, 1.0, 3), [(0, "#d9532f"), (0.5, "#ec7a3c"), (1, "#f6a458")])
    parts = [part("actin", sv, col, ao=(0.8, 0.25, 14), tint=(0.5, 0.3, 0.28))]
    my = []
    for k in range(res(12, q, 4)):
        a = -np.pi / 3 + (k + 0.5) / max(res(12, q, 4), 1) * 2 * np.pi / 3
        r = rng.uniform(0.0, 0.0)
        c = np.array([np.cos(a), rng.uniform(-0.02, 0.02), np.sin(a)])
        my.append(blob(res(7, q, 3), (0.05, 0.065, 0.05), seed=k, amp=0.1, pos=c * 1.0, rot=geo.align((0, 1, 0), (-np.sin(a), 0, np.cos(a)))))
    mv = geo.merge(*my)
    parts.append(part("myosin", mv, ramp(0.5 + 0.5 * noise.fbm(mv[0] * 6, 9, 1.0, 2), [(0, "#7a4fc0"), (1, "#b48ae6")]),
                      ao=(0.7, 0.2, 10), tint=(0.5, 0.4, 0.6)))
    return parts


def cell_plate(q):
    """Flat disc (radius 1, XZ plane, normal +Y): the fusing plate plus Golgi vesicles gathered towards the growing rim."""
    rng = np.random.default_rng(66)
    pl = slab(res(34, q, 8), 0.9, 0.9, 0.028, seed=3, power=0.5, rim_ruffle=0.10, ruffle_freq=2.2)
    t = 0.5 + 0.5 * noise.fbm(pl[0] * 2.0, 4, 1.0, 3)
    parts = [part("plate", pl, ramp(t, [(0, "#9cc86a"), (0.5, "#b9dc88"), (1, "#d8eeb0")]), ao=(0.6, 0.3, 12), tint=(0.55, 0.65, 0.4), proj=1)]
    ves = []
    nv = max(int(150 * q * q + 0.5), 20)
    for i in range(nv):
        a = rng.uniform(0, 2 * np.pi)
        rr = np.sqrt(rng.uniform(0.55, 1.0)) * 1.08
        r = rng.uniform(0.032, 0.062)
        y = rng.normal(0, 0.035)
        ves.append(blob(res(6, q, 3), (r,) * 3, seed=i % 30, amp=0.08, pos=(rr * np.cos(a), y, rr * np.sin(a))))
    vv = geo.merge(*ves)
    parts.append(part("vesicles", vv, ramp(0.5 + 0.5 * noise.fbm(vv[0] * 5, 5, 1.0, 2), [(0, "#7fb458"), (0.5, "#a3cd74"), (1, "#c8e69a")]),
                      ao=(0.6, 0.2, 10), tint=(0.55, 0.65, 0.4)))
    return parts


def nuclear_envelope_fragment(q):
    """Curved patch of the double nuclear envelope (outer + inner membrane, ~1.9 wide, curvature radius 1.6) with pores."""
    R = 1.6
    cur = lambda a, b: -(a * a + b * b) / (2 * R)
    outer = slab(res(40, q, 8), 0.95, 0.95, 0.024, seed=7, power=0.5, rim_ruffle=0.07, ruffle_freq=2.0, bend=lambda a, b: cur(a, b) + 0.0)
    inner = slab(res(36, q, 8), 0.9, 0.9, 0.024, seed=8, power=0.5, rim_ruffle=0.07, ruffle_freq=2.0, bend=lambda a, b: cur(a, b) - 0.085)
    rng = np.random.default_rng(12)
    pts = []
    tries = 0
    while len(pts) < 30 and tries < 3000:
        tries += 1
        p = rng.uniform(-0.75, 0.75, 2)
        if np.hypot(*p) < 0.76 and all(np.hypot(*(p - o)) > 0.2 for o in pts):
            pts.append(p)
    pts = np.array(pts)

    def dimple(v):
        v = v.copy()
        for a, b in pts:
            dd = np.hypot(v[:, 0] - a, v[:, 2] - b)
            v[:, 1] -= 0.045 * np.exp(-(dd / 0.05) ** 2)
        return v
    ov = (dimple(outer[0]), outer[1])
    iv = (dimple(inner[0]), inner[1])
    rings = []
    for a, b in pts:                                    # a raised pore ring on the outer face and one on the inner face
        nrm = normalize(np.array([a / R, 1.0, b / R]))
        for y in (cur(a, b) + 0.016, cur(a, b) - 0.085 - 0.016):
            t = geo.torus(res(18, q, 8), res(7, q, 4), 0.062, 0.02)
            rings.append(geo.xf(t, 1.0, geo.align((0, 1, 0), nrm), (a, y, b)))
    rv = geo.merge(*rings)
    parts = []
    for name, s, pal in (("outer", ov, [(0, "#6a42b0"), (0.5, "#8658c8"), (1, "#a67ee0")]),
                         ("inner", iv, [(0, "#8a64cc"), (0.5, "#a884e0"), (1, "#c4a8f0")])):
        parts.append(part(name, s, ramp(0.5 + 0.5 * noise.fbm(s[0] * 2.2, 13, 1.0, 3), pal), ao=(0.8, 0.3, 14), tint=(0.5, 0.35, 0.72), proj=1))
    parts.append(part("pores", rv, ramp(0.5 + 0.5 * noise.fbm(rv[0] * 6, 14, 1.0, 2), [(0, "#c0508a"), (1, "#e888b4")]),
                      ao=(0.7, 0.2, 10), tint=(0.55, 0.35, 0.5)))
    return parts


META = {
    "chromosome": dict(pivot="centromere centre", axes="arms along +-Y (short arm +Y, long arm -Y); sister chromatids split along X; "
                       "kinetochores face +-X (towards the spindle poles)", units="um (X spans ~1.0 tall)",
                       tintable=True, tintParts=["arms"], neutralAlbedo=True),
    "chromosome-single": dict(pivot="centromere centre", axes="V-shaped chromatid: centromere leads towards -X (pole), arms trail to +X; "
                              "one kinetochore faces -X", units="um", tintable=True, tintParts=["arms"], neutralAlbedo=True),
    "chromatin": dict(pivot="ball centre", axes="unit ball radius 1 (scale uniformly); parts: fine (gel threads), coarse (clay loops)",
                      units="unit ball", tintable=False),
    "kinetochore-fibre": dict(pivot="kinetochore end, x = 0", axes="unit length along +X (kinetochore end x=0 wide and frayed, pole end x=1 converged); "
                              "scale X to span pole to kinetochore", units="1 along X", tintable=False),
    "spindle-pole": dict(pivot="centre of the centriole pair", axes="centrioles along X and Z; aster rays in all directions (ray length ~1.3)",
                         units="um", tintable=False),
    "cleavage-furrow-ring": dict(pivot="ring centre", axes="ring radius 1 in the XZ plane, 120-degree segment centred on +X", units="radius 1",
                                 tintable=False),
    "cell-plate": dict(pivot="disc centre", axes="disc radius ~1 in the XZ plane, normal +Y", units="radius 1", tintable=False),
    "nuclear-envelope-fragment": dict(pivot="patch centre (outer membrane apex)", axes="outward normal +Y, curvature centre at (0, -1.6, 0), patch ~1.9 wide",
                                      units="um", tintable=False),
}
TEXTURE_SIZES = {"chromosome": 2048, "chromosome-single": 2048, "chromatin": 1024, "kinetochore-fibre": 1024, "spindle-pole": 1024,
                 "cleavage-furrow-ring": 1024, "cell-plate": 1024, "nuclear-envelope-fragment": 1024}
BUILDERS = {"chromosome": chromosome, "chromosome-single": chromosome_single, "chromatin": chromatin,
            "kinetochore-fibre": kinetochore_fibre, "spindle-pole": spindle_pole, "cleavage-furrow-ring": cleavage_furrow_ring,
            "cell-plate": cell_plate, "nuclear-envelope-fragment": nuclear_envelope_fragment}
