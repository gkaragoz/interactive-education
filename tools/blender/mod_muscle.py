"""Batch 4a (v0.6 muscle): sarcomere, myosin head, actin filament, troponin-tropomyosin, cut-away muscle fibre.
Axis X is the filament axis in every asset. Tintable parts use the neutral light albedo (the app multiplies a tint per mesh)."""
import numpy as np

import geo
import noise
import texmotifs
import extrude
from paint import ramp
from shapes import res, part, blob, slab, normalize
from mod_membrane import neutral, NEUTRAL


def _neutral_col(s, seed, lift=0.0):
    return ramp(np.clip(0.5 + 0.5 * noise.fbm(s[0] * 3.0, seed, 1.0, 3) + lift, 0, 1), NEUTRAL)


def _npart(name, s, seed, **kw):
    return part(name, s, _neutral_col(s, seed), ao=kw.pop("ao", (0.7, 0.2, 12)), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18, **kw)


def _solid(hexcol):
    return np.array([int(hexcol[i:i + 2], 16) / 255 for i in (1, 3, 5)])


def _beaded(path, r, q, sides=7, beads=1.0, period=0.05, cap=3):
    s = np.linspace(0, 1, len(path))
    L = np.sum(np.linalg.norm(np.diff(path, axis=0), axis=1))
    rad = r * (1 + 0.22 * beads * np.sin(2 * np.pi * s * L / period))
    return geo.tube(path, rad, res(sides, q, 3), cap=cap if q > 0.4 else 1)


def sarcomere(q):
    """Z-disc to Z-disc, 2.5 long along X (exaggerated resting length), origin = centre (M-line). Thin actin filaments (neutral, from each
    Z-disc), 7 thick myosin filaments with heads (neutral) and a bare central zone, titin springs, Z-discs and M-line (painted)."""
    L = 1.25
    zd = []
    for s in (1.0, -1.0):
        sl = slab(res(16, q, 6), 0.66, 0.66, 0.05, seed=3, power=0.5, rim_ruffle=0.05, ruffle_freq=2.0)
        zd.append(geo.xf(sl, 1.0, geo.rot_axis((0, 0, 1), 90), (s * L, 0, 0)))
    zv = geo.merge(*zd)
    mline = geo.xf(slab(res(10, q, 4), 0.5, 0.5, 0.03, seed=5, power=0.5, rim_ruffle=0.05), 1.0, geo.rot_axis((0, 0, 1), 90), (0, 0, 0))
    thick_pos = [(0.0, 0.0)] + [(0.24 * np.cos(a), 0.24 * np.sin(a)) for a in np.arange(6) * np.pi / 3]
    thin_pos = [(0.12 * np.cos(a + 0.5), 0.12 * np.sin(a + 0.5)) for a in np.arange(6) * np.pi / 3 * 1.0]
    thin_pos += [(0.42 * np.cos(a + 0.26), 0.42 * np.sin(a + 0.26)) for a in np.arange(12) * np.pi / 6][::2 if True else 1]
    nthin = max(6, int(len(thin_pos) * min(1.0, 2.0 * q)))
    actin = []
    for k, (y, z) in enumerate(thin_pos[:nthin]):
        for s in (1.0, -1.0):
            x0, x1 = s * (L - 0.03), s * 0.30
            wob = 0.012 * np.sin(np.linspace(0, 6, 30) + k)
            path = np.stack([np.linspace(x0, x1, 30), y + wob, z - wob], 1)
            actin.append(_beaded(path, 0.032, q, sides=6, beads=1.0, period=0.07))
    av = geo.merge(*actin)
    shafts, heads = [], []
    rng = np.random.default_rng(4)
    for k, (y, z) in enumerate(thick_pos):
        path = np.stack([np.linspace(-0.74, 0.74, 24), np.full(24, y), np.full(24, z)], 1)
        rad = 0.062 * (0.55 + 0.45 * np.sin(np.linspace(0.12, np.pi - 0.12, 24)) ** 0.5)
        shafts.append(geo.tube(path, rad, res(10, q, 4), cap=3 if q > 0.4 else 1))
        step = 0.18 / min(1.0, 2.0 * q)
        rows = [x for x in np.arange(0.16, 0.7, step)]
        for x in rows:
            for sgn in (1.0, -1.0):
                for j in range(3):
                    a = 2 * np.pi * j / 3 + x * 9 + k
                    radial = np.array([0.0, np.cos(a), np.sin(a)])
                    axis = normalize(radial * 0.75 + np.array([sgn * 0.65, 0, 0]))
                    rot = geo.align((1, 0, 0), axis)
                    c = np.array([sgn * x, y, z]) + radial * 0.09
                    heads.append(blob(res(4, q, 2), (0.07, 0.032, 0.032), seed=k * 7 + j, amp=0.1, pos=c, rot=rot))
    sv, hv = geo.merge(*shafts), geo.merge(*heads)
    titin = []
    for k, (y, z) in enumerate(thick_pos[:max(int(7 * min(1.0, 2.0 * q)), 0)]):
        for s in (1.0, -1.0):
            t = np.linspace(0, 1, 26)
            path = np.stack([s * (L - 0.04 - (L - 0.78) * t), y + 0.03 * np.sin(t * 20 + k), z + 0.03 * np.cos(t * 20 + k)], 1)
            titin.append(geo.tube(path, 0.012, res(5, q, 3), cap=2 if q > 0.4 else 1))
    if not titin:
        titin = [geo.tube(np.stack([(-1.2, 0, 0), (-1.0, 0, 0), (-0.8, 0, 0)]), 0.012, 3, cap=1)]
    tv = geo.merge(*titin)
    parts = [part("z-discs", zv, ramp(0.5 + 0.5 * noise.fbm(zv[0] * 3, 2, 1.0, 3), [(0, "#b87a28"), (0.5, "#d89a42"), (1, "#f0c27a")]), ao=(0.8, 0.3, 14), tint=(0.5, 0.38, 0.28)),
             _npart("actin", av, 11, ao=(0.75, 0.2, 12)), _npart("myosin", sv, 12), _npart("heads", hv, 13, ao=(0.6, 0.15, 10)),
             part("titin", tv, np.tile(_solid("#d8c040"), (len(tv[0]), 1)), ao=(0.5, 0.1, 8), tint=(0.6, 0.55, 0.3)),
             part("m-line", mline, ramp(0.5 + 0.5 * noise.fbm(mline[0] * 3, 3, 1.0, 2), [(0, "#c85a8a"), (1, "#f0a0c0")]), ao=(0.6, 0.2, 10), tint=(0.55, 0.4, 0.45))]
    return parts


def myosin_head(q):
    """One myosin molecule head: tail (-X), hinge at the origin, lever arm and pear-shaped head (+X). Rotate `lever` + `head` about the origin for the
    power stroke. ~2.2 long. Neutral albedo (tint it), ATP pocket and actin-binding cleft marked."""
    tail = geo.tube(geo.catmull([(-1.25, 0.0, 0.0), (-0.9, 0.02, 0.0), (-0.45, -0.02, 0.0), (-0.12, 0.0, 0.0)], res(8, q, 2)), 0.05, res(10, q, 4), cap=3)
    hinge = blob(res(10, q, 4), (0.11, 0.11, 0.11), seed=1, amp=0.06)
    lever = geo.tube(geo.catmull([(0.05, 0.0, 0.0), (0.3, 0.03, 0.0), (0.58, 0.0, 0.0)], res(8, q, 2)), 0.06, res(10, q, 4), cap=3)
    head = blob(res(16, q, 6), (0.40, 0.27, 0.26), seed=2, amp=0.1, pos=(0.92, 0.0, 0.0))
    d, f = geo.cube_sphere(res(9, q, 3))
    pocket = (d * 0.07 + np.array([1.05, -0.15, 0.2]), f)
    cleft = (d * np.array([0.14, 0.04, 0.05]) + np.array([1.12, 0.27, 0.0]), f)
    return [_npart("tail", tail, 21), _npart("hinge", hinge, 22), _npart("lever", lever, 23), _npart("head", head, 24),
            part("atp-pocket", pocket, np.tile(_solid("#f0a020"), (len(pocket[0]), 1)), ao=(0.3, 0.1, 6), tint=(0.7, 0.55, 0.3)),
            part("actin-cleft", cleft, np.tile(_solid("#3fb0d8"), (len(cleft[0]), 1)), ao=(0.3, 0.1, 6), tint=(0.6, 0.6, 0.7))]


def actin_filament(q):
    """Double helix of actin beads, unit length along +X (x = 0 .. 1), helix radius 0.04, pitch 0.36. Neutral albedo, parts strand-a / strand-b."""
    n = res(42, q, 12)
    t = np.linspace(0, 1, n)
    out = []
    for k, ph in enumerate((0.0, np.pi)):
        ang = 2 * np.pi * t / 0.36 * 1.0 + ph
        pos = np.stack([t, 0.04 * np.cos(ang), 0.04 * np.sin(ang)], 1)
        beads = [blob(res(5, q, 2), (0.03,) * 3, seed=i + 50 * k, amp=0.06, pos=pos[i]) for i in range(n)]
        core = geo.tube(pos, 0.012, res(6, q, 3), cap=1)
        out.append(_npart("strand-" + "ab"[k], geo.merge(*beads, core), 31 + k, ao=(0.7, 0.1, 10)))
    return out


def troponin_tropomyosin(q):
    """Regulatory strand, unit length along +X: tropomyosin as a wavy tube (neutral) with three troponin complexes (TnC teal, TnI orange, TnT purple)."""
    n = res(60, q, 8)
    t = np.linspace(0, 1, n)
    path = np.stack([t, 0.05 * np.sin(2 * np.pi * t * 2.8), 0.05 * np.cos(2 * np.pi * t * 2.8)], 1)
    tm = geo.tube(path, 0.02, res(8, q, 3), cap=3)
    blobs = {"c": [], "i": [], "t": []}
    for k, x in enumerate((0.14, 0.5, 0.86)):
        c = np.array([x, 0.05 * np.sin(2 * np.pi * x * 2.8), 0.05 * np.cos(2 * np.pi * x * 2.8)])
        out = normalize(np.array([0.0, c[1], c[2]]))
        blobs["c"].append(blob(res(8, q, 2), (0.045,) * 3, seed=k, amp=0.1, pos=c + out * 0.07))
        blobs["i"].append(blob(res(7, q, 2), (0.035,) * 3, seed=k + 5, amp=0.1, pos=c + out * 0.07 + np.array([0.05, 0, 0])))
        blobs["t"].append(blob(res(8, q, 2), (0.06, 0.028, 0.028), seed=k + 9, amp=0.1, pos=c + out * 0.045 - np.array([0.05, 0, 0])))
    allb = [b for lst in blobs.values() for b in lst]
    bv = geo.merge(*allb)
    cols = np.concatenate([np.tile(_solid(h), (len(b[0]), 1)) for h, lst in (("#2fb09a", blobs["c"]), ("#f0983a", blobs["i"]), ("#8a66cc", blobs["t"])) for b in lst])
    return [_npart("tropomyosin", tm, 41, ao=(0.7, 0.1, 10)),
            part("troponin", bv, cols * (0.9 + 0.2 * noise.fbm(bv[0] * 15, 3, 1.0, 2))[:, None], ao=(0.6, 0.1, 10), tint=(0.55, 0.45, 0.5))]


def muscle_fibre_bundle(q):
    """Cut-away muscle fibre, 3 long along X (origin = centre of the fibre axis), radius 1: translucent sarcolemma half-pipe (cut open towards +Z)
    around 19 striated myofibrils (A / I bands), mitochondria between them and a peripheral nucleus."""
    half = extrude.half_annulus(1.0, 0.95, 180, 360, res(26, q, 8))
    V, F = extrude.extrude_polygon(half, 3.0, res(30, q, 6))
    sar = ((V + np.array([-1.5, 0, 0])), F)
    sar = (np.column_stack([V[:, 0] - 1.5, V[:, 1], V[:, 2]]), F)
    fib = []
    pos = [(0.0, -0.35)]
    ring_r = (0.3, 0.58, 0.78)
    counts = (6, 12)
    for rr, cn in zip(ring_r[:2], counts):
        for a in np.arange(cn) * 2 * np.pi / cn + (0.2 if cn == 12 else 0):
            pos.append((rr * np.cos(a), -0.35 + rr * np.sin(a) * 0.9))
    pos = [(y, z) for y, z in pos if z < -0.1 and np.hypot(y, z) < 0.82]
    cols = []
    for k, (y, z) in enumerate(pos[:19 if q > 0.4 else 9]):
        n = res(80, q, 18)
        path = np.stack([np.linspace(-1.47, 1.47, n), np.full(n, y), np.full(n, z)], 1)
        s, tv = geo.tube_t(path, 0.1, res(9, q, 3), cap=2 if q > 0.4 else 1)
        phase = (tv * 2.94 / 0.375) % 1.0                         # 8 sarcomeres along the fibre
        a_band = (phase > 0.12) & (phase < 0.78)
        c = np.where(a_band[:, None], _solid("#c8506e"), _solid("#f2b8c4"))
        c = np.where(((phase < 0.04) | (phase > 0.96))[:, None], _solid("#8a3048"), c)
        fib.append(s)
        cols.append(c * (0.92 + 0.16 * (0.5 + 0.5 * noise.fbm(s[0] * 3, k, 1.0, 2)))[:, None])
    fv = geo.merge(*fib)
    mito = [blob(res(7, q, 3), (0.12, 0.07, 0.07), seed=i, amp=0.12, pos=(-1.2 + 0.32 * i, 0.82 * np.sin(i * 2.1) * 0.6, -0.62 - 0.1 * np.cos(i))) for i in range(9)]
    mv = geo.merge(*mito)
    nuc = blob(res(12, q, 4), (0.32, 0.12, 0.2), seed=3, amp=0.1, pos=(0.4, 0.25, -0.84))
    return [part("sarcolemma", sar, ramp(0.5 + 0.5 * noise.fbm(sar[0] * 1.5, 3, 1.0, 3), [(0, "#e8a0a0"), (0.5, "#f4c0b8"), (1, "#fbe0d4")]),
                 mat="gel", alpha=0.5, hollow=False, occ=False, ao=(0.4, 0.4, 8), tint=(0.7, 0.55, 0.55)),
            part("myofibrils", fv, np.concatenate(cols), ao=(0.8, 0.2, 12), tint=(0.5, 0.35, 0.4)),
            part("mitochondria", mv, ramp(0.5 + 0.5 * noise.fbm(mv[0] * 4, 5, 1.0, 2), [(0, "#d96a20"), (1, "#f4aa5a")]), ao=(0.7, 0.2, 10), tint=(0.55, 0.38, 0.3)),
            part("nucleus", nuc, ramp(0.5 + 0.5 * noise.fbm(nuc[0] * 4, 6, 1.0, 2), [(0, "#6a46b0"), (1, "#b898e6")]), ao=(0.7, 0.2, 10), tint=(0.5, 0.4, 0.6))]


for _a, _ps in (("sarcomere", ("actin", "myosin", "heads")), ("myosin-head", ("tail", "hinge", "lever", "head")),
                ("actin-filament", ("strand-a", "strand-b")), ("troponin-tropomyosin", ("tropomyosin",))):
    for _p in _ps:
        neutral(_a, _p, w=0.05, relief=0.003, along=True, axis=(1, 0, 0))
for _a, _ps in (("sarcomere", ("z-discs", "titin", "m-line")), ("myosin-head", ("atp-pocket", "actin-cleft")), ("troponin-tropomyosin", ("troponin",)),
                ("muscle-fibre-bundle", ("sarcolemma", "myofibrils", "mitochondria", "nucleus"))):
    for _p in _ps:
        texmotifs.HINTS[(_a, _p)] = dict(w=0.06, relief=0.003, contour=0.6, along=_p in ("myofibrils", "titin"), axis=(1, 0, 0))
texmotifs.HINTS[("muscle-fibre-bundle", "sarcolemma")]["cut"] = 0.0

META = {
    "sarcomere": dict(pivot="centre (M-line)", axes="axis X: Z-discs at x = +-1.25 (2.5 long, exaggerated resting length), thin filaments grow inward from each Z-disc (part actin), "
                      "7 thick filaments (myosin) with heads (bare zone |x| < 0.12), titin springs, M-line; filaments pack in a hexagon of radius ~0.45 in YZ",
                      units="um (exaggerated)", tintable=True, tintParts=["actin", "myosin", "heads"], neutralAlbedo=True),
    "myosin-head": dict(pivot="hinge (origin)", axes="tail towards -X, lever arm and head towards +X (rotate meshes lever + head about the origin for the power stroke); atp-pocket and actin-cleft markers; ~2.2 long",
                        units="um (exaggerated)", tintable=True, tintParts=["tail", "hinge", "lever", "head"], neutralAlbedo=True),
    "actin-filament": dict(pivot="start of the filament (x = 0)", axes="unit length along +X, double helix of beads radius 0.04, pitch 0.36 (scale X to fit); parts strand-a / strand-b",
                           units="1 along X", tintable=True, tintParts=["strand-a", "strand-b"], neutralAlbedo=True),
    "troponin-tropomyosin": dict(pivot="start of the strand (x = 0)", axes="unit length along +X, tropomyosin wavy tube radius 0.05 around the axis; troponin complexes (TnC teal, TnI orange, TnT purple) at x = 0.14, 0.5, 0.86",
                                 units="1 along X", tintable=True, tintParts=["tropomyosin"], neutralAlbedo=True),
    "muscle-fibre-bundle": dict(pivot="centre of the fibre axis", axes="fibre 3 long along X, radius 1, cut open towards +Z: translucent sarcolemma half-pipe (gel), 19 striated myofibrils (8 sarcomeres), mitochondria, peripheral nucleus",
                                units="um (exaggerated)", tintable=False, cutOpen="z=0 plane, open towards +Z"),
}
TEXTURE_SIZES = {"sarcomere": 1024, "myosin-head": 1024, "actin-filament": 512, "troponin-tropomyosin": 512, "muscle-fibre-bundle": 1024}
BUILDERS = {"sarcomere": sarcomere, "myosin-head": myosin_head, "actin-filament": actin_filament, "troponin-tropomyosin": troponin_tropomyosin,
            "muscle-fibre-bundle": muscle_fibre_bundle}
