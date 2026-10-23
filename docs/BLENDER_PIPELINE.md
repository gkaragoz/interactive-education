# Blender pipeline (organelle GLBs)

Contract: `docs/ASSETS.md`, enforced by `tests/assets.test.ts`. Decision: ADR 0001.

## Run
```
B="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
$B -b --factory-startup --python tools/blender/make_organelles.py -- IDS=nucleus,golgi   # IDS optional = all 18 (~1 min)
$B -b --factory-startup --python tools/blender/preview.py -- IDS=nucleus VIEWS=iso,cut,side SIZE=800 SAMPLES=64 [LOD=0] [SHEET=1]
python tools/blender/sheet.py out.png 3 500 a.png b.png      # Pillow montage helper (system python)
npx vitest run tests/assets.test.ts
```
Staging: add `OUT=tools/blender/out/stage` to generate into a temp dir (and `MODELS=` to preview it), then copy to `public/models/organelles/` only when the whole set passes.
Previews (Cycles on the GPU) go to `tools/blender/out/` (gitignored); `cut` bisects the mesh to show the inside; `SHEET=1` writes `out/contact_sheet.png`. Outputs are byte-identical on re-run (fixed seed `SEED`, positions drive all noise).

## Layout
| File | Job |
|---|---|
| `make_organelles.py` | entry, registry, LOD loop (`LOD_Q` per asset), AO, export |
| `noise.py`, `geo.py`, `shapes.py` | numpy only: noise, closed primitives (cube-sphere, tube, torus, slab), topology report |
| `paint.py` | `Part`, colour ramps, BVH vertex AO, final shading (form light, speckle, hue drift) |
| `bpyout.py` | bpy side: objects, materials, validation, GLB export, meta.json |
| `org_*.py` | one module per family (nucleus, energy, membranes, misc, vesicles, motility, prokaryote, shells); each exports `BUILDERS` (and optional `LOD_Q`, `META`) |
| `preview.py`, `sheet.py`, `glbinfo.py` | previews, montage, GLB JSON reader |

## How an asset is built
`builder(q)` returns `Part`s (numpy V/F + sRGB base colour); it is called with q = 1.0 / 0.5 / 0.3 (LOD0/1/2), so LODs are regenerated at lower resolution, not decimated. `paint.finalize` bakes AO (rays against the part plus all `occ=True` parts) and writes linear RGBA. `bpyout` centres on the LOD0 bbox, snaps to a 1/4096 grid, validates, builds `<id>` -> `LOD0/1/2` -> meshes `<id>-<part>` (`-lod1`, `-lod2` suffix on lower LODs), exports with `use_selection`, meshopt, then re-reads the GLB (COLOR_0 on every primitive, triangle counts) and writes `<id>.meta.json`.

## Rules and gotchas
- Every mesh is closed: validated with numpy edge counting (boundary, non-manifold, inconsistent winding, degenerate, inward components) and bmesh. Pores/dimples are displacement, never holes. Hollow shells = outer + flipped inner surface (`hollow=True`).
- Build in y-up game coordinates; `to_object` converts to Blender z-up so the exporter's y-up output is identity (no node transforms).
- Vertex colour: float `Col` attribute + Color Attribute node into Base Color makes the exporter write COLOR_0 (`export_vertex_color="MATERIAL"`). Gel alpha comes from the colour alpha.
- Size: the 1.5 MB limit is hit by COLOR_0 first. Colours are rounded to 8 mantissa bits, positions to 1/4096, UVs to 1/512, so meshopt compresses well. Keep LOD0 around 50-58k tris; the nucleus (1.39 MB) and smooth-er (1.43 MB) are the heaviest.
- LOD ratios fail when a `res(n, q, lo)` floor stops shrinking; lower the floor, scale counts by q, or set `LOD_Q` for the asset.
- Cube-projected UVs are per face, so vertices split at projection seams (about +25 % vertices).
- Names: letters, digits, `_`, `-` only; materials `<id>_clay` / `<id>_gel`.
- Modules are dropped from `sys.modules` at start (an open Blender keeps stale imports). Add new modules to `MODULES`/`FAMILIES` in `make_organelles.py`.
- Cutaway: nested shells (nucleus envelope/inner, mitochondrion outer/inner) are separate closed meshes; the app's stencil cap must handle nesting. Shell `meta.json` carries `shell.halfExtents` (animal ellipsoid 11x8.5x9.5, plant rounded box 13x7x10, wall +0.74, bacterium capsule).
