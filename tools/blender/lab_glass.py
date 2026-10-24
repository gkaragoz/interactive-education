"""Lab batch A1: glassware. Every vessel = `glass` (gel, real wall thickness, painted rim lift + streak highlights + graduation ticks) and `inner`,
a closed liquid-volume mesh just inside the cavity (the app tints it and clips / scales it by height; it is not shaded as liquid here).
World unit = 1 cm, vessels stand on y = 0, axis Y, spout towards +X."""
import numpy as np

import geo
import lab_common as lc
from lab_common import Prof, lathe, wall_loop, liquid_mesh, volume_ticks, glass_part, spout, register_glass, solid, clay, cyl
from shapes import res, part

META = {}
TEXTURE_SIZES = {}
LOD_Q = {}


def setmeta(asset, q, **kw):
    if q >= 0.999:
        META.setdefault(asset, {}).update(kw)


def _vessel(asset, q, outer, t, vols=None, major_every=5, fill=None, n=56, lip=4, pole=True, spout_cfg=None, tickphi=1.0, patch=None, streak=2.3,
            tl=1.0, ticks=None, y_lo=None, liquid=True, tw=0.03):
    pr, inn, pts = wall_loop(outer, t, lip_n=res(lip, q, 2), pole=pole)
    na = res(n, q, 10)
    surf, vp, e = lathe(pr, na, closed=not pole)
    H = float(pts[:, 1].max())
    if spout_cfg:
        spout(surf[0], H, **spout_cfg)
    spec = dict(streak=streak, tickphi=tickphi, tl=tl, tw=tw, patch=patch)
    yfill = fill if fill is not None else H - 0.9
    if vols is not None and ticks is None:
        ys = volume_ticks(inn, inn[0, 1], vols)
        ticks = [(y, (k + 1) % major_every == 0) for k, y in enumerate(ys)]
        if fill is None:
            yfill = ys[-1]
    if ticks:
        spec["ticks"] = ticks
    out = [glass_part(asset, "glass", surf, e, spec)]
    if liquid:
        lo = inn[:, 1] >= (y_lo if y_lo is not None else -1)
        sub = inn[lo] if y_lo is not None else inn
        ls, _, le = liquid_mesh(sub, yfill, res(40, q, 8))
        out.append(glass_part(asset, "inner", ls, le, None, liquid=True))
        setmeta(asset, q, liquid=dict(mesh="inner", axis="Y", yMin=round(float(sub[0, 1]) + 0.03, 3), yMax=round(float(yfill), 3),
                                      note="closed cavity volume up to the top graduation: scale / clip it along Y to set the level"))
    return out


# ------------------------------------------------------------------------------------------------ beakers
def _beaker(asset, q, R, H, t, cr, vols, major_every, spout_amt, patch):
    s = lambda k, lo=1: res(k, q, lo)
    o = Prof(0, 0, e=0.8)
    o.line(R - cr, 0, s(3), e=0.8).cut()
    o.arc(R - cr, cr, cr, -90, 0, s(5, 2), e=0.5)
    o.line(R, H - 0.6, s(9, 2), e=0.0).cut()
    o.line(R + 0.14, H, s(2), e=0.5)
    return _vessel(asset, q, o, t, vols=vols, major_every=major_every, n=60, patch=patch,
                   spout_cfg=dict(span=1.4, amount=spout_amt, width_deg=24.0), tickphi=-1.25, streak=-2.7, tl=1.0)


def beaker_100(q):
    return _beaker("beaker-100ml", q, 2.5, 7.0, 0.15, 0.3, [20, 40, 60, 80], 2, 0.45, (-1.95, 0.30, 1.6, 3.9))


def beaker_250(q):
    return _beaker("beaker-250ml", q, 3.5, 9.5, 0.18, 0.4, [50, 100, 150, 200, 250], 2, 0.6, (-1.95, 0.34, 2.1, 5.2))


def beaker_400(q):
    return _beaker("beaker-400ml", q, 4.1, 11.5, 0.2, 0.45, [100, 200, 300, 400], 1, 0.7, (-1.95, 0.34, 2.6, 6.2))


for _id, _R, _H, _cap in (("beaker-100ml", 2.5, 7.0, 100), ("beaker-250ml", 3.5, 9.5, 250), ("beaker-400ml", 4.1, 11.5, 400)):
    META[_id] = dict(pivot="centre of the base (y = 0 stands on the bench)", axes=f"Y up, pouring spout towards +X; outer diameter {2 * _R * 10:.0f} mm, height {_H * 10:.0f} mm, 1 unit = 1 cm",
                     units="1 = 1 cm", tintable=False, capacityMl=_cap, parts=["glass", "inner"])
TEXTURE_SIZES.update({"beaker-100ml": 2048, "beaker-250ml": 2048, "beaker-400ml": 2048})


# ------------------------------------------------------------------------------------------------ erlenmeyer
def erlenmeyer(q):
    s = lambda k, lo=1: res(k, q, lo)
    R, rn, H = 4.25, 1.55, 14.0
    o = Prof(0, 0, e=0.8)
    o.line(R - 0.7, 0, s(3), e=0.8).cut()
    o.arc(R - 0.7, 0.7, 0.7, -90, 0, s(5, 2), e=0.5)
    o.line(2.35, 9.0, s(9, 2), e=0.0).cut()
    # smooth conical shoulder into the neck (quadratic bezier)
    p0, p1, p2 = np.array([2.35, 9.0]), np.array([rn, 10.3]), np.array([rn, 11.4])
    pts = []
    for k in range(1, s(6, 2) + 1):
        t = k / s(6, 2)
        pts.append(tuple((1 - t) ** 2 * p0 + 2 * t * (1 - t) * p1 + t * t * p2))
    o.poly(pts, e=0.0)
    o.line(rn, H - 0.4, s(4), e=0.0).cut()
    o.line(rn + 0.16, H, s(2), e=0.5)
    return _vessel("erlenmeyer-250ml", q, o, 0.18, vols=[50, 100, 150, 200], major_every=2, n=60, tickphi=-1.25, streak=-2.7,
                   patch=(-1.95, 0.36, 2.0, 4.6), tl=0.9)


META["erlenmeyer-250ml"] = dict(pivot="centre of the base on y = 0", axes="Y up; base diameter 85 mm, neck 31 mm, height 140 mm, 1 unit = 1 cm; accepts a stopper or balloon on the neck (neck top y = 14)",
                                units="1 = 1 cm", tintable=False, capacityMl=250, parts=["glass", "inner"])
TEXTURE_SIZES["erlenmeyer-250ml"] = 2048


# ------------------------------------------------------------------------------------------------ test tube
def test_tube(q):
    s = lambda k, lo=1: res(k, q, lo)
    R, H = 0.8, 15.0
    o = Prof(0, 0, e=0.7)
    o.arc(0, R, R, -90, 0, s(8, 3), e=0.4).cut()
    o.line(R, H - 0.3, s(10, 2), e=0.0).cut()
    o.line(R + 0.1, H, s(2), e=0.5)
    return _vessel("test-tube", q, o, 0.1, fill=11.5, n=40, tickphi=-1.25, streak=-2.7, lip=3)


META["test-tube"] = dict(pivot="centre of the round bottom tip on y = 0 (it stands in the rack with y = 0 at the rack hole bottom)", axes="Y up; outer diameter 16 mm, length 150 mm, 1 unit = 1 cm; liquid mesh `inner` up to y = 11.5",
                         units="1 = 1 cm", tintable=False, capacityMl=20, parts=["glass", "inner"])
TEXTURE_SIZES["test-tube"] = 1024


# ------------------------------------------------------------------------------------------------ graduated cylinder
def graduated_cylinder(q):
    s = lambda k, lo=1: res(k, q, lo)
    R, H, y0 = 1.45, 25.0, 1.4
    o = Prof(0, y0, e=0.6)
    o.line(R - 0.25, y0, s(2), e=0.6).cut()
    o.arc(R - 0.25, y0 + 0.25, 0.25, -90, 0, s(3, 2), e=0.3)
    o.line(R, H - 0.4, s(14, 3), e=0.0).cut()
    o.line(R + 0.1, H, s(2), e=0.5)
    pr, inn, pts = wall_loop(o, 0.14, lip_n=res(4, q, 2))
    ticks_v = np.arange(2, 101, 2)
    ys = volume_ticks(inn, inn[0, 1], ticks_v)
    ticks = [(y, int(v) % 10 == 0) for y, v in zip(ys, ticks_v)]
    na = res(44, q, 10)
    surf, vp, e = lathe(pr, na)
    spout(surf[0], H, span=1.0, amount=0.3, width_deg=22.0)
    spec = dict(streak=-2.7, tickphi=-1.25, tl=0.8, ticks=ticks, tw=0.02)
    # hexagon-ish round foot (solid glass, 6 gentle lobes)
    f = Prof(0, 0, e=0.6)
    f.line(2.7, 0, res(4, q, 2), e=0.7).cut()
    f.arc(2.7, 0.3, 0.3, -90, 0, res(3, q, 2), e=0.5)
    f.line(2.45, 0.7, 1, e=0.3)
    f.line(1.55, 1.9, res(4, q, 2), e=0.1).cut()
    f.line(0, 1.9, res(3, q, 2), e=0.1)
    fs, fvp, fe = lathe(f, res(48, q, 10))
    V = fs[0]
    ang = np.arctan2(-V[:, 2], V[:, 0])
    rr = np.hypot(V[:, 0], V[:, 2])
    k = 1 + 0.035 * np.cos(6 * ang) * np.clip((rr - 1.4) / 1.3, 0, 1)
    V[:, 0] *= k
    V[:, 2] *= k
    ls, _, le = liquid_mesh(inn, ys[-1], res(36, q, 8))
    setmeta("graduated-cylinder-100ml", q, liquid=dict(mesh="inner", axis="Y", yMin=round(float(inn[0, 1]) + 0.03, 3), yMax=round(float(ys[-1]), 3), note="cavity volume up to the 100 mL mark"))
    return [glass_part("graduated-cylinder-100ml", "glass", surf, e, spec), glass_part("graduated-cylinder-100ml", "foot", fs, fe, dict(streak=-2.7)),
            glass_part("graduated-cylinder-100ml", "inner", ls, le, None, liquid=True)]


META["graduated-cylinder-100ml"] = dict(pivot="centre of the foot on y = 0", axes="Y up, spout towards +X; outer diameter 29 mm, height 250 mm, 1 unit = 1 cm; 2 mL ticks, longer every 10 mL",
                                        units="1 = 1 cm", tintable=False, capacityMl=100, parts=["glass", "foot", "inner"])
TEXTURE_SIZES["graduated-cylinder-100ml"] = 1024


# ------------------------------------------------------------------------------------------------ pipette, burette
def dropper_pipette(q):
    s = lambda k, lo=1: res(k, q, lo)
    o = Prof(0.13, 0.0, e=0.6)
    o.line(0.13, 0.6, s(2), e=0.2)
    o.line(0.36, 5.6, s(5, 2), e=0.0)
    o.line(0.36, 13.6, s(8, 2), e=0.0).cut()
    o.line(0.42, 14.0, 1, e=0.5)
    pr, inn, pts = wall_loop(o, 0.06, lip_n=res(3, q, 2), pole=False)
    gs, _, e = lathe(pr, res(24, q, 8), closed=True)
    ls, _, le = liquid_mesh(inn[inn[:, 1] > 0.05], 6.2, res(18, q, 6), t_extra=0.0)
    # rubber teat
    t = Prof(0.0, 13.4)
    t.line(0.55, 13.4, 1)
    t.line(0.62, 14.6, s(3, 1))
    t.line(0.45, 15.2, s(2, 1))
    t.poly([(0.62, 15.9), (0.95, 17.0), (1.05, 18.4), (0.85, 19.7)])
    t.arc(0.0, 19.7, 0.85, 0, 90, s(5, 2))
    ts, _, _ = lathe(t, res(28, q, 8))
    setmeta("dropper-pipette", q, liquid=dict(mesh="inner", axis="Y", yMin=0.1, yMax=6.2, note="liquid column in the tip, y = 0 is the tip"))
    return [glass_part("dropper-pipette", "glass", gs, e, dict(streak=-2.7)), glass_part("dropper-pipette", "inner", ls, le, None, liquid=True),
            clay("teat", ts, "#c8483c", tint=(0.6, 0.35, 0.4))]


META["dropper-pipette"] = dict(pivot="the glass tip on y = 0 (the teat points up)", axes="Y up, total height 197 mm, 1 unit = 1 cm", units="1 = 1 cm", tintable=True, tintParts=["teat"],
                               parts=["glass", "inner", "teat"])
TEXTURE_SIZES["dropper-pipette"] = 512


def burette(q):
    s = lambda k, lo=1: res(k, q, lo)
    o = Prof(0.2, 0.0, e=0.5)
    o.line(0.2, 6.0, s(3), e=0.0)
    o.line(0.32, 7.6, s(2), e=0.0)
    o.line(0.65, 12.0, s(4, 2), e=0.0)
    o.line(0.65, 51.4, s(16, 4), e=0.0).cut()
    o.line(0.72, 52.0, 1, e=0.5)
    pr, inn, pts = wall_loop(o, 0.08, lip_n=res(3, q, 2), pole=False)
    ticks_v = np.arange(0.5, 25.01, 0.5)
    area = np.pi * (0.65 - 0.08) ** 2
    y_zero = 48.0
    ticks = [(y_zero - v / area, abs(v - round(v)) < 1e-6) for v in ticks_v]
    gs, _, e = lathe(pr, res(28, q, 8), closed=True)
    ls, _, le = liquid_mesh(inn[inn[:, 1] > 8.0], 50.0, res(20, q, 6), t_extra=0.02)
    # PTFE / glass stopcock: barrel across the tube + lever handle
    barrel = geo.xf(cyl(0.5, 2.0, res(14, q, 6), bevel=0.12, y0=-1.0), 1.0, lc.rot((1, 0, 0), 90), (0, 7.0, 0))
    lever = geo.xf(cyl(0.18, 2.4, res(10, q, 5), bevel=0.06, y0=0.0), 1.0, lc.rot((1, 0, 0), 90), (0, 7.0, 1.0))
    knob = lc.sph(0.38, res(8, q, 3), (0, 7.0, 3.3), (1, 1, 0.5))
    spec = dict(streak=-2.7, tickphi=-1.57, tl=0.5, ticks=ticks, tw=0.02, tickcol=(0.12, 0.2, 0.45))
    setmeta("burette", q, liquid=dict(mesh="inner", axis="Y", yMin=8.0, yMax=50.0, note="cavity above the stopcock; zero mark at y = 48"), stopcock=dict(y=7.0, handleAxis="Z"))
    return [glass_part("burette", "glass", gs, e, spec), glass_part("burette", "inner", ls, le, None, liquid=True),
            clay("stopcock", geo.merge(barrel, lever, knob), "#3d7fd0", tint=(0.5, 0.5, 0.75))]


META["burette"] = dict(pivot="the tip on y = 0 (the stopcock sits at y = 7)", axes="Y up, tube outer diameter 13 mm, length 520 mm, 25 mL scale: zero mark at y = 48 (ticks every 0.5 mL, longer every 1 mL, running down); stopcock lever along +Z; clamp the tube around y = 38",
                       units="1 = 1 cm", tintable=True, tintParts=["stopcock"], capacityMl=25, parts=["glass", "inner", "stopcock"])
TEXTURE_SIZES["burette"] = 1024


# ------------------------------------------------------------------------------------------------ funnel, watch glass
def funnel(q):
    s = lambda k, lo=1: res(k, q, lo)
    o = Prof(0.45, 0.0, e=0.6)
    o.line(0.45, 6.2, s(5, 2), e=0.0)
    o.line(0.9, 7.2, s(2), e=0.0)
    o.line(3.7, 13.0, s(8, 3), e=0.0).cut()
    o.line(3.8, 13.3, 1, e=0.5)
    pr, inn, pts = wall_loop(o, 0.12, lip_n=res(3, q, 2), pole=False)
    gs, _, e = lathe(pr, res(48, q, 10), closed=True)
    META.setdefault("funnel", {})
    return [glass_part("funnel", "glass", gs, e, dict(streak=-2.7))]


META["funnel"] = dict(pivot="centre of the stem tip on y = 0", axes="Y up, cone diameter 76 mm, stem 9 mm x 62 mm, total 133 mm; the filter-paper-cone sits inside (its tip at y ~ 7.2)",
                      units="1 = 1 cm", tintable=False, parts=["glass"])
TEXTURE_SIZES["funnel"] = 1024


def watch_glass(q):
    Rs, Rr = 9.0, 3.6
    h = Rs - np.sqrt(Rs * Rs - Rr * Rr)
    o = Prof(0, 0, e=0.3)
    ks = np.linspace(0, 1, res(20, q, 3) + 1)[1:]
    o.poly([(Rr * k, Rs - np.sqrt(Rs * Rs - (Rr * k) ** 2)) for k in ks], e=0.1)
    pr, inn, pts = wall_loop(o, 0.1, lip_n=res(3, q, 2))
    gs, _, e = lathe(pr, res(80, q, 12))
    return [glass_part("watch-glass", "glass", gs, e, dict(streak=-2.7))]


META["watch-glass"] = dict(pivot="centre of the convex underside on y = 0", axes="Y up, diameter 72 mm, concave side up, rim height ~8 mm; lies on a beaker rim or the bench", units="1 = 1 cm",
                           tintable=False, parts=["glass"])
TEXTURE_SIZES["watch-glass"] = 1024


def thermometer(q):
    s = lambda k, lo=1: res(k, q, lo)
    r = 0.3
    o = Prof(0, 0.0, e=0.6)
    o.arc(0, 0.5, 0.5, -90, 0, s(7, 3), e=0.3)
    o.poly([(0.42, 1.2), (r, 2.2)], e=0.0).cut()
    o.line(r, 22.6, s(30, 3), e=0.0).cut()
    o.arc(0.0, 22.6, r, 0, 90, s(5, 2), e=0.4)
    gs, _, e = lathe(o, res(40, q, 8))
    ticks = []
    for k in range(0, 61):
        temp = -10 + 2 * k
        ticks.append((3.2 + (temp + 10) / 120.0 * 16.8, temp % 10 == 0))
    spec = dict(streak=-2.7, tickphi=-1.57, tl=0.28, ticks=ticks, tw=0.016, tickcol=(0.55, 0.12, 0.12))
    col = cyl(0.075, 19.4, res(12, q, 5), rings=res(40, q, 3), y0=0.5, bevel=0.03)
    bulb = lc.sph(0.37, res(8, q, 3), (0, 0.5, 0))
    setmeta("thermometer", q, column=dict(mesh="column", axis="Y", yMin=0.5, yMax=19.9, note="red column: scale along Y; 110 C at y = 20, -10 C at y = 3.2"))
    return [glass_part("thermometer", "glass", gs, e, spec), clay("column", geo.merge(col, bulb), "#d3302a", tint=(0.55, 0.3, 0.3), ao=None)]


META["thermometer"] = dict(pivot="centre of the bulb bottom on y = 0", axes="Y up, length 232 mm, -10..110 C scale between y = 3.2 and y = 20 (painted ticks every 2 C, longer every 10 C); the mesh `column` is the red liquid thread (scale it in Y)",
                           units="1 = 1 cm", tintable=False, parts=["glass", "column"])
TEXTURE_SIZES["thermometer"] = 512


def glass_rod(q):
    r, L = 0.32, 25.0
    pr = Prof(0, -L / 2)
    pr.line(r - 0.2, -L / 2, 1, e=0.5).arc(r - 0.2, -L / 2 + 0.2, 0.2, -90, 0, res(3, q, 2), e=0.3).cut()
    pr.line(r, L / 2 - 0.2, res(60, q, 4), e=0.0).cut()
    pr.arc(r - 0.2, L / 2 - 0.2, 0.2, 0, 90, res(3, q, 2), e=0.3).line(0, L / 2, 1)
    gs, _, e = lathe(pr, res(36, q, 8))
    gs = geo.xf(gs, 1.0, lc.rot((0, 0, 1), 90))
    return [glass_part("glass-rod", "glass", gs, e, dict(streak=-2.7))]


META["glass-rod"] = dict(pivot="centre of the rod", axes="X along the rod (length 250 mm, diameter 6.4 mm)", units="1 = 1 cm", tintable=False, parts=["glass"])
TEXTURE_SIZES["glass-rod"] = 512


BUILDERS = {"beaker-100ml": beaker_100, "beaker-250ml": beaker_250, "beaker-400ml": beaker_400, "erlenmeyer-250ml": erlenmeyer, "test-tube": test_tube,
            "graduated-cylinder-100ml": graduated_cylinder, "dropper-pipette": dropper_pipette, "burette": burette, "funnel": funnel, "watch-glass": watch_glass,
            "thermometer": thermometer, "glass-rod": glass_rod}

lc.LAB.update(BUILDERS)
