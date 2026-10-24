# Module performance

Generated 2026-10-24T02:25:36.069Z by `npm run perf` on **ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Ti (0x00001B06) Direct3D11 vs_5_0 ps_5_0, D3D11)** at 1600x900, level ileri, 8 s of playback at 1x per track.

How to run: close other programs (browsers, games, Blender), plug a laptop in, then `npm run build && npm run perf`
(it starts `vite preview` itself when nothing listens on :4173). Options: `--quality=medium,low`, `--secs=8`,
`--modules=energy,muscle`, `--level=temel`, `--out=docs`. Frame cost is render + `gl.finish()` per drawn frame, so GPU
time is included; the interval is the time between two finished frames. `prewarm` is the shader compile that runs
behind the loading screen (`ModuleStage.prewarm`); `cold first frames` is the slowest of the first 20 frames of playback without it (`?noprewarm`), once per module.

| module | track | quality | median ms | p95 ms | p99 ms | max ms | fps | prewarm ms | cold first frames ms |
|---|---|---|---|---|---|---|---|---|---|
| chem-lab | sirke-kabartma | medium | 1 | 1.7 | 2.8 | 505.2 | 59.9 | 184.9 |  |
| chem-lab | su-elektrolizi | medium | 1.1 | 1.7 | 2.3 | 11.2 | 59.9 | 173 |  |
| chem-lab | sirke-kabartma | low | 1 | 1.3 | 1.8 | 449.7 | 59.9 | 1130.7 |  |
| chem-lab | su-elektrolizi | low | 1.2 | 1.7 | 2.3 | 21.2 | 59.9 | 155 |  |
| membrane-transport | difuzyon | medium | 0.8 | 1.2 | 1.5 | 2.6 | 60.2 | 317.1 | 1.8 |
| membrane-transport | kolaylastirilmis-difuzyon | medium | 0.9 | 1.3 | 1.8 | 2.4 | 59.9 | 278.2 |  |
| membrane-transport | ozmoz | medium | 0.9 | 1.3 | 1.7 | 2.5 | 59.9 | 277.2 |  |
| membrane-transport | aktif-tasima | medium | 0.9 | 1.7 | 2.7 | 3.4 | 60.2 | 122.3 |  |
| membrane-transport | endositoz-ekzositoz | medium | 0.8 | 1.1 | 1.8 | 2.4 | 59.9 | 110 |  |
| membrane-transport | difuzyon | low | 0.3 | 0.4 | 0.5 | 0.8 | 59.9 | 219.2 |  |
| membrane-transport | kolaylastirilmis-difuzyon | low | 0.3 | 0.5 | 0.6 | 0.7 | 59.9 | 233.8 |  |
| membrane-transport | ozmoz | low | 0.3 | 0.5 | 0.7 | 0.9 | 59.9 | 187.6 |  |
| membrane-transport | aktif-tasima | low | 0.3 | 0.5 | 0.5 | 0.6 | 59.9 | 64.8 |  |
| membrane-transport | endositoz-ekzositoz | low | 0.3 | 0.4 | 0.6 | 0.7 | 59.9 | 76.4 |  |
| mitosis-meiosis | mitoz | medium | 1.1 | 1.4 | 2.3 | 2.5 | 60.2 | 1303.2 | 4.6 |
| mitosis-meiosis | mayoz-1 | medium | 1.1 | 1.5 | 2.3 | 2.5 | 59.9 | 148.3 |  |
| mitosis-meiosis | mayoz-2 | medium | 1.1 | 1.4 | 1.9 | 2.6 | 59.9 | 145.4 |  |
| mitosis-meiosis | mayoz-1-ayrilmama | medium | 1.1 | 1.5 | 1.7 | 3 | 59.9 | 146.5 |  |
| mitosis-meiosis | mitoz | low | 1 | 1.2 | 1.4 | 2.5 | 59.5 | 1064.5 |  |
| mitosis-meiosis | mayoz-1 | low | 0.9 | 1.2 | 1.6 | 2.2 | 59.9 | 126.5 |  |
| mitosis-meiosis | mayoz-2 | low | 0.9 | 1.2 | 1.9 | 2.3 | 59.9 | 132.8 |  |
| mitosis-meiosis | mayoz-1-ayrilmama | low | 0.9 | 1.2 | 1.4 | 2.3 | 59.9 | 132.1 |  |
| dna-protein | dna-yapisi | medium | 0.9 | 1.1 | 1.5 | 3.1 | 59.9 | 85.8 | 1.5 |
| dna-protein | replikasyon | medium | 0.8 | 1 | 1.2 | 2.9 | 59.5 | 265.4 |  |
| dna-protein | transkripsiyon | medium | 1 | 1.3 | 1.7 | 2.3 | 59.9 | 365 |  |
| dna-protein | translasyon | medium | 0.8 | 1.1 | 1.5 | 2.5 | 59.9 | 72.4 |  |
| dna-protein | mutasyon | medium | 0.8 | 1 | 1.6 | 2.4 | 59.9 | 54.4 |  |
| dna-protein | dna-yapisi | low | 0.7 | 0.9 | 1.3 | 3.5 | 59.9 | 77.3 |  |
| dna-protein | replikasyon | low | 0.6 | 0.8 | 1.2 | 2 | 59.9 | 218.5 |  |
| dna-protein | transkripsiyon | low | 0.8 | 1 | 1.3 | 2.1 | 60.2 | 256.4 |  |
| dna-protein | translasyon | low | 0.7 | 0.9 | 1.3 | 2.1 | 60.2 | 61.5 |  |
| dna-protein | mutasyon | low | 0.6 | 0.8 | 1.5 | 2.2 | 60.2 | 47 |  |
| genetics | monohibrit | medium | 1 | 1.4 | 1.7 | 2.3 | 59.9 | 342.2 | 4.3 |
| genetics | dihibrit | medium | 1.4 | 1.8 | 2.4 | 2.5 | 59.9 | 131.5 |  |
| genetics | kan-gruplari | medium | 1.2 | 1.5 | 1.9 | 2.5 | 59.9 | 198.8 |  |
| genetics | eseye-bagli | medium | 1.2 | 1.6 | 1.9 | 2.7 | 59.9 | 135.3 |  |
| genetics | monohibrit | low | 1 | 1.2 | 1.4 | 2.4 | 59.9 | 238.5 |  |
| genetics | dihibrit | low | 1.3 | 1.6 | 2 | 2.6 | 59.9 | 103.4 |  |
| genetics | kan-gruplari | low | 1 | 1.2 | 1.4 | 2.4 | 59.9 | 126.9 |  |
| genetics | eseye-bagli | low | 1 | 1.3 | 1.5 | 2.4 | 59.9 | 118.1 |  |
| energy | fotosentez | medium | 1.3 | 1.8 | 2.2 | 2.7 | 59.9 | 893.6 | 2.7 |
| energy | hucresel-solunum | medium | 1.2 | 1.5 | 1.9 | 2.5 | 59.9 | 374.1 |  |
| energy | fermantasyon | medium | 1 | 1.3 | 1.6 | 2.5 | 59.9 | 466.7 |  |
| energy | kemosentez | medium | 1.2 | 1.6 | 1.8 | 2.7 | 59.9 | 128.7 |  |
| energy | fotosentez | low | 1 | 1.3 | 1.6 | 2.4 | 59.9 | 704 |  |
| energy | hucresel-solunum | low | 0.9 | 1.2 | 1.5 | 2.3 | 59.9 | 318 |  |
| energy | fermantasyon | low | 0.9 | 1.1 | 1.4 | 2.3 | 59.9 | 363.8 |  |
| energy | kemosentez | low | 1 | 1.3 | 1.5 | 2.4 | 59.9 | 114.5 |  |
| muscle | kasilma | medium | 0.9 | 1.5 | 2.5 | 398.2 | 60.2 | 389.3 | 2.8 |
| muscle | eklem-hareketi | medium | 1 | 1.4 | 1.8 | 2.9 | 60.2 | 125.5 |  |
| muscle | kasilma | low | 0.8 | 1.1 | 2.2 | 323.2 | 60.2 | 556.1 |  |
| muscle | eklem-hareketi | low | 0.9 | 1.1 | 1.6 | 4.1 | 59.9 | 80.7 |  |
| nervous | refleks-yayi | medium | 1.1 | 1.5 | 1.6 | 2.7 | 60.2 | 390.7 | 2.1 |
| nervous | aksiyon-potansiyeli | medium | 1.4 | 1.8 | 2.3 | 3 | 59.9 | 99.4 |  |
| nervous | sinaps | medium | 1.4 | 1.8 | 4.2 | 5.9 | 59.9 | 599.4 |  |
| nervous | refleks-yayi | low | 0.6 | 0.8 | 1.1 | 1.2 | 60.2 | 125.4 |  |
| nervous | aksiyon-potansiyeli | low | 0.7 | 0.9 | 1.2 | 1.2 | 59.9 | 89.7 |  |
| nervous | sinaps | low | 1 | 1.3 | 1.8 | 4.1 | 59.9 | 447.9 |  |

Over the 16.7 ms (60 fps) p95 budget: none.

