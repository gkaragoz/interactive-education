/**
 * Vessel model: a container holding a mixture, plus the bench state around it (temperature, heater, stopper, electrodes).
 * Dimensions follow the dossier table (docs/research/kimya-lab.md section 1); the glass masses and heat capacities are
 * our round teaching values (borosilicate glass about 0.83 J/(g K): https://en.wikipedia.org/wiki/Borosilicate_glass ,
 * porcelain about 0.8). Heater powers are the effective power reaching the vessel, our estimates; flame temperature
 * facts: https://en.wikipedia.org/wiki/Bunsen_burner , https://en.wikipedia.org/wiki/Alcohol_burner ,
 * https://en.wikipedia.org/wiki/Hot_plate .
 */
import { heatCapacity, liquidVolumeMl, mixMass } from './mixture';
import { phOfMix } from './ph';
import type { Mix } from './species';

export type VesselKind = 'beaker100' | 'beaker250' | 'erlenmeyer250' | 'testtube' | 'cylinder100' | 'burette25' | 'crucible' | 'gas-tube' | 'hofmann' | 'funnel';
export type HeatSource = 'bunsen-blue' | 'bunsen-yellow' | 'alcohol' | 'hotplate';
export type Closure = 'none' | 'balloon' | 'stopper';

export interface VesselSpec {
  kind: VesselKind;
  nameTr: string;
  capacityMl: number;
  glassG: number;
  /** Specific heat of the vessel material, J/(g K). */
  glassCp: number;
  /** Smallest division a learner can read, mL. */
  resolutionMl: number;
  heatable: boolean;
  electrodes: boolean;
  /** Holds gas without losing it (collection tube, voltameter limbs). */
  gasTight: boolean;
}

export const VESSEL_SPECS: Readonly<Record<VesselKind, VesselSpec>> = {
  beaker100: { kind: 'beaker100', nameTr: 'Beher 100 mL', capacityMl: 100, glassG: 50, glassCp: 0.83, resolutionMl: 10, heatable: true, electrodes: false, gasTight: false },
  beaker250: { kind: 'beaker250', nameTr: 'Beher 250 mL', capacityMl: 250, glassG: 90, glassCp: 0.83, resolutionMl: 25, heatable: true, electrodes: true, gasTight: false },
  erlenmeyer250: { kind: 'erlenmeyer250', nameTr: 'Erlenmeyer 250 mL', capacityMl: 250, glassG: 95, glassCp: 0.83, resolutionMl: 25, heatable: true, electrodes: false, gasTight: false },
  testtube: { kind: 'testtube', nameTr: 'Deney tüpü', capacityMl: 25, glassG: 10, glassCp: 0.83, resolutionMl: 5, heatable: true, electrodes: false, gasTight: false },
  cylinder100: { kind: 'cylinder100', nameTr: 'Dereceli silindir 100 mL', capacityMl: 100, glassG: 100, glassCp: 0.83, resolutionMl: 1, heatable: false, electrodes: false, gasTight: false },
  burette25: { kind: 'burette25', nameTr: 'Büret 25 mL', capacityMl: 25, glassG: 80, glassCp: 0.83, resolutionMl: 0.1, heatable: false, electrodes: false, gasTight: false },
  crucible: { kind: 'crucible', nameTr: 'Krozne (kapaklı)', capacityMl: 25, glassG: 30, glassCp: 0.8, resolutionMl: 5, heatable: true, electrodes: false, gasTight: false },
  'gas-tube': { kind: 'gas-tube', nameTr: 'Gaz toplama tüpü', capacityMl: 50, glassG: 20, glassCp: 0.83, resolutionMl: 1, heatable: false, electrodes: false, gasTight: true },
  hofmann: { kind: 'hofmann', nameTr: 'Hofmann voltametresi', capacityMl: 200, glassG: 300, glassCp: 0.83, resolutionMl: 1, heatable: false, electrodes: true, gasTight: true },
  funnel: { kind: 'funnel', nameTr: 'Süzgeç kâğıtlı huni', capacityMl: 100, glassG: 40, glassCp: 0.83, resolutionMl: 10, heatable: false, electrodes: false, gasTight: false },
};

export interface HeatSpec { nameTr: string; watts: number; maxC: number; flame: boolean }
export const HEAT_SOURCES: Readonly<Record<HeatSource, HeatSpec>> = {
  'bunsen-blue': { nameTr: 'Bunsen beki (mavi alev)', watts: 400, maxC: 900, flame: true },
  'bunsen-yellow': { nameTr: 'Bunsen beki (sarı güvenlik alevi)', watts: 150, maxC: 500, flame: true },
  alcohol: { nameTr: 'Ispirto ocağı', watts: 120, maxC: 400, flame: true },
  hotplate: { nameTr: 'Isıtıcı tabla', watts: 150, maxC: 250, flame: false },
};

export interface Vessel {
  id: string;
  kind: VesselKind;
  labelTr: string;
  mix: Mix;
  /** mL of indicator stock per indicator id (no mass; see README). */
  indicators: Record<string, number>;
  /** Catalysts that are not chemically tracked, grams (e.g. yeast). */
  catalysts: Record<string, number>;
  tempC: number;
  closure: Closure;
  lidOpen: boolean;
  heat: HeatSource | null;
  iceBath: boolean;
  stirring: boolean;
  /** 0..1, how much sediment is whirled up; decays. */
  agitation: number;
  electrodes: { volts: number } | null;
  /** Gas produced here is led into this vessel. */
  gasTo: string | null;
  /** Seconds of spark left (flame test). */
  ignition: number;
  /** Cumulative extent (mol) per reaction rule id. */
  extent: Record<string, number>;
  seen: string[];
  /** Temperature at the last temperature observation. */
  tNote: number;
  /** Simulated time of the last temperature observation. */
  tNoteAt: number;
  /** Recent gas evolution in mol/s (smoothed), for bubbles and foam. */
  gasRate: number;
  /** Light flash intensity 0..1 for the renderer, decays. */
  flash: number;
  /** Cumulative charge passed, coulombs. */
  charge: number;
  /** Foam volume in mL (gas held by soap film), decays. */
  foam: number;
  /** Liquid colour at the last colour observation. */
  lastRgb: [number, number, number];
  /** Simulated time of the next colour check (colour needs a pH solve, so it runs a few times per second). */
  colourAt: number;
}

export function newVessel(id: string, kind: VesselKind, labelTr: string | undefined, ambientC: number): Vessel {
  const spec = VESSEL_SPECS[kind];
  return {
    id, kind, labelTr: labelTr ?? spec.nameTr, mix: {}, indicators: {}, catalysts: {}, tempC: ambientC,
    closure: spec.gasTight ? 'stopper' : 'none', lidOpen: kind !== 'crucible', heat: null, iceBath: false, stirring: false,
    agitation: 0, electrodes: null, gasTo: null, ignition: 0, extent: {}, seen: [], tNote: ambientC, tNoteAt: -999, gasRate: 0, flash: 0, charge: 0, foam: 0, lastRgb: [235, 245, 255], colourAt: 0,
  };
}

export const cloneVessel = (v: Vessel): Vessel => JSON.parse(JSON.stringify(v)) as Vessel;

export const volumeMl = (v: Vessel): number => liquidVolumeMl(v.mix);
export const catalystMass = (v: Vessel): number => Object.values(v.catalysts).reduce((a, b) => a + b, 0);

/** Mass of contents only, grams. */
export const contentMass = (v: Vessel): number => mixMass(v.mix) + catalystMass(v);

/** Mass of vessel plus contents, grams (what the balance shows). */
export const totalMass = (v: Vessel): number => VESSEL_SPECS[v.kind].glassG + contentMass(v);

export const vesselHeatCapacity = (v: Vessel): number => {
  const s = VESSEL_SPECS[v.kind];
  return heatCapacity(v.mix, catalystMass(v), s.glassG * s.glassCp);
};

export const vesselPh = (v: Vessel): number | null => phOfMix(v.mix, volumeMl(v));

/** True when air (oxygen, and an exit for gas) is reachable: open vessel, lid off, or a flame test in progress. */
export const hasAirAccess = (v: Vessel): boolean => v.ignition > 0 || (v.closure === 'none' && v.lidOpen && !VESSEL_SPECS[v.kind].gasTight);

export const waterGrams = (v: Vessel): number => (v.mix['water'] ?? 0) * 18.015;
