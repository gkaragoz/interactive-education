"""Part container, colour helpers and BVH ambient occlusion (needs mathutils for AO only)."""
import math
import zlib
from dataclasses import dataclass, field

import numpy as np

import geo
from geo import normals
import noise


@dataclass
class Part:
    name: str                       # <part>, the mesh becomes <id>-<part>
    V: np.ndarray
    F: np.ndarray
    mat: str = "clay"               # clay | gel
    base: np.ndarray = None         # (N,3) sRGB base colour before shading
    tint: tuple = (0.55, 0.45, 0.6) # shadow colour multiplier (sRGB), shadows are hue-shifted not just darkened
    alpha: object = 1.0             # scalar or (N,) vertex alpha (gel)
    col: np.ndarray = None          # (N,4) linear RGBA, set by finalize
    lit: np.ndarray = None          # (N,3) sRGB colour before AO, set by finalize (texture baking input)
    aoval: np.ndarray = None        # (N,) baked vertex AO, set by finalize
    aux: np.ndarray = None          # (N,) optional per-vertex scalar for texture motifs (edge, ring parameter...)
    aux2: np.ndarray = None         # (N,) second optional scalar (cell id ...)
    tex: dict = field(default_factory=dict)   # texture painter hints: flow axis, scales, relief
    proj: object = None             # axis index: use projection charts (flat slab parts) instead of the lattice charts
    fuv: np.ndarray = None          # (M,3,2) chart coordinates per face corner (from the geo registry)
    cid: np.ndarray = None          # (M,) chart id per face

    def __post_init__(self):
        c = geo.chart_of(self.F)
        if c is not None:
            self.fuv, self.cid = c
    occ: bool = True                # casts occlusion onto other parts
    ao: tuple = (0.75, 1.2, 24)     # strength, ray distance, rays (None to skip AO)
    hollow: bool = False            # contains one inward-facing (negative volume) component
    speck: float = 0.07             # painterly cell-speckle strength (brightness/warmth jitter per cell)
    form: float = 0.28              # painterly form light: brighter on up-facing, deeper on down-facing surfaces


# ---------------------------------------------------------------------------------------------- colour
def hexc(h):
    """'#RRGGBB' (sRGB) -> sRGB float array."""
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)])


def to_linear(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def ramp(t, stops):
    """Piecewise-linear gradient in sRGB. stops = [(pos, '#hex'), ...] ascending; t array (N,) -> sRGB (N,3)."""
    t = np.clip(np.asarray(t, dtype=np.float64), stops[0][0], stops[-1][0])
    pos = np.array([s[0] for s in stops])
    cols = np.stack([hexc(s[1]) for s in stops])
    out = np.stack([np.interp(t, pos, cols[:, k]) for k in range(3)], axis=1)
    return out


def mix(a, b, t):
    t = np.asarray(t)[..., None] if np.ndim(t) else t
    return a * (1 - t) + b * t


def shadow_tint(col, ao, tint, power=1.0):
    """Darken by AO but push shadows towards `tint` (sRGB multiplier, painterly saturated shadows)."""
    k = np.asarray(tint, dtype=np.float64)
    a = (np.clip(ao, 0, 1) ** power)[:, None]
    return col * (k + (1 - k) * a)


def trunc_mantissa(x, keep=8):
    """Round float32 values to `keep` mantissa bits: the low bytes become zero and meshopt compresses them to ~nothing
    (relative precision 0.4 %, invisible in a colour)."""
    u = np.asarray(x, dtype=np.float32).view(np.uint32)
    drop = 23 - keep
    u = (u + np.uint32(1 << (drop - 1))) & np.uint32((0xFFFFFFFF >> drop) << drop)
    return u.view(np.float32).astype(np.float64)


def finish(srgb, alpha=1.0):
    """sRGB (N,3) -> linear RGBA (N,4)."""
    lin = trunc_mantissa(to_linear(np.clip(srgb, 0, 1)))
    a = trunc_mantissa(np.broadcast_to(np.asarray(alpha, dtype=np.float64), (len(lin),))[:, None])
    return np.concatenate([lin, a], axis=1)


# ---------------------------------------------------------------------------------------------- AO
def _dirs(n):
    """Stratified cosine-weighted hemisphere directions about +Z (n, 3)."""
    rings = max(int(math.sqrt(n / 2)), 1)
    per = max(n // rings, 1)
    out = []
    for i in range(rings):
        for j in range(per):
            u = (i + 0.5) / rings
            phi = 2 * math.pi * (j + 0.5 * (i % 2)) / per
            r = math.sqrt(u)
            out.append((r * math.cos(phi), r * math.sin(phi), math.sqrt(max(1 - u, 0.0))))
    return np.array(out)


def smooth_per_vertex(v, f, a, passes=2):
    e = np.concatenate([f[:, [0, 1]], f[:, [1, 2]], f[:, [2, 0]]])
    e = np.concatenate([e, e[:, ::-1]])
    for _ in range(passes):
        s = np.zeros_like(a)
        c = np.zeros(len(a))
        np.add.at(s, e[:, 0], a[e[:, 1]])
        np.add.at(c, e[:, 0], 1.0)
        a = 0.5 * a + 0.5 * s / np.maximum(c, 1)
    return a


def bake_ao(parts, seed=7):
    """Per-vertex AO (N,) for every part with `ao` set: rays vs the part itself plus all `occ` parts."""
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    rng = np.random.default_rng(seed)
    occluders = [p for p in parts if p.occ]
    result = {}
    for p in parts:
        if p.ao is None:
            continue
        strength, dist, nrays = p.ao
        vs, ps, off = [], [], 0
        for q in {id(x): x for x in ([p] + occluders)}.values():
            vs.append(q.V)
            ps.append(q.F + off)
            off += len(q.V)
        V = np.concatenate(vs)
        F = np.concatenate(ps)
        tree = BVHTree.FromPolygons([tuple(x) for x in V.tolist()], [tuple(x) for x in F.tolist()], epsilon=0.0)
        n = normals(p.V, p.F)
        if not p.hollow:
            pass
        base = _dirs(nrays)
        up = np.where(np.abs(n[:, 2:3]) < 0.9, np.array([[0, 0, 1.0]]), np.array([[1.0, 0, 0]]))
        tx = np.cross(n, up)
        tx /= np.linalg.norm(tx, axis=1, keepdims=True)
        ty = np.cross(n, tx)
        spin = rng.uniform(0, 2 * math.pi, len(n))
        cs, sn = np.cos(spin)[:, None], np.sin(spin)[:, None]
        tx, ty = tx * cs + ty * sn, -tx * sn + ty * cs
        occl = np.zeros(len(n))
        origin = p.V + n * 0.01 * max(dist, 0.5)
        for i in range(len(n)):
            o = Vector(origin[i])
            dirs = base[:, 0:1] * tx[i] + base[:, 1:2] * ty[i] + base[:, 2:3] * n[i]
            h = 0.0
            for d in dirs:
                r = tree.ray_cast(o, Vector(d), dist)
                if r[0] is not None:
                    h += 1.0 - r[3] / dist
            occl[i] = h / len(dirs)
        ao = 1.0 - strength * occl
        result[p.name] = np.clip(smooth_per_vertex(p.V, p.F, ao, 2), 0.0, 1.0)
    return result


def finalize(parts, ao_seed=7):
    """Bake AO and store the linear RGBA vertex colour on every part."""
    aos = bake_ao(parts, ao_seed)
    for p in parts:
        ao = aos.get(p.name, np.ones(len(p.V)))
        ny = normals(p.V, p.F)[:, 1]
        lit = p.base * (1.0 + p.form * (0.55 * ny))[:, None]
        if p.speck:
            size = float(np.ptp(p.V, axis=0).max())
            f1, cell = noise.worley(p.V * (9.0 / max(size, 1e-3)), 3)
            fade = 1.0 - noise.smoothstep(0.3, 0.75, f1)          # blotches fade to neutral at cell borders
            j = (cell - 0.5) * 2 * p.speck * fade
            lit = lit * (1.0 + j)[:, None] + 0.02 * (j / max(p.speck, 1e-6))[:, None] * np.array([1.0, 0.4, -0.6])
            hue = np.stack([noise.fbm(p.V * (2.5 / max(size, 1e-3)), 90 + c, 1.0, 2) for c in range(3)], axis=1)
            lit = lit * (1.0 + 0.75 * p.speck * hue)               # slow per-channel drift = rich hue variation
            hue2 = np.stack([noise.fbm(p.V * (8.0 / max(size, 1e-3)), 120 + c, 1.0, 2) for c in range(3)], axis=1)
            lit = lit * (1.0 + 0.5 * p.speck * hue2)               # second, finer scale
            ang = (zlib.crc32(p.name.encode()) % 628) / 100.0
            dirv = np.array([np.cos(ang), 0.4, np.sin(ang)])
            ph = p.V @ dirv * (7.0 / max(size, 1e-3)) + 2.0 * noise.fbm(p.V * (3.0 / max(size, 1e-3)), 140, 1.0, 2)
            lit = lit * (1.0 + 0.25 * p.speck * np.sin(2 * np.pi * ph))[:, None]   # faint painted stripes
            lit = lit + 0.05 * np.clip(ny, 0, 1)[:, None] * np.array([1.0, 0.55, 0.25]) * lit.mean(1, keepdims=True)
        p.lit = np.clip(lit, 0, 1)
        p.aoval = ao
        p.col = finish(shadow_tint(lit, ao, p.tint), p.alpha)
    return parts
