# Roadmap

Each milestone ends with the user's approval before the next starts.

- [x] **M0 — Research and docs.** `CLAUDE.md`, `GLOSSARY.md`, ADRs, `docs/CURRICULUM.md` (grade/kazanım mapping), `docs/SOURCES.md` (all citations). Approval gate: the user confirms curriculum scope and level naming.
- [x] **M1 — Quality gate.** Plant cell vertical slice (nucleus, mitochondrion, chloroplast, ER, vacuole) generated in headless Blender, compared with the reference look at the same camera. Pass or fail decides whether the pipeline stays or fallback asset research starts.
- [x] **M2 — Skeleton.** Vite + TS scaffold, scene, camera, cutaway, organelle selection, UI shell, `npm run check`, QA agent.
- [x] **M3 — Three cell types.** Animal, plant, bacterium; content, Bibliography page, comparison, micrograph panel.
- [x] **M4 — Polish.** Performance presets and adaptive governor, tests (344 unit, 24 e2e), QA passes, GitHub Pages deploy: <https://gkaragoz.github.io/interactive-education/>.

- [x] **v0.2-v0.7 — Timeline modules and shell.** Stage-first shell with home page, module framework (timeline player, phase cards, charts, Kendini dene, Tahmin et), seven modules (mitoz ve mayoz, zardan madde geçişi, DNA ve protein, enerji, kas, sinir sistemi, kalıtım), compact layout and safe-area camera, Sorular açık/kapalı, painted organelles in modules, `npm run perf` and shader pre-warm, e2e in two projects.
- [x] **v0.9 — Kimya laboratuvarı (sim module).** `SimScene` host (fixed-step clock, time-lapse, pointer drag and drop, keyboard path, Defter replay), the pure `src/chemlab` engine, ten guided experiments with "Nedenini göster", free bench, safety sheet and start card (docs/SIMS.md, ADR 0005).
- [ ] **Fizik sandboxes.** Research is done (`docs/research/fizik.md`); the sims reuse `SimScene`, `SimStage` and the lab shell pieces. Starts after the user picks the first topics.

Deferred: mobile/tablet, quiz, more cell types (epithelial, neuron, muscle, white blood cell), student notes, 3D export, English UI, chemistry and physics modules.
