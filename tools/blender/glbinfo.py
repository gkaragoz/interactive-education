"""Read the JSON chunk of a GLB without any library (no bpy needed)."""
import json
import struct


def read_json(path):
    with open(path, "rb") as fh:
        magic, version, length = struct.unpack("<III", fh.read(12))
        if magic != 0x46546C67:
            raise ValueError(f"{path}: not a GLB")
        clen, ctype = struct.unpack("<II", fh.read(8))
        if ctype != 0x4E4F534A:
            raise ValueError(f"{path}: first chunk is not JSON")
        return json.loads(fh.read(clen).decode("utf-8"))


def summarize(path):
    """{lod: {'tris': n, 'meshes': [names], 'color0': bool}} plus materials and extensions."""
    j = read_json(path)
    nodes = j["nodes"]
    out = {}

    def prims(node_idx, acc):
        n = nodes[node_idx]
        if "mesh" in n:
            for p in j["meshes"][n["mesh"]]["primitives"]:
                acc.append((n["name"], p))
        for c in n.get("children", []):
            prims(c, acc)

    for idx, n in enumerate(nodes):
        if n["name"] in ("LOD0", "LOD1", "LOD2"):
            acc = []
            prims(idx, acc)
            tris = sum(j["accessors"][p["indices"]]["count"] // 3 for _, p in acc)
            out[n["name"]] = dict(tris=tris, meshes=[a for a, _ in acc],
                                  color0=all("COLOR_0" in p["attributes"] for _, p in acc))
    mats = [m["name"] for m in j.get("materials", [])]
    return out, mats, j.get("extensionsUsed", [])
