# energy module

Four tracks (`fotosentez`, `hucresel-solunum`, `fermantasyon`, `kemosentez`), each a pure function of `t`. Content: `src/data/modules/energy*.ts`.

## How it is built
- **Stations.** A track is a few *stations* (scenery, built once) overlaid at the origin; only the one the plan says is active at `t` is shown (the others have scale 0 and `visible = false`, so the stage frames the first one and the camera/lights stay tuned for ~10 unit scenes). Zooming "leaf -> cell -> chloroplast -> thylakoid" is a camera dive followed by a *cut through the stage-card colour* (`rig.ts` veil: an inside-facing sphere that fades in around each swap time); the next station then starts its own shot.
- **Plan** (`env.ts`): `windows` (which station from when), `swaps` (veil times), `trips`, camera `shots`, `labels`, `chart`, optional `extras`. A plan factory is `(options) => Plan`; `setOptions` just rebuilds the plan and re-binds the instance slots (`Flock.bind`), so nothing is allocated per frame.
- **Trips** (`flock.ts`, `paths.ts`, `math.ts`): every molecule/protein is one trip along timed waypoints (cubic Hermite through them), grown in and shrunk out at the ends, with an optional deterministic shimmer, spin, colour change (`tintTo`) and fixed orientation. One `InstancedMesh` per (station, kind). Kinds (`kinds.ts`) use the painted GLB when `public/models/modules/<asset>.glb` exists (`molset.ts` probes the meta file, no toast), else a procedural ball model in the same palette. ATP synthase's `rotor` part turns on its own (`poseSpin`).
- **Chart = molecules.** `chart.ts` builds the chart from *events* (`series, time, amount`), the same events that time the molecules, so numbers and picture agree (tested): CO2 count, ATP count, O2, glucose, etc.
- **Options** (`photo/rates.ts`): light and CO2 give a limiting-factor rate `min(light, co2)/0.8` (1 at the defaults, 0.5 at low, 1.25 if both are high). Fewer Calvin turns / O2 / ATP (`n = round(6 * min(1, rate))`) when low; faster events when both are high. The lab station moves the lamp and changes the bubble and dissolved-CO2 counts.
- **Organelles** from the cell explorer (`public/models/organelles`: chloroplast, mitochondrion, nucleus, bacterium envelope) are loaded by `organelles.ts` (own GLTF loader, shared painted-clay materials; translucent shells use the library's `shell`/`glossy` looks).

## Tracks
| track | stations | notes |
|---|---|---|
| `fotosentez` | 0 leaf, 1 plant cell, 2 chloroplast, 3 inside (thylakoid membrane + Calvin ring), 4 pond-plant experiment | İleri: 6 CO2 + 12 H2O -> 6 O2 + 1 glucose, 12 electrons, 27 H+ -> 9 ATP, 6 NADPH, 6 Calvin turns (each CO2's carbon runs round the ring into the sugar depot). Temel: the same intro and result, one continuous flow through the chloroplast (no stages). |
| `hucresel-solunum` | 0 cell, 1 cut-open mitochondrion with cytoplasm, 2 matrix close-up, 3 inner membrane | İleri: one glucose tracked as six carbon beads: glycolysis (2 pyruvate, 2 ATP) -> pyruvate oxidation (2 CO2) -> Krebs (4 CO2, 2 ATP) -> 12 loaded carriers -> electron transport (26 ATP, 6 O2 in, 12 H2O out; 6 H2O were used in the cycle, net 6). Temel: one coarse view (glucose and O2 in, CO2, water, ATP out). |
| `fermantasyon` | 0 cell without O2, 1 muscle cell, 2 yeast cell, 3 ATP comparison (2 vs 30), 4 yeast flask with balloon | lactic: pyruvate beads recolour to lactate, no CO2; alcohol: one carbon per pyruvate leaves as CO2, two become ethanol. |
| `kemosentez` | 0 deep-sea vent | light fades out high up; H2S rises into a bacterium; CO2 in, food out, then to the tube worms. |

## Programme limits
Photosystems, ATP synthase and the H+ gradient are labelled "Ek bilgi"; no Calvin or Krebs intermediates and no ETS protein names (the complexes are unlabelled "taşıyıcı proteinler"); Temel shows no equations. Quantities are schematic (see `ModuleInfo.simplifications`).

## Tests
`tests/modules/energyPlans.test.ts` (counts per phase, chart vs data at every phase start, options), `tests/modules/energyScene.test.ts` (determinism incl. backwards seek, no pops, finite matrices, labels/camera, instance budget), `tests/e2e/energy.spec.ts`.
