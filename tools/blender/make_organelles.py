"""Entry: generate organelle GLBs headless.

  blender -b --factory-startup --python tools/blender/make_organelles.py -- IDS=nucleus,golgi [OUT=dir]

IDS defaults to every id in docs/ASSETS.md. Deterministic: re-running overwrites byte-identically.
"""
import importlib
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

MODULES = ["noise", "geo", "shapes", "paint", "glbinfo", "charts", "uvtools", "texnoise", "texmotifs", "texpaint", "texbake", "texgen", "bpyout", "org_nucleus", "org_energy", "org_membranes",
           "org_misc", "org_vesicles", "org_motility", "org_prokaryote", "org_shells", "org_decor", "mod_mitosis", "mod_membrane", "mod_dna", "mod_energy", "mod_muscle", "mod_neuro", "mod_genetics", "extrude", "clip"]
for _m in MODULES:                      # an open Blender keeps stale imports between runs
    sys.modules.pop(_m, None)

import paint  # noqa: E402
import bpyout  # noqa: E402

FAMILIES = ["org_nucleus", "org_energy", "org_membranes", "org_misc", "org_vesicles", "org_motility",
            "org_prokaryote", "org_shells", "org_decor"]
NO_TEXTURES = {"cytoskeleton", "vesicle"}
SEED = 20260101
LOD_Q = (1.0, 0.5, 0.3)

ALL_IDS = ["nucleus", "mitochondrion", "rough-er", "smooth-er", "golgi", "ribosome", "lysosome", "centrosome",
           "vacuole", "chloroplast", "nucleoid", "plasmid", "flagellum", "pilus", "membrane-animal",
           "membrane-plant", "wall-plant", "envelope-bacterium", "cytoskeleton", "vesicle"]


MODULE_IDS = ["chromosome", "chromosome-single", "chromatin", "kinetochore-fibre", "spindle-pole", "cleavage-furrow-ring",
              "cell-plate", "nuclear-envelope-fragment",
              "bilayer-patch", "bilayer-tile", "channel-protein", "carrier-protein", "carrier-protein-b", "pump-protein", "receptor-protein",
              "dna-helix", "dna-single-strand", "helicase", "dna-polymerase", "rna-polymerase", "nucleotide", "mrna-strand", "trna",
              "amino-acid", "polypeptide-chain", "ribosome-subunits",
              "atp-synthase", "etc-complex-1", "etc-complex-2", "etc-complex-3", "etc-complex-4", "cytochrome-c", "ubiquinone",
              "photosystem-1", "photosystem-2", "rubisco", "atp", "glucose", "co2", "o2", "h2o", "pyruvate", "thylakoid-stack",
              "mitochondrion-crista-detail",
              "sarcomere", "myosin-head", "actin-filament", "troponin-tropomyosin", "muscle-fibre-bundle", "neuron", "synapse-terminal",
              "neurotransmitter", "na-channel", "na-channel-open", "k-channel", "k-channel-open", "reflex-arc-parts", "punnett-tile", "allele-token"]
MODULE_FAMILIES = ["mod_mitosis", "mod_membrane", "mod_dna", "mod_energy", "mod_muscle", "mod_neuro", "mod_genetics"]
FAMILY_SET = [FAMILIES]


def registry():
    reg = {}
    for fam in FAMILY_SET[0]:
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


def tri_count(parts):
    return sum(len(p.F) for p in parts)


def pick_lod_q(builder, asset):
    """Choose q for LOD1/LOD2 so that LOD1 <= 29 % of LOD0 and 320 <= LOD2 <= 57 % of LOD1 (builders are cheap, AO is not)."""
    fixed = getattr(sys.modules[builder.__module__], "LOD_Q", {}).get(asset)
    if fixed:
        return fixed
    t0 = tri_count(builder(1.0))
    q1 = 0.55
    while q1 > 0.12 and tri_count(builder(q1)) > 0.25 * t0:
        q1 -= 0.03
    t1 = tri_count(builder(q1))
    q2 = q1 * 0.85
    while q2 > 0.06 and tri_count(builder(q2)) > 0.55 * t1:
        q2 -= 0.02
    return (1.0, round(q1, 3), round(q2, 3))


def build(asset, builder, out_dir, texroot=None):
    t0 = time.time()
    lods = {}
    for k, q in enumerate(pick_lod_q(builder, asset)):
        parts = builder(q)
        paint.finalize(parts, SEED)
        lods[k] = parts
    extra = getattr(sys.modules[builder.__module__], "META", {}).get(asset)
    tex = None
    if texroot and asset not in NO_TEXTURES:
        import texgen
        tex = lambda ctx: texgen.make_textures(ctx, texroot)
    meta, mats, ext = bpyout.build_and_export(asset, lods, out_dir, "make_organelles.py", SEED, extra, tex)
    t = meta["tris"]
    if meta.get("textureSource"):
        print(f"   textures: bake {meta['textureSource']['bakeSeconds']}s paint {meta['textureSource']['paintSeconds']}s")
    print(f"{asset:20s} LOD0 {t['LOD0']:6d}  LOD1 {t['LOD1']:6d}  LOD2 {t['LOD2']:6d}  "
          f"{meta['bytes'] / 1024:7.1f} KB  r={meta['boundsRadius']:.2f}  mats={mats}  {time.time() - t0:.1f}s")
    return meta


def main():
    args = parse_args()
    for k in ("TEXMAX", "GBUF"):
        if k in args:
            os.environ[k] = args[k]
    modules = args.get("SET") == "modules"          # SET=modules: public/models/modules, textures tools/blender/out/tex_modules
    if modules:
        FAMILY_SET[0] = MODULE_FAMILIES
    ids = args["IDS"].split(",") if args.get("IDS") else (MODULE_IDS if modules else ALL_IDS)
    out_dir = args.get("OUT") or str(ROOT / "public" / "models" / ("modules" if modules else "organelles"))
    texroot = (args.get("TEXOUT") or str(HERE / "out" / ("tex_modules" if modules else "tex"))) if args.get("TEX") else None
    if modules:
        bpyout.KEEP_PIVOT[0] = True
        import texgen
        for fam in MODULE_FAMILIES:
            texgen.SIZE_TABLE.update(importlib.import_module(fam).TEXTURE_SIZES)
    reg = registry()
    errors = []
    for asset in ids:
        if asset not in reg:
            errors.append(f"{asset}: no builder yet")
            continue
        try:
            build(asset, reg[asset], out_dir, texroot)
        except ValueError as exc:
            errors.append(f"{asset}:\n{exc}")
    if errors:
        print("\n".join(errors))
        raise SystemExit(1)


main()
