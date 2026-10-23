/**
 * Species keys. A mixture maps a key to moles:
 *   'Na+', 'acetic-acid', 'water'  dissolved ion or molecule (aq)
 *   's:nahco3', 's:mg:p'           solid (':p' = powder, large surface)
 *   'g:co2'                        gas held in the vessel
 * Sources for the constants: https://en.wikipedia.org/wiki/Molar_mass , https://en.wikipedia.org/wiki/Molar_volume
 */
import { IONS } from './ions';
import { getSubstance } from './substances';
import { parseFormula, type Atoms } from './formula';

export type Mix = Record<string, number>;
export type KeyPhase = 'aq' | 's' | 'g';

export interface SpeciesInfo {
  key: string;
  id: string;
  phase: KeyPhase;
  formula: string;
  charge: number;
  molarMass: number;
  powder: boolean;
  /** Dissolved liquid that adds its own volume (water, acetic acid, ethanol, peroxide, sulfuric acid). */
  liquidVolume: boolean;
  /** g/cm3 when liquidVolume. */
  density: number;
  heatCap: number;
}

/** Molar volume of an ideal gas at 25 degC and 1 atm, L/mol (22.414 L at 0 degC scaled by 298.15/273.15). */
export const MOLAR_VOLUME_L = 24.465;
export const FARADAY = 96485.33;
export const WATER_MOLAR_MASS = 18.015;

const cache = new Map<string, SpeciesInfo>();

export const solidKey = (id: string, powder = false): string => (powder ? `s:${id}:p` : `s:${id}`);
export const gasKey = (id: string): string => `g:${id}`;

export function speciesOf(key: string): SpeciesInfo {
  const hit = cache.get(key);
  if (hit) return hit;
  let phase: KeyPhase = 'aq';
  let id = key;
  let powder = false;
  if (key.startsWith('s:')) {
    phase = 's';
    id = key.slice(2);
    if (id.endsWith(':p')) {
      powder = true;
      id = id.slice(0, -2);
    }
  } else if (key.startsWith('g:')) {
    phase = 'g';
    id = key.slice(2);
  }
  const ion = IONS[id];
  const sub = getSubstance(id);
  let info: SpeciesInfo;
  if (ion) {
    info = { key, id, phase, formula: ion.formula, charge: ion.charge, molarMass: ion.molarMass, powder, liquidVolume: false, density: 1, heatCap: 4 };
  } else if (sub) {
    const lv = phase === 'aq' && sub.miscible === true && sub.density !== null;
    info = { key, id, phase, formula: sub.formula, charge: 0, molarMass: sub.molarMass, powder, liquidVolume: lv, density: sub.density ?? 1, heatCap: sub.heatCap };
  } else {
    throw new Error(`Unknown species key ${key}`);
  }
  cache.set(key, info);
  return info;
}

export function isKnownKey(key: string): boolean {
  try {
    speciesOf(key);
    return true;
  } catch {
    return false;
  }
}

/** Atom counts of one mole of the species (charge is separate). */
export function atomsOfKey(key: string): Atoms {
  return parseFormula(speciesOf(key).formula);
}
