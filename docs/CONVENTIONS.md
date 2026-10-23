# Conventions

- TypeScript strict (`noUncheckedIndexedAccess`, `noUnusedLocals`); no `any`; explicit return types on exported functions.
- Language: UI and learner text in Turkish (with ğ ş ı İ ç ö ü, never ASCII stand-ins); code, identifiers, comments and docs in English. Ids are English kebab-case and equal the asset file names.
- Files: `camelCase.ts`, one concept per file, under ~300 lines (ESLint warns above).
- Each module exposes only `index.ts`; internals are not imported from outside. Import direction: `data/core -> scene -> ui -> app` (see `docs/ARCHITECTURE.md`).
- Learner text only enters the DOM through `h()` / text nodes. Never `innerHTML` with data; links go through `safeUrl()`.
- Dispose every three.js geometry, material, texture, render target and event listener you create. Shared geometries belong to `AssetLibrary`; per-scene materials belong to `MaterialLibrary`.
- Determinism: layout and procedural textures use the seeded RNG in `core/rng.ts`; no `Math.random()` in anything that shapes the scene.
- Render on demand: anything that changes the picture must call `Stage.requestRender()` (or run inside the frame callback).
- Scene units are micrometres; Y up. The cut plane is horizontal (normal -y) and removes the top of the cell.
- Interactive controls are real `<button>`/`<input>`/`<a>` elements with an accessible name (visible text or `aria-label`), `aria-pressed` for toggles, a visible `:focus-visible` ring, and AA contrast (>= 4.5:1). Motion respects `prefers-reduced-motion` (no damping, no fades, no pulses, no auto-rotate).
- Use pointer events, not mouse events. Desktop layout only until requested.
- Tests (Vitest) in `tests/`, named `<area>.test.ts`; logic must be testable without WebGL (three.js core classes work in Node). Browser flows in `tests/e2e`.
- Comments explain why, not what.
- Docs, `GLOSSARY.md`, ADRs and `docs/ROADMAP.md` change in the same commit as the behaviour they describe.
