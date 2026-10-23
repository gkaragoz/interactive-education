# mitosis-meiosis module

Four tracks (`mitoz`, `mayoz-1`, `mayoz-2`, `mayoz-1-ayrilmama`) of one animal cell, each a pure function of `t`.

## How it is built
- `keys.ts`: keyframe tracks (`KeyTrack.to/jump/eval`). Every animated quantity (cells, chromatids, nuclei, centrosomes, spindles, chromatin looseness, camera) is a table of keys; `seek(t)` only evaluates them. `warp` maps canonical times to a track's times.
- `mitosisPlan.ts`, `meiosis1.ts`, `meiosis2.ts`, `meiosisPlan.ts`: the choreographies. Meiosis I (canonical 0..50) and II (50..90) are one continuous plan; `mayoz-2` is the same plan shifted by 50 s, the non-disjunction track is the same plan with a piecewise time warp and the last pair staying together (`nd`).
- `scene.ts`: assembles the instanced sets and poses them from the plan; labels, chart and camera come from the plan too (`labelsMitosis.ts`, `labelsMeiosis.ts`, `charts.ts`).
- Cell body (`membrane.ts`, `cellMath.ts`): one closed surface of revolution (two half grids) deformed in the vertex shader: p-norm union of two lobes, `neck` 1 -> 0 gives a smooth furrow, then `gap` separates the two spheres. Cheap (uniforms only).
- Chromatids (`chromatidSet.ts`, `chromatidMaterial.ts`): one instanced rod; the shader bends the arms around the centromere (anaphase V, ring-shaped bivalent), thins/wiggles it into chromatin (`uLoose`) and paints the exchanged segment of a crossing over (`iA.w`, `iAlt`).
- Nuclei (`nucleusSet.ts`): the envelope is ~82 instanced patches per nucleus that fly apart (`integ` 1 -> 0) and re-form around daughters; nucleoplasm and nucleolus are spheres.
- Spindle (`spindleSet.ts`): kinetochore fibres and centrosomes use the painted GLBs `kinetochore-fibre` and `spindle-pole` via `ctx.assets.instances`; interpolar fibres and astral rays are a tapered instanced tube (no rays at `low`). Furrow and chiasma rings are an instanced torus.

## Options
`chromosome-set` (2n4 / 2n6). Optional `assortment` (bit mask: bit p flips which homolog of pair p goes left; default 2); it is only effective if the content data lists such an option (see docs/MODULE_REQUESTS.md).

## Tests
`tests/modules/mitosisMeiosisPlan.test.ts` (determinism, backwards seek, no pops at phase edges, chart vs data, centromere counts, biology), `tests/modules/mitosisMeiosisScene.test.ts` (matrices identical, finite, instance budget), `tests/e2e/mitosis.spec.ts`.
