# Kimya Laboratuvarı: engine sources (`src/chemlab`)

Date: 2026-10-24. Companion to `docs/research/kimya-lab.md` (design dossier) and `src/chemlab/README.md` (architecture). Learner text is written in our own words (ADR 0004); this file lists what the numbers and rules were read from.

## Method and honesty notes

- **URL check.** Every URL below appeared in a source comment of `src/chemlab` or `tests/chemlab` on 2026-10-24 and returned HTTP 200 to `curl` (follow-redirects off for substance rows, on for three pages whose title has parentheses). A 200 shows that the page exists, not that it says what we claim.
- **Content check.** For the substance rows (`src/chemlab/substancesData.ts`) the raw wikitext of the cited Wikipedia page was fetched on the same day and the density, solubility, melting point, pKa and (where listed) enthalpy of formation were read from its infobox. Numbers that are **not** on the cited page are marked in the row's `note` ("unverified", "handbook value", "teaching value", "our arithmetic") and listed below. Nothing else was cross-checked against a second source; a Turkish chemistry teacher should review the table (ADR 0005).
- **Our arithmetic** means computed by us from cited constants (e.g. solubility from a K_sp on the page, moles from a molar mass); the formulas are in the test names.
- **Our teaching values** (not facts about the world): reaction rate constants, catalyst strengths, heater powers, cooling time constants, glass masses, the 12 % supersaturation threshold, escape rate of gas from open vessels, the 2 atm stopper limit, effective ion absorbances for the colours, the cell constant of the voltameter. They are chosen so experiments take tens of seconds to minutes of simulated time and are named as simplifications in the README.
- **Not verified in this task:** the MEB programme PDFs (read in `kimya.md`), CLEAPSS SSS081 and the AACT kitchen-reaction page (linked from the dossier; checked only as links, all HTTP 200 on 2026-10-24), the formation enthalpies of aqueous ions used for the redox enthalpies (`rulesRedox.ts`: Mg2+ -466.85, Al3+ -531, Zn2+ -153.89, Fe2+ -89.1, Cu2+ +64.77, Ag+ +105.58 kJ/mol, handbook values from memory), the CO2 and liquid water formation enthalpies behind the +91.6 kJ in the NaHCO3 decomposition, the solution enthalpies of NaCl, KCl, KNO3, CaCl2, NH4NO3, NaOH, sucrose (signs follow the pages, magnitudes are handbook values), and the 60 and 80 degC solubilities of KNO3, NaCl and sucrose.

## Values that are not read from the cited page

- `naoh`: dH sign: page calls it highly exothermic; the magnitude is a typical handbook value (unverified).
- `nacl`: 36.0 g/100 mL at 25 C is on the page (360 g/L); the other points are handbook values (unverified here).
- `kcl`: dH is a typical handbook value (unverified).
- `kno3`: 0/20/25/100 C points are on the page (133/316/383/2439 g/L); 60 and 80 C are handbook values (unverified). dH is a typical handbook value (unverified).
- `cuno32`: Density and solubility are approximate (the page says only "very soluble"); unverified.
- `feso4`: Page: 29.5 g/100 g for all forms; density of the anhydrous salt is approximate (unverified).
- `fecl3`: Density approximate (unverified).
- `cacl2`: dH magnitude is a typical handbook value (unverified); density approximate.
- `na2co3`: -26.7 kJ/mol, the 0 and 15 C points and pKa 10.33 are on the page; the 20 C value and density are approximate (unverified).
- `nahco3`: Solubility 69/96/165 g/L at 0/20/60 C and pKa 6.351 are on the page; density and dH are approximate (unverified).
- `nh4no3`: The page says dissolution is highly endothermic (cold packs); the 25.7 kJ/mol magnitude is a typical handbook value (unverified).
- `soap`: Model of dish soap (a real detergent is a mixture); density, solubility and pKa are our teaching values (unverified).
- `agcl`: Our arithmetic from Ksp = 1.77e-10 on the page.
- `baso4`: Our arithmetic from Ksp = 1.08e-10 on the page.
- `cuoh2`: Our arithmetic from Ksp = 2.2e-20 on the page.
- `cuco3`: Our arithmetic from Ksp = 10^-11.45 on the page; density approximate.
- `znoh2`: Our arithmetic from Ksp = 1.8e-14 on the page.
- `feoh3`: Practically insoluble; density and solubility are teaching values (unverified).
- `mno2`: Catalyst for peroxide decomposition; density approximate (unverified).
- `sucrose`: 2.01 g/mL at 20 C is on the page; 60 and 80 C and dH are handbook values (unverified).
- `naclo`: Used for blocked combinations only; solubility and density approximate (unverified).

## Programme and safety sources used by the experiments (from the dossier)

- MEB Kimya programme: <https://tymm.meb.gov.tr/assets/pdf/kimya-dersi_20260819_143012_862.pdf>
- MEB Fen Bilimleri programme: <https://tymm.meb.gov.tr/assets/pdf/fen-bilimleri-dersi_20260902_111309_119.pdf>
- CLEAPSS SSS081 Group II metals: <https://science.cleapss.org.uk/Resource/SSS081-Group-II-metals.pdf>
- AACT kitchen reaction: <https://teachchemistry.org/classroom-resources/kitchen-reaction>

## Verified URLs (HTTP 200)

### Wikipedia pages (132)

- <https://en.wikipedia.org/wiki/Acetic_acid>
- <https://en.wikipedia.org/wiki/Acid%E2%80%93base_reaction>
- <https://en.wikipedia.org/wiki/Acid_dissociation_constant>
- <https://en.wikipedia.org/wiki/Activation_energy>
- <https://en.wikipedia.org/wiki/Alcohol_burner>
- <https://en.wikipedia.org/wiki/Aluminium>
- <https://en.wikipedia.org/wiki/Aluminium#Chemistry>
- <https://en.wikipedia.org/wiki/Aluminium_chloride>
- <https://en.wikipedia.org/wiki/Ammonia>
- <https://en.wikipedia.org/wiki/Ammonium_chloride>
- <https://en.wikipedia.org/wiki/Ammonium_nitrate>
- <https://en.wikipedia.org/wiki/Anthocyanin>
- <https://en.wikipedia.org/wiki/Arrhenius_equation>
- <https://en.wikipedia.org/wiki/Barium_chloride>
- <https://en.wikipedia.org/wiki/Barium_sulfate>
- <https://en.wikipedia.org/wiki/Beer%E2%80%93Lambert_law>
- <https://en.wikipedia.org/wiki/Borosilicate_glass>
- <https://en.wikipedia.org/wiki/Bunsen_burner>
- <https://en.wikipedia.org/wiki/Burette>
- <https://en.wikipedia.org/wiki/Calcium_carbonate>
- <https://en.wikipedia.org/wiki/Calcium_chloride>
- <https://en.wikipedia.org/wiki/Calcium_hydroxide>
- <https://en.wikipedia.org/wiki/Carbon_dioxide>
- <https://en.wikipedia.org/wiki/Carbonic_acid>
- <https://en.wikipedia.org/wiki/Catalase>
- <https://en.wikipedia.org/wiki/Catalysis>
- <https://en.wikipedia.org/wiki/Chemical_equation>
- <https://en.wikipedia.org/wiki/Chemical_formula>
- <https://en.wikipedia.org/wiki/Chlorine>
- <https://en.wikipedia.org/wiki/Chloroform>
- <https://en.wikipedia.org/wiki/Citric_acid>
- <https://en.wikipedia.org/wiki/Collision_theory>
- <https://en.wikipedia.org/wiki/Combustion>
- <https://en.wikipedia.org/wiki/Conservation_of_mass>
- <https://en.wikipedia.org/wiki/Copper>
- <https://en.wikipedia.org/wiki/Copper(II)_carbonate>
- <https://en.wikipedia.org/wiki/Copper(II)_hydroxide>
- <https://en.wikipedia.org/wiki/Copper(II)_nitrate>
- <https://en.wikipedia.org/wiki/Copper(II)_sulfate>
- <https://en.wikipedia.org/wiki/Crystallization>
- <https://en.wikipedia.org/wiki/Drop_(unit)>
- <https://en.wikipedia.org/wiki/Electrolysis>
- <https://en.wikipedia.org/wiki/Electrolysis_of_water>
- <https://en.wikipedia.org/wiki/Elephant%27s_toothpaste>
- <https://en.wikipedia.org/wiki/Enthalpy_of_neutralization>
- <https://en.wikipedia.org/wiki/Enthalpy_of_vaporization>
- <https://en.wikipedia.org/wiki/Equivalence_point>
- <https://en.wikipedia.org/wiki/Ethanol>
- <https://en.wikipedia.org/wiki/Faraday_constant>
- <https://en.wikipedia.org/wiki/Flash_powder>
- <https://en.wikipedia.org/wiki/Globally_Harmonized_System_of_Classification_and_Labelling_of_Chemicals>
- <https://en.wikipedia.org/wiki/Glucose>
- <https://en.wikipedia.org/wiki/Graduated_cylinder>
- <https://en.wikipedia.org/wiki/Haloform_reaction>
- <https://en.wikipedia.org/wiki/Henderson%E2%80%93Hasselbalch_equation>
- <https://en.wikipedia.org/wiki/Hofmann_voltameter>
- <https://en.wikipedia.org/wiki/Hot_plate>
- <https://en.wikipedia.org/wiki/Hydrochloric_acid>
- <https://en.wikipedia.org/wiki/Hydrogen>
- <https://en.wikipedia.org/wiki/Hydrogen_peroxide>
- <https://en.wikipedia.org/wiki/Hydrogen_safety>
- <https://en.wikipedia.org/wiki/Ideal_gas_law>
- <https://en.wikipedia.org/wiki/Ion>
- <https://en.wikipedia.org/wiki/Iron>
- <https://en.wikipedia.org/wiki/Iron(II)_sulfate>
- <https://en.wikipedia.org/wiki/Iron(III)_chloride>
- <https://en.wikipedia.org/wiki/Iron(III)_oxide-hydroxide>
- <https://en.wikipedia.org/wiki/Laboratory_balance>
- <https://en.wikipedia.org/wiki/Laboratory_safety>
- <https://en.wikipedia.org/wiki/Lemon>
- <https://en.wikipedia.org/wiki/Limiting_reagent>
- <https://en.wikipedia.org/wiki/Litmus>
- <https://en.wikipedia.org/wiki/Magnesium>
- <https://en.wikipedia.org/wiki/Magnesium_chloride>
- <https://en.wikipedia.org/wiki/Magnesium_hydroxide>
- <https://en.wikipedia.org/wiki/Magnesium_oxide>
- <https://en.wikipedia.org/wiki/Manganese(IV)_oxide>
- <https://en.wikipedia.org/wiki/Molar_conductivity>
- <https://en.wikipedia.org/wiki/Molar_mass>
- <https://en.wikipedia.org/wiki/Molar_volume>
- <https://en.wikipedia.org/wiki/Newton%27s_law_of_cooling>
- <https://en.wikipedia.org/wiki/Nitric_acid>
- <https://en.wikipedia.org/wiki/Nitrogen>
- <https://en.wikipedia.org/wiki/Oxygen>
- <https://en.wikipedia.org/wiki/PH>
- <https://en.wikipedia.org/wiki/PH_indicator>
- <https://en.wikipedia.org/wiki/Peracetic_acid>
- <https://en.wikipedia.org/wiki/Phenolphthalein>
- <https://en.wikipedia.org/wiki/Polyatomic_ion>
- <https://en.wikipedia.org/wiki/Potassium_carbonate>
- <https://en.wikipedia.org/wiki/Potassium_chloride>
- <https://en.wikipedia.org/wiki/Potassium_hydroxide>
- <https://en.wikipedia.org/wiki/Potassium_iodide>
- <https://en.wikipedia.org/wiki/Potassium_nitrate>
- <https://en.wikipedia.org/wiki/Precipitation_(chemistry)>
- <https://en.wikipedia.org/wiki/Rate_equation>
- <https://en.wikipedia.org/wiki/Reaction_rate>
- <https://en.wikipedia.org/wiki/Reaction_rate#Factors_influencing_rate>
- <https://en.wikipedia.org/wiki/Reactivity_series>
- <https://en.wikipedia.org/wiki/Redox>
- <https://en.wikipedia.org/wiki/Self-ionization_of_water>
- <https://en.wikipedia.org/wiki/Silver>
- <https://en.wikipedia.org/wiki/Silver_chloride>
- <https://en.wikipedia.org/wiki/Silver_nitrate>
- <https://en.wikipedia.org/wiki/Sodium_acetate>
- <https://en.wikipedia.org/wiki/Sodium_bicarbonate>
- <https://en.wikipedia.org/wiki/Sodium_carbonate>
- <https://en.wikipedia.org/wiki/Sodium_chloride>
- <https://en.wikipedia.org/wiki/Sodium_hydroxide>
- <https://en.wikipedia.org/wiki/Sodium_hypochlorite>
- <https://en.wikipedia.org/wiki/Sodium_laurate>
- <https://en.wikipedia.org/wiki/Sodium_nitrate>
- <https://en.wikipedia.org/wiki/Sodium_sulfate>
- <https://en.wikipedia.org/wiki/Solubility_chart>
- <https://en.wikipedia.org/wiki/Solvation>
- <https://en.wikipedia.org/wiki/Specific_heat_capacity>
- <https://en.wikipedia.org/wiki/Standard_atomic_weight>
- <https://en.wikipedia.org/wiki/Standard_electrode_potential_(data_page)>
- <https://en.wikipedia.org/wiki/Standard_enthalpy_of_formation>
- <https://en.wikipedia.org/wiki/State_symbol>
- <https://en.wikipedia.org/wiki/Sucrose>
- <https://en.wikipedia.org/wiki/Sulfuric_acid>
- <https://en.wikipedia.org/wiki/Supersaturation>
- <https://en.wikipedia.org/wiki/Titration>
- <https://en.wikipedia.org/wiki/Transition_metal#Coloured_compounds>
- <https://en.wikipedia.org/wiki/Universal_indicator>
- <https://en.wikipedia.org/wiki/Vinegar>
- <https://en.wikipedia.org/wiki/Water>
- <https://en.wikipedia.org/wiki/Zinc>
- <https://en.wikipedia.org/wiki/Zinc_chloride>
- <https://en.wikipedia.org/wiki/Zinc_hydroxide>
- <https://en.wikipedia.org/wiki/Zinc_sulfate>

### Other

- <https://science.cleapss.org.uk/Resource/SSS081-Group-II-metals.pdf>
- <https://teachchemistry.org/classroom-resources/kitchen-reaction>
