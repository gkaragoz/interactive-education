"""Procedural hand-painted clay texturing on baked G-buffers (numpy only; runs inside Blender or in plain Python).

Everything is evaluated per texel from the 3D position (so strokes are continuous across UV seams): flow-aligned brush
strokes at three scales, dry-brush edges that show a lighter underpainting, pigment jitter, cavity contour lines, warm
rim lift, speckles, canvas weave; the stroke/relief height becomes a tangent-space normal map; ORM carries AO/roughness."""
import zlib

import numpy as np

import texmotifs
from texnoise import aniso, fbm, sstep, vnoise, worley_fast

def flow_field(N, axis, along=False):
    ax = np.asarray(axis, dtype=np.float32)
    ax = ax / np.linalg.norm(ax)
    if along:                                   # strokes run along the axis (tubes, capsules)
        f = ax - N * (N @ ax)[:, None]
        ln = np.linalg.norm(f, axis=1, keepdims=True)
        if (ln > 0.15).mean() > 0.5:
            return f / np.maximum(ln, 1e-6)
    f1 = np.cross(N, ax)
    alt = np.array([1.0, 0.0, 0.3], dtype=np.float32)
    alt = alt - ax * (alt @ ax)
    f2 = np.cross(N, alt / np.linalg.norm(alt))
    flip = (f1 * f2).sum(1, keepdims=True) < 0
    f2 = np.where(flip, -f2, f2)
    w = np.clip((f1 * f1).sum(1, keepdims=True) * 4.0, 0, 1)
    f = f1 * w + f2 * (1 - w)
    return f / np.maximum(np.linalg.norm(f, axis=1, keepdims=True), 1e-6)


def to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def paint_texels(S, hint, gel):
    """S: arrays for one part's texels (P,N,base,ao,aux,aux2,alpha). Returns col (sRGB), alpha, h, rough, ao + helper fields.

    Look: broad soft pigment dabs (cellular blobs), calm flow-aligned brush streaks, thin dry-brush breaks, cavity contours
    with a hue shift, sparse speckles. Features never go below ~3 texels (tw) so they survive the lower tiers."""
    P, N, B, ao = S["P"], S["N"], S["base"], S["ao"]
    w = np.float32(hint["w"])
    tw = np.float32(hint.get("tw", 0.0))
    F = flow_field(N, hint["axis"], hint.get("along", False))
    seed = hint.get("seed", 3)
    # 1) pigment: slow per-channel drift + daubs (cellular blobs, value and warmth jitter)
    pig = np.stack([fbm(P * np.float32(1.0 / (w * 7)), seed + c, 2) for c in range(3)], 1)
    f1, f2, cid = worley_fast(P, 1.0 / (w * 2.6), seed)
    dab = sstep(0.75, 0.15, f1) * (cid - 0.5)
    col = B * (1 + hint["jit"] * pig + hint["dab"] * dab[:, None] * np.array([1.0, 0.8, 0.6], np.float32))
    # 2) brush streaks along the flow
    sa = aniso(P, F, 1.0 / (w * 1.4), 7, seed + 11, 2)
    br = aniso(P, F, 1.0 / max(w * 0.22, 3 * tw), 14, seed + 13, 1)
    stroke = 0.7 * sa + 0.3 * br
    col = col * (1 + hint["strokeval"] * sa + 0.035 * br)[:, None]
    # 3) dry-brush breaks: thin areas where the lighter underpainting peeks through
    m = sstep(-0.95, -0.55, stroke + hint["dry"] * (br * 0.5 - 0.35))
    under = (B * 0.75 + np.array([1.0, 0.9, 0.78], np.float32) * 0.25)
    col = under * (1 - m)[:, None] + col * m[:, None]
    # 4) cavity contour: darker, hue-shifted, saturated
    cav = sstep(0.68, 0.30, ao)
    dark = np.array(hint.get("dark", (0.40, 0.28, 0.55)), np.float32)
    col = col * (1 - hint["contour"] * cav)[:, None] + col * dark * (hint["contour"] * cav)[:, None]
    up = np.clip(N[:, 1] * 0.5 + 0.5, 0, 1)
    col = col + np.array([0.035, 0.018, 0.0], np.float32) * up[:, None] * hint["warm"]
    # 5) sparse speckles
    sp = vnoise(P * np.float32(1.0 / max(w * 0.16, 2.5 * tw)), seed + 21)
    col = col * (1 - 0.13 * sstep(0.80, 0.93, sp))[:, None] + 0.05 * sstep(0.84, 0.95, -sp)[:, None]
    h = (0.22 * sa * m + 0.1 * br * m + 0.15 * vnoise(P * np.float32(1.0 / max(w * 0.4, 4 * tw)), seed + 31)
         + 0.35 * dab) * hint["relief"]
    rough = hint["rough"] + 0.16 * (1 - m) - 0.08 * stroke
    return dict(col=col, alpha=S["alpha"].copy(), h=h, rough=rough, ao=ao.copy(), m=m, stroke=stroke, br=br, F=F, w=w)


def hints_for(asset, part, L, gel):
    h = dict(w=L / 24.0, axis=(0, 1, 0), jit=0.10, dab=0.24, strokeval=0.10, dry=0.4, contour=0.6, warm=1.0, relief=L / 24.0 * 0.06,
             rough=0.55 if not gel else 0.22, seed=3 + zlib.crc32(part.encode()) % 7)
    h.update(texmotifs.hints(asset, part, L))
    return h


def extrapolate_margin(G, passes=24):
    """Replace the copied (EXTEND) margin positions by linear extrapolation of the chart interior, so the painted noise
    continues smoothly across chart borders (no constant strips at seams). Uses G['cov'] = exactly baked texels."""
    P = G["P"].copy()
    cov = G["cov"]
    H, W = cov.shape
    tw = float(np.median(np.linalg.norm(P[:, 1:] - P[:, :-1], axis=-1)[cov[:, 1:] & cov[:, :-1]])) if cov.any() else 1.0
    filled = cov.copy()
    for ax in (0, 1):                                       # single-texel holes inside a chart: interpolate
        a, b = np.roll(filled, 1, ax), np.roll(filled, -1, ax)
        hole = (~filled) & a & b
        if hole.any():
            P = np.where(hole[..., None], 0.5 * (np.roll(P, 1, ax) + np.roll(P, -1, ax)), P)
            filled = filled | hole
    for _ in range(passes):
        new_any = False
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nb1f = np.roll(filled, (dy, dx), (0, 1))
            tgt = (~filled) & nb1f
            if not tgt.any():
                continue
            nb1 = np.roll(P, (dy, dx), (0, 1))
            nb2 = np.roll(P, (2 * dy, 2 * dx), (0, 1))
            nb2f = np.roll(filled, (2 * dy, 2 * dx), (0, 1))
            step = nb1 - nb2
            ok = nb2f & (np.linalg.norm(step, axis=-1) < 3 * tw)
            ext = np.where(ok[..., None], nb1 + step, nb1)
            P = np.where(tgt[..., None], ext, P)
            filled = filled | tgt
            new_any = True
        if not new_any:
            break
    G = dict(G)
    G["P"] = np.where((G["mask"] & ~cov)[..., None], P, G["P"])
    return G


def paint_group(G, parts, asset, gel, L):
    """G: G-buffer dict (H,W arrays). parts: list of part names indexed by pid. Returns dict of float images."""
    G = extrapolate_margin(G) if "cov" in G else G
    H, W = G["mask"].shape
    Pm = G["P"]
    dd = np.linalg.norm(Pm[:, 1:] - Pm[:, :-1], axis=-1)[G["mask"][:, 1:] & G["mask"][:, :-1]]
    tw = float(np.median(dd[dd > 1e-7])) if (dd > 1e-7).any() else 0.0
    idx = np.flatnonzero(G["mask"].ravel())
    n = len(idx)
    flat = {k: (G[k].reshape(H * W, -1)[idx] if G[k].ndim == 3 else G[k].ravel()[idx]) for k in
            ("P", "N", "base", "ao", "aux", "aux2", "alpha", "pid")}
    col = np.zeros((n, 3), np.float32)
    alpha = np.zeros(n, np.float32)
    hgt = np.zeros(n, np.float32)
    rough = np.zeros(n, np.float32)
    aoo = np.zeros(n, np.float32)
    CH = 1 << 20
    for s in range(0, n, CH):
        e = min(s + CH, n)
        pid = flat["pid"][s:e]
        for pi in np.unique(pid):
            sel = np.flatnonzero(pid == pi) + s
            name = parts[int(pi)] if int(pi) < len(parts) else parts[-1]
            S = {k: flat[k][sel] for k in ("P", "N", "base", "ao", "aux", "aux2", "alpha")}
            hint = hints_for(asset, name, L, gel)
            hint["tw"] = tw
            r = paint_texels(S, hint, gel)
            texmotifs.apply(asset, name, S, r, hint, gel)
            col[sel], alpha[sel], hgt[sel], rough[sel], aoo[sel] = r["col"], r["alpha"], r["h"], r["rough"], r["ao"]
    img = {}
    for k, v, c in (("col", col, 3), ("alpha", alpha, 1), ("h", hgt, 1), ("rough", rough, 1), ("ao", aoo, 1)):
        a = np.zeros((H * W, c), np.float32)
        a[idx] = v.reshape(n, c)
        img[k] = a.reshape(H, W, c)
    img["mask"] = G["mask"]
    img["P"] = G["P"]
    return img


def finish_maps(G, img, gel, asset="", L=1.0, weave=True):
    """Tangent-space normal from the height field, ORM, albedo with canvas weave and background fill."""
    H, W = img["mask"].shape
    mask = img["mask"]
    P = img.get("P", G["P"])
    h = img["h"][..., 0]
    dpx = np.linalg.norm(P[:, 2:] - P[:, :-2], axis=-1)
    dpy = np.linalg.norm(P[2:] - P[:-2], axis=-1)
    tx = max(float(np.median(dpx[mask[:, 1:-1]])), 1e-6) if mask.any() else 1.0
    hx = np.zeros_like(h)
    hy = np.zeros_like(h)
    hx[:, 1:-1] = (h[:, 2:] - h[:, :-2]) / np.clip(dpx, 0.5 * tx, 3.0 * tx)      # positions are extrapolated across chart
    hy[1:-1] = (h[2:] - h[:-2]) / np.clip(dpy, 0.5 * tx, 3.0 * tx)               # borders, so no seam masking is needed
    nz = 1.0 / np.sqrt(hx * hx + hy * hy + 1.0)
    nrm = np.stack([-hx * nz, -hy * nz, nz], -1)
    dith = np.random.default_rng(7).random((H, W, 1), dtype=np.float32) - 0.5          # dither: no 8-bit banding rings
    normal = np.clip((nrm * 0.5 + 0.5) * 255 + 0.5 + dith, 0, 255).astype(np.uint8)
    col = img["col"]
    if weave:
        yy, xx = np.mgrid[0:H, 0:W]
        wv = 1.0 + 0.012 * np.sin(xx * (2 * np.pi / 6.0)) * np.sin(yy * (2 * np.pi / 6.0) + 1.0)
        col = col * wv[..., None].astype(np.float32)
    mean = col[mask].mean(0) if mask.any() else np.array([0.5, 0.5, 0.5])
    col = np.where(mask[..., None], col, mean)
    rgba = np.concatenate([np.clip(col, 0, 1), np.clip(np.where(mask, img["alpha"][..., 0], 1.0), 0, 1)[..., None]], -1)
    albedo = np.clip(rgba * 255 + 0.5 + dith, 0, 255).astype(np.uint8)
    if not gel:
        albedo[..., 3] = 255
    orm = np.zeros((H, W, 4), np.uint8)
    orm[..., 0] = (np.clip(np.where(mask, img["ao"][..., 0], 1.0), 0, 1) * 255 + 0.5).astype(np.uint8)
    orm[..., 1] = (np.clip(np.where(mask, img["rough"][..., 0], 0.6), 0.05, 1) * 255 + 0.5).astype(np.uint8)
    orm[..., 2] = 0
    orm[..., 3] = 255
    normal4 = np.concatenate([normal, np.full((H, W, 1), 255, np.uint8)], -1)
    return albedo, normal4, orm


def downsample(a, kind):
    """2x2 box downsample of an (H,W,4) uint8 map: albedo in linear light, normals renormalised."""
    H, W = a.shape[:2]
    x = a.astype(np.float32) / 255.0
    if kind == "albedo":
        rgb = to_lin(x[..., :3])
        rgb = rgb.reshape(H // 2, 2, W // 2, 2, 3).mean((1, 3))
        out = np.concatenate([to_srgb(rgb), x[..., 3:].reshape(H // 2, 2, W // 2, 2, 1).mean((1, 3))], -1)
    elif kind == "normal":
        v = x[..., :3] * 2 - 1
        v = v.reshape(H // 2, 2, W // 2, 2, 3).mean((1, 3))
        ln = np.linalg.norm(v, axis=-1, keepdims=True)
        v = v / np.maximum(ln, 1e-6)
        out = np.concatenate([v * 0.5 + 0.5, np.ones((H // 2, W // 2, 1), np.float32)], -1)
    else:
        out = x.reshape(H // 2, 2, W // 2, 2, 4).mean((1, 3))
    return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)
