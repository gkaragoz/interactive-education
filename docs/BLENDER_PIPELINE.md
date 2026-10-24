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

## Texture pipeline v2 (unwrapped UVs, baked hand-painted maps, KTX2)

Contract: `docs/ASSETS.md` ("Contract v2"). Verdict and before/after images: `docs/QUALITY_GATE.md`.

### Run
```
B="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
# 1. geometry + UV atlas + (optionally) bake/paint every tier as PNG   (GPU: CUDA, GTX 1080 Ti)
$B -b --factory-startup --python tools/blender/make_organelles.py -- IDS=nucleus OUT=tools/blender/out/stage TEX=1
#    TEX=1 enables the textures (PNG tiers go to tools/blender/out/tex/<id>/<tier>/), TEXMAX=1024 caps the size for quick
#    iterations, GBUF=1 keeps the baked G-buffers (tools/blender/out/gbuf/*.npz) for the dev loop below.
# 2. KTX2 / Basis Universal (npm package `basis_universal` = native basisu, no other tools needed)
cd tools/textures && npm install && node encode.mjs --ids=nucleus   # -> public/textures/<id>/<tier>/*.ktx2 + meta.json `textures`
# 3. copy the staged GLB + meta.json into public/models/organelles/ (encode.mjs writes meta.textures into that folder)
# dev loop without re-baking: python tools/blender/devpaint.py nucleus clay
# preview with textures: preview.py ... MODELS=<stage dir> TEX=high [TEXROOT=<tex dir>]  (NONORM=1 / NOAO=1 isolate a map)
# three.js check (KTX2 + normal convention): serve the repo root (python -m http.server 8123) and open
#   http://localhost:8123/tools/textures/viewer/index.html?id=nucleus&tier=high&view=iso
```
Always write to a staging dir first (`OUT=`), run `npx vitest run tests/assets.test.ts`, then copy.

### How it works
1. **Charts, not unwrapping.** Every `geo` primitive records chart coordinates per face corner (cube-sphere face lattice, tube
   ring/side) in a registry keyed by the face array (`geo.reg/chart_of`, survives `xf`, `merge`, `flipf`). `charts.py` turns each
   chart into a rectangle of its measured 3D size (median Jacobian), chops long strips (aspect <= 3), makes every chart
   right-handed (glTF tangent frames are `B = N x T`), shelf-packs all rectangles of a material with one global scale (uniform
   texel density, gutter 0.004) and writes the UVs. Overlap is zero by construction (checked again by `uvtools.uv_stats`), coverage
   is 60-80 %. LOD1/LOD2 get the LOD0 atlas by affine transfer from the nearest LOD0 triangle (`uvtools.transfer_uv`).
   UVs are snapped to 1/8192 plus a different sub-quantum shift in u and v: exact texel-centre-on-edge ties otherwise leave
   one-texel holes along quad diagonals in the bake.
2. **G-buffer bake** (`texbake.py`, Cycles EMIT, 1 sample, GPU): position, normal, base colour (pre-AO), AO/aux/aux2, alpha/part id
   plus an exact coverage mask (margin 0). Vertex data comes from generic attributes (`bk_*`), which the glTF exporter ignores.
3. **Painting in numpy** (`texpaint.py`, `texmotifs.py`, `texnoise.py`) on the G-buffer, per texel, from the 3D position, so strokes
   are continuous across chart borders. Chart margins are filled by linear extrapolation of the position (not by copying edge
   texels), otherwise constant strips show up at seams. Layers: pigment drift + cellular daubs, flow-aligned brush streaks, thin
   dry-brush breaks, cavity contours with a hue shift, speckles, canvas weave and dithering (no 8-bit banding rings), then
   per-organelle motifs (`texmotifs.py`: nuclear plates, wall plates and grooves, cristae stripes, grana ring grooves, ER folds
   and ribosome speckle, Golgi fenestrations, flagellin rows ...). Stroke/relief height becomes a tangent-space normal map
   (finite differences in texel space scaled by the real texel size); AO comes from the baked vertex AO.
4. **Tiers**: painted once at the high size, `low`/`medium` are 2x2 box downsamples (albedo in linear light, normals
   renormalised). Secondary materials (< 30 % of the surface) are half size.
5. **KTX2**: `tools/textures/encode.mjs` calls `basisu` (v1.16.4, npm `basis_universal`): albedo and ORM = ETC1S, normals = UASTC
   with RDO below 4096 and ETC1S normal-map mode at 4096 (UASTC at 4096 is ~10 MB per map and breaks the 120 MB budget).

### Gotchas
- three.js: the GLB has no TANGENT attribute, so the frame comes from UV derivatives and `normalScale.y` must be -1
  (`GLTFLoader` already does this for its own materials; if the app builds materials itself it must set `normalScale.set(1, -1)`).
- Keep `texture.flipY = false` (KTX2 is stored in glTF v-down orientation).
- Normal maps compress badly with dithering at 4096 (UASTC); that is why the 4096 tier uses ETC1S.
- `python` in Git Bash resolves `/tmp` differently from Windows tools; use `C:/Users/<you>/AppData/Local/Temp` for scratch files.
- Baking + painting a 4096 hero takes 3-7 minutes (bake 30-130 s, paint 120-250 s); see the timings table in QUALITY_GATE.md.

## Module assets (`SET=modules`)
```
B="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
$B -b --factory-startup --python tools/blender/make_organelles.py -- SET=modules OUT=tools/blender/out/stage_mod TEX=1      # IDS=a,b optional
node tools/textures/encode.mjs --src=tools/blender/out/tex_modules --dst=public/textures/modules --models=tools/blender/out/stage_mod
cp tools/blender/out/stage_mod/* public/models/modules/        # GLB + meta.json (meta.textures written by encode.mjs)
npx vitest run tests/assetsModules.test.ts tests/assets.test.ts
$B -b --factory-startup --python tools/blender/preview.py -- IDS=chromosome VIEWS=iso MODELS=<abs stage dir> TEXROOT=<abs tex dir> TEX=high
# three.js check: tools/textures/viewer/index.html?set=modules&id=chromosome&tier=high
```
`SET=modules` switches the registry to `mod_mitosis.py` (next batches get their own `mod_*.py` listed in `MODULE_FAMILIES` / `MODULE_IDS` of
`make_organelles.py`), writes to `public/models/modules`, keeps the author origin as pivot (`bpyout.KEEP_PIVOT`) and takes per-asset texture
sizes from the module's `TEXTURE_SIZES`. `META` in the module file carries `pivot`, `axes`, `units`, `tintable`, `tintParts`.
New in this pass: `Part.proj = axis` switches a flat plate-like part (slabs, discs) to projection charts (`charts.projection_charts`:
planar top/bottom + rim sectors) instead of the cube-face lattice charts, which stretched thin slabs and left dashed artefacts;
`geo.tube_ta` also returns the angle fraction around the tube (used for the helical coil bands of the chromosome painter).
Timings (v0.2 set): geometry + UV + bake + paint 3 min for all 8, KTX2 encoding 50 s.

### Batch 2 notes
`mod_membrane.py` (bilayer, membrane proteins) and `mod_dna.py` (DNA, enzymes, RNA, amino acids) are registered in `MODULE_FAMILIES` /
`MODULE_IDS`; `register neutral(asset, part)` (in `mod_membrane.py`) adds a neutral-light painter profile for tintable parts. Changes to the
shared tools: `geo.cube_sphere(n, cube=True)` returns the uniform cube lattice (flat plates with evenly spaced vertices: a superellipsoid
crowds them at the centre); `charts.projection_charts` now works per connected component and keeps dome flanks in the broad-face chart;
`texpaint` supports a `fold=(px, pz)` hint (paint from a triangle-wave folded position so a tile has no seam). Typical LOD problem in
this batch: parts with many tiny blobs (beads, H-bond dots, domes) hit the resolution floors; builders drop every other bead or the small
extras at low q. Timing: batch 2 (18 assets) = 8 min geometry + bake + paint, 4.5 min KTX2 encoding.

### Batch 3 notes
`mod_energy.py`; new shared tool `clip.py` (`clip_cap(surf, z0)` / `clip_part(part, z0)`): plane clipping of closed meshes with ear-clipped flat caps,
vertex data interpolated (`vmap`), chart data carried over (caps get planar charts), used for cut-open views (the painter turns `hint['cut']` caps into a
painted section, `texmotifs._section`). Small atlases get a wider gutter in module sets (`margin = clamp(8 / top_size, 0.004, 0.04)` in `bpyout`):
a 256 px atlas with a 1 px gutter bled the mean fill colour into the atoms. Timing: batch 3 (18 assets) about 11 min geometry + bake + paint, 1.5 min KTX2.

### Batch 4 notes
`mod_muscle.py`, `mod_neuro.py`, `mod_genetics.py`. New shared tool `extrude.py` (`extrude_polygon`, `half_annulus`): closed prism from a polygon cross-section with ear-clipped
caps and registry charts (used for the cut-away sarcolemma of `muscle-fibre-bundle`). `clip.py` is reused for the allele token. LOD control for many-small-parts assets
(`sarcomere`: thin filaments, heads, titin) scales the part counts continuously with q (`min(1, 2q)`) so LOD1 and LOD2 differ clearly; the `sarcomere` and `neuron` GLBs
are near the 1.5 MB cap (1.31 / 1.41 MB). Timing: batch 4 (15 assets) about 14 min geometry + bake + paint, 4 min KTX2 encoding.


### Lab batch notes (`SET=lab`)
```
$B -b --factory-startup --python tools/blender/make_organelles.py -- SET=lab OUT=tools/blender/out/stage_lab TEX=1 TEXOUT=tools/blender/out/tex_lab      # IDS=a,b optional
node tools/textures/encode.mjs --src=tools/blender/out/tex_lab --dst=public/textures/lab --models=tools/blender/out/stage_lab
cp tools/blender/out/stage_lab/* public/models/lab/ && npx vitest run tests/assetsLab.test.ts
```
Families `lab_glass`, `lab_equip`, `lab_props`, `lab_solids`, `lab_particles` (`LAB_FAMILIES` in `make_organelles.py`); shared helpers in `lab_common.py`:
`Prof` + `lathe` (profile revolve with per-section charts, poles, closed ring loops), `wall_loop` (hollow wall from an outer profile: inward offset + rim bead), `liquid_mesh`
(matching cavity volume), `volume_ticks` (graduation heights from the cavity), `spout`, `glass_part` (+ painted glass motif registered in `texmotifs.CUSTOM`), `rbox`/`cyl`/`sph`.
New hooks: `texmotifs.CUSTOM[(asset, part)] = fn(S, r, hint, gel)` lets an asset replace the default painting (glass, wood, tiles, label, gauze); lab assets get a calm neutral
painter default (`LAB_DEFAULT`) so white and steel objects do not pick up colourful dabs. The G-buffer is in Blender coordinates: use `lab_common.bc()` to get builder (Y up) coordinates in motifs.
`Part.rect_dir` makes `bpyout` report `meta.uvRects[part]`. Hollow closed glass (tubes with closed ends, Hofmann) sets `Part.hollow`. Timing: 55 assets about 28 min geometry + bake + paint, KTX2 about 14 min.
