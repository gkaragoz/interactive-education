"""Lab batch B1: solids and small apparatus (nail, Mg ribbon, copper strip, candle, balloon, electrode, Hofmann voltameter, splint, lighter, flame mount).
World unit = 1 cm, Y up, front +Z."""
import numpy as np

import geo
import lab_common as lc
from lab_common import Prof, lathe, wall_loop, liquid_mesh, glass_part, clay, cyl, rbox, sph, rot, solid
from shapes import res, part, blob
from texnoise import sstep, vnoise, fbm
from extrude import extrude_polygon

META = {}
TEXTURE_SIZES = {}
STEEL, DSTEEL, BLACK, WOOD, BRASS = "#97a3b0", "#6a737d", "#2f3338", "#b98a52", "#c9a24b"
NEUTRAL_L = "#ece9df"


def at(surf, pos=(0, 0, 0), r=None):
    return geo.xf(surf, 1.0, r, pos)


# ------------------------------------------------------------------------------------------------ metals
def iron_nail(q):
    s = lambda k, lo=1: res(k, q, lo)
    pr = Prof(0, 0)
    pr.line(0.07, 0.12, 1).line(0.16, 1.2, s(4, 2)).line(0.16, 5.8, s(90, 4)).line(0.2, 5.9, 1).line(0.42, 5.95, s(2, 1)).line(0.42, 6.2, 1).line(0.3, 6.28, 1).line(0, 6.28, s(3, 1))
    body = lathe(pr, s(40, 8))[0]

    def fn(S, r, hint, gel):
        P = lc.bc(S["P"])
        rust = sstep(0.1, 0.8, 0.5 + 0.5 * fbm(P * np.float32(2.5), 7, 3)) * sstep(0.0, 4.0, P[:, 1]) * 0.55
        rust = rust * (0.6 + 0.4 * vnoise(P * np.float32(9.0), 11))
        r["col"] = r["col"] * (1 - rust)[:, None] + np.array([0.55, 0.28, 0.12], np.float32) * rust[:, None] * 0.9
        r["rough"] = r["rough"] + 0.25 * rust
        return False
    lc.register("iron-nail", "nail", fn)
    return [clay("nail", body, "#8b929a", tint=(0.55, 0.5, 0.6))]


META["iron-nail"] = dict(pivot="the nail tip on y = 0 (tip down into the solution)", axes="Y up, length 63 mm, shaft 3.2 mm, head 8.4 mm", units="1 = 1 cm", tintable=False)
TEXTURE_SIZES["iron-nail"] = 512


def magnesium_ribbon_coil(q):
    turns, rc = 3.2, 0.95
    n = res(300, q, 24)
    t = np.linspace(0, 1, n)
    a = 2 * np.pi * turns * t
    path = np.stack([rc * np.cos(a), 0.2 + 0.42 * a / (2 * np.pi) * 1.0 + 0.0 * t, rc * np.sin(a)], 1)
    ribbon = geo.tube(path, 0.032, res(8, q, 4), cap=2, aspect=np.full(n, 6.0), up=(0, 1, 0))

    def fn(S, r, hint, gel):
        P = lc.bc(S["P"])
        ox = sstep(0.2, 0.9, 0.5 + 0.5 * fbm(P * np.float32(6.0), 3, 3))
        r["col"] = r["col"] * (1 - 0.25 * ox)[:, None]
        return False
    lc.register("magnesium-ribbon-coil", "ribbon", fn)
    return [clay("ribbon", ribbon, "#cfd3d8", tint=(0.6, 0.6, 0.72), speck=0.03)]


META["magnesium-ribbon-coil"] = dict(pivot="bottom of the coil axis", axes="Y up: coiled ribbon, coil radius 0.95, 3.2 turns over ~1.5 cm, ribbon width ~2 mm (stylised, thicker than real)", units="1 = 1 cm", tintable=False)
TEXTURE_SIZES["magnesium-ribbon-coil"] = 512


def copper_strip(q):
    b = rbox(1.2, 7.0, 0.1, res(24, q, 3), (0, 3.5, 0), power=9)

    def fn(S, r, hint, gel):
        P = lc.bc(S["P"])
        ox = sstep(0.3, 0.9, 0.5 + 0.5 * fbm(P * np.float32(2.2), 5, 3))
        r["col"] = r["col"] * (1 - 0.18 * ox)[:, None] + np.array([0.0, 0.05, 0.04], np.float32) * ox[:, None]
        return False
    lc.register("copper-strip", "strip", fn)
    return [clay("strip", b, "#c8733c", tint=(0.6, 0.4, 0.45), speck=0.03)]


META["copper-strip"] = dict(pivot="centre of the bottom edge", axes="Y along the strip: 12 x 70 x 1 mm", units="1 = 1 cm", tintable=False)
TEXTURE_SIZES["copper-strip"] = 512


# ------------------------------------------------------------------------------------------------ candle, balloon
def candle(q):
    s = lambda k, lo=1: res(k, q, lo)
    pr = Prof(0, 0)
    pr.line(1.1, 0, s(3)).arc(1.1, 0.25, 0.25, -90, 0, s(3, 2)).line(1.1, 8.4, s(26, 3)).poly([(1.0, 8.9), (0.82, 9.0), (0.55, 8.85)]).line(0, 8.75, s(3, 1))
    wax = lathe(pr, s(60, 8))[0]
    V = wax[0]
    ph = np.arctan2(-V[:, 2], V[:, 0])
    V[:, 0] *= 1 + 0.02 * np.cos(3 * ph + V[:, 1] * 0.3) * (V[:, 1] > 6)
    V[:, 2] *= 1 + 0.02 * np.cos(3 * ph + V[:, 1] * 0.3) * (V[:, 1] > 6)
    wick = geo.tube(geo.catmull([(0, 8.6, 0), (0.02, 9.3, 0), (0.07, 10.0, 0.02), (0.12, 10.3, 0.02)], s(6, 2)), 0.07, s(8, 4), cap=2)
    return [clay("wax", wax, "#f4ecd8", tint=(0.8, 0.65, 0.55), speck=0.02), clay("wick", wick, "#3a342f", tint=(0.5, 0.5, 0.55), ao=None, speck=0.0)]


META["candle"] = dict(pivot="centre of the base on y = 0", axes="Y up, candle diameter 22 mm, height 90 mm + wick to y = 10.3", units="1 = 1 cm", tintable=False, flameMount=[0.12, 10.3, 0.02])
TEXTURE_SIZES["candle"] = 512


def balloon(q):
    s = lambda k, lo=1: res(k, q, lo)
    pr = Prof(0, 0)
    pr.line(1.5, 0, s(2, 1)).arc(1.5, 0.12, 0.12, -90, 0, 2)
    pr.line(1.62, 1.6, s(3, 1)).poly([(1.8, 2.1), (2.25, 2.55), (2.71, 3.15)])
    cy, ra, rb = 7.4, 4.4, 5.4
    for k in range(1, s(30, 5) + 1):
        ang = np.radians(-52 + 142 * k / s(30, 5))
        pr.p.append((ra * np.cos(ang), cy + rb * np.sin(ang)))
        pr.e.append(0.0)
    pr.p[-1] = (0.0, pr.p[-1][1])
    body = lathe(pr, s(60, 10))[0]
    lc.neutral_hint("balloon", "rubber", w=0.7, relief=0.01, dab=0.04)
    return [clay("rubber", body, NEUTRAL_L, tint=(0.62, 0.6, 0.66), speck=0.02, form=0.25)]


META["balloon"] = dict(pivot="centre of the bottom of the neck on y = 0", axes="Y up: round balloon with a 34 mm neck (fits over the erlenmeyer-250ml neck: neck radius 1.7 >= 1.55), bulb about 88 x 108 mm centred at y = 7.4; scale the bulb to show inflation; neutral light albedo: tint it",
                       units="1 = 1 cm", tintable=True, tintParts=["rubber"], neutralAlbedo=True)
TEXTURE_SIZES["balloon"] = 512


# ------------------------------------------------------------------------------------------------ electrode
def electrode(q):
    s = lambda k, lo=1: res(k, q, lo)
    rod = at(cyl(0.3, 10.0, s(40, 8), rings=s(44, 2), bevel=0.08), (0, 0, 0))
    cap = at(cyl(0.5, 1.2, s(24, 8), bevel=0.15), (0, 9.4, 0))
    wire = geo.tube(geo.catmull([(0, 10.6, 0), (0, 12.2, 0), (0.8, 13.4, 0), (2.2, 13.0, 0), (3.0, 11.6, 0)], s(10, 3)), 0.12, s(8, 4), cap=2)
    return [clay("rod", rod, "#4a4f55", tint=(0.5, 0.5, 0.6)), clay("cap", cap, BRASS, tint=(0.6, 0.45, 0.35)), clay("wire", wire, "#d9483b", tint=(0.6, 0.4, 0.45), ao=None)]


META["electrode"] = dict(pivot="the electrode tip on y = 0", axes="Y up: graphite rod 6 mm x 100 mm with a brass terminal cap at y ~ 10 and a lead wire (red; tint-free) ending at (3, 11.6); use two, swap the wire colour in the app", units="1 = 1 cm",
                         tintable=False)
TEXTURE_SIZES["electrode"] = 512


# ------------------------------------------------------------------------------------------------ Hofmann voltameter
def _closed_tube(q, R, y0, y1, n, wall=0.15, dome=True, rim_top=False, flare=None):
    s = lambda k, lo=1: res(k, q, lo)
    o = Prof(0, y0, e=0.7)
    o.arc(0, y0 + R, R, -90, 0, s(5, 2), e=0.4).cut()
    o.line(R, y1, s(8, 2), e=0.0).cut()
    if rim_top:
        o.line(R, y1, 1) if False else None
        o.poly([(R + 0.1, y1 + 0.6), (flare, y1 + 2.0)] if flare else [(R + 0.08, y1 + 0.2)], e=0.5)
        pr, inn, pts = wall_loop(o, wall, lip_n=s(3, 2))
    else:
        o.arc(0, y1, R, 0, 90, s(5, 2), e=0.4)
        pr, inn, pts = wall_loop(o, wall, lip_n=0)
    surf, _, e = lathe(pr, n)
    return surf, e, inn


def hofmann_voltameter(q):
    s = lambda k, lo=1: res(k, q, lo)
    n = s(36, 10)
    gl, ge, inners = [], [], []
    liq = []
    for x in (-5.0, 5.0):
        surf, e, inn = _closed_tube(q, 1.15, 4.2, 40.2, n)
        gl.append(at(surf, (x, 0, 0)))
        ge.append(e)
        ls, _, le = liquid_mesh(inn, 40.0, s(28, 8), t_extra=0.04)
        liq.append((at(ls, (x, 0, 0)), le))
    surf, e, inn = _closed_tube(q, 1.0, 4.2, 44.0, n, rim_top=True, flare=2.3)
    gl.append(at(surf, (0, 0, 0)))
    ge.append(e)
    ls, _, le = liquid_mesh(inn, 45.0, s(28, 8), t_extra=0.04)
    liq.append((at(ls, (0, 0, 0)), le))
    # manifold: closed capsule along X below the tubes, three short connecting stubs
    mp = Prof(0, -5.8, e=0.5)
    mp.arc(0, -5.8 + 0.6, 0.6, -90, 0, s(4, 2)).line(0.6, 5.2, s(10, 3)).arc(0, 5.2, 0.6, 0, 90, s(4, 2))
    mpr, minn, mpts = wall_loop(mp, 0.12, lip_n=0)
    msurf, _, me = lathe(mpr, s(24, 8))
    gl.append(geo.xf(msurf, 1.0, rot((0, 0, 1), -90), (0, 2.2, 0)))
    ge.append(me)
    for x in (-5.0, 0.0, 5.0):
        st = cyl(0.5, 2.6, s(16, 6), y0=2.2)
        gl.append(at(st, (x, 0, 0)))
        ge.append(np.zeros(len(st[0])))
    glass = geo.merge(*gl)
    tk = []
    for k in range(20):
        tk.append((39.0 - 0.8 * k, k % 5 == 0))
    spec = dict(streak=-2.7, tickphi=-1.57, tl=0.55, ticks=tk, tw=0.03, centres=[(-5.0, 0.0), (0.0, 0.0), (5.0, 0.0)], tick_centres=[0, 2], tickcol=(0.08, 0.22, 0.5))
    parts = [glass_part("hofmann-voltameter", "glass", glass, np.concatenate(ge), spec, hollow=True)]
    for nm, (ls, le) in zip(("inner-left", "inner-right", "inner-centre"), (liq[0], liq[1], liq[2])):
        parts.append(glass_part("hofmann-voltameter", nm, ls, le, None, liquid=True))
    # stand
    base = rbox(28, 2.0, 11, s(22, 3), (3, 1.0, 0), power=6)
    post = at(cyl(0.8, 44, s(24, 8), bevel=0.2), (0, 2.0, -4.2))
    bar = rbox(14.5, 1.2, 1.2, s(10, 3), (0, 26.0, -2.4))
    rings = [at(lc_ring(1.18, 1.75, 25.5, 1.0, s(28, 8)), (x, 0, 0)) for x in (-5.0, 5.0)]
    stand = geo.merge(base, post, bar, *rings)
    taps = []
    for x in (-5.0, 5.0):
        taps.append(at(cyl(0.5, 1.4, s(14, 6), bevel=0.1), (x, 41.4, 0)))
        taps.append(at(cyl(0.55, 2.4, s(16, 6), bevel=0.12, y0=-1.2), (x, 43.0, 0), rot((0, 0, 1), 90)))
        taps.append(at(cyl(0.18, 2.4, s(10, 5), bevel=0.05), (x, 43.0, 0.6), rot((1, 0, 0), 90)))
        taps.append(sph(0.4, s(8, 3), (x, 43.0, 3.1)))
    el = []
    for x in (-5.0, 5.0):
        el.append(geo.tube(np.stack([np.full(s(6, 2), x), np.linspace(5.4, 10.0, s(6, 2)), np.zeros(s(6, 2))], 1), 0.1, s(8, 4), cap=2))
        el.append(sph(0.28, s(8, 3), (x, 5.35, 0), (1, 0.5, 1)))
    wneg = geo.tube(geo.catmull([(-5, 3.0, 0), (-5, 1.1, 0.7), (-3.0, 0.6, 3.2), (3.0, 0.6, 4.2), (11.8, 0.9, 3.2), (12.9, 2.6, 3.0)], s(16, 4)), 0.13, s(8, 4), cap=2)
    wpos = geo.tube(geo.catmull([(5, 3.0, 0), (5, 1.1, 0.8), (7.0, 0.6, 3.6), (12.0, 0.8, 4.4), (15.0, 1.2, 4.2), (16.1, 2.6, 3.0)], s(16, 4)), 0.13, s(8, 4), cap=2)
    batt = rbox(7.5, 3.0, 9.0, s(14, 3), (14.4, 1.5, 0.2), power=5)
    term = [at(cyl(0.38, 0.7, s(12, 5), bevel=0.08), (13.0, 3.0, 3.0)), at(cyl(0.38, 0.7, s(12, 5), bevel=0.08), (16.1, 3.0, 3.0))]
    lc.neutral_hint("hofmann-voltameter", "stand", w=0.5, relief=0.01)
    parts += [clay("stand", stand, "#2f3338", tint=(0.5, 0.5, 0.62)), clay("taps", geo.merge(*taps), "#3d7fd0", tint=(0.5, 0.5, 0.75)),
              clay("electrodes", geo.merge(*el), "#9aa3ac", tint=(0.55, 0.55, 0.7)), clay("wire-neg", wneg, "#25292e", tint=(0.5, 0.5, 0.6), ao=None),
              clay("wire-pos", wpos, "#d9483b", tint=(0.6, 0.4, 0.45), ao=None), clay("battery", geo.merge(batt, *term), "#2e4a7d", tint=(0.5, 0.5, 0.7))]
    if q >= 0.999:
        META["hofmann-voltameter"]["liquids"] = {"inner-left": dict(axis="Y", yMin=4.4, yMax=40.0, x=-5.0, role="cathode tube (H2, 2 volumes)"),
                                                 "inner-right": dict(axis="Y", yMin=4.4, yMax=40.0, x=5.0, role="anode tube (O2, 1 volume)"),
                                                 "inner-centre": dict(axis="Y", yMin=4.4, yMax=45.0, x=0.0, role="levelling reservoir")}
    return parts


def lc_ring(ri, ro, y, h, n):
    pr = Prof(ri, y)
    pr.line(ro, y, 1).line(ro, y + h, 2).line(ri, y + h, 1)
    return lathe(pr, n, closed=True)[0]


META["hofmann-voltameter"] = dict(pivot="centre of the stand base on y = 0, x = 0 at the middle tube (the base spans x -11..17 to carry the battery)", axes="Y up, tubes at x = -5 (cathode), 0 (reservoir), +5 (anode), height ~ 46 cm, front +Z; glass shell `glass` with 0.8 cm ticks on both side tubes; "
                                  "three liquid-volume meshes inner-left / inner-right / inner-centre (scale or clip along Y; electrolysis lowers the side levels); blue stopcocks `taps` at y = 43; platinum-like `electrodes` at y 5.4..10; "
                                  "battery pack at x = 14.4 with wires wire-neg (black, to the left electrode) and wire-pos (red, to the right electrode)", units="1 = 1 cm", tintable=False,
                                  parts=["glass", "inner-left", "inner-right", "inner-centre", "stand", "taps", "electrodes", "wire-neg", "wire-pos", "battery"])
TEXTURE_SIZES["hofmann-voltameter"] = 2048


# ------------------------------------------------------------------------------------------------ splint, lighter
def splint(q):
    b = rbox(0.34, 15.0, 0.34, res(24, q, 3), (0, 7.5, 0), power=8)
    V = b[0]
    V[:, 0] *= 1 + 0.0 * V[:, 1]

    def fn(S, r, hint, gel):
        P = lc.bc(S["P"])
        ch = sstep(12.2, 14.3, P[:, 1] + 0.5 * fbm(P * np.float32(3.0), 5, 2))
        grain = 0.5 + 0.5 * vnoise(P * np.float32(12.0) * np.array([1, 0.08, 1], np.float32), 4)
        r["col"] = r["col"] * (1 - 0.18 * grain)[:, None] * (1 - 0.82 * ch)[:, None] + np.array([0.9, 0.35, 0.08], np.float32) * (sstep(14.1, 15.0, P[:, 1]) * 0.9)[:, None]
        return False
    lc.register("splint", "stick", fn)
    return [clay("stick", b, "#d9b27a", tint=(0.6, 0.45, 0.45), speck=0.03)]


META["splint"] = dict(pivot="centre of the bottom (hand) end", axes="Y along the splint: 3.4 x 150 x 3.4 mm; charred / glowing tip painted at y 12.2..15 (the app may add a glow)", units="1 = 1 cm", tintable=False, tipY=15.0)
TEXTURE_SIZES["splint"] = 512


def lighter(q):
    s = lambda k, lo=1: res(k, q, lo)
    body = rbox(2.5, 6.4, 1.2, s(20, 3), (0, 3.2, 0), power=4)
    top = rbox(2.6, 1.6, 1.3, s(14, 3), (0, 7.1, 0), power=5)
    wheel = at(cyl(0.55, 0.9, s(20, 6), bevel=0.1), (0.2, 7.7, 0), rot((1, 0, 0), 90))
    nozzle = at(cyl(0.3, 1.0, s(14, 5), bevel=0.08), (-0.6, 7.9, 0))
    btn = rbox(0.9, 0.35, 0.5, s(8, 3), (-0.5, 8.8, 0.0), power=5)
    lc.neutral_hint("lighter", "body", w=0.5, relief=0.01, dab=0.04)
    return [clay("body", body, NEUTRAL_L, tint=(0.62, 0.6, 0.66), speck=0.02), clay("head", geo.merge(top, wheel, nozzle), STEEL, tint=(0.55, 0.55, 0.7)),
            clay("button", btn, BLACK, tint=(0.5, 0.5, 0.6))]


META["lighter"] = dict(pivot="centre of the base on y = 0", axes="Y up, 25 x 64 x 12 mm body (neutral light, tint it) with a steel head; flame nozzle at (-0.6, 8.9, 0)", units="1 = 1 cm", tintable=True, tintParts=["body"], neutralAlbedo=True, flameMount=[-0.6, 8.9, 0.0])
TEXTURE_SIZES["lighter"] = 512


# ------------------------------------------------------------------------------------------------ flame mount (shader flame is drawn by the app)
def flame_mount(q):
    s = lambda k, lo=1: res(k, q, lo)
    col = lc_ring(0.5, 1.0, 0.0, 0.5, s(110, 12))
    cone = lathe((lambda p: (p.line(0.9, 0.0, 1), p.line(0.5, 0.9, s(3, 1)), p.line(0.0, 1.0, 1), p)[-1])(Prof(0, 0)), s(40, 10))[0]
    wick = geo.tube(geo.catmull([(0, 0.4, 0), (0.02, 1.0, 0), (0.03, 1.5, 0)], s(12, 2)), 0.22, s(20, 5), cap=3)
    # flame silhouette slab (the card): teardrop outline in XY, thickness 0.06 along Z
    t = np.linspace(0, 2 * np.pi, s(48, 10), endpoint=False)
    w = 0.55 * np.sin(t / 2) ** 1.0
    tip = np.stack([(0.5 * np.sin(t)) * (0.5 - 0.5 * np.cos(t)) ** 0.5 * 1.0, 1.6 - 1.6 * 0.5 * (1 + np.cos(t)) * 0 + 0 * t], 1)
    prof = []
    for a in t:
        yy = 0.9 * (1 - np.cos(a)) / 2 * 2.0
        xx = 0.62 * np.sin(a) * (1 - yy / 2.9) ** 0.8 if False else 0.62 * np.sin(a) * np.sin((1 - np.cos(a)) / 2 * np.pi) ** 0.5
        prof.append((xx, 0.25 + 2.7 * (1 - np.cos(a)) / 2))
    prof = np.array(prof)
    if np.linalg.norm(prof[1] - prof[0]) < 1e-9:
        prof = prof[1:]
    cs = prof[:, [1, 0]].copy()
    cs[:, 0] = cs[:, 0]
    surf = _prism_xy(cs, 0.06, s(2, 1))
    card = part("card", surf, solid("#ffb347", len(surf[0])), mat="gel", alpha=0.85, occ=False, ao=None, speck=0.0, form=0.0, tint=(1, 0.8, 0.6))
    card.rect_dir = (0.0, 0.0, 1.0)
    return [clay("mount", geo.merge(col, cone, wick), "#b7a98b", tint=(0.6, 0.5, 0.5)), card]


def _prism_xy(poly_yx, thick, nx):
    """Closed prism: silhouette given as (y, x) pairs, extruded +-thick/2 along Z (cap faces +-Z)."""
    V, F = extrude_polygon(np.asarray(poly_yx), thick, max(nx, 1))
    # extrude_polygon builds along +X with the cross-section in (y, z): rotate so the cross-section lies in the XY plane and the extrusion runs along Z
    R = geo.rot_axis((0, 1, 0), -90)
    V = V @ R.T
    V = V + np.array([0.0, 0.0, thick / 2])
    return V, F


META["flame-mount"] = dict(pivot="centre of the mount base on y = 0", axes="Y up: brass collar + cone + wick stub (top y = 1.5) for the app's shader flame; `card` (gel) is a closed 0.6 mm teardrop slab 1.2 x 2.9 with the flame silhouette facing +Z (billboard the card, or hide it and use a shader quad; "
                           "meta.uvRects.card gives its UV rectangle)", units="1 = 1 cm", tintable=False, flameBase=[0.0, 1.5, 0.0])
TEXTURE_SIZES["flame-mount"] = 512


BUILDERS = {"iron-nail": iron_nail, "magnesium-ribbon-coil": magnesium_ribbon_coil, "copper-strip": copper_strip, "candle": candle, "balloon": balloon,
            "electrode": electrode, "hofmann-voltameter": hofmann_voltameter, "splint": splint, "lighter": lighter, "flame-mount": flame_mount}

lc.LAB.update(BUILDERS)
