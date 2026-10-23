"""Plane clipping of closed meshes with capping (numpy only): keep the part with coordinate[axis] <= z0 and close the cut with flat caps.
Used for cut-open views. Returns closed manifold meshes; chart data (geo registry) is carried over, caps get planar chart coordinates."""
import numpy as np

import geo


def _ear_clip(poly):
    """Triangulate a simple polygon given as (n,2) points in order; returns triangles as index triples (CCW input expected)."""
    idx = list(range(len(poly)))
    tris = []

    def area2(a, b, c):
        return (poly[b][0] - poly[a][0]) * (poly[c][1] - poly[a][1]) - (poly[b][1] - poly[a][1]) * (poly[c][0] - poly[a][0])

    def inside(j, a, b, c):
        d1, d2, d3 = area2(a, b, j), area2(b, c, j), area2(c, a, j)
        return d1 >= 0 and d2 >= 0 and d3 >= 0
    guard = 0
    while len(idx) > 3 and guard < 10 * len(poly) ** 2:
        guard += 1
        n = len(idx)
        best, best_area = None, None
        for k in range(n):
            a, b, c = idx[(k - 1) % n], idx[k], idx[(k + 1) % n]
            ar = area2(a, b, c)
            if ar <= 1e-14:
                continue
            if any(inside(j, a, b, c) for j in idx if j not in (a, b, c)):
                continue
            tris.append((a, b, c))
            idx.pop(k)
            best = True
            break
        if best is None:                                    # degenerate / self-touching loop: drop the flattest vertex
            n = len(idx)
            k = min(range(n), key=lambda i: abs(area2(idx[(i - 1) % n], idx[i], idx[(i + 1) % n])))
            tris.append((idx[(k - 1) % n], idx[k], idx[(k + 1) % n]))
            idx.pop(k)
    if len(idx) == 3:
        tris.append((idx[0], idx[1], idx[2]))
    return tris


def clip_cap(surf, z0, axis=2):
    """Returns (V, F, vmap) with vmap = (ia, ib, t) so per-vertex data can be interpolated: new = data[ia] * (1 - t) + data[ib] * t."""
    v, f = surf
    d = v[:, axis] - z0
    eps = 1e-9
    inside = d <= eps
    ch = geo.chart_of(f)
    fuv = ch[0] if ch else None
    cid = ch[1] if ch else None
    new_v = [v]
    vmap_a = [np.arange(len(v))]
    vmap_b = [np.arange(len(v))]
    vmap_t = [np.zeros(len(v))]
    cache = {}
    count = [len(v)]
    out_f, out_uv, out_c = [], [], []

    def cross(a, b):
        if abs(d[a]) <= eps:                                # an on-plane vertex is its own intersection point
            return a
        if abs(d[b]) <= eps:
            return b
        key = (min(a, b), max(a, b))
        if key not in cache:
            t = d[a] / (d[a] - d[b])
            p = v[a] + (v[b] - v[a]) * t
            if a > b:
                a2, b2, t2 = b, a, 1 - t
            else:
                a2, b2, t2 = a, b, t
            new_v.append(p[None])
            vmap_a.append(np.array([a2]))
            vmap_b.append(np.array([b2]))
            vmap_t.append(np.array([t2]))
            cache[key] = count[0]
            count[0] += 1
        return cache[key]

    def uv_at(ti, ca, cb, t):
        return fuv[ti][ca] + (fuv[ti][cb] - fuv[ti][ca]) * t if fuv is not None else None

    nin = inside[f].sum(1)
    for ti in range(len(f)):
        tri = f[ti]
        k = nin[ti]
        if k == 3:
            out_f.append(tuple(tri))
            if fuv is not None:
                out_uv.append(fuv[ti])
                out_c.append(cid[ti])
            continue
        if k == 0:
            continue
        ins = [j for j in range(3) if inside[tri[j]]]
        if k == 1:
            i0 = ins[0]
            a, b, c = tri[i0], tri[(i0 + 1) % 3], tri[(i0 + 2) % 3]
            ib_, ic_ = (i0 + 1) % 3, (i0 + 2) % 3
            p, q = cross(a, b), cross(a, c)
            if len({a, p, q}) < 3:
                continue
            out_f.append((a, p, q))
            if fuv is not None:
                t_ab = d[a] / (d[a] - d[b])
                t_ac = d[a] / (d[a] - d[c])
                out_uv.append(np.stack([fuv[ti][i0], uv_at(ti, i0, ib_, t_ab), uv_at(ti, i0, ic_, t_ac)]))
                out_c.append(cid[ti])
        else:
            o = [j for j in range(3) if not inside[tri[j]]][0]
            a, b, c = tri[o], tri[(o + 1) % 3], tri[(o + 2) % 3]        # a outside, b and c inside
            ib_, ic_ = (o + 1) % 3, (o + 2) % 3
            p, q = cross(a, b), cross(a, c)
            t_ab = d[a] / (d[a] - d[b])
            t_ac = d[a] / (d[a] - d[c])
            for tri2, uvs in (((b, c, q), (ib_, ic_, "q")), (((b, q, p)), (ib_, "q", "p"))):
                if len(set(tri2)) < 3:
                    continue
                out_f.append(tri2)
                if fuv is not None:
                    uvp, uvq = uv_at(ti, o, ib_, t_ab), uv_at(ti, o, ic_, t_ac)
                    pick = {ib_: fuv[ti][ib_], ic_: fuv[ti][ic_], "q": uvq, "p": uvp}
                    out_uv.append(np.stack([pick[uvs[0]], pick[uvs[1]], pick[uvs[2]]]))
                    out_c.append(cid[ti])
    V = np.concatenate(new_v)
    ia, ib, tt = np.concatenate(vmap_a), np.concatenate(vmap_b), np.concatenate(vmap_t)
    # boundary edges of the kept faces -> loops (robust to on-plane vertices); caps are closed with ear clipping
    dset = set()
    for tri in out_f:
        for k in range(3):
            dset.add((tri[k], tri[(k + 1) % 3]))
    cut_edges = [(a_, b_) for (a_, b_) in dset if (b_, a_) not in dset]
    nxt = {}
    for a_, b_ in cut_edges:
        nxt.setdefault(a_, []).append(b_)
    used = set()
    loops = []
    for a_, b_ in sorted(cut_edges):
        if (a_, b_) in used:
            continue
        loop = [a_]
        cur = b_
        used.add((a_, b_))
        while cur != a_ and len(loop) < 100000:
            loop.append(cur)
            cands = [x for x in nxt.get(cur, []) if (cur, x) not in used]
            if not cands:
                break
            nx = cands[0]
            used.add((cur, nx))
            cur = nx
        loops.append(loop)
    cap_faces, cap_uv, cap_c = [], [], []
    other = [i for i in (0, 1, 2) if i != axis]
    base_c = int(cid.max()) + 1 if cid is not None and len(cid) else 0
    for li, loop in enumerate(loops):
        if len(loop) < 3:
            continue
        loop = loop[::-1]                                    # reversed: cap edges oppose the kept-triangle edges
        pts = V[loop][:, other]
        ar = 0.5 * np.sum(pts[:, 0] * np.roll(pts[:, 1], -1) - np.roll(pts[:, 0], -1) * pts[:, 1])
        if ar < 0:
            pts = pts[::-1]
            loop = loop[::-1]
        tris = _ear_clip(pts)
        for (i, j, k) in tris:
            cap_faces.append((loop[i], loop[j], loop[k]))
            cap_uv.append(np.stack([np.array([pts[x][0], pts[x][1]]) for x in (i, j, k)]))
            cap_c.append(base_c + li)
    F = np.array(out_f + cap_faces, dtype=np.int64)
    nf = len(out_f)
    cap_idx = np.arange(nf, len(F))
    # compact unused vertices
    used_v = np.unique(F)
    remap = -np.ones(len(V), dtype=np.int64)
    remap[used_v] = np.arange(len(used_v))
    F = remap[F]
    V, ia, ib, tt = V[used_v], ia[used_v], ib[used_v], tt[used_v]
    if fuv is not None:
        uvall = np.concatenate([np.array(out_uv).reshape(-1, 3, 2), np.array(cap_uv).reshape(-1, 3, 2)]) if cap_uv else np.array(out_uv).reshape(-1, 3, 2)
        call = np.concatenate([np.array(out_c, dtype=np.int64), np.array(cap_c, dtype=np.int64)]) if cap_c else np.array(out_c, dtype=np.int64)
        geo.reg(F, uvall, call)
    return V, F, (ia, ib, tt)


def clip_part(p, z0, axis=2):
    """Clip a paint.Part in place (positions, faces, base colour, alpha, aux) and refresh its chart data."""
    V, F, (ia, ib, tt) = clip_cap((p.V, p.F), z0, axis)

    def interp(a):
        a = np.asarray(a)
        if a.ndim == 0 or len(a) != len(p.V):
            return a
        t = tt.reshape((-1,) + (1,) * (a.ndim - 1))
        return a[ia] * (1 - t) + a[ib] * t
    p.base = interp(p.base)
    p.alpha = interp(p.alpha)
    if p.aux is not None:
        p.aux = interp(p.aux)
    if p.aux2 is not None:
        p.aux2 = interp(p.aux2)
    p.V, p.F = V, F
    c = geo.chart_of(F)
    p.fuv, p.cid = (c if c else (None, None))
    return p
