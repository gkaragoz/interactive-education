# dna-protein module

Five tracks (`tracks/`), each a pure function of `t` (`seek`), built on a small kit (`kit/`).

- `kit/`: `Nucs` (nucleotide asset instances, backbone links, H-bond dots), `PartSet` (per-part tint/hide of an asset), `PrimSet` (instanced primitives), `duplex` (helix maths), `cam` (camera path), `fly`, `math`, `palette`, `envelope` (nuclear envelope with one pore).
- `sequence.ts`, `tracks/translasyonPlan.ts`: gene, mutation and translation plans derived with the data's `transcribeTemplate` / `translateMrna`, so every example gene is right.
- `dna-yapisi`: nucleotide, four bases, strand, pairing, twist to helix, antiparallel arrows (İleri), zoom out to chromatin and chromosome.
- `replikasyon`: timing in `repliTiming.ts`; helicase, leading strand, Okazaki fragments, old (indigo) and new (green) strands; chart from the attached count.
- `transkripsiyon`: polymerase position `polPos`, bubble, mRNA with U, mRNA through the pore (`mrnaPath.ts`).
- `translasyon`: ribosome fixed, mRNA slides; `translTiming.ts`, `translChain.ts` (beads), A/P/E sites at İleri.
- `mutasyon` (İleri): board of DNA, mRNA, protein; UV, failed repair, permanent change, effect.

Tests: `tests/modules/dnaProteinScene.test.ts`, `tests/e2e/dna.spec.ts`. Preview: `#/modul/dna-protein?demo`.
