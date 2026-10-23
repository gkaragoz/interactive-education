"""Batch 2b (v0.4 dna-protein): DNA helix and single strand, helicase, DNA/RNA polymerase, nucleotide, mRNA, tRNA,
amino acid, polypeptide chain, ribosome subunits. Pivot/axes per asset in META. Tintable parts use a neutral light albedo."""
import numpy as np

import geo
import noise
import texmotifs
from paint import ramp
from shapes import res, part, blob, normalize
from mod_membrane import neutral, NEUTRAL

BASE_PAL = {"a": "#7cc4ee", "t": "#f0a0c0", "g": "#a0d878", "c": "#f4cc70"}


def _neutral_col(P, seed, lift=0.0):
    t = np.clip(0.5 + 0.5 * noise.fbm(P * 3.0, seed, 1.0, 3) + lift, 0, 1)
    return ramp(t, NEUTRAL)


def _vcol(surf, hexcol, seed, spread=0.12):
    base = np.array([int(hexcol[i:i + 2], 16) / 255.0 for i in (1, 3, 5)])
    n = 0.5 + 0.5 * noise.fbm(surf[0] * 3.0, seed, 1.0, 3)
    return np.clip(base[None, :] * (1 - spread + 2 * spread * n[:, None]), 0, 1)


# ----------------------------------------------------------------------------------------------- DNA
SEQ = "AAGCTGCATTCGAACGTTAG"[:20]


def dna_helix(q):
    """20 base pairs = 2 turns, 3.2 long along Y (origin = centre). Flat-cut ends: copies stack seamlessly every 3.2 in Y."""
    R, rise, nbp = 0.5, 0.16, 20
    L = rise * nbp
    ph_b = 2.6
    npts = res(8 * nbp, q, 16) + 1
    y = np.linspace(-L / 2, L / 2, npts)
    th = (y + L / 2) / rise * 2 * np.pi / 10
    back = []
    for k, off in enumerate((0.0, ph_b)):
        path = np.stack([R * np.cos(th + off), y, R * np.sin(th + off)], 1)
        rad = 0.095 * (1 + 0.16 * np.cos((y + L / 2) / rise * 2 * np.pi))          # one phosphate bead per base
        s, tv, av = geo.tube_ta(path, rad, res(14, q, 5), cap=0)
        p = part("backbone-" + "ab"[k], s, _neutral_col(s[0], 3 + k), ao=(0.8, 0.3, 14), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)
        p.aux, p.aux2 = tv, av
        back.append(p)
    rungs = {"at": [], "gc": []}
    for i in range(nbp):
        kind = "at" if SEQ[i] in "AT" else "gc"
        yy = -L / 2 + (i + 0.5) * rise
        t0 = (yy + L / 2) / rise * 2 * np.pi / 10
        A = np.array([R * np.cos(t0), yy, R * np.sin(t0)])
        B = np.array([R * np.cos(t0 + ph_b), yy, R * np.sin(t0 + ph_b)])
        d = B - A
        mid = A + d * (0.58 if SEQ[i] in "AG" else 0.42)                    # purine half is the longer one
        a_in, b_in = A + d * 0.10, B - d * 0.10
        rr = 0.058 if kind == "at" else 0.066
        s1 = geo.tube(np.stack([a_in, (a_in + mid) / 2, mid]), rr, res(9, q, 4), cap=2)
        s2 = geo.tube(np.stack([mid, (mid + b_in) / 2, b_in]), rr * 0.9, res(9, q, 4), cap=2)
        rungs[kind] += [s1, s2]
        nh = 2 if kind == "at" else 3
        for h in (range(nh) if q > 0.45 else ()):                                              # hydrogen-bond dots across the junction
            off = (h - (nh - 1) / 2) * 0.05
            rungs[kind].append(blob(res(4, q, 2), (0.024,) * 3, seed=h, amp=0.05, pos=mid + np.array([0, off, 0])))
    parts = list(back)
    for kind in ("at", "gc"):
        s = geo.merge(*rungs[kind])
        parts.append(part("bp-" + kind, s, _neutral_col(s[0], 7 if kind == "at" else 8, 0.05 if kind == "gc" else 0.0),
                          ao=(0.8, 0.2, 12), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18))
    return parts


def dna_single_strand(q):
    """One sugar-phosphate backbone (loose coil along Y, 12 bases) with exposed bases pointing in; parts base-a/t/g/c."""
    n = 12
    R, rise = 0.45, 0.24
    npts = res(10 * n, q, 14) + 1
    y = np.linspace(-n * rise / 2, n * rise / 2, npts)
    th = (y + n * rise / 2) / rise * 2 * np.pi / 7.5
    path = np.stack([R * np.cos(th), y, R * np.sin(th)], 1)
    rad = 0.085 * (1 + 0.15 * np.cos((y + n * rise / 2) / rise * 2 * np.pi))
    bs, tv, av = geo.tube_ta(path, rad, res(12, q, 4), cap=3)
    bb = part("backbone", bs, _neutral_col(bs[0], 11), ao=(0.8, 0.3, 14), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)
    bb.aux, bb.aux2 = tv, av
    parts = [bb]
    seq = "ATGCGATCCGTA"
    groups = {c: [] for c in "atgc"}
    for i, ch in enumerate(seq):
        yy = -n * rise / 2 + (i + 0.5) * rise
        t0 = (yy + n * rise / 2) / rise * 2 * np.pi / 7.5
        out = np.array([np.cos(t0), 0.0, np.sin(t0)])
        tang = normalize(np.cross(out, (0, 1, 0)))
        purine = ch in "AG"
        stub = geo.tube(np.stack([out * R * 0.88 + [0, yy, 0], out * R * 0.58 + [0, yy, 0], out * R * 0.36 + [0, yy, 0]]), 0.036, res(8, q, 4), cap=2)
        L = 0.24 if purine else 0.17
        base = blob(res(8, q, 2), (L, 0.04, 0.13), seed=i, amp=0.05,
                    pos=out * (R * 0.36 - L * 0.7) + [0, yy, 0], rot=np.stack([-out, (0, 1, 0), np.cross(-out, (0, 1, 0))], 1))
        groups[ch.lower()] += [stub, base] if q > 0.45 else [base]
    for c in "atgc":
        s = geo.merge(*groups[c])
        parts.append(part("base-" + c, s, _neutral_col(s[0], 20 + ord(c)), ao=(0.75, 0.2, 12), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18))
    return parts


# ----------------------------------------------------------------------------------------------- enzymes
def helicase(q):
    """Ring-shaped hexamer (axis Y, outer radius ~0.85, central channel radius ~0.24, 0.55 tall); the DNA passes along Y."""
    lobes, collars = [], []
    ids = []
    for i in range(6):
        a = 2 * np.pi * i / 6
        c = np.array([0.56 * np.cos(a), 0.0, 0.56 * np.sin(a)])
        rot = np.stack([normalize(c), (0, 1, 0), normalize(np.cross(c, (0, 1, 0)))], 1)
        lobes.append(blob(res(14, q, 5), (0.30, 0.26, 0.255), seed=i, amp=0.1, pos=c, rot=rot))
        ids.append(i)
        collars.append(blob(res(8, q, 3), (0.13, 0.10, 0.12), seed=10 + i, amp=0.12, pos=c * 1.25 + np.array([0, 0.22, 0])))
    lv = geo.merge(*lobes)
    cid = np.concatenate([np.full(len(l[0]), i / 5.0) for l, i in zip(lobes, ids)])
    col = ramp(np.clip(0.75 * cid + 0.25 * (0.5 + 0.5 * noise.fbm(lv[0] * 3, 4, 1.0, 2)), 0, 1),
               [(0, "#2a8a8a"), (0.35, "#3fb0a0"), (0.7, "#6ac8b8"), (1, "#9ad8c8")])
    cv = geo.merge(*collars)
    return [part("subunits", lv, col, ao=(0.85, 0.3, 16), tint=(0.45, 0.55, 0.55)),
            part("tails", cv, ramp(0.5 + 0.5 * noise.fbm(cv[0] * 4, 5, 1.0, 2), [(0, "#e8a040"), (1, "#f6cc78")]), ao=(0.6, 0.2, 10),
                 tint=(0.6, 0.45, 0.3))]


def dna_polymerase(q):
    """Right-hand shaped enzyme (palm, fingers, thumb) around a DNA groove along Y; origin = groove centre; ~1.6 tall."""
    palm = blob(res(20, q, 6), (0.72, 0.80, 0.46), seed=1, amp=0.08, pos=(0.0, 0.0, -0.46))
    fingers = blob(res(18, q, 6), (0.34, 0.74, 0.40), seed=2, amp=0.09, pos=(-0.58, 0.0, 0.2), rot=geo.rot_axis((0, 1, 0), 15))
    thumb = blob(res(18, q, 6), (0.34, 0.72, 0.42), seed=3, amp=0.09, pos=(0.58, 0.05, 0.22), rot=geo.rot_axis((0, 1, 0), -15))
    bridge = blob(res(10, q, 4), (0.5, 0.2, 0.22), seed=4, amp=0.1, pos=(0.0, -0.72, 0.0))
    site = blob(res(8, q, 3), (0.1, 0.10, 0.10), seed=5, amp=0.08, pos=(0.0, 0.05, -0.12))
    out = []
    for name, s, pal in (("palm", geo.merge(palm, bridge), [(0, "#c24a8c"), (0.5, "#e06aa8"), (1, "#f4a4cc")]),
                         ("fingers", fingers, [(0, "#8a48c0"), (0.5, "#a868d8"), (1, "#cca0ec")]),
                         ("thumb", thumb, [(0, "#d08a30"), (0.5, "#eaa84c"), (1, "#f6cc86")])):
        out.append(part(name, s, ramp(0.5 + 0.5 * noise.fbm(s[0] * 2.2, 6, 1.0, 3), pal), ao=(0.85, 0.35, 16), tint=(0.5, 0.38, 0.5)))
    out.append(part("active-site", site, ramp(0.5 + 0.5 * noise.fbm(site[0] * 6, 7, 1.0, 2), [(0, "#3fb0d8"), (1, "#9ae0f4")]), ao=(0.4, 0.1, 6),
                    tint=(0.6, 0.6, 0.7)))
    return out


def rna_polymerase(q):
    """Larger enzyme (about 2 tall): core, two jaws (clamp and pincer) leaving a groove for DNA along Y, a bubble chamber and an
    RNA exit tube. Origin = centre of the transcription bubble."""
    core = blob(res(20, q, 6), (0.95, 0.86, 0.62), seed=1, amp=0.09, pos=(0.0, 0.0, -0.62))
    jaw_a = blob(res(16, q, 6), (0.38, 0.92, 0.44), seed=2, amp=0.1, pos=(-0.62, 0.0, 0.22), rot=geo.rot_axis((0, 1, 0), 18))
    jaw_b = blob(res(16, q, 6), (0.36, 0.84, 0.44), seed=3, amp=0.1, pos=(0.62, 0.05, 0.22), rot=geo.rot_axis((0, 1, 0), -18))
    lid = blob(res(10, q, 4), (0.55, 0.16, 0.2), seed=4, amp=0.1, pos=(0.0, 0.84, -0.02))
    path = geo.catmull([(0.0, -0.1, -1.0), (0.1, -0.4, -1.28), (0.3, -0.75, -1.4)], res(6, q, 2))
    exit_tube = geo.tube(path, np.linspace(0.13, 0.09, len(path)), res(10, q, 4), cap=3)
    bub = [blob(res(7, q, 3), (0.09,) * 3, seed=i, amp=0.1, pos=(0.0, 0.14 * (i - 1), -0.02)) for i in range(3)]
    parts = []
    for name, s, pal in (("core", geo.merge(core, lid), [(0, "#6a48b8"), (0.5, "#8a68d4"), (1, "#b8a0ec")]),
                         ("jaws", geo.merge(jaw_a, jaw_b), [(0, "#c8503e"), (0.5, "#e8745a"), (1, "#f6aa8c")])):
        parts.append(part(name, s, ramp(0.5 + 0.5 * noise.fbm(s[0] * 2.0, 8, 1.0, 3), pal), ao=(0.85, 0.35, 16), tint=(0.5, 0.38, 0.55)))
    parts.append(part("rna-exit", exit_tube, ramp(0.5 + 0.5 * noise.fbm(exit_tube[0] * 4, 9, 1.0, 2), [(0, "#e8a038"), (1, "#f8d070")]),
                      ao=(0.6, 0.2, 10), tint=(0.6, 0.45, 0.3)))
    bv = geo.merge(*bub)
    parts.append(part("bubble", bv, ramp(0.5 + 0.5 * noise.fbm(bv[0] * 6, 10, 1.0, 2), [(0, "#3fb0d8"), (1, "#a0e4f6")]), ao=(0.4, 0.1, 6),
                      tint=(0.6, 0.6, 0.7)))
    return parts


# ----------------------------------------------------------------------------------------------- small molecules and chains
def nucleotide(q):
    """Phosphate - sugar - base unit (about 1.1 across, flat in the XY plane). Tint the `base` part by base type."""
    ph = [blob(res(10, q, 4), (0.15, 0.15, 0.15), seed=1, amp=0.05, pos=(-0.42, 0.28, 0.0))]
    for k in range(3):
        a = 2 * np.pi * k / 3
        ph.append(blob(res(6, q, 3), (0.06,) * 3, seed=k, amp=0.05, pos=(-0.42 + 0.17 * np.cos(a), 0.28 + 0.17 * np.sin(a), 0.07 * (k - 1))))
    pv = geo.merge(*ph)
    sug = blob(res(12, q, 4), (0.17, 0.17, 0.09), seed=4, amp=0.08, pos=(0.0, 0.0, 0.0))
    link1 = geo.tube(np.stack([(-0.3, 0.2, 0.0), (-0.18, 0.12, 0.0), (-0.09, 0.05, 0.0)]), 0.04, res(8, q, 4), cap=2)
    sv = geo.merge(sug, link1)
    link2 = geo.tube(np.stack([(0.1, -0.08, 0.0), (0.2, -0.13, 0.0), (0.3, -0.17, 0.0)]), 0.04, res(8, q, 4), cap=2)
    b1 = blob(res(12, q, 4), (0.20, 0.17, 0.06), seed=5, amp=0.06, pos=(0.5, -0.2, 0.0))
    b2 = blob(res(10, q, 4), (0.14, 0.13, 0.055), seed=6, amp=0.06, pos=(0.76, -0.06, 0.0))
    bv = geo.merge(b1, b2, link2)
    return [part(n, s, _neutral_col(s[0], 30 + i), ao=(0.75, 0.2, 12), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)
            for i, (n, s) in enumerate((("phosphate", pv), ("sugar", sv), ("base", bv)))]


def mrna_strand(q):
    """Loopy single-strand ribbon, unit length along +X from x = 0 (5' cap) to x = 1, with 12 codons of three beads."""
    n = res(200, q, 40)
    t = np.linspace(0, 1, n)
    path = np.stack([t + 0.012 * np.sin(2 * np.pi * 13 * t), 0.042 * np.sin(2 * np.pi * 5 * t), 0.042 * np.cos(2 * np.pi * 5 * t)], 1)
    asp = np.full(n, 2.4)
    s, tv, av = geo.tube_ta(path, 0.0075, res(8, q, 4), cap=3, aspect=asp)
    st = part("strand", s, _neutral_col(s[0] * 12, 41), ao=(0.7, 0.1, 10), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)
    st.aux, st.aux2 = tv, av
    beads, cols = [], []
    pal = ["#f0a0c0", "#7cc4ee", "#f4cc70"]
    for k in range(12):
        tc = (k + 0.5) / 12
        for j in (range(3) if q > 0.45 else (1,)):
            tt = tc + (j - 1) * 0.0115
            i = int(np.clip(tt * (n - 1), 0, n - 1))
            beads.append(blob(res(5, q, 2), (0.0125,) * 3, seed=k * 3 + j, amp=0.05, pos=path[i] + np.array([0, 0.012, 0.0])))
            cols.append(pal[(k + j) % 3])
    bv = geo.merge(*beads)
    colr = np.concatenate([np.tile(np.array([int(c[i:i + 2], 16) / 255 for i in (1, 3, 5)]), (len(b[0]), 1)) for b, c in zip(beads, cols)])
    cap = blob(res(8, q, 3), (0.022,) * 3, seed=3, amp=0.05, pos=(-0.015, 0.0, 0.042))
    cv = geo.merge(cap)
    return [st, part("codons", bv, colr * (0.9 + 0.2 * noise.fbm(bv[0] * 30, 2, 1.0, 2))[:, None], ao=(0.5, 0.05, 8), tint=(0.6, 0.5, 0.5)),
            part("cap", cv, ramp(np.full(len(cv[0]), 0.5), [(0, "#e8802e"), (1, "#e8802e")]), ao=(0.5, 0.05, 6), tint=(0.7, 0.5, 0.3))]


def trna(q):
    """L-shaped 3D tRNA. Origin = outer corner of the L; acceptor arm up +Y (CCA tail and amino acid at y ~ 1.1), anticodon arm along +X
    (three anticodon beads hanging towards -Y at x ~ 0.9). The amino-acid ball is its own part (`amino-acid`, neutral, tint it)."""
    arm1 = geo.tube(geo.catmull([(0, 0.0, 0), (0, 0.3, 0), (0, 0.6, 0), (0, 0.9, 0)], res(7, q, 2)), 0.085, res(14, q, 5), cap=3)
    arm2 = geo.tube(geo.catmull([(0.0, 0, 0), (0.3, 0, 0), (0.6, 0, 0), (0.85, 0, 0)], res(7, q, 2)), 0.085, res(14, q, 5), cap=3)
    corner = blob(res(12, q, 4), (0.17, 0.17, 0.12), seed=1, amp=0.12, pos=(0.04, 0.04, 0.0))
    loops = [blob(res(10, q, 4), (0.16, 0.12, 0.12), seed=2, amp=0.12, pos=(-0.1, 0.78, 0.0)),
             blob(res(10, q, 4), (0.12, 0.16, 0.12), seed=3, amp=0.12, pos=(0.78, 0.12, 0.0))]
    body = geo.merge(arm1, arm2, corner, *loops)
    antic = [blob(res(7, q, 3), (0.065,) * 3, seed=i, amp=0.08, pos=(0.84 + 0.04 * i, -0.18, 0.14 * (i - 1))) for i in range(3)]
    av = geo.merge(*antic)
    tail = geo.tube(np.stack([(0, 0.88, 0), (0.02, 1.0, 0.0), (0.0, 1.1, 0.0)]), 0.04, res(8, q, 4), cap=2)
    aa = blob(res(12, q, 4), (0.17,) * 3, seed=9, amp=0.06, pos=(0.0, 1.27, 0.0))
    return [part("body", body, ramp(0.5 + 0.5 * noise.fbm(body[0] * 3, 4, 1.0, 3), [(0, "#1f8a6a"), (0.5, "#3fb08a"), (1, "#8ad8b4")]),
                 ao=(0.85, 0.3, 16), tint=(0.45, 0.55, 0.5)),
            part("anticodon", av, ramp(0.5 + 0.5 * noise.fbm(av[0] * 6, 5, 1.0, 2), [(0, "#d04a7a"), (1, "#f09cb8")]), ao=(0.5, 0.1, 8), tint=(0.6, 0.4, 0.5)),
            part("acceptor", tail, ramp(0.5 + 0.5 * noise.fbm(tail[0] * 6, 6, 1.0, 2), [(0, "#e8a038"), (1, "#f8d070")]), ao=(0.5, 0.1, 8), tint=(0.6, 0.45, 0.3)),
            part("amino-acid", aa, _neutral_col(aa[0], 7), ao=(0.6, 0.15, 10), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)]


def amino_acid(q):
    """A single amino-acid residue bead (radius 0.22) with N- and C-terminal stubs along +-X for chaining; tint `residue`."""
    r = blob(res(14, q, 5), (0.22,) * 3, seed=1, amp=0.05)
    stubs = geo.merge(geo.tube(np.stack([(-0.18, 0, 0), (-0.32, 0, 0), (-0.45, 0, 0)]), 0.05, res(9, q, 4), cap=3),
                      geo.tube(np.stack([(0.18, 0, 0), (0.32, 0, 0), (0.45, 0, 0)]), 0.05, res(9, q, 4), cap=3))
    return [part("residue", r, _neutral_col(r[0], 50), ao=(0.7, 0.2, 12), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18),
            part("stubs", stubs, _neutral_col(stubs[0], 51, -0.1), ao=(0.6, 0.15, 10), tint=(0.62, 0.6, 0.66))]


def polypeptide_chain(q):
    """Chain of 20 residues (about 2.4 long along X, origin = centre): neutral backbone tube plus coloured residue beads with side-chain blobs."""
    n = 20
    t = np.linspace(0, 1, n)
    ctrl = np.stack([(t - 0.5) * 2.2 + 0.10 * np.sin(t * 17), 0.30 * np.sin(2 * np.pi * 2.5 * t), 0.30 * np.cos(2 * np.pi * 2.5 * t)], 1)
    path = geo.catmull(ctrl, res(8, q, 2))
    bs = geo.tube(path, 0.035, res(9, q, 4), cap=3)
    bk = part("backbone", bs, _neutral_col(bs[0] * 2, 61), ao=(0.7, 0.2, 10), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)
    rng = np.random.default_rng(5)
    pal = ["#e8604a", "#f0a040", "#f4d060", "#8ac860", "#3fb08a", "#3fb0d8", "#5a7ed8", "#8a66cc", "#c458a8", "#f08aa0"]
    beads, cols = [], []
    for i in range(n):
        c = ctrl[i]
        out = normalize(np.array([0.0, c[1], c[2]]) + rng.normal(0, 0.25, 3))
        col = pal[(i * 3 + int(rng.integers(0, 3))) % len(pal)]
        beads.append(blob(res(9, q, 3), (0.095,) * 3, seed=i, amp=0.06, pos=c))
        if q > 0.45:
            beads.append(blob(res(7, q, 3), (0.075 + 0.03 * rng.random(),) * 3, seed=i + 40, amp=0.1, pos=c + out * 0.17))
            cols += [col, col]
        else:
            cols += [col]
    bv = geo.merge(*beads)
    colr = np.concatenate([np.tile(np.array([int(c[k:k + 2], 16) / 255 for k in (1, 3, 5)]), (len(b[0]), 1)) for b, c in zip(beads, cols)])
    colr = np.clip(colr * (0.88 + 0.24 * (0.5 + 0.5 * noise.fbm(bv[0] * 4, 3, 1.0, 2)))[:, None], 0, 1)
    return [bk, part("residues", bv, colr, ao=(0.75, 0.2, 12), tint=(0.5, 0.4, 0.5))]


def ribosome_subunits(q):
    """Large (top) and small (bottom) subunit with the mRNA channel along X between them and the A / P / E notches (x = +0.34 / 0 / -0.34)
    on the large subunit's underside. Origin = centre of the mRNA channel."""
    def lumpy(n, radii, centre, seed, dents=(), flat_bottom=False, flat_top=False, groove=False):
        d, f = geo.cube_sphere(n)
        k = 1 + 0.07 * noise.fbm(d, seed, 1.6, 3) + 0.02 * noise.perlin(d, seed + 4, 6.0)
        v = d * k[:, None] * np.asarray(radii)
        if flat_bottom:
            v[:, 1] = np.where(v[:, 1] < -0.1 * radii[1], v[:, 1] * 0.55 - 0.05 * radii[1], v[:, 1])
        if flat_top:
            v[:, 1] = np.where(v[:, 1] > 0.1 * radii[1], v[:, 1] * 0.55 + 0.04 * radii[1], v[:, 1])
        for (x, z, rad, depth) in dents:
            m = (v[:, 1] < -0.2 * radii[1]) if flat_bottom else (v[:, 1] > 0.2 * radii[1])
            dd = np.hypot(v[:, 0] - x, v[:, 2] - z)
            v[:, 1] += (depth if flat_bottom else -depth) * np.exp(-(dd / rad) ** 2) * m
        if groove:
            m = v[:, 1] > 0.1 * radii[1]
            v[:, 1] -= 0.075 * np.exp(-(v[:, 2] / 0.11) ** 2) * m
        return v + np.asarray(centre), f
    large = lumpy(res(24, q, 8), (0.85, 0.62, 0.74), (0.0, 0.40, 0.0), 1, dents=((0.34, 0.0, 0.15, 0.12), (0.0, 0.0, 0.15, 0.12), (-0.34, 0.0, 0.15, 0.12)),
                  flat_bottom=True)
    small = lumpy(res(20, q, 7), (0.78, 0.30, 0.50), (0.0, -0.31, 0.0), 2, flat_top=True, groove=True)
    sites = []
    for x, col in ((0.34, "#6ac86a"), (0.0, "#4a8ae0"), (-0.34, "#e05a5a")):
        sites.append(blob(res(7, q, 3), (0.07, 0.03, 0.07), seed=int(x * 10) + 3, amp=0.05, pos=(x, -0.0, 0.0)))
    cols = np.concatenate([np.tile(np.array([int(c[k:k + 2], 16) / 255 for k in (1, 3, 5)]), (len(s[0]), 1))
                           for s, c in zip(sites, ("#6ac86a", "#4a8ae0", "#e05a5a"))])
    sv = geo.merge(*sites)
    return [part("large", large, ramp(0.5 + 0.5 * noise.fbm(large[0] * 2.4, 3, 1.0, 3), [(0, "#e0507a"), (0.5, "#f27a8c"), (1, "#fba898")]),
                 ao=(0.85, 0.4, 16), tint=(0.55, 0.3, 0.45)),
            part("small", small, ramp(0.5 + 0.5 * noise.fbm(small[0] * 2.4, 4, 1.0, 3), [(0, "#4f5cd0"), (0.5, "#7a82e6"), (1, "#a8b0f4")]),
                 ao=(0.85, 0.4, 16), tint=(0.45, 0.4, 0.65)),
            part("sites", sv, cols, ao=(0.4, 0.1, 6), tint=(0.6, 0.55, 0.55))]


for _a, _ps in (("dna-helix", ("backbone-a", "backbone-b", "bp-at", "bp-gc")),
                ("dna-single-strand", ("backbone", "base-a", "base-t", "base-g", "base-c")),
                ("nucleotide", ("phosphate", "sugar", "base")), ("mrna-strand", ("strand",)), ("amino-acid", ("residue", "stubs")),
                ("polypeptide-chain", ("backbone",))):
    for _p in _ps:
        neutral(_a, _p, w=0.05, relief=0.003, along=True, axis=(0, 1, 0) if _a != "mrna-strand" else (1, 0, 0))
neutral("trna", "amino-acid", w=0.05, relief=0.003)
for _a, _p in (("helicase", "subunits"), ("helicase", "tails"), ("dna-polymerase", "palm"), ("dna-polymerase", "fingers"),
               ("dna-polymerase", "thumb"), ("dna-polymerase", "active-site"), ("rna-polymerase", "core"), ("rna-polymerase", "jaws"),
               ("rna-polymerase", "rna-exit"), ("rna-polymerase", "bubble"), ("trna", "body"), ("trna", "anticodon"), ("trna", "acceptor"),
               ("mrna-strand", "codons"), ("mrna-strand", "cap"), ("polypeptide-chain", "residues"), ("ribosome-subunits", "large"),
               ("ribosome-subunits", "small"), ("ribosome-subunits", "sites")):
    texmotifs.HINTS[(_a, _p)] = dict(w=0.09 if _a in ("dna-polymerase", "rna-polymerase", "ribosome-subunits") else 0.05, relief=0.004,
                                      contour=0.7)

META = {
    "dna-helix": dict(pivot="centre of the segment", axes="helix axis Y, 20 base pairs = 2 turns, 3.2 long, radius 0.5; flat-cut ends so copies stack seamlessly every 3.2 in Y (phase continues); "
                      "parts backbone-a, backbone-b, bp-at (A-T rungs), bp-gc (G-C rungs, three H-bond dots)", units="um (exaggerated)",
                      tintable=True, tintParts=["backbone-a", "backbone-b", "bp-at", "bp-gc"], neutralAlbedo=True),
    "dna-single-strand": dict(pivot="centre of the strand", axes="loose coil along Y, 12 bases (ATGCGATCCGTA) pointing towards the axis; parts backbone, base-a/t/g/c",
                              units="um", tintable=True, tintParts=["backbone", "base-a", "base-t", "base-g", "base-c"], neutralAlbedo=True),
    "helicase": dict(pivot="ring centre", axes="ring in XZ, axis Y (DNA passes along Y), outer radius ~0.85, channel radius ~0.24, 0.55 tall; six subunits", units="um", tintable=False),
    "dna-polymerase": dict(pivot="centre of the DNA groove", axes="groove along Y between fingers (-X) and thumb (+X), palm at -Z, open towards +Z; ~1.6 tall; active-site marker in the groove",
                           units="um", tintable=False),
    "rna-polymerase": dict(pivot="centre of the transcription bubble", axes="DNA groove along Y between the jaws, core at -Z, open towards +Z, RNA exit tube towards -Z/-Y; ~2 tall",
                           units="um", tintable=False),
    "nucleotide": dict(pivot="sugar centre", axes="flat in XY: phosphate at (-0.42, 0.28), sugar at the origin, base at (+0.5..0.8, -0.2); ~1.1 across; tint the base part",
                       units="um", tintable=True, tintParts=["base"], neutralAlbedo=True),
    "mrna-strand": dict(pivot="5' end (x = 0)", axes="unit length along +X, loopy ribbon (radius ~0.04), 12 codons of three beads (coloured), 5' cap at x = 0; scale X to fit",
                        units="1 along X", tintable=True, tintParts=["strand"], neutralAlbedo=True),
    "trna": dict(pivot="outer corner of the L", axes="acceptor arm up +Y (CCA tail then amino-acid ball at y~1.27), anticodon arm along +X with three anticodon beads at x~0.9 hanging towards -Y",
                 units="um", tintable=True, tintParts=["amino-acid"], neutralAlbedo=True),
    "amino-acid": dict(pivot="bead centre", axes="chain along X (N-terminal stub -X, C-terminal stub +X), bead radius 0.22; tint the residue part", units="um",
                       tintable=True, tintParts=["residue", "stubs"], neutralAlbedo=True),
    "polypeptide-chain": dict(pivot="chain centre", axes="~2.4 long along X, 20 residues with coloured side chains (part residues), neutral backbone (tintable)", units="um",
                              tintable=True, tintParts=["backbone"], neutralAlbedo=True),
    "ribosome-subunits": dict(pivot="centre of the mRNA channel", axes="mRNA channel along X between the subunits; large subunit above (+Y) with A / P / E notches at x = +0.34 / 0 / -0.34 (coloured marker part `sites`), "
                              "small subunit below (-Y); separate meshes `large` and `small`; ~1.7 wide, ~1.3 tall", units="um", tintable=False),
}
TEXTURE_SIZES = {"dna-helix": 1024, "dna-single-strand": 1024, "helicase": 1024, "dna-polymerase": 1024, "rna-polymerase": 1024,
                 "nucleotide": 512, "mrna-strand": 512, "trna": 1024, "amino-acid": 512, "polypeptide-chain": 1024, "ribosome-subunits": 1024}
BUILDERS = {"dna-helix": dna_helix, "dna-single-strand": dna_single_strand, "helicase": helicase, "dna-polymerase": dna_polymerase,
            "rna-polymerase": rna_polymerase, "nucleotide": nucleotide, "mrna-strand": mrna_strand, "trna": trna, "amino-acid": amino_acid,
            "polypeptide-chain": polypeptide_chain, "ribosome-subunits": ribosome_subunits}
