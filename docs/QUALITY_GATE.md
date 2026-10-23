# Asset quality gate (M1) - candid verdict (history; the app's rendering adds the micro-normal map, IBL and grading on top)

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
