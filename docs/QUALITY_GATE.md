# Asset quality gate - verdict after the texture pipeline v2 (hand-painted maps)

Images: `docs/images/assets_v1_vertex_colour.png` (before: vertex colour only) and `docs/images/assets_v2_painted_textures.png`
(after: baked painted textures, high tier, same Cycles studio light). Cut views and per-asset renders are regenerated into
`tools/blender/out/` (`preview.py ... TEX=high`). The textures were also checked decoded from the real KTX2 files in three.js
(`tools/textures/viewer/index.html`).

## Verdict
**Closer, not there.** The surface now carries real painted structure instead of smooth vertex gradients: chunky cobbled
nuclear envelope with soft purple daubs, the plant wall as thick painted plates with dark green grooves (the best match to the
reference), cristae and grana with painted ring/stripe motifs, folded ER with ribosome speckle, canvas weave and dry-brush
breaks, all with consistent texel density, no seams (checked in Blender and in three.js), no stretching (p05..p95 area
ratio 0.69..1.76), AO in the ORM maps and tangent-space normals from the stroke/relief height. It is still procedural: the
brushwork is calm and regular compared with the reference's hand-painted irregularity, outlines are cavity-driven rather than
drawn, and the smallest assets (plasmid, ribosome, centrosome, pilus, flagellum) gain little because their geometry already
read as clean clay at 1024. Judged side by side with `reference.webp` the nucleus and the wall are within reach, the rest sit
between "vertex-colour toy" and "painted clay".

## Weakest
1. plasmid, ribosome, centrosome, pilus, flagellum, vesicle: tiny parts, textures add little (flat, still toy-like).
2. Gel membranes (animal / plant / bacterial layers): faint streaks and blotches only; the lipid-bilayer feel is geometry (proteins)
   rather than texture.
3. mitochondrion whole view: the two translucent membranes tint the painted cristae; the cut view is much better.
4. wall-plant silhouette is stair-stepped (plate edges at geometry resolution); the texture hides it at distance but not up close.
5. ETC1S normals (all normals above 1024 px) show faint 4x4 block artefacts when zoomed in close; UASTC would fix that but
   costs 2.5-10 MB per map and breaks the 120 MB budget.
6. Painted flow-aligned strokes make "oily swirl" patterns around pores and tight curvature (nucleus).

## Cannot reach the bar procedurally (honest)
Irregular hand-painted brush texture with deliberate outlines and colour accents needs texture painting by an artist. That is
why the hero assets come with retouchable `.blend` files (`tools/blender/blend/<id>.blend`, gitignored, regenerate with
`make_blend.py`): the baked images are wired into Principled materials on the final UV atlas so they can be painted over in
Blender Texture Paint and re-encoded with `tools/textures/encode.mjs`.

## Numbers
| asset | px high/medium/low | high MB | medium MB | low MB | generate (geometry+bake+paint) | GLB |
|---|---|---|---|---|---|---|
| centrosome | 1024/512/256 | 0.8 | 0.2 | 0.1 | 18 s | 738 KB |
| chloroplast | 4096/2048/1024 | 10.0 | 2.9 | 1.9 | 524 s | 1378 KB |
| cytoskeleton | - | - | - | - | 0 s | 1253 KB |
| envelope-bacterium | 4096/2048/1024 | 7.6 | 2.4 | 1.4 | 612 s | 1186 KB |
| flagellum | 1024/512/256 | 0.9 | 0.3 | 0.1 | 18 s | 595 KB |
| golgi | 2048/1024/512 | 1.7 | 1.0 | 0.3 | 52 s | 1298 KB |
| lysosome | 1024/512/256 | 1.5 | 0.4 | 0.1 | 25 s | 945 KB |
| membrane-animal | 4096/2048/1024 | 5.6 | 1.9 | 0.8 | 222 s | 1066 KB |
| membrane-plant | 4096/2048/1024 | 5.6 | 1.9 | 0.9 | 209 s | 1040 KB |
| mitochondrion | 4096/2048/1024 | 9.2 | 2.8 | 1.9 | 505 s | 1415 KB |
| nucleoid | 2048/1024/512 | 3.0 | 1.5 | 0.4 | 89 s | 988 KB |
| nucleus | 4096/2048/1024 | 4.8 | 1.4 | 0.9 | 292 s | 1328 KB |
| pilus | 1024/512/256 | 0.9 | 0.3 | 0.1 | 16 s | 471 KB |
| plasmid | 1024/512/256 | 0.8 | 0.2 | 0.1 | 12 s | 168 KB |
| ribosome | 1024/512/256 | 0.9 | 0.2 | 0.1 | 18 s | 750 KB |
| rough-er | 4096/2048/1024 | 7.3 | 2.0 | 1.0 | 335 s | 1385 KB |
| smooth-er | 2048/1024/512 | 2.2 | 1.2 | 0.3 | 49 s | 1102 KB |
| vacuole | 2048/1024/512 | 1.9 | 0.9 | 0.3 | 48 s | 1187 KB |
| vesicle | - | - | - | - | 6 s | 1234 KB |
| wall-plant | 4096/2048/1024 | 6.7 | 1.8 | 1.1 | 206 s | 1024 KB |
| **total** | | **71.3** | **23.5** | **11.7** | | |

All tiers: 106.5 MB (budget 120), medium tier 23.5 MB (budget 50), largest single file < 4 MB (budget 25).

Timings (this machine, GTX 1080 Ti + Windows, CUDA bake, numpy painting single-threaded): heroes at 4096 take 3.5-9 minutes each
(bake 30-125 s, paint 120-250 s, geometry + AO + export 10-20 s); the 17 smaller assets take 10-60 s each at 1024/2048;
the whole set is about 50 minutes of generation plus 10 minutes of KTX2 encoding (`basisu`, 3 parallel jobs).
`TEXMAX=1024` gives a 30 s iteration loop per asset. Generation, PNG tiers and KTX2 output are byte-identical on re-run.

---
# Earlier verdict (before the texture pipeline, vertex colours only)

Images (under `tools/blender/out/`, gitignored, regenerate with `preview.py`): `contact_sheet.png`, `<id>_iso.png` for all 18, `<id>_cut.png` for nucleus, mitochondrion, chloroplast, lysosome, vacuole, flagellum, wall-plant, envelope-bacterium. Rendered with a neutral Cycles studio setup, not the app's materials.

## Verdict
Pass for structure and design, still short of the reference on painted fine detail. All 18 assets are closed manifold, within budget (<= 60k LOD0, <= 1.5 MB), deterministic (two full runs byte-identical) and covered by 128 test checks. Compared with the reference: the clay/saturated-gradient family matches, the organelles now carry real anatomy, and the shells have genuine surface character. What the reference has and we do not: hand-painted texture with outlines and micro-pattern; ours is vertex-colour only (soft blotches, two-scale hue drift, faint stripes, cavity AO), so surfaces look smoother and more "vinyl toy" than hand-painted clay, until the app's micro-normal map is applied.

## Changed in this pass
- wall-plant: layered plate/brick relief (Worley plates with dark grooves, per-plate height and tint, microfibril stripes rotated per plate, raised bead on edges/corners). membrane-animal / membrane-plant: bumpy gel with tinted inner leaflet, protein domes, channel rings (animal also microvilli) as separate clay meshes. envelope-bacterium: pitted plate-textured wall, protein studs on the membrane, fuzzy capsule, distinct tints per layer.
- smooth-er: fenestrated honeycomb tubular network (3-way junctions, uniform radius) in two domed layers plus flat sheet patches; clearly different from rough ER.
- ribosome: grooved large + small subunit pairs with distinct tints on a visible mRNA strand with tails.
- vacuole: tonoplast with inner leaflet, ruffled inner membrane folds, solute particles and vesicles. lysosome: thick-rimmed gel, three multilamellar bodies, dense granules, digestive vesicles.
- mitochondrion: cup-shaped folded cristae joined to the inner membrane by narrow crista junctions, tubular cristae with bulbs, matrix granules and mtDNA.
- nucleoid: supercoiled loops in a soft cloud with ribosome speckles and protein beads. flagellum: motor in two envelope plates (MS, P, L, C rings, stator studs), rod, hook, ridged helical filament. pilus: three shafts with tip knobs from a base plate with anchor rings.

## Still weakest
1. Whole-view mitochondrion: the cristae are tinted by two translucent membranes, so it reads olive-orange; the cut view is much better.
2. Wall-plant plates read slightly scaly/cobblestone rather than the reference's chunky layered bricks; no painted outline.
3. Nucleus is smooth violet with pores; the reference has visible block texture. Interior only visible in a cut.
4. Ribosome and centrosome are legible but small, simple forms; smooth-er is a diagram-like lattice more than an organic ER.
5. Membrane proteins are small at full-cell zoom.

## Cannot reach the bar procedurally
Hand-painted texture detail (outlines, brush variation, stone/brick micro-patterns) needs texture painting or the app's detail map; geometry plus baked vertex colour will not replace it.

## Update: shell decoration toned down
Proteins/rings/microvilli are now ~40 % of the count, ~35 % smaller, tone-on-tone with each shell hue, half-sunk, rings clustered, microvilli fewer and shorter. wall-plant is deeper green (#5f8f2e family) with thicker plates, darker grooves and a thicker, raised rim (wall 1.4 um).
