# membrane-transport (Zardan madde geçişi)

Animated lesson, five tracks, two levels (Temel / İleri). Kazanım: BİY.9.2.2 (classify transport), BİY.9.2.3 (experiment on passive passage: the
"Derişim farkı" and "Sıcaklık" options are the virtual experiment). Content: `src/data/modules/membrane-transport*.ts` (split per track).

## Tracks (pure functions of time)
| track | duration | scene |
|---|---|---|
| `difuzyon` | 44 s | lipid bilayer, 48 small molecules, 6 large ones that bounce off |
| `kolaylastirilmis-difuzyon` | 48 s | 2 channel proteins (ions), 2 carriers (glucose, flip between `carrier-protein` and `carrier-protein-b`), saturation |
| `ozmoz` | 54 s | three cells (hipo/izo/hiper) taking turns, animal or plant (wall, protoplast, vacuole, plasmolysis) |
| `aktif-tasima` | 46 s | two Na+/K+ pumps (`pump-protein`), 3 Na+ out, 2 K+ in, ATP -> ADP + P per cycle |
| `endositoz-ekzositoz` | 56 s | phagocytosis, pinocytosis, exocytosis on one half-cut bilayer |

## How it works
- `walker.ts`: a molecule's position is `home(t) + wander(t)`, where `wander` is a sum of incommensurate sines (Brownian-looking, no state) and a
  passage through a gate blends old home -> gate -> new home. `crossings.ts` runs a seeded discrete-event simulation once at build time (every
  molecule tries to cross at random moments with equal rates both ways, so net flow follows the gradient; a busy carrier or channel refuses, which gives
  saturation). The chart counts the same legs that are drawn, so chart and picture always agree. `bestBy` keeps the seed whose curve is closest to the
  expected trend.
- `bilayer.ts` + `cup.ts`: instanced lipids (two leaflets). Endo/exocytosis wraps the lipids around a profile (flat -> cup -> omega -> closed sphere) with an
  area-preserving radial map, so density stays uniform, the vesicle pinches off and the hole closes by itself; exocytosis is the same map run backwards.
- Module textures are on (`assets.moduleTextures = true` in `scene.ts`; checked against `?moduletex`: crisper protein detail). Labels are clamped to the free band under the toolbar (`scene.ts`). Osmosis has six `channel-protein` aquaporins per membrane (water crosses through them for two thirds of the passages) and, at İleri with "Büyük fark", the animal cell bursts (lysis). Ions pass in front of the channel and dip toward the pore.
- `proteins.ts` loads the GLBs (`channel-protein`, `carrier-protein`, `carrier-protein-b`, `pump-protein`; pivots on the membrane centre, axis Y).
  The pump GLB is rigid, so its cycle is shown by a small tilt/squash and by the ions and ATP moving; the real conformational change is not modelled.
- Tracks live in `tracks/`; `scene.ts` picks the rig by `ctx.trackId`; `setOptions` rebuilds the simulation without rebuilding meshes.

## Tests
`tests/modules/membraneTransport.test.ts` (determinism, ranges, chart table, physics), `tests/modulesDataMembrane.test.ts`, `tests/e2e/membrane.spec.ts`.
The chart table in `membrane-transport.charts.ts` was generated from the scene (default options); regenerate it when the simulation changes.
Preview: `#/modul/membrane-transport?demo` (not released until the lead adds it to `releases.ts`).
