"""Closed-surface primitives on numpy arrays (no bpy). A surface is a tuple (V (N,3) float64, F (M,3) int64 triangles,
counter-clockwise seen from outside). Everything here returns closed, manifold, outward-oriented components."""
import math

import numpy as np


# ---------------------------------------------------------------------------------------------- chart registry
# Every primitive records, per face corner, its parametric chart coordinates (cube face (a,b) lattice, tube (ring, side)).
# The registry is keyed by the face array identity and survives xf / merge / flipf, so texture charts need no plumbing.
_REG = {}


def reg(f, fuv, cid):
    _REG[id(f)] = (f, fuv, cid)
    return f


def chart_of(f):
    """(fuv (M,3,2), cid (M,)) for a face array built from registered primitives, or None."""
    e = _REG.get(id(f))
    return None if e is None else (e[1], e[2])


def flipf(f):
    """Reverse the winding of a face array (keeps the chart data)."""
    g = f[:, ::-1].copy()
    c = chart_of(f)
    if c is not None:
        reg(g, c[0][:, ::-1].copy(), c[1])
    return g


def merge(*surfs):
    """Concatenate surfaces as disjoint components."""
    vs, fs, off, charts, coff = [], [], 0, [], 0
    for v, f in surfs:
        vs.append(v)
        fs.append(f + off)
        off += len(v)
        c = chart_of(f)
        charts.append(c)
        if c is not None:
            charts[-1] = (c[0], c[1] + coff)
            coff += int(c[1].max()) + 1 if len(c[1]) else 0
    if not vs:
        return np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64)
    out = np.concatenate(fs)
    if all(c is not None for c in charts):
        reg(out, np.concatenate([c[0] for c in charts]), np.concatenate([c[1] for c in charts]))
    return np.concatenate(vs), out


def xf(surf, scale=1.0, rot=None, pos=(0.0, 0.0, 0.0)):
    """scale (scalar or 3-vector), then rotate (3x3), then translate."""
    v, f = surf
    v = v * np.asarray(scale, dtype=np.float64)
    if rot is not None:
        v = v @ np.asarray(rot).T
    return v + np.asarray(pos, dtype=np.float64), f


def rot_axis(axis, deg):
    a = np.asarray(axis, dtype=np.float64)
    a = a / np.linalg.norm(a)
    t = math.radians(deg)
    c, s = math.cos(t), math.sin(t)
    x, y, z = a
    return np.array([[c + x * x * (1 - c), x * y * (1 - c) - z * s, x * z * (1 - c) + y * s],
                     [y * x * (1 - c) + z * s, c + y * y * (1 - c), y * z * (1 - c) - x * s],
                     [z * x * (1 - c) - y * s, z * y * (1 - c) + x * s, c + z * z * (1 - c)]])


def align(src, dst):
    """Rotation matrix taking unit vector src onto dst."""
    a = np.asarray(src, dtype=np.float64)
    b = np.asarray(dst, dtype=np.float64)
    a, b = a / np.linalg.norm(a), b / np.linalg.norm(b)
    v = np.cross(a, b)
    c = float(a @ b)
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3) if c > 0 else rot_axis(_perp(a), 180)
    k = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + k + k @ k * (1 / (1 + c))


def _perp(a):
    a = np.asarray(a, dtype=np.float64)
    t = np.array([1.0, 0, 0]) if abs(a[0]) < 0.9 else np.array([0, 1.0, 0])
    p = np.cross(a, t)
    return p / np.linalg.norm(p)


def normals(v, f):
    """Area-weighted vertex normals."""
    fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    n = np.zeros_like(v)
    for k in range(3):
        np.add.at(n, f[:, k], fn)
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    return n / np.maximum(ln, 1e-12)


def fibonacci(n, seed_rot=0.0):
    """n near-uniform unit vectors."""
    i = np.arange(n) + 0.5
    phi = np.arccos(1 - 2 * i / n)
    th = math.pi * (1 + 5 ** 0.5) * i + seed_rot
    return np.stack([np.cos(th) * np.sin(phi), np.cos(phi), np.sin(th) * np.sin(phi)], axis=1)


def bumps(d, centers, amp, width, profile=None):
    """Sum of angular bumps on unit directions d (N,3) about unit `centers` (K,3): amp * profile(angle / width)."""
    cosang = np.clip(d @ centers.T, -1, 1)
    ang = np.arccos(cosang)
    x = ang / width
    if profile is None:
        val = np.exp(-x * x)
    else:
        val = profile(x)
    return amp * val.sum(axis=1)


# ---------------------------------------------------------------------------------------------- sphere family
def cube_sphere(n):
    """Spherified cube lattice: 6n^2 quads (12n^2 tris), 6n^2+2 vertices, no poles. Returns (unit dirs, F)."""
    n = max(int(n), 1)
    idx = -np.ones((n + 1, n + 1, n + 1), dtype=np.int64)
    ii, jj, kk = np.meshgrid(*(np.arange(n + 1),) * 3, indexing="ij")
    surf = (ii == 0) | (ii == n) | (jj == 0) | (jj == n) | (kk == 0) | (kk == n)
    cnt = int(surf.sum())
    idx[surf] = np.arange(cnt)
    p = np.stack([ii[surf], jj[surf], kk[surf]], axis=1) * (2.0 / n) - 1.0
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    d = np.stack([x * np.sqrt(np.maximum(1 - y * y / 2 - z * z / 2 + y * y * z * z / 3, 0)),
                  y * np.sqrt(np.maximum(1 - z * z / 2 - x * x / 2 + z * z * x * x / 3, 0)),
                  z * np.sqrt(np.maximum(1 - x * x / 2 - y * y / 2 + x * x * y * y / 3, 0))], axis=1)
    a, b = np.meshgrid(np.arange(n), np.arange(n), indexing="ij")
    a, b = a.ravel(), b.ravel()
    faces, fuvs, cids = [], [], []
    qa = np.array([(0, 0), (1, 0), (1, 1), (0, 1)], dtype=np.float64)
    for axis in range(3):
        for side in (0, n):
            def at(da, db):
                c = [None, None, None]
                c[axis] = np.full_like(a, side)
                u, w = (axis + 1) % 3, (axis + 2) % 3  # cyclic: u x w = +axis
                c[u], c[w] = a + da, b + db
                return idx[c[0], c[1], c[2]]
            q = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)]
            qq = qa
            if side == 0:
                q = q[::-1]
                qq = qa[::-1]
            faces.append(np.stack([q[0], q[1], q[2]], 1))
            faces.append(np.stack([q[0], q[2], q[3]], 1))
            ab = np.stack([a, b], 1).astype(np.float64)
            cid = axis * 2 + (1 if side else 0)
            for tri in ((0, 1, 2), (0, 2, 3)):
                fuvs.append(np.stack([ab + qq[k] for k in tri], 1))
                cids.append(np.full(len(a), cid))
    f_all = np.concatenate(faces)
    reg(f_all, np.concatenate(fuvs), np.concatenate(cids))
    return d, f_all


def sphere(n, fn=None):
    """Unit sphere deformed by fn(dirs) -> positions (N,3)."""
    d, f = cube_sphere(n)
    return (d if fn is None else fn(d)), f


def ellipsoid(n, radii):
    d, f = cube_sphere(n)
    return d * np.asarray(radii, dtype=np.float64), f


def torus(path_n, sides, major, minor):
    c = np.linspace(0, 2 * math.pi, path_n, endpoint=False)
    pts = np.stack([major * np.cos(c), np.zeros_like(c), major * np.sin(c)], axis=1)
    return tube(pts, np.full(path_n, minor), sides, closed=True)


# ---------------------------------------------------------------------------------------------- curves + tubes
def catmull(pts, per_seg=8, closed=False):
    """Centripetal-ish Catmull-Rom through control points (uniform parameterisation)."""
    p = np.asarray(pts, dtype=np.float64)
    m = len(p)
    if closed:
        ext = np.concatenate([p[-1:], p, p[:2]])
        segs = m
    else:
        ext = np.concatenate([2 * p[:1] - p[1:2], p, 2 * p[-1:] - p[-2:-1]])
        segs = m - 1
    t = np.linspace(0, 1, per_seg, endpoint=False)[:, None]
    out = []
    for i in range(segs):
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    if not closed:
        out.append(p[-1:])
    return np.concatenate(out)


def _tangents(c, closed):
    if closed:
        t = np.roll(c, -1, 0) - np.roll(c, 1, 0)
    else:
        t = np.gradient(c, axis=0)
    return t / np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-12)


def _frames(c, closed, up=None):
    t = _tangents(c, closed)
    m = len(c)
    nrm = np.zeros_like(t)
    n0 = _perp(t[0]) if up is None else np.asarray(up, dtype=np.float64)
    n0 = n0 - t[0] * (n0 @ t[0])
    nrm[0] = n0 / np.linalg.norm(n0)
    for i in range(1, m):
        n = nrm[i - 1] - t[i] * (nrm[i - 1] @ t[i])
        nrm[i] = n / max(np.linalg.norm(n), 1e-12)
    if closed:
        b0 = np.cross(t[0], nrm[0])
        end = nrm[-1] - t[0] * (nrm[-1] @ t[0])
        phi = math.atan2(end @ b0, end @ nrm[0])
        for i in range(m):
            a = -phi * i / m
            nrm[i] = nrm[i] * math.cos(a) + np.cross(t[i], nrm[i]) * math.sin(a)
    return t, nrm, np.cross(t, nrm)


def tube(path, radius, sides=12, closed=False, cap=3, aspect=None, up=None, twist=0.0):
    return tube_t(path, radius, sides, closed, cap, aspect, up, twist)[0]


def tube_t(path, radius, sides=12, closed=False, cap=3, aspect=None, up=None, twist=0.0):
    """Like tube() but also returns the per-vertex path parameter t in [0,1] (colouring along the length).
    Swept circle along `path` (M,3) with per-point `radius` (M,) (or scalar). Open tubes get rounded caps (`cap`
    extra rings + a pole). `aspect` (M,) stretches the binormal radius (flat ribbons); `twist` = total radians of
    extra rotation of the profile along the path (helical ribs)."""
    c = np.asarray(path, dtype=np.float64)
    m = len(c)
    r = np.broadcast_to(np.asarray(radius, dtype=np.float64), (m,)).copy()
    asp = np.ones(m) if aspect is None else np.broadcast_to(np.asarray(aspect, dtype=np.float64), (m,)).copy()
    t, nn, bb = _frames(c, closed, up)
    centres, rad, asps, NN, BB = [c], [r], [asp], [nn], [bb]
    if not closed and cap > 0:
        pre, post = [], []
        for k in range(1, cap + 1):
            th = (math.pi / 2) * k / (cap + 1)
            pre.append((c[0] - t[0] * r[0] * math.sin(th), r[0] * math.cos(th), asp[0], nn[0], bb[0]))
            post.append((c[-1] + t[-1] * r[-1] * math.sin(th), r[-1] * math.cos(th), asp[-1], nn[-1], bb[-1]))
        pre = pre[::-1]
        centres = [np.array([p[0] for p in pre]), c, np.array([p[0] for p in post])]
        rad = [np.array([p[1] for p in pre]), r, np.array([p[1] for p in post])]
        asps = [np.array([p[2] for p in pre]), asp, np.array([p[2] for p in post])]
        NN = [np.array([p[3] for p in pre]), nn, np.array([p[3] for p in post])]
        BB = [np.array([p[4] for p in pre]), bb, np.array([p[4] for p in post])]
        if cap == 0:
            pass
    C = np.concatenate([a for a in centres if len(a)])
    R = np.concatenate([a for a in rad if len(a)])
    A = np.concatenate([a for a in asps if len(a)])
    N_ = np.concatenate([a for a in NN if len(a)])
    B_ = np.concatenate([a for a in BB if len(a)])
    rings = len(C)
    ang = np.linspace(0, 2 * math.pi, sides, endpoint=False)
    if twist:
        ang = ang[None, :] + (twist * np.arange(rings) / max(rings - 1, 1))[:, None]
    else:
        ang = np.broadcast_to(ang, (rings, sides))
    ca, sa = np.cos(ang)[:, :, None], np.sin(ang)[:, :, None]
    V = (C[:, None, :] + R[:, None, None] * (ca * N_[:, None, :] + sa * A[:, None, None] * B_[:, None, :])).reshape(-1, 3)
    j = np.arange(rings if closed else rings - 1)
    j2 = (j + 1) % rings
    a = np.arange(sides)
    a2 = (a + 1) % sides
    J, AA = np.meshgrid(j, a, indexing="ij")
    J2, AA2 = np.meshgrid(j2, a2, indexing="ij")
    q00, q10 = J * sides + AA, J * sides + AA2
    q01, q11 = J2 * sides + AA, J2 * sides + AA2
    F = [np.stack([q00, q01, q11], -1).reshape(-1, 3), np.stack([q00, q11, q10], -1).reshape(-1, 3)]
    J1, A1 = J.astype(np.float64), AA.astype(np.float64)
    fuv_parts = [np.stack([np.stack([J1, A1], -1), np.stack([J1 + 1, A1], -1), np.stack([J1 + 1, A1 + 1], -1)], 2).reshape(-1, 3, 2),
                 np.stack([np.stack([J1, A1], -1), np.stack([J1 + 1, A1 + 1], -1), np.stack([J1, A1 + 1], -1)], 2).reshape(-1, 3, 2)]
    if not closed:
        p0 = len(V)
        if cap > 0:
            V = np.concatenate([V, [C[0] - t[0] * R[0] * 0.0 - t[0] * (R[0] * 0.0)], [C[-1]]])
            # pole positions: extend by the end radius along the tangent
            V[p0] = c[0] - t[0] * r[0]
            V[p0 + 1] = c[-1] + t[-1] * r[-1]
        else:
            V = np.concatenate([V, [c[0]], [c[-1]]])
        s = np.arange(sides)
        s2 = (s + 1) % sides
        F.append(np.stack([np.full(sides, p0), s, s2], 1))
        F.append(np.stack([np.full(sides, p0 + 1), (rings - 1) * sides + s2, (rings - 1) * sides + s], 1))
        sf = s.astype(np.float64)
        z = np.zeros(sides)
        fuv_parts.append(np.stack([np.stack([z - 1, sf + 0.5], 1), np.stack([z, sf], 1), np.stack([z, sf + 1], 1)], 1))
        fuv_parts.append(np.stack([np.stack([z + rings, sf + 0.5], 1), np.stack([z + rings - 1, sf + 1], 1),
                                   np.stack([z + rings - 1, sf], 1)], 1))
    ring_t = np.linspace(0, 1, m, endpoint=not closed)
    if not closed and cap > 0:
        ring_t = np.concatenate([np.zeros(cap), ring_t, np.ones(cap)])
    tv = np.repeat(ring_t, sides)
    if not closed:
        tv = np.concatenate([tv, [0.0, 1.0]])
    f_all = np.concatenate(F)
    reg(f_all, np.concatenate(fuv_parts), np.zeros(len(f_all), dtype=np.int64))
    return orient((V, f_all)), tv


def signed_volume(v, f):
    return float(np.einsum("ij,ij->i", v[f[:, 0]], np.cross(v[f[:, 1]], v[f[:, 2]])).sum() / 6.0)


def orient(surf):
    """Flip a single closed component to outward if its signed volume is negative."""
    v, f = surf
    if signed_volume(v, f) < 0:
        f = flipf(f)
    return v, f


def flip(surf):
    return surf[0], flipf(surf[1])


# ---------------------------------------------------------------------------------------------- checks
def components(v, f):
    """Face -> component label via vertex label propagation (pointer jumping)."""
    lab = np.arange(len(v))
    while True:
        m = lab[f].min(1)
        new = lab.copy()
        for k in range(3):
            np.minimum.at(new, f[:, k], m)
        new = new[new]
        if (new == lab).all():
            break
        lab = new
    return lab[f[:, 0]]


def topology_report(v, f):
    """Boundary / non-manifold edge counts, inconsistent orientation, unused vertices, per-component volumes."""
    e = np.concatenate([f[:, [0, 1]], f[:, [1, 2]], f[:, [2, 0]]])
    key = np.minimum(e[:, 0], e[:, 1]) * len(v) + np.maximum(e[:, 0], e[:, 1])
    _, inv, cnt = np.unique(key, return_inverse=True, return_counts=True)
    boundary = int((cnt == 1).sum())
    nonman = int((cnt > 2).sum())
    dkey = e[:, 0] * len(v) + e[:, 1]
    inconsistent = int(len(dkey) - len(np.unique(dkey)))  # a directed edge used twice = flipped neighbour
    lab = components(v, f)
    vols = []
    for L in np.unique(lab):
        sel = f[lab == L]
        vols.append(signed_volume(v, sel))
    area = np.linalg.norm(np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]]), axis=1) / 2
    return dict(boundary=boundary, nonmanifold=nonman, inconsistent=inconsistent, components=len(vols),
                volumes=vols, degenerate=int((area < 1e-12).sum()))
