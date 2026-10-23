"""Lab batch A3: reagent containers (glass + screw cap + tintable label), PPE props, waste container, bench top and backdrop wall. World unit = 1 cm, Y up, front +Z."""
import numpy as np

import geo
import lab_common as lc
from lab_common import Prof, lathe, wall_loop, liquid_mesh, glass_part, clay, cyl, rbox, sph, rot, solid
from shapes import res, part, blob

META = {}
TEXTURE_SIZES = {}
STEEL, DSTEEL, BLACK, WOOD = "#bcc5ce", "#6a737d", "#2f3338", "#b98a52"
NEUTRAL_L = "#ece9df"


def at(surf, pos=(0, 0, 0), r=None):
    return geo.xf(surf, 1.0, r, pos)


def label_ring(R, y0, y1, n, k=2, th=0.07):
    pr = Prof(R - 0.02, y0)
    pr.line(R + th, y0, 1).line(R + th, y1, k).line(R - 0.02, y1, 1)
    return lathe(pr, n, closed=True)[0]


def _neutral(asset, name, **kw):
    lc.neutral_hint(asset, name, **kw)


# ------------------------------------------------------------------------------------------------ reagent bottles
def _bottle(asset, q, R, Hb, Rn, Hn, t, fill, ly0, ly1, cap_h):
    s = lambda k, lo=1: res(k, q, lo)
    o = Prof(0, 0, e=0.8)
    o.line(R - 0.5, 0, s(3)).cut()
    o.arc(R - 0.5, 0.5, 0.5, -90, 0, s(5, 2), e=0.5)
    o.line(R, Hb, s(8, 2), e=0.0).cut()
    sh = Hb + 1.5
    c0, c1 = np.array([R, Hb]), np.array([Rn + 0.1, sh])
    pts = []
    for k in range(1, s(6, 2) + 1):          # smooth shoulder: ease-in/out blend between body and neck
        tt = k / s(6, 2)
        e_ = tt * tt * (3 - 2 * tt)
        pts.append((R + (Rn + 0.1 - R) * e_, Hb + 1.5 * tt))
    o.poly(pts, e=0.0)
    o.line(Rn, sh + 0.3, 1)
    top = sh + Hn
    o.line(Rn, top, s(3, 1), e=0.0).cut()
    o.line(Rn + 0.14, top + 0.05, 1, e=0.5)
    pr, inn, pts_ = wall_loop(o, t, lip_n=s(3, 2))
    gs, _, ge = lathe(pr, s(56, 10))
    ls, _, le = liquid_mesh(inn, fill, s(36, 8), t_extra=0.04)
    cp = Prof(0, top - cap_h + 0.6)
    cp.line(Rn + 0.55, top - cap_h + 0.6, 1).arc(Rn + 0.55 - 0.3, top - cap_h + 0.9, 0.3, -90, 0, 2).line(Rn + 0.55, top + 0.6, s(3, 1)).arc(Rn + 0.3, top + 0.6, 0.25, 0, 90, 2).line(0, top + 0.85, 1)
    cap = lathe(cp, s(40, 8))[0]
    V = cap[0]
    ph = np.arctan2(-V[:, 2], V[:, 0])
    rr = np.hypot(V[:, 0], V[:, 2])
    kk = 1 + 0.03 * np.cos(24 * ph) * (V[:, 1] < top)
    V[:, 0] *= kk
    V[:, 2] *= kk
    lab = label_ring(R, ly0, ly1, s(56, 10), s(6, 2))
    lc.register(asset, "label", lc._label())
    _neutral(asset, "label", w=0.5, relief=0.01)
    _neutral(asset, "cap", w=0.3, relief=0.01)
    if q >= 0.999:
        META.setdefault(asset, {})["liquid"] = dict(mesh="inner", axis="Y", yMin=round(float(inn[0, 1]) + 0.04, 3), yMax=round(float(fill), 3), note="closed cavity volume up to the shoulder")
    return [glass_part(asset, "glass", gs, ge, dict(streak=-2.7)), glass_part(asset, "inner", ls, le, None, liquid=True),
            clay("cap", cap, NEUTRAL_L, tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18), clay("label", lab, NEUTRAL_L, ao=(0.5, 0.1, 6), tint=(0.62, 0.6, 0.66), speck=0.0)]


def reagent_bottle_250(q):
    return _bottle("reagent-bottle-250ml", q, 3.2, 9.0, 1.45, 2.0, 0.22, 9.3, 2.4, 7.4, 1.7)


def reagent_bottle_500(q):
    return _bottle("reagent-bottle-500ml", q, 4.0, 12.5, 1.7, 2.2, 0.26, 12.8, 3.2, 10.4, 1.9)


for _id, _R, _H, _c in (("reagent-bottle-250ml", 3.2, 12.5, 250), ("reagent-bottle-500ml", 4.0, 16.7, 500)):
    META[_id] = dict(pivot="centre of the base on y = 0", axes=f"Y up, body diameter {_R * 20:.0f} mm; screw cap and paper label ring (y {2.4 if _c == 250 else 3.2}..{7.4 if _c == 250 else 10.4}) are neutral light: tint them; `inner` is the liquid volume",
                     units="1 = 1 cm", tintable=True, tintParts=["cap", "label"], neutralAlbedo=True, capacityMl=_c, parts=["glass", "inner", "cap", "label"])
TEXTURE_SIZES.update({"reagent-bottle-250ml": 1024, "reagent-bottle-500ml": 1024})


def powder_jar(q):
    s = lambda k, lo=1: res(k, q, lo)
    R, Rn = 3.2, 2.5
    o = Prof(0, 0, e=0.8)
    o.line(R - 0.5, 0, s(3)).cut()
    o.arc(R - 0.5, 0.5, 0.5, -90, 0, s(5, 2), e=0.5)
    o.line(R, 5.2, s(6, 2), e=0.0).cut()
    pts = []
    for k in range(1, s(5, 2) + 1):
        tt = k / s(5, 2)
        e_ = tt * tt * (3 - 2 * tt)
        pts.append((R + (Rn - R) * e_, 5.2 + 1.0 * tt))
    o.poly(pts, e=0.0)
    o.line(Rn, 7.0, s(2, 1), e=0.0).cut()
    o.line(Rn + 0.14, 7.05, 1, e=0.5)
    pr, inn, pts_ = wall_loop(o, 0.22, lip_n=s(3, 2))
    gs, _, ge = lathe(pr, s(56, 10))
    ls, _, le = liquid_mesh(inn, 4.6, s(36, 8), t_extra=0.04)
    lp = Prof(0, 6.4)
    lp.line(Rn + 0.45, 6.4, 1).arc(Rn + 0.15, 6.7, 0.3, -90, 0, 2).line(Rn + 0.45, 7.9, s(3, 1)).arc(Rn + 0.15, 7.9, 0.3, 0, 90, 2).line(0, 8.2, 1)
    lid = lathe(lp, s(44, 8))[0]
    lab = label_ring(R, 1.6, 4.6, s(56, 10), s(4, 2))
    lc.register("powder-jar", "label", lc._label())
    _neutral("powder-jar", "label", w=0.5, relief=0.01)
    _neutral("powder-jar", "lid", w=0.3, relief=0.01)
    META["powder-jar"].update(liquid=dict(mesh="inner", axis="Y", yMin=round(float(inn[0, 1]) + 0.04, 3), yMax=4.6, note="powder volume (scale / clip along Y)")) if q >= 0.999 else None
    return [glass_part("powder-jar", "glass", gs, ge, dict(streak=-2.7)), glass_part("powder-jar", "inner", ls, le, None, liquid=True),
            clay("lid", lid, NEUTRAL_L, tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18), clay("label", lab, NEUTRAL_L, ao=(0.5, 0.1, 6), tint=(0.62, 0.6, 0.66), speck=0.0)]


META["powder-jar"] = dict(pivot="centre of the base on y = 0", axes="Y up, wide-mouth jar diameter 64 mm, height 70 mm + screw lid up to y = 8.2; lid and label are neutral light: tint them", units="1 = 1 cm", tintable=True,
                          tintParts=["lid", "label"], neutralAlbedo=True, parts=["glass", "inner", "lid", "label"])
TEXTURE_SIZES["powder-jar"] = 1024


def indicator_dropper_bottle(q):
    s = lambda k, lo=1: res(k, q, lo)
    R, Rn = 1.8, 0.95
    o = Prof(0, 0, e=0.8)
    o.line(R - 0.3, 0, s(3)).cut()
    o.arc(R - 0.3, 0.3, 0.3, -90, 0, s(4, 2), e=0.5)
    o.line(R, 4.3, s(7, 2), e=0.0).cut()
    pts = []
    for k in range(1, s(5, 2) + 1):
        tt = k / s(5, 2)
        e_ = tt * tt * (3 - 2 * tt)
        pts.append((R + (Rn + 0.05 - R) * e_, 4.3 + 1.0 * tt))
    o.poly(pts, e=0.0)
    o.line(Rn, 6.3, s(2, 1), e=0.0).cut()
    o.line(Rn + 0.1, 6.35, 1, e=0.5)
    pr, inn, pts_ = wall_loop(o, 0.14, lip_n=s(3, 2))
    gs, _, ge = lathe(pr, s(44, 10))
    ls, _, le = liquid_mesh(inn, 3.9, s(28, 8), t_extra=0.03)
    cp = Prof(0, 5.4)
    cp.line(Rn + 0.42, 5.4, 1).line(Rn + 0.42, 7.0, s(2, 1)).line(Rn + 0.1, 7.3, 1).line(0.55, 7.6, 1).poly([(0.55, 8.4), (0.8, 9.6), (0.85, 11.2), (0.5, 12.6)]).arc(0.0, 12.6, 0.5, 0, 90, s(4, 2))
    cap = lathe(cp, s(36, 8))[0]
    lab = label_ring(R, 1.0, 3.8, s(40, 10), s(4, 2), th=0.05)
    lc.register("indicator-dropper-bottle", "label", lc._label())
    _neutral("indicator-dropper-bottle", "label", w=0.3, relief=0.006)
    _neutral("indicator-dropper-bottle", "cap", w=0.3, relief=0.006)
    if q >= 0.999:
        META["indicator-dropper-bottle"]["liquid"] = dict(mesh="inner", axis="Y", yMin=round(float(inn[0, 1]) + 0.03, 3), yMax=3.9, note="liquid volume")
    return [glass_part("indicator-dropper-bottle", "glass", gs, ge, dict(streak=-2.7)), glass_part("indicator-dropper-bottle", "inner", ls, le, None, liquid=True),
            clay("cap", cap, NEUTRAL_L, tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18), clay("label", lab, NEUTRAL_L, ao=(0.5, 0.1, 6), tint=(0.62, 0.6, 0.66), speck=0.0)]


META["indicator-dropper-bottle"] = dict(pivot="centre of the base on y = 0", axes="Y up, bottle diameter 36 mm, collar + rubber teat up to y = 13 (neutral light `cap`, tint it) and a `label` ring (tint it)", units="1 = 1 cm",
                                        tintable=True, tintParts=["cap", "label"], neutralAlbedo=True, parts=["glass", "inner", "cap", "label"])
TEXTURE_SIZES["indicator-dropper-bottle"] = 512


# ------------------------------------------------------------------------------------------------ PPE
def safety_goggles(q):
    s = lambda k, lo=1: res(k, q, lo)
    lens, rims = [], []
    for sx in (-1, 1):
        cx = sx * 3.0
        lens.append(sph(1.0, s(14, 4), (cx, 0, 0.2), (2.7, 1.8, 0.45)))
        a = np.linspace(0, 2 * np.pi, s(36, 10), endpoint=False)
        ring = np.stack([cx + 2.85 * np.cos(a), 1.9 * np.sin(a), 0.1 + 0.15 * np.cos(2 * a) * 0 + 0 * a], 1)
        rims.append(geo.tube(ring, 0.3, s(8, 4), closed=True))
    bridge = geo.tube(geo.catmull([(-0.4, 0.1, 0.2), (0, 0.2, 0.35), (0.4, 0.1, 0.2)], s(6, 2)), 0.26, s(8, 4), cap=2)
    sp = [(-5.9, 0, 0.1), (-8.4, 0, -3.0), (-8.9, 0, -7.5), (-6.5, 0, -12.0), (0, 0, -14.0), (6.5, 0, -12.0), (8.9, 0, -7.5), (8.4, 0, -3.0), (5.9, 0, 0.1)]
    strap_pts = geo.catmull(sp, s(10, 3))
    strap = geo.tube(strap_pts, 0.35, s(8, 4), cap=2, aspect=np.full(len(strap_pts), 3.0), up=(0, 1, 0))
    gl = []
    for l_ in lens:
        gl.append(l_)
    g = [part("lenses", geo.merge(*gl), solid("#d4ecf3", sum(len(x[0]) for x in gl)), mat="gel", alpha=0.3, occ=False, ao=None, speck=0.0, form=0.05, tint=(0.8, 0.9, 0.95))]
    lc.neutral_hint("safety-goggles", "frame", w=0.3, relief=0.01)
    return [clay("frame", geo.merge(*rims, bridge), NEUTRAL_L, tint=(0.62, 0.6, 0.66), speck=0.02), clay("strap", strap, "#2f3338", tint=(0.5, 0.5, 0.6)), g[0]]


META["safety-goggles"] = dict(pivot="centre of the bridge between the lenses", axes="X across, Y up, lenses face +Z (wearer looks along +Z), elastic strap towards -Z; neutral light `frame` is tintable", units="1 = 1 cm", tintable=True,
                              tintParts=["frame"], neutralAlbedo=True)
TEXTURE_SIZES["safety-goggles"] = 512


def _glove(q, flip=False):
    s = lambda k, lo=1: res(k, q, lo)
    palm = blob(s(14, 3), (3.3, 0.9, 4.0), seed=3, amp=0.03, pos=(0, 0.9, 0))
    parts = [palm]
    for x, ln, rr in ((-2.3, 5.2, 0.62), (-0.8, 6.2, 0.66), (0.8, 5.8, 0.64), (2.3, 4.4, 0.58)):
        pts = [(x * 0.95, 0.85, 3.2), (x * 1.05, 0.85, 3.2 + ln * 0.5), (x * 1.12 + 0.1, 0.85, 3.2 + ln)]
        parts.append(geo.tube(geo.catmull(pts, s(6, 2)), rr, s(8, 3), cap=2))
    th = [(-2.9, 0.85, 0.3), (-4.9, 0.85, 1.6), (-6.2, 0.85, 3.6)]
    parts.append(geo.tube(geo.catmull(th, s(6, 2)), 0.72, s(8, 3), cap=2))
    cuff = geo.xf(cyl(2.7, 3.4, s(24, 6), bevel=0.35), 1.0, rot((1, 0, 0), 90), (0, 0.9, -3.4 - 0.0))
    cuff = (cuff[0] * np.array([1, 0.34, 1]) + np.array([0, 0.6, 0]), cuff[1])
    parts.append(cuff)
    V, F = geo.merge(*parts)
    if flip:
        V = V * np.array([-1.0, 1.0, 1.0])
        F = geo.flipf(F)
    return V, F


def nitrile_gloves(q):
    out = []
    for nm, sx, fl in (("glove-l", -5.8, False), ("glove-r", 5.8, True)):
        V, F = _glove(q, fl)
        out.append(clay(nm, (V + np.array([sx, 0, 0]), F), NEUTRAL_L, tint=(0.62, 0.6, 0.66), speck=0.02))
        lc.neutral_hint("nitrile-gloves", nm, w=0.35, relief=0.008)
    return out


META["nitrile-gloves"] = dict(pivot="midpoint between the two gloves on the table plane (y = 0)", axes="gloves lie palm-down on XZ (fingers towards +Z, cuffs towards -Z), left at x = -5.8, right at x = +5.8; neutral light albedo: tint both parts", units="1 = 1 cm",
                              tintable=True, tintParts=["glove-l", "glove-r"], neutralAlbedo=True)
TEXTURE_SIZES["nitrile-gloves"] = 512


def waste_container(q):
    s = lambda k, lo=1: res(k, q, lo)
    bp = Prof(0, 0)
    bp.line(8.3, 0, s(3)).arc(8.3, 0.9, 0.9, -90, 0, s(4, 2)).line(9.0, 21.0, s(8, 2)).arc(8.4, 21.0, 0.6, 0, 90, s(3, 2)).line(0, 21.6, s(3, 1))
    body = lathe(bp, s(56, 10))[0]
    lp = Prof(0, 21.2)
    lp.line(9.2, 21.2, 1).line(9.2, 22.4, 1).line(5.5, 23.4, s(4, 2)).line(4.0, 23.4, 1).line(0, 23.4, 1)
    lid = lathe(lp, s(56, 10))[0]
    nk = ring_neck = Prof(2.2, 23.2)
    nk.line(3.1, 23.2, 1).line(3.1, 26.0, s(3, 1)).line(2.7, 26.4, 1).line(2.2, 26.4, 1).line(2.2, 23.7, s(2, 1))
    neck = lathe(nk, s(36, 8), closed=True)[0]
    h = geo.tube(geo.catmull([(-7.5, 22.8, 0.0), (-6.0, 26.5, 0.0), (0.0, 28.5, 0.0), (6.0, 26.5, 0.0), (7.5, 22.8, 0.0)], s(12, 4)), 0.55, s(8, 4), cap=2)
    lab = label_ring(8.95, 7.0, 15.0, s(56, 10), s(4, 2), th=0.08)
    lc.register("waste-container", "label", lc._label())
    for n_ in ("body", "lid", "label"):
        _neutral("waste-container", n_, w=0.8, relief=0.02)
    return [clay("body", body, NEUTRAL_L, tint=(0.62, 0.6, 0.66), speck=0.02), clay("lid", geo.merge(lid, neck, h), NEUTRAL_L, tint=(0.62, 0.6, 0.66), speck=0.02),
            clay("label", lab, NEUTRAL_L, ao=(0.5, 0.1, 6), tint=(0.62, 0.6, 0.66), speck=0.0)]


META["waste-container"] = dict(pivot="centre of the base on y = 0", axes="Y up, diameter 18 cm, height 28 cm incl. funnel neck and carrying handle; neutral light body, lid and label ring: tint them per waste class (acid/base, heavy metal, solid)", units="1 = 1 cm",
                               tintable=True, tintParts=["body", "lid", "label"], neutralAlbedo=True)
TEXTURE_SIZES["waste-container"] = 1024


# ------------------------------------------------------------------------------------------------ bench + backdrop
def bench_top(q):
    top = rbox(60, 2.4, 30, res(30, q, 4), (0, -1.2, 0), power=14)
    wood = rbox(59, 3.2, 29, res(30, q, 4), (0, -4.0, 0), power=10)
    lc.register("bench-top", "wood", lc._wood((1, 0, 0), 0.5))
    lc.neutral_hint("bench-top", "top", w=1.2, relief=0.01, strokeval=0.0, dry=0.0, dab=0.02, contour=0.15)

    def epoxy(S, r, hint, gel):
        P = lc.bc(S["P"])
        fl = lc.vnoise(P * np.float32(3.0), 12)
        sp = lc.sstep(0.75, 0.9, fl)
        r["col"] = r["col"] * (1 - 0.18 * sp)[:, None] + 0.05 * lc.sstep(0.85, 0.95, -fl)[:, None]
        r["rough"] = r["rough"] * 0.5
        return False
    lc.register("bench-top", "top", epoxy)
    return [clay("top", top, "#3c444b", tint=(0.55, 0.55, 0.7), speck=0.03), clay("wood", wood, WOOD, tint=(0.55, 0.4, 0.4))]


META["bench-top"] = dict(pivot="centre of the top surface (y = 0 is the work surface)", axes="XZ plane tile 60 x 30 cm (6 x 3 dm), epoxy resin top 2.4 cm on a wood frame 3.2 cm (down to y = -5.6); front edge towards +Z; abuts along X at x = +-30 for a modular bench",
                         units="1 = 1 cm", tintable=False, tile=[60.0, 30.0])
TEXTURE_SIZES["bench-top"] = 2048


def lab_backdrop(q):
    wall = rbox(60, 45, 2, res(30, q, 4), (0, 22.5, -1.0), power=14)
    shelf = rbox(60, 1.6, 12, res(24, q, 4), (0, 22.0, 6.0), power=10)
    br = []
    for sx in (-22, 22):
        br.append(rbox(1.2, 8.0, 1.0, res(8, q, 3), (sx, 18.0, 0.5)))
        br.append(geo.xf(rbox(1.2, 9.0, 1.0, res(8, q, 3), (0, 0, 0)), 1.0, rot((1, 0, 0), 45), (sx, 17.5, 3.9)))
    lc.register("lab-backdrop", "wall", lc._tiles(6.0, 3.0))
    lc.register("lab-backdrop", "shelf", lc._wood((1, 0, 0), 0.6))
    return [clay("wall", wall, "#e4eaec", tint=(0.6, 0.62, 0.7), speck=0.02), clay("shelf", shelf, WOOD, tint=(0.55, 0.4, 0.4)),
            clay("brackets", geo.merge(*br), "#6a737d", tint=(0.5, 0.5, 0.65))]


META["lab-backdrop"] = dict(pivot="bottom centre of the wall front face (y = 0, z = 0)", axes="XY wall panel 60 x 45 cm (matches one bench tile width) with painted 6 x 3 cm tiles, shelf at y = 22 projecting 12 cm towards +Z; stands behind a bench tile at z = -15", units="1 = 1 cm",
                            tintable=False, shelfTop=[0.0, 22.8, 6.0])
TEXTURE_SIZES["lab-backdrop"] = 1024


BUILDERS = {"reagent-bottle-250ml": reagent_bottle_250, "reagent-bottle-500ml": reagent_bottle_500, "powder-jar": powder_jar,
            "indicator-dropper-bottle": indicator_dropper_bottle, "safety-goggles": safety_goggles, "nitrile-gloves": nitrile_gloves,
            "waste-container": waste_container, "bench-top": bench_top, "lab-backdrop": lab_backdrop}

lc.LAB.update(BUILDERS)
