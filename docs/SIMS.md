# Sim modules (contract, draft)

A **sim module** is an interactive sandbox with a fixed-step simulation. It lives beside timeline modules (`docs/MODULES.md`) and shares the shell, stage, materials, loading, labels, quality presets and the data layer.

```ts
export interface SimParam { id: string; labelTr: string; unit?: string; min: number; max: number; step: number; default: number; lockedInChallenge?: boolean }
export interface SimMeasurement { id: string; labelTr: string; value: number | string; unit?: string }
export interface SimScene {
  readonly root: THREE.Group;
  params: SimParam[];
  step(dt: number): void;              // fixed step, deterministic (seeded RNG only)
  setParam(id: string, value: number): void;
  reset(values?: Record<string, number>): void;
  measurements(): SimMeasurement[];
  snapshot(): unknown; restore(s: unknown): void;   // scrub-back and Defter replay
  pointer?(ev: SimPointerEvent): void;  // drag and drop, picking via the host raycaster
  labels?(): { text: string; world: Vec3 }[];
  dispose(): void;
}
```
Rules: logic (state, rules, engine) is pure and unit-tested without WebGL; rendering reads state; fixed step 1/60 with accumulator; no wall-clock in logic; every scene works at `low`; reduced motion pauses decorative motion only.

## Host API (implemented in v0.9, `src/scene/simScene.ts`, `simStage.ts`, `src/app/simHost.ts`, `src/ui/lab*.ts`)

**Registry.** A sim module is a `RegistryEntry` with `sim: SimDefinition` (and `definition: null`): `load()` returns `{ info: SimInfo, createSim(ctx): Promise<SimScene>, createExplainer?(ctx, scriptId): Promise<ModuleScene> }`. Route `#/modul/<id>[/<slug>]`: for `chem-lab` the slug is an experiment id (`sirke-kabartma`, ...), `serbest` is the free bench, missing means the first experiment. Preview only with `?demo` until `RELEASED_IDS` lists it. `SimInfo` (`src/data/moduleTypes.ts`) has the card fields of `ModuleInfo` plus `prompts: SimPrompt[]` (a check asked after a guided step: `experimentId`, `afterStepId`).

**SimContext** (`createSim(ctx)`): `assets: ModuleAssets` (GLBs, `organelle()`, painted textures), `quality`, `level`, `reducedMotion`, `rng(seed)`, `experimentId: string | null` (null = free bench), `softFlash: boolean`.

**SimScene** (what the scene implements): `root`, `params`, `step(dt)`, `sync?(frameSeconds)`, `setParam`, `reset`, `measurements()`, `snapshot()/restore()`, `pointer?(ev)`, `setHover?(id)`, `setFocus?(id)`, `labels?()`, `interactions?`, `pickRoots?()`, `benchY?`, `dragLift?`, `dispose()`. The chemistry lab's scene is a `LabSimScene` = `SimScene` + `lab: LabSim` + `loadExperiment(id | null)` (+ optional `setSoftFlash(on)`). The lab UI reads and drives only `scene.lab`, `scene.interactions`, `scene.measurements()`.

**Stepping.** `SimStage` owns a `SimClock` (`src/core/simClock.ts`): real frame time x time-lapse factor (1x, 5x, 20x, 60x) accumulates and whole fixed steps are taken: 1/60 s up to 5x, longer steps (0.067 s at 20x, 0.2 s at 60x, never above 0.25 s) above that, at most 5 steps per frame, a frame over 0.1 s is clamped. Pause stops stepping (the picture still redraws). `sync(frameSeconds)` runs once per drawn frame after the steps for meshes and decorative motion; rendering must not change simulation state.

**Pointer (drag and drop).** Tag every pickable object (or its group) with `object.userData.simId = '<id>'`; the host raycasts `pickRoots()` (default `[root]`) and walks up to the nearest tag. Events (`SimPointerEvent`): `hover` when the tag under the pointer changes (also `setHover(id | null)`), `down` on a tagged hit with the left button (the host captures the pointer, stops the orbit camera and puts the drag plane through the hit point raised by `dragLift`), `move` with `world` on that horizontal plane and `dragId` set, `up` / `cancel` ending the drag; while dragging, `hit` is the tagged object under the ray that is not the dragged one, so the `up` event's `hit` is the drop target. Without a drag `world` is the pointer on the plane y = `benchY`. Cursor is `grab` over pickable objects and `grabbing` while dragging.

**Keyboard path.** `createLabInteractions(lab, shelf)` (`src/scene/labInteractions.ts`) turns the engine into `SimInteractions` (`items()`, `commands(item)`, `run(item, command, { targetId, amount, choice })`): the lab UI offers every operation as "pick an item, a command, a target, an amount, Uygula" without any drag. A scene sets `interactions` to it (the placeholder and the lab scene do).

**History / Defter replay.** `SimStage.checkpoint()` snapshots (every simulated second and after every learner action, also when a drag ends); clicking a Defter line calls `replayTo(t)`, which restores the newest snapshot at or before `t` and pauses.

**Explainer.** "Nedenini göster" (after all steps are done) opens a dock with the experiment's `ParticleScript` (play, pause, scrub, speed, stage captions and species counts). When the definition has `createExplainer(ctx, scriptId)` its `ModuleScene` is shown in the stage (swapped in without losing the bench) and `seek(t)` follows the dock; "Tezgâha dön" or Esc swaps back. Without it the dock is the text explainer.

**Safety.** A refused op writes a `blocked` journal line; the UI opens a Turkish alert dialog with the engine's card text (focus moves to "Anladım", Esc closes) and announces it. Observations, warnings and measurements in the Defter are announced through an `aria-live` region. Flashes: the scene rate-limits them and honours the "Yumuşak parlama" checkbox (`setSoftFlash`, default on).

**Sorular.** With Sorular off the guided checks after steps are not asked; the setting is the same as for timeline modules.

## v0.9.1 additions (host)
- **Framing and limits.** `SimScene.camera?: StageFraming` (`center`, `radius` or `halfWidth`/`halfHeight`, `target`, `distanceMin/Max`, `polarMin/Max`, `azimuthMin/Max`) is read when the sim is shown and after `loadExperiment`; `SimStage.setFraming(f | null)` sets it from outside. The home view fits the box to about 85 % of the free area (safe-area aware); the presets (Genel, Üstten) use the same centre and distance. `SimStage.focusItem(id)` flies to the tagged object ("Yakınlaştır"), `focusItem(null)` returns to the overview.
- **Asset roots.** `ctx.assets.withRoot('lab')` returns an `AssetRoot` for `public/models/lab/` (textures `public/textures/lab/<id>/<tier>/`): `load(id, color?)` gives `{ asset, parts, meta (raw meta.json), placeholder }`, `loadGlb(id)`, `instances(id, n)`, `instancesFrom(id, parts, n)` (renamed or filtered parts), `preload(ids)`, `loadedNow(id)`, `matId(id)` (= `lab-<id>`), `material(id, kind)`; KTX2 tiers stream by quality automatically. The old private members stay for now.
- **Picking.** `SimStage.pick` ignores meshes below a hidden ancestor; `pickRoots()` replaces `[root]` entirely when given.
- **Labels.** The lab toolbar has Etiketler: seçili (default: only the hovered, focused or selected item, matched by `labels()[i].anchorId` = the item's `simId`), hepsi, kapalı. Keep `anchorId` equal to the `simId`.
- **Defter.** Consecutive additions of the same amount type to one vessel within 4 simulated seconds show as one updating line ("... eklendi. (toplam 45 mL)"); the raw journal and the announcements are unchanged. The UI reads `journal`, never `drainEvents()`.
- **Settings.** Yumuşak parlama is saved (`bilim.softFlash`, default on).
- **Perf.** `npm run perf` includes the lab (experiments first and last at medium and low; `--lab=none|a,b`); `window.__bilimSim.runSolution()` plays the open experiment's reference solution.

## v0.9.2 additions (lab shell)
- **First visit.** The Güvenlik sheet (`src/ui/labSafety.ts`, data from `src/data/chemlabSafety.ts`: rules, protective equipment, the "evde deneme" table with Gözetimle / Hayır / Asla badges, blocked combinations, a source link on every line) opens once (`bilim.labSafetySeen`), then the start card (`labStart.ts`: ten experiment cards with number, Temel / İleri, Sanal and about N dk, the free bench, "Deney 1'e başla", dismissible). The choice is remembered (`bilim.labLast`): a visit without a slug resumes it and shows neither. The toolbar's Güvenlik button reopens the sheet any time.
- **Explainer.** `SimDefinition.load()` may return `timeline: ModuleInfo` (the content agent's `chem-lab` tracks, ids = experiment ids). "Nedenini göster" then opens a `ModuleSession` on the experiment's track: phase card with the level's text, segments, scrub bar with pause markers, speed, step buttons, the Kendini dene list and the checks and predicts that pause it (only when Sorular is on); without a track it falls back to the engine's stage captions. The 3D explainer scene (`createExplainer`) is posed at `t - start of the first particle phase`, clamped to `ParticleScript.durationS`.
