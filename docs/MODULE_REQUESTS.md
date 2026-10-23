
## mitosis-meiosis (animation work)
- Content: the scene supports independent assortment through an optional module option `assortment` (choice id = bit mask, bit p set flips which homolog of pair p goes to the left pole at metaphase I / anaphase I; default `2`). The data has no such option yet. Suggested: `{ id: 'assortment', labelTr: 'Metafaz I yönelimi', choices: [{id:'2',labelTr:'Yönelim A'},{id:'1',labelTr:'Yönelim B'},{id:'0',labelTr:'Yönelim C'},{id:'3',labelTr:'Yönelim D'}], defaultChoice: '2' }` (ileri). Meiosis II and the daughter cells follow it automatically.
- Shell: none required. Note `ModuleHost` only hands default option values to `createScene`; later changes arrive through `setOptions` (supported).
- Data note: `mayoz-1-ayrilmama` chart holds `chromosome-count` 3 during the whole `mayoz-2-ozet` phase (as in the data), although the sisters separate there; the scene follows the data.

## membrane-transport (animation work)
- Shell (charts): `createChartStrip(info.charts, ...)` draws every series of the module on every track. membrane-transport declares 6 series (`molekul-ic`, `molekul-dis`, `derisim-farki`, `net-gecis`, `hucre-hacmi`, `harcanan-atp`) but each track uses 3 to 5 (e.g. `harcanan-atp` only in `aktif-tasima`, `hucre-hacmi` only in `ozmoz`). Requested: show only series that appear in at least one `PhaseInfo.chartPoints` of the active track with a value different from the series minimum (or add an optional `TrackInfo.chartIds`). Until then unused strips are flat.
- Shell (options): options are module-wide, so the three dropdowns show on all tracks although some do nothing there (`hucre-hacmi`/`hucre-turu` only in `ozmoz`, `derisim-farki` not in `aktif-tasima` and `endositoz-ekzositoz`). Requested: optional `ModuleOption.trackIds` to hide an option on other tracks. The option labels name where they apply meanwhile.
- Shell (labels): labels are plain HTML over the stage; at the default panel layout the left panels cover x < ~650 px, so the scene keeps its action in the central band.
- Asset: `bilayer-patch` and `bilayer-tile` are not used: the membrane is built from instanced lipids because it deforms (endocytosis/exocytosis map) and has holes for proteins. Asset agent: no new request. Possible later request: a `lipid` GLB (head + two tails, origin at the centre, +Y at the head) to replace the procedural lipid geometry.

## genetics (animation work)
- Content (options): `genetics.ts` options do not set `trackIds`, so all four cross dropdowns show on every track (the shell now supports `ModuleOption.trackIds`). Requested: `cross-mono` -> `['monohibrit']`, `cross-di` -> `['dihibrit']`, `cross-blood` -> `['kan-gruplari']`, `cross-sex` -> `['eseye-bagli']`. The scene reads only the option of its own track.
- Content (chart series): the module declares 14 series; each track uses 3 to 5 (`dolu-kare` + the phenotype classes of its kind). `chartAt` returns exactly the series of the active track; requested (shell or data, same as the membrane-transport request): show only series present in the active track's `chartPoints` (or a `TrackInfo.chartIds`).
- Content (label): series `renk-koru` is labelled "Renk körü erkek", but a colour blind daughter (XcXc, e.g. `XCXc x XcY`) is counted in it; suggested label "Renk körü birey".
- Content (note): the `monohibrit` option `cross-mono` is the F1 x F1 stage of the track; the first stage (AA x aa -> F1) is always shown as in the text. Any other choice shows a gentle note on the stage (a label) and the new pair appears in place of the F1 plants.
- Shell (camera / safe area): the glass panels cover the left ~40% and the lower right of the stage, so tracks whose action is wide (Punnett square plus tally columns) are partly hidden. Requested: a safe-area aware camera (`camera.setViewOffset` from the panel insets) or a collapsible panel mode. The scene frames its camera for the full canvas, so it will look right as soon as the shell offsets the view.
- Asset (later): `punnett-tile` and `allele-token` are not used; tiles, header plates, tally cubes, pedigree symbols, the pea plant, pods, seeds and persons are procedural clay primitives in `src/modules/genetics/` (instanced, tinted through `instanceColor`). If batch 4 delivers `punnett-tile` (pivot at the centre, 1 x 1 face) it can replace the `tile` pool in `kit.ts` without other changes. Chromosomes use `chromosome` (replicated, meiocytes) and `chromosome-single` (gametes, zygote), tinted by allele.

## dna-protein (animation work)
- Shell (safe area): the left panels cover ~40% of the stage and the charts the lower right; scenes are framed for the full canvas. A `setViewOffset` from the panel insets would centre them (same request as genetics).
- Content (simplifications): `dna-protein.ts` says the ribosome A, P, E sites are not shown. The scene shows them at İleri (coloured `sites` part and A/P/E labels); Temel hides them. Please reword that simplification and the translasyon note.
- Content (chart): `sentezlenen-dna` is 40 at t=26 in the data; the scene reaches ~45-50 there (leading and lagging strands both active). The scene's chartAt is authoritative; consider 50.
- Asset: none missing. The tRNA anticodon and amino-acid parts are hidden and replaced by coloured spheres and beads so codons pair exactly.
- Content (exports): please re-export `translateMrna`, `transcribeTemplate`, `codonTable`, `aminoAcids`, `geneExamples`, `mutationExamples` from `src/data/index.ts`; the scene imports the files directly with an eslint-disable until then.

## muscle (animation work)
- Shell: none required. The scene keeps the camera at a constant distance (zoom is done by scaling nested groups); `ModuleStage.setScene` frames from `seek(0)`, where only the arm is large, so near/far are fine.
- Asset: the Batch 4 GLBs are not used (see `src/modules/muscle/README.md`: sliding needs per-head poses and a variable filament length). No new request.

## nervous (animation work)
- Shell (charts): each track uses 1 of the 4 series (`sinyal-ilerlemesi` in `refleks-yayi`, `membran-potansiyeli` in `aksiyon-potansiyeli`, `nt-miktari` + `postsinaptik-potansiyel` in `sinaps`); same request as membrane-transport (show only the series of the active track).
- Shell (AO): at high quality the GTAO pass draws sprites and transparent planes into its depth/normal buffers (dark boxes). The module works around it with `isPoints = true` on overlays; a supported flag (e.g. `userData.noAO`) in `Pipeline` would be cleaner.
- Shell (panels): the toolbar and the three panels hide about 3.8 world units above and below the centre at the camera distances used; scenes keep the action in the central band.
- Content: none. Asset: `neuron`, `synapse-terminal`, `neurotransmitter`, `reflex-arc-parts` are not used (scene needs per-part motion and cut-aways); no new request.

## energy (animation work)
- Shell: `ModuleAssets` only reads `public/models/modules/`; the energy module loads the explorer organelles (`chloroplast`, `mitochondrion`, `nucleus`, `envelope-bacterium`, `nucleoid`) with its own small GLTF loader and the shared vertex-colour materials. A `ctx.assets.organelle(id)` (with the painted KTX2 tiers of the explorer) would make them look like the explorer; the module would switch with a one-line change in `src/modules/energy/organelles.ts`.
- Shell: the cuts between stations fade through the stage-card colour `#f6ebd2` (hard-coded in `rig.ts`); a theme token would keep it in sync.
- Content: the water in respiration is gross in the electron transport (12 H2O formed there) and 6 H2O are used in the Krebs part, net 6; the scene shows both. A line in `ModuleInfo.simplifications` could say so. The ATP count in the Krebs cycle is shown as 2 ATP (GTP counted as ATP).
- Content: `fotosentez` Temel has no `atp-nadph` concept; the series is reported anyway (linear 0 -> 20 as in the data) so the chart stays consistent between levels.
- Assets: all batch-3 assets are used except `pyruvate` (the carbon beads track the glucose atoms instead). The photosystems read well only from their lumen face, so the thylakoid station is shown mirrored (lumen up).
- Shell (organelle textures, still open): `ModuleAssets` has no API for the explorer organelles' painted KTX2 tiers, so `chloroplast`, `mitochondrion`, `nucleus`, `envelope-bacterium` show vertex colours; the module leans on the painted module assets (`mitochondrion-crista-detail`, `thylakoid-stack`) for the inside views.
- Shell: first show of a station compiles its shaders (up to ~0.5 s hitch); a `ModuleStage.warm()` (renderer.compile of the whole scene tree, hidden groups included) after `setScene` would remove it.
- Asset (`allele-token`, from genetics): the `face` mesh's UVs cover u 0.01..0.99 but only v 0.41..0.99 (measured from the GLB, in image space), not the whole 0..1 square the meta.json states, and a canvas letter texture shows only an off-centre part of the disc. genetics hides the face mesh and draws the letters as a tag plane on the token body. Requested: UVs that map the face disc onto the full 0..1 square (centre 0.5, 0.5; radius 0.5) and a flat, fully visible disc, then genetics will use the face again.
