"""Batch 4c (v0.6 genetics): Punnett tile and allele token. The app renders the letters itself."""
import numpy as np

import geo
import noise
import texmotifs
import clip
from paint import ramp
from shapes import res, part, slab
from mod_membrane import neutral, NEUTRAL, _plate
from mod_muscle import _solid


def punnett_tile(q):
    """Rounded square tile 1.0 x 0.14 x 1.0 (origin = centre, top face +Y) with a shallow circular slot (radius 0.33, depth 0.05) for the allele
    letter and a raised rim around it. Neutral albedo: tint the tile per genotype."""
    v, f, _ = _plate(res(40, q, 12), 0.5, 0.07, 0.5, 0.0, power=7.0)
    top = v[:, 1] > 0.05
    r = np.hypot(v[:, 0], v[:, 2])
    dish = np.clip(1 - (r / 0.33) ** 2, 0, 1)
    rim = np.exp(-((r - 0.385) / 0.03) ** 2)
    v[:, 1] += top * (-0.05 * dish ** 0.3 + 0.03 * rim)
    t = np.clip(0.5 + 0.5 * noise.fbm(v * 3.0, 4, 1.0, 3), 0, 1)
    return [part("tile", (v, f), ramp(t, NEUTRAL), ao=(0.7, 0.2, 14), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)]


def allele_token(q):
    """Sphere of radius 0.3 cut flat at z = +0.17 (flat face towards +Z, face disc radius ~0.2 is its own mesh `face`, gel material, planar UVs filling 0..1,
    so the app can swap in its own letter texture). Body neutral: tint it per allele."""
    d, f = geo.cube_sphere(res(18, q, 6))
    s = (d * 0.3 * (1 + 0.02 * noise.fbm(d, 3, 1.5, 3))[:, None], f)
    V, F, _ = clip.clip_cap(s, 0.17, axis=2)
    body = (V, F)
    disc = slab(res(12, q, 5), 0.2, 0.2, 0.01, seed=2, power=0.5, rim_ruffle=0.0)
    dv = disc[0] @ geo.rot_axis((1, 0, 0), 90).T + np.array([0.0, 0.0, 0.176])
    face = (dv, disc[1])
    t = np.clip(0.5 + 0.5 * noise.fbm(V * 4.0, 5, 1.0, 3), 0, 1)
    pb = part("body", body, ramp(t, NEUTRAL), ao=(0.7, 0.2, 12), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)
    pf = part("face", face, np.tile(_solid("#fbf4e4"), (len(dv), 1)), mat="gel", alpha=1.0, occ=False, ao=(0.3, 0.1, 6), tint=(0.8, 0.78, 0.7), proj=2)
    return [pb, pf]


neutral("punnett-tile", "tile", w=0.1, relief=0.004)
neutral("allele-token", "body", w=0.08, relief=0.003)
texmotifs.HINTS[("allele-token", "face")] = dict(w=0.2, relief=0.0005, jit=0.0, dab=0.0, strokeval=0.0, dry=0.0, contour=0.0)

META = {
    "punnett-tile": dict(pivot="tile centre", axes="1 x 1 square tile 0.14 thick in XZ, top face +Y with a shallow circular slot (radius 0.33, depth 0.05) for the letter; neutral albedo",
                         units="1 = tile width", tintable=True, tintParts=["tile"], neutralAlbedo=True),
    "allele-token": dict(pivot="sphere centre", axes="radius 0.3 sphere cut flat at z = +0.17; mesh `face` (gel material, disc radius 0.2 at z ~ 0.176, normal +Z, UVs span the whole 0..1 square) carries the app's letter texture; body is neutral (tint it)",
                         units="um-free (UI token)", tintable=True, tintParts=["body"], neutralAlbedo=True),
}
TEXTURE_SIZES = {"punnett-tile": 512, "allele-token": 512}
BUILDERS = {"punnett-tile": punnett_tile, "allele-token": allele_token}
