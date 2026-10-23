# genetics (Kalıtım ve Genetik)

Animated 3D lesson: Mendel's pea crosses, dihybrid crosses, ABO blood groups and X-linked colour blindness. Content is `src/data/modules/genetics*.ts` (tracks `monohibrit`, `dihibrit`, `kan-gruplari`, `eseye-bagli`); this folder is the scene. Everything is a pure function of time `t`.

## How it is built
- `punnett.ts` (pure, no three.js): parse the parent genotypes of the chosen option (`Aa-aa`, `AaBb-aabb`, `IAi-IBi`, `XCXc-XCY`), gametes (always 2^genes per parent, homozygotes repeat), the Punnett square (row-major cells), phenotype classes (= chart series ids), genotype groups, ratio text, the fill timing of the square and the chart values. The scene, the chart and the tests all use these functions.
- `anim.ts`: `Anim` = pure function `(t, pose)`; `path(keys)` smooth keyframes, `follow` (rigid child), `gate` (grow in / shrink out). Scale 0 hides, so nothing pops.
- `kit.ts`: `Kit` owns the instanced shape pools (sphere, tile, cube, cylinder, cone, wrinkled pea, translucent bubble; painted-clay material from the shared library, tinted per instance), the `chromosome` / `chromosome-single` instance sets, and the canvas-texture letter tags (`tags.ts`). `kit.reset()` + a track plan rebuilds everything (used by `setOptions`).
- `meiosis.ts`: one cell with replicated homologs, meiosis I (homologs and their alleles separate into two lobes), meiosis II (each lobe splits into two gametes, replicated chromosome becomes two singles). A dihybrid parent shows two cells with different orientations (independent assortment), so all four gamete types appear. `claim()` picks one finished gamete per header slot; the others fade.
- `square.ts`: board, header plates, per cell: two gamete orbs fly in from the headers, the tile takes the phenotype colour, genotype letters and the offspring picture (seeds or a person) appear. `hist.ts`: tally cubes leave the squares, stack by genotype (1 : 2 : 1) and regroup by phenotype (3 : 1) with counts and ratio captions.
- `organisms.ts`: pea plant (pod with yellow/green, round/wrinkled seeds), person (blood-group drop, colour-vision badge). `cross.ts` glues parents, meiosis, flights, square and tally; `mono.ts`, `di.ts`, `kan.ts`, `sex.ts` hold each track's timing, camera path and labels; `scene.ts` is the `ModuleScene`.

## Tracks
- `monohibrit` (56 s, Temel + İleri): AA x aa -> gametes -> fertilisation -> zygote -> F1 plant -> two F1 plants -> their gametes -> square -> genotype tally -> phenotype tally. Option `cross-mono` chooses the pair in the square (Aa x Aa, Aa x aa, AA x aa); for a non-default pair the two plants appear in place and a note shows.
- `dihibrit` (60 s): AaBb x AaBb (or x aabb): 8 gametes per parent, 16 squares, 9 genotypes, 9:3:3:1 (or 1:1:1:1).
- `kan-gruplari` (48 s): alleles IA, IB, i, genotype -> group table, parents, gametes, 4 squares, groups.
- `eseye-bagli` (52 s): XX / XY parents, colour-vision gene on X, 4 squares, outcome, pedigree symbols.
- Chart: `dolu-kare` counts filled squares, the other series count squares per phenotype class; filled smoothly during the `punnett` phase and computed for every option (the data's chart values are the default cross; a test compares them at the phase boundaries).
- Level: Temel only offers the pea monohybrid track; labels have a Temel and an İleri wording (`level` on `LabelSpec`).

## Simplifications (also in the data)
Gamete formation is the result of meiosis shown in two steps; the dihybrid parent shows two cells to show all four gamete types; one gene (or two) with complete dominance; the pea plant, seeds and people are procedural clay shapes, not the `punnett-tile` / `allele-token` assets (not delivered yet).

## Tests
`tests/modules/geneticsPunnett.test.ts` (many genotype combinations, ratios, chart vs data), `tests/modules/geneticsScene.test.ts` (duration, deterministic seek out of order and backward, no pops in 0.1 s steps, options, levels, quality), `tests/e2e/genetics.spec.ts` (`#/modul/genetics?demo`).

## Camera
`cameraAt` frames the action for the whole canvas and then moves it a little to the right (`SAFE_SHIFT` in `scene.ts`) because the glass panels cover the left side. Remove the shift when the shell offsets the camera itself (see `docs/MODULE_REQUESTS.md`).
