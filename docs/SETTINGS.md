# Settings and quality

There is no settings menu yet: the learner-facing options are the toolbar and panels (view mode, cut, labels, level). Rendering quality and debugging are chosen with URL parameters, never saved.

## Quality menu

The header has an **Ayarlar** button with a small popover: *Otomatik* (the adaptive governor, starting at medium), *Düşük*, *Orta*, *Yüksek*. The choice is saved in `localStorage` (`bilim.qualityMode`, every access in try/catch, so blocked storage only means nothing persists). `?quality=` in the URL overrides the saved choice and locks the menu (it says so).

## URL parameters

| Parameter | Values | Effect |
|---|---|---|
| `cell` | `plant` (default), `animal`, `bacterium` | cell type shown first; the app keeps it in sync with the page |
| `level` | `temel` (default), `ileri` | explanation level; the bacterium only exists at `ileri` and switches the level automatically |
| `quality` | `low`, `medium`, `high` | pins a rendering preset (see below); without it the adaptive governor starts at medium |
| `perf` | present (or any value except `0` / `false`) | FPS / frame time / draw calls / triangles overlay (bottom left) and a `window.__bilim` handle (`stage`, `store`, `catalog`; `stage.debug` has `setCameraPose`, `cameraPosition`, `screenPointOf`, `benchmark`) for the console and the Playwright tests; off by default |

Unknown or hostile values fall back to the defaults (`core/params.ts`, tested). Routes use the hash: `#/`, `#/kaynakca`, `#/kaynakca/<sourceId>`, `#/hakkinda`.

## Quality presets (`core/quality.ts`)

| | low | medium (default) | high |
|---|---|---|---|
| max pixel ratio | 1 | 1.25 | 1.75 |
| SMAA | off | on | on |
| ambient occlusion (GTAO, half resolution, 8 samples; paused while the camera moves and while a cut is shown) | off | off | on |
| bloom | off | on | on |
| key light shadow map | off | 1024 | 2048 |
| triangle budget for organelles + shell | 110 k | 520 k | 2 M |
| organelles drawn at full detail at once (LOD0) | 0 | 3 | 8 |
| LOD bias (higher keeps fine meshes for longer) | 0.6 | 1.0 | 1.4 |
| shell mesh detail near / far | LOD2 | LOD1 / LOD2 | LOD0 / LOD1 |
| instances smaller than this projected size are not drawn | 3.5 % | 0.8 % | all drawn |
| protein studs on the shell | hidden | faded with distance | faded with distance |
| cut-face caps for organelles (stencil twins) | shell only | all | all |

**Per-instance LOD.** Every frame the visible instances are sorted by projected size (radius / distance, the selected organelle counts three times), start at the coarsest mesh and are upgraded to LOD1, then LOD0, while the preset's triangle budget (minus the shell) and its LOD0 cap allow. The instances of one organelle are binned into three `InstancedMesh` per part, so a near mitochondrion can be detailed while a far one is cheap. The stencil twins used by the cut always use the coarsest mesh.

**Adaptive quality** (`scene/governor.ts`). Unless the URL fixes `?quality=`, the governor watches the time between consecutive drawn frames in groups of 45: above 24 ms (under ~42 fps) it steps the preset down (never below low); after four calm groups (< 18 ms) it steps back up, never above medium, and not to a level that failed in the last 25 s (no flicker between two presets). `?quality=high` or `?quality=low` pins the preset. The overlay (`?perf`) shows the preset in force in brackets.

### Measured (GTX 1080 Ti, Chrome/ANGLE D3D11, 1600x900, cut view, all 18 assets with painted textures streamed in, 90-frame orbit with a GPU wait after every frame: `window.__bilim.stage.debug.benchmark(90)`)

| cell | preset | ms / frame (avg, p95) | tris / frame | draw calls | texture GPU estimate | textures in renderer |
|---|---|---|---|---|---|---|
| plant | low | 1.0-1.6 (2.2) | 104 k | 30 | 38 MB | 26 |
| plant | medium | 2.9 (4.1) | 0.94 M | 116 | 153 MB | 60 |
| plant | high | 4.0 (4.5) | 2.0 M | 134 | 394 MB (peak, while tiers swap) | 66 |
| animal | low | 1.0 (1.4) | 46 k | 21 | 26 MB | 17 |
| animal | medium | 2.9 (3.8) | 1.14 M | 105 | 106 MB | 60 |
| animal | high | 3.3 (4.0) | 1.63 M | 121 | 372 MB | 66 |
| bacterium | low | 1.1 (1.4) | 34 k | 25 | 12 MB | 23 |
| bacterium | medium | 2.4 (2.9) | 0.56 M | 104 | 46 MB | 45 |
| bacterium | high | 2.4 (2.9) | 0.58 M | 94 | 184 MB | 51 |

The texture estimate counts transcoded texels (block-compressed, one byte each) plus a third for mips. The streamer plans against 350 MB and steps the lowest-priority assets down when the plan exceeds it; the numbers above are from before the budget was lowered from 380 to 350 MB and include the moments when an old and a new tier of one asset coexist.

### First-open download (all files of one visit, before the service worker has cached anything)

GLBs 21 MB, app shell (script, fonts, Basis transcoder) about 3 MB, micrographs 0.7 MB. Textures: low tier 12.3 MB, medium 24.6 MB, high 74.8 MB for the whole asset set (a cell uses most of it). So a first visit at **low** downloads about 37 MB; at **medium** about 61 MB (the low tier is fetched first so the cell is interactive at once, and then replaced); at **high** about 111 MB. A repeat visit costs nothing: the service worker has the GLBs and the low tier, and keeps every tier it has fetched.

Before this work the plant at high drew 3.8 M triangles (4.3 M with a cut) in 118 calls. Medium now stays under 1.2 M including the cut; low is about 15 times lighter than medium (about 70 k triangles, no post-processing, no shadows), which is the target for an integrated GPU. To measure on another machine: open `?perf&quality=medium` and run `__bilim.stage.debug.benchmark(90)` in the console.

## Accessibility settings that follow the system

- `prefers-reduced-motion: reduce`: no camera damping or fly-to tweens, no cell-switch fades, no hover pulse, no auto-rotate, no tilted note.

## Debugging

- `?perf` overlay: FPS (500 ms window), smoothed frame time of the draw call, draw calls and triangles of the last frame, geometries and textures alive in the renderer.
- In the console with `?perf` (or `npm run dev`): `__bilim.stage.debug.setCameraPose([x, y, z])`, `__bilim.stage.debug.screenPointOf('nucleus')`, `__bilim.stage.debug.benchmark(90)`, `__bilim.stage.setQualityLevel('low')`, `__bilim.store.patch({ ... })`.

Tone mapping is ACES (exposure 1.05) and a final composite pass adds the colour grade (saturation +22 %, contrast, warm highlights, cool shadows) and the warm vignette; the image-based light is a procedural `RoomEnvironment` filtered with PMREM (no HDR file). The key light is warm, the hemisphere fill is cool.

## Graphics connection

If the browser drops the WebGL context the stage pauses and shows "Grafik bağlantısı kesildi, yeniden bağlanıyor…"; when the context returns, three.js re-uploads geometry and textures and the stage rebuilds the environment map (`scene/contextGuard.ts`). A missing or broken model file shows a toast and a simple shape instead.

## Textures

Quality maps to a texture tier: Düşük = low, Orta = medium, Yüksek = high (heroes 1024 / 2048 / 4096 px, others 512 / 1024 / 2048). Assets without textures keep their vertex colours. The lowest tier loads first; the preset's tier streams in afterwards (see `docs/ARCHITECTURE.md`). The `?perf` overlay's texture count comes from `renderer.info.memory`; `stage.debug`-level estimates of texture memory use the compressed sizes from `meta.json` plus a third for mip levels (`TextureStore.estimatedBytes`); the target is at most about 400 MB on the GPU at high.

## Ambient motion

Cytoskeleton, vesicles and particles exist only at medium and high. Their drift is paced at about 30 frames a second and stops 20 seconds after the last user action; with `prefers-reduced-motion` nothing drifts or waves.

## Bundle (step 2)
Main chunk 125 KB (41 KB gz), three.js 812 KB (238 KB gz, lazy), module chunks lazy per module.

## Sorular (v0.7)
Ayarlar has a second group, Sorular: Açık (default) or Kapalı. Kapalı means the "Kendini dene" and "Tahmin et" prompts never pause or cover the animation in any module; the list in the side drawer still opens them. Stored under `bilim.questions` (`1`/`0`), overridden for a visit by `?sorular=0|1`.
