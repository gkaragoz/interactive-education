# muscle module

Tracks `kasilma` (Temel and İleri look different) and `eklem-hareketi`; every scene is a pure function of `t`.

## Model (pure, tested)
- `sarcModel.ts`: contraction `c(t)` (rest to 10 s, shortening to 24 s, held to 28 s, relaxing to 38 s). L = 2.4 -> 2.0, A = 1.6 constant, I = L - A, H = L - 2 * 1.0 (thin filament length). `chartAt` returns exactly these numbers. `headPose(slide, offset, engage)`: the head cycle phase advances with the thin filament's travel, so an attached head keeps its tip on the same actin site (pulls), a detached head swings back to the next site; per-head offsets come from `hash01`.
- `armModel.ts`: planar elbow. Angle, biceps and triceps activity are key curves matching the chart points of the data. Muscle lengths come from the geometry (origin/insertion points, tendons keep their length, belly girth by constant volume); `angleForBicepsRatio` makes the arm in `kasilma` bend exactly as much as the biceps belly shortens (ratio = L / 2.4).

## Look
- `sarcView.ts`: 5 thick filaments (lathe), ~150 heads (lever rod + blob, instanced), 16 thin filaments (rod + bead helix), Z discs and M line (glass), band tints behind, bracket bars under (A, I, H, sarcomere). `sarcLattice.ts` is the hexagonal slab.
- `levels.ts`, `levelsB.ts`: muscle, fascicle, fibre (37 striped myofibrils, nuclei, motor nerve ending with a travelling impulse) and myofibril (end face shows the filament lattice). Tubes are cut so their end faces show the bundle; levels 1 to 4 are yawed (`YAW`).
- `stripes.ts`: a shader turns the clay material into a striated tube (Z, I, A, H, M) that follows the live A/L and H/L; the pattern uses the tube-local x, so an M line always sits on the zoom axis.
- `zoom.ts`: the flythrough is done by scaling nested level groups about the origin (camera distance constant), `levelScale(k, z)` / `levelWeight(k, z)`. Magnifications are chosen so a child drawn in its parent matches the child level itself. 0 s arm, 9.9 s sarcomere, 33.5 s start of the pull-back, 40 s arm again (loop-safe).
- `armView.ts`: bones, glass skin, two-headed biceps and triceps (tinted by activity: pale at rest, saturated when working), tapered tendons, dotted angle arc (İleri).
- `temel.ts`, `sarcSimple.ts`: Temel `kasilma` = whole arm (the muscle shortens and pulls the forearm) plus a magnified two-layer sarcomere in a lens.
- `kit.ts`: painted-clay materials via the shared library, `Fader` (level crossfades), dimmed rim-glass.

## Assets
The Batch 4 GLBs (`sarcomere`, `myosin-head`, `actin-filament`, ...) are not used on purpose: the sliding needs per-head poses and a changing filament length (the `sarcomere` GLB has a fixed length), and one `myosin-head` is 1.4 k triangles at LOD1 (about 200 k for the heads alone, against about 97 k for the whole scene now). The procedural parts share the same palette and pivots-by-construction.

## Tests
`tests/modules/muscleModel.test.ts` (band bookkeeping, chart vs data, head continuity and actin lock, antagonists, kinematic tie), `tests/modules/muscleScene.test.ts` (determinism, no pops at phase edges, labels, camera, budgets at every quality, both levels), `tests/e2e/muscle.spec.ts`.
