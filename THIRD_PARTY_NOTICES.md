# Third-party notices

Each component below is under its own license; **the noncommercial restriction of the main project (`LICENSE`) does not apply to them**, their own terms do.

## Runtime dependencies (shipped in the site)

| Package | License | Use |
|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) 0.180 | MIT | 3D rendering; `GLTFLoader`, `MeshoptDecoder`, `OrbitControls`, `EffectComposer` post-processing (GTAO, bloom, SMAA, output) and `RoomEnvironment` from `three/examples/jsm` |
| [@fontsource/cormorant-garamond](https://github.com/fontsource/font-files) | OFL-1.1 (font by Christian Thalmann / Catharsis Fonts) | Headings and body text, self-hosted (latin and latin-ext subsets, so Turkish letters render) |
| [@fontsource/caveat](https://github.com/fontsource/font-files) | OFL-1.1 (font by Impallari Type) | Handwritten notes and section titles, self-hosted (latin and latin-ext) |

The SIL Open Font License 1.1 allows bundling and redistribution of the fonts with the site; the fonts are not sold on their own.

## Development dependencies (not shipped)

[Vite](https://github.com/vitejs/vite) (MIT), [Vitest](https://github.com/vitest-dev/vitest) (MIT), [jsdom](https://github.com/jsdom/jsdom) (MIT), [Playwright](https://github.com/microsoft/playwright) (Apache-2.0), [TypeScript](https://github.com/microsoft/TypeScript) (Apache-2.0), [ESLint](https://github.com/eslint/eslint) and typescript-eslint (MIT / Apache-2.0).

## Tools (not shipped)

[Blender](https://www.blender.org) (GPL, run headless only to build the models; its output is not covered by the GPL) builds the GLB files under `public/models` from the generator scripts in `tools/blender`.

## Content

- The 3D models, the Blender generators, the learner text and the application code are original to this project and covered by the project license.
- Micrographs under `public/micrographs` come from Wikimedia Commons. **Each image keeps its own license** (for example CC BY 4.0 or CC BY-SA 4.0); author, license and file page are shown in the app next to the image and on the Kaynakça (bibliography) page, generated from `src/data/micrographs.ts`.
- Texts cite their sources (MEB programs, Vikipedi / Wikipedia under CC BY-SA, OpenStax Biology 2e under CC BY-NC-SA 4.0, used only to cross-check facts: no text or images are copied); explanations are written in our own words, see `docs/adr/0004-own-words-with-mandatory-sources.md` and `docs/SOURCES.md`.
