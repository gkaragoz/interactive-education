/**
 * Public surface of the chemistry engine (pure TypeScript: no three.js, no DOM). Import from 'chemlab' only through
 * this file. Architecture: README.md in this folder.
 */
export { LabSim, FIXED_DT, type SimParam } from './lab';
export type { BenchSetup, JournalEntry, JournalKind, LabView, Op, OpResult, SimEvent, SimMeasurement, Ledger } from './labTypes';
export { SUBSTANCES, getSubstance, requireSubstance, solubilityAt, type Substance, type Hazard, type Phase } from './substances';
export { IONS, type Ion, type Rgb } from './ions';
export { INDICATORS, indicatorColor, indicatorStrength, type Indicator } from './indicators';
export { REAGENTS, getReagent, DROP_ML, type Reagent, type ReagentCategory } from './reagents';
export { ALL_RULES } from './stepper';
export type { ReactionRule, ObsTag, RuleObs } from './reactions';
export { formatEquation, balanceError, speciesText, sideMass } from './equation';
export { phOfMix } from './ph';
export { titrationCurve, equivalenceMl, type TitrationOptions, type TitrationPoint } from './titration';
export { liquidRgb, colourNameTr, visualOf, type VesselVisual } from './colors';
export { VESSEL_SPECS, HEAT_SOURCES, type Vessel, type VesselKind, type VesselSpec, type HeatSource, type Closure } from './vessel';
export { checkCombination, type HazardBlock } from './hazards';
export { parseFormula, molarMassOf, ATOMIC_MASS } from './formula';
export { EXPERIMENTS, getExperiment, type ExperimentDef, type ExperimentStep, type ParticleScript } from './experiments';
export type { Mix } from './species';
