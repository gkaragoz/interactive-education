# Kimya Laboratuvarı (virtual chemistry lab): design research dossier

Research only, no code. Date: 2026-10-24. Companion to `docs/research/kimya.md` (curriculum). Programme codes quoted below were read in the official 2026 PDFs listed in `kimya.md` section 1 (MEB-FEN, MEB-KIM). Chemistry facts cite Wikipedia (explanatory source we read and then write in our own words, ADR 0004) or safety sheets. Numbers marked "our arithmetic" are computed by us from cited molar masses and constants and must be re-checked in the content phase. Design choices are labelled as ours, not facts. Practice text from the programme is paraphrased.

## 0. Why a lab module fits the programme

- KİM.10.1.3 practice: learners observe a reaction, then explain it with symbolic and sub-micro (particle) representations and compare with sub-micro **animations**. KİM.12.1.2: the experiment may be done "in virtual or real environments". FB.5.5.3: virtual labs are named as a source of experiments. The Kimya programme prefers micro-scale and non-toxic experiments (MEB-KIM section 1.1). Source: <https://tymm.meb.gov.tr/assets/pdf/kimya-dersi_20260819_143012_862.pdf>, <https://tymm.meb.gov.tr/assets/pdf/fen-bilimleri-dersi_20260902_111309_119.pdf>.
- A simulation lets us show what a school must not do (lead, concentrated peroxide, bright Mg flame) without risk, and the three representations at once: macro (what you see), sub-micro (particles), symbolic (equation). This three-layer structure is the programme's own (MEB-KIM section 1.1, aim 4).

## 1. Equipment and bench inventory

Sizes are our design values in real-world millimetres (world unit = 1 cm proposed); real glassware dimensions vary by maker. Pages for the object names: Erlenmeyer flask <https://en.wikipedia.org/wiki/Erlenmeyer_flask>, graduated cylinder <https://en.wikipedia.org/wiki/Graduated_cylinder>, burette <https://en.wikipedia.org/wiki/Burette>, pipette <https://en.wikipedia.org/wiki/Pipette>, test tube <https://en.wikipedia.org/wiki/Test_tube>, filter paper <https://en.wikipedia.org/wiki/Filter_paper>, Bunsen burner <https://en.wikipedia.org/wiki/Bunsen_burner>, alcohol burner <https://en.wikipedia.org/wiki/Alcohol_burner>, hot plate <https://en.wikipedia.org/wiki/Hot_plate>, magnetic stirrer <https://en.wikipedia.org/wiki/Magnetic_stirrer>, laboratory balance <https://en.wikipedia.org/wiki/Laboratory_balance>, fume hood <https://en.wikipedia.org/wiki/Fume_hood>, PPE <https://en.wikipedia.org/wiki/Personal_protective_equipment>.

| Group | Item | Design size (mm) | Used by experiments | Notes |
|---|---|---|---|---|
| Vessels | Beaker 100, 250 mL | Ø 50x70, Ø 70x95 | all | Pouring lip, graduation ticks, spout |
| | Erlenmeyer 250 mL | Ø 85 base, neck Ø 30, H 140 | E1, E3, E9 | Balloon/stopper accessory |
| | Test tube 16x150, rack for 6 | Ø 16, L 150 | E2, E5, E6 | Inverted tube for gas collection |
| | Graduated cylinder 100 mL | Ø 28 H 250 | E1, E8 | Meniscus readout |
| | Dropper/pasteur pipette; burette 25 mL with stand | L 150; L 500 | E2, E3 | Drop-wise addition; titration |
| | Watch glass, crucible with lid, tripod, wire gauze | Ø 70; Ø 30 | E7 | Mg burning is done lidded in school practice per RSC/CLEAPSS |
| | Hofmann voltameter | H 400, three limbs | E10 | |
| Handling | Spatula, tongs, test tube holder, glass rod, funnel, filter paper | | E4, E7, E8 | Funnel+filter for separation (FB.7.5.10) |
| Heating/stirring | Bunsen burner (air hole open = blue, closed = yellow safety flame), alcohol burner, hot plate with magnetic stirrer | | E4, E7, E8 | Flame types verified at <https://en.wikipedia.org/wiki/Bunsen_burner>: open air hole gives hotter blue flame, closed gives cooler luminous yellow flame |
| Measuring | Balance (0.01 g), thermometer (-10..110 °C), pH paper strip + colour chart, universal indicator bottle, stopwatch | | all | pH strip colours follow universal indicator: red at pH <= 3, orange/yellow 4-6, green 7, blue 8-10, violet >= 11 (<https://en.wikipedia.org/wiki/Universal_indicator>) |
| Safety | Goggles, gloves, apron, waste containers (acid/base, heavy metal, solid, sharps), fume hood hint, eyewash, fire blanket | | gate for starting an experiment | Mandatory check-in screen (section 9) |
| Power | 9 V DC supply with leads | | E10 | |

Reagent shelf (virtual, one drawer per category): acids (HCl 0.1/1 M, vinegar), bases (NaOH 0.1 M, baking soda), indicators (red cabbage extract, phenolphthalein, universal indicator), salts (CuSO4, Pb(NO3)2, KI, KNO3, NaCl, Na2SO4), metals (Mg ribbon, Zn, Fe nail, Cu), others (3 % H2O2, yeast, dish soap, sugar, water, ice).

## 2. The ten experiments

Selection criteria (ours): (1) named or directly supported by the programme text, (2) visually distinct in 3D (colour, gas, solid, light, sound), (3) clean sub-micro story, (4) safe to simulate, (5) coverage of reaction families (gas evolution, acid-base, precipitation, redox/displacement, combustion, catalysis, dissolution/crystallisation, electrolysis).

| # | Id | Title (TR) | Level | Reaction family | Programme anchor |
|---|---|---|---|---|---|
| E1 | `sirke-kabartma` | Sirke ile kabartma tozu: gaz çıkışı ve kütlenin korunumu | Temel + İleri | acid + carbonate, gas | FB.8.5.2, FB.8.5.3 (names vinegar-carbonate); KİM.10.1.1 |
| E2 | `kirmizi-lahana` | Kırmızı lahana ayıracı | Temel | indicators | FB.8.5.5, 8.5.6, 8.5.7 |
| E3 | `notrallesme` | Asit + baz: nötralleşme ve pH eğrisi | Temel + İleri | acid-base | FB.8.5.5; KİM.10.1.3, 11.2.10, 11.2.11 |
| E4 | `altin-yagmuru` | Çökelme: altın yağmuru (virtual only) | İleri | precipitation | KİM.10.1.3, 10.2.4-6 |
| E5 | `demir-bakir` | Demir çivi + bakır(II) sülfat: yer değiştirme | İleri | redox, displacement | KİM.10.1.3, 12.1.1, 12.1.2 |
| E6 | `magnezyum-asit` | Magnezyum + seyreltik HCl: hidrojen ve tepkime hızı | İleri | redox, gas, rate | KİM.12.1.1, 11.1.7, FB.8.5.8 |
| E7 | `magnezyum-yanma` | Magnezyum şeridin yanması (virtual only) | Temel (kütle) + İleri | combustion, redox | KİM.10.1.3 (names Mg combustion), 12.1.1 |
| E8 | `cozunme-doygunluk` | Çözünme hızı, doygun çözelti, kristallendirme | Temel + İleri | dissolution | FB.7.5.8, 7.5.9; KİM.10.2.4-6 |
| E9 | `hidrojen-peroksit-katalizor` | Hidrojen peroksit ve katalizör: köpük (fil dişi macunu) | İleri | catalysis, exothermic | KİM.11.1.1, 11.1.7 |
| E10 | `su-elektrolizi` | Suyun elektrolizi (Hofmann) | İleri | electrolysis | KİM.12.1.6 (water electrolysis visuals), 12.1.7 |

Not chosen, kept as backlog: rusting (slow; needs time-lapse; programme mentions rusting in KİM.11.1.x and FB.8.5.4), sodium acetate "hot ice" (supersaturation and exothermic crystallisation, <https://en.wikipedia.org/wiki/Sodium_acetate>), candle combustion (needs a vapour-flame model), thermal decomposition of carbonates (the programme does not name it; "ayrışma" not found in MEB-KIM).

Common format per experiment below. Quantities are "virtual scale" (what the bench shows), chosen so that small reagents are the limiting factor. Equations balanced by us.

### E1. Sirke + kabartma tozu (NaHCO3)
- Reagents: 50 mL vinegar (5 % acetic acid; commercial vinegar is 5-8 % for distilled white vinegar, <https://en.wikipedia.org/wiki/Vinegar>), 2.0 g NaHCO3 (M = 84.0 g/mol, <https://en.wikipedia.org/wiki/Sodium_bicarbonate>), 250 mL Erlenmeyer, optional balloon, balance.
- Equation: CH3COOH(aq) + NaHCO3(s) -> CH3COONa(aq) + H2O(l) + CO2(g) (acid + hydrogencarbonate gives salt, water, CO2; vinegar+baking soda mentioned at <https://en.wikipedia.org/wiki/Sodium_bicarbonate>).
- Numbers (our arithmetic): n(NaHCO3) = 2.0 / 84.0 = 0.0238 mol; n(CH3COOH) ~ 2.5 g / 60.05 = 0.042 mol, so NaHCO3 is limiting. CO2 = 0.0238 mol x 44.01 = 1.05 g, about 0.58 L at 25 °C (molar volume ~24.5 L/mol).
- Observation: fizzing, foam, flask feels cold (reaction is endothermic, qualitative only in teaching sources, e.g. <https://teachchemistry.org/classroom-resources/kitchen-reaction>); open flask shows ~1 g mass loss; balloon-closed system shows constant mass (conservation of mass holds for a closed system, <https://en.wikipedia.org/wiki/Conservation_of_mass>).
- Layer 1 macro: bubbles, foam rising, balance reading changes only when open.
- Layer 2 sub-micro script (seconds): 0-3 s acetic acid molecules and Na+/HCO3- ions in separate zones; 3-6 s an H+ (from CH3COOH) transfers to HCO3-, CH3COO- remains; 6-9 s H2CO3 forms and splits into H2O + CO2; 9-14 s CO2 molecules gather, nucleate into bubbles, rise; atoms are colour coded and a ghost counter shows each atom type count constant (C 3 -> 3 etc.). Show Na+ and CH3COO- staying in solution.
- Layer 3 symbolic: equation with coefficients, atom bookkeeping table (FB.8.5.3 limit: Temel level shows water formation with beads and no balancing; E1 at Temel shows words equation only; İleri shows formula equation, KİM.10.1.6 balancing).
- Kazanım: Temel FB.8.5.2, 8.5.3; İleri KİM.10.1.1 (gas evidence), 10.1.2, 10.1.6. Note: vinegar is a weak acid; KİM.10.1.3 acid-base examples use strong acid/base (see E3).
- Misconceptions (hypotheses, to be validated; FB.8.5.2 practice suggests collecting misconceptions with open questions): "the mass disappears" (gas has no mass); "bubbles are air that was already inside". Prediction prompt: "Kap açıkken tartı ne gösterir?"
- Quiz: Tahmin et (before releasing gas): options 1) aynı kalır 2) azalır 3) artar; answer 2 for open flask, with explanation of escaped CO2. Kendini dene: "Balonu kapatınca toplam kütle neden değişmedi?" (concept); "Hangisi kimyasal değişimin kanıtıdır?" (gaz çıkışı).
- Safety: low hazard; real-world: do not seal a bottle (pressure builds, source above), wear goggles. Home-safe with supervision except sealing.

### E2. Kırmızı lahana ayıracı
- Reagents: 5 mL red cabbage extract per tube (purple), test liquids: lemon juice, vinegar, water, baking-soda solution, soap solution, plus optionally cleaning products (kept to non-hazardous list; FB.8.5.8 requires non-hazardous). 
- Chemistry: anthocyanin pigments change colour with pH: red/pink acidic, purple neutral, blue-green to greenish-yellow alkaline (<https://en.wikipedia.org/wiki/Anthocyanin>). Programme lists red cabbage among the allowed indicators (FB.8.5.6, MEB-FEN p.212).
- Observation: colour ladder red -> purple -> blue -> green -> yellow. Compare with phenolphthalein (colourless below pH 8.3, pink 8.3-10, <https://en.wikipedia.org/wiki/Phenolphthalein>) and universal indicator (see section 1).
- Layer 2 sub-micro: pigment molecule shown as a coloured blob that gains/loses H+ (structure changes shape and absorbed wavelength). Script: 0-4 s H3O+ density high, pigment protonated (red), 4-8 s add base, OH- removes H+ from pigment, blob turns blue, 8-12 s further to green/yellow. Particle counts tied to pH slider (FB.8.5.7: lower than 7 acid, higher base).
- Layer 3: pH number line with indicator colour bar; HA <-> A- + H+ shown as generic indicator equilibrium (İleri only).
- Kazanım: Temel FB.8.5.5-8.5.7 (predict colour for an unknown acid or base is the programme prompt). pH values for each household liquid must be added from cited tables in the content phase; we have verified only: neutral = 7 at 25 °C (<https://en.wikipedia.org/wiki/PH>) and distilled vinegar pH about 2.6 (<https://en.wikipedia.org/wiki/Vinegar>).
- Misconceptions: "all acids are dangerous/corrosive", "colour tells the exact pH" (strip gives range). Tahmin et: "Sabunlu su kırmızı lahana suyunu hangi renge çevirir?" Kendini dene: ordering liquids by colour; "pH 3 ile pH 5 hangisi daha asidik?"
- Safety: simulation uses edible liquids; stress never taste or smell unknown chemicals (FB.8.5.5 programme text). Home-safe for edible set; keep away from bleach and drain cleaners.

### E3. Nötralleşme ve pH eğrisi (titrasyon)
- Reagents: 20.0 mL 0.100 M HCl (2.00 mmol) in flask with 2 drops phenolphthalein; burette of 0.100 M NaOH. Equation: HCl + NaOH -> NaCl + H2O; net H+ + OH- -> H2O. Heat of neutralisation for strong acid/strong base is -57.62 kJ/mol (<https://en.wikipedia.org/wiki/Enthalpy_of_neutralization>); our arithmetic: 2.00 mmol gives 115 J into ~40 g of solution (c ~ 4.18 J/(g K), <https://en.wikipedia.org/wiki/Specific_heat_capacity>), about +0.7 K.
- Observation: colourless until the end, first persistent pink at ~20.0 mL (indicator turns pink from pH 8.3, source above); pH curve is flat near 1-2, jumps steeply near equivalence (7 for strong/strong), then flat near 12-13 (curve shape: our simulation, standard titration behaviour, <https://en.wikipedia.org/wiki/Titration>). Conductivity probe optional (KİM.11.2.10 criteria: conductivity, pH, indicator).
- Layer 2 script: 0-4 s many H3O+ and Cl-; each added NaOH drop supplies Na+ and OH-; OH- meets H3O+, they form two H2O; Na+ and Cl- spectate and stay; at equivalence particle ratio H3O+ : OH- = 1 : 1 both near vanishing; past it OH- accumulates and the indicator turns pink. Particle counters feed the pH plot (chart strip, existing `chartAt`).
- Layer 3: word equation (Temel: acid + base gives salt + water, "without equations" per FB.8.5.5), full and net ionic equations (İleri), simple mole equality n(acid) = n(base) at the endpoint (KİM.11.2.11).
- Kazanım: Temel FB.8.5.5-7; İleri KİM.10.1.3 (acid-base), 11.2.10, 11.2.11.
- Misconceptions: "neutral means nothing is left" (ions remain); "pH 7 is always at the endpoint" (true only strong/strong, say so). Tahmin et: "10 mL NaOH eklenince renk ne olur?" Kendini dene: which species spectate; what the steep jump means.
- Safety: real HCl and NaOH are corrosive; goggles and gloves; never mix drain cleaners with acids at home. Do not try at home.

### E4. Altın yağmuru (PbI2), virtual only
- Reagents (virtual): 10 mL 0.10 M Pb(NO3)2 + 10 mL 0.20 M KI, then 80 mL hot water, then cooling bath. Equation: Pb(NO3)2(aq) + 2 KI(aq) -> PbI2(s) + 2 KNO3(aq); ionic Pb2+ + 2 I- -> PbI2 (<https://en.wikipedia.org/wiki/Lead(II)_iodide>). Our arithmetic: 1.0 mmol PbI2 = 0.461 g (M = 461.0 g/mol).
- Facts: PbI2 is bright yellow, sparingly soluble, 0.76 g/L at 20 °C and 4.1 g/L at 100 °C; dissolves colourless in hot water and recrystallises on cooling as large yellow flakes ("golden rain"); very toxic, GHS H360 (same source).
- Observation: instant yellow cloud on mixing (precipitation, <https://en.wikipedia.org/wiki/Precipitation_(chemistry)>); hot water clears it; cooling gives slowly settling glittering flakes.
- Layer 2 script: 0-3 s separate Pb2+ (grey), I- (violet), K+ and NO3- in the water; 3-8 s Pb2+ and I- approach and lock in a layered lattice, K+ and NO3- remain; 8-14 s clusters grow into a cloud (precipitate); hot phase: lattice dissolves back to ions (solubility rises with temperature); cooling: nucleation then ordered growth of flakes (supersaturation is the driver, same page).
- Layer 3: ionic equation, solubility-rule table row (Pb2+ with I- insoluble), "çift yönlü yer değiştirme" label (KİM.10.1.3 text says precipitation reactions are double displacement).
- Kazanım: İleri KİM.10.1.3, 10.2.4-6. MEB-KIM names precipitation but not this system; the programme text asks for a symbolic precipitation example, so this is a legitimate and visually strongest choice. Alternative with lower toxicity for any real classroom: CaCO3 from Na2CO3 + CaCl2 (white).
- Misconceptions: "the solid forms from nothing / is the same as ice"; "K+ and NO3- disappear". Tahmin et: "Soğutunca ne olacak?" Kendini dene: which ions are spectators.
- Safety: lead compounds must **never** be handled at home or without teacher permission; waste goes to the heavy-metal container. Simulation only.

### E5. Demir çivi + bakır(II) sülfat
- Reagents: 50 mL 0.10 M CuSO4 (5.0 mmol, blue), clean iron nail ~3 g (excess; our arithmetic). Equation: Fe + CuSO4 -> FeSO4 + Cu, ionic Fe + Cu2+ -> Fe2+ + Cu; half equations Fe -> Fe2+ + 2e-, Cu2+ + 2e- -> Cu (single replacement example from <https://en.wikipedia.org/wiki/Copper(II)_sulfate>). Order of activity Mg > Zn > Fe > Cu (<https://en.wikipedia.org/wiki/Reactivity_series>).
- Observation (expected from chemistry, not stated in the cited pages: reddish copper coat on the nail, blue colour fades; FeSO4 solution is pale green, to be verified in the content phase against <https://en.wikipedia.org/wiki/Iron(II)_sulfate>). Our arithmetic: max 0.318 g Cu deposited, 0.279 g Fe dissolved.
- Layer 2 script: Fe atoms at the nail surface lose two electrons each (electrons shown flowing through the metal), enter the water as Fe2+; nearby Cu2+ accept those electrons and become Cu atoms that stick to the surface; sulfate ions spectate. Time-lapse of nail coat thickness and a Cu2+ colour-density bar.
- Variant: Zn + Cu(NO3)2, the example named in MEB-KIM KİM.12.1.1 practice; and activity-series ordering with Cu, Zn, Fe, Pb (KİM.12.1.2). The programme excludes acidic/basic redox here.
- Kazanım: İleri KİM.10.1.3, 12.1.1, 12.1.2. Temel can show it as "a more active metal pushes out a less active one" (not a Temel kazanım; label as enrichment).
- Misconceptions: "the nail turns into copper"; "no new substance forms". Tahmin et: "Çivinin yüzeyi ne renge dönecek?" Kendini dene: which species is oxidised.
- Safety: copper sulfate is harmful if swallowed, damages eyes, toxic to aquatic life (GHS H302, H318, H410, <https://en.wikipedia.org/wiki/Copper(II)_sulfate>). Not for home; waste in heavy-metal container.

### E6. Magnezyum + seyreltik HCl (hidrojen)
- Reagents: 0.10 g Mg ribbon (4.1 mmol), 20 mL 1.0 M HCl (20 mmol), test tube, inverted gas tube over water. Equation: Mg + 2 HCl -> MgCl2 + H2 (Mg reacts exothermically with acids giving hydrogen, <https://en.wikipedia.org/wiki/Magnesium>). Our arithmetic: 4.1 mmol H2 ~ 0.10 L at 25 °C.
- Observation: vigorous bubbles, ribbon shrinks, test tube warms; collected gas gives a squeaky pop at a flame (virtual only; hydrogen is extremely flammable, CLEAPSS <https://science.cleapss.org.uk/Resource/SSS081-Group-II-metals.pdf>; see also <https://en.wikipedia.org/wiki/Hydrogen_safety>).
- Layer 2 script: Mg atoms at the surface give 2 electrons to H+ (shown from H3O+ near the metal), Mg2+ leaves into solution, two H atoms combine to H2 and nucleate into bubbles; Cl- spectates. Rate variant: increase concentration (more H3O+ collisions), temperature (faster, more energetic collisions), powder vs ribbon (more surface), per KİM.11.1.5-7.
- Layer 3: equation and half equations (İleri), rate factor chart.
- Kazanım: İleri KİM.12.1.1 (names Mg, dilute HCl), 11.1.7, 10.1.3; Temel/İleri FB.8.5.8 (acids react with metals).
- Misconceptions: "bubbles are air"; "heat comes from the acid alone". Tahmin et: "Asit derişimini ikiye katlarsak tepkime hızı ne olur?" Kendini dene: identify product gas and test.
- Safety: HCl corrosive, hydrogen explosive, Mg flammable; real work micro-scale with goggles in a ventilated room. Not at home.

### E7. Magnezyum şeridin yanması (virtual only)
- Reagents: 0.12 g Mg ribbon in a lidded crucible on a tripod, Bunsen burner, tongs. Equation: 2 Mg + O2 -> 2 MgO (plus some Mg3N2, <https://en.wikipedia.org/wiki/Magnesium>); MgO M = 40.30 g/mol. Our arithmetic: 4.94 mmol Mg -> 0.199 g MgO; ash is 1.66 times heavier than the metal because oxygen from the air joins.
- Facts: magnesium burns with a brilliant white light at about 3,100 °C (same page). School guidance: never look at burning Mg, use a shade 9 welding filter, wear eye protection (CLEAPSS Student Safety Sheet SSS081 <https://science.cleapss.org.uk/Resource/SSS081-Group-II-metals.pdf>; RSC practice sheets report the same but their URL returned HTTP 202 to our fetcher, so not re-verified here).
- Layer 1: flash (rendered with automatic brightness cap and a "welding filter" overlay toggle), white ash. Weighing before/after shows increase.
- Layer 2 script: ribbon = ordered Mg lattice; heat raises vibration; O2 molecules hit the surface and split; each O takes 2 electrons from a Mg atom; Mg2+ and O2- form an ionic lattice (MgO) with a strong energy release as light; counters show atoms conserved (Mg 2 -> 2, O 2 -> 2).
- Layer 3: equation; mass table (Mg 0.12 g + O2 0.08 g = MgO 0.20 g, our arithmetic).
- Kazanım: Temel enrichment (FB.8.5.3 conservation, FB.8.5.2 chemical change: light and heat); İleri KİM.10.1.3 (programme names Mg and Fe combustion), 12.1.1.
- Misconceptions: "burning destroys matter / the ash weighs less". Tahmin et: "Yanmadan sonra külün kütlesi?" Kendini dene: where the extra mass comes from.
- Safety: UV/bright flame can damage eyesight; flame temperature extreme. Never do at home.

### E8. Çözünme hızı, doygun çözelti, kristallendirme
- Reagents: 50 mL water; sugar (FB.7.5.9 example), NaCl and KNO3. Variables per FB.7.5.9: contact surface (lump vs powder), stirring, temperature. Solubility data: KNO3 13.3 / 31.6 / 243.9 g per 100 mL at 0 / 20 / 100 °C, oxidiser (<https://en.wikipedia.org/wiki/Potassium_nitrate>); NaCl 360 g/L at 25 °C (<https://en.wikipedia.org/wiki/Sodium_chloride>; temperature dependence to be sourced).
- Our arithmetic with the KNO3 numbers (assuming 50 mL, volume unchanged): at 20 °C max 15.8 g dissolves; add 20 g: 4.2 g stays at the bottom (saturated); at 100 °C all 20 g dissolve (limit 122 g); cooling to 0 °C leaves 6.65 g dissolved so ~13.35 g crystallises.
- Layer 2 script: water molecules (bent, dipoles) collide with surface ions of the crystal; each ion gets surrounded by water (hydration; <https://en.wikipedia.org/wiki/Solvation>); hot water = faster molecules, more collisions per second; stirring renews the layer next to the crystal; powder = more surface; saturation = dissolving and re-crystallising at equal rate (İleri). Cooling: ions slow, join the seed crystal, growth along facets (supersaturation, <https://en.wikipedia.org/wiki/Supersaturation>).
- Layer 3: solubility curve chart (g/100 mL vs T) with the learner's point moving; labels doymamış, doygun, aşırı doymuş (KİM.10.2.6).
- Kazanım: Temel FB.7.5.8, 7.5.9 (hypothesis and variable control); İleri KİM.10.2.1, 10.2.4-6. Temel limit: ions of NaCl in water may be mentioned (FB.7.5.8).
- Misconceptions: "the sugar disappears / melts"; "stirring dissolves more total sugar" (it only speeds it). Tahmin et: "Çayı karıştırırsak şeker daha çok mu çözünür, daha çabuk mu?" Kendini dene: "Hangi iki faktör çözünme hızını artırır?"
- Safety: KNO3 oxidiser (keep from fuels); sugar and salt are home-safe. Heating hot water: scald risk; use tongs.

### E9. Hidrojen peroksit + katalizör (fil dişi macunu)
- Reagents (safe version): 50 mL 3 % H2O2, 1 tsp dry yeast dissolved in warm water (catalase source), squirt of dish soap, food colouring, tall cylinder. İleri alternative catalyst KI. Equation: 2 H2O2 -> 2 H2O + O2, exothermic, dHr = -196 kJ/mol as written; iodide or catalase act as catalysts and are not consumed; demos with >12 % peroxide reach about 75 °C foam (<https://en.wikipedia.org/wiki/Elephant%27s_toothpaste>). Catalase decomposes H2O2 to water and oxygen, millions of molecules per second per enzyme (<https://en.wikipedia.org/wiki/Catalase>).
- Our arithmetic (3 % w/v ~ 0.88 M): 44 mmol H2O2 gives 22 mmol O2, ~0.54 L at 25 °C.
- Layer 2 script: H2O2 molecules in water, slow background decomposition; catalyst binds H2O2, provides lower-energy path (energy hill with and without catalyst: activation energy, <https://en.wikipedia.org/wiki/Activation_energy>), O-O bond breaks, O2 and H2O released, catalyst returns unchanged; O2 bubbles trapped by soap film become foam.
- Layer 3: equation with catalyst written over arrow; reaction energy profile.
- Kazanım: İleri KİM.11.1.1 (energy change experiment), 11.1.5, 11.1.7 (catalyst). Not named in the programme; labelled enrichment.
- Misconceptions: "catalyst is a reactant that gets used up", "foam is steam". Tahmin et: "Mayayı eklemezsek köpük olur mu?" Kendini dene: what is unchanged after the reaction.
- Safety: concentrated peroxide is an oxidiser and burns skin; the simulator uses only 3 %. Real home version with 3 % is common but needs goggles and no sealed bottle; do not use hair-bleach strengths.

### E10. Suyun elektrolizi (Hofmann voltameter)
- Reagents: 150 mL water with a little Na2SO4 (or dilute H2SO4) for conductivity, 9 V DC, two inert electrodes. Equations: cathode 2 H2O + 2 e- -> H2 + 2 OH-, anode 2 H2O -> O2 + 4 H+ + 4 e-, overall 2 H2O -> 2 H2 + O2; H2:O2 volume 2:1 ideally; theoretical minimum 1.23 V; added electrolyte supplies ions (<https://en.wikipedia.org/wiki/Electrolysis_of_water>). Apparatus description with graduated side tubes and platinum electrodes: <https://en.wikipedia.org/wiki/Hofmann_voltameter>.
- Observation: bubbles at both electrodes, twice the gas volume at the cathode; tests (virtual only): pop with flame for H2, relight a glowing splint for O2.
- Layer 2 script: ions Na+ and SO4 2- drift (cations to cathode, anions to anode), electrons shown in the external wire from anode to cathode; at the cathode H2O molecules take electrons and split to H2 and OH-; at the anode water gives electrons and releases O2 and H+; gas molecules gather and push water down in the tubes with a 2:1 particle count.
- Layer 3: half equations and overall; mole ratio 2:1 matches the formula H2O (Hofmann page).
- Kazanım: İleri KİM.12.1.6 (water electrolysis visuals; electrolytic cell components: anode, cathode, electrolyte, power source), KİM.12.1.7 (qualitative current-time-amount relation, no calculation).
- Misconceptions: "water is just hydrogen and oxygen mixed", "bubbles come from the electrolyte". Tahmin et: "Hangi tüp daha çok gaz toplar?" Kendini dene: "Neden saf suya tuz ekleniyor?"
- Safety: hydrogen/oxygen mixture is explosive; chlorine can form if NaCl is used instead (not simulated; not in the shelf). Home versions exist but need adult supervision; we mark "evde deneme" as not recommended.

## 3. Misconception and quiz format

Existing contract (`src/data/moduleTypes.ts`): `CheckQuestion` { id, trackId, atTime, levels, promptTr, options (3-4), correctIndex, explanationTr, kind: which-phase | what-next | count | concept } and `PredictPrompt` { trackId?, atTime, levels, promptTr, answerTr }. Lab experiments each become a **track** of the module with phases and fire prompts at `atTime` while the guided animation plays. Free-play uses a separate "Defter" check. Misconception lists above are hypotheses to be validated against Turkish chemistry-education literature before release (not done here). Ask for the programme-recommended two-tier diagnostic style (FB.8.5.5 practice names "iki aşamalı teşhis testleri").

## 4. Real-world safety rules to teach (and never-at-home list)

General rules (our synthesis of programme text and CLEAPSS): wear goggles and gloves; no tasting or smelling unknown chemicals and no touching acids/bases (FB.8.5.5 practice); read hazard pictograms (FB.8.5.5; GHS pictograms <https://en.wikipedia.org/wiki/Globally_Harmonized_System_of_Classification_and_Labelling_of_Chemicals>); heavy-metal and acid/base waste to separate containers; small quantities; keep fire away from hydrogen.

| Experiment | Home attempt? | Reason (source) |
|---|---|---|
| E1 | Yes with supervision, never in a sealed bottle | Pressure buildup (teaching sources, <https://teachchemistry.org/classroom-resources/kitchen-reaction>) |
| E2 | Yes with edible liquids only | |
| E3, E5, E6 | No | Corrosive acids/bases, copper salts toxic to aquatic life |
| E4 | **Never** | Lead compound, H360 (<https://en.wikipedia.org/wiki/Lead(II)_iodide>) |
| E7 | **Never** | Eyesight damage (CLEAPSS SSS081) |
| E8 | Yes (sugar, salt); not KNO3 | Oxidiser (<https://en.wikipedia.org/wiki/Potassium_nitrate>) |
| E9 | Only with 3 % peroxide and supervision | Stronger solutions hot and hazardous (<https://en.wikipedia.org/wiki/Elephant%27s_toothpaste>) |
| E10 | Not recommended | Explosive gas mixture, electrical hazard |

Blocked combinations in free play (rule engine returns a lesson card, not a visual of the hazard): bleach with acids (toxic chlorine gas, <https://en.wikipedia.org/wiki/Sodium_hypochlorite>) and bleach with ammonia (toxic chloramines, same page). The simulator should say it is blocked and why, and give no quantities or procedure.

## 5. 3D asset list

| Asset | Spec (our proposal) | Material and notes |
|---|---|---|
| Glassware set (beaker 100/250, Erlenmeyer, test tube, cylinder, burette, funnel, watch glass, crucible, Hofmann tube) | Procedural lathe geometry (profile curves) plus graduation texture/decal; 500-1500 triangles each | Glass: MeshPhysicalMaterial with transmission, ior 1.5, thickness, attenuation (documented properties, per-pixel cost higher than other materials, <https://threejs.org/docs/pages/MeshPhysicalMaterial.html>); cheap fallback: env-map plus Fresnel (<https://en.wikipedia.org/wiki/Fresnel_equations>) on a transparent shell |
| Liquid volume | Inner lathe mesh clipped by fill-level uniform, meniscus ring (<https://en.wikipedia.org/wiki/Meniscus_(liquid)>) | Tinted by absorbance (Beer-Lambert, <https://en.wikipedia.org/wiki/Beer%E2%80%93Lambert_law>); surface ripple normal map |
| Particles | InstancedMesh spheres (<https://threejs.org/docs/#api/en/objects/InstancedMesh>) for atoms/ions/molecules in a magnified "particle lens" | CPK-like colours defined in our own data; seeded RNG |
| Bubbles | Instanced billboards or small spheres with rim shader | Spawn from nucleation sites, rise, merge |
| Precipitate | Instanced small flakes (PbI2), settled-layer heightfield | Golden glitter uses a sparkle shader |
| Solids (nail, Mg ribbon, Zn, crystals) | Low-poly meshes with painted textures; coat layer shader (Cu) | |
| Flame, glow | Billboard flame quad with noise, additive; Mg flash with bloom clamp | Photosensitivity: cap flashes (WCAG, section 10) |
| Steam/foam | Instanced soft sprites; foam column as growing instanced bubbles | |
| Equipment | Bunsen, alcohol burner, hot plate+stirrer, balance with digital display (canvas texture), thermometer, rack, tripod, tongs, goggles/gloves | Modelled by us in Blender 5.2 headless or procedurally (project pipeline `docs/BLENDER_PIPELINE.md`) |
| Labels | HTML overlay via existing `labelsAt` | Turkish, with symbolic formulas |
| Bench environment | Table, backsplash, safety poster, fume-hood frame | Simple, low overdraw |

## 6. Liquid simulation approaches for three.js (options)

| Option | How | Pros | Cons | Our view |
|---|---|---|---|---|
| A. Fill-level shader (recommended) | Liquid is a clipped mesh whose top plane follows `fillLevel`; surface wobble via normal map; pour stream as a tube mesh; meniscus ring | Cheap, deterministic, fits "pure function of time" (`seek(t)` per `MODULES.md`) | Not true fluid dynamics; sloshing is scripted | Default |
| B. Heightfield water | 2D wave equation on a grid for surface ripples after pour/impact | Looks lively, still cheap | Stateful: needs deterministic stepping or replay; conflicts with pure `seek` unless baked per event | Optional ripple layer driven by analytic damped waves instead |
| C. Particle fluid (SPH/PBF) | Smoothed-particle hydrodynamics (<https://en.wikipedia.org/wiki/Smoothed-particle_hydrodynamics>), position-based fluids (<https://mmacklin.com/pbf_sig_preprint.pdf>), surface via metaballs (<https://en.wikipedia.org/wiki/Metaballs>)/marching cubes (<https://en.wikipedia.org/wiki/Marching_cubes>) | Real pouring | Heavy on CPU/GPU, not deterministic across hardware, too risky for the 16 ms budget on a GTX 1080 Ti | Reject; use only for tiny pour streams (<= 300 droplets) if at all |
| D. Pre-baked events | Pour, drop, splash as baked animation clips driven by volume transferred | Deterministic, art-directed | More authoring | Use together with A |

Colour mixing model: store each solution's absorbance per RGB channel (concentration x coefficient) and add them (Beer-Lambert additive in absorbance); display colour = white light x exp(-A x path length). Indicators map pH to absorbance spectra. Gas bubbles and precipitate add a turbidity term.

## 7. Chemistry engine design (simple, rule-based)

Goals: deliver the 10 reactions plus free play; give sensible "nothing happens" results; block unsafe combos. Not a physics-accurate solver (honest limit).

Data model (design, not code):
- **Substance**: id, nameTr, formula, state, molar mass, density, colour/absorbance, ions it releases, solubility curve (g/100 mL vs T) and/or solubility-rule class, acid/base character (strong/weak, pKa if used), hazard tags (GHS), source URL (ADR 0004 rule: every substance and rule has a Source and kazanım link, enforced by a test as for organelles).
- **Container state**: list of species with moles, volume, temperature, phase (dissolved, solid, gas collected), electrodes/power flags, catalyst presence.
- **Reaction rule families** (match on species classes, not on thousands of hand-written pairs):
  1. acid + carbonate/hydrogencarbonate -> salt + water + CO2 (E1).
  2. strong acid + strong base -> salt + water, dH = -57.62 kJ/mol H2O (E3; value cited above).
  3. acid + active metal (above H in the activity series) -> salt + H2 (E6).
  4. metal + salt solution of a less active metal -> displacement (E5; ordering from the reactivity series).
  5. double displacement with insoluble product by solubility rules (E4; rules <https://en.wikipedia.org/wiki/Solubility_chart>).
  6. metal + O2 with ignition -> oxide (E7).
  7. catalysed decomposition: H2O2 with catalase/I- (E9).
  8. electrolysis: requires power + electrodes + electrolyte (E10).
  9. physical dissolution/crystallisation by solubility curve (E8).
  10. indicator colour from pH (E2, E3).
- **Stoichiometry/limiting reagent**: convert to moles, extent = min over reactants of n/coefficient (<https://en.wikipedia.org/wiki/Limiting_reagent>), update species. Mass conservation test: sum of masses invariant unless gas leaves an open container.
- **Thermodynamics-lite**: dT = -(extent x dH) / (m x c) with c_water ~ 4.18 J/(g K) (<https://en.wikipedia.org/wiki/Specific_heat_capacity>); heat loss to air as exponential cooling; flags for endothermic cooling (E1 qualitative only).
- **Rate-lite**: rate = k(T, surface, concentration, catalyst) with collision-theory-shaped factors (<https://en.wikipedia.org/wiki/Collision_theory>): k doubles per +10 K as a teaching approximation (our simplification, labelled in `ModuleInfo.simplifications`).
- **pH-lite**: strong acid/base by concentration; weak acids by lookup for the few reagents; mixtures by charge balance only for the fixed reagent shelf.
- **Observation generator**: each event emits tagged observations (gas, precipitate, colour change, temperature change, light, sound) that feed the Defter and the "evidence of chemical change" checklist (KİM.10.1.1 list: energy change, gas, colour, new solid).
- **Free play fallback**: no matching rule -> "Gözlenebilir bir değişim olmadı" plus a mixing result (homogeneous/heterogeneous, FB.7.5.8). Unknown pairs never invent reactions.
- **Unsafe blocklist**: pairwise hazard matrix (section 4) returns a lesson card.
- Determinism: all outcomes are pure functions of (inputs, seed); animations replay from the event log, which matches the existing `seek(t)` contract (`docs/MODULES.md`).

## 8. UX proposals

- **Layout**: central bench (front), shelves/drawers left (equipment) and right (reagents by category), top-right goggles/gloves "ready" status, bottom Defter strip and timeline. Fume-hood hint as a framed zone where E6/E7 sit.
- **Interaction**: pointer events (project rule: not mouse-only, `CLAUDE.md`); drag-and-drop with snap points; a tilt gesture pours (hold the container over another; flow proportional to tilt); click-and-hold dispenser for spatula and dropper; keyboard alternative for every action (see 9).
- **Modes**: *Rehberli* (guided, each experiment as a track with phases, predict and check prompts via the existing timeline player) and *Serbest* (free play with the same bench, rule engine, and Defter). Level toggle Temel/İleri changes which layer details and equations show (Temel never beyond the grade limits in `kimya.md`).
- **"Nedenini göster"**: a button after the macro result opens the particle-level explainer, which is an animated timeline track (the existing player: play, pause, seek, speed, loop, step phase). The macro bench view and the particle lens share camera dolly into the vessel.
- **Defter (lab notebook)**: table of experiment, prediction, observation tags (colour, gas, precipitate, temperature, light, sound), measured values (mass, T, pH), and the learner's one-line conclusion; exportable as a printable page. Aligns with programme "deney raporu / çalışma kâğıdı" evidence (MEB-KIM learning evidence lists) and FB.8.5.3 data recording. Persistence: localStorage with try/catch fallback (project rules say no backend).
- **Safety check-in**: before any experiment, the learner dresses goggles/gloves and tags the hazard pictograms; skipping triggers a gentle blocker.
- **Feedback**: highlights show where the equation's atoms are in the particle view (hover linking).

## 9. Accessibility

- Every drag action has a keyboard path (focus a vessel, Enter to pick up, arrow to choose target, Enter to pour) and an on-screen "Dök / Ekle / Isıt" menu; follows pointer-event and ARIA patterns (<https://www.w3.org/WAI/ARIA/apg/patterns/>).
- Colour is never the only carrier of information: add text names, patterns and pH numbers (WCAG Use of Color, <https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html>).
- Respect `prefers-reduced-motion`: no autoplay; step through phases with the playhead, matching project rule (<https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion>); provide pause/stop for moving content (<https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html>).
- Flashes (E7 Mg flash, flame) are rate-limited to avoid photosensitivity risk; offer a "yumuşak parlama" option (WCAG 2.2 <https://www.w3.org/TR/WCAG22/>).
- Screen-reader live region announces observations ("Gaz çıkışı gözlendi"), the Defter is plain HTML.
- Desktop only for now (project scope); pointer events keep a tablet door open.

## 10. Performance budget (<= 16 ms/frame at medium on GTX 1080 Ti)

Our proposal (to be measured, no benchmark run yet):
- Draw calls <= 150; triangles <= 250k; instanced particles <= 6k at medium (2k low, 12k high).
- Glass: at most 4 vessels with real transmission at high; medium uses a cheap env-map shell with Fresnel; low uses flat tinted transparency. Reason: the docs warn MeshPhysicalMaterial has a higher per-pixel cost (page above); transmission's extra scene pass cost is our assumption and must be profiled.
- Liquids: fill-level shader only; at most 6 visible liquids; foam and bubbles instanced; one shadow-casting light.
- All motion is a pure function of time; particles posed by closed-form motion plus seeded jitter, so scrubbing costs the same as playing.
- Budget test: automated frame-time probe in e2e on the dev machine for the heaviest scenes (E9 foam, E10 two-tube bubbles).

## 11. Test strategy

- Unit: engine determinism (same inputs and seed -> same outputs), stoichiometry (limiting reagent for each experiment, values in section 2 re-computed), mass conservation (closed vs open), thermo-lite sign tests, solubility lookups, pH-lite, blocklist coverage.
- Data integrity (as for organelles): each substance, rule and experiment has a Source and kazanım link; each Temel text stays within grade limits listed in `kimya.md`.
- `seek` purity: same t -> same poses for each track; phase boundaries; chart values.
- UI: keyboard-only completion of one experiment; reduced-motion run; prompts pause and resume.
- E2E (Playwright): play each of the 10 tracks, check no console errors, screenshot diff tolerant; frame-time probe.
- Content review: Turkish chemistry teacher review of all text and misconceptions (not done here).

## 12. Phased delivery plan

| Phase | Scope | Exit |
|---|---|---|
| L0 | Decide scope questions (section 14); content sources file | User approval |
| L1 | Bench shell, glassware set, fill-level liquid, pouring, balance, thermometer; engine core with E1 and E2 as guided tracks | Playable E1/E2, perf probe passes |
| L2 | E3 (titration, pH chart), E8 (dissolution), Defter; particle lens with shared particle library | 4 experiments |
| L3 | E5, E6, E9 (redox, gas, catalysis); heating tools | 7 experiments |
| L4 | E4, E7, E10 (virtual-only hazards, electrodes, flash handling) | 10 experiments |
| L5 | Free play, blocklist, accessibility pass, QA agents, docs | Release candidate |
Each phase ends with user approval per `CLAUDE.md` ("Milestones end with user approval"). Recommended order relative to the other chemistry modules: after `reactions` (C4) and `acids-bases` (C6) in `kimya.md`.

## 13. Honest risk list

1. Scope: ten experiments with three layers each is a large content load; particle scripts and Turkish text will dominate effort. Mitigation: shared particle library and rule families.
2. Rendering cost of glass/liquid on a 1080 Ti; transmission cost unmeasured. Mitigation: shell fallback, early perf probe.
3. Fidelity: a rule engine cannot be physically exact; free-play answers can look wrong in untested pairs. Mitigation: closed reagent shelf, "nothing happens" default, simplification notes in the UI.
4. Safety messaging: showing lead, bright Mg flame or peroxide could be misread as encouragement. Mitigation: virtual-only labels, never-at-home table, no unsafe-recipe free play.
5. Programme alignment: E4, E9 and E10 are partly enrichment; thermal decomposition and rusting are absent from the programme. Mitigation: label enrichment, tie to the nearest kazanım only where the text supports it.
6. Pure-function-of-time contract versus stateful free play: the lab has user-driven state. Mitigation: record an event log and derive animation from it (design to be prototyped).
7. Licence/IP: PhET terms bar modifying their sims; OpenStax Chemistry 2e is CC BY-NC-SA 4.0 and forbids LLM ingestion without permission; we only cross-check. Mitigation: own models and text.
8. Chemistry-education correctness: misconception lists and Turkish terminology need teacher review; several pH and colour values still need sourcing.
9. Photosensitivity and accessibility of flashes and fast bubbles. Mitigation: caps and options.

## 14. Unresolved questions for the user

1. Should the lab be one module with ten guided tracks plus free play, or ten small modules?
2. Is hazardous chemistry (lead iodide, Mg flame, concentrated-feel peroxide) acceptable even as virtual-only, or should E4 use CaCO3 and E7 stay as video-style animation with a filter?
3. Which level is the primary audience first: Temel (5-8) or İleri (9-12)? Several experiments (E4-E6, E9, E10) are İleri only.
4. Do we want Defter export (print/PDF) and teacher-facing worksheets, or learner-only?
5. May we add enrichment experiments that the programme does not name (E9, E10 partly), flagged as such?
6. Ordering: build `reactions`/`acids-bases` first, or start the lab shell early to prove performance?
7. Do we need a Turkish chemistry teacher for content review before release?
8. Sound design (fizz, pop, flame hiss): in scope or silent?

## 15. Sources used (all fetched or HTTP-checked on 2026-10-24)

Programme: <https://tymm.meb.gov.tr/assets/pdf/kimya-dersi_20260819_143012_862.pdf>, <https://tymm.meb.gov.tr/assets/pdf/fen-bilimleri-dersi_20260902_111309_119.pdf>.
Safety: CLEAPSS SSS081 <https://science.cleapss.org.uk/Resource/SSS081-Group-II-metals.pdf> (read); AACT kitchen reaction page <https://teachchemistry.org/classroom-resources/kitchen-reaction> (HTTP 200; its content was known only from a search summary, so re-read before quoting).
Wikipedia pages read: Lead(II) iodide, Elephant's toothpaste, Anthocyanin, Electrolysis of water, Hofmann voltameter, Magnesium, Sodium acetate, Reactivity series, Bunsen burner, Conservation of mass, Copper(II) sulfate, Universal indicator, Precipitation (chemistry), Potassium nitrate, Phenolphthalein, PH, Vinegar, Sodium bicarbonate, Enthalpy of neutralization, Sodium hypochlorite, Specific heat capacity, Sodium chloride, Catalase. Pages only HTTP-checked (not read in full): the remaining Wikipedia links listed above; Turkish pages in `kimya.md`.
Technical: three.js MeshPhysicalMaterial docs, W3C WCAG 2.2 and understanding pages, MDN prefers-reduced-motion, WAI-ARIA APG, Macklin and Müller PBF preprint (HTTP-checked only).
