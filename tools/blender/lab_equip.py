"""Lab batch A2: stands, heaters, balance, handling tools and measuring props (painted clay, some glass parts). World unit = 1 cm, Y up, front +Z."""
import numpy as np

import geo
import lab_common as lc
from lab_common import Prof, lathe, wall_loop, liquid_mesh, glass_part, clay, cyl, rbox, sph, rot, solid
from shapes import res, part

META = {}
TEXTURE_SIZES = {}

STEEL, DSTEEL, BLACK, WOOD, WHITE, BRASS = "#97a3b0", "#6a737d", "#2f3338", "#b98a52", "#ece9df", "#c9a24b"


def at(surf, pos=(0, 0, 0), r=None):
    return geo.xf(surf, 1.0, r, pos)


def ring(ri, ro, y, h, n, k=2):
    pr = Prof(ri, y)
    pr.line(ro, y, 1).line(ro, y + h, k).line(ri, y + h, 1)
    return lathe(pr, n, closed=True)[0]


# ------------------------------------------------------------------------------------------------ test tube rack
def test_tube_rack(q):
    nb = res(22, q, 3)
    wood = [rbox(20, 0.8, 7, nb, (0, 0.4, 0))]
    wood += [rbox(0.9, 9.0, 7, nb, (sx * 9.55, 4.5, 0)) for sx in (-1, 1)]
    wood += [rbox(20, 0.9, 1.6, nb, (0, 8.0, sz * 2.3)) for sz in (-1, 1)]
    col = []
    for i in range(6):
        x = (i - 2.5) * 2.9
        col.append(at(ring(1.0, 1.6, 7.5, 1.0, res(20, q, 8), res(2, q, 1)), (x, 0, 0)))
        col.append(at(ring(0.95, 1.4, 2.2, 0.7, res(16, q, 8), res(1, q, 1)), (x, 0, 0)))
    lc.register("test-tube-rack", "wood", lc._wood((1, 0, 0), 0.7))
    lc.register("test-tube-rack", "collars", lc._wood((0, 1, 0), 1.4))
    return [clay("wood", geo.merge(*wood), WOOD, tint=(0.55, 0.4, 0.4)), clay("collars", geo.merge(*col), "#a67a45", tint=(0.55, 0.4, 0.4))]


META["test-tube-rack"] = dict(pivot="centre of the bottom plate on y = 0", axes="X along the six holes (spacing 2.9, first at x = -7.25), Y up; upper collars at y = 7.5..8.5, lower guides at y = 2.2; a test tube stands with its tip at y = 2.3 (lower guide bottom) and passes through the hole axis (z = 0)",
                              units="1 = 1 cm", tintable=False, holes=[[round((i - 2.5) * 2.9, 3), 0.0] for i in range(6)])
TEXTURE_SIZES["test-tube-rack"] = 1024


# ------------------------------------------------------------------------------------------------ burette stand
def burette_stand(q):
    n = res(28, q, 8)
    base = rbox(24, 2.2, 14, res(22, q, 3), (0, 1.1, 0), power=6)
    rod = at(cyl(0.55, 68, n, rings=res(8, q, 2), bevel=0.15), (-7, 2.2, 0))
    boss = rbox(2.6, 2.6, 2.6, res(8, q, 3), (-7, 50, 0))
    arm = at(cyl(0.38, 8.6, res(16, q, 6), rings=res(4, q, 1), bevel=0.1), (-7, 50, 0), rot((0, 0, 1), -90))
    a = np.radians(np.linspace(32, 328, res(24, q, 8)))
    jaw = geo.tube(np.stack([2.0 + 1.05 * np.cos(a), np.full(len(a), 50.0), 1.05 * np.sin(a)], 1), 0.22, res(8, q, 4), cap=2)
    screw = at(cyl(0.3, 2.2, res(12, q, 5), bevel=0.08), (-7, 50, 1.2), rot((1, 0, 0), 90))
    knob = sph(0.7, res(8, q, 3), (-7, 50, 3.6))
    lc.neutral_hint("burette-stand", "base")
    return [clay("base", base, BLACK, tint=(0.5, 0.5, 0.6)), clay("rod", rod, STEEL, tint=(0.55, 0.55, 0.7)),
            clay("clamp", geo.merge(boss, arm, jaw, screw, knob), DSTEEL, tint=(0.55, 0.55, 0.7))]


META["burette-stand"] = dict(pivot="centre of the cast base plate on y = 0", axes="Y up; rod at x = -7 (height 70); the clamp ring grips the burette at mountPoint (2, 50, 0): put the burette origin at (2, 12, 0) so its clamp zone (burette y = 38) sits in the ring",
                             units="1 = 1 cm", tintable=False, mountPoint=[2.0, 50.0, 0.0], buretteOrigin=[2.0, 12.0, 0.0])
TEXTURE_SIZES["burette-stand"] = 1024


# ------------------------------------------------------------------------------------------------ filter paper cone
def filter_paper_cone(q):
    o = Prof(0.04, 0.0)
    o.line(3.4, 5.0, res(20, q, 3))
    pr, inn, pts = wall_loop(o, 0.05, lip_n=res(2, q, 1), pole=False)
    (V, F), vp, e = lathe(pr, res(56, q, 12), closed=True)
    ph = np.arctan2(-V[:, 2], V[:, 0])
    k = 1 + 0.05 * np.cos(ph) * np.clip(V[:, 1] / 5.0, 0, 1)
    V[:, 0] *= k
    V[:, 2] *= k
    return [clay("paper", (V, F), "#f3f0e4", tint=(0.7, 0.62, 0.6), speck=0.02)]


META["filter-paper-cone"] = dict(pivot="the cone tip", axes="Y up, cone rim radius 3.4 at y = 5.0; place it with its tip at y ~ 7.3 inside the funnel asset", units="1 = 1 cm",
                                 tintable=False, funnelOrigin=[0, 7.3, 0])
TEXTURE_SIZES["filter-paper-cone"] = 512


# ------------------------------------------------------------------------------------------------ spatula, tongs
def spatula(q):
    n = res(48, q, 6)
    path = np.stack([np.linspace(-9.0, 5.8, n), np.zeros(n), np.zeros(n)], 1)
    handle = geo.tube(path, 0.2, res(14, q, 5), cap=3)
    spoon = sph(1.0, res(16, q, 4), (7.0, -0.05, 0), (1.55, 0.95, 0.2))
    blade = sph(1.0, res(16, q, 4), (-9.8, 0.0, 0), (1.3, 0.6, 0.09))
    return [clay("steel", geo.merge(handle, spoon, blade), STEEL, tint=(0.55, 0.55, 0.7))]


META["spatula"] = dict(pivot="centre of the handle", axes="X along the tool (length ~ 19 cm): round scoop at +X, flat blade at -X", units="1 = 1 cm", tintable=False)
TEXTURE_SIZES["spatula"] = 512


def tongs(q):
    n = res(14, q, 5)
    arms = []
    for sg in (1, -1):
        pts = [(-12.5, 0.0, sg * 1.7), (-6.0, 0.0, sg * 0.7), (0.0, sg * 0.28, 0.0), (6.0, 0.0, -sg * 0.9), (10.5, 0.0, -sg * 1.3), (12.8, 0.0, -sg * 0.55)]
        arms.append(geo.tube(geo.catmull(pts, res(26, q, 3)), 0.27, res(14, q, 5), cap=3))
    rivet = cyl(0.55, 1.0, res(16, q, 6), bevel=0.15, y0=-0.5)
    return [clay("arms", geo.merge(*arms), STEEL, tint=(0.55, 0.55, 0.7)), clay("rivet", rivet, DSTEEL, tint=(0.5, 0.5, 0.7))]


META["tongs"] = dict(pivot="the rivet where the two arms cross", axes="X along the tongs (handles at -X, jaw tips at +X, length ~ 26 cm), arms in the XZ plane, Y up", units="1 = 1 cm", tintable=False)
TEXTURE_SIZES["tongs"] = 512


# ------------------------------------------------------------------------------------------------ tripod, gauze
def tripod(q):
    ringp = at(geo.torus(res(72, q, 12), res(12, q, 4), 5.5, 0.35), (0, 19.5, 0))
    legs = []
    for k in range(3):
        a = 2 * np.pi * k / 3 + 0.5
        c, s = np.cos(a), np.sin(a)
        pts = [(5.5 * c, 19.5, 5.5 * s), (6.2 * c, 14.0, 6.2 * s), (7.6 * c, 6.0, 7.6 * s), (8.4 * c, 0.4, 8.4 * s)]
        legs.append(geo.tube(geo.catmull(pts, res(18, q, 3)), 0.3, res(12, q, 4), cap=3))
    return [clay("frame", geo.merge(ringp, *legs), "#59616b", tint=(0.5, 0.5, 0.65))]


META["tripod"] = dict(pivot="centre of the three feet on y = 0", axes="Y up, height 20 cm, support ring radius 5.5 at y = 19.5 (the wire gauze lies on it)", units="1 = 1 cm", tintable=False, ringY=19.85)
TEXTURE_SIZES["tripod"] = 1024


def wire_gauze(q):
    lc.register("wire-gauze", "mesh", lc._gauze(2.2))
    mesh = rbox(12, 0.2, 12, res(22, q, 3), (0, 0.1, 0), power=8)
    cer = at(cyl(2.7, 0.3, res(28, q, 8), bevel=0.1), (0, 0.2, 0))
    return [clay("mesh", mesh, "#8d969f", tint=(0.55, 0.55, 0.7)), clay("ceramic", cer, "#e3d9bf", tint=(0.7, 0.6, 0.55))]


META["wire-gauze"] = dict(pivot="centre of the underside on y = 0", axes="XZ plane, 12 x 12 cm, thickness 2 mm; ceramic centre radius 2.7 on top", units="1 = 1 cm", tintable=False)
TEXTURE_SIZES["wire-gauze"] = 512


# ------------------------------------------------------------------------------------------------ hot plate + stirrer, stir bar
def hot_plate_stirrer(q):
    body = rbox(20, 6.0, 26, res(24, q, 3), (0, 3.0, 0), power=5)
    plate = at(cyl(9.0, 0.9, res(48, q, 12), rings=res(2, q, 1), bevel=0.3), (0, 6.0, -2.0))
    kn = [at(cyl(1.55, 1.6, res(24, q, 8), bevel=0.25), (sx * 5.0, 2.8, 13.0), rot((1, 0, 0), 90)) for sx in (-1, 1)]
    led = sph(0.36, res(8, q, 3), (0, 4.6, 13.05))
    return [clay("body", body, "#e5e3d8", tint=(0.6, 0.55, 0.6)), clay("plate", plate, "#b5bec7", tint=(0.55, 0.55, 0.7)),
            clay("knobs", geo.merge(*kn), BLACK, tint=(0.5, 0.5, 0.6)), clay("led", led, "#59d36b", ao=None, tint=(0.8, 0.9, 0.8))]


META["hot-plate-stirrer"] = dict(pivot="centre of the underside on y = 0", axes="Y up, front (knobs, green LED) towards +Z, 20 x 26 x 7 cm, round aluminium plate radius 9 centred at (0, 6.9, -2)", units="1 = 1 cm", tintable=False,
                                 plateTop=[0.0, 6.9, -2.0])
TEXTURE_SIZES["hot-plate-stirrer"] = 1024


def magnetic_stir_bar(q):
    pr = Prof(0, -1.6)
    pr.arc(0, -1.15, 0.45, -90, 0, res(12, q, 3)).line(0.45, 1.15, res(30, q, 2)).arc(0, 1.15, 0.45, 0, 90, res(12, q, 3))
    body = lathe(pr, res(48, q, 8))[0]
    rg = geo.xf(geo.torus(res(48, q, 8), res(12, q, 4), 0.46, 0.075), 1.0, None, (0, 0, 0))
    both = geo.merge(body, rg)
    both = geo.xf(both, 1.0, rot((0, 0, 1), 90))
    return [clay("bar", both, "#f1efe8", tint=(0.75, 0.7, 0.72), speck=0.02)]


META["magnetic-stir-bar"] = dict(pivot="centre of the bar", axes="X along the bar (length 32 mm, diameter 9 mm) with the pivot ring in the middle", units="1 = 1 cm", tintable=False)
TEXTURE_SIZES["magnetic-stir-bar"] = 256


# ------------------------------------------------------------------------------------------------ alcohol burner (hero)
def alcohol_burner(q):
    s = lambda k, lo=1: res(k, q, lo)
    o = Prof(0, 0, e=0.8)
    o.line(3.0, 0, s(3)).cut()
    o.arc(3.0, 0.7, 0.7, -90, 0, s(5, 2), e=0.5)
    o.line(3.7, 2.6, s(5, 2), e=0.0).cut()
    o.poly([(3.5, 3.7), (2.9, 4.7), (2.1, 5.5), (1.55, 6.0), (1.45, 6.4)], e=0.0)
    o.line(1.45, 7.4, s(3, 1), e=0.0).cut()
    o.line(1.58, 7.6, 1, e=0.5)
    pr, inn, pts = wall_loop(o, 0.2, lip_n=s(3, 2))
    gs, _, ge = lathe(pr, s(56, 10))
    ls, _, le = liquid_mesh(inn, 4.3, s(36, 8), t_extra=0.04)
    hp = Prof(0.7, 7.2)
    hp.line(1.65, 7.2, s(2)).line(1.65, 8.2, s(2)).line(1.1, 8.6, s(2)).line(0.9, 9.6, s(2)).line(0.64, 9.6, 1).line(0.64, 7.2, s(3))
    holder = lathe(hp, s(40, 8), closed=True)[0]
    wp = np.array([(0.0, 1.0, 0.0), (0.08, 3.5, 0.02), (0.02, 6.5, 0.0), (0.0, 8.8, 0.0), (0.05, 10.0, 0.0), (0.0, 10.9, 0.03)])
    wick = geo.tube(geo.catmull(wp, s(10, 3)), 0.23, s(10, 5), cap=3)
    setm = META.setdefault("alcohol-burner", {})
    if q >= 0.999:
        setm["liquid"] = dict(mesh="inner", axis="Y", yMin=round(float(inn[0, 1]) + 0.04, 3), yMax=4.3, note="alcohol level volume")
    return [glass_part("alcohol-burner", "glass", gs, ge, dict(streak=-2.7)), glass_part("alcohol-burner", "inner", ls, le, None, liquid=True),
            clay("holder", holder, BRASS, tint=(0.6, 0.45, 0.35)), clay("wick", wick, "#efe6cf", tint=(0.7, 0.6, 0.55), speck=0.03)]


META["alcohol-burner"] = dict(pivot="centre of the base on y = 0", axes="Y up, glass body diameter 74 mm, brass wick holder, cotton wick tip at y = 10.9", units="1 = 1 cm", tintable=False,
                              flameMount=[0.0, 10.9, 0.0], parts=["glass", "inner", "holder", "wick"])
TEXTURE_SIZES["alcohol-burner"] = 2048


# ------------------------------------------------------------------------------------------------ digital balance
def digital_balance(q):
    nb = res(22, q, 3)
    body = rbox(18, 3.2, 24, nb, (0, 1.6, 0), power=6)
    tilt = rot((1, 0, 0), -25)
    housing = geo.xf(rbox(16, 3.4, 5.0, res(14, q, 3), (0, 0, 0), power=6), 1.0, tilt, (0, 4.6, 8.0))
    btn = [at(cyl(0.45, 0.5, res(12, q, 5), bevel=0.12), (bx, 3.0, 11.8), rot((1, 0, 0), 90)) for bx in (-2.0, 0.0, 2.0)]
    post = at(cyl(0.9, 1.4, res(16, q, 6)), (0, 3.2, -3.5))
    pan = at(cyl(5.4, 0.5, res(40, q, 10), rings=res(2, q, 1), bevel=0.2), (0, 4.5, -3.5))
    disp = geo.xf(rbox(11.6, 3.0, 0.14, res(16, q, 3), (0, 0, 0), power=8), 1.0, tilt, (0, 4.6, 8.0) + tilt @ np.array([0.0, 0.0, 2.52]))
    d = part("display", disp, solid("#26352c", len(disp[0])), mat="gel", alpha=1.0, occ=False, ao=None, speck=0.0, form=0.0, proj=2, tint=(0.8, 0.9, 0.85))
    d.rect_dir = tuple(tilt @ np.array([0.0, 0.0, 1.0]))
    return [clay("body", geo.merge(body, housing, *btn), "#d9dde2", tint=(0.6, 0.6, 0.7)), clay("pan", geo.merge(post, pan), STEEL, tint=(0.55, 0.55, 0.7)), d]


META["digital-balance"] = dict(pivot="centre of the underside on y = 0", axes="Y up, display housing towards +Z tilted 25 degrees; steel pan centre at (0, 5.0, -3.5); the mesh `display` (gel material) is for app-drawn digits: use meta.uvRects.display = [u0, v0, u1, v1] in glTF texture coordinates",
                               units="1 = 1 cm", tintable=False, panCentre=[0.0, 5.0, -3.5], displayPart="display")
TEXTURE_SIZES["digital-balance"] = 1024


# ------------------------------------------------------------------------------------------------ pH strip + colour chart
def ph_paper_strip(q):
    s = rbox(0.7, 6.0, 0.06, res(22, q, 3), (0, 3.0, 0), power=8)
    lc.neutral_hint("ph-paper-strip", "strip", w=0.3, relief=0.004)
    return [clay("strip", s, "#f3efe0", ao=(0.6, 0.1, 8), tint=(0.8, 0.75, 0.7), speck=0.02)]


META["ph-paper-strip"] = dict(pivot="centre of the bottom (dipped) end", axes="Y along the strip (length 6 cm, width 7 mm, thickness 0.6 mm); neutral pale albedo: tint it with the pH colour", units="1 = 1 cm", tintable=True, tintParts=["strip"], neutralAlbedo=True)
TEXTURE_SIZES["ph-paper-strip"] = 256


def ph_colour_chart(q):
    card = rbox(11.0, 0.16, 5.4, res(22, q, 3), (0, 0.08, 0), power=8)
    cols = ["#d62839", "#e8562a", "#f19a2b", "#f2d03b", "#6ab04c", "#2f9e8f", "#3b6fd1", "#7a3fb5"]
    out = [clay("card", card, "#f4f1e6", tint=(0.75, 0.7, 0.7), speck=0.02)]
    for i, c in enumerate(cols):
        x = (i - 3.5) * 1.22
        p = rbox(1.0, 0.07, 3.2, res(8, q, 2), (x, 0.19, -0.2), power=6)
        out.append(clay(f"patch-{i + 1}", p, c, ao=(0.4, 0.1, 6), tint=(0.6, 0.55, 0.65), speck=0.0))
    return out


META["ph-colour-chart"] = dict(pivot="centre of the underside on y = 0", axes="XZ plane card 11 x 5.4 cm, 8 painted colour patches (patch-1 red .. patch-8 violet, left to right) approximating pH 1, 3, 4, 6, 7, 8, 10, 13", units="1 = 1 cm",
                               tintable=False, patchPH=[1, 3, 4, 6, 7, 8, 10, 13])
TEXTURE_SIZES["ph-colour-chart"] = 512


BUILDERS = {"test-tube-rack": test_tube_rack, "burette-stand": burette_stand, "filter-paper-cone": filter_paper_cone, "spatula": spatula, "tongs": tongs, "tripod": tripod,
            "wire-gauze": wire_gauze, "hot-plate-stirrer": hot_plate_stirrer, "magnetic-stir-bar": magnetic_stir_bar, "alcohol-burner": alcohol_burner,
            "digital-balance": digital_balance, "ph-paper-strip": ph_paper_strip, "ph-colour-chart": ph_colour_chart}

lc.LAB.update(BUILDERS)
