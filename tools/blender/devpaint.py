"""Dev loop without re-baking: paint from a saved G-buffer (GBUF=1 run) and write the PNG tiers.
   python tools/blender/devpaint.py nucleus clay [tiers: high|all]"""
import sys
import time
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import texgen  # noqa: E402
import texpaint  # noqa: E402

asset, mat = sys.argv[1], sys.argv[2]
d = np.load(HERE / "out" / "gbuf" / f"{asset}_{mat}.npz")
G = {k: d[k] for k in d.files if k not in ("names", "L", "gel")}
G["P"], G["N"] = G["P"].astype(np.float32), G["N"].astype(np.float32)
names, L, gel = list(d["names"]), float(d["L"]), bool(d["gel"])
t = time.time()
img = texpaint.paint_group(G, names, asset, gel, L)
alb, nrm, orm = texpaint.finish_maps(G, img, gel, asset, L)
print(f"painted {G['mask'].shape[0]}px in {time.time() - t:.1f}s")
out = HERE / "out" / "tex" / asset / "high"
for kind, arr in (("albedo", alb), ("normal", nrm), ("orm", orm)):
    texgen.write_png(out / f"{mat}_{kind}.png", arr)
