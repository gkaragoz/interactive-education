# chemlab: the chemistry engine of the virtual lab

Pure TypeScript (no three.js, no DOM). It simulates a bench of vessels with a rule-based, deterministic chemistry model and exposes the engine side of the `SimScene` contract (`docs/SIMS.md`). The render layer (scene/modules/ui) reads state from it; nothing in here knows about pixels.

Import only through `src/chemlab/index.ts`. The only dependency outside this folder is `mulberry32`/`hashString` from `src/core` (size of a drop, state hash). Sources for every number are in the header comment of the file that uses it and in `docs/research/kimya-lab-sources.md`.

## Model in one page

**Mixture.** A vessel holds `mix: Record<key, mol>`. Keys: `Na+` / `acetic-acid` / `water` (dissolved, "aq"), `s:nahco3` and `s:mg:p` (solid, `:p` = powder), `g:co2` (gas in the vessel). Mass, charge and atoms are computed from formulas, so a rule that does not balance cannot pass the tests. Volume = water + dissolved miscible liquids (salts add none). Indicators (mL of stock) and catalysts (g) ride alongside and carry no chemistry.

**Step order** (`stepper.ts`, per vessel, fixed order, no wall clock): heating/cooling and boiling, electrolysis, dissolution/precipitation (`solubility.ts`), reactions (`reactions.ts`), dissolution again if a rule fired, gas lines/escape/stopper pressure/foam (`gas.ts`), agitation decay, notes for the Defter (temperature, colour). Empty vessels at room temperature are skipped.

**Reactions** are declarative `ReactionRule` data: reactants, products, `dH`, rate constant `k`, optional catalysts, surface, concentration order, conditions (ignition, minimum temperature, dry). Each step advances `extent = limiting x (1 - exp(-k_eff dt))` with `k_eff` doubling per +10 K, powder = 12x surface and a power-law in concentration (rate-law-lite). Heat: `dT = -dH x extent / C`. Rules are generated from tables where possible (`rulesAcidBase.ts`: acids x bases by pKa; `rulesRedox.ts`: metals x acid, metal x salt by activity series, combustion; `rulesMisc.ts`: catalysed and thermal decomposition). Mixtures that no rule matches simply stay as they are: the engine never invents a reaction. `LabSim.inspect()` says so in Turkish ("Gözlenebilir bir değişim olmadı") and reports homogeneous/heterogeneous.

**Solubility** is one rule for dissolving, precipitation and crystallisation: dissolved formula units are compared with `solubility(T) x volume`. Excess leaves as a solid (sparingly soluble compounds at once, others after 12 % supersaturation unless seeded); a present solid dissolves at a rate proportional to the solid, the distance from saturation, surface, stirring and temperature. The classic precipitates (CaCO3, AgCl, BaSO4, Cu(OH)2, ...) fall out of the table; there is no pair list.

**pH** (`ph.ts`) solves the charge balance by bisection over protic families (acetic, carbonic, ammonium, citric, soap, hypochlorite) so strong/weak acids, buffers and ampholytes (NaHCO3 pH 8.3) come out right. `titration.ts` builds titration curves with the same code.

**Electrolysis** (`electrolysis.ts`): Faraday's law with a decomposition voltage of 1.8 V and a conductivity-based resistance. H2 : O2 is 2 : 1 by construction; Ag+ and Cu2+ deposit before water is reduced; chloride is blocked.

**Safety** (`hazards.ts`): bleach + acid/ammonia/alcohol, peroxide + vinegar, metal powder + oxidiser, heating a closed/graduated vessel or a flammable liquid on a flame, electrolysing chloride. The op is refused with a Turkish lesson card, no state change, no quantities. A sealed gas-producing flask pops its stopper at 2 atm (event + Defter line).

## Files

| File | Role |
|---|---|
| `formula.ts`, `ions.ts`, `species.ts`, `equation.ts` | formulas, atomic masses, ion table, species keys, equation text and balance checks |
| `substances.ts` + `substancesData.ts` | about 60 substances (molar mass computed from the formula), solubility curves, enthalpies, hazards, `virtualOnly` |
| `indicators.ts`, `families.ts`, `ph.ts`, `titration.ts` | indicators with pH -> colour, protic families, pH solver, titration curves |
| `mixture.ts`, `vessel.ts`, `reagents.ts` | mixture arithmetic, vessel kinds and state, reagent shelf (bottles, jars) |
| `solubility.ts`, `reactions.ts`, `rules*.ts`, `electrolysis.ts`, `gas.ts`, `hazards.ts` | the physics and chemistry |
| `core.ts`, `stepper.ts`, `ops.ts`, `opsMeasure.ts`, `lab.ts`, `labTypes.ts` | state, step, learner operations, `LabSim` |
| `colors.ts` | Beer-Lambert liquid colour and the per-vessel `VesselVisual` for the renderer |
| `experiments/` | the ten experiments as data (`eNN.ts`), `types.ts`, `index.ts` |

## Using it

```ts
import { LabSim, getExperiment } from 'chemlab';   // path via the shell's alias or relative import of src/chemlab

const exp = getExperiment('sirke-kabartma')!;
const sim = new LabSim({ seed: 1, bench: exp.bench });
sim.pour('vinegar', 'flask', 50);          // bottle id or vessel id -> vessel, mL
sim.place('flask');                         // on the balance
sim.add('nahco3', 'flask', 2);              // solid, grams (4th argument true = powder)
sim.step(1 / 60);                           // fixed step; sim.advance(seconds, dt) loops it
sim.measurements();                         // SimMeasurement[] (T, V, pH, gas mL, balance, ...)
sim.journal;                                // Defter lines { t, kind, vessel, tag, textTr }
sim.visuals('flask');                       // fill level, liquid rgb, turbidity, sediment, bubbles, foam, balloon, flash
sim.drainEvents();                          // flash / spill / pop / blocked / boil / pour (renderer hooks)
const done = exp.steps.map((s) => s.done(sim.view()));   // "step done" detection
const snap = sim.snapshot(); sim.restore(snap);          // scrub back, Defter replay
```

Operations: `pour`, `dispense` (burette, 0.05 mL), `add`, `drop` (0.05 mL, seeded +-2 %), `heat(vessel, source|null)`, `cool` (ice bath), `stir`, `place`/`tare`/`weigh`, `readVolume`, `dip` (pH paper / litmus), `filter(funnel, receiver)`, `close('none'|'balloon'|'stopper')`, `lid`, `gasline`, `ignite`, `testGas`, `connectElectrodes`. `apply(op)` and `runScript(ops)` take the serialisable `Op` union (used by the experiment definitions and the tests). Every op returns `{ ok, blocked?, messageTr?, value? }`.

Experiments (`ExperimentDef`): bench setup, shelf, balanced equations as data (`formatEquation` writes the text with state symbols), steps with `done(view)` predicates, expectations, measurables with the dossier's arithmetic, a reference `solution` op list (replayed by the tests), `variants`, and **particle scripts** (typed stages with species counts per stage, bonds broken/formed, proton and electron transfers; atoms and charge are conserved in every stage, tested). Experiment 4 is the safe CaCO3 precipitation (ADR 0005); experiment 7 is `virtualOnly` and the engine caps its flash value at 0.8 (the renderer must still rate-limit and offer the filter).

## Simplifications (state them in `ModuleInfo.simplifications`)

- Ideal homogeneous mixing; no diffusion or pouring dynamics; common-ion effect, activity coefficients and metal-ion hydrolysis ignored; Kw fixed at 25 degC.
- Solubility is g per 100 mL of water, 1 mL = 1 g; dissolving changes no volume; hydrates are treated as anhydrous salts.
- Reactions run to completion limited by the scarcest reactant (no equilibria except solubility and acid-base families); rates are first-order-lite with factors for T, surface and concentration.
- Heat: lumped capacity, Newton cooling (15 min in air, 90 s in an ice bath), boiling pinned at 100 degC; the flame heats at a fixed effective power.
- Gas is ideal, escapes from open vessels at 2 per second, collected over a gas line without dissolving; balloon buoyancy is ignored on the balance.
- Dish soap is modelled as sodium laurate; lemon juice as a citric acid solution; the dry crucible holds 25 mL of air (21 % O2) and a lifted lid gives unlimited air.
- Time is real time: electrolysis and the dissolution of lumps are slow, so the app should offer a time-lapse factor (the engine does not scale time).

## Tests (`tests/chemlab`)

Data integrity (every substance has a source URL and kazanım, ions balance, solubility tables ordered), every reaction rule balanced in atoms and charge, the ten experiments replayed from their op scripts (expectations, measurables, "step done" predicates monotone, mass balance, determinism), particle-script conservation, safety blocks, pH/titration values, thermal and dissolution behaviour, Faraday's law, seeded random op sequences (mass conservation after every op, no NaN or negative amounts), snapshot/restore, reset, and a performance budget (6 loaded vessels <= 0.5 ms per step).

## Extending

New substance: add a row to `substancesData.ts` with a Wikipedia page and kazanım (the data tests check it). New rule: add to a `rules*.ts` table or generator; the balance test covers it automatically. New experiment: add `eNN.ts`, register it in `experiments/index.ts`; the replay and particle tests pick it up.
