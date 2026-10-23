# Architecture

Vite + TypeScript (strict) + plain three.js, static site, no backend (ADR 0002). DOM UI is plain TypeScript; no framework.

## Modules (`src/`)

| Module | Responsibility | May import |
|---|---|---|
| `data` | typed content (`types.ts` is the fixed contract; sources, kazanımlar, organelles, cells, micrographs) | — |
| `core` | pure, DOM-light helpers: seeded RNG, URL parsing, safe DOM builder `h()` and `escapeHtml`, quality presets, the `Store`, and the `Catalog` (indexed view of the data with cross-reference checks) | `data` |
| `scene` | everything three.js: asset loading with placeholder fallback, materials, layout solver, cell assembly, cutaway, camera, post-processing, labels, the `Stage` | `data`, `core` |
| `ui` | DOM panels (cell list, legend, stage overlay, info card, microscope, compare), the Kaynakça and Hakkında pages, styles | `data`, `core`, `scene` (types only in practice) |
| `app` | composition root: wires `Store` <-> `Stage` <-> `ui`, URL state, routing | all |
| `main.ts` | entry: fonts, data, `startApp` | `app`, `data` |

Rules (ESLint enforces both, see `eslint.config.js`): imports only go in the direction `data/core -> scene -> ui -> app`; other modules are imported only through their `index.ts` (except `data/types`, the shared contract). The UI never touches the stage or the store directly: it calls the `UiActions` interface (`src/ui/types.ts`), which `app` implements.

## Data flow

```
user input -> ui (UiActions) -> app.actions -> Store.patch -> shell.update(state)   (DOM)
                                                      \-> Stage.apply(view)         (3D)
3D pointer / keyboard -> Stage events (select, loading, stats) -> app -> Store
```

`AppState` (`core/store.ts`) holds route, cell, level, selection, hidden organelles, view mode (`full` / `cutaway` / `isolate`), hide-others, cut position, labels, auto-rotate and the compare pair. Organelles that do not belong to the current level (`OrganelleInfo.levels`) are hidden in the 3D scene and left out of the legend; the app adds them to the stage's hidden set (`viewOf` in `app/app.ts`).

## The 3D scene (`src/scene`)

- **Assets** (`assets.ts`, `assetTypes.ts`): `public/models/organelles/<id>.glb` (+ `<id>.meta.json`) loaded with `GLTFLoader` + `MeshoptDecoder`. Node transforms are baked into the geometry; parts are split into LOD0..2 by the `LOD*` ancestor and into `clay` / `gel` by the material name suffix; vertex colours are pushed to richer saturation on load. The authored materials are discarded. A missing or broken GLB (or a dev server that answers with `index.html`) falls back to `placeholders.ts`: simple closed primitives per organelle id, coloured from `OrganelleInfo.color`, so the app works without any asset.
- **Materials** (`materials.ts`, `normalMap.ts`): one `MeshPhysicalMaterial` per organelle id and kind (vertex colours, satin sheen, light clearcoat, shared generated tileable micro-normal map; the picked instance is brightened through the instance colour). Gel is alpha-blended. Shell parts have three looks: a thin-glass ghost with a fresnel rim for the full view (clear in the middle, so it never whitens what is behind it; a depth-only prepass makes only the nearest layer draw), the authored opaque wall or a glossy membrane for the cut view, and a matte vertex-shaded bowl (`bowl.ts`) that shows the cytoplasm bed through the cut.
- **Layout** (`layout.ts`): `solveLayout(cell, radiusOf)` places every `PlacementRule` instance by seeded rejection sampling (seed from the cell id): centre-zone items first, then nucleus-near, then the rest by size; zones are `center`, `nucleus-near`, `periphery`, `wall-adjacent`, `cytoplasm`; the shell is an analytic signed distance (ellipsoid, rounded box, capsule). Organelles are drawn larger than life (`ORGANELLE_BOOST` per cell, less for the nucleus and the vacuole) and slightly biased to the lower half, which the default cut shows. Flat cells (the plant slab) place organelles as flattened ellipsoids: yaw is free, tilt is small, each has a horizontal and a vertical half size from its bounding box, overlap and containment use those (`overlapOf`, `fitsInShell`), and an instance that does not fit is squashed in y (down to 60 %) before it shrinks; wall-adjacent organelles (chloroplasts) lie on the floor along the rim. Elsewhere, when no spot is found the instance shrinks (zone dropped below 80 %) instead of overlapping. Pure and unit-tested (`tests/layout.test.ts`).
- **Assembly** (`cellScene.ts`, `organelleSet.ts`, `shellParts.ts`): per organelle id and part, three `InstancedMesh` (one per LOD) that instances are binned into every frame by a triangle budget (see `docs/SETTINGS.md`); instances below the preset's projected-size threshold are culled. Isolate shows the picked instance only. Picking is a cheap ray versus bounding sphere test per instance (shell parts: raycast against the coarsest mesh) and reports the instance index.
- **Cutaway** (`cutaway.ts`): a real horizontal clipping plane (normal -y, `material.clippingPlanes`) removes the top; the stencil capping technique draws the cross-sections. Every cappable mesh gets invisible stencil twins (always the coarsest mesh); caps are drawn per group, one after another, so each has its own colour: the shell by parity (robust to either normal orientation of nested hollow shells), each organelle by winding (overlapping and nested parts stay filled), in the organelle's own tint. Closed meshes are required (ADR 0003). The clip plane is per material, so GTAO is switched off while a cut is shown. The cavity needs no cap: the inside of an outline mesh (`bowl.ts`) is drawn as the cytoplasm bed, with contact shadows from the key light.
- **Pipeline** (`pipeline.ts`, `viewport.ts`, `paneSet.ts`): `EffectComposer` per pane: render (half float, with stencil, no MSAA), optional half-resolution GTAO, bloom, `OutputPass` (ACES), SMAA, then a composite pass that grades the colour and puts the scene over the parchment backdrop with a warm vignette. The scene is rendered on a transparent background so the backdrop keeps its exact colours. MSAA is deliberately not used: a multisampled target with stencil broke the caps on SwiftShader.
- **Selection and labels** (`sceneQueries.ts`, `labels.ts`, `stageFocus.ts`): the selected organelle gets a warm inverted-hull outline (`OrganelleSet.setOutline`), a stronger tint on the picked instance, and every other organelle is dimmed; the camera flies to the picked instance and the picture slides left and up a little (`CameraRig.setShift`, a view offset) so it sits clear of the floating panel and the toolbars. A label is anchored on the nearest instance that is neither clipped nor occluded (other organelles on the line of sight, or, in the cut view, the shell side or floor), and labels slide outward so they never cover the selected organelle; the rest is spread vertically.
- **Comparison**: two `Pane`s share one canvas (viewport + scissor halves) and one linked camera (`CameraRig.syncTo`); both cells are scaled to the same radius and organelles the other cell lacks get a steady glow.
- **Stage** (`stage.ts`): owns the renderer, rig, panes (`PaneSet`), labels, input (`stageInput.ts`), fades (`stageEffects.ts`), frame statistics and the adaptive `QualityGovernor` (`governor.ts`). The default view is the cut one from 35 degrees above. The loop renders **on demand**: it only draws when the camera moves or damps, a fade runs, something is hovered (pulse) or `requestRender()` was called. Everything it creates is disposed in `dispose()` (the compare-pane leak of textures is covered by disposing every post-processing pass).

## UI (`src/ui`)

Components return `{ el, update(state) }`. Interactive elements are created once and updated in place (so keyboard focus survives state changes); lists that depend on cell and level are rebuilt only when that key changes. All learner text goes through `h()` (text nodes), links through `safeUrl()` (http/https only). Pages are rendered from the data: `bibliography.ts` (every Source, micrograph and kazanım) and `about.ts`.

## Routing and URL

Hash routes: `#/` (explore), `#/kaynakca`, `#/kaynakca/<sourceId>` (deep link, focuses that entry), `#/hakkinda`. Query: `?cell=plant|animal|bacterium&level=temel|ileri&quality=low|medium|high&perf`. The app keeps `cell` and `level` in the URL with `history.replaceState`. See `docs/SETTINGS.md`.

## Tests

`tests/*.test.ts` (Vitest; jsdom where DOM is needed): layout solver, catalog / data integrity, URL parameters, escaping, scene assembly with placeholders and the cutaway, fonts, plus the lead's `data.test.ts` and the asset agent's `assets.test.ts`. `tests/e2e/smoke.spec.ts` (Playwright, Chromium, SwiftShader, runs against `vite preview`) covers the user-facing flows. Fixtures for tests live in `tests/fixtures`.
