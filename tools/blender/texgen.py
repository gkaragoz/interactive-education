"""Texture generation driver (inside Blender): bake G-buffers per material atlas, paint, write PNG tiers.

Tier sizes follow docs/ASSETS.md: heroes 4096/2048/1024, others 2048/1024/512, tiny parts 1024/512/256 (high/medium/low).
A secondary material that covers < 30 % of the surface gets half the resolution (recorded per map in meta.json)."""
import json
import os
import struct
import time
import zlib
from pathlib import Path

import numpy as np

import texpaint

HEROES = {"nucleus", "wall-plant", "membrane-animal", "membrane-plant", "envelope-bacterium", "mitochondrion",
          "chloroplast", "rough-er"}
TINY = {"plasmid", "pilus", "centrosome", "lysosome", "ribosome", "flagellum"}
TIERS = ("low", "medium", "high")


SIZE_TABLE = {}          # per-asset top size overrides (modules)


def tier_sizes(asset):
    top = SIZE_TABLE.get(asset) or (4096 if asset in HEROES else 1024 if asset in TINY else 2048)
    cap = int(os.environ.get("TEXMAX", "0") or 0)
    if cap:
        top = min(top, cap)
    return {"high": top, "medium": top // 2, "low": top // 4}


def write_png(path, rgba):
    """8-bit RGBA PNG, rows written top-down from a bottom-up array (glTF v origin), filter 0, deterministic."""
    h, w = rgba.shape[:2]
    raw = np.ascontiguousarray(rgba[::-1]).reshape(h, w * 4)
    data = np.concatenate([np.zeros((h, 1), np.uint8), raw], axis=1).tobytes()

    def chunk(tag, body):
        c = struct.pack(">I", len(body)) + tag + body
        return c + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF)
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(data, 4)) + chunk(b"IEND", b""))
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_bytes(png)
    return len(png)


def _area(parts):
    tot = 0.0
    for p in parts:
        a = np.linalg.norm(np.cross(p.V[p.F[:, 1]] - p.V[p.F[:, 0]], p.V[p.F[:, 2]] - p.V[p.F[:, 0]]), axis=1).sum() / 2
        tot += a
    return tot


def make_textures(ctx, out_root, only_tiers=None):
    """Bake + paint + write PNGs for every material atlas of the asset. Returns the textureSource info dict."""
    import texbake
    asset = ctx["asset"]
    t0 = time.time()
    sizes = tier_sizes(asset)
    parts = ctx["parts"]
    names = [p.name for p in parts]
    L = float(max(np.ptp(np.concatenate([p.V for p in parts]), axis=0)))
    areas = {m: _area([p for p in parts if p.mat == m]) for m in ctx["groups"]}
    total = sum(areas.values())
    info = {"tiers": {t: {} for t in TIERS}, "bakeSeconds": 0.0, "paintSeconds": 0.0}
    for mat, objs in ctx["groups"].items():
        gel = mat == "gel"
        share = areas[mat] / total
        top = sizes["high"] if share >= 0.3 or len(ctx["groups"]) == 1 else max(sizes["high"] // 2, 256)
        tb = time.time()
        G = texbake.bake_group(objs, top, pad=max(8, top // 256))
        info["bakeSeconds"] += time.time() - tb
        if os.environ.get("GBUF"):
            d = Path(out_root).parent / "gbuf"
            d.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(d / f"{asset}_{mat}.npz", names=np.array(names), L=L, gel=gel,
                                **{k: (v.astype(np.float16) if v.dtype == np.float32 and k in ("P", "N") else v) for k, v in G.items()})
        tp = time.time()
        img = texpaint.paint_group(G, names, asset, gel, L)
        alb, nrm, orm = texpaint.finish_maps(G, img, gel, asset, L)
        info["paintSeconds"] += time.time() - tp
        maps = {"albedo": alb, "normal": nrm, "orm": orm}
        print(f"   {asset}/{mat}: baked {top}px in {info['bakeSeconds']:.1f}s, painted in {info['paintSeconds']:.1f}s", flush=True)
        base_maps = dict(maps)
        for tier in ("high", "medium", "low"):
            want = sizes[tier] if share >= 0.3 or len(ctx["groups"]) == 1 else max(sizes[tier] // 2, 128)
            for kind, arr in base_maps.items():
                cur = arr
                while cur.shape[0] > want:
                    cur = texpaint.downsample(cur, kind)
                p = Path(out_root) / asset / tier / f"{mat}_{kind}.png"
                n = write_png(p, cur)
                info["tiers"][tier].setdefault(mat, {})[kind] = dict(size=int(cur.shape[0]), pngBytes=n)
        del G, img
    info["totalSeconds"] = round(time.time() - t0, 1)
    info["bakeSeconds"] = round(info["bakeSeconds"], 1)
    info["paintSeconds"] = round(info["paintSeconds"], 1)
    return info
