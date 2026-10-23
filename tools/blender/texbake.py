"""Bake G-buffers (position, normal, base colour, AO/aux, part id) from the LOD0 objects into the UV atlas with Cycles
(GPU). The painting itself is numpy (texpaint.py) so it is seamless (3D noise) and fast. Needs bpy."""
import bpy
import numpy as np

OFF = 24.0          # position encoding: (P + OFF) / (2 OFF) so it stays positive for the emission bake


def setup_cycles():
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "CUDA"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = d.type == "CUDA"
        sc.cycles.device = "GPU"
    except Exception:
        sc.cycles.device = "CPU"
    sc.cycles.samples = 1
    sc.cycles.use_denoising = False
    sc.cycles.bake_type = "EMIT"
    sc.view_settings.view_transform = "Standard"


def _bake_material(name, kind):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    em.inputs["Strength"].default_value = 1.0

    def attr(key):
        a = nt.nodes.new("ShaderNodeAttribute")
        a.attribute_name = key
        return a
    if kind == "pos":
        g = nt.nodes.new("ShaderNodeNewGeometry")
        add = nt.nodes.new("ShaderNodeVectorMath")
        add.operation = "ADD"
        add.inputs[1].default_value = (OFF, OFF, OFF)
        mul = nt.nodes.new("ShaderNodeVectorMath")
        mul.operation = "SCALE"
        mul.inputs["Scale"].default_value = 1.0 / (2 * OFF)
        nt.links.new(g.outputs["Position"], add.inputs[0])
        nt.links.new(add.outputs[0], mul.inputs[0])
        nt.links.new(mul.outputs[0], em.inputs["Color"])
    elif kind == "nrm":
        g = nt.nodes.new("ShaderNodeNewGeometry")
        add = nt.nodes.new("ShaderNodeVectorMath")
        add.operation = "ADD"
        add.inputs[1].default_value = (1, 1, 1)
        mul = nt.nodes.new("ShaderNodeVectorMath")
        mul.operation = "SCALE"
        mul.inputs["Scale"].default_value = 0.5
        nt.links.new(g.outputs["Normal"], add.inputs[0])
        nt.links.new(add.outputs[0], mul.inputs[0])
        nt.links.new(mul.outputs[0], em.inputs["Color"])
    elif kind == "base":
        a = attr("bk_base")
        nt.links.new(a.outputs["Vector"], em.inputs["Color"])
    else:                                   # "misc": R=ao, G=aux, B=aux2 ; "misc2": R=alpha, G=pid
        names = ("bk_ao", "bk_aux", "bk_aux2") if kind == "misc" else ("bk_alpha", "bk_pid", "bk_ao")
        comb = nt.nodes.new("ShaderNodeCombineColor")
        for k, nm in enumerate(names):
            a = attr(nm)
            nt.links.new(a.outputs["Fac"], comb.inputs[k])
        nt.links.new(comb.outputs[0], em.inputs["Color"])
    img_node = nt.nodes.new("ShaderNodeTexImage")
    return m, img_node


def bake_group(objs, size, pad):
    """Bake the five passes for the objects of one material; returns dict of float32 (H, W, C) arrays (bottom-up rows)."""
    setup_cycles()
    res = {}
    saved = [(o, o.material_slots[0].material) for o in objs]
    for kind, key, mg in (("pos", "P0", 0), ("pos", "P", pad), ("nrm", "N", pad), ("base", "B", pad), ("misc", "M", pad),
                          ("misc2", "M2", pad)):
        mat, node = _bake_material(f"bk_{kind}", kind)
        img = bpy.data.images.new(f"bk_{kind}", size, size, alpha=True, float_buffer=True, is_data=True)
        img.colorspace_settings.name = "Non-Color"
        node.image = img
        mat.node_tree.nodes.active = node
        for o in objs:
            o.material_slots[0].material = mat
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.bake(type="EMIT", margin=mg, margin_type="EXTEND", use_clear=True)
        buf = np.empty(size * size * 4, dtype=np.float32)
        img.pixels.foreach_get(buf)
        res[key] = buf.reshape(size, size, 4)
        bpy.data.images.remove(img)
    for o, m in saved:
        o.material_slots[0].material = m
    P = res["P"][..., :3] * (2 * OFF) - OFF
    mask = res["P"][..., :3].sum(-1) > 1e-6
    cov = res["P0"][..., :3].sum(-1) > 1e-6
    N = res["N"][..., :3] * 2 - 1
    return dict(P=P.astype(np.float32), N=N.astype(np.float32), base=res["B"][..., :3].copy(),
                ao=res["M"][..., 0].copy(), aux=res["M"][..., 1].copy(), aux2=res["M"][..., 2].copy(),
                alpha=res["M2"][..., 0].copy(), pid=np.rint(res["M2"][..., 1]).astype(np.int16), mask=mask, cov=cov)
