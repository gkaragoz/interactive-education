# chem-lab: the 3D bench and the "Nedenini göster" explainers

The render and interaction layer of the virtual chemistry lab. The chemistry is `src/chemlab` (pure engine); the host, clock and lab UI are `scene/simStage`, `app/simHost`, `ui/lab*`. This folder turns `LabSim` state into a painted-clay bench and back: pointer drops become engine operations.

Entry points (only `index.ts` is public): `chemLabDefinition` (a `SimDefinition`) with `createSim` = `createChemLabSim(ctx)` (a `LabSimScene`) and `createExplainer` = `createChemLabExplainer(ctx, scriptId)` (a timeline `ModuleScene`).

## Rules the code follows
- The engine is the only source of truth. Rendering reads `lab.visuals(id)`, `lab.vessel(id)`, `lab.view()`, `measurements()` and `drainEvents()` at 10 Hz (`SAMPLE_S`), eases the displayed values every frame, and never writes engine state. Learner actions call `lab.pour/add/drop/dispense/place/tare/heat/stir/dip/testGas/lid/connectElectrodes` only; the animation is a visual twin that follows.
- Pure helpers (no three.js) are in `helpers.ts`, `profile.ts`, `layout.ts`, `explainer/plan.ts`, `explainer/molecules.ts`; all unit-tested. Everything else only builds objects (also testable without WebGL).
- No per-frame allocation in the hot paths (instance matrices are written into the typed arrays; temporaries are reused); pools are sized by the quality preset.
- Files stay under about 300 lines; data (vessel facts, reagent looks) is separate from behaviour.

## Bench scene (`createChemLabSim`)
| File | Role |
|---|---|
| `labScene.ts` | `ChemLabScene`: builds an experiment or the free bench (`loadExperiment`), samples the engine, poses vessels (slot, balance pan, lifted onto a heater), drives all subsystems |
| `layout.ts` | `layoutBench(items)`: pure placement: test-tube rack (6 holes), burette stand with its flask, funnel on its beaker, pneumatic trough for the gas tube, Hofmann, balance, tile count |
| `bench.ts`, `balance.ts` | bench tiles and backdrop (tinted so clear glass shows), static racks/stands/trough, the balance (only on benches that weigh: E1, E7 and the free bench, so the others stay one tile wide) whose digits are a canvas texture on a plane laid on the display's sloped face |
| `vesselView.ts`, `kinds.ts` | one vessel: glass from the GLB, liquid on its `inner` cavity, eased fill/colour/turbidity/sediment; `CrucibleView` (procedural + lid), `FunnelView`, `GasTubeView` (inverted, water pushed out by the gas), `HofmannView` (three columns, H2 falls twice as fast as O2, electrode bubbles) |
| `liquid.ts` | the liquid volume shader (below) |
| `vesselFx.ts`, `fxBubbles.ts`, `fxFoam.ts`, `pieces.ts` | bubbles (pooled instanced spheres, rise speed from gas rate, pop at the surface, spawn at metal), foam column (bumpy, spills over the rim), steam sprites, crystals/powder that shrink and grow with mass, metal pieces (nail with copper coat overlay, Mg ribbon, granules, ash), the Mg flash (own envelope, rate limited, soft option) |
| `heater.ts` | tripod + gauze + Bunsen/alcohol burner or hot plate that grows under a heated vessel, flame shader card, plate glow |
| `closure.ts`, `gasLines.ts` | balloon (inflates with the gas) and stopper (flies off on `pop`), rubber hoses for `gasTo` |
| `props.ts`, `reagentLook.ts`, `shelf.ts` | shelf bottles/jars/droppers (colours read from the engine itself by probing a scratch `LabSim`), solids, hand tools (rod, pH strip, thermometer, splint) |
| `interact.ts`, `toolUse.ts`, `pour.ts`, `highlights.ts` | drag and drop, pour sessions, tool use, rings |
| `labAssets.ts`, `framing.ts` | loader on `ctx.assets.withRoot('lab')` (short part names, tinted parts); `benchFraming`: framing box and orbit limits per bench (`scene.camera`) |

### Glass
`glass.ts`: the lab GLBs' painted `_gel` textures are alpha veils that read as an opaque white sleeve, so every `glass` part uses one own physical material (clear, thin fresnel rim, strong environment reflections, double sided, no depth write). Reagent labels are painted canvas decals (name, strength, cap colour band); powders are matte mounds; extra cool fill and warm kicker lights, blob contact shadows and a clearcoated bench give the lighting depth.

### Liquids
The glass asset ships a closed `inner` cavity. `liquid.ts` draws it with a shader: everything below a plane (in the vessel's object space, so the surface stays level when the vessel tilts); back-face fragments whose view ray crosses the surface inside the cavity become the surface cap (ripples from stirring/pouring, meniscus lip, fresnel, sparkle); a layer of the incoming liquid fades downward after a pour (marbling), turbidity tints the whole body, and sediment is an opaque bottom layer with its own top cap. `low` quality drops ripples and specular. Colours come from the engine's Beer-Lambert `liquidRgb`, eased in display space, so indicator and reaction changes fade smoothly. A sampled pH, temperature or turbidity change never pops.

### Interaction (pointer events, no mouse-only code)
- Pick up a shelf bottle, jar, dropper, loose solid or a vessel; valid targets get a green ring (red ring flashes when the engine refuses). Release over a target for one step; hold still over it (0.35 s) to keep pouring in chunks every 0.9 s; the mouse wheel changes the chunk (5/10/20/50 mL, damla, grams). Liquids pour with a tilting source and a droplet stream; powders stream; indicators drip; metals drop in.
- Click the burette and hold: it drips 0.5 mL every 0.45 s into the flask below. Click a heater to switch it off, the balance to tare, the crucible for its lid, the Hofmann voltameter for the 9 V supply; double-click a vessel to heat it (Bunsen). Drop a vessel on the balance to weigh it. Tools: the rod stirs while held over a vessel, the pH strip dips and takes the colour of the reading, the thermometer parks in the vessel and shows its temperature, the splint lights and tests the gas.
- Keyboard and menu: the host's action panel (`createLabInteractions`) drives the same engine; `interactions.run` is wrapped so the animation plays for those actions too. `setHover`/`setFocus` draw the same rings.
- Accessibility: every on-bench action exists in the panel path and the host announces journal lines in its `aria-live` region; reduced motion removes wobble, steam and tumbling and keeps a calm bubble trickle; the flash is rate limited and capped (`limitFlash`) with the "Yumuşak parlama" option.

## Explainers (`createChemLabExplainer(ctx, 'eN-particles')`)
A pure function of time over the engine's `ParticleScript`:
- `explainer/plan.ts` turns the stages into particle lifetimes. The number of live particles of every species at the end of each stage equals `stage.counts` (tested). Each stage that changes counts has reaction events: reactants converge to a meeting point and vanish, products appear there and drift off; proton and electron transfers are tokens travelling between the particles involved; lattices rest as a cluster on the floor; everything wanders by closed-form motion (amplitude by the stage's `motion`).
- `explainer/molecules.ts`: ball-and-stick templates (H2O, CO2, H2, O2, H2O2, H3O+, OH-, HCO3-, H2CO3, CO3 2-, SO4 2-, NO3-, acetic acid/acetate, a two-ring cabbage pigment whose H count follows the formula, a generic cluster for anything else).
- `explainer/particles.ts`: instanced atoms (one mesh per element), bonds, charge halos (red +, blue -), transfer tokens, reaction rings. `explainer/scene.ts`: the macro beaker zooms into a glass volume (first 1.5 s), species labels and the equation (Temel: word equation, İleri: formula with state symbols) follow the stages.

## Quality presets
| | low | medium | high |
|---|---|---|---|
| glass LOD | 1 | 0 | 0 |
| liquid shader | flat tint, no ripple/specular | full | full |
| bubbles per vessel (pool) | 70 (14/s) | 220 (42/s) | 420 (70/s) |
| steam | none | 40 sprites | 70 sprites |
| crystals per vessel | 40 | 110 | 200 |

Measured on the GTX 1080 Ti (Chromium, D3D11, 1600x900, free-bench-style load of six vessels reacting, heating and foaming): draw + `gl.finish` 2.1 ms median / 2.7 ms p95 at medium and high, 2.4 ms at low; scene `sync` 0.2 ms median. About 200 draw calls and 540k triangles at medium (the heavy GLBs are the rack and the Hofmann voltameter).

## Open points
Continuous pours write one Defter line per chunk (the shell merges consecutive pours). Labels: one per bench item with `anchorId = simId`; the host's Etiketler mode decides which show.

## Tests
`tests/modules/chemLabHelpers.test.ts` (pure helpers, profile, layout for the free bench and all ten experiments), `chemLabExplainer.test.ts` (plan invariants for all ten scripts, molecules, scene determinism), `chemLabScene.test.ts` (scene smoke without WebGL: every experiment, reference solutions, pointer drops, keyboard path), `tests/e2e/chemlab.spec.ts` (real mouse drag of the vinegar bottle, baking soda, bubbles, explainer, no console errors).
