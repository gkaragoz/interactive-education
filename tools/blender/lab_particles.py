"""Lab batch B2: particle-level explainer props (atoms, ions, bonds, small molecules, electron, bubble, precipitate crystal). 1 unit = 1 particle-lens unit (atom-ball radius 1)."""
import numpy as np

import geo
import lab_common as lc
from lab_common import Prof, lathe, clay, cyl, rbox, sph, rot, solid
from shapes import res, part
from texnoise import sstep

META = {}
TEXTURE_SIZES = {}
NEUT = "#ece9df"
COL = {"carbon": "#4a4f55", "oxygen": "#d9483b", "hydrogen": "#f2f0ea"}


def at(surf, pos=(0, 0, 0), r=None):
    return geo.xf(surf, 1.0, r, pos)


def _ball(r, q, n0=18, lo=4, pos=(0, 0, 0)):
    return sph(r, res(n0, q, lo), pos)


def _stick(a, b, r, q, k=6, sides=10):
    a, b = np.asarray(a, float), np.asarray(b, float)
    path = a + (b - a) * np.linspace(0, 1, res(k, q, 2))[:, None]
    return geo.tube(path, r, res(sides, q, 5), cap=2)


def atom_ball(q):
    lc.neutral_hint("atom-ball", "atom", w=0.18, relief=0.006, dab=0.04)
    return [clay("atom", _ball(1.0, q, 26, 4), NEUT, tint=(0.62, 0.6, 0.66), speck=0.02, form=0.2, ao=(0.5, 0.3, 8))]


META["atom-ball"] = dict(pivot="sphere centre", axes="unit sphere (radius 1): scale it per element; neutral light albedo, tint per atom; instancing friendly (one mesh, LOD0/1/2)", units="1 = radius", tintable=True, tintParts=["atom"], neutralAlbedo=True)
TEXTURE_SIZES["atom-ball"] = 512


def bond_stick(q):
    s = cyl(0.12, 1.0, res(40, q, 6), rings=res(70, q, 3), bevel=0.05, y0=-0.5)
    lc.neutral_hint("bond-stick", "stick", w=0.1, relief=0.004, dab=0.04)
    return [clay("stick", s, NEUT, tint=(0.62, 0.6, 0.66), speck=0.02, ao=(0.5, 0.1, 6))]


META["bond-stick"] = dict(pivot="centre of the stick", axes="Y along the stick: length 1, radius 0.12 (scale Y to the bond length, X/Z to the thickness); neutral light albedo, tint per bond", units="1 = stick length",
                          tintable=True, tintParts=["stick"], neutralAlbedo=True)
TEXTURE_SIZES["bond-stick"] = 256


def _ion(asset, plus, q):
    ball = _ball(1.0, q, 18, 4)
    bars = []
    for sz in (1, -1):
        zc = sz * 0.99
        bars.append(rbox(0.7, 0.16, 0.16, res(8, q, 3), (0, 0, zc), power=5))
        if plus:
            bars.append(rbox(0.16, 0.7, 0.16, res(8, q, 3), (0, 0, zc), power=5))
    lc.neutral_hint(asset, "body", w=0.18, relief=0.006, dab=0.04)
    return [clay("body", ball, NEUT, tint=(0.62, 0.6, 0.66), speck=0.02, ao=(0.5, 0.3, 8)), clay("sign", geo.merge(*bars), "#25292e", ao=(0.3, 0.1, 6), speck=0.0, tint=(0.5, 0.5, 0.6))]


def ion_plus(q):
    return _ion("ion-ball-plus", True, q)


def ion_minus(q):
    return _ion("ion-ball-minus", False, q)


for _id, _s in (("ion-ball-plus", "+"), ("ion-ball-minus", "-")):
    META[_id] = dict(pivot="sphere centre", axes=f"unit sphere (radius 1) with a raised '{_s}' mark on both +Z and -Z poles; neutral `body` is tinted per ion, `sign` is dark ink", units="1 = radius", tintable=True, tintParts=["body"], neutralAlbedo=True)
    TEXTURE_SIZES[_id] = 512


def _molecule(asset, atoms, bonds, q, r_bond=0.1):
    """atoms: (kind, pos, radius); bonds: (i, j, order). Parts by element + `bonds`."""
    by = {}
    for kind, pos, r in atoms:
        by.setdefault(kind, []).append(_ball(r, q, 16, 4, pos))
    bs = []
    for i, j, order in bonds:
        a, b = np.array(atoms[i][1], float), np.array(atoms[j][1], float)
        d = b - a
        d = d / np.linalg.norm(d)
        side = np.cross(d, (0, 0, 1.0))
        if np.linalg.norm(side) < 1e-6:
            side = np.cross(d, (0, 1.0, 0))
        side = side / np.linalg.norm(side)
        offs = {1: [0.0], 2: [-0.16, 0.16], 3: [-0.22, 0.0, 0.22]}[order]
        rb = r_bond if order == 1 else r_bond * 0.7
        for o in offs:
            bs.append(_stick(a + side * o, b + side * o, rb, q))
    out = [clay(k, geo.merge(*v), COL[k], tint=(0.6, 0.5, 0.6)) for k, v in by.items()]
    out.append(clay("bonds", geo.merge(*bs), "#aeb4ba", tint=(0.55, 0.55, 0.65), ao=(0.5, 0.1, 6)))
    return out


def water_molecule(q):
    ang = np.radians(104.5 / 2)
    L = 1.5
    atoms = [("oxygen", (0, 0, 0), 0.62), ("hydrogen", (L * np.sin(ang), -L * np.cos(ang), 0), 0.4), ("hydrogen", (-L * np.sin(ang), -L * np.cos(ang), 0), 0.4)]
    return _molecule("water-molecule", atoms, [(0, 1, 1), (0, 2, 1)], q)


def co2_molecule(q):
    atoms = [("carbon", (0, 0, 0), 0.55), ("oxygen", (1.9, 0, 0), 0.62), ("oxygen", (-1.9, 0, 0), 0.62)]
    return _molecule("co2-molecule", atoms, [(0, 1, 2), (0, 2, 2)], q)


def h2_molecule(q):
    atoms = [("hydrogen", (0.55, 0, 0), 0.42), ("hydrogen", (-0.55, 0, 0), 0.42)]
    return _molecule("h2-molecule", atoms, [(0, 1, 1)], q, r_bond=0.12)


def o2_molecule(q):
    atoms = [("oxygen", (0.75, 0, 0), 0.62), ("oxygen", (-0.75, 0, 0), 0.62)]
    return _molecule("o2-molecule", atoms, [(0, 1, 2)], q)


for _id, _ax in (("water-molecule", "bent molecule in the XY plane, H-O-H 104.5 degrees, O-H 1.5, oxygen at the origin; parts oxygen, hydrogen, bonds"),
                 ("co2-molecule", "linear O=C=O along X (C-O 1.9), carbon at the origin; double bonds drawn as two sticks; parts carbon, oxygen, bonds"),
                 ("h2-molecule", "H-H along X (distance 1.1), centre at the origin; parts hydrogen, bonds"),
                 ("o2-molecule", "O=O along X (distance 1.5), centre at the origin; parts oxygen, bonds")):
    META[_id] = dict(pivot="molecule centre (centre of mass side: oxygen / carbon / mid-bond)", axes=_ax + "; ball-and-stick, element colours painted (not tinted), 1 unit = 1 particle-lens unit", units="1 = particle-lens unit",
                     tintable=False)
    TEXTURE_SIZES[_id] = 512


def electron_dot(q):
    lc.neutral_hint("electron-dot", "dot", w=0.12, relief=0.004, dab=0.03)
    return [clay("dot", _ball(1.0, q, 24, 4), "#f4d35e", tint=(0.8, 0.6, 0.35), speck=0.0, form=0.1, ao=(0.3, 0.2, 6))]


META["electron-dot"] = dict(pivot="sphere centre", axes="unit sphere (radius 1) painted warm yellow: scale it (radius ~0.12 in the particle lens), may be tinted", units="1 = radius", tintable=True, tintParts=["dot"])
TEXTURE_SIZES["electron-dot"] = 256


def bubble(q):
    d, f = geo.cube_sphere(res(24, q, 4))
    surf = (d, f)
    n = len(d)
    p = part("shell", surf, solid("#dff1f7", n), mat="gel", alpha=0.14, occ=False, ao=None, speck=0.0, form=0.05, tint=(0.9, 0.95, 1.0))

    def fn(S, r, hint, gel):
        N = lc.bc(S["N"])
        hl = np.array([-0.45, 0.6, 0.66], np.float32)
        hl = hl / np.linalg.norm(hl)
        dd = np.arccos(np.clip((N * hl).sum(1), -1, 1))
        spot = sstep(0.32, 0.12, dd)
        h2 = np.array([0.5, -0.55, 0.67], np.float32)
        h2 = h2 / np.linalg.norm(h2)
        spot2 = sstep(0.22, 0.08, np.arccos(np.clip((N * h2).sum(1), -1, 1))) * 0.5
        irid = 0.5 + 0.5 * np.sin(N[:, 1] * 9.0 + N[:, 0] * 5.0)
        col = np.stack([0.80 + 0.12 * irid, np.full_like(irid, 0.92), 0.97 - 0.08 * irid], 1) * (1 - np.maximum(spot, spot2))[:, None] + np.maximum(spot, spot2)[:, None]
        r["col"] = col
        r["alpha"] = np.clip(0.12 + 0.08 * irid + 0.8 * np.maximum(spot, spot2), 0, 1)
        r["rough"] = np.full_like(r["rough"], 0.05)
        r["h"] = r["h"] * 0.0
        return True
    lc.register("bubble", "shell", fn)
    return [p]


META["bubble"] = dict(pivot="sphere centre", axes="unit sphere (radius 1), translucent gel soap-bubble look with two painted highlights; one mesh `shell`", units="1 = radius", tintable=False)
TEXTURE_SIZES["bubble"] = 256


def precipitate_crystal(q):
    p, f = geo.cube_sphere(res(26, q, 4))
    k = 1.15
    nrm = (np.abs(p) ** k).sum(1) ** (1.0 / k)
    v = p / np.maximum(nrm, 1e-9)[:, None] * 1.0
    v = v * np.array([0.62, 1.0, 0.62])
    rng = np.random.default_rng(5)
    v[:, 1] = np.clip(v[:, 1], -0.8, 0.8) * 1.0
    ph = np.arctan2(v[:, 2], v[:, 0])
    v = v * (1 + 0.04 * np.cos(3 * ph + 0.5))[:, None]
    lc.neutral_hint("precipitate-crystal", "crystal", w=0.2, relief=0.004, dab=0.05)

    def fn(S, r, hint, gel):
        N = lc.bc(S["N"])
        facet = 0.5 + 0.5 * np.cos(np.round(np.arctan2(N[:, 2], N[:, 0]) / (np.pi / 3)) * 0 + N[:, 1] * 6.0)
        r["col"] = r["col"] * (0.9 + 0.15 * facet)[:, None]
        r["rough"] = r["rough"] * 0.6
        return False
    lc.register("precipitate-crystal", "crystal", fn)
    return [clay("crystal", (v, f), NEUT, tint=(0.62, 0.6, 0.66), speck=0.02, form=0.2, ao=(0.5, 0.3, 8))]


META["precipitate-crystal"] = dict(pivot="crystal centre", axes="small faceted bipyramid, ~1.2 x 1.6 x 1.2 (Y long axis); neutral light albedo: tint it per precipitate; scale ~0.1-0.3 for flakes/crystals", units="1 = crystal half-size",
                                   tintable=True, tintParts=["crystal"], neutralAlbedo=True)
TEXTURE_SIZES["precipitate-crystal"] = 256


BUILDERS = {"atom-ball": atom_ball, "bond-stick": bond_stick, "ion-ball-plus": ion_plus, "ion-ball-minus": ion_minus, "water-molecule": water_molecule,
            "co2-molecule": co2_molecule, "h2-molecule": h2_molecule, "o2-molecule": o2_molecule, "electron-dot": electron_dot, "bubble": bubble,
            "precipitate-crystal": precipitate_crystal}

lc.LAB.update(BUILDERS)
