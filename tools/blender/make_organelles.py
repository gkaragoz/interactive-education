"""Entry: generate organelle GLBs headless.

  blender -b --factory-startup --python tools/blender/make_organelles.py -- IDS=nucleus,golgi [OUT=dir]

IDS defaults to every id in docs/ASSETS.md. Deterministic: re-running overwrites byte-identically.
"""
import importlib
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

MODULES = ["noise", "geo", "shapes", "paint", "glbinfo", "bpyout", "org_nucleus", "org_energy", "org_membranes",
           "org_misc", "org_vesicles", "org_motility", "org_prokaryote", "org_shells"]
for _m in MODULES:                      # an open Blender keeps stale imports between runs
    sys.modules.pop(_m, None)

import paint  # noqa: E402
import bpyout  # noqa: E402

FAMILIES = ["org_nucleus", "org_energy", "org_membranes", "org_misc", "org_vesicles", "org_motility",
            "org_prokaryote", "org_shells"]
SEED = 20260101
LOD_Q = (1.0, 0.5, 0.3)

ALL_IDS = ["nucleus", "mitochondrion", "rough-er", "smooth-er", "golgi", "ribosome", "lysosome", "centrosome",
           "vacuole", "chloroplast", "nucleoid", "plasmid", "flagellum", "pilus", "membrane-animal",
           "membrane-plant", "wall-plant", "envelope-bacterium"]


def registry():
    reg = {}
    for fam in FAMILIES:
        try:
            mod = importlib.import_module(fam)
        except ModuleNotFoundError as exc:
            if exc.name == fam:
                continue
            raise
        reg.update(mod.BUILDERS)
    return reg


def parse_args():
    out = {}
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for a in argv:
        if "=" in a:
            k, v = a.split("=", 1)
            out[k] = v
    return out


def build(asset, builder, out_dir):
    t0 = time.time()
    lods = {}
    lod_q = getattr(sys.modules[builder.__module__], "LOD_Q", {}).get(asset, LOD_Q)
    for k, q in enumerate(lod_q):
        parts = builder(q)
        paint.finalize(parts, SEED)
        lods[k] = parts
    extra = getattr(sys.modules[builder.__module__], "META", {}).get(asset)
    meta, mats, ext = bpyout.build_and_export(asset, lods, out_dir, "make_organelles.py", SEED, extra)
    t = meta["tris"]
    print(f"{asset:20s} LOD0 {t['LOD0']:6d}  LOD1 {t['LOD1']:6d}  LOD2 {t['LOD2']:6d}  "
          f"{meta['bytes'] / 1024:7.1f} KB  r={meta['boundsRadius']:.2f}  mats={mats}  {time.time() - t0:.1f}s")
    return meta


def main():
    args = parse_args()
    ids = args["IDS"].split(",") if args.get("IDS") else ALL_IDS
    out_dir = args.get("OUT") or str(ROOT / "public" / "models" / "organelles")
    reg = registry()
    errors = []
    for asset in ids:
        if asset not in reg:
            errors.append(f"{asset}: no builder yet")
            continue
        try:
            build(asset, reg[asset], out_dir)
        except ValueError as exc:
            errors.append(f"{asset}:\n{exc}")
    if errors:
        print("\n".join(errors))
        raise SystemExit(1)


main()
