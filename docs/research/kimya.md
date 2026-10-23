# Kimya (chemistry) curriculum research for Bilim Atölyesi

Research only, no code. Date of research: 2026-10-24. Everything below that is a programme fact was read from the two official PDFs (downloaded to a scratch folder and read with `pdftotext -enc UTF-8`). Programme text was treated as data. Paraphrases are ours (ADR 0004); we do not copy programme sentences. Items marked **not verified** were not checked.

## 1. Sources actually read

| Id | Document | URL (HTTP 200 verified) |
|---|---|---|
| MEB-FEN | Fen Bilimleri Dersi Öğretim Programı (3-8), TYMM, cover year 2026 | <https://tymm.meb.gov.tr/assets/pdf/fen-bilimleri-dersi_20260902_111309_119.pdf> |
| MEB-KIM | Kimya Dersi Öğretim Programı (9-12), TYMM, cover 2O26 | <https://tymm.meb.gov.tr/assets/pdf/kimya-dersi_20260819_143012_862.pdf> (listed on <https://tymm.meb.gov.tr/ogretim-programlari/ders/kimya-dersi>) |

Notes
- The 2026 programmes call the unit "öğrenme çıktısı" (learning outcome); the codes (FB.x.y.z, KİM.x.y.z) play the role our project calls *kazanım*. We keep the word kazanım in the UI and data (`Kazanim` type) and mention the code.
- Fen codes: `FB.<grade>.<unit>.<n>`. Kimya codes: `KİM.<grade>.<tema>.<n>`; each grade has 3 temas: 1 Etkileşim, 2 Çeşitlilik, 3 Sürdürülebilirlik (MEB-KIM, section 2). The Turkish dotted İ is part of the code.
- Not verified: the 2024 Fen programme, the mufredat.meb.gov.tr copies, ttkb.meb.gov.tr (the portal home answers HTTP 200 but we did not search it), and textbooks (MEB ders kitapları), which decide detail the programme leaves open.
- "Programme limits": the 2026 programmes have no separate "sınırlılık" column. Limits are written inside the *Öğrenme-Öğretme Uygulamaları* prose ("girilmez", "verilmez", "değinilir", "...girilmeden", "yalnızca tanımı yapılır"). We extracted them by keyword scan (`girilmez|verilmez|değinilmez|girilmeden|işlenmez|ayrıntı`) and by reading the practices of every outcome we propose to build. Practices of unrelated outcomes were **not** read exhaustively.
- The Kimya programme says (section 1.1) it prefers micro-scale and, where possible, non-toxic experiments, and it asks learners to explain with the **macro, sub-micro (alt mikro) and symbolic** representations. This is exactly the three-layer structure we use in the lab dossier.

## 2. Kazanım table (chemistry-relevant)

Legend for limits: "L:" = limit quoted in our words from the practices text.

### 2.1 Fen Bilimleri, grades 5-8 (Temel level)

| Code | Gr | Unit / theme | Short paraphrase | Programme limits |
|---|---|---|---|---|
| FB.5.5.1 | 5 | Maddenin Doğası: tanecikli yapı | Classify matter as particulate, with gaps, moving; group solid/liquid/gas | L: solids and (by assumption) liquids are incompressible; gases compress (syringe). Solid particles vibrate; liquid and gas particles vibrate, rotate, translate |
| FB.5.5.2 | 5 | Isı ve sıcaklık | Compare heat and temperature | L: heat in J or cal, temperature in °C; heat not measured directly (calorimeter) |
| FB.5.5.3 | 5 | Isı alışverişi | Hot and cold liquids exchange heat | L: same kind of liquid used in experiments; equal temperature means no exchange |
| FB.5.5.4 | 5 | Hâl değişimi | Predict state changes from heat | L: focus on seven terms (erime, donma, buharlaşma, kaynama, yoğuşma, süblimleşme, kırağılaşma); temperature constant during change; evaporation at any temperature |
| FB.5.5.5-6 | 5 | Isı iletimi, yalıtım | Conductors/insulators, insulation model | Not chemistry-central |
| FB.6.5.1 | 6 | Maddenin ayırt edici özellikleri | Expansion and contraction with heat | none found |
| FB.6.5.2 | 6 | idem | Melting, freezing, boiling point experiment | none found |
| FB.6.5.3-4 | 6 | idem | Density calculations, hypotheses | none found |
| FB.6.5.5 | 6 | idem | Water: solid vs liquid density, importance for life | none found |
| FB.6.5.6 | 6 | idem | Density model | none found |
| FB.7.5.1 | 7 | Maddenin Doğasına Yolculuk | Atom parts: proton, neutron, electron; relations | L: electron positions cannot be fixed; shells and probability; atom radius set by outer limit; nucleus carries almost all mass |
| FB.7.5.2 | 7 | idem | History of the atom is revisable | L: Dalton, Thomson, Rutherford "without detail"; Bohr shells; modern theory electron cloud |
| FB.7.5.3 | 7 | idem | Molecule models from same/different atoms | L: bead/clay modelling; same atom = same colour and size |
| FB.7.5.4 | 7 | idem | Pure substances: element vs compound | Examples named: oxygen, iron, copper; water, CO2 |
| FB.7.5.5 | 7 | idem | Names and symbols of first 18 elements | L: plus Au, Ag, Cu, Zn, Pb, Hg, Pt, Fe, I; uses not covered; symbol writing rule (capital then lowercase) |
| FB.7.5.6 | 7 | idem | Groups and periods; electron arrangement of first 18; duplet/octet; ion formation | L: duplet and octet "without orbital diagrams"; ions mentioned without the words katyon/anyon; no classification of elements (that is grade 8); no special group names; 7 periods, 8 A and 10 B groups; helium exception |
| FB.7.5.7 | 7 | idem | Compound names and formulas | L: only these example compounds: su, sodyum klorür, karbondioksit, karbonmonoksit, amonyak, kükürt dioksit, hidrojen klorür, sülfürik asit, sodyum hidroksit, glikoz; uses not covered |
| FB.7.5.8 | 7 | idem | Homogeneous vs heterogeneous mixtures, solution | Mentions NaCl dissociating to ions in water as an example |
| FB.7.5.9 | 7 | idem | Factors for dissolution rate (surface area, stirring, temperature) | Independent variables: contact surface, stirring, water temperature |
| FB.7.5.10 | 7 | idem | Separate mixtures (evaporation, density difference, distillation) | Sieving, filtering, magnet assumed known |
| FB.8.5.1 | 8 | Periyodik Tablo ve Maddenin Etkileşimi | Metals, nonmetals, metalloids, noble gases | L: noble gases are nonmetals treated apart; Na gives electron, Cl takes electron as example; metals form alloys (homogeneous mixtures), not compounds with each other |
| FB.8.5.2 | 8 | idem | Predict physical vs chemical change | L: chemical change = new bonds form and/or break; physical change = none; evidence list: gas, colour, heat/light, smell/taste, precipitate |
| FB.8.5.3 | 8 | idem | Inferences on chemical reactions | L: water formation shown with beads, **"denklem denkleştirmeye girilmeden"** (no balancing); mass, atom count and kind conserved; vinegar-carbonate mass-conservation experiment named |
| FB.8.5.4 | 8 | idem | Everyday effects of reactions | Examples: digestion, photosynthesis, cooking, rusting, rotting, burning, fermentation |
| FB.8.5.5 | 8 | idem | Compare acids and bases | L: named acids sülfürik, hidroklorik, nitrik, karbonik, asetik; bases NaOH, KOH, Ca(OH)2, amonyak; acid+base gives salt+water "without equations"; never taste or smell, safety signs |
| FB.8.5.6 | 8 | idem | Identify acid/base with indicators | L: blue/red litmus, phenolphthalein, red cabbage juice, methyl orange only; learners predict colour for new acids/bases |
| FB.8.5.7 | 8 | idem | pH scale pattern | pH < 7 acid, = 7 neutral, > 7 base; 0-14 ruler |
| FB.8.5.8 | 8 | idem | Effects of acids and bases on materials | L: acids react with metals and marble, bases with porcelain/ceramic/glass; only non-hazardous set-ups; egg, chicken bone, marble, glass, porcelain, copper named |

All Fen rows: MEB-FEN, unit pages 97-101 (5.5), 131-134 (6.5), 168-175 (7.5), 207-213 (8.5).

### 2.2 Kimya, grades 9-12 (İleri level)

Chemistry tema/section names are from MEB-KIM section 2 headings. Only outcomes useful for 3D, animation or the lab are listed individually; sustainability outcomes are summarised at the end.

| Code | Gr | Tema | Short paraphrase | Programme limits found |
|---|---|---|---|---|
| KİM.9.1.3 | 9 | 1 Etkileşim, Atomdan Periyodik Tabloya | Atom theories as revisable knowledge; charge, mass, discovery of e/p/n | Data given as ready set |
| KİM.9.1.4 | 9 | idem | Relative orbital energies (diagrams) | |
| KİM.9.1.5 | 9 | idem | Electron placement in orbitals (pattern) | |
| KİM.9.1.6 | 9 | idem | Electron configuration and periodic-table position | |
| KİM.9.1.7 | 9 | idem | Ion formation: electron configuration of ions | |
| KİM.9.1.8 | 9 | idem | Periodic trends (analyse) | |
| KİM.9.2.1 | 9 | 2 Çeşitlilik | Metallic bond: positive ions and electron sea | |
| KİM.9.2.2 | 9 | idem | Ionic bond from observation of metal + nonmetal reaction | Video of the reaction is the evidence; polyatomic ions given as a table (NH4+, CO3 2-, NO3-, PO4 3-, HCO3-, CH3COO-, SO4 2-, OH-) |
| KİM.9.2.3 | 9 | idem | Covalent bond: nuclei and shared electrons (animation of two approaching atoms) | |
| KİM.9.2.4-6 | 9 | idem | Lewis dot structures; polar/apolar; naming | |
| KİM.9.2.7-8 | 9 | idem | Intermolecular forces; effect on solids | |
| KİM.9.2.9-13 | 9 | idem | Vapour pressure, boiling point, viscosity, adhesion/cohesion, surface tension | |
| KİM.10.1.1 | 10 | 1 Etkileşim, Kimyasal Tepkimeler | Evidence of chemical change: energy, gas, colour, new solid; explained sub-micro | |
| KİM.10.1.2 | 10 | idem | Build a model: reactions as rearrangement of particles | |
| KİM.10.1.3 | 10 | idem | Reaction types: precipitation, redox, acid-base; indicators; symbolic and sub-micro | L: redox examples are metals with dilute HCl or salt solutions, and **combustion of magnesium and iron**; acid-base examples use **strong acid and strong base** solutions; precipitation = double displacement, some redox = single displacement |
| KİM.10.1.4 | 10 | idem | Mole, operational definition | L: isotopes, average atomic mass, amu "only defined" |
| KİM.10.1.5-7 | 10 | idem | Mole-mass-particle relations, balancing, stoichiometry | L: limiting reagent and percent yield "at basic level" |
| KİM.10.1.8-9 | 10 | Gazlar | Gas properties, kinetic molecular theory, P-V-T-n relations; laws Boyle, Charles, Gay-Lussac, Avogadro | L: **"Gaz yasaları ile ilgili hesaplamalara girilmez"** (no gas-law calculations); explain with particle drawings |
| KİM.10.1.10 | 10 | idem | Build ideal gas equation from patterns | L: **no calculations with the ideal gas equation**; relationships only |
| KİM.10.1.11 | 10 | idem | Diffusion and effusion experiments (Graham) | |
| KİM.10.2.1-3 | 10 | 2 Çeşitlilik, Çözeltiler | Dissolution model; polar/ionic vs nonpolar; classify dissolution (ionic/molecular, physical/chemical) | |
| KİM.10.2.4-6 | 10 | idem | Solubility (100 g water, substance and temperature); gas solubility (temperature, pressure); saturated, unsaturated, supersaturated; electrolyte or not | |
| KİM.10.2.7-8 | 10 | idem | Molar concentration; colligative boiling/freezing | |
| KİM.11.1.1 | 11 | 1 Etkileşim, Enerji ve Hız | Energy change in physical and chemical events, experiment | |
| KİM.11.1.2 | 11 | idem | Fuels, combustion energy | Fuel examples: wood, camping fuel, oil, nuts, sugar |
| KİM.11.1.3-4 | 11 | idem | Enthalpy from bond energies and formation enthalpies | |
| KİM.11.1.5 | 11 | idem | Conditions for reaction: enough energy and proper orientation (collision theory) | |
| KİM.11.1.6-8 | 11 | idem | Rate over time; factors (nature, state, concentration, temperature, surface, **catalyst**); rate law | KİM.11.1.8 uses ready data sets |
| KİM.11.2.1-2 | 11 | 2 Çeşitlilik, Denge ve Asit-Baz | Reversible reactions; equilibrium (forward = reverse rate) | Example prompt: tea + carbonate or lemon colour change |
| KİM.11.2.3-5 | 11 | idem | Equilibrium constant; Le Chatelier (concentration, volume, pressure, temperature, catalyst) | |
| KİM.11.2.6-9 | 11 | idem | Autoionisation, acid-base theories, strength, pH calculations | |
| KİM.11.2.10 | 11 | idem | Neutralisation: criteria conductivity, pH change, indicator colour | strong acid + strong base |
| KİM.11.2.11 | 11 | idem | Titration of strong acid/base | |
| KİM.11.2.13-14 | 11 | idem | Sparingly soluble salts, Ksp-level model, factors | temperature and common ion experiment suggested |
| KİM.12.1.1 | 12 | 1 Etkileşim, Elektrokimya | Redox observation: metals with O2/air, dilute HCl, salt solutions | L: example Zn + Cu(II) nitrate; half equations with charge balance; **acidic or basic aqueous redox is not selected** |
| KİM.12.1.2 | 12 | idem | Activity series of metals (Cu, Zn, Fe, Pb) by micro-scale experiment; virtual allowed | Text says groups may run the experiment "in virtual or real environments" |
| KİM.12.1.3-5 | 12 | idem | Galvanic cell, standard potential, factors | |
| KİM.12.1.6 | 12 | idem | Electrolytic cell; molten salt and water electrolysis visuals | Components: anode, cathode, electrolyte, power source |
| KİM.12.1.7 | 12 | idem | Faraday: amount of substance vs current and time | L: **no maths calculation**, qualitative relation |
| KİM.12.1.8-9 | 12 | idem | Electroplating with copper; corrosion prevention | |
| KİM.12.2.1-3 | 12 | 2 Çeşitlilik, Organik Kimya | Sigma/pi bonds, hybrid orbitals, molecular geometry (VSEPR named) | |
| KİM.12.2.4-8 | 12 | idem | Organic formula types, hydrocarbons, alkane naming, isomers, properties | L: cis-trans isomers not treated for cycloalkanes |
| KİM.12.2.9-11 | 12 | idem | Functional groups: alcohol, ether, aldehyde, ketone, carboxylic acid, ester | |
| KİM.12.2.12 | 12 | idem | Combustion of carbon fuels, exothermic, emissions | |
| KİM.9.1.1-2, 9.3.x, 10.3.x, 11.3.x, 12.3.x | 9-12 | Sürdürülebilirlik | Chemistry in daily life and safety (9.1.2), nanoparticles, micro-scale experiments, atmosphere, green hydrogen, microplastics, dye solar cells, biopolymers, AI | Context topics; low 3D value |

All Kimya rows: MEB-KIM. Page markers (printed): 9.2.2 p.26; 10.1.x pp.41-46; 11.1.x pp.61-63; 11.2.x pp.72-75; 12.1.x pp.87-88 and following; 12.2.x from about p.100 (page numbers approximate).

## 3. Topic ranking for 3D/animation benefit

Scales: 3D benefit 1-5 (how much animation or spatial view beats a diagram); programme weight = how prominent in the programme text (H/M/L); feasibility 1-5 for a three.js procedural-animation module in our style (5 = easiest). Judgements are ours, based on the programme text above.

| Rank | Topic | Grade | Weight | 3D | Feasibility | Notes and assets |
|---|---|---|---|---|---|---|
| 1 | States of matter and kinetic theory, state change, diffusion, gas pressure | 5 (FB.5.5), 10 (KİM.10.1.8-11) | H | 5 | 5 | Instanced spheres in a box, seeded RNG, vibration/rotation/translation motion types are named in FB.5.5.1. Cheap, pure function of time. Pair with temperature slider and syringe/piston |
| 2 | Atom structure, shells, ions, periodic table | 7 (FB.7.5.1-6), 8 (FB.8.5.1), 9 (KİM.9.1) | H | 5 | 4 | Nucleus with p/n spheres, electron shells (Bohr style for Temel; clouds for İleri); table as 3D tiles by period/group. Orbitals (s, p) as isosurfaces are heavier (marching cubes or shader impostors) |
| 3 | Ionic, covalent, metallic bonding | 8-9 (KİM.9.2.1-3) | H | 5 | 4 | Electron transfer Na to Cl then lattice; electron sharing with overlapping clouds; electron sea. Needs lattice instancing, glow/cloud sprites |
| 4 | Chemical reaction as rearrangement, mass conservation, balancing, stoichiometry | 8 (FB.8.5.2-3), 10 (KİM.10.1.1-7) | H | 5 | 4 | Molecule models (ball-and-stick GLB/instanced), collisions, bond break and form, balance scale. Balancing is a symbolic puzzle; limit in grade 8: no balancing |
| 5 | Dissolution, solutions, saturation, solubility | 7 (FB.7.5.8-9), 10 (KİM.10.2) | H | 4 | 4 | Water molecules (dipoles) surrounding ions leaving a lattice; saturated with growing crystal. Needs polar water model, hydration shell |
| 6 | Acids, bases, pH, neutralisation, titration | 8 (FB.8.5.5-8), 11 (KİM.11.2.6-11) | H | 4 | 4 | H3O+ and OH- particle counts vs pH, indicator colour mapping, titration curve. Colour model simple |
| 7 | Reaction rates and collision theory, catalyst | 11 (KİM.11.1.5-7) | M | 5 | 4 | Particle collisions with energy and orientation; activation energy hill with and without catalyst |
| 8 | Redox and electrochemistry (displacement, galvanic, electrolysis) | 12 (KİM.12.1) | M | 5 | 3 | Electron flow, ion migration, electrode growth. Many moving parts; two cell types |
| 9 | Chemical equilibrium (Le Chatelier) | 11 (KİM.11.2.1-5) | M | 4 | 3 | Forward/reverse rates equal, stress-and-shift sliders. Time-dependent stochastic feel conflicts with "pure function of time"; use deterministic precomputed trajectories |
| 10 | Molecular geometry, VSEPR, polarity, hybridisation | 9 (KİM.9.2.4-5), 12 (KİM.12.2.1-3) | M | 5 | 3 | Rotatable molecule with electron-domain lobes. Excellent 3D, content-heavy |
| 11 | Intermolecular forces, vapour pressure, surface tension | 9 (KİM.9.2.7-13) | M | 3 | 3 | Particle-level animation fine, macroscopic surface effects need fluid shader |
| 12 | Gas laws (qualitative) | 10 (KİM.10.1.9-10) | M | 4 | 4 | Cylinder with piston; no calculations per programme limit. Fold into topic 1 |
| 13 | Enthalpy, energy diagrams, fuels | 11 (KİM.11.1.1-4) | M | 3 | 3 | Energy-profile chart plus bond break/form; mostly graph work |
| 14 | Organic basics (hydrocarbons, isomers, functional groups) | 12 (KİM.12.2.4-11) | M | 4 | 2 | Chain/isomer 3D is nice but content volume is high; defer |
| 15 | Mole concept and molar concentration | 10 (KİM.10.1.4-5, 10.2.7) | M | 2 | 3 | Mostly arithmetic; a visual "counting by weighing" demo is possible |
| 16 | Separation of mixtures | 7 (FB.7.5.10) | M | 3 | 4 | Filtering, evaporation, distillation: good fit for the virtual lab rather than a standalone module |

Where the lab dossier (`kimya-lab.md`) fits: it is a cross-cutting capstone that reuses the particle scripts of ranks 3-8.

## 4. Proposed module list and order

Naming follows the existing ids (kebab-case). Release numbers are not proposed (lead's call). Each module keeps Temel (5-8) and İleri (9-12) tracks.

| # | Module id (proposal) | Contents | Kazanım anchors | Why this place |
|---|---|---|---|---|
| C1 | `matter-states` | Particle model, solid/liquid/gas, heat and state change, diffusion, gas pressure, kinetic theory | FB.5.5.1-4; KİM.10.1.8-11 | Cheapest, builds the particle engine reused everywhere |
| C2 | `atom-periodic` | Atom parts, shells, ions, first 18 elements, periodic table groups/periods/trends, metal/nonmetal | FB.7.5.1-6, FB.8.5.1; KİM.9.1.x | Needed vocabulary for bonding |
| C3 | `chemical-bonds` | Ionic, covalent, metallic, molecule models, formulas | FB.7.5.3-4,7; KİM.9.2.1-6 | Uses C2 atoms |
| C4 | `reactions` | Physical vs chemical change, rearrangement, mass conservation, balancing, reaction types, mole intro | FB.8.5.2-4; KİM.10.1.1-7 | Core of programme; sets the reaction animation grammar |
| C5 | `solutions` | Dissolution, polarity, solubility, saturation, rate factors | FB.7.5.8-9; KİM.10.2.x | Needs C3 polarity |
| C6 | `acids-bases` | Properties, indicators, pH, neutralisation, titration | FB.8.5.5-8; KİM.11.2.6-11 | Highest classroom experiment overlap |
| C7 | `chem-lab` (Kimya Laboratuvarı) | Virtual bench with 10 experiments (see `kimya-lab.md`) | many | Capstone; consumes C3-C6 scripts. Phase-1 lab could start after C4 |
| C8 | `rates-equilibrium` | Collision theory, catalyst, rate factors, reversible reactions, Le Chatelier | KİM.11.1.5-7; KİM.11.2.1-5 | Advanced only |
| C9 | `electrochemistry` | Displacement, activity series, galvanic, electrolysis, plating, corrosion | KİM.12.1.x | Advanced only |
| C10 | `molecular-geometry` and `organic-basics` | VSEPR, hybridisation, hydrocarbons, functional groups | KİM.12.2.x | Last: content-heavy |

Reason for the order: it follows the particle-to-reaction dependency chain and the programme's own sequence (grade 5 particles, grade 7 atom, grade 8 reactions, grade 9-12 depth).

## 5. Prior art (inspiration and cross-check only; never copy text or assets)

| Resource | Use for us | Licence note (verified) |
|---|---|---|
| PhET chemistry simulations: Build an Atom <https://phet.colorado.edu/en/simulations/build-an-atom>, States of Matter <https://phet.colorado.edu/en/simulations/states-of-matter>, Molecule Shapes <https://phet.colorado.edu/en/simulations/molecule-shapes>, pH Scale <https://phet.colorado.edu/en/simulations/ph-scale>, Acid-Base Solutions <https://phet.colorado.edu/en/simulations/acid-base-solutions>, Balancing Chemical Equations <https://phet.colorado.edu/en/simulations/balancing-chemical-equations>, Reactants, Products and Leftovers <https://phet.colorado.edu/en/simulations/reactants-products-and-leftovers>, Soluble Salts <https://phet.colorado.edu/en/simulations/soluble-salts>, Reversible Reactions <https://phet.colorado.edu/en/simulations/reversible-reactions> | Look at interaction ideas only | PhET states regular HTML simulations published before 2026-03-29 are CC BY 4.0 with attribution; **translations allowed, other modifications not; logo must stay**; sims published on or after 2026-03-29, PhET-iO and Java/Flash are excluded. Source: <https://phet.colorado.edu/en/licensing/html>. Because the terms bar modification, we neither embed nor adapt them. The licensing landing page we first tried (`/en/about/licensing`) returns HTTP 404; use the `/en/licensing/html` URL |
| OpenStax Chemistry 2e <https://openstax.org/books/chemistry-2e/pages/preface> | Fact cross-check only | **Licence is CC BY-NC-SA 4.0** per its preface, not plain CC BY 4.0 as the task brief assumed (a web search summary also said CC BY, but the preface itself says NC-SA; the primary page wins). Same position as ADR 0004 for OpenStax Biology. The preface also forbids use for training or ingesting into LLMs without written permission, another reason to read it ourselves and write our own text |
| ChemCollective Virtual Lab <https://chemcollective.org/vlabs> | Prior art for a reagent-driven virtual bench (hundreds of aqueous reagents, titration, calorimetry, Ksp) | Site content CC BY-NC-ND 3.0 (as stated on the page), so no reuse of material |
| Wikipedia (English and Turkish) | Explanatory source we learn from, then write our own words (ADR 0004) | CC BY-SA, so never paste. Pages used in this dossier are listed in `kimya-lab.md` section 15 |

Turkish Wikipedia pages that exist (HTTP 200): Kimya <https://tr.wikipedia.org/wiki/Kimya>, Asit <https://tr.wikipedia.org/wiki/Asit>, Elektroliz <https://tr.wikipedia.org/wiki/Elektroliz>, Periyodik tablo <https://tr.wikipedia.org/wiki/Periyodik_tablo>. Many specific topics may lack a Turkish page (as we found for cell topics); cite the English page then.

## 6. Observations that change plans

1. The programme itself recommends virtual experiments and animations for the sub-micro level (KİM.10.1.3 practice: learners compare their explanation with sub-micro animations; KİM.12.1.2: experiment in "virtual or real" environments; FB.5.5.3: virtual labs). A virtual lab is explicitly in scope.
2. Calculation-heavy items are limited: no gas-law or ideal-gas calculations (KİM.10.1.9-10), no balancing in grade 8 (FB.8.5.3), no Faraday maths (KİM.12.1.7). Modules should be qualitative and visual there.
3. Reaction examples the programme names: vinegar + carbonate (FB.8.5.3), Mg and Fe combustion, metals with dilute HCl and with salt solutions, Zn + Cu(II) nitrate, strong acid + strong base neutralisation, a precipitation reaction (KİM.10.1.3, 12.1.1, 11.2.10). It does **not** name thermal decomposition, elephant toothpaste or crystallisation experiments; those are enrichment and must be labelled as such.
4. Vinegar is a weak acid and KİM.10.1.3 asks for strong acid-strong base for acid-base examples; vinegar + bicarbonate belongs to Fen grade 8 (FB.8.5.3) and the Kimya use is as an observation of gas evidence (KİM.10.1.1).
5. Grade 7 limits matter for the Temel text: ions are described without "katyon/anyon", and compound examples are restricted to ten named compounds.
