# Bilim Atölyesi · Hücre

**Türkçe kısa tanıtım.** Bilim Atölyesi, ortaokul ve lise öğrencileri için hazırlanmış etkileşimli bir 3B fen öğrenme sitesidir. İlk modül hücre biyolojisidir: hayvan, bitki ve bakteri hücresini döndür, ortadan kes (kesit), organelleri tek tek seç, iki hücreyi yan yana karşılaştır. Açıklamalar iki seviyededir (Temel: 5–8. sınıf düzeyi, İleri: 9–12. sınıf Biyoloji düzeyi), MEB kazanımlarına bağlıdır ve her bilginin kaynağı **Kaynakça** sayfasında gösterilir. Mikroskop görselleri Wikimedia Commons'tandır; yazar ve lisansları gösterilir.

Canlı sürüm: <https://gkaragoz.github.io/interactive-education/>

---

**English.** Bilim Atölyesi ("Science Workshop") is an interactive 3D science site for Turkish school students, aligned with the MEB curriculum and fully cited. Module 1 is cell biology (animal, plant and bacterial cell). The interface is in Turkish; code and docs are in English. Static site: Vite + TypeScript (strict) + plain three.js, no backend.

## Features

- Parchment-style layout: cell list and organelle legend (colour dots, show/hide), a large 3D stage, an organelle info card with a Temel / İleri level switch, a microscope panel with real micrographs and a cell comparison panel.
- Organelle GLB assets built by headless Blender (`tools/blender`), with procedural placeholders when a file is missing.
- Seeded layout solver (no overlaps, deterministic per cell), instanced meshes, LOD by camera distance.
- Real cutaway: clipping plane with a stencil-capped cross-section, slider controlled; works with Isolate and Comparison.
- Orbit / zoom / pan with damping, hover highlight, click to select and focus, HTML leader labels, hide / isolate / hide others, reset view, PNG screenshot, side-by-side comparison with a linked camera.
- Generated bibliography (every Source with URL, publisher and license; micrographs with author and license), About page.
- Keyboard access, aria labels, focus rings, AA contrast, `prefers-reduced-motion`.

## Run

```
npm install
npm run dev          # http://localhost:5173/
npm run check        # typecheck + lint + unit tests (must pass before "done")
npm run build        # production build in dist/ (relative base: works under a sub-path)
npm run preview      # serve dist/
npx playwright install chromium   # once
npm run e2e          # Playwright smoke tests (builds and serves the site itself)
```

URL parameters: `?cell=plant|animal|bacterium&level=temel|ileri&quality=low|medium|high&perf` (see `docs/SETTINGS.md`).

## Docs

`CLAUDE.md` (project rules), `GLOSSARY.md`, `docs/adr/`, `docs/ARCHITECTURE.md`, `docs/CONVENTIONS.md`, `docs/SETTINGS.md`, `docs/ASSETS.md` (GLB contract), `docs/CURRICULUM.md`, `docs/SOURCES.md`.

## Deployment

`.github/workflows/pages.yml` runs `npm run check`, builds and deploys `dist/` to GitHub Pages on every push to `main` (enable Pages with source "GitHub Actions" in the repository settings).

## License

PolyForm Noncommercial 1.0.0 with additional terms, see `LICENSE`. Third-party components and content licenses (fonts: OFL; micrographs: their own Commons licenses) are listed in `THIRD_PARTY_NOTICES.md`. © gkaragoz and Contributors.
