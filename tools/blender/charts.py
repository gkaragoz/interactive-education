"""Analytic UV atlas (numpy, no bpy): rectangles per parametric chart, equal texel density, shelf-packed into 0..1.

Every geo primitive records chart coordinates per face corner (cube-sphere face lattice, tube ring/side). Here each chart
becomes a rectangle whose size is its measured 3D size (anisotropic scale from the median Jacobian), long strips are
chopped into pieces, and all rectangles of one material are packed with one global scale, so texel density is uniform
across parts and there is no overlap by construction."""
import numpy as np

MAX_ASPECT = 3.0


def _handedness(V, F, fuv, faces):
    """+1 if the chart is right-handed (N . (P_u x P_v) > 0 with N from the face winding), -1 if mirrored."""
    p = V[F[faces]]
    uv = fuv[faces]
    e1, e2 = p[:, 1] - p[:, 0], p[:, 2] - p[:, 0]
    d1, d2 = uv[:, 1] - uv[:, 0], uv[:, 2] - uv[:, 0]
    det = d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]
    ok = np.abs(det) > 1e-9
    if not ok.any():
        return 1.0
    inv = 1.0 / det[ok]
    pu = (e1[ok] * d2[ok, 1:2] - e2[ok] * d1[ok, 1:2]) * inv[:, None]
    pv = (e2[ok] * d1[ok, 0:1] - e1[ok] * d2[ok, 0:1]) * inv[:, None]
    n = np.cross(e1[ok], e2[ok])
    s = np.einsum("ij,ij->i", np.cross(pu, pv), n)
    return 1.0 if np.sum(s > 0) >= np.sum(s < 0) else -1.0


def _chart_metrics(V, F, fuv, faces):
    """Median 3D length per chart-unit along u and v for the given faces."""
    p = V[F[faces]]                      # (n,3,3)
    uv = fuv[faces]
    e1, e2 = p[:, 1] - p[:, 0], p[:, 2] - p[:, 0]
    d1, d2 = uv[:, 1] - uv[:, 0], uv[:, 2] - uv[:, 0]
    det = d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]
    ok = np.abs(det) > 1e-9
    if not ok.any():
        return 1.0, 1.0
    inv = 1.0 / det[ok]
    pu = (e1[ok] * d2[ok, 1:2] - e2[ok] * d1[ok, 1:2]) * inv[:, None]
    pv = (e2[ok] * d1[ok, 0:1] - e1[ok] * d2[ok, 0:1]) * inv[:, None]
    su = float(np.median(np.linalg.norm(pu, axis=1)))
    sv = float(np.median(np.linalg.norm(pv, axis=1)))
    return max(su, 1e-6), max(sv, 1e-6)


def projection_charts(V, F, axis=1, sectors=8):
    """Chart coordinates for flat, plate-like parts (slabs, bilayers): per connected component the two broad faces (sign of the
    face normal along `axis`) are planar projections, the thin rim band (steep faces in the outer 3 % of the radius) is cut
    into angular sectors with (arc length, height) coordinates. Avoids cube-face stretching of thin slabs."""
    import geo
    a1, a2 = (axis + 1) % 3, (axis + 2) % 3
    P = V[F]
    n = np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0])
    n = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    comp = geo.components(V, F)
    fuv = np.zeros((len(F), 3, 2))
    cid = np.zeros(len(F), dtype=np.int64)
    fuv[..., 0], fuv[..., 1] = P[..., a1], P[..., a2]
    base = 0
    for L in np.unique(comp):
        sel = np.where(comp == L)[0]
        Vc = V[np.unique(F[sel])]
        c1, c2 = (Vc[:, a1].min() + Vc[:, a1].max()) / 2, (Vc[:, a2].min() + Vc[:, a2].max()) / 2
        ext = max(Vc[:, a1].max() - Vc[:, a1].min(), Vc[:, a2].max() - Vc[:, a2].min()) / 2
        Pc = P[sel]
        rad = np.hypot(Pc[..., a1] - c1, Pc[..., a2] - c2)
        rim = (np.abs(n[sel, axis]) < 0.5) & (rad.mean(1) > 0.97 * ext * 0.9)
        cid[sel] = base + np.where(n[sel, axis] < 0, 1, 0)
        if rim.any():
            ang = np.arctan2(Pc[rim][..., a2] - c2, Pc[rim][..., a1] - c1)
            mean = np.arctan2(np.sin(ang).mean(1), np.cos(ang).mean(1))
            ang = mean[:, None] + (ang - mean[:, None] + np.pi) % (2 * np.pi) - np.pi
            sec = np.minimum(((mean + np.pi) / (2 * np.pi) * sectors).astype(int), sectors - 1)
            centre = (sec + 0.5) / sectors * 2 * np.pi - np.pi
            rr = rad[rim].mean()
            idx = sel[rim]
            fuv[idx, :, 0] = (ang - centre[:, None]) * rr
            fuv[idx, :, 1] = Pc[rim][..., axis]
            cid[idx] = base + 2 + sec
        base += 2 + sectors
    return fuv, cid


def build_pieces(parts):
    """List of pieces: dict(part, faces, su, sv, umin, vmin, w, h) over all parts (3D-size rectangles)."""
    pieces = []
    for pi, p in enumerate(parts):
        if getattr(p, "proj", None) is not None:
            p.fuv, p.cid = projection_charts(p.V, p.F, p.proj)
        if p.fuv is None:
            raise ValueError(f"part {p.name}: no chart data (a face array was built outside geo primitives)")
        for c in np.unique(p.cid):
            faces = np.where(p.cid == c)[0]
            su, sv = _chart_metrics(p.V, p.F, p.fuv, faces)
            uv = p.fuv[faces]
            urange = (uv[..., 0].min(), uv[..., 0].max())
            vrange = (uv[..., 1].min(), uv[..., 1].max())
            w, h = (urange[1] - urange[0]) * su, (vrange[1] - vrange[0]) * sv
            axis = 0 if w >= h else 1
            ext = max(w, h)
            short = max(min(w, h), 1e-6)
            n = int(np.ceil(ext / (MAX_ASPECT * short))) if ext > MAX_ASPECT * short else 1
            if n > 1:                                  # chop long strips by the face centroid along the long axis
                cen = uv[..., axis].mean(1)
                lo, hi = urange if axis == 0 else vrange
                idx = np.minimum(((cen - lo) / (hi - lo + 1e-12) * n).astype(int), n - 1)
                groups = [faces[idx == k] for k in range(n)]
            else:
                groups = [faces]
            for g in groups:
                if len(g) == 0:
                    continue
                uvg = p.fuv[g]
                u0, u1 = uvg[..., 0].min(), uvg[..., 0].max()
                v0, v1 = uvg[..., 1].min(), uvg[..., 1].max()
                pieces.append(dict(part=pi, faces=g, su=su, sv=sv, u0=u0, v0=v0, hand=_handedness(p.V, p.F, p.fuv, g),
                                   w=max((u1 - u0) * su, 1e-6), h=max((v1 - v0) * sv, 1e-6)))
    return pieces


def _shelf(sizes, scale, margin):
    """Shelf-pack landscape rectangles (w,h in 3D units * scale) into the unit square; returns positions or None."""
    x = y = rowh = 0.0
    pos = []
    for w, h in sizes:
        ww, hh = w * scale + margin, h * scale + margin
        if ww > 1.0:
            return None
        if x + ww > 1.0:
            x, y, rowh = 0.0, y + rowh, 0.0
        pos.append((x, y))
        x += ww
        rowh = max(rowh, hh)
        if y + rowh > 1.0:
            return None
    return pos


def pack(pieces, margin=0.004):
    """Assign each piece a rotation flag, global scale and atlas position."""
    for pc in pieces:
        pc["rot"] = pc["w"] < pc["h"]
        pc["W"], pc["H"] = (pc["h"], pc["w"]) if pc["rot"] else (pc["w"], pc["h"])
    order = sorted(range(len(pieces)), key=lambda i: -pieces[i]["H"])
    sizes = [(pieces[i]["W"], pieces[i]["H"]) for i in order]
    lo, hi = 1e-6, 1.0 / max(min(s[0] for s in sizes), 1e-9)
    best = None
    area = sum(w * h for w, h in sizes)
    hi = min(hi, 4.0 / np.sqrt(area))
    for _ in range(40):
        mid = (lo + hi) / 2
        pos = _shelf(sizes, mid, margin)
        if pos is None:
            hi = mid
        else:
            lo, best = mid, (mid, pos)
    scale, pos = best
    for k, i in enumerate(order):
        pieces[i]["pos"] = pos[k]
    return scale, order


def make_uvs(parts, margin=0.004):
    """UV arrays (M,3,2) per part, all within 0..1 and right-handed, plus atlas scale (UV per 3D unit)."""
    pieces = build_pieces(parts)
    scale, _ = pack(pieces, margin)
    out = [np.zeros((len(p.F), 3, 2)) for p in parts]
    for pc in pieces:
        p = parts[pc["part"]]
        uv = p.fuv[pc["faces"]]
        lu = (uv[..., 0] - pc["u0"]) * pc["su"] * scale
        lv = (uv[..., 1] - pc["v0"]) * pc["sv"] * scale
        hand = pc["hand"]
        if pc["rot"]:
            lu, lv = lv, lu
            hand = -hand
        if hand < 0:                      # every chart right-handed: glTF tangent frames use B = N x T (no mirrored charts)
            lu = pc["W"] * scale - lu
        ox, oy = pc["pos"]
        out[pc["part"]][pc["faces"]] = np.stack([ox + margin / 2 + lu, oy + margin / 2 + lv], -1)
    return out, scale
