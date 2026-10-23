"""Batch 4b (v0.6 nervous): neuron, synapse terminal, neurotransmitter, voltage-gated Na+/K+ channels (closed/open), reflex arc parts."""
import numpy as np

import geo
import noise
import texmotifs
from paint import ramp
from shapes import res, part, blob, slab, normalize
from mod_membrane import neutral, NEUTRAL, _helix
from mod_muscle import _solid, _neutral_col


def _col(s, seed, pal):
    return ramp(0.5 + 0.5 * noise.fbm(s[0] * 2.5, seed, 1.0, 3), pal)


# ----------------------------------------------------------------------------------------------- neuron
def _branch(rng, p0, d0, length, r0, depth, q, out, kids=2):
    d0 = normalize(d0)
    mid = p0 + d0 * length * 0.5 + rng.normal(0, 0.07, 3)
    p1 = p0 + d0 * length + rng.normal(0, 0.06, 3)
    path = geo.catmull([p0, mid, p1], res(6, q, 2))
    rad = np.linspace(r0, r0 * 0.62, len(path))
    out.append(geo.tube(path, rad, res(9, q, 3), cap=1 if q < 0.4 else 3))
    if depth > 0:
        for k in range(kids):
            side = normalize(np.cross(d0, rng.normal(0, 1, 3)))
            nd = normalize(d0 + side * rng.uniform(0.5, 0.95) * (1 if k else -1))
            _branch(rng, p1, nd, length * rng.uniform(0.55, 0.75), r0 * 0.6, depth - 1, q, out, kids)


def neuron(q):
    """Multipolar neuron, origin = soma centre, axon along +X (to x ~ 10.5): translucent soma with nucleus and Nissl granules, branching dendrites,
    axon (neutral, tintable for the action potential), six myelin segments with nodes of Ranvier, branching axon terminals with boutons."""
    rng = np.random.default_rng(88)
    sd, sf = geo.cube_sphere(res(24, q, 8))
    soma = (sd * (0.62 * (1 + 0.06 * noise.fbm(sd, 3, 1.5, 3)))[:, None], sf)
    nuc = blob(res(14, q, 5), (0.3, 0.28, 0.3), seed=2, amp=0.06, pos=(-0.05, 0.03, 0.0))
    nucleolus = blob(res(9, q, 3), (0.1,) * 3, seed=3, amp=0.08, pos=(0.02, 0.06, 0.18))
    nissl = [blob(res(5, q, 2), (0.05, 0.035, 0.035), seed=i, amp=0.1, pos=normalize(rng.normal(0, 1, 3)) * rng.uniform(0.34, 0.52)) for i in range(int(36 * min(q, 1) ** 1.5) + 6)]
    dend = []
    dirs = [(-1, 0.4, 0.2), (-0.9, -0.5, 0.4), (-0.7, 0.2, -0.8), (-0.6, -0.6, -0.5), (-0.2, 1, 0.1), (-0.3, -0.9, -0.2), (0.0, 0.3, 1.0), (0.1, -0.3, -1.0)]
    for dv in dirs:
        d = normalize(np.array(dv))
        _branch(rng, d * 0.55, d, rng.uniform(1.1, 1.7), 0.115, 2 if q > 0.4 else 1, q, dend)
    dv_ = geo.merge(*dend)
    xs = np.linspace(0.5, 10.6, res(120, q, 30))
    curve = lambda x: np.stack([x, 0.14 * np.sin(0.55 * x + 0.4) + 0.05 * np.sin(1.7 * x), 0.11 * np.cos(0.42 * x)], 1)
    hill = geo.tube(curve(np.linspace(0.45, 1.5, res(20, q, 8))), np.linspace(0.2, 0.065, res(20, q, 8)), res(14, q, 5), cap=0 if False else 3)
    axp = curve(xs)
    ax, tv = geo.tube_t(axp, 0.062, res(12, q, 4), cap=3)
    sheaths = []
    for k in range(6):
        x0 = 1.9 + k * 1.28
        px = np.linspace(x0, x0 + 1.12, res(26, q, 8))
        rr = 0.145 * (0.82 + 0.18 * np.sin(np.linspace(0.0, np.pi, len(px))) ** 0.35)
        sheaths.append(geo.tube(curve(px), rr, res(18, q, 6), cap=3))
    mv = geo.merge(*sheaths)
    end = axp[-1]
    term, bout = [], []
    for k in range(5):
        a = 2 * np.pi * k / 5
        d = normalize(np.array([1.0, 0.7 * np.cos(a), 0.7 * np.sin(a)]))
        p1 = end + d * 0.75
        term.append(geo.tube(geo.catmull([end, end + d * 0.4 + rng.normal(0, 0.03, 3), p1], res(5, q, 2)), np.linspace(0.055, 0.04, res(5, q, 2) * 2 + 1)[:res(5, q, 2) * 2 + 1], res(8, q, 3), cap=3))
        bout.append(blob(res(10, q, 3), (0.15, 0.13, 0.13), seed=k, amp=0.1, pos=p1 + d * 0.08))
    tv_ = geo.merge(*term, *bout)
    nis = geo.merge(*nissl)
    ax_all = geo.merge(ax, hill)
    axb = _neutral_col(ax_all, 5)
    pa = part("axon", ax_all, axb, ao=(0.7, 0.2, 12), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)
    return [part("soma", soma, _col(soma, 1, [(0, "#e8a890"), (0.5, "#f4c4ac"), (1, "#fbe0cc")]), mat="gel", alpha=0.42, occ=False, ao=(0.4, 0.4, 8), tint=(0.7, 0.55, 0.5)),
            part("nucleus", geo.merge(nuc, nucleolus), _col(geo.merge(nuc, nucleolus), 2, [(0, "#6a46b0"), (0.5, "#8a66cc"), (1, "#b898e6")]), ao=(0.7, 0.2, 12), tint=(0.5, 0.4, 0.6)),
            part("nissl", nis, _col(nis, 3, [(0, "#8a3a8a"), (1, "#d078c0")]), ao=(0.5, 0.1, 8), tint=(0.55, 0.4, 0.5)),
            part("dendrites", dv_, _col(dv_, 4, [(0, "#d98a2a"), (0.5, "#f0aa44"), (1, "#f8d082")]), ao=(0.8, 0.3, 14), tint=(0.55, 0.4, 0.3)),
            pa,
            part("myelin", mv, _col(mv, 6, [(0, "#e8d8a8"), (0.5, "#f4ead0"), (1, "#fbf6e6")]), ao=(0.8, 0.3, 14), tint=(0.6, 0.55, 0.45)),
            part("terminals", tv_, _col(tv_, 7, [(0, "#c8408a"), (0.5, "#e868a8"), (1, "#f4a0c8")]), ao=(0.8, 0.3, 12), tint=(0.55, 0.38, 0.45))]


# ----------------------------------------------------------------------------------------------- synapse
def synapse_terminal(q):
    """Axon bouton (translucent, +Y) with synaptic vesicles, mitochondrion and active zone; the 0.12 wide cleft at y ~ 0.04 (origin = cleft centre);
    postsynaptic spine head (-Y) with receptors and the post-synaptic density, spine neck down to y = -1.9."""
    rng = np.random.default_rng(21)
    d, f = geo.cube_sphere(res(22, q, 8))
    v = d * np.array([1.25, 0.85, 1.25]) * (1 + 0.04 * noise.fbm(d, 3, 1.5, 3))[:, None] + np.array([0, 0.98, 0])
    v[:, 1] = np.where(v[:, 1] < 0.2, 0.1 + (v[:, 1] - 0.2) * 0.12, v[:, 1])       # flat underside facing the cleft
    bouton = (v, f)
    az = blob(res(10, q, 4), (0.62, 0.05, 0.62), seed=2, amp=0.05, pos=(0.0, 0.14, 0.0))
    ves = []
    nv = int(17 * min(q, 1) ** 1.2) + 5
    for i in range(nv):
        if i < 4:
            c = np.array([0.45 * np.cos(i * 1.7), 0.3, 0.45 * np.sin(i * 1.7)])
        else:
            c = np.array([rng.uniform(-0.9, 0.9), rng.uniform(0.55, 1.45), rng.uniform(-0.9, 0.9)])
            if np.hypot(c[0], c[2]) > 0.95:
                c[0] *= 0.6
                c[2] *= 0.6
        ves.append(blob(res(8, q, 3), (0.13,) * 3, seed=i, amp=0.04, pos=c))
    vv = geo.merge(*ves)
    mito = blob(res(10, q, 4), (0.36, 0.2, 0.2), seed=4, amp=0.1, pos=(0.55, 1.35, -0.25), rot=geo.rot_axis((0, 0, 1), 20))
    sp = geo.cube_sphere(res(20, q, 7))
    sv = sp[0] * np.array([1.4, 0.42, 1.4]) * (1 + 0.04 * noise.fbm(sp[0], 5, 1.5, 3))[:, None] + np.array([0, -0.42, 0])
    sv[:, 1] = np.where(sv[:, 1] > -0.03, -0.03 + (sv[:, 1] + 0.03) * 0.12, sv[:, 1])
    spine = (sv, sp[1])
    neck = geo.tube(geo.catmull([(0, -0.6, 0), (0.05, -1.1, 0.0), (0, -1.5, 0.05), (0, -1.9, 0)], res(7, q, 2)), np.linspace(0.3, 0.2, res(7, q, 2) * 3 + 1), res(14, q, 5), cap=3)
    psd = blob(res(10, q, 4), (0.7, 0.05, 0.7), seed=6, amp=0.05, pos=(0.0, -0.13, 0.0))
    rec = []
    for i in range(7 if q > 0.4 else 5):
        a = 2 * np.pi * i / 7
        r = 0.12 + 0.5 * (i % 2) + 0.2
        c = np.array([r * np.cos(a * 1.3), -0.02, r * np.sin(a * 1.3)]) if i else np.array([0.0, -0.02, 0.0])
        rec.append(blob(res(8, q, 3), (0.1, 0.07, 0.1), seed=i, amp=0.1, pos=c))
        rec.append(geo.tube(np.stack([c + [0, -0.02, 0], c + [0, 0.04, 0], c + [0, 0.1, 0]]), 0.055, res(8, q, 3), cap=3))
    rv = geo.merge(*rec)
    parts = [part("bouton", bouton, _col(bouton, 1, [(0, "#d890b8"), (0.5, "#ecb0cc"), (1, "#f8d8e4")]), mat="gel", alpha=0.4, occ=False, ao=(0.4, 0.4, 8), tint=(0.7, 0.55, 0.6)),
             part("active-zone", az, np.tile(_solid("#7a4a8a"), (len(az[0]), 1)), ao=(0.6, 0.2, 10), tint=(0.5, 0.4, 0.5)),
             _vpart("vesicles", vv), part("mitochondrion", mito, _col(mito, 3, [(0, "#d96a20"), (1, "#f4aa5a")]), ao=(0.7, 0.2, 10), tint=(0.55, 0.38, 0.3)),
             part("postsynaptic", geo.merge(spine, neck), _col(geo.merge(spine, neck), 4, [(0, "#5a9ac0"), (0.5, "#80bad8"), (1, "#b4dcec")]), ao=(0.8, 0.3, 14), tint=(0.45, 0.5, 0.6)),
             part("psd", psd, np.tile(_solid("#3a6a90"), (len(psd[0]), 1)), ao=(0.6, 0.2, 10), tint=(0.45, 0.5, 0.6)),
             part("receptors", rv, _col(rv, 5, [(0, "#2fb09a"), (0.5, "#4ccab0"), (1, "#9ae4d0")]), ao=(0.7, 0.2, 10), tint=(0.45, 0.55, 0.5))]
    return parts


def _vpart(name, s):
    return part(name, s, _neutral_col(s, 9), ao=(0.5, 0.15, 10), tint=(0.62, 0.6, 0.66), speck=0.02, form=0.18)


def neurotransmitter(q):
    """Small ligand (about 0.4 across): a rounded core with two side groups. Neutral albedo, tint per transmitter."""
    core = blob(res(16, q, 5), (0.15, 0.13, 0.12), seed=1, amp=0.12)
    g1 = blob(res(10, q, 4), (0.085, 0.075, 0.075), seed=2, amp=0.1, pos=(0.17, 0.07, 0.03))
    g2 = blob(res(10, q, 4), (0.075, 0.075, 0.07), seed=3, amp=0.1, pos=(-0.15, -0.08, 0.03))
    s = geo.merge(core, g1, g2)
    return [_vpart("ligand", s)]


# ----------------------------------------------------------------------------------------------- channels
def _vgc(q, na, is_open):
    """Voltage-gated channel, pore axis Y, membrane y -0.45..0.45, outside +Y. Four subunits around the pore, voltage-sensor paddles that sit low
    when closed and high / further out when open, a gate ring at the cytoplasmic mouth (narrow when closed, wide when open); Na+ has an inactivation ball."""
    dom, pad, gate = [], [], []
    r_gate = 0.19 if is_open else 0.05
    top_r = 0.19
    for i in range(4):
        a = np.pi / 2 * i + np.pi / 4
        c, s = np.cos(a), np.sin(a)
        for k, off in enumerate((-0.07, 0.07) if q > 0.3 else (0.0,)):     # two pore helices per subunit (one at low LOD)
            rb = (r_gate + 0.16) if is_open else (0.13 + 0.03)
            pts = [((rb) * c - off * s, -0.52, (rb) * s + off * c), ((0.24) * c - off * s, 0.0, (0.24) * s + off * c),
                   ((top_r + 0.1) * c - off * s, 0.52, (top_r + 0.1) * s + off * c)]
            dom.append(_helix(pts, 0.085, q, sides=8, seed=i * 3 + k))
        dom.append(blob(res(10, q, 3), (0.17, 0.4, 0.15), seed=i, amp=0.1, pos=(0.40 * c, 0.0, 0.40 * s), rot=geo.align((0, 1, 0), (0, 1, 0))))
        up = 0.2 if is_open else -0.05
        out = 0.62 if is_open else 0.56
        pad.append(blob(res(9, q, 2), (0.07, 0.2, 0.06), seed=i + 9, amp=0.08, pos=(out * c, up, out * s), rot=geo.align((0, 1, 0), normalize(np.array([0.25 * c, 1.0, 0.25 * s])))))
        gate.append(blob(res(7, q, 2), (0.07, 0.06, 0.07), seed=i + 20, amp=0.06, pos=(r_gate * c, -0.38, r_gate * s)))
    dv, pv, gv = geo.merge(*dom), geo.merge(*pad), geo.merge(*gate)
    pal = [(0, "#6a46b0"), (0.5, "#8a66cc"), (1, "#b898e6")] if na else [(0, "#1f8f8a"), (0.5, "#35b9a9"), (1, "#86dcc4")]
    parts = [part("domains", dv, _col(dv, 1, pal), ao=(0.85, 0.3, 14), tint=(0.5, 0.45, 0.6)),
             part("paddles", pv, _col(pv, 2, [(0, "#d96a20"), (0.5, "#f08c3a"), (1, "#f8b878")]), ao=(0.7, 0.2, 10), tint=(0.55, 0.38, 0.3)),
             part("gate", gv, _col(gv, 3, [(0, "#c8408a"), (1, "#f4a0c8")]), ao=(0.6, 0.2, 10), tint=(0.55, 0.38, 0.45))]
    if na:
        ball_c = np.array([0.18, -0.64, 0.1]) if is_open else np.array([0.55, -0.85, 0.2])
        tether = geo.tube(geo.catmull([(0.38, -0.5, 0.2), tuple((np.array([0.38, -0.5, 0.2]) + ball_c) / 2 + [0.0, -0.12, 0.0]), tuple(ball_c)], res(6, q, 2)), 0.025, res(7, q, 3), cap=2)
        ball = blob(res(9, q, 4), (0.1,) * 3, seed=4, amp=0.06, pos=ball_c)
        bv = geo.merge(ball, tether)
        parts.append(part("ball", bv, _col(bv, 4, [(0, "#e8a020"), (1, "#f8d878")]), ao=(0.6, 0.2, 10), tint=(0.6, 0.45, 0.3)))
    return parts


def na_channel(q):
    return _vgc(q, True, False)


def na_channel_open(q):
    return _vgc(q, True, True)


def k_channel(q):
    return _vgc(q, False, False)


def k_channel_open(q):
    return _vgc(q, False, True)


# ----------------------------------------------------------------------------------------------- reflex arc
def reflex_arc_parts(q):
    """Three pieces side by side along X (pivots in meta.partPivots): skin with a sensory (Pacinian) receptor at x = -3.4, spinal-cord cross-section
    with butterfly grey matter and roots at x = 0, muscle effector with tendons and a motor end plate at x = +3.4."""
    rng = np.random.default_rng(31)
    P = []
    # --- skin + receptor
    ox = -3.4
    epi = slab(res(22, q, 6), 1.2, 1.0, 0.07, seed=3, power=0.45, rim_ruffle=0.04)
    dermis = slab(res(22, q, 6), 1.2, 1.0, 0.24, seed=4, power=0.45, rim_ruffle=0.04)
    epi = (epi[0] + np.array([ox, 0.34, 0]), epi[1])
    dermis = (dermis[0] + np.array([ox, 0.0, 0]), dermis[1])
    rec = blob(res(16, q, 6), (0.26, 0.4, 0.26), seed=5, amp=0.06, pos=(ox + 0.1, -0.05, 0.05), rot=geo.rot_axis((0, 0, 1), 25))
    fib = geo.tube(geo.catmull([(ox + 0.18, -0.4, 0.05), (ox + 0.4, -0.75, 0.1), (ox + 1.2, -0.95, 0.1), (ox + 2.2, -1.0, 0.1)], res(8, q, 2)), 0.035, res(8, q, 3), cap=3)
    P += [part("skin-epidermis", epi, _col(epi, 1, [(0, "#e8b0a0"), (0.5, "#f4cdbd"), (1, "#fbe6d8")]), ao=(0.7, 0.3, 12), tint=(0.6, 0.5, 0.45)),
          part("skin-dermis", dermis, _col(dermis, 2, [(0, "#d87a80"), (0.5, "#ec9aa0"), (1, "#f8c4c4")]), ao=(0.7, 0.3, 12), tint=(0.55, 0.4, 0.4)),
          part("skin-receptor", rec, _col(rec, 3, [(0, "#d8b030"), (0.5, "#f0d060"), (1, "#f8ec9a")]), ao=(0.8, 0.3, 12), tint=(0.6, 0.5, 0.3)),
          part("skin-fibre", fib, _col(fib, 4, [(0, "#d98a2a"), (1, "#f8d082")]), ao=(0.6, 0.2, 10), tint=(0.55, 0.4, 0.3))]
    # --- spinal cord cross-section
    white = slab(res(26, q, 8), 1.25, 0.98, 0.28, seed=6, power=0.5, rim_ruffle=0.03)
    horns = [blob(res(10, q, 4), (0.2, 0.3, 0.16), seed=1, amp=0.1, pos=(-0.35, 0.28, 0.55), rot=geo.rot_axis((0, 1, 0), -25)),
             blob(res(10, q, 4), (0.2, 0.3, 0.16), seed=2, amp=0.1, pos=(0.35, 0.28, 0.55), rot=geo.rot_axis((0, 1, 0), 25)),
             blob(res(10, q, 4), (0.3, 0.3, 0.26), seed=3, amp=0.1, pos=(-0.5, 0.28, -0.3)),
             blob(res(10, q, 4), (0.3, 0.3, 0.26), seed=4, amp=0.1, pos=(0.5, 0.28, -0.3)),
             blob(res(10, q, 4), (0.35, 0.3, 0.2), seed=5, amp=0.08, pos=(0.0, 0.28, 0.0))]
    grey = geo.merge(*horns)
    canal = blob(res(8, q, 3), (0.06, 0.32, 0.06), seed=7, amp=0.05, pos=(0.0, 0.3, 0.0))
    roots = [geo.tube(geo.catmull([(0.45, 0.2, 0.7), (0.9, 0.2, 1.1), (1.5, 0.2, 1.35)], res(6, q, 2)), 0.07, res(8, q, 3), cap=3),
             geo.tube(geo.catmull([(-0.5, 0.2, -0.7), (-0.9, 0.2, -1.1), (-1.7, 0.2, -1.4)], res(6, q, 2)), 0.07, res(8, q, 3), cap=3)]
    gang = blob(res(10, q, 4), (0.2, 0.15, 0.17), seed=8, amp=0.1, pos=(1.05, 0.2, 1.15))
    P += [part("cord-white", white, _col(white, 5, [(0, "#d8d0d8"), (0.5, "#ebe5eb"), (1, "#f8f4f8")]), ao=(0.7, 0.3, 12), tint=(0.6, 0.58, 0.62)),
          part("cord-grey", geo.merge(grey, canal), _col(geo.merge(grey, canal), 6, [(0, "#a88aa8"), (0.5, "#c4a8c4"), (1, "#e0cce0")]), ao=(0.7, 0.2, 10), tint=(0.5, 0.42, 0.5)),
          part("cord-roots", geo.merge(*roots, gang), _col(geo.merge(*roots, gang), 7, [(0, "#d98a2a"), (1, "#f8d082")]), ao=(0.6, 0.2, 10), tint=(0.55, 0.4, 0.3))]
    # --- muscle effector
    ox = 3.4
    belly = blob(res(18, q, 6), (1.05, 0.46, 0.48), seed=9, amp=0.05, pos=(ox, 0.0, 0.0))
    tend = [geo.tube(geo.catmull([(ox + 0.95, 0, 0), (ox + 1.4, 0.0, 0.0), (ox + 1.9, 0.05, 0.0)], res(6, q, 2)), np.linspace(0.2, 0.09, res(6, q, 2) * 2 + 1), res(10, q, 4), cap=3),
            geo.tube(geo.catmull([(ox - 0.95, 0, 0), (ox - 1.4, 0.0, 0.0), (ox - 1.9, -0.05, 0.0)], res(6, q, 2)), np.linspace(0.2, 0.09, res(6, q, 2) * 2 + 1), res(10, q, 4), cap=3)]
    plate = blob(res(9, q, 4), (0.17, 0.06, 0.17), seed=10, amp=0.06, pos=(ox + 0.1, 0.46, 0.0))
    mfib = geo.tube(geo.catmull([(ox - 1.7, 1.0, 0.0), (ox - 0.9, 0.9, 0.0), (ox - 0.1, 0.75, 0.0), (ox + 0.1, 0.5, 0.0)], res(8, q, 2)), 0.04, res(8, q, 3), cap=3)
    P += [part("muscle-belly", belly, _col(belly, 8, [(0, "#b83a3a"), (0.5, "#d85a54"), (1, "#f09088")]), ao=(0.7, 0.3, 12), tint=(0.5, 0.35, 0.35)),
          part("muscle-tendon", geo.merge(*tend), _col(geo.merge(*tend), 9, [(0, "#e8d8b8"), (1, "#fbf2e0")]), ao=(0.7, 0.2, 10), tint=(0.6, 0.55, 0.45)),
          part("muscle-endplate", plate, np.tile(_solid("#f0a020"), (len(plate[0]), 1)), ao=(0.5, 0.1, 8), tint=(0.6, 0.5, 0.3)),
          part("muscle-fibre", mfib, _col(mfib, 10, [(0, "#d98a2a"), (1, "#f8d082")]), ao=(0.6, 0.2, 10), tint=(0.55, 0.4, 0.3))]
    return P


for _a, _ps in (("neuron", ("soma", "nucleus", "nissl", "dendrites", "myelin", "terminals")), ("synapse-terminal", ("bouton", "active-zone", "mitochondrion", "postsynaptic", "psd", "receptors")),
                ("na-channel", ("domains", "paddles", "gate", "ball")), ("na-channel-open", ("domains", "paddles", "gate", "ball")),
                ("k-channel", ("domains", "paddles", "gate")), ("k-channel-open", ("domains", "paddles", "gate")),
                ("reflex-arc-parts", ("skin-epidermis", "skin-dermis", "skin-receptor", "skin-fibre", "cord-white", "cord-grey", "cord-roots", "muscle-belly",
                                      "muscle-tendon", "muscle-endplate", "muscle-fibre"))):
    for _p in _ps:
        texmotifs.HINTS[(_a, _p)] = dict(w=0.08 if _a in ("neuron", "reflex-arc-parts") else 0.06, relief=0.004, contour=0.7,
                                          along=_p in ("dendrites", "myelin", "muscle-belly"), axis=(1, 0, 0))
neutral("neuron", "axon", w=0.08, relief=0.004, along=True, axis=(1, 0, 0))
neutral("synapse-terminal", "vesicles", w=0.05, relief=0.003)
neutral("neurotransmitter", "ligand", w=0.04, relief=0.003)

META = {
    "neuron": dict(pivot="soma centre", axes="axon along +X (hillock at x ~ 0.5, six myelin segments x 1.9..9.5 with 0.16 gaps = nodes of Ranvier, terminals from x ~ 10.6); dendrites spread to -X and +-Y/Z; ~12 long; "
                   "soma is a translucent gel with nucleus and Nissl granules; part axon is neutral (tintable, e.g. for the action potential)",
                   units="um (heavily exaggerated)", tintable=True, tintParts=["axon"], neutralAlbedo=True),
    "synapse-terminal": dict(pivot="centre of the synaptic cleft", axes="axis Y: presynaptic bouton above (+Y, translucent, vesicles tintable, 4 docked at the active zone), cleft ~0.12 at y 0.04, postsynaptic spine head below (-Y) with receptors and PSD, neck to y -1.9; ~3.3 wide",
                             units="um (exaggerated)", tintable=True, tintParts=["vesicles"], neutralAlbedo=True),
    "neurotransmitter": dict(pivot="centre", axes="~0.4 across, no preferred orientation", units="um (exaggerated)", tintable=True, tintParts=["ligand"], neutralAlbedo=True),
    "na-channel": dict(pivot="membrane centre on the pore axis", axes="pore axis Y (outside +Y), CLOSED: voltage-sensor paddles low, narrow gate ring at the cytoplasmic mouth, inactivation ball hanging away; ~1.3 tall, ~1.3 wide", units="um", tintable=False),
    "na-channel-open": dict(pivot="membrane centre on the pore axis", axes="same footprint as na-channel, OPEN: paddles up and out, gate ring wide, inactivation ball close below the pore", units="um", tintable=False),
    "k-channel": dict(pivot="membrane centre on the pore axis", axes="pore axis Y (outside +Y), CLOSED; no inactivation ball", units="um", tintable=False),
    "k-channel-open": dict(pivot="membrane centre on the pore axis", axes="same footprint as k-channel, OPEN", units="um", tintable=False),
    "reflex-arc-parts": dict(pivot="centre of the middle piece (spinal cord)", axes="three pieces along X: skin + Pacinian receptor + afferent fibre centred at x = -3.4 (parts skin-*), spinal-cord cross-section centred at x = 0 (parts cord-*; plane XZ, normal +Y, dorsal root and ganglion towards +Z, ventral root towards -Z), "
                             "muscle effector centred at x = +3.4 (parts muscle-*, long axis X, motor end plate on top)", units="um (exaggerated)", tintable=False,
                             partPivots={"skin": [-3.4, 0, 0], "spinal-cord": [0, 0, 0], "muscle": [3.4, 0, 0]}),
}
TEXTURE_SIZES = {"neuron": 2048, "synapse-terminal": 1024, "neurotransmitter": 512, "na-channel": 1024, "na-channel-open": 1024, "k-channel": 1024,
                 "k-channel-open": 1024, "reflex-arc-parts": 1024}
BUILDERS = {"neuron": neuron, "synapse-terminal": synapse_terminal, "neurotransmitter": neurotransmitter, "na-channel": na_channel,
            "na-channel-open": na_channel_open, "k-channel": k_channel, "k-channel-open": k_channel_open, "reflex-arc-parts": reflex_arc_parts}
