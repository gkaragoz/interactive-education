# Learning modules (contract)

The site is a shell plus **modules**. `cell` (the existing explorer) is module 1; the others are animated 3D lessons driven by a timeline. Content contract: `src/data/moduleTypes.ts`. Scene contract below.

## Module list and release plan
| Version | Module id | Topics | Kazanım |
|---|---|---|---|
| v0.2 | shell + `mitosis-meiosis` | mitoz, mayoz I and II, crossing over, independent assortment, non-disjunction | BİY.12.1.3, 12.1.4, 12.1.5; FB.8.3.3 |
| v0.3 | `membrane-transport` | simple and facilitated diffusion, osmosis, active transport, endocytosis, exocytosis | BİY.9.2.2, 9.2.3 |
| v0.4 | `dna-protein` | DNA structure, replication, transcription, translation | BİY.12.2.1–3; FB.8.3.2 |
| v0.5 | `energy` | photosynthesis (light and Calvin), cellular respiration, fermentation | BİY.10.1.2, 10.1.7, 10.1.9 |
| v0.6 | `muscle`, `nervous`, `genetics` | sliding filament, action potential and reflex, Mendel and Punnett | BİY.11.1.7–8, 11.1.10, 12.2.5 |

## Scene contract (implemented in `src/scene/moduleScene.ts` by the shell work)
A module scene is a **pure function of time**: `seek(t)` poses everything for time `t` (seconds at speed 1), cheap and deterministic, so scrubbing, stepping and reverse play work. No wall-clock use, no accumulated state (seeded RNG only).

```ts
export interface ModuleContext {
  assets: ModuleAssets;        // loadGlb(id) -> Object3D clone with the shared painted materials; instance helpers
  quality: QualityPreset;      // low | medium | high
  level: LevelId;
  reducedMotion: boolean;
  trackId: string;
  options: Record<string, string>; // ModuleOption choices, e.g. { 'chromosome-set': '2n4' }
  rng(seed: number): () => number;
}
export interface ModuleScene {
  readonly root: THREE.Group;
  readonly duration: number;                    // equals TrackInfo.duration
  seek(t: number): void;                        // pure pose function
  cameraAt?(t: number): { position: Vec3; target: Vec3 }; // optional cinematic path; user can override by orbiting
  labelsAt?(t: number): { text: string; world: Vec3; anchorId?: string }[];
  chartAt?(t: number): Record<string, number>;  // overrides the interpolated chartPoints
  setOptions?(o: Record<string, string>): void;
  dispose(): void;
}
export interface ModuleDefinition {
  id: ModuleId;
  load(): Promise<{ info: ModuleInfo; createScene(ctx: ModuleContext): Promise<ModuleScene> }>; // lazy chunk
}
```
Registry: `src/modules/registry.ts` lists released modules; the home page renders cards from it. A module appears in production only when registered.

## File ownership
- `src/data/modules/<id>.ts`, sources and kazanımlar: content work.
- `src/modules/<id>/**`: that module's animation work (scene, helpers, tests `tests/modules/<id>.test.ts`).
- `public/models/modules/<asset>.glb` (+ textures): asset work, contract v2 from `docs/ASSETS.md`.
- `src/ui`, `src/app`, `src/core`, `src/scene`: shell work; modules use only the public `scene` and `core` indexes.

## Rules for every module
- Own-words content with Sources + kazanım (ADR 0004); simplifications written in `ModuleInfo.simplifications` and shown in the UI.
- Two levels: Temel (names, order, what happens) and İleri (mechanism, details); Temel never exceeds the grade-5/8 programme limit.
- Animations stop moving under `prefers-reduced-motion` (step through phases with the playhead instead).
- Performance: ≤ 16 ms/frame at medium on the GTX 1080 Ti, low preset lighter; geometry instanced; dispose everything.
- Tests: pure `seek` determinism (same t → same poses), phase boundaries, chart values, data integrity; e2e plays/scrubs the module and checks no console errors.

## Framework API (implemented, step 1)
Contract above is implemented as written, with these exact points: `ModuleDefinition.id` is `ModuleId | string` (the dev-only `__demo` module); `QualityPreset` is `'low' | 'medium' | 'high'`; `ModuleScene.labelsAt` labels may carry an `anchorId`; `ModuleLabel`, `Vec3`, `seededRng` are exported from `src/scene`.

- **Mount a scene** (module author): export a `ModuleDefinition` whose `load()` dynamically imports your info and scene code; `createScene(ctx)` builds a `THREE.Group` root and returns a `ModuleScene`.
  1. `const set = await ctx.assets.instances('chromosome', 8)` (or `await ctx.assets.loadGlb('cell-wall')`); files are `public/models/modules/<id>.glb`; a missing file becomes a coloured primitive placeholder (and a toast).
  2. `root.add(set.group)`; in `seek(t)` compute every pose from `t` only: `set.setMatrix(i, m)`, `set.setTint(i, color)`, `set.setVisible(i, false)`, then `set.commit()`.
  3. Return `{ root, duration, seek, labelsAt?, cameraAt?, chartAt?, setOptions?, dispose }`; dispose what you created (`set.dispose()`).
  4. Register it in `src/modules/registry.ts` (`RELEASED`, with `definition`) when it ships. Look at `src/modules/demo/` for a complete example.
- **Timeline/session** (`src/core/timeline.ts`, `moduleSession.ts`, pure, no DOM): `Player` (play/pause/seek/speed 0.25-2/loop/stepPhase/tick; reduced motion disables `play()`), `ModuleSession` (level-filtered phases, chart values, check and predict prompts that fire when the playhead crosses `atTime` and pause playback, tally).
- **Host** (`src/scene/moduleStage.ts`, `src/app/moduleHost.ts`): `ModuleStage` renders the scene with the explorer's look; `setTime(t)` is the only way the scene moves; it draws every frame only while playing.
- **Routes**: `#/modul/<id>[/<track>]`; `#/modul/cell` is the explorer. The `__demo` module opens only in dev builds or with `?demo`.
- Painted textures for module assets (KTX2 tiers like organelles) are not wired yet; module GLBs use their vertex colours until module textures exist.

## Shell behaviour (step 2)
- Home cards come from the registry: `RELEASED = cell + ALL_ENTRIES in RELEASED_IDS`; `UPCOMING` is filtered by `RELEASED_IDS`; previews appear only with `?demo`.
- Level switches keep the playhead and resume playback; phases, segments, checks, predicts, chart points and tracks are filtered per level (`tracksFor`/`resolveTrack`); predicts by `trackId`.
- Optional `ModuleOption.trackIds` hides an option on other tracks; chart strips show only series that the active track references in `PhaseInfo.chartPoints` (if no phase has points, all series show).
