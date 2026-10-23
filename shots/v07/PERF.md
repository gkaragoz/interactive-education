# Module performance

Generated 2026-10-23T22:31:30.418Z by `npm run perf` on **ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Ti (0x00001B06) Direct3D11 vs_5_0 ps_5_0, D3D11)** at 1600x900, level ileri, 3 s of playback at 1x per track.

How to run: close other programs (browsers, games, Blender), plug a laptop in, then `npm run build && npm run perf`
(it starts `vite preview` itself when nothing listens on :4173). Options: `--quality=medium,low`, `--secs=8`,
`--modules=energy,muscle`, `--level=temel`, `--out=docs`. Frame cost is render + `gl.finish()` per drawn frame, so GPU
time is included; the interval is the time between two finished frames. `prewarm` is the shader compile that runs
behind the loading screen (`ModuleStage.prewarm`); `cold first frames` is the slowest of the first 20 frames of playback without it (`?noprewarm`), once per module.

| module | track | quality | median ms | p95 ms | p99 ms | max ms | fps | prewarm ms | cold first frames ms |
|---|---|---|---|---|---|---|---|---|---|
| energy | fotosentez | medium | 1.3 | 1.8 | 2.6 | 2.6 | 59.9 | 1698 | 2.4 |
| energy | hucresel-solunum | medium | 1.2 | 1.5 | 1.8 | 2.5 | 60.2 | 798.6 |  |
| energy | fermantasyon | medium | 1.1 | 1.5 | 2 | 2.6 | 59.5 | 467.5 |  |
| energy | kemosentez | medium | 1.2 | 1.5 | 1.8 | 1.9 | 59.9 | 127 |  |

Over the 16.7 ms (60 fps) p95 budget: none.

