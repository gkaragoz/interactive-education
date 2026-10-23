"""Per-organelle painting hints and motifs (anatomy-following patterns) for texpaint. numpy only."""
import numpy as np

from texnoise import aniso, fbm, sstep, vnoise, worley_fast

# (asset, part) -> hint overrides; w = stroke width (um), relief = paint height (um), axis = flow axis
NEUTRAL = dict(jit=0.0, dab=0.06, dabc=(1, 1, 1), under=(1, 1, 1), warm=0.0, strokeval=0.04, dry=0.1, contour=0.4,
               dark=(0.72, 0.72, 0.76), rough=0.5)
HINTS = {
    ("chromosome", "arms"): dict(NEUTRAL, w=0.05, relief=0.003, axis=(0, 1, 0), along=True),
    ("chromosome-single", "arms"): dict(NEUTRAL, w=0.05, relief=0.003, axis=(0, 1, 0), along=True),
    ("chromosome", "kinetochore"): dict(w=0.03, relief=0.002, rough=0.4),
    ("chromosome-single", "kinetochore"): dict(w=0.03, relief=0.002, rough=0.4),
    ("chromatin", "fine"): dict(w=0.04, relief=0.002),
    ("chromatin", "coarse"): dict(w=0.08, relief=0.004),
    ("kinetochore-fibre", "microtubules"): dict(w=0.03, relief=0.0015, axis=(1, 0, 0), along=True),
    ("spindle-pole", "mother"): dict(w=0.03, relief=0.0015, axis=(1, 0, 0), along=True),
    ("spindle-pole", "daughter"): dict(w=0.03, relief=0.0015, axis=(0, 0, 1), along=True),
    ("spindle-pole", "aster"): dict(w=0.03, relief=0.0015),
    ("cleavage-furrow-ring", "actin"): dict(w=0.04, relief=0.002, axis=(0, 1, 0)),
    ("cleavage-furrow-ring", "myosin"): dict(w=0.03, relief=0.002),
    ("cell-plate", "plate"): dict(w=0.12, relief=0.004, dab=0.3),
    ("cell-plate", "vesicles"): dict(w=0.03, relief=0.002),
    ("nuclear-envelope-fragment", "outer"): dict(w=0.14, relief=0.006, dab=0.28),
    ("nuclear-envelope-fragment", "inner"): dict(w=0.14, relief=0.005, dab=0.2),
    ("nuclear-envelope-fragment", "pores"): dict(w=0.03, relief=0.002),
    ("nucleus", "envelope"): dict(w=0.30, relief=0.014, axis=(0, 1, 0), dry=0.4, dab=0.30, jit=0.10),
    ("nucleus", "inner"): dict(w=0.30, relief=0.006, jit=0.05, dab=0.1, dry=0.2, contour=0.3),
    ("nucleus", "nucleolus"): dict(w=0.14, relief=0.006, rough=0.30, dry=0.2, contour=0.5),
    ("nucleus", "chromatin"): dict(w=0.1, relief=0.004, axis=(0.3, 1, 0.2)),
    ("wall-plant", "wall"): dict(w=0.5, relief=0.06, dry=0.5, contour=0.7, jit=0.12, dab=0.25, dark=(0.55, 0.66, 0.34)),
    ("mitochondrion", "cristae"): dict(w=0.06, relief=0.004, axis=(1, 0, 0), contour=0.8),
    ("mitochondrion", "matrix"): dict(w=0.04, relief=0.002),
    ("mitochondrion", "outer"): dict(w=0.12, relief=0.004, axis=(1, 0, 0), along=True),
    ("mitochondrion", "inner"): dict(w=0.12, relief=0.003, axis=(1, 0, 0), along=True),
    ("chloroplast", "grana"): dict(w=0.05, relief=0.004, contour=0.8, dark=(0.35, 0.55, 0.28)),
    ("chloroplast", "stroma"): dict(w=0.06, relief=0.003, dark=(0.4, 0.6, 0.3)),
    ("chloroplast", "globules"): dict(w=0.05, relief=0.003, rough=0.35),
    ("chloroplast", "envelope"): dict(w=0.2, relief=0.004, axis=(1, 0, 0), along=True),
    ("rough-er", "sheets"): dict(w=0.08, relief=0.006, axis=(1, 0, 0), along=True, contour=0.8, dark=(0.50, 0.28, 0.30)),
    ("rough-er", "ribosomes"): dict(w=0.04, relief=0.002, rough=0.45, dab=0.3),
    ("rough-er", "tubules"): dict(w=0.05, relief=0.003, along=True, axis=(0, 1, 0)),
    ("smooth-er", "tubules"): dict(w=0.08, relief=0.004, contour=0.7, dark=(0.52, 0.28, 0.28)),
    ("smooth-er", "sheets"): dict(w=0.07, relief=0.003),
    ("golgi", "cisternae"): dict(w=0.10, relief=0.006, axis=(0, 1, 0), contour=0.8),
    ("golgi", "vesicles"): dict(w=0.04, relief=0.002, rough=0.4),
    ("ribosome", "large"): dict(w=0.03, relief=0.002),
    ("ribosome", "small"): dict(w=0.03, relief=0.002),
    ("ribosome", "mrna"): dict(w=0.02, relief=0.001),
    ("lysosome", "contents"): dict(w=0.03, relief=0.002),
    ("centrosome", "mother"): dict(w=0.04, relief=0.002, axis=(1, 0, 0), along=True),
    ("centrosome", "daughter"): dict(w=0.04, relief=0.002, axis=(0, 0, 1), along=True),
    ("centrosome", "pcm"): dict(w=0.03, relief=0.002),
    ("vacuole", "solutes"): dict(w=0.06, relief=0.003),
    ("nucleoid", "fibre"): dict(w=0.06, relief=0.003, contour=0.7),
    ("nucleoid", "speckles"): dict(w=0.03, relief=0.002),
    ("nucleoid", "proteins"): dict(w=0.03, relief=0.002),
    ("plasmid", "strand0"): dict(w=0.04, relief=0.002),
    ("plasmid", "strand1"): dict(w=0.04, relief=0.002),
    ("flagellum", "filament"): dict(w=0.08, relief=0.003, axis=(1, 0, 0), along=True),
    ("flagellum", "motor"): dict(w=0.05, relief=0.003),
    ("flagellum", "envelope"): dict(w=0.12, relief=0.004),
    ("pilus", "shafts"): dict(w=0.05, relief=0.002, axis=(1, 0, 0), along=True),
    ("pilus", "tips"): dict(w=0.03, relief=0.002, rough=0.35),
    ("pilus", "base"): dict(w=0.06, relief=0.003),
    ("membrane-animal", "proteins"): dict(w=0.12, relief=0.004, rough=0.4),
    ("membrane-plant", "proteins"): dict(w=0.12, relief=0.004, rough=0.4),
    ("envelope-bacterium", "wall"): dict(w=0.2, relief=0.008, axis=(1, 0, 0), along=True, contour=0.7, dark=(0.5, 0.62, 0.32)),
    ("envelope-bacterium", "proteins"): dict(w=0.08, relief=0.003, rough=0.4),
}


CUSTOM = {}          # (asset, part) -> fn(S, r, hint, gel) -> True when it fully painted the part (lab glass, labels, tiles ...)


def hints(asset, part, L):
    return dict(HINTS.get((asset, part), {}))


def _plates(S, r, freq, relief_gain, seam_dark, tint):
    """Chunky cobble/plate relief from cellular noise (nuclear envelope)."""
    f1, f2, cid = worley_fast(S["P"], freq, 5)
    edge = sstep(0.0, 0.34, f2 - f1)
    r["h"] += relief_gain * (0.55 * edge + 0.45 * (1 - f1 * 0.9) * edge)
    shade = 1 - seam_dark * (1 - edge)
    r["col"] = r["col"] * shade[:, None] * (1 + tint * (cid - 0.5))[:, None]
    return edge, cid


def _wall(S, r, hint):
    edge = np.clip(S["aux"], 0, 1)
    cid = S["aux2"]
    outer = edge < 0.999
    seam = sstep(0.05, 0.7, edge)
    shade = np.where(outer, 0.50 + 0.50 * seam, 1.0)
    r["col"] = r["col"] * shade[:, None]
    r["h"] += hint["relief"] * 1.8 * np.where(outer, seam - 0.5, 0.0)
    th = (cid * 6.2831853).astype(np.float32)[:, None]
    nxf = np.cross(r["N"] if "N" in r else S["N"], r["F"])
    F2 = np.cos(th) * r["F"] + np.sin(th) * nxf
    br2 = aniso(S["P"], F2, 1.0 / (hint["w"] * 0.22), 16, 41, 1)
    st2 = aniso(S["P"], F2, 1.0 / (hint["w"] * 0.8), 6, 43, 2)
    r["col"] = r["col"] * (1 + 0.10 * br2 + 0.09 * st2)[:, None]
    r["h"] += hint["relief"] * (0.4 * br2 + 0.25 * st2) * np.where(outer, 1.0, 0.3)
    top = sstep(0.55, 0.95, edge)
    r["col"] = r["col"] + np.array([0.05, 0.07, 0.01], np.float32) * (top * np.clip(S["N"][:, 1], 0, 1))[:, None]


def _stripes(S, r, axis, freq, depth, wobble=0.35):
    P = S["P"]
    a = np.asarray(axis, np.float32)
    ph = P @ a * np.float32(freq) + wobble * fbm(P * np.float32(freq * 0.25), 77, 2)
    s = 0.5 + 0.5 * np.sin(ph * 6.2831853)
    line = sstep(0.62, 0.95, s)
    r["col"] = r["col"] * (1 - depth * line)[:, None]
    r["h"] -= r["w"] * 0.15 * line
    return line


def _dots(S, r, size, thresh, depth, light=0.0, seed=51):
    """Round painted dots (granules, fenestrations): cellular noise cores."""
    f1, f2, cid = worley_fast(S["P"], 1.0 / size, seed)
    core = sstep(0.34, 0.18, f1) * (cid > thresh)
    r["col"] = r["col"] * (1 - depth * core)[:, None] + light * core[:, None]
    r["h"] -= r["w"] * 0.2 * core
    return core


def _section(S, r, hint):
    """Cut-open assets: the squashed front half is a flat cap at z = hint['cut']; paint it as a section (pale flesh + hatching)."""
    cz = hint["cut"]
    sec = (S["N"][:, 2] > 0.9) & (np.abs(S["P"][:, 2] - cz) < 0.012)
    if not sec.any():
        return
    P = S["P"][sec]
    hatch = 0.5 + 0.5 * np.sin((P[:, 0] + P[:, 1]) * 55.0)
    flesh = np.array([0.97, 0.94, 0.86], np.float32)
    c = r["col"][sec] * 0.42 + flesh * 0.58
    r["col"][sec] = c * (1 - 0.10 * sstep(0.7, 0.95, hatch))[:, None]
    r["h"][sec] *= 0.05
    r["rough"][sec] = 0.8
    r["ao"][sec] = 1.0
    r["alpha"][sec] = np.maximum(r["alpha"][sec], 0.92)


def apply(asset, name, S, r, hint, gel):
    S["N"] = S["N"]
    r["N"] = S["N"]
    fn = CUSTOM.get((asset, name)) or CUSTOM.get((None, name))
    if fn is not None and fn(S, r, hint, gel):
        r["col"] = np.clip(r["col"], 0, 1)
        return
    if hint.get("cut") is not None:
        _section(S, r, hint)
    if gel:
        r["alpha"] = np.clip(r["alpha"] * (1 + 0.30 * r["stroke"] + 0.08 * r["br"]), 0.02, 1.0)
        r["h"] *= 0.5
        r["rough"] = np.full_like(r["rough"], 0.16) + 0.10 * (1 - r["m"])
        r["col"] = r["col"] + 0.05 * sstep(0.2, 0.7, r["stroke"])[:, None]
        return
    key = (asset, name)
    if name == "arms" and asset.startswith("chromosome"):               # G-bands + helical coil on a neutral albedo
        tv, av = S["aux"], S["aux2"]
        z = np.zeros_like(tv)
        band = sstep(0.05, 0.65, vnoise(np.stack([tv * 38.0, z + 3.7, z], 1).astype(np.float32), 31))
        helix = 0.5 + 0.5 * np.sin(2 * np.pi * (tv * 30.0 + av))
        coil = sstep(0.62, 0.95, helix)
        r["col"] = r["col"] * (1 - 0.20 * band - 0.13 * coil)[:, None]
        r["h"] -= hint["relief"] * (1.6 * coil + 0.7 * band)
        r["rough"] = r["rough"] + 0.1 * coil
    elif key == ("kinetochore-fibre", "microtubules"):
        _stripes(S, r, (1, 0, 0), 38.0, 0.18, wobble=0.1)
    elif key[0] == "spindle-pole" and name in ("mother", "daughter"):
        _stripes(S, r, (1, 0, 0) if name == "mother" else (0, 0, 1), 14.0, 0.2, wobble=0.2)
    elif key == ("cell-plate", "plate"):
        _dots(S, r, 0.1, 0.4, 0.14, seed=91)
    elif key[0] == "nuclear-envelope-fragment" and name in ("outer", "inner"):
        _plates(S, r, 1.0 / 0.42, hint["relief"] * 3.0, 0.2, 0.08)
    elif key == ("nucleus", "envelope"):
        edge, cid = _plates(S, r, 1.0 / 1.15, hint["relief"] * 6.5, 0.30, 0.10)
        r["col"] = r["col"] + np.array([0.06, 0.03, 0.09], np.float32) * (sstep(0.5, 0.9, edge) * sstep(0.1, 0.7, cid))[:, None]
    elif key == ("nucleus", "nucleolus"):
        r["col"] = r["col"] * (1 + 0.10 * np.sin(S["P"][:, 0] * 22 + 3 * fbm(S["P"] * 3, 5, 2)))[:, None]
    elif key == ("wall-plant", "wall"):
        _wall(S, r, hint)
    elif key == ("mitochondrion", "cristae"):
        _stripes(S, r, (0, 0, 1), 11.0, 0.22)
        _stripes(S, r, (0, 1, 0), 7.0, 0.12)
    elif key == ("chloroplast", "grana"):
        _stripes(S, r, (0, 1, 0), 1.0 / 0.092, 0.30, wobble=0.12)             # ring grooves between thylakoid discs
        _dots(S, r, 0.07, 0.35, 0.22)
    elif key == ("chloroplast", "stroma"):
        _dots(S, r, 0.08, 0.5, 0.15)
    elif key == ("rough-er", "sheets"):
        _stripes(S, r, (0, 0, 1), 5.5, 0.14, wobble=0.5)
        _dots(S, r, 0.11, 0.2, 0.0, light=np.array([0.10, 0.04, 0.12], np.float32), seed=61)   # ribosome speckle
    elif key == ("golgi", "cisternae"):
        _dots(S, r, 0.26, 0.45, 0.35, seed=71)                                  # fenestrations
        _stripes(S, r, (0, 1, 0), 3.0, 0.08, wobble=0.5)
    elif key == ("smooth-er", "tubules"):
        _stripes(S, r, (0, 1, 0), 9.0, 0.08, wobble=0.7)
    elif key == ("flagellum", "filament"):
        _stripes(S, r, (1, 0, 0), 1.0 / 0.07, 0.30, wobble=0.05)                # flagellin subunit rows
    elif key == ("pilus", "shafts"):
        _stripes(S, r, (1, 0, 0), 1.0 / 0.065, 0.22, wobble=0.1)
    elif key == ("nucleoid", "fibre"):
        _dots(S, r, 0.18, 0.7, 0.0, light=np.array([0.06, 0.05, 0.02], np.float32), seed=81)
    elif key == ("envelope-bacterium", "wall"):
        _plates(S, r, 1.0 / 0.7, hint["relief"] * 2.5, 0.18, 0.08)
    elif key == ("mitochondrion", "matrix"):
        pass
    r["col"] = np.clip(r["col"], 0, 1)
