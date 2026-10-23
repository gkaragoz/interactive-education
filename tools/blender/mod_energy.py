"""Batch 3 (v0.5 energy): ATP synthase, electron-transport complexes, photosystems, rubisco, small molecules, thylakoid stack,
mitochondrion crista detail. Membrane assets: membrane plane = XZ, pivot at the membrane centre, +Y = one face (see META).
Cut-open assets are clipped at a plane (clip.clip_cap): the front half is removed and the cut is closed with flat caps that
the painter turns into a painted section."""
import numpy as np

import geo
import noise
import clip
import texmotifs
from paint import ramp
from shapes import res, part, blob, slab, normalize
from mod_membrane import neutral, _helix, NEUTRAL

ELEMENT = {"c": ("#6e7690", "#9aa2bc", 0.17), "o": ("#d8402e", "#f27a62", 0.16), "h": ("#e8e2e2", "#fbf8f8", 0.10),
           "p": ("#e08a10", "#f8c050", 0.20), "n": ("#3a64d0", "#7aa0f0", 0.16)}
BOND = ("#cfc6b6", "#ece6da")


def _cutz_old(surf, z0):  # superseded by clip.clip_cap (kept for reference, unused)
    v = surf[0].copy()
    v[:, 2] = np.where(v[:, 2] > z0, z0 + (v[:, 2] - z0) * 0.003, v[:, 2])      # squash (not clamp): keeps every triangle non-degenerate
    return v, surf[1]


def _paint(surf, pal, seed, **kw):
    return ramp(0.5 + 0.5 * noise.fbm(surf[0] * 2.5, seed, 1.0, 3), pal)


# ----------------------------------------------------------------------------------------------- ball-and-stick molecules
def molecule(q, atoms, bonds, sizes=1.0, n_atom=7):
    """atoms: [(element, (x, y, z))], bonds: [(i, j, order)]. One part per element plus `bonds` (all painted, not tinted)."""
    groups = {e: [] for e in ELEMENT}
    for k, (e, p) in enumerate(atoms):
        groups[e].append(blob(res(n_atom, q, 2), (ELEMENT[e][2] * sizes,) * 3, seed=k, amp=0.04, pos=p))
    tubes = []
    for i, j, order in bonds:
        a, b = np.array(atoms[i][1], float), np.array(atoms[j][1], float)
        d = normalize(b - a)
        side = normalize(np.cross(d, (0.0, 0.0, 1.0)) if abs(d[2]) < 0.9 else np.cross(d, (1.0, 0.0, 0.0)))
        offs = [0.0] if order == 1 else [-0.05, 0.05]
        for o in offs:
            tubes.append(geo.tube(np.stack([a + side * o, (a + b) / 2 + side * o, b + side * o]), 0.032 * sizes, res(8, q, 3), cap=2))
    parts = []
    for e, lst in groups.items():
        if lst:
            s = geo.merge(*lst)
            parts.append(part({"c": "carbon", "o": "oxygen", "h": "hydrogen", "p": "phosphorus", "n": "nitrogen"}[e], s,
                              ramp(0.5 + 0.5 * noise.fbm(s[0] * 5, 3, 1.0, 2), [(0, ELEMENT[e][0]), (1, ELEMENT[e][1])]), ao=(0.7, 0.2, 12),
                              tint=(0.55, 0.45, 0.5)))
    if tubes:
        s = geo.merge(*tubes)
        parts.append(part("bonds", s, ramp(0.5 + 0.5 * noise.fbm(s[0] * 5, 4, 1.0, 2), [(0, BOND[0]), (1, BOND[1])]), ao=(0.6, 0.15, 10),
                          tint=(0.6, 0.55, 0.5)))
    return parts


def co2(q):
    return molecule(q, [("o", (-0.62, 0, 0)), ("c", (0, 0, 0)), ("o", (0.62, 0, 0))], [(0, 1, 2), (1, 2, 2)], 1.0, 13)


def o2(q):
    return molecule(q, [("o", (-0.36, 0, 0)), ("o", (0.36, 0, 0))], [(0, 1, 2)], 1.1, 16)


def h2o(q):
    a = np.radians(104.5 / 2)
    return molecule(q, [("o", (0, 0, 0)), ("h", (0.55 * np.sin(a), -0.55 * np.cos(a), 0)), ("h", (-0.55 * np.sin(a), -0.55 * np.cos(a), 0))],
                    [(0, 1, 1), (0, 2, 1)], 1.15, 13)


def pyruvate(q):
    """CH3-CO-COO-: methyl, carbonyl, carboxylate (zig-zag in the XY plane)."""
    atoms = [("c", (-0.9, 0.0, 0)), ("c", (-0.15, 0.35, 0)), ("o", (-0.2, 1.0, 0)), ("c", (0.75, -0.1, 0)), ("o", (0.7, -0.78, 0)), ("o", (1.5, 0.3, 0)),
             ("h", (-1.3, -0.5, 0.5)), ("h", (-1.35, 0.5, -0.1)), ("h", (-0.6, -0.55, -0.55))]
    bonds = [(0, 1, 1), (1, 2, 2), (1, 3, 1), (3, 4, 2), (3, 5, 1), (0, 6, 1), (0, 7, 1), (0, 8, 1)]
    return molecule(q, atoms, bonds, 1.0, 10)


def glucose(q):
    """Pyranose ring (C1-C5 + ring O) with OH groups and CH2OH, ring in the XZ plane (flat, y up); about 2.4 across."""
    R = 0.62
    ring = []
    for k in range(6):
        a = 2 * np.pi * k / 6
        ring.append(((R * np.cos(a), 0.07 * (-1) ** k, R * np.sin(a))))
    atoms = [("c", ring[0]), ("c", ring[1]), ("c", ring[2]), ("c", ring[3]), ("c", ring[4]), ("o", ring[5])]
    bonds = [(i, (i + 1) % 6, 1) for i in range(6)]
    for k in range(4):                                               # OH on C1..C4, alternating up / down
        a = 2 * np.pi * k / 6
        out = np.array([np.cos(a), 0, np.sin(a)])
        up = 0.5 * (1 if k % 2 == 0 else -1)
        o = np.array(ring[k]) + out * 0.5 + np.array([0, up, 0])
        atoms.append(("o", tuple(o)))
        bonds.append((k, len(atoms) - 1, 1))
        atoms.append(("h", tuple(o + out * 0.28 + np.array([0, 0.18 * np.sign(up), 0]))))
        bonds.append((len(atoms) - 2, len(atoms) - 1, 1))
    a = 2 * np.pi * 4 / 6
    out = np.array([np.cos(a), 0, np.sin(a)])
    c6 = np.array(ring[4]) + out * 0.5 + [0, 0.45, 0]
    atoms.append(("c", tuple(c6)))
    bonds.append((4, len(atoms) - 1, 1))
    o6 = c6 + out * 0.45 + [0, 0.3, 0]
    atoms.append(("o", tuple(o6)))
    bonds.append((len(atoms) - 2, len(atoms) - 1, 1))
    atoms.append(("h", tuple(o6 + out * 0.25 + [0, 0.2, 0])))
    bonds.append((len(atoms) - 2, len(atoms) - 1, 1))
    return molecule(q, atoms, bonds, 1.0, 9)


def atp(q):
    """Adenosine (adenine two-ring base + ribose ring) and a chain of three phosphate groups along +X. Origin = ribose centre. Neutral
    albedo: tint adenosine / phosphate-1..3 independently (phosphate-3 is the terminal one that is cleaved off)."""
    ad = [blob(res(10, q, 2), (0.27, 0.05, 0.2), seed=1, amp=0.05, pos=(-0.88, 0.0, 0.0)),
          blob(res(9, q, 2), (0.20, 0.05, 0.16), seed=2, amp=0.05, pos=(-1.28, 0.0, 0.06)),
          geo.torus(res(18, q, 6), res(7, q, 3), 0.2, 0.065),
          geo.tube(np.stack([(0.18, 0, 0), (0.0, 0, 0), (-0.55, 0, 0)])[::-1], 0.05, res(8, q, 4), cap=2)]
    adv = geo.merge(*ad)
    parts = [part("adenosine", adv, _paint_neutral(adv, 5), ao=(0.7, 0.2, 12), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)]
    for k in range(3):
        x = 0.62 + 0.46 * k
        pieces = [blob(res(10, q, 2), (0.15, 0.15, 0.15), seed=k, amp=0.05, pos=(x, 0.0, 0.0))]
        for j in range(4):
            a = 2 * np.pi * j / 4 + k
            pieces.append(blob(res(6, q, 2), (0.075,) * 3, seed=j, amp=0.05, pos=(x + 0.02, 0.19 * np.cos(a), 0.19 * np.sin(a))))
        if k < 2:
            pieces.append(geo.tube(np.stack([(x + 0.12, 0, 0), (x + 0.23, 0, 0), (x + 0.34, 0, 0)]), 0.045, res(8, q, 3), cap=2))
        s = geo.merge(*pieces)
        parts.append(part("phosphate-%d" % (k + 1), s, _paint_neutral(s, 8 + k), ao=(0.7, 0.2, 12), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18))
    return parts


def _paint_neutral(s, seed):
    return ramp(np.clip(0.5 + 0.5 * noise.fbm(s[0] * 3.0, seed, 1.0, 3), 0, 1), NEUTRAL)


# ----------------------------------------------------------------------------------------------- membrane machines
def _tm_bundle(q, n, rx, rz, h, r0, seed=0, y0=0.0):
    hel = []
    for i in range(n):
        a = 2 * np.pi * i / n
        x, z = rx * np.cos(a), rz * np.sin(a)
        pts = [(x * 1.03, y0 - h, z * 1.03), (x * 0.97, y0, z * 0.97), (x * 1.02, y0 + h, z * 1.02)]
        hel.append(_helix(pts, r0, q, sides=8, seed=seed + i))
    return hel


def atp_synthase(q):
    """Rotary ATP synthase: c-ring (membrane, y -0.3..0.3) + central stalk = part `rotor` (spins about Y), a-subunit + peripheral stator arm
    = `stator`, F1 head of 3 alpha + 3 beta lobes = `head`. ~1.8 tall (y -0.3..1.55). Origin = membrane centre on the rotation axis."""
    ring = []
    for i in range(10):
        a = 2 * np.pi * i / 10
        ring.append(blob(res(8, q, 4), (0.095, 0.30, 0.095), seed=i, amp=0.08, pos=(0.30 * np.cos(a), 0.0, 0.30 * np.sin(a))))
    stalk_path = geo.catmull([(0.0, 0.2, 0.0), (0.02, 0.55, 0.0), (0.0, 0.9, 0.0), (0.0, 1.25, 0.0)], res(6, q, 2))
    stalk = geo.tube(stalk_path, np.linspace(0.12, 0.08, len(stalk_path)), res(10, q, 4), cap=3)
    cap = blob(res(8, q, 3), (0.34, 0.06, 0.34), seed=3, amp=0.05, pos=(0.0, 0.3, 0.0))
    rotor = geo.merge(*ring, stalk, cap)
    asub = blob(res(14, q, 5), (0.26, 0.32, 0.20), seed=4, amp=0.08, pos=(0.50, 0.0, 0.18))
    arm = geo.tube(geo.catmull([(0.55, 0.28, 0.25), (0.78, 0.65, 0.3), (0.74, 1.1, 0.22), (0.52, 1.4, 0.12)], res(7, q, 2)), 0.075, res(10, q, 4), cap=3)
    stator = geo.merge(asub, arm)
    lobes = []
    for i in range(6):
        a = 2 * np.pi * i / 6
        lobes.append(blob(res(12, q, 5), (0.24, 0.32, 0.24), seed=i, amp=0.08, pos=(0.30 * np.cos(a), 1.12, 0.30 * np.sin(a))))
    lobes.append(blob(res(10, q, 4), (0.36, 0.14, 0.36), seed=9, amp=0.06, pos=(0.0, 1.46, 0.0)))
    head = geo.merge(*lobes)
    return [part("rotor", rotor, ramp(_n(rotor, 1), [(0, "#d96a20"), (0.5, "#f08c3a"), (1, "#f8b878")]), ao=(0.8, 0.3, 14), tint=(0.55, 0.38, 0.3)),
            part("stator", stator, ramp(_n(stator, 2), [(0, "#6a46b0"), (0.5, "#8a66cc"), (1, "#b898e6")]), ao=(0.8, 0.3, 14), tint=(0.5, 0.4, 0.62)),
            part("head", head, ramp(_n(head, 3), [(0, "#1f8f8a"), (0.5, "#35b9a9"), (1, "#86dcc4")]), ao=(0.85, 0.3, 14), tint=(0.45, 0.5, 0.55))]


def _n(s, seed):
    return 0.5 + 0.5 * noise.fbm(s[0] * 2.5, seed, 1.0, 3)


def _complex(q, name, hel, lobes, pal_hel, pal_lobe, extra=None):
    h = geo.merge(*hel)
    lv = geo.merge(*lobes)
    out = [part("transmembrane", h, ramp(_n(h, 11), pal_hel), ao=(0.85, 0.3, 14), tint=(0.5, 0.45, 0.55)),
           part("lobes", lv, ramp(_n(lv, 12), pal_lobe), ao=(0.8, 0.3, 14), tint=(0.5, 0.4, 0.5))]
    if extra is not None:
        e = geo.merge(*extra)
        out.append(part("cofactor", e, ramp(_n(e, 13), [(0, "#f0a020"), (1, "#f8d878")]), ao=(0.5, 0.1, 8), tint=(0.7, 0.55, 0.3)))
    return out


def etc_complex_1(q):
    """Complex I (NADH dehydrogenase): L shape. Membrane arm along X (y -0.45..0.45) + peripheral arm rising into the matrix at x = +0.7
    (towards -Y here: matrix side is -Y). ~2.0 long, 1.4 tall."""
    hel = _tm_bundle(q, 14, 0.78, 0.30, 0.45, 0.10, 1)
    hel += [_helix([(0.9, 0.5, 0.0), (0.9, 0.0, 0.0), (0.9, -0.5, 0.0)], 0.11, q, sides=8, seed=40 + i) for i in range(2)]
    lobes = [blob(res(16, q, 5), (0.36, 0.36, 0.30), seed=1, amp=0.1, pos=(0.62, -0.78, 0.0)),
             blob(res(14, q, 5), (0.30, 0.34, 0.28), seed=2, amp=0.1, pos=(0.82, -1.15, 0.0)),
             blob(res(10, q, 4), (0.22, 0.2, 0.2), seed=3, amp=0.1, pos=(-0.55, 0.55, 0.0))]
    fmn = [blob(res(7, q, 3), (0.07,) * 3, seed=1, amp=0.05, pos=(0.7, -1.45, 0.14))]
    return _complex(q, "i", hel, lobes, [(0, "#6a46b0"), (0.5, "#8a66cc"), (1, "#b898e6")], [(0, "#8a3e9a"), (0.5, "#b05ec0"), (1, "#d8a0e6")], fmn)


def etc_complex_2(q):
    """Complex II (succinate dehydrogenase): small, compact. 0.8 wide, ~1.3 tall, two matrix-side lobes."""
    hel = _tm_bundle(q, 8, 0.28, 0.24, 0.45, 0.095, 2)
    lobes = [blob(res(14, q, 5), (0.32, 0.30, 0.28), seed=1, amp=0.1, pos=(0.12, -0.75, 0.0)),
             blob(res(12, q, 5), (0.26, 0.26, 0.24), seed=2, amp=0.1, pos=(-0.14, -1.05, 0.05))]
    fad = [blob(res(7, q, 3), (0.07,) * 3, seed=1, amp=0.05, pos=(0.0, -0.9, 0.22))]
    return _complex(q, "ii", hel, lobes, [(0, "#1f8f8a"), (0.5, "#35b9a9"), (1, "#86dcc4")], [(0, "#2a7a9a"), (0.5, "#4a9cbc"), (1, "#92cce0")], fad)


def etc_complex_3(q):
    """Complex III (cytochrome bc1) dimer: two helix bundles side by side (along X), two lobes in the intermembrane space (+Y)."""
    hel = _tm_bundle(q, 9, 0.30, 0.26, 0.45, 0.095, 3)
    hel = [geo.xf(h, 1.0, None, (-0.4, 0, 0)) for h in hel] + [geo.xf(h, 1.0, None, (0.4, 0, 0)) for h in _tm_bundle(q, 9, 0.30, 0.26, 0.45, 0.095, 13)]
    lobes = [blob(res(14, q, 5), (0.30, 0.34, 0.28), seed=1, amp=0.1, pos=(-0.4, 0.8, 0.0)),
             blob(res(14, q, 5), (0.30, 0.34, 0.28), seed=2, amp=0.1, pos=(0.4, 0.8, 0.0)),
             blob(res(12, q, 4), (0.26, 0.24, 0.24), seed=3, amp=0.1, pos=(0.0, -0.7, 0.0))]
    return _complex(q, "iii", hel, lobes, [(0, "#d96a20"), (0.5, "#f08c3a"), (1, "#f8b878")], [(0, "#c8503e"), (0.5, "#e8745a"), (1, "#f6aa8c")])


def etc_complex_4(q):
    """Complex IV (cytochrome c oxidase): twelve helices, a dome in the intermembrane space where cytochrome c docks (+Y), ~1.2 tall."""
    hel = _tm_bundle(q, 12, 0.36, 0.30, 0.45, 0.09, 4)
    lobes = [blob(res(16, q, 5), (0.40, 0.34, 0.34), seed=1, amp=0.1, pos=(0.0, 0.75, 0.0)),
             blob(res(12, q, 4), (0.30, 0.24, 0.28), seed=2, amp=0.1, pos=(0.0, -0.65, 0.0))]
    cu = [blob(res(7, q, 3), (0.07,) * 3, seed=1, amp=0.05, pos=(0.0, 0.5, 0.3))]
    return _complex(q, "iv", hel, lobes, [(0, "#b0407a"), (0.5, "#d0609a"), (1, "#eea0c0")], [(0, "#8a3a6a"), (0.5, "#b05a8e"), (1, "#dca0c0")], cu)


def cytochrome_c(q):
    """Small electron carrier: compact protein (about 0.8 across) with a heme disc in a crevice. Origin = protein centre."""
    body = blob(res(16, q, 6), (0.36, 0.34, 0.32), seed=1, amp=0.12, freq=1.6)
    hel = [_helix([(0.3 * np.cos(a), -0.2, 0.3 * np.sin(a)), (0.34 * np.cos(a + 0.4), 0.1, 0.34 * np.sin(a + 0.4)),
                   (0.26 * np.cos(a + 0.8), 0.32, 0.26 * np.sin(a + 0.8))], 0.07, q, sides=7, seed=i) for i, a in enumerate((0.3, 2.4, 4.5))]
    pv = geo.merge(body, *hel)
    d, f = geo.cube_sphere(res(9, q, 4))
    heme = (d * np.array([0.17, 0.045, 0.17]) @ geo.rot_axis((1, 0, 0), 80).T + np.array([0.0, 0.0, 0.34]), f)
    return [part("protein", pv, ramp(_n(pv, 5), [(0, "#c8503e"), (0.5, "#e8745a"), (1, "#f6aa8c")]), ao=(0.8, 0.3, 14), tint=(0.55, 0.38, 0.3)),
            part("heme", heme, ramp(_n(heme, 6), [(0, "#7a1a2a"), (1, "#c03a4a")]), ao=(0.4, 0.1, 8), tint=(0.5, 0.35, 0.35))]


def ubiquinone(q):
    """Quinone ring head (hexagon, two methoxy bumps, two oxygens) and a curly isoprenoid tail. About 1.7 long along X; origin = ring centre."""
    ring = geo.torus(res(24, q, 6), res(8, q, 3), 0.2, 0.055)
    ring = geo.xf(ring, 1.0, geo.rot_axis((1, 0, 0), 90), (0, 0, 0))
    bumps = [blob(res(7, q, 2), (0.08,) * 3, seed=i, amp=0.08, pos=(0.0, 0.3 * s, 0.04)) for i, s in enumerate((1, -1))]
    ox = [blob(res(7, q, 2), (0.085,) * 3, seed=i + 5, amp=0.05, pos=(0.27 * s, 0.0, 0.0)) for i, s in enumerate((1, -1))]
    head = geo.merge(ring, *bumps)
    oxy = geo.merge(*ox)
    t = np.linspace(0, 1, 60)
    tail_path = np.stack([0.3 + 1.35 * t, 0.12 * np.sin(2 * np.pi * 3 * t), 0.12 * np.cos(2 * np.pi * 3 * t)], 1)
    tail = geo.tube(tail_path[::max(int(1 / max(q, 0.1)), 1)] if q < 0.4 else tail_path, 0.05, res(9, q, 3), cap=3)
    return [part("head", head, ramp(_n(head, 7), [(0, "#e08a10"), (0.5, "#f4aa38"), (1, "#f8d078")]), ao=(0.7, 0.2, 12), tint=(0.6, 0.45, 0.3)),
            part("oxygens", oxy, ramp(_n(oxy, 8), [(0, "#d8402e"), (1, "#f27a62")]), ao=(0.5, 0.1, 8), tint=(0.55, 0.4, 0.4)),
            part("tail", tail, ramp(_n(tail, 9), [(0, "#7a58c0"), (0.5, "#9a78d8"), (1, "#c4acec")]), ao=(0.7, 0.15, 10), tint=(0.5, 0.4, 0.6))]


def _photosystem(q, big):
    """Disc-like pigment-protein complex in the thylakoid membrane (XZ plane, y -0.3..0.3): core, ring of antenna lobes, chlorophyll discs on the
    lumen face (+Y) and the reaction-centre marker; photosystem II adds the oxygen-evolving bump (+Y). ~2.2 across."""
    R = 0.95 if big else 0.8
    core = blob(res(18, q, 6), (0.62 * R, 0.30, 0.50 * R), seed=1, amp=0.08, pos=(0.0, 0.0, 0.0))
    hel = _tm_bundle(q, 14 if big else 11, 0.62 * R, 0.5 * R, 0.30, 0.075, 5)
    ant = []
    nan = 6 if big else 5
    for i in range(nan):
        a = 2 * np.pi * i / nan + 0.3
        ant.append(blob(res(12, q, 3), (0.30, 0.26, 0.28), seed=i, amp=0.1, pos=(1.0 * R * np.cos(a) * 1.0, 0.0, 0.9 * R * np.sin(a))))
    cv = geo.merge(core, *hel)
    av = geo.merge(*ant)
    rng = np.random.default_rng(7)
    chl = []
    for i in range(18 if big else 14):
        a = rng.uniform(0, 2 * np.pi)
        r = rng.uniform(0.15, 1.2) * R
        d, f = geo.cube_sphere(res(6, q, 2))
        chl.append((d * np.array([0.07, 0.018, 0.07]) + np.array([r * np.cos(a) * 0.9, 0.31 if r < 0.6 * R else 0.27, r * np.sin(a) * 0.8]), f))
    chv = geo.merge(*chl)
    parts = [part("core", cv, ramp(_n(cv, 21), [(0, "#2a8a4a"), (0.5, "#4cb06a"), (1, "#92d8a4")] if not big else [(0, "#1f7a6a"), (0.5, "#34a08a"), (1, "#86d0bc")]),
                  ao=(0.85, 0.3, 14), tint=(0.45, 0.55, 0.5)),
             part("antenna", av, ramp(_n(av, 22), [(0, "#6aa830"), (0.5, "#8ac84a"), (1, "#c0e486")]), ao=(0.8, 0.3, 14), tint=(0.5, 0.6, 0.4)),
             part("chlorophyll", chv, ramp(_n(chv, 23), [(0, "#1a6a2a"), (1, "#3aa04a")]), ao=(0.4, 0.1, 8), tint=(0.5, 0.6, 0.5)),
             part("reaction-centre", geo.merge(blob(res(8, q, 3), (0.1, 0.06, 0.1), seed=1, amp=0.05, pos=(0.0, 0.32, 0.0))),
                  np.tile(np.array([0.97, 0.78, 0.25]), (len(blob(res(8, q, 3), (0.1, 0.06, 0.1), seed=1, amp=0.05)[0]), 1)), ao=(0.3, 0.1, 6), tint=(0.7, 0.55, 0.3))]
    if big:
        oec = blob(res(12, q, 4), (0.26, 0.22, 0.24), seed=3, amp=0.1, pos=(0.0, 0.5, 0.2))
        parts.append(part("oxygen-evolving", oec, ramp(_n(oec, 24), [(0, "#e08a10"), (0.5, "#f4aa38"), (1, "#f8d078")]), ao=(0.6, 0.2, 10), tint=(0.6, 0.45, 0.3)))
    return parts


def photosystem_1(q):
    return _photosystem(q, False)


def photosystem_2(q):
    return _photosystem(q, True)


def rubisco(q):
    """Blocky Calvin-cycle enzyme: 8 large subunits (2 x 2 x 2 cube) with 8 small subunits capping the top and bottom faces. About 1.5 across."""
    big, small = [], []
    for i, (sx, sy, sz) in enumerate([(a, b, c) for a in (-1, 1) for b in (-1, 1) for c in (-1, 1)]):
        big.append(blob(res(14, q, 5), (0.34, 0.32, 0.34), seed=i, amp=0.09, pos=(0.36 * sx, 0.34 * sy, 0.36 * sz)))
    for i, (sx, sz) in enumerate([(a, c) for a in (-1, 1) for c in (-1, 1)]):
        for sy in (-1, 1):
            small.append(blob(res(9, q, 4), (0.24, 0.17, 0.24), seed=20 + i, amp=0.1, pos=(0.36 * sx, 0.74 * sy, 0.36 * sz)))
    bv, sv = geo.merge(*big), geo.merge(*small)
    return [part("large", bv, ramp(_n(bv, 31), [(0, "#3a8a3a"), (0.5, "#5cb050"), (1, "#a4dc88")]), ao=(0.85, 0.35, 16), tint=(0.45, 0.55, 0.4)),
            part("small", sv, ramp(_n(sv, 32), [(0, "#d0a020"), (0.5, "#eac040"), (1, "#f8e088")]), ao=(0.8, 0.3, 14), tint=(0.6, 0.55, 0.3))]


# ----------------------------------------------------------------------------------------------- cut-open views
def thylakoid_stack(q):
    """Grana stack cut open: 8 flattened sacs (radius 1, stack along Y, origin = stack centre) cut at z = 0 (open towards +Z): the cut face is
    painted as a section (green membrane outline, pale lumen) plus stroma lamellae joining the stack to the side. ~1.5 tall."""
    n = 8
    mem, lum = [], []
    for i in range(n):
        y = (i - (n - 1) / 2) * 0.19
        r = 1.0 - 0.05 * abs(i - (n - 1) / 2) / 4
        d1 = slab(res(18, q, 6), r, r, 0.075, seed=10 + i, power=0.5, rim_ruffle=0.05, ruffle_freq=2.0)
        mem.append(clip.clip_cap((d1[0] + np.array([0, y, 0]), d1[1]), 0.0)[:2])
        d2 = slab(res(14, q, 5), r - 0.09, r - 0.09, 0.040, seed=30 + i, power=0.5, rim_ruffle=0.04, ruffle_freq=2.0)
        lum.append(clip.clip_cap((d2[0] + np.array([0, y, 0]), d2[1]), 0.012)[:2])
    lam = []
    for k in range(3):
        a = np.radians(200 + 55 * k)
        y = (k - 1) * 0.4
        sl = slab(res(12, q, 5), 0.5, 0.12, 0.03, seed=50 + k, power=0.5, rim_ruffle=0.06)
        lam.append(geo.xf(sl, 1.0, geo.rot_axis((0, 1, 0), -np.degrees(a)), (1.35 * np.cos(a), y, 1.35 * np.sin(a))))
    mv, lv, sv = geo.merge(*mem), geo.merge(*lum), geo.merge(*lam)
    return [part("membrane", mv, ramp(_n(mv, 41), [(0, "#3a8a2a"), (0.5, "#5cb040"), (1, "#a0d878")]), ao=(0.8, 0.3, 14), tint=(0.5, 0.6, 0.4)),
            part("lumen", lv, ramp(_n(lv, 42), [(0, "#a8d8e0"), (0.5, "#c8ecf0"), (1, "#e8f8fa")]), ao=(0.5, 0.2, 10), tint=(0.7, 0.8, 0.8)),
            part("stroma-lamellae", sv, ramp(_n(sv, 43), [(0, "#6ab04a"), (1, "#b8e090")]), ao=(0.6, 0.2, 10), tint=(0.55, 0.65, 0.45))]


def mitochondrion_crista_detail(q):
    """The mitochondrion (org_energy) at 1.7x, cut open at z = 0 (open towards +Z) so cristae, junctions, matrix granules and mtDNA are visible
    in section, with 36 small ATP-synthase lollipops on the cristae. Origin = mitochondrion centre; long axis X."""
    import org_energy
    base = org_energy.mitochondrion(q * 0.75)
    sc = 1.7
    out = []
    for p, z0 in zip(base, (0.0, 0.01, 0.02, 0.03)):
        p.V = p.V * sc
        clip.clip_part(p, z0 * sc)
        out.append(p)
    rng = np.random.default_rng(3)
    cr = base[2]
    heads, stems = [], []
    idx = rng.permutation(len(cr.V))
    nn = geo.normals(cr.V, cr.F)
    cnt = 0
    for i in idx:
        if cnt >= int(22 * min(q, 1.0) ** 1.5 + 3):
            break
        if cr.V[i][2] > -0.05 * sc:
            continue
        pos = cr.V[i] + nn[i] * 0.01
        stems.append(geo.tube(np.stack([pos, pos + nn[i] * 0.06, pos + nn[i] * 0.12]), 0.014, res(6, q, 3), cap=2))
        heads.append(blob(res(5, q, 2), (0.045,) * 3, seed=cnt, amp=0.06, pos=pos + nn[i] * 0.16))
        cnt += 1
    sv = geo.merge(*stems, *heads)
    out.append(part("synthases", sv, ramp(_n(sv, 5), [(0, "#6a46b0"), (1, "#b898e6")]), ao=(0.6, 0.1, 10), tint=(0.5, 0.4, 0.6)))
    return out


for _a, _ps in (("co2", ("carbon", "oxygen", "bonds")), ("o2", ("oxygen", "bonds")), ("h2o", ("oxygen", "hydrogen", "bonds")),
                ("pyruvate", ("carbon", "oxygen", "hydrogen", "bonds")), ("glucose", ("carbon", "oxygen", "hydrogen", "bonds"))):
    for _p in _ps:
        texmotifs.HINTS[(_a, _p)] = dict(w=0.06, relief=0.003, contour=0.6)
for _p in ("adenosine", "phosphate-1", "phosphate-2", "phosphate-3"):
    neutral("atp", _p, w=0.05, relief=0.003)
for _a, _ps in (("atp-synthase", ("rotor", "stator", "head")), ("etc-complex-1", ("transmembrane", "lobes", "cofactor")),
                ("etc-complex-2", ("transmembrane", "lobes", "cofactor")), ("etc-complex-3", ("transmembrane", "lobes")),
                ("etc-complex-4", ("transmembrane", "lobes", "cofactor")), ("cytochrome-c", ("protein", "heme")),
                ("ubiquinone", ("head", "oxygens", "tail")), ("photosystem-1", ("core", "antenna", "chlorophyll", "reaction-centre")),
                ("photosystem-2", ("core", "antenna", "chlorophyll", "reaction-centre", "oxygen-evolving")), ("rubisco", ("large", "small"))):
    for _p in _ps:
        texmotifs.HINTS[(_a, _p)] = dict(w=0.07, relief=0.004, contour=0.7, along=_a in ("atp-synthase",), axis=(0, 1, 0))
for _a, _ps, _z in (("thylakoid-stack", (("membrane", 0.0), ("lumen", 0.012), ("stroma-lamellae", None)), None),
                    ("mitochondrion-crista-detail", (("outer", 0.0), ("inner", 0.017), ("cristae", 0.034), ("matrix", 0.051)), None)):
    for _p, _c in _ps:
        h = dict(w=0.08, relief=0.003, contour=0.6)
        if _c is not None:
            h["cut"] = _c
        texmotifs.HINTS[(_a, _p)] = h
texmotifs.HINTS[("mitochondrion-crista-detail", "synthases")] = dict(w=0.04, relief=0.002)

META = {
    "atp-synthase": dict(pivot="membrane centre on the rotation axis", axes="axis Y: c-ring in the membrane (y -0.3..0.3), stalk and F1 head towards +Y (matrix side, up to 1.55); meshes rotor (c-ring + stalk, rotate about Y), stator, head; ~1.8 tall",
                         units="um", tintable=False),
    "etc-complex-1": dict(pivot="membrane centre", axes="membrane plane XZ; L shape: membrane arm along X, peripheral arm into the matrix (-Y) at x ~ +0.8; ~2 wide, ~1.5 tall", units="um", tintable=False),
    "etc-complex-2": dict(pivot="membrane centre", axes="membrane plane XZ; matrix lobes towards -Y; ~0.8 wide, ~1.3 tall", units="um", tintable=False),
    "etc-complex-3": dict(pivot="membrane centre", axes="membrane plane XZ; dimer along X; intermembrane-space lobes towards +Y", units="um", tintable=False),
    "etc-complex-4": dict(pivot="membrane centre", axes="membrane plane XZ; docking dome for cytochrome c towards +Y (intermembrane space); ~1.2 tall", units="um", tintable=False),
    "cytochrome-c": dict(pivot="protein centre", axes="~0.8 across, heme disc facing +Z", units="um", tintable=False),
    "ubiquinone": dict(pivot="ring centre", axes="ring in YZ plane, curly isoprenoid tail along +X; ~1.7 long", units="um", tintable=False),
    "photosystem-1": dict(pivot="membrane centre", axes="thylakoid membrane plane XZ; chlorophyll discs and reaction-centre marker on the lumen face (+Y); ~2 across", units="um", tintable=False),
    "photosystem-2": dict(pivot="membrane centre", axes="thylakoid membrane plane XZ; chlorophylls, reaction centre and the oxygen-evolving bump on the lumen face (+Y); ~2.2 across", units="um", tintable=False),
    "rubisco": dict(pivot="centre of the enzyme", axes="cube-like, 8 large subunits (green) with small subunits (ochre) capping +-Y; ~1.5 across", units="um", tintable=False),
    "atp": dict(pivot="ribose centre", axes="chain along +X: adenine (x ~ -1), ribose ring at the origin, phosphates 1..3 at x = 0.62, 1.08, 1.54 (3 = terminal, cleaved off); parts adenosine, phosphate-1..3, neutral albedo",
                units="um (exaggerated)", tintable=True, tintParts=["adenosine", "phosphate-1", "phosphate-2", "phosphate-3"], neutralAlbedo=True),
    "glucose": dict(pivot="ring centre", axes="pyranose ring in the XZ plane (y up), OH groups alternate up/down, CH2OH on the ring carbon at 240 degrees; ~2.4 across; parts carbon, oxygen, hydrogen, bonds",
                    units="um (exaggerated)", tintable=False),
    "co2": dict(pivot="carbon atom", axes="linear molecule along X (O=C=O)", units="um (exaggerated)", tintable=False),
    "o2": dict(pivot="bond centre", axes="O=O along X", units="um (exaggerated)", tintable=False),
    "h2o": dict(pivot="oxygen atom", axes="bent 104.5 degrees in the XY plane, hydrogens towards -Y", units="um (exaggerated)", tintable=False),
    "pyruvate": dict(pivot="central carbonyl region (origin near C2)", axes="zig-zag in the XY plane: methyl at x -0.9, carbonyl O up, carboxylate at x +1.5", units="um (exaggerated)", tintable=False),
    "thylakoid-stack": dict(pivot="stack centre", axes="8 sacs of radius ~1 stacked along Y (1.5 tall), cut open at z = 0 (open towards +Z, painted section: membrane outline + pale lumen); stroma lamellae on the -Z side",
                            units="um", tintable=False, cutOpen="z=0, open towards +Z"),
    "mitochondrion-crista-detail": dict(pivot="mitochondrion centre", axes="the mitochondrion at 1.7x (long axis X, ~5.4 long) cut open at z = 0 (open towards +Z): cristae, junctions, matrix granules, mtDNA in section; part synthases = ATP-synthase lollipops on the cristae",
                                        units="um", tintable=False, cutOpen="z=0, open towards +Z"),
}
TEXTURE_SIZES = {"atp-synthase": 1024, "etc-complex-1": 1024, "etc-complex-2": 512, "etc-complex-3": 1024, "etc-complex-4": 1024,
                 "cytochrome-c": 512, "ubiquinone": 512, "photosystem-1": 1024, "photosystem-2": 1024, "rubisco": 1024, "atp": 512,
                 "glucose": 512, "co2": 256, "o2": 256, "h2o": 256, "pyruvate": 512, "thylakoid-stack": 2048, "mitochondrion-crista-detail": 2048}
BUILDERS = {"atp-synthase": atp_synthase, "etc-complex-1": etc_complex_1, "etc-complex-2": etc_complex_2, "etc-complex-3": etc_complex_3,
            "etc-complex-4": etc_complex_4, "cytochrome-c": cytochrome_c, "ubiquinone": ubiquinone, "photosystem-1": photosystem_1,
            "photosystem-2": photosystem_2, "rubisco": rubisco, "atp": atp, "glucose": glucose, "co2": co2, "o2": o2, "h2o": h2o,
            "pyruvate": pyruvate, "thylakoid-stack": thylakoid_stack, "mitochondrion-crista-detail": mitochondrion_crista_detail}
