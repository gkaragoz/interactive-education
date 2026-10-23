"""Batch 2a (v0.3 membrane-transport): bilayer patch and tile, channel / carrier / pump / receptor proteins.
Units: about micrometres, exaggerated (a protein is ~1.2-1.6 tall). Pivot/axes per asset in META."""
import numpy as np

import geo
import noise
import texmotifs
from paint import ramp
from shapes import res, part, blob, normalize, superellipsoid_r

NEUTRAL = [(0, "#d9d2de"), (0.5, "#ece7f0"), (1, "#f8f5fa")]


def neutral(asset, partname, **kw):
    """Register a neutral-light painter profile (the app tints these meshes)."""
    texmotifs.HINTS[(asset, partname)] = dict(texmotifs.NEUTRAL, w=kw.pop("w", 0.06), relief=kw.pop("relief", 0.004), **kw)


# ----------------------------------------------------------------------------------------------- bilayer
def _plate(n, hx, hy, hz, cy, power=8.0):
    """Closed rounded box with a UNIFORM lattice on its broad faces (a superellipsoid would crowd the vertices at the centre)."""
    p, f = geo.cube_sphere(n, cube=True)
    inf = np.abs(p).max(1)
    pn = (np.abs(p) ** power).sum(1) ** (1.0 / power)
    v = p * (inf / np.maximum(pn, 1e-9))[:, None] * np.array([hx, hy, hz])
    v[:, 1] += cy
    return v, f, p
def _bilayer(q, hx, hz, n_plate, spacing, hexagonal, head_r, seed=0):
    """Two leaflets of phospholipid heads (domes on thin flat plates) around a painted hydrophobic core, slight undulation."""
    th_h, th_c = 0.07, 0.27
    cy = th_c + th_h - 0.02
    parts_h = []
    for sgn in (1.0, -1.0):
        v, f, _ = _plate(res(n_plate, q, 6), hx, th_h, hz, sgn * cy)
        parts_h.append((v, f))
    vc, fc, _ = _plate(res(max(n_plate, 12), q, 6), hx * 0.99, th_c, hz * 0.99, 0.0)
    heads_pos = []
    if hexagonal:
        rows = int(2 * hz / (spacing * 0.8660254))
        for r in range(rows):
            z = -hz + spacing * 0.6 + r * spacing * 0.8660254
            off = (spacing / 2) if r % 2 else 0.0
            x = -hx + spacing * 0.6 + off
            while x < hx - spacing * 0.45:
                heads_pos.append((x, z))
                x += spacing
    else:
        k = int(round(2 * hx / spacing))
        for i in range(k):
            for j in range(k):
                heads_pos.append((-hx + (i + 0.5) * spacing, -hz + (j + 0.5) * spacing))
    rng = np.random.default_rng(seed)
    domes = []
    for sgn in (1.0, -1.0):
        for hi, (x, z) in enumerate(heads_pos):
            if q < 0.3 and hi % 2:
                continue
            jx, jz = (rng.normal(0, 0.02, 2) if hexagonal else (0.0, 0.0))
            domes.append(blob(res(5, q, 2), (head_r, 0.20, head_r), seed=int(abs(x * 31 + z * 17)) % 40, amp=0.05,
                              pos=(x + jx, sgn * (cy + th_h - 0.02 + 0.03), z + jz)))

    def wave(vv):                                       # slight undulation (periodic over the patch width)
        a = 2 * np.pi / (2 * hx)
        b = 2 * np.pi / (2 * hz)
        vv = vv.copy()
        vv[:, 1] += 0.045 * np.sin(a * vv[:, 0] + 0.6) + 0.04 * np.sin(b * vv[:, 2] + 2.0)
        return vv
    heads = geo.merge(*parts_h, *domes)
    heads = (wave(heads[0]), heads[1])
    core = (wave(vc), fc)
    t = 0.5 + 0.5 * noise.fbm(heads[0] * 1.2, 3, 1.0, 3)
    ph = part("heads", heads, ramp(t, NEUTRAL), ao=(0.7, 0.25, 14), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)
    pc = part("tails", core, ramp(0.5 + 0.5 * noise.fbm(core[0] * 2.0, 5, 1.0, 3), [(0, "#e0a23e"), (0.5, "#f1c35e"), (1, "#f9de96")]),
              ao=(0.6, 0.2, 10), tint=(0.6, 0.45, 0.3))
    return [ph, pc]


def bilayer_patch(q):
    return _bilayer(q, 3.0, 3.0, 24, 0.78, True, 0.36)


def bilayer_tile(q):
    return _bilayer(q, 1.0, 1.0, 16, 0.5, False, 0.215)


# ----------------------------------------------------------------------------------------------- proteins
def _helix(path_pts, r0, q, sides=9, wob=0.0, seed=0, cap=3):
    path = geo.catmull(path_pts, res(7, q, 2))
    s = np.linspace(0, 1, len(path))
    rad = r0 * (1 + 0.06 * np.sin(s * 40 + seed) + wob * np.sin(np.pi * s))
    return geo.tube(path, rad, res(sides, q, 4), cap=cap if q > 0.4 else 1)


def channel_protein(q):
    """Barrel of 8 transmembrane helices around a visible lumen (pore radius ~0.15), 1.2 tall, axis Y, origin = membrane centre."""
    helices, loops = [], []
    n = 8
    for i in range(n):
        a = 2 * np.pi * i / n
        r_mid, tw = 0.36, 0.30
        pts = [(r_mid * 1.1 * np.cos(a - tw * 0.5), -0.6, r_mid * 1.1 * np.sin(a - tw * 0.5)),
               (r_mid * 0.92 * np.cos(a), 0.0, r_mid * 0.92 * np.sin(a)),
               (r_mid * 1.12 * np.cos(a + tw * 0.5), 0.6, r_mid * 1.12 * np.sin(a + tw * 0.5))]
        helices.append(_helix(pts, 0.135, q, seed=i))
    for i in range(n):                                   # extracellular / cytoplasmic loops joining neighbours
        a = 2 * np.pi * (i + 0.5) / n
        for y in ((0.62, -0.62) if q > 0.5 else ((0.62,) if (i % 2 == 0 and q > 0.3) else ())):
            loops.append(blob(res(7, q, 3), (0.10, 0.07, 0.10), seed=i, amp=0.15, pos=(0.40 * np.cos(a), y, 0.40 * np.sin(a))))
    if not loops:
        loops = [blob(res(6, q, 3), (0.08, 0.06, 0.08), seed=1, amp=0.1, pos=(0.4, 0.62, 0.0))]
    h = geo.merge(*helices)
    lv = geo.merge(*loops)
    return [part("helices", h, ramp(0.5 + 0.5 * noise.fbm(h[0] * 2.5, 4, 1.0, 3), [(0, "#1f8f8a"), (0.5, "#35b9a9"), (1, "#86dcc4")]),
                 ao=(0.85, 0.3, 16), tint=(0.45, 0.5, 0.55)),
            part("loops", lv, ramp(0.5 + 0.5 * noise.fbm(lv[0] * 4, 5, 1.0, 2), [(0, "#e08a4a"), (1, "#f4b878")]), ao=(0.7, 0.2, 10),
                 tint=(0.55, 0.4, 0.3))]


def _carrier(q, open_up):
    """Six helices tilted into an hourglass: wide opening on one side, narrow on the other, plus two bridging domains. 1.2 tall."""
    helices = []
    n = 6
    r_open, r_shut = 0.30, 0.07
    for i in range(n):
        a = 2 * np.pi * i / n
        ro, rs = (r_open, r_shut) if open_up else (r_shut, r_open)
        bend = 0.04 * np.sin(a * 2)
        pts = [((rs + 0.21) * np.cos(a), -0.6, (rs + 0.21) * np.sin(a)),
               ((0.21 + bend) * np.cos(a), 0.0, (0.21 + bend) * np.sin(a)),
               ((ro + 0.21) * np.cos(a), 0.6, (ro + 0.21) * np.sin(a))]
        helices.append(_helix(pts, 0.14, q, seed=i, wob=0.1))
    h = geo.merge(*helices)
    y_dom = 0.28 if open_up else -0.28
    doms = [blob(res(14, q, 5), (0.20, 0.30, 0.24), seed=3, amp=0.12, pos=(0.30, y_dom, 0.0)),
            blob(res(14, q, 5), (0.20, 0.30, 0.24), seed=4, amp=0.12, pos=(-0.30, y_dom, 0.0))]
    dv = geo.merge(*doms)
    return [part("helices", h, ramp(0.5 + 0.5 * noise.fbm(h[0] * 2.5, 6, 1.0, 3), [(0, "#6a46b0"), (0.5, "#8a66cc"), (1, "#b898e6")]),
                 ao=(0.85, 0.3, 16), tint=(0.5, 0.4, 0.62)),
            part("domains", dv, ramp(0.5 + 0.5 * noise.fbm(dv[0] * 3, 7, 1.0, 2), [(0, "#e0602e"), (0.5, "#f08a4a"), (1, "#f8b278")]),
                 ao=(0.75, 0.25, 12), tint=(0.55, 0.38, 0.3))]


def carrier_protein(q):
    return _carrier(q, True)


def carrier_protein_b(q):
    return _carrier(q, False)


def pump_protein(q):
    """Na+/K+-ATPase-like: 10 transmembrane helices (y -0.5..0.5), three big cytoplasmic lobes below, ATP site in the cleft."""
    helices = []
    for i in range(10):
        a = 2 * np.pi * i / 10
        r = 0.34 + 0.02 * np.sin(i * 2.1)
        pts = [(r * np.cos(a), -0.50, r * np.sin(a)), (r * 0.95 * np.cos(a + 0.12), 0.0, r * 0.95 * np.sin(a + 0.12)),
               (r * np.cos(a + 0.2), 0.52, r * np.sin(a + 0.2))]
        helices.append(_helix(pts, 0.115, q, seed=i))
    ecto = [blob(res(9, q, 4), (0.12, 0.08, 0.12), seed=i, amp=0.2, pos=(0.34 * np.cos(2 * np.pi * i / 5), 0.54, 0.34 * np.sin(2 * np.pi * i / 5)))
            for i in range(5)]
    h = geo.merge(*helices, *ecto)
    lobes = [blob(res(16, q, 5), (0.42, 0.30, 0.34), seed=1, amp=0.1, pos=(0.30, -0.78, 0.18)),
             blob(res(14, q, 5), (0.34, 0.28, 0.30), seed=2, amp=0.1, pos=(-0.34, -0.74, 0.14)),
             blob(res(14, q, 5), (0.28, 0.24, 0.32), seed=3, amp=0.1, pos=(0.0, -0.95, -0.28)),
             blob(res(10, q, 4), (0.45, 0.14, 0.40), seed=4, amp=0.08, pos=(0.0, -0.58, 0.0))]
    lv = geo.merge(*lobes)
    atp = [blob(res(7, q, 3), (0.055,) * 3, seed=i, amp=0.05, pos=(0.30 + 0.07 * i, -0.62, 0.50 + 0.03 * i)) for i in range(3)]
    av = geo.merge(*atp)
    return [part("transmembrane", h, ramp(0.5 + 0.5 * noise.fbm(h[0] * 2.5, 8, 1.0, 3), [(0, "#3a58b8"), (0.5, "#5a7ed8"), (1, "#98b4f0")]),
                 ao=(0.85, 0.3, 16), tint=(0.45, 0.45, 0.65)),
            part("lobes", lv, ramp(0.5 + 0.5 * noise.fbm(lv[0] * 2, 9, 1.0, 3), [(0, "#b0407a"), (0.5, "#d0609a"), (1, "#eea0c0")]),
                 ao=(0.8, 0.3, 14), tint=(0.5, 0.35, 0.5)),
            part("atp-site", av, ramp(0.5 + 0.5 * noise.fbm(av[0] * 6, 10, 1.0, 2), [(0, "#f0a020"), (1, "#f8d060")]), ao=(0.5, 0.15, 8),
                 tint=(0.7, 0.55, 0.3))]


def receptor_protein(q):
    """Y-shaped receptor: transmembrane stalk (y -0.75..0.18), two arms forming a binding pocket at (0, 0.6, 0), ~1.3 tall."""
    stalk = _helix([(0.0, -0.75, 0.0), (0.02, -0.3, 0.0), (0.0, 0.18, 0.0)], 0.13, q, sides=11)
    arms = []
    for k, s in enumerate((1.0, -1.0)):
        pts = [(0.0, 0.1, 0.0), (0.14 * s, 0.36, 0.0), (0.30 * s, 0.62, 0.0), (0.34 * s, 0.86, 0.0)]
        arms.append(_helix(pts, 0.105, q, sides=10, wob=0.15, seed=k))
    tips = [blob(res(9, q, 4), (0.12, 0.10, 0.12), seed=i, amp=0.15, pos=(0.34 * s, 0.9, 0.0)) for i, s in enumerate((1.0, -1.0))] if q > 0.25 else []
    tail = [blob(res(10, q, 4), (0.20, 0.14, 0.20), seed=5, amp=0.15, pos=(0.0, -0.8, 0.0))] if q > 0.1 else []
    body = geo.merge(stalk, *arms, *tips, *tail)
    pocket = blob(res(9, q, 4), (0.075,) * 3, seed=3, amp=0.1, pos=(0.0, 0.60, 0.0))
    t = 0.5 + 0.5 * noise.fbm(body[0] * 2.5, 11, 1.0, 3)
    return [part("body", body, ramp(t, [(0, "#2a8ac0"), (0.5, "#4aa8dc"), (1, "#92d0f0")]), ao=(0.85, 0.3, 16), tint=(0.45, 0.5, 0.65)),
            part("pocket", pocket, ramp(0.5 + 0.5 * noise.fbm(pocket[0] * 6, 12, 1.0, 2), [(0, "#f0b030"), (1, "#f8dc70")]), ao=(0.4, 0.1, 6),
                 tint=(0.7, 0.6, 0.3))]


for _n in ("bilayer-patch", "bilayer-tile"):
    _fold = {"fold": (2.0, 2.0)} if _n == "bilayer-tile" else {}
    neutral(_n, "heads", w=0.12, relief=0.006, **_fold)
    texmotifs.HINTS[(_n, "tails")] = dict(w=0.1, relief=0.003, **_fold)
for _a, _p in (("channel-protein", "helices"), ("channel-protein", "loops"), ("carrier-protein", "helices"), ("carrier-protein", "domains"),
               ("carrier-protein-b", "helices"), ("carrier-protein-b", "domains"), ("pump-protein", "transmembrane"),
               ("pump-protein", "lobes"), ("pump-protein", "atp-site"), ("receptor-protein", "body"), ("receptor-protein", "pocket")):
    texmotifs.HINTS[(_a, _p)] = dict(w=0.07, relief=0.004, along=True, axis=(0, 1, 0), contour=0.7)

META = {
    "bilayer-patch": dict(pivot="patch centre", axes="flat 6 x 6 patch in XZ, normal +Y; parts heads (head groups of both leaflets) and tails (hydrophobic core, visible at the cut edge)",
                          units="~6 across", tintable=True, tintParts=["heads"], neutralAlbedo=True),
    "bilayer-tile": dict(pivot="tile centre", axes="2 x 2 tile in XZ, normal +Y, tiles seamlessly in X and Z (flush edges, periodic dome lattice, painting folded with period 2)",
                         units="2 across", tintable=True, tintParts=["heads"], neutralAlbedo=True),
    "channel-protein": dict(pivot="membrane centre on the pore axis", axes="pore axis Y, 1.2 tall, lumen radius ~0.15", units="um", tintable=False),
    "carrier-protein": dict(pivot="membrane centre on the transport axis", axes="axis Y, open towards +Y (outside), closed at -Y; 1.2 tall; cross-fade with carrier-protein-b",
                            units="um", tintable=False),
    "carrier-protein-b": dict(pivot="membrane centre on the transport axis", axes="axis Y, same footprint as carrier-protein but open towards -Y (inside), closed at +Y",
                              units="um", tintable=False),
    "pump-protein": dict(pivot="membrane centre", axes="axis Y: extracellular face +Y (up to +0.55), cytoplasmic lobes towards -Y (down to -1.05), ATP site is part atp-site; ~1.6 tall",
                         units="um", tintable=False),
    "receptor-protein": dict(pivot="membrane centre under the Y fork", axes="stalk along Y through the membrane, arms fork towards +Y; binding pocket marker at (0,0.6,0); ~1.3 tall",
                             units="um", tintable=False),
}
TEXTURE_SIZES = {"bilayer-patch": 2048, "bilayer-tile": 1024, "channel-protein": 1024, "carrier-protein": 1024, "carrier-protein-b": 1024,
                 "pump-protein": 1024, "receptor-protein": 1024}
BUILDERS = {"bilayer-patch": bilayer_patch, "bilayer-tile": bilayer_tile, "channel-protein": channel_protein,
            "carrier-protein": carrier_protein, "carrier-protein-b": carrier_protein_b, "pump-protein": pump_protein,
            "receptor-protein": receptor_protein}
