"""Shared helpers of the virtual chemistry lab assets (SET=lab): profile lathe, glass vessels with a matching liquid volume mesh,
painted-glass motif (rim lift, streak highlights, graduation ticks), small clay motifs (wood, tiles, labels, gauze). numpy only.
World unit = 1 cm. Vessels stand on y = 0, axis Y."""
import math

import numpy as np

import geo
import texmotifs
from paint import Part
from shapes import res, part
from texnoise import fbm, sstep, vnoise

GLASS_COL = np.array([0.80, 0.91, 0.95])
LAB = set()          # asset ids of the lab set: they get a calm neutral painter default (no colourful dabs on white / steel objects)
LAB_DEFAULT = dict(jit=0.02, dab=0.05, dabc=(1, 1, 1), under=(1, 1, 1), warm=0.2, strokeval=0.03, dry=0.05, contour=0.35, dark=(0.68, 0.68, 0.74), rough=0.5)
_orig_hints = texmotifs.hints


def _lab_hints(asset, part, L):
    h = _orig_hints(asset, part, L)
    return dict(LAB_DEFAULT, **h) if asset in LAB else h


texmotifs.hints = _lab_hints


def rgb(h):
    return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])


def solid(h, n):
    return np.tile(rgb(h), (n, 1))


# ------------------------------------------------------------------------------------------------ profiles + lathe
class Prof:
    """Polyline in the (r, y) half plane with a per-point edge weight `e` and optional section breaks (separate texture charts)."""

    def __init__(self, r=0.0, y=0.0, e=0.0):
        self.p = [(float(r), float(y))]
        self.e = [e]
        self.brk = []
        self.ec = e

    def cut(self):
        self.brk.append(len(self.p) - 1)
        return self

    def line(self, r, y, n=1, e=None):
        e = self.ec if e is None else e
        r0, y0 = self.p[-1]
        for k in range(1, n + 1):
            t = k / n
            self.p.append((r0 + (r - r0) * t, y0 + (y - y0) * t))
            self.e.append(e)
        return self

    def arc(self, cr, cy, rad, a0, a1, n, e=None):
        """Arc around (cr, cy) from angle a0 to a1 (degrees, 0 = +r, 90 = +y); the start point is the current point."""
        e = self.ec if e is None else e
        for k in range(1, n + 1):
            a = math.radians(a0 + (a1 - a0) * k / n)
            self.p.append((cr + rad * math.cos(a), cy + rad * math.sin(a)))
            self.e.append(e)
        return self

    def poly(self, pts, e=None):
        e = self.ec if e is None else e
        for r, y in pts:
            self.p.append((float(r), float(y)))
            self.e.append(e)
        return self

    def arrays(self):
        return np.array(self.p), np.array(self.e, float)


def lathe(pr, n, closed=False):
    """Revolve a profile about Y. A profile point with r ~ 0 is a pole (one vertex); closed=True joins the last point to the first
    (ring / hollow solids). Returns ((V, F), vp, e) with vp = profile index and e = edge weight per vertex. Outward, charts registered."""
    pts, ed = pr.arrays()
    m = len(pts)
    ring = []
    V, vp, ev = [], [], []
    for k in range(m):
        r, y = pts[k]
        if r < 1e-7:
            ring.append(np.array([len(V)] * (n + 1)))
            V.append([0.0, y, 0.0])
            vp.append(k)
            ev.append(ed[k])
        else:
            base = len(V)
            for i in range(n):
                a = 2 * math.pi * i / n
                V.append([r * math.cos(a), y, -r * math.sin(a)])
                vp.append(k)
                ev.append(ed[k])
            ring.append(np.array([base + (i % n) for i in range(n + 1)]))
    s = np.zeros(m)
    for k in range(1, m):
        s[k] = s[k - 1] + float(np.hypot(*(pts[k] - pts[k - 1])))
    brk = np.array(pr.brk, dtype=int)
    F, UV, C = [], [], []
    nseg = m if closed else m - 1
    for k in range(nseg):
        k2 = (k + 1) % m
        cid = int(np.sum(brk <= k))
        s0 = s[k]
        s1 = s[k] + float(np.hypot(*(pts[k2] - pts[k]))) if k2 == 0 else s[k2]
        pa, pb = pts[k][0] < 1e-7, pts[k2][0] < 1e-7
        for i in range(n):
            a0, a1, b0, b1 = ring[k][i], ring[k][i + 1], ring[k2][i], ring[k2][i + 1]
            ua, ub = (i + 0.5, i + 0.5)
            if pa and pb:
                continue
            if pa:
                F.append((a0, b1, b0))
                UV.append([(ua, s0), (i + 1, s1), (i, s1)])
                C.append(cid)
            elif pb:
                F.append((a0, a1, b0))
                UV.append([(i, s0), (i + 1, s0), (ub, s1)])
                C.append(cid)
            else:
                F.append((a0, a1, b1))
                UV.append([(i, s0), (i + 1, s0), (i + 1, s1)])
                C.append(cid)
                F.append((a0, b1, b0))
                UV.append([(i, s0), (i + 1, s1), (i, s1)])
                C.append(cid)
    F = np.array(F, dtype=np.int64)
    V = np.array(V, dtype=np.float64)
    geo.reg(F, np.array(UV, dtype=np.float64), np.array(C))
    if geo.signed_volume(V, F) < 0:
        F = geo.flipf(F)
    return (V, F), np.array(vp), np.array(ev)


def offset_pts(pts, t, pole=True):
    """Offset a polyline (m,2) to the inside by t (the profile runs up the outside: outward = right of the travel direction)."""
    pts = np.asarray(pts, float)
    d = np.gradient(pts, axis=0)
    tg = d / np.maximum(np.linalg.norm(d, axis=1, keepdims=True), 1e-9)
    out = np.stack([tg[:, 1], -tg[:, 0]], 1)
    if pole:
        out[0] = (0.0, -1.0)
    return pts - out * t


def _rim(pr, a, b, n, upward=True):
    """Half-circle bead joining outer point a to inner point b (bulging towards +y when upward, else -y)."""
    mid = (a + b) / 2
    rad = float(np.linalg.norm(a - b)) / 2
    ang0 = math.degrees(math.atan2(a[1] - mid[1], a[0] - mid[0]))
    sweep = (180.0 if ang0 < 90 else -180.0) if upward else (-180.0 if ang0 < 90 else 180.0)
    for k in range(1, n + 1):
        ang = math.radians(ang0 + sweep * k / (n + 1))
        pr.p.append((mid[0] + rad * math.cos(ang), mid[1] + rad * math.sin(ang)))
        pr.e.append(1.0)


def wall_loop(outer, t, lip_n=5, t_bottom=None, pole=True):
    """Closed hollow wall profile: `outer` (Prof, bottom -> rim top, outside) + rim bead + inner wall back down.
    pole=True: starts and ends on the axis (vessels); pole=False: open at both ends (tubes, funnels) and closed=True must be used.
    Returns (Prof loop, inner points (m,2) offset by t, outer points)."""
    pts, ed = outer.arrays()
    inn = offset_pts(pts, t, pole)
    if t_bottom is not None:
        inn[0, 1] = t_bottom
    pr = Prof(*pts[0], e=ed[0])
    pr.p, pr.e, pr.brk = [tuple(x) for x in pts], list(ed), list(outer.brk)
    pr.cut()
    _rim(pr, pts[-1], inn[-1], lip_n, True)
    for k in range(len(inn) - 1, -1, -1):
        pr.p.append(tuple(inn[k]))
        pr.e.append(ed[k])
    pr.brk.append(len(pts) + lip_n)
    if not pole:
        pr.cut()
        _rim(pr, inn[0], pts[0], lip_n, False)
    return pr, inn, pts


def volume_ticks(inn, y0, volumes):
    """y of the liquid level for cumulative volumes (cm^3) in a vessel whose cavity profile is `inn` (r, y), starting at y0."""
    ys = np.linspace(inn[0, 1], inn[:, 1].max(), 400)
    r = np.interp(ys, inn[:, 1], inn[:, 0]) if np.all(np.diff(inn[:, 1]) >= 0) else np.array([np.max(inn[inn[:, 1] <= y, 0]) if (inn[:, 1] <= y).any() else 0 for y in ys])
    vol = np.concatenate([[0], np.cumsum(np.pi * 0.25 * (r[1:] + r[:-1]) ** 2 * np.diff(ys))])
    return [float(np.interp(v, vol, ys)) for v in volumes]


def liquid_mesh(inn, y_fill, n, t_extra=0.03, k=14):
    """Closed liquid-volume mesh: the cavity up to y_fill, slightly smaller than the glass interior (flat closed top)."""
    pts = offset_pts(inn, t_extra) if t_extra else np.asarray(inn, float)
    pts[0, 0] = 0.0
    pts[0, 1] = inn[0, 1] + t_extra
    keep = pts[pts[:, 1] <= y_fill]
    keep = keep[np.r_[True, np.diff(keep[:, 1]) >= -1e-9]]
    if len(keep) < 3:
        keep = pts[:3]
    last = keep[-1]
    if last[1] < y_fill - 1e-6:
        j = int(np.searchsorted(pts[:, 1], y_fill))
        j = min(max(j, 1), len(pts) - 1)
        a, b = pts[j - 1], pts[j]
        tt = (y_fill - a[1]) / max(b[1] - a[1], 1e-9)
        keep = np.vstack([keep, a + (b - a) * np.clip(tt, 0, 1)])
    pr = Prof(*keep[0])
    pr.p = [tuple(x) for x in keep]
    pr.e = [0.0] * len(pr.p)
    pr.cut()
    pr.p.append((0.0, float(keep[-1][1])))
    pr.e.append(0.0)
    return lathe(pr, n)


def spout(V, y_top, span, amount, width_deg=26.0, dip=0.35, direction=0.0):
    """Pull the upper wall outwards into a pouring lip around azimuth `direction` (degrees from +X); V (N,3) modified in place."""
    th = np.arctan2(-V[:, 2], V[:, 0])
    dth = np.abs((th - math.radians(direction) + math.pi) % (2 * math.pi) - math.pi)
    g = np.exp(-(dth / math.radians(width_deg)) ** 2)
    h = np.clip((V[:, 1] - (y_top - span)) / span, 0, 1)
    h = h * h * (3 - 2 * h)
    w = g * h
    r = np.hypot(V[:, 0], V[:, 2])
    ux, uz = V[:, 0] / np.maximum(r, 1e-9), V[:, 2] / np.maximum(r, 1e-9)
    V[:, 0] += ux * amount * w
    V[:, 2] += uz * amount * w
    V[:, 1] -= amount * dip * w * w
    return V


def bc(a):
    """G-buffer (Blender, Z up: (x, -z, y)) -> builder coordinates (Y up)."""
    return np.stack([a[:, 0], a[:, 2], -a[:, 1]], 1)


# ------------------------------------------------------------------------------------------------ glass parts
GLASS = {}        # (asset, part) -> spec used by the glass motif


def glass_part(asset, name, surf, e, spec=None, liquid=False, hollow=False):
    """Gel part for a glass wall (or, with liquid=True, the matching liquid-volume mesh). e = edge weight per vertex (rim / foot lift)."""
    V, F = surf
    n = len(V)
    if liquid:
        base = solid("#bfe3f2", n)
        alpha = np.full(n, 0.34)
    else:
        base = np.tile(GLASS_COL, (n, 1))
        alpha = 0.16 + 0.34 * e
    p = part(name, surf, base, mat="gel", alpha=alpha, occ=False, ao=None, speck=0.0, form=0.05, tint=(0.8, 0.9, 0.95))
    p.aux = e
    p.hollow = hollow
    GLASS[(asset, name)] = dict(spec or {}, liquid=liquid)
    texmotifs.CUSTOM[(asset, name)] = _make_motif(asset, name)
    return p


def _make_motif(asset, name):
    def fn(S, r, hint, gel):
        spec = GLASS.get((asset, name), {})
        P, N = bc(S["P"]), bc(S["N"])
        edge = S["aux"] if S.get("aux") is not None else np.zeros(len(P))
        cs = spec.get("centres") or [(0.0, 0.0)]                       # vessels built from several tubes: local cylindrical coordinates per tube axis
        cen = np.array([[c[0], c[1]] for c in cs], float)
        ci = (((P[:, None, [0, 2]] - cen[None]) ** 2).sum(-1)).argmin(1) if len(cs) > 1 else np.zeros(len(P), int)
        lx, lz = P[:, 0] - cen[ci, 0], P[:, 2] - cen[ci, 1]
        rr = np.hypot(lx, lz)
        rad = np.stack([lx, np.zeros(len(P)), lz], 1) / np.maximum(rr, 1e-9)[:, None]
        nr = (N * rad).sum(1)
        phi = np.arctan2(-lz, lx)
        tmask = np.isin(ci, spec.get("tick_centres", list(range(len(cs))))).astype(np.float32)
        col = np.tile(GLASS_COL.astype(np.float32), (len(P), 1))
        if spec.get("liquid"):
            col = np.tile(np.array([0.72, 0.88, 0.95], np.float32), (len(P), 1))
            col = col * (1 - 0.08 * sstep(0.2, 0.9, 0.5 + 0.5 * fbm(P * 1.1, 5, 2)))[:, None]
            r["alpha"] = np.clip(S["alpha"] * (1 + 0.1 * fbm(P * 0.8, 3, 2)), 0.05, 1)
            r["h"] = r["h"] * 0.0
            r["rough"] = np.full_like(r["rough"], 0.08)
            r["col"] = col
            return True
        alpha = S["alpha"].astype(np.float32).copy()
        sp = spec.get("tint")
        if sp is not None:
            col = col * np.array(sp, np.float32)
        wallmask = sstep(0.55, 0.9, np.abs(nr))
        # painted window highlights (an illustrator's glass): a broad and a thin vertical streak + a faint counter reflection
        h0 = spec.get("streak", 2.3)
        for c, w, a in ((h0, 0.10, 0.55), (h0 + 0.30, 0.028, 0.65), (h0 - 3.0, 0.06, 0.28)):
            d = np.abs((phi - c + math.pi) % (2 * math.pi) - math.pi)
            s = sstep(w * 1.4, w * 0.5, d) * wallmask
            if spec.get("y1"):
                s = s * sstep(spec["y0"] - 0.2, spec["y0"] + 0.4, P[:, 1]) * sstep(spec["y1"] + 0.1, spec["y1"] - 0.5, P[:, 1])
            col = col * (1 - s)[:, None] + s[:, None]
            alpha = np.maximum(alpha, a * s)
        # frosted writing patch + graduation ticks (outer wall only: the outward normal)
        outer = sstep(0.6, 0.9, nr)
        tick_outer = outer * tmask
        pc = spec.get("patch")
        if pc is not None:
            dphi = np.abs((phi - pc[0] + math.pi) % (2 * math.pi) - math.pi)
            inbox = sstep(pc[1], pc[1] * 0.8, dphi) * sstep(pc[2], pc[2] + 0.12, P[:, 1]) * sstep(pc[3], pc[3] - 0.12, P[:, 1]) * outer
            col = col * (1 - 0.8 * inbox)[:, None] + 0.8 * inbox[:, None]
            alpha = np.maximum(alpha, 0.62 * inbox)
        ticks = spec.get("ticks")
        if ticks:
            pc = spec.get("tickphi", 1.0)
            line_w = spec.get("tw", 0.03)
            tc = np.array(spec.get("tickcol", (0.06, 0.22, 0.48)), np.float32)
            for (ty, major) in ticks:
                ln = (0.75 if major else 0.4) * spec.get("tl", 1.0)
                half = ln / (2.0 * np.maximum(rr, 0.3))
                dphi = np.abs((phi - pc + math.pi) % (2 * math.pi) - math.pi)
                ln_m = sstep(line_w, line_w * 0.35, np.abs(P[:, 1] - ty)) * sstep(half, half * 0.8, dphi) * tick_outer
                if major:
                    ln_m = np.maximum(ln_m, sstep(line_w * 1.5, line_w * 0.6, np.abs(P[:, 1] - ty)) * sstep(half, half * 0.8, dphi) * tick_outer)
                col = col * (1 - ln_m)[:, None] + tc * ln_m[:, None]
                alpha = np.maximum(alpha, 0.92 * ln_m)
                r["h"] = r["h"] - 0.002 * ln_m
        col = col * (1 - 0.05 * sstep(0.2, 0.9, edge))[:, None] + 0.04 * edge[:, None]
        r["alpha"] = np.clip(alpha, 0.04, 1.0)
        r["rough"] = np.full_like(r["rough"], 0.08)
        r["h"] = r["h"] * 0.1
        r["col"] = col
        return True
    return fn


def register_glass(asset, name):
    texmotifs.CUSTOM[(asset, name)] = _make_motif(asset, name)


# ------------------------------------------------------------------------------------------------ clay motifs
def _wood(axis, freq=1.2, dark=0.22, rings=True):
    ax = np.asarray(axis, np.float32)

    def fn(S, r, hint, gel):
        P = bc(S["P"])
        ph = (P @ ax) * np.float32(freq) + 0.45 * fbm(P * np.float32(0.3), 7, 2) + 0.12 * vnoise(P * np.float32(1.5), 9)
        g = 0.5 + 0.5 * np.sin(ph * 6.2831853)
        line = sstep(0.55, 0.95, g)
        fine = 0.5 + 0.5 * vnoise(P * np.float32(14.0) * np.array([1, 0.2, 1], np.float32), 4)
        r["col"] = r["col"] * (1 - dark * 0.6 * line - 0.05 * fine)[:, None]
        r["h"] = r["h"] - 0.0006 * line
        return False
    return fn


def _tiles(size_x, size_y, gap=0.16, depth=0.45):
    def fn(S, r, hint, gel):
        P = bc(S["P"])
        u = (P[:, 0] / size_x) % 1.0
        row = np.floor(P[:, 1] / size_y)
        u = ((P[:, 0] / size_x) + 0.5 * (row % 2)) % 1.0
        v = (P[:, 1] / size_y) % 1.0
        du = np.minimum(u, 1 - u) * size_x
        dv = np.minimum(v, 1 - v) * size_y
        g = sstep(gap * 1.0, gap * 0.4, np.minimum(du, dv))
        front = sstep(0.5, 0.9, bc(S["N"])[:, 2])
        g = g * front
        r["col"] = r["col"] * (1 - depth * g)[:, None] + np.array([0.02, 0.03, 0.04], np.float32) * g[:, None] * 0.0
        r["h"] = r["h"] - 0.0015 * g
        return False
    return fn


def _gauze(freq=2.4):
    def fn(S, r, hint, gel):
        P = bc(S["P"])
        top = sstep(0.6, 0.9, np.abs(bc(S["N"])[:, 1]))
        gx = 0.5 + 0.5 * np.cos(P[:, 0] * freq * 6.2831853)
        gz = 0.5 + 0.5 * np.cos(P[:, 2] * freq * 6.2831853)
        g = np.maximum(sstep(0.7, 0.98, gx), sstep(0.7, 0.98, gz)) * top
        r["col"] = r["col"] * (0.78 + 0.28 * g)[:, None]
        r["h"] = r["h"] + 0.002 * g
        return False
    return fn


def _label(asset=None, band=0.12):
    """Printed label look on a neutral albedo: darker frame lines, a title bar and text-like rows (no readable text: the app tints/labels)."""
    def fn(S, r, hint, gel):
        P, N = bc(S["P"]), bc(S["N"])
        y = P[:, 1]
        y0, y1 = y.min(), y.max()
        t = (y - y0) / max(y1 - y0, 1e-6)
        frame = sstep(0.06, 0.03, np.minimum(t, 1 - t)) - sstep(0.03, 0.015, np.minimum(t, 1 - t))
        bar = sstep(0.60, 0.62, t) * sstep(0.84, 0.82, t)
        rows = (0.5 + 0.5 * np.sin(t * 6.2831853 * 7.0)) * sstep(0.12, 0.16, t) * sstep(0.55, 0.50, t)
        rr = np.hypot(P[:, 0], P[:, 2])
        ph = np.arctan2(-P[:, 2], P[:, 0])
        face = sstep(1.9, 1.5, np.abs((ph - 1.57 + math.pi) % (2 * math.pi) - math.pi))
        r["col"] = r["col"] * (1 - 0.35 * frame - 0.28 * bar * face - 0.12 * sstep(0.6, 0.9, rows) * face)[:, None]
        return False
    return fn


def register(asset, name, fn):
    texmotifs.CUSTOM[(asset, name)] = fn


def neutral_hint(asset, name, **kw):
    texmotifs.HINTS[(asset, name)] = dict(texmotifs.NEUTRAL, w=kw.pop("w", 0.4), relief=kw.pop("relief", 0.02), **kw)


# ------------------------------------------------------------------------------------------------ solids
def rbox(sx, sy, sz, n, centre=(0, 0, 0), power=7.0):
    """Closed rounded box (full extents sx, sy, sz) on a uniform lattice."""
    p, f = geo.cube_sphere(max(int(n), 2), cube=True)
    inf = np.abs(p).max(1)
    pn = (np.abs(p) ** power).sum(1) ** (1.0 / power)
    v = p * (inf / np.maximum(pn, 1e-9))[:, None] * np.array([sx, sy, sz]) / 2 + np.asarray(centre, float)
    return v, f


def cyl(r, h, n, rings=2, y0=0.0, bevel=0.0, r2=None):
    """Closed solid cylinder / cone frustum standing on y0 (lathe). r2 = top radius."""
    r2 = r if r2 is None else r2
    bv = min(bevel, r * 0.45, h * 0.45)
    pr = Prof(0, y0)
    pr.line(r - bv, y0, 1)
    if bv > 0:
        pr.arc(r - bv, y0 + bv, bv, -90, 0, 2)
    pr.line(r2, y0 + h - bv, rings)
    if bv > 0:
        pr.arc(r2 - bv, y0 + h - bv, bv, 0, 90, 2)
    pr.line(0, y0 + h, 1)
    return lathe(pr, n)[0]


def rot(axis, deg):
    return geo.rot_axis(axis, deg)


def sph(r, n, pos=(0, 0, 0), scale=(1, 1, 1)):
    d, f = geo.cube_sphere(max(int(n), 2))
    return d * r * np.asarray(scale, float) + np.asarray(pos, float), f


def clay(name, surf, hexcol, **kw):
    V = surf[0]
    base = solid(hexcol, len(V)) if isinstance(hexcol, str) else np.tile(np.asarray(hexcol, float), (len(V), 1))
    kw.setdefault("ao", (0.7, 0.6, 12))
    kw.setdefault("speck", 0.04)
    kw.setdefault("form", 0.2)
    return part(name, surf, base, **kw)


def merge(*s):
    return geo.merge(*s)
