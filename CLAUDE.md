# Bilim Atölyesi (interactive-education)

Browser-based interactive 3D science education for Turkish school students, MEB-curriculum aligned and fully cited. Module 1: cell biology (animal, plant, bacterial cell and their organelles); chemistry and physics later. Three.js + TypeScript (strict) + Vite, static site, no backend. UI and learner text are Turkish; code, docs and identifiers are English. Vocabulary is in `GLOSSARY.md`; decisions are in `docs/adr/`.

Status: first release (M0–M3 done, M4 polish/publishing in progress). Read `docs/ROADMAP.md` for milestones, `docs/ARCHITECTURE.md` before touching `src/`.

## Scope now
- Desktop web only. Mobile/tablet is deferred until the user asks; use pointer events, not mouse-only events.
- Assets come from local Blender 5.2 run headless (`blender -b`); Llama + `blender-mcp` is optional (see `docs/BLENDER_PIPELINE.md`; the proven pattern from the ship-rpg project is that generator scripts live on disk and the 16k-context Llama never writes them).
- Every organelle ships with a Source and a kazanım link; a test enforces it. Write learner text in our own words, never copy Wikipedia (see ADR 0004).

## Commands
- `npm run dev`, `npm run check` (typecheck + lint + tests; must pass before "done"), `npm run build`, `npm run e2e` (Playwright; run `npx playwright install chromium` once).

## Definition of done
1. `npm run check` passes.
2. Visible changes verified in the browser, no console errors.
3. Docs, `GLOSSARY.md`, ADRs and `docs/ROADMAP.md` updated in the same change.
4. QA agents run in parallel (static / runtime / requirements, see `.claude/agents/qa.md`).

## Rules
- Milestones end with user approval before the next begins.
- Do not commit unless asked.
- Keep files under ~300 lines; data separate from behaviour; modules expose only `index.ts`.
